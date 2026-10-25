"""Industrial Age base skins as real models (PLAN 2c): `base.industrial@<skin>`.

Copper Foundry (Rare, Trophy Road 1800; owner request 2026-10-08 "more base skins that are not just a
recolour"): the Foundry rebuilt as a copper works. A pale stone hall with tall copper-framed furnace
windows carries a verdigris barrel vault on copper ribs; a verdigris gas sphere on iron legs sits on its
left end, two copper smokestacks with flared crowns rise behind it, and a copper water tank on braced iron
stilts stands on the engine house. At the lane edge a riveted verdigris pressure tower wears a giant brass
gauge instead of a clock face. Copper pipes with flanges and brass valve wheels run between them.

Colour (review 1, 2026-10-08): on the blue team the first render showed bright orange copper over about
6% of the base (the standard Foundry 0.8%), next to the orange team's colour. The big copper surfaces (the
two stacks, the water tank, the gate doors, two platform tops) are now weathered copper (a desaturated
brown, saturation under 40%) streaked with verdigris; polished copper stays only as small accents (the
stacks' flared crowns, hoops, rivet bands, ribs, pipes, window hoods and the gauge collar).

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
import random

from ageborn_art.geometry import Geo

from world.base_skins_kit import ashlar, flames
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, prop_loop, rubble,
                          topple_lu, window)

VERD = "#4F8F7F"        # verdigris (large areas: the vault, the pressure tower, the sphere)
VERD_LT = "#67A594"
VERD_DK = "#3E7366"
VERD_DKR = "#305A50"
COPPER = "#C27A48"      # polished copper: small accents only (hoops, rivets, ribs, pipes, crowns)
COPPER_LT = "#D9935E"
COPPER_DK = "#99593A"
AGED = "#7C5E50"        # weathered copper (large areas: the stacks, the tank; HSV saturation 0.35)
AGED_LT = "#94735F"
AGED_DK = "#5E463C"
PATINA = "#6E9282"      # a soft verdigris patina on the weathered copper (less contrast than VERD_LT)
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
    rig.part(joint, g, AGED)
    seams(rig, joint, x, y, r * 0.92, base_z + 4, top - 14, a0=210, a1=330, n=3, color=AGED_DK)
    g = Geo()
    for z in range(int(base_z + 30), int(top - 20), 42):
        rr = r - (r * 0.16) * (z - base_z) / (top - base_z) + 0.6
        cyl(g, (x, y, z - 1.2), (x, y, z + 1.2), rr, bevel=0.4, segs=22)
    rig.part(joint, g, IRON_DK, finish="metal", outline=0.4)
    g = Geo()
    rr = r - (r * 0.16) * (team_z - base_z) / (top - base_z) + 0.7
    cyl(g, (x, y, team_z - 3.5), (x, y, team_z + 3.5), rr, bevel=0.5, segs=22)
    rig.part(joint, g, team=True)
    g = Geo()   # verdigris running down from the crown (the weathered copper's patina), a few soft runs
    for k, (a, z0, L) in enumerate(((236, top - 16, 58), (258, top - 18, 96), (284, top - 16, 70), (306, top - 15, 40),
                                    (270, base_z + 96, 36))):
        rr = r * 0.86
        p = (x + math.cos(math.radians(a)) * (rr + 0.3), y + math.sin(math.radians(a)) * (rr + 0.3))
        g.capsule((p[0], p[1], z0), (p[0], p[1], z0 - L), 1.5, 0.45, segs=6, rings=1)
    rig.part(joint, g, PATINA, outline=0, highlight=False)
    g = Geo().lathe([(r * 0.84 - 0.6, 0), (r * 0.84 + 0.6, 0), (r * 1.25, 7.0), (r * 1.32, 10.0), (r * 1.1, 10.4),
                     (r * 0.8, 9.0), (r * 0.7, 9.0)], (x, y, top - 10.4), segs=24)
    rig.part(crown_joint, g, COPPER_LT, finish="metal")   # the polished crown: an accent
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
    rig.part("stump", g, AGED_DK, outline=0.5)

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
    rig.part("body", g, AGED_DK, finish="metal")
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
    rig.part("body", g, AGED)
    seams(rig, "body", kx, ky + 2, TK_R * 0.9, k0 + 2, z3 - 5, n=5, color=AGED_DK)
    g = Geo()
    cyl(g, (kx, ky + 2, (k0 + z3 - 3) / 2 - 6.5), (kx, ky + 2, (k0 + z3 - 3) / 2 + 6.5), TK_R + 0.7, bevel=0.5, segs=32,
        squash=(1.0, 0.9))
    rig.part("body", g, team=True)
    for z in (k0 + 3, z3 - 6):   # polished hoops: thin accents on the weathered tank
        g = Geo()
        cyl(g, (kx, ky + 2, z - 1.4), (kx, ky + 2, z + 1.4), TK_R + 0.8, bevel=0.5, segs=32, squash=(1.0, 0.9))
        rig.part("body", g, COPPER, finish="metal", outline=0.4)
    g = Geo()   # verdigris drips from the lid
    for a, L in ((226, 16), (248, 26), (272, 18), (294, 28), (312, 14)):
        p = (kx + math.cos(math.radians(a)) * (TK_R + 0.4), ky + 2 + math.sin(math.radians(a)) * (TK_R * 0.9 + 0.4))
        g.capsule((p[0], p[1], z3 - 7), (p[0], p[1], z3 - 7 - L), 1.4, 0.5, segs=6, rings=1)
    rig.part("body", g, PATINA, outline=0, highlight=False)
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
    platform(rig, "body", M[0], AGED, IRON_DK, style="stone", r=(25, 19))
    platform(rig, "body", M[1], IRON_LT, IRON_DK, style="stone", r=(26, 19))
    platform(rig, "body", M[2], AGED_LT, VERD_DK, style="bastion", r=(25, 20))
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
        "rubbleColors": [STONE, STONE_DK, AGED, VERD],
        "dustColor": "#C9C0AC",
        "ambientLu": [ambient_lu("embers", (WINDOWS[0], -46, 58), 12, 1.0), ambient_lu("embers", (WINDOWS[2], -46, 58), 12, 1.0),
                      ambient_lu("embers", (S1[0], S1[1], S1[3] + 6), 10, 0.8), ambient_lu("steam", (-96, 14, 128), 10, 0.7),
                      ambient_lu("embers", (S2[0], S2[1], S2[3] + 4), 8, 0.6)],
    },
)



# ---------------------------------------------------------------------------------------------------
# Rail Depot (round 3; Rare, Time Capsule): an engine roundhouse with an armoured locomotive parked along its front
# as part of the wall and a water tower over it. The roundhouse is brick with stone lintels: arched engine bays with
# team doors folded open (a second engine's smokebox and lamp glowing in one), a clerestory of lit windows under a
# slate roof with iron smoke jacks, a railway semaphore on its corner (team arm, a lamp). The armoured engine faces
# into the depot: riveted iron plates over its boiler with a team stripe, a flared stack, big drivers with red
# spokes, its armoured cab at the lane end carrying the gate-side mount; the gate is an iron sliding door under it.
# The water tower stands on the roof on a braced iron trestle: a riveted tank with a team band, a conical roof, a
# spout; its trestle and tank catwalk carry the upper mounts. Team colour: the stripe, the bay doors, the tank band,
# the semaphore arm, a banner and the flags. Code ambient: steam from the stack and the cylinders, smoke from the
# jacks; the signal and head lamps glow (lights).
#
# Crumble: 75% cracks, a smoke jack knocked off, brick and coal rubble; 50% a burning breach in the roundhouse, an
# armour plate blown off the engine (its boiler showing, sparks), the banner torn; 25% a ragged breach with fire,
# the tank tipped on a buckled leg, the stack knocked askew, fire under the roof.

RD_BRICK = "#8A6A63"
RD_BRICK_LT = "#9C7C74"
RD_BRICK_DK = "#735852"
RD_BRICK_DKR = "#624B46"
RD_STONE = "#C3BCAC"
RD_STONE_DK = "#A69F90"
RD_SLATE = "#403F45"
RD_SLATE_LT = "#56555C"
RD_IRON = "#5B6168"
RD_IRON_LT = "#767D86"
RD_IRON_DK = "#454A51"
RD_ARMOR = "#4C5158"
RD_COAL = "#2B2A2E"
RD_RED = "#8E3A34"            # buffer beam and wheel centres (a deep red, outside the orange band)
RD_BRASS = "#9A8A62"
RD_WINDOW = "#FFD9A0"
RD_LAMP = "#FFE7B0"
RD_SMOKE = "#E6E1D6"
RD_CRACK = "#4A3A36"
RD_DEPTHS = [-40, -24, -40, -24]
RD_ROOF = 119.0               # the roundhouse's flat roof (the right part)
RD_TW = (-25.0, 4.0)          # the water tower's axis
RD_TANK0, RD_TANK1 = 262.0, 330.0


def rd_rivets(g, pts, r=0.7):
    for p_ in pts:
        g.sphere(p_, r, cuts=1)


def rd_wheel(rig, joint, x, y, z, r, spokes=10):
    """A locomotive wheel facing the camera: an iron tyre, red spokes and centre, a crank boss."""
    g = Geo().lathe([(r - 1.6, -1.2), (r, -1.0), (r, 1.0), (r - 1.6, 1.2)], (x, y, z), (x, y - 1.0, z), segs=28)
    rig.part(joint, g, RD_IRON_DK, finish="metal", outline=0.5)
    g = Geo()
    for k in range(spokes):
        a = 2 * math.pi * k / spokes
        g.capsule((x + math.cos(a) * r * 0.25, y - 0.4, z + math.sin(a) * r * 0.25), (x + math.cos(a) * (r - 1.4), y - 0.4, z + math.sin(a) * (r - 1.4)),
                  0.55, segs=4, rings=1)
    g.lathe([(0.0, -0.8), (r * 0.3, -0.6), (r * 0.3, 0.6), (0.0, 0.8)], (x, y - 0.4, z), (x, y - 1.4, z), segs=16)
    rig.part(joint, g, RD_RED, outline=0.3)
    g = Geo().sphere((x + r * 0.45, y - 1.6, z + r * 0.2), r * 0.14, cuts=2)
    rig.part(joint, g, RD_IRON_LT, finish="metal", outline=0.3)


def rd_trestle(rig, joint, x0, x1, y0, y1, z0, z1):
    """The water tower's trestle: four iron legs with X bracing on the faces and struts at three levels."""
    legs = [(x0, y0), (x1, y0), (x0, y1), (x1, y1)]
    g = Geo()
    for lx, ly in legs:
        g.capsule((lx, ly, z0), (lx, ly, z1), 2.0, 1.7, segs=8, rings=1)
    rig.part(joint, g, RD_IRON_DK, finish="metal", outline=0.5)
    b = Geo()
    levels = [z0 + (z1 - z0) * t for t in (0.0, 0.34, 0.67, 1.0)]
    for za, zb in zip(levels, levels[1:]):
        for (ax, ay), (bx, by) in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x0, y0), (x0, y1))):
            b.capsule((ax, ay, za + 2), (bx, by, zb - 2), 0.8, segs=6, rings=1)
            b.capsule((bx, by, za + 2), (ax, ay, zb - 2), 0.8, segs=6, rings=1)
        for (ax, ay), (bx, by) in (((x0, y0), (x1, y0)), ((x1, y0), (x1, y1)), ((x0, y0), (x0, y1))):
            b.capsule((ax, ay, zb), (bx, by, zb), 1.1, segs=6, rings=1)
    rig.part(joint, b, RD_IRON, finish="metal", outline=0.35)


def build_rail_depot(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachR", "breach3", "boiler", "soot", "roofFire"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("jack2", "body", (-124.0, 20.0, 150.0))
    rig.joint("plate", "body", (-80.0, -48.0, 30.0))
    rig.joint("banner", "body", (-150.0, -28.0, 108.0))
    rig.joint("tank", "body", (RD_TW[0], RD_TW[1], RD_TANK0))
    rig.joint("stack", "body", (-102.0, -38.0, 42.0))

    # -- the roundhouse: brick walls, stone cornice, the flat roof on the right, a clerestory on the left ------
    g = Geo()
    box(g, (-93.0, 15.0, 56.0), (90.0, 41.0, 56.0), p=10)
    rig.part("body", g, RD_BRICK)
    g = Geo()
    box(g, (-93.0, 14.0, 115.4), (91.6, 42.4, 3.6), p=7)
    rig.part("body", g, RD_STONE)
    g = Geo()
    box(g, (-93.0, 15.0, RD_ROOF - 0.6), (89.0, 40.0, 0.6), p=6)
    rig.part("body", g, RD_SLATE_LT)
    # brick courses on the front, stone quoins at the corners
    g = Geo()
    for z in range(8, 108, 8):
        g.capsule((-182.0, -26.4, float(z)), (-4.0, -26.4, float(z)), 0.35, segs=4, rings=1)
    rig.part("body", g, RD_BRICK_DKR, outline=0, highlight=False)
    g = Geo()
    for x in (-182.0, -3.0):
        for k, z in enumerate(range(0, 108, 9)):
            box(g, (x, -26.6, z + 4.5), (5.0 if k % 2 == 0 else 3.2, 1.6, 3.9), p=8, cuts=2)
    rig.part("body", g, RD_STONE, outline=0.4)
    # the arched engine bays: dark interiors with a warm glow, team doors folded open, stone voussoirs
    for i, bx in enumerate((-170.0, -136.0)):
        pts = [(bx - 13.0, 0.0), (bx + 13.0, 0.0), (bx + 13.0, 44.0)]
        for k in range(1, 8):
            a = math.pi * k / 8
            pts.append((bx + 13.0 * math.cos(a), 44.0 + 13.0 * math.sin(a)))
        pts.append((bx - 13.0, 44.0))
        g = Geo().slab(pts, -26.8, 1.0)
        rig.part("body", g, "#2F2A28", outline=0)
        g = Geo().slab([(bx - 11.0, 0.0), (bx + 11.0, 0.0), (bx + 10.0, 8.0), (bx - 10.0, 8.0)], -27.4, 0.6)
        rig.part("body", g, glow="#E8A868", outline=0)
        g = Geo()
        for k in range(9):
            a = math.pi * k / 8
            box(g, (bx + 15.4 * math.cos(a), -27.4, 44.0 + 15.4 * math.sin(a)), (2.4, 1.4, 2.0), p=6, cuts=2, rot=(0, -math.degrees(a) + 90, 0))
        rig.part("body", g, RD_STONE, outline=0.4)
        for sgn in (-1, 1):
            g = Geo().slab([(bx + sgn * 13.0, 0.0), (bx + sgn * 21.0, 2.0), (bx + sgn * 21.0, 50.0), (bx + sgn * 13.0, 54.0)], -30.0, 1.4)
            rig.part("body", g, team=True, outline=0.45)
        if i == 1:
            # a second engine waiting in the bay: its smokebox door, a head lamp
            g = Geo()
            cyl(g, (bx, -18.0, 26.0), (bx, -26.0, 26.0), 10.0, bevel=0.8, segs=28)
            rig.part("body", g, RD_COAL, finish="metal")
            g = Geo().sphere((bx, -27.0, 26.0), 2.0, cuts=2)
            g.capsule((bx - 5.0, -26.8, 26.0), (bx + 5.0, -26.8, 26.0), 0.6, segs=4, rings=1)
            rig.part("body", g, RD_IRON_LT, finish="metal", outline=0.3)
            g = Geo().sphere((bx, -26.0, 40.0), 2.6, cuts=2)
            rig.part("body", g, glow=RD_LAMP, outline=0)
    # high windows over the engine along the right wall
    for x in (-100.0, -70.0, -40.0):
        window(rig, "body", x, -26.6, 92.0, 12.0, 18.0, glow_hex=RD_WINDOW, frame=RD_STONE_DK, arch=True)
    # a team banner between the bays (torn at 50%)
    g = Geo().slab([(-160.0, 108.0), (-140.0, 108.0), (-140.0, 76.0), (-150.0, 70.0), (-160.0, 76.0)], -28.4, 1.3)
    rig.part("banner", g, team=True, outline=0.5)
    g = Geo().capsule((-162.0, -29.2, 108.6), (-138.0, -29.2, 108.6), 1.0)
    rig.part("banner", g, RD_IRON, finish="metal", outline=0.4)
    g = Geo()
    cyl(g, (-150.0, -29.6, 92.0), (-150.0, -30.4, 92.0), 4.6, bevel=0.3, segs=20)
    rig.part("banner", g, RD_STONE, outline=0.3)
    g = Geo()
    for k in range(8):
        a = 2 * math.pi * k / 8
        g.capsule((-150.0 + math.cos(a) * 4.8, -30.6, 92.0 + math.sin(a) * 4.8), (-150.0 + math.cos(a) * 6.6, -30.6, 92.0 + math.sin(a) * 6.6), 0.8,
                  segs=4, rings=1)
    rig.part("banner", g, RD_STONE, outline=0.3)
    # the clerestory: lit windows under a slate roof, iron smoke jacks
    g = Geo()
    box(g, (-123.0, 20.0, RD_ROOF + 14.0), (53.0, 30.0, 14.0), p=8)
    rig.part("body", g, RD_BRICK_LT)
    for x in (-160.0, -140.0, -120.0, -100.0, -80.0):
        window(rig, "body", x, -10.6, RD_ROOF + 14.0, 9.0, 13.0, glow_hex=RD_WINDOW, frame=RD_STONE_DK, arch=False)
    g = Geo()
    for sgn in (-1, 1):
        box(g, (-123.0, 20.0 + sgn * 17.0, RD_ROOF + 35.5), (56.0, 18.6, 1.6), p=6, rot=(sgn * 26.0, 0, 0))
    rig.part("body", g, RD_SLATE)
    g = Geo()
    box(g, (-123.0, 20.0, RD_ROOF + 44.0), (56.4, 2.2, 1.6), p=6)
    rig.part("body", g, RD_IRON_DK, finish="metal", outline=0.4)
    for x, j in ((-160.0, "body"), (-124.0, "jack2"), (-88.0, "body")):
        g = Geo()
        cyl(g, (x, 20.0, RD_ROOF + 36.0), (x, 20.0, RD_ROOF + 58.0), 4.6, 4.2, bevel=0.5, segs=16)
        rig.part(j, g, RD_IRON_DK, finish="metal")
        g = Geo()
        cyl(g, (x, 20.0, RD_ROOF + 58.0), (x, 20.0, RD_ROOF + 61.0), 7.0, 5.6, bevel=0.5, segs=16)
        rig.part(j, g, RD_COAL, finish="metal", outline=0.4)
    # the semaphore signal on the roundhouse's left corner: a lattice mast, a team arm, a lamp
    sx, sy = -174.0, -14.0
    g = Geo()
    for dx in (-2.0, 2.0):
        g.capsule((sx + dx, sy, RD_ROOF), (sx + dx * 0.4, sy, RD_ROOF + 74.0), 1.0, 0.8, segs=6, rings=1)
    for k in range(7):
        z = RD_ROOF + 6.0 + k * 10.0
        g.capsule((sx - 1.8, sy, z), (sx + 1.8, sy, z + 8.0), 0.5, segs=4, rings=1)
    rig.part("body", g, RD_IRON, finish="metal", outline=0.4)
    g = Geo().slab([(sx + 2.0, RD_ROOF + 68.0), (sx + 26.0, RD_ROOF + 74.0), (sx + 26.0, RD_ROOF + 68.0), (sx + 2.0, RD_ROOF + 64.0)], sy - 2.0, 1.2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo().slab([(sx + 19.0, RD_ROOF + 72.2), (sx + 22.0, RD_ROOF + 72.9), (sx + 22.0, RD_ROOF + 66.9), (sx + 19.0, RD_ROOF + 66.2)], sy - 2.8, 0.6)
    rig.part("body", g, RD_STONE, outline=0)
    g = Geo()
    box(g, (sx - 3.0, sy - 0.6, RD_ROOF + 62.0), (3.0, 2.0, 3.6), p=6, cuts=2)
    rig.part("body", g, RD_COAL, outline=0.4)
    # the signal lamp blinks (the `signal` prop: lit, then dark for a beat)
    rig.joint("signal", "root", (sx - 3.0, sy - 2.4, RD_ROOF + 62.0))
    for k, (j, kw) in enumerate((("lampOn", dict(glow="#FF8C7A", outline=0.5, outline_hex="#B5523F")), ("lampOff", dict(color="#4A3430", outline=0.4)))):
        rig.joint(j, "signal", (sx - 3.0, sy - 2.4, RD_ROOF + 62.0), hidden=True)
        g = Geo().sphere((sx - 3.0, sy - 2.6, RD_ROOF + 62.0), 2.2, cuts=2)
        if "color" in kw:
            rig.part(j, g, kw["color"], finish="gloss", outline=kw["outline"])
        else:
            rig.part(j, g, glow=kw["glow"], outline=kw["outline"], outline_hex=kw["outline_hex"])
    g = Geo().sphere((sx + 0.4, sy, RD_ROOF + 76.0), 1.6, cuts=2)
    rig.part("body", g, RD_BRASS, finish="metal", outline=0.3)

    # -- the track along the front -------------------------------------------------------------------
    g = Geo()
    for k in range(17):
        box(g, (-124.0 + k * 9.0, -45.0, 0.8), (2.2, 9.0, 0.8), p=5, cuts=2)
    rig.part("body", g, "#5E4E40", outline=0.3)
    g = Geo()
    for y in (-50.0, -40.0):
        g.capsule((-126.0, y, 2.2), (24.0, y, 2.2), 0.9, segs=6, rings=1)
    rig.part("body", g, RD_IRON_LT, finish="metal", outline=0.3)

    # -- the armoured engine: frame, wheels, armoured boiler with the team stripe, stack, armoured cab --------
    y_out = -48.0
    g = Geo()
    box(g, (-60.0, -38.0, 16.0), (52.0, 9.0, 2.4), p=6)
    rig.part("body", g, RD_COAL, finish="metal")
    for x, r in ((-104.0, 6.0), (-92.0, 6.0)):
        rd_wheel(rig, "body", x, y_out, r, r, spokes=8)
    for x in (-74.0, -52.0, -30.0):
        rd_wheel(rig, "body", x, y_out, 10.0, 10.0)
    g = Geo()
    g.capsule((-76.0, y_out - 2.4, 14.0), (-28.0, y_out - 2.4, 14.0), 1.1, segs=6, rings=1)
    g.capsule((-96.0, y_out - 1.6, 12.0), (-74.0, y_out - 2.2, 14.0), 1.3, segs=6, rings=1)
    rig.part("body", g, RD_IRON_LT, finish="metal", outline=0.4)
    g = Geo()
    box(g, (-98.0, y_out + 3.0, 13.0), (8.0, 4.0, 4.6), p=6)
    rig.part("body", g, RD_IRON_DK, finish="metal")
    g = Geo()
    box(g, (-113.0, -38.0, 14.0), (2.4, 10.0, 3.0), p=6, cuts=2)
    rig.part("body", g, RD_RED, outline=0.4)
    g = Geo()
    for sgn in (-1, 1):
        g.capsule((-116.0, -38.0 + sgn * 6.0, 14.0), (-120.0, -38.0 + sgn * 6.0, 14.0), 1.0)
        g.sphere((-120.6, -38.0 + sgn * 6.0, 14.0), 1.8, cuts=2)
    rig.part("body", g, RD_IRON_LT, finish="metal", outline=0.3)
    # the boiler under its armour (the plate over the middle is blown off at 50%, the boiler shows)
    g = Geo()
    cyl(g, (-110.0, -38.0, 31.0), (-46.0, -38.0, 31.0), 12.5, bevel=1.0, segs=28)
    rig.part("boiler", g, RD_COAL, finish="metal")
    g = Geo()
    for x in (-96.0, -80.0, -64.0):
        cyl(g, (x - 0.8, -38.0, 31.0), (x + 0.8, -38.0, 31.0), 13.2, bevel=0.2, segs=28)
    rig.part("boiler", g, RD_BRASS, finish="metal", outline=0.3)
    arm, plt_, riv = Geo(), Geo(), Geo()
    box(arm, (-101.0, -38.0, 31.0), (10.0, 13.6, 14.0), p=4.5)
    box(arm, (-56.0, -38.0, 31.0), (11.0, 13.6, 14.0), p=4.5)
    box(plt_, (-78.0, -38.0, 31.0), (12.4, 13.8, 14.2), p=4.5)
    rd_rivets(riv, [(x, -51.9, z) for x in range(-110, -44, 6) for z in (19.0, 43.0)])
    rig.part("body", arm, RD_ARMOR, finish="metal")
    rig.part("plate", plt_, RD_ARMOR, finish="metal")
    rig.part("body", riv, RD_IRON_LT, finish="metal", outline=0)
    g = Geo()
    box(g, (-78.0, -52.2, 28.0), (34.0, 0.6, 3.4), p=5, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    box(g, (-78.0, -52.6, 34.6), (34.0, 0.5, 0.9), p=5, cuts=2)
    rig.part("body", g, RD_STONE, outline=0.3)
    # the stack, domes and the head lamp
    g = Geo()
    g.lathe([(0.0, 0.0), (4.6, 0.0), (4.0, 14.0), (6.4, 24.0), (6.8, 27.0), (0.0, 27.0)], (-102.0, -38.0, 44.0), (-102.0, -38.0, 71.0), segs=20)
    rig.part("stack", g, RD_COAL, finish="metal")
    g = Geo()
    cyl(g, (-102.0, -38.0, 70.0), (-102.0, -38.0, 72.4), 7.4, bevel=0.4, segs=20)
    rig.part("stack", g, RD_IRON_LT, finish="metal", outline=0.4)
    g = Geo()
    for x, h in ((-82.0, 7.0), (-66.0, 5.0)):
        g.blob((x, -38.0, 45.0 + h * 0.5), (5.4, 5.4, h), p=2.4, cuts=3)
    rig.part("body", g, RD_ARMOR, finish="metal")
    g = Geo().sphere((-111.0, -42.0, 38.0), 3.0, cuts=2)
    rig.part("body", g, glow=RD_LAMP, outline=0)
    g = Geo()
    box(g, (-110.0, -40.0, 38.0), (2.6, 3.6, 4.2), p=6, cuts=2)
    rig.part("body", g, RD_COAL, outline=0.4)
    # the armoured cab at the lane end (the gate-side mount stands on it), slit windows lit
    g = Geo()
    box(g, (-10.0, -37.0, 36.0), (22.0, 15.0, 19.0), p=4.5)
    rig.part("body", g, RD_ARMOR, finish="metal")
    g = Geo()
    for x in (-22.0, -10.0):
        box(g, (x, -52.4, 44.0), (3.6, 0.6, 1.4), p=4, cuts=1)
    rig.part("body", g, glow=RD_WINDOW, outline=0)
    g = Geo()
    rd_rivets(g, [(x, -52.3, z) for x in range(-30, 12, 6) for z in (20.0, 52.0)])
    rig.part("body", g, RD_IRON_LT, finish="metal", outline=0)
    g = Geo()
    box(g, (-10.0, -52.6, 30.0), (20.0, 0.6, 3.0), p=5, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    # the gate: an iron sliding door under the cab's end, team panels
    g = Geo()
    box(g, (13.0, -30.0, 22.0), (6.0, 6.0, 22.0), p=6)
    rig.part("body", g, RD_BRICK_DK)
    g = Geo().slab([(4.0, 2.0), (18.0, 2.0), (18.0, 40.0), (4.0, 40.0)], -36.4, 1.2)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    for z in (10.0, 22.0, 34.0):
        box(g, (11.0, -37.2, z), (7.4, 0.5, 0.8), p=4, cuts=1)
    rig.part("body", g, RD_IRON_DK, finish="metal", outline=0)

    # -- the water tower on the roof: the trestle, the riveted tank with its team band, the roof, a spout -----
    tx, ty = RD_TW
    rd_trestle(rig, "body", tx - 19.0, tx + 19.0, ty - 18.0, ty + 18.0, RD_ROOF, RD_TANK0 - 3.2)
    g = Geo()
    cyl(g, (tx, ty, RD_TANK0 - 3.6), (tx, ty, RD_TANK0 - 0.6), 33.0, bevel=0.5, segs=40)
    rig.part("body", g, RD_IRON_LT, finish="metal")
    rail = Geo()
    for i in range(24):
        a = math.radians(180 + i * (180.0 / 23))
        rail.capsule((tx + math.cos(a) * 32.0, ty + math.sin(a) * 32.0, RD_TANK0 - 0.8), (tx + math.cos(a) * 32.0, ty + math.sin(a) * 32.0, RD_TANK0 + 6.0),
                     0.45, segs=4, rings=1)
    pts = [(tx + math.cos(math.radians(180 + i * 9)) * 32.0, ty + math.sin(math.radians(180 + i * 9)) * 32.0, RD_TANK0 + 6.0) for i in range(21)]
    for a_, b_ in zip(pts, pts[1:]):
        rail.capsule(a_, b_, 0.6, segs=4, rings=1)
    rig.part("body", rail, RD_IRON_DK, finish="metal", outline=0.3)
    g = Geo()
    cyl(g, (tx, ty, RD_TANK0), (tx, ty, RD_TANK1), 25.0, bevel=1.2, segs=40)
    rig.part("tank", g, RD_IRON)
    g = Geo()
    for z in (RD_TANK0 + 12.0, RD_TANK0 + 46.0, RD_TANK1 - 4.0):
        g.lathe([(25.0, -1.0), (26.0, -0.6), (26.0, 0.6), (25.0, 1.0)], (tx, ty, z), (tx, ty, z + 1.0), segs=40)
    rd_rivets(g, [(tx + math.cos(math.radians(a)) * 25.6, ty + math.sin(math.radians(a)) * 25.6, z)
                  for a in range(200, 341, 14) for z in (RD_TANK0 + 4.0, RD_TANK1 - 9.0)], r=0.65)
    rig.part("tank", g, RD_IRON_DK, finish="metal", outline=0.3)
    g = Geo()
    g.lathe([(25.2, 0.0), (25.6, 0.4), (25.6, 9.6), (25.2, 10.0)], (tx, ty, RD_TANK0 + 24.0), (tx, ty, RD_TANK0 + 34.0), segs=40)
    rig.part("tank", g, team=True, outline=0.3)
    g = Geo()
    g.lathe([(0.0, 0.0), (28.0, 0.0), (27.0, 2.0), (4.0, 20.0), (0.0, 21.0)], (tx, ty, RD_TANK1), (tx, ty, RD_TANK1 + 21.0), segs=40)
    rig.part("tank", g, RD_SLATE)
    g = Geo()
    cyl(g, (tx, ty, RD_TANK1 + 19.0), (tx, ty, RD_TANK1 + 30.0), 2.4, 2.0, bevel=0.4)
    g.sphere((tx, ty, RD_TANK1 + 32.0), 3.0, cuts=2)
    rig.part("tank", g, RD_IRON_DK, finish="metal", outline=0.4)
    g = Geo()
    pts = [(tx - 12.0, ty - 24.0, RD_TANK0 + 8.0), (tx - 14.0, ty - 32.0, RD_TANK0 + 2.0), (tx - 16.0, ty - 36.0, RD_TANK0 - 12.0),
           (tx - 16.0, ty - 37.0, RD_TANK0 - 30.0)]
    for a_, b_ in zip(pts, pts[1:]):
        g.capsule(a_, b_, 2.2, 2.0, segs=8, rings=1)
    rig.part("tank", g, "#3E4248", finish="metal", outline=0.4)

    # -- the turret mounts: an iron deck on the cab, decks on the roof edge and the trestle, the tank catwalk ---
    platform(rig, "body", M[0], RD_IRON_LT, RD_ARMOR, style="bastion", r=(25.0, 19.0))
    platform(rig, "body", M[1], RD_IRON_LT, RD_IRON_DK, style="stone", r=(25.0, 19.0))
    platform(rig, "body", M[2], RD_IRON_LT, RD_IRON_DK, style="stone", r=(23.0, 19.0))
    platform(rig, "body", M[3], RD_IRON_LT, RD_IRON_DK, style="stone", r=(25.0, 19.0))
    g = Geo()
    for (x, y, z), legs in ((M[1], ((-60.0, -40.0), (-30.0, -40.0))), (M[2], ((-16.0, -46.0), (14.0, -46.0))),
                            (M[3], ((-70.0, -40.0), (-40.0, -40.0)))):
        for lx, ly in legs:
            g.capsule((lx, ly, z - 5.0), (lx + (6.0 if lx < tx else -6.0), ly + 26.0, z - 40.0), 1.6, 1.3, segs=6, rings=1)
    rig.part("body", g, RD_IRON_DK, finish="metal", outline=0.4)

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-120.0, -26.8, 80.0), (-114.0, -26.8, 68.0), (-120.0, -26.8, 56.0)],
                                   [(-60.0, -26.8, 112.0), (-56.0, -26.8, 102.0)]], RD_CRACK, RD_BRICK_LT)
    chipped_cracks(rig, "crack2", [[(-180.0, -26.8, 96.0), (-176.0, -26.8, 84.0)], [(-6.0, -52.8, 46.0), (-2.0, -52.8, 38.0)]],
                   RD_CRACK, RD_IRON_LT)
    chipped_cracks(rig, "crack3", [[(-90.0, -10.8, RD_ROOF + 22.0), (-86.0, -10.8, RD_ROOF + 12.0)], [(-152.0, -26.8, 60.0), (-148.0, -26.8, 50.0)]],
                   RD_CRACK, RD_BRICK_LT)
    rd_breach(rig, "breachR", -154.0, -26.6, 70.0, 22.0, 20.0, seed=31)
    flames(rig, "breachR", [(-154.0, -32.0, 62.0, 0.9)])
    rd_breach(rig, "breach3", -54.0, -26.6, 70.0, 26.0, 24.0, seed=37)
    flames(rig, "breach3", [(-54.0, -32.0, 60.0, 1.0)])
    flames(rig, "boiler", [(-78.0, -54.0, 36.0, 0.6)])
    flames(rig, "roofFire", [(-100.0, -14.0, RD_ROOF + 28.0, 0.8), (-150.0, -14.0, RD_ROOF + 28.0, 0.6)])
    g = Geo()
    for sx_, sz_, rr in ((-154.0, 88.0, 8.0), (-54.0, 90.0, 9.0)):
        g.slab([(sx_ + rr * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), sz_ + rr * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)], -27.2, 0.6)
    rig.part("soot", g, "#3E3936", outline=0, highlight=False)
    rubble(rig, "rubble1", [(-158.0, -56.0), (-136.0, -60.0)], RD_BRICK, seed=91)
    rubble(rig, "rubble2", [(-130.0, -60.0), (-40.0, -64.0)], RD_COAL, seed=97)
    rubble(rig, "rubble3", [(-160.0, -62.0), (-116.0, -66.0), (-10.0, -64.0)], RD_BRICK_DK, seed=103, size=1.2)
    g = Geo()
    cyl(g, (-166.0, -60.0, 0.0), (-166.0, -60.0, 9.0), 4.6, 4.2, bevel=0.5, segs=16)
    rig.part("rubble1", g, RD_IRON_DK, finish="metal")
    g = Geo()
    box(g, (-70.0, -66.0, 2.0), (12.0, 1.2, 8.0), p=4.5, rot=(70, 0, 12))
    rig.part("rubble2", g, RD_ARMOR, finish="metal")

    flag(rig, "root", "flagA", (tx + 6.0, ty + 8.0, RD_TANK1 + 60.0), length=30, height=17, pole=RD_TANK1 + 20.0, pole_color=RD_IRON_DK,
         finial="#9A8A62")
    flag(rig, "root", "flagB", (-150.0, 40.0, RD_ROOF + 86.0), length=24, height=14, pole=RD_ROOF + 46.0, pole_color=RD_IRON_DK, finial="#9A8A62")

    # -- Treasury: coal and a hand cart (1), crates and oil drums (2), a strongbox on a flatcar (3) --------------
    g = Geo()
    for i in range(7):
        g.blob((-176.0 + (i % 4) * 4.0, -62.0 + (i // 4) * 3.0, 3.0 + (i % 2) * 2.0), (3.6, 3.0, 3.0), p=2.6, cuts=2)
    rig.part("treasury1", g, RD_COAL)
    g = Geo()
    box(g, (-154.0, -62.0, 8.0), (7.0, 5.0, 3.0), p=5, taper=(0.8, 1.0))
    g.capsule((-147.0, -62.0, 9.0), (-140.0, -62.0, 14.0), 0.8)
    rig.part("treasury1", g, "#7A5F48", outline=0.5)
    g = Geo()
    for x in (-160.0, -148.0):
        cyl(g, (x, -66.0, 3.4), (x, -64.0, 3.4), 3.4, bevel=0.3)
    rig.part("treasury1", g, RD_IRON_DK, outline=0.4)
    g = Geo()
    for x, y, z in ((-130.0, -64.0, 0.0), (-121.0, -66.0, 0.0), (-126.0, -65.0, 9.0)):
        box(g, (x, y, z + 4.5), (4.5, 4.5, 4.5), p=6)
    rig.part("treasury2", g, "#8E7658", outline=0.5)
    g = Geo()
    for x in (-108.0, -100.0):
        cyl(g, (x, -64.0, 0.0), (x, -64.0, 12.0), 4.4, bevel=0.6, segs=18)
    rig.part("treasury2", g, "#4F6B5E", finish="metal", outline=0.5)
    g = Geo()
    box(g, (-60.0, -66.0, 4.0), (16.0, 6.0, 1.6), p=5)
    rig.part("treasury3", g, RD_COAL, finish="metal")
    for x in (-70.0, -50.0):
        rd_wheel(rig, "treasury3", x, -72.4, 3.0, 3.0, spokes=6)
    g = Geo()
    box(g, (-60.0, -66.0, 10.0), (8.0, 5.0, 4.4), p=6)
    rig.part("treasury3", g, "#5A4535")
    g = Geo()
    for z in (7.0, 13.0):
        box(g, (-60.0, -71.2, z), (8.2, 0.4, 0.7), p=4, cuts=1)
    g.sphere((-60.0, -71.6, 10.0), 1.2, cuts=2)
    rig.part("treasury3", g, "#C9A227", finish="bronze_rich", outline=0.3)


def rd_breach(rig, joint, x, y, z, w, h, seed=0):
    """A blown-out hole in the brick wall: a dark jagged opening, a lighter inner face, broken brick ends."""
    rnd = random.Random(seed)
    n = 14
    pts, inner = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.72 + 0.28 * rnd.random()
        pts.append((x + math.cos(a) * w / 2 * k, z + math.sin(a) * h / 2 * k))
        inner.append((x + math.cos(a) * w / 2 * k * 0.72, z + math.sin(a) * h / 2 * k * 0.66 - h * 0.08))
    rig.part(joint, Geo().slab(pts, y - 2.4, 1.6), "#5E4A44", outline=0.6, outline_hex="#2E2624")
    rig.part(joint, Geo().slab(inner, y - 3.4, 1.0), "#2E2624", outline=0)
    g = Geo()
    for i in range(0, n, 2):
        px_, pz_ = pts[i]
        box(g, (px_, y - 3.0, pz_), (3.0 + 1.4 * rnd.random(), 1.6, 1.4 + 0.6 * rnd.random()), p=5, cuts=2)
    rig.part(joint, g, RD_BRICK_LT, outline=0.5)


def rd_signal_pose(f):
    return {"lampOn": {"show": True}} if f == 0 else {"lampOff": {"show": True}}


def crumble_rail_depot(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "jack2": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachR": {"show": True}, "soot": {"show": True},
                     "plate": {"hide": True}, "boiler": {"show": True}, "banner": {"r": 10.0, "sz": 0.55, "x": 1.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breach3": {"show": True}, "roofFire": {"show": True},
                     "tank": {"r": 6.0, "x": -3.0, "z": -3.0}, "stack": {"r": 16.0, "x": -2.0, "z": -2.0}, "banner": {"hide": True}})
    return pose


RAIL_DEPOT = base_module(
    "industrial", "Rail Depot", height=330, width=190, canvas=(470, 720), feet=(360, 670),
    build=build_rail_depot, crumble=crumble_rail_depot, mount_depth=RD_DEPTHS, skin="rail_depot",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-111.0, -44.0, 38.0), 3, 16), ((-136.0, -28.0, 40.0), 2, 14), ((-16.0, -54.0, 44.0), 3, 10)],
    smoke=[((-150.0, -30.0, 90.0), 2), ((-60.0, -30.0, 90.0), 3), ((RD_TW[0], RD_TW[1], RD_TANK0), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
    props=[prop_loop("signal", ["signal"], 2, rd_signal_pose, ms=380, crumble=(0, 2), z="front", hold=0,
                     anchor=(-177.0, -16.4, RD_ROOF + 62.0), sequence=[0, 0, 0, 1], outline="none")],
    extra_meta={
        "collapseMaterial": "iron",
        # the water tower falls toward the lane first, then the clerestory with its jacks
        "topple": [topple_lu(-70, 10, 200, delay_ms=0, push=1.0, sink_lu=34),
                   topple_lu(-186, -70, 120, delay_ms=160, push=0.8, sink_lu=26)],
        "rubbleColors": [RD_BRICK, RD_BRICK_DK, RD_IRON, RD_COAL],
        "dustColor": "#C9C0B4",
        "ambientLu": [ambient_lu("steam", (-102.0, -38.0, 76.0), 6, 1.0), ambient_lu("steam", (-98.0, -54.0, 12.0), 8, 0.6),
                      ambient_lu("smoke", (-160.0, 20.0, RD_ROOF + 64.0), 6, 0.6), ambient_lu("smoke", (-88.0, 20.0, RD_ROOF + 64.0), 6, 0.6),
                      ambient_lu("embers", (-136.0, -30.0, 8.0), 10, 0.4)],
    },
)



# ---------------------------------------------------------------------------------------------------
# Clocktower Works (round 3; Epic, Wardrobe Crate): a brick clock-tower factory. A long works hall with tall lit
# arched windows, a team sign band and a sawtooth roof of slate and glazing; a big round window in its face shows
# brass gears turning; a tall brick clock tower rises from its left end, its clock stage carrying a big brass-rimmed
# cream dial under a slate spire with an iron weathervane; two brick chimneys with iron bands, the nearer one with an
# iron gallery that carries the top mount. The minute hand ticks round in twelve jumps and the gears turn with it
# (the `hands` and `gears` prop loops: a full turn, an exact loop). The other mounts: a corbelled balcony on the hall
# face by the gate, an iron deck on the sawtooth roof, an iron trestle deck at the hall's lane end. Team colour: the
# sign band, the gate door, the clock stage's banners and the flags. Code ambient: chimney smoke, embers at the
# windows, steam.
#
# Crumble: 75% cracks, a chimney band and a window broken, brick rubble; 50% a burning breach in the hall, the
# weathervane gone, a banner torn, soot; 25% a ragged breach, the spire knocked askew, the far chimney snapped, fire
# behind the gear window.

CW_BRICK = "#8A6A63"
CW_BRICK_LT = "#9C7C74"
CW_BRICK_DK = "#735852"
CW_BRICK_DKR = "#624B46"
CW_STONE = "#C3BCAC"
CW_STONE_DK = "#A69F90"
CW_SLATE = "#403F45"
CW_SLATE_LT = "#56555C"
CW_IRON = "#5B6168"
CW_IRON_LT = "#767D86"
CW_IRON_DK = "#454A51"
CW_BRASS = "#B8A776"          # brass kept pale (the dial's rim, the gears): out of the orange band
CW_BRASS_DK = "#9A8A62"
CW_DIAL = "#FBF5E2"
CW_GLASS = "#9FB2B8"
CW_WINDOW = "#FFD9A0"
CW_CRACK = "#4A3A36"
CW_DEPTHS = [-40, -24, -40, -24]
CW_HALL_TOP = 96.0
CW_TOWER = (-128.0, 2.0, 22.0)      # the clock tower: axis x, y, half width
CW_CLOCK = (-128.0, -21.6, 306.0)   # the dial's centre (on the tower's front face)
CW_DIAL_R = 20.0
CW_GEARS = (-86.0, -31.0, 58.0)     # the gear window's centre
CW_CHIM = [(-52.0, 20.0, 338.0), (-176.0, 26.0, 318.0)]   # chimneys: x, y, top
CW_TICKS, CW_TICK_MS = 12, 600


def cw_gear(g, c, r, teeth, a_deg, axis_y=True):
    """A brass gear facing the camera at c: a toothed rim, spokes and a hub, turned by a_deg."""
    x, y, z = c
    cyl(g, (x, y + 0.6, z), (x, y - 0.6, z), r, bevel=0.3, segs=max(16, teeth * 2))
    for k in range(teeth):
        a = math.radians(a_deg + 360.0 * k / teeth)
        box(g, (x + math.cos(a) * (r + 1.0), y, z + math.sin(a) * (r + 1.0)), (1.1, 0.6, 1.0), p=4, cuts=1, rot=(0, -math.degrees(a), 0))
    return g


def cw_gears_geo(f):
    """The gear train in the window at tick f: a big gear and two smaller ones meshing with it (each turns a whole
    number of tooth pitches over the twelve ticks, so the loop closes)."""
    gx, gy, gz = CW_GEARS
    big, small, hub = Geo(), Geo(), Geo()
    cw_gear(big, (gx - 3.0, gy - 1.0, gz), 9.0, 12, 30.0 * f)
    cw_gear(small, (gx + 9.4, gy - 1.6, gz + 5.0), 5.0, 8, -30.0 * f * 12 / 8 + 11.0)
    cw_gear(small, (gx + 5.0, gy - 1.6, gz - 10.0), 4.4, 8, -30.0 * f * 12 / 8 + 4.0)
    for c in ((gx - 3.0, gy - 1.8, gz), (gx + 9.4, gy - 2.4, gz + 5.0), (gx + 5.0, gy - 2.4, gz - 10.0)):
        hub.sphere(c, 1.6, cuts=2)
    return big, small, hub


def cw_hand_geo(f):
    """The minute hand at tick f: a long tapered iron hand with a counterweight, pointing at the f-th mark."""
    cx, cy, cz = CW_CLOCK
    a = math.radians(90.0 - 30.0 * f)
    ux, uz = math.cos(a), math.sin(a)
    g = Geo()
    g.capsule((cx - ux * 4.0, cy - 1.6, cz - uz * 4.0), (cx + ux * (CW_DIAL_R - 3.0), cy - 1.6, cz + uz * (CW_DIAL_R - 3.0)), 1.1, 0.5, segs=6, rings=1)
    g.blob((cx - ux * 4.4, cy - 1.6, cz - uz * 4.4), (1.8, 0.6, 1.8), p=2.0, cuts=2)
    return g


def build_clockworks(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachH", "breachT", "soot", "gearFire", "chimStump", "winBroke"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    tx, ty, tw = CW_TOWER
    rig.joint("spire", "body", (tx, ty, 330.0))
    rig.joint("vane", "spire", (tx, ty, 356.0))
    rig.joint("band", "body", (CW_CHIM[1][0], CW_CHIM[1][1], 250.0))
    rig.joint("chimFar", "body", (CW_CHIM[1][0], CW_CHIM[1][1], CW_HALL_TOP))
    rig.joint("bannerL", "body", (tx - 16.0, ty - tw - 1.4, 288.0))

    # -- the works hall: brick, stone dressings, tall arched windows, a team sign band, a sawtooth roof ------------
    # (x -176..10: the hall's back corners project to the right under the yaw, so its lane end stops short)
    g = Geo()
    box(g, (-83.0, 10.0, CW_HALL_TOP / 2), (93.0, 40.0, CW_HALL_TOP / 2), p=10)
    rig.part("body", g, CW_BRICK)
    g = Geo()
    for z in range(8, int(CW_HALL_TOP) - 4, 8):
        g.capsule((-174.0, -30.4, float(z)), (8.0, -30.4, float(z)), 0.35, segs=4, rings=1)
    rig.part("body", g, CW_BRICK_DKR, outline=0, highlight=False)
    g = Geo()
    box(g, (-83.0, 9.4, CW_HALL_TOP - 2.0), (94.0, 40.8, 2.4), p=6)
    box(g, (-83.0, -30.6, 4.0), (93.6, 1.0, 4.0), p=6, cuts=2)
    rig.part("body", g, CW_STONE)
    for x in (-160.0, -144.0, -58.0, -38.0, -18.0):
        window(rig, "body", x, -30.6, 52.0, 11.0, 30.0, glow_hex=CW_WINDOW, frame=CW_STONE_DK, arch=True)
    g = Geo()
    box(g, (-83.0, -31.2, 82.0), (90.0, 0.8, 5.0), p=5, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    for k in range(9):
        x = -168.0 + k * 21.0
        g.sphere((x, -32.0, 82.0), 1.4, cuts=2)
    rig.part("body", g, CW_BRASS, finish="metal", outline=0.3)
    # the sawtooth roof: slate slopes and glazed north lights
    for k in range(4):
        x0 = -173.0 + k * 45.5
        g = Geo().slab([(x0, CW_HALL_TOP), (x0 + 34.5, CW_HALL_TOP), (x0 + 34.5, CW_HALL_TOP + 26.0)], 10.0, 78.0)
        rig.part("body", g, CW_SLATE)
        g = Geo().slab([(x0 + 34.5, CW_HALL_TOP), (x0 + 44.0, CW_HALL_TOP), (x0 + 34.5, CW_HALL_TOP + 26.0)], 10.0, 76.0)
        rig.part("body", g, CW_GLASS, finish="gloss")
    # the gear window: a stone-framed round opening with a dark interior (the gears turn in the `gears` prop)
    gx, gy, gz = CW_GEARS
    g = Geo()
    g.lathe([(17.0, -1.0), (20.0, -0.6), (20.0, 1.0), (17.0, 1.4)], (gx, gy + 0.8, gz), (gx, gy - 0.4, gz), segs=36)
    rig.part("body", g, CW_STONE, outline=0.45)
    g = Geo()
    cyl(g, (gx, gy + 1.2, gz), (gx, gy + 0.4, gz), 17.0, bevel=0.2, segs=36)
    rig.part("body", g, "#2E2624", outline=0)
    g = Geo()
    cyl(g, (gx, gy + 1.0, gz), (gx, gy + 0.6, gz), 15.0, 3.0, bevel=0.2, segs=36)
    rig.part("body", g, glow="#E8A868", outline=0)
    g = Geo()
    for k in range(4):
        a = math.radians(45 + k * 90)
        g.capsule((gx + math.cos(a) * 3.0, gy - 0.8, gz + math.sin(a) * 3.0), (gx + math.cos(a) * 17.0, gy - 0.8, gz + math.sin(a) * 17.0), 0.6, segs=4, rings=1)
    rig.part("body", g, CW_IRON_DK, finish="metal", outline=0)
    rig.joint("gears", "root", CW_GEARS)
    for f in range(CW_TICKS):
        j = f"gear{f}"
        rig.joint(j, "gears", CW_GEARS, hidden=True)
        big, small, hub = cw_gears_geo(f)
        rig.part(j, big, CW_BRASS, finish="metal", outline=0.4)
        rig.part(j, small, CW_BRASS_DK, finish="metal", outline=0.4)
        rig.part(j, hub, CW_IRON_DK, finish="metal", outline=0.3)
    # the gate: an iron-studded arched door (team) at the hall's lane end
    g = Geo()
    pts = [(-8.0, 0.0), (8.0, 0.0), (8.0, 26.0)]
    for i in range(1, 6):
        a = math.pi * i / 6
        pts.append((8.0 * math.cos(a), 26.0 + 8.0 * math.sin(a)))
    pts.append((-8.0, 26.0))
    g2 = Geo().slab([(x + (1.6 if x > 0 else -1.6), z + (1.6 if z > 12 else 0.0)) for x, z in pts], -30.8, 1.2)
    rig.part("body", g2, CW_STONE, outline=0.4)
    g = Geo().slab(pts, -31.6, 1.0)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    for z in (8.0, 20.0):
        box(g, (0.0, -32.4, z), (7.6, 0.5, 0.8), p=4, cuts=1)
    rig.part("body", g, CW_IRON_DK, finish="metal", outline=0)

    # -- the clock tower: brick shaft with stone quoins, the clock stage, a slate spire with a weathervane ---------
    g = Geo()
    box(g, (tx, ty, 150.0), (tw, tw, 150.0), p=10)
    rig.part("body", g, CW_BRICK)
    g = Geo()
    for x in (tx - tw, tx + tw):
        for k, z in enumerate(range(CW_HALL_TOP.__int__(), 290, 10)):
            box(g, (x, ty - tw - 0.4, z + 5.0), (4.6 if k % 2 == 0 else 3.0, 1.4, 4.4), p=8, cuts=2)
    rig.part("body", g, CW_STONE, outline=0.4)
    # brick courses on the shaft (mortar lines, a scatter of lighter and darker bricks), clear of the windows
    g, gl, gd = Geo(), Geo(), Geo()
    rnd = random.Random(73)
    xa, xb, yf = tx - tw + 4.6, tx + tw - 4.6, ty - tw - 0.3
    for row, z in enumerate(range(int(CW_HALL_TOP) + 4, 280, 8)):
        in_win = any(z0 <= z <= z1 for z0, z1 in ((139, 166), (203, 230)))
        for a_, b_ in (((xa, tx - 7.0), (tx + 7.0, xb)) if in_win else ((xa, xb),)):
            g.capsule((a_, yf, float(z)), (b_, yf, float(z)), 0.35, segs=4, rings=1)
        for k in range(4):
            if rnd.random() < 0.5:
                bx = xa + 3.6 + k * 9.5 + (4.0 if row % 2 else 0.0) + rnd.uniform(-1.0, 1.0)
                zz = z + 4.0
                if bx > xb - 3.0 or (abs(bx - tx) < 9.0 and any(z0 - 4 <= zz <= z1 + 4 for z0, z1 in ((139, 166), (203, 230)))):
                    continue
                (gl if rnd.random() < 0.55 else gd).blob((bx, yf + 0.1, zz), (3.6, 0.6, 2.5), p=4.0, cuts=1)
    rig.part("body", g, CW_BRICK_DKR, outline=0, highlight=False)
    rig.part("body", gl, CW_BRICK_LT, outline=0, highlight=False)
    rig.part("body", gd, CW_BRICK_DK, outline=0, highlight=False)
    for z in (150.0, 214.0):
        window(rig, "body", tx, ty - tw - 0.4, z, 8.0, 18.0, glow_hex=CW_WINDOW, frame=CW_STONE_DK, arch=True)
    g = Geo()
    box(g, (tx, ty, 306.0), (tw + 3.0, tw + 3.0, 24.0), p=8)
    rig.part("body", g, CW_BRICK_LT)
    g = Geo()
    for z in (282.0, 330.0):
        box(g, (tx, ty, z), (tw + 4.6, tw + 4.6, 2.0), p=6)
    rig.part("body", g, CW_STONE)
    cx, cy, cz = CW_CLOCK
    g = Geo()
    cyl(g, (cx, cy + 3.0, cz), (cx, cy - 0.8, cz), CW_DIAL_R, bevel=0.4, segs=48)
    rig.part("body", g, CW_DIAL, finish="gloss")
    g = Geo()
    g.lathe([(CW_DIAL_R - 1.6, -1.2), (CW_DIAL_R + 1.6, -0.6), (CW_DIAL_R + 1.6, 1.4), (CW_DIAL_R - 1.6, 1.8)], (cx, cy + 0.4, cz), (cx, cy - 1.0, cz), segs=48)
    rig.part("body", g, CW_BRASS, finish="metal", outline=0.45)
    g = Geo()
    for k in range(12):
        a = math.radians(90 - 30 * k)
        L = 3.6 if k % 3 == 0 else 2.2
        g.capsule((cx + math.cos(a) * (CW_DIAL_R - 2.0), cy - 1.2, cz + math.sin(a) * (CW_DIAL_R - 2.0)),
                  (cx + math.cos(a) * (CW_DIAL_R - 2.0 - L), cy - 1.2, cz + math.sin(a) * (CW_DIAL_R - 2.0 - L)), 0.7 if k % 3 == 0 else 0.5, segs=4, rings=1)
    a = math.radians(90 - 30 * 4.3)
    g.capsule((cx, cy - 1.4, cz), (cx + math.cos(a) * 11.0, cy - 1.4, cz + math.sin(a) * 11.0), 1.3, 0.8, segs=6, rings=1)
    rig.part("body", g, CW_IRON_DK, finish="metal", outline=0.3)
    g = Geo().sphere((cx, cy - 2.4, cz), 1.8, cuts=2)
    rig.part("body", g, CW_BRASS, finish="metal", outline=0.3)
    rig.joint("hands", "root", CW_CLOCK)
    for f in range(CW_TICKS):
        j = f"hand{f}"
        rig.joint(j, "hands", CW_CLOCK, hidden=True)
        rig.part(j, cw_hand_geo(f), CW_IRON_DK, finish="metal", outline=0.4)
    # team banners either side of the clock stage (the left one torn at 50%)
    for jn, x in (("bannerL", tx - 16.0), ("body", tx + 16.0)):
        g = Geo().slab([(x - 4.0, 288.0), (x + 4.0, 288.0), (x + 4.0, 262.0), (x, 258.0), (x - 4.0, 262.0)], ty - tw - 1.4, 1.0)
        rig.part(jn, g, team=True, outline=0.4)
    g = Geo()
    g.lathe([(0.0, 0.0), (tw + 6.0, 0.0), (1.0, 26.0), (0.0, 26.0)], (tx, ty, 332.0), (tx, ty, 358.0), segs=4, rot=(0, 0, 45))
    rig.part("spire", g, CW_SLATE)
    g = Geo()
    g.capsule((tx, ty, 356.0), (tx, ty, 372.0), 0.8, 0.5, segs=6, rings=1)
    rig.part("vane", g, CW_IRON_DK, finish="metal", outline=0.4)
    g = Geo().slab([(tx - 8.0, 366.0), (tx + 6.0, 366.0), (tx + 8.0, 368.4), (tx + 6.0, 370.8), (tx - 2.0, 368.4), (tx - 8.0, 370.8)], ty, 0.8)
    rig.part("vane", g, CW_IRON_DK, finish="metal", outline=0.4)
    g = Geo().sphere((tx, ty, 360.0), 1.8, cuts=2)
    rig.part("vane", g, CW_BRASS, finish="metal", outline=0.3)

    # -- the chimneys: brick stacks with iron bands; the nearer one's iron gallery carries the top mount -----------
    for i, (x, y, top) in enumerate(CW_CHIM):
        j = "chimFar" if i == 1 else "body"
        g = Geo()
        cyl(g, (x, y, CW_HALL_TOP), (x, y, top), 13.0 if i == 0 else 11.0, 8.0 if i == 0 else 7.0, bevel=0.6, segs=24)
        rig.part(j, g, CW_BRICK_DK)
        g = Geo()
        cyl(g, (x, y, top - 2.0), (x, y, top + 4.0), 10.4 if i == 0 else 9.0, 9.6 if i == 0 else 8.4, bevel=0.6, segs=24)
        rig.part(j, g, CW_BRICK_LT, outline=0.4)
        r0_, r1_ = (13.0, 8.0) if i == 0 else (11.0, 7.0)

        def rad(z):
            return r0_ - (r0_ - r1_) * (z - CW_HALL_TOP) / (top - CW_HALL_TOP)
        # brick courses: mortar lines every few lu, staggered lighter and darker bricks on the visible half, a sooty crown
        g, gl, gd = Geo(), Geo(), Geo()
        rnd = random.Random(61 + i)
        for row, z in enumerate(range(int(CW_HALL_TOP) + 6, int(top) - 4, 6)):
            rr = rad(z) + 0.05
            g.lathe([(rr - 0.2, -0.3), (rr + 0.12, 0.0), (rr - 0.2, 0.3)], (x, y, float(z)), (x, y, z + 1.0), segs=24)
            for k in range(5):
                if rnd.random() < 0.45:
                    a = math.radians(200.0 + (k + (0.5 if row % 2 else 0.0)) * 30.0 + rnd.uniform(-4.0, 4.0))
                    zz = z + 3.0
                    rb = rad(zz) + 0.3
                    (gl if rnd.random() < 0.55 else gd).blob((x + rb * math.cos(a), y + rb * math.sin(a), zz), (rb * 0.22, 0.8, 2.2), p=4.0,
                                                             cuts=1, rot=(0, 0, math.degrees(a) + 90))
        rig.part(j, g, CW_BRICK_DKR, outline=0, highlight=False)
        rig.part(j, gl, CW_BRICK, outline=0, highlight=False)
        rig.part(j, gd, CW_BRICK_DKR, outline=0, highlight=False)
        g = Geo()
        cyl(g, (x, y, top - 6.0), (x, y, top - 2.2), rad(top - 4.0) + 0.5, bevel=0.4, segs=24)
        rig.part(j, g, "#4E403C", outline=0, highlight=False)
        g = Geo()
        for z in [z for z in (150.0, 200.0, 250.0, 300.0) if z < top - 8]:
            rr = rad(z) + 0.6
            g.lathe([(rr - 0.4, -1.0), (rr + 0.4, -0.6), (rr + 0.4, 0.6), (rr - 0.4, 1.0)], (x, y, z), (x, y, z + 1.0), segs=24)
        rig.part("band" if i == 1 else j, g, CW_IRON, finish="metal", outline=0.3)
    g = Geo()
    cyl(g, (CW_CHIM[1][0], CW_CHIM[1][1], CW_HALL_TOP), (CW_CHIM[1][0], CW_CHIM[1][1], 210.0), 11.0, 9.4, bevel=0.6, segs=24)
    rig.part("chimStump", g, CW_BRICK_DK)
    g = Geo().slab([(CW_CHIM[1][0] - 10.0, 208.0), (CW_CHIM[1][0] - 4.0, 216.0), (CW_CHIM[1][0] + 2.0, 210.0), (CW_CHIM[1][0] + 9.0, 217.0),
                    (CW_CHIM[1][0] + 10.0, 208.0)], CW_CHIM[1][1] - 10.0, 1.4)
    rig.part("chimStump", g, CW_BRICK_LT, outline=0.5)

    # -- the turret mounts --------------------------------------------------------------------------------
    platform(rig, "body", M[0], CW_STONE, CW_BRICK_DK, style="stone", r=(25.0, 19.0))
    platform(rig, "body", M[1], CW_IRON_LT, CW_IRON_DK, style="bastion", r=(25.0, 19.0))
    x, y, z = M[2]
    g = Geo()
    for lx in (x - 18.0, x + 14.0):
        for ly in (y - 8.0, y + 16.0):
            g.capsule((lx, ly, CW_HALL_TOP), (lx, ly, z - 4.0), 1.6, 1.4, segs=6, rings=1)
    for zz in (CW_HALL_TOP + 30.0, CW_HALL_TOP + 64.0):
        g.capsule((x - 18.0, y - 8.0, zz), (x + 14.0, y - 8.0, zz + 30.0), 0.8, segs=4, rings=1)
        g.capsule((x + 14.0, y - 8.0, zz), (x - 18.0, y - 8.0, zz + 30.0), 0.8, segs=4, rings=1)
    rig.part("body", g, CW_IRON_DK, finish="metal", outline=0.4)
    platform(rig, "body", M[2], CW_IRON_LT, CW_IRON_DK, style="bastion", r=(23.0, 19.0))
    platform(rig, "body", M[3], CW_IRON_LT, CW_IRON_DK, style="stone", r=(25.0, 19.0))
    g = Geo()
    x, y, z = M[3]
    for k in range(9):
        xx = x - 25.0 + k * 6.0
        g.capsule((xx, y - 13.0, z), (xx, y - 13.0, z + 6.0), 0.5, segs=4, rings=1)
    g.capsule((x - 26.0, y - 13.0, z + 6.0), (x + 22.0, y - 13.0, z + 6.0), 0.7, segs=4, rings=1)
    for dx in (-16.0, 12.0):
        g.capsule((x + dx, y - 10.0, z - 3.0), (CW_CHIM[0][0] + dx * 0.3, CW_CHIM[0][1] - 10.0, z - 30.0), 1.2, segs=6, rings=1)
    rig.part("body", g, CW_IRON_DK, finish="metal", outline=0.35)

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-132.0, -30.8, 80.0), (-126.0, -30.8, 68.0), (-132.0, -30.8, 56.0)],
                                   [(tx + 10.0, ty - tw - 1.3, 250.0), (tx + 14.0, ty - tw - 1.3, 240.0)]], CW_CRACK, CW_BRICK_LT)
    g = Geo()
    g.slab([(-146.0 - 5.0, 44.0), (-146.0 + 2.0, 54.0), (-146.0 + 5.0, 46.0), (-146.0, 38.0)], -31.8, 0.6)
    rig.part("crack1", g, "#2E2624", outline=0, highlight=False)
    chipped_cracks(rig, "crack2", [[(-40.0, -30.8, 80.0), (-36.0, -30.8, 70.0)], [(tx - 10.0, ty - tw - 1.3, 190.0), (tx - 6.0, ty - tw - 1.3, 180.0)]],
                   CW_CRACK, CW_BRICK_LT)
    chipped_cracks(rig, "crack3", [[(-160.0, -30.8, 40.0), (-156.0, -30.8, 30.0)]], CW_CRACK, CW_BRICK_LT)
    rd_breach(rig, "breachH", -150.0, -30.6, 30.0, 24.0, 20.0, seed=91)
    flames(rig, "breachH", [(-150.0, -36.0, 22.0, 0.9)])
    rd_breach(rig, "breachT", tx + 4.0, ty - tw - 0.4, 120.0, 18.0, 18.0, seed=93)
    flames(rig, "breachT", [(tx + 4.0, ty - tw - 6.0, 112.0, 0.8)])
    flames(rig, "gearFire", [(gx, gy - 4.0, gz - 12.0, 0.8)])
    g = Geo()
    for sx_, sy_, sz_, rr in ((-150.0, -31.0, 48.0, 8.0), (tx + 4.0, ty - tw - 1.3, 138.0, 7.0)):
        g.slab([(sx_ + rr * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), sz_ + rr * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)], sy_, 0.6)
    rig.part("soot", g, "#3E3936", outline=0, highlight=False)
    rubble(rig, "rubble1", [(-158.0, -50.0), (-136.0, -54.0)], CW_BRICK, seed=211)
    rubble(rig, "rubble2", [(-100.0, -54.0), (-50.0, -56.0)], CW_BRICK_DK, seed=217)
    rubble(rig, "rubble3", [(-160.0, -56.0), (-116.0, -60.0), (-10.0, -58.0)], CW_BRICK, seed=223, size=1.2)
    g = Geo()
    cyl(g, (-166.0, -54.0, 0.0), (-166.0, -54.0, 2.4), 11.4, bevel=0.3, segs=24)
    rig.part("rubble1", g, CW_IRON, finish="metal", outline=0.4)

    flag(rig, "root", "flagA", (tx + 16.0, ty + 8.0, 392.0), length=30, height=17, pole=356.0, pole_color=CW_IRON_DK, finial="#B8A776")
    flag(rig, "root", "flagB", (-88.0, 44.0, CW_HALL_TOP + 64.0), length=24, height=14, pole=CW_HALL_TOP + 26.0, pole_color=CW_IRON_DK,
         finial="#B8A776")

    # -- Treasury: coal and crates (1), a steam engine on a dray (2), a clockmaker's strongbox (3) -------------------
    g = Geo()
    for i in range(7):
        g.blob((-176.0 + (i % 4) * 4.0, -56.0 + (i // 4) * 3.0, 3.0 + (i % 2) * 2.0), (3.6, 3.0, 3.0), p=2.6, cuts=2)
    rig.part("treasury1", g, "#2B2A2E")
    g = Geo()
    for x, y, z in ((-158.0, -56.0, 0.0), (-150.0, -58.0, 0.0)):
        box(g, (x, y, z + 4.0), (4.0, 4.0, 4.0), p=6)
    rig.part("treasury1", g, "#7A5F48", outline=0.5)
    g = Geo()
    box(g, (-122.0, -58.0, 4.0), (12.0, 6.0, 2.0), p=5)
    rig.part("treasury2", g, "#7A5F48")
    g = Geo()
    cyl(g, (-128.0, -58.0, 8.0), (-116.0, -58.0, 8.0), 5.0, bevel=0.6, segs=20)
    rig.part("treasury2", g, CW_IRON, finish="metal")
    g = Geo()
    cyl(g, (-118.0, -58.0, 13.0), (-118.0, -58.0, 26.0), 1.6, 1.4, bevel=0.3)
    rig.part("treasury2", g, CW_IRON_DK, finish="metal", outline=0.4)
    g = Geo()
    box(g, (-92.0, -58.0, 6.0), (7.0, 5.0, 6.0), p=6)
    rig.part("treasury3", g, "#5A4535")
    g = Geo()
    cyl(g, (-92.0, -63.6, 7.0), (-92.0, -64.4, 7.0), 3.4, bevel=0.2, segs=24)
    rig.part("treasury3", g, CW_DIAL, outline=0.4)
    g = Geo()
    for z in (2.0, 11.0):
        box(g, (-92.0, -63.2, z), (7.2, 0.4, 0.7), p=4, cuts=1)
    rig.part("treasury3", g, "#C9A227", finish="bronze_rich", outline=0.3)


def cw_hands_pose(f):
    return {f"hand{k}": ({"show": True} if k == f else {"hide": True}) for k in range(CW_TICKS)}


def cw_gears_pose(f):
    return {f"gear{k}": ({"show": True} if k == f else {"hide": True}) for k in range(CW_TICKS)}


def crumble_clockworks(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "band": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachH": {"show": True}, "soot": {"show": True},
                     "vane": {"hide": True}, "bannerL": {"r": 10.0, "sz": 0.55, "x": 0.6}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breachT": {"show": True}, "gearFire": {"show": True},
                     "spire": {"r": 10.0, "x": -3.0, "z": -3.0}, "chimFar": {"hide": True}, "band": {"hide": True}, "chimStump": {"show": True}})
    return pose


CLOCKTOWER_WORKS = base_module(
    "industrial", "Clocktower Works", height=330, width=190, canvas=(470, 720), feet=(360, 670),
    build=build_clockworks, crumble=crumble_clockworks, mount_depth=CW_DEPTHS, skin="clocktower_works",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-160.0, -32.0, 52.0), 3, 14), ((-58.0, -32.0, 52.0), 2, 14), ((-18.0, -32.0, 52.0), 3, 14), ((CW_GEARS[0], CW_GEARS[1] - 2.0, CW_GEARS[2]), 2, 18)],
    smoke=[((-150.0, -32.0, 40.0), 2), ((CW_TOWER[0] + 4.0, -22.0, 130.0), 3), ((CW_CHIM[1][0], CW_CHIM[1][1], 214.0), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
    props=[prop_loop("hands", ["hands"], CW_TICKS, cw_hands_pose, ms=CW_TICK_MS, crumble=(0, 3), z="front", hold=2, anchor=CW_CLOCK,
                     outline=(1.4, 0.55, 0.5)),
           prop_loop("gears", ["gears"], CW_TICKS, cw_gears_pose, ms=CW_TICK_MS, crumble=(0, 3), z="front", hold=0, anchor=CW_GEARS,
                     outline=(1.4, 0.55, 0.5))],
    extra_meta={
        "collapseMaterial": "iron",
        # the clock tower falls toward the lane first, then the chimney with its gallery
        "topple": [topple_lu(-160, -96, 160, delay_ms=0, push=1.0, sink_lu=36),
                   topple_lu(-70, -30, 190, delay_ms=160, push=0.8, sink_lu=28)],
        "rubbleColors": [CW_BRICK, CW_BRICK_DK, CW_STONE, CW_IRON],
        "dustColor": "#C9C0B4",
        "ambientLu": [ambient_lu("smoke", (CW_CHIM[0][0], CW_CHIM[0][1], CW_CHIM[0][2] + 6.0), 6, 1.0),
                      ambient_lu("smoke", (CW_CHIM[1][0], CW_CHIM[1][1], CW_CHIM[1][2] + 6.0), 6, 0.8),
                      ambient_lu("embers", (-60.0, -32.0, 40.0), 12, 0.6), ambient_lu("steam", (-20.0, 20.0, CW_HALL_TOP + 30.0), 6, 0.5)],
    },
)

SKINS = [COPPER_FOUNDRY, RAIL_DEPOT, CLOCKTOWER_WORKS]
