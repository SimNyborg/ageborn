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

from world.base_skins_kit import flames
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, rubble,
                          topple_lu)

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

SKINS = [GILDED_ZIGGURAT]
