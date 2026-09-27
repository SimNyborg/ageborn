"""Bonker: Stone Age infantry (DESIGN A5.2). Club, blunt, 68 lu.

Look (A11): chunky caveman with a big head (a third of his height), unibrow, beard, messy
hair with a bone, team-dyed pelt tunic, fur foot wraps and an oversized knobbly club.
Palette: skin and wood are kept under 40% saturation for the A11 colour rule.
"""
from ageborn_art.anim import Clip, ease, key, merge, squash, wave
from ageborn_art.fx import add_death_fx, death_fx_pose
from ageborn_art.geometry import Geo

SLUG = "bonker"
NAME = "Bonker"
HEIGHT_LU = 68
CANVAS = (208, 196)
FEET = (84, 180)
ANCHORS = {"head": (2, 66), "muzzle": (30, 30), "hitCenter": (0, 32)}

SKIN = "#EBC4A0"
HAIR = "#3B2D25"
WOOD = "#82684F"
FUR = "#75685B"
BONE = "#EDE3C8"
STONE = "#A39B90"
EYE = "#FAF6EE"
PUPIL = "#2A2320"


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, 15))
    rig.joint("torso", "hips", (0, 0, 16))
    rig.joint("head", "torso", (1, 0, 38))
    for side, y in (("r", -6.0), ("l", 6.0)):
        rig.joint(f"thigh_{side}", "hips", (0, y, 15))
        rig.joint(f"shin_{side}", f"thigh_{side}", (0.5, y, 8.5))
    for side, y in (("r", -12.5), ("l", 12.0)):
        rig.joint(f"arm_{side}", "torso", (0, y, 36))
        rig.joint(f"fore_{side}", f"arm_{side}", (1.5, y - 0.5 * (1 if y < 0 else -1), 28.5))
    rig.joint("club", "fore_r", (4.0, -13.0, 21.0))

    # legs: short and stocky, fur foot wraps
    for side, y in (("r", -6.0), ("l", 6.0)):
        g = Geo().capsule((0, y, 15), (0.5, y, 8.5), 4.7, 4.1)
        rig.part(f"thigh_{side}", g, SKIN)
        g = Geo().capsule((0.5, y, 8.5), (1.0, y, 3.8), 4.1, 3.7)
        rig.part(f"shin_{side}", g, SKIN)
        g = Geo().blob((3.2, y, 2.9), (6.6, 4.6, 3.1), p=2.6, taper=(1.0, 0.85))
        g.blob((0.8, y, 5.6), (4.4, 4.3, 2.4), p=2.4)
        rig.part(f"shin_{side}", g, FUR)

    # torso: bare chest and shoulders, team-dyed pelt tunic with a shoulder strap
    g = Geo().blob((0, 0, 29), (11.5, 9.8, 11.5), p=2.2, taper=(1.08, 0.92))
    rig.part("torso", g, SKIN)
    g = Geo().blob((0.6, 0, 22.2), (13.2, 11.4, 9.4), p=2.5, taper=(1.06, 0.94))
    for x, y in ((9, -6), (3, -11), (-5, -10), (11, 3)):  # ragged hem
        g.lathe([(3.2, 0), (0, -4.2)], (x, y, 14.2), segs=10)
    g.capsule((9.8, 6.0, 26.5), (3.5, -9.0, 38.5), 2.9, 2.9)
    rig.part("torso", g, team=True)
    g = Geo().capsule((1.0, -8.0, 24.4), (1.0, 8.0, 24.4), 2.0).capsule((11.2, -1, 25), (12.5, -1, 23), 1.6)
    rig.part("torso", g, WOOD, outline=1.8)  # belt knot hint

    # head: big, jaw forward, beard, unibrow, messy hair with a bone
    g = Geo().blob((2, 0, 50), (12, 11.5, 12), p=2.3)
    g.blob((6, 0, 44), (8.8, 9.6, 6.4), p=2.2)
    g.blob((14.2, -0.6, 48.2), (3.8, 3.4, 3.5), p=2.0)  # nose
    rig.part("head", g, SKIN)
    g = Geo().blob((6.8, 0, 41.2), (8.2, 9.9, 5.2), p=2.3)
    g.blob((-1.5, 0, 57.2), (12.6, 12.4, 7.6), p=2.2)
    g.blob((-9.5, 0, 50.5), (6.0, 11.0, 9.0), p=2.2)
    for (x0, z0), (x1, z1), r in (((-2, 60), (-4, 69), 3.6), ((4, 60), (5, 67.5), 3.2),
                                  ((-8, 58), (-14, 63.5), 3.4), ((8, 57), (12.5, 61.5), 2.8)):
        g.capsule((x0, 0, z0), (x1, -1, z1), r, 1.2)
    g.capsule((11.4, -7.2, 55.0), (11.8, 7.2, 55.0), 2.3, 2.3)  # unibrow
    rig.part("head", g, HAIR)
    g = Geo().capsule((-6, -9, 64), (6, -9, 66), 1.5).sphere((-7, -9.5, 63.5), 2.2).sphere((7, -9.5, 66.5), 2.2)
    rig.part("head", g, BONE, outline=1.4)
    for y in (-4.4, 4.4):
        g = Geo().blob((12.2, y, 51.6), (2.2, 2.3, 2.9))
        rig.part("head", g, EYE, outline=0.9, highlight=False)
        g = Geo().blob((14.0, y - 0.3, 51.2), (1.2, 1.5, 1.6))
        rig.part("head", g, PUPIL, outline=0)

    # arms, fists and a fur pauldron on the club arm
    for side, y in (("r", -12.5), ("l", 12.0)):
        yd = -0.5 if y < 0 else 0.5
        g = Geo().capsule((0, y, 36), (1.5, y + yd, 28.5), 4.5, 3.9)
        rig.part(f"arm_{side}", g, SKIN)
        g = Geo().capsule((1.5, y + yd, 28.5), (4.0, y + yd, 22.0), 3.9, 3.8)
        g.blob((4.3, y + yd, 20.4), (4.6, 4.4, 4.4), p=2.3)
        rig.part(f"fore_{side}", g, SKIN)
    g = Geo().blob((0.5, -12.0, 37.4), (6.4, 5.6, 4.8), p=2.4)
    rig.part("arm_r", g, FUR)

    # the club: along +Z from the fist, oversized head with stone studs
    cx, cy, cz = 4.0, -13.0, 21.0
    g = Geo().lathe([(0, -4.5), (2.5, -4.2), (2.6, -1), (2.7, 6), (3.6, 12), (6.2, 20), (7.8, 26),
                     (7.6, 30), (5.8, 33.5), (0, 34.6)], (cx, cy, cz), segs=16)
    rig.part("club", g, WOOD)
    g = Geo()  # bone spikes
    for d, z in (((1, 0, 0.35), 27), ((-1, 0, 0.35), 25), ((0.2, -1, 0.25), 23), ((0.3, -1, 0.5), 30.5)):
        base = (cx + d[0] * 6.5, cy + d[1] * 6.5, cz + z)
        tip = (base[0] + d[0] * 5.5, base[1] + d[1] * 5.5, base[2] + d[2] * 5.5)
        g.lathe([(2.3, 0), (1.6, 2.5), (0, 5.5)], base, tip, segs=10)
    rig.part("club", g, BONE, outline=1.5)

    add_death_fx(rig, HEIGHT_LU, 70)


# -- clips ---------------------------------------------------------------------------
# Joint angles are screen-plane, counter-clockwise positive (see rig.py). Held club
# stance: upper arm forward, forearm up, club up and a little back over the head.
STANCE = {
    "arm_r": {"r": 35}, "fore_r": {"r": 62}, "club": {"r": -140},
    "arm_l": {"r": -18}, "fore_l": {"r": 40},
    "torso": {"r": -4},
}


def _idle(f):
    n = 8
    b = wave(f, n)
    lag = wave(f, n, -0.12)
    return merge(STANCE, {
        "hips": {"z": -0.9 + 0.9 * b},
        "body": squash(0.025 * b),
        "torso": {"r": 1.5 * b},
        "head": {"r": -2.0 * lag, "z": 0.3 * lag},
        "arm_r": {"r": 3 * lag}, "club": {"r": -4 * lag},
        "arm_l": {"r": -4 * lag},
    })


def _walk(f):
    n = 8
    s = wave(f, n)            # leg phase
    c = wave(f, n, 0.25)
    lift = lambda v: max(0.0, v)
    return merge(STANCE, {
        "hips": {"z": 1.4 * wave(f, n, 0.25, 2) - 0.6},
        "torso": {"r": -6 + 2 * wave(f, n, 0.25, 2), "rz": 5 * s},
        "head": {"r": -1.5 * wave(f, n, 0.1, 2)},
        "thigh_r": {"r": 30 * s}, "shin_r": {"r": -38 * lift(c)},
        "thigh_l": {"r": -30 * s}, "shin_l": {"r": -38 * lift(-c)},
        "arm_l": {"r": 26 * s}, "fore_l": {"r": 8 * lift(s)},
        "arm_r": {"r": -8 * s}, "club": {"r": 4 * c},
    })


ATTACK_IMPACT = 5


def _attack(f):
    # anticipation f0-3 (squash then stretch back), smear f4, contact f5, follow-through f6-9
    K = lambda keys: key(f, keys)
    arm = K([(0, 22), (2, 70), (3, 130, "out"), (4, 60, "in"), (5, 12, "in"), (6, 0), (8, 16), (9, 22)])
    fore = K([(0, 72), (3, 55), (4, 30), (5, 18), (6, 12), (8, 50), (9, 72)])
    club = K([(0, -78), (2, -55), (3, -48), (4, -95, "in"), (5, -118, "in"), (6, -122), (8, -95), (9, -78)])
    torso = K([(0, -4), (2, 10), (3, 16, "out"), (4, -12, "in"), (5, -24, "in"), (6, -22), (8, -8), (9, -4)])
    sq = K([(0, 0), (1, -0.1), (3, 0.1, "out"), (4, 0.02), (5, -0.12, "in"), (6, -0.08), (8, 0.0), (9, 0)])
    lean_x = K([(0, 0), (3, -3), (5, 6, "in"), (6, 6), (9, 0)])
    return {
        "body": dict(squash(sq), x=lean_x),
        "hips": {"z": K([(0, 0), (3, 0.5), (5, -2.2), (7, -1), (9, 0)])},
        "torso": {"r": torso},
        "head": {"r": K([(0, 0), (3, 6), (5, -8), (7, -3), (9, 0)])},
        "arm_r": {"r": arm}, "fore_r": {"r": fore}, "club": {"r": club},
        "arm_l": {"r": K([(0, -18), (3, 30), (5, -45), (7, -30), (9, -18)])},
        "fore_l": {"r": K([(0, 40), (3, 60), (5, 20), (9, 40)])},
        "thigh_r": {"r": K([(0, 0), (3, -6), (5, 16), (7, 12), (9, 0)])},
        "shin_r": {"r": K([(0, 0), (5, -14), (9, 0)])},
        "thigh_l": {"r": K([(0, 0), (3, 6), (5, -14), (7, -10), (9, 0)])},
        "shin_l": {"r": K([(0, 0), (5, -4), (9, 0)])},
    }


def _hit(f):
    k = [(0, 1.0), (1, 0.8), (2, 0.35), (3, 0.1)]
    a = key(f, k)
    return merge(STANCE, {
        "body": dict(squash(-0.12 * a), x=-4.0 * a),
        "torso": {"r": 14 * a},
        "head": {"r": 12 * a},
        "arm_r": {"r": 18 * a}, "club": {"r": 12 * a},
        "arm_l": {"r": 30 * a},
    })


def _die(f):
    n, pop = 8, 2
    K = lambda keys: key(f, keys)
    body = {
        "body": dict(squash(K([(0, 0.18), (1, -0.3), (2, -0.6)])), x=K([(0, -4), (1, -7)]),
                     z=K([(0, 3), (1, 0)]), s=K([(0, 1.0), (1, 0.95), (2, 0.0, "in")])),
        "torso": {"r": K([(0, 20), (1, 8)])},
        "head": {"r": K([(0, 16), (1, -10)])},
        "arm_r": {"r": 70}, "fore_r": {"r": 30}, "club": {"r": -30},
        "arm_l": {"r": 80}, "fore_l": {"r": 40},
    }
    return merge(body, death_fx_pose(f, pop, n))


def clips():
    return [
        Clip("idle", 8, _idle, loop=True),
        Clip("walk", 8, _walk, loop=True),
        Clip("attack", 10, _attack, impact=ATTACK_IMPACT),
        Clip("hit", 4, _hit),
        Clip("die", 8, _die),
    ]
