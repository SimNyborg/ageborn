"""Gunpowder Age turrets (DESIGN A5.4, A14.2): Swivel Gun, Grapeshot Gun, Congreve Rack,
Chainshot Cannon."""
import math

from ageborn_art.geometry import Geo

from world.common import box, cyl, muzzle_flash, pennant, smoke_puff, turret_module

SAND = "#B8A88A"
SAND_LT = "#CABB9C"
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

CANVAS = (280, 220)
FEET = (100, 180)


def gabion(rig, r=15.0, h=10.0):
    g = Geo()
    box(g, (0, 2, h / 2), (r, r * 0.8, h / 2), p=6, taper=(1.0, 0.92))
    rig.part("mount", g, SAND)
    g = Geo()
    box(g, (0, 2, h - 0.4), (r + 1, r * 0.8 + 1, 1.5), p=6)
    rig.part("mount", g, SAND_LT)


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


# -- Swivel Gun: a small bronze gun on a swivel post ---------------------------------------------------
def swivel_build(rig):
    gabion(rig)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 20), 2.6, bevel=0.4)
    rig.part("mount", g, IRON, finish="metal", outline=0.6)
    pennant(rig, "mount", -12, 6, 9, h=26)
    g = Geo()
    for s in (-1, 1):
        g.capsule((0, s * 4.5, 19), (0, s * 4.5, 25), 1.2)
    g.capsule((0, -4.5, 19), (0, 4.5, 19), 1.2)
    rig.part("head", g, IRON, finish="metal", outline=0.5)
    rig.joint("gun", "head", (0, 0, 24))
    barrel(rig, "gun", -8, 22, 24, 3.6, 2.6)
    g = Geo().capsule((-8, 0, 24), (-18, 0, 22), 1.3, 1.0)
    rig.part("gun", g, WOOD, outline=0.5)
    g = Geo().blob((-3, -3.9, 24), (3.4, 0.8, 2.2), p=2.4)
    rig.part("gun", g, team=True, outline=0.4)
    muzzle_flash(rig, "gun", (23, 0, 24), 0.9)
    smoke_puff(rig, "gun", (26, 0, 25), 0.7)


def recoil_idle(joint):
    return lambda f: {joint: {"r": 0.8 * math.sin(f / 4 * 2 * math.pi)}}


def recoil_fire(joint, kick=4.0, lift=5.0):
    def fn(f):
        return {joint: {"x": [0.8, -kick, -kick * 0.7, -kick * 0.3, 0][f], "r": [0, lift, lift * 0.6, lift * 0.2, 0][f],
                        "sz": [1.0, 0.92, 1.03, 1.0, 1.0][f]},
                "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.1, 1.3, 1][f]}}
    return fn


# -- Grapeshot Gun: a stubby wide-mouthed gun on a green carriage -------------------------------------
def grapeshot_build(rig):
    gabion(rig, r=17, h=8)
    pennant(rig, "mount", -15, 7, 8, h=28)
    g = Geo()
    for y in (-6, 6):
        g.slab([(-14, 8), (12, 8), (10, 22), (-2, 24), (-14, 14)], y, 3.0)
    rig.part("head", g, team=True)
    g = Geo()
    for y in (-10, 10):
        cyl(g, (-2, y, 12), (-2, y * 1.3, 12), 5.5, bevel=0.6, segs=14)
    rig.part("head", g, WOOD_DK)
    g = Geo()
    for y in (-13.6, 13.6):
        cyl(g, (-2, y, 12), (-2, y * 1.05, 12), 2.2, bevel=0.3, segs=10)
    rig.part("head", g, BRASS, finish="metal", outline=0.4)
    rig.joint("gun", "head", (0, 0, 24))
    barrel(rig, "gun", -8, 18, 24, 5.4, 6.6, color=IRON, dark="#2A2C30")
    g = Geo()
    cyl(g, (17, 0, 24), (21, 0, 24), 7.8, 8.6, bevel=0.6, segs=20)
    rig.part("gun", g, BRONZE, finish="metal")
    g = Geo().lathe([(0, -0.2), (6.2, -0.2), (6.2, 0.4), (0, 0.4)], (21.1, 0, 24), (22, 0, 24), segs=16)
    rig.part("gun", g, BORE, outline=0)
    muzzle_flash(rig, "gun", (22, 0, 24), 1.3)
    smoke_puff(rig, "gun", (26, 0, 25), 1.0)


# -- Congreve Rack: a rack of rockets on a tripod --------------------------------------------------------
def congreve_build(rig):
    gabion(rig, r=15, h=8)
    g = Geo()
    for dx, dy in ((-9, -6), (9, -6), (0, 8)):
        g.capsule((dx, dy, 8), (0, 0, 22), 1.4)
    rig.part("mount", g, WOOD_DK, outline=0.5)
    pennant(rig, "mount", -14, 7, 8, h=26)
    g = Geo()
    box(g, (2, 0, 24), (14, 6, 2.4), p=5, rot=(0, 0, 0))
    rig.part("head", g, WOOD)
    g = Geo()
    box(g, (-6, -6.4, 24), (5, 0.8, 2.6), p=4, cuts=2)
    rig.part("head", g, team=True, outline=0.4)
    for i, (y, z) in enumerate(((-3.2, 27.5), (3.2, 27.5), (0, 31.5))):
        rig.joint(f"r{i}", "head", (0, y, z))
        g = Geo()
        cyl(g, (-10, y, z), (12, y, z), 2.2, bevel=0.3, segs=12)
        g.lathe([(2.2, 0), (0.1, 5)], (12, y, z), (17, y, z), segs=12)
        rig.part(f"r{i}", g, ROCKET, finish="metal", outline=0.5)
        g = Geo().capsule((-10, y, z), (-22, y, z - 3), 0.6)
        rig.part(f"r{i}", g, WOOD_DK, outline=0.3)
        g = Geo()
        cyl(g, (4, y, z), (6, y, z), 2.4, bevel=0.2, segs=12)
        rig.part(f"r{i}", g, CREAM, outline=0.3)
    muzzle_flash(rig, "head", (-12, 0, 29), 1.0)
    smoke_puff(rig, "head", (-14, 0, 30), 1.0)


def congreve_idle(f):
    return {"head": {"r": 0.6 * math.sin(f / 4 * 2 * math.pi)}}


def congreve_fire(f):
    return {"r2": {"x": [0, 18, 0, 0, 0][f], "hide": f in (1, 2, 3)}, "flash": {"show": f == 1},
            "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.2, 1.4, 1][f], "x": [0, 0, -4, -8, 0][f]},
            "head": {"x": [0, -1.5, -1, 0, 0][f]}}


# -- Chainshot Cannon: twin barrels joined by a chain ----------------------------------------------------
def chainshot_build(rig):
    gabion(rig, r=17, h=8)
    pennant(rig, "mount", -15, 7, 8, h=28)
    g = Geo()
    for y in (-7, 7):
        g.slab([(-14, 8), (10, 8), (8, 20), (-4, 22), (-14, 13)], y, 3.0)
    rig.part("head", g, GREEN)
    g = Geo()
    box(g, (-4, -8.8, 15), (6, 0.8, 3.2), p=4, cuts=2)
    rig.part("head", g, team=True, outline=0.4)
    rig.joint("gun", "head", (0, 0, 23))
    barrel(rig, "gun", -8, 20, 21, 3.4, 2.8, y=-3.6)
    barrel(rig, "gun", -8, 20, 26.5, 3.4, 2.8, y=3.6, knob=False)
    g = Geo()
    box(g, (-6, 0, 23.5), (4, 7, 5), p=4)
    rig.part("gun", g, BRONZE_DK, finish="metal")
    g = Geo()
    for k in range(5):
        x = 21 + (k % 2) * 0.5
        g.lathe([(0.2, -1.2), (1.2, -0.8), (1.2, 0.8), (0.2, 1.2)], (x, -3.6 + k * 1.8, 23.6 + k * 0.4 - 0.8 * (k % 2)),
                (x, -3.6 + k * 1.8, 25), segs=8)
    rig.part("gun", g, IRON, finish="metal", outline=0.3)
    muzzle_flash(rig, "gun", (21, 0, 23.7), 1.1)
    smoke_puff(rig, "gun", (25, 0, 24), 0.9)


TURRETS = [
    turret_module("swivel_gun", "Swivel Gun", "gunpowder", 34, CANVAS, FEET, (0, 24), (23, 0, 24), swivel_build,
                  recoil_idle("gun"), recoil_fire("gun", 4.0, 5.0), muzzle_joint="gun"),
    turret_module("grapeshot_gun", "Grapeshot Gun", "gunpowder", 34, CANVAS, FEET, (0, 18), (22, 0, 24), grapeshot_build,
                  recoil_idle("gun"), recoil_fire("gun", 5.0, 6.0), muzzle_joint="gun"),
    turret_module("congreve_rack", "Congreve Rack", "gunpowder", 38, CANVAS, FEET, (0, 24), (17, 0, 31.5),
                  congreve_build, congreve_idle, congreve_fire, fire_kind="launch"),
    turret_module("chainshot_cannon", "Chainshot Cannon", "gunpowder", 36, CANVAS, FEET, (0, 18), (21, 0, 23.7),
                  chainshot_build, recoil_idle("gun"), recoil_fire("gun", 5.0, 5.0), muzzle_joint="gun"),
]
