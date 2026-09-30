"""Gunpowder Age turrets (DESIGN A5.4, A14.2): Swivel Gun, Grapeshot Gun, Congreve Rack,
Chainshot Cannon.

Cartoon kit v2 (art director plan 2026-09-30): every turret stands on a Gunpowder fort plinth
(a sandstone gun platform with coursing lines, a timber deck, a team banner with a cream anchor,
a powder keg and a little pyramid of shot) instead of the shared plinth with a pennant, has a
6-frame idle loop with character, a readable anticipation in `fire` and 2D accents:

  Swivel Gun        idle: the gun swivels, scanning left and right on its post, the tiller
                    tassel swings; fire: it dips and tucks back (anticipation), BANG with a
                    kick up and back, a smoke puff, then it settles
  Grapeshot Gun     idle: it sways on its trunnions, the flared mouth breathing; fire: the
                    carriage crouches, then a WIDE flash with a spray of shot (impact lines in
                    a fan), a big kick and a cloud of smoke
  Congreve Rack     idle: the fuses smoulder (sparks flicker, a wisp rises); fire: the fuse of
                    the top rocket flares, then it launches with a flame burst at the back of
                    the rack and a trail of smoke, and a new rocket slides up
  Chainshot Cannon  idle: the chain between the twin barrels sways; fire: the barrels quiver,
                    then a double BOOM (two flashes) with the chain whipping out, a hop and smoke
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_gunpowder as KG
from ageborn_art import kit_medieval as K
from ageborn_art.geometry import Geo

from world.common import box, cyl, muzzle_flash, smoke_puff, turret_module

SAND = "#B8A88A"
SAND_LT = "#CABB9C"
SAND_DK = "#9A8C72"
WOOD = "#7A6652"
WOOD_DK = "#4A3B2E"
BRONZE = "#B09A76"
BRONZE_DK = "#8C7A5E"
IRON = "#3C3F45"
BRASS = "#C9A227"
GREEN = "#2E5E4E"
BORE = "#1E1C1C"
CREAM = "#EFE6CF"
ROCKET = "#8A7A66"
ROPE = "#C2AE86"
FIRE = "#FFD08A"
FIRE_CORE = "#FFF3D6"

CANVAS = (280, 220)
FEET = (100, 180)


def fort_plinth(rig, r=15.0, h=10.0):
    """Gunpowder gun platform: a battered sandstone block with coursing lines, a timber deck,
    a team banner with a cream anchor on the near face, a powder keg and a pyramid of shot."""
    d = r * 0.8
    blk = Geo()
    box(blk, (0, 2, h / 2), (r, d, h / 2), p=6, taper=(1.0, 0.9))
    pf = F.Face(rig, "mount", [blk])
    rig.part("mount", blk, SAND)
    g = Geo()
    box(g, (0, 2, h - 0.2), (r + 0.6, d + 0.6, 1.2), p=6)
    rig.part("mount", g, WOOD)                                 # timber deck
    g = Geo()
    for x in range(int(-r) + 3, int(r) - 1, 5):                # deck plank lines
        c = pf.hit(*K.scr(pf, (x, 2 - d, h - 0.2)))
        pf.stroke(g, c, [(0.0, 0.6), (0.0, -0.6)], 0.6, 0.3)
    rig.part("mount", g, WOOD_DK, highlight=False, outline=0)
    g = Geo()
    c = pf.hit(*K.scr(pf, (0.0, 2 - d, h * 0.45)))
    pf.stroke(g, c, [(-r + 1.5, 0.0), (r - 1.5, 0.0)], 0.7, 0.3)
    for x in (-8.0, 2.0, 11.0):
        c2 = pf.hit(*K.scr(pf, (x, 2 - d, h * 0.22)))
        pf.stroke(g, c2, [(0.0, -h * 0.2), (0.0, h * 0.2)], 0.7, 0.3)
    rig.part("mount", g, SAND_DK, highlight=False, outline=0)
    # the team banner on the near face with a cream anchor
    bx, by = -r * 0.45, 2 - d - 1.0
    g = Geo().capsule((bx - 5.5, by, h - 1.2), (bx + 5.5, by, h - 1.2), 0.8)
    rig.part("mount", g, BRASS, finish="metal", outline=0.5)
    ban = Geo().slab([(bx - 4.8, h - 1.6), (bx + 4.8, h - 1.6), (bx + 4.8, 0.8), (bx, 3.0), (bx - 4.8, 0.8)],
                     by, 0.9)
    bf = F.Face(rig, "mount", [ban])
    rig.part("mount", ban, team=True, outline=0.5)
    g = KG.anchor(bf, Geo(), K.scr(bf, (bx, by - 0.5, h * 0.5)), s=0.62, w=1.5)
    rig.part("mount", g, CREAM, highlight=False, outline=0)
    # a powder keg at the back and a pyramid of shot at the front corner
    g = Geo().lathe([(0, 0), (3.2, 0), (3.7, 3.4), (3.2, 6.8), (0, 6.8)], (-r + 4.0, d - 1.0, h), (-r + 4.0, d - 1.0, h + 6.8), segs=14)
    rig.part("mount", g, WOOD)
    g = Geo()
    for z in (h + 1.2, h + 5.6):
        g.lathe([(3.5, -0.5), (3.6, 0.5)], (-r + 4.0, d - 1.0, z), (-r + 4.0, d - 1.0, z + 1), segs=14)
    rig.part("mount", g, IRON, finish="metal", outline=0.3)
    g = Geo()
    for dx, dy, dz in ((0, 0, 1.6), (3.2, 0, 1.6), (1.6, 0, 4.2), (1.6, 2.6, 1.6)):
        g.sphere((r - 6.0 + dx, 2 - d + 4.0 + dy, h + dz), 1.7, cuts=3)
    rig.part("mount", g, IRON, finish="gloss", outline=0.4)


def barrel(rig, joint, x0, x1, z, r0, r1, color=BRONZE, dark=BRONZE_DK, y=0.0, rings=(0.1, 0.5, 0.92), knob=True):
    L = x1 - x0
    prof = [(0, -2.4), (1.6, -2.2), (1.4, -1.0), (r0, -0.6), (r0, 0.0), (r0 * 0.98, L * 0.3), (r1, L * 0.86),
            (r1 * 1.18, L * 0.9), (r1 * 1.2, L), (r1 * 0.7, L), (0, L)]
    if not knob:
        prof = prof[3:]
        prof.insert(0, (0, -0.6))
    g = Geo().lathe(prof, (x0, y, z), (x0 + 1, y, z), segs=20)
    rig.part(joint, g, color, finish="metal", outline_hex=dark)
    g = Geo()
    for t in rings:
        x = x0 + L * t
        rr = r0 + (r1 - r0) * t + 0.9
        g.lathe([(rr - 1.0, -0.8), (rr, -0.5), (rr, 0.5), (rr - 1.0, 0.8)], (x, y, z), (x + 1, y, z), segs=20)
    rig.part(joint, g, dark, finish="metal", outline=0.5)
    g = Geo().lathe([(0, -0.2), (r1 * 0.66, -0.2), (r1 * 0.66, 0.4), (0, 0.4)], (x1 + 0.1, y, z), (x1 + 1, y, z), segs=16)
    rig.part(joint, g, BORE, outline=0)


def recoil_idle(joint):
    """Shared 4-frame recoil idle (also used by turrets_modern)."""
    return lambda f: {joint: {"r": 0.8 * math.sin(f / 4 * 2 * math.pi)}}


def recoil_fire(joint, kick=4.0, lift=5.0):
    """Shared recoil fire (also used by turrets_modern)."""
    def fn(f):
        return {joint: {"x": [0.8, -kick, -kick * 0.7, -kick * 0.3, 0][f], "r": [0, lift, lift * 0.6, lift * 0.2, 0][f],
                        "sz": [1.0, 0.92, 1.03, 1.0, 1.0][f]},
                "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.1, 1.3, 1][f]}}
    return fn


def _burst(joint, point, r0=4.0, r1=9.0, n=5, a0=-60.0, arc=120.0):
    return {"kind": "burst", "joint": joint, "point": point, "r0_lu": r0, "r1_lu": r1, "n": n, "a0": a0,
            "arc": arc, "color": "#FFF4D6"}


# -- Swivel Gun: a small bronze gun on a swivel post with a wooden tiller --------------------------
def swivel_build(rig):
    fort_plinth(rig)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 20), 2.8, bevel=0.4)
    rig.part("mount", g, IRON, finish="metal", outline=0.6)
    g = Geo()
    cyl(g, (0, 0, 17.5), (0, 0, 19.5), 4.0, bevel=0.4)
    rig.part("mount", g, BRASS, finish="metal", outline=0.5)
    g = Geo()
    for s in (-1, 1):
        g.capsule((0, s * 4.6, 19), (0, s * 4.6, 25), 1.3)
    g.capsule((0, -4.6, 19), (0, 4.6, 19), 1.3)
    rig.part("head", g, IRON, finish="metal", outline=0.5)
    rig.joint("gun", "head", (0, 0, 24))
    barrel(rig, "gun", -8, 22, 24, 3.8, 2.8)
    g = Geo()
    for x in (-2.0, 12.0):                                    # brass bands
        g.lathe([(4.2, -0.6), (4.4, 0), (4.2, 0.6)], (x, 0, 24), (x + 1, 0, 24), segs=16)
    rig.part("gun", g, BRASS, finish="metal", outline=0.4)
    g = Geo().capsule((-8, 0, 24), (-19, 0, 21.5), 1.5, 1.2)
    rig.part("gun", g, WOOD, outline=0.5)
    g = Geo().blob((-3, -4.1, 24), (3.6, 0.8, 2.4), p=2.4)
    rig.part("gun", g, team=True, outline=0.4)
    rig.secondary("tassel", "gun", (-19.0, -1.6, 21.0), (-20.0, -1.8, 14.0), max_deg=20, gain=1.4)
    g = Geo().capsule((-19.0, -1.6, 21.0), (-19.4, -1.8, 17.6), 0.6).blob((-19.5, -1.8, 16.8), (1.3, 1.2, 1.9), p=2.2)
    rig.part("tassel", g, team=True, outline=0.4)
    muzzle_flash(rig, "gun", (23, 0, 24), 1.1)
    smoke_puff(rig, "gun", (27, 0, 25), 0.85)


def swivel_idle(f):
    t = f / 6 * 2 * math.pi
    return {"head": {"rz": 16.0 * math.sin(t)}, "gun": {"r": 1.5 * math.sin(2 * t)},
            "tassel": {"r": 10 * math.cos(t)}}


def swivel_fire(f):
    return {"gun": {"x": [1.4, -4.4, -3.0, -1.2, 0][f], "r": [-4, 7, 4, 1.5, 0][f],
                    "sz": [0.94, 1.06, 1.0, 1.0, 1.0][f], "sx": [1.04, 0.95, 1.0, 1.0, 1.0][f]},
            "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.15, 1.35, 1][f], "z": [0, 0, 1.0, 2.5, 0][f]},
            "tassel": {"r": [0, -20, 14, -6, 0][f]}}


SWIVEL_OVERLAYS = {"fire": {1: [_burst("gun", (26, 0, 24))]}}


# -- Grapeshot Gun: a stubby blunderbuss with a flared mouth on a green carriage -------------------
def grapeshot_build(rig):
    fort_plinth(rig, r=17, h=8)
    rig.joint("carr", "head", (0, 0, 8))
    g = Geo()
    for y in (-6, 6):
        g.slab([(-14, 8), (12, 8), (10, 22), (-2, 24), (-14, 14)], y, 3.0)
    rig.part("carr", g, GREEN)
    g = Geo()
    box(g, (-5, -7.8, 16), (6, 0.8, 2.2), p=4, cuts=2)
    rig.part("carr", g, team=True, outline=0.4)
    g = Geo()
    for x, z in ((6.0, 12.0), (-8.0, 12.0), (2.0, 18.0)):
        g.sphere((x, -7.8, z), 0.9, cuts=2)
    rig.part("carr", g, IRON, finish="metal", outline=0)
    g = Geo()
    for y in (-10, 10):
        cyl(g, (-2, y, 12), (-2, y * 1.3, 12), 5.5, bevel=0.6, segs=14)
    rig.part("carr", g, WOOD_DK)
    g = Geo()
    for y in (-13.6, 13.6):
        cyl(g, (-2, y, 12), (-2, y * 1.05, 12), 2.2, bevel=0.3, segs=10)
    rig.part("carr", g, BRASS, finish="metal", outline=0.4)
    rig.joint("gun", "carr", (0, 0, 24))
    barrel(rig, "gun", -8, 16, 24, 5.4, 6.2, color=IRON, dark="#2A2C30")
    g = Geo().lathe([(6.4, 0), (7.6, 2.0), (9.8, 5.0), (10.6, 6.4), (8.8, 6.6), (6.2, 3.0)],
                    (15, 0, 24), (16, 0, 24), segs=24)                   # the flared bell mouth
    rig.part("gun", g, BRONZE, finish="metal", outline_hex=BRONZE_DK)
    g = Geo().lathe([(0, -0.2), (8.2, -0.2), (8.2, 0.4), (0, 0.4)], (21.2, 0, 24), (22, 0, 24), segs=18)
    rig.part("gun", g, BORE, outline=0)
    muzzle_flash(rig, "gun", (22, 0, 24), 1.6)
    smoke_puff(rig, "gun", (28, 0, 25), 1.2)


def grapeshot_idle(f):
    t = f / 6 * 2 * math.pi
    return {"gun": {"r": 2.0 * math.sin(t), "s": 1.0 + 0.015 * math.cos(2 * t)},
            "carr": {"r": 0.8 * math.sin(t + 1.0)}}


def grapeshot_fire(f):
    return {"gun": {"x": [1.0, -5.5, -4.0, -1.5, 0][f], "r": [-3, 8, 5, 2, 0][f],
                    "sx": [1.05, 0.93, 1.02, 1.0, 1.0][f], "sz": [0.95, 1.08, 1.0, 1.0, 1.0][f]},
            "carr": {"sz": [0.94, 1.04, 1.0, 1.0, 1.0][f], "x": [0, -2.0, -1.5, -0.5, 0][f],
                     "z": [0, 1.0, 0, 0, 0][f]},
            "smoke": {"show": f in (1, 2, 3), "s": [1, 0.9, 1.25, 1.45, 1][f], "z": [0, 0, 1.5, 3, 0][f]}}


GRAPE_OVERLAYS = {"fire": {1: [_burst("gun", (24, 0, 24), r0=6.0, r1=14.0, n=9, a0=-55.0, arc=110.0)],
                           2: [_burst("gun", (28, 0, 24), r0=11.0, r1=16.0, n=6, a0=-45.0, arc=90.0)]}}


# -- Congreve Rack: a rack of rockets on a tripod ----------------------------------------------------
def congreve_build(rig):
    fort_plinth(rig, r=15, h=8)
    g = Geo()
    for dx, dy in ((-9, -6), (9, -6), (0, 8)):
        g.capsule((dx, dy, 8), (0, 0, 22), 1.5)
    rig.part("mount", g, WOOD_DK, outline=0.5)
    g = Geo()
    box(g, (2, 0, 24), (14, 6, 2.4), p=5)
    rig.part("head", g, WOOD)
    g = Geo()
    box(g, (-6, -6.4, 24), (5, 0.8, 2.6), p=4, cuts=2)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo()
    for x in (-8.0, 12.0):
        g.capsule((x, -6.6, 24.5), (x, -6.6, 33.0), 0.9)
    rig.part("head", g, IRON, finish="metal", outline=0.4)
    for i, (y, z) in enumerate(((-3.4, 27.8), (3.4, 27.8), (0, 32.0))):
        rig.joint(f"r{i}", "head", (0, y, z))
        g = Geo()
        cyl(g, (-10, y, z), (12, y, z), 2.4, bevel=0.3, segs=12)
        g.lathe([(2.4, 0), (0.1, 5.4)], (12, y, z), (17.4, y, z), segs=12)
        rig.part(f"r{i}", g, ROCKET, finish="metal", outline=0.5)
        g = Geo()
        cyl(g, (4, y, z), (6.4, y, z), 2.6, bevel=0.2, segs=12)
        cyl(g, (-9, y, z), (-7, y, z), 2.6, bevel=0.2, segs=12)
        rig.part(f"r{i}", g, CREAM, outline=0.3)
        g = Geo().capsule((-10, y, z), (-22, y, z - 3), 0.6)
        rig.part(f"r{i}", g, WOOD_DK, outline=0.3)
        rig.joint(f"fz{i}", f"r{i}", (-10.5, y - 1.0, z - 0.4))
        g = Geo().star((-11.0, y - 2.4, z - 0.4), 2.2, 0.9, 0.8, points=5)
        rig.part(f"fz{i}", g, glow=FIRE, outline=0)
    rig.joint("wisp", "head", (-12, -2, 30), hidden=True)
    g = Geo().sphere((-13, -3, 32), 1.6, cuts=3).sphere((-14.5, -3, 35.0), 1.3, cuts=3)
    rig.part("wisp", g, "#E9E6DE", finish="dust", outline=0.4)
    # the launch flame at the back of the rack
    rig.joint("flash", "head", (-12, 0, 32), hidden=True)
    g = Geo().blob((-18, -3, 32), (7.0, 2.4, 3.6), p=2.0)
    g.blob((-14, -3, 34.4), (4.4, 2.0, 2.2), p=2.0, rot=(0, 30, 0))
    g.blob((-14, -3, 29.6), (4.4, 2.0, 2.2), p=2.0, rot=(0, -30, 0))
    rig.part("flash", g, glow=FIRE, outline=0)
    g = Geo().blob((-14.5, -4, 32), (3.4, 1.6, 2.0), p=2.0)
    rig.part("flash", g, glow=FIRE_CORE, outline=0)
    smoke_puff(rig, "head", (-16, 0, 31), 1.1)


def congreve_idle(f):
    t = f / 6 * 2 * math.pi
    return {"head": {"r": 0.8 * math.sin(t)},
            "fz0": {"s": [0.6, 1.0, 0.7, 1.1, 0.5, 0.9][f], "r": 30 * f},
            "fz1": {"s": [1.0, 0.6, 1.1, 0.7, 0.9, 0.5][f], "r": -25 * f},
            "fz2": {"s": [0.8, 1.1, 0.5, 0.9, 1.2, 0.7][f], "r": 20 * f},
            "wisp": {"show": f in (1, 2, 3, 4), "z": [0, 0, 1.5, 3.0, 4.5, 0][f], "s": [1, 0.8, 1.0, 1.1, 1.2, 1][f]}}


def congreve_fire(f):
    return {"r2": {"x": [-1.0, 0, 0, 0, -4][f], "hide": f in (1, 2, 3), "s": [1, 1, 1, 1, 0.9][f]},
            "fz2": {"s": [2.2, 1, 1, 1, 0.6][f]},
            "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.2, 1.45, 1][f], "x": [0, 0, -4, -8, 0][f],
                      "z": [0, 0, 1, 2.5, 0][f]},
            "head": {"x": [0.6, -1.8, -1.2, -0.4, 0][f], "r": [-1.5, 3, 1.5, 0.5, 0][f]}}


CONGREVE_OVERLAYS = {"fire": {
    0: [_burst("r2", (-11, 0, 31.6), r0=2.5, r1=5.5, n=6, a0=0.0, arc=360.0)],
    1: [_burst("head", (-20, 0, 32), r0=4.0, r1=9.0, n=5, a0=120.0, arc=120.0)]}}


# -- Chainshot Cannon: twin barrels joined by a chain ------------------------------------------------
def chainshot_build(rig):
    fort_plinth(rig, r=17, h=8)
    rig.joint("carr", "head", (0, 0, 8))
    g = Geo()
    for y in (-7, 7):
        g.slab([(-14, 8), (10, 8), (8, 20), (-4, 22), (-14, 13)], y, 3.0)
    rig.part("carr", g, GREEN)
    g = Geo()
    box(g, (-4, -8.8, 15), (6, 0.8, 3.2), p=4, cuts=2)
    rig.part("carr", g, team=True, outline=0.4)
    g = Geo()
    for x, z in ((5.0, 11.0), (-9.0, 11.0), (-2.0, 17.0)):
        g.sphere((x, -8.8, z), 0.9, cuts=2)
    rig.part("carr", g, IRON, finish="metal", outline=0)
    rig.joint("gun", "carr", (0, 0, 23))
    barrel(rig, "gun", -8, 20, 21, 3.5, 2.9, y=-3.8)
    barrel(rig, "gun", -8, 20, 26.5, 3.5, 2.9, y=3.8, knob=False)
    g = Geo()
    box(g, (-6, 0, 23.5), (4, 7, 5), p=4)
    rig.part("gun", g, BRONZE_DK, finish="metal")
    # the chain draped between the two muzzles (a secondary: it sways and whips)
    rig.secondary("chain", "gun", (21.0, 0, 23.7), (21.0, 0, 15.0), max_deg=24, gain=1.5)
    g = Geo()
    for k in range(7):
        t = k / 6
        x = 22.5 + 2.0 * math.sin(math.pi * t)
        y = -3.8 + 7.6 * t
        z = 21.0 + 5.5 * t - 9.5 * math.sin(math.pi * t)
        axis = (0, 1, 0) if k % 2 == 0 else (0, 0, 1)
        g.lathe([(0.4, -1.6), (1.6, -1.1), (1.6, 1.1), (0.4, 1.6)], (x, y, z),
                (x + axis[0], y + axis[1], z + axis[2]), segs=8)
    rig.part("chain", g, IRON, finish="metal", outline=0.3)
    muzzle_flash(rig, "gun", (21, -3.8, 21.0), 1.1)
    muzzle_flash(rig, "gun", (21, 3.8, 26.5), 1.1, name="flash2")
    smoke_puff(rig, "gun", (26, 0, 24), 1.05)


def chainshot_idle(f):
    t = f / 6 * 2 * math.pi
    return {"gun": {"r": 1.2 * math.sin(t)}, "chain": {"r": 14 * math.sin(t + 0.8)},
            "carr": {"z": 0.3 * math.sin(2 * t)}}


def chainshot_fire(f):
    return {"gun": {"x": [0.8, -5.0, -3.5, -1.2, 0][f], "r": [-2, 6, 4, 1.5, 0][f],
                    "sz": [0.95, 1.05, 1.0, 1.0, 1.0][f]},
            "carr": {"z": [0, 2.0, 0.6, 0, 0][f], "r": [0, 3, 1, 0, 0][f]},
            "chain": {"hide": f in (1, 2), "r": [10, 0, 0, -25, 8][f]},
            "flash2": {"show": f == 1},
            "smoke": {"show": f in (1, 2, 3), "s": [1, 0.85, 1.2, 1.4, 1][f], "z": [0, 0, 1.2, 2.6, 0][f]}}


CHAIN_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "gun", "point": (8, 0, 23.7), "radii_lu": (8.0, 11.0), "a0": 60.0,
         "a1": 120.0, "color": "#FFE7B0"}],
    1: [_burst("gun", (25, 0, 23.7), r0=6.0, r1=12.0, n=7, a0=-70.0, arc=140.0)]}}


TURRETS = [
    turret_module("swivel_gun", "Swivel Gun", "gunpowder", 34, CANVAS, FEET, (0, 24), (23, 0, 24), swivel_build,
                  swivel_idle, swivel_fire, muzzle_joint="gun", idle_frames=6, overlays=SWIVEL_OVERLAYS),
    turret_module("grapeshot_gun", "Grapeshot Gun", "gunpowder", 34, CANVAS, FEET, (0, 18), (22, 0, 24), grapeshot_build,
                  grapeshot_idle, grapeshot_fire, muzzle_joint="gun", idle_frames=6, overlays=GRAPE_OVERLAYS),
    turret_module("congreve_rack", "Congreve Rack", "gunpowder", 38, CANVAS, FEET, (0, 24), (17, 0, 31.5),
                  congreve_build, congreve_idle, congreve_fire, fire_kind="launch", idle_frames=6,
                  overlays=CONGREVE_OVERLAYS),
    turret_module("chainshot_cannon", "Chainshot Cannon", "gunpowder", 36, CANVAS, FEET, (0, 18), (21, 0, 23.7),
                  chainshot_build, chainshot_idle, chainshot_fire, muzzle_joint="gun", idle_frames=6,
                  overlays=CHAIN_OVERLAYS),
]
