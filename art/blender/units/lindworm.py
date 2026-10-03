"""Lindworm: Medieval Age legendary dragon (CONTENT_PLAN 5.3). Green marsh-fire breath, ~130 lu.

Look (A11, PLAN.md): a long, low, wingless marsh dragon on four stubby clawed legs: dusky violet-grey
scales (outside the team hue bands), a pale ridged belly, a long neck rising to a horned dragon head
with a toothy grin, amber eyes and a frilled jaw, team-coloured spine frills down the neck and back, a
team war caparison over the shoulders with a parchment bear paw (the realm's beast), a team collar, and
a long tail ending in a team fin. Its breath is alchemical green marsh-fire (mint and white core,
never in the team hue bands).

"A viewer expects a dragon to rear back, take a breath and sweep a gout of green fire over the front,
and to crawl forward low, its tail lashing."

Animation (ANIM_SPEC G4, appendix B for a breath weapon: rear-and-breathe, low sweep, reared pour):
  idle      smoke curls from the nostrils, the head sways and licks its lips, the tail flicks
  walk      walk v3 (G4 trot at ground speed, card 50 x 1.25 = 62.5 lu/s, 8 frames in 800 ms): stubby
            legs with planted IK feet, the body sways, the tail S-curves a beat late
  attack    REAR AND BREATHE: draws the neck back high and swells the chest (the held extreme, an
            inhale squash), then lunges the head forward and a gout of green fire sweeps the front
            (a cone of flame, smoke), the fire breaking off as it settles
  attack_b  LOW SWEEP: coils the head low along the ground, then sweeps the fire up and across
  attack_c  REARED POUR: rears up on its hind legs with the head high, then pours the fire down
  hit       beast: the head recoils, the frills flatten
  die       slumps onto its belly, the neck falls flat, smoke puffs, X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "lindworm"
GAIT_NAME = "quad"
NAME = "Lindworm"
HEIGHT_LU = 130
YAW_DEG = -10.0
CANVAS = (830, 480)
FEET = (305, 430)
ANCHORS = {"head": (54, 125), "hitCenter": (0, 45)}
NO_RETIME = True

SCALE_C = "#6E6684"
SCALE_DK = "#57506B"
SCALE_LT = "#8E86A6"
BELLY = "#D8CFB0"
FANG = "#F4EEDC"
CLAW = "#E2D6BC"
EYEC = "#F2E6B0"
MOUTH = "#5A2E3E"
PARCH = "#E8DFC8"
FIRE = "#8FE39A"
FIRE_CORE = "#E8FFE6"
SMOKE = "#B9C2B8"

BODY_SCALE = 1.25
NECK = dict(base=(18.0, 0.0, 48.0), l=(30.0, 26.0), ang=(64.0, 30.0), r=(9.0, 7.0))


def _neck_points():
    x0, y, z0 = NECK["base"]
    a1, a2 = math.radians(NECK["ang"][0]), math.radians(NECK["ang"][1])
    x1, z1 = x0 + NECK["l"][0] * math.cos(a1), z0 + NECK["l"][0] * math.sin(a1)
    x2, z2 = x1 + NECK["l"][1] * math.cos(a2), z1 + NECK["l"][1] * math.sin(a2)
    return (x0, z0), (x1, z1), (x2, z2), a1, a2


(X0, Z0), (X1, Z1), (X2, Z2), A1, A2 = _neck_points()
SNOUT = (X2 + 22.0, 0.0, Z2 - 1.0)
FLAME_TIP = (X2 + 64.0, 0.0, Z2 - 4.0)


def _neck(rig):
    r0, r1 = NECK["r"]
    rig.joint("n1", "trunk", (X0, 0.0, Z0))
    rig.joint("n2", "n1", (X1, 0.0, Z1))
    rig.joint("nh", "n2", (X2, 0.0, Z2))
    rig.part("n1", Geo().capsule((X0, 0, Z0), (X1, 0, Z1), r0 + 2.0, r0), SCALE_C)
    rig.part("n2", Geo().capsule((X1, 0, Z1), (X2, 0, Z2), r0, r1), SCALE_C)
    g = Geo()
    for t in (0.2, 0.5, 0.8):
        g.blob((X0 + (X1 - X0) * t + 4.4 * math.sin(A1), -r0 * 0.5, Z0 + (Z1 - Z0) * t - 4.4 * math.cos(A1)),
               (3.6, 3.4, 1.6), p=2.4, rot=(0, -NECK["ang"][0], 0))
    rig.part("n1", g, BELLY, outline=0.4)
    for seg, (p0, p1, aa, rr) in enumerate((((X0, Z0), (X1, Z1), A1, r0), ((X1, Z1), (X2, Z2), A2, r1))):
        g = Geo()
        for t in (0.2, 0.55, 0.9):
            cx, cz = p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t
            bx, bz = cx - (rr + 0.5) * math.sin(aa), cz + (rr + 0.5) * math.cos(aa)
            tx, tz = bx - 7.0 * math.sin(aa) - 2.6 * math.cos(aa), bz + 7.0 * math.cos(aa) - 2.6 * math.sin(aa)
            g.slab([(bx - 3.6 * math.cos(aa), bz - 3.6 * math.sin(aa)), (bx + 3.6 * math.cos(aa), bz + 3.6 * math.sin(aa)),
                    (tx, tz)], 0.0, 1.8)
        rig.part(f"n{seg + 1}", g, team=True, outline=0.7)
    g = Geo().lathe([(0, 0), (r1 + 1.8, 0.2), (r1 + 1.8, 3.8), (0, 4.0)], (X2 - 4.4 * math.cos(A2), 0, Z2 - 4.4 * math.sin(A2)),
                    (X2 - 0.4 * math.cos(A2), 0, Z2 - 0.4 * math.sin(A2)), segs=16)
    rig.part("n2", g, team=True, outline=0.6)

    # head: a long snout, horns, a frill, amber eyes with the face kit, an opening jaw
    hx, hz = X2, Z2
    head = Geo().blob((hx + 7.0, 0, hz + 1.0), (12.0, 7.6, 7.0), p=2.3, taper=(1.0, 0.9))
    head.blob((hx + 17.0, 0, hz - 0.6), (6.6, 5.6, 4.4), p=2.3)
    ex, ez = hx + 8.0, hz + 5.0
    eye = Geo().blob((ex, -6.0, ez), (2.8, 1.5, 2.6))
    pup = Geo().blob((ex + 1.0, -6.8, ez), (0.8, 0.9, 2.0))
    fc = F.Face(rig, "nh", [head, eye, pup])
    rig.part("nh", head, SCALE_C)
    rig.part("nh", eye, EYEC, highlight=False)
    rig.joint("pupils", "nh", (ex + 1.0, -6.8, ez))
    rig.part("pupils", pup, "#2A2018", outline=0)
    fc.eye_marks([(ex + 0.4, ez)], 2.7, SCALE_C)
    rig.joint("brow", "nh", (ex, -5.0, ez + 3.0))
    g = Geo().capsule((hx + 5.0, -5.0, ez + 3.0), (hx + 11.0, -4.4, ez + 1.6), 1.3, 0.9)
    rig.part("brow", g, SCALE_DK, outline=0.5)
    g = Geo()
    for dy in (-4.0, 4.0):   # swept-back horns
        g.capsule((hx + 1.0, dy, hz + 6.0), (hx - 9.0, dy * 1.3, hz + 12.0), 2.2, 0.6)
    rig.part("nh", g, CLAW, finish="gloss", outline=0.5)
    g = Geo()
    for i, (dx, dz) in enumerate(((-2.0, 0.0), (-4.0, -4.0), (-3.0, -8.0))):   # team jaw frill spikes
        g.slab([(hx + dx, hz + dz), (hx + dx - 7.0, hz + dz - 1.0), (hx + dx - 1.0, hz + dz - 4.0)], -6.2, 1.4)
    rig.part("nh", g, team=True, outline=0.6)
    g = Geo()
    for dx in (14.0, 18.0, 22.0):
        g.lathe([(1.0, 0), (0, -2.8)], (hx + dx, -4.0, hz - 2.8), segs=6)
    rig.part("nh", g, FANG, outline=0.4)
    g = Geo()
    for dy in (-1.6, 1.6):   # nostrils
        g.blob((hx + 22.4, dy, hz + 1.0), (0.9, 0.7, 0.7), p=2.0)
    rig.part("nh", g, SCALE_DK, outline=0)
    rig.joint("jaw", "nh", (hx + 2.0, 0, hz - 2.4))
    g = Geo().blob((hx + 11.0, 0, hz - 5.0), (10.6, 5.6, 2.6), p=2.3, rot=(0, 6, 0))
    rig.part("jaw", g, SCALE_C)
    g = Geo().blob((hx + 11.0, -0.6, hz - 3.0), (8.8, 4.4, 1.3), p=2.3)
    rig.part("jaw", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    for dx in (12.0, 17.0):
        g.lathe([(0.9, 0), (0, 2.4)], (hx + dx, -3.6, hz - 4.2), segs=6)
    rig.part("jaw", g, FANG, outline=0.4)
    rig.joint("mouth", "nh", (hx + 14.0, 0, hz - 3.0), hidden=True)   # the face kit's mouth slot (unused)
    # the breath: a cone of green fire from the jaws (its own joint, shown only while breathing)
    rig.joint("flame", "nh", (SNOUT[0], 0, SNOUT[2] - 1.0), hidden=True)
    sx, sz = SNOUT[0], SNOUT[2] - 1.0
    g = Geo().lathe([(1.8, 0), (5.0, 8.0), (9.0, 20.0), (12.0, 32.0), (12.6, 38.0), (9.0, 42.0), (0, 43.0)],
                    (sx, 0, sz), (sx + 43.0, 0, sz - 3.0), segs=18, squash=(1.0, 0.9))
    rig.part("flame", g, glow=FIRE, outline=0)
    g = Geo().lathe([(1.0, 0), (2.6, 8.0), (5.0, 20.0), (6.0, 30.0), (0, 36.0)], (sx + 1.0, -2.0, sz),
                    (sx + 37.0, -2.0, sz - 2.5), segs=14)
    rig.part("flame", g, glow=FIRE_CORE, outline=0)
    g = Geo()
    for dx, dz, r in ((40.0, 8.0, 4.0), (32.0, -9.0, 3.4), (46.0, -5.0, 3.0)):
        g.sphere((sx + dx, 0.0, sz + dz), r, cuts=2)
    rig.part("flame", g, glow=FIRE, outline=0)
    rig.joint("smoke", "nh", (hx + 22.0, 0, hz + 2.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((2.0, 3.0, 2.4), (5.0, 7.0, 3.0), (3.0, 11.0, 3.4)):
        g.sphere((hx + 22.0 + dx, -1.0, hz + 2.0 + dz), r, cuts=2)
    rig.part("smoke", g, SMOKE, outline=0.4)
    rig.track("breath", "nh", FLAME_TIP)
    rig.rest_scale["nh"] = 1.45


def _leg(rig, name, x, y):
    col = SCALE_C if y < 0 else SCALE_DK
    rig.joint(name, "trunk", (x, y, 22.0))
    rig.joint(f"{name}2", name, (x + 2.0, y, 11.0))
    g = Geo().capsule((x, y, 24.0), (x + 2.0, y, 11.0), 6.6, 5.4)
    rig.part(name, g, col)
    g = Geo().capsule((x + 2.0, y, 11.0), (x + 3.0, y, 4.0), 5.4, 4.4)
    g.blob((x + 5.0, y, 2.4), (7.2, 5.4, 2.6), p=2.6)
    rig.part(f"{name}2", g, col)
    g = Geo()
    for dy in (-3.4, 0.0, 3.4):
        g.lathe([(1.4, 0), (0, 3.4)], (x + 11.0, y + dy, 1.6), (x + 14.0, y + dy, 1.0), segs=6)
    rig.part(f"{name}2", g, CLAW, outline=0.4)
    g = Geo().capsule((x + 0.4, y, 21.0), (x + 1.6, y, 14.0), 7.2, 6.2)   # team leg wraps (war harness)
    rig.part(name, g, team=True, outline=0.6)


RIG = None
LEGS = {}


def _leg_ik(name, x, y):
    LEGS[name[4:]] = G.Leg(name, f"{name}2", (x + 5.0, y, 0.3), bend=1.0 if name[4] == "f" else -1.0)
    RIG.track(f"_foot_{name[4:]}", f"{name}2", (x + 5.0, y, 0.3))


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("trunk", "body", (0, 0, 28))
    rig.rest_scale["body"] = BODY_SCALE
    for name, x, y in (("leg_fl", 18.0, 12.0), ("leg_bl", -22.0, 12.0)):
        _leg(rig, name, x, y)
        _leg_ik(name, x, y)
    # a long tail (three segments) with a team fin
    rig.joint("tail1", "trunk", (-32.0, 0, 30.0))
    rig.joint("tail2", "tail1", (-54.0, 0, 22.0))
    rig.joint("tail3", "tail2", (-74.0, 0, 12.0))
    rig.part("tail1", Geo().capsule((-32.0, 0, 30.0), (-54.0, 0, 22.0), 11.0, 7.8), SCALE_C)
    rig.part("tail2", Geo().capsule((-54.0, 0, 22.0), (-74.0, 0, 12.0), 7.8, 4.8), SCALE_C)
    rig.part("tail3", Geo().capsule((-74.0, 0, 12.0), (-92.0, 0, 7.0), 4.8, 2.0), SCALE_C)
    g = Geo().slab([(-86.0, 8.0), (-100.0, 17.0), (-96.0, 6.0), (-101.0, -3.0)], 0.0, 1.6)
    rig.part("tail3", g, team=True, outline=0.7)
    g = Geo()
    for x, z in ((-44.0, 32.0), (-62.0, 24.0)):   # tail spine frills
        g.slab([(x - 4.0, z), (x + 4.0, z + 1.0), (x - 1.0, z + 8.0)], 0.0, 1.6)
    rig.part("tail1", g, team=True, outline=0.6)
    # a long, low body, a ridged pale belly, team back frills
    g = Geo().blob((-2.0, 0, 34.0), (38.0, 19.0, 16.0), p=2.3)
    g.blob((16.0, 0, 38.0), (16.0, 17.0, 14.0), p=2.2)
    rig.part("trunk", g, SCALE_C)
    g = Geo().blob((2.0, -4.0, 23.0), (32.0, 15.0, 6.4), p=2.4)
    rig.part("trunk", g, BELLY, outline=0.6)
    g = Geo()
    for x in range(-30, 30, 7):
        g.capsule((float(x), -15.6, 20.0), (float(x) + 1.0, -16.4, 25.0), 0.7)
    rig.part("trunk", g, "#BDB396", outline=0)
    g = Geo()
    for x, z in ((-16.0, 40.0), (-4.0, 44.0), (8.0, 42.0), (-10.0, 30.0), (2.0, 32.0), (-26.0, 34.0)):
        g.blob((x, -17.8, z), (3.0, 1.0, 2.2), p=2.4)
    rig.part("trunk", g, SCALE_DK, outline=0)
    # a team war caparison over the shoulders with a parchment paw and a fringe
    cap = Geo().blob((0.0, 0, 44.0), (30.0, 20.6, 14.0), p=3.0)
    cap.clip((0, 0, 30.0), (0, 0, -1))
    cap.clip((-28.0, 0, 0), (-1, 0, 0))
    cface = F.Face(rig, "trunk", [cap])
    rig.part("trunk", cap, team=True)
    g = K.paw(cface, Geo(), K.scr(cface, (4.0, -20.0, 40.0)), s=2.0)
    rig.part("trunk", g, PARCH, highlight=False, outline=0)
    g = Geo()
    for x in range(-26, 26, 5):
        g.lathe([(1.6, 0), (2.0, -1.8), (0, -4.6)], (x, -20.6, 30.2), segs=8)
    rig.part("trunk", g, PARCH, outline=0.4)
    g = Geo()
    for i, x in enumerate((-30.0, -20.0)):   # back frills behind the caparison
        z = 50.0 - (i * 2.0)
        g.slab([(x - 5.0, z - 1.0), (x + 5.0, z), (x - 2.0, z + 10.0)], 0.0, 2.0)
    rig.part("trunk", g, team=True, outline=0.8)
    _neck(rig)
    for name, x, y in (("leg_fr", 18.0, -12.0), ("leg_br", -22.0, -12.0)):
        _leg(rig, name, x, y)
        _leg_ik(name, x, y)


# -- poses ---------------------------------------------------------------------------------
def head(s1=0.0, s2=0.0, h=0.0, jaw=0.0):
    return {"n1": {"r": s1}, "n2": {"r": s2}, "nh": {"r": h}, "jaw": {"r": -jaw}}


def fire(show=True, s=1.0, r=0.0):
    return {"flame": {"show": show, "s": s, "r": r}}


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    ph = 2 * math.pi * f / n
    pose = merge({"trunk": {"z": -1.0 * c}, "body": squash(-0.015 * c)},
                 head(4 * math.sin(ph), 6 * math.sin(ph - 0.8), -5 * math.sin(ph - 1.4), jaw=5 if f == 3 else 0),
                 {"tail2": {"r": 6 * math.sin(ph)}, "tail3": {"r": 10 * math.sin(ph - 1)},
                  "smoke": {"show": f in (1, 2), "z": 2.0 * (f - 1)}})
    if f == 4:
        pose = merge(pose, F.expr("blink", mouth=None))
    return pose


SPEED = 62.5
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(8, 800, SPEED, G.quad_feet(LEGS, G.TROT, scale=BODY_SCALE,
                                                 x_off={"fr": 1.0, "fl": 1.0, "br": -1.0, "bl": -1.0}),
                      0.5, lift=7.0, kick=2.0, reach=2.0, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _walk(f, report=None):
    g = _gait()

    def extra(ctx):
        p = ctx["p"]
        s_, c = math.sin(p), math.cos(p)
        return merge({
            "tail1": {"rz": -8 * s_}, "tail2": {"rz": -12 * math.sin(p - 0.8), "r": 4 * c},
            "tail3": {"rz": -16 * math.sin(p - 1.6), "r": 8 * math.sin(p - 1.0)},
            "trunk": {"rz": 3 * s_},
        }, head(4 * math.sin(p), 6 * math.sin(p - 0.7), -5 * math.sin(p - 1.3)))
    return G.quad_walk(RIG, f, g, {}, base_z=-2.0, bob=2.2, beats=2, pitch=1.2, roll=3.0,
                       extra=extra, report=report)


# attack: moves.HEAVY_MELEE_MS (1230 ms, impact at step 6); 10 unique poses on 12 steps
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#       shift  draw  rear  HOLD lunge lunge BREATH sweep fade settle  (neck1, neck2, head, jaw)
A_HEAD = [(2, 2, 0, 0), (10, 12, -6, 6), (10, 26, -14, 14), (12, 42, -26, 22), (4, 10, -6, 30), (-8, -12, 6, 34),
          (-16, -20, 10, 36), (-20, -24, 12, 34), (-10, -12, 6, 16), (-2, -2, 0, 2)]
A_FIRE = [None, None, None, None, (0.5, 0), (1.0, 0), (1.3, 7), (1.25, 15), (0.9, 6), None]
A_R = [0.0, 0.5, 1.0, 1.0, 0.5, -2.0, -4.0, -4.0, -2.0, 0.0]
A_X = [0.0, -1.0, -2.5, -3.5, 0.0, 3.0, 5.0, 5.0, 2.0, 0.0]
A_Q = [-0.01, 0.02, 0.04, 0.06, 0.02, -0.03, -0.06, -0.04, -0.02, 0.0]


def _pose(tbl, firetbl, rr, xx, qq, f, z=None, rear=None):
    s1, s2, h, jaw = tbl[f]
    pose = merge(M.body_about((0, 0, 30), x=xx[f], z=(z[f] if z else 0.0), q=qq[f]), {"trunk": {"r": rr[f]}},
                 head(s1, s2, h, jaw),
                 {"tail2": {"r": [0, 4, 8, 10, 0, -6, -10, -8, -2, 0][f]},
                  "tail3": {"r": [0, 8, 12, 16, 0, -10, -16, -12, -4, 0][f]}})
    if rear:
        pose = merge(pose, M.body_about((-22.0 * BODY_SCALE, 0, 0), r=rear[f]),
                     {"leg_fr": {"r": 1.4 * rear[f]}, "leg_fl": {"r": 1.4 * rear[f]},
                      "leg_fr2": {"r": -1.6 * rear[f]}, "leg_fl2": {"r": -1.6 * rear[f]}})
    fr = firetbl[f]
    if fr:
        pose = merge(pose, fire(True, fr[0], fr[1]))
    if f in (2, 3):
        pose = merge(pose, {"brow": {"z": -1.0}}, F.expr("squeeze", mouth=None))
    if f == 3:
        pose = merge(pose, {"n1": {"sx": 1.08, "sz": 1.08}, "smoke": {"show": True}})
    return pose


def _attack_pose(f):
    return _pose(A_HEAD, A_FIRE, A_R, A_X, A_Q, f)


def _ov(tip=FLAME_TIP):
    return {
        4: [{"kind": "streak", "joint": "nh", "point": SNOUT, "color": SCALE_LT, "width_lu": 10.0, "white": 0.3,
             "from": 3, "t1": 0.95}],
        6: [{"kind": "burst", "joint": "nh", "point": tip, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6, "a0": -80.0,
             "arc": 160.0, "color": "#E8FFE6"},
            {"kind": "dust", "ground": (90.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 161, "spread": 1.4}],
    }


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6, smear=4,
                  sequence=ATTACK_SEQ, overlays=_ov())


# attack B: low sweep. 1 sink, 2 coil, 3 HOLD (the head low along the ground, the body crouched), 4-5 the
# sweep starts, 6 BREATH (fire swept up and across), 7 sweep, 8-9 = A
B_HEAD = [(2, 2, 0, 0), (-14, -10, 6, 4), (-26, -20, 12, 8), (-34, -28, 18, 14), (-26, -18, 12, 26), (-16, -8, 4, 32),
          (-8, 0, -2, 36), (-2, 4, -6, 34), (-10, -12, 6, 16), (-2, -2, 0, 2)]
B_FIRE = [None, None, None, None, (0.5, 12), (1.0, 8), (1.3, 2), (1.35, -6), (0.9, -14), None]
B_R = [0.0, -2.0, -4.0, -5.0, -3.0, -1.0, 1.0, 1.0, -2.0, 0.0]
B_X = [0.0, 1.0, 0.0, -1.0, 1.0, 3.0, 5.0, 5.0, 2.0, 0.0]
B_Z = [0.0, -1.5, -3.0, -4.0, -3.0, -1.5, 0.0, 0.0, 0.0, 0.0]
B_Q = [-0.01, -0.02, -0.04, -0.05, 0.02, 0.03, -0.05, -0.03, -0.02, 0.0]


def _b_pose(f):
    if f == 0 or f >= 8:
        return _attack_pose(f)
    return _pose(B_HEAD, B_FIRE, B_R, B_X, B_Q, f, z=B_Z)


# attack C: reared pour. 1 lift, 2 rear, 3 HOLD (reared up on the hind legs, head high and back), 4-5 the
# head drops, 6 BREATH (fire poured down in front), 7 pour, 8-9 = A
C_HEAD = [(2, 2, 0, 0), (6, 8, -4, 4), (12, 16, -8, 10), (16, 22, -10, 16), (0, -6, 10, 28), (-14, -20, 22, 34),
          (-22, -28, 30, 36), (-24, -30, 32, 34), (-10, -12, 6, 16), (-2, -2, 0, 2)]
C_FIRE = [None, None, None, None, (0.5, 0), (1.0, -4), (1.3, -8), (1.35, -14), (0.9, -18), None]
C_REAR = [0.0, 6.0, 14.0, 18.0, 12.0, 4.0, 0.0, 0.0, 0.0, 0.0]
C_X = [0.0, -1.0, -2.0, -3.0, 0.0, 3.0, 5.0, 5.0, 2.0, 0.0]
C_Q = [-0.01, 0.02, 0.03, 0.04, 0.02, -0.03, -0.07, -0.04, -0.02, 0.0]
C_R = [0.0] * 10


def _c_pose(f):
    if f == 0 or f >= 8:
        return _attack_pose(f)
    return _pose(C_HEAD, C_FIRE, C_R, C_X, C_Q, f, rear=C_REAR)


def _variant(name, fn):
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip(name, [fn(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6, smear=4, sequence=ATTACK_SEQ,
                  overlays=_ov(), reuse=reuse)


def _hit(k):
    def recoil(a, shake):
        pose = {"body": dict(squash(-0.05 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "trunk": {"r": 3 * a}, "tail2": {"r": 8 * a}}
        pose = merge(pose, head(10 * a, 8 * a, -6 * a + 8 * shake, jaw=10 * max(a, 0)), {"nh": {"rx": 10 * shake}})
        return pose
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze", mouth=None))


DIE_KEEP = [0, 1, 2, 4, 5, 7, 8, 9]


def _die(k):
    droop = [0.0, 0.3, 0.6, 0.8, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0][k]
    sink = [0.0, 0.2, 0.5, 0.8, 1.0, 0.92, 1.0, 1.0, 1.0, 1.0][k]
    pose = M.body_about((0, 0, 30), x=-2.0 * sink, z=-12.0 * sink,
                        q=[-0.06, 0.04, 0.02, -0.08, -0.12, 0.04, -0.06, -0.03, -0.05, -0.08][k],
                        s=[1, 1, 1, 1, 1, 1, 1, 1, 0.97, 0.92][k])
    pose = merge(pose, head(-70 * droop, 40 * droop, 36 * droop, jaw=14 * droop),
                 {"tail2": {"r": -8 * sink}, "tail3": {"r": -10 * sink},
                  "leg_fr": {"r": 50 * sink}, "leg_fr2": {"r": -30 * sink},
                  "leg_fl": {"r": 46 * sink}, "leg_fl2": {"r": -28 * sink},
                  "leg_br": {"r": -50 * sink}, "leg_br2": {"r": 30 * sink},
                  "leg_bl": {"r": -46 * sink}, "leg_bl2": {"r": 28 * sink},
                  "smoke": {"show": 2 <= k <= 6}})
    if k >= 4:
        pose = merge(pose, F.expr("x", mouth=None))
    elif k <= 1:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.walk_clip("walk", RIG, _walk, _gait(), "quad"),
        _attack_clip(),
        _variant("attack_b", _b_pose),
        _variant("attack_c", _c_pose),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(DIE_KEEP[i]) for i in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
