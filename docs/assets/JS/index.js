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
    let savedTheme = null;
    try { savedTheme = localStorage.getItem('beben-theme'); } catch (e) { /* site data blocked */ }
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
            try { localStorage.setItem('beben-theme', next); } catch (e) { /* site data blocked */ }
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

    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
        // No observer means no reveal trigger, and [data-reveal] starts at
        // opacity 0, so show everything rather than showing nothing.
        revealEls.forEach((el) => el.classList.add('is-visible'));
    } else {
        // Two thresholds on purpose. An element taller than about 6.7
        // viewports can never reach a 0.15 ratio, so a long blog post body
        // would sit at opacity 0 forever. Those reveal on any intersection
        // instead; everything that fits on screen keeps the 15% behaviour.
        const revealObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                // rootBounds is null in some embedded contexts, so measure the
                // viewport directly rather than trusting it.
                const viewport = window.innerHeight || document.documentElement.clientHeight;
                const tallerThanViewport = entry.boundingClientRect.height > viewport;
                const ready = tallerThanViewport
                    ? entry.isIntersecting
                    : entry.intersectionRatio >= 0.15;
                if (ready) {
                    entry.target.classList.add('is-visible');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: [0, 0.15] });
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

})();
