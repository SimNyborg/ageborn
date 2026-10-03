"""Clockwork Soldier: the Clockwork Tinker's summon (CONTENT_PLAN 5.5, X0 M3). A wind-up toy soldier, ~58 lu.

Look (A11, Industrial palette): a painted tin toy soldier: a tall team shako with a cream plume and
a brass plate, a glossy round face with rosy painted cheeks and dot eyes, a team tunic with cream
crossbelts and brass buttons, cream trousers with a team stripe, glossy black boots, and a big brass
wind-up key in his back that turns. He carries a toy rifle with a bayonet. The game draws summons at
0.8 scale with a summon ring (CONTENT_PLAN 7).

"A viewer expects him to march stiffly like a toy and jab with the bayonet, the key turning."

Animation (ANIM_SPEC G1 march, appendix B for a bayonet: thrust, overhead drive, rising jab):
  idle      presents arms, the key ticks round, blink
  walk      walk v3 stiff march at ground speed (card 80 x 1.25 = 100 lu/s), the rifle at the
            slope, the key turning every frame
  attack    BAYONET THRUST: draws the rifle back level at the hip (the held extreme), a straight
            jab (a thrust streak) and a tin "tink" spark
  attack_b  OVERHEAD DRIVE: rifle high point-down, driven down into the target
  attack_c  RISING JAB: crouched with the bayonet low, then a rising stab
  hit       a stiff jolt (tin), the shako wobbles
  die       D1 fling: the key and the shako pop off, springs, X eyes
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "clockwork_soldier"
GAIT_NAME = "biped"
NAME = "Clockwork Soldier"
HEIGHT_LU = 66
CANVAS = (320, 280)
FEET = (130, 250)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.6, I.HAND_Z - 0.4)
BODY_L = 22.0        # rifle from the grip
BIT_L = 9.0
TIP = (FIST[0], FIST[1], FIST[2] + BODY_L + BIT_L)
CAP_C = (1.0, 0.0, 57.0)
STEEL = "#A9B0B8"
TIN = "#E6DED0"
CHEEK = "#D99A8E"
GLOSS = "#2A2829"
WOOD = "#9C7652"


def _drill(rig, joint, fist):
    """A toy rifle along +Z from the fist (stock behind, barrel ahead) with a bayonet; returns the point."""
    cx, cy, cz = fist
    g = Geo().blob((cx, cy, cz - 4.0), (2.4, 1.8, 5.0), p=2.6)                 # stock
    g.capsule((cx, cy, cz), (cx, cy, cz + BODY_L * 0.55), 1.8, 1.6)
    rig.part(joint, g, WOOD, finish="gloss", outline=0.6)
    g = Geo().capsule((cx, cy, cz + BODY_L * 0.4), (cx, cy, cz + BODY_L), 1.0, 1.0)
    rig.part(joint, g, I.IRON_DK, finish="metal", outline=0.6)                 # barrel
    g = Geo()
    for z in (BODY_L * 0.35, BODY_L * 0.7):
        g.lathe([(1.9, 0), (2.1, 0.6), (1.9, 1.2)], (cx, cy, cz + z), (cx, cy, cz + z + 1.2), segs=12)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.3)
    z0 = cz + BODY_L
    g = Geo().lathe([(1.0, 0), (0.9, BIT_L * 0.7), (0.15, BIT_L)], (cx, cy - 0.6, z0), (cx, cy - 0.6, z0 + BIT_L), segs=10)
    rig.part(joint, g, STEEL, finish="metal", outline=0.6)                    # bayonet
    return (cx, cy, z0 + BIT_L)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=TIN, boot=GLOSS)
    for s in ("r", "l"):   # team trouser stripe
        y = I.LEG_Y * I.SIDE_Y[s]
        g = Geo().capsule((2.6, y - 2.6 * I.SIDE_Y[s] * -1, KI.V3_THIGH_Z), (3.4, y, KI.V3_KNEE_Z), 1.1)
        rig.part(f"thigh_{s}", g, team=True, outline=0)
    tunic = Geo().blob((0, 0, 27.6), (10.2, 9.2, 11.2), p=2.4, taper=(1.04, 0.96))
    tunic.blob((0.3, 0, 17.6), (10.6, 9.6, 4.6), p=2.6)
    rig.part("torso", tunic, team=True, finish="gloss")
    g = Geo().capsule((9.8, -8.0, 36.0), (9.6, 7.0, 19.0), 1.4)
    g.capsule((9.8, 7.0, 36.0), (9.6, -8.0, 19.0), 1.4)
    rig.part("torso", g, TIN, outline=0.5)                                    # crossbelts
    g = Geo()
    for z in (24.0, 29.0, 33.5):
        g.sphere((10.6, -2.0, z), 0.9, cuts=2)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0.3)
    g = Geo().blob((0.2, 0, 20.4), (10.8, 9.8, 1.8), p=3.2)
    rig.part("torso", g, GLOSS, finish="gloss")
    # the wind-up key in his back (it turns on its own joint)
    rig.joint("key", "torso", (-12.0, 0, 29.0))
    g = Geo().capsule((-9.0, 0, 29.0), (-15.0, 0, 29.0), 1.2)
    rig.part("key", g, I.BRASS, finish="metal", outline=0.5)
    g = Geo()
    for sz in (-1, 1):
        g.blob((-16.0, 0, 29.0 + sz * 4.4), (1.4, 1.4, 3.8), p=2.4)
    rig.part("key", g, I.BRASS_LT, finish="metal", outline=0.7)
    I.steam_puff(rig, "key", (-14.0, 0, 36.0), size=0.8, name="vent")

    face = KI.head_face(rig, skin=TIN, brow=GLOSS, brow_angry=False, mouth_dz=-9.0, mouth_w=4.6)
    g = Geo()
    face.decal(g, face.hit(10.6, 44.6), F.ellipse(0, 0, 2.0, 1.4, 12), 0.4)
    rig.part("head", g, CHEEK, highlight=False, outline=0)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, hand=TIN, fist=4.2, cuff=TIN, glove_finish="gloss")
    I.shoulders(rig, team=True)

    rig.joint("rifle", "hand_r", FIST)
    tip = _drill(rig, "rifle", FIST)
    KI.loose(rig, "rifle_loose", FIST, lambda j: _drill(rig, j, FIST))
    rig.track("bayonet", "rifle", tip)
    I.fuse_spark(rig, "rifle", (tip[0] + 0.5, tip[1] - 2.0, tip[2] + 1.0), size=2.2, name="sparks", hidden=True)


def _cap(rig, joint):
    """A tall team shako with a brass plate, a glossy peak and a cream plume."""
    x, y, z = CAP_C
    g = Geo().lathe([(0, 0), (9.6, 0), (10.6, 9.0), (10.8, 11.0), (0, 11.4)], (x - 0.6, y, z - 2.0), (x - 1.0, y, z + 9.4),
                    segs=24)
    rig.part(joint, g, team=True, finish="gloss")
    g = Geo().blob((x + 10.0, y, z - 1.4), (4.6, 8.4, 0.9), p=2.8, rot=(0, -12, 0))
    rig.part(joint, g, GLOSS, finish="gloss")
    g = Geo().blob((x + 9.8, y, z + 4.0), (0.8, 3.4, 3.6), p=2.4)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.4)
    g = Geo().blob((x, y, z + 13.4), (2.4, 2.4, 3.6), p=2.2)
    rig.part(joint, g, TIN, outline=0.5)


def grip(a, f, w, la=None, lf=None, lean=0.0):
    """Near arm (a, f) holds the rear grip with the drill pointing w; the far arm reaches the side grip."""
    la = a + 8 if la is None else la
    lf = f + 14 if lf is None else lf
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean))


REST = (-70.0, 10.0, 104.0)
STANCE = merge(grip(-70.0, -10.0, 40.0, lean=-2.0), {"torso": {"r": -2.0}})


def _idle(f):
    rev = [0.0, 0.5, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return merge(grip(-70.0, -10.0 + 2 * ctx["c"], 40.0 + 3 * ctx["lag"], lean=-2.0),
                     {"head": {"r": 6 * rev}, "pupils": {"z": -0.6 * rev}, "key": {"rx": 60 * f},
                      "vent": {"show": f in (2, 3), "s": 0.7 + 0.2 * rev}})
    return M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 100.0
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=560)
CARRY = merge(grip(*REST, lean=-7.0), {"torso": {"r": -3.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -6 * lag}, "arm_r": {"r": 4 * lag}, "hat": {"r": -2.0 * lag},
                "key": {"rx": 45 * f}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-4.0, twist=3.0, nod=1.0, extra=extra, report=report)


# -- attack A: braced plunge (moves.SMALL_MELEE_MS, impact on 6). World angles.
#        read  tuck  draw HOLD  smear lead IMP  shove recoil settle settle
A_A = [-64, -80, -130, -150, -96, -50, -20, -18, -40, -56, -62]
A_F = [10, -20, -40, -46, -14, -6, -4, -4, 4, 8, 10]
A_W = [120, 60, 6, 2, 0, 0, 0, 2, 30, 80, 112]
A_T = [-3, -4, 4, 6, -8, -14, -18, -16, -10, -5, -3]
A_TZ = [0, 8, 22, 30, 12, -4, -16, -18, -8, -2, 0]
A_X = [0.0, -0.5, -2.0, -3.0, 2.0, 6.0, 10.0, 10.5, 6.0, 2.0, 0.5]
A_Z = [0.0, -1.0, -2.4, -3.6, -3.0, -2.8, -3.4, -2.8, -1.6, -0.6, 0.0]
A_Q = [0.0, -0.04, -0.08, -0.10, 0.06, 0.04, -0.12, 0.03, -0.04, 0.0, 0.0]
A_THR = [2, 6, 14, 22, 26, 30, 36, 34, 22, 8, 2]
A_SHR = [0, -8, -24, -36, -30, -26, -28, -24, -14, -4, 0]
A_THL = [-2, -6, -14, -22, -26, -32, -38, -34, -20, -8, -2]
A_SHL = [0, -6, -14, -20, -12, -6, -4, -4, -4, -2, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(grip(A_A[f], A_F[f], A_W[f], lean=t), {
        "torso": {"r": t, "rz": A_TZ[f]},
        "head": {"r": -0.3 * t, "rz": -0.5 * A_TZ[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "sparks": {"show": f in (6, 7)},
        "vent": {"show": f in (6, 7, 8), "s": [1, 1, 1, 1, 1, 1, 1.0, 1.3, 1.5, 1, 1][f]},
        "key": {"rx": 33 * f},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose["rifle"] = {"sz": 1.12}
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _spin(point, frm=None):
    return {"kind": "rings", "joint": "rifle", "point": point, "radii_lu": (3.0, 5.0), "a0": -80.0, "a1": 260.0,
            "color": "#FFF4D6"}


def _sparks(seed, a0=-40.0):
    return [{"kind": "burst", "joint": "rifle", "point": TIP, "r0_lu": 6.0, "r1_lu": 15.0, "n": 8,
             "a0": a0, "arc": 160.0, "color": "#FFF4D6"},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": seed, "spread": 0.8}]


def _attack_clip():
    jab = {"kind": "streak", "joint": "rifle", "point": TIP, "color": STEEL, "width_lu": 8.0, "white": 0.35}
    ov = {
        3: [_spin(TIP)],
        4: [dict(jab, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(jab, **{"from": 3, "t0": 0.2, "t1": 1.0, "width_lu": 7.0})],
        6: [dict(jab, **{"from": 4, "t0": 0.4, "t1": 1.0, "width_lu": 6.0}), _spin(TIP)] + _sparks(61),
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, extra={"holdStep": 3})


# -- attack B: overhead drive. Unique frames 0, 1, 9, 10 are A's.
#        rise HOLD smear smear IMP  bounce recoil
B_A = [40, 100, 70, 20, -10, -16, -30]
B_F = [96, 130, 60, 10, -20, -26, -10]
B_W = [150, 190, 120, -40, -70, -74, -20]
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
    pose = merge(grip(B_A[k], B_F[k], B_W[k], lean=t), {
        "torso": {"r": t, "rz": -6 if k < 2 else 4},
        "head": {"r": -0.5 * t},
        "thigh_r": {"r": B_THR[k]}, "shin_r": {"r": B_SHR[k]},
        "thigh_l": {"r": B_THL[k]}, "shin_l": {"r": B_SHL[k]},
        "sparks": {"show": k == 4},
        "vent": {"show": k in (4, 5), "s": 1.2},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    if k == 1:
        pose = merge(pose, {"foot_r": {"r": -18}, "foot_l": {"r": -20}})
    if k in (2, 3):
        pose["rifle"] = {"sz": 1.12}
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -18, "l": -20} if k == 1 else None)


def _attack_b():
    arc = {"kind": "arc", "joint": "rifle", "inner": (FIST[0], FIST[1], FIST[2] + BODY_L * 0.6), "outer": TIP,
           "color": STEEL, "white": 0.35, "taper": 0.15, "lines": 3}
    ov = {
        4: [dict(arc, **{"from": 3, "t0": 0.0, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(arc, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2}), _spin(TIP)] + _sparks(63, a0=10.0),
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: rising bore. Unique frames 0, 9, 10 are A's; 1 tuck, 2 crouch, 3 HOLD (bit low, angled
# up), 4-5 smear, 6 IMPACT (up on the toes, bit up and forward), 7 grind, 8 recoil.
#        tuck crouch HOLD smear lead IMP grind recoil
C_A = [-80, -120, -140, -110, -60, -30, -28, -44]
C_F = [-20, -60, -80, -40, -10, 10, 12, 10]
C_W = [60, -10, -20, 0, 20, 34, 36, 50]
C_T = [-4, 2, 8, -2, -10, -14, -12, -8]
C_X = [0.0, -1.0, -2.0, 2.0, 5.0, 8.0, 8.5, 5.0]
C_Z = [-1.0, -4.0, -6.0, -4.0, -1.0, 1.5, 1.0, -0.6]


def _c_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    t = C_T[k]
    pose = merge(grip(C_A[k], C_F[k], C_W[k], lean=t), {
        "torso": {"r": t, "rz": [6, 14, 20, 10, -4, -10, -10, -4][k]},
        "head": {"r": -0.3 * t},
        "thigh_r": {"r": [10, 30, 44, 34, 20, 10, 10, 8][k]}, "shin_r": {"r": [-14, -50, -70, -50, -24, -6, -6, -6][k]},
        "thigh_l": {"r": [-8, -20, -30, -30, -28, -24, -22, -14][k]}, "shin_l": {"r": [-10, -30, -40, -24, -10, -4, -4, -4][k]},
        "sparks": {"show": k in (5, 6)},
        "vent": {"show": k in (5, 6), "s": 1.1},
    }, M.body_about((0, 0, 22), x=C_X[k], z=C_Z[k], q=[-0.02, -0.08, -0.12, 0.02, 0.06, 0.08, -0.04, 0.0][k]))
    if k in (5,):
        pose = merge(pose, {"foot_r": {"r": -14}, "foot_l": {"r": -16}})
    if k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (3, 4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -14, "l": -16} if k == 5 else None)


def _attack_c():
    jab = {"kind": "streak", "joint": "rifle", "point": TIP, "color": STEEL, "width_lu": 7.0, "white": 0.35}
    ov = {
        4: [dict(jab, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(jab, **{"from": 3, "t0": 0.2, "t1": 1.0, "width_lu": 6.0})],
        6: [dict(jab, **{"from": 4, "t0": 0.4, "t1": 1.0, "width_lu": 5.0}), _spin(TIP)] + _sparks(67, a0=-20.0),
    }
    reuse = {0: ("attack", 0), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=6, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 12 * a}, "arm_l": {"r": 14 * a},
                "hat": {"z": 2.5 * max(a, 0), "r": 8 * a}, "brow": {"z": 1.6 * max(a, 0)}, "key": {"rx": 30 * a}}
    return M.hit_light(k, CARRY, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


RIFLE_PATH = [None, (6, 20, 60), (10, 36, 170), (14, 40, 300), (18, 30, 420), (21, 14, 520),
              (23, 0, 590), (24, -6, 612), (24, -6, 612), (24, -6, 612)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(CARRY, M.die_d1(k, center_z=28.0, lie_z=12.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
        "vent": {"show": k in (1, 2, 3), "s": 1.4},
    })
    hp = KI.HAT_POP[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    wp = RIFLE_PATH[k]
    if wp is not None:
        x, z, r = wp
        pose["rifle"] = {"hide": True}
        pose["rifle_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
