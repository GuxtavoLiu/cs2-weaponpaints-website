async function getCachedOrFetch(url, storageKey) {
  const cachedData = localStorage.getItem(storageKey);
  if (cachedData) {
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      console.error("Error parsing JSON from localStorage", e);
    }
  }

  const response = await fetch(url);
  const data = await response.json();
  // Caching is best-effort: the skins blob is ~5MB and can blow the localStorage
  // quota, so never let a failed write break rendering — just skip the cache.
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (e) {
    console.warn("Skipping localStorage cache for", storageKey, e && e.name);
  }
  return data;
}

// Drop the pre-fix skin cache (images pointed at a dead CDN path). Bumping the
// skins cache key below forces a refetch; this also frees the stale ~5MB blob so
// the new entry doesn't trip the quota.
["en", "pt-BR", "ru", "zh-CN"].forEach((l) => localStorage.removeItem(`${l}-skins`));

export let skinsObject = await getCachedOrFetch(
  `/js/json/skins/${lang}-skins.json`,
  `${lang}-skins-v2`
);
export let defaultsObject = await getCachedOrFetch(
  `/js/json/defaults/${lang}-defaults.json`,
  `${lang}-defaults`
);
export let agentsObject = await getCachedOrFetch(
  `/js/json/skins/${lang}-agents.json`,
  `${lang}-agents`
);
export let musicObject = await getCachedOrFetch(
  `/js/json/skins/${lang}-music.json`,
  `${lang}-music`
);


const sideBtnHandler = (activeBtn) => {
  // remove active background
  let allBtns = [
    "sideBtnLoadout",
    "sideBtnKnives",
    "sideBtnGloves",
    "sideBtnMusics",
    "sideBtnPistols",
    "sideBtnRifles",
    "sideBtnPPs",
    "sideBtnShotguns",
    "sideBtnUtility",
    "sideBtnCTAgents",
    "sideBtnTAgents",
  ];

  allBtns.forEach((element) => {
    let elms = document.querySelectorAll(`[id='${element}']`);

    for (var i = 0; i < elms.length; i++)
      elms[i].classList.remove("active-side");
  });
  document.getElementById("sideBtnKnives").classList.remove("active-side");
  document.getElementById("sideBtnGloves").classList.remove("active-side");
  document.getElementById("sideBtnMusics").classList.remove("active-side");
  document.getElementById("sideBtnPistols").classList.remove("active-side");
  document.getElementById("sideBtnRifles").classList.remove("active-side");
  document.getElementById("sideBtnPPs").classList.remove("active-side");
  document.getElementById("sideBtnShotguns").classList.remove("active-side");
  document.getElementById("sideBtnUtility").classList.remove("active-side");

  // add active background
  let elms = document.querySelectorAll(`[id='${activeBtn}']`);

  for (var i = 0; i < elms.length; i++) elms[i].classList.add("active-side");
};
// showLoadout lives in templates.js but highlights its side button too.
window.sideBtnHandler = sideBtnHandler;

const showDefaults = (type, toolbarOpts) => {
  // clear main container
  document.getElementById("skinsContainer").innerHTML = "";

  if (type == "sfui_invpanel_filter_melee") {
    defaultsObject.forEach((knife) => {
      if (knife.weapon_type == "sfui_invpanel_filter_melee") {
        const skinWeapon = window.skinRowFor(weaponIds[knife.weapon_name]);

        if (typeof skinWeapon != "undefined") {
          changeKnifeSkinTemplate(knife, langObject, selectedKnife);
          changeSkinCard(knife, skinWeapon);
        } else {
          knivesTemplate(knife, langObject, selectedKnife);
        }
      }
    });
  } else if (type == "sfui_invpanel_filter_gloves") {
    defaultsObject.forEach((glove) => {
      if (glove.weapon_type == "sfui_invpanel_filter_gloves") {
        const skinWeapon = window.skinRowFor(weaponIds[glove.weapon_name]);

        if (typeof skinWeapon != "undefined") {
          changeGlovesSkinTemplate(glove, langObject, selectedGloves);
          changeSkinCard(glove, skinWeapon);
        } else {
          glovesTemplate(glove, langObject, selectedGloves);
        }
      }
    });
  } else {
    defaultsObject.forEach((weapon) => {
      if (weapon.weapon_type == type) {
        const skinWeapon = window.skinRowFor(weaponIds[weapon.weapon_name]);

        if (typeof skinWeapon != "undefined") {
          changeSkinTemplate(weapon, langObject, selectedKnife);
          changeSkinCard(weapon, skinWeapon);
        } else {
          defaultsTemplate(weapon, langObject, lang);
        }
      }
    });
  }
  window.mountSkinsToolbar(toolbarOpts);
};

// Each view registers itself in window.currentViewRender so the global team
// selector (teamState.js) can re-render whatever is open when the team changes.
const showKnives = () => {
  window.currentViewRender = showKnives;
  sideBtnHandler("sideBtnKnives");
  showDefaults("sfui_invpanel_filter_melee");
};

const showGloves = () => {
  window.currentViewRender = showGloves;
  sideBtnHandler("sideBtnGloves");
  showDefaults("sfui_invpanel_filter_gloves", {
    toggle: {
      label: langObject.showAll || "Show all",
      onclick: "showAllGloves()",
      active: false,
    },
  });
};

const showMusics = () => {
  window.currentViewRender = showMusics;
  sideBtnHandler("sideBtnMusics");
  //showMusic();
};

const showPistols = () => {
  window.currentViewRender = showPistols;
  sideBtnHandler("sideBtnPistols");
  showDefaults("csgo_inventory_weapon_category_pistols");
};

const showRifles = () => {
  window.currentViewRender = showRifles;
  sideBtnHandler("sideBtnRifles");
  showDefaults("csgo_inventory_weapon_category_rifles");
};

const showSniperRifles = () => {
  window.currentViewRender = showSniperRifles;
  sideBtnHandler("sideBtnSniperRifles");
  showDefaults("csgo_inventory_weapon_category_rifles");
};

const showPPs = () => {
  window.currentViewRender = showPPs;
  sideBtnHandler("sideBtnPPs");
  showDefaults("csgo_inventory_weapon_category_smgs");
};

const showShotguns = () => {
  window.currentViewRender = showShotguns;
  sideBtnHandler("sideBtnShotguns");
  showDefaults("csgo_inventory_weapon_category_heavy");
};

const showP = () => {
  window.currentViewRender = showP;
  sideBtnHandler("sideBtnP");
  showDefaults("csgo_inventory_weapon_category_heavy");
};

const showUtility = () => {
  window.currentViewRender = showUtility;
  sideBtnHandler("sideBtnUtility");
  showDefaults("csgo_inventory_weapon_category_utility");
};

// Agent views ignore the team selector by design (they have their own CT/T
// side buttons); re-rendering them on team change is just a harmless refresh.
const showCTAgents = () => {
  window.currentViewRender = showCTAgents;
  sideBtnHandler("sideBtnCTAgents");
  showAgents("ct");
};

const showTAgents = () => {
  window.currentViewRender = showTAgents;
  sideBtnHandler("sideBtnTAgents");
  showAgents("t");
};

const showWorkshop = () => {
  sideBtnHandler("sideBtnWorkshop");
  workShopTemplate();
  socket.emit("get-workshop", { i: workshopAmount, steamid: user.id });
  socket.emit("get-my-workshop", { steamid: user.id });
  workshopAmount += 10;
  found = true;
};

window.showKnives = showKnives;
window.showGloves = showGloves;
window.showMusics = showMusics;
window.showPistols = showPistols;
window.showRifles = showRifles;
window.showSniperRifles = showSniperRifles;
window.showPPs = showPPs;
window.showShotguns = showShotguns;
window.showP = showP;
window.showUtility = showUtility;
window.showCTAgents = showCTAgents;
window.showTAgents = showTAgents;
window.showWorkshop = showWorkshop;

const sideBtns = document.querySelectorAll('[data-type="sideBtn"]');
sideBtns.forEach((btn) => {
  let attribute = btn.getAttribute("data-btn-type");
  switch (attribute) {
    case "knives":
      btn.addEventListener("click", showKnives);
      break;
    case "gloves":
      btn.addEventListener("click", showGloves);
      break;
    case "musics":
      btn.addEventListener("click", showMusics);
      break;
    case "pistols":
      btn.addEventListener("click", showPistols);
      break;
    case "rifles":
      btn.addEventListener("click", showRifles);
      break;
    case "smgs":
      btn.addEventListener("click", showPPs);
      break;
    case "heavy":
      btn.addEventListener("click", showP);
      break;
    case "utlility":
      btn.addEventListener("click", showUtility);
      break;
    case "ctAgents":
      btn.addEventListener("click", showCTAgents);
      break;
    case "tAgents":
      btn.addEventListener("click", showTAgents);
      break;
    default:
      break;
  }
});

window.changeKnife = (weaponid) => {
  socket.emit("change-knife", {
    weaponid: weaponid,
    steamUserId: user.id,
    team: getWriteTeam(),
  });
  document.getElementById(`loading-${weaponid}`).style.visibility = "visible";
  document.getElementById(`loading-${weaponid}`).style.opacity = 1;
};

window.changeGlove = (weaponid) => {
  socket.emit("change-glove", {
    weaponid: weaponIds[weaponid],
    steamUserId: user.id,
    team: getWriteTeam(),
  });
  document.getElementById(`loading-${weaponid}`).style.visibility = "visible";
  document.getElementById(`loading-${weaponid}`).style.opacity = 1;
};

window.changeSkin = (steamid, weaponid, paintid) => {
  socket.emit("change-skin", {
    steamid: steamid,
    weaponid: weaponid,
    paintid: paintid,
    team: writeTeamForWeapon(getKeyByValue(weaponIds, weaponid)),
  });
  document.getElementById(`loading-${weaponid}-${paintid}`).style.visibility =
    "visible";
  document.getElementById(`loading-${weaponid}-${paintid}`).style.opacity = 1;
};

window.changeAgent = (steamid, model, team) => {
  console.log(steamid, model, team);
  socket.emit("change-agent", { steamid: steamid, model: model, team: team });
  document.getElementById(`loading-${model}`).style.visibility = "visible";
  document.getElementById(`loading-${model}`).style.opacity = 1;
};

window.changeMusic = (steamid, id) => {
  console.log(steamid, id);
  socket.emit("change-music", { steamid: steamid, id: id, team: getWriteTeam() });
  document.getElementById(`loading-${id}`).style.visibility = "visible";
  document.getElementById(`loading-${id}`).style.opacity = 1;
};

window.resetSkin = (weaponid, steamid) => {
  console.log(steamid, weaponid);
  socket.emit("reset-skin", {
    steamid: user.id,
    weaponid: weaponid,
    team: writeTeamForWeapon(getKeyByValue(weaponIds, weaponid)),
  });
};

socket.on("skin-reset", (data) => {
  console.log(data);

  const weapon_name = getKeyByValue(weaponIds, data.weaponid);

  document.getElementById(`img-${weapon_name}`).src = document.getElementById(
    `img-${weapon_name}`
  ).alt;
  document.getElementById(`img-${weapon_name}`).style.filter = "";
  document.getElementById(`reset-${weapon_name}`).outerHTML = "";
  document.getElementById(
    `skinPaintName-${weapon_name}`
  ).innerHTML = `<small>${langObject.defaultSkin}</small>`;

  // The server returns the fresh rows: the reset may have deleted only one
  // team's row, so a local "drop every row with this defindex" would also
  // discard the surviving team's skin. Legacy fallback for old payloads.
  if (Array.isArray(data.newSkins)) {
    selectedSkins = data.newSkins;
  } else {
    selectedSkins = selectedSkins.filter(
      (element) => element.weapon_defindex != data.weaponid
    );
  }
});

socket.on("knife-changed", (data) => {
  let elms = document.getElementsByClassName("weapon_knife");

  for (var i = 0; i < elms.length; i++) {
    elms[i].classList.remove("active-card");
    const button = elms[i].querySelectorAll("button");
    button[
      button.length - 1
    ].innerHTML = `<small>${langObject.setWeapon}</small>`;
    button[button.length - 1].onclick = function () {
      changeKnife(`${button[button.length - 1].getAttribute("data-knife")}`);
    };
  }

  (data.teams || [2, 3]).forEach((t) => {
    loadoutByTeam.knife[t] = {
      ...(loadoutByTeam.knife[t] || {}),
      steamid: user.id,
      weapon_team: t,
      knife: data.knife,
    };
  });
  syncDerivedSelection();
  // Divergence badges only render in 'both' mode, and a 'both' equip leaves no
  // diverging knife behind, so clearing them all is exact.
  document.querySelectorAll("#skinsContainer .team-badge").forEach((b) => b.remove());

  document.getElementById(data.knife).classList.add("active-card");
  const button = document.getElementById(data.knife).querySelectorAll("button");
  button[
    button.length - 1
  ].innerHTML = `<small>${langObject.changeSkin}</small>`;
  button[button.length - 1].onclick = function () {
    knifeSkins(`${data.knife}`);
  };
  document.getElementById(`loading-${data.knife}`).style.opacity = 0;
  document.getElementById(`loading-${data.knife}`).style.visibility = "hidden";
});

socket.on("glove-changed", (data) => {
  let elms = document.getElementsByClassName("weapon_knife");

  for (var i = 0; i < elms.length; i++) {
    elms[i].classList.remove("active-card");
    const button = elms[i].querySelectorAll("button");
    button[
      button.length - 1
    ].innerHTML = `<small>${langObject.setWeapon}</small>`;
    button[button.length - 1].onclick = function () {
      changeGlove(`${button[button.length - 1].getAttribute("data-knife")}`);
    };
  }

  const gloves = getKeyByValue(weaponIds, data.knife);

  (data.teams || [2, 3]).forEach((t) => {
    loadoutByTeam.gloves[t] = {
      ...(loadoutByTeam.gloves[t] || {}),
      steamid: user.id,
      weapon_team: t,
      weapon_defindex: data.knife,
    };
  });
  syncDerivedSelection();
  document.querySelectorAll("#skinsContainer .team-badge").forEach((b) => b.remove());

  document.getElementById(gloves).classList.add("active-card");
  const button = document.getElementById(gloves).querySelectorAll("button");
  button[
    button.length - 1
  ].innerHTML = `<small>${langObject.changeSkin}</small>`;
  button[button.length - 1].onclick = function () {
    knifeSkins(`${gloves}`);
  };
  document.getElementById(`loading-${gloves}`).style.opacity = 0;
  document.getElementById(`loading-${gloves}`).style.visibility = "hidden";
});

socket.on("skin-changed", (data) => {
  let elms = document.getElementsByClassName("weapon-card");

  for (var i = 0; i < elms.length; i++) {
    elms[i].classList.remove("active-card");
  }

  selectedSkins = data.newSkins;

  // In 'both' mode the equip covered both teams, so this weapon can't have a
  // diverging paint anymore; drop its badges (other weapons keep theirs).
  document
    .querySelectorAll(`[id^="weapon-${data.weaponid}-"] .team-badge`)
    .forEach((b) => b.remove());

  document
    .getElementById(`weapon-${data.weaponid}-${data.paintid}`)
    .classList.add("active-card");
  document.getElementById(
    `loading-${data.weaponid}-${data.paintid}`
  ).style.opacity = 0;
  document.getElementById(
    `loading-${data.weaponid}-${data.paintid}`
  ).style.visibility = "hidden";
});

socket.on("agent-changed", (data) => {
  let elms = document.getElementsByClassName("weapon-card");

  for (var i = 0; i < elms.length; i++) {
    elms[i].classList.remove("active-card");
  }

  selectedAgents = data.agents[0];

  document
    .getElementById(`agent-${data.currentAgent}`)
    .classList.add("active-card");
  document.getElementById(`loading-${data.currentAgent}`).style.opacity = 0;
  document.getElementById(`loading-${data.currentAgent}`).style.visibility =
    "hidden";
});

socket.on("music-changed", (data) => {
  let elms = document.getElementsByClassName("weapon-card");

  for (var i = 0; i < elms.length; i++) {
    elms[i].classList.remove("active-card");
  }

  (data.teams || [2, 3]).forEach((t) => {
    loadoutByTeam.music[t] = {
      ...(loadoutByTeam.music[t] || {}),
      steamid: user.id,
      weapon_team: t,
      music_id: data.music,
    };
  });
  syncDerivedSelection();
  document.querySelectorAll("#skinsContainer .team-badge").forEach((b) => b.remove());

  document
    .getElementById(`music-${data.music}`)
    .classList.add("active-card");
  document.getElementById(`loading-${data.music}`).style.opacity = 0;
  document.getElementById(`loading-${data.music}`).style.visibility =
    "hidden";
});

// Maps a weapon_type from defaultsObject to the side-menu function that renders
// its category list, so the skins view can offer a "back" button.
const CATEGORY_SHOW_FN = {
  sfui_invpanel_filter_melee: "showKnives()",
  sfui_invpanel_filter_gloves: "showGloves()",
  csgo_inventory_weapon_category_pistols: "showPistols()",
  csgo_inventory_weapon_category_rifles: "showRifles()",
  csgo_inventory_weapon_category_smgs: "showPPs()",
  csgo_inventory_weapon_category_heavy: "showShotguns()",
  csgo_inventory_weapon_category_utility: "showUtility()",
};

window.knifeSkins = (knifeType) => {
  window.currentViewRender = () => knifeSkins(knifeType);
  // clear main container
  document.getElementById("skinsContainer").innerHTML = "";

  const weaponDef = defaultsObject.find((d) => d.weapon_name == knifeType);
  const backTo = weaponDef ? CATEGORY_SHOW_FN[weaponDef.weapon_type] : null;

  skinsObject.forEach((element) => {
    if (element.weapon.id == knifeType) {
      document
        .getElementById("skinsContainer")
        .appendChild(buildSkinCard(element));
    }
  });
  // A team-exclusive gun ignores the team selector (equips always target its
  // own side), so the toolbar hides it on this grid.
  window.mountSkinsToolbar({
    ...(backTo ? { back: backTo } : {}),
    noTeam: window.weaponTeams(knifeType).length === 1,
  });
};

// Builds one skin card. Shared by the per-type view (knifeSkins) and the
// all-gloves view (showAllGloves).
const buildSkinCard = (element) => {
  let rarities = {
    "#b0c3d9": "common",
    "#5e98d9": "uncommon",
    "#4b69ff": "rare",
    "#8847ff": "mythical",
    "#d32ce6": "legendary",
    "#eb4b4b": "ancient",
    "#e4ae39": "contraband",
  };

  let bgColor = "card-uncommon";
  let phase = "";
  let active = "";

  // Get color of item for card
  if (element.category.id == "sfui_invpanel_filter_melee") {
    // Gold if knife
    bgColor = "card-gold";
  } else {
    // Anything else
    bgColor = `card-${rarities[element.rarity.color]}`;
  }

  // Phase for Dopplers
  if (typeof element.phase != "undefined") {
    phase = `(${element.phase})`;
  }

  // Outline when equipped for the current team selection ('both': active only
  // when both teams have it; a T/CT corner badge when only one does).
  const st = window.skinTeamState(
    weaponIds[element.weapon.id],
    element.paint_index,
    element.weapon.id
  );
  if (st.active) active = "active-card";
  const badge = window.teamBadgeHtml(st);

  let card = document.createElement("div");
  card.classList.add("col-6", "col-sm-4", "col-md-3", "p-2");

  card.innerHTML = `
                <div onclick="changeSkin(\'${user.id}\', \'${weaponIds[element.weapon.id]}\', ${element.paint_index})" id="weapon-${weaponIds[element.weapon.id]}-${element.paint_index}" class="weapon-card rounded-3 d-flex flex-column ${active} ${bgColor} contrast-reset pb-2" data-type="skinCard" data-btn-type="${weaponIds[element.weapon.id]}-${element.paint_index}">
                    ${badge}
                    <div style="z-index: 3;" class="locked-card d-flex flex-column justify-content-center align-items-center w-100 h-100" id="locked-${weaponIds[element.weapon.id]}-${element.paint_index}">
                        <i class="fa-solid fa-lock"></i>
                        <p class="m-0">Buy Premium</p>
                    </div>


                    <div style="z-index: 3;" class="loading-card d-flex justify-content-center align-items-center w-100 h-100" id="loading-${weaponIds[element.weapon.id]}-${element.paint_index}">
                        <div class="spinner-border spinner-border-xl" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                    </div>

                    <button onclick="editModal(\'${element.image}\', \'${element.weapon.name}\', \'${element.pattern.name} ${phase}\', \'${element.weapon.id}\' , \'${element.paint_index}\', ${!!element.stattrak})" style="z-index: 3;" class="settings d-flex justify-content-center align-items-center bg-light text-dark rounded-circle" data-bs-toggle="modal" data-bs-target="#patternFloat">
                        <i class="fa-solid fa-gear"></i>
                    </button>

                    <img src="${element.image}" class="weapon-img mx-auto my-3" loading="lazy" width="181px" height="136px" alt="${element.name}">

                    <div class="d-flex align-items-center g-3">
                        <p class="m-0 ms-3 text-secondary">
                            <small class="text-roboto">
                                ${element.weapon.name}
                            </small>
                        </p>
                        <div class="skin-dot mx-2"></div>
                    </div>

                    <h5 class="weapon-skin-title text-roboto ms-3">
                        ${element.pattern.name} ${phase}
                    </h5>
                </div>
            `;

  return card;
};

// "Show all" gloves: every glove skin from every glove type in a single grid,
// ordered by glove type then skin name. Toggled from the gloves toolbar.
window.showAllGloves = () => {
  window.currentViewRender = window.showAllGloves;
  sideBtnHandler("sideBtnGloves");
  document.getElementById("skinsContainer").innerHTML = "";

  skinsObject
    .filter((el) => el.category.id == "sfui_invpanel_filter_gloves")
    .sort(
      (a, b) =>
        a.weapon.name.localeCompare(b.weapon.name) ||
        a.pattern.name.localeCompare(b.pattern.name)
    )
    .forEach((el) =>
      document.getElementById("skinsContainer").appendChild(buildSkinCard(el))
    );

  window.mountSkinsToolbar({
    toggle: {
      label: langObject.showAll || "Show all",
      onclick: "showGloves()",
      active: true,
    },
  });
};
