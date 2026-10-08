"""Gunpowder Age base skins as real models (PLAN 2c): `base.gunpowder@<skin>`.

Coral Fort (Rare, Wardrobe Crate; owner request 2026-10-08 "more base skins that are not just a
recolour"): the Star Fort rebuilt as a sea fort on a reef. A round sea-stone tower stands on a barnacled
sea wall with a sea-green gate and two cannon embrasures; behind it rises a slim cream lighthouse with team
bands, a glowing lantern room and a team cap; a wrecked galleon has run aground against the wall by the
gate, its bow toward the lane, its broken mast still carrying a fighting top. Pink branching coral, an
orange sea fan, purple tube coral and a brain coral grow over the stone; seaweed hangs from the
cornices, starfish and shells cling to the wall.

Footprint, height band and the four mounts are the Star Fort's (common.BASE_MOUNTS): the galleon's
foredeck by the gate, a corbelled balcony on the sea tower, the fighting top on the mast and a corbelled
platform on the sea tower's parapet. Team colour: the lighthouse cap and bands, the furled sail on the
yard, the galleon's gunwale stripe, the masthead pennant and the flags.

Crumble: 75% cracks, a coral branch and a merlon knocked off, rubble with shells; 50% a breach in the sea
wall, fire on the wreck's stern and the wall, the portholes and windows dark, the sail torn loose and the
yard askew; 25% the lighthouse cap knocked askew and its lantern dark, the topmast snapped, the hull stove
in, fire on the tower top and the gallery. Treasury: a giant clam with pearls (1), barrels and shot (2),
an open sea chest of gold (3).
"""
import math
import random

from ageborn_art.geometry import Geo

from world.base_skins_kit import ashlar, flames, lantern, ring_blocks
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, moss_drape, platform,
                          rock, rope, rubble, topple_lu, window)

STONE = "#A2A7AA"       # sea stone (large areas)
STONE_LT = "#B2B7B9"
STONE_MID = "#AAAFB1"
STONE_DK = "#878D92"
STONE_DKR = "#71787E"
STONE_PINK = "#B4A6A1"  # coral-stained blocks
STONE_SEA = "#9DA79E"   # weed-stained blocks
PLASTER = "#ECE4D2"     # the lighthouse
PLASTER_DK = "#D3C9B4"
CORAL = "#D8907A"       # pink branching coral (accent)
CORAL_LT = "#E8AA96"
CORAL_DK = "#B87262"
FAN = "#D9734F"         # sea fan
FAN_DK = "#B2573A"
TUBE = "#8E6CA8"        # tube coral
TUBE_LT = "#A988C0"
TUBE_IN = "#4A3560"
BRAIN = "#D6B061"       # brain coral
BRAIN_DK = "#B08A44"
WEED = "#5F7A45"        # seaweed
WEED_DK = "#4C6338"
BARNACLE = "#DCD6C8"
BARNACLE_DK = "#AFA899"
SHELL = "#F0E2CC"
SHELL_PINK = "#E7B7A2"
STAR = "#E07A4F"        # starfish
WOOD = "#5E4A38"        # wet ship timber
WOOD_LT = "#7E654C"
WOOD_DK = "#47382B"
DOOR = "#3F6E6A"        # sea-green gate
BRASS = "#C9A227"
IRON = "#3C3F45"
CREAM = "#EFE6CF"
ROPE = "#B8A27C"
GLASS = "#FFE7A8"
GLASS_CORE = "#FFF6DA"
GLASS_DARK = "#3A3F4A"
PEARL = "#F4EFE6"
GOLD = "#D4A437"
HOLE = "#2A2622"
SOOT = "#5E574E"
CRACK = "#4E555C"

DEPTHS = [-40, -24, -40, -24]
TW = (-80.0, 4.0, 31.0, 28.0, 246.0)   # sea tower: x, y, bottom radius, top radius, parapet walk height
LH = (-140.0, 30.0)                    # lighthouse axis
LH_TOP = 240.0                         # the lighthouse shaft's top (gallery above it)
WALL_TOP = 60.0                        # the sea wall's top
HULL_Y = -34.0                         # the galleon's centre line (depth)


def tower_r(z):
    x, y, r0, r1, h = TW
    return r0 + (r1 - r0) * max(0.0, min(1.0, z / h))


# -- reef details ---------------------------------------------------------------------------------
def coral_tree(rig, joint, base, height, spread=1.0, seed=0, lean=0.0, color=CORAL, tip=CORAL_LT):
    """Branching coral: a few chunky forking branches with lighter knobbly tips (chunky on purpose: the
    silhouette's 2D outline would fill the gaps of fine twigs)."""
    rnd = random.Random(seed)
    g, t = Geo(), Geo()

    def branch(p, ang, length, r, depth):
        a = math.radians(ang)
        q = (p[0] + math.cos(a) * length * spread, p[1] - rnd.uniform(0, 2.5), p[2] + math.sin(a) * length)
        g.capsule(p, q, r, r * 0.8, segs=10, rings=2)
        if depth == 0 or length < 5:
            t.sphere(q, r * 1.2, cuts=2)
            return
        for d in (-1, 1):
            branch(q, ang + d * rnd.uniform(26, 40), length * rnd.uniform(0.66, 0.8), r * 0.8, depth - 1)

    branch(base, 90 + lean, height * 0.44, height * 0.13, 2)
    rig.part(joint, g, color, outline=0.35)
    rig.part(joint, t, tip, outline=0.3)


def sea_fan(rig, joint, c, w, h, seed=0, rot=0.0):
    """A flat sea fan facing the camera: a scalloped fan with darker veins radiating from its stalk."""
    rnd = random.Random(seed)
    x, y, z = c
    pts = [(x, z)]
    for k in range(13):
        a = math.radians(15 + 150 * k / 12)
        rr = 1.0 - 0.08 * (k % 2) - rnd.uniform(0, 0.05)
        pts.append((x + math.cos(a) * w * rr, z + math.sin(a) * h * rr))
    g = Geo().slab(pts, y, 1.6, rot=(0, rot, 0), origin=(x, y, z))
    rig.part(joint, g, FAN, outline=0.5)
    g = Geo()
    for k in range(7):
        a = math.radians(25 + 130 * k / 6)
        p1 = (x + math.cos(a) * w * 0.9, y - 1.2, z + math.sin(a) * h * 0.9)
        g.capsule((x, y - 1.2, z), p1, 0.75, 0.45, segs=6, rings=1)
    for k in range(2):
        rr = 0.45 + 0.27 * k
        arc = [(x + math.cos(math.radians(a)) * w * rr, y - 1.2, z + math.sin(math.radians(a)) * h * rr) for a in range(25, 160, 15)]
        for p0, p1 in zip(arc, arc[1:]):
            g.capsule(p0, p1, 0.5, segs=6, rings=1)
    rig.part(joint, g, FAN_DK, outline=0)
    g = Geo().capsule((x, y - 0.4, z - 6), (x, y - 0.4, z + 1), 1.4, 1.0, segs=8, rings=1)
    rig.part(joint, g, FAN_DK, outline=0.4)


def tube_coral(rig, joint, c, n=5, k=1.0, seed=0):
    """A clump of purple tube coral: short flared tubes with dark openings."""
    rnd = random.Random(seed)
    tubes, rims, holes = Geo(), Geo(), Geo()
    x, y, z = c
    for i in range(n):
        dx, dy = rnd.uniform(-6, 6) * k, rnd.uniform(-3, 3) * k
        h = rnd.uniform(7, 15) * k
        r = rnd.uniform(1.8, 2.8) * k
        lean = rnd.uniform(-12, 12)
        top = (x + dx + math.sin(math.radians(lean)) * h, y + dy, z + h)
        tubes.capsule((x + dx, y + dy, z), top, r * 0.85, r, segs=10, rings=1)
        rims.lathe([(r * 0.7, -0.6), (r * 1.3, 0.2), (r * 1.1, 1.0), (r * 0.7, 1.0)], top, segs=12)
        holes.lathe([(0.1, 0.4), (r * 0.72, 0.6), (0.1, 1.3)], top, segs=12)
    rig.part(joint, tubes, TUBE, outline=0.5)
    rig.part(joint, rims, TUBE_LT, outline=0.4)
    rig.part(joint, holes, glow=TUBE_IN, outline=0)


def brain_coral(rig, joint, c, r, seed=0):
    """A round brain coral with meandering grooves."""
    rnd = random.Random(seed)
    x, y, z = c
    g = Geo().blob((x, y, z), (r, r * 0.9, r * 0.72), p=2.2, cuts=5)
    g.clip((0, 0, z - r * 0.25), (0, 0, -1))
    rig.part(joint, g, BRAIN, outline=0.6)
    g = Geo()
    for k in range(5):
        a0 = rnd.uniform(200, 340)
        e = 0.25 + 0.14 * k
        pts = []
        for s in range(7):
            a = math.radians(a0 + (s - 3) * 14 + math.sin(s * 1.7 + k) * 6)
            ee = e + math.sin(s * 2.1 + k) * 0.05
            rr = math.cos(ee * math.pi / 2)
            pts.append((x + math.cos(a) * r * rr * 1.01, y + math.sin(a) * r * 0.9 * rr * 1.01, z + r * 0.72 * math.sin(ee * math.pi / 2)))
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.55, segs=6, rings=1)
    rig.part(joint, g, glow=BRAIN_DK, outline=0)


def barnacles(rig, joint, spots, seed=0):
    """Small barnacle cones in clusters: spots = [(x, y, z, n, spread)] on a surface facing -Y."""
    rnd = random.Random(seed)
    g, d = Geo(), Geo()
    for x, y, z, n, s in spots:
        for _ in range(n):
            px, pz = x + rnd.uniform(-s, s), z + rnd.uniform(-s * 0.5, s * 0.5)
            r = rnd.uniform(1.3, 2.3)
            g.lathe([(0.1, -0.8), (r, -0.4), (r * 0.62, 1.5), (r * 0.35, 1.7)], (px, y, pz), (px, y - 1, pz), segs=8)
            d.sphere((px, y - 1.9, pz), r * 0.28, cuts=1)
    rig.part(joint, g, BARNACLE, outline=0.35)
    rig.part(joint, d, BARNACLE_DK, outline=0, highlight=False)


def coral_crust(rig, joint, spots, seed=0):
    """Encrusting coral on a surface facing -Y: clusters of knobbly pink bumps, spots = [(x, y, z, n)]."""
    rnd = random.Random(seed)
    g, gl = Geo(), Geo()
    for x, y, z, n in spots:
        for _ in range(n):
            px, pz = x + rnd.uniform(-6, 6), z + rnd.uniform(-3.5, 3.5)
            r = rnd.uniform(1.5, 2.8)
            (gl if rnd.random() < 0.4 else g).blob((px, y, pz), (r, r * 0.8, r * 0.9), p=2.0, cuts=2)
    rig.part(joint, g, CORAL, outline=0.4)
    rig.part(joint, gl, CORAL_LT, outline=0.4)


def starfish(rig, joint, c, r, rot=0.0, color=STAR):
    g = Geo().star(c, r, r * 0.42, 2.4, points=5, rot=(0, rot, 0))
    rig.part(joint, g, color, outline=0.5)
    g = Geo()
    for k in range(5):
        a = math.radians(90 + 72 * k - rot)
        for s in (0.35, 0.62):
            g.sphere((c[0] + math.cos(a) * r * s, c[1] - 1.9, c[2] + math.sin(a) * r * s), 0.55, cuts=1)
    rig.part(joint, g, CREAM, outline=0, highlight=False)


def scallop(rig, joint, c, r, color=SHELL, rot=0.0):
    """A scallop shell facing the camera: a ribbed fan with two small ears."""
    x, y, z = c
    pts = [(x, z - r * 0.55)]
    for k in range(11):
        a = math.radians(20 + 140 * k / 10)
        pts.append((x + math.cos(a) * r, z - r * 0.55 + math.sin(a) * r * 1.15))
    g = Geo().slab(pts, y, 1.8, rot=(0, rot, 0), origin=(x, y, z))
    g.slab([(x - r * 0.42, z - r * 0.62), (x + r * 0.42, z - r * 0.62), (x + r * 0.3, z - r * 0.36), (x - r * 0.3, z - r * 0.36)],
           y, 1.9, rot=(0, rot, 0), origin=(x, y, z))
    rig.part(joint, g, color, outline=0.5)
    g = Geo()
    for k in range(5):
        a = math.radians(40 + 100 * k / 4 - rot)
        g.capsule((x, y - 1.1, z - r * 0.5), (x + math.cos(a) * r * 0.9, y - 1.1, z - r * 0.5 + math.sin(a) * r * 1.0), 0.45, segs=6, rings=1)
    rig.part(joint, g, SHELL_PINK, outline=0)


def seaweed(rig, spots, seed=0):
    moss_drape(rig, "body", spots, WEED, seed=seed)


# -- the galleon --------------------------------------------------------------------------------
HULL_X0 = -69.0
HULL_PROF = [(0, 0), (18, 0), (26, 6), (30, 18), (31, 40), (29, 56), (23, 68), (14, 77), (6, 82), (0, 85)]
HULL_SQ = (1.42, 0.66)        # section: vertical, depth


def hull_r(t):
    for (r0, t0), (r1, t1) in zip(HULL_PROF, HULL_PROF[1:]):
        if t <= t1:
            return r0 + (r1 - r0) * (t - t0) / max(1e-6, t1 - t0)
    return 0.0


def hull_pt(t, theta_deg, deck, out=0.0):
    """A point on the hull at axis distance t (from the stern) and section angle theta (270 = the deck edge
    facing the camera, 360 = the keel)."""
    th = math.radians(theta_deg)
    r = hull_r(t) + out
    return (HULL_X0 + t, HULL_Y + r * math.sin(th) * HULL_SQ[1], deck - r * math.cos(th) * HULL_SQ[0])


def hull_lathe(deck, dr=0.0, z_lo=None, z_hi=None):
    prof = [(max(0.0, r + dr) if r > 0 else 0.0, t) for r, t in HULL_PROF]
    g = Geo().lathe(prof, (HULL_X0, HULL_Y, deck), (HULL_X0 + 1.0, HULL_Y, deck), segs=36, squash=HULL_SQ)
    g.clip((0, 0, deck if z_hi is None else z_hi), (0, 0, 1))
    if z_lo is not None:
        g.clip((0, 0, z_lo), (0, 0, -1))
    return g


def galleon(rig, M):
    deck = M[0][2]
    # the hull: wet dark timber, a team stripe along the gunwale, a light wale below it
    g = hull_lathe(deck)
    g.clip((0, 0, 0.5), (0, 0, -1))
    rig.part("body", g, WOOD)
    rig.part("body", hull_lathe(deck, 0.7, deck - 8.5, deck - 0.6), team=True)
    rig.part("body", hull_lathe(deck, 0.9, deck - 12.0, deck - 9.0), WOOD_LT, outline=0.5)
    g = hull_lathe(deck, 1.0, deck - 1.4, deck + 1.4)
    rig.part("body", g, WOOD_DK, outline=0.5)
    # plank seams (flat dark lines so the segments never catch their own light)
    g = Geo()
    for th in (296, 312, 326, 340):
        pts = [hull_pt(t, th, deck, 0.25) for t in range(26, 80, 4) if hull_r(t) > 8]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.6, segs=6, rings=1)
    for t in (36, 52, 66):
        pts = [hull_pt(t, th, deck, 0.25) for th in range(290, 352, 8)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.5, segs=6, rings=1)
    rig.part("body", g, glow=WOOD_DK, outline=0)
    # portholes with brass rims (dark at 50%) and two small cannon muzzles
    for t in (40.0, 58.0):
        p = hull_pt(t, 296, deck, 0.0)
        g = Geo()
        cyl(g, (p[0], p[1] + 1.5, p[2]), (p[0], p[1] - 1.8, p[2]), 4.6, bevel=0.6, segs=16)
        rig.part("body", g, BRASS, finish="metal", outline=0.5)
        g = Geo()
        cyl(g, (p[0], p[1] - 1.6, p[2]), (p[0], p[1] - 2.2, p[2]), 3.1, bevel=0.2, segs=16)
        rig.part("win", g, glow="#FFD89A", outline=0)
        g = Geo()
        cyl(g, (p[0], p[1] - 1.7, p[2]), (p[0], p[1] - 2.3, p[2]), 3.1, bevel=0.2, segs=16)
        rig.part("windark", g, glow=HOLE, outline=0)
    for t in (30.0, 48.0):
        p = hull_pt(t, 306, deck, -1.0)
        g = Geo()
        box(g, (p[0], p[1] - 0.6, p[2]), (4.4, 1.6, 3.6), p=4, cuts=2)
        rig.part("body", g, HOLE, outline=0, highlight=False)
        g = Geo()
        cyl(g, (p[0], p[1] + 2, p[2] - 0.4), (p[0] + 1.0, p[1] - 6.5, p[2] - 0.8), 2.4, bevel=0.5)
        rig.part("body", g, IRON, finish="metal", outline=0.5)
    # barnacles and weed on the lower hull
    spots = []
    for t, th in ((34, 342), (44, 348), (56, 338), (64, 330), (72, 326)):
        p = hull_pt(t, th, deck, 0.4)
        spots.append((p[0], p[1], p[2], 5, 4.0))
    barnacles(rig, "body", spots, seed=4)
    # the stempost rising into a gilded scroll, the bowsprit and its stay
    stem = [hull_pt(80, 345, deck, -1.0), (13.0, HULL_Y, deck - 8), (17.0, HULL_Y, deck + 4), (19.0, HULL_Y, deck + 14),
            (17.5, HULL_Y, deck + 20)]
    g = Geo()
    for i, (a, b) in enumerate(zip(stem, stem[1:])):
        g.capsule(a, b, 3.2 - i * 0.3, 3.0 - i * 0.3, segs=12, rings=2)
    rig.part("body", g, WOOD_DK)
    g = Geo()
    sc = (15.0, HULL_Y - 0.5, deck + 21.5)
    pts = [(sc[0] + math.cos(a) * (4.6 - a * 0.42), sc[1], sc[2] + math.sin(a) * (4.6 - a * 0.42)) for a in [k * 0.45 for k in range(12)]]
    for p0, p1 in zip(pts, pts[1:]):
        g.capsule(p0, p1, 1.5, 1.4, segs=8, rings=1)
    rig.part("body", g, GOLD, finish="metal", outline=0.5)
    g = Geo().capsule((5.0, HULL_Y + 1, deck + 2), (25.0, HULL_Y + 1, deck + 24), 2.4, 1.5, segs=12, rings=2)
    rig.part("body", g, WOOD_LT)
    g = Geo()
    rope(g, [(24.0, HULL_Y + 1, deck + 23), (20.5, HULL_Y, deck + 11), (17.5, HULL_Y, deck + 2)], r=0.55)
    rig.part("body", g, ROPE, outline=0.3)
    # the foredeck (mount 0): planks on a deck slightly overhanging the hull, bollards at its sides
    x, y, z = M[0]
    g = Geo().blob((x - 4, y + 4, z - 1.6), (25, 17, 1.6), p=2.6, cuts=5)
    rig.part("body", g, WOOD_LT)
    g = Geo()
    for k in range(5):
        yy = y + 4 - 14 + k * 7
        g.capsule((x - 25, yy, z + 0.05), (x + 15, yy, z + 0.05), 0.45, segs=6, rings=1)
    rig.part("body", g, glow=WOOD_DK, outline=0)
    g = Geo().blob((x - 4, y + 4, z - 4.4), (24, 16, 1.6), p=2.6, cuts=5)
    rig.part("body", g, WOOD_DK, outline=0.5)
    for bx in (x - 26, x + 15):
        g = Geo()
        cyl(g, (bx, y - 10, z - 1), (bx, y - 10, z + 3.6), 2.0, bevel=0.6, segs=12)
        rig.part("body", g, WOOD_DK, outline=0.5)
    # the stern breaks into the sea wall: splintered planks round the seam
    g = Geo()
    for zz, dx in ((deck - 6, 0), (deck - 18, 2), (deck - 30, -1)):
        g.blob((-37 + dx, -55.5 + (deck - zz) * 0.14, zz), (6.0, 1.4, 1.8), p=2.0, cuts=3, rot=(0, -20, 0), taper=(1.0, 0.25))
    rig.part("body", g, WOOD_LT, outline=0.4)
    # 25%: the hull stove in (a dark hole with broken plank ends)
    c = hull_pt(46, 318, deck, 0.6)
    pts = [(c[0] - 9, c[2] + 4), (c[0] - 3, c[2] + 7), (c[0] + 4, c[2] + 5), (c[0] + 9, c[2] + 6), (c[0] + 8, c[2] - 1),
           (c[0] + 10, c[2] - 6), (c[0] + 2, c[2] - 5), (c[0] - 4, c[2] - 8), (c[0] - 8, c[2] - 3)]
    g = Geo().slab(pts, c[1] - 0.4, 1.2)
    rig.part("hole", g, HOLE, outline=0, highlight=False)
    g = Geo()
    for dx, dz, rot in ((-8, 5, 25), (6, 6, -30), (9, -4, 15), (-6, -6, -20)):
        g.blob((c[0] + dx, c[1] - 1.6, c[2] + dz), (4.0, 1.2, 1.4), p=2.0, cuts=3, rot=(0, rot, 0), taper=(1.0, 0.2))
    rig.part("hole", g, WOOD_LT, outline=0.4)


def mast(rig, M):
    deck = M[0][2]
    mx, my, mz = M[2]
    ax, ay = mx - 1.5, my + 10.0       # the mast stands just behind the fighting top's centre
    g = Geo().capsule((ax, ay, deck - 6), (ax, ay, mz + 2), 3.8, 3.2, segs=14, rings=2)
    rig.part("body", g, WOOD)
    g = Geo()
    for zz in (deck + 40, deck + 74, mz - 22):
        cyl(g, (ax, ay, zz - 1.2), (ax, ay, zz + 1.2), 4.2, bevel=0.4, segs=14)
    rig.part("body", g, IRON, finish="metal", outline=0.4)
    # the fighting top (mount 2): a round deck on crosstrees, rope-wrapped rim, a cone under it
    x, y, z = M[2]
    g = Geo().lathe([(0, 0), (19.5, 0), (20.0, 1.2), (19.5, 3.4), (0, 3.4)], (x - 2, y + 5, z - 3.4), segs=30, squash=(1.0, 0.8))
    rig.part("body", g, WOOD_LT)
    g = Geo()
    for k in range(4):
        yy = y + 5 - 11 + k * 7.3
        g.capsule((x - 20, yy, z + 0.05), (x + 16, yy, z + 0.05), 0.42, segs=6, rings=1)
    rig.part("body", g, glow=WOOD_DK, outline=0)
    g = Geo().lathe([(19.8, 0), (20.6, 0.8), (20.6, 2.4), (19.8, 3.2)], (x - 2, y + 5, z - 3.4), segs=30, squash=(1.0, 0.8))
    rig.part("body", g, ROPE, finish="hair", outline=0.4)
    g = Geo().lathe([(4.0, 0), (14.0, 9.0), (17.0, 11.0), (0, 11.0)], (x - 2, y + 5, z - 14.4), segs=24, squash=(1.0, 0.8))
    rig.part("body", g, WOOD_DK, outline=0.5)
    g = Geo()
    for dx in (-14, 10):
        g.capsule((ax, ay - 2, z - 34), (x - 2 + dx, y + 2, z - 6), 1.6, segs=8, rings=1)
    rig.part("body", g, WOOD_DK, outline=0.5)
    # the topmast with the team pennant (snapped at 25%)
    g = Geo().capsule((ax, ay, z), (ax, ay, z + 44), 2.4, 1.6, segs=12, rings=2)
    rig.part("topmast", g, WOOD)
    g = Geo().sphere((ax, ay, z + 45.5), 2.2, cuts=2)
    rig.part("topmast", g, BRASS, finish="metal", outline=0.5)
    g = Geo().slab([(ax, z + 42), (ax - 26, z + 37.5), (ax - 18, z + 35), (ax - 25, z + 31.5), (ax, z + 33)], ay - 0.5, 1.2)
    rig.part("topmast", g, team=True, outline=0.5)
    g = Geo()
    for k, (dx, dz) in enumerate(((0, 6), (-1.5, 9), (1.2, 11), (-0.8, 13))):
        g.blob((ax + dx, ay, z + dz), (2.2, 2.0, 2.6 + k * 0.4), p=2.0, cuts=3, taper=(1.0, 0.2), rot=(0, (k - 1.5) * 18, 0))
    rig.part("stub", g, WOOD_LT, outline=0.5)
    # the yard with the furled team sail (torn loose at 50%)
    yz = deck + 92
    g = Geo().capsule((ax - 25, ay - 5, yz), (ax + 23, ay - 5, yz), 1.9, 1.6, segs=12, rings=2)
    rig.part("yard", g, WOOD_DK)
    sail = Geo()
    for k in range(7):
        px = ax - 22 + k * 7.0
        sail.blob((px, ay - 6.5, yz - 4.2), (4.6, 3.6, 3.8 - abs(k - 3) * 0.25), p=2.2, cuts=4)
    rig.part("yard", sail, team=True)
    g = Geo()
    for px in (ax - 15, ax - 1, ax + 13):
        g.lathe([(3.9, -1.0), (4.3, 0), (3.9, 1.0)], (px, ay - 6.5, yz - 4.2), (px + 1, ay - 6.5, yz - 4.2), segs=12)
    rig.part("yard", g, CREAM, outline=0.4)
    g = Geo().slab([(ax + 2, yz - 6), (ax + 22, yz - 6), (ax + 18, yz - 24), (ax + 12, yz - 30), (ax + 8, yz - 22), (ax + 3, yz - 26)],
                   ay - 8.0, 1.3)
    rig.part("sailhang", g, team=True, outline=0.5)
    # rigging: shrouds to the hull sides, the forestay to the bowsprit
    g = Geo()
    rope(g, [(ax, ay - 3, z - 14), (ax - 18, HULL_Y - 16, deck + 1)], r=0.55)
    rope(g, [(ax, ay - 3, z - 14), (ax + 9, HULL_Y - 15, deck + 1)], r=0.55)
    rope(g, [(ax, ay - 1, z - 14), (24.0, HULL_Y + 1, deck + 23)], r=0.55)
    rig.part("body", g, ROPE, outline=0.3)


def lighthouse(rig):
    x, y = LH
    g = Geo()
    cyl(g, (x, y, WALL_TOP - 6), (x, y, LH_TOP), 18.0, 14.5, bevel=1.0, segs=28)
    rig.part("body", g, PLASTER)
    for z0, z1 in ((100, 121), (166, 187)):
        r0 = 18.0 - 3.5 * (z0 - WALL_TOP) / (LH_TOP - WALL_TOP) + 0.5
        r1 = 18.0 - 3.5 * (z1 - WALL_TOP) / (LH_TOP - WALL_TOP) + 0.5
        g = Geo()
        cyl(g, (x, y, z0), (x, y, z1), r0, r1, bevel=0.5, segs=28)
        rig.part("body", g, team=True)
    g = Geo()
    cyl(g, (x, y, WALL_TOP - 6), (x, y, WALL_TOP + 6), 19.6, 19.0, bevel=0.8, segs=28)
    rig.part("body", g, STONE_DK)
    for wz in (144, 210):
        window(rig, "win", x + 4, y - 17.4 + (wz - WALL_TOP) * 0.02, wz, 5.0, 10.0, frame=WOOD_DK)
        window(rig, "windark", x + 4, y - 17.6 + (wz - WALL_TOP) * 0.02, wz, 5.0, 10.0, glow_hex=HOLE, frame=WOOD_DK)
    # the gallery: a stone ring on corbels, an iron rail
    g = Geo()
    G = LH_TOP - 4                      # the gallery floor
    cyl(g, (x, y, G - 2), (x, y, G + 4), 21.5, bevel=0.8, segs=30)
    rig.part("body", g, STONE_LT)
    g = Geo()
    for k in range(9):
        a = math.radians(190 + 160 * k / 8)
        g.blob((x + math.cos(a) * 16.5, y + math.sin(a) * 16.5, G - 6), (2.4, 2.4, 4.0), p=3.0, cuts=2)
    rig.part("body", g, STONE_DK, outline=0.5)
    g = Geo()
    for k in range(13):
        a = math.radians(180 + 180 * k / 12)
        p = (x + math.cos(a) * 20.5, y + math.sin(a) * 20.5)
        g.capsule((p[0], p[1], G + 4), (p[0], p[1], G + 11), 0.55, segs=6, rings=1)
    rig.part("rail", g, IRON, finish="metal", outline=0.3)
    g = Geo().lathe([(20.3, G + 10.2), (21.1, G + 10.6), (21.1, G + 11.8), (20.3, G + 12.2)], (x, y, 0), segs=36)
    rig.part("rail", g, IRON, finish="metal", outline=0.3)
    # the lantern room: glowing glass between iron mullions (dark at 25%)
    L0, L1 = G + 4, G + 26
    g = Geo()
    cyl(g, (x, y, L0), (x, y, L1), 11.5, bevel=0.4, segs=24)
    rig.part("lanternlit", g, glow=GLASS, outline=0)
    g = Geo().blob((x, y - 6, (L0 + L1) / 2), (6.0, 3.0, 7.0), p=2.0)
    rig.part("lanternlit", g, glow=GLASS_CORE, outline=0)
    g = Geo()
    cyl(g, (x, y, L0), (x, y, L1), 11.5, bevel=0.4, segs=24)
    rig.part("lanterndark", g, glow=GLASS_DARK, outline=0)
    g = Geo()
    for k in range(7):
        a = math.radians(190 + 160 * k / 6)
        p = (x + math.cos(a) * 11.8, y + math.sin(a) * 11.8)
        g.capsule((p[0], p[1], L0), (p[0], p[1], L1), 0.75, segs=6, rings=1)
    cyl(g, (x, y, L0 - 1), (x, y, L0 + 1.4), 12.6, bevel=0.4, segs=24)
    cyl(g, (x, y, L1 - 1), (x, y, L1 + 1.6), 13.2, bevel=0.4, segs=24)
    rig.part("body", g, IRON, finish="metal", outline=0.4)
    # the team cap (knocked askew at 25%) with a brass ball
    C = L1 + 1
    g = Geo().lathe([(0, 0), (15.5, 0), (15.0, 2.6), (10.2, 10.0), (4.4, 18.0), (0, 21.0)], (x, y, C), segs=28)
    rig.part("cap", g, team=True)
    g = Geo().sphere((x, y, C + 22.5), 2.6, cuts=3)
    g.capsule((x, y, C + 19), (x, y, C + 21), 1.2)
    rig.part("cap", g, BRASS, finish="metal", outline=0.5)


def sea_tower(rig, M):
    x, y, r0, r1, h = TW
    g = Geo()
    cyl(g, (x, y, 0), (x, y, h), r0, r1, bevel=1.2, segs=34)
    rig.part("body", g, STONE_DK)
    ring_blocks(rig, "body", x, y, r0 - 1.3, WALL_TOP + 3, 176, [STONE, STONE_SEA, STONE_LT, STONE_PINK], h=15.0, n=8)
    ring_blocks(rig, "body", x, y, r1 + 0.4, 182, h - 4, [STONE, STONE_LT, STONE_PINK, STONE_MID], h=15.0, n=8)
    g = Geo()
    for z in (WALL_TOP, 178):
        rr = tower_r(z) + 2.2
        cyl(g, (x, y, z - 2.5), (x, y, z + 2.5), rr, bevel=0.8, segs=34)
    cyl(g, (x, y, h - 5), (x, y, h + 1), r1 + 2.6, bevel=0.8, segs=34)
    rig.part("body", g, STONE_LT)
    # parapet merlons round the back half (one knocked off at 75%), corbels under the walk
    g, gm = Geo(), Geo()
    for k in range(7):
        a = math.radians(150 - 120 * k / 6) if k < 7 else 0
        p = (x + math.cos(a) * (r1 + 0.5), y + math.sin(a) * (r1 + 0.5), h + 6.5)
        (gm if k == 1 else g).blob(p, (5.0, 4.0, 5.5), p=4.0, cuts=2, rot=(0, 0, math.degrees(a) + 90))
    for k in range(3):
        a = math.radians(196 + 20 * k)
        p = (x + math.cos(a) * (r1 + 0.5), y + math.sin(a) * (r1 + 0.5), h + 6.5)
        g.blob(p, (5.0, 4.0, 5.5), p=4.0, cuts=2, rot=(0, 0, math.degrees(a) + 90))
    rig.part("body", g, STONE_LT)
    rig.part("merlon", gm, STONE_LT)
    g = Geo()
    for k in range(10):
        a = math.radians(190 + 160 * k / 9)
        g.blob((x + math.cos(a) * (r1 + 1.8), y + math.sin(a) * (r1 + 1.8), h - 9), (2.6, 2.4, 3.6), p=3.0, cuts=2)
    rig.part("body", g, STONE_DKR, outline=0.5)
    # windows
    for wx, wz in ((x - 12, 148), (x + 8, 212)):
        wy = y - tower_r(wz) - 0.4
        window(rig, "win", wx, wy, wz, 7.0, 13.0, frame=WOOD_DK)
        window(rig, "windark", wx, wy - 0.2, wz, 7.0, 13.0, glow_hex=HOLE, frame=WOOD_DK)
        g = Geo()
        box(g, (wx, wy - 1.4, wz - 7.6), (5.2, 1.6, 1.0), p=4, cuts=2)
        rig.part("body", g, STONE_LT, outline=0.5)
    # the balcony (mount 1) and the parapet platform (mount 3): sea-stone slabs on stepped corbels
    platform(rig, "body", M[1], STONE_LT, STONE_DK, style="stone", r=(25, 19))
    platform(rig, "body", M[3], STONE_LT, STONE_DK, style="stone", r=(25, 19))
    seaweed(rig, [(M[1][0] - 2, M[1][1] - 14, M[1][2] - 9, 30), (x - 8, y - tower_r(178) - 2, 176, 30),
                  (x - 20, y - tower_r(WALL_TOP) + 2, WALL_TOP - 2, 16)], seed=2)
    # coral on the tower's shoulder (knocked off at 75%) and a tube clump on the parapet
    coral_tree(rig, "coralA", (x - 25, y - 18, 190), 30, spread=1.0, seed=3, lean=14)
    tube_coral(rig, "body", (x - 22, y + 10, h + 1), n=4, k=0.9, seed=5)
    coral_tree(rig, "body", (x - 10, y + 18, h + 1), 26, spread=1.0, seed=9, lean=-10)
    sea_fan(rig, "body", (x - 18, y - tower_r(110) - 1.5, 104), 10, 14, seed=4, rot=12)
    coral_crust(rig, "body", [(x - 4, y - tower_r(70) - 0.8, 72, 8), (x + 16, y - tower_r(160) - 0.6, 160, 5),
                              (x - 22, y - tower_r(232) - 0.6, 232, 5)], seed=5)
    starfish(rig, "body", (x + 14, y - tower_r(96) - 1.0, 96), 5.6, rot=18)
    barnacles(rig, "body", [(x - 6, y - tower_r(70) - 0.4, 70, 6, 6.0), (x + 12, y - tower_r(132) - 0.2, 128, 4, 4.0)], seed=7)


def sea_wall(rig):
    # the battered wall block, ashlar, a cordon and merlons along its front
    c, r = (-100.0, 8.0, WALL_TOP / 2), (58.0, 44.0, WALL_TOP / 2)
    g = Geo()
    box(g, c, r, p=9, taper=(1.0, 0.9))
    rig.part("body", g, STONE_DK)
    fy = c[1] - r[1] + 0.6

    def skip(px, pz):
        gate = abs(px - GATE_X) < 16 and pz < 42
        breach = math.hypot(px - BREACH[0], (pz - BREACH[1]) * 1.2) < 11
        guns = any(abs(px - gx) < 9 and abs(pz - gz) < 7 for gx, gz in GUNS)
        return gate or breach or guns

    ashlar(rig, "body", -154, -46, 8, WALL_TOP - 4, fy - 0.8, [STONE, STONE_SEA, STONE_LT, STONE_PINK], h=11.0, w=(14.0, 20.0), seed=4,
           skip=skip)
    g = Geo()
    box(g, (c[0], c[1], WALL_TOP - 1), (r[0] * 0.9 + 2, r[1] * 0.9 + 2, 3.2), p=6)
    rig.part("body", g, STONE_LT)
    g = Geo()
    for mx in (-150.0, -131.0, -112.0):
        box(g, (mx, fy + 4.5, WALL_TOP + 6.2), (5.0, 3.8, 4.6), p=5)
    rig.part("body", g, STONE_LT)
    # the tidal line: barnacles and weed along the foot
    g = Geo()
    box(g, (c[0], fy - 0.4, 4.0), (r[0] - 0.5, 1.2, 4.0), p=5)
    rig.part("body", g, WEED_DK, finish="hair", outline=0.5)
    barnacles(rig, "body", [(-146, fy - 1.6, 9, 6, 7.0), (-104, fy - 1.6, 8, 4, 6.0), (-64, fy - 1.6, 10, 6, 7.0)], seed=9)
    seaweed(rig, [(-142, fy - 2, WALL_TOP - 3, 22), (-120, fy - 2, WALL_TOP - 3, 14), (-68, fy - 2, WALL_TOP - 3, 18)], seed=4)
    coral_crust(rig, "body", [(-150, fy - 1.0, 18, 7), (-86, fy - 1.0, 50, 6), (-60, fy - 1.0, 14, 7)], seed=3)
    # the sea gate: a dark arch with a sea-green studded door, voussoirs and two lanterns
    gx = GATE_X
    arch = [(gx - 12, 0), (gx + 12, 0), (gx + 12, 22)] + [(gx + 12 * math.cos(a), 22 + 12 * math.sin(a)) for a in
                                                       [math.pi * k / 8 for k in range(1, 8)]] + [(gx - 12, 22)]
    g = Geo().slab(arch, fy - 1.0, 3.0)
    rig.part("body", g, DOOR)
    g = Geo()
    for zz in (8, 18, 28):
        for dx in (-7, 0, 7):
            g.sphere((gx + dx, fy - 2.8, zz), 0.9, cuts=1)
    box(g, (gx, fy - 2.6, 14), (11.0, 0.6, 0.9), p=4, cuts=2)
    rig.part("body", g, IRON, finish="metal", outline=0.3)
    g = Geo()
    for a in [math.pi * k / 10 for k in range(0, 11)]:
        box(g, (gx + 15 * math.cos(a), fy - 2.0, 22 + 15 * math.sin(a)), (2.6, 1.5, 2.6), p=4, cuts=2)
    rig.part("body", g, STONE_LT, outline=0.5)
    lantern(rig, "body", gx - 20, fy - 3.0, 30, iron=IRON, arm=-6.0)
    lantern(rig, "body", gx + 20, fy - 3.0, 30, iron=IRON, arm=6.0)
    # cannon embrasures
    for gxx, gz in GUNS:
        g = Geo()
        box(g, (gxx, fy - 0.6, gz), (7, 2, 5.5), p=4, cuts=2)
        rig.part("body", g, HOLE, outline=0, highlight=False)
        g = Geo()
        cyl(g, (gxx, fy + 4, gz - 0.5), (gxx + 0.5, fy - 7, gz - 0.5), 3.4, bevel=0.6)
        rig.part("body", g, IRON, finish="metal", outline=0.5)
    # reef life on the wall and at its foot
    starfish(rig, "body", (-136, fy - 1.6, 44), 5.2, rot=-12)
    scallop(rig, "body", (-92, fy - 1.4, 12), 4.2, rot=10)
    scallop(rig, "body", (-150, fy - 1.4, 30), 3.6, color=SHELL_PINK, rot=-15)
    sea_fan(rig, "body", (-138, fy - 3.0, 2), 14, 20, seed=1, rot=-8)
    tube_coral(rig, "body", (-152, -44, 0), n=5, k=1.0, seed=2)
    coral_tree(rig, "body", (-84, fy - 4, 0), 22, spread=0.9, seed=8, lean=-8)
    # a big pink coral on the wall's top corner, in front of the lighthouse's foot
    coral_tree(rig, "body", (-150, fy + 6, WALL_TOP + 1), 34, spread=1.0, seed=11, lean=-6)


GATE_X = -118.0
BREACH = (-76.0, 26.0)
GUNS = ((-150.0, 38.0), (-94.0, 38.0))


def build(rig, M):
    for j, pos in (("cap", (LH[0], LH[1], LH_TOP + 23)), ("coralA", (-105, -14, 190)), ("merlon", (-80, 4, 252)),
                   ("yard", (M[2][0] - 1.5, M[2][1] + 5, M[0][2] + 92)), ("rail", (LH[0], LH[1], LH_TOP + 2))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "fire1", "fire2", "scorch", "breach",
              "windark", "lanterndark", "stub", "hole", "sailhang"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    for j in ("win", "lanternlit", "topmast"):
        rig.joint(j, "body", (0, 0, 0))

    lighthouse(rig)
    sea_wall(rig)
    sea_tower(rig, M)
    # reef rocks under the wreck
    g = Geo()
    for k, (rx, ry, rz, s) in enumerate(((-30, -36, 6, 18), (-8, -42, 4, 14), (10, -40, 3, 10), (-50, -50, 4, 10))):
        rock(g, (rx, ry, rz), (s, s * 0.75, s * 0.7), seed=60 + k, jag=0.16)
    rig.part("body", g, STONE_DKR)
    galleon(rig, M)
    mast(rig, M)
    brain_coral(rig, "body", (-14, -54, 3), 8.0, seed=3)
    tube_coral(rig, "body", (14, -46, 2), n=3, k=0.8, seed=6)
    barnacles(rig, "body", [(-30, -50, 12, 5, 6.0), (-6, -54, 8, 4, 4.0)], seed=12)

    # damage: cracks, the breach, fires and soot
    tx, ty = TW[0], TW[1]

    def tw(a, z, out=1.0):
        rr = tower_r(z) + out
        return (tx + math.cos(math.radians(a)) * rr, ty + math.sin(math.radians(a)) * rr, z)

    chipped_cracks(rig, "crack1", [[tw(250, 150), tw(255, 138), tw(250, 126)], [(-146, -37.6, 30), (-140, -37.6, 20), (-146, -37.6, 10)]],
                   CRACK, STONE_LT)
    chipped_cracks(rig, "crack2", [[tw(280, 120), tw(284, 108), tw(280, 96)], [(-130, -37.6, 52), (-124, -37.6, 42)],
                                   [tw(236, 212), tw(240, 200), tw(236, 190)]], CRACK, STONE_LT)
    chipped_cracks(rig, "crack3", [[tw(266, 238), tw(270, 226), tw(266, 214)], [(-60, -37.6, 50), (-54, -37.6, 40), (-60, -37.6, 30)]],
                   CRACK, STONE_LT)
    g = Geo()
    for dx, dz, rr in ((0, 0, 9.5), (-7, -4, 6.0), (7, -3, 6.5), (-4, 6, 5.5), (5, 6, 5.0), (0, -7, 5.0)):
        g.blob((BREACH[0] + dx, -37.8, BREACH[1] + dz), (rr, 2.2, rr * 0.85), p=1.8, rot=(0, 30 * dx, 0))
    rig.part("breach", g, HOLE, outline=0, highlight=False)
    g = Geo()
    for dx, dz, rot in ((-12, 8, 20), (11, 9, -25), (-13, -6, 40), (12, -8, -10), (0, 12, 5)):
        box(g, (BREACH[0] + dx, -39.2, BREACH[1] + dz), (3.6, 1.8, 2.6), p=3, rot=(0, rot, 0))
    rig.part("breach", g, STONE_DK, outline=0.6)
    g = Geo()
    for px, py, pz, w, hh in ((-60, -36.8, 46, 16, 12), (tx - 6, ty - tower_r(236) - 1.2, 234, 14, 12), (LH[0] + 2, LH[1] - 21, LH_TOP - 12, 10, 9)):
        g.blob((px, py, pz), (w, 1.4, hh), p=2.0)
    rig.part("scorch", g, SOOT, outline=0, highlight=False)
    flames(rig, "fire1", [(-52, -40, M[0][2] - 2, 0.9), (-64, -36, WALL_TOP + 2, 1.0), (-150, -30, WALL_TOP + 4, 0.7)])
    flames(rig, "fire2", [(tx - 14, ty - 12, TW[4] + 2, 1.2), (LH[0] - 4, LH[1] - 20, LH_TOP - 2, 0.8), (-36, -54, M[0][2] - 14, 0.9)])
    rubble(rig, "rubble1", [(-158, -50), (-134, -58)], STONE_DK, seed=3)
    rubble(rig, "rubble2", [(-106, -60), (-70, -58), (-150, -64)], STONE_DK, seed=13)
    rubble(rig, "rubble3", [(-150, -68), (-118, -70), (-40, -66), (18, -60)], STONE_DK, seed=23, size=1.2)
    for j, pts in (("rubble1", [(-146, -56)]), ("rubble2", [(-90, -64)]), ("rubble3", [(-128, -72), (-56, -70)])):
        for k, (sx, sy) in enumerate(pts):
            scallop(rig, j, (sx, sy - 7, 4), 3.2, color=SHELL if k % 2 else SHELL_PINK, rot=20 * (k + 1))

    # flags: on the lighthouse cap and on the sea tower's back
    flag(rig, "root", "flagA", (LH[0], LH[1], LH_TOP + 88), length=30, height=17, pole=LH_TOP + 48)
    flag(rig, "root", "flagB", (TW[0] - 20, TW[1] + 14, 300), length=24, height=14, pole=TW[4])

    # Treasury: a giant clam with pearls, barrels and shot, an open sea chest of gold
    cx, cy = -156.0, -62.0
    g = Geo().blob((cx, cy, 4.0), (10.5, 8.0, 4.0), p=2.4, cuts=4)
    rig.part("treasury1", g, SHELL_PINK)
    g = Geo().blob((cx, cy + 4, 10.0), (10.0, 3.0, 8.0), p=2.4, cuts=4, rot=(-30, 0, 0))
    rig.part("treasury1", g, SHELL)
    g = Geo()
    for dx, dz in ((-4, 7.6), (0, 8.2), (4, 7.6), (-2, 10.4), (2, 10.6)):
        g.sphere((cx + dx, cy - 2, dz), 2.2, cuts=2)
    rig.part("treasury1", g, PEARL, finish="gloss", outline=0.4)
    for k, (bx, by) in enumerate(((-134, -64), (-122, -66))):
        g = Geo().lathe([(0, 0), (6.2, 0), (7.2, 7), (6.2, 14), (0, 14)], (bx, by, 0), (bx, by, 14), segs=16)
        rig.part("treasury2", g, WOOD_LT)
        g = Geo()
        for z in (2.5, 11.5):
            cyl(g, (bx, by, z - 1), (bx, by, z + 1), 6.8 - abs(z - 7) * 0.1, bevel=0.3)
        rig.part("treasury2", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    for (dx, dz) in ((-6, 3.2), (0, 3.2), (6, 3.2), (-3, 8.8), (3, 8.8), (0, 14.4)):
        g.sphere((-110 + dx, -70, dz), 3.2, cuts=3)
    rig.part("treasury2", g, IRON, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-96, -66, 6.5), (10, 7, 6.5), p=5)
    rig.part("treasury3", g, WOOD)
    g = Geo()
    box(g, (-96, -60, 17.5), (10, 1.6, 6.0), p=5, rot=(-24, 0, 0))
    rig.part("treasury3", g, WOOD_LT)
    g = Geo()
    for dx, dz in ((-5, 13.4), (2, 14.2), (-1, 15.6), (6, 13.0), (-8, 12.8), (4, 16.2)):
        g.blob((-96 + dx, -66, dz), (3.2, 3.2, 1.4), p=2.0)
    for dx in (-8, 8):
        box(g, (-96 + dx, -73.2, 6.5), (1.2, 0.6, 6.5), p=4, cuts=2)
    rig.part("treasury3", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    for k in range(8):
        a = math.radians(200 + 18 * k)
        g.sphere((-96 + math.cos(a) * 7.0, -73.5, 12.0 + math.sin(a) * 3.0), 1.1, cuts=1)
    rig.part("treasury3", g, PEARL, finish="gloss", outline=0.3)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "coralA": {"hide": True}, "merlon": {"hide": True}, "rubble1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breach": {"show": True}, "fire1": {"show": True},
                     "scorch": {"show": True}, "win": {"hide": True}, "windark": {"show": True}, "sailhang": {"show": True},
                     "yard": {"r": -7.0, "z": -1.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire2": {"show": True},
                     "cap": {"r": 22.0, "x": -5.0, "z": -7.0}, "lanternlit": {"hide": True}, "lanterndark": {"show": True},
                     "topmast": {"hide": True}, "stub": {"show": True}, "hole": {"show": True}, "rail": {"r": 6.0},
                     "yard": {"r": -14.0, "z": -3.0}})
    return pose


CORAL_FORT = base_module(
    "gunpowder", "Coral Fort", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build, crumble=crumble, mount_depth=DEPTHS, skin="coral_fort",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((LH[0], LH[1] - 14, LH_TOP + 11), 2, 30), ((GATE_X - 20, -42, 30), 3, 16), ((GATE_X + 20, -42, 30), 3, 16),
            ((-26, -56, 40), 2, 12)],
    smoke=[((TW[0], TW[1], TW[4] + 6), 2), ((-60, -40, 64), 3), ((LH[0], LH[1], LH_TOP), 3)],
    horn=(-100, 350), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "stone",
        # the lighthouse falls toward the lane first, then the mast with its fighting top
        "topple": [topple_lu(-150, -108, 150, delay_ms=0, push=1.0, sink_lu=34),
                   topple_lu(-26, 22, 120, delay_ms=140, push=0.8, sink_lu=26)],
        "rubbleColors": [STONE, STONE_DK, CORAL, WOOD],
        "dustColor": "#BDB8AE",
        "ambientLu": [ambient_lu("glints", (LH[0], LH[1] - 12, LH_TOP + 11), 18, 1.0), ambient_lu("glints", (-105, -20, 200), 16, 0.8),
                      ambient_lu("glints", (-148, -44, 12), 16, 0.8), ambient_lu("glints", (12, -40, 80), 14, 0.7),
                      ambient_lu("glints", (-14, -56, 8), 14, 0.6)],
    },
)

SKINS = [CORAL_FORT]
