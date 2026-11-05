/* Development workbench for github.com/luishowin/sprite */
(function () {
  'use strict';

  var DEFAULT_TIMINGS = null;
  var reducedEmulation = false;
  var systemReduced = false;
  var manualFace = null;
  var manualSliders = [];

  var GEOMETRY = {
    '--eye-l-dx': { label: 'Left X', min: -20, max: 20, step: 0.5, unit: 'px', group: 'Left eye' },
    '--eye-l-dy': { label: 'Left Y', min: -20, max: 20, step: 0.5, unit: 'px', group: 'Left eye' },
    '--eye-l-sx': { label: 'Left width', min: 0.3, max: 1.8, step: 0.05, unit: '', group: 'Left eye' },
    '--eye-l-sy': { label: 'Left height', min: 0.1, max: 1.8, step: 0.05, unit: '', group: 'Left eye' },
    '--eye-l-rot': { label: 'Left rotation', min: -45, max: 45, step: 1, unit: 'deg', group: 'Left eye' },
    '--eye-l-opacity': { label: 'Left opacity', min: 0, max: 1, step: 0.05, unit: '', group: 'Left eye' },

    '--eye-r-dx': { label: 'Right X', min: -20, max: 20, step: 0.5, unit: 'px', group: 'Right eye' },
    '--eye-r-dy': { label: 'Right Y', min: -20, max: 20, step: 0.5, unit: 'px', group: 'Right eye' },
    '--eye-r-sx': { label: 'Right width', min: 0.3, max: 1.8, step: 0.05, unit: '', group: 'Right eye' },
    '--eye-r-sy': { label: 'Right height', min: 0.1, max: 1.8, step: 0.05, unit: '', group: 'Right eye' },
    '--eye-r-rot': { label: 'Right rotation', min: -45, max: 45, step: 1, unit: 'deg', group: 'Right eye' },
    '--eye-r-opacity': { label: 'Right opacity', min: 0, max: 1, step: 0.05, unit: '', group: 'Right eye' },

    '--mouth-dx': { label: 'X', min: -20, max: 20, step: 0.5, unit: 'px', group: 'Mouth' },
    '--mouth-dy': { label: 'Y', min: -20, max: 20, step: 0.5, unit: 'px', group: 'Mouth' },
    '--mouth-sx': { label: 'Width', min: 0.1, max: 2, step: 0.05, unit: '', group: 'Mouth' },
    '--mouth-sy': { label: 'Height', min: -1.5, max: 1.5, step: 0.05, unit: '', group: 'Mouth' },
    '--mouth-rot': { label: 'Rotation', min: -45, max: 45, step: 1, unit: 'deg', group: 'Mouth' },
    '--mouth-stroke': { label: 'Stroke', min: 1, max: 5, step: 0.1, unit: '', group: 'Mouth' },
  };

  function labelFor(name) {
    return name.replace(/-/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); });
  }

  function seconds(ms) {
    return Math.max(0, Math.round(ms / 1000)) + 's';
  }

  function buildEmotionButtons() {
    var grid = document.getElementById('emotionGrid');
    if (!grid) return;
    SpriteEmotion.emotions.forEach(function (name) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'emotion-button';
      btn.textContent = labelFor(name);
      btn.setAttribute('data-emotion-button', name);
      btn.addEventListener('click', function () {
        SpriteEmotion.setEmotion(name, { persistent: true, force: true });
        setActiveButton(name);
      });
      grid.appendChild(btn);
    });
    setActiveButton(SpriteEmotion.getState().emotion);
  }

  function setActiveButton(name) {
    document.querySelectorAll('[data-emotion-button]').forEach(function (btn) {
      btn.classList.toggle('is-active', btn.getAttribute('data-emotion-button') === name);
    });
  }

  function buildStateSheet() {
    var host = document.getElementById('stateSheet');
    if (!host) return;
    SpriteEmotion.emotions.forEach(function (name) {
      var cell = document.createElement('div');
      cell.className = 'state-cell';
      var face = document.createElement('div');
      face.className = 'sprite-character';
      face.setAttribute('data-sprite-manual', '');
      face.setAttribute('aria-hidden', 'true');
      var label = document.createElement('span');
      label.textContent = labelFor(name);
      cell.appendChild(face);
      cell.appendChild(label);
      host.appendChild(cell);
      SpriteEmotion.renderPreview(face, name);
    });
  }

  function buildTemporarySelect() {
    var select = document.getElementById('temporaryEmotion');
    if (!select) return;
    SpriteEmotion.emotions.forEach(function (name) {
      var option = document.createElement('option');
      option.value = name;
      option.textContent = labelFor(name);
      select.appendChild(option);
    });
    select.value = 'excited';
  }

  function buildManualSliders() {
    var host = document.getElementById('manualSliders');
    if (!host) return;
    var groups = {};
    Object.keys(GEOMETRY).forEach(function (varName) {
      var spec = GEOMETRY[varName];
      if (!groups[spec.group]) {
        groups[spec.group] = document.createElement('div');
        groups[spec.group].className = 'slider-group';
        var title = document.createElement('h3');
        title.textContent = spec.group;
        groups[spec.group].appendChild(title);
        host.appendChild(groups[spec.group]);
      }
      var row = document.createElement('label');
      row.className = 'slider';
      var name = document.createElement('span');
      name.textContent = spec.label;
      var input = document.createElement('input');
      input.type = 'range';
      input.min = spec.min;
      input.max = spec.max;
      input.step = spec.step;
      input.value = 0;
      input.setAttribute('data-var', varName);
      var output = document.createElement('output');
      output.textContent = '0';
      row.appendChild(name);
      row.appendChild(input);
      row.appendChild(output);
      groups[spec.group].appendChild(row);
      manualSliders.push({ input: input, output: output, varName: varName, spec: spec });
      input.addEventListener('input', function () {
        var value = Number(input.value);
        manualFace.style.setProperty(varName, value + spec.unit);
        output.textContent = value + spec.unit;
      });
    });
  }

  function syncSlidersFromFace() {
    if (!manualFace) return;
    var computed = getComputedStyle(manualFace);
    manualSliders.forEach(function (item) {
      var raw = computed.getPropertyValue(item.varName).trim();
      var value = parseFloat(raw);
      if (Number.isNaN(value)) value = 0;
      item.input.value = value;
      item.output.textContent = value + item.spec.unit;
    });
  }

  function refreshState() {
    var state = SpriteEmotion.getState();
    var emotion = document.getElementById('stateEmotion');
    var priority = document.getElementById('statePriority');
    var base = document.getElementById('stateBase');
    var sleep = document.getElementById('stateSleep');
    if (emotion) emotion.textContent = labelFor(state.emotion);
    if (priority) priority.textContent = String(state.priority);
    if (base) base.textContent = labelFor(state.base);
    if (sleep) sleep.textContent = state.sleeping ? 'asleep' : seconds(state.idleIn);
    setActiveButton(state.emotion);
  }

  function initPreview() {
    manualFace = document.getElementById('manualFace');
    if (!manualFace) return;
    SpriteEmotion.renderStandalone(manualFace);
    buildManualSliders();
    syncSlidersFromFace();

    var reset = document.getElementById('resetGeometry');
    if (reset) {
      reset.addEventListener('click', function () {
        SpriteEmotion.setEmotion('neutral', { persistent: true, force: true });
        SpriteEmotion.renderStandalone(manualFace);
        syncSlidersFromFace();
      });
    }

    var loadNeutral = document.getElementById('loadNeutralGeometry');
    if (loadNeutral) {
      loadNeutral.addEventListener('click', function () {
        SpriteEmotion.setEmotion('neutral', { persistent: true, force: true });
        SpriteEmotion.renderStandalone(manualFace);
        syncSlidersFromFace();
      });
    }
  }

  function initTransition() {
    var range = document.getElementById('transitionRange');
    var output = document.getElementById('transitionOutput');
    if (!range) return;
    function apply() {
      var value = range.value + 'ms';
      if (output) output.textContent = value;
      document.querySelectorAll('.sprite-character').forEach(function (el) {
        el.style.setProperty('--sprite-transition', value);
      });
    }
    range.addEventListener('input', apply);
    apply();
  }

  function initActions() {
    document.querySelectorAll('[data-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-action');
        if (action === 'blink') SpriteEmotion.playBlink();
        if (action === 'double-blink') SpriteEmotion.playBlink({ double: true });
        if (action === 'look' || action === 'idle-look') SpriteEmotion.playLookAround();
        if (action === 'bounce-excited') SpriteEmotion.setEmotion('excited', { duration: 1800, force: true });
        if (action === 'bounce-happy') SpriteEmotion.setEmotion('happy', { duration: 1800, force: true });
        if (action === 'bounce-proud') SpriteEmotion.setEmotion('smug-proud', { duration: 2600, force: true });
        if (action === 'sleep') SpriteEmotion.sleep();
        if (action === 'wake') SpriteEmotion.wake();
        if (action === 'neutral') SpriteEmotion.setEmotion('neutral', { persistent: true, force: true });
        if (action === 'fast-idle') {
          SpriteEmotion.configure({
            lookAroundAfterMin: 800,
            lookAroundAfterMax: 1600,
            idleLookMin: 1600,
            idleLookMax: 2800,
            sleepAfter: 7000,
          });
          SpriteEmotion.touch();
        }
        if (action === 'restore-idle') {
          SpriteEmotion.configure(DEFAULT_TIMINGS);
          SpriteEmotion.touch();
        }
        refreshState();
      });
    });

    var play = document.getElementById('playTemporary');
    if (play) {
      play.addEventListener('click', function () {
        var select = document.getElementById('temporaryEmotion');
        var duration = Number(document.getElementById('temporaryDuration').value) || 2200;
        SpriteEmotion.setEmotion(select.value, { duration: duration, force: true });
        refreshState();
      });
    }
  }

  function initReducedMotion() {
    var media = window.matchMedia('(prefers-reduced-motion: reduce)');
    systemReduced = media.matches;
    var toggle = document.getElementById('reducedMotionToggle');
    var label = document.getElementById('reducedMotionLabel');
    var systemLabel = document.getElementById('systemMotion');
    if (systemLabel) systemLabel.textContent = 'Motion: ' + (systemReduced ? 'reduced by system' : 'full');

    function reflect() {
      if (!toggle || !label) return;
      toggle.setAttribute('aria-pressed', String(reducedEmulation));
      label.textContent = reducedEmulation ? 'on' : (systemReduced ? 'system' : 'off');
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        reducedEmulation = !reducedEmulation;
        SpriteEmotion.setReducedMotion(reducedEmulation ? true : null);
        reflect();
      });
    }

    var onChange = function () {
      systemReduced = media.matches;
      if (systemLabel) systemLabel.textContent = 'Motion: ' + (systemReduced ? 'reduced by system' : 'full');
      if (!reducedEmulation && !systemReduced) SpriteEmotion.setReducedMotion(null);
      reflect();
    };
    if (media.addEventListener) media.addEventListener('change', onChange);
    else if (media.addListener) media.addListener(onChange);

    reflect();
  }

  function init() {
    if (!window.SpriteEmotion) return;
    DEFAULT_TIMINGS = Object.assign({}, SpriteEmotion.timings);

    buildEmotionButtons();
    buildStateSheet();
    buildTemporarySelect();
    initPreview();
    initTransition();
    initActions();
    initReducedMotion();
    refreshState();

    SpriteEmotion.onChange(function (state) {
      refreshState();
    });

    setInterval(refreshState, 500);

    if (new URLSearchParams(window.location.search).has('open')) {
      SpriteChat.open();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
