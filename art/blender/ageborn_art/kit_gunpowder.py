"""Gunpowder Age cartoon kit v2 (art director plan 2026-09-30): helpers the Gunpowder units and
turrets share on top of `moves.py`, `face.py`, `smear2.py` and `kit_medieval.py`. Kept in its own
module so the older `rigs_gunpowder.py` API (also used by the Scorpion, the War Chariot and the
Land Dreadnought) stays unchanged.

  anchor()       the Gunpowder emblem as a decal: a cream anchor (ring, stock, shank, arms with
                 flukes) laid on a team slab so the slab is broken up (A11 detail bible 3.4)
  stripes()      flat horizontal bands laid on a surface (a striped shirt, a barrel band)
  head_geos()    a round cartoon head (skull, jaw, nose) as geos, not yet parted (the face kit
                 ray-casts them first)
  horse_leg()    a shaped horse leg: forearm/gaskin, knee or hock, cannon, fetlock, hoof
  smoke_cloud()  a hidden joint with a big cartoon powder-smoke cloud (lumpy, two tones)
"""
import math

from . import face as F
from .geometry import Geo

CREAM = "#EFE6CF"
SMOKE = "#E9E6DE"
SMOKE_DK = "#C9C4B8"


def anchor(face, g, center_xz, s=1.0, depth=0.4, w=1.6):
    """Anchor emblem decal centred at screen (x, z) (about 7.5 x s lu tall)."""
    c = face.hit(*center_xz)
    lw = w * s
    face.stroke(g, c, [(0.0, 2.5 * s), (0.0, -2.9 * s)], lw, depth)            # shank
    face.stroke(g, c, [(-1.9 * s, 1.5 * s), (1.9 * s, 1.5 * s)], lw * 0.9, depth)  # stock
    ring = F.ellipse(0.0, 3.5 * s, 1.15 * s, 1.15 * s, 10)
    face.stroke(g, c, ring + [ring[0]], lw * 0.8, depth)
    arc = [(2.9 * s * math.cos(math.radians(a)), -0.9 * s + 2.2 * s * math.sin(math.radians(a)))
           for a in range(190, 351, 20)]
    face.stroke(g, c, arc, lw, depth)
    for sx in (-1, 1):   # flukes: little arrow heads at the arm tips
        x0, z0 = 2.75 * s * sx, -1.2 * s
        face.decal(g, c, [(x0 - 0.2 * s * sx, z0 + 1.6 * s), (x0 + 1.1 * s * sx, z0 - 0.2 * s),
                          (x0 - 1.0 * s * sx, z0 - 0.2 * s)], depth)
    return g


def stripes(face, g, pts_z, x0, x1, w, depth=0.4):
    """Horizontal bands (screen space) at heights pts_z from x0 to x1, each w lu thick."""
    for z in pts_z:
        c = face.hit((x0 + x1) / 2, z)
        half = (x1 - x0) / 2
        face.decal(g, c, [(-half, w / 2), (half, w / 2), (half, -w / 2), (-half, -w / 2)], depth)
    return g


def head_geos(center=(2.0, 0.0, 48.5), r=(11.6, 11.0, 11.4), nose=(14.0, -0.6, 46.4),
              nose_r=(3.6, 3.2, 3.4), jaw=True):
    head = Geo().blob(center, r, p=2.3)
    if jaw:
        head.blob((center[0] + 4, 0, center[2] - 5.5), (8.6, 9.4, 6.2), p=2.2)
    head.blob(nose, nose_r, p=2.0)
    return head


def horse_leg(rig, name, parent, x, y, z_top, front, coat, points, hoof, feather=None,
              dark="#23262E"):
    """A shaped horse leg (knee on the foreleg, hock on the hind leg), dark points below the
    knee, a fetlock tuft and a hoof with a toe line. Joints `name` and `name2`."""
    rig.joint(name, parent, (x, y, z_top))
    x2 = x + (1.5 if front else -4.5)
    rig.joint(f"{name}2", name, (x2, y, 18.0))
    if front:
        g = Geo().capsule((x, y, z_top), (x2, y, 18.0), 6.2, 3.8)
        g.blob((x2 + 0.6, y, 18.5), (3.9, 3.8, 3.4), p=2.2)
    else:
        g = Geo().capsule((x, y, z_top), (x2, y, 18.0), 7.4, 3.6)
        g.blob((x2 - 1.2, y, 18.8), (3.8, 3.6, 3.6), p=2.2)
    rig.part(name, g, coat)
    fx = x2 + (1.0 if front else 3.0)
    g = Geo().capsule((x2, y, 18.0), (fx, y, 7.0), 3.3, 3.0)
    rig.part(f"{name}2", g, points)
    g = Geo().blob((fx - 0.6, y, 7.2), (4.1, 4.2, 2.9), p=2.2)
    for dx in (-3.0, -0.8):
        g.lathe([(1.5, 0), (0, -2.8)], (fx + dx, y, 5.0), (fx + dx - 1.2, y, 2.4), segs=8)
    rig.part(f"{name}2", g, feather or points, finish="hair")
    g = Geo().blob((fx + 1.2, y, 2.7), (5.0, 4.5, 2.9), p=3.0, taper=(1.05, 0.82))
    rig.part(f"{name}2", g, hoof, finish="gloss")
    g = Geo().capsule((fx + 5.6, y - 3.5, 3.6), (fx + 5.8, y - 3.5, 0.8), 0.55)
    rig.part(f"{name}2", g, dark, outline=0, highlight=False)


def smoke_cloud(rig, parent, at, size=1.0, name="smoke", seed=0, hidden=True, balls=None):
    """A lumpy two-tone cartoon powder cloud on a hidden joint (scale it up as it billows)."""
    x, y, z = at
    k = size
    rig.joint(name, parent, at, hidden=hidden)
    balls = balls or ((0, 0, 5.2), (6.0, 1.8, 4.4), (-4.2, 3.6, 4.0), (2.4, 6.4, 3.8),
                      (9.8, -0.6, 3.2), (-7.2, 0.2, 3.0), (5.2, 5.6, 3.2))
    g = Geo()
    for dx, dz, r in balls:
        g.sphere((x + dx * k, y - 2, z + dz * k), r * k, cuts=4)
    rig.part(name, g, SMOKE, finish="dust", outline=0.8)
    g = Geo()
    for dx, dz, r in balls[:4]:
        g.sphere((x + dx * k + 0.6 * k, y + 1.5, z + dz * k - r * k * 0.45), r * k * 0.8, cuts=3)
    rig.part(name, g, SMOKE_DK, finish="dust", outline=0)
    return name
