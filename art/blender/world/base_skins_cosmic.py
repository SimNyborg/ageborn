"""Cosmic Age base skins as real models (PLAN 2c): `base.cosmic@<skin>`.

Nebula Ark (Legendary, Wardrobe Crate; round 2): the Star Ark wrapped in its own nebula. A sleeker void
hull with a taller star-white prow and a beacon, two broad team hull bands, and between them a band of
light where the ark's glowing star core shows through a ring of viewports; two nebula ribbons (violet and
lilac, edged with glowing light and dusted with stars) spiral round the hull from the cradle to the prow,
and a thin halo of light circles the nose. It stands in a three-clawed cradle over a glowing nebula pool,
with swept star-specked fins, a violet ramp to a lit team doorway, and hover discs for the mounts. Team
colour: the two hull bands, the doorway and the fin tips (as large as the Star Ark's, A11).

Crumble: 75% a chunk bitten out of the upper band with sparking wires, a fin lost, a ribbon torn away;
50% violet plasma fire in the gap, the core and viewports dark, a cradle claw broken, the prow knocked
askew; 25% a breach at the foot with a hanging cable, the second ribbon gone, the prow snapped to a burning
stump with the nose lying in the rubble. Treasury, the star forge: energy cells (1), a star crystal on an
anvil (2), a nebula orb in a forge ring (3).
"""
import math
import random

from mathutils import Matrix, Vector

from ageborn_art import rigs_cosmic as K
from ageborn_art.geometry import Geo

from world.common import BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, rubble, topple_lu

HULL = "#30254A"          # the void hull (a touch deeper than the Star Ark's)
HULL_LT = "#45376A"
ARMOR = "#D2CCE6"         # star white (~0.82 albedo, so the shading shows)
ARMOR_LT = "#E2DEF0"
SEAM = "#1E1630"
NEB = "#9A5FD2"           # the nebula ribbon (violet)
NEB_LT = "#B98BE4"        # the second ribbon (lilac)
NEB_EDGE = "#D6B8FF"      # glowing ribbon edges (unshaded)
STARS = "#FFFFFF"
CORE = "#F4ECFF"          # the star core's light
CORE_RIM = "#C9A6FF"
HOLE = "#120C1E"
CRACK = "#150F22"

DEPTHS = [-40, -24, -40, -24]
SP = (-92.0, 26.0)
Z0 = 20.0
PROFILE = [(0, 0), (40, 0), (47, 20), (48, 64), (45, 114), (38, 158), (30, 190), (22, 210), (0, 216)]


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


def front(z, dx=0.0, push=1.2):
    r = radius_at(z)
    return (SP[0] + dx, SP[1] - 0.8 * math.sqrt(max(1.0, r * r - dx * dx)) - push, z)


def ribbon(g, pts, widths, thick=1.4):
    """A closed flat ribbon along a path round the hull: each point gets a radial thickness and a vertical
    width (a rectangular cross-section), so the toon outline and shading work on it."""
    rings = []
    for (x, y, z), w in zip(pts, widths):
        rx, ry = x - SP[0], (y - SP[1]) / 0.8
        L = math.hypot(rx, ry) or 1.0
        nx, ny = rx / L, ry / L * 0.8
        h = w / 2.0
        t = thick / 2.0
        rings.append([(x - nx * t, y - ny * t, z - h), (x + nx * t, y + ny * t, z - h), (x + nx * t, y + ny * t, z + h), (x - nx * t, y - ny * t, z + h)])
    verts, faces = [], []
    for r in rings:
        verts += r
    for i in range(len(rings) - 1):
        a, b = i * 4, (i + 1) * 4
        for k in range(4):
            k2 = (k + 1) % 4
            faces.append((a + k, a + k2, b + k2, b + k))
    faces.append((3, 2, 1, 0))
    n = (len(rings) - 1) * 4
    faces.append((n, n + 1, n + 2, n + 3))
    g._add(verts, faces, Matrix.Identity(4), smooth=True)
    return g


def helix(a0, turns, z0, z1, out, n=64):
    """Points of a helix round the hull from (angle a0, z0) to z1 at `out` lu off the hull."""
    pts = []
    for i in range(n + 1):
        t = i / n
        a = a0 + 360.0 * turns * t
        z = z0 + (z1 - z0) * t
        pts.append(on_hull(a, z, out + 2.0 * math.sin(t * math.pi)))
    return pts


def _jagged(cx, cz, rx, rz, n=11, seed=0, amp=0.28):
    pts = []
    for k in range(n):
        a = 2 * math.pi * k / n
        f = 1.0 + amp * (1 if (k + seed) % 2 else -1) * (0.6 + 0.4 * math.sin(k * 2.3 + seed))
        pts.append((cx + rx * f * math.cos(a), cz + rz * f * math.sin(a)))
    return pts


def plasma(rig, joint, spots):
    """Void-plasma fire: violet teardrop tongues with a pale core."""
    o, g, c = Geo(), Geo(), Geo()
    for x, y, z, k in spots:
        for dx, lean, r, h in ((0.0, 0.25, 6.0, 19.0), (-5.5, -0.35, 4.0, 12.0), (5.5, 0.45, 3.8, 10.0)):
            cx, cz = x + dx * k, z + h * 0.42 * k
            o.blob((cx, y + 2, cz), (r * 1.3 * k, r * 0.9 * k, h * 0.62 * k), p=2.0, taper=(1.0, 0.08), shift=(lean * 1.2, 0.0))
            g.blob((cx, y, cz - 0.6 * k), (r * k, r * 0.7 * k, h * 0.5 * k), p=2.0, taper=(1.0, 0.1), shift=(lean, 0.0))
            c.blob((cx, y - 2.5, cz - 2.4 * k), (r * 0.5 * k, r * 0.4 * k, h * 0.28 * k), p=2.0, taper=(1.0, 0.2), shift=(lean * 0.6, 0.0))
    rig.part(joint, o, glow="#7A38B8", outline=0)
    rig.part(joint, g, glow="#B77BFF", outline=0)
    rig.part(joint, c, glow="#F4EAFF", outline=0)


def nebula_ribbon(rig, joint, a0, turns, z0, z1, out, wmax, color, seed=0):
    """One nebula ribbon (toon-shaded, its edges glowing, a dust of stars on it)."""
    pts = helix(a0, turns, z0, z1, out)
    n = len(pts)
    widths = [wmax * (0.3 + 0.7 * math.sin(math.pi * i / (n - 1)) ** 0.7) for i in range(n)]
    g = Geo()
    ribbon(g, pts, widths)
    rig.part(joint, g, color, finish="gloss", outline=0.6, outline_hex="#4A2A78")
    e = Geo()
    for sgn in (-1, 1):
        edge = [(x, y, z + sgn * w * 0.46) for (x, y, z), w in zip(pts, widths)]
        front_pts = [p for p in edge if p[1] < SP[1] - 4]
        for a, b in zip(front_pts, front_pts[1:]):
            if math.dist(a, b) < 12:
                e.capsule((a[0], a[1] - 1.2, a[2]), (b[0], b[1] - 1.2, b[2]), 0.55, segs=6, rings=1)
    rig.part(joint, e, glow=NEB_EDGE, outline=0)
    s = Geo()
    rnd = random.Random(seed)
    for i in range(4, n - 4, 3):
        x, y, z = pts[i]
        if y > SP[1] - 6 or rnd.random() < 0.35:
            continue
        w = widths[i]
        s.star((x + rnd.uniform(-2, 2), y - 2.0, z + rnd.uniform(-w * 0.3, w * 0.3)), rnd.uniform(1.6, 2.6), 0.7, 0.6, points=4, rot=(90, 0, 0))
    rig.part(joint, s, glow=STARS, outline=0)


def build(rig, M):
    for j, pos in (("tip", (SP[0], SP[1], Z0 + 208)), ("fin", (SP[0] - 46, SP[1], 70)), ("claw", (0, 0, 0)), ("strut", (0, 0, 0)),
                   ("ribA", (SP[0], SP[1], 0)), ("ribB", (SP[0], SP[1], 0)), ("halo", (SP[0], SP[1], Z0 + 232))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "clawbroken", "notch", "sparks1", "fire1", "scorch",
              "darkwin", "breach", "fire2", "stump", "cable", "tipfallen"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)

    # the nebula pool under the hull and the cradle: three clawed struts gripping the hull's foot
    g = Geo()
    cyl(g, (SP[0], SP[1], 0.2), (SP[0], SP[1], 2.2), 56, 50, bevel=0.6, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, glow="#7E4ABF", outline=0)
    g = Geo()
    cyl(g, (SP[0], SP[1], 1.6), (SP[0], SP[1], 3.2), 38, 34, bevel=0.4, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, glow="#C9A6FF", outline=0)
    g = Geo()
    cyl(g, (SP[0], SP[1], 3), (SP[0], SP[1], Z0 + 2), 38, 42, bevel=1.0, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, SEAM, finish="gloss")
    for i, a in enumerate((-140, -40, 70)):
        c, s_ = math.cos(math.radians(a)), math.sin(math.radians(a)) * 0.72
        top = (SP[0] + 50 * c, SP[1] + 50 * s_, 46)
        knee = (SP[0] + 70 * c, SP[1] + 70 * s_, 30)
        foot = (SP[0] + 76 * c, SP[1] + 76 * s_, 2)
        joint = "claw" if i == 1 else "body"
        g = Geo()
        g.capsule(top, knee, 4.0, 3.4)
        g.capsule(knee, foot, 3.4, 2.6)
        rig.part(joint, g, HULL_LT, finish="metal")
        g = Geo()
        g.capsule((top[0] - c * 2, top[1] - s_ * 2, top[2] + 2), (top[0] - c * 10, top[1] - s_ * 10, top[2] + 10), 2.4, 1.0)
        rig.part(joint, g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
        g = Geo()
        cyl(g, (foot[0], foot[1], 0), (foot[0], foot[1], 4), 7.0, 6.0, bevel=0.8, segs=16, squash=(1.0, 0.72))
        rig.part(joint, g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    c, s_ = math.cos(math.radians(-40)), math.sin(math.radians(-40)) * 0.72
    g = Geo().capsule((SP[0] + 56 * c, SP[1] + 56 * s_ - 6, 4), (SP[0] + 88 * c, SP[1] + 88 * s_ - 6, 3), 3.4, 2.6)
    rig.part("clawbroken", g, HULL_LT, finish="metal")

    # the hull, star-white armour bands, the two big team bands, violet trim rings
    g = Geo().lathe(PROFILE, (SP[0], SP[1], Z0), (SP[0], SP[1], Z0 + 216), segs=40, squash=(1.0, 0.8))
    rig.part("body", g, HULL, finish="gloss")
    for z0, z1 in ((Z0 + 4, Z0 + 30), (Z0 + 184, Z0 + 202)):
        g = Geo().lathe([(radius_at(z0) + 1.4, 0), (radius_at((z0 + z1) / 2) + 2.0, (z1 - z0) / 2), (radius_at(z1) + 1.4, z1 - z0)],
                        (SP[0], SP[1], z0), (SP[0], SP[1], z1), segs=40, squash=(1.0, 0.8))
        rig.part("body", g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    for z0, z1 in ((Z0 + 34, Z0 + 92), (Z0 + 122, Z0 + 170)):
        g = Geo().lathe([(radius_at(z0) + 1.0, 0), (radius_at((z0 + z1) / 2) + 1.6, (z1 - z0) / 2), (radius_at(z1) + 1.0, z1 - z0)],
                        (SP[0], SP[1], z0), (SP[0], SP[1], z1), segs=40, squash=(1.0, 0.8))
        rig.part("body", g, team=True)
    for z in (Z0 + 32, Z0 + 94, Z0 + 120, Z0 + 172):
        g = Geo()
        cyl(g, (SP[0], SP[1], z - 1.2), (SP[0], SP[1], z + 1.2), radius_at(z) + 2.4, bevel=0.3, segs=40, squash=(1.0, 0.8))
        rig.part("body", g, K.VIOLET, finish="gloss")
    # the star core band: a ring of round viewports full of the core's light, a glow strip round it
    g = Geo()
    zc = Z0 + 107
    cyl(g, (SP[0], SP[1], zc - 9), (SP[0], SP[1], zc + 9), radius_at(zc) + 0.8, bevel=0.6, segs=40, squash=(1.0, 0.8))
    rig.part("body", g, SEAM, finish="gloss", outline=0.5)
    bez, pane = Geo(), Geo()
    for a_deg in range(-160, -15, 16):
        bez.blob(on_hull(a_deg, zc, 1.8), (5.6, 5.6, 5.6), p=2.4, rot=(0, 0, a_deg + 90))
        pane.blob(on_hull(a_deg, zc, 3.2), (4.2, 4.2, 4.2), p=2.4, rot=(0, 0, a_deg + 90))
    rig.part("body", bez, ARMOR_LT, finish="gloss", outline=0.5, outline_hex=K.STAR_TRIM)
    rig.part("body", pane, glow=CORE, outline=0)
    g = Geo()
    for a_deg in range(-160, -15, 16):
        g.blob(on_hull(a_deg, zc, 4.4), (2.0, 2.0, 2.0), p=2.4, rot=(0, 0, a_deg + 90))
    rig.part("body", g, glow="#FFFFFF", outline=0)
    # panel seams and small portholes on the dark hull
    seams = Geo()
    for a_deg in (-150, -118, -86, -54, -22):
        for z0, z1 in ((Z0 + 174, Z0 + 182),):
            seams.capsule(on_hull(a_deg, z0, 0.9), on_hull(a_deg, z1, 0.9), 0.9, segs=6, rings=2)
    rig.part("body", seams, SEAM, outline=0, highlight=False)
    g = Geo()
    zc2 = Z0 + 177
    for a_deg in range(-140, -30, 14):
        g.blob(on_hull(a_deg, zc2, 1.0), (3.0, 3.0, 2.6), p=3.0, rot=(0, 0, a_deg + 90))
    rig.part("body", g, glow="#B98CFF", outline=0.6, outline_hex=SEAM)

    # the prow (falls at 25%): a taller star-white cone, a violet collar, a lit canopy strip, the beacon
    g = Geo().lathe([(0, 0), (23, 0), (18, 26), (9, 56), (0, 74)], (SP[0], SP[1], Z0 + 206), (SP[0], SP[1], Z0 + 280), segs=32, squash=(1.0, 0.8))
    rig.part("tip", g, ARMOR_LT, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    cyl(g, (SP[0], SP[1], Z0 + 222), (SP[0], SP[1], Z0 + 225), 20.6, bevel=0.4, segs=32, squash=(1.0, 0.8))
    cyl(g, (SP[0], SP[1], Z0 + 246), (SP[0], SP[1], Z0 + 248.6), 14.2, bevel=0.4, segs=32, squash=(1.0, 0.8))
    rig.part("tip", g, K.VIOLET, finish="gloss")
    g = Geo()
    for k in range(6):
        zz = Z0 + 228 + k * 7.0
        r_ = 19.6 - k * 2.6
        g.blob((SP[0] - 2.0, SP[1] - r_ * 0.8 - 0.6, zz), (4.2 - k * 0.5, 1.2, 2.4), p=2.6)
    rig.part("tip", g, glow="#C9A6FF", outline=0.6, outline_hex=SEAM)
    g = Geo().sphere((SP[0], SP[1], Z0 + 281), 5.4, cuts=3)
    rig.part("tip", g, glow="#F4ECFF", outline=0.8, outline_hex="#9A5FD2")
    g = Geo().lathe([(6.6, -0.8), (9.4, 0), (6.6, 0.8)], (SP[0], SP[1] - 2, Z0 + 281), (SP[0], SP[1] - 3, Z0 + 281), segs=24)
    rig.part("tip", g, glow="#D6B8FF", outline=0)
    # the halo of light round the nose (a thin tilted ring)
    g = Geo()
    n = 48
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p0 = (SP[0] + math.cos(a0) * 34, SP[1] + math.sin(a0) * 34 * 0.42, Z0 + 238 + math.sin(a0) * 6)
        p1 = (SP[0] + math.cos(a1) * 34, SP[1] + math.sin(a1) * 34 * 0.42, Z0 + 238 + math.sin(a1) * 6)
        g.capsule(p0, p1, 1.8, segs=6, rings=1)
    rig.part("halo", g, glow="#E6D6FF", outline=0)

    # the nebula ribbons spiralling round the hull (torn away at 75% and 25%)
    nebula_ribbon(rig, "ribA", 150.0, 1.25, Z0 + 18, Z0 + 196, 7.0, 21.0, NEB, seed=1)
    nebula_ribbon(rig, "ribB", -30.0, 1.0, Z0 + 40, Z0 + 214, 9.0, 16.0, NEB_LT, seed=2)
    # nebula clouds where the cloak billows out from the hull's left side and round the prow (soft puffs
    # in violet and lilac with a dust of stars); one bank leaves with each ribbon
    for joint, banks, seed in (("ribA", ((SP[0] - 58, SP[1] - 8, 70, 1.0), (SP[0] - 52, SP[1] - 12, 150, 0.85)), 5),
                               ("ribB", ((SP[0] - 44, SP[1] - 14, 214, 0.8), (SP[0] + 30, SP[1] - 6, 236, 0.6)), 6)):
        rnd = random.Random(seed)
        gd, gl, st = Geo(), Geo(), Geo()
        for bx, by, bz, k in banks:
            for i in range(5):
                px, pz = bx + rnd.uniform(-12, 12) * k, bz + rnd.uniform(-16, 16) * k
                r = rnd.uniform(7.0, 11.0) * k
                (gd if i % 2 else gl).sphere((px, by + rnd.uniform(-3, 3), pz), r, cuts=3)
                if rnd.random() < 0.7:
                    st.star((px + rnd.uniform(-r, r) * 0.5, by - r - 1.0, pz + rnd.uniform(-r, r) * 0.5), rnd.uniform(1.4, 2.4), 0.6, 0.6,
                            points=4, rot=(90, 0, 0))
        rig.part(joint, gd, NEB, finish="dust", outline=0.6, outline_hex="#4A2A78")
        rig.part(joint, gl, NEB_LT, finish="dust", outline=0.6, outline_hex="#4A2A78")
        rig.part(joint, st, glow=STARS, outline=0)

    # swept fins with star specks (the back fin is lost at 75%), team tips
    g = Geo().slab([(SP[0] - 46, 22), (SP[0] - 84, 6), (SP[0] - 70, 60), (SP[0] - 50, 128)], SP[1] + 2, 6)
    rig.part("fin", g, HULL_LT, finish="gloss")
    g = Geo().slab([(SP[0] - 76, 6), (SP[0] - 86, 6), (SP[0] - 76, 34)], SP[1] + 2, 6.6)
    rig.part("fin", g, team=True, outline=0.6)
    g = Geo()
    for x, z in ((SP[0] - 60, 50), (SP[0] - 66, 30), (SP[0] - 56, 86)):
        g.star((x, SP[1] - 1.8, z), 1.8, 0.7, 0.6, points=4, rot=(90, 0, 0))
    rig.part("fin", g, glow=STARS, outline=0)
    g = Geo().slab([(SP[0] + 44, 28), (SP[0] + 68, 14), (SP[0] + 56, 74), (SP[0] + 45, 110)], SP[1] + 10, 6)
    rig.part("body", g, HULL_LT, finish="gloss")
    g = Geo().slab([(SP[0] + 62, 14), (SP[0] + 70, 14), (SP[0] + 63, 32)], SP[1] + 10, 6.6)
    rig.part("body", g, team=True, outline=0.6)

    # the ramp and the lit team doorway (the gate)
    g = Geo().slab([(-64, 0), (-64, 14), (-4, 1.6), (-4, 0)], -30, 24)
    rig.part("body", g, K.VIOLET_DK, finish="gloss")
    g = Geo()
    for yy in (-42.5, -17.5):
        g.capsule((-64, yy, 14.8), (-4, yy, 2.4), 0.9, segs=6, rings=2)
    rig.part("body", g, glow="#C9A6FF", outline=0)
    door = on_hull(-62, Z0 + 18, 0.0)
    g = Geo().blob((door[0] + 2, door[1] - 2, Z0 + 16), (15, 5, 17), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((door[0] + 3.2, door[1] - 4.4, Z0 + 15), (11, 4, 13.5), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, team=True)
    g = Geo().blob((door[0] + 4.2, door[1] - 6.8, Z0 + 13), (7, 3, 9.5), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, glow=CORE, outline=0)

    # hover discs at the mounts with violet glow rings and struts into the hull
    for i, (x, y, z) in enumerate(M):
        r = radius_at(z - 20)
        anchor = (SP[0] + r * 0.6, SP[1] - r * 0.55, z - 22)
        if i == 0:
            anchor = (x - 4, y + 12, 3)
        platform(rig, "strut" if i == 2 else "body", (x, y, z), HULL_LT, K.STAR_TRIM, style="disc", r=(24, 18), t=5, depth_to=anchor,
                 accent="#C08CFF")

    # damage (each stage reads at a glance)
    x, y, z = front(Z0 + 150, -7.0, push=1.0)
    g = Geo().slab(_jagged(x, z, 19.0, 18.0, seed=1), y, 2.2)
    rig.part("notch", g, HULL_LT, outline=0.6)
    g = Geo().slab(_jagged(x + 0.5, z - 0.5, 13.5, 13.0, seed=2), y - 1.4, 1.0)
    rig.part("notch", g, HOLE, outline=0, highlight=False)
    g = Geo()
    g.capsule((x - 2.0, y - 2.4, z + 3.0), (x + 4.0, y - 3.4, z - 6.0), 0.9)
    g.capsule((x + 2.0, y - 2.4, z + 1.0), (x - 3.0, y - 3.6, z - 8.0), 0.9)
    rig.part("notch", g, K.STAR_TRIM, finish="metal", outline=0.4)
    g = Geo().star((x + 5.4, y - 4.0, z - 9.0), 7.0, 2.4, 1.0, points=5)
    rig.part("sparks1", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)
    plasma(rig, "fire1", [(x, y - 3.0, z - 8.0, 1.5)])
    g = Geo()
    g.slab(_jagged(x + 2.0, z + 16.0, 8.0, 9.0, seed=3, amp=0.35), y + 0.4, 0.8)
    xx, yy, zz = front(Z0 + 66, 14.0, push=0.8)
    g.slab(_jagged(xx, zz + 8.0, 9.0, 7.0, seed=4, amp=0.3), yy, 0.8)
    rig.part("scorch", g, "#2C2440", outline=0, highlight=False)
    g = Geo()
    for a_deg in range(-160, -15, 16):
        g.blob(on_hull(a_deg, Z0 + 107, 5.0), (4.4, 4.4, 4.4), p=2.4, rot=(0, 0, a_deg + 90))
    for a_deg in range(-140, -30, 14):
        g.blob(on_hull(a_deg, Z0 + 177, 1.6), (3.2, 3.2, 2.8), p=3.0, rot=(0, 0, a_deg + 90))
    rig.part("darkwin", g, "#2A2140", outline=0, highlight=False)
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
    zt = Z0 + 204.0
    rt = radius_at(zt) + 0.5
    pts = []
    for k in range(9):
        a = math.radians(-160 + 140 * k / 8)
        pts.append((SP[0] + rt * math.cos(a), zt + (6.0 if k % 2 else -3.0)))
    g = Geo().slab([(SP[0] - rt, zt - 8.0)] + pts + [(SP[0] + rt, zt - 8.0)], SP[1] - rt * 0.8 + 3.0, 3.0)
    rig.part("stump", g, ARMOR_LT, outline=0.6)
    plasma(rig, "stump", [(SP[0] + 2.0, SP[1] - rt * 0.8 - 1.0, zt - 2.0, 1.5)])
    g = Geo().lathe([(0, 0), (22, 0), (17, 24), (8, 50), (0, 66)], (-18.0, -60.0, 12.0), (-80.0, -64.0, 20.0), segs=20)
    rig.part("tipfallen", g, ARMOR_LT, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().sphere((-82.0, -64.0, 20.5), 5.0, cuts=3)
    rig.part("tipfallen", g, "#6B6A80", finish="gloss", outline=0.6)

    chipped_cracks(rig, "crack1", [[on_hull(-100, 154, 2), on_hull(-94, 144, 2), on_hull(-100, 132, 2)],
                                   [on_hull(-70, 204, 2), on_hull(-64, 196, 2)]], CRACK, ARMOR_LT, w=1.8)
    chipped_cracks(rig, "crack2", [[on_hull(-116, 80, 2), on_hull(-110, 70, 2), on_hull(-116, 58, 2)],
                                   [on_hull(-60, 124, 2), on_hull(-54, 114, 2)]], CRACK, ARMOR_LT, w=1.8)
    chipped_cracks(rig, "crack3", [[on_hull(-90, 214, 2), on_hull(-84, 206, 2), on_hull(-90, 196, 2)],
                                   [on_hull(-130, 112, 2), on_hull(-124, 102, 2)]], CRACK, ARMOR_LT, w=1.8)
    rubble(rig, "rubble1", [(-162, -40), (-138, -50)], HULL_LT, seed=3)
    rubble(rig, "rubble2", [(-98, -58), (-70, -60)], ARMOR, seed=13)
    rubble(rig, "rubble3", [(-150, -60), (-120, -62), (16, -56)], HULL_LT, seed=23, size=1.2)
    for j, pts2 in (("rubble2", [(-84, -62)]), ("rubble3", [(-132, -66), (4, -60)])):
        g = Geo()
        for x2, y2 in pts2:
            g.star((x2, y2 - 6, 4), 2.6, 1.0, 1.0, points=4, rot=(90, 0, 0))
        rig.part(j, g, glow=NEB_EDGE, outline=0)

    flag(rig, "root", "flagA", (SP[0] - 26, SP[1] + 6, Z0 + 268), length=30, height=16, pole=Z0 + 196, pole_color=K.STAR_TRIM,
         finial="#C9A6FF")
    flag(rig, "root", "flagB", (-156, 34, 140), length=24, height=14, pole=14, pole_color=K.STAR_TRIM, finial="#C9A6FF")

    # Treasury: the star forge
    g = Geo()
    for k, x in enumerate((-162, -152, -142)):
        cyl(g, (x, -58, 0), (x, -58, 18 - k * 2), 4.2, bevel=0.8)
    rig.part("treasury1", g, HULL_LT, finish="gloss")
    g = Geo()
    for k, x in enumerate((-162, -152, -142)):
        cyl(g, (x, -62.4, 4), (x, -62.4, 14 - k * 2), 1.4, bevel=0.3)
    rig.part("treasury1", g, glow="#C9A6FF", outline=0)
    g = Geo()
    box(g, (-128, -62, 5), (9, 7, 5), p=5, taper=(1.0, 0.8))
    box(g, (-128, -62, 12), (12, 6, 2.6), p=5)
    rig.part("treasury2", g, K.STAR_TRIM, finish="metal")
    g = Geo().lathe([(0, 0), (3.4, 3), (3.0, 10), (0, 15)], (-128, -62, 14), (-127, -62, 29), segs=6)
    rig.part("treasury2", g, glow=K.VIOLET_GLOW, outline=0.8, outline_hex=K.VIOLET)
    g = Geo()
    for i in range(24):
        a0, a1 = 2 * math.pi * i / 24, 2 * math.pi * (i + 1) / 24
        g.capsule((-102 + 11 * math.cos(a0), -64, 14 + 11 * math.sin(a0)), (-102 + 11 * math.cos(a1), -64, 14 + 11 * math.sin(a1)), 1.8,
                  segs=8, rings=2)
    g.capsule((-110, -64, 0), (-106, -64, 6), 2.0).capsule((-94, -64, 0), (-98, -64, 6), 2.0)
    rig.part("treasury3", g, ARMOR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().sphere((-102, -65, 14), 6.4, cuts=4)
    rig.part("treasury3", g, glow="#B98BE4", outline=0.8, outline_hex="#6E3AA8")
    g = Geo()
    g.star((-104, -71, 16), 2.4, 0.9, 0.8, points=4, rot=(90, 0, 0))
    g.star((-99, -71, 11), 1.8, 0.7, 0.8, points=4, rot=(90, 0, 0))
    rig.part("treasury3", g, glow=STARS, outline=0)


def crumble(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "fin": {"hide": True}, "rubble1": {"show": True}, "notch": {"show": True},
                     "sparks1": {"show": True}, "ribA": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "claw": {"hide": True}, "clawbroken": {"show": True},
                     "fire1": {"show": True}, "scorch": {"show": True}, "darkwin": {"show": True}, "sparks1": {"hide": True},
                     "tip": {"r": 12.0, "x": -4.0, "z": -6.0}, "halo": {"r": 10.0, "x": -4.0, "z": -8.0}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "tip": {"hide": True}, "halo": {"hide": True},
                     "breach": {"show": True}, "cable": {"show": True}, "fire2": {"show": True}, "stump": {"show": True},
                     "tipfallen": {"show": True}, "ribB": {"hide": True}})
    return pose


NEBULA_ARK = base_module(
    "cosmic", "Nebula Ark", height=330, width=180, canvas=(470, 740), feet=(360, 690),
    build=build, crumble=crumble, mount_depth=DEPTHS, skin="nebula_ark",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-40, -46, 30), 3, 30), ((SP[0], SP[1] - 44, Z0 + 107), 1, 34), ((SP[0], SP[1] - 26, 204), 1, 20),
            ((SP[0], SP[1] - 20, Z0 + 281), 2, 22), ((SP[0], SP[1] - 30, 4), 3, 34)],
    smoke=[((SP[0], SP[1], 236), 2), ((SP[0] - 20, -10, 90), 3), ((-40, -20, 30), 3)],
    horn=(-110, 350), yaw=BASE_YAW,
    extra_meta={
        "collapseMaterial": "energy",
        # the upper hull with the prow falls toward the lane, the lower hull a beat later
        "topple": [topple_lu(-135, -45, 170, delay_ms=0, push=1.0, sink_lu=28),
                   topple_lu(-145, -35, 90, delay_ms=170, push=0.75, sink_lu=20)],
        "rubbleColors": [HULL_LT, ARMOR, NEB, HULL],
        "dustColor": "#B4A6D2",
        "aura": "legendary",
        "ambientLu": [ambient_lu("stars", (SP[0], SP[1] - 30, 260), 50, 1.4), ambient_lu("stars", (SP[0], SP[1] - 40, 140), 50, 1.0),
                      ambient_lu("glints", (SP[0], SP[1] - 44, Z0 + 107), 30, 0.8, color="#E6DAFF"), ambient_lu("stars", (SP[0], SP[1] - 20, 40), 40, 0.6)],
    },
)

SKINS = [NEBULA_ARK]
