"""Review sheets for the art-direction checks, built from the packed atlases only.

  <venv>/bin/python art/blender/review.py <out dir> [--before <v1 dir>]

Writes into <out dir>/review/:
  silhouettes.png   black-fill test at 1x (x3 nearest): idle, walk passing, attack extreme,
                    impact. The weapon must read as its own shape.
  mock_grey.png     the lane mockup in greyscale: unit edges must stay dark against hills.
  size32.png        every unit's idle at 32 px tall (A12 checklist item 7), x4 nearest.
  showcase.gif      all units in blue at DPR 2 playing idle, walk, attack, hit and death
                    (with the shared poof and stars) on real timing.
  before_after.png  the v1 lane crop above the new one (with --before).
"""
import argparse
import os
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageOps

sys.dont_write_bytecode = True
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import mockup  # noqa: E402
from ageborn_art.colors import hex_to_rgb  # noqa: E402
from ageborn_art.config import PREVIEW_BG, PX_PER_LU_1X, TEAM_COLORS  # noqa: E402

UNITS = ["bonker", "destrier_knight", "pulse_trooper"]
BLUE = TEAM_COLORS["blue"]


def _bg(size):
    return Image.new("RGBA", size, tuple(int(c * 255) for c in hex_to_rgb(PREVIEW_BG)) + (255,))


def silhouettes(atl, out):
    tiles = []
    for slug in UNITS:
        at = atl[slug]
        imp = at.meta["clips"]["attack"].get("impactFrame", 4)
        seq = at.meta["clips"]["attack"]["sequence"]
        picks = [("idle", 0), ("walk", 2), ("attack", max(0, seq.index(imp) - 2)), ("attack", seq.index(imp))]
        for clip, step in picks:
            img, _ = at.composed(clip, step, BLUE, 1)
            a = np.asarray(img)[..., 3]
            sil = np.zeros(a.shape + (4,), np.uint8)
            sil[..., 3] = a
            tiles.append(Image.fromarray(sil, "RGBA"))
    w = max(t.width for t in tiles)
    h = max(t.height for t in tiles)
    sheet = _bg((w * 4, h * 3))
    for i, t in enumerate(tiles):
        sheet.alpha_composite(t, ((i % 4) * w, (i // 4) * h))
    sheet.resize((sheet.width * 3, sheet.height * 3), Image.Resampling.NEAREST).convert("RGB") \
        .save(os.path.join(out, "silhouettes.png"))


def size32(atl, out):
    tiles = []
    for slug in UNITS:
        at = atl[slug]
        for tint in (BLUE, TEAM_COLORS["orange"]):
            img, _ = at.composed("idle", 0, tint, 2)
            box = img.getbbox()
            img = img.crop(box)
            k = 32 / img.height
            tiles.append(img.resize((max(1, round(img.width * k)), 32), Image.Resampling.BOX))
    W = sum(t.width + 8 for t in tiles) + 8
    sheet = _bg((W, 48))
    x = 8
    for t in tiles:
        sheet.alpha_composite(t, (x, 8))
        x += t.width + 8
    sheet.resize((sheet.width * 4, sheet.height * 4), Image.Resampling.NEAREST).convert("RGB") \
        .save(os.path.join(out, "size32.png"))


def mock_grey(out_dir, out):
    img = Image.open(os.path.join(out_dir, "lane_mockup_1280.png"))
    ImageOps.grayscale(img).crop((100, 180, 1180, 520)).save(os.path.join(out, "mock_grey.png"))


def before_after(before_dir, out_dir, out):
    a = Image.open(os.path.join(before_dir, "lane_mockup_1280.png")).crop((100, 200, 1180, 500))
    b = Image.open(os.path.join(out_dir, "lane_mockup_1280.png")).crop((100, 200, 1180, 500))
    k = 2
    sheet = Image.new("RGB", (a.width * k, (a.height + 24) * 2 * k), (30, 36, 48))
    sheet.paste(a.resize((a.width * k, a.height * k), Image.Resampling.NEAREST), (0, 24 * k))
    sheet.paste(b.resize((b.width * k, b.height * k), Image.Resampling.NEAREST), (0, (a.height + 48) * k))
    d = ImageDraw.Draw(sheet)
    d.text((10, 8), "BEFORE (v1)  -  true in-game size (DPR 1), shown 2x", fill="#FFFFFF")
    d.text((10, (a.height + 24) * k + 8), "AFTER (v2)  -  same scale", fill="#FFFFFF")
    sheet.save(os.path.join(out, "before_after.png"))


def showcase(atl, out, k=2):
    """idle x2, walk x2, attack, idle, hit, idle, die + FX, pause; every unit side by side."""
    program = [("idle", 2), ("walk", 2), ("attack", 1), ("idle", 1), ("hit", 1), ("idle", 1), ("die", 1)]
    lanes = []
    for slug in UNITS:
        at = atl[slug]
        t, events = 0, []
        for clip, n in program:
            d = at.meta["clips"][clip]["durationMs"]
            for _ in range(n):
                events.append((t, clip))
                t += d
        lanes.append((slug, events, t))
    total = max(t for _, _, t in lanes) + 900
    cuts = set(range(0, total, 20))
    W, H = 760, 300
    frames, durs = [], []
    ground = 250
    xs = {"bonker": 130, "pulse_trooper": 330, "destrier_knight": 560}
    prev = None
    for t in sorted(cuts):
        img = _bg((W, H))
        d = ImageDraw.Draw(img)
        d.rectangle((0, ground, W, H), fill="#8FA06A")
        d.rectangle((0, ground, W, ground + 4), fill="#A9B782")
        for slug, events, end in lanes:
            at = atl[slug]
            cur = None
            for st, clip in events:
                if t >= st:
                    cur = (st, clip)
            st, clip = cur
            tt = t - st
            x = xs[slug]
            fx_layers = []
            if clip == "die":
                c = at.meta["clips"]["die"]
                for spec in c["fx"]:
                    fx_slug = spec["id"].split(".")[1]
                    fat = atl.get(f"fx_{fx_slug}")
                    ft = tt - spec["atMs"]
                    if fat is None or ft < 0 or ft >= fat.meta["clips"]["play"]["durationMs"] * spec.get("loops", 1):
                        continue
                    spr, (ax, ay) = mockup._fx_sprite(atl, fx_slug, fat.step_at("play", ft, loop=True), slug, k)
                    fx_layers.append((spr, (int(x - ax), int(ground - ay))))
            if clip != "die" or tt < at.meta["clips"]["die"].get("hideUnitAtMs", 1e9):
                step = at.step_at(clip, tt, loop=False)
                spr, (ax, ay) = at.composed(clip, step, BLUE, k)
                layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
                layer.paste(spr, (int(round(x - ax)), int(round(ground - ay))), spr)
                img.alpha_composite(layer)
            for spr, pos in fx_layers:  # effects draw over their unit
                layer = Image.new("RGBA", img.size, (0, 0, 0, 0))
                layer.paste(spr, pos, spr)
                img.alpha_composite(layer)
        rgb = img.convert("RGB")
        if prev is not None and np.array_equal(np.asarray(rgb), np.asarray(prev)):
            durs[-1] += 20
            continue
        frames.append(rgb)
        durs.append(20)
        prev = rgb
    pal = frames[0].quantize(255, method=Image.Quantize.MEDIANCUT)
    frames = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    frames[0].save(os.path.join(out, "showcase.gif"), save_all=True, append_images=frames[1:],
                   duration=durs, loop=0, optimize=False)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out_dir")
    ap.add_argument("--before")
    args = ap.parse_args()
    out = os.path.join(args.out_dir, "review")
    os.makedirs(out, exist_ok=True)
    atl = mockup.load_atlases(args.out_dir, UNITS)
    silhouettes(atl, out)
    size32(atl, out)
    mock_grey(args.out_dir, out)
    if args.before:
        before_after(args.before, args.out_dir, out)
    showcase(atl, out)
    print(out)


if __name__ == "__main__":
    main()
