"""Render every unit's sprite sheet, previews and the lane mockup.

Usage (from the repo root, with the bpy venv):
  <venv>/bin/python art/blender/render_all.py --out <output dir> [--units bonker,pulse_trooper]
"""
import argparse
import importlib
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

UNITS = ["bonker", "destrier_knight", "pulse_trooper"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True, help="output directory for sheets and previews")
    ap.add_argument("--units", default=",".join(UNITS))
    ap.add_argument("--no-mockup", action="store_true")
    ap.add_argument("--scale", type=float, default=2.0, help="sheet scale vs 1280 px (default 2)")
    args = ap.parse_args()
    from ageborn_art import config, pipeline  # imports bpy
    config.set_render_scale(args.scale)

    out = os.path.abspath(args.out)
    frames = os.path.join(out, "_frames")
    os.makedirs(out, exist_ok=True)
    t0 = time.time()
    all_stats = []
    for slug in args.units.split(","):
        print(f"[{slug}]", flush=True)
        mod = importlib.import_module(f"units.{slug}")
        all_stats.append(pipeline.run_unit(mod, out, frames))
    if not args.no_mockup:
        import mockup
        mockup.make(out, [s["slug"] for s in all_stats] if args.units != ",".join(UNITS) else UNITS)
    with open(os.path.join(out, "stats.json"), "w") as fh:
        json.dump({"units": all_stats, "seconds": round(time.time() - t0, 1)}, fh, indent=1)
    print(f"done in {time.time() - t0:.1f} s -> {out}")


if __name__ == "__main__":
    main()
