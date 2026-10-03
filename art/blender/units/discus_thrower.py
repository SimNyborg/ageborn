"""Discus Thrower: Bronze Age Common Ranged Discus (CONTENT_PLAN 5.2 #4). The discus skips to a second
target (chain 2), ~68 lu.

A viewer expects a discus thrower to coil, spin round and let the disc fly, and to jog with the
disc tucked under the arm.

Look: a broad-shouldered athlete with short curls, a team headband with long ties, a team exomis
(the far shoulder bare) with a sandstone hem, laced sandals. The discus is a polished bronze disc
with a sandstone rim and a lambda in the middle, held flat-on to the camera so it reads at 1x.

Animation (cartoon kit v2):
  idle    rolls the discus in his fingers, a little shoulder shrug, blink
  walk    walk v3 bounce jog at ground speed (ANIM_SPEC G1, 81.25 lu/s): the discus tucked against
          the hip, the free arm pumping, planted feet
  attack_b  STANDING SIDE-ARM FLING: no spin; he stands tall, turns his shoulders away with the disc
          drawn back level at shoulder height (held extreme), then slings it flat and low
  attack  ONE-AND-A-HALF SPIN: crouch and coil (the Discobolus held extreme: knees bent, torso
          twisted, the discus arm far back and high), spin round on the front foot (ring smear,
          his back with the team stripe flashing past), and release flat at shoulder height
          (the disc leaves on the impact frame); the back leg kicks up in the follow-through,
          then a new disc is handed up from his belt pouch
          A and B hold the coil with a small rock while the sim wind-up lasts (holdLoop)
  hit     light: head snaps back, ties flick
  die     D1 fling and spin, the discus rolls away on its edge
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "discus_thrower"
GAIT_NAME = "biped"
NAME = "Discus Thrower"
HEIGHT_LU = 68
CANVAS = (300, 250)
FEET = (140, 216)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
DISC_C = (HR[0] + 1.5, HR[1] - 3.2, HR[2] - 1.0)


def _disc(rig, joint, c):
    cx, cy, cz = c
    g = Geo().blob((cx, cy, cz), (7.0, 1.7, 7.0), p=2.0)
    rig.part(joint, g, B.BRONZE, finish=B.POLISH)
    g = Geo().blob((cx, cy - 0.3, cz), (7.3, 1.3, 7.3), p=2.0)
    g.clip((cx, cy - 0.2, cz), (0, 1, 0))
    rig.part(joint, g, B.SAND_DK, outline=0.6)
    g = Geo().blob((cx, cy - 0.5, cz), (5.4, 1.4, 5.4), p=2.0)
    rig.part(joint, g, B.BRONZE_HI, finish=B.POLISH, outline=0.4)
    K.lambda_mark(rig, joint, (cx, cy - 1.8, cz), size=0.9, color=B.SAND_LT)


def build(rig):
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig, greaves=False)
    K.tunic(rig, team=True, hem_color=B.SAND_LT, bulk=1.06)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT + 1.0)        # hem >= 9 lu above the soles
    # a team stripe down the back so the spin frames keep their team share
    g = Geo().blob((-9.6, 0, 28.0), (2.4, 7.6, 10.4), p=2.6)
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((7.0, -9.0, 15.4), (3.6, 2.4, 3.0), p=2.6)          # belt pouch
    rig.part("torso", g, B.LEATHER, outline=0.6)
    # bare far shoulder (exomis): a skin cap over the tunic on the far side
    g = Geo().blob((0.4, 9.6, 35.4), (7.0, 4.6, 5.2), p=2.4)
    rig.part("torso", g, B.SKIN)

    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), brow_tilt=1.4, mouth_z=43.6)
    K.curly_hair(rig, z=-1.0, scale=0.96)
    K.headband(rig)
    rig.secondary("ties", "head", (-10.0, 0, 55.0), (-20.0, 0, 48.0), max_deg=18, gain=1.4)
    g = Geo().slab([(-10.0, 56.6), (-20.5, 52.0), (-21.5, 47.5), (-17.5, 50.6), (-10.0, 53.4)], 0.0, 1.4)
    g.slab([(-10.0, 55.6), (-17.5, 48.6), (-16.8, 44.6), (-14.4, 48.0), (-10.0, 53.0)], 2.0, 1.4)
    rig.part("ties", g, team=True, outline=0.6)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.4, r1=3.9)
    g = Geo().blob((0.3, B.ARM_Y["l"], 33.0), (4.8, 4.6, 1.4), p=2.8)
    rig.part("arm_l", g, B.VERD, finish="metal", outline=0.5)

    rig.joint("disc", "hand_r", HR)
    _disc(rig, "disc", DISC_C)
    rig.track("muzzle", "disc", DISC_C)
    rig.joint("disc_loose", "root", (0, 0, 0), hidden=True)
    _disc(rig, "disc_loose", (0.0, -12.0, 6.0))


# -- poses ---------------------------------------------------------------------------------
def throw(a, f, w=0.0):
    return B.arm("r", a, f, w, w_rest=0.0)


def other(a, f):
    return B.arm("l", a, f)


STANCE = merge(throw(-30, 30, 10), other(-60, -20), {"torso": {"r": -2}})
TUCK = merge(throw(-80, -40, -20), other(-60, -20))


def _idle(f):
    roll = [0.0, 0.5, 1.0, 0.5, 0.0, -0.4][f]

    def extra(ctx):
        return merge(throw(-30 + 4 * roll, 30 + 6 * roll, 10 + 30 * roll), {
            "arm_l": {"r": 3 * ctx["lag"]}, "torso": {"rz": 3 * roll}})
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
        return merge(throw(-84 + 4 * c, -44 + 4 * c, -20), other(-90 + 34 * c, -90 + 34 * c + 70 + 15 * c),
                     {"disc": {"r": 4 * lag}})
    base = {k: v for k, v in STANCE.items() if not k.startswith(("arm_", "fore_", "hand_"))}
    return M.walk_v3(RIG, f, base, GAIT, legs=LEGS, lean=-9.0, twist=6.0, nod=3.0, extra=extra, report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 12 steps: read, dip, coil, HOLD, rock (holdLoop partner), spin1, spin2 | RELEASE, follow, recover,
# hand, settle. Pre-impact 290 of 680 ms (impactAt 0.4265); the hold is 35% of the pre-impact time.
ATK_MS = [30, 40, 40, 102, 30, 30, 18, 120, 60, 50, 70, 90]
ATK_IMPACT = 7
#        read  dip  coil HOLD rock spin1 spin2 REL  follow recov hand  settle
D_A = [-30, -70, 150, 165, 160, 120, 20, -5, -40, -60, -40, -30]
D_F = [30, -40, 165, 175, 170, 140, 15, -5, -60, -30, 10, 28]
D_W = [10, -20, 180, 190, 184, 150, 20, 0, -40, -20, 20, 10]
O_A = [-60, -40, -20, -10, -14, 40, 20, -60, -100, -70, -55, -60]
O_F = [-20, -10, 20, 40, 36, 60, 0, -70, -110, -50, -10, -20]
A_T = [-2, -12, 8, 14, 12, 0, -8, -20, -24, -10, -4, -2]
A_RZ = [0, -10, -50, -70, -66, 150, 300, 360, 380, 360, 360, 360]
A_H = [0, 4, -4, -6, -5, 0, 4, 8, 10, 4, 0, 0]
A_Q = [-0.02, -0.12, 0.02, 0.06, 0.04, 0.02, 0.0, -0.14, -0.1, -0.04, 0.01, 0.0]
A_X = [0.0, -1.0, -3.0, -4.0, -3.8, -1.0, 2.0, 6.0, 7.0, 4.5, 2.0, 0.5]
A_Z = [0.0, -3.2, -2.4, -2.0, -2.4, 1.4, 1.0, -1.6, -1.4, -0.6, -0.2, 0.0]
A_FR = [2.0, 3.0, 4.0, 5.0, 5.0, 3.0, 4.0, 9.0, 10.0, 7.0, 4.0, 2.5]
A_FL = [-2.0, -4.0, -7.0, -8.0, -8.0, -5.0, -4.0, -3.0, -3.0, -2.5, -2.0, -2.0]
A_LL = [0, 0, 0, 0, 0, 3.0, 2.0, 0, 4.0, 0, 0, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(throw(D_A[f] - t, D_F[f] - t, D_W[f] - t), other(O_A[f] - t, O_F[f] - t), {
        "torso": {"r": t}, "head": {"r": A_H[f]},
        "disc": {"hide": f in (7, 8, 9)},
    }, M.body_about((0, 0, 24), x=A_X[f], z=A_Z[f], q=A_Q[f], rz=A_RZ[f]))
    pose = _feet(pose, A_FR[f], A_FL[f], ll=A_LL[f])
    if f == 10:
        pose["disc"]["s"] = 0.85
    if f in (1, 2, 3, 4):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (5, 6, 7, 8):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_clip():
    poses = [_attack_pose(f) for f in range(12)]
    spin_from = merge(poses[5], M.body_about((0, 0, 24), x=A_X[5], z=A_Z[5], q=A_Q[5], rz=-40))
    ring = {"kind": "arc", "joint": "disc", "inner": (HR[0], HR[1], HR[2] + 1.0), "outer": DISC_C,
            "color": B.SAND_LT, "white": 0.35, "taper": 0.15, "lines": 3, "band": 0.4}
    ov = {
        5: [dict(ring, **{"pose_from": spin_from, "t1": 0.95})],
        6: [dict(ring, **{"from": 5, "t0": 0.2, "t1": 0.95})],
        7: [{"kind": "burst", "joint": "hand_r", "point": (HR[0] + 6.0, HR[1], HR[2]), "r0_lu": 3.0,
             "r1_lu": 9.0, "n": 4, "a0": -40.0, "arc": 80.0},
            {"kind": "dust", "ground": (8.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 5, "spread": 0.9}],
        2: [{"kind": "dust", "ground": (-4.0, 0.0), "size_lu": 4.0, "puffs": 3, "seed": 2, "spread": 0.7}],
    }
    return M.clip("attack", poses, ATK_MS, impact=ATK_IMPACT, smear=5, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: standing side-arm fling, no spin (ANIM_SPEC 2.2 throwers: side-arm) --------------------
# 0-1 = A read and dip, 2 turn, 3 HOLD (standing tall, shoulders turned away, the disc drawn back LEVEL
# at shoulder height, the free arm pointing at the target), 4 rock, 5 smear (slung round flat),
# 6 lead, 7 RELEASE (flat and low in front, leaning in), 8-11 = A's
#      turn HOLD rock smear lead  REL
B_A = [-150, -175, -172, -90, -20, -5]
B_F = [-160, -178, -176, -80, -10, 0]
B_W = [-170, -180, -178, -90, -10, 0]
B_OA = [-10, 0, 4, -30, -70, -90]
B_OF = [-4, 0, 4, -40, -80, -100]
B_T = [6, 8, 7, -2, -12, -18]
B_RZ = [-8, -12, -11, 0, 10, 14]
B_H = [-2, -4, -3, 2, 6, 8]
B_X = [-1.0, -2.0, -1.8, 1.0, 4.0, 6.0]
B_Z = [0.6, 1.0, 0.8, 0.0, -1.2, -2.0]
B_Q = [0.03, 0.06, 0.04, 0.0, -0.06, -0.12]
B_FR = [2.0, 1.0, 1.0, 5.0, 8.0, 11.0]
B_FL = [-4.0, -6.0, -6.0, -5.0, -4.0, -3.0]
B_LR = [0, 0, 0, 2.0, 1.0, 0]


def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(throw(B_A[k] - t, B_F[k] - t, B_W[k] - t), other(B_OA[k] - t, B_OF[k] - t), {
        "torso": {"r": t, "rz": B_RZ[k]}, "head": {"r": B_H[k]}, "disc": {"hide": i == 7},
    }, M.body_about((0, 0, 24), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k], lr=B_LR[k])
    pose = merge(pose, F.expr("grit") if i in (2, 3, 4) else F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _attack_b():
    ring = {"kind": "arc", "joint": "disc", "inner": (HR[0], HR[1], HR[2] + 1.0), "outer": DISC_C,
            "color": B.SAND_LT, "white": 0.35, "taper": 0.2, "lines": 3}
    ov = {
        5: [dict(ring, **{"from": 4, "t1": 0.95})],
        6: [dict(ring, **{"from": 5, "t0": 0.2, "t1": 0.95})],
        7: [{"kind": "burst", "joint": "hand_r", "point": (HR[0] + 6.0, HR[1], HR[2]), "r0_lu": 3.0,
             "r1_lu": 9.0, "n": 4, "a0": -20.0, "arc": 70.0},
            {"kind": "dust", "ground": (10.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 9, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10),
             11: ("attack", 11)}
    return M.clip("attack_b", [_b_pose(i) for i in range(12)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 18 * a}, "arm_l": {"r": 36 * a}, "fore_l": {"r": 20 * a},
                "brow": {"z": 1.4 * max(a, 0)}, "ties": {"r": 10 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"))


# the disc drops and rolls away on its edge (x, z, r)
LOOSE = [None, (4, 10, 30), (8, 16, 90), (12, 12, 160), (16, 4, 240), (20, 0, 320), (24, 0, 400),
         (27, 0, 460), (28, 0, 470), (28, 0, 470)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 70 * flail + 30}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if LOOSE[k] is not None:
        x, z, r = LOOSE[k]
        pose["disc"] = dict(pose.get("disc", {}), hide=True)
        pose["disc_loose"] = {"show": True, "x": x, "z": z, "r": -r}
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
