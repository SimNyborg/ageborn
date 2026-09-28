"""Fast look-dev: render a few frames of a heroic unit into one strip (HD on top, true phone size
below, blue team). No follow-through (rest springs), no atlas.

  python art/blender/styles/heroic/look.py bonker idle:0 attack:3 attack:6 --out strip.png
"""
import argparse
import importlib
import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))  # art/blender
sys.path.insert(0, HERE)

from PIL import Image  # noqa: E402

from ageborn_art import config as C  # noqa: E402
from ageborn_art import sheet  # noqa: E402
from hero import config as H  # noqa: E402
from hero import pipeline as P  # noqa: E402
from hero import render as R  # noqa: E402
from hero.rig import HeroRig  # noqa: E402


def load_unit(slug):
    spec = importlib.util.spec_from_file_location(f"hero_unit_{slug}", os.path.join(HERE, "units", f"{slug}.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("unit")
    ap.add_argument("frames", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--follow", action="store_true", help="solve follow-through for the clips")
    a = ap.parse_args()
    mod = load_unit(a.unit)
    canvas, feet = P.setup_scene(mod)
    rig = HeroRig(mod.SLUG, yaw=mod.YAW_DEG)
    mod.build(rig)
    rig.finish_build()
    clips = {c.name: c for c in mod.clips()}
    tmp = os.path.join(os.path.dirname(os.path.abspath(a.out)), "_look")
    os.makedirs(tmp, exist_ok=True)
    tiles = []
    cache = {}
    for spec in a.frames:
        name, idx = spec.split(":")
        clip, idx = clips[name], int(idx)
        if name not in cache:
            poses = [clip.pose(i) for i in range(clip.frames)]
            if a.follow:
                poses = R.add_follow_through(rig, clip, poses)
            cache[name] = poses
        trails = None
        spec_t = getattr(clip, "trails", {}) or {}
        if getattr(mod, "TRAIL", None) and idx in spec_t:
            ts = spec_t[idx]
            specs = mod.TRAIL if isinstance(mod.TRAIL, list) else [mod.TRAIL]
            trails = []
            for sp in specs:
                s = dict(sp, start=ts.get("start", sp.get("start", 0.0)))
                trails.append(R._ribbon(rig, s, cache[name][ts["from"]], cache[name][idx], "fringe"))
                trails.append(R._ribbon(rig, s, cache[name][ts["from"]], cache[name][idx], "core"))
        fr = R.render_frame(rig, cache[name][idx], os.path.join(tmp, f"{name}_{idx:02d}.png"), trails)
        b, t = P.finish(fr)
        tiles.append(sheet.to_image(P.composite(b, t, H.TEAM_COLORS["blue"])))
    boxes = [sheet.bbox(t) for t in tiles]
    x0, y0 = min(b[0] for b in boxes) - 6, min(b[1] for b in boxes) - 6
    x1, y1 = max(b[2] for b in boxes) + 6, max(b[3] for b in boxes) + 6
    tiles = [t.crop((x0, y0, x1, y1)) for t in tiles]
    w, h = tiles[0].size
    k = H.PHONE_PX_PER_LU / C.PX_PER_LU
    sw, sh = round(w * k), round(h * k)
    bg = (201, 220, 230, 255)
    out = Image.new("RGBA", (w * len(tiles), h + sh * 2 + 8), bg)
    for i, t in enumerate(tiles):
        out.alpha_composite(t, (i * w, 0))
        small = t.resize((sw, sh), Image.Resampling.BOX)
        out.alpha_composite(small, (i * w, h + 4))
        # nearest-neighbour 2x of the phone-size sprite, to judge it pixel by pixel
        out.alpha_composite(small.resize((sw * 2, sh * 2), Image.Resampling.NEAREST), (i * w + sw + 6, h + 4))
    out.convert("RGB").save(a.out)
    print(a.out, out.size)


if __name__ == "__main__":
    main()
