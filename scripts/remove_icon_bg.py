#!/usr/bin/env python3
"""remove_icon_bg.py — strip backgrounds from game/icon artwork.

Two engines:
  auto  (default)  use rembg (U²-Net semantic segmentation) when available,
                   otherwise fall back to flood-fill.
  rembg            semantic background removal; needs:
                     uv venv /home/luishowin/.venvs/rembg
                     uv pip install -p /home/luishowin/.venvs/rembg/bin/python rembg onnxruntime pillow
                   (first run downloads the ~170MB u2net model — on-device, nothing leaves the machine)
  flood            zero-dependency corner-seeded flood fill (PIL only) for flat,
                   clearly separated backgrounds. Fails on gradients and on
                   subjects that touch the frame or share the bg colour.

Post-processing (both engines): trim to alpha bbox, center on a square
--size canvas with a 4% margin, erode the alpha 1px to kill JPEG fringes,
and save as an RGBA PNG.

Examples:
  remove_icon_bg.py icon.jpg -o icon.png
  remove_icon_bg.py a.jpg b.jpg --out-dir out/ --size 256
  remove_icon_bg.py a.jpg --mode flood --tolerance 40
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageFilter


def load(path):
    return Image.open(path).convert('RGB')


def remove_flood(im, tolerance=48):
    """Corner-seeded flood fill: paint everything connected to the frame transparent."""
    im = im.convert('RGBA')
    w, h = im.size
    mask = Image.new('L', (w, h), 0)
    draw = ImageDraw.Draw(mask)
    # fill a 2px border ring so every edge seed is covered
    draw.rectangle([0, 0, w - 1, h - 1], outline=255, width=2)
    # seed each corner and walk inwards
    seeds = [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]
    px = im.load()
    touched = set(seeds)
    seen = {(x, y) for x, y in seeds}
    while touched:
        x, y = touched.pop()
        for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if not (0 <= nx < w and 0 <= ny < h) or (nx, ny) in seen:
                continue
            seen.add((nx, ny))
            pr, pg, pb, _ = px[x, y]
            cr, cg, cb, _ = px[nx, ny]
            if max(abs(pr - cr), abs(pg - cg), abs(pb - cb)) <= tolerance:
                touched.add((nx, ny))
    for x, y in seen:
        px[x, y] = (px[x, y][0], px[x, y][1], px[x, y][2], 0)
    return im


def remove_rembg(im):
    try:
        from rembg import remove, new_session
    except ImportError:
        sys.exit('rembg not installed. Use --mode flood, or:\n'
                 '  uv venv /home/luishowin/.venvs/rembg &&\n'
                 '  uv pip install -p /home/luishowin/.venvs/rembg/bin/python rembg onnxruntime pillow')
    return remove(im.convert('RGB'), session=new_session('u2net'))


def finish(im, size):
    """Trim to alpha bbox, center on a square canvas, defringe."""
    im = im.convert('RGBA')
    bbox = im.getbbox()
    if bbox is None:
        sys.exit('result is fully transparent — nothing left; try another mode')
    im = im.crop(bbox)
    # defringe: shrink alpha 1px, feather it back with a slight blur
    a = im.getchannel('A').point(lambda v: 0 if v < 128 else 255)
    a = a.filter(ImageFilter.MinFilter(3))
    a = a.filter(ImageFilter.GaussianBlur(0.6))
    im.putalpha(a)
    bbox = im.getbbox() or (0, 0, 1, 1)
    im = im.crop(bbox)

    side = max(im.width, im.height)
    margin = max(1, int(size * 0.04))
    scale = (size - 2 * margin) / side
    target = max(1, int(side * scale))
    im = im.resize((max(1, int(im.width * scale)), target), Image.Resampling.LANCZOS)

    canvas = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    canvas.paste(im, ((size - im.width) // 2, (size - im.height) // 2), im)
    return canvas


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('inputs', nargs='+', help='image files')
    ap.add_argument('-o', '--out-dir', default='.', help='output directory (default: cwd)')
    ap.add_argument('--size', type=int, default=256, help='square canvas size (default: 256)')
    ap.add_argument('--mode', choices=['auto', 'rembg', 'flood'], default='auto')
    ap.add_argument('--tolerance', type=int, default=48, help='flood-fill colour tolerance (default: 48)')
    args = ap.parse_args()

    os.makedirs(args.out_dir, exist_ok=True)
    mode = args.mode
    if mode == 'auto':
        try:
            import rembg  # noqa: F401
            mode = 'rembg'
        except ImportError:
            mode = 'flood'

    for path in args.inputs:
        stem = os.path.splitext(os.path.basename(path))[0]
        im = load(path)
        im = remove_rembg(im) if mode == 'rembg' else remove_flood(im, args.tolerance)
        out = finish(im, args.size)
        dest = os.path.join(args.out_dir, stem + '.png')
        out.save(dest)
        print(f'{mode:6s} {path} -> {dest} ({out.width}x{out.height} RGBA)')


if __name__ == '__main__':
    main()
