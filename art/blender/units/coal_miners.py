"""Coal Miners: Industrial Age common infantry pair (CONTENT_PLAN 5.5, X0 M1 squad). Pickaxe, ~66 lu.

One card trains two miners; this sheet is one miner (the game plays the two desynchronised).

Look (A11, Industrial palette): a stocky young pitman in a soft team miner's cap with a brass
headlamp (a cream glow), a sooty face with a smudge on the cheek and the nose, a team waistcoat
with a cream cog over a grey work shirt with the sleeves rolled up, a leather belt with a lamp tin,
iron-blue trousers tied under the knee with cord, gaiters and hobnail boots. He carries a pickaxe:
a long pale-wood haft and a curved iron double pick with a bright tip.

"A viewer expects him to swing the pick point-first down into the target with a clink spark,
and to trudge-jog along with the pick on his shoulder and his headlamp bobbing."

Animation (ANIM_SPEC G1, appendix B for a pick: overhead chop, low hack, butt jab):
  idle      leans on the pick, wipes his brow with the far hand, the lamp swings, blink
  walk      walk v3 bounce jog at ground speed (card 82 x 1.25 = 102.5 lu/s): the pick sloped on
            the shoulder bobbing a frame late, the far fist pumping, the lamp tin swinging
  attack    OVERHEAD PICK CHOP: both hands high, the pick reared back over his head (the held
            extreme), then he chops it point-first down in front (a crescent smear), CLINK (spark,
            dust), and pries it back out onto the shoulder
  attack_b  KNEELING HACK: drops to one knee and hacks the pick low and flat into the target's feet
  attack_c  HAFT JAB: chokes up on the haft and rams the butt end forward with a twist
  hit       light: the head snaps back, the cap lifts, eyes squeezed
  die       D1 fling and spin: the cap pops off, the pick flies, X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "coal_miners"
GAIT_NAME = "biped"
NAME = "Coal Miners"
HEIGHT_LU = 66
CANVAS = (296, 272)
FEET = (128, 244)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 31)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
HAFT = 34.0
HEAD_Z = FIST[2] + HAFT - 1.0
TIP = (FIST[0] + 13.0, FIST[1], HEAD_Z - 5.0)       # the pick point (leads the downward chop)
CAP_C = (1.0, 0.0, 57.4)
SHIRT = "#9C9A94"          # grey work shirt
SHIRT_DK = "#85837D"
SOOT = "#5E5652"
HAFT_C = "#C9AE84"
CORD = "#D9CCB0"


def _pick(rig, joint, fist):
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 5.0), (cx, cy, cz + HAFT), 1.5, 1.3)
    rig.part(joint, g, HAFT_C, outline=0.6)
    g = Geo().capsule((cx, cy, cz - 5.0), (cx, cy, cz + 3.0), 1.9, 1.8)
    rig.part(joint, g, I.LEATHER, outline=0.5)                         # grip wrap
    hz = cz + HAFT - 1.0
    g = Geo().blob((cx, cy, hz), (3.0, 2.4, 3.2), p=2.6)              # the eye of the head
    g.capsule((cx, cy, hz), (cx + 9.0, cy, hz - 1.6), 2.2, 1.5)
    g.capsule((cx + 9.0, cy, hz - 1.6), (cx + 13.0, cy, hz - 5.0), 1.5, 0.6)   # front pick, curving down
    g.capsule((cx, cy, hz), (cx - 8.0, cy, hz - 1.2), 2.2, 1.6)
    g.capsule((cx - 8.0, cy, hz - 1.2), (cx - 11.0, cy, hz - 4.0), 1.6, 0.8)   # back pick
    rig.part(joint, g, I.IRON, finish="metal", outline=0.8)
    g = Geo().capsule((cx + 10.6, cy - 0.6, hz - 2.8), (cx + 13.0, cy - 0.6, hz - 5.0), 0.9, 0.5)
    rig.part(joint, g, I.IRON_LT, finish="metal", outline=0)          # bright worn tip
    return (cx + 13.0, cy, hz - 5.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM, gaiter=I.LEATHER_DK)
    for s in ("r", "l"):   # knee cords
        y = I.LEG_Y * I.SIDE_Y[s]
        g = Geo().lathe([(4.4, 0), (4.6, 0.8), (4.4, 1.6)], (0.6, y, KI.V3_KNEE_Z + 1.0), (0.6, y, KI.V3_KNEE_Z + 2.6),
                        segs=14)
        rig.part(f"thigh_{s}", g, CORD, outline=0.4)
    # grey shirt with a team waistcoat, a cog emblem and a belt with a lamp tin
    g = Geo().blob((0, 0, 28.0), (10.4, 9.4, 11.4), p=2.4, taper=(1.06, 0.94))
    rig.part("torso", g, SHIRT)
    vest = Geo().blob((0.4, 0, 27.0), (11.0, 10.0, 10.6), p=2.6, taper=(1.05, 0.92))
    vest.clip((0, 0, 36.0), (0, 0, 1))
    vface = F.Face(rig, "torso", [vest])
    rig.part("torso", vest, team=True)
    g = KI.cog(vface, Geo(), (9.6, 28.0), s=0.9)
    rig.part("torso", g, KI.CREAM, highlight=False, outline=0)
    g = Geo()
    for z in (24.0, 29.5):
        g.sphere((11.3, -2.4, z), 0.9, cuts=2)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0.3)
    g = Geo().blob((1.2, 0, 37.0), (7.0, 7.6, 2.4), p=2.4)
    rig.part("torso", g, SHIRT_DK)
    g = Geo().blob((0.4, 0, 18.0), (11.6, 10.6, 2.0), p=3.2)
    rig.part("hips", g, I.LEATHER)
    g = Geo().blob((0.5, 0, 15.6), (11.0, 10.2, 4.4), p=2.6, taper=(1.08, 1.0))
    g.clip((0, 0, 13.0), (0, 0, -1))
    rig.part("hips", g, team=True)
    rig.secondary("lamptin", "hips", (-6.0, -10.6, 17.6), (-6.4, -11.4, 12.0), max_deg=26, gain=1.4)
    g = Geo().capsule((-6.2, -11.4, 16.4), (-6.4, -11.6, 13.0), 2.0, 2.2)
    rig.part("lamptin", g, I.BRASS, finish="metal", outline=0.6)

    face = KI.head_face(rig, brow=I.HAIR, brow_angry=True, mouth_dz=-9.0, mouth_w=5.6)
    g = Geo()
    face.decal(g, face.hit(9.4, 44.0), F.ellipse(0, 0, 2.0, 1.2, 10), 0.4)    # soot on the cheek
    face.decal(g, face.hit(4.0, 52.4), F.ellipse(0, 0, 1.6, 0.9, 10), 0.4)    # and on the brow
    rig.part("head", g, SOOT, highlight=False, outline=0)
    I.back_hair(rig, I.HAIR)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=SHIRT, team_sleeve=False, rolled=True, fist=4.6)
        y = I.ARM_Y[s]
        g = Geo().blob((2.6, y - 1.5 * (1 if s == "r" else -1), I.HAND_Z + 0.6), (1.7, 1.6, 2.3), p=2.2)
        rig.part(f"hand_{s}", g, I.SKIN)
        g = Geo().blob((0.2, y, I.ELBOW_Z - 3.0), (4.1, 4.1, 2.4), p=2.4)
        rig.part(f"fore_{s}", g, SOOT, highlight=False, outline=0)      # soot up to the elbows
    I.shoulders(rig, team=True)

    rig.joint("pick", "hand_r", FIST)
    tip = _pick(rig, "pick", FIST)
    KI.loose(rig, "pick_loose", FIST, lambda j: _pick(rig, j, FIST))
    rig.track("pickTip", "pick", tip)
    I.fuse_spark(rig, "pick", (tip[0] + 1.0, tip[1] - 2.0, tip[2] - 1.0), size=2.0, name="clink", hidden=True)


def _cap(rig, joint):
    x, y, z = CAP_C
    g = Geo().blob((x, y, z + 1.4), (12.2, 11.6, 6.6), p=2.4)
    g.clip((x, y, z - 2.0), (0, 0, -1))
    rig.part(joint, g, team=True)
    g = Geo().blob((x + 11.0, y, z - 1.6), (5.0, 9.0, 1.1), p=2.8, rot=(0, -10, 0))
    rig.part(joint, g, I.LEATHER_DK, finish="gloss")
    g = Geo().lathe([(0, 0), (3.0, 0), (3.4, 2.6), (0, 3.0)], (x + 9.0, y, z + 2.6), (x + 12.6, y, z + 3.2), segs=16)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.6)         # the headlamp
    g = Geo().blob((x + 12.8, y, z + 3.2), (0.8, 2.4, 2.4), p=2.2)
    rig.part(joint, g, glow="#FFF1C8", outline=0)


# -- poses ---------------------------------------------------------------------------------
def grip(a, f, w, la=-80.0, lf=-50.0, lean=0.0):
    """World angles: near arm (a, f) with the pick pointing w; far arm (la, lf)."""
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean))


REST = (-60.0, 18.0, 132.0)     # pick sloped back on the shoulder
STANCE = merge(grip(-66.0, 0.0, 100.0, -70.0, -20.0, lean=-2.0), {"torso": {"r": -2.0}})   # leaning on it


def _idle(f):
    wipe = [0.0, 0.4, 1.0, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return merge(grip(-66.0, 0.0 + 2 * ctx["c"], 100.0 + 2 * ctx["lag"],
                          -70.0 + 150 * wipe, -20.0 + 180 * wipe, lean=-2.0),
                     {"head": {"r": -4 * wipe}, "lamptin": {"r": 4 * ctx["lag"]}})
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)
    if f in (2, 3):
        pose = merge(pose, F.expr("squeeze"))
    return pose


SPEED = 102.5
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=576)
CARRY = merge(grip(*REST, lean=-8.0), {"torso": {"r": -3.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -8 * lag}, "arm_r": {"r": 4 * lag}, "fore_r": {"r": -3 * lag},
                "hat": {"r": -2.0 * lag}, "lamptin": {"r": 8 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-9.0, twist=7.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=36.0, extra=extra, report=report)


# -- attack A: overhead pick chop (moves.SMALL_MELEE_MS, impact on 6) -------------------------------
# frames: read, hitch, rise, HOLD (pick reared back over his head, both hands up), smear, smear,
# IMPACT (point-first in front, deep squash), pry, recoil, settle, settle. World angles.
#        read  hitch rise HOLD smear smear IMP pry  recoil settle settle
A_A = [-60, -40, 50, 100, 66, 18, -16, -24, -40, -52, -58]
A_F = [18, 50, 110, 132, 52, -2, -30, -40, -14, 4, 14]
A_W = [132, 140, 150, 172, 74, 4, -36, -44, 10, 90, 126]
A_LA = [-70, -50, 40, 92, 60, 12, -30, -36, -60, -70, -72]
A_LF = [-30, 20, 100, 126, 46, -8, -48, -56, -34, -26, -28]
A_T = [-3, 0, 6, 10, -6, -14, -22, -20, -10, -5, -3]
A_X = [0.0, -0.5, -1.0, -2.0, 1.5, 4.5, 7.0, 7.0, 4.0, 1.5, 0.5]
A_Z = [0.0, 0.0, 1.0, 2.4, 2.0, 0.0, -4.4, -3.4, -1.4, -0.4, 0.0]
A_Q = [0.0, 0.02, 0.05, 0.10, 0.08, 0.02, -0.16, -0.08, -0.05, 0.0, 0.0]
A_THR = [2, 0, -4, -6, 12, 20, 30, 28, 14, 6, 2]
A_SHR = [0, -4, -8, -12, -14, -18, -34, -30, -10, -4, 0]
A_THL = [-2, 2, 8, 10, -8, -16, -26, -26, -12, -6, -2]
A_SHL = [0, -6, -10, -12, -8, -8, -22, -18, -6, -2, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(grip(A_A[f], A_F[f], A_W[f], A_LA[f], A_LF[f], lean=t), {
        "torso": {"r": t, "rz": -6 if f in (2, 3) else 4 if f in (5, 6, 7) else 0},
        "head": {"r": -0.5 * t},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "clink": {"show": f == 6},
        "lamptin": {"r": [0, 0, -6, -10, 4, 10, 14, 10, 4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f == 3:
        pose = merge(pose, {"foot_r": {"r": -14}, "foot_l": {"r": -16}})
    if f in (4, 5):
        pose["pick"] = {"sz": 1.16}
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -14, "l": -16} if f == 3 else None)


ARC = {"kind": "arc", "joint": "pick", "inner": (FIST[0], FIST[1], FIST[2] + HAFT * 0.5),
       "outer": (FIST[0] + 6.0, FIST[1], HEAD_Z), "color": I.IRON_LT, "white": 0.35, "taper": 0.15, "lines": 3}


def _impact_fx(seed):
    return [{"kind": "burst", "joint": "pick", "point": TIP, "r0_lu": 7.0, "r1_lu": 14.0, "n": 7,
             "a0": 20.0, "arc": 160.0, "color": "#FFF4D6"},
            {"kind": "dust", "joint": "pick", "point": TIP, "ground_snap": True, "size_lu": 7.0,
             "puffs": 4, "seed": seed, "spread": 1.2}]


def _attack_clip():
    ov = {
        4: [dict(ARC, **{"from": 3, "t0": 0.0, "t1": 0.95})],
        5: [dict(ARC, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(ARC, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2})] + _impact_fx(41),
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: kneeling hack: drops to one knee, the pick cocked back low behind his hip (the held
# extreme), then hacks it flat and low into the target's feet. Unique frames 0, 1, 9, 10 are A's.
#        drop HOLD smear smear IMP  bounce recoil
B_A = [-110, -150, -120, -60, -12, -10, -30]
B_F = [-130, -170, -110, -40, -8, -6, -20]
B_W = [190, 200, 120, 40, -6, -8, 20]
B_LA = [-60, -40, -90, -110, -40, -40, -60]
B_LF = [-40, -10, -80, -110, -30, -30, -40]
B_T = [-4, 4, -8, -16, -20, -18, -10]
B_TZ = [12, 22, 6, -10, -16, -14, -6]
B_DROP = [8.0, 14.0, 14.0, 14.0, 13.0, 13.5, 8.0]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(grip(B_A[k], B_F[k], B_W[k], B_LA[k], B_LF[k], lean=t), {
        "torso": {"r": t, "rz": B_TZ[k]},
        "head": {"r": -0.4 * t, "rz": -0.5 * B_TZ[k]},
        "clink": {"show": k == 4},
    }, M.body_about((0, 0, 22), x=[0.0, -1.0, 1.0, 3.0, 5.0, 5.0, 2.0][k], q=[0.0, -0.06, 0.04, 0.06, -0.12, 0.03, 0.0][k]))
    if k in (2, 3):
        pose["pick"] = {"sz": 1.14}
    pose = KI.kneel(RIG, pose, LEGS, drop=B_DROP[k], front=12.0)
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return pose


def _attack_b():
    hack = dict(ARC, t0=0.0, t1=0.95, lines=3)
    ov = {
        4: [dict(hack, **{"from": 3})],
        5: [dict(hack, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(hack, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2})] + _impact_fx(43),
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse)


# -- attack C: haft jab: chokes up, the pick held level at his chest with the butt forward, then rams
# the butt end straight ahead with a twist. Steps: A read 30, tuck 40, draw 70, HOLD 105, smear 25,
# lead 20 | IMPACT 120, twist 60, recoil 50, A settle 70, A settle 90
C_MS = [30, 40, 70, 105, 25, 20, 120, 60, 50, 70, 90]
#        tuck draw HOLD smear lead IMP  twist recoil
C_A = [-74, -120, -150, -96, -50, -20, -18, -40]
C_F = [10, -30, -50, -20, -10, -12, -6, 10]
C_W = [196, 186, 182, 180, 178, 176, 196, 160]
C_LA = [-70, -40, -20, -40, -60, -70, -66, -70]
C_LF = [-10, 20, 30, 10, -10, -20, -16, -20]
C_T = [-6, -2, 4, -8, -14, -18, -16, -10]
C_TZ = [8, 20, 30, 12, -4, -16, -18, -8]
C_X = [0.5, -1.5, -3.0, 2.0, 6.0, 10.0, 10.5, 7.0]
C_Z = [-1.0, -2.4, -3.6, -3.0, -2.8, -3.4, -2.8, -1.6]


def _c_pose(i):
    if i in (0, 9, 10):
        return _attack_pose(i)
    k = i - 1
    t = C_T[k]
    pose = merge(grip(C_A[k], C_F[k], C_W[k], C_LA[k], C_LF[k], lean=t), {
        "torso": {"r": t, "rz": C_TZ[k]},
        "head": {"r": -0.3 * t, "rz": -0.5 * C_TZ[k]},
        "thigh_r": {"r": [6, 14, 22, 26, 30, 36, 34, 22][k]}, "shin_r": {"r": [-8, -24, -36, -30, -26, -28, -24, -14][k]},
        "thigh_l": {"r": [-6, -14, -22, -26, -32, -38, -34, -20][k]}, "shin_l": {"r": [-6, -14, -20, -12, -6, -4, -4, -4][k]},
        "pick": {"z": [0, -6, -10, -10, -10, -10, -10, -6][k]},
    }, M.body_about((0, 0, 22), x=C_X[k], z=C_Z[k], q=[-0.04, -0.08, -0.10, 0.06, 0.04, -0.12, 0.03, -0.04][k]))
    if k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (3, 4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS)


BUTT = (FIST[0], FIST[1], FIST[2] - 5.0)


def _attack_c():
    jab = {"kind": "streak", "joint": "pick", "point": BUTT, "color": I.WOOD_LT, "width_lu": 7.0, "white": 0.35}
    ov = {
        4: [dict(jab, **{"from": 3, "t0": 0.0, "t1": 1.0})],
        5: [dict(jab, **{"from": 3, "t0": 0.2, "t1": 1.0, "width_lu": 6.0})],
        6: [dict(jab, **{"from": 4, "t0": 0.4, "t1": 1.0, "width_lu": 5.0}),
            {"kind": "burst", "joint": "pick", "point": BUTT, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
             "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 47, "spread": 0.8}],
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
    return M.hit_light(k, CARRY, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


PICK_PATH = [None, (6, 20, 60), (10, 36, 170), (14, 40, 300), (18, 30, 420), (21, 14, 520),
             (23, 0, 590), (24, -6, 612), (24, -6, 612), (24, -6, 612)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(CARRY, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
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
    wp = PICK_PATH[k]
    if wp is not None:
        x, z, r = wp
        pose["pick"] = {"hide": True}
        pose["pick_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
