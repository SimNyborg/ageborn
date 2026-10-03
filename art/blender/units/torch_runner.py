"""Torch Runner: Stone Age common infantry raider (CONTENT_PLAN 5.1). Fast; double damage to bases.
Torch, blunt, 62 lu.

Look (A11, PLAN.md): a wiry young runner, lean and long-legged, with wild flame-shaped hair tied
back in a team rag, soot smudges on the cheeks and a cheeky grin; a short team pelt kilt and a
crossed team chest strap with a pouch of dry moss; a torch of bound reeds on a stick with a small
yellow-white flame (A11: flames small and pale), a bone whistle on a cord. Bare feet with fur wraps.

"A viewer expects it to jab with the burning torch and to sprint with its arms pumping."

Animation (ANIM_SPEC G1 sprint, appendix B: a jab, a sweep, a jump kick):
  idle      jogs on the spot impatiently, the flame flickering, blink
  walk      walk v3 sprint (card 100 x 1.25 = 125 lu/s): a long low stride, an 18 degree lean,
            both arms pumping, the torch trailing behind with the flame streaming
  attack    TORCH JAB: crouches, draws the torch back by the hip (held extreme), lunges and jabs it
            forward (streak), embers flick off on the impact, recovers
  attack_b  BACKHAND SWEEP: the torch high over the far shoulder, swept flat across (flame arc)
  attack_c  JUMP KICK: a hop into a flying two-footed kick, the torch held high behind
  hit       light;  die  D1 fling and spin, the torch tumbles away, X eyes
"""
from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "torch_runner"
GAIT_NAME = "biped"
NAME = "Torch Runner"
HEIGHT_LU = 62
CANVAS = (264, 220)
FEET = (116, 196)
ANCHORS = {"head": (4, 60), "hitCenter": (0, 29)}
NO_RETIME = True

SKIN = "#E3BE9C"
HAIR = "#4E4038"
FUR = "#7A6B5E"
REED = "#B39B74"
REED_DK = "#8C7556"
WOOD = "#8E7258"
SOOT = "#7A6458"
BONE = "#EDE3C8"
FIRE = "#FFE3B0"
FIRE_CORE = "#FFFFFF"
MOSS = "#8A8A6A"

HIP_Y, SH_Y = 5.2, 10.8
TORCH_LEN = 18.0


def _torch(rig, joint, fist):
    fx, fy, fz = fist
    g = Geo().capsule((fx, fy, fz - 4.0), (fx, fy, fz + TORCH_LEN - 5.0), 1.4, 1.3)
    rig.part(joint, g, WOOD)
    g = Geo().lathe([(2.4, 0), (3.2, 2.0), (3.4, 5.0), (2.6, 6.4)], (fx, fy, fz + TORCH_LEN - 7.0),
                    (fx, fy, fz + TORCH_LEN), segs=14)
    rig.part(joint, g, REED)
    g = Geo()
    for dz in (1.2, 4.0):
        g.lathe([(3.3, 0), (3.5, 0.6), (3.5, 1.4), (3.2, 1.8)], (fx, fy, fz + TORCH_LEN - 7.0 + dz), segs=14)
    rig.part(joint, g, team=True, outline=0.5)
    rig.joint(f"{joint}_flame", joint, (fx, fy, fz + TORCH_LEN))
    g = Geo().lathe([(0, 0), (3.0, 1.0), (3.2, 3.2), (2.0, 6.0), (0, 9.0)], (fx, fy, fz + TORCH_LEN - 0.5),
                    (fx - 1.0, fy, fz + TORCH_LEN + 8.5), segs=12)
    rig.part(f"{joint}_flame", g, glow=FIRE, outline=0.5, outline_hex="#E8B860")
    g = Geo().blob((fx - 0.2, fy - 0.6, fz + TORCH_LEN + 2.6), (1.5, 1.2, 2.4), p=2.0)
    rig.part(f"{joint}_flame", g, glow=FIRE_CORE, outline=0)


def build(rig):
    global RIG, ARM_R, ARM_L, TIP
    RIG = rig
    body = K.body(rig, SKIN, FUR, stocky=0.95, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(9.4, 8.4, 9.8), foot_len=4.4)
    fr, fl = body.fist["r"], body.fist["l"]
    K.pelt(rig, FUR, strap=False, r=(10.4, 9.4, 6.8), skirt_r=(10.6, 9.6, 4.6), emblem=False)
    K.wraps(rig, HIP_Y, SH_Y, wrists=("l",))
    # crossed team chest strap and a moss pouch
    g = Geo().capsule((7.0, -8.0, 26.0), (2.0, 8.0, 36.0), 2.2, 2.2).capsule((7.0, 8.0, 26.0), (2.0, -8.0, 36.0), 2.2, 2.2)
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().blob((-6.0, -8.4, 20.4), (4.0, 3.0, 4.4), p=2.2)
    rig.part("hips", g, MOSS, finish="hair")
    # wild swept-back hair in a team rag, soot smudges, a bone whistle
    hair = Geo().blob((-3.0, 0, 54.0), (9.4, 10.0, 5.4), p=2.2)
    rag = Geo().lathe([(9.6, 0), (10.4, 0.4), (10.4, 2.6), (9.2, 3.0)], (1.4, 0, 51.6), (0.2, 0, 54.4), segs=22)
    face = K.head(rig, SKIN, z=46.0, r=(10.0, 9.6, 10.0), jaw=(7.0, 7.8, 5.0), extra_geos=(hair, rag),
                  brow_col=HAIR, grin="smile")
    rig.part("head", hair, HAIR, finish="hair")
    rig.part("head", rag, team=True, outline=0.7)
    rig.secondary("hair", "head", (-6.0, 0, 55.0), (-17.0, 0, 58.0), max_deg=16, gain=1.3)
    g = Geo()
    for (x0, z0), (x1, z1), r in (((-5, 55), (-17, 60), 3.2), ((-6, 52), (-18, 53.5), 2.8), ((-3, 57.5), (-12, 64), 2.6)):
        g.capsule((x0, 0, z0), (x1, -0.5, z1), r, 0.8)
    rig.part("hair", g, HAIR, finish="hair")
    rig.secondary("ragtail", "head", (-8.0, -6.0, 53.0), (-16.0, -6.5, 49.0), max_deg=18, gain=1.3)
    g = Geo().slab([(-8.0, 54.0), (-16.5, 50.5), (-17.5, 48.0), (-8.5, 51.0)], -6.0, 1.2)
    rig.part("ragtail", g, team=True, outline=0.7)
    g = Geo()
    c = face.hit(8.6, 42.6)
    face.decal(g, c, F.ellipse(0, 0, 1.6, 1.0, 10), 0.3)
    rig.part("head", g, SOOT, highlight=False, outline=0)
    g = Geo().capsule((9.0, -3.0, 37.0), (10.4, -4.4, 31.6), 0.5).capsule((10.4, -4.4, 31.0), (12.2, -4.8, 29.0), 1.1, 0.9)
    rig.part("torso", g, BONE, outline=0.5)
    # the torch in the near fist, and a loose one for the death
    rig.joint("torch", "fore_r", fr)
    _torch(rig, "torch", fr)
    rig.joint("loose", "root", (0, 0, 0), hidden=True)
    _torch(rig, "loose", (0.0, 0.0, -TORCH_LEN * 0.5))
    TIP = (fr[0], fr[1], fr[2] + TORCH_LEN + 2.0)
    rig.track("torchTip", "torch", TIP)
    ARM_R = body.arm("r", "torch", (fr[0], fr[1], fr[2] + TORCH_LEN))
    ARM_L = body.arm("l")


RIG = ARM_R = ARM_L = TIP = None
SPEED = 125.0
LEGS = K.legs(HIP_Y)
GAIT = K.jog(LEGS, SPEED, cycle=520, stance=0.33, x_mid=3.0, lift=7.0)


def torch(a, b, c, rz=0.0):
    p = ARM_R.pose(a, b, c)
    if rz:
        p["arm_r"]["rz"] = rz
    return p


def off(a, b):
    return ARM_L.pose(a, b)


def _flicker(f, k=1.0):
    s = [1.0, 1.15, 0.9, 1.2, 0.95, 1.1, 0.85, 1.05][f % 8] * k
    return {"torch_flame": {"sz": s, "sx": 0.9 + 0.1 * s, "sy": 0.9 + 0.1 * s}}


def stance():
    return merge(torch(-30, 30, 80), off(-50, 10), {"torso": {"r": -4}})


def _idle(f):
    bounce = [0.0, 1.0, 0.0, -0.5, 0.0, 1.0, 0.0, -0.5][f]

    def extra(ctx):
        return merge({"hips": {"z": 0.9 * bounce}, "thigh_r": {"r": 10 * max(0, bounce) * (f % 4 == 1)},
                      "thigh_l": {"r": 10 * max(0, bounce) * (f % 4 == 1 and f > 3)},
                      "hair": {"r": 6 * ctx["lag"]}}, _flicker(f))
    return M.idle_v2(f, stance(), extra=extra, face_blink=F.expr("blink"), blink=6)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge({"hair": {"r": -14 + 6 * lag}, "ragtail": {"r": -16 + 6 * lag}}, _flicker(f, 1.15),
                     {"torch_flame": {"r": -40}})
    # the torch trails back and low in the near hand (pumping with the arm), the far arm pumps
    arms = {"l": K.Arm(ARM_L), "r": _TorchArm()}
    return K.walk(RIG, f, {"torso": {"r": -6}}, GAIT, LEGS, arms=arms, lean=-18.0, extra=extra, report=report)


class _TorchArm:
    @staticmethod
    def pose(a, b):
        return torch(a, b, 168 + 0.4 * (a + 90))


# attack A: torch jab. 11 unique frames, SMALL_MELEE_MS
#       read crouch draw HOLD  lunge lead  IMP  ember recoil settle settle
A_A = [-30, -50, -110, -125, -40, -5, 0, -5, -15, -25, -30]
A_B = [30, -10, -70, -90, -20, -2, 2, 5, 0, 15, 28]
A_C = [80, 40, 10, 0, 5, 2, 0, 10, 30, 60, 78]
A_X = [-0.5, -2.0, -3.0, -4.0, 2.0, 6.0, 9.0, 8.5, 7.0, 3.0, 0.5]
A_Z = [0.0, -2.4, -3.0, -3.6, -2.0, -2.4, -3.0, -2.0, -1.6, -0.5, 0.0]
A_Q = [-0.03, -0.10, -0.06, -0.08, 0.08, 0.04, -0.14, 0.03, -0.05, 0.01, 0.0]
A_T = [-4, 6, 14, 18, -8, -18, -24, -18, -14, -8, -4]
A_H = [0, -2, -6, -8, 2, 6, 8, 6, 4, 2, 0]
A_THR = [0, -8, -12, -14, 20, 32, 38, 34, 26, 10, 2]
A_SHR = [0, 10, 12, 14, -20, -30, -24, -18, -14, -6, 0]
A_THL = [0, 10, 14, 16, -10, -20, -28, -24, -18, -6, -1]
A_SHL = [0, -16, -20, -24, -14, -8, -4, -4, -4, -2, 0]
A_OA = [-50, -30, 10, 20, -60, -100, -120, -110, -90, -60, -50]
A_OB = [10, 30, 50, 60, 0, -60, -80, -60, -30, 0, 10]


def _attack_pose(f):
    pose = merge(torch(A_A[f], A_B[f], A_C[f]), off(A_OA[f], A_OB[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]), _flicker(f))
    if f in (4, 5):
        pose["torch"]["sz"] = 1.15
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


EMBER = {"kind": "burst", "joint": "torch", "r0_lu": 6.0, "r1_lu": 12.0, "n": 6, "a0": -50.0, "arc": 160.0,
         "color": "#FFF0C4"}


def _attack_clip():
    ov = {
        4: [{"kind": "streak", "joint": "torch", "point": TIP, "color": FIRE, "width_lu": 7.0, "white": 0.5, "from": 3}],
        6: [dict(EMBER, point=TIP),
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 61, "spread": 0.8}],
        7: [dict(EMBER, point=TIP, r0_lu=9.0, r1_lu=15.0, n=4)],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# attack B: backhand sweep. 0 = A read, 1 wind (torch up over the far shoulder), 2 HOLD (torch high
# behind the head, the body coiled away), 3 smear (swept flat across), 4 IMPACT (torch level in front),
# 5 follow-through, 6-7 = A settle
B_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    tab = [  # a, b, c, rz, trz, t, x, z, q, thr, shr, thl, shl
        (40, 90, 140, 40, -16, 6, -1.0, 0.6, 0.04, -4, -6, 4, -6),
        (70, 120, 170, 70, -32, 10, -2.5, 1.4, 0.08, -8, -10, 8, -8),
        (10, 30, 80, 30, 6, -6, 2.0, 0.0, 0.0, 14, -18, -8, -6),
        (-10, 0, 10, -20, 28, -12, 5.0, -1.4, -0.12, 22, -16, -16, -6),
        (-20, -40, -30, -60, 40, -8, 4.0, -0.6, -0.03, 16, -10, -12, -4),
    ][i - 1]
    a, b, c, rz, trz, t, x, z, q, thr, shr, thl, shl = tab
    pose = merge(torch(a, b, c, rz), off(-70, -20), {
        "torso": {"r": t, "rz": trz}, "head": {"r": -t * 0.4, "rz": -trz * 0.5},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q), _flicker(i))
    return merge(pose, F.expr("grit" if i < 3 else "yell"), {"brow": {"z": -1.0}})


def _attack_b():
    arc = {"kind": "arc", "joint": "torch", "inner": (TIP[0], TIP[1], TIP[2] - 8), "outer": TIP,
           "color": FIRE, "taper": 0.15, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.5, "samples": 16}
    ov = {3: [dict(arc, **{"from": 2})],
          4: [dict(EMBER, point=TIP, a0=-30.0)]}
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4,
                  sequence=B_SEQ, overlays=ov, reuse=reuse)


# attack C: jump kick. 0 = A read, 1 crouch, 2 HOLD (airborne, knees tucked to the chest, the torch
# high behind), 3 kick out (smear), 4 IMPACT (both feet out front, body leaning back, squash),
# 5 landing, 6-7 = A settle
C_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    tab = [  # x, z, q, t, thr, shr, thl, shl, ta, tb, tc
        (-1.0, -3.4, -0.12, 8, -14, 24, -12, 22, 40, 80, 120),
        (1.0, 10.0, 0.06, 4, 70, -110, 66, -104, 80, 120, 160),
        (5.0, 9.0, 0.10, 20, 80, -30, 70, -40, 90, 130, 170),
        (8.0, 7.0, -0.12, 28, 92, -4, 84, -6, 95, 135, 175),
        (6.0, 0.0, -0.10, 0, 20, -30, 10, -30, 40, 80, 120),
    ][i - 1]
    x, z, q, t, thr, shr, thl, shl, ta, tb, tc = tab
    pose = merge(torch(ta, tb, tc), off(-120, -90), {
        "torso": {"r": t}, "head": {"r": -t * 0.6},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q), _flicker(i))
    return merge(pose, F.expr("grit" if i < 3 else "yell"), {"brow": {"z": -1.0}})


def _attack_c():
    foot = (6.0, -5.2, 1.0)
    ov = {1: [{"kind": "dust", "ground": (-4.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 62, "dir": -1.0}],
          3: [{"kind": "streak", "joint": "foot_r", "point": foot, "color": SKIN, "width_lu": 7.0, "white": 0.4,
               "from": 2}],
          4: [{"kind": "burst", "joint": "foot_r", "point": foot, "r0_lu": 6.0, "r1_lu": 12.0, "n": 5,
               "a0": -60.0, "arc": 120.0}],
          5: [{"kind": "dust", "ground": (6.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": 63, "spread": 1.0}]}
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4,
                  sequence=C_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    return merge(K.hit(k, stance(), extra=lambda a: {"torch": {"r": 20 * a}, "hair": {"r": 12 * a}}), _flicker(k))


LOOSE = [None, (8, 0, 66, 60), (10, 0, 84, 170), (12, 0, 90, 290), (16, 0, 76, 410),
         (20, 0, 50, 520), (23, 0, 24, 600), (25, 0, 8, 625), (26, 0, 9, 628), (26, 0, 8, 630)]


def _die(k):
    def extra(kk, flail):
        out = {}
        if LOOSE[kk] is not None:
            x, y, z, r = LOOSE[kk]
            out["torch"] = {"hide": True}
            out["loose"] = {"show": True, "x": x, "z": z, "r": r}
        return out
    return K.die_d1(k, stance(), HEIGHT_LU, extra=extra)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
