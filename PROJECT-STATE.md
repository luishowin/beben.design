# Site revision, state of play

Five pieces of work are on `main`: the phase 0-1 corrections, brief v2 phases
1 to 4, the Sprite knowledge rework, the run described below, which closed
v1 phases 7 and 8 and v2 phases 5 and 6, and an arcade gameplay pass, which
has its own heading. GitHub Pages serves `docs/` from
`main`, so pushing `main` publishes.

The Cloudflare Worker still does not deploy from git, but it no longer needs to
for a content change. It is current, and it reads Sprite's facts from
`docs/sprite.md` at runtime, so pushing that file is the deploy.

Both briefs were audited against the working tree before any code was written.
The first was wrong about the repo in fourteen material ways. v2 was
substantially more accurate, and wrong in five, recorded below so the work is
not re-scoped against things that are already true.

---

## Decisions taken

| Decision | Answer |
|---|---|
| Entity | Sole proprietorship. No corporate veil, which is why the liability drafting needs an advocate. |
| Pricing | `$99` stays, reframed as the **Foundations** package. Not a bare anchor. |
| Legal | Parked. The drafted Terms of Engagement sit in `legal-draft/`, outside `docs/`. |
| Budget bands | **Removed, and they stay removed.** v2 asks for them back; this is the one place v2 does not override v1. Timeline does the qualifying. |
| Voice | Zoned, not banned. See the Voice section of the README. |
| About page | No `/about/`. The philosophy is folded into `/services/how-we-work/`, the one zone where the studio may describe itself. |
| Support pricing | Structure published, figures marked `Price TBC`. Nothing invented. |
| Formspree spam | Dashboard domain restriction to `beben.design`. Nothing further is possible in the codebase; the reasoning is in the README. |

---

## Shipped

### Phase 0-1

**Facts corrected.** The site published five false statements about data
processing, and claimed ODPC registration that has not happened. All removed,
and the six real processors are now disclosed with the US transfer named.

**Conversion routed.** The contact form was never missing, it was orphaned. The
homepage hero CTA called `preventDefault()` and copied an email instead of
opening anything. Ten CTAs now route to the form.

**Proof.** Three case studies: Sprite, Beben Arcade, Codex. Every number read
off disk and independently re-run. No visitor-side metric appears anywhere,
because the site runs no analytics.

**Services split.** One 830-line page became a hub plus four detail pages, with
FAQPage JSON-LD regenerated from the visible text so the two cannot drift.

**Accessibility.** An unguarded `localStorage` read that blanked every page, a
chat launcher that was not keyboard operable, invisible focus on every form
control, sub-AA red on body text, 22px tap targets, and a theme flash.

**CSS consolidated.** `.cta-row` existed in 13 copies. 103 duplicate rules
removed across ten files.

### Brief v2, phases 1 to 4

**Voice zoned.** 86 failures at the start, none now, enforced by
`scripts/check_voice.py` rather than by memory. Copy asserting a team that does
not exist is gone: Sprite said "I'll pass that along to the team", and two pages
promised "the people who will actually build it". One author, three git
identities.

**Migration & Rebuild** added as service 05, the service the site was already
positioned for and never named. Bring the mess, keep what is worth keeping,
rebuild the rest properly. Never phrased as refusing to fix other people's work.

**`.next-step` promoted.** The closing CTA trio was copy-pasted on 10 pages
under three different section wrappers, with the supporting paragraph already
forked into a page-scoped rule. Same drift `.cta-row` was consolidated out of.

**How we work** publishes what a site costs to run, itemised from this site's
own stack, what the client owns and from when, what a pivot costs, and four
support tiers with the content-versus-structural line written out.

**Contact triage.** Five situations, one pick, three branched questions one per
screen, assembling into a brief the visitor can edit. Progressive enhancement:
the served HTML is the previous plain form, and the flow is built at runtime by
moving those fields into steps.

### Sprite

**Knowledge has one home.** The Worker deployed in production turned out to be
an older generation of the file than the repo's, with no runtime knowledge fetch
at all. That is why the live Sprite still quoted pre-Foundations pricing: the
site was corrected, the Worker was never re-pasted.

The fix was to stop keeping two copies of the facts. The Worker now holds only
the stable core, meaning personality, the one-person rule, contact details,
top-level paths and the linking rules. Services, projects, pricing and tools
live in `docs/sprite.md` alone, which the Worker fetches every five minutes.
**Changing what Sprite knows is now a git push.**

Because that removed Sprite's fallback knowledge, the prompt gained an
instruction for the degraded case: when the extended knowledge does not cover
the question, say so and point at `/contact/` rather than filling the gap from
general knowledge about design studios.

**Model.** `gpt-oss-120b`, the 20b having been retired. Two comments written for
the old model were wrong and are fixed: the header claimed the default was
`llama-v3p1-8b-instruct`, untrue since `bd16a6f`, and the cost note quoted 20b
rates. 120b is $0.15/M input and $0.60/M output, double the old figures, 128K
context. `MAX_TOKENS` went 450 to 700 because reasoning tokens count against the
cap and 120b reasons more, so the old ceiling truncated replies mid-sentence.

**A silent cliff, closed.** `sprite.md` is sliced at a character cap with no
error, from the tail. The new sections took it to 8,177 against a 8,000 cap, so
it would have quietly lost its last section. Trimmed to 7,948, the cap raised to
12,000, and `build_tools.py` now fails the build if the file passes it, because
the generator rewrites the tools section and adding one tool would walk it off
the same cliff. The two limits must be kept in step.

**The seasonal banner was never wired up.** `sprite.js` has mapped the chat
panel's header to nine dated images since `bd16a6f`, but `docs/assets/images/
banners/` did not exist. Only `summer` resolved, because it alone pointed
outside that directory at `sprite-profile-banner.jpg`. Every other day of the
year served a 404 into a `background-image`, which fails silently: the panel
opened with 140px of dead space above Sprite's name. It had been doing that
since 1 September, and nothing reported it.

Eight images now exist, drawn as one set: four seasons, and five holidays sliced
from a single collage. Sourced at 1672px and published at 760px, the width the
380px panel needs at 2x, as WebP. **7.7MB of PNG became 556KB**, which matters
because this loads on every page of the site, not just one. The date logic was
tested by running the shipped `getSeasonalBanner` against a stubbed clock for
all 365 days of 2026 and fetching whatever each returned: nine distinct images,
all 200, no gaps.

The PNG masters were deliberately **not** committed, and have since been
deleted. They were 11MB of unreferenced source art sitting inside `docs/`, the
published directory, so committing them would have made item 9 below worse in
the same breath as fixing a bug. All eight derivatives are tracked and
referenced, so nothing shippable went with them. **They were never in git, so
there is no copy**: the 760px WebPs are now the only surviving version of that
artwork, and a redraw at a different size starts from scratch.

### v1 phases 7 and 8, v2 phases 5 and 6

**The homepage stopped inventing things.** `index.html` pulsed a green "live"
dot over four metrics that random-walked in JavaScript and ten invented
activity lines, under the heading "Beben engagement - live status". None of it
was real, next to case studies whose whole claim is that every number was
re-run from source. It is now measured: `scripts/build_status.py` counts the
site and writes the panel between markers. Pages, internal links checked and
broken, CSS and JS weight, JavaScript dependencies, analytics scripts, cookies.
The date stamp moves only when a figure moves, so a rebuild on an unchanged
tree writes nothing, like the other two generators. **The honest version is
also 3.8KB smaller**, because the simulation went with it.

Each detector was tested by injecting the thing it looks for. A tracker, an
off-site script, a `document.cookie` write and a dead link all fire, with the
file named. The first pass reported three analytics scripts, all false: `gtag(`
matched inside `createSvgTag(`, and Sprite's case study *lists* five vendors in
a sentence about not using any of them. Trackers are now matched against code
surfaces only, never prose.

**`#9148ff` is gone**, the fifth colour outside the system, replaced by the
`--highlight-text` token that exists for exactly this. Its neighbour turned out
to be worse: `.tui__check` was brand yellow on a light surface at **1.36:1**,
which is not a colour, it is an absence. `--yellow-text` now follows the
`--highlight-text` pattern, dark amber in light mode at 4.98:1, unchanged
banana in dark where it already clears AAA.

**Easter is computed.** The banner was hardcoded to 20-31 March. Easter 2026 is
5 April, so it showed on twelve days that were not Easter, missed the day, and
ate the first twelve days of spring. Anonymous Gregorian computus now runs the
window from Good Friday to Easter Monday, both public holidays in Kenya.
Verified against ten known dates from 1997 to 2038, and every day of 2026, 2027
and 2038 walked: nine banners, no gaps. The window straddles March and April in
2029, 2040, 2051 and 2056, which the old month-and-day comparison could not
have handled at all.

**`.footer-nav`** was 11.2px links inside a 43.5px inherited strut. The row
looked right only because that accident was near the height a tap target should
be; the link itself was 14.4px. All four are now 44px boxes, and the row height
is deliberate.

**The social profiles are linked, and one was fictional.** The homepage JSON-LD
claimed three `sameAs` profiles and linked none of them. Instagram and Behance
are real and verified, and now sit in every footer. The LinkedIn URL returns
404, and so does the `/company/` form of it, so it has been removed rather than
published: `sameAs` is a claim to search engines, and that one was not true.
**If there is a real LinkedIn, give me the URL and it goes back.**

**The coordinates have a checker instead of a convention.** They were written
three ways, so a grep for any one spelling found some of them and reported
success. `scripts/check_facts.py` normalises all three before comparing, which
is the thing a grep cannot do, and also pins the email and the city. The
sprite.js spelling stays as it is: that string is spoken, and `speak()` strips
tags without decoding entities, so `&deg;` would be read out character by
character.

**Tools carry run-mode badges**, and every badge is checked before it ships.
`browser` is refused on a page containing an off-site script, a `fetch`, an
`XMLHttpRequest`, a `sendBeacon`, a WebSocket or a posting form. `download` is
refused for a tool with no generated file, `self-host` without `download`. All
four refusals were tested by making them fail. The hero teaches the three words
before the cards use them. v2 4.5 also asks for a "promise-not-photo" hero: the
hero had no photo, so only the promise half was real work.

**`/work/` is grouped by problem, not medium.** Nobody arrives looking for a
service worker. Three groups: when a stranger has thirty seconds, when the
network is not there, when the software lives inside a device. Status moved
into the eyebrow, so the four live things and the three still in design say so
on the card rather than only in the CTA label. The zigzag was
`:nth-child(even)`, which counts inside one container and would have broken at
every new heading; it is now stated per card in reading order.

**The case-study skeleton is six parts**, adding *what is still wrong* and
*what happens next* to the four that existed. The brief's own six were not in
the repo, so these are proposed rather than transcribed: problem, versions that
did not ship, what is running now, what can be counted, what is still wrong,
what happens next. Sprite already had a roadmap, so it needed one new section
and both live in one soft band, because inserting a section into a strictly
alternating stack inverts every surface below it including the shared
`.next-step`.

Writing *what is still wrong* found a real one. The arcade case study published
"a precache list of 25 entries" twice. The list holds **20**, and git says it
has held 16, then 18, then 20, and never 25. Corrected, and the correction is
now published in the section itself, because a hand-typed number drifting from
a hand-maintained list is exactly what that section is for. The other seven
figures on that page are exact to the byte.

**Two latent bugs, found on the way in.** `build_blog.py` was not idempotent:
the templates were never bumped when Sprite's assets went to 4.5, so running it
dragged all six blog pages back to a stale `?v=4.4`. The asset version is one
value everywhere now, which is what the check at the bottom of this file was
always asking for. It landed on `4.6` and moved to `4.7` with the nav height.

### Arcade gameplay pass

Player-reported fixes across seven games plus the shared runtime, all verified
in a live browser against a local server. This is not the v2-9 hub overhaul,
which remains tracked separately.

**CRT is now on by default.** The scanline overlay is static: the old `steps(2)`
flicker strobed the whole screen at ~8 Hz, which made fast-moving sprites look
like they left trails and reads as dropped frames. The default flip reaches
fresh settings; anyone who explicitly switched CRT off keeps it off, because
their choice is stored. The CRT Head achievement would have unlocked for
everyone under the new default, so it now tracks an explicit toggle instead.

**Motion was quantized to 60 Hz regardless of the display.** The shared loop
stepped physics at a fixed 1000/60, so on a 75/90/120/144 Hz panel fast objects
advanced in irregular jumps — judder, the other half of "doesn't feel like
60fps". The step is now 1000/240, which is fine enough that motion reads as
smooth at any refresh rate; every game's update is dt-scaled, so nothing else
changed. `brick-bash` and `paddle-duel` also read `getBoundingClientRect()` on
every pointermove — a layout flush per mouse event at 500-1000 events/s on
gaming mice — and now cache the rect on resize.

All 20 games were walked in a headless browser after the loop change: zero
console errors, and movement re-checked on the two accumulator-based games.

**maze-muncher was actually broken.** Hitting a wall stopped the muncher
mid-cell, but turns only trigger at cell centres, so the input queue could
never fire again — permanently stuck. Fixed by snapping to the centre of the
cell being left when blocked (floor/ceil by travel direction, so the snap
never lands inside the wall), plus a slightly wider turn window. Verified by
driving the muncher into a wall with real key events and reading exact game
state: reverse and turn-from-wall both work.

**The smaller requests.** 2048: flat 90ms linear slide (the pop/spring is
gone), the absorbed tile slides under its survivor, board glow removed, and
reaching a 2048 tile now pays a +2048 bonus with a gold confetti burst and a
persistent "★ 2048 TILE" badge. Skystack: a drop guide — rails bracket the
moving slab and a bright band shows the landing cut, going accent in the
perfect window. Hop-across: the circle is a pixel goose. Pixel-dash: a full
redraw — golden-hour gradient, sun, clouds, five cactus variants on two
parallax layers, dunes, a lizard in a cowboy hat, rock and vulture obstacles,
and night (stars, moon, dark ground) after 90 s of running with a 4 s
crossfade.

The 2048 confetti path is verified structurally but was not played to a real
2048 tile; it shares the trigger the fanfare already used. The service worker
cache moved to `v13` with the hub label in lockstep, per the hard rule.

---

## Corrections to brief v2

| v2 says | Reality |
|---|---|
| Badges "in JetBrains Mono, an existing BEBEN token" | JetBrains Mono is not in this repo. The mono token is IBM Plex Mono. The reasoning holds, the font does not. |
| Add a "NEXT STEP" CTA | Already shipped, verbatim, on nine pages. The gap was a component, not the pattern. |
| Keep a "just email me" escape hatch, state a response time | Both already existed. |
| The About page, and "We're not cheating. We're resourceful." | Neither existed. v2's own architecture omits About too. |
| "Seven nav items" | Six, plus the logo. The only real delta is Blog to Journal. |
| Coordinates removed | They exist in **29 files in three encodings**. One grep finds one of them. |

v2 was **right** about the palette. `#F7F4F3`, `#141414`, `#E71D36`, `#FFC710`
all match real tokens exactly. Do not "fix" them.

---

## Not done

| # | Item | Why it matters |
|---|---|---|
| v2-7 | **Journal**: three columns (Teardown / Build log / Reference), rename from Blog | **Not a rename, a migration.** 32 files reference `/blog/`, plus `feed.xml`, the sitemap block and `build_blog.py`. GitHub Pages has no server-side redirects, so five indexed post URLs would break. The homepage build report and the `/work/` hero both say "blog", not "journal", and change with it. |
| v2-8 | **Shop**: Kenya-only, three products, Paystack | **Bigger than v2 admits.** The current page promises six *digital* products; v2 4.6 specifies *physical* goods with courier and Pickup Mtaani. That changes the product line, fulfilment and the legal position. Blocked on legal, see below. |
| v2-9 | Arcade UI overhaul | Tracked separately, blocks nothing. Now also named on the arcade case study as the oldest part of the product. |
| 9 | `/work/` page weight | The HTML is 33KB; the image payload takes it past 2MB. Regrouping by problem did not change the payload. |
| 9 | ~19MB of unreferenced images in `docs/assets/images/` | Caution: the hero webp scores zero on a filename grep because every reference is percent-encoded. A naive cleanup deletes a live asset. The four banner PNG masters that used to sit here are gone, which was the easy 11MB because their provenance was known. What is left is four cover PNGs and the rest of the pile, and none of it can be removed on a grep alone. |
| 9 | The summer banner is the odd one out | The other eight are 760px WebP in `banners/`. Summer alone is `sprite-profile-banner.jpg`, 34,478 bytes at a different provenance and aspect. Now published as a known fault on the Sprite case study rather than only tracked here. |
| 9 | Eight meta descriptions over 160 characters | They truncate in results. All predate this work; the homepage one was fixed with the voice pass. |
| 9 | The arcade cache name is bumped by a comment | `sw.js` says "bump CACHE on EVERY commit that touches docs/games/**" and nothing enforces it. Cache-first means a missed bump serves a stale game to every installed player. The precache list is hand-typed for the same reason. Both are now published as faults on the arcade case study, with the fix named. |
| 9 | `.back-to-top` is a 29.6px target | Found while fixing `.footer-nav` next to it. Clears the WCAG 2.2 AA minimum of 24px and misses the 44px the footer links now hit, so the two sit inconsistently in the same corner. |
| B | Legal | Parked in `legal-draft/`. See `legal-review.md`. |

## Needs the owner, not the codebase

1. **Four prices on `/services/how-we-work/`.** Care, Care + credits, the
   on-request rate, and the wind-down fee, all showing `Price TBC`. v2 gives
   only a 5 to 10 percent of build cost heuristic.
2. **The Cloudflare Worker is deployed and current** as of 9 September 2026, and
   no longer needs a visit when Sprite's facts change: edit `docs/sprite.md`,
   push, and it is live within five minutes. Re-paste
   `cloudflare-worker/sprite-proxy.js` only when that *file* changes, which now
   means personality, contact details, the linking rules or the model. Leave the
   `MODEL` variable unset unless overriding the 120b default.
3. **Formspree dashboard:** restrict allowed domains to `beben.design`, and turn
   on submission notifications. The free tier caps at 50 a month and fails
   silently once hit.
4. **Advocate review** before any of `legal-draft/` is treated as contractual.
   The highest-risk item is the 25% cancellation fee, which risks being struck
   as a penalty. v2 section 6 adds six more clauses to draft: retrofit
   exclusion, the content-versus-structural definition now published on
   `/services/how-we-work/`, retainer scope and credit expiry, wind-down terms,
   account ownership, and AI-assisted production.
5. **Consumer terms before the shop launches.** Undrafted, and now larger: v2
   moves the shop from digital downloads to physical goods, which needs terms of
   sale, a refund and returns position, and shipping terms.
6. **Codex needs something verifiable.** Publishing the schema and one small
   sample file would let a reader confirm the page's central claim. This is now
   published as a fault on the Codex page itself, under *what is still wrong*,
   so the page names its own weakness rather than waiting for a reader to.
7. **A LinkedIn URL, if there is one.** The homepage JSON-LD claimed
   `linkedin.com/beben.design`, which returns 404, as does
   `linkedin.com/company/beben-design`. It has been removed from `sameAs`
   rather than left as a false claim. Instagram and Behance were verified and
   are now linked in every footer. Give me the real URL and it goes back in
   both places.
8. **Four prices are still `Price TBC`.** Unchanged by this run, and repeated
   here because it is the oldest open item on the list.

---

## Verifying a change

```
python3 -m http.server 8123 --directory docs        # local preview. Port matters:
                                                    # the Worker's CORS allowlist
                                                    # has 8123, so any other port
                                                    # gives Sprite's offline replies

python3 scripts/check_voice.py                      # voice zoning, banned words
python3 scripts/check_facts.py                      # the coordinates, email and city
                                                    # agree in all three spellings
node --check cloudflare-worker/sprite-proxy.js      # the Worker parses before pasting
node --check docs/assets/JS/sprite.js

python3 scripts/build_tools.py                      # all three generators are idempotent:
.venv/bin/python scripts/build_blog.py              # a run against unchanged sources
python3 scripts/build_status.py                     # must leave the tree clean
git status --short

python3 scripts/build_status.py --check             # fails if the homepage panel has
                                                    # drifted from the measurements

grep -rhoE '(index|sprite)\.(css|js)\?v=[0-9.]+' docs scripts --include=*.html | sort -u
                                                    # must return exactly one version
```

`build_blog.py` needs `markdown`: `python3 -m venv .venv && .venv/bin/pip install markdown`.

Current state, all of it measured rather than remembered: 33 pages served
excluding the arcade plus `404.html`, 30 sitemap URLs, 1033 internal references
resolve and 0 break, all JSON-LD valid, no duplicate titles or descriptions, no
em dashes in visitor-facing copy, voice clean, facts agree across 33 files, and
one asset version (`4.7`) everywhere.

The link figure moved 965 to 1033 with the arcade gameplay pass above: the
status stamp predates the hub's growth from 12 to 20 games, so the arcade's own
internal links were counted for the first time since. The figure is lower than
the 837 recorded before that because the checker now strips script bodies
first. A URL a page assembles in JavaScript is not a link, and counting the
arcade's `'./' + last + '/'` as a broken one is how you end up publishing
"2 broken links" about a site that has none.
