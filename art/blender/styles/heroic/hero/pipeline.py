"""One heroic unit end to end: scene, rig, frames, outline, trails and fx, atlases, previews.

A unit module provides SLUG, NAME, HEIGHT_LU, YAW_DEG, CANVAS_LU = (left, right, bottom, top)
around the feet in lu, ANCHORS, build(rig), clips(); optional TRAIL (a dict or a list of dicts:
joint, inner, outer, behind) used by clips that carry `trails`.

Output (per unit, in out_dir):
  <slug>.hd.png/.json   atlas at 2.46 px/lu (the same scale as today's v3 HD sheets)
  <slug>.png/.json      atlas at 1.23 px/lu (downsampled from the same frames)
  <slug>_<clip>_1x.gif  at true phone size (0.9145 px/lu: a 68 lu unit is 62 px tall)
  <slug>_<clip>_3x.gif  three times that
  <slug>_contact.png    every unique frame, blue and orange
  <slug>.stats.json     frames, sheet sizes, colour rule, team coverage, render time
"""
import json
import os
import time

import numpy as np
from PIL import Image

from ageborn_art import config as C
from ageborn_art import scene, sheet
from ageborn_art.colors import hex_to_rgb
from ageborn_art.pipeline import _half

from . import config as H
from . import materials as M
from . import render as R
from .rig import HeroRig


def _team_rgb():
    return {k: np.array(hex_to_rgb(v), np.float32) for k, v in H.TEAM_COLORS.items()}


def finish(fr):
    """raw frame dict -> (base, team) arrays with outline, trail and fx."""
    base = sheet.load(fr["base"])
    team = sheet.load(fr["team"]) if fr["team"] else None
    w, factor, max_v = H.OUTER_OUTLINE
    inset = max(2, round(H.INTERIOR_LINE_LU * C.PX_PER_LU) + 1)
    base, team = sheet.outline(base, team, w * C.RENDER_SCALE, factor, max_v, seed_inset_px=inset,
                               team_grey=0.34, inner_px=0.8 * C.RENDER_SCALE)
    if team is None:
        team = np.zeros_like(base)
    if fr["trail"]:
        t = sheet.load(fr["trail"])
        a = t[..., 3]
        core = np.clip(t[..., 0], 0, 1) * a
        fringe = np.clip(t[..., 1], 0, 1) * a
        # fringe: into the team layer (tinted), punching the base so it shows in front
        fa = np.clip(fringe * 0.95, 0, 1)
        g = H.TRAIL_TEAM_GREY
        layer = np.zeros_like(team)
        layer[..., :3] = g
        layer[..., 3] = fa
        team = sheet.over(layer, team)
        base = base.copy()
        base[..., 3] *= (1 - fa)
        # core: white-hot, over everything
        cl = np.zeros_like(base)
        cl[..., :3] = hex_to_rgb(H.TRAIL_CORE)
        cl[..., 3] = np.clip(core * 1.2, 0, 1)
        base = sheet.over(cl, base)
    if fr["fx"]:
        f = sheet.load(fr["fx"])
        f, _ = sheet.outline(f, None, 1.1 * C.RENDER_SCALE, 0.55, 0.62, seed_inset_px=2,
                             inner_px=0.3 * C.RENDER_SCALE)
        base = sheet.over(f, base)
        # fx cover the team layer too (they sit in front)
        team = team.copy()
        team[..., 3] *= (1 - np.clip(f[..., 3], 0, 1))
    if team[..., 3].max() < 1e-3:
        team = None
    return base, team


def composite(base, team, tint_hex):
    return sheet.composite(base, team, tint_hex)


def timeline(meta, imgs):
    return [(imgs[i], d) for i, d in zip(meta["sequence"], meta["durationsMs"])]


def gifs(slug, finals, metas, out_dir):
    """Per clip: 1x (phone scale) and 3x GIFs, blue on the left and orange on the right."""
    comps = {}
    for clip, frames in finals.items():
        comps[clip] = {t: [sheet.to_image(composite(b, tm, H.TEAM_COLORS[t])) for b, tm in frames]
                       for t in ("blue", "orange")}
    boxes = [sheet.bbox(im) for c in comps.values() for t in c.values() for im in t]
    W, Hh = next(iter(comps.values()))["blue"][0].size
    m = 10
    x0 = max(0, min(b[0] for b in boxes) - m)
    y0 = max(0, min(b[1] for b in boxes) - m)
    x1 = min(W, max(b[2] for b in boxes) + m)
    y1 = min(Hh, max(b[3] for b in boxes) + m)
    bg = tuple(int(c * 255) for c in hex_to_rgb(H.PREVIEW_BG)) + (255,)
    k1 = H.PHONE_PX_PER_LU / C.PX_PER_LU
    for clip, t in comps.items():
        for label, k in (("1x", k1), ("3x", 3 * k1)):
            out, durs = [], []
            for (ib, d), (io, _) in zip(timeline(metas[clip], t["blue"]), timeline(metas[clip], t["orange"])):
                cb = ib.crop((x0, y0, x1, y1))
                co = io.crop((x0, y0, x1, y1)).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                size = (max(1, round(cb.size[0] * k)), max(1, round(cb.size[1] * k)))
                rs = Image.Resampling.BOX if k < 1 else Image.Resampling.LANCZOS
                cb, co = cb.resize(size, rs), co.resize(size, rs)
                gap = max(4, size[0] // 8)
                canvas = Image.new("RGBA", (size[0] * 2 + gap, size[1]), bg)
                canvas.alpha_composite(cb, (0, 0))
                canvas.alpha_composite(co, (size[0] + gap, 0))
                out.append(canvas.convert("RGB"))
                durs.append(max(20, int(round(d / 10.0)) * 10))
            if not metas[clip].get("loop"):
                durs[-1] += 500
            out[0].save(os.path.join(out_dir, f"{slug}_{clip}_{label}.gif"), save_all=True,
                        append_images=out[1:], duration=durs, loop=0, disposal=1, optimize=False)
    # contact sheet (HD crop, halved)
    cw, ch = (x1 - x0) // 2, (y1 - y0) // 2
    rows = [(c, t) for c in comps for t in ("blue", "orange")]
    cols = max(len(v["blue"]) for v in comps.values())
    cs = Image.new("RGBA", (cols * cw, len(rows) * ch), bg)
    for r, (c, t) in enumerate(rows):
        for i, im in enumerate(comps[c][t]):
            cs.alpha_composite(im.crop((x0, y0, x1, y1)).resize((cw, ch), Image.Resampling.LANCZOS),
                               (i * cw, r * ch))
    cs.convert("RGB").save(os.path.join(out_dir, f"{slug}_contact.png"))
    return (x0, y0, x1, y1)


def setup_scene(mod):
    C.set_render_scale(H.UNIT_SCALE)
    C.FILTER_WIDTH = 1.0
    C.CAMERA_ELEVATION_DEG = H.CAMERA_ELEVATION_DEG
    scene.reset()
    M.reset()
    l, r, b, t = mod.CANVAS_LU
    ppl = C.PX_PER_LU
    w = int(round((r - l) * ppl / 2)) * 2
    h = int(round((t - b) * ppl / 2)) * 2
    feet = (int(round(-l * ppl)), int(round(t * ppl)))
    scene.camera(w, h, feet)
    return (w, h), feet


def run_unit(mod, out_dir, log=print, only=None):
    t0 = time.time()
    os.makedirs(out_dir, exist_ok=True)
    canvas, feet = setup_scene(mod)
    rig = HeroRig(mod.SLUG, yaw=mod.YAW_DEG)
    mod.build(rig)
    rig.finish_build()
    clips = mod.clips()
    frame_dir = os.path.join(out_dir, "_frames", mod.SLUG)
    raw, tracks, t_render = R.render_clips(rig, clips, frame_dir, feet, getattr(mod, "TRAIL", None),
                                           log, only)
    finals = {}
    fin_dir = os.path.join(frame_dir, "final")
    os.makedirs(fin_dir, exist_ok=True)
    paths = {}
    for clip, frames in raw.items():
        finals[clip] = []
        paths[clip] = []
        for i, fr in enumerate(frames):
            b, t = finish(fr)
            finals[clip].append((b, t))
            bp = os.path.join(fin_dir, f"{clip}_{i:02d}.png")
            sheet.save(b, bp)
            tp = None
            if t is not None:
                tp = os.path.join(fin_dir, f"{clip}_{i:02d}_team.png")
                sheet.save(t, tp)
            paths[clip].append((bp, tp))
    metas = {}
    for c in clips:
        if c.name not in raw:
            continue
        m = c.meta()
        pub = {k: v for k, v in tracks.get(c.name, {}).items() if not k.startswith("_")}
        if pub:
            m["anchorsLu"] = pub
        foot = tracks.get(c.name, {}).get("_foot")
        if foot and c.name == "walk":
            xs = [p[0] for p in foot]
            stride = round(2 * (max(xs) - min(xs)), 1)
            m["strideLu"] = stride
            m["naturalSpeedLuPerS"] = round(stride / (c.total_ms() / 1000.0), 1)
        metas[c.name] = m
    first = next(iter(raw))
    width_lu = sheet.silhouette_width_lu(raw[first][0]["base"], raw[first][0]["team"], C.PX_PER_LU)
    extra = {"visualId": f"unit.{mod.SLUG}", "name": mod.NAME, "heightLu": mod.HEIGHT_LU,
             "widthLu": width_lu, "pxPerLu": C.PX_PER_LU, "feetPx": list(feet),
             "anchorsLu": {k: list(v) for k, v in getattr(mod, "ANCHORS", {}).items()},
             "facing": "right", "style": "heroic"}
    size = sheet.build_atlas(mod.SLUG, paths, metas, extra, out_dir, C.RENDER_SCALE,
                             f"{mod.SLUG}.hd", variants=False)
    half_dir = os.path.join(frame_dir, "final1x")
    os.makedirs(half_dir, exist_ok=True)
    hpaths = {}
    for clip, fr in paths.items():
        hpaths[clip] = []
        for bp, tp in fr:
            pair = []
            for p in (bp, tp):
                if p is None:
                    pair.append(None)
                    continue
                q = os.path.join(half_dir, os.path.basename(p))
                sheet.save(_half(sheet.load(p)), q)
                pair.append(q)
            hpaths[clip].append(tuple(pair))
    size1 = sheet.build_atlas(mod.SLUG, hpaths, metas,
                              dict(extra, pxPerLu=round(C.PX_PER_LU / 2, 4),
                                   feetPx=[feet[0] / 2, feet[1] / 2]),
                              out_dir, C.RENDER_SCALE / 2, mod.SLUG, variants=False)
    crop = gifs(mod.SLUG, finals, metas, out_dir)
    check = sheet.checks(paths, None, H.TEAM_MIN_PCT)
    kb = lambda p: round(os.path.getsize(os.path.join(out_dir, p)) / 1024, 1)
    stats = {"slug": mod.SLUG, "frames": {c: len(f) for c, f in raw.items()},
             "uniqueFrames": sum(len(f) for f in raw.values()),
             "canvasPx": list(canvas), "feetPx": list(feet), "crop": list(crop),
             "sheetHdPx": list(size), "sheet1xPx": list(size1),
             "kb": {"hd_png8": kb(f"{mod.SLUG}.hd.png"), "png8_1x": kb(f"{mod.SLUG}.png")},
             "renderSeconds": round(t_render, 1), "totalSeconds": round(time.time() - t0, 1),
             **check}
    with open(os.path.join(out_dir, f"{mod.SLUG}.stats.json"), "w") as fh:
        json.dump(stats, fh, indent=1)
    with open(os.path.join(out_dir, f"{mod.SLUG}.clips.json"), "w") as fh:
        json.dump({"feet": list(feet), "crop": list(crop), "clips": metas}, fh, indent=1)
    log(json.dumps({k: stats[k] for k in ("uniqueFrames", "sheetHdPx", "kb", "renderSeconds", "colourRule")}))
    log(json.dumps(stats.get("teamCoverage", {})))
    return stats
