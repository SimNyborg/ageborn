"""Crystal Guard: Cosmic Age common infantry, Guard (CONTENT_PLAN 5.8). A living crystal trooper, ~70 lu.

Look (A11, Cosmic palette): a broad legion trooper whose head, shoulders and fists have grown into pale lilac
crystal: a faceted crystal head with a dark visor band (light violet eyes that act), crystal spikes standing up
from the team shoulder pads, a team chest plate with the pale star, team greaves. The far forearm carries a
tall faceted crystal slab as a shield (a star-white rim, a team band across it); the near fist is a big
crystal cluster. Lilac stays under 30% saturation, so the colour rule holds.

"A viewer expects a crystal brute: heavy steps behind a crystal slab, then a huge crystal fist that smashes
down with a sparkle of shards."

Animation (ANIM_SPEC G1 stomp jog at card 70 x 1.25 = 87.5 lu/s, appendix B shield infantry):
  idle      behind the slab, the facets glint, the fist flexes, a blink
  walk      walk v3 stomp jog with the slab carried forward on the forearm, the fist swinging low
  attack    CRYSTAL SMASH: the fist rises high over the head (the held extreme), then smashes down in front
            (an overhead hit, shards burst)
  attack_b  BACKHAND SWEEP: the fist swung far back behind the hip with the body twisted (the held extreme),
            then a flat backhand sweep across the front (a horizontal hit)
  attack_c  RISING UPPERCUT: crouched low behind the slab with the fist cocked by the knee (the held
            extreme), then an uppercut that lifts him onto his toes (a rising hit)
  hit       armoured: a dip behind the slab, the head clanks, eyes > <
  die       D2 plank topple onto the back, the crystals dim, X eyes
"""
import math

from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_future as KF
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as KM
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "crystal_guard"
GAIT_NAME = "biped"
NAME = "Crystal Guard"
HEIGHT_LU = 70
CANVAS = (300, 256)
FEET = (130, 222)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
FIST = (HR[0] + 1.0, HR[1] - 1.0, HR[2] - 1.0)
PANE = (HL[0] + 6.0, HL[1] - 8.0, HL[2] + 4.0)


def _crystal(rig, joint, c, r, rot=(0, 0, 0), core=True):
    g = Geo().blob(c, r, p=1.55, rot=rot)
    rig.part(joint, g, CW.LILAC, finish="gloss", outline_hex=CW.LILAC_DK)
    if core:
        g = Geo().blob((c[0] + 0.3 * r[0], c[1] - 0.6 * r[1], c[2] + 0.3 * r[2]), (r[0] * 0.35, r[1] * 0.3, r[2] * 0.45),
                       p=1.6, rot=rot)
        rig.part(joint, g, glow=CW.LILAC_CORE, outline=0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    CW.trooper(rig, helmet_kind="none", team_shin=True, bulk=1.08, pteruges=False)
    # the crystal head: facets, a dark visor band with glyph eyes
    _crystal(rig, "head", (2.0, 0, 51.0), (11.6, 11.0, 12.6))
    _crystal(rig, "head", (-4.0, -1.0, 61.0), (3.8, 3.6, 6.0), rot=(0, -38, 0), core=False)
    _crystal(rig, "head", (2.0, -2.0, 62.0), (2.6, 2.6, 4.2), rot=(0, -12, 0), core=False)
    g = Geo().lathe([(11.8, 0), (12.1, 1.4), (11.7, 2.8)], (2.0, 0, 45.0), (2.0, 0, 47.8), segs=8)
    rig.part("head", g, team=True, outline=0.6)
    KC.visor(rig, "head", (2.0, 0, 51.0), (11.6, 11.0, 12.6), x0=5.0, z_top=54.4, z_bot=48.4,
             eye_at=(9.6, 51.4), eye_dx=(0.0, 3.6), eye_rx=2.2, eye_rz=2.7, grow=0.9)
    # crystal spikes on the shoulders
    for s in ("r", "l"):
        y = K.ARM_Y[s]
        _crystal(rig, f"arm_{s}", (-1.0, y - 0.3, 44.6), (2.6, 2.6, 5.4), rot=(0, -16, 0), core=False)
        _crystal(rig, f"arm_{s}", (3.0, y - 0.6, 43.4), (2.0, 2.0, 4.0), rot=(0, 18, 0), core=False)
    # the crystal fist
    rig.joint("fist", "hand_r", HR)
    _crystal(rig, "fist", FIST, (7.4, 6.4, 7.2))
    _crystal(rig, "fist", (FIST[0] + 4.0, FIST[1] - 0.6, FIST[2] + 3.6), (2.6, 2.4, 4.0), rot=(0, -30, 0), core=False)
    _crystal(rig, "fist", (FIST[0] + 1.0, FIST[1] - 1.0, FIST[2] - 5.0), (2.4, 2.4, 3.4), rot=(0, 160, 0), core=False)
    g = Geo().blob((HR[0], HR[1], HR[2] + 5.0), (5.2, 5.2, 3.4), p=2.4)
    rig.part("fist", g, team=True, outline=0.6)
    # a team sash on the hips (the crystal body is mostly lilac, so the team share needs a second block)
    g = Geo().blob((0.6, 0, 17.4), (11.4, 11.2, 3.6), p=2.8, taper=(1.12, 1.0))
    rig.part("hips", g, team=True, outline=0.6)
    rig.track("clubHead", "fist", FIST)
    # the crystal slab shield on the far forearm, turned toward the camera
    rig.joint("shield", "hand_l", HL)
    px, py, pz = PANE
    yaw = -55.0
    ca, sa = math.cos(math.radians(yaw)), math.sin(math.radians(yaw))

    def at(u, v, z):
        return (px + u * ca - v * sa, py + u * sa + v * ca, pz + z)
    rot = (0, 0, yaw)
    g = Geo().blob((HL[0] + 1.0, HL[1] - 2.5, HL[2] + 3.0), (3.2, 2.2, 5.0), p=2.6)
    rig.part("shield", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    g = Geo().blob(at(0, 0, 0), (2.2, 8.4, 13.0), p=1.7, rot=rot)
    rig.part("shield", g, CW.LILAC, finish="gloss", outline_hex=CW.LILAC_DK)
    g = Geo().blob(at(1.0, -2.0, 3.6), (1.0, 3.6, 6.4), p=1.8, rot=rot)
    rig.part("shield", g, glow=CW.LILAC_CORE, outline=0)
    g = Geo().blob(at(1.6, 0, -3.0), (1.4, 8.0, 3.2), p=2.6, rot=rot)
    rig.part("shield", g, team=True, outline=0.5)
    rig.joint("glint", "shield", at(2.0, -4.0, 8.0), hidden=True)
    g = Geo().star(at(2.4, -4.0, 8.0), 4.2, 1.2, 0.6, points=4)
    rig.part("glint", g, glow=CW.LILAC_CORE, outline=0)
    # shard burst for the impact (hidden)
    rig.joint("shards", "fist", FIST, hidden=True)
    g = Geo()
    for i, a in enumerate(range(0, 360, 60)):
        r0, r1 = 6.5, 11.0 if i % 2 else 9.0
        ax, az = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.blob((FIST[0] + ax * (r0 + r1) / 2, FIST[1] - 2.0, FIST[2] + az * (r0 + r1) / 2), (1.6, 1.0, 1.6), p=1.6,
               rot=(0, -a, 0))
    rig.part("shards", g, CW.LILAC, finish="gloss", outline=0.6, outline_hex=CW.LILAC_DK)


def arms(hand, w, shield_hand, sw=90.0):
    a, f = K.ik2(K.SH, hand)
    la, lf = K.ik2(K.SH, shield_hand)
    return merge(K.arm("r", a, f, w, 90.0), K.arm("l", la, lf, sw, 90.0))


GUARD = ((5.0, 22.0), -30.0, (9.0, 27.0))
STANCE = merge(arms(*GUARD), {"torso": {"r": -3.0}})


def _idle(f):
    def extra(ctx):
        return arms((5.0, 22.0 + 0.6 * ctx["lag"]), -30.0 + 6 * ctx["lag"], (9.0, 27.0 + 0.6 * ctx["c"]))
    pose = M.idle_v2(f, {"torso": {"r": -3.0}}, frames=6, extra=extra, blink=4, face_blink=KF.glyph("g_blink"))
    pose["glint"] = {"show": f in (1, 2)}
    pose["fist"] = {"s": 1.0 + (0.05 if f == 3 else 0.0)}
    return KI.ground_feet(RIG, pose, LEGS)


SPEED = 87.5
LEGS = KC.legs_ik()
GAIT = KC.jog_gait(LEGS, SPEED, cycle_ms=616, stance=0.52, lift=5.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = math.cos(ctx["lag_p"])
        return arms((2.0 + 4.0 * c, 21.0 + 0.6 * lag), -40.0 + 10 * c, (8.0, 28.0 + 1.0 * lag))
    return M.walk_v3(RIG, f, {"torso": {"r": -3.0}}, GAIT, legs=LEGS, lean=-8.0, twist=5.0, nod=3.0,
                     extra=extra, report=report)


def _pose(bh, bw, sh, t, rz, x, z, q, k, shards=False):
    pose = merge(arms(bh, bw, sh), {"torso": {"r": t, "rz": rz}, "head": {"r": -0.4 * t, "rz": -0.4 * rz}},
                 M.body_about((0, 0, 22), x=x, z=z, q=q))
    pose = KI.ground_feet(RIG, pose, LEGS)
    if shards:
        pose["shards"] = {"show": True}
    g = "g_angry" if k in (1, 2, 3, 6, 7) else ("g_squint" if k in (4, 5) else "eyes")
    return merge(pose, KF.glyph(g))


#      read     raise    cock     HOLD     smear    smear    IMP      over     recoil   settle    (A: haymaker smash)
A_H = [(5, 22), (-2, 34), (-9, 39), (-12, 40), (-2, 44), (10, 38), (15, 25), (15, 24), (10, 23), (5, 22)]
A_W = [-30, 120, 150, 160, 90, 0, -50, -54, -40, -30]
A_T = [-3, 4, 10, 12, 2, -10, -20, -18, -8, -3]
A_X = [0.0, -0.5, -1.5, -2.0, 1.0, 4.0, 6.0, 6.0, 3.0, 0.5]
A_Z = [0.0, 1.0, 1.5, 1.5, 0.5, -2.0, -4.5, -4.0, -1.5, 0.0]
A_Q = [0.0, 0.03, 0.05, 0.06, 0.02, -0.04, -0.14, -0.06, -0.02, 0.0]


def _a_pose(f):
    rz = [0, 10, 20, 24, 10, -6, -12, -10, -4, 0][f]
    return _pose(A_H[f], A_W[f], (9.0, 27.0 - (2.0 if f in (2, 3) else 0.0)), A_T[f], rz, A_X[f], A_Z[f], A_Q[f], f,
                 shards=f == 6)


#      read     pull     cock     HOLD     smear    smear    IMP      over     recoil   settle    (B: straight punch)
B_H = [(5, 22), (0, 30), (-4, 32), (-5, 32), (6, 33), (13, 34), (16, 34), (16, 34), (10, 28), (5, 22)]
B_W = [-30, 0, 0, 0, 0, 0, 0, 0, -10, -30]
B_T = [-3, -6, -10, -12, -14, -16, -18, -16, -8, -3]
B_RZ = [0, 16, 28, 32, 10, -10, -20, -18, -8, 0]
B_X = [0.0, -1.0, -2.0, -2.5, 1.0, 5.0, 8.0, 8.0, 3.0, 0.5]
B_Q = [0.0, -0.03, -0.05, -0.06, 0.03, 0.05, -0.10, -0.04, 0.0, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_H[f], B_W[f], (10.0, 28.0), B_T[f], B_RZ[f], B_X[f], -2.5 if f in (1, 2, 3) else -1.0, B_Q[f], f,
                 shards=f == 6)


#      read     crouch   cock     HOLD     smear    smear    IMP      over     recoil   settle    (C: rising uppercut)
C_H = [(5, 22), (2, 20), (-1, 19), (-2, 18), (6, 22), (11, 32), (12, 44), (11, 45), (9, 32), (5, 22)]
C_W = [-30, -100, -130, -140, -60, 40, 90, 96, 20, -30]
C_T = [-3, -14, -20, -24, -16, -4, 6, 6, -2, -3]
C_X = [0.0, -1.0, -2.0, -2.5, 1.5, 4.0, 5.5, 5.5, 2.5, 0.5]
C_Z = [0.0, -4.0, -6.5, -7.5, -5.0, -1.0, 2.0, 1.5, 0.0, 0.0]
C_Q = [0.0, -0.05, -0.08, -0.10, -0.02, 0.06, 0.10, 0.04, -0.02, 0.0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_H[f], C_W[f], (10.0, 25.0), C_T[f], 0.0, C_X[f], C_Z[f], C_Q[f], f, shards=f == 6)


PUNCH = {"kind": "streak", "joint": "fist", "point": FIST, "color": CW.LILAC, "width_lu": 12.0, "white": 0.4}
SMASH = {"kind": "arc", "joint": "fist", "inner": (FIST[0] - 6.0, FIST[1], FIST[2]), "outer": FIST, "color": CW.LILAC,
         "taper": 0.25, "white": 0.4, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}


def _fx(seed, a0, gx):
    return CW.impact_fx("fist", FIST, seed, a0=a0, ground_x=gx, color=CW.LILAC_CORE)


def _hit(k):
    def recoil(a):
        up = max(a, 0)
        return merge(arms((5.0, 22.0 + 2 * up), -30.0 + 20 * up, (9.0 - 2 * up, 27.0 + 6 * up)),
                     {"torso": {"r": 10 * a}, "head": {"r": 8 * a}})
    return KM.hit_armoured(k, {"torso": {"r": -3.0}}, recoil, face_hurt=KF.glyph("g_hurt"),
                           face_back=KF.glyph("g_angry"), helm="head", clank=1.6)


def _die(k):
    def extra(k, flail, stiff):
        return {"shield": {"r": 20 * flail}, "fist": {"r": 30 * flail}}
    return CW.die_d2(k, STANCE, extra=extra)


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        CW.melee_clip("attack", _a_pose, SMASH, _fx(371, -120.0, 20.0)),
        CW.melee_clip("attack_b", _b_pose, PUNCH, _fx(372, -20.0, 22.0), rr),
        CW.melee_clip("attack_c", _c_pose, SMASH, _fx(373, 40.0, 18.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
