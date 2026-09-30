"""Medieval Age turrets (DESIGN A5.3, A14.2): Crossbow Nest, Pitch Cauldron, Trebuchet,
Honk Ballista.

Cartoon kit v2 (art director plan 2026-09-30): every turret stands on a Medieval masonry
plinth (dressed stone blocks, a crenellated rim and a team banner with a parchment bear paw)
instead of the shared grey plinth with a pennant, has a 6-frame idle loop with character, a
readable anticipation in `fire` and 2D accents (smears, twang rings, impact lines):

  Crossbow Nest   idle: the crossbow tracks and the windlass ticks; fire: the windlass cranks
                  the string back (limbs bend), then a TWANG (rings), the string vibrates and a
                  new bolt drops in
  Pitch Cauldron  idle: the pitch bubbles and pops, steam rises, the fire flickers; fire: it
                  rocks back, then tips forward and pours with drips
  Trebuchet       idle: the counterweight sways on its hinge, the sling swings; fire: the arm
                  cranks down, the counterweight drops and the sling WHIPS over the top (smear)
  Honk Ballista   idle: the goose (in a tiny kettle hat and a team harness) preens and blinks;
                  fire: it crouches, flaps and HONKS (rings) as it is launched; a new goose
                  hops in
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art.geometry import Geo

from world.common import box, cyl, rope, smoke_puff, turret_module

STONE = "#9A9C98"
STONE_LT = "#AEB0AA"
STONE_DK = "#7C7F80"
MORTAR = "#6E706E"
WOOD = "#857058"
WOOD_DK = "#5C4C3E"
IRON = "#4A4E56"
STEEL = "#A9B1BB"
GOLD = "#D4A437"
ROPE = "#C2AE86"
PITCH = "#2A2426"
PITCH_LT = "#4A4046"
FIRE = "#FFD08A"
FIRE_CORE = "#FFF3D6"
GOOSE = "#F2EFE6"
GOOSE_DK = "#C8C4B8"
BEAK = "#E0A24A"
PARCH = "#E8DFC8"
EYE = "#FAF6EE"
PUPIL = "#221C19"

CANVAS = (270, 220)
FEET = (100, 180)


def castle_plinth(rig, r=15.0, h=10.0):
    """Medieval masonry plinth: a dressed-stone block with mortar lines, a crenellated rim at
    the back and a team banner with a parchment bear paw hanging on the near face."""
    d = r * 0.8
    g = Geo()
    box(g, (0, 2, h / 2), (r, d, h / 2), p=6)
    blk = g
    pf = F.Face(rig, "mount", [blk])
    rig.part("mount", g, STONE)
    g = Geo()
    box(g, (0, 2, h - 0.5), (r + 1.2, d + 1.2, 1.6), p=6)
    rig.part("mount", g, STONE_LT)
    # mortar lines on the near face (a running bond, flat strokes)
    g = Geo()
    for zz, off in ((h * 0.36, 0.0), (h * 0.7, 3.5)):
        c = pf.hit(*K.scr(pf, (0.0, 2 - d, zz)))
        pf.stroke(g, c, [(-r + 1.5, 0.0), (r - 1.5, 0.0)], 0.7, 0.3)
        for x in range(-12, 13, 7):
            xx = x + off
            if abs(xx) < r - 2:
                c2 = pf.hit(*K.scr(pf, (xx, 2 - d, zz - h * 0.17)))
                pf.stroke(g, c2, [(0.0, -h * 0.15), (0.0, h * 0.15)], 0.7, 0.3)
    rig.part("mount", g, MORTAR, highlight=False, outline=0)
    # merlons along the back edge of the top
    g = Geo()
    for x in (-r + 3.0, -r + 11.0, r - 11.0, r - 3.0):
        box(g, (x, 2 + d - 1.5, h + 2.5), (2.8, 1.8, 2.6), p=5)
    rig.part("mount", g, STONE_LT)
    # the team banner on the near face, hanging from a rod
    bx, by = -r * 0.45, 2 - d - 1.0
    g = Geo().capsule((bx - 5.5, by, h - 0.8), (bx + 5.5, by, h - 0.8), 0.8)
    rig.part("mount", g, WOOD_DK, outline=0.5)
    ban = Geo().slab([(bx - 4.6, h - 1.2), (bx + 4.6, h - 1.2), (bx + 4.6, 1.2), (bx, 3.4), (bx - 4.6, 1.2)],
                     by, 0.9)
    bf = F.Face(rig, "mount", [ban])
    rig.part("mount", ban, team=True, outline=0.5)
    g = K.paw(bf, Geo(), K.scr(bf, (bx, by - 0.5, h * 0.52)), s=0.95)
    rig.part("mount", g, PARCH, highlight=False, outline=0)


# -- Crossbow Nest: a heavy crossbow on a post with a windlass ------------------------------------
def crossbow_build(rig):
    castle_plinth(rig)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 22), 3.2, bevel=0.5)
    rig.part("mount", g, WOOD_DK)
    # a box of spare bolts on the plinth
    g = Geo()
    box(g, (9.0, -5.0, 13.0), (3.4, 2.6, 3.2), p=5)
    rig.part("mount", g, WOOD)
    g = Geo()
    for dx in (-1.4, 0.0, 1.4):
        g.capsule((9.0 + dx, -5.0, 15.0), (9.0 + dx * 1.4, -5.0, 21.0), 0.6)
    rig.part("mount", g, WOOD_DK, outline=0.3)
    g = Geo()
    for dx in (-1.4, 0.0, 1.4):
        g.blob((9.0 + dx * 1.4, -5.0, 21.6), (0.9, 1.2, 1.4), p=2.0)
    rig.part("mount", g, PARCH, outline=0.3)
    # head: stock along +x, bow limbs across y (seen foreshortened), string, a bolt
    g = Geo()
    box(g, (4, 0, 25), (15, 3.0, 2.6), p=5)
    rig.part("head", g, WOOD)
    g = Geo()
    box(g, (-10, 0, 24), (4, 3.4, 3.6), p=5)
    rig.part("head", g, team=True)
    g = Geo()
    for x in (-2.0, 10.0):
        g.lathe([(3.2, 0), (3.5, 0.4), (3.5, 1.4), (3.2, 1.8)], (x, 0, 25), (x + 1, 0, 25), segs=12)
    rig.part("head", g, IRON, finish="metal", outline=0.4)
    rig.joint("limbs", "head", (15, 0, 26))
    g = Geo()
    for s in (-1, 1):
        g.capsule((15, 0, 26), (10, s * 21, 28), 2.4, 1.4)
    rig.part("limbs", g, WOOD_DK)
    g = Geo()
    box(g, (15, 0, 26), (2.4, 3.8, 2.4), p=4, cuts=2)
    rig.part("limbs", g, IRON, finish="metal", outline=0.5)
    rig.joint("string", "head", (4, 0, 27))
    g = Geo()
    for s in (-1, 1):
        g.capsule((10, s * 21, 28), (4, 0, 27.5), 0.55)
    rig.part("string", g, ROPE, outline=0)
    rig.joint("bolt", "head", (4, 0, 28.5))
    g = Geo().capsule((4, 0, 28.5), (22, 0, 28.5), 1.0)
    g.lathe([(2.2, 0), (0.1, 5)], (22, 0, 28.5), (27, 0, 28.5), segs=8)
    rig.part("bolt", g, STEEL, finish="metal", outline=0.5)
    g = Geo().slab([(4.5, 28.5), (8.5, 28.5), (7.0, 31.4), (4.0, 31.0)], -0.4, 0.6)
    rig.part("bolt", g, PARCH, outline=0.4)
    # the windlass at the back of the stock: a spoked wheel with a crank handle
    rig.joint("windlass", "head", (-7.0, -4.0, 27.0))
    g = Geo()
    n = 10
    for k in range(n):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        g.capsule((-7 + 4.2 * math.cos(a0), -4.4, 27 + 4.2 * math.sin(a0)),
                  (-7 + 4.2 * math.cos(a1), -4.4, 27 + 4.2 * math.sin(a1)), 0.9, segs=8, rings=2)
    for k in range(4):
        a = math.pi * k / 2
        g.capsule((-7, -4.4, 27), (-7 + 4.0 * math.cos(a), -4.4, 27 + 4.0 * math.sin(a)), 0.6)
    rig.part("windlass", g, WOOD_DK, outline=0.4)
    g = Geo().capsule((-7, -4.4, 27), (-7, -7.6, 27), 1.0).capsule((-7, -7.6, 27), (-7, -7.6, 31.6), 0.8)
    g.capsule((-7, -7.6, 31.6), (-7, -10.4, 31.6), 1.1)
    rig.part("windlass", g, IRON, finish="metal", outline=0.4)


def crossbow_idle(f):
    # 6-frame loop: the crossbow tracks back and forth, the windlass ticks, the head bobs
    t = f / 6 * 2 * math.pi
    return {"head": {"r": 3.0 * math.sin(t), "z": 0.6 * math.sin(2 * t)},
            "windlass": {"r": [0, 0, -30, -30, -60, -60][f]}}


def crossbow_fire(f):
    # 0 the windlass cranks the string right back (the limbs bend in), 1 TWANG: the bolt is
    # gone, the limbs snap out and the head kicks, 2-3 the string vibrates, 4 a new bolt
    return {"string": {"x": [-4.5, 8, 5, -1.5, 0][f]}, "limbs": {"sy": [0.86, 1.12, 1.03, 0.99, 1.0][f]},
            "bolt": {"x": [-2, 0, 0, 0, 0][f], "hide": f in (1, 2, 3)},
            "windlass": {"r": [-140, -150, -150, -100, -40][f]},
            "head": {"x": [0.5, -3.5, -2, -1, 0][f], "r": [2, -3, -1, 0, 0][f]}}


CROSSBOW_OVERLAYS = {"fire": {
    1: [{"kind": "rings", "joint": "string", "point": (6, 0, 27.5), "radii_lu": (6.0, 10.0), "a0": 100.0,
         "a1": 260.0, "color": "#FFF4D6"},
        {"kind": "burst", "joint": "head", "point": (26, 0, 28.5), "r0_lu": 4.0, "r1_lu": 9.0, "n": 5,
         "a0": -60.0, "arc": 120.0}],
    2: [{"kind": "rings", "joint": "string", "point": (6, 0, 27.5), "radii_lu": (9.0,), "a0": 120.0,
         "a1": 240.0, "color": "#FFF4D6"}]}}


# -- Pitch Cauldron: a cauldron over a brazier that tips forward to pour -----------------------------
def cauldron_build(rig):
    castle_plinth(rig, r=16, h=9)
    g = Geo()
    for s in (-1, 1):
        g.capsule((s * 12, -8, 9), (s * 9, -8, 32), 1.8)
        g.capsule((s * 12, 8, 9), (s * 9, 8, 32), 1.8)
    g.capsule((-9, -8, 32), (9, -8, 32), 1.6)
    rig.part("mount", g, IRON, finish="metal", outline=0.6)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 14), 7, 9, bevel=0.6)
    rig.part("mount", g, STONE_DK)
    g = Geo()
    for x in (-6.0, -2.0, 2.0, 6.0):   # glowing coals
        g.sphere((x, -5.5, 14.0), 1.6, cuts=2)
    rig.part("mount", g, glow="#FFB870", outline=0.3)
    rig.joint("flame", "mount", (0, -2, 14))
    g = Geo().blob((0, -2, 17), (6, 5, 5), p=2.0, taper=(1.0, 0.3))
    rig.part("flame", g, glow=FIRE, outline=0)
    g = Geo().blob((0, -4, 16), (3, 2.4, 2.6), p=2.0, taper=(1.0, 0.3))
    rig.part("flame", g, glow=FIRE_CORE, outline=0)
    # head: the cauldron hangs from its pivot bar
    g = Geo().lathe([(0, 0), (6, 0.2), (10.5, 3), (12, 8), (11.5, 13), (12.8, 14), (12.5, 15.2), (10.5, 15), (0, 12)],
                    (0, 0, 18), (0, 0, 34), segs=20)
    rig.part("head", g, IRON, finish="metal")
    g = Geo()
    cyl(g, (0, 0, 25), (0, 0, 28), 12.2, bevel=0.4, segs=20)
    rig.part("head", g, team=True, outline=0.5)
    g = Geo()
    for a in range(-150, -20, 26):   # rivets on the team band
        r_ = math.radians(a)
        g.sphere((12.4 * math.cos(r_), 12.4 * math.sin(r_), 26.5), 0.9, cuts=2)
    rig.part("head", g, IRON, finish="metal", outline=0)
    g = Geo().blob((0, 0, 32.4), (10.2, 10.2, 1.6), p=2.2)
    rig.part("head", g, PITCH, finish="gloss", outline=0)
    g = Geo().capsule((0, -12, 30), (0, 12, 30), 1.4)
    rig.part("head", g, STEEL, finish="metal", outline=0.5)
    for i, (x, y) in enumerate(((-4.0, -3.0), (3.5, -5.0), (0.5, 1.0))):
        rig.joint(f"bub{i}", "head", (x, y, 33.4))
        g = Geo().sphere((x, y, 33.4), 1.8, cuts=2)
        rig.part(f"bub{i}", g, PITCH_LT, finish="gloss", outline=0.3)
    smoke_puff(rig, "head", (4, 0, 42), 1.0, name="steam")
    rig.joint("pour", "head", (11, 0, 33), hidden=True)
    g = Geo().capsule((13, -1, 33), (18, -1, 24), 2.6, 1.6)
    rig.part("pour", g, PITCH, finish="gloss", outline=0.5)
    for i, (x, z) in enumerate(((19.0, 19.0), (18.0, 13.0))):
        rig.joint(f"drip{i}", "pour", (x, -1, z))
        g = Geo().blob((x, -1, z), (1.4, 1.2, 2.0), p=2.0, taper=(1.0, 0.5))
        rig.part(f"drip{i}", g, PITCH, finish="gloss", outline=0.4)


def cauldron_idle(f):
    # 6-frame loop: the pitch bubbles (a bubble swells and pops in turn), steam rises, the
    # fire flickers, the cauldron sways a little on its chains
    t = f / 6 * 2 * math.pi
    out = {"head": {"r": 2.0 * math.sin(t)}, "steam": {"show": True, "s": 0.8 + 0.08 * f, "z": 1.6 * f},
           "flame": {"sz": 1.0 + 0.15 * math.sin(3 * t), "sx": 1.0 - 0.06 * math.sin(3 * t)}}
    for i in range(3):
        ph = (f + 2 * i) % 6
        out[f"bub{i}"] = {"s": [0.3, 0.7, 1.0, 1.25, 0.01, 0.01][ph]}
    return out


def cauldron_fire(f):
    # 0 rocks back (anticipation), 1 tips forward and pours, 2 pours hardest with drips falling,
    # 3-4 swings back
    out = {"head": {"r": [10, -38, -48, -22, -5][f], "sz": [0.94, 1.04, 1.0, 1.0, 1.0][f]},
           "pour": {"show": f in (1, 2)},
           "drip0": {"z": [0, 0, -4, 0, 0][f]}, "drip1": {"z": [0, -2, -7, 0, 0][f]},
           "flame": {"sz": [0.9, 1.3, 1.2, 1.05, 1.0][f]}}
    for i in range(3):
        out[f"bub{i}"] = {"s": 0.01 if f in (1, 2) else [0.8, 0, 0, 0.5, 0.9][f]}
    return out


# -- Trebuchet: a long throwing arm with a hinged counterweight and a sling ------------------------
def trebuchet_build(rig):
    castle_plinth(rig, r=17, h=7)
    g = Geo()
    for y in (-8, 8):
        g.capsule((-14, y, 7), (0, y, 36), 2.4, 2.0)
        g.capsule((14, y, 7), (0, y, 36), 2.4, 2.0)
    g.capsule((-14, -8, 8), (-14, 8, 8), 1.8).capsule((14, -8, 8), (14, 8, 8), 1.8)
    g.capsule((-7, -8, 21), (7, -8, 21), 1.5)
    rig.part("mount", g, WOOD)
    g = Geo()
    for x, z in ((-7, 21), (7, 21), (0, 36)):
        g.sphere((x, -9.8, z), 1.1, cuts=2)
    g.capsule((0, -10, 36), (0, 10, 36), 1.8)
    rig.part("mount", g, IRON, finish="metal", outline=0.5)
    rig.joint("arm", "head", (0, 0, 36))
    g = Geo().capsule((-16, 0, 36), (38, 0, 36), 2.8, 1.7)
    rig.part("arm", g, WOOD_DK)
    g = Geo()
    for x in (-8.0, 14.0, 28.0):
        g.lathe([(2.6, 0), (3.0, 0.4), (3.0, 1.4), (2.6, 1.8)], (x, 0, 36), (x + 1, 0, 36), segs=12)
    rig.part("arm", g, IRON, finish="metal", outline=0.4)
    # the counterweight box hangs on a hinge at the back end (it swings and stays upright)
    rig.joint("cw", "arm", (-16, 0, 36))
    g = Geo()
    box(g, (-17, 0, 27), (7.5, 6.5, 6.8), p=5)
    rig.part("cw", g, WOOD)
    g = Geo()
    box(g, (-17, 0, 30.5), (8.2, 7.2, 1.2), p=5)
    box(g, (-17, 0, 22.4), (8.2, 7.2, 1.2), p=5)
    g.capsule((-16, 0, 36), (-17, -6.6, 32), 0.9).capsule((-16, 0, 36), (-17, 6.6, 32), 0.9)
    rig.part("cw", g, IRON, finish="metal", outline=0.5)
    cwf = Geo()
    box(cwf, (-17, -6.8, 26.5), (5, 0.6, 3.2), p=4, cuts=2)
    rig.part("cw", cwf, team=True, outline=0.4)
    g = Geo()
    for x, z in ((-19.5, 25.0), (-15.0, 27.5), (-18.0, 28.5)):
        g.sphere((x, -5.0, z + 4.0), 2.4, cuts=2)
    rig.part("cw", g, STONE_DK, outline=0.4)
    # the sling at the tip: two ropes and a pouch with the stone (it hangs, then whips)
    rig.joint("sling", "arm", (38, 0, 36))
    g = Geo()
    rope(g, [(38, 0, 36), (40, -1, 29), (39.5, -1, 24)], 0.6)
    rig.part("sling", g, ROPE, outline=0)
    g = Geo().blob((39.5, -1, 22.0), (4.2, 3.0, 2.4), p=2.2)
    rig.part("sling", g, "#6B5647", outline=0.5)
    rig.joint("stone", "sling", (39, -1, 20))
    g = Geo().sphere((39, -1, 20), 5.0, cuts=3)
    rig.part("stone", g, STONE)
    g = Geo().blob((37.4, -4.6, 21.8), (1.6, 0.6, 1.2), p=2.0)
    rig.part("stone", g, STONE_LT, outline=0, highlight=False)


def trebuchet_idle(f):
    # 6-frame loop: the arm creaks, the counterweight swings on its hinge, the sling sways
    t = f / 6 * 2 * math.pi
    a = -18.0 + 2.0 * math.sin(t)
    return {"arm": {"r": a}, "cw": {"r": -a + 6.0 * math.sin(t - 1.0)},
            "sling": {"r": -a + 8.0 * math.sin(t - 1.6)}}


def trebuchet_fire(f):
    # 0 cranked down (the counterweight hauled up), 1 the counterweight drops, the arm flings
    # up and the sling WHIPS over the top (release), 2 overshoot, 3 swinging back, 4 reloaded
    a = [-28, 72, 98, 40, -8][f]
    return {"arm": {"r": a}, "cw": {"r": -a + [8, -30, -18, 20, 4][f]},
            "sling": {"r": [-a + 2, 150, 120, -a + 60, -a + 10][f]},
            "stone": {"hide": f in (1, 2, 3)}}


TREBUCHET_OVERLAYS = {"fire": {
    1: [{"kind": "arc", "joint": "arm", "inner": (22, 0, 36), "outer": (40, 0, 36), "color": "#8E7A62",
         "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.9, "lines": 3, "from": 0}]}}


# -- Honk Ballista: a big ballista loaded with an angry goose --------------------------------------
def honk_build(rig):
    castle_plinth(rig, r=16, h=9)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 18), 4, bevel=0.5)
    rig.part("mount", g, WOOD_DK)
    g = Geo()
    box(g, (4, 0, 21), (20, 4, 2.6), p=5)
    rig.part("head", g, WOOD)
    g = Geo()
    box(g, (-13, 0, 21), (5, 4.4, 4), p=5)
    rig.part("head", g, team=True)
    rig.joint("limbs", "head", (16, 0, 22))
    g = Geo()
    for s in (-1, 1):
        g.capsule((16, 0, 22), (9, s * 26, 25), 2.6, 1.6)
    rig.part("limbs", g, WOOD_DK)
    g = Geo()
    box(g, (16, 0, 22), (2.8, 4.4, 2.8), p=4, cuts=2)
    rig.part("limbs", g, GOLD, finish="metal", outline=0.5)
    rig.joint("string", "head", (0, 0, 24))
    g = Geo()
    for s in (-1, 1):
        g.capsule((9, s * 26, 25), (-2, 0, 24.5), 0.5)
    rig.part("string", g, ROPE, outline=0)
    # the goose, sitting in the groove, beak forward; a team harness and a tiny kettle hat
    rig.joint("goose", "head", (6, 0, 26))
    body = Geo().blob((4, 0, 28), (9, 6, 5.5), p=2.1, taper=(1.0, 0.9))
    rig.part("goose", body, GOOSE)
    g = Geo().lathe([(6.2, 0), (6.6, 0.4), (6.6, 2.2), (6.2, 2.6)], (3, 0, 25.5), (4, 0, 31.5), segs=16,
                    squash=(1.0, 1.0))
    rig.part("goose", g, team=True, outline=0.4)
    rig.joint("wing", "goose", (4, -5, 30))
    g = Geo().blob((0, -5.6, 29.5), (6.4, 1.8, 3.6), p=2.1, rot=(0, -14, 0))
    for k in range(3):
        g.lathe([(1.4, 0), (0, 3.0)], (-5.0 - k * 0.6, -5.8, 30.5 - k * 1.8), (-8.6 - k * 0.6, -6.0, 30.0 - k * 1.8), segs=6)
    rig.part("wing", g, GOOSE_DK)
    rig.joint("gneck", "goose", (11, 0, 30))
    head = Geo().capsule((11, 0, 30), (15, 0, 38), 2.6, 2.2)
    head.sphere((16, 0, 39.5), 3.8, cuts=3)
    gf = F.Face(rig, "gneck", [head])
    rig.part("gneck", head, GOOSE)
    g = Geo().lathe([(2.1, 0), (1.0, 3.5), (0.1, 5.6)], (18.8, 0, 39.4), (24.8, 0, 39.0), segs=10, squash=(0.8, 1.0))
    rig.part("gneck", g, BEAK, outline=0.5)
    rig.joint("gjaw", "gneck", (19.0, 0, 38.2))
    g = Geo().lathe([(1.6, 0), (0.8, 3.0), (0.1, 4.6)], (18.8, 0, 38.0), (23.6, 0, 37.2), segs=10, squash=(0.8, 1.0))
    rig.part("gjaw", g, "#C98A3C", outline=0.5)
    # eye (white, pupil on its own joint for the blink), an angry brow, a tiny kettle hat
    g = Geo()
    gf.decal(g, gf.hit(*K.scr(gf, (17.4, -3.4, 41.0))), F.ellipse(0, 0, 1.9, 2.2, 14), 0.4)
    rig.part("gneck", g, EYE, highlight=False, outline=0)
    rig.joint("gpupil", "gneck", (17.8, -3.8, 41.0))
    g = Geo()
    gf.decal(g, gf.hit(*K.scr(gf, (17.4, -3.4, 41.0))) - gf.view * 0.3, F.ellipse(0.5, -0.2, 1.0, 1.3, 10), 0.4)
    rig.part("gpupil", g, PUPIL, highlight=False, outline=0)
    rig.joint("glid", "gneck", (17.8, -3.8, 41.0), hidden=True)
    g = Geo()
    gf.decal(g, gf.hit(*K.scr(gf, (17.4, -3.4, 41.0))) - gf.view * 0.45, F.ellipse(0, 0, 2.1, 2.4, 14), 0.4)
    rig.part("glid", g, GOOSE_DK, highlight=False, outline=0)
    g = Geo()
    gf.stroke(g, gf.hit(*K.scr(gf, (17.0, -3.2, 43.4))) - gf.view * 0.5, [(-2.0, 1.0), (2.0, -0.6)], 1.2, 0.4)
    rig.part("gneck", g, PUPIL, highlight=False, outline=0)
    g = Geo().blob((15.4, 0, 42.2), (4.4, 4.2, 2.8), p=2.4)
    g.clip((0, 0, 41.8), (0, 0, -1))
    g.lathe([(0, -0.4), (5.8, -0.4), (6.2, 0.0), (5.8, 0.4), (0, 0.4)], (15.4, 0, 42.0), segs=18)
    rig.part("gneck", g, STEEL, finish="metal", outline=0.5)


def honk_idle(f):
    # 6-frame loop: breathing; the goose preens (the head dips to the wing, 2-3), ruffles the
    # wing, looks up, blinks on 5
    t = f / 6 * 2 * math.pi
    w = math.sin(t)
    return {"goose": {"sz": 1 + 0.03 * w},
            "gneck": {"r": [0, -10, -48, -44, 6, 0][f], "rz": [0, 0, -20, -16, 0, 0][f]},
            "wing": {"r": [0, 4, 14, 10, 0, 0][f], "rx": [0, 0, -10, -6, 0, 0][f]},
            "gjaw": {"r": [0, 0, -12, -6, 0, 0][f]},
            "glid": {"show": f == 5}, "gpupil": {"hide": f == 5}}


def honk_fire(f):
    # 0 the goose crouches, flaps and HONKS (beak wide) as the string is drawn, 1 launched
    # (gone), 2-3 the string vibrates, 4 a new goose hops in (small, popping up)
    return {"string": {"x": [-4, 12, 8, 2, 0][f]}, "limbs": {"sy": [0.9, 1.1, 1.03, 1.0, 1.0][f]},
            "goose": {"x": [-2, 18, 0, 0, 0][f], "hide": f in (1, 2, 3), "s": 0.55 if f == 4 else 1.0,
                      "sz": 0.88 if f == 0 else 1.0, "z": 3.0 if f == 4 else 0.0},
            "wing": {"r": 60 if f == 0 else 0, "rx": -30 if f == 0 else 0},
            "gneck": {"r": 14 if f == 0 else 0}, "gjaw": {"r": -32 if f == 0 else 0},
            "head": {"x": [0, -3, -2, -1, 0][f]}}


HONK_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "gneck", "point": (25, 0, 38.5), "radii_lu": (4.0, 7.5), "a0": -50.0,
         "a1": 50.0, "color": "#FFF4D6"}],
    1: [{"kind": "rings", "joint": "string", "point": (2, 0, 24.5), "radii_lu": (7.0, 12.0), "a0": 110.0,
         "a1": 250.0, "color": "#FFF4D6"},
        {"kind": "burst", "joint": "head", "point": (30, 0, 36), "r0_lu": 5.0, "r1_lu": 10.0, "n": 5,
         "a0": -60.0, "arc": 120.0}]}}


TURRETS = [
    turret_module("crossbow_nest", "Crossbow Nest", "medieval", 40, CANVAS, FEET, (0, 24), (24, 0, 28.5), crossbow_build,
                  crossbow_idle, crossbow_fire, fire_kind="recoil", idle_frames=6, overlays=CROSSBOW_OVERLAYS),
    turret_module("pitch_cauldron", "Pitch Cauldron", "medieval", 46, CANVAS, FEET, (0, 30), (16, -1, 28), cauldron_build,
                  cauldron_idle, cauldron_fire, aim=(0, 20), fire_kind="pour", idle_frames=6),
    turret_module("trebuchet", "Trebuchet", "medieval", 50, CANVAS, FEET, (0, 36), (39, -1, 20), trebuchet_build,
                  trebuchet_idle, trebuchet_fire, aim=(0, 0), fire_kind="swing", muzzle_joint="stone",
                  idle_frames=6, overlays=TREBUCHET_OVERLAYS),
    turret_module("honk_ballista", "Honk Ballista", "medieval", 46, CANVAS, FEET, (0, 21), (22, 0, 36), honk_build,
                  honk_idle, honk_fire, fire_kind="recoil", idle_frames=6, overlays=HONK_OVERLAYS),
]
