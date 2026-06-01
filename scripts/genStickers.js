// Generates src/public/js/json/stickers.json from a downloaded ByMykel/CSGO-API
// stickers.json. Each output item carries what the sticker picker needs to
// search, filter and render: { id, name, image, rarity, effect, type } where
// `id` is the in-game sticker definition index stored in
// wp_player_skins.weapon_sticker_N, `rarity` is the rarity colour hex,
// `effect` is Holo/Foil/Glitter/Gold/... and `type` is Autograph/Team/Event/...
//
// Usage: node scripts/genStickers.js <path-to-raw-stickers.json>
const fs = require("fs");
const path = require("path");

const rawPath = process.argv[2] || path.join(__dirname, "..", "stickers_raw.json");
const outPath = path.join(__dirname, "..", "src", "public", "js", "json", "stickers.json");

const raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));

const seen = new Set();
const out = [];
for (const s of raw) {
  const id = parseInt(s.def_index, 10);
  if (!Number.isFinite(id) || id <= 0) continue; // skip the "no sticker" / invalid entries
  if (!s.image) continue;
  if (seen.has(id)) continue;
  seen.add(id);
  // Strip the leading "Sticker | " so the search/preview labels read cleanly.
  const name = (s.name || "").replace(/^Sticker \| /, "");
  out.push({
    id,
    name,
    image: s.image,
    rarity: (s.rarity && s.rarity.color) || "",
    rarityName: (s.rarity && s.rarity.name) || "",
    effect: s.effect || "",
    type: s.type || "",
  });
}

out.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${out.length} stickers to ${outPath}`);
