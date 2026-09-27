"""Pulse Trooper: Future Age ranged (DESIGN A5.6). Plasma bolt, laser damage, ~70 lu.

Look (A11): charcoal undersuit, white armour, a big helmet with a mint visor, team chest
plate, team shoulder pads and a team helmet crest; an oversized white-and-charcoal plasma
rifle with mint coils and a magenta muzzle ring. The attack charges a mint glow at the
muzzle, fires with a flash and recoil. The projectile itself is proj.plasma (separate).
"""
from ageborn_art.anim import Clip, key, merge, squash, wave
from ageborn_art.fx import add_death_fx, death_fx_pose
from ageborn_art.geometry import Geo

SLUG = "pulse_trooper"
NAME = "Pulse Trooper"
HEIGHT_LU = 70
CANVAS = (232, 196)
FEET = (84, 182)
ANCHORS = {"head": (2, 68), "muzzle": (46, 34), "hitCenter": (0, 32)}

SUIT = "#2E323C"
ARMOR = "#E9EDF2"
TRIM = "#A9B1BD"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
MAGENTA = "#F03AA8"
VISOR_DARK = "#1B1E25"


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, 16))
    rig.joint("torso", "hips", (0, 0, 18))
    rig.joint("head", "torso", (1, 0, 40))
    for side, y in (("r", -5.8), ("l", 5.8)):
        rig.joint(f"thigh_{side}", "hips", (0, y, 16))
        rig.joint(f"shin_{side}", f"thigh_{side}", (0.5, y, 9.5))

    # legs: charcoal suit, big white boots with a mint light
    for side, y in (("r", -5.8), ("l", 5.8)):
        g = Geo().capsule((0, y, 16), (0.5, y, 9.5), 4.4, 3.9)
        rig.part(f"thigh_{side}", g, SUIT)
        g = Geo().capsule((0.5, y, 9.5), (1.0, y, 5.0), 3.8, 3.6)
        rig.part(f"shin_{side}", g, SUIT)
        g = Geo().blob((2.8, y, 3.2), (7.0, 4.8, 3.4), p=3.0, taper=(1.05, 0.85))
        g.blob((0.8, y, 7.0), (4.6, 4.5, 3.0), p=2.6)
        rig.part(f"shin_{side}", g, ARMOR, finish="gloss")

    # torso: suit, team chest plate, belt with a light, backpack power cell
    g = Geo().blob((0, 0, 28), (9.8, 9.6, 11.2), p=2.4, taper=(0.95, 1.05))
    g.blob((0, 0, 17.5), (8.8, 9.2, 4.2), p=2.6)
    rig.part("torso", g, SUIT)
    g = Geo().blob((1.8, 0, 32.2), (9.6, 10.4, 7.4), p=3.0, taper=(0.9, 1.0))
    rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 21.8), (10.2, 10.2, 2.4), p=3.4)
    rig.part("torso", g, TRIM, outline=1.8)
    g = Geo().blob((10.4, -2.0, 21.8), (1.4, 2.4, 1.4), p=2.4)
    rig.part("torso", g, glow=MINT, outline=1.0, outline_hex=SUIT)
    g = Geo().blob((-11.0, 0, 31), (4.4, 8.2, 8.6), p=4.0)
    rig.part("torso", g, SUIT)
    g = Geo().capsule((-15.2, -4.5, 26.5), (-15.2, -4.5, 35.5), 1.7).capsule((-15.2, 1.5, 26.5), (-15.2, 1.5, 35.5), 1.7)
    rig.part("torso", g, glow=MINT, outline=1.0, outline_hex=SUIT)

    # helmet: white dome, wide mint visor, team crest, antenna with a magenta tip
    g = Geo().blob((2, 0, 51), (11.4, 11.0, 11.6), p=2.5)
    g.blob((0, 0, 42.2), (7.5, 7.5, 3.2), p=2.4)
    rig.part("head", g, ARMOR, finish="gloss")
    g = Geo().blob((9.6, 0, 49.8), (4.4, 9.0, 4.6), p=3.2, rot=(0, 0, 0))
    rig.part("head", g, VISOR_DARK, finish="gloss", outline=1.6, outline_hex=SUIT)
    g = Geo().blob((11.6, -0.4, 50.4), (2.6, 7.6, 2.6), p=3.0)
    rig.part("head", g, glow=MINT, outline=0)
    g = Geo().blob((-3.5, -10.4, 50.0), (4.4, 2.0, 4.4), p=2.4)  # ear pod
    rig.part("head", g, SUIT, outline=1.6)
    g = Geo().blob((-3.5, -12.2, 50.0), (1.7, 0.8, 1.7), p=2.2)
    rig.part("head", g, glow=MINT, outline=0)
    g = Geo().blob((-0.5, 0, 61.4), (10.8, 3.2, 3.0), p=2.8, rot=(0, -8, 0))
    rig.part("head", g, team=True, outline=2.2)
    g = Geo().capsule((-8, 7.5, 54), (-12, 8.5, 66), 0.9)
    rig.part("head", g, SUIT, outline=1.0)
    g = Geo().sphere((-12.2, 8.6, 67), 2.0, cuts=3)
    rig.part("head", g, glow=MAGENTA, outline=1.0, outline_hex=MAGENTA)

    # far arm reaches the foregrip; near arm holds the grip. Arms are modelled in the
    # holding pose, so clips only add small deltas.
    rig.joint("arm_l", "torso", (0, 11, 37))
    g = Geo().capsule((0, 11, 37), (3, 11, 29), 3.9, 3.5).capsule((3, 11, 29), (15, 2, 31), 3.5, 3.3)
    rig.part("arm_l", g, SUIT)
    g = Geo().blob((0.5, 11.6, 38.4), (6.6, 5.6, 5.4), p=2.6)
    rig.part("torso", g, team=True)
    rig.joint("arm_r", "torso", (0, -11.5, 37))
    rig.joint("gun", "arm_r", (5, -11, 30))
    g = Geo().capsule((0, -11.5, 37), (-1.5, -12, 29), 4.0, 3.6).capsule((-1.5, -12, 29), (4.5, -11, 29.5), 3.6, 3.4)
    rig.part("arm_r", g, SUIT)
    g = Geo().blob((0.5, -12.2, 38.4), (6.8, 5.8, 5.6), p=2.6)
    rig.part("arm_r", g, team=True)

    # the plasma rifle, along +X from the grip
    gx, gy, gz = 5, -11, 30
    g = Geo().blob((gx + 10, gy + 1, gz + 3.5), (13.5, 3.4, 4.2), p=3.6)  # receiver
    g.blob((gx - 6, gy + 1, gz + 2.5), (5.5, 2.6, 3.8), p=3.4, rot=(0, 10, 0))  # stock
    g.blob((gx + 0.5, gy + 1, gz - 1.5), (2.2, 2.0, 4.2), p=2.8, rot=(0, -12, 0))  # grip
    g.blob((gx + 13, gy + 2, gz - 1.0), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))  # foregrip
    rig.part("gun", g, SUIT, outline=2.4)
    g = Geo().blob((gx + 12, gy + 1, gz + 7.0), (11.5, 3.0, 2.4), p=3.4)  # top shroud
    g.lathe([(3.4, 0), (3.6, 4), (3.0, 12), (0, 12.2)], (gx + 23, gy + 1, gz + 3.5), (gx + 40, gy + 1, gz + 3.5), segs=14)
    rig.part("gun", g, ARMOR, finish="gloss", outline=2.4, outline_hex=TRIM)
    g = Geo()
    for x in (gx + 17.5, gx + 21, gx + 24.5):
        g.lathe([(0, -0.7), (4.3, -0.6), (4.3, 0.6), (0, 0.7)], (x, gy + 1, gz + 3.5), (x + 1, gy + 1, gz + 3.5), segs=16)
    rig.part("gun", g, glow=MINT, outline=1.2, outline_hex=SUIT)
    g = Geo().lathe([(2.2, 0), (4.1, 0.2), (4.1, 2.4), (2.4, 2.6)], (gx + 34.5, gy + 1, gz + 3.5), (gx + 40, gy + 1, gz + 3.5), segs=16)
    rig.part("gun", g, MAGENTA, outline=1.4)
    g = Geo().blob((gx + 13, gy + 1.6, gz + 1.6), (3.6, 2.4, 3.2), p=2.6)  # far hand on the foregrip
    g.blob((gx + 0.6, gy - 0.6, gz + 1.8), (3.6, 3.2, 3.4), p=2.6)  # near hand on the grip
    rig.part("gun", g, ARMOR, finish="gloss", outline=1.8, outline_hex=TRIM)

    # muzzle charge and flash (hidden unless a clip shows them)
    mx = (gx + 38.5, gy + 1, gz + 3.5)
    rig.joint("charge", "gun", mx, hidden=True)
    g = Geo().sphere(mx, 3.2, cuts=4)
    rig.part("charge", g, glow=MINT_CORE, outline=1.6, outline_hex=MINT)
    rig.joint("flash", "gun", (mx[0] + 2, mx[1], mx[2]), hidden=True)
    g = Geo().star((mx[0] + 5, mx[1] - 2, mx[2]), 9.0, 4.2, 2.0, points=6)
    rig.part("flash", g, glow=MINT, outline=0)
    g = Geo().sphere((mx[0] + 4, mx[1] - 3, mx[2]), 3.8, cuts=4)
    rig.part("flash", g, glow="#FFFFFF", outline=0)

    add_death_fx(rig, HEIGHT_LU, 72)


# -- clips ---------------------------------------------------------------------------
STANCE = {"gun": {"r": -6}, "arm_r": {"r": 2}, "arm_l": {"r": 2}}


def _idle(f):
    n = 8
    b = wave(f, n)
    lag = wave(f, n, -0.12)
    return merge(STANCE, {
        "hips": {"z": -0.7 + 0.7 * b},
        "body": squash(0.02 * b),
        "torso": {"r": 1.0 * b},
        "head": {"r": -1.5 * lag},
        "gun": {"r": 2.0 * lag},
        "arm_l": {"r": 1.5 * lag},
    })


def _walk(f):
    n = 8
    s = wave(f, n)
    c = wave(f, n, 0.25)
    up = lambda v: max(0.0, v)
    return merge(STANCE, {
        "hips": {"z": 1.3 * wave(f, n, 0.25, 2) - 0.5},
        "torso": {"r": -4 + 1.5 * wave(f, n, 0.25, 2), "rz": 4 * s},
        "head": {"r": -1.2 * wave(f, n, 0.1, 2)},
        "thigh_r": {"r": 30 * s}, "shin_r": {"r": -38 * up(c)},
        "thigh_l": {"r": -30 * s}, "shin_l": {"r": -38 * up(-c)},
        "gun": {"r": 2.0 * wave(f, n, 0.1, 2)},
    })


ATTACK_IMPACT = 4


def _attack(f):
    # raise and brace (f0-1), charge glows (f2-3), fire with a flash and recoil (f4),
    # follow-through (f5-6), settle (f7-8)
    K = lambda keys: key(f, keys)
    return {
        "body": dict(squash(K([(0, 0), (2, -0.05), (3, -0.07), (4, 0.06, "out"), (5, 0.0), (8, 0)])),
                     x=K([(0, 0), (3, 1.0), (4, -3.5, "out"), (6, -2), (8, 0)])),
        "torso": {"r": K([(0, 0), (2, -4), (3, -5), (4, 7, "out"), (5, 5), (7, 1), (8, 0)])},
        "head": {"r": K([(0, 0), (3, -2), (4, 5), (6, 2), (8, 0)])},
        "gun": {"r": K([(0, -6), (2, 1), (3, 0), (4, 16, "out"), (5, 10), (7, -2), (8, -6)]),
                "x": K([(0, 0), (3, 0), (4, -3.0, "out"), (6, -1), (8, 0)])},
        "arm_r": {"r": K([(0, 2), (2, 6), (4, 10), (6, 4), (8, 2)])},
        "arm_l": {"r": K([(0, 2), (2, 6), (4, 12), (6, 4), (8, 2)])},
        "thigh_r": {"r": K([(0, 0), (3, 6), (4, 2), (8, 0)])},
        "thigh_l": {"r": K([(0, 0), (3, -6), (4, -9), (8, 0)])},
        "charge": {"show": 1 <= f <= 3, "s": K([(1, 0.35), (2, 0.8), (3, 1.25)])},
        "flash": {"show": 4 <= f <= 5, "s": K([(4, 1.2), (5, 0.55)]), "r": 15 * (f - 4)},
    }


def _hit(f):
    a = key(f, [(0, 1.0), (1, 0.8), (2, 0.35), (3, 0.1)])
    return merge(STANCE, {
        "body": dict(squash(-0.1 * a), x=-4.0 * a),
        "torso": {"r": 13 * a},
        "head": {"r": 10 * a},
        "gun": {"r": 14 * a},
    })


def _die(f):
    n, pop = 8, 2
    K = lambda keys: key(f, keys)
    body = merge(STANCE, {
        "body": dict(squash(K([(0, 0.16), (1, -0.3), (2, -0.6)])), x=K([(0, -4), (1, -7)]),
                     z=K([(0, 3), (1, 0)]), s=K([(0, 1.0), (1, 0.95), (2, 0.0, "in")])),
        "torso": {"r": K([(0, 20), (1, 8)])},
        "head": {"r": K([(0, 16), (1, -10)])},
        "gun": {"r": 40},
    })
    return merge(body, death_fx_pose(f, pop, n))


def clips():
    return [
        Clip("idle", 8, _idle, loop=True),
        Clip("walk", 8, _walk, loop=True),
        Clip("attack", 9, _attack, impact=ATTACK_IMPACT),
        Clip("hit", 4, _hit),
        Clip("die", 8, _die),
    ]
