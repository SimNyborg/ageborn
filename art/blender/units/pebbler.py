"""Pebbler: Stone Age ranged (DESIGN A5.2). Sling, rock projectile (proj.rock), 64 lu.

Look (A11): a lean young slinger, lighter and slimmer than the Bonker, with a big red-brown
topknot held by a bone pin, a team headband whose two tails stream behind (follow-through),
a team one-shoulder pelt tunic with a ragged skirt, a bulging leather rock pouch on the
hip and a sling with a fat grey rock. In idle he tosses a spare pebble in his far hand.
The attack is an overarm sling whip: coil, wind back, whip over the head (smear), release
level toward the enemy (the rock leaves the pouch; the projectile spawns at the exported
per-frame `muzzle` anchor of the release frame), follow-through down, settle.
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody, biped_hit, biped_idle, biped_walk

SLUG = "pebbler"
NAME = "Pebbler"
HEIGHT_LU = 64
CANVAS = (240, 216)
FEET = (104, 192)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30)}

SKIN = "#E8C9AD"
HAIR = "#6B5445"
FUR = "#7A6B5E"
LEATHER = "#8C7058"
CORD = "#6E5A48"
ROCK = "#9A948A"
BONE = "#EDE3C8"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"

SLING_LEN = 12.5


def build(rig):
    body = CaveBody(rig, SKIN, FUR, hip_z=16.0, knee_z=9.0, ankle_z=4.0, waist_z=17.0,
                    shoulder_z=35.0, neck_z=37.0, hip_y=5.2, shoulder_y=10.8,
                    elbow=(1.5, 28.0), wrist=(3.5, 21.5), leg_r=(4.1, 3.5, 3.2),
                    arm_r=(3.8, 3.3, 3.2), fist_r=3.9, torso=((0, 28.5), (9.6, 8.6, 9.8)),
                    torso_taper=(1.02, 0.96), foot_len=6.0)
    fr, fl = body.fist["r"], body.fist["l"]

    # team one-shoulder pelt tunic; the skirt swings on its own joint
    g = Geo().blob((0.4, 0, 26.2), (10.9, 9.9, 7.4), p=2.5, taper=(1.05, 0.95))
    g.capsule((8.4, -5.2, 27.5), (2.5, 8.0, 36.0), 2.7, 2.7)
    rig.part("torso", g, team=True)
    rig.secondary("skirt", "hips", (0.5, 0, 22.0), (-1.0, 0, 13.5), max_deg=10, gain=0.9)
    g = Geo().blob((0.6, 0, 20.8), (11.2, 10.0, 4.6), p=2.6, taper=(1.08, 0.98))
    for x, y in ((8.0, -5.5), (2.5, -9.5), (-4.5, -9.0), (9.5, 2.5), (-9.5, -2.5)):
        g.lathe([(3.0, 0), (0, -3.8)], (x, y, 17.6), segs=10)
    rig.part("skirt", g, team=True)
    g = Geo().capsule((0.8, -7.2, 24.2), (0.8, 7.2, 24.2), 1.6)
    rig.part("torso", g, LEATHER)
    # bulging rock pouch on the far hip, two pebbles peeking out
    g = Geo().blob((-6.5, -8.5, 20.0), (4.6, 3.6, 5.2), p=2.2, taper=(1.1, 0.8))
    rig.part("hips", g, LEATHER)
    g = Geo().sphere((-5.8, -9.8, 25.0), 2.1, cuts=3).sphere((-8.4, -8.6, 24.6), 1.8, cuts=3)
    rig.part("hips", g, ROCK, outline=0.8)

    # head: round, youthful, big eyes, small nose, cheeky grin; topknot with a bone pin
    g = Geo().blob((2, 0, 47.5), (10.4, 10.0, 10.4), p=2.25)
    g.blob((5.5, 0, 42.4), (7.2, 8.2, 5.2), p=2.2)
    g.blob((12.6, -0.5, 46.4), (2.5, 2.3, 2.3), p=2.0)  # nose
    rig.part("head", g, SKIN)
    g = Geo().blob((-2.6, 0, 54.4), (9.6, 10.6, 5.6), p=2.2)   # hair cap
    g.blob((-8.2, 0, 48.2), (4.6, 9.4, 7.6), p=2.2)             # back of the hair
    rig.part("head", g, HAIR, finish="hair")
    rig.secondary("knot", "head", (-2.0, 0, 57.0), (-5.5, 0, 66.0), max_deg=14, gain=1.1)
    g = Geo().blob((-2.4, 0, 59.4), (3.6, 3.6, 3.4), p=2.2)
    for (x1, y1, z1), r in (((-1.0, -1.0, 68.5), 2.3), ((-7.5, 0.5, 66.5), 2.2),
                            ((3.5, 1.0, 66.0), 1.9), ((-9.5, -1.5, 61.5), 1.8)):
        g.capsule((-2.4, 0, 60.5), (x1, y1, z1), r, 0.7)
    rig.part("knot", g, HAIR, finish="hair")
    g = Geo().lathe([(3.4, 0), (3.9, 0.3), (3.9, 2.1), (3.2, 2.4)], (-2.4, 0, 60.4),
                    (-2.4, 0, 63.0), segs=16)
    rig.part("knot", g, BONE, outline=0.8)
    # team headband with two tails streaming behind
    g = Geo().lathe([(10.0, 0), (10.9, 0.4), (10.9, 2.8), (9.6, 3.2)], (1.6, 0, 52.4),
                    (0.2, 0, 55.6), segs=22)
    rig.part("head", g, team=True, outline=0.8)
    rig.secondary("tails", "head", (-9.6, 0, 51.5), (-19.5, 0, 46.0), max_deg=18, gain=1.3)
    g = Geo().slab([(-9.0, 53.0), (-19.0, 49.5), (-20.5, 46.5), (-9.5, 50.0)], -3.0, 1.2)
    g.slab([(-9.5, 52.0), (-16.5, 45.0), (-18.8, 44.0), (-10.0, 49.4)], 2.5, 1.2)
    rig.part("tails", g, team=True, outline=0.8)
    # face: brows, eyes, grin
    for y in (-4.4, 3.8):
        g = Geo().blob((10.8, y, 48.4), (3.4, 3.3, 4.2))
        rig.part("head", g, EYE, highlight=False)
        g = Geo().blob((13.6, y - 0.3, 48.0), (1.3, 2.1, 2.3))
        rig.part("head", g, PUPIL, outline=0)
    rig.joint("mouth", "head", (12.2, 0, 42.8))
    g = Geo().blob((12.3, -0.6, 42.7), (1.2, 3.6, 1.0), p=2.4, rot=(-8, 0, 0))
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    rig.joint("yell", "head", (12.0, 0, 42.4), hidden=True)
    g = Geo().blob((12.0, -0.4, 42.2), (1.9, 3.2, 2.6), p=2.2)
    rig.part("yell", g, MOUTH, outline=0, highlight=False)
    g = Geo().blob((13.2, -1.4, 44.0), (0.7, 1.0, 0.8), p=3.0).blob((13.2, 1.0, 44.0), (0.7, 1.0, 0.8), p=3.0)
    rig.part("yell", g, TOOTH, outline=0, highlight=False)

    # team wrist wrap on the sling arm, fur shoulder pad on the far shoulder
    g = Geo().capsule((2.6, -11.3, 23.8), (3.2, -11.3, 21.0), 3.9, 3.9)
    rig.part("fore_r", g, team=True, outline=0.8)
    g = Geo().blob((0.4, 11.0, 36.6), (5.8, 5.0, 4.4), p=2.4)
    rig.part("torso", g, FUR, finish="hair")
    g = Geo().capsule((2.6, 11.3, 23.8), (3.2, 11.3, 21.0), 3.9, 3.9)
    rig.part("fore_l", g, team=True, outline=0.8)

    # the sling: a cord from the near fist to a leather pouch holding a fat rock
    tip = (fr[0], fr[1] - 0.5, fr[2] - SLING_LEN)
    rig.secondary("sling", "fore_r", fr, tip, max_deg=16, gain=0.9)
    g = Geo().capsule(fr, (tip[0], tip[1], tip[2] + 2.0), 0.75)
    rig.part("sling", g, CORD, outline=0.7)
    g = Geo().blob((tip[0], tip[1], tip[2] - 0.5), (3.6, 3.0, 2.2), p=2.2, taper=(0.8, 1.1))
    rig.part("sling", g, LEATHER, outline=0.8)
    rig.joint("rock", "sling", tip)
    g = Geo().blob((tip[0] + 0.2, tip[1] - 0.8, tip[2] + 1.0), (4.0, 3.6, 3.7), p=2.1)
    rig.part("rock", g, ROCK)
    rig.track("muzzle", "sling", (tip[0], tip[1], tip[2] + 0.5))

    # far hand: a spare pebble to toss in idle
    rig.joint("pebble", "fore_l", fl)
    g = Geo().blob((fl[0] + 2.6, fl[1] - 1.5, fl[2] + 3.6), (2.5, 2.3, 2.3), p=2.1)
    rig.part("pebble", g, ROCK, outline=0.8)
    rig.track("_foot", "shin_r", (2.9, -5.2, 0.5))
    global ARM_R, ARM_L, SMEAR
    SMEAR = {"joint": "sling", "inner": (tip[0], tip[1], tip[2] + 4.0),
             "outer": (tip[0], tip[1], tip[2] - 2.5), "color": ROCK, "taper": 0.4, "start": 0.2}
    ARM_R = body.arm("r", "sling", tip)
    ARM_L = body.arm("l")


SMEAR = None  # set in build() once the sling tip is known


# -- poses ---------------------------------------------------------------------------------
ARM_R = ARM_L = None


def sling_arm(a, b, c):
    return ARM_R.pose(a, b, c)


def off_arm(a, b):
    return ARM_L.pose(a, b)


def stance():
    # sling arm low and a little forward, sling hanging; far hand up at the chest with a pebble
    return merge(sling_arm(-30, -8, -92), off_arm(-55, 5), {"torso": {"r": -2}})


def _idle(f):
    def extra(c, lag):
        return {"arm_r": {"r": 3 * lag}, "sling": {"r": 10 * lag},
                "fore_l": {"r": pick(f, [0, -6, -4, 4])},
                "pebble": {"z": pick(f, [0.0, 2.0, 7.0, 10.5]), "r": pick(f, [0, 40, 120, 200])}}
    return biped_idle(f, stance(), extra=extra)


def _walk(f):
    import math

    def extra(p, lag_p, bob, bob_lag):
        return {"arm_r": {"r": -20 * math.cos(p)}, "sling": {"r": 14 * math.cos(lag_p)},
                "arm_l": {"r": 12 * math.cos(p)}, "fore_l": {"r": 6 * math.cos(p)}}
    return biped_walk(f, stance(), lean=-6.0, bob_k=0.9, extra=extra)


ATTACK_MS = [100, 83, 125, 42, 125, 83, 83, 100]
ATTACK_IMPACT = 4
ATTACK_SMEAR = 3


def _attack(f):
    # 0 coil (lean back, arm low behind), 1 wind back, 2 held extreme (sling cocked behind
    # the head, stretch), 3 whip over the top (smear), 4 release: arm and sling level toward
    # the enemy, the rock has left (projectile at `muzzle`), lunge and squash, yell;
    # 5 follow-through down, 6-7 settle
    a = pick(f, [-120, 175, 150, 95, 18, -45, -70, -78])
    b = pick(f, [-130, 185, 165, 60, 6, -55, -66, -62])
    c = pick(f, [-110, 215, 200, 70, 2, -75, -100, -95])
    sq = pick(f, [-0.06, 0.02, 0.08, 0.04, -0.13, -0.06, -0.02, 0.0])
    pose = merge(sling_arm(a, b, c), off_arm(pick(f, [-20, 10, 30, -10, -80, -70, -64, -60]),
                                             pick(f, [40, 60, 70, 30, -40, -10, 10, 20])), {
        "body": dict(squash(sq), x=pick(f, [-1.5, -2.5, -3.0, 1.0, 4.0, 3.0, 1.0, 0])),
        "hips": {"z": pick(f, [-0.6, 0.0, 0.8, 0.2, -2.0, -1.4, -0.5, 0])},
        "torso": {"r": pick(f, [10, 14, 16, 0, -18, -14, -6, -2])},
        "head": {"r": pick(f, [-4, -8, -10, -2, 8, 6, 2, 0])},
        "thigh_r": {"r": pick(f, [-6, -8, -10, 8, 20, 16, 6, 0])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -14, -10, -4, 0])},
        "thigh_l": {"r": pick(f, [6, 8, 10, -6, -14, -10, -4, 0])},
        "shin_l": {"r": pick(f, [-4, -6, -6, -4, -4, -2, 0, 0])},
        "rock": {"hide": f in (4, 5, 6)},
    })
    if f == 3:
        pose["sling"]["sz"] = 1.25  # smear frame: the cord stretches along the whip
    if f in (3, 4):
        pose.update({"mouth": {"hide": True}, "yell": {"show": True}})
    return pose


def _hit(f):
    return biped_hit(f, stance(), extra=lambda a: {"arm_r": {"r": 16 * a}, "sling": {"r": 30 * a}})


def _die(f):
    pose = merge(stance(), fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_r": {"r": pick(f, [60, 50, 50])}, "sling": {"r": pick(f, [60, 30, 30])},
        "arm_l": {"r": pick(f, [120, 90, 90])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
        "pebble": {"z": pick(f, [8.0, 14.0, 14.0]), "hide": f == 2},
    })
    if f == 0:
        pose.update({"mouth": {"hide": True}, "yell": {"show": True}})
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, smear=ATTACK_SMEAR, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
