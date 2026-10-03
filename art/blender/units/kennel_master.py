"""Kennel Master: Medieval Age rare support, summoner (CONTENT_PLAN 5.3, X0 M3). Whip, ~68 lu.

Look (A11, PLAN.md): a big-bellied huntsman with a bushy red-brown beard (kept below 40% saturation),
a flat team cap with leather ear flaps, a team jerkin under a leather apron with a bone whistle on a cord,
two empty leather leashes with team collars hanging from his belt (his War Hounds run ahead of him),
olive hose and tall boots. He carries a coiled hunting whip in the near hand: a short wooden handle,
a two-part plaited lash on its own joints (it trails, coils and cracks).

"A viewer expects him to crack a whip and whistle his hounds forward, and to stride after them."

Animation (ANIM_SPEC G1 stride, appendix B for a whip: overhead crack, side-arm lash):
  idle      blows the bone whistle, the empty leashes swing, the lash coils at his feet, blink
  walk      walk v3 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s): leaning forward as if
            pulled by his hounds, the whip trailing, the leashes swinging late
  attack    OVERHEAD CRACK: cocks the whip hand high behind his head with the lash hanging down his
            back (the held extreme), then flicks it over the top and cracks it straight out in front
            (a lash smear and a crack burst at the tip)
  attack_b  SIDE-ARM LASH: turns away with the lash trailing low behind him, then lashes it round flat
            at knee height
  hit       light: the head snaps back, the cap flies up a little
  die       D1 fling and spin: the whip flies off, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "kennel_master"
GAIT_NAME = "biped"
NAME = "Kennel Master"
HEIGHT_LU = 68
CANVAS = (340, 280)
FEET = (150, 246)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

SKIN = "#E6BE9A"
BEARD = "#7A6152"
HOSE = "#6A6E5E"
BOOT = "#55483D"
LEATHER = "#6B5647"
LEATHER_DK = "#4E3F33"
WOOD = "#9A8268"
BONE = "#EDE3C8"
PARCH = "#E8DFC8"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
HANDLE = 8.0
L1 = 14.0
L2 = 14.0
H_TIP = (HR[0], HR[1] - 1.0, HR[2] + 3.0 + HANDLE)
L1_TIP = (H_TIP[0], H_TIP[1], H_TIP[2] + L1)
L2_TIP = (H_TIP[0], H_TIP[1], H_TIP[2] + L1 + L2)
CAP_C = (1.0, 0.0, 56.0)


def _cap(rig, joint):
    g = Geo().blob((1.0, 0.0, 57.6), (13.0, 12.6, 5.0), p=2.2)
    rig.part(joint, g, team=True)
    g = Geo().lathe([(12.0, -1.0), (12.8, 0.0), (12.0, 1.0)], (1.0, 0.0, 55.2), segs=24)
    rig.part(joint, g, LEATHER_DK, outline=0.5)
    g = Geo()
    for y in (-11.0, 10.6):   # ear flaps
        g.blob((-2.0, y, 50.6), (4.2, 1.8, 5.4), p=2.4)
    rig.part(joint, g, LEATHER_DK, outline=0.6)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    K.legs_v3(rig, HOSE, BOOT, cuff=LEATHER_DK, thigh_r=5.0)
    for s in ("r", "l"):   # tall boot shafts
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().blob((0.9, y, 8.6), (4.5, 4.4, 3.6), p=2.6)
        rig.part(f"shin_{s}", g, BOOT if s == "r" else "#443A31")

    # torso: a big team jerkin, a leather apron, a belt with two empty leashes and team collars
    g = Geo().blob((1.4, 0, 26.6), (12.8, 11.2, 12.2), p=2.1, taper=(1.12, 0.86))
    rig.part("torso", g, team=True)
    g = Geo().blob((2.2, 0, 22.0), (12.2, 10.0, 9.6), p=2.8)
    g.clip((7.0, 0, 0), (-1, 0, 0))
    g.clip((0, 0, 30.0), (0, 0, 1))
    rig.part("torso", g, LEATHER)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    rig.rest_offset["hem"] = (0, 0, K.V3_LIFT + 0.6)
    g = Geo().blob((0.8, 0, 15.0), (12.4, 11.0, 4.8), p=2.7, taper=(1.12, 1.0))
    rig.part("hem", g, team=True)
    g = Geo().blob((1.0, 0, 20.4), (13.2, 11.6, 1.8), p=3.2)
    rig.part("torso", g, LEATHER_DK)
    g = Geo().capsule((11.0, -3.0, 36.0), (13.6, -4.0, 27.0), 0.5)   # whistle cord
    rig.part("torso", g, LEATHER_DK, outline=0.3)
    g = Geo().capsule((13.4, -4.6, 27.2), (13.8, -4.8, 23.8), 1.0)
    rig.part("torso", g, BONE, outline=0.5)
    rig.secondary("leash", "torso", (-4.0, -11.0, 20.0), (-6.0, -12.0, 6.0), max_deg=20, gain=1.4)
    g = Geo().capsule((-4.0, -11.4, 20.0), (-5.6, -12.0, 9.0), 0.7)
    g.capsule((-6.0, -10.0, 20.0), (-9.0, -10.6, 10.0), 0.7)
    rig.part("leash", g, LEATHER, outline=0.4)
    g = Geo().lathe([(2.6, -0.6), (3.0, 0.0), (2.6, 0.6)], (-5.6, -12.0, 8.2), (-5.4, -12.4, 8.6), segs=14,
                    squash=(1.0, 1.4))
    g.lathe([(2.6, -0.6), (3.0, 0.0), (2.6, 0.6)], (-9.0, -10.6, 9.2), (-8.8, -11.0, 9.6), segs=14, squash=(1.0, 1.4))
    rig.part("leash", g, team=True, outline=0.5)

    # head: broad face, a bushy beard, a flat team cap with leather ear flaps
    head = Geo().blob((2, 0, 47.6), (11.6, 11.0, 11.0), p=2.3)
    head.blob((14.0, -0.6, 46.0), (3.6, 3.2, 3.4), p=2.0)
    beard = Geo().blob((8.0, 0, 41.0), (8.8, 11.0, 7.8), p=2.2)
    beard.blob((10.6, 0, 37.0), (5.4, 7.0, 5.2), p=2.2)
    K.face2(rig, [head], SKIN, cx=12.0, cz=49.0, eye_r=(3.5, 3.2, 4.0), brow=BEARD, brow_w=1.2,
            mouth_dz=-7.4, mouth_x=12.6, eye_at=(13.8, 49.2), mark_r=3.8, extra_geos=[beard])
    rig.part("head", head, SKIN)
    rig.part("head", beard, BEARD, finish="hair")
    rig.joint("cap", "head", CAP_C)
    _cap(rig, "cap")

    for s in ("r", "l"):
        B.arm_parts(rig, s, LEATHER, hand=SKIN, cuff=LEATHER_DK, r0=4.8, r1=4.3, fist=4.6)
        y = B.ARM_Y[s]
        g = Geo().blob((0.0, y, 36.8), (6.6, 5.8, 5.2), p=2.4)
        rig.part(f"arm_{s}", g, team=True)

    # the whip: handle in the near fist (rest up), the lash on two joints
    hx, hy, hz = HR
    rig.joint("whip", "hand_r", HR)
    g = Geo().capsule((hx, hy - 1.0, hz - 3.0), (hx, hy - 1.0, H_TIP[2]), 1.6, 1.3)
    rig.part("whip", g, WOOD)
    g = Geo().sphere((hx, hy - 1.0, hz - 3.4), 1.8, cuts=2)
    rig.part("whip", g, LEATHER_DK, outline=0.5)
    rig.joint("lash1", "whip", H_TIP)
    g = Geo().capsule(H_TIP, L1_TIP, 1.5, 1.1)
    rig.part("lash1", g, LEATHER, outline=0.5)
    rig.joint("lash2", "lash1", L1_TIP)
    g = Geo().capsule(L1_TIP, L2_TIP, 1.1, 0.7)
    rig.part("lash2", g, LEATHER, outline=0.5)
    g = Geo().blob(L2_TIP, (0.9, 0.9, 1.6), p=2.0)
    rig.part("lash2", g, PARCH, outline=0.4)
    rig.track("lashTip", "lash2", L2_TIP)

    rig.joint("whip_loose", "root", (0, 0, 30), hidden=True)
    g = Geo().capsule((-6.0, -11.0, 30.0), (6.0, -11.0, 30.0), 1.5)
    g.capsule((6.0, -11.0, 30.0), (24.0, -11.0, 26.0), 0.9, 0.5)
    rig.part("whip_loose", g, LEATHER)


# -- poses ---------------------------------------------------------------------------------
def whip(a, f, w, l1, l2):
    """Near arm (a, f), handle direction w, lash segment directions l1, l2 (world degrees)."""
    pose = B.arm("r", a, f, w, w_rest=90.0)
    pose["lash1"] = {"r": l1 - w}
    pose["lash2"] = {"r": l2 - l1}
    return pose


STANCE = merge(whip(-70, -20, 30, -60, -100), B.arm("l", -80, -50), {"torso": {"r": -2}})


def _idle(f):
    blow = [0.0, 0.3, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return merge(whip(-70, -20, 30 + 4 * ctx["lag"], -60 + 10 * ctx["lag"], -100 - 10 * ctx["lag"]),
                     B.arm("l", -80 + 120 * blow, -50 + 170 * blow),
                     {"head": {"r": 4 * blow}, "leash": {"r": 6 * ctx["lag"]}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r", "lash1", "lash2", "arm_l", "fore_l", "hand_l")}
    return M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 81.25
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED)
CARRY = merge(whip(-60, -30, -20, -150, -170), {"torso": {"r": -6}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"lash1": {"r": 10 * lag}, "lash2": {"r": 14 * lag}, "leash": {"r": 10 * lag},
                "hem": {"r": 4 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-13.0, twist=6.0, nod=3.0,
                     arms={"l": K.ArmChain("l")}, arm=36.0, elbow=(50.0, 85.0), extra=extra, report=report)


# -- attack A: overhead crack (moves.SMALL_MELEE_MS) --------------------------------------------------
#        read lift  wind HOLD smear lead CRACK over recoil settle settle
A_A = [-70, -30, 60, 120, 90, 30, -10, -16, -30, -55, -68]
A_F = [-20, 30, 120, 160, 100, 20, -10, -16, -20, -20, -20]
A_W = [30, 70, 120, 150, 100, 30, 0, -6, 0, 20, 28]
A_L1 = [-60, -80, -140, -120, 150, 90, 2, -10, -40, -55, -60]
A_L2 = [-100, -110, -130, -100, 170, 60, -4, -20, -70, -90, -98]
A_T = [-2, 2, 8, 12, 2, -8, -14, -12, -8, -4, -2]
A_X = [0.0, -1.0, -2.5, -3.5, 1.0, 4.0, 6.0, 6.0, 4.5, 2.0, 0.5]
A_Q = [-0.02, -0.06, 0.03, 0.05, 0.06, 0.02, -0.12, 0.03, -0.04, 0.02, 0.0]
A_THR = [0, -4, -8, -10, 8, 16, 22, 20, 14, 6, 2]
A_THL = [0, 4, 8, 10, -6, -12, -18, -16, -10, -4, -2]


def _attack_pose(f):
    pose = merge(whip(A_A[f], A_F[f], A_W[f], A_L1[f], A_L2[f]), B.arm("l", -70 + 0.5 * A_T[f], -30), {
        "torso": {"r": A_T[f]}, "head": {"r": -0.4 * A_T[f]},
        "thigh_r": {"r": A_THR[f]}, "thigh_l": {"r": A_THL[f]},
        "leash": {"r": [0, 2, 6, 8, -4, -10, -14, -10, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    return pose


LASH = {"kind": "arc", "joint": "lash2", "inner": L1_TIP, "outer": L2_TIP, "color": "#E8DFC8",
        "taper": 0.1, "white": 0.4, "t0": 0.0, "t1": 0.95, "lines": 2, "samples": 16}
CRACK = [{"kind": "burst", "joint": "lash2", "point": L2_TIP, "r0_lu": 4.0, "r1_lu": 10.0, "n": 7,
          "a0": -180.0, "arc": 360.0, "color": "#FFF4D6"}]


def _attack_clip():
    ov = {4: [dict(LASH, **{"from": 3})], 5: [dict(LASH, **{"from": 4})], 6: [dict(LASH, **{"from": 5}), *CRACK]}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: side-arm lash at knee height --------------------------------------------------------------
OB = [(-110, -120, -150, -170, -175), (-130, -150, -170, -185, -190), (-80, -60, -60, -120, -150),
      (-30, -10, -20, -60, -80), (-20, -10, -14, -12, -14), (-24, -14, -20, -24, -30), (-40, -24, -10, -50, -70)]
OB_YAW = [30, 40, 20, -10, -26, -30, -18]
OB_X = [-1.0, -2.5, 1.0, 4.0, 6.0, 6.0, 4.0]
OB_Z = [-1.5, -2.5, -2.0, -2.5, -3.0, -2.5, -1.5]
OB_Q = [-0.04, 0.02, 0.06, 0.02, -0.12, 0.03, -0.04]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    a, f, w, l1, l2 = OB[k]
    p = whip(a, f, w, l1, l2)
    p["arm_r"]["rz"] = -0.5 * OB_YAW[k]
    pose = merge(p, B.arm("l", -50, 0), {
        "torso": {"r": -4, "rz": OB_YAW[k]}, "head": {"rz": -0.6 * OB_YAW[k]},
        "thigh_r": {"r": [-6, -10, 8, 18, 24, 22, 14][k]}, "thigh_l": {"r": [8, 12, -6, -14, -20, -18, -12][k]},
        "shin_r": {"r": [-6, -10, -14, -18, -22, -18, -10][k]},
    }, M.body_about((0, 0, 22), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    return pose


def _attack_b():
    ov = {4: [dict(LASH, **{"from": 3})], 5: [dict(LASH, **{"from": 4})],
          6: [dict(LASH, **{"from": 5}), *CRACK,
              {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 111, "spread": 0.8}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 14 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -22 * max(a, 0)},
                "arm_r": {"r": 18 * a}, "lash1": {"r": 20 * a}, "lash2": {"r": 20 * a},
                "arm_l": {"r": 22 * a}, "cap": {"z": 1.6 * max(a, 0), "r": -6 * a},
                "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("grit") if k == 2 else None)


WHIP = {1: (12.0, 16.0, 80.0), 2: (22.0, 24.0, 200.0), 3: (32.0, 16.0, 300.0), 4: (38.0, -2.0, 360.0),
        5: (40.0, -22.0, 380.0), 6: (41.0, -26.0, 390.0), 7: (41.0, -26.0, 390.0), 9: (41.0, -26.0, 390.0)}


def _die(k):
    fl = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=12.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * fl}, "head": {"r": 14 * fl - 6},
        "arm_r": {"r": 80 * fl + 20}, "arm_l": {"r": 100 * fl + 30}, "fore_l": {"r": 40 * fl},
        "thigh_r": {"r": 40 * fl + 20}, "shin_r": {"r": -30 * fl},
        "thigh_l": {"r": -20 * fl + 10}, "shin_l": {"r": -20 * fl},
    })
    if k in WHIP:
        x, z, r = WHIP[k]
        pose["whip"] = {"hide": True}
        pose["whip_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
