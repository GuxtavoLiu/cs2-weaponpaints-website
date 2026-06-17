import { skinsObject, defaultsObject, agentsObject, musicObject } from './sideBtns.js'

window.defaultsTemplate = (weapon, langObject, lang) => {
    let card = document.createElement('div')
    card.classList.add('col-6', 'col-sm-4', 'col-md-3', 'p-2')

    card.innerHTML = `
    <div class="rounded-3 d-flex flex-column card-common weapon-card weapon_knife" id="${weapon.weapon_name}" data-type="weaponCard" data-btn-type="${weapon.weapon_name}">
        <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${weapon.weapon_name}">
            <div class="spinner-border spinner-border-xl" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <a onclick="knifeSkins(\'${weapon.weapon_name}\')" class="text-decoration-none d-flex flex-column" style="z-index: 0; cursor: pointer;">
                <img src="${weapon.image}" class="weapon-img mx-auto my-2 img-show-hover" style="transform: translateY(16%) scale(0.95);" width="181px" height="136px" loading="lazy" alt="${weapon.paint_name}">
                
                <p class="m-0 text-secondary weapon-skin-title mx-auto text-center show-hover" style="transform: translateY(170%);"><small>${langObject.defaultSkin}</small></p>
                <p class="m-0 text-light weapon-skin-title mx-auto text-center show-hover" style="transform: translateY(170%);">${weapon.paint_name}</p>
        </a>
        <button onclick="knifeSkins(\'${weapon.weapon_name}\')" class="btn btn-outline-accent-card w-100 mt-3 show-hover" style="z-index: 1; transform: translateY(150%);"><small>${langObject.changeSkin}</small></button>
    </div>
    `

    document.getElementById('skinsContainer').appendChild(card)  
}

window.changeSkinTemplate = (weapon, langObject, selectedKnife) => {
    let card = document.createElement('div')
    card.classList.add('col-6', 'col-sm-4', 'col-md-3', 'p-2')
    
    card.innerHTML = `
    <div class="rounded-3 d-flex flex-column card-common weapon-card" id="${weapon.weapon_name}"data-type="weaponCard" data-btn-type="${weapon.weapon_name}">
        <button id="reset-${weapon.weapon_name}" onclick="resetSkin(${weapon.weapon_defindex}, '${selectedKnife.steamid}')" style="z-index: 3;" class="revert d-flex justify-content-center align-items-center text-danger rounded-circle">
            <i class="fa-solid fa-rotate-right"></i>
        </button>

        <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${weapon.weapon_name}">
            <div class="spinner-border spinner-border-xl" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <a onclick="knifeSkins(\'${weapon.weapon_name}\')" class="text-decoration-none d-flex flex-column" style="z-index: 0; cursor: pointer;">
                <img src="${weapon.image}" class="weapon-img mx-auto my-2 img-show-hover" style="transform: translateY(16%) scale(0.95);" width="181px" height="136px" loading="lazy" alt="${weapon.image}" id="img-${weapon.weapon_name}">
                
                <p class="m-0 text-secondary weapon-skin-title mx-auto text-center show-hover" id="skinPaintName-${weapon.weapon_name}" style="transform: translateY(170%);"><small>${langObject.defaultSkin}</small></p>
                <p class="m-0 text-light weapon-skin-title mx-auto text-center show-hover" style="transform: translateY(170%);">${weapon.paint_name}</p>
        </a>
        <button onclick="knifeSkins(\'${weapon.weapon_name}\')" class="btn btn-outline-accent-card w-100 mt-3 show-hover" style="z-index: 1; transform: translateY(150%);"><small>${langObject.changeSkin}</small></button>
    </div>
    `

    document.getElementById('skinsContainer').appendChild(card)  
}

window.changeKnifeSkinTemplate = (knife, langObject, selectedKnife) => {
    let card = document.createElement('div')
    card.classList.add('col-6', 'col-sm-4', 'col-md-3', 'p-2')

    let buttonInner = langObject.setWeapon
    let buttonFunc = `changeKnife(\'${knife.weapon_name}\')`

    // Equipped for the current team selection? ('both': active only when both
    // teams use this knife; T/CT badge when only one does)
    let active = ''
    const st = window.itemTeamState('knife', knife.weapon_name)
    const cardTeam = window.cardTeamSelectorHtml({ kind: 'knife', weaponName: knife.weapon_name })
    if (st.active) {
        active = 'active-card'
        buttonInner = langObject.changeSkin
        buttonFunc =  `knifeSkins(\'${knife.weapon_name}\')`
    }


    card.innerHTML = `
    <div class="rounded-3 d-flex flex-column card-common weapon-card has-card-team ${active} weapon_knife" id="${knife.weapon_name}" data-type="weaponCard" data-team-kind="knife" data-btn-type="${knife.weapon_name}">
        ${window.teamBadgeHtml(st)}
        <button id="reset-${knife.weapon_name}" onclick="resetSkin(${knife.weapon_defindex}, '${selectedKnife.steamid}')" style="z-index: 3;" class="revert d-flex justify-content-center align-items-center text-danger rounded-circle">
            <i class="fa-solid fa-rotate-right"></i>
        </button>

        <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${knife.weapon_name}">
            <div class="spinner-border spinner-border-xl" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <a onclick="${buttonFunc}" class="text-decoration-none d-flex flex-column" style="z-index: 0;">
            <img src="${knife.image}" class="weapon-img mx-auto my-2 img-show-hover" style="transform: translateY(16%) scale(0.95)" width="181px" height="136px" loading="lazy" alt="${knife.image}" id="img-${knife.weapon_name}">
            
            <p class="m-0 text-secondary weapon-skin-title mx-auto text-center show-hover" id="skinPaintName-${knife.weapon_name}" style="transform: translateY(170%);"><small>${langObject.defaultSkin}</small></p>
            <p class="m-0 text-light weapon-skin-title mx-auto text-center show-hover" style="transform: translateY(170%);">${knife.paint_name}</p>
        </a>
        <button onclick="${buttonFunc}" data-knife="${knife.weapon_name}" class="btn btn-outline-accent-card mt-3 w-100 show-hover" style="z-index: 1; transform: translateY(150%);"><small>${buttonInner}</small></button>
        ${cardTeam}
    </div>
    `

    document.getElementById('skinsContainer').appendChild(card)  
}

window.changeSkinCard = (weapon, selectedSkin) => {
    skinsObject.forEach(skinWeapon => {
        if (weaponIds[skinWeapon.weapon.id] == weapon.weapon_defindex && skinWeapon.paint_index == selectedSkin.weapon_paint_id) {
            if (skinWeapon.category.id == 'sfui_invpanel_filter_melee') {
                skinWeapon.rarity.color = "#caab05"
            }
            document.getElementById(`img-${weapon.weapon_name}`).src = skinWeapon.image
            document.getElementById(`img-${weapon.weapon_name}`).style.filter = `drop-shadow(0px 0px 10px ${skinWeapon.rarity.color}80)`

            if (typeof skinWeapon.phase != 'undefined') {
                document.getElementById(`skinPaintName-${weapon.weapon_name}`).innerHTML = `<small style="color: ${skinWeapon.rarity.color}; !important;">${skinWeapon.pattern.name} (${skinWeapon.phase})</small>`
            } else {
                document.getElementById(`skinPaintName-${weapon.weapon_name}`).innerHTML = `<small style="color: ${skinWeapon.rarity.color}; !important">${skinWeapon.pattern.name}</small>`
            }
        }
    })
}

window.knivesTemplate = (knife, langObject, selectedKnife) => {
    let card = document.createElement('div')
    card.classList.add('col-6', 'col-sm-4', 'col-md-3', 'p-2')

    let buttonInner = langObject.setWeapon
    let buttonFunc = `changeKnife(\'${knife.weapon_name}\')`

    // Equipped for the current team selection?
    let active = ''
    const st = window.itemTeamState('knife', knife.weapon_name)
    const cardTeam = window.cardTeamSelectorHtml({ kind: 'knife', weaponName: knife.weapon_name })
    if (st.active) {
        active = 'active-card'
        buttonInner = langObject.changeSkin
        buttonFunc =  `knifeSkins(\'${knife.weapon_name}\')`
    }

    card.innerHTML = `
    <div class="rounded-3 d-flex flex-column card-common weapon-card has-card-team ${active} weapon_knife" id="${knife.weapon_name}" data-type="weaponCard" data-team-kind="knife" data-btn-type="${knife.weapon_name}">
        ${window.teamBadgeHtml(st)}
        <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${knife.weapon_name}">
            <div class="spinner-border spinner-border-xl" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <a onclick="${buttonFunc}" class="text-decoration-none d-flex flex-column" style="z-index: 0;">
            <img src="${knife.image}" class="weapon-img mx-auto my-2 img-show-hover" style="transform: translateY(16%) scale(0.95)" width="181px" height="136px" loading="lazy" alt="${knife.paint_name}">

            <p class="m-0 text-secondary weapon-skin-title mx-auto text-center show-hover" id="skinPaintName-${knife.weapon_name}" style="transform: translateY(170%);"><small>${langObject.defaultSkin}</small></p>
            <p class="m-0 text-light weapon-skin-title mx-auto text-center show-hover" style="transform: translateY(170%);">${knife.paint_name}</p>
        </a>
        <button onclick="${buttonFunc}" data-knife="${knife.weapon_name}" class="btn btn-outline-accent-card mt-3 w-100 show-hover" style="z-index: 1; transform: translateY(150%);"><small>${buttonInner}</small></button>
        ${cardTeam}
    </div>
    `

    document.getElementById('skinsContainer').appendChild(card)    
}

window.glovesTemplate = (gloves, langObject, selectedGloves) => {
    let card = document.createElement('div')
    card.classList.add('col-6', 'col-sm-4', 'col-md-3', 'p-2')

    let buttonInner = langObject.setWeapon
    let buttonFunc = `changeGlove(\'${gloves.weapon_name}\')`

    // Equipped for the current team selection?
    let active = ''
    const st = window.itemTeamState('gloves', gloves.weapon_defindex)
    const cardTeam = window.cardTeamSelectorHtml({ kind: 'gloves', weaponName: gloves.weapon_name, weaponid: gloves.weapon_defindex })
    if (st.active) {
        active = 'active-card'
        buttonInner = langObject.changeSkin
        buttonFunc =  `knifeSkins(\'${gloves.weapon_name}\')`
    }

    card.innerHTML = `
    <div class="rounded-3 d-flex flex-column card-common weapon-card has-card-team ${active} weapon_knife" id="${gloves.weapon_name}" data-type="weaponCard" data-team-kind="gloves" data-defindex="${gloves.weapon_defindex}" data-btn-type="${gloves.weapon_name}">
        ${window.teamBadgeHtml(st)}
        <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${gloves.weapon_name}">
            <div class="spinner-border spinner-border-xl" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <a onclick="${buttonFunc}" class="text-decoration-none d-flex flex-column" style="z-index: 0;">
            <img src="${gloves.image}" class="weapon-img mx-auto my-2 img-show-hover" style="transform: translateY(16%) scale(0.95)" width="181px" height="136px" loading="lazy" alt="${gloves.paint_name}">

            <p class="m-0 text-secondary weapon-skin-title mx-auto text-center show-hover" id="skinPaintName-${gloves.weapon_name}" style="transform: translateY(170%);"><small>${langObject.defaultSkin}</small></p>
            <p class="m-0 text-light weapon-skin-title mx-auto text-center show-hover" style="transform: translateY(170%);">${gloves.paint_name}</p>
        </a>
        <button onclick="${buttonFunc}" data-knife="${gloves.weapon_name}" class="btn btn-outline-accent-card mt-3 w-100 show-hover" style="z-index: 1; transform: translateY(150%);"><small>${buttonInner}</small></button>
        ${cardTeam}
    </div>
    `

    document.getElementById('skinsContainer').appendChild(card)    
}

window.changeGlovesSkinTemplate = (gloves, langObject, selectedGloves) => {
    let card = document.createElement('div')
    card.classList.add('col-6', 'col-sm-4', 'col-md-3', 'p-2')

    let buttonInner = langObject.setWeapon
    let buttonFunc = `changeGlove(\'${gloves.weapon_name}\')`

    // Equipped for the current team selection?
    let active = ''
    const st = window.itemTeamState('gloves', gloves.weapon_defindex)
    const cardTeam = window.cardTeamSelectorHtml({ kind: 'gloves', weaponName: gloves.weapon_name, weaponid: gloves.weapon_defindex })
    if (st.active) {
        active = 'active-card'
        buttonInner = langObject.changeSkin
        buttonFunc =  `knifeSkins(\'${gloves.weapon_name}\')`
    }


    card.innerHTML = `
    <div class="rounded-3 d-flex flex-column card-common weapon-card has-card-team ${active} weapon_knife" id="${gloves.weapon_name}" data-type="weaponCard" data-team-kind="gloves" data-defindex="${gloves.weapon_defindex}" data-btn-type="${gloves.weapon_name}">
        ${window.teamBadgeHtml(st)}
        <button id="reset-${gloves.weapon_name}" onclick="resetSkin(${gloves.weapon_defindex}, '${selectedGloves.steamid}')" style="z-index: 3;" class="revert d-flex justify-content-center align-items-center text-danger rounded-circle">
            <i class="fa-solid fa-rotate-right"></i>
        </button>

        <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${gloves.weapon_name}">
            <div class="spinner-border spinner-border-xl" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>

        <a onclick="${buttonFunc}" class="text-decoration-none d-flex flex-column" style="z-index: 0;">
            <img src="${gloves.image}" class="weapon-img mx-auto my-2 img-show-hover" style="transform: translateY(16%) scale(0.95)" width="181px" height="136px" loading="lazy" alt="${gloves.image}" id="img-${gloves.weapon_name}">
            
            <p class="m-0 text-secondary weapon-skin-title mx-auto text-center show-hover" id="skinPaintName-${gloves.weapon_name}" style="transform: translateY(170%);"><small>${langObject.defaultSkin}</small></p>
            <p class="m-0 text-light weapon-skin-title mx-auto text-center show-hover" style="transform: translateY(170%);">${gloves.paint_name}</p>
        </a>
        <button onclick="${buttonFunc}" data-knife="${gloves.weapon_name}" class="btn btn-outline-accent-card mt-3 w-100 show-hover" style="z-index: 1; transform: translateY(150%);"><small>${buttonInner}</small></button>
        ${cardTeam}
    </div>
    `

    document.getElementById('skinsContainer').appendChild(card)  
}

window.workShopTemplate = () => {
    // clear main container
    document.getElementById('skinsContainer').innerHTML = ''
 
    document.getElementById('skinsContainer').innerHTML = `
        <div class="d-flex align-items-center justify-content-center w-100" id="scrollPosElement">
            <p class="m-0 me-2">${langObject.wait}</p>
            <div class="spinner-border spinner-border-sm" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `

    let el = document.createElement('div')
    el.classList.add('row', 'b-4')
    el.id = 'myWorkshop'

    if (document.contains(document.getElementById('workshopSearchInputDiv'))) {
        document.getElementById('workshopSearchInputDiv').remove();
    }   

    let search = document.createElement('div')
    search.classList.add('input-group', 'mb-4')
    search.id = 'workshopSearchInputDiv'
    search.innerHTML = `<input type="text" class="form-control m-0 mt-2" oninput="workshopSearch()" id="workshopSearchInput" placeholder="Search..." data-bs-theme="dark">`

    document.getElementById('skinsContainer').before(el)
    document.getElementById('myWorkshop').after(search)
}

{/* <div class="input-group input-group-md">
    <input type="text" class="form-control m-0 mt-2" oninput="updateMyWorkshopPublish('${user.id}')" id="myWorkshopName" value="${user.displayName}'s collection" data-bs-theme="dark">
</div> */}


window.workshopElement = (set_name, personaname, selected_knife, selected_gloves, agents, skins, set_id, search = false, wore) => {
    let rarities = {
        "#b0c3d9": "common",
        "#5e98d9": "uncommon",
        "#4b69ff": "rare",
        "#8847ff": "mythical",
        "#d32ce6": "legendary",
        "#eb4b4b": "ancient",
        "#e4ae39": "contraband"
    }
    
    let skinsElement = "";
    skinsObject.forEach(weapon => {
        skins.forEach(el => {
            if (getKeyByValue(weaponIds, parseInt(el[0])) == weapon.weapon.id && el[1] == weapon.paint_index) {
                
                let bgColor

                if (weapon.category.id == 'sfui_invpanel_filter_melee') { 
                    // Gold if knife
                    bgColor = 'small-card-gold'
                } else {
                    // Anything else
                    bgColor = `small-card-${rarities[weapon.rarity.color]}`
                }

                if (el[0] >= 500 && el[0] < 4725) {
                    if (getKeyByValue(weaponIds, parseInt(el[0])) == selected_knife) {
                        skinsElement += `
                            <div class="rounded-3 d-flex card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                                <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                            </div>
                        `
                    }
                } else if (el[0] >= 4725) {
                    if (el[0] == selected_gloves) {
                        skinsElement += `
                            <div class="rounded-3 d-flex card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                                <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                            </div>
                        `
                    }
                } else {
                    skinsElement += `
                        <div class="rounded-3 d-flex card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                            <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                        </div>
                    `
                }
            }
        }) 
    })

    agentsObject.forEach(agent => {
        if (agent.model ==  agents.agent_ct || agent.model ==  agents.agent_t) {
            skinsElement += `
                <div class="rounded-3 d-flex small-card-common workshop-weapon-card small-card-common m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                    <img src="${agent.image}" class="workshop-weapon-img m-auto" loading="lazy">
                </div>
            `
        }
    })


    const card = document.createElement('div')
    card.classList.add('row', 'p-0', 'px-2','mb-3', 'mx-auto')
    
    card.innerHTML = `
            <div class="col-3 bg-nav rounded-start d-flex flex-column justify-content-between">
                <div>
                    <h5 class="m-0 mt-2">${set_name}</h5>
                    <div class="d-flex justify-content-between">
                        <p class="m-0 text-secondary"><small>by ${personaname}</small></p>
                        <p class="m-0 text-secondary"><small>Wore: ${wore}</small></p>
                    </div>
                </div>
                <button class="btn btn-outline-accent mb-2" onclick="putOnWorkshop(${set_id}, ${weaponIds[selected_knife]}, '${selected_knife}', '${selected_gloves}')" data-type="putOnBtn" data-locked="true"><i class="fa-solid fa-check"></i> Put on</button>
            </div>
            <div class="col-9 border-nav rounded-end p-2 pe-0 d-flex flex-wrap align-items-center">
                ${skinsElement}
            </div>
    `

    if (search) {
        document.getElementById('skinsContainer').append(card)
    } else {
        document.getElementById('scrollPosElement').before(card)
    }
}


window.myWorkshop = (set_name, personaname, selected_knife, selected_gloves, agents, skins, set_id, wore) => {
    if (typeof skins != 'object') {
        skins = JSON.parse(skins)
    }
    

    let rarities = {
        "#b0c3d9": "common",
        "#5e98d9": "uncommon",
        "#4b69ff": "rare",
        "#8847ff": "mythical",
        "#d32ce6": "legendary",
        "#eb4b4b": "ancient",
        "#e4ae39": "contraband"
    }
    
    let skinsElement = "";
    skinsObject.forEach(weapon => {
        skins.forEach(el => {
            
            if (getKeyByValue(weaponIds, parseInt(el[0])) == weapon.weapon.id && el[1] == weapon.paint_index) {
                let bgColor

                if (weapon.category.id == 'sfui_invpanel_filter_melee') { 
                    // Gold if knife
                    bgColor = 'small-card-gold'
                } else {
                    // Anything else
                    bgColor = `small-card-${rarities[weapon.rarity.color]}`
                }
         
                if (el[0] >= 500 && el[0] < 4725) {
                    console.log(getKeyByValue(weaponIds, parseInt(el[0])), selected_knife)
                    if (getKeyByValue(weaponIds, parseInt(el[0])) == selected_knife) {
                        skinsElement += `
                            <div class="rounded-3 d-flex card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                                <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                            </div>
                        `
                    }
                } else if (el[0] >= 4725) {
                    if (el[0] == selected_gloves) {
                        skinsElement += `
                            <div class="rounded-3 d-flex card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                                <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                            </div>
                        `
                    }
                } else {
                    skinsElement += `
                        <div class="rounded-3 d-flex card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                            <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                        </div>
                    `
                }
            }
        })
    })

    agentsObject.forEach(agent => {
        if (agent.model ==  agents.agent_ct || agent.model ==  agents.agent_t) {
            skinsElement += `
                <div class="rounded-3 d-flex small-card-common workshop-weapon-card small-card-common m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                    <img src="${agent.image}" class="workshop-weapon-img m-auto" loading="lazy">
                </div>
            `
        }
    })

    const card = document.createElement('div')
    card.classList.add('row', 'p-0', 'px-2', 'mb-3', 'mx-auto')
    
    card.innerHTML = `
            <div class="col-3 bg-nav rounded-start d-flex flex-column justify-content-between">
                <div>
                    <h5 class="m-0 mt-2">${set_name}</h5>
                    <div class="d-flex justify-content-between">
                        <p class="m-0 text-secondary"><small>by ${personaname}</small></p>
                        <p class="m-0 text-secondary"><small>Wore: ${wore}</small></p>
                    </div>
                </div>
                <div class="w-100">
                    <button class="btn btn-outline-accent mb-2 w-100" onclick="putOnWorkshop(${set_id}, ${weaponIds[selected_knife]}, '${selected_knife}', '${selected_gloves}')" data-type="putOnBtn" data-locked="true"><i class="fa-solid fa-check"></i> Put on</button>
                    <button class="btn btn-outline-accent mb-2 w-100" onclick="updateWorkshop('${user.id}', '${set_id}')"><i class="fa-solid fa-rotate"></i> ${langObject.sync}</button>
                </div>
            </div>
            <div class="col-9 bg-nav border-nav rounded-end p-2 pe-0 d-flex flex-wrap align-items-center">
                ${skinsElement}
            </div>
    `

    document.getElementById('myWorkshop').innerHTML = ""
    document.getElementById('myWorkshop').prepend(card)
}

window.createWorkshop = () => {
    let rarities = {
        "#b0c3d9": "common",
        "#5e98d9": "uncommon",
        "#4b69ff": "rare",
        "#8847ff": "mythical",
        "#d32ce6": "legendary",
        "#eb4b4b": "ancient",
        "#e4ae39": "contraband"
    }
    
    let skinsElement = "";

    const card = document.createElement('div')
    card.classList.add('row', 'p-0', 'px-2','mb-4', 'mx-auto')

    skinsObject.forEach(weapon => {
        selectedSkins.forEach(el => {
            if (getKeyByValue(weaponIds, parseInt(el.weapon_defindex)) == weapon.weapon.id && el.weapon_paint_id == weapon.paint_index) {
                
                let bgColor

                if (weapon.category.id == 'sfui_invpanel_filter_melee') { 
                    // Gold if knife
                    bgColor = 'small-card-gold'
                } else {
                    // Anything else
                    bgColor = `small-card-${rarities[weapon.rarity.color]}`
                }

                if (el.weapon_defindex >= 500 && el.weapon_defindex < 4725) {
                    if (getKeyByValue(weaponIds, parseInt(el.weapon_defindex)) == selectedKnife.knife) {
                        skinsElement += `
                            <div class="rounded-3 d-flex small-card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                                <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                            </div>
                        `
                    }
                } else if (el.weapon_defindex >= 4725) {
                    if (el.weapon_defindex == selectedGloves.weapon_defindex) {
                        skinsElement += `
                            <div class="rounded-3 d-flex card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                                <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                            </div>
                        `
                    }
                } else {
                    skinsElement += `
                        <div class="rounded-3 d-flex card-common workshop-weapon-card ${bgColor} m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                            <img src="${weapon.image}" class="workshop-weapon-img m-auto" loading="lazy">
                        </div>
                    `
                }
            }
        }) 
    })

    agentsObject.forEach(agent => {
        if (agent.model == selectedAgents.agent_ct || agent.model == selectedAgents.agent_t) {
            skinsElement += `
                <div class="rounded-3 d-flex small-card-common workshop-weapon-card small-card-common m-1" style="width: 100px; height: 100px;" data-type="skinCard" data-locked="true">
                    <img src="${agent.image}" class="workshop-weapon-img m-auto" loading="lazy">
                </div>
            `
        }
    })

    card.innerHTML = `
            <div class="col-3 bg-nav rounded-start d-flex flex-column justify-content-between">
                <div>
                    <div class="input-group input-group-md">
                        <input type="text" class="form-control m-0 mt-2" oninput="updateMyWorkshopPublish('${user.id}')" id="myWorkshopName" value="${user.displayName}'s collection" data-bs-theme="dark">
                    </div>
                    <div class="d-flex justify-content-between">
                        <p class="m-0 text-secondary"><small>by ${user.displayName}</small></p>
                        <p class="m-0 text-secondary" id="createWorkshopInputCount"><small>${user.displayName.length + 13}/30</small></p>
                    </div>
                    
                </div>
                <div class="w-100">
                    <button class="btn btn-outline-accent mb-2" id="myWorkshopPublish" onclick="publishWorkshop("${user.id}")"><i class="fa-solid fa-upload"></i> ${langObject.publish}</button>
                </div>
            </div>
            <div class="col-9 bg-nav border-nav rounded-end p-2 pe-0 d-flex flex-wrap align-items-center">
                ${skinsElement}
            </div>
    `
    document.getElementById('myWorkshop').innerHTML = ''
    document.getElementById('myWorkshop').prepend(card)

    updateMyWorkshopPublish(user.id)
}

window.showAgents = (type) => {
    // Agents ignore the global team selector (they have their own CT/T side
    // buttons); re-rendering on team change is just a harmless refresh.
    window.currentViewRender = () => window.showAgents(type)
    let team = {
        'ct': 3,
        't': 2
    }

    // clear main container
    document.getElementById('skinsContainer').innerHTML = ''

    agentsObject.forEach(element => {
        if (element.team == team[type]) {
            let rarities = {
                "#b0c3d9": "common",
                "#5e98d9": "uncommon",
                "#4b69ff": "rare",
                "#8847ff": "mythical",
                "#d32ce6": "legendary",
                "#eb4b4b": "ancient",
                "#e4ae39": "contraband"
            }

            let bgColor = 'card-uncommon'
            let phase  = ''
            let active = ''
            let steamid = user.id

            // Make outline if this skin is selected
            
            if (selectedAgents.agent_t == element.model || selectedAgents.agent_ct == element.model) {
                active = 'active-card'
            }
            
            let card = document.createElement('div')
            card.classList.add('col-6', 'col-sm-4', 'col-md-3', 'p-2')

            card.innerHTML = `
                <div onclick="changeAgent(\'${steamid}\', \'${element.model}\', \'${type}\')" id="agent-${element.model}" class="weapon-card rounded-3 d-flex flex-column ${active} ${bgColor} contrast-reset pb-2" data-type="skinCard" data-btn-type="">
                    <div style="z-index: 3;" class="locked-card d-flex flex-column justify-content-center align-items-center w-100 h-100" id="">
                        <i class="fa-solid fa-lock"></i>
                        <p class="m-0">Buy Premium</p>
                    </div>
                
                    <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${element.model}">
                        <div class="spinner-border spinner-border-xl" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>

                    <img src="${element.image}" class="weapon-img mx-auto my-3" loading="lazy" width="181px" height="136px" alt=" ">
                    
                    <div class="d-flex align-items-center g-3">
                    
                    </div>
                    
                    <h5 class="weapon-skin-title text-roboto ms-3">
                        ${element.agent_name}
                    </h5>
                </div>
            `

            document.getElementById('skinsContainer').appendChild(card)
        }
    });

    // Agents are picked per team via the CT/T side buttons, so the toolbar's
    // team selector would be misleading here.
    window.mountSkinsToolbar({ noTeam: true })
}

window.showMusics = () =>{
    window.currentViewRender = window.showMusics
    // clear main container
    document.getElementById('skinsContainer').innerHTML = ''

    musicObject.forEach(element => {
        let rarities = {
            "#b0c3d9": "common",
            "#5e98d9": "uncommon",
            "#4b69ff": "rare",
            "#8847ff": "mythical",
            "#d32ce6": "legendary",
            "#eb4b4b": "ancient",
            "#e4ae39": "contraband"
        }

        let bgColor = 'card-uncommon'
        let phase  = ''
        let active = ''
        let steamid = user.id

        // Outline when equipped for the current team selection
        const st = window.itemTeamState('music', element.id)
        if (st.active) {
            active = 'active-card'
        }

        let card = document.createElement('div')
        card.classList.add('col-6', 'col-sm-4', 'col-md-3', 'p-2')

        card.innerHTML = `
            <div onclick="changeMusic(\'${steamid}\', \'${element.id}\')" id="music-${element.id}" class="weapon-card rounded-3 d-flex flex-column ${active} ${bgColor} contrast-reset pb-2" data-type="skinCard" data-btn-type="">
                ${window.teamBadgeHtml(st)}
                <div style="z-index: 3;" class="locked-card d-flex flex-column justify-content-center align-items-center w-100 h-100" id="">
                    <i class="fa-solid fa-lock"></i>
                    <p class="m-0">Buy Premium</p>
                </div>
            
                <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${element.id}">
                    <div class="spinner-border spinner-border-xl" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                </div>

                <img src="${element.image}" class="weapon-img mx-auto my-3" loading="lazy" width="181px" height="136px" alt=" ">
                
                <div class="d-flex align-items-center g-3">
                
                </div>
                
                <h5 class="weapon-skin-title text-roboto ms-3">
                    ${element.name}
                </h5>
            </div>
        `

        document.getElementById('skinsContainer').appendChild(card)
    });

    // Toolbar (incl. the team selector) so music kits can also be equipped per team.
    window.mountSkinsToolbar()
}

// ---- Loadout overview ----
// Curated "default" set (knife + gloves are added separately, first). Ordered
// so that after the per-team filter the rifles close the list: T shows
// awp, glock, deagle, ak; CT shows awp, usp, deagle and the two M4s last.
const LOADOUT_DEFAULT_GUNS = ['weapon_awp', 'weapon_glock', 'weapon_usp_silencer', 'weapon_deagle', 'weapon_ak47', 'weapon_m4a1', 'weapon_m4a1_silencer']
let loadoutShowAll = false


// ---- Card size cycler ----
// A class on #skinsContainer (cards-lg/md/sm) overrides the grid column width.
// It persists across every view because all views reuse the same container node,
// and across reloads via localStorage. No class = each view's native Bootstrap
// columns (the default until the user picks a size). Cycles big -> medium -> small.
const CARD_SIZES = ['lg', 'md', 'sm']
const CARD_SIZE_ICON = { lg: 'fa-table-cells-large', md: 'fa-table-cells', sm: 'fa-border-all' }
const getCardSize = () => {
    const s = localStorage.getItem('cardSize')
    return CARD_SIZES.includes(s) ? s : ''
}
const applyCardSize = (size) => {
    const c = document.getElementById('skinsContainer')
    if (c) {
        c.classList.remove('cards-lg', 'cards-md', 'cards-sm')
        if (size) c.classList.add('cards-' + size)
    }
    const btn = document.getElementById('cardSizeBtn')
    if (btn) btn.querySelector('i').className = 'fa-solid ' + (CARD_SIZE_ICON[size] || 'fa-table-cells')
}
window.cycleCardSize = () => {
    const cur = getCardSize()
    const next = CARD_SIZES[cur ? (CARD_SIZES.indexOf(cur) + 1) % CARD_SIZES.length : 0]
    localStorage.setItem('cardSize', next)
    applyCardSize(next)
}
// Apply any saved size as soon as the module loads.
applyCardSize(getCardSize())

// ---- Skins page toolbar: card size + elastic text search + sort ----
// mountSkinsToolbar() is called by the category/skin render functions after they
// fill #skinsContainer. It works on the rendered card elements (DOM), so it's
// agnostic to which render produced them. Search mirrors the sticker search
// (whitespace tokens, every token must appear in the card's text). Sort reorders
// the cards in place; "default" restores the original render order.
const SKIN_RARITY_RANK = { contraband: 8, gold: 7, ancient: 6, legendary: 5, mythical: 4, rare: 3, uncommon: 2, common: 1 }
const cardRarityRank = (el) => {
    for (const r in SKIN_RARITY_RANK) { if (el.querySelector('.card-' + r)) return SKIN_RARITY_RANK[r] }
    return 0
}
let skinsSearchTimer
const applySkinsFilterSort = () => {
    const container = document.getElementById('skinsContainer')
    if (!container || !container._skinCards) return
    const tokens = (document.getElementById('skinsSearch')?.value || '').toLowerCase().split(/\s+/).filter(Boolean)
    const sort = (document.getElementById('skinsSort') || {}).value || 'default'
    let shown = 0
    container._skinCards.forEach((c) => {
        const ok = tokens.every((t) => c.text.includes(t))
        c.el.style.display = ok ? '' : 'none'
        if (ok) shown++
    })
    const ordered = container._skinCards.slice()
    if (sort === 'name-asc') ordered.sort((a, b) => a.text.localeCompare(b.text))
    else if (sort === 'name-desc') ordered.sort((a, b) => b.text.localeCompare(a.text))
    else if (sort === 'rarity-desc') ordered.sort((a, b) => b.rarity - a.rarity)
    else if (sort === 'rarity-asc') ordered.sort((a, b) => a.rarity - b.rarity)
    ordered.forEach((c) => container.appendChild(c.el))
    const countEl = document.getElementById('skinsCount')
    if (countEl) countEl.innerText = String(shown)
}
window.onSkinsSearchInput = () => {
    clearTimeout(skinsSearchTimer)
    skinsSearchTimer = setTimeout(applySkinsFilterSort, 120)
}
window.onSkinsSortChange = () => applySkinsFilterSort()
window.mountSkinsToolbar = (opts) => {
    const container = document.getElementById('skinsContainer')
    if (!container) return
    const cards = Array.from(container.children).filter((c) => !c.classList.contains('skins-toolbar'))
    if (!cards.length) return
    const L = (typeof langObject !== 'undefined') ? langObject : {}
    const backBtn = (opts && opts.back)
        ? `<button type="button" class="btn btn-outline-primary btn-sm" onclick="${opts.back}" title="${L.back || 'Back'}"><i class="fa-solid fa-arrow-left me-1"></i><small>${L.back || 'Back'}</small></button>`
        : ''
    const toggleBtn = (opts && opts.toggle)
        ? `<button type="button" class="btn btn-outline-primary btn-sm${opts.toggle.active ? ' active' : ''}" onclick="${opts.toggle.onclick}"><i class="fa-solid fa-layer-group me-1"></i><small>${opts.toggle.label}</small></button>`
        : ''
    const bar = document.createElement('div')
    bar.className = 'skins-toolbar col-12 d-flex flex-wrap align-items-center gap-2 mb-3'
    bar.innerHTML = `
        ${backBtn}
        ${toggleBtn}
        <button type="button" id="cardSizeBtn" class="btn btn-outline-primary btn-sm" onclick="cycleCardSize()" title="${L.cardSize || 'Card size'}"><i class="fa-solid fa-table-cells"></i></button>
        <input type="text" id="skinsSearch" class="form-control form-control-sm" style="max-width:260px;" placeholder="${L.search || 'Search'}" oninput="onSkinsSearchInput()" data-bs-theme="dark" autocomplete="off">
        <select id="skinsSort" class="form-select form-select-sm" style="max-width:210px;" onchange="onSkinsSortChange()" data-bs-theme="dark">
            <option value="default">${L.sortDefault || 'Default order'}</option>
            <option value="name-asc">${L.sortNameAsc || 'Name (A-Z)'}</option>
            <option value="name-desc">${L.sortNameDesc || 'Name (Z-A)'}</option>
            <option value="rarity-desc">${L.sortRarityHigh || 'Rarity (high first)'}</option>
            <option value="rarity-asc">${L.sortRarityLow || 'Rarity (low first)'}</option>
        </select>
        <div class="ms-auto d-flex align-items-center gap-2">
            ${(opts && opts.noTeam) ? '' : window.teamSelectorHtml()}
            <small class="text-secondary" id="skinsCount"></small>
        </div>
    `
    container.prepend(bar)
    container._skinCards = cards.map((el) => ({ el, text: (el.textContent || '').toLowerCase().replace(/\s+/g, ' '), rarity: cardRarityRank(el) }))
    applyCardSize(getCardSize())
    applySkinsFilterSort()
}

const loadoutEsc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '&quot;')

const renderLoadoutGrid = () => {
    const findSkin = (defindex, paint) => skinsObject.find(w => weaponIds[w.weapon.id] == defindex && w.paint_index == paint)
    const defByName = (name) => defaultsObject.find(d => d.weapon_name == name)
    const defByDef = (defindex) => defaultsObject.find(d => Number(d.weapon_defindex) == Number(defindex))

    const rowForTeam = (defindex, team) =>
        (typeof selectedSkins !== 'undefined' && Array.isArray(selectedSkins))
            ? selectedSkins.find(s => s.weapon_team == team && (s.weapon_defindex == defindex || s.model_idx == defindex))
            : undefined

    // Build a card descriptor for a weapon (by weapon_name) from a specific
    // skin row (or the default weapon when row is undefined). clickOverride
    // lets knives/gloves jump to their full selector (to change the model)
    // instead of a single weapon.
    const weaponCard = (weaponName, clickOverride, row) => {
        const def = defByName(weaponName)
        if (!def) return null
        const defindex = Number(def.weapon_defindex)
        const sk = row ? findSkin(defindex, row.weapon_paint_id) : null
        const isMelee = def.weapon_type == 'sfui_invpanel_filter_melee'
        return {
            img: sk ? sk.image : def.image,
            wname: sk ? sk.weapon.name : def.paint_name,
            sname: sk ? ((typeof sk.phase !== 'undefined') ? `${sk.pattern.name} (${sk.phase})` : sk.pattern.name) : langObject.defaultSkin,
            color: sk ? (isMelee ? '#caab05' : (sk.rarity ? sk.rarity.color : '#777')) : '#3a3a3a',
            skinned: !!sk,
            st: sk ? !!sk.stattrak : false,
            paint: sk ? sk.paint_index : 0,
            weaponName: weaponName,
            click: clickOverride || `knifeSkins('${loadoutEsc(weaponName)}')`
        }
    }

    // One side's full loadout: knife, gloves, then the guns that side can buy,
    // each card showing that side's equipped skin.
    const cardsForTeam = (team) => {
        const cards = []

        const kModel = (loadoutByTeam.knife[team] || {}).knife
        const kDef = kModel ? defByName(kModel) : null
        const kCard = kDef ? weaponCard(kModel, 'showKnives()', rowForTeam(Number(kDef.weapon_defindex), team)) : null
        cards.push(kCard || { wname: langObject.sideMenu.knives, sname: langObject.defaultSkin, color: '#3a3a3a', skinned: false, icon: 'fa-khanda', click: 'showKnives()' })

        const gDefindex = (loadoutByTeam.gloves[team] || {}).weapon_defindex
        const gDef = gDefindex ? defByDef(gDefindex) : null
        const gCard = gDef ? weaponCard(gDef.weapon_name, 'showGloves()', rowForTeam(Number(gDef.weapon_defindex), team)) : null
        cards.push(gCard || { wname: langObject.sideMenu.gloves, sname: langObject.defaultSkin, color: '#3a3a3a', skinned: false, icon: 'fa-mitten', click: 'showGloves()' })

        const gunNames = (loadoutShowAll
            ? defaultsObject
                .filter(d => d.weapon_type !== 'sfui_invpanel_filter_melee' && d.weapon_type !== 'sfui_invpanel_filter_gloves')
                .map(d => d.weapon_name)
            : LOADOUT_DEFAULT_GUNS
        ).filter(n => window.weaponTeams(n).includes(team))
        gunNames.forEach(n => {
            const def = defByName(n)
            const c = def ? weaponCard(n, null, rowForTeam(Number(def.weapon_defindex), team)) : null
            if (c) cards.push(c)
        })
        return cards
    }

    const cardHtml = (c, colClass) => `
        <div class="${colClass} py-2 px-1">
            <div class="loadout-card rounded-3 h-100 d-flex flex-column p-2" style="border-top: 3px solid ${c.color};">
                ${c.skinned ? `<button class="loadout-gear" title="${langObject.change}" onclick="event.stopPropagation(); ${c.pre || ''}editModal('${loadoutEsc(c.img)}','${loadoutEsc(c.wname)}','${loadoutEsc(c.sname)}','${loadoutEsc(c.weaponName)}',${c.paint},${c.st})" data-bs-toggle="modal" data-bs-target="#patternFloat"><i class="fa-solid fa-gear"></i></button>` : ''}
                <div class="loadout-clickable d-flex flex-column flex-grow-1" onclick="${c.click}">
                    <p class="m-0 d-flex align-items-center"><small class="text-secondary text-truncate">${c.wname}</small></p>
                    <p class="m-0 text-truncate" style="color: ${c.color};"><small>${c.sname}</small></p>
                    ${c.img
                        ? `<img src="${c.img}" class="loadout-img my-2 mx-auto" loading="lazy" alt="">`
                        : `<div class="loadout-img my-2 mx-auto d-flex align-items-center justify-content-center text-secondary"><i class="fa-solid ${c.icon || 'fa-plus'} fa-2x"></i></div>`}
                </div>
            </div>
        </div>
    `

    if (getCurrentTeam() === 'both') {
        // CS2 equipment-menu style: each half shows one side's full loadout
        // (an item equipped by both sides appears on both halves).
        const gridCT = document.getElementById('loadoutGridCT')
        const gridT = document.getElementById('loadoutGridT')
        if (!gridCT || !gridT) return
        // Clicking a card in a half means "I'm editing that side": switch the
        // global selector to the half's team before navigating / opening the
        // modal, so the next page and the equips target only that side.
        const withTeamClick = (cards, team) => cards.map(c => ({
            ...c,
            pre: `setCurrentTeam('${team}'); `,
            click: `setCurrentTeam('${team}'); ${c.click}`,
        }))
        gridCT.innerHTML = withTeamClick(cardsForTeam(3), 3).map(c => cardHtml(c, 'col-6 col-xl-4')).join('')
        gridT.innerHTML = withTeamClick(cardsForTeam(2), 2).map(c => cardHtml(c, 'col-6 col-xl-4')).join('')
    } else {
        const grid = document.getElementById('loadoutGrid')
        if (!grid) return
        grid.innerHTML = cardsForTeam(Number(getCurrentTeam()))
            .map(c => cardHtml(c, 'col-6 col-sm-4 col-md-3 col-lg-2')).join('')
    }
}

window.toggleLoadoutMode = () => {
    loadoutShowAll = document.getElementById('loadoutToggle').checked
    // Label is static ("Show all"): unchecked = default loadout, checked = all
    // weapons. Describing the action (not the current state) avoids the toggle
    // reading like "click to show default" when default is already shown.
    renderLoadoutGrid()
}

// Tall vertical panel with the equipped agent for one side, CS2 equipment-menu
// style: CT flanks the gun grid on the left, T on the right. Clicking opens
// the matching agents page.
const loadoutAgentPanel = (teamKey) => {
    const model = (typeof selectedAgents !== 'undefined') ? selectedAgents['agent_' + teamKey] : null
    const agent = model ? agentsObject.find(a => a.model == model) : null
    const click = teamKey === 'ct' ? 'showCTAgents()' : 'showTAgents()'
    const label = teamKey === 'ct'
        ? (langObject.sideMenu.ctAgents || 'CT Agents')
        : (langObject.sideMenu.tAgents || 'T Agents')
    const name = agent ? agent.agent_name : (langObject.defaultSkin || 'Default')
    const img = agent
        ? `<img src="${agent.image}" class="loadout-agent-img mx-auto" loading="lazy" alt="">`
        : `<div class="loadout-agent-img d-flex align-items-center justify-content-center text-secondary"><i class="fa-solid fa-person-rifle fa-3x"></i></div>`
    return `
        <div class="loadout-agent-card loadout-agent-${teamKey} rounded-3 d-flex flex-column p-2" onclick="${click}" title="${label}">
            <p class="m-0 d-flex align-items-center"><span class="team-tag me-1 flex-shrink-0"><img src="icons/team_${teamKey}.png" alt="${teamKey.toUpperCase()}"></span><small class="text-secondary text-truncate">${name}</small></p>
            ${img}
        </div>`
}

window.showLoadout = () => {
    window.currentViewRender = window.showLoadout
    window.sideBtnHandler('sideBtnLoadout')
    const container = document.getElementById('skinsContainer')
    if (!container) return
    const team = getCurrentTeam()
    // In 'both' mode the page splits CS2-style: CT half | divider | T half.
    // The agent panel lives INSIDE its half, under the same header and with the
    // grid cards' vertical padding (py-2), so its top lines up with the cards.
    const agentCol = (teamKey) => `<div class="loadout-agent-panel d-none d-md-block py-2">${loadoutAgentPanel(teamKey)}</div>`
    const half = (teamKey, gridId, agentFirst) => `
        <div class="flex-grow-1" style="min-width: 0;">
            <div class="d-flex align-items-center gap-1 mb-1 ps-2"><span class="team-tag"><img src="icons/team_${teamKey}.png" alt=""></span><small class="text-secondary">${teamKey.toUpperCase()}</small></div>
            <div class="d-flex gap-3 align-items-start">
                ${agentFirst ? agentCol(teamKey) : ''}
                <div class="flex-grow-1" style="min-width: 0;">
                    <div class="row" id="${gridId}"></div>
                </div>
                ${agentFirst ? '' : agentCol(teamKey)}
            </div>
        </div>`
    const middle = team === 'both'
        ? `
            ${half('ct', 'loadoutGridCT', true)}
            <div class="loadout-divider d-none d-sm-block"></div>
            ${half('t', 'loadoutGridT', false)}`
        : `
            <div class="flex-grow-1" style="min-width: 0;">
                <div class="row" id="loadoutGrid"></div>
            </div>`
    const showCT = team === '3'
    const showT = team === '2'
    container.innerHTML = `
        <div class="col-12 d-flex justify-content-between align-items-center mb-2 flex-wrap">
            <h3 class="m-0">${langObject.loadoutTitle || 'Loadout'}</h3>
            <div class="d-flex align-items-center gap-3">
                <button type="button" class="btn btn-outline-primary btn-sm d-flex align-items-center" onclick="openShareModal()" title="${langObject.shareBtn || 'Import / Export'}"><i class="fa-solid fa-share-nodes me-1"></i><small>${langObject.shareBtn || 'Import / Export'}</small></button>
                ${window.teamSelectorHtml()}
                <button type="button" id="cardSizeBtn" class="btn btn-outline-primary btn-sm" onclick="cycleCardSize()" title="${langObject.cardSize || 'Card size'}"><i class="fa-solid fa-table-cells"></i></button>
                <div class="form-check form-switch m-0 d-flex align-items-center" data-bs-theme="dark">
                    <input class="form-check-input me-2" type="checkbox" role="switch" id="loadoutToggle" ${loadoutShowAll ? 'checked' : ''} onchange="toggleLoadoutMode()">
                    <label class="form-check-label" for="loadoutToggle" id="loadoutToggleLabel">${langObject.loadoutShowAll || 'Show all'}</label>
                </div>
            </div>
        </div>
        <div class="col-12">
            <div class="d-flex gap-3 align-items-start">
                ${showCT ? agentCol('ct') : ''}
                ${middle}
                ${showT ? agentCol('t') : ''}
            </div>
        </div>
    `
    renderLoadoutGrid()
    applyCardSize(getCardSize())
}

// Show the loadout as the landing screen once the data is ready.
if (typeof user !== 'undefined') {
    showLoadout()
}