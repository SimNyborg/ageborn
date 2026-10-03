"""Commando: Modern Age common infantry, Raider (CONTENT_PLAN 5.6). Rifle butt, ×2 to bases, ~68 lu.

Look (A11, Modern palette): a lean, grinning raider in a floppy team beret with a cream badge, two dark
camouflage streaks on his cheek, a team commando smock with breast pockets and team sleeves (cream rank
chevrons), a khaki webbing belt with a sheathed knife and a coil of rope on his back, olive trousers,
puttees and muddy boots. He carries a short wooden-stocked carbine he swings like a club.

"A viewer expects him to swing the rifle butt into the enemy (a quick, sneaky brawler) and to sprint
crouched across the lane."

Animation (ANIM_SPEC G1 sprint at card 110 x 1.25 = 137.5 lu/s, appendix B for a club-like weapon):
  idle      crouched and springy, he glances back over his shoulder and grins, the carbine at the hip, blink
  walk      walk v3 crouched sprint: low and long, the carbine held across his body in both hands, the
            rope coil and the beret droop lagging, planted feet
  attack    RISING BUTT-STROKE: he drops low with the carbine pulled back along his hip (the held
            extreme), then drives the butt up and forward into the enemy's chin (a rising arc)
  attack_b  OVERHEAD BUTT SMASH: he hoists the carbine butt-first high over his head (the held
            extreme) and smashes it straight down (an overhead arc)
  attack_c  COMBAT ROLL: he tucks into a crouch (the held extreme), rolls forward (two smear frames, a
            ring smear) and pops up on one knee jabbing the butt straight in (a thrust)
  hit       light: the head snaps back, the beret lifts, eyes squeezed
  die       D1 fling and spin: the beret pops off and the carbine flies; X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "commando"
GAIT_NAME = "biped"
NAME = "Commando"
HEIGHT_LU = 67
CANVAS = (320, 272)
FEET = (140, 244)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

G0 = (4.0, -15.0, 27.0)     # carbine grip at rest (torso space)
FORE = 12.0                 # the far hand this far along the carbine
LENGTH = 36.0
BUTT = (G0[0] - 15.0, G0[1], G0[2] - 3.4)
BUTT_IN = (G0[0] - 4.0, G0[1], G0[2] - 1.0)
CAMO = "#4A5236"


def _carbine(rig, joint):
    gx, gy, gz = G0
    g = Geo()
    g.blob((gx - 8.5, gy, gz - 2.4), (7.6, 2.3, 3.8), p=2.8, rot=(0, 18, 0), taper=(1.0, 0.75))   # stock
    g.capsule((gx - 1.0, gy, gz), (gx + LENGTH * 0.62, gy, gz + 0.6), 2.1, 1.7)
    rig.part(joint, g, R.WOOD)
    g = Geo().blob((gx - 15.0, gy, gz - 3.6), (1.4, 2.5, 4.0), p=2.6, rot=(0, 18, 0))           # butt plate
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.6)
    g = Geo().capsule((gx + 2.0, gy, gz + 1.9), (gx + LENGTH, gy, gz + 1.9), 1.3, 1.15)
    g.blob((gx + 3.5, gy, gz + 2.7), (4.8, 1.8, 1.8), p=3.0)
    g.blob((gx + 6.0, gy - 0.4, gz - 2.2), (1.4, 1.3, 2.8), p=2.4)                               # magazine
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.9)
    g = Geo()
    for (ax, az), (bx, bz) in zip([(gx - 10, gz - 2.5), (gx + 4, gz - 5.6), (gx + 16, gz - 4.6)],
                                  [(gx + 4, gz - 5.6), (gx + 16, gz - 4.6), (gx + 22, gz - 0.8)]):
        g.capsule((ax, gy - 1.6, az), (bx, gy - 1.6, bz), 0.8, segs=8, rings=2)
    rig.part(joint, g, R.LEATHER, outline=0.5)                                                     # sling


RIG = None


def build(rig):
    global RIG
    RIG = rig
    face = W.trooper(rig, hat="beret", mud=True, mouth_shape="smile", mouth_w=6.0)
    # a rope coil on his back
    g = Geo().lathe([(4.6, -1.4), (5.6, 0), (4.6, 1.4), (3.2, 0)], (-10.4, -2.0, 30.0), (-11.0, 3.0, 30.0), segs=20)
    rig.part("torso", g, "#B8A27E", finish="hair", outline=0.6)
    # camouflage streaks on the near cheek
    g = Geo()
    for dx, dz in ((0.0, 0.0), (1.4, -2.8)):
        c = face.hit(9.6 + dx, 46.6 + dz)
        face.decal(g, c, F.ellipse(0, 0, 3.0, 0.65, 10), 0.4)
    rig.part("head", g, CAMO, outline=0, highlight=False)
    # a sheathed knife on the belt and a canteen
    g = Geo().blob((6.0, -10.8, 15.6), (1.4, 1.1, 4.4), p=2.6, rot=(0, -10, 0))
    rig.part("torso", g, R.LEATHER, outline=0.5)
    g = Geo().blob((6.6, -10.8, 20.8), (1.2, 1.4, 1.3), p=2.4)
    rig.part("torso", g, R.GUNMETAL, finish="metal", outline=0.4)
    KM.canteen(rig, "torso", (-8.4, -9.6, 16.4), r=3.0)
    rig.secondary("droop", "hat", (2.0, -8.0, 56.0), (-6.0, -9.0, 53.0), max_deg=14, gain=1.2)
    g = Geo().blob((-2.0, -9.0, 55.0), (4.0, 2.4, 2.6), p=2.2)
    rig.part("droop", g, team=True, outline=0.5)

    rig.joint("gun", "torso", G0)
    _carbine(rig, "gun")
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4), (3.4, 3.0, 3.2), p=2.4)
    rig.part("gun", g, R.SKIN)
    KI.loose(rig, "gun_loose", G0, lambda j: _carbine(rig, j))
    rig.track("clubHead", "gun", BUTT)


# -- poses ------------------------------------------------------------------------------------------
def hold(gx, gz, deg):
    return R.hold2("gun", G0, FORE, gx, gz, deg)


HIP = (4.0, 25.0, 18.0)     # carbine at the hip, muzzle forward
STANCE = merge(hold(*HIP), {"torso": {"r": -6.0}})


def _idle(f):
    look = [0.0, 0.0, 0.6, 1.0, 0.6, 0.0][f]
    bounce = [0.0, 0.6, 0.2, 0.0, 0.6, 0.2][f]

    def extra(ctx):
        return merge(hold(HIP[0], HIP[1] + 0.6 * ctx["lag"], HIP[2] + 3.0 * ctx["lag"]),
                     {"head": {"rz": 34.0 * look, "r": -3 * look}, "hips": {"z": -1.0 + 0.8 * bounce},
                      "pupils": {"y": 1.0 * look}, "droop": {"r": 4 * ctx["lag"]}})
    pose = M.idle_v2(f, {"torso": {"r": -6.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=1)
    return KM.ground_feet(RIG, pose, LEGS)


# -- walk v3: crouched sprint at ground speed (card 110 x 1.25 = 137.5 lu/s), 8 x 60 ms ---------------
SPEED = 137.5
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=480, stance=0.30, lift=7.0, x_mid=3.5)
SPRINT_BOB = [-5.0, -6.2, -2.6, 0.0]
CARRY = (5.0, 26.0, -14.0)  # the carbine low across his body, muzzle down-forward


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(hold(CARRY[0], CARRY[1] + 0.8 * lag, CARRY[2] - 4.0 * lag),
                     {"droop": {"r": 10 * lag}, "hat": {"r": -1.5 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -4.0}}, GAIT, legs=LEGS, bob=SPRINT_BOB, lean=-18.0, twist=6.0,
                     nod=2.5, extra=extra, report=report)


# -- attacks: moves.SMALL_MELEE_MS (impact on step 6 at 290 of 680 ms), 10 unique poses + the read again
#        read  drop  pull  HOLD  smear smear IMP   over  recoil settle      (A: rising butt-stroke)
A_GX = [4.0, 1.0, -1.5, -3.0, 0.0, 5.0, 8.5, 7.5, 5.0, 4.0]
A_GZ = [25.0, 23.0, 21.5, 20.5, 22.0, 27.0, 33.0, 35.0, 30.0, 25.5]
A_DEG = [18.0, 26.0, 30.0, 32.0, 95.0, 150.0, 205.0, 222.0, 120.0, 30.0]   # butt leads at deg ~ 180-220
A_T = [-6, -10, -14, -16, -8, 2, 8, 10, 0, -6]
A_X = [0.0, -0.5, -1.5, -2.5, 1.0, 4.0, 7.0, 7.0, 4.0, 1.0]
A_Z = [0.0, -2.5, -4.0, -5.0, -3.5, -1.5, 0.5, 0.5, -0.5, 0.0]
A_Q = [0.0, -0.04, -0.07, -0.09, 0.05, 0.06, 0.08, 0.03, -0.03, 0.0]
A_HEAD = [0, 4, 6, 6, 2, -4, -10, -12, -4, 0]


def _pose(gx, gz, deg, t, x, z, q, head, k, hold_ks, smear_ks, impact_k=6, plant=True, roll=0.0):
    pose = merge(hold(gx, gz, deg - t), {
        "torso": {"r": t},
        "head": {"r": head - 0.4 * t},
    }, M.body_about((0, 0, 22), x=x, z=z, q=q, r=roll))
    if plant:
        pose = KM.ground_feet(RIG, pose, LEGS)
    if k in smear_ks:
        pose["gun"]["sz"] = 1.14
    if k in hold_ks:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in smear_ks or k in (impact_k, impact_k + 1):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _a_pose(f):
    return _pose(A_GX[f], A_GZ[f], A_DEG[f], A_T[f], A_X[f], A_Z[f], A_Q[f], A_HEAD[f], f, (1, 2, 3), (4, 5))


#        read  lift  hoist HOLD  smear smear IMP   over  recoil settle      (B: overhead butt smash)
B_GX = [4.0, 2.0, 0.0, -1.0, 3.0, 7.0, 9.0, 8.5, 6.0, 4.0]
B_GZ = [25.0, 38.0, 45.0, 48.0, 43.0, 35.0, 28.0, 26.0, 26.0, 25.5]
B_DEG = [18.0, 255.0, 285.0, 296.0, 250.0, 200.0, 152.0, 140.0, 80.0, 30.0]
B_T = [-6, 6, 12, 14, 0, -10, -18, -18, -10, -6]
B_X = [0.0, -1.0, -2.0, -2.5, 0.5, 4.0, 7.5, 7.5, 4.0, 1.0]
B_Z = [0.0, 0.5, 1.0, 1.0, 0.0, -2.0, -4.0, -4.0, -2.0, 0.0]
B_Q = [0.0, 0.03, 0.05, 0.06, 0.02, 0.06, -0.10, -0.05, -0.02, 0.0]
B_HEAD = [0, -6, -10, -12, -6, 2, 8, 6, 2, 0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_GX[f], B_GZ[f], B_DEG[f], B_T[f], B_X[f], B_Z[f], B_Q[f], B_HEAD[f], f, (1, 2, 3), (4, 5))


#        read  drop  tuck  HOLD  roll  roll  IMP   over  recoil settle      (C: combat roll and butt jab)
C_GX = [4.0, 3.0, 2.0, 1.0, 1.0, 1.0, 9.0, 8.0, 6.0, 4.0]
C_GZ = [25.0, 24.0, 23.0, 22.5, 22.5, 22.5, 28.0, 28.0, 27.0, 25.5]
C_DEG = [18.0, 40.0, 60.0, 70.0, 70.0, 70.0, 182.0, 186.0, 110.0, 30.0]
C_T = [-6, -18, -28, -34, -40, -40, -14, -12, -8, -6]
C_X = [0.0, 0.0, -1.0, -2.0, 6.0, 13.0, 12.0, 11.0, 6.0, 1.0]
C_Z = [0.0, -5.0, -9.0, -11.0, 7.0, 6.0, -8.5, -8.0, -4.0, 0.0]
C_Q = [0.0, -0.06, -0.10, -0.12, 0.0, 0.0, -0.10, -0.04, -0.02, 0.0]
C_ROLL = [0.0, 0.0, 0.0, 0.0, -150.0, -290.0, 0.0, 0.0, 0.0, 0.0]
C_HEAD = [0, 8, 12, 14, 10, 10, -4, -4, 0, 0]
TUCK = {"thigh_r": {"r": 70}, "shin_r": {"r": -120}, "thigh_l": {"r": 80}, "shin_l": {"r": -125}}
KNEEL = {"thigh_r": {"r": 62}, "shin_r": {"r": -64}, "thigh_l": {"r": -14}, "shin_l": {"r": -96}}


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    pose = _pose(C_GX[f], C_GZ[f], C_DEG[f], C_T[f], C_X[f], C_Z[f], C_Q[f], C_HEAD[f], f, (1, 2, 3), (4, 5),
                 plant=f not in (4, 5, 6, 7), roll=C_ROLL[f])
    if f in (4, 5):
        pose = merge(pose, TUCK)
    elif f in (6, 7):
        pose = merge(pose, KNEEL)
    return pose


BUTT_ARC = {"kind": "arc", "joint": "gun", "inner": BUTT_IN, "outer": BUTT, "color": R.WOOD, "taper": 0.2,
            "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}
JAB = {"kind": "streak", "joint": "gun", "point": BUTT, "color": R.WOOD, "width_lu": 7.0, "white": 0.35}
ROLL = {"kind": "rings", "joint": "torso", "point": (0.0, 0.0, 26.0), "radii_lu": (17.0, 21.0), "a0": 20.0,
        "a1": 300.0, "color": "#EFE8D6"}


def _fx(seed, point=BUTT, a0=-80.0, ground=18.0):
    return [{"kind": "burst", "joint": "gun", "point": point, "r0_lu": 6.0, "r1_lu": 12.0, "n": 5, "a0": a0,
             "arc": 140.0, "color": "#FFF1C8"},
            {"kind": "dust", "ground": (ground, 0.0), "size_lu": 5.0, "puffs": 3, "seed": seed, "spread": 0.9}]


def _attack_clip():
    ov = {4: [dict(BUTT_ARC, **{"from": 3})], 5: [dict(BUTT_ARC, **{"from": 4})],
          6: [dict(BUTT_ARC, **{"from": 5, "t1": 1.0, "lines": 2})] + _fx(61, a0=-20.0)}
    return M.clip("attack", [_a_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], extra={"holdStep": 3})


def _attack_b():
    ov = {4: [dict(BUTT_ARC, **{"from": 3})], 5: [dict(BUTT_ARC, **{"from": 4})],
          6: [dict(BUTT_ARC, **{"from": 5, "t1": 1.0, "lines": 2})] + _fx(62, a0=-100.0)}
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], reuse={0: ("attack", 0), 9: ("attack", 9)},
                  extra={"holdStep": 3})


def _attack_c():
    ov = {4: [ROLL], 5: [dict(ROLL, **{"a0": 140.0, "a1": 420.0})],
          6: [dict(JAB, **{"from": 5})] + _fx(63, a0=-60.0, ground=22.0)}
    return M.clip("attack_c", [_c_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], reuse={0: ("attack", 0), 9: ("attack", 9)},
                  extra={"holdStep": 3})


def _hit(k):
    base = {"torso": {"r": -6.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: hold(HIP[0], HIP[1], HIP[2] + 18 * a) if a > 0 else {})


def _die(k):
    return W.die_d1_pose(k, STANCE, HEIGHT_LU, prop="gun", prop_path=W.PROP_PATH)


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
