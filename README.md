<p align="center">
    <a href="README.md"><img src="https://img.shields.io/badge/LANG-ENGLISH-blue"></a>
    <a href="README_pt.md"><img src="https://img.shields.io/badge/IDIOMA-PORTUGU%C3%8AS-yellow"></a>
    <a href="README_cn.md"><img src="https://img.shields.io/badge/语言-简体中文-red"></a>
    <img src="https://img.shields.io/badge/license-GPL--3.0-green">
    <img src="https://img.shields.io/badge/node-%E2%89%A517-brightgreen">
</p>

# CS2 WeaponPaints Website

A web UI for the [**cs2-WeaponPaints**](https://github.com/Nereziel/cs2-WeaponPaints/) plugin. It lets players on your CS2 community server log in with Steam and customize their loadout — weapon skins, knives, gloves, agents, music kits and stickers — which the plugin then applies in‑game.

This is a **modified fork** of [SwaggyMacro/cs2-WeaponPaints-Website](https://github.com/SwaggyMacro/cs2-WeaponPaints-Website), which itself is based on the original [L1teD/cs2-WeaponPaints-website](https://github.com/L1teD/cs2-WeaponPaints-website). See [Credits](#credits).

> [!WARNING]
> Plugins that let players use skins they don't own live in a grey area of Valve's rules. Running the underlying plugin on a public server **may lead to a GSLT/Steam ban**. Use it at your own risk and review [Valve's server guidelines](https://store.steampowered.com/gameserverterms/). This repository is only the website (UI) — it ships no game code.

## Features

Everything from the upstream projects (weapon / knife / glove / agent / music‑kit selection, glove & music‑kit change, request optimization, multi‑language UI) **plus** the additions in this fork:

- **Loadout overview** — a single screen showing your whole loadout, with a default/all toggle; equipped gloves render correctly and knives/gloves jump straight to the full selector.
- **Stickers** — per‑weapon sticker selection (slots + wear slider), a large sticker picker modal with type / effect / rarity filters and elastic token search, plus an "apply to all" shortcut.
- **Apply inspect link** — paste a CS2 inspect link and the float, pattern and stickers are decoded **offline** (masked‑link decode) and pre‑filled.
- **Float / pattern editor** — wear slider with quick presets, pattern input, and saved float/pattern pre‑filled when re‑opening a skin.
- **StatTrak toggle** (on by default for applicable items).
- **Quality‑of‑life** — pointer cursors on clickable elements, and a mobile‑responsive layout.

## Languages

`en` · `pt-BR` · `ru` · `zh-CN` (see `src/lang/`). Set the active one with the `lang` field in your config.

## Screenshots

<div>
    <img src="/previews/loadout.png?raw=true" width="400">
    <img src="/previews/knives.png?raw=true" width="400">
    <img src="/previews/float-pattern.png?raw=true" width="400">
</div>

## Requirements

- **Node.js 17+** (16 also works).
- A **MySQL** database shared with the [cs2-WeaponPaints](https://github.com/Nereziel/cs2-WeaponPaints/) plugin.
- A [**Steam Web API key**](https://steamcommunity.com/dev/apikey).

## Installation

1. Clone this repository.
2. Copy `src/config.example.json` to `src/config.json` and fill it in (see [Configuration](#configuration)).
3. Install dependencies and start:

   **Windows**
   ```bash
   npm i
   npm run start
   ```

   **Linux**
   ```bash
   npm i
   npm run startLinux
   ```

   For development with auto‑reload: `npm run dev`.

The site runs on `http://<HOST>:<PORT>` (default port `27075`).

## Configuration

`src/config.json`:

| Field | Description |
|-------|-------------|
| `name` | Title shown in the site header / tab. |
| `lang` | UI language: `en`, `pt-BR`, `ru` or `zh-CN`. |
| `DB.DB_HOST` | MySQL host. |
| `DB.DB_USER` | MySQL user. |
| `DB.DB_PASS` | MySQL password. |
| `DB.DB_DB` | Database name (the one used by the plugin). |
| `DB.DB_PORT` | MySQL port (usually `3306`). |
| `HOST` | Public host or `localhost` / `127.0.0.1`. |
| `PROTOCOL` | `http` or `https` (used to build the Steam return URL). |
| `PORT` | Port the site listens on. |
| `STEAMAPIKEY` | Your Steam Web API key. |
| `secret` | *Optional.* Long random string used to sign session cookies. If omitted, a new random secret is generated on each restart (which logs everyone out on restart). |
| `connect.show` | `true`/`false` — show a "Connect to server" button. |
| `connect.url` | `steam://connect/...` URL for that button. |

> Note: the site is served from the root path (`/`). Sub‑directory hosting is not configurable in this fork.

## Credits

- Original project: [**@L1teD**](https://github.com/L1teD/cs2-WeaponPaints-website)
- Upstream fork: [**@SwaggyMacro**](https://github.com/SwaggyMacro/cs2-WeaponPaints-Website)
- Game plugin: [**cs2-WeaponPaints** by @Nereziel](https://github.com/Nereziel/cs2-WeaponPaints/)

## License

Licensed under the **GNU GPL‑3.0** — see the [LICENSE](LICENSE) file.
