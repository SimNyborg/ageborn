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
                          prop_loop, rock, rope, rubble, topple_lu, window)

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



# ---------------------------------------------------------------------------------------------------
# Windmill Redoubt (round 3; Rare, Time Capsule): a brick redoubt crowned by a big tower mill whose sails turn. The
# redoubt is battered brick with cream quoins, a cream cordon and a parapet with embrasures, planters of muted
# flowers along it; a canal runs along its foot with a little lock (two mitre gates with long balance beams). The
# tower mill rises from the redoubt's terrace: tapering brick with cream bands, windows with team shutters and window
# boxes, a reefing gallery that carries the top mount, a boat-shaped shingled cap with a finial, the windshaft boss on
# its front; the four sails (lattice frames with team canvas) are the `sails` prop loop (6 steps of 15 degrees, one
# quarter turn: the four sails make it an exact loop), cut where the gallery stands in front of them. A round brick
# bastion at the lane edge carries the lower and upper gate-side mounts, a team banner down its face; the gate is an
# arch beside it with a team door. Team colour: the sail canvas, the shutters, the banners, the gate door and the flags.
#
# Crumble: 75% cracks, a planter and the bastion's lantern knocked off, brick rubble; 50% a burning breach in the
# redoubt's wall, the bastion banner torn, soot; 25% a ragged burning breach in the bastion, the cap knocked askew
# with two snapped sails hanging still (the turning sails gone), fire in the mill. Treasury: flour sacks and a
# wheelbarrow (1), stacked cheese wheels and barrels (2), a chest of gold and crates of tulip bulbs (3).

WR_BRICK = "#82594F"            # brick kept under 45% saturation (A11: the orange team)
WR_BRICK_LT = "#937062"
WR_BRICK_DK = "#6C4B42"
WR_BRICK_DKR = "#5E3B2F"
WR_CREAM = "#EFE6CF"
WR_CREAM_SH = "#D9CFB6"
WR_WOOD = "#7A5E44"
WR_WOOD_DK = "#5A4535"
WR_WOOD_LT = "#937458"
WR_SHINGLE = "#6E6152"
WR_SHINGLE_DK = "#5A4F43"
WR_WATER = "#8FA8A6"
WR_WATER_LT = "#B5C8C4"
WR_LEAF = "#6F8A5A"
WR_LEAF_DK = "#58704A"
WR_PINK = "#C9A0A8"
WR_LAV = "#A99BC1"
WR_IRON = "#4A4A4E"
WR_GLASS = "#F2D9A2"
WR_SACK = "#D8CDB2"
WR_CHEESE = "#E6CF8A"
WR_CRACK = "#4E3A31"
WR_DEPTHS = [-40, -24, -40, -24]
WR_MILL = (-104.0, 4.0)           # the mill tower's axis
WR_TERRACE = 116.0                # the redoubt's terrace (the mill stands on it)
WR_MILL_TOP = 262.0               # the tower's top: the gallery and the cap's foot
WR_HUB = (-104.0, -26.0, 274.0)   # the windshaft boss: the sails' centre
WR_SAIL_R = 55.0
WR_SAIL_FRAMES, WR_SAIL_MS = 6, 210
WR_BASTION = (2.4, -14.0)         # the round bastion's axis


def wr_mill_r(z):
    """The mill tower's radius at height z (a straight taper from the terrace to the top)."""
    t = (z - WR_TERRACE) / (WR_MILL_TOP - WR_TERRACE)
    return 25.0 + (17.0 - 25.0) * t


def wr_courses(rig, joint, x0, x1, y, z0, z1, every=7.0, seed=0, tone=None):
    """Brick courses on a wall facing the camera: thin mortar-dark lines and a scatter of lighter and darker bricks."""
    rnd = random.Random(seed)
    g, lt, dk = Geo(), Geo(), Geo()
    z = z0 + every
    row = 0
    while z < z1 - 2:
        g.capsule((x0 + 1.0, y - 0.3, z), (x1 - 1.0, y - 0.3, z), 0.35, segs=4, rings=1)
        x = x0 + 3.0 + (row % 2) * 5.0
        while x < x1 - 6:
            if rnd.random() < 0.18:
                (lt if rnd.random() < 0.5 else dk).blob((x + 4.0, y - 0.5, z - every / 2), (4.0, 0.7, every / 2 - 0.7), p=5.0, cuts=2)
            x += 10.0
        z += every
        row += 1
    rig.part(joint, g, tone or WR_BRICK_DKR, outline=0, highlight=False)
    rig.part(joint, lt, WR_BRICK_LT, outline=0.3)
    rig.part(joint, dk, WR_BRICK_DK, outline=0.3)


def wr_quoins(rig, joint, x, y, z0, z1, h=7.0):
    """Cream quoins up a corner: alternating long and short blocks."""
    g = Geo()
    z = z0
    k = 0
    while z + h <= z1 + 0.1:
        w = 5.2 if k % 2 == 0 else 3.2
        box(g, (x, y - 0.4, z + h / 2), (w, 1.8, h / 2 - 0.6), p=8, cuts=2)
        z += h
        k += 1
    rig.part(joint, g, WR_CREAM, outline=0.45)


def wr_planter(rig, joint, x, y, z, w=14.0, seed=0):
    """A stone planter of muted flowers: a cream trough, sage leaves and soft pink, lavender and cream blooms."""
    rnd = random.Random(seed)
    g = Geo()
    box(g, (x, y, z + 2.6), (w / 2, 3.6, 2.6), p=6, cuts=2, taper=(0.86, 1.0))
    rig.part(joint, g, WR_CREAM_SH, outline=0.5)
    lf, b1, b2, b3 = Geo(), Geo(), Geo(), Geo()
    n = int(w / 3.2)
    for i in range(n):
        xx = x - w / 2 + 1.6 + (w - 3.2) * i / max(1, n - 1)
        lf.blob((xx, y - 0.4, z + 6.2), (2.2, 2.0, 2.0), p=2.2, cuts=2)
        b = (b1, b2, b3)[(i + seed) % 3]
        b.sphere((xx + rnd.uniform(-0.8, 0.8), y - 1.6, z + 7.6 + rnd.uniform(0, 1.6)), 1.35, cuts=2)
    rig.part(joint, lf, WR_LEAF, finish="hair")
    rig.part(joint, b1, WR_PINK, outline=0.3)
    rig.part(joint, b2, WR_LAV, outline=0.3)
    rig.part(joint, b3, WR_CREAM, outline=0.3)


def wr_window(rig, joint, x, y, z, w=7.0, h=10.0, shutters=True, box_flowers=False, seed=0):
    """A small window: a cream frame, warm glass, team shutters folded back, a window box of flowers."""
    g = Geo()
    box(g, (x, y, z), (w / 2 + 1.2, 1.0, h / 2 + 1.2), p=6, cuts=2)
    rig.part(joint, g, WR_CREAM, outline=0.4)
    g = Geo()
    box(g, (x, y - 0.8, z), (w / 2, 0.6, h / 2), p=6, cuts=2)
    rig.part(joint, g, glow=WR_GLASS, outline=0)
    g = Geo()
    box(g, (x, y - 1.4, z), (0.5, 0.4, h / 2), p=4, cuts=1)
    box(g, (x, y - 1.4, z), (w / 2, 0.4, 0.5), p=4, cuts=1)
    rig.part(joint, g, WR_WOOD_DK, outline=0)
    if shutters:
        for sgn in (-1, 1):
            g = Geo()
            box(g, (x + sgn * (w / 2 + 3.4), y - 0.8, z), (2.6, 0.8, h / 2 + 0.6), p=6, cuts=2)
            rig.part(joint, g, team=True, outline=0.4)
    if box_flowers:
        wr_planter(rig, joint, x, y - 2.4, z - h / 2 - 5.2, w=w + 4.0, seed=seed)


def wr_sail_geo(a_deg, R=WR_SAIL_R):
    """One sail in the sails' plane (character XZ at the hub's y): the whip from the boss out to R, a lattice frame on
    its trailing side with cross bars, and team canvas over most of the frame. Returns (wood, frame, canvas)."""
    hx, hy, hz = WR_HUB
    a = math.radians(a_deg)
    ux, uz = math.cos(a), math.sin(a)         # along the sail
    vx, vz = math.sin(a), -math.cos(a)        # its trailing side

    def P(r, d, dy=0.0):
        return (hx + ux * r + vx * d, hy + dy, hz + uz * r + vz * d)
    wood, frame, canvas = Geo(), Geo(), Geo()
    wood.capsule(P(5.0, 0.0, -0.6), P(R, 0.0, -0.6), 1.5, 1.0, segs=8, rings=1)
    for d in (1.6, 14.6):
        frame.capsule(P(10.0, d, -1.4), P(R - 1.0, d, -1.4), 0.8, segs=6, rings=1)
    n = 10
    for i in range(n):
        r = 11.0 + (R - 12.0) * i / (n - 1)
        frame.capsule(P(r, 0.6, -1.4), P(r, 15.2, -1.4), 0.65, segs=6, rings=1)
    pts = []
    for r, d in ((13.0, 2.4), (R - 3.0, 2.4), (R - 3.0, 13.8), (13.0, 13.8)):
        x, _, z = P(r, d)
        pts.append((x, z))
    canvas.slab(pts, hy - 0.6, 0.8)
    return wood, frame, canvas


def wr_sails_pose(f):
    """The sails turn a quarter in six steps (counter-clockwise as seen from the front, as Dutch mills turn)."""
    return {"sails": {"r": 90.0 * f / WR_SAIL_FRAMES}}


def build_windmill(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachR", "breachB", "soot", "millFire"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("planterL", "body", (-138.0, -40.0, WR_TERRACE))
    rig.joint("lantern", "body", (WR_BASTION[0] - 18.0, -46.0, 40.0))
    rig.joint("bannerB", "body", (WR_BASTION[0], WR_BASTION[1] - 18.4, 182.0))
    rig.joint("cap", "body", (WR_MILL[0], WR_MILL[1], WR_MILL_TOP))
    rig.joint("brokenSails", "cap", WR_HUB, hidden=True)
    bx, by = WR_BASTION

    # -- the redoubt: battered brick walls, cream quoins and cordon, a parapet with embrasures ---------------
    g = Geo()
    box(g, (-86.0, 8.0, 52.0), (62.0, 44.0, 52.0), p=10, taper=(1.0, 0.94))
    rig.part("body", g, WR_BRICK)
    g = Geo()
    box(g, (-86.0, 6.0, WR_TERRACE - 6.0), (60.0, 42.0, 6.0), p=8)
    rig.part("body", g, WR_BRICK_DK)
    wr_courses(rig, "body", -146.0, -26.0, -36.6, 2.0, 100.0, every=7.0, seed=3)
    for x in (-146.6, -25.4):
        wr_quoins(rig, "body", x, -37.0, 0.0, 98.0)
    g = Geo()
    box(g, (-86.0, 6.0, 102.0), (64.0, 45.0, 2.4), p=6)
    rig.part("body", g, WR_CREAM)
    # the parapet with embrasures, cream copings
    par, cop = Geo(), Geo()
    for i in range(7):
        x = -142.0 + i * 20.0
        if x > -78.0:
            continue
        box(par, (x + 6.0, -37.0, 109.0), (6.0, 3.2, 5.0), p=6, cuts=2)
        box(cop, (x + 6.0, -37.4, 114.6), (6.8, 3.8, 1.0), p=6, cuts=2)
    rig.part("body", par, WR_BRICK_LT)
    rig.part("body", cop, WR_CREAM, outline=0.4)
    g = Geo()
    box(g, (-86.0, 8.0, WR_TERRACE - 0.8), (58.0, 40.0, 0.8), p=6)
    rig.part("body", g, WR_CREAM_SH)
    # planters along the parapet (the left one is knocked off at 75%)
    wr_planter(rig, "planterL", -138.0, -41.4, 104.5, w=12.0, seed=1)
    wr_planter(rig, "body", -110.0, -41.4, 104.5, w=12.0, seed=2)
    # two team banners on the redoubt's face
    for x in (-128.0, -92.0):
        g = Geo().slab([(x - 6.5, 98.0), (x + 6.5, 98.0), (x + 6.5, 70.0), (x, 64.0), (x - 6.5, 70.0)], -37.8, 1.3)
        rig.part("body", g, team=True, outline=0.5)
        g = Geo().capsule((x - 8.0, -38.6, 98.6), (x + 8.0, -38.6, 98.6), 1.0)
        rig.part("body", g, WR_WOOD_DK, outline=0.4)
        g = Geo()
        for k in range(5):
            a = math.radians(90 + k * 72)
            g.sphere((x + math.cos(a) * 2.6, -38.9, 84.0 + math.sin(a) * 2.6), 1.4, cuts=2)
        g.sphere((x, -39.0, 84.0), 1.0, cuts=2)
        rig.part("body", g, WR_CREAM, outline=0.3)
    # embrasure guns and a lit window in the wall
    g = Geo()
    for x in (-142.0, -102.0):
        g.capsule((x + 16.0, -38.0, 108.0), (x + 16.0, -46.0, 108.6), 1.6, 1.3, segs=8, rings=1)
    rig.part("body", g, WR_IRON, finish="metal", outline=0.4)
    wr_window(rig, "body", -66.0, -37.6, 62.0, w=8.0, h=11.0, shutters=True, box_flowers=True, seed=4)

    # -- the canal at the foot with a little lock: two mitre gates and their balance beams -------------------
    g = Geo()
    box(g, (-94.0, -45.0, 1.0), (54.0, 7.0, 1.2), p=6)
    rig.part("body", g, WR_WATER, finish="gloss")
    g = Geo()
    for x0, x1 in ((-144.0, -128.0), (-124.0, -112.0), (-90.0, -70.0), (-60.0, -46.0)):
        g.capsule((x0, -48.5, 2.4), (x1, -48.5, 2.4), 0.5, segs=6, rings=1)
    rig.part("body", g, WR_WATER_LT, outline=0, highlight=False)
    g = Geo()
    box(g, (-94.0, -52.6, 2.4), (56.0, 1.6, 2.4), p=6, cuts=2)
    rig.part("body", g, WR_CREAM_SH, outline=0.45)
    g = Geo()
    for x in (-114.0, -86.0):
        box(g, (x, -46.0, 8.0), (3.6, 9.0, 8.0), p=7)
    rig.part("body", g, WR_BRICK_LT)
    g = Geo()
    for x in (-114.0, -86.0):
        box(g, (x, -46.4, 16.8), (4.4, 9.6, 1.2), p=6, cuts=2)
    rig.part("body", g, WR_CREAM, outline=0.4)
    g = Geo()
    for sgn in (-1, 1):
        box(g, (-100.0 + sgn * 5.4, -47.0, 8.0), (5.6, 1.2, 7.2), p=5, rot=(0, 0, sgn * 16.0))
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    for sgn in (-1, 1):
        for z in (3.6, 8.0, 12.4):
            box(g, (-100.0 + sgn * 5.4, -48.4, z), (5.2, 0.5, 0.6), p=4, cuts=1, rot=(0, 0, sgn * 16.0))
    rig.part("body", g, WR_WOOD_DK, outline=0.3)
    g = Geo()
    for sgn in (-1, 1):
        g.capsule((-100.0 + sgn * 1.0, -48.0, 17.0), (-100.0 + sgn * 32.0, -54.0, 19.0), 2.2, 1.8, segs=8, rings=1)
    rig.part("body", g, WR_WOOD, outline=0.5)
    g = Geo()
    for sgn in (-1, 1):
        g.sphere((-100.0 + sgn * 32.6, -54.2, 19.0), 1.9, cuts=2)
    rig.part("body", g, WR_CREAM, outline=0.3)

    # -- the tower mill on the terrace: tapering brick, cream bands, windows with team shutters --------------
    mx, my = WR_MILL
    prof = [(0.0, 0.0)]
    for i in range(9):
        z = WR_TERRACE + (WR_MILL_TOP - WR_TERRACE) * i / 8
        prof.append((wr_mill_r(z), z - WR_TERRACE))
    prof.append((0.0, WR_MILL_TOP - WR_TERRACE))
    g = Geo().lathe(prof, (mx, my, WR_TERRACE), (mx, my, WR_MILL_TOP), segs=36)
    rig.part("body", g, WR_BRICK)
    g = Geo()
    for z in (160.0, 214.0):
        r = wr_mill_r(z) + 0.6
        g.lathe([(r - 0.6, -2.0), (r + 0.9, -1.4), (r + 0.9, 1.4), (r - 0.6, 2.0)], (mx, my, z), (mx, my, z + 1.0), segs=36)
    rig.part("body", g, WR_CREAM, outline=0.45)
    g = Geo()
    for z in range(int(WR_TERRACE) + 8, int(WR_MILL_TOP) - 4, 8):
        if abs(z - 160) < 4 or abs(z - 214) < 4:
            continue
        r = wr_mill_r(z) + 0.15
        g.lathe([(r - 0.3, -0.35), (r + 0.1, 0.0), (r - 0.3, 0.35)], (mx, my, float(z)), (mx, my, z + 1.0), segs=36)
    rig.part("body", g, WR_BRICK_DKR, outline=0, highlight=False)
    for z, w, h, fl in ((138.0, 8.0, 12.0, True), (186.0, 7.0, 11.0, False), (236.0, 6.0, 9.0, False)):
        wr_window(rig, "body", mx + 2.0, my - wr_mill_r(z) - 0.6, z, w=w, h=h, shutters=True, box_flowers=fl, seed=int(z))
    # the mill's door at the terrace with a flour-dusted step
    g = Geo().slab([(mx - 8.0, WR_TERRACE), (mx + 8.0, WR_TERRACE), (mx + 7.0, WR_TERRACE + 16.0), (mx, WR_TERRACE + 20.0),
                    (mx - 7.0, WR_TERRACE + 16.0)], my - wr_mill_r(WR_TERRACE + 6.0) - 0.4, 1.0)
    rig.part("body", g, WR_WOOD_DK, outline=0.4)
    # the reefing gallery round the tower's top (it carries the top mount on its lane side)
    g = Geo()
    cyl(g, (mx, my, WR_MILL_TOP - 3.6), (mx, my, WR_MILL_TOP - 0.8), wr_mill_r(WR_MILL_TOP) + 9.0, bevel=0.6, segs=36)
    rig.part("body", g, WR_WOOD_LT)
    rail = Geo()
    for i in range(22):
        a = math.radians(180 + i * (180.0 / 21))
        rr = wr_mill_r(WR_MILL_TOP) + 8.2
        rail.capsule((mx + math.cos(a) * rr, my + math.sin(a) * rr, WR_MILL_TOP - 1.0), (mx + math.cos(a) * rr, my + math.sin(a) * rr, WR_MILL_TOP + 5.0),
                     0.45, segs=4, rings=1)
    pts = [(mx + math.cos(math.radians(180 + i * 9)) * (wr_mill_r(WR_MILL_TOP) + 8.2), my + math.sin(math.radians(180 + i * 9)) * (wr_mill_r(WR_MILL_TOP) + 8.2),
            WR_MILL_TOP + 5.0) for i in range(21)]
    for a_, b_ in zip(pts, pts[1:]):
        rail.capsule(a_, b_, 0.6, segs=4, rings=1)
    rig.part("body", rail, WR_WOOD_DK, outline=0.3)
    g = Geo()
    for i in range(7):
        a = math.radians(200 + i * 22)
        rr0, rr1 = wr_mill_r(WR_MILL_TOP - 16.0), wr_mill_r(WR_MILL_TOP) + 8.0
        g.capsule((mx + math.cos(a) * rr0, my + math.sin(a) * rr0, WR_MILL_TOP - 16.0), (mx + math.cos(a) * rr1, my + math.sin(a) * rr1, WR_MILL_TOP - 3.0),
                  0.8, segs=6, rings=1)
    rig.part("body", g, WR_WOOD_DK, outline=0.3)
    # the cap: a boat-shaped shingled hood with a finial, the windshaft boss at its front (knocked askew at 25%)
    g = Geo()
    g.blob((mx, my - 2.0, WR_MILL_TOP + 10.0), (wr_mill_r(WR_MILL_TOP) + 3.0, wr_mill_r(WR_MILL_TOP) + 7.0, 14.0), p=2.3, cuts=4,
           taper=(1.0, 0.5))
    g.clip((0, 0, WR_MILL_TOP), (0, 0, -1))
    rig.part("cap", g, WR_SHINGLE)
    g = Geo()
    for k in range(3):
        z = WR_MILL_TOP + 3.0 + k * 5.5
        r = (wr_mill_r(WR_MILL_TOP) + 3.0) * math.sqrt(max(0.05, 1 - ((z - WR_MILL_TOP - 10.0) / 14.0) ** 2)) * (1.0 - 0.5 * (z - WR_MILL_TOP + 4.0) / 28.0) + 0.4
        g.lathe([(r - 0.4, -0.4), (r + 0.2, 0.0), (r - 0.4, 0.4)], (mx, my - 2.0, z), (mx, my - 2.0, z + 1.0), segs=32, squash=(1.0, 1.4))
    rig.part("cap", g, WR_SHINGLE_DK, outline=0, highlight=False)
    g = Geo()
    cyl(g, (mx, my - 2.0, WR_MILL_TOP + 22.0), (mx, my - 2.0, WR_MILL_TOP + 27.0), 1.4, 1.0, bevel=0.3)
    g.sphere((mx, my - 2.0, WR_MILL_TOP + 29.0), 2.6, cuts=3)
    rig.part("cap", g, WR_CREAM, outline=0.4)
    g = Geo()
    box(g, (mx, my - wr_mill_r(WR_MILL_TOP) - 7.6, WR_MILL_TOP + 6.0), (8.0, 1.2, 4.0), p=6, cuts=2)
    rig.part("cap", g, team=True, outline=0.4)
    hx, hy, hz = WR_HUB
    g = Geo()
    g.lathe([(0.0, 0.0), (4.6, 0.0), (5.2, 2.4), (3.6, 5.6), (0.0, 6.4)], (hx, hy + 6.4, hz), (hx, hy, hz), segs=20)
    rig.part("cap", g, WR_WOOD_DK, finish="metal")
    g = Geo().sphere((hx, hy - 0.4, hz), 2.0, cuts=3)
    rig.part("cap", g, WR_CREAM, outline=0.4)
    # the turning sails (the `sails` prop: a joint under root at the boss)
    rig.joint("sails", "root", WR_HUB)
    for k in range(4):
        wood, frame, canvas = wr_sail_geo(45.0 + 90.0 * k)
        rig.part("sails", wood, WR_WOOD_DK, outline=0.4)
        rig.part("sails", frame, WR_WOOD_LT, outline=0.3)
        rig.part("sails", canvas, team=True, outline=0.3)
    # the snapped sails hanging still once the cap is knocked askew (25%)
    for k, (ang, R) in enumerate(((112.0, 30.0), (228.0, 44.0))):
        wood, frame, canvas = wr_sail_geo(ang, R=R)
        rig.part("brokenSails", wood, WR_WOOD_DK, outline=0.4)
        rig.part("brokenSails", frame, WR_WOOD_LT, outline=0.3)
        if k == 1:
            rig.part("brokenSails", canvas, team=True, outline=0.3)

    # -- the round bastion at the lane edge: a wide drum at the gate, the tall tower over it ----------------
    g = Geo()
    cyl(g, (bx, by, 0.0), (bx, by, 55.0), 23.0, 21.6, bevel=1.0, segs=36)
    rig.part("body", g, WR_BRICK)
    g = Geo()
    cyl(g, (bx, by, 55.0), (bx, by, 192.6), 17.4, 16.2, bevel=0.8, segs=32)
    rig.part("body", g, WR_BRICK_LT)
    g = Geo()
    for z, r in ((52.0, 22.6), (118.0, 17.6), (186.0, 17.0)):
        g.lathe([(r - 1.0, -2.0), (r + 1.0, -1.2), (r + 1.0, 1.2), (r - 1.0, 2.0)], (bx, by, z), (bx, by, z + 1.0), segs=36)
    rig.part("body", g, WR_CREAM, outline=0.45)
    g = Geo()
    for z0 in range(62, 184, 7):
        if abs(z0 - 118) < 4:
            continue
        r = 17.4 - 1.2 * (z0 - 55) / 137.6 + 0.1
        g.lathe([(r - 0.3, -0.35), (r + 0.1, 0.0), (r - 0.3, 0.35)], (bx, by, float(z0)), (bx, by, z0 + 1.0), segs=32)
    for z0 in range(7, 50, 7):
        r = 23.0 - 1.4 * z0 / 55.0 + 0.1
        g.lathe([(r - 0.3, -0.35), (r + 0.1, 0.0), (r - 0.3, 0.35)], (bx, by, float(z0)), (bx, by, z0 + 1.0), segs=36)
    rig.part("body", g, WR_BRICK_DKR, outline=0, highlight=False)
    # arrow slits and a lit window, the long team banner (torn at 50%)
    g = Geo()
    for z in (90.0, 150.0):
        box(g, (bx - 6.0, by - 17.0, z), (1.3, 1.0, 5.0), p=5, cuts=2)
    rig.part("body", g, "#2E2622", outline=0)
    g = Geo().slab([(bx - 7.0, 182.0), (bx + 7.0, 182.0), (bx + 7.0, 150.0), (bx, 144.0), (bx - 7.0, 150.0)], by - 18.4, 1.3)
    rig.part("bannerB", g, team=True, outline=0.5)
    g = Geo().capsule((bx - 9.0, by - 19.2, 182.6), (bx + 9.0, by - 19.2, 182.6), 1.0)
    rig.part("bannerB", g, WR_WOOD_DK, outline=0.4)
    g = Geo()
    for i in range(4):
        a = math.radians(45 + i * 90)
        g.capsule((bx, by - 19.5, 166.0), (bx + math.cos(a) * 4.4, by - 19.5, 166.0 + math.sin(a) * 4.4), 0.7, segs=6, rings=1)
    g.sphere((bx, by - 19.6, 166.0), 1.3, cuts=2)
    rig.part("bannerB", g, WR_CREAM, outline=0.3)
    # the gate: an arch in the wall between the redoubt and the bastion, a team door, lanterns
    g = Geo()
    box(g, (-30.0, -32.0, 24.0), (12.0, 8.0, 24.0), p=8)
    rig.part("body", g, WR_BRICK_DK)
    gx = -30.0
    pts = [(gx - 8.0, 0.0), (gx + 8.0, 0.0), (gx + 8.0, 22.0)]
    for i in range(1, 6):
        a = math.pi * i / 6
        pts.append((gx + 8.0 * math.cos(a), 22.0 + 8.0 * math.sin(a)))
    pts.append((gx - 8.0, 22.0))
    g = Geo().slab([(x + (1.6 if x > gx else -1.6), z + (1.6 if z > 10 else 0.0)) for x, z in pts], -40.2, 1.2)
    rig.part("body", g, WR_CREAM, outline=0.4)
    g = Geo().slab(pts, -40.8, 1.0)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    box(g, (gx, -41.4, 14.0), (0.5, 0.4, 13.0), p=4, cuts=1)
    for z in (6.0, 20.0):
        box(g, (gx, -41.4, z), (7.6, 0.4, 0.6), p=4, cuts=1)
    rig.part("body", g, WR_IRON, finish="metal", outline=0)
    lantern(rig, "lantern", gx + 12.0, -42.0, 34.0)
    lantern(rig, "body", gx - 12.0, -42.0, 34.0)

    # -- the turret platforms -------------------------------------------------------------------------
    platform(rig, "body", M[0], WR_CREAM, WR_BRICK_DK, style="stone", r=(25.0, 19.0))
    platform(rig, "body", M[1], WR_CREAM, WR_BRICK_DK, style="stone", r=(25.0, 19.0))
    platform(rig, "body", M[2], WR_CREAM, WR_BRICK_DK, style="stone", r=(23.0, 19.0))
    x, y, z = M[3]
    g = Geo()
    box(g, (x - 2.0, y + 5.0, z - 1.6), (25.0, 19.0, 1.6), p=6)
    rig.part("body", g, WR_WOOD_LT)
    g = Geo()
    for k in range(5):
        box(g, (x - 24.0 + k * 11.0, y + 5.0, z - 0.2), (0.4, 18.4, 0.4), p=4, cuts=1)
    for dx in (-18.0, 2.0, 18.0):
        g.capsule((x + dx, y - 10.0, z - 3.0), (x + dx - 4.0, y + 4.0, z - 26.0), 1.4, segs=6, rings=1)
    rig.part("body", g, WR_WOOD_DK, outline=0.4)
    g = Geo()
    for k in range(9):
        xx = x - 24.0 + k * 6.0
        g.capsule((xx, y - 13.0, z), (xx, y - 13.0, z + 6.0), 0.5, segs=4, rings=1)
    g.capsule((x - 25.0, y - 13.0, z + 6.0), (x + 23.0, y - 13.0, z + 6.0), 0.7, segs=4, rings=1)
    rig.part("body", g, WR_WOOD_DK, outline=0.3)

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-140.0, -37.4, 60.0), (-134.0, -37.4, 48.0), (-140.0, -37.4, 36.0)],
                                   [(bx - 10.0, by - 19.6, 136.0), (bx - 6.0, by - 19.6, 126.0)]], WR_CRACK, WR_BRICK_LT)
    chipped_cracks(rig, "crack2", [[(-74.0, -37.4, 92.0), (-70.0, -37.4, 80.0)], [(mx - 10.0, my - 24.6, 200.0), (mx - 6.0, my - 24.0, 190.0)]],
                   WR_CRACK, WR_BRICK_LT)
    chipped_cracks(rig, "crack3", [[(bx + 8.0, by - 19.4, 100.0), (bx + 4.0, by - 19.4, 90.0)], [(mx + 8.0, my - 21.6, 244.0), (mx + 4.0, my - 21.0, 234.0)]],
                   WR_CRACK, WR_BRICK_LT)
    wr_breach(rig, "breachR", -116.0, -37.0, 42.0, 22.0, 20.0, seed=21)
    flames(rig, "breachR", [(-116.0, -43.0, 33.0, 0.9)])
    wr_breach(rig, "breachB", bx - 4.0, by - 19.0, 76.0, 18.0, 18.0, seed=23)
    flames(rig, "breachB", [(bx - 4.0, by - 25.0, 68.0, 0.8)])
    flames(rig, "millFire", [(mx - 6.0, my - 24.0, 186.0, 0.8)])
    g = Geo()
    for sx_, sy_, sz_, rr in ((-116.0, -37.8, 58.0, 8.0), (bx - 4.0, by - 19.8, 92.0, 7.0)):
        g.slab([(sx_ + rr * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), sz_ + rr * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)], sy_, 0.6)
    rig.part("soot", g, "#3E3530", outline=0, highlight=False)
    rubble(rig, "rubble1", [(-140.0, -58.0), (-120.0, -62.0)], WR_BRICK, seed=61)
    rubble(rig, "rubble2", [(-80.0, -60.0), (-40.0, -62.0)], WR_BRICK_DK, seed=71)
    rubble(rig, "rubble3", [(-146.0, -64.0), (-104.0, -66.0), (-20.0, -62.0)], WR_BRICK, seed=81, size=1.1)
    wr_planter(rig, "rubble1", -130.0, -60.0, 0.0, w=10.0, seed=5)

    flag(rig, "root", "flagA", (mx + 18.0, my + 10.0, 330.0), length=30, height=17, pole=WR_MILL_TOP + 14.0, pole_color=WR_WOOD_DK)
    flag(rig, "root", "flagB", (-140.0, 30.0, 190.0), length=24, height=14, pole=WR_TERRACE, pole_color=WR_WOOD_DK)

    # -- Treasury: flour sacks and a wheelbarrow (1), cheese wheels and barrels (2), gold and tulip crates (3)
    g = Geo()
    for x, y in ((-150.0, -62.0), (-141.0, -66.0), (-145.0, -58.0)):
        g.blob((x, y, 7.0), (6.0, 5.0, 7.6), p=2.4, taper=(1.0, 0.7))
        g.blob((x, y, 15.0), (2.4, 2.2, 1.4), p=2.0)
    rig.part("treasury1", g, WR_SACK)
    g = Geo()
    box(g, (-138.0, -64.0, 7.0), (7.0, 5.0, 2.6), p=5, taper=(0.8, 1.0))
    g.capsule((-131.0, -64.0, 7.0), (-124.0, -64.0, 3.0), 0.8)
    g.capsule((-145.0, -62.0, 8.0), (-150.0, -60.0, 10.0), 0.7)
    rig.part("treasury1", g, WR_WOOD, outline=0.5)
    g = Geo()
    cyl(g, (-143.0, -68.0, 3.4), (-143.0, -66.0, 3.4), 3.4, bevel=0.4)
    rig.part("treasury1", g, WR_WOOD_DK, outline=0.4)
    g = Geo()
    for i, (x, y, z) in enumerate(((-118.0, -64.0, 0.0), (-118.0, -64.0, 5.2), (-110.0, -66.0, 0.0), (-114.0, -65.0, 10.4))):
        cyl(g, (x, y, z), (x, y, z + 5.0), 7.0, bevel=1.4, segs=24)
    rig.part("treasury2", g, WR_CHEESE)
    g = Geo()
    for x in (-100.0, -92.0):
        cyl(g, (x, -64.0, 0.0), (x, -64.0, 13.0), 5.0, 5.6, bevel=0.8, segs=20)
    rig.part("treasury2", g, WR_WOOD, outline=0.5)
    g = Geo()
    box(g, (-74.0, -66.0, 6.0), (8.0, 5.6, 6.0), p=6)
    rig.part("treasury3", g, WR_WOOD_DK)
    g = Geo()
    for i in range(7):
        g.sphere((-79.0 + (i % 4) * 3.2, -66.0 + (i // 4) * 2.0, 13.0 + (i % 2)), 1.8, cuts=2)
    rig.part("treasury3", g, "#E3B84E", finish="bronze_rich", outline=0.3)
    g = Geo()
    box(g, (-58.0, -66.0, 4.0), (6.0, 5.0, 4.0), p=6)
    rig.part("treasury3", g, WR_WOOD_LT, outline=0.5)
    g = Geo()
    for i in range(5):
        g.blob((-61.0 + i * 1.6, -67.0, 9.0 + (i % 2)), (1.2, 1.0, 1.8), p=2.0, cuts=2)
    rig.part("treasury3", g, WR_PINK, outline=0.3)


def wr_breach(rig, joint, x, y, z, w, h, seed=0):
    """A blown-out hole in a brick wall: a dark jagged opening, a lighter inner face, broken brick ends."""
    rnd = random.Random(seed)
    n = 14
    pts, inner = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.72 + 0.28 * rnd.random()
        pts.append((x + math.cos(a) * w / 2 * k, z + math.sin(a) * h / 2 * k))
        inner.append((x + math.cos(a) * w / 2 * k * 0.72, z + math.sin(a) * h / 2 * k * 0.66 - h * 0.08))
    rig.part(joint, Geo().slab(pts, y - 2.4, 1.6), "#5A4036", outline=0.6, outline_hex="#2E2420")
    rig.part(joint, Geo().slab(inner, y - 3.4, 1.0), "#2E2420", outline=0)
    g = Geo()
    for i in range(0, n, 2):
        px_, pz_ = pts[i]
        box(g, (px_, y - 3.0, pz_), (3.0 + 1.4 * rnd.random(), 1.6, 1.4 + 0.6 * rnd.random()), p=5, cuts=2)
    rig.part(joint, g, WR_BRICK_LT, outline=0.5)


def crumble_windmill(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "planterL": {"hide": True}, "lantern": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachR": {"show": True}, "soot": {"show": True},
                     "bannerB": {"r": -12.0, "sz": 0.55, "x": -1.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breachB": {"show": True}, "millFire": {"show": True},
                     "brokenSails": {"show": True}, "cap": {"r": 9.0, "x": -3.0, "z": -3.0}, "bannerB": {"hide": True}})
    return pose


WINDMILL_REDOUBT = base_module(
    "gunpowder", "Windmill Redoubt", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build_windmill, crumble=crumble_windmill, mount_depth=WR_DEPTHS, skin="windmill_redoubt",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-18.0, -46.0, 38.0), 0, 14), ((-42.0, -46.0, 38.0), 3, 14), ((WR_MILL[0] + 2.0, -26.0, 138.0), 2, 12)],
    smoke=[((-116.0, -40.0, 60.0), 2), ((WR_MILL[0], WR_MILL[1], 200.0), 3), ((WR_BASTION[0], -30.0, 90.0), 3)],
    horn=(-100, 330), yaw=BASE_YAW,
    props=[prop_loop("sails", ["sails"], WR_SAIL_FRAMES, wr_sails_pose, ms=WR_SAIL_MS, crumble=(0, 2), z="front", hold=0,
                     anchor=WR_HUB, occlude=["body"], outline=(1.6, 0.55, 0.5))],
    extra_meta={
        "collapseMaterial": "stone",
        # the mill falls toward the lane first, the bastion tower a beat later
        "topple": [topple_lu(-140, -66, 140, delay_ms=0, push=1.0, sink_lu=30),
                   topple_lu(-26, 26, 120, delay_ms=160, push=0.8, sink_lu=26)],
        "rubbleColors": [WR_BRICK, WR_BRICK_DK, WR_CREAM, WR_WOOD],
        "dustColor": "#D7C8B8",
        "ambientLu": [ambient_lu("petals", (-138.0, -42.0, 112.0), 10, 0.5, color="#D8B4BC"),
                      ambient_lu("petals", (-110.0, -42.0, 112.0), 10, 0.5, color="#C4B6D8"),
                      ambient_lu("petals", (WR_MILL[0] + 2.0, -28.0, 128.0), 8, 0.4, color="#EFE6CF"),
                      ambient_lu("dust", (WR_MILL[0], -24.0, WR_TERRACE + 4.0), 12, 0.5)],
    },
)



# ---------------------------------------------------------------------------------------------------
# Galleon Bastion (round 3; Epic, Trophy Road 2,600): a beached galleon as the wall. The hull lies in the sand, bow to
# the lane: dark planking with two wales and a gold sheer rail, a row of open gunports with their guns run out, the
# tall stern-castle at the back with lit windows and a quarter gallery, a gilded lion figurehead under the beakhead.
# Three masts carry furled team sails on their yards; the fore course is set and flutters, and the big stern lantern
# swings (the `flutter` prop loop, four steps there and back). The mounts are the beakhead deck, the main top, the
# fore top and the main crow's nest. Team colour: the sails, the hull door, the pennant and the flags. Code ambient:
# gulls over the masts, sea-spray glints.
#
# Crumble: 75% cracks in the planking, the figurehead's crown and a gunport lid knocked off, planks and sand rubble;
# 50% a burning breach in the hull, a furled sail torn loose, soot; 25% a ragged breach at the waterline, the mizzen
# snapped, the main topmast tilted, fire on deck.

GB_WOOD = "#4A3B2E"
GB_WOOD_LT = "#5E4C3C"
GB_WOOD_DK = "#3A2E24"
GB_WALE = "#2E241C"
GB_DECK = "#7A6652"
GB_BRASS = "#C9A227"
GB_GOLD = "#D6B04A"
GB_CANVAS = "#E6DCC4"
GB_ROPE = "#8A7A5E"
GB_IRON = "#3C3F45"
GB_SAND = "#CDB98E"
GB_SAND_DK = "#B4A07A"
GB_WINDOW = "#FFD89A"
GB_SEAWEED = "#5F7A45"
GB_CRACK = "#22190F"
GB_DEPTHS = [-40, -24, -40, -24]
GB_CL = -4.0                       # the hull's centreline (y)
GB_X0, GB_X1 = -158.0, 20.0        # stern, bow tip
GB_DECK_Z = 62.0
GB_FORE = (-7.0, -16.0)            # masts (x, y)
GB_MAIN = (-47.0, -16.0)
GB_MIZ = (-136.0, -8.0)
GB_SAIL_FRAMES, GB_SAIL_MS = 4, 150


def gb_half_beam(x):
    """The hull's half beam at x: full amidships, easing to the transom aft, a fine entry to the stem forward."""
    xm = -60.0
    if x >= xm:
        t = (x - xm) / (GB_X1 - xm)
        return 33.0 * math.sqrt(max(0.0, 1.0 - t ** 2.2))
    t = (xm - x) / (xm - GB_X0)
    return 33.0 - 6.0 * t * t


def gb_bottom(x):
    """The keel line: the forefoot sweeps up to the stem, the run lifts a little aft."""
    if x > -10.0:
        return 2.0 + 44.0 * ((x + 10.0) / (GB_X1 + 10.0)) ** 2.2
    if x < -130.0:
        return 2.0 + 10.0 * ((-130.0 - x) / (-130.0 - GB_X0)) ** 2
    return 2.0


def gb_sheer(x):
    """The sheer (deck edge): low in the waist, rising toward the bow and the stern."""
    return GB_DECK_Z + 8.0 * ((x + 60.0) / 80.0) ** 2 if x > -60.0 else GB_DECK_Z + 6.0 * ((-60.0 - x) / 98.0) ** 2


def gb_side_y(x, z):
    """The starboard side's y at (x, z): the section swells from the keel to the turn of the bilge and tucks in a
    little toward the rail (tumblehome)."""
    zb, zt = gb_bottom(x), gb_sheer(x)
    t = max(0.0, min(1.0, (z - zb) / max(1.0, zt - zb)))
    f = math.sin(min(1.0, t / 0.5) * math.pi / 2) ** 0.55 * (1.0 - 0.1 * max(0.0, t - 0.5) / 0.5)
    return GB_CL - gb_half_beam(x) * f


def gb_hull(rig, joint):
    """The hull as a closed surface: the starboard side swept over stations, its mirror to port, the deck on top."""
    nx, nz = 44, 12
    verts, faces = [], []
    xs = [GB_X0 + (GB_X1 - GB_X0) * (i / nx) ** 1.0 for i in range(nx + 1)]
    for side in (1, -1):
        base = len(verts)
        for x in xs:
            zb, zt = gb_bottom(x), gb_sheer(x)
            for k in range(nz + 1):
                z = zb + (zt - zb) * k / nz
                y = gb_side_y(x, z)
                verts.append((x, GB_CL + (y - GB_CL) * side, z))
        for i in range(nx):
            for k in range(nz):
                a = base + i * (nz + 1) + k
                b = a + (nz + 1)
                faces.append([a, b, b + 1, a + 1] if side == 1 else [a, a + 1, b + 1, b])
    # the deck (top) and the bottom close the two sides
    for k, flip in ((nz, False), (0, True)):
        for i in range(nx):
            a0 = i * (nz + 1) + k
            a1 = (i + 1) * (nz + 1) + k
            b0 = (nx + 1) * (nz + 1) + i * (nz + 1) + k
            b1 = (nx + 1) * (nz + 1) + (i + 1) * (nz + 1) + k
            faces.append([a0, b0, b1, a1] if not flip else [a0, a1, b1, b0])
    # the transom (aft end)
    for k in range(nz):
        a, b = k, (nx + 1) * (nz + 1) + k
        faces.append([a, a + 1, b + 1, b])
    import bmesh
    from mathutils import Matrix
    g = Geo()._add(verts, faces, Matrix.Identity(4))
    bmesh.ops.remove_doubles(g.bm, verts=g.bm.verts[:], dist=0.05)
    bmesh.ops.recalc_face_normals(g.bm, faces=g.bm.faces[:])
    rig.part(joint, g, GB_WOOD)


def gb_strakes(rig, joint):
    """Plank seams and the two wales along the starboard side, the gold sheer rail on top."""
    seams, wales, gold = Geo(), Geo(), Geo()
    for frac, geo, r in ((0.18, seams, 0.35), (0.3, seams, 0.35), (0.42, wales, 1.8), (0.55, seams, 0.35), (0.66, wales, 1.6), (0.78, seams, 0.35),
                         (0.9, seams, 0.35)):
        pts = []
        for i in range(31):
            x = GB_X0 + 2.0 + (GB_X1 - GB_X0 - 6.0) * i / 30
            zb, zt = gb_bottom(x), gb_sheer(x)
            z = zb + (zt - zb) * frac
            pts.append((x, gb_side_y(x, z) - (0.6 if geo is wales else 0.2), z))
        for a, b in zip(pts, pts[1:]):
            geo.capsule(a, b, r, segs=6 if geo is wales else 4, rings=1)
    pts = [(x, gb_side_y(x, gb_sheer(x)) - 0.6, gb_sheer(x) + 0.4) for x in (GB_X0 + 3.0 + (GB_X1 - GB_X0 - 8.0) * i / 30 for i in range(31))]
    for a, b in zip(pts, pts[1:]):
        gold.capsule(a, b, 1.1, segs=6, rings=1)
    rig.part(joint, seams, GB_WOOD_DK, outline=0, highlight=False)
    rig.part(joint, wales, GB_WALE, outline=0.4)
    rig.part(joint, gold, GB_GOLD, finish="bronze_rich", outline=0.3)


def gb_gunports(rig, joint, lid_joint):
    """A row of gunports on the gun deck: dark openings, lids raised (one knocked off at 75%), guns run out."""
    holes, lids, guns = Geo(), Geo(), Geo()
    lid2 = Geo()
    for i, x in enumerate((-118.0, -96.0, -74.0, -52.0, -30.0)):
        z = 40.0
        y = gb_side_y(x, z) - 0.4
        box(holes, (x, y, z), (4.0, 0.8, 3.6), p=5, cuts=2)
        box(lid2 if i == 2 else lids, (x, y - 2.6, z + 6.4), (4.4, 0.7, 3.0), p=5, cuts=2, rot=(-55, 0, 0))
        guns.capsule((x, y + 2.0, z - 0.4), (x, y - 6.0, z - 0.2), 1.6, 1.3, segs=8, rings=1)
        guns.sphere((x, y - 6.4, z - 0.2), 1.9, cuts=2)
    rig.part(joint, holes, "#1E1712", outline=0)
    rig.part(joint, lids, GB_WOOD_LT, outline=0.4)
    rig.part(lid_joint, lid2, GB_WOOD_LT, outline=0.4)
    rig.part(joint, guns, GB_IRON, finish="metal", outline=0.4)


def gb_furled(rig, joint, a, b, r=3.0):
    """A furled team sail lashed along a yard from a to b, with gaskets round it."""
    g = Geo().capsule(a, b, r, r * 0.8, segs=10, rings=2)
    rig.part(joint, g, team=True, outline=0.4)
    t = Geo()
    n = 5
    for i in range(1, n):
        c = tuple(u + (v - u) * i / n for u, v in zip(a, b))
        t.lathe([(r * 0.95, -0.5), (r * 1.12, 0.0), (r * 0.95, 0.5)], c, (c[0] + 0.01, c[1], c[2]), segs=10)
    rig.part(joint, t, GB_ROPE, outline=0)


def gb_sail_pt(f, x0, x1, y, z0, z1, u, t, lift=0.0):
    """A point on the set fore course at flutter step f: u across (0 left, 1 right), t down from the yard (0) to the
    foot (1); its belly fills toward the camera, the leeches draw in a little and the foot ripples; `lift` lu toward
    the camera off the canvas."""
    belly = (5.0, 7.0, 8.6, 7.2)[f]
    x = x0 + (x1 - x0) * u + (0.5 - u) * 3.0 * t * t
    z = z1 - (z1 - z0) * t + math.sin(u * math.pi) * 3.0 * t ** 4
    ripple = math.sin(u * math.pi * 2.0 + f * math.pi / 2) * 1.6 * t * t
    yy = y - belly * math.sin(u * math.pi) * math.sin(t * math.pi * 0.9) - ripple - lift
    z += math.sin(u * math.pi * 3.0 + f * 1.4) * 1.2 * t ** 3
    return (x, yy, z)


def gb_sail_geo(f, x0, x1, y, z0, z1):
    """The set fore course at flutter step f: a canvas grid hanging from the yard, its belly filling and its foot
    rippling (a team sail)."""
    nx, nz = 10, 8
    verts, faces = [], []
    for k in range(nz + 1):
        for i in range(nx + 1):
            verts.append(gb_sail_pt(f, x0, x1, y, z0, z1, i / nx, k / nz))
    for k in range(nz):
        for i in range(nx):
            a = k * (nx + 1) + i
            faces.append([a, a + 1, a + nx + 2, a + nx + 1])
    from mathutils import Matrix
    g = Geo()._add(verts, faces, Matrix.Identity(4))
    # give the canvas a thickness: a copy pushed back
    verts2 = [(vx, vy + 0.8, vz) for vx, vy, vz in verts]
    g._add(verts2, [list(reversed(fc)) for fc in faces], Matrix.Identity(4))
    return g


def gb_sail_trim(rig, joint, f, box_):
    """The fore course's trim at flutter step f: the bolt rope round its edge, the cloth seams, a row of reef points,
    a cream compass star on the canvas and the sheets from its clews down to the rail."""
    from mathutils import Matrix
    P = lambda u, t, lift=0.0: gb_sail_pt(f, *box_, u, t, lift)   # noqa: E731
    rope, seam = Geo(), Geo()
    edge = [(u / 10, 0.0) for u in range(11)] + [(1.0, t / 8) for t in range(1, 9)] + [(1.0 - u / 10, 1.0) for u in range(1, 11)] + \
           [(0.0, 1.0 - t / 8) for t in range(1, 9)]
    for (ua, ta), (ub, tb) in zip(edge, edge[1:]):
        rope.capsule(P(ua, ta, 0.5), P(ub, tb, 0.5), 0.75, segs=6, rings=1)
    for u in (0.2, 0.4, 0.6, 0.8):
        pts = [P(u, t / 8, 0.25) for t in range(9)]
        for a_, b_ in zip(pts, pts[1:]):
            seam.capsule(a_, b_, 0.3, segs=4, rings=1)
    for k in range(1, 10):
        a_ = P(k / 10, 0.16, 0.6)
        rope.capsule(a_, (a_[0] + 0.3, a_[1] - 0.4, a_[2] - 3.0), 0.4, segs=4, rings=1)
    for u, rail_x in ((0.0, box_[0] + 6.0), (1.0, box_[1] - 2.0)):
        c = P(u, 1.0, 0.4)
        rope.capsule(c, (rail_x, gb_side_y(rail_x, gb_sheer(rail_x)) - 0.6, gb_sheer(rail_x) + 1.0), 0.45, segs=4, rings=1)
    rig.part(joint, rope, GB_ROPE, outline=0.3)
    rig.part(joint, seam, GB_WOOD_DK, outline=0, highlight=False)
    # the compass star: eight points (long and short) round a ring, mapped onto the billowing canvas
    cu, ct, R = 0.5, 0.52, 0.27
    asp = (box_[1] - box_[0]) / (box_[4] - box_[3])
    verts, faces = [], []
    ctr = P(cu, ct, 0.7)
    verts.append(ctr)
    n = 16
    for k in range(n):
        a = math.pi / 2 + 2 * math.pi * k / n
        rr = R if k % 4 == 0 else (R * 0.62 if k % 2 == 0 else R * 0.24)
        verts.append(P(cu + rr * math.cos(a) / asp * 0.95, ct - rr * math.sin(a), 0.7))
    for k in range(n):
        faces.append([0, 1 + k, 1 + (k + 1) % n])
    star = Geo()._add(verts, faces, Matrix.Identity(4))
    star._add([(vx, vy + 0.4, vz) for vx, vy, vz in verts], [list(reversed(fc)) for fc in faces], Matrix.Identity(4))
    rig.part(joint, star, GB_CANVAS, outline=0.35, outline_hex=GB_WOOD_DK)


def gb_lion(rig, joint, x, y, z, k=1.0):
    """The gilded lion figurehead under the beakhead: a maned head and paws on a scroll."""
    g = Geo()
    g.blob((x, y, z), (6.0 * k, 5.0 * k, 6.4 * k), p=2.2, cuts=3)
    g.blob((x + 4.6 * k, y, z - 1.0 * k), (3.0 * k, 3.0 * k, 2.6 * k), p=2.2, cuts=3)
    for i in range(8):
        a = math.radians(-120 + i * 34)
        g.blob((x - 1.6 * k + math.cos(a) * 6.4 * k, y, z + math.sin(a) * 6.4 * k), (2.6 * k, 3.4 * k, 2.2 * k), p=2.0, cuts=2, rot=(0, -math.degrees(a), 0))
    g.blob((x - 2.0 * k, y, z - 9.0 * k), (7.0 * k, 4.0 * k, 3.0 * k), p=2.2, cuts=3)
    rig.part(joint, g, GB_GOLD, finish="bronze_rich", outline=0.5)
    g = Geo()
    g.sphere((x + 6.4 * k, y - 2.2 * k, z + 1.6 * k), 0.8 * k, cuts=2)
    rig.part(joint, g, "#2A2016", outline=0)


def build_galleon(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachH", "breachW", "soot", "deckFire", "mizStump", "sailLoose"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("crown", "body", (GB_X1 - 2.0, GB_CL - 2.0, 56.0))
    rig.joint("lid", "body", (-74.0, -40.0, 46.0))
    rig.joint("mizzen", "body", (GB_MIZ[0], GB_MIZ[1], 134.0))
    rig.joint("topmast", "body", (GB_MAIN[0], GB_MAIN[1], 262.0))
    rig.joint("mainSail", "body", (GB_MAIN[0], GB_MAIN[1], 200.0))

    # -- the sand it lies in, rocks and seaweed ------------------------------------------------------------
    g = Geo()
    for c, r, seed in (((-134.0, -8.0, 4.0), (25.0, 34.0, 9.0), 701), ((-80.0, -8.0, 3.0), (60.0, 44.0, 8.0), 702), ((-10.0, -12.0, 3.0), (32.0, 36.0, 8.0), 703)):
        rock(g, c, r, seed=seed, jag=0.06, p=2.2, cuts=4)
    g.clip((0, 0, 0.0), (0, 0, -1))
    rig.part("body", g, GB_SAND)
    g = Geo()
    for i, (x, y, r) in enumerate(((-149.0, -42.0, 5.0), (-118.0, -44.0, 5.0), (-34.0, -44.0, 5.6), (12.0, -40.0, 4.6))):
        rock(g, (x, y, 3.0), (r, r * 0.8, r * 0.6), seed=710 + i, jag=0.2, cuts=3)
    rig.part("body", g, "#8E8A80")
    g = Geo()
    for x in (-150.0, -112.0, -66.0, -24.0):
        for k in range(3):
            g.blob((x + k * 3.0, gb_side_y(x, 8.0) - 1.0, 8.0 + k * 2.0), (1.6, 1.0, 4.4), p=2.0, cuts=2, rot=(0, 20 - k * 20, 0))
    rig.part("body", g, GB_SEAWEED, finish="hair")

    # -- the hull, planking, wales, gunports ----------------------------------------------------------------
    gb_hull(rig, "body")
    gb_strakes(rig, "body")
    gb_gunports(rig, "body", "lid")
    # the deck furniture: the waist's deck, the forecastle and the stern-castle
    g = Geo()
    box(g, (-60.0, GB_CL, GB_DECK_Z + 0.6), (70.0, 28.0, 0.8), p=6)
    rig.part("body", g, GB_DECK)
    g = Geo()
    box(g, (-24.0, GB_CL, 72.0), (12.0, 26.0, 10.0), p=6)
    rig.part("body", g, GB_WOOD_LT)
    g = Geo()
    box(g, (-24.0, GB_CL - 0.6, 82.6), (13.0, 26.6, 1.0), p=6)
    rig.part("body", g, GB_GOLD, finish="bronze_rich", outline=0.3)
    # the stern-castle: two stepped decks with lit windows, a quarter gallery, a taffrail with the lantern bracket
    for x0, x1, z0, z1 in ((-158.0, -104.0, GB_DECK_Z, 100.0), (-158.0, -126.0, 100.0, 134.0)):
        g = Geo()
        box(g, ((x0 + x1) / 2, GB_CL, (z0 + z1) / 2), ((x1 - x0) / 2, 27.0, (z1 - z0) / 2), p=7)
        rig.part("body", g, GB_WOOD_LT)
        g = Geo()
        box(g, ((x0 + x1) / 2, GB_CL - 0.4, z1 + 0.8), ((x1 - x0) / 2 + 0.8, 27.6, 1.2), p=6)
        rig.part("body", g, GB_GOLD, finish="bronze_rich", outline=0.3)
    win, frm = Geo(), Geo()
    for x, z in ((-146.0, 80.0), (-132.0, 80.0), (-118.0, 80.0), (-150.0, 116.0), (-138.0, 116.0)):
        box(win, (x, GB_CL - 27.4, z), (3.6, 0.6, 5.0), p=5, cuts=2)
        box(frm, (x, GB_CL - 27.0, z), (4.8, 0.6, 6.2), p=5, cuts=2)
    rig.part("body", frm, GB_GOLD, finish="bronze_rich", outline=0.3)
    rig.part("body", win, glow=GB_WINDOW, outline=0)
    g = Geo()
    box(g, (-112.0, GB_CL - 30.0, 84.0), (7.0, 4.0, 12.0), p=6)
    g.blob((-112.0, GB_CL - 30.0, 98.0), (8.0, 5.0, 4.0), p=2.2, cuts=3)
    rig.part("body", g, GB_WOOD_LT)
    g = Geo()
    box(g, (-112.0, GB_CL - 34.2, 84.0), (3.6, 0.6, 6.0), p=5, cuts=2)
    rig.part("body", g, glow=GB_WINDOW, outline=0)
    g = Geo()
    for k in range(9):
        x = -156.0 + k * 3.8
        g.capsule((x, GB_CL - 26.0, 134.6), (x, GB_CL - 26.0, 140.0), 0.6, segs=4, rings=1)
    g.capsule((-157.0, GB_CL - 26.0, 140.0), (-126.0, GB_CL - 26.0, 140.0), 0.9, segs=6, rings=1)
    g.capsule((-152.0, GB_CL - 26.0, 140.0), (-160.0, GB_CL - 32.0, 150.0), 1.0, segs=6, rings=1)
    rig.part("body", g, GB_WOOD_DK, outline=0.4)
    # the hull door at the gate (team) with a gangplank to the sand
    dx = -14.0
    g = Geo().slab([(dx - 8.0, 8.0), (dx + 8.0, 8.0), (dx + 8.0, 32.0), (dx, 36.0), (dx - 8.0, 32.0)], gb_side_y(dx, 20.0) - 0.8, 1.0)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    box(g, (dx, gb_side_y(dx, 6.0) - 10.0, 4.0), (7.0, 10.0, 0.8), p=5, rot=(-22, 0, 0))
    rig.part("body", g, GB_DECK, outline=0.4)

    # -- the beakhead deck (the gate-side mount), the figurehead, a steep bowsprit ------------------------------
    platform(rig, "body", M[0], GB_DECK, GB_WOOD, style="wood", r=(25.0, 19.0))
    gb_lion(rig, "body", GB_X1 - 6.0, GB_CL - 2.0, 44.0, k=1.0)
    g = Geo()
    for i in range(3):
        a = math.radians(70 + i * 20)
        g.blob((GB_X1 - 8.0 + math.cos(a) * 3.0, GB_CL - 2.0, 52.0 + math.sin(a) * 3.0), (1.4, 1.4, 2.4), p=2.0, cuts=2, rot=(0, 90 - math.degrees(a), 0))
    rig.part("crown", g, GB_GOLD, finish="bronze_rich", outline=0.4)
    g = Geo().capsule((10.0, GB_CL, 64.0), (22.0, GB_CL, 108.0), 2.2, 1.4, segs=8, rings=1)
    rig.part("body", g, GB_WOOD_LT, outline=0.5)

    # -- the masts, tops, yards with furled team sails, shrouds ----------------------------------------------
    for (mx, my), z0, z1, rr, r1 in ((GB_FORE, GB_DECK_Z, 214.0, 2.8, 1.7), (GB_MAIN, GB_DECK_Z, 264.0, 3.2, 2.3)):
        g = Geo().capsule((mx, my, z0), (mx, my, z1), rr, r1, segs=10, rings=1)
        rig.part("body", g, GB_WOOD_LT, outline=0.5)
    g = Geo().capsule((GB_MAIN[0], GB_MAIN[1], 262.0), (GB_MAIN[0], GB_MAIN[1], 300.0), 2.2, 1.4, segs=8, rings=1)
    rig.part("topmast", g, GB_WOOD_LT, outline=0.5)
    g = Geo().slab([(GB_MAIN[0], 300.0), (GB_MAIN[0] - 22.0, 296.0), (GB_MAIN[0], 292.0)], GB_MAIN[1], 1.0)
    rig.part("topmast", g, team=True, outline=0.4)
    g = Geo().capsule((GB_MIZ[0], GB_MIZ[1], 134.0), (GB_MIZ[0], GB_MIZ[1], 222.0), 2.4, 1.6, segs=8, rings=1)
    rig.part("mizzen", g, GB_WOOD_LT, outline=0.5)
    g = Geo().capsule((GB_MIZ[0] - 26.0, GB_MIZ[1] - 2.0, 160.0), (GB_MIZ[0] + 22.0, GB_MIZ[1] - 2.0, 214.0), 1.2, 0.9, segs=6, rings=1)
    rig.part("mizzen", g, GB_WOOD_DK, outline=0.4)
    gb_furled(rig, "mizzen", (GB_MIZ[0] - 22.0, GB_MIZ[1] - 4.0, 163.0), (GB_MIZ[0] + 18.0, GB_MIZ[1] - 4.0, 208.0), r=2.6)
    g = Geo().capsule((GB_MIZ[0], GB_MIZ[1], 134.0), (GB_MIZ[0] + 4.0, GB_MIZ[1], 160.0), 2.6, 2.0, segs=8, rings=1)
    rig.part("mizStump", g, GB_WOOD_LT, outline=0.5)
    g = Geo().slab([(GB_MIZ[0] - 2.0, 158.0), (GB_MIZ[0] + 2.0, 164.0), (GB_MIZ[0] + 6.0, 158.0)], GB_MIZ[1] - 2.6, 1.0)
    rig.part("mizStump", g, GB_DECK, outline=0.4)
    yards = [(GB_FORE, 150.0, 27.0, "body"), (GB_MAIN, 200.0, 36.0, "mainSail"), (GB_MAIN, 282.0, 22.0, "topmast")]
    for (mx, my), z, half, jn in yards:
        g = Geo().capsule((mx - half - 2.0, my - 3.0, z), (mx + half + 2.0, my - 3.0, z), 1.3, segs=8, rings=1)
        rig.part(jn, g, GB_WOOD_DK, outline=0.4)
        if z != 150.0:
            gb_furled(rig, jn, (mx - half, my - 5.4, z - 2.0), (mx + half, my - 5.4, z - 2.0), r=3.2 if z == 200.0 else 2.6)
    # the main sail torn loose at 50%: a hanging team sheet under the main yard
    g = Geo().slab([(GB_MAIN[0] - 30.0, 198.0), (GB_MAIN[0] + 32.0, 198.0), (GB_MAIN[0] + 28.0, 172.0), (GB_MAIN[0] + 6.0, 160.0),
                    (GB_MAIN[0] - 12.0, 168.0), (GB_MAIN[0] - 28.0, 176.0)], GB_MAIN[1] - 6.0, 1.0)
    rig.part("sailLoose", g, team=True, outline=0.45)
    # shrouds from the rails up to the tops
    g = Geo()
    for (mx, my), zt in ((GB_FORE, 186.0), (GB_MAIN, 116.0), (GB_MAIN, 254.0)):
        for k in range(4):
            x = mx - 14.0 + k * 9.0
            zb = gb_sheer(x) + 1.0
            g.capsule((x, gb_side_y(x, zb) - 0.6, zb), (mx - 6.0 + k * 4.0, my - 12.0, zt), 0.45, segs=4, rings=1)
    g.capsule((GB_FORE[0], GB_FORE[1], 210.0), (GB_MAIN[0], GB_MAIN[1], 296.0), 0.5, segs=4, rings=1)
    g.capsule((GB_FORE[0], GB_FORE[1], 212.0), (21.0, GB_CL, 106.0), 0.5, segs=4, rings=1)
    rig.part("body", g, GB_ROPE, outline=0)
    # the tops (the mounts) on the masts
    platform(rig, "body", M[1], GB_DECK, GB_WOOD, style="wood", r=(25.0, 19.0))
    platform(rig, "body", M[2], GB_DECK, GB_WOOD, style="wood", r=(23.0, 19.0))
    platform(rig, "body", M[3], GB_DECK, GB_WOOD, style="wood", r=(25.0, 19.0))
    g = Geo()
    for (x, y, z), w in ((M[1], 25.0), (M[2], 23.0), (M[3], 25.0)):
        for k in range(9):
            xx = x - 2.0 - w + 2.0 + k * (2.0 * w - 4.0) / 8
            g.capsule((xx, y + 5.0 - 18.0, z), (xx, y + 5.0 - 18.0, z + 5.0), 0.45, segs=4, rings=1)
        g.capsule((x - 2.0 - w + 1.0, y + 5.0 - 18.0, z + 5.0), (x - 2.0 + w - 1.0, y + 5.0 - 18.0, z + 5.0), 0.7, segs=4, rings=1)
    rig.part("body", g, GB_WOOD_DK, outline=0.3)

    # the swaying stern lantern and the set fore course (the `flutter` prop: one joint per step under root)
    rig.joint("flutter", "root", (GB_FORE[0], GB_FORE[1] - 4.0, 150.0))
    lx, ly, lz = -160.0, GB_CL - 32.0, 150.0
    for f in range(GB_SAIL_FRAMES):
        j = f"flutter{f}"
        rig.joint(j, "flutter", (GB_FORE[0], GB_FORE[1] - 4.0, 150.0), hidden=True)
        box_ = (GB_FORE[0] - 26.0, GB_FORE[0] + 26.0, GB_FORE[1] - 5.0, 104.0, 148.0)
        sail = gb_sail_geo(f, *box_)
        rig.part(j, sail, team=True, outline=0.4)
        gb_sail_trim(rig, j, f, box_)
        a = math.radians((-9.0, -3.0, 3.0, 9.0)[f])
        hx, hz = lx + math.sin(a) * 10.0, lz - math.cos(a) * 10.0
        g = Geo().capsule((lx, ly, lz), (hx, ly, hz), 0.5, segs=4, rings=1)
        rig.part(j, g, GB_IRON, finish="metal", outline=0.3)
        g = Geo()
        g.lathe([(0.0, 0.0), (3.4, 0.6), (4.0, 6.0), (3.0, 9.0), (0.0, 10.4)], (hx, ly, hz - 10.0), (hx + math.sin(a) * 0.01, ly, hz), segs=8)
        rig.part(j, g, GB_GOLD, finish="bronze_rich", outline=0.4)
        g = Geo().blob((hx, ly - 0.6, hz - 5.0), (2.4, 2.4, 3.4), p=2.0, cuts=2)
        rig.part(j, g, glow=GB_WINDOW, outline=0)

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-90.0, gb_side_y(-90.0, 24.0) - 0.8, 26.0), (-84.0, gb_side_y(-84.0, 18.0) - 0.8, 18.0)],
                                   [(-140.0, GB_CL - 27.6, 96.0), (-136.0, GB_CL - 27.6, 88.0)]], GB_CRACK, GB_WOOD_LT)
    chipped_cracks(rig, "crack2", [[(-40.0, gb_side_y(-40.0, 26.0) - 0.8, 28.0), (-34.0, gb_side_y(-34.0, 20.0) - 0.8, 20.0)]], GB_CRACK, GB_WOOD_LT)
    chipped_cracks(rig, "crack3", [[(-60.0, gb_side_y(-60.0, 50.0) - 0.8, 52.0), (-56.0, gb_side_y(-56.0, 44.0) - 0.8, 44.0)]], GB_CRACK, GB_WOOD_LT)
    gb_breach(rig, "breachH", -86.0, gb_side_y(-86.0, 30.0), 30.0, 22.0, 18.0, seed=81)
    flames(rig, "breachH", [(-86.0, gb_side_y(-86.0, 30.0) - 6.0, 22.0, 0.9)])
    gb_breach(rig, "breachW", -128.0, gb_side_y(-128.0, 18.0), 18.0, 26.0, 16.0, seed=83)
    flames(rig, "deckFire", [(-70.0, GB_CL - 20.0, GB_DECK_Z + 2.0, 0.9), (-130.0, GB_CL - 22.0, 101.0, 0.7)])
    g = Geo()
    g.slab([(-86.0 + 8.0 * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), 46.0 + 6.0 * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)],
           gb_side_y(-86.0, 46.0) - 1.0, 0.6)
    rig.part("soot", g, "#1E1812", outline=0, highlight=False)
    rubble(rig, "rubble1", [(-150.0, -54.0), (-124.0, -58.0)], GB_SAND_DK, seed=171)
    rubble(rig, "rubble2", [(-80.0, -56.0), (-40.0, -60.0)], GB_WOOD, seed=177)
    rubble(rig, "rubble3", [(-158.0, -60.0), (-104.0, -62.0), (-10.0, -60.0)], GB_WOOD_DK, seed=183, size=1.1)
    g = Geo()
    for k in range(4):
        x = -150.0 + k * 9.0
        g.capsule((x, -56.0, 2.0), (x + 12.0, -60.0 + k, 3.0), 1.4, 1.2, segs=6, rings=1)
    rig.part("rubble1", g, GB_WOOD_LT, outline=0.4)
    g = Geo()
    box(g, (-66.0, -60.0, 2.0), (4.4, 3.0, 0.7), p=5, rot=(10, 0, 20))
    rig.part("rubble1", g, GB_WOOD_LT, outline=0.4)

    flag(rig, "root", "flagA", (GB_MAIN[0] + 4.0, GB_MAIN[1] + 6.0, 330.0), length=30, height=17, pole=298.0, pole_color=GB_WOOD_DK)
    flag(rig, "root", "flagB", (-150.0, 20.0, 190.0), length=24, height=14, pole=134.0, pole_color=GB_WOOD_DK)

    # -- Treasury: barrels and rope (1), a chest of coins (2), an open treasure chest with gold and pearls (3) -----
    g = Geo()
    for x in (-162.0, -152.0):
        cyl(g, (x, -60.0, 0.0), (x, -60.0, 12.0), 4.6, 5.2, bevel=0.8, segs=18)
    rig.part("treasury1", g, GB_WOOD_LT, outline=0.5)
    g = Geo()
    for x in (-162.0, -152.0):
        for z in (2.6, 9.4):
            cyl(g, (x, -60.0, z), (x, -60.0, z + 1.0), 5.0 + (0.4 if z > 5 else 0.0), bevel=0.2, segs=18)
    rig.part("treasury1", g, GB_IRON, finish="metal", outline=0.3)
    g = Geo().lathe([(2.0, 0.0), (6.0, 0.0), (6.0, 2.4), (2.0, 2.4)], (-140.0, -62.0, 0.0), (-140.0, -62.0, 2.4), segs=20)
    rig.part("treasury1", g, GB_ROPE, finish="hair", outline=0.4)
    g = Geo()
    box(g, (-122.0, -62.0, 5.0), (7.0, 5.0, 5.0), p=6)
    rig.part("treasury2", g, GB_WOOD)
    g = Geo()
    for i in range(6):
        g.sphere((-125.0 + (i % 3) * 3.0, -63.0 + (i // 3) * 2.0, 11.0), 1.6, cuts=2)
    rig.part("treasury2", g, GB_GOLD, finish="bronze_rich", outline=0.3)
    g = Geo()
    box(g, (-98.0, -64.0, 6.0), (9.0, 6.0, 6.0), p=6)
    g.blob((-98.0, -58.0, 16.0), (9.0, 2.0, 5.0), p=2.2, rot=(30, 0, 0))
    rig.part("treasury3", g, GB_WOOD_LT)
    g = Geo()
    for i in range(9):
        g.sphere((-104.0 + (i % 5) * 3.0, -66.0 + (i // 5) * 2.4, 13.0 + (i % 2)), 1.8, cuts=2)
    rig.part("treasury3", g, GB_GOLD, finish="bronze_rich", outline=0.3)
    g = Geo()
    for i in range(4):
        g.sphere((-92.0 + i * 1.6, -70.0, 12.0 + (i % 2)), 1.0, cuts=2)
    rig.part("treasury3", g, "#F2EEE6", outline=0.3)


def gb_breach(rig, joint, x, y, z, w, h, seed=0):
    """A stove-in hole in the planking: a dark jagged opening, splintered plank ends."""
    rnd = random.Random(seed)
    n = 14
    pts, inner = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.7 + 0.3 * rnd.random()
        pts.append((x + math.cos(a) * w / 2 * k, z + math.sin(a) * h / 2 * k))
        inner.append((x + math.cos(a) * w / 2 * k * 0.72, z + math.sin(a) * h / 2 * k * 0.66 - h * 0.08))
    rig.part(joint, Geo().slab(pts, y - 2.4, 1.6), "#2E241C", outline=0.6, outline_hex="#120D08")
    rig.part(joint, Geo().slab(inner, y - 3.4, 1.0), "#120D08", outline=0)
    g = Geo()
    for i in range(0, n, 2):
        px_, pz_ = pts[i]
        g.capsule((px_, y - 3.0, pz_), (px_ + rnd.uniform(-4, 4), y - 4.0, pz_ + rnd.uniform(-3, 3)), 1.0, 0.5, segs=6, rings=1)
    rig.part(joint, g, GB_WOOD_LT, outline=0.4)


def gb_flutter_pose(f):
    return {f"flutter{k}": ({"show": True} if k == f else {"hide": True}) for k in range(GB_SAIL_FRAMES)}


def crumble_galleon(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "crown": {"hide": True}, "lid": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachH": {"show": True}, "soot": {"show": True},
                     "mainSail": {"hide": True}, "sailLoose": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breachW": {"show": True}, "deckFire": {"show": True},
                     "mizzen": {"hide": True}, "mizStump": {"show": True}, "topmast": {"r": -14.0, "x": -1.0}})
    return pose


GALLEON_BASTION = base_module(
    "gunpowder", "Galleon Bastion", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build_galleon, crumble=crumble_galleon, mount_depth=GB_DEPTHS, skin="galleon_bastion",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-160.0, GB_CL - 33.0, 145.0), 3, 18), ((-132.0, GB_CL - 28.0, 80.0), 2, 14), ((-144.0, GB_CL - 28.0, 116.0), 3, 12)],
    smoke=[((-86.0, -40.0, 40.0), 2), ((-70.0, -30.0, 70.0), 3), ((-130.0, -30.0, 106.0), 3)],
    horn=(-100, 330), yaw=BASE_YAW,
    props=[prop_loop("flutter", ["flutter"], GB_SAIL_FRAMES, gb_flutter_pose, ms=GB_SAIL_MS, crumble=(0, 3), z="front", hold=1,
                     anchor=(GB_FORE[0], GB_FORE[1] - 4.0, 126.0), sequence=[0, 1, 2, 3, 2, 1])],
    extra_meta={
        "collapseMaterial": "stone",
        # the masts fall toward the lane first, then the stern-castle
        "topple": [topple_lu(-70, 10, 120, delay_ms=0, push=1.0, sink_lu=30),
                   topple_lu(-170, -100, 80, delay_ms=160, push=0.8, sink_lu=24)],
        "rubbleColors": [GB_WOOD, GB_WOOD_LT, GB_SAND, GB_CANVAS],
        "dustColor": "#D3C4A0",
        "ambientLu": [ambient_lu("birds", (-60.0, -10.0, 300.0), 60, 0.6, color="#F2F2EE"),
                      ambient_lu("glints", (-80.0, -44.0, 6.0), 40, 0.6, color="#EAF7FC"),
                      ambient_lu("glints", (GB_X1 - 6.0, GB_CL - 6.0, 44.0), 8, 0.5)],
    },
)

SKINS = [CORAL_FORT, WINDMILL_REDOUBT, GALLEON_BASTION]
