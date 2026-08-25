/* ============================================================
   NEW GROWN DIAMOND — AUTO JOURNEY (hybrid navigation)
   ------------------------------------------------------------
   Lets the site play itself like a film while the visitor stays
   in command. Auto mode is a CHAUFFEUR FOR THE SCROLL POSITION:
   it glides the page through its cinematic chapters (the same
   ScrollTrigger-driven scenes the visitor would scrub by hand),
   dwelling on each beat. Because scroll remains the single
   source of truth, handing control back to the visitor is
   seamless by construction — cancelling mid-glide simply leaves
   the page exactly where it is and the scrub owns it.

     · Toggle  [ ● Auto Explore ]  bottom-left. Desktop default:
       ON for on-page scenes. Mobile default: OFF (a simplified
       three-beat tour when enabled). prefers-reduced-motion:
       the module is inert and injects nothing.
     · USER ACTION ALWAYS WINS: any pointer, wheel, touch, key,
       focus, menu, or modal suspends the journey instantly and
       cancels any pending page navigation. Soft interruptions
       (hover, a nudge of scroll) resume after a short idle;
       hard ones (clicks, menus, modals, form focus) wait for the
       interaction to end plus a longer idle. Links stay live
       throughout — navigation is never blocked.
     · Page-to-page continuation (home → manufacturing →
       diamonds → jewellery) happens ONLY when the visitor has
       explicitly switched Auto Explore on themselves (stored for
       the session as 'user-on'); the default-on scene tour ends
       quietly on its page. Before continuing, an elegant
       "NEXT · <chapter>" line fills — any interaction cancels it.
       Departures use the SAME cinematic transition engine as
       clicks (NGDPageTransitions.navigate).

   Session memory: sessionStorage 'ngd-auto-explore' ∈
   {'on','off','user-on'} — a preference, nothing sensitive.

   Test/debug API: window.NGDAutoJourney = { state, start, stop,
   suspend, tune } — tune() shrinks timings for deterministic
   tests, it never changes behaviour.
   ============================================================ */
(function () {
  'use strict';

  var reduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    window.NGDAutoJourney = { state: { inert: true } };
    return;
  }

  var isMobile =
    window.matchMedia('(max-width: 991.98px)').matches ||
    window.matchMedia('(pointer: coarse)').matches;

  var PAGE = document.body.getAttribute('data-ngd-page') || '';
  var NEXT_PAGE = {
    home: ['manufacturing.html', 'Manufacturing'],
    manufacturing: ['diamonds.html', 'Diamond Inventory'],
    diamonds: ['jewellery.html', 'The Jewellery Atelier'],
    jewellery: null
  };
  if (!(PAGE in NEXT_PAGE)) return; // journey runs on the four chapter pages

  /* ---------- timings (tune() may shrink for tests) ---------- */
  var T = {
    startIdle: 3500,     // required quiet time before the tour begins
    dwell: 3200,         // pause on each beat
    glideMin: 1600,      // shortest glide duration
    glideMax: 4200,      // longest glide duration
    softIdle: 6000,      // resume after hover / small scroll
    hardIdle: 10000,     // resume after clicks / menus / modals
    navCountdown: 6000   // "NEXT ·" fill before continuing to the next page
  };

  /* ---------- session preference ---------- */
  function readMode() {
    try { return sessionStorage.getItem('ngd-auto-explore'); } catch (e) { return null; }
  }
  function writeMode(value) {
    try { sessionStorage.setItem('ngd-auto-explore', value); } catch (e) { /* ok */ }
  }

  var stored = readMode();
  var mode = stored || (isMobile ? 'off' : 'on');
  if (stored !== 'on' && stored !== 'off' && stored !== 'user-on') mode = isMobile ? 'off' : 'on';

  /* ---------- state ---------- */
  var running = false;        // a tour is in progress on this page
  var suspended = false;
  var completed = false;
  var stepIndex = -1;
  var autoScrolling = false;  // our own glide is moving the page
  var lastGlideAt = 0;        // scroll events trail the glide asynchronously
  var glideRaf = null;
  var dwellTimer = null;
  var resumeTimer = null;
  var navTimer = null;
  var navRaf = null;
  var navArmed = false;
  var hardHolds = 0;          // open menu / modal / focused field

  /* ---------- beats: where the film pauses ---------- */
  function collectBeats() {
    var beats = [];
    function push(el, align) { if (el) beats.push({ el: el, align: align || 'center' }); }

    if (PAGE === 'home' || PAGE === 'manufacturing') {
      var stages = document.querySelectorAll('.ngd-story-stage[data-slug]');
      if (isMobile && stages.length) {
        push(stages[0]);
        push(stages[Math.floor(stages.length / 2)]);
        push(stages[stages.length - 1]);
      } else {
        stages.forEach(function (el) { push(el); });
      }
      if (PAGE === 'home') push(document.getElementById('fine-jewellery'), 'start');
    } else if (PAGE === 'diamonds') {
      push(document.getElementById('inv-grid'), 'start');
    } else if (PAGE === 'jewellery') {
      push(document.getElementById('jw-grid'), 'start');
    }
    return beats;
  }

  function beatTop(beat) {
    var rect = beat.el.getBoundingClientRect();
    var top = rect.top + window.scrollY;
    if (beat.align === 'center') {
      return Math.max(0, top - (window.innerHeight - rect.height) / 2);
    }
    return Math.max(0, top - window.innerHeight * 0.12);
  }

  /* ---------- the glide (our scroll tween) ---------- */
  var easeInOut = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  function glideTo(targetY, done) {
    var fromY = window.scrollY;
    var dist = Math.abs(targetY - fromY);
    if (dist < 4) { done(); return; }
    var duration = Math.min(T.glideMax, Math.max(T.glideMin, dist * 1.1));
    var start = performance.now();
    autoScrolling = true;

    function frame(now) {
      if (!running || suspended) { autoScrolling = false; return; }
      var p = Math.min(1, (now - start) / duration);
      lastGlideAt = now;
      window.scrollTo({ top: fromY + (targetY - fromY) * easeInOut(p), behavior: 'instant' });
      if (p < 1) {
        glideRaf = requestAnimationFrame(frame);
      } else {
        autoScrolling = false;
        glideRaf = null;
        done();
      }
    }
    glideRaf = requestAnimationFrame(frame);
  }

  /* ---------- tour engine ---------- */
  function clearTimers() {
    if (glideRaf) { cancelAnimationFrame(glideRaf); glideRaf = null; }
    if (dwellTimer) { clearTimeout(dwellTimer); dwellTimer = null; }
    if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
    disarmPageNav();
    autoScrolling = false;
  }

  function heroReady() {
    if (window.NGDHeroReal && window.NGDHeroReal.active) {
      return window.NGDHeroReal.state.settled(); // photographic hero film
    }
    if (window.NGDHero3D && window.NGDHero3D.state && typeof window.NGDHero3D.state.settled === 'function') {
      return window.NGDHero3D.state.settled();
    }
    return true; // no film on this page — ready immediately
  }

  function nextStep() {
    if (!running || suspended) return;
    var beats = collectBeats();
    stepIndex += 1;
    if (stepIndex >= beats.length) {
      running = false;
      completed = true;
      if (mode === 'user-on') armPageNav();
      return;
    }
    glideTo(beatTop(beats[stepIndex]), function () {
      dwellTimer = setTimeout(nextStep, T.dwell);
    });
  }

  function beginTour() {
    if (running || completed || mode === 'off' || suspended) return;
    if (!heroReady()) {
      dwellTimer = setTimeout(beginTour, 400);
      return;
    }
    running = true;
    stepIndex = -1;
    dwellTimer = setTimeout(nextStep, T.dwell * 0.6);
  }

  /* ---------- "NEXT · <chapter>" continuation ---------- */
  var indicator = null;
  var indicatorFill = null;

  function buildIndicator() {
    indicator = document.createElement('button');
    indicator.type = 'button';
    indicator.className = 'ngd-auto-next';
    indicator.setAttribute('aria-label', 'Continue to the next chapter now');
    var next = NEXT_PAGE[PAGE];
    indicator.innerHTML =
      '<span class="ngd-auto-next-label">Next · ' + next[1] + '</span>' +
      '<span class="ngd-auto-next-track" aria-hidden="true">' +
      '<span class="ngd-auto-next-fill"></span></span>';
    indicatorFill = indicator.querySelector('.ngd-auto-next-fill');
    indicator.addEventListener('click', function (event) {
      event.stopPropagation();
      goNext();
    });
    document.body.appendChild(indicator);
  }

  function armPageNav() {
    var next = NEXT_PAGE[PAGE];
    if (!next) return;
    if (!(window.NGDPageTransitions && typeof window.NGDPageTransitions.navigate === 'function')) return;
    if (!indicator) buildIndicator();
    navArmed = true;
    indicator.classList.add('is-shown');
    var start = performance.now();
    function fill(now) {
      if (!navArmed) return;
      var p = Math.min(1, (now - start) / T.navCountdown);
      indicatorFill.style.transform = 'scaleX(' + p.toFixed(4) + ')';
      if (p < 1) { navRaf = requestAnimationFrame(fill); return; }
      goNext();
    }
    navRaf = requestAnimationFrame(fill);
  }

  function disarmPageNav() {
    navArmed = false;
    if (navRaf) { cancelAnimationFrame(navRaf); navRaf = null; }
    if (navTimer) { clearTimeout(navTimer); navTimer = null; }
    if (indicator) {
      indicator.classList.remove('is-shown');
      if (indicatorFill) indicatorFill.style.transform = 'scaleX(0)';
    }
  }

  function goNext() {
    var next = NEXT_PAGE[PAGE];
    disarmPageNav();
    if (next) window.NGDPageTransitions.navigate(next[0]);
  }

  /* ---------- suspension: the visitor always wins ---------- */
  function suspend(kind) {
    clearTimers();
    suspended = true;
    running = false;
    if (mode === 'off' || completed) return;
    if (hardHolds > 0) return; // wait for the menu/modal/field to close first
    var idle = isMobile ? 12000 : (kind === 'soft' ? T.softIdle : T.hardIdle);
    resumeTimer = setTimeout(function () {
      suspended = false;
      resumeTour();
    }, idle);
  }

  /* pick the film back up at the CURRENT beat — never from the top */
  function resumeTour() {
    if (mode === 'off' || completed || suspended) return;
    if (!heroReady()) {
      dwellTimer = setTimeout(resumeTour, 400);
      return;
    }
    running = true;
    stepIndex = Math.max(-1, stepIndex - 1);
    nextStep();
  }

  function hold() { hardHolds += 1; suspend('hard'); }
  function release() {
    hardHolds = Math.max(0, hardHolds - 1);
    if (hardHolds === 0 && mode !== 'off' && !completed) suspend('hard'); // restart the idle clock
  }

  function bindActivity() {
    ['pointerdown', 'keydown'].forEach(function (type) {
      document.addEventListener(type, function () { suspend('hard'); }, { capture: true, passive: true });
    });
    ['wheel', 'touchstart'].forEach(function (type) {
      document.addEventListener(type, function () { suspend('soft'); }, { capture: true, passive: true });
    });
    /* scroll we did not cause = the visitor (or an anchor jump).
       Browsers deliver scroll events asynchronously, so events can
       trail our own glide — attribute anything within 250ms of the
       last glide frame to ourselves. */
    window.addEventListener('scroll', function () {
      if (autoScrolling) return;
      if (performance.now() - lastGlideAt < 250) return;
      if (running || navArmed) suspend('soft');
    }, { passive: true });

    /* hovering a product or scene: let the customer look */
    if (!isMobile) {
      document.addEventListener('pointerover', function (event) {
        if (!(running || navArmed)) return;
        if (event.target && event.target.closest &&
            event.target.closest('.ngd-diamond-card, .ngd-jewel-card, .ngd-story-stage, [data-ngd-tilt]')) {
          suspend('soft');
        }
      }, { passive: true });
    }

    document.addEventListener('focusin', function (event) {
      var t = event.target;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) hold();
    });
    document.addEventListener('focusout', function (event) {
      var t = event.target;
      if (t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) release();
    });
    document.addEventListener('show.bs.offcanvas', hold);
    document.addEventListener('hidden.bs.offcanvas', release);
    document.addEventListener('show.bs.modal', hold);
    document.addEventListener('hidden.bs.modal', release);
  }

  /* ---------- the toggle ---------- */
  var toggle = null;

  function renderToggle() {
    toggle.setAttribute('aria-pressed', mode === 'off' ? 'false' : 'true');
    toggle.classList.toggle('is-on', mode !== 'off');
  }

  function buildToggle() {
    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'ngd-auto-toggle';
    toggle.innerHTML = '<span class="ngd-auto-dot" aria-hidden="true"></span>' +
                       '<span>Auto Explore</span>';
    toggle.addEventListener('click', function (event) {
      event.stopPropagation();
      if (mode === 'off') {
        mode = 'user-on';           // an explicit choice — chapters may continue across pages
        writeMode('user-on');
        completed = false;
        suspended = false;
        clearTimers();
        stepIndex = -1;
        beginTour();
      } else {
        mode = 'off';
        writeMode('off');
        suspended = false;
        running = false;
        clearTimers();
      }
      renderToggle();
    });
    renderToggle();
    document.body.appendChild(toggle);
  }

  /* ---------- public API ---------- */
  window.NGDAutoJourney = {
    state: {
      mode: function () { return mode; },
      running: function () { return running; },
      suspended: function () { return suspended; },
      completed: function () { return completed; },
      step: function () { return stepIndex; },
      navArmed: function () { return navArmed; },
      beats: function () { return collectBeats().length; },
      profile: isMobile ? 'mobile' : 'desktop'
    },
    start: beginTour,
    stop: function () {
      mode = 'off';
      writeMode('off');
      running = false;
      clearTimers();
      if (toggle) renderToggle();
    },
    suspend: suspend,
    tune: function (overrides) {
      Object.keys(overrides || {}).forEach(function (key) {
        if (key in T) T[key] = overrides[key];
      });
    }
  };

  /* ---------- boot ---------- */
  function init() {
    try {
      buildToggle();
      bindActivity();
      if (mode !== 'off') {
        dwellTimer = setTimeout(beginTour, T.startIdle);
      }
    } catch (err) {
      console.warn('[NGD Cinematic] auto journey disabled:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
