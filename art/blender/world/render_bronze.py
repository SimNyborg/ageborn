"""Render the Bronze Age art (docs/design-lane-ages.md A17.9, A17.12) and install it in public/art.

The Bronze Age is not in render_all.AGE_OF or render_world.AGES yet (the age is not wired into the
game); this driver renders it with exactly the same pipeline settings, without touching them:

  units   the v3 unit sheets (retimed clips, `<slug>.json` at 1.23 px/lu + `<slug>.hd.json` at
          2.46 px/lu; Legendaries 1.03 / 2.05) -> public/art/units/bronze/
  world   turrets and the base (unit v3 look, clips not retimed) -> public/art/turrets/bronze/,
          public/art/bases/bronze.{png,json}

Usage (from the repository root, with the bpy venv; run the two parts as separate processes, since
the world part switches clip retiming off the way render_world.py does):

  <venv>/bin/python art/blender/world/render_bronze.py units --out <dir> [--only hoplite,scorpion]
  <venv>/bin/python art/blender/world/render_bronze.py world --out <dir> [--only base.bronze]
  <venv>/bin/python art/blender/gen_portraits.py <dir>/units hoplite,javelineer,...   # card stills

Add `--no-install` to keep everything in <dir>.
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

AGE = "bronze"
UNITS = ["hoplite", "javelineer", "war_chariot", "phalangite", "standard_bearer", "scorpion", "bronze_colossus"]


def run_units(out, only, install, previews):
    from ageborn_art import pipeline
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    stats = []
    for slug in UNITS:
        if only and slug not in only:
            continue
        print(f"[{slug}]", flush=True)
        mod = importlib.import_module(f"units.{slug}")
        stats.append(pipeline.run_unit(mod, out, frames, previews=previews, v3=True))
        if install:
            dst = os.path.join(REPO, "public", "art", "units", AGE)
            os.makedirs(dst, exist_ok=True)
            for f in (f"{slug}.json", f"{slug}.png", f"{slug}.hd.json", f"{slug}.hd.png"):
                shutil.copyfile(os.path.join(out, f), os.path.join(dst, f))
            print(f"  installed {AGE}/{slug}", flush=True)
    return stats


def run_world(out, only, install, previews):
    from ageborn_art import config, pipeline, retime
    from world import render_world
    retime.retime = lambda mod, clips: clips      # world clips keep their authored timing
    items = []
    base = importlib.import_module(f"world.base_{AGE}")
    items.append((f"base.{AGE}", base.MODULE))
    tur = importlib.import_module(f"world.turrets_{AGE}")
    items += [(m.VISUAL_ID, m) for m in tur.TURRETS]
    frames = os.path.join(out, "_frames")
    stats = []
    for vid, mod in items:
        if only and vid not in only:
            continue
        print(f"[{vid}]", flush=True)
        sub = os.path.join(out, mod.AGE)
        os.makedirs(sub, exist_ok=True)
        if not hasattr(mod, "OUTER_OUTLINE"):
            mod.OUTER_OUTLINE = config.UNIT_OUTLINE_V3
        stats.append(pipeline.run_unit(mod, sub, frames, previews=previews, v3=True))
        if install:
            print("  ->", render_world.install(mod, sub), flush=True)
    return stats


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("part", choices=["units", "world"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--no-previews", action="store_true")
    args = ap.parse_args()
    only = [s for s in args.only.split(",") if s]
    out = os.path.abspath(os.path.join(args.out, args.part))
    t0 = time.time()
    fn = run_units if args.part == "units" else run_world
    stats = fn(out, only, not args.no_install, not args.no_previews)
    with open(os.path.join(out, "stats.json"), "w") as fh:
        json.dump({"items": stats, "seconds": round(time.time() - t0, 1)}, fh, indent=1)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
