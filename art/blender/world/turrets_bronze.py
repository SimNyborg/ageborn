"""Bronze Age turrets (docs/design-lane-ages.md A17.9, A17.12): Archer Tower, Sun Mirror, Onager,
Gorgon Bust. Same contract as the other ages (world/common.turret_module): a static `mount`, a
rotating `head` (idle, fire with a per-frame muzzle), and whole-turret build and destroyed clips.

Palette: sandstone, verdigris and dusk plum for large areas; polished bronze only on rims and
studs (it sits in the orange team band); large metal surfaces use aged bronze. Beams and the
Gorgon's gaze are white-hot and desaturated (A17.12).
"""
import math

from ageborn_art import face as F
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
    # head: the archer (drawn 1.3x so his face and bow read at game size), turning at the deck
    rig.joint("archer", "head", (0, 0, 28), scale=ARCHER_S)
    g = Geo().blob((0, 0, 33.0), (5.6, 5.2, 6.2), p=2.4)
    rig.part("archer", g, team=True)
    g = Geo().capsule((4.6, -3.0, 37.2), (-3.4, 3.8, 29.6), 0.9)               # quiver strap
    rig.part("archer", g, P.LEATHER_DK, outline=0.3)
    rig.joint("quiver", "archer", (-4.8, 2.0, 33.0))
    g = Geo().capsule((-4.4, 2.6, 28.0), (-6.4, 2.6, 38.0), 2.0)
    rig.part("quiver", g, P.LEATHER)
    g = Geo()
    for dy in (1.6, 3.6):
        g.lathe([(0.2, 0), (1.3, 1.4), (0, 3.2)], (-6.6, dy, 37.6), (-7.3, dy, 40.8), segs=6)
    rig.part("quiver", g, SAND_LT, outline=0.3)
    ahead = Geo().blob((0.6, 0, 42.0), (5.0, 4.8, 5.0), p=2.3)
    ahead.blob((5.6, -0.3, 41.2), (1.5, 1.4, 1.5), p=2.0)
    face = F.Face(rig, "archer", [ahead])
    rig.part("archer", ahead, P.SKIN)
    g = Geo()
    face.decal(g, face.hit(3.8, 42.6), F.ellipse(0, 0, 1.9, 2.3, 14), 0.3)
    rig.part("archer", g, P.EYE, highlight=False, outline=0)
    rig.joint("apupil", "archer", (4.2, -4.0, 42.4))
    g = Geo()
    face.decal(g, face.hit(3.8, 42.6) - face.view * 0.3, F.ellipse(0.6, -0.2, 1.0, 1.3, 10), 0.3)
    rig.part("apupil", g, P.PUPIL, highlight=False, outline=0)
    rig.joint("alid", "archer", (4.2, -4.0, 42.4), hidden=True)
    g = Geo()
    face.decal(g, face.hit(3.8, 42.6) - face.view * 0.5, F.ellipse(0, 0, 2.1, 2.5, 14), 0.3)
    rig.part("alid", g, P.SKIN, highlight=False, outline=0)
    rig.joint("abrow", "archer", (4.2, -4.0, 45.0))
    g = Geo()
    face.stroke(g, face.hit(3.6, 45.2) - face.view * 0.4, [(-1.8, 0.6), (1.6, -0.4)], 1.0, 0.3)
    rig.part("abrow", g, P.HAIR, highlight=False, outline=0)
    g = Geo()
    face.stroke(g, face.hit(4.6, 39.0) - face.view * 0.3, [(-0.9, 0.2), (0.9, -0.1)], 0.8, 0.3)
    rig.part("archer", g, P.MOUTH, highlight=False, outline=0)
    g = Geo().blob((0.4, 0, 44.6), (5.4, 5.2, 3.8), p=2.4)
    g.clip((0, 0, 43.6), (0, 0, -1))
    rig.part("archer", g, BRONZE, finish=P.POLISH)
    g = Geo().blob((0.4, 0, 43.8), (5.6, 5.4, 0.8), p=3.0)
    rig.part("archer", g, VERD, outline=0.3)
    rig.secondary("acrest", "archer", (1.0, 0, 48.0), (-6.0, 0, 48.6), max_deg=16, gain=1.2)
    g = Geo().blob((-2.6, 0, 48.6), (4.2, 1.4, 2.4), p=2.2)
    rig.part("acrest", g, team=True, outline=0.4)
    g = Geo().capsule((1.0, -5.0, 36.0), (12.0, -5.0, 36.5), 1.5)     # bow arm
    g.blob((12.1, -5.0, 36.4), (1.8, 1.6, 1.8), p=2.2)
    rig.part("archer", g, P.SKIN, outline=0.5)
    rig.joint("draw", "archer", (0.0, -4.0, 36.5))
    g = Geo().capsule((1.0, -4.0, 35.5), (-2.5, -4.0, 36.5), 1.5)
    g.blob((-2.8, -4.0, 36.5), (1.8, 1.6, 1.8), p=2.2)
    rig.part("draw", g, P.SKIN, outline=0.5)
    # recurve bow in the side plane, string, arrow
    g = Geo()
    pts = [(10.5, 47.0), (13.5, 44.0), (12.7, 39.5), (13.7, 36.5), (12.7, 33.5), (13.5, 29.0), (10.5, 26.0)]
    for (x0, z0), (x1, z1) in zip(pts, pts[1:]):
        g.capsule((x0, -5.2, z0), (x1, -5.2, z1), 1.0)
    rig.part("archer", g, WOOD_DK, outline=0.5)
    g = Geo().capsule((12.8, -5.6, 38.0), (12.8, -5.6, 35.0), 1.3)        # grip wrap
    rig.part("archer", g, P.LEATHER_DK, outline=0.3)
    rig.joint("string", "archer", (12.5, -5.2, 36.5))
    g = Geo().capsule((10.5, -5.4, 47.0), (0.0, -5.4, 36.5), 0.35).capsule((0.0, -5.4, 36.5), (10.5, -5.4, 26.0), 0.35)
    rig.part("string", g, LINEN, outline=0)
    rig.joint("arrow", "archer", (0.0, -5.0, 36.5))
    g = Geo().capsule((-0.5, -5.0, 36.5), (19.0, -5.0, 36.5), 0.55)
    g.lathe([(1.4, 0), (0.05, 3.2)], (19.0, -5.0, 36.5), (22.2, -5.0, 36.5), segs=8)
    g.slab([(-0.5, 36.5), (3.0, 36.5), (0.0, 38.4)], -5.0, 0.5).slab([(-0.5, 36.5), (3.0, 36.5), (0.0, 34.6)], -5.0, 0.5)
    rig.part("arrow", g, SAND_LT, outline=0.4)


ARCHER_S = 1.3


def archer_idle(f):
    # 6-frame loop: he peeks left and right over the parapet, bobs, blinks on 4
    t = f / 6 * 2 * math.pi
    out = {"head": {"z": 0.5 * math.sin(t), "r": 1.5 * math.sin(t)},
           "archer": {"z": -1.2 * max(0.0, math.sin(t)), "r": 2.0 * math.sin(2 * t)},
           "apupil": {"x": 0.5 * math.cos(t), "z": 0.2 * math.sin(2 * t)}}
    if f == 4:
        out["alid"] = {"show": True}
        out["apupil"]["hide"] = True
    return out


def archer_fire(f):
    # 0 full draw (leans back, squints), 1 release (the string snaps, the arrow is away), 2 the
    # bow arm kicks, 3 reaches into the quiver, 4 nocked again
    out = {"draw": {"x": [-4.0, 1.2, 0.6, -2.0, -1.0][f], "z": [0, 0, 0, 4.0, 0.6][f]},
           "arrow": {"x": [-4.0, 14.0, 0, -3.0, -0.6][f], "hide": f in (1, 2), "s": 0.6 if f == 3 else 1.0,
                     "z": 4.0 if f == 3 else 0.0},
           "string": {"sx": [0.62, 1.14, 1.04, 1.0, 1.0][f]},
           "archer": {"r": [7, -5, -2, 3, 0][f], "sz": [0.94, 1.06, 1.0, 1.0, 1.0][f]},
           "head": {"x": [0, -1.2, -0.6, -0.2, 0][f]},
           "abrow": {"z": [-0.6, -0.4, 0, 0, 0][f]}}
    if f == 0:
        out["alid"] = {"show": True, "z": 1.0}
    return out


ARCHER_OVERLAYS = {"fire": {1: [{"kind": "streak", "joint": "arrow", "point": (21.5, -5.0, 36.5), "from": 0,
                                 "color": SAND_LT, "width_lu": 3.2, "white": 0.3}]}}


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
    # 6-frame loop: the dish rocks gently and a bright glint sweeps across its face
    t = f / 6 * 2 * math.pi
    return {"head": {"r": 1.5 * math.sin(t)},
            "glint": {"s": 0.45 + 0.2 * max(0.0, math.sin(t)), "x": 2.4 * math.cos(t), "z": 3.0 * math.sin(t)}}


def mirror_fire(f):
    # 0 the dish tips back and the glint swells (anticipation), 1 the glare flares, 2-4 fade
    return {"glint": {"s": [1.3, 1.6, 1.2, 0.9, 0.6][f]}, "head": {"x": [0, -0.8, -0.4, 0, 0][f], "r": [5, -3, -1, 0, 0][f]}}


MIRROR_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "head", "point": (3.0 + 13.0 * 0.79, -11.0, 34.0), "radii_lu": (5.0, 8.0),
         "a0": -50.0, "a1": 50.0, "color": BEAM}],
    1: [{"kind": "burst", "joint": "head", "point": (3.0 + 13.0 * 0.79, -11.0, 34.0), "r0_lu": 9.0, "r1_lu": 17.0,
         "n": 8, "a0": 0.0, "arc": 360.0, "color": BEAM}],
    2: [{"kind": "burst", "joint": "head", "point": (3.0 + 13.0 * 0.79, -11.0, 34.0), "r0_lu": 12.0, "r1_lu": 16.0,
         "n": 6, "a0": 15.0, "arc": 360.0, "color": BEAM}],
}}


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
    # head: the throwing arm pivots in a rope skein (a thick twisted coil round its foot, part of
    # the head so it reads in every frame) and lies cocked back; a team sleeve on the arm; at the
    # end a plum leather sling cup on ropes carries a boulder
    rig.joint("arm", "head", (8, 0, 11))
    g = Geo()
    for k in range(7):                                                   # the twisted skein coil
        y = -6.0 + 2.0 * k
        g.lathe([(2.6, -0.9), (4.4, -0.5), (4.6, 0.4), (2.8, 0.9)], (8, y, 11), (8, y + 1, 11), segs=16)
    rig.part("head", g, ROPE, finish="hair", outline=0.5)
    g = Geo()
    for y in (-7.6, 7.6):
        cyl(g, (8, y, 11), (8, y + (1.2 if y > 0 else -1.2), 11), 5.0, bevel=0.3)
    rig.part("head", g, AGED, finish="metal", outline=0.4)
    g = Geo().capsule((8, 0, 11), (-18, 0, 13), 2.8, 2.0)
    rig.part("arm", g, WOOD)
    g = Geo().capsule((1.0, 0, 11.6), (-9.0, 0, 12.4), 3.5, 3.1)          # team sleeve
    rig.part("arm", g, team=True, outline=0.5)
    g = Geo()
    for x in (2.4, -9.8):
        g.lathe([(3.3, -0.5), (3.7, 0), (3.3, 0.5)], (x, 0, 12.0), (x - 1, 0, 12.1), segs=14)
    rig.part("arm", g, BRONZE, finish=P.POLISH, outline=0.4)
    g = Geo()                                                               # sling ropes
    g.capsule((-18, -1.6, 13.4), (-22.5, -3.2, 17.4), 0.55).capsule((-18, 1.6, 13.4), (-22.5, 3.2, 17.4), 0.55)
    g.capsule((-18, 0, 13.4), (-16.5, 0, 18.0), 0.55)
    rig.part("arm", g, ROPE, outline=0.3)
    g = Geo().lathe([(0, -1.4), (5.6, -0.8), (6.4, 2.4), (5.4, 3.0), (0, 1.2)], (-20, 0, 13.4), (-20, 0, 16.4),
                    segs=18, squash=(1.2, 1.0))
    rig.part("arm", g, P.PLUM, outline=0.6)                                 # the sling cup
    rig.joint("stone", "arm", (-20, 0, 18.5))
    g = Geo()
    from world.common import rock
    rock(g, (-20, 0, 19.0), (4.4, 4.2, 4.0), seed=4, jag=0.12)
    rig.part("stone", g, SAND_DK)


def onager_idle(f):
    # 6-frame loop: the cocked arm creaks against the skein, the boulder rocks in the cup
    t = f / 6 * 2 * math.pi
    return {"arm": {"r": 2.0 * math.sin(t), "sz": 1.0 - 0.015 * math.cos(t)},
            "stone": {"r": 10 * math.sin(2 * t), "z": 0.6 * max(0.0, -math.sin(t))}}


def onager_fire(f):
    # 0 wound down further (the arm bends, anticipation), 1 the whip (smear), 2 slams into the
    # padded buffer (dust, shudder), 3 bounces back, 4 lowered and reloaded
    return {"arm": {"r": [12, -70, -88, -58, -12][f], "sz": [0.94, 1.08, 1.0, 1.0, 1.0][f]},
            "stone": {"hide": f in (1, 2, 3)},
            "mount": {"z": [0, 0, -0.6, 0.2, 0][f]}}


ONAGER_OVERLAYS = {"fire": {
    1: [{"kind": "arc", "joint": "arm", "inner": (-6.0, 0, 12.6), "outer": (-21.0, 0, 16.0), "from": 0,
         "color": ROPE, "white": 0.3, "taper": 0.2, "lines": 3}],
    2: [{"kind": "burst", "joint": "mount", "point": (4.0, -10.0, 28.0), "r0_lu": 5.0, "r1_lu": 10.0, "n": 5,
         "a0": 20.0, "arc": 140.0},
        {"kind": "dust", "ground": (0.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 3, "spread": 1.2}],
}}


# -- Gorgon Bust: a stone head with snake hair on a column; the eyes blaze on the shot ------------------
GFACE = -50.0      # the face is turned toward the camera by this much (about the head's axis)


def _gp(x, y, z, cx=1.0, deg=GFACE):
    c, s_ = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    return (cx + (x - cx) * c - y * s_, (x - cx) * s_ + y * c, z)


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
    # head: a pale stone face turned three-quarters to the camera (so the face reads at game
    # size), verdigris snakes, a team diadem; big blank eyes and a hiss flare on the shot
    g = Geo().blob((1.0, 0, 33.0), (9.2, 8.8, 9.6), p=2.3)
    g.blob((8.8, -0.2, 32.4), (1.9, 1.7, 2.3), p=2.0)
    g.blob((1.0, 0, 25.4), (6.0, 6.0, 3.2), p=2.4)                         # neck
    rig.part("head", _turn(g, 1.0, 0, GFACE), "#D8CFBC")
    g = Geo().capsule((7.0, -6.2, 37.2), (9.2, -1.2, 35.4), 1.2).capsule((9.2, 1.0, 35.4), (7.2, 5.8, 37.2), 1.2)
    rig.part("head", _turn(g, 1.0, 0, GFACE), "#8C8272", outline=0)
    rig.joint("gmouth", "head", _gp(8.4, 0, 28.4))
    g = Geo().blob((8.2, -0.2, 28.2), (1.0, 3.2, 0.8), p=2.2)
    rig.part("gmouth", _turn(g, 1.0, 0, GFACE), "#8C8272", outline=0)
    rig.joint("eyes", "head", _gp(8.0, 0, 33.6))
    g = Geo()
    for y in (-3.8, 3.2):
        g.blob((8.0, y, 33.4), (1.4, 2.2, 1.9), p=2.2)
    rig.part("eyes", _turn(g, 1.0, 0, GFACE), "#4F6660", outline=0)
    rig.joint("glow", "head", _gp(8.4, 0, 33.6), hidden=True)
    g = Geo()
    for y in (-3.8, 3.2):
        g.blob((8.6, y - 0.4, 33.4), (1.6, 2.6, 2.2), p=2.2)
    rig.part("glow", _turn(g, 1.0, 0, GFACE), glow=GAZE, outline=0.5, outline_hex=VERD_LT)
    g = Geo().blob((1.4, 0, 39.0), (9.6, 9.2, 2.4), p=2.8, rot=(0, -8, 0))  # diadem
    rig.part("head", g, team=True, outline=0.5)
    snakes = [((-4, -6, 38), (-10, -9, 42), (-12, -10, 36)), ((-6, 0, 40), (-13, 0, 44), (-15, 1, 38)),
              ((-4, 6, 38), (-10, 9, 42), (-12, 10, 36)), ((0, -7, 41), (-2, -10, 47), (3, -11, 49)),
              ((0, 6, 41), (-2, 10, 47), (3, 11, 49)), ((-2, 0, 42), (-4, 0, 49), (1, 0, 52)),
              ((-6, -4, 34), (-11, -8, 30), (-9, -11, 26)), ((-6, 4, 34), (-11, 8, 30), (-9, 11, 26))]
    # the near and top snakes are their own joints: they writhe in the idle and rear up on the shot
    for i, (a, b, c) in enumerate(snakes):
        jn = f"snake{i}" if i in (0, 3, 5, 6) else "head"
        if jn != "head":
            rig.joint(jn, "head", a)
        g = Geo().capsule(a, b, 1.9, 1.6).capsule(b, c, 1.6, 1.3)
        g.blob(c, (2.3, 1.8, 1.7), p=2.2)                                   # a wedge head
        rig.part(jn, g, VERD, finish="gloss")
        g = Geo().sphere((c[0] + 0.7, c[1] - 1.4, c[2] + 0.5), 0.55, cuts=1)
        rig.part(jn, g, P.PUPIL, outline=0)
        g = Geo().capsule((c[0] + 1.8, c[1] - 0.4, c[2] - 0.4), (c[0] + 3.4, c[1] - 0.4, c[2] - 1.0), 0.35)
        rig.part(jn, g, "#B86A6A", outline=0)                                # forked tongue
    # a stern mouth that opens in a hiss (fangs) on the shot
    rig.joint("ghiss", "head", _gp(8.4, 0, 28.4), hidden=True)
    g = Geo().blob((8.4, -0.2, 27.6), (1.6, 3.4, 2.0), p=2.2)
    rig.part("ghiss", _turn(g, 1.0, 0, GFACE), "#4A3F36", outline=0)
    g = Geo().lathe([(0.7, 0), (0, 1.6)], (9.2, -2.0, 29.0), (9.4, -2.0, 27.2), segs=6)
    g.lathe([(0.7, 0), (0, 1.6)], (9.2, 1.4, 29.0), (9.4, 1.4, 27.2), segs=6)
    rig.part("ghiss", _turn(g, 1.0, 0, GFACE), LINEN, outline=0)
    flare(rig, "head", _gp(10.5, -1.0, 33.6), size=0.9, color=GAZE)


SNAKES = (0, 3, 5, 6)


def gorgon_idle(f):
    # 6-frame loop: the snake hair writhes (each snake on its own phase), the bust sways
    t = f / 6 * 2 * math.pi
    out = {"head": {"r": 1.2 * math.sin(t), "z": 0.3 * math.sin(t)}}
    for k, i in enumerate(SNAKES):
        out[f"snake{i}"] = {"r": 14 * math.sin(t + k * 1.7), "rx": 8 * math.cos(t + k * 1.3)}
    return out


def gorgon_fire(f):
    # 0 the snakes rear back and the brow drops (anticipation), 1 the eyes blaze and she hisses
    # (the gaze), 2-4 the glare fades, the snakes settle
    out = {"glow": {"show": f in (0, 1, 2), "s": [0.8, 1.35, 1.0, 1, 1][f]},
           "head": {"x": [0.6, -0.8, -0.4, 0, 0][f], "r": [3, -3, -1, 0, 0][f]},
           "ghiss": {"show": f in (1, 2)}, "gmouth": {"hide": f in (1, 2)}}
    for k, i in enumerate(SNAKES):
        out[f"snake{i}"] = {"r": [18, -12, -6, 4, 0][f] * (1 if k % 2 == 0 else -1)}
    return out


GORGON_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "head", "point": _gp(9.5, -1.0, 33.6), "radii_lu": (4.0, 6.5),
         "a0": -60.0, "a1": 60.0, "color": GAZE}],
    1: [{"kind": "burst", "joint": "head", "point": _gp(10.5, -1.0, 33.6), "r0_lu": 5.0, "r1_lu": 11.0,
         "n": 6, "a0": -70.0, "arc": 140.0, "color": GAZE}],
}}


TURRETS = [
    turret_module("archer_tower", "Archer Tower", "bronze", 48, CANVAS, FEET, (0, 28),
                  (ARCHER_S * 22.2, ARCHER_S * -5.0, 28 + ARCHER_S * 8.5), archer_build,
                  archer_idle, archer_fire, aim=(-40, 30), fire_kind="release", idle_frames=6,
                  overlays=ARCHER_OVERLAYS),
    turret_module("sun_mirror", "Sun Mirror", "bronze", 48, CANVAS, FEET, (3, 34), (13.3, -9.0, 34.0), mirror_build,
                  mirror_idle, mirror_fire, aim=(-45, 30), fire_kind="beam", idle_frames=6, overlays=MIRROR_OVERLAYS),
    turret_module("onager", "Onager", "bronze", 40, (280, 210), (130, 176), (8, 11), (-20, 0, 18.5), onager_build,
                  onager_idle, onager_fire, aim=(0, 0), fire_kind="swing", muzzle_joint="stone", idle_frames=6,
                  overlays=ONAGER_OVERLAYS),
    turret_module("gorgon_bust", "Gorgon Bust", "bronze", 52, CANVAS, FEET, (1, 26), _gp(10.5, -1.0, 33.6), gorgon_build,
                  gorgon_idle, gorgon_fire, aim=(-35, 25), fire_kind="gaze", idle_frames=6, overlays=GORGON_OVERLAYS),
]
