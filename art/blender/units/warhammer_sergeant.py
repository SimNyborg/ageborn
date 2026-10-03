"""Warhammer Sergeant: Medieval Age rare anti-heavy, melee (CONTENT_PLAN 5.3). Warhammer, marks armour, ~70 lu.

Look (A11, PLAN.md): a broad, stocky veteran sergeant with a huge walrus moustache and a scarred
chin, a steel nasal helmet with a team cloth wrap and a short team tail, a team tabard with a
parchment hammer badge over a riveted brigandine, team sleeves, steel couters, slate hose, heavy
boots. He grips a long two-handed warhammer on its own joint: an ash haft with a leather grip, an
iron head with a flat hammer face on one side and a curved armour-piercing beak on the other, and a
top spike.

"A viewer expects him to swing a heavy hammer two-handed and crack armour with a clang, and to stomp."

Animation (ANIM_SPEC G1 stomp, appendix B for a hammer: overhead smash, horizontal sweep, rising hook):
  idle      plants the hammer head on the ground and leans on the haft, twirls his moustache, blink
  walk      walk v3 bounce jog at ground speed (card 70 x 1.25 = 87.5 lu/s), a bow-legged stomp: the
            hammer over his shoulder, the helmet tail late
  attack    OVERHEAD SMASH: hoists the hammer high behind his head (the held extreme), then brings
            the beak down with a clang (a spark burst at the head, dust)
  attack_b  HORIZONTAL SWEEP: turns away with the hammer drawn back at shoulder height, then sweeps it
            round level into the target's side
  attack_c  RISING HOOK: crouches with the head trailing low behind his heel, then hooks the beak up
            under the target's guard
  hit       armoured: a dip, the helmet clanks down over his eyes
  die       D2 topple, the helmet rolls away, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "warhammer_sergeant"
GAIT_NAME = "biped"
NAME = "Warhammer Sergeant"
HEIGHT_LU = 70
CANVAS = (320, 306)
FEET = (132, 252)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 33)}
NO_RETIME = True

SKIN = "#E6BE9A"
MOUSTACHE = "#8A7766"
STEEL = "#A7B0BB"
STEEL_DK = "#5E6670"
IRON = "#6F7883"
BRIG = "#5A5E66"
HOSE = "#626A74"
BOOT = "#55483D"
LEATHER = "#5E4A3C"
ASH = "#B8A285"
PARCH = "#E8DFC8"
GOLD = "#D4A437"

SH = (0.0, B.SHOULDER_Z)
G0 = (6.0, -13.0, 24.0)               # near hand at rest; the haft along +x
HAFT = 30.0
GRIP = 8.0                            # far hand toward the butt
HEAD_X = G0[0] + HAFT
BEAK_TIP = (HEAD_X, G0[1], G0[2] - 9.5)
FACE_C = (HEAD_X, G0[1], G0[2] + 6.5)
MID = (G0[0] + HAFT * 0.5, G0[1], G0[2])
HELM_C = (1.0, 0.0, 55.0)


def _helm(rig, joint):
    g = Geo().blob((1.0, 0.0, 55.4), (12.2, 12.0, 11.2), p=2.3, taper=(1.0, 0.9))
    g.clip((0, 0, 53.4), (0, 0, -1))
    rig.part(joint, g, STEEL, finish="metal")
    g = Geo().lathe([(12.0, 0), (12.6, 0.4), (12.6, 3.2), (12.0, 3.6)], (1.0, 0.0, 53.2), segs=28)
    rig.part(joint, g, team=True, outline=0.6)
    g = Geo().capsule((12.8, -1.0, 55.0), (14.2, -1.0, 46.6), 1.4, 1.1)   # nasal
    g.capsule((1.0, 0, 66.0), (1.0, 0, 67.4), 1.4)
    rig.part(joint, g, IRON, finish="metal", outline=0.6)


def _hammer(rig, joint):
    gx, gy, gz = G0
    g = Geo().capsule((gx - GRIP - 4.0, gy, gz), (HEAD_X + 2.0, gy, gz), 1.8, 1.7)
    rig.part(joint, g, ASH)
    g = Geo().capsule((gx - GRIP - 3.0, gy, gz), (gx + 2.0, gy, gz), 2.1)
    rig.part(joint, g, LEATHER, outline=0.4)
    # the iron head: a socket, a flat hammer face (up) and a curved beak (down), a top spike (forward)
    g = Geo().blob((HEAD_X, gy, gz), (3.4, 3.0, 4.4), p=2.6)
    g.capsule((HEAD_X, gy, gz + 2.0), (HEAD_X, gy, gz + 6.0), 3.0, 3.4)
    rig.part(joint, g, IRON, finish="metal")
    g = Geo().lathe([(3.4, 0), (3.6, 0.4), (3.6, 1.2), (3.2, 1.6), (0, 1.6)], (HEAD_X, gy, gz + 6.0),
                    (HEAD_X, gy, gz + 7.6), segs=14)
    rig.part(joint, g, STEEL, finish="metal", outline=0.7)
    g = Geo()
    pts = [(HEAD_X, gz - 2.0), (HEAD_X + 1.6, gz - 6.0), (HEAD_X + 0.4, gz - 9.5), (HEAD_X - 1.2, gz - 6.0)]
    g.slab([(x, z) for x, z in pts], gy, 2.4)
    rig.part(joint, g, STEEL, finish="metal", outline=0.7)
    g = Geo().lathe([(1.6, 0), (0, 5.0)], (HEAD_X + 2.4, gy, gz), (HEAD_X + 7.0, gy, gz), segs=10)
    rig.part(joint, g, STEEL, finish="metal", outline=0.6)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    K.legs_v3(rig, HOSE, BOOT, cuff=LEATHER, thigh_r=5.0)
    rig.joint("helm", "head", HELM_C)

    # torso: a riveted brigandine under a team tabard with a parchment hammer badge, a belt
    g = Geo().blob((0.8, 0, 27.6), (11.8, 10.6, 12.0), p=2.2, taper=(1.12, 0.9))
    rig.part("torso", g, BRIG, finish="metal")
    tb = Geo().blob((1.0, 0, 26.6), (12.3, 11.1, 10.6), p=2.8, taper=(1.12, 0.9))
    tb.clip((0, 0, 35.8), (0, 0, 1))
    tface = F.Face(rig, "torso", [tb])
    rig.part("torso", tb, team=True)
    g = Geo()
    c = tface.hit(5.0, 28.0)
    tface.decal(g, c, [(-3.2, 1.0), (3.2, 1.0), (3.2, 3.4), (-3.2, 3.4)], 0.4)
    tface.decal(g, c, [(-0.8, -4.6), (0.8, -4.6), (0.8, 1.2), (-0.8, 1.2)], 0.4)
    rig.part("torso", g, PARCH, highlight=False, outline=0)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.8, 0, 15.2), (12.4, 11.0, 4.6), p=2.7, taper=(1.12, 1.0))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.8, 0, 20.6), (12.8, 11.4, 2.0), p=3.2)
    rig.part("torso", g, LEATHER)
    g = Geo().blob((13.4, -2.0, 20.6), (1.5, 2.6, 2.6), p=3.0)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    for s, y in (("r", -12.4), ("l", 11.8)):
        g = Geo().blob((0.2, y, 37.2), (6.8, 5.8, 5.4), p=2.4)
        rig.part(f"arm_{s}", g, team=True)

    # head: broad face, a huge walrus moustache, a scar on the chin
    head = Geo().blob((2, 0, 47.6), (11.6, 11.0, 11.0), p=2.3)
    head.blob((14.0, -0.6, 45.4), (3.6, 3.2, 3.2), p=2.0)
    K.face2(rig, [head], SKIN, cx=12.0, cz=48.6, eye_r=(3.4, 3.1, 3.9), brow=MOUSTACHE, brow_w=1.25,
            mouth_dz=-7.4, mouth_x=12.6, eye_at=(13.8, 48.8), mark_r=3.7)
    rig.part("head", head, SKIN)
    g = Geo().blob((13.6, -4.4, 42.4), (3.4, 5.6, 2.4), p=2.2, rot=(16, 0, -18))
    g.blob((13.6, 3.6, 42.4), (3.4, 5.6, 2.4), p=2.2, rot=(-16, 0, -18))
    g.blob((12.0, -9.0, 39.6), (2.0, 2.2, 3.0), p=2.0)
    rig.part("head", g, MOUSTACHE, finish="hair")
    _helm(rig, "helm")
    rig.secondary("tail", "helm", (-10.0, 0, 55.0), (-20.0, 0, 46.0), max_deg=16, gain=1.2)
    g = Geo().capsule((-10.0, 0, 55.0), (-19.0, 0, 47.0), 2.6, 1.6)
    rig.part("tail", g, team=True)
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    _helm(rig, "helm_loose")

    for s in ("r", "l"):
        B.arm_parts(rig, s, None, hand=LEATHER, team_sleeve=True, r0=4.8, r1=4.3, fist=4.6, cuff=STEEL)
        g = Geo().sphere((-0.4, B.ARM_Y[s], B.ELBOW_Z), 3.0, cuts=3)
        rig.part(f"fore_{s}", g, STEEL, finish="metal", outline=0.5)

    rig.joint("hammer", "torso", G0)
    _hammer(rig, "hammer")
    rig.track("beak", "hammer", BEAK_TIP)


# -- poses ---------------------------------------------------------------------------------
def haft_point(gx, gz, deg, d):
    return (gx + d * math.cos(math.radians(deg)), gz + d * math.sin(math.radians(deg)))


def wield(gx, gz, deg, yaw=0.0):
    pose = {"hammer": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}}
    if yaw:
        pose["hammer"]["rz"] = yaw
    a, f = B.ik2(SH, (gx - 0.4, gz + 0.4))
    pose.update(B.arm("r", a, f))
    fx, fz = haft_point(gx, gz, deg, -GRIP)
    a, f = B.ik2(SH, (fx, fz))
    pose.update(B.arm("l", a, f))
    return pose


STANCE = merge(wield(10.0, 26.0, -62.0), {"torso": {"r": 2}})   # leaning on the haft, the head on the ground


def _idle(f):
    tw = [0.0, 0.0, 0.5, 1.0, 0.6, 0.0][f]

    def extra(ctx):
        return merge(wield(10.0 + 0.3 * ctx["lag"], 26.0 + 0.6 * ctx["lag"], -62.0 + 1.5 * ctx["lag"]),
                     {"head": {"r": -2 * tw, "rz": -6 * tw}, "tail": {"r": 3 * ctx["lag"]}})
    return M.idle_v2(f, {"torso": {"r": 2}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 87.5
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED)
CARRY = (-1.0, 24.0, 152.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(wield(CARRY[0], CARRY[1] + 0.6 * lag, CARRY[2] + 4 * lag),
                     {"tail": {"r": 6 * lag}, "hem": {"r": 4 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2}}, GAIT, legs=LEGS, lean=-6.0, twist=6.0, nod=3.0, sway=2.5,
                     extra=extra, report=report)


# -- attack A: overhead smash (moves.SMALL_MELEE_MS) -------------------------------------------------
#        read  dip  wind  HOLD smear lead  IMP  over recoil settle settle
A_G = [(10, 26, -62), (6, 30, 30), (2, 38, 110), (0, 42, 128), (6, 40, 70), (12, 34, 10), (14, 28, -30),
       (14, 27, -36), (13, 27, -40), (11, 26, -50), (10, 26, -58)]
A_T = [2, 6, 12, 14, 2, -10, -16, -14, -10, -4, 1]
A_X = [0.0, -1.0, -2.5, -3.5, 1.0, 5.0, 8.0, 8.0, 6.5, 3.0, 0.5]
A_Z = [0.0, -1.5, 0.5, 1.5, 0.5, -1.0, -3.5, -2.5, -2.0, -0.8, 0.0]
A_Q = [-0.02, -0.08, 0.04, 0.06, 0.06, 0.02, -0.15, 0.04, -0.05, 0.02, 0.0]
A_THR = [0, -4, -8, -10, 10, 20, 28, 26, 20, 8, 2]
A_SHR = [0, -4, -6, -6, -12, -18, -24, -20, -14, -6, 0]
A_THL = [0, 4, 8, 10, -8, -16, -22, -20, -14, -6, -2]
A_SHL = [0, -8, -10, -10, -6, -4, -6, -4, -4, -2, 0]


def _attack_pose(f):
    gx, gz, deg = A_G[f]
    pose = merge(wield(gx, gz, deg), {
        "torso": {"r": A_T[f]}, "head": {"r": -0.4 * A_T[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


ARC = {"kind": "arc", "joint": "hammer", "inner": MID, "outer": (HEAD_X, G0[1], G0[2]), "color": "#D6DDE6",
       "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}
CLANG = [{"kind": "burst", "joint": "hammer", "point": BEAK_TIP, "r0_lu": 6.0, "r1_lu": 13.0, "n": 7,
          "a0": -170.0, "arc": 160.0, "color": "#FFF4D6"}]


def _attack_clip():
    ov = {
        4: [dict(ARC, **{"from": 3})],
        5: [dict(ARC, **{"from": 4})],
        6: [dict(ARC, t0=0.4, t1=1.0, lines=2, **{"from": 5}), *CLANG,
            {"kind": "dust", "ground": (28.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": 101, "spread": 1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: horizontal sweep at shoulder height ------------------------------------------------------
OB_G = [(2, 30, 168), (-2, 30, 176), (4, 30, 120), (8, 30, 50), (12, 30, 4), (12, 30, -4), (11, 29, -16)]
OB_YAW = [34, 46, 28, 0, -30, -36, -26]
OB_X = [-1.5, -3.0, 1.0, 4.5, 7.0, 7.5, 5.5]
OB_Z = [-1.0, -2.0, -1.5, -2.0, -3.0, -2.4, -1.8]
OB_Q = [-0.04, 0.02, 0.06, 0.02, -0.14, 0.04, -0.05]
OB_THR = [-6, -10, 8, 18, 24, 22, 14]
OB_SHR = [-6, -10, -14, -18, -22, -18, -10]
OB_THL = [8, 12, -6, -14, -20, -18, -12]
OB_SHL = [-10, -16, -8, -6, -8, -6, -4]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    gx, gz, deg = OB_G[k]
    pose = merge(wield(gx, gz, deg, yaw=-0.4 * OB_YAW[k]), {
        "torso": {"r": -2, "rz": OB_YAW[k]}, "head": {"rz": -0.6 * OB_YAW[k]},
        "thigh_r": {"r": OB_THR[k]}, "shin_r": {"r": OB_SHR[k]},
        "thigh_l": {"r": OB_THL[k]}, "shin_l": {"r": OB_SHL[k]},
    }, M.body_about((0, 0, 22), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_b():
    ov = {
        4: [dict(ARC, **{"from": 3})],
        5: [dict(ARC, **{"from": 4})],
        6: [dict(ARC, t0=0.4, t1=1.0, lines=2, **{"from": 5}), *CLANG,
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 102, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: rising beak hook ---------------------------------------------------------------------------
OC_G = [(4, 22, -120), (0, 20, -140), (-2, 20, -158), (6, 22, -90), (12, 26, -10), (14, 32, 40), (14, 33, 52),
        (12, 30, 10)]
OC_T = [-6, -12, -16, -8, 2, 8, 9, 3]
OC_X = [0.0, -1.0, -1.5, 2.0, 5.0, 7.5, 8.0, 5.0]
OC_Z = [-2.5, -5.0, -6.5, -4.0, -1.0, 1.0, 0.5, -0.5]
OC_Q = [-0.06, -0.10, -0.08, 0.06, 0.08, -0.12, 0.04, -0.03]
OC_THR = [10, 22, 30, 28, 24, 18, 16, 10]
OC_SHR = [-16, -34, -46, -34, -20, -10, -8, -6]
OC_THL = [-6, -14, -20, -22, -20, -16, -14, -8]
OC_SHL = [-14, -26, -36, -22, -10, -4, -4, -4]


def _c_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    gx, gz, deg = OC_G[k]
    pose = merge(wield(gx, gz, deg), {
        "torso": {"r": OC_T[k]}, "head": {"r": -0.4 * OC_T[k]},
        "thigh_r": {"r": OC_THR[k]}, "shin_r": {"r": OC_SHR[k]},
        "thigh_l": {"r": OC_THL[k]}, "shin_l": {"r": OC_SHL[k]},
    }, M.body_about((0, 0, 22), x=OC_X[k], z=OC_Z[k], q=OC_Q[k]))
    if k == 5:
        pose = merge(pose, {"foot_r": {"r": -12}, "foot_l": {"r": -14}})
    if k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif k in (3, 4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    return pose


def _attack_c():
    ov = {
        3: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 103, "spread": 0.7}],
        4: [dict(ARC, **{"from": 3})],
        5: [dict(ARC, **{"from": 4})],
        6: [dict(ARC, t0=0.4, t1=1.0, lines=2, **{"from": 5}), *CLANG],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 10 * a}, "torso": {"r": 8 * a}, "hammer": {"r": 8 * a},
                "tail": {"r": 8 * a}, "brow": {"z": 1.2 * max(a, 0)}}
    return K.hit_armoured(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"), face_back=F.expr("grit"))


HELM = {5: (58.0, -46.0, -95.0), 6: (66.0, -34.0, -170.0), 7: (74.0, -50.0, -265.0),
        8: (79.0, -51.0, -330.0), 9: (81.0, -51.0, -355.0)}


def _die(k):
    stiff = [0.3, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    flop = [0, 0, 0, 0, 0, 0.6, 1.0, 0.8, 0.8, 0.8][k]
    pose = merge(STANCE, K.die_d2(k, toe_x=7.0, lie_lift=7.0), {
        "head": {"r": [14, 8, 0, 0, -2, -8, 4, 0, 0, 0][k]},
        "torso": {"r": 4 * (1 - stiff)},
        "hammer": {"r": 140 * stiff},
        "thigh_r": {"r": 6 * (1 - stiff)}, "thigh_l": {"r": -4 * (1 - stiff)},
        "shin_r": {"r": -20 * flop}, "shin_l": {"r": -10 * flop},
    })
    if k in HELM:
        x, z, r = HELM[k]
        pose["helm"] = {"hide": True}
        pose["tail"] = {"hide": True}
        pose["helm_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "o"), {"brow": {"z": 1.8}})
    elif k <= 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.4}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
