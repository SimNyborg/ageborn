"""Industrial Age base skins as real models (PLAN 2c): `base.industrial@<skin>`.

Copper Foundry (Rare, Trophy Road 1800; owner request 2026-10-08 "more base skins that are not just a
recolour"): the Foundry rebuilt as a copper works. A pale stone hall with tall copper-framed furnace
windows carries a verdigris barrel vault on copper ribs; a verdigris gas sphere on iron legs sits on its
left end, two copper smokestacks with flared crowns rise behind it, and a copper water tank on braced iron
stilts stands on the engine house. At the lane edge a riveted verdigris pressure tower wears a giant brass
gauge instead of a clock face. Copper pipes with flanges and brass valve wheels run between them.

Footprint, height band and the four mounts are the Foundry's (common.BASE_MOUNTS): a copper balcony at
the pressure tower's foot, an iron deck on the engine house's roof edge, the pressure tower's top and the
water tank's lid. Team colour: the engine house's sign band, the pressure tower's ring, the stack bands,
the tank's band and the flags.

Crumble: 75% cracks, a broken window, a pipe joint leaking steam, a valve wheel knocked off, rubble; 50%
fire in the furnace windows and on the roof, soot, dark windows, the gauge needle in the red, a stack band
lost, the big pipe bent; 25% a breach with a hanging girder, the short stack snapped, the gas sphere
slumped on a buckled leg, a second fire. Treasury: copper ingots and a coal cart (1), a brass steam engine
(2), its stack and a strongbox of gold (3).
"""
import math

from ageborn_art.geometry import Geo

from world.base_skins_kit import ashlar, flames
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, rubble,
                          topple_lu, window)

VERD = "#4F8F7F"        # verdigris (large areas: the vault, the pressure tower, the sphere)
VERD_LT = "#67A594"
VERD_DK = "#3E7366"
VERD_DKR = "#305A50"
COPPER = "#C27A48"      # polished copper (the tank, stacks, pipes)
COPPER_LT = "#D9935E"
COPPER_DK = "#99593A"
BRASS = "#C9A54A"
BRASS_LT = "#E0C06A"
STONE = "#CFC6B2"       # pale stone walls
STONE_LT = "#DDD5C3"
STONE_MID = "#D6CEBB"
STONE_DK = "#B3A994"
STONE_DKR = "#9A907C"
IRON = "#5B6168"
IRON_LT = "#767D86"
IRON_DK = "#454A51"
COAL = "#2B2A2E"
CREAM = "#E8E1D0"
DIAL = "#FBF5E2"
RED = "#C8473A"
WINDOW = "#FFD9A0"
FURNACE = "#FFB866"
STEAM = "#F2F0EA"
WOOD = "#7A5F48"
SACK = "#BBAA88"
GOLD = "#D4A437"
CRACK = "#4A3F38"
SOOT = "#5E5854"
HOLE = "#1E1A1A"

DEPTHS = [-40, -24, -40, -24]
HALL = (-174.0, -24.0, -40.0, 46.0)   # x0, x1, front y, back y
WALL_H = 104.0                        # the hall's walls (the vault springs here)
ENG_X0 = -86.0                        # the engine house (x from here to the hall's right end) rises to the M1 deck
VAULT_ZR = 30.0                       # the vault's rise
TW = (-6.0, -18.0, 18.0)              # pressure tower: x, y, radius
S1 = (-148.0, 32.0, 9.5, 324.0)       # tall stack: x, y, radius, crown top
S2 = (-124.0, 38.0, 8.0, 290.0)       # short stack
SPH = (-170.0, 24.0, 162.0, 22.0)     # gas sphere: x, y, z, radius
TK_R = 21.0                           # the water tank's radius (its lid is mount 3)


def seams(rig, joint, cx, cy, r, z0, z1, a0=200, a1=340, n=6, color=VERD_DKR):
    """Vertical plate seams on a cylinder's visible front (flat dark lines)."""
    g = Geo()
    for k in range(n):
        a = math.radians(a0 + (a1 - a0) * (k + 0.5) / n)
        p0 = (cx + math.cos(a) * (r + 0.2), cy + math.sin(a) * (r + 0.2), z0)
        p1 = (cx + math.cos(a) * (r + 0.2), cy + math.sin(a) * (r + 0.2), z1)
        g.capsule(p0, p1, 0.55, segs=6, rings=1)
    rig.part(joint, g, glow=color, outline=0)


def rivet_band(rig, joint, cx, cy, r, z, color=COPPER, band=None, n=14, a0=196, a1=344, bw=2.2):
    """A riveted band round a cylinder: a slightly proud ring and a row of studs on its visible front."""
    if band:
        g = Geo()
        cyl(g, (cx, cy, z - bw), (cx, cy, z + bw), r + 0.8, bevel=0.5, segs=32)
        rig.part(joint, g, band, finish="metal", outline=0.4)
    g = Geo()
    for k in range(n):
        a = math.radians(a0 + (a1 - a0) * k / (n - 1))
        g.sphere((cx + math.cos(a) * (r + 1.3), cy + math.sin(a) * (r + 1.3), z), 0.9, cuts=1)
    rig.part(joint, g, color, finish="metal", outline=0.3)


def valve_wheel(rig, joint, c, r=5.0, color=BRASS):
    """A spoked brass valve wheel facing the camera."""
    x, y, z = c
    g = Geo().lathe([(r - 1.0, -0.8), (r + 0.2, 0), (r - 1.0, 0.8), (r - 2.0, 0)], (x, y, z), (x, y - 1, z), segs=20)
    for k in range(4):
        a = math.radians(45 + 90 * k)
        g.capsule((x, y - 0.2, z), (x + math.cos(a) * (r - 1.4), y - 0.2, z + math.sin(a) * (r - 1.4)), 0.6, segs=6, rings=1)
    g.sphere((x, y - 0.8, z), 1.3, cuts=2)
    rig.part(joint, g, color, finish="metal", outline=0.4)


def pipe(rig, joint, pts, r=3.0, color=COPPER, flange=COPPER_DK):
    """A copper pipe along `pts` with flanged joints at every bend."""
    g = Geo()
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, r, segs=12, rings=2)
    rig.part(joint, g, color, finish="metal", outline=0.5)
    g = Geo()
    for i, p in enumerate(pts):
        q = pts[i + 1] if i + 1 < len(pts) else pts[i - 1]
        d = [q[k] - p[k] for k in range(3)]
        L = max(1e-6, math.sqrt(sum(v * v for v in d)))
        u = [v / L for v in d]
        c0 = tuple(p[k] + u[k] * 1.2 for k in range(3))
        c1 = tuple(p[k] + u[k] * 3.4 for k in range(3))
        cyl(g, c0, c1, r + 1.2, bevel=0.4, segs=14)
    rig.part(joint, g, flange, finish="metal", outline=0.4)


def stack(rig, joint, crown_joint, s, base_z, team_z):
    """A copper smokestack: a tapering riveted copper shaft with iron bands, a team band, verdigris streaks
    and a flared crown."""
    x, y, r, top = s
    g = Geo()
    cyl(g, (x, y, base_z), (x, y, top - 10), r, r * 0.84, bevel=0.6, segs=22)
    rig.part(joint, g, COPPER)
    seams(rig, joint, x, y, r * 0.92, base_z + 4, top - 14, a0=210, a1=330, n=3, color=COPPER_DK)
    g = Geo()
    for z in range(int(base_z + 30), int(top - 20), 42):
        rr = r - (r * 0.16) * (z - base_z) / (top - base_z) + 0.6
        cyl(g, (x, y, z - 1.2), (x, y, z + 1.2), rr, bevel=0.4, segs=22)
    rig.part(joint, g, IRON_DK, finish="metal", outline=0.4)
    g = Geo()
    rr = r - (r * 0.16) * (team_z - base_z) / (top - base_z) + 0.7
    cyl(g, (x, y, team_z - 3.5), (x, y, team_z + 3.5), rr, bevel=0.5, segs=22)
    rig.part(joint, g, team=True)
    g = Geo()
    for k, (a, z0, L) in enumerate(((236, top - 16, 40), (262, top - 18, 64), (300, top - 15, 34))):
        rr = r * 0.86
        p = (x + math.cos(math.radians(a)) * (rr + 0.3), y + math.sin(math.radians(a)) * (rr + 0.3))
        g.capsule((p[0], p[1], z0), (p[0], p[1], z0 - L), 1.3, 0.4, segs=6, rings=1)
    rig.part(joint, g, VERD_LT, outline=0, highlight=False)
    g = Geo().lathe([(r * 0.84 - 0.6, 0), (r * 0.84 + 0.6, 0), (r * 1.25, 7.0), (r * 1.32, 10.0), (r * 1.1, 10.4),
                     (r * 0.8, 9.0), (r * 0.7, 9.0)], (x, y, top - 10.4), segs=24)
    rig.part(crown_joint, g, COPPER_LT, finish="metal")
    g = Geo()
    cyl(g, (x, y, top - 1.2), (x, y, top - 0.2), r * 0.7, bevel=0.2, segs=20)
    rig.part(crown_joint, g, COAL, outline=0, highlight=False)


def build(rig, M):
    for j, pos in (("needle", (TW[0], TW[1] - TW[2] - 5.0, 128.0)), ("sphere", (SPH[0], SPH[1], WALL_H + 6)),
                   ("bigpipe", (-150, SPH[1], SPH[2])), ("s2top", (S2[0], S2[1], S2[3] - 70))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "brokenwin", "leak", "fire1", "fire2",
              "scorch", "darkwin", "breach", "girder", "stump"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    for j in ("wheel", "band2"):
        rig.joint(j, "body", (0, 0, 0))
    x0, x1, fy, by = HALL
    hy = (fy + by) / 2
    hd = (by - fy) / 2
    eng_h = M[1][2] - 5.0
    tx, ty, tr = TW
    tower_h = M[2][2] - 4.0

    # -- stacks (behind everything) ---------------------------------------------------------------
    stack(rig, "body", "body", S1, WALL_H + 10, 250.0)
    stack(rig, "body", "s2top", S2, WALL_H + 10, 232.0)
    g = Geo()   # the tall stack's soft plume (the code adds rising puffs on top)
    for dx, dz, r in ((0, 6, 8.0), (-7, 14, 7.0), (-16, 20, 6.4), (-26, 24, 5.4), (-36, 26, 4.4)):
        g.sphere((S1[0] + dx, S1[1] - 2, S1[3] + dz), r, cuts=4)
    rig.part("body", g, "#CFCAC0", finish="dust", outline=0.8)
    # 25%: the short stack snapped to a jagged stump (its top half falls with the collapse)
    zt = S2[3] - 70.0
    pts = []
    for k in range(9):
        a = math.radians(-160 + 140 * k / 8)
        pts.append((S2[0] + 7.4 * math.cos(a), zt + (5.0 if k % 2 else -2.0)))
    g = Geo().slab([(S2[0] - 7.6, zt - 10.0)] + pts + [(S2[0] + 7.6, zt - 10.0)], S2[1] - 6.8, 2.6)
    rig.part("stump", g, COPPER_DK, outline=0.5)

    # -- the hall: pale stone walls, a verdigris barrel vault on copper ribs, the engine house -------
    g = Geo()
    box(g, ((x0 + x1) / 2, hy, WALL_H / 2), ((x1 - x0) / 2, hd, WALL_H / 2), p=7)
    rig.part("body", g, STONE_DK)

    def skip(px, pz):
        win = any(abs(px - wx) < 10 and 30 < pz < 86 for wx in WINDOWS)
        gate = abs(px - GATE_X) < 17 and pz < 46
        return win or gate or (px > ENG_X0 - 2 and pz > WALL_H - 18)

    ashlar(rig, "body", x0 + 3, x1 - 3, 12, WALL_H - 6, fy - 0.8, [STONE, STONE_LT, STONE_MID], h=9.0, w=(12.0, 18.0),
           seed=7, skip=skip)
    g = Geo()
    box(g, ((x0 + x1) / 2, hy, 6.0), ((x1 - x0) / 2 + 2, hd + 2, 6.0), p=6)
    rig.part("body", g, STONE_DKR)
    g = Geo()
    box(g, ((x0 + ENG_X0) / 2, hy, WALL_H - 1.5), ((ENG_X0 - x0) / 2 + 3, hd + 3, 3.0), p=6)
    rig.part("body", g, STONE_LT)
    # the vault: half a squashed cylinder along x, copper ribs, a glazed ridge strip
    vx0, vx1 = x0 + 2, ENG_X0 - 2
    g = Geo().lathe([(0, 0), (hd + 2.5, 0), (hd + 2.5, vx1 - vx0), (0, vx1 - vx0)], (vx0, hy, WALL_H), (vx0 + 1, hy, WALL_H),
                    segs=40, squash=(VAULT_ZR / (hd + 2.5), 1.0))
    g.clip((0, 0, WALL_H), (0, 0, -1))
    rig.part("body", g, VERD)
    g = Geo()
    for k in range(6):
        rx = vx0 + 6 + k * (vx1 - vx0 - 12) / 5
        g.lathe([(hd + 2.4, -1.4), (hd + 3.6, -1.0), (hd + 3.6, 1.0), (hd + 2.4, 1.4)], (rx, hy, WALL_H), (rx + 1, hy, WALL_H),
                segs=40, squash=(VAULT_ZR / (hd + 3.0), 1.0))
    g.clip((0, 0, WALL_H), (0, 0, -1))
    rig.part("body", g, COPPER, finish="metal", outline=0.4)
    g = Geo()   # lighter verdigris streaks running down the vault's front slope (flat lines)
    rv, rz = hd + 2.7, VAULT_ZR + 0.2
    for k in range(10):
        px = vx0 + 5 + k * (vx1 - vx0 - 10) / 9 + (3 if k % 2 else -2)
        top = 74 - (k % 3) * 9
        pts = [(px, hy - rv * math.cos(math.radians(f)), WALL_H + rz * math.sin(math.radians(f))) for f in range(top, 16, -8)]
        for q0, q1 in zip(pts, pts[1:]):
            g.capsule(q0, q1, 0.9, 0.7, segs=6, rings=1)
    rig.part("body", g, glow=VERD_LT, outline=0)
    g = Geo()   # a glazed skylight along the ridge, lit from below
    box(g, ((vx0 + vx1) / 2, hy - 6, WALL_H + VAULT_ZR - 0.6), ((vx1 - vx0) / 2 - 8, 4.0, 1.4), p=4, cuts=2)
    rig.part("body", g, glow=WINDOW, outline=0)
    g = Geo()
    for k in range(10):
        px = vx0 + 10 + k * (vx1 - vx0 - 20) / 9
        box(g, (px, hy - 6, WALL_H + VAULT_ZR + 0.4), (0.6, 4.6, 1.0), p=4, cuts=2)
    rig.part("body", g, IRON_DK, finish="metal", outline=0)
    # the engine house: a flat-roofed block up to the M1 deck, a cornice, the team sign band
    g = Geo()
    box(g, ((ENG_X0 + x1) / 2, hy, eng_h / 2), ((x1 - ENG_X0) / 2, hd, eng_h / 2), p=7)
    rig.part("body", g, STONE)
    ashlar(rig, "body", ENG_X0 + 3, x1 - 3, WALL_H - 18, eng_h - 21, fy - 0.8, [STONE, STONE_LT, STONE_MID], h=9.0,
           w=(12.0, 18.0), seed=9)
    g = Geo()
    box(g, ((ENG_X0 + x1) / 2, hy, eng_h - 1.5), ((x1 - ENG_X0) / 2 + 3, hd + 3, 3.0), p=6)
    rig.part("body", g, STONE_LT)
    g = Geo()
    g.slab([(ENG_X0 + 4, eng_h - 6), (x1 - 4, eng_h - 6), (x1 - 4, eng_h - 19), (ENG_X0 + 4, eng_h - 19)], fy - 1.2, 1.4)
    rig.part("body", g, team=True)
    g = Geo()
    for px in range(int(ENG_X0 + 12), int(x1 - 6), 13):
        box(g, (px, fy - 2.2, eng_h - 12.5), (3.6, 0.6, 2.8), p=4, cuts=2)
    rig.part("body", g, CREAM, outline=0.3)
    # tall furnace windows with copper frames and glazing bars
    for wx in WINDOWS:
        window(rig, "body", wx, fy - 0.4, 58.0, 14, 36, glow_hex=WINDOW, frame=COPPER_DK)
        g = Geo()
        box(g, (wx, fy - 1.3, 46.0), (6.4, 0.3, 5.6), p=4, cuts=2)
        rig.part("body", g, glow=FURNACE, outline=0)
        g = Geo()
        box(g, (wx, fy - 1.4, 58.0), (0.5, 0.4, 17.0), p=4, cuts=2)
        box(g, (wx, fy - 1.4, 56.0), (6.6, 0.4, 0.5), p=4, cuts=2)
        box(g, (wx, fy - 1.4, 68.0), (6.6, 0.4, 0.5), p=4, cuts=2)
        rig.part("body", g, COPPER_DK, finish="metal", outline=0, highlight=False)
        g = Geo()
        box(g, (wx, fy - 1.4, 79.0), (9.0, 1.6, 2.0), p=5)
        rig.part("body", g, COPPER, finish="metal", outline=0.4)
    window(rig, "brokenwin", WINDOWS[1], fy - 1.8, 58.0, 14, 36, glow_hex="#2E2826", frame=COPPER_DK)
    # the gate: copper-plated doors with brass studs under a stone arch, lamps either side
    g = Geo()
    box(g, (GATE_X, fy - 1.0, 23.0), (15.0, 1.6, 23.0), p=6)
    rig.part("body", g, STONE_LT)
    g = Geo()
    box(g, (GATE_X, fy - 2.0, 20.0), (12.0, 1.6, 20.0), p=6)
    rig.part("body", g, COPPER_DK, finish="metal")
    g = Geo()
    for gx in (GATE_X - 7, GATE_X, GATE_X + 7):
        for gz in (6.0, 14.0, 22.0, 30.0):
            g.sphere((gx, fy - 3.8, gz), 0.9, cuts=2)
    box(g, (GATE_X, fy - 3.4, 20.0), (0.5, 0.5, 19.0), p=4, cuts=2)
    rig.part("body", g, BRASS_LT, finish="metal", outline=0)
    for lx in (GATE_X - 20, GATE_X + 20):
        g = Geo()
        g.capsule((lx, fy - 1.0, 44.0), (lx, fy - 7.0, 46.0), 0.8)
        box(g, (lx, fy - 8.0, 46.0), (2.6, 2.6, 3.4), p=4)
        rig.part("body", g, COPPER_DK, finish="metal", outline=0.4)
        g = Geo().blob((lx, fy - 10.6, 46.0), (1.8, 0.6, 2.6), p=2.4)
        rig.part("body", g, glow="#FFF1CE", outline=0)

    # -- the gas sphere on the vault's left end (it slumps at 25%) ------------------------------------
    sx, sy, sz, sr = SPH
    g = Geo().sphere((sx, sy, sz), sr, cuts=6)
    rig.part("sphere", g, VERD)
    rivet_band(rig, "sphere", sx, sy, sr, sz, color=COPPER_LT, band=COPPER, n=16, a0=190, a1=350)
    g = Geo()
    for k in range(5):
        a = math.radians(210 + 30 * k)
        p0 = (sx + math.cos(a) * (sr + 0.2), sy + math.sin(a) * (sr + 0.2))
        g.capsule((p0[0] * 0.98 + sx * 0.02, p0[1], sz + sr * 0.75), (p0[0], p0[1], sz + 2), 1.0, 0.4, segs=6, rings=1)
    rig.part("sphere", g, VERD_LT, outline=0, highlight=False)
    g = Geo()
    for lx, ly in ((sx - 14, sy - 12), (sx + 14, sy - 12), (sx - 14, sy + 12), (sx + 14, sy + 12)):
        g.capsule((lx, ly, WALL_H + 6), (sx + (lx - sx) * 0.55, sy + (ly - sy) * 0.55, sz - sr * 0.7), 1.8, 1.4, segs=10, rings=2)
    g.capsule((sx - 14, sy - 12, WALL_H + 18), (sx + 14, sy - 12, WALL_H + 18), 1.0, segs=8, rings=1)
    rig.part("sphere", g, IRON_DK, finish="metal", outline=0.5)
    g = Geo().sphere((sx, sy, sz), sr + 0.5, cuts=6)   # the company's painted crown on the sphere
    g.clip((0, 0, sz + sr * 0.5), (0, 0, -1))
    rig.part("sphere", g, team=True)
    g = Geo().sphere((sx, sy, sz + sr + 1.2), 3.0, cuts=3)
    g.capsule((sx, sy, sz + sr - 1), (sx, sy, sz + sr + 2), 1.6)
    rig.part("sphere", g, BRASS, finish="metal", outline=0.4)
    # the big pipe from the sphere to the engine house (bent at 50%)
    pipe(rig, "bigpipe", [(sx + sr - 2, sy - 4, sz - 2), (-120, sy - 4, sz - 2), (-98, sy - 4, sz - 2), (-92, sy - 4, eng_h + 4)],
         r=3.2)
    # a vertical pipe down the hall front with a valve wheel (knocked off at 75%) and a steam vent
    pipe(rig, "body", [(x0 + 8, fy - 4, WALL_H - 4), (x0 + 8, fy - 4, 20), (x0 + 16, fy - 4, 10), (x0 + 16, fy - 4, 0)], r=2.6)
    valve_wheel(rig, "wheel", (x0 + 8, fy - 8.2, 60), r=5.4)
    g = Geo()
    for dx, dz, r in ((0, 0, 3.6), (4, 3, 3.0), (-3, 5, 2.8), (2, 8, 2.4)):
        g.sphere((-96 + dx, sy - 10, eng_h + 10 + dz), r, cuts=3)
    rig.part("leak", g, STEAM, finish="dust", outline=0.6)

    # -- the water tank on stilts (its lid is mount 3) ------------------------------------------------
    x3, y3, z3 = M[3]
    kx, ky = x3 - 2.0, y3 + 4.0
    k0 = z3 - 40.0
    g = Geo()
    feet = [(kx - 20, ky - 6), (kx + 18, ky - 6), (kx - 20, ky + 26), (kx + 18, ky + 26)]
    tops = [(kx - 15, ky - 8), (kx + 13, ky - 8), (kx - 15, ky + 12), (kx + 13, ky + 12)]
    for (fx, fyy), (qx, qy) in zip(feet, tops):
        g.capsule((fx, fyy, eng_h), (qx, qy, k0 + 1), 1.7, 1.4, segs=10, rings=2)
    for k in range(3):
        za = eng_h + 4 + k * (k0 - eng_h - 6) / 3
        zb = za + (k0 - eng_h - 6) / 3
        fa = (za - eng_h) / (k0 - eng_h)
        fb = (zb - eng_h) / (k0 - eng_h)
        la = (kx - 20 + 5 * fa, ky - 6 - 2 * fa)
        lb = (kx - 20 + 5 * fb, ky - 6 - 2 * fb)
        ra = (kx + 18 - 5 * fa, ky - 6 - 2 * fa)
        rb = (kx + 18 - 5 * fb, ky - 6 - 2 * fb)
        g.capsule((la[0], la[1], za), (rb[0], rb[1], zb), 0.75, segs=6, rings=1)
        g.capsule((ra[0], ra[1], za), (lb[0], lb[1], zb), 0.75, segs=6, rings=1)
    rig.part("body", g, IRON, finish="metal", outline=0.5)
    g = Geo()
    cyl(g, (kx, ky + 2, k0), (kx, ky + 2, z3 - 3), TK_R, bevel=1.2, segs=32, squash=(1.0, 0.9))
    rig.part("body", g, COPPER)
    seams(rig, "body", kx, ky + 2, TK_R * 0.9, k0 + 2, z3 - 5, n=5, color=COPPER_DK)
    g = Geo()
    cyl(g, (kx, ky + 2, (k0 + z3 - 3) / 2 - 6.5), (kx, ky + 2, (k0 + z3 - 3) / 2 + 6.5), TK_R + 0.7, bevel=0.5, segs=32,
        squash=(1.0, 0.9))
    rig.part("body", g, team=True)
    for z in (k0 + 3, z3 - 6):
        g = Geo()
        cyl(g, (kx, ky + 2, z - 1.4), (kx, ky + 2, z + 1.4), TK_R + 0.8, bevel=0.5, segs=32, squash=(1.0, 0.9))
        rig.part("body", g, COPPER_DK, finish="metal", outline=0.4)
    g = Geo()   # verdigris drips from the lid
    for a, L in ((228, 14), (252, 22), (284, 10), (306, 18)):
        p = (kx + math.cos(math.radians(a)) * (TK_R + 0.4), ky + 2 + math.sin(math.radians(a)) * (TK_R * 0.9 + 0.4))
        g.capsule((p[0], p[1], z3 - 7), (p[0], p[1], z3 - 7 - L), 1.4, 0.5, segs=6, rings=1)
    rig.part("body", g, VERD_LT, outline=0, highlight=False)
    g = Geo()   # the lid: an iron disc, its top exactly at the mount
    cyl(g, (kx, ky + 2, z3 - 3.4), (kx, ky + 2, z3), TK_R + 1.4, bevel=0.8, segs=32, squash=(1.0, 0.9))
    rig.part("body", g, IRON_LT, finish="metal")
    g = Geo()   # a brass level glass and a ladder on the tank's side
    box(g, (kx + 10, ky + 2 - TK_R * 0.9 + 1.0, (k0 + z3) / 2), (1.2, 1.0, 14.0), p=4, cuts=2)
    rig.part("body", g, BRASS_LT, finish="metal", outline=0.3)
    g = Geo()
    for sxx in (-1, 1):
        g.capsule((kx - TK_R - 1 + sxx * 2.2, ky - 4, eng_h), (kx - TK_R - 1 + sxx * 2.2, ky - 4, z3 - 2), 0.6, segs=6, rings=1)
    for k in range(int((z3 - eng_h) // 7)):
        zz = eng_h + 4 + k * 7
        g.capsule((kx - TK_R - 3.2, ky - 4, zz), (kx - TK_R + 1.2, ky - 4, zz), 0.45, segs=6, rings=1)
    rig.part("body", g, IRON_DK, finish="metal", outline=0.3)

    # -- the pressure tower at the lane edge (its foot balcony is mount 0, its top mount 2) -----------
    g = Geo()
    cyl(g, (tx, ty, 0), (tx, ty, 14), tr + 3.0, tr + 2.4, bevel=1.0, segs=30)
    rig.part("body", g, STONE_DKR)
    g = Geo()
    cyl(g, (tx, ty, 14), (tx, ty, tower_h), tr, tr - 1.5, bevel=1.0, segs=30)
    rig.part("body", g, VERD)
    seams(rig, "body", tx, ty, tr - 0.8, 16, tower_h - 18, n=5)
    for z in (40.0, 92.0, 150.0):
        rivet_band(rig, "body", tx, ty, tr - 1.5 * z / tower_h, z, color=COPPER_LT, band=COPPER, n=12)
    g = Geo()
    cyl(g, (tx, ty, tower_h - 24), (tx, ty, tower_h - 6), tr - 0.6, tr + 0.6, bevel=0.6, segs=30)
    rig.part("body", g, team=True)
    g = Geo()
    cyl(g, (tx, ty, tower_h - 6), (tx, ty, tower_h), tr + 1.6, bevel=0.8, segs=30)
    rig.part("body", g, COPPER, finish="metal", outline=0.5)
    window(rig, "body", tx + 4, ty - tr - 0.2, 116.0, 6, 12, glow_hex=WINDOW, frame=COPPER_DK)
    window(rig, "body", tx - 6, ty - tr - 0.2, 26.0, 7, 14, glow_hex=WINDOW, frame=COPPER_DK)
    # the giant gauge: a brass rim, a cream dial with a red zone, bold ticks and the needle
    gz = 128.0
    gy = ty - tr - 0.4
    g = Geo()   # a collar bridging the dial to the round tower
    cyl(g, (tx, gy + 9.0, gz), (tx, gy, gz), 12.4, bevel=0.6, segs=32)
    rig.part("body", g, COPPER_DK, finish="metal", outline=0.4)
    g = Geo()
    cyl(g, (tx, gy + 1.0, gz), (tx, gy - 3.2, gz), 13.4, bevel=0.8, segs=40)
    rig.part("body", g, BRASS, finish="metal")
    g = Geo()
    cyl(g, (tx, gy - 2.8, gz), (tx, gy - 4.0, gz), 11.2, bevel=0.2, segs=40)
    rig.part("body", g, DIAL, finish="gloss", outline=0)
    g = Geo()
    pts = [(tx + math.cos(math.radians(a)) * 9.8, gz + math.sin(math.radians(a)) * 9.8) for a in range(-40, 12, 6)]
    inner = [(tx + math.cos(math.radians(a)) * 7.2, gz + math.sin(math.radians(a)) * 7.2) for a in range(10, -42, -6)]
    g.slab(pts + inner, gy - 4.1, 0.4)
    rig.part("body", g, glow=RED, outline=0)
    g = Geo()
    for k in range(9):
        a = math.radians(220 - 30 * k)
        L = 3.0 if k % 2 == 0 else 1.8
        box(g, (tx + 9.0 * math.cos(a), gy - 4.3, gz + 9.0 * math.sin(a)), (0.55, 0.3, L / 2), p=4, cuts=2,
            rot=(0, -math.degrees(a) + 90, 0))
    rig.part("body", g, COAL, outline=0, highlight=False)
    g = Geo()
    g.capsule((tx, gy - 4.8, gz), (tx - 5.0, gy - 4.8, gz + 6.0), 0.85)
    g.sphere((tx, gy - 5.0, gz), 1.6, cuts=2)
    rig.part("needle", g, RED, outline=0.3)
    wy = ty - math.sqrt(max(1.0, (tr - 0.6) ** 2 - 8.0 ** 2)) - 2.0
    g = Geo().capsule((tx + 8, wy + 3.0, 70.0), (tx + 8, wy, 70.0), 1.0, segs=8, rings=1)
    rig.part("body", g, BRASS, finish="metal", outline=0.3)
    valve_wheel(rig, "body", (tx + 8, wy - 0.6, 70.0), r=5.0)

    # -- turret platforms ---------------------------------------------------------------------------
    platform(rig, "body", M[0], COPPER, IRON_DK, style="stone", r=(25, 19))
    platform(rig, "body", M[1], IRON_LT, IRON_DK, style="stone", r=(26, 19))
    platform(rig, "body", M[2], COPPER_LT, VERD_DK, style="bastion", r=(25, 20))
    g = Geo()   # iron railing posts on the engine house deck
    for dx in (-18, -6, 6):
        g.capsule((M[1][0] + dx, M[1][1] - 14, M[1][2]), (M[1][0] + dx, M[1][1] - 14, M[1][2] + 7), 0.8)
    g.capsule((M[1][0] - 18, M[1][1] - 14, M[1][2] + 7), (M[1][0] + 6, M[1][1] - 14, M[1][2] + 7), 0.8)
    rig.part("body", g, IRON_DK, finish="metal", outline=0.4)

    # -- damage --------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-150, fy - 1.2, 40), (-144, fy - 1.2, 30), (-150, fy - 1.2, 18)],
                                   [(tx - 8, ty - tr - 1.2, 74), (tx - 3, ty - tr - 1.2, 64), (tx - 8, ty - tr - 1.2, 54)]],
                   CRACK, STONE_LT)
    chipped_cracks(rig, "crack2", [[(-118, fy - 1.2, 96), (-112, fy - 1.2, 86), (-118, fy - 1.2, 74)],
                                   [(-70, fy - 1.2, 40), (-64, fy - 1.2, 28), (-70, fy - 1.2, 16)],
                                   [(tx + 6, ty - tr - 1.2, 176), (tx + 10, ty - tr - 1.2, 166)]], CRACK, STONE_LT)
    chipped_cracks(rig, "crack3", [[(tx - 6, ty - tr - 1.2, 108), (tx - 1, ty - tr - 1.2, 98), (tx - 6, ty - tr - 1.2, 84)],
                                   [(-168, fy - 1.2, 96), (-162, fy - 1.2, 84)]], CRACK, STONE_LT)
    rubble(rig, "rubble1", [(-150, -54), (-128, -60)], STONE_DK, seed=4)
    rubble(rig, "rubble2", [(-96, -60), (-66, -64)], STONE_DK, seed=14)
    rubble(rig, "rubble3", [(-160, -66), (-120, -68), (-40, -68)], STONE_DKR, seed=24, size=1.2)
    for j, pts2 in (("rubble2", [(-84, -66)]), ("rubble3", [(-138, -70), (-58, -72)])):
        g = Geo()
        for k, (px, py) in enumerate(pts2):
            box(g, (px, py, 2.4), (6.0, 2.2, 1.0), p=4, rot=(0, 0, 25 * (k + 1)))
        rig.part(j, g, COPPER, finish="metal", outline=0.4)
    g = Geo()
    for wx in WINDOWS:
        g.slab([(wx - 7, 40), (wx + 7, 40), (wx + 7, 70), (wx, 76), (wx - 7, 70)], fy + 0.2, 1.0)
    rig.part("darkwin", g, "#2E2826", outline=0, highlight=False)
    g = Geo()
    for wx in (WINDOWS[0], WINDOWS[2]):
        g.blob((wx + 2, fy - 0.2, 90), (9.0, 1.2, 8.0), p=2.0)
    g.blob((tx - 2, ty - tr - 1.0, 150), (8.0, 1.2, 7.0), p=2.0)
    rig.part("scorch", g, SOOT, outline=0, highlight=False)
    flames(rig, "fire1", [(WINDOWS[0], fy - 3.0, 62.0, 0.9), (WINDOWS[2], fy - 3.0, 62.0, 0.8), (-60, hy - 8.0, eng_h + 4, 1.0)])
    g = Geo().slab([(-118, 16), (-104, 14), (-96, 28), (-100, 46), (-112, 50), (-124, 42), (-126, 26)], fy - 0.5, 2.2)
    rig.part("breach", g, STONE_DKR, outline=0.6)
    g = Geo().slab([(-116, 20), (-106, 19), (-100, 30), (-103, 42), (-112, 45), (-121, 38), (-122, 27)], fy - 1.4, 1.0)
    rig.part("breach", g, HOLE, outline=0, highlight=False)
    g = Geo()
    g.capsule((-120.0, fy - 3.0, 42.0), (-96.0, fy - 8.0, 24.0), 2.2)
    g.capsule((-120.0, fy - 3.0, 36.0), (-100.0, fy - 7.0, 20.0), 1.4)
    rig.part("girder", g, IRON_DK, finish="metal", outline=0.5)
    flames(rig, "fire2", [(tx + 6, ty - tr - 4.0, 52.0, 1.1), (-112.0, fy - 4.0, 22.0, 0.9), (S2[0], S2[1] - 8, zt + 2, 0.8)])

    # -- flags -------------------------------------------------------------------------------------
    flag(rig, "root", "flagA", (kx + 12, ky + 19, z3 + 48), length=30, height=17, pole=z3, pole_color=IRON_DK,
         finial=BRASS_LT)
    flag(rig, "root", "flagB", (sx - 4, sy + 6, sz + sr + 46), length=24, height=14, pole=sz + sr + 3,
         pole_color=IRON_DK, finial=BRASS_LT)

    # -- Treasury -----------------------------------------------------------------------------------
    g = Geo()   # 1: copper ingots on a pallet and a coal cart
    box(g, (-162, -60, 2.0), (10.0, 7.0, 2.0), p=5)
    rig.part("treasury1", g, WOOD)
    g = Geo()
    for k, (dx, dz) in enumerate(((-5, 5.5), (0, 5.5), (5, 5.5), (-2.5, 9.0), (2.5, 9.0))):
        box(g, (-162 + dx, -60, dz), (2.3, 5.0, 1.6), p=5, taper=(1.0, 0.8))
    rig.part("treasury1", g, COPPER_LT, finish="metal")
    g = Geo()
    box(g, (-140, -62, 11), (9.0, 6.0, 5.0), p=5, taper=(0.85, 1.0))
    rig.part("treasury1", g, IRON_DK, finish="metal")
    g = Geo()
    for dx in (-5, 0, 5):
        g.sphere((-140 + dx, -62, 17.0), 3.2, cuts=2)
    rig.part("treasury1", g, COAL, outline=0.3)
    g = Geo()
    for dx in (-6, 6):
        cyl(g, (-140 + dx, -68.4, 4), (-140 + dx, -69.6, 4), 4.0, bevel=0.3, segs=14)
    rig.part("treasury1", g, WOOD, outline=0.4)
    g = Geo()   # 2: a brass steam engine: a boiler, a flywheel and a belt
    cyl(g, (-120, -60, 7), (-100, -60, 7), 6.4, bevel=1.0, segs=18)
    rig.part("treasury2", g, BRASS, finish="metal")
    g = Geo()
    for xx in (-117, -103):
        cyl(g, (xx, -60, 7), (xx + 1.4, -60, 7), 6.8, bevel=0.2, segs=18)
    rig.part("treasury2", g, COPPER, finish="metal", outline=0.3)
    g = Geo()
    cyl(g, (-92, -66, 14), (-92, -68, 14), 12.0, bevel=0.4, segs=28)
    rig.part("treasury2", g, IRON_DK, finish="metal")
    g = Geo()
    for k in range(6):
        a = 2 * math.pi * k / 6
        g.capsule((-92, -68.6, 14), (-92 + 10 * math.cos(a), -68.6, 14 + 10 * math.sin(a)), 1.0)
    rig.part("treasury2", g, BRASS_LT, finish="metal", outline=0.3)
    g = Geo()
    g.capsule((-92, -66.4, 25.6), (-104, -62.6, 13.0), 0.8)
    g.capsule((-92, -66.4, 2.4), (-104, -62.6, 1.0), 0.8)
    rig.part("treasury2", g, "#5A4A3E", outline=0.3)
    g = Geo()   # 3: the engine's copper stack and a brass-banded strongbox of gold
    cyl(g, (-114, -60, 12), (-115, -60, 36), 2.4, 2.0, bevel=0.3, segs=12)
    cyl(g, (-115.2, -60, 35), (-115.4, -60, 38), 3.4, bevel=0.3, segs=12)
    rig.part("treasury3", g, COPPER, finish="metal", outline=0.4)
    g = Geo()
    box(g, (-60, -64, 6), (8.0, 6.0, 6.0), p=6)
    rig.part("treasury3", g, IRON_DK, finish="metal")
    g = Geo()
    for dx in (-4.0, 4.0):
        box(g, (-60 + dx, -70.2, 6), (1.2, 0.5, 6.2), p=4, cuts=2)
    for dx, dz in ((-4, 13.4), (2, 14.0), (-1, 15.4), (5, 13.0)):
        g.blob((-60 + dx, -64, dz), (3.0, 3.0, 1.3), p=2.0)
    rig.part("treasury3", g, GOLD, finish="metal", outline=0.3)


WINDOWS = (-156.0, -132.0, -108.0)
GATE_X = -52.0


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "brokenwin": {"show": True},
                     "leak": {"show": True}, "wheel": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "darkwin": {"show": True}, "needle": {"r": -95.0}, "bigpipe": {"r": -4.0, "z": -2.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire2": {"show": True}, "breach": {"show": True},
                     "girder": {"show": True}, "s2top": {"hide": True}, "stump": {"show": True},
                     "sphere": {"r": -11.0, "x": 3.0, "z": -7.0}, "leak": {"hide": True}, "needle": {"r": -120.0}})
    return pose


COPPER_FOUNDRY = base_module(
    "industrial", "Copper Foundry", height=330, width=190, canvas=(470, 720), feet=(360, 670),
    build=build, crumble=crumble, mount_depth=DEPTHS, skin="copper_foundry",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((WINDOWS[0], -45.0, 58.0), 3, 16), ((WINDOWS[1], -45.0, 58.0), 2, 16), ((WINDOWS[2], -45.0, 58.0), 3, 16),
            ((GATE_X - 20, -51.0, 46.0), 3, 12), ((GATE_X + 20, -51.0, 46.0), 3, 12), ((-6.0, -40.0, 128.0), 2, 18)],
    smoke=[((S1[0], S1[1], S1[3] + 4), 0), ((-100.0, -40.0, 90.0), 2), ((-6.0, -36.0, 150.0), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "iron",
        # the stacks fall toward the lane first, then the water tank on its stilts
        "topple": [topple_lu(-160, -116, 170, delay_ms=0, push=1.0, sink_lu=36),
                   topple_lu(-80, -24, 190, delay_ms=160, push=0.8, sink_lu=28)],
        "rubbleColors": [STONE, STONE_DK, COPPER, VERD],
        "dustColor": "#C9C0AC",
        "ambientLu": [ambient_lu("embers", (WINDOWS[0], -46, 58), 12, 1.0), ambient_lu("embers", (WINDOWS[2], -46, 58), 12, 1.0),
                      ambient_lu("embers", (S1[0], S1[1], S1[3] + 6), 10, 0.8), ambient_lu("steam", (-96, 14, 128), 10, 0.7),
                      ambient_lu("embers", (S2[0], S2[1], S2[3] + 4), 8, 0.6)],
    },
)

SKINS = [COPPER_FOUNDRY]
