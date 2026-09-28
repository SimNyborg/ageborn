"""Cuirassier: Gunpowder Age heavy (DESIGN A5.4), rider rig (A11). Sabre charge, ~120 lu.

Look (A11, Gunpowder palette): a bay warhorse (dark points, black mane and tail) under a
team shabraque with a cream edge and brass studs; the rider (1.2x the horse's scale, so he
reads) wears a polished steel cuirass over a team coat, cream breeches and tall black
boots, a steel helmet with a brass comb and a big team horsehair crest that streams back,
and a big moustache. He carries an oversized curved sabre high in the near hand, so the
heavy-cavalry role reads apart from the Medieval knight's lance. The attack rears the
horse, holds the sabre back over the head, then lunges into a downward slash with a smear
and a squashed impact. Tail, crest and coat tails follow through.
"""
from ageborn_art import fx
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "cuirassier"
NAME = "Cuirassier"
HEIGHT_LU = 120
YAW_DEG = -10.0
CANVAS = (420, 336)
FEET = (184, 312)
ANCHORS = {"head": (0, 116), "hitCenter": (0, 50)}

COAT = "#7E6655"       # bay
POINTS = "#3A3230"     # dark lower legs
MANE = "#2C2826"
HOOF = "#2F2E30"
STEEL = "#B8C0C9"
DARK = "#23262E"
BLADE = "#C9D0D8"
EYE = "#FAF6EE"

# sabre: joint in the near hand (rider space, rest pose); blade modelled pointing up (+Z)
SX, SY, SZ = 9.5, -14.0, 65.5
SABRE = 44.0
SMEAR = {"joint": "sabre", "inner": (SX + 2.0, SY, SZ + 18), "outer": (SX + 6.5, SY, SZ + SABRE),
         "color": BLADE, "taper": 0.4, "start": 0.2, "behind": 6.0}


def _leg(rig, name, parent, x, y, z_top, front):
    rig.joint(name, parent, (x, y, z_top))
    x2 = x + (1.5 if front else -1.0)
    rig.joint(f"{name}2", name, (x2, y, 17.5))
    g = Geo().capsule((x, y, z_top), (x2, y, 17.5), 6.2 if not front else 5.6, 3.9)
    rig.part(name, g, COAT)
    g = Geo().capsule((x2, y, 17.5), (x2 + 0.5, y, 5.5), 3.7, 3.4)
    g.blob((x2 + 0.5, y, 8.0), (4.2, 4.2, 2.6), p=2.2)
    rig.part(f"{name}2", g, POINTS)
    g = Geo().blob((x2 + 1.3, y, 2.6), (5.0, 4.5, 2.9), p=3.0, taper=(1.05, 0.85))
    rig.part(f"{name}2", g, HOOF, finish="gloss")


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("horse", "body", (0, 0, 40))
    _leg(rig, "leg_fl", "horse", 17, 6.5, 36, True)
    _leg(rig, "leg_bl", "horse", -17, 6.5, 38, False)
    _leg(rig, "leg_fr", "horse", 17, -6.5, 36, True)
    _leg(rig, "leg_br", "horse", -17, -6.5, 38, False)

    # barrel, a big team shabraque (saddle cloth) with a cream edge, brass studs, saddle
    g = Geo().blob((0, 0, 41), (25, 11.5, 12), p=2.3)
    rig.part("horse", g, COAT)
    g = Geo().blob((-3.5, 0, 43.5), (21.5, 13.6, 12.8), p=3.2, taper=(1.12, 0.92))
    g.clip((0, 0, 29.0), (0, 0, -1))
    rig.part("horse", g, team=True)
    g = Geo().blob((-3.5, 0, 30.6), (22.4, 14.2, 2.2), p=3.4)
    g.blob((-24.4, 0, 40.0), (2.0, 14.0, 10.0), p=3.2)
    rig.part("horse", g, B.CREAM)
    g = Geo()
    for x in (-15, -3, 9):
        g.sphere((x, -14.4, 31.4), 1.4, cuts=3)
    rig.part("horse", g, B.BRASS, finish="metal", outline=0.8)
    g = Geo().blob((-2, 0, 54.5), (11.5, 9.5, 3.6), p=2.6)   # saddle
    g.blob((-11.5, 0, 57.0), (2.6, 8.5, 4.0), p=2.4)
    rig.part("horse", g, B.WOOD)
    # pistol holster caps in front of the saddle (a Gunpowder cue)
    g = Geo().blob((10.5, -10.0, 51.0), (3.6, 3.0, 5.0), p=2.6, rot=(0, -20, 0))
    rig.part("horse", g, B.BLACK, finish="gloss")

    # neck and a 1.25x head with a white blaze, bridle, eye and a black mane
    rig.joint("neck", "horse", (21, 0, 49))
    rig.joint("hhead", "neck", (32, 0, 66), scale=1.25)
    g = Geo().capsule((20, 0, 46), (31, 0, 64), 9.0, 6.8)
    rig.part("neck", g, COAT)
    g = Geo()
    for i in range(5):
        t = i / 4
        g.blob((17 + 12 * t, 0, 57 + 14 * t), (5.2, 3.4, 5.4 - 0.9 * i * 0.5), p=2.2, rot=(0, -35, 0))
    rig.part("neck", g, MANE, finish="hair")
    g = Geo().blob((38, 0, 63), (12.5, 6.4, 7.2), p=2.4, rot=(0, 40, 0))
    g.blob((46.0, 0, 55.2), (6.6, 6.0, 5.8), p=2.2)
    for y in (-3.4, 3.4):
        g.lathe([(2.2, 0), (1.6, 3), (0, 6.5)], (30.5, y, 70), (29.5, y * 1.3, 77.5), segs=10)
    rig.part("hhead", g, COAT)
    g = Geo().blob((42.0, -2.6, 61.5), (6.8, 3.6, 2.2), p=2.4, rot=(0, 44, 0))   # blaze
    rig.part("hhead", g, B.CREAM, outline=0.6)
    g = Geo().blob((34.6, -5.2, 65.8), (2.0, 1.4, 2.3))
    rig.part("hhead", g, EYE, highlight=False, outline=0.8)
    g = Geo().sphere((35.4, -6.3, 65.6), 1.25, cuts=3).sphere((50.5, -3.6, 55.5), 1.1, cuts=3)
    rig.part("hhead", g, DARK, outline=0)
    g = Geo().capsule((33.0, -6.2, 60.0), (45.5, -5.8, 57.0), 0.9).capsule((33.0, -6.2, 60.0), (31.0, -5.6, 69.0), 0.9)
    rig.part("hhead", g, B.BLACK, outline=0.5)   # bridle
    g = Geo().capsule((47.5, -5.2, 52.5), (47.5, 5.2, 52.5), 1.2)
    rig.part("hhead", g, B.BRASS, finish="metal", outline=0.8)
    rig.secondary("tail", "horse", (-26, 0, 49), (-32, 0, 34), max_deg=15, gain=1.0)
    g = Geo().capsule((-26, 0, 49), (-31, 0, 43), 2.8, 3.4).capsule((-31, 0, 43), (-32, 0, 34), 3.4, 1.6)
    rig.part("tail", g, MANE, finish="hair")

    # the rider, 1.2x relative to the horse, scaled about the saddle
    rig.joint("rider", "horse", (-2, 0, 57), scale=1.2)
    rig.joint("ktorso", "rider", (-1, 0, 58))
    rig.joint("khead", "ktorso", (0, 0, 79))
    # near leg: cream breeches, tall black boot over the shabraque
    g = Geo().capsule((-1, -8.5, 58), (8, -11.5, 52), 5.2, 4.6)
    rig.part("rider", g, B.CREAM)
    g = Geo().capsule((8, -11.5, 53), (7, -11.5, 40), 4.8, 4.2)
    g.blob((9.5, -11.5, 38.0), (5.8, 4.2, 3.0), p=2.8)
    rig.part("rider", g, B.BLACK, finish="gloss")
    # torso: team coat, steel cuirass, coat tails
    g = Geo().blob((-1, 0, 69.5), (9.4, 10.4, 11.6), p=2.4, taper=(1.0, 1.06))
    rig.part("ktorso", g, team=True)
    g = Geo().blob((-0.6, 0, 70.5), (10.4, 11.2, 9.4), p=2.6, taper=(0.9, 1.05))
    g.clip((0, 0, 63.5), (0, 0, -1))
    rig.part("ktorso", g, STEEL, finish="metal")
    g = Geo().blob((-0.6, 0, 63.4), (10.8, 11.6, 1.8), p=3.0)
    rig.part("ktorso", g, B.BRASS, finish="metal", outline=0.7)
    rig.secondary("ktails", "ktorso", (-8.0, 0, 63.0), (-15.0, 0, 55.0), max_deg=14, gain=1.0)
    g = Geo().blob((-12.0, 0, 58.5), (6.0, 9.6, 3.2), p=2.6, rot=(0, -35, 0))
    rig.part("ktails", g, team=True)
    # head: moustache, helmet with a brass comb and a streaming team crest
    g = Geo().blob((1.5, 0, 87), (8.6, 8.2, 8.4), p=2.3)
    g.blob((10.2, -0.5, 86.2), (2.6, 2.4, 2.6), p=2.0)
    rig.part("khead", g, B.SKIN)
    g = Geo().blob((9.2, -3.0, 82.8), (2.4, 3.6, 1.6), p=2.2, rot=(20, 0, 0))
    g.blob((9.2, 2.2, 82.8), (2.4, 3.6, 1.6), p=2.2, rot=(-20, 0, 0))
    rig.part("khead", g, MANE, finish="hair")
    for y in (-3.4, 3.2):
        g = Geo().blob((8.4, y, 88.2), (2.4, 2.3, 2.8))
        rig.part("khead", g, EYE, highlight=False)
        g = Geo().blob((10.2, y - 0.3, 87.9), (1.0, 1.4, 1.4))
        rig.part("khead", g, B.PUPIL, outline=0)
    g = Geo().capsule((7.4, -6.0, 92.0), (9.8, -0.4, 91.0), 1.3).capsule((9.8, -0.4, 91.0), (7.4, 5.2, 92.0), 1.3)
    rig.part("khead", g, MANE, finish="hair")
    g = Geo().blob((1.0, 0, 92.0), (9.4, 9.2, 8.2), p=2.4)
    g.clip((0, 0, 90.4), (0, 0, -1))
    g.lathe([(0, -0.6), (8.4, -0.6), (9.2, 0.0), (8.4, 0.6), (0, 0.6)], (4.0, 0, 90.6), segs=24,
            squash=(1.0, 0.9), rot=(0, -8, 0))   # peak
    rig.part("khead", g, STEEL, finish="metal")
    g = Geo().blob((0.0, 0, 100.0), (8.4, 2.2, 3.4), p=2.4)   # brass comb
    rig.part("khead", g, B.BRASS, finish="metal", outline=0.7)
    rig.secondary("crest", "khead", (-2, 0, 102), (-22, 0, 92), max_deg=12, gain=1.1)
    g = Geo()
    for x, z, r in ((3.0, 102.5, 3.4), (-2.0, 103.4, 4.4), (-7.5, 102.4, 4.8), (-13.0, 99.5, 4.6),
                    (-17.5, 95.5, 4.0), (-21.0, 91.0, 3.2)):
        g.blob((x, 0, z), (r * 1.15, r * 0.85, r), p=2.1)
    rig.part("crest", g, team=True)

    # far arm: reins
    rig.joint("karm_l", "ktorso", (0, 10.5, 77))
    rig.joint("kfore_l", "karm_l", (3, 12, 68))
    g = Geo().capsule((0, 10.5, 77), (3, 12, 68), 4.0, 3.6)
    rig.part("karm_l", g, team=True)
    g = Geo().capsule((3, 12, 68), (10, 11, 65.5), 3.6, 3.4).blob((10.5, 11, 65), (3.8, 3.8, 3.8), p=2.6)
    rig.part("kfore_l", g, B.CREAM)
    # near arm: team sleeve, cream gauntlet, sabre
    rig.joint("karm_r", "ktorso", (0, -10.5, 77))
    rig.joint("kfore_r", "karm_r", (3, -12, 68))
    rig.joint("sabre", "kfore_r", (SX, SY, SZ))
    g = Geo().capsule((0, -10.5, 77), (3, -12, 68), 4.2, 3.8)
    rig.part("karm_r", g, team=True)
    g = Geo().capsule((3, -12, 68), (8.5, -13, 66), 3.8, 3.6)
    g.blob((6.8, -12.6, 66.8), (3.4, 4.8, 4.8), p=2.4)
    rig.part("kfore_r", g, B.CREAM)
    for y in (-10.5, 10.5):   # steel epaulettes
        g = Geo().blob((-0.5, y * 1.02, 78.5), (6.6, 5.6, 4.6), p=2.4)
        rig.part("ktorso" if y > 0 else "karm_r", g, STEEL, finish="metal")
    g = Geo().blob((SX + 0.6, SY, SZ), (3.8, 3.6, 3.8), p=2.3)    # fist
    rig.part("sabre", g, B.CREAM)
    back = [(SX - 1.2, SZ + 4.0), (SX - 0.8, SZ + 18), (SX + 0.8, SZ + 30), (SX + 3.6, SZ + 39),
            (SX + 6.5, SZ + SABRE)]
    edge = [(SX + 8.2, SZ + SABRE - 4.5), (SX + 6.4, SZ + 32), (SX + 4.4, SZ + 20),
            (SX + 3.0, SZ + 10), (SX + 2.2, SZ + 4.0)]
    g = Geo().slab(back + edge, SY - 1.2, 1.4)
    rig.part("sabre", g, BLADE, finish="metal", outline_hex="#6F7780")
    g = Geo().capsule((SX + 0.4, SY - 0.4, SZ - 5.0), (SX + 0.4, SY - 0.4, SZ + 3.0), 1.3)
    g.blob((SX + 2.6, SY - 1.4, SZ + 2.0), (4.6, 2.2, 3.0), p=2.2)
    g.clip((SX - 1.0, SY, SZ), (-1, 0, 0))
    rig.part("sabre", g, B.BRASS, finish="metal", outline=0.7)
    rig.track("sabreTip", "sabre", (SX + 6.5, SY, SZ + SABRE))
    rig.track("_foot", "leg_fr2", (19.8, -6.5, 0.5))


# -- poses ---------------------------------------------------------------------------------
SABRE_CHAIN = ("horse", "ktorso", "karm_r", "kfore_r")


def sabre_at(pose, deg):
    """Points the sabre `deg` above the horizon, whatever its parents do."""
    chain = sum(pose.get(j, {}).get("r", 0.0) for j in SABRE_CHAIN)
    pose.setdefault("sabre", {})["r"] = deg - 90.0 - chain
    return pose


STANCE = {"karm_l": {"r": 22}, "kfore_l": {"r": 20}, "karm_r": {"r": 40}, "kfore_r": {"r": 55}}
IDLE_SABRE = 72.0


def _idle(f):
    c, lag = B.idle_wave(f)
    pose = merge(STANCE, {
        "horse": {"z": 1.2 * c},
        "body": squash(0.03 * c),
        "neck": {"r": -3.0 * lag}, "hhead": {"r": 2.5 * lag},
        "rider": {"z": 0.8 * lag},
        "ktorso": {"r": 1.2 * lag},
        "karm_r": {"r": 2.0 * lag},
        "leg_fr": {"r": 1.0 * c}, "leg_br": {"r": -1.0 * c},
    })
    return sabre_at(pose, IDLE_SABRE + 3.0 * lag)


def _walk(f):
    # trot: diagonal pairs together, 0.8 s cycle (100 ms frames); the rider posts one frame
    # behind the horse's bob
    import math
    p = 2 * math.pi * f / 8
    s, c = math.sin(p), math.cos(p)
    bob = -1.75 * math.cos(2 * p)
    bob_lag = -1.1 * math.cos(2 * (p - 2 * math.pi / 8))
    up = lambda v: max(0.0, v)
    pose = merge(STANCE, {
        "horse": {"z": bob - 0.4, "r": 1.5 * s},
        "leg_fr": {"r": 20 * s}, "leg_fr2": {"r": -46 * up(c)},
        "leg_bl": {"r": 16 * s}, "leg_bl2": {"r": 32 * up(-c)},
        "leg_fl": {"r": -20 * s}, "leg_fl2": {"r": -46 * up(-c)},
        "leg_br": {"r": -16 * s}, "leg_br2": {"r": 32 * up(c)},
        "neck": {"r": -8 * math.cos(2 * p)}, "hhead": {"r": 3 * math.cos(2 * p)},
        "rider": {"z": bob_lag},
        "ktorso": {"r": -2.0 * math.cos(2 * (p - 2 * math.pi / 8))},
        "karm_r": {"r": 3.0 * math.cos(2 * (p - 2 * math.pi / 8))},
    })
    return sabre_at(pose, IDLE_SABRE + 4.0 * math.cos(2 * (p - 2 * math.pi / 8)))


def _attack(f):
    # 0-1 anticipation (the horse rears, squash 0.9/1.1), 2 held extreme (sabre far back over
    # the head), 3 smear (lunge, blade whipping over), 4 held impact (blade down and forward,
    # lunge, squash 0.85/1.15), 5-7 recovery. See fx.MELEE_MS.
    sq = pick(f, [-0.05, -0.10, 0.06, 0.04, -0.15, -0.08, -0.02, 0.0])
    pose = merge(STANCE, {
        "body": dict(squash(sq), x=pick(f, [-1, -3, -5, 4, 10, 9, 5, 0])),
        "horse": {"r": pick(f, [4, 9, 14, 2, -5, -3, -1, 0])},
        "leg_fr": {"r": pick(f, [10, 28, 40, 0, -16, -10, -4, 0])},
        "leg_fr2": {"r": pick(f, [-20, -55, -75, -20, -8, -4, 0, 0])},
        "leg_fl": {"r": pick(f, [6, 20, 30, 12, 16, 8, 2, 0])},
        "leg_fl2": {"r": pick(f, [-14, -45, -60, -40, -30, -15, -5, 0])},
        "leg_br": {"r": pick(f, [4, 10, 14, -6, -20, -12, -4, 0])},
        "leg_bl": {"r": pick(f, [2, 6, 8, -4, -10, -6, -2, 0])},
        "neck": {"r": pick(f, [4, 8, 12, -4, -14, -10, -4, 0])},
        "hhead": {"r": pick(f, [-3, -6, -8, 2, 6, 4, 1, 0])},
        "ktorso": {"r": pick(f, [6, 12, 16, -10, -22, -18, -8, 0])},
        "karm_r": {"r": pick(f, [90, 130, 150, 110, 30, 25, 35, 40]) - 40},
        "kfore_r": {"r": pick(f, [60, 70, 75, 20, 0, 10, 35, 55]) - 55},
        "khead": {"r": pick(f, [2, 4, 6, -4, -8, -6, -2, 0])},
    })
    sabre = pick(f, [110, 150, 170, 80, -35, -25, 20, IDLE_SABRE])
    pose = sabre_at(pose, sabre)
    if f == 3:
        pose["sabre"]["sz"] = 1.18
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    pose = merge(STANCE, {
        "body": dict(squash(-0.08 * a), x=-4.0 * a),
        "horse": {"r": 5 * a},
        "neck": {"r": 14 * a}, "hhead": {"r": -8 * a},
        "ktorso": {"r": 14 * a}, "khead": {"r": 8 * a},
        "karm_r": {"r": 15 * a},
    })
    return sabre_at(pose, IDLE_SABRE + 15 * a)


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "horse": {"r": pick(f, [10, 4, 2])},
        "neck": {"r": pick(f, [20, 12, 12])}, "hhead": {"r": -10},
        "leg_fr": {"r": pick(f, [40, 20, 20])}, "leg_fl": {"r": pick(f, [30, 16, 16])},
        "leg_fr2": {"r": -50},
        "ktorso": {"r": pick(f, [22, 10, 10])}, "karm_r": {"r": 30},
    })
    return sabre_at(pose, pick(f, [120, 100, 100]))


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=100),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
