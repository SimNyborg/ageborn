"""Alchemist: Medieval Age epic caster (CONTENT_PLAN 5.3). Vials (proj.vial); every 9 s a flask bursts, ~64 lu.

Look (A11, PLAN.md): a hunched, wiry old alchemist with a long grey beard, bushy brows and big brass-
rimmed goggles pushed up on a bald dome, in a team robe with a shortened, singed hem and a parchment
star patch, a leather apron with a row of corked vials (alchemical green and violet, never in the
team hue bands), a satchel and soft shoes. He holds a small green vial in the near hand; a big round
flask hangs at his belt for the special.

"A viewer expects him to toss bubbling potions, and to shuffle along with bottles clinking."

Animation (ANIM_SPEC G2 robed waddle, appendix B for a thrower: underhand toss, overhand hurl):
  idle      swirls the vial and peers at it through the goggles, the bubbles rise, blink
  walk      walk v3 brisk waddle at ground speed (card 60 x 1.25 = 75 lu/s): hunched, the robe hem
            kicking, the apron vials jiggling a frame late
  attack    UNDERHAND TOSS: swings the vial back low (the held extreme; a hold loop with a swirl while
            the sim wind-up lasts), then flips it underhand in a lob (the vial leaves `muzzle`)
  attack_b  OVERHAND HURL: uncorks and rears back with the vial high behind his head, then hurls it
            over the top with a green fizz
  hit       light: the goggles drop onto his eyes, the beard flips
  die       D3 dizzy sit: a puff of green smoke, spiral eyes
"""
import math

from ageborn_art import colors as C
from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "alchemist"
GAIT_NAME = "biped"
NAME = "Alchemist"
HEIGHT_LU = 64
CANVAS = (280, 256)
FEET = (116, 224)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30), "muzzle": (20, 44)}
NO_RETIME = True

SKIN = "#E6BE9A"
BEARD = "#C9C6C0"
LEATHER = "#6B5647"
LEATHER_DK = "#4E3F33"
SHOE = "#5A4A3D"
BRASS = "#B8A784"
LENS = "#CFE6DA"
GREEN = "#7BD88F"
GREEN_DK = "#4E9A62"
VIOLET = "#9C86C9"
PARCH = "#E8DFC8"
GLASS = "#DDE8E2"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
VIAL = (HR[0] + 1.0, HR[1] - 2.0, HR[2] + 4.0)
RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig, head=(1, 0, 37))
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        k = 1.0 if s == "r" else 0.8
        g = Geo().capsule((0, y, K.V3_THIGH_Z), (0.5, y, K.V3_KNEE_Z), 4.2, 3.6)
        rig.part(f"thigh_{s}", g, team=True)
        g = Geo().capsule((0.5, y, K.V3_KNEE_Z), (1.0, y, K.V3_ANKLE_Z + 0.4), 3.0, 2.8)
        rig.part(f"shin_{s}", g, C.scale("#6A6E5E", k))
        g = Geo().blob((2.8, y, 2.4), (4.6, 4.2, 2.4), p=2.6, taper=(1.02, 0.86))
        rig.part(f"foot_{s}", g, C.scale(SHOE, k))
    rig.track("_foot", "foot_r", (2.6, -B.LEG_Y, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, B.LEG_Y, 0.0))

    # the robe: a hunched team body, a leather apron with vials, a bell skirt with a singed hem
    body = Geo().blob((0.5, 0, 27.5), (11.4, 10.6, 12.0), p=2.2, taper=(1.1, 0.9))
    bface = F.Face(rig, "torso", [body])
    rig.part("torso", body, team=True)
    g = Geo()
    c = bface.hit(-2.0, 31.0)
    bface.decal(g, c, [(0.0, 3.0), (0.9, 0.9), (3.0, 0.6), (1.2, -0.6), (1.8, -3.0), (0.0, -1.4), (-1.8, -3.0),
                       (-1.2, -0.6), (-3.0, 0.6), (-0.9, 0.9)], 0.4)
    rig.part("torso", g, PARCH, highlight=False, outline=0)
    g = Geo().blob((4.6, 0, 22.0), (9.6, 9.6, 9.6), p=2.8)
    g.clip((4.0, 0, 0), (-1, 0, 0))
    g.clip((0, 0, 30.0), (0, 0, 1))
    rig.part("torso", g, LEATHER)
    rig.secondary("vials", "torso", (11.0, 0, 25.0), (11.0, 0, 19.0), max_deg=14, gain=1.3)
    for i, (y, col) in enumerate(((-6.0, GREEN), (-2.0, VIOLET), (2.0, GREEN), (6.0, VIOLET))):
        g = Geo().capsule((12.6, y, 21.0), (12.8, y, 25.0), 1.5, 1.2)
        rig.part("vials", g, col, finish="gloss", outline=0.5)
        g = Geo().capsule((12.8, y, 25.0), (12.9, y, 26.4), 0.9)
        rig.part("vials", g, LEATHER_DK, outline=0.3)
    rig.secondary("skirt", "hips", (0.8, 0, 17.0), (0.0, 0, 8.0), max_deg=14, gain=1.1)
    rig.rest_offset["skirt"] = (0, 0, K.V3_LIFT)
    g = Geo().lathe([(0, 9.4), (12.4, 9.6), (13.0, 11.0), (11.8, 14.0), (10.6, 18.0), (0, 18.5)],
                    (1.0, 0, 0), segs=24, squash=(1.0, 0.9))
    rig.part("skirt", g, team=True)
    g = Geo()
    for k in range(7):   # singed hem notches
        t = math.radians(-150 + 40 * k)
        g.blob((1.0 + 12.6 * math.cos(t), 11.6 * math.sin(t), 9.8), (2.0, 2.0, 1.2), p=2.0)
    rig.part("skirt", g, "#5A5560", outline=0.3)
    g = Geo().lathe([(11.8, -1.2), (12.6, 0), (11.8, 1.2)], (1.0, 0, 20.6), segs=24, squash=(1.0, 0.9))
    rig.part("torso", g, LEATHER_DK, outline=0.6)
    # the big flask at his belt
    g = Geo().sphere((-4.0, -11.8, 16.0), 4.0, cuts=3)
    rig.part("torso", g, GLASS, finish="gloss", outline=0.6)
    g = Geo().blob((-4.0, -12.2, 15.0), (3.0, 1.8, 2.6), p=2.0)
    rig.part("torso", g, GREEN, finish="gloss", outline=0)
    g = Geo().capsule((-4.0, -11.8, 19.6), (-4.0, -11.8, 22.0), 1.3)
    rig.part("torso", g, LEATHER_DK, outline=0.4)

    # head: bald dome, bushy brows, a long grey beard, goggles pushed up on the forehead
    head = Geo().blob((2, 0, 48.0), (11.2, 10.6, 11.6), p=2.2)
    head.blob((14.2, -0.6, 45.2), (4.0, 3.4, 3.6), p=2.0)   # big nose
    beard = Geo().blob((8.0, 0, 40.0), (8.0, 10.0, 7.6), p=2.2)
    beard.lathe([(6.0, 0), (4.0, 6.0), (0, 13.0)], (10.0, 0, 38.0), (12.0, 0, 26.0), segs=14)
    K.face2(rig, [head], SKIN, cx=12.2, cz=48.6, eye_r=(3.6, 3.3, 4.2), brow=BEARD, brow_w=1.05,
            mouth_dz=-7.4, mouth_x=12.6, eye_at=(13.8, 48.8), mark_r=3.9, extra_geos=[beard])
    rig.part("head", head, SKIN)
    rig.part("head", beard, BEARD, finish="hair")
    rig.secondary("beardtip", "head", (11.0, 0, 32.0), (12.0, 0, 26.0), max_deg=12, gain=1.2)
    g = Geo()
    for k in range(7):   # fluffy ring of hair round the back
        t = math.radians(110 + 140 * k / 6)
        g.blob((2.0 + 11.0 * math.cos(t), 10.6 * math.sin(t), 48.0), (3.6, 3.6, 4.2), p=2.1)
    rig.part("head", g, BEARD, finish="hair")
    rig.joint("goggles", "head", (8.0, 0, 55.0))
    g = Geo()
    for y in (-4.6, 4.4):
        g.lathe([(2.8, -1.0), (3.4, 0.0), (2.8, 1.0)], (10.6, y, 55.4), (11.6, y, 55.8), segs=16)
    rig.part("goggles", g, BRASS, finish="metal", outline=0.6)
    g = Geo()
    for y in (-4.6, 4.4):
        g.blob((11.2, y, 55.6), (1.2, 2.6, 2.6), p=2.0)
    rig.part("goggles", g, LENS, finish="gloss", outline=0)
    g = Geo().lathe([(11.6, -0.8), (12.0, 0.0), (11.6, 0.8)], (1.0, 0, 55.0), segs=24, rot=(0, 12, 0))
    rig.part("goggles", g, LEATHER_DK, outline=0.3)

    for s in ("r", "l"):
        B.arm_parts(rig, s, None, hand=SKIN, team_sleeve=True, r0=4.6, r1=4.2)
        y = B.ARM_Y[s]
        g = Geo().blob((0, y, B.HAND_Z + 3.4), (5.0, 5.0, 2.2), p=2.4)   # wide cuffs
        rig.part(f"fore_{s}", g, team=True, outline=0.6)

    # the vial in the near hand (its own joint: hidden right after the throw)
    rig.joint("vial", "hand_r", HR)
    vx, vy, vz = VIAL
    g = Geo().blob((vx, vy, vz), (2.2, 2.2, 2.8), p=2.0)
    rig.part("vial", g, GREEN, finish="gloss", outline=0.6)
    g = Geo().capsule((vx, vy, vz + 2.4), (vx, vy, vz + 4.6), 1.0)
    rig.part("vial", g, GLASS, finish="gloss", outline=0.4)
    g = Geo().capsule((vx, vy, vz + 4.4), (vx, vy, vz + 5.6), 1.2)
    rig.part("vial", g, LEATHER_DK, outline=0.3)
    rig.joint("fizz", "vial", (vx, vy, vz + 6.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0.0, 7.6, 1.6), (1.6, 10.2, 1.2), (-1.0, 12.0, 1.0)):
        g.sphere((vx + dx, vy - 0.6, vz + dz), r, cuts=2)
    rig.part("fizz", g, glow=GREEN, outline=0)
    rig.track("muzzle", "vial", VIAL)


# -- poses ---------------------------------------------------------------------------------
def thrower(a, f, w=90.0):
    return B.arm("r", a, f, w, w_rest=90.0)


STANCE = merge(thrower(-60, 10, 90), B.arm("l", -70, 20), {"torso": {"r": 8}})


def _idle(f):
    look = [0.2, 0.7, 1.0, 1.0, 0.6, 0.2][f]

    def extra(ctx):
        return merge(thrower(-60 + 40 * look, 10 + 70 * look, 90 + 20 * math.sin(f)),
                     {"head": {"r": 4 * look}, "fizz": {"show": look > 0.9}, "vials": {"r": 3 * ctx["lag"]},
                      "brow": {"z": 0.6 * look}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_r", "fore_r", "hand_r")}
    return M.idle_v2(f, base, frames=6, chest=0.04, extra=extra, blink=5, face_blink=F.expr("blink"))


SPEED = 75.0
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=560, stance=0.44, lift=6.0, kick=2.0, toe_off=20.0, early_lift=1.4)
WADDLE_BOB = [-3.2, -3.8, 0.0, 1.4]


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"vials": {"r": 8 * lag}, "skirt": {"r": 5 * lag}, "beardtip": {"r": 5 * lag},
                "torso": {"rx": 5 * math.sin(ctx["p"])}, "body": {"rx": 3 * math.sin(ctx["p"])}}
    return M.walk_v3(RIG, f, STANCE, GAIT, legs=LEGS, bob=WADDLE_BOB, sq=M.BRISK_SQ, lean=-2.0, twist=5.0,
                     nod=3.0, sway=5.0, arms={"l": K.ArmChain("l")}, arm=26.0, elbow=(20.0, 50.0),
                     extra=extra, report=report)


# -- attack A: underhand toss (moves.SMALL_MELEE_MS; hold step 3 loops with the swirl step 2) ---------
#        read  dip  back HOLD swing swing LOB  over land reach settle
L_A = [-60, -90, -130, -150, -100, -50, 10, 30, -20, -50, -60]
L_F = [10, -60, -120, -150, -80, -20, 40, 60, -10, 0, 10]
L_W = [90, 40, -60, -100, -40, 20, 80, 110, 60, 80, 90]
T_R = [8, 10, 14, 16, 10, 4, -4, -2, 6, 8, 8]
B_X = [0.0, -1.0, -2.0, -3.0, -1.0, 2.0, 4.0, 4.5, 3.0, 1.0, 0.0]
B_Z = [0.0, -1.5, -0.8, -0.4, -1.0, 0.5, 3.0, 2.0, -1.2, -0.3, 0.0]
B_Q = [-0.03, -0.10, -0.04, -0.06, 0.02, 0.06, 0.12, 0.05, -0.12, 0.02, 0.0]


def _attack_pose(f):
    pose = merge(thrower(L_A[f], L_F[f], L_W[f]), B.arm("l", -40, 30), {
        "torso": {"r": T_R[f]}, "head": {"r": [0, 2, 4, 6, 2, -2, -6, -4, 0, -2, 0][f]},
        "thigh_r": {"r": [0, -4, -8, -14, -8, 6, 16, 12, 8, 2, 0][f]},
        "thigh_l": {"r": [0, 4, 8, 10, 6, -6, -14, -10, -6, -2, 0][f]},
        "vial": {"hide": f in (7, 8)}, "fizz": {"show": f in (2, 3)},
        "vials": {"r": [0, 2, 4, 6, 0, -6, -10, -6, 0, 0, 0][f]},
    }, M.body_about((0, 0, 24), x=B_X[f], z=B_Z[f], q=B_Q[f]))
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.6}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("o"))
    elif f in (7, 8):
        pose = merge(pose, F.expr("yell"))
    return pose


SWING = {"kind": "arc", "joint": "hand_r", "inner": (HR[0], HR[1], HR[2]), "outer": VIAL, "color": "#BDEBC8",
         "taper": 0.1, "white": 0.3, "t0": 0.0, "t1": 0.95, "lines": 2}


def _attack_clip():
    ov = {4: [dict(SWING, **{"from": 3})], 5: [dict(SWING, **{"from": 4})],
          6: [{"kind": "burst", "joint": "hand_r", "point": VIAL, "r0_lu": 4.0, "r1_lu": 8.0, "n": 4,
               "a0": 20.0, "arc": 100.0, "color": "#BDEBC8"}]}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, extra={"holdStep": 3, "holdLoop": [2, 3]})


# -- attack B: overhand hurl ------------------------------------------------------------------------------
OB_A = [96, 128, 104, 76, 58, 10, -40]
OB_F = [150, 158, 92, 58, 44, -20, -40]
OB_W = [150, 170, 120, 80, 60, -10, -40]
OB_T = [4, 10, 2, -6, -12, -12, -2]
OB_X = [-1.0, -2.5, 1.0, 3.5, 5.0, 5.5, 3.0]
OB_Z = [0.6, 1.0, 1.2, 0.8, 0.0, -1.4, -0.6]
OB_Q = [0.03, 0.07, 0.04, 0.0, -0.10, -0.12, -0.02]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    pose = merge(thrower(OB_A[k], OB_F[k], OB_W[k]), B.arm("l", -20, 40), {
        "torso": {"r": OB_T[k]}, "head": {"r": -0.5 * OB_T[k]},
        "thigh_r": {"r": [-6, -14, 4, 14, 22, 20, 8][k]}, "thigh_l": {"r": [8, 12, 0, -8, -16, -14, -6][k]},
        "vial": {"hide": k >= 5}, "fizz": {"show": k in (0, 1, 2)},
    }, M.body_about((0, 0, 24), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.6}})
    elif k in (2, 3):
        pose = merge(pose, F.expr("o"))
    elif k == 4:
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_b():
    ov = {4: [dict(SWING, **{"from": 3})], 5: [dict(SWING, **{"from": 3})],
          6: [{"kind": "burst", "joint": "hand_r", "point": VIAL, "r0_lu": 4.0, "r1_lu": 9.0, "n": 5,
               "a0": -10.0, "arc": 100.0, "color": "#BDEBC8"}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -20 * max(a, 0)},
                "arm_r": {"r": 26 * a}, "arm_l": {"r": 12 * a},
                "goggles": {"z": -5.0 * max(a, 0)}, "beardtip": {"r": -10 * a},
                "brow": {"z": 1.4 * max(a, 0)}, "skirt": {"r": -6 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("o") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.7, 0.2, 0.4, 0.1, 0.0, 0.0, 0.0][k]
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=24.0, height=HEIGHT_LU), K.d3_sit(k), {
        "arm_r": {"r": 80 * flail}, "arm_l": {"r": 60 * flail}, "fore_l": {"r": 30 * t},
        "skirt": {"sz": 1.0 - 0.5 * t, "sx": 1.0 + 0.15 * t}, "fizz": {"show": 1 <= k <= 4},
    })
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
