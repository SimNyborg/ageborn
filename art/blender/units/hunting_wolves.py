"""Hunting Wolves: Stone Age common infantry pair (CONTENT_PLAN 5.1, X0 M1 squad). Bite, ~50 lu.

One card trains two wolves; this sheet is one wolf (the game plays the two desynchronised).

Look (A11, PLAN.md): a lean grey hunting wolf, long legs and a long tapered muzzle, tall pointed
ears, a bushy tail with a dark tip, a pale cream throat and belly, yellow-amber eyes under an
angry brow ridge, a dark saddle of fur on the back. It wears a team hide vest strapped over the
shoulders and back, a team collar with a bone tag and a team wrap round the tail root (the 18%
rule on a slim beast). Fur and skin stay below 40% saturation (A11 colour rule).

"A viewer expects it to attack by biting (a lunge and a head shake) and to move by loping."

Animation (ANIM_SPEC G4 bound, appendix B for beasts: bite, pounce, snap):
  idle      ears flick, a sniff, the tail wags, blink
  walk      walk v3 (G4): a loping bound at ground speed (card 80 x 1.25 = 100 lu/s), flight
            phase, spine flex, planted paws, the tail streaming
  attack    LUNGE-BITE AND SHAKE: crouches with the hackles up, lunges low and long (streak),
            jaws clamp at the impact, then shakes its head side to side (rx) before backing off
  attack_b  REAR-UP SNAP: rises onto the hind legs, forepaws up, and snaps down from above
  attack_c  LOW HAMSTRING NIP: a play-bow crouch, then a quick sideways dart that nips low
  hit       beast: ears back, a yelp, a hind hop;  die  D4 legs-up flop, X eyes, tongue out
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad

SLUG = "hunting_wolves"
GAIT_NAME = "quad"
NAME = "Hunting Wolves"
HEIGHT_LU = 50
YAW_DEG = -10.0
CANVAS = (264, 196)
FEET = (112, 178)
ANCHORS = {"head": (16, 48), "hitCenter": (0, 24)}
NO_RETIME = True

# palette (cfg so the Cave Pup can reuse the build)
WOLF = dict(
    fur="#8E877C", fur_dk="#6C665E", saddle="#57524C", cream="#DDD4C2", nose="#2E2A28",
    eye="#F2DC9A", pupil="#221C19", mouth="#5A2E2E", fang="#F4EEDC", bone="#EDE3C8",
    strap="#6B5646", scale=1.0, speed=100.0, cycle=560,
)
CFG = dict(WOLF)
FANG = (31.0, -2.4, 20.0)


def _leg(rig, name, p0, p1, front, c):
    x0, y, z0 = p0
    x1, _, z1 = p1
    col = c["fur"] if y < 0 else c["fur_dk"]
    g = Geo().capsule(p0, p1, 4.8 if front else 5.6, 3.0)
    g.blob((x0 + (1.0 if front else -1.0), y * 0.8, z0 - 3.5), (5.2 if front else 6.6, 4.0, 6.6), p=2.2)
    rig.part(f"leg_{name}", g, col)
    g = Geo().capsule(p1, (x1 + (0.8 if front else 0.4), y, 3.0), 3.0 if front else 2.7, 2.4)
    g.blob((x1, y, z1), (3.6, 3.4, 3.0), p=2.2)
    rig.part(f"leg_{name}2", g, col)
    if True:   # team wrap above the paw (the 18% rule on a slim beast)
        g = Geo().capsule((x1 + 0.3, y, z1 - 0.5), (x1 + 0.7, y, 4.8), 3.3 if front else 3.0, 3.1 if front else 2.8)
        rig.part(f"leg_{name}2", g, team=True, outline=0.6)
    px = x1 + (2.2 if front else 1.6)
    g = Geo().blob((px, y, 2.2), (4.4, 3.4, 2.3), p=2.4, taper=(1.0, 0.8))
    rig.part(f"leg_{name}2", g, c["cream"] if y < 0 else c["fur_dk"])


def build_wolf(rig, c, slug_globals):
    """Joints and meshes of a wolf (shared with the Cave Pup). Returns (LEGS, Quad)."""
    dz = c.get("dz", 4.0)   # longer legs: the body and head sit dz higher than the meshes are written
    q = Quad(rig, trunk=(0, 24 + dz), front_x=11.5, back_x=-12.0, leg_y=4.6, shoulder_z=25.0 + dz,
             hip_z=24.0 + dz, knee_z=12.5 + dz * 0.45, hock_z=11.5 + dz * 0.45, knee_dx=0.5, hock_dx=-2.6,
             far_dx=-2.6)
    rig.rest_scale["body"] = c["scale"]
    rig.joint("chest", "trunk", (0, 0, 24 + dz))
    rig.rest_offset["chest"] = (0, 0, dz)
    legs = {}
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f", c)
        legs[name] = G.Leg(f"leg_{name}", f"leg_{name}2", (p1[0] + 1.2, p1[1], 0.6),
                           bend=1.0 if name[0] == "f" else -1.0)
        rig.track(f"_foot_{name}", f"leg_{name}2", (p1[0] + 1.2, p1[1], 0.4))

    # lean body: a deep chest tapering to a tucked waist; cream underside; a dark saddle
    g = Geo().blob((8, 0, 27.5), (10.5, 8.2, 9.6), p=2.2)
    g.blob((-3, 0, 26.5), (12.5, 7.4, 7.6), p=2.2)
    g.blob((-12, 0, 26.0), (7.6, 7.6, 7.8), p=2.2)
    rig.part("chest", g, c["fur"])
    g = Geo().blob((10, 0, 22.0), (7.6, 6.6, 6.0), p=2.2).blob((-2, 0, 20.4), (9.0, 5.6, 2.8), p=2.4)
    rig.part("chest", g, c["cream"])
    # team hide vest over the shoulders and back (ragged hem), a strap with a bone toggle
    g = Geo().blob((3.5, 0, 28.6), (11.5, 9.0, 8.8), p=3.0)
    g.clip((0, 0, c.get("vest_z", 22.0)), (0, 0, -1))
    g.clip((-9.0, 0, 0), (-1, 0, 0))
    for x in (-4.0, 0.5, 5.0, 9.5):
        g.lathe([(2.2, 0), (0, -3.4)], (x, -8.4, 22.6), segs=8)
    rig.part("chest", g, team=True)
    g = Geo().lathe([(0, -0.1), (8.6, 0), (9.2, 3.6), (0, 3.7)], (8.6, 0, 26.0), (9.4, 0, 26.0),
                    segs=20, squash=(1.1, 1.0))
    g.clip((0, 0, 17.0), (0, 0, -1))
    rig.part("chest", g, team=True, outline=0.7)   # team girth band (shows when it flops over)
    g = Geo().lathe([(0, -0.1), (7.6, 0), (8.0, 7.0), (0, 7.1)], (-8.0, 0, 26.0), (-7.2, 0, 26.0),
                    segs=20, squash=(1.0, 1.0))
    g.clip((0, 0, 24.0), (0, 0, 1))   # the under half only: a belly wrap seen when it lies on its back
    rig.part("chest", g, team=True, outline=0.7)
    g = Geo().capsule((9.0, -9.8, 23.0), (12.4, -9.8, 23.6), 1.1)
    rig.part("chest", g, c["bone"], outline=0.5)
    # dark saddle stripe along the spine behind the vest
    g = Geo().blob((-12.5, 0, 32.0), (6.0, 5.0, 2.4), p=2.4)
    rig.part("chest", g, c["saddle"], finish="hair")

    # neck (with a ruff), team collar and head: long tapered muzzle, tall ears
    rig.joint("neck", "chest", (14, 0, 31))
    rig.joint("head", "neck", (20, 0, 35), scale=c.get("head_scale", 1.32))
    g = Geo().blob((16, 0, 32), (6.8, 7.4, 8.0), p=2.2)
    rig.part("neck", g, c["fur"])
    g = Geo()
    for y in (-1, 1):
        g.lathe([(3.6, 0), (2.4, 3.2), (0, 6.6)], (17.0, 5.6 * y, 29.0), (12.0, 9.0 * y, 26.0), segs=10,
                squash=(1.0, 0.6))
    rig.part("neck", g, c["cream"], finish="hair")
    g = Geo().lathe([(7.4, 0), (8.6, 0.6), (8.6, 3.6), (7.2, 4.2)], (14.5, 0, 28.5), (18.0, 0, 35.5), segs=22)
    rig.part("neck", g, team=True, outline=0.8)
    rig.secondary("tag", "neck", (18.5, -7.6, 29.0), (19.0, -8.0, 24.0), max_deg=25, gain=1.4)
    g = Geo().capsule((18.5, -7.8, 29.0), (18.9, -8.0, 26.0), 0.5)
    g.blob((19.0, -8.2, 24.6), (1.9, 0.9, 2.2), p=2.4)
    rig.part("tag", g, c["bone"], outline=0.5)

    head = Geo().blob((21.5, 0, 37.0), (7.6, 7.0, 6.2), p=2.25)
    head.lathe([(4.6, 0), (3.8, 4.0), (2.8, 8.0), (2.4, 9.6), (0, 10.0)], (24.0, 0, 35.2),
               (33.5, 0, 33.2), segs=18)
    eye = Geo().blob((25.6, -5.2, 38.4), (2.6, 1.6, 2.0))
    pup = Geo().blob((27.0, -5.8, 38.3), (0.9, 0.8, 1.5))
    face = F.Face(rig, "head", [head, eye, pup])
    rig.part("head", head, c["fur"])
    g = Geo().blob((28.5, -0.4, 32.4), (5.6, 3.6, 2.2), p=2.2)   # cream lower muzzle and cheeks
    for y in (-1, 1):
        g.lathe([(3.0, 0), (2.0, 2.6), (0, 6.0)], (19.0, 5.2 * y, 34.6), (14.0, 8.4 * y, 32.0), segs=10,
                squash=(1.0, 0.6))
    rig.part("head", g, c["cream"], finish="hair")
    g = Geo().blob((33.6, -0.3, 33.6), (1.9, 2.0, 1.6), p=2.2)
    rig.part("head", g, c["nose"], outline=0.5)
    rig.part("head", eye, c["eye"], highlight=False)
    rig.joint("pupils", "head", (27.0, -5.8, 38.3))
    rig.part("pupils", pup, c["pupil"], outline=0)
    face.eye_marks([(27.0, 38.4)], 2.2, c["fur"])
    rig.joint("brow", "head", (26.0, -5.0, 40.5))
    g = Geo().capsule((23.4, -6.4, 41.4), (28.2, -5.4, 39.6), 1.3, 0.9)
    rig.part("brow", g, c["saddle"], finish="hair", outline=0.5)
    # tall pointed ears on their own joint (they flick and fold back)
    rig.joint("ears", "head", (19.0, 0, 41.5))
    g = Geo()
    for y in (-1, 1):
        g.lathe([(3.2, 0), (2.2, 3.6), (0, 8.2)], (19.0, 3.8 * y, 41.0), (17.4, 5.0 * y, 49.0), segs=10,
                squash=(1.0, 0.55))
    rig.part("ears", g, c["fur_dk"])
    g = Geo().lathe([(1.6, 0), (1.0, 2.6), (0, 5.2)], (19.6, -4.5, 42.0), (18.4, -5.4, 47.0), segs=8,
                    squash=(1.0, 0.5))
    rig.part("ears", g, c["cream"], outline=0.3)
    # lower jaw: opens wide on the bite, the fangs show
    rig.joint("jaw", "head", (23.0, 0, 33.0))
    jaw = Geo().blob((28.0, 0, 31.0), (5.6, 3.6, 1.8), p=2.2)
    jface = F.Face(rig, "jaw", [jaw])
    rig.part("jaw", jaw, c["cream"])
    g = Geo().blob((27.6, 0, 32.4), (5.0, 3.0, 1.0), p=2.2)
    rig.part("jaw", g, c["mouth"], outline=0, highlight=False)
    jaw.bm.free()
    jface.mouths((30.5, 31.0), 3.8)
    g = Geo()
    for y in (-2.4, 2.0):   # upper fangs (on the head) and lower fangs (on the jaw)
        g.lathe([(1.0, 0), (0.6, 1.8), (0, 3.0)], (30.6, y, 32.6), (31.0, y, 29.8), segs=8)
    rig.part("head", g, c["fang"], finish="gloss", outline=0.4)
    g = Geo()
    for y in (-2.0, 1.8):
        g.lathe([(0.9, 0), (0.5, 1.5), (0, 2.6)], (29.4, y, 31.6), (29.6, y, 34.0), segs=8)
    rig.part("jaw", g, c["fang"], finish="gloss", outline=0.4)
    rig.track("fangTip", "head", FANG)

    # bushy tail with a dark tip and a team wrap at the root
    rig.secondary("tail", "chest", (-18, 0, 29), (-30, 0, 24), max_deg=24, gain=1.4)
    g = Geo().capsule((-18, 0, 29), (-24, 0, 27.5), 2.6, 3.6).capsule((-24, 0, 27.5), (-30.5, 0, 23.5), 3.6, 2.6)
    rig.part("tail", g, c["fur"], finish="hair")
    g = Geo().blob((-31.5, 0, 22.8), (2.8, 2.6, 2.6), p=2.2)
    rig.part("tail", g, c["saddle"], finish="hair")
    g = Geo().lathe([(2.9, 0), (3.2, 0.4), (3.2, 2.4), (2.9, 2.8)], (-18.0, 0, 29.0), (-20.6, 0, 28.4), segs=16)
    rig.part("tail", g, team=True, outline=0.6)
    return legs, q


def build(rig, cfg=None, height=None):
    """`cfg`/`height`: the Cave Pup builds a smaller wolf through this module."""
    global RIG, LEGS, GAIT, CFG, HEIGHT_LU
    CFG = dict(cfg or WOLF)
    HEIGHT_LU = height or 50
    RIG = rig
    GAIT = None
    LEGS, _ = build_wolf(rig, CFG, globals())


RIG = None
LEGS = None
GAIT = None
BOUND = {"bl": 0.0, "br": 0.12, "fl": 0.5, "fr": 0.62}


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(8, CFG["cycle"], CFG["speed"], G.quad_feet(LEGS, BOUND, scale=CFG["scale"],
                                                               x_off={"fr": 1.0, "fl": 1.0, "br": -1.0, "bl": -1.0}),
                      0.30, lift=5.5, kick=2.5, reach=2.4, toe_off=0.0, heel_strike=0.0)
    return GAIT


# -- poses ---------------------------------------------------------------------------------
def _idle(f):
    c = math.cos(2 * math.pi * f / 8)
    lag = math.cos(2 * math.pi * (f - 1) / 8)
    sniff = [0.0, 0.0, 0.4, 1.0, 0.6, 0.0, 0.0, 0.0][f]
    pose = {
        "trunk": {"z": -0.8 * c, "r": 0.6 * c},
        "body": squash(-0.03 * c),
        "neck": {"r": 2.5 * lag - 10 * sniff}, "head": {"r": -2.5 * lag - 6 * sniff},
        "ears": {"r": [0, 0, 0, 0, 0, 16, -8, 0][f]},
        "tail": {"r": [0, 18, 26, 10, -12, -20, -8, 6][f], "rz": [0, 14, 20, 8, -10, -16, -6, 4][f]},
        "jaw": {"r": -4 * sniff},
    }
    if f == 6:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f, report=None):
    g = _gait()

    def extra(ctx):
        p = ctx["p"]
        return {"neck": {"r": -5.0 * math.cos(p - 0.6)}, "head": {"r": 4.0 * math.cos(p - 1.0)},
                "ears": {"r": -10 + 6 * math.cos(p - 1.2)}, "tail": {"r": -10 + 12 * math.cos(p - 1.4)},
                "jaw": {"r": -6}}
    return G.quad_walk(RIG, f, g, {}, base_z=-4.6, bob=CFG.get("bob", 4.6), beats=1, low_at=0.3, pitch=8.0,
                       pitch_phase=1.2, roll=1.5, extra=extra, report=report)


def _wolf(x, z, q, r, n, h, j, fr, fl, br, bl, tail=0.0, ears=0.0, rx=0.0, hrx=0.0, rz=0.0):
    return merge(M.body_about((0, 0, 28), x=x, z=z, q=q), {
        "trunk": {"r": r, "rz": rz},
        "neck": {"r": n}, "head": {"r": h, "rx": hrx}, "jaw": {"r": j},
        "leg_fr": {"r": fr[0]}, "leg_fr2": {"r": fr[1]},
        "leg_fl": {"r": fl[0]}, "leg_fl2": {"r": fl[1]},
        "leg_br": {"r": br[0]}, "leg_br2": {"r": br[1]},
        "leg_bl": {"r": bl[0]}, "leg_bl2": {"r": bl[1]},
        "tail": {"r": tail}, "ears": {"r": ears}, "body": {"rx": rx} if rx else {},
    })


# attack A, 11 unique frames on moves.SMALL_MELEE_MS:
#      read  crouch  coil  HOLD  lunge  reach  BITE  shake1 shake2 back  settle
A_TAB = [
    (-0.5, -1.0, -0.03, -2, -4, -2, 0, (-4, 0), (-2, 0), (4, 6), (2, 4), 10, 0, 0),
    (-2.0, -3.5, -0.10, -4, -10, -6, -4, (-14, 16), (-12, 14), (16, 28), (14, 24), 18, -10, 0),
    (-3.5, -5.5, -0.12, -6, -16, -8, -8, (-22, 28), (-20, 26), (26, 44), (24, 40), 24, -18, 0),
    (-4.5, -6.5, -0.14, -8, -20, -10, -12, (-26, 34), (-24, 30), (32, 52), (30, 48), 28, -24, 0),
    (6.0, -1.0, 0.10, -6, -4, 4, -34, (58, -24), (50, -18), (-40, 14), (-36, 12), -8, -26, 0),
    (11.0, -2.5, 0.06, -8, -10, -2, -40, (40, -10), (36, -8), (-36, 10), (-32, 8), -12, -26, 0),
    (13.0, -3.0, -0.16, -10, -18, -12, 0, (22, -4), (18, -2), (-26, 8), (-22, 6), -6, -22, 0),
    (12.0, -2.5, -0.06, -8, -16, -10, -2, (20, -4), (16, -2), (-24, 8), (-20, 6), 4, -20, 1),
    (11.0, -2.5, -0.06, -8, -16, -10, -2, (20, -4), (16, -2), (-24, 8), (-20, 6), -4, -20, -1),
    (5.0, -1.0, -0.02, -4, -6, -4, -4, (6, 0), (4, 0), (-8, 4), (-6, 2), 4, -8, 0),
    (1.0, -0.3, 0.0, -1, -2, -1, -1, (0, 0), (0, 0), (0, 2), (0, 2), 6, 0, 0),
]


def _attack_pose(f):
    x, z, q, r, n, h, j, fr, fl, br, bl, tail, ears, shake = A_TAB[f]
    pose = _wolf(x, z, q, r, n, h, j, fr, fl, br, bl, tail, ears, hrx=26 * shake)
    if shake:
        pose["neck"]["rz"] = -14 * shake
    if f in (2, 3):
        pose = merge(pose, {"brow": {"z": -0.8}})
    return pose


def _attack_clip():
    ov = {
        3: [{"kind": "dust", "ground": (-12.0, 0.0), "size_lu": 4.0, "puffs": 3, "seed": 31, "dir": -1.0}],
        4: [{"kind": "streak", "joint": "head", "point": FANG, "color": CFG["cream"], "width_lu": 7.0,
             "white": 0.4, "from": 3},
            {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 32, "dir": -1.0}],
        6: [{"kind": "burst", "joint": "head", "point": FANG, "r0_lu": 5.0, "r1_lu": 9.0, "n": 5,
             "a0": -50.0, "arc": 140.0},
            {"kind": "dust", "ground": (18.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 33, "spread": 0.8}],
        7: [{"kind": "arc", "joint": "head", "inner": (FANG[0] - 4, FANG[1], FANG[2] + 2), "outer": FANG,
             "color": CFG["cream"], "taper": 0.2, "t0": 0.0, "t1": 0.9, "lines": 2, "white": 0.4}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# attack B: rear-up snap. 0 = A read, 1 rise, 2 HOLD (reared tall on the hind legs, forepaws up and
# curled, the head high, jaws open), 3 smear (dropping forward), 4 IMPACT (forepaws pin, snapping
# down), 5 follow, 6-7 = A back/settle
B_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    tab = [
        (-2.0, 3.0, 0.04, 22, 10, 8, -10, (40, -60), (36, -56), (-10, 10), (-8, 8), -10, 6),
        (-4.0, 8.0, 0.08, 46, 26, 12, -36, (70, -100), (64, -96), (-28, 22), (-26, 20), -20, 10),
        (3.0, 4.0, 0.06, 20, -8, -6, -40, (50, -40), (44, -36), (-20, 16), (-18, 14), -6, -6),
        (9.0, -2.0, -0.14, -4, -22, -14, 0, (24, -8), (20, -6), (-22, 10), (-18, 8), 4, -20),
        (8.0, -1.5, -0.04, -2, -16, -10, -2, (14, -4), (10, -2), (-16, 8), (-12, 6), 6, -14),
    ][i - 1]
    x, z, q, r, n, h, j, fr, fl, br, bl, tail, ears = tab
    return _wolf(x, z, q, r, n, h, j, fr, fl, br, bl, tail, ears)


def _attack_b():
    ov = {
        2: [{"kind": "dust", "ground": (-10.0, 0.0), "size_lu": 4.0, "puffs": 3, "seed": 34, "dir": -1.0}],
        3: [{"kind": "arc", "joint": "head", "inner": (FANG[0] - 6, FANG[1], FANG[2]), "outer": FANG,
             "color": CFG["cream"], "taper": 0.15, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.4, "from": 2}],
        4: [{"kind": "burst", "joint": "head", "point": FANG, "r0_lu": 5.0, "r1_lu": 10.0, "n": 5,
             "a0": -80.0, "arc": 140.0},
            {"kind": "dust", "ground": (20.0, 0.0), "size_lu": 6.0, "puffs": 4, "seed": 35, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4,
                  sequence=B_SEQ, overlays=ov, reuse=reuse)


# attack C: low hamstring nip. 0 = A read, 1 play-bow (chest down, rump up, tail high),
# 2 HOLD (deeper bow, head low and turned toward the viewer), 3 dart (low, stretched, head sweeping
# across), 4 IMPACT (a low nip at the legs, head turned in), 5 tug back, 6-7 = A back/settle
C_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    tab = [
        (-1.5, -2.0, -0.06, -14, -10, -6, 0, (-30, 50), (-28, 46), (8, 4), (6, 4), 30, 8),
        (-3.0, -3.5, -0.10, -20, -16, -8, -14, (-40, 70), (-38, 66), (12, 6), (10, 6), 40, 10),
        (6.0, -4.0, 0.08, -10, -28, -16, -30, (40, -20), (34, -14), (-34, 12), (-30, 10), 10, -20),
        (10.0, -5.0, -0.14, -12, -36, -24, 0, (26, -6), (22, -4), (-26, 10), (-22, 8), 0, -24),
        (6.0, -3.0, -0.04, -6, -24, -14, -4, (10, -2), (8, 0), (-14, 6), (-10, 4), 8, -16),
    ][i - 1]
    x, z, q, r, n, h, j, fr, fl, br, bl, tail, ears = tab
    pose = _wolf(x, z, q, r, n, h, j, fr, fl, br, bl, tail, ears)
    if i in (2, 3, 4):
        pose["neck"]["rz"] = [16, -10, -24][i - 2]
        pose["head"]["rz"] = [10, -6, -14][i - 2]
    return pose


def _attack_c():
    ov = {
        3: [{"kind": "streak", "joint": "head", "point": FANG, "color": CFG["cream"], "width_lu": 6.0,
             "white": 0.4, "from": 2},
            {"kind": "dust", "ground": (-8.0, 0.0), "size_lu": 4.0, "puffs": 3, "seed": 36, "dir": -1.0}],
        4: [{"kind": "burst", "joint": "head", "point": FANG, "r0_lu": 4.0, "r1_lu": 8.0, "n": 4,
             "a0": -30.0, "arc": 120.0},
            {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 37, "spread": 0.8}],
    }
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4,
                  sequence=C_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a, shake):
        return {"body": dict(squash(-0.1 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "trunk": {"r": 6 * a},
                "neck": {"r": 14 * a}, "head": {"r": 10 * a + 6 * shake, "rx": 14 * shake},
                "jaw": {"r": -16 * max(a, 0)}, "ears": {"r": -28 * max(a, 0)},
                "leg_br": {"r": -12 * max(a, 0)}, "leg_bl": {"r": -10 * max(a, 0)},
                "leg_br2": {"r": 16 * max(a, 0)}, "leg_bl2": {"r": 14 * max(a, 0)},
                "leg_fr": {"r": -8 * a}, "tail": {"r": -30 * a}}
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze"))


def _die(k):
    kick = [0.0, 0.3, 0.7, 1.0, 0.6, 1.0, 0.4, 0.2, 0.1, 0.0][k]
    pose = merge(M.die_d4(k, center_z=29.0, back_z=27.0, height=HEIGHT_LU), {
        "neck": {"r": [14, 18, 12, 6, 2, 0, 0, 0, 0, 0][k]},
        "head": {"r": [8, -6, -10, -14, -12, -10, -8, -8, -8, -8][k]},
        "jaw": {"r": -18}, "ears": {"r": -20},
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
        M.walk_clip("walk", RIG, _walk, _gait(), "quad"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
