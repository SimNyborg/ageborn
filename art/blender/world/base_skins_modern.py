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

from world.base_skins_kit import flames, leaf
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, rock, rope,
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


def palm(rig, joint, base, top, fronds=7, size=26.0, seed=0, trunk_r=3.4):
    """A palm: a ringed curving trunk and arching fronds (two greens) with a few coconuts."""
    rnd = random.Random(seed)
    bx, by, bz = base
    tx, ty, tz = top
    pts = []
    for i in range(9):
        t = i / 8
        bend = math.sin(t * math.pi) * 6.0
        pts.append((bx + (tx - bx) * t + bend * 0.4, by + (ty - by) * t, bz + (tz - bz) * t))
    g = Geo()
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        g.capsule(a, b, trunk_r * (1.15 - 0.35 * i / 8), trunk_r * (1.15 - 0.35 * (i + 1) / 8), segs=12, rings=2)
    rig.part(joint, g, PALM)
    g = Geo()
    for i in range(1, 16):
        t = i / 16
        k = int(t * 8)
        a, b = pts[k], pts[min(8, k + 1)]
        f = t * 8 - k
        p = tuple(a[j] + (b[j] - a[j]) * f for j in range(3))
        r = trunk_r * (1.15 - 0.35 * t) + 0.3
        g.lathe([(r - 0.6, -0.5), (r + 0.25, 0), (r - 0.6, 0.5)], p, (p[0], p[1], p[2] + 1), segs=12)
    rig.part(joint, g, PALM_DK, outline=0, highlight=False)
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
                leaf(target, p, L * 0.2 * (0.45 + s), L * 0.06, da + side * 55, tilt=-30)
    rig.part(joint, gd, FROND, finish="hair", outline=0.5)
    rig.part(joint, gl, FROND_LT, finish="hair", outline=0.5)
    g = Geo()
    for k in range(3):
        a = math.radians(120 * k + 30)
        g.sphere((tx + math.cos(a) * 2.6, ty + math.sin(a) * 2.0 - 1.5, tz - 1.0), 2.0, cuts=2)
    rig.part(joint, g, "#6B4E34", outline=0.4)


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
    g = Geo()   # a painted number roundel above the doors
    cyl(g, (hx, fy - 0.6, HG_BASE + dz + 14), (hx, fy - 1.8, HG_BASE + dz + 14), 7.0, bevel=0.3, segs=24)
    rig.part("body", g, CREAM, outline=0.4)
    g = Geo()
    for dx in (-2.2, 2.2):
        box(g, (hx + dx, fy - 2.0, HG_BASE + dz + 14), (1.1, 0.4, 3.6), p=4, cuts=2)
    rig.part("body", g, GUNMETAL, outline=0, highlight=False)
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
        g.capsule((wx + dx * 1.2, wy + dy * 1.2, 0), (wx + dx * 0.8, wy + dy * 0.8, 150), 1.6, 1.3, segs=8, rings=1)
    for z in range(20, 150, 26):
        g.capsule((wx - 11, wy - 9, z), (wx + 11, wy - 9, z + 22), 0.7, segs=6, rings=1)
        g.capsule((wx + 11, wy - 9, z), (wx - 11, wy - 9, z + 22), 0.7, segs=6, rings=1)
    rig.part("tank", g, STEEL, finish="metal", outline=0.5)
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
    g = Geo()
    for dx in (-3.2, 3.2):
        g.capsule((mx + dx, my, 70), (mx + dx * 0.4, my, 304), 1.2, 0.8, segs=8, rings=1)
    for z in range(80, 300, 18):
        w = 3.2 - 1.9 * (z - 70) / 234
        g.capsule((mx - w, my - 0.4, z), (mx + w, my - 0.4, z + 12), 0.5, segs=6, rings=1)
    rig.part("mast", g, STEEL, finish="metal", outline=0.5)
    g = Geo().sphere((mx, my, 308), 2.8, cuts=3)
    rig.part("mast", g, glow="#F2A0C8", outline=0.6, outline_hex=SIGNAL)
    g = Geo()
    g.capsule((mx, my, 300), (mx - 6, my, 300), 0.7)
    rig.part("mast", g, STEEL, finish="metal", outline=0.3)
    sock = Geo()
    for k in range(5):
        t0, t1 = k / 5, (k + 1) / 5
        r0, r1 = 4.6 - 2.4 * t0, 4.6 - 2.4 * t1
        sock.lathe([(r0, 0), (r1, 5.4)], (mx - 7 - 5.4 * k, my, 299 - 1.6 * k), (mx - 8 - 5.4 * k, my, 299 - 1.6 * k - 0.3), segs=14)
    rig.part("sock", sock, team=True)
    g = Geo()
    for k in (1, 3):
        r0 = 4.6 - 2.4 * k / 5 + 0.25
        g.lathe([(r0, 0), (r0 - 0.48, 5.4)], (mx - 7 - 5.4 * k, my, 299 - 1.6 * k), (mx - 8 - 5.4 * k, my, 299 - 1.6 * k - 0.3), segs=14)
    rig.part("sock", g, CREAM, outline=0.3)
    g = Geo()
    sock2 = [(mx - 7, 303.5), (mx - 18, 300), (mx - 14, 296), (mx - 22, 292), (mx - 9, 294.5), (mx - 7, 295)]
    g.slab(sock2, my, 1.0)
    rig.part("sockrag", g, team=True, outline=0.4)
    g = Geo()
    rope(g, [(mx, my - 1, 240), (mx - 30, my - 10, 70)], r=0.45)
    rope(g, [(mx, my - 1, 240), (mx + 26, my - 12, 76)], r=0.45)
    rig.part("mast", g, GUNMETAL, outline=0.2)


def build(rig, M):
    for j, pos in (("mast", (MAST[0], MAST[1], 70)), ("tank", (WTR[0], WTR[1], 0)), ("bag", (M[0][0], M[0][1], M[0][2])),
                   ("palmtop", (-169.0, 47.0, 112.0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "fire1", "fire2", "scorch", "breach", "spill",
              "leak", "sockrag", "palmstump"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    for j in ("lit", "tufts", "wallbag", "sock", "banner", "merlon"):
        rig.joint(j, "body", (0, 0, 0))

    back(rig)
    # the big palm behind the hangar's left shoulder (its crown snaps at 25%)
    palm(rig, "palmtop", (-166.0, 50.0, 0.0), (-170.0, 46.0, 160.0), fronds=8, size=23.0, seed=4)
    g = Geo()
    for k, (dx, dz) in enumerate(((0, 0), (-1.5, 3), (1.4, 5))):
        g.blob((-168.8 + dx, 47.0, 112 + dz), (2.4, 2.0, 3.4), p=2.0, cuts=3, taper=(1.0, 0.2), rot=(0, (k - 1) * 20, 0))
    rig.part("palmstump", g, PALM, outline=0.5)
    hangar(rig, M)
    watchtower(rig, M)
    pillbox_tower(rig, M)
    # dunes drifting against the hangar and the tower, sandbag walls, drums and jerrycans
    dune(rig, "body", (-160.0, -30.0, 0.0), (18.0, 14.0, 14.0), seed=1)
    dune(rig, "body", (-72.0, -44.0, 0.0), (16.0, 10.0, 9.0), seed=2)
    dune(rig, "body", (-28.0, 14.0, 0.0), (20.0, 16.0, 16.0), seed=3)
    g = Geo()
    sandbag_row(g, 6, 40, -58, 0, rows=3, seed=1)
    rig.part("body", g, BAG, finish="hair")
    g = Geo().blob((30.5, -58, 19.8), (5.2, 4.2, 3.0), p=2.6)
    rig.part("wallbag", g, BAG, finish="hair")
    g = Geo()
    for x, y, z, rz in ((40, -66, 3, 30), (18, -70, 3, -20), (30, -74, 3, 70), (8, -64, 3, 10)):
        g.blob((x, y, z), (5.2, 4.2, 3.0), p=2.6, rot=(0, 0, rz))
    rig.part("spill", g, BAG, finish="hair")
    g = Geo()
    sandbag_row(g, -168, -132, -44, 0, rows=2, seed=2)
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
    palm(rig, "body", (-150.0, -46.0, 0.0), (-156.0, -48.0, 62.0), fronds=6, size=18.0, seed=8, trunk_r=2.4)

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
                     "mast": {"r": 14.0, "x": -3.0}, "tank": {"r": -6.0, "x": 2.0, "z": -5.0}, "palmtop": {"hide": True},
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

SKINS = [DESERT_BUNKER]
