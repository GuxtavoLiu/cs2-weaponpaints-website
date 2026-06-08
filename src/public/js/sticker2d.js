// 2D sticker placement editor.
//
// Replaces the old 3D model editor. The game stores a sticker's placement as
// offset_x / offset_y on a PER-WEAPON 2D pixel canvas (a flat side view of the
// weapon), via:
//     offset_x = (canvasX - defaultX) * pixelScale
//     offset_y = (canvasY - defaultY) * pixelScale
//     rotation = (360 - canvasAngle) % 360
// with per-weapon constants (defaultX/defaultY/pixelScale). Those constants live
// in a fixed 1920x1080 reference frame with the weapon image stretched to fill it
// (the same approach skin generator sites use, so the result matches in-game).
//
// The constants come from src/public/js/json/weaponCanvas.json (keyed by
// defindex, with a "legacy" and a "new" variant). This editor draws the current
// skin image stretched into that 1920x1080 frame, lets you drag/rotate each
// sticker on it, and reads back the placement through window.stickerEditorAPI.

const REF = { w: 1920, h: 1080, stickerW: 138.66, stickerH: 104 }
let WEAPONS = null // { [defindex]: { item, display, order, defaultSlot, legacy, new } }

const $ = (id) => document.getElementById(id)
const t = (k, fallback) => (typeof langObject !== 'undefined' && langObject[k]) || fallback
const API = () => window.stickerEditorAPI
function subdirPath() { return (typeof subdir !== 'undefined' && subdir) ? subdir : '/' }

// ---------------------------------------------------------------------------
// Module state
// ---------------------------------------------------------------------------
let openSlot = 0
let loadedDefindex = null
let calib = null          // the chosen variant constants for the open weapon
// One entry per applied sticker: { slot, id, cx, cy (1920-ref px), rot (deg), el, savedScale, dirty }
let items = []
let selIndex = -1
let displayScale = 1      // canvas px per reference px (canvasWidth / 1920)

const sel = () => (selIndex >= 0 && selIndex < items.length ? items[selIndex] : null)

// ---------------------------------------------------------------------------
// Data loading
// ---------------------------------------------------------------------------
function ensureWeapons() {
    if (WEAPONS) return Promise.resolve(WEAPONS)
    return fetch(`${subdirPath()}js/json/weaponCanvas.json`)
        .then((r) => r.json())
        .then((data) => {
            if (data && data.ref) { REF.w = data.ref.w; REF.h = data.ref.h; REF.stickerW = data.ref.stickerW; REF.stickerH = data.ref.stickerH }
            WEAPONS = (data && data.weapons) || {}
            return WEAPONS
        })
        .catch(() => { WEAPONS = {}; return WEAPONS })
}

// Pick the constants for a weapon. We don't have the per-skin legacy_model flag,
// so default to the "new" model (used by the vast majority of current skins); the
// legacy/new difference is ~1% and only nudges the anchor slightly.
function calibFor(defindex) {
    const w = WEAPONS && WEAPONS[defindex]
    if (!w) return null
    return { ...(w.new || w.legacy), order: w.order, defaultSlot: w.defaultSlot }
}

// ---------------------------------------------------------------------------
// Coordinate mapping (reference 1920x1080 px <-> game offset)
// ---------------------------------------------------------------------------
function canvasToGame(cx, cy) {
    if (!calib) return { x: 0, y: 0 }
    return {
        x: +(((cx - calib.x) * calib.pxscale)).toFixed(6),
        y: +(((cy - calib.y) * calib.pxscale)).toFixed(6),
    }
}
function gameToCanvas(gx, gy) {
    if (!calib || !calib.pxscale) return { cx: REF.w / 2, cy: REF.h / 2 }
    return { cx: gx / calib.pxscale + calib.x, cy: gy / calib.pxscale + calib.y }
}
const screenRotToGame = (deg) => ((360 - (Math.round(Number(deg) || 0) % 360)) % 360)
const gameRotToScreen = (deg) => ((360 - (Math.round(Number(deg) || 0) % 360)) % 360)
function normRot(r) { r = Math.round(Number(r) || 0); r %= 360; if (r < 0) r += 360; return r }

// Keep a placement inside the visible weapon area. The flat side image already
// blocks the back/top/bottom (only the standard side is shown); this just keeps
// the sticker from being dragged off the frame. Start permissive (a small margin)
// and tighten per weapon later if needed.
function clampCanvas(cx, cy) {
    const mx = REF.w * 0.04, my = REF.h * 0.04
    return {
        cx: Math.min(REF.w - mx, Math.max(mx, cx)),
        cy: Math.min(REF.h - my, Math.max(my, cy)),
    }
}

// ---------------------------------------------------------------------------
// Geometry helpers (display)
// ---------------------------------------------------------------------------
function canvasEl() { return $('sticker2dCanvas') }
// Size the canvas to the largest 16:9 box that fits the stage, so the constants
// (measured in a 1920x1080 frame) map directly. displayScale = canvas px / ref px.
function recomputeScale() {
    const stage = $('sticker2dStage')
    const c = canvasEl()
    if (!stage || !c) return
    const aw = stage.clientWidth || REF.w
    const ah = stage.clientHeight || REF.h
    let w = aw, h = w * REF.h / REF.w
    if (h > ah) { h = ah; w = h * REF.w / REF.h }
    c.style.width = `${w}px`
    c.style.height = `${h}px`
    displayScale = w / REF.w
}

// Place/refresh a sticker's DOM element from its reference-frame position.
function layout(it) {
    if (!it.el) return
    const sScale = it.weaponScale || (calib && calib.scale) || 1
    const w = REF.stickerW * sScale * displayScale
    const h = REF.stickerH * sScale * displayScale
    it.el.style.width = `${w}px`
    it.el.style.height = `${h}px`
    it.el.style.left = `${it.cx * displayScale}px`
    it.el.style.top = `${it.cy * displayScale}px`
    it.el.style.transform = `translate(-50%, -50%) rotate(${it.rot}deg)`
    it.el.classList.toggle('selected', it === sel())
}
function layoutAll() { recomputeScale(); items.forEach(layout) }

// ---------------------------------------------------------------------------
// Sticker elements
// ---------------------------------------------------------------------------
function makeStickerEl(it) {
    const el = document.createElement('div')
    el.className = 'sticker2d-item'
    const img = document.createElement('img')
    img.draggable = false
    const url = API() && API().getStickerImage(it.id)
    if (url) img.src = `${subdirPath()}api/sticker-img?u=${encodeURIComponent(url)}`
    el.appendChild(img)
    canvasEl().appendChild(el)
    it.el = el

    el.addEventListener('pointerdown', (e) => onStickerDown(e, it))
    return el
}

// ---------------------------------------------------------------------------
// Interaction: drag to move, wheel/slider to rotate, click to select
// ---------------------------------------------------------------------------
let drag = null // { it, startX, startY, origCx, origCy, moved }
function pointerToRef(e) {
    const r = canvasEl().getBoundingClientRect()
    return { cx: (e.clientX - r.left) / displayScale, cy: (e.clientY - r.top) / displayScale }
}
function onStickerDown(e, it) {
    e.preventDefault()
    e.stopPropagation()
    setSelected(items.indexOf(it))
    const p = pointerToRef(e)
    drag = { it, startCx: p.cx, startCy: p.cy, origCx: it.cx, origCy: it.cy, moved: false }
    try { it.el.setPointerCapture(e.pointerId) } catch (_) {}
}
function onCanvasPointerMove(e) {
    if (!drag) return
    const p = pointerToRef(e)
    const nx = drag.origCx + (p.cx - drag.startCx)
    const ny = drag.origCy + (p.cy - drag.startCy)
    const c = clampCanvas(nx, ny)
    drag.it.cx = c.cx; drag.it.cy = c.cy
    drag.it.dirty = true
    drag.moved = true
    layout(drag.it)
    updateStatus()
}
function onCanvasPointerUp(e) {
    if (drag) { try { drag.it.el.releasePointerCapture(e.pointerId) } catch (_) {} }
    drag = null
}
function onWheel(e) {
    const it = sel()
    if (!it) return
    e.preventDefault()
    it.rot = normRot(it.rot + (e.deltaY > 0 ? 4 : -4))
    it.dirty = true
    layout(it); syncRotUi(it); updateStatus()
}
// Click on empty canvas deselects.
function onCanvasDown(e) {
    if (e.target === canvasEl() || e.target === $('sticker2dBg')) setSelected(-1)
}

function setSelected(i) {
    selIndex = i
    const it = sel()
    items.forEach((x) => x.el && x.el.classList.toggle('selected', x === it))
    if (it) {
        $('sticker2dSlotLabel').innerText = `#${it.slot + 1}`
        syncRotUi(it)
    } else {
        $('sticker2dSlotLabel').innerText = ''
    }
    updateStatus()
}
function syncRotUi(it) {
    const rot = $('sticker2dRot'); if (rot) rot.value = it.rot
    const rv = $('sticker2dRotVal'); if (rv) rv.innerText = `${it.rot}°`
}

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------
function setStatus(msg) { const el = $('sticker2dStatus'); if (el) el.textContent = msg }
function updateStatus() {
    const it = sel()
    if (!it) { setStatus(t('positionClickSelect', 'Click a sticker to select it.')); return }
    const g = canvasToGame(it.cx, it.cy)
    setStatus(`${t('positionSelected', 'Selected')} #${it.slot + 1}  ·  x ${g.x.toFixed(3)}  ·  y ${g.y.toFixed(3)}  ·  ${it.rot}°`)
}

// ---------------------------------------------------------------------------
// Open / close
// ---------------------------------------------------------------------------
function clearItems() {
    items.forEach((it) => { if (it.el && it.el.parentNode) it.el.parentNode.removeChild(it.el) })
    items = []
    selIndex = -1
}

async function openStickerEditor(s) {
    openSlot = s
    const api = API()
    if (!api) return
    await ensureWeapons()

    const weapon = api.getCurrentWeapon()
    loadedDefindex = weapon.defindex
    calib = calibFor(weapon.defindex)

    $('sticker2dEditor').classList.add('show')
    clearItems()

    // Background = the current skin image, stretched to fill the 1920x1080 frame
    // (matches how the constants were measured).
    const bg = $('sticker2dBg')
    const modalImg = $('modalImg')
    if (bg && modalImg) bg.src = modalImg.src

    if (!calib) {
        setStatus(t('positionNoModel', 'No placement data for this weapon yet.'))
    }

    requestAnimationFrame(() => {
        recomputeScale()

        // One draggable element per slot that holds a sticker.
        const count = api.slotCount || 5
        let unplaced = 0
        for (let i = 0; i < count; i++) {
            const id = api.getSlotStickerId(i)
            if (!id) continue
            const tr = api.getTransform(i)
            let cx, cy
            if (tr.x !== 0 || tr.y !== 0) {
                const p = gameToCanvas(tr.x, tr.y)
                cx = p.cx; cy = p.cy
            } else {
                // Unplaced: drop on the anchor, spread a little so they don't stack.
                const a = calib || { x: REF.w / 2, y: REF.h / 2 }
                cx = a.x + unplaced * (REF.w * 0.05)
                cy = a.y
                unplaced++
            }
            const it = {
                slot: i, id, cx, cy,
                rot: gameRotToScreen(tr.rotation),
                savedScale: tr.scale || 0,
                weaponScale: (calib && calib.scale) || 1,
                el: null, dirty: false,
            }
            makeStickerEl(it)
            layout(it)
            items.push(it)
        }

        const idx = items.findIndex((it) => it.slot === openSlot)
        setSelected(idx >= 0 ? idx : (items.length ? 0 : -1))
    })
}

function closeStickerEditor() {
    $('sticker2dEditor').classList.remove('show')
    clearItems()
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------
function resetStickerEditor() {
    const it = sel()
    if (!it) return
    const a = calib || { x: REF.w / 2, y: REF.h / 2 }
    it.cx = a.x; it.cy = a.y; it.rot = 0
    it.dirty = true
    layout(it); syncRotUi(it); updateStatus()
}

function saveStickerEditor() {
    const api = API()
    if (api) {
        // Only persist stickers the user actually moved/rotated, so opening the
        // editor and saving never disturbs untouched placements.
        items.forEach((it) => {
            if (!it.dirty) return
            const g = canvasToGame(it.cx, it.cy)
            api.setTransform(it.slot, { x: g.x, y: g.y, scale: it.savedScale || 0, rotation: screenRotToGame(it.rot) })
        })
    }
    closeStickerEditor()
}

// Snap the selected sticker to one of CS2's standard slot positions, spread along
// the weapon around the anchor. Offsets are a small fraction of the frame width.
const SLOT_DX = [-0.14, -0.05, 0.04, 0.13]
function placeSelectedAtSlot(n) {
    const it = sel()
    if (!it || !calib) return
    const dx = SLOT_DX[n] || 0
    const c = clampCanvas(calib.x + dx * REF.w, calib.y)
    it.cx = c.cx; it.cy = c.cy; it.rot = 0
    it.dirty = true
    layout(it); syncRotUi(it); updateStatus()
}

function clearAllStickers() {
    const api = API()
    if (api && api.clearSlot) {
        const count = api.slotCount || 5
        for (let i = 0; i < count; i++) api.clearSlot(i)
    }
    closeStickerEditor()
}

// ---------------------------------------------------------------------------
// Wiring
// ---------------------------------------------------------------------------
function wire() {
    const canvas = canvasEl()
    if (canvas && !canvas._wired) {
        canvas._wired = true
        canvas.addEventListener('pointerdown', onCanvasDown)
        canvas.addEventListener('pointermove', onCanvasPointerMove)
        window.addEventListener('pointerup', onCanvasPointerUp)
        canvas.addEventListener('wheel', onWheel, { passive: false })
        canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    }
    const rot = $('sticker2dRot')
    if (rot && !rot._wired) {
        rot._wired = true
        rot.addEventListener('input', () => {
            const it = sel(); if (!it) return
            it.rot = normRot(rot.value); it.dirty = true
            $('sticker2dRotVal').innerText = `${it.rot}°`
            layout(it); updateStatus()
        })
    }
}

window.addEventListener('resize', layoutAll)
document.addEventListener('DOMContentLoaded', wire)
wire()

window.openStickerEditor = openStickerEditor
window.closeStickerEditor = closeStickerEditor
window.resetStickerEditor = resetStickerEditor
window.saveStickerEditor = saveStickerEditor
window.clearAllStickers = clearAllStickers
window.placeSelectedAtSlot = placeSelectedAtSlot
