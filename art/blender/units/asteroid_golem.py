"""Asteroid Golem: Cosmic Age common Heavy, Brute (armored construct, CONTENT_PLAN 5.8). A walking asteroid, ~100 lu.

Look (A11, Cosmic palette): a hulking golem of violet-grey space rock with mint glowing cracks, chunky rock legs
and long arms ending in huge boulder fists; a small rock head sunk between the shoulders with a dark crack band
whose light violet glyph eyes act. The star legions have bolted team plates on it: a team chest plate with the
pale star, team shoulder plates and a team belt plate. Three pebbles orbit its shoulders.

"A viewer expects a rock giant: slow heavy stomps that shake the ground, and a huge boulder uppercut that
throws two foes."

Animation (ANIM_SPEC G3 heavy walk at card 50 x 1.25 = 62.5 lu/s, 10 frames in 1100 ms, appendix B mechs and
golems; heavy melee timing):
  idle      breathes on bent knees, the pebbles orbit, the cracks pulse, a blink
  walk      G3 heavy walk: hard contacts with a jolt, deep downs, the arms swinging, dust at the feet
  attack    BOULDER UPPERCUT: drops low with the fist down by the knee (the held extreme), then rips it up and out
            (an arc smear, meteor dust)
  attack_b  DOUBLE HAMMER: both fists raised high over the head (the held extreme), then slammed down in front
  attack_c  BACKHAND SWEEP: the fist swung far back behind the hip (the held extreme), then a flat sweep across
  hit       a hard jolt with no squash, pebbles shaken loose, eyes > <
  die       D6 crumble: the knees buckle, it topples back and the rocks settle, the cracks go dark, X eyes
"""
import math

from ageborn_art import gait as GK
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.colors import scale as darker
from ageborn_art.geometry import Geo

SLUG = "asteroid_golem"
GAIT_NAME = "biped"
NAME = "Asteroid Golem"
HEIGHT_LU = 104
CANVAS = (420, 380)
FEET = (190, 340)
ANCHORS = {"head": (6, 100), "hitCenter": (0, 50)}
NO_RETIME = True

S = 1.45
AY = {"r": -17.0, "l": 15.0}      # the arms sit outside the boulder body
ARM_K = 1.55
L1, L2 = K.UPPER * ARM_K, K.LOWER * ARM_K
FIST = (1.0, AY["r"], K.HAND_Z - 1.0)
CRACK = "#1C8A6A"


def _rock(rig, joint, c, r, color=CW.ROCK, rot=(0, 0, 0), p=1.9):
    g = Geo().blob(c, r, p=p, rot=rot)
    rig.part(joint, g, color, outline_hex=CW.ROCK_DK)


def _legs(rig):
    for s in ("r", "l"):
        y = K.LEG_Y * K.SIDE_Y[s]
        k = 1.0 if s == "r" else 0.8
        col = CW.ROCK if s == "r" else darker(CW.ROCK, 0.8)
        g = Geo().blob((0.4, y, (KC.V3_THIGH_Z + KC.V3_KNEE_Z) / 2 + 0.6), (4.8, 4.8, 5.4), p=1.9)
        rig.part(f"thigh_{s}", g, col, outline_hex=CW.ROCK_DK)
        g = Geo().blob((0.8, y, (KC.V3_KNEE_Z + KC.V3_ANKLE_Z) / 2 + 0.4), (4.0, 4.4, 5.0), p=1.9)
        rig.part(f"shin_{s}", g, col, outline_hex=CW.ROCK_DK)
        g = Geo().blob((3.0, y, 2.2), (4.8, 5.0, 2.6), p=2.2, taper=(1.05, 0.85))
        rig.part(f"foot_{s}", g, darker(CW.ROCK_DK, k), outline_hex=CW.ROCK_DK)
        g = Geo().blob((2.4, y - 0.6, KC.V3_KNEE_Z + 0.6), (3.6, 4.4, 3.8), p=2.4)
        rig.part(f"shin_{s}", g, team=True, outline=0.6)
        g = Geo().blob((1.6, y - 0.4, KC.V3_THIGH_Z - 2.0), (4.4, 5.0, 3.0), p=2.4)
        rig.part(f"thigh_{s}", g, team=True, outline=0.6)
    rig.track("_foot", "foot_r", (2.6, -K.LEG_Y, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, K.LEG_Y, 0.0))


def _fist(rig, s, at):
    x, y, z = at
    col = CW.ROCK if s == "r" else darker(CW.ROCK, 0.82)
    _rock(rig, f"hand_{s}", (x + 1.0, y, z - 1.4), (8.0, 7.0, 7.6), color=col)
    _rock(rig, f"hand_{s}", (x + 4.0, y - 0.6 * K.SIDE_Y[s] * -1, z + 2.4), (3.0, 3.0, 2.6), color=col, rot=(0, 30, 0))
    g = Geo().lathe([(0, -1.2), (5.4, -1.0), (5.4, 1.0), (0, 1.2)], (x, y, z + 5.4), (x, y, z + 7.4), segs=12)
    rig.part(f"hand_{s}", g, team=True, outline=0.6)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KC.skeleton_v3(rig, head=(2, 0, 40), arm_y=AY)
    rig.rest_scale["body"] = S
    _legs(rig)
    # the far arm
    for s in ("l",):
        y = AY[s]
        _rock(rig, f"arm_{s}", (0, y, (K.SHOULDER_Z + K.ELBOW_Z) / 2), (3.8, 3.8, 5.0), color=darker(CW.ROCK, 0.82))
        _rock(rig, f"fore_{s}", (0, y, (K.ELBOW_Z + K.HAND_Z) / 2 + 1), (3.6, 3.6, 4.6), color=darker(CW.ROCK, 0.82))
    _fist(rig, "l", (1.0, AY["l"], K.HAND_Z - 1.0))
    # the body: a big boulder chest and belly, mint cracks, team plates bolted on
    _rock(rig, "torso", (0.0, 0, 29.0), (12.6, 12.6, 12.6), p=1.8)
    _rock(rig, "torso", (-6.0, -2.0, 36.0), (6.0, 7.0, 5.0), color=CW.ROCK_LT, rot=(0, 20, 0))
    _rock(rig, "hips", (0.0, 0, 17.0), (9.6, 9.6, 5.4), color=CW.ROCK_DK, p=2.0)
    KC.seam(rig, "torso", [(9.0, -8.0, 22.0), (11.0, -6.0, 26.0), (9.6, -8.4, 31.0), (11.6, -5.0, 36.0)], r=0.8,
            color=CW.MINT, edge=CRACK)
    KC.seam(rig, "torso", [(-4.0, -10.6, 20.0), (-1.0, -11.0, 27.0), (-3.0, -10.4, 33.0)], r=0.7, color=CW.MINT, edge=CRACK)
    g = Geo().blob((4.0, 0, 30.0), (10.0, 11.4, 9.0), p=2.8, taper=(0.9, 1.0))
    rig.part("torso", g, team=True)
    CW.chest_star(rig, at=(8.0, -8.6, 30.4))
    # a team back plate, so the colour still reads when the backhand sweep turns the body away
    g = Geo().blob((-6.4, 0, 31.0), (7.6, 10.4, 8.0), p=2.8, taper=(0.9, 1.0))
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((3.0, 0, 17.6), (10.0, 10.6, 3.6), p=2.8)
    rig.part("hips", g, team=True, outline=0.6)
    KF.rivets(rig, "torso", [(11.4, -6.0, 35.0), (11.6, -6.0, 25.0), (11.0, -9.0, 30.0)], r=0.9, color=CW.STAR_TRIM)
    # the small rock head sunk between the shoulders: a dark crack band with glyph eyes
    _rock(rig, "head", (3.0, 0, 46.0), (8.0, 7.6, 7.4), p=1.9)
    _rock(rig, "head", (-1.0, -2.0, 52.0), (4.4, 4.0, 3.0), color=CW.ROCK_LT, rot=(0, -20, 0))
    band = Geo().blob((7.6, -0.8, 46.6), (3.2, 7.0, 2.6), p=2.8)
    KF.visor_face(rig, "head", [band], (9.4, 46.8), eye_dx=(0.0, 3.0), eye_rx=1.6, eye_rz=2.0, color=KC.VIO_EYE,
                  core=K.VIOLET_CORE)
    rig.part("head", band, K.VISOR, outline_hex=CW.VOID)
    # the near arm and fist
    y = AY["r"]
    _rock(rig, "arm_r", (0, y, (K.SHOULDER_Z + K.ELBOW_Z) / 2), (4.0, 4.0, 5.2))
    _rock(rig, "fore_r", (0, y, (K.ELBOW_Z + K.HAND_Z) / 2 + 1), (3.8, 3.8, 4.8))
    # a team bracer on the near forearm (it covers the chest plate mid-sweep)
    g = Geo().blob((0.3, y, (K.ELBOW_Z + K.HAND_Z) / 2 + 1.5), (4.3, 4.3, 2.6), p=2.6)
    rig.part("fore_r", g, team=True, outline=0.6)
    _fist(rig, "r", FIST)
    rig.rest_scale["arm_r"] = ARM_K
    rig.rest_scale["arm_l"] = ARM_K
    # team shoulder plates on boulder shoulders
    for s in ("r", "l"):
        y = AY[s]
        _rock(rig, f"arm_{s}", (0.0, y, 37.0), (6.2, 5.6, 5.4), color=CW.ROCK if s == "r" else darker(CW.ROCK, 0.82))
        g = Geo().blob((0.4, y - 0.4 * K.SIDE_Y[s], 39.8), (6.6, 6.0, 3.6), p=2.6)
        rig.part(f"arm_{s}", g, team=True, outline=0.6)
    # orbiting pebbles
    rig.joint("orbit", "torso", (0.0, 0.0, 44.0))
    for a in (20, 140, 260):
        x, yy = 17.0 * math.cos(math.radians(a)), 17.0 * math.sin(math.radians(a)) * 0.6
        _rock(rig, "orbit", (x, yy, 44.0 + 3.0 * math.sin(math.radians(a))), (2.2, 2.0, 2.0), color=CW.ROCK_LT)
    # meteor dust burst (hidden), the fall-apart pebbles
    rig.joint("dust", "hand_r", FIST, hidden=True)
    g = Geo()
    for i, a in enumerate(range(0, 360, 45)):
        r = 9.0 if i % 2 else 7.0
        g.sphere((FIST[0] + r * math.cos(math.radians(a)), FIST[1] - 3.0, FIST[2] + r * math.sin(math.radians(a))), 1.6, cuts=2)
    rig.part("dust", g, CW.ROCK_LT, outline=0.5, outline_hex=CW.ROCK_DK)
    rig.track("clubHead", "hand_r", FIST)


def guard(near=(8.0, 26.0), far=(10.0, 28.0)):
    a, f = K.ik2(K.SH, near, L1, L2)
    la, lf = K.ik2(K.SH, far, L1, L2)
    return merge(K.arm("r", a, f), K.arm("l", la, lf))


STANCE = merge(guard(), {"torso": {"r": -8.0}})


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    pose = merge(STANCE, {"hips": {"z": -1.6 + 0.8 * c}, "torso": {"r": -8.0 + 1.5 * c}, "head": {"r": -2 * lag},
                          "orbit": {"rz": 60 * f}}, guard((8.0, 26.0 + 0.8 * lag), (10.0, 28.0 + 0.8 * lag)))
    pose = merge(pose, KF.glyph("g_blink" if f == 3 else "eyes"))
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 62.5
LEGS = KC.legs_ik()
GAIT = GK.Gait(10, 1100, SPEED, GK.biped_feet(LEGS["l"], LEGS["r"], x_mid=1.6, shift=0.5), 0.6, lift=8.0, scale=S,
               kick=2.0, reach=0.0, toe_off=18.0, early_lift=1.0, drag=0.25, lift_peak=0.4)
HEAVY_BOB = [-2.2, -3.6, -0.8, 0.8]
HEAVY_SQ = [-0.02, -0.05, 0.0, 0.02]


def _walk(f, report=None):
    def extra(ctx):
        c = math.cos(ctx["lag_p"])
        return merge(guard((6.0 + 6.0 * c, 25.0), (8.0 - 6.0 * c, 26.0)), {"orbit": {"rz": 36 * f}})
    return M.walk_v3(RIG, f, {"torso": {"r": -8.0}}, GAIT, legs=LEGS, bob=HEAVY_BOB, sq=HEAVY_SQ, tbob=None, lean=-6.0,
                     twist=6.0, nod=2.0, sway=2.0, extra=extra, report=report)


def _pose(hand, far, t, rz, x, z, k, dust=False):
    a, f = K.ik2(K.SH, hand, L1, L2)
    la, lf = K.ik2(K.SH, far, L1, L2)
    pose = merge(K.arm("r", a, f), K.arm("l", la, lf), {"torso": {"r": t, "rz": rz}, "head": {"r": -0.4 * t},
                                                       "body": {"x": x, "z": z}, "orbit": {"rz": 30 * k}})
    pose = KI.ground_feet(RIG, pose, LEGS)
    if dust:
        pose["dust"] = {"show": True}
    g = "g_angry" if k in (1, 2, 3, 6, 7) else ("g_squint" if k in (4, 5) else "eyes")
    return merge(pose, KF.glyph(g))


#        read     dip      drop     HOLD     smear    smear    IMP      over     recoil   settle  (A: uppercut)
A_H = [(8, 26), (5, 18), (3, 13), (2, 11), (8, 22), (13, 38), (14, 50), (13, 51), (10, 38), (8, 26)]
A_T = [-8, -16, -22, -24, -14, 0, 8, 8, 0, -8]
A_X = [0.0, 0.0, -1.0, -1.5, 2.0, 4.0, 6.0, 6.0, 3.0, 0.5]
A_Z = [0.0, -3.0, -5.0, -6.0, -4.0, -1.0, 1.0, 1.0, 0.0, 0.0]


def _a_pose(f):
    return _pose(A_H[f], (10.0, 30.0), A_T[f], [0, 8, 12, 14, 6, 2, 0, 0, 0, 0][f], A_X[f], A_Z[f], f, dust=f == 6)


#        read     lift     raise    HOLD     smear    smear    IMP      over     recoil   settle  (B: double hammer)
B_H = [(8, 26), (4, 42), (1, 52), (0, 54), (8, 50), (14, 38), (17, 20), (17, 19), (12, 24), (8, 26)]
B_T = [-8, 2, 8, 10, 0, -14, -24, -22, -12, -8]
B_X = [0.0, -0.5, -1.5, -2.0, 1.0, 4.0, 7.0, 7.0, 3.0, 0.5]
B_Z = [0.0, 1.0, 2.0, 2.4, 0.5, -2.0, -4.5, -4.0, -1.5, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    h = B_H[f]
    return _pose(h, (h[0] + 1.5, h[1] + 1.0), B_T[f], 0.0, B_X[f], B_Z[f], f, dust=f == 6)


#        read     back     cock     HOLD     smear    smear    IMP      over     recoil   settle  (C: backhand sweep)
C_H = [(8, 26), (-4, 28), (-12, 30), (-15, 31), (-2, 33), (10, 33), (18, 31), (18, 31), (12, 28), (8, 26)]
C_RZ = [0, 16, 28, 32, 12, -12, -24, -22, -10, 0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_H[f], (10.0, 28.0), [-8, -6, -4, -4, -8, -12, -14, -12, -10, -8][f], C_RZ[f],
                 [0, -0.5, -1, -1.5, 0.5, 3, 5, 5, 2, 0.5][f], -1.0, f, dust=f == 6)


ARC = {"kind": "arc", "joint": "hand_r", "inner": (FIST[0], FIST[1], FIST[2] + 6.0), "outer": FIST,
       "color": CW.ROCK_LT, "taper": 0.3, "white": 0.5, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}


def _fx(seed, a0, gx):
    return [{"kind": "burst", "joint": "hand_r", "point": FIST, "r0_lu": 8.0, "r1_lu": 16.0, "n": 7, "a0": a0,
             "arc": 150.0, "color": CW.EMBER},
            {"kind": "dust", "ground": (gx, 0.0), "size_lu": 8.0, "puffs": 4, "seed": seed, "spread": 1.2,
             "color": CW.DUST}]


def _heavy_clip(name, fn, smear, fx, reuse=None):
    ov = {4: [dict(smear, **{"from": 3})], 5: [dict(smear, **{"from": 4})], 6: [dict(smear, **{"from": 5})] + fx}
    return M.clip(name, [fn(f) for f in range(10)], M.HEAVY_MELEE_MS[:10] + [M.HEAVY_MELEE_MS[10] + M.HEAVY_MELEE_MS[11]],
                  impact=M.HEAVY_MELEE_IMPACT, smear=4, overlays=ov, sequence=list(range(10)) + [0],
                  reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    pose = CW.hit_heavy(k, STANCE, center=(0, 0, 40))
    pose["orbit"] = {"rz": [20, 50, 30, 10, 0][k], "z": [2, 4, 1, 0, 0][k]}
    return pose


def _die(k):
    def extra(k, flail, stiff):
        return {"orbit": {"z": -30 * stiff, "rz": 40 * k}, "arm_r": {"r": 20 * flail}, "arm_l": {"r": 30 * flail}}
    return CW.die_d2(k, STANCE, extra=extra, toe_x=8.0, heel_x=-7.0, lie_lift=10.0)


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150] * 6, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _heavy_clip("attack", _a_pose, ARC, _fx(461, -110.0, 30.0)),
        _heavy_clip("attack_b", _b_pose, ARC, _fx(462, -150.0, 32.0), rr),
        _heavy_clip("attack_c", _c_pose, ARC, _fx(463, -20.0, 30.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in M.HEAVY_DIE_KEEP], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
