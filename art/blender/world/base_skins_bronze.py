"""Bronze Age base skins as real models (PLAN 2c): `base.bronze@<skin>`.

Gilded Ziggurat (Epic, Wardrobe Crate; round 2; owner request 2026-10-08 "more base skins that are not just
a recolour"): the Ziggurat dressed for a sun festival. Every tier's coping is gold leaf with a gold
pyramid capstone on each front corner and a gold frieze under the cornice; the buttress panels carry
terracotta inlays with small gold rosettes (no lapis blue: it is the team hue); the stair has a terracotta
runner with gold rods and two seated sandstone lions with gilded manes at its foot. The summit shrine loses
its gable for a great sun disc crown: a gold ring of long and short rays round a pale gold face, raised on
a gilded post over a gold-edged entablature, with team curtains hung between the shrine's columns. The gate
pylon's doors are polished gold with a sun boss; gold braziers burn on the tier corners. Gold stays an
accent in area (A11, the orange team): the large areas are sandstone, the disc's face is pale.

The footprint, height band and the four mount platforms are the Ziggurat's (world/base_bronze.py,
common.BASE_MOUNTS): the gate pylon's roof, a cornice ledge, a corbelled balcony and the summit slab, each
with a gold rim. Team colour: the four long banners, the shrine curtains, the barge sail and the flags.

Crumble: 75% cracks, a gold capstone and a brazier knocked off, a blown hole in the lowest tier, rubble
with gold bits; 50% a burning breach that tears a banner, a lion's head knocked off, the balcony rail
sagging, the frieze cracked; 25% a big burning breach high on the third tier, the sun disc knocked askew on
its bent post, a curtain burnt away, the summit flag gone. Treasury: sacks and terracotta amphorae (1), a
granary with a gold dome (2), a trade barge with a team sail and gold cargo (3).
"""
import math
import random

from ageborn_art import rigs_bronze as P
from ageborn_art.geometry import Geo

from world.base_skins_kit import ashlar, flames, ring_blocks
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, project, prop_loop,
                          rock, rubble, topple_lu, window)

SAND = P.SAND            # sandstone (large areas)
SAND_LT = P.SAND_LT
SAND_DK = P.SAND_DK
SAND_DKR = "#978869"
GOLD = "#E3B84E"         # gold leaf (accents: copings, capstones, the disc's ring, manes)
GOLD_LT = "#F2D58A"
GOLD_DK = "#B98F35"
GOLD_FACE = "#F3E2B0"    # the sun disc's pale face
TERRA = "#B66E52"        # terracotta inlays and the stair runner
TERRA_DK = "#93553F"
CREAM = "#EFE6CF"
WOOD = "#8E7658"
WOOD_DK = "#5E4C3C"
LINEN = P.LINEN
SACK = "#CDB894"
CLAY = "#B98A66"
OLIVE = "#6F7F55"
OLIVE_DK = "#5A6845"
CRACK = "#5A4E40"
FIRE = "#FFD08A"
FLAME = "#FFA64D"
FIRE_CORE = "#FFF3D6"
HOLE = "#3A3129"
HOLE_IN = "#54483A"
POLISH = "bronze_rich"   # polished gold: a warm specular kept tight, so the gold colour shows

DEPTHS = [-40, -24, -40, -24]
CX = -98.0
Y0, Y1 = -44.0, 56.0
# tiers: (half width, z bottom, z top, front-face y), as the Ziggurat's
TIERS = [(90.0, 0.0, 56.0, -44.0), (72.0, 56.0, 120.0, -30.0), (56.0, 120.0, 190.0, -16.0), (40.0, 190.0, 256.0, -4.0)]
GATE = (-10.0, -46.0)
SX, SY = CX - 10, 12.0   # the summit shrine


def gtier(rig, joint, caps_joint, hw, z0, z1, yf, k):
    """One tier: the core, buttress panels with terracotta inlays and gold rosettes, a terracotta string
    course, a sandstone cornice over a gold frieze, gold-leaf coping and gold capstones on the front corners."""
    yb = Y1 - k * 8.0
    yc = (yf + yb) / 2
    hd = (yb - yf) / 2
    g = Geo()
    box(g, (CX, yc, (z0 + z1) / 2), (hw, hd, (z1 - z0) / 2), p=10)
    rig.part(joint, g, SAND_DK)
    g, inl, ros = Geo(), Geo(), Geo()
    n = 7 - k
    for i in range(n):
        x = CX - hw + (i + 0.5) * 2 * hw / n
        pw = hw / n - 3.4
        ph = (z1 - z0) / 2 - 7.0
        zc = (z0 + z1) / 2 - 2.0
        box(g, (x, yf - 0.8, zc), (pw, 1.4, ph), p=6, cuts=2)
        # a terracotta inlay: a band across the panel with a stepped notch, and a gold rosette over it
        box(inl, (x, yf - 2.0, zc - ph * 0.3), (pw * 0.8, 0.6, ph * 0.2), p=6, cuts=2)
        box(inl, (x, yf - 2.0, zc - ph * 0.3 + ph * 0.3), (pw * 0.42, 0.6, ph * 0.12), p=6, cuts=2)
        for a in range(0, 360, 72):
            ros.blob((x + math.cos(math.radians(a + 90)) * 1.9, yf - 2.6, zc + ph * 0.38 + math.sin(math.radians(a + 90)) * 1.9),
                     (1.5, 0.6, 1.1), p=2.0, cuts=2, rot=(0, -a, 0))
        ros.sphere((x, yf - 2.9, zc + ph * 0.38), 1.2, cuts=2)
    rig.part(joint, g, SAND, outline=0.5)
    rig.part(joint, inl, TERRA, outline=0.4)
    rig.part(joint, ros, GOLD, finish=POLISH, outline=0.3)
    g = Geo()
    box(g, (CX, yf - 1.2, z0 + 3.0), (hw + 0.6, 1.6, 2.4), p=6, cuts=2)
    rig.part(joint, g, TERRA_DK, outline=0.5)
    g = Geo()
    box(g, (CX, yc - 1.0, z1 - 1.8), (hw + 3.2, hd + 3.2, 2.6), p=6)
    rig.part(joint, g, SAND_LT)
    g = Geo()   # the gold frieze under the cornice
    box(g, (CX, yc - 1.0, z1 - 5.4), (hw + 2.0, hd + 2.2, 1.8), p=6, cuts=2)
    rig.part(joint, g, GOLD, finish=POLISH, outline=0.4)
    g = Geo()   # gold-leaf coping along the front and side edges of the roof
    box(g, (CX, yf - 3.4, z1 + 0.6), (hw + 3.6, 1.6, 1.3), p=6, cuts=2)
    for sx_ in (-1, 1):
        box(g, (CX + sx_ * (hw + 2.4), yc - 1.0, z1 + 0.6), (1.6, hd + 3.6, 1.3), p=6, cuts=2)
    rig.part(joint, g, GOLD_LT, finish=POLISH, outline=0.4)
    # gold pyramid capstones on the front corners (the right one of tier 0 falls at 75%)
    for sx_ in (-1, 1):
        g = Geo().lathe([(0, 0), (5.2, 0), (0, 8.6)], (CX + sx_ * (hw + 1.0), yf - 1.2, z1 + 1.6), segs=4, rot=(0, 0, 45))
        rig.part(caps_joint if (k == 0 and sx_ > 0) else joint, g, GOLD, finish=POLISH, outline=0.4)


def stairs(rig, joint):
    """The stair up the middle of the front faces (tiers 1-3), sandstone steps with a terracotta runner and
    gold stair rods."""
    g = Geo()
    for k, (hw, z0, z1, yf) in enumerate(TIERS[:3]):
        steps = 8
        for i in range(steps):
            z = z0 + (z1 - z0) * (i + 0.5) / steps
            y = yf - 12.0 + 11.0 * i / steps
            box(g, (CX, y, z), (13.0 - k * 1.5, 12.0 - 11.0 * i / steps, (z1 - z0) / steps / 2 + 0.2), p=8, cuts=2)
    rig.part(joint, g, SAND_LT, outline=0.5)
    g = Geo()
    for k, (hw, z0, z1, yf) in enumerate(TIERS[:3]):
        for s in (-1, 1):
            g.capsule((CX + s * (14.5 - k * 1.5), yf - 23.0, z0 + 2.0), (CX + s * (14.5 - k * 1.5), yf - 1.5, z1 + 1.0), 2.0)
    rig.part(joint, g, SAND_DKR, outline=0.5)
    g, r = Geo(), Geo()
    for k, (hw, z0, z1, yf) in enumerate(TIERS[:3]):
        steps = 8
        for i in range(steps):
            z = z0 + (z1 - z0) * (i + 0.5) / steps
            y = yf - 12.0 + 11.0 * i / steps - (12.0 - 11.0 * i / steps) - 0.4
            h = (z1 - z0) / steps / 2
            box(g, (CX, y, z), (5.2, 0.5, h + 0.2), p=6, cuts=2)
            box(g, (CX, y + 2.0, z + h), (5.2, 2.2, 0.4), p=6, cuts=2)
            r.capsule((CX - 6.4, y - 0.6, z + h - 0.4), (CX + 6.4, y - 0.6, z + h - 0.4), 0.55)
    rig.part(joint, g, TERRA, outline=0.3)
    rig.part(joint, r, GOLD_LT, finish=POLISH, outline=0)


def brazier(rig, joint, x, y, z, name):
    """A gold brazier on a sandstone foot with white-hot fire (its fire is the joint `name`)."""
    g = Geo()
    cyl(g, (x, y, z), (x, y, z + 9.0), 2.2, 1.6, bevel=0.3)
    rig.part(joint, g, SAND_DKR, outline=0.5)
    g = Geo().lathe([(0, 0), (6.2, 1.0), (7.6, 5.0), (7.0, 5.6), (0, 3.6)], (x, y, z + 8.0), (x, y, z + 14.0), segs=20)
    rig.part(joint, g, GOLD, finish=POLISH)
    g = Geo().lathe([(7.2, 0), (7.8, 0.4), (7.8, 1.2), (7.2, 1.4)], (x, y, z + 12.6), (x, y, z + 13.6), segs=20)
    rig.part(joint, g, GOLD_LT, finish=POLISH, outline=0.4)
    rig.joint(name, joint, (x, y, z + 14.0))
    g = Geo().blob((x, y - 1, z + 21.0), (7.0, 5.0, 10.6), p=2.0, taper=(1.0, 0.22))
    for dx, h in ((-4.2, 7.0), (4.0, 8.4)):
        g.blob((x + dx, y - 1.2, z + 17.0 + h * 0.5), (2.4, 2.2, h * 0.6), p=2.0, taper=(1.0, 0.2))
    rig.part(name, g, glow=FLAME, outline=0.8, outline_hex="#C9782E")
    g = Geo().blob((x, y - 2.4, z + 19.0), (4.4, 3.4, 6.8), p=2.0, taper=(1.0, 0.3))
    rig.part(name, g, glow=FIRE, outline=0)
    g = Geo().blob((x, y - 4, z + 17.4), (2.4, 2.0, 3.6), p=2.0, taper=(1.0, 0.3))
    rig.part(name, g, glow=FIRE_CORE, outline=0)


def breach(rig, joint, x, y, z, w, h, seed=0):
    """A blown-out hole in a tier face: a dark jagged opening, a lighter inner wall, broken block ends."""
    rnd = random.Random(seed)
    n = 14
    pts, inner = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.72 + 0.28 * rnd.random()
        pts.append((x + math.cos(a) * w / 2 * k, z + math.sin(a) * h / 2 * k))
        inner.append((x + math.cos(a) * w / 2 * k * 0.72, z + math.sin(a) * h / 2 * k * 0.66 - h * 0.08))
    g = Geo().slab(pts, y - 2.4, 1.6)
    rig.part(joint, g, HOLE_IN, outline=0.6, outline_hex=HOLE)
    g = Geo().slab(inner, y - 3.4, 1.0)
    rig.part(joint, g, HOLE, outline=0)
    g = Geo()
    for i in range(0, n, 3):
        px_, pz_ = pts[i]
        box(g, (px_, y - 3.0, pz_), (2.6 + 1.6 * rnd.random(), 1.8, 2.0 + 1.4 * rnd.random()), p=5, cuts=2)
    rig.part(joint, g, SAND_LT, outline=0.5)


def blaze(rig, joint, x, y, z, size, name):
    """A hidden fire in a breach: three layered flame tongues (outer, mid, white-hot core)."""
    rig.joint(name, joint, (x, y, z), hidden=True)
    k = size
    g = Geo()
    for dx, hh, r in ((0.0, 16.0, 6.4), (-7.0, 11.0, 4.2), (7.0, 12.5, 4.6), (-3.2, 8.0, 3.4)):
        g.blob((x + dx * k, y - 4.0, z + hh * k * 0.55), (r * k, 3.4 * k, hh * k * 0.62), p=2.0, taper=(1.0, 0.2))
    rig.part(name, g, glow=FLAME, outline=0.8, outline_hex="#C9782E")
    g = Geo()
    for dx, hh, r in ((0.0, 11.0, 4.2), (-6.0, 7.0, 2.6), (6.0, 8.0, 2.8)):
        g.blob((x + dx * k, y - 5.2, z + hh * k * 0.5), (r * k, 2.6 * k, hh * k * 0.55), p=2.0, taper=(1.0, 0.25))
    rig.part(name, g, glow=FIRE, outline=0)
    g = Geo().blob((x, y - 6.4, z + 4.0 * k), (2.6 * k, 2.0 * k, 4.0 * k), p=2.0, taper=(1.0, 0.3))
    rig.part(name, g, glow=FIRE_CORE, outline=0)
    return name


def banner(rig, joint, x, y, z_top, h, w=16.0):
    """A long team banner on a gold rod, with a sun glyph in cream."""
    g = Geo().slab([(x - w / 2, z_top), (x + w / 2, z_top), (x + w / 2, z_top - h + 8), (x, z_top - h),
                    (x - w / 2, z_top - h + 8)], y, 1.6)
    rig.part(joint, g, team=True)
    g = Geo().capsule((x - w / 2 - 2, y - 0.6, z_top + 1), (x + w / 2 + 2, y - 0.6, z_top + 1), 1.3)
    g.sphere((x - w / 2 - 2.6, y - 0.6, z_top + 1), 1.8, cuts=2).sphere((x + w / 2 + 2.6, y - 0.6, z_top + 1), 1.8, cuts=2)
    rig.part(joint, g, GOLD, finish=POLISH, outline=0.4)
    g = Geo()
    zc = z_top - h * 0.42
    g.sphere((x, y - 1.6, zc), w * 0.16, cuts=3)
    for a in range(0, 360, 45):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((x + ca * w * 0.24, y - 1.5, zc + sa * w * 0.24), (x + ca * w * 0.36, y - 1.5, zc + sa * w * 0.36), 0.7)
    rig.part(joint, g, CREAM, outline=0.3)


def lion(rig, joint, x, y, facing=1, seed=0, k=1.0):
    """A seated sandstone lion with a gilded mane and collar on a low plinth, facing the lane (+1) or back;
    `k` scales it (the parts are authored at k = 1, about 34 lu tall)."""
    s = facing
    from world.base_skins_kit import Scaled
    rig = Scaled(rig, (x, y, 0.0), k)
    g = Geo()
    box(g, (x, y, 3.0), (11.0, 9.0, 3.0), p=6)
    rig.part(joint, g, SAND_DKR, outline=0.5)
    g = Geo()
    box(g, (x, y - 0.4, 6.4), (10.0, 8.2, 0.8), p=6, cuts=2)
    rig.part(joint, g, GOLD, finish=POLISH, outline=0.3)
    body = Geo()
    body.blob((x - s * 2.5, y + 1.0, 15.0), (7.4, 6.6, 9.0), p=2.2, cuts=4, rot=(0, s * 14, 0))       # the seated body
    body.blob((x - s * 5.5, y + 2.0, 10.0), (5.6, 6.2, 5.0), p=2.2, cuts=4)                          # the haunch
    for dy in (-3.2, 3.2):
        body.capsule((x + s * 3.0, y + dy - 1.5, 20.0), (x + s * 4.2, y + dy - 1.5, 7.8), 2.0, 1.8)     # front legs
        body.blob((x + s * 5.0, y + dy - 2.2, 7.6), (2.6, 2.0, 1.4), p=2.2, cuts=2)                    # paws
    body.blob((x + s * 3.6, y - 1.0, 30.0), (4.8, 4.4, 4.6), p=2.2, cuts=4)                            # head
    body.blob((x + s * 7.2, y - 1.4, 28.8), (2.6, 2.6, 2.2), p=2.2, cuts=3)                            # muzzle
    tail = [(x - s * 9.0, y + 3.0, 7.0), (x - s * 13.0, y + 1.0, 9.0), (x - s * 13.5, y - 1.0, 15.0), (x - s * 11.5, y - 2.0, 18.0)]
    for a, b in zip(tail, tail[1:]):
        body.capsule(a, b, 1.1, 1.0, segs=8, rings=1)
    rig.part(joint, body, SAND_LT)
    mane = Geo()
    rnd = random.Random(seed)
    for k in range(11):
        a = math.radians(-100 + k * 30 + rnd.uniform(-6, 6))
        r = 6.4 + rnd.uniform(-0.6, 0.8)
        mane.blob((x + s * 2.4 + math.cos(a) * r * 0.9 * s, y + 0.6, 30.0 + math.sin(a) * r), (2.8, 3.6, 2.2), p=2.0, cuts=3,
                  rot=(0, -math.degrees(a) * s, 0))
    mane.blob((x + s * 1.0, y + 0.8, 24.0), (5.2, 5.0, 4.2), p=2.2, cuts=3)
    mane.blob((tail[-1][0], tail[-1][1] - 0.4, tail[-1][2] + 1.2), (1.9, 1.7, 2.2), p=2.0, cuts=2)
    rig.part(joint, mane, GOLD, finish=POLISH, outline=0.5)
    g = Geo()
    g.sphere((x + s * 8.6, y - 2.6, 29.6), 0.9, cuts=2)
    g.sphere((x + s * 5.6, y - 4.6, 31.4), 0.7, cuts=2)
    g.sphere((x + s * 5.6, y + 2.0, 31.4), 0.7, cuts=2)
    rig.part(joint, g, "#3A2E24", outline=0, highlight=False)


def sun_disc(rig, joint, x, y, z, r):
    """The sun disc crown, facing the camera: a pale gold face with a boss and a ring, 16 rays (long gold,
    short pale), and a gilded post under it."""
    g = Geo()
    cyl(g, (x, y + 1.4, z), (x, y - 1.4, z), r * 0.78, bevel=0.6, segs=40)
    rig.part(joint, g, GOLD_FACE, finish="gloss")
    g = Geo()
    g.lathe([(r * 0.68, -1.6), (r * 0.86, -1.6), (r * 0.86, 1.6), (r * 0.68, 1.6)], (x, y - 0.6, z), (x, y - 1.6, z), segs=40)
    rig.part(joint, g, GOLD, finish=POLISH, outline=0.5)
    g = Geo()
    g.sphere((x, y - 3.2, z), r * 0.22, cuts=4)
    rig.part(joint, g, GOLD_LT, finish=POLISH, outline=0.4)
    long_, short = Geo(), Geo()
    for i in range(16):
        a = math.radians(i * 22.5)
        ca, sa = math.cos(a), math.sin(a)
        if i % 2 == 0:
            L, w, dst = r * 0.5, r * 0.13, long_
        else:
            L, w, dst = r * 0.3, r * 0.1, short
        r0 = r * 0.8
        px, pz = -sa, ca
        pts = [(x + ca * r0 + px * w, z + sa * r0 + pz * w), (x + ca * (r0 + L), z + sa * (r0 + L)),
               (x + ca * r0 - px * w, z + sa * r0 - pz * w)]
        dst.slab(pts, y, 2.2)
    rig.part(joint, long_, GOLD, finish=POLISH, outline=0.5)
    rig.part(joint, short, GOLD_FACE, finish="gloss", outline=0.4)
    # the face's rays engraved round the boss
    g = Geo()
    for i in range(8):
        a = math.radians(i * 45 + 22.5)
        g.capsule((x + math.cos(a) * r * 0.32, y - 1.8, z + math.sin(a) * r * 0.32),
                  (x + math.cos(a) * r * 0.58, y - 1.8, z + math.sin(a) * r * 0.58), 0.6)
    rig.part(joint, g, GOLD_DK, finish=POLISH, outline=0)


def build(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breach1", "breach2", "breach3", "lionhead"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("bannerMid", "body", (CX - 30, TIERS[2][3] - 3, 182))
    rig.joint("shrine", "body", (SX, SY, 256))
    rig.joint("disc", "shrine", (SX, SY - 8, 290))
    rig.joint("balrail", "body", M[2])
    rig.joint("bannerLow", "body", (CX + 40, TIERS[1][3] - 3, 70))
    rig.joint("cap0", "body", (CX + TIERS[0][0], TIERS[0][3], TIERS[0][2]))
    rig.joint("lionL", "body", (CX - 30, TIERS[0][3] - 14, 0))
    rig.joint("curtR", "shrine", (SX + 14, SY - 16, 284))

    for k, (hw, z0, z1, yf) in enumerate(TIERS):
        gtier(rig, "body", "cap0", hw, z0, z1, yf, k)
    stairs(rig, "body")

    # long team banners on the tier faces (one tears at crumble 2, one burns away at 3)
    banner(rig, "body", CX - 46, TIERS[1][3] - 3.0, 112, 44)
    banner(rig, "bannerLow", CX + 40, TIERS[1][3] - 3.0, 112, 44)
    banner(rig, "bannerMid", CX - 30, TIERS[2][3] - 3.0, 182, 48, w=14)
    banner(rig, "body", CX + 30, TIERS[2][3] - 3.0, 182, 48, w=14)

    # the summit shrine: a plinth, gold-capped columns with team curtains between them, a gold-edged
    # entablature, and the sun disc crown on a gilded post
    g = Geo()
    box(g, (SX, SY, 262), (28, 20, 6), p=8)
    rig.part("shrine", g, SAND_LT)
    g = Geo()
    box(g, (SX, SY - 0.4, 267.4), (27, 19.4, 0.9), p=6, cuts=2)
    rig.part("shrine", g, GOLD, finish=POLISH, outline=0.4)
    g = Geo()
    for xx in (-22, -8, 6, 20):
        cyl(g, (SX + xx, SY - 16, 268), (SX + xx, SY - 16, 286), 2.8, 2.4, bevel=0.5)
    rig.part("shrine", g, LINEN)
    g = Geo()
    for xx in (-22, -8, 6, 20):
        cyl(g, (SX + xx, SY - 16, 283.6), (SX + xx, SY - 16, 286.6), 3.6, 3.2, bevel=0.4)
        cyl(g, (SX + xx, SY - 16, 268), (SX + xx, SY - 16, 270.4), 3.4, 3.4, bevel=0.4)
    rig.part("shrine", g, GOLD, finish=POLISH, outline=0.4)
    g = Geo()
    box(g, (SX, SY, 277), (22, 14, 9), p=8)
    rig.part("shrine", g, SAND_DK)
    for xx0, xx1, jn in ((-21, -9, "shrine"), (-7, 5, "shrine"), (7, 19, "curtR")):
        g = Geo().slab([(SX + xx0, 285), (SX + xx1, 285), (SX + xx1 - 1.0, 273), (SX + (xx0 + xx1) / 2, 269),
                        (SX + xx0 + 1.0, 273)], SY - 18.6, 1.2)
        rig.part(jn, g, team=True, outline=0.5)
    g = Geo()
    box(g, (SX, SY - 2, 289), (30, 21, 3.4), p=6)
    rig.part("shrine", g, SAND_LT)
    g = Geo()
    box(g, (SX, SY - 2.6, 292.4), (31, 21.6, 1.2), p=6, cuts=2)
    box(g, (SX, SY - 22.4, 287.2), (30, 0.6, 1.0), p=6, cuts=2)
    rig.part("shrine", g, GOLD, finish=POLISH, outline=0.4)
    g = Geo()
    cyl(g, (SX, SY - 8, 293), (SX, SY - 8, 298), 2.6, 2.2, bevel=0.4)
    rig.part("disc", g, GOLD_DK, finish=POLISH, outline=0.5)
    sun_disc(rig, "disc", SX, SY - 10, 306.0, 20.5)

    # the gate pylon: battered sandstone with a gold band, polished gold doors with a sun boss
    gx, gy = GATE
    g = Geo()
    box(g, (gx - 14, gy + 20, 28), (20, 20, 28), p=8, taper=(1.0, 0.86))
    rig.part("body", g, SAND_DK)
    g = Geo()
    box(g, (gx - 14, gy + 19, 55), (23, 23, 3.4), p=6)
    rig.part("body", g, SAND_LT)
    g = Geo()
    box(g, (gx - 14, gy + 19, 50), (21.5, 21.5, 1.4), p=6, cuts=2)
    rig.part("body", g, GOLD, finish=POLISH, outline=0.4)
    dx = gx - 14
    g = Geo()
    box(g, (dx, gy - 0.6, 18), (11.5, 1.6, 18), p=5)
    rig.part("body", g, TERRA_DK)
    g = Geo()
    for s_ in (-1, 1):
        box(g, (dx + s_ * 5.4, gy - 1.8, 18), (4.8, 1.3, 15.8), p=5, cuts=2)
    rig.part("body", g, GOLD, finish=POLISH, outline=0.4)
    g = Geo()
    for s_ in (-1, 1):
        for z in (6.0, 30.0):
            box(g, (dx + s_ * 5.4, gy - 3.2, z), (3.0, 0.4, 2.0), p=5, cuts=2)
    rig.part("body", g, TERRA, outline=0.3)
    g = Geo()
    g.sphere((dx, gy - 3.8, 19.0), 3.2, cuts=3)
    for i in range(8):
        a = math.radians(i * 45)
        g.capsule((dx + math.cos(a) * 4.4, gy - 3.4, 19.0 + math.sin(a) * 4.4), (dx + math.cos(a) * 7.2, gy - 3.4, 19.0 + math.sin(a) * 7.2), 0.8)
    rig.part("body", g, GOLD_LT, finish=POLISH, outline=0.3)
    g = Geo().slab([(dx - 14, 0), (dx + 14, 0), (dx + 14, 38), (dx - 14, 38)], gy + 0.4, 2.0)
    rig.part("body", g, SAND_DKR, outline=0.4)

    # gold braziers on the tier corners (the first is knocked over at 75%) and on the summit
    brazier(rig, "body", CX + TIERS[0][0] - 6, TIERS[0][3] + 6, TIERS[0][2], "fire1")
    brazier(rig, "body", CX - TIERS[1][0] + 6, TIERS[1][3] + 6, TIERS[1][2], "fire2")
    brazier(rig, "body", CX + TIERS[2][0] - 8, TIERS[2][3] + 6, TIERS[2][2], "fire3")
    brazier(rig, "shrine", SX + 34, SY - 10, 256, "fire4")

    # the lions flanking the stair's foot (the left one loses its head at 50%)
    lion(rig, "body", CX + 28, TIERS[0][3] - 17, facing=1, seed=1, k=1.32)
    lion(rig, "lionL", CX - 28, TIERS[0][3] - 17, facing=-1, seed=2, k=1.32)
    g = Geo()
    g.blob((CX - 28 - 4.8, TIERS[0][3] - 18, 38.0), (6.8, 6.2, 6.4), p=2.2, cuts=3)
    rig.part("lionhead", g, SAND_DK)
    # a gilded obelisk on the third tier's left corner
    ox, oy, oz = CX - TIERS[2][0] + 7, TIERS[2][3] + 8, TIERS[2][2]
    g = Geo()
    box(g, (ox, oy, oz + 3.0), (5.6, 5.6, 3.0), p=6)
    rig.part("body", g, SAND_DKR, outline=0.5)
    g = Geo().lathe([(4.0, 0), (3.0, 30.0), (0.0, 30.0)], (ox, oy, oz + 6.0), segs=4, rot=(0, 0, 45))
    rig.part("body", g, SAND_LT)
    g = Geo().lathe([(3.1, 0), (0.0, 6.6)], (ox, oy, oz + 35.6), segs=4, rot=(0, 0, 45))
    rig.part("body", g, GOLD, finish=POLISH, outline=0.4)

    # potted olive topiary at the foot (terracotta pots with a gold band)
    for x, y, r in ((-182, -52, 8.0), (-48, -60, 6.5)):
        g = Geo().lathe([(0, 0), (r * 0.7, 0), (r * 0.9, r * 0.9), (r * 0.8, r * 1.1), (0, r * 1.1)], (x, y, 0), segs=16)
        rig.part("body", g, TERRA)
        g = Geo().lathe([(r * 0.86, -0.6), (r * 0.94, 0), (r * 0.86, 0.6)], (x, y, r * 0.75), segs=16)
        rig.part("body", g, GOLD, finish=POLISH, outline=0.3)
        g = Geo()
        g.blob((x, y, r * 1.1 + r * 0.95), (r * 0.95, r * 0.8, r * 0.95), p=2.1, cuts=4)
        g.blob((x - r * 0.4, y - 1, r * 1.1 + r * 1.6), (r * 0.6, r * 0.55, r * 0.55), p=2.1, cuts=3)
        rig.part("body", g, OLIVE, finish="hair")

    # the turret platforms, each with a gold rim
    platform(rig, "body", M[0], SAND_LT, SAND_DKR, style="stone", r=(25, 19))
    platform(rig, "body", M[1], SAND_LT, SAND_DKR, style="stone", r=(25, 19))
    platform(rig, "body", M[2], SAND_LT, SAND_DKR, style="stone", r=(26, 19))
    platform(rig, "body", M[3], SAND_LT, SAND_DKR, style="stone", r=(25, 19))
    g = Geo()
    for (x, y, z), rx in zip(M, (25, 25, 26, 25)):
        pts = [(x - 2 + math.cos(math.radians(a)) * (rx - 0.6), y + 5 - math.sin(math.radians(a)) * 18.6, z - 1.4) for a in range(8, 173, 12)]
        for a_, b_ in zip(pts, pts[1:]):
            g.capsule(a_, b_, 0.9, segs=6, rings=1)
    rig.part("body", g, GOLD, finish=POLISH, outline=0.3)
    x, y, z = M[2]
    g = Geo()
    for yy in (y - 8, y + 14):
        g.capsule((x - 8, yy, z - 5), (TIERS[2][0] * -1 + CX + 30, yy, z - 5), 3.0)
        g.capsule((x - 4, yy, z - 6), (x - 30, yy, z - 40), 2.4)
    rig.part("body", g, WOOD_DK, outline=0.5)
    g = Geo()
    for i in range(5):
        g.capsule((x - 22 + i * 10, y - 18, z), (x - 22 + i * 10, y - 18, z + 7), 1.0)
    g.capsule((x - 24, y - 18, z + 7), (x + 20, y - 18, z + 7), 1.1)
    rig.part("balrail", g, GOLD, finish=POLISH, outline=0.4)

    # crumble details: cracks, breaches with fire, rubble with gold bits, the fallen brazier bowl
    f = TIERS[0][3] - 1.5
    chipped_cracks(rig, "crack1", [[(CX - 60, f, 44), (CX - 54, f, 34), (CX - 60, f, 22)],
                                   [(CX + 50, TIERS[1][3] - 1.5, 108), (CX + 56, TIERS[1][3] - 1.5, 96)]], CRACK, SAND_LT)
    chipped_cracks(rig, "crack2", [[(CX + 40, f, 40), (CX + 46, f, 28), (CX + 40, f, 14)],
                                   [(CX - 30, TIERS[2][3] - 1.5, 176), (CX - 24, TIERS[2][3] - 1.5, 162),
                                    (CX - 30, TIERS[2][3] - 1.5, 148)],
                                   [(GATE[0] - 22, GATE[1] - 1, 46), (GATE[0] - 18, GATE[1] - 1, 38)],
                                   [(CX + 10, TIERS[1][3] - 4.0, 117), (CX + 16, TIERS[1][3] - 4.0, 113)]], CRACK, SAND_LT)
    chipped_cracks(rig, "crack3", [[(CX + 20, TIERS[3][3] - 1.5, 246), (CX + 26, TIERS[3][3] - 1.5, 234),
                                    (CX + 20, TIERS[3][3] - 1.5, 222)],
                                   [(CX - 70, f, 50), (CX - 64, f, 38)]], CRACK, SAND_LT)
    breach(rig, "breach1", CX - 56, TIERS[0][3], 28, 34, 28, seed=3)
    breach(rig, "breach2", CX + 44, TIERS[1][3], 88, 38, 34, seed=7)
    blaze(rig, "breach2", CX + 44, TIERS[1][3], 76, 1.4, "burn2")
    breach(rig, "breach3", CX - 32, TIERS[2][3], 156, 46, 42, seed=11)
    blaze(rig, "breach3", CX - 32, TIERS[2][3], 140, 1.8, "burn3")
    for j, pts, seed, size in (("rubble1", [(-176, -52), (-150, -60)], 5, 1.0),
                               ("rubble2", [(-120, -60), (10, -58), (-70, -64)], 15, 1.0),
                               ("rubble3", [(-186, -66), (-150, -70), (-40, -68), (18, -66)], 25, 1.2)):
        rubble(rig, j, pts, SAND_DK, seed=seed, size=size)
        g = Geo()
        for k, (x2, y2) in enumerate(pts):
            g.lathe([(0, 0), (2.4, 0), (0, 3.8)], (x2 + 4 + k, y2 - 6, 0.5), segs=4, rot=(0, 0, 45 + k * 17))
            g.blob((x2 - 6, y2 - 4, 1.4), (2.2, 1.6, 1.2), p=2.4, cuts=2)
        rig.part(j, g, GOLD, finish=POLISH, outline=0.4)
    g = Geo().blob((CX + TIERS[0][0] + 4, TIERS[0][3] - 6, 4), (7, 5, 3), p=2.4)
    rig.part("rubble1", g, GOLD, finish=POLISH)
    g = Geo().lathe([(0, 0), (5.2, 0), (0, 8.6)], (CX + TIERS[0][0] + 12, TIERS[0][3] - 10, 3.0), segs=4, rot=(30, 0, 20))
    rig.part("rubble1", g, GOLD, finish=POLISH, outline=0.4)
    # the lion's head on the ground (50%)
    g = Geo()
    g.blob((CX - 40, TIERS[0][3] - 22, 4.0), (4.8, 4.4, 4.0), p=2.2, cuts=4)
    rig.part("crack2", g, SAND_LT)
    g = Geo()
    for k in range(7):
        a = math.radians(k * 50)
        g.blob((CX - 40 + math.cos(a) * 5.0, TIERS[0][3] - 21, 4.0 + math.sin(a) * 4.0), (2.4, 3.0, 1.8), p=2.0, cuts=2)
    rig.part("crack2", g, GOLD, finish=POLISH, outline=0.4)

    flag(rig, "root", "flagA", (SX - 30, SY + 4, 356), length=30, height=16, pole=300, pole_color=WOOD_DK,
         finial="#E3B84E")
    flag(rig, "root", "flagB", (CX - 50, 40, 236), length=26, height=14, pole=190, pole_color=WOOD_DK,
         finial="#E3B84E")

    # Treasury: sacks and terracotta amphorae (1), a granary with a gold dome (2), a trade barge with a
    # team sail and gold cargo (3)
    g = Geo()
    for x, y in ((-166, -60), (-156, -66), (-160, -54)):
        g.blob((x, y, 8), (6.6, 5.6, 8.4), p=2.4, taper=(1.0, 0.7))
        g.blob((x, y, 17), (2.6, 2.4, 1.5), p=2.0)
    rig.part("treasury1", g, SACK)
    g = Geo()
    for x, y in ((-144, -62), (-136, -58)):
        g.lathe([(0, 0), (2.4, 0.4), (5.4, 6.0), (5.0, 11.0), (2.0, 14.0), (2.2, 17.0), (0, 17.2)], (x, y, 0), (x, y, 17), segs=16)
    rig.part("treasury1", g, TERRA)
    g = Geo()
    for x, y in ((-144, -62), (-136, -58)):
        g.lathe([(5.2, -0.5), (5.6, 0), (5.2, 0.5)], (x, y, 8.0), segs=16)
    rig.part("treasury1", g, GOLD, finish=POLISH, outline=0.3)
    g = Geo()
    cyl(g, (-120, -40, 0), (-120, -40, 18), 16, bevel=1.0, segs=28)
    rig.part("treasury2", g, SAND_LT)
    g = Geo()
    g.blob((-120, -40, 18), (16, 16, 18), p=2.2)
    g.clip((0, 0, 18), (0, 0, -1), fill=False)
    rig.part("treasury2", g, GOLD, finish=POLISH)
    g = Geo()
    box(g, (-120, -56.4, 8), (5, 1.2, 8), p=5)
    rig.part("treasury2", g, team=True, outline=0.4)
    g = Geo()
    for z in (12,):
        cyl(g, (-120, -40, z), (-120, -40, z + 1.6), 16.6, bevel=0.3, segs=28)
    rig.part("treasury2", g, TERRA, outline=0.4)
    bx, by = -40.0, -76.0
    g = Geo().blob((bx, by, 7), (26, 9, 6), p=2.4, taper=(0.9, 1.0))
    g.clip((0, 0, 9), (0, 0, 1))
    g.blob((bx + 24, by, 11), (5, 5, 7), p=2.2, rot=(0, -30, 0))
    g.blob((bx - 24, by, 11), (5, 5, 7), p=2.2, rot=(0, 30, 0))
    rig.part("treasury3", g, WOOD)
    g = Geo()
    for x in (-14, -3, 8):
        g.blob((bx + x, by, 12), (5, 5, 4), p=2.6)
    rig.part("treasury3", g, GOLD, finish=POLISH)
    g = Geo().capsule((bx - 2, by + 2, 8), (bx - 2, by + 2, 46), 1.2)
    g.capsule((bx - 14, by + 2, 44), (bx + 10, by + 2, 44), 0.9)
    rig.part("treasury3", g, WOOD_DK, outline=0.4)
    g = Geo().slab([(bx - 13, 43), (bx + 9, 43), (bx + 12, 20), (bx - 16, 20)], by + 1.0, 1.2)
    rig.part("treasury3", g, team=True, outline=0.5)
    g = Geo()
    for x in (-22, -10, 2, 14):
        g.sphere((bx + x, by - 8.4, 6.0), 1.2, cuts=2)
    rig.part("treasury3", g, GOLD, finish=POLISH, outline=0.3)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "fire1": {"hide": True}, "cap0": {"hide": True},
                     "breach1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breach2": {"show": True},
                     "burn2": {"show": True}, "lionL": {"hide": True}, "lionhead": {"show": True},
                     "balrail": {"r": -22.0, "z": -4.0, "x": -1.0},
                     "bannerLow": {"r": 10.0, "sz": 0.5, "z": 14.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire3": {"hide": True},
                     "breach3": {"show": True}, "burn3": {"show": True}, "bannerMid": {"hide": True},
                     "curtR": {"hide": True}, "disc": {"r": 24.0, "x": -6.0, "z": -10.0},
                     "shrine": {"r": 6.0, "x": -3.0, "z": -4.0}})
    return pose


GILDED_ZIGGURAT = base_module(
    "bronze", "Gilded Ziggurat", height=330, width=190, canvas=(480, 800), feet=(366, 750),
    build=build, crumble=crumble, mount_depth=DEPTHS, skin="gilded_ziggurat",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((CX + TIERS[0][0] - 6, TIERS[0][3] + 5, TIERS[0][2] + 20), 0, 22),
            ((CX - TIERS[1][0] + 6, TIERS[1][3] + 5, TIERS[1][2] + 20), 3, 22),
            ((CX + TIERS[2][0] - 8, TIERS[2][3] + 5, TIERS[2][2] + 20), 2, 22),
            ((SX + 34, SY - 10, 276), 3, 20)],
    smoke=[((CX, 10, 300), 2), ((CX - 40, -20, 130), 3), ((-40, -40, 60), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "stone",
        # the summit with its shrine and sun disc falls toward the lane first, the upper tiers after it
        "topple": [topple_lu(-150, -40, 250, delay_ms=0, push=1.1, sink_lu=30),
                   topple_lu(-160, -30, 190, delay_ms=160, push=0.8, sink_lu=24)],
        "rubbleColors": [SAND, SAND_DK, SAND_LT, GOLD],
        "dustColor": "#D8CCAE",
        "ambientLu": [ambient_lu("glints", (SX, SY - 12, 314), 26, 1.4), ambient_lu("glints", (CX, TIERS[2][3] - 4, 190), 40, 0.8),
                      ambient_lu("glints", (CX, TIERS[0][3] - 6, 56), 50, 0.6), ambient_lu("glints", (GATE[0] - 14, GATE[1] - 4, 30), 14, 0.6)],
    },
)



# ---------------------------------------------------------------------------------------------------
# Acropolis Temple (round 3; Rare, Time Capsule): a Doric marble temple on a limestone outcrop. The temple crowns
# the rock: three steps, six fluted columns with a wider middle bay, an entablature with dark verdigris triglyphs and
# a pediment whose recessed field is team-coloured, white relief figures standing on it (a helmed warrior with spear
# and round shield in the middle, kneeling and reclining figures toward the corners), palmette acroteria. A marble
# bastion tower stands on the rock's front right shoulder, a frieze of bronze shields round its top and a team banner
# on its face; a marble propylon is the gate at the foot, team curtains between its columns; a retaining wall with
# bronze shields holds the middle terrace and a stair climbs the rock face. Olive trees grow at the foot and on a
# ledge, scrub on the terraces; bronze tripod braziers burn before the temple steps (two `flames` prop loops).
# The mounts are marble balconies on corbels with balustrades: the propylon's roof, the middle terrace, a balcony
# thrust out toward the lane from the top terrace and the bastion's roof. Team colour: the pediment field, the
# temple's door curtain, the bastion banner, the propylon curtains and the flags. Bronze stays an accent (shield
# rims, bowls); the shields' faces are verdigris.
#
# Crumble: 75% cracks in the marble, the apex palmette and a bastion shield knocked off, limestone rubble; 50% a
# burning breach in the bastion that tears its banner, the right brazier knocked over, soot, cracks in the steps;
# 25% a ragged burning breach in the retaining wall, a front column snapped (its drums on the steps), the whole
# entablature and pediment sagging over it, fire on the roof, the banner burnt away. Treasury: oil amphorae and a
# basket of olives (1), a chest of silver owls on marble blocks (2), a bronze tripod trophy with a laurel wreath (3).

AC_MARBLE = "#E8E2D4"
AC_MARBLE_LT = "#F4F0E6"
AC_MARBLE_SH = "#D3CBB9"
AC_MARBLE_DK = "#B8AF9E"      # the cella wall in the shade of the porch
AC_MARBLE_DKR = "#8E8676"
AC_ROOF = "#D9D2C2"
AC_ROCK = "#B7AD97"           # limestone
AC_ROCK_LT = "#C9C0AC"
AC_ROCK_DK = "#9C9281"
AC_ROCK_DKR = "#857B6A"
AC_VERD = "#4F8F7F"           # verdigris (shield faces, triglyphs)
AC_VERD_DK = "#3E6F64"
AC_VERD_LT = "#67A594"
AC_BRONZE = "#B8863B"         # bronze accents only (rims, bowls, bosses)
AC_AGED = "#8C7C5E"           # aged bronze (tripod legs)
AC_OLIVE = "#7F8C5C"          # olive leaves (silvery green)
AC_OLIVE_LT = "#9AA77A"
AC_OLIVE_DK = "#65714A"
AC_BARK = "#6E6252"
AC_SCRUB = "#7A8656"
AC_DOOR = "#3F3A33"
AC_CRACK = "#5B5448"
AC_TERRA = "#A97E66"          # desaturated terracotta (amphorae)
AC_SILVER = "#CFD2D6"
AC_WOOD = "#6E5642"

AC_COLS = [-180.0, -162.0, -144.0, -120.0, -102.0, -84.0]   # the front columns (a wider middle bay)
AC_SIDE_COLS = [18.0, 36.0, 54.0]                            # the right flank's columns (y)
AC_COL_Y = 0.0
AC_TERRACE = 184.0
AC_STYLO = 196.0
AC_CAP = 254.0
AC_ARCH0, AC_FRIEZE0, AC_CORN0, AC_CORN1 = 259.0, 266.0, 275.0, 279.0
AC_APEX = 303.0
AC_X0, AC_X1 = -188.0, -78.0      # the entablature's ends
AC_PCX = (AC_X0 + AC_X1) / 2      # the pediment's apex
AC_BACK = 60.0                    # the temple's back
AC_TOWER = (-70.0, -32.0, -46.0, -12.0)   # the bastion: x0, x1, front y, back y
AC_DEPTHS = [-40, -24, -40, -24]
AC_LEAN = math.degrees(math.atan2(AC_APEX - AC_CORN1, AC_PCX - AC_X0))


def ac_column(rig, joint, x, y, z0, z1, r0=4.8, r1=4.0, flutes=True, cap=True):
    """A Doric column: a fluted shaft with a slight entasis, the necking, the echinus and the square abacus."""
    g = Geo()
    prof = [(0.0, 0.0), (r0, 0.0)]
    for i in range(1, 7):
        t = i / 6
        prof.append((r0 + (r1 - r0) * t + 0.3 * math.sin(math.pi * t), (z1 - z0) * t))
    prof.append((0.0, z1 - z0))
    g.lathe(prof, (x, y, z0), (x, y, z1), segs=20)
    rig.part(joint, g, AC_MARBLE, finish="gloss")
    if flutes:
        f = Geo()
        for a in (-58.0, -30.0, 0.0, 30.0, 58.0):
            ar = math.radians(a)
            for zz0, zz1, rr in ((z0 + 2.0, z1 - 2.0, None),):
                ra, rb = r0 - 0.35, r1 - 0.25
                f.capsule((x + math.sin(ar) * ra, y - math.cos(ar) * ra, zz0), (x + math.sin(ar) * rb, y - math.cos(ar) * rb, zz1),
                          0.42, segs=6, rings=1)
        rig.part(joint, f, AC_MARBLE_SH, outline=0, highlight=False)
    if cap:
        c = Geo()
        c.lathe([(0.0, 0.0), (r1 + 0.3, 0.0), (r1 + 0.5, 0.9), (r1 + 2.5, 2.7), (r1 + 2.7, 3.4), (0.0, 3.4)], (x, y, z1), (x, y, z1 + 3.4), segs=20)
        box(c, (x, y, z1 + 4.3), (r1 + 3.0, r1 + 3.0, 0.95), p=8, cuts=2)
        rig.part(joint, c, AC_MARBLE_LT)
        n = Geo()
        n.lathe([(r1 + 0.15, -0.5), (r1 + 0.35, 0.0), (r1 + 0.15, 0.5)], (x, y, z1 - 1.2), (x, y, z1), segs=20)
        rig.part(joint, n, AC_MARBLE_SH, outline=0.3)


def ac_shield(rig, joint, x, y, z, r=5.0, seed=0):
    """A round hoplite shield hung on a wall that faces the camera: a domed verdigris face with a bronze rim and boss
    and a pale embossed crescent (the bronze kept to the rim and boss: A11's orange team)."""
    g = Geo().blob((x, y - 0.9, z), (r * 0.86, 1.5, r * 0.86), p=2.0, cuts=4)
    rig.part(joint, g, AC_VERD, finish="metal", outline=0.4)
    g = Geo().lathe([(r * 0.84, 0.0), (r, 0.4), (r, 1.4), (r * 0.84, 1.8)], (x, y + 0.2, z), (x, y - 1.0, z), segs=24)
    rig.part(joint, g, AC_BRONZE, finish="bronze", outline=0.4)
    g = Geo().sphere((x, y - 2.3, z), r * 0.2, cuts=3)
    rig.part(joint, g, AC_BRONZE, finish="bronze", outline=0.3)
    g = Geo()
    for i in range(5):
        a = math.radians(200 + i * 35 + seed * 7)
        g.sphere((x + math.cos(a) * r * 0.52, y - 2.0, z + math.sin(a) * r * 0.52), r * 0.12, cuts=2)
    rig.part(joint, g, AC_VERD_LT, finish="metal", outline=0)


def ac_balustrade(rig, joint, x0, x1, y, z, h=6.0):
    """A marble balustrade along a balcony's front edge: a plinth, vase balusters and a rail."""
    g = Geo()
    box(g, ((x0 + x1) / 2, y, z + 0.8), ((x1 - x0) / 2, 1.6, 0.8), p=6, cuts=2)
    box(g, ((x0 + x1) / 2, y, z + h - 0.7), ((x1 - x0) / 2 + 0.6, 1.9, 0.8), p=6, cuts=2)
    rig.part(joint, g, AC_MARBLE_LT, outline=0.5)
    b = Geo()
    n = max(3, int((x1 - x0) / 4.2))
    for i in range(n):
        x = x0 + 1.6 + (x1 - x0 - 3.2) * i / (n - 1)
        b.lathe([(0.0, 0.0), (0.8, 0.0), (1.25, (h - 3.0) * 0.35), (0.7, (h - 3.0) * 0.8), (0.9, h - 3.0), (0.0, h - 3.0)],
                (x, y, z + 1.5), (x, y, z + h - 1.5), segs=10)
    rig.part(joint, b, AC_MARBLE, outline=0.35)


def ac_balcony(rig, joint, m, r=(25.0, 19.0), rail=True):
    """A turret balcony: a marble slab on stepped corbels whose top is exactly at the mount, a balustrade on its
    front edge."""
    platform(rig, joint, m, AC_MARBLE_LT, AC_MARBLE_SH, style="stone", r=r)
    x, y, z = m
    if rail:
        ac_balustrade(rig, joint, x - 2 - r[0] + 3.0, x - 2 + r[0] - 3.0, y + 5 - r[1] + 1.8, z)


def ac_tripod(rig, joint, x, y, z, flame):
    """A bronze tripod brazier (aged legs, a bronze bowl, glowing coals); its fire is the prop joint `flame`."""
    g = Geo()
    for k in range(3):
        a = math.radians(90 + k * 120)
        g.capsule((x + math.cos(a) * 5.4, y + math.sin(a) * 4.4, z), (x + math.cos(a) * 2.6, y + math.sin(a) * 2.2, z + 13.0),
                  0.9, 0.7, segs=8, rings=1)
        g.sphere((x + math.cos(a) * 5.4, y + math.sin(a) * 4.4, z + 0.6), 1.1, cuts=2)
    rig.part(joint, g, AC_AGED, finish="metal", outline=0.5)
    g = Geo().lathe([(0.0, 0.0), (2.6, 0.2), (6.0, 3.6), (6.8, 6.0), (6.2, 6.4), (0.0, 4.8)], (x, y, z + 12.0), (x, y, z + 18.4), segs=20)
    rig.part(joint, g, AC_BRONZE, finish="bronze", outline=0.5)
    g = Geo().blob((x, y - 0.6, z + 17.6), (5.2, 4.2, 1.6), p=2.2, cuts=3)
    rig.part(joint, g, glow="#FF9A50", outline=0)
    rig.joint(flame, "root", (x, y - 1.0, z + 17.6))
    o, b, c = Geo(), Geo(), Geo()
    for dx, h, r in ((0.0, 15.0, 4.8), (-3.6, 10.0, 3.2), (3.8, 11.0, 3.0)):
        o.blob((x + dx, y - 1.0, z + 17.6 + h * 0.46), (r * 1.2, r * 0.9, h * 0.6), p=2.0, taper=(1.0, 0.1))
        b.blob((x + dx * 0.9, y - 2.0, z + 17.6 + h * 0.4), (r * 0.85, r * 0.7, h * 0.48), p=2.0, taper=(1.0, 0.14))
        c.blob((x + dx * 0.7, y - 3.2, z + 17.6 + h * 0.28), (r * 0.45, r * 0.4, h * 0.28), p=2.0, taper=(1.0, 0.2))
    rig.part(flame, o, glow="#FFA64D", outline=0.7, outline_hex="#D07A32")
    rig.part(flame, b, glow="#FFD08A", outline=0)
    rig.part(flame, c, glow="#FFF3D6", outline=0)


def ac_flames_pose(name, phase):
    """The tripod fire flickers: four steps of stretch and lean."""
    def pose(f):
        k = (f + phase) % 4
        return {name: {"sz": (1.0, 1.16, 0.9, 1.08)[k], "sx": (1.0, 0.92, 1.08, 0.96)[k], "r": (-5.0, 3.0, -2.0, 6.0)[k]}}
    return pose


def ac_olive(rig, joint, x, y, z, k=1.0, seed=0):
    """An olive tree: a gnarled, twisting trunk splitting into two limbs and an airy crown of silvery leaf clumps."""
    rnd = random.Random(seed)
    t = Geo()
    pts = [(x, y, z), (x + 2.6 * k, y, z + 9 * k), (x - 2.0 * k, y - 0.6, z + 18 * k), (x + 1.2 * k, y, z + 26 * k)]
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        t.capsule(a, b, (3.8 - 0.7 * i) * k, (3.1 - 0.7 * i) * k, segs=10, rings=2)
    t.blob((x, y, z + 1.5 * k), (5.2 * k, 4.4 * k, 2.4 * k), p=2.2, cuts=3)
    t.capsule(pts[2], (x - 10 * k, y + 1, z + 29 * k), 1.8 * k, 1.0 * k, segs=8, rings=1)
    t.capsule(pts[3], (x + 9 * k, y - 1, z + 33 * k), 1.6 * k, 0.9 * k, segs=8, rings=1)
    rig.part(joint, t, AC_BARK, outline=0.6)
    dk, md, lt = Geo(), Geo(), Geo()
    for dx, dy, dz, r in ((-11, 1, 31, 7.5), (9, -1, 35, 8.0), (-1, 3, 41, 9.0), (-5, -4, 29, 6.0), (4, -5, 30, 6.4),
                          (13, 2, 30, 5.6), (-14, 3, 36, 5.6)):
        c = (x + dx * k + rnd.uniform(-1, 1), y + dy * k, z + dz * k + rnd.uniform(-1, 1))
        dk.blob((c[0] + 0.6 * k, c[1] + 2.4 * k, c[2] - 1.8 * k), (r * k * 1.12, r * k * 0.86, r * k * 0.72), p=2.2, cuts=3)
        md.blob(c, (r * k, r * k * 0.78, r * k * 0.66), p=2.2, cuts=3)
        lt.blob((c[0] - r * 0.28 * k, c[1] - r * 0.5 * k, c[2] + r * 0.24 * k), (r * 0.52 * k, r * 0.36 * k, r * 0.36 * k), p=2.2, cuts=2)
    rig.part(joint, dk, AC_OLIVE_DK, finish="hair")
    rig.part(joint, md, AC_OLIVE, finish="hair")
    rig.part(joint, lt, AC_OLIVE_LT, finish="hair", outline=0.3)


def ac_scrub(rig, joint, spots, seed=0):
    """Low scrub on the ledges: clumps of two greens. spots = [(x, y, z, size)]."""
    rnd = random.Random(seed)
    g, h = Geo(), Geo()
    for x, y, z, s in spots:
        for i in range(3):
            c = (x + rnd.uniform(-1.2, 1.2) * s, y + rnd.uniform(-0.4, 0.4) * s, z + 0.4 * s)
            g.blob(c, (s * rnd.uniform(0.7, 1.0), s * 0.7, s * rnd.uniform(0.5, 0.7)), p=2.2, cuts=3)
            h.blob((c[0] - 0.3 * s, c[1] - 0.6 * s, c[2] + 0.3 * s), (s * 0.4, s * 0.3, s * 0.28), p=2.2, cuts=2)
    rig.part(joint, g, AC_SCRUB, finish="hair")
    rig.part(joint, h, AC_OLIVE_LT, finish="hair", outline=0.3)


def ac_stair(rig, joint, a, b, y, width=12.0, steps=9):
    """A stair flight against the rock face from a = (x, z) up to b: chunky limestone treads on a dark stringer, a
    solid marble parapet with a coping along its open side (a bold white diagonal at game scale)."""
    (xa, za), (xb, zb) = a, b
    g = Geo()
    for k in range(steps):
        t0, t1 = k / steps, (k + 1) / steps
        x0_, x1_ = xa + (xb - xa) * t0, xa + (xb - xa) * t1
        zt = za + (zb - za) * t1
        h = (zb - za) / steps + 1.2
        box(g, ((x0_ + x1_) / 2, y + 1.0, zt - h / 2), (abs(x1_ - x0_) / 2 + 0.2, width / 2 - 1.0, h / 2), p=6, cuts=2)
    rig.part(joint, g, AC_ROCK_LT, outline=0.45)
    s = Geo().slab([(xa, za - 2.0), (xb, zb - 2.0), (xb, max(0.0, zb - 12.0)), (xa, max(0.0, za - 12.0))], y + 1.0, width - 2.4)
    rig.part(joint, s, AC_ROCK_DK, outline=0.5)
    yp = y - width / 2 - 0.6
    p = Geo().slab([(xa, za + 4.6), (xb, zb + 4.6), (xb, max(0.0, zb - 5.0)), (xa, max(0.0, za - 5.0))], yp, 3.0)
    rig.part(joint, p, AC_MARBLE, outline=0.5)
    c = Geo().capsule((xa, yp, za + 5.0), (xb, yp, zb + 5.0), 1.9, segs=8, rings=1)
    rig.part(joint, c, AC_MARBLE_LT, outline=0.4)


def ac_crag(c, r, seed, top, facets=3):
    """A limestone crag: a boxy rock with flat facets cut into its front and sides and its top cut flat into a
    ledge (its own geometry, so the cuts touch only it)."""
    rnd = random.Random(seed)
    g = Geo()
    rock(g, c, r, seed=seed, jag=0.09, p=3.0, cuts=4)
    cx, cy, cz = c
    rx, ry, rz = r
    for k in range(facets):
        ang = math.radians(rnd.uniform(-65.0, 65.0) if k else rnd.uniform(-15.0, 15.0))
        tilt = rnd.uniform(-0.2, 0.3)
        n = (math.sin(ang), -math.cos(ang), tilt)
        ln = math.sqrt(sum(v * v for v in n))
        n = tuple(v / ln for v in n)
        reach = math.sqrt((n[0] * rx) ** 2 + (n[1] * ry) ** 2 + (n[2] * rz) ** 2)
        d = reach * rnd.uniform(0.8, 0.9)
        g.clip((cx + n[0] * d, cy + n[1] * d, cz + n[2] * d), n)
    g.clip((0, 0, top), (0, 0, 1))
    g.clip((0, 0, 0.0), (0, 0, -1))
    g.bm.verts.ensure_lookup_table()
    return g


def ac_banner(rig, joint, x, y, z_top, h=40.0, w=13.0):
    """A long team banner hung from the terrace's edge on a bronze rod, an olive wreath on it in cream."""
    g = Geo().slab([(x - w / 2, z_top), (x + w / 2, z_top), (x + w / 2, z_top - h + 7), (x, z_top - h), (x - w / 2, z_top - h + 7)], y, 1.4)
    rig.part(joint, g, team=True, outline=0.5)
    g = Geo().capsule((x - w / 2 - 2.0, y - 0.8, z_top + 0.8), (x + w / 2 + 2.0, y - 0.8, z_top + 0.8), 1.1)
    g.sphere((x - w / 2 - 2.6, y - 0.8, z_top + 0.8), 1.5, cuts=2).sphere((x + w / 2 + 2.6, y - 0.8, z_top + 0.8), 1.5, cuts=2)
    rig.part(joint, g, AC_BRONZE, finish="bronze", outline=0.4)
    g = Geo()
    zc = z_top - h * 0.4
    for i in range(10):
        a = math.radians(-60 + i * 30)
        if 3 < i < 6:
            continue
        g.blob((x + math.cos(a + math.pi / 2) * w * 0.26, y - 1.0, zc + math.sin(a + math.pi / 2) * w * 0.26), (1.1, 0.5, 0.7), p=2.0,
               cuts=2, rot=(0, -math.degrees(a), 0))
    rig.part(joint, g, AC_MARBLE_LT, outline=0.3)


def ac_breach(rig, joint, x, y, z, w, h, seed=0):
    """A blown-out hole in a marble wall: a dark jagged opening, a lighter inner face, broken block ends."""
    rnd = random.Random(seed)
    n = 14
    pts, inner = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.72 + 0.28 * rnd.random()
        pts.append((x + math.cos(a) * w / 2 * k, z + math.sin(a) * h / 2 * k))
        inner.append((x + math.cos(a) * w / 2 * k * 0.72, z + math.sin(a) * h / 2 * k * 0.66 - h * 0.08))
    rig.part(joint, Geo().slab(pts, y - 2.4, 1.6), "#6B6457", outline=0.6, outline_hex="#3E3A33")
    rig.part(joint, Geo().slab(inner, y - 3.4, 1.0), "#3E3A33", outline=0)
    g = Geo()
    for i in range(0, n, 3):
        px_, pz_ = pts[i]
        box(g, (px_, y - 3.0, pz_), (2.6 + 1.6 * rnd.random(), 1.8, 2.0 + 1.4 * rnd.random()), p=5, cuts=2)
    rig.part(joint, g, AC_MARBLE_LT, outline=0.5)


def ac_relief(rig, joint, y):
    """The pediment's relief, white marble on the team field: a helmed warrior with spear and round shield in the
    middle, a kneeling shield bearer either side, a reclining figure in each corner (our own design)."""
    g = Geo()
    cx, z0 = AC_PCX, AC_CORN1 + 1.2
    # the warrior: legs, a short chiton, the torso, a crested helm, the round shield and a spear
    g.capsule((cx - 1.6, y, z0), (cx - 0.8, y, z0 + 8.0), 1.2, 1.3, segs=8, rings=1)
    g.capsule((cx + 1.8, y, z0), (cx + 0.9, y, z0 + 8.0), 1.2, 1.3, segs=8, rings=1)
    g.blob((cx, y, z0 + 9.5), (3.4, 1.4, 2.6), p=2.2, cuts=3, taper=(1.15, 0.85))
    g.blob((cx, y, z0 + 14.0), (2.6, 1.4, 3.6), p=2.2, cuts=3, taper=(0.85, 1.1))
    g.sphere((cx + 0.3, y, z0 + 19.2), 1.9, cuts=3)
    g.blob((cx - 0.6, y, z0 + 21.4), (2.6, 1.0, 1.0), p=2.0, cuts=2, rot=(0, 18, 0))
    g.capsule((cx + 2.4, y, z0 + 15.5), (cx + 4.6, y, z0 + 12.0), 0.9, segs=6, rings=1)
    g.capsule((cx + 5.0, y, z0 + 1.0), (cx + 5.0, y, z0 + 23.0), 0.55, segs=6, rings=1)
    g.blob((cx + 5.0, y, z0 + 23.6), (0.9, 0.7, 1.8), p=2.0, cuts=2, taper=(1.0, 0.2))
    g.blob((cx - 4.0, y - 0.6, z0 + 12.0), (3.6, 1.2, 3.6), p=2.0, cuts=3)
    for s in (-1, 1):
        x = cx + s * 22.0
        # a kneeling shield bearer facing the middle
        g.blob((x - s * 0.5, y, z0 + 2.2), (4.2, 1.3, 2.0), p=2.2, cuts=3)
        g.blob((x + s * 0.8, y, z0 + 6.6), (2.2, 1.3, 3.2), p=2.2, cuts=3, rot=(0, -s * 14, 0))
        g.sphere((x + s * 1.6, y, z0 + 10.8), 1.6, cuts=3)
        g.blob((x + s * 3.6, y - 0.6, z0 + 6.2), (2.8, 1.1, 2.8), p=2.0, cuts=3)
        # a reclining figure leaning on an elbow toward the middle
        x2 = cx + s * 40.0
        g.blob((x2 + s * 2.0, y, z0 + 1.6), (6.0, 1.2, 1.5), p=2.2, cuts=3)
        g.blob((x2 - s * 2.6, y, z0 + 3.2), (2.4, 1.2, 2.2), p=2.2, cuts=3)
        g.sphere((x2 - s * 4.4, y, z0 + 5.4), 1.4, cuts=2)
    rig.part(joint, g, AC_MARBLE_LT, outline=0.45)


def ac_palmette(rig, joint, x, y, z, k=1.0):
    """A palmette acroterion: a fan of seven leaves over two volutes on a little plinth."""
    g = Geo()
    box(g, (x, y, z + 1.2 * k), (4.0 * k, 3.0 * k, 1.2 * k), p=6, cuts=2)
    for i in range(7):
        a = math.radians(-60 + i * 20)
        g.blob((x + math.sin(a) * 4.2 * k, y, z + 2.8 * k + math.cos(a) * 4.6 * k), (1.3 * k, 1.0 * k, 3.4 * k), p=2.0, cuts=2,
               rot=(0, math.degrees(a), 0))
    for s in (-1, 1):
        g.sphere((x + s * 2.4 * k, y - 0.4, z + 3.0 * k), 1.5 * k, cuts=2)
    rig.part(joint, g, AC_MARBLE_LT, outline=0.4)


def build_acropolis(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachT", "breachW", "soot", "stump", "roofFire"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("acro", "body", (AC_PCX, AC_COL_Y - 6.0, AC_APEX))
    rig.joint("shieldT", "body", (-39.0, AC_TOWER[2], 247.0))
    rig.joint("bannerT", "body", (-51.0, AC_TOWER[2] - 1.4, 238.0))
    rig.joint("brazR", "body", (-80.0, -27.0, AC_TERRACE))
    rig.joint("col5", "body", (AC_COLS[4], AC_COL_Y, AC_STYLO))
    rig.joint("roofJ", "body", (AC_X0, AC_COL_Y, AC_ARCH0))
    rig.joint("bannerC", "body", (-118.0, -56.6, AC_TERRACE - 3.0))

    # -- the limestone outcrop: three strata of faceted crags whose fronts make a stepped cliff, each layer's
    # top cut flat into a ledge; two tones per stratum so the crags read apart -------------------------------
    from mathutils import Matrix
    strata = (
        (62.0, (AC_ROCK_DK, AC_ROCK_DKR), [(-168.0, -56.0, 28.0, 501), (-128.0, -58.0, 30.0, 502), (-82.0, -54.0, 26.0, 503)], 0.0),
        (124.0, (AC_ROCK, AC_ROCK_DK), [(-162.0, -52.0, 28.0, 511), (-120.0, -54.0, 30.0, 512), (-74.0, -44.0, 26.0, 513)], 56.0),
        (AC_TERRACE, (AC_ROCK_LT, AC_ROCK), [(-157.0, -52.0, 30.0, 521), (-114.0, -54.0, 30.0, 522), (-66.0, -50.0, 28.0, 523),
                                             (-24.0, -48.0, 22.0, 524)], 118.0))
    for top, tones, crags, bottom in strata:
        layer = [Geo(), Geo()]
        for i, (x, front, hw, seed) in enumerate(crags):
            ry = 46.0
            zc = (top + max(0.0, bottom - 8.0)) / 2
            rz = (top - max(0.0, bottom - 8.0)) / 2 + 10.0
            crag = ac_crag((x, front + ry, zc), (hw + 4.0, ry, rz), seed, top)
            layer[i % 2]._add_bm(crag.bm, Matrix.Identity(4))
        for g, tone in zip(layer, tones):
            rig.part("body", g, tone)
    g = Geo()
    for c, r, seed in (((-188, -48, 7), (12, 9, 8), 531), ((-146, -62, 5), (9, 7, 6), 532), ((-104, -62, 5), (8, 7, 6), 533),
                       ((-182, -52, 64), (8, 6, 5), 534), ((-128, -54, 126), (7, 6, 5), 535)):
        rock(g, c, r, seed=seed, jag=0.14, p=2.8, cuts=3)
    rig.part("body", g, AC_ROCK_DKR)
    # the top terrace's paving (its front edge on the cliff) and the middle terrace's
    g = Geo()
    box(g, (-108.0, 4.0, AC_TERRACE - 2.0), (86.0, 56.0, 2.0), p=8)
    box(g, (-112.0, -28.0, 122.0), (34.0, 22.0, 1.6), p=8)
    rig.part("body", g, AC_MARBLE_SH)
    ac_scrub(rig, "body", [(-184, -52, 60, 4.6), (-152, -56, 60, 3.8), (-100, -54, 60, 4.0), (-176, -50, 122, 4.2),
                           (-140, -52, 122, 3.4), (-190, -46, AC_TERRACE - 2, 4.0), (-30, -48, AC_TERRACE - 2, 3.6)], seed=61)
    # long team banners down the cliff under the temple (one burns away at 25%)
    ac_banner(rig, "body", -164.0, -54.6, AC_TERRACE - 3.0)
    ac_banner(rig, "bannerC", -118.0, -56.6, AC_TERRACE - 3.0)

    # -- the stair up the rock face: from the propylon to the middle terrace, then to the top -----------------
    ac_stair(rig, "body", (-40.0, 4.0), (-92.0, 60.0), -58.0, width=12.0, steps=9)
    g = Geo()
    box(g, (-99.0, -56.0, 58.4), (9.0, 7.0, 2.4), p=6)
    rig.part("body", g, AC_ROCK_LT, outline=0.4)
    ac_stair(rig, "body", (-106.0, 62.0), (-148.0, 120.0), -55.0, width=11.0, steps=9)

    # -- the retaining wall under the middle terrace, hung with bronze shields ------------------------------
    g = Geo()
    box(g, (-46.0, -32.0, 104.0), (26.0, 16.0, 15.0), p=8)
    rig.part("body", g, AC_MARBLE_DK)
    ashlar(rig, "body", -71.0, -21.0, 90.0, 118.0, -48.6, (AC_MARBLE, AC_MARBLE_SH, AC_MARBLE_LT), h=7.0, w=(9.0, 13.0), seed=5,
           skip=lambda x, z: -64 < x < -50 and 94 < z < 112)
    for i, x in enumerate((-62.0, -46.0, -30.0)):
        ac_shield(rig, "body", x, -49.6, 106.0, r=4.6, seed=i)

    # -- the temple: three steps, the colonnade, the cella, the entablature, the pediment and the roof --------
    g = Geo()
    box(g, (-132.0, 25.0, AC_TERRACE + 2.0), (62.0, 41.0, 2.0), p=8)
    box(g, (-132.0, 26.0, AC_TERRACE + 6.0), (59.0, 38.0, 2.0), p=8)
    rig.part("body", g, AC_MARBLE_SH)
    g = Geo()
    box(g, (-132.0, 26.0, AC_STYLO - 2.0), (56.0, 34.0, 2.0), p=8)
    rig.part("body", g, AC_MARBLE)
    g = Geo()
    box(g, (-132.0, 30.0, (AC_STYLO + AC_ARCH0) / 2), (38.0, 22.0, (AC_ARCH0 - AC_STYLO) / 2), p=10)
    rig.part("body", g, AC_MARBLE_DK)
    # the door: a dark opening behind a team curtain, a lintel over it, a warm glow at its foot
    dx = (AC_COLS[2] + AC_COLS[3]) / 2
    g = Geo().slab([(dx - 8, AC_STYLO), (dx + 8, AC_STYLO), (dx + 7.4, 242), (dx - 7.4, 242)], 7.4, 1.0)
    rig.part("body", g, AC_DOOR, outline=0)
    g = Geo().slab([(dx - 7, AC_STYLO + 6), (dx + 7, AC_STYLO + 6), (dx + 6.6, 240), (dx, 238), (dx - 6.6, 240)], 6.6, 1.0)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo().slab([(dx - 6.4, AC_STYLO), (dx + 6.4, AC_STYLO), (dx + 6.0, AC_STYLO + 5.0), (dx - 6.0, AC_STYLO + 5.0)], 6.4, 0.8)
    rig.part("body", g, glow="#F2B46A", outline=0)
    g = Geo()
    box(g, (dx, 6.4, 244.0), (10.0, 1.4, 2.0), p=6, cuts=2)
    rig.part("body", g, AC_MARBLE_LT, outline=0.4)
    # the colonnade (the fifth column snaps at 25%; its stump and drums stand in)
    for i, x in enumerate(AC_COLS):
        ac_column(rig, "col5" if i == 4 else "body", x, AC_COL_Y, AC_STYLO, AC_CAP)
    for y in AC_SIDE_COLS:
        ac_column(rig, "body", AC_COLS[-1], y, AC_STYLO, AC_CAP, flutes=False)
    x = AC_COLS[4]
    g = Geo()
    prof = [(0.0, 0.0), (4.8, 0.0), (4.6, 18.0), (0.0, 18.0)]
    g.lathe(prof, (x, AC_COL_Y, AC_STYLO), (x, AC_COL_Y, AC_STYLO + 18.0), segs=20)
    rig.part("stump", g, AC_MARBLE, finish="gloss")
    g = Geo().slab([(x - 4.8, AC_STYLO + 17.0), (x - 2.0, AC_STYLO + 22.0), (x + 0.5, AC_STYLO + 18.5), (x + 2.8, AC_STYLO + 23.0),
                    (x + 4.8, AC_STYLO + 17.0)], AC_COL_Y - 3.6, 1.4)
    rig.part("stump", g, AC_MARBLE_SH, outline=0.5)
    g = Geo()
    for i, (ox, oy, rot) in enumerate(((-6.0, -12.0, 70.0), (8.0, -16.0, 100.0))):
        g.lathe([(0.0, 0.0), (4.4, 0.0), (4.3, 9.0), (0.0, 9.0)], (x + ox, oy, AC_TERRACE + 4.6), segs=16, rot=(0, rot, 20.0 * i))
    rig.part("stump", g, AC_MARBLE, finish="gloss")

    # the entablature, pediment and roof (they sag over the snapped column at 25%)
    g = Geo()
    box(g, ((AC_X0 + AC_X1) / 2, (AC_COL_Y - 5.5 + AC_BACK) / 2, (AC_ARCH0 + AC_FRIEZE0) / 2), ((AC_X1 - AC_X0) / 2 - 2.0, (AC_BACK - AC_COL_Y + 5.5) / 2, (AC_FRIEZE0 - AC_ARCH0) / 2), p=8)
    rig.part("roofJ", g, AC_MARBLE)
    g = Geo()
    box(g, ((AC_X0 + AC_X1) / 2, (AC_COL_Y - 5.0 + AC_BACK) / 2, (AC_FRIEZE0 + AC_CORN0) / 2), ((AC_X1 - AC_X0) / 2 - 1.6, (AC_BACK - AC_COL_Y + 5.0) / 2, (AC_CORN0 - AC_FRIEZE0) / 2), p=8)
    rig.part("roofJ", g, AC_MARBLE_LT)
    tri, met = Geo(), Geo()
    n = 12
    for k in range(n):
        x = AC_X0 + 4.0 + (AC_X1 - AC_X0 - 8.0) * k / (n - 1)
        box(tri, (x, AC_COL_Y - 5.6, (AC_FRIEZE0 + AC_CORN0) / 2), (1.7, 0.6, 3.8), p=6, cuts=2)
        if k < n - 1:
            xm = x + (AC_X1 - AC_X0 - 8.0) / (n - 1) / 2
            met.blob((xm, AC_COL_Y - 5.6, (AC_FRIEZE0 + AC_CORN0) / 2), (1.8, 0.7, 2.2), p=2.2, cuts=2)
    rig.part("roofJ", tri, AC_VERD_DK, outline=0.3)
    rig.part("roofJ", met, AC_MARBLE_SH, outline=0, highlight=False)
    g = Geo()
    box(g, ((AC_X0 + AC_X1) / 2, (AC_COL_Y - 8.0 + AC_BACK + 1.0) / 2, (AC_CORN0 + AC_CORN1) / 2), ((AC_X1 - AC_X0) / 2 + 1.0, (AC_BACK - AC_COL_Y + 9.0) / 2, (AC_CORN1 - AC_CORN0) / 2), p=7)
    rig.part("roofJ", g, AC_MARBLE_LT)
    # the roof: a prism of marble tiles behind the pediment, cover strips down its slopes
    g = Geo().slab([(AC_X0 + 1.0, AC_CORN1), (AC_X1 - 1.0, AC_CORN1), (AC_PCX, AC_APEX - 1.0)], (AC_COL_Y - 4.0 + AC_BACK) / 2, AC_BACK - AC_COL_Y + 4.0)
    rig.part("roofJ", g, AC_ROOF)
    g = Geo()
    for yy in (10.0, 22.0, 34.0, 46.0, 56.0):
        g.capsule((AC_PCX, yy, AC_APEX - 0.6), (AC_X0 + 2.0, yy, AC_CORN1 + 0.6), 0.7, segs=6, rings=1)
        g.capsule((AC_PCX, yy, AC_APEX - 0.6), (AC_X1 - 2.0, yy, AC_CORN1 + 0.6), 0.7, segs=6, rings=1)
    g.capsule((AC_PCX, -4.0, AC_APEX), (AC_PCX, AC_BACK, AC_APEX), 1.3, segs=8, rings=1)
    rig.part("roofJ", g, AC_MARBLE_SH, outline=0.3)
    # the pediment: the team field recessed behind the raking cornices, the relief standing on it
    g = Geo().slab([(AC_X0 + 3.0, AC_CORN1 + 0.4), (AC_X1 - 3.0, AC_CORN1 + 0.4), (AC_PCX, AC_APEX - 2.6)], AC_COL_Y - 3.6, 1.2)
    rig.part("roofJ", g, team=True, outline=0)
    ac_relief(rig, "roofJ", AC_COL_Y - 5.0)
    L = math.hypot(AC_PCX - AC_X0, AC_APEX - AC_CORN1)
    g = Geo()
    for sgn, x_mid in ((-1, (AC_X0 + AC_PCX) / 2), (1, (AC_X1 + AC_PCX) / 2)):
        box(g, (x_mid, AC_COL_Y - 6.0, (AC_CORN1 + AC_APEX) / 2 + 0.8), (L / 2 + 1.6, 3.2, 1.9), p=7, cuts=3, rot=(0, sgn * AC_LEAN, 0))
    rig.part("roofJ", g, AC_MARBLE_LT)
    g = Geo()
    for sgn, x_mid in ((-1, (AC_X0 + AC_PCX) / 2), (1, (AC_X1 + AC_PCX) / 2)):
        box(g, (x_mid, AC_COL_Y - 8.6, (AC_CORN1 + AC_APEX) / 2 - 1.4), (L / 2, 0.6, 0.7), p=6, cuts=2, rot=(0, sgn * AC_LEAN, 0))
    rig.part("roofJ", g, AC_MARBLE_SH, outline=0, highlight=False)
    ac_palmette(rig, "acro", AC_PCX, AC_COL_Y - 6.0, AC_APEX + 0.6, k=1.4)
    for x in (AC_X0 + 2.0, AC_X1 - 2.0):
        ac_palmette(rig, "roofJ", x, AC_COL_Y - 6.0, AC_CORN1 + 0.4, k=0.95)

    # -- the bastion tower on the right shoulder: ashlar, a frieze of bronze shields, a team banner ---------
    tx0, tx1, ty0, ty1 = AC_TOWER
    g = Geo()
    box(g, ((tx0 + tx1) / 2, (ty0 + ty1) / 2, (AC_TERRACE + 258.8) / 2), ((tx1 - tx0) / 2, (ty1 - ty0) / 2, (258.8 - AC_TERRACE) / 2), p=10)
    rig.part("body", g, AC_MARBLE_SH)
    ashlar(rig, "body", tx0 + 0.8, tx1 - 0.8, AC_TERRACE + 2.0, 239.0, ty0 - 0.6, (AC_MARBLE, AC_MARBLE_LT, AC_MARBLE_SH), h=8.0,
           w=(9.0, 13.0), seed=9)
    g = Geo()
    box(g, ((tx0 + tx1) / 2, (ty0 + ty1) / 2 - 0.4, 247.0), ((tx1 - tx0) / 2 + 0.8, (ty1 - ty0) / 2 + 0.8, 7.0), p=8)
    box(g, ((tx0 + tx1) / 2, (ty0 + ty1) / 2 - 0.4, 256.4), ((tx1 - tx0) / 2 + 1.4, (ty1 - ty0) / 2 + 1.4, 1.8), p=7)
    rig.part("body", g, AC_MARBLE_LT)
    for i, x in enumerate((-63.0, -51.0, -39.0)):
        ac_shield(rig, "shieldT" if i == 2 else "body", x, ty0 - 1.6, 247.0, r=5.0, seed=3 + i)
    bx, bz = -51.0, 238.0
    g = Geo().slab([(bx - 7.5, bz), (bx + 7.5, bz), (bx + 7.5, bz - 32.0), (bx, bz - 38.0), (bx - 7.5, bz - 32.0)], ty0 - 1.4, 1.4)
    rig.part("bannerT", g, team=True, outline=0.5)
    g = Geo().capsule((bx - 9.5, ty0 - 2.2, bz + 0.6), (bx + 9.5, ty0 - 2.2, bz + 0.6), 1.1)
    rig.part("bannerT", g, AC_BRONZE, finish="bronze", outline=0.4)
    g = Geo()
    zc = bz - 15.0
    for i in range(8):
        a = math.radians(i * 45)
        g.capsule((bx + math.cos(a) * 1.8, ty0 - 2.4, zc + math.sin(a) * 1.8), (bx + math.cos(a) * 4.4, ty0 - 2.4, zc + math.sin(a) * 4.4), 0.6,
                  segs=6, rings=1)
    g.sphere((bx, ty0 - 2.5, zc), 1.6, cuts=2)
    rig.part("bannerT", g, AC_MARBLE_LT, outline=0.3)

    # -- the propylon: a marble gateway at the foot, two columns in antis before team curtains ---------------
    g = Geo()
    box(g, (-12.0, -31.0, 1.6), (28.0, 23.0, 1.6), p=6)
    box(g, (-12.0, -30.0, 4.6), (26.0, 21.0, 1.6), p=6)
    rig.part("body", g, AC_MARBLE_SH)
    g = Geo()
    for ax in (-32.0, 10.0):
        box(g, (ax, -29.0, 25.0), (3.6, 16.0, 19.0), p=6)
    box(g, (-11.0, -16.0, 25.0), (20.0, 2.0, 19.0), p=6)
    rig.part("body", g, AC_MARBLE)
    g = Geo().slab([(-19.0, 6.0), (-3.0, 6.0), (-3.0, 40.0), (-19.0, 40.0)], -18.6, 1.0)
    rig.part("body", g, AC_DOOR, outline=0)
    for x0_, x1_ in ((-18.4, -11.4), (-10.6, -3.6)):
        g = Geo().slab([(x0_, 7.0), (x1_, 7.0), (x1_, 39.0), (x0_, 39.0)], -19.6, 1.0)
        rig.part("body", g, team=True, outline=0.4)
    for cx in (-22.0, 0.0):
        ac_column(rig, "body", cx, -40.0, 6.0, 38.6, r0=3.4, r1=2.9)
    g = Geo()
    box(g, (-11.0, -29.0, 44.2), (25.0, 16.6, 2.2), p=7)
    rig.part("body", g, AC_MARBLE)
    g = Geo()
    box(g, (-11.0, -29.5, 48.8), (24.6, 16.6, 2.4), p=7)
    rig.part("body", g, AC_MARBLE_LT)
    tri = Geo()
    for k in range(8):
        box(tri, (-33.0 + k * 6.2, -46.4, 48.8), (1.2, 0.5, 2.0), p=6, cuts=2)
    rig.part("body", tri, AC_VERD_DK, outline=0.3)
    g = Geo()
    box(g, (-11.0, -30.0, 53.2), (26.2, 17.6, 2.1), p=7)
    rig.part("body", g, AC_MARBLE_LT)
    for i, ax in enumerate((-32.0, 10.0)):
        ac_shield(rig, "body", ax, -45.6, 30.0, r=3.2, seed=7 + i)

    # -- the turret balconies ------------------------------------------------------------------------
    ac_balcony(rig, "body", M[0])
    ac_balcony(rig, "body", M[1])
    ac_balcony(rig, "body", M[2], r=(23.0, 19.0))
    ac_balcony(rig, "body", M[3])

    # -- tripods before the temple steps (the right one falls at 50%) and the olive trees -------------------
    ac_tripod(rig, "body", -184.0, -28.0, AC_TERRACE, "flameL")
    ac_tripod(rig, "brazR", -80.0, -27.0, AC_TERRACE, "flameR")
    ac_olive(rig, "body", -180.0, -20.0, 0.0, k=1.05, seed=71)
    ac_olive(rig, "body", -178.0, -46.0, 122.0, k=0.74, seed=72)

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-62.0, AC_TOWER[2] - 1.0, 232.0), (-58.0, AC_TOWER[2] - 1.0, 222.0), (-62.0, AC_TOWER[2] - 1.0, 212.0)],
                                   [(-24.0, -46.6, 34.0), (-21.0, -46.6, 24.0)]], AC_CRACK, AC_MARBLE_LT)
    chipped_cracks(rig, "crack2", [[(-150.0, -16.8, AC_TERRACE + 3.6), (-144.0, -16.8, AC_TERRACE + 1.0)],
                                   [(-36.0, -50.4, 112.0), (-32.0, -50.4, 102.0)],
                                   [(-162.0, -5.6, 236.0), (-160.0, -5.6, 226.0)]], AC_CRACK, AC_MARBLE_LT)
    chipped_cracks(rig, "crack3", [[(-136.0, -6.2, 268.0), (-130.0, -6.2, 261.0)], [(-44.0, AC_TOWER[2] - 1.0, 234.0), (-40.0, AC_TOWER[2] - 1.0, 224.0)]],
                   AC_CRACK, AC_MARBLE_LT)
    ac_breach(rig, "breachT", -60.0, AC_TOWER[2], 210.0, 17.0, 19.0, seed=13)
    flames(rig, "breachT", [(-60.0, AC_TOWER[2] - 5.0, 202.0, 0.8)])
    g = Geo()
    for sx_, sz_, rr in ((-58.0, 228.0, 7.0), (-120.0, 288.0, 8.0)):
        g.slab([(sx_ + rr * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), sz_ + rr * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)],
               AC_TOWER[2] - 1.8 if sx_ > -100 else AC_COL_Y - 6.2, 0.6)
    rig.part("soot", g, "#4A443C", outline=0, highlight=False)
    ac_breach(rig, "breachW", -56.0, -48.6, 103.0, 22.0, 20.0, seed=17)
    flames(rig, "breachW", [(-56.0, -54.0, 95.0, 0.9)])
    flames(rig, "roofFire", [(-100.0, 20.0, 296.0, 0.8), (-160.0, 30.0, 294.0, 0.6)])
    rubble(rig, "rubble1", [(-170.0, -54.0), (-146.0, -60.0)], AC_ROCK, seed=31)
    rubble(rig, "rubble2", [(-112.0, -58.0), (-62.0, -60.0)], AC_MARBLE_SH, seed=41)
    rubble(rig, "rubble3", [(-188.0, -62.0), (-130.0, -66.0), (-40.0, -64.0)], AC_ROCK_DK, seed=51, size=1.2)
    # the fallen palmette and the bastion shield at the foot (75%), the tripod (50%)
    ac_palmette(rig, "rubble1", -150.0, -64.0, 0.0, k=1.0)
    ac_shield(rig, "rubble1", -34.0, -60.0, 3.0, r=4.6, seed=9)
    g = Geo().lathe([(0.0, 0.0), (2.6, 0.2), (6.0, 3.6), (6.8, 6.0), (0.0, 4.8)], (-96.0, -40.0, AC_TERRACE + 3.0), segs=16, rot=(70, 0, 30))
    rig.part("rubble2", g, AC_BRONZE, finish="bronze", outline=0.5)
    g = Geo()
    for k in range(3):
        g.capsule((-92.0 + k * 3.0, -36.0, AC_TERRACE + 0.8), (-80.0 + k * 2.0, -30.0 - k * 3.0, AC_TERRACE + 1.6), 0.8, 0.7, segs=6, rings=1)
    rig.part("rubble2", g, AC_AGED, finish="metal", outline=0.5)

    flag(rig, "root", "flagA", (AC_PCX - 18.0, 40.0, 352.0), length=30, height=16, pole=AC_APEX - 2.0, pole_color=AC_WOOD,
         finial="#C9A227")
    flag(rig, "root", "flagB", (-186.0, 40.0, 240.0), length=24, height=14, pole=AC_TERRACE, pole_color=AC_WOOD, finial="#C9A227")

    # -- Treasury: oil amphorae and olives (1), a chest of silver owls on marble blocks (2), a tripod trophy (3)
    g = Geo()
    for x, y in ((-172.0, -62.0), (-163.0, -58.0), (-155.0, -64.0)):
        g.lathe([(0.0, 0.0), (1.8, 0.4), (5.2, 6.0), (4.6, 11.5), (1.8, 14.0), (2.1, 16.6), (0.0, 16.8)], (x, y, 0.0), (x, y, 16.8), segs=16)
    rig.part("treasury1", g, AC_TERRA)
    g = Geo()
    for x, y in ((-172.0, -62.0), (-163.0, -58.0), (-155.0, -64.0)):
        g.lathe([(5.0, -0.5), (5.4, 0.0), (5.0, 0.5)], (x, y, 7.6), segs=16)
    rig.part("treasury1", g, AC_MARBLE_LT, outline=0.3)
    g = Geo()
    cyl(g, (-144.0, -64.0, 0.0), (-144.0, -64.0, 6.0), 6.0, 7.0, bevel=0.6, segs=16)
    rig.part("treasury1", g, "#9C8462")
    g = Geo()
    for i in range(7):
        g.sphere((-147.0 + (i % 4) * 2.2, -65.0 + (i // 4) * 2.0, 6.6 + (i % 2) * 0.6), 1.3, cuts=2)
    rig.part("treasury1", g, AC_OLIVE_DK, outline=0.3)
    g = Geo()
    box(g, (-126.0, -62.0, 4.0), (10.0, 7.0, 4.0), p=7)
    box(g, (-124.0, -60.0, 10.0), (7.0, 5.0, 2.0), p=7)
    rig.part("treasury2", g, AC_MARBLE)
    g = Geo()
    box(g, (-124.0, -62.0, 15.0), (6.0, 4.4, 3.0), p=6)
    rig.part("treasury2", g, AC_WOOD)
    g = Geo()
    for i in range(6):
        g.blob((-128.0 + i * 1.7, -64.0 - (i % 2), 18.6 + (i % 3) * 0.5), (1.4, 0.5, 1.4), p=2.0, cuts=2, rot=(70, 0, i * 20))
    rig.part("treasury2", g, AC_SILVER, finish="metal", outline=0.3)
    g = Geo()
    box(g, (-124.0, -66.6, 15.0), (3.0, 0.8, 1.2), p=5, cuts=2)
    rig.part("treasury2", g, team=True, outline=0.3)
    g = Geo()
    for k in range(3):
        a = math.radians(90 + k * 120)
        g.capsule((-100.0 + math.cos(a) * 6.0, -66.0 + math.sin(a) * 4.6, 0.0), (-100.0 + math.cos(a) * 3.0, -66.0 + math.sin(a) * 2.4, 20.0), 1.0, 0.8,
                  segs=8, rings=1)
    rig.part("treasury3", g, AC_AGED, finish="metal", outline=0.5)
    g = Geo().lathe([(0.0, 0.0), (3.0, 0.4), (7.4, 4.6), (7.8, 8.0), (7.0, 8.6), (0.0, 7.0)], (-100.0, -66.0, 19.0), (-100.0, -66.0, 27.6), segs=20)
    rig.part("treasury3", g, AC_BRONZE, finish="bronze", outline=0.5)
    g = Geo()
    for s in (-1, 1):
        g.lathe([(0.0, 0.0), (1.6, 0.0), (1.6, 0.6), (0.0, 0.6)], (-100.0 + s * 8.0, -66.0, 26.0), (-100.0 + s * 8.6, -66.0, 30.0), segs=10)
    rig.part("treasury3", g, AC_BRONZE, finish="bronze", outline=0.4)
    g = Geo()
    for i in range(10):
        a = math.radians(-180 + i * 36)
        g.blob((-100.0 + math.cos(a) * 5.4, -74.0, 30.0 + math.sin(a) * 3.0), (1.6, 0.7, 0.9), p=2.0, cuts=2, rot=(0, -math.degrees(a), 0))
    rig.part("treasury3", g, AC_OLIVE, outline=0.3)


def crumble_acropolis(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "acro": {"hide": True}, "shieldT": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachT": {"show": True}, "soot": {"show": True},
                     "brazR": {"hide": True}, "bannerT": {"r": 10.0, "sz": 0.58, "x": 1.5}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breachW": {"show": True}, "roofFire": {"show": True},
                     "col5": {"hide": True}, "stump": {"show": True}, "bannerT": {"hide": True}, "bannerC": {"hide": True},
                     "roofJ": {"r": -3.2, "z": -1.0}})
    return pose


ACROPOLIS_TEMPLE = base_module(
    "bronze", "Acropolis Temple", height=330, width=190, canvas=(480, 800), feet=(366, 750),
    build=build_acropolis, crumble=crumble_acropolis, mount_depth=AC_DEPTHS, skin="acropolis_temple",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-184.0, -30.0, AC_TERRACE + 26.0), 3, 22), ((-80.0, -29.0, AC_TERRACE + 26.0), 1, 22)],
    smoke=[((-120.0, 20.0, 300.0), 2), ((-60.0, -40.0, 214.0), 2), ((-56.0, -50.0, 104.0), 3)],
    horn=(-110, 340), yaw=BASE_YAW,
    props=[prop_loop("flamesL", ["flameL"], 4, ac_flames_pose("flameL", 0), ms=110, crumble=(0, 3), z="front", hold=0,
                     anchor=(-184.0, -29.0, AC_TERRACE + 24.0), outline="none"),
           prop_loop("flamesR", ["flameR"], 4, ac_flames_pose("flameR", 2), ms=110, crumble=(0, 1), z="front", hold=0,
                     anchor=(-80.0, -28.0, AC_TERRACE + 24.0), outline="none")],
    extra_meta={
        "collapseMaterial": "stone",
        # the temple falls toward the lane first, the bastion a beat later
        "topple": [topple_lu(-196, -76, 200, delay_ms=0, push=1.0, sink_lu=28),
                   topple_lu(-76, -24, 180, delay_ms=170, push=0.9, sink_lu=24)],
        "rubbleColors": [AC_MARBLE, AC_MARBLE_SH, AC_ROCK, AC_ROCK_DK],
        "dustColor": "#E2DCCB",
        "ambientLu": [ambient_lu("embers", (-184.0, -30.0, AC_TERRACE + 30.0), 6, 0.7),
                      ambient_lu("embers", (-80.0, -29.0, AC_TERRACE + 30.0), 6, 0.5),
                      ambient_lu("petals", (-180.0, -20.0, 42.0), 18, 0.6, color="#A3AE80"),
                      ambient_lu("petals", (-178.0, -46.0, 148.0), 14, 0.5, color="#A3AE80"),
                      ambient_lu("glints", (-51.0, -48.0, 247.0), 14, 0.4, color="#FFE7B0")],
    },
)



# ---------------------------------------------------------------------------------------------------
# Colossus Lighthouse (round 3; Legendary, Wardrobe Crate): a harbour lighthouse crowned by a giant bronze guardian (our
# own design: a crested helm, a round shield, a team sash, the right arm raising a torch with a fire). The lighthouse
# stands on a sea-stone quay at the back left: a square sandstone tier, a round tier with a gallery, the lantern room
# glowing, the guardian on its plinth; the torch's fire is the `torch` prop loop (six flickers) and the white Legendary
# aura shines round the torch (meta.ageborn.auraLu). A slender harbour tower carries the middle and top mounts, a round
# sea-stone tower at the lane edge the gate-side ones over the sea gate; a little harbour basin at the foot with a
# moored boat (team sail). Team colour: the sash, the boat's sail, the banners, the sea gate and the flags. Code ambient:
# gulls, torch smoke, sea glints.
#
# Crumble: 75% cracks, the guardian's crest knocked off, a merlon down, rubble; 50% a burning breach in the round
# tier, a banner torn, the lantern dark, soot; 25% a ragged breach in the quay, the shield fallen, the harbour tower's
# roof cap knocked askew (its mount stays), fire in the lantern room.

CL_SAND = "#CDBE9E"
CL_SAND_LT = "#DCCFB2"
CL_SAND_DK = "#B0A282"
CL_SEA = "#9AA0A6"            # sea stone (grey, low saturation)
CL_SEA_LT = "#AEB3B8"
CL_SEA_DK = "#80868C"
CL_BRONZE = "#B8863B"         # polished bronze (the guardian: the `bronze` finish)
CL_BRONZE_DK = "#8E6A35"
CL_VERD = "#4F8F7F"
CL_VERD_LT = "#67A594"
CL_WATER = "#8FA8A6"
CL_WATER_LT = "#B5C8C4"
CL_WOOD = "#7A5E44"
CL_WOOD_DK = "#5A4535"
CL_LAMP = "#FFE7B0"
CL_CRACK = "#5A4E40"
CL_DEPTHS = [-40, -24, -40, -24]
CL_LH = (-132.0, 12.0)              # the lighthouse's axis
CL_QUAY = 48.0                      # the quay's top
CL_T1 = 124.0                       # tier tops
CL_T2 = 184.0
CL_LANTERN = 222.0
CL_PLINTH = 230.0                   # the guardian's feet (the torch stays inside the height band)
CL_GK = 1.22                        # the guardian's scale (a giant on the lantern)
CL_G = (CL_LH[0] + 2.0, CL_LH[1])   # the guardian's feet (x, y)
CL_TORCH = (CL_G[0] + 12.0 * CL_GK, CL_G[1] - 8.0 * CL_GK, CL_PLINTH + 82.0 * CL_GK)   # the torch cup (the fire and the aura)
CL_FIRE_FRAMES, CL_FIRE_MS = 6, 90


def cl_guardian(rig, joint, crest_joint, shield_joint, x, y, z0):
    """The bronze guardian, about 100 lu tall: sandalled legs, a pleated skirt, a breastplate under a team sash, a crested
    helm, a round shield on the left arm, the right arm raising the torch (its fire is the `torch` prop). The `bronze`
    finish (a cream highlight, a desaturated shadow) keeps the big bronze clear of the orange team."""
    K = CL_GK

    def P(dx, dy, dz):
        return (x + dx * K, y + dy * K, z0 + dz * K)

    def R(*r):
        return tuple(v * K for v in r)

    B = dict(finish="bronze")
    g = Geo()
    for sx_ in (-1, 1):
        g.capsule(P(sx_ * 3.4, 0.0, 2.0), P(sx_ * 3.0, 0.0, 22.0), 2.6 * K, 3.0 * K, segs=10, rings=2)
        g.blob(P(sx_ * 3.6 + 1.6, -0.6, 1.4), R(3.6, 2.4, 1.6), p=2.2, cuts=2)
    rig.part(joint, g, CL_BRONZE, outline=0.5, **B)
    g = Geo()
    g.blob(P(0.0, 0.0, 26.0), R(7.6, 5.4, 5.4), p=2.4, cuts=3, taper=(1.25, 0.85))
    rig.part(joint, g, CL_BRONZE_DK, outline=0.5, **B)
    g = Geo()
    for k in range(7):
        dx = -6.0 + k * 2.0
        g.capsule(P(dx, -5.0, 30.0), P(dx * 1.12, -5.4, 21.0), 0.5 * K, segs=4, rings=1)
    rig.part(joint, g, CL_BRONZE, outline=0, highlight=False, **B)
    g = Geo()
    g.blob(P(0.0, 0.0, 40.0), R(7.0, 5.0, 9.6), p=2.4, cuts=3, taper=(0.85, 1.12))
    rig.part(joint, g, CL_BRONZE, outline=0.5, **B)
    g = Geo()
    g.blob(P(-0.6, -4.4, 42.0), R(5.2, 0.8, 5.6), p=2.0, cuts=2)
    rig.part(joint, g, CL_VERD, finish="metal", outline=0.3)
    # the team sash across the chest, its end hanging at the left hip
    yy = y - 5.6 * K
    g = Geo().slab([(x - 7.6 * K, z0 + 46.0 * K), (x - 4.0 * K, z0 + 49.0 * K), (x + 7.6 * K, z0 + 34.0 * K), (x + 4.0 * K, z0 + 31.0 * K)], yy, 1.0 * K)
    g.slab([(x - 7.4 * K, z0 + 36.0 * K), (x - 3.6 * K, z0 + 36.0 * K), (x - 4.6 * K, z0 + 16.0 * K), (x - 6.6 * K, z0 + 13.0 * K),
            (x - 8.6 * K, z0 + 17.0 * K)], y - 5.8 * K, 1.0 * K)
    rig.part(joint, g, team=True, outline=0.4)
    # the head and crested helm
    g = Geo()
    g.blob(P(0.6, 0.0, 55.0), R(4.2, 4.0, 4.8), p=2.2, cuts=3)
    rig.part(joint, g, CL_BRONZE, outline=0.5, **B)
    g = Geo()
    g.blob(P(0.0, 0.0, 57.4), R(4.8, 4.6, 4.0), p=2.4, cuts=3)
    g.blob(P(4.2, -1.0, 55.0), R(1.4, 3.6, 2.6), p=2.0, cuts=2)
    rig.part(joint, g, CL_BRONZE_DK, outline=0.5, **B)
    g = Geo()
    pts = [P(4.0, 0.0, 60.0), P(1.0, 0.0, 64.0), P(-4.0, 0.0, 64.6), P(-8.0, 0.0, 61.0), P(-9.0, 0.0, 55.0)]
    for i, (a_, b_) in enumerate(zip(pts, pts[1:])):
        g.capsule(a_, b_, (2.6 - i * 0.4) * K, (2.2 - i * 0.4) * K, segs=8, rings=1)
    rig.part(crest_joint, g, CL_VERD_LT, finish="metal", outline=0.5)
    # the right arm raising the torch (toward the lane)
    g = Geo()
    g.capsule(P(6.4, 0.0, 47.0), P(11.0, -1.0, 58.0), 2.2 * K, 2.0 * K, segs=8, rings=1)
    g.capsule(P(11.0, -1.0, 58.0), P(13.0, -2.0, 70.0), 2.0 * K, 1.8 * K, segs=8, rings=1)
    g.blob(P(13.2, -2.0, 71.4), R(2.2, 2.2, 2.0), p=2.2, cuts=2)
    rig.part(joint, g, CL_BRONZE, outline=0.5, **B)
    tx_, ty_, tz_ = CL_TORCH
    g = Geo()
    g.capsule(P(13.4, -2.0, 66.0), (tx_, ty_, tz_ - 3.0 * K), 1.2 * K, 1.4 * K, segs=8, rings=1)
    g.lathe([(0.0, 0.0), (2.0 * K, 0.0), (4.6 * K, 3.4 * K), (4.8 * K, 4.2 * K), (0.0, 3.4 * K)], (tx_, ty_, tz_ - 3.6 * K), (tx_, ty_, tz_ + 0.6 * K), segs=16)
    rig.part(joint, g, CL_BRONZE_DK, outline=0.5, **B)
    # the left arm holding the round shield at its side
    g = Geo()
    g.capsule(P(-6.4, 0.0, 47.0), P(-9.0, -1.0, 36.0), 2.2 * K, 2.0 * K, segs=8, rings=1)
    rig.part(joint, g, CL_BRONZE, outline=0.5, **B)
    g = Geo().blob(P(-10.0, -4.0, 33.0), R(8.4, 1.8, 8.4), p=2.0, cuts=4)
    rig.part(shield_joint, g, CL_VERD, finish="metal", outline=0.5)
    c0, c1 = P(-10.0, -3.2, 33.0), P(-10.0, -4.4, 33.0)
    g = Geo().lathe([(7.8 * K, -0.9), (8.8 * K, -0.5), (8.8 * K, 0.7), (7.8 * K, 1.1)], c0, c1, segs=28)
    g.sphere(P(-10.0, -6.0, 33.0), 1.8 * K, cuts=2)
    rig.part(shield_joint, g, CL_BRONZE, outline=0.4, **B)


def cl_fire_pose(f):
    return {f"fire{k}": ({"show": True} if k == f else {"hide": True}) for k in range(CL_FIRE_FRAMES)}


def build_colossus(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachR", "breachQ", "soot", "lanternDark", "lanternFire", "shieldDown"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    lx, ly = CL_LH
    rig.joint("crest", "body", (CL_G[0] + 4.0 * CL_GK, ly, CL_PLINTH + 60.0 * CL_GK))
    rig.joint("shield", "body", (CL_G[0] - 6.0 * CL_GK, ly - 4.0 * CL_GK, CL_PLINTH + 33.0 * CL_GK))
    rig.joint("merlon", "body", (-196.0, -38.0, CL_QUAY))
    rig.joint("banner", "body", (lx, ly - 30.6, CL_T1 - 4.0))
    rig.joint("lantern", "body", (lx, ly, CL_T2))
    rig.joint("htCap", "body", (-50.0, 0.0, 258.8))

    # -- the quay: sea-stone walls with big blocks and a parapet, the sea gate, a harbour basin with a boat -------
    # (the quay's lane end stops at x 12: its back corner projects to the right under the yaw)
    g = Geo()
    box(g, (-92.0, 4.0, CL_QUAY / 2), (104.0, 40.0, CL_QUAY / 2), p=10)
    rig.part("body", g, CL_SEA)
    ashlar(rig, "body", -194.0, 10.0, 2.0, CL_QUAY - 4.0, -36.6, (CL_SEA, CL_SEA_LT, CL_SEA_DK), h=11.0, w=(16.0, 22.0), seed=7,
           skip=lambda x, z: -13.0 < x < 9.0 and z < 38.0)
    g = Geo()
    box(g, (-92.0, 3.4, CL_QUAY - 1.6), (105.0, 41.0, 2.0), p=6)
    rig.part("body", g, CL_SEA_LT)
    par = Geo()
    for k in range(9):
        x = -190.0 + k * 22.0
        if -40.0 < x < 22.0:
            continue
        box(par, (x, -35.0, CL_QUAY + 5.0), (7.0, 3.0, 5.0), p=6)
    rig.part("body", par, CL_SEA_LT)
    g = Geo()
    box(g, (-196.0 + 6.0, -35.0, CL_QUAY + 5.0), (6.0, 3.0, 5.0), p=6)
    rig.part("merlon", g, CL_SEA_LT)
    gx = -2.0
    pts = [(gx - 9.0, 0.0), (gx + 9.0, 0.0), (gx + 9.0, 22.0)]
    for i in range(1, 6):
        a = math.pi * i / 6
        pts.append((gx + 9.0 * math.cos(a), 22.0 + 9.0 * math.sin(a)))
    pts.append((gx - 9.0, 22.0))
    g = Geo().slab([(x + (1.8 if x > gx else -1.8), z + (1.8 if z > 10 else 0.0)) for x, z in pts], -36.8, 1.2)
    rig.part("body", g, CL_SAND_LT, outline=0.45)
    g = Geo().slab(pts, -37.6, 1.0)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    for z in (8.0, 20.0):
        box(g, (gx, -38.4, z), (8.4, 0.5, 0.8), p=4, cuts=1)
    rig.part("body", g, "#4A4A4E", finish="metal", outline=0)
    # the harbour basin at the left foot and a moored galley: a curled stern post, a bronze ram, a painted eye, a team
    # stripe along the gunwale and a square team sail set on its yard
    g = Geo()
    box(g, (-168.0, -46.0, 1.0), (30.0, 8.0, 1.2), p=6)
    rig.part("body", g, CL_WATER, finish="gloss")
    g = Geo()
    for x0_, x1_ in ((-194.0, -184.0), (-152.0, -142.0)):
        g.capsule((x0_, -53.0, 2.4), (x1_, -53.0, 2.4), 0.45, segs=4, rings=1)
    rig.part("body", g, CL_WATER_LT, outline=0, highlight=False)
    g = Geo()
    g.blob((-170.0, -47.0, 3.6), (18.0, 5.2, 4.6), p=2.4, cuts=3, taper=(0.8, 1.0))
    g.clip((0, 0, 6.4), (0, 0, 1))
    pts = [(-186.0, -47.0, 4.6), (-190.5, -47.0, 9.0), (-190.0, -47.0, 14.0), (-186.6, -47.0, 15.6), (-184.6, -47.0, 13.6)]
    for i, (a_, b_) in enumerate(zip(pts, pts[1:])):
        g.capsule(a_, b_, 2.2 - i * 0.35, 1.9 - i * 0.35, segs=8, rings=1)
    rig.part("body", g, CL_WOOD)
    g = Geo().capsule((-155.0, -47.0, 2.6), (-148.6, -47.0, 2.0), 1.5, 0.8, segs=8, rings=1)
    rig.part("body", g, CL_BRONZE, finish="bronze", outline=0.4)
    g = Geo().capsule((-185.0, -52.3, 5.8), (-154.0, -52.3, 5.8), 1.1, segs=8, rings=1)
    rig.part("body", g, team=True, outline=0.35)
    g = Geo().blob((-157.6, -52.0, 3.6), (2.0, 0.6, 1.3), p=2.0, cuts=2)
    rig.part("body", g, "#EDE6D6", outline=0.3)
    g = Geo().blob((-157.0, -52.5, 3.6), (0.9, 0.4, 0.9), p=2.0, cuts=2)
    rig.part("body", g, "#2A2622", outline=0, highlight=False)
    g = Geo().capsule((-170.0, -47.0, 5.0), (-170.0, -47.0, 47.0), 1.1, 0.8, segs=6, rings=1)
    g.capsule((-183.0, -48.0, 43.0), (-157.0, -48.0, 43.0), 0.8, segs=6, rings=1)
    rig.part("body", g, CL_WOOD_DK, outline=0.4)
    g = Geo().blob((-170.0, -50.4, 32.6), (11.6, 1.6, 9.8), p=4.2, cuts=3)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo().capsule((-181.0, -52.0, 33.0), (-159.0, -52.0, 33.0), 0.5, segs=4, rings=1)
    rig.part("body", g, CL_SAND_LT, outline=0, highlight=False)

    # -- the lighthouse: a square sandstone tier, a round tier with a gallery, the lantern room ----------------------
    g = Geo()
    box(g, (lx, ly, (CL_QUAY + CL_T1) / 2), (30.0, 30.0, (CL_T1 - CL_QUAY) / 2), p=10, taper=(1.0, 0.92))
    rig.part("body", g, CL_SAND)
    ashlar(rig, "body", lx - 27.0, lx + 27.0, CL_QUAY + 2.0, CL_T1 - 6.0, ly - 30.6, (CL_SAND, CL_SAND_LT, CL_SAND_DK), h=10.0, w=(13.0, 18.0), seed=11,
           skip=lambda x, z: abs(x - lx) < 9.0 and 70.0 < z < 112.0)
    g = Geo()
    box(g, (lx, ly - 0.4, CL_T1 - 2.0), (30.6, 30.6, 2.6), p=6)
    rig.part("body", g, CL_SAND_LT)
    g = Geo().slab([(lx - 7.0, CL_T1 - 4.0), (lx + 7.0, CL_T1 - 4.0), (lx + 7.0, CL_T1 - 36.0), (lx, CL_T1 - 42.0), (lx - 7.0, CL_T1 - 36.0)], ly - 31.2, 1.3)
    rig.part("banner", g, team=True, outline=0.5)
    g = Geo()
    for k in range(6):
        a = math.radians(90 + k * 60)
        g.blob((lx + math.cos(a) * 3.2, ly - 32.0, CL_T1 - 20.0 + math.sin(a) * 3.2), (1.4, 0.5, 1.0), p=2.0, cuts=2, rot=(0, -math.degrees(a), 0))
    rig.part("banner", g, CL_SAND_LT, outline=0.3)
    g = Geo()
    cyl(g, (lx, ly, CL_T1), (lx, ly, CL_T2), 23.0, 20.0, bevel=0.8, segs=32)
    rig.part("body", g, CL_SAND_LT)
    g = Geo()
    for z in (CL_T1 + 20.0, CL_T1 + 40.0):
        r_ = 23.0 - 3.0 * (z - CL_T1) / (CL_T2 - CL_T1) + 0.1
        g.lathe([(r_ - 0.3, -0.35), (r_ + 0.1, 0.0), (r_ - 0.3, 0.35)], (lx, ly, z), (lx, ly, z + 1.0), segs=32)
    rig.part("body", g, CL_SAND_DK, outline=0, highlight=False)
    window(rig, "body", lx, ly - 22.4, CL_T1 + 30.0, 7.0, 13.0, glow_hex=CL_LAMP, frame=CL_SAND_DK, arch=True)
    g = Geo()
    cyl(g, (lx, ly, CL_T2 - 1.0), (lx, ly, CL_T2 + 3.0), 27.0, bevel=0.5, segs=32)
    rig.part("body", g, CL_SAND)
    rail = Geo()
    for i in range(20):
        a = math.radians(180 + i * (180.0 / 19))
        rail.capsule((lx + math.cos(a) * 26.0, ly + math.sin(a) * 26.0, CL_T2 + 3.0), (lx + math.cos(a) * 26.0, ly + math.sin(a) * 26.0, CL_T2 + 8.0), 0.5,
                     segs=4, rings=1)
    pts = [(lx + math.cos(math.radians(180 + i * 9)) * 26.0, ly + math.sin(math.radians(180 + i * 9)) * 26.0, CL_T2 + 8.0) for i in range(21)]
    for a_, b_ in zip(pts, pts[1:]):
        rail.capsule(a_, b_, 0.7, segs=4, rings=1)
    rig.part("body", rail, CL_BRONZE_DK, finish="metal", outline=0.3)
    # the lantern room: glazing between bronze mullions, the light glowing (dark at 50%), a domed cap and the plinth
    g = Geo()
    cyl(g, (lx, ly, CL_T2 + 3.0), (lx, ly, CL_LANTERN), 16.0, bevel=0.4, segs=24)
    rig.part("lantern", g, glow=CL_LAMP, outline=0.6, outline_hex="#B08A46")
    g = Geo()
    cyl(g, (lx, ly, CL_T2 + 3.0), (lx, ly, CL_LANTERN), 16.0, bevel=0.4, segs=24)
    rig.part("lanternDark", g, "#3E4448", finish="gloss")
    g = Geo()
    for k in range(8):
        a = math.radians(k * 45 + 22.5)
        g.capsule((lx + math.cos(a) * 16.4, ly + math.sin(a) * 16.4, CL_T2 + 3.0), (lx + math.cos(a) * 16.4, ly + math.sin(a) * 16.4, CL_LANTERN), 0.8,
                  segs=4, rings=1)
    rig.part("body", g, CL_BRONZE_DK, finish="metal", outline=0.3)
    g = Geo()
    g.lathe([(0.0, 0.0), (19.0, 0.0), (18.0, 2.4), (10.0, 7.0), (0.0, 8.0)], (lx, ly, CL_LANTERN), (lx, ly, CL_PLINTH), segs=32)
    rig.part("body", g, CL_BRONZE_DK, finish="bronze", outline=0.5)
    # the guardian on the lantern's cap
    cl_guardian(rig, "body", "crest", "shield", CL_G[0], CL_G[1], CL_PLINTH)
    g = Geo().blob((lx - 14.0, ly - 12.0, CL_T2 + 6.0), (8.4, 1.8, 8.4), p=2.0, cuts=4, rot=(70, 0, 30))
    rig.part("shieldDown", g, CL_VERD, finish="metal", outline=0.5)
    # the torch's fire (the `torch` prop: one joint per flicker under root)
    rig.joint("torch", "root", CL_TORCH)
    tx_, ty_, tz_ = CL_TORCH
    for f in range(CL_FIRE_FRAMES):
        j = f"fire{f}"
        rig.joint(j, "torch", CL_TORCH, hidden=True)
        rnd = random.Random(31 + f)
        o, b, c = Geo(), Geo(), Geo()
        lean = (-0.25, 0.1, 0.35, 0.05, -0.3, 0.2)[f]
        sz = (1.0, 1.14, 0.92, 1.08, 0.96, 1.12)[f]
        for dx, h, r in ((0.0, 15.0 * CL_GK, 5.0 * CL_GK), (-3.6 * CL_GK, 10.0 * CL_GK, 3.2 * CL_GK), (3.8 * CL_GK, 11.0 * CL_GK, 3.0 * CL_GK)):
            h2 = h * sz * rnd.uniform(0.92, 1.08)
            o.blob((tx_ + dx, ty_ - 1.0, tz_ + h2 * 0.46), (r * 1.2, r * 0.9, h2 * 0.6), p=2.0, taper=(1.0, 0.1), shift=(lean, 0.0))
            b.blob((tx_ + dx * 0.9, ty_ - 2.0, tz_ + h2 * 0.4), (r * 0.85, r * 0.7, h2 * 0.48), p=2.0, taper=(1.0, 0.14), shift=(lean * 0.8, 0.0))
            c.blob((tx_ + dx * 0.7, ty_ - 3.2, tz_ + h2 * 0.28), (r * 0.45, r * 0.4, h2 * 0.28), p=2.0, taper=(1.0, 0.2), shift=(lean * 0.5, 0.0))
        rig.part(j, o, glow="#FFA64D", outline=0.7, outline_hex="#D07A32")
        rig.part(j, b, glow="#FFD08A", outline=0)
        rig.part(j, c, glow="#FFF3D6", outline=0)

    # -- the harbour tower (the middle and top mounts) and the round sea-stone tower at the lane edge --------------
    g = Geo()
    box(g, (-50.0, 0.0, (CL_QUAY + 254.0) / 2), (16.0, 22.0, (254.0 - CL_QUAY) / 2), p=8, taper=(1.0, 0.9))
    rig.part("body", g, CL_SAND)
    g = Geo()
    for z in (120.0, 190.0, 252.0):
        box(g, (-50.0, -0.4, z), (17.0, 22.6, 1.8), p=6)
    rig.part("body", g, CL_SAND_LT, outline=0.4)
    ashlar(rig, "body", -63.0, -37.0, CL_QUAY + 2.0, 250.0, -23.0, (CL_SAND, CL_SAND_LT, CL_SAND_DK), h=10.0, w=(9.0, 13.0), seed=17,
           skip=lambda x, z: abs(z - 120.0) < 4.0 or abs(z - 190.0) < 4.0 or (abs(x + 50.0) < 7.0 and (abs(z - 160.0) < 10.0 or abs(z - 220.0) < 10.0)))
    for z in (160.0, 220.0):
        window(rig, "body", -50.0, -23.4, z, 6.0, 11.0, glow_hex=CL_LAMP, frame=CL_SAND_DK, arch=True)
    g = Geo()
    g.lathe([(0.0, 0.0), (18.0, 0.0), (1.0, 14.0), (0.0, 14.0)], (-50.0, 6.0, 262.8), (-50.0, 6.0, 276.8), segs=4, rot=(0, 0, 45))
    rig.part("htCap", g, CL_BRONZE_DK, finish="bronze", outline=0.5)
    px, py = 0.0, -14.0
    g = Geo()
    cyl(g, (px, py, CL_QUAY), (px, py, 192.6), 17.4, 16.2, bevel=0.8, segs=32)
    rig.part("body", g, CL_SEA_LT)
    g = Geo()
    for z in (CL_QUAY + 3.0, 120.0, 188.0):
        cyl(g, (px, py, z - 1.6), (px, py, z + 1.6), 18.4, bevel=0.4, segs=32)
    rig.part("body", g, CL_SEA_DK, outline=0.4)
    # big sea-stone blocks round the visible half (between the trim rings; the banner's band left clear)
    ring_blocks(rig, "body", px, py, 16.9, CL_QUAY + 6.0, 118.0, (CL_SEA, CL_SEA_LT, CL_SEA_DK), h=11.0, n=7)
    ring_blocks(rig, "body", px, py, 16.3, 122.0, 186.0, (CL_SEA, CL_SEA_LT, CL_SEA_DK), h=11.0, n=7,
                skip=lambda a, z: 144.0 < z < 184.0 and abs(math.degrees(a) - 270.0) < 22.0)
    g = Geo().slab([(px - 6.0, 180.0), (px + 6.0, 180.0), (px + 6.0, 152.0), (px, 147.0), (px - 6.0, 152.0)], py - 17.6, 1.2)
    rig.part("body", g, team=True, outline=0.45)

    # -- the turret mounts --------------------------------------------------------------------------------
    for i, m in enumerate(M):
        platform(rig, "body", m, CL_SAND_LT, CL_SAND_DK, style="stone", r=(23.0, 19.0) if i == 2 else (25.0, 19.0))

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(lx - 16.0, ly - 30.8, 104.0), (lx - 12.0, ly - 30.8, 94.0), (lx - 16.0, ly - 30.8, 84.0)],
                                   [(-60.0, -37.0, 36.0), (-56.0, -37.0, 26.0)]], CL_CRACK, CL_SAND_LT)
    chipped_cracks(rig, "crack2", [[(-120.0, -37.0, 30.0), (-116.0, -37.0, 20.0)], [(-50.0, -22.6, 200.0), (-46.0, -22.6, 190.0)]], CL_CRACK, CL_SAND_LT)
    chipped_cracks(rig, "crack3", [[(lx + 12.0, ly - 22.4, 168.0), (lx + 16.0, ly - 22.0, 158.0)]], CL_CRACK, CL_SAND_LT)
    ac_breach(rig, "breachR", lx - 6.0, ly - 21.0, CL_T1 + 34.0, 16.0, 16.0, seed=71)
    flames(rig, "breachR", [(lx - 6.0, ly - 27.0, CL_T1 + 26.0, 0.8)])
    ac_breach(rig, "breachQ", -96.0, -36.6, 22.0, 24.0, 20.0, seed=73)
    flames(rig, "breachQ", [(-96.0, -42.0, 14.0, 0.9)])
    flames(rig, "lanternFire", [(lx + 4.0, ly - 18.0, CL_T2 + 6.0, 0.7)])
    g = Geo()
    g.slab([(lx - 6.0 + 7.0 * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), CL_T1 + 50.0 + 6.0 * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)],
           ly - 21.4, 0.6)
    rig.part("soot", g, "#4A4036", outline=0, highlight=False)
    rubble(rig, "rubble1", [(-150.0, -56.0), (-124.0, -60.0)], CL_SEA, seed=231)
    rubble(rig, "rubble2", [(-80.0, -56.0), (-40.0, -60.0)], CL_SAND_DK, seed=237)
    rubble(rig, "rubble3", [(-162.0, -60.0), (-110.0, -62.0), (-14.0, -60.0)], CL_SEA_DK, seed=243, size=1.2)
    g = Geo()
    pts = [(lx - 2.0, ly - 20.0, CL_T2 + 2.0), (lx - 8.0, ly - 24.0, CL_T2 - 1.0), (lx - 14.0, ly - 26.0, CL_T2 - 3.0)]
    for a_, b_ in zip(pts, pts[1:]):
        g.capsule(a_, b_, 2.0, 1.6, segs=8, rings=1)
    rig.part("rubble1", g, CL_VERD_LT, finish="metal", outline=0.5)

    flag(rig, "root", "flagA", (-50.0 + 4.0, 6.0, 306.0), length=30, height=16, pole=274.0, pole_color=CL_WOOD_DK, finial="#C9A227")
    flag(rig, "root", "flagB", (-176.0, 36.0, CL_QUAY + 76.0), length=24, height=14, pole=CL_QUAY, pole_color=CL_WOOD_DK, finial="#C9A227")

    # -- Treasury: amphorae and nets (1), a chest of silver (2), a little bronze statue on a plinth (3) ---------------
    g = Geo()
    for x, y in ((-140.0, -60.0), (-131.0, -62.0)):
        g.lathe([(0.0, 0.0), (1.8, 0.4), (5.0, 6.0), (4.4, 11.0), (1.8, 13.4), (2.0, 16.0), (0.0, 16.2)], (x, y, 0.0), (x, y, 16.2), segs=16)
    rig.part("treasury1", g, AC_TERRA)
    g = Geo()
    g.blob((-120.0, -62.0, 3.0), (7.0, 5.0, 3.0), p=2.2, cuts=3)
    rig.part("treasury1", g, "#9C8C66", finish="hair")
    g = Geo()
    box(g, (-100.0, -62.0, 5.0), (7.0, 5.0, 5.0), p=6)
    rig.part("treasury2", g, CL_WOOD)
    g = Geo()
    for i in range(6):
        g.sphere((-103.0 + (i % 3) * 3.0, -63.0 + (i // 3) * 2.0, 11.0), 1.6, cuts=2)
    rig.part("treasury2", g, "#CFD2D6", finish="metal", outline=0.3)
    g = Geo()
    box(g, (-78.0, -62.0, 4.0), (6.0, 6.0, 4.0), p=6)
    rig.part("treasury3", g, CL_SAND_LT)
    g = Geo()
    g.capsule((-78.0, -62.0, 8.0), (-78.0, -62.0, 20.0), 2.4, 2.0, segs=8, rings=1)
    g.sphere((-78.0, -62.0, 22.0), 2.4, cuts=2)
    g.capsule((-76.0, -62.0, 17.0), (-74.0, -63.0, 26.0), 0.9, segs=6, rings=1)
    rig.part("treasury3", g, CL_BRONZE, finish="bronze", outline=0.4)


def crumble_colossus(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "crest": {"hide": True}, "merlon": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachR": {"show": True}, "soot": {"show": True},
                     "banner": {"r": 10.0, "sz": 0.55, "x": 1.0}, "lantern": {"hide": True}, "lanternDark": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breachQ": {"show": True}, "lanternFire": {"show": True},
                     "shield": {"hide": True}, "shieldDown": {"show": True}, "htCap": {"r": 14.0, "x": -2.0, "z": -2.0}, "banner": {"hide": True}})
    return pose


COLOSSUS_LIGHTHOUSE = base_module(
    "bronze", "Colossus Lighthouse", height=330, width=190, canvas=(480, 800), feet=(366, 750),
    build=build_colossus, crumble=crumble_colossus, mount_depth=CL_DEPTHS, skin="colossus_lighthouse",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((CL_TORCH[0], CL_TORCH[1] - 2.0, CL_TORCH[2] + 6.0), 3, 26), ((CL_LH[0], CL_LH[1] - 18.0, CL_T2 + 14.0), 1, 22),
            ((-50.0, -24.0, 160.0), 3, 10)],
    smoke=[((CL_LH[0] - 6.0, CL_LH[1] - 22.0, CL_T1 + 40.0), 2), ((-96.0, -38.0, 30.0), 3), ((CL_LH[0], CL_LH[1], CL_T2 + 10.0), 3)],
    horn=(-110, 340), yaw=BASE_YAW,
    props=[prop_loop("torch", ["torch"], CL_FIRE_FRAMES, cl_fire_pose, ms=CL_FIRE_MS, crumble=(0, 3), z="front", hold=0,
                     anchor=(CL_TORCH[0], CL_TORCH[1], CL_TORCH[2] + 6.0), outline="none")],
    extra_meta={
        "collapseMaterial": "stone",
        "aura": "legendary",
        # the aura shines round the torch (screen lu from the feet, y up; its radius), not round the body
        "auraLu": dict(zip(("x", "y"), project((CL_TORCH[0], CL_TORCH[1], CL_TORCH[2] + 9.0), BASE_YAW)), r=50.0),
        # the guardian with the lighthouse's top falls toward the lane first, then the harbour tower
        "topple": [topple_lu(-170, -96, 180, delay_ms=0, push=1.0, sink_lu=30),
                   topple_lu(-74, -24, 150, delay_ms=170, push=0.8, sink_lu=26)],
        "rubbleColors": [CL_SEA, CL_SAND, CL_SAND_DK, CL_BRONZE],
        "dustColor": "#D8CCAE",
        "ambientLu": [ambient_lu("birds", (-100.0, 0.0, 300.0), 70, 0.7, color="#F4F4F0"),
                      ambient_lu("smoke", (CL_TORCH[0], CL_TORCH[1], CL_TORCH[2] + 18.0), 4, 0.6),
                      ambient_lu("embers", (CL_TORCH[0], CL_TORCH[1] - 2.0, CL_TORCH[2] + 12.0), 5, 0.7),
                      ambient_lu("glints", (-168.0, -50.0, 3.0), 26, 0.6, color="#EAF7FC")],
    },
)

SKINS = [GILDED_ZIGGURAT, ACROPOLIS_TEMPLE, COLOSSUS_LIGHTHOUSE]
