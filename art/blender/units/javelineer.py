"""Javelineer: Bronze Age ranged (A17.9). Javelin that pierces 2 targets, ~68 lu.

Look (A17.12): a light skirmisher in a short team tunic belted with leather, a sandstone
cloak rolled over the far shoulder, a team headband with trailing ties over curly hair, bare
arms and legs, sandals. A bundle of javelins sits in a leather case on the back (the shafts
stick up over the shoulder), and the throwing arm is cocked by the ear with a javelin ready,
the far hand pointing at the enemy. The attack is a wind-up throw: coil back, held extreme,
a smeared whip over the top, release (the projectile leaves at the per-frame `muzzle`),
follow-through, and a reach back to the case for the next javelin.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "javelineer"
NAME = "Javelineer"
HEIGHT_LU = 68
CANVAS = (270, 240)
FEET = (116, 212)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 32)}

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
JAV_F, JAV_B = 44.0, 9.0          # javelin tip ahead of / butt behind the fist (modelled along +X)
SMEAR = {"joint": "jav", "inner": (HR[0] + JAV_F - 14, HR[1] - 1.0, HR[2]),
         "outer": (HR[0] + JAV_F, HR[1] - 1.0, HR[2]), "color": B.WOOD, "taper": 0.4, "start": 0.2, "behind": 4.0}


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig, greaves=False)

    # javelin case on the back (behind the body), shafts over the far shoulder
    rig.joint("case", "torso", (-9.0, 4.0, 30.0))
    g = Geo().capsule((-8.0, 6.0, 20.0), (-12.5, 6.0, 40.0), 4.2, 4.6)
    rig.part("case", g, B.LEATHER)
    g = Geo().blob((-12.6, 6.0, 40.4), (4.9, 5.0, 1.4), p=2.6, rot=(0, 12, 0))
    rig.part("case", g, B.LEATHER_DK, outline=0.6)
    g = Geo()
    for dx, dy, top in ((-1.5, 4.0, 60.0), (1.2, 7.0, 57.0), (-4.0, 8.0, 55.0)):
        g.capsule((-11.0 + dx, dy, 38.0), (-14.5 + dx * 1.3, dy, top), 0.9)
    rig.part("case", g, B.WOOD, outline=0.6)
    g = Geo()
    for dx, dy, top in ((-1.5, 4.0, 60.0), (1.2, 7.0, 57.0), (-4.0, 8.0, 55.0)):
        x1 = -14.5 + dx * 1.3
        g.lathe([(0, 0), (1.3, 0.8), (1.6, 2.6), (0, 6.0)], (x1 + 0.1, dy, top - 1.0), (x1 - 1.0, dy, top + 5.0),
                segs=8, squash=(1.0, 0.55))
    rig.part("case", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    g = Geo().capsule((9.5, -6.5, 36.0), (-8.5, 6.5, 24.0), 1.2)       # strap
    rig.part("torso", g, B.LEATHER_DK, outline=0.6)

    # team tunic with a flared skirt (follow-through hem), leather belt
    g = Geo().blob((0.2, 0, 28.0), (10.2, 9.4, 11.4), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, team=True)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=10, gain=0.8)
    g = Geo().blob((0.6, 0, 14.6), (11.6, 10.6, 5.6), p=2.4, taper=(1.16, 0.92))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.6, 0, 10.0), (11.8, 10.8, 1.1), p=3.0)
    rig.part("hem", g, B.LINEN, outline=0.6)
    g = Geo().blob((0.4, 0, 20.4), (11.0, 10.1, 1.8), p=3.2)
    rig.part("torso", g, B.LEATHER)
    # rolled sandstone cloak over the far shoulder
    g = Geo().capsule((-4.0, 10.0, 38.0), (8.0, 8.0, 34.0), 3.6).capsule((8.0, 8.0, 34.0), (10.0, 4.0, 26.0), 3.0)
    rig.part("torso", g, B.SAND)

    # head: curly hair, team headband with ties, big eyes
    B.head_ball(rig)
    B.face(rig, cx=12.0, cz=50.0, brow=B.HAIR, eye_r=(3.2, 3.0, 3.8))
    g = Geo()
    for x, y, z, r in ((0.0, 0.0, 58.0, 6.4), (-5.0, -4.0, 56.0, 5.2), (-5.0, 5.0, 56.0, 5.2), (4.6, -3.6, 58.4, 4.6),
                       (5.0, 4.0, 58.0, 4.4), (-8.4, 0.0, 51.0, 5.4), (-6.0, -7.4, 50.0, 3.8), (-6.0, 7.4, 50.0, 3.8),
                       (8.4, 0.0, 58.2, 3.6)):
        g.blob((x, y, z), (r, r, r * 0.92), p=2.1)
    rig.part("head", g, B.HAIR, finish="hair")
    g = Geo().blob((1.6, 0, 55.2), (12.6, 12.0, 1.9), p=2.6, rot=(0, -6, 0))
    rig.part("head", g, team=True, outline=0.7)
    rig.secondary("ties", "head", (-10.0, 0, 55.0), (-19.0, 0, 50.0), max_deg=14, gain=1.2)
    g = Geo().slab([(-10.0, 56.6), (-19.5, 53.0), (-20.5, 49.0), (-17.0, 51.6), (-10.0, 53.4)], 0.0, 1.4)
    g.slab([(-10.0, 55.6), (-16.5, 49.6), (-15.8, 45.6), (-13.6, 49.0), (-10.0, 53.0)], 2.0, 1.4)
    rig.part("ties", g, team=True, outline=0.6)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.0, r1=3.6)
    g = Geo().blob((0, B.ARM_Y["r"], B.HAND_Z + 3.4), (4.4, 4.4, 1.8), p=2.6)
    rig.part("fore_r", g, B.LEATHER, outline=0.7)

    # the javelin in the near fist, modelled level along +X; hidden once thrown
    hx, hy, hz = HR
    rig.joint("jav", "hand_r", (hx, hy - 1.0, hz))
    g = Geo().capsule((hx - JAV_B, hy - 1.0, hz), (hx + JAV_F - 5.0, hy - 1.0, hz), 0.95, 0.85, segs=10)
    rig.part("jav", g, B.WOOD, outline=0.6)
    g = Geo().capsule((hx - 2.0, hy - 1.3, hz), (hx + 2.4, hy - 1.3, hz), 1.3)       # thong grip
    rig.part("jav", g, B.LEATHER_DK, outline=0.4)
    g = Geo().lathe([(0, 0), (1.2, 0.6), (1.9, 2.4), (1.1, 5.0), (0, 7.4)], (hx + JAV_F - 7.2, hy - 1.0, hz),
                    (hx + JAV_F, hy - 1.0, hz), segs=10, squash=(1.0, 0.5))
    rig.part("jav", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    rig.track("muzzle", "hand_r", (hx + JAV_F * 0.6, hy - 1.0, hz))
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def throw(a, f, w):
    return B.arm("r", a, f, w, w_rest=0.0)


def aim(a, f):
    return B.arm("l", a, f)


STANCE = merge(throw(-158, 172, 10), aim(-50, -20), {"torso": {"r": -2}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), {
        "arm_r": {"r": 2 * lag}, "hand_r": {"r": -3 * lag},
        "arm_l": {"r": 2 * lag},
    })


def _walk(f):
    pose, p, bl = B.walk_legs(f, stride=40.0, lift=64.0)
    return merge(STANCE, pose, {
        "arm_r": {"r": 3 * math.cos(p)}, "hand_r": {"r": 3 * bl},
        "arm_l": {"r": -12 * math.cos(p)},
    })


def _attack(f):
    # 0 coil (lean back, javelin drawn), 1 wind back, 2 held extreme (arm far back, far arm
    # aims, stretch), 3 whip over the top (smear), 4 release: the javelin has left (projectile
    # at `muzzle`), arm forward, lunge and squash, yell; 5 follow-through down, 6 reach back to
    # the case (new javelin), 7 settle
    a = pick(f, [-165, -175, 178, 100, 10, -40, 150, -158])
    b = pick(f, [175, -178, 176, 40, 2, -40, 120, 172])
    c = pick(f, [12, 14, 16, 8, -6, -40, 95, 10])
    sq = pick(f, [-0.05, 0.0, 0.07, 0.04, -0.13, -0.06, -0.02, 0.0])
    pose = merge(throw(a, b, c), aim(pick(f, [-40, -20, 5, -10, -70, -80, -60, -50]),
                                     pick(f, [-10, 5, 12, -10, -50, -60, -30, -20])), {
        "body": dict(squash(sq), x=pick(f, [-1.5, -2.5, -3.5, 1.0, 5.0, 4.0, 1.5, 0])),
        "hips": {"z": pick(f, [-0.6, 0.0, 0.8, 0.2, -2.2, -1.5, -0.5, 0])},
        "torso": {"r": pick(f, [8, 14, 18, 0, -20, -16, -4, -2])},
        "head": {"r": pick(f, [-4, -8, -10, -2, 8, 6, 0, 0])},
        "thigh_r": {"r": pick(f, [-6, -10, -12, 8, 24, 18, 6, 0])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [6, 10, 12, -6, -16, -12, -4, 0])},
        "shin_l": {"r": pick(f, [-4, -6, -6, -4, -6, -4, 0, 0])},
        "jav": {"hide": f in (4, 5)},
    })
    if f == 3:
        pose["jav"]["sx"] = 1.2     # smear frame: the javelin stretches along the whip
    if f in (3, 4):
        B.yell(pose)
    return pose


ATTACK_MS = [83, 83, 167, 42, 125, 83, 100, 100]


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_r": {"r": 14 * a}, "hand_r": {"r": 10 * a}, "arm_l": {"r": 24 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_r": {"r": pick(f, [60, 50, 50])}, "hand_r": {"r": pick(f, [30, 20, 20])},
        "arm_l": {"r": pick(f, [110, 90, 90])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=4, smear=3, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
