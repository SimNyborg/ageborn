"""Cosmic Age turrets (docs/design-lane-ages.md A17.11, A17.12): Ion Turret, Starburst Gun, Starfall
Battery, Tachyon Lance. The turret contract is common.turret_module (mount, idle, fire, build,
destroyed); palette as the Cosmic units (ageborn_art.rigs_cosmic): void, nebula violet, star
white, mint energy; team colour on the plinth ring, the pennant and head bands.

Cartoon kit v2 (art director plan 2026-09-30): every turret stands on the Cosmic star plinth (a void
five-point star foot, a mint hover gap, a star-white deck with a team ring and a pale star inlay,
running lights on the star points and a team pennant), has a 6-frame idle with character and an
anticipation pose before its one-frame flash.

  Ion Turret        a violet pod with a dark visor and a violet robot eye: the coils hum in turn and
                    the eye blinks; on fire the coils all light and a charge ball swells at the tip
                    (angry eye), then the beam flash, a recoil and a vent puff
  Starburst Gun     three violet petal barrels: they breathe open and shut; on fire they spread wide
                    with lit cores, burst, then fold back
  Starfall Battery  a dish that turns slowly with a violet shard floating over it; on fire the dish
                    squashes and the shard glows hot, then it is released with a flash and regrows
  Tachyon Lance     a long prism with rail fins and three lights chasing along it; on fire the rails
                    spread and the lights all run to the tip, then the snap
"""
import math

from ageborn_art import face as FC
from ageborn_art import kit_cosmic as KC
from ageborn_art import kit_future as KF
from ageborn_art import kit_medieval as KM
from ageborn_art import rigs_cosmic as K
from ageborn_art.geometry import Geo

from world.common import TURRET_YAW, cyl, pennant, smoke_puff, turret_module

CANVAS = (280, 230)
FEET = (100, 185)


def pad(rig, r=15.0):
    """The Cosmic star plinth: a void five-point star foot, a mint hover gap, a star-white deck
    with a team ring and a pale star inlay, lights on the star points, a team pennant."""
    g = Geo().star((0, 0, 1.6), r + 2.5, r - 4.0, 3.2, points=5, rot=(90, 0, 0))
    rig.part("mount", g, K.VOID_LT, finish="gloss")
    g = Geo()
    for k in range(5):
        a = math.radians(90 + 72 * k)
        g.sphere(((r + 1.2) * math.cos(a), (r + 1.2) * math.sin(a) * 0.8, 3.6), 1.2, cuts=2)
    rig.part("mount", g, glow=K.MINT_CORE, outline=0.4, outline_hex=K.MINT)
    g = Geo()
    cyl(g, (0, 0, 3.0), (0, 0, 4.4), r - 3.6, bevel=0.2, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, glow=K.MINT, outline=0)
    g = Geo()
    cyl(g, (0, 0, 4.2), (0, 0, 7.6), r - 1.0, r - 1.8, bevel=0.8, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    cyl(g, (0, 0, 7.2), (0, 0, 8.2), r - 2.4, bevel=0.3, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, team=True, outline=0.4)
    g = Geo().star((0, -(r - 2.2) * 0.8, 6.0), 2.4, 1.0, 0.8, points=5)
    rig.part("mount", g, KC.STAR_PALE, outline=0.4, outline_hex=K.STAR_TRIM)
    pennant(rig, "mount", -r + 2, 5, 7, h=30, pole=K.STAR_TRIM, finial=K.MINT)


def glow_flash(rig, joint, at, color=K.MINT, core=K.MINT_CORE, size=1.0, name="flash", points=6):
    x, y, z = at
    rig.joint(name, joint, at, hidden=True)
    g = Geo().star((x + 3 * size, y - 3, z), 7.5 * size, 2.8 * size, 1.4, points=points)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x + 2 * size, y - 4, z), 3.2 * size, cuts=3)
    rig.part(name, g, glow=core, outline=0)


def pod_eye(rig, joint, center, radii, x0, z_top, z_bot, eye_at, rx=1.6, rz=2.0, color=KC.VIO_EYE,
            core=KC.VIO_CORE):
    """A dark visor patch with one robot eye on a turret pod (glyph joints as the units)."""
    KC.visor(rig, joint, center, radii, x0=x0, z_top=z_top, z_bot=z_bot, eye_at=eye_at, eye_dx=(0.0,),
             eye_rx=rx, eye_rz=rz, color=color, core=core, grow=0.4, yaw_deg=TURRET_YAW)


# -- Ion Turret: a compact emitter (instant beam, fast) -----------------------------------------
ION_MUZ = (23.0, 0.0, 21.0)
ION_COILS = (10.5, 14.5)


def ion_build(rig):
    pad(rig)
    g = Geo()
    cyl(g, (0, 0, 7), (0, 0, 14), 5.5, 4.2, bevel=0.6)
    rig.part("mount", g, K.VIOLET_DK, finish="gloss")
    g = Geo().blob((0, 0, 20), (10.5, 9.0, 7.0), p=2.4, taper=(1.0, 0.82))
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().blob((-1.0, 0, 19.4), (10.9, 9.4, 3.0), p=2.8)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo().blob((-9.0, 0, 21.0), (3.6, 7.6, 5.0), p=3.0)                  # team power pack at the back
    rig.part("head", g, team=True)
    pod_eye(rig, "head", (0, 0, 20), (10.5, 9.0, 7.0), x0=3.0, z_top=26.2, z_bot=21.4, eye_at=(6.4, 24.0))
    g = Geo().capsule((-6.0, 3.0, 25.0), (-8.0, 3.0, 31.0), 0.7)
    rig.part("head", g, K.STAR_TRIM, outline=0.4)
    rig.joint("status", "head", (-8.1, 3.0, 31.6))
    g = Geo().sphere((-8.1, 3.0, 31.6), 1.3, cuts=2)
    rig.part("status", g, glow=K.MINT, outline=0.4, outline_hex=K.MINT)
    rig.joint("gun", "head", (0, 0, 21))
    g = Geo()
    cyl(g, (6, 0, 21), (20, 0, 21), 3.0, 2.4, bevel=0.4, segs=16)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    for x in ION_COILS:
        cyl(g, (x, 0, 21), (x + 1.2, 0, 21), 3.5, bevel=0.2, segs=16)
    rig.part("gun", g, glow="#2FA884", outline=0.6, outline_hex=K.VOID)
    for i, x in enumerate(ION_COILS):
        rig.joint(f"coil{i}", "gun", (x, 0, 21), hidden=True)
        g = Geo()
        cyl(g, (x - 0.3, 0, 21), (x + 1.5, 0, 21), 4.4, bevel=0.2, segs=16)
        rig.part(f"coil{i}", g, glow=K.MINT_CORE, outline=0.5, outline_hex=K.MINT)
    g = Geo().lathe([(0, 0), (3.4, 0.2), (4.2, 2.2), (3.0, 3.4), (0, 3.4)], (19, 0, 21), (22.4, 0, 21), segs=16)
    rig.part("gun", g, K.VOID_LT, finish="gloss")
    rig.joint("tip", "gun", (22.6, 0, 21))
    g = Geo().sphere((22.6, 0, 21), 2.2, cuts=3)
    rig.part("tip", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)
    rig.joint("charge", "gun", ION_MUZ, hidden=True)
    g = Geo().sphere((24.0, -0.6, 21), 3.6, cuts=3)
    rig.part("charge", g, glow=K.MINT_CORE, outline=1.0, outline_hex=K.MINT)
    glow_flash(rig, "gun", ION_MUZ, size=1.1)
    smoke_puff(rig, "gun", (12.0, 0, 25.5), 0.6, name="vent")


def ion_idle(f):
    w = math.sin(2 * math.pi * f / 6)
    pose = {"gun": {"r": 0.9 * w}, "head": {"z": 0.4 * w}, "tip": {"s": 0.85 + 0.2 * (0.5 + 0.5 * w)},
            f"coil{f % 2}": {"show": f in (0, 1, 3, 4)}, "status": {"s": 1.3 if f in (0, 3) else 0.7}}
    if f == 4:
        pose.update(KF.glyph("g_blink"))
    return pose


def ion_fire(f):
    pose = {"gun": {"x": [-1.0, 0.6, -2.4, -1.0, -0.2][f], "r": [1.5, 0.0, 2.6, 1.0, 0.3][f]},
            "head": {"x": [-0.8, 0.3, -1.0, -0.4, 0][f], "sz": [0.94, 1.04, 0.98, 1.0, 1.0][f]},
            "charge": {"show": f == 0}, "coil0": {"show": f in (0, 1)}, "coil1": {"show": f in (0, 1)},
            "vent": {"show": f in (2, 3)}}
    pose.update(KF.glyph(["g_angry", "g_squint", "g_squint", "g_angry", "eyes"][f]))
    return pose


ION_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "gun", "point": (24.0, 0, 21.0), "radii_lu": (5.0, 8.0), "a0": -110.0,
         "a1": 110.0, "color": K.MINT_CORE}],
    1: [{"kind": "burst", "joint": "gun", "point": (26.0, 0, 21.0), "r0_lu": 7.0, "r1_lu": 12.0, "n": 5,
         "a0": -60.0, "arc": 120.0, "color": K.MINT_CORE}]}}


# -- Starburst Gun: three petal barrels that open (a spread burst) -----------------------------
FAN = (14.0, 0.0, -14.0)
SB_MUZ = (26.0, -1.0, 20.0)


def starburst_build(rig):
    pad(rig, 16)
    g = Geo()
    cyl(g, (0, 0, 7), (0, 0, 13), 6.5, 5.0, bevel=0.6)
    rig.part("mount", g, K.VOID_LT, finish="gloss")
    g = Geo().blob((-1, 0, 20), (11, 10, 8), p=2.8, taper=(1.05, 0.85))
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((-2, 0, 21), (11.3, 10.3, 2.4), p=3.0)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo().blob((-9, 0, 24), (4.4, 8.6, 4.6), p=3.2)
    rig.part("head", g, team=True)
    g = Geo().star((-4.0, -9.6, 20.8), 2.2, 0.9, 0.8, points=5)
    rig.part("head", g, KC.STAR_PALE, outline=0.4, outline_hex=K.STAR_TRIM)
    rig.joint("gun", "head", (4, 0, 20))
    for i, a in enumerate(FAN):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        j = f"petal{i}"
        rig.joint(j, "gun", (6.0, -1.0, 20.0))
        p0 = (6.0, -1.0 + (i - 1) * 0.2, 20.0)
        p1 = (6.0 + 17.0 * c, -1.0, 20.0 + 17.0 * s)
        g = Geo()
        cyl(g, p0, p1, 2.3, 2.0, bevel=0.3, segs=12)
        rig.part(j, g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
        g = Geo()
        cyl(g, (p1[0] - 2.5 * c, -1.0, p1[2] - 2.5 * s), (p1[0] + 0.6 * c, -1.0, p1[2] + 0.6 * s), 2.9, bevel=0.3,
            segs=12)
        rig.part(j, g, glow=K.VIOLET_GLOW, outline=0.6, outline_hex=K.VIOLET)
        rig.joint(f"core{i}", j, p1, hidden=True)
        g = Geo().sphere((p1[0] + 1.2 * c, -2.2, p1[2] + 1.2 * s), 2.4, cuts=3)
        rig.part(f"core{i}", g, glow=K.VIOLET_CORE, outline=0.6, outline_hex=K.VIOLET_GLOW)
    g = Geo().blob((7, -1, 20), (4.4, 4.4, 5.6), p=2.6)
    rig.part("gun", g, K.VOID_LT, finish="gloss")
    g = Geo().sphere((8.5, -4.6, 20), 1.6, cuts=3)
    rig.part("gun", g, glow=K.MINT, outline=0)
    # the flash: three stars at the fan's mouths (spread a little wider: the petals are open)
    rig.joint("flash", "gun", (24, 0, 20), hidden=True)
    for a in (22.0, 0.0, -22.0):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        x, z = 6.0 + 21.0 * c, 20.0 + 21.0 * s
        g = Geo().star((x + 2, -4, z), 6.0, 2.2, 1.2, points=5)
        rig.part("flash", g, glow=K.VIOLET_GLOW, outline=0)
        g = Geo().sphere((x + 1, -5, z), 2.2, cuts=3)
        rig.part("flash", g, glow=K.VIOLET_CORE, outline=0)


def _petals(k):
    """Petal spread: 0 = as built, 1 = wide open (+-8 degrees more), negative = folded."""
    return {"petal0": {"r": 8.0 * k}, "petal2": {"r": -8.0 * k}}


def starburst_idle(f):
    w = math.sin(2 * math.pi * f / 6)
    pose = _petals(0.35 * w)
    pose.update({"gun": {"r": 0.8 * w}, "head": {"z": 0.4 * w}})
    return pose


def starburst_fire(f):
    pose = _petals([1.0, 1.0, 0.5, -0.3, 0.0][f])
    pose.update({"gun": {"x": [-1.2, -3.0, -1.8, -0.6, 0][f], "sz": [0.95, 1.08, 1.02, 1.0, 1.0][f]},
                 "head": {"r": [-1.5, 3, 1.5, 0.5, 0][f]}})
    for i in range(3):
        pose[f"core{i}"] = {"show": f == 0}
    return pose


SB_OVERLAYS = {"fire": {
    1: [{"kind": "burst", "joint": "gun", "point": (28.0, -1.0, 20.0), "r0_lu": 10.0, "r1_lu": 16.0, "n": 7,
         "a0": -70.0, "arc": 140.0, "color": K.VIOLET_CORE}]}}


# -- Starfall Battery: a shard launcher on a dish (arc) -----------------------------------------
SHARD = (4.0, 0.0, 27.0)


def starfall_build(rig):
    pad(rig, 17)
    g = Geo()
    cyl(g, (0, 0, 6), (0, 0, 12), 7.0, 5.0, bevel=0.8)
    rig.part("mount", g, K.VIOLET_DK, finish="gloss")
    # the dish (tilted up and forward) turns on its own joint
    rig.joint("gun", "head", (0, 0, 14))
    rig.joint("dish", "gun", (0, 0, 14))
    g = Geo().lathe([(0, 0), (6.0, 0.4), (13.0, 3.0), (16.0, 6.4), (15.0, 7.2), (12.0, 4.6), (5.0, 2.0), (0, 1.6)],
                    (0, 0, 12.5), (1.6, 0, 16.5), segs=28)
    rig.part("dish", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    d = (0.371, 0.0, 0.928)                      # the dish axis
    u = (0.928, 0.0, -0.371)
    c0 = (d[0] * 7.0, 0.0, 12.5 + d[2] * 7.0)
    g = Geo()
    n = 28
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p0 = (c0[0] + 15.6 * math.cos(a0) * u[0], 15.6 * math.sin(a0), c0[2] + 15.6 * math.cos(a0) * u[2])
        p1 = (c0[0] + 15.6 * math.cos(a1) * u[0], 15.6 * math.sin(a1), c0[2] + 15.6 * math.cos(a1) * u[2])
        g.capsule(p0, p1, 1.3, segs=8, rings=2)
    rig.part("dish", g, team=True, outline=0.4)
    g = Geo()
    for k in range(6):                            # rim lights (they turn with the dish)
        a = 2 * math.pi * k / 6
        g.sphere((c0[0] + 15.8 * math.cos(a) * u[0], 15.8 * math.sin(a) - 0.8, c0[2] + 15.8 * math.cos(a) * u[2] + 1.0),
                 1.1, cuts=2)
    rig.part("dish", g, glow=K.MINT_CORE, outline=0.4, outline_hex=K.MINT)
    g = Geo().lathe([(0, 1.2), (8.0, 2.4), (9.0, 3.4), (0, 2.6)], (0, 0, 12.5), (1.6, 0, 16.5), segs=24)
    rig.part("gun", g, glow=K.MINT, outline=0)
    # the shard: a violet crystal floating over the cradle
    rig.joint("shard", "gun", SHARD)
    sx, sy, sz = SHARD
    g = Geo().lathe([(0, -7.0), (3.6, -2.0), (3.2, 5.0), (0, 10.0)], (sx, sy, sz - 1), (sx + 2.2, sy, sz + 5), segs=6)
    rig.part("shard", g, glow=K.VIOLET_GLOW, outline=1.0, outline_hex=K.VIOLET)
    g = Geo().lathe([(0, -4.0), (1.4, -1.0), (1.2, 4.0), (0, 6.0)], (sx - 0.6, sy - 2.4, sz), (sx + 1.6, sy - 2.4, sz + 6),
                    segs=6)
    rig.part("shard", g, glow=K.VIOLET_CORE, outline=0)
    rig.joint("hot", "shard", SHARD, hidden=True)
    g = Geo().lathe([(0, -8.4), (4.8, -2.0), (4.4, 6.0), (0, 11.6)], (sx, sy - 0.4, sz - 1), (sx + 2.2, sy - 0.4, sz + 5),
                    segs=6)
    rig.part("hot", g, glow=K.VIOLET_CORE, outline=1.2, outline_hex=K.VIOLET_GLOW)
    g = Geo()
    for a in (-40, 40, 180):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((sx + 7 * c, sy + 7 * s * 0.8, 17.0), (sx + 3.4 * c, sy + 3.4 * s * 0.8, sz - 3.0), 1.1, 0.8)
    rig.part("gun", g, K.STAR_TRIM, finish="metal", outline=0.5)
    glow_flash(rig, "gun", (sx + 2, sy, sz + 8), K.VIOLET_GLOW, K.VIOLET_CORE, 1.3)
    smoke_puff(rig, "gun", (sx, sy, sz + 2), 0.6)


def starfall_idle(f):
    w = math.sin(2 * math.pi * f / 6)
    return {"shard": {"z": 1.4 * w, "rz": 30 * f}, "gun": {"sz": 1 + 0.015 * w}, "dish": {"rz": 10.0 * f}}


def starfall_fire(f):
    return {"gun": {"sz": [0.82, 1.08, 1.02, 1.0, 1.0][f], "z": [-2.0, 0.8, 0.2, 0, 0][f]},
            "shard": {"hide": f in (1, 2), "s": [1.15, 1.0, 1.0, 0.5, 0.9][f], "z": [3, 0, 0, -3, 0][f]},
            "hot": {"show": f == 0},
            "smoke": {"show": f in (2, 3)}, "dish": {"rz": [0, 20, 30, 35, 36][f]}}


SF_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "gun", "point": (SHARD[0] + 1.0, 0.0, SHARD[2] + 2.0), "radii_lu": (9.0, 12.5),
         "a0": -180.0, "a1": 180.0, "color": K.VIOLET_CORE}]}}


# -- Tachyon Lance: a long prism barrel with rail fins (instant, pierce) ---------------------------
TL_MUZ = (41.0, 0.0, 21.0)
TL_LIGHTS = (14.0, 24.0, 33.0)


def tachyon_build(rig):
    pad(rig, 15)
    g = Geo()
    for s in (-1, 1):
        g.capsule((s * 7.5, 0, 6), (s * 5.0, 0, 20), 2.0, 1.4)
    rig.part("mount", g, K.STAR_TRIM, finish="metal", outline=0.5)
    g = Geo()
    cyl(g, (0, -6, 20), (0, 6, 20), 3.4, bevel=0.5, segs=16)
    rig.part("mount", g, K.VOID_LT, finish="gloss")
    # gimbal with a visor eye, and the prism barrel
    g = Geo().blob((0, 0, 21), (8.5, 6.5, 5.4), p=3.0)
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().blob((-1, 0, 21), (8.8, 6.8, 1.8), p=3.0)
    rig.part("head", g, team=True, outline=0.4)
    rig.joint("gun", "head", (0, 0, 21))
    g = Geo().lathe([(0, 0), (4.4, 0.6), (4.0, 24.0), (2.4, 34.0), (0, 36.0)], (4, 0, 21), (40, 0, 21), segs=6)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().lathe([(0, 0), (2.2, 0.6), (2.0, 24.0), (0, 30.0)], (6, -2.6, 22.0), (38, -2.6, 22.0), segs=6)
    rig.part("gun", g, glow="#8E6BC8", outline=0)
    g = Geo()
    for x in (12.0, 22.0):
        cyl(g, (x, 0, 21), (x + 1.4, 0, 21), 4.8, bevel=0.3, segs=6)
    rig.part("gun", g, K.VOID_LT, finish="gloss")
    # the rail fins above and below the prism (they spread on the charge)
    for name, sgn in (("rail_t", 1), ("rail_b", -1)):
        rig.joint(name, "gun", (10.0, 0, 21.0 + 3.6 * sgn))
        pts = [(8.0, 21.0 + 3.6 * sgn), (34.0, 21.0 + 3.0 * sgn), (37.0, 21.0 + 5.2 * sgn), (30.0, 21.0 + 6.4 * sgn),
               (10.0, 21.0 + 6.4 * sgn)]
        g = Geo().slab(pts, 0.0, 2.4)
        rig.part(name, g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
        g = Geo().capsule((12.0, -1.5, 21.0 + 5.4 * sgn), (32.0, -1.5, 21.0 + 5.2 * sgn), 0.7)
        rig.part(name, g, glow=K.MINT, outline=0)
    for i, x in enumerate(TL_LIGHTS):
        rig.joint(f"light{i}", "gun", (x, -3.2, 22.0), hidden=True)
        g = Geo().sphere((x, -3.4, 22.2), 2.0, cuts=3)
        rig.part(f"light{i}", g, glow=K.VIOLET_CORE, outline=0.6, outline_hex=K.VIOLET_GLOW)
    g = Geo().sphere((40.5, 0, 21), 2.0, cuts=3)
    rig.part("gun", g, glow=K.VIOLET_CORE, outline=0.6, outline_hex=K.VIOLET)
    g = Geo().blob((-8, 0, 23), (5.0, 5.4, 4.6), p=3.0)
    rig.part("gun", g, team=True)
    g = Geo().lathe([(0, -3.4), (5.0, -3.2), (5.0, 3.2), (0, 3.4)], (17.0, 0, 21), (18.0, 0, 21), segs=6)
    g.lathe([(0, -1.8), (4.4, -1.6), (4.4, 1.6), (0, 1.8)], (29.0, 0, 21), (30.0, 0, 21), segs=6)
    rig.part("gun", g, team=True, outline=0.4)
    pod_eye(rig, "gun", (-8, 0, 23), (5.0, 5.4, 4.6), x0=-5.2, z_top=26.0, z_bot=21.4, eye_at=(-3.6, 23.9),
            rx=1.3, rz=1.7, color=K.MINT, core=K.MINT_CORE)
    glow_flash(rig, "gun", TL_MUZ, K.VIOLET_GLOW, K.VIOLET_CORE, 1.2, points=4)


def tachyon_idle(f):
    w = math.sin(2 * math.pi * f / 6)
    pose = {"gun": {"r": 0.6 * w}, "rail_t": {"z": 0.3 * w}, "rail_b": {"z": -0.3 * w}}
    pose[f"light{f % 3}"] = {"show": True}
    if f == 5:
        pose.update(KF.glyph("g_blink"))
    return pose


def tachyon_fire(f):
    spread = [2.2, 2.6, 1.2, 0.4, 0.0][f]
    pose = {"gun": {"x": [-1.0, -4.0, -2.4, -0.8, 0][f], "sz": [0.96, 1.1, 1.03, 1.0, 1.0][f]},
            "head": {"r": [-1, 2, 1, 0.3, 0][f]},
            "rail_t": {"z": spread}, "rail_b": {"z": -spread}}
    if f == 0:
        for i in range(3):
            pose[f"light{i}"] = {"show": True}
    pose.update(KF.glyph(["g_angry", "g_squint", "g_squint", "eyes", "eyes"][f]))
    return pose


TL_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "gun", "point": (41.0, 0, 21.0), "radii_lu": (4.5, 7.5), "a0": -110.0,
         "a1": 110.0, "color": K.VIOLET_CORE}],
    1: [{"kind": "burst", "joint": "gun", "point": (43.0, 0, 21.0), "r0_lu": 6.0, "r1_lu": 11.0, "n": 5,
         "a0": -60.0, "arc": 120.0, "color": K.VIOLET_CORE}]}}


TURRETS = [
    turret_module("ion_turret", "Ion Turret", "cosmic", 30, CANVAS, FEET, (0, 20), ION_MUZ, ion_build,
                  ion_idle, ion_fire, muzzle_joint="gun", fire_kind="beam", idle_frames=6, overlays=ION_OVERLAYS),
    turret_module("starburst_gun", "Starburst Gun", "cosmic", 34, CANVAS, FEET, (0, 20), SB_MUZ,
                  starburst_build, starburst_idle, starburst_fire, muzzle_joint="gun", idle_frames=6,
                  overlays=SB_OVERLAYS),
    turret_module("starfall_battery", "Starfall Battery", "cosmic", 38, CANVAS, FEET, (0, 14),
                  (SHARD[0] + 2, 0, SHARD[2] + 8), starfall_build, starfall_idle, starfall_fire, aim=(0, 0),
                  muzzle_joint="gun", idle_frames=6, overlays=SF_OVERLAYS),
    turret_module("tachyon_lance", "Tachyon Lance", "cosmic", 30, (300, 230), FEET, (0, 21), TL_MUZ,
                  tachyon_build, tachyon_idle, tachyon_fire, muzzle_joint="gun", fire_kind="beam", idle_frames=6,
                  overlays=TL_OVERLAYS),
]
