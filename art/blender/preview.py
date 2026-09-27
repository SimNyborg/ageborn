"""Fast look-dev: render a few frames of one unit into a single strip PNG.

  <venv>/bin/python art/blender/preview.py bonker idle:0 attack:2 attack:4 --out strip.png
The strip shows each frame at render size (2x) on top, then at in-game size (1x) in blue
and orange, then a black-fill silhouette row (the weapon must read in it). Frames get the
same follow-through, smear and outer outline as the full pipeline.
"""
import argparse
import importlib
import os
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.dont_write_bytecode = True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("unit")
    ap.add_argument("frames", nargs="+", help="clip:frame ...")
    ap.add_argument("--out", required=True)
    ap.add_argument("--scale", type=float, default=2.0)
    args = ap.parse_args()
    import numpy as np
    from PIL import Image

    from ageborn_art import config as C
    from ageborn_art import pipeline, render, scene, sheet
    from ageborn_art.rig import Rig
    C.set_render_scale(args.scale)

    mod = importlib.import_module(f"units.{args.unit}")
    scene.reset()
    canvas = (C.px(mod.CANVAS[0]), C.px(mod.CANVAS[1]))
    feet = (C.px(mod.FEET[0]), C.px(mod.FEET[1]))
    scene.camera(*canvas, feet)
    rig = Rig(mod.SLUG, yaw=getattr(mod, "YAW_DEG", C.CHARACTER_YAW_DEG))
    mod.build(rig)
    clips = {c.name: c for c in mod.clips()}
    poses = {}
    tmp = tempfile.mkdtemp()
    tiles = []
    for item in args.frames:
        name, idx = item.split(":")
        idx = int(idx)
        clip = clips[name]
        if name not in poses:
            poses[name] = render.clip_poses(rig, clip)
        smear = render.smear_for(rig, clip, poses[name], idx, getattr(mod, "SMEAR", None))
        raw = render.render_frame(rig, poses[name][idx], os.path.join(tmp, f"{name}_{idx}.png"),
                                  getattr(mod, "TEAM", True), smear)
        base, team = pipeline.finish_frame(*raw, pipeline.default_outline(mod))
        print(item, "team share %.1f%%" % sheet.team_share(sheet.load(raw[0]),
                                                          sheet.load(raw[1]) if raw[1] else None))
        tiles.append([sheet.to_image(sheet.composite(base, team, C.TEAM_COLORS[t]))
                      for t in ("blue", "orange")])
    w, h = canvas
    bg = tuple(int(c * 255) for c in sheet.hex_to_rgb(C.PREVIEW_BG)) + (255,)
    s = C.RENDER_SCALE
    sw, sh = round(w / s), round(h / s)
    out = Image.new("RGBA", (w * len(tiles), h + sh * 2 + 8), bg)
    for i, (blue, orange) in enumerate(tiles):
        out.alpha_composite(blue, (i * w, 0))
        small = blue.resize((sw, sh), Image.Resampling.BOX)
        small_o = orange.resize((sw, sh), Image.Resampling.BOX)
        out.alpha_composite(small, (i * w, h + 4))
        out.alpha_composite(small_o, (i * w + sw, h + 4))
        a = np.asarray(small)[..., 3]
        sil = np.zeros((sh, sw, 4), np.uint8)
        sil[..., 3] = a
        out.alpha_composite(Image.fromarray(sil, "RGBA"), (i * w, h + sh + 8))
    out.save(args.out)
    print(args.out)


if __name__ == "__main__":
    main()
