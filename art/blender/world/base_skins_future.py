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

from mathutils import Matrix, Vector

from ageborn_art.geometry import Geo

from world.base_skins_kit import crystal_cluster, crystal_prism, flames
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, prop_loop, rubble,
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


# The orbiting shards (round 3, PLAN 2c "Shard orbit (`prop` loop)"): SHARD_N identical crystals evenly spaced
# on a tilted ring round the top of the great crystal, under its tip. The ring sits between the turret mounts
# (over the second turret's head, under the top platform) and low enough to stay below the battle HUD on a phone;
# the loop turns it by one spacing (SHARD_FRAMES steps), so the last frame flows into the first. Each shard
# keeps its face to the ring (it turns with its angle), so a shard's look depends only on where it is on it.
SHARD_N = 6
SHARD_STEP = 360.0 / SHARD_N
SHARD_FRAMES = 12
SHARD_MS = 130
SHARD_A0 = -100.0
SHARD_C = (CS[0] - 4, CS[1], 196.0)
SHARD_R = 43.0
SHARD_FILL = "#B39BEA"   # a deeper lilac than the spire, so the shards read against it (accent-sized, A11)


def shard_at(a_deg):
    """The centre of a shard at ring angle a (character space): a tilted ellipse (deeper than it is wide in y,
    as the spire's footprint), highest on the lane side, where it passes over the second turret's head."""
    a = math.radians(a_deg)
    cx, cy, cz = SHARD_C
    return (cx + SHARD_R * math.cos(a), cy + SHARD_R * 0.7 * math.sin(a), cz + 9.0 * math.cos(a))


def _placed(g, c, a_deg):
    """Moves geometry built at the origin for ring angle 0 to ring angle a: turned about the vertical by a
    and set at c. The loop's pose turns and moves the shard's joint the same way, so frame by frame each
    shard is exactly the shape the next one has at the start (the loop closes without a jump)."""
    m = Matrix.Translation(Vector(c)) @ Matrix.Rotation(math.radians(a_deg), 4, "Z")
    for v in g.bm.verts:
        v.co = m @ v.co
    return g


def shard_geo(rig, joint, c, a_deg):
    """One orbiting shard at centre c for ring angle a. Built at angle 0 (outward +x, travelling +y): a slender
    crystal leaning into its travel, a lit strip on its outward facet (it catches the light as the shard swings
    to the front) and a glowing core spark; soft interior lines, so a small shard stays clean at lane size."""
    lean = math.radians(22.0)
    L = 23.0
    uy, uz = math.sin(lean), math.cos(lean)
    g, gt, gl, gc = Geo(), Geo(), Geo(), Geo()
    crystal_prism(g, (0.0, -uy * L * 0.5, -uz * L * 0.5), (0.0, uy * L * 0.5, uz * L * 0.5), 4.6, tip_len=0.38)
    # the point lit from within (it reads as crystal, not stone, against the pale spire)
    crystal_prism(gt, (0.0, uy * L * 0.12, uz * L * 0.12), (0.0, uy * L * 0.53, uz * L * 0.53), 3.2, tip_len=0.6)
    gl.capsule((3.9, -uy * 7.0, -uz * 7.0), (3.4, uy * 4.0, uz * 4.0), 1.1, 0.7, segs=6, rings=1)
    gc.sphere((0.8, 0.0, -1.6), 1.7, cuts=2)
    for geo in (g, gt, gl, gc):
        _placed(geo, c, a_deg)
    rig.part(joint, g, SHARD_FILL, finish="gloss", outline=0.6, outline_hex=VIOLET)
    rig.part(joint, gt, glow=GLOW_V, outline=0)
    rig.part(joint, gl, glow=GLOW_V, outline=0)
    rig.part(joint, gc, glow=CORE_GLOW, outline=0)


def shard_pose(f):
    """Frame f of the orbit: every shard moved SHARD_STEP / SHARD_FRAMES further round the ring (and turned
    with it)."""
    d = SHARD_STEP * f / SHARD_FRAMES
    pose = {}
    for k in range(SHARD_N):
        a = SHARD_A0 + k * SHARD_STEP
        p0, p1 = shard_at(a), shard_at(a + d)
        pose[f"shard{k}"] = {"x": p1[0] - p0[0], "y": p1[1] - p0[1], "z": p1[2] - p0[2], "rz": d}
    return pose


def build_crystal(rig, M):
    for j, pos in (("tip", (CS[0], CS[1], 236)), ("sideL", (CS[0] - 46, CS[1] - 6, 60)),
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

    # the crystal shards orbiting the tip: a `prop` loop (round 3), one joint per shard under root
    for k in range(SHARD_N):
        a = SHARD_A0 + k * SHARD_STEP
        c = shard_at(a)
        rig.joint(f"shard{k}", "root", c)
        shard_geo(rig, f"shard{k}", c, a)

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
                     "dim": {"show": True}, "sparks1": {"hide": True}, "tip": {"r": 10.0, "x": -4.0, "z": -5.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "tip": {"hide": True},
                     "breach": {"show": True}, "fire2": {"show": True}, "stump": {"show": True}, "tipfallen": {"show": True},
                     "sideR": {"r": -12.0, "x": 4.0, "z": -4.0}})
    return pose


CRYSTAL_SPIRE = base_module(
    "future", "Crystal Spire", height=330, width=180, canvas=(470, 740), feet=(360, 690),
    build=build_crystal, crumble=crumble_crystal, mount_depth=DEPTHS, skin="crystal_spire",
    # the shards orbit the tip (round 3): drawn over the body, cut away where the crystal stands in front of them;
    # gone with the tip at 25%
    props=[prop_loop("shards", [f"shard{k}" for k in range(SHARD_N)], SHARD_FRAMES, shard_pose, ms=SHARD_MS, crumble=(0, 2),
                     z="front", hold=0, anchor=SHARD_C, occlude=["body"], outline=(2.0, 0.6, 0.56))],
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



# ---------------------------------------------------------------------------------------------------
# Bio-Dome Arcology (round 3; Rare, Time Capsule): a tower of stacked glass bio-domes with trees inside. A white
# plinth with vertical gardens and the gate; four domes of falling size on terrace rings round a white core, each a
# geodesic frame of white struts over grey-teal back panes (low saturation, never blue), a glazed cap, trees and
# shrubs growing inside; a mast over the top dome with two small wind turbines (the `turbines` prop loop: three
# blades, six steps of 20 degrees, an exact loop) and a beacon. The mounts are the age's hovering discs on struts.
# Team colour: the terrace edge bands, two light panels on the plinth, the gate door and the flags. Code ambient:
# leaf motes, glints on the glass.
#
# Crumble: 75% cracked panes, the beacon out, rubble; 50% a plasma breach in the plinth, a dome's frame broken
# with a pane shattered, soot; 25% the third dome smashed and askew, the mast bent (the turbines gone), a fire
# among the trees, a ragged breach.

BD_WHITE = "#D8DCE1"
BD_WHITE_LT = "#E6E9EC"
BD_WHITE_DK = "#B4BAC2"
BD_GLASS = "#A3B9B6"          # grey-teal back panes, low saturation
BD_GLASS_LT = "#C3D3D0"
BD_GLASS_DK = "#869E9A"
BD_LEAF = "#5C8E4C"
BD_LEAF_LT = "#74A45E"
BD_LEAF_DK = "#46713C"
BD_TRUNK = "#6A5644"
BD_GREENWALL = "#5F8A4E"
BD_SOIL = "#6E5B47"
BD_MINT = "#3AF0B4"
BD_MINT_CORE = "#D6FFF1"
BD_CRACK = "#2A2E36"
BD_DEPTHS = [-40, -24, -40, -24]
BD_AX = (-88.0, 18.0)
# terrace rings and domes: (ring radius, ring z0, ring z1, dome radius, dome height)
BD_TIERS = [(66.0, 30.0, 36.0, 58.0, 50.0), (52.0, 86.0, 92.0, 45.0, 40.0), (40.0, 132.0, 138.0, 33.0, 30.0), (28.0, 168.0, 173.0, 22.0, 20.0)]
BD_MAST0, BD_MAST1 = 193.0, 318.0
BD_TURBINES = [(-104.0, 6.0, 246.0), (-72.0, 6.0, 278.0)]
BD_BLADE_R = 12.0
BD_TURB_FRAMES, BD_TURB_MS = 6, 90


def bd_tree(g_trunk, g_dk, g_md, g_lt, x, y, z, k=1.0, seed=0):
    """A small tree inside a dome: a trunk and a round three-blob crown."""
    rnd = random.Random(seed)
    g_trunk.capsule((x, y, z), (x + rnd.uniform(-1, 1), y, z + 10.0 * k), 1.4 * k, 1.0 * k, segs=8, rings=1)
    for dx, dz, r in ((-4.0, 12.0, 6.0), (4.0, 13.0, 6.4), (0.0, 18.0, 6.8)):
        c = (x + dx * k, y, z + dz * k)
        g_dk.blob((c[0] + 0.6, c[1] + 1.6, c[2] - 1.4 * k), (r * k * 1.05, r * k * 0.85, r * k * 0.8), p=2.2, cuts=3)
        g_md.blob(c, (r * k, r * k * 0.8, r * k * 0.75), p=2.2, cuts=3)
        g_lt.blob((c[0] - r * 0.3 * k, c[1] - r * 0.5 * k, c[2] + r * 0.3 * k), (r * 0.45 * k, r * 0.3 * k, r * 0.32 * k), p=2.2, cuts=2)


def bd_dome(rig, joint, c, r, h, seed=0, trees=3):
    """One bio-dome: a geodesic frame of white struts, grey-teal panes over its back half seen from inside, a glazed
    cap, a couple of front reflections, and trees on its floor."""
    cx, cy, z0 = c

    def P(a, t, rr=r):
        el = t * math.pi / 2
        return (cx + rr * math.cos(el) * math.cos(a), cy + rr * math.cos(el) * math.sin(a) * 0.9, z0 + h * math.sin(el))
    # the back panes: the far half of a thin shell (its inside faces the camera)
    shell = Geo()
    prof = [(0.0, 0.0)] + [((r - 1.4) * math.cos(t * math.pi / 2), (h - 1.4) * math.sin(t * math.pi / 2)) for t in (i / 10 for i in range(11))]
    shell.lathe(prof, (cx, cy, z0), (cx, cy, z0 + h), segs=40, squash=(1.0, 0.9))
    shell.clip((cx, cy + 2.0, z0), (0, -1, 0))
    rig.part(joint, shell, BD_GLASS, finish="gloss", outline=0)
    # trees and shrubs on the floor (before the frame, so the frame reads in front of them)
    tr, dk, md, lt = Geo(), Geo(), Geo(), Geo()
    rnd = random.Random(seed)
    for i in range(trees):
        x = cx - r * 0.55 + r * 1.1 * (i + 0.5) / trees + rnd.uniform(-2, 2)
        k = (0.9 + 0.35 * rnd.random()) * min(1.3, h / 36.0)
        bd_tree(tr, dk, md, lt, x, cy + rnd.uniform(-2, 8), z0, k=k, seed=seed * 7 + i)
    # a row of round shrubs along the front of the floor, so the dome reads green from its rim up
    nb = max(3, int(r / 9))
    for i in range(nb):
        a = math.radians(200 + 140 * (i + 0.5) / nb)
        bx_, by_ = cx + r * 0.72 * math.cos(a), cy + r * 0.72 * 0.9 * math.sin(a)
        rr_ = (3.6 + 1.6 * rnd.random()) * min(1.2, h / 36.0)
        dk.blob((bx_ + 0.5, by_ + 1.2, z0 + rr_ * 0.6), (rr_ * 1.15, rr_ * 0.9, rr_ * 0.8), p=2.2, cuts=3)
        md.blob((bx_, by_, z0 + rr_ * 0.75), (rr_, rr_ * 0.8, rr_ * 0.75), p=2.2, cuts=3)
        lt.blob((bx_ - rr_ * 0.3, by_ - rr_ * 0.5, z0 + rr_), (rr_ * 0.42, rr_ * 0.3, rr_ * 0.3), p=2.2, cuts=2)
    rig.part(joint, tr, BD_TRUNK, outline=0.4)
    rig.part(joint, dk, BD_LEAF_DK, finish="hair")
    rig.part(joint, md, BD_LEAF, finish="hair")
    rig.part(joint, lt, BD_LEAF_LT, finish="hair", outline=0.3)
    # the frame: meridians and parallels, a base ring
    fr = Geo()
    nm = 12
    for i in range(nm):
        a = 2 * math.pi * i / nm + seed * 0.1
        pts = [P(a, k / 8) for k in range(8)] + [(cx, cy, z0 + h)]
        for p0, p1 in zip(pts, pts[1:]):
            fr.capsule(p0, p1, 0.85, segs=6, rings=1)
    for t in (0.33, 0.62):
        pts = [P(2 * math.pi * i / 48, t) for i in range(49)]
        for p0, p1 in zip(pts, pts[1:]):
            fr.capsule(p0, p1, 0.75, segs=6, rings=1)
    pts = [P(2 * math.pi * i / 48, 0.0) for i in range(49)]
    for p0, p1 in zip(pts, pts[1:]):
        fr.capsule(p0, p1, 1.3, segs=6, rings=1)
    rig.part(joint, fr, BD_WHITE_LT, finish="gloss", outline=0.35)
    # the glazed cap and two reflections on the front glass
    cap = Geo()
    prof = [((r + 0.3) * math.cos(t * math.pi / 2), (h + 0.3) * math.sin(t * math.pi / 2)) for t in (0.8 + 0.2 * i / 4 for i in range(5))]
    prof = [(prof[0][0] - 1.2, prof[0][1])] + prof
    cap.lathe(prof, (cx, cy, z0), (cx, cy, z0 + h + 0.3), segs=40, squash=(1.0, 0.9))
    rig.part(joint, cap, BD_GLASS_LT, finish="gloss", outline=0.3)
    gl = Geo()
    for a0, a1, t in ((-2.25, -1.85, 0.5), (-2.05, -1.8, 0.28)):
        pts = [P(a0 + (a1 - a0) * i / 6, t + 0.12 * math.sin(math.pi * i / 6), r + 0.6) for i in range(7)]
        for p0, p1 in zip(pts, pts[1:]):
            gl.capsule(p0, p1, 0.7, segs=4, rings=1)
    rig.part(joint, gl, "#F4FBFA", outline=0, highlight=False)


def bd_ring(rig, joint, r, z0, z1, team_band=True):
    """A terrace ring round the core: a white disc with a team band round its edge and a soil bed on it."""
    cx, cy = BD_AX
    g = Geo()
    cyl(g, (cx, cy, z0), (cx, cy, z1), r, bevel=0.8, segs=48, squash=(1.0, 0.9))
    rig.part(joint, g, BD_WHITE)
    if team_band:
        g = Geo()
        g.lathe([(r - 0.2, 0.0), (r + 0.5, 0.4), (r + 0.5, (z1 - z0) * 0.55), (r - 0.2, (z1 - z0) * 0.6)], (cx, cy, z0 + (z1 - z0) * 0.2),
                (cx, cy, z1), segs=48, squash=(1.0, 0.9))
        rig.part(joint, g, team=True, outline=0.3)
    g = Geo()
    cyl(g, (cx, cy, z1 - 0.6), (cx, cy, z1 + 0.6), r - 6.0, bevel=0.4, segs=40, squash=(1.0, 0.9))
    rig.part(joint, g, BD_SOIL)


def bd_greenwall(rig, joint, x0, x1, y, z0, z1, seed=0):
    """A vertical garden panel: a green mat with leaf tufts in two greens."""
    rnd = random.Random(seed)
    g = Geo()
    box(g, ((x0 + x1) / 2, y, (z0 + z1) / 2), ((x1 - x0) / 2, 1.0, (z1 - z0) / 2), p=6, cuts=2)
    rig.part(joint, g, BD_GREENWALL, finish="hair")
    a_, b_ = Geo(), Geo()
    nx, nz = max(2, int((x1 - x0) / 5)), max(2, int((z1 - z0) / 5))
    for i in range(nx):
        for k in range(nz):
            if rnd.random() < 0.6:
                (a_ if (i + k) % 2 else b_).blob((x0 + (i + 0.5) * (x1 - x0) / nx + rnd.uniform(-1, 1), y - 1.2,
                                                  z0 + (k + 0.5) * (z1 - z0) / nz + rnd.uniform(-1, 1)), (2.2, 1.0, 1.8), p=2.2, cuts=2)
    rig.part(joint, a_, BD_LEAF_LT, finish="hair", outline=0.3)
    rig.part(joint, b_, BD_LEAF_DK, finish="hair", outline=0.3)


def bd_turbine_geo(hub):
    """A small wind turbine's rotor at hub (facing the camera): three slim white blades and a nose."""
    hx, hy, hz = hub
    g = Geo()
    for k in range(3):
        a = math.radians(90.0 + 120.0 * k)
        g.blob((hx + math.cos(a) * BD_BLADE_R * 0.55, hy - 1.4, hz + math.sin(a) * BD_BLADE_R * 0.55), (BD_BLADE_R * 0.5, 0.5, 1.6), p=2.0, cuts=3,
               rot=(0, -math.degrees(a), 0), taper=(1.0, 1.0))
    n = Geo().blob((hx, hy - 2.4, hz), (1.8, 2.6, 1.8), p=2.0, cuts=3)
    return g, n


def bd_turbines_pose(f):
    return {f"turbine{i}": {"r": 20.0 * f * (1 if i == 0 else -1)} for i in range(len(BD_TURBINES))}


def build_biodome(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachP", "shatter", "soot", "domeFire", "beaconOff",
              "mastBent", "dome3Broken"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("beacon", "body", (BD_AX[0], BD_AX[1], BD_MAST1))
    rig.joint("dome3", "body", (BD_AX[0], BD_AX[1], BD_TIERS[2][2]))
    rig.joint("mast", "body", (BD_AX[0], BD_AX[1], BD_MAST0))
    rig.joint("banner", "body", (-127.0, -36.0, 32.0))
    rig.joint("tear", "banner", (0, 0, 0), hidden=True)
    cx, cy = BD_AX

    # -- the plinth: white, chamfered, vertical gardens, two team light panels, the gate ----------------------
    g = Geo()
    box(g, (-70.0, 10.0, 15.0), (82.0, 38.0, 15.0), p=8)
    rig.part("body", g, BD_WHITE_DK)
    g = Geo()
    box(g, (-70.0, 9.4, 28.6), (82.6, 38.6, 1.6), p=6)
    rig.part("body", g, BD_WHITE_LT)
    for x0, x1 in ((-148.0, -134.0), (-104.0, -78.0), (-50.0, -30.0)):
        bd_greenwall(rig, "body", x0, x1, -28.6, 4.0, 25.0, seed=int(-x0))
    x = -64.0
    g = Geo()
    box(g, (x, -28.8, 15.0), (4.6, 0.8, 10.0), p=6, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    box(g, (x, -29.2, 15.0), (5.6, 0.6, 11.0), p=6, cuts=2)
    g.clip((x, -29.2, 15.0), (0, 1, 0))
    rig.part("body", g, BD_WHITE, outline=0.3)
    # a team banner hanging from the first terrace's front edge (torn at 50%, gone at 25%)
    g = Geo().slab([(-127.0, 32.0), (-113.0, 32.0), (-113.0, 10.0), (-120.0, 4.0), (-127.0, 10.0)], -36.0, 1.2)
    rig.part("banner", g, team=True, outline=0.45)
    g = Geo().capsule((-129.0, -36.8, 32.6), (-111.0, -36.8, 32.6), 1.2, segs=6, rings=1)
    rig.part("banner", g, BD_WHITE_LT, finish="metal", outline=0.35)
    g = Geo()
    for k in range(5):
        a = math.radians(90 + 72 * k)
        g.blob((-120.0 + math.cos(a) * 2.6, -37.0, 20.0 + math.sin(a) * 2.6), (1.8, 0.4, 1.2), p=2.0, cuts=2, rot=(0, -math.degrees(a), 0))
    rig.part("banner", g, BD_LEAF_LT, outline=0.25)
    g = Geo().slab([(-113.0, 24.0), (-118.0, 18.0), (-113.0, 12.0)], -37.4, 0.8)
    rig.part("tear", g, BD_WHITE_DK, outline=0, highlight=False)
    gx = -6.0
    pts = [(gx - 8.0, 0.0), (gx + 8.0, 0.0), (gx + 8.0, 16.0)]
    for i in range(1, 6):
        a = math.pi * i / 6
        pts.append((gx + 8.0 * math.cos(a), 16.0 + 8.0 * math.sin(a)))
    pts.append((gx - 8.0, 16.0))
    g = Geo().slab([(x + (1.4 if x > gx else -1.4), z + (1.4 if z > 8 else 0.0)) for x, z in pts], -28.6, 1.0)
    rig.part("body", g, glow=BD_MINT, outline=0)
    g = Geo().slab(pts, -29.2, 1.0)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    box(g, (gx, -29.8, 12.0), (0.4, 0.4, 11.0), p=4, cuts=1)
    rig.part("body", g, BD_WHITE_DK, outline=0)

    # -- the core: a white column with mint light strips and green walls between the domes --------------------
    g = Geo()
    cyl(g, (cx, cy, 30.0), (cx, cy, BD_MAST0), 10.0, 8.0, bevel=0.6, segs=24)
    rig.part("body", g, BD_WHITE)
    g = Geo()
    for z0_, z1_ in ((40.0, 80.0), (96.0, 126.0), (142.0, 162.0)):
        box(g, (cx, cy - 9.6, (z0_ + z1_) / 2), (1.2, 0.6, (z1_ - z0_) / 2), p=5, cuts=2)
    rig.part("body", g, glow=BD_MINT, outline=0)

    # -- the terraces and domes (the third is smashed at 25%) ---------------------------------------------
    for i, (rr, z0_, z1_, dr, dh) in enumerate(BD_TIERS):
        j = "dome3" if i == 2 else "body"
        bd_ring(rig, j, rr, z0_, z1_)
        bd_dome(rig, j, (cx, cy, z1_), dr, dh, seed=11 + i, trees=4 - min(i, 2))
    g = Geo()
    for k in range(7):
        a = math.radians(200 + k * 20)
        p0 = (cx + 34.0 * math.cos(a), cy + 30.0 * math.sin(a), BD_TIERS[2][2] + 6.0)
        g.capsule(p0, (p0[0] + 3.0, p0[1] - 2.0, p0[2] + 10.0 + (k % 3) * 4.0), 0.8, segs=4, rings=1)
    rig.part("dome3Broken", g, BD_WHITE_LT, outline=0.35)
    g = Geo()
    for k in range(5):
        a = math.radians(210 + k * 28)
        g.slab([(cx + 30.0 * math.cos(a) - 3.0, BD_TIERS[2][2] + 4.0), (cx + 30.0 * math.cos(a) + 3.0, BD_TIERS[2][2] + 3.0),
                (cx + 30.0 * math.cos(a) + 1.0, BD_TIERS[2][2] + 8.0)], cy + 30.0 * math.sin(a) * 0.9 - 1.0, 0.6)
    rig.part("dome3Broken", g, BD_GLASS_LT, outline=0.3)

    # -- the mast over the top dome: a white mast, turbine arms, a beacon (dark at 75%) ------------------------
    g = Geo()
    cyl(g, (cx, cy, BD_MAST0), (cx, cy, BD_MAST1), 3.0, 1.6, bevel=0.4, segs=16)
    rig.part("mast", g, BD_WHITE_LT, finish="metal")
    g = Geo()
    for hx, hy, hz in BD_TURBINES:
        g.capsule((cx, cy, hz - 2.0), (hx, hy + 4.0, hz), 1.1, 0.9, segs=6, rings=1)
        g.capsule((hx, hy + 6.0, hz), (hx, hy - 0.6, hz), 1.6, 1.2, segs=8, rings=1)
    rig.part("mast", g, BD_WHITE_DK, finish="metal", outline=0.4)
    g = Geo().sphere((cx, cy - 1.0, BD_MAST1 + 2.0), 2.6, cuts=2)
    rig.part("beacon", g, glow=BD_MINT, outline=0)
    g = Geo().sphere((cx, cy - 1.0, BD_MAST1 + 2.0), 2.6, cuts=2)
    rig.part("beaconOff", g, BD_WHITE_DK, outline=0.4)
    g = Geo()
    g.capsule((cx, cy, BD_MAST0), (cx - 8.0, cy, BD_MAST0 + 36.0), 2.6, 2.0, segs=8, rings=1)
    g.capsule((cx - 8.0, cy, BD_MAST0 + 36.0), (cx - 30.0, cy - 4.0, BD_MAST0 + 46.0), 2.0, 1.4, segs=8, rings=1)
    rig.part("mastBent", g, BD_WHITE_LT, finish="metal", outline=0.4)
    for i, hub in enumerate(BD_TURBINES):
        rig.joint(f"turbine{i}", "root", (hub[0], hub[1], hub[2]))
        blades, nose = bd_turbine_geo(hub)
        rig.part(f"turbine{i}", blades, BD_WHITE_LT, outline=0.35)
        rig.part(f"turbine{i}", nose, BD_WHITE_DK, finish="metal", outline=0.3)

    # -- the hovering disc mounts with struts back into the arcology ------------------------------------------
    for i, (x, y, z) in enumerate(M):
        anchor = (x - 4.0, y + 12.0, 2.0) if i == 0 else (cx + 18.0, cy - 20.0, z - 22.0)
        platform(rig, "body", (x, y, z), BD_WHITE_LT, BD_WHITE_DK, style="disc", r=(24, 18), t=5, depth_to=anchor, accent=BD_MINT)

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(-140.0, -29.0, 24.0), (-136.0, -29.0, 14.0)], [(-60.0, -29.0, 26.0), (-56.0, -29.0, 16.0)]], BD_CRACK, BD_WHITE_LT,
                   w=1.6)
    def on_dome(i, a, t, out=0.9):
        rr, z0_, z1_, dr, dh = BD_TIERS[i]
        el = t * math.pi / 2
        return (cx + (dr + out) * math.cos(el) * math.cos(a), cy + (dr + out) * math.cos(el) * math.sin(a) * 0.9, z1_ + (dh + out) * math.sin(el))

    def crack_lines(joint, i, lines):
        dark, chip = Geo(), Geo()
        for line in lines:
            pts = [on_dome(i, a, t, 1.1) for a, t in line]
            for a_, b_ in zip(pts, pts[1:]):
                dark.capsule(a_, b_, 0.75, segs=4, rings=1)
            pts = [on_dome(i, a + 0.03, t - 0.02, 0.9) for a, t in line]
            for a_, b_ in zip(pts, pts[1:]):
                chip.capsule(a_, b_, 0.6, segs=4, rings=1)
        rig.part(joint, chip, "#EEF6F4", outline=0, highlight=False)
        rig.part(joint, dark, BD_CRACK, outline=0, highlight=False)

    crack_lines("crack1", 0, [[(-2.15, 0.18), (-2.02, 0.3), (-2.14, 0.42), (-2.04, 0.56)], [(-2.02, 0.3), (-1.86, 0.36)]])
    crack_lines("crack1", 1, [[(-1.1, 0.2), (-1.22, 0.34), (-1.08, 0.48)]])
    crack_lines("crack2", 1, [[(-1.95, 0.22), (-1.82, 0.36), (-1.96, 0.5)], [(-1.82, 0.36), (-1.66, 0.3)]])
    crack_lines("crack3", 0, [[(-1.05, 0.15), (-1.18, 0.28), (-1.04, 0.4), (-1.16, 0.52)]])
    # 50%: a shattered pane in the big dome: a dark jagged hole with glass shards round it and a broken strut
    hc = on_dome(0, -1.78, 0.36, 1.2)
    rnd = random.Random(61)
    hole = [(hc[0] + math.cos(2 * math.pi * k / 11) * (8.0 if k % 2 else 5.2) * (0.85 + 0.3 * rnd.random()),
             hc[2] + math.sin(2 * math.pi * k / 11) * (7.0 if k % 2 else 4.6) * (0.85 + 0.3 * rnd.random())) for k in range(11)]
    rig.part("shatter", Geo().slab(hole, hc[1] - 0.4, 1.0), "#23292B", outline=0.5, outline_hex="#1A1E20")
    g = Geo()
    for k in range(0, 11, 2):
        px_, pz_ = hole[k]
        g.slab([(px_ - 2.2, pz_ - 1.2), (px_ + 2.2, pz_ - 0.6), (px_ + 0.4, pz_ + 2.6)], hc[1] - 1.2, 0.5)
    rig.part("shatter", g, BD_GLASS_LT, outline=0.3)
    g = Geo().capsule((hc[0] - 3.0, hc[1] - 1.6, hc[2] + 6.0), (hc[0] + 2.0, hc[1] - 2.4, hc[2] - 3.0), 0.9, segs=6, rings=1)
    rig.part("shatter", g, BD_WHITE_LT, outline=0.35)
    flames(rig, "shatter", [(hc[0], hc[1] - 3.0, hc[2] - 6.0, 0.6)], out="#C77BF0", body="#E7B8FF", core="#FFF2FF")
    chipped_cracks(rig, "crack2", [[(-100.0, -29.0, 26.0), (-96.0, -29.0, 14.0)]], BD_CRACK, BD_WHITE_LT, w=1.6)
    chipped_cracks(rig, "crack3", [[(-30.0, -29.0, 26.0), (-26.0, -29.0, 12.0)]], BD_CRACK, BD_WHITE_LT, w=1.6)
    bd_breach(rig, "breachP", -90.0, -28.6, 14.0, 22.0, 18.0, seed=51)
    flames(rig, "breachP", [(-90.0, -34.0, 6.0, 0.8)], out="#C77BF0", body="#E7B8FF", core="#FFF2FF")
    flames(rig, "domeFire", [(cx - 10.0, cy + 6.0, BD_TIERS[1][2] + 4.0, 0.7), (cx + 16.0, cy + 10.0, BD_TIERS[0][2] + 4.0, 0.6)])
    # 25%: a big ragged hole in the smashed third dome
    hc3 = on_dome(2, -1.6, 0.4, 1.0)
    hole3 = [(hc3[0] + math.cos(2 * math.pi * k / 12) * (11.0 if k % 2 else 7.0), hc3[2] + math.sin(2 * math.pi * k / 12) * (8.0 if k % 2 else 5.0))
             for k in range(12)]
    rig.part("dome3Broken", Geo().slab(hole3, hc3[1] - 0.4, 1.0), "#23292B", outline=0.5, outline_hex="#1A1E20")
    g = Geo()
    g.slab([(-90.0 + 8.0 * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), 30.0 + 7.0 * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)],
           -29.2, 0.6)
    rig.part("soot", g, "#3A3E44", outline=0, highlight=False)
    rubble(rig, "rubble1", [(-150.0, -48.0), (-126.0, -52.0)], BD_WHITE_DK, seed=131)
    rubble(rig, "rubble2", [(-70.0, -52.0), (-30.0, -56.0)], BD_WHITE, seed=137)
    rubble(rig, "rubble3", [(-158.0, -56.0), (-104.0, -60.0), (-10.0, -58.0)], BD_WHITE_DK, seed=143, size=1.2)

    flag(rig, "root", "flagA", (cx - 22.0, cy + 6.0, BD_MAST1 + 18.0), length=30, height=16, pole=BD_MAST1 - 40.0, pole_color=BD_WHITE_DK,
         finial=BD_MINT)
    flag(rig, "root", "flagB", (-150.0, 34.0, 140.0), length=24, height=14, pole=30.0, pole_color=BD_WHITE_DK, finial=BD_MINT)

    # -- Treasury: seed pods (1), a crate of fruit (2), a glowing seed vault cube (3) --------------------------
    g = Geo()
    for i, (x, y) in enumerate(((-160.0, -54.0), (-151.0, -58.0), (-155.0, -50.0))):
        g.blob((x, y, 5.0), (4.0, 3.4, 5.0), p=2.2, cuts=3)
    rig.part("treasury1", g, BD_WHITE_LT)
    g = Geo()
    for i, (x, y) in enumerate(((-160.0, -54.0), (-151.0, -58.0), (-155.0, -50.0))):
        g.blob((x, y - 2.6, 6.0), (1.6, 0.8, 2.6), p=2.0, cuts=2)
    rig.part("treasury1", g, glow=BD_MINT, outline=0)
    g = Geo()
    box(g, (-128.0, -56.0, 5.0), (8.0, 5.0, 5.0), p=6)
    rig.part("treasury2", g, BD_WHITE_DK)
    g = Geo()
    for i in range(7):
        g.sphere((-133.0 + (i % 4) * 3.2, -57.0 + (i // 4) * 2.4, 11.0 + (i % 2)), 1.9, cuts=2)
    rig.part("treasury2", g, "#C9D36A", outline=0.3)
    g = Geo()
    box(g, (-100.0, -58.0, 8.0), (7.0, 7.0, 7.0), p=6)
    rig.part("treasury3", g, BD_WHITE)
    g = Geo()
    box(g, (-100.0, -65.2, 8.0), (4.6, 0.4, 4.6), p=5, cuts=2)
    rig.part("treasury3", g, glow=BD_MINT_CORE, outline=0)


def bd_breach(rig, joint, x, y, z, w, h, seed=0):
    """A blown hole in the white plinth: a dark jagged opening, sparking wires, broken panel edges."""
    rnd = random.Random(seed)
    n = 14
    pts, inner = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.72 + 0.28 * rnd.random()
        pts.append((x + math.cos(a) * w / 2 * k, z + math.sin(a) * h / 2 * k))
        inner.append((x + math.cos(a) * w / 2 * k * 0.72, z + math.sin(a) * h / 2 * k * 0.66 - h * 0.08))
    rig.part(joint, Geo().slab(pts, y - 2.4, 1.6), "#4A505A", outline=0.6, outline_hex="#22262C")
    rig.part(joint, Geo().slab(inner, y - 3.4, 1.0), "#22262C", outline=0)
    g = Geo()
    for i in range(0, n, 3):
        px_, pz_ = pts[i]
        box(g, (px_, y - 3.0, pz_), (2.6 + 1.6 * rnd.random(), 1.4, 1.6 + 1.0 * rnd.random()), p=5, cuts=2)
    rig.part(joint, g, BD_WHITE_LT, outline=0.5)


def crumble_biodome(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "beacon": {"hide": True}, "beaconOff": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachP": {"show": True}, "shatter": {"show": True},
                     "soot": {"show": True}, "banner": {"r": 8.0, "sz": 0.7}, "tear": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "domeFire": {"show": True}, "dome3Broken": {"show": True},
                     "dome3": {"r": 12.0, "x": -5.0, "z": -6.0}, "mast": {"hide": True}, "beaconOff": {"hide": True}, "mastBent": {"show": True},
                     "banner": {"hide": True}, "tear": {"hide": True}})
    return pose


BIO_DOME_ARCOLOGY = base_module(
    "future", "Bio-Dome Arcology", height=330, width=180, canvas=(470, 740), feet=(360, 690),
    build=build_biodome, crumble=crumble_biodome, mount_depth=BD_DEPTHS, skin="bio_dome_arcology",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-6.0, -31.0, 16.0), 3, 16), ((BD_AX[0], BD_AX[1] - 2.0, BD_MAST1 + 2.0), 0, 14)],
    smoke=[((-90.0, -30.0, 30.0), 2), ((BD_AX[0], BD_AX[1], 150.0), 3), ((BD_AX[0], BD_AX[1], 100.0), 3)],
    horn=(-90, 340), yaw=BASE_YAW,
    props=[prop_loop("turbines", [f"turbine{i}" for i in range(len(BD_TURBINES))], BD_TURB_FRAMES, bd_turbines_pose, ms=BD_TURB_MS,
                     crumble=(0, 2), z="front", hold=0, anchor=(BD_AX[0], BD_AX[1], 262.0), outline=(1.4, 0.55, 0.5))],
    extra_meta={
        "collapseMaterial": "energy",
        # the top domes and the mast fall toward the lane first, then the lower dome
        "topple": [topple_lu(-130, -40, 150, delay_ms=0, push=1.0, sink_lu=30),
                   topple_lu(-150, -26, 70, delay_ms=170, push=0.7, sink_lu=24)],
        "rubbleColors": [BD_WHITE, BD_WHITE_DK, BD_GLASS, BD_LEAF],
        "dustColor": "#D9DEE3",
        "ambientLu": [ambient_lu("petals", (BD_AX[0], BD_AX[1] - 30.0, 60.0), 36, 0.6, color="#86B46E"),
                      ambient_lu("petals", (BD_AX[0], BD_AX[1] - 24.0, 120.0), 26, 0.4, color="#9CC77E"),
                      ambient_lu("glints", (BD_AX[0] - 30.0, BD_AX[1] - 40.0, 70.0), 24, 0.5, color="#F4FBFA"),
                      ambient_lu("glints", (BD_AX[0] + 10.0, BD_AX[1] - 30.0, 150.0), 16, 0.4, color="#F4FBFA")],
    },
)

SKINS = [MIDNIGHT_NEON, CRYSTAL_SPIRE, BIO_DOME_ARCOLOGY]
