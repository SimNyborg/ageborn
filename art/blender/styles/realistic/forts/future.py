"""Future forts, realistic style (DESIGN A16.14.4): Hardlight Barrier, Sentry Pylon, Clone Bay, Grav Mire.
Suit polymer, brushed alloy and small mint emissive strips (the A11 colour rule keeps glows small); team
colour on the hardlight field itself, the pylon band, the bay's hull stripe and the mire's marker.
"""
import math
import random

import bmesh

from lib import core as C
from lib import mats as M
import kit as K
import parts as P

AGE = "future"


def _strip(f, a, b, mat, r=0.45, fam="body", lo=0, hi=9):
    f.add(C.tube("strip", [a, b], [r, r], mat, seg=6), fam, lo, hi)


# ================================================================================== Hardlight Barrier
def _hardlight(f):
    m, rnd = f.m, random.Random(71)
    alloy, suit = m["alloy"], m["suit"]
    f.add(C.box("rail", 10, 66, 4, suit, bevel=0.8, loc=(0, 0, 2)), "body", 0, 2)
    f.add(C.box("rail_b", 10, 30, 3, suit, bevel=0.8, loc=(2, -16, 1.5), rot=(0, 0.05, 0.1)), "body", 3, 3)
    for y in (-31.0, 31.0):
        hi = 3 if y < 0 else 2
        f.add(C.box(f"pylon{y}", 8, 7, 60, suit, bevel=1.2, loc=(0, y, 30)), "body", 0, hi)
        f.add(C.box(f"cap{y}", 10, 9, 3, alloy, bevel=0.8, loc=(0, y, 61)), "body", 0, hi)
        _strip(f, (4.2, y - 2.2, 8), (4.2, y - 2.2, 56), m["glow_mint"], lo=0, hi=hi)
        _strip(f, (4.2, y + 2.2, 8), (4.2, y + 2.2, 56), m["glow_mint"], lo=0, hi=min(hi, 1))
        if hi == 2:
            f.add(C.box(f"pylonf{y}", 8, 7, 40, suit, bevel=1.2, loc=(14, y - 6, 4), rot=(0, math.pi / 2 - 0.1, 0.3)), "body", 3, 3)
    # the hardlight field: team-tinted tiles in a lattice, flickering away stage by stage
    rows, cols = 4, 5
    for r in range(rows):
        for c in range(cols):
            y = -27 + (c + 0.5) * 54 / cols
            z = 6 + (r + 0.5) * 50 / rows
            edge = abs(c - (cols - 1) / 2) / ((cols - 1) / 2)

            def make(sfx, fallen, y=y, z=z, r=r, c=c):
                return C.box(f"tile{r}{c}", 1.2, 54 / cols - 0.6, 50 / rows - 0.6, m["team_metal"], bevel=0.2, loc=(0, y, z))
            st = P.stage_for((r + 1) / rows, edge, rnd, keep=0.05)
            f.add(make("", False), "body", 0, st - 1 if st < 9 else 3, team=True)
    for c in range(cols + 1):
        y = -27 + c * 54 / cols
        f.add(C.box(f"latv{c}", 1.6, 0.8, 50, alloy, bevel=0.2, loc=(0.2, y, 31)), "body", 0, 1)
    for r in range(rows + 1):
        z = 6 + r * 50 / rows
        f.add(C.box(f"lath{r}", 1.6, 54, 0.8, alloy, bevel=0.2, loc=(0.2, 0, z)), "body", 0, 1 if r > 0 else 3)
    f.add(C.box("topbar", 4, 56, 2.4, alloy, bevel=0.5, loc=(0, 0, 57.5)), "body", 0, 1)
    _strip(f, (2.2, -27, 58.8), (2.2, 27, 58.8), m["glow_mint"], r=0.5, lo=0, hi=1)
    K.flag_pole(f, alloy, m["glow_mint"], r=0.8)
    K.banner_cloth(f, m["team_metal"], width=10.0)
    # rubble: pylon stumps and bent rail pieces
    for y in (-31.0, 31.0):
        f.add(C.box(f"rstump{y}", 8, 7, 10, suit, bevel=1.0, loc=(0, y, 5)), "rubble")
    for k in range(5):
        f.add(C.box(f"rpiece{k}", 9, 12, 3, suit, bevel=0.8, loc=(rnd.uniform(-6, 20), rnd.uniform(-24, 24), 1.5), rot=(0, 0, rnd.uniform(-1, 1))), "rubble")
    # scaffold: a printer gantry (two alloy frames and a crossbeam) over the rail
    for y in (-34, 34):
        f.add(C.box("gantry", 3, 3, 70, alloy, bevel=0.4, loc=(-10, y, 35)), "scaffold")
        f.add(C.box("gantryb", 3, 3, 70, alloy, bevel=0.4, loc=(10, y, 35)), "scaffold")
    f.add(C.box("gbeam", 24, 3, 3, alloy, bevel=0.4, loc=(0, 0, 70)), "scaffold")
    f.add(C.box("gbeam2", 3, 70, 3, alloy, bevel=0.4, loc=(0, 0, 70)), "scaffold")
    f.add(C.box("head", 6, 6, 5, suit, bevel=0.6, loc=(0, 6, 66)), "scaffold")
    f.add(C.sphere("nozzle", 1.2, m["glow_mint"], loc=(0, 6, 62.5)), "scaffold")


HARDLIGHT = K.make("hardlight_barrier", "Hardlight Barrier", AGE, "wall", _hardlight, canvas=(136, 118), feet=(68, 16), yaw=-44.0,
                   height=90, hit=(2, 32), material="energy", flag=(-10.0, 0.0, 0.0, 84.0), flag_len=20.0, foot=28.0)


# ================================================================================== Sentry Pylon (crewless)
def _sentry(f):
    m, rnd = f.m, random.Random(73)
    alloy, suit = m["alloy"], m["suit"]
    for k in range(3):
        a = 2 * math.pi * k / 3 + 0.4
        f.add(C.tube(f"leg{k}", [(14 * math.cos(a), 12 * math.sin(a), 0), (5 * math.cos(a), 4 * math.sin(a), 14)], [1.8, 1.4], alloy, seg=8), "body", 0, 3 if k else 2)
        f.add(C.cyl(f"foot{k}", 2.8, 2.8, 1.4, suit, seg=10, loc=(14 * math.cos(a), 12 * math.sin(a), 0)), "body")
    # the column: stacked polymer segments with a team band (the camera side can break away)
    segs = [(10, 8.0, 6.8), (22, 7.0, 6.0), (34, 6.2, 5.4)]
    for i, (z, r0, r1) in enumerate(segs):
        o = C.cyl(f"col{i}", r0, r1, 11.6, suit, seg=16, loc=(0, 0, z))
        f.add(o, "body", 0, 3 if i == 0 else (2 if i == 1 else 1))
        f.add(C.cyl(f"ring{i}", r1 + 0.5, r1 + 0.5, 1.0, alloy, seg=16, loc=(0, 0, z + 11.2)), "body", 0, 3 if i == 0 else (2 if i == 1 else 1))
    f.add(C.cyl("band", 7.3, 6.5, 6, m["team_metal"], seg=16, loc=(0, 0, 24)), "body", 0, 2, team=True)
    f.add(C.cyl("col_b", 6.2, 5.4, 8, suit, seg=16, loc=(4, 2, 18), rot=(0.4, 0.5, 0)), "body", 2, 3)
    # the sensor head with its visor and twin barrels toward the lane
    hz = 47.0
    head = C.blobs("head", [((0, 0, hz + 5), (8.5, 7.5, 6.0)), ((2, 0, hz + 5.5), (7, 6, 4.5))], suit, res=0.6)
    f.add(head, "body", 0, 1)
    f.add(C.box("visor", 1.2, 9, 2.4, m["glass"], bevel=0.3, loc=(8.8, 0, hz + 6.5)), "body", 0, 1)
    _strip(f, (9.6, -3.4, hz + 6.5), (9.6, 3.4, hz + 6.5), m["glow_mint"], r=0.5, lo=0, hi=1)
    for s in (-1.6, 1.6):
        f.add(C.cyl(f"barrel{s}", 1.0, 0.9, 12, alloy, seg=10, loc=(7, s, hz + 3.8), rot=(0, math.pi / 2, 0)), "body", 0, 1)
    f.add(C.blobs("head_d", [((10, -6, 3.4), (8.5, 7.5, 5.0))], suit, res=0.6), "body", 2, 3)
    f.add(C.cyl("antenna", 0.4, 0.3, 10, alloy, seg=6, loc=(-4, 2, hz + 9)), "body", 0, 1)
    f.add(C.sphere("tip", 0.8, m["glow_mint"], loc=(-4, 2, hz + 19.4)), "body", 0, 1)
    K.flag_pole(f, alloy, m["glow_mint"], r=0.6)
    K.banner_cloth(f, m["team_metal"], width=7.0)
    P.rubble_heap(f, (2, -4, 0), (14, 10), suit, rnd, n=8, size=(2.5, 5))
    f.add(C.cyl("rbase", 8, 6.8, 6, suit, seg=16), "rubble")
    for y in (-10, 10):
        for x in (-12, 12):
            f.add(C.box("sg", 2, 2, 62, alloy, bevel=0.3, loc=(x, y, 31)), "scaffold")
    f.add(C.box("sgb", 26, 2, 2, alloy, bevel=0.3, loc=(0, -10, 62)), "scaffold")
    f.add(C.box("sgb2", 2, 22, 2, alloy, bevel=0.3, loc=(12, 0, 62)), "scaffold")
    f.add(C.box("sgb3", 26, 2, 2, alloy, bevel=0.3, loc=(0, 10, 62)), "scaffold")
    f.add(C.box("sarm", 3, 3, 12, suit, bevel=0.4, loc=(0, 0, 56)), "scaffold")
    f.add(C.sphere("snozzle", 1.2, m["glow_mint"], loc=(0, 0, 49.5)), "scaffold")


SENTRY_PYLON = K.make("sentry_pylon", "Sentry Pylon", AGE, "tower", _sentry, canvas=(92, 100), feet=(46, 14), yaw=-12.0,
                      height=72, hit=(0, 30), material="metal", flag=(-9.0, 8.0, 14.0, 42.0), flag_len=12.0, foot=16.0,
                      muzzle=(19.0, 0.0, 50.8))


# ================================================================================== Clone Bay
def _clone_bay(f):
    m, rnd = f.m, random.Random(75)
    alloy, suit, cer = m["alloy"], m["suit"], m["ceramic"]
    L = 46.0
    # the hull: a rounded capsule of panels (camera side breaks)
    n = 6
    for i in range(n):
        x = -L / 2 + (i + 0.5) * L / n
        for half in range(2):
            y = -8 if half == 0 else 8

            def make(sfx, fallen, x=x, y=y, i=i, half=half):
                if fallen:
                    return C.box(f"hullf{i}{half}", L / n, 12, 2, cer, bevel=1.0, loc=(x + rnd.uniform(6, 16), -22 - rnd.uniform(0, 10), 1.2), rot=(0, 0, rnd.uniform(-0.6, 0.6)))
                return C.box(f"hull{i}{half}", L / n - 0.4, 16, 26, cer if half == 0 else suit, bevel=4.0, loc=(x, y, 13))
            if half == 0:
                P.breakable(f, make, 0.55, abs(i - (n - 1) / 2) / ((n - 1) / 2), rnd, fall_to=True, keep=0.1)
            else:
                f.add(make("", False), "body")
    f.add(C.box("inner", L - 2, 28, 22, M.dark("#15181c", name="inside"), bevel=1.0, loc=(0, 0, 12)), "body")
    f.add(C.box("roof", L + 2, 30, 3, suit, bevel=1.2, loc=(0, 0, 27)), "body", 0, 2)
    f.add(C.box("stripe", L - 4, 1.0, 4.0, m["team_metal"], bevel=0.3, loc=(0, -16.4, 17)), "body", 0, 1, team=True)
    f.add(C.box("stripe_t", L * 0.4, 1.0, 4.0, m["team_metal"], bevel=0.3, loc=(-10, -16.4, 17)), "body", 2, 2, team=True)
    for k in range(4):
        _strip(f, (-L / 2 + 6 + k * 10, -16.6, 8), (-L / 2 + 6 + k * 10, -16.6, 11), m["glow_mint"], r=0.5, lo=0, hi=1)
    # pipes and tanks at the back, an antenna
    for k in range(3):
        f.add(C.cyl(f"tank{k}", 3.4, 3.4, 18, alloy, seg=14, loc=(-L / 2 - 4, -8 + k * 7, 0)), "body", 0, 2)
    f.add(C.tube("pipe", [(-L / 2 - 4, 6, 18), (-L / 2 + 2, 6, 24), (L / 2 - 4, 6, 28.5)], [1.0, 1.0, 1.0], alloy, seg=8), "body", 0, 1)
    f.add(C.cyl("antenna", 0.4, 0.3, 18, alloy, seg=6, loc=(-10, 8, 28.5)), "body", 0, 1)
    f.add(C.sphere("anttip", 0.8, m["glow_mint"], loc=(-10, 8, 47)), "body", 0, 1)
    # the sliding door on the lane end: closed, half, open on the lit bay
    for fr, open_ in enumerate((0.0, 0.5, 1.0)):
        if fr > 0:
            f.add(C.box(f"doorhole{fr}", 1.0, 11, 18, m["glow_mint"] if fr == 2 else M.dark("#1c2a28", name="bayglow"), bevel=0.2, loc=(L / 2 + 0.8, -1, 9)), "door", fr, fr)
        f.add(C.box(f"leaf{fr}", 1.2, 11, 18, alloy, bevel=0.4, loc=(L / 2 + 1.6, -1 - 11 * open_, 9)), "door", fr, fr)
    f.add(C.box("doorframe", 2.4, 14, 21, suit, bevel=0.5, loc=(L / 2 + 0.2, -1, 10.5)), "body", 0, 2)
    K.flag_pole(f, alloy, m["glow_mint"], r=0.8)
    K.banner_cloth(f, m["team_metal"], width=9.0)
    for k in range(8):
        f.add(C.box(f"rpanel{k}", 8, 12, 2, cer if k % 2 else suit, bevel=1.0, loc=(rnd.uniform(-20, 20), rnd.uniform(-12, 10), 1.2 + k * 0.3), rot=(0, 0, rnd.uniform(-1, 1))), "rubble")
    f.add(C.box("rpanelT", 14, 6, 1.4, m["team_metal"], bevel=0.3, loc=(8, -14, 1.2), rot=(0, 0, 0.4)), "rubble", team=True)
    for x in (-L / 2 - 2, L / 2 + 2):
        for y in (-18, 18):
            f.add(C.box("sg", 2, 2, 34, alloy, bevel=0.3, loc=(x, y, 17)), "scaffold")
    f.add(C.box("sgb", L + 6, 2, 2, alloy, bevel=0.3, loc=(0, -18, 34)), "scaffold")
    f.add(C.box("sgb2", L + 6, 2, 2, alloy, bevel=0.3, loc=(0, 18, 34)), "scaffold")
    f.add(C.box("shead", 6, 6, 5, suit, bevel=0.6, loc=(6, 0, 31)), "scaffold")
    f.add(C.sphere("snozzle", 1.2, m["glow_mint"], loc=(6, 0, 27.5)), "scaffold")


CLONE_BAY = K.make("clone_bay", "Clone Bay", AGE, "camp", _clone_bay, canvas=(130, 96), feet=(66, 16), yaw=-24.0,
                   height=70, hit=(0, 14), material="metal", flag=(-30.0, 16.0, 0.0, 58.0), flag_len=18.0, foot=30.0)


# ================================================================================== Grav Mire (trap)
def _grav(f):
    m, rnd = f.m, random.Random(77)
    fam = "trap"
    alloy, suit = m["alloy"], m["suit"]
    lilac = M.glow("#c8a8ff", 3.0, name="glow_lilac_dim")
    # the emitter plate (all states), the unpacked case (0)
    f.add(C.cyl("plate", 13, 14, 1.6, suit, seg=6, loc=(0, 0, 0)), fam, 0, 2)
    f.add(C.cyl("platecore", 3.4, 3.8, 2.4, alloy, seg=12, loc=(0, 0, 0)), fam, 0, 2)
    f.add(C.box("case", 12, 8, 5, alloy, bevel=0.8, loc=(-20, 8, 2.5)), fam, 0, 0)
    # armed: a faint lilac core and a thin ring; sprung: a bright core and tall rings
    f.add(C.sphere("core1", 1.6, lilac, loc=(0, 0, 2.6)), fam, 1, 1)
    for k, (r, z) in enumerate(((10.0, 1.8), (18.0, 0.6))):
        pts = [(r * math.cos(a), r * 0.45 * math.sin(a), z) for a in [i * 2 * math.pi / 36 for i in range(37)]]
        f.add(C.tube(f"ring1_{k}", pts, [0.35] * 37, lilac, seg=5, caps=False), fam, 1, 1)
    f.add(C.sphere("core2", 2.8, m["glow_lilac"], loc=(0, 0, 3.2)), fam, 2, 2)
    for k, (r, z) in enumerate(((8.0, 4.0), (15.0, 7.0), (22.0, 3.0))):
        pts = [(r * math.cos(a), r * 0.45 * math.sin(a), z) for a in [i * 2 * math.pi / 36 for i in range(37)]]
        f.add(C.tube(f"ring2_{k}", pts, [0.5] * 37, m["glow_lilac"], seg=5, caps=False), fam, 2, 2)
    # spent: the plate cracked and dark
    f.add(C.cyl("plate_d", 13, 14, 1.2, suit, seg=6, loc=(0, 0, 0), rot=(0.04, 0.02, 0.3)), fam, 3, 3)
    for k in range(5):
        a = rnd.uniform(0, 6.28)
        f.add(C.box(f"shard{k}", 3, 2, 0.6, suit, bevel=0.1, loc=(16 * math.cos(a), 8 * math.sin(a), 0.4), rot=(0, 0, a)), fam, 3, 3)
    f.add(C.blobs("scorch", [((0, 0, 0.25), (16, 7, 0.4))], m["ash"], res=0.6), fam, 3, 3)
    P.marker_flag(f, m, alloy, m["team_metal"], at=(-24, 10), h=16)


GRAV_MIRE = K.make("grav_mire", "Grav Mire", AGE, "trap", _grav, canvas=(84, 52), feet=(42, 16), yaw=-12.0,
                   height=24, hit=(0, 6), material="energy", foot=28.0)


FORTS = [HARDLIGHT, SENTRY_PYLON, CLONE_BAY, GRAV_MIRE]
