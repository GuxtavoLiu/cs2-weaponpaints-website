// Global team selector state ('both' | '2' | '3', 2=T, 3=CT) plus the helpers
// the views use to mark equipped items per team. Loaded as a classic script
// BEFORE index.js; it must not touch loadoutByTeam/selectedSkins at parse time
// because those globals are defined later in the footer.
//
// Display rules in 'both' mode when the two teams diverge:
// - a card is "active" only when BOTH teams have the item equipped;
// - when exactly one team has it, the card gets a small T/CT corner badge;
// - data lookups (loadout image, edit modal values) prefer the CT row.

const TEAM_T = 2;
const TEAM_CT = 3;
const TEAM_LABEL = { [TEAM_T]: "T", [TEAM_CT]: "CT" };
// Official team patch icons (cswikia); shown instead of the T/CT text.
const TEAM_ICON = { T: "/icons/team_t.png", CT: "/icons/team_ct.png", Both: "/icons/team_both.png" };
const teamIconImg = (label) =>
  `<img src="${TEAM_ICON[label]}" alt="${label}" title="${label}">`;

// CS2 team-exclusive guns; anything not listed can be bought by both sides.
const T_ONLY_GUNS = ["weapon_ak47", "weapon_glock", "weapon_tec9", "weapon_mac10", "weapon_galilar", "weapon_sg556", "weapon_g3sg1", "weapon_sawedoff"];
const CT_ONLY_GUNS = ["weapon_m4a1", "weapon_m4a1_silencer", "weapon_usp_silencer", "weapon_hkp2000", "weapon_fiveseven", "weapon_famas", "weapon_aug", "weapon_scar20", "weapon_mag7", "weapon_mp9"];

// Which side(s) can use a weapon (by weapon_name).
window.weaponTeams = (weaponName) => {
  if (T_ONLY_GUNS.includes(weaponName)) return [TEAM_T];
  if (CT_ONLY_GUNS.includes(weaponName)) return [TEAM_CT];
  return [TEAM_T, TEAM_CT];
};

// Team to write when equipping a weapon: a team-exclusive gun always targets
// its own side (the selector is meaningless for it); everything else follows
// the global selector.
window.writeTeamForWeapon = (weaponName) => {
  const teams = weaponTeams(weaponName);
  return teams.length === 1 ? teams[0] : getWriteTeam();
};

window.getCurrentTeam = () => {
  const v = localStorage.getItem("loadoutTeam");
  return v === "2" || v === "3" ? v : "both";
};

// Value for socket payloads: 'both' | 2 | 3.
window.getWriteTeam = () => {
  const t = getCurrentTeam();
  return t === "both" ? "both" : Number(t);
};

window.refreshTeamSelectorUI = () => {
  const current = getCurrentTeam();
  document
    .querySelectorAll(".team-selector [data-team]")
    .forEach((btn) =>
      btn.classList.toggle("active", btn.getAttribute("data-team") === current)
    );
};

// Compact [Both|T|CT] segmented control. Rendered inside the loadout header
// and the skins toolbar (there can be more than one on screen, hence the
// class-based refresh above). Picking a side here defines which team the next
// equip/save applies to.
window.teamSelectorHtml = () => {
  if (typeof user === "undefined") return "";
  const L = typeof langObject !== "undefined" ? langObject : {};
  const current = getCurrentTeam();
  const btn = (team, label, title) =>
    `<button type="button" class="btn btn-sm btn-outline-primary${current === team ? " active" : ""}" data-team="${team}" onclick="setCurrentTeam('${team}')" title="${title}"><small>${label}</small></button>`;
  return `<div class="btn-group team-selector" role="group">${btn("both", teamIconImg("Both"), L.teamBoth || "Both")}${btn("2", teamIconImg("T"), L.teamT || "T")}${btn("3", teamIconImg("CT"), L.teamCT || "CT")}</div>`;
};

window.setCurrentTeam = (t) => {
  localStorage.setItem("loadoutTeam", String(t));
  window.refreshTeamSelectorUI();
  window.syncDerivedSelection();
  document.dispatchEvent(new CustomEvent("teamchange"));
};

// Team selector for the float-edit modal. Unlike teamSelectorHtml it drives a
// modal-local choice (setModalTeam) instead of the global selector, so it never
// re-renders the grid behind the open modal. `selected` is the current modal
// team ('both'|2|3); `equipped` is the list of sides that already carry this
// exact paint (a marker dot is shown on those segments). Team-exclusive guns
// render a single locked icon.
window.modalTeamSelectorHtml = (weaponName, selected, equipped) => {
  const L = typeof langObject !== "undefined" ? langObject : {};
  const teams = weaponTeams(weaponName);
  const has = (t) => Array.isArray(equipped) && equipped.includes(t);
  if (teams.length === 1) {
    const label = TEAM_LABEL[teams[0]];
    return `<span class="modal-team-locked">${teamIconImg(label)}<small>${
      label === "CT" ? L.teamCT || "CT" : L.teamT || "T"
    }</small></span>`;
  }
  const seg = (team, inner, dot) =>
    `<button type="button" class="btn btn-sm btn-outline-primary${
      String(selected) === String(team) ? " active" : ""
    }" data-team="${team}" onclick="setModalTeam('${team}')">${inner}${
      dot ? '<span class="modal-team-dot"></span>' : ""
    }</button>`;
  return `<div class="btn-group team-selector" role="group">${seg(
    "both",
    teamIconImg("Both"),
    has(TEAM_T) && has(TEAM_CT)
  )}${seg("2", teamIconImg("T"), has(TEAM_T))}${seg(
    "3",
    teamIconImg("CT"),
    has(TEAM_CT)
  )}</div>`;
};

// Teams to look at for display contexts, in priority order.
window.preferredTeams = () => {
  const t = getCurrentTeam();
  return t === "both" ? [TEAM_CT, TEAM_T] : [Number(t)];
};

// The selectedSkins row for a weapon (optionally a specific paint) in the
// current team context: exact team in T/CT mode, CT-then-T in 'both' mode.
window.skinRowFor = (defindex, paintid) => {
  if (typeof selectedSkins === "undefined" || !Array.isArray(selectedSkins)) return undefined;
  for (const team of preferredTeams()) {
    const row = selectedSkins.find(
      (s) =>
        s.weapon_team == team &&
        (s.weapon_defindex == defindex || s.model_idx == defindex) &&
        (typeof paintid === "undefined" || s.weapon_paint_id == paintid)
    );
    if (row) return row;
  }
  return undefined;
};

// {active, badge} for an item given which teams have it equipped.
const teamMatchState = (matches) => {
  const t = getCurrentTeam();
  if (t !== "both") {
    return { active: matches.includes(Number(t)), badge: null };
  }
  if (matches.length === 2) return { active: true, badge: null };
  if (matches.length === 1) return { active: false, badge: TEAM_LABEL[matches[0]] };
  return { active: false, badge: null };
};

// The team(s) (subset of [2,3]) that currently have a knife/glove/music value
// equipped. kind: 'knife' (value = weapon_name), 'gloves' (= weapon_defindex),
// 'music' (= music_id).
window.itemTeamsEquipped = (kind, value) => {
  if (typeof loadoutByTeam === "undefined") return [];
  const field = { knife: "knife", gloves: "weapon_defindex", music: "music_id" }[kind];
  return [TEAM_T, TEAM_CT].filter((team) => {
    const row = loadoutByTeam[kind][team];
    return row && row[field] == value;
  });
};

// Equip state of a knife/glove/music value against loadoutByTeam.
window.itemTeamState = (kind, value) =>
  teamMatchState(window.itemTeamsEquipped(kind, value));

// The team(s) (subset of the weapon's allowed sides) that currently have this
// exact skin (defindex + paint) equipped. weaponName (optional) restricts to a
// team-exclusive gun's own side.
window.skinTeamsEquipped = (defindex, paintid, weaponName) => {
  if (typeof selectedSkins === "undefined" || !Array.isArray(selectedSkins)) return [];
  const allowed = weaponName ? weaponTeams(weaponName) : [TEAM_T, TEAM_CT];
  return allowed.filter((team) =>
    selectedSkins.some(
      (s) =>
        s.weapon_team == team &&
        s.weapon_paint_id == paintid &&
        (s.weapon_defindex == defindex || s.model_idx == defindex)
    )
  );
};

// Equip state of a weapon skin (defindex + paint) against selectedSkins.
// Team-exclusive guns never show a divergence badge (only their own side counts).
window.skinTeamState = (defindex, paintid, weaponName) => {
  const allowed = weaponName ? weaponTeams(weaponName) : [TEAM_T, TEAM_CT];
  const matches = window.skinTeamsEquipped(defindex, paintid, weaponName);
  if (allowed.length === 1) {
    return { active: matches.length > 0, badge: null };
  }
  return teamMatchState(matches);
};

window.teamBadgeHtml = (state) =>
  state && state.badge
    ? `<span class="team-badge">${teamIconImg(state.badge)}</span>`
    : "";

// Rebuild the legacy "current view" globals (selectedKnife/Gloves/Music) from
// loadoutByTeam. Everything that still reads those globals keeps working; they
// just follow the selector now.
window.syncDerivedSelection = () => {
  if (typeof loadoutByTeam === "undefined") return;
  const pick = (kind) => {
    for (const team of preferredTeams()) {
      if (loadoutByTeam[kind][team]) return loadoutByTeam[kind][team];
    }
    return undefined;
  };
  const knifeRow = pick("knife");
  const glovesRow = pick("gloves");
  const musicRow = pick("music");
  if (typeof selectedKnife !== "undefined") {
    selectedKnife.knife = knifeRow ? knifeRow.knife : undefined;
    if (knifeRow) selectedKnife.steamid = knifeRow.steamid;
  }
  if (typeof selectedGloves !== "undefined") {
    selectedGloves.weapon_defindex = glovesRow ? glovesRow.weapon_defindex : undefined;
    if (glovesRow) selectedGloves.steamid = glovesRow.steamid;
  }
  if (typeof selectedMusic !== "undefined") {
    selectedMusic.music_id = musicRow ? musicRow.music_id : undefined;
    if (musicRow) selectedMusic.steamid = musicRow.steamid;
  }
};

// Re-render whichever view is open when the team changes. Views register
// themselves in window.currentViewRender when they render.
document.addEventListener("teamchange", () => {
  if (typeof window.currentViewRender === "function") window.currentViewRender();
});

document.addEventListener("DOMContentLoaded", () => {
  window.refreshTeamSelectorUI();
});
