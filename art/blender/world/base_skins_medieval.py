"""Medieval Age base skins as real models (PLAN 2c): `base.medieval@<skin>`.

Rose Keep (Rare, Wardrobe Crate; owner request 2026-10-08 "more base skins that are not just a
recolour"): the Keep rebuilt as a storybook rose castle in warm rose sandstone. A steep gable crowns
the keep instead of the flat fighting top, its stone face pierced by a stained-glass rose window under a
team-roofed gable; a slender corner turret carries a flared needle spire; the round gate tower wears a
rosebud dome (team petals in green sepals). Climbing roses with big wine blooms run up the walls and
along the string course, pink roses cover a garden trellis arch at the gate, rose bushes stand at the
foot and flower boxes hang under the lancets. Cream dressed stone (quoins, copings, tracery) frames the
rose ashlar; lanterns light the gate.

The footprint, height band and the four mount platforms are the standard Keep's (world/base_medieval.py,
common.BASE_MOUNTS): a timber hoarding by the gate, a corbelled balcony on the keep's corner, a hoarding
on the gate tower and a corbelled bartizan at the gable's foot. Team colour: the gable roof (its thick
front verge frames the stone gable), the spire, the rosebud dome and a long banner with a parchment rose.

Crumble (readable at a glance): 75% cracks, the gold rose finial and two gate-tower merlons lost,
rubble and fallen petals; 50% more cracks, the hoarding rail broken and burning with soot, a dark lancet,
the banner torn, a run of roses torn loose and hanging, the rose window cracked; 25% a ragged breach,
the spire knocked askew, the dome tilted, the roof on fire, the rose window dark and broken, the banner
hanging by a corner and the top pennant gone. Treasury: grain sacks and a basket of roses (1), a treasure
chest (2), a garden cart of gold hung with roses (3).
"""
import math

from ageborn_art.geometry import Geo

from world.base_skins_kit import Roses, ashlar, flames, lancet, lantern, ring_blocks, rose_window
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, rubble,
                          topple_lu)

ROSE = "#D0A69C"       # rose sandstone (large areas)
ROSE_LT = "#DAB4AA"
ROSE_MID = "#C59C93"
ROSE_DK = "#AB857E"    # the core between blocks, shadowed walls
ROSE_DKR = "#957169"   # plinth, cornices
TRIM = "#ECDFCF"       # cream dressed stone: quoins, copings, tracery
TRIM_DK = "#CDBBA8"
WOOD = "#7A5E44"
WOOD_DK = "#5A4634"
WOOD_LT = "#B9A27C"    # trellis laths
IRON = "#4A4E56"
GOLD = "#D4A437"
PARCH = "#E8DFC8"
SACK = "#C8B48C"
WINE = "#8E2A4A"
LEAF_DK = "#4C7A30"
LEAF_LT = "#79A84C"
STEM = "#5C6B36"
BLOOM = "#8E2A4A"      # wine roses
BLOOM_LT = "#B9476B"
BLOOM_DK = "#5C1A31"
PINK = "#C9637F"       # pink roses (trellis, bushes, boxes)
PINK_LT = "#E790A8"
PINK_DK = "#86283F"
CRACK = "#4E3A39"
CHIP = "#DDBFB4"
SOOT = "#665A56"
PANES = ["#C9587A", "#E6B860", "#9474BE", "#86B45E"]   # stained glass: rose, gold, violet, leaf
PANE_HUB = "#FFE6B0"

DEPTHS = [-40, -24, -40, -24]
KX, KY, KW, KD, KH = -110.0, 22.0, 52.0, 46.0, 250.0   # keep centre, half width, half depth, wall height
FY = KY - KD                                          # the keep's front face (y = -24)
GH = 70.0                                             # gable height above the walls
TX, TY, TR, TH = -22.0, -2.0, 22.0, 190.0             # gate tower centre, radius, height
SX, SY = KX - 38.0, KY + 26.0                         # corner turret (back left)
GX = TX - 8.0                                         # gate door centre


def _gable_half(z):
    """Half width of the stone gable at height z above the wall top."""
    return KW * max(0.0, 1.0 - z / GH)


def gable(rig):
    """The steep gable: a stone prism with a rose window, cream copings under a team roof whose thick
    front verges frame it, a ridge cap and a gold rose finial."""
    # stone gable prism over the full depth of the keep
    tri = [(KX - KW, KH - 3), (KX + KW, KH - 3), (KX, KH + GH)]
    g = Geo().slab(tri, KY, KD * 2 + 0.2)
    rig.part("body", g, ROSE_DK)
    # ashlar on the gable face (inside the triangle, round the window)
    def skip(x, z):
        dz = z - KH
        if dz < 0:
            return True
        if abs(x - KX) > _gable_half(dz) - 4.5:
            return True
        return math.hypot(x - KX, z - (KH + 26)) < 20.5
    ashlar(rig, "body", KX - KW + 4, KX + KW - 4, KH - 1, KH + GH - 6, FY - 0.6, [ROSE, ROSE_LT, ROSE_MID],
           h=10.0, w=(13.0, 18.0), seed=11, skip=skip)
    # cream copings along the raked edges, just under the team verge
    g = Geo()
    for sx in (-1, 1):
        g.capsule((KX + sx * (KW - 3.0), FY - 2.2, KH - 5.5), (KX, FY - 2.2, KH + GH - 6.5), 2.4, 2.4, segs=10, rings=2)
    rig.part("body", g, TRIM, outline=0.6)
    # the team roof: two thick slopes from the eaves to the ridge, overhanging the gable at the front
    # (their 7 lu verge frames the stone face) and at the back
    g = Geo()
    T = 5.5
    for sx in (-1, 1):
        ex, ez = KX + sx * (KW + 7.0), KH - 7.0
        ax, az = KX, KH + GH + 8.0
        dx, dz = ax - ex, az - ez
        L = math.hypot(dx, dz)
        nx, nz = (dz / L, -dx / L) if sx < 0 else (-dz / L, dx / L)   # into the roof, under the slope
        pts = [(ex, ez), (ax, az), (ax + nx * T, az + nz * T), (ex + nx * T, ez + nz * T)]
        g.slab(pts, KY + 1.0, KD * 2 + 14.0)
    rig.part("roof", g, team=True)
    # verge trim: a slim cream board under the team verge, and a dark ridge cap running back
    g = Geo()
    g.capsule((KX, FY - 7.5, KH + GH + 8.0), (KX, KY + KD + 6.0, KH + GH + 8.0), 2.4, segs=10, rings=2)
    rig.part("roof", g, ROSE_DKR, outline=0.6)
    # the rose finial on a little pinnacle (lost at 75%)
    g = Geo()
    box(g, (KX, FY - 4.5, KH + GH + 11.0), (3.0, 3.0, 4.0), p=5)
    rig.part("finial", g, TRIM_DK, outline=0.5)
    gp, gc = Geo(), Geo()
    for k in range(5):
        a = math.radians(90 + 72 * k)
        gp.blob((KX + math.cos(a) * 3.0, FY - 4.0, KH + GH + 21.0 + math.sin(a) * 3.0), (2.8, 1.6, 2.3), p=2.2, cuts=3,
                rot=(0, 90 - math.degrees(a), 0))
    gc.sphere((KX, FY - 5.2, KH + GH + 21.0), 2.0, cuts=3)
    rig.part("finial", gp, GOLD, finish="metal", outline=0.5)
    rig.part("finial", gc, "#F2D27A", finish="metal", outline=0.4)


def corner_spire(rig):
    """The slender back-left turret with a flared team needle spire, a dormer and a gold finial."""
    g = Geo()
    cyl(g, (SX, SY, KH - 20), (SX, SY, KH + 40), 14.0, bevel=0.8, segs=22)
    rig.part("spire", g, ROSE)
    g = Geo()
    for z in (KH + 6, KH + 22):
        cyl(g, (SX, SY, z), (SX, SY, z + 2.4), 14.8, bevel=0.6, segs=22)
    cyl(g, (SX, SY, KH + 36), (SX, SY, KH + 42), 17.0, bevel=0.8, segs=22)
    rig.part("spire", g, TRIM_DK, outline=0.6)
    lancet(rig, "spire", SX + 3.0, SY - 14.6, KH + 22.0, 5.0, 11.0, frame=WOOD_DK, mullion=False)
    g = Geo().lathe([(0, 0), (20.0, 0), (19.0, 2.5), (13.5, 8.4), (8.6, 18.6), (4.6, 31.5), (1.6, 42.5), (0, 47.0)],
                    (SX, SY, KH + 41.0), (SX, SY, KH + 88.0), segs=24)
    rig.part("spire", g, team=True)
    # a small dormer on the spire's front
    g = Geo()
    box(g, (SX + 2.0, SY - 13.0, KH + 52.0), (4.6, 4.0, 4.4), p=5)
    rig.part("spire", g, TRIM_DK, outline=0.5)
    g = Geo().slab([(SX - 3.4, KH + 55.0), (SX + 7.4, KH + 55.0), (SX + 2.0, KH + 62.0)], SY - 15.0, 6.0)
    rig.part("spire", g, team=True, outline=0.5)
    g = Geo().slab([(SX + 0.4, KH + 49.0), (SX + 3.6, KH + 49.0), (SX + 3.6, KH + 53.5), (SX + 2.0, KH + 55.0), (SX + 0.4, KH + 53.5)],
                   SY - 17.4, 0.8)
    rig.part("spire", g, glow="#FFD89A", outline=0)
    g = Geo().sphere((SX, SY, KH + 89.0), 2.6, cuts=3)
    rig.part("spire", g, GOLD, finish="metal", outline=0.5)


def rosebud_dome(rig):
    """The gate tower's dome: a plump closed rosebud of team petals (an outer row just unfurling)
    on green sepals, with a gold tip."""
    cx, cy, z0 = TX - 2.0, TY + 6.0, TH + 6.0
    g = Geo()
    for k in range(5):
        a = math.radians(-90 + 36 + 72 * k)
        g.blob((cx + math.cos(a) * 7.5, cy + math.sin(a) * 7.5, z0 + 21.0), (13.0, 10.5, 23.5), p=2.1, cuts=5,
               taper=(1.0, 0.25), shift=(-0.6, 0.0), rot=(0, 0, math.degrees(a)))
    for k in range(5):
        a = math.radians(-90 + 72 * k)
        g.blob((cx + math.cos(a) * 10.5, cy + math.sin(a) * 10.5, z0 + 12.5), (10.5, 8.0, 13.5), p=2.1, cuts=5,
               taper=(1.0, 0.45), shift=(-0.2, 0.0), rot=(0, -12, math.degrees(a)))
    g.lathe([(0, 0), (10.0, 0), (13.5, 12.0), (11.5, 26.0), (6.5, 41.0), (2.2, 52.0), (0, 57.0)], (cx, cy, z0 + 1.0),
            (cx, cy, z0 + 58.0), segs=22)
    rig.part("dome", g, team=True)
    # sepals curling out over the cornice
    g = Geo()
    for k in range(6):
        a = math.radians(-90 + 60 * k + 12)
        px, py = cx + math.cos(a) * 17.0, cy + math.sin(a) * 17.0
        g.blob((px + math.cos(a) * 4.0, py + math.sin(a) * 4.0, z0 + 2.5), (8.0, 2.6, 3.0), p=2.0, cuts=3,
               taper=(1.0, 1.0), rot=(0, 16, math.degrees(a)))
    rig.part("dome", g, LEAF_DK, finish="hair", outline=0.6)
    g = Geo()
    cyl(g, (cx, cy, z0 + 56.0), (cx, cy, z0 + 59.0), 1.8, bevel=0.3)
    g.sphere((cx, cy, z0 + 60.5), 2.3, cuts=3)
    rig.part("dome", g, GOLD, finish="metal", outline=0.5)


def trellis(rig):
    """A garden trellis arch over the gate, grown over with pink roses (joint `trellis`; it leans at 25%)."""
    roses = Roses(PINK, PINK_LT, PINK_DK, LEAF_DK, LEAF_LT, STEM)
    y = TY - TR - 9.0
    g = Geo()
    for sx in (-1, 1):
        x = GX + sx * 15.0
        g.capsule((x, y, 0), (x, y, 31.0), 1.5)
        g.capsule((x, y + 5.0, 0), (x, y + 5.0, 31.0), 1.2)
        for z in (8.0, 17.0, 26.0):
            g.capsule((x, y - 0.4, z), (x, y + 5.4, z), 0.8)
    for r, yy in ((15.0, y), (15.0, y + 5.0)):
        pts = [(GX + math.cos(math.radians(a)) * r, yy, 31.0 + math.sin(math.radians(a)) * r) for a in range(0, 181, 15)]
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 1.4 if yy == y else 1.1, segs=8, rings=2)
    rig.part("body", g, WOOD_LT, outline=0.5)
    pts_l = [(GX - 15.5, y - 1.2, 2.0), (GX - 16.0, y - 1.2, 16.0), (GX - 15.0, y - 1.2, 31.0),
             (GX - 9.0, y - 1.2, 42.0), (GX - 1.0, y - 1.2, 46.5)]
    pts_r = [(GX + 15.5, y - 1.2, 2.0), (GX + 15.0, y - 1.2, 18.0), (GX + 14.0, y - 1.2, 33.0),
             (GX + 7.0, y - 1.2, 43.5), (GX + 1.0, y - 1.2, 46.0)]
    roses.vine(pts_l, every=4.6, length=5.8, blooms=(0.42, 0.7, 0.96), bloom_r=6.0, seed=31)
    roses.vine(pts_r, every=4.6, length=5.8, blooms=(0.3, 0.62, 0.86), bloom_r=5.6, seed=32)
    roses.bloom((GX - 4.0, y - 3.0, 47.5), 6.2).bloom((GX + 5.0, y - 3.0, 46.0), 5.6)
    roses.parts(rig, "trellis")


def build(rig, M):
    for j, pos in (("roof", (KX, KY, KH)), ("finial", (KX, FY, KH + GH + 10)), ("spire", (SX, SY, KH - 20)),
                   ("tmerlon", (TX, TY, TH + 4)), ("dome", (TX - 2, TY + 6, TH + 6)),
                   ("banner", (KX, FY - 3.0, 234)), ("droop", (-95.0, FY - 3.4, 156.0)),
                   ("trellis", (GX + 15.0, TY - TR - 9.0, 0.0))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "dark", "fire1", "fire2",
              "scorch", "breach", "tear", "rosecrack", "rosedark", "petals"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("rosewin", "body", (KX, FY, KH + 26))

    # damage: fire on the gate hoarding and the tower hoarding (50%), on the roof and spire (25%)
    flames(rig, "fire1", [(M[0][0] - 10, M[0][1] - 14, M[0][2] - 4, 1.0), (M[0][0] + 12, M[0][1] - 12, M[0][2] - 6, 0.75),
                          (M[2][0] + 4, M[2][1] - 16, M[2][2] - 2, 0.8)])
    flames(rig, "fire2", [(KX - 24, FY - 6, KH + 30, 1.25), (SX + 4, SY - 16, KH + 50, 0.9),
                          (KX + 36, FY - 4, 96, 0.8), (KX + 22, FY - 8, KH + 10, 0.85)])
    # soot streaks licking up the walls over the fires (50%)
    g = Geo()
    for a, z, rx, rz in ((262, M[0][2] + 20, 7.5, 13.0), (300, M[0][2] + 14, 5.5, 9.0), (275, M[2][2] - 22, 6.0, 9.0)):
        x, y = TX + (TR + 0.8) * math.cos(math.radians(a)), TY + (TR + 0.8) * math.sin(math.radians(a))
        g.blob((x, y, z), (rx, 2.4, rz), p=2.2, taper=(1.0, 0.35), rot=(0, 0, a + 90))
    g.blob((KX + 37, FY - 2.6, 214), (6.0, 1.8, 8.5), p=2.2, taper=(1.0, 0.35))
    rig.part("scorch", g, SOOT, outline=0, highlight=False)
    # a ragged breach in the keep wall with broken timber inside (25%)
    bx0, bz0 = KX + 16, 66
    pts = [(bx0 - 16, bz0 - 12), (bx0 - 6, bz0 - 18), (bx0 + 8, bz0 - 14), (bx0 + 18, bz0 - 4), (bx0 + 14, bz0 + 10),
           (bx0 + 4, bz0 + 18), (bx0 - 10, bz0 + 14), (bx0 - 18, bz0 + 2)]
    g = Geo().slab(pts, FY - 2.4, 1.2)
    rig.part("breach", g, "#2E2422", outline=0, highlight=False)
    g = Geo().capsule((bx0 - 12, FY - 3.4, bz0 - 6), (bx0 + 10, FY - 3.4, bz0 + 8), 1.6)
    g.capsule((bx0 - 8, FY - 3.4, bz0 + 10), (bx0 + 12, FY - 3.4, bz0 - 4), 1.4)
    rig.part("breach", g, WOOD_DK, outline=0.4)
    g = Geo()
    for x, z, r in ((bx0 - 18, bz0 - 12, 4.0), (bx0 + 16, bz0 - 12, 3.4), (bx0 + 18, bz0 + 8, 3.0), (bx0 - 16, bz0 + 12, 3.2)):
        g.blob((x, FY - 3.0, z), (r, 2.6, r * 0.8), p=2.6)
    rig.part("breach", g, ROSE_LT, outline=0.5)

    # the keep: core, ashlar front, coursed right side, plinth, string course, cornice, quoins
    g = Geo()
    box(g, (KX, KY, KH / 2), (KW, KD, KH / 2), p=10)
    rig.part("body", g, ROSE_DK)
    ashlar(rig, "body", KX - KW + 2, KX + KW - 2, 18, KH - 12, FY - 0.6, [ROSE, ROSE_LT, ROSE_MID], h=12.5, w=(17.0, 25.0), seed=3)
    g = Geo()
    for z in range(24, int(KH) - 8, 12):
        box(g, (KX + KW + 0.6, KY + 2, z), (0.8, KD - 4, 0.7), p=4, cuts=2)
    rig.part("body", g, ROSE_DKR, outline=0)
    g = Geo()
    box(g, (KX, KY - 2, 9), (KW + 5, KD + 4, 9), p=6, taper=(1.0, 0.96))
    rig.part("body", g, ROSE_DKR)
    g = Geo()
    box(g, (KX, KY - 1, 150), (KW + 2.5, KD + 2.5, 3.0), p=6)
    box(g, (KX, KY - 1, KH - 2), (KW + 3.5, KD + 3.5, 3.4), p=6)
    rig.part("body", g, TRIM_DK, outline=0.7)
    g = Geo()
    for i, z in enumerate(range(24, int(KH) - 10, 14)):
        long = i % 2 == 0
        for sx in (-1, 1):
            x = KX + sx * (KW - (7.0 if long else 4.5))
            box(g, (x, FY - 1.2, z + 6), (7.0 if long else 4.5, 2.0, 5.6), p=5, cuts=2)
    rig.part("body", g, TRIM, outline=0.5)
    # a corbel table under the gable: small cream brackets carrying the cornice
    g = Geo()
    x = KX - KW + 6.0
    while x < KX + KW - 4.0:
        box(g, (x, FY - 2.4, KH - 8.0), (2.6, 2.6, 3.4), p=4, cuts=2, taper=(0.6, 1.0))
        x += 9.4
    rig.part("body", g, TRIM, outline=0.5)

    gable(rig)
    corner_spire(rig)
    rose_window(rig, "body", (KX, FY - 0.6, KH + 26.0), 16.0, TRIM, TRIM_DK, PANES, PANE_HUB, glow_joint="rosewin")
    # 50%: a crack across the rose window; 25%: dark and broken
    g = Geo()
    g.capsule((KX - 12, FY - 2.6, KH + 36), (KX - 2, FY - 2.6, KH + 27), 0.9, segs=6, rings=1)
    g.capsule((KX - 2, FY - 2.6, KH + 27), (KX + 9, FY - 2.6, KH + 17), 0.8, segs=6, rings=1)
    g.capsule((KX - 2, FY - 2.6, KH + 27), (KX + 10, FY - 2.6, KH + 33), 0.7, segs=6, rings=1)
    rig.part("rosecrack", g, "#3A2A2C", outline=0, highlight=False)
    g = Geo().slab([(KX + math.cos(math.radians(a)) * 15.0, KH + 26 + math.sin(math.radians(a)) * 15.0) for a in range(0, 360, 24)],
                   FY - 1.4, 0.8)
    rig.part("rosedark", g, "#2E2422", outline=0, highlight=False)
    g = Geo()
    for a, L in ((40, 8.0), (130, 6.5), (220, 9.0), (310, 7.0), (175, 5.0)):
        r0 = 15.0
        ax, az = KX + math.cos(math.radians(a)) * r0, KH + 26 + math.sin(math.radians(a)) * r0
        bx, bz = KX + math.cos(math.radians(a)) * (r0 - L), KH + 26 + math.sin(math.radians(a)) * (r0 - L)
        g.slab([(ax - 2.2, az), (ax + 2.2, az), (bx, bz)], FY - 1.9, 0.7)
    rig.part("rosedark", g, PANES[0], outline=0.4)

    # lancets with cream frames (two lit, flower boxes under the upper ones)
    for x, z in ((KX - 34, 196), (KX - 34, 116), (KX + 34, 116)):
        lancet(rig, "body", x, FY - 1.2, z, 9.0, 21.0, frame=TRIM_DK, sill=TRIM_DK)
    lancet(rig, "dark", KX + 34, FY - 2.2, 196, 9.4, 21.4, glow_hex="#2E2422", frame=TRIM_DK, mullion=False)
    rig.joint("win", "body", (0, 0, 0))
    lancet(rig, "win", KX + 34, FY - 1.2, 196, 9.0, 21.0, frame=TRIM_DK, sill=TRIM_DK)

    # the long team banner with a parchment rose
    bx = KX
    ban = Geo().slab([(bx - 13, 234), (bx + 13, 234), (bx + 13, 140), (bx, 129), (bx - 13, 140)], FY - 3.0, 1.6)
    from ageborn_art import face as F
    from ageborn_art import kit_medieval as K
    bf = F.Face(rig, "banner", [ban])
    rig.part("banner", ban, team=True)
    g = Geo().capsule((bx - 15, FY - 3.6, 235), (bx + 15, FY - 3.6, 235), 1.4)
    rig.part("body", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    c = bf.hit(*K.scr(bf, (bx, FY - 4.0, 145.0)))
    bf.stroke(g, c, [(-11.0, 4.0), (0.0, -2.0), (11.0, 4.0)], 1.8, 0.4)
    c = bf.hit(*K.scr(bf, (bx, FY - 4.0, 196.0)))
    for k in range(5):
        a = math.radians(90 + 72 * k)
        bf.decal(g, c, F.ellipse(math.cos(a) * 3.9, math.sin(a) * 3.9, 3.4, 3.0, 14), 0.4)
    bf.decal(g, c, F.ellipse(0.0, 0.0, 2.6, 2.6, 12), 0.4)
    bf.stroke(g, c, [(0.0, -5.0), (-0.6, -12.0), (0.4, -19.0)], 1.4, 0.4)
    for sx in (-1, 1):
        pts = [(sx * 1.2 + sx * 4.2 * math.cos(t) - 0.0, -13.0 + 2.0 * math.sin(t)) for t in [i * math.pi / 6 for i in range(12)]]
        bf.decal(g, c, [(px + sx * 2.6, pz + sx * 1.0) for px, pz in pts], 0.4)
    rig.part("banner", g, PARCH, highlight=False, outline=0)
    g = Geo().slab([(bx + 13, 186), (bx + 6, 174), (bx + 13, 164)], FY - 4.4, 1.0)   # a rip (50%)
    rig.part("tear", g, ROSE_DK, outline=0, highlight=False)

    # round gate tower: rose ashlar, plinth, cornice, merlons and the rosebud dome
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, TH), TR, TR - 2, bevel=1.0, segs=32)
    rig.part("body", g, ROSE_DK)
    ring_blocks(rig, "body", TX, TY, TR, 10.0, TH - 8, [ROSE_LT, ROSE, ROSE_MID])
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, 12), TR + 3, TR + 1.5, bevel=1.0, segs=32)
    rig.part("body", g, ROSE_DKR)
    g = Geo()
    cyl(g, (TX, TY, TH - 8), (TX, TY, TH + 4), TR + 3, bevel=1.0, segs=32)
    cyl(g, (TX, TY, 92), (TX, TY, 95), TR + 1.6, bevel=0.6, segs=32)
    rig.part("body", g, TRIM_DK, outline=0.7)
    g, gm = Geo(), Geo()
    for i in range(10):
        a = math.pi * 2 * i / 10
        box(gm if i in (6, 7) else g, (TX + (TR + 1.5) * math.cos(a), TY + (TR + 1.5) * math.sin(a), TH + 9),
            (4, 4, 5), p=5)
    rig.part("body", g, ROSE_LT)
    rig.part("tmerlon", gm, ROSE_LT)
    rosebud_dome(rig)
    lancet(rig, "body", TX + 3, TY - TR - 0.2, 132, 6.5, 15.0, frame=TRIM_DK, mullion=False)
    lancet(rig, "body", TX + 6, TY - TR + 0.6, 66, 6.0, 13.0, frame=TRIM_DK, mullion=False)

    # gate: an arched door with iron bands and a cream arch moulding, a trellis of roses in front
    g = Geo().slab([(GX - 11, 0), (GX + 11, 0), (GX + 11, 22)] + [(GX + 11 * math.cos(a), 22 + 11 * math.sin(a)) for a in
                                                               [math.pi * k / 8 for k in range(1, 8)]] + [(GX - 11, 22)],
                   TY - TR - 0.6, 3.0)
    rig.part("body", g, WOOD)
    g = Geo()
    for z in (7, 18, 27):
        box(g, (GX, TY - TR - 2.6, z), (10.5, 0.8, 1.4), p=4, cuts=2)
    rig.part("body", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    for a in [math.pi * k / 10 for k in range(0, 11)]:
        box(g, (GX + 14 * math.cos(a), TY - TR - 1.6, 22 + 14 * math.sin(a)), (2.6, 1.6, 2.6), p=4, cuts=2)
    rig.part("body", g, TRIM, outline=0.5)

    # the turret platforms
    platform(rig, "body", M[0], WOOD, WOOD_DK, style="wood", r=(25, 16))
    rig.joint("rail", "body", (M[0][0], M[0][1], M[0][2]))
    g = Geo()
    x, y, z = M[0]
    g.capsule((x - 26, y - 13, z - 4), (x - 26, y + 10, z - 4), 1.2)
    rig.part("rail", g, WOOD_DK, outline=0.5)
    platform(rig, "body", M[1], TRIM, ROSE_DKR, style="stone", r=(25, 19))
    platform(rig, "body", M[2], WOOD, WOOD_DK, style="wood", r=(26, 18))
    platform(rig, "body", M[3], TRIM, ROSE_DKR, style="stone", r=(25, 19))

    lantern(rig, "body", TX + 10.0, TY - TR - 3.5, 36.0, arm=-6.0)
    lantern(rig, "body", KX + KW - 6.0, FY - 3.0, 38.0, arm=6.0)

    # roses: wine climbers up the keep and along the string course, a run that tears loose at 50%,
    # pink roses on the trellis, round bushes at the foot and flower boxes under the lancets
    wine = Roses(BLOOM, BLOOM_LT, BLOOM_DK, LEAF_DK, LEAF_LT, STEM)
    pink = Roses(PINK, PINK_LT, PINK_DK, LEAF_DK, LEAF_LT, STEM)
    vy = FY - 3.4
    wine.vine([(-157, vy, 4), (-155, vy, 40), (-159, vy, 78), (-152, vy, 116), (-157, vy, 150), (-151, vy, 184),
               (-156, vy, 214), (-150, vy, 236)], every=4.8, length=6.6, blooms=(0.12, 0.3, 0.46, 0.6, 0.76, 0.9, 0.99),
              bloom_r=6.6, seed=1)
    wine.vine([(-152, vy - 0.4, 151), (-140, vy - 0.6, 155), (-132, vy - 0.6, 149), (-126, vy - 0.6, 153)], every=4.4,
              length=6.0, blooms=(0.35, 0.95), bloom_r=6.0, seed=2)
    wine.vine([(-152, vy, 184), (-146, vy - 0.4, 212), (-138, vy - 0.4, 210), (-134, vy - 0.4, 192)], every=4.4, length=5.6,
              blooms=(0.38, 0.78), bloom_r=5.6, seed=3)
    # the climber on the gate tower's front-left
    tw = [(TX + (TR + 1.4) * math.cos(math.radians(a)), TY + (TR + 1.4) * math.sin(math.radians(a)), z)
          for a, z in ((236, 46), (242, 70), (232, 96), (244, 122), (236, 150), (246, 172))]
    wine.vine(tw, every=4.6, length=6.2, blooms=(0.25, 0.5, 0.72, 0.94), bloom_r=6.2, seed=4)
    wine.parts(rig, "body")
    droop = Roses(BLOOM, BLOOM_LT, BLOOM_DK, LEAF_DK, LEAF_LT, STEM)
    droop.vine([(-95, vy - 0.4, 156), (-86, vy - 0.4, 152), (-76, vy - 0.4, 157), (-66, vy - 0.4, 152), (-61, vy - 0.4, 155)],
               every=4.4, length=6.0, blooms=(0.12, 0.5, 0.92), bloom_r=6.0, seed=5)
    droop.parts(rig, "droop")
    trellis(rig)
    pink.bush((-147, FY - 11.0, 13.0), (20.0, 10.0, 15.0), blooms=6, bloom_r=6.0, seed=7)
    pink.bush((-80, FY - 10.0, 12.0), (16.0, 9.0, 13.0), blooms=5, bloom_r=5.6, seed=8)
    for x, z in ((KX - 34, 196), (KX - 34, 116), (KX + 34, 116)):
        g = Geo()
        box(g, (x, FY - 4.6, z - 15.6), (8.4, 3.0, 2.6), p=5)
        rig.part("body", g, WOOD, outline=0.5)
        for dx in (-5.0, 0.0, 5.0):
            pink.leaf((x + dx, FY - 5.6, z - 13.6), 4.6, 90 + dx * 9, light=dx == 0.0)
        pink.bloom((x - 4.6, FY - 7.2, z - 11.8), 3.8).bloom((x + 0.6, FY - 7.4, z - 11.0), 4.2).bloom((x + 5.4, FY - 7.2, z - 12.0), 3.6)
    # a flower box on the gate hoarding's front rail
    x, y, z = M[0]
    g = Geo()
    box(g, (x + 2, y - 15.0, z - 7.0), (12.0, 2.8, 2.6), p=5)
    rig.part("body", g, WOOD_DK, outline=0.5)
    for dx in (-8.0, -2.0, 4.0, 10.0):
        pink.leaf((x + 2 + dx, y - 16.4, z - 5.0), 4.2, 90 + dx * 6, light=dx > 0)
    pink.bloom((x - 4, y - 18.0, z - 3.6), 4.0).bloom((x + 4, y - 18.0, z - 3.0), 4.4).bloom((x + 11, y - 17.6, z - 3.8), 3.6)
    pink.parts(rig, "body")

    chipped_cracks(rig, "crack1", [[(KX - 20, FY - 2, 100), (KX - 14, FY - 2, 88), (KX - 20, FY - 2, 76)],
                                   [(TX - 8, TY - TR - 1, 160), (TX - 3, TY - TR - 1, 150), (TX - 7, TY - TR - 1, 140)]],
                   CRACK, CHIP)
    chipped_cracks(rig, "crack2", [[(KX + 20, FY - 2, 70), (KX + 26, FY - 2, 58), (KX + 20, FY - 2, 46)],
                                   [(KX - 40, FY - 2, 176), (KX - 34, FY - 2, 166), (KX - 40, FY - 2, 154)],
                                   [(TX + 6, TY - TR - 1, 80), (TX + 10, TY - TR - 1, 70), (TX + 6, TY - TR - 1, 60)]],
                   CRACK, CHIP)
    chipped_cracks(rig, "crack3", [[(KX + 22, FY - 2, 236), (KX + 28, FY - 2, 226), (KX + 22, FY - 2, 214)],
                                   [(KX + 30, FY - 2, 150), (KX + 36, FY - 2, 140), (KX + 30, FY - 2, 130)],
                                   [(TX - 4, TY - TR - 1, 110), (TX + 1, TY - TR - 1, 100)]], CRACK, CHIP)
    rubble(rig, "rubble1", [(-156, -40), (-136, -50)], ROSE_DK, seed=3)
    rubble(rig, "rubble2", [(-96, -52), (18, -46), (-66, -58)], ROSE_MID, seed=13)
    rubble(rig, "rubble3", [(-154, -60), (-124, -64), (-44, -62), (22, -56)], ROSE_DK, seed=23, size=1.2)
    # fallen petals and torn blooms on the ground (75% on)
    g, gl = Geo(), Geo()
    for k, (x, y) in enumerate(((-130, -40), (-116, -46), (-102, -38), (-74, -44), (-58, -50), (-160, -46), (-40, -40))):
        g.blob((x, y, 0.8), (2.6, 1.8, 0.7), p=2.0, cuts=3, rot=(0, 0, k * 37))
        gl.blob((x + 4, y - 2, 0.7), (2.2, 1.4, 0.6), p=2.0, cuts=3, rot=(0, 0, k * 53))
    rig.part("petals", g, PINK, outline=0.4)
    rig.part("petals", gl, BLOOM, outline=0.4)

    flag(rig, "root", "flagA", (TX - 2, TY + 6, TH + 84), length=30, height=16, pole=TH + 58)
    flag(rig, "root", "flagB", (SX, SY, KH + 110), length=26, height=14, pole=KH + 88)

    # Treasury: grain sacks and a basket of roses (1), a chest (2), a garden cart of gold with roses (3)
    g = Geo()
    for x, y in ((-156, -52), (-146, -58), (-152, -46)):
        g.blob((x, y, 9), (7, 6, 9), p=2.4, taper=(1.0, 0.7))
        g.blob((x, y, 18.5), (2.8, 2.6, 1.6), p=2.0)
    rig.part("treasury1", g, SACK)
    g = Geo()
    g.blob((-138, -50, 6), (8.0, 6.0, 6.0), p=2.6, taper=(0.8, 1.0))
    g.clip((0, 0, 9.5), (0, 0, 1))
    rig.part("treasury1", g, WOOD_LT, finish="hair")
    basket = Roses(PINK, PINK_LT, PINK_DK, LEAF_DK, LEAF_LT, STEM)
    for dx in (-4.0, 3.0):
        basket.leaf((-138 + dx, -56, 9.0), 4.4, 90 + dx * 12, light=dx > 0)
    basket.bloom((-141, -57, 11.5), 3.8).bloom((-135, -57, 12.0), 4.2).bloom((-138, -54, 14.5), 3.6)
    basket.parts(rig, "treasury1")
    g = Geo()
    box(g, (-122, -60, 7), (11, 7, 7), p=5)
    rig.part("treasury2", g, WOOD)
    g = Geo()
    g.blob((-122, -60, 14), (11, 7, 4.5), p=3.0)
    g.clip((0, 0, 14), (0, 0, -1))
    rig.part("treasury2", g, WINE)
    g = Geo()
    box(g, (-122, -67.5, 8), (2.4, 0.8, 3), p=4, cuts=2)
    for dx in (-9, 9):
        box(g, (dx - 122, -67.3, 9), (1.2, 0.6, 7), p=4, cuts=2)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.4)
    g = Geo()
    for dx, dz in ((-4, 18), (3, 19), (0, 21), (6, 17), (-7, 17)):
        g.blob((-122 + dx, -60, dz), (3.2, 3.2, 1.4), p=2.0)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-96, -66, 13), (16, 9, 5), p=6)
    rig.part("treasury3", g, WOOD)
    for dx in (-10, 10):
        g = Geo().lathe([(0, -1.2), (7, -1.2), (7, 1.2), (0, 1.2)], (-96 + dx, -76, 7), (-96 + dx, -77, 7), segs=16)
        rig.part("treasury3", g, WOOD_DK)
    g = Geo()
    for dx, dz in ((-8, 20), (-2, 22), (4, 21), (10, 19), (0, 25), (-5, 18), (7, 17)):
        g.blob((-96 + dx, -66, dz), (4.0, 4.0, 1.6), p=2.0)
    rig.part("treasury3", g, GOLD, finish="metal", outline=0.5)
    cart = Roses(BLOOM, BLOOM_LT, BLOOM_DK, LEAF_DK, LEAF_LT, STEM)
    cart.vine([(-111, -75.6, 14), (-104, -76.4, 10), (-96, -76.6, 12.5), (-88, -76.4, 10), (-81, -75.6, 14)], r=0.8,
              every=4.6, length=4.0, blooms=(0.2, 0.55, 0.88), bloom_r=3.6, seed=9)
    cart.parts(rig, "treasury3")


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "finial": {"hide": True}, "rubble1": {"show": True},
                     "tmerlon": {"hide": True}, "petals": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rail": {"r": -18.0, "z": -3.0},
                     "dark": {"show": True}, "win": {"hide": True}, "fire1": {"show": True},
                     "scorch": {"show": True}, "tear": {"show": True}, "banner": {"r": 5.0},
                     "rosecrack": {"show": True}, "droop": {"r": -24.0, "z": -4.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire2": {"show": True},
                     "breach": {"show": True}, "rosewin": {"hide": True}, "rosedark": {"show": True},
                     "rosecrack": {"hide": True},
                     "spire": {"r": 15.0, "x": -6.0, "z": -12.0},
                     "dome": {"r": -13.0, "x": 4.0, "z": -6.0},
                     "banner": {"r": 28.0, "x": 1.0, "z": -2.0},
                     "droop": {"r": -52.0, "z": -12.0, "x": -4.0},
                     "trellis": {"r": -11.0, "x": 1.5}})
    return pose


ROSE_KEEP = base_module(
    "medieval", "Rose Keep", height=330, width=180, canvas=(460, 820), feet=(350, 770),
    build=build, crumble=crumble, mount_depth=DEPTHS, skin="rose_keep",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((TX + 10.0, TY - TR - 6.0, 38.0), 3, 18), ((KX + KW - 6.0, FY - 5.0, 40.0), 3, 18),
            ((KX, FY - 2.0, KH + 26.0), 2, 34), ((KX - 34, FY - 2.0, 196.0), 2, 18)],
    smoke=[((KX, 0, KH + 40), 2), ((TX, TY, TH + 10), 3), ((KX + 16, FY, 70), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "stone",
        # the keep with its gable and spire falls toward the lane first, the gate tower a beat later
        "topple": [topple_lu(-178, -70, 150, delay_ms=0, push=1.0, sink_lu=40),
                   topple_lu(-70, 12, 120, delay_ms=140, push=0.85, sink_lu=26)],
        "rubbleColors": [ROSE, ROSE_DK, ROSE_LT, LEAF_DK],
        "dustColor": "#C9B2AA",
        "ambientLu": [ambient_lu("petals", (-154, FY - 4, 206), 14, 1.2), ambient_lu("petals", (-140, FY - 4, 156), 12, 0.8),
                      ambient_lu("petals", (GX, TY - TR - 12, 44), 14, 1.2), ambient_lu("petals", (-147, FY - 12, 22), 14, 0.8),
                      ambient_lu("petals", (-80, FY - 12, 20), 12, 0.7), ambient_lu("petals", (TX - 12, TY - TR - 4, 120), 12, 0.8)],
    },
)

SKINS = [ROSE_KEEP]
