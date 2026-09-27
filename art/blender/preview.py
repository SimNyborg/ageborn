"""Fast look-dev: render a few frames of one unit into a single strip PNG.

  <venv>/bin/python art/blender/preview.py bonker idle:0 attack:3 attack:5 --out strip.png
The strip shows each frame at render size (2x) on top and at in-game size (1x) below,
in blue and orange.
"""
import argparse
import importlib
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("unit")
    ap.add_argument("frames", nargs="+", help="clip:frame ...")
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    from PIL import Image

    from ageborn_art import config as C
    from ageborn_art import render, scene, sheet
    from ageborn_art.rig import Rig

    mod = importlib.import_module(f"units.{args.unit}")
    scene.reset()
    scene.camera(*mod.CANVAS, mod.FEET)
    rig = Rig(mod.SLUG)
    mod.build(rig)
    clips = {c.name: c for c in mod.clips()}
    tmp = tempfile.mkdtemp()
    tiles = []
    for spec in args.frames:
        name, idx = spec.split(":")
        rig.apply(clips[name].pose(int(idx)))
        rig.set_pass(False)
        bp = os.path.join(tmp, f"{spec}.png".replace(":", "_"))
        render.render_to(bp)
        team = None
        if rig.has_visible_team():
            tp = bp.replace(".png", "_team.png")
            rig.set_pass(True)
            render.render_to(tp)
            team = sheet.load(tp)
        base = sheet.load(bp)
        tiles.append([sheet.to_image(sheet.composite(base, team, C.TEAM_COLORS[t]))
                      for t in ("blue", "orange")])
    w, h = mod.CANVAS
    bg = tuple(int(c * 255) for c in sheet.hex_to_rgb(C.PREVIEW_BG)) + (255,)
    out = Image.new("RGBA", (w * len(tiles), h + h // 2 + 4), bg)
    for i, (blue, orange) in enumerate(tiles):
        out.alpha_composite(blue, (i * w, 0))
        small = blue.resize((w // 2, h // 2), Image.Resampling.BOX)
        small_o = orange.resize((w // 2, h // 2), Image.Resampling.BOX)
        out.alpha_composite(small, (i * w, h + 4))
        out.alpha_composite(small_o, (i * w + w // 2, h + 4))
    out.save(args.out)
    print(args.out)


if __name__ == "__main__":
    main()
