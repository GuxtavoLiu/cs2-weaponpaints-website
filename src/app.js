const express = require("express");
const passport = require("passport");
const session = require("express-session");
const FileStore = require("session-file-store")(session);
const passportSteam = require("passport-steam");
const SteamStrategy = passportSteam.Strategy;
const mysql = require("mysql");
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

// connect to db
const connection = mysql.createConnection({
  host: config.DB.DB_HOST,
  user: config.DB.DB_USER,
  database: config.DB.DB_DB,
  password: config.DB.DB_PASS,
  port: config.DB.DB_PORT,
});
connection.connect(function (err) {
  if (err) {
    return console.error("Error: " + err.message);
  } else {
    console.log("Connected to MySQL!");
  }
});

// heartbeat for db
setInterval(() => {
  connection.query("SELECT 1", (err, res, fields) => {});
}, 10000);

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

app.get(config.SUBDIR, (req, res) => {
  if (typeof req.user != "undefined") {
    try {
      connection.query(
        "SELECT * FROM wp_player_knife WHERE steamid = ?",
        [req.user.id],
        (err, results, fields) => {
          connection.query(
            "SELECT * FROM wp_player_skins WHERE steamid = ?",
            [req.user.id],
            (err, results2, fields) => {
              connection.query(
                "SELECT * FROM wp_player_agents WHERE steamid = ?",
                [req.user.id],
                (err, results3, fields) => {
                  connection.query(
                    "SELECT * FROM wp_player_music WHERE steamid = ?",
                    [req.user.id],
                    (err, results4, fields) => {
                      connection.query(
                        "SELECT * FROM wp_player_gloves WHERE steamid = ?",
                        [req.user.id],
                        (err, results5, fields) => {
                          results = results !=undefined ? results : [];
                          results2 = results2 !=undefined ? results2 : [];
                          results3 = results3 !=undefined ? results3 : [];
                          results4 = results4 !=undefined ? results4 : [];
                          results5 = results5 !=undefined ? results5 : [];
                          res.render("index", {
                            config: config,
                            session: req.session,
                            user: req.user,
                            knife: results[0],
                            skins: results2,
                            agents: results3[0],
                            musics: results4[0],
                            gloves: results5[0],
                            lang: langs[pickLangCode(req)],
                            langCode: pickLangCode(req),
                            availableLangs: availableLangs,
                            subdir: config.SUBDIR,
                          });
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    } catch (e) {
      console.log(e);
    }
  } else {
    res.render("index", {
      config: config,
      session: req.session,
      user: req.user,
      lang: langs[pickLangCode(req)],
      langCode: pickLangCode(req),
      availableLangs: availableLangs,
      subdir: config.SUBDIR,
    });
  }
});

// Switch the UI language: store the choice in the session and return to the
// page the user came from. Unknown codes are ignored (keeps current language).
app.get(`${config.SUBDIR}api/lang/:code`, (req, res) => {
  if (langs[req.params.code]) req.session.lang = req.params.code;
  res.redirect(req.get("Referer") || config.SUBDIR);
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

app.get("/api/delete", (req, res) => {
  connection.query(
    "DELETE FROM wp_player_knife WHERE steamid = ?",
    [req.user.id],
    (err, results, fields) => {
      connection.query(
        "DELETE FROM wp_player_skins WHERE steamid = ?",
        [req.user.id],
        (err, results, fields) => {
          req.session.destroy((err) => {
            res.redirect("/");
          });
        }
      );
    }
  );
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

  socket.on("change-knife", (data) => {
    dbg("change-knife recv", data);
    // weapon_team in PK -> write both teams (2/3) via upsert.
    connection.query(
      "INSERT INTO wp_player_knife (steamid, weapon_team, knife) VALUES (?, 2, ?), (?, 3, ?) ON DUPLICATE KEY UPDATE knife = VALUES(knife)",
      [data.steamUserId, data.weaponid, data.steamUserId, data.weaponid],
      (err, results, fields) => {
        if (err) dbg("change-knife SQL ERROR", err.message);
        socket.emit("knife-changed", { knife: data.weaponid });
      }
    );
  });

  socket.on("change-glove", (data) => {
    dbg("change-glove recv", data);
    connection.query(
      "INSERT INTO wp_player_gloves (steamid, weapon_team, weapon_defindex) VALUES (?, 2, ?), (?, 3, ?) ON DUPLICATE KEY UPDATE weapon_defindex = VALUES(weapon_defindex)",
      [data.steamUserId, data.weaponid, data.steamUserId, data.weaponid],
      (err, results, fields) => {
        if (err) dbg("change-glove SQL ERROR", err.message);
        socket.emit("glove-changed", { knife: data.weaponid });
      }
    );
  });

  socket.on("change-music", (data) => {
    dbg("change-music recv", data);
    connection.query(
      "INSERT INTO wp_player_music (steamid, weapon_team, music_id) VALUES (?, 2, ?), (?, 3, ?) ON DUPLICATE KEY UPDATE music_id = VALUES(music_id)",
      [data.steamid, data.id, data.steamid, data.id],
      (err, results, fields) => {
        if (err) dbg("change-music SQL ERROR", err.message);
        socket.emit("music-changed", { music: data.id });
      }
    );
  });

  socket.on("change-skin", (data) => {
    dbg("change-skin recv", data);
    // weapon_team is part of the composite PK and has no default; write rows for
    // both teams (2=T, 3=CT) so the skin applies regardless of side. Upsert keeps
    // it idempotent when the weapon already has a row.
    connection.query(
      "INSERT INTO wp_player_skins (steamid, weapon_team, weapon_defindex, weapon_paint_id) VALUES (?, 2, ?, ?), (?, 3, ?, ?) ON DUPLICATE KEY UPDATE weapon_paint_id = VALUES(weapon_paint_id)",
      [data.steamid, data.weaponid, data.paintid, data.steamid, data.weaponid, data.paintid],
      (err, results, fields) => {
        if (err) dbg("change-skin SQL ERROR", err.message);
        else dbg("change-skin SQL ok affectedRows=", results.affectedRows);
        connection.query(
          "SELECT * FROM wp_player_skins WHERE steamid = ?",
          [data.steamid],
          (err, results2, fields) => {
            socket.emit("skin-changed", {
              weaponid: data.weaponid,
              paintid: data.paintid,
              newSkins: results2,
            });
          }
        );
      }
    );
  });

  socket.on("change-agent", (data) => {
    connection.query(
      "SELECT * FROM wp_player_agents WHERE steamid = ?",
      [data.steamid],
      (err, results, fields) => {
        if (err) throw err;
        if (results.length >= 1) {
          connection.query(
            `UPDATE wp_player_agents SET agent_${data.team} = ? WHERE steamid = ?`,
            [data.model, data.steamid],
            (err, results, fields) => {
              if (err) throw err;
              connection.query(
                "SELECT * FROM wp_player_agents WHERE steamid = ?",
                [data.steamid],
                (err, results2, fields) => {
                  if (err) throw err;
                  socket.emit("agent-changed", {
                    agents: results2,
                    currentAgent: data.model,
                  });
                }
              );
            }
          );
        } else {
          connection.query(
            `INSERT INTO wp_player_agents (steamid, agent_${data.team}) VALUES (?, ?)`,
            [data.steamid, data.model],
            (err, results, fields) => {
              if (err) throw err;
              connection.query(
                "SELECT * FROM wp_player_agents WHERE steamid = ?",
                [data.steamid],
                (err, results2, fields) => {
                  if (err) throw err;
                  socket.emit("agent-changed", {
                    agents: results2,
                    currentAgent: data.model,
                  });
                }
              );
            }
          );
        }
      }
    );
  });

  // Rebuild a canonical sticker slot string from untrusted client input. The
  // plugin format is "id;schema;x;y;wear;scale;rotation"; we only let the user
  // pick the sticker id + wear and force the default position (everything 0).
  const sanitizeSticker = (s) => {
    if (typeof s !== "string") return "0;0;0;0;0;0;0";
    const parts = s.split(";");
    const id = parseInt(parts[0], 10);
    if (!Number.isFinite(id) || id <= 0) return "0;0;0;0;0;0;0";
    let wear = parseFloat(parts[4]);
    if (!Number.isFinite(wear)) wear = 0;
    wear = Math.min(1, Math.max(0, wear));
    return `${id};0;0;0;${wear};0;0`;
  };

  socket.on("change-params", (data) => {
    dbg("change-params recv", data);
    const wear = parseFloat(data.float);
    const seed = parseInt(data.pattern, 10) || 0;
    const safeWear = Number.isFinite(wear) ? wear : 0;
    const stattrak = data.stattrak ? 1 : 0;
    const stickersIn = Array.isArray(data.stickers) ? data.stickers : [];
    const stk = [0, 1, 2, 3, 4].map((i) => sanitizeSticker(stickersIn[i]));
    // The modal carries weapon_defindex + paint_id, so a single click can fully
    // create the skin row (paint + wear + seed + stattrak + stickers) for both
    // teams, not just update a pre-existing one. weapon_team is in the PK, so it
    // must be supplied.
    const rowValues = (team) => [data.steamid, team, data.weaponid, data.paintid, safeWear, seed, stattrak, ...stk];
    connection.query(
      "INSERT INTO wp_player_skins (steamid, weapon_team, weapon_defindex, weapon_paint_id, weapon_wear, weapon_seed, weapon_stattrak, weapon_sticker_0, weapon_sticker_1, weapon_sticker_2, weapon_sticker_3, weapon_sticker_4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE weapon_paint_id = VALUES(weapon_paint_id), weapon_wear = VALUES(weapon_wear), weapon_seed = VALUES(weapon_seed), weapon_stattrak = VALUES(weapon_stattrak), weapon_sticker_0 = VALUES(weapon_sticker_0), weapon_sticker_1 = VALUES(weapon_sticker_1), weapon_sticker_2 = VALUES(weapon_sticker_2), weapon_sticker_3 = VALUES(weapon_sticker_3), weapon_sticker_4 = VALUES(weapon_sticker_4)",
      [...rowValues(2), ...rowValues(3)],
      (err, results, fields) => {
        if (err) dbg("change-params SQL ERROR", err.message);
        else dbg("change-params SQL ok affectedRows=", results.affectedRows);
        // Return the fresh rows so the client can refresh its in-memory skins and
        // re-open the modal with the saved stickers without a page reload.
        connection.query(
          "SELECT * FROM wp_player_skins WHERE steamid = ?",
          [data.steamid],
          (err2, results2, fields2) => {
            socket.emit("params-changed", { newSkins: results2 || [] });
          }
        );
      }
    );
  });

  socket.on("reset-skin", (data) => {
    connection.query(
      "DELETE FROM wp_player_skins WHERE steamid = ? AND weapon_defindex = ?",
      [data.steamid, data.weaponid],
      (err, results, fields) => {
        socket.emit("skin-reset", { weaponid: data.weaponid });
      }
    );
  });

  // Apply a full item from a (masked) CS2 inspect link: decode it locally and
  // write the weapon + paint + wear + seed + stattrak + nametag + stickers into
  // wp_player_skins for both teams, equipping the knife/glove model when needed.
  socket.on("apply-inspect", (data) => {
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

    const rowValues = (team) => [steamid, team, defindex, paint, wear, seed, stattrak, nametag, ...stk];
    connection.query(
      "INSERT INTO wp_player_skins (steamid, weapon_team, weapon_defindex, weapon_paint_id, weapon_wear, weapon_seed, weapon_stattrak, weapon_nametag, weapon_sticker_0, weapon_sticker_1, weapon_sticker_2, weapon_sticker_3, weapon_sticker_4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?), (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE weapon_paint_id = VALUES(weapon_paint_id), weapon_wear = VALUES(weapon_wear), weapon_seed = VALUES(weapon_seed), weapon_stattrak = VALUES(weapon_stattrak), weapon_nametag = VALUES(weapon_nametag), weapon_sticker_0 = VALUES(weapon_sticker_0), weapon_sticker_1 = VALUES(weapon_sticker_1), weapon_sticker_2 = VALUES(weapon_sticker_2), weapon_sticker_3 = VALUES(weapon_sticker_3), weapon_sticker_4 = VALUES(weapon_sticker_4)",
      [...rowValues(2), ...rowValues(3)],
      (err) => {
        if (err) {
          dbg("apply-inspect skins SQL ERROR", err.message);
          socket.emit("inspect-applied", { ok: false, error: "DB_ERROR" });
          return;
        }

        // Equip the matching knife/glove model so the item actually shows up.
        const finish = () =>
          socket.emit("inspect-applied", {
            ok: true,
            weaponid: defindex,
            paintid: paint,
            isKnife: !!KNIFE_DEFINDEX_TO_NAME[defindex],
            isGlove: defindex >= GLOVE_DEFINDEX_MIN,
          });

        if (KNIFE_DEFINDEX_TO_NAME[defindex]) {
          const knife = KNIFE_DEFINDEX_TO_NAME[defindex];
          connection.query(
            "INSERT INTO wp_player_knife (steamid, weapon_team, knife) VALUES (?, 2, ?), (?, 3, ?) ON DUPLICATE KEY UPDATE knife = VALUES(knife)",
            [steamid, knife, steamid, knife],
            finish
          );
        } else if (defindex >= GLOVE_DEFINDEX_MIN) {
          connection.query(
            "INSERT INTO wp_player_gloves (steamid, weapon_team, weapon_defindex) VALUES (?, 2, ?), (?, 3, ?) ON DUPLICATE KEY UPDATE weapon_defindex = VALUES(weapon_defindex)",
            [steamid, defindex, steamid, defindex],
            finish
          );
        } else {
          finish();
        }
      }
    );
  });
});
