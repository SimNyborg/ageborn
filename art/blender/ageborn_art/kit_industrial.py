"""Industrial Age cartoon kit v2 (art director plan 2026-09-30): helpers the Industrial units share
on top of `moves.py`, `face.py`, `smear2.py` and `kit_medieval.py`. Kept in its own module so the
older `rigs_industrial.py` API (re-exported from the Modern rigs) stays unchanged.

  head_face()   the round cartoon head plus the face kit (big eyes with a `pupils` joint, a `brow`
                joint, a default mouth, lids, squeeze, X, spiral, grit, yell, O, KO tongue); call
                it instead of `head_ball` + `face`
  cog()         the Industrial emblem as a decal: a cream cog (ring of teeth, a hub hole) laid on
                a team slab so the slab is broken up (A11 detail bible 3.4)
  stripes()     diagonal hazard stripes as decals (warning bands on crates, hulls and plinths)
  loose()       a hidden root-level copy of a prop (a hat, a wrench) that flies off in a death
  hat_pop()     the loose prop's path for a D1 death (up, spinning, landing behind)
  gauge()       a brass pressure gauge with a needle on its own joint (`<name>_needle`)
  aim_arm()     arm channels from WORLD angles (the torso lean is subtracted first)
"""
import math

from . import face as F
from . import kit_medieval as K
from . import rigs_industrial as I
from .geometry import Geo

CREAM = "#E8DFC8"
SOOT = "#3A3533"


def head_face(rig, skin=I.SKIN, brow=I.HAIR, brow_angry=True, center=(2.0, 0.0, 48.5),
              r=(11.8, 11.2, 11.6), nose=(13.8, -0.6, 47.2), nose_r=(3.6, 3.2, 3.4), cx=12.2, cz=50.4,
              eye_dy=(-4.8, 4.4), eye_r=(3.9, 3.6, 4.6), mouth_w=5.8, mouth_dz=-8.6, extra_geos=(),
              mouth_shape="grim", brow_w=1.1):
    """Head, jaw and nose (skin) plus face2 on `head`. Returns the Face (for more decals)."""
    head = Geo().blob(center, r, p=2.3)
    head.blob((center[0] + 4, 0, center[2] - 5.5), (8.6, 9.4, 6.2), p=2.2)
    head.blob(nose, nose_r, p=2.0)
    face = K.face2(rig, [head], skin, cx=cx, cz=cz, eye_dy=eye_dy, eye_r=eye_r, pupil_r=(1.6, 2.4, 2.7),
                   brow=brow, brow_angry=brow_angry, brow_w=brow_w, mouth_w=mouth_w, mouth_dz=mouth_dz,
                   extra_geos=extra_geos, eye_at=(cx + 1.9, cz), mark_r=eye_r[2] * 0.95,
                   mouth_shape=mouth_shape, mouth_x=cx + 1.4)
    rig.part("head", head, skin)
    return face


def cog(face, g, center_xz, s=1.0, teeth=8, depth=0.4):
    """Cog emblem decal centred at screen (x, z): a toothed ring about 7 x s lu across with a hole."""
    c = face.hit(*center_xz)
    ro, ri, rt = 2.7 * s, 1.35 * s, 3.55 * s
    ring = F.ellipse(0, 0, ro, ro, 20)
    hole = F.ellipse(0, 0, ri, ri, 12)
    # the ring as a thick stroke around the hole (decals are convex polygons; a stroke keeps the hole)
    mid = [((ro + ri) / 2 * math.cos(2 * math.pi * k / 20), (ro + ri) / 2 * math.sin(2 * math.pi * k / 20))
           for k in range(21)]
    face.stroke(g, c, mid, ro - ri, depth)
    for k in range(teeth):
        a = 2 * math.pi * (k + 0.5) / teeth
        ca, sa = math.cos(a), math.sin(a)
        w = 0.95 * s
        pts = [(ca * (ro - 0.3) - sa * w, sa * (ro - 0.3) + ca * w), (ca * rt - sa * w * 0.8, sa * rt + ca * w * 0.8),
               (ca * rt + sa * w * 0.8, sa * rt - ca * w * 0.8), (ca * (ro - 0.3) + sa * w, sa * (ro - 0.3) - ca * w)]
        face.decal(g, c, pts, depth)
    del ring, hole
    return g


def stripes(face, g, center_xz, w, h, n=4, band=1.0, slant=0.6, depth=0.4):
    """Diagonal hazard bands (every other band painted) in a w x h screen box at center."""
    c = face.hit(*center_xz)
    step = w / n
    for k in range(n):
        x0 = -w / 2 + k * step
        x1 = x0 + step * 0.5 * band
        pts = [(x0, -h / 2), (x1, -h / 2), (x1 + slant * h, h / 2), (x0 + slant * h, h / 2)]
        pts = [(max(-w / 2, min(w / 2, u)), v) for u, v in pts]
        face.decal(g, c, pts, depth)
    return g


def loose(rig, name, at, build):
    """A hidden root-level joint `name` at `at` holding a copy of a prop built by build(joint)."""
    rig.joint(name, "root", at, hidden=True)
    build(name)


# a hat or helmet popping off in a D1 death: (x, z, r) per die step, None = still on the head. It
# flies up spinning and lands on the ground behind the head (z = -land, the hat's rest height).
def hat_pop(land=55.0, back=58.0):
    path = [None, (-2.0, 12.0, 40), (-7.0, 22.0, 120), (-13.0, 20.0, 210), (-20.0, 6.0, 290),
            (-27.0, -land * 0.45, 340), (-back + 4.0, -land + 3.0, 362), (-back, -land, 360),
            (-back, -land, 360), (-back, -land, 360)]
    return path


HAT_POP = hat_pop()


def gauge(rig, joint, at, r=3.2, name="gauge", normal=(1.0, -1.0), face_col=CREAM):
    """A brass pressure gauge (rim, cream face) facing `normal` (x, y) with a needle joint."""
    x, y, z = at
    nx, ny = normal
    L = math.hypot(nx, ny)
    nx, ny = nx / L, ny / L
    g = Geo().lathe([(0, 0), (r, 0), (r + 0.4, 1.0), (r, 1.6), (0, 1.8)], (x, y, z), (x + nx * 1.8, y + ny * 1.8, z),
                    segs=18)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.6)
    g = Geo().blob((x + nx * 1.9, y + ny * 1.9, z), (0.3 + abs(ny) * (r - 0.8), 0.3 + abs(nx) * (r - 0.8), r - 0.8),
                   p=2.2)
    rig.part(joint, g, face_col, highlight=False, outline=0)
    nd = f"{name}_needle"
    rig.joint(nd, joint, (x + nx * 2.3, y + ny * 2.3, z))
    g = Geo().capsule((x + nx * 2.3, y + ny * 2.3, z), (x + nx * 2.3, y + ny * 2.3, z + r * 0.8), 0.45, 0.3)
    rig.part(nd, g, "#8A3A2A", outline=0, highlight=False)
    return nd


def aim_arm(s, a_world, f_world, lean, w_world=None, w_rest=90.0):
    """I.arm with WORLD angles: arm and weapon angles are torso-space, so subtract the lean."""
    return I.arm(s, a_world - lean, f_world - lean, None if w_world is None else w_world - lean, w_rest=w_rest)
