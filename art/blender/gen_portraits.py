"""Card portrait stills from the rendered unit frames (art director review fix 10).

For each unit, the first idle frame of the @2x render (outlined, team layer separate) is cropped
to a three-quarter bust (tall units) or the whole body (wide units), padded to a square and
scaled to 256 px. Writes `public/art/portraits/<slug>.png` (base) and `<slug>_team.png` (grey
team layer; the game tints it with the side's colour, like the lane sprites). Palette PNGs.

  <venv>/bin/python art/blender/gen_portraits.py <render out dir> [slug,slug,...]
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DST = os.path.join(HERE, "..", "..", "public", "art", "portraits")
SIZE = 256


def load(p):
    return np.asarray(Image.open(p).convert("RGBA"), dtype=np.float32) / 255.0


def resize(arr, size):
    """Premultiplied Lanczos resize to size x size."""
    pm = arr.copy()
    pm[..., :3] *= pm[..., 3:4]
    chans = [np.asarray(Image.fromarray(pm[..., i]).resize((size, size), Image.LANCZOS)) for i in range(4)]
    out = np.clip(np.stack(chans, -1), 0, 1)
    a = out[..., 3:4]
    out[..., :3] = np.where(a > 1e-4, out[..., :3] / np.maximum(a, 1e-4), 0)
    return np.clip(out, 0, 1)


def save(arr, path):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    im.quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(path, optimize=True)


def portrait(frames_dir, slug):
    fin = os.path.join(frames_dir, slug, "final")
    base = load(os.path.join(fin, "idle_00.png"))
    tp = os.path.join(fin, "idle_00_team.png")
    team = load(tp) if os.path.exists(tp) else np.zeros_like(base)
    a = np.maximum(base[..., 3], team[..., 3])
    ys, xs = np.nonzero(a > 0.05)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    w, h = x1 - x0, y1 - y0
    if h > w * 1.15:   # tall: a bust (head, torso and the held weapon)
        side = max(w, int(h * 0.66))
        cx = (x0 + x1) / 2
        sx0, sy0 = int(cx - side / 2), y0
    else:              # wide (mounts, vehicles, beasts): the whole body
        side = max(w, h)
        sx0, sy0 = int((x0 + x1) / 2 - side / 2), int((y0 + y1) / 2 - side / 2)
    pad = int(side * 0.05)
    side += 2 * pad
    sx0 -= pad
    sy0 -= pad
    H, W = a.shape

    def crop(arr):
        out = np.zeros((side, side, 4), np.float32)
        ax0, ay0 = max(0, sx0), max(0, sy0)
        ax1, ay1 = min(W, sx0 + side), min(H, sy0 + side)
        out[ay0 - sy0:ay1 - sy0, ax0 - sx0:ax1 - sx0] = arr[ay0:ay1, ax0:ax1]
        return out

    os.makedirs(DST, exist_ok=True)
    save(resize(crop(base), SIZE), os.path.join(DST, f"{slug}.png"))
    if team[..., 3].max() > 0:
        save(resize(crop(team), SIZE), os.path.join(DST, f"{slug}_team.png"))
    print("portrait", slug, flush=True)


def main():
    out = sys.argv[1]
    frames = os.path.join(out, "_frames")
    slugs = sys.argv[2].split(",") if len(sys.argv) > 2 else sorted(
        d for d in os.listdir(frames) if not d.startswith("fx_") and os.path.isdir(os.path.join(frames, d, "final")))
    for s in slugs:
        portrait(frames, s)


if __name__ == "__main__":
    main()
