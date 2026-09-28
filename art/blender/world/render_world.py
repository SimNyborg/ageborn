"""Render the world art (turrets and bases) to sprite sheets and install them in public/art.

Usage (from the repository root, with the bpy venv):
  <venv>/bin/python art/blender/world/render_world.py --out <scratch dir> [--only base.stone,turret.rock_tosser]
      [--scale 1.5] [--no-install] [--no-previews]

Every visual goes through ageborn_art.pipeline.run_unit (the same shading, outline, team layer
and atlas packing as the units). Shipping files (256-colour PNG + Pixi JSON) are copied to
public/art/bases/<age>.{png,json} and public/art/turrets/<age>/<slug>.{png,json}; previews,
contact sheets and stats stay in --out.
"""
import argparse
import importlib
import json
import os
import shutil
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(BLENDER))
sys.path.insert(0, BLENDER)
sys.dont_write_bytecode = True

AGES = ["stone", "medieval", "gunpowder", "modern", "future"]


def targets():
    out = []
    for age in AGES:
        try:
            m = importlib.import_module(f"world.base_{age}")
            out.append((f"base.{age}", m.MODULE))
        except ModuleNotFoundError as e:
            if e.name != f"world.base_{age}":
                raise
        try:
            t = importlib.import_module(f"world.turrets_{age}")
            for mod in t.TURRETS:
                out.append((mod.VISUAL_ID, mod))
        except ModuleNotFoundError as e:
            if e.name != f"world.turrets_{age}":
                raise
    return out


def install(mod, out_dir):
    kind = mod.EXTRA_META["kind"]
    dest = os.path.join(REPO, "public", "art", "bases") if kind == "base" \
        else os.path.join(REPO, "public", "art", "turrets", mod.AGE)
    os.makedirs(dest, exist_ok=True)
    for ext in ("png", "json"):
        shutil.copyfile(os.path.join(out_dir, f"{mod.FILE_SLUG}.{ext}"), os.path.join(dest, f"{mod.FILE_SLUG}.{ext}"))
    # compact the JSON (the pipeline writes it indented)
    p = os.path.join(dest, f"{mod.FILE_SLUG}.json")
    with open(p) as fh:
        data = json.load(fh)
    with open(p, "w") as fh:
        json.dump(data, fh, separators=(",", ":"))
    return dest


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--scale", type=float, default=1.5)
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--no-previews", action="store_true")
    args = ap.parse_args()
    from ageborn_art import config, pipeline
    config.set_render_scale(args.scale)
    only = [s for s in args.only.split(",") if s]
    out = os.path.abspath(args.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    stats = []
    for vid, mod in targets():
        if only and vid not in only and not any(vid.startswith(o.rstrip("*")) for o in only if o.endswith("*")):
            continue
        print(f"[{vid}]", flush=True)
        sub = os.path.join(out, mod.AGE)
        os.makedirs(sub, exist_ok=True)
        s = pipeline.run_unit(mod, sub, frames, previews=not args.no_previews)
        stats.append(s)
        if not args.no_install:
            print("  ->", install(mod, sub), flush=True)
    with open(os.path.join(out, "stats.json"), "w") as fh:
        json.dump({"items": stats, "seconds": round(time.time() - t0, 1)}, fh, indent=1)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
