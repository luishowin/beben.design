# Site revision, state of play

Two revisions are now on `main`: the phase 0-1 corrections, and brief v2 phases
1 to 4. GitHub Pages serves `docs/` from `main`, so pushing `main` publishes.
The Cloudflare Worker is the exception and does not deploy from git at all.

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
| v2-5 | **Work**: reorganise by problem type, six-part case study skeleton | v2 4.1. Current skeleton is four-part and organised by medium. |
| v2-6 | **Tools**: run-mode badges (`browser` / `download` / `self-host`), promise-not-photo hero | v2 4.5. `content/tools.json` takes a new field cleanly. |
| v2-7 | **Journal**: three columns (Teardown / Build log / Reference), rename from Blog | **Not a rename, a migration.** 32 files reference `/blog/`, plus `feed.xml`, the sitemap block and `build_blog.py`. GitHub Pages has no server-side redirects, so five indexed post URLs would break. |
| v2-8 | **Shop**: Kenya-only, three products, Paystack | **Bigger than v2 admits.** The current page promises six *digital* products; v2 4.6 specifies *physical* goods with courier and Pickup Mtaani. That changes the product line, fulfilment and the legal position. Blocked on legal, see below. |
| v2-9 | Arcade UI overhaul | Tracked separately, blocks nothing. |
| 8 | Instagram footer link, and the Nairobi coordinates in **29 files** | Three encodings: one literal `1°16'S` on the homepage, 27 as `1&deg;16'S` entities, and one in `sprite.js` spelled `1 deg 16'S` that defeats a degree-sign grep. Grew from 16 as pages were added, and grows again with every new page. |
| 8 | `.footer-nav` baseline bug | 11.2px links on a 43.5px strut. The repo already fixed this exact bug in the main nav. |
| 9 | `/work/` page weight | The HTML is 32KB; the image payload takes it past 2MB. |
| 9 | `.tui__h1` / `.tui__h2` are a hardcoded `#9148ff` | A fifth colour outside the system, failing contrast at 3.71 to 3.99. |
| 9 | ~19MB of unreferenced images in `docs/assets/images/` | Caution: the hero webp scores zero on a filename grep because every reference is percent-encoded. A naive cleanup deletes a live asset. |
| 9 | Eight meta descriptions over 160 characters | They truncate in results. All predate this work; the homepage one was fixed with the voice pass. |
| 7 | The fabricated live console on the homepage | `index.html` pulses a "live" dot over four random-walk metrics and ten invented activity lines. A visitor who suspects it is synthetic discounts every other claim on the page. |
| B | Legal | Parked in `legal-draft/`. See `legal-review.md`. |

---

## Needs the owner, not the codebase

1. **Four prices on `/services/how-we-work/`.** Care, Care + credits, the
   on-request rate, and the wind-down fee, all showing `Price TBC`. v2 gives
   only a 5 to 10 percent of build cost heuristic.
2. **Deploy the Cloudflare Worker.** `cloudflare-worker/sprite-proxy.js` carries
   Sprite's live system prompt and **outranks** `docs/sprite.md`. A git push does
   not reach Cloudflare. Until it is pasted in, the live Sprite keeps the old
   pricing and the old voice.
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
   sample file would let a reader confirm the page's central claim.

---

## Verifying a change

```
python3 -m http.server 8123 --directory docs        # local preview

python3 scripts/check_voice.py                      # voice zoning, banned words

python3 scripts/build_tools.py                      # both generators are idempotent:
.venv/bin/python scripts/build_blog.py              # a run against unchanged sources
git status --short                                  # must leave the tree clean

grep -rhoE '(index|sprite)\.(css|js)\?v=[0-9.]+' docs scripts --include=*.html | sort -u
                                                    # must return exactly one version
```

`build_blog.py` needs `markdown`: `python3 -m venv .venv && .venv/bin/pip install markdown`.

Current state: 34 pages served excluding the arcade, 30 sitemap URLs, 837
internal links resolve, all JSON-LD valid, no duplicate titles or descriptions,
no em dashes in visitor-facing copy, voice clean.
