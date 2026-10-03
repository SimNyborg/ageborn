"""Android Pair: Future Age common infantry, Squad x2 (CONTENT_PLAN 5.7). Stun baton, ~66 lu per android.

One sheet draws one android; the game spawns two and plays them desynchronised (X0 M1).

Look (A11, Future palette): a slim white android on a charcoal suit, no backpack, a smooth egg head with a
wide dark wrap-around visor (mint robot eyes that act), a team stripe over the crown, a whip antenna with a
magenta tip, a team chest plate with the pale hex, team shoulder pads with a light strip and team shin
guards. It fights with a stun baton: a gunmetal grip, a white shaft with a team band and a glowing mint tip.

"A viewer expects a robot policeman: a baton twirl and a crack, quick and precise, marching in step."

Animation (ANIM_SPEC G1 march jog at card 85 x 1.25 = 106.25 lu/s, appendix B club/baton):
  idle      baton held across the body, it taps the tip into the far palm, a blink, a happy glyph
  walk      walk v3 jog with a little hover-hop (high knees): the baton sloped back on the near shoulder
  attack    TWIRL AND CRACK: the baton twirls in front of the chest (a mint ring smear), then is cocked high
            behind the head (the held extreme) and cracks down diagonally onto the target (sparks)
  attack_b  LOW SWEEP: drops into a crouch with the baton trailing low behind the hip (the held extreme), then
            a flat sweep at knee height (a horizontal hit)
  attack_c  JAB: turned side-on with the baton pulled back level at the chest (the held extreme), a fencing
            lunge and a straight jab, the tip crackling
  hit       light: the head snaps back, the antenna whips, eyes > <
  die       D1 fling and spin, the baton flung away, X eyes
"""
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "android_pair"
GAIT_NAME = "biped"
NAME = "Android Pair"
HEIGHT_LU = 66
CANVAS = (330, 290)
FEET = (150, 232)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 31)}
NO_RETIME = True

HR = (0.0, F.ARM_Y["r"], F.HAND_Z)
SHAFT = 26.0
TIP = (HR[0], HR[1] - 0.5, HR[2] + 4.0 + SHAFT + 2.5)
MID = (HR[0], HR[1] - 0.5, HR[2] + 4.0 + SHAFT * 0.45)


def _baton(rig, j, at=HR):
    hx, hy, hz = at
    g = Geo().capsule((hx, hy, hz - 3.6), (hx, hy, hz + 4.0), 1.8)
    rig.part(j, g, F.GUNMETAL, outline=0.8)
    g = Geo().blob((hx, hy, hz + 4.4), (3.0, 3.0, 1.2), p=2.6)              # guard disc
    rig.part(j, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().capsule((hx, hy - 0.2, hz + 5.0), (hx, hy - 0.2, hz + 4.0 + SHAFT), 1.7, 1.5)
    rig.part(j, g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().capsule((hx, hy - 0.4, hz + 11.0), (hx, hy - 0.4, hz + 16.0), 2.0)   # team band
    rig.part(j, g, team=True, outline=0.6)
    g = Geo().capsule((hx, hy - 0.4, hz + 4.0 + SHAFT), (hx, hy - 0.4, hz + 4.0 + SHAFT + 4.5), 2.4, 2.0)
    rig.part(j, g, glow=W.MINT, outline=1.0, outline_hex=F.SUIT)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="android", pack=False, team_greave=True, team_thigh=True, team_sleeve=True, antenna=True, head=(1, 0, 38))
    # a team stripe down the back so the team reads from every angle
    g = Geo().blob((-9.4, 0, 30.0), (2.4, 7.6, 8.4), p=3.0)
    rig.part("torso", g, team=True, outline=0.6)
    # chest light strips (androids glow a little)
    KF.strip(rig, "torso", [(9.6, -6.0, 26.0), (10.2, -6.4, 30.0)], r=0.7)
    rig.joint("baton", "hand_r", HR)
    _baton(rig, "baton")
    rig.joint("crackle", "baton", TIP, hidden=True)
    F.sparks(rig, "baton", TIP, name="crackle", size=0.7, seed=3)
    KI.loose(rig, "baton_loose", HR, lambda j: _baton(rig, j))
    rig.track("clubHead", "baton", TIP)


def arms(ha, hf, bw, la=-30.0, lf=10.0):
    """Baton arm (upper, fore, baton direction) and the free far arm, torso space."""
    return merge(F.arm("r", ha, hf, bw, 90.0), F.arm("l", la, lf))


def arms_at(hand, bw, far=(6.0, 26.0)):
    a, f = F.ik2(F.SH, hand)
    la, lf = F.ik2(F.SH, far)
    return merge(F.arm("r", a, f, bw, 90.0), F.arm("l", la, lf))


STANCE = merge(arms_at((8.0, 26.0), 40.0, far=(11.0, 27.0)), {"torso": {"r": -2.0}})


def _idle(f):
    tap = [0.0, 0.5, 1.0, 0.5, 0.0, 0.0][f]

    def extra(ctx):
        return merge(arms_at((8.0, 26.0 + 1.5 * tap), 40.0 - 22.0 * tap, far=(11.0 - 1.0 * tap, 27.0 + 2.5 * tap)),
                     {"antenna": {"r": 0.0}})
    pose = M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, blink=4, face_blink=KF.glyph("g_blink"))
    if f == 2:
        pose = merge(pose, KF.glyph("g_happy"))
    return KI.ground_feet(RIG, pose, LEGS)


# -- walk v3: G1 march jog at ground speed (card 85 x 1.25 = 106.25 lu/s) ---------------------------
SPEED = 106.25
LEGS = KF.legs_ik()
GAIT = KF.jog_gait(LEGS, SPEED, cycle_ms=560)
CARRY = merge(arms_at((4.0, 32.0), 128.0), {"torso": {"r": -3}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        a, fo = F.ik2(F.SH, (4.0, 32.0 + 0.8 * lag))
        return merge(F.arm("r", a, fo, 128.0 - 6 * lag, 90.0), {"antenna": {"r": 0.0}})
    return M.walk_v3(RIG, f, {"torso": {"r": -3}}, GAIT, legs=LEGS, lean=-7.0, twist=6.0, nod=3.0,
                     arms={"l": KF.ArmChain("l")}, arm=32.0, extra=extra, report=report)


def _pose(hand, bw, t, rz, x, z, q, k, far=(11.0, 27.0), eyes=None, smear=(4, 5), impact=6):
    pose = merge(arms_at(hand, bw, far=far), {"torso": {"r": t, "rz": rz}, "head": {"r": -0.4 * t, "rz": -0.4 * rz}},
                 M.body_about((0, 0, 22), x=x, z=z, q=q))
    pose = KI.ground_feet(RIG, pose, LEGS)
    if k in smear:
        pose.setdefault("baton", {})["sz"] = 1.15
    if k in (impact, impact + 1):
        pose["crackle"] = {"show": True}
    g = eyes or ("g_angry" if k in (1, 2, 3) else ("g_squint" if k in smear else ("g_angry" if k in (impact, impact + 1) else "eyes")))
    return merge(pose, KF.glyph(g))


# moves.SMALL_MELEE_MS: 10 unique poses + the read again; impact on frame 6.
#        read   twirl  twirl  HOLD   smear  smear  IMP    over   recoil settle     (A: twirl and crack)
A_H = [(8, 26), (12, 30), (12, 32), (2, 46), (10, 44), (15, 36), (17, 28), (16, 26), (12, 26), (8, 26)]
A_W = [40, 200, 330, 128, 80, 20, -32, -40, 0, 40]
A_T = [-2, -4, -6, 4, -6, -14, -20, -18, -10, -2]
A_X = [0.0, 0.5, 0.5, -2.0, 1.0, 4.0, 7.0, 7.0, 3.5, 0.5]
A_Z = [0.0, 0.5, 1.0, 1.5, 0.0, -2.0, -3.5, -3.0, -1.5, 0.0]
A_Q = [0.0, 0.02, 0.03, 0.06, 0.02, -0.04, -0.12, -0.05, -0.02, 0.0]


def _a_pose(f):
    return _pose(A_H[f], A_W[f], A_T[f], 0.0, A_X[f], A_Z[f], A_Q[f], f, eyes=("g_squint" if f in (1, 2) else None),
                 smear=(4, 5))


#        read   drop   trail  HOLD   smear  smear  IMP    over   recoil settle     (B: low sweep)
B_H = [(8, 26), (2, 24), (-4, 21), (-8, 20), (4, 20), (14, 20), (20, 20), (19, 20), (13, 23), (8, 26)]
B_W = [40, -140, -160, -172, -40, -6, 6, 10, 20, 40]
B_T = [-2, -10, -16, -20, -16, -14, -12, -10, -6, -2]
B_RZ = [0, 10, 22, 30, 10, -12, -26, -24, -10, 0]
B_X = [0.0, -0.5, -1.5, -2.0, 1.5, 4.0, 6.0, 6.0, 3.0, 0.5]
B_Z = [0.0, -3.0, -5.5, -7.0, -6.5, -6.0, -6.0, -5.0, -2.5, 0.0]
B_Q = [0.0, -0.04, -0.07, -0.09, -0.02, 0.03, -0.10, -0.04, -0.02, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_H[f], B_W[f], B_T[f], B_RZ[f], B_X[f], B_Z[f], B_Q[f], f, far=(10.0, 30.0))


#        read   turn   pull   HOLD   smear  smear  IMP    over   recoil settle     (C: fencing jab)
C_H = [(8, 26), (4, 30), (0, 32), (-4, 32), (8, 32), (16, 32), (21, 31), (20, 31), (14, 28), (8, 26)]
C_W = [40, 10, 2, 0, 0, 0, -2, -2, 14, 40]
C_T = [-2, -6, -8, -8, -14, -20, -24, -22, -12, -2]
C_RZ = [0, 12, 20, 26, 8, -6, -14, -12, -6, 0]
C_X = [0.0, -1.0, -2.0, -3.0, 3.0, 8.0, 11.0, 11.0, 5.0, 0.5]
C_Z = [0.0, -1.5, -2.5, -3.0, -3.5, -4.5, -5.0, -4.0, -2.0, 0.0]
C_Q = [0.0, -0.03, -0.05, -0.06, 0.04, 0.05, -0.10, -0.05, -0.02, 0.0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_H[f], C_W[f], C_T[f], C_RZ[f], C_X[f], C_Z[f], C_Q[f], f, far=(-4.0, 36.0))


CRACK = {"kind": "arc", "joint": "baton", "inner": MID, "outer": TIP, "color": W.MINT, "taper": 0.15, "white": 0.35,
         "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}
JAB = {"kind": "streak", "joint": "baton", "point": TIP, "color": W.MINT, "width_lu": 6.0, "white": 0.35}


def _attack_a():
    twirl = {"kind": "arc", "joint": "baton", "inner": (HR[0], HR[1], HR[2] + 2.0), "outer": TIP, "color": W.MINT,
             "white": 0.35, "taper": 0.1, "band": 0.4, "lines": 2, "t0": 0.0, "t1": 1.0, "samples": 18}
    ov = {1: [dict(twirl, **{"from": 0})], 2: [dict(twirl, **{"from": 1})],
          4: [dict(CRACK, **{"from": 3})], 5: [dict(CRACK, **{"from": 4})],
          6: [dict(CRACK, **{"from": 5})] + W.impact_fx("baton", TIP, 121, a0=-110.0, ground_x=20.0)}
    return M.clip("attack", [_a_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT, smear=4,
                  overlays=ov, sequence=list(range(10)) + [0], extra={"holdStep": 3})


def _hit(k):
    base = {"torso": {"r": -2.0}} if M.HIT_AMT[k] > 0 else STANCE
    return W.hit_pose(k, base, lambda a: merge(arms_at((8.0 - 3 * a, 26.0 + 3 * a), 40.0 + 30 * a),
                                               {"antenna": {"r": 0.0}}) if a > 0 else {})


def _die(k):
    return W.die_d1(k, STANCE, HEIGHT_LU, prop="baton", prop_path=W.PROP_PATH)


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_a(),
        W.melee_clip("attack_b", _b_pose, CRACK, W.impact_fx("baton", TIP, 122, a0=-40.0, ground_x=22.0), rr),
        W.melee_clip("attack_c", _c_pose, JAB, W.impact_fx("baton", TIP, 123, a0=-70.0, ground_x=24.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
