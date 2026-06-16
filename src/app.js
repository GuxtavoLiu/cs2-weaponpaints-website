const express = require("express");
const passport = require("passport");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const passportSteam = require("passport-steam");
const SteamStrategy = passportSteam.Strategy;
const mysql = require("mysql2");
const path = require("path");
const { decodeInspectLink } = require("./inspectLink");

// Knife item-definition-index -> weapon_name (for equipping the knife model when
// an inspect link points at a knife). Mirrors the client-side weaponIds map.
const KNIFE_DEFINDEX_TO_NAME = {
  42: "weapon_knife", 59: "weapon_knife_t", 500: "weapon_bayonet",
  503: "weapon_knife_css", 505: "weapon_knife_flip", 506: "weapon_knife_gut",
  507: "weapon_knife_karambit", 508: "weapon_knife_m9_bayonet", 509: "weapon_knife_tactical",
  512: "weapon_knife_falchion", 514: "weapon_knife_survival_bowie", 515: "weapon_knife_butterfly",
  516: "weapon_knife_push", 517: "weapon_knife_cord", 518: "weapon_knife_canis",
  519: "weapon_knife_ursus", 520: "weapon_knife_gypsy_jackknife", 521: "weapon_knife_outdoor",
  522: "weapon_knife_stiletto", 523: "weapon_knife_widowmaker", 525: "weapon_knife_skeleton",
  526: "weapon_knife_kukri",
};
const GLOVE_DEFINDEX_MIN = 4725;

// Whitelist the client-supplied team selector. 2=T, 3=CT; anything else
// (including 'both', missing or garbage) means "write both teams", which is
// the pre-selector behavior. Team values only ever come from this function and
// are bound via placeholders, never interpolated into SQL text.
const teamsFrom = (t) => {
  const n = Number(t);
  if (n === 2) return [2];
  if (n === 3) return [3];
  return [2, 3];
};

// load configuration files
const config = require("./config.json");
config.SUBDIR = "/";
const lang = require(`./lang/${config.lang}.json`);

// Preload every available language file (keyed by its code = the filename) so
// the UI language can be switched per request via the language selector.
const fs = require("fs");
const langs = {};
fs.readdirSync(path.join(__dirname, "lang"))
  .filter((f) => f.endsWith(".json"))
  .forEach((f) => {
    langs[f.replace(/\.json$/, "")] = require(`./lang/${f}`);
  });
const availableLangs = Object.keys(langs);
// Language for a request: the user's session choice if valid, else the default.
const pickLangCode = (req) =>
  req.session && langs[req.session.lang] ? req.session.lang : config.lang;

const app = new express();

// [TEMP-DEBUG] verbose logging for skin-save debugging, gated behind WP_DEBUG=1
const DEBUG = process.env.WP_DEBUG === "1";
const dbg = (...args) => { if (DEBUG) console.log("[WP_DEBUG]", ...args); };

const PORT = config.PORT;

let returnURL = `${config.PROTOCOL}://${config.HOST}${config.SUBDIR}api/auth/steam/return`;
let realm = `${config.PROTOCOL}://${config.HOST}${config.SUBDIR}`;

if (config.HOST == "localhost" || config.HOST == "127.0.0.1") {
  returnURL = `${config.PROTOCOL}://${config.HOST}:${config.PORT}${config.SUBDIR}api/auth/steam/return`;
  realm = `${config.PROTOCOL}://${config.HOST}:${config.PORT}${config.SUBDIR}`;
}

// connect to db. A promise pool replaces the old single callback connection:
// it manages reconnection itself (no manual heartbeat needed) and lets the
// handlers below use async/await instead of nested callbacks.
const pool = mysql.createPool({
  host: config.DB.DB_HOST,
  user: config.DB.DB_USER,
  database: config.DB.DB_DB,
  password: config.DB.DB_PASS,
  port: config.DB.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
});
const db = pool.promise();
// Pools connect lazily; probe once at startup so a bad config is obvious.
db.query("SELECT 1")
  .then(() => console.log("Connected to MySQL!"))
  .catch((err) => console.error("Error: " + err.message));

// generate random secret if not set
randomSecret = () => {
  // crypto
  const crypto = require("crypto");
  return crypto.randomBytes(32).toString("hex");
};

app.set("views", path.join(__dirname, "/views"));
app.set("view engine", "ejs");
app.use(express.static("src/public"));

const fileStoreOptions = { logFn: function () {} };

// Required to get data from user for sessions
passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((user, done) => {
  done(null, user);
});
// Initiate Strategy
passport.use(
  new SteamStrategy(
    {
      returnURL: returnURL,
      realm: realm,
      apiKey: config.STEAMAPIKEY,
    },
    function (identifier, profile, done) {
      process.nextTick(function () {
        profile.identifier = identifier;
        return done(null, profile);
      });
    }
  )
);
app.use(
  session({
    store: new FileStore(fileStoreOptions),
    secret: config.secret ? config.secret : randomSecret(),
    saveUninitialized: true,
    resave: false,
    cookie: {
      maxAge: 3600000,
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.get(config.SUBDIR, async (req, res) => {
  const base = {
    config: config,
    session: req.session,
    user: req.user,
    lang: langs[pickLangCode(req)],
    langCode: pickLangCode(req),
    availableLangs: availableLangs,
    subdir: config.SUBDIR,
  };

  if (typeof req.user == "undefined") {
    return res.render("index", base);
  }

  try {
    // The five loadout tables are independent, so fetch them in parallel
    // instead of the old five-deep callback chain.
    const [[knife], [skins], [agents], [musics], [gloves]] = await Promise.all([
      db.query("SELECT * FROM wp_player_knife WHERE steamid = ?", [req.user.id]),
      db.query("SELECT * FROM wp_player_skins WHERE steamid = ?", [req.user.id]),
      db.query("SELECT * FROM wp_player_agents WHERE steamid = ?", [req.user.id]),
      db.query("SELECT * FROM wp_player_music WHERE steamid = ?", [req.user.id]),
      db.query("SELECT * FROM wp_player_gloves WHERE steamid = ?", [req.user.id]),
    ]);
    // knife/musics/gloves: full row arrays (one row per weapon_team) so the
    // client can keep per-team state.
    res.render("index", {
      ...base,
      knife: knife,
      skins: skins,
      agents: agents[0],
      musics: musics,
      gloves: gloves,
    });
  } catch (e) {
    // Don't leave the request hanging on a DB error: render the page with an
    // empty loadout so the UI still loads (matches the old "ignore err" behavior).
    console.log(e);
    res.render("index", { ...base, knife: [], skins: [], musics: [], gloves: [] });
  }
});

// Switch the UI language: store the choice in the session and return to the
// page the user came from. Unknown codes are ignored (keeps current language).
app.get(`${config.SUBDIR}api/lang/:code`, (req, res) => {
  if (langs[req.params.code]) req.session.lang = req.params.code;
  res.redirect(req.get("Referer") || config.SUBDIR);
});

// Same-origin proxy for sticker images. The Steam CDN serves them without a
// CORS header, so the 3D sticker editor can't use them directly as WebGL
// textures. We re-serve them from our own origin. Whitelisted Steam hosts only,
// so this can't be abused as an open proxy / SSRF vector.
const STICKER_IMG_HOSTS = /(^|\.)steamstatic\.com$|(^|\.)steamcommunity\.com$/i;
app.get(`${config.SUBDIR}api/sticker-img`, async (req, res) => {
  try {
    const raw = req.query.u;
    if (!raw) return res.status(400).end();
    const url = new URL(String(raw));
    if (url.protocol !== "https:" || !STICKER_IMG_HOSTS.test(url.hostname)) {
      return res.status(403).end();
    }
    const upstream = await fetch(url.href);
    if (!upstream.ok) return res.status(upstream.status).end();
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.set("Content-Type", upstream.headers.get("content-type") || "image/png");
    res.set("Cache-Control", "public, max-age=604800");
    res.set("Access-Control-Allow-Origin", "*");
    res.send(buf);
  } catch (e) {
    res.status(502).end();
  }
});

app.get(
  `${config.SUBDIR}api/auth/steam`,
  passport.authenticate("steam", { failureRedirect: config.SUBDIR }),
  function (req, res) {
    res.redirect("/");
  }
);

app.get(
  `${config.SUBDIR}api/auth/steam/return`,
  passport.authenticate("steam", { failureRedirect: config.SUBDIR }),
  function (req, res) {
    res.redirect("/");
  }
);

app.get(`${config.SUBDIR}api/logout`, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Session destruction error", err);
      return res.status(500).send("Session destruction failed.");
    }

    res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate"); // HTTP 1.1.
    res.setHeader("Pragma", "no-cache"); // HTTP 1.0.
    res.setHeader("Expires", "0"); // Proxies.

    res.redirect("/");
  });
});

app.get("/api/delete", async (req, res) => {
  // Guard against an unauthenticated hit (req.user would be undefined and crash).
  if (!req.user) return res.redirect("/");
  try {
    await Promise.all([
      db.query("DELETE FROM wp_player_knife WHERE steamid = ?", [req.user.id]),
      db.query("DELETE FROM wp_player_skins WHERE steamid = ?", [req.user.id]),
    ]);
  } catch (e) {
    console.log(e);
  }
  req.session.destroy(() => res.redirect("/"));
});

// do right redirect
if (config.SUBDIR != "/") {
  app.get("/", (req, res) => {
    res.redirect(config.SUBDIR.slice(0, -1));
  });
}

// start server
const server = app.listen(PORT, () => {
  console.log(`App is running on http://localhost:${PORT}`);
});

// initialize socket.io
const io = require("socket.io")(server);

io.on("connection", (socket) => {
  console.log("Socket connected");

  socket.on("change-knife", async (data) => {
    dbg("change-knife recv", data);
    // weapon_team in PK -> upsert one row per selected team.
    const teams = teamsFrom(data.team);
    try {
      await db.query(
        `INSERT INTO wp_player_knife (steamid, weapon_team, knife) VALUES ${teams.map(() => "(?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE knife = VALUES(knife)`,
        teams.flatMap((t) => [data.steamUserId, t, data.weaponid])
      );
    } catch (err) {
      dbg("change-knife SQL ERROR", err.message);
    }
    socket.emit("knife-changed", { knife: data.weaponid, teams });
  });

  socket.on("change-glove", async (data) => {
    dbg("change-glove recv", data);
    const teams = teamsFrom(data.team);
    try {
      await db.query(
        `INSERT INTO wp_player_gloves (steamid, weapon_team, weapon_defindex) VALUES ${teams.map(() => "(?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE weapon_defindex = VALUES(weapon_defindex)`,
        teams.flatMap((t) => [data.steamUserId, t, data.weaponid])
      );
    } catch (err) {
      dbg("change-glove SQL ERROR", err.message);
    }
    socket.emit("glove-changed", { knife: data.weaponid, teams });
  });

  socket.on("change-music", async (data) => {
    dbg("change-music recv", data);
    const teams = teamsFrom(data.team);
    try {
      await db.query(
        `INSERT INTO wp_player_music (steamid, weapon_team, music_id) VALUES ${teams.map(() => "(?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE music_id = VALUES(music_id)`,
        teams.flatMap((t) => [data.steamid, t, data.id])
      );
    } catch (err) {
      dbg("change-music SQL ERROR", err.message);
    }
    socket.emit("music-changed", { music: data.id, teams });
  });

  socket.on("change-skin", async (data) => {
    dbg("change-skin recv", data);
    // weapon_team is part of the composite PK and has no default; write one row
    // per selected team (2=T, 3=CT). Upsert keeps it idempotent when the weapon
    // already has a row.
    const teams = teamsFrom(data.team);
    try {
      const [results] = await db.query(
        `INSERT INTO wp_player_skins (steamid, weapon_team, weapon_defindex, weapon_paint_id) VALUES ${teams.map(() => "(?, ?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE weapon_paint_id = VALUES(weapon_paint_id)`,
        teams.flatMap((t) => [data.steamid, t, data.weaponid, data.paintid])
      );
      dbg("change-skin SQL ok affectedRows=", results.affectedRows);
    } catch (err) {
      dbg("change-skin SQL ERROR", err.message);
    }
    const [newSkins] = await db.query(
      "SELECT * FROM wp_player_skins WHERE steamid = ?",
      [data.steamid]
    );
    socket.emit("skin-changed", {
      weaponid: data.weaponid,
      paintid: data.paintid,
      teams,
      newSkins,
    });
  });

  socket.on("change-agent", async (data) => {
    try {
      const [existing] = await db.query(
        "SELECT * FROM wp_player_agents WHERE steamid = ?",
        [data.steamid]
      );
      // agent_ct / agent_t are separate columns; data.team is whitelisted to
      // 'ct'/'t' on the client, but keep it constrained here too.
      const col = data.team === "ct" ? "agent_ct" : "agent_t";
      if (existing.length >= 1) {
        await db.query(
          `UPDATE wp_player_agents SET ${col} = ? WHERE steamid = ?`,
          [data.model, data.steamid]
        );
      } else {
        await db.query(
          `INSERT INTO wp_player_agents (steamid, ${col}) VALUES (?, ?)`,
          [data.steamid, data.model]
        );
      }
      const [agents] = await db.query(
        "SELECT * FROM wp_player_agents WHERE steamid = ?",
        [data.steamid]
      );
      socket.emit("agent-changed", { agents, currentAgent: data.model });
    } catch (err) {
      dbg("change-agent SQL ERROR", err.message);
    }
  });

  // Rebuild a canonical sticker slot string from untrusted client input. The
  // plugin format is "id;schema;x;y;wear;scale;rotation"; we only let the user
  // pick the sticker id + wear and force the default position (everything 0).
  const sanitizeSticker = (s) => {
    if (typeof s !== "string") return "0;0;0;0;0;0;0";
    const parts = s.split(";");
    const id = parseInt(parts[0], 10);
    if (!Number.isFinite(id) || id <= 0) return "0;0;0;0;0;0;0";
    const num = (v) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? +n.toFixed(6) : 0;
    };
    const x = num(parts[2]);
    const y = num(parts[3]);
    let wear = num(parts[4]);
    wear = Math.min(1, Math.max(0, wear));
    const scale = num(parts[5]);
    const rotation = num(parts[6]);
    // Preserve the placement (x/y/scale/rotation) from the 3D editor; only id and
    // wear were kept before, which silently discarded any positioning.
    return `${id};0;${x};${y};${wear};${scale};${rotation}`;
  };

  socket.on("change-params", async (data) => {
    dbg("change-params recv", data);
    const wear = parseFloat(data.float);
    const seed = parseInt(data.pattern, 10) || 0;
    const safeWear = Number.isFinite(wear) ? wear : 0;
    const stattrak = data.stattrak ? 1 : 0;
    const stickersIn = Array.isArray(data.stickers) ? data.stickers : [];
    const stk = [0, 1, 2, 3, 4].map((i) => sanitizeSticker(stickersIn[i]));
    // The modal carries weapon_defindex + paint_id, so a single click can fully
    // create the skin row (paint + wear + seed + stattrak + stickers) for the
    // selected team(s), not just update a pre-existing one. weapon_team is in
    // the PK, so it must be supplied.
    const teams = teamsFrom(data.team);
    const rowValues = (team) => [data.steamid, team, data.weaponid, data.paintid, safeWear, seed, stattrak, ...stk];
    try {
      const [results] = await db.query(
        `INSERT INTO wp_player_skins (steamid, weapon_team, weapon_defindex, weapon_paint_id, weapon_wear, weapon_seed, weapon_stattrak, weapon_sticker_0, weapon_sticker_1, weapon_sticker_2, weapon_sticker_3, weapon_sticker_4) VALUES ${teams.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE weapon_paint_id = VALUES(weapon_paint_id), weapon_wear = VALUES(weapon_wear), weapon_seed = VALUES(weapon_seed), weapon_stattrak = VALUES(weapon_stattrak), weapon_sticker_0 = VALUES(weapon_sticker_0), weapon_sticker_1 = VALUES(weapon_sticker_1), weapon_sticker_2 = VALUES(weapon_sticker_2), weapon_sticker_3 = VALUES(weapon_sticker_3), weapon_sticker_4 = VALUES(weapon_sticker_4)`,
        teams.flatMap(rowValues)
      );
      dbg("change-params SQL ok affectedRows=", results.affectedRows);
    } catch (err) {
      dbg("change-params SQL ERROR", err.message);
    }
    // Return the fresh rows so the client can refresh its in-memory skins and
    // re-open the modal with the saved stickers without a page reload.
    const [newSkins] = await db.query(
      "SELECT * FROM wp_player_skins WHERE steamid = ?",
      [data.steamid]
    );
    socket.emit("params-changed", { newSkins: newSkins || [], teams });
  });

  socket.on("reset-skin", async (data) => {
    // Delete only the selected team's row(s) and return the fresh rows: the
    // other team may keep its skin, so the client can't just drop every row
    // with this defindex locally.
    const teams = teamsFrom(data.team);
    try {
      await db.query(
        "DELETE FROM wp_player_skins WHERE steamid = ? AND weapon_defindex = ? AND weapon_team IN (?)",
        [data.steamid, data.weaponid, teams]
      );
    } catch (err) {
      dbg("reset-skin SQL ERROR", err.message);
    }
    const [newSkins] = await db.query(
      "SELECT * FROM wp_player_skins WHERE steamid = ?",
      [data.steamid]
    );
    socket.emit("skin-reset", { weaponid: data.weaponid, teams, newSkins: newSkins || [] });
  });

  // Apply a full item from a (masked) CS2 inspect link: decode it locally and
  // write the weapon + paint + wear + seed + stattrak + nametag + stickers into
  // wp_player_skins for both teams, equipping the knife/glove model when needed.
  socket.on("apply-inspect", async (data) => {
    dbg("apply-inspect recv", data && data.link);
    let item;
    try {
      item = decodeInspectLink(data.link);
    } catch (e) {
      dbg("apply-inspect decode error", e.message);
      socket.emit("inspect-applied", { ok: false, error: e.message });
      return;
    }

    const steamid = data.steamid;
    const defindex = item.defindex;
    const paint = Number.isFinite(item.paintindex) ? item.paintindex : 0;
    const wear = Number.isFinite(item.wear) ? item.wear : 0;
    const seed = Number.isFinite(item.seed) ? item.seed : 0;
    const stattrak = item.stattrak ? 1 : 0;
    const nametag = item.nametag || null;

    // Map decoded stickers to the 5 slot columns, preserving the link's exact
    // position so positioned stickers render as inspected.
    const num = (n) => (Number.isFinite(n) ? n : 0);
    const stk = ["0;0;0;0;0;0;0", "0;0;0;0;0;0;0", "0;0;0;0;0;0;0", "0;0;0;0;0;0;0", "0;0;0;0;0;0;0"];
    for (const s of item.stickers || []) {
      if (s.slot >= 0 && s.slot < 5 && s.id > 0) {
        stk[s.slot] = `${s.id};0;${num(s.offX)};${num(s.offY)};${num(s.wear)};${num(s.scale)};${num(s.rotation)}`;
      }
    }

    const teams = teamsFrom(data.team);
    const rowValues = (team) => [steamid, team, defindex, paint, wear, seed, stattrak, nametag, ...stk];
    try {
      await db.query(
        `INSERT INTO wp_player_skins (steamid, weapon_team, weapon_defindex, weapon_paint_id, weapon_wear, weapon_seed, weapon_stattrak, weapon_nametag, weapon_sticker_0, weapon_sticker_1, weapon_sticker_2, weapon_sticker_3, weapon_sticker_4) VALUES ${teams.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE weapon_paint_id = VALUES(weapon_paint_id), weapon_wear = VALUES(weapon_wear), weapon_seed = VALUES(weapon_seed), weapon_stattrak = VALUES(weapon_stattrak), weapon_nametag = VALUES(weapon_nametag), weapon_sticker_0 = VALUES(weapon_sticker_0), weapon_sticker_1 = VALUES(weapon_sticker_1), weapon_sticker_2 = VALUES(weapon_sticker_2), weapon_sticker_3 = VALUES(weapon_sticker_3), weapon_sticker_4 = VALUES(weapon_sticker_4)`,
        teams.flatMap(rowValues)
      );

      // Equip the matching knife/glove model so the item actually shows up.
      if (KNIFE_DEFINDEX_TO_NAME[defindex]) {
        const knife = KNIFE_DEFINDEX_TO_NAME[defindex];
        await db.query(
          `INSERT INTO wp_player_knife (steamid, weapon_team, knife) VALUES ${teams.map(() => "(?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE knife = VALUES(knife)`,
          teams.flatMap((t) => [steamid, t, knife])
        );
      } else if (defindex >= GLOVE_DEFINDEX_MIN) {
        await db.query(
          `INSERT INTO wp_player_gloves (steamid, weapon_team, weapon_defindex) VALUES ${teams.map(() => "(?, ?, ?)").join(", ")} ON DUPLICATE KEY UPDATE weapon_defindex = VALUES(weapon_defindex)`,
          teams.flatMap((t) => [steamid, t, defindex])
        );
      }

      socket.emit("inspect-applied", {
        ok: true,
        weaponid: defindex,
        paintid: paint,
        isKnife: !!KNIFE_DEFINDEX_TO_NAME[defindex],
        isGlove: defindex >= GLOVE_DEFINDEX_MIN,
      });
    } catch (err) {
      dbg("apply-inspect skins SQL ERROR", err.message);
      socket.emit("inspect-applied", { ok: false, error: "DB_ERROR" });
    }
  });
});
