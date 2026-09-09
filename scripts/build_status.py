#!/usr/bin/env python3
"""Build report generator for the beben.design homepage.

The homepage carries a terminal panel of figures about the site itself. It
used to pulse a green "live" dot over four metrics that random-walked in
JavaScript and ten invented activity lines. None of it was real, which is a
strange thing to put next to case studies whose whole claim is that every
number in them was re-run from source.

This script measures the figures instead, and writes them into the panel
between the markers in docs/index.html:

    <!-- status:start (managed by scripts/build_status.py) -->
    <!-- status:end -->

What is measured, and how:

    pages              .html under docs/, minus the arcade sub-app at
                       docs/games/ and minus 404.html, which is served but
                       not navigated to
    internal_links     every href/src on every page that points inside the
                       site, resolved against docs/. Script bodies are
                       stripped first: JS builds URLs by concatenation and
                       those fragments are not links
    css_and_js         the stylesheets and scripts docs/index.html actually
                       references, summed off disk
    javascript_deps    <script src> pointing at another origin, across the
                       studio's own pages
    analytics_scripts  a grep for the known tracker vendors
    cookies_set        document.cookie anywhere in the shipped source

The last two are greps for absence, which can only ever prove that nothing
named in TRACKERS is present. They are here to fail loudly if one is added
later, not to prove a negative today.

Client prototypes are excluded from the dependency and tracker counts.
docs/kemmy-spa-concierge-preview/ loads 31 images from Unsplash; that is a
mock of somebody else's site and says nothing about how this one is built.
They stay in the page and link counts, because they are pages and their
links do have to resolve.

The date stamp moves only when a figure moves. Regenerating on an unchanged
tree rewrites nothing, so this behaves like the other two generators:

    python3 scripts/build_status.py

Usage:
    python3 scripts/build_status.py            write the block
    python3 scripts/build_status.py --check    report only, exit 1 if stale
"""

import re
import sys
import urllib.parse
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
HOME = DOCS / "index.html"
POSTS = ROOT / "content" / "blog"
REGISTRY = ROOT / "content" / "tools.json"

START = "<!-- status:start (managed by scripts/build_status.py) -->"
END = "<!-- status:end -->"
INDENT = " " * 20

# The arcade is a separate sub-app with its own shell, service worker and
# fonts. It is counted as one product below, not as thirteen pages.
ARCADE = "games/"
# Mocks of other people's sites. See the module docstring.
PROTOTYPES = ("kemmy-spa-concierge-preview/", "redoubt/")

# Curated, then verified against disk. A case study is a page that carries
# the full skeleton, which is not something a file listing can tell you.
CASE_STUDIES = ["sprite", "beben-arcade", "codex"]

# Matched against code surfaces only: script bodies, and the URL of every
# request the markup makes. Never against prose. The Sprite case study names
# five of these vendors in a sentence about not using any of them, and a
# substring search over the whole page reports that as three trackers.
TRACKERS = [
    (r"google-analytics\.com", "Google Analytics"),
    (r"googletagmanager\.com", "Tag Manager"),
    (r"\bgtag\s*\(", "gtag()"),
    (r"\bdataLayer\b", "dataLayer"),
    (r"plausible\.io", "Plausible"),
    (r"usefathom\.com", "Fathom"),
    (r"\bmatomo\b", "Matomo"),
    (r"\bhotjar\b", "Hotjar"),
    (r"\bmixpanel\b", "Mixpanel"),
    (r"\bsegment\.com", "Segment"),
    (r"connect\.facebook\.net", "Meta Pixel"),
    (r"clarity\.ms", "Clarity"),
    (r"\bposthog\b", "PostHog"),
    (r"\bumami\b", "Umami"),
    (r"cloudflareinsights\.com", "Cloudflare Insights"),
]

SCRIPT_BODY = re.compile(r"<script(?![^>]*\bsrc=)[^>]*>.*?</script>", re.S)
STYLE_BODY = re.compile(r"<style[^>]*>.*?</style>", re.S)

warnings = []


def warn(msg):
    warnings.append(msg)
    print("  WARNING: " + msg)


def rel(path):
    return str(path.relative_to(DOCS)).replace("\\", "/")


def is_arcade(path):
    return rel(path).startswith(ARCADE)


def is_prototype(path):
    return rel(path).startswith(PROTOTYPES)


def html_pages():
    return sorted(DOCS.rglob("*.html"))


def strip_code(text):
    """Markup with script and style bodies removed.

    A URL assembled in JavaScript is not a link. Without this, the arcade's
    `'./' + last + '/'` and the QR tool's inlined vendor library both read as
    broken hrefs, which is how you end up publishing "2 broken links" about a
    site that has none.
    """
    return STYLE_BODY.sub("", SCRIPT_BODY.sub("", text))


# ── MEASUREMENTS ──────────────────────────────────────────────────────

def count_pages():
    return sum(1 for p in html_pages()
               if not is_arcade(p) and rel(p) != "404.html")


def resolves(target):
    return target.is_file() or (target / "index.html").is_file()


def check_links():
    """Every internal href/src on every page, resolved against docs/."""
    checked = broken = 0
    docs_abs = DOCS.resolve()
    for page in html_pages():
        markup = strip_code(page.read_text(encoding="utf-8", errors="replace"))
        for m in re.finditer(r'(?:href|src)="([^"]+)"', markup):
            raw = m.group(1)
            if raw.startswith(("mailto:", "tel:", "data:", "javascript:", "#")):
                continue
            parsed = urllib.parse.urlparse(raw)
            if parsed.scheme in ("http", "https"):
                if parsed.netloc not in ("beben.design", "www.beben.design"):
                    continue
            elif parsed.netloc:
                continue
            path = urllib.parse.unquote(parsed.path)
            if not path:
                continue
            checked += 1
            if path.startswith("/"):
                target = (DOCS / path.lstrip("/")).resolve()
            else:
                target = (page.parent / path).resolve()
            inside = target == docs_abs or docs_abs in target.parents
            if not inside or not resolves(target):
                broken += 1
                warn(f"broken link in {rel(page)}: {raw}")
    return checked, broken


def homepage_weight():
    """Bytes of CSS and JS the homepage references, read off disk."""
    markup = HOME.read_text(encoding="utf-8")
    total = 0
    seen = []
    refs = re.findall(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', markup)
    refs += re.findall(r'<script[^>]+src="([^"]+)"', markup)
    for ref in refs:
        if urllib.parse.urlparse(ref).netloc:
            continue
        asset = (HOME.parent / urllib.parse.urlparse(ref).path).resolve()
        if not asset.is_file():
            warn(f"homepage references a missing asset: {ref}")
            continue
        total += asset.stat().st_size
        seen.append(rel(asset))
    if not seen:
        warn("no local CSS or JS found on the homepage")
    return total, seen


def studio_pages():
    return [p for p in html_pages() if not is_arcade(p) and not is_prototype(p)]


def count_js_deps():
    hosts = set()
    for page in studio_pages():
        markup = page.read_text(encoding="utf-8")
        for src in re.findall(r'<script[^>]+src="([^"]+)"', markup):
            host = urllib.parse.urlparse(src).netloc
            if host:
                hosts.add(host)
    return len(hosts), sorted(hosts)


def code_surface(markup):
    """The parts of a page that can execute or fetch.

    Script bodies, every src/href the markup requests, and inline event
    handlers. Prose is deliberately not included: a page is allowed to write
    the word "Plausible" in a sentence explaining that it does not load it.
    """
    parts = re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", markup, re.S)
    parts += re.findall(r'(?:src|href)="([^"]+)"', markup)
    parts += re.findall(r'\son[a-z]+="([^"]*)"', markup)
    return "\n".join(parts)


def count_analytics():
    hits = []
    for page in studio_pages():
        code = code_surface(page.read_text(encoding="utf-8"))
        for pattern, name in TRACKERS:
            if re.search(pattern, code, re.I):
                hits.append(f"{rel(page)}: {name}")
    return len(hits), hits


def count_cookies():
    hits = []
    for path in list(DOCS.rglob("*.html")) + list(DOCS.rglob("*.js")):
        if "document.cookie" in path.read_text(encoding="utf-8", errors="replace"):
            hits.append(rel(path))
    return len(hits), hits


def count_tools():
    """Live tools that are pages on this site, not links off it."""
    import json
    raw = json.loads(REGISTRY.read_text(encoding="utf-8"))
    return sum(1 for t in raw["tools"]
               if t.get("status") == "live" and not t.get("external_url"))


def count_games():
    return sum(1 for p in (DOCS / "games").iterdir()
               if p.is_dir() and (p / "index.html").is_file())


def count_case_studies():
    missing = [s for s in CASE_STUDIES if not (DOCS / s / "index.html").is_file()]
    for slug in missing:
        warn(f"case study listed but not on disk: docs/{slug}/")
    return len(CASE_STUDIES) - len(missing)


def count_posts():
    return len(list(POSTS.glob("*.md")))


# ── RENDER ────────────────────────────────────────────────────────────

def kb(n):
    return f"{round(n / 1024)} KB"


def plural(n, one, many):
    return one if n == 1 else many


def metric(key, value):
    return (f'{INDENT}<div class="tui__metric">'
            f'<span class="tui__metric-key">{key}</span>'
            f'<span>{value}</span></div>')


def line(text):
    return (f'{INDENT}<li class="tui__line">'
            f'<span class="tui__check">- [x]</span> {text}</li>')


def render(figures):
    pages = figures["pages"]
    checked, broken = figures["links"]
    weight, _ = figures["weight"]
    deps, _ = figures["deps"]
    trackers, _ = figures["analytics"]
    cookies, _ = figures["cookies"]
    tools = figures["tools"]
    games = figures["games"]
    studies = figures["case_studies"]
    posts = figures["posts"]

    metrics = [
        metric("pages", pages),
        metric("internal_links", f"{checked} checked, {broken} broken"),
        metric("css_and_js", f"{kb(weight)}, uncompressed"),
        metric("javascript_deps", deps),
        metric("analytics_scripts", trackers),
        metric("cookies_set", cookies),
    ]
    shipped = [
        line(f"{tools} tools that run in the browser. Nothing you paste leaves the tab."),
        line(f"{games} games at one address, installable, playable in airplane mode."),
        line(f"{studies} case {plural(studies, 'study', 'studies')}, every figure "
             "re-run from source before it was published."),
        # "Blog", not "Journal". The rename is brief v2 phase 7 and has not
        # happened: the nav, the page title and the URL all still say blog.
        line(f"{posts} blog {plural(posts, 'post', 'posts')} on how the things "
             "above were built."),
        line("1 person doing the design, the code and the writing."),
    ]

    return "\n".join([
        f'{INDENT}<div class="tui__h1"># beben.design, measured</div>',
        "",
        f'{INDENT}<div class="tui__h2">## site</div>',
        f'{INDENT}<div class="tui__metrics">',
        *metrics,
        f'{INDENT}</div>',
        "",
        f'{INDENT}<div class="tui__h2">## shipped</div>',
        f'{INDENT}<ul class="tui__log">',
        *shipped,
        f'{INDENT}</ul>',
    ])


def measure():
    return {
        "pages": count_pages(),
        "links": check_links(),
        "weight": homepage_weight(),
        "deps": count_js_deps(),
        "analytics": count_analytics(),
        "cookies": count_cookies(),
        "tools": count_tools(),
        "games": count_games(),
        "case_studies": count_case_studies(),
        "posts": count_posts(),
    }


def report(figures):
    checked, broken = figures["links"]
    weight, assets = figures["weight"]
    deps, hosts = figures["deps"]
    trackers, tracker_hits = figures["analytics"]
    cookies, cookie_hits = figures["cookies"]
    print(f"  pages              {figures['pages']}")
    print(f"  internal_links     {checked} checked, {broken} broken")
    print(f"  css_and_js         {kb(weight)} from {', '.join(assets)}")
    print(f"  javascript_deps    {deps}" + (f" ({', '.join(hosts)})" if hosts else ""))
    print(f"  analytics_scripts  {trackers}" + (f" ({tracker_hits[0]})" if tracker_hits else ""))
    print(f"  cookies_set        {cookies}" + (f" ({cookie_hits[0]})" if cookie_hits else ""))
    print(f"  tools {figures['tools']}, games {figures['games']}, "
          f"case studies {figures['case_studies']}, posts {figures['posts']}")


def stamp_of(markup):
    m = re.search(r'<span class="tui__stamp">measured ([^<]+)</span>', markup)
    return m.group(1) if m else None


def main():
    check_only = "--check" in sys.argv

    markup = HOME.read_text(encoding="utf-8")
    if START not in markup or END not in markup:
        sys.exit(f"docs/index.html: missing the markers {START!r} and {END!r}.")

    print("Measuring the site...")
    figures = measure()
    report(figures)

    block = render(figures)
    pattern = re.escape(START) + r".*?" + re.escape(END)
    current = re.search(pattern, markup, re.DOTALL).group(0)
    body = START + "\n" + block + "\n" + INDENT + END

    if current == body:
        print("\nUnchanged. The stamp keeps its date.")
        return 0

    # A figure moved, so the panel is being measured again today. Nothing
    # else in the file may move: the stamp lives outside the markers.
    today = date.today().strftime("%-d %b %Y")
    was = stamp_of(markup)
    if check_only:
        print(f"\nSTALE: the block differs from the measurements"
              + (f" (stamped {was})" if was else ""))
        return 1

    markup = re.sub(pattern, lambda _: body, markup, flags=re.DOTALL)
    if was is None:
        warn("no tui__stamp span on the homepage, so no date was written")
    else:
        markup = markup.replace(f'<span class="tui__stamp">measured {was}</span>',
                                f'<span class="tui__stamp">measured {today}</span>')
    HOME.write_text(markup, encoding="utf-8", newline="\n")
    print(f"\nwrote docs/index.html (stamp {was} -> {today})")
    return 0


if __name__ == "__main__":
    code = main()
    if warnings:
        print(f"\n{len(warnings)} warning(s).")
    sys.exit(code)
