/* ═══════════════════════════════════════════════════════════════
   BEBEN DESIGN — index.js
   Homepage interaction logic.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── 1. THEME — restore saved preference immediately ────────────
    // Runs before paint to avoid flash of wrong theme.
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('beben-theme');
    if (savedTheme) {
        html.setAttribute('data-theme', savedTheme);
    }

    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme') || 'light';
            const next = current === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', next);
            localStorage.setItem('beben-theme', next);
        });
    }

    // ── 2. HAMBURGER MENU ──────────────────────────────────────────
    // Fixes: use visibility/opacity pattern (no display:none flash),
    // proper aria-expanded, scroll lock, close on outside click.
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
        const isOpen = overlay.classList.contains('is-active');
        isOpen ? closeMenu() : openMenu();
    }

    if (hamburger && overlay) {
        hamburger.addEventListener('click', toggleMenu);

        // Close when a nav link is tapped
        overlay.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close when clicking the overlay backdrop (outside the menu list)
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeMenu();
        });

        // Close on Escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && overlay.classList.contains('is-active')) {
                closeMenu();
                hamburger.focus();
            }
        });
    }

    // ── 3. REVEAL ON SCROLL ────────────────────────────────────────
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── 4. FAQ ACCORDION ───────────────────────────────────────────
    document.querySelectorAll('.faq-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const answer = trigger.nextElementSibling;
            const isOpen = trigger.getAttribute('aria-expanded') === 'true';

            // Close all other open items
            document.querySelectorAll('.faq-trigger').forEach(other => {
                if (other !== trigger) {
                    other.setAttribute('aria-expanded', 'false');
                    const otherAnswer = other.nextElementSibling;
                    if (otherAnswer) otherAnswer.classList.remove('open');
                }
            });

            // Toggle this item
            const newState = !isOpen;
            trigger.setAttribute('aria-expanded', String(newState));
            if (answer) answer.classList.toggle('open', newState);
        });
    });

    // ── 5. COPY EMAIL + TOAST ──────────────────────────────────────
    const toast = document.getElementById('copy-toast');

    document.querySelectorAll('.copy-email').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            const email = this.dataset.email;
            if (!email) return;

            navigator.clipboard.writeText(email).then(() => {
                if (toast) {
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 2500);
                }
            }).catch(() => {
                // Clipboard API unavailable — fall back to mailto
                window.location.href = 'mailto:' + email;
            });
        });
    });

})();
