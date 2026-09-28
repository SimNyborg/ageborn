"""Modern Age turrets (DESIGN A5.5, A14.2): MG Nest, Flak Gun, Howitzer, Searchlight Sniper."""
import math

from ageborn_art.geometry import Geo

from world.common import box, cyl, muzzle_flash, pennant, smoke_puff, turret_module
from world.turrets_gunpowder import recoil_fire, recoil_idle

OLIVE = "#62664A"
OLIVE_LT = "#7C8060"
KHAKI = "#B8A67A"
GUNMETAL = "#3A3F45"
STEEL = "#8C949C"
CONCRETE = "#A29F96"
BORE = "#1E1C1C"
GLASS = "#E8F2EE"
LENS = "#FFF6D8"
SIGNAL = "#B0306A"

CANVAS = (300, 220)
FEET = (100, 180)


def sandbag_ring(rig, r=17.0, rows=2):
    g = Geo()
    for row in range(rows):
        n = 7
        for k in range(n):
            a = math.pi * (0.1 + 0.8 * k / (n - 1)) + (0.06 if row % 2 else 0)
            x, y = r * math.cos(a) * 0.9, -r * math.sin(a) * 0.55 + 2
            g.blob((x, y, 3 + row * 5), (5.4, 4.0, 3.0), p=2.6, rot=(0, 0, math.degrees(-a) + 90))
    g.blob((0, 6, 4), (r * 0.9, 6, 4), p=3)
    rig.part("mount", g, KHAKI, finish="hair")


def mg_build(rig):
    sandbag_ring(rig, r=19.0, rows=3)
    pennant(rig, "mount", -15, 6, 4, h=30, pole=STEEL, finial=STEEL)
    g = Geo()
    for dx, dy in ((-6, -5), (6, -5), (0, 6)):
        g.capsule((dx, dy, 8), (0, 0, 17), 0.9)
    rig.part("mount", g, GUNMETAL, finish="metal", outline=0.4)
    rig.joint("gun", "head", (0, 0, 18))
    g = Geo()
    box(g, (0, 0, 19), (7, 3, 3.2), p=5)
    rig.part("gun", g, GUNMETAL, finish="metal")
    g = Geo()
    cyl(g, (6, 0, 19.5), (24, 0, 19.5), 1.6, bevel=0.2, segs=12)
    cyl(g, (6, 0, 19.5), (15, 0, 19.5), 2.6, bevel=0.4, segs=12)
    rig.part("gun", g, STEEL, finish="metal", outline=0.5)
    g = Geo().capsule((-6, 0, 18.5), (-14, 0, 15.5), 2.0, 1.4)
    rig.part("gun", g, "#8A6E55", outline=0.5)
    g = Geo()
    box(g, (1, -4.8, 16), (4, 1.6, 3.4), p=5)
    rig.part("gun", g, OLIVE, outline=0.5)
    g = Geo()
    box(g, (-2, 3.4, 23), (6, 0.8, 4.4), p=5)
    rig.part("gun", g, team=True, outline=0.4)
    muzzle_flash(rig, "gun", (24, 0, 19.5), 0.8)
    smoke_puff(rig, "gun", (26, 0, 20), 0.5)


def mg_fire(f):
    return {"gun": {"x": [0, -2.0, -0.6, -1.8, 0][f], "z": [0, 0.5, 0, 0.4, 0][f]},
            "flash": {"show": f in (1, 3), "s": 1.0 if f == 1 else 0.8}, "smoke": {"show": f in (2, 3, 4)}}


def flak_build(rig):
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 6), 17, 15, bevel=1.0, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, CONCRETE)
    g = Geo()
    cyl(g, (0, 0, 6), (0, 0, 12), 9, 8, bevel=0.8, segs=20)
    rig.part("mount", g, OLIVE)
    pennant(rig, "mount", -15, 6, 5, h=30, pole=STEEL, finial=STEEL)
    g = Geo()
    box(g, (0, 0, 16), (9, 7, 4.5), p=5)
    rig.part("head", g, OLIVE_LT)
    g = Geo().slab([(-6, 12), (8, 12), (10, 26), (-4, 26)], -8, 1.4)
    rig.part("head", g, OLIVE)
    g = Geo().slab([(-5, 19), (9, 19), (9.4, 22.4), (-4.4, 22.4)], -9.2, 0.8)
    rig.part("head", g, team=True, outline=0.4)
    rig.joint("gun", "head", (0, 0, 20))
    for y in (-3, 3):
        g = Geo()
        cyl(g, (-4, y, 20), (30, y, 20), 1.6, bevel=0.2, segs=12)
        cyl(g, (-4, y, 20), (8, y, 20), 2.6, bevel=0.4, segs=12)
        cyl(g, (26, y, 20), (31, y, 20), 2.3, bevel=0.3, segs=12)
        rig.part("gun", g, GUNMETAL, finish="metal", outline=0.5)
    muzzle_flash(rig, "gun", (31, 0, 20), 1.0)
    smoke_puff(rig, "gun", (33, 0, 21), 0.7)


def howitzer_build(rig):
    g = Geo()
    box(g, (0, 2, 3), (18, 12, 3), p=6)
    rig.part("mount", g, CONCRETE)
    pennant(rig, "mount", -17, 7, 6, h=28, pole=STEEL, finial=STEEL)
    g = Geo()
    for y in (-9, 9):
        cyl(g, (-2, y, 9), (-2, y * 1.3, 9), 7, bevel=0.8, segs=16)
    rig.part("mount", g, "#34373C")
    g = Geo()
    for y in (-12, 12):
        cyl(g, (-2, y, 9), (-2, y * 1.02, 9), 3, bevel=0.3, segs=10)
    rig.part("mount", g, OLIVE, outline=0.4)
    # the gun shield (team) and the barrel
    g = Geo().slab([(4, 10), (8, 10), (9, 30), (4, 32)], -7, 1.6)
    rig.part("head", g, OLIVE)
    g = Geo().slab([(4.2, 22), (8.6, 22), (8.8, 26), (4.2, 26)], -8.4, 0.8)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo()
    box(g, (-2, 0, 16), (9, 6, 4.5), p=5)
    rig.part("head", g, OLIVE)
    rig.joint("gun", "head", (0, 0, 18))
    g = Geo()
    cyl(g, (-10, 0, 19), (6, 0, 19), 4.6, bevel=0.8, segs=16)
    rig.part("gun", g, OLIVE_LT, finish="metal")
    g = Geo()
    cyl(g, (6, 0, 19), (34, 0, 19), 2.8, 2.4, bevel=0.3, segs=16)
    cyl(g, (32, 0, 19), (37, 0, 19), 3.4, bevel=0.5, segs=16)
    rig.part("gun", g, GUNMETAL, finish="metal", outline=0.5)
    g = Geo().lathe([(0, -0.2), (2.0, -0.2), (2.0, 0.4), (0, 0.4)], (37.1, 0, 19), (38, 0, 19), segs=12)
    rig.part("gun", g, BORE, outline=0)
    muzzle_flash(rig, "gun", (38, 0, 19), 1.4)
    smoke_puff(rig, "gun", (40, 0, 20), 1.1)


def searchlight_build(rig):
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 5), 14, 12, bevel=1.0, segs=20, squash=(1.0, 0.8))
    rig.part("mount", g, CONCRETE)
    g = Geo()
    cyl(g, (0, 0, 5), (0, 0, 14), 3, bevel=0.4)
    rig.part("mount", g, STEEL, finish="metal", outline=0.5)
    pennant(rig, "mount", -13, 5, 4, h=30, pole=STEEL, finial=STEEL)
    # the searchlight drum with the rifle along its side
    g = Geo()
    cyl(g, (-8, 0, 20), (8, 0, 20), 7, 8, bevel=1.0, segs=20)
    rig.part("head", g, OLIVE)
    g = Geo()
    cyl(g, (-8, 0, 20.5), (-4, 0, 20.5), 7.3, bevel=0.5, segs=20)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo().lathe([(0, 0), (6.8, 0), (6.8, 0.5), (0, 1.2)], (8.2, 0, 20), (9.2, 0, 20), segs=20)
    rig.part("head", g, glow=LENS, outline=0.8, outline_hex=STEEL)
    g = Geo()
    cyl(g, (-6, -9, 15), (26, -9, 15), 1.1, bevel=0.2, segs=10)
    box(g, (-3, -9, 14.5), (6, 1.6, 2.2), p=5)
    cyl(g, (0, -9, 18), (8, -9, 18), 1.4, bevel=0.3, segs=10)
    rig.part("head", g, GUNMETAL, finish="metal", outline=0.5)
    g = Geo().blob((1, -9, 16), (1.2, 1.2, 1.2), p=2.0)
    rig.part("head", g, glow="#F2A0C8", outline=0)
    rig.joint("beam", "head", (9, 0, 20), hidden=True)
    g = Geo().lathe([(7, 0), (16, 40), (0.1, 40)], (9.5, 1, 20), (50, 1, 20), segs=16)
    rig.part("beam", g, glow="#FFF8E6", outline=0)
    muzzle_flash(rig, "head", (27, -9, 15), 0.8)


def searchlight_idle(f):
    return {"head": {"r": 2.0 * math.sin(f / 4 * 2 * math.pi)}}


def searchlight_fire(f):
    return {"head": {"x": [0, -2, -1, 0, 0][f]}, "beam": {"show": f in (0, 1)}}


TURRETS = [
    turret_module("mg_nest", "MG Nest", "modern", 30, CANVAS, FEET, (0, 18), (24, 0, 19.5), mg_build,
                  recoil_idle("gun"), mg_fire, muzzle_joint="gun"),
    turret_module("flak_gun", "Flak Gun", "modern", 38, CANVAS, FEET, (0, 16), (31, 0, 20), flak_build,
                  recoil_idle("gun"), recoil_fire("gun", 4.0, 3.0), muzzle_joint="gun", aim=(-70, 30)),
    turret_module("howitzer", "Howitzer", "modern", 36, CANVAS, FEET, (0, 16), (38, 0, 19), howitzer_build,
                  recoil_idle("gun"), recoil_fire("gun", 6.0, 6.0), muzzle_joint="gun", aim=(-40, 10)),
    turret_module("searchlight_sniper", "Searchlight Sniper", "modern", 34, CANVAS, FEET, (0, 18), (27, -9, 15),
                  searchlight_build, searchlight_idle, searchlight_fire),
]
