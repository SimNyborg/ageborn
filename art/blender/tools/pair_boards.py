"""Before/after boards from two capture folders of the same scenario (item 47 audit 7.3).

    <venv>/bin/python art/blender/tools/pair_boards.py <before dir> <after dir> <out dir> --frames 2,3
        [--name stone_desktop] [--crop 640x300] [--scale 3]

For each frame index (the `tools/art/battleCapture.mjs` file number): `<name>_full_<i>.png`, the two frames before
above after at full resolution, and `<name>_x<scale>_<i>.png`, a crop of the fight enlarged nearest (before above
after), centred on the median of the pixels that differ between the two (the models; the scene is the same).
"""
import argparse
import os

import numpy as np
from PIL import Image, ImageDraw

ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
ap.add_argument("before")
ap.add_argument("after")
ap.add_argument("out")
ap.add_argument("--frames", required=True, help="file numbers, comma separated")
ap.add_argument("--name", default=None, help="default: the after folder's name")
ap.add_argument("--crop", default="640x300", help="crop size in device px")
ap.add_argument("--scale", type=int, default=3)
ap.add_argument("--labels", default="before (main),after (this branch)")
a = ap.parse_args()
name = a.name or os.path.basename(os.path.normpath(a.after))
cw, ch = (int(v) for v in a.crop.split("x"))
labels = a.labels.split(",")
os.makedirs(a.out, exist_ok=True)


def stacked(top, bottom):
    out = Image.new("RGB", (top.width, top.height * 2 + 10), (255, 255, 255))
    out.paste(top, (0, 0))
    out.paste(bottom, (0, top.height + 10))
    d = ImageDraw.Draw(out)
    for k, t in enumerate(labels):
        y = k * (top.height + 10)
        d.rectangle((0, y, 8 + 7 * len(t), y + 22), fill=(0, 0, 0))
        d.text((6, y + 5), t, fill=(255, 255, 255))
    return out


for i in (int(v) for v in a.frames.split(",")):
    A = Image.open(os.path.join(a.before, f"{i:04d}.png")).convert("RGB")
    B = Image.open(os.path.join(a.after, f"{i:04d}.png")).convert("RGB")
    stacked(A, B).save(os.path.join(a.out, f"{name}_full_{i}.png"))
    diff = np.abs(np.asarray(A, np.int16) - np.asarray(B, np.int16)).max(-1) > 6
    ys, xs = np.nonzero(diff)
    if len(xs) == 0:
        print(name, i, "identical")
        continue
    cx, cy = int(np.median(xs)), int(np.median(ys))
    w, h = min(cw, A.width), min(ch, A.height)
    x0, y0 = max(0, min(A.width - w, cx - w // 2)), max(0, min(A.height - h, cy - h // 2))

    def crop(im):
        return im.crop((x0, y0, x0 + w, y0 + h)).resize((w * a.scale, h * a.scale), Image.NEAREST)

    stacked(crop(A), crop(B)).save(os.path.join(a.out, f"{name}_x{a.scale}_{i}.png"))
    print(name, i, (x0, y0, w, h))
