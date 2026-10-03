"""Bolas Thrower: Stone Age common ranged snarer (CONTENT_PLAN 5.1). Hits slow the target 25%.
Bolas (proj.bolas), blunt, 64 lu.

Look (A11, PLAN.md): a squat, round-faced plains hunter with a long braid and a team headband with
two bone beads, a team fur-trimmed tunic and skirt, a coil of spare cord over one shoulder, and a
three-ball bolas: three leather-wrapped stones on cords knotted to a short grip. Fur boots.

"A viewer expects it to whirl the bolas round and fling it so the cords wrap the legs, and to jog."

Animation (ANIM_SPEC G1, appendix B throwers: distinct from the Pebbler's vertical sling ring):
  idle      lets the bolas balls clack and swing, tests the cord, blink
  walk      walk v3 bounce jog (card 65 x 1.25 = 81.25 lu/s): the bolas swinging in the near hand,
            the far arm pumping
  attack    LASSO WHIRL, SIDE-ARM FLING: raises the bolas over his head and whirls it flat like a
            lasso (a wide flat ring smear; the hold loops the whirl while the sim wind-up lasts), steps
            in and flings it side-arm at chest height (the bolas leaves the hand on the impact frame)
  attack_b  SPIN THROW: turns his whole body once with the bolas trailing at arm's length (a ring
            round him) and lets go low, coming out of the turn
  hit       light;  die  D3 dizzy spin, tangled in his own cord, sits down hard
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "bolas_thrower"
GAIT_NAME = "biped"
NAME = "Bolas Thrower"
HEIGHT_LU = 64
CANVAS = (256, 228)
FEET = (112, 204)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30)}
NO_RETIME = True

SKIN = "#C9A385"
HAIR = "#2F2723"
FUR = "#857664"
BOOT = "#7A6656"
CORD = "#9C8466"
BALL = "#C4AE88"
BALL_HI = "#A88E74"
BONE = "#EDE3C8"

HIP_Y, SH_Y = 5.6, 11.2
CORD_L = 15.0


def _bolas(rig, joint, fist):
    """Grip knot at the fist, three cords fanning out along -Z (rest hanging) with wrapped stones."""
    fx, fy, fz = fist
    g = Geo().blob((fx + 0.4, fy - 0.4, fz - 1.6), (1.8, 1.8, 2.0), p=2.2)
    for k, (dx, dy) in enumerate(((-2.6, 0.0), (0.0, -2.2), (2.4, 0.4))):
        g.capsule((fx + 0.4, fy - 0.4, fz - 2.0), (fx + dx, fy + dy, fz - CORD_L), 0.6)
    rig.part(joint, g, CORD, outline=0.5)
    g = Geo()
    for dx, dy in ((-2.6, 0.0), (0.0, -2.2), (2.4, 0.4)):
        g.blob((fx + dx, fy + dy, fz - CORD_L - 1.8), (3.6, 3.6, 3.6), p=2.1)
    rig.part(joint, g, BALL)
    g = Geo()
    for dx, dy in ((-2.6, 0.0), (0.0, -2.2), (2.4, 0.4)):
        g.capsule((fx + dx - 2.2, fy + dy - 1.6, fz - CORD_L - 1.4), (fx + dx + 2.2, fy + dy - 1.6, fz - CORD_L - 2.2), 0.7)
    rig.part(joint, g, team=True, outline=0.4)


def build(rig):
    global RIG, ARM_R, ARM_L, FR, TIP
    RIG = rig
    body = K.body(rig, SKIN, BOOT, stocky=1.05, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(10.6, 9.4, 10.2), foot_len=4.6)
    fr, fl = body.fist["r"], body.fist["l"]
    FR = fr
    K.pelt(rig, FUR, r=(11.2, 10.0, 7.6), skirt_r=(11.4, 10.2, 4.6))
    K.wraps(rig, HIP_Y, SH_Y, wrists=("r", "l"))
    g = Geo().lathe([(11.0, 0), (11.9, 0.4), (11.9, 4.6), (10.8, 5.0)], (0.4, 0, 21.6), (0.6, 0, 26.6), segs=24)
    rig.part("torso", g, team=True, outline=0.7)   # a wide team belt
    # a coil of spare cord over the far shoulder
    g = Geo().lathe([(6.0, 0), (7.4, 0.6), (7.4, 2.6), (6.0, 3.2)], (-2.0, 3.0, 31.0), (-1.4, 5.0, 31.4), segs=18,
                    rot=(0, 30, 0))
    rig.part("torso", g, team=True, outline=0.6)   # the spare cord is team-dyed (reads from behind)
    # long braid, team headband with bone beads; round face
    hair = Geo().blob((-2.6, 0, 54.4), (9.8, 10.6, 5.6), p=2.2)
    hair.blob((-8.0, 0, 48.0), (4.6, 9.4, 7.6), p=2.2)
    band = Geo().lathe([(10.0, 0), (10.9, 0.4), (10.9, 3.0), (9.6, 3.4)], (1.6, 0, 52.2), (0.2, 0, 55.2), segs=22)
    K.head(rig, SKIN, z=47.5, r=(10.8, 10.4, 10.4), jaw=(7.6, 8.6, 5.4), extra_geos=(hair, band), brow_col=HAIR)
    rig.part("head", hair, HAIR, finish="hair")
    rig.part("head", band, team=True, outline=0.8)
    g = Geo().sphere((3.0, -10.8, 53.6), 1.4, cuts=2).sphere((-1.0, -10.6, 54.2), 1.4, cuts=2)
    rig.part("head", g, BONE, outline=0.5)
    rig.secondary("braid", "head", (-8.0, 0, 50.0), (-12.0, 0, 34.0), max_deg=18, gain=1.3)
    g = Geo()
    for k in range(5):
        z = 48.0 - k * 3.4
        g.blob((-9.6 - k * 0.6, 0, z), (2.6 - k * 0.2, 2.6 - k * 0.2, 2.2), p=2.2)
    rig.part("braid", g, HAIR, finish="hair")
    g = Geo().lathe([(1.8, 0), (2.0, 0.4), (2.0, 1.6), (1.8, 2.0)], (-12.6, 0, 31.4), segs=12)
    rig.part("braid", g, team=True, outline=0.5)
    # bolas in the near fist; a held item whose rest points down (c = -90 hangs it)
    rig.joint("bolas", "fore_r", fr)
    _bolas(rig, "bolas", fr)
    TIP = (fr[0], fr[1] - 0.6, fr[2] - CORD_L - 1.8)
    rig.track("muzzle", "bolas", TIP)
    ARM_R = body.arm("r", "bolas", (fr[0], fr[1], fr[2] - CORD_L))
    ARM_L = body.arm("l")


RIG = ARM_R = ARM_L = FR = TIP = None
SPEED = 81.25
LEGS = K.legs(HIP_Y)
GAIT = K.jog(LEGS, SPEED, cycle=616)


def bol(a, b, c, rz=0.0):
    p = ARM_R.pose(a, b, c)
    if rz:
        p["bolas"]["rz"] = rz
    return p


def off(a, b):
    return ARM_L.pose(a, b)


def stance():
    return merge(bol(-40, -10, -95), off(-60, 0), {"torso": {"r": -2}})


def _idle(f):
    sw = math.sin(2 * math.pi * f / 8)

    def extra(ctx):
        return merge(bol(-40, -10 + 4 * sw, -95 + 14 * sw), {"braid": {"r": 6 * ctx["lag"]}})
    return M.idle_v2(f, K.strip(stance(), "arm_r", "fore_r", "bolas"), extra=extra, face_blink=F.expr("blink"), blink=5)


class _BolArm:
    @staticmethod
    def pose(a, b):
        return bol(a, b, -62 + 0.5 * (a + 90))   # balls ride at knee height, clear of the stepping feet


def _walk(f, report=None):
    def extra(ctx):
        return {"bolas": {"r": 10 * math.cos(ctx["lag_p"])}, "braid": {"r": 6 * ctx["bob_lag"] / max(ctx["amp"], 1e-3)}}
    arms = {"l": K.Arm(ARM_L), "r": _BolArm()}
    return K.walk(RIG, f, {"torso": {"r": -3}}, GAIT, LEGS, arms=arms, extra=extra, report=report)


# attack A: lasso whirl, side-arm fling. 11 unique frames, SMALL_MELEE_MS; hold loop [3, 4]
#        read  dip  raise HOLD  whirl2 swing IMP   follow  reload settle settle
A_A = [-40, -55, 80, 95, 95, 10, -5, -40, -70, -50, -40]
A_B = [-10, -30, 95, 100, 100, 5, -2, -40, -40, -14, -10]
A_C = [-95, -110, 40, 30, 30, 0, 0, -40, -110, -100, -95]
A_RZ = [0, 0, 0, 0, 50, 0, 0, 0, 0, 0, 0]
A_X = [-0.5, -1.5, -2.0, -2.5, -2.5, 3.0, 7.0, 6.0, 3.5, 1.5, 0.5]
A_Z = [0.0, -2.4, 0.8, 1.4, 1.0, -1.0, -2.4, -1.0, -0.8, -0.3, 0.0]
A_Q = [-0.03, -0.12, 0.06, 0.10, 0.08, 0.0, -0.14, 0.03, -0.04, 0.01, 0.0]
A_T = [-2, 6, 4, 6, 6, -10, -20, -14, -6, -3, -2]
A_TRZ = [0, 0, 10, 14, 14, -10, -22, -12, 0, 0, 0]
A_H = [0, -2, -8, -10, -10, 2, 8, 4, 6, 2, 0]
A_THR = [0, -6, -2, -4, -4, 20, 30, 22, 12, 4, 1]
A_SHR = [0, 6, 0, 0, 0, -24, -14, -8, -4, -2, 0]
A_THL = [0, 8, 4, 8, 8, -10, -22, -16, -10, -4, -1]
A_SHL = [0, -10, -4, -8, -8, -8, -4, -4, -2, 0, 0]
A_OA = [-60, -40, -20, -10, -10, -60, -100, -90, -60, -60, -60]
A_OB = [0, 20, 30, 40, 40, 0, -40, -30, 0, 0, 0]


def _attack_pose(f):
    pose = merge(bol(A_A[f], A_B[f], A_C[f], A_RZ[f]), off(A_OA[f], A_OB[f]), {
        "torso": {"r": A_T[f], "rz": A_TRZ[f]}, "head": {"r": A_H[f]},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "bolas": {"hide": f in (6, 7)},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _ring(**kw):
    s = {"kind": "arc", "joint": "bolas", "inner": (FR[0], FR[1], FR[2] - 3.0), "outer": TIP, "color": BALL_HI,
         "taper": 0.35, "white": 0.6, "lines": 2, "line_gap_lu": 2.4, "band": 0.38}
    s.update(kw)
    return s


def _attack_clip():
    ov = {
        3: [_ring(t0=0.05, t1=0.9, samples=24, pose_from=merge(_attack_pose(3), {"bolas": {"rz": -300}}))],
        4: [_ring(t0=0.05, t1=0.9, samples=24, pose_from=merge(_attack_pose(4), {"bolas": {"rz": -300}}))],
        5: [_ring(t0=0.0, t1=0.85, samples=12, lines=3)],
        6: [{"kind": "dust", "ground": (12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 71, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# attack B: spin throw. 0 = A read, 1 = A dip, 2 the turn starts (back to the target), 3 HOLD (half
# turned away, crouched, the bolas trailing at arm's length low behind), 4 turn continues (loop partner),
# 5 coming round, 6 IMPACT (low release, leaning out of the turn), 7 follow, 8-10 = A reload, settle
B_SEQ = list(range(11))


def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    tab = [  # a, b, c, trz, x, z, q, t, thr, shr, thl, shl
        (-140, -150, -160, 60, -1.5, -2.0, -0.04, -2, 6, -10, -4, -6),
        (-170, -175, -178, 110, -2.5, -4.2, -0.10, -6, 16, -30, 10, -20),
        (-170, -175, -178, 140, -2.5, -4.2, -0.10, -6, 16, -30, 10, -20),
        (-90, -80, -100, 250, 1.0, -3.0, 0.02, -10, 18, -24, -8, -14),
        (-40, -30, -20, 360, 5.0, -2.6, -0.12, -16, 26, -20, -14, -8),
        (-50, -40, -40, 360, 4.0, -1.4, 0.02, -10, 18, -10, -10, -4),
    ][i - 2]
    a, b, c, trz, x, z, q, t, thr, shr, thl, shl = tab
    pose = merge(bol(a, b, c), off(-120, -60), {
        "torso": {"r": t}, "head": {"r": -t * 0.4},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
        "bolas": {"hide": i in (6, 7)},
    }, M.body_about((0, 0, 24), x=x, z=z, q=q, rz=trz))
    return merge(pose, F.expr("grit" if i < 5 else "yell"), {"brow": {"z": -1.0}})


def _attack_b():
    ov = {
        3: [_ring(t0=0.05, t1=0.9, samples=24, band=0.42, **{"from": 2})],
        4: [_ring(t0=0.05, t1=0.9, samples=24, band=0.42, **{"from": 3})],
        5: [_ring(t0=0.0, t1=0.85, samples=16, band=0.42, **{"from": 4})],
        6: [{"kind": "dust", "ground": (8.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 72, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    return K.hit(k, stance(), extra=lambda a: {"bolas": {"r": 30 * a}, "braid": {"r": 12 * a}})


def _die(k):
    return K.die_d3(k, stance(), HEIGHT_LU, extra=lambda kk, sit: {"bolas": {"r": 60 * sit + 20 * math.sin(kk)}})


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
