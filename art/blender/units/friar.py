"""Friar: Medieval Age support (DESIGN A5.3). Heals allies; sling (proj.rock), ~64 lu.

Look (A11): a round, jolly friar with a bald tonsured head, a ring of brown hair, rosy
cheeks and a big nose, in a team-dyed habit with a parchment bear paw on the belly, a
parchment cowl with a wooden rosary, a knotted rope belt, a leather satchel with a bottle
and wooden sandals. He hugs a prayer book with a gold clasp in the far arm and carries a
leather sling in the near hand.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    reads his tiny book, nodding along (the head dips to the page), blink
  walk    waddle: side sway, short steps, the belly bouncing
  attack  BELLY-BUMP UNDERHAND LOB: sways back and swings the sling back and up behind him
          (the held extreme: coiled on the back foot, the front knee up), then a big
          underhand pendulum swing (a low ring smear) and a little hop that bumps the belly
          forward as the stone is lobbed high off the front; he lands, squashes, and plucks a
          new stone from his belt. The stone leaves `muzzle` (the pouch) on the lob frame.
  hit     light: head back, eyes squeezed, the belly jiggles
  die     D3 dizzy sit: spins, sits down hard, legs out, the book in his lap, spiral eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "friar"
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
def build(rig):
    B.skeleton(rig, head=(1, 0, 37))
    # legs: only the sandalled feet show below the habit
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().capsule((0, y, 15), (0.5, y, 8.5), 4.4, 3.9)
        rig.part(f"thigh_{s}", g, team=True)
        g = Geo().capsule((0.5, y, 8.5), (1.0, y, 4.0), 3.2, 2.9)
        rig.part(f"shin_{s}", g, SKIN)
        g = Geo().blob((3.3, y, 1.8), (6.4, 4.2, 1.9), p=3.0, taper=(1.02, 0.9))
        rig.part(f"shin_{s}", g, SANDAL)
        g = Geo().blob((2.4, y, 3.6), (5.2, 3.9, 2.4), p=2.4)
        rig.part(f"shin_{s}", g, SKIN)

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
    rig.secondary("skirt", "hips", (0.8, 0, 17.0), (0.0, 0, 5.0), max_deg=9, gain=0.8)
    g = Geo().lathe([(0, 3.8), (13.2, 4.0), (13.6, 6.0), (12.0, 12.0), (10.8, 18.0), (0, 18.5)],
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
    rig.track("_foot", "shin_r", (3.3, -6.0, 0.5))


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


def _walk(f):
    # waddle: side sway, short steps, belly bounce, the sling swinging a frame late
    def extra(ctx):
        return {"arm_r": {"r": 14 * math.cos(ctx["lag_p"])},
                "sling": {"r": -14 * math.cos(ctx["lag_p"] - 0.8)},
                "arm_l": {"r": -4 * math.cos(ctx["p"])}, "torso": {"rx": 5 * math.sin(ctx["p"])}}
    return M.walk_v2(f, STANCE, HEIGHT_LU, thigh=24.0, knee=50.0, lift_lu=6.0, bob_pct=0.07,
                     lean=-2.0, arms=(), sway=6.0, extra=extra)


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
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


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
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
