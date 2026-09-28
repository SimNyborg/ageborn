"""Footman: Medieval Age infantry (DESIGN A5.3). Arming sword, Shield Wall, ~68 lu.

Look (A11): a stocky man-at-arms in a steel kettle hat with a wide brim, big eyes under the
brim and a bushy moustache, a slate mail shirt under a team tabard, wine hose and brown
boots. A big team heater shield (steel rim, gold boss) is carried forward on the near arm,
so the Shield Wall trait reads at a glance, and an oversized arming sword (gold guard) is
held up in the far hand. The attack is an overhead chop over the shield rim with a small
shield shove on impact.
"""
from ageborn_art import fx
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "footman"
NAME = "Footman"
HEIGHT_LU = 68
CANVAS = (256, 232)
FEET = (100, 206)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

SKIN = "#EBC4A0"
HAIR = "#4A3628"
MAIL = "#6B7682"
STEEL = "#A7B0BB"
DARK = "#2B2F36"
WINE = "#8E2A4A"
LEATHER = "#6B5647"
BOOT = "#7F6A58"   # lighter than v2: dark boots under the shield read as a beard
GOLD = "#D4A437"
PARCH = "#E8DFC8"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (shield)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand (sword)
BLADE = 38.0
SMEAR = {"joint": "hand_l", "inner": (HL[0], HL[1], HL[2] + 16), "outer": (HL[0], HL[1], HL[2] + 4 + BLADE),
         "color": STEEL, "taper": 0.45, "start": 0.25, "behind": 4.0}


def build(rig):
    B.skeleton(rig)
    B.legs(rig, WINE, BOOT, cuff=LEATHER)

    # torso: mail shirt, team tabard (front and back panels over the mail), belt
    g = Geo().blob((0, 0, 28.5), (11.0, 10.0, 11.8), p=2.3, taper=(1.1, 0.95))
    g.blob((0, 0, 17.5), (10.4, 9.6, 4.6), p=2.6)
    rig.part("torso", g, MAIL, finish="metal")
    g = Geo().blob((0.4, 0, 25.5), (11.9, 10.9, 10.8), p=2.8, taper=(1.12, 0.9))
    g.clip((0, 0, 36.2), (0, 0, 1))
    rig.part("torso", g, team=True)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=8, gain=0.7)
    g = Geo().blob((0.6, 0, 15.5), (12.2, 11.0, 4.6), p=2.8, taper=(1.12, 1.0))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.6, 0, 11.4), (12.0, 10.8, 1.3), p=3.0)
    rig.part("hem", g, PARCH)
    g = Geo().blob((0.4, 0, 20.8), (12.2, 11.1, 1.9), p=3.2)
    rig.part("torso", g, LEATHER)
    g = Geo().blob((12.1, -2.0, 20.8), (1.3, 2.2, 2.2), p=3.0)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    # mail shoulders
    for s, y in (("r", -12.0), ("l", 11.5)):
        g = Geo().blob((0, y, 36.8), (6.4, 5.6, 5.2), p=2.4)
        rig.part(f"arm_{s}", g, MAIL, finish="metal")

    # head: big, kettle hat with a wide brim, moustache
    g = Geo().blob((2, 0, 48.5), (11.6, 11.0, 11.4), p=2.3)
    g.blob((13.4, -0.6, 47.4), (3.2, 3.0, 3.2), p=2.0)  # nose
    rig.part("head", g, SKIN)
    g = Geo().blob((-6.0, 0, 46.0), (5.6, 9.6, 6.4), p=2.2)  # hair at the back
    rig.part("head", g, HAIR, finish="hair")
    B.face(rig, cx=12.2, cz=49.6, brow=HAIR, eye_r=(3.3, 3.1, 3.9))
    g = Geo().blob((12.6, -3.6, 43.6), (3.0, 3.8, 2.0), p=2.2, rot=(18, 0, 0))
    g.blob((12.6, 2.4, 43.6), (3.0, 3.8, 2.0), p=2.2, rot=(-18, 0, 0))
    rig.part("head", g, HAIR, finish="hair")
    g = Geo().blob((1.5, 0, 55.0), (12.2, 12.0, 9.2), p=2.4)
    g.clip((0, 0, 54.2), (0, 0, -1))
    rig.part("head", g, STEEL, finish="metal")
    g = Geo().lathe([(0, -0.9), (15.8, -0.9), (16.6, 0.0), (15.8, 0.9), (0, 0.9)], (2.0, 0, 54.8),
                    segs=28, squash=(1.0, 0.92), rot=(0, -6, 0))
    rig.part("head", g, STEEL, finish="metal")
    g = Geo().capsule((1.5, 0, 64.2), (1.5, 0, 66.2), 2.0)  # knob
    rig.part("head", g, GOLD, finish="metal", outline=0.8)
    # team feather tuft on the knob, streaming back (follow-through)
    rig.secondary("plume", "head", (0.5, 0, 66.5), (-14, 0, 68), max_deg=12, gain=1.0)
    g = Geo()
    for x, z, r in ((0.5, 67.8, 3.4), (-3.6, 70.0, 4.0), (-8.0, 70.4, 3.8), (-12.0, 69.0, 3.2),
                    (-15.0, 66.8, 2.5)):
        g.blob((x, 0, z), (r * 1.2, r * 0.8, r), p=2.1)
    rig.part("plume", g, team=True)

    # arms: mail sleeves, leather gloves
    for s in ("r", "l"):
        B.arm_parts(rig, s, MAIL, hand=LEATHER, cuff=LEATHER, glove_finish="matte")

    # sword in the far hand, modelled pointing up from the fist (rest direction 90)
    hx, hy, hz = HL
    g = Geo().lathe([(0, -5.5), (2.0, -5.2), (2.2, -1.0), (1.9, 4.0), (0, 4.4)], (hx, hy, hz), segs=12)
    rig.part("hand_l", g, WINE)
    g = Geo().sphere((hx, hy, hz - 6.2), 2.3, cuts=3)
    g.blob((hx, hy, hz + 4.6), (1.8, 7.4, 1.6), p=2.8)
    rig.part("hand_l", g, GOLD, finish="metal", outline=0.9)
    g = Geo().lathe([(0, 0), (3.6, 0.2), (3.9, BLADE * 0.6), (2.6, BLADE - 5), (0, BLADE)],
                    (hx, hy, hz + 5.4), squash=(1.0, 0.36), segs=12)
    rig.part("hand_l", g, STEEL, finish="metal")
    rig.track("swordTip", "hand_l", (hx, hy, hz + 5.4 + BLADE))

    # shield on the near hand, modelled upright (rest direction 90): team face, steel rim,
    # parchment chevron and a gold boss
    # a smaller kite shield (v3): the torso and legs stay visible beside it
    sx, sy, sz = HR[0] + 1.5, HR[1] - 6.5, HR[2] + 1.0
    g = Geo().blob((sx, sy + 1.0, sz), (10.2, 1.6, 12.8), p=3.4, taper=(0.24, 1.0))
    rig.part("hand_r", g, STEEL, finish="metal")
    g = Geo().blob((sx, sy, sz + 0.5), (8.4, 1.6, 10.8), p=3.4, taper=(0.2, 1.0))
    rig.part("hand_r", g, team=True, outline=0.8)
    g = Geo().capsule((sx - 6.2, sy - 1.6, sz - 0.8), (sx, sy - 1.8, sz + 5.2), 1.9)
    g.capsule((sx, sy - 1.8, sz + 5.2), (sx + 6.2, sy - 1.6, sz - 0.8), 1.9)
    rig.part("hand_r", g, PARCH, outline=0.6)
    g = Geo().blob((sx, sy - 1.8, sz + 5.6), (2.8, 1.6, 2.8), p=2.2)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.8)
    rig.track("_foot", "shin_r", (3.3, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def shield(a, f, w=90.0):
    return B.arm("r", a, f, w, w_rest=90.0)


def sword(a, f, w):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(shield(-58, -22, 96), sword(-30, 55, 72), {"torso": {"r": -3}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), {
        "arm_l": {"r": 3 * lag}, "hand_l": {"r": -4 * lag},
        "arm_r": {"r": -2 * lag},
    })


def _walk(f):
    import math
    pose, p, bl = B.walk_legs(f, stride=40.0, lift=66.0)
    return merge(STANCE, pose, {
        "arm_r": {"r": 5 * math.cos(p)},
        "arm_l": {"r": -10 * math.cos(p)}, "hand_l": {"r": 4 * bl},
    })


def _attack(f):
    # 0-1 anticipation (sword cocked back, squash), 2 held extreme (sword behind the head),
    # 3 smear, 4 held impact (chop over the shield, shove), 5-7 recovery (fx.MELEE_MS)
    a = pick(f, [40, 80, 100, 50, -15, -12, -20, -30])
    fo = pick(f, [100, 130, 150, 40, -25, -15, 20, 55])
    w = pick(f, [140, 170, 195, 60, -18, -8, 40, 72])
    sq = pick(f, [-0.05, -0.10, 0.08, 0.05, -0.15, -0.08, 0.0, 0.0])
    pose = merge(sword(a, fo, w), shield(pick(f, [-50, -45, -40, -55, -65, -62, -58, -55]),
                                         pick(f, [0, -5, -10, 10, 20, 15, 8, 5]), 92), {
        "body": dict(squash(sq), x=pick(f, [-1, -2.5, -3.5, 2, 6, 5, 2, 0])),
        "hips": {"z": pick(f, [0, -0.8, 0.8, 0, -2.5, -1.8, -0.6, 0])},
        "torso": {"r": pick(f, [4, 10, 16, -6, -22, -18, -9, -3])},
        "head": {"r": pick(f, [2, 5, 7, -4, -8, -6, -3, 0])},
        "thigh_r": {"r": pick(f, [0, -6, -8, 10, 22, 18, 8, 0])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [0, 6, 8, -6, -16, -12, -6, 0])},
        "shin_l": {"r": pick(f, [0, -4, -6, -4, -6, -4, 0, 0])},
    })
    if f == 3:
        pose["hand_l"]["sz"] = 1.25  # smear frame: the blade stretches along the chop
    if f in (3, 4):
        B.yell(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_r": {"r": 12 * a}, "arm_l": {"r": 20 * a},
                                         "hand_l": {"r": 10 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_l": {"r": pick(f, [60, 50, 50])}, "hand_l": {"r": pick(f, [30, 20, 20])},
        "arm_r": {"r": pick(f, [30, 20, 20])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        B.yell(pose)
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
