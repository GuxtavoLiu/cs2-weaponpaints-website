// 3D sticker placement editor.
//
// Renders the current weapon (a Valve geometry OBJ, served from /models/<defindex>.obj)
// in three.js and shows ALL stickers applied to it as decals. You can select a
// sticker (click it), move it (right-drag), rotate it (mouse wheel) and scale it.
// Placement is read back as the game's offset_x/offset_y (per-weapon canvas),
// rotation (degrees) and scale, and written into index.js' sticker state via
// window.stickerEditorAPI.
//
// Models are NOT shipped in the repo (Valve IP); they are fetched into
// /public/models by scripts/fetch-weapon-models. If a model is missing the editor
// degrades to a neutral placeholder so positioning still works.

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import { DecalGeometry } from 'three/addons/geometries/DecalGeometry.js'

// ---------------------------------------------------------------------------
// Coordinate mapping (CALIBRATABLE - the single place to tune game accuracy).
//
// The game stores sticker placement as offset_x/offset_y on a PER-WEAPON canvas
// (offset = (canvas - defaultX) * pixelScale), rotation in degrees (screen->game
// inverted), scale (1.0 = natural). We don't have Valve's per-weapon table, so we
// use the weapon-UV (0..1) the raycast gives us as the canvas coordinate with a
// per-defindex entry (default = centred). Fill WEAPON_CALIB from inspect-link
// calibration for in-game accuracy; the editor is self-consistent meanwhile.
// ---------------------------------------------------------------------------
const WEAPON_CALIB = {
    default: { defaultX: 0.5, defaultY: 0.5, pixelScale: 1 },
}
const weaponCalib = (defindex) => WEAPON_CALIB[defindex] || WEAPON_CALIB.default
const uvToGame = (u, v, defindex) => {
    const c = weaponCalib(defindex)
    return { x: +(((u - c.defaultX) * c.pixelScale)).toFixed(6), y: +(((v - c.defaultY) * c.pixelScale)).toFixed(6) }
}
const gameToUv = (x, y, defindex) => {
    const c = weaponCalib(defindex)
    return { u: x / c.pixelScale + c.defaultX, v: y / c.pixelScale + c.defaultY }
}
const screenRotToGame = (deg) => ((360 - (Math.round(Number(deg) || 0) % 360)) % 360)
const gameRotToScreen = (deg) => ((360 - (Math.round(Number(deg) || 0) % 360)) % 360)

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
let renderer, scene, camera, controls
let weaponObject = null
let baseSize = 1, decalDepth = 1
let loadedDefindex = null
let openSlot = 0

// One entry per applied sticker: { slot, id, tex, mesh, pos, normal, uv, object, rot, scale }
let items = []
let selIndex = -1
let outline = null

const objLoader = new OBJLoader()
const texLoader = new THREE.TextureLoader()
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const dummy = new THREE.Object3D()

const $ = (id) => document.getElementById(id)
const t = (k, fallback) => (typeof langObject !== 'undefined' && langObject[k]) || fallback
const API = () => window.stickerEditorAPI
const sel = () => (selIndex >= 0 && selIndex < items.length ? items[selIndex] : null)
function subdirPath() { return (typeof subdir !== 'undefined' && subdir) ? subdir : '/' }

// ---------------------------------------------------------------------------
// Scene lifecycle
// ---------------------------------------------------------------------------
function initScene() {
    if (renderer) return
    const mount = $('sticker3dCanvas')
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x15171c)
    camera = new THREE.PerspectiveCamera(45, 1, 0.01, 5000)
    camera.position.set(0, 0, 40)
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    mount.appendChild(renderer.domElement)

    scene.add(new THREE.AmbientLight(0xffffff, 0.85))
    const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(1, 1, 1); scene.add(key)
    const fill = new THREE.DirectionalLight(0xffffff, 0.5); fill.position.set(-1, -0.5, -1); scene.add(fill)

    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.1
    controls.enablePan = false
    // Left drag orbits. Right drag moves the selected sticker; the wheel rotates
    // it while one is selected, otherwise it zooms (toggled in setSelected).
    controls.mouseButtons = { LEFT: THREE.MOUSE.ROTATE, MIDDLE: null, RIGHT: null }

    const dom = renderer.domElement
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    dom.addEventListener('wheel', onWheel, { passive: false })
    dom.addEventListener('contextmenu', (e) => e.preventDefault())

    // Capture-phase pre-empt on the container: OrbitControls' own pointerdown
    // (on the canvas) captures the pointer and adds listeners before checking the
    // button. By disabling controls here, in the capture phase on the parent, a
    // right-button press on a selected sticker makes OrbitControls bail (it returns
    // when enabled===false) so the right-drag moves the sticker, not the camera.
    mount.addEventListener('pointerdown', (e) => {
        if (e.button === 2 && selIndex >= 0) controls.enabled = false
    }, true)

    const loop = () => { requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera) }
    loop()
}

function resize() {
    const mount = $('sticker3dCanvas')
    if (!renderer || !mount) return
    const w = mount.clientWidth || 600, h = mount.clientHeight || 400
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    camera.updateProjectionMatrix()
}

// ---------------------------------------------------------------------------
// Model loading
// ---------------------------------------------------------------------------
function clearAll() {
    clearOutline()
    items.forEach((it) => { if (it.mesh) { scene.remove(it.mesh); it.mesh.geometry.dispose(); it.mesh.material.dispose() } })
    items = []
    selIndex = -1
    if (weaponObject) { scene.remove(weaponObject); weaponObject = null }
}
function clearOutline() {
    if (outline) { scene.remove(outline); outline.geometry.dispose(); outline.material.dispose(); outline = null }
}

function frameObject(obj) {
    const box = new THREE.Box3().setFromObject(obj)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    obj.position.sub(center)
    const maxDim = Math.max(size.x, size.y, size.z) || 1
    baseSize = maxDim * 0.06
    decalDepth = maxDim * 0.25
    const dist = maxDim * 1.6
    camera.position.set(dist * 0.4, dist * 0.25, dist)
    camera.near = maxDim / 100
    camera.far = maxDim * 100
    camera.updateProjectionMatrix()
    controls.target.set(0, 0, 0)
    controls.update()
}

function loadWeapon(defindex) {
    return new Promise((resolve) => {
        const neutral = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 0.35, roughness: 0.6, side: THREE.DoubleSide })
        const url = `${subdirPath()}models/${defindex}.obj`
        objLoader.load(
            url,
            (obj) => {
                obj.traverse((c) => { if (c.isMesh) c.material = neutral })
                weaponObject = obj; scene.add(obj); frameObject(obj); loadedDefindex = defindex; resolve(true)
            },
            undefined,
            () => {
                const placeholder = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 3), neutral)
                weaponObject = placeholder; scene.add(placeholder); frameObject(placeholder); loadedDefindex = defindex
                setStatus(t('positionNoModel', 'No 3D model for this weapon yet - using a placeholder. Placement still saves.'))
                resolve(false)
            }
        )
    })
}

// Find an approximate 3D surface point (+ normal) whose weapon-UV is closest to
// (tu,tv). Lets us show stickers from their stored offset. O(faces) once per load.
function findSurfacePointForUV(tu, tv) {
    if (!weaponObject) return null
    let best = Infinity, bMesh = null, bi = -1
    weaponObject.traverse((m) => {
        if (!m.isMesh) return
        const uv = m.geometry.attributes.uv, pos = m.geometry.attributes.position
        if (!uv || !pos) return
        for (let i = 0; i < pos.count; i += 3) {
            const u0 = (uv.getX(i) + uv.getX(i + 1) + uv.getX(i + 2)) / 3
            const v0 = (uv.getY(i) + uv.getY(i + 1) + uv.getY(i + 2)) / 3
            const d = (u0 - tu) * (u0 - tu) + (v0 - tv) * (v0 - tv)
            if (d < best) { best = d; bMesh = m; bi = i }
        }
    })
    if (!bMesh) return null
    const pos = bMesh.geometry.attributes.position
    const a = new THREE.Vector3().fromBufferAttribute(pos, bi)
    const b = new THREE.Vector3().fromBufferAttribute(pos, bi + 1)
    const c = new THREE.Vector3().fromBufferAttribute(pos, bi + 2)
    const point = a.clone().add(b).add(c).multiplyScalar(1 / 3).applyMatrix4(bMesh.matrixWorld)
    const normal = new THREE.Vector3().crossVectors(b.clone().sub(a), c.clone().sub(a)).transformDirection(bMesh.matrixWorld).normalize()
    return { point, normal, object: bMesh }
}

// ---------------------------------------------------------------------------
// Decals + selection outline
// ---------------------------------------------------------------------------
function orientationFor(it) {
    dummy.position.copy(it.pos)
    dummy.lookAt(it.pos.clone().add(it.normal))
    dummy.rotateZ(THREE.MathUtils.degToRad(it.rot))
    dummy.updateMatrix()
    return dummy
}
function buildItemDecal(it) {
    if (it.mesh) { scene.remove(it.mesh); it.mesh.geometry.dispose(); it.mesh.material.dispose(); it.mesh = null }
    if (!it.pos || !it.object || !it.tex) return
    const orientation = new THREE.Euler().copy(orientationFor(it).rotation)
    const s = baseSize * it.scale
    const geo = new DecalGeometry(it.object, it.pos, orientation, new THREE.Vector3(s, s, decalDepth))
    const mat = new THREE.MeshBasicMaterial({ map: it.tex, transparent: true, depthTest: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 })
    it.mesh = new THREE.Mesh(geo, mat)
    scene.add(it.mesh)
}
function rebuildOutline() {
    clearOutline()
    const it = sel()
    if (!it || !it.pos) return
    const d = orientationFor(it)
    const x = new THREE.Vector3().setFromMatrixColumn(d.matrix, 0).normalize()
    const y = new THREE.Vector3().setFromMatrixColumn(d.matrix, 1).normalize()
    const half = (baseSize * it.scale) / 2
    const c = it.pos.clone().addScaledVector(it.normal, half * 0.2)
    const pts = [
        c.clone().addScaledVector(x, half).addScaledVector(y, half),
        c.clone().addScaledVector(x, -half).addScaledVector(y, half),
        c.clone().addScaledVector(x, -half).addScaledVector(y, -half),
        c.clone().addScaledVector(x, half).addScaledVector(y, -half),
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: 0x4ea1ff, depthTest: false, transparent: true })
    outline = new THREE.LineLoop(geo, mat)
    outline.renderOrder = 999
    scene.add(outline)
}

function setSelected(i) {
    selIndex = i
    const it = sel()
    if (controls) controls.enableZoom = !it // wheel zooms when nothing is selected
    rebuildOutline()
    // sync sliders + label to the selected sticker
    if (it) {
        $('sticker3dSlotLabel').innerText = `#${it.slot + 1}`
        const rot = $('sticker3dRot'); if (rot) rot.value = it.rot
        const rv = $('sticker3dRotVal'); if (rv) rv.innerText = `${it.rot}°`
        const sc = $('sticker3dScale'); if (sc) sc.value = it.scale
        const sv = $('sticker3dScaleVal'); if (sv) sv.innerText = it.scale.toFixed(2)
    } else {
        $('sticker3dSlotLabel').innerText = ''
    }
    updateStatus()
}

// ---------------------------------------------------------------------------
// Picking / interaction
// ---------------------------------------------------------------------------
let downPos = null
let dragging = false
function eventToPointer(e) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}
function raycastModel() {
    if (!weaponObject) return null
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObject(weaponObject, true)
    if (!hits.length) return null
    const h = hits[0]
    return {
        point: h.point.clone(),
        object: h.object,
        normal: (h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 0, 1)).normalize(),
        uv: h.uv ? { u: h.uv.x, v: h.uv.y } : null,
    }
}
// Index of the sticker nearest to a 3D point, within its decal radius.
function itemAtPoint(point) {
    let best = Infinity, bi = -1
    for (let i = 0; i < items.length; i++) {
        const it = items[i]
        if (!it.pos) continue
        const r = baseSize * it.scale * 0.7
        const d = it.pos.distanceTo(point)
        if (d < r && d < best) { best = d; bi = i }
    }
    return bi
}
function moveSelectedTo(hit) {
    const it = sel()
    if (!it || !hit) return
    it.pos = hit.point; it.object = hit.object; it.normal = hit.normal
    if (hit.uv) it.uv = hit.uv
    it.dirty = true
    buildItemDecal(it); rebuildOutline(); updateStatus()
}
function onPointerDown(e) {
    if (e.button === 2) {
        // Right button drags the selected sticker.
        if (selIndex < 0) return
        e.preventDefault()
        dragging = true
        controls.enabled = false
        try { renderer.domElement.setPointerCapture(e.pointerId) } catch (_) {}
        eventToPointer(e); moveSelectedTo(raycastModel())
        return
    }
    if (e.button === 0) downPos = { x: e.clientX, y: e.clientY }
}
function onPointerMove(e) {
    if (dragging && (e.buttons & 2)) { eventToPointer(e); moveSelectedTo(raycastModel()) }
}
function onPointerUp(e) {
    if (dragging) {
        dragging = false
        try { renderer.domElement.releasePointerCapture(e.pointerId) } catch (_) {}
        controls.enabled = true
        return
    }
    if (downPos) {
        const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
        if (moved < 5) {
            // Left tap: select the sticker under the cursor, or deselect.
            eventToPointer(e)
            const hit = raycastModel()
            setSelected(hit ? itemAtPoint(hit.point) : -1)
        }
        downPos = null
    }
    // Always restore camera control (e.g. after the capture-phase pre-empt above).
    controls.enabled = true
}
// Wheel rotates the selected sticker; with nothing selected OrbitControls zooms.
function onWheel(e) {
    const it = sel()
    if (!it) return
    e.preventDefault()
    it.dirty = true
    it.rot = normRot(it.rot + (e.deltaY > 0 ? 4 : -4))
    const rot = $('sticker3dRot'); if (rot) rot.value = it.rot
    const rv = $('sticker3dRotVal'); if (rv) rv.innerText = `${it.rot}°`
    buildItemDecal(it); rebuildOutline(); updateStatus()
}

// ---------------------------------------------------------------------------
// Status / UI sync
// ---------------------------------------------------------------------------
function setStatus(msg) { const el = $('sticker3dStatus'); if (el) el.textContent = msg }
function updateStatus() {
    const it = sel()
    if (!it || !it.uv) { setStatus(t('positionClickSelect', 'Click a sticker to select it.')); return }
    const g = uvToGame(it.uv.u, it.uv.v, loadedDefindex)
    setStatus(`${t('positionSelected', 'Selected')} #${it.slot + 1}  ·  x ${g.x.toFixed(3)}  ·  y ${g.y.toFixed(3)}  ·  ${it.rot}°  ·  ${it.scale.toFixed(2)}×`)
}

// ---------------------------------------------------------------------------
// Public actions
// ---------------------------------------------------------------------------
async function openStickerEditor(s) {
    openSlot = s
    const api = API()
    if (!api) return
    const weapon = api.getCurrentWeapon()

    $('sticker3dEditor').classList.add('show')
    initScene()
    requestAnimationFrame(resize)
    clearAll()

    await loadWeapon(weapon.defindex)

    // Build an entry for every slot that holds a sticker, positioned from its
    // saved offset (reprojected onto the surface). Slots sharing the default
    // offset are nudged apart so they don't stack and stay individually clickable.
    const count = api.slotCount || 5
    let placedDefault = 0
    for (let i = 0; i < count; i++) {
        const id = api.getSlotStickerId(i)
        if (!id) continue
        const tr = api.getTransform(i)
        let uv
        if (tr.x !== 0 || tr.y !== 0) {
            uv = gameToUv(tr.x, tr.y, weapon.defindex)
        } else {
            // Unplaced: spread defaults along the weapon so they're visible.
            uv = { u: 0.30 + placedDefault * 0.10, v: 0.55 }
            placedDefault++
        }
        const sp = findSurfacePointForUV(uv.u, uv.v)
        const it = {
            slot: i, id, tex: null, mesh: null,
            pos: sp ? sp.point : null, normal: sp ? sp.normal : new THREE.Vector3(0, 0, 1),
            object: sp ? sp.object : null, uv,
            rot: gameRotToScreen(tr.rotation), scale: tr.scale > 0 ? tr.scale : 1,
        }
        const imgUrl = api.getStickerImage(id)
        if (imgUrl) {
            const proxied = `${subdirPath()}api/sticker-img?u=${encodeURIComponent(imgUrl)}`
            it.tex = texLoader.load(proxied, () => buildItemDecal(it))
            it.tex.colorSpace = THREE.SRGBColorSpace
        }
        buildItemDecal(it)
        items.push(it)
    }

    // Pre-select the slot the editor was opened from.
    const idx = items.findIndex((it) => it.slot === openSlot)
    setSelected(idx >= 0 ? idx : (items.length ? 0 : -1))
}

function closeStickerEditor() {
    $('sticker3dEditor').classList.remove('show')
    clearAll()
}

function resetStickerEditor() {
    const it = sel()
    if (!it) return
    it.dirty = true
    it.rot = 0; it.scale = 1
    const sp = findSurfacePointForUV(0.5, 0.5)
    if (sp) { it.pos = sp.point; it.normal = sp.normal; it.object = sp.object; it.uv = { u: 0.5, v: 0.5 } }
    buildItemDecal(it)
    setSelected(selIndex)
}

function saveStickerEditor() {
    const api = API()
    if (api) {
        // Only persist stickers the user actually moved/rotated/scaled, so opening
        // the editor and saving never disturbs the placement of untouched stickers.
        items.forEach((it) => {
            if (!it.uv || !it.dirty) return
            const g = uvToGame(it.uv.u, it.uv.v, loadedDefindex)
            api.setTransform(it.slot, { x: g.x, y: g.y, scale: +it.scale.toFixed(4), rotation: screenRotToGame(it.rot) })
        })
    }
    closeStickerEditor()
}

function normRot(r) { r = Math.round(Number(r) || 0); r %= 360; if (r < 0) r += 360; return r }

function wireControls() {
    const rot = $('sticker3dRot'), scl = $('sticker3dScale')
    if (rot && !rot._wired) {
        rot._wired = true
        rot.addEventListener('input', () => { const it = sel(); if (!it) return; it.dirty = true; it.rot = normRot(rot.value); $('sticker3dRotVal').innerText = `${it.rot}°`; buildItemDecal(it); rebuildOutline(); updateStatus() })
    }
    if (scl && !scl._wired) {
        scl._wired = true
        scl.addEventListener('input', () => { const it = sel(); if (!it) return; it.dirty = true; it.scale = parseFloat(scl.value) || 1; $('sticker3dScaleVal').innerText = it.scale.toFixed(2); buildItemDecal(it); rebuildOutline(); updateStatus() })
    }
}

window.addEventListener('resize', resize)
document.addEventListener('DOMContentLoaded', wireControls)
wireControls()

window.openStickerEditor = openStickerEditor
window.closeStickerEditor = closeStickerEditor
window.resetStickerEditor = resetStickerEditor
window.saveStickerEditor = saveStickerEditor
