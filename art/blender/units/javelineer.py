"""Javelineer: Bronze Age ranged (A17.9). Javelin that pierces 2 targets, ~68 lu.

Look (A17.12): a light skirmisher in a short team tunic belted with leather, a sandstone
cloak rolled over the far shoulder with a flapping team tail, a team headband with a verdigris
laurel sprig and trailing ties over curly hair, big eyes and an eager brow, bare arms and
legs, laced sandals. A leather case of javelins sits on the back (the shafts and polished
heads stick up over the shoulder), and the throwing arm is cocked by the ear with a javelin
ready, the far hand pointing at the enemy.

Animation (cartoon kit v2; a viewer expects a javelin man to skip, lean back and whip it):
  idle    weighs the javelin in his hand (a bounce on the beat), weight shift, blink
  walk    jog: forward lean, the far arm pumping, the javelin bobbing a frame late
  attack  HOP-STEP THROW: a skip on the back foot, lands in a long lean back with the far
          arm pointing at the target (the held extreme), a full-body whip over the top
          (smear), release (the projectile leaves at the per-frame `muzzle` on the impact
          frame), a follow-through with the back leg kicking up, then he reaches over his
          shoulder and draws the next javelin from the case
  hit     light: head snaps back, front foot up, eyes squeezed, overshoot forward
  die     D1 fling and spin: the javelin flies out of his hand, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "javelineer"
NAME = "Javelineer"
HEIGHT_LU = 68
CANVAS = (290, 250)
FEET = (136, 216)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 32)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
JAV_F, JAV_B = 44.0, 9.0          # javelin tip ahead of / butt behind the fist (modelled along +X)


def _javelin(rig, joint, base):
    hx, hy, hz = base
    g = Geo().capsule((hx - JAV_B, hy, hz), (hx + JAV_F - 5.0, hy, hz), 1.0, 0.9, segs=10)
    rig.part(joint, g, B.WOOD, outline=0.6)
    g = Geo().capsule((hx - 2.4, hy - 0.3, hz), (hx + 2.8, hy - 0.3, hz), 1.45)       # thong grip
    rig.part(joint, g, B.LEATHER_DK, outline=0.4)
    g = Geo().lathe([(0, 0), (1.3, 0.6), (2.2, 2.6), (1.3, 5.6), (0, 8.4)], (hx + JAV_F - 8.2, hy, hz),
                    (hx + JAV_F, hy, hz), segs=10, squash=(1.0, 0.5))
    rig.part(joint, g, B.BRONZE, finish=B.POLISH, outline=0.5)
    g = Geo()                                                                        # sandstone flights
    for dz in (1.0, -1.0):
        g.slab([(hx - JAV_B + 0.5, hz), (hx - JAV_B + 5.5, hz), (hx - JAV_B + 1.0, hz + 3.2 * dz)], hy - 0.4, 0.7)
    rig.part(joint, g, B.SAND_LT, outline=0.4)


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig, greaves=False)
    for s in ("r", "l"):                                                             # calf laces
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo()
        for z in (4.6, 7.4, 10.0):
            g.blob((0.9, y, z), (3.8, 3.8, 0.7), p=3.0)
        rig.part(f"shin_{s}", g, B.LEATHER_DK, outline=0.4)

    # javelin case on the back (behind the body), shafts over the far shoulder
    rig.joint("case", "torso", (-9.0, 4.0, 30.0))
    g = Geo().capsule((-8.0, 6.0, 20.0), (-12.5, 6.0, 40.0), 4.4, 4.8)
    rig.part("case", g, team=True)                                   # team-dyed leather case
    g = Geo().blob((-12.6, 6.0, 40.4), (5.1, 5.2, 1.5), p=2.6, rot=(0, 12, 0))
    g.blob((-10.2, 6.0, 30.0), (5.0, 5.2, 1.2), p=2.6, rot=(0, 12, 0))
    rig.part("case", g, B.LEATHER_DK, outline=0.6)
    g = Geo()
    for dx, dy, top in ((-1.5, 4.0, 60.0), (1.2, 7.0, 57.0), (-4.0, 8.0, 55.0)):
        g.capsule((-11.0 + dx, dy, 38.0), (-14.5 + dx * 1.3, dy, top), 1.0)
    rig.part("case", g, B.WOOD, outline=0.6)
    g = Geo()
    for dx, dy, top in ((-1.5, 4.0, 60.0), (1.2, 7.0, 57.0), (-4.0, 8.0, 55.0)):
        x1 = -14.5 + dx * 1.3
        g.lathe([(0, 0), (1.4, 0.8), (1.9, 2.8), (0, 6.6)], (x1 + 0.1, dy, top - 1.0), (x1 - 1.0, dy, top + 5.6),
                segs=8, squash=(1.0, 0.55))
    rig.part("case", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    g = Geo().capsule((9.5, -6.5, 36.0), (-8.5, 6.5, 24.0), 1.3)       # strap
    rig.part("torso", g, B.LEATHER_DK, outline=0.6)
    g = Geo().sphere((5.2, -8.2, 32.4), 1.5, cuts=2)                  # strap buckle
    rig.part("torso", g, B.SAND_LT, finish="metal", outline=0.4)

    # team tunic with a flared skirt (follow-through hem), leather belt, linen hem band
    g = Geo().blob((0.2, 0, 28.0), (10.2, 9.4, 11.4), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, team=True)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=12, gain=1.0)
    g = Geo().blob((0.6, 0, 14.6), (11.6, 10.6, 5.6), p=2.4, taper=(1.16, 0.92))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.6, 0, 10.0), (11.8, 10.8, 1.2), p=3.0)
    rig.part("hem", g, B.LINEN, outline=0.6)
    g = Geo().blob((0.4, 0, 20.4), (11.0, 10.1, 1.9), p=3.2)
    rig.part("torso", g, B.LEATHER)
    g = Geo().blob((10.6, -2.0, 20.4), (1.8, 2.4, 2.2), p=2.4)          # belt buckle
    rig.part("torso", g, B.SAND_LT, finish="metal", outline=0.4)
    # rolled sandstone cloak over the far shoulder, a tail that flicks behind
    g = Geo().capsule((-4.0, 10.0, 38.0), (8.0, 8.0, 34.0), 3.6).capsule((8.0, 8.0, 34.0), (10.0, 4.0, 26.0), 3.0)
    rig.part("torso", g, B.SAND)
    rig.secondary("cloak", "torso", (-6.0, 8.0, 37.0), (-15.0, 8.0, 22.0), max_deg=18, gain=1.3)
    g = Geo().slab([(-4.0, 39.0), (-9.0, 38.0), (-15.5, 26.0), (-12.0, 22.0), (-9.5, 25.5), (-6.0, 23.0),
                    (-3.0, 33.0)], 9.0, 2.0)
    rig.part("cloak", g, team=True, outline=0.8)
    g = Geo().slab([(-15.8, 26.2), (-12.2, 21.8), (-11.0, 23.2), (-14.4, 27.4)], 8.8, 2.2)
    rig.part("cloak", g, B.VERD_DK, outline=0.5)

    # head: face kit, curly hair, team headband with a laurel sprig and ties
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), brow_tilt=1.0, mouth_z=43.6)
    g = Geo()
    for x, y, z, r in ((0.0, 0.0, 58.0, 6.4), (-5.0, -4.0, 56.0, 5.2), (-5.0, 5.0, 56.0, 5.2), (4.6, -3.6, 58.4, 4.6),
                       (5.0, 4.0, 58.0, 4.4), (-8.4, 0.0, 51.0, 5.4), (-6.0, -7.4, 50.0, 3.8), (-6.0, 7.4, 50.0, 3.8),
                       (8.4, 0.0, 58.2, 3.6), (-9.0, -4.0, 46.0, 3.4)):
        g.blob((x, y, z), (r, r, r * 0.92), p=2.1)
    rig.part("head", g, B.HAIR, finish="hair")
    g = Geo().blob((1.6, 0, 55.2), (12.6, 12.0, 2.1), p=2.6, rot=(0, -6, 0))
    rig.part("head", g, team=True, outline=0.7)
    g = Geo()                                                                        # laurel sprig
    for k in range(3):
        x, z = 8.4 - 3.0 * k, 56.6 + 0.8 * k
        g.blob((x, -11.4, z + 1.1), (1.7, 0.8, 0.85), p=2.2, rot=(0, -30, 0))
        g.blob((x - 0.7, -11.4, z - 1.2), (1.7, 0.8, 0.85), p=2.2, rot=(0, 30, 0))
    rig.part("head", g, B.VERD, outline=0.4)
    rig.secondary("ties", "head", (-10.0, 0, 55.0), (-19.0, 0, 50.0), max_deg=16, gain=1.3)
    g = Geo().slab([(-10.0, 56.6), (-19.5, 53.0), (-20.5, 49.0), (-17.0, 51.6), (-10.0, 53.4)], 0.0, 1.4)
    g.slab([(-10.0, 55.6), (-16.5, 49.6), (-15.8, 45.6), (-13.6, 49.0), (-10.0, 53.0)], 2.0, 1.4)
    rig.part("ties", g, team=True, outline=0.6)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.0, r1=3.6)
    g = Geo().blob((0, B.ARM_Y["r"], B.HAND_Z + 3.4), (4.4, 4.4, 1.8), p=2.6)
    rig.part("fore_r", g, B.LEATHER, outline=0.7)
    g = Geo().blob((0.3, B.ARM_Y["l"], 33.0), (4.6, 4.4, 1.5), p=2.8)             # arm ring
    rig.part("arm_l", g, B.VERD, finish="metal", outline=0.5)

    # the javelin in the near fist, modelled level along +X; hidden once thrown
    hx, hy, hz = HR
    rig.joint("jav", "hand_r", (hx, hy - 1.0, hz))
    _javelin(rig, "jav", (hx, hy - 1.0, hz))
    rig.joint("jav_loose", "root", (0, 0, 0), hidden=True)
    _javelin(rig, "jav_loose", (-JAV_F * 0.35, 0.0, 0.0))
    rig.track("muzzle", "hand_r", (hx + JAV_F * 0.6, hy - 1.0, hz))
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def throw(a, f, w):
    return B.arm("r", a, f, w, w_rest=0.0)


def aim(a, f):
    return B.arm("l", a, f)


ST_A, ST_F, ST_W = 190, 95, 50        # javelin carried at the shoulder, point up past the head
STANCE = merge(throw(ST_A, ST_F, ST_W), aim(-50, -20), {"torso": {"r": -2}})
NO_THROW = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r")}


def _idle(f):
    # weighs the javelin: it dips and pops up on the beat (frames 2-3), the far hand gestures
    lift = [0.0, 0.5, 1.0, -0.6, -0.2, 0.2][f]

    def extra(ctx):
        return merge(throw(ST_A + 6 * lift, ST_F + 8 * lift, ST_W + 5 * lift), {
            "arm_l": {"r": 3 * ctx["lag"]}, "fore_l": {"r": 6 * max(0.0, lift)},
            "head": {"r": 2 * lift}, "pupils": {"z": 0.4 * lift},
        })
    return M.idle_v2(f, NO_THROW, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": 4 * lag}, "arm_r": {"r": 2 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=38.0, knee=74.0, lift_lu=8.0, bob_pct=0.07,
                     lean=-12.0, arm=36.0, fore=26.0, arms=("l",), extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS
#         read  skip  land  HOLD  whip  lead  IMP  follow reach draw  settle
# throwing arm in WORLD degrees (upper arm, forearm, javelin); the torso lean is subtracted
T_A = [188, 186, 174, 172, 110, 40, -15, -55, 120, 115, 188]
T_F = [93, 182, 178, 178, 60, 10, -25, -70, 170, 150, 93]
T_W = [48, 12, 10, 12, 15, 0, -10, -40, 150, 95, 48]
O_A = [-50, 0, 18, 30, -40, -70, -95, -100, -60, -55, -50]
O_F = [-20, 10, 24, 36, -55, -80, -110, -100, -40, -30, -20]
A_T = [-2, 6, 16, 26, 0, -12, -24, -28, -8, -4, -2]
A_H = [0, -4, -8, -10, -2, 6, 10, 12, 4, 0, 0]
A_Q = [-0.02, 0.06, -0.12, 0.08, 0.06, 0.0, -0.14, -0.08, -0.02, 0.02, 0.0]
A_X = [-0.5, -3.0, -4.0, -5.5, 0.5, 4.0, 7.5, 8.5, 6.0, 3.0, 0.5]
A_Z = [0.0, 4.0, -2.8, -1.4, 0.6, -0.4, -2.2, -1.4, -0.6, 0.0, 0.0]
A_THR = [0, 38, 30, 42, 16, 20, 24, 20, 10, 4, 0]
A_SHR = [0, -58, -8, -6, -18, -20, -26, -18, -8, -2, 0]
A_THL = [0, -10, -16, -18, -4, -18, -38, -46, -20, -6, 0]
A_SHL = [0, -34, -28, -32, -10, -24, -46, -50, -20, -6, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(throw(T_A[f] - t, T_F[f] - t, T_W[f] - t), aim(O_A[f] - t, O_F[f] - t), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "jav": {"hide": f in (6, 7, 8)},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (4, 5):
        pose["jav"]["sx"] = 1.22
    if f == 9:
        pose["jav"]["x"] = -4.0          # still sliding out of the case
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f in (8, 9):
        pose = merge(pose, {"pupils": {"x": -0.6, "z": 0.3}})
    return pose


JAV_TIP = (HR[0] + JAV_F, HR[1] - 1.0, HR[2])
JAV_MID = (HR[0] + JAV_F - 16.0, HR[1] - 1.0, HR[2])


def _attack_clip():
    arc = {"kind": "arc", "joint": "jav", "inner": JAV_MID, "outer": JAV_TIP, "color": B.SAND_LT,
           "white": 0.35, "taper": 0.2, "lines": 3}
    hand = {"kind": "arc", "joint": "hand_r", "inner": (HR[0], HR[1], HR[2] + 2.0),
            "outer": (HR[0] + 4.0, HR[1], HR[2]), "color": B.SKIN, "white": 0.4, "taper": 0.1, "lines": 2}
    ov = {
        1: [{"kind": "dust", "ground": (-5.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 2, "spread": 0.7}],
        2: [{"kind": "dust", "ground": (-6.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 5, "spread": 0.8}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(hand, **{"from": 5, "t1": 0.95}),
            {"kind": "dust", "ground": (12.0, 0.0), "size_lu": 5.5, "puffs": 3, "seed": 8, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 14 * a}, "hand_r": {"r": 10 * a},
                "arm_l": {"r": 36 * a}, "fore_l": {"r": 20 * a},
                "brow": {"z": 1.4 * max(a, 0)}, "ties": {"r": 10 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"))


# the javelin leaves the hand on step 1 and cartwheels up and away
LOOSE = [None, (6, 0, 60, 40), (10, 0, 84, 160), (14, 0, 92, 290), (18, 0, 80, 400),
         (22, 0, 52, 500), (25, 0, 24, 560), (27, 0, 6, 540), (28, 0, 5, 540), (28, 0, 5, 540)]


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
        x, y, z, r = LOOSE[k]
        pose["jav"] = dict(pose.get("jav", {}), hide=True)
        pose["jav_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
