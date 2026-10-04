"""Void Skimmer: Cosmic Age common infantry, Raider (CONTENT_PLAN 5.8). A hover-board rider with a void knife,
~68 lu.

Look (A11, Cosmic palette): a lean legion scout in the void undersuit with violet armour, the legion dome helmet
(team brow band, no crest, a dark visor with light violet eyes that act), a team chest plate with the pale star,
team shoulder pads and a long team scarf that streams behind. He rides standing on a hover board: a flat violet
deck with a team stripe and star-white nose and tail caps, two mint pads glowing under it. In the near hand a
short curved void knife (a violet glow blade with a white core).

"A viewer expects a hoverboard raider: he carves in low and fast, flips the board under his feet for a kick,
and slashes with his knife as he skids past."

Animation (ANIM_SPEC G8 hover, the odometer at 110 x 1.25 = 137.5 lu/s; the hover bob is code motion):
  idle      balancing on the hovering board, knees soft, the pads pulse, the scarf flutters, a blink
  walk      carving glide: crouched forward, the board nose down, the scarf streaming, the pads flaring
  attack    BOARD-FLIP KICK: crouches and chambers the near knee (the held extreme), hops, the board flips under
            him and the leg snaps out in a kick (a straight hit, the board spinning ring)
  attack_b  SKID SLASH: the board skids sideways, the knife cocked far back low (the held extreme), then a flat
            slash across the front (a horizontal hit)
  attack_c  NOSE-UP CHOP: the board rears nose-up with the knife raised high (the held extreme), then slams down
            with an overhead knife chop
  hit       the board bounces on its pads, he ducks, eyes > <
  die       the pads cut out, the board noses in and he is flung off spinning, X eyes
"""
import math

from ageborn_art import kit_cosmic_wave as CW
from ageborn_art import kit_future as KF
from ageborn_art import moves as M
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "void_skimmer"
GAIT_NAME = "hover"
NAME = "Void Skimmer"
HEIGHT_LU = 70
YAW_DEG = -12.0
CANVAS = (340, 270)
FEET = (150, 232)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 34)}
NO_RETIME = True

HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
KNIFE = 14.0
TIP = (HR[0], HR[1] - 0.6, HR[2] + 4.0 + KNIFE)
MID = (HR[0], HR[1] - 0.6, HR[2] + 4.0 + KNIFE * 0.5)
BOARD_Z = 6.0
FOOT_TIP = (6.0, -6.0, 1.0)
SPEED = 110.0


RIG = None


def build(rig):
    global RIG
    RIG = rig
    CW.trooper(rig, helmet_kind="dome", crest=False, team_shin=True, knee=None, bulk=0.96)
    rig.trackers.pop("_foot_l", None)
    rig.trackers.pop("_foot", None)
    # the scarf (two team tails streaming from the neck)
    rig.secondary("scarf", "torso", (-6.0, 0, 40.0), (-22.0, 0, 36.0), max_deg=20, gain=1.4)
    g = Geo().blob((-4.0, -2.0, 40.0), (6.0, 8.4, 2.6), p=2.4)
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().slab([(-6.0, 41.5), (-24.0, 38.0), (-21.0, 35.5), (-27.0, 33.0), (-6.0, 37.5)], 1.0, 3.0)
    rig.part("scarf", g, team=True)
    # the hover board, a child of `root`: the rider stands on it
    rig.joint("board", "root", (0, 0, BOARD_Z))
    g = Geo().blob((0.0, 0, BOARD_Z), (24.0, 8.0, 1.8), p=2.8)
    rig.part("board", g, CW.VIOLET, finish="gloss", outline_hex=CW.VIOLET_DK)
    g = Geo().blob((0.0, 0, BOARD_Z + 0.9), (19.0, 7.0, 1.4), p=3.0)
    rig.part("board", g, team=True, outline=0.4)
    g = Geo().blob((0.0, -1.0, BOARD_Z + 2.0), (9.0, 1.6, 0.6), p=3.0)
    rig.part("board", g, CW.STAR, outline=0.3, outline_hex=CW.STAR_TRIM)
    g = Geo().blob((21.0, 0, BOARD_Z + 0.4), (4.0, 7.8, 2.0), p=2.6)
    g.blob((-21.0, 0, BOARD_Z + 0.4), (4.0, 7.8, 2.0), p=2.6)
    rig.part("board", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    for i, x in enumerate((-12.0, 12.0)):
        g = Geo().lathe([(0, 0), (4.4, 0.2), (4.4, 1.0), (0, 1.2)], (x, 0, BOARD_Z - 1.6), (x, 0, BOARD_Z - 2.8), segs=18)
        rig.part("board", g, glow=CW.MINT, outline=0.6, outline_hex=CW.VOID)
        rig.joint(f"cone{i}", "board", (x, 0, BOARD_Z - 3.0))
        g = Geo().lathe([(3.8, 0), (2.8, 1.4), (1.2, 2.8), (0, 3.4)], (x, 0, BOARD_Z - 3.0), (x, 0, BOARD_Z - 4.0), segs=14)
        rig.part(f"cone{i}", g, glow=CW.MINT_CORE, outline=0.8, outline_hex=CW.MINT)
    rig.joint("spin", "board", (0, 0, BOARD_Z), hidden=True)
    K.sparks(rig, "board", (0.0, -8.0, BOARD_Z), color=CW.MINT, size=1.0, name="sparks", seed=4)
    # the void knife
    rig.joint("knife", "hand_r", HR)
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 3.0), (hx, hy, hz + 3.0), 1.5)
    rig.part("knife", g, CW.VOID_LT, outline=0.8)
    g = Geo().blob((hx, hy, hz + 3.6), (3.6, 2.2, 1.2), p=2.6)
    rig.part("knife", g, CW.STAR, finish="gloss", outline_hex=CW.STAR_TRIM)
    g = Geo().blob((hx + 0.6, hy - 0.6, hz + 4.0 + KNIFE / 2), (2.6, 1.2, KNIFE / 2 + 0.4), p=2.3, taper=(1.0, 0.3),
                   rot=(0, -8, 0))
    rig.part("knife", g, glow=CW.GLOW, outline=1.0, outline_hex=CW.VIOLET)
    g = Geo().blob((hx + 0.8, hy - 1.3, hz + 3.6 + KNIFE / 2), (1.0, 0.7, KNIFE / 2 - 1.5), p=2.3, taper=(1.0, 0.3),
                   rot=(0, -8, 0))
    rig.part("knife", g, glow=CW.GLOW_CORE, outline=0)
    rig.track("bladeTip", "knife", TIP)
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0, 0, 0))


# the rider stands on the deck: knees soft, feet on the board (the body sits BOARD_Z + 2 lu higher)
STAND = {"hips": {"z": BOARD_Z - 0.5}, "thigh_r": {"r": 18}, "shin_r": {"r": -30}, "foot_r": {"r": 12},
         "thigh_l": {"r": -12}, "shin_l": {"r": -18}, "foot_l": {"r": 30}}


def arms(hand, w, far=(-6.0, 26.0)):
    a, f = K.ik2(K.SH, hand)
    la, lf = K.ik2(K.SH, far)
    return merge(K.arm("r", a, f, w, 90.0), K.arm("l", la, lf))


def cones(k=1.0, k2=None):
    return {"cone0": {"sz": k}, "cone1": {"sz": k2 if k2 is not None else k}}


STANCE = merge(STAND, arms((7.0, 24.0), 40.0), {"torso": {"r": -6.0}})


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    pose = merge(STANCE, cones(1.0 + 0.15 * c, 1.0 - 0.15 * c), {
        "board": {"z": 0.8 * c, "r": 1.5 * math.sin(2 * math.pi * f / 6)}, "hips": {"z": BOARD_Z - 0.5 + 0.8 * c - 0.6},
        "torso": {"r": -6.0 + 1.2 * c}, "head": {"r": [0, 2, 3, 2, 0, -1][f]},
        "arm_l": {"r": 4 * math.sin(2 * math.pi * f / 6)}})
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


GROUND = SPEED * 1.25
PULSE = [1.3, 0.82, 1.22, 0.88, 1.3, 0.82, 1.22, 0.88]


def _walk(f):
    p = 2 * math.pi * f / 8
    a = GROUND * 0.5 / 4.0
    return merge(STAND, arms((8.0, 26.0), 10.0, (-10.0, 30.0)), {
        "odo": {"x": a * math.cos(p)}, "cone0": {"sz": 0.9 + 0.2 * PULSE[f]}, "cone1": {"sz": 0.85 + 0.15 * PULSE[(f + 1) % 8]},
        "board": {"r": -4.0 + 1.0 * math.sin(p), "z": 0.5 * math.sin(2 * p)},
        "hips": {"z": BOARD_Z - 2.5 + 0.5 * math.sin(2 * p), "x": 1.0},
        "thigh_r": {"r": 34}, "shin_r": {"r": -56}, "thigh_l": {"r": 2}, "shin_l": {"r": -40},
        "torso": {"r": -20.0 + 1.5 * math.sin(p - 1.0), "rz": 4.0 * math.sin(p)}, "head": {"r": 10.0},
        "scarf": {"r": 0.0},
    })


def _pose(hand, w, t, k, x=0.0, z=0.0, br=0.0, bz=0.0, legs=None, far=(-6.0, 26.0), brz=0.0):
    pose = merge(STAND, arms(hand, w - t, far), cones(1.15 if k in (3, 4, 5, 6) else 1.0),
                 {"torso": {"r": t}, "head": {"r": -0.3 * t}, "hips": {"x": x, "z": BOARD_Z - 0.5 + z},
                  "board": {"r": br, "z": bz, "rz": brz}})
    if legs:
        pose = merge(pose, legs)
    g = "g_angry" if k in (1, 2, 3, 6, 7) else ("g_squint" if k in (4, 5) else "eyes")
    return merge(pose, KF.glyph(g))


#        read  crouch chamber HOLD  hop   flip  IMP   over  land  settle   (A: board-flip kick)
A_Z = [0.0, -3.0, -4.0, -4.5, 2.0, 6.0, 7.0, 5.0, 1.0, 0.0]
A_BZ = [0.0, 0.0, 0.0, 0.0, 3.0, 6.0, 5.0, 3.0, 0.5, 0.0]
A_SPIN = [0, 0, 0, 0, 90, 220, 330, 360, 360, 360]
A_TR = [18, 50, 66, 70, 74, 80, 84, 78, 40, 18]
A_SR = [-30, -90, -110, -116, -80, -30, -6, -10, -40, -30]
A_T = [-6, -14, -18, -20, -12, -2, 6, 4, -4, -6]


def _a_pose(f):
    legs = {"thigh_r": {"r": A_TR[f]}, "shin_r": {"r": A_SR[f]}, "foot_r": {"r": -10 if f in (5, 6, 7) else 12}}
    p = _pose((2.0, 28.0), 30.0, A_T[f], f, x=[0, -1, -2, -2.5, 0, 1, 2, 2, 1, 0][f], z=A_Z[f], bz=A_BZ[f], legs=legs,
              far=(-10.0, 32.0))
    p["board"]["rx"] = A_SPIN[f] % 360
    p["spin"] = {"show": f in (5, 6)}
    return p


#      read     crouch   cock     HOLD     smear    smear    IMP      over     recoil   settle   (B: skid slash)
B_H = [(7, 24), (2, 22), (-6, 22), (-9, 23), (2, 26), (11, 29), (15, 30), (15, 30), (11, 27), (7, 24)]
B_W = [40, -120, -160, -170, -90, -10, 20, 24, 30, 40]
B_T = [-6, -12, -14, -14, -16, -18, -20, -18, -10, -6]
B_BRZ = [0, 10, 22, 26, 14, -6, -16, -14, -6, 0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_H[f], B_W[f], B_T[f], f, x=[0, -1, -2, -2, 1, 3, 5, 5, 2, 0][f], z=-3.0 if f in (2, 3) else -1.5,
                 brz=-B_BRZ[f], legs={"thigh_r": {"r": 34}, "shin_r": {"r": -56}})


#      read     rear     rear2    HOLD     smear    smear    IMP      over     recoil   settle   (C: nose-up chop)
C_H = [(7, 24), (5, 36), (2, 44), (1, 46), (9, 44), (14, 36), (15, 27), (15, 26), (11, 25), (7, 24)]
C_W = [40, 100, 130, 140, 70, 0, -40, -44, 10, 40]
C_BR = [0, 8, 16, 20, 10, 0, -4, -2, 0, 0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_H[f], C_W[f], [-6, 0, 6, 8, -4, -12, -18, -16, -10, -6][f], f, z=[0, 2, 4, 5, 3, 0, -2, -1, 0, 0][f],
                 br=C_BR[f], bz=[0, 2, 4, 5, 3, 0, -1, 0, 0, 0][f])


SLASH = {"kind": "arc", "joint": "knife", "inner": MID, "outer": TIP, "color": CW.GLOW, "taper": 0.15, "white": 0.35,
         "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}
KICK = {"kind": "streak", "joint": "foot_r", "point": FOOT_TIP, "color": CW.STAR, "width_lu": 8.0, "white": 0.4}


def _ring():
    return [{"kind": "rings", "joint": "board", "point": (0.0, -6.0, BOARD_Z), "radii_lu": (14.0, 20.0), "a0": -180.0,
             "a1": 180.0, "color": CW.MINT_CORE}]


def _fx(joint, point, seed, a0):
    return [{"kind": "burst", "joint": joint, "point": point, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6, "a0": a0,
             "arc": 150.0, "color": CW.GLOW_CORE}] + CW.dust_fx(22.0, seed)


def _a_clip():
    ov = {4: [dict(KICK, **{"from": 3})], 5: [dict(KICK, **{"from": 4})] + _ring(), 6: [dict(KICK, **{"from": 5})] +
          _fx("foot_r", FOOT_TIP, 381, -40.0)}
    return M.clip("attack", [_a_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT, smear=4,
                  overlays=ov, sequence=list(range(10)) + [0], extra={"holdStep": 3})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(STANCE, cones(1.0 + 0.15 * max(a, 0)), {
        "hips": {"x": -3.0 * max(a, 0), "z": BOARD_Z - 0.5 - 3.0 * max(a, 0)}, "board": {"z": -1.5 * max(a, 0)},
        "torso": {"r": 12 * a}, "head": {"r": 14 * a}, "sparks": {"show": k == 0}, "body": squash([-0.06, 0.03, 0.0, -0.02, 0.0][k])})
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    nose = [0, -10, -22, -30, -26, -24, -24, -24, -24, -24][k]
    drop = [0, -1, -3, -5, -6, -6, -6, -6, -6, -6][k]
    fly = [0, 6, 14, 20, 24, 24, 24, 24, 24, 24][k]
    up = [0, 10, 18, 16, 6, -2, -6, -8, -8, -8][k]
    spin = [0, 60, 140, 220, 300, 340, 360, 360, 360, 360][k]
    pose = merge(STANCE, {
        "board": {"r": nose, "z": drop}, "cone0": {"s": 0.01 if k >= 2 else 0.6}, "cone1": {"s": 0.01 if k >= 2 else 0.6},
        "sparks": {"show": k in (0, 2, 4)},
        "hips": {"x": fly, "z": BOARD_Z + up}, "torso": {"r": 30 * flail}, "head": {"r": 14 * flail},
        "arm_r": {"r": 60 * flail + 20}, "arm_l": {"r": 100 * flail + 30},
        "thigh_r": {"r": -50 * min(1, k / 3)}, "shin_r": {"r": 60 * min(1, k / 3)},
    })
    pose["hips"]["r"] = -spin if k < 6 else -360
    if k >= 5:
        pose["hips"]["r"] = -270
        pose["hips"]["z"] = -2.0
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
    return merge(pose, KF.glyph(g))


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _a_clip(),
        CW.melee_clip("attack_b", _b_pose, SLASH, _fx("knife", TIP, 382, -20.0), rr),
        CW.melee_clip("attack_c", _c_pose, SLASH, _fx("knife", TIP, 383, -120.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
