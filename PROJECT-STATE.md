# Site revision, state of play

Branch `revision/phase-0-1`, 8 commits, 52 files, +5490 / -1674. Nothing merged
to `main` yet. Nothing deployed.

The revision brief that started this was audited against the working tree
before any code was written. It was wrong about the repo in fourteen material
ways, and the corrections are recorded per commit rather than repeated here.
The short version: it blocked work that was not blocked, scoped work that
already existed, and missed the defects that were actually costing money.

---

## Decisions taken

| Decision | Answer |
|---|---|
| Entity | Sole proprietorship. No corporate veil, which is why the liability drafting needs an advocate. |
| Pricing | `$99` stays, reframed as the **Foundations** package for startups, new businesses and campaigns getting established. Not a bare anchor. |
| Collaboration claim | Reframe as capacity. "Scaling through collaboration" turned out not to exist anywhere in the tree or in any commit. |
| Tools hero | No action. The "no hero image" option was already the shipped state. |
| Legal | Parked. The drafted Terms of Engagement sit in `legal-draft/`, outside `docs/`. |
| Budget bands | Removed. Replaced with guidance on what makes an answerable brief. |
| Formspree spam | Dashboard domain restriction to `beben.design`. Nothing further is possible in the codebase; the reasoning is in the README. |

---

## Shipped

**Facts corrected.** The site published five false statements about data
processing: Google Analytics, cookies, IP logging, an analytics lawful basis,
and indefinite analytics retention. It runs none of those. It also claimed ODPC
registration as a data controller, which has not happened. All removed, and the
six real processors are now disclosed with the US transfer named.

**Conversion routed.** The contact form was never missing, it was orphaned: not
one in-body CTA on any hand-written page linked to `/contact/`. Worse, the
homepage hero CTA called `preventDefault()` unconditionally and copied an email
to the clipboard instead of opening anything. Ten CTAs now route to the form.

**Proof.** Three four-part case studies: Sprite, Beben Arcade, Codex. Each
states the constraint including the commercial one, what was rejected and why,
what shipped, and what it produced. Every number was read off disk with a shell
command and independently re-run. No visitor-side metric appears anywhere,
because the site runs no analytics and inventing one would cost more
credibility than the pages buy. Codex is marked throughout as self-reported,
because nothing about it is publicly verifiable.

**Services split.** One 830-line page became a hub plus four detail pages. The
FAQPage JSON-LD that described twenty answers no longer on that URL was deleted
and regenerated five-per-page from the visible text, so the two cannot drift.

**Accessibility.** The site sells WCAG AA as a deliverable and did not pass its
own claim. Fixed: an unguarded `localStorage` read that blanked every page in
any browser blocking site data, a chat launcher that was not keyboard operable
at all, invisible focus on every form control, sub-AA red on body text, 22px
tap targets, and a theme flash on every navigation.

**CSS consolidated.** `.cta-row` existed in 13 copies and had drifted into four
variants. 103 duplicate rules removed across ten files.

---

## Not done

| # | Item | Why it matters |
|---|---|---|
| 8 | Instagram footer link, and the Nairobi coordinates in **30 files** | The coordinates are the artificial-luxury signal the brief rules out. Three encodings, including one in `sprite.js` spelled `1 deg 16'S` that defeats a degree-sign grep. |
| 8 | Footer has no link to `/work/` | Every case study inherits zero footer discoverability. |
| 8 | `.footer-nav` baseline bug | 11.2px links on a 43.5px strut. The repo already fixed this exact bug in the main nav and documented it. |
| 9 | `/work/` is ~2,020KB | Double the budget. One 1,643,266-byte PNG is 81% of it. |
| 9 | `.tui__h1` / `.tui__h2` are a hardcoded `#9148ff` | A fifth colour outside the system, failing contrast at 3.71 to 3.99. |
| 9 | ~16.5MB of unreferenced images in `docs/assets/images/` | Caution: the hero webp scores zero on a filename grep because every reference is percent-encoded. A naive cleanup deletes a live asset. |
| 9 | Nine meta descriptions over 160 characters | They truncate in results. All predate this branch; the one it introduced is fixed. |
| 7 | The fabricated live console on the homepage | `index.html` pulses a "live" dot over four random-walk metrics and ten invented activity lines. A visitor who suspects it is synthetic discounts every other claim on the page. |
| 7 | Team language on nine sites | The site says "the team" and "we". 171 commits, one author across three git identities. Either name the collaborators or reframe, but atomically: fixing the homepage while `sprite.js` still says "I'll pass that along to the team" is worse than doing nothing. |
| B | Legal | Parked in `legal-draft/`. See `legal-review.md`. |

---

## Needs the owner, not the codebase

1. **Deploy the Cloudflare Worker.** `cloudflare-worker/sprite-proxy.js` now
   describes the Foundations package, but a git push does not reach Cloudflare.
   Until it is pasted in, the live Sprite quotes the old pricing, and its system
   prompt **outranks** `docs/sprite.md`.
2. **Formspree dashboard:** restrict allowed domains to `beben.design`, and turn
   on submission notifications. The free tier caps at 50 a month and fails
   silently once hit, which loses leads without warning.
3. **Advocate review** before any of `legal-draft/` is treated as contractual.
   `legal-review.md` scopes it: eight drafted clauses, five carried-over
   defects, thirteen unset variables. The highest-risk item is the 25%
   cancellation fee, which risks being struck as a penalty.
4. **Consumer terms before the shop launches.** The drafted terms scope
   engagements as business-to-business and exclude the Consumer Protection Act
   2012, but `/shop/` promises a storefront. Retail sales need terms of sale, a
   refund position and an end-user licence. Not drafted.
5. **Codex needs something verifiable.** Publishing the schema and one small
   sample file would let a reader confirm the page's central claim. Right now it
   is an argument, not a demonstration.

---

## Verifying a change

```
python3 -m http.server 8123 --directory docs        # local preview

grep -rhoE '(index|sprite)\.(css|js)\?v=[0-9.]+' docs scripts --include=*.html | sort -u
                                                    # must return exactly one version

python3 scripts/build_tools.py                      # both generators are idempotent:
.venv/bin/python scripts/build_blog.py              # a run against unchanged sources
git status --short                                  # must leave the tree clean
```

`build_blog.py` needs `markdown`: `python3 -m venv .venv && .venv/bin/pip install markdown`.

Current state: 32 pages served excluding the arcade, 28 sitemap URLs, all
internal links resolve, all JSON-LD valid, no duplicate titles or descriptions,
no em dashes in visitor-facing copy.
