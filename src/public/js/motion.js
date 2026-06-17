/* ============================================================================
   motion.js — "minimalista overpowered" motion layer
   Plain (non-module) script loaded after the app scripts. It only READS the
   existing DOM/markup and attaches movement; it never changes business logic,
   class contracts, ids or data-* used by the rest of the app.

   Pieces: cursor spotlight, 3D tilt on skin cards (event-delegated so it keeps
   working across re-renders), staggered reveal-on-scroll, magnetic buttons,
   click ripple, sliding sidebar marker, and a condensing navbar.
   Everything is a no-op under prefers-reduced-motion.
   ============================================================================ */
(function () {
  'use strict';

  var reduce = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn, { once: true });
    } else {
      fn();
    }
  }

  ready(function () {
    setupRipple();         // cheap + useful even with reduced motion
    setupTitleTooltips();  // informational, not movement — always on
    if (reduce) return;    // skip the rest of the movement
    setupSpotlight();
    setupCardTilt();
    setupReveal();
    setupMagnetic();
    setupSidebarMarker();
    setupNavbarCondense();
  });

  /* ---- Cursor spotlight ------------------------------------------------- */
  function setupSpotlight() {
    var el = document.createElement('div');
    el.className = 'fx-spotlight';
    document.body.appendChild(el);
    window.addEventListener('mousemove', function (e) {
      el.style.setProperty('--mx', e.clientX + 'px');
      el.style.setProperty('--my', e.clientY + 'px');
    }, { passive: true });
  }

  /* ---- 3D tilt + parallax on skin cards --------------------------------- */
  /* One delegated listener on #skinsContainer (which persists while its
     innerHTML is swapped on every category/search render), so we never attach
     per-card listeners to the hundreds of cards. */
  function setupCardTilt() {
    var container = document.getElementById('skinsContainer');
    if (!container) return;
    var current = null;
    var raf = 0;

    function reset(card) {
      if (card) card.style.transform = '';
    }

    container.addEventListener('mousemove', function (e) {
      var card = e.target.closest ? e.target.closest('.weapon-card') : null;
      if (card !== current) {
        reset(current);
        current = card;
      }
      if (!card) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(function () {
        card.style.transform =
          'translateY(-6px) rotateX(' + (-py * 6).toFixed(2) +
          'deg) rotateY(' + (px * 8).toFixed(2) + 'deg)';
      });
    }, { passive: true });

    container.addEventListener('mouseleave', function () {
      reset(current);
      current = null;
    });
  }

  /* ---- Staggered reveal-on-scroll for newly rendered cards -------------- */
  function setupReveal() {
    var container = document.getElementById('skinsContainer');
    if (!container || !('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var card = entry.target;
        io.unobserve(card);
        card.classList.add('fx-in');
        var delay = parseFloat(card.style.transitionDelay) || 0;
        // Once revealed, drop the reveal classes so the card's own (snappier)
        // transition governs the tilt instead of the slower reveal one.
        window.setTimeout(function () {
          card.classList.remove('fx-reveal', 'fx-in');
          card.style.transitionDelay = '';
        }, (delay * 1000) + 650);
      });
    }, { threshold: 0.12 });

    var scheduled = false;
    function processNew() {
      scheduled = false;
      var fresh = container.querySelectorAll('.weapon-card:not([data-fx])');
      for (var i = 0; i < fresh.length; i++) {
        var card = fresh[i];
        card.setAttribute('data-fx', '1');
        card.classList.add('fx-reveal');
        card.style.transitionDelay = Math.min(i * 40, 400) + 'ms';
        io.observe(card);
      }
    }
    function schedule() {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(processNew);
    }

    new MutationObserver(schedule).observe(container, { childList: true, subtree: true });
    processNew(); // any cards already present
  }

  /* ---- Magnetic buttons (elements tagged .magnetic in the markup) ------- */
  function setupMagnetic() {
    var strength = 16;
    document.querySelectorAll('.magnetic').forEach(function (el) {
      el.addEventListener('mousemove', function (e) {
        var r = el.getBoundingClientRect();
        var mx = (e.clientX - r.left) / r.width - 0.5;
        var my = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = 'translate(' + (mx * strength).toFixed(1) + 'px,' +
          (my * strength).toFixed(1) + 'px)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = '';
      });
    });
  }

  /* ---- Full-name tooltip for truncated skin titles --------------------- */
  /* Skin names ellipsise to fit the card; on hover we surface the full text in
     a small floating tip. Delegated on #skinsContainer so it covers re-renders,
     and only fires for titles that are actually truncated. */
  function setupTitleTooltips() {
    var container = document.getElementById('skinsContainer');
    if (!container) return;

    var tip = document.createElement('div');
    tip.className = 'fx-tip';
    document.body.appendChild(tip);
    var hideTimer = 0;

    function truncated(el) {
      return el.scrollWidth > el.clientWidth + 1;
    }

    container.addEventListener('mouseover', function (e) {
      var el = e.target.closest ? e.target.closest('.weapon-skin-title') : null;
      if (!el || !truncated(el)) return;
      window.clearTimeout(hideTimer);
      tip.textContent = el.textContent.trim();
      tip.classList.add('show');
      var r = el.getBoundingClientRect();
      tip.style.left = (r.left + r.width / 2) + 'px';
      tip.style.top = (r.top - tip.offsetHeight - 8) + 'px';
    });

    container.addEventListener('mouseout', function (e) {
      var el = e.target.closest ? e.target.closest('.weapon-skin-title') : null;
      if (!el) return;
      hideTimer = window.setTimeout(function () { tip.classList.remove('show'); }, 60);
    });

    window.addEventListener('scroll', function () {
      tip.classList.remove('show');
    }, { passive: true });
  }

  /* ---- Click ripple on buttons (delegated; covers generated buttons) ---- */
  function setupRipple() {
    document.addEventListener('click', function (e) {
      var btn = e.target.closest ? e.target.closest('.btn') : null;
      // Skip dropdown toggles so we don't clip their caret with overflow:hidden.
      if (!btn || btn.classList.contains('dropdown-toggle')) return;
      var cs = getComputedStyle(btn);
      if (cs.position === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      var r = btn.getBoundingClientRect();
      var d = Math.max(r.width, r.height);
      var span = document.createElement('span');
      span.className = 'fx-ripple';
      span.style.width = span.style.height = d + 'px';
      span.style.left = (e.clientX - r.left - d / 2) + 'px';
      span.style.top = (e.clientY - r.top - d / 2) + 'px';
      btn.appendChild(span);
      window.setTimeout(function () { span.remove(); }, 650);
    }, { passive: true });
  }

  /* ---- Sliding marker behind the desktop sidebar nav items -------------- */
  function setupSidebarMarker() {
    var anchor = document.getElementById('sideBtnLoadout');
    var firstPush = anchor && anchor.closest('.pushable');
    var panel = firstPush && firstPush.parentElement;
    if (!panel) return;

    panel.classList.add('has-nav-marker');
    if (getComputedStyle(panel).position === 'static') panel.style.position = 'relative';

    var marker = document.createElement('div');
    marker.className = 'nav-marker';
    panel.insertBefore(marker, panel.firstChild);

    function activePush() {
      var act = panel.querySelector('.active-side');
      return act ? act.closest('.pushable') : null;
    }
    function moveTo(push) {
      if (!push) { marker.style.opacity = '0'; return; }
      marker.style.opacity = '1';
      marker.style.height = push.offsetHeight + 'px';
      marker.style.transform = 'translateY(' + push.offsetTop + 'px)';
    }

    panel.querySelectorAll('.pushable').forEach(function (push) {
      push.addEventListener('mouseenter', function () { moveTo(push); });
      // After a click switches the active category, re-settle on the new active.
      push.addEventListener('click', function () {
        window.setTimeout(function () { moveTo(activePush()); }, 60);
      });
    });
    panel.addEventListener('mouseleave', function () { moveTo(activePush()); });

    requestAnimationFrame(function () { moveTo(activePush()); });
  }

  /* ---- Navbar condenses once the page is scrolled ---------------------- */
  function setupNavbarCondense() {
    var nav = document.querySelector('.navbar.bg-nav');
    if (!nav) return;
    function onScroll() {
      nav.classList.toggle('shrink', window.scrollY > 20);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }
})();
