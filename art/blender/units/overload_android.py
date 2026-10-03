"""Overload Android: Future Age epic brawler, Frenzy (CONTENT_PLAN 5.7). Two energy fists, ~74 lu.

Look (A11, Future palette): a stocky combat robot: a bulky white armoured body on a charcoal frame, the
android head with a dark wrap visor (mint robot eyes that turn angry), a team crown stripe and a short
antenna, a big team chest plate with the hex, two chimney vents on the shoulders that glow mint, and
huge team boxing gauntlets with white knuckle plates and mint power rings at the wrists.

"A viewer expects a boxing robot: one-two punches, an uppercut, heavy stomping, vents puffing."

Animation (ANIM_SPEC G1 stomp jog at card 60 x 1.25 = 75 lu/s, appendix B mechs and golems):
  idle      fists up in a guard, bobbing on its knees, the vents puff, a blink
  walk      walk v3 heavy stomp jog, fists pumping, the vents puffing on the beat
  attack    ONE-TWO: a quick far-hand jab, then the near fist cocked back by the ear with the torso
            twisted away (the held extreme), a straight cross through the target (a thrust)
  attack_b  UPPERCUT: dips low with the fist down by the knee (the held extreme), drives it straight up
            (a rising hit)
  attack_c  HAMMER FISTS: both fists clasped high over the head (the held extreme), slammed down in
            front (an overhead hit), sparks and dust
  hit       mech: a hard jolt with no squash, eyes > <
  die       D2 topple onto the back, the vents sputter, X eyes
"""
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "overload_android"
GAIT_NAME = "biped"
NAME = "Overload Android"
HEIGHT_LU = 74
CANVAS = (320, 290)
FEET = (140, 250)
ANCHORS = {"head": (2, 72), "hitCenter": (0, 34)}
NO_RETIME = True

ARM_K = 1.6          # long robot arms (rest scale about the shoulders), so the punches reach out
L1, L2 = F.UPPER * ARM_K, F.LOWER * ARM_K
FIST_R = (0.6, F.ARM_Y["r"], F.HAND_Z - 0.6)
FIST_L = (0.6, F.ARM_Y["l"], F.HAND_Z - 0.6)


def _fist(rig, s, at):
    x, y, z = at
    g = Geo().blob((x + 0.6, y, z - 0.4), (5.2, 4.8, 5.0), p=2.3)
    rig.part(f"hand_{s}", g, team=True)
    g = Geo().blob((x + 4.4, y - (1.0 if s == "r" else -1.0), z - 0.6), (1.8, 4.0, 3.6), p=2.6)
    rig.part(f"hand_{s}", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().lathe([(0, -0.8), (5.0, -0.7), (5.0, 0.7), (0, 0.8)], (x, y, z + 6.0), (x, y, z + 7.0), segs=16)
    rig.part(f"hand_{s}", g, glow=W.MINT, outline=1.0, outline_hex=F.SUIT)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="android", team_greave=True, team_sleeve=True, pack=False, bulk=1.15, antenna=True,
              head=(1, 0, 40))
    _fist(rig, "r", FIST_R)
    _fist(rig, "l", FIST_L)
    rig.rest_scale["arm_r"] = ARM_K
    rig.rest_scale["arm_l"] = ARM_K
    # shoulder chimney vents that glow and puff
    g = Geo()
    for y in (-8.0, 7.0):
        g.capsule((-6.0, y, 40.0), (-7.0, y, 46.0), 2.2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    g = Geo()
    for y in (-8.0, 7.0):
        g.sphere((-7.0, y, 46.4), 1.6, cuts=2)
    rig.part("torso", g, glow=W.MINT, outline=0.6, outline_hex=F.SUIT)
    F.puff(rig, "torso", (-7.5, -8.0, 50.0), size=0.8, name="vent", spread=1.2)
    F.sparks(rig, "hand_r", FIST_R, name="spark_r", size=0.9, seed=9)
    rig.track("clubHead", "hand_r", FIST_R)


def guard(near=(10.0, 34.0), far=(13.0, 38.0)):
    a, f = F.ik2(F.SH, near, L1, L2)
    la, lf = F.ik2(F.SH, far, L1, L2)
    return merge(F.arm("r", a, f), F.arm("l", la, lf))


STANCE = merge(guard(), {"torso": {"r": -6.0}})


def _idle(f):
    bob = [0.0, 1.0, 0.4, -0.4, 0.6, 0.0][f]

    def extra(ctx):
        return merge(guard(near=(10.0, 34.0 + bob), far=(13.0, 38.0 - 0.5 * bob)),
                     {"hips": {"z": -1.0 + 0.6 * bob}, "head": {"r": 3 * bob}, "antenna": {"r": 0.0}})
    pose = M.idle_v2(f, {"torso": {"r": -6.0}}, frames=6, extra=extra, blink=3, face_blink=KF.glyph("g_blink"))
    if f in (1, 4):
        pose["vent"] = {"show": True, "z": 1.5 * (f == 4)}
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 75.0
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=640)


def _walk(f, report=None):
    def extra(ctx):
        p = {"antenna": {"r": 0.0}}
        if f in (1, 5):
            p["vent"] = {"show": True}
        return p
    return M.walk_v3(RIG, f, {"torso": {"r": -4.0}}, GAIT, legs=LEGS, lean=-6.0, twist=8.0, nod=3.0, sway=3.0,
                     arms={"r": KF.ArmChain("r"), "l": KF.ArmChain("l")}, arm=32.0, elbow=(80.0, 110.0),
                     extra=extra, report=report)


def _pose(hand, far, t, rz, x, z, q, k):
    a, f = F.ik2(F.SH, hand, L1, L2)
    la, lf = F.ik2(F.SH, far, L1, L2)
    pose = merge(F.arm("r", a, f), F.arm("l", la, lf), {"torso": {"r": t, "rz": rz}, "head": {"r": -0.5 * t, "rz": -0.4 * rz}},
                 M.body_about((0, 0, 22), x=x, z=z, q=q))
    pose = KI.ground_feet(RIG, pose, LEGS)
    if k in (4, 5):
        pose["hand_r"] = dict(pose.get("hand_r", {}), s=1.12)
    if k in (6, 7):
        pose["spark_r"] = {"show": k == 6}
        pose["vent"] = {"show": True}
    g = "g_angry" if k in (1, 2, 3, 6, 7) else ("g_squint" if k in (4, 5) else "eyes")
    return merge(pose, KF.glyph(g))


#        read     jab      cock     HOLD     smear    smear    IMP      over     recoil   settle  (A: one-two)
A_H = [(12, 32), (6, 34), (-6, 40), (-9, 41), (8, 39), (20, 38), (28, 37), (27, 37), (18, 35), (12, 32)]
A_F = [(14, 36), (28, 39), (16, 39), (12, 40), (10, 39), (9, 38), (9, 38), (10, 38), (12, 38), (13, 38)]
A_T = [-6, -8, -2, 0, -8, -14, -18, -16, -10, -6]
A_RZ = [0, -6, 14, 20, 8, 2, 0, 0, 0, 0]
A_X = [0.0, 1.0, -1.5, -2.0, 1.0, 3.0, 4.0, 4.0, 2.0, 1.0]
A_Z = [0.0, -0.5, -1.0, -1.5, -1.5, -2.5, -3.0, -3.0, -1.5, 0.0]
A_Q = [0.0, 0.0, -0.03, -0.05, 0.03, 0.05, -0.08, -0.04, -0.02, 0.0]


def _a_pose(f):
    return _pose(A_H[f], A_F[f], A_T[f], A_RZ[f], A_X[f], A_Z[f], A_Q[f], f)


#        read     dip      drop     HOLD     smear    smear    IMP      over     recoil   settle  (B: uppercut)
B_H = [(10, 34), (6, 22), (4, 16), (3, 13), (9, 26), (14, 42), (16, 54), (15, 55), (12, 44), (10, 34)]
B_T = [-6, -16, -22, -24, -14, 0, 8, 8, 0, -6]
B_RZ = [0, 8, 12, 14, 6, 2, 0, 0, 0, 0]
B_X = [0.0, 0.0, -1.0, -1.5, 2.0, 5.0, 7.0, 7.0, 4.0, 1.0]
B_Z = [0.0, -4.0, -6.5, -7.5, -5.0, -1.0, 1.5, 1.5, 0.0, 0.0]
B_Q = [0.0, -0.05, -0.08, -0.09, 0.03, 0.06, 0.08, 0.03, -0.02, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_H[f], (13.0, 40.0), B_T[f], B_RZ[f], B_X[f], B_Z[f], B_Q[f], f)


#        read     lift     raise    HOLD     smear    smear    IMP      over     recoil   settle  (C: hammer fists)
C_H = [(10, 34), (6, 48), (2, 56), (0, 58), (10, 54), (18, 42), (22, 26), (22, 25), (15, 30), (10, 34)]
C_T = [-6, 2, 8, 10, 0, -14, -24, -22, -12, -6]
C_X = [0.0, -0.5, -1.5, -2.0, 1.0, 4.0, 7.0, 7.0, 3.0, 1.0]
C_Z = [0.0, 1.0, 2.0, 2.4, 0.5, -2.0, -4.5, -4.0, -1.5, 0.0]
C_Q = [0.0, 0.03, 0.05, 0.07, 0.02, -0.05, -0.12, -0.05, -0.02, 0.0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    h = C_H[f]
    return _pose(h, (h[0] + 1.0, h[1] + 1.0), C_T[f], 0.0, C_X[f], C_Z[f], C_Q[f], f)


CROSS = {"kind": "streak", "joint": "hand_r", "point": FIST_R, "color": W.MINT, "width_lu": 9.0, "white": 0.4}
ARC = {"kind": "arc", "joint": "hand_r", "inner": (FIST_R[0], FIST_R[1], FIST_R[2] + 5.0), "outer": FIST_R,
       "color": W.MINT, "taper": 0.3, "white": 0.4, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}


def _hit(k):
    return W.hit_heavy(k, STANCE, center=(0, 0, 34))


def _die(k):
    def extra(k, flail, stiff):
        return {"vent": {"show": 1 <= k <= 5, "z": 2.0 * k}, "spark_r": {"show": k in (1, 3)}}
    return W.die_d2(k, STANCE, extra=extra)


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        W.melee_clip("attack", _a_pose, CROSS, W.impact_fx("hand_r", FIST_R, 191, a0=-60.0, ground_x=20.0)),
        W.melee_clip("attack_b", _b_pose, ARC, W.impact_fx("hand_r", FIST_R, 192, a0=-110.0, ground_x=18.0), rr),
        W.melee_clip("attack_c", _c_pose, ARC, W.impact_fx("hand_r", FIST_R, 193, a0=-150.0, ground_x=22.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
