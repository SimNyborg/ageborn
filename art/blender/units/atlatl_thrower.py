"""Atlatl Thrower: Stone Age rare long-range ranged (CONTENT_PLAN 5.1, decided H6). An arcing dart
(proj.dart) at the target's spot, splash r35, range 320 (min 90), 66 lu.

Look (A11, PLAN.md): a tall, lean veteran hunter with a grey-streaked topknot, a team face stripe
of paint under the eyes is avoided (face kit stays clean) so a team feathered headband carries the
colour; a team pelt tunic, a long team hide quiver on his back with four darts, a bone-carved
spear-thrower (atlatl) with a hook and finger loops, and a long fletched dart with a flint point.

"A viewer expects it to hook a long dart into the spear-thrower, lean far back and whip the whole
arm over, and to jog with the dart sloped on his shoulder."

Animation (ANIM_SPEC G1, appendix B throwers; decided H6 art notes):
  idle      checks the dart's point, weighs the atlatl, blink
  walk      walk v3 bounce jog (card 60 x 1.25 = 75 lu/s): the loaded atlatl on the shoulder, the
            dart sloped back, the far arm pumping
  attack    LEAN-BACK WHIP: hooks the dart, leans far back with the arm cocked behind his head (held
            extreme; the hold loops with an aim-wobble frame while the long sim wind-up lasts), whips
            the whole arm over the top (arc smear), the dart leaves on the impact frame, then he draws
            a new dart from the back quiver
  attack_b  KNEELING LOB: drops to one knee and flicks the dart up on a steep arc from low
  hit       light;  die  D1 fling and spin, the dart flies off, X eyes
"""
from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "atlatl_thrower"
GAIT_NAME = "biped"
NAME = "Atlatl Thrower"
HEIGHT_LU = 68
CANVAS = (300, 244)
FEET = (128, 216)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 31)}
NO_RETIME = True

SKIN = "#B98F72"
HAIR = "#4A3E36"
HAIR_GREY = "#9C948A"
FUR = "#7D7064"
BONE = "#EDE3C8"
BONE_DK = "#CDBF9E"
WOOD = "#A08463"
FLINT = "#7C8088"
FEATHER = "#E9DFC9"
FEATHER_TIP = "#5B4A3E"
LEATHER = "#7A5E48"

HIP_Y, SH_Y = 5.4, 11.0
BOARD = 13.0
DART_BACK = 6.0       # the dart's butt sits on the hook, 6 lu past the board's end
DART = 36.0


def _dart(rig, joint, hook, sgn=-1.0):
    """A dart from the hook (butt) running along -Z (rest), its flint point DART lu away."""
    hx, hy, hz = hook
    tip_z = hz - DART
    g = Geo().capsule((hx, hy - 1.0, hz + 1.0), (hx, hy - 1.0, tip_z + 3.0), 1.3, 1.1)
    rig.part(joint, g, WOOD, outline=0.5)
    g = Geo().lathe([(1.7, 0), (1.3, 2.2), (0, 5.2)], (hx, hy - 1.0, tip_z + 4.6), (hx, hy - 1.0, tip_z - 0.4), segs=10)
    rig.part(joint, g, FLINT, finish="gloss", outline=0.5)
    g = Geo()
    for dy in (-1.6, 1.6):
        g.slab([(hx, hz - 1.0), (hx + 2.4 * (1 if dy > 0 else -1), hz - 0.5), (hx + 2.4 * (1 if dy > 0 else -1), hz - 6.5),
                (hx, hz - 8.0)], hy - 1.0 + dy * 0.3, 0.6)
    rig.part(joint, g, FEATHER, outline=0.4)
    g = Geo().lathe([(1.1, 0), (1.3, 0.4), (1.3, 1.8), (1.1, 2.2)], (hx, hy - 1.0, hz - 10.0), segs=10)
    rig.part(joint, g, team=True, outline=0.4)


def build(rig):
    global RIG, ARM_R, ARM_L, TIP, FR
    RIG = rig
    body = K.body(rig, SKIN, FUR, stocky=0.98, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(9.8, 8.8, 10.4), foot_len=4.6,
                  shoulder_z=36.0, neck_z=38.0)
    fr, fl = body.fist["r"], body.fist["l"]
    FR = fr
    K.pelt(rig, FUR, r=(10.6, 9.6, 7.6), skirt_r=(11.0, 9.8, 4.6))
    K.wraps(rig, HIP_Y, SH_Y, wrists=("l",))
    # long team hide quiver on the back with four darts
    rig.joint("quiver", "torso", (-9.0, 2.0, 30.0))
    g = Geo().capsule((-8.0, 3.0, 20.0), (-13.0, 3.0, 44.0), 4.0, 4.6)
    rig.part("quiver", g, team=True)
    g = Geo()
    for k, dy in enumerate((-1.6, 0.4, 2.2, 0.0)):
        x0, z0 = -13.0 - k * 0.4, 44.0
        g.capsule((x0, 3.0 + dy, z0), (x0 - 2.6, 3.0 + dy, z0 + 9.0), 0.7)
    rig.part("quiver", g, WOOD, outline=0.4)
    g = Geo()
    for k, dy in enumerate((-1.6, 0.4, 2.2, 0.0)):
        x0, z0 = -15.6 - k * 0.4, 52.0
        g.slab([(x0, z0), (x0 - 2.4, z0 + 0.5), (x0 - 1.8, z0 + 4.8), (x0 + 0.6, z0 + 4.0)], 3.0 + dy, 0.5)
    rig.part("quiver", g, FEATHER, outline=0.4)
    g = Geo().capsule((-6.0, -6.0, 36.0), (6.0, 7.0, 22.0), 1.4, 1.4)   # quiver strap across the chest
    rig.part("torso", g, LEATHER, outline=0.6)
    # grey-streaked topknot, team feathered headband, a lean face
    hair = Geo().blob((-2.6, 0, 55.4), (9.6, 10.4, 5.4), p=2.2)
    hair.blob((-8.0, 0, 49.0), (4.4, 9.2, 7.2), p=2.2)
    band = Geo().lathe([(9.8, 0), (10.7, 0.4), (10.7, 2.8), (9.4, 3.2)], (1.6, 0, 53.2), (0.2, 0, 56.0), segs=22)
    K.head(rig, SKIN, z=48.5, r=(10.2, 9.8, 10.6), jaw=(7.0, 7.8, 5.6), extra_geos=(hair, band), brow_col=HAIR_GREY)
    rig.part("head", hair, HAIR, finish="hair")
    rig.part("head", band, team=True, outline=0.8)
    rig.secondary("knot", "head", (-2.0, 0, 58.0), (-6.0, 0, 67.0), max_deg=12, gain=1.1)
    g = Geo().blob((-2.6, 0, 60.4), (3.6, 3.6, 3.4), p=2.2)
    g.capsule((-2.6, 0, 61.0), (-6.5, -0.5, 68.0), 2.4, 0.8).capsule((-2.6, 0, 61.0), (1.5, 0.5, 67.0), 2.0, 0.7)
    rig.part("knot", g, HAIR_GREY, finish="hair")
    rig.secondary("feather", "head", (-6.0, -8.0, 55.0), (-13.0, -8.5, 64.0), max_deg=16, gain=1.3)
    g = Geo().blob((-9.6, -8.4, 60.0), (2.4, 1.0, 6.4), p=2.2, rot=(0, -32, 0))
    rig.part("feather", g, FEATHER, outline=0.7)
    g = Geo().blob((-12.0, -8.6, 64.2), (1.9, 1.1, 2.4), p=2.2, rot=(0, -32, 0))
    rig.part("feather", g, FEATHER_TIP, outline=0.5)
    # the atlatl board (held item, rest along +Z from the fist) with the dart lying on it
    rig.joint("atlatl", "fore_r", fr)
    fx, fy, fz = fr
    g = Geo().capsule((fx, fy - 0.6, fz - 2.0), (fx, fy - 0.6, fz + BOARD), 1.5, 1.1)
    g.lathe([(1.4, 0), (0.8, 2.0), (0, 3.0)], (fx, fy - 0.6, fz + BOARD), (fx - 2.4, fy - 0.6, fz + BOARD + 1.2), segs=8)
    rig.part("atlatl", g, BONE)
    g = Geo()
    for dz in (-0.5, 2.5):
        g.lathe([(2.0, 0), (2.3, 0.4), (2.3, 1.4), (2.0, 1.8)], (fx, fy - 0.6, fz + dz), segs=12)
    rig.part("atlatl", g, BONE_DK, outline=0.5)
    hook = (fx - 1.6, fy, fz + BOARD + DART_BACK * 0.2)
    rig.joint("dart", "atlatl", hook)
    _dart(rig, "dart", hook)
    TIP = (hook[0], hook[1] - 1.0, hook[2] - DART)
    rig.track("muzzle", "dart", TIP)
    rig.joint("loose", "root", (0, 0, 0), hidden=True)
    _dart(rig, "loose", (0.0, 0.0, DART * 0.5))
    rig.joint("reload", "fore_l", fl, hidden=True)
    _dart(rig, "reload", (fl[0], fl[1] + 1.0, fl[2] + 14.0))
    ARM_R = body.arm("r", "atlatl", (fx, fy, fz + BOARD))
    ARM_L = body.arm("l")


RIG = ARM_R = ARM_L = TIP = FR = None
SPEED = 75.0
LEGS = K.legs(HIP_Y)
GAIT = K.jog(LEGS, SPEED, cycle=690)


def thr(a, b, c):
    return ARM_R.pose(a, b, c)


def off(a, b):
    return ARM_L.pose(a, b)


def stance():
    # the atlatl up at the shoulder, board pointing back-down so the dart points forward and up
    return merge(thr(-30, 70, -160), off(-60, -10), {"torso": {"r": -2}})


def _idle(f):
    lift = [0.0, 0.4, 0.9, 1.0, 0.6, 0.2, 0.0, 0.0][f]

    def extra(ctx):
        return merge(thr(-30 + 4 * lift, 70 + 6 * lift, -160 + 6 * lift),
                     {"head": {"r": 6 * lift}, "pupils": {"z": 0.6 * lift, "x": 0.4 * lift}, "knot": {"r": 5 * ctx["lag"]}})
    return M.idle_v2(f, K.strip(stance(), "arm_r", "fore_r", "atlatl"), extra=extra, face_blink=F.expr("blink"), blink=7)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"atlatl": {"r": -4 * lag}, "knot": {"r": 6 * lag}, "quiver": {"r": 3 * lag}}
    carry = merge({"torso": {"r": -3}}, thr(-55, 80, -150))
    return K.walk(RIG, f, carry, GAIT, LEGS, arms={"l": K.Arm(ARM_L)}, lean=-10.0, extra=extra, report=report)


# attack A: 11 unique frames on SMALL_MELEE_MS; frame 4 is the hold-loop partner (aim wobble), 5 the smear
#        read hook  cock  HOLD  wobble WHIP IMP   follow draw  load  settle
A_A = [-30, -20, 120, 150, 148, 70, 10, -40, -110, -60, -30]
A_B = [70, 80, 150, 175, 172, 110, 40, -20, -60, 20, 70]
A_C = [-160, -150, -150, -140, -144, -10, 60, 20, -60, -140, -160]
A_X = [-0.5, -1.0, -2.5, -4.0, -4.2, 2.0, 7.0, 6.5, 3.0, 1.0, 0.5]
A_Z = [0.0, -0.6, 0.0, 0.6, 0.4, 0.5, -2.4, -1.0, -0.8, -0.2, 0.0]
A_Q = [-0.03, -0.05, 0.04, 0.08, 0.06, 0.06, -0.14, 0.03, -0.04, 0.01, 0.0]
A_T = [-2, 4, 18, 30, 29, -8, -26, -20, -8, -3, -2]
A_H = [0, -2, -8, -12, -11, 4, 12, 8, 4, 1, 0]
A_THR = [0, -4, -12, -16, -16, 14, 34, 28, 14, 4, 1]
A_SHR = [0, 4, 8, 10, 10, -22, -20, -12, -6, -2, 0]
A_THL = [0, 6, 18, 24, 24, -4, -20, -16, -8, -2, -1]
A_SHL = [0, -6, -16, -22, -22, -10, -4, -4, -2, 0, 0]
A_OA = [-60, -20, 20, 40, 42, -40, -90, -80, -150, -100, -60]
A_OB = [-10, 30, 50, 60, 62, 0, -40, -30, -120, -40, -10]


def _attack_pose(f):
    pose = merge(thr(A_A[f], A_B[f], A_C[f]), off(A_OA[f], A_OB[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "dart": {"hide": f in (6, 7, 8)}, "reload": {"show": f == 8},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _whip(**kw):
    hook = (FR[0] - 1.6, FR[1], FR[2] + BOARD)
    s = {"kind": "arc", "joint": "atlatl", "inner": (FR[0], FR[1], FR[2] + 2.0), "outer": hook, "color": BONE,
         "taper": 0.15, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.4, "samples": 16}
    s.update(kw)
    return s


def _attack_clip():
    ov = {
        5: [_whip(**{"from": 4})],
        6: [_whip(t0=0.3, t1=0.95, lines=2),
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 81, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=5, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# attack B: kneeling lob. 0 = A read, 1 = A hook, 2 kneel down, 3 HOLD (on one knee, the arm cocked low
# and back, the dart pointing steeply up), 4 wobble, 5 flick up (smear), 6 IMPACT (arm thrown up high,
# the dart leaves steeply), 7 follow, 8-10 = A draw, load, settle
def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    tab = [  # a, b, c, x, z, q, t, h, thr, shr, thl, shl
        (-120, -80, -120, -1.5, -6.0, -0.08, 6, -6, 70, -100, -10, -40),
        (-150, -120, -110, -2.5, -10.0, -0.10, 10, -14, 86, -120, -30, -60),
        (-148, -118, -113, -2.5, -10.0, -0.10, 10, -14, 86, -120, -30, -60),
        (-20, 40, 40, 0.0, -9.0, 0.06, -4, -10, 84, -116, -26, -58),
        (80, 110, 110, 1.0, -8.0, -0.12, -12, -16, 82, -114, -24, -56),
        (60, 90, 90, 1.0, -8.5, 0.02, -8, -10, 82, -114, -24, -56),
    ][i - 2]
    a, b, c, x, z, q, t, h, thr_, shr, thl, shl = tab
    pose = merge(thr(a, b, c), off(-100, -60), {
        "torso": {"r": t}, "head": {"r": h},
        "thigh_r": {"r": thr_}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
        "dart": {"hide": i in (6, 7)},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q))
    return merge(pose, F.expr("grit" if i < 5 else "yell"), {"brow": {"z": -1.0}})


def _attack_b():
    ov = {5: [_whip(**{"from": 4})],
          6: [{"kind": "dust", "ground": (6.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 82, "spread": 0.8}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    return K.hit(k, stance(), extra=lambda a: {"atlatl": {"r": 20 * a}, "knot": {"r": 10 * a}})


LOOSE = [None, (8, 0, 70, 60), (12, 0, 90, 160), (16, 0, 96, 270), (20, 0, 80, 380),
         (24, 0, 52, 480), (27, 0, 26, 560), (29, 0, 8, 590), (30, 0, 8, 590), (30, 0, 8, 590)]


def _die(k):
    def extra(kk, flail):
        out = {}
        if LOOSE[kk] is not None:
            x, y, z, r = LOOSE[kk]
            out["dart"] = {"hide": True}
            out["loose"] = {"show": True, "x": x, "z": z, "r": r}
        return out
    return K.die_d1(k, stance(), HEIGHT_LU, extra=extra)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
