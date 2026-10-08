"""Render the bases' collapse kits (world/base_collapse.py) and install them in public/art/bases.

Usage (from the repository root, with the bpy venv):
  <venv>/bin/python art/blender/world/render_collapse.py --out <scratch dir> [--only stone,medieval] [--no-install]
  # a base skin model's own kit (PLAN 2c), installed as public/art/bases/skins/<skin>.collapse.{png,json}
  <venv>/bin/python art/blender/world/render_collapse.py --out <scratch dir> --skins rose_keep

Every kit goes through ageborn_art.pipeline.run_unit with the world settings (the unit v3 look,
clips not retimed): frames render at 2.46 px/lu and are downsampled to the shipped 1.23 px/lu sheet
`public/art/bases/<age>.collapse.{png,json}` (compact JSON). The game loads a kit lazily, once that
age's base is badly damaged, and lists it in the manifest (`WORLD_BASE_COLLAPSE_KITS`).
"""
import argparse
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

AGES = ["stone", "bronze", "medieval", "gunpowder", "industrial", "modern", "future", "cosmic"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--previews", action="store_true")
    ap.add_argument("--skins", default="", help="base skin models' own kits (world/base_collapse.py SKIN_KITS)")
    args = ap.parse_args()
    from ageborn_art import pipeline, retime
    from world.base_collapse import kit_module, skin_kit_module
    retime.retime = lambda mod, clips: clips
    only = [s for s in args.only.split(",") if s]
    skins = [s for s in args.skins.split(",") if s]
    out = os.path.abspath(args.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    stats = []
    todo = [(f"{s} collapse kit", skin_kit_module(s), True) for s in skins]
    if not skins:
        todo = [(f"{age} collapse kit", None, False) for age in AGES if not only or age in only]
    for label, skin_mod, is_skin in todo:
        print(f"[{label}]", flush=True)
        mod = skin_mod if is_skin else kit_module(label.split(" ")[0])
        age = mod.AGE
        # a slightly lighter outer line than the units: debris pieces are small
        mod.OUTER_OUTLINE = (1.9, 0.5, 0.45)
        sub = os.path.join(out, age)
        os.makedirs(sub, exist_ok=True)
        stats.append(pipeline.run_unit(mod, sub, frames, previews=args.previews, v3=True))
        if not args.no_install:
            dest = os.path.join(REPO, "public", "art", "bases", "skins") if is_skin else os.path.join(REPO, "public", "art", "bases")
            for ext in ("png", "json"):
                shutil.copyfile(os.path.join(sub, f"{mod.FILE_SLUG}.{ext}"), os.path.join(dest, f"{mod.FILE_SLUG}.{ext}"))
            p = os.path.join(dest, f"{mod.FILE_SLUG}.json")
            with open(p) as fh:
                data = json.load(fh)
            with open(p, "w") as fh:
                json.dump(data, fh, separators=(",", ":"))
            print("  ->", dest, flush=True)
    with open(os.path.join(out, "stats.json"), "w") as fh:
        json.dump({"items": stats, "seconds": round(time.time() - t0, 1)}, fh, indent=1)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
