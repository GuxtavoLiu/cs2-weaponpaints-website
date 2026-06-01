const socket = io()

let currentWeaponId = ''
let currentPaintId = ''

const getJsonRequest = function (url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.responseType = 'json';
      xhr.onload = function() {
        var status = xhr.status;
        if (status === 200) {
          resolve(xhr.response);
        } else {
          reject(status);
        }
      };
      xhr.onerror = function() {
        reject("Network error");
      };
      xhr.send();
    });
  }
  
  const getRequestFilename = function(url){
    return url.split('/').pop().split('.').shift()
  }
  
  const pendingRequests = {};
  
  const getJSON = function(url, callback) {
    const propName = getRequestFilename(url);
    const savedData = localStorage.getItem(propName);
  
    if (savedData !== null) {
      callback(null, JSON.parse(savedData));
    } else {
      if (!pendingRequests[url]) {
        pendingRequests[url] = getJsonRequest(url).then(
          data => {
            localStorage.setItem(propName, JSON.stringify(data));
            return data;
          },
          error => {
            throw error;
          }
        ).finally(() => {
          delete pendingRequests[url];
        });
      }
      
      pendingRequests[url].then(
        data => callback(null, data),
        error => callback(error, null)
      );
    }
  }

function getKeyByValue(object, value) {
    return Object.keys(object).find(key => object[key] === value);
}

const weaponIds = {
    "weapon_deagle": 1,
    "weapon_elite": 2,
    "weapon_fiveseven": 3,
    "weapon_glock": 4,
    "weapon_ak47": 7,
    "weapon_aug": 8,
    "weapon_awp": 9,
    "weapon_famas": 10,
    "weapon_g3sg1": 11,
    "weapon_galilar": 13,
    "weapon_m249": 14,
    "weapon_m4a1": 16,
    "weapon_mac10": 17,
    "weapon_p90": 19,
    "weapon_mp5sd": 23,
    "weapon_ump45": 24,
    "weapon_xm1014": 25,
    "weapon_bizon": 26,
    "weapon_mag7": 27,
    "weapon_negev": 28,
    "weapon_sawedoff": 29,
    "weapon_tec9": 30,
    "weapon_taser": 31,
    "weapon_hkp2000": 32,
    "weapon_mp7": 33,
    "weapon_mp9": 34,
    "weapon_nova": 35,
    "weapon_p250": 36,
    "weapon_shield": 37,
    "weapon_scar20": 38,
    "weapon_sg556": 39,
    "weapon_ssg08": 40,
    "weapon_knifegg": 41,
    "weapon_knife": 42,
    "weapon_flashbang": 43,
    "weapon_hegrenade": 44,
    "weapon_smokegrenade": 45,
    "weapon_molotov": 46,
    "weapon_decoy": 47,
    "weapon_incgrenade": 48,
    "weapon_c4": 49,
    "weapon_healthshot": 57,
    "weapon_knife_t": 59,
    "weapon_m4a1_silencer": 60,
    "weapon_usp_silencer": 61,
    "weapon_cz75a": 63,
    "weapon_revolver": 64,
    "weapon_tagrenade": 68,
    "weapon_fists": 69,
    "weapon_breachcharge": 70,
    "weapon_tablet": 72,
    "weapon_melee": 74,
    "weapon_axe": 75,
    "weapon_hammer": 76,
    "weapon_spanner": 78,
    "weapon_knife_ghost": 80,
    "weapon_firebomb": 81,
    "weapon_diversion": 82,
    "weapon_frag_grenade": 83,
    "weapon_snowball": 84,
    "weapon_bumpmine": 85,
    "weapon_bayonet": 500,
    "weapon_knife_css": 503,
    "weapon_knife_flip": 505,
    "weapon_knife_gut": 506,
    "weapon_knife_karambit": 507,
    "weapon_knife_m9_bayonet": 508,
    "weapon_knife_tactical": 509,
    "weapon_knife_falchion": 512,
    "weapon_knife_survival_bowie": 514,
    "weapon_knife_butterfly": 515,
    "weapon_knife_push": 516,
    "weapon_knife_cord": 517,
    "weapon_knife_canis": 518,
    "weapon_knife_ursus": 519,
    "weapon_knife_gypsy_jackknife": 520,
    "weapon_knife_outdoor": 521,
    "weapon_knife_stiletto": 522,
    "weapon_knife_widowmaker": 523,
    "weapon_knife_skeleton": 525,
    "weapon_knife_kukri": 526,
    "studded_brokenfang_gloves": 4725,
    "studded_bloodhound_gloves": 5027,
    "t_gloves": 5028,
    "ct_gloves": 5029,
    "sporty_gloves": 5030,
    "slick_gloves": 5031,
    "leather_handwraps": 5032,
    "motorcycle_gloves": 5033,
    "specialist_gloves": 5034,
    "studded_hydra_gloves": 5035,
}

// ---- Stickers ----
// DB string format (from the cs2-WeaponPaints plugin):
//   "id;schema;x;y;wear;scale;rotation"  -> wear is index 4.
// We only expose `wear`; everything else stays at the default position (0).
const STICKER_EMPTY = '0;0;0;0;0;0;0'
// CS2 weapon models only expose 4 sticker positions; the 5th DB column exists
// but has no predefined spot, so we cap the UI at 4. The server still writes
// weapon_sticker_4 (always empty) to keep the row schema consistent.
const STICKER_SLOTS = 4

let stickersData = null            // [{id, name, image, rarity, rarityName, effect, type}]
let stickersById = null            // { id: sticker }
let stickerSlots = new Array(STICKER_SLOTS).fill(0) // selected sticker id per slot (0 = empty)
let activeStickerSlot = 0
let stickersLoadPromise = null
let stickerFiltersBuilt = false

const ensureStickersLoaded = () => {
    if (stickersData) return Promise.resolve(stickersData)
    if (!stickersLoadPromise) {
        // Not cached in localStorage on purpose: the file is ~3MB and would risk
        // the quota that already bit the skins blob. In-memory cache is enough.
        stickersLoadPromise = fetch('/js/json/stickers.json')
            .then(r => r.json())
            .then(data => {
                stickersData = data
                stickersById = {}
                data.forEach(s => { stickersById[s.id] = s })
                return data
            })
    }
    return stickersLoadPromise
}

// Build the per-slot DB string for the current modal state.
const buildStickerString = (slot) => {
    const id = stickerSlots[slot]
    if (!id || id <= 0) return STICKER_EMPTY
    let wear = parseFloat(document.getElementById(`stickerWear-${slot}`).value)
    if (!Number.isFinite(wear)) wear = 0
    wear = Math.min(1, Math.max(0, wear))
    return `${id};0;0;0;${wear};0;0`
}

const renderStickerSlot = (slot, id, wear) => {
    id = parseInt(id, 10) || 0
    stickerSlots[slot] = id > 0 ? id : 0

    const slotEl = document.querySelector(`.sticker-slot[data-slot="${slot}"]`)
    const img = document.getElementById(`stickerImg-${slot}`)
    const plus = document.getElementById(`stickerPlus-${slot}`)
    const clearBtn = document.getElementById(`stickerClear-${slot}`)
    const applyAllBtn = document.getElementById(`stickerApplyAll-${slot}`)
    const wearWrap = slotEl.querySelector('.sticker-wear-wrap')
    const wearInput = document.getElementById(`stickerWear-${slot}`)
    const wearVal = document.getElementById(`stickerWearVal-${slot}`)

    const sticker = id > 0 && stickersById ? stickersById[id] : null

    if (id > 0) {
        slotEl.classList.add('filled')
        if (sticker) {
            img.src = sticker.image
            img.alt = sticker.name
            img.title = sticker.name
        }
        img.style.display = sticker ? 'block' : 'none'
        plus.style.display = sticker ? 'none' : 'block'
        clearBtn.style.display = 'inline-block'
        if (applyAllBtn) applyAllBtn.style.display = 'flex'
        wearWrap.style.display = 'block'
        const w = Number.isFinite(wear) ? wear : 0
        wearInput.value = w
        wearVal.innerText = Number(w).toFixed(2)
    } else {
        slotEl.classList.remove('filled')
        img.src = ''
        img.style.display = 'none'
        plus.style.display = 'block'
        clearBtn.style.display = 'none'
        if (applyAllBtn) applyAllBtn.style.display = 'none'
        wearWrap.style.display = 'none'
        wearInput.value = 0
        wearVal.innerText = '0.00'
    }
}

// Copy this slot's sticker + wear into all 5 slots.
const applyStickerToAll = (event, slot) => {
    if (event) event.stopPropagation()
    const id = stickerSlots[slot]
    if (!id || id <= 0) return
    const wear = parseFloat(document.getElementById(`stickerWear-${slot}`).value) || 0
    for (let i = 0; i < STICKER_SLOTS; i++) {
        if (i === slot) continue
        renderStickerSlot(i, id, wear)
    }
}

// Populate the 5 slots from a saved wp_player_skins row (or reset when none).
const loadStickersIntoModal = (row) => {
    return ensureStickersLoaded().then(() => {
        for (let i = 0; i < STICKER_SLOTS; i++) {
            const raw = row ? row[`weapon_sticker_${i}`] : null
            let id = 0, wear = 0
            if (raw) {
                const parts = String(raw).split(';')
                id = parseInt(parts[0], 10) || 0
                wear = parseFloat(parts[4]) || 0
            }
            renderStickerSlot(i, id, wear)
        }
        closeStickerPicker()
    })
}

const onStickerWearInput = (slot) => {
    const v = parseFloat(document.getElementById(`stickerWear-${slot}`).value) || 0
    document.getElementById(`stickerWearVal-${slot}`).innerText = v.toFixed(2)
}

// How many results to render at once (the full list is 10k+, so we cap to keep
// the DOM light; the count label still reports the true total of matches).
const STICKER_RENDER_CAP = 300

// Populate the type / effect / rarity filter dropdowns from the dataset (once).
const buildStickerFilters = () => {
    if (stickerFiltersBuilt || !stickersData) return
    const uniq = (key) => [...new Set(stickersData.map(s => s[key]).filter(Boolean))].sort()

    const fill = (selId, allLabel, values) => {
        const sel = document.getElementById(selId)
        sel.innerHTML = `<option value="">${allLabel}</option>` +
            values.map(v => `<option value="${v}">${v}</option>`).join('')
    }
    fill('stickerFilterType', langObject.allTypes || 'All types', uniq('type'))
    fill('stickerFilterEffect', langObject.allEffects || 'All effects', uniq('effect'))

    // Rarity ordered by in-game tier (lowest -> highest) rather than alphabetically.
    const rarityOrder = ['Default', 'Base Grade', 'High Grade', 'Remarkable', 'Exotic', 'Extraordinary', 'Contraband']
    const rarities = uniq('rarityName').sort((a, b) => {
        const ia = rarityOrder.indexOf(a), ib = rarityOrder.indexOf(b)
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })
    fill('stickerFilterRarity', langObject.allRarities || 'All rarities', rarities)

    stickerFiltersBuilt = true
}

const openStickerPicker = (slot) => {
    activeStickerSlot = slot
    ensureStickersLoaded().then(() => {
        buildStickerFilters()
        document.getElementById('stickerPickerSlotLabel').innerText = `#${slot + 1}`
        document.getElementById('stickerSearch').value = ''
        document.getElementById('stickerFilterType').value = ''
        document.getElementById('stickerFilterEffect').value = ''
        document.getElementById('stickerFilterRarity').value = ''
        renderStickerResults()
        document.getElementById('stickerPicker').classList.add('show')
        // Defer focus so the show transition doesn't swallow it.
        setTimeout(() => document.getElementById('stickerSearch').focus(), 30)
    })
}

const closeStickerPicker = () => {
    const el = document.getElementById('stickerPicker')
    if (el) el.classList.remove('show')
}

// Close when clicking the dimmed area outside the dialog.
const onStickerOverlayClick = (event) => {
    if (event.target.id === 'stickerPicker') closeStickerPicker()
}

// Close on Escape (only when the picker is the topmost thing open).
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const el = document.getElementById('stickerPicker')
        if (el && el.classList.contains('show')) {
            e.stopPropagation()
            closeStickerPicker()
        }
    }
}, true)

let stickerSearchTimer
const onStickerSearchInput = () => {
    clearTimeout(stickerSearchTimer)
    stickerSearchTimer = setTimeout(renderStickerResults, 120)
}

const renderStickerResults = () => {
    if (!stickersData) return
    // Elastic search: case-insensitive, every whitespace-separated token must
    // appear somewhere in the name (so "kato nuke" finds "... | Katowice 2014 | Nuke").
    const tokens = document.getElementById('stickerSearch').value.toLowerCase().split(/\s+/).filter(Boolean)
    const fType = document.getElementById('stickerFilterType').value
    const fEffect = document.getElementById('stickerFilterEffect').value
    const fRarity = document.getElementById('stickerFilterRarity').value

    const matches = []
    let total = 0
    for (let i = 0; i < stickersData.length; i++) {
        const s = stickersData[i]
        if (tokens.length) {
            const hay = s.name.toLowerCase()
            let ok = true
            for (let t = 0; t < tokens.length; t++) { if (!hay.includes(tokens[t])) { ok = false; break } }
            if (!ok) continue
        }
        if (fType && s.type !== fType) continue
        if (fEffect && s.effect !== fEffect) continue
        if (fRarity && s.rarityName !== fRarity) continue
        total++
        if (matches.length < STICKER_RENDER_CAP) matches.push(s)
    }

    const countEl = document.getElementById('stickerResultCount')
    if (countEl) {
        const shown = total > STICKER_RENDER_CAP ? `${STICKER_RENDER_CAP}/${total}` : `${total}`
        countEl.innerText = `${shown} ${langObject.stickersFound || ''}`.trim()
    }

    document.getElementById('stickerResults').innerHTML = matches.map(s => `
        <div class="sticker-result" onclick="selectSticker(${s.id})" title="${s.name.replace(/"/g, '&quot;')}" style="border-color:${s.rarity || '#444'}">
            <div class="sticker-result-img" style="--rarity:${s.rarity || '#444'}">
                <img src="${s.image}" loading="lazy" alt="">
            </div>
            <small>${s.name}</small>
        </div>
    `).join('')
}

const selectSticker = (id) => {
    const wear = parseFloat(document.getElementById(`stickerWear-${activeStickerSlot}`).value) || 0
    renderStickerSlot(activeStickerSlot, id, wear)
    closeStickerPicker()
}

const clearSticker = (slot) => {
    renderStickerSlot(slot, 0, 0)
}

window.openStickerPicker = openStickerPicker
window.closeStickerPicker = closeStickerPicker
window.onStickerOverlayClick = onStickerOverlayClick
window.onStickerSearchInput = onStickerSearchInput
window.onStickerWearInput = onStickerWearInput
window.renderStickerResults = renderStickerResults
window.selectSticker = selectSticker
window.clearSticker = clearSticker
window.applyStickerToAll = applyStickerToAll

const editModal = (img, weaponName, paintName, weaponId, paintId, stattrakAvailable) => {
    document.getElementById('modalImg').src = img
    document.getElementById('modalWeapon').innerText = weaponName
    document.getElementById('modalPaint').innerText = paintName
    currentWeaponId = weaponIds[weaponId]
    currentPaintId = paintId

    // The saved row (if any) for this exact weapon+paint drives both the StatTrak
    // state and the saved stickers.
    let savedRow = undefined
    if (typeof selectedSkins !== 'undefined') {
        savedRow = selectedSkins.find(s => s.weapon_defindex == currentWeaponId && s.weapon_paint_id == currentPaintId)
    }

    // StatTrak only applies to items that support it (e.g. not gloves / low-tier
    // skins). Hide the switch otherwise. When supported, default it ON for a
    // fresh item; respect the saved value so the user can leave it disabled.
    const stWrapper = document.getElementById('stattrakWrapper')
    const stInput = document.getElementById('stattrak')
    if (stattrakAvailable) {
        stWrapper.style.display = ''
        stInput.checked = savedRow ? !!Number(savedRow.weapon_stattrak) : true
    } else {
        stWrapper.style.display = 'none'
        stInput.checked = false
    }

    // Load the saved stickers (or reset all slots) for this weapon.
    loadStickersIntoModal(savedRow)

    console.log(img, weaponName, paintName, currentWeaponId, currentPaintId)
}

const changeParams = () => {
    let steamid = user.id
    let weaponid = currentWeaponId
    let paintid = currentPaintId
    let float = document.getElementById("float").value
    let pattern = document.getElementById("pattern").value
    let stattrak = document.getElementById("stattrak").checked ? 1 : 0

    // Collect the 5 sticker slots as DB strings ("id;schema;x;y;wear;scale;rotation").
    let stickers = []
    for (let i = 0; i < STICKER_SLOTS; i++) {
        stickers.push(buildStickerString(i))
    }

    document.getElementById('modalButton').innerHTML =
        `
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        `

    socket.emit('change-params', {steamid: steamid, weaponid: weaponid, paintid: paintid, float: float, pattern: pattern, stattrak: stattrak, stickers: stickers})
}

const putOnWorkshop = (setId, selected_knife_id, selected_knife, selected_gloves) => {
    socket.emit('put-on-workshop', {setId: setId, steamid: user.id, selected_knife_id: selected_knife_id, selected_knife: selected_knife, selected_gloves: selected_gloves})
}

const publishWorkshop = (steamid, set_name) => {
    socket.emit('publish', {steamid: steamid, set_name: set_name})
    location.reload()
}

const updateWorkshop = (steamid, set_id) => {
    socket.emit('updateWorkshop', {steamid: steamid, set_id: set_id})
    location.reload()
}

const removeMyCollection = (set_id, steamid) => {
    socket.emit('removeWorkshop', {steamid: steamid, set_id: set_id})
}

let Timer;

const workshopSearch = () => {
    if (document.getElementById('workshopSearchInput').value == '') {
        workShopTemplate()
        socket.emit('get-workshop', {i: 0, steamid: user.id})
        workshopAmount = 10
        found = true
    } else {
        clearTimeout(Timer);
        Timer = setTimeout(function () {
            socket.emit('searchWorkshop', {search: document.getElementById('workshopSearchInput').value})
        }, 500);
    }
}

socket.on('params-changed', (data) => {
    // Keep the in-memory skins in sync so re-opening the modal shows the saved
    // stickers / stattrak without a page reload.
    if (data && Array.isArray(data.newSkins) && typeof selectedSkins !== 'undefined') {
        selectedSkins = data.newSkins
    }
    document.getElementById('modalButton').innerHTML = langObject.change
})

// ---- Inspect link ----
const applyInspectLink = () => {
    const link = document.getElementById('inspectInput').value.trim()
    const status = document.getElementById('inspectStatus')
    if (!link) return
    status.className = 'm-0 mt-2 text-secondary'
    status.innerText = '...'
    document.getElementById('inspectButton').innerHTML =
        `<div class="spinner-border spinner-border-sm" role="status"><span class="visually-hidden">Loading...</span></div>`
    socket.emit('apply-inspect', { steamid: user.id, link: link })
}
window.applyInspectLink = applyInspectLink

socket.on('inspect-applied', (data) => {
    const status = document.getElementById('inspectStatus')
    document.getElementById('inspectButton').innerHTML = langObject.inspectApply
    if (data && data.ok) {
        status.className = 'm-0 mt-2 text-success'
        status.innerText = langObject.inspectOk
        // Reload so the skin grid / equipped knife reflect the applied item.
        setTimeout(() => location.reload(), 800)
    } else {
        status.className = 'm-0 mt-2 text-danger'
        status.innerText = (data && data.error === 'UNMASKED_LINK')
            ? langObject.inspectUnmasked
            : langObject.inspectInvalid
    }
})

socket.on('workshopRemoved', () => {
    location.reload()
})

/* 
<button class="pushable" onclick="">
    <span class="shadow"></span>
    <span class="edge"></span>
    <div class="front d-flex align-items-center" id="">
            <p class="m-0 mx-auto">Workshop name</p>    
            <a href="" class="text-danger"><i class="fa-regular fa-trash-can me-2"></i></i></a>                 
    </div>
</button> 
*/

// set_name, personaname, selected_knife, selected_gloves, skins, set_id

socket.on('my-workshop-data', data => {
    const myWorkshops = data.results
    let i = 0
    console.log(data)
    myWorkshops.forEach(element => {
        let agent_t = (element.agent_t != "") ? element.agent_t : undefined
        let agent_ct = (element.agent_ct != "") ? element.agent_ct : undefined
        let button = document.createElement('button')
        button.classList.add('pushable')
        button.setAttribute("onclick", `myWorkshop("${element.set_name}", "${element.personaname}", "${element.selected_knife}", ${element.selected_gloves}, {agent_t: '${agent_t}', agent_ct: '${agent_ct}'}, ${JSON.stringify(element.skins)}, ${element.id}, ${element.wore})`);
        button.innerHTML = `
            <span class="shadow"></span>
            <span class="edge"></span>
            <div class="front d-flex align-items-center" id="">
                    <p class="m-0 mx-auto text-break">${element.set_name}</p>    
                    <button onclick="removeMyCollection('${element.id}', '${element.steamid}')" class="btn m-0 p-0 text-danger"><i class="fa-regular fa-trash-can mx-2"></i></button>                 
            </div>
        `

        document.getElementById('myWorkshopSideGroup').append(button)
        i++
    })

    const textColor = (i == 5) ? 'text-danger' : 'text-accent'

    document.getElementById('myWorkshopCount').innerHTML = `Your collections <span class="${textColor}">(${i}/5)</span>:`
    
    let addButton = document.createElement('button')
    addButton.classList.add('pushable')
    addButton.setAttribute("onclick", "createWorkshop()")

    if (i == 5) {
        addButton.onclick = function () {}
        addButton.innerHTML = `
            <span class="shadow"></span>
            <span class="edge"></span>
            <div class="front d-flex align-items-center limit-btn" id="">
                <p class="m-0 mx-auto text-danger">${langObject.limit}</p>                   
            </div>
        `
        document.getElementById('myWorkshopCount').after(addButton)
    } else {
        addButton.innerHTML = `
            <span class="shadow"></span>
            <span class="edge"></span>
            <div class="front d-flex align-items-center workshop-add-btn" id="">
                <i class="fa-solid fa-plus fa-lg ms-3 me-2 my-auto text-accent"></i>
                <p class="m-0 mx-auto text-accent">${langObject.addNew}</p>                   
            </div>
        `
        document.getElementById('myWorkshopCount').after(addButton)
    }
})

socket.on('workshop-data', data => {

    document.getElementById('myWorkshopSideGroup').style.display = 'block'

    data.results.forEach(element => {
        let skins;
        if (typeof element.skins == 'object') {
            skins = element.skins
        } else {
            skins = JSON.parse(element.skins)
        }

        if (element.steamid == user.id) {
            //
        } else {
            if (element.steamid != user.id) {
                workshopElement(element.set_name, element.personaname, element.selected_knife, element.selected_gloves, {agent_t: element.agent_t, agent_ct: element.agent_ct}, skins, element.id, false, element.wore) 
            }
        }
    });

    if (data.results.length == 0) {
        stopSending = true
    }
})

socket.on('workshop-search-data', data => {
    document.getElementById('skinsContainer').innerHTML = ""
    data.results.forEach(element => {
        let skins;
        if (typeof element.skins == 'object') {
            skins = element.skins
        } else {
            skins = JSON.parse(element.skins)
        }

        if (element.steamid == user.id) {
            //
        } else {
            if (element.steamid != user.id) {
                workshopElement(element.set_name, element.personaname, element.selected_knife, element.selected_gloves, {agent_t: element.agent_t, agent_ct: element.agent_ct}, skins, element.id, true, element.wore)
                console.log(element)
            }
        }
    });
})

socket.on('putted-on-workshop', () => {
    location.reload()
})