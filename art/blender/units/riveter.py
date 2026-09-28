"""Riveter: Industrial Age infantry (docs/design-lane-ages.md A17.10). Melee, blunt, ~68 lu.
Big Wrench: the first hit of each engagement deals x1.5.

Look (A17.12, Industrial palette): a burly factory hand in a team flat cap, a cream shirt with
rolled-up sleeves, team overalls (bib with a pocket, braces with brass buttons, team trousers),
iron-grey cuffs and hobnail boots, a ginger walrus moustache and sideburns. He hefts an oversized
iron adjustable wrench (leather grip, copper adjusting screw) up on his shoulder, so the melee role
reads at 56 px. The attack ("wrench wind-up") swings the wrench back over his head (held, yell),
chops it down with a smear and bangs it in front of him (held impact, squash), then recovers.
"""
from ageborn_art import fx
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "riveter"
NAME = "Riveter"
HEIGHT_LU = 68
CANVAS = (272, 262)
FEET = (120, 238)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
LENGTH = 32.0
JAW = 14.0
SMEAR = {"joint": "wrench", "inner": (FIST[0], FIST[1], FIST[2] + LENGTH * 0.7),
         "outer": (FIST[0], FIST[1], FIST[2] + LENGTH + JAW), "color": I.IRON_LT, "taper": 0.5, "start": 0.3}


def build(rig):
    I.skeleton(rig)
    I.legs(rig, team=True, cuff=I.IRON)
    I.overalls(rig)
    # a rag hanging from the back pocket
    g = Geo().blob((-10.6, -3.0, 16.0), (1.4, 2.8, 4.6), p=2.4, rot=(0, -10, 0))
    rig.part("hips", g, I.BRICK_LT, outline=0.5)

    I.head_ball(rig)
    I.face(rig, brow=I.GINGER, brow_angry=True)
    I.moustache(rig, I.GINGER, curl=False, big=1.15)
    I.sideburns(rig, I.GINGER)
    I.back_hair(rig, I.GINGER)
    I.ear(rig)
    I.flat_cap(rig, c=(1.0, 0, 57.8), team=True)

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=I.CREAM, team_sleeve=False, rolled=True, fist=4.6)
    # rolled sleeve cuffs above the elbows (cream) and a leather wrist strap on the near hand
    g = Geo().lathe([(4.6, 0), (4.8, 1.8), (4.5, 3.0)], (0, I.ARM_Y["r"], I.ELBOW_Z + 1.0),
                    (0, I.ARM_Y["r"], I.ELBOW_Z + 4.0), segs=16)
    rig.part("arm_r", g, I.CREAM_DK, outline=0.5)
    g = Geo().lathe([(4.1, 0), (4.3, 1.2), (4.1, 2.2)], (0, I.ARM_Y["r"], I.HAND_Z + 2.4),
                    (0, I.ARM_Y["r"], I.HAND_Z + 4.6), segs=14)
    rig.part("fore_r", g, I.LEATHER, outline=0.5)

    rig.joint("wrench", "hand_r", FIST)
    I.wrench(rig, "wrench", FIST, length=LENGTH, jaw=JAW)
    rig.track("wrenchHead", "wrench", (FIST[0], FIST[1], FIST[2] + LENGTH + JAW * 0.5))
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    # impact sparks at the jaw (shown on the held impact frame)
    I.fuse_spark(rig, "wrench", (FIST[0] + 4.0, FIST[1] - 2.0, FIST[2] + LENGTH + JAW * 0.9), size=1.6,
                 name="clang", hidden=True)


# -- poses ---------------------------------------------------------------------------------
def grip(a, f, w, la=-80.0, lf=-60.0):
    """Near arm (a, f) holding the wrench pointing `w`; far arm (la, lf)."""
    return merge(I.arm("r", a, f, w=w, w_rest=90.0), I.arm("l", la, lf))


IDLE = (-58.0, 20.0, 146.0)   # wrench up on the shoulder


def _idle(f):
    c, lag = I.idle_wave(f)
    a, fo, w = IDLE
    return merge(I.idle_body(f), grip(a + 2 * lag, fo + 3 * lag, w + 5 * lag, -76 + 3 * c, -40 + 4 * lag))


def _walk(f):
    import math
    pose, p, bl = I.walk_legs(f, lean=-7.0)
    sw = math.cos(p)
    a, fo, w = IDLE
    return merge(pose, grip(a + 4 * sw, fo + 3 * bl, w + 7 * bl, -80 - 24 * sw, -56 - 16 * sw))


def _attack(f):
    # 0-1 wind up, 2 held extreme (wrench high behind the cap, lean back, yell), 3 smear (chop),
    # 4 held impact (jaw down in front, squash 0.85/1.15, clang), 5-7 recover
    a = pick(f, [-20, 20, 60, 15, -20, -28, -38, -42])
    fo = pick(f, [50, 95, 125, 45, -10, -8, 10, 25])
    w = pick(f, [110, 150, 172, 60, -22, -14, 30, 60])
    la = pick(f, [-70, -100, -120, -30, 0, -20, -55, -75])
    lf = pick(f, [-40, -70, -80, -10, 12, -10, -40, -45])
    pose = merge(grip(a, fo, w, la, lf), {
        "body": dict(squash(pick(f, [0.03, 0.06, 0.09, 0.02, -0.15, -0.08, -0.03, 0.0])),
                     x=pick(f, [-1, -2.5, -3.5, 2.0, 5.0, 4.0, 2.0, 0.5])),
        "torso": {"r": pick(f, [4, 10, 14, -8, -17, -12, -6, -2])},
        "head": {"r": pick(f, [2, 5, 7, -4, -8, -6, -3, 0])},
        "thigh_r": {"r": pick(f, [4, 6, 8, 18, 27, 22, 14, 6])},
        "shin_r": {"r": pick(f, [0, 0, -4, -10, -16, -12, -6, 0])},
        "thigh_l": {"r": pick(f, [-4, -8, -10, -14, -18, -16, -10, -4])},
        "clang": {"show": f == 4},
    })
    if f == 3:
        pose["wrench"] = {"sz": 1.12}
    if f in (2, 3, 4):
        I.yell(pose)
    return pose


def _hit(f):
    a, fo, w = IDLE
    k = [1.0, 0.55, 0.2][f]
    return merge(grip(a + 16 * k, fo + 18 * k, w + 10 * k, -60 + 20 * k, -30 + 30 * k), I.hit_body(f))


def _die(f):
    pose = merge(grip(pick(f, [30, 0, -20]), pick(f, [70, 30, 0]), pick(f, [160, 130, 110]),
                      pick(f, [40, 10, -20]), pick(f, [80, 30, 0])),
                 fx.die_pose(f), I.die_limbs(f))
    if f in (0, 1):
        I.ko(pose)
        I.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
