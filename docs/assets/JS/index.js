/* ═══════════════════════════════════════════════════════════════
   BEBEN DESIGN — index.js  (v2)
   Homepage interaction logic.
   ═══════════════════════════════════════════════════════════════ */

document.documentElement.classList.add('js');

(function () {
    'use strict';

    // ── 1. THEME ─────────────────────────────────────────────────
    // Restore the saved preference before paint. A new visitor gets the
    // house default, dark, rather than following the OS setting; the
    // toggle writes an explicit choice, so light stays available.
    const html = document.documentElement;
    let savedTheme = null;
    try { savedTheme = localStorage.getItem('beben-theme'); } catch (e) { /* site data blocked */ }
    const initialTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
    html.setAttribute('data-theme', initialTheme);

    const themeToggle = document.getElementById('theme-toggle');

    // The LIGHT/DARK strings both live in the pill markup and crossfade
    // via CSS, so JS only keeps the accessible name in sync. It never
    // rewrites the visible text (that would fight the transition).
    function reflectTheme(theme) {
        if (themeToggle) {
            themeToggle.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
            themeToggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
        }
    }
    reflectTheme(initialTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme') || 'dark';
            const next = current === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', next);
            try { localStorage.setItem('beben-theme', next); } catch (e) { /* site data blocked */ }
            reflectTheme(next);
        });
    }

    // ── 1b. MOVE TICKER PAUSE ────────────────────────────────────
    // The ticker scrolls on its own, so WCAG 2.2.2 asks for a way to
    // stop it. Hover and focus already pause it in CSS; this control
    // makes the stop persistent. Reduced motion hides both the control
    // and the animation, so there is nothing left to pause.
    const ticker = document.querySelector('.move-ticker');
    const tickerPause = document.getElementById('ticker-pause');

    if (ticker && tickerPause) {
        tickerPause.addEventListener('click', () => {
            const paused = ticker.getAttribute('data-paused') === 'true';
            if (paused) {
                ticker.removeAttribute('data-paused');
            } else {
                ticker.setAttribute('data-paused', 'true');
            }
            tickerPause.setAttribute('aria-pressed', String(!paused));
            tickerPause.setAttribute('aria-label', paused ? 'Pause announcement' : 'Resume announcement');
        });
    }

    // ── 2. HAMBURGER MENU ────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const overlay   = document.getElementById('mobile-menu-overlay');
    const body      = document.body;

    // Robust scroll-lock: hide overflow on both root and body (some
    // mobile browsers scroll either one), compensate the disappearing
    // scrollbar so the page does not jump sideways, and restore the
    // exact scroll position on close. The overlay itself stays
    // position:fixed with its own internal scroll.
    let savedScrollY = 0;
    function lockScroll() {
        savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        if (scrollbarWidth > 0) body.style.paddingRight = scrollbarWidth + 'px';
        document.documentElement.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
    }
    function unlockScroll() {
        document.documentElement.style.overflow = '';
        body.style.overflow = '';
        body.style.paddingRight = '';
        window.scrollTo(0, savedScrollY);
    }
    function openMenu() {
        overlay.classList.add('is-active');
        body.classList.add('menu-open');
        lockScroll();
        hamburger.setAttribute('aria-expanded', 'true');
    }
    function closeMenu() {
        overlay.classList.remove('is-active');
        body.classList.remove('menu-open');
        unlockScroll();
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

    // ── 3b. AI STARS ENTRANCE ────────────────────────────────────
    // One-shot attention cue for the AI banner sparkles: when the icon
    // scrolls into view, CSS lifts it ~5px with a small wiggle and
    // settles it back to rest (transform-only, no layout shift, runs
    // once). Lives here in the shared file rather than as a per-page
    // observer. Reduced motion: no cue at all.
    const aiIcon = document.querySelector('.ai-pill__icon');
    if (aiIcon && !prefersReduced && typeof IntersectionObserver !== 'undefined') {
        const starsObserver = new IntersectionObserver((entries, obs) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('stars-enter');
                    obs.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });
        starsObserver.observe(aiIcon);
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

/* Optional GA4 analytics. Basic consent: no Google code or requests before
   opt-in. Kept in the shared shell, never in offline tools or games. */
(function () {
    'use strict';
    const ID = 'G-RN3XPCCE2S';
    const KEY = 'beben-analytics-consent-v1';
    const MAX_AGE = 180 * 24 * 60 * 60 * 1000;
    const production = ['bebendesign.com', 'www.bebendesign.com'].includes(location.hostname);
    let loaded = false;
    let returnFocus = null;
    window['ga-disable-' + ID] = true;

    function readChoice() {
        try {
            const saved = JSON.parse(localStorage.getItem(KEY));
            if (saved && ['granted', 'denied'].includes(saved.value)
                && typeof saved.at === 'number' && saved.at <= Date.now()
                && Date.now() - saved.at < MAX_AGE) return saved.value;
        } catch (e) { /* Missing or blocked storage means no consent. */ }
        return null;
    }

    function clearCookies() {
        // GA4's first-party cookies only; leave unrelated cookies untouched.
        document.cookie.split(';').forEach((part) => {
            const name = part.split('=')[0].trim();
            if (!/^_ga(?:_|$)/.test(name)) return;
            ['', location.hostname, '.' + location.hostname, 'bebendesign.com', '.bebendesign.com'].forEach((domain) => {
                document.cookie = name + '=; Max-Age=0; Path=/; SameSite=Lax'
                    + (domain ? '; Domain=' + domain : '');
            });
        });
    }

    function safeURL(value) {
        try {
            const url = new URL(value);
            return url.origin + url.pathname;
        } catch (e) { return ''; }
    }

    function start() {
        if (loaded || !production) return;
        loaded = true;
        window['ga-disable-' + ID] = false;
        window.dataLayer = window.dataLayer || [];
        window.gtag = function () { window.dataLayer.push(arguments); };
        window.gtag('consent', 'default', {
            analytics_storage: 'granted',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        });
        window.gtag('js', new Date());
        window.gtag('config', ID, {
            send_page_view: false,
            allow_google_signals: false,
            allow_ad_personalization_signals: false,
            cookie_expires: MAX_AGE / 1000,
            cookie_domain: 'bebendesign.com',
            cookie_flags: 'SameSite=Lax;Secure',
            page_location: safeURL(location.href),
            page_referrer: safeURL(document.referrer),
        });
        window.gtag('event', 'page_view', {
            page_location: safeURL(location.href),
            page_referrer: safeURL(document.referrer),
        });
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
        document.head.appendChild(script);
    }

    const panel = document.createElement('section');
    panel.className = 'analytics-consent';
    panel.hidden = true;
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'analytics-consent-title');
    panel.innerHTML = '<h2 id="analytics-consent-title">Optional analytics</h2>'
        + '<p>May I use Google Analytics to understand which pages help visitors? '
        + 'It uses cookies and sends visit data to Google only if you accept. '
        + 'Tools and games stay untracked. <a href="/privacy/">Privacy policy</a>.</p>'
        + '<p class="analytics-consent__status" aria-live="polite"></p>'
        + '<div class="analytics-consent__actions">'
        + '<button type="button" data-analytics="denied">Reject analytics</button>'
        + '<button type="button" data-analytics="granted">Accept analytics</button>'
        + '<button type="button" data-analytics="close" hidden>Close</button></div>';
    document.body.appendChild(panel);
    const close = panel.querySelector('[data-analytics="close"]');
    const status = panel.querySelector('.analytics-consent__status');
    const settings = document.createElement('button');
    settings.type = 'button';
    settings.className = 'analytics-settings';
    settings.textContent = 'Analytics preferences';
    settings.setAttribute('aria-controls', 'analytics-consent-panel');
    settings.setAttribute('aria-expanded', 'false');
    panel.id = 'analytics-consent-panel';
    const footer = document.querySelector('.footer-meta') || document.querySelector('footer');
    if (footer) footer.appendChild(settings);

    function show(focus) {
        const choice = readChoice();
        status.textContent = choice === 'granted' ? 'Analytics is currently accepted.'
            : choice === 'denied' ? 'Analytics is currently rejected.' : '';
        close.hidden = !choice;
        panel.hidden = false;
        settings.setAttribute('aria-expanded', 'true');
        if (focus) {
            returnFocus = document.activeElement;
            panel.querySelector('button').focus();
        }
    }

    function hide() {
        panel.hidden = true;
        settings.setAttribute('aria-expanded', 'false');
        if (returnFocus) returnFocus.focus();
        returnFocus = null;
    }

    function choose(value) {
        try { localStorage.setItem(KEY, JSON.stringify({ value: value, at: Date.now() })); }
        catch (e) { /* Choice still applies to this page; ask again next visit. */ }
        if (value === 'granted') start();
        else {
            window['ga-disable-' + ID] = true;
            clearCookies();
            // A reload removes Google's in-memory code and event handlers.
            if (loaded) { location.reload(); return; }
        }
        hide();
    }

    panel.querySelectorAll('[data-analytics]').forEach((button) => {
        button.addEventListener('click', () => {
            if (button.dataset.analytics === 'close') hide();
            else choose(button.dataset.analytics);
        });
    });
    panel.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && !close.hidden) hide();
    });
    settings.addEventListener('click', () => show(true));
    window.addEventListener('storage', (event) => {
        if (event.key !== KEY && event.key !== null) return;
        // Re-evaluate consent in other tabs, including clearing site storage.
        window['ga-disable-' + ID] = true;
        location.reload();
    });
    const choice = readChoice();
    if (choice === 'granted') start();
    else {
        clearCookies();
        if (!choice) show(false);
    }
})();
