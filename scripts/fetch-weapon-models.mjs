// Downloads the official Valve CS2 weapon geometry pack and extracts the weapons
// the 3D sticker editor uses into src/public/models/<defindex>.obj
//
// The models are Valve IP and are NOT committed to the repo (.gitignore'd). Run
// this once after cloning to enable the 3D sticker placement editor:
//   node scripts/fetch-weapon-models.mjs
//
// Geometry-only OBJ (with UVs) is all the editor needs - it renders with a
// neutral material for placement. Source pack covers every weapon, so adding
// more is just another line in WEAPONS below.

import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ZIP_URL = 'https://media.steampowered.com/apps/csgo/images/workshop/workshop/cs2_weapon_model_geometry.zip'

// defindex -> filename inside the pack
const WEAPONS = {
    1: 'weapon_pist_deagle.obj',
    4: 'weapon_pist_glock18.obj',
    7: 'weapon_rif_ak47.obj',
    9: 'weapon_snip_awp.obj',
    16: 'weapon_rif_m4a4.obj',
    60: 'weapon_rif_m4a1_silencer.obj',
    61: 'weapon_pist_usp_silencer.obj',
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'src', 'public', 'models')
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cs2-models-'))
const zipPath = path.join(tmpDir, 'pack.zip')

async function main() {
    fs.mkdirSync(outDir, { recursive: true })

    console.log('Downloading Valve weapon geometry pack (~27 MB)...')
    const res = await fetch(ZIP_URL)
    if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`)
    fs.writeFileSync(zipPath, Buffer.from(await res.arrayBuffer()))

    console.log('Extracting...')
    const extractDir = path.join(tmpDir, 'unzipped')
    fs.mkdirSync(extractDir, { recursive: true })
    if (process.platform === 'win32') {
        execFileSync('powershell', ['-NoProfile', '-Command',
            `Expand-Archive -Path "${zipPath}" -DestinationPath "${extractDir}" -Force`], { stdio: 'inherit' })
    } else {
        execFileSync('unzip', ['-o', '-q', zipPath, '-d', extractDir], { stdio: 'inherit' })
    }

    let ok = 0
    for (const [defindex, file] of Object.entries(WEAPONS)) {
        const src = path.join(extractDir, file)
        if (!fs.existsSync(src)) { console.warn(`  ! missing in pack: ${file}`); continue }
        fs.copyFileSync(src, path.join(outDir, `${defindex}.obj`))
        console.log(`  ${file} -> models/${defindex}.obj`)
        ok++
    }

    fs.rmSync(tmpDir, { recursive: true, force: true })
    console.log(`Done. ${ok}/${Object.keys(WEAPONS).length} models in src/public/models/`)
}

main().catch((e) => { console.error(e); process.exit(1) })
