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
  walk    jog: light and bouncy, the sling swinging a frame late, the satchel bouncing
  attack  WINDMILL LOOP: the arm comes forward and up, over and far back (held extreme: arm
          straight back, the pouch trailing behind him, body coiled), then whips down past the
          hip (ring smear) and releases forward-up (the shot leaves the pouch on the impact
          frame); the cord flicks up empty, then he loads a new glans from the satchel
  hit     light: the hat lifts off his head and drops back
  die     D1 fling and spin, the petasos sails away
"""
from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "rhodian_slingers"
NAME = "Rhodian Slingers"
HEIGHT_LU = 66
CANVAS = (300, 250)
FEET = (138, 216)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 31)}
NO_RETIME = True

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
HAT_C = (1.0, 0, 57.0)


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig, greaves=False)
    K.laces(rig)
    K.tunic(rig, team=True)
    # satchel of lead shot on the near hip, strap over the far shoulder
    rig.secondary("satchel", "hips", (5.0, -11.0, 17.0), (5.0, -11.5, 9.0), max_deg=12, gain=1.1)
    g = Geo().blob((5.5, -11.6, 12.4), (5.2, 2.8, 4.4), p=2.6)
    rig.part("satchel", g, B.LEATHER)
    g = Geo().blob((5.5, -13.2, 14.8), (5.4, 1.6, 2.0), p=2.6)
    rig.part("satchel", g, B.LEATHER_DK, outline=0.5)
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
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


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


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"sling": {"r": 10 * lag}, "hat": {"z": 0.4 * lag}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=38.0, knee=72.0, lift_lu=8.0, bob_pct=0.08,
                     lean=-10.0, arm=30.0, fore=22.0, extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS. WORLD angles of the near arm, forearm and sling;
# the numbers keep increasing through the windmill so springs and smears go the right way.
#        read  fwd   up   HOLD smear lead  REL  flick recoil load  settle
S_A = [-78, 0, 90, 172, 250, 285, 312, 335, 300, 260, 282]
S_F = [-70, 12, 98, 178, 256, 292, 322, 352, 290, 300, 290]
S_W = [-96, -30, 60, 200, 300, 345, 380, 420, 330, 260, 264]
O_A = [-60, -40, -10, 20, -30, -60, -80, -85, -70, -55, -60]
O_F = [-30, -20, 10, 40, -20, -60, -90, -95, -60, -40, -30]
A_T = [-2, -4, 4, 14, 4, -10, -18, -20, -10, -12, -4]
A_H = [0, -2, -4, -8, 0, 6, 8, 10, 4, 6, 0]
A_Q = [-0.02, 0.02, 0.05, 0.09, 0.0, -0.04, -0.12, -0.08, -0.02, -0.04, 0.0]
A_X = [0.0, 0.5, -1.0, -4.5, -1.0, 2.5, 6.0, 7.0, 4.5, 2.0, 0.5]
A_Z = [0.0, 0.6, 1.2, 1.6, -0.6, -1.0, -2.0, -1.6, -0.6, -1.0, 0.0]
A_THR = [0, 6, 10, 30, 18, 20, 24, 22, 10, 6, 2]
A_SHR = [0, -6, -10, -12, -10, -14, -20, -18, -8, -6, 0]
A_THL = [0, -4, -10, -16, -6, -18, -32, -34, -16, -10, -2]
A_SHL = [0, -8, -16, -26, -10, -20, -36, -36, -16, -10, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(swing(S_A[f] - t, S_F[f] - t, S_W[f] - t), other(O_A[f] - t, O_F[f] - t), {
        "torso": {"r": t}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "pouch_stone": {"hide": f in (6, 7, 8)},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (3, 4, 5):
        pose.setdefault("sling", {})["sz"] = 1.15
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.1}})
    elif f == 9:
        pose = merge(pose, {"pupils": {"x": -0.4, "z": -0.6}})
    return pose


POUCH = (HR[0], HR[1] - 1.2, HR[2] - 13.0)
FIST = (HR[0], HR[1] - 1.2, HR[2] - 2.0)


def _attack_clip():
    ring = {"kind": "arc", "joint": "sling", "inner": FIST, "outer": POUCH, "color": B.SAND_LT,
            "white": 0.35, "taper": 0.15, "lines": 3, "band": 0.38}
    ov = {
        3: [dict(ring, **{"from": 2, "t0": 0.2, "t1": 0.95})],
        4: [dict(ring, **{"from": 3, "t1": 0.95})],
        5: [dict(ring, **{"from": 4, "t0": 0.2, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "sling", "point": POUCH, "r0_lu": 3.0, "r1_lu": 8.0, "n": 4,
             "a0": -10.0, "arc": 80.0},
            {"kind": "dust", "ground": (10.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 3, "spread": 0.7}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


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
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
