"""Destrier Knight: Medieval Age heavy (DESIGN A5.3), rider rig (A11). Lance charge, ~112 lu.

Look (A11): white destrier in a team-coloured caparison with a parchment hem, knight in
slate plate with a team tabard, team plume and team shield face, a wine lance with a team
pennant. Gold is an accent only (well under 10% of the silhouette).
"""
import math

from ageborn_art.anim import Clip, key, merge, squash, wave
from ageborn_art.fx import add_death_fx, death_fx_pose
from ageborn_art.geometry import Geo

SLUG = "destrier_knight"
NAME = "Destrier Knight"
HEIGHT_LU = 112
CANVAS = (264, 244)
FEET = (84, 230)
ANCHORS = {"head": (0, 112), "muzzle": (88, 52), "hitCenter": (0, 50)}

COAT = "#E3DACB"
MANE = "#4B4F58"
HOOF = "#474C55"
SLATE = "#6B7682"
STEEL = "#8D97A3"
DARK = "#23262E"
WINE = "#8E2A4A"
PARCH = "#E8DFC8"
GOLD = "#D4A437"


def _leg(rig, name, parent, x, y, z_top, front):
    rig.joint(f"{name}", parent, (x, y, z_top))
    rig.joint(f"{name}2", name, (x + (1.5 if front else -1.0), y, 17.5))
    g = Geo().capsule((x, y, z_top), (x + (1.5 if front else -1.0), y, 17.5), 6.2 if not front else 5.6, 3.9)
    rig.part(name, g, COAT)
    x2 = x + (1.5 if front else -1.0)
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
    g = Geo().blob((0.5, 0, 40.5), (28.5, 14.2, 13.2), p=3.0, taper=(1.06, 0.96))
    rig.part("horse", g, team=True)
    g = Geo().blob((0.5, 0, 28.8), (29.4, 14.9, 2.6), p=3.2)
    rig.part("horse", g, PARCH, outline=2.2)
    g = Geo()
    for x in (-20, -7, 7, 20):
        g.sphere((x, -15.2, 29.0), 1.5, cuts=3)
    rig.part("horse", g, GOLD, finish="metal", outline=1.0)
    g = Geo().blob((-2, 0, 54), (11.5, 9.5, 3.6), p=2.6)  # saddle
    g.blob((-11.5, 0, 56.5), (2.6, 8.5, 4.0), p=2.4)      # cantle
    rig.part("horse", g, WINE, outline=2.2)

    # neck, head with a slate chanfron, mane and tail
    rig.joint("neck", "horse", (21, 0, 49))
    rig.joint("hhead", "neck", (32, 0, 66))
    g = Geo().capsule((20, 0, 46), (31, 0, 64), 9.0, 6.8)
    rig.part("neck", g, COAT)
    g = Geo()
    for i in range(5):
        t = i / 4
        g.blob((17 + 12 * t, 0, 57 + 14 * t), (5.2, 3.2, 5.0 - 0.9 * i * 0.5), p=2.2, rot=(0, -35, 0))
    rig.part("neck", g, MANE)
    g = Geo().blob((38, 0, 63), (12.5, 6.4, 7.2), p=2.4, rot=(0, 40, 0))
    g.blob((46.0, 0, 55.2), (6.6, 6.0, 5.8), p=2.2)
    for y in (-3.4, 3.4):
        g.lathe([(2.2, 0), (1.6, 3), (0, 6.5)], (30.5, y, 70), (29.5, y * 1.3, 77.5), segs=10)
    rig.part("hhead", g, COAT)
    g = Geo().blob((37.5, 0, 66), (8.8, 5.6, 3.2), p=3.0, rot=(0, 38, 0))
    rig.part("hhead", g, SLATE, finish="metal", outline=2.0)
    g = Geo().sphere((34.6, -5.9, 65.8), 1.6, cuts=3).sphere((50.5, -3.6, 55.5), 1.1, cuts=3)
    rig.part("hhead", g, DARK, outline=0)
    g = Geo().capsule((47.5, -5.2, 52.5), (47.5, 5.2, 52.5), 1.2)  # bit
    rig.part("hhead", g, GOLD, finish="metal", outline=0.8)
    rig.joint("tail", "horse", (-27, 0, 50))
    g = Geo().capsule((-27, 0, 50), (-35, 0, 40), 4.6, 5.4).capsule((-35, 0, 40), (-35, 0, 27), 5.4, 2.8)
    rig.part("tail", g, MANE)

    # the knight
    rig.joint("rider", "horse", (-2, 0, 57))
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
    rig.part("ktorso", g, WINE, outline=1.6)
    g = Geo().sphere((10.3, -3.5, 63.6), 1.6, cuts=3)
    rig.part("ktorso", g, GOLD, finish="metal", outline=1.0)
    # helmet: great helm with a visor slit, gold cross trim and a big team plume
    g = Geo().blob((0.5, 0, 88), (9.6, 9.4, 10.8), p=3.2, taper=(1.05, 0.92))
    rig.part("khead", g, STEEL, finish="metal")
    g = Geo().capsule((9.3, -6.5, 89.5), (9.9, 5.0, 89.5), 1.35)
    rig.part("khead", g, DARK, outline=0)
    g = Geo().capsule((10.2, -1.5, 97.5), (10.4, -1.5, 81.5), 1.1).capsule((10.2, -7.5, 85.5), (10.4, 5, 85.5), 1.0)
    rig.part("khead", g, GOLD, finish="metal", outline=0.9)
    g = Geo()
    for i, (x, z, r) in enumerate(((0, 99.5, 4.6), (-4, 104, 5.4), (-9.5, 106, 5.4), (-15, 104.5, 4.8),
                                   (-19, 100, 4.0), (-21.5, 95, 3.2))):
        g.blob((x, 0, z), (r * 1.15, r * 0.9, r), p=2.1)
    rig.part("khead", g, team=True)

    # far arm with the heater shield (team face, gold rim)
    rig.joint("karm_l", "ktorso", (0, 10.5, 77))
    g = Geo().capsule((0, 10.5, 77), (5, 12, 68), 4.2, 3.8).capsule((5, 12, 68), (11, 12, 66), 3.8, 3.6)
    rig.part("karm_l", g, SLATE, finish="metal")
    rig.joint("shield", "karm_l", (12, 9, 66))
    g = Geo().blob((13.5, 7, 65), (2.2, 9.6, 12.0), p=3.6, taper=(0.3, 1.0), rot=(0, 0, -38))
    rig.part("shield", g, PARCH, outline=2.4, outline_hex=GOLD)
    g = Geo().blob((14.6, 6.2, 65.4), (1.6, 8.2, 10.4), p=3.6, taper=(0.28, 1.0), rot=(0, 0, -38))
    rig.part("shield", g, team=True, outline=0)

    # near arm, big pauldrons, and the lance
    rig.joint("karm_r", "ktorso", (0, -10.5, 77))
    rig.joint("kfore_r", "karm_r", (3, -12, 68))
    rig.joint("lance", "kfore_r", (10, -13, 65))
    g = Geo().capsule((0, -10.5, 77), (3, -12, 68), 4.4, 4.0)
    rig.part("karm_r", g, SLATE, finish="metal")
    g = Geo().capsule((3, -12, 68), (10, -13, 65.5), 4.0, 3.7).blob((10.5, -13, 65), (4.3, 4.3, 4.3), p=2.6)
    rig.part("kfore_r", g, SLATE, finish="metal")
    for y in (-10.5, 10.5):
        g = Geo().blob((-0.5, y * 1.02, 78.5), (7.6, 6.2, 5.6), p=2.4)
        rig.part("ktorso" if y > 0 else "karm_r", g, STEEL, finish="metal")
    lx, ly, lz = 10.5, -14.5, 65.0
    g = Geo().lathe([(0, -16), (1.8, -15.5), (2.0, -4), (2.1, 3), (1.8, 30), (1.4, 62), (0, 63)],
                    (lx, ly, lz), segs=12)
    rig.part("lance", g, WINE, outline=1.8)
    g = Geo().lathe([(0, 1.5), (2.6, 2.0), (6.8, 8.5), (5.8, 10), (0, 10.2)], (lx, ly, lz), segs=16)
    g.lathe([(1.8, 62), (2.8, 63), (1.6, 69), (0, 76)], (lx, ly, lz), segs=10)
    rig.part("lance", g, STEEL, finish="metal", outline=1.8)
    # pennant: a tapered flag below the tip; its own joint keeps it flying backward
    rig.joint("pennant", "lance", (lx, ly, lz + 55.0))
    g = Geo().blob((lx - 11.0, ly, lz + 55.0), (4.6, 0.9, 11.0), p=2.6, taper=(1.0, 0.18), rot=(0, -90, 0))
    rig.part("pennant", g, team=True, outline=1.6)

    add_death_fx(rig, 70, 110, puff_scale=1.35)


# -- clips ---------------------------------------------------------------------------
STANCE = {
    "karm_r": {"r": 14}, "kfore_r": {"r": 30}, "lance": {"r": -92},
    "karm_l": {"r": 5}, "neck": {"r": 0},
}
LEGS = ("leg_fr", "leg_fl", "leg_br", "leg_bl")


def _idle(f):
    n = 8
    b = wave(f, n)
    lag = wave(f, n, -0.15)
    return merge(STANCE, {
        "horse": {"z": 0.7 * b},
        "neck": {"r": -2.5 * lag}, "hhead": {"r": 3 * wave(f, n, 0.3)},
        "tail": {"r": 5 * wave(f, n, 0.1)},
        "ktorso": {"r": 1.2 * lag, "z": 0.4 * b},
        "lance": {"r": 1.5 * lag},
        "leg_fr": {"r": 1.0 * b}, "leg_br": {"r": -1.0 * b},
    })


def _walk(f):
    # trot: diagonal pairs move together (front-right with back-left)
    n = 8
    s = wave(f, n)
    c = wave(f, n, 0.25)
    up = lambda v: max(0.0, v)
    return merge(STANCE, {
        "horse": {"z": 1.8 * wave(f, n, 0.25, 2) - 0.8, "r": 1.5 * s},
        "leg_fr": {"r": 24 * s}, "leg_fr2": {"r": -40 * up(c)},
        "leg_bl": {"r": 20 * s}, "leg_bl2": {"r": 30 * up(-c)},
        "leg_fl": {"r": -24 * s}, "leg_fl2": {"r": -40 * up(-c)},
        "leg_br": {"r": -20 * s}, "leg_br2": {"r": 30 * up(c)},
        "neck": {"r": -3 * wave(f, n, 0.1, 2)}, "hhead": {"r": 2 * wave(f, n, 0.3, 2)},
        "tail": {"r": 8 * wave(f, n, 0.1, 2)},
        "rider": {"z": -0.9 * wave(f, n, 0.1, 2)},
        "ktorso": {"r": -1.5 * wave(f, n, 0.0, 2)},
        "lance": {"r": 2.5 * wave(f, n, -0.1, 2)},
    })


ATTACK_IMPACT = 5


def _attack(f):
    # anticipation: horse rears and the knight draws the lance back and down (f0-3);
    # lunge (f4), contact with the lance level (f5), follow-through and recovery (f6-9)
    K = lambda keys: key(f, keys)
    return {
        "body": dict(squash(K([(0, 0), (2, -0.06), (3, 0.05, "out"), (5, -0.08, "in"), (7, 0), (9, 0)])),
                     x=K([(0, 0), (3, -4), (5, 8, "in"), (6, 8), (9, 0)])),
        "horse": {"r": K([(0, 0), (3, 9, "out"), (5, -4, "in"), (7, -2), (9, 0)])},
        "leg_fr": {"r": K([(0, 0), (3, 38), (5, -14, "in"), (7, 0), (9, 0)])},
        "leg_fr2": {"r": K([(0, 0), (3, -70), (5, -10), (7, 0), (9, 0)])},
        "leg_fl": {"r": K([(0, 0), (3, 28), (5, 18), (7, 0), (9, 0)])},
        "leg_fl2": {"r": K([(0, 0), (3, -55), (5, -30), (7, 0), (9, 0)])},
        "leg_br": {"r": K([(0, 0), (3, 12), (5, -18, "in"), (7, -6), (9, 0)])},
        "leg_bl": {"r": K([(0, 0), (3, 8), (5, -10), (7, 0), (9, 0)])},
        "neck": {"r": K([(0, 0), (3, 10), (5, -14, "in"), (7, -5), (9, 0)])},
        "hhead": {"r": K([(0, 0), (3, -8), (5, 6), (9, 0)])},
        "tail": {"r": K([(0, 0), (3, -14), (5, 16), (9, 0)])},
        "ktorso": {"r": K([(0, 0), (3, 12, "out"), (4, -6, "in"), (5, -16, "in"), (6, -14), (8, -4), (9, 0)])},
        "karm_r": {"r": K([(0, 14), (3, -30), (4, 10, "in"), (5, 55, "in"), (6, 50), (8, 20), (9, 14)])},
        "kfore_r": {"r": K([(0, 30), (3, 30), (5, 30), (9, 30)])},
        "lance": {"r": K([(0, -92), (2, -100), (3, -88, "out"), (4, -122, "in"), (5, -150, "in"),
                          (6, -148), (8, -105), (9, -92)])},
        "karm_l": {"r": K([(0, 5), (3, 18), (5, -10), (9, 5)])},
    }


def _hit(f):
    a = key(f, [(0, 1.0), (1, 0.8), (2, 0.35), (3, 0.1)])
    return merge(STANCE, {
        "body": dict(squash(-0.08 * a), x=-4.0 * a),
        "horse": {"r": 5 * a},
        "neck": {"r": 14 * a}, "hhead": {"r": -8 * a},
        "ktorso": {"r": 14 * a}, "khead": {"r": 8 * a},
        "lance": {"r": 10 * a}, "karm_l": {"r": 15 * a},
    })


def _die(f):
    n, pop = 8, 2
    K = lambda keys: key(f, keys)
    body = merge(STANCE, {
        "body": dict(squash(K([(0, 0.12), (1, -0.25), (2, -0.6)])), x=K([(0, -4), (1, -8)]),
                     z=K([(0, 4), (1, 0)]), s=K([(0, 1.0), (1, 0.95), (2, 0.0, "in")])),
        "horse": {"r": K([(0, 14), (1, 4)])},
        "neck": {"r": 20}, "hhead": {"r": -10},
        "leg_fr": {"r": 40}, "leg_fl": {"r": 30}, "leg_fr2": {"r": -50},
        "ktorso": {"r": K([(0, 22), (1, 10)])}, "lance": {"r": -20}, "karm_l": {"r": 50},
    })
    return merge(body, death_fx_pose(f, pop, n))


def _pennant(fn, flutter=6.0, n=8):
    """Counter-rotate the pennant so it always streams back, with a little flutter."""
    def pose(f):
        p = fn(f)
        chain = sum(p.get(j, {}).get("r", 0.0) for j in ("horse", "ktorso", "karm_r", "kfore_r", "lance"))
        p.setdefault("pennant", {})["r"] = -chain - 8 + flutter * wave(f, n, 0.0, 2)
        return p
    return pose


def clips():
    return [
        Clip("idle", 8, _pennant(_idle, 4), loop=True),
        Clip("walk", 8, _pennant(_walk, 8), loop=True),
        Clip("attack", 10, _pennant(_attack, 10, 10), impact=ATTACK_IMPACT),
        Clip("hit", 4, _pennant(_hit, 0)),
        Clip("die", 8, _pennant(_die, 0)),
    ]
