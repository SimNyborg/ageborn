"""Tuskback: Stone Age heavy (DESIGN A5.2), quadruped rig (A11). A war boar, gore attack, ~104 lu.

Look (A11): a hulking, round war boar with a huge shoulder hump, a bristly black mane crest
that bounces, a low wedge head with a wrinkled pale snout disc, angry eyes under a heavy brow,
two oversized curved ivory tusks with dark bound rings (the weapon), pale scars on the flank,
shaped legs (shoulder and haunch masses, fetlock tufts, split hooves). It wears a team war
blanket strapped over its back with bone toggles under three grey stone armour plates (the
armored tag), and a tall team pennant on a pole (every Heavy carries a pennant, A11). The
curly tail, the mane and the pennant follow through.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, heavy timing):
  idle    breathing, the ears flick, a snort of steam from the snout
  walk    prowl trot, the mane bristles bouncing a frame late
  attack  HOOF-SCRAPE, THEN GORE TOSS: scrapes the ground twice with a front hoof (dirt
          flicks behind), holds low and snorts, bursts forward (streak), scoops the tusks
          under and tosses them up (ivory arc smear, impact lines, dust), lands heavily
  hit     beast: head shake with the ears back, a hop of the hind legs
  die     D4 legs-up flop: staggers, rolls onto its back with the legs in the air, X eyes
          and the tongue out
"""
import math

from ageborn_art import face as F
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad, trot

SLUG = "tuskback"
NAME = "Tuskback"
HEIGHT_LU = 104
YAW_DEG = -10.0
CANVAS = (384, 284)
FEET = (184, 264)
ANCHORS = {"head": (0, 100), "hitCenter": (0, 42)}
NO_RETIME = True

FUR = "#7D6858"
FUR_DK = "#5E4F43"
BELLY = "#9A8573"
SCAR = "#B39E8C"
MANE = "#3F352F"
SNOUT = "#C4A898"
SNOUT_DK = "#9A7F70"
NOSTRIL = "#4A3A34"
HOOF = "#3F3A35"
IVORY = "#EDE3C8"
RING = "#5A4636"
STONE = "#8E8A80"
STONE_DK = "#6F6B63"
STRAP = "#6B5646"
BONE = "#EDE3C8"
WOOD = "#8A7560"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2A2A"
STEAM = "#F4F1EA"

TUSK_TIP = (61.0, -8.5, 57.0)
BODY_SCALE = 1.12


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    col = FUR if y < 0 else FUR_DK
    g = Geo().capsule(p0, p1, 8.8 if front else 9.6, 6.2)
    # shoulder blade / haunch mass on the upper leg
    g.blob((x0 + (2.0 if front else -1.5), y, z0 - 5.0), (9.6, 7.6, 11.0), p=2.2)
    rig.part(f"leg_{name}", g, col)
    g = Geo().capsule(p1, (x1 + 0.5, y, 6.5), 6.2, 5.0)
    g.blob((x1 + 0.2, y, z1 - 0.5), (6.6, 6.2, 5.2), p=2.2)   # knee / hock bump
    rig.part(f"leg_{name}2", g, col)
    # fetlock tufts
    g = Geo()
    for dx in (-3.5, 0.0, 3.5):
        g.lathe([(2.2, 0), (0, 3.4)], (x1 + dx * 0.7, y - 4.2 if y < 0 else y + 4.2, 8.2),
                (x1 + dx * 0.9 - 0.8, y - 5.0 if y < 0 else y + 5.0, 4.8), segs=8)
    rig.part(f"leg_{name}2", g, MANE, finish="hair", outline=0.6)
    # split hoof: two toes
    g = Geo()
    for dy in (-2.2, 2.2):
        g.blob((x1 + 2.2, y + dy, 3.2), (6.2, 3.2, 3.6), p=2.8, taper=(1.05, 0.85))
    g.clip((0, 0, 3.2), (0, 0, 1), fill=True)
    g.blob((x1 + 1.2, y, 4.4), (6.4, 5.8, 2.6), p=2.4)
    rig.part(f"leg_{name}2", g, HOOF)


def build(rig):
    q = Quad(rig, trunk=(0, 38), front_x=16.0, back_x=-16.0, leg_y=9.0, shoulder_z=40.0,
             hip_z=40.0, knee_z=18.0, hock_z=18.0, knee_dx=1.5, hock_dx=-1.5, far_dx=-3.0)
    rig.rest_scale["body"] = BODY_SCALE   # a heavy: bulkier than the Medieval destrier
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")

    # barrel, shoulder hump and haunch; a paler belly; pale scars on the flank
    trunk = Geo().blob((0, 0, 44), (25, 16.5, 18), p=2.3)
    trunk.blob((10, 0, 56), (17, 15, 15), p=2.2)                 # shoulder hump
    trunk.blob((-15, 0, 46), (13, 15.5, 15), p=2.2)              # haunch
    deco = F.Face(rig, "trunk", [trunk])
    rig.part("trunk", trunk, FUR)
    g = Geo().blob((2, 0, 33), (19, 12.5, 7), p=2.4)
    rig.part("trunk", g, BELLY)
    g = Geo()
    for (x, z), d in (((-21.0, 44.0), 1), ((-16.5, 40.5), -1)):
        c = deco.hit(x, z)
        deco.stroke(g, c, [(-3.2, 2.4 * d), (0.0, 0.0), (3.4, -1.6 * d)], 1.3, 0.4)
        deco.stroke(g, c, [(-1.2, -1.4), (0.2, 1.8)], 1.1, 0.4)
    rig.part("trunk", g, SCAR, highlight=False, outline=0)
    # bristly mane crest along the spine (its own joint: it bounces)
    rig.secondary("mane", "trunk", (8.0, 0, 64.0), (-8.0, 0, 70.0), max_deg=7, gain=1.3)
    g = Geo()
    for i in range(8):
        t = i / 7
        x = 22 - 42 * t
        z = 69 - 10 * t - 6 * t * t
        g.lathe([(4.8, 0), (3.2, 4.4), (0, 13.5 - 3 * t)], (x, 0, z - 3),
                (x - 6.5, 0, z + 9.0 - 3 * t), segs=10, squash=(1.0, 0.7))
    rig.part("mane", g, MANE, finish="hair")
    # team war blanket, straps with bone toggles, three stone plates (the armour)
    g = Geo().blob((-2, 0, 48), (24.5, 17.8, 17.5), p=3.0, taper=(1.02, 0.96))
    g.clip((0, 0, 33.0), (0, 0, -1))
    g.clip((20.0, 0, 0), (1, 0, 0))
    g.clip((-24.0, 0, 0), (-1, 0, 0))
    for x in (-20.0, -12.0, -4.0, 4.0, 12.0):   # tassels along the hem
        g.lathe([(2.4, 0), (0, -4.6)], (x, -15.5, 33.2), segs=8)
    rig.part("trunk", g, team=True)
    g = Geo()
    for x in (-14.0, 14.0):
        g.lathe([(0, -0.1), (17.6, 0), (18.4, 2.6), (0, 2.7)], (x, 0, 50), (x + 1, 0, 50), segs=24,
                squash=(1.1, 1.08))
    g.clip((0, 0, 33.0), (0, 0, -1))
    rig.part("trunk", g, STRAP, outline=0.8)
    # team girth bands under the belly (they show when it flops onto its back)
    g = Geo()
    for x in (-14.0, 14.0):
        g.lathe([(0, -6.5), (19.6, -6.3), (20.2, 6.3), (0, 6.5)], (x * 0.8, 0, 44), (x * 0.8 + 1.0, 0, 44),
                segs=24, squash=(1.12, 1.1))
    g.clip((0, 0, 34.0), (0, 0, 1))
    rig.part("trunk", g, team=True, outline=0.8)
    g = Geo()
    for x in (-14.0, 14.0):   # bone toggles on the straps
        g.capsule((x - 2.6, -19.2, 38.5), (x + 3.2, -19.2, 39.5), 1.4)
    rig.part("trunk", g, BONE, outline=0.6)
    g = Geo()
    g.blob((16.0, -14.0, 55.0), (10.5, 3.6, 9.0), p=3.0, rot=(-28, 0, 0))   # shoulder plate
    g.blob((-17.0, -13.0, 56.0), (8.6, 3.4, 7.2), p=3.0, rot=(-30, 0, 0))   # haunch plate
    g.blob((1.0, 0, 64.5), (9.0, 11.0, 3.2), p=3.2)                          # saddle stone
    rig.part("trunk", g, STONE)
    g = Geo()
    for x, z in ((12.0, 58.0), (20.0, 58.0), (16.0, 50.0), (-17.0, 58.5), (-17.0, 51.5)):
        g.sphere((x, -17.2 + (z - 50) * 0.3, z), 1.7, cuts=2)
    rig.part("trunk", g, STONE_DK, outline=0)

    # the pennant pole behind the plates; the team pennant flies off the top
    rig.joint("pole", "trunk", (-7, 3.5, 58))
    g = Geo().capsule((-7, 3.5, 58), (-11, 3.5, 104), 1.4, 1.2)
    g.sphere((-11.2, 3.5, 105.0), 2.0, cuts=3)
    rig.part("pole", g, WOOD)
    rig.secondary("pennant", "pole", (-10.6, 3.5, 101), (-30, 3.5, 96), max_deg=14, gain=1.3)
    pts = [(-10.6, 103.0), (-34.0, 100.0), (-26.0, 93.5), (-33.5, 86.0), (-10.2, 85.5)]
    g = Geo().slab(pts, 3.5, 1.4)
    rig.part("pennant", g, team=True, outline=0.8)

    # neck and head: a low wedge with a wrinkled pale snout disc, angry eyes, big ears
    rig.joint("neck", "trunk", (22, 0, 48))
    rig.joint("head", "neck", (30, 0, 46))
    g = Geo().blob((24, 0, 46), (10, 14.5, 14), p=2.3)
    rig.part("neck", g, FUR)
    head = Geo().blob((36, 0, 44), (13, 12.5, 12.5), p=2.3, taper=(1.0, 0.9))
    head.lathe([(11.0, 0), (9.4, 7.0), (7.8, 13.0), (7.6, 15.5), (0, 16.0)], (40, 0, 42),
               (55.5, 0, 38.0), segs=20)
    eye = Geo().blob((41.4, -10.2, 48.0), (3.4, 2.0, 3.2))
    pup = Geo().blob((43.4, -11.0, 47.8), (1.5, 1.2, 2.0))
    face = F.Face(rig, "head", [head, eye, pup])
    rig.part("head", head, FUR)
    rig.part("head", eye, EYE, highlight=False)
    rig.joint("pupils", "head", (43.4, -11.0, 47.8))
    rig.part("pupils", pup, PUPIL, outline=0)
    g = Geo()
    for dx in (0.0, 3.2):     # snout wrinkles
        c = face.hit(51.0 + dx, 41.8)
        face.stroke(g, c, [(0.0, 2.2), (0.8, 0.0), (0.0, -2.0)], 1.1, 0.4)
    rig.part("head", g, FUR_DK, highlight=False, outline=0)
    g = Geo().lathe([(0, 0), (7.6, 0.2), (8.0, 1.8), (7.2, 3.0), (0, 3.2)], (54.6, 0, 37.9),
                    (57.8, 0, 37.1), segs=20)
    rig.part("head", g, SNOUT)
    g = Geo().sphere((58.0, -2.4, 38.2), 1.7, cuts=2).sphere((58.0, 2.4, 38.2), 1.7, cuts=2)
    rig.part("head", g, NOSTRIL, outline=0)
    rig.joint("ears", "head", (28.5, 0, 53.0))
    g = Geo()
    for y in (-1, 1):
        g.blob((28.5, 9.5 * y, 56.5), (4.4, 1.9, 7.4), p=2.2, rot=(-22 * y, -30, 0), taper=(1.1, 0.35))
    rig.part("ears", g, FUR_DK)
    g = Geo()
    for i in range(4):
        g.capsule((34 - 3 * i, 0, 56.0 - i), (30 - 3.5 * i, 0, 63.5 - i), 2.4, 0.7)
    rig.part("head", g, MANE, finish="hair")
    rig.joint("brow", "head", (42.0, -10.0, 51.0))
    g = Geo().capsule((38.2, -11.6, 52.8), (45.2, -10.2, 50.0), 2.2, 1.6)   # angry brow
    rig.part("brow", g, MANE, finish="hair", outline=0.6)
    face.eye_marks([(43.2, 48.0)], 2.9, FUR)
    # lower jaw (opens on the gore) carries the tusks with dark bound rings
    rig.joint("jaw", "head", (40, 0, 38))
    jaw = Geo().blob((45.5, 0, 34.8), (10.0, 8.6, 4.4), p=2.3)
    jface = F.Face(rig, "jaw", [jaw])
    rig.part("jaw", jaw, FUR_DK)
    g = Geo().blob((46.5, 0, 36.6), (7.6, 6.4, 1.6), p=2.2)
    rig.part("jaw", g, MOUTH, outline=0, highlight=False)
    jface.mouths((50.5, 35.0), 7.0)
    g = Geo()
    rings = Geo()
    for y in (-1, 1):
        a = (47.0, 7.5 * y, 36.5)
        b = (58.0, 9.2 * y, 38.5)
        m = (63.5, 9.4 * y, 47.0)
        c = (TUSK_TIP[0], 8.5 * y, TUSK_TIP[2])
        g.capsule(a, b, 3.6, 3.2).capsule(b, m, 3.2, 2.2)
        g.capsule(m, c, 2.2, 0.6)
        for t in (0.35, 0.7):
            p = tuple(bb + (mm - bb) * t for bb, mm in zip(b, m))
            q_ = tuple(bb + (mm - bb) * (t + 0.08) for bb, mm in zip(b, m))
            rings.capsule(p, q_, 3.0 - 0.8 * t)
    rig.part("jaw", g, IVORY, finish="gloss")
    rig.part("jaw", rings, RING, outline=0.5)
    rig.track("tuskTip", "jaw", TUSK_TIP)

    # curly tail with a tuft
    rig.secondary("tail", "trunk", (-27, 0, 52), (-33, 0, 44), max_deg=20, gain=1.3)
    g = Geo().capsule((-27, 0, 52), (-32, 0, 53), 1.9, 1.7).capsule((-32, 0, 53), (-34.5, 0, 49), 1.7, 1.5)
    g.capsule((-34.5, 0, 49), (-32, 0, 46.5), 1.5, 1.1)
    g.blob((-32.0, 0, 45.2), (2.8, 2.3, 3.2), p=2.2)
    rig.part("tail", g, FUR_DK, finish="hair")
    rig.track("_foot", "leg_fr2", (18.5, -9.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
CENTER = (0, 0, 46.0)


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    pose = {
        "trunk": {"z": -1.3 * c, "r": 0.6 * c},
        "body": squash(-0.025 * c),
        "neck": {"r": 2.5 * lag}, "head": {"r": -3.0 * lag},
        "jaw": {"r": -3.0 * max(0.0, -lag)},
        "ears": {"r": [0, 0, 0, 14, -6, 0][f]},
        "leg_fr": {"r": -1.0 * c}, "leg_br": {"r": 1.0 * c},
        "tail": {"r": 8 * math.sin(2 * math.pi * f / n)},
    }
    if f == 4:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(trot(f, fr=18.0, br=16.0, knee=48.0, hock=38.0, bob=2.4, nod=6.0, roll=1.8), {
        "head": {"r": 3.0 * math.cos(2 * p - 0.8)},
        "body": squash(0.025 * math.cos(2 * p)),
        "ears": {"r": 6 * math.cos(2 * p - 1.2)},
    })


# attack: 10 unique poses in the 12 heavy steps (70, 90, 100, HOLD 200, 60, 50 | IMPACT 150,
# 90, 110, 100, 100, 110)
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        scrape lift scrape HOLD burst scoop IMP land follow settle
T_X = [-1.0, -1.5, -2.0, -5.0, 6.0, 10.0, 12.0, 11.0, 7.0, 2.0]
T_Z = [0.0, 0.5, 0.0, -3.0, 1.0, -1.5, 4.0, -2.0, 0.0, 0.0]
T_R = [-3, -2, -4, -9, 2, -6, 9, -4, 2, 0]
T_Q = [-0.02, 0.02, -0.03, -0.07, 0.05, -0.02, 0.07, -0.10, 0.02, 0.0]
N_R = [-6, -4, -8, -20, -12, -24, 12, 8, 4, 0]
H_R = [-4, -2, -6, -16, -10, -20, 22, 12, 2, 0]
J_R = [0, 0, 0, -4, -8, -10, -20, -8, -2, 0]
FR = [(-28, 10), (20, -52), (-32, 8), (-12, 0), (26, -40), (8, -10), (42, -58), (-4, 0), (0, 0), (0, 0)]
FL = [(0, 0), (-4, 0), (0, 0), (-10, 0), (22, -36), (6, -8), (34, -50), (-2, 0), (0, 0), (0, 0)]
BR = [(0, 0), (2, 4), (0, 0), (16, 24), (-22, 6), (-8, 10), (-26, 10), (-6, 4), (-2, 0), (0, 0)]
BL = [(0, 0), (0, 2), (0, 0), (14, 20), (-18, 4), (-6, 8), (-20, 8), (-4, 2), (-1, 0), (0, 0)]


def _attack_pose(f):
    pose = merge(M.body_about(CENTER, x=T_X[f], z=T_Z[f], q=T_Q[f]), {
        "trunk": {"r": T_R[f]},
        "neck": {"r": N_R[f]}, "head": {"r": H_R[f]}, "jaw": {"r": J_R[f]},
        "leg_fr": {"r": FR[f][0]}, "leg_fr2": {"r": FR[f][1]},
        "leg_fl": {"r": FL[f][0]}, "leg_fl2": {"r": FL[f][1]},
        "leg_br": {"r": BR[f][0]}, "leg_br2": {"r": BR[f][1]},
        "leg_bl": {"r": BL[f][0]}, "leg_bl2": {"r": BL[f][1]},
        "ears": {"r": [0, 0, 0, -18, -24, -24, -10, 8, 0, 0][f]},
        "brow": {"z": [0, 0, 0, -1.2, -1.2, -1.2, -1.0, 0, 0, 0][f]},
    })
    if f == 5:
        pose["head"]["sx"] = 1.08
    return pose


def _attack_clip():
    tusk_in = (TUSK_TIP[0] - 12.0, TUSK_TIP[1], TUSK_TIP[2] - 17.0)
    ov = {
        0: [{"kind": "dust", "ground": (4.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 11, "dir": -1.0,
             "spread": 0.7}],
        2: [{"kind": "dust", "ground": (2.0, 0.0), "size_lu": 6.5, "puffs": 4, "seed": 12, "dir": -1.0,
             "spread": 0.9}],
        3: [{"kind": "dust", "joint": "head", "point": (59.0, -3.0, 37.0), "size_lu": 4.2, "puffs": 3,
             "seed": 5, "color": STEAM, "spread": 0.7, "dir": 1.0}],
        4: [{"kind": "streak", "joint": "jaw", "point": TUSK_TIP, "color": IVORY, "width_lu": 9.0,
             "white": 0.5, "from": 3}],
        6: [{"kind": "arc", "joint": "jaw", "inner": tusk_in, "outer": TUSK_TIP, "color": IVORY,
             "taper": 0.15, "t0": 0.0, "t1": 0.86, "lines": 3, "white": 0.35, "from": 5, "samples": 18},
            {"kind": "burst", "joint": "jaw", "point": TUSK_TIP, "r0_lu": 9.0, "r1_lu": 16.0, "n": 5,
             "a0": -10.0, "arc": 150.0},
            {"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 6, "dir": -1.0}],
        7: [{"kind": "dust", "ground": (30.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 8, "spread": 1.2}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


def _hit(k):
    def recoil(a, shake):
        return {"body": dict(squash(-0.06 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "trunk": {"r": 5 * a},
                "neck": {"r": 10 * a}, "head": {"r": 6 * a + 8 * shake, "rx": 14 * shake},
                "jaw": {"r": -8 * max(a, 0)},
                "ears": {"r": -26 * max(a, 0)},
                "leg_br": {"r": -12 * max(a, 0)}, "leg_bl": {"r": -10 * max(a, 0)},
                "leg_br2": {"r": 18 * max(a, 0)}, "leg_bl2": {"r": 16 * max(a, 0)},
                "leg_fr": {"r": -8 * a}, "leg_fl": {"r": -6 * a}}
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze"))


def _die_pose(k):
    kick = [0.0, 0.3, 0.7, 1.0, 0.6, 1.0, 0.4, 0.2, 0.1, 0.0][k]
    pose = merge(M.die_d4(k, center_z=46.0, back_z=36.0, height=HEIGHT_LU, heavy=True), {
        "neck": {"r": [10, 16, 12, 6, 2, 0, 0, 0, 0, 0][k]},
        "head": {"r": [8, -6, -10, -14, -12, -10, -8, -8, -8, -8][k]},
        "jaw": {"r": -14},
        "leg_fr": {"r": 30 * kick - 10}, "leg_fr2": {"r": -30 * kick},
        "leg_fl": {"r": -20 * kick + 10}, "leg_fl2": {"r": -20 * kick},
        "leg_br": {"r": -26 * kick}, "leg_br2": {"r": 26 * kick},
        "leg_bl": {"r": 20 * kick}, "leg_bl2": {"r": 20 * kick},
        "tail": {"r": 20 * kick},
        "ears": {"r": -20},
        "pole": {"hide": k >= 3, "r": 25 * min(1.0, k)},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    elif k >= 3:
        pose = merge(pose, F.expr("x"), F.expr("tongue", mouth=None))
    return pose


def clips():
    keep = M.HEAVY_DIE_KEEP
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True,
               overlays={3: [{"kind": "dust", "joint": "head", "point": (59.0, -3.0, 37.0), "size_lu": 3.6,
                              "puffs": 3, "seed": 9, "color": STEAM, "spread": 0.6, "dir": 1.0}]}),
        # a heavy trot: 0.92 s cycle so it plays near 1x at its 55 lu/s sim speed
        M.clip("walk", [_walk(f) for f in range(8)], [115] * 8, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die_pose(keep[i]) for i in range(len(keep))], M.DIE_MS_HEAVY,
               sequence=M.DIE_SEQ_HEAVY, extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True)
