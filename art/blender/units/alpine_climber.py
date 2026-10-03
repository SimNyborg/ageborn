"""Alpine Climber: Industrial Age epic skirmisher (CONTENT_PLAN 5.5). Ice axe, pounce, ~66 lu.

Look (A11, Industrial palette): a lean mountaineer with a red-brown beard in a team felt Tyrolean
hat with a cream feather, a team wool jacket with a cream cog, tweed knickerbockers, cream knee
socks, hobnail boots, a coil of cream rope over the far shoulder and a short ice axe: a pale-wood
haft with an iron spike and a steel head (a pick in front, a flat adze behind).

"A viewer expects him to swing over the front on his rope and chop down with the ice axe, and to
walk with a steady climber's stride, the axe in his fist and the rope coil bouncing."

Animation (ANIM_SPEC G1, appendix B for an axe: overhead chop, leaping chop, low hook):
  idle      taps the axe against his boot to knock the snow off, the feather bobs, blink
  walk      walk v3 bounce jog at ground speed (card 85 x 1.25 = 106.25 lu/s): the axe held low in
            the near fist, the far fist pumping, the rope coil and feather a frame late
  attack    OVERHEAD ICE-AXE CHOP: the axe reared back over his head with the far arm thrown out for
            balance (the held extreme), then a chop down in front (a crescent smear), CHOCK (chips)
  attack_b  LEAPING CHOP: springs up with his knees tucked and the axe high (the held extreme in the
            air), lands into the chop with a deep squash and a dust ring
  attack_c  LOW HOOK: crouches with the axe trailing behind his knee, then hooks the pick up and
            across into the target's legs
  hit       light: the head snaps back, the hat lifts, eyes squeezed
  die       D1 fling and spin: the hat pops off, the axe flies, X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "alpine_climber"
GAIT_NAME = "biped"
NAME = "Alpine Climber"
HEIGHT_LU = 66
CANVAS = (296, 272)
FEET = (128, 244)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 31)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
HAFT = 27.0
HEAD_Z = FIST[2] + HAFT - 1.0
TIP = (FIST[0] + 11.0, FIST[1], HEAD_Z - 4.0)       # the pick point (leads the downward chop)
CAP_C = (1.0, 0.0, 57.4)
SHIRT = "#7D7462"          # tweed
SHIRT_DK = "#6A6253"
BEARD = "#7A4E36"
SOCK = "#E3D9C3"
FEATHER = "#E8DFC8"
ROPE = "#D9CCB0"
HAFT_C = "#C9AE84"
STEEL = "#A9B0B8"


def _pick(rig, joint, fist):
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 6.0), (cx, cy, cz + HAFT), 1.4, 1.3)
    rig.part(joint, g, HAFT_C, outline=0.6)
    g = Geo().capsule((cx, cy, cz - 9.0), (cx, cy, cz - 6.0), 1.2, 0.3)
    rig.part(joint, g, I.IRON_DK, finish="metal", outline=0.5)            # spike
    g = Geo().lathe([(1.7, 0), (1.9, 1.2), (1.7, 2.4)], (cx, cy, cz - 6.0), (cx, cy, cz - 3.6), segs=12)
    rig.part(joint, g, I.LEATHER, outline=0.4)                          # wrist loop ring
    hz = cz + HAFT - 1.0
    g = Geo().blob((cx, cy, hz), (2.6, 2.2, 3.0), p=2.6)
    g.capsule((cx, cy, hz), (cx + 8.0, cy, hz - 1.4), 1.9, 1.3)
    g.capsule((cx + 8.0, cy, hz - 1.4), (cx + 11.0, cy, hz - 4.0), 1.3, 0.5)   # pick, curving down
    rig.part(joint, g, STEEL, finish="metal", outline=0.8)
    g = Geo().blob((cx - 6.0, cy, hz + 0.4), (3.4, 2.2, 1.2), p=2.6, rot=(0, 10, 0))   # flat adze
    g.capsule((cx, cy, hz), (cx - 4.0, cy, hz + 0.2), 1.6)
    rig.part(joint, g, STEEL, finish="metal", outline=0.8)
    return (cx + 11.0, cy, hz - 4.0)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=SHIRT, gaiter=SOCK)
    for s in ("r", "l"):   # knickerbocker cuffs under the knee
        y = I.LEG_Y * I.SIDE_Y[s]
        g = Geo().blob((0.6, y, KI.V3_KNEE_Z + 0.6), (4.8, 5.0, 2.0), p=2.6)
        rig.part(f"thigh_{s}", g, SHIRT_DK, outline=0.5)
    jacket = Geo().blob((0, 0, 28.0), (10.6, 9.6, 11.6), p=2.4, taper=(1.08, 0.94))
    jacket.blob((0, 0, 18.4), (10.4, 9.6, 4.6), p=2.6)
    jface = F.Face(rig, "torso", [Geo().blob((0, 0, 28.0), (10.6, 9.6, 11.6), p=2.4, taper=(1.08, 0.94))])
    rig.part("torso", jacket, team=True)
    g = KI.cog(jface, Geo(), (9.8, 27.0), s=0.9)
    rig.part("torso", g, KI.CREAM, highlight=False, outline=0)
    g = Geo().blob((1.2, 0, 37.4), (7.6, 8.0, 2.8), p=2.4)
    rig.part("torso", g, SHIRT_DK)
    g = Geo().blob((0.2, 0, 20.6), (11.4, 10.6, 2.0), p=3.2)
    rig.part("torso", g, I.LEATHER)
    g = Geo().blob((0.5, 0, 15.6), (11.0, 10.2, 4.4), p=2.6, taper=(1.08, 1.0))
    g.clip((0, 0, 13.0), (0, 0, -1))
    rig.part("hips", g, SHIRT)
    # a coil of rope over the far shoulder and across the chest
    rig.secondary("rope", "torso", (-2.0, 8.0, 34.0), (-4.0, 9.0, 24.0), max_deg=18, gain=1.2)
    g = Geo()
    import math as _m
    for k in range(3):
        r0 = 6.4 - k * 0.6
        pts = [(-2.0 + r0 * _m.cos(2 * _m.pi * t / 18), 9.4 + k * 0.9, 28.0 + r0 * 1.15 * _m.sin(2 * _m.pi * t / 18))
               for t in range(19)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 1.1)
    rig.part("rope", g, ROPE, outline=0.5)
    g = Geo().capsule((9.0, -8.0, 35.0), (10.0, 7.0, 21.0), 1.2)
    rig.part("torso", g, ROPE, outline=0.4)

    face = KI.head_face(rig, brow=BEARD, brow_angry=True, mouth_dz=-9.0, mouth_w=5.6)
    del face
    g = Geo().blob((9.0, 0, 41.0), (6.4, 9.6, 4.6), p=2.2)
    rig.part("head", g, BEARD, finish="hair")
    I.back_hair(rig, BEARD)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, fist=4.6, cuff=I.LEATHER)
        y = I.ARM_Y[s]
        g = Geo().blob((2.6, y - 1.5 * (1 if s == "r" else -1), I.HAND_Z + 0.6), (1.7, 1.6, 2.3), p=2.2)
        rig.part(f"hand_{s}", g, I.SKIN)
    I.shoulders(rig, team=True)

    rig.joint("pick", "hand_r", FIST)
    tip = _pick(rig, "pick", FIST)
    KI.loose(rig, "pick_loose", FIST, lambda j: _pick(rig, j, FIST))
    rig.track("pickTip", "pick", tip)
    I.fuse_spark(rig, "pick", (tip[0] + 1.0, tip[1] - 2.0, tip[2] - 1.0), size=2.0, name="clink", hidden=True)


def _cap(rig, joint):
    x, y, z = CAP_C
    g = Geo().blob((x - 0.4, y, z + 4.6), (9.6, 9.0, 6.4), p=2.6, taper=(1.04, 0.76))
    g.clip((x, y, z), (0, 0, -1))
    g.blob((x + 0.6, y, z + 0.6), (15.6, 14.4, 1.4), p=2.4, rot=(0, 6, 0))
    rig.part(joint, g, team=True)
    g = Geo().lathe([(9.8, 0), (9.7, 1.8), (9.3, 2.8)], (x, y, z + 1.4), (x, y, z + 4.2), segs=24)
    rig.part(joint, g, I.LEATHER_DK, outline=0.5)
    g = Geo().blob((x - 6.0, y - 8.6, z + 7.0), (1.2, 1.0, 6.0), p=2.2, rot=(0, -40, 0))
    rig.part(joint, g, FEATHER, outline=0.5)


# -- poses ---------------------------------------------------------------------------------
def grip(a, f, w, la=-80.0, lf=-50.0, lean=0.0):
    """World angles: near arm (a, f) with the pick pointing w; far arm (la, lf)."""
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean))


REST = (-84.0, -36.0, 40.0)     # the axe held low in the near fist, pick forward
STANCE = merge(grip(-80.0, -30.0, 50.0, -76.0, -40.0, lean=-2.0), {"torso": {"r": -2.0}})


def _idle(f):
    tap = [0.0, 0.5, 1.0, -0.3, 0.6, 0.0][f]

    def extra(ctx):
        return merge(grip(-80.0 - 10 * tap, -30.0 - 40 * tap, 50.0 - 70 * tap, -76.0, -40.0 + 4 * ctx["lag"], lean=-2.0),
                     {"head": {"r": 5 * max(tap, 0)}, "rope": {"r": 4 * ctx["lag"]}})
    return M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


SPEED = 106.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=576)
CARRY = merge(grip(*REST, lean=-8.0), {"torso": {"r": -3.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -8 * lag}, "arm_r": {"r": 4 * lag}, "fore_r": {"r": -3 * lag},
                "hat": {"r": -2.0 * lag}, "rope": {"r": 8 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-9.0, twist=7.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=36.0, extra=extra, report=report)


# -- attack A: overhead pick chop (moves.SMALL_MELEE_MS, impact on 6) -------------------------------
# frames: read, hitch, rise, HOLD (pick reared back over his head, both hands up), smear, smear,
# IMPACT (point-first in front, deep squash), pry, recoil, settle, settle. World angles.
#        read  hitch rise HOLD smear smear IMP pry  recoil settle settle
A_A = [-84, -40, 50, 100, 66, 18, -16, -24, -40, -64, -80]
A_F = [-36, 50, 110, 132, 52, -2, -30, -40, -14, -20, -34]
A_W = [40, 140, 150, 172, 74, 4, -36, -44, 10, 30, 40]
A_LA = [-76, -70, -110, -130, -120, -90, -60, -56, -66, -72, -76]
A_LF = [-40, -40, -140, -160, -130, -80, -40, -36, -40, -40, -40]
A_T = [-3, 0, 6, 10, -6, -14, -22, -20, -10, -5, -3]
A_X = [0.0, -0.5, -1.0, -2.0, 1.5, 4.5, 7.0, 7.0, 4.0, 1.5, 0.5]
A_Z = [0.0, 0.0, 1.0, 2.4, 2.0, 0.0, -4.4, -3.4, -1.4, -0.4, 0.0]
A_Q = [0.0, 0.02, 0.05, 0.10, 0.08, 0.02, -0.16, -0.08, -0.05, 0.0, 0.0]
A_THR = [2, 0, -4, -6, 12, 20, 30, 28, 14, 6, 2]
A_SHR = [0, -4, -8, -12, -14, -18, -34, -30, -10, -4, 0]
A_THL = [-2, 2, 8, 10, -8, -16, -26, -26, -12, -6, -2]
A_SHL = [0, -6, -10, -12, -8, -8, -22, -18, -6, -2, 0]


def _attack_pose(f, add=None, air=False):
    t = A_T[f]
    pose = merge(grip(A_A[f], A_F[f], A_W[f], A_LA[f], A_LF[f], lean=t), {
        "torso": {"r": t, "rz": -6 if f in (2, 3) else 4 if f in (5, 6, 7) else 0},
        "head": {"r": -0.5 * t},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "clink": {"show": f == 6},
        "rope": {"r": [0, 0, -6, -10, 4, 10, 14, 10, 4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f == 3:
        pose = merge(pose, {"foot_r": {"r": -14}, "foot_l": {"r": -16}})
    if f in (4, 5):
        pose["pick"] = {"sz": 1.16}
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    elif f == 8:
        pose = merge(pose, F.expr("grit"))
    if add:
        pose = merge(pose, add)
    if air:
        return pose
    return KI.ground_feet(RIG, pose, LEGS, toes={"r": -14, "l": -16} if f == 3 else None)


ARC = {"kind": "arc", "joint": "pick", "inner": (FIST[0], FIST[1], FIST[2] + HAFT * 0.5),
       "outer": (FIST[0] + 6.0, FIST[1], HEAD_Z), "color": I.IRON_LT, "white": 0.35, "taper": 0.15, "lines": 3}


def _impact_fx(seed):
    return [{"kind": "burst", "joint": "pick", "point": TIP, "r0_lu": 7.0, "r1_lu": 14.0, "n": 7,
             "a0": 20.0, "arc": 160.0, "color": "#FFF4D6"},
            {"kind": "dust", "joint": "pick", "point": TIP, "ground_snap": True, "size_lu": 7.0,
             "puffs": 4, "seed": seed, "spread": 1.2}]


def _attack_clip():
    ov = {
        4: [dict(ARC, **{"from": 3, "t0": 0.0, "t1": 0.95})],
        5: [dict(ARC, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(ARC, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2})] + _impact_fx(41),
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: leaping chop: A's swing with a hop. Frames 2-5 are in the air (knees tucked), 6 lands.
B_HOP = [0.0, 0.0, 4.0, 8.0, 6.0, 2.5, 0.0, 0.0, 0.0, 0.0, 0.0]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    h = B_HOP[i]
    tuck = {"thigh_r": {"r": 50}, "shin_r": {"r": -90}, "thigh_l": {"r": 20}, "shin_l": {"r": -70},
            "foot_r": {"r": 10}, "foot_l": {"r": 20}, "body": {"z": h}} if h > 0 else None
    pose = _attack_pose(i, add=tuck, air=h > 0)
    if i == 6:
        pose = merge(pose, {"body": {"sz": 0.9, "sx": 1.08}})
    return pose


def _attack_b():
    ov = {
        4: [dict(ARC, **{"from": 3, "t0": 0.0, "t1": 0.95})],
        5: [dict(ARC, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(ARC, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2})] + _impact_fx(53) +
           [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 54, "spread": 1.0, "dir": -1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse, extra={"holdStep": 3})


# -- attack C: low hook: crouches with the axe trailing behind his knee (the held extreme), then hooks
# the pick up and across into the target's legs. Unique frames 0, 1, 9, 10 are A's.
#        drop HOLD smear smear IMP  bounce recoil
B_A = [-110, -150, -120, -60, -12, -10, -30]
B_F = [-130, -170, -110, -40, -8, -6, -20]
B_W = [190, 200, 120, 40, -6, -8, 20]
B_LA = [-60, -40, -90, -110, -40, -40, -60]
B_LF = [-40, -10, -80, -110, -30, -30, -40]
B_T = [-4, 4, -8, -16, -20, -18, -10]
B_TZ = [12, 22, 6, -10, -16, -14, -6]
B_DROP = [4.0, 7.0, 7.0, 6.0, 5.0, 5.0, 3.0]


def _c_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(grip(B_A[k], B_F[k], B_W[k], B_LA[k], B_LF[k], lean=t), {
        "torso": {"r": t, "rz": B_TZ[k]},
        "head": {"r": -0.4 * t, "rz": -0.5 * B_TZ[k]},
        "clink": {"show": k == 4},
    }, M.body_about((0, 0, 22), x=[0.0, -1.0, 1.0, 3.0, 5.0, 5.0, 2.0][k], z=-B_DROP[k],
                    q=[0.0, -0.06, 0.04, 0.06, -0.12, 0.03, 0.0][k]))
    if k in (2, 3):
        pose["pick"] = {"sz": 1.14}
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif k in (2, 3, 4, 5):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    else:
        pose = merge(pose, F.expr("grit"))
    return KI.ground_feet(RIG, pose, LEGS, max_drop=8.0)


def _attack_c():
    hook = dict(ARC, t0=0.0, t1=0.95, lines=3)
    ov = {
        4: [dict(hook, **{"from": 3})],
        5: [dict(hook, **{"from": 3, "t0": 0.35, "t1": 1.0})],
        6: [dict(hook, **{"from": 5, "t0": 0.2, "t1": 1.0, "lines": 2})] + _impact_fx(57),
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 14 * a}, "hand_r": {"r": 12 * a},
                "arm_l": {"r": 40 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, CARRY, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


AXE_PATH = [None, (6, 20, 60), (10, 36, 170), (14, 40, 300), (18, 30, 420), (21, 14, 520),
             (23, 0, 590), (24, -6, 612), (24, -6, 612), (24, -6, 612)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(CARRY, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = KI.HAT_POP[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    wp = AXE_PATH[k]
    if wp is not None:
        x, z, r = wp
        pose["pick"] = {"hide": True}
        pose["pick_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
