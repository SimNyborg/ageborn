"""Steam Driller: Industrial Age rare melee Anti-heavy (CONTENT_PLAN 5.5). Steam drill, reach 40, ~68 lu.

Look (A11, Industrial palette): a broad tunnel engineer in team overalls (a cream cog on the bib)
over a cream shirt, a dark rubber apron, a team skull cap with brass goggles pushed up, a short
dark beard, gauntlets and hobnail boots. A small iron boiler on his back feeds a thick hose (a
follow-through secondary) to a big two-handed steam drill: an iron barrel with brass bands, a
pressure gauge, side grips and a long fluted steel bit with a hard point.

"A viewer expects him to brace, spin the drill up and plunge it straight into armour with a spray
of sparks, and to stomp along with the drill on his shoulder and the hose swinging."

Animation (ANIM_SPEC G1 stomp, appendix B for a spear-like thrust weapon):
  idle      revs the drill (a little bit spin ring), checks the gauge, blink
  walk      walk v3 bounce jog at ground speed (card 70 x 1.25 = 87.5 lu/s), a heavy stomp: the drill
            sloped up on his shoulder bobbing a frame late, the hose and apron swinging
  attack    BRACED PLUNGE: plants his feet wide and draws the drill back at the hip, level, the bit
            spinning up (a ring at the point; the held extreme), then a straight plunge forward
            (a thrust streak), SCREECH: a fan of sparks at the point, steam from the boiler
  attack_b  OVERHEAD DRIVE: heaves the drill up over his head point-down, then drives it down into
            the target in front (a downward arc), sparks and dust
  attack_c  RISING BORE: crouches with the bit low and angled up, then bores up and forward into the
            target's belly, rising onto his toes
  hit       light: the head snaps back, the goggles bounce
  die       D1 fling and spin: the cap and goggles pop off, the drill flies, X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "steam_driller"
GAIT_NAME = "biped"
NAME = "Steam Driller"
HEIGHT_LU = 68
CANVAS = (320, 280)
FEET = (130, 250)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.6, I.HAND_Z - 0.4)
BODY_L = 14.0        # barrel from the rear grip
BIT_L = 18.0
TIP = (FIST[0], FIST[1], FIST[2] + BODY_L + BIT_L)
CAP_C = (1.0, 0.0, 57.0)
RUBBER = "#3E3B3C"
BEARD = "#4A3A2E"
STEEL = "#A9B0B8"


def _drill(rig, joint, fist):
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 3.0), (cx, cy, cz + 2.0), 2.0, 2.0)
    rig.part(joint, g, I.LEATHER_DK, outline=0.5)                         # rear grip
    g = Geo().lathe([(3.4, 0), (4.4, 1.5), (4.6, 9.0), (4.0, 12.0), (2.6, 14.0)], (cx, cy, cz + 1.0),
                    (cx, cy, cz + 1.0 + BODY_L), segs=18)
    rig.part(joint, g, I.IRON, finish="metal", outline=0.8)               # barrel
    g = Geo()
    for z in (4.0, 9.5):
        g.lathe([(4.6, 0), (4.9, 0.8), (4.6, 1.6)], (cx, cy, cz + z), (cx, cy, cz + z + 1.6), segs=18)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.4)           # brass bands
    g = Geo().capsule((cx + 4.0, cy, cz + 7.0), (cx + 8.0, cy, cz + 7.6), 1.4)
    rig.part(joint, g, I.LEATHER_DK, outline=0.5)                         # side grip
    KI.gauge(rig, joint, (cx - 3.6, cy - 3.0, cz + 7.0), r=2.4, name="dgauge", normal=(-0.4, -1.0))
    z0 = cz + 1.0 + BODY_L
    g = Geo().lathe([(2.4, 0), (2.2, BIT_L * 0.55), (1.4, BIT_L * 0.9), (0.2, BIT_L)], (cx, cy, z0),
                    (cx, cy, z0 + BIT_L), segs=14)
    rig.part(joint, g, STEEL, finish="metal", outline=0.7)                # the fluted bit
    g = Geo()
    for k in range(4):                                                    # flutes as dark bands
        z = z0 + 2.5 + k * 3.6
        g.capsule((cx - 2.3, cy - 0.6, z), (cx + 2.3, cy - 0.6, z + 2.0), 0.6)
    rig.part(joint, g, I.IRON_DK, finish="metal", outline=0)
    return (cx, cy, z0 + BIT_L)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, team=True, cuff=I.IRON)
    I.overalls(rig, hem_z=13.0)
    bib = Geo().blob((6.4, 0, 30.0), (4.9, 7.9, 6.5), p=3.2)
    bface = F.Face(rig, "torso", [bib])
    g = KI.cog(bface, Geo(), (10.8, 28.0), s=0.95)
    rig.part("torso", g, KI.CREAM, highlight=False, outline=0)
    # a dark rubber apron over the front of the legs (hem well above the soles)
    rig.secondary("apron", "hips", (8.0, 0, 18.0), (9.0, 0, 11.0), max_deg=18, gain=1.2)
    g = Geo().blob((10.4, 0, 15.0), (1.8, 8.4, 5.4), p=2.6)
    rig.part("apron", g, RUBBER, finish="gloss", outline=0.6)
    # the back boiler and its hose
    rig.joint("boiler", "torso", (-10.0, 0, 30.0))
    g = Geo().capsule((-11.0, 1.0, 22.0), (-11.0, 1.0, 36.0), 5.4)
    rig.part("boiler", g, I.IRON_DK, finish="metal", outline=0.8)
    g = Geo()
    for z in (24.5, 33.0):
        g.lathe([(5.5, 0), (5.8, 0.8), (5.5, 1.6)], (-11.0, 1.0, z), (-11.0, 1.0, z + 1.6), segs=18)
    rig.part("boiler", g, I.BRASS_LT, finish="metal", outline=0.4)
    g = Geo().capsule((-11.0, 1.0, 37.0), (-11.0, 1.0, 41.0), 1.4)
    rig.part("boiler", g, I.COAL, outline=0.5)                           # vent stack
    I.steam_puff(rig, "boiler", (-11.0, 1.0, 44.0), size=1.4, name="vent")
    rig.secondary("hose", "torso", (-6.0, -8.0, 24.0), (2.0, -12.0, 15.0), max_deg=24, gain=1.4)
    g = Geo().capsule((-6.0, -8.0, 24.0), (-2.0, -11.0, 17.0), 1.6)
    g.capsule((-2.0, -11.0, 17.0), (3.0, -12.0, 17.5), 1.6)
    rig.part("hose", g, RUBBER, finish="gloss", outline=0.5)

    face = KI.head_face(rig, brow=BEARD, brow_angry=True, mouth_dz=-9.0, mouth_w=5.8)
    g = Geo().blob((9.0, 0, 41.0), (6.2, 9.4, 4.4), p=2.2)               # short beard
    rig.part("head", g, BEARD, finish="hair")
    del face
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=I.CREAM, team_sleeve=False, rolled=True, fist=4.8)
        y = I.ARM_Y[s]
        g = Geo().lathe([(4.6, 0), (5.0, 1.6), (4.6, 3.6)], (0, y, I.HAND_Z + 2.0), (0, y, I.HAND_Z + 6.0), segs=14)
        rig.part(f"fore_{s}", g, I.LEATHER_DK, outline=0.5)              # gauntlet cuffs
    I.shoulders(rig, team=True)

    rig.joint("drill", "hand_r", FIST)
    rig.rest_scale["drill"] = 1.2
    tip = _drill(rig, "drill", FIST)
    KI.loose(rig, "drill_loose", FIST, lambda j: _drill(rig, j, FIST))
    rig.track("drillTip", "drill", tip)
    I.fuse_spark(rig, "drill", (tip[0] + 0.5, tip[1] - 2.0, tip[2] + 1.0), size=2.2, name="sparks", hidden=True)


def _cap(rig, joint):
    x, y, z = CAP_C
    g = Geo().blob((x - 0.6, y, z + 0.8), (12.0, 11.4, 6.4), p=2.4)
    g.clip((x, y, z - 2.0), (0, 0, -1))
    rig.part(joint, g, team=True)
    I.goggles(rig, at=(x + 9.0, 0, z + 0.4), joint=joint, rim=I.BRASS_LT)


def grip(a, f, w, la=None, lf=None, lean=0.0):
    """Near arm (a, f) holds the rear grip with the drill pointing w; the far arm reaches the side grip."""
    la = a + 8 if la is None else la
    lf = f + 14 if lf is None else lf
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean))


REST = (-64.0, 10.0, 120.0)
STANCE = merge(grip(-70.0, -10.0, 40.0, lean=-2.0), {"torso": {"r": -2.0}})


def _idle(f):
    rev = [0.0, 0.5, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return merge(grip(-70.0, -10.0 + 2 * ctx["c"], 40.0 + 3 * ctx["lag"], lean=-2.0),
                     {"head": {"r": 6 * rev}, "pupils": {"z": -0.6 * rev}, "hose": {"r": 4 * ctx["lag"]},
                      "vent": {"show": f in (2, 3), "s": 0.7 + 0.2 * rev}})
    return M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 87.5
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=616)
CARRY = merge(grip(*REST, lean=-7.0), {"torso": {"r": -3.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -6 * lag}, "arm_r": {"r": 4 * lag}, "hat": {"r": -2.0 * lag},
                "hose": {"r": 8 * lag}, "apron": {"r": 6 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-7.0, twist=6.0, nod=3.0, extra=extra, report=report)


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
        "hose": {"r": [0, 0, 6, 10, -4, -10, -14, -10, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose["drill"] = {"sz": 1.12}
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _spin(point, frm=None):
    return {"kind": "rings", "joint": "drill", "point": point, "radii_lu": (3.0, 5.0), "a0": -80.0, "a1": 260.0,
            "color": "#FFF4D6"}


def _sparks(seed, a0=-40.0):
    return [{"kind": "burst", "joint": "drill", "point": TIP, "r0_lu": 6.0, "r1_lu": 15.0, "n": 8,
             "a0": a0, "arc": 160.0, "color": "#FFF4D6"},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": seed, "spread": 0.8}]


def _attack_clip():
    jab = {"kind": "streak", "joint": "drill", "point": TIP, "color": STEEL, "width_lu": 8.0, "white": 0.35}
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
        pose["drill"] = {"sz": 1.12}
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -18, "l": -20} if k == 1 else None)


def _attack_b():
    arc = {"kind": "arc", "joint": "drill", "inner": (FIST[0], FIST[1], FIST[2] + BODY_L * 0.6), "outer": TIP,
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
    jab = {"kind": "streak", "joint": "drill", "point": TIP, "color": STEEL, "width_lu": 7.0, "white": 0.35}
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
                "hat": {"z": 2.5 * max(a, 0), "r": 8 * a}, "brow": {"z": 1.6 * max(a, 0)}, "hose": {"r": 10 * a}}
    return M.hit_light(k, CARRY, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


DRILL_PATH = [None, (6, 20, 60), (10, 36, 170), (14, 40, 300), (18, 30, 420), (21, 14, 520),
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
    wp = DRILL_PATH[k]
    if wp is not None:
        x, z, r = wp
        pose["drill"] = {"hide": True}
        pose["drill_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
