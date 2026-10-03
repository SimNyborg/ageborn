"""Highlander: Gunpowder Age common infantry, Guard (CONTENT_PLAN 5.4). Broadsword and targe, ~68 lu.

Look (A11, Gunpowder palette): a broad, red-bearded clansman in a black feather bonnet with a team
toorie (pompom) and a cream cockade, a short team doublet with cream facings, a pleated team kilt
with cream and dark tartan bands, a cream sporran with dark tassels, cream diced hose to the knee and
buckled black brogues. A big round targe (dark wood, brass studs in rings, a brass boss with a spike
and a cream anchor) sits on his far forearm; a basket-hilted broadsword is in his near hand.

"A viewer expects him to spin and chop with the broadsword from behind his targe, and to march with
the targe forward."

Animation (ANIM_SPEC G1 march, appendix B for a sword-and-shield man: over-the-rim chop, bash and
stab, spin cut):
  idle      breathing behind the targe, taps the targe with the flat of the blade, blink
  walk      walk v3 bounce jog at ground speed (card 67 x 1.25 = 83.75 lu/s) with a march: targe
            forward on the far arm, the broadsword resting back on his near shoulder, the kilt
            swishing a frame late, the bonnet feathers bobbing
  attack    SPIN AND CHOP: targe up, he winds the blade behind him (the held extreme), whips round
            a full turn (a hollow ring smear) and ends in a downward chop over the targe rim
  attack_b  OVER-THE-RIM CHOP: crouches behind the raised targe with the sword cocked high over his
            head (the held extreme), then chops straight down over the rim (a crescent)
  attack_c  BASH AND STAB: drives the targe forward into the target (a punch, low stance, the
            held extreme is the sword drawn back at the hip), then thrusts the blade past the rim
  hit       light: head snaps back, the bonnet lifts, eyes squeezed
  die       D1 fling and spin: the bonnet pops off and lands apart, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "highlander"
GAIT_NAME = "biped"
NAME = "Highlander"
HEIGHT_LU = 68
CANVAS = (360, 310)
FEET = (156, 262)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

BEARD = "#8A6C5A"        # ginger-brown beard (desaturated so the colour rule holds)
BONNET = "#2B2A30"
HOSE = "#E6DCC4"
HOSE_DK = "#B9A98A"
SHOE = "#2E2A2A"
TARGE = "#5A4B40"
TARGE_DK = "#433830"
BLADE = "#C9D0D8"
BLADE_DK = "#8C96A2"
TARTAN = "#3A3F3A"
SPORRAN = "#EDE4CF"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand: broadsword
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand: targe on the forearm
BL = 33.0                            # blade length from the hand
HAT_C = (1.0, 0.0, 58.0)             # bonnet pivot (it pops off in the death)
TG_C = (7.0, 17.5, 25.0)             # targe centre (far forearm space, rest)
TG_R = 13.0


def _bonnet(rig, joint):
    x, y, z = HAT_C
    g = Geo().blob((x - 1.0, y, z + 2.0), (11.6, 11.4, 5.0), p=2.4)
    g.blob((x - 3.0, y, z + 6.0), (10.2, 10.0, 3.8), p=2.4)           # the floppy crown
    rig.part(joint, g, team=True)                                    # the blue bonnet, in team colour
    g = Geo().lathe([(11.0, 0), (11.6, 0.3), (11.6, 1.7), (11.0, 2.0)], (x, y, z - 1.6), segs=24)
    rig.part(joint, g, BONNET, outline=0.5)                          # dark headband
    g = Geo().sphere((x - 2.0, y, z + 10.6), 3.0, cuts=4)            # cream toorie
    rig.part(joint, g, B.CREAM, outline=0.8)
    g = Geo().blob((x - 7.0, -9.8, z + 2.6), (3.2, 1.6, 3.2), p=2.2)   # cream cockade
    rig.part(joint, g, B.CREAM, outline=0.5)
    rig.secondary("feather" if joint == "hat" else f"{joint}_feather", joint, (x - 7.0, -10.2, z + 3.0),
                  (x - 16.0, -9.0, z + 14.0), max_deg=14, gain=1.2)
    fj = "feather" if joint == "hat" else f"{joint}_feather"
    g = Geo().capsule((x - 7.0, -10.4, z + 3.0), (x - 12.0, -10.0, z + 11.0), 2.2, 1.8)
    g.capsule((x - 12.0, -10.0, z + 11.0), (x - 17.5, -9.6, z + 15.0), 1.8, 0.8)
    rig.part(fj, g, BONNET, finish="hair")


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    # legs: bare knees under the kilt, cream diced hose with team garter flashes, black brogues
    G.legs_v3(rig, B.SKIN, SHOE, stocking=HOSE, thigh_r=4.6)
    for s, y in (("r", -B.LEG_Y), ("l", B.LEG_Y)):
        g = Geo().blob((0.6, y - (4.2 if s == "r" else -4.2), K.V3_KNEE_Z - 2.4), (1.6, 0.9, 2.0), p=2.4)
        rig.part(f"shin_{s}", g, team=True, outline=0.4)              # garter flash
        g = Geo()
        for zz in (6.0, 8.6):
            g.blob((1.6, y - (3.6 if s == "r" else -3.6), zz), (1.2, 0.6, 1.0), p=2.2)
        rig.part(f"shin_{s}", g, HOSE_DK if s == "r" else "#978A70", outline=0, highlight=False)

    # torso: team doublet with cream facings, a cream jabot, a cross belt and a brass buckle
    coat = Geo().blob((0, 0, 28.5), (11.6, 10.6, 11.8), p=2.4, taper=(1.1, 0.95))
    coat.blob((0, 0, 19.0), (11.0, 10.0, 4.6), p=2.6)
    rig.part("torso", coat, team=True)
    g = Geo().blob((8.6, -1.4, 29.0), (3.6, 4.8, 8.2), p=2.6)
    g.clip((7.6, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM, outline=0.6)                       # facing / jabot
    g = Geo().capsule((-1.0, 9.8, 37.0), (10.6, -3.0, 22.0), 1.9)
    rig.part("torso", g, B.LEATHER, outline=0.6)                    # cross belt
    g = Geo().blob((10.8, -2.6, 24.0), (1.6, 2.4, 2.4), p=2.4)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob((0.4, 0, 20.4), (11.8, 10.8, 1.8), p=3.0)
    rig.part("torso", g, B.LEATHER)                                 # waist belt
    g = Geo().blob((4.0, 0, 36.6), (6.0, 7.0, 2.4), p=2.4)
    rig.part("torso", g, B.CREAM)

    # the kilt: a pleated team skirt with tartan bands, swishing late (hem 10 lu above the soles)
    rig.secondary("kilt", "hips", (0.0, 0, 18.0), (0.0, 0, 10.0), max_deg=12, gain=1.1)
    rig.rest_offset["kilt"] = (0, 0, K.V3_LIFT + 1.0)
    kilt = Geo().lathe([(10.4, 0), (11.6, -3.0), (12.6, -6.4), (13.2, -8.4), (0, -8.6)],
                       (0.4, 0, 18.4), (0.4, 0, 17.4), segs=24, squash=(1.0, 0.92))
    kf = F.Face(rig, "kilt", [kilt])
    rig.part("kilt", kilt, team=True)
    g = G.stripes(kf, Geo(), (15.6, 12.2), -9.0, 13.0, 1.3)
    rig.part("kilt", g, TARTAN, highlight=False, outline=0)
    g = Geo()
    for a in range(-80, 81, 32):
        r = math.radians(a)
        g.capsule((12.6 * math.cos(r) + 0.4, 12.6 * math.sin(r) * 0.92, 15.5),
                  (13.2 * math.cos(r) + 0.4, 13.2 * math.sin(r) * 0.92, 10.6), 0.45)
    rig.part("kilt", g, B.CREAM, outline=0, highlight=False)       # cream pleat lines
    # sporran with two dark tassels
    g = Geo().blob((11.8, -1.0, 14.8), (2.6, 5.0, 4.6), p=2.4, taper=(1.0, 0.85))
    rig.part("kilt", g, SPORRAN, finish="hair", outline=0.6)
    g = Geo()
    for yy in (-2.6, 1.4):
        g.capsule((13.8, yy - 1.0, 14.0), (14.0, yy - 1.0, 10.2), 0.8)
    rig.part("kilt", g, B.BLACK, outline=0)

    # head: ginger beard and moustache, big eyes, the bonnet on its own joint
    head = G.head_geos(center=(2, 0, 48.8), nose=(14.2, -0.6, 47.2))
    beard = Geo().blob((7.2, 0, 41.4), (8.8, 10.4, 6.0), p=2.3)
    beard.blob((10.2, 0, 37.4), (5.0, 6.0, 4.4), p=2.2)
    hair = Geo().blob((-5.6, 0, 47.0), (6.0, 10.6, 6.6), p=2.2)
    K.face2(rig, [head, beard, hair], B.SKIN, cx=12.2, cz=50.0, eye_dy=(-4.6, 4.4),
            eye_r=(3.8, 3.6, 4.5), brow=BEARD, mouth_dz=-8.6, mouth_x=13.6,
            eye_at=(14.0, 50.2), mark_r=4.2)
    rig.part("head", head, B.SKIN)
    rig.part("head", beard, BEARD, finish="hair")
    rig.part("head", hair, BEARD, finish="hair")
    B.moustache(rig, BEARD, cx=13.8, z=44.8)
    rig.joint("hat", "head", HAT_C)
    _bonnet(rig, "hat")
    rig.joint("hat_loose", "root", HAT_C, hidden=True)
    _bonnet(rig, "hat_loose")

    # arms: team sleeves with cream cuffs; a team shoulder wing
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM)
    for s, y in (("r", -12.4), ("l", 11.8)):
        g = Geo().blob((0, y, 37.0), (5.8, 5.2, 4.6), p=2.4)
        rig.part(f"arm_{s}", g, team=True)

    # targe on the far forearm: dark wood disc, brass stud rings, brass boss with a spike, anchor
    tx, ty, tz = TG_C
    g = Geo().lathe([(0, -1.2), (TG_R, -1.2), (TG_R + 0.6, 0), (TG_R, 1.4), (0, 2.2)],
                    (tx, ty + 1.0, tz), (tx, ty - 1.0, tz), segs=32)
    tf = F.Face(rig, "fore_l", [g])
    rig.part("fore_l", g, TARGE, finish="matte")
    g2 = Geo().lathe([(TG_R - 1.2, -0.8), (TG_R + 0.7, -0.8), (TG_R + 0.7, 1.0), (TG_R - 1.2, 1.0)],
                     (tx, ty + 0.2, tz), (tx, ty - 1.4, tz), segs=32)
    rig.part("fore_l", g2, TARGE_DK, finish="matte", outline=0.5)
    g = Geo()
    for ring, n in ((10.0, 12), (6.2, 8)):
        for i in range(n):
            a = 2 * math.pi * i / n
            g.sphere((tx + ring * math.cos(a), ty - 2.4, tz + ring * math.sin(a)), 0.9, cuts=2)
    rig.part("fore_l", g, B.BRASS, finish="metal", outline=0)
    g = Geo().lathe([(3.6, 0), (3.2, 1.4), (1.4, 2.6), (0.6, 5.6), (0, 6.2)], (tx, ty - 2.0, tz),
                    (tx, ty - 3.0, tz), segs=16)
    rig.part("fore_l", g, B.BRASS, finish="metal", outline=0.6)
    g = G.anchor(tf, Geo(), K.scr(tf, (tx, ty - 2.6, tz - 6.4)), s=0.55, w=1.4)
    rig.part("fore_l", g, B.CREAM, highlight=False, outline=0)

    # broadsword: modelled pointing up from the near fist; a straight blade with a fuller, a
    # brass basket hilt, a leather grip and a pommel
    hx, hy, hz = HR
    g = Geo().slab([(hx - 1.5, hz + 4.0), (hx - 1.3, hz + 4 + BL - 3.0), (hx + 0.2, hz + 4 + BL),
                    (hx + 1.7, hz + 4 + BL - 3.0), (hx + 1.9, hz + 4.0)], hy - 0.8, 1.5)
    rig.part("hand_r", g, BLADE, finish="metal", outline_hex="#6F7780")
    g = Geo().capsule((hx + 0.2, hy - 1.7, hz + 7.0), (hx + 0.2, hy - 1.7, hz + 28.0), 0.55)
    rig.part("hand_r", g, BLADE_DK, finish="metal", outline=0, highlight=False)
    g = Geo().capsule((hx, hy, hz - 5.0), (hx, hy, hz + 3.0), 1.6)
    rig.part("hand_r", g, B.LEATHER)
    g = Geo().blob((hx + 1.0, hy - 0.8, hz + 1.4), (5.4, 4.2, 4.4), p=2.2)   # basket
    g.sphere((hx, hy, hz - 6.2), 1.9, cuts=3)
    rig.part("hand_r", g, B.BRASS, finish="metal", outline=0.7)
    g = Geo().blob((hx + 1.0, hy - 3.6, hz + 1.4), (3.4, 0.6, 2.6), p=2.4)
    rig.part("hand_r", g, team=True, outline=0)                       # team lining in the basket
    rig.track("bladeTip", "hand_r", (hx + 0.2, hy, hz + 4 + BL))


# -- poses ---------------------------------------------------------------------------------
def blade_arm(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


def targe_arm(a, f, w=None):
    return B.arm("l", a, f, w, w_rest=90.0)


# guard: the targe in front of the chest, the blade raised past it
STANCE = merge(blade_arm(-52, 10, 70), targe_arm(-12, 22), {"torso": {"r": -3}})


def _idle(f):
    tap = [0.0, 0.3, 1.0, 0.4, 0.0, 0.0][f]

    def extra(ctx):
        return {"arm_r": {"r": 3 * ctx["lag"] - 14 * tap}, "fore_r": {"r": -10 * tap},
                "hand_r": {"r": -4 * ctx["lag"] + 20 * tap},
                "arm_l": {"r": 2 * ctx["lag"]}, "feather": {"r": 4 * ctx["lag"]},
                "head": {"r": -3 * tap}}
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


# -- walk v3: G1 bounce jog with a march (card 67 x 1.25 = 83.75 lu/s), 8 x 82 ms -----------------
SPEED = 83.75
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=640, stance=0.36)
# carry: the blade back on the near shoulder, the targe forward on the far arm
CARRY = merge(blade_arm(-78, 50, 165), targe_arm(-35, 25), {"torso": {"r": -3}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": 6 * lag}, "arm_r": {"r": 3 * lag}, "arm_l": {"r": 4 * lag},
                "kilt": {"r": 5 * lag, "rx": 6 * math.sin(ctx["p"])}, "feather": {"r": 6 * lag},
                "head": {"r": -2 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-6.0, twist=6.0, nod=3.0, extra=extra,
                     report=report)


# attack A: spin and chop. 11 unique frames, moves.SMALL_MELEE_MS (impact 6 at 290 of 680 ms); the held
# extreme is step 3. Arm and blade angles are WORLD degrees (the torso lean is subtracted in _pose).
#        read  turn  wind  HOLD  spin  round IMP   over  recoil settle
A_SA = [-52, -120, 160, 145, -20, 95, -10, -30, -35, -48]
A_SF = [10, -120, 170, 160, -10, 100, -30, -45, -25, 5]
A_SW = [70, -110, 175, 165, 10, 130, -45, -60, -20, 60]
A_TA = [-12, -30, -25, -20, -40, -30, -15, -20, -20, -12]     # targe arm (raised on the wind)
A_TF = [22, 40, 50, 60, 30, 40, 40, 30, 24, 22]
A_T = [-3, -4, -6, -8, -10, -6, -16, -14, -8, -3]
A_YAW = [0, 15, 30, 38, -175, -300, -360, -362, -360, -360]
A_X = [0.0, -0.5, -1.5, -2.0, 2.0, 6.0, 9.0, 9.0, 6.0, 1.0]
A_Z = [0.0, -2.5, -5.0, -7.0, -4.0, -2.0, -6.0, -5.0, -2.5, 0.0]
A_Q = [0.0, -0.04, -0.06, -0.08, 0.04, 0.06, -0.12, -0.06, -0.03, 0.0]
A_FEET = [((2.0, 0, 0), (-2.0, 0, 0)), ((4.0, 0, 0), (-5.0, 0, -4)), ((5.0, 0, 0), (-6.0, 0, -6)),
          ((6.0, 0, 0), (-7.0, 0, -10)), ((8.0, 0, 0), (-5.0, 0, -12)), ((11.0, 0, 0), (-4.0, 0, -14)),
          ((14.0, 0, 0), (-5.0, 0, -10)), ((14.0, 0, 0), (-5.0, 0, -8)), ((11.0, 0, 0), (-4.0, 0, -4)),
          ((3.0, 0, 0), (-2.0, 0, 0))]


def _yaw_head(yaw):
    if abs(yaw) < 90:
        return -0.4 * yaw
    if yaw <= -300:
        return -0.4 * (yaw + 360)
    return 0.0


def _pose(sa, sf, sw, ta, tf, t, yaw, x, z, q, feet, k, impact_k, hold_ks, smear_ks):
    pose = merge(blade_arm(sa - t, sf - t, sw - t), targe_arm(ta - t, tf - t), {
        "torso": {"r": t, "rz": yaw},
        "head": {"r": -0.5 * t, "rz": _yaw_head(yaw)},
    }, M.body_about((0, 0, 22), x=x, z=z, q=q))
    r, l = feet
    pose = G.plant(RIG, pose, LEGS, r=r, l=l, max_drop=6.0)
    if k in smear_ks:
        pose["hand_r"]["sz"] = 1.15
    if k in hold_ks:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in smear_ks or k == impact_k or k == impact_k + 1:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    return pose


def _a_pose(f):
    return _pose(A_SA[f], A_SF[f], A_SW[f], A_TA[f], A_TF[f], A_T[f], A_YAW[f], A_X[f], A_Z[f], A_Q[f],
                 A_FEET[f], f, 6, (1, 2, 3), (4, 5))


BLADE_IN = (HR[0] + 0.2, HR[1], HR[2] + 14.0)
BLADE_TIP = (HR[0] + 0.2, HR[1], HR[2] + 4 + BL)
SLASH = {"kind": "arc", "joint": "hand_r", "inner": BLADE_IN, "outer": BLADE_TIP, "color": BLADE,
         "taper": 0.2, "white": 0.3, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}
RING = dict(SLASH, t0=0.0, t1=1.0, lines=2, samples=24, band=0.4, taper=0.0)


def _hit_fx(seed, ground=20.0, a0=-80.0):
    return [{"kind": "burst", "joint": "hand_r", "point": BLADE_TIP, "r0_lu": 6.0, "r1_lu": 12.0,
             "n": 5, "a0": a0, "arc": 140.0},
            {"kind": "dust", "ground": (ground, 0.0), "size_lu": 6.0, "puffs": 3, "seed": seed, "spread": 0.9}]


def _attack_clip():
    ov = {
        4: [dict(RING, **{"from": 3, "t0": 0.55, "t1": 0.95})],
        5: [dict(RING, **{"from": 4}), dict(SLASH, **{"from": 4, "t0": 0.5})],
        6: [dict(SLASH, **{"from": 5, "t1": 1.0, "lines": 2})] + _hit_fx(41),
    }
    return M.clip("attack", [_a_pose(f) for f in range(10)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, sequence=list(range(10)) + [0],
                  extra={"holdStep": 3})


# attack B: over-the-rim chop. Unique frames 0 and 9 are A's; 1-8 new: duck, cock, HOLD (crouched behind
# the raised targe, the sword high over his head), smear, smear, IMPACT (blade chopped down past the
# rim), over, recoil.
B_SA = [-52, 60, 90, 100, 85, 45, -20, -35, -45, -48]
B_SF = [10, 90, 115, 125, 95, 35, -35, -50, -30, 5]
B_SW = [70, 100, 110, 100, 80, 20, -55, -70, -30, 60]
B_TA = [-40, -20, -10, -8, -10, -20, -30, -35, -38, -40]
B_TF = [20, 60, 75, 80, 70, 50, 30, 20, 20, 20]
B_T = [-3, -8, -12, -14, -8, -4, -18, -16, -8, -3]
B_YAW = [0, 6, 10, 12, 4, -6, -14, -12, -6, 0]
B_X = [0.0, -1.0, -2.0, -2.5, 1.0, 4.0, 7.0, 7.0, 4.0, 1.0]
B_Z = [0.0, -4.0, -7.0, -8.0, -5.0, -3.0, -6.0, -5.5, -3.0, 0.0]
B_Q = [0.0, -0.06, -0.1, -0.12, 0.06, 0.08, -0.12, -0.06, -0.03, 0.0]
B_FEET = [((2.0, 0, 0), (-2.0, 0, 0)), ((6.0, 0, 0), (-6.0, 0, -4)), ((8.0, 0, 0), (-9.0, 0, -8)),
          ((9.0, 0, 0), (-10.0, 0, -10)), ((10.0, 0, 0), (-8.0, 0, -10)), ((12.0, 0, 0), (-6.0, 0, -10)),
          ((13.0, 0, 0), (-6.0, 0, -8)), ((13.0, 0, 0), (-6.0, 0, -6)), ((10.0, 0, 0), (-4.0, 0, -4)),
          ((3.0, 0, 0), (-2.0, 0, 0))]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_SA[f], B_SF[f], B_SW[f], B_TA[f], B_TF[f], B_T[f], B_YAW[f], B_X[f], B_Z[f], B_Q[f],
                 B_FEET[f], f, 6, (1, 2, 3), (4, 5))


def _attack_b():
    ov = {
        4: [dict(SLASH, **{"from": 3})],
        5: [dict(SLASH, **{"from": 3, "t0": 0.35})],
        6: [dict(SLASH, **{"from": 5, "t1": 1.0, "lines": 2})] + _hit_fx(42),
    }
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, sequence=list(range(10)) + [0],
                  reuse={0: ("attack", 0), 9: ("attack", 9)}, extra={"holdStep": 3})


# attack C: bash and stab. 1 lean in, 2 draw back, 3 HOLD (low, the targe pushed out, the blade drawn
# back level at the hip), 4 bash (targe punch, streak), 5 drive, 6 IMPACT (thrust past the rim), 7 over,
# 8 recoil.
C_SA = [-52, -100, -125, -130, -150, -60, -2, 2, -20, -48]
C_SF = [10, -60, -140, -150, -170, -30, -2, 2, 0, 5]
C_SW = [70, -20, -140, -145, -178, -10, 0, 2, 20, 60]
C_TA = [-40, -10, 0, 4, 10, -10, -30, -35, -40, -40]
C_TF = [20, 10, 4, 2, 6, 10, 20, 20, 20, 20]
C_T = [-3, -8, -10, -12, -16, -14, -20, -18, -10, -3]
C_YAW = [0, -6, -12, -14, -18, 6, 14, 14, 6, 0]
C_X = [0.0, 1.0, 0.0, -1.0, 5.0, 8.0, 11.0, 11.0, 7.0, 1.0]
C_Z = [0.0, -3.0, -6.0, -7.0, -6.0, -5.0, -6.0, -5.5, -3.0, 0.0]
C_Q = [0.0, -0.05, -0.08, -0.1, 0.06, 0.04, -0.1, -0.05, -0.02, 0.0]
C_FEET = [((2.0, 0, 0), (-2.0, 0, 0)), ((6.0, 0, 0), (-6.0, 0, -4)), ((9.0, 0, 0), (-9.0, 0, -8)),
          ((10.0, 0, 0), (-10.0, 0, -10)), ((14.0, 0, 0), (-8.0, 0, -12)), ((16.0, 0, 0), (-6.0, 0, -14)),
          ((17.0, 0, 0), (-6.0, 0, -12)), ((17.0, 0, 0), (-6.0, 0, -10)), ((13.0, 0, 0), (-4.0, 0, -6)),
          ((3.0, 0, 0), (-2.0, 0, 0))]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_SA[f], C_SF[f], C_SW[f], C_TA[f], C_TF[f], C_T[f], C_YAW[f], C_X[f], C_Z[f], C_Q[f],
                 C_FEET[f], f, 6, (1, 2, 3), (4, 5))


THRUST = {"kind": "streak", "joint": "hand_r", "point": BLADE_TIP, "color": BLADE, "width_lu": 6.0, "white": 0.35}
BASH = {"kind": "streak", "joint": "fore_l", "point": (TG_C[0] + 8.0, TG_C[1], TG_C[2]), "color": TARGE,
        "width_lu": 10.0, "white": 0.25}


def _attack_c():
    ov = {
        4: [dict(BASH, **{"from": 3})],
        5: [dict(THRUST, **{"from": 4})],
        6: [dict(THRUST, **{"from": 5, "width_lu": 5.0})] + _hit_fx(43, ground=24.0, a0=-60.0),
    }
    return M.clip("attack_c", [_c_pose(f) for f in range(10)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, sequence=list(range(10)) + [0],
                  reuse={0: ("attack", 0), 9: ("attack", 9)}, extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "hand_r": {"r": 14 * a},
                "arm_l": {"r": 20 * a}, "fore_l": {"r": 10 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 8 * a},
                "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


HAT_PATH = {1: (3.0, 7.0, 30.0), 2: (8.0, 14.0, 110.0), 3: (14.0, 17.0, 200.0), 4: (20.0, 12.0, 280.0),
            5: (25.0, 0.0, 330.0), 6: (29.0, -24.0, 355.0), 7: (32.0, -50.0, 372.0), 8: (33.0, -53.0, 366.0),
            9: (33.0, -53.0, 366.0)}


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "hand_r": {"r": 40 * flail},
        "arm_l": {"r": 80 * flail + 20}, "fore_l": {"r": 30 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
        "kilt": {"r": 12 * flail},
    })
    if k in HAT_PATH:
        x, z, r = HAT_PATH[k]
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 4, 5, 6, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 2, 3, 4, 5, 5, 6, 6], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
