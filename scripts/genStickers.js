// Generates src/public/js/json/stickers.json from a downloaded ByMykel/CSGO-API
// stickers.json. Each output item is the minimal shape the website needs to
// populate the sticker pickers: { id, name, image } where `id` is the in-game
// sticker definition index stored in wp_player_skins.weapon_sticker_N.
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
  out.push({ id, name, image: s.image });
}

out.sort((a, b) => a.name.localeCompare(b.name));
fs.writeFileSync(outPath, JSON.stringify(out));
console.log(`Wrote ${out.length} stickers to ${outPath}`);
