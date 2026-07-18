/* ═══════════════════════════════════════════════════════════════
   BEBEN ARCADE — arcade.js
   Shared runtime for every game under /games/. Load in <head>
   (no defer).

   iOS standalone notes:
   - Installed-app storage is partitioned from the Safari tab, so
     scores set while browsing won't appear inside the install.
   - WebAudio obeys the hardware mute switch; silent mode = no SFX.
   - No vibration API and no beforeinstallprompt on iOS — haptics
     and the install button are Android-only enhancements.
   - Out-of-scope links open an in-app browser sheet (expected for
     the "← beben.design" escape link on the hub).
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    var SETTINGS_KEY = 'beben-arcade-settings';
    var SCORES_KEY = 'beben-arcade-scores';
    var DEFAULTS = { sound: true, haptics: true, hintDismissed: false, lastPlayed: null };

    /* ── storage helpers (Safari private mode throws) ─────────── */
    function readJSON(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (!raw) return Object.assign({}, fallback);
            return Object.assign({}, fallback, JSON.parse(raw));
        } catch (e) { return Object.assign({}, fallback); }
    }
    function writeJSON(key, obj) {
        try { localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* ignore */ }
    }

    /* ── settings ─────────────────────────────────────────────── */
    var settingsData = readJSON(SETTINGS_KEY, DEFAULTS);
    // dark-only since v2: drop the stale theme key from pre-neon installs
    if ('theme' in settingsData) {
        delete settingsData.theme;
        writeJSON(SETTINGS_KEY, settingsData);
    }
    var settingsListeners = [];

    var settings = {
        get: function (key) { return settingsData[key]; },
        set: function (key, val) {
            settingsData[key] = val;
            writeJSON(SETTINGS_KEY, settingsData);
            settingsListeners.forEach(function (fn) { fn(key, val); });
        },
        onChange: function (fn) { settingsListeners.push(fn); }
    };

    /* ── palette for canvas games (cached; accent set in init) ── */
    var paletteCache = null;
    function palette() {
        if (!paletteCache) {
            var cs = getComputedStyle(document.documentElement);
            function v(name) { return cs.getPropertyValue(name).trim(); }
            paletteCache = {
                bg: v('--bg'),
                bgSoft: v('--bg-soft'),
                headers: v('--headers'),
                red: v('--neon-red'),
                yellow: v('--neon-yellow'),
                text: v('--text'),
                muted: v('--text-muted'),
                border: v('--border'),
                gridLine: v('--grid-line'),
                accent: v('--accent'),
                neon: {
                    blue: v('--neon-blue'),
                    pink: v('--neon-pink'),
                    lime: v('--neon-lime'),
                    yellow: v('--neon-yellow'),
                    purple: v('--neon-purple'),
                    orange: v('--neon-orange'),
                    red: v('--neon-red')
                }
            };
        }
        return paletteCache;
    }

    /* ── swipe/tap detector (2048, snake, blockfall soft drop) ── */
    function swipe(el, onSwipe, o) {
        o = o || {};
        var min = o.min || 24, ratio = o.ratio || 1.5;
        var sx = 0, sy = 0, st = 0, active = false;
        el.addEventListener('pointerdown', function (e) {
            active = true; sx = e.clientX; sy = e.clientY; st = performance.now();
        });
        el.addEventListener('pointerup', function (e) {
            if (!active) return;
            active = false;
            var dx = e.clientX - sx, dy = e.clientY - sy;
            var ax = Math.abs(dx), ay = Math.abs(dy);
            if (ax < min && ay < min) {
                if (o.onTap) o.onTap(e);
                return;
            }
            var dt = performance.now() - st;
            if (ax > ay * ratio) onSwipe(dx > 0 ? 'right' : 'left', { dist: ax, ms: dt });
            else if (ay > ax * ratio) onSwipe(dy > 0 ? 'down' : 'up', { dist: ay, ms: dt });
        });
        el.addEventListener('pointercancel', function () { active = false; });
    }

    /* ── scores ───────────────────────────────────────────────── */
    var scores = {
        best: function (slug) {
            var all = readJSON(SCORES_KEY, {});
            return typeof all[slug] === 'number' ? all[slug] : null;
        },
        submit: function (slug, value, opts) {
            var lower = !!(opts && opts.lowerIsBetter);
            var all = readJSON(SCORES_KEY, {});
            var prev = typeof all[slug] === 'number' ? all[slug] : null;
            var isNew = prev === null || (lower ? value < prev : value > prev);
            if (isNew) { all[slug] = value; writeJSON(SCORES_KEY, all); }
            return { best: isNew ? value : prev, isNew: isNew };
        }
    };

    /* ── environment ──────────────────────────────────────────── */
    var env = {
        standalone: matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
        ios: /iP(hone|ad|od)/.test(navigator.userAgent) ||
            (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1),
        touch: 'ontouchstart' in window || navigator.maxTouchPoints > 0
    };

    /* ── audio: lazy AudioContext + tiny 8-bit synth ──────────── */
    var ctx = null, master = null, noiseBuf = null;

    function unlockAudio() {
        if (!ctx) {
            try {
                var AC = window.AudioContext || window.webkitAudioContext;
                ctx = new AC();
                master = ctx.createGain();
                master.gain.value = 0.15;
                master.connect(ctx.destination);
            } catch (e) { return; }
        }
        if (ctx.state === 'suspended') ctx.resume();
        if (ctx.state === 'running') {
            document.removeEventListener('pointerdown', unlockAudio, true);
            document.removeEventListener('keydown', unlockAudio, true);
        }
    }
    document.addEventListener('pointerdown', unlockAudio, true);
    document.addEventListener('keydown', unlockAudio, true);

    function tone(freq, dur, type, o) {
        if (!ctx || ctx.state !== 'running') return;
        o = o || {};
        var t0 = ctx.currentTime + (o.when || 0);
        var osc = ctx.createOscillator();
        var g = ctx.createGain();
        osc.type = type || 'square';
        osc.frequency.setValueAtTime(freq, t0);
        if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t0 + dur);
        g.gain.setValueAtTime(o.vol || 0.4, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g); g.connect(master);
        osc.start(t0); osc.stop(t0 + dur + 0.03);
    }

    function noise(dur, o) {
        if (!ctx || ctx.state !== 'running') return;
        o = o || {};
        if (!noiseBuf) {
            noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
            var data = noiseBuf.getChannelData(0);
            for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        }
        var t0 = ctx.currentTime + (o.when || 0);
        var src = ctx.createBufferSource();
        src.buffer = noiseBuf; src.loop = true;
        var lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = o.freq || 800;
        var g = ctx.createGain();
        g.gain.setValueAtTime(o.vol || 0.5, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        src.connect(lp); lp.connect(g); g.connect(master);
        src.start(t0); src.stop(t0 + dur + 0.03);
    }

    var SFX = {
        tap:     function () { tone(600, 0.03, 'square', { vol: 0.3 }); },
        move:    function () { tone(220, 0.04, 'square', { vol: 0.3 }); },
        coin:    function () { tone(660, 0.05, 'square'); tone(880, 0.08, 'square', { when: 0.05 }); },
        merge:   function () { tone(300, 0.12, 'triangle', { slideTo: 900, vol: 0.5 }); },
        drop:    function () { tone(120, 0.06, 'square', { slideTo: 60 }); },
        clear:   function () { tone(523, 0.06, 'square'); tone(659, 0.06, 'square', { when: 0.06 }); tone(784, 0.1, 'square', { when: 0.12 }); },
        flap:    function () { tone(400, 0.08, 'triangle', { slideTo: 700, vol: 0.45 }); },
        bounce:  function () { tone(880, 0.03, 'square', { vol: 0.3 }); },
        boom:    function () { noise(0.25); tone(90, 0.22, 'square', { slideTo: 40, vol: 0.5 }); },
        fanfare: function () { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0.1, 'square', { when: i * 0.09 }); }); },
        select:  function () { tone(500, 0.04, 'square', { vol: 0.35 }); tone(750, 0.05, 'square', { when: 0.04, vol: 0.35 }); },
        coinup:  function () { tone(660, 0.05, 'square'); tone(880, 0.08, 'square', { when: 0.05 }); tone(1320, 0.12, 'square', { when: 0.13 }); }
    };

    var audio = {
        play: function (name) {
            if (!settingsData.sound) return;
            var fn = SFX[name];
            if (fn) { try { fn(); } catch (e) { /* ignore */ } }
        }
    };

    /* ── haptics (Android only; iOS has no vibration API) ─────── */
    var BUZZ = { light: 10, medium: 25, success: [15, 40, 15], error: [40, 60, 40] };
    var haptics = {
        buzz: function (kind) {
            if (!settingsData.haptics) return;
            if (!('vibrate' in navigator)) return;
            try { navigator.vibrate(BUZZ[kind] || 10); } catch (e) { /* ignore */ }
        }
    };

    /* ── wake lock ────────────────────────────────────────────── */
    var wakeLock = null;
    function requestWake() {
        if (!('wakeLock' in navigator)) return;
        navigator.wakeLock.request('screen').then(function (lock) { wakeLock = lock; }, function () {});
    }
    function releaseWake() {
        if (wakeLock) { try { wakeLock.release(); } catch (e) { /* ignore */ } wakeLock = null; }
    }

    /* ── shared DOM bits ──────────────────────────────────────── */
    var state = { opts: null, paused: false, over: false, silentPause: false };
    var toastEl = null, toastTimer = 0;
    var pauseEl = null, settingsEl = null, overEl = null;

    function toast(msg) {
        if (!toastEl) {
            toastEl = document.createElement('div');
            toastEl.className = 'arc-toast';
            document.body.appendChild(toastEl);
        }
        toastEl.textContent = msg;
        toastEl.classList.add('arc-toast--show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(function () { toastEl.classList.remove('arc-toast--show'); }, 2800);
    }

    /* pause overlay */
    function pauseOverlay(show) {
        if (show && !pauseEl) {
            pauseEl = document.createElement('div');
            pauseEl.className = 'arc-overlay';
            pauseEl.innerHTML = '<div class="arc-pause-msg">Paused<span class="arc-pause-sub">tap anywhere to resume</span></div>';
            pauseEl.addEventListener('pointerdown', function (e) { e.preventDefault(); resumeGame(); });
            document.body.appendChild(pauseEl);
        } else if (!show && pauseEl) {
            pauseEl.remove(); pauseEl = null;
        }
    }

    function pauseGame(silent) {
        if (!state.opts || state.paused || state.over) return;
        state.paused = true;
        state.silentPause = !!silent;
        if (state.opts.onPause) state.opts.onPause();
        if (!silent) pauseOverlay(true);
    }
    function resumeGame() {
        if (!state.opts || !state.paused) return;
        state.paused = false;
        state.silentPause = false;
        pauseOverlay(false);
        if (state.opts.onResume) state.opts.onResume();
    }

    /* settings panel */
    function buildToggleRow(label, key) {
        var row = document.createElement('div');
        row.className = 'arc-row';
        var btn = document.createElement('button');
        btn.className = 'arc-toggle';
        function paint() {
            var on = !!settingsData[key];
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.textContent = on ? 'ON' : 'OFF';
        }
        btn.addEventListener('click', function () {
            settings.set(key, !settingsData[key]);
            paint();
            audio.play('tap');
            haptics.buzz('light');
        });
        paint();
        row.appendChild(document.createTextNode(label));
        row.appendChild(btn);
        return row;
    }

    function openSettings() {
        if (settingsEl) return;
        var wasPaused = state.paused;
        if (state.opts && !state.over) pauseGame(true);

        settingsEl = document.createElement('div');
        settingsEl.className = 'arc-overlay';
        var panel = document.createElement('div');
        panel.className = 'arc-panel';
        panel.innerHTML = '<div class="arc-panel-title">Settings</div>';
        panel.appendChild(buildToggleRow('Sound', 'sound'));
        panel.appendChild(buildToggleRow('Haptics', 'haptics'));

        var actions = document.createElement('div');
        actions.className = 'arc-actions';
        var close = document.createElement('button');
        close.className = 'arc-action arc-action--primary';
        close.textContent = 'Close';
        close.addEventListener('click', function () {
            settingsEl.remove(); settingsEl = null;
            // if we auto-paused for the panel, hand back a visible pause
            if (state.opts && state.paused && state.silentPause && !wasPaused && !state.over) {
                state.silentPause = false;
                pauseOverlay(true);
            }
        });
        actions.appendChild(close);
        panel.appendChild(actions);

        settingsEl.appendChild(panel);
        document.body.appendChild(settingsEl);
    }

    /* game-over overlay */
    function gameOver(o) {
        state.over = true;
        pauseOverlay(false);
        if (overEl) { overEl.remove(); overEl = null; }

        overEl = document.createElement('div');
        overEl.className = 'arc-overlay';
        var panel = document.createElement('div');
        panel.className = 'arc-panel';
        panel.style.textAlign = 'center';

        var html = '<div class="arc-over-title">' + (o.title || 'Game Over') + '</div>' +
            '<div class="arc-over-label">' + (o.label || 'Score') + '</div>' +
            '<div class="arc-over-score">' + o.score + '</div>';
        if (o.best !== null && o.best !== undefined) {
            html += '<span class="arc-best-chip">BEST ' + o.best + '</span>';
        }
        if (o.isNew) html += '<span class="arc-newbest">NEW BEST</span>';
        panel.innerHTML = html;

        var actions = document.createElement('div');
        actions.className = 'arc-actions';
        var replay = document.createElement('button');
        replay.className = 'arc-action arc-action--primary';
        replay.textContent = 'Replay';
        replay.addEventListener('click', function () {
            overEl.remove(); overEl = null;
            state.over = false;
            audio.play('tap');
            if (o.onReplay) o.onReplay();
        });
        var hub = document.createElement('a');
        hub.className = 'arc-action';
        hub.href = '../';
        hub.textContent = 'Hub';
        actions.appendChild(replay);
        actions.appendChild(hub);
        panel.appendChild(actions);

        overEl.appendChild(panel);
        document.body.appendChild(overEl);

        if (o.isNew) {
            audio.play('fanfare');
            haptics.buzz('success');
        }
    }

    function setScore(text) {
        var slot = document.querySelector('.arc-score-slot');
        if (slot) slot.textContent = text;
    }

    /* ── game init: bar + lifecycle wiring ────────────────────── */
    function init(opts) {
        state.opts = opts || {};
        document.body.classList.add('arc-playing');
        if (opts && opts.slug) settings.set('lastPlayed', opts.slug);

        var bar = document.createElement('header');
        bar.className = 'arc-bar';
        bar.innerHTML =
            '<a class="arc-back" href="../" aria-label="Back to arcade">&larr;</a>' +
            '<span class="arc-title"></span>' +
            '<span class="arc-score-slot"></span>' +
            '<button class="arc-btn arc-pause-btn" aria-label="Pause">&#10074;&#10074;</button>' +
            '<button class="arc-btn arc-gear" aria-label="Settings">&#9881;</button>';
        bar.querySelector('.arc-title').textContent = opts.title || '';
        document.body.prepend(bar);

        bar.querySelector('.arc-pause-btn').addEventListener('click', function () {
            if (state.over) return;
            audio.play('tap');
            if (state.paused) resumeGame(); else pauseGame();
        });
        bar.querySelector('.arc-gear').addEventListener('click', function () {
            audio.play('tap');
            openSettings();
        });

        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                pauseGame();
                if (ctx && ctx.state === 'running') ctx.suspend();
                releaseWake();
            } else {
                if (ctx && ctx.state === 'suspended') ctx.resume();
                requestWake();
            }
        });

        // Safari pinch + stray scrolls inside the locked viewport
        document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
        document.addEventListener('touchmove', function (e) {
            if (e.target.closest('.arc-panel')) return;
            e.preventDefault();
        }, { passive: false });

        requestWake();
        registerSW();

        // the bar + arc-playing layout change the stage box; refit any
        // canvas that was fitted before init ran
        setTimeout(function () { window.dispatchEvent(new Event('resize')); }, 0);
    }

    /* ── canvas fitting ───────────────────────────────────────── */
    function fitCanvas(canvas, o) {
        o = o || {};
        var stage = canvas.parentElement;
        var out = { canvas: canvas, ctx: canvas.getContext('2d'), w: 0, h: 0, dpr: 1 };
        function fit() {
            var cs = getComputedStyle(stage);
            var bw = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
            var bh = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            var w = bw, h = bh;
            if (o.aspect) {
                if (bw / bh > o.aspect) { h = bh; w = bh * o.aspect; }
                else { w = bw; h = bw / o.aspect; }
            }
            if (o.maxW && w > o.maxW) { h = h * (o.maxW / w); w = o.maxW; }
            w = Math.floor(w); h = Math.floor(h);
            var dpr = Math.min(window.devicePixelRatio || 1, 3);
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            out.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            out.w = w; out.h = h; out.dpr = dpr;
            if (o.onResize) o.onResize(out);
        }
        fit();
        window.addEventListener('resize', fit);
        out.refit = fit;
        return out;
    }

    /* ── fixed-timestep loop ──────────────────────────────────── */
    function loop(o) {
        var step = o.step || 1000 / 60;
        var raf = 0, last = 0, acc = 0, running = false, paused = false;
        function frame(t) {
            if (!running) return;
            raf = requestAnimationFrame(frame);
            if (paused) { last = t; return; }
            var dt = t - last;
            last = t;
            if (dt > 250) dt = step;
            acc += dt;
            var n = 0;
            while (acc >= step && n < 8) { o.update(step / 1000); acc -= step; n++; }
            if (n === 8) acc = 0;
            o.render(acc / step);
        }
        return {
            start: function () {
                if (running) return;
                running = true; paused = false;
                last = performance.now(); acc = 0;
                raf = requestAnimationFrame(frame);
            },
            stop: function () { running = false; cancelAnimationFrame(raf); },
            pause: function () { paused = true; },
            resume: function () { if (!running) this.start(); paused = false; },
            isPaused: function () { return paused; }
        };
    }

    /* ── install hint (hub) ───────────────────────────────────── */
    var deferredPrompt = null;
    window.addEventListener('beforeinstallprompt', function (e) {
        e.preventDefault();
        deferredPrompt = e;
    });

    function installHint(container) {
        if (env.standalone || settingsData.hintDismissed) return;

        function dismissBtn() {
            var x = document.createElement('button');
            x.className = 'arc-hint-close';
            x.setAttribute('aria-label', 'Dismiss');
            x.textContent = '×';
            x.addEventListener('click', function () {
                settings.set('hintDismissed', true);
                container.innerHTML = '';
            });
            return x;
        }

        if (env.ios) {
            var hint = document.createElement('div');
            hint.className = 'arc-hint';
            hint.innerHTML = '<span>Install the arcade: tap <strong>Share</strong> &#9654; <strong>Add to Home Screen</strong>. Plays offline, no ads, ever.</span>';
            hint.appendChild(dismissBtn());
            container.appendChild(hint);
            return;
        }

        function renderInstall() {
            container.innerHTML = '';
            var hint = document.createElement('div');
            hint.className = 'arc-hint';
            var span = document.createElement('span');
            span.innerHTML = 'Install the arcade &mdash; plays offline, no ads, ever.';
            var btn = document.createElement('button');
            btn.className = 'arc-action arc-action--primary';
            btn.textContent = 'Install';
            btn.addEventListener('click', function () {
                if (!deferredPrompt) return;
                deferredPrompt.prompt();
                deferredPrompt = null;
                container.innerHTML = '';
            });
            hint.appendChild(span);
            hint.appendChild(btn);
            hint.appendChild(dismissBtn());
            container.appendChild(hint);
        }

        if (deferredPrompt) renderInstall();
        else window.addEventListener('beforeinstallprompt', function () { setTimeout(renderInstall, 0); }, { once: true });
    }

    /* ── service worker ───────────────────────────────────────── */
    var swRegistered = false, reloaded = false;
    function registerSW() {
        if (swRegistered || !('serviceWorker' in navigator)) return;
        swRegistered = true;
        var hadController = !!navigator.serviceWorker.controller;
        navigator.serviceWorker.addEventListener('controllerchange', function () {
            if (!hadController) {
                hadController = true;
                toast('Offline ready ✓');
                return;
            }
            if (state.opts) {
                toast('Arcade updated — new stuff on the hub');
            } else if (!reloaded) {
                reloaded = true;
                location.reload();
            }
        });
        var doRegister = function () {
            navigator.serviceWorker.register('/games/sw.js', { updateViaCache: 'none' }).catch(function () {});
        };
        if (document.readyState === 'complete') doRegister();
        else window.addEventListener('load', doRegister);
    }

    /* ── public API ───────────────────────────────────────────── */
    window.Arcade = {
        init: init,
        settings: settings,
        scores: scores,
        audio: audio,
        haptics: haptics,
        env: env,
        palette: palette,
        swipe: swipe,
        fitCanvas: fitCanvas,
        loop: loop,
        installHint: installHint,
        registerSW: registerSW,
        openSettings: openSettings,
        ui: {
            gameOver: gameOver,
            pauseOverlay: pauseOverlay,
            toast: toast,
            setScore: setScore
        }
    };
})();
