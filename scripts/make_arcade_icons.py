"""Generate the Arcadia PWA icons from the joystick artwork.

The source is the supplied full-bleed joystick photograph at
scripts/assets/arcadia-icon.jpg. It is already a near-square product shot, so
the generator center-crops it to a square and resizes it rather than cutting
the subject out. The light background and shadow stay in the icon.

Writes the five icons the arcade needs:

    docs/games/icons/icon-192.png              (any)
    docs/games/icons/icon-512.png              (any)
    docs/games/icons/icon-maskable-192.png     (maskable)
    docs/games/icons/icon-maskable-512.png     (maskable)
    docs/games/icons/apple-touch-icon-180.png  (opaque full-bleed)

The maskable files are the same full-bleed square; Android supplies the safe
circle itself, and the joystick sits inside it.

Rerunnable: py scripts/make_arcade_icons.py
Requires Pillow only.

PNG output is quantised to a 256-colour palette (the art is pixel-styled, so
the loss is invisible at icon sizes) and saved with optimize=True. That keeps
the 512px icons around 95KB instead of ~200KB as full RGB.
"""

from pathlib import Path

from PIL import Image

PALETTE_COLORS = 256
ICON_SIZES = [
    ("icon-512.png", 512),
    ("icon-192.png", 192),
    ("icon-maskable-512.png", 512),
    ("icon-maskable-192.png", 192),
    ("apple-touch-icon-180.png", 180),
]

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(__file__).resolve().parent / "assets" / "arcadia-icon.jpg"
OUT = ROOT / "docs" / "games" / "icons"


def render(size: int) -> Image.Image:
    """Center-crop the source to a square, resize, and palette-quantise."""
    with Image.open(SOURCE) as source:
        im = source.convert("RGB")
    width, height = im.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    im = im.crop((left, top, left + side, top + side))
    im = im.resize((size, size), Image.Resampling.LANCZOS)
    return im.quantize(
        colors=PALETTE_COLORS,
        method=Image.Quantize.MEDIANCUT,
        dither=Image.Dither.FLOYDSTEINBERG,
    )


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size in ICON_SIZES:
        render(size).save(OUT / name, optimize=True)
    print(f"Wrote {len(ICON_SIZES)} icons to {OUT}")


if __name__ == "__main__":
    main()
