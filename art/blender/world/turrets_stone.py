"""Stone Age turrets (DESIGN A5.2, A14.2): Rock Tosser, Angry Beehive, Log Roller, Grumpy Toad.

Each is a turret_module (world/common.py): a static footing (`mount`) and a head that aims
about its pivot; `fire` has a per-frame muzzle anchor where the projectile leaves.
"""
import math

from ageborn_art import face as F
from ageborn_art.geometry import Geo

from world.common import box, cyl, muzzle_flash, pennant, rock, rope, smoke_puff, turret_module

STONE = "#8C7B68"
STONE_LT = "#A08E78"
STONE_DK = "#6E6254"
WOOD = "#857058"
WOOD_DK = "#5C4C3E"
BARK = "#6A5A4A"
ROPE = "#C2AE86"
BONE = "#EDE3C8"
MOSS = "#6E8B3D"
HIVE = "#CDB98A"
HIVE_DK = "#A8966C"
BEE = "#D6C284"
BEE_DK = "#3A3230"
TOAD = "#7E9A5A"
TOAD_LT = "#B8C88E"
TOAD_DK = "#5D7443"
MOUTH = "#5A2A34"
EYE = "#F4EEDC"
PUPIL = "#221C19"

CANVAS = (250, 210)
FEET = (95, 175)


def stone_footing(rig, r=17.0, h=8.0, seed=1):
    g = Geo()
    rock(g, (0, 2, h * 0.5), (r, r * 0.8, h * 0.62), seed=seed, jag=0.1, p=2.8)
    rig.part("mount", g, STONE_LT)
    g = Geo()
    rock(g, (-r * 0.7, -r * 0.5, 2.5), (5, 4, 3.4), seed=seed + 5, jag=0.2)
    rock(g, (r * 0.75, -r * 0.4, 2), (4, 3.4, 2.8), seed=seed + 6, jag=0.2)
    rig.part("mount", g, STONE_DK)


# -- Rock Tosser: a log catapult ------------------------------------------------------------------
def rock_tosser_build(rig):
    stone_footing(rig, seed=2)
    g = Geo()
    for y in (-8, 8):
        g.capsule((-12, y, 6), (0, y, 24), 2.8, 2.4)
        g.capsule((12, y, 6), (0, y, 24), 2.8, 2.4)
    rig.part("mount", g, BARK)
    g = Geo().capsule((0, -10, 22), (0, 10, 22), 2.2)
    rig.part("mount", g, WOOD_DK, outline=0.6)
    g = Geo()
    rope(g, [(-7, -9.5, 14), (7, -9.5, 14)], 1.0)
    rig.part("mount", g, ROPE, outline=0.4)
    pennant(rig, "mount", -14, 6, 6, h=30)
    # the arm (head pivot at the axle), modelled pointing up-back at rest
    rig.joint("arm", "head", (0, 0, 22))
    g = Geo().capsule((0, 0, 22), (-2, 0, 50), 2.6, 2.0)
    rig.part("arm", g, WOOD)
    g = Geo().lathe([(0, 0), (6.5, 1.2), (7.5, 5), (6.5, 6.2), (0, 3)], (-2.5, 0, 48), (-2.5, 0, 55), segs=14)
    rig.part("arm", g, WOOD_DK)
    g = Geo()
    rope(g, [(-1.2, -2.6, 30), (-1.6, -2.6, 36), (-1.2, -2.6, 42)], 0.9)
    rig.part("arm", g, ROPE, outline=0.4)
    rig.joint("boulder", "arm", (-2.5, 0, 57))
    g = Geo()
    rock(g, (-2.5, 0, 57), (5.4, 5, 5), seed=7, jag=0.15)
    rig.part("boulder", g, STONE)
    smoke_puff(rig, "head", (14, 0, 48), 0.8, name="dust")


def rock_tosser_idle(f):
    # 6-frame loop: the arm creaks back and forth, the loaded boulder wobbles in its cup
    w = math.sin(f / 6 * 2 * math.pi)
    return {"arm": {"r": 42.0 + 3.0 * w, "sz": 1.0 - 0.02 * math.cos(f / 6 * 2 * math.pi)},
            "boulder": {"r": 14 * math.sin(f / 6 * 4 * math.pi), "z": 0.8 * max(0.0, -w)}}


def rock_tosser_fire(f):
    # 0 cranked far back (anticipation: the arm bends), 1 release (the arm whips, smear),
    # 2 overshoot, 3 bounce back, 4 reloaded and returning
    table = [(66, True, 0.9), (-28, False, 1.08), (-50, False, 1.0), (-14, False, 1.0), (30, True, 1.0)]
    a, loaded, sz = table[f]
    return {"arm": {"r": a, "sz": sz}, "boulder": {"hide": not loaded, "s": 0.6 if f == 4 else 1.0},
            "dust": {"show": f in (1, 2), "s": 1.3 if f == 1 else 1.0}}


ROCK_TOSSER_OVERLAYS = {"fire": {1: [{"kind": "arc", "joint": "arm", "inner": (-1.5, 0, 38), "outer": (-2.5, 0, 58),
                                      "color": WOOD, "taper": 0.2, "t0": 0.0, "t1": 0.85, "lines": 3}]}}


# -- Angry Beehive: a hive hanging from a branch on a stump ----------------------------------------
def beehive_build(rig):
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 14), 13, 11, bevel=1.4, segs=16)
    rig.part("mount", g, BARK)
    g = Geo()
    cyl(g, (0, 0, 13), (0, 0, 15), 10.5, bevel=0.5, segs=16)
    rig.part("mount", g, WOOD)
    g = Geo().capsule((-6, 0, 13), (-2, 0, 44), 3.2, 2.2).capsule((-3, 0, 42), (14, 0, 46), 2.2, 1.4)
    rig.part("mount", g, BARK)
    g = Geo()
    for dx, dz in ((10, 48), (15, 44)):
        g.blob((dx, -1, dz), (3.6, 1.2, 2.2), p=2.0, rot=(0, 30, 0))
    rig.part("mount", g, MOSS, outline=0.5)
    pennant(rig, "mount", -11, 4, 12, h=26)
    # head: the hive swings from the branch
    prof = [(0, 0), (6, 0.5), (9.5, 3.5), (10.5, 8), (10, 13), (8, 17), (4.5, 20), (0, 21)]
    g = Geo().lathe(prof, (8, 0, 22), (8, 0, 43), segs=18)
    rig.part("head", g, HIVE)
    g = Geo()
    for z in (26.5, 31.5, 36.5):
        k = 1.0 - abs(z - 31) / 22
        cyl(g, (8, 0, z - 0.8), (8, 0, z + 0.8), 10.8 * k + 0.2, bevel=0.3, segs=18)
    rig.part("head", g, HIVE_DK, outline=0.4)
    g = Geo()
    cyl(g, (8, 0, 32.8), (8, 0, 34.6), 10.9, bevel=0.3, segs=18)
    rig.part("head", g, team=True, outline=0.4)
    # the entrance is its mouth (it gapes on fire); an angry face above it
    rig.joint("hole", "head", (13, -8.5, 28))
    g = Geo().blob((13, -8.5, 28), (3.4, 1.4, 2.8), p=2.0)
    rig.part("hole", g, BEE_DK, outline=0, highlight=False)
    hive = Geo().lathe(prof, (8, 0, 22), (8, 0, 43), segs=18)
    face = F.Face(rig, "head", [hive])
    hive.bm.free()
    g = Geo()
    for x, z in ((9.0, 38.0), (15.4, 37.6)):
        face.decal(g, face.hit(x, z), F.ellipse(0, 0, 2.3, 2.8, 14), 0.4)
    rig.part("head", g, EYE, highlight=False, outline=0)
    rig.joint("pupils", "head", (12, -10, 38))
    g = Geo()
    for x, z in ((9.0, 38.0), (15.4, 37.6)):
        face.decal(g, face.hit(x, z) - face.view * 0.3, F.ellipse(0.8, -0.4, 1.3, 1.6, 10), 0.4)
    rig.part("pupils", g, PUPIL, highlight=False, outline=0)
    rig.joint("brows", "head", (12, -10, 41))
    g = Geo()
    for (x, z), d in (((9.0, 41.4), 1), ((15.4, 41.0), -1)):
        face.stroke(g, face.hit(x, z) - face.view * 0.4, [(-2.4 * d, 1.1), (2.0 * d, -0.9)], 1.4, 0.4)
    rig.part("brows", g, BEE_DK, highlight=False, outline=0)
    for i, (x, z) in enumerate(((22, 40), (-4, 34), (20, 22))):
        rig.joint(f"bee{i}", "head", (x, -10, z))
        g = Geo().blob((x, -10, z), (2.6, 2.0, 2.0), p=2.0)
        rig.part(f"bee{i}", g, BEE, outline=0.5)
        g = Geo().blob((x - 0.8, -10.5, z), (0.8, 2.1, 2.1), p=2.0)
        rig.part(f"bee{i}", g, BEE_DK, outline=0)
        g = Geo().blob((x, -9.4, z + 2.4), (1.8, 0.6, 1.4), p=2.0)
        rig.part(f"bee{i}", g, "#F4F2EA", outline=0.3)


def beehive_idle(f):
    # 6-frame loop: the bees orbit the hive, it sways and grumbles (brows twitch)
    t = f / 6 * 2 * math.pi
    out = {"head": {"r": 3.0 * math.sin(t)}, "brows": {"z": 0.5 * math.sin(2 * t)},
           "pupils": {"x": 0.4 * math.sin(t)}}
    for i in range(3):
        a = t + i * 2 * math.pi / 3
        out[f"bee{i}"] = {"x": 7 * math.cos(a), "z": 5 * math.sin(a), "y": 3 * math.sin(a)}
    return out


def beehive_fire(f):
    # 0 inhales (squashed, eyes squeezed, brows down), 1 spits the bee stream (stretched, the
    # entrance gapes), 2-4 recover
    sq = [0.12, -0.14, 0.05, -0.02, 0.0][f]
    spread = [0.0, 8.0, 12.0, 6.0, 1.0][f]
    return {"head": {"sz": 1 - sq, "sx": 1 + sq * 0.9, "sy": 1 + sq * 0.9},
            "hole": {"s": [0.7, 1.7, 1.4, 1.1, 1.0][f]},
            "brows": {"z": [-1.2, -0.6, 0.0, 0.0, 0.0][f]},
            "bee0": {"x": spread, "z": spread * 0.4}, "bee1": {"x": spread * 1.4, "z": -spread * 0.3},
            "bee2": {"x": spread * 0.8, "z": -spread * 0.6}}


BEEHIVE_OVERLAYS = {"fire": {1: [{"kind": "burst", "joint": "head", "point": (16, -9, 28), "r0_lu": 5.0, "r1_lu": 9.0,
                                  "n": 3, "a0": -40.0, "arc": 80.0}]}}


# -- Log Roller: a log held on a ramp, cut loose on fire ------------------------------------------
def log_roller_build(rig):
    stone_footing(rig, r=19, h=7, seed=4)
    g = Geo()
    for y in (-9, 9):
        g.capsule((-16, y, 30), (16, y, 8), 2.6, 2.4)
        g.capsule((-14, y, 6), (-14, y, 30), 2.4)
    rig.part("mount", g, BARK)
    g = Geo()
    for k in range(4):
        x = -10 + k * 7.5
        g.capsule((x, -10, 26 - k * 5.1), (x, 10, 26 - k * 5.1), 1.4)
    rig.part("mount", g, WOOD_DK, outline=0.5)
    pennant(rig, "mount", -18, 6, 30, h=20)
    # head (no aim): the log and the stop lever
    rig.joint("log", "head", (-6, 0, 34))
    g = Geo().capsule((-6, -13, 34), (-6, 13, 34), 6.4)
    rig.part("log", g, WOOD)
    g = Geo()
    for y in (-13.6, 13.6):
        cyl(g, (-6, y, 34), (-6, y * 1.03, 34), 5.6, bevel=0.2, segs=16)
    rig.part("log", g, "#C8A884", outline=0.3)
    g = Geo()
    rope(g, [(-6, -8, 40.5), (-6, -8, 27.5)], 0.9)
    rig.part("log", g, ROPE, outline=0.3)
    rig.joint("lever", "head", (4, 0, 26))
    g = Geo().capsule((4, -11, 26), (8, -11, 42), 1.6)
    rig.part("lever", g, WOOD_DK, outline=0.5)
    smoke_puff(rig, "head", (20, 0, 10), 0.7, name="dust")


def log_roller_idle(f):
    # 6-frame loop: the log strains against its rope, jittering; the lever trembles
    t = f / 6 * 2 * math.pi
    return {"log": {"r": 3.0 * math.sin(t), "x": 0.6 * math.sin(3 * t)}, "lever": {"r": 2.0 * math.sin(2 * t)}}


def log_roller_fire(f):
    x = [0, 14, 24, 0, 0][f]
    return {"lever": {"r": [18, -40, -50, -30, 0][f]}, "log": {"x": x - (1.5 if f == 0 else 0), "z": -x * 0.55,
                                                             "r": -x * 6, "hide": f == 2,
                                                             "s": 0.5 if f == 3 else 1.0},
            "dust": {"show": f in (1, 2)}}


# -- Grumpy Toad: a huge toad on a stump; the tongue is fx.tongue --------------------------------
def toad_build(rig):
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 10), 15, 13, bevel=1.4, segs=16)
    rig.part("mount", g, BARK)
    g = Geo()
    cyl(g, (0, 0, 9.4), (0, 0, 11), 12.5, bevel=0.5, segs=16)
    rig.part("mount", g, WOOD)
    g = Geo()
    for dx in (-10, 8):
        g.blob((dx, -8, 11), (5, 3, 2), p=2.0)
    rig.part("mount", g, MOSS, outline=0.5)
    pennant(rig, "mount", -13, 5, 9, h=28)
    # head: the toad (pivot low, so it tilts to aim)
    g = Geo().blob((0, 0, 21), (15, 12, 10.5), p=2.2, taper=(1.0, 0.85))
    rig.part("head", g, TOAD)
    g = Geo().blob((5, -2, 17), (11, 9, 6), p=2.2)
    g.clip((0, 0, 17), (0, 0, 1))
    rig.part("head", g, TOAD_LT)
    g = Geo()
    for dx, dz in ((-6, 27), (2, 29), (-10, 21), (6, 25)):
        g.blob((dx, -10.5, dz), (1.8, 1.0, 1.6), p=2.0)
    rig.part("head", g, TOAD_DK, outline=0)
    for y in (-9, 7):
        g = Geo().blob((-2, y, 13), (5, 4, 3.6), p=2.2)
        rig.part("head", g, TOAD_DK if y > 0 else TOAD)
    # eyes on top
    for y, near in ((-6.5, True), (6.5, False)):
        g = Geo().sphere((7, y, 31), 4.4, cuts=3)
        rig.part("head", g, TOAD if near else TOAD_DK)
        if near:
            g = Geo().blob((9.6, y - 2.5, 32), (2.6, 1.6, 2.4), p=2.0)
            rig.part("head", g, EYE, outline=0.4)
            g = Geo().blob((10.8, y - 3.6, 32), (1.2, 0.8, 1.6), p=2.0)
            rig.part("head", g, PUPIL, outline=0)
            g = Geo().blob((8.6, y - 2, 35.2), (3.8, 1.6, 1.0), p=2.0, rot=(0, 18, 0))
            rig.part("head", g, TOAD_DK, outline=0.4)
    # jaw: opens on fire
    rig.joint("jaw", "head", (-6, 0, 18))
    g = Geo().blob((4, 0, 16.5), (12, 10.4, 3.8), p=2.2)
    g.clip((0, 0, 17.5), (0, 0, 1))
    rig.part("jaw", g, TOAD_LT)
    rig.joint("maw", "head", (4, 0, 18), hidden=True)
    g = Geo().blob((10, -1, 18.5), (6, 8, 3.2), p=2.0)
    rig.part("maw", g, MOUTH, outline=0, highlight=False)
    g = Geo().blob((11, 0, 18.4), (6, 6.4, 2.6), p=2.0)
    rig.part("maw", g, "#C8707E", outline=0)
    # throat sac (puffs up before the tongue lash) and an eyelid for blinks
    rig.joint("sac", "head", (7, -2, 14))
    g = Geo().blob((8, -2, 13.5), (6.4, 7.2, 4.4), p=2.2)
    rig.part("sac", g, TOAD_LT)
    rig.joint("lid", "head", (9.6, -9, 32), hidden=True)
    g = Geo().blob((9.8, -9.3, 32.3), (2.9, 1.9, 2.7), p=2.0)
    rig.part("lid", g, TOAD, outline=0.4)
    # a team bandana
    g = Geo().blob((-6, 0, 22.5), (8.6, 12.6, 2.2), p=2.4, rot=(0, -20, 0))
    rig.part("head", g, team=True, outline=0.5)


def toad_idle(f):
    # 6-frame loop: breathing, the throat sac pulses twice, one blink
    t = f / 6 * 2 * math.pi
    w = math.sin(t)
    return {"head": {"sz": 1 + 0.025 * w, "sx": 1 - 0.02 * w}, "jaw": {"sz": 1 + 0.08 * max(0, w)},
            "sac": {"s": 1.0 + 0.25 * max(0.0, math.sin(2 * t))}, "lid": {"show": f == 4}}


def toad_fire(f):
    # 0 the throat inflates (anticipation), 1 tongue lash (the maw opens, the sac empties), 2-4 recover
    return {"jaw": {"r": [-2, -26, -22, -10, 0][f]}, "maw": {"show": f in (1, 2, 3)},
            "sac": {"s": [1.6, 0.7, 0.85, 1.0, 1.0][f]}, "lid": {"show": f == 0},
            "head": {"sz": [0.9, 1.08, 1.03, 1.0, 1.0][f], "sx": [1.08, 0.95, 0.98, 1.0, 1.0][f], "x": [-1.5, 2, 1, 0, 0][f]}}


TURRETS = [
    turret_module("rock_tosser", "Rock Tosser", "stone", 58, CANVAS, FEET, (0, 22), (-2.5, 0, 57), rock_tosser_build,
                  rock_tosser_idle, rock_tosser_fire, aim=(0, 0), fire_kind="swing", muzzle_joint="boulder",
                  idle_frames=6, overlays=ROCK_TOSSER_OVERLAYS),
    turret_module("angry_beehive", "Angry Beehive", "stone", 50, CANVAS, FEET, (8, 44), (14, -9, 28), beehive_build,
                  beehive_idle, beehive_fire, aim=(0, 0), fire_kind="pulse", idle_frames=6, overlays=BEEHIVE_OVERLAYS),
    turret_module("log_roller", "Log Roller", "stone", 44, CANVAS, FEET, (0, 0), (16, 0, 12), log_roller_build,
                  log_roller_idle, log_roller_fire, aim=(0, 0), fire_kind="release", idle_frames=6),
    turret_module("grumpy_toad", "Grumpy Toad", "stone", 40, CANVAS, FEET, (0, 12), (15, -2, 18.5), toad_build,
                  toad_idle, toad_fire, aim=(-18, 18), fire_kind="tongue", idle_frames=6),
]
