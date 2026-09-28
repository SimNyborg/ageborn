"""Render the Industrial Age world art (base.industrial and its four turrets) and install it into
public/art/bases/industrial.{png,json} and public/art/turrets/industrial/<slug>.{png,json}.

The age is not in render_world.AGES yet (the new ages are not wired into the game), so this driver
renders it on its own with exactly the render_world settings (unit v3 look, clips not retimed,
compact JSON on install). Once the age is added to render_world.AGES, `render_world.py` picks up
base_industrial.py and turrets_industrial.py unchanged.

Usage (from the repository root, with the bpy venv):
  <venv>/bin/python art/blender/world/render_industrial.py --out <scratch dir> [--only base.industrial]
      [--no-install] [--no-previews]
"""
import argparse
import importlib
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.path.dirname(HERE)
sys.path.insert(0, BLENDER)
sys.dont_write_bytecode = True

AGE = "industrial"


def targets():
    out = [(f"base.{AGE}", importlib.import_module(f"world.base_{AGE}").MODULE)]
    for mod in importlib.import_module(f"world.turrets_{AGE}").TURRETS:
        out.append((mod.VISUAL_ID, mod))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--no-previews", action="store_true")
    args = ap.parse_args()
    from ageborn_art import config, pipeline, retime
    from world.render_world import install
    retime.retime = lambda mod, clips: clips
    only = [s for s in args.only.split(",") if s]
    out = os.path.abspath(args.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    stats = []
    for vid, mod in targets():
        if only and vid not in only:
            continue
        print(f"[{vid}]", flush=True)
        sub = os.path.join(out, mod.AGE)
        os.makedirs(sub, exist_ok=True)
        if not hasattr(mod, "OUTER_OUTLINE"):
            mod.OUTER_OUTLINE = config.UNIT_OUTLINE_V3
        stats.append(pipeline.run_unit(mod, sub, frames, previews=not args.no_previews, v3=True))
        if not args.no_install:
            print("  ->", install(mod, sub), flush=True)
    with open(os.path.join(out, "stats.json"), "w") as fh:
        json.dump({"items": stats, "seconds": round(time.time() - t0, 1)}, fh, indent=1)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
