"""Corsair: Gunpowder Age infantry (DESIGN A5.4). Cutlass, blunt, Boarding Hook, ~68 lu.

Look (A11, Gunpowder palette): a stocky pirate in a black tricorne (cream braid, a cream badge,
a team cockade) over a team bandana whose knot tails fly behind, a black beard and moustache, an
eyepatch on the far eye (the strap crosses his brow) and a brass earring. A team coat with long
tails and a cream anchor on its flank, open over a cream shirt with green stripes, a bottle-green sash with flying
tails, a leather belt with a big brass buckle, baggy dark breeches and tall black cuffed boots.
He swings an oversized curved cutlass with a brass basket hilt in the near hand and carries an
iron grapnel with a rope coil in the far hand, so the Boarding Hook trait reads at a glance.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    flips a brass coin off his hook hand and catches it, taps the cutlass, blink
  walk    swagger: hip sway, shoulder roll, the hook arm swinging wide, the blade bobbing late
  attack  HOOK YANK AND LUNGING SLASH: he flicks the grapnel out at the target (a streak), yanks
          it back to his hip and rears back with the cutlass cocked high behind his head (the
          held extreme), then throws a deep fencing lunge (front knee bent, back leg straight)
          and cuts the blade over and down through the target (a crescent smear), tip low in
          front with impact lines and dust, a yell, and the blade follows through past the target
  hit     light: head snaps back, the tricorne lifts off his head, eyes squeezed
  die     D1 fling and spin: launched back spinning, the tricorne pops off and lands at his feet,
          flat on his back with X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "corsair"
NAME = "Corsair"
HEIGHT_LU = 68
CANVAS = (284, 240)
FEET = (116, 212)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

BEARD = "#2F2724"
BREECH = "#4A3B2E"
BOOT = "#2E2A2A"
BLADE = "#C9D0D8"
BLADE_DK = "#8C96A2"
ROPE = "#B8A27E"
STRIPE = "#5E7F72"
HAT = "#2E2B2C"
FEATHER = "#F4EEDC"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand: cutlass
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand: grapnel
BL = 35.0                            # blade length from the hand
HAT_C = (1.0, 0.0, 59.6)             # tricorne pivot (it pops off in the death)


def _hat(rig, joint):
    B.tricorn(rig, joint=joint, c=HAT_C, color=HAT, trim=B.CREAM, team_cockade=True, scale=1.18)
    # a skull-and-bones badge on the front corner (cream, reads as a white dot at 1x)
    g = Geo().blob((HAT_C[0] + 13.0, -3.6, HAT_C[2] + 4.2), (1.6, 2.6, 2.6), p=2.2)
    rig.part(joint, g, FEATHER, outline=0.5)


def build(rig):
    B.skeleton(rig)
    # legs: baggy breeches, tall black boots with flared cuffs and a brass buckle
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().capsule((0, y, 15), (0.8, y, 8.5), 5.8, 5.2)
        rig.part(f"thigh_{s}", g, BREECH)
        g = Geo().capsule((0.8, y, 8.5), (1.0, y, 4.0), 4.3, 4.0)
        g.blob((3.6, y, 2.7), (7.2, 4.8, 2.9), p=2.8, taper=(1.02, 0.82))
        rig.part(f"shin_{s}", g, BOOT, finish="gloss")
        g = Geo().blob((1.2, y, 9.8), (6.0, 5.8, 2.4), p=2.4, taper=(1.0, 1.15))
        rig.part(f"shin_{s}", g, BOOT, finish="gloss")
        g = Geo().blob((5.0, y - 4.4, 4.8), (1.8, 1.0, 1.6), p=2.4)
        rig.part(f"shin_{s}", g, B.BRASS, finish="metal", outline=0.5)

    # torso: cream shirt with green stripes, team waistcoat open at the front, sash, belt
    shirt = Geo().blob((0, 0, 28.5), (11.4, 10.2, 11.8), p=2.3, taper=(1.1, 0.95))
    shirt.blob((0, 0, 18.0), (10.8, 9.8, 4.8), p=2.6)
    sface = F.Face(rig, "torso", [shirt])
    rig.part("torso", shirt, B.CREAM)
    g = G.stripes(sface, Geo(), (33.0, 29.2, 25.4), 7.0, 14.0, 2.4)
    rig.part("torso", g, STRIPE, highlight=False, outline=0)
    vest = Geo().blob((-0.6, 0, 28.0), (11.9, 11.0, 11.6), p=2.5, taper=(1.12, 0.94))
    vest.clip((0, 0, 37.4), (0, 0, 1))
    vest.clip((8.2, 0, 0), (1, -0.35, 0))  # open front: the shirt shows
    rig.part("torso", vest, team=True)
    g = Geo().blob((0.4, 0, 19.6), (12.2, 11.3, 3.2), p=3.0)
    rig.part("torso", g, B.GREEN)
    g = Geo().blob((0.5, 0, 23.2), (12.0, 11.1, 1.7), p=3.2)
    rig.part("torso", g, B.LEATHER)
    g = Geo().blob((11.9, -3.2, 23.2), (1.7, 3.0, 2.6), p=2.4)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.6)
    rig.secondary("sash", "hips", (-7.0, -8.0, 19.0), (-12.0, -9.5, 8.0), max_deg=18, gain=1.3)
    g = Geo().capsule((-7.0, -8.6, 19.0), (-11.8, -9.8, 9.5), 2.6, 2.0)
    g.capsule((-6.0, -9.4, 19.0), (-7.8, -10.6, 10.5), 2.2, 1.6)
    g.blob((-6.5, -8.8, 19.4), (3.0, 2.2, 3.0), p=2.2)
    rig.part("sash", g, B.GREEN)
    # long coat tails behind the legs (team, a cream hem), swinging late
    rig.secondary("tails", "hips", (-5.0, 0, 18.0), (-8.5, 0, 5.0), max_deg=12, gain=1.0)
    tl = Geo().blob((-6.0, 0, 11.0), (5.4, 10.8, 8.6), p=2.6, taper=(0.7, 1.0), rot=(0, 10, 0))
    tf = F.Face(rig, "tails", [tl])
    rig.part("tails", tl, team=True)
    g = G.anchor(tf, Geo(), (-7.0, 11.4), s=0.95)
    rig.part("tails", g, B.CREAM, highlight=False, outline=0)
    g = Geo().blob((-7.4, 0, 3.4), (4.2, 11.2, 1.9), p=2.6, rot=(0, 10, 0))
    rig.part("tails", g, B.CREAM)
    g = Geo().blob((4.0, 0, 36.5), (5.6, 6.4, 2.4), p=2.4)  # open collar
    rig.part("torso", g, B.CREAM)

    # head: beard, one visible eye, a patch on the far eye with a strap across the brow
    head = Geo().blob((2, 0, 49.0), (11.8, 11.2, 11.6), p=2.3)
    head.blob((6, 0, 43.5), (8.6, 9.4, 6.2), p=2.2)
    head.blob((14.2, -0.6, 47.6), (3.9, 3.3, 3.5), p=2.0)
    beard = Geo().blob((7.4, 0, 41.2), (8.6, 10.4, 5.6), p=2.3)
    beard.blob((10.4, 0, 37.6), (4.8, 5.4, 4.4), p=2.2)
    hair = Geo().blob((-5.5, 0, 47.0), (5.8, 10.6, 6.4), p=2.2)
    K.face2(rig, [head, beard, hair], B.SKIN, cx=12.2, cz=50.2, eye_dy=(-4.6, 4.4),
            eye_r=(3.8, 3.6, 4.5), brow=BEARD, mouth_dz=-8.8, mouth_x=13.6,
            eye_at=(14.0, 50.4), mark_r=4.2)
    rig.part("head", head, B.SKIN)
    rig.part("head", beard, BEARD, finish="hair")
    rig.part("head", hair, BEARD, finish="hair")
    B.moustache(rig, BEARD, cx=13.8, z=44.8)
    g = Geo().blob((13.2, 5.0, 50.2), (2.8, 3.6, 4.4), p=2.4)          # the patch (far eye)
    g.capsule((13.4, 3.0, 52.4), (11.8, -2.0, 55.6), 0.9)             # strap over the brow
    g.capsule((11.8, -2.0, 55.6), (6.0, -9.6, 56.0), 0.9)
    g.capsule((6.0, -9.6, 56.0), (-4.0, -10.8, 53.0), 0.9)
    rig.part("head", g, B.BLACK, outline=0.6)
    g = Geo().lathe([(1.9, -0.5), (1.9, 0.5), (1.1, 0.5), (1.1, -0.5)], (-1.0, -12.4, 42.8),
                    (-1.0, -13.4, 42.8), segs=12)
    rig.part("head", g, B.BRASS, finish="metal", outline=0.5)
    # the team bandana under the hat (shows at the back) with knot tails that fly behind
    g = Geo().blob((-1.0, 0, 55.0), (12.0, 11.8, 6.6), p=2.4)
    g.clip((0, 0, 54.4), (0, 0, -1))
    g.clip((0.0, 0, 0), (1, 0, 0))
    g.blob((-10.6, 0, 54.0), (3.6, 4.2, 3.6), p=2.2)
    rig.part("head", g, team=True)
    rig.secondary("knot", "head", (-11.5, 0, 53.2), (-20.0, 0, 47.0), max_deg=18, gain=1.4)
    g = Geo().capsule((-11.5, -1.6, 53.2), (-20.0, -2.6, 49.0), 2.8, 1.9)
    g.capsule((-11.5, 1.6, 52.6), (-18.0, 2.6, 44.6), 2.5, 1.7)
    rig.part("knot", g, team=True)
    rig.joint("hat", "head", HAT_C)
    _hat(rig, "hat")
    rig.joint("hat_loose", "root", HAT_C, hidden=True)
    _hat(rig, "hat_loose")

    # arms: rolled cream sleeves with team waistcoat shoulders, bare forearms, leather cuffs
    for s in ("r", "l"):
        y = B.ARM_Y[s]
        g = Geo().capsule((0, y, B.SHOULDER_Z), (0, y, B.ELBOW_Z), 4.9, 4.4)
        rig.part(f"arm_{s}", g, team=True)                                  # coat sleeve
        g = Geo().blob((0, y, B.ELBOW_Z + 0.4), (5.3, 5.3, 2.2), p=2.6)   # big cream cuff
        rig.part(f"arm_{s}", g, B.CREAM)
        g = Geo().capsule((0, y, B.ELBOW_Z), (0, y, B.HAND_Z + 2.0), 4.0, 3.8)
        rig.part(f"fore_{s}", g, B.SKIN)
        g = Geo().blob((0, y, B.HAND_Z + 3.4), (4.6, 4.6, 1.8), p=2.6)
        rig.part(f"fore_{s}", g, B.LEATHER)
        g = Geo().blob((0.4, y, B.HAND_Z - 0.4), (4.5, 4.3, 4.5), p=2.3)
        g.blob((2.8, y - 1.4 * (1 if s == "r" else -1), B.HAND_Z + 0.8), (1.6, 1.5, 2.2), p=2.2)  # thumb
        rig.part(f"hand_{s}", g, B.SKIN)
    for s, y in (("r", -12.4), ("l", 11.8)):
        g = Geo().blob((0, y, 37.0), (6.0, 5.4, 4.8), p=2.4)
        rig.part(f"arm_{s}", g, team=True)

    # cutlass: modelled pointing up from the near fist; a broad curved blade with a fuller,
    # a big brass basket guard, a leather grip and a pommel
    hx, hy, hz = HR
    back = [(hx - 1.6, hz + 4.0), (hx - 0.8, hz + 15), (hx + 1.2, hz + 26), (hx + 4.4, hz + 35),
            (hx + 8.2, hz + 4 + BL)]
    edge = [(hx + 10.8, hz + 4 + BL - 4.0), (hx + 9.6, hz + 30), (hx + 7.2, hz + 19),
            (hx + 4.8, hz + 9), (hx + 2.6, hz + 4.0)]
    g = Geo().slab(back + edge, hy - 0.8, 1.6)
    rig.part("hand_r", g, BLADE, finish="metal", outline_hex="#6F7780")
    g = Geo().capsule((hx + 0.6, hy - 1.8, hz + 7.0), (hx + 3.0, hy - 1.8, hz + 30.0), 0.8)
    rig.part("hand_r", g, BLADE_DK, finish="metal", outline=0, highlight=False)
    g = Geo().capsule((hx, hy, hz - 5.0), (hx, hy, hz + 3.0), 1.6)
    rig.part("hand_r", g, B.LEATHER)
    g = Geo().blob((hx + 2.8, hy - 0.8, hz + 0.6), (6.0, 3.6, 5.4), p=2.2)  # basket guard
    g.clip((hx - 1.2, hy, hz), (-1, 0, 0))
    g.blob((hx, hy, hz + 4.4), (4.2, 2.8, 1.1), p=2.4)
    g.sphere((hx, hy, hz - 6.2), 1.9, cuts=3)
    rig.part("hand_r", g, B.BRASS, finish="metal", outline=0.7)

    # grapnel in the far hand: a 3-pronged iron hook, a rope coil hanging from the wrist
    fx_, fy, fz = HL
    g = Geo().capsule((fx_ + 1.0, fy, fz), (fx_ + 1.0, fy, fz + 10.0), 1.4)
    for ang in (-55, 0, 55):
        a = math.radians(ang)
        tip = (fx_ + 1.0 + 7.0 * math.sin(a), fy, fz + 11.5 + 1.5 * math.cos(a))
        g.capsule((fx_ + 1.0, fy, fz + 9.5), tip, 1.3, 1.1)
        g.capsule(tip, (fx_ + 1.0 + 8.8 * math.sin(a), fy, fz + 15.4), 1.1, 0.6)
    g.lathe([(1.6, -0.8), (2.2, 0), (1.6, 0.8), (1.0, 0.8), (1.0, -0.8)], (fx_ + 1.0, fy, fz - 1.6),
            (fx_ + 1.0, fy, fz - 0.6), segs=12)   # eye ring
    rig.part("hand_l", g, B.IRON, finish="metal", outline=0.8)
    g = Geo().lathe([(4.6, -2.0), (5.3, 0), (4.6, 2.0), (2.6, 2.0), (2.0, 0), (2.6, -2.0)],
                    (fx_ + 0.5, fy + 1.0, fz - 6.0), (fx_ + 0.5, fy + 3.0, fz - 6.0), segs=16)
    rig.part("hand_l", g, ROPE, finish="hair")
    # the coin he flips in the idle (a brass disc facing the camera)
    rig.joint("coin", "hand_l", (fx_ + 14.0, fy - 26.0, fz + 6.0), hidden=True)
    g = Geo().lathe([(0, -0.5), (3.0, -0.5), (3.0, 0.5), (0, 0.5)], (fx_ + 14.0, fy - 26.0, fz + 6.0),
                    (fx_ + 14.0, fy - 27.0, fz + 6.0), segs=16)
    rig.part("coin", g, "#E2C25A", finish="metal", outline=0.6)

    rig.track("bladeTip", "hand_r", (hx + 8.2, hy, hz + 4 + BL - 1.5))
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def blade_arm(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


def hook_arm(a, f, w=None):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(blade_arm(-48, 8, 62), hook_arm(-62, -12, 76), {"torso": {"r": -3}, "hat": {"r": 9}})


def _idle(f):
    # 4 poses played 0-1-2-3-2-1 (atlas budget): breathing and a weight shift; he flips a coin
    # off the hook hand (1-3, it spins at the top) and catches it; the cutlass taps on 3
    coin_z = [0.0, 9.0, 17.0, 20.0][f]
    tap = [0.0, 0.2, 0.5, 1.0][f]
    look = [0.0, 0.6, 1.0, 1.0][f]
    k = [0, 1, 2, 3][f]

    def extra(ctx):
        return {"arm_l": {"r": 8 * look}, "fore_l": {"r": 10 * look},
                "coin": {"show": f > 0, "z": coin_z, "x": 1.0 * look, "sx": [1, 0.35, 1, 0.35][f]},
                "head": {"r": 6 * look}, "pupils": {"z": 0.8 * look},
                "arm_r": {"r": 3 * ctx["lag"] + 6 * tap}, "hand_r": {"r": -4 * ctx["lag"] - 14 * tap}}
    pose = M.idle_v2(k, STANCE, frames=6, extra=extra)
    if f == 3:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    # swagger: hip sway and shoulder roll, the hook arm swinging wide, the blade bobbing late
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": 6 * lag}, "arm_r": {"r": -6 * math.cos(ctx["lag_p"])},
                "torso": {"rx": 5 * math.sin(ctx["p"])}, "head": {"r": -2 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=34.0, knee=58.0, lift_lu=6.8, bob_pct=0.065,
                     lean=-4.0, arm=34.0, fore=24.0, twist=9.0, sway=6.0, arms=("l",), extra=extra)


# attack: 11 unique frames, moves.SMALL_MELEE_MS (impact 6 at 290 of 680 ms). Arm and blade
# angles are WORLD degrees here (the torso lean is subtracted in _attack_pose).
#        read  flick yank HOLD smear smear IMP  over recoil settle settle
CA = [-51, -66, 52, 100, 75, 30, -10, -25, -30, -40, -51]      # cutlass upper arm
CF = [5, -16, 112, 140, 80, 20, -25, -40, -30, 0, 5]           # cutlass forearm
CW = [59, 34, 132, 160, 95, 25, -30, -45, -20, 30, 59]         # blade direction
HA = [-53, 4, -94, -98, -80, -60, -50, -50, -55, -62, -65]     # hook arm (flick out, yank back)
HF = [-7, 6, -4, -48, -20, 0, 10, 0, -10, -14, -15]
HW = [77, 0, 124, 120, 110, 100, 90, 90, 85, 80, 79]
T_R = [-3, -6, 6, 12, -4, -14, -22, -20, -14, -6, -3]           # torso lean (+ back)
T_YAW = [0, -6, 16, 26, 12, -4, -12, -12, -8, -3, 0]
B_X = [0.0, -1.0, -3.0, -4.5, 1.0, 6.0, 10.0, 10.5, 8.0, 3.0, 1.0]
B_Z = [0.0, -1.6, -1.0, -1.6, -1.5, -3.5, -5.5, -5.0, -4.0, -1.2, 0.0]
B_Q = [0.0, -0.06, 0.02, -0.06, 0.06, 0.04, -0.12, -0.06, -0.04, 0.02, 0.0]
TH_R = [0, 6, 10, 16, 26, 36, 44, 42, 34, 12, 2]              # the lunge: front knee deep
SH_R = [0, -6, -8, -10, -24, -36, -46, -42, -34, -8, 0]
TH_L = [0, -4, -8, -12, -22, -32, -40, -38, -30, -10, -2]      # back leg thrown straight
SH_L = [0, -6, -6, -8, -10, -8, -6, -6, -8, -2, 0]
HEAD = [0, -2, 2, -4, -6, -6, -4, -2, -2, -1, 0]


def _attack_pose(f):
    t = T_R[f]
    pose = merge(blade_arm(CA[f] - t, CF[f] - t, CW[f] - t), hook_arm(HA[f] - t, HF[f] - t, HW[f] - t), {
        "torso": {"r": t, "rz": T_YAW[f]},
        "head": {"r": HEAD[f] - 0.5 * t, "rz": -0.6 * T_YAW[f]},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
    }, M.body_about((0, 0, 22), x=B_X[f], z=B_Z[f], q=B_Q[f]))
    if f in (4, 5):
        pose["hand_r"]["sz"] = 1.18
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


BLADE_IN = (HR[0] + 3.0, HR[1], HR[2] + 14.0)
BLADE_TIP = (HR[0] + 8.2, HR[1], HR[2] + 4 + BL)
SLASH = {"kind": "arc", "joint": "hand_r", "inner": BLADE_IN, "outer": BLADE_TIP, "color": BLADE,
         "taper": 0.2, "white": 0.3, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}


def _attack_clip():
    ov = {
        4: [dict(SLASH, **{"from": 3})],
        5: [dict(SLASH, **{"from": 3, "t0": 0.35})],
        6: [dict(SLASH, **{"from": 5, "t0": 0.0, "t1": 1.0, "lines": 2}),
            {"kind": "burst", "joint": "hand_r", "point": BLADE_TIP, "r0_lu": 6.0, "r1_lu": 12.0,
             "n": 5, "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (22.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 21, "spread": 0.9}],
        1: [{"kind": "streak", "joint": "hand_l", "point": (HL[0] + 1.0, HL[1], HL[2] + 15.0),
             "color": "#9CA3AD", "width_lu": 4.0, "white": 0.3, "from": 0}],
    }
    # frame 10 (settle) is close to frame 0: reuse it (atlas budget)
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, sequence=list(range(10)) + [0])


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "hand_r": {"r": 14 * a},
                "arm_l": {"r": 30 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 8 * a},
                "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


# the tricorne pops off and tumbles forward to land at his feet (x, z, spin from its rest pivot)
HAT_PATH = {1: (3.0, 7.0, 30.0), 2: (8.0, 14.0, 110.0), 3: (14.0, 17.0, 200.0), 4: (20.0, 12.0, 280.0),
            5: (25.0, 0.0, 330.0), 6: (29.0, -24.0, 355.0), 7: (32.0, -50.0, 372.0), 8: (33.0, -53.0, 366.0),
            9: (33.0, -53.0, 366.0)}


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "hand_r": {"r": 40 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
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
        M.clip("idle", [_idle(f) for f in range(4)], [153, 154, 153, 153, 154, 153], loop=True,
               sequence=[0, 1, 2, 3, 2, 1]),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 4, 5, 6, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 2, 3, 4, 5, 5, 6, 6], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
