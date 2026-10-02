"""Friar: Medieval Age support (DESIGN A5.3). Heals allies; sling (proj.rock), ~64 lu.

Look (A11): a round, jolly friar with a bald tonsured head, a ring of brown hair, rosy
cheeks and a big nose, in a team-dyed habit with a parchment bear paw on the belly, a
parchment cowl with a wooden rosary, a knotted rope belt, a leather satchel with a bottle
and wooden sandals. He hugs a prayer book with a gold clasp in the far arm and carries a
leather sling in the near hand.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    reads his tiny book, nodding along (the head dips to the page), blink
  walk    walk v3 brisk waddle at ground speed (ANIM_SPEC G2): the habit hem kicks with the
          knees so the sandals show, side sway, the belly bouncing, the sling swinging late
  attack_b  OVERHAND SLING: whirls the sling up and cocks it back over his head (the held
          extreme, leaning back), then flings it over the top and the stone flies off the front
  attack  BELLY-BUMP UNDERHAND LOB: sways back and swings the sling back and up behind him
          (the held extreme: coiled on the back foot, the front knee up), then a big
          underhand pendulum swing (a low ring smear) and a little hop that bumps the belly
          forward as the stone is lobbed high off the front; he lands, squashes, and plucks a
          new stone from his belt. The stone leaves `muzzle` (the pouch) on the lob frame.
  hit     light: head back, eyes squeezed, the belly jiggles
  die     D3 dizzy sit: spins, sits down hard, legs out, the book in his lap, spiral eyes
"""
import math

from ageborn_art import colors as C
from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "friar"
GAIT_NAME = "biped"
NAME = "Friar"
HEIGHT_LU = 64
CANVAS = (256, 240)
FEET = (112, 212)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 30), "muzzle": (39, 27)}  # muzzle: release frame
NO_RETIME = True

SKIN = "#EBC4A0"
CHEEK = "#E2AE9E"
HAIR = "#5E4C3E"
ROPE = "#CDBB92"
PARCH = "#E8DFC8"
LEATHER = "#6B5647"
SANDAL = "#8C765F"
GOLD = "#D4A437"
ROCK = "#8C8A86"
BOOK = "#6E3346"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)
SLING = 16.0   # cord length from the fist to the pouch
RIG = None


def build(rig):
    global RIG
    RIG = rig
    K.skeleton_v3(rig, head=(1, 0, 37))
    # legs (walk v3): team habit cloth on the thighs, bare shins and sandalled feet below the
    # shortened habit; the far leg 20% darker
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        k = 1.0 if s == "r" else 0.8
        g = Geo().capsule((0, y, K.V3_THIGH_Z), (0.5, y, K.V3_KNEE_Z), 4.6, 4.0)
        rig.part(f"thigh_{s}", g, team=True)
        g = Geo().capsule((0.5, y, K.V3_KNEE_Z), (1.0, y, K.V3_ANKLE_Z + 0.4), 3.4, 3.0)
        rig.part(f"shin_{s}", g, C.scale(SKIN, k))
        g = Geo().blob((2.6, y, 1.4), (4.6, 4.3, 1.5), p=3.0, taper=(1.02, 0.9))   # sole
        rig.part(f"foot_{s}", g, C.scale(SANDAL, k))
        g = Geo().blob((2.2, y, 3.2), (4.0, 3.7, 2.2), p=2.4)
        rig.part(f"foot_{s}", g, C.scale(SKIN, k))
        g = Geo().capsule((0.2, y - 3.6, 3.6), (4.6, y - 3.4, 2.6), 0.7)            # strap
        rig.part(f"foot_{s}", g, C.scale(SANDAL, k), outline=0.4)
    rig.track("_foot", "foot_r", (2.6, -B.LEG_Y, 0.0))
    rig.track("_foot_l", "foot_l", (2.6, B.LEG_Y, 0.0))

    # the habit: a round belly and a bell skirt that swings on its own joint
    belly = Geo().blob((1.5, 0, 26.5), (12.8, 11.4, 12.2), p=2.1, taper=(1.12, 0.84))
    bface = F.Face(rig, "torso", [belly])
    rig.part("torso", belly, team=True)
    g = K.paw(bface, Geo(), (10.0, 25.5), s=1.45)
    rig.part("torso", g, PARCH, highlight=False, outline=0)
    # leather satchel on the far hip with a green bottle poking out
    g = Geo().blob((-6.5, 11.5, 19.0), (5.4, 2.6, 5.0), p=3.2)
    rig.part("torso", g, LEATHER)
    g = Geo().capsule((-8.0, 12.2, 22.0), (-9.4, 12.2, 29.0), 1.8, 1.2)
    rig.part("torso", g, "#4E7A52", finish="gloss", outline=0.7)
    g = Geo().capsule((-9.2, 12.2, 28.6), (-9.6, 12.2, 30.6), 1.4)
    rig.part("torso", g, "#B89C78", outline=0.5)
    # the habit, shortened for walk v3 (the hem 11 lu above the soles, ANIM_SPEC G2), swings
    rig.secondary("skirt", "hips", (0.8, 0, 17.0), (0.0, 0, 8.0), max_deg=14, gain=1.1)
    rig.rest_offset["skirt"] = (0, 0, K.V3_LIFT)
    g = Geo().lathe([(0, 9.0), (13.0, 9.2), (13.6, 10.8), (12.2, 14.0), (10.8, 18.0), (0, 18.5)],
                    (1.0, 0, 0), segs=24, squash=(1.0, 0.9))
    rig.part("skirt", g, team=True)
    # rope belt with a hanging knotted end
    g = Geo().lathe([(12.4, -1.3), (13.4, 0), (12.4, 1.3)], (2.0, 0, 20.8), segs=24, squash=(1.0, 0.9))
    g.capsule((11.0, -8.5, 20.5), (11.6, -9.4, 10.5), 1.2)
    g.sphere((11.6, -9.4, 14.2), 1.8, cuts=3).sphere((11.7, -9.5, 10.2), 1.8, cuts=3)
    rig.part("torso", g, ROPE, outline=0.8)
    # parchment cowl around the neck and shoulders
    g = Geo().blob((0.2, 0, 36.2), (11.6, 12.4, 4.6), p=2.4, taper=(1.12, 0.9))
    g.blob((-9.0, 0, 38.5), (4.4, 9.5, 5.2), p=2.2)
    rig.part("torso", g, PARCH)
    # a wooden rosary on the cowl with a little cross
    g = Geo()
    for k in range(7):
        t = math.radians(-70 + 20 * k)
        g.sphere((1.2 + 12.2 * math.cos(t), 12.6 * math.sin(t) * 0.9, 33.8 - 2.2 * math.cos(t * 1.4)), 1.25, cuts=2)
    g.capsule((12.8, -2.0, 31.6), (12.8, -2.0, 26.8), 0.9)
    g.capsule((12.8, -3.8, 29.8), (12.8, -0.2, 29.8), 0.9)
    rig.part("torso", g, "#8A6A4E", outline=0.5)

    # head: bald tonsure, hair ring, rosy cheeks, big nose, happy eyes
    head = Geo().blob((2, 0, 48.0), (11.8, 11.2, 11.6), p=2.2)
    head.blob((14.2, -0.6, 45.6), (3.8, 3.4, 3.6), p=2.0)  # nose
    K.face2(rig, [head], SKIN, cx=12.2, cz=48.8, eye_r=(3.6, 3.3, 4.0), brow=HAIR, brow_angry=False,
            brow_w=0.85, mouth_dz=-7.4, mouth_x=12.6, eye_at=(13.8, 49.0), mark_r=3.8,
            mouth_shape="smile", mouth_w=5.4)
    rig.part("head", head, SKIN)
    # the tonsure: a fluffy ring of hair around the back and sides, above the ears
    g = Geo()
    for k in range(9):
        t = math.radians(100 + 160 * k / 8)
        g.blob((2.0 + 11.2 * math.cos(t), 10.8 * math.sin(t), 52.0 + 0.8 * math.sin(3 * t)),
               (4.2, 4.2, 3.6), p=2.1)
    rig.part("head", g, HAIR, finish="hair")
    for y in (-6.8, 6.4):
        g = Geo().blob((10.8, y, 43.8), (2.6, 2.6, 2.1), p=2.0)
        rig.part("head", g, CHEEK, highlight=False, outline=0)

    # far arm hugs a prayer book; near arm swings the sling (both in team sleeves)
    B.arm_parts(rig, "l", None, hand=SKIN, team_sleeve=True, r0=4.8, r1=4.4)
    B.arm_parts(rig, "r", None, hand=SKIN, team_sleeve=True, r0=4.8, r1=4.4)
    g = Geo().blob((3.0, B.ARM_Y["l"] - 3.5, B.HAND_Z + 3.0), (5.2, 2.2, 6.8), p=4.0)
    rig.part("hand_l", g, BOOK)
    g = Geo().blob((3.0, B.ARM_Y["l"] - 3.9, B.HAND_Z + 3.0), (4.6, 2.2, 6.2), p=4.0)
    g.clip((0, B.ARM_Y["l"] - 3.2, 0), (0, 1, 0))
    rig.part("hand_l", g, PARCH, outline=0.6)
    g = Geo().blob((7.8, B.ARM_Y["l"] - 3.8, B.HAND_Z + 3.0), (1.2, 1.4, 1.8), p=3.0)
    rig.part("hand_l", g, GOLD, finish="metal", outline=0.6)

    # the sling hangs from the near fist (rest direction -90): two cords, pouch, rock
    x, y, z = HR
    rig.joint("sling", "hand_r", (x, y - 1.0, z))
    g = Geo().capsule((x + 0.8, y - 1.0, z), (x + 1.2, y - 1.0, z - SLING + 1.5), 0.55, segs=8, rings=2)
    g.capsule((x - 0.8, y - 1.0, z), (x - 1.2, y - 1.0, z - SLING + 1.5), 0.55, segs=8, rings=2)
    rig.part("sling", g, LEATHER, outline=0.5)
    g = Geo().blob((x, y - 1.0, z - SLING), (3.2, 2.2, 2.4), p=2.2)
    rig.part("sling", g, LEATHER)
    rig.joint("rock", "sling", (x, y - 1.0, z - SLING + 1.0))
    g = Geo().blob((x, y - 2.6, z - SLING + 1.4), (2.3, 2.0, 2.0), p=2.3)
    rig.part("rock", g, ROCK)
    rig.track("muzzle", "sling", (x, y - 1.0, z - SLING))


# -- poses ---------------------------------------------------------------------------------
def slinger(a, f, w):
    pose = B.arm("r", a, f)
    # the sling joint is a child of the hand; rest direction -90 (hanging)
    pose["sling"] = {"r": w + 90.0 - (f + 90.0)}
    return pose


BOOK_ARM = B.arm("l", -70, 40)
STANCE = merge(BOOK_ARM, slinger(-80, -60, -95), {"torso": {"r": 2}})


def _idle(f):
    # reads the tiny book: lifts it (1-3), the head dips to the page and nods, blink on 5
    read = [0.2, 0.7, 1.0, 1.0, 0.6, 0.2][f]
    nod = [0, 0, 1, -0.5, 0.8, 0][f]

    def extra(ctx):
        return merge(B.arm("l", -70 + 25 * read, 40 + 35 * read), {
            "head": {"r": -8 * read - 4 * nod}, "sling": {"r": 8 * ctx["lag"]},
            "arm_r": {"r": 3 * ctx["lag"]}, "brow": {"z": 0.5 * read}})
    base = {k: v for k, v in STANCE.items() if k not in ("arm_l", "fore_l")}
    return M.idle_v2(f, base, frames=6, chest=0.045, extra=extra, blink=5, face_blink=F.expr("blink"))


# -- walk v3: G2 brisk waddle at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 70 ms ------------
SPEED = 81.25
LEGS = K.legs_ik()
GAIT = K.jog_gait(LEGS, SPEED, cycle_ms=560, stance=0.44, lift=6.0, kick=2.0, toe_off=20.0,
                  early_lift=1.4)


WADDLE_BOB = [-3.2, -3.8, 0.0, 1.4]


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        c = -math.cos(ctx["lag_p"])
        return {"sling": {"r": -16 * c + 6 * lag}, "rock": {"r": 0.0},
                "arm_l": {"r": -3 * lag}, "fore_l": {"r": 3 * lag},
                "body": {"rx": 3 * math.sin(ctx["p"])}, "torso": {"rx": 5 * math.sin(ctx["p"])},
                "skirt": {"r": 5 * lag}, "head": {"rx": -3 * math.sin(ctx["p"])}}
    return M.walk_v3(RIG, f, STANCE, GAIT, legs=LEGS, bob=WADDLE_BOB, sq=M.BRISK_SQ, lean=-4.0,
                     twist=5.0, nod=3.0, sway=5.0, arms={"r": K.ArmChain("r")}, arm=26.0,
                     elbow=(20.0, 50.0), extra=extra, report=report)


# 11 unique frames, moves.SMALL_MELEE_MS; the sling is swung underhand like a pendulum
#        read dip  back HOLD swing swing LOB  over land reach settle
L_A = [-80, -105, -140, -158, -110, -62, 2, 30, -20, -72, -80]
L_F = [-60, -95, -140, -160, -95, -44, 18, 55, -30, -40, -58]
L_W = [-95, -110, -170, -205, -150, -125, 48, 120, -40, -90, -95]   # sling direction
T_R = [2, 6, 12, 14, 6, -2, -10, -8, 2, 4, 2]
B_X = [0.0, -1.0, -2.5, -3.5, -1.0, 2.0, 5.0, 5.5, 4.5, 2.0, 0.5]
B_Z = [0.0, -1.5, -0.5, 0.0, -1.0, 0.5, 4.5, 3.0, -1.6, -0.4, 0.0]
B_Q = [-0.03, -0.12, -0.04, -0.06, 0.02, 0.06, 0.14, 0.06, -0.16, 0.02, 0.0]
TH_R = [0, -6, -12, -30, -18, 6, 20, 16, 12, 4, 0]           # front knee up on the hold
SH_R = [0, 8, 20, 36, 20, 0, -10, -8, -6, 0, 0]
TH_L = [0, 6, 10, 12, 8, -6, -18, -14, -10, -4, 0]
SH_L = [0, -8, -8, -8, -6, -4, -16, -12, -4, 0, 0]


def _attack_pose(f):
    pose = merge(BOOK_ARM, slinger(L_A[f], L_F[f], L_W[f]), {
        "torso": {"r": T_R[f]},
        "head": {"r": [0, 2, 4, 6, 2, -2, -8, -6, 0, -4, 0][f]},
        "arm_l": {"r": [0, 4, 8, 10, 4, -4, -10, -6, 0, 0, 0][f]},
        "thigh_r": {"r": TH_R[f]}, "shin_r": {"r": SH_R[f]},
        "thigh_l": {"r": TH_L[f]}, "shin_l": {"r": SH_L[f]},
        "rock": {"hide": f in (6, 7, 8, 9)},
    }, M.body_about((0, 0, 24), x=B_X[f], z=B_Z[f], q=B_Q[f]))
    if f in (4, 5):
        pose["sling"]["sz"] = 1.25    # the cords stretch on the swing
    if f == 6:
        pose["sling"]["sz"] = 1.15
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.6}})
    elif f in (5, 6):
        pose = merge(pose, F.expr("o"))
    elif f in (7, 8):
        pose = merge(pose, F.expr("yell"))
    return pose


HR_ = (HR[0], HR[1] - 1.0, HR[2])
POUCH = (HR[0], HR[1] - 1.0, HR[2] - SLING)
SWING = {"kind": "arc", "joint": "sling", "inner": (HR_[0], HR_[1], HR_[2] - SLING * 0.35), "outer": POUCH,
         "color": "#B8A48A", "taper": 0.1, "white": 0.3, "t0": 0.0, "t1": 0.95, "lines": 2}


def _attack_clip():
    ov = {
        4: [dict(SWING, **{"from": 3})],
        5: [dict(SWING, **{"from": 3})],
        6: [{"kind": "burst", "joint": "sling", "point": POUCH, "r0_lu": 4.0, "r1_lu": 8.0, "n": 4,
             "a0": 20.0, "arc": 100.0}],
        8: [{"kind": "dust", "ground": (4.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 41, "spread": 1.1}],
    }
    # the sim wind-up is 2.07x the authored 290 ms: the sling sways between the back swing and the
    # held extreme while he waits (holdLoop, ANIM_SPEC 2.2 rule 8)
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov,
                  extra={"holdStep": 3, "holdLoop": [2, 3]})


# -- attack B: overhand sling (ANIM_SPEC appendix B) -------------------------------------------
# unique frames: 0 = A read, 1 = A dip, 2 whirl up, 3 HOLD (the sling cocked back over his head,
# hanging behind his shoulders, leaning back), 4 smear (over the top), 5 lead, 6 RELEASE (the arm
# up and forward, the sling flung out, the stone gone), 7 follow-through, 8 recoil, 9-10 = A
#        whirl HOLD smear lead REL  follow recoil
OB_A = [96, 128, 104, 76, 58, 10, -40]
OB_F = [150, 158, 92, 58, 44, -20, -40]
OB_W = [130, -128, 40, 64, 58, -20, -70]
OB_T = [8, 14, 4, -4, -10, -12, -2]
OB_X = [-1.0, -2.5, 1.0, 3.5, 5.0, 5.5, 3.0]
OB_Z = [0.6, 1.0, 1.2, 0.8, 0.0, -1.4, -0.6]
OB_Q = [0.03, 0.07, 0.04, 0.0, -0.10, -0.12, -0.02]
OB_THR = [-6, -14, 4, 14, 22, 20, 8]
OB_SHR = [4, 10, -2, -8, -14, -10, -4]
OB_THL = [8, 12, 0, -8, -16, -14, -6]
OB_SHL = [-6, -8, -4, -4, -10, -6, -2]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    pose = merge(BOOK_ARM, slinger(OB_A[k], OB_F[k], OB_W[k]), {
        "torso": {"r": OB_T[k]},
        "head": {"r": -0.5 * OB_T[k]},
        "arm_l": {"r": 0.4 * OB_T[k]},
        "thigh_r": {"r": OB_THR[k]}, "shin_r": {"r": OB_SHR[k]},
        "thigh_l": {"r": OB_THL[k]}, "shin_l": {"r": OB_SHL[k]},
        "rock": {"hide": k >= 4},
    }, M.body_about((0, 0, 24), x=OB_X[k], z=OB_Z[k], q=OB_Q[k]))
    if k in (2, 3):
        pose["sling"]["sz"] = 1.25
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.6}})
    elif k in (2, 3):
        pose = merge(pose, F.expr("o"))
    elif k == 4:
        pose = merge(pose, F.expr("yell"))
    return pose


OVER = dict(SWING, t0=0.0, t1=0.95, lines=2, samples=16)


def _attack_b():
    ov = {
        4: [dict(OVER, **{"from": 3})],
        5: [dict(OVER, **{"from": 3})],
        6: [{"kind": "burst", "joint": "sling", "point": POUCH, "r0_lu": 4.0, "r1_lu": 8.0, "n": 4,
             "a0": -10.0, "arc": 100.0}],
        7: [{"kind": "dust", "ground": (6.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 43, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov, reuse=reuse,
                  extra={"holdStep": 3, "holdLoop": [2, 3]})


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 10 * a},
                "thigh_r": {"r": 18 * max(a, 0)}, "shin_r": {"r": -20 * max(a, 0)},
                "arm_r": {"r": 26 * a}, "sling": {"r": -20 * a}, "arm_l": {"r": 12 * a},
                "brow": {"z": 1.4 * max(a, 0)}, "skirt": {"r": -6 * a}}
    return M.hit_light(k, STANCE, recoil, face_hurt=F.expr("squeeze", "o"),
                       face_back=F.expr("o") if k == 2 else None)


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.7, 0.2, 0.4, 0.1, 0.0, 0.0, 0.0][k]
    t = [0, 0, 0.1, 0.3, 1.0, 0.95, 1.0, 1.0, 1.0, 1.0][k]
    pose = merge(STANCE, M.die_d3(k, center_z=24.0, height=HEIGHT_LU), K.d3_sit(k), {
        "arm_r": {"r": 80 * flail}, "sling": {"r": 50 * flail},
        "arm_l": {"r": 60 * flail}, "fore_l": {"r": 30 * t},
        "skirt": {"sz": 1.0 - 0.5 * t, "sx": 1.0 + 0.15 * t},
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
