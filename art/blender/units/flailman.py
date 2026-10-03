"""Flailman: Medieval Age common infantry, cleaver (CONTENT_PLAN 5.3). Flail, cleave 2, ~68 lu.

Look (A11, PLAN.md): a burly, bearded man-at-arms with a round belly in a padded team jack with
team sleeves, a riveted leather cap with a team band and a nasal guard, a broad belt with an iron
buckle, slate hose and heavy boots. He swings a war flail in the near hand: a stout wooden haft
with an iron cap, a short chain and a big spiked iron ball (the head is its own joint, so the ball
hangs, whirls and whips). The far fist swings free; he swaggers.

"A viewer expects him to whirl the flail overhead and smash it down, and to swagger forward."

Animation (ANIM_SPEC G1 swagger, appendix B for a flail: overhead whirl smash, flat sweep, rising
underhand swing):
  idle      lets the ball swing like a pendulum, rolls his shoulders, a smug grin, blink
  walk      walk v3 bounce jog at ground speed (card 70 x 1.25 = 87.5 lu/s) with a hip swagger: the
            haft over his shoulder, the ball bouncing behind his back one frame late
  attack    OVERHEAD WHIRL SMASH: raises the haft high and whirls the ball round behind his head
            (a hollow ring smear; the held extreme), then smashes it down in front (dust, impact
            burst), the ball bounces once
  attack_b  FLAT SWEEP: winds the haft back at hip height with the ball trailing behind him, then
            sweeps it round in front at belly height (a flat crescent), two foes in its path
  attack_c  RISING UNDERHAND: crouches with the ball hanging low behind his heel, then whips it up
            from the ground in a rising arc to head height in front
  hit       light: the head snaps back, the cap slips, the ball jumps
  die       D1 fling and spin: the flail flies away, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "flailman"
GAIT_NAME = "biped"
NAME = "Flailman"
HEIGHT_LU = 68
CANVAS = (400, 392)
FEET = (176, 326)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 32)}
NO_RETIME = True

SKIN = "#EBC4A0"
BEARD = "#5C4636"
LEATHER = "#6B5647"
LEATHER_DK = "#4E3F33"
HOSE = "#6E7782"
BOOT = "#5A4A3D"
WOOD = "#9A8268"
IRON = "#6F7883"
IRON_LT = "#A3ACB6"
PARCH = "#E8DFC8"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (flail haft)
HAFT = 25.0
CHAIN = 12.0
BALL_R = 5.0
TIP = (HR[0], HR[1] - 1.0, HR[2] + 4.0 + HAFT)          # the chain hangs from the haft's cap
BALL = (TIP[0], TIP[1], TIP[2] + CHAIN + BALL_R)        # ball centre, modelled straight out
CAP_C = (1.0, 0.0, 55.0)


def _cap(rig, joint):
    g = Geo().blob((1.0, 0.0, 56.4), (12.2, 12.0, 10.4), p=2.3)
    g.clip((0, 0, 54.4), (0, 0, -1))
    rig.part(joint, g, LEATHER)
    g = Geo().lathe([(12.0, 0), (12.6, 0.4), (12.6, 2.6), (12.0, 3.0)], (1.0, 0.0, 54.2), segs=28)
    rig.part(joint, g, team=True, outline=0.6)
    g = Geo()
    for a in (-150, -115, -80, -45, -10, 25):
        r = math.radians(a)
        g.sphere((1.0 + 11.4 * math.cos(r), 11.2 * math.sin(r), 59.8), 1.0, cuts=2)
    g.capsule((1.0, 0, 65.8), (1.0, 0, 67.4), 1.6)
    rig.part(joint, g, IRON, finish="metal", outline=0)
    g = Geo().capsule((12.6, -1.0, 55.4), (14.0, -1.0, 47.0), 1.3, 1.0)   # nasal guard
    rig.part(joint, g, IRON, finish="metal", outline=0.6)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    K.legs_v3(rig, HOSE, BOOT, cuff=LEATHER_DK, thigh_r=5.0)
    rig.joint("cap", "head", CAP_C)

    # torso: a round padded team jack with vertical quilting, a broad belt, an iron buckle
    g = Geo().blob((1.0, 0, 27.0), (12.6, 11.0, 12.4), p=2.1, taper=(1.12, 0.88))
    tface = F.Face(rig, "torso", [g])
    rig.part("torso", g, team=True)
    g2 = Geo()
    for x in (2.0, 7.5):
        c = tface.hit(x, 28.0)
        tface.stroke(g2, c, [(0.0, -7.0), (0.4, 7.5)], 1.0, 0.35)
    rig.part("torso", g2, LEATHER_DK, highlight=False, outline=0)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.8, 0, 15.2), (12.4, 11.0, 4.6), p=2.7, taper=(1.12, 1.0))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.8, 0, 20.4), (13.0, 11.6, 2.2), p=3.2)
    rig.part("torso", g, LEATHER_DK)
    g = Geo().blob((13.6, -2.0, 20.4), (1.6, 2.8, 2.8), p=3.0)
    rig.part("torso", g, IRON_LT, finish="metal", outline=0.8)
    g = Geo().blob((0.4, 0, 36.4), (10.6, 11.2, 3.6), p=2.4)   # padded collar
    rig.part("torso", g, team=True)

    # head: broad face, a big bushy beard and brows, a smug look
    head = Geo().blob((2, 0, 47.6), (11.6, 11.0, 11.0), p=2.3)
    head.blob((14.0, -0.6, 45.6), (3.6, 3.2, 3.2), p=2.0)  # nose
    beard = Geo().blob((8.0, 0, 41.0), (8.6, 10.6, 7.6), p=2.2)
    beard.blob((11.0, 0, 37.6), (5.4, 6.8, 5.0), p=2.2)
    K.face2(rig, [head], SKIN, cx=12.0, cz=48.8, eye_r=(3.6, 3.3, 4.2), brow=BEARD, brow_w=1.25,
            mouth_dz=-7.0, mouth_x=12.6, eye_at=(13.8, 49.0), mark_r=3.9, extra_geos=[beard])
    rig.part("head", head, SKIN)
    rig.part("head", beard, BEARD, finish="hair")
    g = Geo().blob((13.2, -3.6, 43.6), (3.2, 4.0, 2.0), p=2.2, rot=(18, 0, -10))   # moustache lobes
    g.blob((13.2, 2.8, 43.6), (3.2, 4.0, 2.0), p=2.2, rot=(-18, 0, -10))
    rig.part("head", g, BEARD, finish="hair")
    _cap(rig, "cap")

    # arms: team sleeves with leather bracers, bare fists
    for s in ("r", "l"):
        B.arm_parts(rig, s, None, hand=SKIN, team_sleeve=True, r0=5.0, r1=4.4, fist=4.6, cuff=LEATHER)

    # the flail: haft in the near fist (rest pointing up), the chain and ball on their own joint
    hx, hy, hz = HR
    rig.joint("haft", "hand_r", HR)
    g = Geo().capsule((hx, hy - 1.0, hz - 6.0), (hx, hy - 1.0, hz + 4.0 + HAFT), 1.9, 1.7)
    rig.part("haft", g, WOOD)
    g = Geo().capsule((hx, hy - 1.0, hz + 1.0 + HAFT), (hx, hy - 1.0, hz + 5.0 + HAFT), 2.4)
    g.sphere((hx, hy - 1.0, hz - 6.6), 2.2, cuts=2)
    rig.part("haft", g, IRON, finish="metal", outline=0.7)
    rig.joint("chain", "haft", TIP)
    g = Geo()
    for k in range(4):   # chain links
        z = TIP[2] + 1.4 + k * 2.4
        g.blob((TIP[0], TIP[1], z), (1.2, 0.8, 1.5), p=2.0)
    rig.part("chain", g, IRON, finish="metal", outline=0.5)
    g = Geo().sphere(BALL, BALL_R, cuts=3)
    rig.part("chain", g, IRON, finish="metal")
    g = Geo()
    for i in range(10):   # spikes
        th = math.radians(36 * i)
        ph = math.radians([-50, 10, 60][i % 3])
        d = (math.cos(th) * math.cos(ph), math.sin(th) * math.cos(ph), math.sin(ph))
        p0 = (BALL[0] + d[0] * BALL_R * 0.8, BALL[1] + d[1] * BALL_R * 0.8, BALL[2] + d[2] * BALL_R * 0.8)
        p1 = (BALL[0] + d[0] * (BALL_R + 3.0), BALL[1] + d[1] * (BALL_R + 3.0), BALL[2] + d[2] * (BALL_R + 3.0))
        g.lathe([(1.3, 0), (0, 3.0)], p0, p1, segs=8)
    rig.part("chain", g, IRON_LT, finish="metal", outline=0.5)
    rig.track("ball", "chain", BALL)

    # the loose flail that flies off in the death (built at its own pivot)
    rig.joint("flail_loose", "root", (0, 0, 30), hidden=True)
    g = Geo().capsule((-12.0, -10.0, 30.0), (12.0, -10.0, 30.0), 1.9)
    rig.part("flail_loose", g, WOOD)
    g = Geo().sphere((22.0, -10.0, 30.0), BALL_R, cuts=3)
    rig.part("flail_loose", g, IRON, finish="metal")


# -- poses ---------------------------------------------------------------------------------
def flail(a, f, w, c):
    """Near arm (a, f), haft direction w, chain direction c (all world degrees, 0 forward, 90 up)."""
    pose = B.arm("r", a, f, w, w_rest=90.0)
    pose["chain"] = {"r": c - w}
    return pose


STANCE = merge(flail(-60, -10, 40, -90), B.arm("l", -80, -60), {"torso": {"r": 1}})


def _idle(f):
    # the ball swings like a pendulum, the shoulders roll, a smug grin
    sw = math.sin(2 * math.pi * f / 8)
    lag = math.sin(2 * math.pi * (f - 1) / 8)

    def extra(ctx):
        return merge(flail(-60 + 4 * sw, -10 + 6 * sw, 40 + 8 * sw, -90 + 26 * lag),
                     {"torso": {"rz": 4 * sw}, "arm_l": {"r": 4 * ctx["lag"]}, "head": {"r": 2 * sw}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r", "chain")}
    return M.idle_v2(f, base, extra=extra, face_blink=F.expr("blink"), blink=5)


# -- walk v3: G1 bounce jog at ground speed (card 70 x 1.25 = 87.5 lu/s), 8 x 77 ms, swagger --------
SPEED = 87.5
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED)
CARRY = merge(flail(-30, 70, 150, -95), {"torso": {"r": -2}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -5 * lag}, "chain": {"r": 18 * lag}, "hem": {"r": 4 * lag},
                "hips": {"rx": 5 * math.sin(ctx["p"])}, "cap": {"r": 2 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-6.0, twist=9.0, nod=3.0, sway=3.0,
                     arms={"l": K.ArmChain("l")}, arm=38.0, elbow=(40.0, 75.0), extra=extra, report=report)


# -- attack A: overhead whirl smash (moves.SMALL_MELEE_MS, impact 6, smear 4) ---------------------
#        read  dip  wind HOLD  smear lead IMP  bounce recoil settle settle
A_A = [-50, -20, 60, 110, 70, 10, -30, -36, -40, -50, -58]
A_F = [-6, 40, 110, 140, 70, 0, -40, -46, -36, -20, -12]
A_W = [50, 90, 120, 130, 70, -10, -50, -52, -30, 10, 34]
A_C = [-80, -60, 150, 190, 100, -20, -70, -40, -60, -80, -88]
A_L = [(-80, -60), (-70, -40), (-60, -30), (-50, -20), (-70, -50), (-90, -70), (-110, -80), (-105, -78), (-95, -70), (-85, -62), (-80, -60)]
A_T = [1, 4, 10, 14, 0, -10, -18, -16, -10, -4, 0]
A_BX = [0.0, -1.0, -2.5, -3.5, 1.0, 5.0, 8.0, 8.0, 6.0, 2.5, 0.5]
A_BZ = [0.0, -1.5, 0.5, 1.5, 0.5, -1.0, -3.5, -2.5, -2.0, -0.8, 0.0]
A_Q = [-0.02, -0.08, 0.04, 0.06, 0.06, 0.02, -0.15, 0.04, -0.05, 0.02, 0.0]
A_THR = [0, -4, -8, -10, 10, 20, 28, 26, 20, 8, 2]
A_SHR = [0, -4, -6, -6, -12, -18, -24, -20, -14, -6, 0]
A_THL = [0, 4, 8, 10, -8, -16, -22, -20, -14, -6, -2]
A_SHL = [0, -8, -10, -10, -6, -4, -6, -4, -4, -2, 0]


def _attack_pose(f):
    pose = merge(flail(A_A[f], A_F[f], A_W[f], A_C[f]), B.arm("l", *A_L[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": -0.4 * A_T[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 22), x=A_BX[f], z=A_BZ[f], q=A_Q[f]))
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    return pose


WHIRL = {"kind": "arc", "joint": "chain", "inner": TIP, "outer": BALL, "color": "#C9D2DC", "band": 0.4,
         "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}


def _attack_clip():
    ov = {
        3: [dict(WHIRL, **{"from": 2})],
        4: [dict(WHIRL, **{"from": 3})],
        5: [dict(WHIRL, **{"from": 4, "band": 0.0})],
        6: [{"kind": "burst", "joint": "chain", "point": BALL, "r0_lu": 7.0, "r1_lu": 13.0, "n": 6,
             "a0": -160.0, "arc": 140.0},
            {"kind": "dust", "ground": (26.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 51, "spread": 1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: flat sweep at belly height ---------------------------------------------------------
# 0-1 = A read and dip, 2 wind (turning away), 3 HOLD (haft back at the hip, ball trailing behind him),
# 4 smear, 5 lead-in, 6 IMPACT (swept round in front at belly height), 7 over, 8 recoil, 9-10 = A
#        wind HOLD smear lead IMP  over recoil
OB_A = [-80, -110, -60, -20, 0, 6, -20]
OB_F = [-120, -160, -60, 0, 10, 16, -10]
OB_W = [-160, -175, -60, 0, 10, 20, 10]
OB_C = [-170, -185, -90, 0, 14, 30, -30]
OB_YAW = [30, 44, 10, -20, -36, -40, -20]
OB_X = [-1.5, -3.0, 1.0, 4.5, 7.0, 7.5, 5.0]
OB_Z = [-1.0, -2.0, -1.5, -2.5, -3.0, -2.4, -1.5]
OB_Q = [-0.04, 0.02, 0.06, 0.02, -0.14, 0.04, -0.05]
OB_THR = [-6, -10, 8, 18, 24, 22, 14]
OB_SHR = [-6, -10, -14, -18, -22, -18, -10]
OB_THL = [8, 12, -6, -14, -20, -18, -12]
OB_SHL = [-10, -16, -8, -6, -8, -6, -4]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    pose = merge(flail(OB_A[k], OB_F[k], OB_W[k], OB_C[k]), B.arm("l", -40 - 0.8 * OB_YAW[k], 0), {
        "torso": {"r": -4, "rz": OB_YAW[k]}, "head": {"rz": -0.6 * OB_YAW[k]},
        "thigh_r": {"r": OB_THR[k]}, "shin_r": {"r": OB_SHR[k]},
        "thigh_l": {"r": OB_THL[k]}, "shin_l": {"r": OB_SHL[k]},
    }, M.body_about((0, 0, 22), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    else:
        pose = merge(pose, F.expr("grit"))
    return pose


SWEEP = {"kind": "arc", "joint": "chain", "inner": TIP, "outer": BALL, "color": "#C9D2DC",
         "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}


def _attack_b():
    ov = {
        4: [dict(SWEEP, **{"from": 3})],
        5: [dict(SWEEP, **{"from": 4})],
        6: [dict(SWEEP, t0=0.4, t1=1.0, lines=2, **{"from": 5}),
            {"kind": "burst", "joint": "chain", "point": BALL, "r0_lu": 6.0, "r1_lu": 12.0, "n": 5,
             "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 52, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: rising underhand swing ---------------------------------------------------------------
# 0 = A read, 1 crouch, 2 deeper, 3 HOLD (crouched, the haft down and back, the ball hanging low behind
# his heel), 4 smear (scooping up), 5 lead, 6 IMPACT (the ball whipped up to head height in front),
# 7 over, 8 recoil, 9-10 = A settle
#        crouch deeper HOLD smear lead IMP  over recoil
OC_A = [-90, -120, -140, -100, -40, 20, 30, -10]
OC_F = [-100, -140, -160, -90, -10, 50, 60, 20]
OC_W = [-120, -150, -170, -80, 10, 60, 70, 40]
OC_C = [-110, -150, -175, -100, 0, 50, 70, 0]
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
    pose = merge(flail(OC_A[k], OC_F[k], OC_W[k], OC_C[k]), B.arm("l", -60 + 6 * k, -40), {
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
        3: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 53, "spread": 0.7}],
        4: [dict(SWEEP, **{"from": 3})],
        5: [dict(SWEEP, **{"from": 4})],
        6: [dict(SWEEP, t0=0.4, t1=1.0, lines=2, **{"from": 5}),
            {"kind": "burst", "joint": "chain", "point": BALL, "r0_lu": 6.0, "r1_lu": 12.0, "n": 5,
             "a0": 0.0, "arc": 140.0}],
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 14 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -22 * max(a, 0)},
                "arm_r": {"r": 16 * a}, "chain": {"r": 30 * a},
                "arm_l": {"r": 24 * a}, "fore_l": {"r": 18 * a},
                "cap": {"r": -6 * a, "z": -1.6 * max(a, 0)}, "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("grit") if k == 2 else None)


# D1: the flail flies off on the first spin and lands in front
FLAIL = {1: (14.0, 18.0, 80.0), 2: (26.0, 26.0, 200.0), 3: (36.0, 18.0, 300.0), 4: (42.0, -2.0, 360.0),
         5: (44.0, -22.0, 380.0), 6: (45.0, -25.0, 390.0), 7: (45.0, -25.0, 390.0), 9: (45.0, -25.0, 390.0)}


def _die(k):
    flail_ = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=12.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail_}, "head": {"r": 14 * flail_ - 6},
        "arm_r": {"r": 80 * flail_ + 20}, "fore_r": {"r": 30 * flail_},
        "arm_l": {"r": 100 * flail_ + 30}, "fore_l": {"r": 40 * flail_},
        "thigh_r": {"r": 40 * flail_ + 20}, "shin_r": {"r": -30 * flail_},
        "thigh_l": {"r": -20 * flail_ + 10}, "shin_l": {"r": -20 * flail_},
    })
    if k in FLAIL:
        x, z, r = FLAIL[k]
        pose["haft"] = {"hide": True}
        pose["flail_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
