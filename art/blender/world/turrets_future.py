"""Future Age turrets (DESIGN A5.6, A14.2): Pulse Laser, Arc Coil, Plasma Mortar, Gravity Well.

Same contract as the other ages (common.turret_module): a static `mount` frame and a rotating head
(`idle`, `fire` with a per-frame muzzle anchor), plus `build` and `destroyed`. Cartoon kit v2 (art
director plan 2026-09-30): every turret stands on the Future hover plinth (a charcoal hex foot, a
mint hover gap, a team hex deck with corner running lights and a holo pennant), has a 6-frame idle
with character and an anticipation pose before its one-frame flash.

  Pulse Laser    a white sensor pod with a mint robot eye and an iris lens: the iris breathes and
                 the eye blinks; on fire the pod pulls back, the iris opens wide (a charge ring),
                 then the flash, a recoil and a heat vent
  Arc Coil       three rings with running lights spin up the mast under a sparking orb; on fire the
                 orb shrinks as the rings flare, then it bursts into arcs
  Plasma Mortar  a white tube with a pulsing glow band and a plasma glob in its mouth; on fire it
                 squashes, then stretches and lobs the glob with a flash and steam from its vents
  Gravity Well   a void orb in a floating ring with debris orbiting it; on fire the debris and the
                 ring are sucked in, then the orb is released (it regrows)

Palette (A11 Future): charcoal and white, mint and magenta energy (outside the team hue bands).
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as K
from ageborn_art.geometry import Geo

from world.common import TURRET_YAW, cyl, pennant, turret_module

CHARCOAL = "#23262E"
CHAR_LT = "#3A3F4A"
WHITE = "#E9EDF2"
TRIM = "#A9B1BD"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
MAGENTA = "#F03AA8"
MAGENTA_CORE = "#FFD6EE"
VOID = "#2A1E3A"
VISOR = "#1B1E25"
STEAM = "#E6EAEE"

CANVAS = (280, 230)
FEET = (100, 185)


def hover_pad(rig, r=15.0):
    """The Future plinth: a charcoal hex foot, a mint hover gap, a team hex deck with a white rim,
    running lights on the corners and a holo pennant at the back."""
    g = Geo()
    cyl(g, (0, 0, 0), (0, 0, 3.0), r - 2.5, r - 3.5, bevel=0.8, segs=6, squash=(1.0, 0.8))
    rig.part("mount", g, CHARCOAL)
    g = Geo()
    cyl(g, (0, 0, 2.6), (0, 0, 4.0), r - 3.2, bevel=0.2, segs=6, squash=(1.0, 0.8))
    rig.part("mount", g, glow=MINT, outline=0)
    g = Geo()
    cyl(g, (0, 0, 4.0), (0, 0, 7.4), r, r - 0.6, bevel=0.8, segs=6, squash=(1.0, 0.8))
    rig.part("mount", g, WHITE, finish="gloss", outline_hex=TRIM)
    g = Geo()
    cyl(g, (0, 0, 7.0), (0, 0, 8.0), r - 1.8, bevel=0.3, segs=6, squash=(1.0, 0.8))
    rig.part("mount", g, team=True, outline=0.4)
    g = Geo()
    for k in range(6):
        a = math.radians(60 * k)
        g.sphere(((r - 0.2) * math.cos(a), (r - 0.2) * math.sin(a) * 0.8, 5.8), 1.1, cuts=2)
    rig.part("mount", g, glow=MINT_CORE, outline=0.4, outline_hex=MINT)
    pennant(rig, "mount", -r + 2.5, 5, 7, h=28, length=14.0, width=8.0, pole=CHAR_LT, finial=MINT)


def glow_flash(rig, joint, at, color=MINT, core=MINT_CORE, size=1.0, name="flash"):
    x, y, z = at
    rig.joint(name, joint, at, hidden=True)
    g = Geo().star((x + 3 * size, y - 3, z), 7.5 * size, 2.8 * size, 1.4, points=6)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x + 2 * size, y - 4, z), 3.4 * size, cuts=3)
    rig.part(name, g, glow=core, outline=0)


def steam(rig, joint, at, size=1.0, name="steam"):
    x, y, z = at
    rig.joint(name, joint, at, hidden=True)
    g = Geo()
    for dx, dz, rr in ((0, 0, 3.0), (-3.4, 1.8, 2.4), (2.4, 2.6, 2.2), (-1.2, 4.4, 1.9)):
        g.sphere((x + dx * size, y - 2, z + dz * size), rr * size, cuts=3)
    rig.part(name, g, STEAM, finish="dust", outline=0.6)


# -- Pulse Laser ----------------------------------------------------------------------------------
PL_MUZ = (25.0, 0.0, 21.0)


def pulse_build(rig):
    hover_pad(rig)
    g = Geo()
    cyl(g, (0, 0, 7), (0, 0, 14), 4.6, 3.6, bevel=0.5)
    rig.part("mount", g, TRIM, finish="metal", outline=0.5)
    g = Geo()
    cyl(g, (0, 0, 12.6), (0, 0, 13.8), 5.2, bevel=0.2, segs=16)
    rig.part("mount", g, glow=MINT, outline=0.4, outline_hex=CHARCOAL)
    # the pod: white dome, a team side panel with the hex, a dark visor patch with one mint eye
    pod = Geo().blob((0, 0, 20), (11, 9, 7.4), p=2.4, taper=(1.0, 0.8))
    panel = Geo().blob((-2.4, -7.2, 21), (6.2, 1.8, 3.8), p=2.4)
    pf = FC.Face(rig, "head", [panel], yaw_deg=TURRET_YAW)
    g = KF.hexmark(pf, Geo(), K.scr(pf, (-2.4, -8.9, 21.0)), s=0.62, w=1.1, dot=False)
    rig.part("head", g, KF.HEX_PALE, highlight=False, outline=0)
    rig.part("head", panel, team=True, outline=0.4)
    visor = Geo().blob((6.4, -3.2, 23.4), (4.2, 5.6, 3.0), p=3.0)
    KF.visor_face(rig, "head", [visor], (7.0, 23.6), eye_dx=(0.0,), eye_rx=1.6, eye_rz=2.1, yaw_deg=TURRET_YAW)
    rig.part("head", visor, VISOR, finish="gloss", outline=0.4, outline_hex=CHARCOAL)
    rig.part("head", pod, WHITE, finish="gloss", outline_hex=TRIM)
    g = Geo().capsule((-6.0, 3.0, 26.0), (-8.0, 3.0, 32.0), 0.7)
    rig.part("head", g, CHAR_LT, outline=0.4)
    rig.joint("status", "head", (-8.1, 3.0, 32.6))
    g = Geo().sphere((-8.1, 3.0, 32.6), 1.3, cuts=2)
    rig.part("status", g, glow=MAGENTA, outline=0.4, outline_hex=MAGENTA)
    # the barrel: charcoal with white cooling fins, two magenta coil rings, an iris lens at the mouth
    rig.joint("gun", "head", (0, 0, 21))
    g = Geo()
    cyl(g, (4, 0, 21), (22, 0, 21), 3.0, 2.4, bevel=0.4, segs=16)
    rig.part("gun", g, CHAR_LT, finish="metal", outline=0.5)
    g = Geo()
    for x in (7.0, 9.4):
        cyl(g, (x, 0, 21), (x + 1.0, 0, 21), 4.4, bevel=0.2, segs=16)
    rig.part("gun", g, WHITE, finish="gloss", outline=0.4, outline_hex=TRIM)
    g = Geo()
    for x in (13, 17):
        cyl(g, (x, 0, 21), (x + 1.2, 0, 21), 3.5, bevel=0.2, segs=16)
    rig.part("gun", g, glow=MAGENTA, outline=0)
    rig.joint("heat", "gun", (15, 0, 21), hidden=True)
    g = Geo()
    for x in (13, 17):
        cyl(g, (x - 0.3, 0, 21), (x + 1.5, 0, 21), 4.3, bevel=0.2, segs=16)
    rig.part("heat", g, glow=MAGENTA_CORE, outline=0.5, outline_hex=MAGENTA)
    g = Geo().lathe([(2.2, 0), (4.4, 0.2), (4.6, 2.4), (2.6, 2.6)], (21.4, 0, 21), (24.4, 0, 21), segs=18)
    rig.part("gun", g, WHITE, finish="gloss", outline=0.4, outline_hex=TRIM)
    rig.joint("iris", "gun", (24.0, 0, 21))
    g = Geo().sphere((24.0, -0.4, 21), 2.4, cuts=3)
    rig.part("iris", g, glow=MAGENTA_CORE, outline=0.5, outline_hex=MAGENTA)
    glow_flash(rig, "gun", PL_MUZ, MAGENTA, MAGENTA_CORE, 1.1)
    steam(rig, "gun", (12.0, 0, 26.0), 0.8, name="vent")


def pulse_idle(f):
    w = math.sin(2 * math.pi * f / 6)
    pose = {"gun": {"r": 1.2 * w}, "iris": {"s": 0.8 + 0.18 * math.cos(2 * math.pi * f / 6)},
            "head": {"z": 0.4 * w}, "status": {"s": 1.25 if f in (0, 3) else 0.75}}
    if f == 4:
        pose.update(KF.glyph("g_blink"))
    return pose


def pulse_fire(f):
    pose = {"gun": {"x": [-1.6, 0.6, -2.6, -1.2, -0.3][f], "r": [2.0, 0.0, 3.0, 1.0, 0.3][f]},
            "head": {"x": [-0.8, 0.3, -1.2, -0.4, 0][f]},
            "iris": {"s": [1.45, 1.6, 1.1, 0.9, 0.8][f]},
            "heat": {"show": f in (1, 2, 3)},
            "vent": {"show": f in (2, 3), "s": 1.0 if f == 2 else 1.3, "z": 0.0 if f == 2 else 2.0}}
    pose.update(KF.glyph(["g_angry", "g_squint", "g_squint", "g_angry", "eyes"][f]))
    return pose


PL_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "gun", "point": (24.5, 0, 21.0), "radii_lu": (4.4, 7.0), "a0": -110.0,
         "a1": 110.0, "color": MAGENTA_CORE}],
    1: [{"kind": "burst", "joint": "gun", "point": (26.0, 0, 21.0), "r0_lu": 7.0, "r1_lu": 12.0, "n": 5,
         "a0": -60.0, "arc": 120.0, "color": MAGENTA_CORE}]}}


# -- Arc Coil ----------------------------------------------------------------------------------------
def arc_build(rig):
    hover_pad(rig, 14)
    g = Geo()
    cyl(g, (0, 0, 7), (0, 0, 34), 4.2, 3.0, bevel=0.5, segs=16)
    rig.part("mount", g, CHAR_LT, finish="metal")
    for i, (z, r) in enumerate(((12, 9.4), (19, 8.4), (26, 7.4))):
        rig.joint(f"ring{i}", "head", (0, 0, z))
        g = Geo()
        cyl(g, (0, 0, z - 1.5), (0, 0, z + 1.5), r, bevel=0.6, segs=20)
        rig.part(f"ring{i}", g, WHITE if i != 1 else TRIM, finish="gloss", outline=0.5, outline_hex=TRIM)
        g = Geo()
        for k in range(3):
            a = math.radians(120 * k)
            g.blob(((r + 0.2) * math.cos(a), (r + 0.2) * math.sin(a), z), (1.4, 1.4, 1.0), p=2.4)
        rig.part(f"ring{i}", g, glow=MINT_CORE, outline=0.4, outline_hex=MINT)
        rig.joint(f"hot{i}", f"ring{i}", (0, 0, z), hidden=True)
        g = Geo()
        cyl(g, (0, 0, z - 0.8), (0, 0, z + 0.8), r + 1.2, bevel=0.2, segs=20)
        rig.part(f"hot{i}", g, glow=MINT, outline=0.5, outline_hex="#1E8A66")
    g = Geo()
    cyl(g, (0, 0, 15.4), (0, 0, 16.6), 8.9, bevel=0.2, segs=20)
    rig.part("mount", g, team=True, outline=0.3)
    # the orb on top (no aim): a mint shell, a pale core, a glossy highlight and arcs
    g = Geo().sphere((0, 0, 41), 8.8, cuts=4)
    rig.part("head", g, glow=MINT, outline=0.8, outline_hex="#1E8A66")
    g = Geo().sphere((0.6, -3.0, 40.4), 5.4, cuts=3)
    rig.part("head", g, glow=MINT_CORE, outline=0)
    g = Geo().blob((-2.6, -7.0, 44.0), (2.2, 0.8, 1.6), p=2.2)
    rig.part("head", g, glow="#FFFFFF", outline=0)
    for i in range(3):
        rig.joint(f"spark{i}", "head", (0, 0, 40), hidden=True)
        a = math.radians(30 + i * 120)
        pts = [(0, -2, 40)]
        for k in range(1, 4):
            pts.append((math.cos(a) * 5.4 * k + (k % 2) * 2.4, -2, 40 + math.sin(a) * 5.4 * k - (k % 2) * 2.4))
        g = Geo()
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.9)
        rig.part(f"spark{i}", g, glow=MINT_CORE, outline=0.5, outline_hex=MINT)


def arc_idle(f):
    pose = {"head": {"s": 1 + 0.05 * math.sin(2 * math.pi * f / 6)}, f"spark{f % 3}": {"show": f % 2 == 0}}
    for i in range(3):
        pose[f"ring{i}"] = {"rz": (20.0 if i != 1 else -20.0) * f}
    return pose


def arc_fire(f):
    pose = {"head": {"s": [0.8, 1.28, 1.12, 1.02, 1.0][f]},
            "spark0": {"show": f in (1, 2)}, "spark1": {"show": f in (1, 3)}, "spark2": {"show": f in (1, 2)}}
    for i in range(3):
        pose[f"ring{i}"] = {"rz": [40, 80, 110, 125, 130][f] * (1 if i != 1 else -1)}
        pose[f"hot{i}"] = {"show": f in (0, 1) or (f == 2 and i == 2)}
    return pose


ARC_OVERLAYS = {"fire": {
    1: [{"kind": "burst", "joint": "head", "point": (0, 0, 41.0), "r0_lu": 11.0, "r1_lu": 17.0, "n": 8,
         "a0": 0.0, "arc": 360.0, "color": MINT_CORE}],
    0: [{"kind": "rings", "joint": "head", "point": (0, 0, 41.0), "radii_lu": (11.0, 14.0), "a0": -180.0,
         "a1": 180.0, "color": MINT_CORE}]}}


# -- Plasma Mortar -----------------------------------------------------------------------------------
PM_MUZ = (7.0, 0.0, 34.0)


def mortar_build(rig):
    hover_pad(rig, 16)
    g = Geo().blob((0, 0, 10.0), (9, 7, 3.4), p=5)
    rig.part("mount", g, CHAR_LT)
    rig.joint("gun", "head", (0, 0, 14))
    g = Geo()
    cyl(g, (-2, 0, 12), (6, 0, 32), 7.6, 6.6, bevel=1.0, segs=20)
    rig.part("gun", g, WHITE, finish="gloss", outline_hex=TRIM)
    g = Geo()
    cyl(g, (3.6, 0, 25), (4.4, 0, 27), 7.2, bevel=0.2, segs=20)
    rig.part("gun", g, team=True, outline=0.4)
    g = Geo()
    cyl(g, (0.4, 0, 18), (1.4, 0, 20.4), 7.8, bevel=0.2, segs=20)
    rig.part("gun", g, glow=MINT, outline=0)
    rig.joint("hot", "gun", (1.0, 0, 19.2), hidden=True)
    g = Geo()
    cyl(g, (0.2, 0, 17.4), (1.6, 0, 21.0), 8.8, bevel=0.2, segs=20)
    rig.part("hot", g, glow=MINT_CORE, outline=0.6, outline_hex=MINT)
    # side vents (charcoal slats with a mint gap)
    g = Geo()
    for k in range(3):
        g.blob((-2.4 + 1.2 * k, -6.8, 15.0 + 2.6 * k), (2.4, 0.8, 0.7), p=3.0, rot=(0, -22, 0))
    rig.part("gun", g, CHARCOAL, outline=0.3)
    # the muzzle rim and a plasma glob in the mouth
    g = Geo().blob((6.2, 0, 32.4), (6.6, 6.6, 1.4), p=2.2, rot=(0, -22, 0))
    rig.part("gun", g, CHAR_LT, finish="metal", outline=0.5)
    rig.joint("glob", "gun", (6.4, 0, 33.4))
    g = Geo().sphere((6.4, 0, 33.8), 4.4, cuts=3)
    rig.part("glob", g, glow=MINT, outline=0.8, outline_hex="#1E8A66")
    g = Geo().sphere((6.0, -2.6, 35.0), 2.4, cuts=2)
    rig.part("glob", g, glow=MINT_CORE, outline=0)
    glow_flash(rig, "gun", PM_MUZ, MINT, MINT_CORE, 1.2)
    steam(rig, "gun", (-4.0, -4.0, 18.0), 1.0, name="smoke")


def mortar_idle(f):
    c = math.cos(2 * math.pi * f / 6)
    return {"gun": {"sz": 1 + 0.02 * math.sin(2 * math.pi * f / 6)}, "glob": {"s": 0.94 + 0.08 * c, "z": 0.3 * c},
            "hot": {"show": f in (0, 1)}}


def mortar_fire(f):
    return {"gun": {"sz": [0.8, 1.12, 0.96, 1.02, 1.0][f], "sx": [1.08, 0.94, 1.02, 1.0, 1.0][f],
                    "sy": [1.08, 0.94, 1.02, 1.0, 1.0][f], "z": [-2, 1.5, -0.5, 0, 0][f]},
            "hot": {"show": f in (0, 1)},
            "glob": {"hide": f in (1, 2), "s": [1.25, 1, 1, 0.5, 0.85][f]},
            "smoke": {"show": f in (2, 3), "s": 1.0 if f == 2 else 1.3, "z": 0.0 if f == 2 else 3.0}}


PM_OVERLAYS = {"fire": {
    1: [{"kind": "burst", "joint": "gun", "point": (7.0, 0, 35.0), "r0_lu": 7.0, "r1_lu": 12.0, "n": 6,
         "a0": 20.0, "arc": 140.0, "color": MINT_CORE}],
    0: [{"kind": "rings", "joint": "gun", "point": (6.4, 0, 33.8), "radii_lu": (6.5, 9.0), "a0": -40.0,
         "a1": 220.0, "color": MINT_CORE}]}}


# -- Gravity Well ------------------------------------------------------------------------------------
def gravity_build(rig):
    hover_pad(rig, 15)
    g = Geo()
    for s in (-1, 1):
        g.capsule((s * 8, 0, 7), (s * 10.5, 0, 24), 1.9, 1.3)
    rig.part("mount", g, TRIM, finish="metal", outline=0.5)
    g = Geo()
    for s in (-1, 1):
        g.sphere((s * 10.5, 0, 24.5), 2.0, cuts=2)
    rig.part("mount", g, glow=MAGENTA, outline=0.4, outline_hex=MAGENTA)
    # head: a floating ring (charcoal, a team arc, magenta lights) round the void orb
    rig.joint("ring", "head", (0, 0, 32))
    g = Geo()
    for i in range(24):
        a0, a1 = 2 * math.pi * i / 24, 2 * math.pi * (i + 1) / 24
        g.capsule((11 * math.cos(a0) * 0.35, 11 * math.sin(a0) * 0.2, 32 + 11 * math.sin(a0)),
                  (11 * math.cos(a1) * 0.35, 11 * math.sin(a1) * 0.2, 32 + 11 * math.sin(a1)), 2.3)
    rig.part("ring", g, CHAR_LT, finish="metal")
    g = Geo()
    for i in range(7):
        a0, a1 = 2 * math.pi * (i + 2) / 24, 2 * math.pi * (i + 3) / 24
        g.capsule((11 * math.cos(a0) * 0.35, 11 * math.sin(a0) * 0.2 - 1.2, 32 + 11 * math.sin(a0)),
                  (11 * math.cos(a1) * 0.35, 11 * math.sin(a1) * 0.2 - 1.2, 32 + 11 * math.sin(a1)), 1.2)
    rig.part("ring", g, team=True, outline=0.3)
    g = Geo()
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        g.blob((3.8 * math.cos(a), -1.4, 32 + 11.4 * math.sin(a)), (1.3, 1.3, 1.5), p=2.0)
    rig.part("ring", g, glow=MAGENTA, outline=0)
    rig.joint("orb", "head", (0, 0, 32))
    g = Geo().sphere((0, 0, 32), 6.4, cuts=4)
    rig.part("orb", g, VOID, finish="gloss", outline=0.8, outline_hex=MAGENTA)
    g = Geo().blob((-2.2, -5.2, 34.4), (2.2, 0.8, 1.5), p=2.0)
    rig.part("orb", g, glow=MAGENTA_CORE, outline=0)
    g = Geo().lathe([(6.6, -0.3), (7.4, 0), (6.6, 0.3), (6.2, 0)], (0, -0.5, 32), (0, -1.5, 32), segs=24)
    rig.part("orb", g, glow=MAGENTA, outline=0)
    # debris orbiting the orb (each on its own joint at the orb centre; `r` swings it round)
    for i, (rad, sz) in enumerate(((15.0, 2.2), (17.0, 1.7), (14.0, 1.5))):
        rig.joint(f"deb{i}", "head", (0, 0, 32))
        a = math.radians(40 + 120 * i)
        g = Geo().blob((rad * math.cos(a), -3.0, 32 + rad * math.sin(a)), (sz, sz * 0.9, sz * 0.85), p=2.2,
                       rot=(0, 30 * i, 0))
        rig.part(f"deb{i}", g, TRIM if i != 1 else CHAR_LT, finish="metal", outline=0.5)
    glow_flash(rig, "head", (0, 0, 32), MAGENTA, MAGENTA_CORE, 1.1)


def gravity_idle(f):
    w = math.sin(2 * math.pi * f / 6)
    pose = {"ring": {"z": 1.2 * w, "rz": 8 * w}, "orb": {"s": 1 + 0.06 * w}, "head": {"z": 0.8 * w}}
    for i in range(3):
        pose[f"deb{i}"] = {"r": -(60.0 * f) * (1 if i != 1 else 0.8)}
    return pose


def gravity_fire(f):
    pull = [0.55, 0.9, 1.25, 1.0, 1.0][f]
    pose = {"orb": {"s": [0.7, 1.3, 0.2, 0.55, 0.9][f], "x": [0, 4, 8, 0, 0][f], "hide": f == 2},
            "ring": {"s": [0.88, 1.12, 1.04, 1.0, 1.0][f]},
            "head": {"sz": [1.05, 0.94, 1.02, 1.0, 1.0][f]}}
    for i in range(3):
        pose[f"deb{i}"] = {"s": pull, "r": -[50, 110, 150, 175, 190][f] * (1 if i != 1 else 0.8)}
    return pose


GW_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "head", "point": (0, 0, 32.0), "radii_lu": (13.0, 17.0), "a0": -180.0,
         "a1": 180.0, "color": MAGENTA_CORE}],
    1: [{"kind": "burst", "joint": "head", "point": (4.0, 0, 32.0), "r0_lu": 9.0, "r1_lu": 15.0, "n": 7,
         "a0": -70.0, "arc": 140.0, "color": MAGENTA_CORE}]}}


TURRETS = [
    turret_module("pulse_laser", "Pulse Laser", "future", 30, CANVAS, FEET, (0, 20), PL_MUZ, pulse_build,
                  pulse_idle, pulse_fire, muzzle_joint="gun", fire_kind="beam", idle_frames=6,
                  overlays=PL_OVERLAYS),
    turret_module("arc_coil", "Arc Coil", "future", 48, CANVAS, FEET, (0, 40), (0, 0, 40), arc_build, arc_idle, arc_fire,
                  aim=(0, 0), fire_kind="arc", idle_frames=6, overlays=ARC_OVERLAYS),
    turret_module("plasma_mortar", "Plasma Mortar", "future", 36, CANVAS, FEET, (0, 14), PM_MUZ, mortar_build,
                  mortar_idle, mortar_fire, aim=(0, 0), muzzle_joint="gun", idle_frames=6, overlays=PM_OVERLAYS),
    turret_module("gravity_well", "Gravity Well", "future", 44, CANVAS, FEET, (0, 32), (0, 0, 32), gravity_build,
                  gravity_idle, gravity_fire, aim=(0, 0), fire_kind="orb", muzzle_joint="orb", idle_frames=6,
                  overlays=GW_OVERLAYS),
]
