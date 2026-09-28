"""Bronze Colossus: Bronze Age Legendary siege heavy (A17.9), walker rig. Stomp (splash, slow),
Molten Heart (burst on death), ~200 lu. Rendered at the Legendary sheet scale.

Look (A17.12): a huge walking statue of a hoplite cast in aged bronze, streaked with verdigris,
with glowing white-hot seams at the joints and a cracked molten heart in the chest. A great
crested helmet (a team crest like a sail, glowing eye slits in a dark T-shaped face opening),
a wide team sash across the chest, team pteruges, polished bands on the arms and greaves,
heavy sandalled feet that plant without sliding. Fists only: the attack is a giant overhead
hammer-fist smash into the ground with a stomp (dust ring and sparks on the held impact); the
walk is a slow, heavy stride (1.4 s). The death buckles the knees before the hand-off.
"""
import math

from ageborn_art import fx, retime
from ageborn_art import rigs_bronze as B
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

retime.HEAVY_MELEE.add("bronze_colossus")

SLUG = "bronze_colossus"
NAME = "Bronze Colossus"
HEIGHT_LU = 200
YAW_DEG = -14.0
CANVAS = (640, 610)
FEET = (262, 580)
ANCHORS = {"head": (6, 196), "hitCenter": (0, 104)}

BR = B.AGED
BR_DK = B.AGED_DK
BR_LT = "#B9A67E"
PATINA = B.VERD_LT
SEAM = B.FIRE
SEAM_CORE = B.FIRE_CORE
DARK = "#2E2722"

HIP_Z = 62.0
THIGH, SHIN = 32.0, 36.0
ANK_REST = HIP_Z - THIGH - SHIN
ANKLE_H = 11.0
LEG_Y = {"r": -16.0, "l": 16.0}
STANCE_X = {"r": 10.0, "l": -12.0}
LIFT = 8.0
SHOULDER_Z = 134.0
ARM_Y = {"r": -38.0, "l": 36.0}
UPPER, LOWER = 25.0, 25.0
HAND = {s: (0.0, ARM_Y[s], SHOULDER_Z - UPPER - LOWER) for s in ("r", "l")}
SMEAR = {"joint": "hand_r", "inner": (HAND["r"][0], HAND["r"][1], HAND["r"][2] + 6.0),
         "outer": (HAND["r"][0] + 2.0, HAND["r"][1], HAND["r"][2] - 12.0), "color": BR_LT, "taper": 0.6,
         "start": 0.3, "behind": 8.0}


def _glow_line(rig, joint, pts, r=1.2):
    g = Geo()
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, r, r * 0.8, segs=8, rings=2)
    rig.part(joint, g, glow=SEAM, outline=0.8, outline_hex=DARK)


def _arm(rig, s):
    y = ARM_Y[s]
    z = SHOULDER_Z
    sg = 1 if s == "r" else -1
    g = Geo().capsule((0, y, z), (0, y, z - UPPER), 9.0, 8.0)
    rig.part(f"arm_{s}", g, BR, finish="metal")
    g = Geo().blob((1.0, y - 1.0 * sg, z + 3.0), (13.0, 11.0, 10.5), p=2.6)      # shoulder
    rig.part(f"arm_{s}", g, BR, finish="metal")
    g = Geo().blob((1.0, y - 1.4 * sg, z + 5.5), (11.0, 9.0, 6.4), p=2.6)        # patina cap
    g.clip((0, 0, z + 6.0), (0, 0, -1))
    rig.part(f"arm_{s}", g, PATINA)
    g = Geo().lathe([(0, -3.0), (9.2, -2.8), (9.6, 0), (9.2, 2.8), (0, 3.0)], (0, y, z - UPPER), (0, y + 1, z - UPPER),
                    segs=18)
    rig.part(f"fore_{s}", g, DARK, finish="metal")
    g = Geo().lathe([(0, -1.2), (10.0, -1.0), (10.4, 0), (10.0, 1.0), (0, 1.2)], (0, y - 0.5 * sg, z - UPPER),
                    (0, y + 0.5 - 0.5 * sg, z - UPPER), segs=18)
    rig.part(f"fore_{s}", g, glow=SEAM, outline=0.8, outline_hex=DARK)
    g = Geo().capsule((0, y, z - UPPER), (0, y, z - UPPER - LOWER + 4), 8.4, 8.8)
    rig.part(f"fore_{s}", g, BR, finish="metal")
    g = Geo().blob((0.5, y, z - UPPER - 15.0), (10.4, 10.4, 5.0), p=3.0)           # polished bracer band
    rig.part(f"fore_{s}", g, B.BRONZE, finish="metal", outline=0.8)
    x, hy, hz = HAND[s]
    g = Geo().blob((x + 1.5, hy, hz - 2.0), (11.0, 9.6, 10.4), p=2.6)              # big fist
    g.blob((x + 8.0, hy - 4.0 * sg, hz + 1.0), (4.4, 4.0, 4.0), p=2.4)              # thumb
    rig.part(f"hand_{s}", g, BR, finish="metal")
    g = Geo()
    for k in range(4):
        g.capsule((x + 10.6, hy - 6.0 + 4.0 * k, hz - 1.0), (x + 10.6, hy - 6.0 + 4.0 * k, hz - 9.0), 1.6)
    rig.part(f"hand_{s}", g, BR_DK, finish="metal", outline=0.6)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("torso", "hips", (0, 0, HIP_Z + 12.0))
    rig.joint("head", "torso", (4.0, 0, 146.0))
    for s in ("r", "l"):
        F.walker_leg(rig, s, (0.0, LEG_Y[s], HIP_Z), THIGH, SHIN)
        y = ARM_Y[s]
        rig.joint(f"arm_{s}", "torso", (0, y, SHOULDER_Z))
        rig.joint(f"fore_{s}", f"arm_{s}", (0, y, SHOULDER_Z - UPPER))
        rig.joint(f"hand_{s}", f"fore_{s}", HAND[s])

    _arm(rig, "l")

    # legs: bronze thighs, glowing knee seams, greaves with polished rims, sandalled feet
    for s in ("r", "l"):
        y = LEG_Y[s]
        kz = HIP_Z - THIGH
        sg = 1 if s == "r" else -1
        g = Geo().capsule((0, y, HIP_Z), (0, y, kz), 10.0, 8.4)
        rig.part(f"thigh_{s}", g, BR, finish="metal")
        g = Geo().lathe([(0, -4.0), (8.8, -3.8), (9.4, 0), (8.8, 3.8), (0, 4.0)], (0, y, kz), (0, y + 1, kz), segs=20)
        rig.part(f"shin_{s}", g, DARK, finish="metal")
        g = Geo().lathe([(0, -1.2), (9.8, -1.0), (10.2, 0), (9.8, 1.0), (0, 1.2)], (0, y - 0.6 * sg, kz),
                        (0, y + 0.4 - 0.6 * sg, kz), segs=20)
        rig.part(f"shin_{s}", g, glow=SEAM, outline=0.8, outline_hex=DARK)
        g = Geo().capsule((0, y, kz), (0, y, ANK_REST + 4), 7.6, 6.4)
        rig.part(f"shin_{s}", g, BR, finish="metal")
        g = Geo().blob((3.0, y, kz - 17.0), (9.0, 9.6, 16.0), p=2.6, taper=(0.82, 1.08))      # greave
        rig.part(f"shin_{s}", g, BR_LT, finish="metal")
        g = Geo().blob((3.2, y, kz - 2.6), (8.6, 9.2, 1.6), p=3.0)
        rig.part(f"shin_{s}", g, B.BRONZE, finish="metal", outline=0.6)
        a = ANK_REST
        g = Geo().blob((6.0, y, a - 6.2), (17.0, 10.0, 6.0), p=3.0, taper=(1.0, 0.85))
        g.blob((-5.0, y, a - 3.0), (9.0, 9.0, 7.0), p=2.8)
        rig.part(f"foot_{s}", g, BR, finish="metal")
        g = Geo().blob((6.0, y, a - 10.6), (17.8, 10.6, 1.8), p=3.4)                           # sole
        g.capsule((-2.0, y - 9.6 * sg, a - 1.0), (10.0, y - 10.0 * sg, a - 7.0), 1.4)            # strap
        rig.part(f"foot_{s}", g, DARK, finish="metal", outline=0.6)
    rig.track("_foot", "foot_r", (6.0, LEG_Y["r"], ANK_REST - 12.0))

    # pelvis and the team pteruges
    g = Geo().blob((0, 0, HIP_Z + 6.0), (22.0, 22.0, 12.0), p=2.8)
    rig.part("hips", g, BR, finish="metal")
    rig.secondary("hem", "hips", (1.0, 0, HIP_Z + 4.0), (1.0, 0, HIP_Z - 20.0), max_deg=6, gain=0.6)
    g = Geo()
    n = 9
    for k in range(n):
        ang = math.pi * (0.55 + 1.9 * k / (n - 1))
        g.blob((23.0 * math.cos(ang), 23.0 * math.sin(ang), HIP_Z - 5.0), (6.0, 3.8, 11.5), p=3.4, taper=(0.9, 1.0),
               rot=(0, 0, math.degrees(ang) + 90))
    rig.part("hem", g, team=True)
    g = Geo().blob((1.0, 0, HIP_Z + 7.0), (23.6, 23.4, 3.4), p=3.2)                            # belt
    rig.part("hips", g, BR_DK, finish="metal")

    # torso: a muscled bronze cuirass, patina streaks, a molten crack in the chest, team sash
    g = Geo().blob((0, 0, 88.0), (19.0, 19.0, 13.0), p=2.6)
    rig.part("torso", g, BR, finish="metal")
    g = Geo().blob((1.0, 0, 114.0), (30.0, 29.0, 25.0), p=2.6, taper=(0.78, 1.1))
    rig.part("torso", g, BR, finish="metal")
    g = Geo().blob((16.0, -8.0, 118.0), (12.0, 10.0, 8.6), p=2.2)                                  # pecs
    g.blob((16.0, 8.0, 118.0), (12.0, 10.0, 8.6), p=2.2)
    rig.part("torso", g, BR_LT, finish="metal")
    g = Geo()
    for x, y, z, rx, rz in ((22.0, -18.0, 126.0, 1.6, 10.0), (4.0, -26.0, 122.0, 1.8, 9.0),
                            (-12.0, -22.0, 116.0, 1.6, 12.0)):
        g.blob((x, y, z), (rx * 2.2, 1.6, rz), p=2.2)
    rig.part("torso", g, PATINA)
    _glow_line(rig, "torso", [(22.0, -20.0, 128.0), (26.0, -17.0, 119.0), (24.0, -19.0, 110.0), (27.0, -14.0, 101.0)],
               r=1.5)
    _glow_line(rig, "torso", [(26.0, -17.0, 119.0), (29.0, -8.0, 117.0)], r=1.1)
    rig.joint("heart", "torso", (26.5, -17.0, 115.0))
    g = Geo().sphere((26.5, -17.0, 115.0), 3.2, cuts=3)
    rig.part("heart", g, glow=SEAM_CORE, outline=0.8, outline_hex=SEAM)
    g = Geo()
    g.capsule((18.0, -26.0, 136.0), (26.0, 6.0, 96.0), 7.0, 6.0)                                  # sash
    g.capsule((26.0, 6.0, 96.0), (-10.0, 24.0, 92.0), 6.0)
    g.capsule((-22.0, -18.0, 134.0), (18.0, -26.0, 136.0), 6.4)
    rig.part("torso", g, team=True)
    g = Geo().blob((4.0, 0, 141.0), (14.0, 15.0, 5.0), p=2.6)                                     # neck
    rig.part("torso", g, BR_DK, finish="metal")

    # head: a great crested helmet with a dark T-shaped face opening and glowing eye slits
    g = Geo().blob((6.0, 0, 158.0), (15.0, 14.0, 15.0), p=2.4)
    g.blob((13.0, 0, 147.0), (8.0, 10.0, 6.0), p=2.4)
    rig.part("head", g, BR, finish="metal")
    g = Geo().blob((-2.0, 0, 150.0), (8.0, 14.6, 8.0), p=2.4)                                     # neck guard
    rig.part("head", g, BR_DK, finish="metal")
    g = Geo().slab([(19.0, 162.0), (22.0, 162.0), (22.0, 158.0), (21.0, 150.0), (19.0, 143.0), (17.0, 143.0),
                    (18.0, 158.0)], -1.0, 12.0)
    rig.part("head", g, DARK, outline=0)
    rig.joint("eyes", "head", (20.0, 0, 159.0))
    g = Geo().capsule((20.6, -6.8, 159.6), (21.6, -1.6, 159.0), 1.2).capsule((21.6, 1.6, 159.0), (20.6, 6.8, 159.6), 1.2)
    rig.part("eyes", g, glow=SEAM_CORE, outline=0.6, outline_hex=SEAM)
    g = Geo().blob((6.4, 0, 158.6), (15.6, 14.6, 1.6), p=2.8)
    g.capsule((20.0, -4.0, 163.8), (20.4, 4.0, 163.8), 1.2)
    rig.part("head", g, B.BRONZE, finish="metal", outline=0.6)
    g = Geo().blob((2.0, -8.0, 166.0), (8.0, 1.6, 5.0), p=2.2)
    rig.part("head", g, PATINA)
    g = Geo().capsule((4.0, 0, 172.0), (3.0, 0, 176.0), 2.4)
    rig.part("head", g, BR_DK, finish="metal", outline=0.6)
    rig.secondary("crest", "head", (12.0, 0, 176.0), (-26.0, 0, 176.0), max_deg=6, gain=0.7)
    g = Geo()
    n = 10
    for i in range(n):
        t = i / (n - 1)
        a = math.pi * (0.1 + 0.95 * t)
        x = 8.0 + 12.0 * math.cos(a) - 24.0 * t
        z = 175.0 + 20.0 * math.sin(a) * (1.0 - 0.25 * t)
        r = 6.0 + 2.6 * math.sin(math.pi * t) - 2.0 * t
        g.blob((x, 0, z), (r * 1.05, 4.2, r), p=2.1)
    rig.part("crest", g, team=True)

    _arm(rig, "r")
    B.dust_puff(rig, "root", (58.0, -14.0, 4.0), size=2.6, name="dust")
    B.sparks(rig, "root", (52.0, -24.0, 10.0), size=2.8, name="sparks", rays=8, seed=3)


# -- poses ---------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(F.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=True))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def stand(bob=0.0, dx=0.0):
    return legs((STANCE_X["r"], 0.0), (STANCE_X["l"], 0.0), (dx, LIFT + bob))


def arms(ra, rf, la=-75.0, lf=-30.0, rw=None):
    return merge(F.arm("r", ra, rf), F.arm("l", la, lf))


REST = arms(-62, -8, -84, -44)
WALK_MS = [175] * 8
STRIDE = 28.0            # natural speed 2 x 28 / 1.4 s = 40 lu/s (sim speed 40)


def _glow(f):
    return {"heart": {"s": [1.0, 1.15, 0.9, 1.1, 0.95, 1.2, 1.0, 1.05][f % 8]}}


def _idle(f):
    c, lag = F.idle_wave(f)
    return merge(stand(1.6 * c), REST, _glow(f), {
        "torso": {"r": 1.0 * c}, "head": {"r": -1.5 * lag},
        "arm_r": {"r": 2.0 * lag}, "arm_l": {"r": 2.0 * lag}, "hand_r": {"r": -2.0 * lag},
    })


def _walk(f):
    xr, lr, _ = F.walker_cycle(f, 8, STRIDE, 18.0)
    xl, ll, _ = F.walker_cycle(f, 8, STRIDE, 18.0, phase=0.5)
    bob = [-4.0, -1.5, 2.0, 0.0, -4.0, -1.5, 2.0, 0.0][f]
    lag = [0.0, -4.0, -1.5, 2.0, 0.0, -4.0, -1.5, 2.0][f]
    p = 2 * math.pi * f / 8
    return merge(legs((STANCE_X["r"] + xr, lr), (STANCE_X["l"] + xl, ll), (0.0, LIFT + bob)), REST, _glow(f), {
        "torso": dict(r=-4.0 + 1.5 * math.cos(2 * p), rz=5.0 * math.sin(p), rx=2.0 * math.sin(p)),
        "head": {"r": 1.0 - 0.4 * lag},
        "arm_r": {"r": -9 * math.cos(p) + 0.8 * lag},
        "arm_l": {"r": 9 * math.cos(p)},
    })


ATTACK_MS = [100, 100, 200, 50, 167, 100, 100, 100]


def _attack(f):
    # 0-1 raise the fist and the near foot (coil, squash), 2 held extreme (fist high behind the
    # head, foot up), 3 smear (the smash), 4 held impact: fist in the ground ahead, foot
    # stamped, deep crouch, dust ring and sparks; 5-7 heavy recovery
    ra = pick(f, [-20, 60, 100, 20, -40, -44, -60, -76])
    rf = pick(f, [30, 110, 140, -20, -70, -66, -55, -44])
    la = pick(f, [-70, -40, -20, -90, -110, -104, -90, -78])
    lf = pick(f, [-30, 0, 20, -50, -70, -64, -48, -34])
    foot = pick(f, [(12, 6), (16, 20), (18, 26), (22, 8), (24, 0), (22, 0), (16, 0), (11, 0)])
    bob = pick(f, [0, -2, 1, -2, -12, -10, -5, -1])
    dx = pick(f, [-1, -3, -4, 3, 8, 7, 4, 1])
    pose = merge(legs((STANCE_X["r"] + foot[0] - 10, foot[1]), (STANCE_X["l"], 0.0), (dx, LIFT + bob)),
                 arms(ra, rf, la, lf), _glow(f), {
        "torso": dict(squash(pick(f, [-0.02, -0.05, 0.05, 0.03, -0.1, -0.06, -0.02, 0])),
                      r=pick(f, [2, 8, 12, -8, -24, -20, -10, -3])),
        "head": {"r": pick(f, [1, 4, 6, -3, -8, -6, -3, 0])},
        "dust": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.85, 1.15, 1.35, 1]),
                 "z": pick(f, [0, 0, 0, 0, 0, 3, 6, 0])},
        "sparks": {"show": f == 4},
    })
    if f == 3:
        pose.setdefault("hand_r", {})["sz"] = 1.25
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(stand(-2.0 * a, -3.0 * a), REST, _glow(0), {
        "torso": dict(squash(-0.05 * a), r=8 * a), "head": {"r": 8 * a},
        "arm_r": {"r": 10 * a}, "arm_l": {"r": 14 * a},
    })


def _die(f):
    # the knees buckle, the body pitches, the molten heart flares (the burst is the game's fx)
    pose = merge(legs((STANCE_X["r"] + pick(f, [4, 8, 8]), 0.0), (STANCE_X["l"], 0.0),
                      (pick(f, [-3, -5, -5]), LIFT + pick(f, [-6, -22, -28]))),
                 arms(-40, -10, -20, 10), {
        "body": {"r": pick(f, [8, 5, 3]), "sz": pick(f, [1.02, 0.84, 0.66]), "sx": pick(f, [0.98, 1.1, 1.2])},
        "torso": {"r": pick(f, [14, 20, 20])},
        "head": {"r": pick(f, [12, -6, -6])},
        "heart": {"s": pick(f, [1.6, 2.2, 2.6])},
        "sparks": {"show": f == 0},
    })
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
