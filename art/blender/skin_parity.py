"""DESIGN A5.8 clarity parity of a skin sheet against its unit's sheet (art round W0, item 46).

  <venv>/bin/python art/blender/skin_parity.py <unit>.hd.json <unit>@<skin>.hd.json [--min-iou 0.85]

Checks: the same clips, frame counts, step durations, impact, hold and smear frames and anchor trackers (the
weapon's anchors within 0.5 lu); silhouette IoU >= 0.85 on every frame (feet aligned); IoU >= 0.85 inside a
12 lu disc around every anchor (the weapon keeps its type and size); team zones present wherever the unit has
them and at least 18% of the silhouette. Prints a JSON report; exits 1 when any check fails. render_all.py
runs the same check after rendering a skin and does not install one that fails.
Needs numpy and Pillow only (no Blender).
"""
import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("unit")
    ap.add_argument("skin")
    ap.add_argument("--min-iou", type=float, default=0.85)
    args = ap.parse_args()
    from ageborn_art import look2d
    res = look2d.parity(args.unit, args.skin, min_iou=args.min_iou)
    print(json.dumps(res, indent=1))
    if not res["ok"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
