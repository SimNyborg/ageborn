"""Grenadier: Gunpowder Age anti-armor (DESIGN A5.4). Lobbed bomb (proj.lob), splash, ~74 lu.

Look (A11, Gunpowder palette): a burly grenadier with a big waxed handlebar moustache, a tall
mitre cap (a team front plate with a cream anchor and a brass rim, a black back, a cream tuft),
a team coat with cream cuffs, a cream crossbelt, brass buttons, a leather bomb bag with a brass
flap badge on the near hip, cream breeches and black gaiters. He holds an oversized black iron
bomb with a brass fuse cap in the near hand and a smouldering match cord in the far hand, so
'explosive' reads at 56 px.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    blows on the match cord (it glows brighter, a wisp of smoke), weight shift, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1) with a waddle (side sway): the bomb
          tucked against his belly, the match arm pumping, planted feet, the coat tails late
  attack_b  UNDERHAND BOWL: lights the fuse as in A, then crouches low with the bomb swung back
          behind his hip (the held extreme, a low silhouette against A's high pitcher wind-up),
          the fuse fizzing while the aim holds, and bowls it underhand on a low arc, one leg up
  attack  LIGHT THE FUSE AND BIG LOB: brings the bomb up and touches the match to the fuse (a
          spark burst), grins at the fizzing fuse, then rears back with the bomb cocked behind
          his head and the front knee up (the held extreme), whips it over (a smear) and lobs
          it high (the bomb leaves `muzzle` on the release frame), follows through, then ducks
          and covers his ears with his eyes squeezed shut, and pulls a new bomb from the bag
  hit     light: head snaps back, the mitre cap lifts, eyes squeezed
  die     D1 fling and spin: spins back, the mitre cap pops off, lands on his back, X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as GT  # noqa: F401
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "grenadier"
GAIT_NAME = "biped"
NAME = "Grenadier"
HEIGHT_LU = 76
CANVAS = (276, 262)
FEET = (122, 232)
ANCHORS = {"head": (2, 74), "hitCenter": (0, 34), "muzzle": (18, 46)}
NO_RETIME = True

HAIR = "#5C4A3E"
BOMB = "#34363C"
SHOE = "#2F2B2B"
CORD = "#8A7456"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)
BOMB_C = (HR[0] + 2.0, HR[1] - 2.0, HR[2] + 6.8)   # bomb centre, held in the near fist
BOMB_R = 7.8
CAP_C = (1.0, 0.0, 57.0)


def _cap(rig, joint):
    g = Geo().blob((0.0, 0, 61.0), (9.8, 10.4, 9.4), p=2.4, taper=(1.0, 0.55))
    g.clip((0, 0, 56.2), (0, 0, -1))
    rig.part(joint, g, B.BLACK)
    plate = Geo().slab([(-2.0, 56.0), (13.2, 56.0), (12.0, 64.0), (8.6, 71.0), (3.6, 76.4), (-0.6, 76.6),
                        (-2.0, 72.0)], 0.0, 17.4, rot=(0, -10, 0), origin=(5, 0, 56))
    pf = F.Face(rig, joint, [plate])
    rig.part(joint, plate, team=True)
    g = G.anchor(pf, Geo(), K.scr(pf, (11.0, -8.7, 63.5)), s=0.95)
    rig.part(joint, g, B.CREAM, highlight=False, outline=0)
    g = Geo().capsule((-1.0, -8.9, 56.6), (13.4, -8.9, 56.6), 1.3).capsule((13.4, -8.9, 56.6), (13.4, 8.6, 56.6), 1.3)
    rig.part(joint, g, B.CREAM, outline=0.6)
    g = Geo().sphere((0.6, 0, 77.0), 2.8, cuts=3)   # tuft
    rig.part(joint, g, B.CREAM, finish="hair", outline=0.6)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    G.legs_v3(rig, B.CREAM, SHOE, stocking=B.BLACK, thigh_r=5.0)

    # torso: broad team coat, cream crossbelt, brass buttons, leather belt
    g = Geo().blob((0, 0, 28.0), (12.0, 11.0, 12.2), p=2.4, taper=(1.1, 0.96))
    g.blob((0, 0, 18.0), (11.4, 10.6, 5.0), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((5.4, -1.0, 26.5), (7.2, 5.2, 10.4), p=2.6, taper=(1.08, 0.72))
    g.clip((8.2, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM)            # waistcoat front
    g = Geo().blob((0.4, 0, 17.4), (12.0, 11.0, 2.2), p=3.0)
    rig.part("torso", g, B.LEATHER)          # belt
    g = Geo().blob((12.2, -2.6, 17.4), (1.4, 2.4, 2.0), p=2.4)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().capsule((0.5, 10.4, 38.0), (11.8, 0.0, 27.0), 2.2).capsule((11.8, 0.0, 27.0), (4.0, -11.4, 17.5), 2.2)
    rig.part("torso", g, B.CREAM, outline=0.8)
    g = Geo()
    for z in (33.0, 28.5, 24.0):
        g.sphere((12.6, -4.4, z), 1.2, cuts=3)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob((1.2, 0, 37.6), (7.2, 7.6, 2.4), p=2.4)
    rig.part("torso", g, B.BLACK)
    # the bomb bag on the near hip: leather satchel, a flap with a brass badge
    g = Geo().blob((1.0, -12.4, 19.4), (5.6, 3.4, 4.8), p=3.0, taper=(1.0, 0.9))
    rig.part("hips", g, B.LEATHER)
    g = Geo().blob((1.2, -14.2, 22.0), (5.8, 1.8, 2.8), p=3.0)
    rig.part("hips", g, "#5E4A3C")
    g = Geo().blob((1.6, -15.8, 21.0), (1.8, 0.9, 1.8), p=2.4)
    rig.part("hips", g, B.BRASS, finish="metal", outline=0.5)
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.5, 0, 6.0), max_deg=16, gain=1.1)
    rig.rest_offset["tails"] = (0, 0, K.V3_LIFT + 4.5)
    g = Geo().blob((-6.0, 0, 11.5), (5.2, 10.2, 7.8), p=2.6, taper=(0.7, 1.0), rot=(0, 10, 0))
    rig.part("tails", g, team=True)
    g = Geo().blob((-7.2, 0, 5.2), (3.8, 10.8, 2.2), p=2.6, rot=(0, 10, 0))
    rig.part("tails", g, B.CREAM)

    # head: face kit, a big waxed handlebar moustache, sideburns, the mitre cap
    head = G.head_geos(center=(2, 0, 49.0), nose=(14.0, -0.6, 47.2), nose_r=(3.8, 3.2, 3.6))
    hair = Geo().blob((-5.0, 0, 47.5), (5.8, 10.4, 6.4), p=2.2)
    hair.blob((4.0, -10.0, 45.0), (3.6, 2.2, 5.0), p=2.2)       # sideburn
    K.face2(rig, [head, hair], B.SKIN, cx=12.2, cz=50.0, eye_dy=(-4.6, 4.4),
            eye_r=(3.8, 3.5, 4.4), brow=HAIR, mouth_dz=-8.6, mouth_x=12.8,
            eye_at=(14.0, 50.2), mark_r=4.1)
    rig.part("head", head, B.SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    g = Geo().blob((13.8, -4.0, 44.0), (2.8, 4.6, 2.0), p=2.2, rot=(22, 0, 0))
    g.blob((13.8, 3.0, 44.0), (2.8, 4.6, 2.0), p=2.2, rot=(-22, 0, 0))
    g.capsule((13.0, -8.0, 44.6), (12.4, -10.6, 48.2), 1.6, 0.9)           # waxed curl
    g.capsule((12.4, -10.6, 48.2), (11.0, -9.8, 50.0), 0.9, 0.6)
    rig.part("head", g, HAIR, finish="hair")
    rig.joint("cap", "head", CAP_C)
    _cap(rig, "cap")
    rig.joint("cap_loose", "root", CAP_C, hidden=True)
    _cap(rig, "cap_loose")

    # arms: team sleeves, cream cuffs, gloves with thumbs
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM, r0=4.7, r1=4.2, fist=4.6)
        y = B.ARM_Y[s]
        g = Geo().blob((2.8, y - 1.4 * (1 if s == "r" else -1), B.HAND_Z + 1.0), (1.6, 1.5, 2.2), p=2.2)
        rig.part(f"hand_{s}", g, B.SKIN, outline=0.5)
    for s, y in (("r", -12.8), ("l", 12.2)):
        g = Geo().blob((0, y, 37.0), (6.2, 5.4, 4.8), p=2.4)
        rig.part(f"arm_{s}", g, team=True)

    # the bomb on its own joint in the near hand, a brass fuse cap and a sparking fuse
    rig.joint("bomb", "hand_r", BOMB_C)
    bx, by, bz = BOMB_C
    g = Geo().sphere(BOMB_C, BOMB_R, cuts=6)
    rig.part("bomb", g, BOMB, finish="gloss", outline_hex="#50535A")
    g = Geo().blob((bx - 3.0, by - 5.4, bz + 3.4), (1.8, 1.0, 1.6), p=2.2)   # a highlight glint
    rig.part("bomb", g, "#F4F4F0", highlight=False, outline=0)
    g = Geo().lathe([(0, 0), (2.6, 0), (2.6, 1.9), (1.7, 2.8), (0, 2.8)], (bx + 3.2, by, bz + 6.4),
                    (bx + 4.7, by, bz + 9.4), segs=12)
    rig.part("bomb", g, B.BRASS, finish="metal", outline=0.6)
    g = Geo().capsule((bx + 4.5, by, bz + 9.2), (bx + 6.8, by, bz + 12.4), 0.9)
    rig.part("bomb", g, B.TAN, outline=0.5)
    rig.joint("spark", "bomb", (bx + 7.0, by, bz + 12.8))
    g = Geo().star((bx + 7.0, by - 1.2, bz + 13.0), 4.0, 1.5, 1.0, points=6)
    rig.part("spark", g, glow=B.FIRE, outline=0)
    g = Geo().sphere((bx + 7.0, by - 1.8, bz + 13.0), 1.5, cuts=3)
    rig.part("spark", g, glow="#FFFFFF", outline=0)
    rig.track("muzzle", "bomb", BOMB_C)

    # the match cord in the far hand: a coiled cord with a glowing, smoking tip
    lx, ly, lz = HL
    g = Geo().lathe([(3.4, -1.2), (3.9, 0), (3.4, 1.2), (2.4, 1.2), (2.0, 0), (2.4, -1.2)],
                    (lx + 0.4, ly - 1.0, lz - 4.6), (lx + 0.4, ly - 3.0, lz - 4.6), segs=14)
    g.capsule((lx + 0.6, ly - 1.4, lz + 2.0), (lx + 3.4, ly - 1.4, lz + 9.0), 1.0)
    rig.part("hand_l", g, CORD, finish="hair", outline=0.5)
    rig.joint("match", "hand_l", (lx + 3.6, ly - 1.4, lz + 9.6))
    g = Geo().sphere((lx + 3.6, ly - 2.2, lz + 9.6), 1.8, cuts=3)
    rig.part("match", g, glow="#FFB870", outline=0.6, outline_hex=B.FIRE)
    rig.joint("wisp", "match", (lx + 3.6, ly - 1.4, lz + 13.0), hidden=True)
    g = Geo().sphere((lx + 4.6, ly - 2.0, lz + 14.0), 1.8, cuts=3).sphere((lx + 3.2, ly - 2.0, lz + 17.0), 1.5, cuts=3)
    rig.part("wisp", g, B.SMOKE, finish="dust", outline=0.5)


# -- poses ---------------------------------------------------------------------------------
def bomb_arm(a, f, w=80.0):
    """The bomb sits on top of the fist: `w` keeps the fist's rest-up direction pointing
    `w` degrees (90 = straight up)."""
    return B.arm("r", a, f, w, w_rest=90.0)


def match_arm(a, f, w=80.0):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(bomb_arm(-44, 12, 84), match_arm(-70, -20, 70), {"torso": {"r": -2}})
SH = (0.0, B.SHOULDER_Z)


def _idle(f):
    # breathing; he lifts the match cord and blows on it (2-3: it glows, a wisp rises), blink
    blow = [0.0, 0.4, 1.0, 1.0, 0.3, 0.0][f]

    def extra(ctx):
        return merge(match_arm(-70 + 45 * blow, -20 + 95 * blow, 70 + 10 * blow), {
            "arm_r": {"r": 3 * ctx["lag"]}, "fore_r": {"r": -3 * ctx["lag"]},
            "head": {"r": -3 * blow}, "match": {"s": 1.0 + 0.4 * blow},
            "wisp": {"show": blow > 0.5, "z": 2.0 * blow},
            "spark": {"s": [1.0, 0.7, 1.15, 0.85, 1.1, 0.8][f], "r": 25 * f}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l", "hand_l")}
    pose = M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)
    if blow > 0.5:
        pose = merge(pose, F.expr("o"))
    return pose


# -- walk v3: G1 bounce jog at ground speed (card 68 x 1.25 = 85 lu/s), 8 x 82 ms ----------------
SPEED = 85.0
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=656, stance=0.36)
# walk carry: the bomb tucked against his belly like a ball (not the chest-high guard)
CARRY = merge(bomb_arm(-96, -22, 96), {"torso": {"r": -2}})


def _walk(f, report=None):
    # waddle: side sway, the bomb bobbing late at his hip, the match arm pumping
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"fore_r": {"r": 4 * lag}, "arm_r": {"r": 3 * lag}, "tails": {"r": 5 * lag},
                "spark": {"s": [1.0, 0.7, 1.15, 0.85][ctx["f"] % 4], "r": 25 * ctx["f"]}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-7.0, twist=5.0, nod=3.0, sway=8.0,
                     arms={"l": K.ArmChain("l")}, arm=34.0, extra=extra, report=report)


# attack: 749 ms, the release (impact) at 375 ms (impactAt 0.5007, as shipped); 11 unique frames
#            light spark grin HOLD whip | RELEASE follow ears ears bag new
ATTACK_MS = [40, 55, 60, 150, 70, 90, 70, 80, 60, 44, 30]
ATTACK_IMPACT = 5
# the shipped clip with a fuse-fizz partner frame after the hold (ANIM_SPEC R5 hold loop, 2.4x);
# the pre-impact steps are re-split, durationMs (749) and impactAt (0.5007) stay
ATTACK_MS2 = [40, 45, 50, 140, 30, 70, 90, 70, 80, 60, 44, 30]
ATTACK_IMPACT2 = 6
# bomb arm (upper, fore, fist-up direction), WORLD degrees (the torso lean is subtracted)
BA = [(-20, 45, 80), (0, 75, 80), (20, 95, 100), (118, 150, 205), (100, 70, 120),
      (48, 52, 60), (-35, -50, 0), None, None, (-95, -120, -60), (-30, 40, 80)]
# match arm: to the fuse (0-2), pointing at the target on the wind-up, then down
MA = [(-10, 55, 70), (5, 70, 70), (-40, 10, 60), (8, 20, 30), (-40, -30, 40),
      (-80, -60, 60), (-85, -45, 70), None, None, (-70, -20, 70), (-70, -20, 70)]
T_R = [-2, -4, 2, 16, 2, -18, -20, -8, -6, -6, -3]
T_YAW = [0, -4, 0, 24, 10, -12, -16, 0, 0, 6, 0]
HEAD = [-4, -8, -4, -8, -6, -6, -4, 8, 6, 0, 0]
B_X = [0.0, 0.5, 0.0, -4.0, 0.5, 5.0, 6.0, 1.0, 0.5, 0.0, 0.0]
B_Z = [0.0, 0.0, 0.5, 1.0, -0.5, -2.2, -2.6, -4.0, -3.0, -1.0, 0.0]
B_Q = [0.0, -0.03, 0.03, 0.06, 0.08, -0.1, -0.08, -0.12, -0.06, 0.0, 0.0]
TH_R = [0, 0, 4, 40, 18, 24, 22, 10, 8, 4, 0]     # front knee lifts on the wind-up (a pitcher)
SH_R = [0, 0, -4, -60, -30, -12, -10, -12, -8, -2, 0]
TH_L = [0, 0, -4, -10, -14, -24, -22, -10, -8, -4, 0]
SH_L = [0, 0, -2, -6, -8, -6, -4, -12, -8, -2, 0]
EARS = (4.0, 50.0)   # both hands to the ears (torso space)


def _attack_pose(f):
    t = T_R[f]
    if BA[f] is None:
        a, fo = B.ik2(SH, (EARS[0] + 1.0, EARS[1]), elbow_down=False)
        arms = merge(bomb_arm(a, fo, 80), match_arm(*B.ik2(SH, EARS, elbow_down=False), 80))
    else:
        a, fo, w = BA[f]
        ma, mf, mw = MA[f]
        arms = merge(bomb_arm(a - t, fo - t, w - t), match_arm(ma - t, mf - t, mw - t))
    pose = merge(arms, {
        "torso": {"r": t, "rz": T_YAW[f]},
        "head": {"r": HEAD[f] - 0.4 * t, "rz": -0.5 * T_YAW[f]},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
        "bomb": {"hide": f in (5, 6, 7, 8, 9)},
        "spark": {"s": [0.4, 1.8, 1.4, 1.5, 1.6, 1, 1, 1, 1, 1, 0.5][f], "r": 30 * f},
        "match": {"s": [1.2, 1.5, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][f]},
    }, M.body_about((0, 0, 22), x=B_X[f], z=B_Z[f], q=B_Q[f]))
    if f == 4:
        pose["bomb"]["sx"] = 1.2
    if f in (0, 1, 2):
        pose = merge(pose, F.expr("grit") if f == 2 else F.expr("o"), {"brow": {"z": 0.8 if f == 2 else 1.4}})
    elif f == 3:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    elif f in (7, 8):
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -0.6}})
    return pose


BOMB_TOP = (BOMB_C[0], BOMB_C[1], BOMB_C[2] + BOMB_R)


def _fizz(pose):
    """The hold's partner frame: the fuse flares, the bomb bobs and the body settles a little."""
    return merge(pose, {"spark": {"s": 1.45, "r": 40}, "hand_r": {"r": 5}, "body": {"z": -0.6},
                        "head": {"r": 2}})


SPARK_FIZZ = {"kind": "burst", "joint": "bomb", "point": (BOMB_C[0] + 7.0, BOMB_C[1], BOMB_C[2] + 13.0),
              "r0_lu": 3.0, "r1_lu": 6.5, "n": 6, "color": "#FFE7B0"}


def _attack_clip():
    ov = {
        1: [{"kind": "burst", "joint": "bomb", "point": (BOMB_C[0] + 7.0, BOMB_C[1], BOMB_C[2] + 13.0),
             "r0_lu": 4.0, "r1_lu": 8.5, "n": 7, "color": "#FFE7B0"}],
        4: [SPARK_FIZZ],
        5: [{"kind": "arc", "joint": "hand_r", "inner": (HR[0], HR[1], HR[2] + 2.0), "outer": BOMB_TOP,
             "color": "#6A6E78", "taper": 0.3, "white": 0.45, "t0": 0.0, "t1": 1.0, "lines": 3,
             "samples": 16, "from": 3}],
        6: [{"kind": "dust", "ground": (12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 41, "spread": 0.8}],
    }
    poses = [_attack_pose(f) for f in range(4)] + [_fizz(_attack_pose(3))] + [_attack_pose(f) for f in range(4, 11)]
    return M.clip("attack", poses, ATTACK_MS2, impact=ATTACK_IMPACT2, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: underhand bowl (ANIM_SPEC appendix B) ---------------------------------------------
# unique frames: 0-2 = A (light the fuse, spark, grin), 3 HOLD (crouched low, the bomb swung back
# behind his hip, the match arm pointing at the target), 4 fuse fizz, 5 swing (a low smear), 6
# RELEASE (arm swung through forward and up, the back leg kicking up), 7 follow-through, 8-11 = A
# (duck, ears, bag, new bomb). Same steps as A.
#        HOLD             fizz              swing           RELEASE         follow
BB = [(-150, -165, -100), (-148, -162, -98), (-95, -80, -10), (-20, 5, 60), (25, 45, 80)]
BM = [(-20, -10, 60), (-20, -10, 60), (-60, -40, 60), (-100, -80, 70), (-110, -95, 70)]
BTR = [-22, -22, -14, -6, 0]
BYW = [20, 20, 6, -10, -12]
BBX = [-2.0, -2.0, 2.0, 6.0, 6.5]
BBZ = [-7.0, -7.4, -5.0, -1.0, 0.0]
BBQ = [-0.1, -0.11, 0.04, -0.06, 0.03]
BFT = [((8.0, 0, 0), (-9.0, 0, -8)), ((8.0, 0, 0), (-9.0, 0, -8)), ((10.0, 0, 0), (-8.0, 0, -14)),
       ((12.0, 0, 0), (-8.0, 6.0, -40)), ((12.0, 0, 0), (-6.0, 9.0, -50))]


def _b_pose(k):
    t = BTR[k]
    a, fo, w = BB[k]
    ma, mf, mw = BM[k]
    pose = merge(bomb_arm(a - t, fo - t, w - t), match_arm(ma - t, mf - t, mw - t), {
        "torso": {"r": t, "rz": BYW[k]},
        "head": {"r": -0.6 * t - 4, "rz": -0.5 * BYW[k]},
        "bomb": {"hide": k >= 3},
        "spark": {"s": [1.5, 1.9, 1.3, 1, 1][k], "r": 30 * k + 20},
    }, M.body_about((0, 0, 22), x=BBX[k], z=BBZ[k], q=BBQ[k]))
    r, l = BFT[k]
    pose = G.plant(RIG, pose, LEGS, r=r, l=l, max_drop=5.0)
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _attack_b():
    ov = {
        1: [{"kind": "burst", "joint": "bomb", "point": (BOMB_C[0] + 7.0, BOMB_C[1], BOMB_C[2] + 13.0),
             "r0_lu": 4.0, "r1_lu": 8.5, "n": 7, "color": "#FFE7B0"}],
        4: [SPARK_FIZZ],
        5: [{"kind": "arc", "joint": "hand_r", "inner": (HR[0], HR[1], HR[2] + 2.0), "outer": BOMB_TOP,
             "color": "#6A6E78", "taper": 0.3, "white": 0.45, "t0": 0.0, "t1": 1.0, "lines": 3,
             "samples": 16, "from": 3}],
        6: [{"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 42, "spread": 0.8}],
    }
    poses = [_attack_pose(f) for f in range(3)] + [_b_pose(k) for k in range(5)] + \
        [_attack_pose(f) for f in range(7, 11)]
    reuse = {0: ("attack", 0), 1: ("attack", 1), 2: ("attack", 2), 8: ("attack", 8), 9: ("attack", 9),
             10: ("attack", 10), 11: ("attack", 11)}
    return M.clip("attack_b", poses, ATTACK_MS2, impact=ATTACK_IMPACT2, overlays=ov, reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "arm_l": {"r": 30 * a}, "fore_l": {"r": 20 * a},
                "cap": {"z": 3.0 * max(a, 0), "r": 8 * a},
                "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


CAP_PATH = {1: (3.0, 8.0, 30.0), 2: (8.0, 16.0, 110.0), 3: (14.0, 19.0, 200.0), 4: (20.0, 14.0, 280.0),
            5: (25.0, 0.0, 330.0), 6: (29.0, -24.0, 355.0), 7: (32.0, -48.0, 372.0), 8: (33.0, -50.0, 366.0),
            9: (33.0, -50.0, 366.0)}


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=29.0, lie_z=12.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
        "spark": {"hide": k > 0},
    })
    if k in CAP_PATH:
        x, z, r = CAP_PATH[k]
        pose["cap"] = {"hide": True}
        pose["cap_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 7, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 7, 7, 8], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=749, attack_impact_at=0.5007))
