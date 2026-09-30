"""Footman: Medieval Age infantry (DESIGN A5.3). Arming sword, Shield Wall, ~68 lu.

Look (A11): a stocky man-at-arms in a riveted steel kettle hat with a wide brim and a team
feather, big eyes under the brim, a bushy moustache, a slate mail shirt under a team tabard
with a parchment hem, wine hose, cuffed boots, a belt with a gold buckle and an empty
scabbard at the far hip. A big team kite shield (steel rim with rivets, a parchment bear-paw
emblem, a gold boss) is carried forward on the near arm, so the Shield Wall trait reads at a
glance, and an oversized arming sword (gold crossguard and pommel, a dark fuller, a wine grip)
is held up in the far hand.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    peeks over the shield rim, taps the flat of the sword on the rim, weight shift, blink
  walk    march: stiff knees and a high step, the shield steady, the sword bobbing late
  attack  GUARD AND HORIZONTAL CLEAVE: the shield stays up; he coils behind it with the sword
          pulled straight back at chest height (the held extreme), then whips a flat sweep
          around in front of the shield (a flat crescent smear), the blade past the target,
          and snaps back behind the shield
  hit     armoured: dips behind the shield, the kettle hat clanks down over his eyes
  die     D2 topple: rocks back, stiffens, falls flat on his face like a plank, the hat pops
          off and rolls away, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "footman"
NAME = "Footman"
HEIGHT_LU = 68
CANVAS = (300, 232)
FEET = (104, 206)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

SKIN = "#EBC4A0"
HAIR = "#4A3B31"
MAIL = "#6B7682"
STEEL = "#A7B0BB"
STEEL_DK = "#5E6670"
WINE = "#8E2A4A"
LEATHER = "#6B5647"
BOOT = "#7F6A58"
GOLD = "#D4A437"
PARCH = "#E8DFC8"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand (shield)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand (sword)
BLADE = 44.0
HELM_C = (1.5, 0.0, 59.2)             # helmet pivot (it pops off in the death)


def _helm(rig, joint, off=(0.0, 0.0, 1.2)):
    """Kettle hat: steel cap, wide riveted brim, gold knob. `off` shifts the geometry."""
    ox, oy, oz = off
    g = Geo().blob((1.5 + ox, oy, 55.0 + oz), (12.4, 12.2, 9.4), p=2.4)
    g.clip((0, 0, 54.2 + oz), (0, 0, -1))
    rig.part(joint, g, STEEL, finish="metal")
    g = Geo().lathe([(0, -1.0), (16.4, -1.0), (17.4, 0.0), (16.4, 1.0), (0, 1.0)],
                    (2.0 + ox, oy, 54.8 + oz), segs=28, squash=(1.0, 0.92), rot=(0, -6, 0))
    rig.part(joint, g, STEEL, finish="metal")
    # a dark band where the cap meets the brim, rivets on it, and a comb ridge
    g = Geo().lathe([(12.2, 0), (12.6, 0.4), (12.6, 2.0), (12.2, 2.4)], (1.6 + ox, oy, 55.0 + oz), segs=28)
    rig.part(joint, g, STEEL_DK, finish="metal", outline=0.5)
    g = Geo()
    for a in (-150, -118, -86, -54, -22):
        r = math.radians(a)
        g.sphere((1.6 + ox + 12.9 * math.cos(r), oy + 12.9 * math.sin(r), 56.2 + oz), 1.25, cuts=2)
    rig.part(joint, g, GOLD, finish="metal", outline=0)
    g = Geo().capsule((-9.0 + ox, oy, 60.0 + oz), (11.0 + ox, oy, 60.5 + oz), 1.4)
    g.clip((0, 0, 59.0 + oz), (0, 0, -1))
    rig.part(joint, g, STEEL, finish="metal", outline=0.6)
    g = Geo().capsule((1.5 + ox, oy, 64.2 + oz), (1.5 + ox, oy, 66.2 + oz), 2.2)
    rig.part(joint, g, GOLD, finish="metal", outline=0.8)


def _plume(rig, joint):
    g = Geo()
    for x, z, r in ((0.5, 67.8, 3.6), (-3.8, 70.2, 4.2), (-8.4, 70.6, 4.0), (-12.6, 69.0, 3.4),
                    (-15.8, 66.6, 2.7)):
        g.blob((x, 0, z + 1.2), (r * 1.2, r * 0.8, r), p=2.1)
    rig.part(joint, g, team=True)


def _sword(rig, joint, base):
    hx, hy, hz = base
    g = Geo().lathe([(0, -5.5), (2.1, -5.2), (2.3, -1.0), (2.0, 4.0), (0, 4.4)], (hx, hy, hz), segs=12)
    rig.part(joint, g, WINE)
    g = Geo()
    for z in (-3.6, -0.6, 2.4):   # grip wraps
        g.lathe([(2.35, 0), (2.5, 0.5), (2.5, 1.3), (2.3, 1.6)], (hx, hy, hz + z), segs=12)
    rig.part(joint, g, LEATHER, outline=0)
    g = Geo().sphere((hx, hy, hz - 6.6), 2.7, cuts=3)
    g.blob((hx, hy, hz + 4.8), (2.0, 8.4, 1.8), p=2.8)
    g.sphere((hx, hy - 8.0, hz + 4.8), 1.8, cuts=2)
    g.sphere((hx, hy + 8.0, hz + 4.8), 1.8, cuts=2)
    rig.part(joint, g, GOLD, finish="metal", outline=0.9)
    g = Geo().lathe([(0, 0), (4.2, 0.2), (4.5, BLADE * 0.62), (3.0, BLADE - 6), (0, BLADE)],
                    (hx, hy, hz + 5.6), squash=(1.0, 0.36), segs=12)
    rig.part(joint, g, STEEL, finish="metal")
    g = Geo().capsule((hx, hy - 1.7, hz + 8.5), (hx, hy - 1.7, hz + BLADE * 0.7), 0.9)
    rig.part(joint, g, STEEL_DK, finish="metal", outline=0, highlight=False)


def build(rig):
    B.skeleton(rig)
    B.legs(rig, WINE, BOOT, cuff=LEATHER)
    rig.joint("helm", "head", HELM_C)

    # torso: mail shirt, team tabard (front and back panels over the mail), belt
    g = Geo().blob((0, 0, 28.5), (11.0, 10.0, 11.8), p=2.3, taper=(1.1, 0.95))
    g.blob((0, 0, 17.5), (10.4, 9.6, 4.6), p=2.6)
    rig.part("torso", g, MAIL, finish="metal")
    tab = Geo().blob((0.4, 0, 25.5), (11.9, 10.9, 10.8), p=2.8, taper=(1.12, 0.9))
    tab.clip((0, 0, 36.2), (0, 0, 1))
    tface = F.Face(rig, "torso", [tab])
    rig.part("torso", tab, team=True)
    # parchment trim down the tabard's front edge and a bear paw on the chest
    g = Geo()
    c = tface.hit(9.5, 29.0)
    tface.stroke(g, c, [(0.0, 5.0), (0.6, -6.0)], 1.8, 0.4)
    rig.part("torso", g, PARCH, highlight=False, outline=0)
    g = K.paw(tface, Geo(), (3.0, 29.0), s=1.05)
    rig.part("torso", g, PARCH, highlight=False, outline=0)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=8, gain=0.8)
    g = Geo().blob((0.6, 0, 15.5), (12.2, 11.0, 4.6), p=2.8, taper=(1.12, 1.0))
    for x, y in ((9.0, -7.0), (2.0, -11.0), (-6.0, -9.5)):   # tabard slits (notches)
        g.lathe([(1.6, 0), (0, 3.2)], (x, y - 0.6, 11.4), (x, y - 0.8, 14.6), segs=6)
    rig.part("hem", g, team=True)
    g = Geo().blob((0.6, 0, 11.4), (12.0, 10.8, 1.4), p=3.0)
    rig.part("hem", g, PARCH)
    g = Geo().blob((0.4, 0, 20.8), (12.2, 11.1, 1.9), p=3.2)
    rig.part("torso", g, LEATHER)
    g = Geo().blob((12.1, -2.0, 20.8), (1.4, 2.4, 2.4), p=3.0)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    # an empty scabbard hanging behind the far hip (a medium shape behind the legs)
    rig.secondary("scab", "hips", (-4.0, 9.0, 19.0), (-16.0, 9.5, 5.0), max_deg=10, gain=1.0)
    g = Geo().capsule((-4.0, 9.0, 19.0), (-15.0, 9.5, 6.0), 2.2, 1.8)
    rig.part("scab", g, LEATHER)
    g = Geo().capsule((-14.2, 9.5, 7.0), (-15.6, 9.5, 5.0), 2.3, 2.1)
    g.capsule((-4.4, 9.0, 18.4), (-5.4, 9.1, 17.0), 2.5, 2.5)
    rig.part("scab", g, STEEL, finish="metal", outline=0.6)
    # mail shoulders with a steel rim
    for s, y in (("r", -12.0), ("l", 11.5)):
        g = Geo().blob((0, y, 36.8), (6.6, 5.8, 5.4), p=2.4)
        rig.part(f"arm_{s}", g, MAIL, finish="metal")

    # head: big, moustache, hair; the kettle hat sits on its own joint
    head = Geo().blob((2, 0, 48.5), (11.6, 11.0, 11.4), p=2.3)
    head.blob((14.2, -0.6, 45.6), (3.4, 3.2, 3.2), p=2.0)  # nose
    hair = Geo().blob((-6.0, 0, 46.0), (5.8, 9.8, 6.8), p=2.2)
    hair.blob((1.0, 0, 55.0), (11.8, 11.4, 5.5), p=2.2)     # hair cap (shows when the hat pops off)
    fc = K.face2(rig, [head, hair], SKIN, cx=12.0, cz=48.6, eye_dy=(-4.6, 4.4),
                 eye_r=(3.8, 3.5, 4.4), brow=HAIR, mouth_dz=-7.2, mouth_x=12.6,
                 eye_at=(13.8, 48.8), mark_r=4.1)
    rig.part("head", head, SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    g = Geo()
    for x, z in ((-3.0, 51.0), (-6.5, 49.5), (-1.5, 47.0)):
        g.lathe([(1.8, 0), (0, 3.2)], (x, -10.4, z), (x - 1.6, -11.6, z - 2.0), segs=8)
    rig.part("head", g, HAIR, finish="hair", outline=0.6)
    # bushy moustache (two lobes that curl up at the ends)
    g = Geo().blob((13.2, -3.8, 43.0), (3.4, 4.4, 2.3), p=2.2, rot=(18, 0, -8))
    g.blob((13.2, 2.8, 43.0), (3.4, 4.4, 2.3), p=2.2, rot=(-18, 0, -8))
    g.blob((11.6, -7.4, 44.2), (1.8, 1.8, 1.8), p=2.0)
    rig.part("head", g, HAIR, finish="hair")
    _helm(rig, "helm")
    rig.secondary("plume", "helm", (0.5, 0, 66.5), (-14, 0, 68), max_deg=14, gain=1.2)
    _plume(rig, "plume")
    # the hat that pops off and rolls away in the death (built around its own pivot)
    rig.joint("helm_loose", "root", HELM_C, hidden=True)
    _helm(rig, "helm_loose")
    _plume(rig, "helm_loose")

    # arms: mail sleeves, leather gloves with a thumb
    for s in ("r", "l"):
        B.arm_parts(rig, s, MAIL, hand=LEATHER, cuff=LEATHER, glove_finish="matte")
        y = B.ARM_Y[s]
        g = Geo().blob((2.8, y - 1.4 * (1 if s == "r" else -1), B.HAND_Z + 1.0), (1.6, 1.5, 2.2), p=2.2)
        rig.part(f"hand_{s}", g, LEATHER, outline=0.5)

    _sword(rig, "hand_l", HL)
    rig.track("swordTip", "hand_l", (HL[0], HL[1], HL[2] + 5.6 + BLADE))

    # kite shield on the near hand, modelled upright: team face, steel rim with rivets,
    # a parchment bear paw and a gold boss
    sx, sy, sz = HR[0] + 1.5, HR[1] - 6.5, HR[2] + 1.0
    g = Geo().blob((sx, sy + 1.0, sz), (11.4, 1.6, 14.4), p=3.4, taper=(0.24, 1.0))
    rig.part("hand_r", g, STEEL, finish="metal")
    sh = Geo().blob((sx, sy, sz + 0.5), (9.5, 1.6, 12.3), p=3.4, taper=(0.2, 1.0))
    sface = F.Face(rig, "hand_r", [sh])
    rig.part("hand_r", sh, team=True, outline=0.8)
    g = Geo()
    for dx, dz in ((-9.1, 9.2), (0.0, 13.2), (9.1, 9.2), (-6.0, -2.4), (6.0, -2.4)):
        g.sphere((sx + dx, sy - 1.3, sz + dz), 1.15, cuts=2)
    rig.part("hand_r", g, STEEL, finish="metal", outline=0)
    g = K.paw(sface, Geo(), K.scr(sface, (sx, sy - 1.6, sz + 1.0)), s=1.55)
    rig.part("hand_r", g, PARCH, highlight=False, outline=0)
    g = Geo().blob((sx, sy - 1.8, sz + 9.2), (2.2, 1.5, 2.2), p=2.2)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.8)
    rig.track("_foot", "shin_r", (3.3, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def shield(a, f, w=90.0):
    return B.arm("r", a, f, w, w_rest=90.0)


def sword(a, f, w, yaw=0.0):
    p = B.arm("l", a, f, w, w_rest=90.0)
    if yaw:
        p["arm_l"]["rz"] = yaw
    return p


STANCE = merge(shield(-58, -22, 96), sword(-30, 55, 72), {"torso": {"r": -3}})


def _idle(f):
    # breathing; he ducks a touch behind the shield and peeks (2-3), taps the sword on the
    # rim (4), blinks on 5
    peek = [0.0, 0.3, 1.0, 0.8, 0.1, 0.0][f]
    tap = [0.0, 0.0, 0.0, 0.3, 1.0, 0.2][f]

    def extra(ctx):
        return {"head": {"r": -5 * peek, "z": -1.2 * peek}, "torso": {"r": 3 * peek},
                "arm_r": {"r": 4 * peek}, "hand_r": {"r": 2 * peek},
                "arm_l": {"r": 3 * ctx["lag"] - 10 * tap}, "hand_l": {"r": -4 * ctx["lag"] - 22 * tap},
                "brow": {"z": 0.6 * peek}}
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


def _walk(f):
    # march: stiff knee, high thigh, the shield steady and the sword bobbing a frame late
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"arm_l": {"r": -8 * math.cos(ctx["lag_p"])}, "hand_l": {"r": 5 * lag},
                "arm_r": {"r": 3 * math.cos(ctx["p"])}, "plume": {"r": 2 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=38.0, knee=38.0, lift_lu=7.0, bob_pct=0.06,
                     lean=-4.0, arms=(), twist=4.0, extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS. The sword arm is held level (a = 0) and swung round
# the torso's vertical axis (yaw): 180 points straight back, 90 away, 0 forward.
#          read dip  wind HOLD smear smear IMP  over recoil settle settle
S_YAW = [15, 60, 140, 172, 125, 82, 30, 8, 0, 10, 0]
S_A = [-10, -5, 0, 4, 0, -2, -4, -10, -14, -20, -28]
S_F = [30, 10, 2, 6, 0, -2, -4, -4, 0, 25, 48]
S_W = [60, 30, 8, 12, 4, 6, 8, -4, 4, 45, 68]
T_YAW = [0, 10, 24, 34, 8, -18, -30, -34, -24, -10, -3]
T_R = [-2, 2, 4, 6, -4, -8, -12, -10, -8, -4, -3]
B_X = [0.0, -1.5, -3.0, -4.0, 1.0, 5.0, 7.5, 8.0, 6.5, 3.0, 1.0]
B_Z = [0.0, -2.2, -1.6, -1.2, 0.0, -0.6, -2.4, -1.6, -1.8, -0.6, 0.0]
B_Q = [-0.02, -0.10, -0.04, 0.02, 0.08, 0.04, -0.14, 0.04, -0.06, 0.02, 0.0]
TH_R = [0, -6, -10, -12, 8, 18, 26, 24, 20, 8, 2]
SH_R = [0, 6, 4, 4, -20, -20, -22, -18, -14, -4, 0]
TH_L = [0, 6, 10, 12, -6, -14, -22, -20, -16, -6, -2]
SH_L = [0, -10, -12, -12, -8, -6, -8, -6, -6, -2, 0]
HEAD = [0, 3, 2, 0, -2, -4, -6, -4, -3, -1, 0]
# the shield stays up in front: raised on the coil, shoved forward on the impact
SH_A = [-55, -48, -44, -42, -46, -52, -60, -58, -56, -57, -58]
SH_F = [-18, -6, 0, 2, 4, 10, 16, 12, 6, -12, -20]


def _attack_pose(f):
    pose = merge(sword(S_A[f], S_F[f], S_W[f], yaw=S_YAW[f]), shield(SH_A[f], SH_F[f], 94), {
        "torso": {"r": T_R[f], "rz": T_YAW[f]},
        "head": {"r": HEAD[f], "rz": -0.6 * T_YAW[f]},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
    }, M.body_about((0, 0, 22), x=B_X[f], z=B_Z[f], q=B_Q[f]))
    if f in (4, 5):
        pose["hand_l"]["sz"] = 1.2
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    return pose


SWORD_IN = (HL[0], HL[1], HL[2] + 5.6 + BLADE * 0.45)
SWORD_TIP = (HL[0], HL[1], HL[2] + 5.6 + BLADE)
CLEAVE = {"kind": "arc", "joint": "hand_l", "inner": SWORD_IN, "outer": SWORD_TIP, "color": "#C9D2DC",
          "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}


def _attack_clip():
    ov = {
        4: [dict(CLEAVE, **{"from": 3})],
        5: [dict(CLEAVE, **{"from": 3})],
        6: [dict(CLEAVE, **{"from": 5, "t1": 1.0, "lines": 2}),
            {"kind": "burst", "joint": "hand_l", "point": SWORD_TIP, "r0_lu": 6.0, "r1_lu": 12.0,
             "n": 5, "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 11, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 10 * a}, "torso": {"r": 8 * a},
                "arm_r": {"r": 14 * max(a, 0)}, "hand_r": {"r": -6 * a},   # shield up
                "arm_l": {"r": 18 * a}, "hand_l": {"r": 12 * a},
                "thigh_r": {"r": 8 * max(a, 0)}, "thigh_l": {"r": -6 * max(a, 0)},
                "brow": {"z": 1.2 * max(a, 0)}}
    return K.hit_armoured(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                          face_back=F.expr("grit"))


# D2: the hat pops off on the slam (step 5) and rolls away (x, z offsets from its rest pivot)
HAT = {5: (58.0, -46.0, -95.0), 6: (66.0, -34.0, -170.0), 7: (74.0, -50.0, -265.0),
       8: (79.0, -51.0, -330.0), 9: (81.0, -51.0, -355.0)}


def _die(k):
    stiff = [0.3, 0.6, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    flop = [0, 0, 0, 0, 0, 0.6, 1.0, 0.8, 0.8, 0.8][k]
    pose = merge(STANCE, K.die_d2(k, toe_x=7.0, lie_lift=7.0), {
        "head": {"r": [14, 8, 0, 0, -2, -8, 4, 0, 0, 0][k]},
        "torso": {"r": 4 * (1 - stiff)},
        "arm_l": {"r": 30 * (1 - stiff) + 20 * flop}, "hand_l": {"r": 15 * flop},
        "arm_r": {"r": 10 * (1 - stiff) - 10 * flop},
        "thigh_r": {"r": 6 * (1 - stiff)}, "thigh_l": {"r": -4 * (1 - stiff)},
        "shin_r": {"r": -20 * flop}, "shin_l": {"r": -10 * flop},
    })
    if k in HAT:
        x, z, r = HAT[k]
        pose["helm"] = {"hide": True}
        pose["helm_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "o"), {"brow": {"z": 1.8}})
    elif k <= 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.4}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
