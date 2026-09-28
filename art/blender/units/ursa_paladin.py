"""Ursa Paladin: Medieval Age Legendary siege heavy (DESIGN A5.3). Cleave, Roar, ~190 lu.

Look (A11 rider rig, Legendary scale): a huge brown war bear in a team barding with a
parchment hem and gold studs, a steel chanfron on its brow, a cream muzzle, angry brows and
a roaring jaw, carrying a paladin (1.5x) in bright steel plate with a team tabard, a great
helm with a gold crown crest, glowing eye slits and a team plume, and a wine cape. The
paladin swings an oversized gold-banded warhammer (cleave) in the near hand and holds a tall
team war banner in the far hand. Plume, cape, banner and the bear's tail follow through.
The attack: the bear rears and the paladin hauls the hammer overhead (held), the bear
slams its forepaws down with a roar as the hammer smashes in front of its muzzle (smear,
held impact), then both recover.

Rendered at 1.25x (Legendary size budget, SPIKE_REPORT section 5).
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "ursa_paladin"
NAME = "Ursa Paladin"
HEIGHT_LU = 190
YAW_DEG = -10.0
SHEET_SCALE = 1.25   # render this unit with --scale 1.25 (Legendary budget)
CANVAS = (476, 484)
FEET = (206, 444)
ANCHORS = {"head": (10, 186), "hitCenter": (0, 80)}

FUR = "#7B6453"
FUR_DARK = "#5A493E"
MUZZLE = "#D9C7AE"
NOSE = "#2B2522"
MOUTH = "#5A2231"
TOOTH = "#F4EEDC"
CLAW = "#E8DFC8"
EYE = "#FAF6EE"
PUPIL = "#221C19"
STEEL = "#B7C0CA"
STEEL_DARK = "#6B7682"
DARK = "#23262E"
WINE = "#8E2A4A"
PARCH = "#E8DFC8"
GOLD = "#D4A437"
POLE = "#6B5647"

P = (-4.0, 0.0, 104.0)      # the paladin's seat (rider pivot, scale 1.5)
RS = 1.5


def R(x, y, z):
    """Rider-local point (a 68 lu biped with its hips at the origin) to character space;
    parts are built unscaled around P and the rider joint scales them by RS."""
    return (P[0] + x, P[1] + y, P[2] + z)


# weapon joints sit at the rider's hands, modelled pointing up (rest direction 90)
HAMMER = 32.0     # haft length to the head centre (rider units)
SMEAR = {"joint": "hand_r", "inner": R(0, -12.5, 5 + HAMMER - 7), "outer": R(0, -12.5, 5 + HAMMER + 9),
         "color": STEEL, "taper": 0.5, "start": 0.3, "behind": 8.0}


def _bear_leg(rig, name, x, y, front):
    rig.joint(name, "bear", (x, y, 70))
    x2 = x + (3 if front else -2)
    rig.joint(f"{name}2", name, (x2, y, 36))
    g = Geo().capsule((x, y, 72), (x2, y, 36), 14.5 if front else 16.0, 11.0)
    rig.part(name, g, FUR, finish="hair")
    g = Geo().capsule((x2, y, 36), (x2 + 1, y, 9), 11.0, 10.0)
    g.blob((x2 + 4, y, 6.0), (14.0, 11.0, 6.6), p=2.4, taper=(1.05, 0.9))   # paw
    rig.part(f"{name}2", g, FUR, finish="hair")
    g = Geo()
    for dy in (-5.5, 0.0, 5.5):
        g.lathe([(2.2, 0), (1.6, 2.5), (0, 5.5)], (x2 + 15.5, y + dy, 4.0), (x2 + 20.5, y + dy, 1.5), segs=8)
    rig.part(f"{name}2", g, CLAW, outline=0.8)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("bear", "body", (0, 0, 72))
    # far legs first
    _bear_leg(rig, "leg_fl", 34, 15, True)
    _bear_leg(rig, "leg_bl", -34, 15, False)
    _bear_leg(rig, "leg_fr", 34, -15, True)
    _bear_leg(rig, "leg_br", -34, -15, False)

    # barrel with a shoulder hump, stub tail
    g = Geo().blob((-2, 0, 74), (52, 29, 31), p=2.3, taper=(0.92, 1.0))
    g.blob((26, 0, 88), (26, 25, 22), p=2.2)
    rig.part("bear", g, FUR, finish="hair")
    rig.secondary("tail", "bear", (-52, 0, 82), (-60, 0, 76), max_deg=18, gain=1.0)
    g = Geo().blob((-56, 0, 80), (7, 6, 6), p=2.2)
    rig.part("tail", g, FUR_DARK, finish="hair")
    # team barding over the back with a parchment hem, gold studs and a wine saddle
    g = Geo().blob((-6, 0, 80), (44, 31.5, 27), p=2.6, taper=(1.05, 0.92))
    g.clip((0, 0, 60), (0, 0, -1))
    rig.part("bear", g, team=True)
    g = Geo().blob((-6, 0, 61.2), (44.8, 32.2, 2.6), p=3.0)
    g.clip((0, 0, 59.0), (0, 0, -1))
    rig.part("bear", g, PARCH)
    g = Geo()
    for x in (-38, -22, -6, 10, 26):
        g.sphere((x * 1.0, -32.6, 63.0), 1.9, cuts=3)
    rig.part("bear", g, GOLD, finish="metal", outline=0.8)
    g = Geo().blob((-4, 0, 104), (17, 15, 5), p=2.6).blob((-19, 0, 108), (4, 13, 6), p=2.4)
    rig.part("bear", g, WINE)

    # head: neck joint, a big round head with small ears, cream muzzle, steel chanfron,
    # angry brows and a jaw that drops for the roar
    rig.joint("neck", "bear", (44, 0, 88))
    rig.joint("bhead", "neck", (58, 0, 88))
    g = Geo().capsule((40, 0, 84), (58, 0, 88), 20, 17)
    rig.part("neck", g, FUR, finish="hair")
    g = Geo().blob((68, 0, 90), (19.5, 18.5, 17.5), p=2.2)
    for sgn in (-1, 1):
        g.blob((60, sgn * 13.5, 105.5), (5.6, 3.6, 5.6), p=2.2)
    rig.part("bhead", g, FUR, finish="hair")
    g = Geo()
    for sgn in (-1, 1):
        g.blob((61, sgn * 13.5 - sgn * 1.2 - 1.2, 105.0), (3.2, 1.6, 3.2), p=2.2)
    rig.part("bhead", g, MUZZLE, outline=0.6)
    g = Geo().blob((85, 0, 84), (12.5, 11.0, 9.5), p=2.2)
    rig.part("bhead", g, MUZZLE)
    g = Geo().blob((96.5, -1, 87.5), (4.4, 5.6, 3.6), p=2.2)
    rig.part("bhead", g, NOSE, finish="gloss", outline=0.8)
    g = Geo().blob((68, 0, 104.5), (15.5, 16.0, 6.5), p=2.6, rot=(0, 12, 0))
    g.clip((0, 0, 99.0), (0, 0, -1))
    rig.part("bhead", g, STEEL, finish="metal")
    g = Geo().capsule((58, 0, 108.8), (82, 0, 101.5), 1.8)
    rig.part("bhead", g, GOLD, finish="metal", outline=0.8)
    for y in (-10.0, 7.0):
        g = Geo().blob((80.5, y, 94.5), (3.4, 3.2, 3.6))
        rig.part("bhead", g, EYE, highlight=False)
        g = Geo().blob((83.4, y - 0.6, 94.2), (1.4, 1.9, 2.0))
        rig.part("bhead", g, PUPIL, outline=0)
    g = Geo().capsule((77, -15.5, 101.5), (83.5, -3.0, 98.0), 2.2, 1.8)
    g.capsule((83.5, 2.0, 98.0), (79, 12.5, 101.0), 1.8, 2.2)
    rig.part("bhead", g, FUR_DARK, finish="hair")
    rig.joint("jaw", "bhead", (74, 0, 80))
    g = Geo().blob((84, 0, 75.5), (11.5, 9.2, 4.2), p=2.3, rot=(0, 6, 0))
    rig.part("jaw", g, MUZZLE)
    g = Geo().blob((84, 0, 79.0), (10.5, 8.0, 2.8), p=2.4)
    rig.part("jaw", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    for dy in (-5.0, 5.0):
        g.lathe([(1.6, 0), (0, 3.2)], (92, dy, 78.5), (92, dy, 81.7), segs=8)
        g.lathe([(1.6, 0), (0, 3.2)], (92, dy, 83.5), (92, dy, 80.3), segs=8)
    rig.part("jaw", g, TOOTH, outline=0.5)
    rig.track("_foot", "leg_fr2", (38, -15, 0.5))

    # -- the paladin (built in rider units around P, scaled 1.5 by the rider joint) --------
    rig.joint("rider", "bear", P, scale=RS)
    rig.joint("torso", "rider", R(0, 0, 1))
    rig.joint("head", "torso", R(1, 0, 23))
    # legs astride: the near leg shows in front of the barding
    for s, y in (("r", -10.5), ("l", 10.5)):
        g = Geo().capsule(R(0, y * 0.8, 1), R(10, y, -6), 5.2, 4.6).capsule(R(10, y, -6), R(9, y, -18), 4.6, 4.2)
        g.blob(R(11.5, y, -20.5), (6.5, 4.6, 3.4), p=2.8)
        rig.part("rider", g, STEEL, finish="metal")
        g = Geo().blob(R(10, y * 1.02, -6), (4.6, 4.8, 4.6), p=2.4)
        rig.part("rider", g, GOLD, finish="metal", outline=0.6)
    # cape from the shoulders (follow-through)
    rig.secondary("cape", "torso", R(-6, 0, 20), R(-18, 0, -4), max_deg=14, gain=1.0)
    g = Geo().blob(R(-10, 0, 8), (5.5, 13.5, 14.5), p=2.4, taper=(1.35, 0.9), rot=(0, -26, 0))
    rig.part("cape", g, WINE)
    # torso: steel plate, team tabard with a parchment cross, gold belt
    g = Geo().blob(R(0, 0, 12), (9.8, 10.4, 11.6), p=2.4, taper=(0.95, 1.08))
    rig.part("torso", g, STEEL, finish="metal")
    g = Geo().blob(R(0.6, 0, 7.8), (10.6, 11.2, 9.8), p=2.8, taper=(1.12, 0.94))
    g.clip(R(0, 0, 16.5), (0, 0, 1))
    rig.part("torso", g, team=True)
    g = Geo().capsule(R(10.8, -2.8, 13.5), R(11.2, -2.8, 3.0), 1.3).capsule(R(10.9, -7.2, 9.6), R(10.9, 1.8, 9.6), 1.3)
    rig.part("torso", g, PARCH, outline=0.6)
    g = Geo().blob(R(0.5, 0, 1.4), (10.8, 11.4, 1.8), p=3.2)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    for s, y in (("r", -11.5), ("l", 11.5)):
        g = Geo().blob(R(0, y, 21.5), (7.2, 6.0, 5.6), p=2.4)
        rig.part("torso", g, STEEL, finish="metal")
    # great helm with a gold crown crest, eye slit with glowing eyes, team plume
    g = Geo().blob(R(1.5, 0, 33), (10.0, 9.8, 11.2), p=3.0, taper=(1.05, 0.92))
    rig.part("head", g, STEEL, finish="metal")
    g = Geo().capsule(R(11.0, 4.0, 34.5), R(10.9, -4.5, 34.5), 1.7).capsule(R(10.9, -4.5, 34.5), R(8.0, -9.4, 34.5), 1.7)
    rig.part("head", g, DARK, outline=0)
    g = Geo().sphere(R(11.4, -3.4, 34.6), 1.25, cuts=3).sphere(R(10.2, -7.4, 34.6), 1.25, cuts=3)
    rig.part("head", g, glow="#FFFFFF", outline=0)
    g = Geo().capsule(R(11.3, -1.0, 43.5), R(11.5, -1.0, 37.0), 1.1).capsule(R(11.4, -1.0, 32.5), R(11.5, -1.0, 26.5), 1.1)
    for k in range(5):   # crown points
        a = math.radians(-60 + 30 * k)
        g.lathe([(1.8, 0), (0, 4.2)], R(1.5 + 9.2 * math.cos(a), 9.0 * math.sin(a), 42.0),
                R(1.5 + 9.2 * math.cos(a), 9.0 * math.sin(a), 46.5), segs=8)
    g.lathe([(9.9, -1.2), (10.3, 0), (9.9, 1.2)], R(1.5, 0, 42.2), R(1.5, 0, 43.2), segs=24, squash=(1.0, 0.97))
    rig.part("head", g, GOLD, finish="metal", outline=0.8)
    rig.secondary("plume", "head", R(-2, 0, 45), R(-20, 0, 42), max_deg=12, gain=1.0)
    g = Geo()
    for x, z, r in ((-1, 46, 4.6), (-5, 50, 5.4), (-10.5, 51.5, 5.2), (-16, 49.5, 4.6), (-20, 45, 3.8),
                    (-22, 40, 3.0)):
        g.blob(R(x, 0, z), (r * 1.15, r * 0.9, r), p=2.1)
    rig.part("plume", g, team=True)

    # arms (rest hanging): far arm holds the banner, near arm the warhammer
    for s, y in (("r", -12.5), ("l", 12.0)):
        rig.joint(f"arm_{s}", "torso", R(0, y, 20))
        rig.joint(f"fore_{s}", f"arm_{s}", R(0, y, 12))
        rig.joint(f"hand_{s}", f"fore_{s}", R(0, y, 5))
        g = Geo().capsule(R(0, y, 20), R(0, y, 12), 4.4, 4.0)
        rig.part(f"arm_{s}", g, STEEL, finish="metal")
        g = Geo().capsule(R(0, y, 12), R(0, y, 7), 4.0, 3.8).blob(R(0, y, 7.6), (4.8, 4.8, 2.0), p=2.6)
        rig.part(f"fore_{s}", g, STEEL, finish="metal")
        g = Geo().blob(R(0.4, y, 4.6), (4.4, 4.2, 4.4), p=2.4)
        rig.part(f"hand_{s}", g, STEEL_DARK, finish="metal")

    # banner on a tall pole in the far hand; the cloth hangs back from the top and swings
    x, y, z = R(0, 12.0, 5)
    g = Geo().capsule((x, y, z - 22), (x, y, z + 66), 1.4)
    rig.part("hand_l", g, POLE, outline=0.8)
    g = Geo().lathe([(0, 0), (2.8, 1.5), (0, 7.0)], (x, y, z + 66), (x, y, z + 74), segs=10)
    rig.part("hand_l", g, GOLD, finish="metal", outline=0.8)
    g = Geo().capsule((x - 1, y, z + 62), (x - 23, y, z + 62), 1.2)
    rig.part("hand_l", g, POLE, outline=0.8)
    rig.secondary("banner", "hand_l", (x - 1, y, z + 62), (x - 12, y, z + 34), max_deg=10, gain=1.0)
    pts = [(-1, 62), (-23, 62), (-23, 32), (-17, 36), (-12, 30), (-7, 36), (-1, 32)]
    g = Geo().slab([(x + px, z + pz) for px, pz in pts], y - 0.5, 1.4)
    rig.part("banner", g, team=True, outline=0.8)
    g = Geo().blob((x - 12, y - 1.8, z + 49), (5.8, 0.8, 5.8), p=2.0)
    rig.part("banner", g, PARCH, outline=0.6)
    g = Geo()
    for dx, dz, r in ((-12, 47.2, 2.3), (-15.6, 51.8, 1.2), (-13.2, 53.2, 1.2), (-10.6, 53.2, 1.2), (-8.4, 51.8, 1.2)):
        g.blob((x + dx, y - 2.6, z + dz), (r, 0.6, r), p=2.0)
    rig.part("banner", g, FUR_DARK, outline=0)   # a bear paw emblem

    # the warhammer in the near hand: a long haft, a big steel head with gold bands and a spike
    x, y, z = R(0, -12.5, 5)
    g = Geo().capsule((x, y - 1, z - 9), (x, y - 1, z + HAMMER - 4), 1.8)
    rig.part("hand_r", g, POLE, outline=0.8)
    g = Geo().sphere((x, y - 1, z - 10), 2.4, cuts=3)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.8)
    hz = z + HAMMER
    g = Geo().blob((x, y - 1, hz), (10.0, 6.4, 6.8), p=3.6)
    g.lathe([(0, 0), (3.8, 1.0), (0, 8.0)], (x + 9.0, y - 1, hz), (x + 17.0, y - 1, hz), segs=10)
    g.lathe([(0, 0), (3.2, 1.0), (0, 6.0)], (x, y - 1, hz + 6.0), (x, y - 1, hz + 12.0), segs=10)
    rig.part("hand_r", g, STEEL, finish="metal")
    g = Geo()
    for dx in (-6.5, 6.5):
        g.blob((x + dx, y - 1, hz), (1.4, 6.9, 7.3), p=3.0)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.8)
    rig.track("hammerHead", "hand_r", (x, y - 1, hz))


# -- poses ---------------------------------------------------------------------------------
def hammer(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


def banner(a, f, w=90.0):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(hammer(-40, 30, 62), banner(-50, 20, 94), {"torso": {"r": -3}})


def _banner_hang(pose):
    # keep the banner cloth hanging down whatever the pole does
    chain = sum(pose.get(j, {}).get("r", 0.0) for j in ("body", "bear", "rider", "torso", "arm_l", "fore_l", "hand_l"))
    pose.setdefault("banner", {})["r"] = pose.get("banner", {}).get("r", 0.0) - chain
    return pose


def _idle(f):
    c, lag = B.idle_wave(f)
    return _banner_hang(merge(STANCE, {
        "bear": {"z": 1.6 * c},
        "body": squash(0.025 * c),
        "neck": {"r": -3.0 * lag}, "bhead": {"r": 2.5 * lag},
        "rider": {"z": 1.0 * lag},
        "torso": {"r": 1.2 * lag},
        "head": {"r": -1.5 * lag},
        "arm_r": {"r": 2.5 * lag}, "hand_r": {"r": -3 * lag},
        "leg_fr": {"r": 1.0 * c}, "leg_br": {"r": -1.0 * c},
    }))


def _walk(f):
    # a heavy bear walk: diagonal pairs, 0.88 s per cycle, big shoulder roll and head nod
    p = 2 * math.pi * f / 8
    s = math.sin(p)
    c = math.cos(p)
    bob = -2.2 * math.cos(2 * p)
    lagp = 2 * (p - 2 * math.pi / 8)
    up = lambda v: max(0.0, v)
    return _banner_hang(merge(STANCE, {
        "bear": {"z": bob - 0.6, "r": 1.4 * s},
        # swing kept short so the paws plant at the sim speed (55 lu/s, playback ~1x)
        "leg_fr": {"r": 9 * s}, "leg_fr2": {"r": -30 * up(c)},
        "leg_bl": {"r": 8 * s}, "leg_bl2": {"r": 22 * up(-c)},
        "leg_fl": {"r": -9 * s}, "leg_fl2": {"r": -30 * up(-c)},
        "leg_br": {"r": -8 * s}, "leg_br2": {"r": 22 * up(c)},
        "neck": {"r": -5 * math.cos(2 * p)}, "bhead": {"r": 3 * math.cos(2 * p)},
        "rider": {"z": -1.3 * math.cos(lagp)},
        "torso": {"r": -1.5 * math.cos(lagp)},
        "hand_r": {"r": 3 * math.cos(lagp)},
        "arm_l": {"r": 2 * math.cos(lagp)},
    }))


def _attack(f):
    # 0-1 the bear rears and the paladin hauls the hammer back (squash), 2 held extreme,
    # 3 smear, 4 held impact: forepaws slam, roar, hammer down in front of the muzzle,
    # 5-7 recovery. See fx.MELEE_MS. Arm, hammer and banner angles are given on screen
    # and converted to torso space.
    sq = pick(f, [-0.04, -0.08, 0.05, 0.03, -0.12, -0.06, -0.02, 0.0])
    br = pick(f, [4, 9, 12, 0, -6, -4, -1, 0])
    tr = pick(f, [6, 12, 16, -8, -20, -16, -8, -3])
    k = br + tr
    pose = merge(
        hammer(pick(f, [70, 110, 128, 50, -12, -14, -10, -43]) - k,
               pick(f, [120, 150, 170, 40, -16, -18, 0, 27]) - k,
               pick(f, [160, 195, 215, 60, -24, -20, 10, 59]) - k),
        banner(pick(f, [-40, -34, -30, -46, -56, -54, -52, -53]) - k,
               pick(f, [30, 36, 40, 24, 16, 16, 18, 17]) - k,
               pick(f, [98, 102, 104, 94, 88, 89, 91, 91]) - k), {
            "body": dict(squash(sq), x=pick(f, [-1, -3, -4, 3, 8, 7, 3, 0])),
            "bear": {"r": br, "z": pick(f, [0, 2, 3, 0, -3, -2, -1, 0])},
            "leg_fr": {"r": pick(f, [10, 24, 34, 0, -14, -10, -4, 0])},
            "leg_fr2": {"r": pick(f, [-16, -40, -55, -16, -4, -2, 0, 0])},
            "leg_fl": {"r": pick(f, [6, 16, 26, 10, 12, 8, 2, 0])},
            "leg_fl2": {"r": pick(f, [-12, -34, -44, -30, -18, -10, -4, 0])},
            "leg_br": {"r": pick(f, [4, 8, 12, -4, -12, -8, -3, 0])},
            "leg_bl": {"r": pick(f, [2, 5, 8, -3, -8, -5, -2, 0])},
            "neck": {"r": pick(f, [4, 8, 10, -4, -14, -10, -4, 0])},
            "bhead": {"r": pick(f, [-4, -8, -10, 4, 12, 9, 3, 0])},
            "jaw": {"r": pick(f, [-4, -10, -14, -20, -26, -20, -8, 0])},
            "torso": {"r": tr},
            "head": {"r": pick(f, [2, 4, 6, -4, -8, -6, -2, 0])},
        })
    if f == 3:
        pose["hand_r"]["sz"] = 1.15
    return _banner_hang(pose)


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return _banner_hang(merge(STANCE, {
        "body": dict(squash(-0.06 * a), x=-4.0 * a),
        "bear": {"r": 4 * a},
        "neck": {"r": 10 * a}, "bhead": {"r": -6 * a}, "jaw": {"r": -8 * a},
        "torso": {"r": 10 * a}, "head": {"r": 6 * a},
        "arm_r": {"r": 12 * a},
    }))


def _die(f):
    # a Legendary topples: fling, squash, hand-off (fx.dust_poof and fx.ko_stars)
    body = [{"x": 2.0, "z": 5.0, "r": 8.0, "sz": 1.08, "sx": 0.95, "sy": 0.95},
            {"x": -2.0, "z": 0.0, "r": 5.0, "sz": 0.74, "sx": 1.14, "sy": 1.14},
            {"x": -2.0, "z": 0.0, "r": 3.0, "s": 0.85, "sz": 0.55, "sx": 1.2, "sy": 1.2}][f]
    return _banner_hang(merge(STANCE, {"body": body}, {
        "bear": {"r": pick(f, [8, 3, 1])},
        "neck": {"r": pick(f, [18, 10, 10])}, "bhead": {"r": -8}, "jaw": {"r": pick(f, [-20, -10, -6])},
        "leg_fr": {"r": pick(f, [34, 18, 18])}, "leg_fl": {"r": pick(f, [26, 14, 14])},
        "torso": {"r": pick(f, [12, 6, 6])}, "arm_r": {"r": pick(f, [40, 20, 20])},
        "arm_l": {"r": pick(f, [-16, -10, -10])},
    }))


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=110),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
