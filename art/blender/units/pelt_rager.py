"""Pelt Rager: Stone Age rare infantry (CONTENT_PLAN 5.1, X0 M2 frenzy). Below half HP: +30% damage,
+20% attack speed (the game adds anger puffs, `fx.frenzy`). Two clubs, blunt, 68 lu.

Look (A11, PLAN.md): a wild, barrel-chested berserker wearing a cave-bear pelt whose head sits on his
own like a hood (the bear's snout and ears over his brow) and whose team-dyed hide hangs down his back, wild eyes and a bristling beard, team war
paint bands on his arms, a team pelt kilt and team shin wraps, and a knobbly short club in each fist.

"A viewer expects it to flail both clubs like a windmill and to swagger."

Animation (ANIM_SPEC G1 swagger, appendix B clubs; distinct from the Bonker's single club):
  idle      huffs and rolls his shoulders, knocks the clubs together, blink
  walk      walk v3 bounce jog with a swagger (card 70 x 1.25 = 87.5 lu/s): a club on each
            shoulder, the hips rolling
  attack    WINDMILL FLURRY: both arms wind up, the near club comes down, then the far club (the
            impact), arcs on both, a short bounce
  attack_b  DOUBLE RAM: crouches with both clubs drawn back at the hips, then rams both forward
            together in a lunge
  attack_c  TORNADO SPIN: a full turn with both clubs out level (a ring), ending in a backhand hit
  hit       light;  die  D1 fling and spin, a club flies off, X eyes
"""
from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "pelt_rager"
GAIT_NAME = "biped"
NAME = "Pelt Rager"
HEIGHT_LU = 68
CANVAS = (280, 236)
FEET = (120, 210)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 31)}
NO_RETIME = True

SKIN = "#D2A889"
BEARD = "#3E312A"
PELT = "#6A5546"
PELT_DK = "#523F33"
SNOUT = "#8C735F"
WOOD = "#9C7E62"
WOOD_DK = "#7A604A"
BONE = "#EDE3C8"
FUR = "#6A5546"

HIP_Y, SH_Y = 6.0, 12.6
CLUB = 17.0


def _club(rig, joint, fist):
    fx, fy, fz = fist
    g = Geo().lathe([(0, -3.0), (1.9, -2.8), (2.0, 0), (2.4, 8.0), (4.4, CLUB - 4.0), (4.8, CLUB), (3.4, CLUB + 2.6),
                     (0, CLUB + 3.4)], (fx, fy, fz), segs=16)
    rig.part(joint, g, WOOD)
    g = Geo()
    for dx, dz in ((3.6, CLUB - 3.0), (-3.4, CLUB - 1.0), (1.0, CLUB + 2.0)):
        g.blob((fx + dx, fy - 1.6, fz + dz), (1.6, 1.4, 1.6), p=2.0)
    rig.part(joint, g, WOOD_DK, outline=0.4)
    g = Geo()
    for z in (-1.0, 3.0, 7.0):
        g.lathe([(2.4, 0), (2.7, 0.6), (2.7, 2.6), (2.4, 3.0)], (fx, fy, fz + z), segs=12)
    rig.part(joint, g, team=True, outline=0.5)   # team grip wraps (the 18% rule with both arms forward)


def build(rig):
    global RIG, ARM_R, ARM_L, TIP_R, TIP_L
    RIG = rig
    body = K.body(rig, SKIN, FUR, stocky=1.2, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(11.8, 10.4, 11.2), foot_len=4.8,
                  fist=4.6)
    fr, fl = body.fist["r"], body.fist["l"]
    K.pelt(rig, FUR, strap=True, emblem=True, z=28.4, r=(12.2, 11.2, 9.8), skirt_r=(12.2, 11.0, 4.6))
    K.wraps(rig, HIP_Y, SH_Y, wrists=("r", "l"))
    # team war-paint bands on both upper arms
    for side, y in (("r", -SH_Y), ("l", SH_Y)):
        g = Geo().capsule((0.6, y, 34.0), (1.3, y + (0.3 if y > 0 else -0.3), 29.0), 4.6, 4.4)
        rig.part(f"arm_{side}", g, team=True, outline=0.6)
    # the bear-pelt cloak over the back, its head worn as a hood
    rig.secondary("cloak", "torso", (-7.0, 0, 38.0), (-13.0, 0, 20.0), max_deg=14, gain=1.2)
    g = Geo().blob((-10.0, 0, 30.0), (4.0, 12.0, 10.0), p=2.4, taper=(1.25, 0.85))
    for y in (-8.0, -3.0, 2.5, 7.5):
        g.lathe([(2.4, 0), (0, -3.6)], (-11.5, y, 21.0), segs=8)
    rig.part("cloak", g, team=True)   # the pelt is dyed in the team colour (the 18% rule under the hood)
    beard = Geo().blob((6.6, 0, 41.0), (8.4, 10.0, 5.6), p=2.3)
    hood = Geo().blob((-1.0, 0, 54.6), (11.0, 11.2, 7.0), p=2.2)
    hood.blob((-6.6, 0, 48.0), (6.0, 11.0, 9.0), p=2.2)
    K.head(rig, SKIN, z=47.5, r=(10.8, 10.4, 10.6), jaw=(8.0, 8.8, 5.6), extra_geos=(beard, hood), brow_col=BEARD)
    rig.part("head", beard, BEARD, finish="hair")
    rig.part("head", hood, PELT, finish="hair")
    g = Geo().lathe([(10.6, 0), (11.4, 0.4), (11.4, 2.8), (10.4, 3.2)], (2.4, 0, 50.6), (1.2, 0, 53.6), segs=24)
    rig.part("head", g, team=True, outline=0.6)   # a team-dyed band where the hood meets his brow
    g = Geo().blob((8.6, 0, 57.8), (6.4, 5.6, 3.8), p=2.2)     # the bear's snout over his brow
    rig.part("head", g, SNOUT)
    g = Geo().blob((14.4, -0.4, 58.0), (1.8, 2.0, 1.6), p=2.2)
    rig.part("head", g, "#2E2826", outline=0.4)
    g = Geo()
    for y in (-1, 1):
        g.blob((-1.0, 8.0 * y, 61.6), (3.0, 2.0, 3.0), p=2.2)
    rig.part("head", g, PELT_DK, finish="hair")
    g = Geo()
    for y in (-3.0, 3.0):   # the bear's teeth along the hood's brim
        g.lathe([(0.9, 0), (0, 2.2)], (11.8, y, 54.6), (12.4, y, 52.4), segs=6)
    rig.part("head", g, BONE, outline=0.3)
    # a club in each fist
    for side, f in (("r", fr), ("l", fl)):
        rig.joint(f"club_{side}", f"fore_{side}", f)
        _club(rig, f"club_{side}", f)
    rig.joint("loose", "root", (0, 0, 0), hidden=True)
    _club(rig, "loose", (0.0, 0.0, -CLUB * 0.5))
    TIP_R = (fr[0], fr[1], fr[2] + CLUB)
    TIP_L = (fl[0], fl[1], fl[2] + CLUB)
    rig.track("clubHead", "club_r", TIP_R)
    ARM_R = body.arm("r", "club_r", TIP_R)
    ARM_L = body.arm("l", "club_l", TIP_L)


RIG = ARM_R = ARM_L = TIP_R = TIP_L = None
SPEED = 87.5
LEGS = K.legs(HIP_Y)
GAIT = K.jog(LEGS, SPEED, cycle=616)


def near(a, b, c, rz=0.0):
    p = ARM_R.pose(a, b, c)
    if rz:
        p["arm_r"]["rz"] = rz
    return p


def far(a, b, c, rz=0.0):
    p = ARM_L.pose(a, b, c)
    if rz:
        p["arm_l"]["rz"] = rz
    return p


def stance():
    return merge(near(-30, 30, 70), far(-40, 20, 60), {"torso": {"r": 2}})


def _idle(f):
    k = [0.0, 0.3, 0.7, 1.0, 0.5, 0.0, 0.0, 0.0][f]

    def extra(ctx):
        return merge(near(-30 + 10 * k, 30 + 20 * k, 70 + 20 * k), far(-40 + 10 * k, 20 + 26 * k, 60 + 30 * k),
                     {"cloak": {"r": 4 * ctx["lag"]}})
    return M.idle_v2(f, K.strip(stance(), "arm_r", "fore_r", "club_r", "arm_l", "fore_l", "club_l"), extra=extra,
                     face_blink=F.expr("blink"), blink=6)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"club_r": {"r": -5 * lag}, "club_l": {"r": -4 * lag}, "cloak": {"r": 6 * lag}}
    carry = merge({"torso": {"r": -2}}, near(-62, 74, 160), far(-60, 76, 158))
    return M.walk_v3(RIG, f, carry, GAIT, legs=LEGS, lean=-9.0, twist=8.0, nod=3.0, sway=4.0, extra=extra,
                     report=report)


# attack A: windmill flurry, 11 unique frames
#            read  wind  near  HOLD  far1  far2  IMP   bounce recoil settle settle
A_NA = [-30, 60, -40, -60, -70, -70, -70, -65, -50, -40, -30]
A_NB = [30, 120, -20, -40, -50, -50, -50, -40, -10, 20, 30]
A_NC = [70, 160, 10, -10, -20, -20, -20, -10, 30, 60, 70]
A_FA = [-40, 80, 110, 120, 70, 0, -20, -10, -20, -30, -40]
A_FB = [20, 130, 150, 160, 100, 10, -20, 0, -10, 10, 20]
A_FC = [60, 160, 175, 180, 120, 20, -5, 20, 30, 50, 60]
A_X = [-0.5, -2.0, 2.0, 1.0, 3.5, 6.0, 8.0, 7.5, 6.0, 3.0, 0.5]
A_Z = [0.0, 1.6, -1.0, 1.4, 2.6, 0.6, -2.6, -0.8, -1.4, -0.4, 0.0]
A_Q = [-0.03, 0.08, -0.08, 0.10, 0.08, 0.02, -0.16, 0.04, -0.06, 0.02, 0.0]
A_T = [2, 14, -12, 10, 0, -16, -26, -18, -16, -6, 2]
A_THR = [0, 4, 18, 6, 14, 22, 26, 20, 18, 8, 2]
A_SHR = [0, -6, -20, -4, -20, -16, -16, -10, -12, -4, 0]
A_THL = [0, 2, -14, 4, -8, -16, -22, -18, -16, -6, -1]
A_SHL = [0, -4, -8, -8, -8, -6, -6, -4, -4, -2, 0]


def _attack_pose(f):
    pose = merge(near(A_NA[f], A_NB[f], A_NC[f]), far(A_FA[f], A_FB[f], A_FC[f]), {
        "torso": {"r": A_T[f]}, "head": {"r": -A_T[f] * 0.4},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (1, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}})
    elif f in (2, 4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _arc(joint, tip, **kw):
    s = {"kind": "arc", "joint": joint, "inner": (tip[0], tip[1], tip[2] - 8), "outer": tip, "color": WOOD,
         "taper": 0.1, "t0": 0.0, "t1": 0.88, "lines": 3, "white": 0.35}
    s.update(kw)
    return s


def _attack_clip():
    ov = {
        2: [_arc("club_r", TIP_R)],
        4: [_arc("club_l", TIP_L)],
        5: [_arc("club_l", TIP_L, t1=0.8)],
        6: [{"kind": "burst", "joint": "club_l", "point": TIP_L, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5, "a0": -10.0,
             "arc": 140.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 101, "spread": 0.8}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, extra={"holdStep": 3})


# attack B: double ram. 0 = A read, 1 crouch, 2 HOLD (low crouch, both clubs drawn back at the hips,
# pointing forward), 3 smear (driving forward), 4 IMPACT (lunge, both clubs thrust straight out),
# 5 follow, 6-7 = A settle
B_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    tab = [  # a, b, c, x, z, q, t, thr, shr, thl, shl
        (-110, -60, -10, -1.0, -3.0, -0.08, 8, -14, 22, -10, 18),
        (-150, -80, 0, -2.5, -5.0, -0.12, 12, -24, 38, -16, 30),
        (-40, -10, 0, 3.0, -4.0, 0.06, -10, 20, -14, -14, 4),
        (-10, 0, 5, 8.0, -4.4, -0.14, -18, 40, -30, -22, -4),
        (-20, -5, 10, 6.5, -2.4, 0.02, -12, 30, -20, -16, -2),
    ][i - 1]
    a, b, c, x, z, q, t, thr, shr, thl, shl = tab
    pose = merge(near(a, b, c), far(a - 6, b - 4, c - 6), {
        "torso": {"r": t}, "head": {"r": -t * 0.5},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q))
    return merge(pose, F.expr("grit" if i < 3 else "yell"), {"brow": {"z": -1.0}})


def _attack_b():
    ov = {3: [{"kind": "streak", "joint": "club_r", "point": TIP_R, "color": WOOD, "width_lu": 8.0, "white": 0.4, "from": 2}],
          4: [{"kind": "burst", "joint": "club_r", "point": TIP_R, "r0_lu": 7.0, "r1_lu": 13.0, "n": 5, "a0": -60.0, "arc": 120.0},
              {"kind": "dust", "ground": (12.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 102, "spread": 0.8}]}
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4,
                  sequence=B_SEQ, overlays=ov, reuse=reuse)


# attack C: tornado spin. 0 = A read, 1 wind (turned away, arms out), 2 HOLD (half turned, both clubs
# held out level, crouched), 3 spin (ring), 4 IMPACT (backhand with the near club, body unwound),
# 5 follow, 6-7 = A settle
C_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    tab = [  # rz (body), x, z, q, arm r angle, rzarm
        (60, -1.0, -1.0, -0.04, 0, 0),
        (120, -2.0, -2.4, -0.08, 0, 0),
        (240, 1.0, -1.6, 0.04, 0, 0),
        (360, 5.0, -2.4, -0.12, -10, 0),
        (360, 4.0, -1.0, 0.02, -20, 0),
    ][i - 1]
    rz, x, z, q, ra, _ = tab
    pose = merge(near(ra, ra, ra), far(ra + 180 - 20, ra + 180 - 20, ra + 180 - 20), {
        "torso": {"r": -6}, "head": {"r": 2},
        "thigh_r": {"r": 14}, "shin_r": {"r": -20}, "thigh_l": {"r": -12}, "shin_l": {"r": -10},
    }, M.body_about((0, 0, 22), x=x, z=z, q=q, rz=rz))
    return merge(pose, F.expr("grit" if i < 3 else "yell"), {"brow": {"z": -1.0}})


def _attack_c():
    ov = {3: [_arc("club_r", TIP_R, t1=0.9, samples=20, band=0.4, **{"from": 2}),
              _arc("club_l", TIP_L, t1=0.9, samples=20, band=0.4, **{"from": 2})],
          4: [{"kind": "burst", "joint": "club_r", "point": TIP_R, "r0_lu": 7.0, "r1_lu": 13.0, "n": 5, "a0": -40.0, "arc": 120.0}]}
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4,
                  sequence=C_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    return K.hit(k, stance(), extra=lambda a: {"club_r": {"r": 14 * a}, "club_l": {"r": 20 * a}, "cloak": {"r": 10 * a}})


LOOSE = [None, (10, 0, 70, 50), (8, 0, 92, 170), (10, 0, 98, 300), (14, 0, 84, 420),
         (18, 0, 56, 530), (21, 0, 28, 610), (23, 0, 9, 630), (24, 0, 11, 632), (24, 0, 9, 630)]


def _die(k):
    def extra(kk, flail):
        out = {"club_l": {"r": 40 * flail}}
        if LOOSE[kk] is not None:
            x, y, z, r = LOOSE[kk]
            out["club_r"] = {"hide": True}
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
