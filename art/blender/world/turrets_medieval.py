"""Medieval Age turrets (DESIGN A5.3, A14.2): Crossbow Nest, Pitch Cauldron, Trebuchet,
Honk Ballista."""
import math

from ageborn_art.geometry import Geo

from world.common import box, cyl, muzzle_flash, pennant, rope, smoke_puff, turret_module

STONE = "#9A9C98"
STONE_LT = "#AEB0AA"
STONE_DK = "#7C7F80"
WOOD = "#857058"
WOOD_DK = "#5C4C3E"
IRON = "#4A4E56"
STEEL = "#A9B1BB"
GOLD = "#D4A437"
ROPE = "#C2AE86"
PITCH = "#2A2426"
FIRE = "#FFD08A"
FIRE_CORE = "#FFF3D6"
GOOSE = "#F2EFE6"
GOOSE_DK = "#C8C4B8"
BEAK = "#E0A24A"

CANVAS = (270, 220)
FEET = (100, 180)


def stone_plinth(rig, r=15.0, h=10.0):
    g = Geo()
    box(g, (0, 2, h / 2), (r, r * 0.8, h / 2), p=6)
    rig.part("mount", g, STONE)
    g = Geo()
    box(g, (0, 2, h - 0.5), (r + 1.2, r * 0.8 + 1.2, 1.6), p=6)
    rig.part("mount", g, STONE_LT)


# -- Crossbow Nest: a heavy crossbow on a post ------------------------------------------------------
def crossbow_build(rig):
    stone_plinth(rig)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 22), 3.2, bevel=0.5)
    rig.part("mount", g, WOOD_DK)
    pennant(rig, "mount", -12, 6, 9, h=26)
    # head: stock along +x, bow limbs across y (seen foreshortened), string, a bolt
    g = Geo()
    box(g, (4, 0, 25), (15, 3.0, 2.6), p=5)
    rig.part("head", g, WOOD)
    g = Geo()
    box(g, (-10, 0, 24), (4, 3.4, 3.6), p=5)
    rig.part("head", g, team=True)
    rig.joint("limbs", "head", (15, 0, 26))
    g = Geo()
    for s in (-1, 1):
        g.capsule((15, 0, 26), (11, s * 16, 27), 1.8, 1.1)
    rig.part("limbs", g, WOOD_DK)
    g = Geo()
    box(g, (15, 0, 26), (2.2, 3.6, 2.2), p=4, cuts=2)
    rig.part("limbs", g, IRON, finish="metal", outline=0.5)
    rig.joint("string", "head", (4, 0, 27))
    g = Geo()
    for s in (-1, 1):
        g.capsule((11, s * 16, 27), (4, 0, 27.5), 0.5)
    rig.part("string", g, ROPE, outline=0)
    rig.joint("bolt", "head", (4, 0, 28.5))
    g = Geo().capsule((4, 0, 28.5), (22, 0, 28.5), 0.9)
    g.lathe([(1.8, 0), (0.1, 4)], (22, 0, 28.5), (26, 0, 28.5), segs=8)
    rig.part("bolt", g, STEEL, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-4, 0, 29.5), (2.6, 3.4, 2.2), p=4, cuts=2)
    rig.part("head", g, IRON, finish="metal", outline=0.4)


def crossbow_idle(f):
    return {"head": {"z": 0.6 * math.sin(f / 4 * 2 * math.pi)}}


def crossbow_fire(f):
    return {"string": {"x": [-2, 8, 7, 3, 0][f]}, "limbs": {"sy": [0.94, 1.08, 1.02, 1.0, 1.0][f]},
            "bolt": {"x": [-1, 16, 0, 0, 0][f], "hide": f in (1, 2), "s": 0.4 if f == 3 else 1.0},
            "head": {"x": [0, -3, -2, -1, 0][f]}}


# -- Pitch Cauldron: a cauldron over a brazier that tips forward to pour -----------------------------
def cauldron_build(rig):
    stone_plinth(rig, r=16, h=9)
    g = Geo()
    for s in (-1, 1):
        g.capsule((s * 12, -8, 9), (s * 9, -8, 32), 1.8)
        g.capsule((s * 12, 8, 9), (s * 9, 8, 32), 1.8)
    rig.part("mount", g, IRON, finish="metal", outline=0.6)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 14), 7, 9, bevel=0.6)
    rig.part("mount", g, STONE_DK)
    g = Geo().blob((0, -2, 17), (6, 5, 5), p=2.0, taper=(1.0, 0.3))
    rig.part("mount", g, glow=FIRE, outline=0)
    g = Geo().blob((0, -4, 16), (3, 2.4, 2.6), p=2.0, taper=(1.0, 0.3))
    rig.part("mount", g, glow=FIRE_CORE, outline=0)
    pennant(rig, "mount", -15, 7, 9, h=30)
    # head: the cauldron hangs from its pivot bar
    g = Geo().lathe([(0, 0), (6, 0.2), (10.5, 3), (12, 8), (11.5, 13), (12.8, 14), (12.5, 15.2), (10.5, 15), (0, 12)],
                    (0, 0, 18), (0, 0, 34), segs=20)
    rig.part("head", g, IRON, finish="metal")
    g = Geo()
    cyl(g, (0, 0, 25), (0, 0, 28), 12.2, bevel=0.4, segs=20)
    rig.part("head", g, team=True, outline=0.5)
    g = Geo().blob((0, 0, 32.4), (10.2, 10.2, 1.6), p=2.2)
    rig.part("head", g, PITCH, finish="gloss", outline=0)
    g = Geo().capsule((0, -12, 30), (0, 12, 30), 1.4)
    rig.part("head", g, STEEL, finish="metal", outline=0.5)
    smoke_puff(rig, "head", (4, 0, 38), 0.7, name="steam")
    rig.joint("pour", "head", (11, 0, 33), hidden=True)
    g = Geo().capsule((13, -1, 33), (18, -1, 24), 2.6, 1.6)
    rig.part("pour", g, PITCH, finish="gloss", outline=0.5)


def cauldron_idle(f):
    return {"head": {"r": 2.0 * math.sin(f / 4 * 2 * math.pi)}, "steam": {"show": f in (1, 2), "s": 0.8 + 0.1 * f}}


def cauldron_fire(f):
    return {"head": {"r": [8, -38, -46, -24, -6][f]}, "pour": {"show": f in (1, 2)}}


# -- Trebuchet: a long throwing arm with a counterweight -------------------------------------------
def trebuchet_build(rig):
    stone_plinth(rig, r=17, h=7)
    g = Geo()
    for y in (-8, 8):
        g.capsule((-14, y, 7), (0, y, 36), 2.4, 2.0)
        g.capsule((14, y, 7), (0, y, 36), 2.4, 2.0)
    g.capsule((-14, -8, 8), (-14, 8, 8), 1.8).capsule((14, -8, 8), (14, 8, 8), 1.8)
    rig.part("mount", g, WOOD)
    g = Geo().capsule((0, -10, 36), (0, 10, 36), 1.8)
    rig.part("mount", g, IRON, finish="metal", outline=0.5)
    pennant(rig, "mount", -18, 8, 7, h=34)
    rig.joint("arm", "head", (0, 0, 36))
    g = Geo().capsule((-14, 0, 36), (30, 0, 36), 2.2, 1.4)
    rig.part("arm", g, WOOD_DK)
    g = Geo()
    box(g, (-17, 0, 30), (6, 5.5, 6), p=5)
    rig.part("arm", g, STONE_DK)
    g = Geo()
    box(g, (-17, -5.8, 30), (4, 0.6, 4), p=4, cuts=2)
    rig.part("arm", g, team=True, outline=0.4)
    g = Geo()
    rope(g, [(30, 0, 36), (32, -1, 30), (31, -1, 25)], 0.6)
    rig.part("arm", g, ROPE, outline=0)
    rig.joint("stone", "arm", (31, -1, 23))
    g = Geo().sphere((31, -1, 23), 3.8, cuts=3)
    rig.part("stone", g, STONE)


def trebuchet_idle(f):
    return {"arm": {"r": -18.0 + 1.5 * math.sin(f / 4 * 2 * math.pi)}}


def trebuchet_fire(f):
    return {"arm": {"r": [-24, 70, 96, 40, -8][f]}, "stone": {"hide": f in (1, 2, 3)}}


# -- Honk Ballista: a big ballista loaded with an angry goose --------------------------------------
def honk_build(rig):
    stone_plinth(rig, r=16, h=9)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 18), 4, bevel=0.5)
    rig.part("mount", g, WOOD_DK)
    pennant(rig, "mount", -14, 6, 9, h=26)
    g = Geo()
    box(g, (4, 0, 21), (20, 4, 2.6), p=5)
    rig.part("head", g, WOOD)
    g = Geo()
    box(g, (-13, 0, 21), (5, 4.4, 4), p=5)
    rig.part("head", g, team=True)
    rig.joint("limbs", "head", (16, 0, 22))
    g = Geo()
    for s in (-1, 1):
        g.capsule((16, 0, 22), (10, s * 20, 24), 2.2, 1.4)
    rig.part("limbs", g, WOOD_DK)
    g = Geo()
    box(g, (16, 0, 22), (2.8, 4.4, 2.8), p=4, cuts=2)
    rig.part("limbs", g, GOLD, finish="metal", outline=0.5)
    rig.joint("string", "head", (0, 0, 24))
    g = Geo()
    for s in (-1, 1):
        g.capsule((10, s * 20, 24), (-2, 0, 24.5), 0.5)
    rig.part("string", g, ROPE, outline=0)
    # the goose, sitting in the groove, beak forward
    rig.joint("goose", "head", (6, 0, 28))
    g = Geo().blob((4, 0, 28), (9, 6, 5.5), p=2.1, taper=(1.0, 0.9))
    rig.part("goose", g, GOOSE)
    g = Geo().capsule((11, 0, 30), (15, 0, 38), 2.6, 2.2)
    g.sphere((16, 0, 39.5), 3.6, cuts=3)
    rig.part("goose", g, GOOSE)
    g = Geo().blob((-2, -3, 30), (5, 3, 3), p=2.0, rot=(0, -20, 0))
    rig.part("goose", g, GOOSE_DK)
    g = Geo().lathe([(2.0, 0), (1.0, 3.5), (0.1, 5.6)], (18.5, 0, 39), (24.5, 0, 38.4), segs=10, squash=(0.8, 1.0))
    rig.part("goose", g, BEAK, outline=0.5)
    g = Geo().blob((17.2, -3.2, 41), (1.4, 0.8, 1.5), p=2.0)
    rig.part("goose", g, "#221C19", outline=0)
    g = Geo().blob((16.6, -3.4, 43), (2.8, 1.0, 0.9), p=2.0, rot=(0, -25, 0))
    rig.part("goose", g, "#221C19", outline=0)


def honk_idle(f):
    w = math.sin(f / 4 * 2 * math.pi)
    return {"goose": {"r": 3 * w, "sz": 1 + 0.03 * w}}


def honk_fire(f):
    return {"string": {"x": [-2, 12, 10, 4, 0][f]}, "limbs": {"sy": [0.94, 1.1, 1.03, 1.0, 1.0][f]},
            "goose": {"x": [-2, 18, 0, 0, 0][f], "hide": f in (1, 2), "s": 0.3 if f == 3 else 1.0},
            "head": {"x": [0, -3, -2, -1, 0][f]}}


TURRETS = [
    turret_module("crossbow_nest", "Crossbow Nest", "medieval", 40, CANVAS, FEET, (0, 24), (24, 0, 28.5), crossbow_build,
                  crossbow_idle, crossbow_fire, fire_kind="recoil"),
    turret_module("pitch_cauldron", "Pitch Cauldron", "medieval", 46, CANVAS, FEET, (0, 30), (16, -1, 28), cauldron_build,
                  cauldron_idle, cauldron_fire, aim=(0, 20), fire_kind="pour"),
    turret_module("trebuchet", "Trebuchet", "medieval", 50, CANVAS, FEET, (0, 36), (31, -1, 23), trebuchet_build,
                  trebuchet_idle, trebuchet_fire, aim=(0, 0), fire_kind="swing", muzzle_joint="stone"),
    turret_module("honk_ballista", "Honk Ballista", "medieval", 46, CANVAS, FEET, (0, 21), (22, 0, 36), honk_build,
                  honk_idle, honk_fire, fire_kind="recoil"),
]
