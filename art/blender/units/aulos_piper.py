"""Aulos Piper: Bronze Age Rare Support, aura (CONTENT_PLAN 5.2 #8). Allies within 160 move 15% faster, ~68 lu.

A viewer expects a piper to puff up his cheeks and blow a sharp note at the enemy, and to march
to the beat with his knees high.

Look: a musician in a long team chiton with a sandstone key border, a verdigris laurel wreath on
curly hair, the leather mouth band (phorbeia) round his cheeks, sandals. He plays the double
aulos: two reed pipes that spread from the lips, polished bronze rings and flared bells, one in
each hand.

Animation (cartoon kit v2):
  idle    taps a foot and wiggles the fingers on the pipes, a little puff of the cheeks, blink
  walk    a strutting march with the knees high, the robe swinging a frame late
  attack  BIG BREATH, SHARP NOTE: leans back filling his chest, the cheeks balloon (held
          extreme: puffed cheeks, the pipes raised), then he bends forward and blasts a note
          (sound rings burst from the bells on the impact frame), eyes squeezed
  hit     light: the cheeks deflate with a squeak face, head snaps back
  die     D3 dizzy sit (supports), the pipes drop in his lap
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "aulos_piper"
NAME = "Aulos Piper"
HEIGHT_LU = 68
CANVAS = (290, 250)
FEET = (134, 216)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}
NO_RETIME = True

MOUTH = (13.0, 0.0, 44.4)          # head space, the pipes start at the lips
PIPE_W = -58.0                      # pipe direction (degrees, side plane) at rest
PIPE_L = 21.0


def _pipe(rig, joint, y, ang, length=PIPE_L):
    mx, _, mz = MOUTH
    a = math.radians(ang)
    ex, ez = mx + length * math.cos(a), mz + length * math.sin(a)
    g = Geo().capsule((mx + 0.5, y, mz), (ex, y, ez), 0.95, 1.1)
    rig.part(joint, g, "#C9B48E", outline=0.5)
    g = Geo()
    for t in (0.3, 0.62):
        p = (mx + length * t * math.cos(a), y, mz + length * t * math.sin(a))
        g.lathe([(0, 0), (1.55, 0.1), (1.55, 1.0), (0, 1.1)], p,
                (p[0] + math.cos(a), y, p[2] + math.sin(a)), segs=10)
    rig.part(joint, g, B.BRONZE, finish=B.POLISH, outline=0.4)
    g = Geo().lathe([(1.2, 0), (2.8, 2.4), (3.0, 3.0), (0, 3.0)], (ex - 2.2 * math.cos(a), y, ez - 2.2 * math.sin(a)),
                    (ex + 0.8 * math.cos(a), y, ez + 0.8 * math.sin(a)), segs=12)
    rig.part(joint, g, B.BRONZE, finish=B.POLISH, outline=0.5)
    return (ex + 0.8 * math.cos(a), y, ez + 0.8 * math.sin(a))


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig, greaves=False)
    K.laces(rig)
    # long team chiton to mid-shin with a sandstone key border, a verdigris belt
    g = Geo().blob((0.3, 0, 28.0), (10.2, 9.4, 11.4), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, team=True)
    rig.secondary("hem", "hips", (0.5, 0, 16.5), (0.5, 0, 5.0), max_deg=12, gain=1.0)
    g = Geo().blob((0.6, 0, 11.0), (12.0, 11.0, 8.2), p=2.4, taper=(1.25, 0.94))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.6, 0, 3.6), (12.8, 11.8, 1.5), p=3.0)
    rig.part("hem", g, B.SAND_LT, outline=0.6)
    g = Geo()
    for k in range(12):
        a = math.pi * (0.5 + 1.9 * k / 11)
        g.blob((12.6 * math.cos(a), 11.6 * math.sin(a), 5.6), (1.2, 1.2, 1.2), p=3.0)
    rig.part("hem", g, B.SAND_LT, outline=0.4)
    g = Geo().blob((0.4, 0, 20.6), (11.0, 10.1, 1.8), p=3.2)
    rig.part("torso", g, B.VERD_DK)

    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), brow_tilt=-1.0, mouth_z=43.6)
    K.curly_hair(rig, z=-1.5)
    g = Geo()                                                        # laurel wreath
    for k in range(9):
        a = math.pi * (0.15 + 1.7 * k / 8)
        x, y = 11.8 * math.cos(a) + 1.0, 11.6 * math.sin(a)
        g.blob((x, y, 55.6), (2.4, 1.2, 1.3), p=2.2, rot=(0, 0, math.degrees(a)))
    rig.part("head", g, B.VERD, outline=0.5)
    g = Geo().blob((4.0, 0, 46.0), (10.4, 11.6, 1.4), p=3.0, rot=(0, 18, 0))   # the phorbeia mouth band
    rig.part("head", g, B.LEATHER, outline=0.5)
    rig.joint("cheeks", "head", (12.0, 0, 46.0), hidden=True)
    g = Geo()
    for y in (-6.4, 6.0):
        g.blob((10.8, y, 46.2), (3.8, 2.8, 3.3), p=2.2)
    rig.part("cheeks", g, "#E6B496", outline=0.6)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=3.9, r1=3.5)
    # the double aulos: two pipes spreading from the lips (on the head, so they stay at the mouth)
    rig.joint("pipes", "head", MOUTH)
    b1 = _pipe(rig, "pipes", -3.2, PIPE_W - 6.0)
    _pipe(rig, "pipes", 2.6, PIPE_W + 8.0)
    rig.track("muzzle", "pipes", b1)
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
SH = (0.0, B.SHOULDER_Z)
HEAD_J = (1.0, 38.0)


def _hands(head_r=0.0, pipes_r=0.0, torso=0.0):
    """Both hands on the pipes (IK in torso space), following the head and pipe tilt."""
    out = {}
    hr = math.radians(head_r)
    for s, t, dy in (("r", 0.42, -6.0), ("l", 0.72, 8.0)):
        ang = math.radians(PIPE_W + pipes_r + head_r + (-6.0 if s == "r" else 8.0))
        mx, mz = MOUTH[0] - HEAD_J[0], MOUTH[2] - HEAD_J[1]
        rx = HEAD_J[0] + mx * math.cos(hr) - mz * math.sin(hr)
        rz = HEAD_J[1] + mx * math.sin(hr) + mz * math.cos(hr)
        tx = rx + PIPE_L * t * math.cos(ang)
        tz = rz + PIPE_L * t * math.sin(ang)
        a, f = B.ik2(SH, (tx, tz - 1.0))
        out.update(B.arm(s, a, f))
    return out


STANCE = merge(_hands(), {"torso": {"r": -2}})


def _idle(f):
    tap = [0.0, 1.0, 0.0, 1.0, 0.0, 0.0][f]

    def extra(ctx):
        return merge(_hands(head_r=-2.2 * ctx["lag"]), {
            "shin_l": {"r": -12 * tap}, "thigh_l": {"r": 6 * tap},
            "cheeks": {"show": f == 2}, "hand_r": {"r": 8 * tap}, "hand_l": {"r": -8 * tap}})
    return M.idle_v2(f, {"torso": {"r": -2}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


def _walk(f):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return merge(_hands(head_r=-(-2.0) * 0.5 - 2.5 * lag), {"pipes": {"r": 2 * lag}})
    return M.walk_v2(f, {"torso": {"r": -2}}, HEIGHT_LU, thigh=44.0, knee=70.0, lift_lu=9.0,
                     bob_pct=0.07, lean=2.0, arm=0.0, fore=0.0, arms=(), extra=extra)


#        read inhale puff HOLD  bend  lead  BLAST over  recov settle settle
A_T = [-2, 8, 14, 18, 6, -6, -18, -20, -10, -4, -2]
A_H = [0, 8, 14, 18, 8, -2, -10, -12, -4, 0, 0]
A_P = [0, 6, 10, 14, 10, 6, 18, 20, 8, 2, 0]
A_Q = [-0.02, 0.05, 0.08, 0.1, 0.02, -0.04, -0.14, -0.1, -0.03, 0.0, 0.0]
A_X = [0.0, -1.0, -2.0, -2.5, -0.5, 1.5, 3.5, 4.0, 2.0, 0.5, 0.0]
A_Z = [0.0, 1.0, 1.6, 2.0, 0.6, -0.4, -1.8, -1.4, -0.6, 0.0, 0.0]
A_THR = [0, -6, -8, -10, 0, 10, 18, 20, 8, 2, 0]
A_THL = [0, 6, 8, 10, 2, -8, -16, -18, -6, -2, 0]
A_SHL = [0, -4, -6, -8, -2, -6, -10, -10, -4, 0, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(_hands(head_r=A_H[f], pipes_r=A_P[f]), {
        "torso": {"r": t}, "head": {"r": A_H[f]}, "pipes": {"r": A_P[f]},
        "thigh_r": {"r": A_THR[f]}, "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "cheeks": {"show": 2 <= f <= 5, "s": 1.15 if f == 3 else 1.0},
    }, M.body_about((0, 0, 24), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (1, 2, 3):
        pose = merge(pose, {"brow": {"z": 1.0}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    return pose


def _attack_clip():
    a = math.radians(PIPE_W - 6.0)
    bell = (MOUTH[0] + (PIPE_L + 2.0) * math.cos(a), -3.2, MOUTH[2] + (PIPE_L + 2.0) * math.sin(a))
    ov = {
        6: [{"kind": "rings", "joint": "pipes", "point": bell, "radii_lu": (6.0, 11.0, 16.0),
             "a0": -50.0, "a1": 40.0},
            {"kind": "burst", "joint": "pipes", "point": bell, "r0_lu": 4.0, "r1_lu": 8.0, "n": 4,
             "a0": -60.0, "arc": 90.0}],
        7: [{"kind": "rings", "joint": "pipes", "point": bell, "radii_lu": (12.0, 18.0), "a0": -40.0, "a1": 30.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov)


def _hit(k):
    def recoil(a):
        return merge(_hands(head_r=14 * a), {"head": {"r": 14 * a}, "torso": {"r": 10 * a},
                                            "thigh_r": {"r": 20 * max(a, 0)}, "shin_r": {"r": -24 * max(a, 0)},
                                            "brow": {"z": 1.4 * max(a, 0)}})
    return M.hit_light(k, {"torso": {"r": -2}}, recoil, face_hurt=F.expr("squeeze", "o"))


def _die(k):
    # D3 dizzy sit (supports): the silhouette changes, the pipes drop into the lap
    sit = min(1.0, max(0.0, (k - 2) / 2.0))
    pose = merge(M.die_d3(k, center_z=30.0, height=HEIGHT_LU), {
        "hips": {"z": -12.5 * sit},
        "thigh_r": {"r": 82 * sit}, "shin_r": {"r": -30 * sit},
        "thigh_l": {"r": 84 * sit}, "shin_l": {"r": -28 * sit},
        "torso": {"r": 28 * sit}, "head": {"r": -6 * sit, "rx": 14 * sit},
        "arm_r": {"r": 40 * sit + 20}, "fore_r": {"r": -10 * sit},
        "arm_l": {"r": -40 * sit + 10}, "fore_l": {"r": 10 * sit},
        "pipes": {"r": -60 * sit, "x": 4 * sit, "z": -10 * sit},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 4:
        pose = merge(pose, F.expr("spiral", "o"))
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
