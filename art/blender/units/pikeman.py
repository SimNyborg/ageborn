"""Pikeman: Medieval Age anti-armor (DESIGN A5.3). Pike, reach 70, Brace, ~72 lu.

Look (A11): a sturdy pikeman in a steel morion (upturned crescent brim, tall comb, gold
rim), a slate breastplate with a leather gorget over a team padded jack (cream lacing,
big puffed team sleeves), wine breeches and brown boots, and a long pike (A11: polearm =
reach) with a big steel leaf head, a gold collar, a cream tassel and a team pennon with a
parchment bear paw that streams in the wind. He stands braced, feet wide.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    braced; shifts his weight and regrips the shaft, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1): the pike sloped back over his
          shoulder, the free arm pumping, planted feet, the pennon and plume late
  attack_b  OVERHEAD DOWNWARD PUSH: both hands high over his head, the pike angled down (the
          held extreme), then a driving downward push
  attack_c  DOUBLE JAB, RISING: a quick low jab, a low guard with the tip near the ground (the
          held extreme), then a rising thrust
  attack  PLANT AND DRIVE: drops the pike level and sinks into a deep brace with both hands
          pulled back to the hip (the held extreme: a coiled spring behind a level pike),
          then an explosive two-handed drive straight forward (streak smear with ghost
          heads), the lunge fully extended on the impact, and the pike quivers after
  hit     armoured and braced (Brace: immune to knockback): barely moves, the morion
          clanks down, eyes squeezed
  die     D2 timber: lurches forward, then falls stiff onto his back like a felled tree,
          the pike going over with him, the morion rolling off
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "pikeman"
GAIT_NAME = "biped"
NAME = "Pikeman"
HEIGHT_LU = 72
CANVAS = (344, 250)
FEET = (130, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 33)}
NO_RETIME = True

SKIN = "#EBC4A0"
HAIR = "#3E2F26"
STEEL = "#A7B0BB"
SLATE = "#6B7682"
WINE = "#8E2A4A"
BOOT = "#4F433B"
LEATHER = "#6B5647"
WOOD = "#B89C78"
GOLD = "#D4A437"
PARCH = "#E8DFC8"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # rear (near) hand holds the pike
BUTT, TIP = -20.0, 74.0              # along the pike from the rear hand
PY = HR[1] - 1.5                     # pike depth: just in front of the near fist
SHOULDER = (0.0, B.SHOULDER_Z)
# the far hand sits ~24 lu deeper than the pike; the 18 degree view yaw shows it about this
# much further forward on screen, so its grip target is moved back by this amount
DEPTH_SHIFT = 24.0 * 0.31
MORION_C = (1.5, 0.0, 58.0)


def _morion(rig, joint):
    """Steel morion: round cap, crescent brim turned up front and back, tall comb, gold rim."""
    g = Geo().blob((1.5, 0, 56.0), (11.8, 11.4, 9.6), p=2.4)
    g.clip((0, 0, 55.0), (0, 0, -1))
    rig.part(joint, g, STEEL, finish="metal")
    g = Geo()
    g.blob((1.5, 0, 55.4), (13.8, 12.6, 1.5), p=2.6)
    g.blob((14.0, 0, 57.8), (6.2, 10.8, 1.5), p=2.4, rot=(0, -32, 0))   # front upturn
    g.blob((-11.0, 0, 57.8), (6.2, 10.8, 1.5), p=2.4, rot=(0, 32, 0))   # back upturn
    rig.part(joint, g, STEEL, finish="metal")
    pts = [(-8.0, 61.0), (-5.0, 67.5), (2.0, 70.0), (8.0, 66.5), (9.5, 61.0)]
    g = Geo().slab([(x + 1.0, z) for x, z in pts], 0.0, 2.8)
    rig.part(joint, g, STEEL, finish="metal")
    g = Geo().blob((1.5, 0, 55.0), (12.1, 11.7, 1.2), p=2.8)
    rig.part(joint, g, GOLD, finish="metal", outline=0.6)


def _plume(rig, joint):
    g = Geo()
    for x, z, r in ((-6.0, 65.0, 3.4), (-9.5, 67.0, 3.8), (-13.5, 66.2, 3.4), (-16.8, 63.6, 2.8),
                    (-18.6, 60.4, 2.2)):
        g.blob((x, 0, z), (r * 1.2, r * 0.8, r), p=2.1)
    rig.part(joint, g, team=True)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    K.legs_v3(rig, WINE, BOOT, cuff=LEATHER, thigh_r=5.0)

    # torso: team doublet, slate breastplate, belt; team breeches puff at the hips
    g = Geo().blob((0, 0, 27.5), (10.8, 9.8, 12.0), p=2.3, taper=(1.12, 0.92))
    rig.part("torso", g, team=True)
    g = Geo().blob((1.4, 0, 29.0), (10.6, 9.4, 8.8), p=2.6, taper=(0.96, 1.0))
    g.clip((0, 0, 21.5), (0, 0, -1))
    g.clip((0, 0, 36.8), (0, 0, 1))
    rig.part("torso", g, SLATE, finish="metal")
    g = Geo().capsule((10.2, -1.5, 34.0), (11.6, -1.5, 23.5), 1.0)  # breastplate ridge
    rig.part("torso", g, STEEL, finish="metal", outline=0.6)
    for side, dy in (("r", -1), ("l", 1)):   # breastplate rivets
        g = Geo()
        for z in (24.0, 28.0, 32.0):
            g.sphere((9.4, dy * 5.8, z), 1.1, cuts=2)
        rig.part("torso", g, STEEL, finish="metal", outline=0)
    g = Geo().blob((0.4, 0, 20.6), (11.6, 10.6, 1.9), p=3.2)
    rig.part("torso", g, LEATHER)
    g = Geo().blob((11.5, -2.2, 20.6), (1.3, 2.1, 2.1), p=3.0)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().blob((0.8, y * 1.1, 17.4), (6.6, 5.6, 5.4), p=2.2)
        rig.part(f"thigh_{s}", g, team=True)

    # head: big eyes, a short beard, the steel morion on its own joint (it rolls off in the death)
    head = Geo().blob((2, 0, 48.6), (11.4, 10.8, 11.2), p=2.3)
    head.blob((14.0, -0.6, 45.6), (3.2, 3.0, 3.1), p=2.0)
    hair = Geo().blob((7.0, 0, 40.4), (7.8, 9.2, 4.6), p=2.2)
    hair.blob((-5.5, 0, 46.0), (5.8, 9.8, 6.4), p=2.2)
    hair.blob((1.0, 0, 55.0), (11.6, 11.2, 5.5), p=2.2)
    K.face2(rig, [head, hair], SKIN, cx=12.0, cz=48.6, eye_r=(3.8, 3.5, 4.4), brow=HAIR,
            mouth_dz=-7.0, mouth_x=13.0, eye_at=(13.8, 48.8), mark_r=4.1)
    rig.part("head", head, SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    rig.joint("helm", "head", MORION_C)
    _morion(rig, "helm")
    rig.secondary("plume", "helm", (-6.0, 0, 64.2), (-17.0, 0, 61.2), max_deg=14, gain=1.2)
    _plume(rig, "plume")
    rig.joint("helm_loose", "root", MORION_C, hidden=True)
    _morion(rig, "helm_loose")
    _plume(rig, "helm_loose")
    # leather gorget (a collar under the chin)
    g = Geo().lathe([(8.2, 0), (9.6, 0.8), (9.6, 3.0), (8.4, 3.8)], (1.5, 0, 35.2), segs=22)
    rig.part("torso", g, LEATHER, outline=0.6)

    # arms: puffed team sleeves, slate forearms, leather gloves
    for s in ("r", "l"):
        y = B.ARM_Y[s]
        B.arm_parts(rig, s, SLATE, hand=LEATHER, cuff=LEATHER)
        g = Geo().blob((0.3, y * 1.02, 33.2), (6.4, 5.8, 6.6), p=2.2)
        rig.part(f"arm_{s}", g, team=True)

    # the pike on the rear hand, modelled along +X (rest direction 0): a big leaf head
    hx, hy, hz = HR
    g = Geo().lathe([(0, BUTT - 0.5), (1.9, BUTT), (1.7, 0), (1.5, TIP - 16), (0, TIP - 15)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=10)
    rig.part("hand_r", g, WOOD)
    g = Geo()
    for t in (-4.0, 3.0):   # grip wraps where the hands hold it
        g.lathe([(1.95, 0), (2.15, 0.5), (2.15, 2.4), (1.95, 2.9)], (hx + t, PY, hz), (hx + t + 1, PY, hz), segs=10)
    rig.part("hand_r", g, LEATHER, outline=0)
    g = Geo().lathe([(0, TIP - 21), (2.0, TIP - 20.5), (2.3, TIP - 17), (4.6, TIP - 11), (3.8, TIP - 5),
                     (0, TIP)], (hx, PY, hz), (hx + 1, PY, hz), segs=12, squash=(1.0, 0.45))
    rig.part("hand_r", g, STEEL, finish="metal")
    g = Geo().capsule((hx + TIP - 17.5, PY - 1.0, hz), (hx + TIP - 3.0, PY - 1.0, hz), 0.8)
    rig.part("hand_r", g, SLATE, finish="metal", outline=0, highlight=False)
    g = Geo().lathe([(0, TIP - 23), (2.8, TIP - 22.5), (2.8, TIP - 20.5), (0, TIP - 20)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=12)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.6)
    g = Geo().sphere((hx + BUTT, PY, hz), 2.3, cuts=3)
    rig.part("hand_r", g, SLATE, finish="metal", outline=0.8)
    # cream tassel hanging under the collar
    tx0 = hx + TIP - 22.0
    rig.secondary("tassel", "hand_r", (tx0, PY, hz - 1.0), (tx0 - 1.0, PY, hz - 8.0), max_deg=30,
                  gain=1.4, rot_gain=0.6)
    g = Geo().capsule((tx0, PY - 0.6, hz - 1.0), (tx0 - 0.5, PY - 0.6, hz - 4.5), 0.9)
    g.lathe([(0.6, 0), (2.0, 1.2), (2.2, 3.4), (0, 4.4)], (tx0 - 0.6, PY - 0.6, hz - 4.0),
            (tx0 - 1.0, PY - 0.6, hz - 8.6), segs=10)
    rig.part("tassel", g, PARCH, outline=0.6)
    # team pennon below the head, streaming back (follow-through), with a parchment paw
    px0 = hx + TIP - 25.0
    rig.secondary("pennon", "hand_r", (px0, PY, hz - 1.0), (px0 - 16, PY, hz - 5.0), max_deg=14,
                  gain=1.2, rot_gain=0.4)
    pts = [(0.0, 0.0), (-17.0, -1.0), (-12.5, -5.4), (-17.0, -9.8), (0.0, -10.4)]
    pen = Geo().slab([(px0 + x, hz - 0.8 + z) for x, z in pts], PY, 1.2)
    pface = F.Face(rig, "pennon", [pen])
    rig.part("pennon", pen, team=True, outline=0.8)
    g = K.paw(pface, Geo(), K.scr(pface, (px0 - 6.0, PY - 0.7, hz - 6.2)), s=0.95)
    rig.part("pennon", g, PARCH, highlight=False, outline=0)
    rig.track("pikeTip", "hand_r", (hx + TIP, PY, hz))




# -- poses ---------------------------------------------------------------------------------
def _dir(deg):
    return math.cos(math.radians(deg)), math.sin(math.radians(deg))


def pike(a, f, w, grip=24.0):
    """Rear hand (a, f), pike pointing w degrees; the far hand grips the pike as far forward
    as it can reach (at most `grip` lu ahead of the rear hand)."""
    hx, hz = B.fk_hand(SHOULDER, a, f)
    dx, dz = _dir(w)
    g = grip
    while g > 2.0:
        tx, tz = hx + dx * g - DEPTH_SHIFT, hz + dz * g
        if math.hypot(tx - SHOULDER[0], tz - SHOULDER[1]) < B.UPPER + B.LOWER - 1.2:
            break
        g -= 1.0
    la, lf = B.ik2(SHOULDER, (tx, tz))
    return merge(B.arm("r", a, f, w, w_rest=0.0), B.arm("l", la, lf))


def _pennon(pose, w):
    # the pennon hangs back from the pike; counter-rotate a little so it streams level
    pose.setdefault("pennon", {})["r"] = pose.get("pennon", {}).get("r", 0.0) - 0.6 * w
    pose.setdefault("tassel", {})["r"] = pose.get("tassel", {}).get("r", 0.0) - 0.9 * w
    return pose


BRACE = {"thigh_r": {"r": 12}, "shin_r": {"r": -6}, "thigh_l": {"r": -12}, "shin_l": {"r": -4},
         "hips": {"z": -1.0}}
STANCE_PIKE = (-80, -40, 58)
STANCE = merge(pike(*STANCE_PIKE), BRACE, {"torso": {"r": -3}})


def _idle(f):
    # braced breathing; he shifts his weight and regrips (the pike dips and lifts on 3-4)
    grip = [0.0, 0.0, 0.4, 1.0, 0.5, 0.0][f]

    def extra(ctx):
        return {"torso": {"r": 1.0 * grip}, "hand_r": {"r": 0.0}}
    w = STANCE_PIKE[2] - 5 * grip
    base = merge(pike(STANCE_PIKE[0] - 4 * grip, STANCE_PIKE[1] + 6 * grip, w), BRACE, {"torso": {"r": -3}})
    pose = M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=1)
    return _pennon(pose, w)


# -- walk v3: G1 bounce jog at ground speed (card 70 x 1.25 = 87.5 lu/s), 8 x 77 ms --------------
SPEED = 87.5
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED)
CARRY_PIKE = (-52, 28, 146)     # near hand at the chest, the pike sloped back over his shoulder


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = -math.cos(ctx["lag_p"])
        a, fo, w = CARRY_PIKE
        w = w + 4 * lag
        pose = merge(B.arm("r", a + 6 * c, fo + 4 * c, w, w_rest=0.0), {"plume": {"r": 5 * lag}})
        return _pennon(pose, w)
    return M.walk_v3(RIG, f, {"torso": {"r": -3}}, GAIT, legs=LEGS, lean=-8.0, twist=6.0, nod=3.0,
                     arms={"l": K.ArmChain("l")}, arm=32.0, elbow=(50.0, 80.0), extra=extra,
                     report=report)


# 11 unique frames, moves.SMALL_MELEE_MS
#        read  dip  wind HOLD smear smear IMP  quiv quiv settle settle
P_A = [-85, -115, -140, -152, -95, -50, -22, -20, -30, -55, -75]
P_F = [-45, -85, -140, -172, -70, -20, -2, 0, -8, -25, -38]
P_W = [50, 16, 16, 20, 8, 3, 0, -4.0, 3.5, 22, 45]           # pike angle on screen
P_T = [-2, 5, 13, 19, -4, -12, -18, -18, -14, -8, -4]
P_X = [0.0, -2.0, -6.0, -8.5, 1.0, 7.0, 12.0, 12.5, 10.0, 5.0, 2.0]
P_Z = [-1.0, -3.0, -5.0, -6.0, -3.0, -3.0, -4.0, -3.5, -3.0, -2.0, -1.0]
P_Q = [-0.02, -0.08, -0.04, -0.09, 0.08, 0.06, -0.12, 0.04, -0.05, 0.0, 0.0]
TH_R = [10, 8, 14, 18, 22, 30, 38, 36, 30, 20, 12]
SH_R = [-6, -14, -24, -30, -14, -16, -22, -20, -14, -8, -6]
TH_L = [-12, -18, -22, -24, -30, -34, -38, -36, -30, -20, -12]
SH_L = [-4, -8, -14, -18, -4, 0, 0, 0, -2, -4, -4]
HEAD = [0, 3, 5, 6, -2, -4, -5, -4, -3, -1, 0]


def _attack_pose(f):
    w = P_W[f] - P_T[f]
    pose = merge(pike(P_A[f], P_F[f], w), {
        "hips": {"z": P_Z[f]},
        "torso": {"r": P_T[f]},
        "head": {"r": HEAD[f] - 0.4 * P_T[f]},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
    }, M.body_about((0, 0, 22), x=P_X[f], q=P_Q[f]))
    if f in (4, 5):
        pose["hand_r"]["sx"] = 1.12   # the pike stretches along the drive
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return _pennon(pose, w)


PIKE_TIP = (HR[0] + TIP, PY, HR[2])
DRIVE = {"kind": "streak", "joint": "hand_r", "point": PIKE_TIP, "color": "#C9D2DC", "width_lu": 9.0,
         "white": 0.35}


def _attack_clip():
    ov = {
        4: [dict(DRIVE, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(DRIVE, **{"from": 3, "t0": 0.05, "t1": 1.0, "width_lu": 8.0})],
        6: [dict(DRIVE, **{"from": 4, "t0": 0.35, "t1": 1.0, "width_lu": 6.5}),
            {"kind": "burst", "joint": "hand_r", "point": PIKE_TIP, "r0_lu": 5.0, "r1_lu": 11.0,
             "n": 6, "a0": -75.0, "arc": 150.0},
            {"kind": "dust", "ground": (22.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 21, "spread": 0.8},
            {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 22, "spread": 0.7,
             "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)



# -- attack B: overhead downward push (ANIM_SPEC appendix B) -----------------------------------
# unique frames: 0 = A read, 1 = A dip, 2 lift, 3 HOLD (both hands high over his head, the pike
# angled down at the target, the body arched back), 4 smear, 5 lead, 6 IMPACT (driven down and
# forward, squash), 7 quiver, 8 recoil, 9 = A settle, 10 = A settle
#        lift HOLD smear lead IMP  quiv recoil
OB_A = [70, 112, 70, 40, 22, 24, 0]
OB_F = [40, 70, 30, 6, -6, -4, -10]
OB_W = [-6, -18, -24, -28, -30, -27, -12]
OB_T = [4, 12, -4, -10, -16, -14, -8]
OB_X = [-1.0, -3.5, 3.0, 8.0, 11.0, 11.5, 7.0]
OB_Z = [0.5, 1.8, 1.0, -1.0, -3.0, -2.6, -1.6]
OB_Q = [0.04, 0.09, 0.07, 0.02, -0.14, 0.04, -0.04]
OB_THR = [2, -4, 16, 24, 32, 30, 18]
OB_SHR = [-4, -8, -12, -16, -22, -20, -10]
OB_THL = [2, 8, -12, -22, -30, -28, -16]
OB_SHL = [-6, -10, -6, -4, -4, -4, -4]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    w = OB_W[k] - OB_T[k]
    pose = merge(pike(OB_A[k], OB_F[k], w, grip=20.0), {
        "torso": {"r": OB_T[k]},
        "head": {"r": -0.5 * OB_T[k]},
        "thigh_r": {"r": OB_THR[k]}, "shin_r": {"r": OB_SHR[k]},
        "thigh_l": {"r": OB_THL[k]}, "shin_l": {"r": OB_SHL[k]},
    }, M.body_about((0, 0, 22), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k == 1:
        pose = merge(pose, {"foot_r": {"r": -12}, "foot_l": {"r": -14}})
    if k in (2, 3):
        pose["hand_r"]["sx"] = 1.12
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return _pennon(pose, w)


def _attack_b():
    ov = {
        4: [dict(DRIVE, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(DRIVE, **{"from": 3, "t0": 0.1, "t1": 1.0, "width_lu": 8.0})],
        6: [dict(DRIVE, **{"from": 4, "t0": 0.4, "t1": 1.0, "width_lu": 6.0}),
            {"kind": "burst", "joint": "hand_r", "point": PIKE_TIP, "r0_lu": 5.0, "r1_lu": 11.0,
             "n": 6, "a0": -110.0, "arc": 150.0},
            {"kind": "dust", "ground": (60.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 23, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: double jab, rising -------------------------------------------------------------
# steps: read 30, jab 35, retract 40, HOLD 110 (low guard, the tip near the ground), smear 45,
# lead 30 | IMPACT (rising thrust) 120, quiver 60, recoil 50, A settle 70, A settle 90
C_MS = [30, 35, 40, 110, 45, 30, 120, 60, 50, 70, 90]
#        jab  retract HOLD smear lead IMP  quiv recoil
OC_A = [-40, -95, -100, -70, -40, -24, -26, -50]
OC_F = [-4, -55, -58, -24, -6, 4, 2, -20]
OC_W = [-4, -14, -21, -8, 4, 12, 9, 24]
OC_T = [-10, 2, 6, -6, -12, -16, -15, -8]
OC_X = [5.0, -1.0, -3.0, 3.0, 8.0, 11.0, 11.5, 6.0]
OC_Z = [-1.5, -2.0, -2.5, -2.0, -1.0, 0.5, 0.0, -0.5]
OC_Q = [-0.06, -0.04, -0.08, 0.06, 0.08, -0.12, 0.04, -0.03]
OC_THR = [22, 14, 16, 24, 30, 34, 32, 18]
OC_SHR = [-12, -14, -24, -16, -12, -10, -10, -6]
OC_THL = [-18, -14, -16, -24, -30, -34, -32, -18]
OC_SHL = [-6, -8, -12, -6, -2, 0, 0, -2]


def _c_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    w = OC_W[k] - OC_T[k]
    pose = merge(pike(OC_A[k], OC_F[k], w), {
        "torso": {"r": OC_T[k]},
        "head": {"r": -0.4 * OC_T[k] + (4 if k == 2 else 0)},
        "thigh_r": {"r": OC_THR[k]}, "shin_r": {"r": OC_SHR[k]},
        "thigh_l": {"r": OC_THL[k]}, "shin_l": {"r": OC_SHL[k]},
    }, M.body_about((0, 0, 22), x=OC_X[k], z=OC_Z[k], q=OC_Q[k]))
    if k in (3, 4):
        pose["hand_r"]["sx"] = 1.12
    if k == 0:
        pose = merge(pose, F.expr("yell"))
    elif k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif k in (3, 4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return _pennon(pose, w)


def _attack_c():
    ov = {
        1: [{"kind": "burst", "joint": "hand_r", "point": PIKE_TIP, "r0_lu": 4.0, "r1_lu": 8.0, "n": 3,
             "a0": -40.0, "arc": 80.0}],
        4: [dict(DRIVE, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(DRIVE, **{"from": 3, "t0": 0.2, "t1": 1.0, "width_lu": 8.0})],
        6: [dict(DRIVE, **{"from": 5, "t0": 0.3, "t1": 1.0, "width_lu": 6.0}),
            {"kind": "burst", "joint": "hand_r", "point": PIKE_TIP, "r0_lu": 5.0, "r1_lu": 11.0,
             "n": 6, "a0": -50.0, "arc": 150.0},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 24, "spread": 0.7}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], C_MS, impact=6, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    a = M.HIT_AMT[k]
    w = STANCE_PIKE[2] + 8 * a

    def recoil(a):
        return {"head": {"r": 8 * a}, "torso": {"r": 5 * a}, "brow": {"z": 1.2 * max(a, 0)}}
    base = merge(pike(STANCE_PIKE[0] + 6 * a, STANCE_PIKE[1] + 8 * a, w), BRACE, {"torso": {"r": -3}})
    return _pennon(K.hit_armoured(k, base, recoil, face_hurt=F.expr("squeeze", "grit"),
                                  face_back=F.expr("grit"), push=1.2, clank=2.2), w)


# D2 timber: the morion pops off on the slam and rolls away behind him
HAT = {5: (-58.0, -46.0, 95.0), 6: (-66.0, -34.0, 170.0), 7: (-74.0, -50.0, 265.0),
       8: (-78.0, -51.0, 330.0), 9: (-80.0, -51.0, 355.0)}
DIE_W = [60, 62, 58, 30, -20, -85, -92, -90, -90, -90]   # pike angle in the torso


def _die(k):
    stiff = [0.3, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    flop = [0, 0, 0, 0, 0, 0.6, 1.0, 0.8, 0.8, 0.8][k]
    w = DIE_W[k]
    pose = merge(pike(-70 + 20 * flop, -30 + 30 * flop, w), K.die_d2(k, heel_x=-5.0, lie_lift=7.0, back=True), {
        "head": {"r": [-10, -6, 0, 0, 4, 10, -4, 0, 0, 0][k]},
        "torso": {"r": -4 * (1 - stiff)},
        "thigh_r": {"r": 8 * (1 - stiff) + 25 * flop}, "shin_r": {"r": -20 * flop},
        "thigh_l": {"r": -4 * (1 - stiff) + 10 * flop}, "shin_l": {"r": -10 * flop},
    })
    if k in HAT:
        x, z, r = HAT[k]
        pose["helm"] = {"hide": True}
        pose["helm_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "o"), {"brow": {"z": 1.8}})
    elif k <= 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.4}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return _pennon(pose, w)


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
