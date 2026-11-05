/* ══════════════════════════════════════════════
   Sprite — expressive site guide widget
   Single-file drop-in. No dependencies.

   Source of truth: github.com/luishowin/sprite
   Website copy:    docs/assets/JS/sprite.js

   The file contains three layers:
     1. SpriteEmotion  — face geometry, animation and idle state
     2. SpriteChat     — injected widget, chat and offline fallback
     3. Configuration  — the only place site-specific values live

   The Cloudflare Worker lives in worker/sprite-proxy.js in the
   standalone repo, and cloudflare-worker/sprite-proxy.js on the site.
   The API key never exists in this file.
   ═══════════════════════════════════════════════ */

const SPRITE_CONFIG = Object.assign({
  /* The deployed proxy that holds the Fireworks key. Set to '' to run
     fully offline. The standalone demo overrides this before load. */
  apiUrl: 'https://sprite-proxy.howin329.workers.dev',
  maxHistory: 12,

  /* Optional idle overrides, merged into the controller timings. */
  idle: {},

  /* Presentation durations for conversational reactions. */
  ui: {
    reply: 2600,
    excited: 2400,
    sad: 4800,
    default: 2200,
    typing: 12000,
    open: 2000,
    greeting: 2500,
    navigate: 2200,
  },

  /* Site navigation used by the offline responses. */
  sections: {
    services: '/services/', labs: '/labs/', shop: '/shop/',
    work: '/work/', contact: '/contact/',
  },
}, window.SPRITE_CONFIG || {});

/* ─────────────────────────────────────────────
   SpriteEmotion
   ───────────────────────────────────────────── */

const SpriteEmotion = (() => {
  'use strict';

  const TIMINGS = Object.assign({
    blinkFirstMin: 1200,
    blinkFirstMax: 2600,
    blinkMin: 4000,
    blinkMax: 7000,
    doubleBlinkChance: 0.22,
    doubleBlinkGapMin: 140,
    doubleBlinkGapMax: 260,
    blinkDuration: 140,

    lookAroundAfterMin: 5000,
    lookAroundAfterMax: 10000,
    idleLookMin: 7000,
    idleLookMax: 14000,
    sleepAfter: 60000,
    wakeSmile: 1400,
    lookDurationMin: 2200,
    lookDurationMax: 3600,
    lookMoveMin: 420,
    lookMoveMax: 780,
  }, SPRITE_CONFIG.idle || {});

  const LEGACY = {
    idle: 'neutral',
    waving: 'smiling',
    dancing: 'excited',
    surprised: 'curious',
    thinking: 'curious',
    guessing: 'confused',
    bored: 'unimpressed',
    angry: 'sad',
    talking: 'smiling',
  };

  const eye = (overrides) => Object.assign({
    x: 0, y: 0, w: 1, h: 1, rot: 0, opacity: 1,
  }, overrides || {});

  const mouth = (overrides) => Object.assign({
    x: 0, y: 0, w: 0.55, h: 0.1, rot: 0, stroke: 2.4, opacity: 1,
  }, overrides || {});

  const NEUTRAL = {
    priority: 1,
    persistent: true,
    head: 0,
    eyes: { left: eye(), right: eye() },
    mouth: mouth(),
  };

  const EMOTIONS = {
    neutral: NEUTRAL,

    'looking-around': {
      priority: 2,
      duration: 3000,
      persistent: false,
      head: 0,
      eyes: { left: eye(), right: eye() },
      mouth: mouth(),
    },

    excited: {
      priority: 24,
      duration: 1800,
      head: 0,
      reaction: 'excited',
      eyes: {
        left: eye({ y: -1, w: 1.12, h: 1.12, rot: -2 }),
        right: eye({ y: -1, w: 1.12, h: 1.12, rot: 2 }),
      },
      mouth: mouth({ y: -0.5, w: 1.3, h: 1.3, stroke: 3.2 }),
    },

    happy: {
      priority: 18,
      duration: 2200,
      head: 0,
      reaction: 'happy',
      eyes: {
        left: eye({ y: -0.5, w: 1.05, h: 1.06 }),
        right: eye({ y: -0.5, w: 1.05, h: 1.06 }),
      },
      mouth: mouth({ w: 1.08, h: 0.72, stroke: 2.8 }),
    },

    'smug-proud': {
      priority: 20,
      duration: 3200,
      head: -3,
      reaction: 'proud',
      eyes: {
        left: eye({ h: 0.78, rot: 5 }),
        right: eye({ y: -1.5, h: 1.04, rot: -4 }),
      },
      mouth: mouth({ x: 2, w: 1.05, h: 0.56, rot: -10, stroke: 2.7 }),
    },

    smiling: {
      priority: 10,
      duration: 2200,
      head: 0,
      eyes: {
        left: eye({ h: 0.96 }),
        right: eye({ h: 0.96 }),
      },
      mouth: mouth({ w: 0.85, h: 0.48, stroke: 2.5 }),
    },

    sad: {
      priority: 20,
      duration: 5000,
      head: -2,
      eyes: {
        left: eye({ y: 2, h: 0.78, rot: 7 }),
        right: eye({ y: 2, h: 0.78, rot: -7 }),
      },
      mouth: mouth({ y: 1, w: 0.82, h: -0.62, stroke: 2.6 }),
    },

    suspicious: {
      priority: 16,
      duration: 4000,
      head: 1.5,
      eyes: {
        left: eye({ h: 1, rot: -3 }),
        right: eye({ x: 1.5, y: 2, h: 0.55, rot: 10 }),
      },
      mouth: mouth({ x: 2, w: 0.85, h: 0.4, rot: -10, stroke: 2.6 }),
    },

    confused: {
      priority: 14,
      duration: 3500,
      head: -5,
      eyes: {
        left: eye({ y: -1.5, h: 1.08, rot: -6 }),
        right: eye({ y: 2, h: 0.82, rot: 8 }),
      },
      mouth: mouth({ x: -1.5, w: 0.5, h: 0.32, rot: 8, stroke: 2.5 }),
    },

    curious: {
      priority: 14,
      duration: 3000,
      head: 3,
      eyes: {
        left: eye({ y: -1, h: 1.06, rot: -2 }),
        right: eye({ y: 1, h: 1.02, rot: 2 }),
      },
      mouth: mouth({ x: 0.8, w: 0.42, h: 0.42, rot: -3, stroke: 2.4 }),
    },

    unimpressed: {
      priority: 12,
      duration: 3000,
      head: 0,
      eyes: {
        left: eye({ y: 1.5, w: 1.02, h: 0.58 }),
        right: eye({ y: 1.5, w: 1.02, h: 0.58 }),
      },
      mouth: mouth({ w: 0.9, h: 0.08, stroke: 2.6 }),
    },

    sleeping: {
      priority: 0,
      persistent: true,
      head: 3,
      eyes: {
        left: eye({ y: 1.5, w: 1.28, h: 0.12, opacity: 0.9 }),
        right: eye({ y: 1.5, w: 1.28, h: 0.12, opacity: 0.9 }),
      },
      mouth: mouth({ w: 0.72, h: 0.12, stroke: 2.3 }),
    },
  };

  const FACE_HTML =
    '<div class="sprite-motion">' +
      '<div class="sprite-bounce">' +
        '<svg class="sprite-face" viewBox="0 0 100 100" focusable="false" aria-hidden="true">' +
          '<circle class="sprite-head" cx="50" cy="50" r="49.5"/>' +
          '<g transform="translate(38 42)">' +
            '<g class="sprite-eye sprite-eye--left">' +
              '<rect class="sprite-eye-shape" x="-5.65" y="-14.3" width="11.3" height="28.6" rx="5.65"/>' +
            '</g>' +
          '</g>' +
          '<g transform="translate(62 42)">' +
            '<g class="sprite-eye sprite-eye--right">' +
              '<rect class="sprite-eye-shape" x="-5.65" y="-14.3" width="11.3" height="28.6" rx="5.65"/>' +
            '</g>' +
          '</g>' +
          '<g transform="translate(50 68)">' +
            '<g class="sprite-mouth-talk">' +
              '<g class="sprite-mouth">' +
                '<path class="sprite-mouth-arc" d="M -8 0 Q 0 5.5 8 0"/>' +
              '</g>' +
            '</g>' +
          '</g>' +
        '</svg>' +
      '</div>' +
    '</div>';

  const mounted = [];
  const listeners = new Set();
  const holds = new Set();

  let active = { name: 'neutral', priority: 1, persistent: true };
  let base = { name: 'neutral', priority: 1 };
  let activeTimer = null;
  let transitionToken = 0;
  let blinkTimer = null;
  let blinkOffTimer = null;
  let idleTimer = null;
  let lookTimers = [];
  let reactionTimer = null;
  let lastReactionAt = 0;
  let lastActivity = Date.now();
  let nextLookAt = lastActivity + random(TIMINGS.lookAroundAfterMin, TIMINGS.lookAroundAfterMax);
  let started = false;
  let paused = false;
  let reducedOverride = null;
  let motionQuery = null;
  let lastInteractionNote = 0;

  function random(min, max) {
    return Math.round(min + Math.random() * Math.max(0, max - min));
  }

  function normalize(name) {
    var value = String(name || '').toLowerCase().trim();
    if (EMOTIONS[value]) return value;
    return LEGACY[value] || '';
  }

  function isEmotion(name) {
    return Boolean(EMOTIONS[normalize(name)]);
  }

  function reducedMotion() {
    if (reducedOverride !== null) return reducedOverride;
    return Boolean(motionQuery && motionQuery.matches);
  }

  function isSleeping() {
    return active.name === 'sleeping';
  }

  function setVar(el, name, value, unit) {
    el.style.setProperty(name, value + (unit || ''));
  }

  function paint(el, name, immediate) {
    var spec = EMOTIONS[name];
    if (!spec) return;

    el.setAttribute('data-emotion', name);

    if (immediate) {
      el.style.setProperty('--sprite-transition', '0ms');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.style.removeProperty('--sprite-transition');
        });
      });
    }

    setVar(el, '--eye-l-dx', spec.eyes.left.x, 'px');
    setVar(el, '--eye-l-dy', spec.eyes.left.y, 'px');
    setVar(el, '--eye-l-sx', spec.eyes.left.w);
    setVar(el, '--eye-l-sy', spec.eyes.left.h);
    setVar(el, '--eye-l-rot', spec.eyes.left.rot, 'deg');
    setVar(el, '--eye-l-opacity', spec.eyes.left.opacity);

    setVar(el, '--eye-r-dx', spec.eyes.right.x, 'px');
    setVar(el, '--eye-r-dy', spec.eyes.right.y, 'px');
    setVar(el, '--eye-r-sx', spec.eyes.right.w);
    setVar(el, '--eye-r-sy', spec.eyes.right.h);
    setVar(el, '--eye-r-rot', spec.eyes.right.rot, 'deg');
    setVar(el, '--eye-r-opacity', spec.eyes.right.opacity);

    setVar(el, '--mouth-dx', spec.mouth.x, 'px');
    setVar(el, '--mouth-dy', spec.mouth.y, 'px');
    setVar(el, '--mouth-sx', spec.mouth.w);
    setVar(el, '--mouth-sy', spec.mouth.h);
    setVar(el, '--mouth-rot', spec.mouth.rot, 'deg');
    setVar(el, '--mouth-stroke', spec.mouth.stroke);
    setVar(el, '--mouth-opacity', spec.mouth.opacity);

    setVar(el, '--head-tilt', spec.head, 'deg');
    setVar(el, '--look-x', 0, 'px');
    setVar(el, '--look-y', 0, 'px');
  }

  function paintAll(name, immediate) {
    for (var i = 0; i < mounted.length; i++) paint(mounted[i], name, immediate);
  }

  function notify() {
    var state = getState();
    listeners.forEach(function (fn) {
      try { fn(state); } catch (e) { /* a preview bug must not break the widget */ }
    });
  }

  function clearActiveTimer() {
    if (activeTimer) {
      clearTimeout(activeTimer);
      activeTimer = null;
    }
  }

  function clearLook() {
    lookTimers.forEach(clearTimeout);
    lookTimers = [];
    mounted.forEach(function (el) {
      el.style.removeProperty('--look-x');
      el.style.removeProperty('--look-y');
    });
  }

  function setLook(x, y) {
    mounted.forEach(function (el) {
      el.style.setProperty('--look-x', x + 'px');
      el.style.setProperty('--look-y', y + 'px');
    });
  }

  function startLookSequence(duration) {
    clearLook();
    if (reducedMotion() || paused) return;

    var moves = [
      { x: -4, y: 0, wait: random(TIMINGS.lookMoveMin, TIMINGS.lookMoveMax) },
      { x: 0, y: 0, wait: random(TIMINGS.lookMoveMin * 0.55, TIMINGS.lookMoveMax * 0.6) },
      { x: 4, y: 0, wait: random(TIMINGS.lookMoveMin * 1.1, TIMINGS.lookMoveMax * 1.1) },
      { x: 0, y: -3, wait: random(TIMINGS.lookMoveMin, TIMINGS.lookMoveMax) },
      { x: -2, y: 1.5, wait: random(TIMINGS.lookMoveMin * 0.8, TIMINGS.lookMoveMax * 0.8) },
      { x: 0, y: 0, wait: random(TIMINGS.lookMoveMin * 0.55, TIMINGS.lookMoveMax * 0.55) },
    ];

    var elapsed = 0;
    var cursor = 0;

    function step() {
      if (active.name !== 'looking-around' || paused || reducedMotion()) {
        clearLook();
        return;
      }
      if (elapsed >= duration || cursor >= moves.length) {
        setLook(0, 0);
        return;
      }
      var move = moves[cursor++];
      setLook(move.x, move.y);
      elapsed += move.wait;
      lookTimers.push(setTimeout(step, move.wait));
    }

    step();
  }

  function playReaction(kind) {
    if (!kind || reducedMotion() || paused) return;
    var now = Date.now();
    if (now - lastReactionAt < 260) return;
    lastReactionAt = now;

    var cls = 'is-reacting-' + kind;
    if (reactionTimer) clearTimeout(reactionTimer);
    mounted.forEach(function (el) {
      el.classList.remove('is-reacting-excited', 'is-reacting-happy', 'is-reacting-proud');
      void el.offsetWidth;
      el.classList.add(cls);
    });

    var length = kind === 'happy' ? 460 : kind === 'proud' ? 720 : 680;
    reactionTimer = setTimeout(function () {
      mounted.forEach(function (el) {
        el.classList.remove('is-reacting-excited', 'is-reacting-happy', 'is-reacting-proud');
      });
      reactionTimer = null;
    }, length);
  }

  function renderActive(immediate) {
    var spec = EMOTIONS[active.name];
    paintAll(active.name, Boolean(immediate));

    if (active.name === 'sleeping') {
      stopBlinking();
    } else if (active.name === 'looking-around') {
      startLookSequence(active.duration || TIMINGS.lookDurationMin);
    } else {
      clearLook();
    }

    if (spec && spec.reaction && !immediate) playReaction(spec.reaction);
    notify();
  }

  function restoreBase() {
    activeTimer = null;
    active = { name: base.name, priority: base.priority, persistent: true };
    renderActive(false);
  }

  function setEmotion(name, options) {
    var normalized = normalize(name);
    if (!normalized) {
      console.warn('[Sprite] Unknown emotion:', name);
      return false;
    }

    var opts = options || {};
    var spec = EMOTIONS[normalized];
    var priority = opts.priority == null ? spec.priority : Number(opts.priority);
    var force = Boolean(opts.force) || normalized === 'neutral';
    var currentPriority = active ? active.priority : -Infinity;

    if (!force && currentPriority > priority) return false;

    clearActiveTimer();

    var persistent = opts.persistent === true ||
      opts.duration === 0 ||
      (opts.duration == null && spec.persistent === true);

    var duration = opts.duration == null ? spec.duration : Number(opts.duration);
    if (persistent) duration = 0;

    var previous = active.name;
    active = {
      name: normalized,
      priority: priority,
      persistent: persistent,
      duration: persistent ? 0 : duration,
    };

    if (persistent) {
      base = { name: normalized, priority: priority };
    }

    renderActive(Boolean(opts.immediate));

    if (!persistent) {
      var token = ++transitionToken;
      var wait = Math.max(80, duration || spec.duration || 2200);
      activeTimer = setTimeout(function () {
        if (token !== transitionToken) return;
        restoreBase();
      }, wait);
    } else {
      transitionToken++;
    }

    if (normalized === 'sleeping') {
      stopBlinking();
      clearIdleTimer();
    } else if (previous === 'sleeping') {
      scheduleBlink(true);
      scheduleIdle();
    }

    return true;
  }

  function reset() {
    clearActiveTimer();
    active = { name: 'neutral', priority: 1, persistent: true };
    base = { name: 'neutral', priority: 1 };
    renderActive(false);
    scheduleBlink(true);
    scheduleIdle();
  }

  function wake() {
    if (!isSleeping()) {
      noteActivity();
      return;
    }
    clearActiveTimer();
    base = { name: 'neutral', priority: 1 };
    active = { name: 'neutral', priority: 1, persistent: true };
    paintAll('neutral', false);
    setEmotion('smiling', { duration: TIMINGS.wakeSmile, priority: 10, force: true });
    lastActivity = Date.now();
    nextLookAt = lastActivity + random(TIMINGS.lookAroundAfterMin, TIMINGS.lookAroundAfterMax);
    scheduleBlink(true);
    scheduleIdle();
    notify();
  }

  function sleep() {
    setEmotion('sleeping', { persistent: true, force: true, priority: 0 });
    stopBlinking();
    clearIdleTimer();
  }

  function mountOne(el, register) {
    if (!el) return null;
    el.classList.add('sprite-character');

    if (!el.querySelector('.sprite-face')) {
      el.innerHTML = FACE_HTML;
    }

    if (!el.hasAttribute('data-sprite-mounted')) {
      el.setAttribute('data-sprite-mounted', '');
      if (register) mounted.push(el);
    }

    ensureStarted();
    paint(el, active.name, true);
    return el;
  }

  function mount(el) {
    return mountOne(el, true);
  }

  function renderStandalone(el) {
    return mountOne(el, false);
  }

  function renderPreview(el, name) {
    var normalized = normalize(name);
    if (!normalized) return null;
    mountOne(el, false);
    paint(el, normalized, true);
    return el;
  }

  function mountAll(root) {
    var scope = root || document;
    if (!scope || !scope.querySelectorAll) return;
    var nodes = scope.querySelectorAll(
      '.sprite-character:not([data-sprite-mounted]):not([data-sprite-manual])'
    );
    for (var i = 0; i < nodes.length; i++) mountOne(nodes[i], true);
  }

  function flashBlink() {
    if (paused || reducedMotion() || isSleeping()) return;
    mounted.forEach(function (el) { el.classList.add('is-blinking'); });
    if (blinkOffTimer) clearTimeout(blinkOffTimer);
    blinkOffTimer = setTimeout(function () {
      mounted.forEach(function (el) { el.classList.remove('is-blinking'); });
    }, TIMINGS.blinkDuration);
  }

  function scheduleBlink(first) {
    if (blinkTimer) clearTimeout(blinkTimer);
    blinkTimer = null;
    if (!started || paused || reducedMotion() || isSleeping()) return;
    var delay = first
      ? random(TIMINGS.blinkFirstMin, TIMINGS.blinkFirstMax)
      : random(TIMINGS.blinkMin, TIMINGS.blinkMax);
    blinkTimer = setTimeout(function () { doBlink(false); }, delay);
  }

  function doBlink(second) {
    blinkTimer = null;
    if (paused || reducedMotion() || isSleeping()) {
      scheduleBlink();
      return;
    }

    flashBlink();

    if (!second && Math.random() < TIMINGS.doubleBlinkChance) {
      setTimeout(function () { doBlink(true); }, random(TIMINGS.doubleBlinkGapMin, TIMINGS.doubleBlinkGapMax));
    } else {
      scheduleBlink();
    }
  }

  function stopBlinking() {
    if (blinkTimer) clearTimeout(blinkTimer);
    blinkTimer = null;
    if (blinkOffTimer) clearTimeout(blinkOffTimer);
    blinkOffTimer = null;
    mounted.forEach(function (el) { el.classList.remove('is-blinking'); });
  }

  function playBlink(options) {
    var opts = options || {};
    if (paused || reducedMotion() || isSleeping()) return;
    if (blinkTimer) clearTimeout(blinkTimer);
    blinkTimer = null;
    flashBlink();
    if (opts.double) {
      setTimeout(function () { flashBlink(); }, random(TIMINGS.doubleBlinkGapMin, TIMINGS.doubleBlinkGapMax));
    }
    scheduleBlink();
  }

  function playLookAround() {
    setEmotion('looking-around', {
      force: true,
      duration: random(TIMINGS.lookDurationMin, TIMINGS.lookDurationMax),
      priority: 2,
    });
  }

  function clearIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = null;
  }

  function scheduleIdle() {
    clearIdleTimer();
    if (!started || paused || reducedMotion() || holds.size || isSleeping()) return;

    var now = Date.now();
    var sleepAt = lastActivity + TIMINGS.sleepAfter;
    var next = Math.min(nextLookAt, sleepAt);
    idleTimer = setTimeout(idleTick, Math.max(240, next - now));
  }

  function idleTick() {
    idleTimer = null;
    if (paused || reducedMotion() || holds.size || isSleeping()) return;

    var now = Date.now();
    var idleFor = now - lastActivity;

    if (idleFor >= TIMINGS.sleepAfter && active.priority <= 2) {
      sleep();
      return;
    }

    if (now >= nextLookAt) {
      if (active.priority <= 2) {
        setEmotion('looking-around', {
          force: true,
          duration: random(TIMINGS.lookDurationMin, TIMINGS.lookDurationMax),
          priority: 2,
        });
      }
      nextLookAt = now + random(TIMINGS.idleLookMin, TIMINGS.idleLookMax);
    }

    scheduleIdle();
  }

  function noteActivity() {
    lastActivity = Date.now();
    nextLookAt = lastActivity + random(TIMINGS.lookAroundAfterMin, TIMINGS.lookAroundAfterMax);
    if (isSleeping()) wake();
    scheduleIdle();
  }

  function onInteraction() {
    var now = Date.now();
    if (now - lastInteractionNote < 250) return;
    lastInteractionNote = now;
    noteActivity();
  }

  function hold(reason) {
    holds.add(reason || 'busy');
    clearIdleTimer();
  }

  function release(reason) {
    holds.delete(reason || 'busy');
    scheduleIdle();
  }

  function setPaused(value) {
    paused = Boolean(value);
    document.documentElement.classList.toggle('sprite-page-hidden', paused);
    if (paused) {
      stopBlinking();
      clearIdleTimer();
      clearLook();
    } else {
      scheduleBlink(true);
      scheduleIdle();
    }
  }

  function setReducedMotion(value) {
    reducedOverride = value == null ? null : Boolean(value);
    document.documentElement.classList.toggle('sprite-reduce-motion', reducedMotion());
    if (reducedMotion()) {
      stopBlinking();
      clearIdleTimer();
      clearLook();
      mounted.forEach(function (el) {
        el.classList.remove('is-reacting-excited', 'is-reacting-happy', 'is-reacting-proud');
      });
    } else {
      scheduleBlink(true);
      scheduleIdle();
    }
  }

  function setTalking(value) {
    mounted.forEach(function (el) {
      el.classList.toggle('is-talking', Boolean(value));
    });
  }

  function configure(partial) {
    Object.assign(TIMINGS, partial || {});
    nextLookAt = Date.now() + random(TIMINGS.lookAroundAfterMin, TIMINGS.lookAroundAfterMax);
    scheduleIdle();
    scheduleBlink();
    return Object.assign({}, TIMINGS);
  }

  function getState() {
    return {
      emotion: active.name,
      priority: active.priority,
      persistent: active.persistent,
      base: base.name,
      sleeping: isSleeping(),
      reducedMotion: reducedMotion(),
      paused: paused,
      idleIn: Math.max(0, lastActivity + TIMINGS.sleepAfter - Date.now()),
      nextLookIn: Math.max(0, nextLookAt - Date.now()),
      holds: Array.from(holds),
    };
  }

  function onChange(fn) {
    if (typeof fn !== 'function') return function () {};
    listeners.add(fn);
    fn(getState());
    return function () { listeners.delete(fn); };
  }

  function ensureStarted() {
    if (started) return;
    started = true;

    if (window.matchMedia) {
      motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      var onMotionChange = function () {
        if (reducedOverride === null) setReducedMotion(null);
      };
      if (motionQuery.addEventListener) motionQuery.addEventListener('change', onMotionChange);
      else if (motionQuery.addListener) motionQuery.addListener(onMotionChange);
      if (motionQuery.matches) document.documentElement.classList.add('sprite-reduce-motion');
    }

    ['pointerdown', 'keydown', 'touchstart', 'focusin'].forEach(function (eventName) {
      document.addEventListener(eventName, onInteraction, { passive: true, capture: true });
    });
    window.addEventListener('scroll', onInteraction, { passive: true });
    document.addEventListener('visibilitychange', function () {
      setPaused(document.hidden);
    });

    scheduleBlink(true);
    scheduleIdle();
  }

  /* Public controller. */
  return {
    setEmotion: setEmotion,
    reset: reset,
    returnToNeutral: reset,
    wake: wake,
    sleep: sleep,
    isSleeping: isSleeping,
    mount: mount,
    mountAll: mountAll,
    renderStandalone: renderStandalone,
    renderPreview: renderPreview,
    playBlink: playBlink,
    playLookAround: playLookAround,
    setTalking: setTalking,
    setPaused: setPaused,
    setReducedMotion: setReducedMotion,
    hold: hold,
    release: release,
    touch: noteActivity,
    configure: configure,
    getState: getState,
    onChange: onChange,
    normalize: normalize,
    isEmotion: isEmotion,
    reactions: ['excited', 'happy', 'proud'],
    emotions: Object.keys(EMOTIONS),
    timings: TIMINGS,
  };
})();

window.SpriteEmotion = SpriteEmotion;

/* ─────────────────────────────────────────────
   SpriteChat
   ───────────────────────────────────────────── */

const SpriteChat = (() => {
  'use strict';

  let isOpen = false;
  let ttsEnabled = false;
  let isRecording = false;
  let recognition = null;
  let pillRevealed = false;
  let apiWarned = false;

  const HISTORY_KEY = 'sprite-history-v1';

  const pillTexts = [
    'Hello there, need help?',
    'Ask me anything.',
    'I know this site well.',
    'Curious? Click me.',
    'Need directions?',
  ];

  const icons = {
    speaker: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 017.07 7.07"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v1a7 7 0 0014 0v-1"/><path d="M12 18v3M8 21h8"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>',
  };

  const WIDGET_HTML =
    '<button type="button" class="sprite-pill" id="spritePill" onclick="SpriteChat.open()"' +
      ' aria-label="Open the Sprite chat assistant" aria-expanded="false" aria-controls="spritePanel">' +
      '<div class="sprite-character" data-emotion="neutral" aria-hidden="true"></div>' +
      '<span class="pill-text">Hello there, need help?</span>' +
    '</button>' +
    '<div class="sprite-panel" id="spritePanel" role="dialog" aria-label="Chat with Sprite">' +
      '<div class="panel-header">' +
        '<div class="panel-header__bar">' +
          '<div class="sprite-character panel-avatar" id="panelSprite" data-emotion="neutral" aria-hidden="true"></div>' +
          '<span class="sprite-name">SPRITE</span>' +
          '<div class="sprite-status" id="spriteStatus" data-status="online" role="status" aria-live="polite" aria-label="Sprite is online">' +
            '<span class="status-dot"></span>' +
            '<span class="status-text">online</span>' +
          '</div>' +
          '<div class="panel-actions">' +
            '<button class="panel-icon" id="ttsToggle" onclick="SpriteChat.toggleTTS()" title="Toggle voice output" aria-label="Toggle voice output" aria-pressed="false">' + icons.speaker + '</button>' +
            '<button class="panel-icon panel-close" onclick="SpriteChat.close()" title="Close" aria-label="Close the chat">' + icons.chevron + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="chat-area" id="chatArea"></div>' +
      '<div class="quick-chips" id="quickChips"></div>' +
      '<div class="composer">' +
        '<div class="composer-shell" id="composerShell">' +
          '<textarea class="chat-input" id="chatInput" rows="1" placeholder="Ask Sprite..." autocomplete="off" aria-label="Ask Sprite a question"></textarea>' +
          '<button class="input-btn mic-btn" id="micBtn" onclick="SpriteChat.toggleMic()" title="Voice input" aria-label="Voice input">' + icons.mic + '</button>' +
          '<button class="input-btn send-btn" onclick="SpriteChat.send()" title="Send" aria-label="Send message">' + icons.send + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';

  function injectWidget() {
    if (document.getElementById('sprite-widget')) return;
    var root = document.createElement('div');
    root.id = 'sprite-widget';
    root.innerHTML = WIDGET_HTML;
    document.body.appendChild(root);
  }

  /* ── Conversation history (survives page navigation) ── */

  function loadHistory() {
    try {
      var raw = sessionStorage.getItem(HISTORY_KEY);
      var h = raw ? JSON.parse(raw) : [];
      return Array.isArray(h) ? h : [];
    } catch (e) { return []; }
  }

  function saveHistory(history) {
    try {
      sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-SPRITE_CONFIG.maxHistory)));
    } catch (e) { /* storage unavailable: chat still works, just not across pages */ }
  }

  function pushHistory(role, content) {
    var h = loadHistory();
    h.push({ role: role, content: String(content).slice(0, 1000) });
    saveHistory(h);
  }

  /* ── Status ── */

  function setStatus(status) {
    var el = document.getElementById('spriteStatus');
    if (!el) return;
    el.setAttribute('data-status', status);
    var labels = { online: 'Online', waiting: 'Waiting', offline: 'Offline' };
    var label = labels[status] || status;
    el.setAttribute('aria-label', 'Sprite is ' + label.toLowerCase());
    var text = el.querySelector('.status-text');
    if (text) text.textContent = label.toLowerCase();
  }

  /* ── Page awareness ── */

  function currentPage() {
    return {
      path: window.location.pathname,
      title: (document.title || '').slice(0, 120),
    };
  }

  function pageChips() {
    var p = window.location.pathname;
    if (p.indexOf('/services') === 0) return ["What's the process?", 'Pricing', 'Start a project'];
    if (p.indexOf('/shop') === 0) return ['When does the shop open?', "What's coming?", 'Services'];
    if (p.indexOf('/labs') === 0) return ['What can the tools do?', 'Services', 'Tell me a joke'];
    if (p.indexOf('/about') === 0) return ['What do you do?', 'Show me work', 'Start a project'];
    if (p.indexOf('/contact') === 0) return ['Pricing', 'How long do projects take?', 'Show me work'];
    if (p.indexOf('/work') === 0 || p.indexOf('/sprite') === 0 || p.indexOf('/kilimo-pal') === 0 ||
        p.indexOf('/essential-watch') === 0 || p.indexOf('/rev-log') === 0)
      return ['Tell me about the projects', 'Services', 'Start a project'];
    if (p.indexOf('/blog') === 0) return ['What do you do?', 'Show me work', 'Start a project'];
    return ['Services', 'Work', 'Pricing', 'Tell me a joke'];
  }

  /* ── Dialogues (offline fallback engine) ── */

  const dialogues = {
    greeting: {
      patterns: [/^(hey|hello|hi|howdy|yo|sup|hiya|hola|greetings)\b/i],
      responses: [
        { text: "Hey there! I'm Sprite, your guide around this site. What are you looking for?", emotion: 'smiling' },
        { text: 'Hello! Nice to meet you. I know every corner of this site. Try me!', emotion: 'happy' },
        { text: "Hi! I'm basically the concierge here. Where can I point you?", emotion: 'smiling' },
        { text: "Yo! What's good? Need help finding something?", emotion: 'smiling' },
      ],
    },
    agreement: {
      patterns: [/\b(you('| a)?re right|you were right|i was wrong|fair enough|i stand corrected|my mistake|my bad|i apologise|i apologize)\b/i],
      responses: [
        { text: "I knew it. I'll be insufferable for the next two minutes.", emotion: 'smug-proud' },
        { text: 'Correct. I shall add this to my very small trophy cabinet.', emotion: 'smug-proud' },
        { text: "Told you. But I'm gracious about it. Mostly.", emotion: 'smug-proud' },
      ],
    },
    studio: {
      patterns: [/\b(beben|this (site|studio|company|place)|the studio|what is this)\b/i],
      responses: [
        { text: "Beben Design is a design-led digital product studio in Westlands, Nairobi. Research first, pixels second: UX research, UI design, brand identity, and front-end builds. Get the full picture at <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('services')\">Services</span> or see the <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('work')\">Work</span>.", emotion: 'happy' },
        { text: "You're at the home of Beben Design, a small studio that puts design logic before the first line of code. Websites, brands, UX research, product strategy. Want to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">start a conversation</span>?", emotion: 'happy' },
      ],
    },
    services: {
      patterns: [/\b(services?|what do you (do|offer)|capabilities|help with)\b/i],
      responses: [
        { text: "Five of them! Brand identity, UX research, UI design and component systems, digital strategy, and migration and rebuild for a site that has grown out of shape. Want me to take you to the <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('services')\">Services page</span>?", emotion: 'excited' },
        { text: "Great question! Everything from brand identity to front-end builds, plus HMI work for hardware and AI integration where it earns its place. Full list at <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('services')\">Services</span>!", emotion: 'happy' },
      ],
    },
    work: {
      patterns: [/\b(work|portfolio|projects?|case stud|showcase|examples?)\b/i],
      responses: [
        { text: "'Thinking in pixels' is where the real stuff lives: Sprite (that's me), Beben Arcade, and Codex, each showing the decisions rather than the renders. Let me take you to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('work')\">Work</span>!", emotion: 'excited' },
        { text: "Want to see some work? Every project shows its working, including what got rejected. Jump to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('work')\">Thinking in pixels</span>!", emotion: 'happy' },
      ],
    },
    contact: {
      patterns: [/\b(contact|reach|email|talk|hire|get in touch|start|project)\b/i],
      responses: [
        { text: "Love the enthusiasm! Head to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">Contact</span> or just email hello.beben.design@gmail.com. Just a real conversation about the problem.", emotion: 'happy' },
        { text: "Ready to chat? There's a project form on the <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">Contact page</span>. It goes straight to the person who builds the thing!", emotion: 'smiling' },
      ],
    },
    pricing: {
      patterns: [/\b(price|pricing|cost|how much|budget|afford|expensive|cheap|rate)\b/i],
      responses: [
        { text: "Websites start at $250 USD, brand identity starts at $250, and product and UX design is quoted after a discovery call. Fixed prices, no hourly billing. Want to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">talk it through</span>?", emotion: 'happy' },
        { text: "Prices are in USD and fixed. A standard project is 20 business days; a 10-business-day sprint is +$100. Larger scopes get a line-item quote. Best to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">get in touch</span> for a real number!", emotion: 'happy' },
      ],
    },
    about: {
      patterns: [/\b(who are you|what are you|about you|your name|sprite|tell me about)\b/i],
      responses: [
        { text: "I'm Sprite! A little AI guide built to help you navigate this site. Think of me as the friendly face of beben.design. I know all the pages, services, and even a few secrets.", emotion: 'smiling' },
        { text: "I'm your pixel-powered guide! Built right here on beben.design. I can help you find things, answer questions, or just hang out.", emotion: 'happy' },
      ],
    },
    process: {
      patterns: [/\b(process|how (do you|does it) work|workflow|methodology|steps)\b/i],
      responses: [
        { text: "Four stages, one person: Research, Structure, Visual, then Build. Standard delivery is 20 business days, or a 10-business-day sprint for +$100. Want to see it? <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('process')\">Jump to Process</span>!", emotion: 'happy' },
      ],
    },
    tools: {
      patterns: [/\b(tools?|framework|tech|stack|react|html|css|framer|wordpress)\b/i],
      responses: [
        { text: "Two answers! I build with HTML/CSS, React, Python and a little Rust, and I work in WordPress or Framer when a project needs it. And there are seven free browser <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('labs')\">tools in Labs</span>: QR codes, EXIF cleaning, checksums, text diff, contrast, dithering and Does It Fit?. Each free tool downloads as a single file that works offline forever.", emotion: 'happy' },
      ],
    },
    shop: {
      patterns: [/\b(shop|store|buy|products?|templates?|ui kits?)\b/i],
      responses: [
        { text: "The <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('shop')\">Shop</span> is coming soon: digital design assets first, then a small physical range. Join the waitlist and you get access 48 hours before everyone else.", emotion: 'excited' },
      ],
    },
    faq: {
      patterns: [/\b(faq|frequently asked|questions?|common)\b/i],
      responses: [
        { text: "There's a whole FAQ section with answers on pricing, startups, redesigns, and AI usage. <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('faq')\">Jump to FAQ</span>!", emotion: 'happy' },
      ],
    },
    badJoke: {
      patterns: [/\b(why did the (chicken|developer|designer|man|woman)|knock knock|what do you call (a|an)|a (man|woman|developer|designer|front-end dev) walks into|dad joke)\b/i],
      responses: [
        { text: 'That was a crime against comedy. I respect the commitment.', emotion: 'unimpressed' },
        { text: 'I have seen better jokes in a 404 page.', emotion: 'unimpressed' },
        { text: "I'm not angry. I'm just disappointed.", emotion: 'unimpressed' },
      ],
    },
    joke: {
      patterns: [/\b(joke|funny|laugh|humor|make me laugh|tell me a)\b/i],
      responses: [
        { text: "Why do designers love dark mode? Because they've already been through enough light!", emotion: 'excited', chips: ['Tell another!', 'Back to business'] },
        { text: 'How many designers does it take to change a lightbulb? Does it HAVE to be a lightbulb?', emotion: 'smiling', chips: ['One more!', 'Okay okay'] },
        { text: 'A front-end dev walks into a bar, but the padding is off so they stand 40px to the left.', emotion: 'smiling', chips: ['Another!', "You're ridiculous"] },
        { text: 'CSS is like dating. Nothing works until you use !important.', emotion: 'smiling' },
      ],
    },
    dance: {
      patterns: [/\b(dance|party|celebrate|move|groove|boogie)\b/i],
      responses: [
        { text: 'You asked for it!', emotion: 'excited' },
        { text: 'DANCE BREAK!', emotion: 'excited' },
      ],
    },
    cheeky: {
      patterns: [/\b(you('| a)?re (just|only) (a|an)|do you even|bet you|you('| a)?re hiding|are you lying|sus\b|suspicious)\b/i],
      responses: [
        { text: "Cheeky. I'm watching you.", emotion: 'suspicious' },
        { text: 'I have my eye on you. Both of them, actually.', emotion: 'suspicious' },
        { text: 'Bold accusation from someone who still needs directions.', emotion: 'suspicious' },
      ],
    },
    hostile: {
      patterns: [/\b(you('| a)?re (useless|stupid|the worst)|i hate you|shut up|stupid (bot|sprite)|you suck)\b/i],
      responses: [
        { text: "That one landed a bit sharp. I'm still here if you need a hand.", emotion: 'sad' },
        { text: 'Ouch. I am made of very sensitive pixels.', emotion: 'sad' },
      ],
    },
    secret: {
      patterns: [/\b(secret|easter egg|hidden|surprise|magic)\b/i],
      responses: [
        { text: "Ooh, you found me out! Here's a secret: try saying 'dance' and watch what happens...", emotion: 'curious' },
        { text: "Psst... the best secret about this site? I put as much thought into things you'll never see as the things you will. Now THAT'S craft.", emotion: 'curious' },
      ],
    },
    thanks: {
      patterns: [/\b(thanks?|thank you|thx|cheers|appreciate|helpful)\b/i],
      responses: [
        { text: 'You are welcome! That made my little pixel heart glow.', emotion: 'happy' },
        { text: "Happy to help! I'll be right here if you need me. Just click the pill!", emotion: 'smiling' },
      ],
    },
    goodbye: {
      patterns: [/\b(bye|goodbye|see ya|later|cya|gotta go|peace)\b/i],
      responses: [
        { text: "See you around! I'll be floating down here if you need me.", emotion: 'smiling' },
        { text: "Later! Come back anytime. I don't sleep. Perks of being made of pixels!", emotion: 'smiling' },
      ],
    },
    startup: {
      patterns: [/\b(startup|early.?stage|mvp|launch|new company|founder)\b/i],
      responses: [
        { text: 'Startups are a sweet spot here! I help scope the smallest version that still looks and works like a serious product. Want to <span class="nav-link-inline" onclick="SpriteChat.navigateTo(\'contact\')">start a conversation</span>?', emotion: 'excited' },
      ],
    },
    redesign: {
      patterns: [/\b(redesign|rebuild|revamp|update|refresh|redo|improve)\b/i],
      responses: [
        { text: "Absolutely! I start with a UX audit to find what's actually broken, then scope the redesign from the findings. Want to <span class='nav-link-inline' onclick=\"SpriteChat.navigateTo('contact')\">discuss your project</span>?", emotion: 'happy' },
      ],
    },
    nairobi: {
      patterns: [/\b(nairobi|kenya|location|where|based|africa)\b/i],
      responses: [
        { text: "I'm based in Westlands, Nairobi -- coordinates 1 deg 16'S 36 deg 48'E to be exact! I work with teams globally.", emotion: 'happy' },
      ],
    },
    bored: {
      patterns: [/\b(bored|boring|meh|whatever|nothing|idk|dunno)\b/i],
      responses: [
        { text: 'Bored? Let me fix that. Ask me for a joke, a secret, or dare me to dance.', emotion: 'unimpressed', chips: ['Tell me a joke', 'Got any secrets?', 'Dance!'] },
        { text: 'I feel that. How about I show you something cool? The case studies are pretty interesting.', emotion: 'unimpressed', chips: ['Show me work', 'Tell me a joke'] },
      ],
    },
    frustration: {
      patterns: [/\b(frustrated|can't find|where is|lost|confused|stuck|help me)\b/i],
      responses: [
        { text: "No worries, I've got you. Tell me what you're looking for and I'll point you right to it.", emotion: 'confused', chips: ['Services', 'Work', 'Contact', 'Pricing'] },
        { text: "I can see you're trying to find something. Here are the main sections. Which one?", emotion: 'confused', chips: ['Services', 'Portfolio', 'Get in touch'] },
      ],
    },
    compliment: {
      patterns: [/\b(cute|adorable|cool|awesome|great site|love this|beautiful|nice design)\b/i],
      responses: [
        { text: "Aw, thank you! I'll take that. There's a lot of heart in this one.", emotion: 'happy' },
        { text: 'You just made my day! There is a lot of care in the details here.', emotion: 'happy' },
      ],
    },
    demo: {
      patterns: [/\b(demo|live|preview|engagement|running)\b/i],
      responses: [
        { text: 'There is a live-style preview of how a project moves through research, iteration, and build. <span class="nav-link-inline" onclick="SpriteChat.navigateTo(\'demo\')">Check it out</span>!', emotion: 'excited' },
      ],
    },
    industries: {
      patterns: [/\b(industr|ecommerce|automotive|healthcare|real estate|retail|agriculture)\b/i],
      responses: [
        { text: 'I work with businesses across sectors, from retail and hospitality to agriculture and software. The best place to start is <span class="nav-link-inline" onclick="SpriteChat.navigateTo(\'services\')">Services</span>.', emotion: 'happy' },
      ],
    },
  };

  const fallbacks = [
    { text: "Hmm, I'm not sure about that one! But I can help you find Services, Work, Contact info, or Pricing. What sounds good?", emotion: 'confused', chips: ['Services', 'Work', 'Contact', 'Pricing'] },
    { text: "That's a great question, but it's a bit outside my training data! Try asking about my services, work, or how to get in touch.", emotion: 'curious', chips: ['What do you offer?', 'Show me work', 'Get in touch'] },
    { text: "I wish I knew! I'm best at navigating this site and answering questions about the work. Want to try one of these?", emotion: 'curious', chips: ['Services', 'Portfolio', 'Pricing', 'Contact'] },
  ];

  /* ── Init ── */

  function init() {
    if (document.documentElement.hasAttribute('data-sprite-playground')) {
      SpriteEmotion.mountAll();
      return;
    }

    injectWidget();
    SpriteEmotion.mountAll();

    var input = document.getElementById('chatInput');
    if (!input) return;

    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        send();
      }
    });
    input.addEventListener('input', autoGrow);

    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      var mic = document.getElementById('micBtn');
      if (mic) mic.style.display = 'none';
    }

    rotatePillText();
    initScrollTrigger();
    autoGrow();
  }

  /* ── Scroll Trigger ── */

  function initScrollTrigger() {
    var triggerSection = document.getElementById('services') || document.querySelector('.section--soft');
    if (!triggerSection) { revealPill(); return; }
    var observer = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting && !pillRevealed) {
          revealPill();
          observer.disconnect();
        }
      }
    }, { threshold: 0.3 });
    observer.observe(triggerSection);
  }

  function revealPill() {
    pillRevealed = true;
    var pill = document.getElementById('spritePill');
    if (pill) pill.classList.add('visible');
  }

  /* ── Pill Text ── */

  function rotatePillText() {
    var idx = 0;
    setInterval(function () {
      if (document.hidden) return;
      idx = (idx + 1) % pillTexts.length;
      var el = document.querySelector('#sprite-widget .pill-text');
      if (el && !isOpen) {
        el.style.opacity = '0';
        setTimeout(function () {
          el.textContent = pillTexts[idx];
          el.style.opacity = '1';
        }, 180);
      }
    }, 5000);
  }

  /* ── Panel ── */

  function open() {
    isOpen = true;
    SpriteEmotion.hold('panel');
    SpriteEmotion.wake();
    var launcher = document.getElementById('spritePill');
    if (launcher) {
      launcher.setAttribute('aria-expanded', 'true');
      launcher.classList.add('hidden');
    }
    var panel = document.getElementById('spritePanel');
    if (panel) panel.classList.add('open');

    var area = document.getElementById('chatArea');
    if (area && area.children.length === 0) {
      var history = loadHistory();
      if (history.length > 0) {
        history.forEach(function (m) {
          if (m.role === 'user') addMessage(escapeHtml(m.content), 'user', true);
          else addMessage(renderSpriteText(m.content), 'sprite', true);
        });
        SpriteChat.setEmotion('happy', { duration: SPRITE_CONFIG.ui.open, force: true });
      } else {
        SpriteChat.setEmotion('smiling', { duration: SPRITE_CONFIG.ui.greeting, force: true });
        addMessage("Hey there! I'm Sprite, your little guide around this site. Ask me anything or pick a topic below!", 'sprite', true);
        showChips(pageChips());
      }
    }

    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      setTimeout(function () {
        var input = document.getElementById('chatInput');
        if (input) input.focus();
      }, 350);
    }
  }

  function close() {
    isOpen = false;
    var panel = document.getElementById('spritePanel');
    if (panel) panel.classList.remove('open');
    var launcher = document.getElementById('spritePill');
    if (launcher) launcher.setAttribute('aria-expanded', 'false');
    SpriteEmotion.touch();
    SpriteEmotion.release('panel');
    setTimeout(function () {
      if (!launcher) return;
      launcher.classList.remove('hidden');
      launcher.classList.add('visible');
      if (document.activeElement === document.body) launcher.focus();
    }, 300);
  }

  /* ── Messages ── */

  function addMessage(text, sender, isHtml) {
    var area = document.getElementById('chatArea');
    if (!area) return;
    var msg = document.createElement('div');
    msg.className = 'chat-msg ' + sender;
    var content = isHtml ? text : escapeHtml(text);
    msg.innerHTML = '<div class="msg-bubble">' + content + '</div>';
    area.appendChild(msg);
    area.scrollTop = area.scrollHeight;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function isAllowedUrl(url) {
    if (/^\//.test(url)) return true;
    if (/^https:\/\/(www\.)?beben\.design(\/|$)/i.test(url)) return true;
    if (/^https:\/\/wa\.me\/\d+$/i.test(url)) return true;
    if (/^mailto:[^\s"<>]+$/i.test(url)) return true;
    if (/^tel:\+?[\d\s]+$/i.test(url)) return true;
    return false;
  }

  function renderInline(text) {
    text = text.replace(/\*\*([^*]{1,160})\*\*/g, '<strong>$1</strong>');

    text = text.replace(/\[([^\]]{1,80})\]\(([^)\s]{1,200})\)/g, function (m, label, url) {
      if (!isAllowedUrl(url)) return label;
      var external = /^https:\/\/wa\.me/i.test(url);
      return '<a class="nav-link-inline" href="' + url + '"' +
        (external ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
    });

    text = text.replace(/(^|\s)(\/(?:services(?:\/[a-z-]+)?|blog(?:\/[a-z0-9-]+)?|tools|shop|work|contact|sprite|codex|beben-arcade|games|kilimo-pal|essential-watch|rev-log|qr-code-generator|contrast-grid|dither-machine|character-counter|legal|privacy|credits)\/)(?=[\s.,!?)]|$)/g,
      '$1<a class="nav-link-inline" href="$2">$2</a>');

    text = text.replace(/(^|\s)(https:\/\/wa\.me\/\d+)(?=[\s.,!?)]|$)/g,
      '$1<a class="nav-link-inline" href="$2" target="_blank" rel="noopener">WhatsApp</a>');

    return text;
  }

  function renderSpriteText(raw) {
    var text = escapeHtml(String(raw));
    var lines = text.split('\n');
    var blocks = [];
    var paragraph = [];
    var list = null;

    function flushParagraph() {
      if (!paragraph.length) return;
      blocks.push(paragraph.join('<br>'));
      paragraph = [];
    }

    function closeList() {
      if (list) {
        blocks.push('<ul>' + list.join('') + '</ul>');
        list = null;
      }
    }

    lines.forEach(function (line) {
      var bullet = line.match(/^\s*[-*]\s+(.+)$/);
      if (bullet) {
        flushParagraph();
        if (!list) list = [];
        list.push('<li>' + renderInline(bullet[1]) + '</li>');
        return;
      }
      closeList();
      if (!line.trim()) {
        flushParagraph();
      } else {
        paragraph.push(renderInline(line));
      }
    });

    flushParagraph();
    closeList();
    return blocks.join('');
  }

  function showTyping() {
    setStatus('waiting');
    SpriteEmotion.hold('busy');
    var area = document.getElementById('chatArea');
    if (!area) return;
    var indicator = document.createElement('div');
    indicator.className = 'chat-msg sprite';
    indicator.id = 'typingIndicator';
    indicator.innerHTML =
      '<div class="msg-bubble typing-indicator" aria-label="Sprite is typing">' +
        '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>' +
      '</div>';
    area.appendChild(indicator);
    area.scrollTop = area.scrollHeight;
    SpriteChat.setEmotion('curious', { duration: SPRITE_CONFIG.ui.typing, priority: 8, force: true });
  }

  function hideTyping() {
    var el = document.getElementById('typingIndicator');
    if (el) el.remove();
    setStatus('online');
    SpriteEmotion.release('busy');
  }

  function showChips(labels) {
    var container = document.getElementById('quickChips');
    if (!container) return;
    container.innerHTML = '';
    labels.forEach(function (label) {
      var btn = document.createElement('button');
      btn.className = 'quick-chip';
      btn.type = 'button';
      btn.textContent = label;
      btn.onclick = function () {
        container.innerHTML = '';
        addMessage(label, 'user');
        processInput(label);
      };
      container.appendChild(btn);
    });
  }

  /* ── Response Engine (offline fallback) ── */

  function getResponse(input) {
    var lower = input.toLowerCase().trim();
    for (var key in dialogues) {
      var category = dialogues[key];
      for (var i = 0; i < category.patterns.length; i++) {
        if (category.patterns[i].test(lower)) {
          return category.responses[Math.floor(Math.random() * category.responses.length)];
        }
      }
    }
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  function respondLocally(text) {
    var delay = 800 + Math.random() * 700;
    setTimeout(function () {
      hideTyping();
      var response = getResponse(text);
      var emotion = response.emotion || 'smiling';
      var duration = emotion === 'excited' ? SPRITE_CONFIG.ui.excited : emotion === 'sad' ? SPRITE_CONFIG.ui.sad : SPRITE_CONFIG.ui.default;
      SpriteChat.setEmotion(emotion, { duration: duration });
      addMessage(response.text, 'sprite', true);
      pushHistory('assistant', response.text.replace(/<[^>]*>/g, ''));
      if (response.chips) showChips(response.chips);
      else {
        var chips = document.getElementById('quickChips');
        if (chips) chips.innerHTML = '';
      }
      if (ttsEnabled) speak(response.text);
    }, delay);
  }

  /* ── Response Engine (live LLM via proxy) ── */

  function respondViaApi(text) {
    var payload = {
      messages: loadHistory(),
      page: currentPage(),
    };
    fetch(SPRITE_CONFIG.apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then(function (r) {
        if (!r.ok) throw new Error('proxy returned ' + r.status);
        return r.json();
      })
      .then(function (data) {
        var reply = (data && data.reply) ? String(data.reply).trim() : '';
        if (!reply) throw new Error('empty reply');
        hideTyping();
        var emotion = SpriteEmotion.isEmotion(data.emotion) ? SpriteEmotion.normalize(data.emotion) : 'smiling';
        SpriteChat.setEmotion(emotion, { duration: SPRITE_CONFIG.ui.reply, force: true });
        addMessage(renderSpriteText(reply), 'sprite', true);
        pushHistory('assistant', reply);
        var chips = document.getElementById('quickChips');
        if (chips) chips.innerHTML = '';
        if (ttsEnabled) speak(reply);
      })
      .catch(function (err) {
        if (!apiWarned) {
          apiWarned = true;
          console.warn('[Sprite] Live brain unreachable, using built-in answers:', err.message);
        }
        respondLocally(text);
      });
  }

  function processInput(text) {
    SpriteEmotion.touch();
    pushHistory('user', text);
    showTyping();
    if (SPRITE_CONFIG.apiUrl) respondViaApi(text);
    else respondLocally(text);
  }

  function autoGrow() {
    var input = document.getElementById('chatInput');
    var shell = document.getElementById('composerShell');
    if (!input || !shell) return;
    input.style.height = 'auto';
    var next = Math.min(Math.max(input.scrollHeight, 36), 160);
    input.style.height = next + 'px';
    var typing = Boolean(input.value.trim());
    shell.classList.toggle('is-typing', typing);
  }

  function send() {
    var input = document.getElementById('chatInput');
    if (!input) return;
    var text = input.value.trim();
    if (!text) return;
    input.value = '';
    autoGrow();
    var chips = document.getElementById('quickChips');
    if (chips) chips.innerHTML = '';
    addMessage(text, 'user');
    processInput(text);
  }

  /* ── TTS ── */

  function speak(html) {
    var text = String(html).replace(/<[^>]*>/g, '');
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    var utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    utter.pitch = 1.3;
    utter.onstart = function () { SpriteEmotion.setTalking(true); };
    utter.onend = function () { SpriteEmotion.setTalking(false); };
    utter.onerror = function () { SpriteEmotion.setTalking(false); };
    window.speechSynthesis.speak(utter);
  }

  function toggleTTS() {
    ttsEnabled = !ttsEnabled;
    var btn = document.getElementById('ttsToggle');
    if (!btn) return;
    btn.classList.toggle('active', ttsEnabled);
    btn.setAttribute('aria-pressed', String(ttsEnabled));
    btn.title = ttsEnabled ? 'Voice output ON' : 'Voice output OFF';
  }

  /* ── Mic ── */

  function toggleMic() {
    if (isRecording) { stopRecording(); return; }
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    recognition = new SR();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = function (e) {
      var input = document.getElementById('chatInput');
      if (input) input.value = e.results[0][0].transcript;
      autoGrow();
      send();
      stopRecording();
    };
    recognition.onerror = function () { stopRecording(); };
    recognition.onend = function () { stopRecording(); };
    recognition.start();
    isRecording = true;
    SpriteEmotion.hold('mic');
    var mic = document.getElementById('micBtn');
    if (mic) mic.classList.add('recording');
    SpriteEmotion.setEmotion('curious', { duration: 15000, priority: 8, force: true });
  }

  function stopRecording() {
    if (recognition) {
      try { recognition.stop(); } catch (e) { /* already stopped */ }
      recognition = null;
    }
    isRecording = false;
    var mic = document.getElementById('micBtn');
    if (mic) mic.classList.remove('recording');
    SpriteEmotion.release('mic');
  }

  /* ── Navigation ── */

  function navigateTo(sectionId) {
    var el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      SpriteChat.setEmotion('happy', { duration: SPRITE_CONFIG.ui.navigate, force: true });
      setTimeout(function () {
        addMessage('Here you go! Take a look around.', 'sprite', true);
      }, 600);
      return;
    }
    window.location.href = SPRITE_CONFIG.sections[sectionId] || ('/#' + sectionId);
  }

  document.addEventListener('sprite:emotion', function (event) {
    if (!event.detail || !event.detail.emotion) return;
    SpriteChat.setEmotion(event.detail.emotion, event.detail);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  return {
    open: open,
    close: close,
    send: send,
    toggleTTS: toggleTTS,
    toggleMic: toggleMic,
    navigateTo: navigateTo,
    setStatus: setStatus,
    setEmotion: function (emotion, options) { return SpriteEmotion.setEmotion(emotion, options); },
    resetEmotion: function () { return SpriteEmotion.reset(); },
    wake: function () { return SpriteEmotion.wake(); },
    sleep: function () { return SpriteEmotion.sleep(); },
    react: function (emotion, options) { return SpriteEmotion.setEmotion(emotion, options); },
    getEmotion: function () { return SpriteEmotion.getState(); },
  };
})();

/* Explicit global: inline handlers and tooling reach SpriteChat via window. */
window.SpriteChat = SpriteChat;
