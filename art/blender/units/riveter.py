"""Riveter: Industrial Age infantry (docs/design-lane-ages.md A17.10). Melee, blunt, ~68 lu.
Big Wrench: the first hit of each engagement deals x1.5.

Look (A17.12, Industrial palette): a burly factory hand in a team flat cap, a cream shirt with
rolled-up sleeves, team overalls (a bib with a cream cog emblem, braces with brass buttons, team
trousers), iron-grey cuffs and hobnail boots, a ginger walrus moustache and sideburns. A leather
tool belt carries a hammer that swings on its loop and a rivet pouch; a red rag dangles from his
back pocket. He hefts an oversized iron adjustable wrench (leather grip, copper adjusting screw,
bolt heads) up on his shoulder.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    taps the wrench on his shoulder on the beat, weight shift, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, 90 lu/s): the wrench up on his
          shoulder bobbing a frame late, the far fist pumping, planted feet, hammer and rag late
  attack  RISING GOLF SWING: he hitches the wrench off his shoulder, coils low with the wrench cocked back at hip height (the held extreme), then rips it
          under and UP through the target (two crescent smears) onto his toes with a CLANG (spark,
          impact lines, yell); the wrench overshoots over his head and settles back on the shoulder
  attack_b  OVERHEAD WRENCH SLAM: up on his toes with the wrench straight up over his head and
          tipped back (the held extreme), then slams it down in front onto the target (ground dust)
  attack_c  WRENCH JAB WITH A TWIST: crouched and twisted away with the wrench drawn back level at
          his chest, jaw forward (the held extreme), then a straight lunging jab and a ratchet
          twist of the wrist (a turning ring at the jaw)
  hit     light: the head snaps back, the cap lifts, eyes squeezed, then an overshoot forward
  die     D1 fling and spin: the cap pops off and the wrench flies out of his hand; he lands on
          his back with X eyes and his tongue out
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "riveter"
GAIT_NAME = "biped"
NAME = "Riveter"
HEIGHT_LU = 68
CANVAS = (296, 272)
FEET = (128, 244)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
LENGTH = 32.0
JAW = 15.0
CAP_C = (1.0, 0.0, 57.8)
RAG = "#9A5A4E"     # faded red rag (muted, under the colour rule)
JAW_C = (FIST[0], FIST[1], FIST[2] + LENGTH + JAW * 0.35)


def _wrench(rig, joint, fist):
    jaw = I.wrench(rig, joint, fist, length=LENGTH, jaw=JAW)
    cx, cy, cz = fist
    # bolt heads along the shank and a notch row on the jaw (they read as a heavy tool at 1x)
    g = Geo()
    for z in (cz + 10.0, cz + 20.0):
        g.blob((cx, cy - 2.2, z), (1.6, 0.9, 1.6), p=3.0)
    rig.part(joint, g, I.IRON_DK, finish="metal", outline=0.3)
    return jaw


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, team=True, cuff=I.IRON)
    I.overalls(rig, hem_z=13.0)
    # cog emblem on the bib, a tool belt with a rivet pouch, a hammer and a rag on secondaries
    bib = Geo().blob((6.4, 0, 30.0), (4.9, 7.9, 6.5), p=3.2)
    bface = F.Face(rig, "torso", [bib])
    g = KI.cog(bface, Geo(), (10.8, 27.4), s=0.95)
    rig.part("torso", g, KI.CREAM, highlight=False, outline=0)
    g = Geo().blob((0.4, 0, 17.6), (11.8, 10.9, 1.9), p=3.2)
    rig.part("hips", g, I.LEATHER)
    g = Geo().blob((11.8, -3.0, 17.6), (1.0, 2.2, 1.8), p=3.2)
    rig.part("hips", g, I.BRASS_LT, finish="metal", outline=0.4)
    g = Geo().blob((4.0, -11.6, 14.8), (3.2, 2.0, 3.4), p=2.6)          # rivet pouch
    rig.part("hips", g, I.LEATHER_DK, outline=0.6)
    g = Geo()
    for dx in (2.8, 4.6):
        g.sphere((dx, -13.4, 17.0), 0.9, cuts=2)
    rig.part("hips", g, I.IRON_LT, finish="metal", outline=0)
    rig.secondary("hammer", "hips", (-4.0, -11.4, 17.0), (-4.5, -11.8, 12.0), max_deg=26, gain=1.4)
    g = Geo().capsule((-4.0, -12.2, 16.6), (-4.4, -12.2, 12.4), 1.1)
    rig.part("hammer", g, I.WOOD_LT, outline=0.5)
    g = Geo().blob((-4.4, -12.4, 12.0), (3.6, 1.6, 1.6), p=3.0)
    rig.part("hammer", g, I.IRON_DK, finish="metal", outline=0.6)
    rig.secondary("rag", "hips", (-10.6, -3.0, 18.0), (-12.5, -3.4, 11.0), max_deg=24, gain=1.5)
    g = Geo().blob((-11.2, -3.4, 14.6), (1.4, 3.0, 3.6), p=2.4, rot=(0, -10, 0))
    rig.part("rag", g, RAG, outline=0.5)

    cap = Geo()
    face = KI.head_face(rig, brow=I.GINGER, brow_angry=True, mouth_dz=-9.4, mouth_w=6.0)
    del cap
    I.moustache(rig, I.GINGER, curl=False, big=1.15)
    I.sideburns(rig, I.GINGER)
    I.back_hair(rig, I.GINGER)
    I.ear(rig)
    g = Geo()
    face.decal(g, face.hit(10.0, 44.0), F.ellipse(0, 0, 1.6, 1.0, 10), 0.4)   # soot smudge on the cheek
    rig.part("head", g, "#B89A86", highlight=False, outline=0)
    rig.joint("hat", "head", CAP_C)
    I.flat_cap(rig, c=CAP_C, team=True, joint="hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: I.flat_cap(rig, c=CAP_C, team=True, joint=j))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=I.CREAM, team_sleeve=False, rolled=True, fist=4.8)
        y = I.ARM_Y[s]
        g = Geo().blob((2.6, y - 1.5 * (1 if s == "r" else -1), I.HAND_Z + 0.6), (1.7, 1.6, 2.3), p=2.2)
        rig.part(f"hand_{s}", g, I.SKIN)                                     # thumb
    g = Geo().lathe([(4.6, 0), (4.8, 1.8), (4.5, 3.0)], (0, I.ARM_Y["r"], I.ELBOW_Z + 1.0),
                    (0, I.ARM_Y["r"], I.ELBOW_Z + 4.0), segs=16)
    rig.part("arm_r", g, I.CREAM_DK, outline=0.5)
    g = Geo().lathe([(4.1, 0), (4.3, 1.2), (4.1, 2.2)], (0, I.ARM_Y["r"], I.HAND_Z + 2.4),
                    (0, I.ARM_Y["r"], I.HAND_Z + 4.6), segs=14)
    rig.part("fore_r", g, I.LEATHER, outline=0.5)

    rig.joint("wrench", "hand_r", FIST)
    _wrench(rig, "wrench", FIST)
    KI.loose(rig, "wrench_loose", FIST, lambda j: _wrench(rig, j, FIST))
    rig.track("wrenchHead", "wrench", JAW_C)
    I.fuse_spark(rig, "wrench", (FIST[0] + 5.0, FIST[1] - 3.0, FIST[2] + LENGTH + JAW * 0.9), size=1.9,
                 name="clang", hidden=True)


# -- poses ---------------------------------------------------------------------------------
def grip(a, f, w, la=-80.0, lf=-50.0, lean=0.0):
    """World angles: near arm (a, f) with the wrench pointing w; far arm (la, lf)."""
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean))


REST = (-60.0, 18.0, 144.0)     # wrench up on the shoulder
STANCE = merge(grip(*REST, -76.0, -42.0, lean=-3.0), {"torso": {"r": -3.0}})


def _idle(f):
    # the wrench lifts off the shoulder and taps back down on the beat (3), a small second tap (5)
    lift = [0.0, 0.6, 1.0, -0.5, 0.2, -0.25][f]

    def extra(ctx):
        a, fo, w = REST
        return merge(grip(a + 6 * lift, fo + 9 * lift, w - 8 * lift, -76 + 3 * ctx["c"], -42 + 4 * ctx["lag"],
                          lean=-3.0),
                     {"body": squash(-0.03 * max(0.0, -lift)), "hips": {"z": 1.0 * min(0.0, lift)},
                      "brow": {"z": 0.4 * max(0.0, lift)}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r", "arm_l", "fore_l", "hand_l")}
    return M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G1 bounce jog at ground speed (card 72 x 1.25 = 90 lu/s), 8 x 75 ms ----------------
SPEED = 90.0
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=600)
# walk carry: the wrench up on the shoulder (it bobs a frame late), the far fist pumps
CARRY = merge(grip(-62.0, 22.0, 136.0, lean=-7.0), {"torso": {"r": -3.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -8 * lag}, "arm_r": {"r": 4 * lag}, "fore_r": {"r": -3 * lag},
                "brow": {"z": 0.3 * lag}, "hammer": {"r": 6 * lag}, "rag": {"r": 6 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-7.0, twist=7.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=36.0, extra=extra, report=report)


# 11 unique frames, moves.SMALL_MELEE_MS (impact on 6 at 290 of 680 ms). World angles.
#        read hitch coil HOLD smear smear IMP  over recoil settle settle
A_A = [-60, -50, -110, -128, -95, -50, -8, 30, 5, -30, -55]
A_F = [18, 34, -150, -168, -70, -8, 28, 72, 55, 30, 20]
A_W = [144, 124, 190, 168, 328, 372, 402, 460, 470, 488, 502]
A_T = [-3, -6, -8, -12, -20, -18, -8, 2, -2, -4, -3]
A_Q = [0.0, 0.02, -0.08, -0.12, 0.04, 0.08, 0.10, 0.04, -0.06, 0.0, 0.0]
A_X = [0.0, 0.5, -1.5, -3.0, 2.0, 5.0, 7.0, 6.5, 5.0, 2.5, 0.5]
A_Z = [0.0, 0.0, -3.0, -4.5, -2.5, 0.5, 2.5, 1.0, -1.0, -0.5, 0.0]
A_RZ = [0, 0, -14, -24, -6, 8, 14, 10, 6, 2, 0]
A_RX = [0, 0, -25, -40, -58, -45, -18, 0, 0, 0, 0]   # swing plane tilted toward the camera
A_HEAD = [0, 0, 4, 6, 2, -4, -8, -4, -2, 0, 0]
A_TH_R = [2, 4, 16, 20, 24, 26, 20, 16, 14, 8, 2]
A_SH_R = [0, 0, -18, -26, -20, -12, -4, 0, -6, -2, 0]
A_TH_L = [-2, -4, -14, -18, -24, -28, -30, -24, -18, -10, -4]
A_SH_L = [0, 0, -20, -26, -18, -10, -2, 0, -6, -2, 0]
A_LA = [-76, -70, -30, -20, -60, -110, -140, -120, -100, -86, -78]
A_LF = [-42, -30, 0, 10, -30, -120, -160, -130, -100, -70, -48]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(grip(A_A[f], A_F[f], A_W[f], A_LA[f], A_LF[f], lean=t), {
        "torso": {"r": t, "rz": A_RZ[f]},
        "head": {"r": A_HEAD[f] - 0.4 * t, "rz": -0.5 * A_RZ[f]},
        "thigh_r": {"r": A_TH_R[f]}, "shin_r": {"r": A_SH_R[f]},
        "thigh_l": {"r": A_TH_L[f]}, "shin_l": {"r": A_SH_L[f]},
        "clang": {"show": f == 6},
        "arm_r": {"rx": A_RX[f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (6, 7):   # up on the toes
        pose = merge(pose, {"shin_r": {"r": -10}, "shin_l": {"r": -16}})
    if f in (4, 5):
        pose["wrench"] = {"sz": 1.18}
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -14, "l": -18} if f in (6, 7) else None)


SWING = {"kind": "arc", "joint": "wrench", "inner": (FIST[0], FIST[1], FIST[2] + LENGTH * 0.55),
         "outer": (FIST[0], FIST[1], FIST[2] + LENGTH + JAW * 0.75), "color": I.IRON_LT, "white": 0.35,
         "taper": 0.15, "lines": 3}


def _attack_clip():
    ov = {
        4: [dict(SWING, **{"from": 3, "t0": 0.0, "t1": 0.95}),
            {"kind": "dust", "joint": "wrench", "point": JAW_C, "ground_snap": True, "size_lu": 7.0,
             "puffs": 4, "seed": 33, "spread": 1.2, "dir": -1.0}],
        5: [dict(SWING, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(SWING, **{"from": 5, "t0": 0.0, "t1": 1.0, "lines": 2}),
            {"kind": "burst", "joint": "wrench", "point": JAW_C, "r0_lu": 9.0, "r1_lu": 16.0, "n": 6,
             "a0": -20.0, "arc": 160.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 31, "spread": 0.8},
            {"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 32, "spread": 0.7,
             "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: overhead wrench slam (ANIM_SPEC appendix B) ---------------------------------------
# unique frames: 0 = A read, 1 = A hitch, 2 rise, 3 HOLD (up on his toes, the wrench straight up over
# his head and tipped back), 4 smear (over the top), 5 smear, 6 IMPACT (slammed down in front, deep
# squash), 7 bounce, 8 recoil, 9 = A settle, 10 = A settle. World angles.
#        rise HOLD smear smear IMP  bounce recoil
B_A = [40, 96, 70, 20, -18, -24, -40]
B_F = [96, 122, 50, 0, -30, -36, -10]
B_W = [128, 148, 70, 0, -24, -30, 14]
B_LA = [30, 88, 64, 14, -34, -40, -70]
B_LF = [90, 118, 44, -6, -50, -56, -30]
B_T = [4, 10, -6, -14, -22, -20, -10]
B_X = [-1.0, -2.0, 1.5, 4.5, 7.0, 7.0, 4.0]
B_Z = [1.0, 2.6, 2.0, 0.0, -4.4, -2.6, -1.4]
B_Q = [0.04, 0.10, 0.08, 0.02, -0.16, 0.04, -0.05]
B_THR = [-2, -6, 12, 20, 30, 26, 14]
B_SHR = [-6, -12, -14, -18, -34, -26, -10]
B_THL = [6, 10, -8, -16, -26, -24, -12]
B_SHL = [-8, -12, -8, -8, -22, -16, -6]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(grip(B_A[k], B_F[k], B_W[k], B_LA[k], B_LF[k], lean=t), {
        "torso": {"r": t, "rz": -6 if k < 2 else 4},
        "head": {"r": -0.5 * t},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "clang": {"show": k == 4},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    if k == 1:   # up on his toes
        pose = merge(pose, {"foot_r": {"r": -18}, "foot_l": {"r": -20}})
    if k in (2, 3):
        pose["wrench"] = {"sz": 1.18}
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -18, "l": -20} if k == 1 else None)


SLAM = dict(SWING, t0=0.0, t1=0.95, lines=3)


def _attack_b():
    ov = {
        4: [dict(SLAM, **{"from": 3})],
        5: [dict(SLAM, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(SLAM, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2}),
            {"kind": "burst", "joint": "wrench", "point": JAW_C, "r0_lu": 8.0, "r1_lu": 15.0, "n": 6,
             "a0": 10.0, "arc": 160.0},
            {"kind": "dust", "joint": "wrench", "point": JAW_C, "ground_snap": True, "size_lu": 8.0,
             "puffs": 5, "seed": 35, "spread": 1.4},
            {"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 36, "spread": 0.7,
             "dir": -1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: wrench jab with a twist ----------------------------------------------------------
# steps: A read 30, tuck 40, draw 70, HOLD 105 (crouched and twisted away, the wrench drawn back
# level at his chest with the jaw forward), smear 25, lead 20 | IMPACT (straight lunging jab) 120,
# twist 60 (the wrist cranks the jaw round), recoil 50, A settle 70, A settle 90
C_MS = [30, 40, 70, 105, 25, 20, 120, 60, 50, 70, 90]
#        tuck draw HOLD smear lead IMP  twist recoil
C_A = [-74, -130, -168, -92, -40, -10, -6, -34]
C_F = [6, -10, -22, -6, -2, -4, 4, 24]
C_W = [44, 14, 14, 0, 0, -2, 26, 70]
C_LA = [-60, -40, -30, -60, -100, -120, -116, -96]
C_LF = [-20, 10, 20, -10, -70, -100, -96, -70]
C_T = [-6, -2, 4, -8, -14, -18, -16, -10]
C_TZ = [8, 22, 32, 12, -4, -16, -18, -8]
C_X = [0.5, -1.5, -3.0, 2.0, 6.0, 10.0, 10.5, 7.0]
C_Z = [-1.0, -2.6, -4.0, -3.4, -3.0, -3.6, -3.0, -1.6]
C_Q = [-0.04, -0.08, -0.10, 0.06, 0.04, -0.12, 0.03, -0.04]
C_THR = [6, 14, 22, 26, 30, 36, 34, 22]
C_SHR = [-8, -24, -36, -30, -26, -28, -24, -14]
C_THL = [-6, -14, -22, -26, -32, -38, -34, -20]
C_SHL = [-6, -14, -20, -12, -6, -4, -4, -4]


def _c_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    t = C_T[k]
    pose = merge(grip(C_A[k], C_F[k], C_W[k], C_LA[k], C_LF[k], lean=t), {
        "torso": {"r": t, "rz": C_TZ[k]},
        "head": {"r": -0.3 * t, "rz": -0.5 * C_TZ[k]},
        "thigh_r": {"r": C_THR[k]}, "shin_r": {"r": C_SHR[k]},
        "thigh_l": {"r": C_THL[k]}, "shin_l": {"r": C_SHL[k]},
        "clang": {"show": k == 5},
    }, M.body_about((0, 0, 22), x=C_X[k], z=C_Z[k], q=C_Q[k]))
    if k in (3, 4):
        pose["wrench"] = {"sz": 1.15}
    if k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (3, 4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS)


JAB = {"kind": "streak", "joint": "wrench", "point": JAW_C, "color": I.IRON_LT, "width_lu": 8.0, "white": 0.35}


def _attack_c():
    ov = {
        4: [dict(JAB, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(JAB, **{"from": 3, "t0": 0.2, "t1": 1.0, "width_lu": 7.0})],
        6: [dict(JAB, **{"from": 4, "t0": 0.4, "t1": 1.0, "width_lu": 6.0}),
            {"kind": "burst", "joint": "wrench", "point": JAW_C, "r0_lu": 6.0, "r1_lu": 13.0, "n": 6,
             "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 37, "spread": 0.8}],
        7: [{"kind": "rings", "joint": "wrench", "point": JAW_C, "radii_lu": (6.0, 9.0), "a0": -60.0, "a1": 200.0,
             "color": "#FFF4D6"}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], C_MS, impact=6, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 14 * a}, "hand_r": {"r": 12 * a},
                "arm_l": {"r": 40 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


# the wrench leaves his hand on step 1 and tumbles up and away (x, z, spin from its rest pivot)
WRENCH_PATH = [None, (8, 22, 60), (12, 40, 170), (16, 44, 300), (20, 34, 420), (23, 16, 520),
               (25, 2, 590), (26, -4, 612), (26, -4, 612), (26, -4, 612)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = KI.HAT_POP[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    wp = WRENCH_PATH[k]
    if wp is not None:
        x, z, r = wp
        pose["wrench"] = {"hide": True}
        pose["wrench_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
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
