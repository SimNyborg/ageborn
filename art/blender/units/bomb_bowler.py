"""Bomb Bowler: Industrial Age common ranged Thrower (CONTENT_PLAN 5.5). Lobbed bomb, splash r30, ~66 lu.

Look (A11, Industrial palette): a lanky factory sportsman in a team flat cap, a team knitted
sleeveless pullover with a cream cog over a cream shirt with rolled sleeves, braces, iron-blue
trousers and boots, a leather satchel of round iron bombs on his hip (each with a stub of fuse) and
a bomb in his bowling hand with a tiny yellow-white spark on its fuse.

"A viewer expects a short run-up and an overarm bowl, the round bomb sailing off his fingertips,
and a lanky jog with the bomb tossed in his hand."

Animation (ANIM_SPEC G1, appendix B for throwers: overhand, side-arm):
  idle      tosses the bomb from hand to hand, the fuse sparks, blink
  walk      walk v3 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), the bomb cupped at his
            chest, the far fist pumping, the satchel bouncing
  attack    OVERARM BOWL: a skip step, the arm straight back and low, the far arm pointing at the
            target, the front knee lifted (the held extreme, a fuse-fizz hold loop), then the arm
            windmills over the top (a crescent smear) and the bomb leaves his fingertips (`muzzle`),
            follow-through down past the knee, a new bomb from the satchel
  attack_b  UNDERARM LOB: drops into a deep crouch with the bomb swung back low, then lobs it
            underarm up and out like a bowls player
  hit       light: the head snaps back, the cap lifts, eyes squeezed
  die       D1 fling and spin: the cap pops off, the bomb rolls away, X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "bomb_bowler"
GAIT_NAME = "biped"
NAME = "Bomb Bowler"
HEIGHT_LU = 66
CANVAS = (300, 276)
FEET = (130, 248)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 31), "muzzle": (14, 56)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
BOMB_C = (FIST[0] + 2.6, FIST[1] - 1.4, FIST[2] - 3.2)
CAP_C = (1.0, 0.0, 57.4)
BOMB = "#34343A"


def _bomb(rig, joint, c, spark=True, name="bfuse"):
    g = Geo().sphere(c, 4.4, cuts=4)
    rig.part(joint, g, BOMB, finish="gloss", outline=0.7)
    g = Geo().capsule((c[0], c[1], c[2] + 3.2), (c[0] + 0.8, c[1], c[2] + 5.4), 0.6)
    rig.part(joint, g, "#C9B48A", outline=0.3)
    if spark:
        I.fuse_spark(rig, joint, (c[0] + 1.0, c[1] - 0.6, c[2] + 6.2), size=1.2, name=name)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM)
    g = Geo().blob((0, 0, 28.0), (10.2, 9.2, 11.4), p=2.4, taper=(1.04, 0.94))
    rig.part("torso", g, I.CREAM)
    vest = Geo().blob((0.3, 0, 27.0), (10.8, 9.8, 10.4), p=2.6, taper=(1.05, 0.92))
    vest.clip((0, 0, 35.4), (0, 0, 1))
    vface = F.Face(rig, "torso", [Geo().blob((0.3, 0, 27.0), (10.8, 9.8, 10.4), p=2.6, taper=(1.05, 0.92))])
    rig.part("torso", vest, team=True)
    g = KI.cog(vface, Geo(), (9.8, 27.6), s=0.9)
    rig.part("torso", g, KI.CREAM, highlight=False, outline=0)
    g = Geo()
    for z in (19.0, 21.4):   # knitted ribbing at the waist
        g.blob((0.3, 0, z), (11.0, 10.0, 0.8), p=3.0)
    rig.part("torso", g, team=True, outline=0.3)
    g = Geo().blob((0.5, 0, 15.6), (11.0, 10.2, 4.4), p=2.6, taper=(1.08, 1.0))
    g.clip((0, 0, 13.0), (0, 0, -1))
    rig.part("hips", g, I.DENIM)
    # the bomb satchel on the far hip with two bombs peeking out
    rig.secondary("satchel", "hips", (-4.0, 10.0, 20.0), (-5.0, 11.0, 13.0), max_deg=24, gain=1.4)
    g = Geo().blob((-5.0, 11.6, 15.0), (5.0, 2.6, 4.4), p=2.8)
    rig.part("satchel", g, I.LEATHER, outline=0.6)
    _bomb(rig, "satchel", (-7.0, 11.0, 19.4), spark=False)
    _bomb(rig, "satchel", (-2.6, 11.4, 19.0), spark=False)
    g = Geo().capsule((-5.0, 9.6, 19.0), (6.0, -9.0, 36.0), 1.0)
    rig.part("torso", g, I.LEATHER_DK, outline=0.4)

    face = KI.head_face(rig, brow=I.HAIR_RED, brow_angry=False, mouth_dz=-9.0, mouth_w=5.8, mouth_shape="smile")
    del face
    I.back_hair(rig, I.HAIR_RED)
    I.sideburns(rig, I.HAIR_RED)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    I.flat_cap(rig, c=CAP_C, team=True, joint="hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: I.flat_cap(rig, c=CAP_C, team=True, joint=j))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=I.CREAM, team_sleeve=False, rolled=True, fist=4.4)
    I.shoulders(rig, team=True)

    rig.joint("bomb", "hand_r", FIST)
    _bomb(rig, "bomb", BOMB_C)
    rig.track("muzzle", "hand_r", BOMB_C)
    rig.joint("roll", "root", BOMB_C, hidden=True)
    _bomb(rig, "roll", BOMB_C, spark=False)


def arms(a, f, la=-70.0, lf=-40.0, lean=0.0):
    return merge(KI.aim_arm("r", a, f, lean), KI.aim_arm("l", la, lf, lean))


CUP = (-70.0, 30.0)     # the bomb cupped at his chest
STANCE = merge(arms(*CUP, -60.0, 20.0, lean=-2.0), {"torso": {"r": -2.0}})


def _idle(f):
    toss = [0.0, 0.5, 1.0, 0.6, 0.2, 0.0][f]

    def extra(ctx):
        return merge(arms(-70.0, 30.0 + 50 * toss, -60.0, 20.0 + 4 * ctx["lag"], lean=-2.0),
                     {"bomb": {"z": 7.0 * toss, "r": 120 * toss}, "pupils": {"z": 0.8 * toss}, "head": {"r": 4 * toss},
                      "satchel": {"r": 3 * ctx["lag"]}})
    return M.idle_v2(f, {"torso": {"r": -2.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 81.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=616)
CARRY = merge(arms(-72.0, 34.0, lean=-8.0), {"torso": {"r": -3.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -6 * lag}, "hat": {"r": -2.0 * lag}, "satchel": {"r": 8 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-9.0, twist=7.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=36.0, extra=extra, report=report)


# -- attack A: overarm bowl (SMALL_MELEE_MS, release on 6; hold 3 loops with 2: the fuse fizz)
#        read skip  coil HOLD smear smear REL  thru recoil fetch settle
A_A = [-70, -80, 200, 168, 120, 70, 24, -60, -80, -76, -72]
A_F = [30, 0, 200, 160, 110, 66, 22, -64, -60, -10, 26]
A_LA = [-60, -30, 10, 24, 30, 0, -40, -80, -76, -66, -60]
A_LF = [20, 20, 18, 26, 30, -10, -50, -60, -40, 0, 20]
A_T = [-2, -4, 10, 14, 8, -6, -18, -24, -12, -5, -3]
A_X = [0.0, 1.0, -1.0, -2.0, 0.0, 3.0, 6.0, 7.0, 4.0, 1.5, 0.5]
A_Z = [0.0, 0.5, 0.5, 1.0, 1.0, 0.0, -2.0, -3.4, -1.4, -0.4, 0.0]
A_Q = [0.0, 0.0, 0.04, 0.08, 0.06, 0.0, -0.08, -0.12, -0.04, 0.0, 0.0]
A_THR = [2, 20, 40, 52, 30, 10, 20, 30, 16, 6, 2]
A_SHR = [0, -40, -60, -70, -40, -10, -20, -30, -10, -4, 0]
A_THL = [-2, -10, -10, -8, -16, -24, -30, -34, -16, -6, -2]
A_SHL = [0, -8, -6, -4, -8, -10, -14, -16, -6, -2, 0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(arms(A_A[f], A_F[f], A_LA[f], A_LF[f], lean=t), {
        "torso": {"r": t, "rz": [0, 2, 6, 8, 4, -4, -10, -12, -6, -2, 0][f]},
        "head": {"r": -0.4 * t},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
        "bomb": {"hide": f in (6, 7, 8)},
        "satchel": {"r": [0, 4, 8, 10, 0, -8, -12, -10, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -1.0}, "pupils": {"x": 0.8}})
    elif f in (4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    air = f in (1, 2, 3)   # the front knee lifted: keep the near leg's FK pose
    out = KI.ground_feet(RIG, pose, LEGS)
    del air
    return out


def _ov_a():
    arc = {"kind": "arc", "joint": "hand_r", "inner": (FIST[0], FIST[1], FIST[2] + 6.0), "outer": BOMB_C,
           "color": "#EDE6D8", "white": 0.4, "taper": 0.25, "lines": 2}
    return {
        4: [dict(arc, **{"from": 3, "t0": 0.0, "t1": 0.95})],
        5: [dict(arc, **{"from": 4, "t0": 0.2, "t1": 1.0})],
        6: [dict(arc, **{"from": 5, "t0": 0.3, "t1": 1.0, "lines": 1}),
            {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 91, "spread": 0.8}],
    }


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=_ov_a(), extra={"holdStep": 3, "holdLoop": [2, 3]})


# -- attack B: underarm lob (deep crouch). Unique frames 0, 1, 9, 10 are A's.
#        crouch HOLD smear smear REL thru recoil
B_A = [230, 215, 250, 300, 330, 310, 290]
B_F = [230, 215, 250, 305, 336, 320, 310]
B_RX = [0, 0, 0, 0, 0, 0, 0]
B_T = [-2, 4, 0, -10, -16, -20, -10]
B_TZ = [6, 10, 6, 0, -8, -10, -4]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(arms(B_A[k], B_F[k], 0, 10, lean=t), {
        "arm_r": {"rx": B_RX[k]},
        "torso": {"r": t, "rz": B_TZ[k]}, "head": {"r": -0.3 * t, "rz": -0.5 * B_TZ[k]},
        "thigh_r": {"r": [20, 28, 26, 30, 34, 30, 16][k]}, "shin_r": {"r": [-30, -40, -36, -30, -26, -24, -10][k]},
        "thigh_l": {"r": [-14, -20, -24, -30, -36, -34, -16][k]}, "shin_l": {"r": [-14, -20, -14, -8, -6, -6, -4][k]},
        "bomb": {"hide": k in (4, 5, 6)},
    }, M.body_about((0, 0, 22), x=[0.0, -1.0, 1.0, 4.0, 7.0, 7.0, 3.0][k], z=[-4.0, -7.0, -6.0, -5.0, -4.0, -3.0, -2.0][k],
                    q=[-0.04, -0.08, 0.02, 0.06, -0.10, -0.06, 0.0][k]))
    pose = merge(pose, F.expr("yell" if k in (2, 3, 4) else "grit"))
    return KI.ground_feet(RIG, pose, LEGS, max_drop=9.0)


def _attack_b():
    arc = {"kind": "arc", "joint": "hand_r", "inner": (FIST[0], FIST[1], FIST[2] + 6.0), "outer": BOMB_C,
           "color": "#EDE6D8", "white": 0.4, "taper": 0.25, "lines": 2}
    ov = {4: [dict(arc, **{"from": 3, "t0": 0.0, "t1": 0.95})],
          5: [dict(arc, **{"from": 4, "t0": 0.2, "t1": 1.0})],
          6: [{"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 93, "spread": 0.8}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 14 * a}, "arm_l": {"r": 40 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 10 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


ROLL = [None, (4, 4, 40), (9, 6, 140), (14, 2, 260), (19, -14, 380), (23, -18, 470), (26, -18, 540),
        (27, -18, 560), (27, -18, 560), (27, -18, 560)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.0, height=HEIGHT_LU), {
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
    rp = ROLL[k]
    if rp is not None:
        x, z, r = rp
        pose["bomb"] = {"hide": True}
        pose["roll"] = {"show": True, "x": x, "z": z, "r": -r}
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
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
