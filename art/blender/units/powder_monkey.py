"""Powder Monkey: Gunpowder Age common infantry, Raider (CONTENT_PLAN 5.4). Powder scoop, ×2 to bases, ~60 lu.

Look (A11, Gunpowder palette): a cheeky ship's boy with big eyes, freckles and a gap-toothed grin, a
floppy team stocking cap with a cream tassel, a team neckerchief, a cream striped shirt with team
bands, rolled cream trousers over bare shins and little black shoes. A small dark powder cask with
iron hoops is tucked under his far arm, and he swings a long iron powder scoop whose cup smokes, a
spark flicking off it.

"A viewer expects him to swing the smoking scoop like a club and to scamper at a sprint."

Animation (ANIM_SPEC G1 sprint, appendix B for a club: overhead bonk, side sweep, jab):
  idle      bounces on his toes, peeks into the cask, the scoop smokes, blink
  walk      walk v3 scampering sprint at ground speed (card 100 x 1.25 = 125 lu/s): low and forward,
            the cask hugged, the scoop trailing back, the cap tassel flying
  attack    OVERHEAD BONK: rears back with the scoop high behind his head (the held extreme), then
            bonks it down on the target (a crescent, a spark flick off the cup)
  attack_b  SIDE SWEEP: crouches with the scoop held low behind him (the held extreme), then sweeps
            it flat through the target like a bat
  attack_c  HANDLE JAB: pulls the scoop back along his side, handle first (the held extreme), and jabs
            the handle end into the target (a thrust streak)
  hit       light: head snaps back, the cap flops, eyes squeezed
  die       D1 fling and spin: the cask flies off and lands apart, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "powder_monkey"
GAIT_NAME = "biped"
NAME = "Powder Monkey"
HEIGHT_LU = 62
CANVAS = (340, 290)
FEET = (150, 250)
ANCHORS = {"head": (2, 60), "hitCenter": (0, 30)}
NO_RETIME = True

SKIN = "#EDC6A2"
HAIR = "#5E4D40"
TROUSER = "#E6DCC4"
SHOE = "#2E2A2A"
CASK = "#6E5E50"
CASK_DK = "#46372C"
IRON = "#3E3B3A"
SCOOP = "#6F7780"
FRECKLE = "#B8957E"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand: scoop
SC = 30.0                            # scoop length from the hand
CUP = (HR[0] + 1.5, HR[1], HR[2] + 4 + SC)
CASK_C = (8.0, 11.0, 24.0)           # cask (torso space, under the far arm)


def _cask(rig, joint, c):
    x, y, z = c
    g = Geo().lathe([(5.4, -6.4), (6.4, -3.0), (6.8, 0), (6.4, 3.0), (5.4, 6.4)], (x - 6.4, y, z),
                    (x + 6.4, y, z), segs=20)
    rig.part(joint, g, CASK, finish="matte")
    g = Geo()
    for dx in (-4.6, 4.6):
        g.lathe([(6.5, -0.7), (6.7, 0), (6.5, 0.7)], (x + dx - 0.7, y, z), (x + dx + 0.7, y, z), segs=20)
    rig.part(joint, g, IRON, finish="metal", outline=0.5)
    g = Geo().blob((x, y - 6.6, z), (2.6, 0.6, 2.6), p=2.4)          # cream powder label
    rig.part(joint, g, B.CREAM, outline=0.4)
    g = Geo().blob((x + 6.6, y, z), (0.8, 2.6, 2.6), p=2.4)
    rig.part(joint, g, CASK_DK, outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig, head=(1, 0, 36))
    # legs: rolled cream trousers to the knee, bare shins, little black shoes
    G.legs_v3(rig, TROUSER, SHOE, stocking=SKIN, thigh_r=4.4, buckle=False)
    for s, y in (("r", -B.LEG_Y), ("l", B.LEG_Y)):
        g = Geo().blob((0.5, y, K.V3_KNEE_Z + 0.4), (5.0, 4.9, 1.8), p=2.6)   # rolled cuff
        rig.part(f"thigh_{s}", g, "#D8CDB2" if s == "r" else "#ADA48E", outline=0.5)

    # torso: a cream shirt with team bands, a team neckerchief, a rope belt
    shirt = Geo().blob((0, 0, 27.6), (10.2, 9.4, 10.4), p=2.3, taper=(1.05, 0.95))
    shirt.blob((0, 0, 18.6), (9.8, 9.0, 4.4), p=2.6)
    sf = F.Face(rig, "torso", [shirt])
    rig.part("torso", shirt, B.CREAM)
    g = G.stripes(sf, Geo(), (31.4, 27.0, 22.6), -9.0, 12.0, 2.6)
    rig.part("torso", g, team=True, highlight=False, outline=0)
    g = Geo().blob((0.4, 0, 19.4), (10.6, 9.8, 1.6), p=3.0)
    rig.part("torso", g, "#B8A27E", finish="hair")                  # rope belt
    g = Geo().blob((3.0, 0, 35.0), (7.4, 8.8, 3.0), p=2.4)           # neckerchief
    g.blob((8.6, -2.0, 31.0), (2.4, 3.0, 3.6), p=2.2)
    rig.part("torso", g, team=True)
    # team sleeves
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, hand=SKIN, r0=4.0, r1=3.5, fist=4.0)
    g = Geo()
    for s in ("r", "l"):
        y = B.ARM_Y[s]
        g = Geo().blob((0, y, B.HAND_Z + 3.4), (4.4, 4.4, 1.6), p=2.6)
        rig.part(f"fore_{s}", g, SKIN)

    # head: a big round boy's head, freckles, gap tooth grin, a floppy team stocking cap
    head = G.head_geos(center=(2, 0, 46.6), r=(12.2, 11.6, 12.0), nose=(14.4, -0.6, 45.0),
                       nose_r=(2.8, 2.6, 2.6))
    hair = Geo().blob((-6.0, 0, 46.0), (6.2, 11.0, 7.2), p=2.2)
    hair.blob((6.0, -6.0, 55.0), (4.4, 3.6, 2.4), p=2.2)              # a fringe tuft
    fc = K.face2(rig, [head, hair], SKIN, cx=12.4, cz=48.0, eye_dy=(-4.8, 4.6),
                 eye_r=(4.2, 3.9, 4.9), pupil_r=(1.7, 2.6, 2.9), brow=HAIR, brow_angry=False,
                 mouth_dz=-7.4, mouth_x=13.6, mouth_shape="smile", eye_at=(14.2, 48.2), mark_r=4.5)
    rig.part("head", head, SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    g = Geo()
    for dx, dz in ((0.0, 0.0), (1.6, 0.8), (1.2, -1.2), (-1.0, -0.6)):
        c = fc.hit(10.2 + dx, 44.0 + dz)
        fc.decal(g, c, F.ellipse(0, 0, 0.55, 0.55, 8), 0.4)
    rig.part("head", g, FRECKLE, outline=0, highlight=False)
    # the cap: a stocking cap flopping back, cream tassel; the tip is a secondary
    g = Geo().blob((-0.6, 0, 56.2), (11.6, 11.4, 5.6), p=2.3)
    g.clip((0, 0, 54.6), (0, 0, -1))
    rig.part("head", g, team=True)
    g = Geo().lathe([(11.2, 0), (11.8, 0.4), (11.8, 2.0), (11.2, 2.4)], (-0.2, 0, 54.0), segs=24)
    rig.part("head", g, B.CREAM, outline=0.5)
    rig.secondary("cap", "head", (-6.0, 0, 58.0), (-15.0, 0, 52.0), max_deg=18, gain=1.4)
    g = Geo().capsule((-4.0, 0, 58.0), (-11.0, 0, 56.0), 6.0, 4.2).capsule((-11.0, 0, 56.0), (-15.5, 0, 51.0), 4.2, 2.4)
    rig.part("cap", g, team=True)
    g = Geo().sphere((-16.6, 0, 49.4), 2.8, cuts=4)
    rig.part("cap", g, B.CREAM, finish="hair", outline=0.6)

    # the cask under the far arm (its own joint, it flies off in the death)
    rig.joint("cask", "torso", CASK_C)
    _cask(rig, "cask", CASK_C)
    rig.joint("cask_loose", "root", (CASK_C[0], CASK_C[1], CASK_C[2] + 18.0), hidden=True)
    _cask(rig, "cask_loose", (CASK_C[0], CASK_C[1], CASK_C[2] + 18.0))

    # the powder scoop: a long iron handle with a wooden grip and a deep cup at the top, a smoke
    # wisp and a spark (shown on the impact)
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 4.0), (hx, hy, hz + 4.0), 1.6)
    rig.part("hand_r", g, B.WOOD)
    g = Geo().capsule((hx, hy, hz + 3.0), (CUP[0], hy, CUP[2] - 3.0), 0.9)
    rig.part("hand_r", g, SCOOP, finish="metal", outline=0.7)
    g = Geo().lathe([(0, -2.6), (3.0, -2.2), (3.6, 0), (3.6, 2.6), (3.0, 2.6)], (CUP[0], hy, CUP[2] - 2.0),
                    (CUP[0] + 0.6, hy, CUP[2] + 2.0), segs=16)
    rig.part("hand_r", g, SCOOP, finish="metal", outline=0.7)
    rig.joint("wisp", "hand_r", CUP)
    g = Geo().sphere((CUP[0] - 1.0, hy - 0.5, CUP[2] + 4.6), 2.2, cuts=3)
    g.sphere((CUP[0] - 2.6, hy - 0.5, CUP[2] + 7.8), 1.6, cuts=3)
    rig.part("wisp", g, G.SMOKE, finish="dust", outline=0.5)
    rig.joint("spark", "hand_r", CUP, hidden=True)
    g = Geo().star((CUP[0] + 1.0, hy - 2.0, CUP[2] + 2.0), 4.4, 1.6, 1.0, points=6)
    rig.part("spark", g, glow=B.FIRE, outline=0)
    rig.track("bladeTip", "hand_r", CUP)


# -- poses ---------------------------------------------------------------------------------
def scoop_arm(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


def cask_arm(a=-70, f=-10):
    return B.arm("l", a, f)


STANCE = merge(scoop_arm(-50, 20, 75), cask_arm(-68, 4), {"torso": {"r": -5}})


def _idle(f):
    bounce = [0.0, 1.0, 0.4, 0.0, 1.0, 0.4][f]
    peek = [0.0, 0.0, 0.5, 1.0, 0.6, 0.0][f]

    def extra(ctx):
        return {"body": {"z": 1.2 * bounce}, "head": {"r": -10 * peek, "rz": 12 * peek},
                "pupils": {"z": -0.8 * peek, "y": 0.8 * peek}, "cap": {"r": 5 * ctx["lag"]},
                "wisp": {"z": 1.0 * ctx["lag"], "s": 1.0 + 0.1 * ctx["lag"]},
                "arm_r": {"r": 3 * ctx["lag"]}}
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


# -- walk v3: scampering sprint (card 100 x 1.25 = 125 lu/s), 8 x 64 ms ------------------------
SPEED = 125.0
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=512, stance=0.32, lift=7.0, x_mid=3.5)
SPRINT_BOB = [-5.0, -6.0, -2.6, 0.0]
CARRY = merge(scoop_arm(-110, -150, -150), cask_arm(-60, 10), {"torso": {"r": -6}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"cap": {"r": 10 * lag}, "hand_r": {"r": 6 * lag}, "arm_r": {"r": 4 * lag},
                "wisp": {"x": -2.0, "r": 10}, "cask": {"r": 3 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, bob=SPRINT_BOB, lean=-16.0, twist=6.0, nod=2.5,
                     extra=extra, report=report)


def _pose(sa, sf, sw, t, yaw, x, z, q, feet, k, hold_ks, smear_ks, impact_k=6):
    pose = merge(scoop_arm(sa - t, sf - t, sw - t), cask_arm(-68 - 0.5 * t, 4 - 0.5 * t), {
        "torso": {"r": t, "rz": yaw},
        "head": {"r": -0.5 * t, "rz": -0.4 * yaw},
        "spark": {"show": k == impact_k},
        "wisp": {"hide": k in smear_ks or k == impact_k},
    }, M.body_about((0, 0, 22), x=x, z=z, q=q))
    r, l = feet
    pose = G.plant(RIG, pose, LEGS, r=r, l=l, max_drop=6.0)
    if k in smear_ks:
        pose["hand_r"]["sz"] = 1.15
    if k in hold_ks:
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif k in smear_ks or k in (impact_k, impact_k + 1):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


FEET_LUNGE = [((2.0, 0, 0), (-2.0, 0, 0)), ((3.0, 0, 0), (-5.0, 0, -4)), ((4.0, 0, 0), (-7.0, 0, -6)),
              ((5.0, 0, 0), (-8.0, 0, -8)), ((8.0, 0, 0), (-6.0, 0, -10)), ((11.0, 0, 0), (-5.0, 0, -12)),
              ((13.0, 0, 0), (-5.0, 0, -10)), ((13.0, 0, 0), (-5.0, 0, -8)), ((10.0, 0, 0), (-4.0, 0, -4)),
              ((3.0, 0, 0), (-2.0, 0, 0))]

# attack A: overhead bonk (moves.SMALL_MELEE_MS, impact 6, hold on step 3)
#        read  rear  cock  HOLD  smear smear IMP   over  recoil settle
A_SA = [-50, 40, 95, 110, 90, 40, -20, -35, -40, -48]
A_SF = [20, 80, 130, 145, 100, 30, -40, -55, -30, 18]
A_SW = [75, 110, 140, 150, 100, 30, -50, -70, -30, 72]
A_T = [-5, 4, 10, 14, 0, -10, -20, -18, -10, -5]
A_YAW = [0, 6, 12, 16, 6, -6, -12, -10, -4, 0]
A_X = [0.0, -1.0, -2.5, -3.0, 1.0, 5.0, 8.0, 8.0, 5.0, 1.0]
A_Z = [0.0, -1.5, -2.0, -2.5, -2.0, -3.0, -5.0, -4.5, -2.5, 0.0]
A_Q = [0.0, -0.04, -0.06, -0.08, 0.06, 0.06, -0.12, -0.06, -0.03, 0.0]


def _a_pose(f):
    return _pose(A_SA[f], A_SF[f], A_SW[f], A_T[f], A_YAW[f], A_X[f], A_Z[f], A_Q[f], FEET_LUNGE[f], f,
                 (1, 2, 3), (4, 5))


# attack B: side sweep. The scoop low behind him on the hold, then flat through the target.
B_SA = [-50, -110, -140, -150, -100, -40, -5, 10, -20, -48]
B_SF = [20, -120, -160, -170, -110, -30, 0, 20, 10, 18]
B_SW = [75, -150, -170, -175, -120, -30, 5, 30, 40, 72]
B_T = [-5, -10, -16, -18, -10, -6, -14, -12, -8, -5]
B_YAW = [0, 20, 32, 38, 10, -14, -28, -30, -14, 0]
B_X = [0.0, -0.5, -1.5, -2.0, 2.0, 5.0, 8.0, 8.0, 5.0, 1.0]
B_Z = [0.0, -3.5, -6.0, -7.0, -6.0, -5.0, -5.0, -4.5, -2.5, 0.0]
B_Q = [0.0, -0.06, -0.08, -0.1, 0.06, 0.06, -0.1, -0.05, -0.03, 0.0]


def _b_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(B_SA[f], B_SF[f], B_SW[f], B_T[f], B_YAW[f], B_X[f], B_Z[f], B_Q[f], FEET_LUNGE[f], f,
                 (1, 2, 3), (4, 5))


# attack C: handle jab. The scoop turned handle first (cup back) and pulled along his side, then jabbed.
C_SA = [-50, -100, -145, -150, -60, -10, 0, 4, -20, -48]
C_SF = [20, -120, -170, -175, -40, -5, 0, 4, 0, 18]
C_SW = [75, 160, 172, 175, 178, 180, 180, 182, 150, 72]   # cup back: the handle end leads   # the scoop flipped: handle end forward
C_T = [-5, -6, -4, -2, -14, -18, -22, -20, -10, -5]
C_YAW = [0, -8, -14, -16, 4, 12, 16, 14, 6, 0]
C_X = [0.0, 0.0, -1.5, -2.5, 4.0, 8.0, 11.0, 11.0, 6.0, 1.0]
C_Z = [0.0, -2.0, -3.5, -4.0, -4.5, -5.0, -6.0, -5.5, -3.0, 0.0]
C_Q = [0.0, -0.04, -0.06, -0.08, 0.06, 0.04, -0.1, -0.05, -0.02, 0.0]


def _c_pose(f):
    if f in (0, 9):
        return _a_pose(f)
    return _pose(C_SA[f], C_SF[f], C_SW[f], C_T[f], C_YAW[f], C_X[f], C_Z[f], C_Q[f], FEET_LUNGE[f], f,
                 (1, 2, 3), (4, 5))


SIN = (HR[0] + 0.8, HR[1], HR[2] + 18.0)
SLASH = {"kind": "arc", "joint": "hand_r", "inner": SIN, "outer": CUP, "color": SCOOP,
         "taper": 0.2, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}
HANDLE = (HR[0], HR[1], HR[2] - 4.0)
JAB = {"kind": "streak", "joint": "hand_r", "point": HANDLE, "color": B.WOOD, "width_lu": 6.0, "white": 0.35}


def _fx(seed, ground=18.0, point=CUP, a0=-80.0):
    return [{"kind": "burst", "joint": "hand_r", "point": point, "r0_lu": 5.0, "r1_lu": 11.0,
             "n": 5, "a0": a0, "arc": 140.0, "color": "#FFF1C8"},
            {"kind": "dust", "ground": (ground, 0.0), "size_lu": 5.0, "puffs": 3, "seed": seed, "spread": 0.9}]


def _attack_clip():
    ov = {4: [dict(SLASH, **{"from": 3})], 5: [dict(SLASH, **{"from": 3, "t0": 0.35})],
          6: [dict(SLASH, **{"from": 5, "t1": 1.0, "lines": 2})] + _fx(51)}
    return M.clip("attack", [_a_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], extra={"holdStep": 3})


def _attack_b():
    ov = {4: [dict(SLASH, **{"from": 3})], 5: [dict(SLASH, **{"from": 3, "t0": 0.35})],
          6: [dict(SLASH, **{"from": 5, "t1": 1.0, "lines": 2})] + _fx(52, a0=-40.0)}
    return M.clip("attack_b", [_b_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], reuse={0: ("attack", 0), 9: ("attack", 9)},
                  extra={"holdStep": 3})


def _attack_c():
    ov = {4: [dict(JAB, **{"from": 3})], 5: [dict(JAB, **{"from": 4, "width_lu": 5.0})],
          6: [dict(JAB, **{"from": 5, "width_lu": 4.0})] + _fx(53, ground=22.0, point=HANDLE, a0=-60.0)}
    return M.clip("attack_c", [_c_pose(f) for f in range(10)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, sequence=list(range(10)) + [0], reuse={0: ("attack", 0), 9: ("attack", 9)},
                  extra={"holdStep": 3})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 18 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "hand_r": {"r": 14 * a}, "cap": {"r": 14 * a},
                "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


CASK_FLY = {1: (4.0, 6.0, 40.0), 2: (10.0, 12.0, 120.0), 3: (16.0, 14.0, 210.0), 4: (22.0, 8.0, 290.0),
            5: (27.0, -6.0, 340.0), 6: (30.0, -22.0, 360.0), 7: (32.0, -38.0, 370.0), 8: (33.0, -39.0, 362.0),
            9: (33.0, -39.0, 362.0)}


def _die(k):
    fl = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=26.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * fl}, "head": {"r": 14 * fl - 6},
        "arm_r": {"r": 70 * fl + 20}, "hand_r": {"r": 30 * fl},
        "arm_l": {"r": 110 * fl + 30}, "fore_l": {"r": 40 * fl},
        "thigh_r": {"r": 40 * fl + 20}, "shin_r": {"r": -30 * fl},
        "thigh_l": {"r": -20 * fl + 10}, "shin_l": {"r": -20 * fl},
        "cap": {"r": 20 * fl},
    })
    if k in CASK_FLY:
        x, z, r = CASK_FLY[k]
        pose["cask"] = {"hide": True}
        pose["cask_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
        M.clip("die", [_die(k) for k in (0, 1, 2, 4, 5, 6, 9)], M.DIE_MS,
               sequence=[0, 1, 2, 2, 3, 4, 5, 5, 6, 6], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
