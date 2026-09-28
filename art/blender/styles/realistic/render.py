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
    ap.add_argument("--samples", type=int, default=24)
    ap.add_argument("--clips", default=None)
    ap.add_argument("--secs", default=None)
    a = ap.parse_args()
    unit = importlib.import_module(a.slug)
    if a.cmd == "preview":
        jobs = [(f.split(":")[0], int(f.split(":")[1])) for f in a.frames]
        r = pipe.run_unit(unit, os.path.join(a.out, "_look"), samples=a.samples, preview_only=jobs)
        png = os.path.join(a.out, "_look", f"{a.slug}_strip.png")
        pipe.strip(r["tmp"], r["jobs"], r["feet_px"], png, fx=r["fx"])
        print("wrote", png)
    elif a.cmd == "refinish":
        # rebuild sheets/GIFs from the frames already rendered (no Blender render)
        import math
        import finish
        from lib import core as C
        pxlu = C.PX_PER_LU_1X * C.RENDER_MULT
        wpx = int(math.ceil(unit.CANVAS[0] * pxlu / 6) * 6)
        hpx = int(math.ceil(unit.CANVAS[1] * pxlu / 6) * 6)
        clips = unit.clips()
        jobs = [(c.name, i) for c in clips for i in range(len(c.times))]
        r = dict(jobs=jobs, tmp=os.path.join(a.out, "_frames", unit.SLUG), secs=float(a.secs or 0),
                 feet_px=(unit.FEET[0] * pxlu, hpx - unit.FEET[1] * pxlu), size=(wpx, hpx), clips=clips,
                 fx={(c.name, i): c.fx.get(i) for c in clips for i in range(len(c.times))})
        finish.unit_outputs(unit, r, a.out)
    elif a.cmd == "unit":
        import finish
        clips = a.clips.split(",") if a.clips else None
        r = pipe.run_unit(unit, a.out, samples=a.samples, clips=clips)
        finish.unit_outputs(unit, r, a.out)


if __name__ == "__main__":
    main()
