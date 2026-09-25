# beben.design

Source for [beben.design](https://beben.design), the site of Beben Design, a
design-led digital product studio in Westlands, Nairobi. Static HTML/CSS/JS,
served by GitHub Pages from `docs/`, no build step.

## Structure

```
docs/                  the published site
  index.html           homepage
  services/            hub: five rows, each linking to a detail page
  services/brand-identity/ services/ux-research/ services/ui-design/
  services/digital-strategy/ services/migration-rebuild/   the five detail pages
  services/how-we-work/    running costs, ownership, support tiers. Not in the
                       nav by design; linked from the hub and every service CTA
  tools/ shop/ work/ contact/              main pages
  sprite/ beben-arcade/ codex/             case studies (four-part, verifiable numbers)
  rev-log/             open project page, indexed
  kilimo-pal/ trek-watch/                  project placeholders (noindex; not case studies)
  blog/                GENERATED blog pages + feed.xml (never hand-edit; see The blog)
  legal/ privacy/ credits/ 404.html        support pages
  qr-code-generator/ contrast-grid/ character-counter/ dither-machine/
                       GENERATED tool pages (never hand-edit; see The tools)
  games/               ARCADIA by BEBEN DESIGN — standalone offline PWA, 20 games (see The arcade)
  redoubt/ kemmy-spa-concierge-preview/    client previews (intentionally standalone)
  assets/css/index.css design tokens + shared components (nav, footer, page-hero, grid,
                       FAQ, and section 18's shared page primitives; see Shared CSS)
  assets/css/sprite.css + assets/JS/sprite.js   the Sprite chat widget
  assets/JS/index.js   theme, mobile menu, reveal animation, FAQ accordion
content/blog/          blog posts as markdown (the SOURCE; not published)
content/tools.json + content/tools/    tool registry and per-tool sources (the SOURCE)
scripts/build_blog.py  renders content/blog/ into docs/blog/ (+ templates in scripts/templates/)
scripts/build_tools.py renders content/tools/ into docs/<slug>/ (see The tools)
cloudflare-worker/     Sprite's LLM proxy (deploys to Cloudflare, NOT part of the site)
legal-draft/           drafted Terms of Engagement, parked OUTSIDE docs/ so nothing
                       unreviewed is served. See legal-review.md
legal-review.md        what a Kenyan advocate needs to look at, and why
scripts/check_voice.py checks copy against the voice zoning (see Voice)
PROJECT-STATE.md       where this revision stands, what is left, what needs the owner
```

## Design system

- **Three fonts only:** Old Standard TT (h1/h2 serif), IBM Plex Mono (eyebrows,
  labels, CTAs), Inter (body; Inter 600 sentence case for card titles, step
  titles, FAQ questions). No League Gothic, no uppercase headings.
- **Red has four jobs:** the one italic `em` per headline, CTA links,
  active/hovered nav, focus outlines. Decorative marks stay muted.
  Two tokens, and the distinction matters: `--highlight` (`#E71D36`) is the
  brand red, used for large display text, the focus ring and fills, where 3:1
  is the bar. `--highlight-text` is the accessible variant for red on
  normal-size text, where the bar is 4.5:1 and the brand red measures 3.75 to
  4.16 and fails. `.hero` remaps **both** to `--yellow`, because the red lands
  at 2.9:1 on the hero photo.
- **Layout:** full-bleed sections alternating plain / `.section--soft`, content
  inside a 1140px `.container`. Subpages open with `.page-hero`. Prefer open
  rows with top-border separators over nested boxes.
- **Animation:** `data-reveal` + `--i` stagger, driven by `index.js`. Never add
  a per-page observer.
- **Copy:** no em dashes. Titles use hyphens, badges use middle dots, prose
  uses commas/colons/periods.
- **Shared CSS:** a pattern that appears on three or more pages belongs in
  section 18 of `index.css`, not copied again. A page's scoped `<style>` is
  parsed *after* the `index.css` link, so a page needing a different value
  still overrides at equal specificity with one line, and never needs
  `!important`. `.content-block`, `.cta-row`, `.tech-list`, `.decision`,
  `.metric`, `.honesty`, `.service-goal`, `.deliverables-*`, `.service-faq`,
  `.next-step` and `.tier-price` all live there.
- Page-specific styles live in a scoped `<style>` block in each page's head;
  shared patterns live in `index.css`. New pages copy the nav/footer markup
  verbatim from an existing page.

## The blog

Posts are markdown files in `content/blog/`, rendered to real static HTML in
`docs/blog/` by a small generator. The generated pages are committed like any
other page, so hosting, SEO, and local preview work exactly as the rest of
the site.

**To publish a post:**

1. Write `content/blog/YYYY-MM-DD-your-slug.md` with front matter between
   `---` fences: `title`, `description`, `date` (required); `author`, `tags`
   (comma-separated), `hero_image`, `hero_alt`, `featured`, `pinned`, `draft`
   (optional). Images go in `docs/assets/images/blog/your-slug/` and are
   referenced with root-absolute paths (`/assets/images/blog/your-slug/...`).
2. Run `py scripts/build_blog.py` (one dependency: `py -m pip install markdown`).
   It regenerates every post page, the blog index, `docs/blog/feed.xml`, and
   the blog block of `docs/sitemap.xml`, and warns about em dashes and
   orphaned output folders.
3. Review, commit, push. Done.

The index leads with the `pinned: true` post as the article of the day
(falling back to the newest), then up to three `featured: true` articles,
then the rest as archive rows.

A teammate without the toolchain can add or edit a markdown file through the
GitHub web UI; whoever merges runs the build. Two rules keep the system
honest: **never hand-edit anything in `docs/blog/`** (the next build
overwrites it), and **any nav/footer/sprite-version change to the site must
be mirrored in `scripts/templates/post.html` and `blog-index.html`**, then
rebuilt.

Upgrade ladder, when the team grows into it (design intent, not built yet):

1. **Auto-build:** a GitHub Action runs `build_blog.py` on push and commits
   the output, so writers never touch Python.
2. **Web CMS:** Decap CMS at `/admin/` committing markdown via GitHub OAuth,
   using a small Cloudflare Worker as the OAuth gateway (same pattern as the
   Sprite proxy). Accounts stay internal: they are just repo collaborators.
3. **Community/network features** would be a separate app on a subdomain;
   GitHub Pages stays the publishing layer.

## The tools

[beben.design/tools](https://beben.design/tools) is a collection of small,
single-purpose utilities grouped into three pillars: **private by default**
(the offline guarantee is the product), **design toolkit**, and **run your
business**. The promise on the page is exact and load-bearing: every tool is
**one HTML file with zero external requests**, so a downloaded copy works
offline forever. Nothing may load from a CDN, and no tool page may reference a
relative path.

Tool pages are generated, on the same model as the blog. **Never hand-edit
`docs/<tool-slug>/index.html`** (the next build overwrites it).

```
content/tools.json              the registry: one entry per card
content/tools/<slug>/
  body.html                     inner markup of the tool column   (required)
  tool.css                      scoped styles                     (optional)
  tool.js                       the logic, an IIFE using Tool.*   (optional)
  vendor/*.js + vendor/*.txt    third-party libs + their licence  (optional)
scripts/templates/tool.html     the shared shell for every tool page
scripts/build_tools.py          the generator
```

**To add a tool:**

1. Add an entry to `content/tools.json`. `status: "soon"` is enough to put a
   coming-soon card on the page; nothing else is needed yet.
2. When you build it, flip it to `status: "live"`, fill in `number`, `h1`,
   `lead`, `meta_title`, `meta_description`, and `specs`, then write
   `content/tools/<slug>/body.html` plus its `tool.css` and `tool.js`.
3. Run `py scripts/build_tools.py` (no dependencies). It renders the page and
   refreshes all four places the tool list is mirrored: the grid in
   `docs/tools/index.html`, the tools block of `docs/sitemap.xml`, the
   `## Tools` section of `docs/llms.txt`, and `## The tools` in
   `docs/sprite.md`. It warns about em dashes and stale folders.
4. Review, commit, push.

The shell provides the tokens (mirrored from `index.css`), nav, footer, theme
toggle, and a set of primitives so `tool.css` stays small: `.field-label`,
`.tool-input`, `.tool-textarea`, `.seg`/`.seg-btn`, `.frame`, `.btn-group`,
`.dropzone`, `.range-row`, `.hint`. It also exposes a `Tool` runtime:
`Tool.$`, `Tool.toast`, `Tool.copy`, `Tool.download`, `Tool.downloadBlob`,
`Tool.segmented`.

Three rules keep the offline promise honest:

1. **No external requests.** Vendor third-party code into
   `content/tools/<slug>/vendor/` with a `.txt` licence note beside it, which
   the generator inlines as a comment. Google Fonts is the one exception: it is
   progressive enhancement behind a full system fallback stack, so an offline
   file is plainer but never broken.
2. **Absolute URLs only** in nav, footer, and meta. A relative `href` resolves
   against the user's Downloads folder once the file leaves the site.
3. **Keep the `execCommand` clipboard fallback.** A file opened over `file://`
   is not a secure context, so `navigator.clipboard` is unavailable there.

Nav, footer, or token changes on the site must be mirrored in
`scripts/templates/tool.html`, then rebuilt.

## Sprite (the chat widget)

`sprite.js` injects its own DOM, so a page only needs the two includes:

```html
<link rel="stylesheet" href="../assets/css/sprite.css?v=3.9">
<script src="../assets/JS/sprite.js?v=3.9"></script>
```

**All four shared assets carry the same `?v=`:** `index.css`, `index.js`,
`sprite.css` and `sprite.js`, currently `3.8` across 24 files. Bump all four
together whenever any one of them changes, or returning visitors keep a stale
copy. `index.css` and `index.js` were previously unversioned, which meant a
returning visitor could get new markup against an old stylesheet.

To verify exactly one version string is in play:

```
grep -rhoE '(index|sprite)\.(css|js)\?v=[0-9.]+' docs scripts --include=*.html | sort -u
```

The six generated blog pages and the four generated tool pages are reached by
editing `scripts/templates/` and rebuilding, never by hand.

Sprite has two brains. Offline (default safety net): a built-in
pattern-matching engine. Live: `SPRITE_CONFIG.apiUrl` at the top of
`sprite.js` points to a Cloudflare Worker that forwards chats to Fireworks AI
with the site knowledge as its system prompt. The API key lives only in the
Worker, never in this repo. Any Worker failure falls back to offline mode
silently. Conversation history follows the visitor across pages via
sessionStorage, and links in replies are allowlisted to this site, WhatsApp,
mailto, and tel. Deploy steps: [cloudflare-worker/README.md](cloudflare-worker/README.md).

## The arcade

[beben.design/games](https://beben.design/games) is **ARCADIA by BEBEN DESIGN**,
a self-contained installable PWA of 20 tiny offline games. It is intentionally
standalone: no `index.css`, no nav, no Sprite, no external fonts, and zero
references outside `/games/` so it runs fully offline once installed. It has
its own `manifest.webmanifest` and service worker (`docs/games/sw.js`, scope
`/games/`), separate from the main site.

- **Shared runtime.** `docs/games/arcade.js` (`window.Arcade`: settings/scores
  stores namespaced `beben-arcade-*`, an 8-bit Web Audio synth with
  `audio.jingle()`, haptics, top-bar chrome, `fitCanvas`, a fixed-timestep
  `loop` (240 Hz physics, so motion stays smooth on 75/90/120/144 Hz
  displays), `palette()`, `achievements`, `toggleCRT`) plus `arcade.css`. Each
  game is one self-contained `<slug>/index.html` that loads both.
- **Dark-only neon identity.** Tokens live in `arcade.css`: `--bg #000` and
  seven `--neon-*` accents. Every game owns one neon via a per-game `--accent`
  (set inline on `<html>` and through `Arcade.init({accent:'lime'})`), used for
  its card, in-game chrome, canvas art, and a game-over jingle. There is no
  light theme and the arcade never touches the main site's `beben-theme`.
- **Hub cards.** The hero card and all 20 game cards are `#000` with a 1px
  `#171717` border (border flips to the game's neon on hover). Each game card
  shows a frameless icon, the name in pixel type, a one-line description, and
  one to three `> GENRE` lines. CRT scanlines are **on by default** (static,
  no flicker — a strobe made fast sprites trail) and can be toggled off in
  settings. Every game canvas paints a pure `#000` backdrop (no `--bg-soft`
  fills), and the in-game bar shows `< BACK` in pixel type next to the game
  title.
- **Pixel display font.** `docs/games/fonts/press-start-2p.woff2` is a ~5KB OFL
  subset (uppercase glyphs only, so always pair it with
  `text-transform: uppercase`). Rebuild it with `py scripts/subset_arcade_font.py`
  (needs `pip install fonttools brotli`). Body text stays system mono.
- **Extras.** Offline achievements (`beben-arcade-achievements`), a CRT
  scanline mode (on by default; 7 taps on the hub title, the konami code, or
  the settings toggle — the CRT Head achievement now tracks an explicit
  toggle), and a rare INSERT COIN launch flourish. Hero imagery swaps once
  per hour (3h desktop cycle / 2h mobile cycle, 1.5s crossfade). In iOS
  standalone mode the game bar drops 40px to clear the status-bar blur. App
  icons sit on pure `#000`.
  Install icons regenerate via `py scripts/make_arcade_icons.py`.

**Hard rules when touching `docs/games/**`:**

1. **Bump `CACHE` in `docs/games/sw.js` on every commit** — it is cache-first,
   so a stale cache name serves old files forever. The version label on the
   hub (`v13`) moves in lockstep as an on-device sanity check.
2. **Adding a game touches four places:** its `<slug>/` in the `sw.js`
   PRECACHE list, a hub card in `docs/games/index.html`, an entry in the hub's
   inline `ICONS` map, and the `SLUGS` array in `arcade.js` (for achievements).
3. All arcade-internal links use trailing slashes. Use "Four in a Row", never
   "Connect Four" (trademark).

## Contact form

The form on `/contact/` posts to Formspree. The form `action` in
`docs/contact/index.html` holds the form id.

Fields: name, email, message (the one that matters), timeline. Plus two hidden
Formspree conventions, `_subject` and the `_gotcha` honeypot. Submission is an
in-page `fetch` with a focused `role="status"` region, so a successful send
never leaves the site; with the script dead it degrades to a normal POST.

**The triage is an enhancement, and the HTML is the fallback.** The markup
served is that plain form and nothing else: open `view-source:` and there is no
step markup in it. An inline script builds the flow at runtime by *moving* those
existing fields into steps, so with JavaScript blocked or broken the page is the
plain form, still required-validated, still posting to the same endpoint.

The flow is five situations, one pick, then three branched questions one screen
at a time, assembling into the same `message` textarea the no-script form posts.
The visitor can edit the assembled brief before sending.

Rules if you touch it:

- **Never remove a field, only relocate it.** A `required` field inside a hidden
  step cannot be focused by native validation, which is why every step validates
  before it advances and a capturing `invalid` listener reveals the owning step.
- **Real radios in a real fieldset.** They are visually replaced, never taken
  out of the accessibility tree, so arrow keys and the legend still work.
- Focus moves to the new step's legend on every transition, progress is a live
  region, and errors carry `role="alert"`.
- Questions are defined in the `SITUATIONS` array at the top of the script.
  Adding a situation means adding an entry; nothing else needs to change.
- **Do not submit the form while testing.** It posts to the live inbox and
  spends one of the 50 free-tier submissions.

**Spam protection lives in the Formspree dashboard, not here.** The form id is
public in the page source, so anything on the page can be skipped by posting to
Formspree directly. Only two settings actually help:

1. **Restrict allowed domains to `beben.design`.** This is the real defence.
2. **Turn on submission notifications.** The free tier caps at 50 submissions a
   month and fails silently once hit, which loses leads without warning.

The honeypot only catches unsophisticated bots and cannot stop a direct POST.
The one codebase-side alternative would be routing submissions through a
Cloudflare Worker that checks `Origin` and rate-limits before forwarding, the
same pattern as the Sprite proxy. That is deliberately **not** done: it would
put the highest-value conversion path behind a service that needs its own
deploy and can fail independently, in exchange for protection the dashboard
setting already provides.

## Voice

Copy is zoned rather than governed by one rule, because the studio's proposition
is that a named human's judgment sets the direction. Stripping first person
everywhere would delete the thing being sold.

| Zone | Person | Where |
|---|---|---|
| Selling | Second person only | home, services, tools, shop |
| UI | Second person, warm | contact, 404, form copy |
| Case study | First person plural | work, sprite, codex, beben-arcade |
| About | First person plural | services/how-we-work/ |
| Legal | Third person, named | legal, privacy |
| Sprite | Playful, jokes, contractions | assets/JS/sprite.js |

`python3 scripts/check_voice.py` enforces it, and exits non-zero on a failure.
It parses rendered text rather than grepping source, so JS variable names and
CSS comments cannot trip a rule, and it also reads inline `<script>` string
literals on selling and UI pages, because the contact triage builds its copy in
JavaScript.

Deliberately excluded: `kemmy-spa-concierge-preview/` and `redoubt/` speak as
mock clients, `games/` is a separate sub-app, and `blog/` is journal voice.

Two traps are encoded in the checker rather than rediscovered. A plain
`\bsolution\b` also matches inside "resolution". And `\bus\b` matches the
uppercase half of "en-US". Exemptions are narrow and named: "Does It Fit?" is a
product name, "How we work" is a page name.

**One claim that is not a style rule:** the site is written by one person across
three git identities. Copy asserting a team is a factual problem, not a tonal
one, and the checker fails it wherever it appears.

## Local preview

```
python -m http.server 8123 --directory docs
```

then open http://localhost:8123. The Worker's CORS allowlist includes
localhost:8123, so the live Sprite brain works from the preview too. Any other
port serves the site fine, but Sprite falls back to its offline replies.

Before committing, the checks that matter:

```
python3 scripts/check_voice.py      # voice zoning and banned constructions
python3 scripts/build_tools.py      # both generators must be idempotent:
.venv/bin/python scripts/build_blog.py
git status --short                  # a run against unchanged sources leaves this clean

grep -rhoE '(index|sprite)\.(css|js)\?v=[0-9.]+' docs scripts --include=*.html | sort -u
                                    # exactly one version, or the bump was partial
```
