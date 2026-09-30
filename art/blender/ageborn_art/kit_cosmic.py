"""Cosmic Age cartoon kit v2 (art director plan 2026-09-30): helpers the Cosmic units, turrets and
base share on top of `moves.py`, `face.py`, `smear2.py`, `kit_future.py` and `kit_medieval.py`.
Kept in its own module so the older `rigs_cosmic.py` API stays unchanged.

  visor()       a dark visor slot laid on a helmet or hood (a clipped shell) carrying the emissive
                glyph eyes of `kit_future.visor_face` in Cosmic violet (or mint): `eyes`, `g_angry`,
                `g_squint`, `g_hurt`, `eyes_x`, `g_spiral`, `g_wide`, `g_blink`, `g_happy`
  starmark()    the Cosmic emblem as a decal: a pale five-point star, laid on a team slab so the
                slab is broken up (A11 detail bible 3.4)
  specks()      a scatter of small four-point star specks (the starry cloak and robe lining)
  seam()        a panel seam with an emissive strip (Cosmic panel lines)
  hit_flyer()   a flyer hit: a tilt and a 4 lu drop, then a wobble back up
"""
import math

from . import face as FC
from . import kit_future as KF
from . import moves as M
from . import rigs_cosmic as K
from .geometry import Geo

STAR_PALE = "#F4F1FF"
VIO_EYE = "#D4AEFF"          # a light violet: reads on the dark visor at 1x
VIO_CORE = K.VIOLET_CORE


def visor(rig, joint, shell_c, shell_r, x0, z_top, z_bot, eye_at, eye_dx=(0.0, 4.0), eye_rx=1.8, eye_rz=2.4,
          color=VIO_EYE, core=VIO_CORE, band=K.VISOR, edge=K.VOID, tilt=0.0, grow=0.9, yaw_deg=None):
    """A dark visor cut from an ellipsoid shell slightly bigger than the helmet (front of `x0`,
    between `z_bot` and `z_top`) with glyph eyes at screen `eye_at` (x, z). Returns the Face."""
    g = Geo().blob(shell_c, (shell_r[0] + grow, shell_r[1] + grow, shell_r[2] + grow), p=2.5)
    g.clip((x0, 0, 0), (-1, 0, 0)).clip((0, 0, z_top), (0, 0, 1)).clip((0, 0, z_bot), (0, 0, -1))
    face = KF.visor_face(rig, joint, [g], eye_at, eye_dx=eye_dx, eye_rx=eye_rx, eye_rz=eye_rz, color=color,
                         core=core, tilt=tilt, yaw_deg=yaw_deg)
    rig.part(joint, g, band, finish="gloss", outline_hex=edge)
    return face


def star_pts(r_out, r_in, points=5, rot=90.0):
    out = []
    for k in range(points * 2):
        r = r_out if k % 2 == 0 else r_in
        a = math.radians(rot + 180.0 * k / points)
        out.append((r * math.cos(a), r * math.sin(a)))
    return out


def starmark(face, g, center_xz, s=1.0, depth=0.4, ring=False, w=1.0):
    """Five-point star decal about 6.4 x s lu across (optionally inside a thin ring)."""
    c = face.hit(*center_xz)
    face.decal(g, c, star_pts(3.3 * s, 1.35 * s), depth)
    if ring:
        face.stroke(g, c, FC.ellipse(0, 0, 4.6 * s, 4.6 * s, 20) + [(4.6 * s, 0.0)], w * s, depth)
    return g


def specks(rig, joint, pts, y, color=K.STAR, mint_at=None):
    """Four-point star specks at (x, z, r) on the plane y (a starry lining)."""
    g = Geo()
    for x, z, r in pts:
        g.star((x, y, z), r * 1.4, r * 0.55, 0.8, points=4)
    rig.part(joint, g, glow=color, outline=0)
    if mint_at:
        x, z, r = mint_at
        g = Geo().star((x, y, z), r * 1.4, r * 0.55, 0.8, points=4)
        rig.part(joint, g, glow=K.MINT, outline=0)


def seam(rig, joint, pts, r=0.7, color=K.MINT, edge=K.VOID):
    g = Geo()
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, r, segs=8, rings=2)
    rig.part(joint, g, glow=color, outline=0.6, outline_hex=edge)


# -- flyer hit (plan 2.4): a tilt and a 4 lu drop, a wobble back up ------------------------------
FLYER_HIT = [dict(z=-2.0, r=5.0, x=-2.0), dict(z=-4.0, r=8.0, x=-3.5), dict(z=-2.0, r=-3.0, x=-2.0),
             dict(z=0.6, r=2.0, x=-0.6), dict(z=0.0, r=0.0, x=0.0)]


def hit_flyer(k, center, scale=1.0):
    h = FLYER_HIT[k]
    return M.body_about(center, x=h["x"] * scale, z=h["z"] * scale, r=h["r"])
