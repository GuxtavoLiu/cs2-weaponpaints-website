/*
 * update-skin-images.js
 *
 * Refreshes the `image` URL of every skin in src/public/js/json/skins/<lang>-skins.json.
 *
 * Why this exists:
 *   The bundled skin JSON pointed every skin image at
 *     raw.githubusercontent.com/ByMykel/counter-strike-image-tracker/.../default_generated/<name>_png.png
 *   That `default_generated` folder was removed from the image-tracker repo, so every
 *   skin image now 404s (only the alt text shows). ByMykel's CSGO-API now serves skin
 *   images from Steam's official CDN (community.akamai.steamstatic.com), which is stable
 *   and has full coverage.
 *
 * What it does:
 *   Downloads the CSGO-API skins list once and rewrites the top-level `image` field of
 *   each local skin, matching on weapon.id + paint_index (both language-independent, so
 *   the single English API feed is reused for every locale). Collection/crate/agent/music
 *   images are left untouched.
 *
 * Usage:
 *   node scripts/update-skin-images.js
 *
 * Re-run any time the bundled skins are regenerated or images need refreshing.
 */

const fs = require("fs");
const path = require("path");

const API_URL = "https://raw.githubusercontent.com/ByMykel/CSGO-API/main/public/api/en/skins.json";
const SKINS_DIR = path.join(__dirname, "..", "src", "public", "js", "json", "skins");
const LOCALES = ["en", "pt-BR", "ru", "zh-CN"];

const keyOf = (s) => `${(s.weapon && s.weapon.id) || "?"}|${s.paint_index == null ? "" : s.paint_index}`;

async function loadApiImageMap() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error(`API download failed: HTTP ${res.status}`);
  const api = await res.json();
  const map = new Map();
  for (const item of api) {
    if (item.image && !map.has(keyOf(item))) map.set(keyOf(item), item.image);
  }
  console.log(`API loaded: ${api.length} skins, ${map.size} unique weapon|paint keys`);
  return map;
}

async function main() {
  const imageMap = await loadApiImageMap();

  for (const lang of LOCALES) {
    const file = path.join(SKINS_DIR, `${lang}-skins.json`);
    if (!fs.existsSync(file)) {
      console.warn(`skip ${lang}: ${file} not found`);
      continue;
    }
    const skins = JSON.parse(fs.readFileSync(file, "utf8"));
    let updated = 0;
    let missing = 0;
    for (const skin of skins) {
      const newImage = imageMap.get(keyOf(skin));
      if (newImage) {
        if (skin.image !== newImage) updated++;
        skin.image = newImage;
      } else {
        missing++;
      }
    }
    // Preserve the original compact (minified) format the bundled files ship in.
    fs.writeFileSync(file, JSON.stringify(skins));
    console.log(`${lang}: ${skins.length} skins, ${updated} images updated, ${missing} unmatched`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
