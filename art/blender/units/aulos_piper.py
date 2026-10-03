"""Aulos Piper: Bronze Age Rare Support, aura (CONTENT_PLAN 5.2 #8). Allies within 160 move 15% faster, ~68 lu.

A viewer expects a piper to puff up his cheeks and blow a sharp note at the enemy, and to march
to the beat with his knees high.

Look: a musician in a long team chiton with a sandstone key border, a verdigris laurel wreath on
curly hair, the leather mouth band (phorbeia) round his cheeks, sandals. He plays the double
aulos: two reed pipes that spread from the lips, polished bronze rings and flared bells, one in
each hand.

Animation (cartoon kit v2):
  idle    taps a foot and wiggles the fingers on the pipes, a little puff of the cheeks, blink
  walk    walk v3 brisk strut at ground speed (ANIM_SPEC G2, 81.25 lu/s): knees high, the shortened
          chiton kicking with the knees, playing the march on the pipes
  attack_b  CROUCH AND TRILL: ducks low with the head down and the pipes pointing at the ground (held
          extreme), then springs up and trills the note out level at the enemy
  attack  BIG BREATH, SHARP NOTE: leans back filling his chest, the cheeks balloon (held
          extreme: puffed cheeks, the pipes raised), then he bends forward and blasts a note
          (sound rings burst from the bells on the impact frame), eyes squeezed
          A and B hold the breath with a cheek wobble while the sim wind-up lasts (holdLoop)
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
GAIT_NAME = "biped"
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
    global RIG
    RIG = rig
    B.skeleton_v3(rig)           # walk v3: longer legs, planted feet (ANIM_SPEC 2.0 rule 5)
    B.sandal_legs_v3(rig, greaves=False, wraps="team")
    # team chiton, shortened to the knee for walk v3 (the hem 11 lu above the soles, ANIM_SPEC G2), with a
    # sandstone key border and a verdigris belt; the skirt kicks with the knees (follow-through)
    g = Geo().blob((0.3, 0, 28.0), (10.2, 9.4, 11.4), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, team=True)
    rig.secondary("hem", "hips", (0.5, 0, 16.5), (0.5, 0, 8.0), max_deg=14, gain=1.1)
    rig.rest_offset["hem"] = (0, 0, B.V3_LIFT)
    g = Geo().blob((0.6, 0, 14.0), (12.0, 11.0, 5.4), p=2.4, taper=(1.25, 0.94))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.6, 0, 9.6), (12.8, 11.8, 1.4), p=3.0)
    rig.part("hem", g, B.SAND_LT, outline=0.6)
    g = Geo()
    for k in range(12):
        a = math.pi * (0.5 + 1.9 * k / 11)
        g.blob((12.6 * math.cos(a), 11.6 * math.sin(a), 11.4), (1.2, 1.2, 1.2), p=3.0)
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


# -- walk v3: G2 brisk strut at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 70 ms, knees high -----
RIG = None
SPEED = 81.25
LEGS = B.walk_legs_v3()
GAIT = B.jog_gait(SPEED, LEGS, cycle_ms=560, stance=0.44, lift=8.5, kick=2.0, toe_off=20.0, early_lift=1.4)
STRUT_BOB = [-3.0, -3.6, 0.2, 1.6]


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        hr = -12.0 - 2.5 * lag                      # head down over the pipes, playing the march
        return merge(_hands(head_r=hr, pipes_r=10.0), {"head": {"r": hr}, "pipes": {"r": 10.0 + 2 * lag},
                                                      "hem": {"r": 5 * lag}})
    return M.walk_v3(RIG, f, {"torso": {"r": -2}}, GAIT, legs=LEGS, bob=STRUT_BOB, sq=M.BRISK_SQ, lean=2.0,
                     twist=5.0, nod=2.0, sway=3.0, extra=extra, report=report)


def _feet(pose, fr, fl, lr=0.0, ll=0.0, ar=0.0, al=0.0):
    return B.plant(RIG, pose, LEGS, r=(fr, lr, ar), l=(fl, ll, al))


# 12 steps: read, inhale, puff, HOLD, wobble (holdLoop partner), bend, lead | BLAST, over, recover,
# settle, settle. Pre-impact 290 of 680 ms (impactAt 0.4265); the hold is 35% of the pre-impact time.
ATK_MS = [30, 40, 40, 102, 30, 30, 18, 120, 60, 50, 70, 90]
ATK_IMPACT = 7
#        read inhale puff HOLD wobl bend  lead  BLAST over  recov settle settle
A_T = [-2, 8, 14, 18, 17, 6, -6, -18, -20, -10, -4, -2]
A_H = [0, 8, 14, 18, 17, 8, -2, -10, -12, -4, 0, 0]
A_P = [0, 6, 10, 14, 15, 10, 6, 18, 20, 8, 2, 0]
A_Q = [-0.02, 0.05, 0.08, 0.1, 0.08, 0.02, -0.04, -0.14, -0.1, -0.03, 0.0, 0.0]
A_X = [0.0, -1.0, -2.0, -2.5, -2.3, -0.5, 1.5, 3.5, 4.0, 2.0, 0.5, 0.0]
A_Z = [0.0, 1.0, 1.6, 2.0, 1.6, 0.6, -0.4, -1.8, -1.4, -0.6, 0.0, 0.0]
A_FR = [2.0, 1.0, 0.0, -1.0, -1.0, 2.0, 5.0, 9.0, 9.5, 6.0, 3.0, 2.0]
A_FL = [-2.0, -2.0, -3.0, -4.0, -4.0, -3.0, -3.0, -2.0, -2.0, -2.0, -2.0, -2.0]
A_LR = [0, 0, 0, 0, 0, 2.0, 1.5, 0, 0, 0, 0, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(_hands(head_r=A_H[f], pipes_r=A_P[f]), {
        "torso": {"r": t}, "head": {"r": A_H[f]}, "pipes": {"r": A_P[f]},
        "cheeks": {"show": 2 <= f <= 6, "s": 1.15 if f == 3 else 1.22 if f == 4 else 1.0},
    }, M.body_about((0, 0, 24), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    pose = _feet(pose, A_FR[f], A_FL[f], lr=A_LR[f])
    if f in (1, 2, 3, 4):
        pose = merge(pose, {"brow": {"z": 1.0}})
    elif f in (7, 8):
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    return pose


BELL = (MOUTH[0] + (PIPE_L + 2.0) * math.cos(math.radians(PIPE_W - 6.0)), -3.2,
        MOUTH[2] + (PIPE_L + 2.0) * math.sin(math.radians(PIPE_W - 6.0)))


def _attack_clip():
    ov = {
        7: [{"kind": "rings", "joint": "pipes", "point": BELL, "radii_lu": (6.0, 11.0, 16.0),
             "a0": -50.0, "a1": 40.0},
            {"kind": "burst", "joint": "pipes", "point": BELL, "r0_lu": 4.0, "r1_lu": 8.0, "n": 4,
             "a0": -60.0, "arc": 90.0}],
        8: [{"kind": "rings", "joint": "pipes", "point": BELL, "radii_lu": (12.0, 18.0), "a0": -40.0, "a1": 30.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(12)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


# -- attack B: crouch and trill, the note sent out level ----------------------------------------------
# 0-1 = A read and inhale, 2 duck, 3 HOLD (a low crouch, the head down, the pipes pointing at the
# ground), 4 wobble, 5 rising, 6 lead, 7 BLAST (risen, the pipes level at the enemy, rings out
# forward), 8-11 = A's
#      duck HOLD wobl rise lead BLAST
B_T = [-12, -22, -21, -8, 2, 6]
B_H = [-16, -26, -25, -6, 18, 30]
B_P = [-6, -14, -13, 0, 12, 22]
B_Q = [-0.06, -0.12, -0.10, 0.02, 0.06, -0.06]
B_X = [0.0, 0.5, 0.5, 2.0, 3.0, 4.0]
B_Z = [-4.0, -8.0, -8.2, -3.0, 0.5, 0.0]
B_FR = [4.0, 6.0, 6.0, 7.0, 8.0, 9.0]
B_FL = [-5.0, -7.0, -7.0, -5.0, -4.0, -3.0]


def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    k = i - 2
    pose = merge(_hands(head_r=B_H[k], pipes_r=B_P[k]), {
        "torso": {"r": B_T[k]}, "head": {"r": B_H[k]}, "pipes": {"r": B_P[k]},
        "cheeks": {"show": i <= 6, "s": 1.2 if i in (3, 4) else 1.0},
    }, M.body_about((0, 0, 24), x=B_X[k], z=B_Z[k], q=B_Q[k]))
    pose = _feet(pose, B_FR[k], B_FL[k])
    if i == 7:
        pose = merge(pose, F.expr("squeeze"), {"brow": {"z": -1.0}})
    else:
        pose = merge(pose, {"brow": {"z": 1.0}})
    return pose


def _attack_b():
    ov = {
        7: [{"kind": "rings", "joint": "pipes", "point": BELL, "radii_lu": (6.0, 11.0, 16.0),
             "a0": -40.0, "a1": 40.0},
            {"kind": "burst", "joint": "pipes", "point": BELL, "r0_lu": 4.0, "r1_lu": 8.0, "n": 4,
             "a0": -40.0, "arc": 80.0},
            {"kind": "dust", "ground": (6.0, 0.0), "size_lu": 4.5, "puffs": 3, "seed": 51, "spread": 0.8}],
        8: [{"kind": "rings", "joint": "pipes", "point": BELL, "radii_lu": (12.0, 18.0), "a0": -30.0, "a1": 30.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10),
             11: ("attack", 11)}
    return M.clip("attack_b", [_b_pose(i) for i in range(12)], ATK_MS, impact=ATK_IMPACT, overlays=ov,
                  reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


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
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
