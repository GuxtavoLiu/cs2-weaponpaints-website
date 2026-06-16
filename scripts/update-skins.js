/*
 * update-skins.js
 *
 * Adds skins that exist in ByMykel's CSGO-API but are missing from the bundled
 * src/public/js/json/skins/<lang>-skins.json. The bundled files are an older
 * snapshot, so newly released skins (e.g. the extra Zeus x27 finishes) never
 * showed up. Existing entries are left untouched - only missing ones are
 * appended, matched on weapon.id + paint_index.
 *
 * ByMykel only publishes localized `en` and `zh-CN` feeds now, so pt-BR and ru
 * fall back to the English feed for the *new* skins (their existing localized
 * entries are preserved as-is).
 *
 * Usage: node scripts/update-skins.js
 */

const fs = require("fs");
const path = require("path");

const SKINS_DIR = path.join(__dirname, "..", "src", "public", "js", "json", "skins");
const FEED = (l) => `https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/${l}/skins.json`;
// local locale -> ByMykel feed locale (pt-BR / ru aren't published any more).
const SOURCE = { en: "en", "zh-CN": "zh-CN", "pt-BR": "en", ru: "en" };

const keyOf = (s) => `${(s.weapon && s.weapon.id) || "?"}|${s.paint_index == null ? "" : s.paint_index}`;

const feedCache = {};
async function feed(l) {
  if (!feedCache[l]) {
    const r = await fetch(FEED(l));
    if (!r.ok) throw new Error(`${l} feed HTTP ${r.status}`);
    feedCache[l] = await r.json();
  }
  return feedCache[l];
}

async function main() {
  for (const lang of Object.keys(SOURCE)) {
    const file = path.join(SKINS_DIR, `${lang}-skins.json`);
    if (!fs.existsSync(file)) {
      console.warn(`skip ${lang}: ${file} not found`);
      continue;
    }
    const local = JSON.parse(fs.readFileSync(file, "utf8"));
    const have = new Set(local.map(keyOf));
    const src = await feed(SOURCE[lang]);
    const missing = src.filter((s) => !have.has(keyOf(s)));
    local.push(...missing);
    // Preserve the bundled minified format.
    fs.writeFileSync(file, JSON.stringify(local));
    console.log(`${lang}: +${missing.length} added (source ${SOURCE[lang]}), total ${local.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
