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


# -- walk v3 legs (ANIM_SPEC 2.0 rule 5, G1): longer legs and planted feet ---------------------
# The Gunpowder bipeds use `kit_medieval.skeleton_v3` (the same joint layout as
# `rigs_gunpowder.skeleton`, with the thighs at 19.5 lu, the knees at 11.5, `foot_r/l` joints at
# the ankle and the upper body lifted 2 lu) and these legs: breeches, stockings or gaiters (or
# tall boots), and short buckled shoes (8 lu) on the foot joints that roll on the toe-off. The
# far leg is 20% darker so the two feet read apart at 62 px.
def legs_v3(rig, breeches, shoe, stocking=None, thigh_r=4.7, far=0.8, shoe_finish="gloss",
            buckle=True, gaiter_buttons=None, tall_boot=False, cuff=None):
    """Legs for a `kit_medieval.skeleton_v3` biped; adds the `_foot` / `_foot_l` sole trackers.
    `tall_boot` draws a boot shaft up to the knee (with a turned-down `cuff` colour if given)."""
    from . import colors as C
    from . import kit_medieval as K
    from . import rigs_gunpowder as B
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        k = 1.0 if s == "r" else far
        br, st, sh = C.scale(breeches, k), C.scale(stocking or breeches, k), C.scale(shoe, k)
        g = Geo().capsule((0, y, K.V3_THIGH_Z), (0.5, y, K.V3_KNEE_Z), thigh_r, thigh_r - 0.5)
        g.blob((0.5, y, K.V3_KNEE_Z + 0.6), (thigh_r - 0.2, thigh_r - 0.2, 1.6), p=2.6)   # knee band
        rig.part(f"thigh_{s}", g, br)
        g = Geo().capsule((0.5, y, K.V3_KNEE_Z), (1.0, y, K.V3_ANKLE_Z + 0.4), thigh_r - 0.7, 3.7)
        rig.part(f"shin_{s}", g, sh if tall_boot else st, finish=shoe_finish if tall_boot else "matte")
        if tall_boot:
            g = Geo().capsule((0.9, y, 5.0), (0.6, y, K.V3_KNEE_Z - 0.5), 4.3, 4.7)
            rig.part(f"shin_{s}", g, sh, finish=shoe_finish)
            g = Geo().blob((0.5, y, K.V3_KNEE_Z), (5.2, 5.0, 1.7), p=2.6)
            rig.part(f"shin_{s}", g, C.scale(cuff or shoe, k), finish=shoe_finish)
        else:
            g = Geo().blob((0.9, y, 5.6), (3.8, 3.9, 2.0), p=2.6)                 # shoe heel/ankle
            rig.part(f"shin_{s}", g, sh, finish=shoe_finish)
        g = Geo().blob((2.5, y, 2.4), (4.0, 4.3, 2.5), p=2.8, taper=(1.02, 0.86))   # 8 lu shoe
        rig.part(f"foot_{s}", g, sh, finish=shoe_finish)
        if buckle and not tall_boot:
            g = Geo().blob((3.6, y - 3.4 * (1 if s == "r" else -1), 4.0), (1.6, 0.9, 1.3), p=2.4)
            rig.part(f"foot_{s}", g, C.scale(B.BRASS, k), finish="metal", outline=0.4)
        if gaiter_buttons and s == "r":
            g = Geo()
            for z in (6.8, 9.2):
                g.sphere((2.0, y - 4.0, z), 0.9, cuts=2)
            rig.part("shin_r", g, gaiter_buttons, finish="metal", outline=0)
    rig.track("_foot", "foot_r", (2.6, -B.LEG_Y, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, B.LEG_Y, 0.0))


def plant(rig, pose, legs, r=(2.0, 0.0, 0.0), l=(-2.0, 0.0, 0.0), report=None, max_drop=4.0):
    """Feet planted by IK in an attack, hit or idle pose (see `rigs_bronze.plant`)."""
    from . import rigs_bronze as RB
    return RB.plant(rig, pose, legs, r=r, l=l, report=report, max_drop=max_drop)
