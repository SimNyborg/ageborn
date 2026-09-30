"""Cosmic Age base: the Star Ark (docs/design-lane-ages.md A17.12).

A grounded starship standing nose-up on a landing ring. The hull is a tall void-and-violet
lathe with star-white armour bands, cut by dark panel seams with mint light strips, broad team
hull bands and a glowing bridge window band near the top; a star-white nose cone with a mint
beacon crowns it. At its foot a star-white landing ring on four splayed legs rings the hull over
a mint engine glow, and a violet boarding ramp with mint edge lights leads down from a lit team
doorway to the gate. Side fins, and hovering disc platforms on struts for the turret mounts
(common.BASE_MOUNTS). Team colour: the hull bands, the doorway, the fin tips and the flags.
Crumble: cracked panels and a lost fin (75%), a broken landing leg and rubble (50%), the nose cone
knocked askew and the top flag gone (25%). Cartoon kit v2 (2026-09-30): crumble stages that read at
a glance (see `_damage`: a chunk bitten out of the upper team band with sparking wires; then a
violet plasma fire in the gap, scorch marks, the bridge windows and viewports gone dark and the nose
knocked askew; then a breach at the foot with a hanging cable and a second fire, the nose snapped to a
burning stump and the nose cone lying in the rubble). Treasury, the star forge: energy cells (1), a forge
anvil with a glowing crystal (2), a forge ring around a star core (3).
"""
import math

from ageborn_art import rigs_cosmic as K
from ageborn_art.geometry import Geo

from world.common import BASE_YAW, base_module, box, chipped_cracks, cyl, flag, platform, rubble

HULL = "#3A2D56"          # void-violet hull (the large dark area)
HULL_LT = "#4B3B6E"
ARMOR = "#C9C3DD"         # star white held at ~0.8 albedo so the shading shows
ARMOR_LT = "#D8D3EA"
SEAM = "#1E1630"
VIEWPORT = "#FFF1D6"
CRACK = "#150F22"

DEPTHS = [-40, -24, -40, -24]
SP = (-92.0, 26.0)
PROFILE = [(0, 0), (44, 0), (50, 22), (50, 66), (46, 118), (39, 160), (30, 192), (22, 212), (0, 218)]
Z0 = 20.0                 # hull bottom (sits in the landing ring)


def radius_at(z):
    h = z - Z0
    for (r0, z0), (r1, z1) in zip(PROFILE[1:], PROFILE[2:]):
        if z0 <= h <= z1 and z1 > z0:
            return r0 + (r1 - r0) * (h - z0) / (z1 - z0)
    return 20


def on_hull(a_deg, z, out=0.6):
    a = math.radians(a_deg)
    r = radius_at(z) + out
    return (SP[0] + r * math.cos(a), SP[1] + r * math.sin(a) * 0.8, z)


PLASMA_OUT = "#7A38B8"
PLASMA = "#B77BFF"
PLASMA_CORE = "#F4EAFF"
HOLE = "#120C1E"


def front(z, dx=0.0, push=1.2):
    """A point on the hull's camera-facing surface at height z (x offset dx from the axis)."""
    r = radius_at(z)
    return (SP[0] + dx, SP[1] - 0.8 * math.sqrt(max(1.0, r * r - dx * dx)) - push, z)


def _jagged(cx, cz, rx, rz, n=11, seed=0, amp=0.28):
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        f = 1.0 + amp * (1 if (k + seed) % 2 else -1) * (0.6 + 0.4 * math.sin(k * 2.3 + seed))
        pts.append((cx + rx * f * math.cos(a), cz + rz * f * math.sin(a)))
    return pts


def plasma(rig, joint, spots):
    """Void-plasma fire: violet teardrop tongues with a pale core (outside the team hue bands)."""
    o, g, c = Geo(), Geo(), Geo()
    for x, y, z, k in spots:
        for dx, lean, r, h in ((0.0, 0.25, 6.0, 19.0), (-5.5, -0.35, 4.0, 12.0), (5.5, 0.45, 3.8, 10.0)):
            cx, cz = x + dx * k, z + h * 0.42 * k
            o.blob((cx, y + 2, cz), (r * 1.3 * k, r * 0.9 * k, h * 0.62 * k), p=2.0, taper=(1.0, 0.08),
                   shift=(lean * 1.2, 0.0))
            g.blob((cx, y, cz - 0.6 * k), (r * k, r * 0.7 * k, h * 0.5 * k), p=2.0, taper=(1.0, 0.1),
                   shift=(lean, 0.0))
            c.blob((cx, y - 2.5, cz - 2.4 * k), (r * 0.5 * k, r * 0.4 * k, h * 0.28 * k), p=2.0,
                   taper=(1.0, 0.2), shift=(lean * 0.6, 0.0))
    rig.part(joint, o, glow=PLASMA_OUT, outline=0)
    rig.part(joint, g, glow=PLASMA, outline=0)
    rig.part(joint, c, glow=PLASMA_CORE, outline=0)


def _damage(rig):
    """Crumble parts per stage (each stage reads at a glance)."""
    for j in ("notch", "sparks1", "fire1", "scorch", "darkwin", "breach", "fire2", "stump", "cable", "tipfallen"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    # 1: a chunk bitten out of the upper team band, sparking wires
    x, y, z = front(Z0 + 146, -7.0, push=1.0)
    g = Geo().slab(_jagged(x, z, 19.0, 20.0, seed=1), y, 2.2)
    rig.part("notch", g, HULL_LT, outline=0.6)
    g = Geo().slab(_jagged(x + 0.5, z - 0.5, 13.5, 15.0, seed=2), y - 1.4, 1.0)
    rig.part("notch", g, HOLE, outline=0, highlight=False)
    g = Geo()
    g.capsule((x - 2.0, y - 2.4, z + 3.0), (x + 4.0, y - 3.4, z - 6.0), 0.9)
    g.capsule((x + 2.0, y - 2.4, z + 1.0), (x - 3.0, y - 3.6, z - 8.0), 0.9)
    rig.part("notch", g, K.STAR_TRIM, finish="metal", outline=0.4)
    g = Geo().star((x + 5.4, y - 4.0, z - 9.0), 7.0, 2.4, 1.0, points=5)
    rig.part("sparks1", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)
    # 2: plasma fire out of the gap, soot, the bridge windows and viewports dark
    plasma(rig, "fire1", [(x, y - 3.0, z - 8.0, 1.5)])
    g = Geo()
    g.slab(_jagged(x + 2.0, z + 17.0, 8.0, 9.0, seed=3, amp=0.35), y + 0.4, 0.8)
    xx, yy, zz = front(Z0 + 70, 14.0, push=0.8)
    g.slab(_jagged(xx, zz + 8.0, 9.0, 7.0, seed=4, amp=0.3), yy, 0.8)
    rig.part("scorch", g, "#2C2440", outline=0, highlight=False)
    g = Geo()
    zc = Z0 + 177
    for a_deg in range(-140, -30, 14):
        g.blob(on_hull(a_deg, zc, 1.5), (3.2, 3.2, 2.8), p=3.0, rot=(0, 0, a_deg + 90))
    for zc, arc in ((Z0 + 144, range(-146, -30, 19)),):
        for a_deg in arc:
            g.blob(on_hull(a_deg, zc, 3.4), (2.7, 2.7, 2.7), p=2.4, rot=(0, 0, a_deg + 90))
    rig.part("darkwin", g, "#2A2140", outline=0, highlight=False)
    # 3: a breach at the foot with a cable hanging out and fire, the nose snapped to a burning stump
    bx, by, bz = front(Z0 + 52, 18.0, push=1.0)
    g = Geo().slab(_jagged(bx, bz, 17.0, 19.0, seed=5, amp=0.3), by, 2.4)
    rig.part("breach", g, HULL_LT, outline=0.6)
    g = Geo().slab(_jagged(bx, bz - 1.0, 12.0, 14.0, seed=6, amp=0.3), by - 1.4, 1.0)
    rig.part("breach", g, HOLE, outline=0, highlight=False)
    g = Geo()
    g.capsule((bx - 4.0, by - 3.0, bz + 6.0), (bx + 6.0, by - 7.0, bz - 10.0), 1.6)
    g.capsule((bx + 6.0, by - 7.0, bz - 10.0), (bx + 10.0, by - 8.0, bz - 22.0), 1.4)
    rig.part("cable", g, SEAM, outline=0.5)
    g = Geo().star((bx + 10.0, by - 9.5, bz - 23.0), 4.0, 1.5, 1.0, points=5)
    rig.part("cable", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)
    plasma(rig, "fire2", [(bx - 4.0, by - 4.0, bz - 12.0, 1.5)])
    zt = Z0 + 206.0
    rt = radius_at(zt) + 0.5
    pts = []
    for k in range(9):
        a = math.radians(-160 + 140 * k / 8)
        pts.append((SP[0] + rt * math.cos(a), zt + (6.0 if k % 2 else -3.0)))
    g = Geo().slab([(SP[0] - rt, zt - 8.0)] + pts + [(SP[0] + rt, zt - 8.0)], SP[1] - rt * 0.8 + 3.0, 3.0)
    rig.part("stump", g, ARMOR_LT, outline=0.6)
    plasma(rig, "stump", [(SP[0] + 2.0, SP[1] - rt * 0.8 - 1.0, zt - 2.0, 1.5)])
    g = Geo().lathe([(0, 0), (22, 0), (18, 22), (9, 46), (0, 60)], (-20.0, -60.0, 12.0), (-78.0, -64.0, 20.0), segs=20)
    rig.part("tipfallen", g, ARMOR_LT, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().sphere((-80.0, -64.0, 20.5), 5.0, cuts=3)
    rig.part("tipfallen", g, "#6B6A80", finish="gloss", outline=0.6)


def build(rig, M):
    for j, pos in (("tip", (SP[0], SP[1], Z0 + 210)), ("fin", (SP[0] - 44, SP[1], 70)), ("leg", (0, 0, 0)),
                   ("strut", (0, 0, 0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "legbroken"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # engine glow under the hull
    g = Geo()
    cyl(g, (SP[0], SP[1], 2), (SP[0], SP[1], 6), 38, 42, bevel=0.6, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, glow=K.MINT, outline=0)
    g = Geo()
    cyl(g, (SP[0], SP[1], 5), (SP[0], SP[1], Z0 + 2), 40, 44, bevel=1.0, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, SEAM, finish="gloss")

    # the hull
    g = Geo().lathe(PROFILE, (SP[0], SP[1], Z0), (SP[0], SP[1], Z0 + 218), segs=40, squash=(1.0, 0.8))
    rig.part("body", g, HULL, finish="gloss")
    # star-white armour bands
    for z0, z1 in ((Z0 + 4, Z0 + 30), (Z0 + 100, Z0 + 114), (Z0 + 186, Z0 + 204)):
        g = Geo().lathe([(radius_at(z0) + 1.4, 0), (radius_at((z0 + z1) / 2) + 2.0, (z1 - z0) / 2),
                         (radius_at(z1) + 1.4, z1 - z0)], (SP[0], SP[1], z0), (SP[0], SP[1], z1), segs=40,
                        squash=(1.0, 0.8))
        rig.part("body", g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    # team hull bands (the big team areas)
    for z0, z1 in ((Z0 + 40, Z0 + 86), (Z0 + 126, Z0 + 162)):
        g = Geo().lathe([(radius_at(z0) + 1.0, 0), (radius_at((z0 + z1) / 2) + 1.6, (z1 - z0) / 2),
                         (radius_at(z1) + 1.0, z1 - z0)], (SP[0], SP[1], z0), (SP[0], SP[1], z1), segs=40,
                        squash=(1.0, 0.8))
        rig.part("body", g, team=True)
    # violet trim rings
    for z in (Z0 + 38, Z0 + 88, Z0 + 122, Z0 + 164):
        g = Geo()
        cyl(g, (SP[0], SP[1], z - 1.2), (SP[0], SP[1], z + 1.2), radius_at(z) + 2.4, bevel=0.3, segs=40,
            squash=(1.0, 0.8))
        rig.part("body", g, K.VIOLET, finish="gloss")
    # panel seams and mint strips on the dark hull
    seams, strips = Geo(), Geo()
    for a_deg in (-150, -118, -86, -54, -22):
        for z0, z1 in ((Z0 + 90, Z0 + 98), (Z0 + 166, Z0 + 184), (Z0 + 32, Z0 + 36)):
            seams.capsule(on_hull(a_deg, z0, 0.9), on_hull(a_deg, z1, 0.9), 0.9, segs=6, rings=2)
    for a_deg, z0, z1 in ((-126, Z0 + 90, Z0 + 98), (-62, Z0 + 90, Z0 + 98), (-110, Z0 + 166, Z0 + 172),
                          (-70, Z0 + 166, Z0 + 172)):
        strips.capsule(on_hull(a_deg, z0, 1.2), on_hull(a_deg, z1, 1.2), 1.2, segs=6, rings=2)
    rig.part("body", seams, SEAM, outline=0, highlight=False)
    rig.part("body", strips, glow=K.MINT, outline=0)
    # bridge window band near the top
    g = Geo()
    zc = Z0 + 177
    for a_deg in range(-140, -30, 14):
        p = on_hull(a_deg, zc, 1.0)
        g.blob(p, (3.0, 3.0, 2.6), p=3.0, rot=(0, 0, a_deg + 90))
    rig.part("body", g, glow="#B98CFF", outline=0.6, outline_hex=SEAM)
    # portholes
    g = Geo()
    for a_deg in (-120, -90, -60):
        for z in (Z0 + 94,):
            g.sphere(on_hull(a_deg, z, 1.4), 2.4, cuts=3)
    rig.part("body", g, glow=K.MINT_CORE, outline=0.6, outline_hex=SEAM)

    # rows of lit viewports (a star-white bezel round a warm glowing pane) so it reads as a ship
    bez, pane = Geo(), Geo()
    for zc, arc in ((Z0 + 63, range(-150, -25, 17)), (Z0 + 144, range(-146, -30, 19)), (Z0 + 94, (-135, -105, -75, -45))):
        for a_deg in arc:
            if zc == Z0 + 94 and a_deg in (-120, -90, -60):
                continue
            bez.blob(on_hull(a_deg, zc, 1.8), (3.6, 3.6, 3.6), p=2.4, rot=(0, 0, a_deg + 90))
            pane.blob(on_hull(a_deg, zc, 3.0), (2.5, 2.5, 2.5), p=2.4, rot=(0, 0, a_deg + 90))
    rig.part("body", bez, ARMOR_LT, finish="gloss", outline=0.5, outline_hex=K.STAR_TRIM)
    rig.part("body", pane, glow=VIEWPORT, outline=0)

    # nose cone (falls in stage 3) with a mint beacon
    g = Geo().lathe([(0, 0), (24, 0), (19, 24), (10, 50), (0, 66)], (SP[0], SP[1], Z0 + 208),
                    (SP[0], SP[1], Z0 + 274), segs=32, squash=(1.0, 0.8))
    rig.part("tip", g, ARMOR_LT, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    cyl(g, (SP[0], SP[1], Z0 + 222), (SP[0], SP[1], Z0 + 225), 21.4, bevel=0.4, segs=32, squash=(1.0, 0.8))
    rig.part("tip", g, K.VIOLET, finish="gloss")
    g = Geo().sphere((SP[0], SP[1], Z0 + 274), 6.4, cuts=3)
    rig.part("tip", g, glow=K.MINT_CORE, outline=0.8, outline_hex=K.MINT)
    g = Geo().lathe([(7.6, -0.8), (10.4, 0), (7.6, 0.8)], (SP[0], SP[1] - 2, Z0 + 274), (SP[0], SP[1] - 3, Z0 + 274),
                    segs=24)
    rig.part("tip", g, glow="#8AF2D2", outline=0)                       # the beacon halo
    # the nose glow: a lit canopy strip down the nose cone's front and a glowing collar
    g = Geo()
    for k in range(5):
        zz = Z0 + 230 + k * 7.0
        r_ = 20.6 - k * 2.4
        g.blob((SP[0] - 2.0, SP[1] - r_ * 0.8 - 0.6, zz), (4.4 - k * 0.5, 1.2, 2.6), p=2.6)
    rig.part("tip", g, glow=K.MINT, outline=0.6, outline_hex=SEAM)
    g = Geo()
    cyl(g, (SP[0], SP[1], Z0 + 213), (SP[0], SP[1], Z0 + 216.5), 24.2, bevel=0.3, segs=32, squash=(1.0, 0.8))
    rig.part("tip", g, glow="#B98CFF", outline=0.5, outline_hex=SEAM)

    # fins: a back fin (lost at stage 1) and a front fin; team tips
    g = Geo().slab([(SP[0] - 44, 20), (SP[0] - 78, 12), (SP[0] - 62, 70), (SP[0] - 46, 120)], SP[1] + 2, 6)
    rig.part("fin", g, HULL_LT, finish="gloss")
    g = Geo().slab([(SP[0] - 72, 12), (SP[0] - 80, 12), (SP[0] - 72, 36)], SP[1] + 2, 6.6)
    rig.part("fin", g, team=True, outline=0.6)
    g = Geo().slab([(SP[0] + 44, 26), (SP[0] + 66, 16), (SP[0] + 54, 70), (SP[0] + 45, 106)], SP[1] + 10, 6)
    rig.part("body", g, HULL_LT, finish="gloss")

    # landing ring on four legs
    g = Geo()
    for a in range(0, 360, 10):
        a0, a1 = math.radians(a), math.radians(a + 10)
        g.capsule((SP[0] + 62 * math.cos(a0), SP[1] + 62 * math.sin(a0) * 0.72, 22),
                  (SP[0] + 62 * math.cos(a1), SP[1] + 62 * math.sin(a1) * 0.72, 22), 3.2, segs=10, rings=2)
    rig.part("body", g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    for a in range(0, 360, 10):
        a0, a1 = math.radians(a), math.radians(a + 10)
        g.capsule((SP[0] + 62 * math.cos(a0), SP[1] - 1.2 + 62 * math.sin(a0) * 0.72, 18.6),
                  (SP[0] + 62 * math.cos(a1), SP[1] - 1.2 + 62 * math.sin(a1) * 0.72, 18.6), 1.2, segs=8, rings=2)
    rig.part("body", g, glow=K.MINT, outline=0)
    for i, a in enumerate((-135, -45, 45, 135)):
        c, s = math.cos(math.radians(a)), math.sin(math.radians(a)) * 0.72
        top = (SP[0] + 44 * c, SP[1] + 44 * s, 40)
        foot = (SP[0] + 74 * c, SP[1] + 74 * s, 3)
        joint = "leg" if i == 1 else "body"
        g = Geo().capsule(top, foot, 3.4, 2.6)
        rig.part(joint, g, HULL_LT, finish="metal")
        g = Geo()
        cyl(g, (foot[0], foot[1], 0), (foot[0], foot[1], 4), 7.0, 6.0, bevel=0.8, segs=16, squash=(1.0, 0.72))
        rig.part(joint, g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    # the broken leg (stage 2): lying on the ground
    c, s = math.cos(math.radians(-45)), math.sin(math.radians(-45)) * 0.72
    g = Geo().capsule((SP[0] + 50 * c, SP[1] + 50 * s - 6, 4), (SP[0] + 84 * c, SP[1] + 84 * s - 6, 3), 3.4, 2.6)
    rig.part("legbroken", g, HULL_LT, finish="metal")

    # boarding ramp and the lit team doorway (the gate)
    g = Geo().slab([(-64, 0), (-64, 14), (-4, 1.6), (-4, 0)], -30, 24)
    rig.part("body", g, K.VIOLET_DK, finish="gloss")
    g = Geo()
    for yy in (-42.5, -17.5):
        g.capsule((-64, yy, 14.8), (-4, yy, 2.4), 0.9, segs=6, rings=2)
    rig.part("body", g, glow=K.MINT, outline=0)
    door = on_hull(-62, Z0 + 18, 0.0)
    g = Geo().blob((door[0] + 2, door[1] - 2, Z0 + 16), (15, 5, 17), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((door[0] + 3.2, door[1] - 4.4, Z0 + 15), (11, 4, 13.5), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, team=True)
    g = Geo().blob((door[0] + 4.2, door[1] - 6.8, Z0 + 13), (7, 3, 9.5), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, glow=K.MINT_CORE, outline=0)

    # hovering disc platforms at the mounts, with struts back into the hull
    for i, (x, y, z) in enumerate(M):
        r = radius_at(z - 20)
        anchor = (SP[0] + r * 0.6, SP[1] - r * 0.55, z - 22)
        if i == 0:
            anchor = (x - 4, y + 12, 24)   # down onto the landing ring
        platform(rig, "strut" if i == 2 else "body", (x, y, z), HULL_LT, K.STAR_TRIM, style="disc", r=(24, 18), t=5,
                 depth_to=anchor, accent=K.MINT)

    chipped_cracks(rig, "crack1", [[on_hull(-100, 150, 2), on_hull(-94, 140, 2), on_hull(-100, 128, 2)],
                                   [on_hull(-70, 200, 2), on_hull(-64, 192, 2)]], CRACK, ARMOR_LT, w=1.8)
    chipped_cracks(rig, "crack2", [[on_hull(-116, 76, 2), on_hull(-110, 66, 2), on_hull(-116, 54, 2)],
                                   [on_hull(-60, 120, 2), on_hull(-54, 110, 2)]], CRACK, ARMOR_LT, w=1.8)
    chipped_cracks(rig, "crack3", [[on_hull(-90, 212, 2), on_hull(-84, 204, 2), on_hull(-90, 194, 2)],
                                   [on_hull(-130, 110, 2), on_hull(-124, 100, 2)]], CRACK, ARMOR_LT, w=1.8)
    rubble(rig, "rubble1", [(-162, -40), (-138, -50)], HULL_LT, seed=3)
    rubble(rig, "rubble2", [(-98, -58), (-70, -60)], ARMOR, seed=13)
    rubble(rig, "rubble3", [(-150, -60), (-120, -62), (16, -56)], HULL_LT, seed=23, size=1.2)

    _damage(rig)

    flag(rig, "root", "flagA", (SP[0] - 26, SP[1] + 6, Z0 + 266), length=30, height=16, pole=Z0 + 190,
         pole_color=K.STAR_TRIM, finial=K.MINT)
    flag(rig, "root", "flagB", (-156, 34, 140), length=24, height=14, pole=14, pole_color=K.STAR_TRIM, finial=K.MINT)

    # Treasury: the star forge
    g = Geo()
    for k, x in enumerate((-162, -152, -142)):
        cyl(g, (x, -58, 0), (x, -58, 18 - k * 2), 4.2, bevel=0.8)
    rig.part("treasury1", g, HULL_LT, finish="gloss")
    g = Geo()
    for k, x in enumerate((-162, -152, -142)):
        cyl(g, (x, -62.4, 4), (x, -62.4, 14 - k * 2), 1.4, bevel=0.3)
    rig.part("treasury1", g, glow=K.MINT, outline=0)
    g = Geo()
    box(g, (-128, -62, 5), (9, 7, 5), p=5, taper=(1.0, 0.8))
    box(g, (-128, -62, 12), (12, 6, 2.6), p=5)
    rig.part("treasury2", g, K.STAR_TRIM, finish="metal")
    g = Geo().lathe([(0, 0), (3.4, 3), (3.0, 10), (0, 15)], (-128, -62, 14), (-127, -62, 29), segs=6)
    rig.part("treasury2", g, glow=K.VIOLET_GLOW, outline=0.8, outline_hex=K.VIOLET)
    g = Geo()
    for i in range(24):
        a0, a1 = 2 * math.pi * i / 24, 2 * math.pi * (i + 1) / 24
        g.capsule((-102 + 11 * math.cos(a0), -64, 14 + 11 * math.sin(a0)),
                  (-102 + 11 * math.cos(a1), -64, 14 + 11 * math.sin(a1)), 1.8, segs=8, rings=2)
    g.capsule((-110, -64, 0), (-106, -64, 6), 2.0).capsule((-94, -64, 0), (-98, -64, 6), 2.0)
    rig.part("treasury3", g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().star((-102, -66, 14), 7.0, 3.0, 2.4, points=5)
    rig.part("treasury3", g, glow="#FFF6D8", outline=0.8, outline_hex=K.MINT)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "fin": {"hide": True}, "rubble1": {"show": True},
                     "notch": {"show": True}, "sparks1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "leg": {"hide": True},
                     "legbroken": {"show": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "darkwin": {"show": True}, "sparks1": {"hide": True}, "tip": {"r": 12.0, "x": -4.0, "z": -6.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "tip": {"hide": True},
                     "breach": {"show": True}, "cable": {"show": True}, "fire2": {"show": True},
                     "stump": {"show": True}, "tipfallen": {"show": True}})
    return pose


MODULE = base_module(
    "cosmic", "Star Ark", height=330, width=180, canvas=(470, 740), feet=(360, 690),
    build=build, crumble=crumble, mount_depth=DEPTHS,
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-40, -46, 30), 3, 30), ((SP[0], SP[1] - 40, 60), 3, 30), ((SP[0], SP[1] - 34, 140), 2, 24),
            ((SP[0], SP[1] - 26, 204), 1, 20), ((SP[0], SP[1] - 20, Z0 + 274), 2, 22),
            ((SP[0] - 2, SP[1] - 20, Z0 + 240), 2, 18)],
    smoke=[((SP[0], SP[1], 236), 2), ((SP[0] - 20, -10, 90), 3), ((-40, -20, 30), 3)],
    horn=(-110, 350), yaw=BASE_YAW,
)
