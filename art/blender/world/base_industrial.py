"""Industrial Age base: the Foundry (docs/design-lane-ages.md A17.12, DESIGN A11 Bases).

A long brick works hall with tall arched, warmly lit windows, stone lintels and a coal slate roof, a
riveted iron gate, a square brick clock tower at the lane edge (a big cream clock face with a brass
rim), a tall tapering brick chimney with copper bands at the back, and an iron lattice gantry crane
standing on the hall roof with a boom, a chain and a hanging crate. The turret mounts
(common.BASE_MOUNTS) are real platforms: a corbelled brick balcony on the clock tower by the gate,
an iron deck on the hall roof edge, the top of the clock tower and the gantry's top deck.
Team colour: the hall's painted sign band, the tower cap, the crane's girder band and the flags.
Crumble: cracks and a broken window (75%), a lost chimney band, a snapped crane hook and rubble
(50%), the chimney cap gone, the boom bent down and the clock hands askew (25%).
Treasury ("steam mill"): sacks of grain and a coal cart (1), a steam mill engine with a flywheel and
a belt (2), its stack and a brass-banded strongbox (3).
"""
import math

from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, chipped_cracks, cyl, flag, platform, rubble, window

BRICK = "#8A6A63"
BRICK_LT = "#9C7C74"
BRICK_DK = "#735852"
BRICK_DKR = "#624B46"
MORTAR = "#B9AFA2"
STONE = "#C3BCAC"
STONE_DK = "#A69F90"
SLATE = "#403F45"
SLATE_LT = "#56555C"
IRON = "#5B6168"
IRON_LT = "#767D86"
IRON_DK = "#454A51"
COAL = "#2B2A2E"
CREAM = "#DCD6C8"
COPPER = "#B06A3B"
BRASS = "#9A8A62"
BRASS_LT = "#B8A776"
WOOD = "#7A5F48"
SACK = "#BBAA88"
WINDOW = "#FFD9A0"
FURNACE = "#FFB866"            # furnace glow in the roof lantern (bases are exempt from the colour rule)
DIAL = "#FBF5E2"
CRACK = "#4A3A36"
GOLD = "#D4A437"

DEPTHS = [-40, -24, -40, -24]
HALL = (-92.0, 12.0, 78.0, 42.0)     # x, y, half length, half depth (height from the mounts)
TW = (-6.0, -19.0, 17.0)             # clock tower: x, y, half size
CHIM = (-152.0, 30.0)                # chimney foot (x, y)
CHIM_TOP = 330.0


def courses(rig, joint, x0, x1, y, z0, z1, step=10.0, color=BRICK_DK):
    """Brick courses on a wall facing the camera (-Y): thin darker bands."""
    g = Geo()
    z = z0 + step
    while z < z1 - 2:
        box(g, ((x0 + x1) / 2, y, z), ((x1 - x0) / 2, 0.8, 0.6), p=4, cuts=2)
        z += step
    rig.part(joint, g, color, outline=0, highlight=False)


def build(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "brokenwin"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    hx, hy, hl, hd = HALL
    hall_h = M[1][2] - 5.0
    tx, ty, th = TW
    tower_h = M[2][2] - 4.0

    # -- the chimney (behind everything) ------------------------------------------------------
    cx, cy = CHIM
    rig.joint("chimtop", "body", (cx, cy, CHIM_TOP - 8))
    g = Geo()
    cyl(g, (cx, cy, hall_h - 10), (cx, cy, CHIM_TOP - 40), 15.0, 11.5, bevel=1.0, segs=24)
    rig.part("body", g, BRICK)
    g = Geo()
    cyl(g, (cx, cy, CHIM_TOP - 40), (cx, cy, CHIM_TOP - 6), 11.5, 10.2, bevel=0.6, segs=24)
    rig.part("body", g, BRICK)
    g = Geo()
    cyl(g, (cx, cy, CHIM_TOP - 8), (cx, cy, CHIM_TOP), 12.8, 12.2, bevel=1.0, segs=24)
    rig.part("chimtop", g, BRICK_LT)
    g = Geo()
    cyl(g, (cx, cy, CHIM_TOP - 0.5), (cx, cy, CHIM_TOP + 0.4), 9.6, bevel=0.2, segs=20)
    rig.part("chimtop", g, COAL, outline=0, highlight=False)
    g = Geo()   # a soft smoke plume leaving the chimney (the code adds rising puffs on top)
    for dx, dz, r in ((0, 6, 8.0), (-7, 14, 7.0), (-16, 20, 6.4), (-26, 24, 5.4), (-36, 26, 4.4)):
        g.sphere((cx + dx, cy - 2, CHIM_TOP + dz), r, cuts=4)
    rig.part("chimtop", g, "#CFCAC0", finish="dust", outline=0.8)
    g = Geo()
    for z in (hall_h + 60, hall_h + 120):
        cyl(g, (cx, cy, z - 1.4), (cx, cy, z + 1.4), 15.0 - (z - hall_h + 10) / (CHIM_TOP - hall_h) * 3.4 + 0.6,
            bevel=0.4, segs=24)
    rig.part("body", g, COPPER, finish="metal", outline=0.4)
    z = CHIM_TOP - 30
    rig.joint("band", "body", (cx, cy, z))
    g = Geo()
    cyl(g, (cx, cy, z - 1.4), (cx, cy, z + 1.4), 12.2, bevel=0.4, segs=24)
    rig.part("band", g, COPPER, finish="metal", outline=0.4)

    # -- the hall: brick walls, stone plinth and lintels, a slate roof, lit arched windows ------
    g = Geo()
    box(g, (hx, hy, hall_h / 2), (hl, hd, hall_h / 2), p=7)
    rig.part("body", g, BRICK)
    g = Geo()
    box(g, (hx, hy, 5.0), (hl + 2, hd + 2, 5.0), p=6)
    rig.part("body", g, STONE_DK)
    courses(rig, "body", hx - hl + 2, hx + hl - 2, hy - hd - 0.4, 10.0, hall_h - 12)
    g = Geo()   # the roof: a stone cornice and a low slate hip
    box(g, (hx, hy, hall_h - 2.0), (hl + 3, hd + 3, 3.0), p=6)
    rig.part("body", g, STONE)
    g = Geo()
    box(g, (hx - 6, hy + 8, hall_h + 6.0), (hl - 8, hd - 10, 6.0), p=5, taper=(1.0, 0.7))
    rig.part("body", g, SLATE)
    # a roof lantern along the ridge: a raised slate-capped monitor whose windows glow with the
    # furnace light inside (it breaks the flat roofline)
    lx0, lx1 = hx - hl + 16, hx + hl - 44
    g = Geo()
    box(g, ((lx0 + lx1) / 2, hy + 4, hall_h + 17.0), ((lx1 - lx0) / 2, 10.0, 7.0), p=6)
    rig.part("body", g, BRICK_LT)
    g = Geo()
    box(g, ((lx0 + lx1) / 2, hy + 4, hall_h + 26.0), ((lx1 - lx0) / 2 + 3, 13.0, 3.0), p=5, taper=(1.0, 0.8))
    rig.part("body", g, SLATE_LT)
    g, gf = Geo(), Geo()
    for x in range(int(lx0 + 6), int(lx1 - 3), 11):
        box(g, (x, hy - 6.4, hall_h + 17.0), (3.6, 0.6, 4.6), p=4, cuts=2)
        box(gf, (x, hy - 6.2, hall_h + 17.0), (4.6, 0.5, 5.6), p=4, cuts=2)
    rig.part("body", gf, IRON_DK, outline=0, highlight=False)
    rig.part("body", g, glow=FURNACE, outline=0)
    g = Geo()   # the team sign band under the cornice
    g.slab([(hx - hl + 6, hall_h - 7), (hx + hl - 26, hall_h - 7), (hx + hl - 26, hall_h - 21),
            (hx - hl + 6, hall_h - 21)], hy - hd - 1.0, 1.4)
    rig.part("body", g, team=True)
    g = Geo()
    for x in range(int(hx - hl + 14), int(hx + hl - 30), 16):
        box(g, (x, hy - hd - 2.0, hall_h - 14), (4.0, 0.6, 3.0), p=4, cuts=2)
    rig.part("body", g, CREAM, outline=0.3)
    for i, x in enumerate((-150.0, -126.0, -102.0, -78.0)):
        window(rig, "body", x, hy - hd - 0.4, 60.0, 14, 34, glow_hex=WINDOW, frame=STONE_DK)
        g = Geo()   # the furnace glare in the lower panes
        box(g, (x, hy - hd - 1.3, 49.0), (6.4, 0.3, 5.6), p=4, cuts=2)
        rig.part("body", g, glow=FURNACE, outline=0)
        g = Geo()   # glazing bars
        box(g, (x, hy - hd - 1.4, 60.0), (0.5, 0.4, 16.0), p=4, cuts=2)
        box(g, (x, hy - hd - 1.4, 58.0), (6.6, 0.4, 0.5), p=4, cuts=2)
        box(g, (x, hy - hd - 1.4, 70.0), (6.6, 0.4, 0.5), p=4, cuts=2)
        rig.part("body", g, IRON_DK, outline=0, highlight=False)
    window(rig, "brokenwin", -102.0, hy - hd - 1.8, 60.0, 14, 34, glow_hex="#2E2826", frame=STONE_DK)
    g = Geo()
    for x in (-150.0, -126.0, -102.0, -78.0):
        box(g, (x, hy - hd - 1.2, 80.0), (9.0, 1.6, 2.0), p=5)   # lintels
    rig.part("body", g, STONE, outline=0.4)
    # the iron gate with rivets and a stone arch
    g = Geo()
    box(g, (-40.0, hy - hd - 1.0, 22.0), (15.0, 1.6, 22.0), p=6)
    rig.part("body", g, STONE)
    g = Geo()
    box(g, (-40.0, hy - hd - 2.0, 19.0), (12.0, 1.6, 19.0), p=6)
    rig.part("body", g, IRON, finish="metal")
    g = Geo()
    for x in (-47.0, -40.0, -33.0):
        for z in (6.0, 14.0, 22.0, 30.0):
            g.sphere((x, hy - hd - 3.8, z), 0.9, cuts=2)
    box(g, (-40.0, hy - hd - 3.4, 19.0), (0.5, 0.5, 18.0), p=4, cuts=2)
    rig.part("body", g, IRON_LT, finish="metal", outline=0)

    # -- the clock tower at the lane edge ------------------------------------------------------
    g = Geo()
    box(g, (tx, ty, tower_h / 2), (th, th, tower_h / 2), p=7, taper=(1.05, 0.95))
    rig.part("body", g, BRICK_LT)
    courses(rig, "body", tx - th + 1, tx + th - 1, ty - th - 0.2, 6.0, tower_h - 4, step=9.0)
    g = Geo()
    for z in (4.0, 92.0, tower_h - 30):
        box(g, (tx, ty, z), (th + 2.0, th + 2.0, 2.4), p=5)
    for sx in (-1, 1):   # stone quoins on the corners
        for k in range(int(tower_h // 16)):
            z = 10 + k * 16
            box(g, (tx + sx * (th - 1.5), ty - th - 0.4, z), (2.6, 1.2, 3.4 if k % 2 else 2.6), p=5, cuts=2)
    rig.part("body", g, STONE, outline=0.4)
    # the clock face
    # the clock face: about twice the area it was, a bright cream dial in a brass rim with a
    # stone surround that overhangs the tower a little, bold hour marks and hands
    cz = tower_h - 20.0 - 20.0
    g = Geo()
    box(g, (tx, ty - th - 0.6, cz), (th + 1.6, 1.4, th + 2.2), p=6)
    rig.part("body", g, STONE, outline=0.4)
    g = Geo()
    cyl(g, (tx, ty - th - 1.5, cz), (tx, ty - th - 3.5, cz), 17.6, bevel=0.6, segs=40)
    rig.part("body", g, BRASS_LT, finish="metal")
    g = Geo()
    cyl(g, (tx, ty - th - 3.2, cz), (tx, ty - th - 4.4, cz), 15.4, bevel=0.2, segs=40)
    rig.part("body", g, DIAL, finish="gloss", outline=0)
    g = Geo()
    for k in range(12):
        a = 2 * math.pi * k / 12
        L = 2.8 if k % 3 else 4.4
        box(g, (tx + 12.2 * math.cos(a), ty - th - 4.6, cz + 12.2 * math.sin(a)), (0.9 if k % 3 else 1.4, 0.3, L / 2),
            p=4, cuts=2, rot=(0, -math.degrees(a) + 90, 0))
    rig.part("body", g, COAL, outline=0, highlight=False)
    rig.joint("hands", "body", (tx, ty - th - 5.0, cz))
    g = Geo()
    g.capsule((tx, ty - th - 5.0, cz), (tx + 7.0, ty - th - 5.0, cz + 4.6), 1.2)
    g.capsule((tx, ty - th - 5.0, cz), (tx - 2.0, ty - th - 5.0, cz + 11.4), 0.9)
    g.sphere((tx, ty - th - 5.2, cz), 1.8, cuts=2)
    rig.part("hands", g, COAL, outline=0)
    window(rig, "body", tx, ty - th - 0.4, 120.0, 8, 18, glow_hex=WINDOW, frame=STONE_DK)
    window(rig, "body", tx, ty - th - 0.4, 34.0, 8, 18, glow_hex=WINDOW, frame=STONE_DK)
    # the tower cap: a team pyramid roof ring under the top platform
    g = Geo()
    box(g, (tx, ty, tower_h - 12.0), (th + 3.0, th + 3.0, 7.0), p=6, taper=(1.0, 1.08))
    rig.part("body", g, team=True)
    g = Geo()
    for sx in (-1, 0, 1):
        box(g, (tx + sx * 9.0, ty - th - 3.2, tower_h - 12.0), (2.4, 0.6, 4.4), p=4, cuts=2)
    rig.part("body", g, CREAM, outline=0.3)

    # -- the gantry crane on the hall roof ---------------------------------------------------------
    x3, y3, z3 = M[3]
    top = z3 - 8.0
    rig.joint("boom", "body", (x3 - 26.0, y3 + 18.0, top + 2.0))
    g = Geo()
    legs = [(x3 - 22, y3 - 2), (x3 + 18, y3 - 2), (x3 - 22, y3 + 36), (x3 + 18, y3 + 36)]
    for lx, ly in legs:
        g.capsule((lx, ly, hall_h + 2), (lx + (x3 - lx) * 0.25, ly + (y3 + 17 - ly) * 0.25, top), 2.0, 1.6)
    for k in range(4):   # cross bracing on the front face
        z0 = hall_h + 4 + k * (top - hall_h - 6) / 4
        z1 = z0 + (top - hall_h - 6) / 4
        f0 = (z0 - hall_h) / (top - hall_h) * 0.25
        f1 = (z1 - hall_h) / (top - hall_h) * 0.25
        a = (x3 - 22 + 22 * f0 * 2, y3 - 2)
        b = (x3 + 18 - 18 * f1 * 2, y3 - 2)
        g.capsule((a[0], a[1], z0), (b[0], b[1], z1), 0.9)
        g.capsule((x3 + 18 - 18 * f0 * 2, y3 - 2, z0), (x3 - 22 + 22 * f1 * 2, y3 - 2, z1), 0.9)
    rig.part("body", g, IRON_DK, finish="metal", outline=0.6)
    g = Geo()
    box(g, (x3 - 2, y3 + 17, top), (26.0, 22.0, 2.6), p=5)
    rig.part("body", g, IRON, finish="metal")
    g = Geo()
    box(g, (x3 - 2, y3 - 5.4, top - 5.0), (24.0, 1.2, 3.0), p=4, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()   # the boom: a lattice girder reaching back, a pulley, the chain and a crate
    bx0, bz0 = x3 - 26.0, top + 2.0
    bx1, bz1 = bx0 - 76.0, top + 18.0
    g.capsule((bx0, y3 + 18, bz0), (bx1, y3 + 18, bz1), 2.0, 1.4)
    g.capsule((bx0, y3 + 18, bz0 - 6), (bx1 + 6, y3 + 18, bz1 - 3), 1.4, 1.0)
    for k in range(7):
        t0, t1 = k / 7, (k + 1) / 7
        g.capsule((bx0 + (bx1 - bx0) * t0, y3 + 18, bz0 + (bz1 - bz0) * t0),
                  (bx0 + (bx1 + 6 - bx0) * t1, y3 + 18, bz0 - 6 + (bz1 - 3 - bz0 + 6) * t1), 0.7)
    rig.part("boom", g, IRON_DK, finish="metal", outline=0.6)
    rig.joint("hook", "boom", (bx1 + 8, y3 + 16, bz1 - 3))
    g = Geo()
    for k in range(6):
        z = bz1 - 5 - k * 5.0
        g.lathe([(1.6, -1.6), (1.8, 0), (1.6, 1.6)], (bx1 + 8, y3 + 16, z), (bx1 + 8, y3 + 16, z - 1), segs=8,
                squash=(1.0, 0.5) if k % 2 else (0.5, 1.0))
    rig.part("hook", g, IRON_LT, finish="metal", outline=0.3)
    g = Geo()
    box(g, (bx1 + 8, y3 + 16, bz1 - 44), (9.0, 8.0, 8.0), p=6)
    rig.part("hook", g, WOOD)
    g = Geo()
    for dz in (-5.0, 5.0):
        box(g, (bx1 + 8, y3 + 7.4, bz1 - 44 + dz), (9.2, 0.6, 1.0), p=4, cuts=2)
    rig.part("hook", g, IRON_DK, finish="metal", outline=0.3)
    g = Geo().sphere((bx0 - 2, y3 + 15, bz0 + 1), 3.4, cuts=3)   # pulley housing
    rig.part("boom", g, BRASS, finish="metal", outline=0.4)

    # -- turret platforms ---------------------------------------------------------------------
    x0, y0, z0 = M[0]
    platform(rig, "body", M[0], BRICK_LT, BRICK_DK, style="stone", r=(25, 19))
    platform(rig, "body", M[1], IRON_LT, IRON_DK, style="stone", r=(26, 19))
    platform(rig, "body", M[2], STONE, BRICK_DK, style="bastion", r=(25, 20))
    platform(rig, "body", M[3], IRON_LT, IRON_DK, style="stone", r=(25, 19))
    g = Geo()   # iron railing posts on the hall deck
    for dx in (-18, -6, 6):
        g.capsule((M[1][0] + dx, M[1][1] - 14, M[1][2]), (M[1][0] + dx, M[1][1] - 14, M[1][2] + 7), 0.8)
    g.capsule((M[1][0] - 18, M[1][1] - 14, M[1][2] + 7), (M[1][0] + 6, M[1][1] - 14, M[1][2] + 7), 0.8)
    rig.part("body", g, IRON_DK, finish="metal", outline=0.4)

    # -- lamps by the gate ------------------------------------------------------------------------
    for x in (-60.0, -20.0):
        g = Geo()
        g.capsule((x, hy - hd - 1.0, 44.0), (x, hy - hd - 7.0, 46.0), 0.8)
        box(g, (x, hy - hd - 8.0, 46.0), (2.6, 2.6, 3.4), p=4)
        rig.part("body", g, IRON_DK, finish="metal", outline=0.4)
        g = Geo().blob((x, hy - hd - 10.6, 46.0), (1.8, 0.6, 2.6), p=2.4)
        rig.part("body", g, glow="#FFF1CE", outline=0)

    # -- damage -------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-140, hy - hd - 1.2, 40), (-134, hy - hd - 1.2, 30), (-140, hy - hd - 1.2, 18)],
                                   [(tx - 8, ty - th - 1.2, 70), (tx - 3, ty - th - 1.2, 60), (tx - 8, ty - th - 1.2, 50)]],
                   CRACK, BRICK_LT)
    chipped_cracks(rig, "crack2", [[(-114, hy - hd - 1.2, 96), (-108, hy - hd - 1.2, 86), (-114, hy - hd - 1.2, 74)],
                                   [(-64, hy - hd - 1.2, 40), (-58, hy - hd - 1.2, 28), (-64, hy - hd - 1.2, 16)],
                                   [(tx + 6, ty - th - 1.2, 150), (tx + 10, ty - th - 1.2, 140),
                                    (tx + 6, ty - th - 1.2, 128)]], CRACK, BRICK_LT)
    chipped_cracks(rig, "crack3", [[(tx - 6, ty - th - 1.2, 110), (tx - 1, ty - th - 1.2, 100),
                                    (tx - 6, ty - th - 1.2, 86)],
                                   [(-160, hy - hd - 1.2, 100), (-154, hy - hd - 1.2, 88)],
                                   [(cx - 4, cy - 15.2, 200), (cx + 1, cy - 15.2, 186), (cx - 3, cy - 15.2, 172)]],
                   CRACK, BRICK_LT)
    rubble(rig, "rubble1", [(-150, -44), (-128, -50)], BRICK_DK, seed=4)
    rubble(rig, "rubble2", [(-96, -50), (-66, -54)], BRICK_DK, seed=14)
    rubble(rig, "rubble3", [(-156, -58), (-120, -60), (-40, -60)], BRICK_DKR, seed=24, size=1.2)

    # -- flags ---------------------------------------------------------------------------------
    flag(rig, "root", "flagA", (x3 + 14, y3 + 34, top + 50), length=30, height=17, pole=top, pole_color=IRON_DK,
         finial=BRASS_LT)
    flag(rig, "root", "flagB", (-168.0, 40.0, hall_h + 50), length=24, height=14, pole=hall_h + 4,
         pole_color=IRON_DK, finial=BRASS_LT)

    # -- Treasury: the steam mill ------------------------------------------------------------------
    g = Geo()   # 1: grain sacks and a coal cart
    for x, z, rr in ((-166, 6, 7.0), (-156, 5, 6.4), (-161, 15, 6.0)):
        g.blob((x, -58, z), (rr, rr * 0.8, rr * 0.9), p=2.4, taper=(1.05, 0.8))
    rig.part("treasury1", g, SACK, finish="hair")
    g = Geo()
    box(g, (-140, -60, 11), (9.0, 6.0, 5.0), p=5, taper=(0.85, 1.0))
    rig.part("treasury1", g, IRON_DK, finish="metal")
    g = Geo()
    for dx in (-5, 0, 5):
        g.sphere((-140 + dx, -60, 17.0), 3.2, cuts=2)
    rig.part("treasury1", g, COAL, outline=0.3)
    g = Geo()
    for dx in (-6, 6):
        cyl(g, (-140 + dx, -66.4, 4), (-140 + dx, -67.6, 4), 4.0, bevel=0.3, segs=14)
    rig.part("treasury1", g, WOOD, outline=0.4)
    g = Geo()   # 2: the mill engine: a small boiler, a flywheel and a belt to a millstone house
    cyl(g, (-120, -58, 7), (-100, -58, 7), 6.4, bevel=1.0, segs=18)
    rig.part("treasury2", g, IRON, finish="metal")
    g = Geo()
    cyl(g, (-104, -58, 7), (-102.6, -58, 7), 6.8, bevel=0.2, segs=18)
    rig.part("treasury2", g, COPPER, finish="metal", outline=0.3)
    g = Geo()
    cyl(g, (-94, -64, 14), (-94, -66, 14), 12.0, bevel=0.4, segs=28)
    rig.part("treasury2", g, IRON_DK, finish="metal")
    g = Geo()
    for k in range(6):
        a = 2 * math.pi * k / 6
        g.capsule((-94, -66.6, 14), (-94 + 10 * math.cos(a), -66.6, 14 + 10 * math.sin(a)), 1.0)
    rig.part("treasury2", g, IRON_LT, finish="metal", outline=0.3)
    g = Geo()
    box(g, (-76, -54, 12), (9.0, 8.0, 12.0), p=6)
    rig.part("treasury2", g, BRICK_LT)
    g = Geo()
    box(g, (-76, -54, 26.0), (11.0, 10.0, 3.0), p=5, taper=(1.0, 0.6))
    rig.part("treasury2", g, SLATE_LT)
    g = Geo()
    g.capsule((-94, -64.4, 25.6), (-80, -62.6, 18.0), 0.8)
    g.capsule((-94, -64.4, 2.4), (-80, -62.6, 10.0), 0.8)
    rig.part("treasury2", g, "#5A4A3E", outline=0.3)
    window(rig, "treasury2", -76, -62.4, 12, 6, 10, glow_hex=WINDOW, frame=STONE_DK)
    g = Geo()   # 3: the mill stack and a brass-banded strongbox
    cyl(g, (-114, -58, 12), (-115, -58, 36), 2.4, 2.0, bevel=0.3, segs=12)
    cyl(g, (-115.2, -58, 35), (-115.4, -58, 38), 3.2, bevel=0.3, segs=12)
    rig.part("treasury3", g, COAL, finish="metal", outline=0.4)
    g = Geo()
    box(g, (-58, -62, 6), (8.0, 6.0, 6.0), p=6)
    rig.part("treasury3", g, IRON_DK, finish="metal")
    g = Geo()
    for dx in (-4.0, 4.0):
        box(g, (-58 + dx, -68.2, 6), (1.2, 0.5, 6.2), p=4, cuts=2)
    box(g, (-58, -68.4, 7.0), (1.6, 0.6, 1.8), p=4, cuts=2)
    rig.part("treasury3", g, GOLD, finish="metal", outline=0.3)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "brokenwin": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "band": {"hide": True},
                     "hook": {"hide": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "chimtop": {"hide": True},
                     "boom": {"r": -14.0, "z": -3.0}, "hands": {"r": 70.0}})
    return pose


def _smoke_top():
    return (CHIM[0], CHIM[1], CHIM_TOP + 4)


MODULE = base_module(
    "industrial", "Foundry", height=330, width=190, canvas=(470, 720), feet=(360, 670),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-150.0, -31.0, 60.0), 3, 16), ((-126.0, -31.0, 60.0), 3, 16), ((-78.0, -31.0, 60.0), 3, 16),
            ((-60.0, -40.0, 46.0), 3, 12), ((-20.0, -40.0, 46.0), 3, 12), ((-6.0, -36.0, 120.0), 2, 12),
            ((-140.0, 5.0, 124.0), 2, 14), ((-110.0, 5.0, 124.0), 2, 14), ((-80.0, 5.0, 124.0), 2, 14)],
    smoke=[(_smoke_top(), 0), ((-100.0, -30.0, 90.0), 2), ((-6.0, -36.0, 150.0), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
)
