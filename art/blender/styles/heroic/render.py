"""Render heroic units end to end.

  python art/blender/styles/heroic/render.py --out <dir> [--units bonker,pulse_trooper] [--only attack]
"""
import argparse
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(os.path.dirname(HERE)))  # art/blender
sys.path.insert(0, HERE)

from hero import pipeline as P  # noqa: E402
from look import load_unit  # noqa: E402

UNITS = ["bonker", "destrier_knight", "pulse_trooper"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--units", default=",".join(UNITS))
    ap.add_argument("--only", default=None)
    a = ap.parse_args()
    only = a.only.split(",") if a.only else None
    for slug in a.units.split(","):
        t = time.time()
        print(f"== {slug}", flush=True)
        P.run_unit(load_unit(slug), os.path.join(a.out, slug), log=lambda m: print(m, flush=True), only=only)
        print(f"== {slug} done in {time.time() - t:.0f} s", flush=True)


if __name__ == "__main__":
    main()
