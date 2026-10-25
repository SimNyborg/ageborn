"""Medieval Age base skins as real models (PLAN 2c): `base.medieval@<skin>`.

Snowbound Keep (Epic, Wardrobe Crate; round 2): a winter fortress that must not read as the Keep or Rose
Keep. Blue-grey slate walls end lower, under a huge steep hipped roof buried in a thick snow blanket whose
lower edge shows the team shingles, with two glowing dormers and a smoking chimney; a round watchtower
behind it wears a team onion dome with a snow cap and a gold spire; the round gate tower has snow on every
merlon and a flared team cone roof under snow. Icicles hang from every eave, sill and ledge; warm light
glows in many windows; evergreen garlands with wine berries frame the gate; a frozen moat runs along the
foot with a plank bridge and a snowman guard in a pot helmet and a team scarf. Team colour: the roof's
shingle band, the onion dome, the gate tower's cone, the dormer roofs, a long banner, the snowman's scarf.

Crumble: 75% cracks, the chimney's top lost, a dormer's snow slid off, snow and slate rubble; 50% the
hoarding and a window on fire, the banner torn, a dark window, the snowman's head knocked off, icicles
broken; 25% a breach in the keep wall, the onion dome knocked askew, the gate cone tilted, the roof burning.
Treasury: firewood and sacks (1), a chest of gold under snow (2), a sled of gold and gifts (3).

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

from world.base_skins_kit import Roses, ashlar, flames, icicles, icicles_at, lancet, lantern, ring_blocks, rose_window
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, crenels, cyl, flag, platform, prop_loop,
                          rubble, topple_lu, window)

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

# ---------------------------------------------------------------------------------------------------
# Snowbound Keep (round 2)

from mathutils import Matrix  # noqa: E402

SLATE = "#6E7985"        # blue-grey slate (large areas)
SLATE_LT = "#808B98"
SLATE_MID = "#76818E"
SLATE_DK = "#5B6571"
SLATE_DKR = "#4D5661"
SNOW = "#F2F4F4"
SNOW_DK = "#DCE3E7"
ICE_LT = "#E4F2F7"
PINE = "#3F6B4A"         # evergreen garlands
PINE_LT = "#55835C"
BERRY = "#8E2A4A"
COAL = "#2A2A2E"
CARROT = "#D9874A"
WARM = "#FFD89A"
S_CRACK = "#3B414A"
S_SOOT = "#4E4E54"
MOAT = "#C9DEE6"

SW = 200.0               # the hall's wall height (the roof rises over it)
RIDGE = 268.0
WX, WY = KX - 38.0, KY + 26.0     # the watchtower behind the hall (the Keep's corner turret spot)
GTX, GTY, GTR, GTH = -22.0, -2.0, 22.0, 178.0                      # the gate tower


def hipped_roof(g, x0, x1, y0, y1, z0, rx0, rx1, ry, z1):
    """A hipped roof solid: eaves rectangle x0..x1 / y0..y1 at z0, ridge from rx0 to rx1 at y = ry, z1."""
    v = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (rx0, ry, z1), (rx1, ry, z1)]
    f = [(0, 1, 5, 4), (2, 3, 4, 5), (3, 0, 4), (1, 2, 5), (3, 2, 1, 0)]
    g._add(v, f, Matrix.Identity(4), smooth=False)
    return g


def snow_platform(rig, joint, m, style, top, side, r, seed=0, icicle_seed=0):
    """A turret platform (stone corbels or a timber hoarding) under a snow cushion whose top is exactly at the
    mount m, with icicles along its front edge."""
    x, y, z = m
    platform(rig, joint, (x, y, z - 2.6), top, side, style=style, r=r)
    rx, ry = r
    g = Geo()
    g.blob((x - 2, y + 5, z - 2.0), (rx - 0.6, ry - 0.4, 3.0), p=2.6, cuts=4)
    g.clip((0, 0, z), (0, 0, 1))
    rig.part(joint, g, SNOW, finish="gloss", outline=0.5)
    g = Geo()
    icicles(g, x - 2 - rx * 0.8, x - 2 + rx * 0.8, y + 5 - ry * 0.95, z - 4.6, length=(4, 9), r=(1.0, 1.7), every=4.4,
            seed=icicle_seed)
    rig.part(joint, g, ICE_LT, finish="gloss", outline=0.3)


def garland(rig, joint, pts, seed=0):
    """An evergreen garland along a path with wine berries."""
    import random as _r
    rnd = _r.Random(seed)
    g, gl, b = Geo(), Geo(), Geo()
    for a, c in zip(pts, pts[1:]):
        for k in range(4):
            t = k / 4.0
            p = tuple(a[i] + (c[i] - a[i]) * t for i in range(3))
            (g if k % 2 else gl).blob((p[0] + rnd.uniform(-1, 1), p[1], p[2] + rnd.uniform(-1, 1)), (3.6, 2.4, 3.0), p=2.0, cuts=3,
                                      rot=(0, rnd.uniform(0, 90), 0))
            if rnd.random() < 0.45:
                b.sphere((p[0] + rnd.uniform(-2, 2), p[1] - 2.4, p[2] + rnd.uniform(-1.5, 1.5)), 1.2, cuts=2)
    rig.part(joint, g, PINE, finish="hair", outline=0.5)
    rig.part(joint, gl, PINE_LT, finish="hair", outline=0.5)
    rig.part(joint, b, BERRY, finish="gloss", outline=0.3)


def build_snowy(rig, M):
    fy = KY - KD                      # the hall's front face (y = -24)
    for j, pos in (("chimtop", (-74, 30, 282)), ("dsnow", (-130, -10, 236)), ("onion", (WX, WY, 272)),
                   ("gcone", (GTX - 2, GTY + 6, GTH + 6)), ("banner", (KX - 30, fy - 3.0, 182)),
                   ("smhead", (-60, -64, 26)), ("icA", (-110, -30, 196)), ("tmerlon", (GTX, GTY, GTH + 4))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "dark", "fire1", "fire2", "scorch", "breach",
              "tear", "smfallen"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # damage fires: the gate hoarding and a window (50%); the roof and the watchtower (25%)
    flames(rig, "fire1", [(M[0][0] - 10, M[0][1] - 14, M[0][2] - 4, 1.0), (M[0][0] + 12, M[0][1] - 12, M[0][2] - 6, 0.75),
                          (KX + 30, fy - 4, 150, 0.8)])
    flames(rig, "fire2", [(KX - 30, fy - 14, 214, 1.3), (KX + 10, fy - 10, 226, 1.0), (WX + 6, WY - 18, 250, 0.9),
                          (KX + 36, fy - 4, 80, 0.8)])
    g = Geo()
    for x, z, rx, rz in ((KX + 30, 166, 12, 12), (GTX + 2, 132, 10, 12), (M[0][0] - 2, M[0][2] - 12, 18, 7)):
        g.blob((x, -40 if x > -60 else fy - 3.4, z), (rx, 2.6, rz), p=2.2, taper=(1.0, 0.6))
    rig.part("scorch", g, S_SOOT, outline=0, highlight=False)
    # a ragged breach in the hall wall (25%)
    bx0, bz0 = KX + 14, 70
    pts = [(bx0 - 16, bz0 - 12), (bx0 - 6, bz0 - 18), (bx0 + 8, bz0 - 14), (bx0 + 18, bz0 - 4), (bx0 + 14, bz0 + 10),
           (bx0 + 4, bz0 + 18), (bx0 - 10, bz0 + 14), (bx0 - 18, bz0 + 2)]
    g = Geo().slab(pts, fy - 2.4, 1.2)
    rig.part("breach", g, "#24282E", outline=0, highlight=False)
    g = Geo().capsule((bx0 - 12, fy - 3.4, bz0 - 6), (bx0 + 10, fy - 3.4, bz0 + 8), 1.6)
    g.capsule((bx0 - 8, fy - 3.4, bz0 + 10), (bx0 + 12, fy - 3.4, bz0 - 4), 1.4)
    rig.part("breach", g, WOOD_DK, outline=0.4)
    g = Geo()
    for x, z, r in ((bx0 - 18, bz0 - 12, 4.0), (bx0 + 16, bz0 - 12, 3.4), (bx0 + 18, bz0 + 8, 3.0), (bx0 - 16, bz0 + 12, 3.2)):
        g.blob((x, fy - 3.0, z), (r, 2.6, r * 0.8), p=2.6)
    rig.part("breach", g, SLATE_LT, outline=0.5)

    # the watchtower behind the hall: slate, a corbelled ring with snow-capped crenels, the team onion dome
    g = Geo()
    cyl(g, (WX, WY, 120), (WX, WY, 262), 17, bevel=0.8, segs=24)
    rig.part("body", g, SLATE_MID)
    ring_blocks(rig, "body", WX, WY, 17, 206, 258, [SLATE_LT, SLATE, SLATE_MID], h=11.0, n=7)
    g = Geo()
    cyl(g, (WX, WY, 258), (WX, WY, 266), 20, bevel=0.8, segs=24)
    rig.part("body", g, SLATE_DK, outline=0.6)
    g, gs = Geo(), Geo()
    for i in range(8):
        a = math.pi * 2 * i / 8 + 0.2
        px, py = WX + 19 * math.cos(a), WY + 19 * math.sin(a)
        box(g, (px, py, 270), (3.4, 3.4, 4.0), p=5)
        gs.blob((px, py, 274.4), (4.2, 4.2, 2.6), p=2.2, cuts=3)
    rig.part("body", g, SLATE_LT)
    rig.part("body", gs, SNOW, finish="gloss", outline=0.4)
    window(rig, "body", WX + 4, WY - 17, 236, 6, 12, glow_hex=WARM)
    g = Geo().lathe([(0, 0), (15, 0), (19, 9), (20, 17), (17.5, 27), (11, 37), (5, 45), (1.6, 50), (0, 53)], (WX, WY, 272),
                    (WX, WY, 325), segs=28)
    rig.part("onion", g, team=True)
    g = Geo()
    for i in range(6):
        a = math.radians(200 + i * 28)
        pts = [(WX + math.cos(a) * rr, WY + math.sin(a) * rr, z) for rr, z in ((15.4, 272.5), (19.4, 281), (20.4, 289),
                                                                                  (18.0, 299), (11.4, 309), (5.4, 317))]
        for a_, b_ in zip(pts, pts[1:]):
            g.capsule(a_, b_, 0.9, segs=6, rings=1)
    rig.part("onion", g, GOLD, finish="metal", outline=0.3)
    g = Geo().lathe([(0, 0), (12.0, 0), (12.6, 2.0), (9.0, 7.0), (4.4, 12.0), (1.4, 15.0), (0, 16.0)], (WX, WY, 305), (WX, WY, 321),
                    segs=24)
    rig.part("onion", g, SNOW, finish="gloss", outline=0.5)
    g = Geo()
    cyl(g, (WX, WY, 320), (WX, WY, 330), 1.2, 0.8, bevel=0.2)
    g.sphere((WX, WY, 331.5), 2.4, cuts=3)
    rig.part("onion", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    icicles_at(g, [(WX + math.cos(math.radians(a)) * 17.5, WY + math.sin(math.radians(a)) * 17.5, 272) for a in range(200, 345, 16)],
               length=(5, 10), r=(1.0, 1.6), seed=31)
    rig.part("onion", g, ICE_LT, finish="gloss", outline=0.3)

    # the hall: slate core, ashlar front, plinth, string course, quoins; the hipped roof under snow
    g = Geo()
    box(g, (KX, KY, SW / 2), (KW, KD, SW / 2), p=10)
    rig.part("body", g, SLATE_DK)
    ashlar(rig, "body", KX - KW + 2, KX + KW - 2, 18, SW - 8, fy - 0.6, [SLATE, SLATE_LT, SLATE_MID], h=12.0, w=(16.0, 24.0), seed=5)
    g = Geo()
    for z in range(24, int(SW) - 8, 12):
        box(g, (KX + KW + 0.6, KY + 2, z), (0.8, KD - 4, 0.7), p=4, cuts=2)
    rig.part("body", g, SLATE_DKR, outline=0)
    g = Geo()
    box(g, (KX, KY - 2, 9), (KW + 5, KD + 4, 9), p=6, taper=(1.0, 0.96))
    rig.part("body", g, SLATE_DKR)
    g = Geo()
    box(g, (KX, KY - 1, 140), (KW + 2.5, KD + 2.5, 3.0), p=6)
    box(g, (KX, KY - 1, SW - 2), (KW + 3.5, KD + 3.5, 3.4), p=6)
    rig.part("body", g, SLATE_LT, outline=0.7)
    g = Geo()
    hipped_roof(g, KX - KW - 5, KX + KW + 8, fy - 8, KY + KD + 8, SW - 4, KX - 30, KX + 30, KY, RIDGE)
    rig.part("body", g, team=True)
    # the snow blanket: a thicker copy of the roof cut off above the shingle band, a lumpy lower edge
    g = Geo()
    hipped_roof(g, KX - KW - 6.5, KX + KW + 9.5, fy - 9.5, KY + KD + 9.5, SW - 6.4, KX - 31, KX + 31, KY, RIDGE + 5.0)
    g.clip((0, 0, SW + 14), (0, 0, -1))
    rig.part("body", g, SNOW, finish="gloss")
    g = Geo()
    import random as _r
    rnd = _r.Random(41)
    edge = []
    for k in range(13):
        x = KX - KW + 1 + k * (2 * KW + 1) / 12
        y = fy - 9.5 + (SW + 14 - (SW - 6.4)) * (54 + 9.5) / (RIDGE + 5 - (SW - 6.4)) * 0.0
        edge.append(x)
        g.blob((x, fy + 4.0, SW + 14.5), (rnd.uniform(6.5, 9.0), 6.0, rnd.uniform(3.6, 5.0)), p=2.2, cuts=3)
    rig.part("body", g, SNOW, finish="gloss")
    g = Geo()
    g.capsule((KX - 31, KY, RIDGE + 6.0), (KX + 31, KY, RIDGE + 6.0), 6.0, segs=12, rings=3)
    rig.part("body", g, SNOW, finish="gloss", outline=0.5)
    # soft drifts on the slope (between the dormers and at the hips), a cooler shade under the ridge
    g = Geo()
    t_ = lambda z: fy - 9.5 + (z - (SW - 6.4)) / (RIDGE + 5.0 - (SW - 6.4)) * (KY - (fy - 9.5))
    for x, z, rx, rz in ((KX - 48, 226, 10, 5), (KX, 232, 12, 5.5), (KX + 46, 224, 10, 5), (KX - 20, 254, 14, 5), (KX + 18, 252, 12, 5)):
        g.blob((x, t_(z) - 3.0, z), (rx, 5.0, rz), p=2.2, cuts=3)
    rig.part("body", g, SNOW, finish="gloss", outline=0.4)
    g = Geo()
    icicles(g, KX - KW - 3, KX + KW + 6, fy - 8.6, SW - 4.5, length=(6, 14), r=(1.3, 2.2), every=4.6, seed=6)
    rig.part("icA", g, ICE_LT, finish="gloss", outline=0.4)

    # dormers on the roof's front slope (team mini roofs, warm windows; one's snow slides at 75%)
    for i, dx in enumerate((-22.0, 22.0)):
        x = KX + dx
        yd = fy + 4.0
        g = Geo()
        box(g, (x, yd + 6, 222), (9, 7, 10), p=6)
        rig.part("body", g, SLATE_LT)
        g = Geo().slab([(x - 12, 230), (x + 12, 230), (x, 244)], yd + 6, 16)
        rig.part("body", g, team=True, outline=0.5)
        window(rig, "body", x, yd - 1.4, 220, 6.5, 11, glow_hex=WARM, frame=WOOD_DK)
        g = Geo()
        g.blob((x, yd + 4, 240), (9.0, 8.4, 4.0), p=2.2, cuts=3, rot=(0, 0, 0))
        rig.part("dsnow" if i == 0 else "body", g, SNOW, finish="gloss", outline=0.5)
    # the chimney on the right of the roof (its top falls at 75%), smoking
    g = Geo()
    box(g, (-74, 30, 252), (7, 7, 30), p=6)
    rig.part("body", g, SLATE_MID)
    g = Geo()
    box(g, (-74, 30, 283), (8.4, 8.4, 3.0), p=6)
    rig.part("chimtop", g, SLATE_DKR)
    g = Geo()
    g.blob((-74, 30, 287), (8.6, 8.6, 3.2), p=2.2, cuts=3)
    rig.part("chimtop", g, SNOW, finish="gloss", outline=0.4)

    # windows on the hall: warm light, wooden shutters, snow on the sills; one goes dark at 50%
    for x, z in ((KX - 34, 112), (KX, 112), (KX + 34, 112), (KX - 34, 166), (KX + 34, 166)):
        lancet(rig, "body", x, fy - 1.2, z, 9.0, 19.0, glow_hex=WARM, frame=SLATE_DKR)
        g = Geo()
        g.blob((x, fy - 4.0, z - 12.4), (7.4, 3.6, 2.2), p=2.2, cuts=3)
        rig.part("body", g, SNOW, finish="gloss", outline=0.4)
        g = Geo()
        icicles(g, x - 6, x + 6, fy - 4.8, z - 13.6, length=(3, 7), r=(0.8, 1.2), every=2.8, seed=int(-x + z))
        rig.part("body", g, ICE_LT, finish="gloss", outline=0.3)
    lancet(rig, "dark", KX + 34, fy - 2.2, 112, 9.4, 19.4, glow_hex="#24282E", frame=SLATE_DKR, mullion=False)
    rig.joint("win", "body", (0, 0, 0))
    lancet(rig, "win", KX + 34, fy - 1.2, 112, 9.0, 19.0, glow_hex=WARM, frame=SLATE_DKR)

    # the long team banner with a parchment snowflake
    bx = KX - 30
    ban = Geo().slab([(bx - 11, 182), (bx + 11, 182), (bx + 11, 128), (bx, 119), (bx - 11, 128)], fy - 3.0, 1.6)
    rig.part("banner", ban, team=True)
    g = Geo().capsule((bx - 13, fy - 3.6, 183), (bx + 13, fy - 3.6, 183), 1.4)
    rig.part("body", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    for a in range(0, 180, 60):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.capsule((bx - ca * 7.0, fy - 4.2, 156 - sa * 7.0), (bx + ca * 7.0, fy - 4.2, 156 + sa * 7.0), 0.9, segs=6, rings=1)
        for s_ in (-1, 1):
            tx, tz = bx + s_ * ca * 4.6, 156 + s_ * sa * 4.6
            for b_ in (-1, 1):
                aa = math.radians(a + b_ * 35)
                g.capsule((tx, fy - 4.2, tz), (tx + s_ * math.cos(aa) * 2.6, fy - 4.2, tz + s_ * math.sin(aa) * 2.6), 0.6, segs=6, rings=1)
    rig.part("banner", g, PARCH, highlight=False, outline=0)
    g = Geo().slab([(bx + 11, 160), (bx + 4, 150), (bx + 11, 140)], fy - 4.4, 1.0)   # a rip (50%)
    rig.part("tear", g, SLATE_DK, outline=0, highlight=False)

    # the round gate tower: slate blocks, a snow-capped crenellation, a flared team cone under snow
    g = Geo()
    cyl(g, (GTX, GTY, 0), (GTX, GTY, GTH), GTR, GTR - 2, bevel=1.0, segs=32)
    rig.part("body", g, SLATE_DK)
    ring_blocks(rig, "body", GTX, GTY, GTR, 10.0, GTH - 8, [SLATE_LT, SLATE, SLATE_MID])
    g = Geo()
    cyl(g, (GTX, GTY, 0), (GTX, GTY, 12), GTR + 3, GTR + 1.5, bevel=1.0, segs=32)
    cyl(g, (GTX, GTY, GTH - 8), (GTX, GTY, GTH + 4), GTR + 3, bevel=1.0, segs=32)
    rig.part("body", g, SLATE_DKR)
    g, gm, gs, gsm = Geo(), Geo(), Geo(), Geo()
    for i in range(10):
        a = math.pi * 2 * i / 10
        px, py = GTX + (GTR + 1.5) * math.cos(a), GTY + (GTR + 1.5) * math.sin(a)
        box(gm if i in (6, 7) else g, (px, py, GTH + 9), (4, 4, 5), p=5)
        (gsm if i in (6, 7) else gs).blob((px, py, GTH + 14.4), (4.8, 4.8, 2.8), p=2.2, cuts=3)
    rig.part("body", g, SLATE_LT)
    rig.part("tmerlon", gm, SLATE_LT)
    rig.part("body", gs, SNOW, finish="gloss", outline=0.4)
    rig.part("tmerlon", gsm, SNOW, finish="gloss", outline=0.4)
    g = Geo().lathe([(0, 0), (GTR + 1, 0), (GTR - 1.0, 3.0), (GTR - 7.0, 14.0), (0.6, 50.0), (0, 52.0)], (GTX - 2, GTY + 6, GTH + 6),
                    (GTX - 2, GTY + 6, GTH + 58), segs=24)
    rig.part("gcone", g, team=True)
    g = Geo().lathe([(GTR - 10.4, 0), (GTR - 11.6, 3.0), (GTR - 14.2, 9.0), (2.6, 22.0), (0.8, 26.0), (0, 27.0)],
                    (GTX - 2, GTY + 6, GTH + 32.0), (GTX - 2, GTY + 6, GTH + 59.4), segs=24)
    rig.part("gcone", g, SNOW, finish="gloss", outline=0.5)
    g = Geo()
    cyl(g, (GTX - 2, GTY + 6, GTH + 57), (GTX - 2, GTY + 6, GTH + 64), 1.0, 0.7, bevel=0.2)
    g.sphere((GTX - 2, GTY + 6, GTH + 65), 2.0, cuts=3)
    rig.part("gcone", g, GOLD, finish="metal", outline=0.4)
    g = Geo()
    icicles_at(g, [(GTX - 2 + math.cos(math.radians(a)) * (GTR + 0.6), GTY + 6 + math.sin(math.radians(a)) * (GTR + 0.6), GTH + 6.4)
                   for a in range(196, 350, 14)], length=(5, 11), r=(1.1, 1.8), seed=33)
    rig.part("gcone", g, ICE_LT, finish="gloss", outline=0.3)
    lancet(rig, "body", GTX + 3, GTY - GTR - 0.2, 128, 6.5, 15.0, glow_hex=WARM, frame=SLATE_DKR, mullion=False)
    lancet(rig, "body", GTX + 6, GTY - GTR + 0.6, 62, 6.0, 13.0, glow_hex=WARM, frame=SLATE_DKR, mullion=False)

    # the gate: an arched door with iron bands, a slate arch, an evergreen garland with berries, lanterns
    gx = GTX - 6
    g = Geo().slab([(gx - 11, 0), (gx + 11, 0), (gx + 11, 22)] + [(gx + 11 * math.cos(a), 22 + 11 * math.sin(a)) for a in
                                                                 [math.pi * k / 8 for k in range(1, 8)]] + [(gx - 11, 22)],
                   GTY - GTR - 0.6, 3.0)
    rig.part("body", g, WOOD)
    g = Geo()
    for z in (7, 18, 27):
        box(g, (gx, GTY - GTR - 2.6, z), (10.5, 0.8, 1.4), p=4, cuts=2)
    rig.part("body", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    for a in [math.pi * k / 10 for k in range(0, 11)]:
        box(g, (gx + 14 * math.cos(a), GTY - GTR - 1.6, 22 + 14 * math.sin(a)), (2.6, 1.6, 2.6), p=4, cuts=2)
    rig.part("body", g, SLATE_LT, outline=0.5)
    garland(rig, "body", [(gx - 16, GTY - GTR - 4.0, 18), (gx - 12, GTY - GTR - 4.0, 32), (gx, GTY - GTR - 4.0, 39),
                          (gx + 12, GTY - GTR - 4.0, 32), (gx + 16, GTY - GTR - 4.0, 18)], seed=3)
    g = Geo()
    g.blob((gx, GTY - GTR - 3.4, 38.6), (14, 3.2, 2.4), p=2.2, cuts=3)
    rig.part("body", g, SNOW, finish="gloss", outline=0.4)
    lantern(rig, "body", GTX + 10.0, GTY - GTR - 3.5, 34.0, arm=-6.0)
    lantern(rig, "body", KX + KW - 6.0, fy - 3.0, 36.0, arm=6.0)

    # the turret platforms under snow cushions with icicles (hoardings by the gate and on the tower top)
    snow_platform(rig, "body", M[0], "wood", WOOD, WOOD_DK, (25, 16), icicle_seed=51)
    rig.joint("rail", "body", (M[0][0], M[0][1], M[0][2]))
    g = Geo()
    x, y, z = M[0]
    g.capsule((x - 26, y - 13, z - 4), (x - 26, y + 10, z - 4), 1.2)
    rig.part("rail", g, WOOD_DK, outline=0.5)
    snow_platform(rig, "body", M[1], "stone", SLATE_LT, SLATE_DKR, (25, 19), icicle_seed=52)
    snow_platform(rig, "body", M[2], "wood", WOOD, WOOD_DK, (26, 18), icicle_seed=53)
    snow_platform(rig, "body", M[3], "stone", SLATE_LT, SLATE_DKR, (25, 19), icicle_seed=54)
    garland(rig, "body", [(M[0][0] - 24, M[0][1] - 17, M[0][2] - 6), (M[0][0] - 8, M[0][1] - 18, M[0][2] - 10),
                          (M[0][0] + 10, M[0][1] - 17, M[0][2] - 6)], seed=5)

    # the frozen moat along the foot, its snowy banks, a plank bridge to the gate and drifts
    g = Geo()
    g.blob((-74, -56, 0.6), (84, 8, 1.4), p=4.0, cuts=4)
    rig.part("body", g, MOAT, finish="gloss", outline=0.5)
    g = Geo()
    for k in range(5):
        x = -150 + k * 34
        g.capsule((x, -55, 1.6), (x + 9, -57, 1.6), 0.5, segs=6, rings=1)
    rig.part("body", g, ICE_LT, finish="gloss", outline=0)
    g = Geo()
    for x, y, rx, rz in ((-150, -44, 9, 6), (-140, -66, 11, 5), (-110, -68, 18, 5), (-78, -68, 16, 4.6), (-40, -66, 14, 4.6),
                         (-130, -44, 16, 6), (-60, -44, 14, 5), (6, -56, 11, 5)):
        g.blob((x, y, 0.4), (rx, 7, rz), p=2.2, cuts=4)
    g.clip((0, 0, 0.2), (0, 0, -1))
    rig.part("body", g, SNOW, finish="gloss")
    g = Geo()
    for k in range(5):
        box(g, (gx - 8 + k * 4.2, -56, 3.0), (1.9, 9.0, 1.0), p=5, cuts=2)
    rig.part("body", g, WOOD, outline=0.4)
    g = Geo()
    for dx in (-12, 12):
        g.capsule((gx + dx * 0.9, -64, 0), (gx + dx * 0.9, -64, 8), 1.0)
    rig.part("body", g, WOOD_DK, outline=0.4)

    # the snowman guard: three snowballs, coal eyes and buttons, a carrot nose, a pot helmet, a team scarf,
    # twig arms and a spear (its head is knocked off at 50%, lying in the snow)
    sx, sy = -60.0, -64.0
    g = Geo()
    g.sphere((sx, sy, 8.0), 8.6, cuts=4)
    g.sphere((sx, sy, 20.0), 6.4, cuts=4)
    rig.part("body", g, SNOW, finish="gloss")
    g = Geo()
    g.sphere((sx, sy, 29.4), 4.8, cuts=4)
    rig.part("smhead", g, SNOW, finish="gloss")
    g = Geo()
    for dz in (17.0, 21.6):
        g.sphere((sx + 0.6, sy - 6.0, dz), 0.9, cuts=2)
    rig.part("body", g, COAL, outline=0, highlight=False)
    g = Geo()
    g.sphere((sx - 1.6, sy - 4.2, 30.6), 0.8, cuts=2).sphere((sx + 1.8, sy - 4.2, 30.6), 0.8, cuts=2)
    rig.part("smhead", g, COAL, outline=0, highlight=False)
    g = Geo().lathe([(1.0, 0), (0, 4.2)], (sx + 0.4, sy - 4.4, 29.4), (sx + 4.4, sy - 6.0, 29.0), segs=8)
    rig.part("smhead", g, CARROT, outline=0.3)
    g = Geo()
    cyl(g, (sx, sy, 32.6), (sx, sy, 36.4), 4.6, 3.8, bevel=0.6, segs=16)
    rig.part("smhead", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    g.lathe([(5.6, -1.6), (6.4, 0), (5.6, 1.6)], (sx, sy, 24.6), segs=16)
    g.slab([(sx + 3.0, 24.0), (sx + 6.4, 24.0), (sx + 7.4, 14.0), (sx + 4.0, 15.0)], sy - 4.0, 1.2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    g.capsule((sx - 5.6, sy, 21.0), (sx - 12.0, sy - 1.0, 26.0), 0.6, segs=6, rings=1)
    g.capsule((sx + 5.6, sy, 21.0), (sx + 9.6, sy - 1.6, 22.0), 0.6, segs=6, rings=1)
    g.capsule((sx + 9.6, sy - 1.8, 4.0), (sx + 10.6, sy - 1.8, 40.0), 0.7)
    rig.part("body", g, WOOD_DK, outline=0.3)
    g = Geo().lathe([(1.6, 0), (0, 5.0)], (sx + 10.6, sy - 1.8, 40.0), (sx + 10.8, sy - 1.8, 45.0), segs=6)
    rig.part("body", g, IRON, finish="metal", outline=0.3)
    g = Geo()
    g.sphere((sx - 12.0, sy - 6.0, 4.4), 4.8, cuts=4)
    rig.part("smfallen", g, SNOW, finish="gloss")
    g = Geo().lathe([(1.0, 0), (0, 4.2)], (sx - 12.0, sy - 10.6, 4.4), (sx - 16.0, sy - 11.6, 4.4), segs=8)
    rig.part("smfallen", g, CARROT, outline=0.3)
    g = Geo()
    cyl(g, (sx - 6.0, sy - 8.0, 2.0), (sx - 7.0, sy - 9.0, 5.8), 4.6, 3.8, bevel=0.6, segs=16)
    rig.part("smfallen", g, IRON, finish="metal", outline=0.4)

    chipped_cracks(rig, "crack1", [[(KX - 20, fy - 2, 100), (KX - 14, fy - 2, 88), (KX - 20, fy - 2, 76)],
                                   [(GTX - 8, GTY - GTR - 1, 160), (GTX - 3, GTY - GTR - 1, 150), (GTX - 7, GTY - GTR - 1, 140)]],
                   S_CRACK, SLATE_LT)
    chipped_cracks(rig, "crack2", [[(KX + 20, fy - 2, 70), (KX + 26, fy - 2, 58), (KX + 20, fy - 2, 46)],
                                   [(KX - 40, fy - 2, 150), (KX - 34, fy - 2, 140), (KX - 40, fy - 2, 128)],
                                   [(GTX + 6, GTY - GTR - 1, 80), (GTX + 10, GTY - GTR - 1, 70), (GTX + 6, GTY - GTR - 1, 60)]],
                   S_CRACK, SLATE_LT)
    chipped_cracks(rig, "crack3", [[(KX, fy - 2, 190), (KX + 6, fy - 2, 180), (KX, fy - 2, 168)],
                                   [(KX + 30, fy - 2, 146), (KX + 36, fy - 2, 136), (KX + 30, fy - 2, 126)],
                                   [(GTX - 4, GTY - GTR - 1, 110), (GTX + 1, GTY - GTR - 1, 100)]], S_CRACK, SLATE_LT)
    for j, pts2, seed, size in (("rubble1", [(-156, -40), (-136, -50)], 3, 1.0), ("rubble2", [(-96, -52), (18, -46), (-66, -58)], 13, 1.0),
                                ("rubble3", [(-154, -60), (-124, -64), (-44, -62), (22, -56)], 23, 1.2)):
        rubble(rig, j, pts2, SLATE_DK, seed=seed, size=size)
        g = Geo()
        for k, (x2, y2) in enumerate(pts2):
            g.blob((x2 + 8, y2 - 4, 2.4), (6.0, 4.4, 3.0), p=2.2, cuts=3)
        rig.part(j, g, SNOW, finish="gloss", outline=0.5)
    g = Geo()
    box(g, (-60, -40, 3.0), (8.4, 8.4, 3.0), p=6, rot=(0, 18, 30))
    rig.part("rubble1", g, SLATE_DKR)

    flag(rig, "root", "flagA", (GTX - 2, GTY + 6, GTH + 92), length=30, height=16, pole=GTH + 62)
    flag(rig, "root", "flagB", (WX - 14, WY + 2, 352), length=26, height=14, pole=264)

    # Treasury: firewood and sacks (1), a chest of gold under snow (2), a sled of gold and gifts (3)
    g = Geo()
    for k, (x, y) in enumerate(((-156, -52), (-146, -58))):
        g.blob((x, y, 9), (7, 6, 9), p=2.4, taper=(1.0, 0.7))
        g.blob((x, y, 18.5), (2.8, 2.6, 1.6), p=2.0)
    rig.part("treasury1", g, SACK)
    g = Geo()
    for row in range(3):
        for k in range(4 - row):
            x = -168 + k * 6.0 + row * 3.0
            g.capsule((x, -52, 3.4 + row * 5.6), (x, -64, 3.4 + row * 5.6), 2.8, segs=10, rings=2)
    rig.part("treasury1", g, WOOD, outline=0.5)
    g = Geo()
    g.blob((-160, -58, 20.0), (10, 6, 2.6), p=2.2, cuts=3)
    rig.part("treasury1", g, SNOW, finish="gloss", outline=0.4)
    g = Geo()
    box(g, (-136, -60, 7), (11, 7, 7), p=5)
    rig.part("treasury2", g, WOOD)
    g = Geo()
    g.blob((-136, -60, 14), (11, 7, 4.5), p=3.0)
    g.clip((0, 0, 14), (0, 0, -1))
    rig.part("treasury2", g, WINE)
    g = Geo()
    g.blob((-136, -60, 18.4), (10, 6.4, 2.2), p=2.2, cuts=3)
    rig.part("treasury2", g, SNOW, finish="gloss", outline=0.4)
    g = Geo()
    box(g, (-136, -67.5, 8), (2.4, 0.8, 3), p=4, cuts=2)
    for dx in (-9, 9):
        box(g, (dx - 136, -67.3, 9), (1.2, 0.6, 7), p=4, cuts=2)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.4)
    g = Geo()
    box(g, (-100, -68, 9), (16, 8, 3), p=6)
    rig.part("treasury3", g, WOOD)
    g = Geo()
    for dy in (-8, 8):
        pts3 = [(-120, -68 + dy, 2), (-114, -68 + dy, 0.8), (-82, -68 + dy, 0.8), (-78, -68 + dy, 4), (-80, -68 + dy, 8)]
        for a_, b_ in zip(pts3, pts3[1:]):
            g.capsule(a_, b_, 1.1, segs=8, rings=1)
    rig.part("treasury3", g, IRON, finish="metal", outline=0.3)
    g = Geo()
    for dx, dz in ((-8, 15), (-2, 17), (4, 16), (10, 14), (0, 20)):
        g.blob((-100 + dx, -68, dz), (4.0, 4.0, 1.6), p=2.0)
    rig.part("treasury3", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-110, -70, 17), (4.6, 4.6, 4.6), p=6, rot=(0, 0, 18))
    rig.part("treasury3", g, BERRY)
    g = Geo()
    box(g, (-110, -74.8, 17), (0.8, 0.3, 4.8), p=4, cuts=2)
    box(g, (-110, -74.8, 17), (4.8, 0.3, 0.8), p=4, cuts=2)
    rig.part("treasury3", g, GOLD, finish="metal", outline=0.2)
    g = Geo().slab([(-116, 13), (-90, 13), (-92, 6), (-114, 6)], -76.6, 1.0)
    rig.part("treasury3", g, team=True, outline=0.4)


def crumble_snowy(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "chimtop": {"hide": True}, "rubble1": {"show": True}, "dsnow": {"hide": True},
                     "tmerlon": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rail": {"r": -18.0, "z": -3.0},
                     "dark": {"show": True}, "win": {"hide": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "tear": {"show": True}, "banner": {"r": 5.0}, "smhead": {"hide": True}, "smfallen": {"show": True},
                     "icA": {"hide": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire2": {"show": True}, "breach": {"show": True},
                     "onion": {"r": 14.0, "x": -5.0, "z": -10.0}, "gcone": {"r": -12.0, "x": 4.0, "z": -6.0},
                     "banner": {"r": 28.0, "x": 1.0, "z": -2.0}})
    return pose


SNOWY_KEEP = base_module(
    "medieval", "Snowbound Keep", height=330, width=180, canvas=(460, 820), feet=(350, 770),
    build=build_snowy, crumble=crumble_snowy, mount_depth=DEPTHS, skin="snowy_keep",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((GTX + 10.0, GTY - GTR - 6.0, 36.0), 3, 18), ((KX + KW - 6.0, KY - KD - 5.0, 38.0), 3, 18),
            ((KX - 34, KY - KD - 2.0, 112.0), 2, 16), ((KX, KY - KD - 2.0, 112.0), 2, 16), ((KX - 34, KY - KD - 2.0, 166.0), 2, 16),
            ((KX - 22, KY - KD + 2.0, 220.0), 1, 14), ((KX + 22, KY - KD + 2.0, 220.0), 1, 14), ((WX + 4, WY - 19, 236), 2, 14)],
    smoke=[((KX, 0, RIDGE), 2), ((GTX, GTY, GTH + 10), 3), ((KX + 16, KY - KD, 70), 3)],
    horn=(-100, 360), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "stone",
        # the hall with its roof and the watchtower fall toward the lane first, the gate tower a beat later
        "topple": [topple_lu(-178, -60, 150, delay_ms=0, push=1.0, sink_lu=40),
                   topple_lu(-60, 12, 120, delay_ms=140, push=0.85, sink_lu=26)],
        "rubbleColors": [SLATE, SLATE_DK, SNOW, SLATE_LT],
        "dustColor": "#D6DEE4",
        "ambientLu": [ambient_lu("snow", (KX, KY - 10, 300), 50, 1.4), ambient_lu("snow", (GTX, GTY, 250), 26, 0.8),
                      ambient_lu("snow", (WX, WY, 340), 20, 0.6), ambient_lu("smoke", (-74, 30, 296), 6, 1.0)],
    },
)

# ---------------------------------------------------------------------------------------------------
# Wyrm-Coil Keep (round 3; Legendary, Trophy Road 4,800): a slate keep with a sleeping green dragon (our own design)
# coiled round it. Its head rests on its forepaws on the keep's front-left parapet, eyes shut, swept ivory horns, two
# little fangs over its lip, looking out over the lane; the neck comes down the keep's front-left corner into the upper
# coil, which crosses the front between the corner balcony's turret and the bartizan; the body wraps behind the keep
# and comes round again as the lower coil, under the corner balcony's mount, with a folded bat wing on it; the tail
# comes down the keep's foot, drapes over a small corbelled balcony's rail and curls round a hoard of gold on the
# ground (glints) to a leaf-shaped spade. The scales are dragon green in cel bands (scale rings, a cream belly, dark
# dorsal spines). The keep: blue-grey slate ashlar with pale dressed stone, a team banner with a dragon-eye roundel
# between the coils, a round corner turret and the round gate tower under team cone roofs, a lit balcony door. The
# dragon never lies over a mount: the coils pass between the turret boxes.
# The dragon is a prop over the body (one static frame, cut where the keep stands in front of the coils), so the
# sheet stores it once for all four crumble stages; the head breathes (the `breath` loop: it rises and settles over
# 2.4 s); smoke rings drift up from its nostrils (code ambient `rings`), glints on the hoard.
#
# Crumble: 75% cracks, the turret's gold finial and two gate-tower merlons lost, rubble; 50% a burning breach in the
# keep's foot, the gate hoarding broken and burning, the banner torn, a dark window, soot; 25% the breach torn wide, the
# turret roof and the gate tower's cone knocked askew, the turret roof burning, the banner hanging by a corner. The
# dragon sleeps through it all.

WY_SLATE = "#7E8792"          # blue-grey slate (large areas: light enough for the dark green dragon to stand out)
WY_SLATE_LT = "#8F98A2"
WY_SLATE_MID = "#868F99"
WY_SLATE_DK = "#69727D"
WY_SLATE_DKR = "#59616B"
WY_TRIM = "#B9BEC4"           # pale dressed stone (copings, quoins, the balcony)
WY_TRIM_DK = "#9DA3AA"
WY_CRACK = "#3E444C"
WY_CHIP = "#A9B0B8"
WY_SOOT = "#4E5056"
DR_GREEN = "#4F7A4A"          # dragon green
DR_GREEN_LT = "#6A9660"
DR_GREEN_DK = "#3E6239"
DR_GREEN_DKR = "#304D2C"
DR_BELLY = "#CBC78E"
DR_BELLY_DK = "#ADA972"
DR_MEMB = "#98AC6A"           # the wing membrane: pale olive (lighter than the scales, so the bones show)
DR_MEMB_DK = "#7F955A"
DR_HORN = "#E8DFC8"
DR_HORN_DK = "#C2B694"
DR_LID = "#26331F"
WKX, WKY, WKW, WKD, WKH = -106.0, 22.0, 46.0, 46.0, 250.0   # the keep (narrower than the Keep's: the coils wrap it)
WFY = WKY - WKD                                            # its front face (y -24)
WSX, WSY = WKX - 32.0, WKY + 26.0                          # the round corner turret (back left)
DR_Y = WFY - 13.5                                          # the coils' axis in front of the face
DR_K = 1.25                                                # the head's scale
DR_HS = (-134.0, -34.0, 281.0)                             # the head's skull centre (on the parapet, facing the lane, +x)
DR_PIVOT = (DR_HS[0] - 6.0 * DR_K, DR_HS[1], DR_HS[2] - 9.0 * DR_K)   # the jaw's back: the head breathes about it
DR_BREATH = [(0.0, 0.0), (0.3, 1.1), (0.6, 2.2), (0.8, 3.0)]   # (rise lu, snout-up turn deg) per step: the jaw stays on the paw
DR_BALC = (-82.0, 48.0)                                    # the small balcony the tail drapes over (x, floor z)
DR_HOARD = (-106.0, -66.0)                                 # the gold on the ground the tail curls round
DR_PATH = [
    # the neck, from inside the skull down the keep's front-left corner into the upper coil
    ((-147.0, -34.0, 277.0), 8.5), ((-155.0, -38.0, 263.0), 9.5), ((-158.0, -41.0, 247.0), 10.5), ((-155.0, DR_Y - 1.0, 233.0), 11.5),
    # the upper coil across the front, round the front-right corner
    ((-142.0, DR_Y, 227.0), 13.0), ((-122.0, DR_Y, 225.0), 13.0), ((-102.0, DR_Y, 223.0), 13.0), ((-84.0, DR_Y, 221.0), 12.5),
    ((-67.0, DR_Y, 218.0), 12.0), ((-53.0, -21.0, 213.0), 11.5), ((-49.0, 10.0, 205.0), 11.5),
    # behind the keep (hidden), coming down
    ((-52.0, 46.0, 188.0), 12.0), ((-74.0, 78.0, 162.0), 12.5), ((-110.0, 86.0, 134.0), 12.5), ((-146.0, 78.0, 112.0), 12.5),
    # round the front-left corner low and the lower coil across the front
    ((-162.0, 30.0, 100.0), 12.0), ((-166.0, 4.0, 96.0), 12.0), ((-164.0, -18.0, 95.0), 12.0), ((-152.0, DR_Y, 96.0), 12.5),
    ((-136.0, DR_Y, 98.0), 12.5), ((-120.0, DR_Y, 98.0), 12.0), ((-104.0, DR_Y, 96.0), 11.0), ((-91.0, DR_Y - 2.0, 90.0), 10.0),
    # the tail: down the keep's foot, over the little balcony's rail, curling round the hoard to the spade
    ((-84.0, -42.0, 80.0), 8.6), ((-81.0, -40.0, 67.0), 7.6), ((-79.0, -47.0, 56.0), 6.8), ((-80.0, -51.0, 42.0), 6.0),
    ((-85.0, -52.0, 28.0), 5.2), ((-93.0, -52.0, 15.0), 4.6), ((-106.0, -52.0, 8.0), 4.0), ((-121.0, -55.0, 6.0), 3.4),
    ((-130.0, -65.0, 6.0), 2.9), ((-127.0, -76.0, 7.0), 2.4),     # behind the gold, round its left side, the spade in front
]


def dr_spline(ctrl, sub=4):
    """Catmull-Rom through the control points (radius linear between them)."""
    out = []
    n = len(ctrl)
    for i in range(n - 1):
        p0, p1, p2, p3 = ctrl[max(0, i - 1)][0], ctrl[i][0], ctrl[i + 1][0], ctrl[min(n - 1, i + 2)][0]
        r1, r2 = ctrl[i][1], ctrl[i + 1][1]
        for k in range(sub):
            t = k / sub
            t2, t3 = t * t, t * t * t
            out.append((tuple(0.5 * (2 * p1[j] + (p2[j] - p0[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                                     + (3 * p1[j] - p0[j] - 3 * p2[j] + p3[j]) * t3) for j in range(3)), r1 + (r2 - r1) * t))
    out.append(ctrl[-1])
    return out


def _unit(v):
    L = math.sqrt(sum(c * c for c in v)) or 1.0
    return tuple(c / L for c in v)


def _perp(v, t):
    """v with its component along the unit tangent t removed, normalised."""
    d = sum(a * b for a, b in zip(v, t))
    return _unit(tuple(a - d * b for a, b in zip(v, t)))


def dr_body(rig, joint, path):
    """The dragon's body along the spline: the green tube, a cream belly band, darker scale rings and dorsal spines
    (bands and spines only where the camera can see them: in front of the keep)."""
    tube, belly, rings, bplates, spines, tips = Geo(), Geo(), Geo(), Geo(), Geo(), Geo()
    for (a, ra), (b, rb) in zip(path, path[1:]):
        tube.capsule(a, b, ra, rb, segs=14, rings=2)
    for i in range(1, len(path) - 1):
        p, r = path[i]
        t = _unit(tuple(path[i + 1][0][j] - path[i - 1][0][j] for j in range(3)))
        seen = p[1] < WFY + 8.0 or p[0] > WKX + WKW + 6.0 or p[0] < WKX - WKW - 6.0
        if not seen:
            continue
        d = _perp((0.0, -1.0, -0.9), t)
        bc = tuple(p[j] + d[j] * r * 0.5 for j in range(3))
        q, rq = path[i + 1]
        tq = _unit(tuple(path[min(len(path) - 1, i + 2)][0][j] - path[i][0][j] for j in range(3)))
        dq = _perp((0.0, -1.0, -0.9), tq)
        bq = tuple(q[j] + dq[j] * rq * 0.5 for j in range(3))
        belly.capsule(bc, bq, r * 0.62, rq * 0.62, segs=10, rings=1)
        if i % 2 == 0:
            rings.lathe([(r + 0.15, -0.55), (r + 0.55, 0.0), (r + 0.15, 0.55)], p, tuple(p[j] + t[j] for j in range(3)), segs=18)
            bplates.lathe([(r * 0.62 + 0.15, -0.5), (r * 0.62 + 0.5, 0.0), (r * 0.62 + 0.15, 0.5)], bc, tuple(bc[j] + t[j] for j in range(3)), segs=14)
        if i % 3 == 1 and r > 3.5:
            n = _perp((-0.2, 0.45, 1.0), t)
            base = tuple(p[j] + n[j] * (r - 1.2) for j in range(3))
            h = 3.0 + r * 0.42
            top = tuple(base[j] + n[j] * h - t[j] * h * 0.35 for j in range(3))
            spines.lathe([(0.0, 0.0), (r * 0.24 + 0.6, 0.1), (0.0, 1.0)], base, top, segs=8)
            tips.sphere(top, 0.6, cuts=1)
    rig.part(joint, tube, DR_GREEN, outline=0.6)
    rig.part(joint, belly, DR_BELLY, outline=0.4)
    rig.part(joint, rings, DR_GREEN_DK, outline=0, highlight=False)
    rig.part(joint, bplates, DR_BELLY_DK, outline=0, highlight=False)
    rig.part(joint, spines, DR_GREEN_DKR, outline=0.45)
    rig.part(joint, tips, DR_GREEN_DKR, outline=0)


def dr_spade(rig, joint, tip, prev):
    """The leaf-shaped spade at the tail's tip, pointing on along the tail."""
    t = _unit(tuple(tip[j] - prev[j] for j in range(3)))
    ang = math.degrees(math.atan2(t[2], t[0]))
    L, W = 13.0, 7.0
    pts = []
    for k in range(13):
        u = k / 12.0
        w = W * math.sin(math.pi * u) ** 0.8 * (1.0 - 0.35 * u)
        pts.append((u * L, w))
    pts += [(u, -w) for u, w in reversed(pts[1:-1])]
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    poly = [(tip[0] + u * ca - w * sa, tip[2] + u * sa + w * ca) for u, w in pts]
    g = Geo().slab(poly, tip[1] - 0.6, 2.4)
    rig.part(joint, g, DR_GREEN_DK, outline=0.5)
    g = Geo().capsule(tip, (tip[0] + L * 0.85 * ca, tip[1] - 1.9, tip[2] + L * 0.85 * sa), 0.8, segs=6, rings=1)
    rig.part(joint, g, DR_GREEN_LT, outline=0, highlight=False)


def dr_wing(rig, joint):
    """The folded bat wing raised off the lower coil's left part: the arm straight up to the wrist (an ivory thumb
    claw), four long fingers fanned out to the left and down, the pale olive membrane between them (darker toward the
    arm) with deep scallops between the finger tips: a fan with radiating bones, so it never reads as a fir tree."""
    sh, wr = (-128.0, -46.0, 108.0), (-136.0, -45.0, 166.0)
    fingers = [(-166.0, -42.0, 154.0), (-169.0, -42.0, 131.0), (-161.0, -43.0, 113.0), (-145.0, -44.0, 106.0)]
    y = -43.5

    def scallop(a, b, k=0.26, n=6):
        out = []
        for i in range(1, n):
            u = i / n
            x = a[0] + (b[0] - a[0]) * u
            z = a[2] + (b[2] - a[2]) * u
            nx, nz = -(b[2] - a[2]), b[0] - a[0]
            L = math.hypot(nx, nz) or 1.0
            s = k * math.sin(math.pi * u) * math.hypot(b[0] - a[0], b[2] - a[2])
            out.append((x + nx / L * s, z + nz / L * s))
        return out

    def towards(p, q, t):
        return (p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t)

    edge = [(wr[0], wr[2])]
    tips = fingers + [sh]
    for i, f in enumerate(tips):
        edge.append((f[0], f[2]))
        if i + 1 < len(tips):
            edge += scallop(f, tips[i + 1], 0.26 if i + 1 < len(fingers) else 0.14)
    m = Geo().slab(edge, y, 1.6)
    rig.part(joint, m, DR_MEMB, outline=0.55, outline_hex=DR_GREEN_DKR)
    # the inner membrane, darker toward the arm (a soft fold line where it meets the pale outer panels)
    inner = [(wr[0], wr[2])] + [(q[0], q[2]) for q in (towards(wr, f, 0.52) for f in fingers)] + [(sh[0] - 2.0, sh[2] + 6.0)]
    m = Geo().slab(inner, y - 0.9, 0.6)
    rig.part(joint, m, DR_MEMB_DK, outline=0, highlight=False)
    g = Geo()
    g.capsule(sh, wr, 3.2, 2.5, segs=10, rings=1)
    for f in fingers:
        g.capsule((wr[0], y - 1.4, wr[2]), (f[0], y - 1.4, f[2]), 1.7, 0.8, segs=8, rings=1)
    g.sphere(wr, 3.0, cuts=2)
    rig.part(joint, g, DR_GREEN_DK, outline=0.5)
    g = Geo().lathe([(0.0, 0.0), (1.6, 0.2), (0.0, 1.0)], (wr[0], wr[1] - 1.0, wr[2] + 1.0), (wr[0] + 2.5, wr[1] - 1.0, wr[2] + 8.0), segs=8)
    for f in fingers[:2]:
        g.lathe([(0.0, 0.0), (0.9, 0.2), (0.0, 1.0)], (f[0], y - 1.6, f[2]), (f[0] - 2.4, y - 1.6, f[2] - 1.6), segs=6)
    rig.part(joint, g, DR_HORN, outline=0.4)


def dr_head(rig, joint):
    """The sleeping head (facing the lane): a round skull, a broad snout with an upturned nose, a cream lower jaw resting
    on the paws, a closed eye under a heavy brow, swept ivory horns, a frill of spines, two little fangs."""
    hx, hy, hz = DR_HS
    K = DR_K

    def P(dx, dy, dz):
        return (hx + dx * K, hy + dy * K, hz + dz * K)

    def R(*r):
        return tuple(v * K for v in r)

    g = Geo()
    g.blob(P(0.0, 0.0, 0.0), R(12.0, 10.0, 9.4), p=2.3, cuts=3)
    g.blob(P(12.5, -0.5, -2.6), R(11.0, 8.4, 6.6), p=2.2, cuts=3, taper=(1.0, 0.9))
    g.blob(P(22.0, -0.5, -1.8), R(5.6, 6.8, 5.4), p=2.2, cuts=3)
    rig.part(joint, g, DR_GREEN, outline=0.6)
    g = Geo().blob(P(9.0, -0.2, -8.6), R(13.6, 8.0, 3.8), p=2.2, cuts=3, taper=(1.0, 0.85))
    rig.part(joint, g, DR_BELLY, outline=0.5)
    g = Geo()
    for k in range(4):
        c0, c1 = P(3.0 + k * 5.0, -0.2, -9.4), P(4.0 + k * 5.0, -0.2, -9.4)
        g.lathe([((3.6 + k * 0.2) * K, -0.4), ((4.0 + k * 0.2) * K, 0.0), ((3.6 + k * 0.2) * K, 0.4)], c0, c1, segs=14)
    rig.part(joint, g, DR_BELLY_DK, outline=0, highlight=False)
    # the mouth line, the nostrils
    g = Geo()
    pts = [P(2.0, -8.4, -5.6), P(10.0, -8.0, -6.4), P(18.0, -7.2, -6.0), P(24.0, -5.8, -5.0)]
    for a_, b_ in zip(pts, pts[1:]):
        g.capsule(a_, b_, 0.55 * K, segs=4, rings=1)
    g.blob(P(26.4, -3.8, 0.6), R(1.5, 1.2, 1.1), p=2.0, cuts=2)
    g.blob(P(26.4, 2.6, 0.6), R(1.5, 1.2, 1.1), p=2.0, cuts=2)
    rig.part(joint, g, DR_LID, outline=0, highlight=False)
    # the closed eye: a lid bulge with a curved lid line and lashes, a heavy brow above
    g = Geo().blob(P(3.0, -8.6, 3.0), R(4.8, 2.4, 3.2), p=2.2, cuts=2)
    rig.part(joint, g, DR_GREEN_LT, outline=0.4)
    g = Geo()
    lid = [P(-1.6 + 9.2 * u, -10.6, 2.6 - 1.5 * math.sin(math.pi * u)) for u in (0.0, 0.2, 0.4, 0.6, 0.8, 1.0)]
    for a_, b_ in zip(lid, lid[1:]):
        g.capsule(a_, b_, 0.6 * K, segs=4, rings=1)
    for i in (3, 4, 5):
        q = lid[i]
        g.capsule(q, (q[0] + 0.8 * K, q[1] - 0.3 * K, q[2] - 1.6 * K), 0.35 * K, segs=4, rings=1)
    rig.part(joint, g, DR_LID, outline=0, highlight=False)
    g = Geo().blob(P(2.0, -6.8, 7.4), R(6.4, 3.4, 2.2), p=2.2, cuts=2, rot=(0, -8, 0))
    rig.part(joint, g, DR_GREEN_DK, outline=0.4)
    # swept horns (ivory, darker tips), the frill and the spines down the back of the head
    hg, ht = Geo(), Geo()
    for sgn in (-1.0, 1.0):
        pts = [P(-4.0, sgn * 5.6, 7.0), P(-12.0, sgn * 6.6, 12.4), P(-20.0, sgn * 7.2, 14.6), P(-27.0, sgn * 7.6, 13.4)]
        rad = [3.0 * K, 2.4 * K, 1.6 * K, 0.6 * K]
        for i in range(3):
            hg.capsule(pts[i], pts[i + 1], rad[i], rad[i + 1], segs=10, rings=1)
        ht.capsule(pts[2], pts[3], rad[2] + 0.1, rad[3] + 0.1, segs=10, rings=1)
    rig.part(joint, hg, DR_HORN, outline=0.5)
    rig.part(joint, ht, DR_HORN_DK, outline=0.3)
    g = Geo()
    for dz, L in ((3.0, 9.0), (-1.0, 11.0), (-5.0, 8.0)):
        base = P(-7.0, -7.6, dz)
        g.lathe([(0.0, 0.0), (1.8 * K, 0.1), (0.0, 1.0)], base, (base[0] - L * K, base[1] + 1.0 * K, base[2] + (dz * 0.4 - 1.0) * K), segs=8)
    for k in range(3):
        base = P(-4.0 - k * 5.0, 0.0, 9.0 - k * 1.6)
        g.lathe([(0.0, 0.0), (2.0 * K, 0.1), (0.0, 1.0)], base, (base[0] - 3.0 * K, base[1], base[2] + (5.0 - k) * K), segs=8)
    rig.part(joint, g, DR_GREEN_DKR, outline=0.45)
    # two little fangs over the lip
    g = Geo()
    for dx in (15.0, 21.0):
        g.lathe([(0.0, 0.0), (1.1 * K, 0.1), (0.0, 1.0)], P(dx, -7.0, -7.0), P(dx + 0.3, -7.4, -4.2), segs=8)
    rig.part(joint, g, DR_HORN, outline=0.3)


def dr_paws(rig, joint):
    """The forepaws over the parapet: one under the chin, one stretched out along the merlons (three ivory claws each)."""
    legs = [((-150.0, -40.0, 262.0), (-142.0, -46.0, 262.0), (-124.0, -38.0, 268.5)), ((-152.0, -32.0, 260.0), (-134.0, -30.0, 262.0), (-108.0, -33.0, 267.5))]
    g, c = Geo(), Geo()
    for sh, el, paw in legs:
        g.capsule(sh, el, 5.4, 4.4, segs=12, rings=1)
        g.capsule(el, paw, 4.4, 3.6, segs=12, rings=1)
        g.blob((paw[0] + 1.5, paw[1], paw[2]), (6.6, 5.0, 3.4), p=2.2, cuts=2)
        for k in (-1, 0, 1):
            base = (paw[0] + 6.6, paw[1] + k * 2.6 - 0.6, paw[2] - 0.6)
            c.lathe([(0.0, 0.0), (1.1, 0.1), (0.0, 1.0)], base, (base[0] + 3.6, base[1] - 0.4, base[2] - 1.6), segs=8)
    rig.part(joint, g, DR_GREEN, outline=0.55)
    rig.part(joint, c, DR_HORN, outline=0.35)


def dr_breath_pose(f):
    dz, r = DR_BREATH[f]
    return {"head": {"z": dz, "r": r}}


def build_wyrm(rig, M):
    for j, pos in (("troof", (WSX, WSY, WKH + 33)), ("tfinial", (WSX, WSY, WKH + 82)), ("merlon", (WKX - 10, WFY, WKH)),
                   ("tmerlon", (TX, TY, TH + 4)), ("cone", (TX - 2, TY + 6, TH + 6)), ("banner", (WKX - 6, WFY - 3.0, 210)),
                   ("rail", (M[0][0], M[0][1], M[0][2]))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "dark", "fire1", "fire2", "scorch", "breach", "breach2", "tear"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("win", "body", (0, 0, 0))

    # -- the keep: slate core and ashlar, plinth, string course, cornice, quoins, the crenellated top -----------------
    g = Geo()
    box(g, (WKX, WKY, WKH / 2), (WKW, WKD, WKH / 2), p=10)
    rig.part("body", g, WY_SLATE_DK)
    ashlar(rig, "body", WKX - WKW + 2, WKX + WKW - 2, 18, WKH - 12, WFY - 0.6, [WY_SLATE, WY_SLATE_LT, WY_SLATE_MID], h=12.0, w=(16.0, 24.0), seed=5)
    g = Geo()
    for z in range(24, int(WKH) - 8, 12):
        box(g, (WKX + WKW + 0.6, WKY + 2, z), (0.8, WKD - 4, 0.7), p=4, cuts=2)
    rig.part("body", g, WY_SLATE_DKR, outline=0)
    g = Geo()
    box(g, (WKX, WKY - 2, 9), (WKW + 5, WKD + 4, 9), p=6, taper=(1.0, 0.96))
    rig.part("body", g, WY_SLATE_DKR)
    g = Geo()
    box(g, (WKX, WKY - 1, 150), (WKW + 2.5, WKD + 2.5, 3.0), p=6)
    box(g, (WKX, WKY - 1, WKH - 2), (WKW + 3.5, WKD + 3.5, 3.4), p=6)
    rig.part("body", g, WY_TRIM_DK, outline=0.6)
    g = Geo()
    for i, z in enumerate(range(24, int(WKH) - 10, 14)):
        long = i % 2 == 0
        for sx in (-1, 1):
            box(g, (WKX + sx * (WKW - (7.0 if long else 4.5)), WFY - 1.2, z + 6), (7.0 if long else 4.5, 2.0, 5.6), p=5, cuts=2)
    rig.part("body", g, WY_TRIM, outline=0.5)
    g = Geo()
    box(g, (WKX, WKY - 1, WKH + 1), (WKW + 4.5, WKD + 4.5, 4.0), p=6)
    rig.part("body", g, WY_SLATE)
    g = Geo()
    crenels(g, WKX - WKW - 4.0, WKX + WKW - 18.0, WFY - 3.0, WKH + 4, 9, 9.6, 12, 7)
    crenels(g, WKX - WKW - 4.0, WKX + WKW + 4.0, WKY + WKD + 2.0, WKH + 4, 9, 9.6, 12, 7)
    rig.part("body", g, WY_SLATE_LT)
    g = Geo()
    box(g, (WKX - 10, WFY - 3.0, WKH + 10), (4.8, 3.5, 6.0), p=5)
    rig.part("merlon", g, WY_SLATE_LT)

    # -- the round corner turret (back left) under a team cone with a gold finial -----------------------------------
    g = Geo()
    cyl(g, (WSX, WSY, WKH - 10), (WSX, WSY, WKH + 32), 15.0, bevel=0.8, segs=22)
    rig.part("body", g, WY_SLATE)
    g = Geo()
    cyl(g, (WSX, WSY, WKH + 28), (WSX, WSY, WKH + 34), 17.4, bevel=0.8, segs=22)
    rig.part("body", g, WY_TRIM_DK, outline=0.6)
    lancet(rig, "body", WSX + 4.0, WSY - 15.6, WKH + 16.0, 5.0, 11.0, frame=WY_SLATE_DKR, mullion=False)
    g = Geo().lathe([(0, 0), (21.0, 0), (19.5, 3.0), (0.6, 46.0), (0, 48.0)], (WSX, WSY, WKH + 33.0), (WSX, WSY, WKH + 81.0), segs=22)
    rig.part("troof", g, team=True)
    g = Geo().lathe([(19.6, -1.2), (20.4, 0.0), (19.6, 1.2)], (WSX, WSY, WKH + 34.5), (WSX, WSY, WKH + 35.5), segs=22)
    rig.part("troof", g, WY_SLATE_DKR, outline=0)
    g = Geo()
    cyl(g, (WSX, WSY, WKH + 80.0), (WSX, WSY, WKH + 83.0), 1.8, bevel=0.3)
    g.sphere((WSX, WSY, WKH + 85.0), 2.6, cuts=3)
    rig.part("tfinial", g, GOLD, finish="metal", outline=0.5)

    # -- the small corbelled balcony low on the keep's front (the tail drapes over its rail) and its lit door ----------
    bx, bz = DR_BALC
    lancet(rig, "body", bx, WFY - 1.2, bz + 13.0, 9.0, 21.0, frame=WY_TRIM_DK, mullion=False)
    g = Geo()
    box(g, (bx, WFY - 8.0, bz - 1.4), (15.0, 8.0, 2.4), p=6)
    rig.part("body", g, WY_TRIM)
    g = Geo()
    for k in range(3):
        box(g, (bx - 10.0 + k * 10.0, WFY - 5.0, bz - 9.0), (3.0, 5.0, 5.0), p=4, cuts=2, taper=(0.5, 1.0))
    rig.part("body", g, WY_TRIM_DK, outline=0.5)
    g = Geo()
    for k in range(6):
        x = bx - 13.0 + k * 5.2
        g.capsule((x, WFY - 14.6, bz + 1.0), (x, WFY - 14.6, bz + 9.0), 1.0, 0.8, segs=6, rings=1)
    for sx in (-1.0, 1.0):
        g.capsule((bx + sx * 14.6, WFY - 3.0, bz + 1.0), (bx + sx * 14.6, WFY - 3.0, bz + 9.0), 1.0, 0.8, segs=6, rings=1)
        g.capsule((bx + sx * 15.0, WFY - 15.0, bz + 10.4), (bx + sx * 15.0, WFY - 1.0, bz + 10.4), 1.5, segs=8, rings=1)
    g.capsule((bx - 15.0, WFY - 15.0, bz + 10.4), (bx + 15.0, WFY - 15.0, bz + 10.4), 1.5, segs=8, rings=1)
    rig.part("body", g, WY_TRIM, outline=0.45)

    # -- the team banner between the coils, a dragon-eye roundel on it ----------------------------------------------
    cx = WKX - 6.0
    ban = Geo().slab([(cx - 12, 210), (cx + 12, 210), (cx + 12, 136), (cx, 126), (cx - 12, 136)], WFY - 3.0, 1.6)
    rig.part("banner", ban, team=True)
    g = Geo().capsule((cx - 14, WFY - 3.8, 211), (cx + 14, WFY - 3.8, 211), 1.4)
    g.sphere((cx - 15, WFY - 3.8, 211), 2.0, cuts=2).sphere((cx + 15, WFY - 3.8, 211), 2.0, cuts=2)
    rig.part("body", g, GOLD, finish="metal", outline=0.5)
    g = Geo().slab([(cx + 8.0 * math.cos(math.radians(a)), 176.0 + 8.0 * math.sin(math.radians(a))) for a in range(0, 360, 20)], WFY - 4.0, 0.8)
    rig.part("banner", g, PARCH, outline=0.35)
    g = Geo().slab([(cx + 2.4 * math.cos(math.radians(a)), 176.0 + 6.2 * math.sin(math.radians(a))) for a in range(0, 360, 24)], WFY - 4.6, 0.6)
    rig.part("banner", g, DR_GREEN_DK, outline=0, highlight=False)
    g = Geo().slab([(cx + 12, 192), (cx + 5, 182), (cx + 12, 172)], WFY - 5.0, 1.0)   # a rip (50%)
    rig.part("tear", g, WY_SLATE_DK, outline=0, highlight=False)

    # windows: a lit lancet right of the banner (dark at 50%), a slit under the lower coil
    lancet(rig, "dark", WKX + 14.0, WFY - 2.2, 172.0, 8.4, 19.4, glow_hex="#2A2D33", frame=WY_TRIM_DK, mullion=False)
    lancet(rig, "win", WKX + 14.0, WFY - 1.2, 172.0, 8.0, 19.0, frame=WY_TRIM_DK, sill=WY_TRIM_DK)
    lancet(rig, "body", WKX - 26.0, WFY - 1.2, 50.0, 4.4, 14.0, frame=WY_TRIM_DK, mullion=False)

    # -- the round gate tower: slate courses, plinth, cornice, merlons, the team cone, the gate ----------------------
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, TH), TR, TR - 2, bevel=1.0, segs=32)
    rig.part("body", g, WY_SLATE_DK)
    ring_blocks(rig, "body", TX, TY, TR, 10.0, TH - 8, [WY_SLATE_LT, WY_SLATE, WY_SLATE_MID])
    g = Geo()
    cyl(g, (TX, TY, 0), (TX, TY, 12), TR + 3, TR + 1.5, bevel=1.0, segs=32)
    rig.part("body", g, WY_SLATE_DKR)
    g = Geo()
    cyl(g, (TX, TY, TH - 8), (TX, TY, TH + 4), TR + 3, bevel=1.0, segs=32)
    cyl(g, (TX, TY, 92), (TX, TY, 95), TR + 1.6, bevel=0.6, segs=32)
    rig.part("body", g, WY_TRIM_DK, outline=0.6)
    g, gm = Geo(), Geo()
    for i in range(10):
        a = math.pi * 2 * i / 10
        box(gm if i in (6, 7) else g, (TX + (TR + 1.5) * math.cos(a), TY + (TR + 1.5) * math.sin(a), TH + 9), (4, 4, 5), p=5)
    rig.part("body", g, WY_SLATE_LT)
    rig.part("tmerlon", gm, WY_SLATE_LT)
    g = Geo().lathe([(0, 0), (TR - 2, 0), (TR - 4, 3), (0.6, 52), (0, 54)], (TX - 2, TY + 6, TH + 6), (TX - 2, TY + 6, TH + 60), segs=24)
    rig.part("cone", g, team=True)
    g = Geo().lathe([(TR - 1.6, -1.2), (TR - 1.0, 0), (TR - 1.6, 1.2)], (TX - 2, TY + 6, TH + 7.5), (TX - 2, TY + 6, TH + 8.5), segs=24)
    rig.part("cone", g, WY_SLATE_DKR, outline=0)
    lancet(rig, "body", TX + 3, TY - TR - 0.2, 132, 6.5, 15.0, frame=WY_TRIM_DK, mullion=False)
    lancet(rig, "body", TX + 6, TY - TR + 0.6, 66, 6.0, 13.0, frame=WY_TRIM_DK, mullion=False)
    g = Geo().slab([(GX - 11, 0), (GX + 11, 0), (GX + 11, 22)] + [(GX + 11 * math.cos(a), 22 + 11 * math.sin(a)) for a in
                                                               [math.pi * k / 8 for k in range(1, 8)]] + [(GX - 11, 22)], TY - TR - 0.6, 3.0)
    rig.part("body", g, WOOD)
    g = Geo()
    for z in (7, 18, 27):
        box(g, (GX, TY - TR - 2.6, z), (10.5, 0.8, 1.4), p=4, cuts=2)
    rig.part("body", g, IRON, finish="metal", outline=0.4)
    g = Geo()
    for a in [math.pi * k / 10 for k in range(0, 11)]:
        box(g, (GX + 14 * math.cos(a), TY - TR - 1.6, 22 + 14 * math.sin(a)), (2.6, 1.6, 2.6), p=4, cuts=2)
    rig.part("body", g, WY_TRIM, outline=0.5)
    lantern(rig, "body", TX + 10.0, TY - TR - 3.5, 36.0, arm=-6.0)

    # -- the turret platforms --------------------------------------------------------------------------------
    platform(rig, "body", M[0], WOOD, WOOD_DK, style="wood", r=(25, 16))
    g = Geo()
    x, y, z = M[0]
    g.capsule((x - 26, y - 13, z - 4), (x - 26, y + 10, z - 4), 1.2)
    rig.part("rail", g, WOOD_DK, outline=0.5)
    platform(rig, "body", M[1], WY_TRIM, WY_SLATE_DKR, style="stone", r=(25, 19))
    platform(rig, "body", M[2], WOOD, WOOD_DK, style="wood", r=(26, 18))
    platform(rig, "body", M[3], WY_TRIM, WY_SLATE_DKR, style="stone", r=(25, 19))

    # -- the dragon's hoard on the ground, the tail curled round it (gold, a goblet, a wine gem) ------------------------
    hx_, hy_ = DR_HOARD
    g = Geo()
    g.blob((hx_, hy_ + 2.0, 2.0), (15.0, 9.0, 12.0), p=2.2, cuts=3, taper=(1.0, 0.55))     # a heap, taller than the tail behind it
    g.blob((hx_ + 12.0, hy_ + 1.0, 1.8), (7.0, 5.0, 4.4), p=2.4, cuts=2)
    rig.part("body", g, GOLD, finish="metal", outline=0.5)
    # an open chest spilling coins at the heap's right
    g = Geo()
    box(g, (hx_ + 17.0, hy_ - 1.0, 5.0), (6.0, 4.4, 5.0), p=5)
    rig.part("body", g, WOOD)
    g = Geo()
    box(g, (hx_ + 17.0, hy_ + 3.6, 12.6), (6.2, 1.2, 4.4), p=5, rot=(-24, 0, 0))
    rig.part("body", g, WOOD_DK)
    g = Geo().blob((hx_ + 17.0, hy_ - 1.0, 10.0), (5.4, 3.8, 2.4), p=2.2, cuts=2)
    rig.part("body", g, "#E6BE5A", finish="metal", outline=0.35)
    g = Geo()
    for dx, dy, dz in ((-10, -6, 5.0), (-4, -8.4, 7.2), (3, -8.0, 6.8), (9, -6.4, 4.6), (-14, -3, 2.6), (12, -5.4, 2.2),
                       (24, -5.6, 1.0), (0, -6.0, 10.6), (-6, -4.0, 12.2)):
        cyl(g, (hx_ + dx, hy_ + 2.0 + dy, dz), (hx_ + dx, hy_ + 1.4 + dy, dz + 0.5), 2.2, bevel=0.2, segs=12)
    for dx, n in ((-19.0, 3), (27.0, 2)):        # two little stacks of coins
        for k in range(n):
            cyl(g, (hx_ + dx, hy_ - 2.0, k * 1.3), (hx_ + dx, hy_ - 2.0, k * 1.3 + 1.1), 2.6, bevel=0.2, segs=14)
    rig.part("body", g, "#E6BE5A", finish="metal", outline=0.35)
    g = Geo().lathe([(0.0, 0.0), (3.0, 0.0), (1.0, 1.4), (0.9, 6.0), (3.4, 8.0), (3.8, 11.0), (0.0, 10.0)], (hx_ - 11.0, hy_ + 5.0, 3.0),
                    (hx_ - 11.0, hy_ + 5.0, 14.0), segs=16)
    rig.part("body", g, GOLD, finish="metal", outline=0.45)
    g = Geo().blob((hx_ + 4.0, hy_ - 5.4, 9.6), (2.6, 2.2, 2.6), p=2.0, cuts=2)
    rig.part("body", g, "#8E2A4A", finish="gloss", outline=0.35)

    # -- the dragon (the `dragon` prop: a static frame over the body, cut where the keep stands in front) -------------
    rig.joint("dragon", "root", (WKX, DR_Y, 160.0))
    path = dr_spline(DR_PATH, sub=4)
    dr_body(rig, "dragon", path)
    dr_spade(rig, "dragon", DR_PATH[-1][0], DR_PATH[-2][0])
    dr_wing(rig, "dragon")
    # the head and the forepaws (the `breath` prop: the head rises and settles)
    rig.joint("head", "root", DR_PIVOT)
    dr_head(rig, "head")
    rig.joint("paws", "root", (-130.0, -36.0, 266.0))
    dr_paws(rig, "paws")

    # -- damage ---------------------------------------------------------------------------------------------
    flames(rig, "fire1", [(M[0][0] - 10, M[0][1] - 14, M[0][2] - 4, 1.0), (M[0][0] + 12, M[0][1] - 12, M[0][2] - 6, 0.75)])
    flames(rig, "fire2", [(WSX - 2, WSY - 14, WKH + 44, 1.2), (WKX - 30, WFY - 8, 40, 0.9)])
    bx0, bz0 = WKX - 30.0, 50.0
    pts = [(bx0 - 13, bz0 - 10), (bx0 - 4, bz0 - 15), (bx0 + 8, bz0 - 12), (bx0 + 14, bz0 - 2), (bx0 + 10, bz0 + 9), (bx0 + 1, bz0 + 14),
           (bx0 - 9, bz0 + 11), (bx0 - 15, bz0 + 1)]
    g = Geo().slab(pts, WFY - 2.4, 1.2)
    rig.part("breach", g, "#24272C", outline=0, highlight=False)
    g = Geo()
    for x, z, r in ((bx0 - 14, bz0 - 10, 3.6), (bx0 + 13, bz0 - 10, 3.0), (bx0 + 14, bz0 + 7, 2.8), (bx0 - 13, bz0 + 10, 3.0)):
        g.blob((x, WFY - 3.0, z), (r, 2.6, r * 0.8), p=2.6)
    rig.part("breach", g, WY_SLATE_LT, outline=0.5)
    flames(rig, "breach", [(bx0, WFY - 6.0, bz0 - 10.0, 0.85)])
    pts = [(bx0 - 19, bz0 - 15), (bx0 - 6, bz0 - 22), (bx0 + 10, bz0 - 18), (bx0 + 20, bz0 - 4), (bx0 + 15, bz0 + 13), (bx0 + 2, bz0 + 21),
           (bx0 - 12, bz0 + 17), (bx0 - 21, bz0 + 2)]
    g = Geo().slab(pts, WFY - 2.0, 1.0)
    rig.part("breach2", g, "#24272C", outline=0, highlight=False)
    g = Geo()
    g.capsule((bx0 - 14, WFY - 3.4, bz0 - 6), (bx0 + 12, WFY - 3.4, bz0 + 8), 1.6)
    g.capsule((bx0 - 8, WFY - 3.4, bz0 + 12), (bx0 + 14, WFY - 3.4, bz0 - 4), 1.4)
    rig.part("breach2", g, WOOD_DK, outline=0.4)
    g = Geo()
    for x, z, rx, rz in ((bx0, bz0 + 24, 7.0, 12.0), (bx0 + 10, bz0 + 18, 5.0, 8.0)):
        g.blob((x, WFY - 2.6, z), (rx, 1.8, rz), p=2.2, taper=(1.0, 0.35))
    for a, z, rx, rz in ((262, M[0][2] + 20, 7.5, 13.0), (300, M[0][2] + 14, 5.5, 9.0)):
        x, y = TX + (TR + 0.8) * math.cos(math.radians(a)), TY + (TR + 0.8) * math.sin(math.radians(a))
        g.blob((x, y, z), (rx, 2.4, rz), p=2.2, taper=(1.0, 0.35), rot=(0, 0, a + 90))
    rig.part("scorch", g, WY_SOOT, outline=0, highlight=False)
    chipped_cracks(rig, "crack1", [[(WKX - 34, WFY - 2, 200), (WKX - 28, WFY - 2, 190), (WKX - 34, WFY - 2, 180)],
                                   [(WKX - 4, WFY - 2, 70), (WKX + 2, WFY - 2, 60), (WKX - 4, WFY - 2, 48)]], WY_CRACK, WY_CHIP)
    chipped_cracks(rig, "crack2", [[(WKX + 26, WFY - 2, 196), (WKX + 32, WFY - 2, 186), (WKX + 26, WFY - 2, 176)],
                                   [(TX - 8, TY - TR - 1, 54), (TX - 3, TY - TR - 1, 44)]], WY_CRACK, WY_CHIP)
    chipped_cracks(rig, "crack3", [[(WKX - 20, WFY - 2, 128), (WKX - 14, WFY - 2, 118), (WKX - 20, WFY - 2, 108)],
                                   [(WKX + 30, WFY - 2, 140), (WKX + 36, WFY - 2, 130)]], WY_CRACK, WY_CHIP)
    rubble(rig, "rubble1", [(-164, -42), (-140, -52)], WY_SLATE_DK, seed=3)
    rubble(rig, "rubble2", [(18, -46), (-52, -58)], WY_SLATE_DK, seed=13)
    rubble(rig, "rubble3", [(-166, -60), (-142, -66), (-44, -62), (22, -56)], WY_SLATE_DK, seed=23, size=1.2)

    flag(rig, "root", "flagA", (TX - 2, TY + 6, TH + 84), length=30, height=16, pole=TH + 58)
    flag(rig, "root", "flagB", (WSX, WSY, WKH + 112), length=26, height=14, pole=WKH + 86)

    # -- Treasury: grain sacks (1), a treasure chest (2), a cart of gold (3), on the left (the dragon has the middle) ----
    g = Geo()
    for x, y in ((-168, -48), (-160, -54), (-164, -40)):
        g.blob((x, y, 9), (7, 6, 9), p=2.4, taper=(1.0, 0.7))
        g.blob((x, y, 18.5), (2.8, 2.6, 1.6), p=2.0)
    rig.part("treasury1", g, SACK)
    g = Geo()
    box(g, (-146, -62, 7), (10, 7, 7), p=5)
    rig.part("treasury2", g, WOOD)
    g = Geo()
    g.blob((-146, -62, 14), (10, 7, 4.5), p=3.0)
    g.clip((0, 0, 14), (0, 0, -1))
    rig.part("treasury2", g, WINE)
    g = Geo()
    box(g, (-146, -69.5, 8), (2.4, 0.8, 3), p=4, cuts=2)
    for dx in (-8, 8):
        box(g, (dx - 146, -69.3, 9), (1.2, 0.6, 7), p=4, cuts=2)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.4)
    g = Geo()
    for dx, dz in ((-4, 18), (3, 19), (0, 21), (6, 17), (-7, 17)):
        g.blob((-146 + dx, -62, dz), (3.0, 3.0, 1.4), p=2.0)
    rig.part("treasury2", g, GOLD, finish="metal", outline=0.5)
    g = Geo()
    box(g, (-158, -78, 13), (15, 8, 5), p=6)
    rig.part("treasury3", g, WOOD)
    for dx in (-9, 9):
        g = Geo().lathe([(0, -1.2), (7, -1.2), (7, 1.2), (0, 1.2)], (-158 + dx, -87, 7), (-158 + dx, -88, 7), segs=16)
        rig.part("treasury3", g, WOOD_DK)
    g = Geo()
    for dx, dz in ((-8, 20), (-2, 22), (4, 21), (9, 19), (0, 25), (-5, 18), (7, 17)):
        g.blob((-158 + dx, -78, dz), (3.8, 3.8, 1.6), p=2.0)
    rig.part("treasury3", g, GOLD, finish="metal", outline=0.5)


def crumble_wyrm(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "tfinial": {"hide": True}, "rubble1": {"show": True}, "tmerlon": {"hide": True},
                     "merlon": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "rail": {"r": -18.0, "z": -3.0}, "dark": {"show": True},
                     "win": {"hide": True}, "fire1": {"show": True}, "scorch": {"show": True}, "tear": {"show": True},
                     "banner": {"r": 5.0}, "breach": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire2": {"show": True}, "breach": {"hide": True},
                     "breach2": {"show": True}, "troof": {"r": 15.0, "x": -6.0, "z": -10.0}, "tfinial": {"hide": True},
                     "cone": {"r": -14.0, "x": 4.0, "z": -6.0}, "banner": {"r": 28.0, "x": 1.0, "z": -2.0}})
    return pose


WYRM_COIL_KEEP = base_module(
    "medieval", "Wyrm-Coil Keep", height=330, width=180, canvas=(460, 820), feet=(350, 770),
    build=build_wyrm, crumble=crumble_wyrm, mount_depth=DEPTHS, skin="wyrm_coil_keep",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((TX + 10.0, TY - TR - 6.0, 38.0), 3, 18), ((DR_BALC[0], WFY - 3.0, DR_BALC[1] + 13.0), 2, 16), ((WKX + 14.0, WFY - 2.0, 172.0), 1, 16),
            ((DR_HOARD[0], DR_HOARD[1] - 4.0, 6.0), 3, 14)],
    smoke=[((WKX, 0, WKH + 6), 2), ((TX, TY, TH + 10), 3), ((WKX - 30, WFY, 60), 2)],
    horn=(-100, 360), yaw=BASE_YAW,
    props=[prop_loop("dragon", ["dragon"], 1, lambda f: {}, ms=1000, crumble=(0, 3), z="front", hold=0,
                     anchor=(WKX, DR_Y, 160.0), occlude=["body"], sequence=[0, 0, 0, 0]),
           prop_loop("breath", ["head", "paws"], len(DR_BREATH), dr_breath_pose, ms=300, crumble=(0, 3), z="front", hold=0,
                     anchor=DR_HS, sequence=[0, 1, 2, 3, 3, 2, 1, 0])],
    extra_meta={
        "collapseMaterial": "stone",
        # the keep with its turret falls toward the lane first, the gate tower a beat later (the dragon fades away)
        "topple": [topple_lu(-176, -60, 150, delay_ms=0, push=1.0, sink_lu=40),
                   topple_lu(-60, 12, 120, delay_ms=140, push=0.85, sink_lu=26)],
        "rubbleColors": [WY_SLATE, WY_SLATE_DK, WY_TRIM, DR_GREEN],
        "dustColor": "#C4C8CE",
        "ambientLu": [ambient_lu("rings", (DR_HS[0] + 27.0 * DR_K, DR_HS[1] - 2.0, DR_HS[2] + 4.0), 2, 0.5, color="#E4E2DC"),
                      ambient_lu("glints", (DR_HOARD[0], DR_HOARD[1], 6.0), 10, 0.8, color="#FFF2C0"),
                      ambient_lu("smoke", (WSX, WSY, WKH + 90), 6, 0.3)],
    },
)

SKINS = [ROSE_KEEP, SNOWY_KEEP, WYRM_COIL_KEEP]
