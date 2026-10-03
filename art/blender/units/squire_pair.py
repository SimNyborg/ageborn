"""Squires: Medieval Age common infantry pair (CONTENT_PLAN 5.3, X0 M1 squad). Practice sword, ~64 lu.

One card trains two squires; this sheet is one squire (the game plays the two desynchronised).

Look (A11, PLAN.md): an eager young squire with big bright eyes, freckles and a mop of hair
poking out under a round steel pot helmet that is a size too big (it wobbles on its own joint),
a quilted team gambeson with team sleeves, a parchment belt cord, grey-brown hose and scuffed
boots. He holds a wooden practice sword (pale wood, a leather grip, a dark crossguard) in the
near hand and a small round team buckler with a wooden rim and an iron boss in the far hand.
No moustache, no tabard and no kite shield: he reads smaller and greener than the Footman.

"A viewer expects him to lunge and jab like a fencing pupil, and to jog along eagerly."

Animation (ANIM_SPEC G1, appendix B for a sword: lunge thrust, overhead chop, rising slash):
  idle      bounces on his toes, twirls the practice sword, the pot helmet wobbles, blink
  walk      walk v3 bounce jog at ground speed (card 80 x 1.25 = 100 lu/s) with an extra hop on
            the UP frames: the sword sloped back on his shoulder, the buckler arm pumping
  attack    FENCING LUNGE-JAB: settles back on the rear leg with the sword drawn back at the hip
            pointing forward (the held extreme), then a long lunge, the arm fully extended
            (a thrust streak), the helmet slides forward; he recovers to the guard
  attack_b  OVERHEAD CHOP: rises on his toes with the sword straight up over his head, then
            chops down in front (an arc smear)
  attack_c  RISING SLASH: crouches low with the sword trailing behind his knee, then whips a
            rising diagonal cut up to the front, ending on his toes
  hit       light: the head snaps back, the helmet clanks down over his eyes
  die       D1 fling and spin: the pot helmet flies off, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "squire_pair"
GAIT_NAME = "biped"
NAME = "Squires"
HEIGHT_LU = 64
CANVAS = (280, 232)
FEET = (104, 206)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30)}
NO_RETIME = True

SKIN = "#EBC4A0"
FRECKLE = "#C99A7C"
HAIR = "#7B6150"
STEEL = "#A7B0BB"
STEEL_DK = "#5E6670"
HOSE = "#6E6A5E"
BOOT = "#6B5647"
LEATHER = "#5E4A3C"
WOOD = "#C8AE86"
WOOD_DK = "#8A7158"
PARCH = "#E8DFC8"
IRON = "#7C8590"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (practice sword)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand (buckler)
BLADE = 30.0
HELM_C = (1.0, 0.0, 56.0)             # pot helmet pivot (it wobbles and pops off)
SWORD_TIP = (HR[0], HR[1], HR[2] + 5.0 + BLADE)
SWORD_IN = (HR[0], HR[1], HR[2] + 5.0 + BLADE * 0.4)


def _helm(rig, joint):
    """Round pot helmet, a size too big: a steel bowl with a rolled rim and a rivet band."""
    g = Geo().blob((1.0, 0.0, 55.6), (13.2, 13.0, 11.6), p=2.1)
    g.clip((0, 0, 52.6), (0, 0, -1))
    rig.part(joint, g, STEEL, finish="metal")
    g = Geo().lathe([(12.6, -1.0), (13.8, -0.4), (13.8, 0.6), (12.6, 1.2)], (1.2, 0.0, 53.0), segs=28)
    rig.part(joint, g, STEEL_DK, finish="metal", outline=0.6)
    g = Geo()
    for a in (-160, -125, -90, -55, -20):
        r = math.radians(a)
        g.sphere((1.2 + 13.3 * math.cos(r), 13.1 * math.sin(r), 55.0), 1.1, cuts=2)
    rig.part(joint, g, IRON, finish="metal", outline=0)
    g = Geo().capsule((1.0, 0.0, 66.4), (1.0, 0.0, 68.0), 1.8)   # a little knob on top
    rig.part(joint, g, STEEL_DK, finish="metal", outline=0.6)


def _sword(rig, joint, base):
    hx, hy, hz = base
    g = Geo().lathe([(0, -4.6), (1.9, -4.3), (2.1, -0.8), (1.8, 3.4), (0, 3.8)], (hx, hy, hz), segs=12)
    rig.part(joint, g, LEATHER)
    g = Geo().sphere((hx, hy, hz - 5.4), 2.2, cuts=3)
    g.blob((hx, hy, hz + 4.2), (1.8, 6.6, 1.6), p=2.8)
    rig.part(joint, g, WOOD_DK, outline=0.8)
    g = Geo().lathe([(0, 0), (3.2, 0.2), (3.3, BLADE * 0.7), (2.4, BLADE - 4), (0, BLADE)],
                    (hx, hy, hz + 5.0), squash=(1.0, 0.42), segs=12)
    rig.part(joint, g, WOOD)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    K.legs_v3(rig, HOSE, BOOT, cuff=LEATHER)
    rig.secondary("helm", "head", HELM_C, (1.0, 0.0, 68.0), max_deg=10, gain=1.3)

    # torso: a quilted team gambeson (team sleeves too), a parchment belt cord with a loose end
    g = Geo().blob((0, 0, 28.0), (10.6, 9.8, 11.8), p=2.2, taper=(1.1, 0.95))
    tface = F.Face(rig, "torso", [g])
    rig.part("torso", g, team=True)
    # quilting: two rows of stitched lines on the chest (parchment strokes)
    g2 = Geo()
    for z in (25.0, 31.0):
        c = tface.hit(6.0, z)
        tface.stroke(g2, c, [(-6.0, 0.0), (5.0, 0.4)], 1.0, 0.35)
    c = tface.hit(5.0, 28.0)
    tface.stroke(g2, c, [(0.0, -7.0), (0.3, 7.0)], 1.0, 0.35)
    rig.part("torso", g2, PARCH, highlight=False, outline=0)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.6, 0, 15.2), (11.6, 10.6, 4.6), p=2.7, taper=(1.12, 1.0))
    rig.part("hem", g, team=True)
    g = Geo().lathe([(11.0, -1.0), (11.8, 0.0), (11.0, 1.0)], (0.5, 0, 20.6), segs=24, squash=(1.0, 0.92))
    g.capsule((10.6, -4.0, 20.2), (11.4, -5.0, 13.0), 0.9)
    g.sphere((11.4, -5.0, 13.0), 1.4, cuts=2)
    rig.part("torso", g, PARCH, outline=0.6)
    # a padded collar
    g = Geo().blob((0.4, 0, 36.6), (9.6, 10.4, 3.4), p=2.4)
    rig.part("torso", g, team=True)

    # head: round young face, freckles, a mop of hair under the helmet; no moustache
    head = Geo().blob((2, 0, 47.6), (11.2, 10.6, 11.0), p=2.3)
    head.blob((13.0, -0.6, 45.4), (2.8, 2.6, 2.6), p=2.0)  # small nose
    hair = Geo().blob((-6.0, 0, 46.0), (5.4, 9.4, 6.4), p=2.2)
    hair.blob((1.0, 0, 54.0), (11.4, 11.0, 5.4), p=2.2)
    fc = K.face2(rig, [head, hair], SKIN, cx=11.6, cz=48.4, eye_dy=(-4.4, 4.2), eye_r=(4.1, 3.8, 4.8),
                 pupil_r=(1.6, 2.5, 2.8), brow=HAIR, brow_angry=False, brow_w=0.8, mouth_dz=-6.6,
                 mouth_x=12.2, eye_at=(13.4, 48.6), mark_r=4.3, mouth_shape="smile", mouth_w=5.0)
    rig.part("head", head, SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    g = Geo()   # freckles on the near cheek
    for dx, dz in ((0.0, 0.0), (1.8, 0.8), (0.6, -1.6), (2.4, -1.0)):
        c = fc.hit(11.0 + dx, 43.4 + dz)
        fc.decal(g, c, F.ellipse(0, 0, 0.55, 0.55, 8), 0.3)
    rig.part("head", g, FRECKLE, highlight=False, outline=0)
    g = Geo()   # fringe tufts under the helmet brim
    for x, y in ((8.0, -6.0), (4.0, -9.0), (-1.0, -10.4)):
        g.lathe([(2.0, 0), (0, 3.4)], (x, y, 53.0), (x + 1.2, y - 0.6, 49.6), segs=8)
    rig.part("head", g, HAIR, finish="hair", outline=0.6)
    _helm(rig, "helm")
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    _helm(rig, "helm_loose")

    # arms: team sleeves, leather gloves
    for s in ("r", "l"):
        B.arm_parts(rig, s, None, hand=LEATHER, team_sleeve=True, r0=4.4, r1=3.9, glove_finish="matte",
                    cuff=PARCH)
    _sword(rig, "hand_r", HR)
    rig.track("swordTip", "hand_r", SWORD_TIP)

    # small round buckler on the far hand: team face, wooden rim, iron boss (modelled facing the camera)
    bx, by, bz = HL[0] + 2.0, HL[1] - 4.0, HL[2] + 1.0
    g = Geo().lathe([(0, -1.2), (7.4, -1.0), (8.0, 0.0), (7.4, 1.0), (0, 1.2)], (bx, by, bz),
                    (bx, by - 1.0, bz), segs=24)
    rig.part("hand_l", g, WOOD_DK)
    g = Geo().lathe([(0, -0.6), (6.3, -0.6), (6.3, 0.6), (0, 0.8)], (bx, by - 0.6, bz), (bx, by - 1.6, bz), segs=24)
    rig.part("hand_l", g, team=True, outline=0.6)
    g = Geo().blob((bx, by - 1.8, bz), (2.6, 1.6, 2.6), p=2.2)
    rig.part("hand_l", g, IRON, finish="metal", outline=0.7)


# -- poses ---------------------------------------------------------------------------------
def sword(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


def buckler(a, f):
    return B.arm("l", a, f)


STANCE = merge(sword(-40, 8, 34), buckler(-72, -28), {"torso": {"r": -2}})


def _idle(f):
    # eager: bounces on his toes (the hips twice per loop), twirls the sword tip, the helmet wobbles
    bounce = [0.0, 0.8, 0.2, 1.0, 0.0, 0.8, 0.2, 0.6][f]
    tw = math.sin(2 * math.pi * f / 8)

    def extra(ctx):
        return merge(sword(-40 + 6 * tw, 8 + 10 * tw, 34 + 24 * tw), {
            "hips": {"z": 1.2 * bounce}, "foot_r": {"r": -8 * bounce}, "foot_l": {"r": -8 * bounce},
            "helm": {"r": 4 * math.sin(2 * math.pi * (f - 1) / 8)},
            "arm_l": {"r": 3 * ctx["lag"]}, "head": {"r": -2 * bounce}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r")}
    return M.idle_v2(f, base, extra=extra, face_blink=F.expr("blink"), blink=5)


# -- walk v3: G1 bounce jog at ground speed (card 80 x 1.25 = 100 lu/s), 8 x 72 ms, an eager hop --
SPEED = 100.0
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=576, stance=0.36, lift=7.0)
HOP_BOB = [-3.4, -4.2, -0.2, 3.4]
CARRY = merge(sword(-40, 66, 150), {"torso": {"r": -3}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge({"hand_r": {"r": -6 * lag}, "arm_r": {"r": 3 * lag}, "fore_r": {"r": -3 * lag},
                      "helm": {"r": 6 * lag}, "hem": {"r": 4 * lag}})
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, bob=HOP_BOB, lean=-9.0, twist=7.0, nod=3.5,
                     arms={"l": K.ArmChain("l")}, arm=34.0, elbow=(50.0, 80.0), extra=extra, report=report)


# -- attack A: fencing lunge-jab (11 unique frames, moves.SMALL_MELEE_MS) --------------------------
#        read  dip  coil  HOLD smear lead  IMP  over recoil settle settle
S_A = [-40, -50, -90, -148, -70, -20, 0, 4, -12, -28, -38]
S_F = [8, -6, -20, -6, 0, 0, 0, 2, 2, 6, 8]
S_W = [34, 20, 6, 2, 0, 0, 0, 2, 10, 24, 32]
BL_A = [-72, -60, -40, -30, -60, -80, -100, -98, -80, -70, -72]
BL_F = [-28, -10, 10, 20, -20, -40, -60, -56, -40, -24, -28]
T_R = [-2, 2, 6, 9, -4, -10, -16, -14, -8, -4, -2]
T_Z = [0, 8, 18, 28, 6, -6, -12, -10, -6, -2, 0]
B_X = [0.0, -1.0, -3.0, -4.5, 2.0, 7.0, 11.0, 11.5, 8.0, 3.0, 0.5]
B_Z = [0.0, -1.5, -2.5, -3.0, -1.5, -2.5, -4.0, -3.4, -2.5, -1.0, 0.0]
B_Q = [-0.02, -0.08, -0.04, 0.02, 0.08, 0.04, -0.14, 0.04, -0.05, 0.02, 0.0]
TH_R = [0, 4, 8, 10, 22, 34, 46, 44, 32, 12, 2]
SH_R = [0, -4, -6, -6, -16, -28, -38, -34, -26, -8, 0]
TH_L = [0, -4, -8, -10, -18, -26, -34, -32, -24, -8, -2]
SH_L = [0, -12, -20, -26, -10, -4, -2, -4, -8, -6, 0]
HEAD = [0, 2, 2, 0, -2, -4, -6, -4, -3, -1, 0]
HELM = [0, 2, 4, 6, -2, -6, -10, -6, 2, 3, 0]


def _attack_pose(f):
    pose = merge(sword(S_A[f], S_F[f], S_W[f]), buckler(BL_A[f], BL_F[f]), {
        "torso": {"r": T_R[f], "rz": T_Z[f]},
        "head": {"r": HEAD[f], "rz": -0.6 * T_Z[f]},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
        "helm": {"r": HELM[f]},
    }, M.body_about((0, 0, 22), x=B_X[f], z=B_Z[f], q=B_Q[f]))
    if f in (4, 5, 6):
        pose["hand_r"]["sz"] = 1.15
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.6}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -0.9}})
    return pose


STAB = {"kind": "streak", "joint": "hand_r", "point": SWORD_TIP, "color": "#F1E4C8", "width_lu": 6.0,
        "white": 0.4}


def _attack_clip():
    ov = {
        3: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 4.0, "puffs": 2, "seed": 41, "dir": -1.0}],
        4: [dict(STAB, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(STAB, **{"from": 4, "t0": 0.2, "t1": 1.0, "width_lu": 5.0})],
        6: [dict(STAB, **{"from": 5, "t0": 0.4, "t1": 1.0, "width_lu": 4.0}),
            {"kind": "burst", "joint": "hand_r", "point": SWORD_TIP, "r0_lu": 4.0, "r1_lu": 9.0,
             "n": 5, "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 42, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: overhead chop ------------------------------------------------------------------------
# 0-1 = A read and dip, 2 rise, 3 HOLD (on his toes, the sword straight up over the helmet), 4 smear
# (over the top), 5 lead-in, 6 IMPACT (chopped down in front, squash), 7 overshoot, 8 recoil, 9-10 = A
#        rise HOLD smear lead IMP  over recoil
OB_A = [60, 100, 64, 24, -6, -12, -16]
OB_F = [100, 124, 50, 6, -28, -42, -22]
OB_W = [118, 138, 48, 4, -30, -40, -14]
OB_BL = [(-40, 10), (-30, 20), (-50, -10), (-60, -20), (-64, -24), (-62, -22), (-58, -14)]
OB_T = [4, 10, -4, -10, -18, -20, -12]
OB_X = [-1.0, -2.0, 2.0, 5.0, 7.0, 7.5, 5.0]
OB_Z = [1.0, 2.6, 2.0, 0.5, -2.8, -2.2, -1.0]
OB_Q = [0.04, 0.10, 0.08, 0.02, -0.16, 0.03, -0.05]
OB_THR = [-2, -6, 14, 20, 26, 24, 16]
OB_SHR = [-6, -14, -16, -18, -22, -18, -10]
OB_THL = [6, 10, -8, -16, -22, -20, -14]
OB_SHL = [-8, -14, -8, -6, -8, -6, -4]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    pose = merge(sword(OB_A[k], OB_F[k], OB_W[k]), buckler(*OB_BL[k]), {
        "torso": {"r": OB_T[k]}, "head": {"r": -0.5 * OB_T[k]},
        "thigh_r": {"r": OB_THR[k]}, "shin_r": {"r": OB_SHR[k]},
        "thigh_l": {"r": OB_THL[k]}, "shin_l": {"r": OB_SHL[k]},
        "helm": {"r": [-4, -8, 4, 8, 10, 4, 0][k]},
    }, M.body_about((0, 0, 22), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k == 1:
        pose = merge(pose, {"foot_r": {"r": -16}, "foot_l": {"r": -18}})
    if k in (2, 3):
        pose["hand_r"]["sz"] = 1.15
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    else:
        pose = merge(pose, F.expr("grit"))
    return pose


CHOP = {"kind": "arc", "joint": "hand_r", "inner": SWORD_IN, "outer": SWORD_TIP, "color": "#F1E4C8",
        "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}


def _attack_b():
    ov = {
        4: [dict(CHOP, **{"from": 3})],
        5: [dict(CHOP, **{"from": 3})],
        6: [dict(CHOP, t0=0.4, t1=1.0, lines=2, **{"from": 5}),
            {"kind": "burst", "joint": "hand_r", "point": SWORD_TIP, "r0_lu": 5.0, "r1_lu": 10.0,
             "n": 5, "a0": -120.0, "arc": 150.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 43, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: rising slash ---------------------------------------------------------------------------
# 0 = A read, 1 crouch, 2 deeper, 3 HOLD (crouched low, the sword trailing behind his knee), 4 smear
# (sweeping up), 5 lead-in, 6 IMPACT (a rising cut ending high in front, up on his toes), 7 overshoot,
# 8 recoil, 9-10 = A settle
#        crouch deeper HOLD smear lead  IMP  over recoil
OC_A = [-70, -110, -140, -80, -10, 36, 48, 10]
OC_F = [-60, -110, -150, -50, 20, 64, 76, 40]
OC_W = [-40, -120, -165, -40, 40, 80, 92, 50]
OC_BL = [(-40, 0), (-30, 10), (-24, 16), (-50, -10), (-70, -30), (-90, -50), (-92, -54), (-70, -30)]
OC_T = [-4, -10, -14, -8, 0, 6, 8, 2]
OC_TZ = [6, 14, 22, 8, -6, -16, -18, -8]
OC_X = [0.0, -1.0, -1.5, 2.0, 5.0, 8.0, 8.5, 5.0]
OC_Z = [-2.5, -5.0, -6.5, -4.0, -1.0, 1.5, 1.0, -0.5]
OC_Q = [-0.06, -0.10, -0.08, 0.06, 0.08, -0.12, 0.04, -0.03]
OC_THR = [10, 22, 30, 28, 24, 18, 16, 10]
OC_SHR = [-16, -34, -46, -34, -20, -10, -8, -6]
OC_THL = [-6, -14, -20, -22, -20, -16, -14, -8]
OC_SHL = [-14, -26, -36, -22, -10, -4, -4, -4]


def _c_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    pose = merge(sword(OC_A[k], OC_F[k], OC_W[k]), buckler(*OC_BL[k]), {
        "torso": {"r": OC_T[k], "rz": OC_TZ[k]}, "head": {"r": -0.4 * OC_T[k], "rz": -0.5 * OC_TZ[k]},
        "thigh_r": {"r": OC_THR[k]}, "shin_r": {"r": OC_SHR[k]},
        "thigh_l": {"r": OC_THL[k]}, "shin_l": {"r": OC_SHL[k]},
        "helm": {"r": [2, 4, 6, 0, -6, -10, -6, 0][k]},
    }, M.body_about((0, 0, 22), x=OC_X[k], z=OC_Z[k], q=OC_Q[k]))
    if k == 5:
        pose = merge(pose, {"foot_r": {"r": -14}, "foot_l": {"r": -16}})
    if k in (3, 4):
        pose["hand_r"]["sz"] = 1.15
    if k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif k in (3, 4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


RISE = dict(CHOP, t0=0.0, t1=0.95, lines=3, samples=16)


def _attack_c():
    ov = {
        3: [{"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 44, "spread": 0.7}],
        4: [dict(RISE, **{"from": 3})],
        5: [dict(RISE, **{"from": 3})],
        6: [dict(RISE, t0=0.4, t1=1.0, lines=2, **{"from": 5}),
            {"kind": "burst", "joint": "hand_r", "point": SWORD_TIP, "r0_lu": 5.0, "r1_lu": 10.0,
             "n": 5, "a0": 20.0, "arc": 120.0}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 14 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 20 * max(a, 0)}, "shin_r": {"r": -24 * max(a, 0)},
                "arm_r": {"r": 18 * a}, "hand_r": {"r": 14 * a},
                "arm_l": {"r": 24 * a}, "fore_l": {"r": 16 * a},
                "helm": {"r": -8 * a, "z": -2.4 * max(a, 0)},
                "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("grit") if k == 2 else None)


# D1: the pot helmet pops off on the first spin and tumbles away (x, z offsets from its pivot, spin)
HAT = {1: (-6.0, 10.0, 40.0), 2: (-12.0, 18.0, 120.0), 3: (-20.0, 14.0, 220.0), 4: (-28.0, -2.0, 300.0),
       5: (-32.0, -40.0, 340.0), 6: (-34.0, -52.0, 355.0), 7: (-35.0, -54.0, 360.0),
       8: (-35.0, -54.0, 360.0), 9: (-35.0, -54.0, 360.0)}


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 20}, "hand_r": {"r": 40 * flail},
        "arm_l": {"r": 100 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if k in HAT:
        x, z, r = HAT[k]
        pose["helm"] = {"hide": True}
        pose["helm_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
