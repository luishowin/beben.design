"""Generate the Beben Arcade PWA icons.

Renders a 16x16 pixel-art joystick in the arcade's neon palette onto
#080813 and writes the three icons the arcade needs:

    docs/games/icons/icon-192.png             (maskable + any)
    docs/games/icons/icon-512.png             (maskable + any)
    docs/games/icons/apple-touch-icon-180.png (opaque full-bleed)

Rerunnable: py scripts/make_arcade_icons.py  (requires Pillow)
The motif stays inside the central ~60% so maskable crops never clip it.
"""

from pathlib import Path

from PIL import Image, ImageDraw

BG = (8, 8, 19, 255)         # #080813 arcade black
STICK = (25, 198, 255, 255)  # #19C6FF neon blue (stick + base)
BALL = (255, 45, 170, 255)   # #FF2DAA neon pink (ball)
GLINT = (234, 242, 255, 255) # #EAF2FF glint

# 16x16 joystick: pink ball (white glint), blue stick and base.
ART = [
    "................",
    "......YYYY......",
    ".....YYYYYY.....",
    ".....YWYYYY.....",
    ".....YYYYYY.....",
    "......YYYY......",
    ".......RR.......",
    ".......RR.......",
    ".......RR.......",
    ".......RR.......",
    "....RRRRRRRR....",
    "...RRRRRRRRRR...",
    "..RRRRRRRRRRRR..",
    "..RRRRRRRRRRRR..",
    "................",
    "................",
]
PALETTE = {"R": STICK, "Y": BALL, "W": GLINT}


def render(size: int, art_scale: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BG)
    draw = ImageDraw.Draw(img)
    art_px = 16 * art_scale
    ox = (size - art_px) // 2
    oy = (size - art_px) // 2
    for row, line in enumerate(ART):
        for col, ch in enumerate(line):
            color = PALETTE.get(ch)
            if color is None:
                continue
            x0 = ox + col * art_scale
            y0 = oy + row * art_scale
            draw.rectangle([x0, y0, x0 + art_scale - 1, y0 + art_scale - 1], fill=color)
    return img


def main() -> None:
    out = Path(__file__).resolve().parent.parent / "docs" / "games" / "icons"
    out.mkdir(parents=True, exist_ok=True)

    # art_scale keeps the 16px motif inside the central ~60% of the canvas
    render(512, 19).convert("RGB").save(out / "icon-512.png", optimize=True)
    render(192, 7).convert("RGB").save(out / "icon-192.png", optimize=True)
    render(180, 7).convert("RGB").save(out / "apple-touch-icon-180.png", optimize=True)
    print(f"Wrote 3 icons to {out}")


if __name__ == "__main__":
    main()
