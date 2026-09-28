"""Render a unit's clips (beauty + team-mask pass), split into base/team layers, downsample,
outline, pack sheets, and write GIF previews.

Layers follow the game's contract (art/blender/README.md): `<frame>_team` is grey and is
tinted with the team colour, `<frame>` is drawn on top with holes where team surfaces are.
"""
import json
import math
import os
import time

import bpy
import numpy as np
from PIL import Image

from . import core as C

OUTLINE_PX = {1: 0.85, 2: 1.35, 3: 1.9}
OUTLINE_RGB = np.array([0.075, 0.062, 0.055])
OUTLINE_A = 0.9


class Clip:
    def __init__(self, name, times, durations, loop=True, blur=None, impact=None, fx=None):
        self.name = name
        self.times = list(times)            # pose-function time per unique frame
        self.durations = list(durations)    # ms per frame
        self.loop = loop
        self.blur = blur or {}              # frame index -> time span sampled for motion blur
        self.impact = impact
        self.fx = fx or []


# ---------------------------------------------------------------------- render passes
def _mode(mode, ctx):
    sc = bpy.context.scene
    vl = bpy.context.view_layer
    cy = sc.cycles
    ground = bpy.data.objects.get("ground")
    if mode == "beauty":
        vl.material_override = None
        cy.samples = ctx.get("samples", 40)
        cy.use_denoising = True
        cy.use_adaptive_sampling = True
        cy.max_bounces = 4
        sc.view_settings.view_transform = "AgX"
        sc.view_settings.look = "AgX - Punchy"
        sc.view_settings.exposure = ctx.get("exposure", 0.15)
        if ground:
            ground.hide_render = False
    else:
        if "mask_mat" not in ctx:
            ctx["mask_mat"] = C.mask_material()
        vl.material_override = ctx["mask_mat"]
        cy.samples = 16
        cy.use_denoising = False
        cy.use_adaptive_sampling = False
        cy.max_bounces = 0
        sc.view_settings.view_transform = "Raw"
        sc.view_settings.look = "None"
        sc.view_settings.exposure = 0.0
        if ground:
            ground.hide_render = True


def _pose_at(unit, ctx, clip, t, blur):
    sc = bpy.context.scene
    arm = ctx["rig"].obj
    arm.animation_data_clear()
    if blur:
        unit.pose(ctx, clip.name, t - blur)
        ctx["rig"].key(1)
        unit.pose(ctx, clip.name, t)
        ctx["rig"].key(2)
        sc.frame_set(2)
        sc.render.use_motion_blur = True
        sc.render.motion_blur_shutter = 1.0
        try:
            sc.render.motion_blur_position = "END"
        except Exception:
            sc.cycles.motion_blur_position = "END"
    else:
        sc.render.use_motion_blur = False
        unit.pose(ctx, clip.name, t)
        sc.frame_set(1)
    bpy.context.view_layer.update()


def render_jobs(unit, ctx, jobs, tmp):
    """jobs: [(clip, index)]. Writes beauty_/mask_ PNGs to tmp. Returns seconds."""
    os.makedirs(tmp, exist_ok=True)
    t0 = time.time()
    for mode in ("beauty", "mask"):
        _mode(mode, ctx)
        for clip, i in jobs:
            _pose_at(unit, ctx, clip, clip.times[i], clip.blur.get(i, 0.0))
            bpy.context.scene.render.filepath = os.path.join(tmp, f"{mode}_{clip.name}_{i:02d}.png")
            bpy.ops.render.render(write_still=True)
    return time.time() - t0


# ---------------------------------------------------------------------- layers
def _srgb_to_lin(a):
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def load_layers(tmp, clip, i):
    """-> dict(team (premult RGBA, grey), base (premult RGBA), obj (coverage), lum raw)."""
    B = np.asarray(Image.open(os.path.join(tmp, f"beauty_{clip}_{i:02d}.png")), float) / 255.0
    M = np.asarray(Image.open(os.path.join(tmp, f"mask_{clip}_{i:02d}.png")), float) / 255.0
    A = B[..., 3]
    O = M[..., 3]
    m = np.clip(M[..., 0], 0, 1)                   # Raw view: linear fraction
    t = np.clip(O * m, 0, 1)
    t = np.minimum(t, A)
    ab = np.clip(A - t, 0, 1)                       # non-team coverage (base over team)
    ta = np.clip(t / np.maximum(1 - ab, 1e-4), 0, 1)  # team alpha so that base-over-team = A
    rgb = B[..., :3]
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722])
    return dict(rgb=rgb, lum=lum, t=ta, ab=ab, obj=np.maximum(O, 0))


def build_layers(L, lref):
    g = np.clip(L["lum"] / lref, 0, 1.0)
    team = np.dstack([g * L["t"]] * 3 + [L["t"]])
    base = np.dstack([L["rgb"] * L["ab"][..., None], L["ab"]])
    return team, base, L["obj"]


def _down(img, s, full):
    """Downsample a premultiplied float image from `full` (3) to scale s."""
    if s == full:
        return img
    h, w = img.shape[:2]
    if full % s == 0:
        f = full // s
        return img.reshape(h // f, f, w // f, f, -1).mean((1, 3))
    nw, nh = int(round(w * s / full)), int(round(h * s / full))
    ch = []
    for c in range(img.shape[2]):
        im = Image.fromarray(img[..., c].astype(np.float32), mode="F")
        ch.append(np.asarray(im.resize((nw, nh), Image.LANCZOS)))
    return np.clip(np.dstack(ch), 0, 1)


def _dilate(a, r):
    R = int(math.ceil(r + 0.5))
    p = np.pad(a, R)
    out = np.zeros_like(a)
    h, w = a.shape
    for dy in range(-R, R + 1):
        for dx in range(-R, R + 1):
            d = math.hypot(dx, dy)
            wgt = min(1.0, max(0.0, r + 0.5 - d))
            if wgt <= 0:
                continue
            out = np.maximum(out, p[R + dy:R + dy + h, R + dx:R + dx + w] * wgt)
    return out


def _sharpen(base, amt):
    if amt <= 0:
        return base
    rgb = base[..., :3]
    p = np.pad(rgb, ((1, 1), (1, 1), (0, 0)), mode="edge")
    blur = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:] + 4 * rgb) / 8.0
    out = np.clip(rgb + amt * (rgb - blur), 0, None)
    out = np.minimum(out, base[..., 3:4])
    return np.dstack([out, base[..., 3]])


def finish(team, base, obj, s, full=3, sharpen=0.0):
    """Downsample to scale s and add the thin dark outline (in the base layer)."""
    team = _down(team, s, full)
    base = _down(base, s, full)
    obj = _down(obj[..., None], s, full)[..., 0]
    if sharpen:
        base = _sharpen(base, sharpen)
        tr = _sharpen(team, sharpen)
        team = tr
    ol = np.clip(_dilate(obj, OUTLINE_PX[s]) - obj, 0, 1) * OUTLINE_A
    a = ol + base[..., 3] * (1 - ol)
    rgb = OUTLINE_RGB[None, None, :] * ol[..., None] + base[..., :3] * (1 - ol[..., None])
    return team, np.dstack([rgb, a]), obj


def composite(team, base, tint_hex, bg=None):
    """Premultiplied composite of the tinted team layer under the base layer."""
    tint = np.array([int(tint_hex.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4)])
    t_rgb = team[..., :3] * tint
    t_a = team[..., 3]
    rgb = base[..., :3] + t_rgb * (1 - base[..., 3:4])
    a = base[..., 3] + t_a * (1 - base[..., 3])
    if bg is None:
        return np.dstack([rgb, a])
    return rgb + bg * (1 - a[..., None])


def to_img(premult):
    a = premult[..., 3:4]
    rgb = np.where(a > 1e-4, premult[..., :3] / np.maximum(a, 1e-4), 0)
    arr = np.dstack([rgb, a])
    return Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")


def to_rgb(img):
    return Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), "RGB")


# ---------------------------------------------------------------------- backdrop for previews
def preview_bg(w, h, feet_y):
    y = np.arange(h)[:, None] / max(h - 1, 1)
    sky = np.array([0.70, 0.76, 0.82]) * (1 - y[..., None]) + np.array([0.86, 0.84, 0.78]) * y[..., None]
    bg = np.broadcast_to(sky, (h, w, 3)).copy()
    gy = int(feet_y)
    if gy < h:
        g = np.linspace(0, 1, h - gy)[:, None, None]
        bg[gy:] = np.array([0.52, 0.50, 0.40]) * (1 - g) + np.array([0.40, 0.38, 0.30]) * g
    return bg


# ---------------------------------------------------------------------- sheets
def pack(frames, gutter=2, max_w=1024):
    """frames: [(name, RGBA uint8 PIL image, anchor(x,y))]. Shelf-pack trimmed frames."""
    items = []
    for name, im, anc in frames:
        bb = im.getbbox() or (0, 0, 1, 1)
        items.append((name, im.crop(bb), bb, im.size, anc))
    order = sorted(range(len(items)), key=lambda i: -items[i][1].size[1])
    x = y = shelf = 0
    pos = {}
    width = 0
    for i in order:
        w, h = items[i][1].size
        if x + w > max_w:
            x, y, shelf = 0, y + shelf + gutter, 0
        pos[i] = (x, y)
        x += w + gutter
        shelf = max(shelf, h)
        width = max(width, x)
    H = y + shelf
    sheet = Image.new("RGBA", (width, H), (0, 0, 0, 0))
    meta = {}
    for i, (name, im, bb, size, anc) in enumerate(items):
        sheet.paste(im, pos[i])
        meta[name] = {
            "frame": {"x": pos[i][0], "y": pos[i][1], "w": im.size[0], "h": im.size[1]},
            "rotated": False, "trimmed": True,
            "spriteSourceSize": {"x": bb[0], "y": bb[1], "w": im.size[0], "h": im.size[1]},
            "sourceSize": {"w": size[0], "h": size[1]},
            "anchor": {"x": anc[0] / size[0], "y": anc[1] / size[1]},
        }
    return sheet, meta


def save_png8(img, path):
    q = img.quantize(colors=256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    q.save(path, optimize=True)
    return os.path.getsize(path)


# ---------------------------------------------------------------------- whole unit
def run_unit(unit, out, samples=40, clips=None, preview_only=None):
    """Render and post-process a unit. `preview_only`: [(clip, index)] for a look-dev strip."""
    os.makedirs(out, exist_ok=True)
    C.reset(samples)
    ctx = unit.build()
    ctx["samples"] = samples
    cam, (wpx, hpx), feet_px = C.camera(unit.CANVAS[0], unit.CANVAS[1], unit.FEET)
    all_clips = unit.clips()
    if clips:
        all_clips = [c for c in all_clips if c.name in clips]
    tmp = os.path.join(out, "_frames", unit.SLUG)
    if preview_only:
        byname = {c.name: c for c in unit.clips()}
        jobs = [(byname[c], i) for c, i in preview_only]
    else:
        jobs = [(c, i) for c in all_clips for i in range(len(c.times))]
    secs = render_jobs(unit, ctx, jobs, tmp)
    print(f"[{unit.SLUG}] rendered {len(jobs)} frames x2 passes in {secs:.1f}s")
    return dict(jobs=[(c.name, i) for c, i in jobs], tmp=tmp, secs=secs, feet_px=feet_px,
                size=(wpx, hpx), clips=all_clips)


def lref_for(tmp, jobs):
    vals = []
    for c, i in jobs:
        L = load_layers(tmp, c, i)
        sel = L["t"] > 0.95
        if sel.sum() > 20:
            vals.append(np.percentile(L["lum"][sel], 98))
    return float(np.median(vals)) if vals else 0.8


def strip(tmp, jobs, feet_px, out_png, lref=None, teams=("#2F7DF6", "#F28A1E")):
    """Look-dev strip: 3x frames in blue on top, then 1x blue/orange, 1x shown at 3x nearest."""
    lref = lref or lref_for(tmp, jobs)
    big, small = [], []
    for c, i in jobs:
        L = load_layers(tmp, c, i)
        tm, bs, ob = build_layers(L, lref)
        t3, b3, _ = finish(tm, bs, ob, 3)
        h, w = b3.shape[:2]
        bg = preview_bg(w, h, feet_px[1])
        big.append(composite(t3, b3, teams[0], bg))
        row = []
        for tc in teams:
            t1, b1, _ = finish(tm, bs, ob, 1)
            bg1 = preview_bg(t1.shape[1], t1.shape[0], feet_px[1] / 3)
            row.append(composite(t1, b1, tc, bg1))
        small.append(np.hstack(row))
    top = np.hstack(big)
    bot = np.hstack(small)
    bot_im = to_rgb(bot)
    bot_up = bot_im.resize((bot_im.width * 3, bot_im.height * 3), Image.NEAREST)
    W = max(top.shape[1], bot_up.width)
    canvas = Image.new("RGB", (W, top.shape[0] + bot_up.height + bot_im.height + 8), (40, 40, 40))
    canvas.paste(to_rgb(top), (0, 0))
    canvas.paste(bot_up, (0, top.shape[0] + 4))
    canvas.paste(bot_im, (0, top.shape[0] + bot_up.height + 8))
    canvas.save(out_png)
    return lref
