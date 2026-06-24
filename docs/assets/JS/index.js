/* ═══════════════════════════════════════════════════════════════
   BEBEN DESIGN — index.js  (v2)
   Homepage interaction logic.
   ═══════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js');

(function () {
    'use strict';

    // ── 1. THEME ─────────────────────────────────────────────────
    // Restore saved preference before paint; fall back to system
    // preference on first visit rather than always defaulting light.
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('beben-theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    html.setAttribute('data-theme', initialTheme);

    const themeToggle = document.getElementById('theme-toggle');
    const themeLabel = themeToggle ? themeToggle.querySelector('.theme-toggle__label') : null;

    function reflectTheme(theme) {
        if (themeLabel) themeLabel.textContent = theme === 'dark' ? 'DARK' : 'LIGHT';
        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
            themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }
    reflectTheme(initialTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme') || 'light';
            const next = current === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', next);
            localStorage.setItem('beben-theme', next);
            reflectTheme(next);
        });
    }

    // ── 2. HAMBURGER MENU ────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const overlay   = document.getElementById('mobile-menu-overlay');
    const body      = document.body;

    function openMenu() {
        overlay.classList.add('is-active');
        body.classList.add('menu-open');
        body.style.overflow = 'hidden';
        hamburger.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
        overlay.classList.remove('is-active');
        body.classList.remove('menu-open');
        body.style.overflow = '';
        hamburger.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu() {
        overlay.classList.contains('is-active') ? closeMenu() : openMenu();
    }

    if (hamburger && overlay) {
        hamburger.addEventListener('click', toggleMenu);
        overlay.querySelectorAll('.mobile-menu a').forEach((link) => link.addEventListener('click', closeMenu));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeMenu(); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('is-active')) {
                closeMenu();
                hamburger.focus();
            }
        });
    }

    // ── 3. STAGGERED REVEAL ──────────────────────────────────────
    // Adds .is-visible to each [data-reveal] element as it enters
    // the viewport. Stagger comes from the --i custom property set
    // in the markup, not JS timing. Reduced motion: show everything
    // immediately, no observer at all.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const revealEls = document.querySelectorAll('[data-reveal]');

    if (prefersReduced) {
        revealEls.forEach((el) => el.classList.add('is-visible'));
    } else {
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.15 });
        revealEls.forEach((el) => revealObserver.observe(el));
    }

    // ── 4. FAQ ACCORDION ─────────────────────────────────────────
    document.querySelectorAll('.faq-trigger').forEach((trigger) => {
        trigger.addEventListener('click', () => {
            const answer = trigger.nextElementSibling;
            const isOpen = trigger.getAttribute('aria-expanded') === 'true';

            document.querySelectorAll('.faq-trigger').forEach((other) => {
                if (other !== trigger) {
                    other.setAttribute('aria-expanded', 'false');
                    const otherAnswer = other.nextElementSibling;
                    if (otherAnswer) otherAnswer.classList.remove('open');
                }
            });

            const newState = !isOpen;
            trigger.setAttribute('aria-expanded', String(newState));
            if (answer) answer.classList.toggle('open', newState);
        });
    });

    // ── 5. COPY EMAIL + TOAST ────────────────────────────────────
    const toast = document.getElementById('copy-toast');
    document.querySelectorAll('.copy-email').forEach((link) => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const email = this.dataset.email;
            if (!email) return;
            navigator.clipboard.writeText(email).then(() => {
                if (toast) {
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 2500);
                }
            }).catch(() => { window.location.href = 'mailto:' + email; });
        });
    });

    // ── 6. DEMO CONSOLE SIMULATION ───────────────────────────────
    // A live-style preview of how a Beben engagement actually runs —
    // metrics random-walk within a realistic band rather than
    // jumping to a fresh value each tick, so it reads as "live"
    // instead of "flickering". Starts only once the section actually
    // scrolls into view, and shows a short static preview instead
    // under prefers-reduced-motion.
    const demoSection = document.getElementById('demo');
    const logFeed = document.getElementById('demoLog');
    if (demoSection && logFeed) {
        const metricEls = {
            score: document.getElementById('metricScore'),
            iterations: document.getElementById('metricIterations'),
            findings: document.getElementById('metricFindings'),
            time: document.getElementById('metricTime'),
        };

        const logLines = [
            'usability test session #14 logged',
            'wireframe v3 committed to design system',
            'accessibility audit passed: WCAG AA',
            'contrast check cleared on all components',
            'user interview transcript synced',
            'prototype shared with stakeholder for review',
            'heuristic evaluation completed, 2 findings closed',
            'design tokens exported to dev handoff',
            'card-sort results clustered into 4 themes',
            'no regressions found in latest QA pass',
        ];

        const metrics = { score: 92, iterations: 14, findings: 3, time: 2.4 };

        function clampStep(value, min, max, maxStep) {
            const step = (Math.random() * 2 - 1) * maxStep;
            return Math.min(max, Math.max(min, value + step));
        }

        function renderMetrics() {
            if (metricEls.score) metricEls.score.textContent = Math.round(metrics.score) + '/100';
            if (metricEls.iterations) metricEls.iterations.textContent = Math.round(metrics.iterations);
            if (metricEls.findings) metricEls.findings.textContent = Math.round(metrics.findings);
            if (metricEls.time) metricEls.time.textContent = metrics.time.toFixed(1) + 'h';
        }

        function tickMetrics() {
            metrics.score = clampStep(metrics.score, 84, 98, 2);
            metrics.iterations = clampStep(metrics.iterations, 8, 22, 1.5);
            metrics.findings = clampStep(metrics.findings, 0, 6, 1);
            metrics.time = clampStep(metrics.time, 1.6, 3.4, 0.25);
            renderMetrics();
        }

        function appendLog() {
            const line = logLines[Math.floor(Math.random() * logLines.length)];
            const row = document.createElement('div');
            row.className = 'tui__line';
            row.innerHTML = '<span class="tui__check">- [x]</span> ' + line;
            logFeed.appendChild(row);
            while (logFeed.children.length > 8) logFeed.removeChild(logFeed.firstChild);
            logFeed.scrollTop = logFeed.scrollHeight;
        }

        let demoStarted = false;
        function startDemo() {
            if (demoStarted) return;
            demoStarted = true;
            renderMetrics();

            if (prefersReduced) {
                appendLog();
                appendLog();
                appendLog();
                return;
            }
            appendLog();
            setInterval(tickMetrics, 1700);
            setInterval(appendLog, 2300);
        }

        const demoObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    startDemo();
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        demoObserver.observe(demoSection);
    }
})();
