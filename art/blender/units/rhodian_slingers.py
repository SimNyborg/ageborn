"""Rhodian Slingers: Bronze Age Common Ranged Trio (CONTENT_PLAN 5.2 #3). One card trains three, ~66 lu.

One sheet for the three squad members; the runtime plays them desynchronised.

A viewer expects a slinger to loop the sling and let fly. Pebbler whirls overhead; a Rhodian
loops it once beside the body in a full-arm windmill at the hip and releases underhand, upward.

Look: a lean young islander under a wide straw petasos with a team ribbon, a team exomis tunic
with a linen hem, a leather satchel of lead shot at the hip on a strap, bare legs in laced
sandals. The sling hangs from the near fist: two thin cords and a leather pouch with a grey
lead glans in it.

Animation (cartoon kit v2):
  idle    swings the empty-handed sling gently like a pendulum, weight shift, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, 81.25 lu/s): the sling coiled up in the
          near fist at the chest, the pouch dangling, the far arm pumping, the satchel bouncing
  attack_b  OVERHAND WHIP: no loop; the arm cocks high behind the head with the pouch hanging down
          his back (held extreme), then whips over the top and lets fly at shoulder height
  attack  WINDMILL LOOP: the arm comes forward and up, over and far back (held extreme: arm
          straight back, the pouch trailing behind him, body coiled), then whips down past the
          hip (ring smear) and releases forward-up (the shot leaves the pouch on the impact
          frame); the cord flicks up empty, then he loads a new glans from the satchel
          A and B hold their cocked pose with a small jiggle while the sim wind-up lasts (holdLoop)
  hit     light: the hat lifts off his head and drops back
  die     D1 fling and spin, the petasos sails away
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "rhodian_slingers"
GAIT_NAME = "biped"
NAME = "Rhodian Slingers"
HEIGHT_LU = 66
CANVAS = (300, 250)
FEET = (138, 216)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 31)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
HAT_C = (1.0, 0, 57.0)


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig, greaves=False)
    K.tunic(rig, team=True)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT + 1.0)        # hem >= 9 lu above the soles
    # satchel of lead shot on the near hip, strap over the far shoulder
    rig.secondary("satchel", "hips", (5.0, -11.0, 17.0), (5.0, -11.5, 9.0), max_deg=12, gain=1.1)
    rig.rest_offset["satchel"] = (0, 0, B.V3_LIFT + 2.5)    # its bottom >= 9 lu above the soles
    g = Geo().blob((5.5, -11.6, 12.4), (5.2, 2.8, 4.4), p=2.6)
    rig.part("satchel", g, B.LEATHER)
    g = Geo().blob((5.5, -13.2, 14.4), (5.6, 1.8, 2.8), p=2.6)              # team flap
    rig.part("satchel", g, team=True, outline=0.5)
    g = Geo().capsule((8.0, -8.5, 20.0), (-7.0, 7.5, 37.5), 1.2)
    rig.part("torso", g, B.LEATHER_DK, outline=0.5)

    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.9, 3.5, 4.6), brow_tilt=0.6, mouth_z=43.8)
    K.curly_hair(rig, z=-2.0)
    rig.joint("hat", "head", HAT_C)
    K.petasos(rig, "hat", c=HAT_C, team_brim=True, band=B.VERD_DK)
    rig.joint("hat_loose", "root", HAT_C, hidden=True)
    K.petasos(rig, "hat_loose", c=HAT_C, team_brim=True, band=B.VERD_DK)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=3.9, r1=3.5)
    g = Geo().blob((0.3, B.ARM_Y["l"], 33.0), (4.5, 4.3, 1.4), p=2.8)
    rig.part("arm_l", g, B.VERD, finish="metal", outline=0.5)

    rig.joint("sling", "hand_r", HR)
    pouch = K.sling(rig, "sling", HR, cord=13.0)
    rig.track("muzzle", "sling", pouch)


# -- poses ---------------------------------------------------------------------------------
def swing(a, f, w):
    return B.arm("r", a, f, w, w_rest=-90.0)


def other(a, f):
    return B.arm("l", a, f)


STANCE = merge(swing(-78, -70, -96), other(-60, -30), {"torso": {"r": -2}})


def _idle(f):
    sw = [0.0, 0.7, 1.0, 0.4, -0.5, -0.6][f]

    def extra(ctx):
        return merge(swing(-78 + 4 * sw, -70 + 6 * sw, -96 + 22 * sw), {
            "arm_l": {"r": 3 * ctx["lag"]}, "head": {"r": 1.5 * sw}})
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


# -- walk v3: G1 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 77 ms ----------
RIG = None
SPEED = 81.25
LEGS = B.walk_legs_v3()
GAIT = B.jog_gait(SPEED, LEGS)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = math.cos(ctx["lag_p"])                   # +1 = the far arm forward
        return merge(swing(-30 + 6 * c, 70 + 6 * c, -90 + 14 * lag),
                     other(-90 + 34 * c, -90 + 34 * c + 70 + 15 * c),
                     {"hat": {"z": 0.4 * lag}})
    base = {k: v for k, v in STANCE.items() if not k.startswith(("arm_", "fore_", "hand_"))}
    return M.walk_v3(RIG, f, base, GAIT, legs=LEGS, lean=-10.0, twist=6.0, nod=3.0, extra=extra, report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 12 steps: read, fwd, up, HOLD, jiggle (holdLoop partner), smear, lead | RELEASE, flick, recoil, load,
# settle. Pre-impact 290 of 680 ms (impactAt 0.4265); the hold is 35% of the pre-impact time.
ATK_MS = [30, 40, 40, 102, 30, 30, 18, 120, 60, 50, 70, 90]
ATK_IMPACT = 7
# WORLD angles of the near arm, forearm and sling; the numbers keep increasing through the windmill
# so springs and smears go the right way.
#        read  fwd   up   HOLD jigl smear lead  REL  flick recoil load  settle
S_A = [-78, 0, 90, 172, 168, 250, 285, 312, 335, 300, 260, 282]
S_F = [-70, 12, 98, 178, 176, 256, 292, 322, 352, 290, 300, 290]
S_W = [-96, -30, 60, 200, 192, 300, 345, 380, 420, 330, 260, 264]
O_A = [-60, -40, -10, 20, 24, -30, -60, -80, -85, -70, -55, -60]
O_F = [-30, -20, 10, 40, 44, -20, -60, -90, -95, -60, -40, -30]
A_T = [-2, -4, 4, 14, 13, 4, -10, -18, -20, -10, -12, -4]
A_H = [0, -2, -4, -8, -7, 0, 6, 8, 10, 4, 6, 0]
A_Q = [-0.02, 0.02, 0.05, 0.09, 0.07, 0.0, -0.04, -0.12, -0.08, -0.02, -0.04, 0.0]
A_X = [0.0, 0.5, -1.0, -4.5, -4.2, -1.0, 2.5, 6.0, 7.0, 4.5, 2.0, 0.5]
A_Z = [0.0, 0.6, 1.2, 1.6, 1.2, -0.6, -1.0, -2.0, -1.6, -0.6, -1.0, 0.0]
A_FR = [2.0, 2.5, 2.0, 1.0, 1.0, 4.0, 8.0, 12.0, 12.5, 9.0, 5.0, 2.5]
A_FL = [-2.0, -2.5, -4.0, -6.0, -6.0, -5.0, -4.0, -3.0, -3.0, -2.5, -2.0, -2.0]
A_LR = [0, 0, 0, 0, 0, 2.0, 1.5, 0, 0, 0, 0, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(swing(S_A[f] - t, S_F[f] - t, S_W[f] - t), other(O_A[f] - t, O_F[f] - t), {
        "torso": {"r": t}, "head": {"r": A_H[f]},
        "pouch_stone": {"hide": f in (7, 8, 9)},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f], lr=A_LR[f])
    if f in (3, 4, 5, 6):
        pose.setdefault("sling", {})["sz"] = 1.15
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (5, 6, 7, 8):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    elif f == 10:
        pose = merge(pose, {"pupils": {"x": -0.4, "z": -0.6}})
    return pose


POUCH = (HR[0], HR[1] - 1.2, HR[2] - 13.0)
FIST = (HR[0], HR[1] - 1.2, HR[2] - 2.0)


def _attack_clip():
    ring = {"kind": "arc", "joint": "sling", "inner": FIST, "outer": POUCH, "color": B.SAND_LT,
            "white": 0.35, "taper": 0.15, "lines": 3, "band": 0.38}
    ov = {
        5: [dict(ring, **{"from": 4, "t1": 0.95})],
        6: [dict(ring, **{"from": 5, "t0": 0.2, "t1": 0.95})],
        7: [{"kind": "burst", "joint": "sling", "point": POUCH, "r0_lu": 3.0, "r1_lu": 8.0, "n": 4,
             "a0": -10.0, "arc": 80.0},
            {"kind": "dust", "ground": (10.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 3, "spread": 0.7}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(12)], ATK_MS, impact=ATK_IMPACT, smear=5,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: overhand whip, no loop (ANIM_SPEC 2.2 throwers: overhand) ------------------------------
# 0-1 = A read and fwd, 2 the arm swung up, 3 HOLD (the arm cocked high behind the head, the pouch
# hanging down his back, leaning back on the rear foot), 4 jiggle, 5 smear (whipped over the top),
# 6 lead, 7 RELEASE (arm forward at shoulder height, the cord streaming forward), 8-11 = A's
#      up   HOLD jigl smear lead  REL
B_A = [120, 150, 146, 90, 40, 10]
B_F = [160, 215, 210, 80, 30, 0]
B_W = [200, 250, 242, 120, 40, 0]
B_OA = [-20, 10, 14, -40, -70, -90]
B_OF = [0, 30, 34, -40, -80, -100]
B_T = [6, 16, 15, 0, -12, -20]
B_H = [-4, -8, -7, 2, 6, 8]
B_X = [-1.5, -4.0, -3.8, 0.0, 4.0, 7.0]
B_Z = [0.8, 1.4, 1.0, -0.4, -1.4, -2.2]
B_Q = [0.04, 0.08, 0.06, 0.0, -0.06, -0.12]
B_FR = [2.0, 1.0, 1.0, 5.0, 9.0, 13.0]
B_FL = [-4.0, -7.0, -7.0, -6.0, -4.0, -3.0]
B_LR = [0, 0, 0, 2.5, 1.5, 0]


def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(swing(B_A[k] - t, B_F[k] - t, B_W[k] - t), other(B_OA[k] - t, B_OF[k] - t), {
        "torso": {"r": t}, "head": {"r": B_H[k]}, "pouch_stone": {"hide": i == 7},
    }, M.body_about((0, 0, 22), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k], lr=B_LR[k])
    if i in (5, 6):
        pose.setdefault("sling", {})["sz"] = 1.15
    pose = merge(pose, F.expr("grit") if i in (2, 3, 4) else F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _attack_b():
    streak = {"kind": "streak", "joint": "sling", "point": POUCH, "color": B.SAND_LT, "width_lu": 5.0, "white": 0.3}
    ov = {
        5: [dict(streak, **{"from": 4, "t1": 0.95})],
        6: [dict(streak, **{"from": 5, "t0": 0.2, "t1": 0.95})],
        7: [{"kind": "burst", "joint": "sling", "point": POUCH, "r0_lu": 3.0, "r1_lu": 8.0, "n": 4,
             "a0": -30.0, "arc": 80.0},
            {"kind": "dust", "ground": (12.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 5, "spread": 0.7}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10),
             11: ("attack", 11)}
    return M.clip("attack_b", [_b_pose(i) for i in range(12)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "sling": {"r": 25 * a},
                "arm_l": {"r": 36 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 2.4 * max(a, 0), "r": -6 * a},
                "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"))


HAT_LOOSE = [None, (-2, 6, 30), (-6, 18, 70), (-12, 26, 110), (-20, 22, 150), (-28, 10, 170),
             (-34, -36, 180), (-36, -50, 180), (-36, -50, 180), (-36, -50, 180)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "fore_r": {"r": 30 * flail}, "sling": {"r": 60 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if HAT_LOOSE[k] is not None:
        x, z, r = HAT_LOOSE[k]
        pose["hat"] = dict(pose.get("hat", {}), hide=True)
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
