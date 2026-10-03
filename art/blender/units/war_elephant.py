"""War Elephant: Bronze Age Common Heavy Brute (CONTENT_PLAN 5.2 #5). Cleave 2, ~112 lu.

A viewer expects an elephant to rear, lash its trunk and stamp down with a forefoot, and to walk
with a heavy four-beat gait, ears flapping.

Look: a forest war elephant in desaturated grey-brown with wrinkle rings, huge round ears, short
ivory tusks with verdigris tips, a team caparison with a sandstone lambda and tassels, and a
small wooden tower on its back hung with two team shields. A mahout in a sandstone headcloth and
a team tunic sits on its neck with a goad; he has no sim attack, so he never throws (he ducks
and holds on when it stamps).

Animation (cartoon kit v2, heavy timing):
  idle    ears fan, the trunk sways and curls at the tip, the mahout pats its head, a blink
  walk    walk v3 heavy four-beat walk at ground speed (ANIM_SPEC G4, card 60 x 1.25 = 75 lu/s, 12
          frames in 1020 ms): three feet always down, planted feet by IK, the trunk swinging a beat
          late, ears flapping, the mahout swaying
  attack_b  GORE TOSS: drops its head with the tusks almost on the ground, weight back on the hind
          legs (held extreme), then drives in and hooks the head up, tusks tossing the target
  attack_c  SIDEWAYS HOOK: swings the head away with the trunk curled and the ears spread (held
          extreme), then hooks it back across the front, tusks first
  attack  REAR, LASH AND STAMP: weight back, the near forefoot lifts high, the trunk curls up over
          the head and the ears spread (held extreme, trumpeting), then the trunk lashes down
          and forward (arc smear) as the forefoot slams the ground (impact: dust both ways,
          impact lines); a shock bounce and a settle. The mahout ducks on the stamp
  hit     beast: head shake, ears back, the mahout grabs the tower
  die     D4 heavy topple onto its side (no edge-on frame), the mahout leaps clear, the tower
          tips away
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad, walk4

SLUG = "war_elephant"
GAIT_NAME = "quad"
NAME = "War Elephant"
HEIGHT_LU = 112
YAW_DEG = -10.0
CANVAS = (360, 300)
FEET = (168, 262)
ANCHORS = {"head": (10, 104), "hitCenter": (0, 52)}
NO_RETIME = True

HIDE = "#8E8580"
HIDE_DK = "#716A65"
HIDE_LT = "#A69E98"
NAIL = "#D9CDB2"
IVORY = "#EFE7D0"
EYE = B.EYE
PUPIL = B.PUPIL
MOUTH = "#5A2E2E"
SEAT = (21.0, 78.0)
RIDER_S = 1.2


def _leg(rig, name, p0, p1, near):
    x1, y, z1 = p1
    col = HIDE if near else HIDE_DK
    g = Geo().capsule(p0, p1, 9.0, 7.6)
    rig.part(f"leg_{name}", g, col)
    g = Geo().capsule(p1, (x1 + 0.4, y, 5.0), 7.6, 7.4)
    g.lathe([(8.4, 0), (8.2, 1.8), (7.6, 4.6), (0, 5.4)], (x1 + 0.6, y, 0.2), (x1 + 0.6, y, 5.6), segs=16)
    rig.part(f"leg_{name}2", g, col)
    g = Geo()                                                     # wrinkle rings at knee and ankle
    for z in (z1 + 1.5, z1 - 1.5, 9.0):
        g.lathe([(0, 0), (7.9, 0.2), (7.9, 0.8), (0, 1.0)], (x1 + 0.4, y, z), (x1 + 0.4, y, z + 1), segs=14)
    rig.part(f"leg_{name}2", g, HIDE_DK if near else "#5E5753", outline=0)
    if near:
        g = Geo()
        for dx in (-3.4, 0.0, 3.4):
            g.blob((x1 + 5.0 + dx * 0.4, y - 7.2 + abs(dx) * 0.3, 2.2), (1.9, 1.0, 1.7), p=2.2)
        rig.part(f"leg_{name}2", g, NAIL, outline=0.5)


def _mahout(rig, name, parent, x, z):
    """The mahout sitting on the neck (waist up): team tunic, sandstone headcloth, a goad."""
    rig.joint(name, parent, (x, 0, z))
    g = Geo().blob((x, 0, z + 6.5), (5.4, 5.0, 6.8), p=2.3, taper=(1.05, 0.9))
    rig.part(name, g, team=True)
    g = Geo().blob((x + 0.4, 0, z + 1.8), (5.8, 5.4, 1.2), p=3.0)
    rig.part(name, g, B.LEATHER_DK, outline=0.5)
    rig.joint(f"{name}_head", name, (x + 1, 0, z + 12.5))
    head = Geo().blob((x + 1.4, 0, z + 18.0), (5.8, 5.5, 5.8), p=2.25)
    head.blob((x + 6.6, -0.3, z + 17.4), (1.5, 1.4, 1.4), p=2.0)
    rig.part(f"{name}_head", head, B.SKIN_DK)
    g = Geo().blob((x + 0.6, 0, z + 21.0), (6.2, 6.0, 4.0), p=2.3)
    g.clip((0, 0, z + 19.4), (0, 0, -1))
    g.blob((x - 4.2, 0, z + 17.0), (2.8, 5.0, 5.2), p=2.2)
    rig.part(f"{name}_head", g, B.SAND_LT, finish="hair")
    eye = Geo()
    pup = Geo()
    for y in (-2.4, 2.2):
        eye.blob((x + 5.2, y, z + 18.6), (1.6, 1.6, 2.0))
        pup.blob((x + 6.4, y - 0.2, z + 18.4), (0.7, 1.0, 1.1))
    rig.part(f"{name}_head", eye, EYE, highlight=False)
    rig.part(f"{name}_head", pup, PUPIL, outline=0)
    rig.joint(f"{name}_arm", name, (x + 0.4, -5.4, z + 10.0))
    g = Geo().capsule((x + 0.4, -5.4, z + 10.0), (x + 4.4, -5.8, z + 4.8), 2.0, 1.8)
    g.blob((x + 5.2, -5.8, z + 4.0), (2.2, 2.0, 2.0), p=2.2)
    rig.part(f"{name}_arm", g, B.SKIN_DK)
    g = Geo().capsule((x + 5.2, -7.0, z - 2.0), (x + 5.4, -7.0, z + 14.0), 0.8)
    rig.part(f"{name}_arm", g, B.WOOD_DK, outline=0.5)
    g = Geo().capsule((x + 5.4, -7.0, z + 14.0), (x + 8.0, -7.0, z + 12.0), 0.9, 0.4)
    rig.part(f"{name}_arm", g, B.AGED, finish="metal", outline=0.4)


def build(rig):
    global RIG, LEGS
    RIG = rig
    q = Quad(rig, trunk=(0, 46), front_x=18.0, back_x=-18.0, leg_y=9.0, shoulder_z=50.0,
             hip_z=48.0, knee_z=24.0, hock_z=24.0, knee_dx=1.0, hock_dx=-1.0, far_dx=-4.0)
    LEGS = {}
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[1] == "r")
        LEGS[name] = G.Leg(f"leg_{name}", f"leg_{name}2", (p1[0] + 0.6, p1[1], 0.4),
                           bend=1.0 if name[0] == "f" else -1.0)
        rig.track(f"_foot_{name}", f"leg_{name}2", (p1[0] + 0.6, p1[1], 0.3))

    g = Geo().blob((0, 0, 57), (30, 17.5, 19.5), p=2.3)
    g.blob((12, 0, 63), (17, 16, 15), p=2.2)
    g.blob((-18, 0, 57), (14, 16, 17), p=2.2)
    rig.part("trunk", g, HIDE)
    # team caparison over the back: a cloth with sandstone tassels and a lambda
    g = Geo().blob((-2, 0, 64), (28.6, 18.6, 16.6), p=3.0, taper=(1.02, 0.95))
    g.clip((0, 0, 47.0), (0, 0, -1))
    g.clip((24.0, 0, 0), (1, 0, 0))
    g.clip((-28.0, 0, 0), (-1, 0, 0))
    rig.part("trunk", g, team=True)
    g = Geo().blob((-2, 0, 47.6), (28.8, 18.8, 1.4), p=3.0)
    g.clip((24.2, 0, 0), (1, 0, 0))
    g.clip((-28.2, 0, 0), (-1, 0, 0))
    rig.part("trunk", g, B.SAND, outline=0.5)
    g = Geo()
    for x in range(-25, 24, 6):
        g.lathe([(1.6, 0), (2.0, -2.0), (0, -5.0)], (x, -18.4, 46.6), segs=8)
    rig.part("trunk", g, B.SAND_LT, outline=0.5)
    K.lambda_mark(rig, "trunk", (-2.0, -19.4, 57.0), size=1.6)
    # the tower: a platform with team shields on its side (own joint: it tips off in the death)
    rig.joint("tower", "trunk", (-6, 0, 78))
    g = Geo().blob((-6, 0, 77.0), (15.5, 13.0, 2.4), p=3.4)
    rig.part("tower", g, B.WOOD)
    g = Geo().lathe([(13.0, 0), (14.4, 0.3), (14.4, 8.0), (13.0, 8.3)], (-6, 0, 78.0), (-6, 0, 86.3),
                    segs=24, squash=(1.15, 0.92))
    rig.part("tower", g, B.WOOD_DK)
    g = Geo().blob((-6, 0, 86.6), (16.8, 13.6, 1.6), p=3.0)
    rig.part("tower", g, team=True, outline=0.5)
    for x in (-13.0, 1.0):
        B.aspis(rig, "tower", (x, -14.6, 82.6), r=5.4, depth=1.4, rim=B.BRONZE, rim_w=0.9)
    # mahout on the neck
    _mahout(rig, "mahout", "trunk", SEAT[0], SEAT[1])
    rig.rest_scale["mahout"] = RIDER_S

    # neck, head, ears, eye, tusks
    rig.joint("neck", "trunk", (24, 0, 62))
    rig.joint("head", "neck", (32, 0, 66))
    g = Geo().blob((27, 0, 63), (11, 13, 14), p=2.2)
    rig.part("neck", g, HIDE)
    HEAD = Geo().blob((37, 0, 69), (12, 12, 13.5), p=2.25, taper=(1.05, 0.9))
    HEAD.blob((44, 0, 60), (7.5, 8.5, 9), p=2.2)
    eye = Geo().blob((43.6, -9.6, 70.0), (2.8, 1.6, 2.9))
    pup = Geo().blob((45.2, -10.2, 69.8), (1.2, 0.9, 1.8))
    face = F.Face(rig, "head", [HEAD, eye, pup])
    rig.part("head", HEAD, HIDE)
    g = Geo()                                                     # forehead wrinkles
    for z in (74.0, 70.5):
        g.capsule((44.5, -5.0, z), (46.0, 5.0, z), 0.7)
    rig.part("head", g, HIDE_DK, outline=0)
    rig.joint("ear", "head", (32, -11, 70))
    g = Geo().blob((29.5, -13.0, 66.0), (10.5, 2.6, 13.0), p=2.2, rot=(8, 6, 0))
    rig.part("ear", g, HIDE_LT)
    g = Geo().blob((29.0, -14.6, 66.0), (7.6, 1.4, 9.6), p=2.2, rot=(8, 6, 0))
    rig.part("ear", g, "#B7A39A", outline=0.4)                    # pink-grey inner ear
    rig.joint("brow", "head", (43, -9, 74))
    g = Geo().capsule((40.5, -10.6, 75.6), (46.0, -7.6, 73.4), 1.8, 1.4)
    rig.part("brow", g, HIDE_DK, outline=0.6)
    rig.part("head", eye, EYE, highlight=False)
    rig.joint("pupils", "head", (45.2, -10.2, 69.8))
    rig.part("pupils", pup, PUPIL, outline=0)
    face.eye_marks([(45.0, 70.0)], 2.7, HIDE)
    rig.joint("mouth", "head", (43, 0, 54), hidden=True)
    g = Geo().blob((43.5, -2.0, 54.0), (3.6, 5.0, 2.6), p=2.2)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    tips = Geo()
    for y in (-1, 1):
        a, b, c = (43.0, 5.4 * y, 56.0), (51.0, 6.6 * y, 50.0), (57.0, 6.2 * y, 55.0)
        g.capsule(a, b, 2.6, 2.2).capsule(b, c, 2.2, 1.2)
        tips.capsule((55.2, 6.3 * y, 53.6), (57.4, 6.2 * y, 55.6), 1.5, 0.6)
    rig.part("head", g, IVORY, finish="gloss")
    rig.part("head", tips, B.VERD, finish="metal", outline=0.4)
    # trunk: three segments, curling forward at the tip
    rig.joint("trunk1", "head", (46, 0, 60))
    rig.joint("trunk2", "trunk1", (49, 0, 42))
    rig.joint("trunk3", "trunk2", (49, 0, 26))
    g = Geo().capsule((46, 0, 60), (49, 0, 42), 6.0, 4.8)
    rig.part("trunk1", g, HIDE)
    g = Geo().capsule((49, 0, 42), (49, 0, 26), 4.8, 3.8)
    rig.part("trunk2", g, HIDE)
    g = Geo().capsule((49, 0, 26), (51, 0, 16), 3.8, 3.0).capsule((51, 0, 16), (56, 0, 13), 3.0, 2.6)
    rig.part("trunk3", g, HIDE)
    g = Geo()
    for z in (52, 46, 37, 31):
        g.lathe([(0, 0), (5.6 - (60 - z) * 0.05, 0.2), (5.6 - (60 - z) * 0.05, 0.8), (0, 1.0)],
                (47.5 + (60 - z) * 0.06, 0, z), (47.7 + (60 - z) * 0.06, 0, z + 1), segs=14)
    rig.part("trunk1", g, HIDE_DK, outline=0)
    rig.track("trunkTip", "trunk3", (56.0, 0.0, 13.0))
    # tail
    rig.secondary("tail", "trunk", (-30, 0, 62), (-35, 0, 40), max_deg=14, gain=1.1)
    g = Geo().capsule((-30, 0, 62), (-34, 0, 44), 1.8, 1.2)
    g.lathe([(2.0, 0), (2.4, -2.4), (0, -6.5)], (-34.3, 0, 45), segs=10)
    rig.part("tail", g, HIDE_DK, finish="hair")


# -- poses ---------------------------------------------------------------------------------
def _rider(lag, duck=0.0, arm=None):
    p = {"mahout": {"z": 1.2 * lag, "r": -18 * duck}, "mahout_head": {"r": -3 * lag + 6 * duck}}
    if arm is not None:
        p["mahout_arm"] = {"r": arm}
    return p


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    pose = merge({
        "trunk": {"z": -1.0 * c},
        "body": squash(-0.02 * c),
        "neck": {"r": 2.0 * lag}, "head": {"r": -2.0 * lag},
        "trunk1": {"r": -4 * lag}, "trunk2": {"r": -6 * lag}, "trunk3": {"r": 10 + 14 * lag},
        "ear": {"rz": [0, 20, 34, 14, -4, 0][f]},
    }, _rider(-lag, arm=[0, 30, 60, 30, 0, 0][f]))
    if f == 3:
        pose = merge(pose, F.expr("blink", mouth=None))
    return pose


# -- walk v3: G4 four-beat walk at ground speed (card 60 x 1.25 = 75 lu/s), 12 x 85 ms ----------------
# (a brisk four-beat: at 1200 ms the stride splays the legs) each foot is planted 70% of the cycle (hind left, fore left, hind right, fore right, a quarter apart)
RIG = None
LEGS = None
SPEED = 75.0
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(12, 1020, SPEED, G.quad_feet(LEGS, G.WALK4, x_off={"fr": -1.0, "fl": -1.0,
                                                                          "br": -2.0, "bl": -2.0}),
                      0.7, lift=8.0, kick=3.0, reach=2.5, toe_off=0.0, heel_strike=0.0, lift_peak=0.5)
    return GAIT


def _walk(f, report=None):
    g = _gait()

    def extra(ctx):
        p = ctx["p"]
        lag = math.cos(2 * p - 1.0)
        return merge({
            "neck": {"r": -3.0 * math.cos(2 * p - 0.6)}, "head": {"r": 2.5 * math.cos(2 * p - 1.2)},
            "trunk1": {"r": 7 * math.sin(p)}, "trunk2": {"r": 10 * math.sin(p - 0.6)},
            "trunk3": {"r": 15 * math.sin(p - 1.2)},
            "ear": {"rz": 14 * math.sin(2 * p - 1.0)},
        }, _rider(1.6 * lag))
    return G.quad_walk(RIG, f, g, {}, base_z=-4.0, bob=6.0, beats=2, low_at=0.125, pitch=0.8,
                       roll=1.4, extra=extra, report=report)


ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#      shift  lift  rear  HOLD  lash1 lash2 STAMP shock follow settle
BR = [-1.0, 4.0, 10.0, 13.0, 6.0, 0.0, -3.0, -1.0, 0.0, 0.0]          # body pitch (+ rears)
BX = [-1.0, -2.0, -4.0, -5.0, -1.0, 2.0, 4.0, 3.0, 1.0, 0.0]
BQ = [-0.02, 0.02, 0.04, 0.05, 0.0, -0.03, -0.07, 0.03, -0.01, 0.0]
NK = [0, 2, 6, 10, 4, -4, -8, -6, -2, 0]
HD = [0, 2, 6, 8, 2, -4, -6, -4, -1, 0]
T1 = [-2, 10, 34, 44, 24, 0, -8, -4, -2, 0]
T2 = [-2, 14, 44, 56, 30, 8, 6, 4, 2, 0]
T3 = [8, 24, 56, 70, 40, 20, 26, 18, 12, 10]
EAR = [0, 10, 30, 40, 20, 0, -16, -10, -2, 0]
LFR = [(0, 0), (20, -30), (46, -66), (52, -74), (30, -40), (4, -6), (-4, 0), (-2, 0), (0, 0), (0, 0)]
LFL = [(0, 0), (-2, 0), (-8, 0), (-10, 0), (-6, 0), (-2, 0), (2, 0), (1, 0), (0, 0), (0, 0)]
LBR = [(1, 0), (-4, 0), (-10, 0), (-13, 0), (-6, 0), (0, 0), (3, 0), (1, 0), (0, 0), (0, 0)]
LBL = [(1, 0), (-4, 0), (-10, 0), (-13, 0), (-6, 0), (0, 0), (3, 0), (1, 0), (0, 0), (0, 0)]
DUCK = [0, 0, 0.2, 0.3, 0.4, 0.8, 1.0, 0.8, 0.3, 0]


def _attack_pose(f):
    r = BR[f]
    pivot = (-18.0, 0.0, 4.0) if r >= 0 else (18.0, 0.0, 4.0)
    pose = merge(M.body_about(pivot, x=BX[f], q=BQ[f], r=r), {
        "neck": {"r": NK[f]}, "head": {"r": HD[f]},
        "trunk1": {"r": T1[f]}, "trunk2": {"r": T2[f]}, "trunk3": {"r": T3[f]},
        "mouth": {"show": f in (2, 3, 4)},
        "ear": {"rz": EAR[f]},
        "leg_fr": {"r": LFR[f][0]}, "leg_fr2": {"r": LFR[f][1]},
        "leg_fl": {"r": LFL[f][0]}, "leg_fl2": {"r": LFL[f][1]},
        "leg_br": {"r": LBR[f][0]}, "leg_br2": {"r": LBR[f][1]},
        "leg_bl": {"r": LBL[f][0]}, "leg_bl2": {"r": LBL[f][1]},
    }, _rider(0.0, DUCK[f], arm=[0, 10, 30, 40, 20, -20, -30, -20, 0, 0][f]))
    if f in (1, 2, 3):
        pose = merge(pose, {"brow": {"z": -1.2}})
    elif f in (5, 6, 7):
        pose = merge(pose, {"brow": {"z": -1.0}}, F.expr("squeeze", mouth=None) if f == 6 else {})
    return pose


TRUNK_TIP = (56.0, 0.0, 13.0)
TRUNK_MID = (49.0, 0.0, 30.0)
FOOT = (19.0, -9.0, 1.0)


def _attack_clip():
    lash = {"kind": "arc", "joint": "trunk3", "inner": TRUNK_MID, "outer": TRUNK_TIP, "color": HIDE_LT,
            "taper": 0.15, "white": 0.3, "lines": 3, "outline_lu": 1.4}
    ov = {
        3: [{"kind": "rings", "joint": "head", "point": (50.0, -4.0, 66.0), "radii_lu": (7.0, 12.0, 17.0),
             "a0": -40.0, "a1": 50.0}],
        4: [dict(lash, **{"from": 3, "t1": 0.95})],
        5: [dict(lash, **{"from": 4, "t0": 0.1, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "leg_fr2", "point": FOOT, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": 10.0, "arc": 160.0},
            {"kind": "dust", "ground": (26.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 11, "spread": 1.2},
            {"kind": "dust", "ground": (8.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 12, "spread": 1.2,
             "dir": -1.0}],
        7: [{"kind": "dust", "ground": (30.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 13, "spread": 1.4}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


# -- attack B: gore toss (ANIM_SPEC 2.2 tusks and horns) ---------------------------------------------
# 0 = A shift, 1 head down, 2 lower, 3 HOLD (weight back on the hind legs, the head dropped with the
# tusks almost on the ground, ears back), 4-5 the drive (smear), 6 IMPACT (the head hooked up, tusks
# tossing, the forelegs braced), 7 shock, 8-9 = A follow and settle
#      down lower HOLD drive drive IMP  shock
GB_R = [-2.0, -4.0, -5.0, -3.0, -1.0, 2.0, 1.0]       # body pitch (+ rears)
GB_X = [0.0, -2.0, -4.0, 0.0, 3.0, 5.0, 4.0]
GB_Q = [0.0, -0.02, -0.04, 0.0, -0.02, 0.04, 0.0]
GB_NK = [-8, -16, -22, -18, -8, 14, 10]
GB_HD = [-6, -12, -16, -12, -2, 16, 12]
GB_T1 = [-6, -10, -12, -8, 0, 20, 14]
GB_T2 = [-4, -6, -8, -4, 6, 24, 16]
GB_T3 = [4, 6, 8, 10, 20, 36, 24]
GB_EAR = [-6, -14, -20, -10, 6, 30, 18]
GB_LF = [(-2, 0), (-6, 0), (-10, 0), (-4, 0), (4, 0), (10, -4), (6, -2)]
GB_LB = [(-2, 0), (-8, 0), (-12, 4), (-6, 2), (0, 0), (4, 0), (2, 0)]


def _b_pose(i):
    if i == 0 or i >= 8:
        return _attack_pose(i)
    k = i - 1
    r = GB_R[k]
    pivot = (-18.0, 0.0, 4.0) if r >= 0 else (18.0, 0.0, 4.0)
    lf, lb = GB_LF[k], GB_LB[k]
    pose = merge(M.body_about(pivot, x=GB_X[k], q=GB_Q[k], r=r), {
        "neck": {"r": GB_NK[k]}, "head": {"r": GB_HD[k]},
        "trunk1": {"r": GB_T1[k]}, "trunk2": {"r": GB_T2[k]}, "trunk3": {"r": GB_T3[k]},
        "mouth": {"show": i in (5, 6)}, "ear": {"rz": GB_EAR[k]},
        "leg_fr": {"r": lf[0]}, "leg_fr2": {"r": lf[1]}, "leg_fl": {"r": lf[0] * 0.8}, "leg_fl2": {"r": lf[1]},
        "leg_br": {"r": lb[0]}, "leg_br2": {"r": lb[1]}, "leg_bl": {"r": lb[0] * 0.8}, "leg_bl2": {"r": lb[1]},
    }, _rider(0.0, [0.2, 0.4, 0.6, 0.6, 0.4, 0.8, 0.6][k], arm=[0, 10, 20, 0, -20, -30, -20][k]))
    pose = merge(pose, {"brow": {"z": -1.2}}, F.expr("squeeze", mouth=None) if i == 6 else {})
    return pose


TUSK_TIP = (57.0, -6.2, 55.0)


def _attack_b():
    ov = {
        4: [{"kind": "streak", "joint": "head", "point": TUSK_TIP, "color": HIDE_LT, "width_lu": 8.0,
             "white": 0.3, "from": 3, "t1": 0.95}],
        5: [{"kind": "streak", "joint": "head", "point": TUSK_TIP, "color": HIDE_LT, "width_lu": 8.0,
             "white": 0.3, "from": 4, "t0": 0.2, "t1": 0.95}],
        6: [{"kind": "burst", "joint": "head", "point": TUSK_TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -10.0, "arc": 140.0},
            {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 21, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


# -- attack C: sideways hook -------------------------------------------------------------------------
# 0 = A shift, 1 turn, 2 wind, 3 HOLD (the head swung up and away from the target, the trunk curled,
# ears spread), 4-5 the hook back across (smear), 6 IMPACT (head and tusks hooked across the front,
# low), 7 shock, 8-9 = A's
#      turn wind HOLD hook hook IMP  shock
GC_R = [1.0, 2.0, 3.0, 1.0, -1.0, -2.0, -1.0]
GC_X = [-1.0, -2.0, -3.0, 0.0, 2.0, 4.0, 3.0]
GC_NK = [8, 16, 22, 10, -6, -12, -8]
GC_NZ = [12, 26, 36, 14, -10, -22, -14]       # neck turn about the vertical (away, then across)
GC_HD = [6, 12, 16, 6, -6, -10, -6]
GC_T1 = [20, 40, 52, 30, -6, -16, -10]
GC_T2 = [24, 48, 62, 36, 0, -10, -6]
GC_T3 = [30, 60, 76, 50, 14, 6, 8]
GC_EAR = [10, 26, 40, 20, -6, -16, -10]


def _c_pose(i):
    if i == 0 or i >= 8:
        return _attack_pose(i)
    k = i - 1
    r = GC_R[k]
    pivot = (-18.0, 0.0, 4.0) if r >= 0 else (18.0, 0.0, 4.0)
    pose = merge(M.body_about(pivot, x=GC_X[k], r=r), {
        "neck": {"r": GC_NK[k], "rz": GC_NZ[k]}, "head": {"r": GC_HD[k]},
        "trunk1": {"r": GC_T1[k]}, "trunk2": {"r": GC_T2[k]}, "trunk3": {"r": GC_T3[k]},
        "mouth": {"show": i in (2, 3)}, "ear": {"rz": GC_EAR[k]},
        "leg_fr": {"r": [-2, -4, -6, 2, 8, 6, 4][k]}, "leg_fl": {"r": [2, 4, 6, 0, -4, -2, 0][k]},
    }, _rider(0.0, [0.1, 0.2, 0.3, 0.4, 0.6, 0.8, 0.6][k], arm=[0, 20, 40, 10, -20, -30, -20][k]))
    pose = merge(pose, {"brow": {"z": -1.2}}, F.expr("squeeze", mouth=None) if i == 6 else {})
    return pose


def _attack_c():
    ov = {
        3: [{"kind": "rings", "joint": "head", "point": (50.0, -4.0, 66.0), "radii_lu": (7.0, 12.0),
             "a0": -10.0, "a1": 80.0}],
        4: [{"kind": "streak", "joint": "head", "point": TUSK_TIP, "color": HIDE_LT, "width_lu": 8.0,
             "white": 0.3, "from": 3, "t1": 0.95}],
        5: [{"kind": "streak", "joint": "head", "point": TUSK_TIP, "color": HIDE_LT, "width_lu": 8.0,
             "white": 0.3, "from": 4, "t0": 0.2, "t1": 0.95}],
        6: [{"kind": "burst", "joint": "head", "point": TUSK_TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -50.0, "arc": 120.0},
            {"kind": "dust", "ground": (28.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 22, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_c", [_c_pose(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a, shake):
        return merge({"body": dict(squash(-0.05 * max(a, 0)), x=-3.0 * max(a, 0) + 0.8 * min(a, 0)),
                      "trunk": {"r": 3 * a},
                      "neck": {"r": 6 * a}, "head": {"r": 5 * a + 5 * shake, "rx": 8 * shake},
                      "trunk1": {"r": 14 * a}, "trunk2": {"r": 10 * a},
                      "ear": {"rz": -20 * max(a, 0)}}, _rider(-2.0 * a, 0.5 * max(a, 0)))
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze", mouth=None))


def _die(k):
    kick = [0.0, 0.2, 0.5, 0.9, 0.6, 1.0, 0.4, 0.2, 0.1, 0.0][k]
    off = min(1.0, k / 2.0)
    pose = merge(M.die_d4(k, center_z=56.0, back_z=28.0, height=HEIGHT_LU, heavy=True, roll=-0.62), {
        "neck": {"r": [10, 14, 10, 6, 2, 0, 0, 0, 0, 0][k]},
        "head": {"r": [6, -4, -8, -10, -10, -8, -8, -8, -8, -8][k]},
        "trunk1": {"r": 40 * kick + 10}, "trunk2": {"r": 30 * kick}, "trunk3": {"r": 30 * kick},
        "mouth": {"show": k <= 1},
        "leg_fr": {"r": 24 * kick - 8}, "leg_fr2": {"r": -20 * kick},
        "leg_fl": {"r": -16 * kick + 8}, "leg_fl2": {"r": -16 * kick},
        "leg_br": {"r": -20 * kick}, "leg_br2": {"r": 16 * kick},
        "leg_bl": {"r": 16 * kick}, "leg_bl2": {"r": 14 * kick},
        "mahout": {"z": 26 * off, "x": 22 * off, "r": -40 * off, "hide": k >= 4},
        "mahout_arm": {"r": 140 * off},
        "tower": {"r": 30 * off, "x": -14 * off, "hide": k >= 4},
    })
    if k >= 4:
        pose = merge(pose, F.expr("x", mouth=None))
    return pose


DIE_KEEP = [0, 1, 2, 4, 5, 7, 8, 9]


def clips():
    keep = DIE_KEEP
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.walk_clip("walk", RIG, _walk, _gait(), "quad"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(keep[i]) for i in range(len(keep))], M.DIE_MS_HEAVY,
               sequence=M.DIE_SEQ_HEAVY, extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
