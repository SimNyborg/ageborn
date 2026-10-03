"""Sticky Bomber: Modern Age rare melee Anti-heavy (CONTENT_PLAN 5.6). Sticky charge, ×3 armored and mech, ~68 lu.

Look (A11, Modern palette): a wiry, wide-eyed sapper in a Brodie helmet (team band, netting) pushed back on
his head, a team tunic with team sleeves and cream chevrons, a big khaki satchel of spare charges on his far
hip, olive trousers and puttees, muddy boots. In his near hand: a sticky charge, a round bomb in a cream
tacky coat on a short wooden handle.

"A viewer expects him to run up, slap the sticky charge onto the tank hull and hop back covering his ears."

Animation (ANIM_SPEC G1 jog at card 70 x 1.25 = 87.5 lu/s, appendix B: overhand, underhand, overhead):
  idle      bouncing on his toes, he pats the satchel and peeks at the charge, blink
  walk      walk v3 crouched jog, the charge held up by his ear, the satchel bouncing a frame late
  attack    OVERHAND SLAP: he winds the charge back over his shoulder (the held extreme), slaps it onto the
            hull at chest height (thunk, a small pop), then hops back with both hands over his ears
  attack_b  LOW SCOOP: he crouches with the charge low behind his hip (the held extreme), scoops it up onto
            the hull's belly (a rising slap) and hops back
  attack_c  OVERHEAD SLAM: both hands raise the charge high over his helmet (the held extreme), slam it
            straight down onto the hull top and duck
  hit       light: the head snaps back, the helmet lifts, eyes squeezed
  die       D1 fling and spin: the helmet pops off and the charge flies; X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_modern as KM
from ageborn_art import kit_modern_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "sticky_bomber"
GAIT_NAME = "biped"
NAME = "Sticky Bomber"
HEIGHT_LU = 68
CANVAS = (300, 292)
FEET = (130, 256)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.4, R.ARM_Y["r"] - 0.6, R.HAND_Z - 0.4)
HANDLE = 9.0
BOMB = (HR[0], HR[1], HR[2] + HANDLE + 4.2)
TACKY = "#E6DDC2"
TACKY_DK = "#C9BE9C"


def _charge(rig, joint, at=HR):
    x, y, z = at
    g = Geo().capsule((x, y, z - 3.0), (x, y, z + HANDLE), 1.3)
    rig.part(joint, g, R.WOOD, outline=0.5)
    g = Geo().blob((x, y, z + HANDLE + 4.2), (4.6, 4.4, 4.8), p=2.1)
    rig.part(joint, g, TACKY, finish="gloss")
    g = Geo()
    for dx, dz in ((-2.2, 1.4), (1.8, 2.6), (0.4, -1.6)):
        g.blob((x + dx, y - 3.4, z + HANDLE + 4.2 + dz), (1.0, 0.8, 1.2), p=2.2)
    rig.part(joint, g, TACKY_DK, outline=0, highlight=False)
    g = Geo().lathe([(1.6, -0.6), (1.8, 0), (1.6, 0.6)], (x, y, z + HANDLE - 0.4), (x, y, z + HANDLE + 0.6), segs=12)
    rig.part(joint, g, R.GUNMETAL, finish="metal", outline=0.3)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, hat="brodie", hat_c=(0.0, 0.0, 61.0), brow_angry=False, mouth_w=5.4, mud=True)
    g = Geo().blob((0.0, 11.6, 16.0), (6.4, 3.0, 5.6), p=3.0)          # satchel on the far hip
    rig.part("torso", g, R.KHAKI, outline=0.6)
    g = Geo().blob((0.6, 11.8, 20.6), (6.6, 3.2, 1.8), p=3.0)
    rig.part("torso", g, R.KHAKI_LT, outline=0.4)
    g = Geo().capsule((5.0, 9.0, 21.0), (4.0, -9.0, 36.0), 1.3)       # satchel strap across the chest
    rig.part("torso", g, R.KHAKI, outline=0.5)
    rig.joint("charge", "hand_r", HR)
    _charge(rig, "charge")
    rig.joint("pop", "root", (22.0, -10.0, 30.0), hidden=True)          # the pop flash on the hull
    g = Geo().star((22.0, -12.0, 30.0), 7.0, 2.6, 1.2, points=7)
    rig.part("pop", g, glow=R.FIRE, outline=0)
    KI.loose(rig, "charge_loose", HR, lambda j: _charge(rig, j))
    rig.track("bladeTip", "charge", BOMB)


def arm_r(a, f, w):
    return R.arm("r", a, f, w, w_rest=90.0)


def ears(t=0.0):
    """Both hands clapped over his ears (the hop back)."""
    a, f = R.ik2(R.SH, (4.0, 46.0))
    return merge(R.arm("r", a - t, f - t, 90.0 - t, w_rest=90.0), R.arm("l", a - t, f - t))


STANCE = merge(arm_r(-30, 50, 80), R.arm("l", -80, -20), {"torso": {"r": -4.0}})


def _idle(f):
    bounce = [0.0, 1.0, 0.3, 0.0, 1.0, 0.3][f]
    peek = [0.0, 0.0, 0.6, 1.0, 0.4, 0.0][f]

    def extra(ctx):
        return {"hips": {"z": 0.8 * bounce}, "head": {"r": -8 * peek, "rz": 10 * peek},
                "pupils": {"z": 0.6 * peek, "x": 0.4 * peek}, "arm_r": {"r": 3 * ctx["lag"]}}
    pose = M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    return KM.ground_feet(RIG, pose, LEGS)


SPEED = 87.5
LEGS = KM.legs_ik()
GAIT = KM.jog_gait(LEGS, SPEED, cycle_ms=600)
CARRY = merge(arm_r(10, 110, 100), {"torso": {"r": -6.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"arm_r": {"r": 4 * lag}, "hand_r": {"r": 8 * lag}, "hat": {"r": -1.5 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-13.0, twist=6.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=34.0, extra=extra, report=report)


# moves.SMALL_MELEE_MS (impact on step 6 at 290 of 680 ms): 10 unique poses + the read again
#        read  wind  cock  HOLD  smear smear IMP   hop   ears  settle      (A: overhand slap)
A_A = [-30, 60, 100, 115, 60, 10, -5, None, None, -30]
A_F = [50, 120, 150, 160, 70, 10, -5, None, None, 50]
A_W = [80, 140, 170, 180, 70, 0, -10, None, None, 80]
A_T = [-4, 4, 10, 12, -2, -14, -20, 2, 4, -4]
A_X = [0.0, -1.0, -2.0, -3.0, 2.0, 6.0, 9.0, 1.0, -2.0, 0.0]
A_Z = [0.0, -1.0, -1.5, -2.0, -1.5, -3.0, -4.0, 3.0, 0.5, 0.0]
A_Q = [0.0, -0.03, -0.05, -0.07, 0.05, 0.06, -0.10, 0.05, -0.02, 0.0]


def _pose(a, fo, w, t, x, z, q, k, hold_ks, smear_ks, impact_k=6, plant=True):
    if a is None:
        pose = merge(ears(t), {"torso": {"r": t}, "head": {"r": -0.5 * t}})
    else:
        pose = merge(arm_r(a - t, fo - t, w - t), R.arm("l", -70 - 0.5 * t, -10 - 0.5 * t),
                     {"torso": {"r": t}, "head": {"r": -0.5 * t}})
    pose = merge(pose, {"pop": {"show": k == impact_k}, "charge": {"hide": k in (impact_k + 1, impact_k + 2)}},
                 M.body_about((0, 0, 22), x=x, z=z, q=q))
    if plant:
        pose = KM.ground_feet(RIG, pose, LEGS)
    if k in smear_ks:
        pose["hand_r"]["sz"] = 1.12
    if k in hold_ks:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in smear_ks or k == impact_k:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif k in (impact_k + 1, impact_k + 2):
        pose = merge(pose, F.expr("squeeze", "o"))
    return pose


def _a_pose(f):
    return _pose(A_A[f], A_F[f], A_W[f], A_T[f], A_X[f], A_Z[f], A_Q[f], f, (1, 2, 3), (4, 5))


#        read  drop  back  HOLD  smear smear IMP   hop   ears  settle      (B: low scoop)
B_A = [-30, -110, -140, -150, -100, -40, -10, None, None, -30]
B_F = [50, -120, -160, -168, -80, -10, 20, None, None, 50]
B_W = [80, -150, -175, -180, -90, 0, 40, None, None, 80]
B_T = [-4, -12, -16, -18, -14, -10, -8, 2, 4, -4]
B_X = [0.0, -0.5, -1.5, -2.0, 2.0, 6.0, 9.0, 1.0, -2.0, 0.0]
B_Z = [0.0, -4.0, -6.0, -7.0, -6.0, -5.0, -4.0, 3.0, 0.5, 0.0]
B_Q = [0.0, -0.06, -0.08, -0.10, 0.05, 0.06, -0.08, 0.05, -0.02, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_A[f], B_F[f], B_W[f], B_T[f], B_X[f], B_Z[f], B_Q[f], f, (1, 2, 3), (4, 5))


#        read  lift  raise HOLD  smear smear IMP   over  duck  settle      (C: overhead two-handed slam)
C_A = [-30, 50, 70, 78, 40, -10, -40, -45, -40, -30]
C_F = [50, 80, 90, 94, 50, -10, -50, -55, -30, 50]
C_W = [80, 90, 92, 95, 50, -20, -70, -80, -40, 80]
C_T = [-4, 8, 14, 16, 2, -14, -26, -26, -16, -4]
C_X = [0.0, -1.0, -2.0, -2.5, 1.0, 5.0, 8.0, 8.0, 3.0, 0.0]
C_Z = [0.0, 1.0, 1.5, 1.5, 0.0, -3.0, -6.0, -6.5, -4.0, 0.0]
C_Q = [0.0, 0.03, 0.05, 0.06, 0.02, 0.06, -0.12, -0.06, -0.02, 0.0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    pose = _pose(C_A[f], C_F[f], C_W[f], C_T[f], C_X[f], C_Z[f], C_Q[f], f, (1, 2, 3), (4, 5))
    if 1 <= f <= 6:   # the far hand joins on the handle
        t = C_T[f]
        hx, hz = KM.hand_at(C_A[f] - t, C_F[f] - t)
        a, fo = R.ik2(R.SH, (hx - 1.0, hz - 1.5))
        pose = merge(pose, R.arm("l", a, fo))
    return pose


SLAP = {"kind": "arc", "joint": "charge", "inner": (HR[0], HR[1], HR[2] + 3.0), "outer": BOMB, "color": TACKY,
        "taper": 0.2, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}


def _fx(seed, a0=-80.0):
    return [{"kind": "burst", "joint": "charge", "point": BOMB, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6, "a0": a0,
             "arc": 150.0, "color": "#FFF1C8"},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": seed, "spread": 0.9}]


def _clip(name, fn, seed, a0, reuse=None):
    ov = {4: [dict(SLAP, **{"from": 3})], 5: [dict(SLAP, **{"from": 4})],
          6: [dict(SLAP, **{"from": 5, "t1": 1.0, "lines": 2})] + _fx(seed, a0),
          7: [{"kind": "rings", "joint": "head", "point": (2.0, 0.0, 50.0), "radii_lu": (14.0, 18.0), "a0": -40.0,
               "a1": 220.0, "color": "#FFF4D6"}]}
    return M.clip(name, [fn(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT, smear=4,
                  overlays=ov, sequence=list(range(10)) + [0], reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    base = {"torso": {"r": -4.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: arm_r(-30 + 20 * a, 50 + 30 * a, 80 + 20 * a) if a > 0 else {})


def _die(k):
    pose = W.die_d1_pose(k, STANCE, HEIGHT_LU)
    path = W.PROP_PATH[k]
    if path is not None:
        x, z, r = path
        pose["charge"] = {"hide": True}
        pose["charge_loose"] = {"show": True, "x": x, "z": z, "r": r}
    return pose


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _clip("attack", _a_pose, 101, -60.0),
        _clip("attack_b", _b_pose, 102, -20.0, rr),
        _clip("attack_c", _c_pose, 103, -110.0, rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
