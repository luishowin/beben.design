# beben.design

Source for [beben.design](https://beben.design), the site of Beben Design, a
design-led digital product studio in Westlands, Nairobi. Static HTML/CSS/JS,
served by GitHub Pages from `docs/`, no build step.

## Structure

```
docs/                  the published site
  index.html           homepage
  services/ tools/ shop/ work/ contact/    main pages
  sprite/              Sprite case study
  kilimo-pal/ trek-watch/ rev-log/         project previews (noindex until real case studies ship)
  legal/ privacy/ credits/ 404.html        support pages
  qr-code-generator/   standalone downloadable tool (intentionally self-contained)
  redoubt/ kemmy-spa-concierge-preview/    client previews (intentionally standalone)
  assets/css/index.css design tokens + shared components (nav, footer, page-hero, grid, FAQ)
  assets/css/sprite.css + assets/JS/sprite.js   the Sprite chat widget
  assets/JS/index.js   theme, mobile menu, reveal animation, FAQ accordion
cloudflare-worker/     Sprite's LLM proxy (deploys to Cloudflare, NOT part of the site)
```

## Design system

- **Three fonts only:** Old Standard TT (h1/h2 serif), IBM Plex Mono (eyebrows,
  labels, CTAs), Inter (body; Inter 600 sentence case for card titles, step
  titles, FAQ questions). No League Gothic, no uppercase headings.
- **Red (`--highlight`) has four jobs:** the one italic `em` per headline, CTA
  links, active/hovered nav, focus outlines. Decorative marks stay muted.
- **Layout:** full-bleed sections alternating plain / `.section--soft`, content
  inside a 1140px `.container`. Subpages open with `.page-hero`. Prefer open
  rows with top-border separators over nested boxes.
- **Animation:** `data-reveal` + `--i` stagger, driven by `index.js`. Never add
  a per-page observer.
- **Copy:** no em dashes. Titles use hyphens, badges use middle dots, prose
  uses commas/colons/periods.
- Page-specific styles live in a scoped `<style>` block in each page's head;
  shared patterns live in `index.css`. New pages copy the nav/footer markup
  verbatim from an existing page.

## Sprite (the chat widget)

`sprite.js` injects its own DOM, so a page only needs the two includes:

```html
<link rel="stylesheet" href="../assets/css/sprite.css?v=3.2">
<script src="../assets/JS/sprite.js?v=3.2"></script>
```

Bump the `?v=` on both whenever either file changes, or returning visitors
keep the cached old version.

Sprite has two brains. Offline (default safety net): a built-in
pattern-matching engine. Live: `SPRITE_CONFIG.apiUrl` at the top of
`sprite.js` points to a Cloudflare Worker that forwards chats to Fireworks AI
with the site knowledge as its system prompt. The API key lives only in the
Worker, never in this repo. Any Worker failure falls back to offline mode
silently. Conversation history follows the visitor across pages via
sessionStorage, and links in replies are allowlisted to this site, WhatsApp,
mailto, and tel. Deploy steps: [cloudflare-worker/README.md](cloudflare-worker/README.md).

## Contact form

The form on `/contact/` posts to Formspree. The form `action` in
`docs/contact/index.html` holds the form id.

## Local preview

```
python -m http.server 8123 --directory docs
```

then open http://localhost:8123. The Worker's CORS allowlist includes
localhost:8123, so the live Sprite brain works from the preview too.
