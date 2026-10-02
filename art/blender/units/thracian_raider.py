"""Thracian Raider: Bronze Age Common Raider (CONTENT_PLAN 5.2 #2). Fast, x2 damage to the base, ~68 lu.

A viewer expects a long two-handed blade to come over the shoulder and hook down, and a raider
to sprint low and leaning forward.

Look: a wiry Thracian in a pointed fox-skin cap (alopekis) with ear flaps and a brush tail at the
back (desaturated fox brown, a cream tail tip), a team tunic with a sandstone zig-zag hem, a team
cloak (zeira) that streams behind him, fawn-skin boots with cream cuffs. He swings a rhomphaia:
a long wrapped handle and a long, forward-curved polished blade, held in both hands.

Animation (cartoon kit v2):
  idle    bounces on the balls of his feet, rolls the shoulders, the blade resting on one
  walk    low sprint: big strides, a deep forward lean, the cloak streaming, the blade at port
  attack  OVER-THE-SHOULDER HOOK: crouch, the blade swings up over the shoulder until it points
          back over his head (held extreme, the curved blade clear above him), then a big
          hooking down-cut in front (arc smear, yell) that ends low, blade past the target
  hit     light: head snaps back, the cap tail flicks
  die     D1 fling and spin, the fox cap flies off, the rhomphaia cartwheels away
"""
from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "thracian_raider"
NAME = "Thracian Raider"
HEIGHT_LU = 68
CANVAS = (320, 260)
FEET = (150, 222)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
FOX = "#A88A6E"
FOX_DK = "#806A56"
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
    B.skeleton(rig)
    B.sandal_legs(rig, greaves=False)
    K.boots(rig, color=B.LEATHER, cuff=CREAM)

    K.tunic(rig, team=True, hem_color=None)
    g = Geo()                                                         # zig-zag hem band
    for k in range(10):
        import math
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
        rig.part(f"fore_{s}", g, B.LEATHER, outline=0.7)

    rig.joint("rhom", "hand_r", HR)
    tip = K.rhomphaia(rig, "rhom", HR)
    rig.track("bladeTip", "rhom", tip)
    rig.joint("rhom_loose", "root", (0, 0, 0), hidden=True)
    K.rhomphaia(rig, "rhom_loose", (0.0, -2.0, -20.0))
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


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


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(wield(-50 + 4 * lag, 25 + 4 * lag, 134 + 5 * lag, lean=-20, d=6.0), {"cap": {"r": 4 * lag}})
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=48.0, knee=96.0, lift_lu=10.0, bob_pct=0.09,
                     lean=-20.0, arm=0.0, fore=0.0, arms=(), extra=extra)


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
A_THR = [0, 14, 4, -6, 14, 26, 36, 36, 22, 8, 2]
A_SHR = [0, -22, -6, 0, -16, -26, -34, -32, -18, -6, 0]
A_THL = [0, -10, -10, 4, -10, -22, -34, -36, -22, -8, -2]
A_SHL = [0, -22, -16, -12, -10, -16, -30, -32, -18, -6, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(wield(W_A[f], W_F[f], W_W[f], lean=t), {
        "torso": {"r": t}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
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
    arc = {"kind": "arc", "joint": "rhom", "inner": MID, "outer": TIP, "color": B.BRONZE_HI,
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
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
