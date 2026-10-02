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
    ap.add_argument("--v3", action="store_true", help="retimed clips and the v3 outline")
    ap.add_argument("--yaw", type=float, default=None, help="override the view yaw (deg)")
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
    yaw = args.yaw if args.yaw is not None else getattr(mod, "YAW_DEG",
                                                                C.CHARACTER_YAW_V3 if args.v3 else C.CHARACTER_YAW_DEG)
    rig = Rig(mod.SLUG, yaw=yaw)
    mod.build(rig)
    from ageborn_art import retime
    clips = {c.name: c for c in (retime.retime(mod, mod.clips()) if args.v3 else mod.clips())}
    spec = pipeline.default_outline(mod)
    if args.v3 and not hasattr(mod, "OUTER_OUTLINE"):
        spec = C.UNIT_OUTLINE_V3
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
        base, team = pipeline.finish_frame(*raw, spec)
        if getattr(clip, "overlays2", None):        # smear v2 / accents on top, as the pipeline does
            from ageborn_art import smear2
            s2 = os.path.join(tmp, f"{name}_{idx}_smear2.png")
            if smear2.paint_frame(rig, clip, poses[name], idx, s2) is not None or os.path.exists(s2):
                base = sheet.over(sheet.load(s2), base)
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
