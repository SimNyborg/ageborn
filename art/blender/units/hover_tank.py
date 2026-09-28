"""Hover Tank: Cosmic Age heavy (docs/design-lane-ages.md A17.11). Plasma cannon (proj.plasma, range
90), blast damage, armored mech. Hovers but is a ground unit. ~100 lu with the pennant.

Look (A17.12 vehicle rig, Cosmic palette): a low wedge hull with no wheels, floating on four
glowing hover pads. The upper hull is star white with a sloped violet nose and a void belly
skirt; big team side panels run the length of the hull. A low violet turret with team cheeks
carries a long plasma cannon: a star-white barrel with three mint coil rings and a violet
emitter ring at the muzzle. Under the hull each pad is a void disc with a mint glow ring and a
short mint thrust cone; a thin shadow gap shows between the pads and the ground. An antenna at
the back of the turret flies a team pennant (the heavies' team cue).

Idle bobs the hull on its pads (the cones pulse); walk glides with a nose-down pitch and
flickering cones (an `odo` joint gives the game the natural speed, 55 lu/s); the attack charges
a plasma ball at the muzzle, fires with a big mint flash, the barrel slides back, the hull
rocks back and the pads flare; hit rocks the hull; the death kills the pads so the hull drops,
tilts and smokes. The shell spawns at the per-frame `muzzle` anchor.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "hover_tank"
NAME = "Hover Tank"
HEIGHT_LU = 112
YAW_DEG = -10.0
CANVAS = (500, 340)
FEET = (214, 312)
ANCHORS = {"head": (0, 100), "hitCenter": (0, 36)}
SCALE = 1.25              # the whole vehicle: the Heavy reads big next to 68 lu infantry

HOVER = 16.0                  # hull bottom above the ground
TURRET = (-6.0, 0.0, 40.0)
BARREL_Z = 44.0
MUZZLE = (62.0, -1.0, BARREL_Z)
PADS = ((-26.0, -16.0), (24.0, -16.0), (-26.0, 16.0), (24.0, 16.0))
SPEED = 55.0                  # sim speed, lu/s


def build(rig):
    rig.joint("body", "root", (0, 0, 0), scale=SCALE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, HOVER + 10.0))
    rig.joint("turret", "hull", TURRET)
    rig.joint("barrel", "turret", (8.0, 0, BARREL_Z))

    # hover pads (far pads first), each with a pulsing thrust cone
    for i, (x, y) in enumerate(sorted(PADS, key=lambda p: -p[1])):
        j = f"pad{i}"
        rig.joint(j, "hull", (x, y, HOVER))
        g = Geo().lathe([(0, -1.6), (9.0, -1.6), (10.0, 0.4), (8.6, 2.6), (0, 2.8)], (x, y, HOVER),
                        (x, y, HOVER + 1), segs=24, squash=(1.0, 0.7))
        rig.part(j, g, K.VOID_LT, finish="gloss")
        g = Geo().lathe([(6.8, -0.6), (9.2, -0.4), (9.2, 0.4), (6.8, 0.6)], (x, y - 0.4, HOVER - 1.8),
                        (x, y - 0.4, HOVER - 0.8), segs=24, squash=(1.0, 0.7))
        rig.part(j, g, glow=K.MINT, outline=0)
        rig.joint(f"cone{i}", j, (x, y, HOVER - 2.0))
        g = Geo().lathe([(8.6, 0), (7.0, 3.0), (4.0, 6.4), (0, 8.0)], (x, y, HOVER - 2.0), (x, y, HOVER - 3.0),
                        segs=16, squash=(1.0, 0.7))
        rig.part(f"cone{i}", g, glow="#9CF3D8", outline=0)
        g = Geo().lathe([(3.6, 0), (2.4, 4.0), (0, 7.0)], (x, y - 1.0, HOVER - 2.2), (x, y - 1.0, HOVER - 3.2),
                        segs=12, squash=(1.0, 0.7))
        rig.part(f"cone{i}", g, glow=K.MINT_CORE, outline=0)

    # hull: void belly skirt, star-white upper deck, sloped violet nose, team side panels
    hz = HOVER + 10.0
    g = Geo().blob((0, 0, hz - 3.0), (44.0, 21.0, 6.0), p=4.0, taper=(0.9, 1.0))
    rig.part("hull", g, K.VOID, finish="gloss")
    g = Geo().blob((-4.0, 0, hz + 5.0), (40.0, 19.0, 7.0), p=4.2, taper=(1.0, 0.86))
    rig.part("hull", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((33.0, 0, hz + 1.8), (16.0, 18.0, 6.8), p=3.2, rot=(0, 18, 0), taper=(1.0, 0.7))
    rig.part("hull", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().blob((47.0, -8.0, hz - 0.5), (1.6, 3.0, 1.6), p=2.4)
    g.blob((47.0, 8.0, hz - 0.5), (1.6, 3.0, 1.6), p=2.4)
    rig.part("hull", g, glow=K.MINT, outline=0.8, outline_hex=K.VOID)
    for s in (-1, 1):
        g = Geo().blob((-8.0, s * 20.2, hz + 1.8), (30.0, 2.2, 6.4), p=4.0, taper=(1.0, 0.9))
        rig.part("hull", g, team=True)
        g = Geo().blob((-8.0, s * 21.0, hz - 3.6), (31.0, 1.6, 1.3), p=3.6)
        rig.part("hull", g, K.VIOLET_LT, finish="gloss", outline=0.6)
    g = Geo().blob((-40.0, 0, hz + 3.0), (5.0, 17.0, 7.0), p=3.6)            # rear engine block
    rig.part("hull", g, K.VOID_LT, finish="gloss")
    g = Geo()
    for y in (-10.0, 0.0, 10.0):
        g.blob((-45.2, y, hz + 3.4), (1.0, 3.2, 3.6), p=2.4)
    rig.part("hull", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    # top team stripe down the deck
    g = Geo().blob((-4.0, 0, hz + 11.6), (34.0, 5.0, 1.2), p=3.8)
    rig.part("hull", g, team=True, outline=0.6)

    # turret: low violet dome with team cheeks, a sensor, the antenna with the pennant
    tx, ty, tz = TURRET
    g = Geo().blob((tx, ty, tz + 1.0), (19.0, 15.0, 8.0), p=2.6, taper=(1.05, 0.8))
    rig.part("turret", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    for s in (-1, 1):
        g = Geo().blob((tx - 1.0, s * 11.6, tz + 1.0), (12.0, 3.4, 5.0), p=3.0)
        rig.part("turret", g, team=True)
    g = Geo().blob((tx + 6.0, -6.0, tz + 8.4), (4.2, 3.2, 2.2), p=2.6)
    rig.part("turret", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((tx + 10.0, -6.2, tz + 8.4), (0.8, 2.2, 1.2), p=2.4)
    rig.part("turret", g, glow=K.MINT, outline=0)
    K.pennant(rig, "turret", (tx - 14.0, 6.0, tz + 5.0), 40.0, length=18.0, w=9.5)

    # the plasma cannon, along +X
    bx = 8.0
    g = Geo().blob((bx + 2.0, 0, BARREL_Z), (6.0, 5.0, 4.6), p=3.0)        # mantlet
    rig.part("barrel", g, K.VOID_LT, finish="gloss")
    g = Geo().lathe([(3.6, 0), (3.4, 40.0), (0, 40.2)], (bx + 4.0, -1.0, BARREL_Z), (MUZZLE[0], -1.0, BARREL_Z),
                    segs=16)
    rig.part("barrel", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    for x in (20.0, 27.0, 34.0):
        g.lathe([(0, -1.0), (4.8, -0.9), (5.1, 0), (4.8, 0.9), (0, 1.0)], (x, -1.0, BARREL_Z), (x + 1, -1.0, BARREL_Z),
                segs=18)
    rig.part("barrel", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)
    g = Geo().lathe([(0, -0.5), (4.6, -0.4), (5.6, 2.0), (5.2, 5.0), (3.2, 5.4), (0, 5.4)], (MUZZLE[0] - 6.0, -1.0, BARREL_Z),
                    (MUZZLE[0], -1.0, BARREL_Z), segs=18)
    rig.part("barrel", g, K.VOID_LT, finish="gloss")
    g = Geo().lathe([(3.2, 0), (5.8, 0.2), (5.8, 1.6), (3.2, 1.8)], (MUZZLE[0] - 1.4, -1.0, BARREL_Z),
                    (MUZZLE[0] + 1.0, -1.0, BARREL_Z), segs=18)
    rig.part("barrel", g, glow=K.VIOLET_GLOW, outline=0.8, outline_hex=K.VIOLET)
    rig.track("muzzle", "barrel", MUZZLE)

    mx, my, mz = MUZZLE
    K.orb(rig, "barrel", (mx + 1.0, my - 1, mz), 3.6, name="charge", hidden=True, line="#1C8A6A")
    rig.joint("flash", "barrel", MUZZLE, hidden=True)
    g = Geo().star((mx + 6.0, my - 4, mz), 13.0, 4.6, 1.4, points=6)
    rig.part("flash", g, glow=K.MINT, outline=0)
    g = Geo().blob((mx + 12.0, my - 3, mz), (12.0, 1.6, 3.6), p=2.0)
    rig.part("flash", g, glow=K.MINT, outline=0)
    g = Geo().sphere((mx + 4.0, my - 6, mz), 5.0, cuts=3)
    rig.part("flash", g, glow=K.MINT_CORE, outline=0)
    # smoke / vapour (left in place: parented to the body)
    rig.joint("smoke", "body", (mx + 10, -12, BARREL_Z + 10), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 6.0), (7, 3, 4.8), (-4, 5, 4.4), (4, 8, 4.0), (11, -2, 3.6)):
        g.sphere((mx + 10 + dx, -12, BARREL_Z + 10 + dz), r, cuts=4)
    rig.part("smoke", g, K.SMOKE, finish="dust", outline=0.8)
    rig.joint("wreck", "body", (-10, -24, 40), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 7.0), (8, 5, 5.6), (-6, 7, 5.0), (3, 12, 4.4)):
        g.sphere((-10 + dx, -24, 40 + dz), r, cuts=4)
    rig.part("wreck", g, "#8C869A", finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ---------------------------------------------------------------------------------
def _cones(k, flicker=None):
    pose = {}
    for i in range(4):
        v = k * (1.0 if flicker is None else flicker[i % len(flicker)])
        pose[f"cone{i}"] = {"sz": max(0.05, v), "s": 0.9 + 0.1 * min(1.2, v)}
    return pose


def _idle(f):
    c, lag = K.idle_wave(f)
    return merge(_cones(1.0 + 0.18 * c), {
        "hull": dict(squash(0.012 * c), z=1.6 * c, r=0.5 * lag),
        "turret": {"r": 0.6 * lag},
        "barrel": {"r": 0.8 * lag},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    a = SPEED * 0.5 / 4.0          # odo amplitude: stride = 4a per 0.5 s cycle = sim speed (odo is unscaled)
    return merge(_cones(1.15, [1.0 + 0.2 * math.sin(p + k) for k in (0, 1.6, 3.1, 4.7)]), {
        "odo": {"x": a * math.cos(p)},
        "hull": dict(z=1.2 * math.sin(2 * p) + 0.6, r=-2.2 + 0.6 * math.sin(p)),
        "turret": {"r": 0.8 * math.sin(p - 0.8)},
        "barrel": {"r": 1.0 * math.sin(p - 1.2)},
    })


ATTACK_MS = [83, 83, 125, 83, 125, 83, 83, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 lift the barrel, 1-2 charge (plasma ball grows, held), 3 FIRE: flash, barrel back,
    # hull rocks back, pads flare; 4 held recoil, vapour; 5 barrel returns; 6 rock forward; 7 settle
    return merge(_cones(pick(f, [1.0, 0.9, 0.8, 1.7, 1.5, 1.2, 1.0, 1.0])), {
        "body": dict(squash(pick(f, [0, -0.02, -0.04, 0.05, -0.06, -0.02, 0.02, 0])),
                     x=pick(f, [0, 0.5, 1.0, -3.0, -5.0, -3.5, -1.0, 0])),
        "hull": {"r": pick(f, [0, -0.8, -1.2, 3.5, 4.5, 2.0, -1.2, 0]),
                 "z": pick(f, [0, -0.5, -1.0, 2.0, 1.5, 0.5, 0, 0])},
        "turret": {"r": pick(f, [0.5, 1.0, 1.0, 2.0, 1.5, 1.0, 0.3, 0])},
        "barrel": {"x": pick(f, [0, 0, 0, -7.0, -6.0, -2.5, 0, 0]),
                   "r": pick(f, [2, 3, 3, 4, 4, 2, 1, 0]),
                   "sz": pick(f, [1, 1, 1, 1.12, 1.04, 1, 1, 1])},
        "charge": {"show": f in (1, 2), "s": pick(f, [0, 0.6, 1.2, 0, 0, 0, 0, 0])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.8, 1.1, 1.3, 1]),
                  "x": pick(f, [0, 0, 0, 0, -6, 0, 4, 0]), "z": pick(f, [0, 0, 0, 0, -6, 0, 5, 0])},
    })


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(_cones(1.0 - 0.4 * a), {"body": dict(squash(-0.06 * a), x=-4.0 * a),
                                         "hull": {"r": 5.0 * a, "z": -2.0 * a}, "turret": {"r": 2 * a}})


def _die(f):
    # the pads cut out: the hull drops onto the ground, tilts nose-up and smokes
    body = [{"x": -3.0, "z": 2.0, "r": 5.0, "sz": 1.04, "sx": 0.98, "sy": 0.98},
            {"x": -5.0, "z": -HOVER * SCALE + 2.0, "r": 3.0, "sz": 0.78, "sx": 1.08, "sy": 1.08},
            {"x": -5.0, "z": -HOVER * SCALE + 2.0, "r": 2.0, "s": 0.88, "sz": 0.6, "sx": 1.12, "sy": 1.12}][f]
    return merge(_cones(0.05), {"body": body}, {
        "turret": {"z": pick(f, [6, 9, 5]), "r": pick(f, [12, 22, 16]), "x": pick(f, [-2, -4, -5])},
        "barrel": {"r": pick(f, [-8, -18, -24])},
        "wreck": {"show": True, "s": pick(f, [0.7, 1.0, 1.2]), "z": pick(f, [0, 4, 8])},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
