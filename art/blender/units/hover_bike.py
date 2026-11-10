"""Hover Biker: Future Age common infantry, Raider (CONTENT_PLAN 5.7). Hover bike and energy lance, ~66 lu.

Look (A11, Future palette): a rider in white armour over a charcoal suit, the android helmet with a dark
wrap visor (mint eyes that act) and a team crown stripe, team shoulder pads, sitting low on a long hover
bike: a glossy white body with a big team front fairing and tail, a mint glass windscreen, charcoal
underside with two hover pads (mint glow discs with pulsing thrust cones) and a rear exhaust. He couches
a short energy lance (white shaft, mint tip) under his arm.

"A viewer expects a hoverbike jouster: swoops in low and fast, swipes with the lance as the bike drifts
sideways, pads glowing."

Animation (ANIM_SPEC G8 hover, the odometer at 110 x 1.25 = 137.5 lu/s; the hover bob is code motion):
  idle      hovering in place, the pads pulse, he revs (the bike dips), a blink
  walk      hover glide: nose down 5 degrees, the rider tucked low, the rear cone flaring on a 2-frame beat
  attack    DRIFT SWIPE: the bike drifts sideways toward the camera, the lance cocked high and back (the
            held extreme), then a big swipe down across the target
  attack_b  LANCE RAM: tucked flat behind the windscreen with the lance couched (the held extreme), the bike
            surges forward and the lance stabs straight in (a thrust)
  attack_c  WHEELIE CHOP: the bike rears nose-up (the held extreme, the lance up), then slams down with a
            downward lance chop (an overhead hit)
  hit       the bike bounces on its pads, the rider ducks, eyes > <
  die       the pads cut out, the bike noses into the ground and the rider is flung off, X eyes
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_future as KF
from ageborn_art import kit_future_wave as W
from ageborn_art import moves as M
from ageborn_art import rigs_future as F
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units import futcos_w4 as FW

SLUG = "hover_bike"
GAIT_NAME = "hover"
NAME = "Hover Biker"
HEIGHT_LU = 66
YAW_DEG = -10.0
CANVAS = (380, 270)
FEET = (150, 230)
ANCHORS = {"head": (6, 64), "hitCenter": (2, 28)}
NO_RETIME = True

# the detail standard (art round W4): the white soldiers' lifts on the rider and the bike; the wave kit's plates and
# the bike's white in the troopers' off-white (look.remap)
DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 0.5
LOOK_SHADE = FW.SHADE_WHITE
LOOK_RIM = dict(FW.RIM_SOLDIER, lift=0.42)
SKIN_PALETTE = FW.KIT_TROOPER
CONE = "#8CF5D0"               # the thrust cones, a mid mint (MINT_CORE rang the highlight share)
MATERIAL_KINDS = FW.kinds_future()

HR = (0.0, F.ARM_Y["r"], F.HAND_Z)
LANCE = 30.0
TIP = (HR[0], HR[1] - 0.5, HR[2] + LANCE + 4.0)
MID = (HR[0], HR[1] - 0.5, HR[2] + LANCE * 0.6)
PADS = ((-16.0, 2.4), (22.0, 2.4))
SPEED = 110.0


RIG = None


def build(rig):
    global RIG
    RIG = rig
    W.trooper(rig, helmet_kind="android", team_greave=True, pack=False, head=(1, 0, 38), strip=False)
    FW.strip(rig)
    rig.trackers.pop("_foot_l", None)
    # the hover bike (a child of `body`: the rider and bike move together)
    rig.joint("bike", "body", (0, 0, 12.0))
    g = Geo().blob((4.0, 0, 12.0), (30.0, 6.4, 4.6), p=2.6, taper=(1.0, 0.85))          # white body
    g.blob((-10.0, 0, 15.6), (10.0, 5.6, 2.6), p=2.6, rot=(0, -6, 0))                    # seat hump
    rig.part("bike", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((24.0, 0, 14.0), (12.0, 6.9, 5.6), p=2.5, rot=(0, -10, 0))           # team front fairing
    g.blob((-25.0, 0, 15.0), (6.0, 6.0, 3.8), p=2.5, rot=(0, 20, 0))                     # team tail
    rig.part("bike", g, team=True)
    g = Geo().blob((20.0, 0, 21.0), (5.6, 4.6, 4.0), p=2.4, rot=(0, 34, 0))             # windscreen
    rig.part("bike", g, glow=W.HOLO, outline=0.8, outline_hex=W.HOLO_DK)
    g = Geo().blob((4.0, 0, 7.8), (26.0, 5.0, 2.2), p=2.8)                               # charcoal underside
    g.capsule((6.0, -7.4, 10.0), (11.0, -7.4, 10.0), 1.2)                                 # foot peg
    rig.part("bike", g, F.SUIT)
    g = Geo().lathe([(0, 0), (2.8, 0.2), (2.6, 3.0), (0, 3.2)], (-31.5, 0, 12.0), (-34.0, 0, 12.0), segs=14)
    rig.part("bike", g, F.GUNMETAL, outline=0.6)                                          # exhaust
    KF.strip(rig, "bike", [(-6.0, -6.4, 14.0), (8.0, -6.6, 14.6)], r=0.55)          # (W4: r 0.7)
    for i, (x, z) in enumerate(PADS):
        g = Geo().lathe([(0, 0), (6.0, 0.2), (6.2, 1.4), (0, 1.6)], (x, 0, z + 4.0), (x, 0, z + 2.6), segs=20)
        rig.part("bike", g, F.SUIT, outline=0.6)
        g = Geo().lathe([(5.0, 0), (6.4, 0.1), (6.4, 0.5), (5.0, 0.6)], (x, -0.2, z + 2.8), (x, -0.2, z + 2.2), segs=20)
        rig.part("bike", g, glow=W.MINT, outline=0)          # (W4: the glow ring 1.8 x 1.0 lu: highlight share)
        rig.joint(f"cone{i}", "bike", (x, 0, z + 2.0))
        g = Geo().lathe([(4.6, 0), (3.6, 1.6), (1.6, 3.4), (0, 4.0)], (x, 0, z + 2.0), (x, 0, z + 1.0), segs=16)
        rig.part(f"cone{i}", g, glow=CONE, outline=0.8, outline_hex=W.MINT)
    F.puff(rig, "bike", (-38.0, 0, 12.0), size=0.8, name="exhaust", spread=1.2)
    F.sparks(rig, "bike", (2.0, -7.0, 10.0), color=W.MINT, size=1.0, name="sparks", seed=8)
    # the energy lance
    rig.joint("lance", "hand_r", HR)
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 8.0), (hx, hy, hz + LANCE), 1.4)
    rig.part("lance", g, FW.GUN_LT, finish="gloss", outline_hex=F.TRIM)     # (W4: the light gun grey)
    g = Geo().capsule((hx, hy - 0.2, hz + 6.0), (hx, hy - 0.2, hz + 10.0), 1.9)
    rig.part("lance", g, team=True, outline=0.5)
    g = Geo().blob((hx, hy - 0.5, hz + LANCE + 2.0), (2.4, 1.4, 4.2), p=2.2, taper=(1.0, 0.3))
    rig.part("lance", g, glow=W.MINT, outline=1.0, outline_hex=W.MINT)
    rig.track("lanceTip", "lance", TIP)
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0, 0, 0))
    rig.rest_scale["hips"] = 0.86          # the rider a little smaller so the long bike reads
    FW.wave_trooper(rig, helmet_kind="android", team_greave=True)
    _bike_detail(rig)
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _bike_detail(rig):
    """W4: the bike's white body in panels (seams down its flank, a seam along the seat) with chipped edges, the team
    fairing split by a team-dark seam, vent slots on the charcoal underside (char space; decals cast)."""
    body = Geo().blob((4.0, 0, 12.0), (30.0, 6.4, 4.6), p=2.6, taper=(1.0, 0.85))
    bf = FC.Face(rig, "bike", [body])
    FW.panel_lines(rig, "bike", bf, [[FW.sc(bf, x, z, -6.2) for z in (15.4, 12.0, 8.8)] for x in (-16.0, 12.0)] +
                   [[FW.sc(bf, x, 16.0, -4.6) for x in (-20.0, -8.0, 4.0)]], w=0.8)
    FW.wear(rig, "bike", bf, [(*FW.sc(bf, -24.0, 13.0, -5.4), 1.3, 0.6), (*FW.sc(bf, 0.0, 9.0, -6.0), 1.2, 0.5)])
    fair = Geo().blob((24.0, 0, 14.0), (12.0, 6.9, 5.6), p=2.5, rot=(0, -10, 0))
    ff = FC.Face(rig, "bike", [fair])
    FW.folds(rig, "bike", ff, [[FW.sc(ff, 22.0, z, -6.8) for z in (18.6, 14.0, 9.6)]], w=0.8, team=True)
    g = Geo()
    for x in (-12.0, -8.0, -4.0):
        g.capsule((x, -5.1, 7.4), (x + 2.2, -5.1, 7.4), 0.42, segs=8, rings=2)
    rig.part("bike", g, FW.LINE_ON_SUIT, outline=0, highlight=False)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, rider: the mount's body and the rider; smoke from the exhaust):
    the team fairing, the bike's white flank, the team tail, the rider's near shoulder pad."""
    rig.damage_spot("fairing", "bike", (24.0, -6.8, 14.0), 5.0, "metal", team=True, normal=(0.2, -1, 0))
    rig.damage_spot("flank", "bike", (-4.0, -6.4, 12.0), 5.0, "metal", normal=(0, -1, 0))
    rig.damage_spot("tail", "bike", (-25.0, -5.8, 15.0), 5.0, "metal", team=True, normal=(0, -1, 0))
    rig.damage_spot("pauldron", "arm_r", (0.5, -18.0, 38.4), 5.0, "metal", team=True, normal=(0, -1, 0))   # (the
    #                                                          rider is drawn at 0.86: a screen point misses the pad)
    rig.damage_spot("exhaust", "bike", (-34.5, 0.0, 12.0), 4.0, "smoke", kind="emit", normal=(-1, 0, 0))


# the seated rider: thighs forward on the seat, shins down to the pegs; the body sits 2 lu lower
SEAT = merge({"thigh_r": {"r": 78}, "shin_r": {"r": -86}, "foot_r": {"r": 8},
              "thigh_l": {"r": 72}, "shin_l": {"r": -82}, "foot_l": {"r": 10},
              "hips": {"z": -1.5, "x": -4.0}})


def arms(hand, w, far=(14.0, 26.0)):
    a, f = F.ik2(F.SH, hand)
    la, lf = F.ik2(F.SH, far)
    return merge(F.arm("r", a, f, w, 90.0), F.arm("l", la, lf))


def cones(k=1.0, k2=None):
    return {"cone0": {"sz": k, "s": 0.9 + 0.1 * min(1.2, k)}, "cone1": {"sz": k2 if k2 is not None else k}}


STANCE = merge(SEAT, arms((9.0, 24.0), 4.0), {"torso": {"r": -10.0}})


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    rev = [0.0, 0.0, 1.0, 0.4, 0.0, 0.0][f]
    pose = merge(STANCE, cones(1.0 + 0.12 * c, 1.0 - 0.12 * c), {
        "body": dict(z=1.4 * c - 1.0 * rev), "bike": {"r": -2.0 * rev}, "exhaust": {"show": f in (2, 3), "x": -2.0 * f},
        "torso": {"r": -3 * rev}})
    if f == 4:
        pose = merge(pose, KF.glyph("g_blink"))
    return pose


GROUND = SPEED * 1.25
PULSE = [1.3, 0.82, 1.22, 0.88, 1.3, 0.82, 1.22, 0.88]


def _walk(f):
    p = 2 * math.pi * f / 8
    a = GROUND * 0.5 / 4.0
    return merge(SEAT, arms((10.0, 23.0), 2.0), {
        "odo": {"x": a * math.cos(p)}, "cone0": {"sz": 0.9 + 0.2 * PULSE[f], "r": 8.0}, "cone1": {"sz": 0.85 + 0.15 * PULSE[(f + 1) % 8], "r": 6.0},
        "body": dict(z=0.6 * math.sin(2 * p), r=-5.0 + 0.6 * math.sin(p)), "torso": {"r": -18.0 + 1.5 * math.sin(p - 1.0)},
        "head": {"r": 8.0}, "exhaust": {"show": f % 4 == 0, "x": -3.0},
    })


def _pose(hand, w, t, k, rz=0.0, x=0.0, z=0.0, br=0.0, far=(14.0, 26.0)):
    pose = merge(SEAT, arms(hand, w - t, far), cones(1.1 if k in (3, 4, 5, 6) else 1.0),
                 {"torso": {"r": t}, "head": {"r": -0.3 * t}, "body": {"rz": rz, "x": x, "z": z, "r": br}})
    if k in (4, 5):
        pose.setdefault("lance", {})["sz"] = 1.1
    g = "g_angry" if k in (1, 2, 3, 6, 7) else ("g_squint" if k in (4, 5) else "eyes")
    return merge(pose, KF.glyph(g))


#      read     raise    cock     HOLD     smear    smear    IMP      over     recoil   settle   (A: drift swipe)
A_H = [(9, 24), (8, 32), (5, 38), (3, 40), (10, 38), (15, 32), (17, 26), (16, 25), (12, 25), (9, 24)]
A_W = [4, 70, 120, 135, 70, 10, -30, -34, -10, 4]
A_T = [-10, -6, -2, 0, -8, -14, -20, -18, -14, -10]
A_RZ = [0, 6, 14, 20, 26, 30, 32, 28, 14, 0]
A_X = [0, 0, 0, -1, 1, 3, 5, 5, 2, 0]


def _a_pose(f):
    return _pose(A_H[f], A_W[f], A_T[f], f, rz=-A_RZ[f], x=A_X[f])


#      read     tuck     couch    HOLD     smear    smear    IMP      over     recoil   settle   (B: lance ram)
B_H = [(9, 24), (6, 22), (3, 21), (1, 21), (8, 22), (14, 22), (18, 22), (17, 22), (13, 23), (9, 24)]
B_W = [4, 0, -2, -2, 0, 0, 0, 0, 2, 4]
B_T = [-10, -22, -28, -30, -30, -28, -24, -22, -16, -10]
B_X = [0, -1, -2, -3, 3, 8, 11, 11, 5, 0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_H[f], B_W[f], B_T[f], f, x=B_X[f], z=-1.0 if f in (2, 3) else 0.0)


#      read     rear     rear2    HOLD     smear    smear    IMP      over     recoil   settle   (C: wheelie chop)
C_H = [(9, 24), (8, 34), (6, 40), (5, 42), (11, 40), (15, 34), (17, 28), (17, 27), (12, 25), (9, 24)]
C_W = [4, 70, 96, 104, 60, 0, -40, -44, -10, 4]
C_BR = [0, 8, 16, 20, 10, 0, -4, -2, 0, 0]
C_Z = [0, 2, 4, 5, 3, 0, -2, -1, 0, 0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_H[f], C_W[f], [-10, -4, 0, 2, -6, -12, -18, -16, -12, -10][f], f, z=C_Z[f], br=C_BR[f])


SWIPE = {"kind": "arc", "joint": "lance", "inner": MID, "outer": TIP, "color": W.MINT, "taper": 0.15, "white": 0.35,
         "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 16}
RAM = {"kind": "streak", "joint": "lance", "point": TIP, "color": W.MINT, "width_lu": 7.0, "white": 0.35}


def _fx(seed, a0):
    return [{"kind": "burst", "joint": "lance", "point": TIP, "r0_lu": 6.0, "r1_lu": 12.0, "n": 6, "a0": a0,
             "arc": 150.0, "color": W.MINT_CORE},
            {"kind": "dust", "ground": (24.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": seed, "spread": 1.0,
             "color": W.DUST}]


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(STANCE, cones(1.0 + 0.15 * max(a, 0)), {
        "body": dict(squash([-0.06, 0.03, 0.0, -0.02, 0.0][k]), x=-3.0 * max(a, 0), z=-3.0 * max(a, 0)),
        "torso": {"r": 12 * a}, "head": {"r": 14 * a}, "sparks": {"show": k == 0}})
    return merge(pose, KF.glyph("g_hurt" if k <= 1 else ("g_angry" if k == 2 else "eyes")))


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    nose = [0, -10, -22, -30, -26, -24, -24, -24, -24, -24][k]
    drop = [0, -2, -5, -8, -9, -9, -9, -9, -9, -9][k]
    fly = [0, 6, 14, 20, 24, 24, 24, 24, 24, 24][k]
    up = [0, 10, 18, 16, 6, -2, -6, -8, -8, -8][k]
    spin = [0, 60, 140, 220, 300, 340, 360, 360, 360, 360][k]
    pose = merge(STANCE, {
        "bike": {"r": nose, "z": drop}, "cone0": {"s": 0.01 if k >= 2 else 0.6}, "cone1": {"s": 0.01 if k >= 2 else 0.6},
        "sparks": {"show": k in (0, 2, 4)}, "exhaust": {"show": 2 <= k <= 6, "z": 2.0 * k},
        "hips": {"x": fly, "z": up}, "torso": {"r": 30 * flail}, "head": {"r": 14 * flail},
        "arm_r": {"r": 60 * flail + 20}, "arm_l": {"r": 100 * flail + 30},
        "thigh_r": {"r": -50 * min(1, k / 3)}, "shin_r": {"r": 60 * min(1, k / 3)},
    })
    pose["hips"]["r"] = -spin if k < 6 else -360
    if k >= 5:
        pose["hips"]["r"] = -270
        pose["hips"]["z"] = -10.0
    g = "g_hurt" if k == 0 else ("g_wide" if k < 4 else "eyes_x")
    return merge(pose, KF.glyph(g))


def clips():
    rr = {0: ("attack", 0), 9: ("attack", 9)}
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        FW.melee_clip("attack", _a_pose, SWIPE, _fx(181, -100.0)),
        FW.melee_clip("attack_b", _b_pose, RAM, _fx(182, -70.0), rr),
        FW.melee_clip("attack_c", _c_pose, SWIPE, _fx(183, -120.0), rr),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
