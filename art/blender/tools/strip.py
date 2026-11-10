"""Frame strips of a unit sheet at game scale (item 47 audit 7.3: "a short frame strip of every clip").

    <venv>/bin/python art/blender/tools/strip.py <sheet>.hd.json <out.png> [clip,clip,...] [--zoom 2]
        [--tint blue|orange] [--under mount]

One row per clip with its unique frames, drawn as the game draws them: the team layer tinted under the base, then
the GPU's bilinear draw to game scale (1.83 px/lu), enlarged `zoom` x nearest, all rows in one crop box (the union
of the silhouettes) so the motion lines up. Reads the core sheet and its extras sheet (`.x.hd.json`: the aimed
throws, attack_b, ...); the clips default to every clip of both, aimed variants with their aimDeg in the row label.
World sheets (turrets, bases, forts, decorations) work the same from their 1x sheet; `--under CLIP` draws that clip's
first frame beneath every tile (a turret's head clips on its mount, a decoration's loop on its body).
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
sys.dont_write_bytecode = True
from ageborn_art import look2d  # noqa: E402

ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
ap.add_argument("sheet")
ap.add_argument("out")
ap.add_argument("clips", nargs="?", default="")
ap.add_argument("--zoom", type=int, default=2)
ap.add_argument("--tint", choices=("blue", "orange"), default="blue")
ap.add_argument("--under", default=None, help="a clip whose first frame is drawn beneath every tile")
a = ap.parse_args()
tint = look2d.TEAM_BLUE if a.tint == "blue" else (0xF2 / 255, 0x8A / 255, 0x1E / 255)
fr, d = look2d.frames_of(a.sheet)
xp = a.sheet.replace(".hd.json", ".x.hd.json")
meta = dict(d["meta"]["ageborn"]["clips"])
if os.path.exists(xp):
    xf, xd = look2d.frames_of(xp)
    fr.update(xf)
    meta.update(xd["meta"]["ageborn"]["clips"])
slug = d["meta"]["ageborn"]["visualId"].split(".", 1)[1]
k = look2d.GAME_PX_PER_LU / d["meta"]["ageborn"]["pxPerLu"]
clips = a.clips.split(",") if a.clips else list(meta)
bg = np.array([0.79, 0.86, 0.90], np.float32)


def names(clip):
    return [n for n in (f"{slug}_{clip}_{i:02d}" for i in range(meta[clip]["frames"])) if n in fr]


under = f"{slug}_{a.under}_00" if a.under else None
if under is not None and under not in fr:
    raise SystemExit(f"no frame {under}")


def alpha(name):
    return np.maximum(fr[name][..., 3], fr[name + "_team"][..., 3] if name + "_team" in fr else 0)


box = None
for clip in clips:
    for name in names(clip):
        al = alpha(name) if under is None else np.maximum(alpha(name), alpha(under))
        ys, xs = np.nonzero(al > 0.02)
        b = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
cx0, cy0, cx1, cy1 = [int(v * k) for v in box]
rows = []
for clip in clips:
    tiles = []
    for name in names(clip):
        arr = look2d.composite(fr[name], fr.get(name + "_team"), tint)
        if under is not None and name != under:
            arr = look2d.over(arr, look2d.composite(fr[under], fr.get(under + "_team"), tint))
        g = look2d.gpu_bilinear(arr, k)
        al = g[..., 3:4]
        rgb = g[..., :3] * al + bg * (1 - al)
        im = Image.fromarray((np.clip(rgb, 0, 1) * 255 + 0.5).astype(np.uint8))
        im = im.crop((max(0, cx0 - 3), max(0, cy0 - 3), cx1 + 3, cy1 + 3))
        tiles.append(im.resize((im.width * a.zoom, im.height * a.zoom), Image.NEAREST))
    if not tiles:
        continue
    row = Image.new("RGB", (sum(t.width for t in tiles) + 4 * len(tiles) + 150, max(t.height for t in tiles)), (255, 255, 255))
    aim = meta[clip].get("aimDeg")
    ImageDraw.Draw(row).text((4, 4), clip + (f"  aimDeg {aim}" if aim is not None else ""), fill=(0, 0, 0))
    x = 150
    for t in tiles:
        row.paste(t, (x, 0))
        x += t.width + 4
    rows.append(row)
board = Image.new("RGB", (max(r.width for r in rows), sum(r.height + 6 for r in rows)), (255, 255, 255))
y = 0
for r in rows:
    board.paste(r, (0, y))
    y += r.height + 6
os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
board.save(a.out)
print(a.out, board.size)
