"""Build the Beben Arcade pixel display font.

Subsets Press Start 2P (OFL) down to the glyphs the arcade actually
renders - space through underscore (digits, uppercase A-Z, basic
punctuation) plus the multiplication sign and arrows - and writes:

    docs/games/fonts/press-start-2p.woff2
    docs/games/fonts/OFL.txt

The subset has NO lowercase glyphs: every element styled with
--font-pixel must also carry text-transform: uppercase.

Source TTF + license are fetched from the Google Fonts repo into
scripts/.cache/ on first run (delete the cache to re-download).

Rerunnable: py scripts/subset_arcade_font.py  (requires: pip install fonttools brotli)
"""

import urllib.request
from pathlib import Path

from fontTools.subset import Options, Subsetter, parse_unicodes
from fontTools.ttLib import TTFont

REPO = "https://github.com/google/fonts/raw/main/ofl/pressstart2p/"
TTF_NAME = "PressStart2P-Regular.ttf"
LICENSE_NAME = "OFL.txt"
UNICODES = "U+0020-005F,U+00D7,U+2190-2193"


def fetch(name: str, dest: Path) -> Path:
    path = dest / name
    if not path.exists():
        print(f"Downloading {name} ...")
        urllib.request.urlretrieve(REPO + name, path)
    return path


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    cache = root / "scripts" / ".cache"
    cache.mkdir(parents=True, exist_ok=True)
    out_dir = root / "docs" / "games" / "fonts"
    out_dir.mkdir(parents=True, exist_ok=True)

    ttf = fetch(TTF_NAME, cache)
    license_src = fetch(LICENSE_NAME, cache)

    options = Options()
    options.flavor = "woff2"
    options.hinting = False
    options.desubroutinize = True
    options.layout_features = []
    options.name_IDs = [1, 2]  # family + style only

    font = TTFont(ttf)
    subsetter = Subsetter(options=options)
    subsetter.populate(unicodes=parse_unicodes(UNICODES))
    subsetter.subset(font)

    out = out_dir / "press-start-2p.woff2"
    font.save(out)
    (out_dir / LICENSE_NAME).write_bytes(license_src.read_bytes())

    print(f"Wrote {out} ({out.stat().st_size:,} bytes) + {LICENSE_NAME}")


if __name__ == "__main__":
    main()
