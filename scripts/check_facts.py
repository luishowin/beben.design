#!/usr/bin/env python3
"""Fact checker for beben.design.

A handful of facts about the studio are repeated on every page: the
coordinates, the email address, the neighbourhood. There is no template
behind the hand-written pages, so each one carries its own copy, and the
count grows with every page added. That is survivable as long as the copies
agree. They stopped agreeing.

The coordinates were written three ways:

    1&deg;16'S 36&deg;48'E    29 pages, the house convention
    1°16'S 36°48'E            docs/index.html alone, a literal degree sign
    1 deg 16'S 36 deg 48'E    docs/assets/JS/sprite.js

so a grep for any one spelling found some of them and reported success. All
three are now normalised here before comparing, which means this script sees
what a grep cannot: whether the copies say the same thing.

The sprite.js spelling stays as it is on purpose. That string is spoken, and
speak() strips tags without decoding entities, so "&deg;" would be read out
one character at a time. It is a different spelling of the same fact, not a
different fact, and this script treats it that way.

    python3 scripts/check_facts.py           # report, exit 1 if anything disagrees
    python3 scripts/check_facts.py --all     # also list every file that agrees

Adding a fact: put it in FACTS with the shapes it may be written in. Coverage
is only enforced for facts marked required_on_pages, because a fact that must
appear everywhere and a fact that may appear anywhere are different promises.
"""

import html as htmllib
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DOCS = ROOT / "docs"
SPRITE_JS = DOCS / "assets" / "JS" / "sprite.js"

# Mocks of other people's sites, and a sub-app with its own shell. Their
# contact details are deliberately not the studio's.
EXCLUDED = ("kemmy-spa-concierge-preview/", "redoubt/", "games/")


def normalise(text):
    """Collapse every spelling of the same fact onto one string.

    Entities first, so &deg; and ° meet; then the spelled-out "deg", which
    exists for the speech synthesiser; then whitespace.
    """
    text = htmllib.unescape(text)
    text = re.sub(r"\s*\bdeg\b\s*", "°", text)
    return re.sub(r"\s+", " ", text).strip()


FACTS = [
    {
        "name": "coordinates",
        "canonical": "1°16'S 36°48'E",
        # Any coordinate-shaped run, in any of the three spellings.
        "pattern": re.compile(r"1\s*(?:&deg;|°|\bdeg\b)\s*16'S"
                              r"\s*36\s*(?:&deg;|°|\bdeg\b)\s*48'E"),
        # Loose enough to catch a wrong one: any "<digits><degree><digits>'S"
        # followed by an east reading, whatever the numbers are.
        "shape": re.compile(r"\d+\s*(?:&deg;|°|\bdeg\b)\s*\d+'[NS]"
                            r"\s*\d+\s*(?:&deg;|°|\bdeg\b)\s*\d+'[EW]"),
        "required_on_pages": True,
    },
    {
        "name": "email",
        "canonical": "hello.beben.design@gmail.com",
        "pattern": re.compile(r"hello\.beben\.design@gmail\.com"),
        "shape": re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
        "required_on_pages": True,
    },
    {
        # Prose, not a field: "in Westlands", "Westlands, Nairobi studio" and
        # "Westlands, Nairobi, Kenya" are all correct English about the same
        # place. Only the city is worth pinning, so the shape stops at it.
        "name": "neighbourhood",
        "canonical": "Westlands, Nairobi",
        "pattern": re.compile(r"Westlands,\s*Nairobi"),
        "shape": re.compile(r"Westlands,\s*[A-Za-z]+"),
        "required_on_pages": False,
    },
]


def in_scope(rel):
    return not rel.startswith(EXCLUDED)


def files_to_scan():
    out = []
    for p in sorted(DOCS.rglob("*.html")):
        rel = str(p.relative_to(DOCS)).replace("\\", "/")
        if in_scope(rel):
            out.append((f"docs/{rel}", p))
    out.append((f"docs/{SPRITE_JS.relative_to(DOCS)}", SPRITE_JS))
    return out


def has_site_footer(text):
    """Pages carrying the full studio footer are the ones that must carry the facts.

    Not footer-brand: the generated tool pages use that class for a one-line
    credit and deliberately carry no coordinates and no address. footer-meta
    is the bottom bar, and only the full footer has one.
    """
    return 'class="footer-meta"' in text


def main():
    show_all = "--all" in sys.argv
    fails, notes = [], []
    canonical_target = normalise(FACTS[0]["canonical"])

    for where, path in files_to_scan():
        text = path.read_text(encoding="utf-8", errors="replace")
        footer = has_site_footer(text)

        for fact in FACTS:
            good = fact["pattern"].findall(text)
            # Every occurrence that looks like this fact, right or wrong.
            shaped = fact["shape"].findall(text)
            wrong = [s for s in shaped
                     if normalise(s) != normalise(fact["canonical"])
                     and not fact["pattern"].fullmatch(s.strip())]

            for bad in sorted(set(wrong)):
                fails.append((where, fact["name"],
                              f"says {normalise(bad)!r}, canonical is "
                              f"{normalise(fact['canonical'])!r}"))

            if fact["required_on_pages"] and footer and not good:
                fails.append((where, fact["name"],
                              "page carries the studio footer but not this fact"))

            if good and show_all:
                notes.append((where, fact["name"], f"{len(good)} occurrence(s)"))

    for where, name, msg in notes:
        print(f"  ok   {where}  {name}: {msg}")
    if notes:
        print()

    for where, name, msg in fails:
        print(f"FAIL  {where}  {name}: {msg}")

    print()
    if fails:
        print(f"{len(fails)} to fix.")
        return 1
    counted = sum(1 for _ in files_to_scan())
    print(f"Facts agree across {counted} files. "
          f"Coordinates read {canonical_target} in all three spellings.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
