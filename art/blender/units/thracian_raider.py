"""Thracian Raider: Bronze Age Common Raider (CONTENT_PLAN 5.2 #2). Fast, x2 damage to the base, ~68 lu.

A viewer expects a long two-handed blade to come over the shoulder and hook down, and a raider
to sprint low and leaning forward.

Look: a wiry Thracian in a pointed fox-skin cap (alopekis) with ear flaps and a brush tail at the
back (desaturated fox brown, a cream tail tip), a team tunic with a sandstone zig-zag hem, a team
cloak (zeira) that streams behind him, fawn-skin boots with cream cuffs. He swings a rhomphaia:
a long wrapped handle and a long, forward-curved polished blade, held in both hands.

Animation (cartoon kit v2):
  idle    bounces on the balls of his feet, rolls the shoulders, the blade resting on one
  walk    walk v3 sprint at ground speed (ANIM_SPEC G1, card 90 x 1.25 = 112.5 lu/s, 568 ms, stance
          0.32, hips low): a deep forward lean, the cloak streaming, the blade trailing low behind
  attack_b  RISING DIAGONAL SLASH: drops into a deep crouch with the blade trailing low behind him
          near the ground, then rips it up and forward in a rising cut
  attack_c  FLAT SWEEP: stands tall and turns away with the blade drawn back level at chest height,
          then sweeps it round flat at waist height
  attack  OVER-THE-SHOULDER HOOK: crouch, the blade swings up over the shoulder until it points
          back over his head (held extreme, the curved blade clear above him), then a big
          hooking down-cut in front (arc smear, yell) that ends low, blade past the target
  hit     light: head snaps back, the cap tail flicks
  die     D1 fling and spin, the fox cap flies off, the rhomphaia cartwheels away
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "thracian_raider"
GAIT_NAME = "biped"
NAME = "Thracian Raider"
HEIGHT_LU = 68
CANVAS = (380, 340)
FEET = (180, 276)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
FOX = "#A39080"
FOX_DK = "#7E6E62"
HIDE = "#76685C"                      # boots and bracers: a greyer leather (cel shadows stay under 40% saturation)
CREAM = "#EFE6D2"
CAP_C = (0.5, 0, 56.0)


def _cap(rig, joint, c, tail=True):
    cx, cy, cz = c
    g = Geo().lathe([(11.8, -1.0), (11.6, 2.0), (9.6, 7.0), (6.0, 12.0), (2.6, 15.0), (0, 16.4)],
                    (cx, cy, cz - 1.0), segs=20, squash=(1.0, 0.95), rot=(0, 14, 0))
    rig.part(joint, g, FOX, finish="hair")
    g = Geo()                                                        # ear flaps hanging by the cheeks
    for y in (-10.6, 10.6):
        g.blob((cx - 1.0, y, cz - 6.5), (4.4, 1.8, 6.6), p=2.3, taper=(0.7, 1.0))
    rig.part(joint, g, FOX_DK, finish="hair", outline=0.7)
    g = Geo().blob((cx + 0.3, cy, cz - 0.8), (12.3, 11.9, 2.2), p=2.8)
    rig.part(joint, g, team=True, outline=0.6)
    if tail:
        rig.secondary("foxtail", joint, (cx - 9.0, cy, cz + 2.0), (cx - 20.0, cy, cz - 6.0), max_deg=20, gain=1.3)
        g = Geo().capsule((cx - 9.0, cy + 1.0, cz + 2.0), (cx - 17.0, cy + 1.0, cz - 3.0), 2.8, 3.6)
        rig.part("foxtail", g, FOX, finish="hair")
        g = Geo().blob((cx - 19.6, cy + 1.0, cz - 5.0), (3.6, 3.4, 3.4), p=2.2)
        rig.part("foxtail", g, CREAM, finish="hair", outline=0.6)


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig, greaves=False)
    K.boots_v3(rig, color=HIDE, cuff=CREAM)

    K.tunic(rig, team=True, hem_color=None)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT + 1.0)        # hem >= 9 lu above the soles
    g = Geo()                                                         # zig-zag hem band
    for k in range(10):
        a = 3.14159 * (0.5 + 1.9 * k / 9)
        g.blob((11.6 * math.cos(a), 10.6 * math.sin(a), 10.6 + (1.2 if k % 2 else -0.4)), (2.4, 2.2, 1.6),
               p=2.4, rot=(0, 0, math.degrees(a) + 90))
    rig.part("hem", g, B.SAND_LT, outline=0.5)
    # the zeira cloak: pinned on the far shoulder, streaming back (follow-through)
    rig.secondary("cloak", "torso", (-6.0, 6.0, 37.0), (-18.0, 8.0, 18.0), max_deg=22, gain=1.4)
    g = Geo().slab([(-1.0, 41.0), (-10.0, 40.0), (-20.0, 19.0), (-15.0, 13.0), (-11.0, 18.0), (-7.0, 13.5),
                    (-2.0, 30.0)], 7.5, 2.4)
    rig.part("cloak", g, team=True, outline=0.8)
    g = Geo().slab([(-18.2, 20.2), (-14.2, 14.8), (-12.6, 16.2), (-16.6, 21.8)], 7.3, 2.2)
    rig.part("cloak", g, B.SAND_LT, outline=0.5)
    g = Geo().sphere((3.0, -7.0, 36.0), 1.8, cuts=2)                  # brooch
    rig.part("torso", g, B.BRONZE_HI, finish=B.POLISH, outline=0.4)

    # head: face kit, drooping moustache, the fox cap on its own joint
    mous = Geo()
    for y in (-3.0, 3.0):
        mous.blob((13.2, y, 45.2), (2.6, 3.0, 1.5), p=2.2, rot=(0, 0, 0))
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), brow_tilt=2.6, extra=[mous], mouth_z=43.4)
    rig.part("head", mous, B.HAIR, finish="hair", outline=0.5)
    rig.joint("cap", "head", CAP_C)
    _cap(rig, "cap", CAP_C)
    rig.joint("cap_loose", "root", CAP_C, hidden=True)
    _cap(rig, "cap_loose", CAP_C, tail=False)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.0, r1=3.6)
        g = Geo().blob((0, B.ARM_Y[s], B.HAND_Z + 3.4), (4.4, 4.4, 1.8), p=2.6)
        rig.part(f"fore_{s}", g, HIDE, outline=0.7)

    rig.joint("rhom", "hand_r", HR)
    tip = K.rhomphaia(rig, "rhom", HR)
    rig.track("bladeTip", "rhom", tip)
    rig.joint("rhom_loose", "root", (0, 0, 0), hidden=True)
    K.rhomphaia(rig, "rhom_loose", (0.0, -2.0, -20.0), blade_color=B.AGED)   # cartwheels face-on: aged bronze keeps the colour rule


# -- poses ---------------------------------------------------------------------------------
def wield(a, f, w, lean=0.0, d=7.0):
    return K.two_hand(a, f, w, d, lean=lean)


STANCE = merge(wield(-55, 10, 62, lean=-4), {"torso": {"r": -4}})


def _idle(f):
    # bounce on the toes; a shoulder roll on 2-3 lifts the blade
    b = [0.0, 0.8, 0.2, 1.0, 0.0, -0.4][f]

    def extra(ctx):
        return merge(wield(-55 + 6 * b, 10 + 10 * b, 62 + 8 * b, lean=-4), {
            "hips": {"z": 1.2 * b}, "head": {"r": -2 * b}, "pupils": {"x": 0.3 * b},
        })
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G1 sprint at ground speed (card 90 x 1.25 = 112.5 lu/s), 8 x 71 ms ---------------------
RIG = None
SPEED = 112.5
LEGS = B.walk_legs_v3()
GAIT = B.jog_gait(SPEED, LEGS, cycle_ms=568, stance=0.32, lift=7.0, x_mid=3.5)
SPRINT_BOB = [-6.4, -7.0, -2.8, -0.4]       # hips low (a hunched sprint), the bounce on top
# walk carry: the blade trailing low behind him in both hands, point back and up (a raider's sprint)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = math.cos(ctx["lag_p"])
        return merge(wield(-118 + 8 * c, -96 + 8 * c, 196 + 5 * lag, lean=-20, d=6.0),
                     {"cap": {"r": 4 * lag}, "head": {"r": 8}})
    base = {k: v for k, v in STANCE.items() if not k.startswith(("arm_", "fore_", "hand_"))}
    return M.walk_v3(RIG, f, base, GAIT, legs=LEGS, bob=SPRINT_BOB, lean=-20.0, twist=8.0, nod=3.0,
                     extra=extra, report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 11 unique frames, moves.SMALL_MELEE_MS (WORLD angles: near arm, forearm, blade)
#        read  dip  wind  HOLD smear lead  IMP  over recoil settle settle
W_A = [-55, -30, 60, 105, 70, 15, -25, -35, -30, -45, -52]
W_F = [10, 40, 110, 145, 50, -5, -40, -52, -12, 4, 8]
W_W = [62, 110, 150, 168, 70, 5, -42, -60, 10, 50, 60]
A_T = [-4, -10, 6, 16, 2, -14, -26, -28, -14, -6, -4]
A_H = [0, 4, -6, -8, 0, 6, 10, 10, 4, 1, 0]
A_Q = [-0.02, -0.12, 0.04, 0.1, 0.06, 0.02, -0.16, -0.12, -0.04, 0.02, 0.0]
A_X = [0.0, -1.5, -3.0, -4.5, 0.0, 4.0, 8.0, 9.0, 6.0, 2.0, 0.5]
A_Z = [0.0, -3.2, 0.6, 1.6, 0.8, -0.6, -3.0, -2.6, -1.4, -0.4, 0.0]
A_FR = [2.0, 3.0, 2.0, 1.0, 6.0, 10.0, 15.0, 15.5, 12.0, 6.0, 2.5]
A_FL = [-2.0, -4.0, -5.0, -6.0, -5.0, -4.0, -3.0, -3.0, -2.5, -2.0, -2.0]
A_LR = [0, 0, 0, 0, 2.5, 1.5, 0, 0, 0, 0, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(wield(W_A[f], W_F[f], W_W[f], lean=t), {
        "torso": {"r": t}, "head": {"r": A_H[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f], lr=A_LR[f])
    if f in (4, 5):
        pose.setdefault("rhom", {})["sz"] = 1.1
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


TIP = (HR[0] + 7.6, HR[1] - 0.8, HR[2] + 48.6)
MID = (HR[0] + 2.0, HR[1] - 0.8, HR[2] + 30.0)


def _attack_clip():
    arc = {"kind": "arc", "joint": "rhom", "inner": MID, "outer": TIP, "color": B.SAND_LT,
           "white": 0.3, "taper": 0.2, "lines": 3}
    ov = {
        1: [{"kind": "dust", "ground": (-4.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 2, "spread": 0.7}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(arc, **{"from": 5, "t0": 0.1, "t1": 0.9}),
            {"kind": "burst", "joint": "rhom", "point": TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -100.0, "arc": 150.0},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 8, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: rising diagonal slash from a deep crouch -------------------------------------------
# 0-1 = A read and dip, 2 sink, 3 HOLD (deep crouch, the blade trailing LOW behind him near the ground,
# point back and down), 4 smear, 5 lead, 6 IMPACT (risen onto the front leg, the blade ripped up and
# forward to point high in front), 7 overshoot, 8-10 = A recoil and settle
#      sink  HOLD smear lead  IMP  over
B_WA = [-120, -135, -70, -20, 20, 26]         # near arm, forearm, blade (world deg)
B_WF = [-130, -150, -50, 10, 50, 56]
B_WW = [-150, -160, -60, 20, 62, 70]
B_T = [-14, -20, -10, 0, 6, 8]
B_H = [8, 12, 6, -2, -6, -6]
B_X = [-1.0, -2.5, 2.0, 6.0, 9.0, 9.5]
B_Z = [-5.0, -8.0, -6.0, -2.0, 0.8, 0.6]
B_Q = [-0.08, -0.14, 0.04, 0.08, 0.04, 0.0]
B_FR = [6.0, 8.0, 10.0, 13.0, 16.0, 16.0]
B_FL = [-6.0, -8.0, -7.0, -5.0, -4.0, -4.0]
B_LR = [0.0, 0.0, 2.0, 1.0, 0.0, 0.0]


def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(wield(B_WA[k], B_WF[k], B_WW[k], lean=t), {
        "torso": {"r": t}, "head": {"r": B_H[k]},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k], lr=B_LR[k])
    if i in (4, 5):
        pose.setdefault("rhom", {})["sz"] = 1.1
    pose = merge(pose, F.expr("grit") if i in (2, 3) else F.expr("yell"), {"brow": {"z": -1.1}})
    return pose


def _attack_b():
    arc = {"kind": "arc", "joint": "rhom", "inner": MID, "outer": TIP, "color": B.SAND_LT,
           "white": 0.3, "taper": 0.2, "lines": 3}
    ov = {
        3: [{"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 31, "spread": 0.7}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(arc, **{"from": 5, "t0": 0.1, "t1": 0.9}),
            {"kind": "burst", "joint": "rhom", "point": TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -20.0, "arc": 130.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 32, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse)


# -- attack C: flat sweep at waist height, turning away first ---------------------------------------
# 0-1 = A's, 2 turn, 3 HOLD (standing tall, turned away, the blade drawn back LEVEL at chest height,
# pointing straight back), 4 smear, 5 lead, 6 IMPACT (the blade swept round flat in front at waist
# height), 7 overshoot, 8-10 = A's
#      turn  HOLD smear lead  IMP  over
C_WA = [-150, -170, -100, -40, -20, -16]
C_WF = [-170, -185, -70, -10, 0, 4]
C_WW = [175, 182, 90, 20, 0, -6]
C_T = [10, 14, 4, -8, -14, -16]
C_RZ = [-20, -32, 0, 18, 28, 30]
C_H = [-4, -6, 0, 4, 8, 8]
C_X = [-2.0, -3.0, 1.0, 5.0, 8.0, 8.5]
C_Z = [0.5, 1.0, 0.0, -1.5, -2.5, -2.3]
C_Q = [0.04, 0.08, 0.04, 0.0, -0.12, -0.08]
C_FR = [1.0, 0.0, 6.0, 11.0, 14.0, 14.0]
C_FL = [-5.0, -6.0, -5.0, -3.0, -2.0, -2.0]
C_LR = [0.0, 0.0, 3.0, 1.0, 0.0, 0.0]


def _c_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = C_T[k]
    pose = merge(wield(C_WA[k], C_WF[k], C_WW[k], lean=t), {
        "torso": {"r": t, "rz": C_RZ[k]}, "head": {"r": C_H[k]},
    }, M.body_about((0, 0, 22), x=C_X[k], z=C_Z[k], q=C_Q[k]))
    pose = _feet(pose, C_FR[k], C_FL[k], lr=C_LR[k])
    if i in (4, 5):
        pose.setdefault("rhom", {})["sz"] = 1.1
    pose = merge(pose, F.expr("grit") if i in (2, 3) else F.expr("yell"), {"brow": {"z": -1.1}})
    return pose


def _attack_c():
    arc = {"kind": "arc", "joint": "rhom", "inner": MID, "outer": TIP, "color": B.SAND_LT,
           "white": 0.3, "taper": 0.2, "lines": 3}
    ov = {
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(arc, **{"from": 5, "t0": 0.1, "t1": 0.9}),
            {"kind": "burst", "joint": "rhom", "point": TIP, "r0_lu": 5.0, "r1_lu": 11.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 33, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return merge(wield(-55 + 20 * a, 10 + 20 * a, 62 + 16 * a, lean=-4 + 12 * a), {
            "head": {"r": 16 * a}, "torso": {"r": 12 * a},
            "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
            "brow": {"z": 1.4 * max(a, 0)}, "foxtail": {"r": 12 * a}})
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"))


LOOSE = [None, (6, 0, 64, 40), (10, 0, 88, 160), (14, 0, 96, 290), (18, 0, 84, 400),
         (22, 0, 56, 500), (25, 0, 28, 560), (27, 0, 26, 540), (28, 0, 26, 540), (28, 0, 26, 540)]
CAP_LOOSE = [None, None, (-4, 0, 70, 30), (-8, 0, 82, 90), (-14, 0, 74, 160), (-20, 0, 50, 220),
             (-26, 0, 14, 250), (-28, 0, 4, 260), (-28, 0, 4, 260), (-28, 0, 4, 260)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if LOOSE[k] is not None:
        x, y, z, r = LOOSE[k]
        pose["rhom"] = dict(pose.get("rhom", {}), hide=True)
        pose["rhom_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if CAP_LOOSE[k] is not None:
        x, y, z, r = CAP_LOOSE[k]
        pose["cap"] = dict(pose.get("cap", {}), hide=True)
        pose["cap_loose"] = {"show": True, "x": x, "z": z - 56.0, "r": r}
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
