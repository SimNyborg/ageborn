"""Plasma Lancer: Future Age rare melee anti-heavy (CONTENT_PLAN 5.7). Plasma lance with reach, ~72 lu.

Look (A11, Future palette): a tall trooper in heavy glossy white armour over a charcoal suit, the
Pulse Trooper helmet with a team cap and crest over a dark visor (mint eyes that act), a team chest plate
with the hex, big team shoulder pads, team shin guards and a backpack power cell with a cable to the
lance. The lance is the brightest shape: a long white shaft with a team band, a charcoal grip, a
magenta emitter collar and a long crackling mint spear blade.

"A viewer expects a pikeman of the future: spear thrusts with reach, braced against big machines."

Animation (ANIM_SPEC G1 march jog at card 70 x 1.25 = 87.5 lu/s, appendix B spear):
  idle      the lance held upright like a guard, the tip crackles, a blink
  walk      walk v3 march jog with the lance sloped back at 45 degrees
  attack    LUNGE THRUST: draws the lance back level at the hip, turned away (the held extreme), then a
            long straight lunge, the blade level at the target (a streak, sparks)
  attack_b  OVERHEAD DRIVE: the lance raised high over the head, point forward and down (the held
            extreme), then driven down at 30 degrees into the target (an overhead hit)
  attack_c  BRACE AND RISE: drops low with the butt near the ground and the point raised (the held
            extreme), then a rising thrust from the crouch (a rising hit)
  hit       armoured: a dip, the helmet clanks, eyes > <
  die       D2 plank topple onto the back, the blade powers down, X eyes
"""
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "plasma_lancer"
GAIT_NAME = "biped"
NAME = "Plasma Lancer"
HEIGHT_LU = 72
CANVAS = (360, 300)
FEET = (150, 252)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 33)}
NO_RETIME = True

HR = (0.0, F.ARM_Y["r"], F.HAND_Z)
BACK = 14.0                   # shaft behind the near hand
SHAFT = 30.0                  # shaft in front of the hand
BLADE = 14.0
TIP = (HR[0], HR[1] - 0.6, HR[2] + SHAFT + BLADE + 2.0)
MID = (HR[0], HR[1] - 0.6, HR[2] + SHAFT + 4.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="dome", team_greave=True, team_thigh=True, team_sleeve=True, bulk=1.05, head=(1, 0, 40))
    rig.joint("lance", "hand_r", HR)
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - BACK), (hx, hy, hz + SHAFT), 1.5)
    rig.part("lance", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().capsule((hx, hy - 0.2, hz - 3.0), (hx, hy - 0.2, hz + 4.0), 1.9)
    rig.part("lance", g, F.SUIT, outline=0.8)
    g = Geo().capsule((hx, hy - 0.3, hz + 9.0), (hx, hy - 0.3, hz + 15.0), 2.0)
    rig.part("lance", g, team=True, outline=0.6)
    g = Geo().lathe([(0, -1.0), (3.0, -0.8), (3.2, 1.6), (0, 2.0)], (hx, hy - 0.4, hz + SHAFT - 1.0),
                    (hx, hy - 0.4, hz + SHAFT + 2.0), segs=16)
    rig.part("lance", g, F.MAGENTA, outline=0.6)
    g = Geo().blob((hx, hy - 0.6, hz + SHAFT + 2.0 + BLADE / 2), (2.8, 1.4, BLADE / 2 + 0.4), p=2.2, taper=(1.0, 0.3))
    rig.part("lance", g, glow=W.MINT, outline=1.0, outline_hex=W.MINT)
    g = Geo().blob((hx, hy - 1.4, hz + SHAFT + 1.5 + BLADE / 2), (1.1, 0.8, BLADE / 2 - 1.2), p=2.2, taper=(1.0, 0.3))
    rig.part("lance", g, glow=W.MINT_CORE, outline=0)
    rig.joint("crackle", "lance", TIP, hidden=True)
    F.sparks(rig, "lance", TIP, name="crackle", size=0.8, seed=5)
    rig.joint("blade_glow", "lance", MID, hidden=True)        # the die: the blade powers down
    rig.track("lanceTip", "lance", TIP)


def arms(hand, w, far):
    a, f = F.ik2(F.SH, hand)
    la, lf = F.ik2(F.SH, far)
    return merge(F.arm("r", a, f, w, 90.0), F.arm("l", la, lf))


def along(hand, w, d):
    import math
    return (hand[0] + d * math.cos(math.radians(w)), hand[1] + d * math.sin(math.radians(w)))


def two_hand(hand, w, d=10.0):
    """The far hand on the shaft `d` lu behind the near hand."""
    return arms(hand, w, along(hand, w, -d))


STANCE = merge(arms((7.0, 25.0), 84.0, (9.0, 33.0)), {"torso": {"r": -2.0}})


def _idle(f):
    def extra(ctx):
        return arms((7.0, 25.0 + 0.6 * ctx["lag"]), 84.0 + 2 * ctx["lag"], (9.0, 33.0 + 0.6 * ctx["lag"]))
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, blink=4, face_blink=KF.glyph("g_blink"))
    if f in (2, 5):
        pose["crackle"] = {"show": True}
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 87.5
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=616)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        a, fo = F.ik2(F.SH, (5.0, 30.0 + 0.8 * lag))
        return F.arm("r", a, fo, 132.0 - 5 * lag, 90.0)
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-8.0, twist=6.0, nod=3.0,
                     arms={"l": KF.ArmChain("l")}, arm=30.0, extra=extra, report=report)


def _pose(hand, w, t, rz, x, z, q, k, d=10.0, low=False):
    pose = merge(two_hand(hand, w, d), {"torso": {"r": t, "rz": rz}, "head": {"r": -0.4 * t, "rz": -0.4 * rz}},
                 M.body_about((0, 0, 22), x=x, z=z, q=q))
    pose = KI.ground_feet(RIG, pose, LEGS)
    if k in (4, 5):
        pose.setdefault("lance", {})["sz"] = 1.1
    if k in (6, 7):
        pose["crackle"] = {"show": True}
    g = "g_angry" if k in (1, 2, 3, 6, 7) else ("g_squint" if k in (4, 5) else "eyes")
    return merge(pose, KF.glyph(g))


#      read     draw     coil     HOLD     smear    smear    IMP      over     recoil   settle    (A: lunge thrust)
A_H = [(7, 25), (2, 26), (-3, 27), (-6, 27), (6, 28), (15, 28), (20, 28), (19, 28), (13, 27), (7, 25)]
A_W = [84, 30, 4, 0, 0, 0, -2, -2, 30, 84]
A_T = [-2, -4, -6, -6, -14, -20, -24, -22, -12, -2]
A_RZ = [0, 14, 24, 30, 10, -4, -12, -10, -4, 0]
A_X = [0.0, -1.0, -2.0, -3.0, 3.0, 8.0, 11.0, 11.0, 5.0, 0.5]
A_Z = [0.0, -1.0, -2.0, -2.5, -3.5, -4.5, -5.0, -4.0, -2.0, 0.0]
A_Q = [0.0, -0.03, -0.05, -0.06, 0.04, 0.05, -0.10, -0.05, -0.02, 0.0]


def _a_pose(f):
    return _pose(A_H[f], A_W[f], A_T[f], A_RZ[f], A_X[f], A_Z[f], A_Q[f], f)


#      read     lift     raise    HOLD     smear    smear    IMP      over     recoil   settle    (B: overhead drive)
B_H = [(7, 25), (6, 36), (4, 44), (3, 46), (9, 42), (14, 36), (17, 30), (17, 29), (12, 27), (7, 25)]
B_W = [84, 40, 4, -4, -14, -22, -30, -32, 20, 84]
B_T = [-2, 2, 6, 8, -2, -10, -16, -14, -8, -2]
B_X = [0.0, -0.5, -1.5, -2.0, 1.0, 4.0, 7.0, 7.0, 3.0, 0.5]
B_Z = [0.0, 1.0, 1.8, 2.2, 0.5, -1.5, -3.0, -2.5, -1.0, 0.0]
B_Q = [0.0, 0.03, 0.05, 0.07, 0.02, -0.04, -0.12, -0.05, -0.02, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_H[f], B_W[f], B_T[f], 0.0, B_X[f], B_Z[f], B_Q[f], f, d=9.0)


#      read     crouch   brace    HOLD     smear    smear    IMP      over     recoil   settle    (C: brace and rise)
C_H = [(7, 25), (4, 20), (1, 17), (0, 16), (7, 20), (13, 26), (17, 32), (16, 33), (12, 28), (7, 25)]
C_W = [84, 40, 30, 28, 30, 34, 38, 40, 50, 84]
C_T = [-2, -12, -18, -22, -16, -6, 2, 2, -4, -2]
C_X = [0.0, -1.0, -2.0, -2.5, 1.5, 4.5, 7.0, 7.0, 3.0, 0.5]
C_Z = [0.0, -4.0, -6.5, -7.5, -6.0, -2.0, 0.5, 0.5, -0.5, 0.0]
C_Q = [0.0, -0.05, -0.08, -0.10, -0.02, 0.05, 0.10, 0.04, -0.02, 0.0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_H[f], C_W[f], C_T[f], 0.0, C_X[f], C_Z[f], C_Q[f], f, d=11.0)


THRUST = {"kind": "streak", "joint": "lance", "point": TIP, "color": W.MINT, "width_lu": 7.0, "white": 0.35}


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(arms((7.0 - 2 * up, 25.0 + 2 * up), 84.0 + 10 * a, (9.0, 33.0 + 3 * up)),
                     {"torso": {"r": 10 * a}, "head": {"r": 8 * a}})
    return K.hit_armoured(k, {"torso": {"r": -2.0}}, recoil, face_hurt=KF.glyph("g_hurt"),
                          face_back=KF.glyph("g_angry"), helm="head", clank=1.6)


def _die(k):
    pose = W.die_d2(k, STANCE)
    if k >= 4:
        pose.setdefault("lance", {})["sz"] = [1, 1, 1, 1, 0.9, 0.8, 0.75, 0.75, 0.75, 0.75][k]
    return pose


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        W.melee_clip("attack", _a_pose, THRUST, W.impact_fx("lance", TIP, 161, a0=-70.0, ground_x=40.0)),
        W.melee_clip("attack_b", _b_pose, THRUST, W.impact_fx("lance", TIP, 162, a0=-120.0, ground_x=40.0), rr),
        W.melee_clip("attack_c", _c_pose, THRUST, W.impact_fx("lance", TIP, 163, a0=-20.0, ground_x=36.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
