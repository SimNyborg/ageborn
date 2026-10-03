"""Brigand: Medieval Age common infantry, raider (CONTENT_PLAN 5.3). Dagger, double damage to bases, ~66 lu.

Look (A11, PLAN.md): a wiry, shifty outlaw in a team hood with a short shoulder cape, a team tunic
under a patched leather vest, a parchment kerchief over his nose and mouth (only the sly eyes and a
big crooked nose show), olive-grey hose and soft boots. A lumpy parchment loot sack with a gold coin
peeking out jingles on his back (its own joint, bouncing late), and a long dagger sits in his near
hand, reversed for a backhand.

"A viewer expects him to slash with a dagger and barge with his shoulder, and to sneak-sprint low."

Animation (ANIM_SPEC G1 sneak, appendix B for a dagger: backhand slash, shoulder barge, low stab):
  idle      glances left and right over the kerchief, tosses the dagger and catches it, blink
  walk      walk v3 sneaking sprint at ground speed (card 100 x 1.25 = 125 lu/s): hips low and
            forward, long low strides, the sack bouncing a frame late, the dagger arm tucked
  attack    OVERHAND DAGGER STAB: cocks the dagger back high behind his hood (the held extreme),
            then drives it over the top and stabs down-forward (a crescent smear)
  attack_b  SHOULDER BARGE: crouches behind his lowered shoulder (the held extreme), then rams
            forward shoulder first, the sack flying up behind him
  attack_c  LOW STAB: drops into a low lunge with the dagger drawn back by the hip, then stabs
            upward from below (a thrust streak)
  hit       light: the head snaps back, coins jump in the sack
  die       D1 fling and spin: the sack flies off, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "brigand"
GAIT_NAME = "biped"
NAME = "Brigand"
HEIGHT_LU = 66
CANVAS = (280, 240)
FEET = (116, 212)
ANCHORS = {"head": (4, 62), "hitCenter": (0, 30)}
NO_RETIME = True

SKIN = "#E6BE9A"
HAIR = "#3E332C"
VEST = "#6E5A48"
VEST_DK = "#4E4035"
HOSE = "#6A6E5E"
BOOT = "#55483D"
PARCH = "#E8DFC8"
SACK = "#CDBB98"
STEEL = "#A7B0BB"
GRIP = "#4A3A30"
GOLD = "#D4A437"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (dagger)
BLADE = 19.0
TIP = (HR[0], HR[1] - 0.6, HR[2] + 4.2 + BLADE)
MID = (HR[0], HR[1] - 0.6, HR[2] + 4.2 + BLADE * 0.4)
SACK_C = (-12.0, 4.0, 34.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    K.legs_v3(rig, HOSE, BOOT, cuff=VEST_DK)

    # loot sack on the back (behind the torso), its own joint so it bounces
    rig.secondary("sack", "torso", (-6.0, 4.0, 38.0), (-14.0, 4.0, 26.0), max_deg=16, gain=1.3)
    g = Geo().blob((-13.0, 4.5, 31.0), (8.6, 8.0, 9.8), p=2.2)
    g.blob((-12.0, 4.5, 40.5), (4.0, 4.0, 3.0), p=2.2)
    rig.part("sack", g, SACK)
    g = Geo().lathe([(4.2, 0), (4.6, 0.4), (4.6, 1.4), (4.2, 1.8)], (-12.0, 4.5, 38.4), segs=16)
    rig.part("sack", g, VEST_DK, outline=0.5)
    g = Geo().lathe([(0, -0.5), (2.4, -0.4), (2.6, 0.0), (2.4, 0.4), (0, 0.5)], (-6.6, -2.0, 35.0),
                    (-6.0, -2.4, 34.6), segs=14)
    rig.part("sack", g, GOLD, finish="metal", outline=0.6)
    g = Geo().capsule((-6.0, -3.0, 38.0), (8.0, -9.5, 22.0), 1.1)   # strap across the chest
    rig.part("torso", g, VEST_DK, outline=0.6)

    # torso: team tunic, a patched leather vest, a belt
    g = Geo().blob((0, 0, 27.6), (10.2, 9.4, 11.4), p=2.3, taper=(1.08, 0.94))
    rig.part("torso", g, team=True)
    g = Geo().blob((0.3, 0, 28.0), (10.7, 9.9, 8.4), p=2.8)
    g.clip((0, 0, 35.0), (0, 0, 1))
    g.clip((9.5, 0, 0), (1, 0, 0))
    vface = F.Face(rig, "torso", [g])
    rig.part("torso", g, VEST)
    g2 = Geo()
    c = vface.hit(3.0, 26.0)
    vface.decal(g2, c, [(-1.8, -1.6), (1.8, -1.6), (1.8, 1.6), (-1.8, 1.6)], 0.4)
    rig.part("torso", g2, SACK, highlight=False, outline=0.3)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.6, 0, 15.2), (11.2, 10.2, 4.6), p=2.7, taper=(1.12, 1.0))
    for x, y in ((8.0, -7.0), (-2.0, -10.0)):
        g.lathe([(1.6, 0), (0, 3.2)], (x, y - 0.6, 11.4), (x, y - 0.8, 14.6), segs=6)
    rig.part("hem", g, team=True)
    g = Geo().blob((0.4, 0, 20.6), (11.4, 10.4, 1.8), p=3.2)
    rig.part("torso", g, VEST_DK)

    # head: team hood with a short cape, a kerchief mask over nose and mouth, sly eyes
    head = Geo().blob((2, 0, 48.2), (11.0, 10.4, 11.0), p=2.3)
    head.blob((14.0, -0.6, 46.6), (3.6, 3.0, 3.6), p=2.0)  # big crooked nose
    hood = Geo().blob((0.5, 0, 51.0), (12.6, 12.0, 12.6), p=2.3, taper=(1.02, 0.86), shift=(-0.12, 0))
    hood.clip((6.6, 0, 50.0), (1, 0, 0.22))
    hood.blob((-6.0, 0, 60.0), (6.0, 5.0, 4.0), p=2.2, rot=(0, -40, 0))   # floppy hood tip
    mask = Geo().blob((7.6, 0, 42.4), (8.0, 11.0, 5.0), p=2.4)
    mask.clip((0, 0, 46.0), (0, 0, 1))
    K.face2(rig, [head, hood, mask], SKIN, cx=11.6, cz=49.4, eye_r=(3.4, 3.1, 3.6), brow=HAIR, brow_w=1.1,
            mouth_dz=-7.4, mouth_x=12.6, eye_at=(13.4, 49.6), mark_r=3.6, mouth_w=4.0)
    rig.part("head", head, SKIN)
    rig.part("head", hood, team=True)
    rig.part("head", mask, PARCH)
    g = Geo().blob((0.5, 0, 38.0), (11.6, 12.2, 4.6), p=2.6, taper=(1.1, 0.9))   # short shoulder cape
    for x, y in ((8.0, -6.0), (1.0, -11.0), (-7.0, -9.0)):
        g.lathe([(3.0, 0), (0, -4.0)], (x, y, 35.0), segs=8)
    rig.part("torso", g, team=True)
    rig.secondary("tip", "head", (-6.0, 0, 60.0), (-12.0, 0, 56.0), max_deg=16, gain=1.2)

    # arms: team sleeves, a leather bracer, bare hands
    for s in ("r", "l"):
        B.arm_parts(rig, s, VEST, hand=SKIN, r0=4.1, r1=3.6, cuff=VEST_DK)

    # the dagger in the near hand (rest pointing up): grip, crossguard, a long blade
    hx, hy, hz = HR
    g = Geo().lathe([(0, -4.0), (1.7, -3.7), (1.9, -0.6), (1.6, 2.8), (0, 3.2)], (hx, hy - 0.6, hz), segs=10)
    rig.part("hand_r", g, GRIP)
    g = Geo().blob((hx, hy - 0.6, hz + 3.6), (1.4, 4.6, 1.2), p=2.8)
    g.sphere((hx, hy - 0.6, hz - 4.6), 1.6, cuts=2)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.7)
    g = Geo().lathe([(0, 0), (2.9, 0.2), (2.9, BLADE * 0.6), (1.4, BLADE - 2.5), (0, BLADE)],
                    (hx, hy - 0.6, hz + 4.2), squash=(1.0, 0.35), segs=10)
    rig.part("hand_r", g, STEEL, finish="metal")
    rig.track("daggerTip", "hand_r", TIP)

    rig.joint("sack_loose", "root", (0, 0, 30), hidden=True)
    g = Geo().blob((0.0, 4.0, 30.0), (8.6, 8.0, 9.8), p=2.2)
    rig.part("sack_loose", g, SACK)


# -- poses ---------------------------------------------------------------------------------
def dagger(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


STANCE = merge(dagger(-60, 0, 20), B.arm("l", -50, 10), {"torso": {"r": -6}},
               M.body_about((0, 0, 22), z=-1.5))


def _idle(f):
    # glances left and right over the kerchief, tosses the dagger up and catches it
    look = [0.0, 1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 0.0][f]
    toss = [0.0, 0.0, 0.0, 0.0, 0.0, 0.4, 1.0, 0.3][f]

    def extra(ctx):
        return merge(dagger(-60 + 14 * toss, 0 + 40 * toss, 20 + 150 * toss),
                     {"head": {"rz": 18 * look}, "pupils": {"y": -1.2 * look}, "sack": {"r": 3 * ctx["lag"]}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r")}
    return M.idle_v2(f, base, extra=extra, face_blink=F.expr("blink"), blink=3)


# -- walk v3: a low sneaking sprint at ground speed (card 100 x 1.25 = 125 lu/s), 8 x 64 ms -----------
SPEED = 125.0
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=512, stance=0.32, lift=7.0, x_mid=3.5)
SNEAK_BOB = [-5.6, -6.4, -3.0, -0.4]
CARRY = merge(dagger(-70, -10, 160), {"torso": {"r": -4}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"sack": {"r": 10 * lag}, "hem": {"r": 4 * lag}, "tip": {"r": 6 * lag},
                "hand_r": {"r": -4 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, bob=SNEAK_BOB, lean=-16.0, twist=7.0, nod=2.5,
                     arms={"l": K.ArmChain("l")}, arm=40.0, elbow=(60.0, 90.0), extra=extra, report=report)


# -- attack A: overhand stab with the reversed dagger (moves.SMALL_MELEE_MS) -----------------------------------------------
# the dagger is held point up; for the backhand the arm folds across the chest (yaw) and whips out
#        read  dip  wind HOLD smear lead IMP  over recoil settle settle
A_A = [-55, -10, 120, 150, 90, 20, -6, -12, -22, -42, -56]
A_F = [10, 60, 140, 165, 80, 10, -16, -22, -14, -4, 0]
A_W = [30, 80, 120, 135, 60, -10, -30, -34, -16, 6, 20]
A_YAW = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
A_T = [-6, 0, 6, 10, -4, -14, -20, -18, -12, -8, -6]
A_TZ = [0, 6, 12, 16, 4, -8, -14, -14, -10, -4, 0]
A_X = [0.0, -1.0, -2.5, -3.5, 1.5, 5.0, 8.0, 8.5, 6.0, 2.5, 0.5]
A_Z = [-1.5, -2.5, -2.0, -1.5, -1.5, -2.5, -3.5, -3.0, -2.5, -2.0, -1.5]
A_Q = [-0.02, -0.08, -0.04, 0.02, 0.08, 0.04, -0.14, 0.04, -0.05, 0.02, 0.0]
A_THR = [0, -4, -6, -8, 10, 20, 28, 26, 18, 8, 2]
A_SHR = [0, -4, -4, -4, -14, -20, -24, -20, -14, -6, 0]
A_THL = [0, 4, 6, 8, -10, -18, -24, -22, -16, -6, -2]
A_SHL = [0, -10, -12, -12, -6, -4, -6, -4, -4, -2, 0]


def _attack_pose(f):
    p = dagger(A_A[f], A_F[f], A_W[f])
    p["arm_r"]["rz"] = A_YAW[f]
    pose = merge(p, B.arm("l", -50 - 0.3 * A_YAW[f], 10), {
        "torso": {"r": A_T[f], "rz": A_TZ[f]}, "head": {"rz": -0.6 * A_TZ[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "sack": {"r": [0, 4, 8, 10, -6, -12, -16, -10, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose["hand_r"]["sz"] = 1.2
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, {"brow": {"z": -1.2}})
    return pose


SLASH = {"kind": "arc", "joint": "hand_r", "inner": MID, "outer": TIP, "color": "#D6DDE6",
         "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}


def _attack_clip():
    ov = {
        4: [dict(SLASH, **{"from": 3})],
        5: [dict(SLASH, **{"from": 4})],
        6: [dict(SLASH, t0=0.4, t1=1.0, lines=2, **{"from": 5}),
            {"kind": "burst", "joint": "hand_r", "point": TIP, "r0_lu": 4.0, "r1_lu": 9.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 61, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: shoulder barge -------------------------------------------------------------------------
# 0-1 = A read, dip; 2 tuck; 3 HOLD (crouched low behind the lowered near shoulder, arms tucked);
# 4 smear (charging); 5 lead; 6 IMPACT (shoulder rammed forward, squash, the sack flies up); 7 over;
# 8 recoil; 9-10 = A settle
#        tuck HOLD smear lead IMP  over recoil
OB_T = [-14, -26, -30, -32, -34, -30, -20]
OB_X = [-1.0, -3.0, 3.0, 8.0, 12.0, 12.5, 8.0]
OB_Z = [-3.5, -6.0, -4.0, -3.0, -2.5, -2.5, -2.0]
OB_Q = [-0.06, -0.10, 0.10, 0.06, -0.16, 0.04, -0.05]
OB_THR = [10, 24, 30, 36, 40, 38, 26]
OB_SHR = [-16, -36, -30, -26, -20, -18, -14]
OB_THL = [-8, -18, -24, -30, -36, -34, -22]
OB_SHL = [-14, -30, -16, -6, -2, -4, -6]
OB_SACK = [6, 12, -10, -24, -34, -24, -10]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    pose = merge(dagger(-110, -40, 140), B.arm("l", -30, 40), {
        "torso": {"r": OB_T[k], "rz": -18, "rx": -6}, "head": {"r": 12, "rz": 14},
        "arm_r": {"rz": -20},
        "thigh_r": {"r": OB_THR[k]}, "shin_r": {"r": OB_SHR[k]},
        "thigh_l": {"r": OB_THL[k]}, "shin_l": {"r": OB_SHL[k]},
        "sack": {"r": OB_SACK[k]},
    }, M.body_about((0, 0, 22), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k in (0, 1):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.2}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.4}})
    return pose


def _attack_b():
    shoulder = (2.0, B.ARM_Y["r"], B.SHOULDER_Z)
    ov = {
        3: [{"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 62, "dir": -1.0}],
        4: [{"kind": "streak", "joint": "torso", "point": shoulder, "color": "#E8DFC8", "width_lu": 9.0,
             "white": 0.4, "from": 3}],
        6: [{"kind": "burst", "joint": "torso", "point": (8.0, B.ARM_Y["r"], B.SHOULDER_Z - 2.0), "r0_lu": 7.0,
             "r1_lu": 13.0, "n": 6, "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": 63, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: low upward stab -------------------------------------------------------------------------
# 0 = A read, 1 drop, 2 lunge set, 3 HOLD (a low lunge, the dagger drawn back by the hip pointing
# forward-up), 4 smear, 5 lead, 6 IMPACT (stabbed up and forward from below), 7 over, 8 recoil, 9-10 = A
#        drop  set  HOLD smear lead IMP  over recoil
OC_A = [-90, -120, -140, -80, -30, 10, 14, -20]
OC_F = [-40, -50, -40, 10, 30, 30, 32, 10]
OC_W = [20, 30, 34, 30, 30, 30, 32, 24]
OC_T = [-10, -16, -18, -18, -20, -22, -20, -12]
OC_X = [0.0, -1.5, -2.0, 3.0, 7.0, 11.0, 11.5, 7.0]
OC_Z = [-4.0, -7.0, -8.0, -7.0, -6.0, -5.0, -5.0, -3.0]
OC_Q = [-0.06, -0.10, -0.08, 0.08, 0.06, -0.14, 0.04, -0.04]
OC_THR = [16, 30, 40, 46, 50, 54, 52, 32]
OC_SHR = [-24, -46, -60, -52, -46, -40, -38, -24]
OC_THL = [-10, -18, -24, -30, -34, -38, -36, -20]
OC_SHL = [-18, -30, -40, -24, -12, -6, -6, -8]


def _c_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    pose = merge(dagger(OC_A[k], OC_F[k], OC_W[k]), B.arm("l", -20, 20), {
        "torso": {"r": OC_T[k]}, "head": {"r": -0.5 * OC_T[k]},
        "thigh_r": {"r": OC_THR[k]}, "shin_r": {"r": OC_SHR[k]},
        "thigh_l": {"r": OC_THL[k]}, "shin_l": {"r": OC_SHL[k]},
    }, M.body_about((0, 0, 22), x=OC_X[k], z=OC_Z[k], q=OC_Q[k]))
    if k in (3, 4):
        pose["hand_r"]["sz"] = 1.2
    if k in (1, 2):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    elif k in (3, 4, 5, 6):
        pose = merge(pose, {"brow": {"z": -1.3}})
    return pose


STAB = {"kind": "streak", "joint": "hand_r", "point": TIP, "color": "#D6DDE6", "width_lu": 5.0, "white": 0.4}


def _attack_c():
    ov = {
        4: [dict(STAB, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(STAB, **{"from": 4, "t0": 0.2, "t1": 1.0})],
        6: [dict(STAB, **{"from": 5, "t0": 0.4, "t1": 1.0, "width_lu": 4.0}),
            {"kind": "burst", "joint": "hand_r", "point": TIP, "r0_lu": 4.0, "r1_lu": 9.0, "n": 5,
             "a0": -30.0, "arc": 120.0},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 64, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 18 * a}, "hand_r": {"r": 12 * a},
                "arm_l": {"r": 28 * a}, "fore_l": {"r": 20 * a},
                "sack": {"r": -18 * a, "z": 1.5 * max(a, 0)}, "brow": {"z": 1.5 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze"), face_back=None)


SACK_FLY = {1: (-10.0, 14.0, -40.0), 2: (-20.0, 24.0, -120.0), 3: (-30.0, 18.0, -200.0),
            4: (-38.0, 0.0, -260.0), 5: (-42.0, -18.0, -280.0), 6: (-43.0, -20.0, -285.0),
            7: (-43.0, -20.0, -285.0), 9: (-43.0, -20.0, -285.0)}


def _die(k):
    fl = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * fl}, "head": {"r": 14 * fl - 6},
        "arm_r": {"r": 70 * fl + 20}, "hand_r": {"r": 30 * fl},
        "arm_l": {"r": 110 * fl + 30}, "fore_l": {"r": 40 * fl},
        "thigh_r": {"r": 40 * fl + 20}, "shin_r": {"r": -30 * fl},
        "thigh_l": {"r": -20 * fl + 10}, "shin_l": {"r": -20 * fl},
    })
    if k in SACK_FLY:
        x, z, r = SACK_FLY[k]
        pose["sack"] = {"hide": True}
        pose["sack_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze"))
    elif k >= 4:
        pose = merge(pose, F.expr("x"))
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
