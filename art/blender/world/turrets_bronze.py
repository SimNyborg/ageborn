"""Bronze Age turrets (docs/design-lane-ages.md A17.9, A17.12): Archer Tower, Sun Mirror, Onager,
Gorgon Bust. Same contract as the other ages (world/common.turret_module): a static `mount`, a
rotating `head` (idle, fire with a per-frame muzzle), and whole-turret build and destroyed clips.

Palette: sandstone, verdigris and dusk plum for large areas; polished bronze only on rims and
studs (it sits in the orange team band); large metal surfaces use aged bronze. Beams and the
Gorgon's gaze are white-hot and desaturated (A17.12).
"""
import math

from ageborn_art import rigs_bronze as P
from ageborn_art.geometry import Geo

from world.common import box, cyl, pennant, rope, smoke_puff, turret_module

SAND = P.SAND
SAND_LT = P.SAND_LT
SAND_DK = P.SAND_DK
STONE_DK = "#8F8270"
WOOD = "#8E7658"
WOOD_DK = "#5E4C3C"
AGED = P.AGED
AGED_DK = P.AGED_DK
BRONZE = P.BRONZE
VERD = P.VERD
VERD_LT = P.VERD_LT
PLUM = P.PLUM
LINEN = P.LINEN
MIRROR = "#EFE6C8"
MIRROR_HI = "#FFF8E6"
BEAM = "#FFF1C8"
BEAM_CORE = "#FFFFFF"
GAZE = "#F4FFF8"
ROPE = "#C2AE86"

CANVAS = (270, 220)
FEET = (100, 180)


def sand_plinth(rig, r=15.0, h=7.0, steps=True):
    """A stepped sandstone plinth (the footing every Bronze turret stands on)."""
    g = Geo()
    box(g, (0, 2, h * 0.35), (r + 2.0, r * 0.8 + 1.6, h * 0.35), p=6)
    rig.part("mount", g, SAND_DK)
    g = Geo()
    box(g, (0, 2, h * 0.7 + 0.6), (r, r * 0.8, h * 0.35), p=6)
    rig.part("mount", g, SAND)
    if steps:
        g = Geo()
        box(g, (0, 2, h + 0.4), (r + 0.8, r * 0.8 + 0.8, 0.9), p=6)
        rig.part("mount", g, SAND_LT)


def flare(rig, joint, at, size=1.0, name="flash", color=BEAM, core=BEAM_CORE):
    """A hidden star-flare (the shot frame of the beam and gaze turrets)."""
    x, y, z = at
    k = size
    rig.joint(name, joint, at, hidden=True)
    g = Geo()
    for i in range(8):
        a = 2 * math.pi * i / 8
        L = (7.5 if i % 2 == 0 else 4.5) * k
        g.capsule((x, y - 3, z), (x + math.cos(a) * L, y - 3, z + math.sin(a) * L), 1.1 * k, 0.4 * k, segs=6, rings=2)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x, y - 4, z), 2.8 * k, cuts=3)
    rig.part(name, g, glow=core, outline=0)
    return name


# -- Archer Tower: a timber tower with an archer behind a team parapet ---------------------------------
def archer_build(rig):
    sand_plinth(rig, r=14, h=6)
    g = Geo()
    for x, y in ((-9, -8), (9, -8), (-9, 10), (9, 10)):
        g.capsule((x, y, 6), (x * 0.85, y * 0.85, 27), 1.9)
    g.capsule((-9, -8, 13), (9, -8, 21), 1.2).capsule((9, -8, 13), (-9, -8, 21), 1.2)
    rig.part("mount", g, WOOD_DK)
    g = Geo()
    box(g, (0, 1, 27.5), (12.5, 11.5, 1.6), p=5)
    rig.part("mount", g, WOOD)
    g = Geo().slab([(-11, 26), (11, 26), (11, 17), (6, 13.5), (0, 16.5), (-6, 13.5), (-11, 17)], -10.2, 1.2)
    rig.part("mount", g, team=True, outline=0.6)
    g = Geo()
    for i in range(6):
        g.blob((-9.5 + i * 3.8, -11.0, 25.6), (1.2, 0.6, 1.1), p=2.2)
    rig.part("mount", g, SAND_LT, outline=0.4)
    pennant(rig, "mount", -12, 9, 27, h=18, length=13, width=8)
    # head: the archer (tunic, helmet, bow), turning at the deck
    g = Geo().blob((0, 0, 33.0), (5.4, 5.0, 6.0), p=2.4)
    rig.part("head", g, team=True)
    g = Geo().blob((0.6, 0, 42.0), (4.8, 4.6, 4.8), p=2.3)
    g.blob((5.2, -0.3, 41.4), (1.4, 1.3, 1.4), p=2.0)
    rig.part("head", g, P.SKIN)
    g = Geo().blob((0.4, 0, 44.4), (5.2, 5.0, 3.6), p=2.4)
    g.clip((0, 0, 43.4), (0, 0, -1))
    rig.part("head", g, AGED, finish="metal")
    g = Geo().blob((-3.0, 0, 48.2), (4.0, 1.4, 2.2), p=2.2)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo().sphere((3.6, -3.2, 42.6), 0.9, cuts=2)
    rig.part("head", g, P.PUPIL, outline=0)
    g = Geo().capsule((1.0, -5.0, 36.0), (8.5, -5.0, 36.5), 1.4)      # bow arm
    rig.part("head", g, P.SKIN, outline=0.5)
    rig.joint("draw", "head", (0.0, -4.0, 36.5))
    g = Geo().capsule((1.0, -4.0, 35.5), (-2.5, -4.0, 36.5), 1.4)
    rig.part("draw", g, P.SKIN, outline=0.5)
    # recurve bow in the side plane, string, arrow
    g = Geo()
    pts = [(8.0, 46.0), (10.0, 43.0), (9.2, 39.5), (10.2, 36.5), (9.2, 33.5), (10.0, 30.0), (8.0, 27.0)]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        g.capsule((x0, -5.2, z0), (x1, -5.2, z1), 0.9)
    rig.part("head", g, WOOD_DK, outline=0.5)
    rig.joint("string", "head", (9.0, -5.2, 36.5))
    g = Geo().capsule((8.0, -5.4, 46.0), (0.0, -5.4, 36.5), 0.3).capsule((0.0, -5.4, 36.5), (8.0, -5.4, 27.0), 0.3)
    rig.part("string", g, LINEN, outline=0)
    rig.joint("arrow", "head", (0.0, -5.0, 36.5))
    g = Geo().capsule((-0.5, -5.0, 36.5), (15.5, -5.0, 36.5), 0.5)
    g.lathe([(1.2, 0), (0.05, 3.0)], (15.5, -5.0, 36.5), (18.5, -5.0, 36.5), segs=8)
    rig.part("arrow", g, SAND_LT, outline=0.4)


def archer_idle(f):
    w = math.sin(f / 4 * 2 * math.pi)
    return {"head": {"z": 0.4 * w, "r": 1.5 * w}}


def archer_fire(f):
    return {"draw": {"x": [-3.0, 1.0, 0.5, -1.0, -2.0][f]}, "arrow": {"x": [-3.0, 14.0, 0, 0, 0][f], "hide": f in (1, 2),
                                                                     "s": 0.5 if f == 3 else 1.0},
            "string": {"sx": [0.7, 1.12, 1.04, 1.0, 1.0][f]}, "head": {"x": [0, -1.2, -0.6, -0.2, 0][f]}}


# -- Sun Mirror: a polished dish on a tripod that focuses sunlight -------------------------------------
DISH_TURN = -38.0     # the dish faces forward and turns toward the camera, so its polished face reads


def _turn(g, cx, cz, deg=DISH_TURN):
    c, s_ = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    for v in g.bm.verts:
        x, y = v.co.x - cx, v.co.y
        v.co.x, v.co.y = cx + x * c - y * s_, x * s_ + y * c
    return g


def mirror_build(rig):
    sand_plinth(rig, r=13, h=5)
    g = Geo()
    for a in (90, 210, 330):
        x, y = 9.0 * math.cos(math.radians(a)), 9.0 * math.sin(math.radians(a)) + 2
        g.capsule((x, y, 5), (0, 1, 24), 1.4)
    rig.part("mount", g, WOOD_DK)
    g = Geo()
    cyl(g, (0, 1, 22), (0, 1, 26), 3.4, bevel=0.5)
    rig.part("mount", g, AGED_DK, finish="metal")
    g = Geo().blob((0, 1, 20.0), (7.4, 7.0, 4.6), p=2.4, taper=(1.35, 0.7))
    rig.part("mount", g, team=True, outline=0.5)
    pennant(rig, "mount", -13, 7, 5, h=20, length=12, width=7)
    # head: the dish (aged-bronze back, a pale polished face, a thin polished rim, a team band)
    cx, cz = 3.0, 34.0
    n = (1.0, 0.0, 0.0)
    g = Geo().lathe([(0, -3.0), (5.0, -2.8), (11.0, -1.0), (13.0, 1.4), (0, 0.4)], (cx - 1.5, 0, cz), (cx + 1.5, 0, cz),
                    segs=36)
    rig.part("head", _turn(g, cx, cz), AGED, finish="metal")
    g = Geo().lathe([(12.4, 0.0), (13.6, 0.6), (13.4, 2.0), (12.2, 1.8)], (cx - 1.5, 0, cz), (cx + 1.5, 0, cz), segs=36)
    rig.part("head", _turn(g, cx, cz), "#C9B68A", finish="metal", outline=0.5)
    g = Geo().lathe([(0, -0.4), (6.0, 0.2), (11.8, 1.6), (11.6, 2.0), (0, 0.4)], (cx - 0.9, 0, cz), (cx + 0.1, 0, cz),
                    segs=36)
    rig.part("head", _turn(g, cx, cz), MIRROR, finish="gloss", outline=0.4)
    g = Geo().lathe([(0, 0), (3.2, 0.2), (0, 0.6)], (cx + 0.2, -0.8, cz + 3.0), (cx + 1.2, -0.8, cz + 3.0), segs=16)
    rig.part("head", _turn(g, cx, cz), glow=MIRROR_HI, outline=0)
    g = Geo().lathe([(5.0, -2.6), (12.2, -2.2), (12.2, 1.4), (5.0, 1.4)], (cx - 3.6, 0, cz), (cx - 2.6, 0, cz), segs=32)
    rig.part("head", _turn(g, cx, cz), team=True, outline=0.5)
    g = Geo().capsule((cx - 3.0, 0, cz), (cx - 7.0, 0, cz - 4.0), 2.2)
    g.capsule((cx + 1.0, 0, cz + 12.0), (cx + 12.0, 0, cz), 0.6).capsule((cx + 1.0, 0, cz - 12.0), (cx + 12.0, 0, cz), 0.6)
    rig.part("head", _turn(g, cx, cz), AGED_DK, finish="metal", outline=0.5)
    g = Geo().sphere((cx + 12.0, 0, cz), 1.4, cuts=2)                  # the focus bead
    rig.part("head", _turn(g, cx, cz), "#C9B68A", finish="metal", outline=0.4)
    rig.joint("glint", "head", (cx + 0.5, -1.0, cz))
    g = Geo().sphere((cx + 0.8, -1.4, cz), 4.0, cuts=3)
    rig.part("glint", _turn(g, cx, cz), glow=BEAM, outline=0)
    flare(rig, "head", (cx + 13.0 * 0.79, -13.0 * 0.62 - 1.0, cz), size=1.1)


def mirror_idle(f):
    w = math.sin(f / 4 * 2 * math.pi)
    return {"head": {"r": 1.5 * w}, "glint": {"s": 0.5 + 0.12 * w}}


def mirror_fire(f):
    return {"glint": {"s": [1.1, 1.5, 1.2, 0.9, 0.6][f]}, "head": {"x": [0, -0.8, -0.4, 0, 0][f]}}


# -- Onager: a torsion catapult with a throwing arm and sling ------------------------------------------
def onager_build(rig):
    sand_plinth(rig, r=17, h=5)
    g = Geo()
    for y in (-8, 8):
        box(g, (0, y, 8.5), (17, 1.8, 2.2), p=5)
    for x in (-13, 13):
        g.capsule((x, -9, 8.5), (x, 9, 8.5), 1.8)
    rig.part("mount", g, WOOD)
    g = Geo().slab([(-17, 5.5), (17, 5.5), (17, 12), (-17, 12)], -10.4, 1.2)
    g.slab([(-7, 12), (7, 12), (5, 20), (-5, 20)], -10.4, 1.2)
    rig.part("mount", g, team=True, outline=0.5)
    g = Geo()
    for y in (-8, 8):
        g.capsule((6, y, 9), (4, y, 26), 2.0)                             # the upright frame
        g.capsule((-6, y, 9), (4, y, 26), 1.6)
    g.capsule((4, -9, 26), (4, 9, 26), 1.8)
    rig.part("mount", g, WOOD_DK)
    g = Geo().blob((4, -9.2, 26), (3.0, 1.0, 3.0), p=2.4).blob((4, 9.2, 26), (3.0, 1.0, 3.0), p=2.4)
    rig.part("mount", g, AGED, finish="metal", outline=0.4)
    g = Geo()
    for y in (-6, 6):
        cyl(g, (8, y, 11), (8, y + (1 if y > 0 else -1), 11), 3.4, bevel=0.3)
    g.capsule((8, -6, 11), (8, 6, 11), 2.6)                              # the torsion skein
    rig.part("mount", g, SAND_DK, finish="hair", outline=0.5)
    g = Geo()
    box(g, (4, 0, 26.0), (2.6, 9.5, 2.6), p=4)                            # the padded buffer beam
    rig.part("mount", g, team=True)
    pennant(rig, "mount", -15, 8, 5, h=22, length=12, width=7)
    # head: the throwing arm pivots on the skein and lies cocked back; the cup carries a boulder
    rig.joint("arm", "head", (8, 0, 11))
    g = Geo().capsule((8, 0, 11), (-18, 0, 13), 2.6, 1.8)
    rig.part("arm", g, WOOD)
    g = Geo().lathe([(0, -1.0), (4.4, -0.6), (5.0, 1.8), (0, 0.6)], (-20, 0, 13.6), (-20, 0, 16.0), segs=16)
    rig.part("arm", g, AGED, finish="metal", outline=0.5)
    g = Geo().capsule((-13, -2.6, 13), (-13, 2.6, 13), 1.2)
    rig.part("arm", g, team=True, outline=0.4)
    rig.joint("stone", "arm", (-20, 0, 18.5))
    g = Geo()
    from world.common import rock
    rock(g, (-20, 0, 18.5), (4.2, 4.0, 3.8), seed=4, jag=0.12)
    rig.part("stone", g, SAND_DK)


def onager_idle(f):
    return {"arm": {"r": 1.5 * math.sin(f / 4 * 2 * math.pi)}}


def onager_fire(f):
    return {"arm": {"r": [4, -70, -84, -60, -12][f]}, "stone": {"hide": f in (1, 2, 3)}}


# -- Gorgon Bust: a stone head with snake hair on a column; the eyes blaze on the shot ------------------
def gorgon_build(rig):
    sand_plinth(rig, r=13, h=6)
    g = Geo()
    cyl(g, (0, 1, 6), (0, 1, 22), 8.0, 7.0, bevel=0.8, segs=20)
    rig.part("mount", g, SAND)
    g = Geo()
    for i in range(8):
        a = math.pi * (0.9 + 1.2 * i / 7)
        x, y = 7.6 * math.cos(a), 7.6 * math.sin(a) + 1
        g.capsule((x, y, 7.5), (x * 0.92, y * 0.92, 20.5), 0.8)          # fluting
    rig.part("mount", g, SAND_DK, outline=0.3)
    g = Geo()
    cyl(g, (0, 1, 21), (0, 1, 24), 10.0, bevel=0.6, segs=20)
    rig.part("mount", g, SAND_LT)
    g = Geo().slab([(-8.5, 21.5), (8.5, 21.5), (8.5, 10), (0, 5), (-8.5, 10)], -8.6, 1.2)   # team drape
    rig.part("mount", g, team=True, outline=0.5)
    # head: a pale stone face, verdigris snakes, a team diadem; eyes and gaze flare on the shot
    g = Geo().blob((1.0, 0, 33.0), (9.2, 8.8, 9.6), p=2.3)
    g.blob((8.8, -0.2, 32.4), (1.8, 1.6, 2.2), p=2.0)
    g.blob((1.0, 0, 25.4), (6.0, 6.0, 3.2), p=2.4)                         # neck
    rig.part("head", g, "#D8CFBC")
    g = Geo().capsule((6.4, -5.6, 36.4), (8.6, -1.4, 35.0), 0.9).capsule((8.6, 1.2, 35.0), (6.6, 5.2, 36.4), 0.9)
    g.blob((7.6, -0.2, 28.2), (1.0, 3.0, 0.7), p=2.2)
    rig.part("head", g, "#8C8272", outline=0)
    rig.joint("eyes", "head", (8.0, 0, 33.6))
    g = Geo()
    for y in (-3.6, 3.0):
        g.blob((7.8, y, 33.6), (1.2, 1.6, 1.4), p=2.2)
    rig.part("eyes", g, "#5E574C", outline=0)
    rig.joint("glow", "head", (8.0, 0, 33.6), hidden=True)
    g = Geo()
    for y in (-3.6, 3.0):
        g.blob((8.4, y - 0.4, 33.6), (1.4, 2.0, 1.7), p=2.2)
    rig.part("glow", g, glow=GAZE, outline=0.5, outline_hex=VERD_LT)
    g = Geo().blob((1.4, 0, 39.0), (9.6, 9.2, 2.4), p=2.8, rot=(0, -8, 0))  # diadem
    rig.part("head", g, team=True, outline=0.5)
    g = Geo()
    snakes = [((-4, -6, 38), (-10, -9, 42), (-12, -10, 36)), ((-6, 0, 40), (-13, 0, 44), (-15, 1, 38)),
              ((-4, 6, 38), (-10, 9, 42), (-12, 10, 36)), ((0, -7, 41), (-2, -10, 47), (3, -11, 49)),
              ((0, 6, 41), (-2, 10, 47), (3, 11, 49)), ((-2, 0, 42), (-4, 0, 49), (1, 0, 52)),
              ((-6, -4, 34), (-11, -8, 30), (-9, -11, 26)), ((-6, 4, 34), (-11, 8, 30), (-9, 11, 26))]
    for a, b, c in snakes:
        g.capsule(a, b, 1.8, 1.5).capsule(b, c, 1.5, 1.2)
        g.sphere(c, 1.8, cuts=2)
    rig.part("head", g, VERD, finish="gloss")
    g = Geo()
    for a, b, c in snakes:
        g.sphere((c[0] + 0.6, c[1] - 1.2, c[2] + 0.5), 0.45, cuts=1)
    rig.part("head", g, P.PUPIL, outline=0)
    flare(rig, "head", (10.5, -1.0, 33.6), size=0.9, color=GAZE)


def gorgon_idle(f):
    w = math.sin(f / 4 * 2 * math.pi)
    return {"head": {"r": 1.2 * w, "z": 0.3 * w}}


def gorgon_fire(f):
    return {"glow": {"show": f in (0, 1, 2), "s": [0.8, 1.3, 1.0, 1, 1][f]}, "head": {"x": [0.6, -0.8, -0.4, 0, 0][f],
                                                                                   "r": [2, -2, -1, 0, 0][f]}}


TURRETS = [
    turret_module("archer_tower", "Archer Tower", "bronze", 48, CANVAS, FEET, (0, 28), (18.5, -5.0, 36.5), archer_build,
                  archer_idle, archer_fire, aim=(-40, 30), fire_kind="release"),
    turret_module("sun_mirror", "Sun Mirror", "bronze", 48, CANVAS, FEET, (3, 34), (13.3, -9.0, 34.0), mirror_build,
                  mirror_idle, mirror_fire, aim=(-45, 30), fire_kind="beam"),
    turret_module("onager", "Onager", "bronze", 40, (280, 210), (130, 176), (8, 11), (-20, 0, 18.5), onager_build,
                  onager_idle, onager_fire, aim=(0, 0), fire_kind="swing", muzzle_joint="stone"),
    turret_module("gorgon_bust", "Gorgon Bust", "bronze", 52, CANVAS, FEET, (1, 26), (10.5, -1.0, 33.6), gorgon_build,
                  gorgon_idle, gorgon_fire, aim=(-35, 25), fire_kind="gaze"),
]
