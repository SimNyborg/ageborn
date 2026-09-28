"""Sabertooth: Stone Age epic skirmisher (DESIGN A5.2), quadruped rig (A11). Bite, ~60 lu.

Look (A11): a chunky, front-heavy sabre-toothed cat: big head with a pale muzzle, angry eyes
and two long ivory sabre fangs (the silhouette), heavy forelegs and big paws, a sloping back
with dark tiger stripes and a stubby bobtail. It wears a team war pelt strapped over its
back and a team collar hung with bone teeth. It moves in a bounding gallop with a flexing
spine (fast: 100 lu/s). The attack is a pounce-bite: crouch, rear back with the jaws wide,
a smeared lunge down, a held clamping bite at impact, a shake, and recovery.
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad, bound

SLUG = "sabertooth"
NAME = "Sabertooth"
HEIGHT_LU = 60
YAW_DEG = -10.0
CANVAS = (296, 212)
FEET = (122, 194)
ANCHORS = {"head": (8, 58), "hitCenter": (0, 28)}

FUR = "#A88A68"
FUR_DK = "#8C7358"
STRIPE = "#5E4E40"
CREAM = "#DCCDB2"
NOSE = "#3E3230"
IVORY = "#F1E9D2"
STRAP = "#6B5646"
BONE = "#EDE3C8"
EYE = "#F4E9C6"
PUPIL = "#221C19"
MOUTH = "#5A2E2E"

FANG_TIP = (36.0, -3.8, 22.5)


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    col = FUR if y < 0 else FUR_DK
    g = Geo().capsule(p0, p1, 7.6 if front else 7.4, 5.0 if front else 4.4)
    rig.part(f"leg_{name}", g, col)
    g = Geo().capsule(p1, (x1 + (1.2 if front else 0.4), y, 4.2), 5.0 if front else 3.8, 4.2)
    rig.part(f"leg_{name}2", g, col)
    g = Geo().blob((x1 + (3.0 if front else 1.8), y, 2.9), (6.8 if front else 5.4, 5.0, 3.1), p=2.4,
                   taper=(1.0, 0.8))
    rig.part(f"leg_{name}2", g, CREAM if y < 0 else FUR_DK)


def build(rig):
    global SMEAR
    q = Quad(rig, trunk=(0, 29), front_x=13.0, back_x=-14.0, leg_y=6.0, shoulder_z=30.0,
             hip_z=28.0, knee_z=14.0, hock_z=13.0, knee_dx=0.5, hock_dx=-3.0, far_dx=-3.0)
    rig.rest_scale["body"] = 1.08
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")

    # body: deep chest, sloping back, lean haunch; cream belly and chest
    g = Geo().blob((9, 0, 33), (13, 10.5, 12.5), p=2.2)
    g.blob((-4, 0, 31), (15, 9.6, 9.6), p=2.2)
    g.blob((-14, 0, 30), (9.5, 9.8, 10), p=2.2)
    rig.part("trunk", g, FUR)
    g = Geo().blob((12, 0, 27.5), (9, 8.6, 7.5), p=2.2).blob((-1, 0, 24.5), (11, 7.4, 3.6), p=2.4)
    rig.part("trunk", g, CREAM)
    # stripes over the back and haunch (curved slabs on the surface, near side mostly)
    g = Geo()
    for x, z, h in ((-19.0, 36.5, 7.5), (-13.5, 38.5, 9.0), (-8.0, 39.5, 8.0), (18.0, 42.0, 7.0)):
        g.capsule((x + 1.5, -9.6, z), (x - 1.0, -8.2, z - h), 1.5, 0.6)
        g.capsule((x + 1.5, -5.0, z + 2.8), (x + 1.5, 5.0, z + 2.8), 1.5, 1.5)
    rig.part("trunk", g, STRIPE, outline=0)
    # team war pelt over the back with a ragged hem, a strap, bone toggles
    g = Geo().blob((0.5, 0, 32.0), (17.0, 11.4, 10.6), p=3.2)
    g.clip((0, 0, 22.5), (0, 0, -1))
    for x in (-9.0, -3.5, 2.0, 7.5):
        g.lathe([(2.4, 0), (0, -4.0)], (x, -10.4, 23.0), segs=8)
    rig.part("trunk", g, team=True)
    g = Geo().lathe([(0, -0.1), (11.0, 0), (11.6, 2.2), (0, 2.3)], (-10.0, 0, 31.5), (-9.0, 0, 31.5),
                    segs=22, squash=(1.1, 1.0))
    g.clip((0, 0, 20.0), (0, 0, -1))
    rig.part("trunk", g, STRAP, outline=0.7)

    # neck, collar and head
    rig.joint("neck", "trunk", (17, 0, 38))
    rig.joint("head", "neck", (24, 0, 43), scale=1.22)  # a big readable head (fangs)
    g = Geo().blob((19, 0, 40), (8.6, 9.4, 9.6), p=2.2)
    rig.part("neck", g, FUR)
    g = Geo().lathe([(9.4, 0), (10.8, 0.8), (10.8, 4.6), (9.2, 5.4)], (16.0, 0, 35.5), (20.5, 0, 44.5),
                    segs=22)
    rig.part("neck", g, team=True, outline=0.8)
    g = Geo()
    for dy, dz in ((-6.5, 0), (-2.5, -1.0), (2.0, -1.0)):
        g.lathe([(1.1, 0), (0.8, 1.6), (0, 3.4)], (22.5, dy - 1.5, 38.5 + dz), (23.6, dy - 1.5, 34.8 + dz), segs=8)
    rig.part("neck", g, BONE, outline=0.6)
    g = Geo().blob((26.5, 0, 46), (10.4, 9.8, 7.4), p=2.25)
    g.blob((33.0, 0, 42.2), (6.4, 7.0, 4.6), p=2.2)           # muzzle
    rig.part("head", g, FUR)
    g = Geo()
    for y in (-1, 1):                                          # pointed cheek tufts
        g.lathe([(4.4, 0), (3.0, 4.0), (0, 9.0)], (24.0, 7.5 * y, 43.0), (17.5, 13.5 * y, 39.5), segs=10,
                squash=(1.0, 0.6))
    rig.part("head", g, CREAM, finish="hair")
    g = Geo().blob((34.0, -2.0, 41.0), (4.4, 5.2, 3.8), p=2.2)
    rig.part("head", g, CREAM)
    g = Geo().blob((38.0, -0.6, 44.2), (2.2, 2.6, 1.8), p=2.2)
    rig.part("head", g, NOSE, outline=0.6)
    g = Geo()
    for y in (-1, 1):
        g.lathe([(3.6, 0), (2.2, 2.6), (0, 5.8)], (21.5, 7.0 * y, 51.0), (19.5, 9.5 * y, 57.5), segs=10,
                squash=(1.0, 0.5))
    rig.part("head", g, FUR_DK)
    g = Geo()
    for x, z in ((25.0, 55.0), (21.0, 54.0)):
        g.capsule((x + 1, -2.0, z), (x - 2.5, -8.5, z - 3.0), 1.1, 0.5)
    rig.part("head", g, STRIPE, outline=0)
    g = Geo().capsule((29.6, -8.8, 50.4), (35.2, -5.4, 48.6), 1.6, 1.2)
    rig.part("head", g, STRIPE, finish="hair", outline=0.6)
    g = Geo().blob((32.0, -6.8, 47.2), (2.8, 1.8, 2.2))
    rig.part("head", g, EYE, highlight=False)
    g = Geo().blob((33.9, -7.4, 47.0), (0.9, 0.9, 1.8))
    rig.part("head", g, PUPIL, outline=0)
    # sabre fangs from the upper jaw
    g = Geo()
    for y in (-3.6, 3.2):
        g.lathe([(2.5, 0), (2.4, 5.0), (1.9, 11.0), (1.0, 15.5), (0, 17.6)], (33.4, y, 40.0),
                (FANG_TIP[0], y, FANG_TIP[2]), segs=12)
    rig.part("head", g, IVORY, finish="gloss")
    rig.track("fangTip", "head", FANG_TIP)
    SMEAR = {"joint": "head", "inner": (33.4, -3.6, 34.0), "outer": FANG_TIP, "color": IVORY,
             "taper": 0.4, "start": 0.25, "behind": 4.0}
    # lower jaw, opens wide; the mouth's inside shows
    rig.joint("jaw", "head", (27.0, 0, 39.5))
    g = Geo().blob((31.5, 0, 37.2), (6.4, 5.4, 2.6), p=2.2)
    rig.part("jaw", g, CREAM)
    g = Geo().blob((31.0, 0, 39.4), (6.0, 5.0, 1.4), p=2.2)
    rig.part("jaw", g, MOUTH, outline=0, highlight=False)

    # stubby bobtail
    rig.secondary("tail", "trunk", (-22, 0, 36), (-29, 0, 38), max_deg=20, gain=1.3)
    g = Geo().capsule((-22, 0, 36), (-28.5, 0, 38.5), 3.0, 2.2)
    rig.part("tail", g, FUR)
    g = Geo().blob((-29.0, 0, 38.8), (2.6, 2.4, 2.4), p=2.2)
    rig.part("tail", g, STRIPE, finish="hair")
    rig.track("_foot", "leg_fr2", (15.5, -6.0, 0.5))


SMEAR = None


# -- poses ---------------------------------------------------------------------------------
def _idle(f):
    c = [-1.0, -0.45, 0.45, 1.0][f]
    lag = [-1.0, -1.0, -0.45, 0.45][f]
    return {
        "trunk": {"z": 1.0 * c, "r": 0.8 * c},
        "body": squash(0.035 * c),
        "neck": {"r": -2.5 * lag}, "head": {"r": 3.0 * lag},
        "jaw": {"r": -2.0 * max(0.0, c)},
    }


def _walk(f):
    return merge(bound(f, fr=30.0, br=27.0, knee=62.0, hock=48.0, spine=7.0, bob=2.6),
                 {"body": squash(0.04 * pick(f, [0, 1, 1, 0, -1, -1, 0, 0]))})


def _attack(f):
    # 0 crouch (squash), 1 rear back with the jaws opening, 2 held extreme: head up, jaws
    # wide, weight on the haunches; 3 smear: lunge down; 4 held impact: bite clamps, head
    # low and forward, squash; 5 shake; 6-7 recover. Timing: fx.MELEE_MS (0.8 s interval).
    sq = pick(f, [-0.10, 0.02, 0.08, 0.04, -0.14, -0.06, -0.02, 0.0])
    return {
        "body": dict(squash(sq), x=pick(f, [-1.0, -3.0, -4.0, 5.0, 9.0, 7.5, 3.0, 0.0])),
        "trunk": {"r": pick(f, [-2, 8, 12, -4, -8, -6, -2, 0]),
                  "z": pick(f, [-3.0, 0.0, 1.5, 0.5, -2.5, -1.8, -0.6, 0])},
        "neck": {"r": pick(f, [-6, 10, 16, -10, -18, -14, -6, 0])},
        "head": {"r": pick(f, [-4, 14, 22, -6, -14, -8, -2, 0]),
                 "rx": pick(f, [0, 0, 0, 0, 0, 10, 0, 0])},
        "jaw": {"r": pick(f, [-4, -26, -40, -30, 0, -4, -2, 0])},
        "leg_fr": {"r": pick(f, [-8, 18, 30, 34, 12, 8, 4, 0])},
        "leg_fr2": {"r": pick(f, [0, -30, -50, -20, 0, 0, 0, 0])},
        "leg_fl": {"r": pick(f, [-6, 12, 22, 28, 8, 6, 2, 0])},
        "leg_fl2": {"r": pick(f, [0, -24, -40, -14, 0, 0, 0, 0])},
        "leg_br": {"r": pick(f, [10, 4, 0, -24, -30, -20, -8, 0])},
        "leg_br2": {"r": pick(f, [16, 8, 4, 20, 18, 12, 4, 0])},
        "leg_bl": {"r": pick(f, [8, 2, -2, -20, -26, -16, -6, 0])},
        "leg_bl2": {"r": pick(f, [14, 6, 2, 16, 14, 10, 3, 0])},
    }


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return {
        "body": dict(squash(-0.1 * a), x=-4.0 * a),
        "trunk": {"r": 5 * a},
        "neck": {"r": 12 * a}, "head": {"r": 10 * a},
        "jaw": {"r": -18 * a},
        "leg_fr": {"r": -8 * a},
    }


def _die(f):
    return merge(fx.die_pose(f), {
        "trunk": {"r": pick(f, [10, 4, 2])},
        "neck": {"r": pick(f, [20, 10, 10])}, "head": {"r": pick(f, [10, -4, -4])},
        "jaw": {"r": -20},
        "leg_fr": {"r": pick(f, [40, 20, 20])}, "leg_fl": {"r": pick(f, [30, 16, 16])},
        "leg_br": {"r": pick(f, [-30, -10, -10])}, "leg_bl": {"r": pick(f, [-20, -8, -8])},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=72),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
