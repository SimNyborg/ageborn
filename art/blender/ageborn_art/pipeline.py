"""Render one unit (or shared effect) end to end: scene, rig, frames, outline, atlas,
previews, stats.

A unit module provides:
  SLUG, NAME, HEIGHT_LU      visual id is unit.<SLUG> (or VISUAL_ID)
  CANVAS = (w, h)            frame size in px, authored at 2x (scaled by config.px)
  FEET = (x, y)              feet pixel at 2x (y from the top); becomes the anchor
  ANCHORS                    {"head": (x, z), "hitCenter": (x, z)} in lu (static)
  build(rig)                 adds joints, parts, secondary joints and trackers
  clips()                    list of anim.Clip (idle, walk, attack, hit, die)
Optional:
  YAW_DEG                    view yaw (bipeds -18, rider/quadruped/vehicle -10)
  SMEAR                      {"joint", "inner", "outer", "color"} for the attack smear
  TEAM = False               no team layer (shared effects)
  OUTER_OUTLINE              (px at 1x, colour factor, max value) or None
  VISUAL_ID, FILE_SLUG       for shared effects (fx.dust_poof -> fx_dust_poof.png)
"""
import json
import os
import time

import numpy as np

from . import config as C
from . import render, retime, scene, sheet
from .rig import Rig


def finish_frame(base_path, team_path, smear_path, spec):
    """Raw renders -> final (base, team) arrays: outer outline, smear underneath."""
    base = sheet.load(base_path)
    team = sheet.load(team_path) if team_path else None
    under = sheet.load(smear_path) if smear_path else None
    if spec is None:
        if under is not None:
            base = sheet.over(base, under)
        return base, team
    width_1x, factor, max_v = spec
    inset = max(2, round(C.OUTLINE_LU * C.PX_PER_LU) + 1)
    return sheet.outline(base, team, width_1x * C.RENDER_SCALE, factor, max_v,
                         seed_inset_px=inset, team_grey=C.OUTER_OUTLINE_FACTOR,
                         inner_px=C.OUTER_OUTLINE_INNER_PX_1X * C.RENDER_SCALE, under=under)


def default_outline(mod):
    return getattr(mod, "OUTER_OUTLINE", (C.OUTER_OUTLINE_PX_1X, C.OUTER_OUTLINE_FACTOR,
                                          C.OUTER_OUTLINE_MAX_V))


def _outline_frames(raw, final_dir, spec):
    """Applies the outer outline to every raw frame; writes the final (base, team) frames."""
    os.makedirs(final_dir, exist_ok=True)
    out = {}
    for clip, frames in raw.items():
        done = []
        for bp, tp, sp in frames:
            fb = os.path.join(final_dir, os.path.basename(bp))
            ft = os.path.join(final_dir, os.path.basename(tp)) if tp else None
            b, t = finish_frame(bp, tp, sp, spec)
            s2 = bp.replace(".png", "_smear2.png")  # smear v2 / accents (smear2.py) go on top
            if os.path.exists(s2):
                b = sheet.over(sheet.load(s2), b)
            sheet.save(b, fb)
            if t is not None:
                sheet.save(t, ft)
            done.append((fb, ft))
        out[clip] = done
    return out


def _edge_check(raw):
    """Frames whose silhouette touches the canvas border (the canvas is too small)."""
    bad = []
    for clip, frames in raw.items():
        for i, (bp, tp, _) in enumerate(frames):
            for p in (bp, tp):
                if p:
                    a = sheet.load(p)[..., 3]
                    if max(a[0].max(), a[-1].max(), a[:, 0].max(), a[:, -1].max()) > 0.02:
                        bad.append(f"{clip}_{i:02d}")
                        break
    return bad


def _even(v):
    return v + (v % 2)


def _half(arr):
    """Exact 2:1 downsample in premultiplied alpha (no dark fringe on the edges)."""
    h, w = arr.shape[0] // 2 * 2, arr.shape[1] // 2 * 2
    a = arr[:h, :w]
    pm = a[..., :3] * a[..., 3:4]
    pm = pm.reshape(h // 2, 2, w // 2, 2, 3).mean(axis=(1, 3))
    al = a[..., 3].reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3))[..., None]
    rgb = np.where(al > 1e-6, pm / np.maximum(al, 1e-6), 0)
    return np.concatenate([rgb, al], -1)


def _half_frames(frames, out_dir):
    """The final @2x frames downsampled to the @1x sheet."""
    os.makedirs(out_dir, exist_ok=True)
    out = {}
    for clip, fr in frames.items():
        done = []
        for bp, tp in fr:
            pair = []
            for p in (bp, tp):
                if p is None:
                    pair.append(None)
                    continue
                q = os.path.join(out_dir, os.path.basename(p))
                sheet.save(_half(sheet.load(p)), q)
                pair.append(q)
            done.append(tuple(pair))
        out[clip] = done
    return out


def run_unit(mod, out_dir, frame_root, log=print, previews=True, v3=False):
    """v3: unit sheets after the art director review: retimed clips (retime.py), a
    colour-matched outline, and two sheets per unit: `<slug>.hd.json` at 2.46 px/lu and
    `<slug>.json` at 1.23 px/lu, downsampled from the same frames."""
    t0 = time.time()
    if v3:
        # Legendaries (170-220 lu) render at 2.05 px/lu (HD) / 1.03 (1x): still above the densest
        # common screen (about 1.65 device px/lu) and their HD sheet fits one 4096 px texture
        big = mod.HEIGHT_LU >= C.LEGENDARY_MIN_LU_V3
        C.set_render_scale(C.UNIT_SCALE_LEGENDARY_V3 if big else C.UNIT_SCALE_V3)
        C.FILTER_WIDTH = 1.0
    scene.reset()
    canvas = (C.px(mod.CANVAS[0]), C.px(mod.CANVAS[1]))
    feet = (C.px(mod.FEET[0]), C.px(mod.FEET[1]))
    if v3:
        # room for the longer death (knockback, arc) and heavy wind-ups: extra canvas on the left,
        # top and bottom (frames are trimmed when packed, so the margin costs no atlas space)
        ml, mt, mb = _even(int(canvas[0] * 0.14)), _even(int(canvas[1] * 0.08)), _even(int(canvas[1] * 0.04))
        canvas = (_even(canvas[0]) + ml, _even(canvas[1]) + mt + mb)
        feet = (_even(feet[0]) + ml, _even(feet[1]) + mt)
    scene.camera(*canvas, feet)
    rig = Rig(mod.SLUG, yaw=getattr(mod, "YAW_DEG",
                                    C.CHARACTER_YAW_V3 if v3 else C.CHARACTER_YAW_DEG))
    mod.build(rig)
    clips = mod.clips()
    if v3:
        clips = retime.retime(mod, clips)
    team = getattr(mod, "TEAM", True)
    file_slug = getattr(mod, "FILE_SLUG", mod.SLUG)
    t_build = time.time() - t0
    raw_dir = os.path.join(frame_root, file_slug)
    raw, tracks, t_render = render.render_clips(rig, clips, raw_dir, feet,
                                                getattr(mod, "SMEAR", None), team, log)
    t1 = time.time()
    clipped = _edge_check(raw)
    if clipped:
        log(f"  WARNING: silhouette touches the canvas edge in {clipped}")
    spec = default_outline(mod)
    if v3 and spec is not None and not hasattr(mod, "OUTER_OUTLINE"):
        spec = C.UNIT_OUTLINE_V3
    frames = _outline_frames(raw, os.path.join(raw_dir, "final"), spec)
    t_outline = time.time() - t1

    first = clips[0].name
    width_lu = sheet.silhouette_width_lu(*raw[first][0][:2], C.PX_PER_LU)
    clip_meta = {}
    for c in clips:
        m = c.meta()
        if c.name in tracks:
            pub = {k: v for k, v in tracks[c.name].items() if not k.startswith("_")}
            if pub:
                m["anchorsLu"] = pub
            foot = tracks[c.name].get("_foot")
            if foot and c.name == "walk":
                # a foot travels its x range backward while planted, twice per cycle: moving
                # at strideLu per cycle keeps it from sliding; the game scales playback by
                # unit speed / naturalSpeedLuPerS (DESIGN A12 checklist item 2)
                xs = [p[0] for p in foot]
                stride = round(2 * (max(xs) - min(xs)), 1)
                m["strideLu"] = stride
                m["naturalSpeedLuPerS"] = round(stride / (c.total_ms() / 1000.0), 1)
        for fx in m.get("fx", []):
            fx["scale"] = round((width_lu / C.FX_REF_WIDTH_LU) ** fx.pop("scalePow", 1.0), 3)
        clip_meta[c.name] = m
    extra = {
        "visualId": getattr(mod, "VISUAL_ID", f"unit.{mod.SLUG}"),
        "name": mod.NAME,
        "heightLu": mod.HEIGHT_LU,
        "widthLu": width_lu,
        "pxPerLu": C.PX_PER_LU,
        "feetPx": list(feet),
        "anchorsLu": {k: list(v) for k, v in getattr(mod, "ANCHORS", {}).items()},
        "facing": "right",
        "note": "anchorsLu are screen-plane lu from the feet (x right, y up)",
    }
    extra.update(getattr(mod, "EXTRA_META", {}))
    t2 = time.time()
    check = sheet.checks(frames, {c: [f[:2] for f in fr] for c, fr in raw.items()},
                         C.TEAM_COVERAGE_MIN_PCT if team else None)
    check["clippedFrames"] = clipped
    if v3:
        size = sheet.build_atlas(mod.SLUG, frames, clip_meta, extra, out_dir, C.RENDER_SCALE,
                                 f"{file_slug}.hd", variants=False)
        half = _half_frames(frames, os.path.join(raw_dir, "final1x"))
        extra1 = dict(extra, pxPerLu=round(C.PX_PER_LU / 2, 4),
                      feetPx=[feet[0] / 2, feet[1] / 2])
        sheet.build_atlas(mod.SLUG, half, clip_meta, extra1, out_dir, C.RENDER_SCALE / 2,
                          file_slug, variants=False)
    else:
        size = sheet.build_atlas(mod.SLUG, frames, clip_meta, extra, out_dir, C.RENDER_SCALE,
                                 file_slug)
    if previews:
        tints = {"blue": C.TEAM_COLORS["blue"], "orange": C.TEAM_COLORS["orange"]} if team \
            else {"plain": "#FFFFFF"}
        sheet.previews(file_slug, frames, clip_meta, out_dir, C.RENDER_SCALE, C.PREVIEW_BG, tints,
                       fx=True, feet_px=feet, px_per_lu=C.PX_PER_LU)
        if team:
            base0, team0 = frames[first][0]
            sheet.team_breakdown(file_slug, base0, team0, out_dir, list(C.TEAM_COLORS.values()),
                                 C.PREVIEW_BG)
    t_pack = time.time() - t2
    n_frames = sum(c.frames for c in clips)
    kb = lambda p: round(os.path.getsize(os.path.join(out_dir, p)) / 1024, 1)
    stats = {
        "slug": file_slug,
        "frames": n_frames,
        "playbackSteps": sum(len(c.sequence) for c in clips),
        "renders": sum(1 + (t is not None) for f in frames.values() for _, t in f),
        "canvasPx": list(canvas),
        "renderScale": C.RENDER_SCALE,
        "sheetPx": list(size),
        "widthLu": width_lu,
        **check,
        "seconds": {"build": round(t_build, 1), "render": round(t_render, 1),
                    "outline": round(t_outline, 1), "pack_and_previews": round(t_pack, 1),
                    "total": round(time.time() - t0, 1)},
        "kb": ({"png8": kb(f"{file_slug}.png"), "png8_hd": kb(f"{file_slug}.hd.png"),
                "json": kb(f"{file_slug}.json")} if v3 else
               {"png8": kb(f"{file_slug}.png"), "png32": kb(f"{file_slug}.rgba.png"),
                "webp_lossless": kb(f"{file_slug}.webp"),
                "webp_q90": kb(f"{file_slug}.q90.webp"), "json": kb(f"{file_slug}.json")}),
    }
    with open(os.path.join(out_dir, f"{file_slug}.stats.json"), "w") as fh:
        json.dump(stats, fh, indent=1)
    log(json.dumps(stats))
    return stats
