"""Belly Bowman: Bronze Age Rare Anti-heavy, ranged (CONTENT_PLAN 5.2 #7). Range 200, x3 vs armored, ~68 lu.

A viewer expects a man with a gastraphetes (the Greek belly-bow) to brace its crescent rest on
his stomach and lean on it to span the string, then shoulder it and loose a heavy bolt with a
kick, and to waddle under the big bow.

Look: a stout, bearded engineer-soldier with a round belly under a team tunic, a quilted
sandstone belly pad where the rest presses, a conical polished pilos with a verdigris band and a
team tuft, greaves and sandals. The gastraphetes: a long wooden stock with a bronze crescent rest
at the back and a horn-pale composite prod in a bronze housing at the front.

Animation (cartoon kit v2):
  idle    pats his belly pad, blows out his cheeks, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, 81.25 lu/s) with a waddle sway, the
          belly-bow over his shoulder
  attack_b  HIP SHOT: spans it the same way, then braces the stock against his belly and fires from
          the hip in a low wide stance, leaning back (held extreme), the kick rocking him back
  attack  SPAN, SHOULDER, LOOSE: he tips the bow down, sets the rest on his belly and leans his
          whole weight on it (big squash, cheeks puffed) until the string clicks back, lifts and
          shoulders it, squints (held extreme), and the bolt snaps out with a kick that rocks
          him back a step (the bolt leaves `muzzle` on the impact frame)
          A and B hold the aim with a squint wobble while the sim wind-up lasts (holdLoop)
  hit     light: head snaps back, the belly wobbles
  die     D1 fling and spin, the belly-bow tumbles away
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "belly_bowman"
GAIT_NAME = "biped"
NAME = "Belly Bowman"
HEIGHT_LU = 68
CANVAS = (310, 250)
FEET = (138, 216)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 30)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
HELM_C = (1.5, 0, 56.0)


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig)

    # a round belly: team tunic over a pot belly, a quilted belly pad
    g = Geo().blob((0.8, 0, 26.0), (11.6, 10.4, 12.4), p=2.2, taper=(1.12, 0.9))
    rig.part("torso", g, team=True)
    g = Geo().blob((7.6, -2.0, 24.0), (5.2, 7.6, 6.4), p=2.4)
    rig.part("torso", g, B.SAND)
    g = Geo()
    for z in (21.0, 24.0, 27.0):
        g.capsule((12.2, -6.0, z), (12.8, 2.0, z), 0.5)
    rig.part("torso", g, B.SAND_DK, outline=0)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 9.0), max_deg=10, gain=0.9)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT + 3.0)        # hem >= 9 lu above the soles
    g = Geo().blob((0.8, 0, 13.8), (12.4, 11.0, 4.4), p=2.4, taper=(1.12, 0.94))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.8, 0, 10.0), (12.6, 11.2, 1.1), p=3.0)
    rig.part("hem", g, B.LINEN, outline=0.5)
    g = Geo().blob((0.5, 0, 17.4), (12.2, 10.8, 1.7), p=3.2)
    rig.part("torso", g, B.LEATHER_DK, outline=0.6)
    for s, y in (("r", -12.5), ("l", 12.0)):                          # team shoulder caps
        g = Geo().blob((0.4, y, 37.0), (6.4, 5.8, 4.8), p=2.6)
        rig.part(f"arm_{s}", g, team=True)

    beard = Geo()
    for x, y, z, r in ((11.0, -3.6, 41.4, 3.2), (12.4, 0.0, 40.0, 3.4), (11.0, 3.6, 41.4, 3.0),
                       (12.0, -1.6, 37.6, 2.6), (9.6, -6.0, 43.2, 2.6)):
        beard.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[beard], mouth_z=44.6, mouth_w=5.0)
    rig.part("head", beard, B.HAIR, finish="hair")
    rig.joint("cheeks", "head", (12.0, 0, 46.0), hidden=True)          # puffed cheeks (spanning)
    g = Geo()
    for y in (-6.4, 6.0):
        g.blob((10.6, y, 46.4), (3.6, 2.6, 3.0), p=2.2)
    rig.part("cheeks", g, B.SKIN, outline=0.6)
    rig.joint("helm", "head", HELM_C)
    K.pilos(rig, "helm", c=HELM_C)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.4, r1=3.9)
        g = Geo().blob((0, B.ARM_Y[s], B.HAND_Z + 3.4), (4.6, 4.6, 1.9), p=2.6)
        rig.part(f"fore_{s}", g, B.LEATHER, outline=0.7)

    rig.joint("bow", "hand_r", HR)
    muzzle, _ = K.gastraphetes(rig, "bow", HR, length=34.0, prod=15.5)
    rig.track("muzzle", "bow", muzzle)
    rig.joint("bow_loose", "root", (0, 0, 0), hidden=True)
    K.gastraphetes(rig, "bow_loose", (-8.0, -4.0, 0.0), strings=("rest",), length=34.0, prod=15.5)


# -- poses ---------------------------------------------------------------------------------
def hold(a, f, w, lean=0.0, d=13.0):
    return K.two_hand(a, f, w, d, lean=lean, w_rest=0.0)


def string(state):
    return {"bow_s_rest": {"show": state == "rest", "hide": state != "rest"},
            "bow_s_spanned": {"show": state == "spanned", "hide": state != "spanned"}}


STANCE = merge(hold(-62, -12, 8, lean=-2), {"torso": {"r": -2}}, string("rest"))


def _idle(f):
    pat = [0.0, 0.6, 1.0, 0.0, 0.6, 0.0][f]

    def extra(ctx):
        return merge(hold(-62 + 4 * pat, -12 + 8 * pat, 8 + 4 * pat, lean=-2), {
            "body": {"sx": 1.0 + 0.02 * pat}, "cheeks": {"show": f == 3}})
    return M.idle_v2(f, merge(STANCE), frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 80 ms, a waddle ------
RIG = None
SPEED = 81.25
LEGS = B.walk_legs_v3()
GAIT = B.jog_gait(SPEED, LEGS, cycle_ms=640)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(hold(-30 + 3 * lag, 70 + 3 * lag, 150 + 4 * lag, lean=-8, d=11.0), {"helm": {"z": 0.4 * lag}})
    base = {k: v for k, v in STANCE.items() if not k.startswith(("arm_", "fore_", "hand_"))}
    return M.walk_v3(RIG, f, base, GAIT, legs=LEGS, lean=-8.0, twist=5.0, nod=3.0, sway=6.0, extra=extra,
                     report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 11 unique frames: read, tip, SPAN, lift, HOLD (aim), squint wobble (holdLoop partner) | LOOSE, kick,
# lower, hip, settle. Pre-impact 290 of 680 ms (impactAt 0.4265); the hold is 35% of the pre-impact time.
ATK_MS = [30, 40, 60, 40, 102, 18, 120, 60, 50, 70, 90]
ATK_IMPACT = 6
#        read  tip  SPAN  lift HOLD  wobl  LOOSE kick lower  hip  settle
W_A = [-62, -72, -78, -40, -22, -22, -18, -14, -40, -58, -62]
W_F = [-12, -34, -40, 10, 68, 68, 72, 76, 30, -6, -12]
W_W = [8, -62, -70, -12, 4, 6, 14, 22, 0, 6, 8]
A_T = [-2, -14, -28, -6, 4, 4, 10, 12, 2, -2, -2]
A_H = [0, 6, 10, 0, -4, -4, -8, -6, 0, 0, 0]
A_Q = [-0.02, -0.06, -0.18, 0.04, 0.02, 0.0, 0.08, 0.04, 0.0, -0.02, 0.0]
A_X = [0.0, 1.0, 2.0, 0.0, -0.5, -0.5, -3.5, -4.5, -2.5, -0.5, 0.0]
A_Z = [0.0, -1.6, -4.0, 0.6, 0.4, 0.4, 0.8, 0.2, 0.0, 0.0, 0.0]
A_FR = [3.0, 4.0, 5.0, 4.0, 5.0, 5.0, 4.0, 3.0, 3.0, 3.0, 3.0]
A_FL = [-3.0, -4.0, -5.0, -5.0, -6.0, -6.0, -8.0, -9.0, -6.0, -4.0, -3.0]
STRING = ["rest", "rest", "spanned", "spanned", "spanned", "spanned", "rest", "rest", "rest", "rest", "rest"]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(hold(W_A[f], W_F[f], W_W[f], lean=t), {
        "torso": {"r": t}, "head": {"r": A_H[f]},
        "bow_bolt": {"show": 3 <= f <= 5},
        "cheeks": {"show": f in (2, 3)},
    }, string(STRING[f]), M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f])
    if f == 2:
        pose = merge(pose, F.expr("squeeze", "grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.2}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.0}})
    return pose


def _attack_clip():
    ov = {
        2: [{"kind": "burst", "joint": "torso", "point": (14.0, -6.0, 24.0), "r0_lu": 3.0, "r1_lu": 7.0,
             "n": 3, "a0": -30.0, "arc": 60.0}],
        6: [{"kind": "burst", "joint": "bow", "point": (HR[0] + 40.0, HR[1] - 4.0, HR[2] + 3.2),
             "r0_lu": 4.0, "r1_lu": 10.0, "n": 5, "a0": -60.0, "arc": 120.0},
            {"kind": "rings", "joint": "bow", "point": (HR[0] + 31.0, HR[1] - 2.2, HR[2] + 2.0),
             "radii_lu": (6.0, 10.0), "a0": -60.0, "a1": 60.0},
            {"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 4, "spread": 0.7,
             "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  extra={"holdStep": 4, "holdLoop": [4, 5]})


# -- attack B: hip shot, braced on the belly in a low wide stance -------------------------------------
# 0-2 = A read, tip and SPAN, 3 lift to the hip, 4 HOLD (a low wide stance, leaning back, the stock
# braced against the belly pad and the bow level at the waist), 5 wobble, 6 LOOSE (the kick rocks him
# back), 7 kick, 8-10 = A's
#      lift HOLD wobl LOOSE kick
B_A = [-60, -70, -70, -68, -64]
B_F = [-10, -6, -6, -2, 2]
B_W = [-6, 0, 2, 10, 16]
B_T = [-4, 12, 12, 18, 20]
B_H = [2, -2, -2, -6, -4]
B_Q = [0.0, -0.08, -0.06, 0.06, 0.02]
B_X = [0.0, -1.0, -1.0, -4.0, -5.0]
B_Z = [-1.0, -4.5, -4.8, -3.6, -3.0]
B_FR = [5.0, 9.0, 9.0, 8.0, 7.0]
B_FL = [-6.0, -9.0, -9.0, -11.0, -11.0]


def _b_pose(i):
    if i <= 2 or i >= 8:
        return _attack_pose(i)
    k = i - 3
    t = B_T[k]
    pose = merge(hold(B_A[k], B_F[k], B_W[k], lean=t, d=11.0), {
        "torso": {"r": t}, "head": {"r": B_H[k]},
        "bow_bolt": {"show": i <= 5}, "cheeks": {"show": False},
    }, string("spanned" if i <= 5 else "rest"), M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k])
    if i in (4, 5):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.2}})
    elif i in (6, 7):
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.0}})
    return pose


def _attack_b():
    ov = {
        6: [{"kind": "burst", "joint": "bow", "point": (HR[0] + 40.0, HR[1] - 4.0, HR[2] + 3.2),
             "r0_lu": 4.0, "r1_lu": 10.0, "n": 5, "a0": -60.0, "arc": 120.0},
            {"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 14, "spread": 0.8,
             "dir": -1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 2: ("attack", 2), 8: ("attack", 8), 9: ("attack", 9),
             10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 4, "holdLoop": [4, 5]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 14 * a}, "torso": {"r": 10 * a}, "body": {"sx": 1.0 + 0.04 * max(a, 0)},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -22 * max(a, 0)},
                "arm_r": {"r": 12 * a}, "arm_l": {"r": 18 * a},
                "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"))


LOOSE = [None, (6, 0, 50, 30), (10, 0, 70, 120), (14, 0, 76, 230), (18, 0, 64, 330),
         (22, 0, 40, 420), (25, 0, 16, 470), (27, 0, 12, 480), (28, 0, 12, 480), (28, 0, 12, 480)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=12.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if LOOSE[k] is not None:
        x, y, z, r = LOOSE[k]
        pose["bow"] = dict(pose.get("bow", {}), hide=True)
        pose["bow_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
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
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
