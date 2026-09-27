"""Render one unit end to end: scene, rig, frames, atlas, previews, stats.

A unit module provides:
  SLUG, NAME, HEIGHT_LU      visual id is unit.<SLUG>
  CANVAS = (w, h)            frame size in px, authored at 2x (scaled by config.px)
  FEET = (x, y)              feet pixel at 2x (y from the top); becomes the anchor
  ANCHORS                    {"head": (x, z), "muzzle": (x, z), "hitCenter": (x, z)} in lu
  build(rig)                 adds joints and parts
  clips()                    list of anim.Clip (idle, walk, attack, hit, die)
"""
import json
import os
import time

from . import config as C
from . import render, scene, sheet
from .rig import Rig


def run_unit(mod, out_dir, frame_root, log=print):
    t0 = time.time()
    scene.reset()
    canvas = (C.px(mod.CANVAS[0]), C.px(mod.CANVAS[1]))
    feet = (C.px(mod.FEET[0]), C.px(mod.FEET[1]))
    scene.camera(*canvas, feet)
    rig = Rig(mod.SLUG)
    mod.build(rig)
    clips = mod.clips()
    t_build = time.time() - t0
    frames, t_render = render.render_clips(rig, clips, os.path.join(frame_root, mod.SLUG), log)
    t1 = time.time()
    clip_meta = {c.name: c.meta() for c in clips}
    extra = {
        "visualId": f"unit.{mod.SLUG}",
        "name": mod.NAME,
        "heightLu": mod.HEIGHT_LU,
        "pxPerLu": C.PX_PER_LU,
        "feetPx": list(feet),
        "anchorsLu": {k: list(v) for k, v in mod.ANCHORS.items()},
        "facing": "right",
    }
    rule = sheet.colour_rule(frames)
    size = sheet.build_atlas(mod.SLUG, frames, clip_meta, extra, out_dir, C.RENDER_SCALE)
    tints = {"blue": C.TEAM_COLORS["blue"], "orange": C.TEAM_COLORS["orange"]}
    sheet.previews(mod.SLUG, frames, clip_meta, out_dir, C.RENDER_SCALE, C.PREVIEW_BG, tints)
    t_pack = time.time() - t1
    n_frames = sum(c.frames for c in clips)
    kb = lambda p: round(os.path.getsize(os.path.join(out_dir, p)) / 1024, 1)
    stats = {
        "slug": mod.SLUG,
        "frames": n_frames,
        "renders": sum(1 + (t is not None) for f in frames.values() for _, t in f),
        "canvasPx": list(canvas),
        "renderScale": C.RENDER_SCALE,
        "sheetPx": list(size),
        "colourRule": rule,
        "seconds": {"build": round(t_build, 1), "render": round(t_render, 1),
                    "pack_and_previews": round(t_pack, 1), "total": round(time.time() - t0, 1)},
        "kb": {"png8": kb(f"{mod.SLUG}.png"), "png32": kb(f"{mod.SLUG}.rgba.png"),
               "webp_lossless": kb(f"{mod.SLUG}.webp"),
               "webp_q90": kb(f"{mod.SLUG}.q90.webp"), "json": kb(f"{mod.SLUG}.json")},
    }
    with open(os.path.join(out_dir, f"{mod.SLUG}.stats.json"), "w") as fh:
        json.dump(stats, fh, indent=1)
    log(json.dumps(stats))
    return stats
