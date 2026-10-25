"""Modern Age base skins as real models (PLAN 2c): `base.modern@<skin>`.

Desert Bunker (Rare, Wardrobe Crate; owner request 2026-10-08 "more base skins that are not just a
recolour"): the Bunker rebuilt as a desert outpost. A tall tapering adobe watchtower with wooden beam ends,
small dark windows and a rounded parapet stands over a corrugated Quonset hangar whose arched front faces
the lane; a sandbagged round pillbox tower in desert camouflage guards the gate. Behind them rise a water
tower on lattice legs and a radio mast flying a team windsock; a palm leans over the hangar and a small one
grows by the crates. Sand dunes drift against the walls, a desert camouflage net hangs over the hangar's
shoulder, sandbag walls, fuel drums and jerrycans lie about.

Footprint, height band and the four mounts are the Bunker's (common.BASE_MOUNTS): a sandbagged gun pit on a
pillbox by the gate, a sandbagged balcony on the watchtower, the pillbox tower's top and the watchtower's
roof. Team colour: the windsock, the stripe on the hangar arch, the watchtower's banner, the water tank's
band, the pillbox roundel and the flags.

Crumble: 75% cracks, a merlon and a sandbag knocked off, rubble; 50% fire in the hangar door and a tower
window, soot, the windows dark, the camouflage net torn, the windsock in tatters, the water tank leaking; 25%
a breach in the hangar arch with a bent sheet, the radio mast bent, the water tank slumped, the big palm's
crown snapped, a second fire. Treasury: supply crates and jerrycans (1), fuel drums (2), an ammo crate stack
with a gold-banded case (3).
"""
import math
import random

from ageborn_art.geometry import Geo

from world.base_skins_kit import flames, icicles, leaf, snow_pillow
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, prop_loop, rock,
                          rubble, topple_lu)

SAND = "#CDB88A"        # concrete rendered in sand (large areas)
SAND_LT = "#DCC9A0"
SAND_DK = "#B39E72"
SAND_DKR = "#9A865E"
ADOBE = "#C8A27C"       # the watchtower's mud render
ADOBE_LT = "#D6B48F"
ADOBE_DK = "#AE8963"
DUNE = "#E2CE9E"
DUNE_DK = "#CDB683"
CAMO_A = "#A88F62"
CAMO_B = "#8E7650"
TIN = "#B9B2A0"         # the hangar's sun-bleached corrugated sheet
TIN_LT = "#C9C3B2"
TIN_DK = "#958F80"
BAG = "#C9B48A"         # sandbags
BAG_DK = "#AE9A72"
WOOD = "#7A5F48"
WOOD_DK = "#5E4836"
OLIVE = "#7C7D58"
OLIVE_DK = "#62634A"
STEEL = "#8C949C"
STEEL_LT = "#A9B0B6"
GUNMETAL = "#3A3F45"
PALM = "#8A6E4E"
PALM_DK = "#6E5640"
FROND = "#6E8C3E"
FROND_LT = "#86A24C"
DRUM = "#7A6A4E"
CREAM = "#EDEAE0"
SIGNAL = "#B0306A"
WATER = "#7FB2C8"
HOLE = "#1E1C1C"
CRACK = "#5A4C3A"
SOOT = "#5E5854"

DEPTHS = [-40, -24, -40, -24]
WT = (-58.0, -6.0, 26.0, 21.0)       # watchtower: x, y, half size at the foot, at the top
WT_H = 252.0                         # its roof (the M3 pit sits on its front edge)
PB = (-6.0, -20.0, 17.0)             # pillbox tower at the lane edge: x, y, radius
HG = (-112.0, -30.0, 52.0, 78.0)     # hangar: centre x, front y, half width, length (along y)
HG_BASE = 12.0                       # its plinth
HG_RZ = 1.12                         # its arch is a little taller than wide
WTR = (-160.0, 58.0)                 # water tower (behind the hangar)
MAST = (-128.0, 54.0)                # radio mast with the windsock


def sandbag_row(g, x0, x1, y, z, rows=2, seed=0, rot_z=0.0):
    """Rows of sandbags along x on the plane y (staggered)."""
    rnd = random.Random(seed)
    for r in range(rows):
        n = max(1, int((x1 - x0) // 9))
        for k in range(n):
            x = x0 + 4.5 + k * 9 + (4.5 if r % 2 else 0)
            if x > x1 - 3:
                continue
            g.blob((x, y + rnd.uniform(-0.6, 0.6), z + 3 + r * 5.4), (5.2, 4.2, 3.0), p=2.6, rot=(0, rnd.uniform(-6, 6), rot_z))
    return g


def palm(rig, joint, base, top, fronds=7, size=26.0, seed=0, trunk_r=3.4, crown_joint=None, split_z=None):
    """A palm: a ringed curving trunk and arching fronds (two greens) with a few coconuts. With `crown_joint`,
    the crown and the trunk above `split_z` go on that joint (it snaps off)."""
    cj = crown_joint or joint
    rnd = random.Random(seed)
    bx, by, bz = base
    tx, ty, tz = top
    pts = []
    for i in range(9):
        t = i / 8
        bend = math.sin(t * math.pi) * 6.0
        pts.append((bx + (tx - bx) * t + bend * 0.4, by + (ty - by) * t, bz + (tz - bz) * t))
    lo, hi = Geo(), Geo()

    def upper(z):
        return crown_joint is not None and split_z is not None and z > split_z

    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        (hi if upper((a[2] + b[2]) / 2) else lo).capsule(a, b, trunk_r * (1.15 - 0.35 * i / 8), trunk_r * (1.15 - 0.35 * (i + 1) / 8),
                                                         segs=12, rings=2)
    rig.part(joint, lo, PALM)
    if crown_joint is not None:
        rig.part(cj, hi, PALM)
    lo, hi = Geo(), Geo()
    for i in range(1, 16):
        t = i / 16
        k = int(t * 8)
        a, b = pts[k], pts[min(8, k + 1)]
        f = t * 8 - k
        p = tuple(a[j] + (b[j] - a[j]) * f for j in range(3))
        r = trunk_r * (1.15 - 0.35 * t) + 0.3
        (hi if upper(p[2]) else lo).lathe([(r - 0.6, -0.5), (r + 0.25, 0), (r - 0.6, 0.5)], p, (p[0], p[1], p[2] + 1), segs=12)
    rig.part(joint, lo, PALM_DK, outline=0, highlight=False)
    if crown_joint is not None:
        rig.part(cj, hi, PALM_DK, outline=0, highlight=False)
    gd, gl = Geo(), Geo()
    for k in range(fronds):
        ang = 360.0 * k / fronds + rnd.uniform(-12, 12)
        a = math.radians(ang)
        L = size * rnd.uniform(0.85, 1.1)
        spine = []
        for i in range(7):
            t = i / 6
            spine.append((tx + math.cos(a) * L * t, ty + math.sin(a) * L * t * 0.6, tz + 4 + L * 0.32 * t - L * 0.62 * t * t))
        target = gd if k % 2 else gl
        for p0, p1 in zip(spine, spine[1:]):
            target.capsule(p0, p1, 0.8, 0.6, segs=6, rings=1)
        for i in range(1, 7):
            p, q = spine[i], spine[i - 1]
            s = 1.0 - i / 7
            da = math.degrees(math.atan2(p[2] - q[2], p[0] - q[0]))
            for side in (-1, 1):
                leaf(target, p, L * 0.22 * (0.45 + s), L * 0.085, da + side * 55, tilt=-30)
    rig.part(cj, gd, FROND, finish="hair", outline=0.5)
    rig.part(cj, gl, FROND_LT, finish="hair", outline=0.5)
    g = Geo()
    for k in range(3):
        a = math.radians(120 * k + 30)
        g.sphere((tx + math.cos(a) * 2.6, ty + math.sin(a) * 2.0 - 1.5, tz - 1.0), 2.0, cuts=2)
    rig.part(cj, g, "#6B4E34", outline=0.4)


def dune(rig, joint, c, r, seed=0):
    """A drift of sand: a soft mound with ripple lines."""
    rnd = random.Random(seed)
    x, y, z = c
    g = Geo().blob((x, y, z), r, p=2.2, cuts=5, rot=(0, 0, rnd.uniform(-10, 10)))
    g.clip((0, 0, 0.3), (0, 0, -1))
    rig.part(joint, g, DUNE, finish="hair")
    g = Geo()
    for k in range(3):
        e = 0.35 + 0.18 * k
        zz = z + r[2] * e
        w = r[0] * math.sqrt(max(0.05, 1 - e * e)) * 0.8
        pts = [(x - w + 2 * w * i / 6, y - r[1] * math.sqrt(max(0.05, 1 - e * e)) * 0.98, zz + math.sin(i * 1.3 + k) * 0.8) for i in range(7)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.45, segs=6, rings=1)
    rig.part(joint, g, glow=DUNE_DK, outline=0)


def camo(rig, joint, spots, seed=0):
    """Desert camouflage blotches on a surface facing -Y: spots = [(x, y, z, rx, rz)]."""
    rnd = random.Random(seed)
    ga, gb = Geo(), Geo()
    for i, (x, y, z, rx, rz) in enumerate(spots):
        (ga if i % 2 else gb).blob((x, y, z), (rx, 0.6, rz), p=2.0, cuts=3, rot=(0, rnd.uniform(-30, 30), 0))
    rig.part(joint, ga, CAMO_A, outline=0, highlight=False)
    rig.part(joint, gb, CAMO_B, outline=0, highlight=False)


def hangar(rig, M):
    hx, fy, hw, L = HG
    R = hw
    # the plinth and the arched corrugated hull (a half cylinder along y), clipped at its plinth
    g = Geo()
    box(g, (hx, fy + L / 2, HG_BASE / 2), (hw + 4, L / 2 + 2, HG_BASE / 2), p=6)
    rig.part("body", g, SAND_DK)
    g = Geo().lathe([(0, 0), (R, 0), (R, L), (0, L)], (hx, fy, HG_BASE), (hx, fy + 1, HG_BASE), segs=44, squash=(1.0, HG_RZ))
    g.clip((0, 0, HG_BASE), (0, 0, -1))
    rig.part("body", g, TIN)
    # corrugation: flat dark arcs over the roof every few units along its length
    g = Geo()
    for k in range(1, 11):
        yy = fy + 3 + k * (L - 6) / 11
        pts = [(hx + math.cos(math.radians(a)) * (R + 0.2), yy, HG_BASE + math.sin(math.radians(a)) * (R + 0.2) * HG_RZ)
               for a in range(8, 173, 8)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.5, segs=6, rings=1)
    rig.part("body", g, glow=TIN_DK, outline=0)
    # the front end wall (a little inset), its rim, big sliding doors and a team stripe along the arch
    arch = [(hx + math.cos(math.radians(a)) * (R - 0.8), HG_BASE + math.sin(math.radians(a)) * (R - 0.8) * HG_RZ) for a in range(0, 181, 6)]
    g = Geo().slab(arch, fy + 1.2, 2.0)
    rig.part("body", g, SAND)
    g = Geo()
    for i in range(len(arch) - 1):
        a0 = math.radians(i * 6)
        a1 = math.radians((i + 1) * 6)
        p = [(hx + math.cos(a0) * (R + 1.0), HG_BASE + math.sin(a0) * (R + 1.0) * HG_RZ),
             (hx + math.cos(a1) * (R + 1.0), HG_BASE + math.sin(a1) * (R + 1.0) * HG_RZ),
             (hx + math.cos(a1) * (R - 3.0), HG_BASE + math.sin(a1) * (R - 3.0) * HG_RZ),
             (hx + math.cos(a0) * (R - 3.0), HG_BASE + math.sin(a0) * (R - 3.0) * HG_RZ)]
        g.slab(p, fy - 0.4, 1.8)
    rig.part("body", g, TIN_DK, finish="metal", outline=0.4)
    g = Geo()
    for i in range(30):
        a0 = math.radians(18 + i * 4.8)
        a1 = math.radians(18 + (i + 1) * 4.8)
        p = [(hx + math.cos(a0) * (R - 3.4), HG_BASE + math.sin(a0) * (R - 3.4) * HG_RZ),
             (hx + math.cos(a1) * (R - 3.4), HG_BASE + math.sin(a1) * (R - 3.4) * HG_RZ),
             (hx + math.cos(a1) * (R - 9.0), HG_BASE + math.sin(a1) * (R - 9.0) * HG_RZ),
             (hx + math.cos(a0) * (R - 9.0), HG_BASE + math.sin(a0) * (R - 9.0) * HG_RZ)]
        g.slab(p, fy - 0.2, 1.2)
    rig.part("body", g, team=True)
    # doors: two olive sliding leaves on a rail, a dark gap between them, a small personnel door
    dz = 40.0
    g = Geo()
    box(g, (hx - 11, fy - 1.0, HG_BASE + dz / 2), (10.5, 1.2, dz / 2), p=6)
    box(g, (hx + 11, fy - 1.0, HG_BASE + dz / 2), (10.5, 1.2, dz / 2), p=6)
    rig.part("body", g, OLIVE, finish="metal")
    g = Geo()
    for sx in (-1, 1):
        for zz in (HG_BASE + 12, HG_BASE + 28):
            box(g, (hx + sx * 11, fy - 2.4, zz), (9.5, 0.4, 0.6), p=4, cuts=2)
    box(g, (hx, fy - 2.6, HG_BASE + dz + 1.6), (24, 0.8, 1.2), p=4, cuts=2)
    rig.part("body", g, OLIVE_DK, finish="metal", outline=0)
    g = Geo()
    box(g, (hx, fy - 0.4, HG_BASE + dz / 2 - 1), (1.0, 0.8, dz / 2 - 1), p=4, cuts=2)
    rig.part("lit", g, glow="#FFD89A", outline=0)
    g = Geo()   # a louvred vent above the doors
    box(g, (hx, fy - 0.6, HG_BASE + dz + 14), (11.0, 1.0, 5.0), p=5)
    rig.part("body", g, OLIVE_DK, finish="metal", outline=0.4)
    g = Geo()
    for k in range(4):
        box(g, (hx, fy - 1.8, HG_BASE + dz + 10.6 + k * 2.3), (9.6, 0.5, 0.5), p=4, cuts=2)
    rig.part("body", g, OLIVE, finish="metal", outline=0)
    # lamps over the doors
    for lx in (hx - 30, hx + 30):
        lz = HG_BASE + 34
        g = Geo()
        g.capsule((lx, fy - 0.6, lz + 4), (lx, fy - 5.0, lz + 4), 0.7)
        box(g, (lx, fy - 6.0, lz + 2.4), (2.6, 2.4, 1.8), p=4, cuts=2)
        rig.part("body", g, GUNMETAL, finish="metal", outline=0.4)
        g = Geo().blob((lx, fy - 6.4, lz + 0.6), (2.0, 1.4, 1.0), p=2.0)
        rig.part("lit", g, glow="#FFF1CE", outline=0)
    # the desert camouflage net over the hangar's left shoulder, with tufts (torn off at 50%)
    g = Geo()
    rock(g, (hx - 30, fy + 26, HG_BASE + R * HG_RZ * 0.78), (24, 26, 9), seed=5, jag=0.25, p=2.4)
    rig.part("body", g, CAMO_A, finish="hair")
    g = Geo()
    for k, (dx, dy, dz) in enumerate(((-38, 14, 44), (-24, 4, 56), (-40, 34, 50), (-16, 22, 62))):
        rock(g, (hx + dx, fy + dy, HG_BASE + dz), (6, 5, 2.6), seed=70 + k, jag=0.35, p=2.2)
    rig.part("tufts", g, CAMO_B, finish="hair", outline=0.4)
    g = Geo()
    for k in range(5):
        x = hx - 50 + k * 9
        g.capsule((x, fy + 6, HG_BASE + 30 + k * 2), (x - 4, fy - 4, HG_BASE + 6), 0.6, segs=6, rings=1)
    rig.part("body", g, OLIVE_DK, outline=0.3)


def watchtower(rig, M):
    x, y, r0, r1, = WT
    g = Geo()
    box(g, (x, y, WT_H / 2), (r0, r0, WT_H / 2), p=4.2, taper=(1.0, r1 / r0))
    rig.part("body", g, ADOBE)

    def half(z):
        return r0 + (r1 - r0) * z / WT_H

    # a darker plinth, render patches, wooden beam ends (vigas) in rows, small windows with lintels
    g = Geo()
    box(g, (x, y, 7), (r0 + 2.5, r0 + 2.5, 7), p=4.2)
    rig.part("body", g, ADOBE_DK)
    rnd = random.Random(3)
    g = Geo()
    for k in range(9):
        zz = rnd.uniform(24, WT_H - 20)
        hh = half(zz)
        g.blob((x + rnd.uniform(-hh + 6, hh - 6), y - hh - 0.2, zz), (rnd.uniform(4, 8), 0.8, rnd.uniform(3, 6)), p=2.2, cuts=3)
    rig.part("body", g, ADOBE_LT, outline=0, highlight=False)
    g, ge = Geo(), Geo()
    for zz in (96.0, 178.0, WT_H - 14):
        hh = half(zz)
        for k in range(5):
            bx = x - hh + 6 + k * (2 * hh - 12) / 4
            if zz < 120 and bx > x + 2:
                continue        # the M1 balcony sits there
            g.capsule((bx, y - hh + 4, zz), (bx, y - hh - 6, zz - 0.4), 2.0, 1.8, segs=10, rings=1)
            ge.sphere((bx, y - hh - 6.4, zz - 0.4), 1.3, cuts=1)
    rig.part("body", g, WOOD)
    rig.part("body", ge, WOOD_DK, outline=0, highlight=False)
    for wx, wz in ((x - 12, 150.0), (x + 8, 214.0), (x - 6, 46.0)):
        hh = half(wz)
        g = Geo()
        box(g, (wx, y - hh - 0.2, wz), (4.0, 1.2, 6.0), p=4, cuts=2)
        rig.part("body", g, HOLE, outline=0, highlight=False)
        g = Geo()
        box(g, (wx, y - hh - 0.8, wz - 0.6), (2.8, 0.6, 4.4), p=4, cuts=2)
        rig.part("lit", g, glow="#FFD89A", outline=0)
        g = Geo()
        box(g, (wx, y - hh - 1.4, wz + 7.4), (6.4, 2.0, 1.3), p=4, cuts=2)
        rig.part("body", g, WOOD, outline=0.4)
    # the rounded parapet (a merlon knocked off at 75%) and the team banner under it
    g, gm = Geo(), Geo()
    hh = half(WT_H)
    for k in range(5):
        mx = x - hh + 4 + k * (2 * hh - 8) / 4
        (gm if k == 0 else g).blob((mx, y + hh - 3, WT_H + 5), (4.2, 3.4, 5.0), p=3.0, cuts=2)
    for k in range(4):
        my = y - hh + 8 + k * (2 * hh - 16) / 3
        g.blob((x - hh + 3, my, WT_H + 5), (3.4, 4.2, 5.0), p=3.0, cuts=2)
    rig.part("body", g, ADOBE_LT)
    rig.part("merlon", gm, ADOBE_LT)
    g = Geo()
    box(g, (x, y, WT_H - 1.5), (hh + 2.0, hh + 2.0, 2.4), p=4)
    rig.part("body", g, ADOBE_DK)
    bx0, bx1 = x - hh + 4, x - hh + 18
    g = Geo().slab([(bx0, WT_H - 6), (bx1, WT_H - 6), (bx1, WT_H - 44), ((bx0 + bx1) / 2, WT_H - 50), (bx0, WT_H - 44)],
                   y - hh - 1.6, 1.4)
    rig.part("banner", g, team=True)
    g = Geo().capsule((bx0 - 2, y - hh - 2.6, WT_H - 5), (bx1 + 2, y - hh - 2.6, WT_H - 5), 1.1)
    rig.part("banner", g, WOOD_DK, outline=0.4)
    g = Geo()
    for k in range(5):
        a = math.radians(90 + 72 * k)
        g.blob(((bx0 + bx1) / 2 + math.cos(a) * 2.8, y - hh - 2.6, WT_H - 26 + math.sin(a) * 2.8), (1.6, 0.4, 1.2), p=2.0,
               rot=(0, 90 - math.degrees(a), 0))
    g.sphere(((bx0 + bx1) / 2, y - hh - 2.6, WT_H - 26), 1.3, cuts=1)
    rig.part("banner", g, CREAM, outline=0, highlight=False)
    # gun pits: the balcony (mount 1) and the roof's front edge (mount 3)
    platform(rig, "body", M[1], SAND_LT, ADOBE_DK, style="sandbag", r=(25, 19), accent=BAG)
    platform(rig, "body", M[3], SAND_LT, ADOBE_DK, style="sandbag", r=(25, 19), accent=BAG)
    g = Geo()   # timber props under the balcony
    for dx in (-16, 10):
        g.capsule((M[1][0] + dx, M[1][1] + 2, M[1][2] - 14), (M[1][0] + dx - 4, M[1][1] + 12, M[1][2] - 40), 1.8, segs=8, rings=1)
    rig.part("body", g, WOOD, outline=0.5)


def pillbox_tower(rig, M):
    x, y, r = PB
    top = M[2][2] - 4.0
    g = Geo()
    cyl(g, (x, y, 0), (x, y, top), r, r - 1.6, bevel=1.2, segs=30)
    rig.part("body", g, SAND)
    spots = []
    rnd = random.Random(7)
    for k in range(14):
        a = math.radians(rnd.uniform(205, 335))
        zz = rnd.uniform(16, top - 16)
        rr = r - 1.6 * zz / top + 0.3
        spots.append((x + math.cos(a) * rr, y + math.sin(a) * rr, zz, rnd.uniform(4, 7), rnd.uniform(3, 6)))
    camo(rig, "body", spots, seed=2)
    g = Geo()
    for z in (60.0, 128.0):
        rr = r - 1.6 * z / top + 1.4
        cyl(g, (x, y, z - 2.4), (x, y, z + 2.4), rr, bevel=0.6, segs=30)
    rig.part("body", g, SAND_DK)
    # a team roundel with a cream star, a vision slit, the steel door at the foot
    rz = 154.0
    ry = y - (r - 1.6 * rz / top) - 0.4
    g = Geo()
    cyl(g, (x, ry + 0.6, rz), (x, ry - 1.4, rz), 8.6, bevel=0.3, segs=28)
    rig.part("body", g, team=True)
    g = Geo().star((x, ry - 1.8, rz), 5.0, 2.1, 1.0, points=5)
    rig.part("body", g, CREAM, outline=0.3)
    g = Geo()
    box(g, (x, ry - 0.2, 98.0), (8.0, 1.2, 1.8), p=4, cuts=2)
    rig.part("body", g, HOLE, outline=0, highlight=False)
    g = Geo()
    box(g, (x, ry - 1.2, 101.6), (10.0, 2.6, 1.2), p=4, cuts=2)
    rig.part("body", g, SAND_LT, outline=0.4)
    g = Geo()
    box(g, (x - 4, y - r - 1.6, 17), (8, 1.8, 17), p=6)
    rig.part("body", g, GUNMETAL, finish="metal")
    g = Geo()
    box(g, (x + 1.5, y - r - 3.6, 17), (1.1, 1.0, 3.2), p=4, cuts=2)
    rig.part("body", g, STEEL, finish="metal", outline=0.3)
    # the gate pillbox (mount 0's pit) and the top pit (mount 2)
    x0, y0, z0 = M[0]
    g = Geo()
    box(g, (x0 - 6, y0 + 16, (z0 - 6) / 2), (26, 20, (z0 - 6) / 2), p=6, taper=(1.0, 0.88))
    rig.part("body", g, SAND_DK)
    camo(rig, "body", [(x0 - 18, y0 - 4.6, 30, 6, 5), (x0 - 2, y0 - 4.6, 18, 7, 4), (x0 + 8, y0 - 4.6, 40, 5, 4)], seed=4)
    g = Geo()
    box(g, (x0 - 4, y0 - 4.8, z0 - 26), (10, 1.2, 2.2), p=4, cuts=2)
    rig.part("body", g, HOLE, outline=0, highlight=False)
    platform(rig, "bag", M[0], SAND_LT, SAND_DKR, style="sandbag", r=(25, 19), accent=BAG)
    platform(rig, "body", M[2], SAND_LT, SAND_DKR, style="sandbag", r=(25, 19), accent=BAG)


def back(rig):
    # the water tower: four lattice legs, a tank with a team band and a conical cap (slumps at 25%)
    wx, wy = WTR
    g = Geo()
    for dx, dy in ((-11, -9), (11, -9), (-11, 11), (11, 11)):
        g.capsule((wx + dx * 1.2, wy + dy * 1.2, 0), (wx + dx * 0.8, wy + dy * 0.8, 150), 1.3, 1.1, segs=8, rings=1)
    for z in range(20, 150, 26):
        g.capsule((wx - 11, wy - 9, z), (wx + 11, wy - 9, z + 22), 0.5, segs=6, rings=1)
        g.capsule((wx + 11, wy - 9, z), (wx - 11, wy - 9, z + 22), 0.5, segs=6, rings=1)
    rig.part("tank", g, STEEL_LT, finish="metal", outline=0.4)
    g = Geo()
    cyl(g, (wx, wy, 150), (wx, wy, 184), 16.0, bevel=1.0, segs=28)
    rig.part("tank", g, SAND_LT)
    g = Geo()
    cyl(g, (wx, wy, 162), (wx, wy, 172), 16.6, bevel=0.4, segs=28)
    rig.part("tank", g, team=True)
    g = Geo().lathe([(0, 0), (17.6, 0), (16.8, 1.6), (6.0, 9.0), (0, 10.0)], (wx, wy, 184), segs=28)
    rig.part("tank", g, SAND_DK)
    g = Geo()
    for a, L in ((236, 10), (262, 16), (300, 8)):
        p = (wx + math.cos(math.radians(a)) * 16.4, wy + math.sin(math.radians(a)) * 16.4)
        g.capsule((p[0], p[1], 160), (p[0], p[1], 160 - L), 1.0, 0.4, segs=6, rings=1)
    rig.part("leak", g, glow=WATER, outline=0)
    # the radio mast with a beacon and the team windsock (in tatters at 50%), bent at 25%
    mx, my = MAST
    g = Geo().capsule((mx, my, 60), (mx, my, 304), 1.9, 1.2, segs=10, rings=2)
    for zz, w in ((262, 7.0), (278, 5.0)):
        g.capsule((mx - w, my - 0.6, zz), (mx + w, my - 0.6, zz), 0.55, segs=6, rings=1)
    for zz in (120.0, 190.0):
        cyl(g, (mx, my, zz - 1.2), (mx, my, zz + 1.2), 2.6, bevel=0.3, segs=12)
    rig.part("mast", g, STEEL_LT, finish="metal", outline=0.4)
    g = Geo().sphere((mx, my, 307), 2.8, cuts=3)
    rig.part("mast", g, glow="#F2A0C8", outline=0.6, outline_hex=SIGNAL)
    g = Geo()
    g.capsule((mx, my, 296), (mx - 6, my, 296), 0.7)
    rig.part("mast", g, STEEL_LT, finish="metal", outline=0.3)
    sock = Geo()
    for k in range(5):
        r0, r1 = 6.2 - 3.0 * k / 5, 6.2 - 3.0 * (k + 1) / 5
        sock.lathe([(r0, 0), (r1, 6.8)], (mx - 7 - 6.8 * k, my, 295 - 2.0 * k), (mx - 8 - 6.8 * k, my, 295 - 2.0 * k - 0.3), segs=16)
    rig.part("sock", sock, team=True)
    g = Geo()
    for k in (1, 3):
        r0 = 6.2 - 3.0 * k / 5 + 0.3
        g.lathe([(r0, 0), (r0 - 0.6, 6.8)], (mx - 7 - 6.8 * k, my, 295 - 2.0 * k), (mx - 8 - 6.8 * k, my, 295 - 2.0 * k - 0.3), segs=16)
    rig.part("sock", g, CREAM, outline=0.3)
    g = Geo()
    sock2 = [(mx - 7, 300.5), (mx - 22, 296), (mx - 17, 291), (mx - 27, 286), (mx - 10, 289.5), (mx - 7, 290)]
    g.slab(sock2, my, 1.0)
    rig.part("sockrag", g, team=True, outline=0.4)



def build(rig, M):
    for j, pos in (("mast", (MAST[0], MAST[1], 70)), ("tank", (WTR[0], WTR[1], 0)), ("bag", (M[0][0], M[0][1], M[0][2])),
                   ("palmtop", (-152.6, 37.6, 92.0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "fire1", "fire2", "scorch", "breach", "spill",
              "leak", "sockrag", "palmstump"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    for j in ("lit", "tufts", "wallbag", "sock", "banner", "merlon"):
        rig.joint(j, "body", (0, 0, 0))

    back(rig)
    # the big palm behind the hangar's left shoulder (its crown snaps at 25%)
    palm(rig, "body", (-150.0, 40.0, 0.0), (-154.0, 36.0, 130.0), fronds=10, size=24.0, seed=4, crown_joint="palmtop",
         split_z=92.0)
    g = Geo()
    for k, (dx, dz) in enumerate(((0, 0), (-1.5, 3), (1.4, 5))):
        g.blob((-152.6 + dx, 37.6, 92 + dz), (2.4, 2.0, 3.4), p=2.0, cuts=3, taper=(1.0, 0.2), rot=(0, (k - 1) * 20, 0))
    rig.part("palmstump", g, PALM, outline=0.5)
    hangar(rig, M)
    watchtower(rig, M)
    pillbox_tower(rig, M)
    # dunes drifting against the hangar and the tower, sandbag walls, drums and jerrycans
    dune(rig, "body", (-150.0, -32.0, 0.0), (16.0, 12.0, 12.0), seed=1)
    dune(rig, "body", (-72.0, -44.0, 0.0), (16.0, 10.0, 9.0), seed=2)
    dune(rig, "body", (-28.0, 14.0, 0.0), (20.0, 16.0, 16.0), seed=3)
    g = Geo()
    sandbag_row(g, 11, 41, -58, 0, rows=3, seed=1)
    rig.part("body", g, BAG, finish="hair")
    g = Geo().blob((30.5, -58, 19.8), (5.2, 4.2, 3.0), p=2.6)
    rig.part("wallbag", g, BAG, finish="hair")
    g = Geo()
    for x, y, z, rz in ((40, -66, 3, 30), (18, -70, 3, -20), (30, -74, 3, 70), (8, -64, 3, 10)):
        g.blob((x, y, z), (5.2, 4.2, 3.0), p=2.6, rot=(0, 0, rz))
    rig.part("spill", g, BAG, finish="hair")
    g = Geo()
    sandbag_row(g, -160, -126, -44, 0, rows=2, seed=2)
    rig.part("body", g, BAG_DK, finish="hair")
    g = Geo()
    for k, x in enumerate((-90.0, -82.0)):
        cyl(g, (x, -46 + k * 3, 0), (x, -46 + k * 3, 14), 4.6, bevel=0.6, segs=16)
    rig.part("body", g, DRUM, finish="gloss")
    g = Geo()
    for k, x in enumerate((-90.0, -82.0)):
        for zz in (4.0, 10.0):
            cyl(g, (x, -46 + k * 3, zz - 0.5), (x, -46 + k * 3, zz + 0.5), 4.9, bevel=0.2, segs=16)
    rig.part("body", g, GUNMETAL, finish="metal", outline=0.3)
    # a small palm by the crates at the front left
    palm(rig, "body", (-140.0, -46.0, 0.0), (-144.0, -48.0, 62.0), fronds=7, size=18.0, seed=8, trunk_r=2.4)

    # damage
    hx, fy, hw, L = HG
    tx, ty, r0, r1 = WT
    chipped_cracks(rig, "crack1", [[(hx - 30, fy - 0.8, 30), (hx - 24, fy - 0.8, 20), (hx - 30, fy - 0.8, 8)],
                                   [(tx - 8, ty - r0 - 0.6, 70), (tx - 3, ty - r0 - 0.6, 60), (tx - 8, ty - r0 - 0.6, 48)]],
                   CRACK, SAND_LT)
    chipped_cracks(rig, "crack2", [[(tx + 6, ty - 23.5, 200), (tx + 11, ty - 23.5, 190), (tx + 6, ty - 23.5, 178)],
                                   [(PB[0] + 4, PB[1] - PB[2] - 1.0, 110), (PB[0] + 9, PB[1] - PB[2] - 1.0, 100),
                                    (PB[0] + 4, PB[1] - PB[2] - 1.0, 88)],
                                   [(hx + 34, fy - 0.8, 28), (hx + 38, fy - 0.8, 18)]], CRACK, SAND_LT)
    chipped_cracks(rig, "crack3", [[(tx - 10, ty - 22.5, 240), (tx - 5, ty - 22.5, 230), (tx - 10, ty - 22.5, 218)],
                                   [(PB[0] - 6, PB[1] - PB[2] - 1.0, 170), (PB[0] - 1, PB[1] - PB[2] - 1.0, 160)]], CRACK, SAND_LT)
    rubble(rig, "rubble1", [(-160, -56), (-138, -62)], SAND_DK, seed=3)
    rubble(rig, "rubble2", [(-106, -62), (-74, -66)], SAND_DK, seed=13)
    rubble(rig, "rubble3", [(-150, -68), (-120, -70), (-46, -70)], SAND_DKR, seed=23, size=1.2)
    g = Geo()
    for px, pz, w, hh in ((hx, HG_BASE + 46, 14, 8), (tx - 12, 158, 9, 8), (tx + 8, 222, 8, 7)):
        g.blob((px, (fy - 1.6) if pz < 100 else ty - (r0 + (r1 - r0) * pz / WT_H) - 1.0, pz), (w, 1.2, hh), p=2.0)
    rig.part("scorch", g, SOOT, outline=0, highlight=False)
    flames(rig, "fire1", [(hx, fy - 4.0, HG_BASE + 6, 1.0), (tx - 12, ty - 26.0, 148.0, 0.7)])
    # 25%: a breach in the hangar arch: a dark hole, a corrugated sheet peeled back
    bx, bz = hx + 30, HG_BASE + 34
    g = Geo().slab([(bx - 10, bz - 6), (bx - 3, bz - 9), (bx + 6, bz - 6), (bx + 10, bz + 2), (bx + 5, bz + 9), (bx - 4, bz + 8),
                    (bx - 9, bz + 3)], fy - 1.4, 1.2)
    rig.part("breach", g, HOLE, outline=0, highlight=False)
    g = Geo().slab([(bx + 4, bz + 8), (bx + 14, bz + 14), (bx + 16, bz + 8), (bx + 9, bz + 2)], fy - 3.2, 1.0,
                   rot=(0, 0, 0))
    rig.part("breach", g, TIN_LT, finish="metal", outline=0.5)
    flames(rig, "fire2", [(bx, fy - 4.0, bz - 6, 0.9), (tx + 6, ty - 10, WT_H + 4, 0.9)])

    # flags: on the watchtower roof's back corner and on the water tank's cap
    flag(rig, "root", "flagA", (tx - 14, ty + 14, WT_H + 64), length=30, height=17, pole=WT_H + 2, pole_color=STEEL, finial=STEEL)
    flag(rig, "root", "flagB", (WTR[0], WTR[1], 236), length=24, height=14, pole=194, pole_color=STEEL, finial=STEEL)

    # Treasury: supply crates and jerrycans, fuel drums, an ammo crate stack with a gold-banded case
    g = Geo()
    box(g, (-128, -64, 8), (9, 8, 8), p=6)
    box(g, (-124, -62, 22), (7, 6, 6), p=6)
    rig.part("treasury1", g, SAND_DK)
    g = Geo()
    for x, z in ((-128, 8), (-124, 22)):
        box(g, (x, -72.5, z), (5, 0.6, 1.4), p=4, cuts=2)
    rig.part("treasury1", g, WOOD_DK, outline=0.3)
    g = Geo()
    for k, x in enumerate((-112.0, -104.0)):
        box(g, (x, -66, 7), (3.4, 5.4, 7), p=5)
    rig.part("treasury1", g, OLIVE, finish="gloss")
    for x in (-88.0, -76.0):
        g = Geo()
        cyl(g, (x, -66, 0), (x, -66, 20), 6.4, bevel=0.8)
        rig.part("treasury2", g, DRUM, finish="gloss")
        g = Geo()
        for z in (5, 15):
            cyl(g, (x, -66, z - 0.8), (x, -66, z + 0.8), 6.8, bevel=0.2)
        rig.part("treasury2", g, GUNMETAL, finish="metal", outline=0.3)
    g = Geo()
    box(g, (-58, -68, 6), (11, 7, 6), p=6)
    box(g, (-58, -68, 18), (9, 6, 5.5), p=6)
    rig.part("treasury3", g, SAND_LT)
    g = Geo()
    box(g, (-58, -68, 29), (8, 5, 4), p=6)
    rig.part("treasury3", g, GUNMETAL, finish="metal")
    g = Geo()
    box(g, (-58, -73.2, 29), (8.2, 0.6, 1.2), p=4, cuts=2)
    rig.part("treasury3", g, "#D4A437", finish="metal", outline=0.3)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "merlon": {"hide": True},
                     "wallbag": {"hide": True}, "spill": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "lit": {"hide": True}, "tufts": {"hide": True}, "sock": {"hide": True}, "sockrag": {"show": True},
                     "leak": {"show": True}, "banner": {"r": 6.0, "x": 1.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breach": {"show": True}, "fire2": {"show": True},
                     "mast": {"r": 8.0, "x": -2.0}, "tank": {"r": -4.0, "x": 1.0, "z": -4.0}, "palmtop": {"hide": True},
                     "palmstump": {"show": True}, "banner": {"r": 24.0, "x": 3.0, "z": -3.0}})
    return pose


DESERT_BUNKER = base_module(
    "modern", "Desert Bunker", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build, crumble=crumble, mount_depth=DEPTHS, skin="desert_bunker",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((HG[0] - 30, HG[1] - 7, HG_BASE + 35), 3, 16), ((HG[0] + 30, HG[1] - 7, HG_BASE + 35), 3, 16),
            ((WT[0] - 12, WT[1] - 26, 150), 2, 12), ((MAST[0], MAST[1], 308), 2, 14)],
    smoke=[((WT[0], WT[1], WT_H + 6), 2), ((HG[0], HG[1], 60), 3), ((-130, 10, 100), 3)],
    horn=(-100, 350), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "concrete",
        # the radio mast and the water tower fall first, then the watchtower's top
        "topple": [topple_lu(-176, -110, 150, delay_ms=0, push=1.0, sink_lu=34),
                   topple_lu(-86, -26, 196, delay_ms=150, push=0.8, sink_lu=28)],
        "rubbleColors": [SAND, SAND_DK, ADOBE, BAG],
        "dustColor": "#D9C9A0",
        "ambientLu": [ambient_lu("dust", (-160, -30, 8), 18, 1.0), ambient_lu("dust", (-72, -44, 6), 16, 0.8),
                      ambient_lu("dust", (-28, 14, 10), 16, 0.8), ambient_lu("dust", (HG[0], HG[1] - 4, 70), 22, 0.6)],
    },
)



# ---------------------------------------------------------------------------------------------------
# Jungle Outpost (round 3; Rare, Time Capsule): a concrete bunker the jungle is taking back. Two stepped concrete
# casemates with firing slits under moss, hanging vines and big broad leaves, a round pillbox tower at the lane edge
# carrying the gate-side mounts, a slender concrete lookout with a cantilevered deck, a bamboo watchtower with a
# thatched roof and a team awning on the left, a bamboo palisade at the foot, banana plants and ferns. A small
# waterfall spills off the upper casemate's roof in two steps into a pool at the foot (the `water` prop loop: the
# sheets' streaks run down, 6 steps, an exact loop). Team colour: the blast door, the awning, a tarp, a banner and the
# flags. Code ambient: leaves drifting, mist off the pool, birds gliding over the canopy.
#
# Crumble: 75% cracks, a chunk bitten off a casemate edge, the palisade's poles knocked down, rubble; 50% a burning
# breach in the lower casemate, the banner torn, soot, exposed rebar; 25% a ragged breach in the pillbox with fire,
# the watchtower leaning on a snapped leg, the awning gone, the waterfall dried to a trickle.

JG_CONC = "#A29F96"
JG_CONC_LT = "#B6B3A9"
JG_CONC_DK = "#86837B"
JG_CONC_DKR = "#74716A"
JG_LEAF = "#4F7A4A"
JG_LEAF_LT = "#64905A"
JG_LEAF_DK = "#3E6239"
JG_MOSS = "#6E8B3D"
JG_BAMBOO = "#B5A770"
JG_BAMBOO_DK = "#8E8456"
JG_THATCH = "#A6996E"
JG_THATCH_DK = "#8A7F5A"
JG_WATER = "#CFE3E0"
JG_WATER_DK = "#9FC2BE"
JG_WATER_LT = "#F2FAF8"
JG_GUN = "#3A3F45"
JG_ROPE = "#9C8C66"
JG_SOIL = "#6A5A48"
JG_CRACK = "#4C4A44"
JG_DEPTHS = [-40, -24, -40, -24]
JG_LOW = 55.3                 # the lower casemate's roof (the gate-side mount's deck)
JG_UP = 119.0                 # the upper casemate's roof
JG_PB = (0.0, -14.0)          # the pillbox tower's axis
JG_FALL1 = (-118.0, -104.0, -33.0)   # the upper fall: x0, x1, its sheet's y
JG_FALL2 = (-121.0, -101.0, -45.0)   # the lower fall
JG_WATER_FRAMES, JG_WATER_MS = 6, 100


def jg_leaves(rig, joint, x, y, z, k=1.0, seed=0, spread=(200.0, 340.0), n=6):
    """A clump of broad jungle leaves fanning from a point (angles on screen), in two greens with lighter midribs."""
    rnd = random.Random(seed)
    a_, b_, r_ = Geo(), Geo(), Geo()
    for i in range(n):
        ang = spread[0] + (spread[1] - spread[0]) * (i + 0.5) / n + rnd.uniform(-8, 8)
        L = (14.0 + rnd.uniform(-3, 4)) * k
        W = (7.0 + rnd.uniform(-1, 1.5)) * k
        leaf(a_ if i % 2 else b_, (x, y - 0.6 * i, z), L, W, ang, tilt=rnd.uniform(-20, 20), thick=0.8)
        ar = math.radians(ang)
        r_.capsule((x, y - 0.6 * i - 0.9, z), (x + math.cos(ar) * L * 0.85, y - 0.6 * i - 0.9, z + math.sin(ar) * L * 0.85), 0.35, segs=4, rings=1)
    rig.part(joint, a_, JG_LEAF, finish="hair")
    rig.part(joint, b_, JG_LEAF_LT, finish="hair")
    rig.part(joint, r_, "#86A86E", outline=0, highlight=False)


def jg_vine(rig, joint, x, y, z, length, seed=0, sway=3.0):
    """A vine hanging down a wall from (x, y, z): a wavy cord with small leaves along it."""
    rnd = random.Random(seed)
    pts = []
    n = max(3, int(length / 6))
    for i in range(n + 1):
        t = i / n
        pts.append((x + math.sin(t * 5.0 + seed) * sway, y - 0.4, z - length * t))
    g, lv = Geo(), Geo()
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.7, 0.6, segs=6, rings=1)
    for i, p_ in enumerate(pts[1:]):
        leaf(lv, (p_[0], p_[1] - 0.6, p_[2]), 5.0 + rnd.uniform(-1, 1.4), 3.0, 200.0 if i % 2 else 340.0, thick=0.6)
    rig.part(joint, g, JG_LEAF_DK, finish="hair", outline=0.3)
    rig.part(joint, lv, JG_LEAF if seed % 2 else JG_LEAF_LT, finish="hair", outline=0.4)


def jg_moss(rig, joint, spots, seed=0):
    """Moss mats spilling over roof edges: spots = [(x, y, z, width)]."""
    rnd = random.Random(seed)
    g = Geo()
    for x, y, z, w in spots:
        g.blob((x, y, z), (w / 2, 4.0, 1.8), p=2.4, cuts=3)
        for k in range(max(2, int(w // 7))):
            dx = -w / 2 + (k + 0.5) * w / max(2, int(w // 7)) + rnd.uniform(-1, 1)
            L = rnd.uniform(3, 7)
            g.blob((x + dx, y - 1.2, z - L / 2), (2.0, 1.6, L / 2 + 0.6), p=2.0, taper=(0.5, 1.0))
    rig.part(joint, g, JG_MOSS, finish="hair")


def jg_bamboo(g, nodes_g, p0, p1, r=1.5, node_every=7.0):
    """A bamboo pole from p0 to p1 with darker nodes along it."""
    g.capsule(p0, p1, r, r * 0.92, segs=8, rings=1)
    L = math.dist(p0, p1)
    n = int(L / node_every)
    for i in range(1, n + 1):
        t = i / (n + 1)
        c = tuple(a + (b - a) * t for a, b in zip(p0, p1))
        nodes_g.lathe([(r * 0.95, -0.5), (r * 1.18, 0.0), (r * 0.95, 0.5)], c, tuple(a + (b - a) * (t + 0.01) for a, b in zip(p0, p1)), segs=10)


def jg_banana(rig, joint, x, y, k=1.0, seed=0):
    """A banana plant: a thick pale stem and long, ragged leaves arching out."""
    rnd = random.Random(seed)
    g = Geo().capsule((x, y, 0.0), (x + 1.0, y, 22.0 * k), 2.6 * k, 2.0 * k, segs=10, rings=1)
    rig.part(joint, g, "#8EA266", outline=0.5)
    a_, b_ = Geo(), Geo()
    for i, ang in enumerate((30.0, 70.0, 110.0, 150.0, 92.0)):
        leaf(a_ if i % 2 else b_, (x + 1.0, y - 0.6 * i, 21.0 * k), (24.0 + rnd.uniform(-3, 3)) * k, 8.0 * k, ang, tilt=rnd.uniform(-15, 15))
    rig.part(joint, a_, JG_LEAF_LT, finish="hair")
    rig.part(joint, b_, JG_LEAF, finish="hair")


def jg_slits(rig, joint, xs, y, z, w=10.0, h=3.0):
    """Firing slits in a concrete face: dark recesses with a warm glow strip inside (in front of the recess's back, so
    it shows at game scale)."""
    g, gl = Geo(), Geo()
    for x in xs:
        box(g, (x, y, z), (w / 2, 0.8, h / 2), p=5, cuts=2)
        box(gl, (x, y - 0.95, z - 0.15), (w / 2 - 1.5, 0.3, max(0.45, h / 2 - 0.85)), p=5, cuts=1)
    rig.part(joint, g, "#2A2826", outline=0)
    rig.part(joint, gl, glow="#E8B070", outline=0)


def jg_water_geo(f):
    """The two falls at step f: each a pale water sheet with streaks running down (evenly spaced, so six steps of a
    sixth of the spacing make an exact loop), a lip where it pours over and foam where it lands."""
    sheet, streak, foam = Geo(), Geo(), Geo()
    S = 12.0
    for (x0, x1, y), (z_top, z_bot) in ((JG_FALL1, (JG_UP + 1.0, JG_LOW + 1.0)), (JG_FALL2, (JG_LOW - 1.0, 2.0))):
        w = x1 - x0
        sheet.slab([(x0, z_top), (x1, z_top), (x1 + 1.5, z_bot), (x0 - 1.5, z_bot)], y, 1.2)
        sheet.blob(((x0 + x1) / 2, y - 1.0, z_top - 0.6), (w / 2 + 0.6, 2.0, 1.6), p=2.4, cuts=3)
        for c in range(4):
            xc = x0 + (c + 0.5) * w / 4
            off = (f / JG_WATER_FRAMES) * S + c * 3.0
            z = z_top - (off % S)
            while z - 5.0 > z_bot + 1.0:
                streak.capsule((xc, y - 0.9, z), (xc + 0.2 * (c - 1.5), y - 0.9, z - 5.0), 0.55, segs=4, rings=1)
                z -= S
        rnd = random.Random(f * 7 + int(x0))
        for i in range(5):
            foam.blob((x0 - 2.0 + (w + 4.0) * (i + 0.5) / 5 + rnd.uniform(-1.2, 1.2), y - 2.0, z_bot + 1.6 + rnd.uniform(0, 2.0)),
                      (2.6 + rnd.uniform(0, 1.0), 1.6, 1.8 + rnd.uniform(0, 1.0)), p=2.2, cuts=2)
    return sheet, streak, foam


def build_jungle(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "bite", "breachL", "breachP", "soot", "fallen", "trickle"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("palisade", "body", (-150.0, -50.0, 0.0))
    rig.joint("banner", "body", (-50.0, -27.4, 236.0))
    rig.joint("watch", "body", (-145.0, 10.0, JG_UP))
    rig.joint("awning", "watch", (-145.0, -6.0, 268.0))
    px, py = JG_PB

    # -- the lower casemate: a long concrete block with a chamfered top edge, slits, the gate's blast door ------
    g = Geo()
    box(g, (-62.0, 1.0, JG_LOW / 2), (88.0, 43.0, JG_LOW / 2), p=8)
    rig.part("body", g, JG_CONC)
    g = Geo()
    box(g, (-62.0, -0.4, JG_LOW - 2.0), (88.6, 43.8, 2.4), p=6)
    rig.part("body", g, JG_CONC_LT)
    g = Geo()
    for x in range(-146, 24, 18):
        g.capsule((float(x), -42.6, 2.0), (float(x), -42.6, JG_LOW - 5.0), 0.35, segs=4, rings=1)
    rig.part("body", g, JG_CONC_DKR, outline=0, highlight=False)
    jg_slits(rig, "body", (-136.0, -78.0, -46.0), -42.4, 36.0)
    # the blast door at the gate (team), its frame and bolts
    g = Geo()
    box(g, (14.0, -42.8, 18.0), (11.0, 1.2, 18.0), p=6)
    rig.part("body", g, JG_CONC_DKR)
    g = Geo().slab([(5.0, 1.0), (23.0, 1.0), (23.0, 33.0), (5.0, 33.0)], -44.0, 1.2)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    for z in (8.0, 26.0):
        box(g, (14.0, -44.8, z), (8.6, 0.5, 1.2), p=4, cuts=1)
    for x, z in ((7.0, 3.0), (21.0, 3.0), (7.0, 31.0), (21.0, 31.0)):
        g.sphere((x, -44.8, z), 0.8, cuts=1)
    rig.part("body", g, JG_GUN, finish="metal", outline=0.3)

    # -- the upper casemate (set back), its slits, a team tarp, moss and vines over its edges --------------------
    g = Geo()
    box(g, (-84.0, 12.0, (JG_LOW + JG_UP) / 2), (66.0, 42.0, (JG_UP - JG_LOW) / 2), p=8)
    rig.part("body", g, JG_CONC_DK)
    g = Geo()
    box(g, (-84.0, 11.0, JG_UP - 2.0), (66.6, 42.8, 2.4), p=6)
    rig.part("body", g, JG_CONC)
    jg_slits(rig, "body", (-140.0, -66.0), -30.4, 96.0)
    g = Geo().slab([(-96.0, JG_UP - 2.0), (-70.0, JG_UP - 2.0), (-71.0, JG_UP - 18.0), (-83.0, JG_UP - 21.0), (-95.0, JG_UP - 17.0)], -31.2, 1.2)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    for x in (-95.0, -71.0):
        g.sphere((x, -31.6, JG_UP - 2.0), 1.2, cuts=2)
    rig.part("body", g, JG_GUN, finish="metal", outline=0.3)
    jg_moss(rig, "body", [(-140.0, -30.0, JG_UP + 0.4, 26.0), (-50.0, -30.0, JG_UP + 0.4, 18.0), (-60.0, -42.4, JG_LOW + 0.4, 30.0),
                          (-150.0, -42.4, JG_LOW + 0.4, 20.0)], seed=3)
    for i, (x, z, L) in enumerate(((-150.0, JG_UP, 34.0), (-128.0, JG_UP, 22.0), (-60.0, JG_UP, 28.0), (-138.0, JG_LOW, 26.0),
                                   (-36.0, JG_LOW, 30.0), (-88.0, JG_LOW, 18.0))):
        jg_vine(rig, "body", x, -30.8 if z == JG_UP else -43.2, z - 1.0, L, seed=i)
    # the waterfall's channel: the upper lip, the wet strip on the lower roof, the pool at the foot with stones
    x0, x1, y1 = JG_FALL1
    g = Geo()
    box(g, ((x0 + x1) / 2, y1 + 0.6, JG_UP - 0.4), ((x1 - x0) / 2 + 2.0, 3.0, 1.4), p=6, cuts=2)
    rig.part("body", g, JG_CONC_DKR, outline=0.4)
    g = Geo()
    box(g, ((JG_FALL2[0] + JG_FALL2[1]) / 2, -38.0, JG_LOW + 0.2), (11.0, 6.0, 0.6), p=6, cuts=2)
    rig.part("body", g, JG_WATER_DK, finish="gloss", outline=0)
    g = Geo()
    box(g, (-111.0, -51.0, 1.2), (20.0, 8.0, 1.2), p=6)
    rig.part("body", g, JG_WATER, finish="gloss")
    g = Geo()
    for x0_, x1_ in ((-126.0, -116.0), (-106.0, -96.0)):
        g.capsule((x0_, -56.0, 2.5), (x1_, -56.0, 2.5), 0.45, segs=4, rings=1)
    rig.part("body", g, JG_WATER_LT, outline=0, highlight=False)
    g = Geo()
    for i, (x, y, r) in enumerate(((-132.0, -52.0, 4.4), (-90.0, -54.0, 4.0), (-124.0, -59.0, 3.0), (-98.0, -59.0, 3.2))):
        rock(g, (x, y, 2.0), (r, r * 0.8, r * 0.7), seed=500 + i, jag=0.18, cuts=3)
    rig.part("body", g, JG_CONC_DKR)
    # the falling water (the `water` prop: a joint under root at the upper lip)
    rig.joint("water", "root", ((JG_FALL1[0] + JG_FALL1[1]) / 2, JG_FALL1[2], JG_UP))

    # -- the pillbox tower at the lane edge: an octagonal concrete drum over the gate roof, vines, slits -----
    g = Geo()
    cyl(g, (px, py, JG_LOW), (px, py, 192.6), 17.4, 16.4, bevel=0.8, segs=8)
    rig.part("body", g, JG_CONC_LT)
    g = Geo()
    for z in (JG_LOW + 3.0, 128.0, 188.0):
        cyl(g, (px, py, z - 1.6), (px, py, z + 1.6), 18.4, bevel=0.4, segs=8)
    rig.part("body", g, JG_CONC_DK, outline=0.4)
    jg_slits(rig, "body", (px - 6.0,), py - 16.9, 104.0, w=8.0, h=2.6)
    jg_slits(rig, "body", (px - 6.0,), py - 16.6, 160.0, w=8.0, h=2.6)
    jg_vine(rig, "body", px - 12.0, py - 16.0, 190.0, 40.0, seed=7, sway=2.4)
    jg_vine(rig, "body", px + 6.0, py - 17.0, 186.0, 26.0, seed=8, sway=2.0)

    # -- the concrete lookout with a cantilevered deck (the top mount) and a team banner ----------------------
    g = Geo()
    box(g, (-50.0, 0.0, (JG_UP + 254.0) / 2), (16.0, 26.0, (254.0 - JG_UP) / 2), p=8)
    rig.part("body", g, JG_CONC)
    g = Geo()
    for z in (170.0, 222.0):
        box(g, (-50.0, -0.4, z), (16.8, 26.8, 1.6), p=6)
    rig.part("body", g, JG_CONC_DK, outline=0.4)
    jg_slits(rig, "body", (-50.0,), -26.4, 200.0, w=12.0, h=3.0)
    g = Geo()
    for dx in (-10.0, 10.0):
        g.slab([(-50.0 + dx - 2.4, 254.0), (-50.0 + dx + 2.4, 254.0), (-50.0 + dx + 2.4, 236.0)], -30.0, 18.0)
    rig.part("body", g, JG_CONC_DK, outline=0.4)
    bx_, bz_ = -50.0, 236.0
    g = Geo().slab([(bx_ - 7.0, bz_ - 30.0 + 30.0), (bx_ + 7.0, bz_), (bx_ + 7.0, bz_ - 28.0), (bx_, bz_ - 34.0), (bx_ - 7.0, bz_ - 28.0)], -27.4, 1.3)
    rig.part("banner", g, team=True, outline=0.5)
    g = Geo()
    for k in range(3):
        a = math.radians(90 + k * 120)
        g.blob((bx_ + math.cos(a) * 2.4, -28.2, bz_ - 14.0 + math.sin(a) * 2.4), (2.2, 0.5, 1.2), p=2.0, cuts=2, rot=(0, -math.degrees(a), 0))
    rig.part("banner", g, JG_CONC_LT, outline=0.3)
    jg_vine(rig, "body", -62.0, -26.6, 252.0, 46.0, seed=11, sway=2.6)
    jg_leaves(rig, "body", -36.0, -27.0, 252.0, k=0.8, seed=12, spread=(200.0, 330.0), n=5)

    # -- the bamboo watchtower on the left: four poles with lashings, a deck, a thatched roof, a team awning ----
    wx, wy = -145.0, 10.0
    bam, nod = Geo(), Geo()
    legs = [(wx - 14.0, wy - 12.0), (wx + 14.0, wy - 12.0), (wx - 14.0, wy + 12.0), (wx + 14.0, wy + 12.0)]
    for lx, ly in legs:
        jg_bamboo(bam, nod, (lx, ly, JG_UP), (lx + (2.0 if lx > wx else -2.0) * -1.0, ly, 270.0), r=1.7)
    for za, zb in ((JG_UP + 6.0, 180.0), (184.0, 236.0)):
        for (ax, ay), (bx2, by2) in ((legs[0], legs[1]), (legs[1], legs[3])):
            jg_bamboo(bam, nod, (ax, ay - 0.6, za), (bx2, by2 - 0.6, zb), r=0.9, node_every=9.0)
            jg_bamboo(bam, nod, (bx2, by2 - 0.6, za), (ax, ay - 0.6, zb), r=0.9, node_every=9.0)
    rig.part("watch", bam, JG_BAMBOO, outline=0.45)
    rig.part("watch", nod, JG_BAMBOO_DK, outline=0)
    g = Geo()
    box(g, (wx, wy, 268.0), (18.0, 16.0, 1.6), p=6)
    rig.part("watch", g, JG_BAMBOO_DK)
    rail, rn = Geo(), Geo()
    for k in range(7):
        x = wx - 17.0 + k * (34.0 / 6)
        jg_bamboo(rail, rn, (x, wy - 15.4, 268.0), (x, wy - 15.4, 276.0), r=0.7, node_every=20.0)
    jg_bamboo(rail, rn, (wx - 18.0, wy - 15.4, 276.0), (wx + 18.0, wy - 15.4, 276.0), r=0.9, node_every=8.0)
    rig.part("watch", rail, JG_BAMBOO, outline=0.35)
    g = Geo()
    g.lathe([(0.0, 0.0), (27.0, 0.0), (25.0, 3.0), (2.0, 24.0), (0.0, 26.0)], (wx, wy, 288.0), (wx, wy, 314.0), segs=4, rot=(0, 0, 45))
    rig.part("watch", g, JG_THATCH, finish="hair")
    g = Geo()
    for k in range(3):
        z = 290.0 + k * 7.0
        r = 26.0 - k * 7.4
        g.lathe([(r - 0.6, -0.5), (r + 0.4, 0.0), (r - 0.6, 0.5)], (wx, wy, z), (wx, wy, z + 1.0), segs=4, rot=(0, 0, 45))
    rig.part("watch", g, JG_THATCH_DK, outline=0, highlight=False)
    for lx, ly in legs[:2]:
        jg_bamboo(bam := Geo(), nod2 := Geo(), (lx, ly, 270.0), (lx, ly, 289.0), r=1.3)
        rig.part("watch", bam, JG_BAMBOO, outline=0.4)
        rig.part("watch", nod2, JG_BAMBOO_DK, outline=0)
    g = Geo().slab([(wx - 16.0, 276.0), (wx + 16.0, 276.0), (wx + 16.0, 270.0), (wx + 8.0, 267.0), (wx, 270.0), (wx - 8.0, 267.0), (wx - 16.0, 270.0)],
                   wy - 16.4, 1.0)
    rig.part("awning", g, team=True, outline=0.4)
    jg_leaves(rig, "body", wx + 18.0, -30.0, JG_UP + 1.0, k=1.1, seed=21, spread=(10.0, 170.0), n=7)

    # -- the bamboo palisade at the foot (knocked down at 75%), banana plants and ferns ----------------------
    bam, nod = Geo(), Geo()
    for k in range(8):
        x = -163.0 + k * 4.4
        h = 26.0 + (k * 37 % 9)
        jg_bamboo(bam, nod, (x, -50.0, 0.0), (x, -50.0, h), r=1.9)
    for z in (9.0, 19.0):
        jg_bamboo(bam, nod, (-165.0, -52.2, z), (-130.0, -52.2, z), r=0.8, node_every=12.0)
    rig.part("palisade", bam, JG_BAMBOO, outline=0.45)
    rig.part("palisade", nod, JG_BAMBOO_DK, outline=0)
    g = Geo()
    for k in range(3):
        g.capsule((-160.0 + k * 9.0, -56.0, 1.5), (-150.0 + k * 9.0, -60.0, 2.5), 1.8, segs=6, rings=1)
    rig.part("fallen", g, JG_BAMBOO, outline=0.45)
    jg_banana(rig, "body", -152.0, -40.0, k=1.0, seed=31)
    jg_banana(rig, "body", -86.0, -50.0, k=0.8, seed=32)
    jg_leaves(rig, "body", -142.0, -50.0, 2.0, k=0.9, seed=33, spread=(20.0, 160.0), n=7)
    jg_leaves(rig, "body", -24.0, -48.0, 2.0, k=0.8, seed=34, spread=(30.0, 150.0), n=6)
    jg_leaves(rig, "body", -150.0, -36.0, JG_LOW + 1.0, k=0.9, seed=35, spread=(20.0, 140.0), n=6)
    # a palm behind the casemates, its crown over the roofline between the watchtower and the lookout
    g = Geo()
    pts = [(-98.0, 40.0, JG_UP), (-95.0, 40.0, 150.0), (-97.0, 40.0, 180.0), (-93.0, 40.0, 206.0)]
    for a_, b_ in zip(pts, pts[1:]):
        g.capsule(a_, b_, 3.0, 2.4, segs=10, rings=1)
    rig.part("body", g, "#7A6A52", outline=0.5)
    g = Geo()
    for k in range(9):
        z = JG_UP + 6.0 + k * 10.0
        g.lathe([(2.6, -0.6), (3.4, 0.0), (2.6, 0.6)], (-97.0 + (k % 3 - 1) * 0.8, 40.0, z), (-97.0, 40.0, z + 1.0), segs=10)
    rig.part("body", g, "#5E5040", outline=0)
    pa, pb = Geo(), Geo()
    for i, ang in enumerate((10.0, 40.0, 75.0, 105.0, 140.0, 170.0, 200.0, 340.0)):
        leaf(pa if i % 2 else pb, (-93.0, 38.0 - 0.6 * i, 206.0), 30.0, 7.0, ang, tilt=0.0)
    rig.part("body", pa, JG_LEAF, finish="hair")
    rig.part("body", pb, JG_LEAF_LT, finish="hair")

    # -- the turret mounts: sandbagged gun pits ---------------------------------------------------------
    platform(rig, "body", M[0], JG_CONC_LT, JG_CONC_DK, style="sandbag", r=(25.0, 19.0), accent="#9E9A72")
    platform(rig, "body", M[1], JG_CONC_LT, JG_CONC_DK, style="sandbag", r=(25.0, 19.0), accent="#9E9A72")
    platform(rig, "body", M[2], JG_CONC_LT, JG_CONC_DK, style="sandbag", r=(23.0, 19.0), accent="#9E9A72")
    platform(rig, "body", M[3], JG_CONC_LT, JG_CONC_DK, style="sandbag", r=(25.0, 19.0), accent="#9E9A72")

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-120.0, -42.8, 50.0), (-114.0, -42.8, 38.0), (-120.0, -42.8, 26.0)],
                                   [(px - 10.0, py - 17.4, 150.0), (px - 6.0, py - 17.4, 140.0)]], JG_CRACK, JG_CONC_LT)
    g = Geo()
    box(g, (-148.0, -31.0, JG_UP - 4.0), (9.0, 3.0, 5.0), p=4)
    rig.part("bite", g, "#4E4C46", outline=0.5)
    chipped_cracks(rig, "crack2", [[(-60.0, -42.8, 50.0), (-56.0, -42.8, 40.0)], [(-50.0, -26.6, 190.0), (-46.0, -26.6, 180.0)]],
                   JG_CRACK, JG_CONC_LT)
    chipped_cracks(rig, "crack3", [[(-130.0, -30.6, 110.0), (-126.0, -30.6, 100.0)], [(-40.0, -26.6, 160.0), (-36.0, -26.6, 150.0)]],
                   JG_CRACK, JG_CONC_LT)
    jg_breach(rig, "breachL", -64.0, -42.6, 24.0, 22.0, 20.0, seed=41)
    flames(rig, "breachL", [(-64.0, -48.0, 16.0, 0.9)])
    jg_breach(rig, "breachP", px - 4.0, py - 17.0, 132.0, 16.0, 18.0, seed=43)
    flames(rig, "breachP", [(px - 4.0, py - 23.0, 124.0, 0.8)])
    g = Geo()
    for sx_, sy_, sz_, rr in ((-64.0, -43.0, 42.0, 8.0), (px - 4.0, py - 17.6, 150.0, 6.0)):
        g.slab([(sx_ + rr * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), sz_ + rr * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)], sy_, 0.6)
    rig.part("soot", g, "#3E3C38", outline=0, highlight=False)
    g = Geo()
    for k in range(4):
        g.capsule((-70.0 + k * 4.0, -46.0, 30.0), (-72.0 + k * 4.6, -52.0, 22.0 - k), 0.5, segs=4, rings=1)
    rig.part("breachL", g, "#6E5446", outline=0.3)
    g = Geo().slab([(JG_FALL2[0] + 6.0, JG_LOW), (JG_FALL2[0] + 9.0, JG_LOW), (JG_FALL2[0] + 9.6, 2.0), (JG_FALL2[0] + 5.4, 2.0)], JG_FALL2[2], 0.8)
    g.slab([(JG_FALL1[0] + 5.0, JG_UP), (JG_FALL1[0] + 7.6, JG_UP), (JG_FALL1[0] + 8.0, JG_LOW + 1.0), (JG_FALL1[0] + 4.6, JG_LOW + 1.0)], JG_FALL1[2], 0.8)
    rig.part("trickle", g, JG_WATER, finish="gloss", outline=0.3)
    rubble(rig, "rubble1", [(-158.0, -58.0), (-136.0, -62.0)], JG_CONC, seed=111)
    rubble(rig, "rubble2", [(-80.0, -62.0), (-30.0, -64.0)], JG_CONC_DK, seed=117)
    rubble(rig, "rubble3", [(-160.0, -64.0), (-116.0, -66.0), (-4.0, -64.0)], JG_CONC, seed=123, size=1.2)

    flag(rig, "root", "flagA", (wx + 14.0, wy - 6.0, 340.0), length=30, height=17, pole=300.0, pole_color=JG_BAMBOO_DK, finial="#8C949C")
    flag(rig, "root", "flagB", (-96.0, 40.0, JG_UP + 70.0), length=24, height=14, pole=JG_UP, pole_color=JG_BAMBOO_DK, finial="#8C949C")

    # -- Treasury: supply crates (1), fuel drums under leaves (2), an ammo stack with a gold-banded case (3) ----
    g = Geo()
    for x, y, z in ((-170.0, -64.0, 0.0), (-160.0, -66.0, 0.0), (-165.0, -65.0, 9.0)):
        box(g, (x, y, z + 4.5), (4.6, 4.6, 4.5), p=6)
    rig.part("treasury1", g, "#6F7656", outline=0.5)
    g = Geo()
    for x in (-140.0, -131.0):
        cyl(g, (x, -64.0, 0.0), (x, -64.0, 13.0), 4.6, bevel=0.6, segs=18)
    rig.part("treasury2", g, "#5E6A5A", finish="metal", outline=0.5)
    g = Geo()
    for x in (-140.0, -131.0):
        cyl(g, (x, -64.0, 4.0), (x, -64.0, 5.4), 4.9, bevel=0.2, segs=18)
    rig.part("treasury2", g, "#3A3F45", finish="metal", outline=0.3)
    g = Geo()
    for x, y, z in ((-76.0, -66.0, 0.0), (-66.0, -66.0, 0.0), (-71.0, -66.0, 6.0)):
        box(g, (x, y, z + 3.0), (5.0, 3.6, 3.0), p=6)
    rig.part("treasury3", g, "#5A6048", outline=0.5)
    g = Geo()
    box(g, (-71.0, -66.0, 14.0), (5.6, 3.8, 2.4), p=6)
    rig.part("treasury3", g, "#3A3F45", finish="metal")
    g = Geo()
    box(g, (-71.0, -70.0, 14.0), (5.8, 0.4, 0.6), p=4, cuts=1)
    rig.part("treasury3", g, "#C9A227", finish="bronze_rich", outline=0.3)


def jg_breach(rig, joint, x, y, z, w, h, seed=0):
    """A blown-out hole in the concrete: a dark jagged opening, a lighter inner face, broken edges."""
    rnd = random.Random(seed)
    n = 14
    pts, inner = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.72 + 0.28 * rnd.random()
        pts.append((x + math.cos(a) * w / 2 * k, z + math.sin(a) * h / 2 * k))
        inner.append((x + math.cos(a) * w / 2 * k * 0.72, z + math.sin(a) * h / 2 * k * 0.66 - h * 0.08))
    rig.part(joint, Geo().slab(pts, y - 2.4, 1.6), "#64625C", outline=0.6, outline_hex="#2E2D2A")
    rig.part(joint, Geo().slab(inner, y - 3.4, 1.0), "#2E2D2A", outline=0)
    g = Geo()
    for i in range(0, n, 3):
        px_, pz_ = pts[i]
        box(g, (px_, y - 3.0, pz_), (2.6 + 1.6 * rnd.random(), 1.8, 2.0 + 1.4 * rnd.random()), p=5, cuts=2)
    rig.part(joint, g, JG_CONC_LT, outline=0.5)


def jg_water_pose(f):
    """Each step shows its own frame of the falls (the geometry is per step; see build_jungle_with_water)."""
    return {f"water{k}": ({"show": True} if k == f else {"hide": True}) for k in range(JG_WATER_FRAMES)}


def build_jungle_with_water(rig, M):
    build_jungle(rig, M)
    for f in range(JG_WATER_FRAMES):
        j = f"water{f}"
        rig.joint(j, "water", ((JG_FALL1[0] + JG_FALL1[1]) / 2, JG_FALL1[2], JG_UP), hidden=True)
        sheet, streak, foam = jg_water_geo(f)
        rig.part(j, sheet, JG_WATER, finish="gloss", outline=0.4)
        rig.part(j, streak, JG_WATER_LT, outline=0, highlight=False)
        rig.part(j, foam, JG_WATER_LT, outline=0.3)


def crumble_jungle(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "bite": {"show": True}, "palisade": {"hide": True},
                     "fallen": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachL": {"show": True}, "soot": {"show": True},
                     "banner": {"r": 10.0, "sz": 0.55, "x": 1.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breachP": {"show": True}, "trickle": {"show": True},
                     "watch": {"r": -6.0, "x": 3.0, "z": -2.0}, "awning": {"hide": True}, "banner": {"hide": True}})
    return pose


JUNGLE_OUTPOST = base_module(
    "modern", "Jungle Outpost", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build_jungle_with_water, crumble=crumble_jungle, mount_depth=JG_DEPTHS, skin="jungle_outpost",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-136.0, -44.0, 36.0), 3, 10), ((-46.0, -44.0, 36.0), 2, 10), ((-50.0, -28.0, 200.0), 3, 10)],
    smoke=[((-64.0, -44.0, 40.0), 2), ((JG_PB[0], JG_PB[1] - 18.0, 140.0), 3), ((-140.0, 0.0, JG_UP + 4.0), 3)],
    horn=(-100, 340), yaw=BASE_YAW,
    props=[prop_loop("water", ["water"], JG_WATER_FRAMES, jg_water_pose, ms=JG_WATER_MS, crumble=(0, 2), z="front", hold=0,
                     anchor=((JG_FALL1[0] + JG_FALL1[1]) / 2, JG_FALL1[2], JG_UP - 30.0), alpha=0.92, outline=(1.2, 0.55, 0.5))],
    extra_meta={
        "collapseMaterial": "concrete",
        # the watchtower falls toward the lane first, then the lookout
        "topple": [topple_lu(-176, -112, 140, delay_ms=0, push=1.0, sink_lu=30),
                   topple_lu(-72, -26, 170, delay_ms=160, push=0.8, sink_lu=26)],
        "rubbleColors": [JG_CONC, JG_CONC_DK, JG_LEAF, JG_BAMBOO],
        "dustColor": "#B9B4A6",
        "ambientLu": [ambient_lu("petals", (-150.0, -30.0, JG_UP + 20.0), 26, 0.7, color="#7FA866"),
                      ambient_lu("petals", (-40.0, -30.0, 240.0), 18, 0.5, color="#8DB872"),
                      ambient_lu("mist", (-111.0, -52.0, 4.0), 14, 0.6),
                      ambient_lu("birds", (-120.0, -20.0, 300.0), 40, 0.45, color="#36403A")],
    },
)



# ---------------------------------------------------------------------------------------------------
# Arctic Radar Station (round 3; Epic, Wardrobe Crate): a white-grey bunker under heavy snow. Two stepped concrete
# blocks with thick snow caps, icicles and drifts, warm firing slits and team-painted bands; a concrete tower carries a
# white radome with panel seams; a tall lattice radio mast with guy wires and a red beacon stands behind it; between
# the towers a radar dish on a short mast turns (the `dish` prop loop: twelve steps of 30 degrees, a full turn); a
# concrete lookout with a cantilevered deck carries the top mount, a round pillbox at the lane edge the gate-side
# ones; a team snowmobile is parked in the drift by the gate. Team colour: the bands, the blast door, the snowmobile,
# the lookout banner and the flags. Code ambient: snow, steam from a vent; the beacon and slits glow (lights).
#
# Crumble: 75% cracks, an antenna knocked off the lookout, snow and concrete rubble; 50% a burning breach in the lower
# block, the banner torn, the radome cracked, soot; 25% a ragged breach in the pillbox with fire, the radio mast
# buckled, the radome caved in, the dish frozen (gone).

AR_CONC = "#A8ACB0"
AR_CONC_LT = "#BCC0C4"
AR_CONC_DK = "#8D9196"
AR_CONC_DKR = "#787C82"
AR_SNOW = "#F2F4F4"
AR_SNOW_SH = "#DCE3E7"
AR_ICE = "#CFE6F0"
AR_GUN = "#3A3F45"
AR_STEEL = "#8C949C"
AR_RADOME = "#E8ECEF"
AR_RADOME_SH = "#C9D0D6"
AR_BEACON = "#FF6A5A"
AR_CRACK = "#4C4A44"
AR_DEPTHS = [-40, -24, -40, -24]
AR_LOW = 55.3
AR_UP = 118.0
AR_PB = (0.0, -14.0)
AR_RAD = (-128.0, 14.0)            # the radome tower's axis
AR_DOME_C = 214.0                   # the radome's centre
AR_DOME_R = 30.0
AR_MAST = (-160.0, 30.0)            # the radio mast
AR_DISH = (-86.0, -18.0, 160.0)     # the dish's pivot
AR_DISH_FRAMES, AR_DISH_MS = 12, 160


def ar_snowcap(rig, joint, x0, x1, y0, y1, z, depth=6.0, overhang=3.0, seed=0, icy=True):
    """A thick snow cap on a flat roof: a rounded pillow overhanging the front edge, icicles under it."""
    g = Geo()
    box(g, ((x0 + x1) / 2, (y0 + y1) / 2 - overhang / 2, z + depth / 2), ((x1 - x0) / 2 + overhang, (y1 - y0) / 2 + overhang, depth / 2), p=2.6, cuts=4)
    rig.part(joint, g, AR_SNOW)
    g = Geo()
    rnd = random.Random(seed)
    for k in range(int((x1 - x0) / 14)):
        x = x0 + 7.0 + k * 14.0 + rnd.uniform(-2, 2)
        g.blob((x, y0 - overhang + 0.4, z + depth * 0.25), (4.0 + rnd.uniform(0, 2), 2.0, 2.0 + rnd.uniform(0, 1)), p=2.2, cuts=2)
    rig.part(joint, g, AR_SNOW_SH, outline=0.3)
    if icy:
        ic = Geo()
        icicles(ic, x0 + 2.0, x1 - 2.0, y0 - overhang + 1.0, z + 0.6, length=(5.0, 12.0), r=(1.2, 2.0), every=5.0, seed=seed)
        rig.part(joint, ic, AR_ICE, finish="gloss", outline=0.4)


def ar_dish_geo(a_deg):
    """The radar dish turned to a_deg about its mast: a parabolic reflector on a yoke with a feed horn at its focus."""
    from mathutils import Matrix
    px, py, pz = AR_DISH
    dish, ring, yoke, horn = Geo(), Geo(), Geo(), Geo()
    prof = [(0.0, 0.0)] + [(16.0 * t, 5.2 * t * t) for t in (i / 6 for i in range(1, 7))] + [(15.4, 5.6), (0.0, 0.8)]
    dish.lathe(prof, (0.0, 0.0, 0.0), (0.0, -1.0, 0.0), segs=24)
    # a darker ring inside the bowl (so the reflector reads as a dish, never as a flat face)
    ring.lathe([(9.0, 2.0), (10.6, 2.6), (10.6, 3.0), (9.0, 2.4)], (0.0, -0.4, 0.0), (0.0, -1.4, 0.0), segs=24)
    yoke.capsule((0.0, 2.0, -10.0), (0.0, 1.0, 0.0), 1.4, segs=8, rings=1)
    yoke.capsule((-6.0, 1.6, -8.0), (6.0, 1.6, -8.0), 0.9, segs=6, rings=1)
    # the feed: one boom from the bowl's centre out to a horn at the focus
    horn.capsule((0.0, -1.0, 0.0), (0.0, -10.0, 0.0), 0.9, 0.7, segs=6, rings=1)
    horn.lathe([(0.0, 0.0), (1.4, 0.0), (2.4, 2.6), (0.0, 2.2)], (0.0, -9.6, 0.0), (0.0, -12.4, 0.0), segs=10)
    # tipped up toward the sky: even turned to the camera it shows as an ellipse
    m = Matrix.Translation((px, py, pz)) @ Matrix.Rotation(math.radians(a_deg), 4, "Z") @ Matrix.Rotation(math.radians(-32.0), 4, "X")
    for geo in (dish, ring, yoke, horn):
        for v in geo.bm.verts:
            v.co = m @ v.co
    return dish, ring, yoke, horn


def ar_window(rig, joint, x, y, z, w, h):
    """A lit window in a concrete face: a dark steel frame, a warm pane with a mullion, a snow ledge on its sill."""
    g = Geo()
    box(g, (x, y, z), (w / 2 + 1.4, 0.9, h / 2 + 1.4), p=6)
    rig.part(joint, g, AR_CONC_DKR, outline=0.4)
    g = Geo()
    box(g, (x, y - 0.6, z), (w / 2, 0.5, h / 2), p=6, cuts=1)
    rig.part(joint, g, glow="#F2C27E", outline=0)
    g = Geo()
    box(g, (x, y - 1.3, z), (0.6, 0.4, h / 2), p=4, cuts=1)
    box(g, (x, y - 1.3, z + h * 0.1), (w / 2, 0.4, 0.5), p=4, cuts=1)
    rig.part(joint, g, AR_GUN, finish="metal", outline=0)
    g = Geo().blob((x, y - 1.6, z - h / 2 - 1.2), (w / 2 + 2.4, 2.2, 1.6), p=2.6, cuts=2)
    rig.part(joint, g, AR_SNOW, outline=0.35)


def build_radar(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachL", "breachP", "soot", "domeCrack", "domeCave", "mastBent",
              "winDark"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("win", "body", (-50.0, -26.6, 146.0))
    rig.joint("antenna", "body", (-40.0, -2.0, 254.0))
    rig.joint("banner", "body", (-50.0, -27.4, 236.0))
    rig.joint("mast", "body", (AR_MAST[0], AR_MAST[1], AR_LOW))
    rig.joint("dome", "body", (AR_RAD[0], AR_RAD[1], AR_DOME_C))
    px, py = AR_PB

    # -- the lower block: concrete, warm slits, team bands, the blast door, a thick snow cap -------------------
    g = Geo()
    box(g, (-62.0, 1.0, AR_LOW / 2), (88.0, 43.0, AR_LOW / 2), p=8)
    rig.part("body", g, AR_CONC)
    g = Geo()
    for x in range(-146, 24, 18):
        g.capsule((float(x), -42.6, 2.0), (float(x), -42.6, AR_LOW - 5.0), 0.35, segs=4, rings=1)
    rig.part("body", g, AR_CONC_DKR, outline=0, highlight=False)
    jg_slits(rig, "body", (-136.0, -78.0, -46.0), -42.4, 38.0)
    # a broad team band with pale trim lines (readable at a glance)
    g = Geo()
    box(g, (-92.0, -42.8, 24.0), (56.0, 0.6, 4.4), p=5, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    for z in (18.8, 29.2):
        g.capsule((-147.0, -43.6, z), (-37.0, -43.6, z), 0.6, segs=4, rings=1)
    rig.part("body", g, AR_CONC_LT, outline=0, highlight=False)
    g = Geo()
    box(g, (14.0, -42.8, 18.0), (11.0, 1.2, 18.0), p=6)
    rig.part("body", g, AR_CONC_DKR)
    g = Geo().slab([(5.0, 1.0), (23.0, 1.0), (23.0, 33.0), (5.0, 33.0)], -44.0, 1.2)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    for z in (8.0, 26.0):
        box(g, (14.0, -44.8, z), (8.6, 0.5, 1.2), p=4, cuts=1)
    rig.part("body", g, AR_GUN, finish="metal", outline=0.3)
    ar_snowcap(rig, "body", -150.0, 26.0, -43.0, 44.0, AR_LOW - 1.0, depth=7.0, seed=1)

    # -- the upper block (set back), slits, a team band, its snow cap, a steaming vent ----------------------------
    g = Geo()
    box(g, (-84.0, 12.0, (AR_LOW + AR_UP) / 2), (64.0, 40.0, (AR_UP - AR_LOW) / 2), p=8)
    rig.part("body", g, AR_CONC_DK)
    jg_slits(rig, "body", (-110.0, -60.0), -28.4, 96.0)
    ar_window(rig, "body", -136.0, -28.6, 98.0, 10.0, 10.0)
    g = Geo()
    box(g, (-84.0, -28.8, 80.0), (60.0, 0.6, 4.2), p=5, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    for z in (75.0, 85.0):
        g.capsule((-143.0, -29.6, z), (-25.0, -29.6, z), 0.6, segs=4, rings=1)
    rig.part("body", g, AR_CONC_LT, outline=0, highlight=False)
    # formwork seams on the upper block
    g = Geo()
    for x in range(-140, -26, 18):
        g.capsule((float(x), -28.6, AR_LOW + 2.0), (float(x), -28.6, AR_UP - 5.0), 0.35, segs=4, rings=1)
    rig.part("body", g, AR_CONC_DKR, outline=0, highlight=False)
    ar_snowcap(rig, "body", -148.0, -20.0, -28.0, 52.0, AR_UP - 1.0, depth=6.0, seed=2)
    g = Geo()
    cyl(g, (-110.0, 30.0, AR_UP + 4.0), (-110.0, 30.0, AR_UP + 16.0), 3.0, 2.6, bevel=0.4)
    rig.part("body", g, AR_STEEL, finish="metal", outline=0.4)
    # snow drifts against the foot
    g = Geo()
    for i, (x, y, r) in enumerate(((-150.0, -44.0, 16.0), (-112.0, -48.0, 12.0), (-70.0, -48.0, 14.0), (-28.0, -46.0, 10.0), (24.0, -40.0, 9.0))):
        snow_pillow(g, (x, y, 2.0), (r, r * 0.7, r * 0.4), seed=40 + i)
    g.clip((0, 0, 0.0), (0, 0, -1))
    rig.part("body", g, AR_SNOW)

    # -- the radome tower: a concrete drum, a team ring, the white radome with panel seams ------------------------
    rx, ry = AR_RAD
    g = Geo()
    cyl(g, (rx, ry, AR_UP), (rx, ry, AR_DOME_C - AR_DOME_R + 6.0), 20.0, 18.0, bevel=0.8, segs=32)
    rig.part("body", g, AR_CONC_LT)
    g = Geo()
    cyl(g, (rx, ry, AR_DOME_C - AR_DOME_R + 2.0), (rx, ry, AR_DOME_C - AR_DOME_R + 6.0), 22.0, bevel=0.5, segs=32)
    rig.part("body", g, team=True, outline=0.3)
    g = Geo().sphere((rx, ry, AR_DOME_C), AR_DOME_R, cuts=6)
    g.clip((0, 0, AR_DOME_C - AR_DOME_R + 5.0), (0, 0, -1))
    rig.part("dome", g, AR_RADOME, finish="gloss")
    g = Geo()
    for k in range(10):
        a = 2 * math.pi * k / 10
        pts = [(rx + AR_DOME_R * 1.01 * math.cos(el) * math.cos(a), ry + AR_DOME_R * 1.01 * math.cos(el) * math.sin(a), AR_DOME_C + AR_DOME_R * 1.01 * math.sin(el))
               for el in (math.radians(e) for e in range(-30, 91, 15))]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.35, segs=4, rings=1)
    for el in (-10.0, 20.0, 50.0):
        e = math.radians(el)
        rr = AR_DOME_R * 1.01 * math.cos(e)
        g.lathe([(rr - 0.3, -0.3), (rr + 0.1, 0.0), (rr - 0.3, 0.3)], (rx, ry, AR_DOME_C + AR_DOME_R * math.sin(e)),
                (rx, ry, AR_DOME_C + AR_DOME_R * math.sin(e) + 1.0), segs=32)
    rig.part("dome", g, AR_RADOME_SH, outline=0, highlight=False)
    snow_pillow(g2 := Geo(), (rx, ry, AR_DOME_C + AR_DOME_R - 3.0), (14.0, 12.0, 4.0), seed=51)
    rig.part("dome", g2, AR_SNOW)
    g = Geo()
    for k in range(5):
        a = math.radians(200 + k * 28)
        g.capsule((rx + 26.0 * math.cos(a), ry + 26.0 * math.sin(a), AR_DOME_C + 8.0), (rx + 18.0 * math.cos(a), ry + 18.0 * math.sin(a) - 2.0, AR_DOME_C + 20.0),
                  0.6, segs=4, rings=1)
    rig.part("domeCrack", g, "#5A6066", outline=0, highlight=False)
    g = Geo().slab([(rx - 18.0, AR_DOME_C + 18.0), (rx + 14.0, AR_DOME_C + 22.0), (rx + 20.0, AR_DOME_C + 4.0), (rx - 2.0, AR_DOME_C - 6.0),
                    (rx - 20.0, AR_DOME_C + 2.0)], ry - AR_DOME_R + 4.0, 1.2)
    rig.part("domeCave", g, "#2E3236", outline=0.6)

    # -- the radio mast: a tall lattice with guy wires and a red beacon (buckled at 25%) --------------------------
    mx_, my_ = AR_MAST
    lat = Geo()
    for dx, dy in ((-3.0, -3.0), (3.0, -3.0), (0.0, 3.0)):
        lat.capsule((mx_ + dx, my_ + dy, AR_LOW), (mx_ + dx * 0.3, my_ + dy * 0.3, 326.0), 0.8, 0.6, segs=4, rings=1)
    for k in range(26):
        z = AR_LOW + 6.0 + k * 10.4
        f = 1.0 - 0.7 * (z - AR_LOW) / (326.0 - AR_LOW)
        lat.capsule((mx_ - 3.0 * f, my_ - 3.0 * f, z), (mx_ + 3.0 * f, my_ - 3.0 * f, z + 9.0), 0.35, segs=4, rings=1)
    rig.part("mast", lat, AR_STEEL, finish="metal", outline=0.35)
    g = Geo()
    for z in (140.0, 230.0, 300.0):
        g.capsule((mx_, my_, z), (mx_ + 30.0, my_ - 30.0, AR_LOW + 2.0), 0.3, segs=4, rings=1)
    rig.part("mast", g, "#5E6670", outline=0)
    # the red beacon blinks (the `beacon` prop: lit, then dark)
    rig.joint("beacon", "root", (mx_, my_ - 1.0, 328.0))
    for j in ("beaconOn", "beaconOff"):
        rig.joint(j, "beacon", (mx_, my_ - 1.0, 328.0), hidden=True)
        g = Geo().sphere((mx_, my_ - 1.0, 328.0), 2.6, cuts=2)
        if j == "beaconOn":
            rig.part(j, g, glow=AR_BEACON, outline=0.5, outline_hex="#9E3A30")
        else:
            rig.part(j, g, "#5A3A36", finish="gloss", outline=0.4)
    g = Geo()
    for z in (180.0, 260.0):
        box(g, (mx_, my_ - 3.4, z), (4.0, 0.6, 2.4), p=5, cuts=2)
    rig.part("mast", g, "#C8463C", outline=0.3)
    g = Geo()
    g.capsule((mx_, my_, AR_LOW), (mx_ + 4.0, my_, 180.0), 1.0, 0.8, segs=6, rings=1)
    g.capsule((mx_ + 4.0, my_, 180.0), (mx_ + 40.0, my_ - 12.0, 214.0), 0.9, 0.6, segs=6, rings=1)
    rig.part("mastBent", g, AR_STEEL, finish="metal", outline=0.4)

    # -- the dish's short mast on the upper roof (the dish itself turns in the `dish` prop) ---------------------
    dx_, dy_, dz_ = AR_DISH
    g = Geo()
    cyl(g, (dx_, dy_, AR_UP + 5.0), (dx_, dy_, dz_ - 10.0), 3.4, 2.6, bevel=0.4, segs=12)
    rig.part("body", g, AR_STEEL, finish="metal", outline=0.4)
    g = Geo()
    cyl(g, (dx_, dy_, AR_UP + 4.0), (dx_, dy_, AR_UP + 8.0), 8.0, 6.0, bevel=0.5, segs=16)
    rig.part("body", g, AR_CONC_DKR, outline=0.4)
    rig.joint("dish", "root", AR_DISH)
    for f in range(AR_DISH_FRAMES):
        j = f"dish{f}"
        rig.joint(j, "dish", AR_DISH, hidden=True)
        d_, r_, y_, h_ = ar_dish_geo(30.0 * f)
        rig.part(j, d_, AR_RADOME, finish="gloss", outline=0.4)
        rig.part(j, r_, AR_STEEL, outline=0, highlight=False)
        rig.part(j, y_, AR_STEEL, finish="metal", outline=0.35)
        rig.part(j, h_, AR_GUN, finish="metal", outline=0.3)

    # -- the lookout with a cantilevered deck (the top mount), its antenna and a team banner ----------------------
    g = Geo()
    box(g, (-50.0, 0.0, (AR_UP + 254.0) / 2), (16.0, 26.0, (254.0 - AR_UP) / 2), p=8)
    rig.part("body", g, AR_CONC)
    g = Geo()
    for z in (170.0, 222.0):
        box(g, (-50.0, -0.4, z), (16.8, 26.8, 1.6), p=6)
    rig.part("body", g, AR_CONC_DK, outline=0.4)
    jg_slits(rig, "body", (-50.0,), -26.4, 200.0, w=12.0, h=3.0)
    ar_window(rig, "win", -50.0, -26.6, 146.0, 12.0, 12.0)          # the lookout's lit window (dark at 50%)
    g = Geo()
    box(g, (-50.0, -27.4, 146.0), (6.2, 0.5, 6.2), p=6, cuts=1)
    rig.part("winDark", g, "#2C3036", outline=0, highlight=False)
    g = Geo()
    for dxx in (-10.0, 10.0):
        g.slab([(-50.0 + dxx - 2.4, 254.0), (-50.0 + dxx + 2.4, 254.0), (-50.0 + dxx + 2.4, 236.0)], -30.0, 18.0)
    rig.part("body", g, AR_CONC_DK, outline=0.4)
    g = Geo().slab([(-57.0, 236.0), (-43.0, 236.0), (-43.0, 208.0), (-50.0, 202.0), (-57.0, 208.0)], -27.4, 1.3)
    rig.part("banner", g, team=True, outline=0.5)
    g = Geo()
    for k in range(6):
        a = math.radians(k * 60)
        g.capsule((-50.0, -28.2, 222.0), (-50.0 + math.cos(a) * 4.6, -28.2, 222.0 + math.sin(a) * 4.6), 0.6, segs=4, rings=1)
    rig.part("banner", g, AR_SNOW, outline=0.3)
    g = Geo()
    g.capsule((-40.0, -2.0, 254.0), (-40.0, -2.0, 290.0), 0.8, 0.5, segs=6, rings=1)
    for z in (270.0, 282.0):
        g.capsule((-46.0, -2.0, z), (-34.0, -2.0, z), 0.5, segs=4, rings=1)
    rig.part("antenna", g, AR_STEEL, finish="metal", outline=0.35)
    ar_snowcap(rig, "body", -66.0, -34.0, -26.0, 26.0, 253.0, depth=3.0, overhang=1.6, seed=3, icy=False)

    # -- the pillbox at the lane edge, icicles; a team snowmobile in the drift by the gate ----------------------
    g = Geo()
    cyl(g, (px, py, AR_LOW), (px, py, 192.6), 17.4, 16.4, bevel=0.8, segs=8)
    rig.part("body", g, AR_CONC_LT)
    g = Geo()
    for z in (AR_LOW + 3.0, 128.0, 188.0):
        cyl(g, (px, py, z - 1.6), (px, py, z + 1.6), 18.4, bevel=0.4, segs=8)
    rig.part("body", g, AR_CONC_DK, outline=0.4)
    jg_slits(rig, "body", (px - 6.0,), py - 16.9, 104.0, w=8.0, h=2.6)
    jg_slits(rig, "body", (px - 6.0,), py - 16.6, 160.0, w=8.0, h=2.6)
    ic = Geo()
    icicles(ic, px - 14.0, px + 10.0, py - 18.0, 126.0, length=(4.0, 10.0), r=(1.0, 1.8), every=4.4, seed=9)
    rig.part("body", ic, AR_ICE, finish="gloss", outline=0.4)
    sx, sy = -150.0, -60.0
    g = Geo()
    box(g, (sx, sy, 7.0), (11.0, 5.0, 3.6), p=4, taper=(1.0, 0.8))
    g.blob((sx + 7.0, sy, 9.6), (6.0, 4.6, 3.4), p=2.4, cuts=3)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    box(g, (sx - 4.0, sy, 11.6), (5.0, 4.0, 1.4), p=6, cuts=2)
    g.capsule((sx + 4.0, sy - 4.0, 13.0), (sx + 4.0, sy + 4.0, 13.0), 0.6, segs=4, rings=1)
    rig.part("body", g, AR_GUN, outline=0.4)
    g = Geo()
    for sgn in (-1, 1):
        g.capsule((sx - 12.0, sy + sgn * 4.4, 1.2), (sx + 14.0, sy + sgn * 4.4, 1.2), 0.8, segs=6, rings=1)
        g.capsule((sx + 14.0, sy + sgn * 4.4, 1.2), (sx + 17.0, sy + sgn * 4.4, 4.0), 0.8, segs=6, rings=1)
    rig.part("body", g, AR_STEEL, finish="metal", outline=0.35)

    # -- the turret mounts: snowy sandbag pits -------------------------------------------------------------
    for i, m in enumerate(M):
        platform(rig, "body", m, AR_CONC_LT, AR_CONC_DK, style="sandbag", r=(23.0, 19.0) if i == 2 else (25.0, 19.0), accent=AR_SNOW_SH)

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-120.0, -42.8, 50.0), (-114.0, -42.8, 38.0), (-120.0, -42.8, 26.0)],
                                   [(px - 10.0, py - 17.4, 150.0), (px - 6.0, py - 17.4, 140.0)]], AR_CRACK, AR_CONC_LT)
    chipped_cracks(rig, "crack2", [[(-60.0, -42.8, 50.0), (-56.0, -42.8, 40.0)], [(-50.0, -26.6, 190.0), (-46.0, -26.6, 180.0)]], AR_CRACK, AR_CONC_LT)
    chipped_cracks(rig, "crack3", [[(-130.0, -28.6, 110.0), (-126.0, -28.6, 100.0)], [(-40.0, -26.6, 160.0), (-36.0, -26.6, 150.0)]], AR_CRACK, AR_CONC_LT)
    jg_breach(rig, "breachL", -64.0, -42.6, 24.0, 22.0, 20.0, seed=61)
    flames(rig, "breachL", [(-64.0, -48.0, 16.0, 0.9)])
    jg_breach(rig, "breachP", px - 4.0, py - 17.0, 132.0, 16.0, 18.0, seed=63)
    flames(rig, "breachP", [(px - 4.0, py - 23.0, 124.0, 0.8)])
    g = Geo()
    for sx_, sy_, sz_, rr in ((-64.0, -43.0, 42.0, 8.0), (px - 4.0, py - 17.6, 150.0, 6.0)):
        g.slab([(sx_ + rr * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), sz_ + rr * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)], sy_, 0.6)
    rig.part("soot", g, "#3E3C38", outline=0, highlight=False)
    rubble(rig, "rubble1", [(-158.0, -58.0), (-126.0, -62.0)], AR_SNOW_SH, seed=191)
    rubble(rig, "rubble2", [(-80.0, -62.0), (-30.0, -64.0)], AR_CONC_DK, seed=197)
    rubble(rig, "rubble3", [(-160.0, -64.0), (-116.0, -66.0), (-4.0, -64.0)], AR_CONC, seed=203, size=1.2)

    flag(rig, "root", "flagA", (-50.0 - 4.0, 4.0, 300.0), length=30, height=17, pole=254.0, pole_color=AR_STEEL, finial=AR_STEEL)
    flag(rig, "root", "flagB", (-96.0, 40.0, AR_UP + 70.0), length=24, height=14, pole=AR_UP, pole_color=AR_STEEL, finial=AR_STEEL)

    # -- Treasury: supply crates under snow (1), fuel drums (2), an ammo stack with a gold-banded case (3) -----------
    g = Geo()
    for x, y, z in ((-112.0, -64.0, 0.0), (-102.0, -66.0, 0.0), (-107.0, -65.0, 9.0)):
        box(g, (x, y, z + 4.5), (4.6, 4.6, 4.5), p=6)
    rig.part("treasury1", g, "#6F7656", outline=0.5)
    g = Geo()
    snow_pillow(g, (-107.0, -65.0, 18.6), (6.0, 5.0, 2.0), seed=71)
    rig.part("treasury1", g, AR_SNOW)
    g = Geo()
    for x in (-88.0, -79.0):
        cyl(g, (x, -64.0, 0.0), (x, -64.0, 13.0), 4.6, bevel=0.6, segs=18)
    rig.part("treasury2", g, "#5E6A5A", finish="metal", outline=0.5)
    g = Geo()
    for x, y, z in ((-62.0, -66.0, 0.0), (-52.0, -66.0, 0.0), (-57.0, -66.0, 6.0)):
        box(g, (x, y, z + 3.0), (5.0, 3.6, 3.0), p=6)
    rig.part("treasury3", g, "#5A6048", outline=0.5)
    g = Geo()
    box(g, (-57.0, -66.0, 14.0), (5.6, 3.8, 2.4), p=6)
    rig.part("treasury3", g, AR_GUN, finish="metal")
    g = Geo()
    box(g, (-57.0, -70.0, 14.0), (5.8, 0.4, 0.6), p=4, cuts=1)
    rig.part("treasury3", g, "#C9A227", finish="bronze_rich", outline=0.3)


def ar_beacon_pose(f):
    return {"beaconOn": {"show": True}} if f == 0 else {"beaconOff": {"show": True}}


def ar_dish_pose(f):
    return {f"dish{k}": ({"show": True} if k == f else {"hide": True}) for k in range(AR_DISH_FRAMES)}


def crumble_radar(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "antenna": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachL": {"show": True}, "soot": {"show": True},
                     "domeCrack": {"show": True}, "banner": {"r": 10.0, "sz": 0.55, "x": 1.0}, "winDark": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breachP": {"show": True}, "domeCave": {"show": True},
                     "mast": {"hide": True}, "mastBent": {"show": True}, "banner": {"hide": True}})
    return pose


ARCTIC_RADAR_STATION = base_module(
    "modern", "Arctic Radar Station", height=320, width=190, canvas=(470, 700), feet=(360, 650),
    build=build_radar, crumble=crumble_radar, mount_depth=AR_DEPTHS, skin="arctic_radar_station",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-136.0, -44.0, 38.0), 3, 10), ((-46.0, -44.0, 38.0), 2, 10),
            ((-50.0, -28.0, 200.0), 3, 10)],
    smoke=[((-64.0, -44.0, 40.0), 2), ((AR_PB[0], AR_PB[1] - 18.0, 140.0), 3), ((AR_RAD[0], AR_RAD[1] - 20.0, AR_DOME_C), 3)],
    horn=(-100, 340), yaw=BASE_YAW,
    props=[prop_loop("dish", ["dish"], AR_DISH_FRAMES, ar_dish_pose, ms=AR_DISH_MS, crumble=(0, 2), z="front", hold=1, anchor=AR_DISH,
                     outline=(1.6, 0.55, 0.5)),
           prop_loop("beacon", ["beacon"], 2, ar_beacon_pose, ms=260, crumble=(0, 2), z="front", hold=0, anchor=(AR_MAST[0], AR_MAST[1] - 1.0, 328.0),
                     sequence=[0, 0, 1, 1], outline="none")],
    extra_meta={
        "collapseMaterial": "concrete",
        # the radio mast and the radome fall first, then the lookout
        "topple": [topple_lu(-180, -100, 150, delay_ms=0, push=1.0, sink_lu=32),
                   topple_lu(-72, -26, 170, delay_ms=160, push=0.8, sink_lu=26)],
        "rubbleColors": [AR_CONC, AR_CONC_DK, AR_SNOW, AR_STEEL],
        "dustColor": "#E4E8EA",
        "ambientLu": [ambient_lu("snow", (-80.0, -20.0, 300.0), 90, 1.0), ambient_lu("steam", (-110.0, 30.0, AR_UP + 18.0), 4, 0.6),
                      ambient_lu("glints", (AR_RAD[0] - 10.0, AR_RAD[1] - 28.0, AR_DOME_C + 10.0), 12, 0.4, color="#FFFFFF")],
    },
)

SKINS = [DESERT_BUNKER, JUNGLE_OUTPOST, ARCTIC_RADAR_STATION]
