"""Future Age turrets (DESIGN A5.6, A14.2): Pulse Laser, Arc Coil, Plasma Mortar, Gravity Well."""
import math

from ageborn_art.geometry import Geo

from world.common import box, cyl, pennant, smoke_puff, turret_module

CHARCOAL = "#23262E"
CHAR_LT = "#3A3F4A"
WHITE = "#E9EDF2"
TRIM = "#A9B1BD"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
MAGENTA = "#F03AA8"
MAGENTA_CORE = "#FFD6EE"
VOID = "#2A1E3A"

CANVAS = (280, 230)
FEET = (100, 185)


def pad(rig, r=15.0):
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 6), r, r - 2, bevel=1.2, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, CHARCOAL)
    g = Geo()
    cyl(g, (0, 0, 5.5), (0, 0, 7), r - 2.5, bevel=0.3, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, glow=MINT, outline=0)
    pennant(rig, "mount", -r + 2, 5, 5, h=30, pole=TRIM, finial=MINT)


def glow_flash(rig, joint, at, color=MINT, core=MINT_CORE, size=1.0, name="flash"):
    x, y, z = at
    rig.joint(name, joint, at, hidden=True)
    g = Geo().star((x + 3 * size, y - 3, z), 7 * size, 2.6 * size, 1.4, points=6)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x + 2 * size, y - 4, z), 3.2 * size, cuts=3)
    rig.part(name, g, glow=core, outline=0)


def pulse_build(rig):
    pad(rig)
    g = Geo()
    cyl(g, (0, 0, 6), (0, 0, 14), 5, 4, bevel=0.5)
    rig.part("mount", g, TRIM, finish="metal", outline=0.5)
    g = Geo().blob((0, 0, 20), (11, 9, 7), p=2.4, taper=(1.0, 0.8))
    rig.part("head", g, WHITE, finish="gloss")
    g = Geo().blob((-2, -7.5, 21), (6, 1.6, 3.4), p=2.4)
    rig.part("head", g, team=True, outline=0.4)
    rig.joint("gun", "head", (0, 0, 21))
    g = Geo()
    cyl(g, (4, 0, 21), (24, 0, 21), 3.0, 2.2, bevel=0.4, segs=16)
    rig.part("gun", g, CHAR_LT, finish="metal", outline=0.5)
    g = Geo()
    for x in (10, 16):
        cyl(g, (x, 0, 21), (x + 1.2, 0, 21), 3.4, bevel=0.2, segs=16)
    rig.part("gun", g, glow=MAGENTA, outline=0)
    g = Geo().sphere((24.5, 0, 21), 2.4, cuts=3)
    rig.part("gun", g, glow=MAGENTA_CORE, outline=0.6, outline_hex=MAGENTA)
    glow_flash(rig, "gun", (25, 0, 21), MAGENTA, MAGENTA_CORE, 1.0)


def arc_build(rig):
    pad(rig, 14)
    g = Geo()
    cyl(g, (0, 0, 6), (0, 0, 34), 4.2, 3.0, bevel=0.5, segs=16)
    rig.part("mount", g, CHAR_LT, finish="metal")
    g = Geo()
    for z, r in ((12, 9), (19, 8), (26, 7)):
        cyl(g, (0, 0, z - 1.4), (0, 0, z + 1.4), r, bevel=0.6, segs=20)
    rig.part("mount", g, TRIM, finish="metal", outline=0.5)
    g = Geo()
    cyl(g, (0, 0, 15.2), (0, 0, 16.2), 8.8, bevel=0.2, segs=20)
    rig.part("mount", g, team=True, outline=0.3)
    # head: the orb on top (no aim), with sparks
    g = Geo().sphere((0, 0, 41), 8.4, cuts=4)
    rig.part("head", g, glow=MINT, outline=0.8, outline_hex="#1E8A66")
    g = Geo().sphere((-2, -5.5, 43), 3.8, cuts=3)
    rig.part("head", g, glow=MINT_CORE, outline=0)
    for i in range(3):
        rig.joint(f"spark{i}", "head", (0, 0, 40), hidden=True)
        a = math.radians(30 + i * 120)
        pts = [(0, -2, 40)]
        for k in range(1, 4):
            pts.append((math.cos(a) * 5 * k + (k % 2) * 2, -2, 40 + math.sin(a) * 5 * k - (k % 2) * 2))
        g = Geo()
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.8)
        rig.part(f"spark{i}", g, glow=MINT_CORE, outline=0.4, outline_hex=MINT)


def arc_idle(f):
    return {"head": {"s": 1 + 0.05 * math.sin(f / 4 * 2 * math.pi)}, f"spark{f % 3}": {"show": True}}


def arc_fire(f):
    return {"head": {"s": [0.85, 1.25, 1.1, 1.0, 1.0][f]}, "spark0": {"show": f in (1, 2)}, "spark1": {"show": f in (1, 3)},
            "spark2": {"show": f in (1, 2)}}


def mortar_build(rig):
    pad(rig, 16)
    g = Geo()
    box(g, (0, 0, 10), (9, 7, 4), p=5)
    rig.part("mount", g, CHAR_LT)
    rig.joint("gun", "head", (0, 0, 14))
    g = Geo()
    cyl(g, (-2, 0, 12), (6, 0, 32), 7.5, 6.4, bevel=1.0, segs=20)
    rig.part("gun", g, WHITE, finish="gloss")
    g = Geo()
    cyl(g, (3.6, 0, 25), (4.4, 0, 27), 7.1, bevel=0.2, segs=20)
    rig.part("gun", g, team=True, outline=0.4)
    g = Geo()
    cyl(g, (0.4, 0, 18), (1.2, 0, 20), 7.6, bevel=0.2, segs=20)
    rig.part("gun", g, glow=MINT, outline=0)
    g = Geo().blob((6.2, 0, 32.4), (5, 5, 1.2), p=2.0, rot=(0, -22, 0))
    rig.part("gun", g, glow=MINT_CORE, outline=0.6, outline_hex=MINT)
    glow_flash(rig, "gun", (7, 0, 34), MINT, MINT_CORE, 1.2)
    smoke_puff(rig, "gun", (8, 0, 37), 0.6)


def mortar_fire(f):
    return {"gun": {"sz": [1.0, 0.82, 1.08, 1.0, 1.0][f], "z": [0, -2, 1, 0, 0][f]}, "smoke": {"show": f in (2, 3)}}


def gravity_build(rig):
    pad(rig, 15)
    g = Geo()
    for s in (-1, 1):
        g.capsule((s * 8, 0, 6), (s * 10, 0, 24), 1.8, 1.2)
    rig.part("mount", g, TRIM, finish="metal", outline=0.5)
    # head: a floating ring with a dark orb inside
    g = Geo()
    for i in range(20):
        a0, a1 = 2 * math.pi * i / 20, 2 * math.pi * (i + 1) / 20
        g.capsule((10 * math.cos(a0) * 0.35, 10 * math.sin(a0) * 0.2, 32 + 10 * math.sin(a0)),
                  (10 * math.cos(a1) * 0.35, 10 * math.sin(a1) * 0.2, 32 + 10 * math.sin(a1)), 2.2)
    rig.part("head", g, CHAR_LT, finish="metal")
    g = Geo()
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        g.blob((3.6 * math.cos(a), -1, 32 + 10.4 * math.sin(a)), (1.2, 1.2, 1.4), p=2.0)
    rig.part("head", g, glow=MAGENTA, outline=0)
    g = Geo()
    for i in range(20):
        a0, a1 = 2 * math.pi * i / 20, 2 * math.pi * (i + 1) / 20
        g.capsule((10 * math.cos(a0) * 0.35, 10 * math.sin(a0) * 0.2 - 1, 32 + 10 * math.sin(a0)),
                  (10 * math.cos(a1) * 0.35, 10 * math.sin(a1) * 0.2 - 1, 32 + 10 * math.sin(a1)), 0.9) if i < 6 else None
    rig.part("head", g, team=True, outline=0.3)
    rig.joint("orb", "head", (0, 0, 32))
    g = Geo().sphere((0, 0, 32), 6.0, cuts=4)
    rig.part("orb", g, VOID, finish="gloss", outline=0.8, outline_hex=MAGENTA)
    g = Geo().blob((-2, -5, 34), (2, 0.8, 1.4), p=2.0)
    rig.part("orb", g, glow=MAGENTA_CORE, outline=0)


def gravity_idle(f):
    w = math.sin(f / 4 * 2 * math.pi)
    return {"head": {"z": 1.5 * w, "rz": 8 * w}, "orb": {"s": 1 + 0.06 * w}}


def gravity_fire(f):
    return {"orb": {"s": [0.7, 1.3, 0.2, 0.6, 0.9][f], "x": [0, 4, 8, 0, 0][f], "hide": f == 2},
            "head": {"sz": [1.05, 0.92, 1.02, 1.0, 1.0][f]}}


TURRETS = [
    turret_module("pulse_laser", "Pulse Laser", "future", 30, CANVAS, FEET, (0, 20), (25, 0, 21), pulse_build,
                  lambda f: {"gun": {"r": 0.8 * math.sin(f / 4 * 2 * math.pi)}},
                  lambda f: {"gun": {"x": [0, -2.5, -1.5, -0.5, 0][f]}}, muzzle_joint="gun", fire_kind="beam"),
    turret_module("arc_coil", "Arc Coil", "future", 48, CANVAS, FEET, (0, 40), (0, 0, 40), arc_build, arc_idle, arc_fire,
                  aim=(0, 0), fire_kind="arc"),
    turret_module("plasma_mortar", "Plasma Mortar", "future", 36, CANVAS, FEET, (0, 14), (7, 0, 34), mortar_build,
                  lambda f: {"gun": {"sz": 1 + 0.02 * math.sin(f / 4 * 2 * math.pi)}}, mortar_fire, aim=(0, 0),
                  muzzle_joint="gun"),
    turret_module("gravity_well", "Gravity Well", "future", 44, CANVAS, FEET, (0, 32), (0, 0, 32), gravity_build,
                  gravity_idle, gravity_fire, aim=(0, 0), fire_kind="orb", muzzle_joint="orb"),
]
