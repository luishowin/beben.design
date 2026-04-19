/* ═══════════════════════════════════════════════════════════════
   BEBEN DESIGN — contact.js
   Shared interaction logic for contact page.
   All behaviours mirror the homepage pattern exactly.
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // ── 1. HAMBURGER MENU ──────────────────────────────────────────
    const hamburger = document.getElementById('hamburger');
    const overlay   = document.getElementById('mobile-menu-overlay');
    const body      = document.body;

    if (hamburger && overlay) {
        hamburger.addEventListener('click', () => {
            const isOpen = overlay.classList.toggle('is-active');
            body.classList.toggle('menu-open');
            body.style.overflow = isOpen ? 'hidden' : '';
        });

        // Close on nav link click
        document.querySelectorAll('.mobile-menu a').forEach(link => {
            link.addEventListener('click', () => {
                overlay.classList.remove('is-active');
                body.classList.remove('menu-open');
                body.style.overflow = '';
            });
        });
    }

    // ── 2. THEME TOGGLE ────────────────────────────────────────────
    const themeToggle = document.getElementById('theme-toggle');
    const html        = document.documentElement;

    // Restore saved preference
    const savedTheme = localStorage.getItem('beben-theme');
    if (savedTheme) {
        html.setAttribute('data-theme', savedTheme);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const current = html.getAttribute('data-theme') || 'light';
            const next    = current === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', next);
            localStorage.setItem('beben-theme', next);
        });
    }

    // ── 3. REVEAL ON SCROLL ────────────────────────────────────────
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                revealObserver.unobserve(entry.target); // fire once
            }
        });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(el => revealObserver.observe(el));

    // ── 4. FAQ ACCORDION ───────────────────────────────────────────
    document.querySelectorAll('.faq-trigger').forEach(trigger => {
        trigger.addEventListener('click', () => {
            const answer   = trigger.nextElementSibling;
            const isOpen   = trigger.getAttribute('aria-expanded') === 'true';

            // Close all others
            document.querySelectorAll('.faq-trigger').forEach(other => {
                if (other !== trigger) {
                    other.setAttribute('aria-expanded', 'false');
                    const otherAnswer = other.nextElementSibling;
                    if (otherAnswer) otherAnswer.classList.remove('open');
                }
            });

            // Toggle this one
            trigger.setAttribute('aria-expanded', String(!isOpen));
            if (answer) answer.classList.toggle('open', !isOpen);
        });
    });

    // ── 5. COPY EMAIL TO CLIPBOARD ─────────────────────────────────
    const copyLinks = document.querySelectorAll('.copy-email');
    const toast     = document.getElementById('copy-toast');

    copyLinks.forEach(link => {
        link.addEventListener('click', function (e) {
            const email = this.dataset.email;
            if (!email) return;

            e.preventDefault();

            navigator.clipboard.writeText(email).then(() => {
                if (toast) {
                    toast.classList.add('show');
                    setTimeout(() => toast.classList.remove('show'), 2500);
                }
            }).catch(() => {
                // Fallback for older browsers
                window.location.href = 'mailto:' + email;
            });
        });
    });

})();
