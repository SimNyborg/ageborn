"""Herbalist: Stone Age rare support healer (CONTENT_PLAN 5.1). Heals 30 HP/s split between the two
most hurt allies within 160 lu; a short herb-dust lob (proj.herb). 62 lu.

Look (A11, PLAN.md): a plump, kindly old herb-woman with a grey bun stuck with twigs, a wreath of pale
leaves, round cheeks and a gap-toothed smile; a team shawl round her shoulders and a long team skirt
(the hem 9 lu above her feet) with a bone-bead belt, a bulging leather herb pouch at her hip and a
bundle of dried herbs in her far hand. Fur shoes.

"A viewer expects it to flick a puff of herb dust and to waddle."

Animation (ANIM_SPEC G2 brisk waddle, appendix B support: two releases, no C):
  idle      sniffs her herb bundle and sighs happily, blink
  walk      walk v3 brisk waddle (card 65 x 1.25 = 81.25 lu/s), a side-to-side roll, the bundle
            swinging, the skirt kicking with the knees
  attack    HERB FLICK: dips a hand in the pouch, winds back, flicks the dust underhand in a short
            lob (a puff at the hand on the impact frame; the hold loops a rub-the-pinch frame)
  attack_b  PALM PUFF: holds the dust on her open palm at her mouth and blows it forward
  hit       light;  die  D3 dizzy spin, sits down in a puff of her own herbs
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "herbalist"
GAIT_NAME = "biped"
NAME = "Herbalist"
HEIGHT_LU = 62
CANVAS = (252, 220)
FEET = (112, 198)
ANCHORS = {"head": (2, 60), "hitCenter": (0, 28)}
NO_RETIME = True

SKIN = "#D9B49A"
HAIR = "#C9C3B8"
LEAF = "#A9B48A"
HERB = "#9AA27A"
HERB_DK = "#7C8460"
LEATHER = "#8C7058"
BONE = "#EDE3C8"
FUR = "#7A6B5E"
DUST = "#DCE3C4"

HIP_Y, SH_Y = 6.0, 11.6


def build(rig):
    global RIG, ARM_R, ARM_L, FR
    RIG = rig
    body = K.body(rig, SKIN, FUR, stocky=1.05, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(11.6, 10.6, 10.2), foot_len=4.4,
                  shoulder_z=34.0, neck_z=36.0)
    fr, fl = body.fist["r"], body.fist["l"]
    FR = fr
    K.wraps(rig, HIP_Y, SH_Y, wrists=())
    # long team skirt (secondary, the hem 9+ lu above the soles) and a team shawl
    rig.secondary("skirt", "hips", (0.5, 0, 22.0), (-1.0, 0, 12.0), max_deg=12, gain=1.0)
    rig.rest_offset["skirt"] = (0, 0, K.LIFT + 1.5)
    g = Geo().lathe([(9.0, 0), (11.6, 3.0), (12.8, 8.0), (13.2, 10.6), (0, 10.8)], (0.4, 0, 24.0), (0.4, 0, 13.0),
                    segs=22)
    for x, y in ((9.0, -7.0), (2.0, -12.0), (-7.0, -10.0), (10.5, 4.0)):
        g.lathe([(2.6, 0), (0, -2.6)], (x, y, 13.4), segs=8)
    rig.part("skirt", g, team=True)
    g = Geo().blob((0.4, 0, 31.0), (12.6, 11.8, 7.6), p=2.4, taper=(1.05, 0.9))
    g.clip((0, 0, 25.0), (0, 0, -1))
    rig.part("torso", g, team=True)
    g = Geo()
    for k in range(7):
        a = -1.2 + k * 0.4
        g.sphere((math.cos(a) * 11.0 + 0.4, math.sin(a) * 10.4, 23.4), 1.3, cuts=2)
    rig.part("torso", g, BONE, outline=0.4)
    # herb pouch at the near hip
    g = Geo().blob((-3.0, -11.0, 20.0), (5.2, 4.0, 5.8), p=2.2, taper=(1.12, 0.78))
    rig.part("hips", g, LEATHER)
    g = Geo()
    for dx, dz in ((-4.4, 26.0), (-2.0, 26.8), (0.4, 26.2)):
        g.capsule((dx, -11.4, 24.0), (dx - 0.6, -11.8, dz + 1.6), 0.6, 0.5)
    rig.part("hips", g, HERB, outline=0.4)
    # grey bun with twigs, a leaf wreath, round smiling face
    hair = Geo().blob((-2.6, 0, 53.0), (9.8, 10.4, 5.2), p=2.2)
    hair.blob((-7.6, 0, 46.6), (4.4, 9.2, 7.4), p=2.2)
    hair.blob((-6.0, 0, 58.4), (4.4, 4.4, 4.0), p=2.2)
    K.head(rig, SKIN, z=45.5, r=(10.6, 10.2, 10.0), jaw=(7.8, 8.6, 5.2), eye_r=3.6, extra_geos=(hair,),
           brow_col=HAIR, grin="smile")
    rig.part("head", hair, HAIR, finish="hair")
    g = Geo()
    for k in range(8):
        a = math.radians(-160 + k * 40)
        g.blob((1.0 + math.cos(a) * 9.4, math.sin(a) * 10.0, 52.0 + 1.2 * math.sin(2 * a)), (2.4, 1.4, 1.6), p=2.2)
    rig.part("head", g, LEAF)
    g = Geo().capsule((-6.0, -1.0, 58.0), (-10.0, -2.0, 64.0), 0.6).capsule((-5.0, 1.0, 59.0), (-2.0, 1.5, 64.5), 0.6)
    rig.part("head", g, LEATHER, outline=0.4)
    # the herb bundle in the far fist
    rig.joint("bundle", "fore_l", fl)
    g = Geo()
    for dx, dy in ((-1.0, 0.0), (0.0, -1.0), (1.0, 0.6), (0.4, 1.2)):
        g.capsule((fl[0] + dx * 0.4, fl[1] + dy * 0.4, fl[2] - 1.0), (fl[0] + dx * 1.8, fl[1] + dy * 1.8, fl[2] + 10.0), 0.6, 0.5)
    rig.part("bundle", g, HERB_DK, outline=0.4)
    g = Geo()
    for dx, dy, dz in ((-1.6, 0.0, 10.0), (0.4, -1.4, 11.0), (1.8, 0.8, 10.4), (0.6, 1.6, 9.6)):
        g.blob((fl[0] + dx, fl[1] + dy, fl[2] + dz), (2.2, 1.6, 2.6), p=2.2)
    rig.part("bundle", g, HERB)
    g = Geo().lathe([(1.6, 0), (1.9, 0.4), (1.9, 1.6), (1.6, 2.0)], (fl[0], fl[1], fl[2] + 1.0), segs=10)
    rig.part("bundle", g, team=True, outline=0.4)
    # a pinch of dust in the near hand (shown in the flick)
    rig.joint("pinch", "fore_r", fr, hidden=True)
    g = Geo().blob((fr[0] + 2.0, fr[1] - 2.0, fr[2] + 1.0), (2.2, 2.0, 2.0), p=2.0)
    rig.part("pinch", g, DUST, outline=0.5)
    rig.track("muzzle", "fore_r", (fr[0] + 2.0, fr[1] - 2.0, fr[2] + 1.0))
    ARM_R = body.arm("r")
    ARM_L = body.arm("l", "bundle", (fl[0], fl[1], fl[2] + 10.0))


RIG = ARM_R = ARM_L = FR = None
SPEED = 81.25
LEGS = K.legs(HIP_Y)
GAIT = K.brisk(LEGS, SPEED, cycle=560, stance=0.44)


def near(a, b):
    return ARM_R.pose(a, b)


def far(a, b, c=90):
    return ARM_L.pose(a, b, c)


def stance():
    return merge(near(-70, -20), far(-40, 30, 100), {"torso": {"r": 2}})


def _idle(f):
    sniff = [0.0, 0.3, 0.8, 1.0, 1.0, 0.6, 0.2, 0.0][f]

    def extra(ctx):
        return merge(far(-40 + 40 * sniff, 30 + 60 * sniff, 100 + 20 * sniff),
                     {"head": {"r": -6 * sniff}}, F.expr("blink") if sniff > 0.9 else {})
    return M.idle_v2(f, K.strip(stance(), "arm_l", "fore_l", "bundle"), extra=extra, face_blink=F.expr("blink"), blink=7)


def _walk(f, report=None):
    def extra(ctx):
        return merge(far(-50, 10, 110 + 10 * math.cos(ctx["lag_p"])), {"torso": {"rx": 4.0 * math.sin(ctx["p"])}})
    carry = K.strip(stance(), "arm_r", "fore_r", "arm_l", "fore_l", "bundle")
    return K.walk(RIG, f, carry, GAIT, LEGS, arms={"r": K.Arm(ARM_R)}, robed=True, extra=extra, report=report)


# attack A: herb flick. 11 unique frames; frame 4 = rub-the-pinch (hold-loop partner)
#        read pouch  wind  HOLD  rub   swing IMP  follow pouch2 back settle
A_A = [-70, -100, -150, -160, -158, -90, -20, 10, -100, -80, -70]
A_B = [-20, -100, -130, -110, -104, -60, 0, 30, -90, -40, -20]
A_X = [-0.5, -1.0, -2.0, -2.6, -2.6, 1.0, 4.0, 3.6, 0.5, 0.0, -0.5]
A_Z = [0.0, -1.6, -1.0, -0.4, -0.6, -1.2, -1.6, -0.6, -1.6, -0.4, 0.0]
A_Q = [-0.03, -0.08, 0.02, 0.06, 0.04, -0.02, -0.10, 0.03, -0.06, 0.01, 0.0]
A_T = [2, 10, 8, 10, 10, -4, -14, -10, 10, 4, 2]
A_THR = [0, -4, -4, -6, -6, 10, 18, 14, -4, 0, 0]
A_THL = [0, 4, 6, 8, 8, -4, -12, -10, 4, 0, 0]


def _attack_pose(f):
    pose = merge(near(A_A[f], A_B[f]), far(-40, 30, 100), {
        "torso": {"r": A_T[f]}, "head": {"r": -A_T[f] * 0.5},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": -abs(A_THR[f]) * 0.6},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": -abs(A_THL[f]) * 0.6},
        "pinch": {"show": f in (2, 3, 4, 5)},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("grit"))
    elif f in (5, 6):
        pose = merge(pose, F.expr("o"))
    return pose


def _puff(at):
    return [{"kind": "dust", "joint": "fore_r", "point": at, "size_lu": 6.0, "puffs": 4, "seed": 111, "color": DUST,
             "spread": 0.8, "dir": 1.0}]


def _attack_clip():
    at = (FR[0] + 2.0, FR[1] - 2.0, FR[2] + 1.0)
    ov = {5: [{"kind": "arc", "joint": "fore_r", "inner": (FR[0], FR[1], FR[2] + 2), "outer": at, "color": DUST,
               "taper": 0.2, "t0": 0.0, "t1": 0.9, "lines": 2, "white": 0.5, "from": 4}],
          6: _puff(at)}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=5, overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


# attack B: palm puff. 0, 1 = A, 2 palm up at the mouth, 3 HOLD (cheeks puffed, palm at the mouth,
# leaning back), 4 inhale (partner), 5 blow starts, 6 IMPACT (blowing, leaning in, palm out), 7 follow,
# 8-10 = A
def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    tab = [  # a, b, x, z, q, t
        (-40, 70, -1.0, 0.0, 0.02, 6),
        (-30, 80, -2.0, 0.6, 0.08, 12),
        (-32, 78, -2.2, 0.8, 0.10, 14),
        (-20, 50, 0.5, -0.4, 0.0, 0),
        (-10, 20, 3.0, -1.2, -0.10, -12),
        (-15, 30, 2.6, -0.6, 0.02, -8),
    ][i - 2]
    a, b, x, z, q, t = tab
    pose = merge(near(a, b), far(-40, 30, 100), {
        "torso": {"r": t}, "head": {"r": -t * 0.6},
        "thigh_r": {"r": -t * 0.8}, "thigh_l": {"r": t * 0.6},
        "pinch": {"show": i in (2, 3, 4, 5)},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q))
    return merge(pose, F.expr("o" if i >= 5 else "grit"))


def _attack_b():
    at = (FR[0] + 2.0, FR[1] - 2.0, FR[2] + 1.0)
    ov = {6: [{"kind": "dust", "joint": "fore_r", "point": at, "size_lu": 7.0, "puffs": 5, "seed": 112, "color": DUST,
               "spread": 1.2, "dir": 1.0}],
          7: [{"kind": "dust", "joint": "fore_r", "point": (at[0] + 8, at[1], at[2]), "size_lu": 5.0, "puffs": 3,
               "seed": 113, "color": DUST, "spread": 1.0, "dir": 1.0}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    return K.hit(k, stance(), extra=lambda a: {"bundle": {"r": 20 * a}, "skirt": {"r": 8 * a}})


def _die(k):
    return K.die_d3(k, stance(), HEIGHT_LU, extra=lambda kk, sit: {"bundle": {"r": 40 * sit}}, center_z=25.0)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
