/* ============================================================================
   router.js — client-side URL routing (History API)

   The app switches categories by calling global functions (showRifles(),
   knifeSkins('weapon_ak47'), ...) that swap #skinsContainer. This adds real
   URLs on top WITHOUT changing those functions or any markup:

   - Each view function is wrapped so calling it (from a sidebar button, the
     Back button, search, anywhere) also pushes its canonical URL.
   - Back/forward (popstate) and direct access / refresh apply the URL by
     calling the ORIGINAL function, so no extra history entries are created.

   The server serves the same app shell for these paths (see renderApp in
   app.js), so deep links and refresh work.

   Path map:
     /loadout (and /)      -> showLoadout
     /knives               -> showKnives
     /gloves               -> showGloves
     /music                -> showMusics
     /pistols              -> showPistols
     /rifles               -> showRifles
     /smgs                 -> showPPs
     /heavy                -> showShotguns
     /utility              -> showUtility
     /agents/ct            -> showCTAgents
     /agents/t             -> showTAgents
     /weapon/:weapon_name  -> knifeSkins(weapon_name)
   ============================================================================ */
(function () {
  'use strict';

  function start() {
    // Only meaningful on the logged-in app (the grid + show* functions exist).
    if (!document.getElementById('skinsContainer')) return;
    if (typeof window.showLoadout !== 'function') return;

    // Constant-path views: window fn name -> canonical path.
    var SIMPLE = {
      showLoadout: '/loadout',
      showKnives: '/knives',
      showGloves: '/gloves',
      showMusics: '/music',
      showPistols: '/pistols',
      showRifles: '/rifles',
      showPPs: '/smgs',
      showShotguns: '/heavy',
      showUtility: '/utility',
      showCTAgents: '/agents/ct',
      showTAgents: '/agents/t'
    };

    // Keep the untouched originals so popstate / initial load can render a view
    // without pushing a new history entry.
    var orig = {};
    Object.keys(SIMPLE).forEach(function (name) {
      if (typeof window[name] === 'function') orig[name] = window[name];
    });
    orig.knifeSkins = (typeof window.knifeSkins === 'function') ? window.knifeSkins : null;

    function setUrl(path) {
      if (!path) return;
      var current = location.pathname.replace(/\/+$/, '') || '/';
      var next = path.replace(/\/+$/, '') || '/';
      if (current === next) return;
      history.pushState({ path: next }, '', next);
    }

    // Depth guard so a view that internally calls another wrapped view (e.g.
    // showUtility -> knifeSkins) only writes the OUTER view's URL once.
    var depth = 0;
    function wrap(fn, pathFor) {
      return function () {
        depth++;
        var result;
        try {
          result = fn.apply(this, arguments);
        } finally {
          depth--;
        }
        if (depth === 0) setUrl(pathFor.apply(null, arguments));
        return result;
      };
    }

    // Wrap the constant-path views.
    Object.keys(SIMPLE).forEach(function (name) {
      if (!orig[name]) return;
      var path = SIMPLE[name];
      window[name] = wrap(orig[name], function () { return path; });
    });

    // Wrap the parametric weapon view: /weapon/<weapon_name>.
    if (orig.knifeSkins) {
      window.knifeSkins = wrap(orig.knifeSkins, function (weaponName) {
        return weaponName ? '/weapon/' + encodeURIComponent(weaponName) : null;
      });
    }

    // Resolve a path to an ORIGINAL view call (no URL push).
    function applyRoute(pathname) {
      var p = (pathname || '/').replace(/\/+$/, '') || '/';

      if (p === '/' || p === '/loadout') return call(orig.showLoadout);

      var weapon = p.match(/^\/weapon\/([^\/?#]+)$/);
      if (weapon && orig.knifeSkins) return orig.knifeSkins(decodeURIComponent(weapon[1]));

      var byPath = {
        '/knives': orig.showKnives,
        '/gloves': orig.showGloves,
        '/music': orig.showMusics,
        '/musics': orig.showMusics,
        '/pistols': orig.showPistols,
        '/rifles': orig.showRifles,
        '/smgs': orig.showPPs,
        '/heavy': orig.showShotguns,
        '/utility': orig.showUtility,
        '/agents/ct': orig.showCTAgents,
        '/agents/t': orig.showTAgents
      };
      if (byPath[p]) return call(byPath[p]);

      // Unknown path: fall back to the loadout home.
      return call(orig.showLoadout);
    }

    function call(fn) { if (typeof fn === 'function') fn(); }

    // Back / forward.
    window.addEventListener('popstate', function () {
      applyRoute(location.pathname);
    });

    // Initial load: render the view for the current URL. templates.js already
    // rendered the loadout for '/' and '/loadout', so only act on other paths;
    // normalise '/' so the browser bar reads '/loadout'.
    var initial = location.pathname.replace(/\/+$/, '') || '/';
    if (initial === '/') {
      history.replaceState({ path: '/loadout' }, '', '/loadout');
    } else if (initial !== '/loadout') {
      applyRoute(initial);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
