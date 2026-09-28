"""Training Dummy: the tutorial-only Stone Age dummy (DESIGN A5.2, hidden card). 60 lu.

Look (A11): a comic straw-stuffed burlap dummy that walks on stubby straw-bundle legs:
a round sack head with button eyes and a stitched grin, straw tufts sticking out of the
top and the cuffs, twine ties, a team bullseye painted on its chest (it is a practice
target) and a team scarf whose tail streams behind (follow-through). It swings a wooden
practice club with a floppy, over-eager bonk. On death it bursts (the shared poof).
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody, biped_hit, biped_idle, biped_walk

SLUG = "training_dummy"
NAME = "Training Dummy"
HEIGHT_LU = 60
CANVAS = (232, 208)
FEET = (104, 186)
ANCHORS = {"head": (0, 58), "hitCenter": (0, 28)}

SACK = "#C8B48C"
SACK_DK = "#A8966E"
STRAW = "#D9C48E"
TWINE = "#8A7358"
WOOD = "#A58B6C"
BUTTON = "#3A3029"
STITCH = "#5A4636"
PAINT_W = "#EDE3C8"


def build(rig):
    global ARM_R, ARM_L, SMEAR
    body = CaveBody(rig, SACK, None, hip_z=13.0, knee_z=7.0, ankle_z=3.0, waist_z=14.0,
                    shoulder_z=31.0, neck_z=33.0, hip_y=5.4, shoulder_y=11.2,
                    elbow=(1.2, 24.5), wrist=(3.0, 18.5), leg_r=(4.2, 3.8, 3.8),
                    arm_r=(3.4, 3.0, 3.0), fist_r=3.5, torso=((0, 24.0), (10.4, 9.4, 10.6)),
                    torso_taper=(1.12, 0.9), foot_len=5.4, foot_fill=SACK_DK,
                    build_torso=False)
    fr = body.fist["r"]
    # twine ties at the knees and wrists, straw tufts poking out of the cuffs
    for side, y in (("r", -5.4), ("l", 5.4)):
        g = Geo().capsule((0.6, y, 8.4), (0.7, y, 5.8), 4.4, 4.4)
        rig.part(f"shin_{side}", g, team=True, outline=0.6)
    for side, y in (("r", -11.7), ("l", 11.7)):
        g = Geo().capsule((2.2, y, 20.8), (2.6, y, 18.4), 3.5, 3.5)
        rig.part(f"fore_{side}", g, team=True, outline=0.6)
    # a team-painted sack torso with a pale bullseye ring on the chest (it is a target)
    import math
    g = Geo().blob((0, 0, 24.0), (10.6, 9.6, 10.8), p=2.2, taper=(1.12, 0.9))
    rig.part("torso", g, team=True)
    n = (math.cos(math.radians(40)), -math.sin(math.radians(40)), 0.0)
    c0 = (0.0 + 8.2 * n[0], 8.2 * n[1], 24.6)
    ring = Geo().lathe([(3.6, 0), (6.0, 0.1), (6.0, 1.2), (3.6, 1.3)], c0,
                       (c0[0] + n[0], c0[1] + n[1], c0[2]), segs=24)
    ring.lathe([(0, 0), (1.5, 0.3), (1.5, 1.9), (0, 2.2)], (c0[0] + 0.8 * n[0], c0[1] + 0.8 * n[1], c0[2]),
               (c0[0] + 1.8 * n[0], c0[1] + 1.8 * n[1], c0[2]), segs=14)
    rig.part("torso", ring, PAINT_W, outline=0)
    g = Geo().lathe([(8.0, 0), (9.4, 0.5), (9.6, 3.2), (8.2, 4.0)], (0.8, 0, 30.4), (0.4, 0, 34.4), segs=22)
    rig.part("torso", g, team=True)
    rig.secondary("scarf", "torso", (-6.0, -3.0, 32.0), (-15.0, -3.0, 24.0), max_deg=20, gain=1.4)
    g = Geo().slab([(-5.0, 34.0), (-16.0, 27.0), (-18.5, 19.5), (-12.5, 20.5), (-6.0, 29.0)], -4.0, 1.8)
    rig.part("scarf", g, team=True, outline=0.8)
    g = Geo().capsule((0.8, -8.6, 20.0), (0.8, 8.6, 20.0), 1.3)
    rig.part("torso", g, TWINE, outline=0.6)

    # head: a round sack tied at the neck, button eyes, stitched grin, straw hair
    g = Geo().blob((1.6, 0, 44.0), (10.6, 10.2, 10.4), p=2.2)
    rig.part("head", g, SACK)
    g = Geo().capsule((0.6, -6.4, 34.6), (0.6, 6.4, 34.6), 2.0)
    rig.part("head", g, TWINE, outline=0.6)
    g = Geo()
    for y, z in ((-4.2, 46.0), (3.6, 46.4)):
        g.lathe([(0, 0), (2.4, 0.1), (2.6, 0.9), (2.0, 1.4), (0, 1.5)], (10.9, y, z),
                (12.6, y - 0.9, z), segs=16)
    rig.part("head", g, BUTTON, outline=0, finish="gloss")
    g = Geo()
    for y, z in ((-4.2, 46.0), (3.6, 46.4)):
        g.sphere((12.2, y - 0.9, z + 0.8), 0.6, cuts=2)
    rig.part("head", g, PAINT_W, outline=0, highlight=False)
    rig.joint("mouth", "head", (11.6, 0, 39.6))
    g = Geo()
    pts = [(10.4, -5.0, 40.8), (11.4, -2.6, 39.4), (11.8, 0.0, 39.0), (11.4, 2.6, 39.4), (10.4, 4.8, 40.6)]
    for p0, p1 in zip(pts, pts[1:]):
        g.capsule(p0, p1, 0.7)
    for p in pts[1:-1]:
        g.capsule((p[0], p[1], p[2] + 1.3), (p[0], p[1], p[2] - 1.3), 0.45)
    rig.part("mouth", g, STITCH, outline=0)
    rig.joint("oh", "head", (11.4, 0, 39.6), hidden=True)
    g = Geo().blob((11.4, -0.4, 39.4), (1.4, 2.4, 2.4), p=2.2)
    rig.part("oh", g, STITCH, outline=0, highlight=False)
    rig.secondary("straw", "head", (0.0, 0, 53.0), (-3.0, 0, 62.0), max_deg=14, gain=1.2)
    g = Geo()
    for (x1, y1, z1), r in (((-1.0, -3.0, 61.5), 1.6), ((4.0, 1.0, 60.5), 1.4), ((-6.0, 2.0, 60.0), 1.5),
                            ((-9.0, -2.0, 57.5), 1.4), ((6.5, -3.0, 58.0), 1.2), ((1.5, 4.5, 61.0), 1.3)):
        g.capsule((0.0, 0, 52.0), (x1, y1, z1), r, 0.5)
    rig.part("straw", g, STRAW, finish="hair")
    # straw tufts poking out of the cuffs
    for side, y in (("r", -11.7), ("l", 11.7)):
        g = Geo()
        for dx, dz in ((-1.5, -1.0), (1.0, -2.0), (3.2, -0.5)):
            g.capsule((2.2, y, 21.5), (2.2 + dx, y, 21.5 + 5.0 - dz), 0.9, 0.4)
        rig.part(f"arm_{side}", g, STRAW, finish="hair", outline=0.6)

    # practice club: a wooden stick with a padded head bound in twine, along +Z
    rig.joint("club", "fore_r", fr)
    g = Geo().capsule((fr[0], fr[1] - 0.5, fr[2] - 3.0), (fr[0], fr[1] - 0.5, fr[2] + 18.0), 1.5, 1.8)
    rig.part("club", g, WOOD)
    g = Geo().blob((fr[0], fr[1] - 0.5, fr[2] + 21.0), (4.4, 4.4, 5.6), p=2.3)
    rig.part("club", g, SACK_DK)
    g = Geo().capsule((fr[0], fr[1] - 0.5, fr[2] + 17.4), (fr[0], fr[1] - 0.5, fr[2] + 18.4), 4.0, 4.0)
    rig.part("club", g, TWINE, outline=0.6)
    tip = (fr[0], fr[1] - 0.5, fr[2] + 21.0)
    rig.track("clubHead", "club", tip)
    SMEAR = {"joint": "club", "inner": (fr[0], fr[1] - 0.5, fr[2] + 15.0),
             "outer": (fr[0], fr[1] - 0.5, fr[2] + 26.0), "color": SACK, "taper": 0.5, "start": 0.35}
    rig.track("_foot", "shin_r", (2.4, -5.4, 0.5))
    ARM_R = body.arm("r", "club", tip)
    ARM_L = body.arm("l")


ARM_R = ARM_L = None
SMEAR = None


def club_arm(a, b, c):
    return ARM_R.pose(a, b, c)


def off_arm(a, b):
    return ARM_L.pose(a, b)


def stance():
    # club held up over the shoulder, far arm out for balance (a proud, silly pose)
    return merge(club_arm(-50, 40, 155), off_arm(-40, -20), {"torso": {"r": -2}})


def _idle(f):
    def extra(c, lag):
        return {"arm_l": {"r": 8 * lag}, "club": {"r": -6 * lag}, "straw": {"r": 3 * lag}}
    return biped_idle(f, stance(), amp=1.3, extra=extra)


def _walk(f):
    import math

    # a stiff, bouncy waddle: bigger bob, side rock, arms swing wide
    def extra(p, lag_p, bob, bob_lag):
        return {"torso": {"rx": 6 * math.sin(p)}, "arm_l": {"r": 28 * math.cos(p)},
                "arm_r": {"r": -8 * math.cos(p)}, "club": {"r": 8 * math.cos(lag_p)}}
    return biped_walk(f, stance(), lean=-4.0, bob_k=1.3, thigh=26.0, knee=40.0, extra=extra)


def _attack(f):
    # an over-eager bonk: 0-1 wind way back, 2 held (leaning back, stretch), 3 smear,
    # 4 held impact (squash, "oh" mouth), 5 the club bounces, 6-7 wobble back
    a = pick(f, [40, 90, 110, 60, -30, -20, -26, -20])
    b = pick(f, [90, 130, 150, 60, -20, -4, 20, 40])
    c = pick(f, [120, 160, 175, 60, -5, 20, 45, 70])
    sq = pick(f, [-0.06, -0.10, 0.10, 0.04, -0.18, 0.06, -0.04, 0.0])
    pose = merge(club_arm(a, b, c), off_arm(pick(f, [-20, 0, 20, -40, -100, -80, -60, -40]),
                                            pick(f, [0, 20, 40, -10, -60, -40, -30, -20])), {
        "body": dict(squash(sq), x=pick(f, [-1, -2.5, -3.5, 2, 5, 4, 2, 0])),
        "torso": {"r": pick(f, [6, 12, 18, -6, -22, -14, -6, -2])},
        "head": {"r": pick(f, [4, 8, 12, -6, -16, 8, -4, 0])},
        "thigh_r": {"r": pick(f, [0, -6, -8, 10, 20, 14, 6, 0])},
        "thigh_l": {"r": pick(f, [0, 6, 8, -6, -14, -10, -4, 0])},
    })
    if f == 3:
        pose["club"]["sx"] = 1.4
    if f in (3, 4, 5):
        pose.update({"mouth": {"hide": True}, "oh": {"show": True}})
    return pose


def _hit(f):
    return biped_hit(f, stance(), extra=lambda a: {"arm_r": {"r": 20 * a}, "club": {"r": 16 * a},
                                                    "straw": {"r": -10 * a}})


def _die(f):
    pose = merge(stance(), fx.die_pose(f), {
        "torso": {"r": pick(f, [18, 8, 4])},
        "head": {"r": pick(f, [20, -8, -8])},
        "arm_r": {"r": pick(f, [50, 40, 40])}, "club": {"r": pick(f, [40, 30, 30])},
        "arm_l": {"r": pick(f, [120, 90, 90])},
        "thigh_r": {"r": pick(f, [30, 12, 12])}, "thigh_l": {"r": pick(f, [-12, -6, -6])},
    })
    if f == 0:
        pose.update({"mouth": {"hide": True}, "oh": {"show": True}})
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
