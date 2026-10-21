"""Generate the Arcadia PWA icons from the controller artwork.

Strips the baked-in checkerboard from scripts/assets/arcadia-icon.jpg with
rembg, then composites the controller on Nintendo red (#E60012) and writes
the five icons the arcade needs:

    docs/games/icons/icon-192.png              (any)
    docs/games/icons/icon-512.png              (any)
    docs/games/icons/icon-maskable-192.png     (maskable)
    docs/games/icons/icon-maskable-512.png     (maskable)
    docs/games/icons/apple-touch-icon-180.png  (opaque full-bleed)

Rerunnable: py scripts/make_arcade_icons.py
Requires Pillow and rembg (the u2net model downloads once, ~170MB).

The controller keeps the diagonal of the source art. "any" icons fill 82% of
the canvas width; maskable icons fill 74%, which keeps every opaque pixel
inside the central 80% circle Android may use as its safe zone.
"""

from pathlib import Path

from PIL import Image, ImageFilter

BG = (230, 0, 18)          # #E60012 Nintendo red
ANY_WIDTH = 0.82
MASKABLE_WIDTH = 0.74

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(__file__).resolve().parent / "assets" / "arcadia-icon.jpg"
OUT = ROOT / "docs" / "games" / "icons"


def cutout() -> Image.Image:
    """Remove the checkerboard, trim to the controller, soften the edge."""
    try:
        from rembg import new_session, remove
    except ImportError:
        raise SystemExit(
            "rembg not installed. Use:\n"
            "  uv venv /home/luishowin/.venvs/rembg &&\n"
            "  uv pip install -p /home/luishowin/.venvs/rembg/bin/python "
            "rembg onnxruntime pillow"
        ) from None

    with Image.open(SOURCE) as source:
        src = source.convert("RGB")
    im = remove(src, session=new_session("u2net")).convert("RGBA")

    bbox = im.getbbox()
    if bbox is None:
        raise SystemExit(f"{SOURCE} is fully transparent after background removal")
    im = im.crop(bbox)

    # Defringe: harden the alpha, pull it in 1px, then feather slightly so the
    # dark body does not keep a pale halo from the JPEG's white background.
    alpha = im.getchannel("A").point(lambda v: 0 if v < 128 else 255)
    alpha = alpha.filter(ImageFilter.MinFilter(3))
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(alpha)
    return im.crop(im.getbbox())


def render(art: Image.Image, size: int, width_fraction: float) -> Image.Image:
    """Center the controller on a square red canvas at the given width."""
    scale = (size * width_fraction) / art.width
    resized = art.resize(
        (max(1, round(art.width * scale)), max(1, round(art.height * scale))),
        Image.Resampling.LANCZOS,
    )
    canvas = Image.new("RGB", (size, size), BG)
    canvas.paste(
        resized,
        ((size - resized.width) // 2, (size - resized.height) // 2),
        resized,
    )
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    art = cutout()
    jobs = [
        ("icon-512.png", 512, ANY_WIDTH),
        ("icon-192.png", 192, ANY_WIDTH),
        ("icon-maskable-512.png", 512, MASKABLE_WIDTH),
        ("icon-maskable-192.png", 192, MASKABLE_WIDTH),
        ("apple-touch-icon-180.png", 180, ANY_WIDTH),
    ]
    for name, size, fraction in jobs:
        render(art, size, fraction).save(OUT / name, optimize=True)
    print(f"Wrote {len(jobs)} icons to {OUT}")


if __name__ == "__main__":
    main()
