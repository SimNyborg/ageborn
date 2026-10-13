"""Future Age base skins as real models (PLAN 2c): `base.future@<skin>`.

Midnight Neon (Epic, Wardrobe Crate; round 2): the Spire rebuilt as a night-city tower. A charcoal
skyscraper in three setbacks under a stepped art-deco crown and a signal mast; dark rain-streaked glass in a
grid of lit and unlit windows; neon tubes in magenta and mint (never cyan, the team hue's neighbour) along
the corners and setbacks; holo sign blades without text (a ring, chevrons, a bolt) jut from its sides; the
mounts are hover discs with neon rims. Team colour: two tall facade sign panels framed in neon, the crown's
billboard, the plinth's collar and the flags.

Crumble: 75% shattered windows, a sign blade knocked loose and hanging, the left fin lost; 50% plasma
fire in a broken floor, a neon tube dead and dark windows, sparks; 25% a breach at the foot with a hanging
cable, the mast snapped and the crown knocked askew. Treasury: neon cells (1), a holo crystal (2), a data
vault cube (3).

Crystal Spire (Legendary, the Arena 8 gate reward, a troop-system skin of `base.future`; round 2): a great
faceted crystal grows from a dark violet outcrop, ringed by smaller crystals, its heart a team-coloured
glowing core seen through the facets; shards float round its tip. The mounts are floating crystal slabs.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.base_skins_kit import crystal_cluster, crystal_prism, flames
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, rubble,
                          topple_lu)

CHARCOAL = "#23262E"
CHAR_LT = "#363A46"
CHAR_MID = "#2C303A"
GLASS = "#3B4554"        # dark rain glass (low saturation)
GLASS_LT = "#5A6A7E"
TRIM = "#8E97A4"
MAGENTA = "#F03AA8"
MAGENTA_CORE = "#FFD6EE"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
WARM = "#FFE2B0"
WIN_MINT = "#BFF7E4"
HOLE = "#14161C"
N_CRACK = "#16181E"

DEPTHS = [-40, -24, -40, -24]
SP = (-92.0, 26.0)
# the tower's setbacks: (half width, half depth, z bottom, z top)
SETS = [(48.0, 34.0, 16.0, 118.0), (38.0, 28.0, 118.0, 198.0), (28.0, 22.0, 198.0, 252.0)]


def front_y(k):
    hw, hd, z0, z1 = SETS[k]
    return SP[1] - hd


def neon(rig, joint, pts, color, core, r=1.3):
    """A neon tube along a polyline: the glowing tube and a thin hot core in front of it."""
    g, c = Geo(), Geo()
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, r, segs=8, rings=2)
        c.capsule((a[0], a[1] - r * 0.7, a[2]), (b[0], b[1] - r * 0.7, b[2]), r * 0.45, segs=6, rings=1)
    rig.part(joint, g, glow=color, outline=0)
    rig.part(joint, c, glow=core, outline=0)


def window_grid(rig, joint, x0, x1, z0, z1, y, cols, rows, seed=0, skip=None, dark_joint=None):
    """Dark rain glass with a grid of windows on a face at y: frames, glass, some lit (warm or mint), rain
    streaks; `skip(c, r)` leaves cells out (signs over them); the lit ones go dark at 50% (`dark_joint`)."""
    rnd = random.Random(seed)
    w = (x1 - x0) / cols
    h = (z1 - z0) / rows
    glass, lit_w, lit_m, streak, dark = Geo(), Geo(), Geo(), Geo(), Geo()
    for c in range(cols):
        for r in range(rows):
            if skip and skip(c, r):
                continue
            cx = x0 + (c + 0.5) * w
            cz = z0 + (r + 0.5) * h
            q = rnd.random()
            pts = [(cx - w * 0.36, cz - h * 0.34), (cx + w * 0.36, cz - h * 0.34), (cx + w * 0.36, cz + h * 0.34), (cx - w * 0.36, cz + h * 0.34)]
            if q < 0.22:
                lit_w.slab(pts, y - 0.6, 0.8)
                dark.slab(pts, y - 1.0, 0.8)
            elif q < 0.36:
                lit_m.slab(pts, y - 0.6, 0.8)
                dark.slab(pts, y - 1.0, 0.8)
            else:
                glass.slab(pts, y - 0.6, 0.8)
            if rnd.random() < 0.5:
                sx = cx + rnd.uniform(-w * 0.25, w * 0.25)
                streak.capsule((sx, y - 1.2, cz + h * 0.3), (sx - 0.8, y - 1.2, cz - h * 0.3), 0.32, segs=4, rings=1)
    rig.part(joint, glass, GLASS, finish="gloss", outline=0)
    rig.part(joint, lit_w, glow=WARM, outline=0)
    rig.part(joint, lit_m, glow=WIN_MINT, outline=0)
    rig.part(joint, streak, GLASS_LT, outline=0, highlight=False)
    if dark_joint:
        rig.part(dark_joint, dark, GLASS, finish="gloss", outline=0)


def sign_blade(rig, joint, x, y, z, w, h, color, core, motif, side=1):
    """A holo sign blade jutting from a wall (its edge toward the camera shows the face): a charcoal frame,
    a glowing panel and an abstract motif (no text)."""
    g = Geo()
    box(g, (x, y, z), (w / 2 + 1.6, 1.6, h / 2 + 1.6), p=5, cuts=2)
    rig.part(joint, g, CHAR_LT, finish="metal", outline=0.5)
    g = Geo().slab([(x - w / 2, z - h / 2), (x + w / 2, z - h / 2), (x + w / 2, z + h / 2), (x - w / 2, z + h / 2)], y - 1.8, 0.8)
    rig.part(joint, g, glow=color, outline=0)
    g = Geo()
    if motif == "ring":
        n = 18
        for i in range(n):
            a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
            g.capsule((x + math.cos(a0) * w * 0.3, y - 2.4, z + math.sin(a0) * w * 0.3), (x + math.cos(a1) * w * 0.3, y - 2.4, z + math.sin(a1) * w * 0.3),
                      w * 0.07, segs=6, rings=1)
    elif motif == "chevrons":
        for k in range(3):
            zz = z + h * 0.28 - k * h * 0.26
            g.capsule((x - w * 0.3, y - 2.4, zz - h * 0.1), (x, y - 2.4, zz), w * 0.08, segs=6, rings=1)
            g.capsule((x, y - 2.4, zz), (x + w * 0.3, y - 2.4, zz - h * 0.1), w * 0.08, segs=6, rings=1)
    else:   # a bolt
        pts = [(x + w * 0.1, z + h * 0.38), (x - w * 0.18, z + h * 0.02), (x + w * 0.12, z + h * 0.02), (x - w * 0.1, z - h * 0.38)]
        for a, b in zip(pts, pts[1:]):
            g.capsule((a[0], y - 2.4, a[1]), (b[0], y - 2.4, b[1]), w * 0.08, segs=6, rings=1)
    rig.part(joint, g, glow=core, outline=0)
    g = Geo()
    g.capsule((x - side * (w / 2 + 1.6), y + 1.0, z + h / 2 - 2), (x - side * (w / 2 + 7.0), y + 4.0, z + h / 2 - 2), 0.9)
    g.capsule((x - side * (w / 2 + 1.6), y + 1.0, z - h / 2 + 2), (x - side * (w / 2 + 7.0), y + 4.0, z - h / 2 + 2), 0.9)
    rig.part(joint, g, TRIM, finish="metal", outline=0.3)


def _jagged(cx, cz, rx, rz, n=11, seed=0, amp=0.28):
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        f = 1.0 + amp * (1 if (k + seed) % 2 else -1) * (0.6 + 0.4 * math.sin(k * 2.3 + seed))
        pts.append((cx + rx * f * math.cos(a), cz + rz * f * math.sin(a)))
    return pts


def plasma(rig, joint, spots):
    """Energy fire: magenta teardrop tongues with a pale core."""
    o, g, c = Geo(), Geo(), Geo()
    for x, y, z, k in spots:
        for dx, lean, r, h in ((0.0, 0.25, 6.0, 19.0), (-5.5, -0.35, 4.0, 12.0), (5.5, 0.45, 3.8, 10.0)):
            cx, cz = x + dx * k, z + h * 0.42 * k
            o.blob((cx, y + 2, cz), (r * 1.3 * k, r * 0.9 * k, h * 0.62 * k), p=2.0, taper=(1.0, 0.08), shift=(lean * 1.2, 0.0))
            g.blob((cx, y, cz - 0.6 * k), (r * k, r * 0.7 * k, h * 0.5 * k), p=2.0, taper=(1.0, 0.1), shift=(lean, 0.0))
            c.blob((cx, y - 2.5, cz - 2.4 * k), (r * 0.5 * k, r * 0.4 * k, h * 0.28 * k), p=2.0, taper=(1.0, 0.2), shift=(lean * 0.6, 0.0))
    rig.part(joint, o, glow="#C93A92", outline=0)
    rig.part(joint, g, glow="#F46BC0", outline=0)
    rig.part(joint, c, glow="#FFE3F3", outline=0)


def build_neon(rig, M):
    for j, pos in (("mast", (SP[0] - 2, SP[1] - 4, 274)), ("crown", (SP[0], SP[1], 252)), ("fin", (SP[0] - 52, SP[1], 60)),
                   ("blade", (SP[0] - 46, front_y(1) + 6, 168)), ("strut", (0, 0, 0)), ("tube", (0, 0, 0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "shatter", "sparks1", "fire1", "scorch", "darkwin",
              "breach", "fire2", "cable", "blade_hang", "mastfallen", "tubedark"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # the plinth: a charcoal block with a magenta glow strip and a team collar at the gate
    g = Geo()
    box(g, (SP[0], SP[1], 8), (64, 46, 8), p=6)
    rig.part("body", g, CHARCOAL)
    g = Geo()
    box(g, (SP[0], SP[1] - 0.6, 15.0), (65, 47, 1.2), p=6, cuts=2)
    rig.part("body", g, glow=MAGENTA, outline=0)

    # the tower in three setbacks: charcoal cores, window grids on the fronts, neon on the corners
    for k, (hw, hd, z0, z1) in enumerate(SETS):
        g = Geo()
        box(g, (SP[0], SP[1], (z0 + z1) / 2), (hw, hd, (z1 - z0) / 2), p=12)
        rig.part("body", g, CHARCOAL if k != 1 else CHAR_MID, finish="gloss")
        g = Geo()   # a ledge at the top of each setback
        box(g, (SP[0], SP[1] - 0.8, z1 - 1.6), (hw + 2.4, hd + 2.4, 2.2), p=6)
        rig.part("body", g, CHAR_LT, finish="metal")
        yf = SP[1] - hd
        cols = (6, 5, 4)[k]
        rows = (8, 6, 4)[k]

        def skip(c, r, k=k, cols=cols):
            # the team sign panels cover the middle columns of the lower two setbacks
            return k < 2 and c in ((2, 3) if k == 0 else (2,)) and r >= 1
        window_grid(rig, "body", SP[0] - hw + 4, SP[0] + hw - 4, z0 + 6, z1 - 6, yf - 0.4, cols, rows, seed=11 + k, skip=skip,
                    dark_joint="darkwin")
        # neon on the two front corners (magenta left, mint right) and along the setback ledge
        for sx, col, core in ((-1, MAGENTA, MAGENTA_CORE), (1, MINT, MINT_CORE)):
            neon(rig, "tube" if (k == 1 and sx > 0) else "body", [(SP[0] + sx * (hw - 1.0), yf - 1.2, z0 + 3), (SP[0] + sx * (hw - 1.0), yf - 1.2, z1 - 4)],
                 col, core, r=1.2)
        neon(rig, "body", [(SP[0] - hw, yf - 3.2, z1 - 1.4), (SP[0] + hw, yf - 3.2, z1 - 1.4)], MINT if k % 2 == 0 else MAGENTA,
             MINT_CORE if k % 2 == 0 else MAGENTA_CORE, r=0.9)
    # the dead tube (50%): the middle setback's right tube, dark
    g = Geo()
    hw, hd, z0, z1 = SETS[1]
    g.capsule((SP[0] + hw - 1.0, SP[1] - hd - 1.4, z0 + 3), (SP[0] + hw - 1.0, SP[1] - hd - 1.4, z1 - 4), 1.25, segs=8, rings=2)
    rig.part("tubedark", g, CHAR_LT, finish="gloss", outline=0)

    # team sign panels on the facade, framed in neon
    for k, (x0, x1, z0, z1) in enumerate(((SP[0] - 13, SP[0] + 13, 34, 108), (SP[0] - 9, SP[0] + 9, 132, 190))):
        yf = front_y(k) - 1.8
        g = Geo().slab([(x0, z0), (x1, z0), (x1, z1), (x0, z1)], yf, 1.4)
        rig.part("body", g, team=True)
        neon(rig, "body", [(x0 - 1.4, yf - 1.2, z0 - 1.4), (x1 + 1.4, yf - 1.2, z0 - 1.4), (x1 + 1.4, yf - 1.2, z1 + 1.4),
                           (x0 - 1.4, yf - 1.2, z1 + 1.4), (x0 - 1.4, yf - 1.2, z0 - 1.4)], MAGENTA if k == 0 else MINT,
             MAGENTA_CORE if k == 0 else MINT_CORE, r=1.0)
        # an abstract glyph on the panel: three stacked bars and a dot
        g = Geo()
        xc = (x0 + x1) / 2
        for i in range(3):
            zz = z0 + (z1 - z0) * (0.62 - i * 0.14)
            w_ = (x1 - x0) * (0.32 - i * 0.06)
            g.capsule((xc - w_, yf - 1.2, zz), (xc + w_, yf - 1.2, zz), 1.2, segs=6, rings=1)
        g.sphere((xc, yf - 1.2, z0 + (z1 - z0) * 0.84), 2.4, cuts=2)
        rig.part("body", g, "#E8ECF2", outline=0, highlight=False)

    # the crown: a stepped art-deco top with neon ribs, a team billboard, and the signal mast
    g = Geo()
    for i, (r, z) in enumerate(((24, 252), (19, 260), (14, 268))):
        box(g, (SP[0], SP[1], z + 4), (r, r * 0.8, 4), p=8)
    rig.part("crown", g, CHAR_LT, finish="metal")
    for sx in (-1, 1):
        neon(rig, "crown", [(SP[0] + sx * 24, SP[1] - 19.4, 252), (SP[0] + sx * 19, SP[1] - 15.4, 264), (SP[0] + sx * 14, SP[1] - 11.4, 272),
                            (SP[0] + sx * 6, SP[1] - 6, 280)], MAGENTA if sx < 0 else MINT, MAGENTA_CORE if sx < 0 else MINT_CORE, r=0.9)
    g = Geo().slab([(SP[0] - 16, 238), (SP[0] + 16, 238), (SP[0] + 16, 250), (SP[0] - 16, 250)], front_y(2) - 3.0, 1.4)
    rig.part("crown", g, team=True, outline=0.5)
    g = Geo()
    g.capsule((SP[0] - 10, front_y(2) - 3.6, 244), (SP[0] + 10, front_y(2) - 3.6, 244), 1.0, segs=6, rings=1)
    rig.part("crown", g, glow="#F6F8FF", outline=0)
    g = Geo()
    cyl(g, (SP[0] - 2, SP[1] - 4, 276), (SP[0] - 2, SP[1] - 4, 318), 1.6, 0.9, bevel=0.3)
    for z in (288, 302):
        g.capsule((SP[0] - 9, SP[1] - 4, z), (SP[0] + 5, SP[1] - 4, z), 0.7)
    rig.part("mast", g, TRIM, finish="metal", outline=0.4)
    g = Geo()
    g.sphere((SP[0] - 2, SP[1] - 5, 320), 2.6, cuts=3)
    rig.part("mast", g, glow=MAGENTA, outline=0.8, outline_hex="#8A1E60")
    g = Geo()
    g.sphere((SP[0] - 9, SP[1] - 5, 288), 1.5, cuts=2).sphere((SP[0] + 5, SP[1] - 5, 302), 1.5, cuts=2)
    rig.part("mast", g, glow=MINT_CORE, outline=0)

    # holo sign blades on the tower's sides (one knocked loose at 75%, hanging by a bracket)
    sign_blade(rig, "body", SP[0] + 52, front_y(0) + 10, 92, 12, 30, MINT, MINT_CORE, "chevrons", side=1)
    sign_blade(rig, "blade", SP[0] - 46, front_y(1) + 6, 168, 11, 26, MAGENTA, MAGENTA_CORE, "ring", side=-1)
    sign_blade(rig, "body", SP[0] + 34, front_y(2) + 4, 228, 9, 20, MAGENTA, MAGENTA_CORE, "bolt", side=1)

    # side fins at the foot (the left one is lost at 75%)
    g = Geo().slab([(SP[0] - 46, 16), (SP[0] - 70, 16), (SP[0] - 54, 80), (SP[0] - 46, 104)], SP[1], 5)
    rig.part("fin", g, CHAR_LT, finish="metal")
    neon(rig, "fin", [(SP[0] - 68, SP[1] - 3, 18), (SP[0] - 53, SP[1] - 3, 78)], MAGENTA, MAGENTA_CORE, r=0.8)
    g = Geo().slab([(SP[0] + 46, 16), (SP[0] + 62, 16), (SP[0] + 50, 70), (SP[0] + 46, 96)], SP[1] + 6, 5)
    rig.part("body", g, CHAR_LT, finish="metal")

    # the gate: a lit lobby door with a magenta canopy and a team collar ring
    g = Geo()
    cyl(g, (-30, -34, 0), (-30, -34, 14), 16, 13, bevel=1.2, segs=24)
    rig.part("body", g, CHARCOAL)
    g = Geo()
    cyl(g, (-30, -34, 13), (-30, -34, 17), 13.5, bevel=0.6, segs=24)
    rig.part("body", g, team=True)
    g = Geo().sphere((-30, -34, 27), 10, cuts=4)
    rig.part("body", g, glow=MAGENTA, outline=1.0, outline_hex="#8A1E60")
    g = Geo().sphere((-32, -42, 29), 5, cuts=3)
    rig.part("body", g, glow=MAGENTA_CORE, outline=0)
    g = Geo()
    for a in (-50, 50):
        g.capsule((-30 + 14 * math.sin(math.radians(a)), -34, 12), (-30 + 12 * math.sin(math.radians(a)), -34, 42), 2.0, 1.2)
    rig.part("body", g, TRIM, finish="metal", outline=0.5)
    g = Geo().slab([(SP[0] - 16, 16), (SP[0] + 16, 16), (SP[0] + 16, 40), (SP[0] - 16, 40)], front_y(0) - 0.6, 1.0)
    rig.part("body", g, glow=WARM, outline=0)
    g = Geo()
    box(g, (SP[0], front_y(0) - 6, 44), (20, 7, 1.6), p=6)
    rig.part("body", g, CHAR_LT, finish="metal")
    neon(rig, "body", [(SP[0] - 20, front_y(0) - 12.8, 42.4), (SP[0] + 20, front_y(0) - 12.8, 42.4)], MAGENTA, MAGENTA_CORE, r=0.8)

    # hover disc platforms at the mounts with neon rims (magenta below, mint glow ring)
    for i, (x, y, z) in enumerate(M):
        k = 0 if z < 118 else (1 if z < 198 else 2)
        hw, hd = SETS[k][0], SETS[k][1]
        anchor = (SP[0] + hw * 0.7, SP[1] - hd * 0.8, z - 18)
        if i == 0:
            anchor = (x - 4, y + 12, 2)
        platform(rig, "strut" if i == 2 else "body", (x, y, z), CHAR_LT, TRIM, style="disc", r=(24, 18), t=5, depth_to=anchor,
                 accent=MINT if i % 2 == 0 else MAGENTA)

    # damage: shattered windows (75%), sparks; plasma in a broken floor, soot (50%); a breach with a cable,
    # the mast snapped and lying, the crown askew (25%)
    g = Geo()
    yf = front_y(0) - 1.6
    for x, z in ((SP[0] - 30, 96), (SP[0] + 32, 70), (SP[0] - 34, 46)):
        g.slab(_jagged(x, z, 7.0, 6.0, seed=int(-x), amp=0.4), yf, 0.6)
    rig.part("shatter", g, HOLE, outline=0, highlight=False)
    g = Geo()
    for x, z in ((SP[0] - 30, 96), (SP[0] + 32, 70), (SP[0] - 34, 46)):
        g.slab([(x - 4, z - 2), (x + 1, z + 4), (x + 3, z - 3)], yf - 0.8, 0.5)
    rig.part("shatter", g, GLASS_LT, outline=0.3)
    g = Geo().star((SP[0] + 34, front_y(0) - 4, 64), 6.0, 2.2, 1.0, points=5, rot=(90, 0, 0))
    rig.part("sparks1", g, glow=MINT_CORE, outline=0.6, outline_hex=MINT)
    x, z = SP[0] - 22, 150
    g = Geo().slab(_jagged(x, z, 15.0, 14.0, seed=1), front_y(1) - 2.0, 2.0)
    rig.part("fire1", g, CHAR_LT, outline=0.6)
    g = Geo().slab(_jagged(x + 0.5, z - 0.5, 10.5, 10.0, seed=2), front_y(1) - 3.4, 1.0)
    rig.part("fire1", g, HOLE, outline=0, highlight=False)
    plasma(rig, "fire1", [(x, front_y(1) - 5.0, z - 8.0, 1.4)])
    g = Geo()
    g.slab(_jagged(x + 2.0, z + 18.0, 8.0, 9.0, seed=3, amp=0.35), front_y(1) - 1.4, 0.8)
    g.slab(_jagged(SP[0] + 20, 60, 9.0, 7.0, seed=4, amp=0.3), front_y(0) - 1.4, 0.8)
    rig.part("scorch", g, "#3E3F48", outline=0, highlight=False)
    bx, bz = SP[0] + 18, 40
    g = Geo().slab(_jagged(bx, bz, 18.0, 18.0, seed=5, amp=0.3), front_y(0) - 2.0, 2.4)
    rig.part("breach", g, CHAR_LT, outline=0.6)
    g = Geo().slab(_jagged(bx, bz - 1.0, 13.0, 13.0, seed=6, amp=0.3), front_y(0) - 3.4, 1.0)
    rig.part("breach", g, HOLE, outline=0, highlight=False)
    yb = front_y(0) - 4.0
    g = Geo()
    g.capsule((bx - 4.0, yb, bz + 6.0), (bx + 6.0, yb - 4.0, bz - 10.0), 1.6)
    g.capsule((bx + 6.0, yb - 4.0, bz - 10.0), (bx + 10.0, yb - 5.0, bz - 22.0), 1.4)
    rig.part("cable", g, CHARCOAL, outline=0.5)
    g = Geo().star((bx + 10.0, yb - 6.5, bz - 23.0), 4.0, 1.5, 1.0, points=5, rot=(90, 0, 0))
    rig.part("cable", g, glow=MAGENTA_CORE, outline=0.6, outline_hex=MAGENTA)
    plasma(rig, "fire2", [(bx - 4.0, yb - 1.0, bz - 12.0, 1.4)])
    g = Geo()
    g.capsule((10, -58, 4), (-34, -64, 8), 1.6, 0.9)
    g.capsule((-6, -60, 5), (-12, -61, 12), 0.7)
    rig.part("mastfallen", g, TRIM, finish="metal", outline=0.4)
    g = Geo().sphere((-36, -64, 8.4), 2.6, cuts=3)
    rig.part("mastfallen", g, "#5A2244", finish="gloss", outline=0.5)
    # the loose sign blade hanging by one bracket (75%)
    sign_blade(rig, "blade_hang", SP[0] - 46, front_y(1) - 2, 150, 11, 26, MAGENTA, MAGENTA_CORE, "ring", side=-1)

    yc = front_y(0) - 2.2
    chipped_cracks(rig, "crack1", [[(SP[0] - 18, yc, 92), (SP[0] - 12, yc, 82), (SP[0] - 18, yc, 70)],
                                   [(SP[0] + 10, front_y(1) - 2.2, 176), (SP[0] + 15, front_y(1) - 2.2, 166)]], N_CRACK, GLASS_LT, w=1.6)
    chipped_cracks(rig, "crack2", [[(SP[0] - 40, yc, 40), (SP[0] - 34, yc, 30), (SP[0] - 40, yc, 20)],
                                   [(SP[0] + 18, front_y(1) - 2.2, 140), (SP[0] + 23, front_y(1) - 2.2, 130)]], N_CRACK, GLASS_LT, w=1.6)
    chipped_cracks(rig, "crack3", [[(SP[0] - 8, front_y(2) - 2.2, 240), (SP[0] - 3, front_y(2) - 2.2, 230), (SP[0] - 8, front_y(2) - 2.2, 218)],
                                   [(SP[0] + 36, yc, 108), (SP[0] + 41, yc, 98)]], N_CRACK, GLASS_LT, w=1.6)
    rubble(rig, "rubble1", [(-158, -40), (-136, -48)], CHAR_LT, seed=3)
    rubble(rig, "rubble2", [(-96, -54), (-64, -58)], CHAR_LT, seed=13)
    rubble(rig, "rubble3", [(-152, -58), (-120, -60), (18, -56)], CHAR_LT, seed=23, size=1.2)
    for j, pts in (("rubble1", [(-150, -50)]), ("rubble2", [(-82, -60), (-56, -62)]), ("rubble3", [(-140, -64), (8, -60)])):
        g = Geo()
        for x2, y2 in pts:
            g.slab([(x2 - 4, 0.5), (x2 + 3, 0.5), (x2 + 1, 6)], y2 - 6, 0.8)
            g.slab([(x2 + 5, 0.5), (x2 + 10, 0.5), (x2 + 8, 4)], y2 - 4, 0.8)
        rig.part(j, g, GLASS_LT, outline=0.3)

    flag(rig, "root", "flagA", (SP[0] - 30, SP[1] + 6, 300), length=30, height=16, pole=250, pole_color=TRIM, finial=MINT)
    flag(rig, "root", "flagB", (-150, 34, 140), length=24, height=14, pole=14, pole_color=TRIM, finial=MINT)

    # Treasury: neon cells (1), a holo crystal (2), a data vault cube (3)
    g = Geo()
    for k, x in enumerate((-160, -150, -140)):
        cyl(g, (x, -58, 0), (x, -58, 18 - k * 2), 4.2, bevel=0.8)
    rig.part("treasury1", g, CHAR_LT, finish="metal")
    g = Geo()
    for k, x in enumerate((-160, -150, -140)):
        cyl(g, (x, -62.4, 4), (x, -62.4, 14 - k * 2), 1.4, bevel=0.3)
    rig.part("treasury1", g, glow=MAGENTA if True else MINT, outline=0)
    g = Geo()
    for dx, h, a in ((0, 22, 0), (-6, 15, -18), (6, 17, 20), (-2, 11, -40), (9, 10, 42)):
        g.lathe([(0, 0), (3.4, 2), (3.4, h - 5), (0, h)], (-134 + dx, -62, 0),
                (-134 + dx + h * math.sin(math.radians(a)), -62, h * math.cos(math.radians(a))), segs=6)
    rig.part("treasury2", g, glow=WIN_MINT, outline=0.6, outline_hex="#2A8C6E")
    g = Geo()
    box(g, (-106, -64, 10), (10, 10, 10), p=5, rot=(0, 0, 20))
    rig.part("treasury3", g, CHARCOAL, finish="metal")
    g = Geo()
    box(g, (-106, -64, 10), (10.6, 10.6, 1.4), p=5, rot=(0, 0, 20))
    rig.part("treasury3", g, glow=MAGENTA, outline=0)


def crumble_neon(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "fin": {"hide": True}, "rubble1": {"show": True}, "shatter": {"show": True},
                     "sparks1": {"show": True}, "blade": {"hide": True}, "blade_hang": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "darkwin": {"show": True}, "tube": {"hide": True}, "tubedark": {"show": True}, "sparks1": {"hide": True},
                     "mast": {"r": 10.0, "x": -3.0, "z": -4.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "mast": {"hide": True}, "mastfallen": {"show": True},
                     "breach": {"show": True}, "cable": {"show": True}, "fire2": {"show": True},
                     "crown": {"r": 9.0, "x": -4.0, "z": -6.0}})
    return pose


MIDNIGHT_NEON = base_module(
    "future", "Midnight Neon", height=330, width=180, canvas=(470, 740), feet=(360, 690),
    build=build_neon, crumble=crumble_neon, mount_depth=DEPTHS, skin="midnight_neon",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-30, -44, 27), 3, 30), ((SP[0], front_y(0) - 4, 30), 3, 26), ((SP[0] + 52, front_y(0) + 4, 92), 1, 20),
            ((SP[0] - 46, front_y(1), 168), 0, 18), ((SP[0], SP[1] - 10, 320), 2, 16)],
    smoke=[((SP[0], SP[1], 262), 2), ((SP[0] - 20, -10, 150), 3), ((-40, -20, 30), 3)],
    horn=(-110, 350), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "energy",
        # the upper setbacks with the crown fall toward the lane, the middle one after them
        "topple": [topple_lu(-130, -50, 200, delay_ms=0, push=1.0, sink_lu=28),
                   topple_lu(-140, -40, 120, delay_ms=150, push=0.8, sink_lu=22)],
        "rubbleColors": [CHAR_LT, CHARCOAL, GLASS_LT, MAGENTA],
        "dustColor": "#5A5E6A",
        "ambientLu": [ambient_lu("rain", (SP[0], SP[1] - 20, 300), 60, 1.4), ambient_lu("rain", (SP[0] - 20, SP[1] - 30, 200), 50, 1.0),
                      ambient_lu("glints", (SP[0] + 52, front_y(0) + 4, 92), 12, 0.6), ambient_lu("glints", (SP[0] - 46, front_y(1), 168), 12, 0.6),
                      ambient_lu("glints", (SP[0], SP[1] - 10, 316), 10, 0.5)],
    },
)

# ---------------------------------------------------------------------------------------------------
# Crystal Spire (round 2; the troop-system skin of base.future, Legendary)

CRYSTAL = "#F0E8FF"      # pale crystal (glossy)
CRYSTAL_MID = "#D9CCF2"
CRYSTAL_DK = "#B8A6DE"
VIOLET = "#6A5A8A"       # the crystal's deep violet and the outcrop
VIOLET_DK = "#544870"
ROCK_V = "#5C5468"       # dark violet-grey rock
ROCK_V_LT = "#6E6680"
ROCK_V_DK = "#4A4356"
GLOW_V = "#E7DCFF"       # the lit facet strips (unshaded)
CORE_GLOW = "#FFFFFF"
C_CRACK = "#2E2640"
CS = (-92.0, 26.0)       # the spire's axis (the Spire's)


def hexcyl(g, p0, p1, r, r1=None, bevel=0.6, segs=6, rot=(0, 0, 30), squash=(1, 1)):
    """common.cyl with a rotation about its axis (a hexagonal plinth turned to show a facet)."""
    from mathutils import Vector
    r1 = r if r1 is None else r1
    L = (Vector(p1) - Vector(p0)).length
    b = min(bevel, L / 4, r * 0.5)
    prof = [(0, 0), (max(0.01, r - b), 0), (r, b), (r1, L - b), (max(0.01, r1 - b), L), (0, L)]
    return g.lathe(prof, p0, p1, segs, rot=rot, squash=squash)


def facet_prism(rig, joint, base, tip, r, colors, facets=6, twist=0.0, tip_len=0.3, glow=None, open_front=False):
    """A big crystal whose facets alternate two or three tones (faceted, not round), from base toward tip;
    `glow` adds a lit strip along its camera-facing edge (unshaded)."""
    L = math.dist(base, tip)
    d = tuple((tip[i] - base[i]) / L for i in range(3))
    # build it facet by facet: each a slab-like wedge from the axis, so each tone is its own part
    geos = [Geo() for _ in colors]
    prof = [(0.0, -1.0), (r * 0.84, -1.0), (r, 0.0), (r * 0.9, L * (1.0 - tip_len)), (0.0, L)]
    g = Geo().lathe(prof, base, tip, segs=facets, rot=(0, 0, twist))
    rig.part(joint, g, colors[0], finish="gloss", outline_hex=VIOLET)
    # lighter facet panels laid on alternate faces (they catch the light), a little proud of the prism
    for k in range(facets):
        if k % 2:
            continue
        a = math.radians(twist + 360.0 * (k + 0.5) / facets)
        # a point on that face, toward the camera only (y < axis)
        n = (math.cos(a), math.sin(a))
        if n[1] > 0.35 or (open_front and n[1] < -0.8):
            continue
        g2 = geos[(k // 2) % len(geos)]
        # the face's centre line, offset out along the face normal (perpendicular to the axis)
        ux, uy = n
        for t0, t1 in ((0.06, 0.62),):
            p0 = tuple(base[i] + d[i] * L * t0 for i in range(3))
            p1 = tuple(base[i] + d[i] * L * t1 for i in range(3))
            off = r * 0.9
            g2.capsule((p0[0] + ux * off, p0[1] + uy * off, p0[2]), (p1[0] + ux * off * 0.95, p1[1] + uy * off * 0.95, p1[2]), r * 0.22, r * 0.16,
                       segs=6, rings=1)
    for g2, c in zip(geos[1:], colors[1:]):
        rig.part(joint, g2, c, finish="gloss", outline=0)
    if glow:
        p0 = tuple(base[i] + d[i] * L * 0.1 for i in range(3))
        p1 = tuple(base[i] + d[i] * L * 0.66 for i in range(3))
        g3 = Geo().capsule((p0[0] - r * 0.3, p0[1] - r * 0.86, p0[2]), (p1[0] - r * 0.28, p1[1] - r * 0.8, p1[2]), r * 0.12, r * 0.08, segs=6, rings=1)
        rig.part(joint, g3, glow=glow, outline=0)


def crystal_slab(rig, joint, m, r=(24.0, 18.0), t=6.0, seed=0):
    """A floating crystal slab whose flat top is exactly at the mount m: a hexagonal plate of crystal with a
    lit rim and a few small crystals hanging under it, tethered by a thin beam of light."""
    x, y, z = m
    rx, ry = r
    g = Geo()
    cyl(g, (x - 1, y + 4, z - t), (x - 1, y + 4, z), rx, rx + 1.0, bevel=1.0, segs=6, squash=(1.0, ry / rx))
    rig.part(joint, g, CRYSTAL_MID, finish="gloss", outline_hex=VIOLET)
    g = Geo()
    cyl(g, (x - 1, y + 4, z - 0.8), (x - 1, y + 4, z), rx + 0.6, rx + 1.2, bevel=0.3, segs=6, squash=(1.0, ry / rx))
    rig.part(joint, g, CRYSTAL, finish="gloss", outline=0.3)
    g = Geo()
    rnd = random.Random(seed)
    for k in range(3):
        bx = x - 1 + rnd.uniform(-rx * 0.5, rx * 0.5)
        crystal_prism(g, (bx, y + 2, z - t + 1), (bx + rnd.uniform(-3, 3), y + 1, z - t - rnd.uniform(9, 15)), rnd.uniform(2.4, 3.6))
    rig.part(joint, g, CRYSTAL_DK, finish="gloss", outline_hex=VIOLET)
    g = Geo()
    cyl(g, (x - 1, y + 4, z - t - 1.6), (x - 1, y + 4, z - t - 0.4), rx * 0.62, bevel=0.2, segs=6, squash=(1.0, ry / rx))
    rig.part(joint, g, glow=GLOW_V, outline=0)


def build_crystal(rig, M):
    for j, pos in (("tip", (CS[0], CS[1], 236)), ("shards", (CS[0], CS[1], 280)), ("sideL", (CS[0] - 46, CS[1] - 6, 60)),
                   ("sideR", (CS[0] + 40, CS[1] - 10, 40)), ("strut", (0, 0, 0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "dim", "fire1", "scorch", "breach", "fire2", "stump",
              "tipfallen", "sparks1"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # the outcrop: dark violet rock with facets, crystals breaking out of it
    g = Geo()
    from world.common import rock
    rock(g, (CS[0] + 2, CS[1] + 2, 16), (70, 50, 26), seed=201, jag=0.16, cuts=3)
    rig.part("body", g, ROCK_V)
    g = Geo()
    rock(g, (CS[0] - 44, CS[1] - 10, 24), (30, 28, 26), seed=202, jag=0.18, cuts=3)
    rock(g, (CS[0] + 40, CS[1] - 8, 14), (26, 24, 16), seed=203, jag=0.18, cuts=3)
    rig.part("body", g, ROCK_V_LT)
    g = Geo()
    for x, y, z, r in ((CS[0] - 20, CS[1] - 44, 8, 10), (CS[0] + 18, CS[1] - 42, 6, 8), (CS[0] - 58, CS[1] - 30, 10, 9)):
        rock(g, (x, y, z), (r, r * 0.8, r * 0.7), seed=int(-x * 3 + z), jag=0.2, cuts=3)
    rig.part("body", g, ROCK_V_DK)

    # the great crystal with two flanking crystals; its heart, a team-coloured facet on its front, glows
    # through a cleft framed by the crystal's edges
    facet_prism(rig, "body", (CS[0] - 34, CS[1] + 10, 28), (CS[0] - 60, CS[1] + 8, 214), 17.0, [CRYSTAL_MID, CRYSTAL_DK], facets=6,
                twist=10.0, tip_len=0.3, glow=GLOW_V)
    facet_prism(rig, "body", (CS[0] + 26, CS[1] + 10, 24), (CS[0] + 44, CS[1] + 8, 174), 14.0, [CRYSTAL_MID, CRYSTAL_DK], facets=6,
                twist=-10.0, tip_len=0.32, glow=GLOW_V)
    facet_prism(rig, "body", (CS[0] - 2, CS[1] + 4, 24), (CS[0] - 4, CS[1] + 2, 236), 32.0, [CRYSTAL, CRYSTAL_MID, CRYSTAL_DK], facets=6,
                twist=0.0, tip_len=0.18, glow=None, open_front=True)
    fy0 = CS[1] + 4 - 32.0 * math.cos(math.radians(30)) - 1.4
    g = Geo().slab([(CS[0] - 16, 40), (CS[0] + 12, 40), (CS[0] + 7, 206), (CS[0] - 11, 206)], fy0, 1.6)
    rig.part("body", g, team=True)
    for sx in (-1, 1):
        g = Geo().slab([(CS[0] - 2 + sx * 14, 36), (CS[0] - 2 + sx * 21, 40), (CS[0] - 2 + sx * 13, 208), (CS[0] - 2 + sx * 9, 210)],
                       fy0 - 1.6, 2.6)
        rig.part("body", g, CRYSTAL_MID, finish="gloss", outline_hex=VIOLET)
    g = Geo().capsule((CS[0] - 2, fy0 - 2.2, 58), (CS[0] - 2, fy0 - 2.2, 186), 1.6, 1.0, segs=6, rings=1)
    rig.part("body", g, glow=CORE_GLOW, outline=0)
    g = Geo()
    for z in (84, 128, 166):
        g.sphere((CS[0] - 2, fy0 - 2.6, z), 2.4, cuts=2)
    rig.part("body", g, glow=CORE_GLOW, outline=0)
    # the tip (snapped at 25%)
    facet_prism(rig, "tip", (CS[0] - 4, CS[1] + 2, 228), (CS[0] - 6, CS[1] + 0, 314), 21.0, [CRYSTAL, CRYSTAL_MID], facets=6, twist=0.0,
                tip_len=0.4, glow=GLOW_V)
    g = Geo()
    hexcyl(g, (CS[0] - 4, CS[1] + 2, 226), (CS[0] - 4, CS[1] + 2, 232), 28.0, 24.0, bevel=0.6)
    rig.part("tip", g, VIOLET, finish="gloss", outline=0.5)

    # side crystals round the great one (the left cluster is lost at 75%)
    g, gl = Geo(), Geo()
    crystal_cluster(g, gl, (CS[0] - 44, CS[1] - 12, 40), [(112, 14, 74, 11.0), (138, 22, 46, 8.0), (94, 28, 40, 7.0)], seed=11)
    rig.part("sideL", g, CRYSTAL_MID, finish="gloss", outline_hex=VIOLET)
    rig.part("sideL", gl, glow=GLOW_V, outline=0)
    g, gl = Geo(), Geo()
    crystal_cluster(g, gl, (CS[0] + 38, CS[1] - 12, 26), [(68, 16, 62, 10.0), (46, 24, 38, 7.0), (88, 30, 34, 6.4)], seed=12)
    rig.part("sideR", g, CRYSTAL_MID, finish="gloss", outline_hex=VIOLET)
    rig.part("sideR", gl, glow=GLOW_V, outline=0)
    g, gl = Geo(), Geo()
    crystal_cluster(g, gl, (CS[0] - 22, CS[1] - 40, 6), [(96, 30, 30, 6.0), (70, 36, 20, 4.6), (124, 34, 18, 4.2)], seed=13)
    crystal_cluster(g, gl, (CS[0] - 62, CS[1] - 22, 14), [(118, 26, 26, 5.4), (92, 34, 16, 4.0)], seed=14)
    rig.part("body", g, CRYSTAL_DK, finish="gloss", outline_hex=VIOLET)
    rig.part("body", gl, glow=GLOW_V, outline=0)
    # violet veins in the rock
    g = Geo()
    for pts in (((CS[0] - 30, CS[1] - 46, 6), (CS[0] - 16, CS[1] - 46, 22), (CS[0] - 6, CS[1] - 46, 30)),
                ((CS[0] + 30, CS[1] - 34, 4), (CS[0] + 24, CS[1] - 36, 18))):
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 1.2, 0.8, segs=6, rings=1)
    rig.part("body", g, glow="#B9A2EE", outline=0)

    # floating shards round the tip (static; the glints play over them)
    g, gl = Geo(), Geo()
    rnd = random.Random(21)
    for k in range(9):
        a = math.radians(-175 + k * 40 + rnd.uniform(-8, 8))
        rr = 38.0 + rnd.uniform(-4, 6)
        z = 258 + math.sin(a * 2.0) * 16 + rnd.uniform(-6, 6)
        x, y = CS[0] - 4 + math.cos(a) * rr, CS[1] + math.sin(a) * rr * 0.7
        if y > CS[1] + 8:
            continue
        L = rnd.uniform(16, 24)
        tilt = rnd.uniform(-35, 35)
        crystal_prism(g, (x, y, z - L * 0.5), (x + math.sin(math.radians(tilt)) * L, y, z + L * 0.5), rnd.uniform(4.0, 5.6))
        gl.capsule((x - 0.8, y - 3.6, z - L * 0.3), (x - 0.2, y - 3.6, z + L * 0.2), 0.9, segs=6, rings=1)
    rig.part("shards", g, CRYSTAL, finish="gloss", outline_hex=VIOLET)
    rig.part("shards", gl, glow=GLOW_V, outline=0)

    # the gate: a crystal arch over a glowing team portal at the foot
    g = Geo()
    hexcyl(g, (-30, -34, 0), (-30, -34, 12), 16, 13, bevel=1.2)
    rig.part("body", g, ROCK_V_DK)
    g = Geo()
    hexcyl(g, (-30, -34, 11), (-30, -34, 15), 13.5, bevel=0.6)
    rig.part("body", g, team=True)
    g = Geo()
    crystal_prism(g, (-30, -34, 14), (-30, -34, 40), 8.0)
    rig.part("body", g, CRYSTAL, finish="gloss", outline_hex=VIOLET)
    g = Geo().capsule((-32, -42, 18), (-31, -42, 32), 1.4, 0.8, segs=6, rings=1)
    rig.part("body", g, glow=CORE_GLOW, outline=0)

    # floating crystal slabs at the mounts (the lowest stands on a crystal pillar)
    x, y, z = M[0]
    g = Geo()
    crystal_prism(g, (x - 4, y + 10, 0), (x - 4, y + 10, z - 8), 7.0)
    rig.part("body", g, CRYSTAL_DK, finish="gloss", outline_hex=VIOLET)
    for i, m in enumerate(M):
        crystal_slab(rig, "strut" if i == 2 else "body", m, r=(24.0, 18.0), seed=31 + i)
    # light tethers from the slabs back to the crystal
    g = Geo()
    for m in M[1:]:
        g.capsule((m[0] - 14, m[1] + 8, m[2] - 4), (CS[0] + 4, CS[1] - 14, m[2] - 10), 0.8, segs=6, rings=1)
    rig.part("body", g, glow=GLOW_V, outline=0)

    # damage: cracks; a dimmed core (75%: sparks); violet plasma in a broken facet (50%); a breach in the
    # outcrop and the tip snapped to a jagged stump, lying in the rubble (25%)
    chipped_cracks(rig, "crack1", [[(CS[0] - 16, CS[1] - 36, 120), (CS[0] - 10, CS[1] - 36, 108), (CS[0] - 16, CS[1] - 36, 96)],
                                   [(CS[0] + 12, CS[1] - 32, 180), (CS[0] + 16, CS[1] - 32, 170)]], C_CRACK, CRYSTAL, w=1.6)
    chipped_cracks(rig, "crack2", [[(CS[0] - 22, CS[1] - 38, 60), (CS[0] - 16, CS[1] - 38, 48), (CS[0] - 22, CS[1] - 38, 36)],
                                   [(CS[0] + 18, CS[1] - 34, 130), (CS[0] + 22, CS[1] - 34, 118)]], C_CRACK, CRYSTAL, w=1.6)
    chipped_cracks(rig, "crack3", [[(CS[0] - 6, CS[1] - 30, 214), (CS[0] - 1, CS[1] - 30, 204), (CS[0] - 6, CS[1] - 30, 192)],
                                   [(CS[0] + 26, CS[1] - 40, 40), (CS[0] + 30, CS[1] - 40, 30)]], C_CRACK, CRYSTAL, w=1.6)
    g = Geo().star((CS[0] + 14, CS[1] - 40, 150), 6.0, 2.2, 1.0, points=5, rot=(90, 0, 0))
    rig.part("sparks1", g, glow="#FFFFFF", outline=0.6, outline_hex="#B9A2EE")
    g = Geo().capsule((CS[0] - 2, CS[1] - 33.6, 60), (CS[0] - 2, CS[1] - 33.6, 176), 1.8, 1.2, segs=6, rings=1)
    rig.part("dim", g, VIOLET, outline=0)
    from world.base_cosmic import plasma as violet_plasma
    violet_plasma(rig, "fire1", [(CS[0] + 16, CS[1] - 40, 100, 1.4)])
    g = Geo()
    g.slab(_jagged(CS[0] + 16, 116, 9.0, 10.0, seed=3, amp=0.35), CS[1] - 37.0, 0.8)
    rig.part("scorch", g, "#3A3050", outline=0, highlight=False)
    bx, bz = CS[0] + 20, 18
    g = Geo().slab(_jagged(bx, bz, 16.0, 13.0, seed=5, amp=0.3), CS[1] - 50, 2.4)
    rig.part("breach", g, ROCK_V_LT, outline=0.6)
    g = Geo().slab(_jagged(bx, bz - 1.0, 11.0, 9.0, seed=6, amp=0.3), CS[1] - 51.4, 1.0)
    rig.part("breach", g, HOLE, outline=0, highlight=False)
    violet_plasma(rig, "fire2", [(bx - 4.0, CS[1] - 54, bz - 8.0, 1.2)])
    g = Geo()
    zt = 230.0
    pts = []
    for k in range(9):
        a = math.radians(-160 + 140 * k / 8)
        pts.append((CS[0] - 4 + 22 * math.cos(a), zt + (7.0 if k % 2 else -3.0)))
    g.slab([(CS[0] - 26, zt - 8.0)] + pts + [(CS[0] + 18, zt - 8.0)], CS[1] - 20, 4.0)
    rig.part("stump", g, CRYSTAL_MID, finish="gloss", outline_hex=VIOLET)
    violet_plasma(rig, "stump", [(CS[0] - 2, CS[1] - 24, zt - 2.0, 1.3)])
    g = Geo()
    crystal_prism(g, (16.0, -54.0, 8.0), (-48.0, -62.0, 14.0), 14.0)
    rig.part("tipfallen", g, CRYSTAL, finish="gloss", outline_hex=VIOLET)
    rubble(rig, "rubble1", [(-158, -40), (-136, -48)], ROCK_V, seed=3)
    rubble(rig, "rubble2", [(-96, -56), (-64, -58)], ROCK_V_LT, seed=13)
    rubble(rig, "rubble3", [(-152, -58), (-120, -60), (18, -56)], ROCK_V, seed=23, size=1.2)
    for j, pts2 in (("rubble1", [(-148, -50)]), ("rubble2", [(-82, -62), (-56, -62)]), ("rubble3", [(-140, -66), (6, -62)])):
        g = Geo()
        for x2, y2 in pts2:
            crystal_prism(g, (x2, y2, 0.5), (x2 + 3, y2 - 1, 9), 2.6)
            crystal_prism(g, (x2 + 7, y2 - 2, 0.5), (x2 + 5, y2 - 3, 6), 2.0)
        rig.part(j, g, CRYSTAL_MID, finish="gloss", outline_hex=VIOLET)

    flag(rig, "root", "flagA", (CS[0] - 30, CS[1] + 6, 300), length=30, height=16, pole=230, pole_color=VIOLET, finial="#E7DCFF")
    flag(rig, "root", "flagB", (-150, 34, 140), length=24, height=14, pole=14, pole_color=VIOLET, finial="#E7DCFF")

    # Treasury: crystal shards in a crate (1), a violet geode (2), a crystal-capped vault (3)
    g = Geo()
    box(g, (-154, -58, 6), (10, 7, 6), p=5)
    rig.part("treasury1", g, ROCK_V_DK)
    g = Geo()
    for dx, h in ((-5, 10), (0, 14), (5, 9)):
        crystal_prism(g, (-154 + dx, -58, 10), (-154 + dx * 1.4, -58, 10 + h), 2.6)
    rig.part("treasury1", g, CRYSTAL, finish="gloss", outline_hex=VIOLET)
    g = Geo()
    rock(g, (-130, -62, 8), (11, 9, 8), seed=211, jag=0.15)
    rig.part("treasury2", g, ROCK_V)
    g = Geo()
    for dx, a in ((-4, 110), (0, 90), (4, 70)):
        crystal_prism(g, (-130 + dx, -68, 8), (-130 + dx + math.cos(math.radians(a)) * 12, -70, 8 + math.sin(math.radians(a)) * 12), 2.4)
    rig.part("treasury2", g, glow="#C9B4FF", outline=0.6, outline_hex=VIOLET)
    g = Geo()
    box(g, (-104, -64, 10), (10, 10, 10), p=5, rot=(0, 0, 20))
    rig.part("treasury3", g, VIOLET_DK, finish="metal")
    g = Geo()
    crystal_prism(g, (-104, -64, 20), (-104, -64, 36), 6.4)
    rig.part("treasury3", g, CRYSTAL, finish="gloss", outline_hex=VIOLET)


def crumble_crystal(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "sideL": {"hide": True}, "rubble1": {"show": True}, "sparks1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "dim": {"show": True}, "sparks1": {"hide": True}, "tip": {"r": 10.0, "x": -4.0, "z": -5.0},
                     "shards": {"z": -14.0, "r": 6.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "tip": {"hide": True}, "shards": {"hide": True},
                     "breach": {"show": True}, "fire2": {"show": True}, "stump": {"show": True}, "tipfallen": {"show": True},
                     "sideR": {"r": -12.0, "x": 4.0, "z": -4.0}})
    return pose


CRYSTAL_SPIRE = base_module(
    "future", "Crystal Spire", height=330, width=180, canvas=(470, 740), feet=(360, 690),
    build=build_crystal, crumble=crumble_crystal, mount_depth=DEPTHS, skin="crystal_spire",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-30, -44, 30), 3, 30), ((CS[0] - 2, CS[1] - 36, 120), 2, 30), ((CS[0] - 4, CS[1] - 22, 280), 2, 24),
            ((CS[0] - 44, CS[1] - 30, 90), 0, 20), ((CS[0] + 40, CS[1] - 30, 70), 2, 20)],
    smoke=[((CS[0], CS[1], 244), 2), ((CS[0] - 20, -10, 90), 3), ((-40, -20, 30), 3)],
    horn=(-110, 350), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "energy",
        # the great crystal falls toward the lane in one piece, the side crystals after it
        "topple": [topple_lu(-130, -40, 130, delay_ms=0, push=1.1, sink_lu=26),
                   topple_lu(-60, 0, 60, delay_ms=180, push=0.7, sink_lu=14)],
        "rubbleColors": [CRYSTAL_MID, ROCK_V, CRYSTAL, VIOLET],
        "dustColor": "#D6CCEE",
        "aura": "legendary",
        "ambientLu": [ambient_lu("glints", (CS[0] - 4, CS[1] - 10, 270), 40, 1.6, color="#F4EEFF"),
                      ambient_lu("stars", (CS[0] - 2, CS[1] - 30, 160), 30, 0.8, color="#F0E8FF"),
                      ambient_lu("glints", (CS[0] - 44, CS[1] - 20, 90), 22, 0.6, color="#F4EEFF"),
                      ambient_lu("glints", (CS[0] + 40, CS[1] - 20, 60), 22, 0.6, color="#F4EEFF")],
    },
)

SKINS = [MIDNIGHT_NEON, CRYSTAL_SPIRE]
