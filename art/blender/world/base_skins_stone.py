"""Stone Age base skins as real models (PLAN 2c): `base.stone@<skin>`.

Mossy Den (Rare, Trophy Road 700; owner request 2026-10-08 "more base skins that are not just a
recolour"): the Cave Hold rebuilt as a giant hollow tree stump fused with mossy boulders. The stump's
broken crown is a ring of jagged splinters round a dark hollow, carpeted with moss; a big spotted
toadstool grows from the top (team cap) and a smaller one from the boulders; a thick branch reaches
toward the lane; root buttresses grip the ground; bark ridges, knots and knot-hole windows with warm
light cover the trunk; glowing mushroom clusters, ferns and hanging vines grow everywhere. The door is a
hollow between the roots behind a team hide curtain, firelit from inside.

Footprint, height band and the four mounts are the Cave Hold's (common.BASE_MOUNTS): a mossy sibling
stump by the gate (its cut top is the platform), a shelf fungus on the trunk, a shelf fungus at the end
of the branch and a shelf fungus on the crown. Team colour: the two toadstool caps, the hide curtain, a
painted hide on the trunk and the flags.

Crumble: 75% cracks in the bark, a glowing mushroom cluster and a splinter knocked off, bark chips and
stones; 50% a split, the sibling stump's shelf burning with soot, the curtain torn, a vine torn down, the
mushrooms dimmed; 25% a ragged split open on the hollow, the toadstool knocked askew, the tall splinter
broken off, the branch cracked (it carries mount 2, so it never moves), fire in the crown. Treasury: a basket of berries and nuts
(1), honeycomb and furs (2), tusks and ochre stones (3).
"""
import math
import random

from ageborn_art.geometry import Geo

from world.base_skins_kit import flames, leaf
from world.common import (BASE_YAW, ambient_lu, base_module, chipped_cracks, cyl, flag, moss_drape, rock, rope,
                          topple_lu)

BARK = "#6A4E3A"
BARK_LT = "#7E604A"
BARK_DK = "#56402F"
BARK_DKR = "#45352A"
HEART = "#B48C62"       # broken heartwood
RINGS = "#9A764F"
MOSS = "#6E8B3D"
MOSS_LT = "#7E9A4A"
MOSS_DK = "#5C7534"
FERN = "#5E8F3A"
FERN_DK = "#4A7530"
STONE = "#8C7B68"
STONE_LT = "#A08E78"
STONE_DK = "#76685A"
CREAM = "#EDE3C8"       # toadstool spots, stalks, gills
CREAM_DK = "#CFC2A2"
SHELF = "#C2A26E"       # shelf fungus top
SHELF_RIM = "#E9D8B4"
SHELF_DK = "#9A7A52"
GLOW_CAP = "#F1F0C8"    # glowing mushroom caps (unshaded)
GLOW_STEM = "#D9D2B0"
HIDE = "#A88A66"
BONE = "#EDE3C8"
OCHRE = "#C98A3D"
BERRY = "#8E3A5A"
FUR = "#8A6E52"
HONEY = "#D9A441"
CRACK = "#2E241C"
CHIP = "#9C7C5C"
SOOT = "#3E352E"
FIRE_IN = "#E8A868"
FIRE_CORE = "#FFF0CC"
HOLE = "#241B15"

DEPTHS = [-40, -24, -40, -24]
CX, CY = -86.0, 14.0           # the stump's axis
RIM = 236.0                    # height of the crown's lip
SQ = 0.92                      # the stump is a little deeper than wide


def radius(z):
    """The stump's radius at height z (root flare, a slight waist, a bulging crown)."""
    pts = [(0, 72.0), (10, 64.0), (28, 59.0), (80, 57.0), (150, 55.5), (210, 55.0), (RIM, 56.5)]
    for (z0, r0), (z1, r1) in zip(pts, pts[1:]):
        if z <= z1:
            t = (z - z0) / max(1e-6, z1 - z0)
            return r0 + (r1 - r0) * t
    return pts[-1][1]


def on_bark(a_deg, z, out=0.6):
    """A point on the stump's surface at angle a (degrees; 270 faces the camera) and height z."""
    a = math.radians(a_deg)
    r = radius(z) + out
    return (CX + math.cos(a) * r, CY + math.sin(a) * r * SQ, z)


def shelf(rig, joint, m, r=(26.0, 19.0), t=8.0, seed=0, dx=0.0):
    """A bracket fungus whose flat top is exactly at the mount m: tan top with growth rings, a cream
    rim and a darker gilled underside (its back half grows out of the bark). dx shifts it along x (the
    branch's shelf keeps clear of the dressing beside the gate)."""
    x, y, z = m
    x += dx
    rx, ry = r
    g = Geo()
    g.blob((x - 2, y + 5, z - t * 0.45), (rx, ry, t), p=2.4, cuts=5)
    g.clip((0, 0, z), (0, 0, 1))
    rig.part(joint, g, SHELF)
    g = Geo()
    g.blob((x - 2, y + 5, z - 3.2), (rx + 1.8, ry + 1.6, 3.4), p=2.4, cuts=5)
    g.clip((0, 0, z - 0.6), (0, 0, 1))
    rig.part(joint, g, SHELF_RIM)
    g = Geo()
    g.blob((x - 2, y + 7, z - t * 1.05), (rx * 0.86, ry * 0.8, t * 0.75), p=2.2, cuts=5)
    g.clip((0, 0, z - 3.4), (0, 0, 1))
    rig.part(joint, g, SHELF_DK)
    g = Geo()
    for k, (sx, sy) in enumerate(((0.62, 0.6), (0.34, 0.32))):
        pts = [(x - 2 + math.cos(math.radians(a)) * rx * sx, y + 5 - math.sin(math.radians(a)) * ry * sy, z + 0.25)
               for a in range(10, 171, 16)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.7, segs=6, rings=1)
    rig.part(joint, g, SHELF_DK, outline=0, highlight=False)


def glow_shrooms(rig, joint, spots, seed=0):
    """Clusters of small glowing mushrooms: spots = [(x, y, z, k, lean_deg)]."""
    rnd = random.Random(seed)
    st, cap, gill = Geo(), Geo(), Geo()
    for x, y, z, k, lean in spots:
        for i in range(4):
            dx = rnd.uniform(-6, 6) * k
            h = rnd.uniform(4.5, 9.0) * k
            r = rnd.uniform(2.6, 4.4) * k
            a = math.radians(90 + lean + rnd.uniform(-18, 18))
            b = (x + dx, y - rnd.uniform(0, 2), z)
            t = (b[0] + math.cos(a) * h, b[1], b[2] + math.sin(a) * h)
            st.capsule(b, t, 0.9 * k, 0.7 * k, segs=8, rings=2)
            cap.lathe([(0, 0), (r, 0), (r * 0.82, r * 0.45), (0.1, r * 0.72)], (t[0], t[1], t[2] - 0.6), segs=12)
            gill.lathe([(0.1, -0.2), (r * 0.92, 0), (0.1, 0.4)], (t[0], t[1], t[2] - 0.8), segs=12)
    rig.part(joint, st, GLOW_STEM, outline=0.4)
    rig.part(joint, gill, CREAM_DK, outline=0)
    rig.part(joint, cap, glow=GLOW_CAP, outline=0.4)


def toadstool(rig, joint, base, top_z, r, seed=0, lean=0.0):
    """A spotted toadstool: a cream stalk with a ring, a team cap with cream spots and gills."""
    rnd = random.Random(seed)
    x, y, z = base
    tx = x + lean
    g = Geo().capsule((x, y, z), (tx, y, top_z), r * 0.28, r * 0.22, segs=14, rings=3)
    rig.part(joint, g, CREAM)
    g = Geo().lathe([(r * 0.2, 0), (r * 0.42, 1.6), (r * 0.36, 3.2), (r * 0.22, 3.6)], (x + lean * 0.6, y, z + (top_z - z) * 0.62), segs=14)
    rig.part(joint, g, CREAM_DK, outline=0.5)
    g = Geo().lathe([(0.1, -1.0), (r * 0.98, 0.4), (r * 0.6, 1.0), (0.1, 1.2)], (tx, y, top_z - 0.8), segs=20)
    rig.part(joint, g, CREAM_DK, outline=0.5)
    cap = Geo().lathe([(0, 0), (r, 0), (r * 1.02, r * 0.18), (r * 0.86, r * 0.52), (r * 0.5, r * 0.88), (0.1, r * 1.0)],
                      (tx, y, top_z), segs=26)
    rig.part(joint, cap, team=True)
    g = Geo()
    for k in range(9):
        a = math.radians(rnd.uniform(195, 345))
        e = rnd.uniform(0.18, 0.8)
        rr = r * (1.0 - 0.55 * e * e)
        px, py, pz = tx + math.cos(a) * rr * 0.98, y + math.sin(a) * rr * 0.98, top_z + r * e * 0.95
        g.blob((px, py, pz), (r * rnd.uniform(0.1, 0.16), 1.2, r * rnd.uniform(0.08, 0.13)), p=2.0, cuts=3,
               rot=(0, -math.degrees(e) * 0.8, math.degrees(a) + 90))
    rig.part(joint, g, CREAM, outline=0.4)


def fern(rig, joint, base, size, seed=0, color=FERN, dark=FERN_DK):
    """A fern clump: arching fronds of paired leaflets."""
    rnd = random.Random(seed)
    g, gd = Geo(), Geo()
    x, y, z = base
    for f in range(5):
        ang = math.radians(30 + 120 * f / 4 + rnd.uniform(-8, 8))
        L = size * rnd.uniform(0.8, 1.15)
        pts = []
        for i in range(6):
            t = i / 5
            pts.append((x + math.cos(ang) * L * t, y - 2 - t * 3, z + math.sin(ang) * L * t - (t * t) * L * 0.35))
        for a, b in zip(pts, pts[1:]):
            gd.capsule(a, b, 0.7, 0.55, segs=6, rings=1)
        for i in range(1, 6):
            p = pts[i]
            s = 1.0 - i / 6
            for side in (-1, 1):
                leaf(g if (i + side) % 2 else gd, p, size * 0.24 * (0.4 + s), size * 0.1, math.degrees(ang) + side * 70, tilt=-20)
    rig.part(joint, gd, dark, finish="hair", outline=0.5)
    rig.part(joint, g, color, finish="hair", outline=0.5)


def vine(rig, joint, top, length, seed=0):
    """A vine hanging from `top` with leaves."""
    rnd = random.Random(seed)
    g, gl = Geo(), Geo()
    x, y, z = top
    pts = [(x + math.sin(i * 0.9 + seed) * 2.0, y - 1.5, z - i * length / 6) for i in range(7)]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.9, 0.7, segs=6, rings=1)
    for i, p in enumerate(pts[1:], 1):
        leaf(gl, p, rnd.uniform(4.5, 6.0), 3.0, -90 + (35 if i % 2 else -35), tilt=-15)
    rig.part(joint, g, FERN_DK, outline=0.4)
    rig.part(joint, gl, FERN, finish="hair", outline=0.5)


def build(rig, M):
    for j, pos in (("toad", (-112, 30, 230)), ("spike", (-122, 40, RIM)), ("branch", (-36, -6, 168)),
                   ("curtain", (-96, -46, 60)), ("shroomsA", (-142, -20, 70))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "fire1", "fire2", "scorch", "split",
              "stub", "tear", "vineA"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("vineB", "body", (0, 0, 0))

    # damage fires: the sibling stump's shelf (50%), the crown and the branch (25%)
    flames(rig, "fire1", [(M[0][0] - 10, M[0][1] - 14, M[0][2] - 2, 1.0), (M[0][0] + 10, M[0][1] - 12, M[0][2] - 6, 0.7),
                          (M[1][0] - 6, M[1][1] - 12, M[1][2] - 4, 0.6)])
    flames(rig, "fire2", [(-110, -30, RIM + 2, 1.25), (-66, -34, RIM - 2, 0.9), (M[2][0] - 18, M[2][1] - 6, M[2][2] - 10, 0.8)])
    g = Geo()
    for x, y, z, rx, rz in ((M[0][0] - 2, M[0][1] - 4, M[0][2] - 18, 13, 9), (-118, -42, 150, 12, 16), (-64, -46, 120, 10, 14)):
        g.blob((x, y, z), (rx, 2.4, rz), p=2.2, taper=(1.0, 0.4))
    rig.part("scorch", g, SOOT, outline=0, highlight=False)

    # the stump: flared roots, a slight waist, a bulging crown (bark ridges and knots on the front)
    prof = [(0, 0)] + [(radius(z), z) for z in (0, 10, 28, 80, 150, 210, RIM)] + [(radius(RIM) - 1.0, RIM + 1.5), (0, RIM + 1.5)]
    g = Geo().lathe(prof, (CX, CY, 0), segs=44, squash=(1.0, SQ))
    rig.part("body", g, BARK)
    # bark: long wavy dark grooves with raised lighter plates between them (cartoon tree bark)
    rnd = random.Random(5)
    grooves, plates, plates_dk = Geo(), Geo(), Geo()

    def hole(a, z, pad=0.0):
        a %= 360
        door = 246 - pad < a < 302 + pad and z < 68 + pad
        win = (abs(a - 228) < 9 + pad and abs(z - 124) < 13 + pad) or (abs(a - 300) < 8 + pad and abs(z - 182) < 12 + pad)
        return door or win

    for a0 in range(194, 374, 8):
        z = 6.0 + rnd.uniform(0, 14)
        while z < RIM - 4:
            run = rnd.uniform(40, 110)
            pts = []
            zz = z
            while zz < min(RIM - 2, z + run):
                a = a0 + math.sin(zz / 31.0 + a0 * 0.7) * 2.6
                if hole(a, zz):
                    break
                pts.append(on_bark(a, zz, 0.15))
                zz += 6.0
            for p0, p1 in zip(pts, pts[1:]):
                grooves.capsule(p0, p1, 1.05, 1.05, segs=6, rings=1)
            z = zz + rnd.uniform(6, 16)
        # a long raised plate beside the groove now and then
        for _ in range(2):
            pz = rnd.uniform(24, RIM - 36)
            pa = a0 + 4 + rnd.uniform(-1, 1)
            if hole(pa, pz, 10) or rnd.random() < 0.35:
                continue
            p = on_bark(pa, pz, -0.4)
            (plates if rnd.random() < 0.7 else plates_dk).blob(p, (2.6, 1.6, rnd.uniform(14, 26)), p=2.4, cuts=3,
                                                               rot=(0, 0, pa + 90))
    rig.part("body", plates_dk, BARK_DK, outline=0.3, highlight=False)
    rig.part("body", plates, BARK_LT, outline=0.3, highlight=False)
    # the grooves are flat dark lines (unshaded, or each segment would catch its own light)
    rig.part("body", grooves, glow=BARK_DKR, outline=0)
    # moss climbing the trunk's foot and its shady right side
    g = Geo()
    for a, z, rx, rz in ((212, 18, 16, 12), (246, 10, 12, 8), (318, 14, 14, 10), (344, 30, 12, 16), (350, 96, 9, 20),
                         (205, 74, 10, 14), (336, 200, 8, 14)):
        p = on_bark(a, z, -1.0)
        g.blob(p, (rx, 5.0, rz), p=2.2, cuts=4, rot=(0, 0, a + 90))
    rig.part("body", g, MOSS, finish="hair")
    g = Geo()
    for a, z, r in ((214, 168, 6.0), (320, 92, 5.0), (252, 206, 4.4), (338, 150, 4.0)):
        p = on_bark(a, z, 1.0)
        g.blob(p, (r, 2.6, r * 0.8), p=2.2)
    rig.part("body", g, BARK_DKR)
    g = Geo()
    for a, z, r in ((214, 168, 2.6), (320, 92, 2.2), (252, 206, 1.9), (338, 150, 1.7)):
        p = on_bark(a, z, 2.6)
        g.sphere(p, r, cuts=2)
    rig.part("body", g, BARK_LT, outline=0.4)

    # the crown: a cut lip, a dark hollow, a ring of jagged splinters, moss carpet and drapes
    g = Geo().lathe([(radius(RIM) - 10.0, 0), (radius(RIM) + 0.5, 0), (radius(RIM) + 0.5, 2.2), (radius(RIM) - 10.0, 2.2)],
                    (CX, CY, RIM), segs=44, squash=(1.0, SQ))
    rig.part("body", g, HEART)
    g = Geo().blob((CX, CY, RIM + 1.6), (radius(RIM) - 10.5, (radius(RIM) - 10.5) * SQ, 3.0), p=2.0, cuts=5)
    rig.part("body", g, HOLE, highlight=False)
    sp_front, sp_back = Geo(), Geo()
    rnd = random.Random(11)
    for i in range(22):
        a = 360.0 * i / 22 + rnd.uniform(-4, 4)
        if 280 < a < 320:      # leave room for the crown shelf (mount 3)
            continue
        back = 20 < a < 175
        h = rnd.uniform(10, 24) * (1.5 if back else 1.0)
        lean = rnd.uniform(-8, 8)
        base = on_bark(a, RIM - 4, -3.0)
        tip = (base[0] + math.cos(math.radians(a)) * 3 + lean * 0.3, base[1] + math.sin(math.radians(a)) * 2, RIM + h)
        (sp_back if back else sp_front).blob(((base[0] + tip[0]) / 2, (base[1] + tip[1]) / 2, (base[2] + tip[2]) / 2 + 2),
                                             (rnd.uniform(5.5, 8.5), 4.0, h * 0.62 + 4), p=2.0, cuts=4, taper=(1.0, 0.12),
                                             rot=(0, lean, a + 90))
    rig.part("body", sp_back, BARK_DK)
    rig.part("body", sp_front, BARK)
    # the tall splinter at the back left (broken off at 25%)
    g = Geo().blob((-124, 42, RIM + 30), (8.0, 5.5, 34.0), p=2.0, cuts=5, taper=(1.0, 0.08), rot=(0, -6, 0))
    rig.part("spike", g, BARK_LT)
    g = Geo().blob((-122, 36, RIM + 22), (2.0, 1.0, 18.0), p=2.0, cuts=3, taper=(1.0, 0.2), rot=(0, -6, 0))
    rig.part("spike", g, HEART, outline=0)
    g = Geo().blob((-124, 42, RIM + 6), (8.2, 5.8, 8.0), p=2.0, cuts=4, taper=(1.0, 0.5))
    rig.part("stub", g, BARK_LT)
    g = Geo()
    rock(g, (CX + 6, CY - 6, RIM + 3), (40, 30, 6), seed=3, jag=0.18, p=2.4, cuts=4)
    g.clip((0, 0, RIM + 1.0), (0, 0, -1))
    rig.part("body", g, MOSS_LT, finish="hair")
    moss_drape(rig, "body", [(CX - 30, CY - 50, RIM - 2, 26), (CX + 4, CY - 52, RIM - 3, 18), (CX - 52, CY - 30, RIM - 4, 16),
                             (CX - 46, CY - 40, 150, 18)], MOSS_DK, seed=5)

    # the toadstools: a big one on the crown (team cap), a smaller one on the boulders
    toadstool(rig, "toad", (-112, 30, RIM - 6), RIM + 26, 27.0, seed=1, lean=4.0)
    toadstool(rig, "body", (-153, -4, 104), 126, 14.0, seed=2, lean=-5.0)

    # boulders fused into the stump's left foot, with moss caps
    g = Geo()
    rock(g, (-143, 2, 38), (35, 32, 40), seed=21, jag=0.12)
    rock(g, (-136, 34, 86), (30, 26, 34), seed=22, jag=0.14)
    rock(g, (-118, -40, 14), (22, 16, 15), seed=23, jag=0.16)
    rig.part("body", g, STONE)
    g = Geo()
    rock(g, (-145, 4, 46), (36, 33, 40), seed=21, jag=0.12)
    g.clip((0, 0, 66), (0, 0, -1))
    rig.part("body", g, MOSS, finish="hair")
    g = Geo()
    rock(g, (-158, -26, 12), (16, 12, 12), seed=24, jag=0.2)
    rig.part("body", g, STONE_DK)

    # root buttresses gripping the ground
    roots = Geo()
    for a, L, h in ((205, 38, 30), (240, 30, 26), (300, 34, 24), (330, 40, 30), (262, 22, 16)):
        p0 = on_bark(a, h, -6)
        d = (math.cos(math.radians(a)), math.sin(math.radians(a)) * SQ)
        p1 = (p0[0] + d[0] * L * 0.5, p0[1] + d[1] * L * 0.5 - 2, h * 0.45)
        p2 = (p0[0] + d[0] * L, p0[1] + d[1] * L - 3, 1.0)
        roots.capsule(p0, p1, 9.0, 7.0, segs=12, rings=3)
        roots.capsule(p1, p2, 7.0, 3.6, segs=12, rings=3)
    rig.part("body", roots, BARK_DK)

    # the door: a hollow between the roots, firelit, behind a team hide curtain on a stick
    dx, dz = -96.0, 0.0
    fy = on_bark(270 - 9, 30, 0)[1]
    g = Geo().blob((dx, fy + 6, 26), (19, 9, 34), p=2.2, cuts=5)
    g.clip((0, 0, 0.5), (0, 0, -1))
    rig.part("body", g, BARK_DKR)
    g = Geo().blob((dx, fy + 1, 24), (15, 7, 30), p=2.2, cuts=5)
    g.clip((0, 0, 0.5), (0, 0, -1))
    rig.part("body", g, HOLE, highlight=False)
    g = Geo().blob((dx + 3, fy - 4, 6), (10, 3, 9), p=2.0)
    rig.part("body", g, glow=FIRE_IN, outline=0)
    g = Geo().blob((dx + 3, fy - 6, 4), (5, 2.4, 5), p=2.0)
    rig.part("body", g, glow=FIRE_CORE, outline=0)
    g = Geo().capsule((dx - 20, fy - 8, 54), (dx + 18, fy - 8, 56), 1.5)
    rig.part("curtain", g, BONE, outline=0.5)
    cur = [(dx - 19, 55), (dx + 2, 56), (dx + 3, 30), (dx - 2, 14), (dx - 8, 4), (dx - 16, 2), (dx - 19, 8)]
    g = Geo().slab(cur, fy - 7.0, 1.6)
    rig.part("curtain", g, team=True)
    g = Geo()
    for x, z in ((dx - 12, 46), (dx - 6, 36), (dx - 12, 26)):
        g.blob((x, fy - 8.2, z), (2.2, 0.6, 1.6), p=2.0)
    rig.part("curtain", g, OCHRE, outline=0, highlight=False)
    g = Geo().slab([(dx + 3, 30), (dx - 4, 22), (dx + 2, 16)], fy - 8.4, 0.8)    # a rip (50%)
    rig.part("tear", g, HOLE, outline=0, highlight=False)

    # knot-hole windows with warm light and a small shutter
    for a, z, r in ((228, 124, 6.5), (300, 182, 5.5)):
        p = on_bark(a, z, 0.5)
        g = Geo()
        cyl(g, (p[0], p[1] + 2.0, p[2]), (p[0], p[1] - 2.0, p[2]), r + 2.4, bevel=0.8, segs=18)
        rig.part("body", g, BARK_DKR, outline=0.5)
        g = Geo()
        cyl(g, (p[0], p[1] - 1.6, p[2]), (p[0], p[1] - 2.4, p[2]), r, bevel=0.2, segs=18)
        rig.part("body", g, glow="#FFD89A", outline=0)
        g = Geo()
        g.capsule((p[0] - r, p[1] - 3.4, p[2] - 0.5), (p[0] + r, p[1] - 3.4, p[2] + 0.5), 0.8, segs=6, rings=1)
        rig.part("body", g, BARK_DK, outline=0.3)

    # a painted team hide on two bone rods on the trunk
    hp = on_bark(226, 190, 2.0)
    hx, hy, hz = hp
    g = Geo().slab([(hx - 13, hz + 20), (hx + 13, hz + 22), (hx + 16, hz), (hx + 9, hz - 18), (hx, hz - 22),
                    (hx - 10, hz - 18), (hx - 15, hz)], hy - 1.5, 2.0)
    rig.part("body", g, team=True)
    g = Geo().capsule((hx - 17, hy - 2.6, hz + 20), (hx + 17, hy - 2.6, hz + 23), 1.4)
    g.capsule((hx - 13, hy - 2.6, hz - 18), (hx + 13, hy - 2.6, hz - 20), 1.1)
    rig.part("body", g, BONE, outline=0.6)
    g = Geo().blob((hx, hy - 3.6, hz + 1), (5.5, 1.0, 5.5), p=2.0)
    rig.part("body", g, OCHRE, outline=0.5)

    # the branch reaching toward the lane (it carries mount 2's shelf; cracked and drooping at 25%)
    b0 = on_bark(330, 160, -10)
    pts = [b0, (-30, -14, 176), (-12, -28, 184), (M[2][0] - 2, M[2][1] + 6, M[2][2] - 9)]
    g = Geo()
    for i, (a, b) in enumerate(zip(pts, pts[1:])):
        g.capsule(a, b, 11.0 - i * 2.4, 8.6 - i * 2.4, segs=14, rings=3)
    g.capsule((-24, -18, 180), (-20, -26, 206), 2.6, 1.2, segs=8, rings=2)
    g.capsule((-6, -32, 186), (6, -36, 168), 2.4, 1.0, segs=8, rings=2)
    rig.part("branch", g, BARK)
    g = Geo()
    for a, b in zip(pts, pts[1:]):
        g.capsule((a[0], a[1] - 6, a[2] + 2), (b[0], b[1] - 5, b[2] + 2), 1.4, 1.1, segs=6, rings=1)
    rig.part("branch", g, BARK_LT, outline=0.4)
    vine(rig, "branch", (-28, -24, 172), 34, seed=3)
    shelf(rig, "branch", M[2], r=(23, 17), seed=2, dx=-5.0)

    # the platforms: a mossy sibling stump by the gate (its cut top is the platform), shelf fungi
    x, y, z = M[0]
    g = Geo().lathe([(0, 0), (24, 0), (21, 6), (19.5, 20), (19.5, z - 3), (19, z), (0, z)], (x - 2, y + 6, 0), segs=28,
                    squash=(1.0, 0.86))
    rig.part("body", g, BARK)
    g = Geo().lathe([(0, 0), (19.2, 0), (19.2, 0.6), (0, 0.6)], (x - 2, y + 6, z - 0.4), segs=28, squash=(1.0, 0.86))
    rig.part("body", g, HEART, outline=0.5)
    g = Geo()
    for rr in (6.0, 11.5, 16.0):
        pts2 = [(x - 2 + math.cos(math.radians(a)) * rr, y + 6 - math.sin(math.radians(a)) * rr * 0.86, z + 0.35) for a in range(15, 166, 15)]
        for p0, p1 in zip(pts2, pts2[1:]):
            g.capsule(p0, p1, 0.6, segs=6, rings=1)
    rig.part("body", g, RINGS, outline=0, highlight=False)
    g = Geo()
    for a0 in (205, 232, 262, 292, 322):
        pts2 = [((x - 2) + math.cos(math.radians(a0)) * 20.0, (y + 6) + math.sin(math.radians(a0)) * 17.6, zz) for zz in (6, 20, 34, z - 6)]
        for p0, p1 in zip(pts2, pts2[1:]):
            g.capsule(p0, p1, 1.6, segs=6, rings=1)
    rig.part("body", g, BARK_DK, outline=0.4)
    g = Geo()
    rock(g, (x - 8, y - 2, z - 2), (16, 10, 4), seed=31, jag=0.2, p=2.4, cuts=4)
    g.clip((0, 0, z - 3.2), (0, 0, -1))
    rig.part("body", g, MOSS, finish="hair")
    shelf(rig, "body", M[1], r=(25, 18), seed=1)
    shelf(rig, "body", M[3], r=(25, 19), seed=3)

    # glowing mushrooms (a cluster knocked off at 75%), ferns, hanging vines
    glow_shrooms(rig, "shroomsA", [(-142, -24, 70, 1.2, 10), (-130, -34, 46, 1.0, -10)], seed=1)
    glow_shrooms(rig, "body", [(-58, -52, 24, 1.1, 15), (-20, -56, 8, 0.9, 0), (M[0][0] - 14, M[0][1] - 14, 22, 0.9, -15),
                               (-146, -10, 128, 1.0, 20)], seed=2)
    fern(rig, "body", (-128, -50, 2), 26, seed=1)
    fern(rig, "body", (-66, -58, 1), 22, seed=2)
    fern(rig, "body", (14, -50, 1), 18, seed=3)
    vine(rig, "vineA", (-112, -40, RIM - 2), 52, seed=7)
    vine(rig, "vineB", (-60, -46, RIM - 4), 40, seed=8)

    # pebbles and acorns on the ground
    g = Geo()
    for i, (x2, y2) in enumerate(((-166, -48), (-130, -66), (-78, -66), (28, -46))):
        rock(g, (x2, y2, 2), (5 + i, 4.5, 3.5), seed=40 + i, jag=0.2)
    rig.part("body", g, STONE_DK)

    chipped_cracks(rig, "crack1", [[on_bark(250, 140, 1.0), on_bark(255, 128, 1.0), on_bark(250, 116, 1.0)],
                                   [on_bark(318, 210, 1.0), on_bark(322, 198, 1.0), on_bark(318, 186, 1.0)]], CRACK, CHIP)
    chipped_cracks(rig, "crack2", [[on_bark(230, 80, 1.0), on_bark(235, 66, 1.0), on_bark(230, 52, 1.0)],
                                   [on_bark(290, 120, 1.0), on_bark(295, 106, 1.0), on_bark(290, 92, 1.0), on_bark(296, 80, 1.0)],
                                   [on_bark(212, 214, 1.0), on_bark(216, 202, 1.0), on_bark(212, 190, 1.0)]], CRACK, CHIP)
    chipped_cracks(rig, "crack3", [[on_bark(268, 226, 1.0), on_bark(273, 214, 1.0), on_bark(268, 202, 1.0)],
                                   [on_bark(336, 70, 1.0), on_bark(340, 58, 1.0), on_bark(336, 44, 1.0)]], CRACK, CHIP)
    # 25%: the branch cracked near the trunk (it carries mount 2, so it never moves)
    g = Geo().slab([(-33, 186), (-30, 178), (-34, 172), (-29, 164), (-25, 166), (-28, 172), (-24, 180), (-27, 188)], -24.4, 1.2)
    rig.part("crack3", g, HOLE, outline=0, highlight=False)
    g = Geo()
    for zz, sgn in ((184, 1), (170, -1)):
        g.blob((-29 + sgn * 5, -25.6, zz), (3.6, 1.2, 1.6), p=2.0, cuts=3, rot=(0, sgn * 30, 0), taper=(1.0, 0.2))
    rig.part("crack3", g, HEART, outline=0.4)
    # 25%: the trunk split open on the hollow (a ragged dark gash with splinters)
    sx = on_bark(282, 150, 0.8)
    pts3 = [(sx[0] - 4, 196), (sx[0] + 5, 182), (sx[0] - 1, 168), (sx[0] + 7, 150), (sx[0] + 1, 132), (sx[0] + 6, 112),
            (sx[0] - 6, 112), (sx[0] - 9, 132), (sx[0] - 4, 150), (sx[0] - 11, 168), (sx[0] - 6, 182)]
    g = Geo().slab(pts3, sx[1] - 0.6, 1.4)
    rig.part("split", g, HOLE, outline=0, highlight=False)
    g = Geo()
    for zz, sgn in ((186, 1), (166, -1), (146, 1), (124, -1)):
        g.blob((sx[0] + sgn * 7, sx[1] - 2.4, zz), (5.0, 1.6, 2.0), p=2.0, cuts=3, rot=(0, sgn * 30, 0), taper=(1.0, 0.2))
    rig.part("split", g, HEART, outline=0.4)
    for j, pts4 in (("rubble1", [(-160, -44), (-140, -56)]), ("rubble2", [(-60, -64), (-128, -66), (-92, -70)]),
                    ("rubble3", [(-160, -62), (22, -62), (-80, -72), (-140, -70)])):
        g, gb = Geo(), Geo()
        for k, (x2, y2) in enumerate(pts4):
            rock(g, (x2, y2, 3), (8, 6, 5), seed=sum(map(ord, j)) + k, jag=0.25)
            gb.blob((x2 + 9, y2 - 2, 2.2), (6.0, 2.4, 2.0), p=3.0, cuts=3, rot=(0, 0, k * 40))
        rig.part(j, g, STONE_DK)
        rig.part(j, gb, BARK_LT, outline=0.5)

    # flags: on the toadstool's cap and on the boulders' shoulder
    flag(rig, "root", "flagA", (-108, 30, RIM + 74), length=30, height=18, pole=RIM + 48)
    flag(rig, "root", "flagB", (-150, 30, 172), length=24, height=15, pole=118)

    # Treasury in front of the left foot
    g = Geo()
    cyl(g, (-156, -60, 0), (-156, -60, 12), 10, 12.5, bevel=1.2)
    rig.part("treasury1", g, "#B8A47E", finish="hair", outline=0.8)
    g = Geo()
    for ddx, ddy, ddz in ((-4, 0, 14), (3, -2, 15), (0, 3, 17), (5, 2, 13), (-6, -3, 12), (1, -5, 13)):
        g.sphere((-156 + ddx, -60 + ddy, ddz), 3.4, cuts=2)
    rig.part("treasury1", g, BERRY, finish="gloss", outline=0.5)
    g = Geo()
    for ddx, ddz in ((-14, 3), (-10, 2.5), (-12, 6)):
        g.blob((-156 + ddx + 26, -64, ddz), (2.6, 2.4, 3.0), p=2.2)
    rig.part("treasury1", g, "#8A6440", outline=0.5)
    g = Geo()
    rock(g, (-164, -40, 6), (13, 10, 7), seed=51, jag=0.12, p=2.4)
    rock(g, (-162, -42, 14), (10, 8, 5), seed=52, jag=0.12, p=2.4)
    rig.part("treasury2", g, FUR, finish="hair")
    g = Geo()
    for k in range(5):
        g.blob((-142 + (k % 3) * 5.4 - 5, -58, 7 + (k // 3) * 5), (3.0, 2.6, 2.6), p=6.0, cuts=2)
    rig.part("treasury2", g, HONEY, finish="gloss", outline=0.5)
    g = Geo()
    for x0 in (-66, -56):
        pts5 = [(x0, -72, 2), (x0 + 8, -72, 8), (x0 + 18, -72, 12), (x0 + 26, -70, 12)]
        for i, (a, b) in enumerate(zip(pts5, pts5[1:])):
            g.capsule(a, b, 2.8 - i * 0.6, 2.8 - (i + 1) * 0.6)
    rig.part("treasury3", g, BONE)
    g = Geo()
    for k, (x2, z2) in enumerate(((-76, 3), (-70, 4), (-73, 9))):
        rock(g, (x2, -74, z2), (3.6, 3, 3), seed=60 + k, jag=0.15)
    rig.part("treasury3", g, OCHRE, finish="gloss", outline=0.5)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "shroomsA": {"hide": True}, "rubble1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "tear": {"show": True}, "curtain": {"r": -6.0, "x": 1.0}, "vineB": {"hide": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire2": {"show": True}, "split": {"show": True},
                     "toad": {"r": 18.0, "x": -6.0, "z": -10.0}, "spike": {"hide": True}, "stub": {"show": True},
                     "curtain": {"r": -16.0, "x": 2.0, "z": -2.0}, "vineA": {"show": True}})
    return pose


MOSSY_DEN = base_module(
    "stone", "Mossy Den", height=300, width=190, canvas=(460, 640), feet=(350, 590),
    build=build, crumble=crumble, mount_depth=DEPTHS, skin="mossy_den",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-93, -54, 8), 3, 30), (on_bark(228, 124, -3), 2, 16), (on_bark(300, 182, -3), 2, 14),
            ((-140, -36, 76), 1, 20), ((-56, -60, 30), 2, 18), ((-150, -20, 140), 1, 16)],
    smoke=[((-86, 0, RIM + 10), 2), ((-110, -30, 160), 3), ((-150, -10, 104), 3)],
    horn=(-96, 316), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "stone",
        # the stump's crown with its toadstool falls toward the lane; the branch with it
        "topple": [topple_lu(-176, 14, 150, delay_ms=0, push=1.0, sink_lu=34)],
        "rubbleColors": [BARK, BARK_DK, STONE, MOSS],
        "dustColor": "#B3A386",
        "ambientLu": [ambient_lu("fireflies", (-140, -36, 80), 22, 1.0), ambient_lu("fireflies", (-56, -60, 34), 20, 1.0),
                      ambient_lu("fireflies", (-150, -20, 140), 18, 0.8), ambient_lu("fireflies", (-90, -40, RIM - 20), 24, 0.8),
                      ambient_lu("fireflies", (6, -52, 30), 18, 0.6)],
    },
)

SKINS = [MOSSY_DEN]
