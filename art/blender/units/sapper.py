"""Sapper: Industrial Age Epic siege (docs/design-lane-ages.md A17.10). 240 vs the base / 2.0 s
(12 vs units), melee, fast (speed 85), medium, ~70 lu. siegeOnly: runs for the base. Short Fuse: on
death the charge goes off for 180 splash r60 (the game adds fx.explosion_m).

Look (A17.12, Industrial palette): a wiry demolition man in a running crouch. A padded leather
helmet with a small brass lamp (a warm glow) and goggles pushed up, a cream scarf streaming
behind him on follow-through, a team work jacket and team sleeves, iron-blue trousers with
gaiters. On his back rides a big striped charge box (coal and cream hazard bands, a team lid,
copper corner caps) with a fuse coiling out of it whose tip fizzes with a white-hot sparkle (A17.12
"lit fuse sparkle", flickering in every clip). In his near hand a bundled charge of three paper
sticks with a short lit fuse. The walk is a forward-leaning sprint; the attack winds the charge
back, slams it into the target with a smear and a spark burst (held impact), and recovers.

Animation standard (ANIM_SPEC 2026-10-02):
  walk      walk v3 sprint at ground speed (G1 bounce jog, 106 lu/s, 540 ms): a deep forward lean,
            long strides with flight, the charge tucked and pumping, the scarf streaming, planted feet
  attack    A as above; the held charge overhead is split into the hold and a fizz frame (holdLoop:
            the sim's wind-up is 2.8x the authored one)
  attack_b  UNDERHAND BUNDLE TOSS AND DUCK: strikes the match, crouches low with the bundle swung
            back behind his hip (the held extreme, holdLoop), bowls it underhand at the target and
            ducks with his hands over his ears as it goes off
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "sapper"
GAIT_NAME = "biped"
NAME = "Sapper"
HEIGHT_LU = 70
CANVAS = (300, 262)
FEET = (132, 238)
ANCHORS = {"head": (6, 64), "hitCenter": (0, 30)}
NO_RETIME = True

HR = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
STICK = 13.0
PAPER = "#C9B9A0"
FUSE_TIP = (-22.0, 2.0, 60.0)
BOOM = (30.0, -18.0, 32.0)

RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM, gaiter=I.LEATHER_DK)
    # the charge box on the back (drawn first) with its fuse
    I.stripes_box(rig, "torso", (-15.0, 0.0, 30.0), (6.6, 10.6, 10.2), n=3)
    g = Geo()
    for y in (-10.4, 10.4):
        for z in (20.8, 39.2):
            g.blob((-15.0 - 5.4, y, z), (1.8, 1.4, 1.8), p=3.0)
    rig.part("torso", g, I.COPPER, finish="metal", outline=0.4)
    g = Geo().capsule((6.0, -10.0, 37.0), (-8.0, -9.4, 22.0), 1.5)   # strap
    rig.part("torso", g, I.LEATHER, outline=0.6)
    g = Geo()
    pts = [(-16.0, 2.0, 41.0), (-17.5, 2.0, 47.0), (-21.0, 2.0, 50.0), (-20.0, 2.0, 55.0), FUSE_TIP]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.9)
    rig.part("torso", g, I.COAL_LT, outline=0.4)
    I.fuse_spark(rig, "torso", FUSE_TIP, size=1.8, name="spark", seed=1)

    I.jacket(rig, collar=I.CREAM_DK, hem_z=13.0)
    # scarf: a wrap at the neck and a tail streaming back on follow-through
    g = Geo().lathe([(7.4, 0), (8.0, 1.6), (7.6, 3.2)], (1.2, 0, 36.0), (1.2, 0, 39.4), segs=18)
    rig.part("torso", g, I.CREAM)
    rig.secondary("scarf", "torso", (-4.0, -2.0, 38.0), (-18.0, -2.0, 36.0), max_deg=24, gain=1.3)
    g = Geo().blob((-10.0, -2.0, 37.4), (8.0, 2.2, 2.0), p=2.4, taper=(1.0, 0.7))
    g.blob((-17.0, -2.0, 36.2), (3.0, 2.0, 2.6), p=2.4)
    rig.part("scarf", g, I.CREAM, outline=0.6)

    face = KI.head_face(rig, brow=I.HAIR, brow_angry=True, mouth_dz=-8.6, mouth_shape="smile")
    # soot on the face after the blast (shown in the death)
    rig.joint("soot", "head", (12.0, 0, 48.0), hidden=True)
    g = Geo()
    for (x, z, rx, rz) in ((11.0, 46.0, 5.0, 3.6), (7.0, 51.0, 3.4, 2.6), (12.5, 41.0, 3.0, 2.0)):
        face.decal(g, face.hit(x, z) - face.view * 0.2, F.ellipse(0, 0, rx, rz, 12), 0.3)
    rig.part("soot", g, KI.SOOT, highlight=False, outline=0)
    I.ear(rig)
    # padded leather helmet with ear flaps, a brass lamp and goggles pushed up
    g = Geo().blob((0.8, 0, 57.4), (12.4, 12.0, 8.6), p=2.3)
    g.clip((0, 0, 53.4), (0, 0, -1))
    g.blob((-1.0, -10.4, 49.0), (4.6, 2.2, 5.6), p=2.4)
    g.blob((-1.0, 10.4, 49.0), (4.6, 2.2, 5.6), p=2.4)
    rig.part("head", g, I.LEATHER)
    g = Geo()
    for a in (-40, 0, 40):
        g.capsule((0.8 + 11.6 * math.sin(math.radians(a)) * 0.2 - 8, -6.0 + a * 0.15, 64.0),
                  (0.8 + 12.4 * math.cos(math.radians(a)) * 0.8, -3.0 + a * 0.15, 57.0), 0.8)
    rig.part("head", g, I.LEATHER_DK, outline=0)
    I.goggles(rig, at=(10.2, 0, 60.4), k=0.9)
    g = Geo().lathe([(0, 0), (2.6, 0.1), (2.8, 2.6), (0, 2.8)], (8.0, 0, 64.6), (9.6, 0, 66.6), segs=14)
    rig.part("head", g, I.BRASS, finish="metal", outline=0.6)
    g = Geo().blob((9.8, 0, 66.8), (0.7, 2.2, 2.2), p=2.2, rot=(0, -36, 0))
    rig.part("head", g, glow=I.EMBER, outline=0)

    for s in ("r", "l"):
        I.arm_parts(rig, s, team_sleeve=True, fist=4.5, cuff=I.LEATHER_DK)
    I.shoulders(rig)

    # the charge: three paper sticks bound with twine, a short fuse at the top
    rig.joint("charge", "hand_r", HR)
    x, y, z = HR
    g = Geo()
    for dx, dy in ((-2.0, 0.0), (2.0, 0.0), (0.0, -2.2)):
        g.capsule((x + dx, y + dy, z - 4.0), (x + dx, y + dy, z + STICK), 2.1)
    rig.part("charge", g, PAPER)
    g = Geo()
    for zz in (z + 1.0, z + STICK - 3.0):
        g.lathe([(4.4, -0.6), (4.6, 0), (4.4, 0.6)], (x, y - 0.7, zz), (x, y - 0.7, zz + 1), segs=16)
    rig.part("charge", g, I.BRICK, outline=0.4)
    g = Geo().capsule((x, y - 1.0, z + STICK + 1.0), (x - 1.0, y - 1.0, z + STICK + 5.0), 0.7)
    rig.part("charge", g, I.COAL_LT, outline=0.3)
    I.fuse_spark(rig, "charge", (x - 1.0, y - 1.6, z + STICK + 5.6), size=0.9, name="spark2", seed=3)
    I.fuse_spark(rig, "charge", (x + 4.0, y - 3.0, z + STICK + 2.0), size=2.2, name="burst", seed=5,
                 hidden=True)
    rig.track("chargeTip", "charge", (x, y, z + STICK + 2.0))
    # the match in the far hand (struck on the helmet) and the blast at the target (root level)
    hl = (0.4, I.ARM_Y["l"], I.HAND_Z - 0.4)
    rig.joint("match", "hand_l", hl, hidden=True)
    g = Geo().capsule((hl[0] + 1.0, hl[1] - 5.0, hl[2] + 1.0), (hl[0] + 5.0, hl[1] - 5.0, hl[2] + 4.0), 0.5)
    rig.part("match", g, I.WOOD_LT, outline=0.3)
    g = Geo().blob((hl[0] + 6.0, hl[1] - 5.4, hl[2] + 5.4), (1.6, 1.2, 2.4), p=2.0, rot=(0, -20, 0))
    rig.part("match", g, glow=I.FIRE, outline=0)
    I.fuse_spark(rig, "root", BOOM, size=3.4, name="boom", seed=6, hidden=True)
    I.smoke_puff(rig, "root", (BOOM[0] + 2.0, BOOM[1], BOOM[2] + 4.0), size=1.5, name="boomsmoke")
    rig.track("fuse", "torso", FUSE_TIP)


def grip(a, f, w, la=-80.0, lf=-60.0):
    return merge(I.arm("r", a, f, w=w, w_rest=90.0), I.arm("l", la, lf))


def fizz(k):
    """The fuse sparkles flicker: a different size and turn per frame."""
    s = [1.0, 0.75, 1.15, 0.85, 1.05, 0.7, 1.2, 0.9, 1.1, 0.8, 1.0][k % 11]
    return {"spark": {"s": s, "r": 23.0 * k}, "spark2": {"s": 1.9 - s, "r": -31.0 * k}}


CROUCH = {"hips": {"z": -2.5}, "torso": {"r": -16.0}, "head": {"r": 10.0},
          "thigh_r": {"r": 8.0}, "shin_r": {"r": -10.0}, "thigh_l": {"r": -4.0}, "shin_l": {"r": -12.0}}
IDLE = (-66.0, -6.0, 64.0)
STANCE = merge(CROUCH, grip(*IDLE, -60, -30))


def _idle(f):
    # juggles the charge: a little toss (1-3, it spins in the air) and a catch with a dip (4)
    toss = [0.0, 0.5, 1.0, 0.6, -0.4, 0.0][f]

    def extra(ctx):
        a, fo, w = IDLE
        return merge(grip(a + 10 * max(toss, 0), fo + 20 * max(toss, 0), w, -60 + 3 * ctx["c"], -30),
                     {"charge": {"z": 7.0 * max(toss, 0), "x": 1.5 * max(toss, 0), "r": [0, 60, 150, 250, 360, 360][f]},
                      "hips": {"z": 1.2 * min(toss, 0)}, "head": {"r": -6 * max(toss, 0)},
                      "pupils": {"z": 0.8 * max(toss, 0)}, "scarf": {"r": 3 * ctx["lag"]}}, fizz(f))
    base = {k: v for k, v in CROUCH.items()}
    return KI.ground_feet(RIG, M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5), LEGS)


# -- walk v3: G1 sprint at ground speed (card 85 x 1.25 = 106.25 lu/s), 8 x 67.5 ms ---------------
SPEED = 106.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=540, lift=7.0)


def _walk(f, report=None):
    # a low sprint: long strides with flight, a deep forward lean, the charge tucked, the scarf streaming
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        sw = -math.cos(ctx["lag_p"])     # +1 = the near arm forward
        return merge(grip(-50 + 24 * sw, 0 + 16 * sw, 60 + 12 * sw, -50 - 38 * sw, -10 - 28 * sw),
                     {"head": {"r": 16.0}, "scarf": {"r": 6 * lag}}, fizz(ctx["f"]))
    return M.walk_v3(RIG, f, {}, GAIT, legs=LEGS, bob=[-4.4, -4.6, -0.8, 2.2], lean=-18.0, twist=8.0, nod=3.0,
                     extra=extra, report=report)


# 12 steps, impact on frame 7 at 290 of 680 ms (moves.SMALL_MELEE_MS with the hold split into the
# hold (102) and a fizz partner (25) for the holdLoop; the smears 20 + 18)
A_MS = [30, 45, 50, 102, 25, 20, 18, 120, 60, 50, 70, 90]
A_IMPACT = 7
U_OF = [0, 1, 2, 3, 3, 4, 5, 6, 7, 8, 9, 10]   # unique frame -> row of the pose tables below
#        read match light HOLD smear smear IMP  duck duck peek reload
A_A = [-66, -62, -56, 100, 30, -8, -16, 0, 0, -40, -78]
A_F = [-6, -2, 10, 152, 16, -12, -6, 0, 0, -20, -40]
A_W = [64, 66, 70, 158, 20, -12, -6, 0, 0, 30, 60]
A_LA = [-60, 40, 0, -18, -40, -80, -100, 0, 0, -50, -60]
A_LF = [-30, 90, 30, 0, -40, -90, -110, 0, 0, -30, -30]
A_T = [-16, -12, -14, 4, -18, -26, -30, -34, -34, -22, -16]
A_HZ = [-2.5, -2.0, -2.5, -1.0, -2.0, -3.0, -3.5, -7.0, -7.5, -4.0, -2.5]
A_X = [0.0, 0.0, 0.0, -3.0, 2.0, 5.0, 7.0, 1.0, 0.5, 0.0, 0.0]
A_Q = [0.0, 0.0, -0.03, 0.08, 0.06, 0.02, -0.12, -0.14, -0.12, 0.02, 0.0]
A_HEAD = [10, 14, 16, 2, 4, 6, 6, 14, 16, 12, 10]
EARS = {"r": (-2.0, 50.0), "l": (-2.0, 50.0)}


def _attack_pose(f):
    wob = f == 4
    f = U_OF[f]
    if f in (7, 8):   # hands clamped over his ears
        a, fo = I.ik2(I.SH, EARS["r"])
        la, lf = I.ik2(I.SH, EARS["l"])
        arms = merge(I.arm("r", a, fo, w=150.0, w_rest=90.0), I.arm("l", la, lf))
    else:
        arms = grip(A_A[f] + (4 if wob else 0), A_F[f] + (5 if wob else 0), A_W[f] + (6 if wob else 0),
                    A_LA[f], A_LF[f])
    pose = merge(arms, fizz(f + (5 if wob else 0)), {
        "hips": {"z": A_HZ[f]},
        "torso": {"r": A_T[f]},
        "head": {"r": A_HEAD[f]},
        "thigh_r": {"r": [8, 8, 10, 4, 20, 28, 32, 26, 26, 16, 8][f]},
        "shin_r": {"r": [-10, -10, -12, -6, -20, -18, -16, -30, -30, -18, -10][f]},
        "thigh_l": {"r": [-4, -4, -6, -12, -22, -28, -30, -8, -8, -6, -4][f]},
        "shin_l": {"r": [-12, -12, -14, -8, -8, -6, -4, -30, -30, -16, -12][f]},
        "match": {"show": f in (1, 2)},
        "charge": {"hide": f in (6, 7, 8, 9)},
        "boom": {"show": f in (6, 7), "s": [1, 1, 1, 1, 1, 1, 1.0, 0.7, 1, 1, 1][f]},
        "boomsmoke": {"show": f in (7, 8, 9), "s": [1, 1, 1, 1, 1, 1, 1, 1.0, 1.3, 1.5, 1][f],
                      "z": [0, 0, 0, 0, 0, 0, 0, 0, 3, 7, 0][f]},
        "spark2": {"s": [1, 1, 1.6, 1.8, 1.5, 1.2, 1, 1, 1, 1, 1][f]},
        "scarf": {"r": [0, 0, 0, -8, 10, 14, 12, 4, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    if f in (4, 5):
        pose["charge"] = dict(pose.get("charge", {}), sz=1.15)
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f in (7, 8):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif f == 9:
        pose = merge(pose, F.expr("o"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_clip():
    slam = {"kind": "arc", "joint": "charge", "inner": (HR[0], HR[1], HR[2] + 3.0),
            "outer": (HR[0], HR[1], HR[2] + STICK + 3.0), "color": PAPER, "white": 0.3, "taper": 0.15,
            "lines": 3}
    ov = {
        1: [{"kind": "burst", "joint": "head", "point": (6.0, 0.0, 58.0), "r0_lu": 3.0, "r1_lu": 7.0, "n": 5,
             "a0": 20.0, "arc": 140.0}],
        5: [dict(slam, **{"from": 3, "t0": 0.0, "t1": 0.95})],
        6: [dict(slam, **{"from": 3, "t0": 0.3, "t1": 1.0})],
        7: [{"kind": "burst", "joint": "root", "point": BOOM, "r0_lu": 12.0, "r1_lu": 22.0, "n": 9,
             "a0": 0.0, "arc": 360.0},
            {"kind": "dust", "ground": (28.0, 0.0), "size_lu": 9.0, "puffs": 5, "seed": 61, "spread": 1.2}],
        8: [{"kind": "dust", "ground": (30.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 62, "spread": 1.5}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(12)], A_MS, impact=A_IMPACT, smear=5,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: underhand bundle toss and duck ----------------------------------------------------
# unique frames: 0-2 = A read, match, light; 3 HOLD (crouched low, the bundle swung back behind his
# hip, fuse fizzing), 4 fizz (holdLoop), 5 smear (the underhand pendulum), 6 release, 7 IMPACT (it
# goes off at the target, he ducks), 8-11 = A duck, duck, peek, reload
#        HOLD  fizz smear release IMP
TB_A = [-150, -146, -96, -40, -30]
TB_F = [-140, -134, -70, -10, -6]
TB_W = [-120, -112, -40, 20, 30]
TB_LA = [-30, -30, -60, -100, -110]
TB_LF = [10, 12, -40, -110, -120]
TB_T = [-26, -26, -20, -14, -28]
TB_HZ = [-6.0, -6.0, -4.5, -3.0, -6.5]
TB_X = [-2.0, -2.0, 2.0, 5.0, 2.0]
TB_Q = [-0.10, -0.10, 0.04, 0.06, -0.12]
TB_HEAD = [14, 14, 10, 6, 14]
TB_TH = [(24, -26, -30, -20), (24, -26, -30, -20), (30, -24, -30, -14), (34, -20, -32, -8), (26, -30, -10, -30)]


def _b_pose(i):
    if i in (0, 1, 2) or i >= 8:
        return _attack_pose(i)
    k = i - 3
    pose = merge(grip(TB_A[k], TB_F[k], TB_W[k], TB_LA[k], TB_LF[k]), fizz(i + (5 if k == 1 else 0)), {
        "hips": {"z": TB_HZ[k]},
        "torso": {"r": TB_T[k]},
        "head": {"r": TB_HEAD[k]},
        "thigh_r": {"r": TB_TH[k][0]}, "shin_r": {"r": TB_TH[k][1]},
        "thigh_l": {"r": TB_TH[k][2]}, "shin_l": {"r": TB_TH[k][3]},
        "charge": {"hide": k == 4},
        "boom": {"show": k == 4},
        "spark2": {"s": [1.7, 1.9, 1.5, 1.2, 1][k]},
        "scarf": {"r": [-6, -6, 10, 14, 12][k]},
    }, M.body_about((0, 0, 22), x=TB_X[k], q=TB_Q[k]))
    if k == 2:
        pose["charge"] = dict(pose.get("charge", {}), sz=1.15)
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif k in (2, 3):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_b():
    bowl = {"kind": "arc", "joint": "charge", "inner": (HR[0], HR[1], HR[2] + 3.0),
            "outer": (HR[0], HR[1], HR[2] + STICK + 3.0), "color": PAPER, "white": 0.3, "taper": 0.15,
            "lines": 3}
    ov = {
        1: [{"kind": "burst", "joint": "head", "point": (6.0, 0.0, 58.0), "r0_lu": 3.0, "r1_lu": 7.0, "n": 5,
             "a0": 20.0, "arc": 140.0}],
        5: [dict(bowl, **{"from": 4, "t0": 0.0, "t1": 0.95})],
        6: [dict(bowl, **{"from": 4, "t0": 0.4, "t1": 1.0})],
        7: [{"kind": "burst", "joint": "root", "point": BOOM, "r0_lu": 12.0, "r1_lu": 22.0, "n": 9,
             "a0": 0.0, "arc": 360.0},
            {"kind": "dust", "ground": (28.0, 0.0), "size_lu": 9.0, "puffs": 5, "seed": 63, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 2: ("attack", 2), 8: ("attack", 8), 9: ("attack", 9),
             10: ("attack", 10), 11: ("attack", 11)}
    return M.clip("attack_b", [_b_pose(i) for i in range(12)], A_MS, impact=A_IMPACT, smear=5, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return merge({"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                      "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                      "arm_r": {"r": 16 * a}, "arm_l": {"r": 30 * a}, "brow": {"z": 1.6 * max(a, 0)}}, fizz(k))
    return KI.ground_feet(RIG, M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                                           face_back=F.expr("grit") if k == 2 else None), LEGS, keep_lift=4.0)


def _die(k):
    # D1 fling and spin with a sooty face (the game adds the Short Fuse blast)
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(grip(-40 + 60 * flail, 0 + 40 * flail, 100 + 40 * flail, -40 + 80 * flail, 20 * flail),
                 M.die_d1(k, center_z=26.0, lie_z=11.0, height=HEIGHT_LU), fizz(k), {
        "torso": {"r": 10 * flail - 6}, "head": {"r": 14 * flail - 6},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
        "soot": {"show": k >= 1},
    })
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
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
