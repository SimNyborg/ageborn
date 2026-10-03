"""Shield Bearer: Bronze Age Common Guard (CONTENT_PLAN 5.2 #1). -25% from range >= 100, ~68 lu.

A viewer expects a man behind a big shield to brace it against arrows, then hack over the rim
with a short sword, and to march tucked behind the shield.

Look: a stocky thureophoros under a conical polished-bronze pilos with a verdigris band and a
short team plume tuft; a plum tunic under a linen cuirass with a team band, bronze greaves and
laced sandals. A tall oval team shield (thureos) with a sandstone spine, a polished boss and a
sandstone lambda covers him from shin to chin, so he reads as a moving wall; a forward-curved
kopis rides in the far hand.

Animation (cartoon kit v2):
  idle    peeks over the rim (the head bobs up and down behind it), taps the kopis on the rim
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, card 65 x 1.25 = 81.25 lu/s): the kopis
          resting back on the far shoulder, the shield high on the near forearm swinging a frame
          late, planted feet
  attack_b  FLAT CLEAVE FROM BEHIND THE SHIELD: crouches with the kopis drawn back level at the hip
          (the blade sticks out behind him), then sweeps it flat across at chest height
  attack_c  SHIELD SHOVE AND LOW HACK: drops to a deep crouch behind the shield with the kopis
          cocked low behind the hip, shoves, then hacks low at the legs under the rim
  attack  BRACE AND HACK: he plants behind the shield (shove, dust), rises with the kopis
          cocked high behind his head (the held extreme, blade clear above the rim), then
          hacks down over the rim (arc smear); impact on the chop, blade past the rim
  hit     armoured: ducks behind the shield, the pilos clanks down
  die     D2 topple backwards, the shield falls flat on top of him, the pilos pops off
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "shield_bearer"
GAIT_NAME = "biped"
NAME = "Shield Bearer"
HEIGHT_LU = 68
CANVAS = (300, 250)
FEET = (132, 216)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (shield)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand (kopis), modelled pointing up (+Z)
HELM_C = (1.5, 0, 57.5)
SH_C = (HR[0] + 2.0, HR[1] - 6.5, HR[2] + 5.0)


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig, greaves=False, wraps=B.VERD)   # verdigris leg wraps (bronze is an accent only)

    g = Geo().blob((0, 0, 20.0), (10.6, 9.8, 6.0), p=2.4)
    rig.part("torso", g, B.PLUM)
    B.cuirass(rig, B.LINEN, trim=B.VERD, z=28.5, bulk=1.04)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 9.0), max_deg=10, gain=0.9)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT + 3.0)        # hem >= 9 lu above the soles (the knees show)
    g = Geo().blob((0.6, 0, 13.6), (11.4, 10.6, 4.2), p=2.4, taper=(1.14, 0.94))     # plum skirt
    rig.part("hem", g, B.PLUM)
    g = Geo().blob((0.6, 0, 10.0), (11.6, 10.8, 1.1), p=3.0)
    rig.part("hem", g, B.VERD_DK, outline=0.5)
    g = Geo().blob((0.5, 0, 20.2), (11.6, 10.8, 1.7), p=3.2)
    rig.part("torso", g, B.LEATHER_DK, outline=0.6)
    for s, y in (("r", -12.0), ("l", 11.5)):                          # team shoulder guards
        g = Geo().blob((0.4, y, 37.0), (6.6, 5.8, 5.0), p=2.6)
        rig.part(f"arm_{s}", g, team=True)

    # head: face kit, short beard, pilos on its own joint (clanks down, pops off)
    beard = Geo()
    for x, y, z, r in ((11.8, -2.8, 41.0, 2.6), (12.8, 0.4, 40.0, 2.7), (11.6, 3.2, 41.0, 2.4)):
        beard.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[beard], mouth_z=44.8, mouth_w=5.0)
    rig.part("head", beard, B.HAIR, finish="hair")
    rig.joint("helm", "head", HELM_C)
    K.boeotian(rig, "helm", c=HELM_C)
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    K.boeotian(rig, "helm_loose", c=HELM_C, plume=False)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.2, r1=3.8)
    for s in ("r", "l"):
        g = Geo().blob((0, B.ARM_Y[s], B.HAND_Z + 3.4), (4.6, 4.6, 2.0), p=2.6)
        rig.part(f"fore_{s}", g, B.LEATHER, outline=0.7)

    # kopis in the far hand
    rig.joint("kopis", "hand_l", HL)
    tip = K.kopis(rig, "kopis", HL, length=24.0, width=1.9, blade=B.AGED)
    rig.track("kopisTip", "kopis", tip)

    # the thureos on the near hand
    rig.joint("shield", "hand_r", HR)
    K.oval_shield(rig, "shield", SH_C, rx=11.2, rz=19.5, depth=2.8, rim=B.AGED)

    # the loose shield for the death (falls flat on him)
    rig.joint("sh_loose", "root", (0, 0, 0), hidden=True)
    K.oval_shield(rig, "sh_loose", (0.0, -14.0, 0.0), rx=11.2, rz=19.5, depth=2.8, rim=B.AGED)


# -- poses ---------------------------------------------------------------------------------
def shield(a, f, w=92.0):
    return B.arm("r", a, f, w, w_rest=90.0)


def blade(a, f, w):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(shield(-60, -14, 92), blade(-40, 30, 64), {"torso": {"r": -2}})
NO_BLADE = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l", "hand_l")}
NO_SHIELD = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r")}


def _idle(f):
    # peeks: the head bobs up over the rim on 1-2, ducks on 4; the kopis taps the rim on 3
    peek = [0.0, 0.7, 1.0, 0.2, -0.6, -0.2][f]
    tap = [0.0, 0.3, 0.8, -0.6, 0.0, 0.0][f]

    def extra(ctx):
        return merge(blade(-40 + 10 * tap, 30 + 12 * tap, 64 + 10 * tap), {
            "head": {"z": 1.0 * peek, "r": -3 * peek}, "pupils": {"x": 0.4 * peek},
            "arm_r": {"r": -2 * ctx["lag"]}, "helm": {"z": 0.3 * peek},
        })
    return M.idle_v2(f, NO_BLADE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms ----------
RIG = None
SPEED = 81.25
LEGS = B.walk_legs_v3()
GAIT = B.jog_gait(SPEED, LEGS)
# walk carry: the kopis resting back on the far shoulder (blade up and back), pumping a little with
# the far arm; the shield held high on the near forearm (its foot >= 9 lu above the soles), swinging
# a frame late against the legs


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = -math.cos(ctx["lag_p"])                  # +1 = the near (shield) arm forward
        return merge(shield(-28 + 8 * c, 30 + 8 * c, 92),
                     blade(-70 - 8 * c, 58 - 6 * c, 128 - 4 * lag),
                     {"helm": {"z": 0.35 * lag}, "kopis": {"r": -3 * lag}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r", "arm_l", "fore_l", "hand_l")}
    return M.walk_v3(RIG, f, base, GAIT, legs=LEGS, lean=-9.0, twist=6.0, nod=3.0, extra=extra, report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    """Planted feet by IK (near foot x, far foot x, lifts, foot angles)."""
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 11 unique frames, moves.SMALL_MELEE_MS
#        read  dip  brace HOLD smear lead  IMP  over recoil settle settle
K_A = [-40, -60, -20, 110, 80, 50, 12, 2, 10, -30, -38]
K_F = [30, 0, 70, 150, 90, 30, -8, -20, -5, 20, 28]
# kopis direction in WORLD degrees (the torso lean is subtracted below)
K_WW = [64, 40, 110, 165, 100, 35, -22, -38, 20, 56, 62]
H_A = [-60, -48, -30, -42, -40, -36, -34, -34, -40, -54, -58]
H_F = [-14, -6, 8, -4, -4, -6, -6, -8, -10, -12, -14]
A_T = [-2, -8, -12, 12, 2, -10, -20, -22, -10, -4, -2]
A_H = [0, 6, 4, -8, -2, 4, 10, 10, 4, 1, 0]
A_Q = [-0.02, -0.12, -0.06, 0.1, 0.05, 0.02, -0.15, -0.11, -0.04, 0.02, 0.0]
A_X = [-0.5, -1.0, 3.0, -1.5, 2.0, 4.0, 6.0, 6.5, 4.0, 1.5, 0.5]
A_Z = [0.0, -3.0, -1.6, 1.6, 0.8, -0.4, -2.6, -2.2, -1.2, -0.3, 0.0]
# planted feet (ankle x): the near foot steps in with the brace and the chop, the far foot holds
A_FR = [2.0, 3.0, 8.0, 5.0, 8.0, 10.0, 13.0, 13.0, 10.0, 5.0, 2.5]
A_FL = [-2.0, -3.0, -3.0, -4.0, -2.0, -1.0, 1.0, 1.0, 0.0, -1.0, -2.0]
A_LR = [0, 0, 1.0, 0, 2.0, 1.0, 0, 0, 0, 0, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(blade(K_A[f] - t, K_F[f] - t, K_WW[f] - t), shield(H_A[f], H_F[f], 92), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f], lr=A_LR[f])
    if f in (4, 5):
        pose.setdefault("kopis", {})["sz"] = 1.12
    if f in (1, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (2, 4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


KOPIS_TIP = (HL[0] + 2.4, HL[1] - 0.6, HL[2] + 24.0)
KOPIS_MID = (HL[0] + 1.4, HL[1] - 0.6, HL[2] + 12.0)
SHIELD_FACE = (SH_C[0], SH_C[1] - 3.0, SH_C[2])


def _attack_clip():
    arc = {"kind": "arc", "joint": "kopis", "inner": KOPIS_MID, "outer": KOPIS_TIP, "color": B.SAND_LT,
           "white": 0.3, "taper": 0.2, "lines": 3}
    ov = {
        2: [{"kind": "burst", "joint": "hand_r", "point": (SHIELD_FACE[0] + 12.0, SHIELD_FACE[1], SHIELD_FACE[2]),
             "r0_lu": 4.0, "r1_lu": 9.0, "n": 4, "a0": -40.0, "arc": 80.0},
            {"kind": "dust", "ground": (8.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 4, "spread": 0.9}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(arc, **{"from": 5, "t0": 0.1, "t1": 0.9}),
            {"kind": "burst", "joint": "kopis", "point": KOPIS_TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -80.0, "arc": 140.0},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 7, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: flat cleave from behind the shield (ANIM_SPEC 2.2 "guard-and-cut") -------------------
# 0-1 = A read and dip, 2 crouch (the kopis pulled back), 3 HOLD (crouched behind the shield, the kopis
# drawn back LEVEL at the hip, the blade sticking out behind him), 4 smear, 5 lead, 6 IMPACT (a step in,
# the blade swept flat across at chest height past the rim), 7 overshoot, 8-10 = A recoil and settle
#      crouch HOLD smear lead  IMP  over
B_KA = [-120, -150, -60, -20, 0, 6]          # kopis (far) arm: upper arm, forearm (world deg)
B_KF = [-150, -175, -10, 10, 4, 0]
B_KW = [-170, -178, -60, -10, 4, 8]          # blade direction (world deg): straight back, then forward
B_HA = [-44, -40, -40, -46, -56, -56]        # shield arm (torso deg)
B_HF = [-6, 0, -4, -10, -20, -20]
B_T = [-8, -14, 2, -6, -14, -16]
B_H = [6, 10, 2, 4, 8, 8]
B_X = [-1.0, -2.5, 2.0, 5.0, 7.5, 8.0]
B_Z = [-3.0, -5.5, -4.0, -3.0, -3.0, -2.8]
B_Q = [-0.06, -0.12, 0.04, 0.0, -0.12, -0.08]
B_FR = [4.0, 6.0, 9.0, 12.0, 15.0, 15.0]
B_FL = [-5.0, -7.0, -6.0, -4.0, -3.0, -3.0]
B_LR = [0.0, 0.0, 2.5, 1.0, 0.0, 0.0]


def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(blade(B_KA[k] - t, B_KF[k] - t, B_KW[k] - t), shield(B_HA[k], B_HF[k], 92), {
        "torso": {"r": t, "rz": [-14, -24, 6, 18, 26, 26][k]}, "head": {"r": B_H[k]},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k], lr=B_LR[k])
    if i in (4, 5):
        pose.setdefault("kopis", {})["sz"] = 1.14
    if i in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_b():
    arc = {"kind": "arc", "joint": "kopis", "inner": KOPIS_MID, "outer": KOPIS_TIP, "color": B.SAND_LT,
           "white": 0.3, "taper": 0.2, "lines": 3}
    ov = {
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.35, "t1": 0.95})],
        6: [dict(arc, **{"from": 5, "t0": 0.1, "t1": 0.9}),
            {"kind": "burst", "joint": "kopis", "point": KOPIS_TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 13, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse)


# -- attack C: shield shove, then a low hack at the legs --------------------------------------------
# 0-1 = A's, 2 the shove (shield driven forward, dust), 3 HOLD (a deep crouch behind the shield, the
# kopis cocked LOW behind the hip, point down), 4 smear, 5 lead, 6 IMPACT (the blade hacked low and
# forward under the rim, near the ground), 7 overshoot, 8-10 = A's
#      shove HOLD smear lead  IMP  over
C_KA = [-110, -130, -80, -50, -40, -38]
C_KF = [-120, -150, -60, -40, -36, -34]
C_KW = [-100, -120, -70, -40, -30, -28]       # blade pointing down and back, then low forward
C_HA = [-10, -36, -34, -30, -26, -26]         # the shove: shield arm driven forward
C_HF = [8, -2, 0, 2, 4, 4]
C_T = [-18, -26, -24, -30, -36, -36]
C_H = [10, 16, 14, 18, 22, 22]
C_X = [4.0, 0.0, 3.0, 6.0, 9.0, 9.5]
C_Z = [-3.0, -9.0, -8.5, -9.0, -10.0, -9.8]
C_Q = [-0.04, -0.14, 0.02, -0.02, -0.16, -0.12]
C_FR = [9.0, 8.0, 11.0, 14.0, 17.0, 17.0]
C_FL = [-3.0, -9.0, -8.0, -7.0, -6.0, -6.0]
C_LR = [0.0, 0.0, 1.5, 0.5, 0.0, 0.0]


def _c_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = C_T[k]
    pose = merge(blade(C_KA[k] - t, C_KF[k] - t, C_KW[k] - t), shield(C_HA[k], C_HF[k], 92), {
        "torso": {"r": t}, "head": {"r": C_H[k]},
    }, M.body_about((0, 0, 22), x=C_X[k], z=C_Z[k], q=C_Q[k]))
    pose = _feet(pose, C_FR[k], C_FL[k], lr=C_LR[k])
    if i in (4, 5):
        pose.setdefault("kopis", {})["sz"] = 1.14
    if i == 3:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_c():
    arc = {"kind": "arc", "joint": "kopis", "inner": KOPIS_MID, "outer": KOPIS_TIP, "color": B.SAND_LT,
           "white": 0.3, "taper": 0.2, "lines": 3}
    ov = {
        2: [{"kind": "burst", "joint": "hand_r", "point": (SHIELD_FACE[0] + 12.0, SHIELD_FACE[1], SHIELD_FACE[2]),
             "r0_lu": 4.0, "r1_lu": 10.0, "n": 4, "a0": -40.0, "arc": 80.0},
            {"kind": "dust", "ground": (12.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 17, "spread": 1.0}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(arc, **{"from": 5, "t0": 0.1, "t1": 0.9}),
            {"kind": "burst", "joint": "kopis", "point": KOPIS_TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -110.0, "arc": 120.0},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": 19, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return merge(shield(-60 + 16 * max(a, 0), -14 + 20 * max(a, 0), 92),
                     {"arm_l": {"r": 12 * a}, "kopis": {"r": 10 * a},
                      "brow": {"z": 1.2 * max(a, 0)}})
    return B.hit_armoured(k, NO_SHIELD, recoil, face_hurt=F.expr("squeeze", "grit"))


LOOSE = [None, None, None, (-8, 16, 60), (-4, 30, 190), (2, 20, 300), (8, -6, 380), (13, -38, 440),
         (16, -41, 470), (17, -41, 480)]
# the shield tips over and lands flat across his legs: (x, z, r) of the loose shield
SH_LOOSE = [None, None, None, (6, 24, -20), (2, 14, -60), (-2, 6, -86), (-4, 3, -90), (-4, 3, -90),
            (-4, 3, -90), (-4, 3, -90)]


def _die(k):
    flail = [0.4, 0.3, 0.9, 1.0, 0.3, 0.6, 0.1, 0.0, 0.0, 0.0][k]
    stiff = min(1.0, k / 3.0)
    pose = merge(STANCE, B.die_d2(k, center_z=28.0, lie_z=10.0, height=HEIGHT_LU), {
        "torso": {"r": -4 * stiff}, "head": {"r": 10 * flail - 4},
        "arm_r": {"r": 60 * flail + 30 * stiff}, "fore_r": {"r": 20 * flail},
        "arm_l": {"r": 90 * flail + 40 * stiff}, "fore_l": {"r": 30 * flail},
        "thigh_r": {"r": 6 * flail}, "shin_r": {"r": -4 * flail},
        "thigh_l": {"r": -6 * flail}, "shin_l": {"r": -4 * flail},
    })
    if LOOSE[k] is not None:
        x, z, r = LOOSE[k]
        pose["helm"] = dict(pose.get("helm", {}), hide=True)
        pose["helm_loose"] = {"show": True, "x": x, "z": z, "r": -r}
    if SH_LOOSE[k] is not None:
        x, z, r = SH_LOOSE[k]
        pose["shield"] = dict(pose.get("shield", {}), hide=True)
        pose["sh_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
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
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
