"""Bonker: Stone Age infantry (DESIGN A5.2). Club, blunt, 68 lu.

Look (A11): chunky caveman with a big head (a third of his height), an angry V unibrow,
big eyes, a grimace with two teeth (an open yell on the impact frame), beard, messy hair,
a team-dyed pelt tunic and pauldron, fur foot wraps and an oversized club held up and
forward so it reads clear of his head. Skin and wood stay under 40% saturation (A11 rule).
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "bonker"
NAME = "Bonker"
HEIGHT_LU = 68
CANVAS = (256, 224)
FEET = (112, 198)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

SKIN = "#EBC4A0"
HAIR = "#3B2D25"
WOOD = "#C2A27E"
STUD = "#5E5A57"
FUR = "#75685B"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"

# club geometry along +Z from the fist; the head is centred CLUB_HEAD lu up the club
FIST = (4.0, -13.0, 21.0)
CLUB_HEAD = 36.0
CLUB_R = 9.5

SMEAR = {"joint": "club", "inner": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD - 8),
         "outer": (FIST[0], FIST[1], FIST[2] + CLUB_HEAD + 8), "color": WOOD, "taper": 0.55,
         "start": 0.35}


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
    rig.joint("club", "fore_r", FIST)

    # legs: short and stocky, fur foot wraps
    for side, y in (("r", -6.0), ("l", 6.0)):
        g = Geo().capsule((0, y, 15), (0.5, y, 8.5), 4.7, 4.1)
        rig.part(f"thigh_{side}", g, SKIN)
        g = Geo().capsule((0.5, y, 8.5), (1.0, y, 3.8), 4.1, 3.7)
        rig.part(f"shin_{side}", g, SKIN)
        g = Geo().blob((3.2, y, 2.9), (6.6, 4.6, 3.1), p=2.6, taper=(1.0, 0.85))
        g.blob((0.8, y, 5.6), (4.4, 4.3, 2.4), p=2.4)
        rig.part(f"shin_{side}", g, FUR, finish="hair")

    # torso: bare chest, team pelt top with a shoulder strap; the skirt (with its ragged hem,
    # 3 lu shorter than before so the thighs show) swings on its own joint
    g = Geo().blob((0, 0, 29), (11.5, 9.8, 11.5), p=2.2, taper=(1.08, 0.92))
    rig.part("torso", g, SKIN)
    g = Geo().blob((0.6, 0, 25.0), (13.2, 11.4, 6.2), p=2.5, taper=(1.06, 0.94))
    g.capsule((9.8, 6.0, 26.5), (3.5, -9.0, 38.5), 3.2, 3.2)
    rig.part("torso", g, team=True)
    rig.secondary("skirt", "hips", (0.6, 0, 22.0), (-1.0, 0, 13.0), max_deg=9, gain=0.8)
    g = Geo().blob((0.8, 0, 20.4), (13.8, 11.9, 5.0), p=2.6, taper=(1.08, 0.98))
    for x, y in ((9.5, -6), (3, -11.5), (-5, -10.5), (11.5, 3), (-11, -3)):  # ragged hem
        g.lathe([(3.4, 0), (0, -4.0)], (x, y, 17.0), segs=10)
    rig.part("skirt", g, team=True)
    g = Geo().capsule((1.0, -8.0, 24.4), (1.0, 8.0, 24.4), 2.0).capsule((11.2, -1, 25), (12.5, -1, 23), 1.6)
    rig.part("torso", g, WOOD)  # belt and knot

    # head: big, jaw forward, beard, messy hair
    g = Geo().blob((2, 0, 50), (12, 11.5, 12), p=2.3)
    g.blob((6, 0, 44), (8.8, 9.6, 6.4), p=2.2)
    g.blob((14.0, -0.6, 49.0), (3.6, 3.2, 3.1), p=2.0)  # nose
    rig.part("head", g, SKIN)
    g = Geo().blob((6.8, 0, 41.0), (8.2, 9.9, 5.0), p=2.3)   # beard
    g.blob((-1.5, 0, 57.2), (12.6, 12.4, 7.6), p=2.2)       # hair cap
    g.blob((-9.5, 0, 50.5), (6.0, 11.0, 9.0), p=2.2)        # back of the hair
    rig.part("head", g, HAIR, finish="hair")
    rig.secondary("hair", "head", (-1.0, 0, 60.0), (-6.0, 0, 68.0), max_deg=12, gain=1.0)
    g = Geo()
    for (x0, z0), (x1, z1), r in (((-2, 60), (-4, 69), 3.6), ((4, 60), (5, 67.5), 3.2),
                                  ((-8, 58), (-14, 63.5), 3.4), ((8, 57), (12.5, 61.5), 2.8)):
        g.capsule((x0, 0, z0), (x1, -1, z1), r, 1.2)
    rig.part("hair", g, HAIR, finish="hair")
    # angry V unibrow, big eyes, pupils pushed forward
    g = Geo().capsule((11.2, -8.2, 57.6), (13.9, -0.4, 54.4), 3.0, 2.6)
    g.capsule((13.9, -0.4, 54.4), (11.2, 7.6, 57.6), 2.6, 3.0)
    rig.part("head", g, HAIR, finish="hair")
    for y in (-4.6, 4.4):
        g = Geo().blob((11.6, y, 51.4), (3.6, 3.4, 4.4))
        rig.part("head", g, EYE, highlight=False)
        g = Geo().blob((14.4, y - 0.4, 51.0), (1.3, 2.0, 2.0))
        rig.part("head", g, PUPIL, outline=0)
    # mouth: grimace with two teeth; the yell replaces it on the impact frame
    rig.joint("mouth", "head", (13.5, 0, 44.8))
    g = Geo().blob((13.5, -0.4, 44.8), (1.6, 4.4, 1.3), p=2.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    g = Geo().blob((14.6, -1.9, 45.3), (0.7, 1.1, 0.9), p=3.0).blob((14.6, 1.1, 45.3), (0.7, 1.1, 0.9), p=3.0)
    rig.part("mouth", g, TOOTH, outline=0, highlight=False)
    rig.joint("yell", "head", (13.2, 0, 44.4), hidden=True)
    g = Geo().blob((13.2, -0.4, 44.2), (2.2, 3.8, 3.1), p=2.2)
    rig.part("yell", g, MOUTH, outline=0, highlight=False)
    g = Geo().blob((14.6, -1.8, 46.6), (0.8, 1.2, 1.0), p=3.0).blob((14.6, 1.0, 46.6), (0.8, 1.2, 1.0), p=3.0)
    rig.part("yell", g, TOOTH, outline=0, highlight=False)

    # arms, fists and a team pelt pauldron on the club arm
    for side, y in (("r", -12.5), ("l", 12.0)):
        yd = -0.5 if y < 0 else 0.5
        g = Geo().capsule((0, y, 36), (1.5, y + yd, 28.5), 4.5, 3.9)
        rig.part(f"arm_{side}", g, SKIN)
        g = Geo().capsule((1.5, y + yd, 28.5), (4.0, y + yd, 22.0), 3.9, 3.8)
        g.blob((4.3, y + yd, 20.4), (4.6, 4.4, 4.4), p=2.3)
        rig.part(f"fore_{side}", g, SKIN)
    g = Geo().blob((0.5, -12.6, 37.6), (7.2, 6.2, 5.4), p=2.4)
    rig.part("arm_r", g, team=True)

    # the club: along +Z from the fist, long handle, big head with dark stone studs
    cx, cy, cz = FIST
    h = CLUB_HEAD
    g = Geo().lathe([(0, -4.5), (2.5, -4.2), (2.6, -1), (2.9, 14), (4.2, h - 9), (7.6, h - 5),
                     (CLUB_R, h), (CLUB_R * 0.95, h + 4.0), (7.0, h + 7.8), (0, h + 9.4)],
                    (cx, cy, cz), segs=18)
    rig.part("club", g, WOOD)
    g = Geo()
    for d, z in (((1, 0, 0.25), h + 1), ((-1, 0, 0.3), h - 1), ((0.25, -1, 0.1), h - 2.5),
                 ((0.45, -1, 0.55), h + 5), ((-0.4, -1, 0.5), h + 4.5), ((0.1, 0, 1), h + 9.5)):
        base = (cx + d[0] * CLUB_R * 0.8, cy + d[1] * CLUB_R * 0.8, cz + z)
        tip = (base[0] + d[0] * 4.0, base[1] + d[1] * 4.0, base[2] + d[2] * 4.0)
        g.lathe([(2.6, 0), (2.1, 2.4), (0, 4.4)], base, tip, segs=10)
    rig.part("club", g, STUD)
    rig.track("clubHead", "club", (cx, cy, cz + h))
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
# Arm chains are posed by direction (degrees in torso space, counter-clockwise, 0 = forward),
# converted to joint rotations from the rest directions of the model.
ARM_REST, FORE_REST, CLUB_REST = -78.7, -71.6, 90.0


def club_arm(arm, fore, club):
    ra = arm - ARM_REST
    rf = fore - FORE_REST - ra
    return {"arm_r": {"r": ra}, "fore_r": {"r": rf}, "club": {"r": club - CLUB_REST - ra - rf}}


def off_arm(arm, fore):
    ra = arm - ARM_REST
    return {"arm_l": {"r": ra}, "fore_l": {"r": fore - FORE_REST - ra}}


# club held up and forward, about 40 degrees from vertical, clear of the head
STANCE = merge(club_arm(-15, 25, 45), off_arm(-70, -30), {"torso": {"r": -3}, "club": {"rx": -14}})


def _idle(f):
    # 4 poses played 0-1-2-3-2-1 at 200 ms: hips bob 2.4 lu, squash +-4%, head and club lag
    c = [-1.0, -0.45, 0.45, 1.0][f]
    lag = [-1.0, -1.0, -0.45, 0.45][f]
    return merge(STANCE, {
        "hips": {"z": 1.2 * c},
        "body": squash(0.04 * c),
        "torso": {"r": 1.5 * c},
        "head": {"r": -2.5 * lag, "z": 0.4 * lag},
        "arm_r": {"r": 3 * lag}, "club": {"r": -4 * lag},
        "arm_l": {"r": -4 * lag},
    })


def _walk(f):
    # contact frames 0 and 4 are lowest, passing frames 2 and 6 highest (3.6 lu bob);
    # 8 degree lean; the swinging foot lifts 4 lu; club and head one frame behind
    import math
    p = 2 * math.pi * f / 8
    lag_p = 2 * math.pi * (f - 1) / 8
    lift_r, lift_l = max(0.0, -math.sin(p)), max(0.0, math.sin(p))
    bob = [-2.4, -0.6, 1.2, -0.6, -2.4, -0.6, 1.2, -0.6][f]
    bob_lag = [-0.6, -2.4, -0.6, 1.2, -0.6, -2.4, -0.6, 1.2][f]
    return merge(STANCE, {
        "hips": {"z": bob},
        "body": squash(0.03 * bob / 2.4),
        "torso": {"r": -8 + 1.0 * math.cos(2 * p), "rz": 6 * math.sin(p)},
        "head": {"r": 3 - 1.5 * bob_lag / 2.4},
        "thigh_r": {"r": 30 * math.cos(p) + 14 * lift_r}, "shin_r": {"r": -58 * lift_r},
        "thigh_l": {"r": -30 * math.cos(p) + 14 * lift_l}, "shin_l": {"r": -58 * lift_l},
        "arm_l": {"r": 24 * math.cos(p)}, "fore_l": {"r": 10 * max(0.0, math.cos(p))},
        "arm_r": {"r": -4 * math.cos(lag_p)}, "club": {"r": 5 * bob_lag / 2.4},
    })


def _attack(f):
    # 0-1 anticipation (squash 0.9/1.1), 2 held extreme (club far back), 3 smear, 4 held
    # impact (squash 0.85/1.15, yell), 5-7 recovery. See fx.MELEE_MS for the timing.
    arm = pick(f, [40, 80, 100, 70, -20, -18, -25, -15])
    fore = pick(f, [100, 120, 135, 60, -22, -15, 5, 25])
    club = pick(f, [115, 122, 130, 60, 6, 12, 28, 45])
    sq = pick(f, [-0.05, -0.10, 0.08, 0.05, -0.15, -0.08, 0.0, 0.0])
    pose = merge(club_arm(arm, fore, club), {
        "body": dict(squash(sq), x=pick(f, [-1, -2.5, -3.5, 2, 6, 5, 2, 0])),
        "hips": {"z": pick(f, [0, -0.8, 0.8, 0, -2.5, -1.8, -0.6, 0])},
        "torso": {"r": pick(f, [4, 10, 16, -6, -24, -20, -10, -3])},
        "head": {"r": pick(f, [2, 6, 8, -4, -10, -8, -3, 0])},
        "thigh_r": {"r": pick(f, [0, -6, -8, 10, 22, 18, 8, 0])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [0, 6, 8, -6, -16, -12, -6, 0])},
        "shin_l": {"r": pick(f, [0, -4, -6, -4, -6, -4, 0, 0])},
    }, off_arm(pick(f, [-60, -20, 10, -40, -110, -100, -85, -70]),
               pick(f, [-20, 20, 50, 0, -80, -60, -45, -30])))
    if f == 3:
        pose["club"]["sx"] = 1.5  # smear frame: head stretched along the swing
    if f in (3, 4):
        pose.update({"mouth": {"hide": True}, "yell": {"show": True}})
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, {
        "body": dict(squash(-0.12 * a), x=-4.0 * a),
        "torso": {"r": 14 * a},
        "head": {"r": 12 * a},
        "arm_r": {"r": 18 * a}, "club": {"r": 12 * a},
        "arm_l": {"r": 30 * a},
    })


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_r": {"r": pick(f, [40, 50, 50])}, "club": {"r": pick(f, [30, 20, 20])},
        "arm_l": {"r": pick(f, [120, 90, 90])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        pose.update({"mouth": {"hide": True}, "yell": {"show": True}})
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
