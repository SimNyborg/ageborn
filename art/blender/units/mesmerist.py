"""Mesmerist: Gunpowder Age epic caster, daze (CONTENT_PLAN 5.4). Pocket watch and sparkles, ~70 lu.

Look (A11, Gunpowder palette): a lanky, theatrical showman with a curled moustache, a pointed goatee and
hypnotic half-lidded eyes, a tall black top hat with a team band and a pale-violet feather, a long
team frock coat with cream lapels (the hem lifted well clear of his feet), a cream waistcoat with a
watch chain, dark striped trousers and pointed black shoes. A big brass-rimmed pocket watch dangles on
a chain from his near hand; the far hand is spread in a showman's flourish.

"A viewer expects him to swing a pocket watch, flick sparkles and tiptoe."

Animation (ANIM_SPEC G2 tiptoe, appendix B for a caster: watch swing, two-hand flourish):
  idle      lets the watch swing like a pendulum and follows it with his eyes, twirls the moustache
  walk      walk v3 brisk tiptoe at ground speed (card 60 x 1.25 = 75 lu/s): up on his toes, knees
            high, the coat tails flicking a frame late, the watch swinging
  attack    WATCH SWING: raises the watch high and swings it in a wide circle (the held extreme, a
            hollow spiral ring smear while the wind-up lasts), then thrusts it at the foe and pale
            violet sparkles burst from it
  attack_b  TWO-HAND FLOURISH: spreads both arms wide over his head, fingers wiggling (the held extreme,
            a tall Y silhouette), then flicks both hands at the foe in a shower of sparkles
  hit       light: head snaps back, the top hat lifts, eyes squeezed
  die       D3 dizzy sit: spiral eyes (mesmerised by his own watch), the hat tumbles
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "mesmerist"
GAIT_NAME = "biped"
NAME = "Mesmerist"
HEIGHT_LU = 74
CANVAS = (330, 330)
FEET = (150, 286)
ANCHORS = {"head": (2, 72), "hitCenter": (0, 34), "muzzle": (18, 34)}
NO_RETIME = True

HAIR = "#3B302A"
TROUSER = "#4E4A50"
SHOE = "#26242A"
HAT = "#26242A"
VIOLET = "#D8C8F0"
WATCH = "#C8B88A"
HAT_C = (1.0, 0.0, 57.5)
HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
CHAIN = 9.0
WATCH_C = (HR[0] + 0.6, HR[1] - 1.0, HR[2] - CHAIN)


def _hat(rig, joint):
    x, y, z = HAT_C
    g = Geo().lathe([(0, 0), (8.2, 0), (8.6, 7.0), (9.4, 15.0), (0, 15.2)], (x, y, z - 0.8), (x, y, z + 14.4),
                    segs=24, squash=(1.0, 0.94))
    rig.part(joint, g, HAT, finish="gloss")
    g = Geo().lathe([(0, -0.6), (13.4, -0.6), (14.0, 0.2), (13.4, 0.8), (0, 0.8)], (x, y, z - 0.6),
                    (x, y, z + 0.6), segs=28, squash=(1.0, 0.9))
    rig.part(joint, g, HAT, finish="gloss", outline=0.6)
    g = Geo().lathe([(8.5, 0), (9.0, 0.3), (9.0, 3.2), (8.5, 3.5)], (x, y, z + 0.6), segs=24, squash=(1.0, 0.94))
    rig.part(joint, g, team=True)
    g = Geo().capsule((x - 4.0, -8.6, z + 3.0), (x - 9.0, -8.0, z + 13.0), 1.8, 0.8)
    rig.part(joint, g, VIOLET, outline=0.5)


def _watch(rig, joint, c):
    x, y, z = c
    g = Geo().lathe([(0, -1.0), (4.0, -1.0), (4.6, 0), (4.0, 1.0), (0, 1.0)], (x, y + 0.8, z), (x, y - 0.8, z), segs=20)
    rig.part(joint, g, WATCH, finish="metal", outline=0.7)
    g = Geo().lathe([(0, -0.2), (3.4, -0.2), (3.4, 0.2), (0, 0.2)], (x, y - 1.0, z), (x, y - 1.3, z), segs=20)
    rig.part(joint, g, "#F4EEDC", outline=0)
    g = Geo().capsule((x, y - 1.5, z), (x + 0.6, y - 1.5, z + 2.6), 0.35).capsule((x, y - 1.5, z), (x + 1.8, y - 1.5, z - 0.6), 0.35)
    rig.part(joint, g, B.BLACK, outline=0, highlight=False)
    g = Geo().capsule((x, y, z + 4.6), (HR[0] + 0.6, HR[1] - 0.6, HR[2] - 1.0), 0.45)
    rig.part(joint, g, WATCH, finish="metal", outline=0.3)


RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig)
    G.legs_v3(rig, TROUSER, SHOE, stocking=TROUSER, thigh_r=4.0, buckle=False)
    for s, y in (("r", -B.LEG_Y), ("l", B.LEG_Y)):
        g = Geo().capsule((1.4, y - (3.5 if s == "r" else -3.5), 17.5), (1.6, y - (3.4 if s == "r" else -3.4), 6.0), 0.4)
        rig.part(f"thigh_{s}", g, "#6E6A72", outline=0, highlight=False)   # pinstripe

    coat = Geo().blob((0, 0, 29.0), (10.6, 9.8, 12.4), p=2.4, taper=(1.12, 0.92))
    coat.blob((0, 0, 19.0), (10.2, 9.4, 4.8), p=2.6)
    rig.part("torso", coat, team=True)
    g = Geo().blob((8.0, -0.4, 28.0), (3.2, 5.2, 8.6), p=2.6)
    g.clip((7.0, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM, outline=0.6)                       # waistcoat
    g = Geo().capsule((10.2, -3.0, 25.6), (10.4, 2.4, 22.6), 0.5)
    rig.part("torso", g, WATCH, finish="metal", outline=0)           # watch chain
    g = Geo().blob((6.0, -4.6, 33.0), (2.4, 2.6, 5.4), p=2.4, rot=(0, -25, 0))
    g.blob((6.0, 4.6, 33.0), (2.4, 2.6, 5.4), p=2.4, rot=(0, -25, 0))
    rig.part("torso", g, B.CREAM, outline=0.5)                       # lapels
    g = Geo().blob((3.0, 0, 36.6), (5.6, 6.8, 2.2), p=2.4)
    rig.part("torso", g, B.CREAM)                                    # cravat
    # long frock-coat tails (hem 10 lu above the soles), flicking late
    rig.secondary("tails", "hips", (-3.0, 0, 18.0), (-7.0, 0, 9.0), max_deg=16, gain=1.3)
    rig.rest_offset["tails"] = (0, 0, K.V3_LIFT + 2.0)
    g = Geo().blob((-4.6, 0, 14.0), (5.2, 10.0, 8.4), p=2.6, taper=(0.65, 1.0), rot=(0, 12, 0))
    rig.part("tails", g, team=True)
    g = Geo().blob((-5.6, 0, 7.6), (3.4, 10.2, 1.6), p=2.6, rot=(0, 12, 0))
    rig.part("tails", g, B.CREAM, outline=0.5)

    head = G.head_geos(center=(2, 0, 49.0), r=(11.2, 10.6, 11.8), nose=(14.2, -0.6, 47.6), nose_r=(3.0, 2.6, 3.6))
    hair = Geo().blob((-5.4, 0, 47.0), (5.6, 10.2, 6.0), p=2.2)
    goatee = Geo().blob((11.4, 0, 38.6), (2.6, 3.0, 3.8), p=2.2)
    K.face2(rig, [head, hair, goatee], B.SKIN, cx=12.0, cz=50.4, eye_dy=(-4.4, 4.2),
            eye_r=(3.6, 3.4, 4.2), brow=HAIR, mouth_dz=-8.0, mouth_x=13.4, mouth_shape="smile",
            eye_at=(13.8, 50.6), mark_r=4.0)
    rig.part("head", head, B.SKIN)
    rig.part("head", hair, HAIR, finish="hair")
    rig.part("head", goatee, HAIR, finish="hair")
    B.moustache(rig, HAIR, cx=13.8, z=45.0)
    # heavy half-lids (the hypnotic look), part of the head
    g = Geo().blob((13.2, -4.4, 52.6), (2.8, 3.6, 1.6), p=2.2)
    rig.part("head", g, "#E3B996", outline=0.4)
    rig.joint("hat", "head", HAT_C)
    _hat(rig, "hat")
    rig.joint("hat_loose", "root", HAT_C, hidden=True)
    _hat(rig, "hat_loose")

    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM, r0=3.9, r1=3.4, fist=3.8)
        g = Geo().blob((0, B.ARM_Y[s], 37.0), (5.0, 4.6, 4.0), p=2.4)
        rig.part(f"arm_{s}", g, team=True)
    # the watch on its own joint hanging from the near hand
    rig.joint("watch", "hand_r", (HR[0] + 0.6, HR[1] - 0.6, HR[2] - 1.0))
    _watch(rig, "watch", WATCH_C)
    rig.track("watchC", "watch", WATCH_C)
    # sparkles at the far fingertips and at the watch (shown on the impact)
    for name, parent, at in (("spark_l", "hand_l", (1.0, B.ARM_Y["l"], B.HAND_Z - 3.0)), ("spark_w", "watch", WATCH_C)):
        rig.joint(name, parent, at, hidden=True)
        g = Geo()
        for dx, dz, r in ((4.0, 2.0, 2.4), (8.0, -1.0, 1.6), (6.0, 5.0, 1.4)):
            g.star((at[0] + dx, at[1] - 2.0, at[2] + dz), r * 1.6, r * 0.6, 0.8, points=4)
        rig.part(name, g, glow=VIOLET, outline=0)
    rig.track("muzzle", "watch", WATCH_C)


# -- poses ---------------------------------------------------------------------------------
def arms(ra, rf, la, lf, watch=0.0):
    pose = merge(B.arm("r", ra, rf), B.arm("l", la, lf))
    pose["watch"] = {"r": watch}
    return pose


STANCE = merge(arms(-40, 10, -30, 40), {"torso": {"r": 2}})


def _idle(f):
    sw = [0.0, 1.0, 0.5, -0.5, -1.0, -0.4][f]

    def extra(ctx):
        return merge(arms(-40, 10 + 2 * ctx["lag"], -30 + 6 * ctx["lag"], 44, watch=24 * sw),
                     {"pupils": {"x": 0.6 * sw, "z": -0.6}, "head": {"r": -3 + 2 * sw}, "tails": {"r": 3 * ctx["lag"]}})
    return M.idle_v2(f, STANCE, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


SPEED = 75.0
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=600, stance=0.44, lift=8.0, toe_off=30.0)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"tails": {"r": 8 * lag}, "watch": {"r": 20 * math.sin(ctx["p"])}, "hat": {"r": 2 * lag},
                "foot_r": {"r": -6}, "foot_l": {"r": -6}}
    return M.walk_v3(RIG, f, STANCE, GAIT, legs=LEGS, bob=M.BRISK_BOB, sq=M.BRISK_SQ, lean=-2.0, twist=5.0, nod=3.0,
                     arms={"l": K.ArmChain("l")}, arm=30.0, extra=extra, report=report)


# attack A: watch swing. moves.SMALL_MELEE_MS (impact 6), hold step 3 looping with step 2.
#        read   lift   circle HOLD   circle2 aim    THRUST over  lower  settle settle
A_RA = [-40, -30, -24, -20, -22, -10, -6, -10, -20, -36, -40]
A_RF = [10, 0, 6, 10, 8, 10, -2, -6, 0, 8, 10]
A_W = [0, 30, 90, 130, 170, 100, 90, 60, 10, 0, 0]
A_LA = [-30, -10, 10, 20, 16, -10, -40, -36, -30, -30, -30]
A_LF = [40, 70, 90, 100, 96, 60, 20, 26, 36, 40, 40]
A_LEAN = [2, 4, 6, 8, 7, 0, -10, -8, -2, 2, 2]
A_X = [0.0, -0.5, -1.0, -1.5, -1.5, 0.5, 3.0, 2.5, 1.0, 0.0, 0.0]
A_Q = [0.0, 0.01, 0.03, 0.04, 0.04, -0.02, -0.08, -0.03, 0.0, 0.0, 0.0]


def _a_pose(f):
    pose = merge(arms(A_RA[f] - A_LEAN[f], A_RF[f] - A_LEAN[f], A_LA[f] - A_LEAN[f], A_LF[f] - A_LEAN[f], A_W[f]), {
        "torso": {"r": A_LEAN[f]}, "head": {"r": -0.5 * A_LEAN[f]},
        "spark_w": {"show": f in (6, 7)}, "spark_l": {"show": f == 6},
        "tails": {"r": [0, 0, 2, 4, 4, 0, -6, -4, 0, 0, 0][f]},
    }, M.body_about((0, 0, 22), x=A_X[f], q=A_Q[f]))
    feet = ((3.0, 0, -12), (-3.0, 0, -12)) if f in (2, 3, 4) else ((4.0, 0, 0), (-4.0, 0, 0))
    pose = G.plant(RIG, pose, LEGS, r=feet[0], l=feet[1], max_drop=3.0)
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze"), {"pupils": {"hide": True}})
    elif f in (6, 7):
        pose = merge(pose, F.expr("o"))
    return pose


def _ov_a():
    return {
        3: [{"kind": "arc", "joint": "watch", "inner": (HR[0] + 0.6, HR[1], HR[2] - 4.0), "outer": WATCH_C,
             "color": VIOLET, "taper": 0.0, "white": 0.4, "t0": 0.0, "t1": 1.0, "lines": 2, "samples": 22,
             "band": 0.4, "from": 2}],
        6: [{"kind": "burst", "joint": "watch", "point": WATCH_C, "r0_lu": 5.0, "r1_lu": 12.0, "n": 7, "a0": -80.0,
             "arc": 160.0, "color": VIOLET},
            {"kind": "rings", "joint": "watch", "point": WATCH_C, "radii_lu": (6.0, 10.0), "a0": -60.0, "a1": 60.0,
             "color": VIOLET}],
    }


def _attack_clip():
    return M.clip("attack", [_a_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=_ov_a(), extra={"holdStep": 3, "holdLoop": [2, 3]})


# attack B: two-hand flourish (frames 0, 1, 8, 9, 10 are A's)
B_ARMS = {2: (-20, 50, 140, 110), 3: (-14, 60, 150, 120), 4: (-16, 58, 148, 118), 5: (40, 60, 30, 40),
          6: (-10, 0, -14, 4), 7: (-14, -6, -18, 0)}


def _b_pose(f):
    if f not in B_ARMS:
        return _a_pose(f)
    ra, rf, la, lf = B_ARMS[f]
    lean = [0, 0, 6, 10, 10, 0, -12, -10][f]
    pose = merge(arms(ra - lean, rf - lean, la - lean, lf - lean, [0, 0, -30, -60, -50, 0, 20, 10][f]), {
        "torso": {"r": lean}, "head": {"r": 6 - 0.4 * lean},
        "spark_l": {"show": f in (3, 4, 6, 7)}, "spark_w": {"show": f in (6, 7)},
    }, M.body_about((0, 0, 22), x=[0, 0, -1, -2, -2, 0, 3, 2.5][f], z=[0, 0, 1, 1.5, 1.5, 0, -1.5, -1][f],
                    q=[0, 0, 0.03, 0.05, 0.05, -0.02, -0.08, -0.03][f]))
    feet = ((4.0, 0, -14), (-4.0, 0, -14)) if f in (2, 3, 4) else ((6.0, 0, 0), (-5.0, 0, 0))
    pose = G.plant(RIG, pose, LEGS, r=feet[0], l=feet[1], max_drop=3.0)
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "o"))
    else:
        pose = merge(pose, F.expr("yell"))
    return pose


def _ov_b():
    pt = (1.0, B.ARM_Y["l"], B.HAND_Z - 3.0)
    return {6: [{"kind": "burst", "joint": "hand_l", "point": pt, "r0_lu": 5.0, "r1_lu": 14.0, "n": 8, "a0": -70.0,
                 "arc": 140.0, "color": VIOLET},
                {"kind": "burst", "joint": "watch", "point": WATCH_C, "r0_lu": 4.0, "r1_lu": 10.0, "n": 5, "a0": -60.0,
                 "arc": 120.0, "color": VIOLET}]}


def _attack_b():
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=_ov_b(), reuse=reuse, extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -20 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "arm_l": {"r": 24 * a}, "watch": {"r": 30 * a},
                "hat": {"r": 10 * a, "z": 3.0 * max(a, 0)}, "brow": {"z": 1.4 * max(a, 0)}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("o") if k == 2 else None)


HAT_PATH = {2: (-4.0, 8.0, -40.0), 3: (-9.0, 10.0, -100.0), 4: (-13.0, 4.0, -160.0), 5: (-16.0, -12.0, -200.0),
            6: (-18.0, -30.0, -250.0), 7: (-19.0, -46.0, -270.0), 8: (-19.0, -46.0, -270.0), 9: (-19.0, -46.0, -270.0)}


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.7, 0.2, 0.4, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=26.0, height=HEIGHT_LU), K.d3_sit(k), {
        "watch": {"r": 60 * flail}, "tails": {"r": 10 * flail},
    })
    if k in HAT_PATH:
        x, z, r = HAT_PATH[k]
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.6}})
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
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
