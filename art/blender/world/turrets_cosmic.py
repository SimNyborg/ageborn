"""Cosmic Age turrets (docs/design-lane-ages.md A17.11, A17.12): Ion Turret, Starburst Gun, Starfall
Battery, Tachyon Lance. The turret contract is common.turret_module (mount, idle, fire, build,
destroyed); palette as the Cosmic units (ageborn_art.rigs_cosmic): void, nebula violet, star
white, mint energy; team colour on the pad pennant and head bands.
"""
import math

from ageborn_art import rigs_cosmic as K
from ageborn_art.geometry import Geo

from world.common import box, cyl, pennant, smoke_puff, turret_module

CANVAS = (280, 230)
FEET = (100, 185)


def pad(rig, r=15.0):
    """A void hover pad with a mint glow ring, star-white rim and the team pennant."""
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 6), r, r - 2, bevel=1.2, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, K.VOID_LT, finish="gloss")
    g = Geo()
    cyl(g, (0, 0, 5.2), (0, 0, 7.2), r - 1.6, r - 2.4, bevel=0.5, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    cyl(g, (0, 0, 2.0), (0, 0, 3.4), r + 0.4, bevel=0.3, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, glow=K.MINT, outline=0)
    pennant(rig, "mount", -r + 2, 5, 5, h=30, pole=K.STAR_TRIM, finial=K.MINT)


def glow_flash(rig, joint, at, color=K.MINT, core=K.MINT_CORE, size=1.0, name="flash", points=6):
    x, y, z = at
    rig.joint(name, joint, at, hidden=True)
    g = Geo().star((x + 3 * size, y - 3, z), 7.5 * size, 2.8 * size, 1.4, points=points)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x + 2 * size, y - 4, z), 3.2 * size, cuts=3)
    rig.part(name, g, glow=core, outline=0)


# -- Ion Turret: a compact emitter (instant beam, fast) -----------------------------------------
def ion_build(rig):
    pad(rig)
    g = Geo()
    cyl(g, (0, 0, 7), (0, 0, 14), 5.5, 4.2, bevel=0.6)
    rig.part("mount", g, K.VIOLET_DK, finish="gloss")
    g = Geo().blob((0, 0, 20), (10.5, 9.0, 7.0), p=2.4, taper=(1.0, 0.82))
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().blob((-1.0, 0, 20.0), (10.8, 9.3, 2.0), p=2.8)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo().blob((-2.0, -5.0, 25.0), (3.4, 2.0, 1.8), p=2.4)
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    rig.joint("gun", "head", (0, 0, 21))
    g = Geo()
    cyl(g, (6, 0, 21), (20, 0, 21), 3.0, 2.4, bevel=0.4, segs=16)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    for x in (10.5, 14.5):
        cyl(g, (x, 0, 21), (x + 1.2, 0, 21), 3.5, bevel=0.2, segs=16)
    rig.part("gun", g, glow=K.MINT, outline=0.6, outline_hex=K.VOID)
    g = Geo().lathe([(0, 0), (3.4, 0.2), (4.2, 2.2), (3.0, 3.4), (0, 3.4)], (19, 0, 21), (22.4, 0, 21), segs=16)
    rig.part("gun", g, K.VOID_LT, finish="gloss")
    g = Geo().sphere((22.6, 0, 21), 2.2, cuts=3)
    rig.part("gun", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)
    glow_flash(rig, "gun", (23, 0, 21), size=1.0)


def ion_idle(f):
    w = math.sin(f / 4 * 2 * math.pi)
    return {"gun": {"r": 0.8 * w}}


def ion_fire(f):
    return {"gun": {"x": [0, -2.2, -1.2, -0.4, 0][f]}, "head": {"sz": [1.0, 0.95, 1.02, 1.0, 1.0][f]}}


# -- Starburst Gun: a fan-barrelled blaster --------------------------------------------------
FAN = (14.0, 0.0, -14.0)


def starburst_build(rig):
    pad(rig, 16)
    g = Geo()
    box(g, (0, 0, 10), (9, 7.5, 4), p=5)
    rig.part("mount", g, K.VOID_LT, finish="gloss")
    g = Geo().blob((-1, 0, 20), (11, 10, 8), p=2.8, taper=(1.05, 0.85))
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((-2, 0, 21), (11.3, 10.3, 2.4), p=3.0)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo().blob((-9, 0, 24), (4.4, 8.6, 4.6), p=3.2)
    rig.part("head", g, team=True)
    rig.joint("gun", "head", (4, 0, 20))
    for i, a in enumerate(FAN):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        p0 = (6.0, -1.0 + (i - 1) * 0.2, 20.0)
        p1 = (6.0 + 17.0 * c, -1.0, 20.0 + 17.0 * s)
        g = Geo()
        cyl(g, p0, p1, 2.3, 2.0, bevel=0.3, segs=12)
        rig.part("gun", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
        g = Geo()
        cyl(g, (p1[0] - 2.5 * c, -1.0, p1[2] - 2.5 * s), (p1[0] + 0.6 * c, -1.0, p1[2] + 0.6 * s), 2.9, bevel=0.3,
            segs=12)
        rig.part("gun", g, glow=K.VIOLET_GLOW, outline=0.6, outline_hex=K.VIOLET)
    g = Geo().blob((7, -1, 20), (4.4, 4.4, 5.6), p=2.6)
    rig.part("gun", g, K.VOID_LT, finish="gloss")
    g = Geo().sphere((8.5, -4.6, 20), 1.6, cuts=3)
    rig.part("gun", g, glow=K.MINT, outline=0)
    # the flash: three stars at the fan's mouths
    rig.joint("flash", "gun", (24, 0, 20), hidden=True)
    for a in FAN:
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        x, z = 6.0 + 20.0 * c, 20.0 + 20.0 * s
        g = Geo().star((x + 2, -4, z), 6.0, 2.2, 1.2, points=5)
        rig.part("flash", g, glow=K.VIOLET_GLOW, outline=0)
        g = Geo().sphere((x + 1, -5, z), 2.2, cuts=3)
        rig.part("flash", g, glow=K.VIOLET_CORE, outline=0)


def starburst_fire(f):
    return {"gun": {"x": [0, -3.0, -1.8, -0.6, 0][f], "sz": [1.0, 1.08, 1.02, 1.0, 1.0][f]},
            "head": {"r": [0, 3, 1.5, 0.5, 0][f]}}


# -- Starfall Battery: a shard launcher on a dish (arc) -----------------------------------------
SHARD = (4.0, 0.0, 27.0)


def starfall_build(rig):
    pad(rig, 17)
    g = Geo()
    cyl(g, (0, 0, 6), (0, 0, 12), 7.0, 5.0, bevel=0.8)
    rig.part("mount", g, K.VIOLET_DK, finish="gloss")
    # the dish (tilted up and forward)
    rig.joint("gun", "head", (0, 0, 14))
    g = Geo().lathe([(0, 0), (6.0, 0.4), (13.0, 3.0), (16.0, 6.4), (15.0, 7.2), (12.0, 4.6), (5.0, 2.0), (0, 1.6)],
                    (0, 0, 12.5), (1.6, 0, 16.5), segs=28)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().lathe([(14.6, 6.0), (16.4, 6.6), (16.2, 7.6), (14.6, 7.2)], (0, 0, 12.5), (1.6, 0, 16.5), segs=28)
    rig.part("gun", g, team=True, outline=0.4)
    g = Geo().lathe([(0, 1.2), (8.0, 2.4), (9.0, 3.4), (0, 2.6)], (0, 0, 12.5), (1.6, 0, 16.5), segs=24)
    rig.part("gun", g, glow=K.MINT, outline=0)
    # the shard: a violet crystal on the cradle
    rig.joint("shard", "gun", SHARD)
    sx, sy, sz = SHARD
    g = Geo().lathe([(0, -7.0), (3.6, -2.0), (3.2, 5.0), (0, 10.0)], (sx, sy, sz - 1), (sx + 2.2, sy, sz + 5), segs=6)
    rig.part("shard", g, glow=K.VIOLET_GLOW, outline=1.0, outline_hex=K.VIOLET)
    g = Geo().lathe([(0, -4.0), (1.4, -1.0), (1.2, 4.0), (0, 6.0)], (sx - 0.6, sy - 2.4, sz), (sx + 1.6, sy - 2.4, sz + 6),
                    segs=6)
    rig.part("shard", g, glow=K.VIOLET_CORE, outline=0)
    g = Geo()
    for a in (-40, 40, 180):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((sx + 7 * c, sy + 7 * s * 0.8, 17.0), (sx + 3.4 * c, sy + 3.4 * s * 0.8, sz - 3.0), 1.1, 0.8)
    rig.part("gun", g, K.STAR_TRIM, finish="metal", outline=0.5)
    glow_flash(rig, "gun", (sx + 2, sy, sz + 8), K.VIOLET_GLOW, K.VIOLET_CORE, 1.3)
    smoke_puff(rig, "gun", (sx, sy, sz + 2), 0.6)


def starfall_idle(f):
    w = math.sin(f / 4 * 2 * math.pi)
    return {"shard": {"z": 1.2 * w, "rz": 20 * f}, "gun": {"sz": 1 + 0.015 * w}}


def starfall_fire(f):
    return {"gun": {"sz": [1.0, 0.84, 1.06, 1.0, 1.0][f], "z": [0, -1.8, 0.8, 0, 0][f]},
            "shard": {"hide": f in (1, 2), "s": [1.0, 1.0, 1.0, 0.5, 0.9][f], "z": [2, 0, 0, -3, 0][f]},
            "smoke": {"show": f in (2, 3)}}


# -- Tachyon Lance: a long prism barrel (instant, pierce) ------------------------------------------
def tachyon_build(rig):
    pad(rig, 15)
    g = Geo()
    for s in (-1, 1):
        g.capsule((s * 7.5, 0, 6), (s * 5.0, 0, 20), 2.0, 1.4)
    rig.part("mount", g, K.STAR_TRIM, finish="metal", outline=0.5)
    g = Geo()
    cyl(g, (0, -6, 20), (0, 6, 20), 3.4, bevel=0.5, segs=16)
    rig.part("mount", g, K.VOID_LT, finish="gloss")
    # gimbal and prism barrel
    g = Geo().blob((0, 0, 21), (8.5, 6.5, 5.4), p=3.0)
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().blob((-1, 0, 21), (8.8, 6.8, 1.8), p=3.0)
    rig.part("head", g, team=True, outline=0.4)
    rig.joint("gun", "head", (0, 0, 21))
    g = Geo().lathe([(0, 0), (4.4, 0.6), (4.0, 24.0), (2.4, 34.0), (0, 36.0)], (4, 0, 21), (40, 0, 21), segs=6)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().lathe([(0, 0), (2.2, 0.6), (2.0, 24.0), (0, 30.0)], (6, -2.6, 22.0), (38, -2.6, 22.0), segs=6)
    rig.part("gun", g, glow=K.VIOLET_GLOW, outline=0)
    g = Geo()
    for x in (12.0, 22.0):
        cyl(g, (x, 0, 21), (x + 1.4, 0, 21), 4.8, bevel=0.3, segs=6)
    rig.part("gun", g, K.VOID_LT, finish="gloss")
    g = Geo().sphere((40.5, 0, 21), 2.0, cuts=3)
    rig.part("gun", g, glow=K.VIOLET_CORE, outline=0.6, outline_hex=K.VIOLET)
    g = Geo().blob((-8, 0, 23), (5.0, 5.4, 4.6), p=3.0)
    rig.part("gun", g, team=True)
    g = Geo().lathe([(0, -2.6), (4.9, -2.4), (4.9, 2.4), (0, 2.6)], (17.0, 0, 21), (18.0, 0, 21), segs=6)
    rig.part("gun", g, team=True, outline=0.4)
    g = Geo().blob((-12.2, -1.6, 23), (0.8, 2.6, 2.4), p=2.4)
    rig.part("gun", g, glow=K.MINT, outline=0)
    glow_flash(rig, "gun", (41, 0, 21), K.VIOLET_GLOW, K.VIOLET_CORE, 1.2, points=4)


def tachyon_idle(f):
    w = math.sin(f / 4 * 2 * math.pi)
    return {"gun": {"r": 0.6 * w}}


def tachyon_fire(f):
    return {"gun": {"x": [0, -4.0, -2.4, -0.8, 0][f], "sz": [1.0, 1.1, 1.03, 1.0, 1.0][f]},
            "head": {"r": [0, 2, 1, 0.3, 0][f]}}


TURRETS = [
    turret_module("ion_turret", "Ion Turret", "cosmic", 30, CANVAS, FEET, (0, 20), (23, 0, 21), ion_build,
                  ion_idle, ion_fire, muzzle_joint="gun", fire_kind="beam"),
    turret_module("starburst_gun", "Starburst Gun", "cosmic", 34, CANVAS, FEET, (0, 20), (26, -1, 20),
                  starburst_build, lambda f: {"gun": {"r": 0.8 * math.sin(f / 4 * 2 * math.pi)}}, starburst_fire,
                  muzzle_joint="gun"),
    turret_module("starfall_battery", "Starfall Battery", "cosmic", 38, CANVAS, FEET, (0, 14),
                  (SHARD[0] + 2, 0, SHARD[2] + 8), starfall_build, starfall_idle, starfall_fire, aim=(0, 0),
                  muzzle_joint="gun"),
    turret_module("tachyon_lance", "Tachyon Lance", "cosmic", 30, (300, 230), FEET, (0, 21), (41, 0, 21),
                  tachyon_build, tachyon_idle, tachyon_fire, muzzle_joint="gun", fire_kind="beam"),
]
