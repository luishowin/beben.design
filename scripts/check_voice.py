#!/usr/bin/env python3
"""
Voice checker for the brief v2 voice system.

Checks visitor-facing copy against the zoning in brief v2 section 1.1 and the
banned constructions in 1.3. Reads only; never writes.

    python3 scripts/check_voice.py           # report, exit 1 if anything fails
    python3 scripts/check_voice.py --all     # also list allowed first person

What counts as visitor-facing text here: rendered text nodes, the meta
description and its og/twitter twins, and JSON-LD string values. Script and
style bodies are skipped, so JS variable names and CSS comments cannot trip a
rule.

Zones. Each page is assigned one, and the zone decides whether first person is
a failure or the house style:

  selling     second person only. No we/our/us.
  ui          second person, warm. Forms, errors, 404.
  case-study  first person plural is correct. A judgment call needs an owner.
  about       the studio may describe itself. Folded into /services/how-we-work/,
              because v2's architecture has no /about/ page to carry it.
  legal       third person, named. "Beben Design is not liable", never "we".
  sprite      the mascot speaks as "I" and jokes. Studio "we" still leaks here.

Excluded from every rule, deliberately:

  docs/kemmy-spa-concierge-preview/  a mock client speaking as itself
  docs/redoubt/                      the same, a client prototype
  docs/games/                        a separate sub-app, and its own voice
  docs/blog/, content/blog/          journal voice, phase 7
"""

import re
import sys
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"

SELLING = "selling"
ABOUT = "about"
UI = "ui"
CASE_STUDY = "case-study"
LEGAL = "legal"
SPRITE = "sprite"

# Zone by path prefix, longest prefix wins.
ZONES = {
    "index.html": SELLING,
    "services/": SELLING,
    # Brief v2 1.1: the one zone where the studio may describe itself. The
    # philosophy folded in here is the About content; v2's own architecture
    # has no /about/ page to put it on.
    "services/how-we-work/": ABOUT,
    "tools/": SELLING,
    "shop/": SELLING,
    "contact/": UI,
    "404.html": UI,
    "work/": CASE_STUDY,
    "sprite/": CASE_STUDY,
    "codex/": CASE_STUDY,
    "beben-arcade/": CASE_STUDY,
    "kilimo-pal/": CASE_STUDY,
    "trek-watch/": CASE_STUDY,
    "rev-log/": CASE_STUDY,
    "credits/": CASE_STUDY,
    "legal/": LEGAL,
    "privacy/": LEGAL,
}

EXCLUDED = (
    "kemmy-spa-concierge-preview/",
    "redoubt/",
    "games/",
    "blog/",
)

# Generated output. Editing these is wasted work; the source is listed so the
# report can point at the file actually worth opening.
GENERATED = {
    "character-counter/index.html": "content/tools.json + content/tools/character-counter/",
    "contrast-grid/index.html": "content/tools.json + content/tools/contrast-grid/",
    "dither-machine/index.html": "content/tools.json + content/tools/dither-machine/",
    "qr-code-generator/index.html": "content/tools.json + content/tools/qr-code-generator/",
}

FIRST_PERSON = re.compile(r"\b(we|we're|we've|we'll|our|ours|us)\b", re.I)
THE_TEAM = re.compile(r"\bthe team\b", re.I)

# Section 1.3. "solution" is handled separately: a plain \bsolution\b also
# matches inside "resolution", which produces false positives on the legal and
# Codex pages.
BANNED = [
    "passionate about",
    "pride ourselves",
    "cutting-edge",
    "cutting edge",
    "leverage",
    "seamless",
    "elevate",
    "bespoke",
    "world-class",
    "world class",
    "luxury",
    "contact us today",
]
SOLUTION = re.compile(r"(?<!re)\bsolutions?\b", re.I)

# "Does It Fit?" is a product name, not a rhetorical headline.
HEADING_EXEMPT = {"does it fit?"}

# Page names, which brief v2 fixes in section 2 and 4.3. "How we work" is
# first person, but it is the page's name rather than a sentence about the
# studio, and it appears as link text on selling-zone pages. Renaming it to
# satisfy the pronoun rule would rename a page the brief names twice.
PROPER_NAMES = {"how we work"}
NAME_NOISE = re.compile(r"^(read|see|more about)\s+|[\s\u2197\u2190\u2192.:,!?]+$", re.I)


def is_proper_name(flat):
    prev = None
    while prev != flat:
        prev = flat
        flat = NAME_NOISE.sub("", flat).strip()
    return flat.lower() in PROPER_NAMES

SKIP_TAGS = {"script", "style"}
META_NAMES = {"description", "og:description", "twitter:description"}


class Text(HTMLParser):
    """Collects visitor-facing text with the line it appeared on."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.chunks = []          # (line, text)
        self.headings = []        # (line, text)
        self._skip = 0
        self._heading = None
        self._ld = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in SKIP_TAGS:
            # JSON-LD is data, but its strings are visitor-facing via search.
            if tag == "script" and a.get("type") == "application/ld+json":
                self._ld = self.getpos()[0]
            else:
                self._skip += 1
        elif tag == "meta":
            key = a.get("name") or a.get("property")
            if key in META_NAMES and a.get("content"):
                self.chunks.append((self.getpos()[0], a["content"]))
        elif re.fullmatch(r"h[1-6]", tag):
            self._heading = [self.getpos()[0], ""]

    def handle_endtag(self, tag):
        if tag in SKIP_TAGS:
            if self._ld is not None:
                self._ld = None
            elif self._skip:
                self._skip -= 1
        elif re.fullmatch(r"h[1-6]", tag) and self._heading:
            line, text = self._heading
            text = " ".join(text.split())
            if text:
                self.headings.append((line, text))
            self._heading = None

    def handle_data(self, data):
        line = self.getpos()[0]
        if self._ld is not None:
            # Pull the string values out of the JSON-LD blob.
            for m in re.finditer(r'"(?:description|name|headline)"\s*:\s*"([^"]+)"', data):
                self.chunks.append((line + data[: m.start()].count("\n"), m.group(1)))
            return
        if self._skip:
            return
        if data.strip():
            self.chunks.append((line, data))
        if self._heading is not None:
            self._heading[1] += data


def zone_for(rel):
    best, zone = -1, None
    for prefix, z in ZONES.items():
        if rel.startswith(prefix) and len(prefix) > best:
            best, zone = len(prefix), z
    return zone


def check_html(path, show_allowed):
    rel = str(path.relative_to(DOCS))
    if any(rel.startswith(x) for x in EXCLUDED):
        return [], []

    zone = zone_for(rel)
    if zone is None:
        return [], []

    parser = Text()
    parser.feed(path.read_text(encoding="utf-8"))

    fails, notes = [], []
    where = f"docs/{rel}"
    origin = GENERATED.get(rel)

    for line, text in parser.chunks:
        flat = " ".join(text.split())
        if not flat:
            continue

        hits = FIRST_PERSON.findall(flat)
        if hits and not is_proper_name(flat):
            if zone in (SELLING, UI):
                fails.append((where, line, f"first person in {zone} zone", flat))
            elif zone == LEGAL:
                fails.append((where, line, "first person in legal zone (name the party)", flat))
            elif zone == ABOUT:
                if show_allowed:
                    notes.append((where, line, "first person, allowed in about", flat))
            elif zone == SPRITE:
                fails.append((where, line, "studio first person in sprite", flat))
            elif show_allowed:
                notes.append((where, line, f"first person, allowed in {zone}", flat))

        if THE_TEAM.search(flat):
            fails.append((where, line, "asserts a team that does not exist", flat))

        low = flat.lower()
        for word in BANNED:
            if word in low:
                fails.append((where, line, f"banned: {word}", flat))
        if SOLUTION.search(flat) and "problem, not the solution" not in low:
            fails.append((where, line, "banned: solution", flat))
        if re.search(r"\w!", flat):
            fails.append((where, line, "exclamation mark", flat))

    for line, text in parser.headings:
        if text.rstrip().endswith("?") and text.strip().lower() not in HEADING_EXEMPT:
            fails.append((where, line, "rhetorical-question headline", text))

    if zone in (SELLING, UI):
        fails += check_inline_js(path, zone)

    if origin and fails:
        fails = [(f"{f[0]}  [generated, edit {origin}]", *f[1:]) for f in fails]
    return fails, notes


STRING = re.compile(r"""(['"`])((?:(?!\1)[^\\]|\\.)*)\1""")


def js_strings(text):
    """String literals from JS that plausibly hold visitor-facing copy.

    Identifiers, selectors, class lists and locale tags are not copy. Four
    words is the cheapest filter that keeps sentences and drops
    "form-status form-status--error" and "en-US", the latter of which
    otherwise trips \bus\b on its uppercase half.
    """
    for n, line in enumerate(text.splitlines(), 1):
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("*"):
            continue
        for m in STRING.finditer(line):
            s = m.group(2)
            if len(s.split()) >= 4:
                yield n, s


def check_inline_js(path, zone):
    """UI copy built by a page's own inline script is still UI copy.

    The triage on the contact page assembles its questions in JavaScript, so
    none of that text appears in the HTML the parser sees.
    """
    fails = []
    where = f"docs/{path.relative_to(DOCS)}"
    raw = path.read_text(encoding="utf-8")
    for block in re.findall(r"<script(?![^>]*\bsrc=)[^>]*>(.*?)</script>", raw, re.S):
        offset = raw[: raw.index(block)].count("\n")
        for n, s in js_strings(block):
            if THE_TEAM.search(s):
                fails.append((where, offset + n, "asserts a team that does not exist", s))
            elif FIRST_PERSON.search(s) and not is_proper_name(s):
                fails.append((where, offset + n, f"first person in {zone} zone (inline script)", s))
    return fails


def check_sprite(show_allowed):
    """sprite.js keeps its jokes. Studio 'we' and team claims are still wrong."""
    path = ROOT / "docs" / "assets" / "JS" / "sprite.js"
    fails = []
    for n, s in js_strings(path.read_text(encoding="utf-8")):
        if THE_TEAM.search(s):
            fails.append(("docs/assets/JS/sprite.js", n, "asserts a team that does not exist", s))
        elif FIRST_PERSON.search(s):
            fails.append(("docs/assets/JS/sprite.js", n, "studio first person in sprite", s))
    return fails


def main():
    show_allowed = "--all" in sys.argv
    all_fails, all_notes = [], []

    for path in sorted(DOCS.rglob("*.html")):
        f, n = check_html(path, show_allowed)
        all_fails += f
        all_notes += n
    all_fails += check_sprite(show_allowed)

    for where, line, why, text in all_notes:
        print(f"  ok   {where}:{line}  {why}\n         {text[:100]}")
    if all_notes:
        print()

    for where, line, why, text in all_fails:
        print(f"FAIL  {where}:{line}  {why}\n        {text[:110]}")

    print()
    if all_fails:
        print(f"{len(all_fails)} to fix.")
        return 1
    print("Voice clean.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
