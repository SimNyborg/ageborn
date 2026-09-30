"""Smear v2 and attacker accents painted in 2D (art director plan 2026-09-30, tool T5).

The v1 smear was a pale 3D ribbon composited *under* the unit, one frame long, with no
outline: it vanished at game size. v2 paints bold cartoon shapes *over* the finished frame
(after the outer outline), from paths measured on the rig:

  arc     a crescent swept by a weapon edge (inner and outer point on a joint) between two
          poses, tapered at the trailing end, weapon colour mixed 30% with white, a dark
          outline and 2-3 trailing speed lines. Inner = hand and outer = sling pouch gives a
          ring or fan smear for whirls; pass `band` (0.3-0.45) so a whirl paints a hollow
          ring, not a solid disc that reads as a shield at game size.
  claw    three thin tapered crescents (claw rakes)
  streak  a straight thrust: a tapered wedge along the path plus parallel speed lines
  dust    a cartoon dust puff at a point (ground contact, club bounce, hoof scrape)
  burst   short radial impact lines around a point (attacker accent)
  rings   2-3 concentric partial rings (a drum beat, a shout)

A clip opts in with `clip.overlays2 = {unique frame: [spec, ...]}` (see moves.clip). Specs
name joints and points in the rig's rest character space; paths are sampled by posing the
rig between the previous playback frame's pose (or `from`) and this frame's pose.
Render: `paint_frame()` writes `<clip>_<nn>_smear2.png`; the pipeline lays it over the
outlined base frame (the team layer sits under the base, so the smear covers it too).
"""
import math
import os

import bpy
import numpy as np
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector
from PIL import Image, ImageDraw

from . import config as C
from .anim import lerp_pose
from .colors import mix

SS = 3  # supersampling for antialiased shapes


def _rgb(hex_):
    h = hex_.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def _hex(rgb):
    return "#%02X%02X%02X" % tuple(max(0, min(255, int(round(c)))) for c in rgb)


def _outline_col(fill_hex, factor=0.5, max_v=0.42):
    r, g, b = (c * factor for c in _rgb(fill_hex))
    v = max(r, g, b) / 255.0
    if v > max_v:
        k = max_v / v
        r, g, b = r * k, g * k, b * k
    return (int(r), int(g), int(b))


def _px(point):
    scene = bpy.context.scene
    co = world_to_camera_view(scene, scene.camera, point)
    w, h = scene.render.resolution_x, scene.render.resolution_y
    return (co.x * w, (1.0 - co.y) * h)


def _paths(rig, pose_a, pose_b, joint, points, t0=0.0, t1=1.0, n=14):
    """Screen px paths of `points` (char rest space on `joint`) from pose_a to pose_b."""
    j = rig.joints[joint]
    locs = [Vector(p) - rig.rest[joint] for p in points]
    out = [[] for _ in points]
    for k in range(n + 1):
        t = t0 + (t1 - t0) * k / n
        rig.apply(lerp_pose(pose_a, pose_b, t))
        bpy.context.view_layer.update()
        m = j.matrix_world
        for i, l in enumerate(locs):
            out[i].append(_px(m @ l))
    return out


def _point(rig, pose, joint, p):
    rig.apply(pose)
    bpy.context.view_layer.update()
    return _px(rig.joints[joint].matrix_world @ (Vector(p) - rig.rest[joint]))


def _feet_px(rig):
    return _px(Vector((0.0, 0.0, 0.0)))


def _S(pts):
    return [(x * SS, y * SS) for x, y in pts]


def _poly(d, pts, fill, outline, ow):
    P = _S(pts)
    d.polygon(P, fill=fill)
    if ow > 0:
        d.line(P + [P[0]], fill=outline, width=max(1, int(ow * SS)), joint="curve")


def _stroke(d, pts, col, w):
    P = _S(pts)
    d.line(P, fill=col, width=max(1, int(w * SS)), joint="curve")
    r = w * SS / 2
    for x, y in (P[0], P[-1]):
        d.ellipse((x - r, y - r, x + r, y + r), fill=col)


def _taper(u, t0=0.0):
    return t0 + (1 - t0) * (u ** 0.75)


def _norm(v):
    L = math.hypot(*v) or 1.0
    return (v[0] / L, v[1] / L)


# -- painters -------------------------------------------------------------------------------
def _arc(d, rig, pa, pb, spec, lu):
    inner, outer = _paths(rig, pa, pb, spec["joint"], [spec["inner"], spec["outer"]],
                          spec.get("t0", 0.0), spec.get("t1", 0.9), spec.get("samples", 16))
    n = len(outer)
    tp = spec.get("taper", 0.0)
    # band < 1 fills only the outer part of the swept area (a hollow whirl ring instead of a
    # solid pie disc; use it whenever inner is the hand and the sweep is a full turn)
    band = spec.get("band", 1.0)
    top, bot = [], []
    for k in range(n):
        u = k / (n - 1)
        w = _taper(u, tp) * band
        o, i = outer[k], inner[k]
        top.append(o)
        bot.append((o[0] + (i[0] - o[0]) * w, o[1] + (i[1] - o[1]) * w))
    fill = _rgb(mix(spec["color"], "#FFFFFF", spec.get("white", 0.3)))
    line = _outline_col(spec["color"])
    ow = spec.get("outline_lu", 1.4) * lu
    _poly(d, top + bot[::-1], fill + (255,), line + (255,), ow)
    # speed lines: trailing strokes just outside the outer edge
    nl = spec.get("lines", 3)
    for m in range(nl):
        off = (m + 1) * spec.get("line_gap_lu", 2.6) * lu
        a = int(n * (0.05 + 0.12 * m))
        b = int(n * (0.55 - 0.08 * m))
        seg = []
        for k in range(a, max(a + 2, b)):
            k2 = min(k, n - 2)
            dx, dy = top[k2 + 1][0] - top[k2][0], top[k2 + 1][1] - top[k2][1]
            nx, ny = _norm((dy, -dx))
            # the outward side: away from the inner path
            ix, iy = inner[k2][0] - top[k2][0], inner[k2][1] - top[k2][1]
            if nx * ix + ny * iy > 0:
                nx, ny = -nx, -ny
            seg.append((top[k2][0] + nx * off, top[k2][1] + ny * off))
        if len(seg) >= 2:
            _stroke(d, seg, line + (230,), spec.get("line_lu", 1.5) * lu)


def _claw(d, rig, pa, pb, spec, lu):
    paths = _paths(rig, pa, pb, spec["joint"], spec["points"], spec.get("t0", 0.0),
                   spec.get("t1", 1.0), 14)
    fill = _rgb(mix(spec["color"], "#FFFFFF", spec.get("white", 0.45)))
    line = _outline_col(spec["color"])
    w = spec.get("width_lu", 3.2) * lu
    for path in paths:
        n = len(path)
        top, bot = [], []
        for k in range(n):
            u = k / (n - 1)
            ww = w * (math.sin(math.pi * min(1.0, u * 1.15)) ** 0.8) * 0.5 + 0.5
            k2 = min(k, n - 2)
            dx, dy = path[k2 + 1][0] - path[k2][0], path[k2 + 1][1] - path[k2][1]
            nx, ny = _norm((dy, -dx))
            top.append((path[k][0] + nx * ww, path[k][1] + ny * ww))
            bot.append((path[k][0] - nx * ww, path[k][1] - ny * ww))
        _poly(d, top + bot[::-1], fill + (255,), line + (255,), 1.0 * lu)


def _streak(d, rig, pa, pb, spec, lu):
    (path,) = _paths(rig, pa, pb, spec["joint"], [spec["point"]], spec.get("t0", 0.0),
                     spec.get("t1", 0.92), 2)
    a, b = path[0], path[-1]
    dx, dy = _norm((b[0] - a[0], b[1] - a[1]))
    nx, ny = -dy, dx
    w = spec.get("width_lu", 5.0) * lu / 2
    fill = _rgb(mix(spec["color"], "#FFFFFF", spec.get("white", 0.3)))
    line = _outline_col(spec["color"])
    pts = [a, (b[0] + nx * w, b[1] + ny * w), (b[0] + dx * w * 0.6, b[1] + dy * w * 0.6),
           (b[0] - nx * w, b[1] - ny * w)]
    _poly(d, pts, fill + (255,), line + (255,), 1.2 * lu)
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    for m, s in ((1, 1.0), (-1, 0.8)):
        off = (w + 2.2 * lu) * m
        p0 = (a[0] + dx * L * 0.15 + nx * off, a[1] + dy * L * 0.15 + ny * off)
        p1 = (a[0] + dx * L * (0.15 + 0.6 * s) + nx * off, a[1] + dy * L * (0.15 + 0.6 * s) + ny * off)
        _stroke(d, [p0, p1], line + (230,), 1.4 * lu)


DUST = "#E6D8BE"


def _dust(d, rig, pb, spec, lu):
    if "joint" in spec:
        cx, cy = _point(rig, pb, spec["joint"], spec["point"])
        if spec.get("ground_snap"):
            cy = _feet_px(rig)[1]
    else:
        fx, fy = _feet_px(rig)
        gx, gz = spec["ground"]
        cx, cy = fx + gx * lu, fy - gz * lu
    size = spec.get("size_lu", 8.0) * lu
    col = _rgb(spec.get("color", DUST))
    dark = tuple(int(c * 0.78) for c in col)
    line = _outline_col(spec.get("color", DUST), 0.55, 0.45)
    rng = np.random.default_rng(spec.get("seed", 3))
    n = spec.get("puffs", 5)
    spread = spec.get("spread", 1.0)
    dirx = spec.get("dir", 0.0)
    blobs = []
    for k in range(n):
        u = (k / max(1, n - 1) - 0.5) * 2 if n > 1 else 0.0
        r = size * (0.62 - 0.22 * abs(u)) * (0.85 + 0.3 * rng.random())
        x = cx + u * size * 1.1 * spread + dirx * size * 0.4 * (1 - abs(u))
        y = cy - r * 0.55 - size * 0.15 * (1 - abs(u)) * rng.random()
        blobs.append((x, y, r))
    ow = 1.1 * lu
    for x, y, r in blobs:  # outline pass
        R = (r + ow) * SS
        d.ellipse((x * SS - R, y * SS - R, x * SS + R, y * SS + R), fill=line + (255,))
    for x, y, r in blobs:  # shadow band
        R = r * SS
        d.ellipse((x * SS - R, y * SS - R, x * SS + R, y * SS + R), fill=dark + (255,))
    for x, y, r in blobs:  # lit tops
        R = r * SS * 0.86
        d.ellipse((x * SS - R, (y - r * 0.16) * SS - R, x * SS + R, (y - r * 0.16) * SS + R),
                  fill=col + (255,))


def _burst(d, rig, pb, spec, lu):
    cx, cy = _point(rig, pb, spec["joint"], spec["point"])
    line = _rgb(spec.get("color", "#FFF4D6"))
    dark = _outline_col(spec.get("color", "#FFF4D6"), 0.45, 0.4)
    r0, r1 = spec.get("r0_lu", 7.0) * lu, spec.get("r1_lu", 12.0) * lu
    n = spec.get("n", 6)
    a0 = spec.get("a0", 0.0)
    arc = spec.get("arc", 360.0)
    for k in range(n):
        a = math.radians(a0 + arc * (k + 0.5) / n)
        p0 = (cx + math.cos(a) * r0, cy - math.sin(a) * r0)
        p1 = (cx + math.cos(a) * r1, cy - math.sin(a) * r1)
        _stroke(d, [p0, p1], dark + (255,), 2.6 * lu)
        _stroke(d, [p0, p1], line + (255,), 1.3 * lu)


def _rings(d, rig, pb, spec, lu):
    cx, cy = _point(rig, pb, spec["joint"], spec["point"])
    col = _rgb(spec.get("color", "#FFF4D6"))
    dark = _outline_col(spec.get("color", "#FFF4D6"), 0.45, 0.4)
    a0, a1 = spec.get("a0", -60.0), spec.get("a1", 60.0)
    for k, r in enumerate(spec.get("radii_lu", (8.0, 13.0))):
        R = r * lu * SS
        box = (cx * SS - R, cy * SS - R, cx * SS + R, cy * SS + R)
        w = int((2.4 - 0.4 * k) * lu * SS)
        d.arc(box, -a1, -a0, fill=dark + (255,), width=w + int(1.6 * lu * SS))
        d.arc(box, -a1, -a0, fill=col + (255,), width=w)


def paint_frame(rig, clip, poses, idx, out_path):
    """Paints clip.overlays2[idx] for unique frame idx into out_path (RGBA, frame size)."""
    specs = getattr(clip, "overlays2", {}).get(idx)
    if os.path.exists(out_path):
        os.remove(out_path)
    if not specs:
        return None
    scene = bpy.context.scene
    W, H = scene.render.resolution_x, scene.render.resolution_y
    img = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    lu = C.PX_PER_LU
    seq = clip.sequence
    for spec in specs:
        prev = spec.get("from")
        if prev is None:
            step = seq.index(idx)
            prev = seq[step - 1] if step > 0 else idx
        pa, pb = poses[prev], poses[idx]
        kind = spec["kind"]
        if kind == "arc":
            _arc(d, rig, pa, pb, spec, lu)
        elif kind == "claw":
            _claw(d, rig, pa, pb, spec, lu)
        elif kind == "streak":
            _streak(d, rig, pa, pb, spec, lu)
        elif kind == "dust":
            _dust(d, rig, pb, spec, lu)
        elif kind == "burst":
            _burst(d, rig, pb, spec, lu)
        elif kind == "rings":
            _rings(d, rig, pb, spec, lu)
    img = img.resize((W, H), Image.Resampling.LANCZOS)
    img.save(out_path)
    return out_path
