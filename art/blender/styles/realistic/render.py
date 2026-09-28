"""Realistic-miniature style: render units, previews, sheets.

  python render.py preview bonker idle:0 walk:3 attack:5 --out strip.png
  python render.py unit bonker [--out DIR] [--samples 40]
"""
import argparse
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "units"))

from lib import pipe  # noqa: E402

OUT = "/tmp/claude-0/-home-user-ageborn/e9e6071d-3409-58a6-a28d-0aba492052fd/scratchpad/styles/realistic"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("cmd")
    ap.add_argument("slug")
    ap.add_argument("frames", nargs="*")
    ap.add_argument("--out", default=OUT)
    ap.add_argument("--samples", type=int, default=40)
    ap.add_argument("--clips", default=None)
    a = ap.parse_args()
    unit = importlib.import_module(a.slug)
    if a.cmd == "preview":
        jobs = [(f.split(":")[0], int(f.split(":")[1])) for f in a.frames]
        r = pipe.run_unit(unit, os.path.join(a.out, "_look"), samples=a.samples, preview_only=jobs)
        png = os.path.join(a.out, "_look", f"{a.slug}_strip.png")
        pipe.strip(r["tmp"], r["jobs"], r["feet_px"], png)
        print("wrote", png)
    elif a.cmd == "unit":
        import finish
        clips = a.clips.split(",") if a.clips else None
        r = pipe.run_unit(unit, a.out, samples=a.samples, clips=clips)
        finish.unit_outputs(unit, r, a.out)


if __name__ == "__main__":
    main()
