"""Greatsword Knight: Medieval Age common heavy, brute (CONTENT_PLAN 5.3). Zweihander, cleave 2, ~82 lu.

Look (A11, PLAN.md): a big armoured knight on foot (the Medieval biped at 1.2x), in steel plate
with rounded pauldrons and knee cops, a team surcoat over the breastplate with a parchment bear paw,
a team sash at the waist, a round armet with the visor raised (big determined eyes and a grey
moustache show) and a tall team plume. He wields a zweihander as long as he is tall: a broad steel
blade with a dark fuller, a wide gold crossguard with parrying lugs, a long leather grip and a gold
pommel, held in both hands on its own joint.

"A viewer expects him to swing a huge two-handed sword in big sweeping arcs, and to clank along."

Animation (ANIM_SPEC G3 heavy armoured march, appendix B for a two-handed sword):
  idle      leans on the sword point down, shifts his weight, the plume sways, blink
  walk      walk v3 heavy march at ground speed (card 55 x 1.25 = 68.75 lu/s, 10 frames in 1000 ms):
            hard contact, a deep DOWN, the sword sloped back over his shoulder, the plume late
  attack    HIGH GUARD, DIAGONAL SWEEP: lifts the blade into a high guard over his near shoulder with
            the body twisted away (the held extreme), then a huge diagonal down-and-across sweep with
            a full body twist (a wide crescent smear), the blade past the target
  attack_b  LOW GUARD THRUST: sinks into a low guard with the blade forward at the hip and the weight
            back (the held extreme), then a long lunging thrust (a streak)
  attack_c  FLAT SWEEP: turns away with the blade drawn back level at waist height, then sweeps it
            round flat in front (two foes knocked aside)
  hit       armoured: a dip, the visor clanks shut
  die       D2 heavy plank topple, the armet pops off, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "greatsword_knight"
GAIT_NAME = "heavy"
NAME = "Greatsword Knight"
SCALE = 1.2
HEIGHT_LU = 82
CANVAS = (500, 356)
FEET = (190, 300)
ANCHORS = {"head": (3, 80), "hitCenter": (0, 38)}
NO_RETIME = True

SKIN = "#EBC4A0"
MOUSTACHE = "#A9A39A"
STEEL = "#A7B0BB"
STEEL_DK = "#5E6670"
STEEL_LT = "#C9D0D8"
LEATHER = "#5E4A3C"
GOLD = "#D4A437"
PARCH = "#E8DFC8"

SH = (0.0, B.SHOULDER_Z)              # shoulder in torso space (x, z), before the body scale
G0 = (6.0, -13.0, 24.0)               # grip (near hand) at rest, character space; the blade along +x
BLADE = 44.0
GRIP = 9.0                            # far hand this far behind the near hand on the grip
TIP = (G0[0] + 6.0 + BLADE, G0[1], G0[2])
MID = (G0[0] + 6.0 + BLADE * 0.45, G0[1], G0[2])
HELM_C = (1.0, 0.0, 56.0)


def _helm(rig, joint):
    """Round armet: a steel skull with the visor raised on its pivots, cheek plates, a plume socket."""
    g = Geo().blob((1.0, 0.0, 53.8), (12.6, 12.2, 12.6), p=2.2)
    g.clip((9.6, 0, 50.0), (1, 0, 0.35))      # the face opening
    rig.part(joint, g, STEEL, finish="metal")
    g = Geo().blob((2.0, 0.0, 61.6), (11.6, 12.0, 4.4), p=2.4)   # the raised visor (on the brow)
    g.clip((0, 0, 59.0), (0, 0, -1))
    rig.part(joint, g, STEEL_LT, finish="metal", outline=0.7)
    g = Geo()
    for y in (-12.4, 12.2):
        g.sphere((2.0, y, 57.0), 1.6, cuts=2)
    rig.part(joint, g, GOLD, finish="metal", outline=0.5)
    g = Geo().lathe([(11.6, -0.8), (12.4, 0.0), (11.6, 0.8)], (1.0, 0.0, 44.4), segs=24)   # gorget rim
    rig.part(joint, g, STEEL_DK, finish="metal", outline=0.5)
    g = Geo().capsule((-3.0, 0.0, 65.4), (-3.0, 0.0, 67.4), 1.8)
    rig.part(joint, g, GOLD, finish="metal", outline=0.6)


def _plume(rig, joint):
    g = Geo()
    for x, z, r in ((-3.0, 69.0, 3.8), (-7.0, 71.6, 4.4), (-11.6, 71.4, 4.0), (-15.6, 69.0, 3.4), (-18.4, 66.0, 2.8)):
        g.blob((x, 0, z), (r * 1.2, r * 0.8, r), p=2.1)
    rig.part(joint, g, team=True)


def _sword(rig, joint):
    gx, gy, gz = G0
    g = Geo().capsule((gx - GRIP - 3.0, gy, gz), (gx + 3.0, gy, gz), 1.9, 1.9)   # long grip
    rig.part(joint, g, LEATHER)
    g = Geo().sphere((gx - GRIP - 4.6, gy, gz), 2.6, cuts=3)                   # pommel
    g.blob((gx + 4.0, gy, gz), (1.6, 9.6, 1.8), p=2.6)                        # crossguard
    g.sphere((gx + 4.0, gy - 9.4, gz), 1.7, cuts=2).sphere((gx + 4.0, gy + 9.4, gz), 1.7, cuts=2)
    rig.part(joint, g, GOLD, finish="metal", outline=0.8)
    g = Geo().lathe([(0, 0), (4.6, 0.3), (4.4, BLADE * 0.75), (3.0, BLADE - 5), (0, BLADE)],
                    (gx + 5.6, gy, gz), (gx + 5.6 + BLADE, gy, gz), squash=(1.0, 0.34), segs=12)
    rig.part(joint, g, STEEL_LT, finish="metal")
    g = Geo().capsule((gx + 9.0, gy - 1.7, gz), (gx + 5.6 + BLADE * 0.7, gy - 1.7, gz), 1.0)
    rig.part(joint, g, STEEL_DK, finish="metal", outline=0, highlight=False)
    g = Geo()
    for sgn in (-1, 1):   # parrying lugs above the ricasso
        g.lathe([(1.4, 0), (0, 3.0)], (gx + 12.0, gy, gz + 3.6 * sgn), (gx + 12.0, gy, gz + 6.4 * sgn), segs=8)
    rig.part(joint, g, STEEL, finish="metal", outline=0.5)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    rig.rest_scale["body"] = SCALE
    K.legs_v3(rig, STEEL, STEEL_DK, cuff=STEEL_LT, thigh_r=5.2, boot_finish="metal")
    for s in ("r", "l"):   # knee cops
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().sphere((1.4, y - 0.6 * B.SIDE_Y[s], K.V3_KNEE_Z), 3.6, cuts=3)
        rig.part(f"shin_{s}", g, STEEL_LT if s == "r" else STEEL_DK, finish="metal", outline=0.6)
    rig.joint("helm", "head", HELM_C)

    # torso: steel breastplate under a team surcoat with a parchment bear paw, a team sash, mail skirt
    g = Geo().blob((0.5, 0, 28.0), (11.6, 10.6, 12.2), p=2.3, taper=(1.12, 0.92))
    rig.part("torso", g, STEEL, finish="metal")
    sc = Geo().blob((0.8, 0, 26.6), (12.1, 11.1, 10.8), p=2.8, taper=(1.12, 0.9))
    sc.clip((0, 0, 35.6), (0, 0, 1))
    sface = F.Face(rig, "torso", [sc])
    rig.part("torso", sc, team=True)
    g = K.paw(sface, Geo(), (4.0, 28.0), s=1.15)
    rig.part("torso", g, PARCH, highlight=False, outline=0)
    g = Geo().blob((0.6, 0, 21.0), (12.4, 11.3, 2.2), p=3.2)
    rig.part("torso", g, team=True, outline=0.6)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=10, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.8, 0, 15.6), (12.4, 11.2, 4.4), p=2.7, taper=(1.12, 1.0))
    for x, y in ((9.0, -7.0), (1.0, -11.0)):
        g.lathe([(1.6, 0), (0, 3.2)], (x, y - 0.6, 11.8), (x, y - 0.8, 15.0), segs=6)
    rig.part("hem", g, team=True)
    # rounded pauldrons
    for s, y in (("r", -12.6), ("l", 12.0)):
        g = Geo().blob((0.2, y, 37.4), (7.6, 6.4, 6.0), p=2.3)
        g.clip((0, 0, 32.0), (0, 0, -1))
        rig.part(f"arm_{s}", g, STEEL_LT if s == "r" else STEEL, finish="metal")
        g = Geo().lathe([(7.0, -0.6), (7.6, 0.0), (7.0, 0.6)], (0.2, y, 34.0), segs=20, squash=(1.0, 0.85))
        rig.part(f"arm_{s}", g, GOLD, finish="metal", outline=0.4)

    # head: big eyes, a grey moustache, inside the armet
    head = Geo().blob((2, 0, 48.0), (11.0, 10.6, 11.0), p=2.3)
    head.blob((13.6, -0.6, 45.8), (3.2, 2.8, 2.8), p=2.0)
    K.face2(rig, [head], SKIN, cx=11.8, cz=49.0, eye_r=(3.6, 3.3, 4.2), brow=MOUSTACHE, brow_w=1.1,
            mouth_dz=-7.0, mouth_x=12.4, eye_at=(13.6, 49.2), mark_r=3.9)
    rig.part("head", head, SKIN)
    g = Geo().blob((13.0, -3.6, 43.2), (3.0, 4.2, 2.0), p=2.2, rot=(18, 0, -10))
    g.blob((13.0, 2.8, 43.2), (3.0, 4.2, 2.0), p=2.2, rot=(-18, 0, -10))
    rig.part("head", g, MOUSTACHE, finish="hair")
    _helm(rig, "helm")
    rig.secondary("plume", "helm", (-3.0, 0, 67.0), (-18, 0, 66), max_deg=14, gain=1.2)
    _plume(rig, "plume")
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    _helm(rig, "helm_loose")
    _plume(rig, "helm_loose")

    # arms: steel vambraces, gauntlets
    for s in ("r", "l"):
        B.arm_parts(rig, s, STEEL if s == "r" else STEEL_DK, hand=STEEL_DK, glove_finish="metal",
                    cuff=STEEL_LT, r0=4.8, r1=4.3, fist=4.6)

    rig.joint("sword", "torso", G0)
    _sword(rig, "sword")
    rig.track("swordTip", "sword", TIP)


# -- poses ---------------------------------------------------------------------------------
def sword_point(gx, gz, deg, d):
    """Torso-space (x, z) of the point `d` lu along the blade axis from the near hand."""
    return (gx + d * math.cos(math.radians(deg)), gz + d * math.sin(math.radians(deg)))


def wield(gx, gz, deg, yaw=0.0):
    """Both hands on the grip: the near hand at (gx, gz) in torso space, the blade pointing `deg`;
    the far hand GRIP lu toward the pommel."""
    pose = {"sword": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}}
    if yaw:
        pose["sword"]["rz"] = yaw
    a, f = B.ik2(SH, (gx - 0.4, gz + 0.4))
    pose.update(B.arm("r", a, f))
    fx, fz = sword_point(gx, gz, deg, -GRIP)
    a, f = B.ik2(SH, (fx, fz))
    pose.update(B.arm("l", a, f))
    return pose


STANCE = merge(wield(12.0, 32.0, -50.0), {"torso": {"r": 1}})   # leaning on the sword, point down


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)

    def extra(ctx):
        return merge(wield(12.0 + 0.4 * lag, 32.0 + 0.8 * lag, -50.0 + 2 * lag),
                     {"plume": {"r": 3 * lag}, "head": {"r": 1.5 * c}})
    return M.idle_v2(f, {"torso": {"r": 1}}, frames=6, bob=1.6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G3 heavy march at ground speed (card 55 x 1.25 = 68.75 lu/s), 10 x 100 ms ---------------
SPEED = 68.75
LEGS = K.legs_ik()
GAIT = G.Gait(10, 1000, SPEED, G.biped_feet(LEGS["l"], LEGS["r"], x_mid=2.0 * SCALE,
                                           ground=K.V3_ANKLE_Z * SCALE), 0.56,
              lift=9.0, kick=2.0, reach=3.0, toe_off=14.0, heel_strike=8.0, lift_peak=0.45, early_lift=2.0)
HEAVY_BOB = [-3.0, -5.6, -1.4, 1.2]
HEAVY_SQ = [-0.02, -0.06, 0.0, 0.03]
CARRY = (3.0, 27.0, 145.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(wield(CARRY[0], CARRY[1] + 0.6 * lag, CARRY[2] + 3 * lag),
                     {"plume": {"r": 6 * lag}, "hem": {"r": 3 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2}}, GAIT, legs=LEGS, bob=HEAVY_BOB, sq=HEAVY_SQ, tbob=None,
                     lean=-8.0, twist=5.0, nod=3.0, sway=2.0, extra=extra, report=report)


# -- attack A: high guard, diagonal sweep (moves.HEAVY_MELEE_MS, impact 6, 12 unique frames) -----------
#        shift dip  coil HOLD smear smear IMP  shock follow recover settle settle
A_G = [(12, 32, -50), (8, 30, 20), (2, 38, 110), (0, 42, 140), (8, 40, 70), (12, 34, 10), (14, 30, -28),
       (14, 29, -34), (13, 30, -38), (12, 31, -42), (12, 32, -46), (12, 32, -50)]
A_YAW = [0, 10, 26, 34, 14, -10, -28, -30, -24, -14, -6, 0]
A_T = [1, 4, 8, 10, 2, -8, -14, -14, -10, -6, -2, 1]
A_X = [0.0, -1.0, -3.0, -4.0, 1.0, 5.0, 8.0, 8.5, 7.0, 4.0, 1.5, 0.0]
A_Z = [0.0, -2.0, -0.5, 0.5, 0.0, -1.5, -4.0, -3.4, -2.6, -1.4, -0.4, 0.0]
A_Q = [0.0, -0.06, 0.02, 0.04, 0.05, 0.02, -0.12, 0.04, -0.04, 0.02, -0.01, 0.0]
A_THR = [0, -4, -8, -10, 8, 18, 26, 26, 22, 14, 6, 0]
A_SHR = [0, -4, -6, -6, -10, -16, -22, -20, -16, -10, -4, 0]
A_THL = [0, 4, 8, 10, -6, -14, -20, -20, -16, -10, -4, 0]
A_SHL = [0, -8, -10, -10, -6, -4, -6, -4, -4, -2, 0, 0]


def _attack_pose(f):
    gx, gz, deg = A_G[f]
    pose = merge(wield(gx, gz, deg), {
        "torso": {"r": A_T[f], "rz": A_YAW[f]}, "head": {"r": -0.4 * A_T[f], "rz": -0.6 * A_YAW[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 26), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose["sword"]["sx"] = 1.12
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


ARC = {"kind": "arc", "joint": "sword", "inner": MID, "outer": TIP, "color": "#D6DDE6", "taper": 0.15,
       "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}


def _attack_clip():
    ov = {
        4: [dict(ARC, **{"from": 3})],
        5: [dict(ARC, **{"from": 4})],
        6: [dict(ARC, t0=0.4, t1=1.0, lines=2, **{"from": 5}),
            {"kind": "burst", "joint": "sword", "point": TIP, "r0_lu": 8.0, "r1_lu": 15.0, "n": 6,
             "a0": -150.0, "arc": 150.0},
            {"kind": "dust", "ground": (36.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 81, "spread": 1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(12)], M.HEAVY_MELEE_MS,
                  impact=M.HEAVY_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: low guard thrust -------------------------------------------------------------------------
# 0-1 = A shift and dip; 2 sink; 3 HOLD (a low guard, the blade forward at the hip, the weight back);
# 4-5 smear (lunging); 6 IMPACT (a long lunge, the blade thrust level); 7 shock; 8 follow; 9-11 = A
OB_G = [(2, 22, 6), (-4, 22, 8), (6, 26, 4), (14, 30, 2), (18, 32, 0), (18, 32, 0), (14, 30, 4)]
OB_T = [4, 8, -4, -10, -14, -14, -10]
OB_X = [-1.5, -4.0, 2.0, 7.0, 12.0, 12.5, 10.0]
OB_Z = [-2.5, -4.0, -3.0, -3.5, -4.5, -4.2, -3.6]
OB_Q = [-0.04, 0.02, 0.06, 0.04, -0.12, 0.04, -0.04]
OB_THR = [6, 8, 20, 30, 40, 40, 34]
OB_SHR = [-8, -10, -20, -28, -34, -32, -28]
OB_THL = [-6, -10, -18, -26, -32, -32, -26]
OB_SHL = [-14, -22, -10, -4, -2, -2, -4]


def _b_pose(i):
    if i in (0, 1) or i >= 9:
        return _attack_pose(i)
    k = i - 2
    gx, gz, deg = OB_G[k]
    pose = merge(wield(gx, gz, deg), {
        "torso": {"r": OB_T[k], "rz": 8 if k < 2 else -6}, "head": {"r": -0.5 * OB_T[k]},
        "thigh_r": {"r": OB_THR[k]}, "shin_r": {"r": OB_SHR[k]},
        "thigh_l": {"r": OB_THL[k]}, "shin_l": {"r": OB_SHL[k]},
    }, M.body_about((0, 0, 26), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


STAB = {"kind": "streak", "joint": "sword", "point": TIP, "color": "#D6DDE6", "width_lu": 8.0, "white": 0.4}


def _attack_b():
    ov = {
        3: [{"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 82, "dir": -1.0}],
        4: [dict(STAB, **{"from": 3})],
        5: [dict(STAB, **{"from": 4, "width_lu": 7.0})],
        6: [dict(STAB, **{"from": 5, "t0": 0.4, "width_lu": 6.0}),
            {"kind": "burst", "joint": "sword", "point": TIP, "r0_lu": 7.0, "r1_lu": 13.0, "n": 6,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 83, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10), 11: ("attack", 11)}
    return M.clip("attack_b", [_b_pose(i) for i in range(12)], M.HEAVY_MELEE_MS,
                  impact=M.HEAVY_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: flat sweep at waist height ------------------------------------------------------------------
# 0-1 = A; 2 turn away; 3 HOLD (the blade drawn back level at the waist, body turned away); 4-5 smear;
# 6 IMPACT (swept round flat in front); 7 shock; 8 follow; 9-11 = A
OC_G = [(2, 26, 170), (-2, 26, 178), (4, 26, 120), (8, 26, 50), (12, 25, 0), (12, 25, -8), (10, 24, -20)]
OC_YAW = [36, 48, 30, 0, -30, -36, -26]
OC_X = [-1.5, -3.0, 1.0, 4.5, 7.0, 7.5, 6.0]
OC_Z = [-1.5, -2.5, -2.0, -2.5, -3.5, -3.0, -2.4]
OC_Q = [-0.04, 0.02, 0.06, 0.02, -0.12, 0.04, -0.04]
OC_THR = [-6, -10, 8, 18, 24, 24, 20]
OC_SHR = [-6, -10, -14, -18, -22, -20, -16]
OC_THL = [8, 12, -6, -14, -20, -20, -16]
OC_SHL = [-10, -16, -8, -6, -8, -6, -4]


def _c_pose(i):
    if i in (0, 1) or i >= 9:
        return _attack_pose(i)
    k = i - 2
    gx, gz, deg = OC_G[k]
    pose = merge(wield(gx, gz, deg, yaw=-0.4 * OC_YAW[k]), {
        "torso": {"r": -2, "rz": OC_YAW[k]}, "head": {"rz": -0.6 * OC_YAW[k]},
        "thigh_r": {"r": OC_THR[k]}, "shin_r": {"r": OC_SHR[k]},
        "thigh_l": {"r": OC_THL[k]}, "shin_l": {"r": OC_SHL[k]},
    }, M.body_about((0, 0, 26), x=OC_X[k], z=OC_Z[k], q=OC_Q[k]))
    if k in (2, 3):
        pose["sword"]["sx"] = 1.12
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_c():
    ov = {
        4: [dict(ARC, **{"from": 3})],
        5: [dict(ARC, **{"from": 4})],
        6: [dict(ARC, t0=0.4, t1=1.0, lines=2, **{"from": 5}),
            {"kind": "burst", "joint": "sword", "point": TIP, "r0_lu": 7.0, "r1_lu": 13.0, "n": 6,
             "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (28.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 84, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10), 11: ("attack", 11)}
    return M.clip("attack_c", [_c_pose(i) for i in range(12)], M.HEAVY_MELEE_MS,
                  impact=M.HEAVY_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 8 * a}, "torso": {"r": 6 * a},
                "sword": {"r": 8 * a}, "brow": {"z": 1.0 * max(a, 0)}}
    return K.hit_armoured(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"), face_back=F.expr("grit"))


HELM = {5: (60.0, -48.0, -95.0), 6: (68.0, -36.0, -170.0), 7: (76.0, -50.0, -265.0),
        8: (80.0, -51.0, -330.0), 9: (82.0, -51.0, -355.0)}
DIE_KEEP = [0, 1, 3, 4, 5, 7, 8, 9]


def _die(k):
    stiff = [0.3, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    flop = [0, 0, 0, 0, 0, 0.6, 1.0, 0.8, 0.8, 0.8][k]
    pose = merge(STANCE, K.die_d2(k, toe_x=8.0, lie_lift=8.0), {
        "head": {"r": [14, 8, 0, 0, -2, -8, 4, 0, 0, 0][k]},
        "torso": {"r": 4 * (1 - stiff)},
        "sword": {"r": 140 * stiff, "x": 6 * flop},
        "thigh_r": {"r": 6 * (1 - stiff)}, "thigh_l": {"r": -4 * (1 - stiff)},
        "shin_r": {"r": -20 * flop}, "shin_l": {"r": -10 * flop},
    })
    if k in HELM:
        x, z, r = HELM[k]
        pose["helm"] = {"hide": True}
        pose["plume"] = {"hide": True}
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
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)], [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY,
               loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "heavy"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(DIE_KEEP[i]) for i in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
