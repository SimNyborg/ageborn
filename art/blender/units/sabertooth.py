"""Sabertooth: Stone Age epic skirmisher (DESIGN A5.2), quadruped rig (A11). Bite, ~60 lu.

Look (A11): a chunky, front-heavy sabre-toothed cat: big head with a pale muzzle, angry eyes
and two long ivory sabre fangs (the silhouette), heavy forelegs and big paws, a sloping back
with dark tiger stripes and a stubby bobtail. It wears a team war pelt strapped over its
back and a team collar hung with bone teeth. It moves in a bounding gallop with a flexing
spine (fast: 100 lu/s). Shaped anatomy: shoulder blades and haunch masses on the legs, big
paws with toe notches, cheek ruffs, whiskers, a team collar with a bone tag.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    tail flicks, then it lifts a paw and licks it (tongue out), blink
  walk    bounding gallop with a flexing spine
  attack  REAR-UP CLAW RAKE: a butt-wiggle crouch, rears up roaring, rakes down with one paw
          then the other (three-line claw smears), and bites on the second swipe (impact),
          then shakes its head
  hit     beast: head shake, ears back, hind hop;  die  D4 legs-up flop, X eyes, tongue out
"""
import math

from ageborn_art import face as F
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad, bound

SLUG = "sabertooth"
NAME = "Sabertooth"
HEIGHT_LU = 60
YAW_DEG = -10.0
CANVAS = (296, 212)
FEET = (122, 194)
ANCHORS = {"head": (8, 58), "hitCenter": (0, 28)}
NO_RETIME = True
WHISKER = "#F4EEDC"

FUR = "#A88A68"
FUR_DK = "#8C7358"
STRIPE = "#5E4E40"
CREAM = "#DCCDB2"
NOSE = "#3E3230"
IVORY = "#F1E9D2"
STRAP = "#6B5646"
BONE = "#EDE3C8"
EYE = "#F4E9C6"
PUPIL = "#221C19"
MOUTH = "#5A2E2E"

FANG_TIP = (36.0, -3.8, 22.5)


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    col = FUR if y < 0 else FUR_DK
    g = Geo().capsule(p0, p1, 7.6 if front else 7.4, 5.0 if front else 4.4)
    # shoulder blade (front) or haunch (back) mass
    g.blob((x0 + (1.5 if front else -1.0), y * 0.8, z0 - 4.5), (7.6 if front else 8.2, 5.2, 8.0), p=2.2)
    rig.part(f"leg_{name}", g, col)
    g = Geo().capsule(p1, (x1 + (1.2 if front else 0.4), y, 4.2), 5.0 if front else 3.8, 4.2)
    g.blob((x1, y, z1), (5.4, 5.0, 4.4), p=2.2)   # elbow / hock
    rig.part(f"leg_{name}2", g, col)
    px = x1 + (3.0 if front else 1.8)
    g = Geo().blob((px, y, 2.9), (6.8 if front else 5.4, 5.0, 3.1), p=2.4, taper=(1.0, 0.8))
    for dz in (-1.2, 1.2):   # toe bumps
        g.blob((px + (5.6 if front else 4.4), y - 1.0 if y < 0 else y + 1.0, 2.6 + dz), (1.9, 2.2, 1.5), p=2.2)
    rig.part(f"leg_{name}2", g, CREAM if y < 0 else FUR_DK)


def build(rig):
    global CLAWS
    q = Quad(rig, trunk=(0, 29), front_x=13.0, back_x=-14.0, leg_y=6.0, shoulder_z=30.0,
             hip_z=28.0, knee_z=14.0, hock_z=13.0, knee_dx=0.5, hock_dx=-3.0, far_dx=-3.0)
    rig.rest_scale["body"] = 1.08
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")

    # body: deep chest, sloping back, lean haunch; cream belly and chest
    g = Geo().blob((9, 0, 33), (13, 10.5, 12.5), p=2.2)
    g.blob((-4, 0, 31), (15, 9.6, 9.6), p=2.2)
    g.blob((-14, 0, 30), (9.5, 9.8, 10), p=2.2)
    rig.part("trunk", g, FUR)
    g = Geo().blob((12, 0, 27.5), (9, 8.6, 7.5), p=2.2).blob((-1, 0, 24.5), (11, 7.4, 3.6), p=2.4)
    rig.part("trunk", g, CREAM)
    # stripes over the back and haunch (curved slabs on the surface, near side mostly)
    g = Geo()
    for x, z, h in ((-19.0, 36.5, 7.5), (-13.5, 38.5, 9.0), (-8.0, 39.5, 8.0), (18.0, 42.0, 7.0)):
        g.capsule((x + 1.5, -9.6, z), (x - 1.0, -8.2, z - h), 1.5, 0.6)
        g.capsule((x + 1.5, -5.0, z + 2.8), (x + 1.5, 5.0, z + 2.8), 1.5, 1.5)
    rig.part("trunk", g, STRIPE, outline=0)
    # team war pelt over the back with a ragged hem, a strap, bone toggles
    g = Geo().blob((0.5, 0, 32.5), (18.6, 12.8, 11.6), p=3.2)
    g.clip((0, 0, 21.5), (0, 0, -1))
    for x in (-11.0, -5.5, 0.0, 5.5, 11.0):
        g.lathe([(2.6, 0), (0, -4.4)], (x, -11.6, 22.0), segs=8)
    rig.part("trunk", g, team=True)
    g = Geo().lathe([(0, -0.1), (11.0, 0), (11.6, 2.2), (0, 2.3)], (-10.0, 0, 31.5), (-9.0, 0, 31.5),
                    segs=22, squash=(1.1, 1.0))
    g.clip((0, 0, 20.0), (0, 0, -1))
    rig.part("trunk", g, STRAP, outline=0.7)

    # neck, collar and head
    rig.joint("neck", "trunk", (17, 0, 38))
    rig.joint("head", "neck", (24, 0, 43), scale=1.22)  # a big readable head (fangs)
    g = Geo().blob((19, 0, 40), (8.6, 9.4, 9.6), p=2.2)
    rig.part("neck", g, FUR)
    g = Geo().lathe([(9.4, 0), (10.8, 0.8), (10.8, 4.6), (9.2, 5.4)], (16.0, 0, 35.5), (20.5, 0, 44.5),
                    segs=22)
    rig.part("neck", g, team=True, outline=0.8)
    g = Geo()
    for dy, dz in ((-6.5, 0), (-2.5, -1.0), (2.0, -1.0)):
        g.lathe([(1.1, 0), (0.8, 1.6), (0, 3.4)], (22.5, dy - 1.5, 38.5 + dz), (23.6, dy - 1.5, 34.8 + dz), segs=8)
    rig.part("neck", g, BONE, outline=0.6)
    g = Geo().blob((26.5, 0, 46), (10.4, 9.8, 7.4), p=2.25)
    g.blob((33.0, 0, 42.2), (6.4, 7.0, 4.6), p=2.2)           # muzzle
    HEAD = g
    HEAD_BVH_EXTRA = Geo().blob((34.0, -2.0, 41.0), (4.4, 5.2, 3.8), p=2.2)
    from ageborn_art.face import Face as _Face
    _pre = _Face(rig, "head", [g, HEAD_BVH_EXTRA])
    HEAD_BVH_EXTRA.bm.free()
    rig.part("head", g, FUR)
    g = Geo()
    for y in (-1, 1):                                          # pointed cheek tufts
        g.lathe([(4.4, 0), (3.0, 4.0), (0, 9.0)], (24.0, 7.5 * y, 43.0), (17.5, 13.5 * y, 39.5), segs=10,
                squash=(1.0, 0.6))
    rig.part("head", g, CREAM, finish="hair")
    g = Geo().blob((34.0, -2.0, 41.0), (4.4, 5.2, 3.8), p=2.2)
    rig.part("head", g, CREAM)
    g = Geo().blob((38.0, -0.6, 44.2), (2.2, 2.6, 1.8), p=2.2)
    rig.part("head", g, NOSE, outline=0.6)
    g = Geo()
    for y in (-1, 1):
        g.lathe([(3.6, 0), (2.2, 2.6), (0, 5.8)], (21.5, 7.0 * y, 51.0), (19.5, 9.5 * y, 57.5), segs=10,
                squash=(1.0, 0.5))
    rig.part("head", g, FUR_DK)
    g = Geo()
    for x, z in ((25.0, 55.0), (21.0, 54.0)):
        g.capsule((x + 1, -2.0, z), (x - 2.5, -8.5, z - 3.0), 1.1, 0.5)
    rig.part("head", g, STRIPE, outline=0)
    g = Geo().capsule((29.6, -8.8, 50.4), (35.2, -5.4, 48.6), 1.6, 1.2)
    rig.part("head", g, STRIPE, finish="hair", outline=0.6)
    eye = Geo().blob((32.0, -6.9, 47.4), (3.5, 2.2, 2.8))
    pup = Geo().blob((34.2, -7.8, 47.2), (1.1, 1.0, 2.2))
    face = _pre
    face.trees += [F.BVHTree.FromBMesh(eye.bm), F.BVHTree.FromBMesh(pup.bm)]
    rig.part("head", eye, EYE, highlight=False)
    rig.joint("pupils", "head", (34.2, -7.8, 47.2))
    rig.part("pupils", pup, PUPIL, outline=0)
    face.eye_marks([(34.0, 47.4)], 2.8, FUR)
    g = Geo()   # whiskers
    c = face.hit(35.5, 42.2)
    for v, d in ((1.2, 0.8), (0.0, 0.0), (-1.2, -0.8)):
        face.stroke(g, c, [(0.0, v), (5.5, v + d * 1.6)], 0.9, 0.3)
    rig.part("head", g, WHISKER, highlight=False, outline=0)
    # sabre fangs from the upper jaw
    g = Geo()
    for y in (-3.6, 3.2):
        g.lathe([(2.5, 0), (2.4, 5.0), (1.9, 11.0), (1.0, 15.5), (0, 17.6)], (33.4, y, 40.0),
                (FANG_TIP[0], y, FANG_TIP[2]), segs=12)
    rig.part("head", g, IVORY, finish="gloss")
    rig.track("fangTip", "head", FANG_TIP)

    # lower jaw, opens wide; the mouth's inside shows
    rig.joint("jaw", "head", (27.0, 0, 39.5))
    g = Geo().blob((31.5, 0, 37.2), (6.4, 5.4, 2.6), p=2.2)
    rig.part("jaw", g, CREAM)
    g = Geo().blob((31.0, 0, 39.4), (6.0, 5.0, 1.4), p=2.2)
    rig.part("jaw", g, MOUTH, outline=0, highlight=False)
    jaw = Geo().blob((31.5, 0, 37.2), (6.4, 5.4, 2.6), p=2.2)
    jface = F.Face(rig, "jaw", [jaw])
    jaw.bm.free()
    jface.mouths((35.0, 36.8), 5.0)
    # a bone tag hanging from the collar
    rig.secondary("tag", "neck", (22.0, -9.5, 36.0), (23.0, -10.0, 29.0), max_deg=25, gain=1.4)
    g = Geo().capsule((22.0, -9.8, 36.0), (22.6, -10.0, 32.5), 0.6)
    g.blob((22.8, -10.2, 30.4), (2.4, 1.0, 2.8), p=2.4)
    rig.part("tag", g, BONE, outline=0.6)

    # stubby bobtail
    rig.secondary("tail", "trunk", (-22, 0, 36), (-29, 0, 38), max_deg=20, gain=1.3)
    g = Geo().capsule((-22, 0, 36), (-28.5, 0, 38.5), 3.0, 2.2)
    rig.part("tail", g, FUR)
    g = Geo().blob((-29.0, 0, 38.8), (2.6, 2.4, 2.4), p=2.2)
    rig.part("tail", g, STRIPE, finish="hair")
    rig.track("_foot", "leg_fr2", (15.5, -6.0, 0.5))
    fx_, fz_ = q.legs["fr"][1][0] + 3.0 + 6.5, 2.9
    CLAWS = {"fr": [(fx_, -7.0, fz_ + 2.2), (fx_ + 0.8, -7.0, fz_), (fx_, -7.0, fz_ - 2.2)]}
    fl = q.legs["fl"][1][0] + 3.0 + 6.5
    CLAWS["fl"] = [(fl, 7.0, fz_ + 2.2), (fl + 0.8, 7.0, fz_), (fl, 7.0, fz_ - 2.2)]


CLAWS = None


# -- poses ---------------------------------------------------------------------------------
def _idle(f):
    # breathing; the tail flicks; frames 3-6 it lifts the near paw and licks it
    c = math.cos(2 * math.pi * f / 8)
    lag = math.cos(2 * math.pi * (f - 1) / 8)
    lick = [0.0, 0.0, 0.0, 0.6, 1.0, 1.0, 0.5, 0.0][f]
    pose = {
        "trunk": {"z": -1.0 * c, "r": 0.8 * c + 3 * lick},
        "body": squash(-0.03 * c),
        "neck": {"r": 2.5 * lag - 18 * lick}, "head": {"r": -3.0 * lag - 12 * lick},
        "jaw": {"r": -8 * lick},
        "leg_fr": {"r": 55 * lick}, "leg_fr2": {"r": -85 * lick},
        "tail": {"r": [0, 20, 30, 0, -10, 0, 10, 0][f]},
    }
    if lick > 0.9:
        pose = merge(pose, F.expr("blink", "tongue", mouth=None))
    elif f == 1:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    return merge(bound(f, fr=32.0, br=29.0, knee=66.0, hock=52.0, spine=8.0, bob=3.0),
                 {"body": squash(0.05 * [0, 1, 1, 0, -1, -1, 0, 0][f])})


# 11 unique frames, moves.SMALL_MELEE_MS
#          read wiggle rear HOLD rake1 rake2 BITE shake recoil settle settle
C_X = [-1.0, -3.0, -4.0, -5.0, 1.0, 5.0, 9.0, 8.0, 6.0, 3.0, 0.5]
C_Z = [-1.0, -4.0, 1.0, 4.0, 3.0, 0.5, -2.5, -1.5, -1.0, -0.3, 0.0]
C_R = [-2, -8, 16, 34, 22, 8, -6, -4, -3, -1, 0]
C_Q = [-0.04, -0.12, 0.06, 0.12, 0.06, 0.0, -0.16, -0.06, -0.04, 0.0, 0.0]
C_N = [-4, 6, 4, 8, -14, -20, -22, -16, -10, -4, 0]
C_H = [-2, 8, 10, 18, -8, -16, -18, -12, -6, -2, 0]
C_J = [0, -6, -30, -44, -36, -40, 0, -4, -6, -2, 0]
C_FR = [(-4, 0), (-10, 0), (60, -70), (95, -60), (20, -40), (0, 0), (-4, 0), (-2, 0), (0, 0), (0, 0), (0, 0)]
C_FL = [(-2, 0), (-8, 0), (45, -60), (80, -70), (90, -60), (15, -30), (-2, 0), (-2, 0), (0, 0), (0, 0), (0, 0)]
C_BR = [(4, 8), (18, 30), (-6, 10), (-20, 10), (-18, 8), (-16, 8), (-20, 10), (-14, 8), (-8, 4), (-2, 0), (0, 0)]
C_BL = [(2, 6), (16, 28), (-4, 8), (-16, 8), (-14, 6), (-12, 6), (-16, 8), (-10, 6), (-6, 3), (-1, 0), (0, 0)]
C_TAIL = [0, 30, 10, -10, -20, -10, 0, 10, 5, 0, 0]


def _attack_pose(f):
    pose = merge(M.body_about((0, 0, 30), x=C_X[f], z=C_Z[f], q=C_Q[f]), {
        "trunk": {"r": C_R[f]},
        "neck": {"r": C_N[f]}, "head": {"r": C_H[f], "rx": [0, 0, 0, 0, 0, 0, 0, 12, -8, 0, 0][f]},
        "jaw": {"r": C_J[f]},
        "leg_fr": {"r": C_FR[f][0]}, "leg_fr2": {"r": C_FR[f][1]},
        "leg_fl": {"r": C_FL[f][0]}, "leg_fl2": {"r": C_FL[f][1]},
        "leg_br": {"r": C_BR[f][0]}, "leg_br2": {"r": C_BR[f][1]},
        "leg_bl": {"r": C_BL[f][0]}, "leg_bl2": {"r": C_BL[f][1]},
        "tail": {"r": C_TAIL[f]},
    })
    if f == 1:   # butt wiggle
        pose["trunk"]["rz"] = 6
    return pose


def _attack_clip():
    ov = {
        4: [{"kind": "claw", "joint": "leg_fr2", "points": CLAWS["fr"], "color": "#FFFFFF", "width_lu": 2.6,
             "white": 0.0}],
        5: [{"kind": "claw", "joint": "leg_fl2", "points": CLAWS["fl"], "color": "#FFFFFF", "width_lu": 2.6,
             "white": 0.0}],
        6: [{"kind": "burst", "joint": "head", "point": FANG_TIP, "r0_lu": 6.0, "r1_lu": 11.0, "n": 4,
             "a0": -40.0, "arc": 120.0},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 21}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _hit(k):
    def recoil(a, shake):
        return {"body": dict(squash(-0.1 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "trunk": {"r": 5 * a},
                "neck": {"r": 12 * a}, "head": {"r": 8 * a + 6 * shake, "rx": 14 * shake},
                "jaw": {"r": -18 * max(a, 0)},
                "leg_br": {"r": -12 * max(a, 0)}, "leg_bl": {"r": -10 * max(a, 0)},
                "leg_br2": {"r": 16 * max(a, 0)}, "leg_bl2": {"r": 14 * max(a, 0)},
                "leg_fr": {"r": -8 * a}, "tail": {"r": 25 * a}}
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze"))


def _die(k):
    kick = [0.0, 0.3, 0.7, 1.0, 0.6, 1.0, 0.4, 0.2, 0.1, 0.0][k]
    pose = merge(M.die_d4(k, center_z=30.0, back_z=33.0, height=HEIGHT_LU), {
        "neck": {"r": [14, 18, 12, 6, 2, 0, 0, 0, 0, 0][k]},
        "head": {"r": [8, -6, -10, -14, -12, -10, -8, -8, -8, -8][k]},
        "jaw": {"r": -20},
        "leg_fr": {"r": 34 * kick - 10}, "leg_fr2": {"r": -34 * kick},
        "leg_fl": {"r": -24 * kick + 10}, "leg_fl2": {"r": -24 * kick},
        "leg_br": {"r": -30 * kick}, "leg_br2": {"r": 30 * kick},
        "leg_bl": {"r": 22 * kick}, "leg_bl2": {"r": 22 * kick},
        "tail": {"r": 30 * kick},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze"))
    elif k >= 3:
        pose = merge(pose, F.expr("x"), F.expr("tongue", mouth=None))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [72] * 8, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
