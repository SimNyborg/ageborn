"""Render the Industrial Age unit sheets (docs/design-lane-ages.md A17.10) with the shipping v3
settings and install them into public/art/units/industrial/.

The age is not in render_all.AGE_OF yet (the new ages are not wired into the game), so this
driver renders and installs them on its own; the modules are ordinary unit modules, so
`render_all.py --units riveter,... --v3` also works once the age is added there.

Usage (from the repository root, with the bpy venv):
  <venv>/bin/python art/blender/units/render_industrial.py --out <scratch dir> [--units riveter,sapper]
      [--no-install] [--previews]
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

AGE = "industrial"
UNITS = ["riveter", "carbineer", "steam_golem", "harpoon_gunner", "flare_spotter", "sapper", "land_dreadnought"]


def install(slug, out):
    dst = os.path.join(REPO, "public", "art", "units", AGE)
    os.makedirs(dst, exist_ok=True)
    for f in (f"{slug}.json", f"{slug}.png", f"{slug}.hd.json", f"{slug}.hd.png"):
        shutil.copyfile(os.path.join(out, f), os.path.join(dst, f))
    print(f"  installed {AGE}/{slug}", flush=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--units", default=",".join(UNITS))
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--previews", action="store_true", help="GIFs, contact sheets and team breakdowns")
    args = ap.parse_args()
    from ageborn_art import pipeline
    out = os.path.abspath(args.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    stats = []
    for slug in args.units.split(","):
        print(f"[{slug}]", flush=True)
        mod = importlib.import_module(f"units.{slug}")
        stats.append(pipeline.run_unit(mod, out, frames, previews=args.previews, v3=True))
        if not args.no_install:
            install(slug, out)
    with open(os.path.join(out, "stats.json"), "w") as fh:
        json.dump({"units": stats, "seconds": round(time.time() - t0, 1)}, fh, indent=1)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
