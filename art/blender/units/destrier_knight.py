"""Destrier Knight: Medieval Age heavy (DESIGN A5.3), rider rig (A11). Lance charge, ~118 lu.

Look (A11): white destrier in a team caparison with a parchment hem, knight (1.2x the horse's
scale, so he reads) in slate plate with a team tabard, a big team plume, glowing eye dots in
the helm slit, a large team heater shield with a parchment chevron on the near arm, and a
wine lance in the far hand carried across the horse's neck with a team swallowtail pennant
trailing behind the tip. Gold is an accent only. Tail, plume and pennant follow through.
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "destrier_knight"
NAME = "Destrier Knight"
HEIGHT_LU = 118
YAW_DEG = -10.0
CANVAS = (296, 264)
FEET = (96, 246)
ANCHORS = {"head": (0, 112), "hitCenter": (0, 50)}

COAT = "#E3DACB"
MANE = "#4B4F58"
TAIL = "#6E6660"
HOOF = "#474C55"
SLATE = "#6B7682"
STEEL = "#8D97A3"
DARK = "#23262E"
WINE = "#8E2A4A"
PARCH = "#E8DFC8"
GOLD = "#D4A437"
EYE = "#FAF6EE"

# lance: joint in the far hand; shaft along +Z (rest), tip at LANCE_TIP lu
LX, LY, LZ = 10.5, 14.0, 65.0
LANCE_TIP = 66.0
SMEAR = {"joint": "lance", "inner": (LX, LY, LZ + 36), "outer": (LX, LY, LZ + LANCE_TIP),
         "color": STEEL, "taper": 0.5, "start": 0.4, "behind": 6.0}


def _leg(rig, name, parent, x, y, z_top, front):
    rig.joint(f"{name}", parent, (x, y, z_top))
    x2 = x + (1.5 if front else -1.0)
    rig.joint(f"{name}2", name, (x2, y, 17.5))
    g = Geo().capsule((x, y, z_top), (x2, y, 17.5), 6.2 if not front else 5.6, 3.9)
    rig.part(name, g, COAT)
    g = Geo().capsule((x2, y, 17.5), (x2 + 0.5, y, 5.5), 3.6, 3.3)
    g.blob((x2 + 0.5, y, 8.0), (4.4, 4.4, 2.6), p=2.2)  # fetlock feathering
    rig.part(f"{name}2", g, COAT)
    g = Geo().blob((x2 + 1.3, y, 2.6), (5.0, 4.5, 2.9), p=3.0, taper=(1.05, 0.85))
    rig.part(f"{name}2", g, HOOF)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("horse", "body", (0, 0, 40))
    # legs: far side first so they sit behind
    _leg(rig, "leg_fl", "horse", 17, 6.5, 36, True)
    _leg(rig, "leg_bl", "horse", -17, 6.5, 38, False)
    _leg(rig, "leg_fr", "horse", 17, -6.5, 36, True)
    _leg(rig, "leg_br", "horse", -17, -6.5, 38, False)

    # barrel under a team caparison with a parchment hem and gold studs
    g = Geo().blob((0, 0, 41), (25, 11.5, 12), p=2.3)
    rig.part("horse", g, COAT)
    g = Geo().blob((0.5, 0, 41.5), (28.5, 14.2, 12.4), p=3.0, taper=(1.06, 0.96))
    rig.part("horse", g, team=True)
    g = Geo().blob((0.5, 0, 30.4), (29.4, 14.9, 2.4), p=3.2)
    rig.part("horse", g, PARCH)
    g = Geo()
    for x in (-20, -7, 7, 20):
        g.sphere((x, -15.2, 30.6), 1.5, cuts=3)
    rig.part("horse", g, GOLD, finish="metal", outline=1.0)
    g = Geo().blob((-2, 0, 54), (11.5, 9.5, 3.6), p=2.6)  # saddle
    g.blob((-11.5, 0, 56.5), (2.6, 8.5, 4.0), p=2.4)      # cantle
    rig.part("horse", g, WINE)

    # neck and a 1.25x head with a slate chanfron, an eye and a mane
    rig.joint("neck", "horse", (21, 0, 49))
    rig.joint("hhead", "neck", (32, 0, 66), scale=1.25)
    g = Geo().capsule((20, 0, 46), (31, 0, 64), 9.0, 6.8)
    rig.part("neck", g, COAT)
    g = Geo()
    for i in range(5):
        t = i / 4
        g.blob((17 + 12 * t, 0, 57 + 14 * t), (5.2, 3.2, 5.0 - 0.9 * i * 0.5), p=2.2, rot=(0, -35, 0))
    rig.part("neck", g, MANE, finish="hair")
    g = Geo().blob((38, 0, 63), (12.5, 6.4, 7.2), p=2.4, rot=(0, 40, 0))
    g.blob((46.0, 0, 55.2), (6.6, 6.0, 5.8), p=2.2)
    for y in (-3.4, 3.4):
        g.lathe([(2.2, 0), (1.6, 3), (0, 6.5)], (30.5, y, 70), (29.5, y * 1.3, 77.5), segs=10)
    rig.part("hhead", g, COAT)
    g = Geo().blob((39.5, 0, 64.5), (7.4, 5.7, 3.0), p=3.0, rot=(0, 38, 0))
    rig.part("hhead", g, SLATE, finish="metal")
    g = Geo().blob((34.6, -5.2, 65.8), (2.0, 1.4, 2.3))
    rig.part("hhead", g, EYE, highlight=False, outline=0.8)
    g = Geo().sphere((35.4, -6.3, 65.6), 1.25, cuts=3).sphere((50.5, -3.6, 55.5), 1.1, cuts=3)
    rig.part("hhead", g, DARK, outline=0)
    g = Geo().capsule((47.5, -5.2, 52.5), (47.5, 5.2, 52.5), 1.2)  # bit
    rig.part("hhead", g, GOLD, finish="metal", outline=0.8)
    # tail: half the old size, a mid grey-brown so it does not pull the eye to the rear
    rig.secondary("tail", "horse", (-26, 0, 49), (-31, 0, 36), max_deg=15, gain=1.0)
    g = Geo().capsule((-26, 0, 49), (-30.5, 0, 44), 2.6, 3.0).capsule((-30.5, 0, 44), (-31, 0, 36.5), 3.0, 1.4)
    rig.part("tail", g, TAIL, finish="hair")

    # the knight, 1.2x relative to the horse, scaled about the saddle
    rig.joint("rider", "horse", (-2, 0, 57), scale=1.2)
    rig.joint("ktorso", "rider", (-1, 0, 58))
    rig.joint("khead", "ktorso", (0, 0, 79))
    g = Geo().capsule((-1, -8.5, 58), (8, -11.5, 52), 5.2, 4.6).capsule((8, -11.5, 52), (7, -11.5, 40), 4.4, 4.0)
    g.blob((9.5, -11.5, 38.0), (5.8, 4.2, 3.0), p=2.8)
    rig.part("rider", g, SLATE, finish="metal")
    g = Geo().blob((-1, 0, 70.5), (9.2, 10.2, 11.2), p=2.4, taper=(0.95, 1.08))
    rig.part("ktorso", g, SLATE, finish="metal")
    g = Geo().blob((-0.4, 0, 64.8), (10.2, 11.2, 8.4), p=2.8, taper=(1.12, 0.9))
    g.blob((-0.4, 0, 72.5), (9.8, 10.6, 5.0), p=2.6)
    rig.part("ktorso", g, team=True)
    g = Geo().blob((-0.4, 0, 63.2), (10.6, 11.6, 1.8), p=3.0)
    rig.part("ktorso", g, WINE)
    # great helm: slit that wraps to the near side, two glowing eye dots, gold cross trim
    g = Geo().blob((0.5, 0, 88), (9.6, 9.4, 10.8), p=3.2, taper=(1.05, 0.92))
    rig.part("khead", g, STEEL, finish="metal")
    g = Geo().capsule((10.0, 4.0, 89.5), (9.9, -4.5, 89.5), 1.7).capsule((9.9, -4.5, 89.5), (7.0, -9.4, 89.5), 1.7)
    rig.part("khead", g, DARK, outline=0)
    g = Geo().sphere((10.4, -3.4, 89.6), 1.2, cuts=3).sphere((9.2, -7.4, 89.6), 1.2, cuts=3)
    rig.part("khead", g, glow="#FFFFFF", outline=0)
    g = Geo().capsule((10.2, -1.0, 99.0), (10.4, -1.0, 92.0), 1.1).capsule((10.3, -1.0, 87.5), (10.4, -1.0, 81.5), 1.1)
    rig.part("khead", g, GOLD, finish="metal", outline=0.9)
    rig.secondary("plume", "khead", (-2, 0, 99), (-20, 0, 97), max_deg=10, gain=1.0)
    g = Geo()
    for x, z, r in ((0, 99.5, 4.6), (-4, 104, 5.4), (-9.5, 106, 5.4), (-15, 104.5, 4.8),
                    (-19, 100, 4.0), (-21.5, 95, 3.2)):
        g.blob((x, 0, z), (r * 1.15, r * 0.9, r), p=2.1)
    rig.part("plume", g, team=True)

    # far arm: holds the lance, carried across the horse's neck
    rig.joint("karm_l", "ktorso", (0, 10.5, 77))
    rig.joint("kfore_l", "karm_l", (3, 12, 68))
    rig.joint("lance", "kfore_l", (LX, LY, LZ))
    g = Geo().capsule((0, 10.5, 77), (3, 12, 68), 4.2, 3.8)
    rig.part("karm_l", g, SLATE, finish="metal")
    g = Geo().capsule((3, 12, 68), (10, 13, 65.5), 3.8, 3.6).blob((10.5, 13, 65), (4.2, 4.2, 4.2), p=2.6)
    rig.part("kfore_l", g, SLATE, finish="metal")
    g = Geo().lathe([(0, -14), (1.8, -13.5), (2.0, -4), (2.1, 3), (1.8, 26), (1.4, LANCE_TIP - 12),
                     (0, LANCE_TIP - 11)], (LX, LY, LZ), segs=12)
    rig.part("lance", g, WINE)
    g = Geo().lathe([(0, 1.5), (2.6, 2.0), (6.8, 8.5), (5.8, 10), (0, 10.2)], (LX, LY, LZ), segs=16)
    g.lathe([(1.8, LANCE_TIP - 13), (2.8, LANCE_TIP - 12), (1.6, LANCE_TIP - 6), (0, LANCE_TIP)],
            (LX, LY, LZ), segs=10)
    rig.part("lance", g, STEEL, finish="metal")
    rig.track("lanceTip", "lance", (LX, LY, LZ + LANCE_TIP))
    # swallowtail pennant (14 x 8 lu after the 1.2x rider scale) trailing behind the tip; it is
    # counter-rotated to stream back level and follows through from the lance's movement
    pz = LZ + LANCE_TIP - 14.0
    rig.secondary("pennant", "lance", (LX, LY - 0.5, pz), (LX - 11.5, LY - 0.5, pz - 3.3),
                  max_deg=14, gain=1.2, rot_gain=0.0)
    pts = [(0.0, 0.0), (-11.7, -0.6), (-8.4, -3.3), (-11.7, -6.1), (0.0, -6.7)]
    g = Geo().slab([(LX + x, pz + z) for x, z in pts], LY - 0.5, 1.2)
    rig.part("pennant", g, team=True, outline=0.8)

    # near arm: the big heater shield (team face, parchment chevron, steel rim)
    rig.joint("karm_r", "ktorso", (0, -10.5, 77))
    rig.joint("kfore_r", "karm_r", (3, -12, 68))
    rig.joint("shield", "kfore_r", (9, -15, 66))
    g = Geo().capsule((0, -10.5, 77), (3, -12, 68), 4.4, 4.0)
    rig.part("karm_r", g, SLATE, finish="metal")
    g = Geo().capsule((3, -12, 68), (9, -13, 66), 4.0, 3.7)
    rig.part("kfore_r", g, SLATE, finish="metal")
    for y in (-10.5, 10.5):
        g = Geo().blob((-0.5, y * 1.02, 78.5), (7.6, 6.2, 5.6), p=2.4)
        rig.part("ktorso" if y > 0 else "karm_r", g, STEEL, finish="metal")
    sx, sy, sz = 7.0, -17.6, 64.0
    rot = (0, 0, 10)
    g = Geo().blob((sx, sy + 0.7, sz), (9.9, 1.4, 13.2), p=3.2, taper=(0.2, 1.0), rot=rot)
    rig.part("shield", g, STEEL, finish="metal")
    g = Geo().blob((sx, sy, sz + 0.4), (9.0, 1.5, 12.2), p=3.2, taper=(0.18, 1.0), rot=rot)
    rig.part("shield", g, team=True, outline=0.8)
    g = Geo().capsule((sx - 5.4, sy - 1.9, sz - 1.8), (sx - 0.3, sy - 2.3, sz + 4.4), 1.5)
    g.capsule((sx - 0.3, sy - 2.3, sz + 4.4), (sx + 5.0, sy - 2.0, sz - 1.8), 1.5)
    rig.part("shield", g, PARCH, outline=0.6)


# -- poses ---------------------------------------------------------------------------------
LANCE_CHAIN = ("horse", "ktorso", "karm_l", "kfore_l")


def lance_at(pose, deg):
    """Sets the lance so it points `deg` above the horizon, whatever its parents do."""
    chain = sum(pose.get(j, {}).get("r", 0.0) for j in LANCE_CHAIN)
    pose.setdefault("lance", {})["r"] = deg - 90.0 - chain
    return pose


def _pennant(pose, lance_deg):
    """Counter-rotate the pennant so it streams back level (a little droop)."""
    pose.setdefault("pennant", {})["r"] = -(lance_deg - 90.0) - 90.0 - 4.0
    return pose


def _finish(pose, lance_deg):
    return _pennant(lance_at(pose, lance_deg), lance_deg)


STANCE = {
    "karm_l": {"r": 22}, "kfore_l": {"r": 20},
    "karm_r": {"r": 10}, "kfore_r": {"r": 40},
}
IDLE_LANCE = 28.0


def _idle(f):
    c = [-1.0, -0.45, 0.45, 1.0][f]
    lag = [-1.0, -1.0, -0.45, 0.45][f]
    pose = merge(STANCE, {
        "horse": {"z": 1.2 * c},
        "body": squash(0.03 * c),
        "neck": {"r": -3.0 * lag}, "hhead": {"r": 2.5 * lag},
        "rider": {"z": 0.8 * lag},
        "ktorso": {"r": 1.2 * lag},
        "leg_fr": {"r": 1.0 * c}, "leg_br": {"r": -1.0 * c},
    })
    return _finish(pose, IDLE_LANCE + 1.5 * lag)


def _walk(f):
    # trot: diagonal pairs move together (front-right with back-left); the horse is lowest
    # on the contact frames 0 and 4 (3.5 lu bob), nods +-8 degrees, the rider bobs 2.2 lu
    # one frame behind
    import math
    p = 2 * math.pi * f / 8
    s, c = math.sin(p), math.cos(p)
    bob = -1.75 * math.cos(2 * p)
    bob_lag = -1.1 * math.cos(2 * (p - 2 * math.pi / 8))
    up = lambda v: max(0.0, v)
    pose = merge(STANCE, {
        "horse": {"z": bob - 0.4, "r": 1.5 * s},
        "leg_fr": {"r": 28 * s}, "leg_fr2": {"r": -48 * up(c)},
        "leg_bl": {"r": 22 * s}, "leg_bl2": {"r": 34 * up(-c)},
        "leg_fl": {"r": -28 * s}, "leg_fl2": {"r": -48 * up(-c)},
        "leg_br": {"r": -22 * s}, "leg_br2": {"r": 34 * up(c)},
        "neck": {"r": -8 * math.cos(2 * p)}, "hhead": {"r": 3 * math.cos(2 * p)},
        "rider": {"z": bob_lag},
        "ktorso": {"r": -2.0 * math.cos(2 * (p - 2 * math.pi / 8))},
    })
    return _finish(pose, IDLE_LANCE + 2.5 * math.cos(2 * (p - 2 * math.pi / 8)))


def _attack(f):
    # 0-1 anticipation (the horse rears, squash 0.9/1.1), 2 held extreme (reared, lance
    # high), 3 smear (lunge, lance swinging down), 4 held impact (lance level, lunge, squash
    # 0.85/1.15), 5-7 recovery. See fx.MELEE_MS.
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
        "ktorso": {"r": pick(f, [4, 9, 12, -8, -16, -13, -6, 0])},
        "karm_l": {"r": pick(f, [30, 40, 48, 20, 8, 10, 16, 0])},
        "karm_r": {"r": pick(f, [4, 0, -4, 14, 22, 18, 12, 0])},
        "khead": {"r": pick(f, [2, 4, 6, -4, -8, -6, -2, 0])},
    })
    lance = pick(f, [38, 50, 58, 22, 2, 5, 14, IDLE_LANCE])
    pose = _finish(pose, lance)
    if f == 3:
        pose["lance"]["sz"] = 1.12  # smear frame: the lance stretches along the thrust
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
    return _finish(pose, IDLE_LANCE + 10 * a)


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "horse": {"r": pick(f, [10, 4, 2])},
        "neck": {"r": pick(f, [20, 12, 12])}, "hhead": {"r": -10},
        "leg_fr": {"r": pick(f, [40, 20, 20])}, "leg_fl": {"r": pick(f, [30, 16, 16])},
        "leg_fr2": {"r": -50},
        "ktorso": {"r": pick(f, [22, 10, 10])}, "karm_r": {"r": 40},
    })
    return _finish(pose, pick(f, [60, 40, 30]))


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
