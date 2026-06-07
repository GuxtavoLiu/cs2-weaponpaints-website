// 3D sticker placement editor.
//
// Renders the current weapon (a Valve geometry OBJ, served from /models/<defindex>.obj)
// in three.js and lets the user place a sticker decal on the surface, then rotate
// and scale it. The placement is read back as the game's offset_x / offset_y
// (weapon UV space), rotation (degrees) and scale (multiplier) and written into
// index.js' sticker state via window.stickerEditorAPI.
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
// Research (decoding real CS2 inspect links + csinspect.com's editor) shows the
// game stores sticker placement as:
//   offset_x = (canvasX - defaultX) * pixelScale   <- per-weapon canvas, NOT UV
//   offset_y = (canvasY - defaultY) * pixelScale
//   rotation = (360 - screenAngle) % 360           <- degrees, inverted
//   scale    = multiplier, 1.0 = natural size
//   wear     = 0..1
// defaultX/defaultY/pixelScale are PER-WEAPON. We don't have Valve's table, so
// we use the weapon-UV (0..1) the raycast gives us as the canvas coordinate and
// a per-defindex calibration entry (default = centred, identity scale). Fill
// WEAPON_CALIB from inspect-link calibration to make it game-accurate; the
// editor is already correct visually and self-consistent meanwhile.
// ---------------------------------------------------------------------------
const WEAPON_CALIB = {
    // defindex: { defaultX, defaultY, pixelScale }  (canvas = weapon UV, 0..1)
    default: { defaultX: 0.5, defaultY: 0.5, pixelScale: 1 },
}
const weaponCalib = (defindex) => WEAPON_CALIB[defindex] || WEAPON_CALIB.default
const uvToGame = (u, v, defindex) => {
    const c = weaponCalib(defindex)
    return {
        x: +(((u - c.defaultX) * c.pixelScale)).toFixed(6),
        y: +(((v - c.defaultY) * c.pixelScale)).toFixed(6),
    }
}
const gameToUv = (x, y, defindex) => {
    const c = weaponCalib(defindex)
    return { u: x / c.pixelScale + c.defaultX, v: y / c.pixelScale + c.defaultY }
}
// Game rotation runs opposite to the on-screen angle.
const screenRotToGame = (deg) => ((360 - (Math.round(Number(deg) || 0) % 360)) % 360)
const gameRotToScreen = (deg) => ((360 - (Math.round(Number(deg) || 0) % 360)) % 360) // symmetric

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
let renderer, scene, camera, controls, animHandle
let weaponObject = null        // loaded OBJ group
let decalMesh = null
let stickerTex = null
let baseSize = 1               // visual decal size unit (relative to model)
let decalDepth = 1
let slot = 0
let moveMode = false
let loadedDefindex = null
const objLoader = new OBJLoader()
const texLoader = new THREE.TextureLoader()
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const dummy = new THREE.Object3D()

// Current placement
let place = { hit: null, position: null, normal: null, uv: null, object: null, rotationDeg: 0, scale: 1 }

const $ = (id) => document.getElementById(id)
const t = (k, fallback) => (typeof langObject !== 'undefined' && langObject[k]) || fallback
// Bridge exposed by index.js to read/write the sticker slot state.
const API = () => window.stickerEditorAPI

// ---------------------------------------------------------------------------
// Scene lifecycle
// ---------------------------------------------------------------------------
function initScene() {
    const mount = $('sticker3dCanvas')
    if (renderer) return
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

    const dom = renderer.domElement
    dom.addEventListener('pointerdown', onPointerDown)
    dom.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)

    const loop = () => { animHandle = requestAnimationFrame(loop); controls.update(); renderer.render(scene, camera) }
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
function clearWeapon() {
    if (weaponObject) { scene.remove(weaponObject); weaponObject = null }
    clearDecal()
}
function clearDecal() {
    if (decalMesh) { scene.remove(decalMesh); decalMesh.geometry.dispose(); decalMesh.material.dispose(); decalMesh = null }
}

function frameObject(obj) {
    const box = new THREE.Box3().setFromObject(obj)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    obj.position.sub(center) // center at origin
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
        clearWeapon()
        const neutral = new THREE.MeshStandardMaterial({ color: 0x9aa0aa, metalness: 0.35, roughness: 0.6, side: THREE.DoubleSide })
        const url = `${subdirPath()}models/${defindex}.obj`
        objLoader.load(
            url,
            (obj) => {
                obj.traverse((c) => { if (c.isMesh) { c.material = neutral } })
                weaponObject = obj
                scene.add(obj)
                frameObject(obj)
                loadedDefindex = defindex
                setStatus(t('positionHelp', 'Tap the weapon to place the sticker. Drag to rotate the view.'))
                resolve(true)
            },
            undefined,
            () => {
                // Model missing -> neutral placeholder box so positioning still works.
                const geo = new THREE.BoxGeometry(20, 6, 3)
                const placeholder = new THREE.Mesh(geo, neutral)
                weaponObject = placeholder
                scene.add(placeholder)
                frameObject(placeholder)
                loadedDefindex = defindex
                setStatus(t('positionNoModel', 'No 3D model for this weapon yet - using a placeholder. Placement still saves.'))
                resolve(false)
            }
        )
    })
}

// `subdir` is exposed by the page as a global string for asset prefixes.
function subdirPath() { return (typeof subdir !== 'undefined' && subdir) ? subdir : '/' }

// ---------------------------------------------------------------------------
// Decal building
// ---------------------------------------------------------------------------
function buildDecal() {
    clearDecal()
    if (!place.position || !place.object || !stickerTex) return
    dummy.position.copy(place.position)
    dummy.lookAt(place.position.clone().add(place.normal))
    dummy.rotateZ(THREE.MathUtils.degToRad(place.rotationDeg))
    const orientation = new THREE.Euler().copy(dummy.rotation)
    const s = baseSize * place.scale
    const size = new THREE.Vector3(s, s, decalDepth)
    const geo = new DecalGeometry(place.object, place.position, orientation, size)
    const mat = new THREE.MeshBasicMaterial({
        map: stickerTex, transparent: true, depthTest: true, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -4,
    })
    decalMesh = new THREE.Mesh(geo, mat)
    scene.add(decalMesh)
}

// ---------------------------------------------------------------------------
// Picking / interaction
// ---------------------------------------------------------------------------
let downPos = null
function eventToPointer(e) {
    const rect = renderer.domElement.getBoundingClientRect()
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}
function pickSurface() {
    if (!weaponObject) return false
    raycaster.setFromCamera(pointer, camera)
    const hits = raycaster.intersectObject(weaponObject, true)
    if (!hits.length) return false
    const h = hits[0]
    place.position = h.point.clone()
    place.object = h.object
    place.normal = (h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : new THREE.Vector3(0, 0, 1)).normalize()
    if (h.uv) place.uv = { u: h.uv.x, v: h.uv.y }
    buildDecal()
    updateStatus()
    return true
}
function onPointerDown(e) {
    downPos = { x: e.clientX, y: e.clientY }
    if (moveMode) {
        eventToPointer(e)
        if (pickSurface()) { controls.enabled = false }
    }
}
function onPointerMove(e) {
    if (moveMode && !controls.enabled && (e.buttons & 1)) {
        eventToPointer(e)
        pickSurface()
    }
}
function onPointerUp(e) {
    if (!downPos) { controls.enabled = true; return }
    const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y)
    // A near-stationary click (in camera mode) places the sticker.
    if (!moveMode && moved < 5) {
        eventToPointer(e)
        pickSurface()
    }
    downPos = null
    controls.enabled = true
}

// ---------------------------------------------------------------------------
// Status / UI sync
// ---------------------------------------------------------------------------
function setStatus(msg) { const el = $('sticker3dStatus'); if (el) el.textContent = msg }
function updateStatus() {
    if (!place.uv) { setStatus(t('positionHelp', 'Tap the weapon to place the sticker.')); return }
    const g = uvToGame(place.uv.u, place.uv.v, loadedDefindex)
    setStatus(`x ${g.x.toFixed(3)}  ·  y ${g.y.toFixed(3)}  ·  ${place.rotationDeg}°  ·  ${place.scale.toFixed(2)}×`)
}

// ---------------------------------------------------------------------------
// Public actions (wired from the EJS buttons)
// ---------------------------------------------------------------------------
async function openStickerEditor(s) {
    slot = s
    const api = API()
    if (!api) return
    const id = api.getSlotStickerId(slot)
    if (!id) return // nothing to place
    const weapon = api.getCurrentWeapon()

    $('sticker3dEditor').classList.add('show')
    $('sticker3dSlotLabel').innerText = `#${slot + 1}`
    initScene()
    requestAnimationFrame(resize)

    // Load sticker texture through our same-origin proxy (the Steam CDN sends no
    // CORS header, which WebGL requires for textures).
    const imgUrl = api.getStickerImage(id)
    if (imgUrl) {
        const proxied = `${subdirPath()}api/sticker-img?u=${encodeURIComponent(imgUrl)}`
        stickerTex = texLoader.load(proxied, () => buildDecal())
        stickerTex.colorSpace = THREE.SRGBColorSpace
    }

    // Restore existing placement (if any)
    const saved = api.getTransform(slot)
    place.rotationDeg = gameRotToScreen(saved.rotation)
    place.scale = saved.scale > 0 ? saved.scale : 1
    place.position = null; place.uv = null; place.object = null; place.normal = null
    $('sticker3dRot').value = place.rotationDeg
    $('sticker3dRotVal').innerText = `${place.rotationDeg}°`
    $('sticker3dScale').value = place.scale
    $('sticker3dScaleVal').innerText = place.scale.toFixed(2)
    setMoveMode(false)

    await loadWeapon(weapon.defindex)
    // If a saved placement exists we cannot perfectly reproject without the
    // original surface point; we keep the rotation/scale and let the user
    // re-tap the position (status shows the saved x/y target).
    if (saved.x !== 0 || saved.y !== 0) {
        const uv = gameToUv(saved.x, saved.y, weapon.defindex)
        setStatus(`${t('positionSavedAt', 'Saved at')} x ${saved.x.toFixed(3)} · y ${saved.y.toFixed(3)} - ${t('positionRetap', 'tap to re-place')}`)
        place.uv = { u: uv.u, v: uv.v }
    }
}

function closeStickerEditor() {
    $('sticker3dEditor').classList.remove('show')
    clearDecal()
    place = { hit: null, position: null, normal: null, uv: null, object: null, rotationDeg: 0, scale: 1 }
}

function resetStickerEditor() {
    clearDecal()
    place.position = null; place.uv = null; place.object = null; place.normal = null
    place.rotationDeg = 0; place.scale = 1
    $('sticker3dRot').value = 0; $('sticker3dRotVal').innerText = '0°'
    $('sticker3dScale').value = 1; $('sticker3dScaleVal').innerText = '1.00'
    setStatus(t('positionReset', 'Placement reset. Tap the weapon to place again.'))
}

function saveStickerEditor() {
    const api = API()
    if (!api) return
    if (!place.uv) {
        // Nothing placed -> treat as default position (clears offsets).
        api.setTransform(slot, { x: 0, y: 0, scale: 0, rotation: 0 })
        closeStickerEditor()
        return
    }
    const g = uvToGame(place.uv.u, place.uv.v, loadedDefindex)
    api.setTransform(slot, {
        x: g.x,
        y: g.y,
        scale: +(place.scale).toFixed(4),
        rotation: screenRotToGame(place.rotationDeg),
    })
    closeStickerEditor()
}

function setMoveMode(on) {
    moveMode = !!on
    const camBtn = $('sticker3dModeCam'), movBtn = $('sticker3dModeMove')
    if (camBtn && movBtn) {
        camBtn.classList.toggle('active', !moveMode)
        movBtn.classList.toggle('active', moveMode)
    }
    if (controls) controls.enabled = true
}

function normRot(r) { r = Math.round(Number(r) || 0); r %= 360; if (r < 0) r += 360; return r }

// Slider wiring (deferred until DOM exists)
function wireControls() {
    const rot = $('sticker3dRot'), scl = $('sticker3dScale')
    if (rot && !rot._wired) {
        rot._wired = true
        rot.addEventListener('input', () => { place.rotationDeg = normRot(rot.value); $('sticker3dRotVal').innerText = `${place.rotationDeg}°`; buildDecal(); updateStatus() })
    }
    if (scl && !scl._wired) {
        scl._wired = true
        scl.addEventListener('input', () => { place.scale = parseFloat(scl.value) || 1; $('sticker3dScaleVal').innerText = place.scale.toFixed(2); buildDecal(); updateStatus() })
    }
    const camBtn = $('sticker3dModeCam'), movBtn = $('sticker3dModeMove')
    if (camBtn && !camBtn._wired) { camBtn._wired = true; camBtn.addEventListener('click', () => setMoveMode(false)) }
    if (movBtn && !movBtn._wired) { movBtn._wired = true; movBtn.addEventListener('click', () => setMoveMode(true)) }
}

window.addEventListener('resize', resize)
document.addEventListener('DOMContentLoaded', wireControls)
// In case the module loads after DOMContentLoaded
wireControls()

// Expose to inline onclick handlers
window.openStickerEditor = openStickerEditor
window.closeStickerEditor = closeStickerEditor
window.resetStickerEditor = resetStickerEditor
window.saveStickerEditor = saveStickerEditor
