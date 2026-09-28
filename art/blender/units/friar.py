"""Friar: Medieval Age support (DESIGN A5.3). Heals allies; sling (proj.rock), ~64 lu.

Look (A11): a round, jolly friar with a bald tonsured head, a ring of brown hair, rosy
cheeks and a big nose, in a team-dyed habit with a parchment cowl, a knotted rope belt
and wooden sandals. He hugs a parchment prayer book with a gold clasp in the far arm and
whirls a leather sling in the near hand. The attack winds up, whirls the sling overhead
(smear on the last whirl), releases with a snap, and follows through. The projectile
spawns at the per-frame `muzzle` anchor (the pouch) on the release frame.
"""
from ageborn_art import fx
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "friar"
NAME = "Friar"
HEIGHT_LU = 64
CANVAS = (256, 240)
FEET = (112, 212)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30), "muzzle": (39, 27)}  # muzzle: release frame

SKIN = "#EBC4A0"
CHEEK = "#E2AE9E"
HAIR = "#5E4C3E"
ROPE = "#CDBB92"
PARCH = "#E8DFC8"
LEATHER = "#6B5647"
SANDAL = "#8C765F"
GOLD = "#D4A437"
ROCK = "#8C8A86"
BOOK = "#6E3346"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
SLING = 16.0   # cord length from the fist to the pouch
SMEAR = {"joint": "sling", "inner": (HR[0], HR[1] - 1.0, HR[2] - SLING + 4), "outer": (HR[0], HR[1] - 1.0, HR[2] - SLING - 2),
         "color": LEATHER, "taper": 0.3, "start": 0.1, "behind": 3.0}


def build(rig):
    B.skeleton(rig, head=(1, 0, 37))
    # legs: only the sandalled feet show below the habit
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().capsule((0, y, 15), (0.5, y, 8.5), 4.4, 3.9)
        rig.part(f"thigh_{s}", g, team=True)
        g = Geo().capsule((0.5, y, 8.5), (1.0, y, 4.0), 3.2, 2.9)
        rig.part(f"shin_{s}", g, SKIN)
        g = Geo().blob((3.3, y, 1.8), (6.4, 4.2, 1.9), p=3.0, taper=(1.02, 0.9))
        rig.part(f"shin_{s}", g, SANDAL)
        g = Geo().blob((2.4, y, 3.6), (5.2, 3.9, 2.4), p=2.4)
        rig.part(f"shin_{s}", g, SKIN)

    # the habit: a round belly and a bell skirt that swings on its own joint
    g = Geo().blob((1.5, 0, 26.5), (12.8, 11.4, 12.2), p=2.1, taper=(1.12, 0.84))
    rig.part("torso", g, team=True)
    rig.secondary("skirt", "hips", (0.8, 0, 17.0), (0.0, 0, 5.0), max_deg=9, gain=0.8)
    g = Geo().lathe([(0, 3.8), (13.2, 4.0), (13.6, 6.0), (12.0, 12.0), (10.8, 18.0), (0, 18.5)],
                    (1.0, 0, 0), segs=24, squash=(1.0, 0.9))
    rig.part("skirt", g, team=True)
    # rope belt with a hanging knotted end
    g = Geo().lathe([(12.4, -1.3), (13.4, 0), (12.4, 1.3)], (2.0, 0, 20.8), segs=24, squash=(1.0, 0.9))
    g.capsule((11.0, -8.5, 20.5), (11.6, -9.4, 10.5), 1.2)
    g.sphere((11.6, -9.4, 14.2), 1.8, cuts=3).sphere((11.7, -9.5, 10.2), 1.8, cuts=3)
    rig.part("torso", g, ROPE, outline=0.8)
    # parchment cowl around the neck and shoulders
    g = Geo().blob((0.2, 0, 36.2), (11.6, 12.4, 4.6), p=2.4, taper=(1.12, 0.9))
    g.blob((-9.0, 0, 38.5), (4.4, 9.5, 5.2), p=2.2)
    rig.part("torso", g, PARCH)

    # head: bald tonsure, hair ring, rosy cheeks, big nose, happy eyes
    g = Geo().blob((2, 0, 48.0), (11.8, 11.2, 11.6), p=2.2)
    g.blob((13.8, -0.6, 46.6), (3.8, 3.4, 3.6), p=2.0)  # nose
    rig.part("head", g, SKIN)
    # the tonsure: a fluffy ring of hair around the back and sides, above the ears
    g = Geo()
    import math
    for k in range(9):
        t = math.radians(100 + 160 * k / 8)
        g.blob((2.0 + 11.2 * math.cos(t), 10.8 * math.sin(t), 52.0 + 0.8 * math.sin(3 * t)),
               (4.2, 4.2, 3.6), p=2.1)
    rig.part("head", g, HAIR, finish="hair")
    for y in (-6.8, 6.4):
        g = Geo().blob((10.8, y, 44.8), (2.4, 2.4, 2.0), p=2.0)
        rig.part("head", g, CHEEK, highlight=False, outline=0)
    B.face(rig, cx=12.4, cz=49.4, brow=HAIR, brow_angry=False, eye_r=(3.0, 2.9, 3.4))

    # far arm hugs a prayer book; near arm swings the sling (both in team sleeves)
    B.arm_parts(rig, "l", None, hand=SKIN, team_sleeve=True, r0=4.8, r1=4.4)
    B.arm_parts(rig, "r", None, hand=SKIN, team_sleeve=True, r0=4.8, r1=4.4)
    g = Geo().blob((3.0, B.ARM_Y["l"] - 3.5, B.HAND_Z + 3.0), (5.2, 2.2, 6.8), p=4.0)
    rig.part("hand_l", g, BOOK)
    g = Geo().blob((3.0, B.ARM_Y["l"] - 3.9, B.HAND_Z + 3.0), (4.6, 2.2, 6.2), p=4.0)
    g.clip((0, B.ARM_Y["l"] - 3.2, 0), (0, 1, 0))
    rig.part("hand_l", g, PARCH, outline=0.6)
    g = Geo().blob((7.8, B.ARM_Y["l"] - 3.8, B.HAND_Z + 3.0), (1.2, 1.4, 1.8), p=3.0)
    rig.part("hand_l", g, GOLD, finish="metal", outline=0.6)

    # the sling hangs from the near fist (rest direction -90): two cords, pouch, rock
    x, y, z = HR
    rig.joint("sling", "hand_r", (x, y - 1.0, z))
    g = Geo().capsule((x + 0.8, y - 1.0, z), (x + 1.2, y - 1.0, z - SLING + 1.5), 0.55, segs=8, rings=2)
    g.capsule((x - 0.8, y - 1.0, z), (x - 1.2, y - 1.0, z - SLING + 1.5), 0.55, segs=8, rings=2)
    rig.part("sling", g, LEATHER, outline=0.5)
    g = Geo().blob((x, y - 1.0, z - SLING), (3.2, 2.2, 2.4), p=2.2)
    rig.part("sling", g, LEATHER)
    rig.joint("rock", "sling", (x, y - 1.0, z - SLING + 1.0))
    g = Geo().blob((x, y - 2.6, z - SLING + 1.4), (2.3, 2.0, 2.0), p=2.3)
    rig.part("rock", g, ROCK)
    rig.track("muzzle", "sling", (x, y - 1.0, z - SLING))
    rig.track("_foot", "shin_r", (3.3, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def slinger(a, f, w, spin=None):
    pose = B.arm("r", a, f)
    # the sling joint is a child of the hand; rest direction -90 (hanging)
    pose["sling"] = {"r": w + 90.0 - (f + 90.0)}
    return pose


BOOK_ARM = B.arm("l", -70, 40)
STANCE = merge(BOOK_ARM, slinger(-80, -60, -95), {"torso": {"r": 2}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f, bob=1.0, sq=0.05, lean=1.2), {
        "sling": {"r": 8 * lag}, "arm_r": {"r": 3 * lag}, "arm_l": {"r": -2 * lag},
    })


def _walk(f):
    import math
    pose, p, bl = B.walk_legs(f, stride=28.0, lift=46.0, bob=2.0, lean=-3.0, sway=5.0)
    return merge(STANCE, pose, {
        "arm_r": {"r": 18 * math.cos(p)}, "sling": {"r": -14 * math.cos(p - 0.8)},
        "arm_l": {"r": -4 * math.cos(p)},
    })


ATTACK_MS = [100, 83, 83, 83, 83, 100, 100, 100]
ATTACK_IMPACT = 4
ATTACK_SMEAR = 3


def _attack(f):
    # 0 wind up (arm back, sling trailing), 1-3 whirl overhead (smear on 3), 4 release:
    # arm forward, cords snap forward, rock gone; 5 follow-through down, 6-7 settle
    a = pick(f, [-150, 110, 100, 95, 20, -30, -60, -75])
    fo = pick(f, [-120, 110, 100, 90, 10, -45, -65, -62])
    w = pick(f, [-160, 200, 100, -10, 20, -70, -100, -95])
    pose = merge(BOOK_ARM, slinger(a, fo, w), {
        "body": dict(squash(pick(f, [-0.04, 0.03, 0.04, 0.02, -0.08, -0.04, 0.0, 0.0])),
                     x=pick(f, [-1.5, -1, 0, 1, 3, 2.5, 1, 0])),
        "torso": {"r": pick(f, [10, 4, 0, -4, -12, -10, -4, 1])},
        "head": {"r": pick(f, [4, 6, 6, 2, -6, -4, -1, 0])},
        "thigh_r": {"r": pick(f, [-6, 0, 4, 8, 16, 14, 6, 0])},
        "thigh_l": {"r": pick(f, [6, 0, -4, -8, -14, -12, -6, 0])},
        "rock": {"hide": f in (4, 5, 6)},
    })
    if f in (3, 4):
        B.yell(pose)
    if f in (1, 2, 3):
        pose["sling"]["sz"] = 1.2    # the whirl stretches the cords
    if f == 4:
        pose["sling"]["sz"] = 1.3
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_r": {"r": 28 * a}, "sling": {"r": -20 * a},
                                         "arm_l": {"r": 10 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_r": {"r": pick(f, [130, 90, 90])}, "sling": {"r": pick(f, [60, 20, 0])},
        "arm_l": {"r": pick(f, [60, 40, 40])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, smear=ATTACK_SMEAR, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
