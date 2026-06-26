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

// Drop stale skin caches so clients refetch the updated blob. The key is bumped
// whenever the bundled skins change (v2 = dead-CDN image fix; v3 = +330 skins
// added, incl. the missing Zeus x27 finishes). Removing the old keys also frees
// their ~5MB blobs so the new entry doesn't trip the localStorage quota.
["en", "pt-BR", "ru", "zh-CN"].forEach((l) => {
  localStorage.removeItem(`${l}-skins`);
  localStorage.removeItem(`${l}-skins-v2`);
});

export let skinsObject = await getCachedOrFetch(
  `/js/json/skins/${lang}-skins.json`,
  `${lang}-skins-v3`
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
    "sideBtnSearch",
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
  // Utility holds a single weapon (the Zeus), so skip the weapon-model step and
  // show its skins directly - otherwise the tab looks like it has one Zeus skin
  // until you click the model card. knifeSkins sets currentViewRender itself.
  sideBtnHandler("sideBtnUtility");
  knifeSkins("weapon_taser");
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

// team (optional): explicit 'both' | 2 | 3 from a per-card icon. When omitted,
// falls back to the global selector (writeTeamForWeapon / getWriteTeam), so the
// card-body quick-equip path is unchanged.
window.changeKnife = (weaponid, team) => {
  socket.emit("change-knife", {
    weaponid: weaponid,
    steamUserId: user.id,
    team: team !== undefined ? team : getWriteTeam(),
  });
  document.getElementById(`loading-${weaponid}`).style.visibility = "visible";
  document.getElementById(`loading-${weaponid}`).style.opacity = 1;
};

window.changeGlove = (weaponid, team) => {
  socket.emit("change-glove", {
    weaponid: weaponIds[weaponid],
    steamUserId: user.id,
    team: team !== undefined ? team : getWriteTeam(),
  });
  document.getElementById(`loading-${weaponid}`).style.visibility = "visible";
  document.getElementById(`loading-${weaponid}`).style.opacity = 1;
};

window.changeSkin = (steamid, weaponid, paintid, team) => {
  const resolvedTeam =
    team !== undefined ? team : writeTeamForWeapon(getKeyByValue(weaponIds, weaponid));
  socket.emit("change-skin", {
    steamid: steamid,
    weaponid: weaponid,
    paintid: paintid,
    team: resolvedTeam,
  });
  // Gloves: a glove skin only renders in game when the matching glove MODEL is
  // equipped in wp_player_gloves. The skin grid card only saved the paint, so
  // the equipped model stayed on the previous glove and the pick never showed.
  // Glove defindexes start at 4725 (knives/guns are all below it), so also equip
  // the glove model for the same team(s) when the clicked skin is a glove.
  if (Number(weaponid) >= 4725) {
    socket.emit("change-glove", {
      weaponid: Number(weaponid),
      steamUserId: user.id,
      team: resolvedTeam,
    });
  }
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
  window.refreshAfterChange();
  window.showToast?.(langObject.toastReset || "Skin reset");
});

socket.on("knife-changed", (data) => {
  // Write the equipped knife for the team(s) this change covered, leaving the
  // other side's knife untouched (per-team divergence).
  (data.teams || [2, 3]).forEach((t) => {
    loadoutByTeam.knife[t] = {
      ...(loadoutByTeam.knife[t] || {}),
      steamid: user.id,
      weapon_team: t,
      knife: data.knife,
    };
  });
  syncDerivedSelection();
  window.refreshAfterChange();
  const load = document.getElementById(`loading-${data.knife}`);
  if (load) {
    load.style.opacity = 0;
    load.style.visibility = "hidden";
  }
  window.showToast?.(langObject.toastSaved || "Saved");
});

socket.on("glove-changed", (data) => {
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
  window.refreshAfterChange();
  const load = gloves && document.getElementById(`loading-${gloves}`);
  if (load) {
    load.style.opacity = 0;
    load.style.visibility = "hidden";
  }
  window.showToast?.(langObject.toastSaved || "Saved");
});

socket.on("skin-changed", (data) => {
  selectedSkins = data.newSkins;
  window.refreshAfterChange();
  const load = document.getElementById(`loading-${data.weaponid}-${data.paintid}`);
  if (load) {
    load.style.opacity = 0;
    load.style.visibility = "hidden";
  }
  window.showToast?.(langObject.toastSaved || "Saved");
});

socket.on("agent-changed", (data) => {
  selectedAgents = data.agents[0];

  // Update the active card only when the agents grid is the open view; on any
  // other view (e.g. the loadout overview during an import) the card doesn't
  // exist, so guard the lookups instead of dereferencing null.
  const card = document.getElementById(`agent-${data.currentAgent}`);
  if (card) {
    document
      .querySelectorAll(".weapon-card")
      .forEach((e) => e.classList.remove("active-card"));
    card.classList.add("active-card");
  } else if (window.currentViewRender === window.showLoadout) {
    window.currentViewRender();
  }
  const load = document.getElementById(`loading-${data.currentAgent}`);
  if (load) {
    load.style.opacity = 0;
    load.style.visibility = "hidden";
  }
  window.showToast?.(langObject.toastSaved || "Saved");
});

socket.on("music-changed", (data) => {
  (data.teams || [2, 3]).forEach((t) => {
    loadoutByTeam.music[t] = {
      ...(loadoutByTeam.music[t] || {}),
      steamid: user.id,
      weapon_team: t,
      music_id: data.music,
    };
  });
  syncDerivedSelection();

  // Update the active card only when the music grid is the open view; on any
  // other view the card doesn't exist, so guard the lookups (an import applies
  // music while a different view, e.g. the loadout, is shown).
  const card = document.getElementById(`music-${data.music}`);
  if (card) {
    document
      .querySelectorAll(".weapon-card")
      .forEach((e) => e.classList.remove("active-card"));
    document
      .querySelectorAll("#skinsContainer .team-badge")
      .forEach((b) => b.remove());
    card.classList.add("active-card");
  } else if (window.currentViewRender === window.showLoadout) {
    window.currentViewRender();
  }
  const load = document.getElementById(`loading-${data.music}`);
  if (load) {
    load.style.opacity = 0;
    load.style.visibility = "hidden";
  }
  window.showToast?.(langObject.toastSaved || "Saved");
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
  // utility intentionally omitted: showUtility renders the Zeus skins directly,
  // so there's no weapon-model view to go "back" to.
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

  // Minimalist per-card CT/T selector pinned to the card bottom. FRONTEND ONLY
  // for now: clicking just moves the highlight within the card (mockCardTeam),
  // it doesn't equip per team yet. Wiring it to a real per-team equip is the
  // remaining backend step. Team-exclusive guns show a static locked badge.
  const cardTeam = cardTeamSelectorHtml({
    kind: "skin",
    weaponName: element.weapon.id,
    weaponid: weaponIds[element.weapon.id],
    paintid: element.paint_index,
  });

  card.innerHTML = `
                <div onclick="changeSkin(\'${user.id}\', \'${weaponIds[element.weapon.id]}\', ${element.paint_index})" id="weapon-${weaponIds[element.weapon.id]}-${element.paint_index}" class="weapon-card has-card-team rounded-3 d-flex flex-column ${active} ${bgColor} contrast-reset pb-2" data-type="skinCard" data-btn-type="${weaponIds[element.weapon.id]}-${element.paint_index}">
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

                    ${cardTeam}
                </div>
            `;

  return card;
};

// Build the per-card team control: bare Both / T / CT icons, each highlighted
// when that side currently has THIS item equipped (real loadout state, not the
// global mode). Clicking a side equips this item for it; Both equips both.
// Team-exclusive guns (AK/Glock = T, M4/USP = CT) show their single icon (lit
// when equipped), letting the card-body click handle the equip.
// descriptor: { kind:'skin'|'knife'|'gloves', weaponName, weaponid, paintid }
const cardTeamSelectorHtml = (descriptor) => {
  const { kind, weaponName } = descriptor;
  const teams =
    typeof window.weaponTeams === "function" ? window.weaponTeams(weaponName) : [2, 3];

  // Sides that currently have this exact item equipped.
  let equipped = [];
  if (kind === "skin" && typeof window.skinTeamsEquipped === "function") {
    equipped = window.skinTeamsEquipped(descriptor.weaponid, descriptor.paintid, weaponName);
  } else if (kind === "knife" && typeof window.itemTeamsEquipped === "function") {
    equipped = window.itemTeamsEquipped("knife", weaponName);
  } else if (kind === "gloves" && typeof window.itemTeamsEquipped === "function") {
    equipped = window.itemTeamsEquipped("gloves", descriptor.weaponid);
  }

  // The equip call wired to a segment for this card's kind.
  const click = (team) => {
    if (kind === "skin")
      return `cardEquipTeam(event, '${team}', 'skin', ${descriptor.weaponid}, ${descriptor.paintid})`;
    if (kind === "knife")
      return `cardEquipTeam(event, '${team}', 'knife', '${weaponName}')`;
    return `cardEquipTeam(event, '${team}', 'gloves', '${weaponName}')`;
  };

  if (teams.length === 1) {
    const isCT = teams[0] === 3;
    const icon = isCT ? "/icons/team_ct.png" : "/icons/team_t.png";
    const label = isCT ? "CT" : "T";
    const on = equipped.includes(teams[0]) ? " active" : "";
    return `<div class="card-team card-team-locked${on}"><img src="${icon}" alt="${label}" title="${label}"></div>`;
  }

  const hasT = equipped.includes(2);
  const hasCT = equipped.includes(3);
  const seg = (team, icon, label, on) =>
    `<button type="button" class="card-team-btn${on ? " active" : ""}" data-team="${team}" title="${label}" onclick="${click(team)}"><img src="${icon}" alt="${label}"></button>`;
  return `<div class="card-team" role="group">
      ${seg("both", "/icons/team_both.png", "Both", hasT && hasCT)}
      ${seg("2", "/icons/team_t.png", "T", hasT)}
      ${seg("3", "/icons/team_ct.png", "CT", hasCT)}
    </div>`;
};

// Equip the card's item for a side from a per-card icon. team: 'both' | '2' |
// '3'. Stops the click from bubbling to the card-body equip. The *-changed
// socket handlers re-render the open view, so highlights refresh from state.
window.cardEquipTeam = (ev, team, kind, p1, p2) => {
  ev.stopPropagation();
  const t = team === "both" ? "both" : Number(team);
  if (kind === "skin") window.changeSkin(user.id, p1, p2, t);
  else if (kind === "knife") window.changeKnife(p1, t);
  else if (kind === "gloves") window.changeGlove(p1, t);
};

// Exposed so the global search view (showSearch) can reuse the exact same card
// (rarity, team badge, gear/editModal, lazy image) as the per-type grids.
window.buildSkinCard = buildSkinCard;

// Exposed so the knife/glove model templates (templates.js) can render the same
// per-card team selector.
window.cardTeamSelectorHtml = cardTeamSelectorHtml;

// Recompute every rendered card's team selector, active outline and divergence
// badge from the canonical state (selectedSkins / loadoutByTeam), in place -
// so a per-team equip refreshes the grid WITHOUT a full re-render (keeps scroll,
// search and sort). Replaces the old single-item DOM surgery, which wrongly
// cleared the other side's equipped state. Knife/glove model cards also get
// their fast-select button (Set weapon / Change skin) refreshed.
window.refreshCardTeams = () => {
  document.querySelectorAll(".weapon-card").forEach((card) => {
    const host = card.querySelector(".card-team");
    if (!host) return;

    let descriptor, st;
    if (card.dataset.type === "skinCard") {
      const dash = card.dataset.btnType.lastIndexOf("-");
      const defindex = Number(card.dataset.btnType.slice(0, dash));
      const paint = Number(card.dataset.btnType.slice(dash + 1));
      const name = getKeyByValue(weaponIds, defindex);
      descriptor = { kind: "skin", weaponName: name, weaponid: defindex, paintid: paint };
      st = window.skinTeamState(defindex, paint, name);
    } else if (card.dataset.teamKind === "gloves") {
      const defindex = Number(card.dataset.defindex);
      descriptor = { kind: "gloves", weaponName: card.id, weaponid: defindex };
      st = window.itemTeamState("gloves", defindex);
    } else if (card.dataset.teamKind === "knife") {
      descriptor = { kind: "knife", weaponName: card.id };
      st = window.itemTeamState("knife", card.id);
    } else {
      return;
    }

    host.outerHTML = window.cardTeamSelectorHtml(descriptor);
    card.classList.toggle("active-card", !!(st && st.active));
    card.querySelectorAll(".team-badge").forEach((b) => b.remove());
    if (st && st.badge) card.insertAdjacentHTML("afterbegin", window.teamBadgeHtml(st));

    // Knife/glove model cards: equipped -> "Change skin" (open its skins),
    // otherwise -> "Set weapon" (fast-select equip).
    if (descriptor.kind === "knife" || descriptor.kind === "gloves") {
      const equipped = !!(st && st.active);
      const fn = equipped
        ? `knifeSkins('${card.id}')`
        : descriptor.kind === "knife"
        ? `changeKnife('${card.id}')`
        : `changeGlove('${card.id}')`;
      const label = equipped ? langObject.changeSkin : langObject.setWeapon;
      const btn = card.querySelector(".btn-outline-accent-card");
      if (btn) {
        btn.setAttribute("onclick", fn);
        btn.innerHTML = `<small>${label}</small>`;
      }
      const a = card.querySelector("a[onclick]");
      if (a) a.setAttribute("onclick", fn);
    }
  });
};

// After an equip/reset: refresh the loadout overview (its CT|T halves) when it's
// the open view, otherwise refresh the grid cards in place.
window.refreshAfterChange = () => {
  if (window.currentViewRender === window.showLoadout) window.currentViewRender();
  else window.refreshCardTeams();
};

// ---- Global skin search --------------------------------------------------
// Driven by the inline search field in the side menu (no separate view to open;
// you just type). Unlike the toolbar search (which only filters the cards
// already rendered for one category), this searches the ENTIRE skinsObject by
// name across every weapon, e.g. "ak redline" or "karambit fade". The result
// set is capped so a broad query (e.g. a single letter) can't render thousands
// of image cards. The input lives in the side menu (outside #skinsContainer),
// so re-rendering the grid never disturbs the field's focus or text.
const SEARCH_RESULT_CAP = 300;
let searchQuery = "";
let searchTimer = null;

// Render the search header (team selector + card size + count) and the capped
// result cards into #skinsContainer. Registered as currentViewRender so the
// team selector re-renders results (with fresh badges) on team change.
const renderSearchView = () => {
  window.currentViewRender = renderSearchView;
  // No side button is "active" for search; clear the others' highlight.
  sideBtnHandler("sideBtnSearch");

  const container = document.getElementById("skinsContainer");
  if (!container) return;
  const L = typeof langObject !== "undefined" ? langObject : {};
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "col-12 d-flex flex-wrap align-items-center gap-2 mb-3 search-header";
  header.innerHTML = `
    <h5 class="m-0 me-2 d-flex align-items-center"><i class="fa-solid fa-magnifying-glass me-2 text-secondary"></i><span id="searchTermLabel"></span></h5>
    <button type="button" id="cardSizeBtn" class="btn btn-outline-primary btn-sm" onclick="cycleCardSize()" title="${L.cardSize || "Card size"}"><i class="fa-solid fa-table-cells"></i></button>
    <div class="ms-auto d-flex align-items-center gap-2">
      ${window.teamSelectorHtml()}
      <small class="text-secondary" id="skinsCount"></small>
    </div>
  `;
  container.appendChild(header);
  // textContent (not innerHTML) so a query can't inject markup.
  const label = document.getElementById("searchTermLabel");
  if (label) label.textContent = searchQuery.trim();

  const tokens = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
  let shown = 0;
  for (let i = 0; i < skinsObject.length && shown < SEARCH_RESULT_CAP; i++) {
    const el = skinsObject[i];
    // Skip anything we can't map to a defindex (the card's click/equip needs it).
    if (typeof weaponIds[el.weapon.id] === "undefined") continue;
    const hay = `${el.weapon.name} ${el.pattern.name}`.toLowerCase();
    if (!tokens.every((t) => hay.includes(t))) continue;
    const card = window.buildSkinCard(el);
    card.classList.add("search-result-cell");
    container.appendChild(card);
    shown++;
  }

  if (!shown) {
    const empty = document.createElement("div");
    empty.className = "col-12 text-center text-secondary mt-5 search-empty";
    empty.innerHTML = `<i class="fa-solid fa-magnifying-glass fa-2x mb-3 d-block"></i>${L.searchNoResults || "No skins match your search."}`;
    container.appendChild(empty);
  }
  const countEl = document.getElementById("skinsCount");
  if (countEl) countEl.innerText = shown >= SEARCH_RESULT_CAP ? `${SEARCH_RESULT_CAP}+` : String(shown);
};

// Called on every keystroke of the side-menu search field(s). Debounced.
// Empty query returns to the loadout home so clearing the box feels natural.
window.runSkinSearch = (value) => {
  searchQuery = value || "";
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    if (!searchQuery.trim()) {
      if (typeof window.showLoadout === "function") window.showLoadout();
      return;
    }
    renderSearchView();
  }, 140);
};

// Focus the (visible) side-menu search field. Used by the "/" keyboard shortcut.
window.showSearch = () => {
  const input =
    document.getElementById("globalSkinSearch") ||
    document.getElementById("globalSkinSearchMobile");
  if (input) {
    input.focus();
    input.select();
  }
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
