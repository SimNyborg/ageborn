"""Tuskback: Stone Age heavy (DESIGN A5.2), quadruped rig (A11). A war boar, gore attack, ~104 lu.

Look (A11): a hulking, round war boar with a huge shoulder hump, a bristly black mane ridge,
a low wedge head with a pale snout disc, small angry eyes and two oversized curved ivory
tusks (the weapon). It wears a team war blanket strapped over its back under three grey
stone armour plates (the armored tag), and a tall team pennant on a pole (every Heavy
carries a pennant, A11). Short stout legs with dark hooves; a curly tail and the pennant
follow through. The attack is a gore: dip the head and dig in, hold low, then a smeared
upward head toss with the tusks at the top (held impact), and recovery.
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad, trot

SLUG = "tuskback"
NAME = "Tuskback"
HEIGHT_LU = 104
YAW_DEG = -10.0
CANVAS = (384, 284)
FEET = (184, 264)
ANCHORS = {"head": (0, 100), "hitCenter": (0, 42)}

FUR = "#7D6858"
FUR_DK = "#5E4F43"
BELLY = "#9A8573"
MANE = "#3F352F"
SNOUT = "#C4A898"
NOSTRIL = "#4A3A34"
HOOF = "#3F3A35"
IVORY = "#EDE3C8"
STONE = "#8E8A80"
STONE_DK = "#6F6B63"
STRAP = "#6B5646"
WOOD = "#8A7560"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2A2A"

TUSK_TIP = (61.0, -8.5, 57.0)
BODY_SCALE = 1.12


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    g = Geo().capsule(p0, p1, 8.6 if front else 9.4, 6.4)
    rig.part(f"leg_{name}", g, FUR if y < 0 else FUR_DK)
    g = Geo().capsule(p1, (x1 + 0.5, y, 6.0), 6.4, 5.4)
    rig.part(f"leg_{name}2", g, FUR if y < 0 else FUR_DK)
    g = Geo().blob((x1 + 1.8, y, 3.2), (6.8, 6.0, 3.6), p=2.8, taper=(1.05, 0.85))
    g.clip((x1 + 1.8, y, 3.2), (0, 0, 1), fill=True)
    g.blob((x1 + 1.2, y, 4.2), (6.4, 5.8, 2.6), p=2.4)
    rig.part(f"leg_{name}2", g, HOOF)


def build(rig):
    q = Quad(rig, trunk=(0, 38), front_x=16.0, back_x=-16.0, leg_y=9.0, shoulder_z=40.0,
             hip_z=40.0, knee_z=18.0, hock_z=18.0, knee_dx=1.5, hock_dx=-1.5, far_dx=-3.0)
    rig.rest_scale["body"] = BODY_SCALE   # a heavy: bulkier than the Medieval destrier
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")

    # barrel, shoulder hump and haunch; a paler belly
    g = Geo().blob((0, 0, 44), (25, 16.5, 18), p=2.3)
    g.blob((10, 0, 56), (17, 15, 15), p=2.2)                 # shoulder hump
    g.blob((-15, 0, 46), (13, 15.5, 15), p=2.2)              # haunch
    rig.part("trunk", g, FUR)
    g = Geo().blob((2, 0, 33), (19, 12.5, 7), p=2.4)
    rig.part("trunk", g, BELLY)
    # bristly mane ridge along the spine, spikes leaning back
    g = Geo()
    for i in range(7):
        t = i / 6
        x = 20 - 40 * t
        z = 69 - 10 * t - 6 * t * t
        g.lathe([(4.4, 0), (3.0, 4.0), (0, 12.0 - 3 * t)], (x, 0, z - 3),
                (x - 6.0, 0, z + 8.0 - 3 * t), segs=10, squash=(1.0, 0.7))
    rig.part("trunk", g, MANE, finish="hair")
    # team war blanket, straps and three stone plates (the armour)
    g = Geo().blob((-2, 0, 48), (24.5, 17.8, 17.5), p=3.0, taper=(1.02, 0.96))
    g.clip((0, 0, 33.0), (0, 0, -1))
    g.clip((20.0, 0, 0), (1, 0, 0))
    g.clip((-24.0, 0, 0), (-1, 0, 0))
    for x in (-20.0, -12.0, -4.0, 4.0, 12.0):   # tassels along the hem
        g.lathe([(2.2, 0), (0, -4.2)], (x, -15.5, 33.2), segs=8)
    rig.part("trunk", g, team=True)
    g = Geo()
    for x in (-14.0, 14.0):
        g.lathe([(0, -0.1), (17.6, 0), (18.4, 2.4), (0, 2.5)], (x, 0, 50), (x + 1, 0, 50), segs=24,
                squash=(1.1, 1.08))
    g.clip((0, 0, 33.0), (0, 0, -1))
    rig.part("trunk", g, STRAP, outline=0.8)
    g = Geo()
    g.blob((16.0, -14.0, 55.0), (10.5, 3.6, 9.0), p=3.0, rot=(-28, 0, 0))   # shoulder plate
    g.blob((-17.0, -13.0, 56.0), (8.6, 3.4, 7.2), p=3.0, rot=(-30, 0, 0))   # haunch plate
    g.blob((1.0, 0, 64.5), (9.0, 11.0, 3.2), p=3.2)                          # saddle stone
    rig.part("trunk", g, STONE)
    g = Geo()
    for x, z in ((12.0, 58.0), (20.0, 58.0), (16.0, 50.0), (-17.0, 58.5), (-17.0, 51.5)):
        g.sphere((x, -17.2 + (z - 50) * 0.3, z), 1.5, cuts=2)
    rig.part("trunk", g, STONE_DK, outline=0)

    # the pennant pole behind the plates; the team pennant flies off the top
    g = Geo().capsule((-7, 3.5, 58), (-11, 3.5, 104), 1.4, 1.2)
    g.sphere((-11.2, 3.5, 105.0), 2.0, cuts=3)
    rig.part("trunk", g, WOOD)
    rig.secondary("pennant", "trunk", (-10.6, 3.5, 101), (-30, 3.5, 96), max_deg=14, gain=1.3)
    pts = [(-10.6, 103.0), (-34.0, 100.0), (-26.0, 93.5), (-33.5, 86.0), (-10.2, 85.5)]
    g = Geo().slab(pts, 3.5, 1.4)
    rig.part("pennant", g, team=True, outline=0.8)

    # neck and head: a low wedge with a pale snout disc, small angry eyes, big ears
    rig.joint("neck", "trunk", (22, 0, 48))
    rig.joint("head", "neck", (30, 0, 46))
    g = Geo().blob((24, 0, 46), (10, 14.5, 14), p=2.3)
    rig.part("neck", g, FUR)
    g = Geo().blob((36, 0, 44), (13, 12.5, 12.5), p=2.3, taper=(1.0, 0.9))
    g.lathe([(11.0, 0), (9.4, 7.0), (7.8, 13.0), (7.6, 15.5), (0, 16.0)], (40, 0, 42),
            (55.5, 0, 38.0), segs=20)
    rig.part("head", g, FUR)
    g = Geo().lathe([(0, 0), (7.4, 0.2), (7.8, 1.8), (7.0, 3.0), (0, 3.2)], (54.6, 0, 37.9),
                    (57.8, 0, 37.1), segs=20)
    rig.part("head", g, SNOUT)
    g = Geo().sphere((58.0, -2.4, 38.2), 1.5, cuts=2).sphere((58.0, 2.4, 38.2), 1.5, cuts=2)
    rig.part("head", g, NOSTRIL, outline=0)
    g = Geo()
    for y in (-1, 1):
        g.blob((28.5, 9.5 * y, 56.5), (4.2, 1.8, 7.0), p=2.2, rot=(-22 * y, -30, 0), taper=(1.1, 0.35))
    rig.part("head", g, FUR_DK)
    g = Geo()
    for i in range(4):
        g.capsule((34 - 3 * i, 0, 56.0 - i), (30 - 3.5 * i, 0, 62.5 - i), 2.2, 0.7)
    rig.part("head", g, MANE, finish="hair")
    g = Geo().capsule((39.0, -10.8, 51.5), (44.5, -9.0, 49.0), 1.8, 1.4)   # angry brow
    rig.part("head", g, MANE, finish="hair", outline=0.6)
    g = Geo().blob((41.2, -10.0, 47.8), (2.6, 1.6, 2.4))
    rig.part("head", g, EYE, highlight=False)
    g = Geo().blob((42.8, -10.8, 47.6), (1.1, 1.0, 1.5))
    rig.part("head", g, PUPIL, outline=0)
    # lower jaw (opens on the gore) carries the tusks
    rig.joint("jaw", "head", (40, 0, 38))
    g = Geo().blob((45.5, 0, 34.8), (10.0, 8.6, 4.4), p=2.3)
    rig.part("jaw", g, FUR_DK)
    g = Geo().blob((46.5, 0, 36.6), (7.6, 6.4, 1.6), p=2.2)
    rig.part("jaw", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    for y in (-1, 1):
        a = (47.0, 7.5 * y, 36.5)
        b = (58.0, 9.2 * y, 38.5)
        m = (63.5, 9.4 * y, 47.0)
        c = (TUSK_TIP[0], 8.5 * y, TUSK_TIP[2])
        g.capsule(a, b, 3.4, 3.0).capsule(b, m, 3.0, 2.0)
        g.capsule(m, c, 2.0, 0.6)
    rig.part("jaw", g, IVORY, finish="gloss")
    rig.track("tuskTip", "jaw", TUSK_TIP)
    # no smear ribbon: the tusk path on the toss is nearly vertical and reads as a stray bar;
    # frame 3 stretches the head along the toss instead

    # curly tail
    rig.secondary("tail", "trunk", (-27, 0, 52), (-33, 0, 44), max_deg=18, gain=1.2)
    g = Geo().capsule((-27, 0, 52), (-32, 0, 53), 1.8, 1.6).capsule((-32, 0, 53), (-34.5, 0, 49), 1.6, 1.4)
    g.capsule((-34.5, 0, 49), (-32, 0, 46.5), 1.4, 1.0)
    g.blob((-32.0, 0, 45.5), (2.4, 2.0, 2.6), p=2.2)
    rig.part("tail", g, FUR_DK, finish="hair")
    rig.track("_foot", "leg_fr2", (18.5, -9.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def _idle(f):
    c = [-1.0, -0.45, 0.45, 1.0][f]
    lag = [-1.0, -1.0, -0.45, 0.45][f]
    return {
        "trunk": {"z": 1.3 * c},
        "body": squash(0.03 * c),
        "neck": {"r": -2.5 * lag}, "head": {"r": 3.0 * lag},
        "jaw": {"r": -3.0 * max(0.0, lag)},
        "leg_fr": {"r": 1.0 * c}, "leg_br": {"r": -1.0 * c},
    }


def _walk(f):
    import math
    p = 2 * math.pi * f / 8
    return merge(trot(f, fr=14.0, br=13.0, knee=40.0, hock=34.0, bob=2.0, nod=5.0, roll=1.5), {
        "head": {"r": 3.0 * math.cos(2 * p - 0.8)},
        "body": squash(0.03 * math.cos(2 * p)),
    })


def _attack(f):
    # 0-1 dip the head and dig in (squash, weight back), 2 held extreme: head low, tusks
    # down, haunches coiled; 3 smear: the lunge with the head sweeping up; 4 held impact:
    # head tossed high, front feet off the ground, jaw open, stretch; 5-7 land and recover.
    sq = pick(f, [-0.05, -0.10, -0.12, 0.06, 0.10, -0.12, -0.04, 0.0])
    return {
        "body": dict(squash(sq), x=pick(f, [-1.5, -3.5, -5.0, 4.0, 10.0, 8.0, 3.0, 0.0])),
        "trunk": {"r": pick(f, [-4, -8, -10, 4, 12, -3, -1, 0]),
                  "z": pick(f, [-1.0, -2.5, -3.2, 0.5, 3.0, -2.0, -0.6, 0])},
        "neck": {"r": pick(f, [-8, -16, -20, 8, 18, 6, 2, 0])},
        "head": {"r": pick(f, [-6, -12, -16, 16, 26, 8, 2, 0]),
                 "sx": pick(f, [1, 1, 1, 1.12, 1, 1, 1, 1])},
        "jaw": {"r": pick(f, [0, -4, -6, -10, -16, -6, -2, 0])},
        "leg_fr": {"r": pick(f, [-8, -14, -18, 20, 40, 6, 0, 0])},
        "leg_fr2": {"r": pick(f, [0, 0, 0, -30, -46, -6, 0, 0])},
        "leg_fl": {"r": pick(f, [-4, -10, -14, 14, 30, 4, 0, 0])},
        "leg_fl2": {"r": pick(f, [0, 0, 0, -24, -40, -4, 0, 0])},
        "leg_br": {"r": pick(f, [6, 12, 16, -18, -26, -8, -2, 0])},
        "leg_br2": {"r": pick(f, [10, 18, 24, 8, 10, 6, 2, 0])},
        "leg_bl": {"r": pick(f, [4, 10, 14, -14, -20, -6, -2, 0])},
        "leg_bl2": {"r": pick(f, [8, 14, 20, 6, 8, 4, 1, 0])},
    }


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return {
        "body": dict(squash(-0.08 * a), x=-4.0 * a),
        "trunk": {"r": 4 * a},
        "neck": {"r": 10 * a}, "head": {"r": 8 * a},
        "jaw": {"r": -8 * a},
        "leg_fr": {"r": -8 * a}, "leg_fl": {"r": -6 * a},
    }


def _die(f):
    return merge(fx.die_pose(f), {
        "trunk": {"r": pick(f, [10, 4, 2])},
        "neck": {"r": pick(f, [18, 10, 10])}, "head": {"r": pick(f, [10, -4, -4])},
        "jaw": {"r": -14},
        "leg_fr": {"r": pick(f, [40, 20, 20])}, "leg_fl": {"r": pick(f, [30, 16, 16])},
        "leg_br": {"r": pick(f, [-20, -10, -10])}, "leg_bl": {"r": pick(f, [-14, -8, -8])},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        # a heavy trot: 0.92 s cycle so it plays near 1x at its 55 lu/s sim speed
        Clip("walk", 8, _walk, loop=True, durations=115),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
