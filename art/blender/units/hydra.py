"""Hydra: Bronze Age Legendary multi-head (CONTENT_PLAN 5.2 #13). Three heads bite separate targets (three
attacks, range 40; only the first stops it); the middle head's spit slows 20% 1.5 s. ~160 lu.

A viewer expects a many-headed serpent to weave its heads and strike with them one after
another, lunging and biting, and to slither forward on stubby legs with its tail whipping.

Look: a squat marsh-green serpent body (green sits outside the team hue bands) on four stubby
clawed legs, a pale scaled belly, three long necks with horned serpent heads (amber-pale eyes,
cream fangs), team-coloured fin frills running down every neck and the back, a sandstone lambda
brand on the shoulder, a long tail with a team fin at the tip.

Animation (cartoon kit v2, heavy timing):
  idle    the three heads weave out of phase, tongues flick, one blinks
  walk    a slithering waddle: the body sways, the stubby legs trot, the tail S-curves, the
          necks bob in turn
  attack  STRIKE IN TURN: the near head lunges and bites, then the far head, while the centre
          head coils back high (held extreme, jaws open); then the centre head shoots forward
          and bites low (impact: jaws snap, impact lines; it is the attack that stops the hydra)
  hit     beast: the heads recoil and shake
  die     the heads droop one after another and the body topples onto its side (no edge-on
          frame), X eyes on every head
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "hydra"
NAME = "Hydra"
HEIGHT_LU = 160
YAW_DEG = -10.0
CANVAS = (600, 470)
FEET = (260, 430)
ANCHORS = {"head": (40, 150), "hitCenter": (0, 50)}
NO_RETIME = True

SCALE_G = "#5E7F5A"
SCALE_DK = "#4A664A"
SCALE_LT = "#7E9C76"
BELLY = "#D9CFAE"
FANG = "#F4EEDC"
CLAW = "#E2D6BC"
EYEC = "#F2E6B0"
MOUTH = "#5A2E2E"

# necks: name, base (x, y, z), segment lengths, rest angles (deg above horizontal), radii
NECKS = {
    "a": dict(base=(22.0, -12.0, 46.0), l=(26.0, 24.0), ang=(42.0, 18.0), r=(7.4, 5.8)),    # near, low and forward
    "b": dict(base=(16.0, 0.0, 52.0), l=(40.0, 34.0), ang=(76.0, 50.0), r=(7.8, 6.2)),      # centre, highest
    "c": dict(base=(10.0, 12.0, 52.0), l=(36.0, 26.0), ang=(100.0, 62.0), r=(7.2, 5.6)),    # far, back and high
}


def _neck(rig, n, base, l, ang, r, team_frill=True, face=False):
    x0, y, z0 = base
    a1, a2 = math.radians(ang[0]), math.radians(ang[1])
    x1, z1 = x0 + l[0] * math.cos(a1), z0 + l[0] * math.sin(a1)
    x2, z2 = x1 + l[1] * math.cos(a2), z1 + l[1] * math.sin(a2)
    near = y < -5
    col = SCALE_G if y <= 0 else SCALE_DK
    rig.joint(f"n{n}1", "trunk", (x0, y, z0))
    rig.joint(f"n{n}2", f"n{n}1", (x1, y, z1))
    rig.joint(f"n{n}h", f"n{n}2", (x2, y, z2))
    g = Geo().capsule((x0, y, z0), (x1, y, z1), r[0] + 1.6, r[0])
    rig.part(f"n{n}1", g, col)
    g = Geo().capsule((x1, y, z1), (x2, y, z2), r[0], r[1])
    rig.part(f"n{n}2", g, col)
    # pale belly scales along the front of the neck
    g = Geo()
    for t in (0.25, 0.55, 0.85):
        g.blob((x0 + (x1 - x0) * t + 3.6 * math.sin(a1), y - (r[0] * 0.55 if near else 0), z0 + (z1 - z0) * t - 3.6 * math.cos(a1)),
               (3.2, 3.0, 1.4), p=2.4, rot=(0, -ang[0], 0))
    for t in (0.3, 0.7):
        g.blob((x1 + (x2 - x1) * t + 3.0 * math.sin(a2), y - (r[1] * 0.55 if near else 0), z1 + (z2 - z1) * t - 3.0 * math.cos(a2)),
               (2.8, 2.6, 1.2), p=2.4, rot=(0, -ang[1], 0))
    rig.part(f"n{n}1", g, BELLY, outline=0.4)
    if team_frill:
        for seg, (p0, p1, aa, rr) in enumerate((((x0, z0), (x1, z1), a1, r[0]), ((x1, z1), (x2, z2), a2, r[1]))):
            g = Geo()
            for t in (0.15, 0.5, 0.85):
                cx, cz = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t
                bx, bz = cx - (rr + 0.5) * math.sin(aa), cz + (rr + 0.5) * math.cos(aa)
                tx, tz = bx - 6.0 * math.sin(aa) - 2.0 * math.cos(aa), bz + 6.0 * math.cos(aa) - 2.0 * math.sin(aa)
                g.slab([(bx - 3.2 * math.cos(aa), bz - 3.2 * math.sin(aa)), (bx + 3.2 * math.cos(aa), bz + 3.2 * math.sin(aa)),
                        (tx, tz)], y, 1.6)
            rig.part(f"n{n}{seg + 1}", g, team=True, outline=0.7)
    # head: snout along +X, horns, eye, an open-able jaw
    hx, hz = x2, z2
    head = Geo().blob((hx + 6.0, y, hz + 1.0), (11.0, 7.0, 6.4), p=2.3, taper=(1.0, 0.9))
    head.blob((hx + 15.0, y, hz - 0.6), (6.0, 5.2, 4.0), p=2.3)
    ex, ez = hx + 6.6, hz + 4.6
    eye = Geo().blob((ex, y - 5.6, ez), (2.6, 1.4, 2.4))
    pup = Geo().blob((ex + 1.0, y - 6.4, ez), (0.7, 0.8, 1.9))     # slit pupil
    fc = F.Face(rig, f"n{n}h", [head, eye, pup]) if face else None
    rig.part(f"n{n}h", head, col)
    rig.part(f"n{n}h", eye, EYEC, highlight=False)
    rig.joint(f"p{n}", f"n{n}h", (ex + 1.0, y - 6.4, ez))
    rig.part(f"p{n}", pup, "#2A2018", outline=0)
    if fc is not None:
        fc.eye_marks([(ex + 0.4, ez)], 2.5, col)
    else:
        rig.joint(f"x{n}", f"n{n}h", (ex, y - 6.6, ez), hidden=True)
        g = Geo().capsule((ex - 1.8, y - 6.8, ez - 1.8), (ex + 1.8, y - 6.8, ez + 1.8), 0.55)
        g.capsule((ex - 1.8, y - 6.8, ez + 1.8), (ex + 1.8, y - 6.8, ez - 1.8), 0.55)
        rig.part(f"x{n}", g, "#2A2018", outline=0)
    g = Geo().capsule((hx + 5.0, y - 4.6, ez + 2.8), (hx + 10.0, y - 4.0, ez + 1.6), 1.1, 0.8)
    rig.part(f"n{n}h", g, SCALE_DK, outline=0.5)                     # brow ridge
    g = Geo()
    for dy in (-3.6, 3.6):
        g.capsule((hx + 1.0, y + dy, hz + 5.6), (hx - 6.0, y + dy * 1.3, hz + 11.0), 1.8, 0.6)
    rig.part(f"n{n}h", g, CLAW, finish="gloss", outline=0.5)
    g = Geo()
    for dx in (13.0, 17.0):
        g.lathe([(0.9, 0), (0, -2.6)], (hx + dx, y - 3.6, hz - 2.6), segs=6)
    rig.part(f"n{n}h", g, FANG, outline=0.4)
    rig.joint(f"j{n}", f"n{n}h", (hx + 2.0, y, hz - 2.0))
    g = Geo().blob((hx + 10.0, y, hz - 4.4), (9.6, 5.2, 2.4), p=2.3, rot=(0, 6, 0))
    rig.part(f"j{n}", g, col)
    g = Geo().blob((hx + 10.0, y - 0.6, hz - 2.6), (8.0, 4.0, 1.2), p=2.3)
    rig.part(f"j{n}", g, MOUTH, outline=0, highlight=False)
    rig.joint(f"t{n}", f"j{n}", (hx + 16.0, y, hz - 3.0), hidden=True)     # forked tongue
    g = Geo().capsule((hx + 14.0, y - 0.8, hz - 3.0), (hx + 23.0, y - 0.8, hz - 2.0), 0.8, 0.5)
    g.capsule((hx + 23.0, y - 0.8, hz - 2.0), (hx + 25.0, y - 0.8, hz - 0.6), 0.5, 0.3)
    g.capsule((hx + 23.0, y - 0.8, hz - 2.0), (hx + 25.0, y - 0.8, hz - 3.4), 0.5, 0.3)
    rig.part(f"t{n}", g, "#C77F7A", outline=0.3)
    rig.track(f"bite_{n}", f"n{n}h", (hx + 21.0, y, hz - 1.0))
    # a team collar ring at the base of the head (the beast's war harness)
    g = Geo().lathe([(0, 0), (r[1] + 1.6, 0.2), (r[1] + 1.6, 3.4), (0, 3.6)], (x2 - 4.0 * math.cos(a2), y, z2 - 4.0 * math.sin(a2)),
                    (x2 - 0.4 * math.cos(a2), y, z2 - 0.4 * math.sin(a2)), segs=16)
    rig.part(f"n{n}2", g, team=True, outline=0.6)
    rig.rest_scale[f"n{n}h"] = 1.3
    return fc


def _leg(rig, name, x, y):
    near = y < 0
    col = SCALE_G if near else SCALE_DK
    rig.joint(name, "trunk", (x, y, 24.0))
    rig.joint(f"{name}2", name, (x + 2.0, y, 12.0))
    g = Geo().capsule((x, y, 26.0), (x + 2.0, y, 12.0), 7.0, 5.6)
    rig.part(name, g, col)
    g = Geo().capsule((x + 2.0, y, 12.0), (x + 3.0, y, 4.0), 5.6, 4.6)
    g.blob((x + 5.0, y, 2.4), (7.4, 5.6, 2.6), p=2.6)
    rig.part(f"{name}2", g, col)
    g = Geo()
    for dy in (-3.6, 0.0, 3.6):
        g.lathe([(1.4, 0), (0, 3.4)], (x + 11.0, y + dy, 1.6), (x + 14.0, y + dy, 1.0), segs=6)
    rig.part(f"{name}2", g, CLAW, outline=0.4)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("trunk", "body", (0, 0, 30))
    rig.rest_scale["body"] = 1.25
    for name, x, y in (("leg_fl", 18.0, 13.0), ("leg_bl", -20.0, 13.0)):
        _leg(rig, name, x, y)
    # tail (three segments, a team fin at the tip)
    rig.joint("tail1", "trunk", (-28.0, 0, 34.0))
    rig.joint("tail2", "tail1", (-50.0, 0, 26.0))
    rig.joint("tail3", "tail2", (-70.0, 0, 14.0))
    rig.part("tail1", Geo().capsule((-28.0, 0, 34.0), (-50.0, 0, 26.0), 12.0, 8.6), SCALE_G)
    rig.part("tail2", Geo().capsule((-50.0, 0, 26.0), (-70.0, 0, 14.0), 8.6, 5.4), SCALE_G)
    rig.part("tail3", Geo().capsule((-70.0, 0, 14.0), (-86.0, 0, 8.0), 5.4, 2.2), SCALE_G)
    g = Geo().slab([(-80.0, 9.0), (-94.0, 18.0), (-90.0, 7.0), (-95.0, -2.0)], 0.0, 1.6)
    rig.part("tail3", g, team=True, outline=0.7)
    # body: a squat barrel with a pale belly, team back frills, a lambda brand
    g = Geo().blob((0, 0, 36.0), (34.0, 21.0, 19.0), p=2.3)
    g.blob((16.0, 0, 42.0), (18.0, 19.0, 16.0), p=2.2)
    rig.part("trunk", g, SCALE_G)
    g = Geo().blob((2.0, -4.0, 25.0), (28.0, 16.0, 7.0), p=2.4)
    rig.part("trunk", g, BELLY, outline=0.6)
    g = Geo()
    for i, x in enumerate((-24.0, -12.0, 0.0, 12.0)):
        z = 54.0 - 0.06 * x * x / 6
        g.slab([(x - 5.0, z - 1.0), (x + 5.0, z), (x - 2.0, z + 10.0 - (i % 2) * 2.0)], 0.0, 2.0)
    rig.part("trunk", g, team=True, outline=0.8)
    g = Geo()
    for x, z in ((-16.0, 42.0), (-4.0, 46.0), (8.0, 44.0), (-10.0, 32.0), (2.0, 34.0)):
        g.blob((x, -19.4, z), (3.0, 1.0, 2.2), p=2.4)
    rig.part("trunk", g, SCALE_DK, outline=0)
    # a team war caparison over the back with a sandstone fringe and a lambda
    g = Geo().blob((-2.0, 0, 46.0), (26.0, 22.6, 14.0), p=3.0)
    g.clip((0, 0, 32.0), (0, 0, -1))
    g.clip((22.0, 0, 0), (1, 0, 0))
    g.clip((-26.0, 0, 0), (-1, 0, 0))
    rig.part("trunk", g, team=True)
    g = Geo()
    for x in range(-24, 22, 5):
        g.lathe([(1.6, 0), (2.0, -1.8), (0, -4.6)], (x, -22.4, 32.2), segs=8)
    rig.part("trunk", g, B.SAND_LT, outline=0.4)
    K.lambda_mark(rig, "trunk", (-2.0, -23.2, 42.0), size=2.0)
    # necks and heads (far first, near last so the near neck sits in front)
    _neck(rig, "c", **NECKS["c"])
    _neck(rig, "b", **NECKS["b"], face=True)
    _neck(rig, "a", **NECKS["a"])
    for name, x, y in (("leg_fr", 18.0, -13.0), ("leg_br", -20.0, -13.0)):
        _leg(rig, name, x, y)
    rig.track("_foot", "leg_fr2", (23.0, -13.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def head(n, s1=0.0, s2=0.0, h=0.0, jaw=0.0, tongue=False):
    return {f"n{n}1": {"r": s1}, f"n{n}2": {"r": s2}, f"n{n}h": {"r": h}, f"j{n}": {"r": -jaw},
            f"t{n}": {"show": tongue}}


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    pose = {"trunk": {"z": -1.0 * math.cos(2 * math.pi * f / n)}, "body": squash(-0.015 * math.cos(2 * math.pi * f / n))}
    for k, nm in enumerate("abc"):
        ph = 2 * math.pi * (f / n + k / 3)
        pose = merge(pose, head(nm, 5 * math.sin(ph), 7 * math.sin(ph - 0.8), -6 * math.sin(ph - 1.4),
                                jaw=6 if (f + k) % 3 == 0 else 0, tongue=(f + k) % 3 == 0))
    pose = merge(pose, {"tail2": {"r": 6 * math.sin(2 * math.pi * f / n)}, "tail3": {"r": 10 * math.sin(2 * math.pi * f / n - 1)}})
    if f == 4:
        pose = merge(pose, F.expr("blink", mouth=None, pupils="pb"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    s_, c = math.sin(p), math.cos(p)
    up = lambda v: max(0.0, v)
    pose = {
        "trunk": {"z": -1.6 * math.cos(2 * p), "rz": 4 * s_, "r": 1.2 * s_},
        "leg_fr": {"r": 18 * s_}, "leg_fr2": {"r": -30 * up(c)},
        "leg_bl": {"r": 16 * s_}, "leg_bl2": {"r": 24 * up(-c)},
        "leg_fl": {"r": -18 * s_}, "leg_fl2": {"r": -30 * up(-c)},
        "leg_br": {"r": -16 * s_}, "leg_br2": {"r": 24 * up(c)},
        "tail1": {"rz": -8 * s_}, "tail2": {"rz": -12 * math.sin(p - 0.8), "r": 4 * c},
        "tail3": {"rz": -16 * math.sin(p - 1.6), "r": 8 * math.sin(p - 1.0)},
    }
    for k, nm in enumerate("abc"):
        ph = p + k * 2.1
        pose = merge(pose, head(nm, 4 * math.sin(ph), 6 * math.sin(ph - 0.7), -5 * math.sin(ph - 1.3)))
    return pose


ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#         shift  A-bite C-bite HOLD lunge1 lunge2 IMPACT over recov settle
# per head: (neck1, neck2, head, jaw); + raises/coils back, - strikes forward and down
A_HEAD = [(4, 4, 0, 0), (-30, -28, 10, 24), (6, 10, -4, 6), (10, 14, -6, 0), (8, 10, -4, 0),
          (6, 8, -2, 0), (4, 4, 0, 0), (2, 2, 0, 0), (2, 2, 0, 0), (0, 0, 0, 0)]
C_HEAD = [(2, 2, 0, 0), (6, 8, -4, 6), (-26, -30, 12, 26), (8, 12, -4, 0), (6, 8, -2, 0),
          (4, 6, 0, 0), (2, 2, 0, 0), (0, 0, 0, 0), (0, 0, 0, 0), (0, 0, 0, 0)]
B_HEAD = [(4, 6, -2, 0), (10, 14, -8, 10), (16, 22, -14, 20), (22, 30, -20, 34), (0, -10, 0, 30),
          (-20, -30, 14, 26), (-34, -40, 24, 6), (-36, -42, 26, 2), (-16, -18, 10, 0), (-2, -2, 0, 0)]
BR = [0.0, -2.0, -1.0, 3.0, 0.0, -3.0, -6.0, -5.0, -2.0, 0.0]
BX = [0.0, 2.0, 1.0, -3.0, 0.0, 4.0, 8.0, 8.0, 3.0, 0.0]
BQ = [-0.01, -0.03, -0.02, 0.03, 0.02, -0.02, -0.06, -0.03, -0.01, 0.0]


def _attack_pose(f):
    pose = merge(M.body_about((0, 0, 30), x=BX[f], q=BQ[f]), {"trunk": {"r": BR[f]},
                                                              "tail2": {"r": [0, 4, -4, 8, 0, -6, -10, -8, -2, 0][f]},
                                                              "tail3": {"r": [0, 8, -8, 14, 0, -10, -16, -12, -4, 0][f]}})
    for nm, tbl in (("a", A_HEAD), ("c", C_HEAD), ("b", B_HEAD)):
        s1, s2, h, jaw = tbl[f]
        pose = merge(pose, head(nm, s1, s2, h, jaw))
    if f in (2, 3):
        pose = merge(pose, {"brow": {"z": -1.0}})
    elif f == 6:
        pose = merge(pose, F.expr("squeeze", mouth=None, pupils="pb"))
    return pose


def _attack_clip():
    nb = NECKS["b"]
    a1, a2 = math.radians(nb["ang"][0]), math.radians(nb["ang"][1])
    x0, y0, z0 = nb["base"]
    x2 = x0 + nb["l"][0] * math.cos(a1) + nb["l"][1] * math.cos(a2)
    z2 = z0 + nb["l"][0] * math.sin(a1) + nb["l"][1] * math.sin(a2)
    snout = (x2 + 21.0, 0.0, z2 - 1.0)
    crown = (x2 + 4.0, 0.0, z2 + 4.0)
    na = NECKS["a"]
    xa = na["base"][0] + na["l"][0] * math.cos(math.radians(na["ang"][0])) + na["l"][1] * math.cos(math.radians(na["ang"][1]))
    za = na["base"][2] + na["l"][0] * math.sin(math.radians(na["ang"][0])) + na["l"][1] * math.sin(math.radians(na["ang"][1]))
    arc = {"kind": "streak", "joint": "nbh", "point": snout, "color": SCALE_LT, "width_lu": 10.0, "white": 0.3}
    ov = {
        1: [{"kind": "burst", "joint": "nah", "point": (xa + 21.0, -11.0, za - 1.0), "r0_lu": 5.0, "r1_lu": 10.0,
             "n": 4, "a0": -60.0, "arc": 120.0}],
        3: [{"kind": "rings", "joint": "nbh", "point": crown, "radii_lu": (6.0, 10.0), "a0": 20.0, "a1": 140.0}],
        4: [dict(arc, **{"from": 3, "t1": 0.95})],
        5: [dict(arc, **{"from": 4, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "nbh", "point": snout, "r0_lu": 8.0, "r1_lu": 17.0, "n": 6,
             "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (60.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 5, "spread": 1.2}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


def _hit(k):
    def recoil(a, shake):
        pose = {"body": dict(squash(-0.05 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "trunk": {"r": 3 * a}, "tail2": {"r": 8 * a}}
        for nm in "abc":
            pose = merge(pose, head(nm, 10 * a, 8 * a, -6 * a + 8 * shake, jaw=10 * max(a, 0)))
            pose = merge(pose, {f"n{nm}h": {"rx": 10 * shake}})
        return pose
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze", mouth=None, pupils="pb"))


DIE_KEEP = [0, 1, 2, 4, 5, 7, 8, 9]


def _die(k):
    droop = [0.0, 0.3, 0.6, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    # a slump, not a roll: the body sinks onto its belly with the legs splayed, and the necks
    # fall one after another until the heads lie flat on the ground in front
    sink = [0.0, 0.2, 0.5, 0.8, 1.0, 0.92, 1.0, 1.0, 1.0, 1.0][k]
    pose = M.body_about((0, 0, 30), x=-2.0 * sink, z=-14.0 * sink, q=[-0.06, 0.04, 0.02, -0.08, -0.12, 0.04, -0.06,
                                                                       -0.03, -0.05, -0.08][k], s=[1, 1, 1, 1, 1, 1, 1, 1, 0.97, 0.92][k])
    falls = {"a": (-67, 41, 26), "c": (-125, 55, 70), "b": (-101, 43, 58)}
    for i, nm in enumerate("acb"):
        d = max(0.0, min(1.0, droop * 1.6 - 0.25 * i))
        f1, f2, fh = falls[nm]
        pose = merge(pose, head(nm, f1 * d, f2 * d, fh * d, jaw=14 * d, tongue=d > 0.8))
    pose = merge(pose, {"tail2": {"r": -8 * sink}, "tail3": {"r": -10 * sink},
                        "leg_fr": {"r": 50 * sink}, "leg_fr2": {"r": -30 * sink},
                        "leg_fl": {"r": 46 * sink}, "leg_fl2": {"r": -28 * sink},
                        "leg_br": {"r": -50 * sink}, "leg_br2": {"r": 30 * sink},
                        "leg_bl": {"r": -46 * sink}, "leg_bl2": {"r": 28 * sink}})
    if k >= 4:
        pose = merge(pose, F.expr("x", mouth=None, pupils="pb"), {"xa": {"show": True}, "xc": {"show": True},
                                                                 "pa": {"hide": True}, "pc": {"hide": True}})
    elif k <= 1:
        pose = merge(pose, F.expr("squeeze", mouth=None, pupils="pb"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [110] * 8, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(DIE_KEEP[i]) for i in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True)
