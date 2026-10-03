"""Bandmaster: Industrial Age rare Support aura (CONTENT_PLAN 5.5). Cornet blast (proj.note), ~70 lu.

Look (A11, Industrial palette): a proud, round-bellied bandmaster with a waxed black moustache in a
tall team bandmaster's cap with a brass lyre badge and a cream plume, a team frock coat with cream
frogging across the chest and brass buttons, white gloves, iron-blue trousers with a cream stripe
and polished boots. He plays a brass cornet in the near hand and conducts with a white baton in the
far hand.

"A viewer expects him to point the baton and blast a note from the cornet, and to strut in a
high-kneed parade march in time with the music."

Animation (ANIM_SPEC G1 march, appendix B for an instrument support: aimed blast, baton flourish):
  idle      taps the baton in the air keeping time, the plume bobs, blink
  walk      walk v3 bounce jog at ground speed (card 65 x 1.25 = 81.25 lu/s), a strut with high
            knees, the baton swinging, the cornet held at his chest
  attack    CORNET BLAST: raises the cornet to his lips, leans back with puffed cheeks (the held
            extreme, a breath hold loop), then a big blast: the note leaves the bell (`muzzle`),
            rings at the bell, he rocks forward
  attack_b  BATON FLOURISH: whips the baton up and over and points it at the foe like a sword; the
            note flies off the baton tip (rings)
  hit       light: the head snaps back, the tall cap tips
  die       D1 fling and spin: the cap pops off, the cornet flies, X eyes and tongue
"""
from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "bandmaster"
GAIT_NAME = "biped"
NAME = "Bandmaster"
HEIGHT_LU = 70
CANVAS = (296, 284)
FEET = (128, 254)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (26, 46)}
NO_RETIME = True

FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
FIST_L = (0.4, I.ARM_Y["l"] + 1.0, I.HAND_Z - 0.4)
CORNET_L = 14.0
BELL = (FIST[0], FIST[1], FIST[2] + CORNET_L)
BATON_TIP = (FIST_L[0], FIST_L[1], FIST_L[2] + 15.0)
CAP_C = (1.0, 0.0, 57.4)
GLOVE = "#F1ECE2"
BLACK = "#2E2B2C"


def _cornet(rig, joint, fist):
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 2.0), (cx, cy, cz + CORNET_L - 4.0), 1.2)
    g.capsule((cx + 2.2, cy, cz), (cx + 2.2, cy, cz + 7.0), 1.6)          # the coil
    g.capsule((cx, cy, cz), (cx + 2.2, cy, cz), 1.2)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.6)
    g = Geo().lathe([(1.4, 0), (1.8, 2.0), (3.0, 3.2), (4.4, 4.0)], (cx, cy, cz + CORNET_L - 4.0),
                    (cx, cy, cz + CORNET_L), segs=18)
    rig.part(joint, g, I.BRASS, finish="metal", outline=0.7)              # the bell
    g = Geo()
    for z in (2.0, 4.0, 6.0):
        g.capsule((cx + 1.2, cy - 1.6, cz + z), (cx + 1.2, cy - 1.6, cz + z + 0.6), 0.6)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.3)           # valves
    return (cx, cy, cz + CORNET_L)


def _baton(rig, joint, fist):
    cx, cy, cz = fist
    g = Geo().capsule((cx, cy, cz - 1.0), (cx, cy, cz + 15.0), 1.0, 0.7)
    rig.part(joint, g, GLOVE, outline=0.5)
    g = Geo().blob((cx, cy, cz - 1.4), (1.2, 1.2, 1.4), p=2.4)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.4)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.DENIM, boot=BLACK)
    for s in ("r", "l"):
        y = I.LEG_Y * I.SIDE_Y[s]
        g = Geo().capsule((3.0, y - 2.8, KI.V3_THIGH_Z), (3.4, y - 2.8, KI.V3_KNEE_Z), 1.0)
        rig.part(f"thigh_{s}", g, I.CREAM, outline=0)
    coat = Geo().blob((0, 0, 27.6), (11.4, 10.4, 11.6), p=2.4, taper=(1.12, 0.92))
    coat.blob((0.3, 0, 17.4), (11.4, 10.4, 5.0), p=2.6)
    cface = F.Face(rig, "torso", [Geo().blob((0, 0, 27.6), (11.4, 10.4, 11.6), p=2.4, taper=(1.12, 0.92))])
    rig.part("torso", coat, team=True)
    g = Geo()
    for z in (24.0, 27.5, 31.0):   # cream frogging across the chest
        cface.decal(g, cface.hit(9.0, z), [(-4.0, -0.7), (4.0, -0.7), (4.0, 0.7), (-4.0, 0.7)], 0.5)
    rig.part("torso", g, I.CREAM, highlight=False, outline=0)
    g = Geo()
    for z in (24.0, 27.5, 31.0):
        g.sphere((11.8, -2.0, z), 0.9, cuts=2)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0.3)
    g = Geo().blob((0.2, 0, 20.2), (11.8, 10.8, 1.8), p=3.2)
    rig.part("torso", g, I.LEATHER_DK)
    g = Geo().blob((0.4, 0, 15.2), (11.6, 10.6, 5.4), p=2.6, taper=(1.12, 1.0))
    g.clip((0, 0, 13.0), (0, 0, -1))
    rig.part("hips", g, team=True)
    rig.secondary("coattail", "hips", (-4.0, 0, 15.0), (-9.0, 0, 6.0), max_deg=22, gain=1.1)
    g = Geo().blob((-6.0, 0, 13.0), (6.0, 9.0, 5.0), p=2.6, taper=(1.25, 0.9))
    g.clip((0, 0, 15.5), (0, 0, 1))
    rig.part("coattail", g, team=True)

    face = KI.head_face(rig, brow=BLACK, brow_angry=False, mouth_dz=-9.4, mouth_w=5.4)
    del face
    I.moustache(rig, BLACK, curl=True, big=1.2)
    I.sideburns(rig, BLACK)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j, live=False))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, hand=GLOVE, fist=4.4, cuff=I.CREAM)
    I.shoulders(rig, team=True)

    rig.joint("cornet", "hand_r", FIST)
    rig.rest_scale["cornet"] = 1.2
    bell = _cornet(rig, "cornet", FIST)
    KI.loose(rig, "cornet_loose", FIST, lambda j: _cornet(rig, j, FIST))
    rig.track("muzzle", "cornet", bell)
    rig.joint("baton", "hand_l", FIST_L)
    _baton(rig, "baton", FIST_L)
    rig.track("batonTip", "baton", BATON_TIP)


def _cap(rig, joint, live=True):
    x, y, z = CAP_C
    g = Geo().lathe([(0, 0), (10.2, 0), (11.0, 8.0), (11.6, 11.6), (0, 12.0)], (x - 0.4, y, z - 2.0), (x - 1.2, y, z + 10.0),
                    segs=24)
    rig.part(joint, g, team=True)
    g = Geo().blob((x + 10.2, y, z - 1.6), (4.6, 8.6, 0.9), p=2.8, rot=(0, -12, 0))
    rig.part(joint, g, BLACK, finish="gloss")
    g = Geo().lathe([(10.6, 0), (10.8, 1.6), (10.6, 3.0)], (x - 0.4, y, z - 1.6), (x - 0.5, y, z + 1.4), segs=24)
    rig.part(joint, g, I.CREAM, outline=0.5)
    g = Geo().blob((x + 10.4, y, z + 5.0), (0.8, 3.0, 3.2), p=2.4)
    rig.part(joint, g, I.BRASS_LT, finish="metal", outline=0.4)          # lyre badge
    pj = joint
    if live:
        rig.secondary("plume", joint, (x - 2.0, y, z + 10.0), (x - 4.0, y, z + 18.0), max_deg=28, gain=1.5)
        pj = "plume"
    g = Geo().blob((x - 2.6, y, z + 14.5), (2.8, 2.8, 5.4), p=2.0, rot=(0, -18, 0))
    rig.part(pj, g, I.CREAM, outline=0.5)


def arms(a, f, la, lf, lean=0.0, w=None, wl=None):
    return merge(KI.aim_arm("r", a, f, lean, w), KI.aim_arm("l", la, lf, lean, wl))


CHEST = (-60.0, 60.0, 90.0)      # the cornet held up at his chest, bell up
STANCE = merge(arms(-60.0, 60.0, -50.0, 20.0, lean=-4.0, w=90.0, wl=60.0), {"torso": {"r": -4.0}})


def _idle(f):
    beat = [0.0, 1.0, 0.0, 1.0, 0.0, 0.5][f]

    def extra(ctx):
        return merge(arms(-60.0, 60.0, -50.0 + 20 * beat, 20.0 + 40 * beat, lean=-4.0, w=90.0, wl=60.0 + 30 * beat),
                     {"head": {"r": 3 * beat}, "plume": {"r": 4 * ctx["lag"]}})
    return M.idle_v2(f, {"torso": {"r": -4.0}}, frames=6, extra=extra, face_blink=F.expr("blink"), blink=4)


SPEED = 81.25
LEGS = KI.legs_ik()
GAIT = KI.jog_gait(LEGS, SPEED, cycle_ms=616)
CARRY = merge(arms(-62.0, 64.0, -60.0, 20.0, lean=-5.0, w=90.0, wl=40.0), {"torso": {"r": -5.0}})


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"hand_r": {"r": -4 * lag}, "hat": {"r": -2.0 * lag}, "plume": {"r": 8 * lag}, "coattail": {"r": 6 * lag},
                "baton": {"r": 20 * lag}}
    return M.walk_v3(RIG, f, CARRY, GAIT, legs=LEGS, lean=-3.0, twist=6.0, nod=3.0,
                     arms={"l": KI.ArmChain("l")}, arm=36.0, extra=extra, report=report)


# -- attack A: cornet blast (SMALL_MELEE_MS, the note on 6; hold 3 loops with 2: puffing up)
#        read lift  lips HOLD  puff  BLAST IMP  rock recoil down settle
A_A = [-60, -40, -20, -16, -18, -14, -10, -20, -36, -50, -58]
A_F = [60, 90, 120, 124, 122, 116, 112, 100, 80, 66, 60]
A_W = [90, 50, 10, 16, 12, 4, 0, 10, 40, 70, 88]
A_LA = [-50, -40, -30, -20, -24, -40, -60, -60, -56, -52, -50]
A_LF = [20, 40, 60, 70, 66, 40, 0, -10, 0, 10, 20]
A_T = [-4, -6, -10, -14, -14, -8, 2, 6, 0, -3, -4]
A_X = [0.0, 0.0, -0.5, -1.5, -1.5, 0.5, 2.5, 3.5, 2.0, 0.5, 0.0]
A_Q = [0.0, 0.0, 0.02, 0.05, 0.06, 0.0, -0.08, -0.04, 0.0, 0.0, 0.0]


def _attack_pose(f):
    t = A_T[f]
    pose = merge(arms(A_A[f], A_F[f], A_LA[f], A_LF[f], lean=t, w=A_W[f], wl=60.0), {
        "torso": {"r": t}, "head": {"r": [0, 0, -4, -6, -6, -2, 4, 6, 2, 0, 0][f]},
        "thigh_r": {"r": [2, 4, 6, 8, 8, 6, 12, 14, 8, 4, 2][f]}, "shin_r": {"r": [0, -2, -4, -6, -6, -4, -10, -12, -6, -2, 0][f]},
        "thigh_l": {"r": [-2, -4, -6, -8, -8, -6, -10, -12, -8, -4, -2][f]},
        "plume": {"r": [0, 0, 4, 8, 8, -6, -14, -10, -4, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    if f in (3, 4):
        pose = merge(pose, F.expr("squeeze", "o"), {"head": {"sx": 1.04}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.2}})
    return KI.ground_feet(RIG, pose, LEGS)


def _blast(point, joint, seed):
    return [{"kind": "rings", "joint": joint, "point": point, "radii_lu": (5.0, 9.0), "a0": -70.0, "a1": 70.0,
             "color": "#FFF4D6"},
            {"kind": "burst", "joint": joint, "point": point, "r0_lu": 7.0, "r1_lu": 12.0, "n": 5, "a0": -45.0, "arc": 90.0,
             "color": "#FFF4D6"}]


def _attack_clip():
    ov = {6: _blast(BELL, "cornet", 101), 7: [{"kind": "rings", "joint": "cornet", "point": BELL, "radii_lu": (10.0, 14.0),
                                               "a0": -60.0, "a1": 60.0, "color": "#FFF4D6"}]}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, extra={"holdStep": 3, "holdLoop": [2, 3]})


# -- attack B: baton flourish. Unique frames 0, 1, 9, 10 are A's; 2 whip up, 3 HOLD (baton high and
# back over his head), 4-5 smear over the top, 6 POINT (the note leaves the baton tip), 7 hold, 8 recoil.
#        up  HOLD smear smear PNT hold recoil
B_LA = [60, 110, 80, 30, 6, 4, -20]
B_LF = [90, 140, 90, 30, 4, 2, -10]
B_WL = [120, 170, 110, 30, 2, 0, 20]
B_T = [-6, -10, -4, 4, 10, 8, 2]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    t = B_T[k]
    pose = merge(arms(-62.0, 64.0, B_LA[k], B_LF[k], lean=t, w=90.0, wl=B_WL[k]), {
        "torso": {"r": t, "rz": [-10, -16, -6, 6, 14, 12, 4][k]}, "head": {"r": -0.4 * t},
        "thigh_r": {"r": [4, 2, 8, 14, 20, 20, 10][k]}, "shin_r": {"r": [-2, 0, -6, -12, -16, -16, -8][k]},
        "thigh_l": {"r": [-4, -2, -8, -14, -22, -22, -10][k]},
        "plume": {"r": [4, 8, 0, -8, -14, -10, -4][k]},
    }, M.body_about((0, 0, 22), x=[0.0, -1.0, 0.5, 2.5, 4.5, 4.5, 2.0][k], q=[0.02, 0.06, 0.02, -0.04, -0.08, -0.04, 0][k]))
    pose = merge(pose, F.expr("yell" if k in (3, 4) else "grit"))
    return KI.ground_feet(RIG, pose, LEGS)


def _attack_b():
    arc = {"kind": "arc", "joint": "baton", "inner": (FIST_L[0], FIST_L[1], FIST_L[2] + 4.0), "outer": BATON_TIP,
           "color": GLOVE, "white": 0.4, "taper": 0.2, "lines": 2}
    ov = {4: [dict(arc, **{"from": 3, "t0": 0.0, "t1": 0.95})],
          5: [dict(arc, **{"from": 4, "t0": 0.2, "t1": 1.0})],
          6: _blast(BATON_TIP, "baton", 103)}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    # the note leaves the baton tip in B (a deliberately different release, ANIM_SPEC 2.2)
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_l": {"r": 40 * a}, "fore_l": {"r": 20 * a},
                "hat": {"z": 3.0 * max(a, 0), "r": 14 * a}, "brow": {"z": 1.6 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "grit"),
                       face_back=F.expr("grit") if k == 2 else None)


CORNET_PATH = [None, (6, 20, 60), (10, 34, 170), (14, 38, 300), (18, 28, 420), (21, 12, 520),
               (23, -2, 590), (24, -8, 612), (24, -8, 612), (24, -8, 612)]


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d1(k, center_z=28.0, lie_z=11.5, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "fore_r": {"r": 30 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    hp = KI.hat_pop(land=58.0, back=60.0)[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    cp = CORNET_PATH[k]
    if cp is not None:
        x, z, r = cp
        pose["cornet"] = {"hide": True}
        pose["cornet_loose"] = {"show": True, "x": x, "z": z, "r": r}
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
