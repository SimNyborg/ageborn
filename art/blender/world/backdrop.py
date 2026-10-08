"""Pre-rendered backdrop scenes and arena grounds (DESIGN A11 Split-age lane, A17.7; PLAN 2b).

Per age, one or more scenes (`scenes/<age>.py` exports `SCENES = {"classic": Scene(...), ...}`), each
rendered with the same toon shader and light as the units and bases:
  back - optional distant strip (snow peaks, a volcano, a nebula band), the haziest;
  far  - distant silhouettes, hazed toward the scene's horizon colour;
  mid  - the mid-ground, lightly hazed, with the 2D outline;
  props - sprites for ambient motion (loops, walkers, bobbing craft) packed into one atlas;
plus light points for night skies and a 320 x 180 thumbnail (format 2, PLAN 2b "Layer format v2").
The first five ages still ship their format 1 classic (`<age>/{far,mid}.webp` + `layers.json`) until
their round 3 re-render. Per arena, the ground (`scenes/grounds.py`, unchanged).

Layers keep DESIGN A11's low contrast: colours are desaturated and mixed toward the scene's horizon
colour after rendering. Geometry is authored in lane lu (x = 0 at the left gate, z up, y depth away from
the camera); the camera looks along +y, tilted down a little.

Outputs:
  public/art/backdrops/<age>/<scene>/{layers.json, back.webp, far.webp, mid.webp, props.webp, thumb.webp}
  public/art/backdrops/<age>/{far,mid}.webp + layers.json (format 1 classics)
  public/art/ground/<arena>.webp

Usage: <venv>/bin/python art/blender/world/backdrop.py --out <scratch> [--only bronze,industrial.classic,tar_pits]
       [--no-install]
  --only takes ages (every scene of the age), age.scene keys, or arena ids. Rerunning gives identical files.
"""
import argparse
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.path.dirname(HERE)
sys.path.insert(0, BLENDER)
sys.dont_write_bytecode = True

from world import scenes  # noqa: E402
from world.scenes.common import render_scene, thumb_from_installed  # noqa: E402
from world.scenes.grounds import ARENAS, render_ground  # noqa: E402


def wanted(only, age, sid):
    return not only or age in only or f"{age}.{sid}" in only


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--no-install", action="store_true")
    ap.add_argument("--thumbs", action="store_true", help="only the format 1 classics' thumbnails, from their installed strips")
    args = ap.parse_args()
    only = [s for s in args.only.split(",") if s]
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    report = []
    if args.thumbs:
        for age in scenes.AGES:
            for sid, sc in scenes.load(age).items():
                if sc.version == 1 and sc.sky and wanted(only, age, sid):
                    report.append({"scene": sc.key, "thumb": thumb_from_installed(sc, out, install=not args.no_install)})
        print(json.dumps(report))
        return
    for age in scenes.AGES:
        for sid, sc in scenes.load(age).items():
            if not wanted(only, age, sid):
                continue
            t0 = time.time()
            r = render_scene(sc, out, install=not args.no_install)
            r["seconds"] = round(time.time() - t0, 1)
            report.append(r)
    for arena in ARENAS:
        if only and arena not in only:
            continue
        report.append({"ground": arena, "size": render_ground(arena, out, install=not args.no_install)})
    print(json.dumps(report))


if __name__ == "__main__":
    main()
