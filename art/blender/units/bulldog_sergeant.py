"""Bulldog Sergeant: Modern Age rare infantry, Frenzy (CONTENT_PLAN 5.6). Bare fists, ~68 lu.

Look (A11, Modern palette): a barrel-chested, jowly sergeant with a bulldog underbite and a bristling
moustache, a stiff peaked cap with a team band, a team tunic stretched over his chest (three cream chevrons
on the near sleeve), sleeves rolled up over hairy forearms, khaki webbing, olive trousers and puttees. He
fights with his bare fists.

"A viewer expects a boxer: jabs, hooks and uppercuts, and a barrel-chested swagger."

Animation (ANIM_SPEC G1 swagger jog at card 75 x 1.25 = 93.75 lu/s, appendix B brawler):
  idle      fists up in a boxer's guard, he bobs and rolls his shoulders, a scowl and a blink
  walk      walk v3 swagger jog: chest out, fists pumping, the cap tipped
  attack    RIGHT HOOK: he winds the near fist back by his ear, the torso twisted away (the held extreme),
            then hooks it round flat through the enemy's jaw (a horizontal hit)
  attack_b  UPPERCUT: he dips low with the fist down by his knee (the held extreme) and drives it straight
            up under the chin (a rising hit)
  attack_c  STRAIGHT JAB: he tucks his chin behind the far fist and pulls the near fist back to his chest
            (the held extreme), then snaps a straight jab with a lunge (a thrust)
  hit       light: the head snaps back, the cap lifts, eyes squeezed
  die       D1 fling and spin: the cap pops off; X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "bulldog_sergeant"
GAIT_NAME = "biped"
NAME = "Bulldog Sergeant"
HEIGHT_LU = 68
CANVAS = (300, 272)
FEET = (130, 244)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32)}
NO_RETIME = True

FIST = (0.6, R.ARM_Y["r"], R.HAND_Z - 0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, hat="peaked", stubble=True, rolled=True, chevrons=3, fist=6.4, mouth_w=6.6, mouth_shape="grim")
    g = Geo().blob((2.0, 0, 29.0), (12.6, 11.0, 10.4), p=2.3)          # barrel chest over the tunic
    rig.part("torso", g, team=True)
    g = Geo().blob((12.4, -1.0, 40.4), (2.2, 7.0, 1.6), p=2.2, rot=(0, -8, 0))   # moustache
    rig.part("head", g, R.HAIR, finish="hair", outline=0.5)
    g = Geo().blob((10.6, 0.0, 37.4), (5.4, 8.6, 3.2), p=2.2)          # jowls and underbite
    rig.part("head", g, R.SKIN, outline=0.5)
    g = Geo()
    for y in (-2.6, 2.4):
        g.blob((14.4, y, 38.6), (0.9, 0.8, 1.3), p=2.2)
    rig.part("head", g, R.TOOTH, outline=0.3)
    rig.track("clubHead", "hand_r", FIST)


def guard(t=0.0, near=(9.0, 39.0), far=(11.0, 42.0)):
    a, f = R.ik2(R.SH, near)
    la, lf = R.ik2(R.SH, far)
    return merge(R.arm("r", a, f), R.arm("l", la, lf))


STANCE = merge(guard(), {"torso": {"r": -6.0}})


def _idle(f):
    bob = [0.0, 1.0, 0.4, -0.4, 0.6, 0.0][f]
    roll = [0.0, 0.5, 1.0, 0.5, 0.0, -0.4][f]

    def extra(ctx):
        return merge(guard(near=(9.0 - roll, 39.0 + bob), far=(11.0 + roll, 42.0 - 0.5 * bob)),
                     {"torso": {"rz": 6 * roll}, "hips": {"z": -1.0 + 0.6 * bob}, "head": {"r": 3 * bob}})
    pose = M.idle_v2(f, {"torso": {"r": -6.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=3)
    return KM.ground_feet(RIG, pose, LEGS)


SPEED = 93.75
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=584)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hat": {"r": -2.0 * lag}}
    return M.walk_v3(RIG, f, {"torso": {"r": -2.0}}, GAIT, legs=LEGS, lean=-6.0, twist=9.0, nod=3.0, sway=4.0,
                     arms={"r": KI.ArmChain("r"), "l": KI.ArmChain("l")}, arm=36.0, elbow=(80.0, 110.0),
                     extra=extra, report=report)


# moves.SMALL_MELEE_MS (impact on step 6 at 290 of 680 ms): 10 unique poses + the read again.
# Each pose: the near fist target (x, z) in torso space, the torso lean and twist.
#        read  wind  cock  HOLD  smear smear IMP   over  recoil settle      (A: right hook)
A_HX = [9.0, 2.0, -3.0, -5.0, 2.0, 10.0, 15.0, 13.0, 10.0, 9.0]
A_HZ = [39.0, 40.0, 41.0, 41.0, 40.0, 39.0, 38.0, 37.0, 38.0, 39.0]
A_T = [-6, -4, 0, 2, -6, -12, -16, -14, -10, -6]
A_RZ = [0, 16, 30, 36, 14, -14, -30, -32, -14, 0]
A_X = [0.0, -1.0, -2.0, -2.5, 1.0, 5.0, 8.0, 8.0, 4.0, 1.0]
A_Z = [0.0, -1.0, -1.5, -2.0, -1.5, -2.5, -3.0, -3.0, -1.5, 0.0]
A_Q = [0.0, -0.03, -0.05, -0.07, 0.05, 0.06, -0.10, -0.05, -0.02, 0.0]


def _pose(hx, hz, t, rz, x, z, q, k, hold_ks, smear_ks, impact_k=6, far=(11.0, 42.0)):
    a, f = R.ik2(R.SH, (hx, hz))
    la, lf = R.ik2(R.SH, far)
    pose = merge(R.arm("r", a, f), R.arm("l", la, lf), {
        "torso": {"r": t, "rz": rz}, "head": {"r": -0.5 * t, "rz": -0.4 * rz},
    }, M.body_about((0, 0, 22), x=x, z=z, q=q))
    pose = KM.ground_feet(RIG, pose, LEGS)
    if k in smear_ks:
        pose["hand_r"] = dict(pose.get("hand_r", {}), s=1.15)
    if k in hold_ks:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.2}})
    elif k in smear_ks or k in (impact_k, impact_k + 1):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.4}})
    return pose


def _a_pose(f):
    return _pose(A_HX[f], A_HZ[f], A_T[f], A_RZ[f], A_X[f], A_Z[f], A_Q[f], f, (1, 2, 3), (4, 5))


#        read  dip   drop  HOLD  smear smear IMP   over  recoil settle      (B: uppercut)
B_HX = [9.0, 6.0, 5.0, 4.0, 8.0, 11.0, 12.0, 11.0, 10.0, 9.0]
B_HZ = [39.0, 26.0, 22.0, 20.0, 30.0, 42.0, 49.0, 50.0, 44.0, 39.0]
B_T = [-6, -16, -22, -24, -14, 0, 8, 8, 0, -6]
B_RZ = [0, 10, 16, 18, 6, -6, -12, -10, -4, 0]
B_X = [0.0, 0.0, -1.0, -1.5, 2.0, 5.0, 7.0, 7.0, 4.0, 1.0]
B_Z = [0.0, -4.0, -6.5, -7.5, -5.0, -1.0, 1.5, 1.5, 0.0, 0.0]
B_Q = [0.0, -0.06, -0.09, -0.11, 0.04, 0.08, 0.10, 0.04, -0.02, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_HX[f], B_HZ[f], B_T[f], B_RZ[f], B_X[f], B_Z[f], B_Q[f], f, (1, 2, 3), (4, 5))


#        read  tuck  pull  HOLD  smear smear IMP   over  recoil settle      (C: straight jab with a lunge)
C_HX = [9.0, 6.0, 3.0, 2.0, 9.0, 14.0, 16.0, 15.0, 11.0, 9.0]
C_HZ = [39.0, 37.0, 36.0, 36.0, 37.0, 38.0, 38.0, 38.0, 38.5, 39.0]
C_T = [-6, -10, -12, -14, -18, -22, -26, -24, -14, -6]
C_RZ = [0, 6, 10, 12, 2, -8, -14, -12, -6, 0]
C_X = [0.0, -0.5, -1.5, -2.0, 4.0, 9.0, 12.0, 12.0, 6.0, 1.0]
C_Z = [0.0, -1.5, -2.5, -3.0, -3.5, -4.0, -4.5, -4.0, -2.0, 0.0]
C_Q = [0.0, -0.03, -0.05, -0.06, 0.04, 0.05, -0.10, -0.05, -0.02, 0.0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_HX[f], C_HZ[f], C_T[f], C_RZ[f], C_X[f], C_Z[f], C_Q[f], f, (1, 2, 3), (4, 5),
                 far=(12.0, 45.0))


HOOK = {"kind": "arc", "joint": "hand_r", "inner": (FIST[0], FIST[1], FIST[2] + 4.0), "outer": FIST,
        "color": R.SKIN, "taper": 0.3, "white": 0.4, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}
JAB = {"kind": "streak", "joint": "hand_r", "point": FIST, "color": R.SKIN, "width_lu": 7.0, "white": 0.4}


def _fx(seed, a0=-70.0):
    return [{"kind": "burst", "joint": "hand_r", "point": FIST, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6, "a0": a0,
             "arc": 150.0, "color": "#FFF1C8"},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": seed, "spread": 0.9}]


def _clip(name, fn, smear, seed, a0, reuse=None):
    ov = {4: [dict(smear, **{"from": 3})], 5: [dict(smear, **{"from": 4})], 6: [dict(smear, **{"from": 5})] + _fx(seed, a0)}
    return M.clip(name, [fn(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT, smear=4,
                  overlays=ov, sequence=list(range(10)) + [0], reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    base = {"torso": {"r": -6.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: guard(near=(8.0 - 3 * a, 39.0 + 3 * a)) if a > 0 else {})


def _die(k):
    return W.die_d1_pose(k, STANCE, HEIGHT_LU, hat_land=58.0)


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _clip("attack", _a_pose, HOOK, 111, -40.0),
        _clip("attack_b", _b_pose, HOOK, 112, -110.0, rr),
        _clip("attack_c", _c_pose, JAB, 113, -60.0, rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
