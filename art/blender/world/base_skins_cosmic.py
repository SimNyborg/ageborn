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

from world.base_skins_kit import crystal_prism, flames
from world.common import (BASE_YAW, ambient_lu, base_module, box, chipped_cracks, cyl, flag, platform, prop_loop, rock, rubble,
                          topple_lu)

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


# The swirling nebula (round 3, PLAN 2c "a swirling nebula loop"): glowing knots of nebula flow up both
# ribbons, round the hull from the cradle to the prow, swelling in where a ribbon starts and thinning out where
# it ends. Each ribbon's knots are identical and evenly spaced along it; the loop moves them one spacing
# (NEB_FRAMES steps), so its last frame flows into the first. Drawn over the hull and cut away where the hull
# stands in front (the back half of each turn), a touch translucent.
NEB_FRAMES = 12
NEB_MS = 130
# the ribbons as nebula_ribbon draws them: (joint, start angle, turns, z0, z1, out, width), and the knots'
# spacing along each (degrees of its turn)
NEB_RIBBONS = [("ribA", 150.0, 1.25, Z0 + 18, Z0 + 196, 7.0, 21.0), ("ribB", -30.0, 1.0, Z0 + 40, Z0 + 214, 9.0, 16.0)]
KNOT_DEG = 80.0
KNOT_T0, KNOT_T1, KNOT_FADE = 0.03, 0.97, 0.12


def knot_step(ring):
    """The knots' spacing along ribbon `ring` in its helix parameter t (0 at the cradle, 1 at the prow)."""
    return KNOT_DEG / (360.0 * NEB_RIBBONS[ring][2])


def knot_count(ring):
    return int(math.ceil((KNOT_T1 - KNOT_T0) / knot_step(ring))) + 1


def knot_at(ring, t):
    """A knot's centre on ribbon `ring` at parameter t (just outside the ribbon's face) and the helix angle there."""
    _, a0, turns, z0, z1, out, w = NEB_RIBBONS[ring]
    a = a0 + 360.0 * turns * t
    z = z0 + (z1 - z0) * t
    return on_hull(a, z, out + 2.0 * math.sin(t * math.pi) + 2.6), a


def knot_size(t):
    """1 along the ribbon, easing to 0 over its first and last KNOT_FADE (a knot swells in and thins out)."""
    def ease(u):
        u = max(0.0, min(1.0, u))
        return u * u * (3 - 2 * u)
    return ease((t - KNOT_T0) / KNOT_FADE) * ease((KNOT_T1 - t) / KNOT_FADE)


def _placed(g, c, a_deg):
    """Geometry built at the origin for helix angle 0, turned about the vertical by a and set at c (the loop's
    pose turns and moves its joint the same way, so the loop closes without a jump)."""
    m = Matrix.Translation(Vector(c)) @ Matrix.Rotation(math.radians(a_deg), 4, "Z")
    for v in g.bm.verts:
        v.co = m @ v.co
    return g


def knot_geo(rig, joint, c, a_deg, ring):
    """One streak of nebula light, built at helix angle 0 (outward +x, the ribbon running along +y and
    climbing): a bright head and a tail that tapers and cools back along the ribbon's curve (unshaded light, no
    lines), two star specks riding it."""
    _, a0, turns, z0, z1, out, w = NEB_RIBBONS[ring]
    r = radius_at((z0 + z1) / 2) + out + 2.6
    h = (z1 - z0) / (turns * 2 * math.pi)
    climb = math.degrees(math.atan2(h, r))
    k = w / 21.0
    L = math.hypot(r, h)

    def at(s):
        """The local point s lu behind the head along the helix, and the yaw of the helix there (deg)."""
        th = -s / L
        return (r * math.cos(th) - r, r * math.sin(th), h * th), math.degrees(th)

    head, mid, tail, st = Geo(), Geo(), Geo(), Geo()
    head.blob((0.0, 0.0, 0.0), (1.8, 7.0, 5.6 * k), p=2.2, rot=(climb, 0, 0))
    for i in range(5):
        u = (i + 1) / 5.0
        pt, yaw = at(7.0 * (i + 1))
        (mid if i < 2 else tail).blob(pt, (1.5, 6.8, (5.2 - 3.4 * u) * k), p=2.2, rot=(climb, 0, yaw))
    p1, _ = at(-3.0)
    st.sphere((p1[0] + 0.8, p1[1], p1[2] + 1.6 * k), 1.0, cuts=2)
    p2, _ = at(14.0)
    st.sphere((p2[0] + 0.8, p2[1], p2[2] - 1.2 * k), 0.9, cuts=2)
    for geo in (head, mid, tail, st):
        _placed(geo, c, a_deg)
    rig.part(joint, tail, glow="#C29BF0", outline=0)
    rig.part(joint, mid, glow="#E2CCFF", outline=0)
    rig.part(joint, head, glow="#FBF7FF", outline=0)
    rig.part(joint, st, glow=STARS, outline=0)


def knot_pose(ring):
    """The pose function of ribbon `ring`'s knots: frame f moves each one f / NEB_FRAMES of a spacing on."""
    step = knot_step(ring)

    def pose(f):
        out = {}
        d = step * f / NEB_FRAMES
        for i in range(knot_count(ring)):
            t0 = KNOT_T0 - step + i * step
            (p0, a0), (p1, a1) = knot_at(ring, t0), knot_at(ring, t0 + d)
            s = knot_size(t0 + d)
            out[f"knot{ring}_{i}"] = {"x": p1[0] - p0[0], "y": p1[1] - p0[1], "z": p1[2] - p0[2], "rz": a1 - a0, "s": max(0.0, s)}
        return out
    return pose


def knot_joints(ring):
    return [f"knot{ring}_{i}" for i in range(knot_count(ring))]


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

    # the swirling nebula: knots flowing up the ribbons (`prop` loops, round 3), one joint each under root
    for ring in range(len(NEB_RIBBONS)):
        for i in range(knot_count(ring)):
            c, a = knot_at(ring, KNOT_T0 - knot_step(ring) + i * knot_step(ring))
            rig.joint(f"knot{ring}_{i}", "root", c)
            knot_geo(rig, f"knot{ring}_{i}", c, a, ring)

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
    # the nebula flows up its two ribbons (round 3): over the body, cut away behind the hull, a touch
    # translucent; each ribbon's knots go with it (the first ribbon is torn away at 75%, the second at 25%)
    props=[prop_loop("nebulaA", knot_joints(0), NEB_FRAMES, knot_pose(0), ms=NEB_MS, crumble=(0, 0), z="front", hold=0,
                     anchor=(SP[0], SP[1], Z0 + 100), occlude=["body"], alpha=0.94, outline="none"),
           prop_loop("nebulaB", knot_joints(1), NEB_FRAMES, knot_pose(1), ms=NEB_MS, crumble=(0, 2), z="front", hold=0,
                     anchor=(SP[0], SP[1], Z0 + 130), occlude=["body"], alpha=0.94, outline="none")],
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



# ---------------------------------------------------------------------------------------------------
# Asteroid Citadel (round 3; Rare, Time Capsule): a fortress carved into a floating asteroid, held over its landing
# pad by a light beam. The asteroid is grey-violet rock in faceted crags, wider at its top plateau and tapering to
# a point where the beam meets it; the fortress is cut into its face (a star-white facade with a band of lit team
# windows and mint crystal lamps), two towers rise from the plateau (broad team bands, crystal lamps, the taller one
# carrying the top mount), battlements along the edge, two long team banners hang down the rock. Small rocks orbit
# the asteroid (the `rocks` prop loop: six alike, evenly spaced, twelve steps covering one spacing (an exact loop), cut
# where the asteroid stands in front). On the ground the star-white pad with its mint ring and the gatehouse with
# a team door; the mounts are the age's hovering discs on struts. Team colour: the tower bands and fins, the window
# band and the panel under it, the banners, the gatehouse's band and door, the pad's rim and the flags (the Star Ark's
# broad team share).
#
# Crumble: 75% cracks, a crystal lamp knocked off, rock rubble; 50% a violet plasma breach in the facade, a banner
# torn, the beam flickering thin (half width), soot; 25% the smaller tower snapped, the asteroid split with a
# glowing crack, a second fire, the second banner torn and hanging.

AS_ROCK = "#6A6470"
AS_ROCK_LT = "#7C7683"
AS_ROCK_DK = "#56505C"
AS_ROCK_DKR = "#46414C"
AS_WHITE = "#D2CCE6"
AS_WHITE_LT = "#E2DEF0"
AS_WHITE_DK = "#ABA3C6"
AS_MINT = "#3FE0B0"
AS_MINT_CORE = "#D9FFF2"
AS_BEAM = "#BDF7E6"
AS_SEAM = "#1E1630"
AS_HOLE = "#120C1E"
AS_DEPTHS = [-40, -24, -40, -24]
AS_C = (-84.0, 20.0)                 # the asteroid's axis
AS_TOP = 214.0                        # the plateau
AS_TIP = 74.0                         # the point under it where the beam meets it
AS_PAD = (-80.0, 6.0)
AS_ORB_C = (-86.0, 18.0, 150.0)       # the orbit's centre
AS_ORB_R = 92.0
AS_ORB_N, AS_ORB_STEP = 6, 60.0
AS_ORB_FRAMES, AS_ORB_MS = 12, 140


def as_orbit_at(a_deg):
    cx, cy, cz = AS_ORB_C
    a = math.radians(a_deg)
    return (cx + AS_ORB_R * math.cos(a), cy + AS_ORB_R * 0.42 * math.sin(a), cz + 14.0 * math.sin(a + 0.6))


def as_crag(c, r, seed, top=None, bottom=None, facets=3):
    """A faceted rock lump (its own geometry so the cuts touch only it)."""
    rnd = random.Random(seed)
    g = Geo()
    rock(g, c, r, seed=seed, jag=0.1, p=2.8, cuts=4)
    cx, cy, cz = c
    rx, ry, rz = r
    for k in range(facets):
        ang = math.radians(rnd.uniform(-70.0, 70.0))
        tilt = rnd.uniform(-0.4, 0.4)
        n = (math.sin(ang), -math.cos(ang), tilt)
        ln = math.sqrt(sum(v * v for v in n))
        n = tuple(v / ln for v in n)
        reach = math.sqrt((n[0] * rx) ** 2 + (n[1] * ry) ** 2 + (n[2] * rz) ** 2)
        d = reach * rnd.uniform(0.78, 0.9)
        g.clip((cx + n[0] * d, cy + n[1] * d, cz + n[2] * d), n)
    if top is not None:
        g.clip((0, 0, top), (0, 0, 1))
    if bottom is not None:
        g.clip((0, 0, bottom), (0, 0, -1))
    g.bm.verts.ensure_lookup_table()
    return g


def as_rock_geo(c, a_deg, k=1.0, seed=0):
    """One orbiting rock: a small faceted lump with a mint crystal shard in it, all six alike, each built at the origin
    and turned by its orbit angle before it is placed (so a rock moved one spacing on, turning with the orbit, is
    exactly its neighbour: the loop closes)."""
    g = as_crag((0.0, 0.0, 0.0), (6.0 * k, 5.0 * k, 4.6 * k), 900 + seed, facets=3)
    cr = Geo()
    crystal_prism(cr, (1.0 * k, -2.0 * k, 1.0 * k), (3.0 * k, -5.0 * k, 6.0 * k), 1.4 * k, facets=5)
    from mathutils import Matrix as _M
    m = _M.Translation(c) @ _M.Rotation(math.radians(a_deg), 4, "Z")
    for geo in (g, cr):
        for v in geo.bm.verts:
            v.co = m @ v.co
    return g, cr


def as_rocks_pose(f):
    """The rocks advance a sixth of their spacing each step (rigid moves of the same rocks: an exact loop)."""
    d = AS_ORB_STEP * f / AS_ORB_FRAMES
    pose = {}
    for i in range(AS_ORB_N):
        a0 = i * AS_ORB_STEP
        p0, p1 = as_orbit_at(a0), as_orbit_at(a0 + d)
        pose[f"orb{i}"] = {"x": p1[0] - p0[0], "y": p1[1] - p0[1], "z": p1[2] - p0[2], "rz": d}
    return pose


def build_asteroid(rig, M):
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "breachF", "soot", "fire3", "split", "towerStump", "beamThin"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    rig.joint("lamp2", "body", (-30.0, -40.0, AS_TOP))
    rig.joint("bannerA", "body", (-138.0, -46.0, AS_TOP - 6.0))
    rig.joint("bannerB", "body", (-104.0, -48.0, AS_TOP - 6.0))
    rig.joint("towerB", "body", (-118.0, 26.0, AS_TOP))
    rig.joint("beam", "body", (AS_PAD[0], AS_PAD[1], 10.0))
    cx, cy = AS_C

    # -- the landing pad: a star-white disc with a mint ring and the beam emitter -----------------------------
    g = Geo()
    cyl(g, (AS_PAD[0], AS_PAD[1], 0.0), (AS_PAD[0], AS_PAD[1], 8.0), 72.0, 70.0, bevel=1.2, segs=48, squash=(1.0, 0.62))
    rig.part("body", g, AS_WHITE)
    g = Geo()
    g.lathe([(68.0, 0.0), (71.0, 0.4), (71.0, 2.0), (68.0, 2.4)], (AS_PAD[0], AS_PAD[1], 3.0), (AS_PAD[0], AS_PAD[1], 5.4), segs=48, squash=(1.0, 0.62))
    rig.part("body", g, glow=AS_MINT, outline=0)
    g = Geo()
    g.lathe([(71.6, 0.0), (72.6, 0.3), (72.6, 2.6), (71.6, 2.9)], (AS_PAD[0], AS_PAD[1], 0.2), (AS_PAD[0], AS_PAD[1], 3.1), segs=48, squash=(1.0, 0.62))
    rig.part("body", g, team=True, outline=0.3)
    g = Geo()
    cyl(g, (AS_PAD[0], AS_PAD[1], 8.0), (AS_PAD[0], AS_PAD[1], 13.0), 14.0, 11.0, bevel=0.8, segs=24)
    rig.part("body", g, AS_WHITE_DK, finish="metal")
    g = Geo()
    for k in range(4):
        a = math.radians(45 + k * 90)
        box(g, (AS_PAD[0] + math.cos(a) * 52.0, AS_PAD[1] + math.sin(a) * 30.0, 8.6), (7.0, 3.0, 0.8), p=5, cuts=2, rot=(0, 0, math.degrees(a)))
    rig.part("body", g, team=True, outline=0.3)
    # the light beam from the emitter to the asteroid's point (thinner while it flickers at 50%)
    g = Geo()
    cyl(g, (AS_PAD[0], AS_PAD[1], 12.0), (AS_PAD[0] - 4.0, AS_PAD[1] + 4.0, AS_TIP + 8.0), 7.0, 5.0, bevel=0.5, segs=20)
    rig.part("beam", g, glow=AS_BEAM, outline=0)
    g = Geo()
    cyl(g, (AS_PAD[0], AS_PAD[1], 12.0), (AS_PAD[0] - 4.0, AS_PAD[1] + 4.0, AS_TIP + 8.0), 3.0, 2.2, bevel=0.3, segs=16)
    rig.part("beam", g, glow="#FFFFFF", outline=0)
    g = Geo()
    for z in (26.0, 44.0, 62.0):
        t = (z - 12.0) / (AS_TIP - 4.0)
        g.lathe([(9.0 - 2.0 * t, -0.6), (10.0 - 2.0 * t, 0.0), (9.0 - 2.0 * t, 0.6)], (AS_PAD[0] - 4.0 * t, AS_PAD[1] + 4.0 * t, z),
                (AS_PAD[0] - 4.0 * t, AS_PAD[1] + 4.0 * t, z + 1.0), segs=24)
    rig.part("beam", g, glow=AS_MINT, outline=0)
    g = Geo()
    cyl(g, (AS_PAD[0], AS_PAD[1], 12.0), (AS_PAD[0] - 4.0, AS_PAD[1] + 4.0, AS_TIP + 8.0), 3.0, 2.2, bevel=0.3, segs=16)
    rig.part("beamThin", g, glow=AS_BEAM, outline=0)

    # -- the asteroid: faceted crags, wide at the plateau, tapering to its point --------------------------------
    from mathutils import Matrix
    lumps = [((cx - 50.0, cy + 6.0, 184.0), (34.0, 40.0, 32.0), 801), ((cx - 4.0, cy + 2.0, 190.0), (40.0, 44.0, 30.0), 802),
             ((cx + 44.0, cy + 8.0, 182.0), (28.0, 36.0, 32.0), 803), ((cx - 30.0, cy + 4.0, 138.0), (34.0, 38.0, 30.0), 804),
             ((cx + 22.0, cy + 6.0, 140.0), (32.0, 36.0, 28.0), 805), ((cx - 8.0, cy + 6.0, 102.0), (28.0, 30.0, 26.0), 806),
             ((cx - 2.0, cy + 6.0, 84.0), (14.0, 16.0, 14.0), 807)]
    layer = [Geo(), Geo(), Geo()]
    for i, (c, r, seed) in enumerate(lumps):
        crag = as_crag(c, r, seed, top=AS_TOP if c[2] > 160 else None, bottom=AS_TIP)
        layer[i % 3]._add_bm(crag.bm, Matrix.Identity(4))
    for g, tone in zip(layer, (AS_ROCK, AS_ROCK_DK, AS_ROCK_LT)):
        rig.part("body", g, tone)
    g = Geo()
    box(g, (cx, cy + 6.0, AS_TOP - 1.0), (78.0, 40.0, 1.6), p=8)
    rig.part("body", g, AS_ROCK_DKR)
    # mint crystal veins and clusters in the rock
    cr = Geo()
    for base, tip, r in (((cx - 58.0, cy - 28.0, 150.0), (cx - 66.0, cy - 40.0, 162.0), 2.6), ((cx + 40.0, cy - 26.0, 120.0), (cx + 50.0, cy - 34.0, 128.0), 2.2),
                         ((cx - 10.0, cy - 18.0, 92.0), (cx - 14.0, cy - 28.0, 84.0), 2.0), ((cx + 8.0, cy - 16.0, 96.0), (cx + 14.0, cy - 26.0, 90.0), 1.8)):
        crystal_prism(cr, base, tip, r, facets=6)
    rig.part("body", cr, glow=AS_MINT, outline=0.5, outline_hex="#1F8F70")

    # -- the fortress cut into the face: a star-white facade, the team window band, crystal lamps ---------------
    fy = cy - 38.0
    g = Geo()
    box(g, (cx - 6.0, fy + 4.0, 168.0), (54.0, 6.0, 30.0), p=6)
    rig.part("body", g, AS_WHITE)
    g = Geo()
    box(g, (cx - 6.0, fy - 1.8, 176.0), (50.0, 0.8, 7.0), p=5, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    for k in range(7):
        x = cx - 50.0 + k * 14.6
        box(g, (x, fy - 2.6, 176.0), (1.0, 0.5, 7.4), p=4, cuts=1)
    rig.part("body", g, AS_WHITE_LT, outline=0.3)
    g = Geo()
    box(g, (cx - 6.0, fy - 0.9, 151.5), (50.0, 0.7, 9.5), p=5, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    for x in (cx - 42.0, cx - 6.0, cx + 30.0):
        box(g, (x, fy - 1.9, 152.0), (6.6, 0.8, 7.4), p=5, cuts=2)
    rig.part("body", g, AS_WHITE_LT, outline=0.4)
    g = Geo()
    for x in (cx - 42.0, cx - 6.0, cx + 30.0):
        box(g, (x, fy - 2.5, 152.0), (5.4, 0.6, 6.2), p=5, cuts=2)
    rig.part("body", g, glow="#FFF1D6", outline=0)
    g = Geo()
    box(g, (cx - 6.0, fy - 1.2, 140.0), (56.0, 1.6, 2.0), p=5, cuts=2)
    box(g, (cx - 6.0, fy - 1.2, 199.0), (56.0, 1.6, 2.0), p=5, cuts=2)
    rig.part("body", g, AS_WHITE_DK, finish="metal", outline=0.4)
    # battlements along the plateau's front edge
    g = Geo()
    for k in range(9):
        x = cx - 72.0 + k * 18.0
        box(g, (x, cy - 36.0, AS_TOP + 5.0), (6.0, 3.0, 5.0), p=6)
    box(g, (cx, cy - 34.0, AS_TOP + 1.0), (78.0, 4.0, 1.6), p=6)
    rig.part("body", g, AS_WHITE)
    # crystal lamps on posts along the battlements (one knocked off at 75%)
    for i, x in enumerate((cx - 70.0, cx + 54.0)):
        j = "lamp2" if i == 1 else "body"
        g = Geo()
        cyl(g, (x, cy - 36.0, AS_TOP + 10.0), (x, cy - 36.0, AS_TOP + 18.0), 1.4, 1.2, bevel=0.3)
        rig.part(j, g, AS_WHITE_DK, finish="metal", outline=0.4)
        g = Geo()
        crystal_prism(g, (x, cy - 36.0, AS_TOP + 17.0), (x, cy - 36.0, AS_TOP + 29.0), 2.6, facets=6)
        rig.part(j, g, glow=AS_MINT, outline=0.5, outline_hex="#1F8F70")
    # long team banners down the rock under the plateau (one torn at 50%, gone at 25%)
    for jn, x, y in (("bannerA", -138.0, -46.0), ("bannerB", -104.0, -48.0)):
        g = Geo().slab([(x - 10.0, AS_TOP - 6.0), (x + 10.0, AS_TOP - 6.0), (x + 10.0, AS_TOP - 66.0), (x, AS_TOP - 76.0), (x - 10.0, AS_TOP - 66.0)], y, 1.4)
        rig.part(jn, g, team=True, outline=0.5)
        g = Geo().capsule((x - 12.0, y - 0.8, AS_TOP - 5.4), (x + 12.0, y - 0.8, AS_TOP - 5.4), 1.1)
        rig.part(jn, g, AS_WHITE_DK, finish="metal", outline=0.4)
        # a four-point star (a sparkle, not a cross) in a thin ring
        g = Geo().slab([(x + (8.0 if k % 2 == 0 else 2.2) * math.cos(math.radians(90 + k * 45)),
                         AS_TOP - 30.0 + (8.0 if k % 2 == 0 else 2.2) * math.sin(math.radians(90 + k * 45))) for k in range(8)], y - 1.2, 0.8)
        for k in range(16):
            a0, a1 = math.radians(k * 22.5), math.radians((k + 1) * 22.5)
            g.capsule((x + 5.4 * math.cos(a0), y - 1.0, AS_TOP - 30.0 + 5.4 * math.sin(a0)),
                      (x + 5.4 * math.cos(a1), y - 1.0, AS_TOP - 30.0 + 5.4 * math.sin(a1)), 0.45, segs=4, rings=1)
        rig.part(jn, g, AS_WHITE_LT, outline=0.3)

    # -- the two towers on the plateau: broad team bands, team fins, crystal crowns -----------------------------
    for jn, (tx, ty, h, r) in (("body", (-52.0, -10.0, 258.8, 15.0)), ("towerB", (-118.0, 26.0, 292.0, 14.0))):
        g = Geo()
        cyl(g, (tx, ty, AS_TOP), (tx, ty, h), r, r - 2.0, bevel=0.6, segs=28)
        rig.part(jn, g, AS_WHITE)
        g = Geo()
        for z0 in (AS_TOP + 8.0, AS_TOP + 26.0, AS_TOP + 44.0)[: 2 if jn == "body" else 3]:
            rr = r - 2.0 * (z0 - AS_TOP) / (h - AS_TOP) + 0.4
            g.lathe([(rr - 0.4, 0.0), (rr + 0.3, 0.4), (rr + 0.3, 9.2), (rr - 0.4, 9.6)], (tx, ty, z0), (tx, ty, z0 + 9.6), segs=28)
        rig.part(jn, g, team=True, outline=0.3)
        if jn == "towerB":
            g = Geo()
            for sgn in (-1, 1):
                g.slab([(tx + sgn * (r - 2.0), h - 26.0), (tx + sgn * (r + 12.0), h - 34.0), (tx + sgn * (r + 10.0), h - 12.0), (tx + sgn * (r - 2.0), h - 4.0)],
                       ty, 1.6)
            rig.part(jn, g, team=True, outline=0.45)
            g = Geo()
            cyl(g, (tx, ty, h), (tx, ty, h + 3.0), r + 1.0, bevel=0.5, segs=28)
            rig.part(jn, g, AS_WHITE_DK, finish="metal", outline=0.4)
            g = Geo()
            crystal_prism(g, (tx, ty, h + 2.0), (tx, ty, h + 24.0), 5.0, facets=6)
            rig.part(jn, g, glow=AS_MINT, outline=0.6, outline_hex="#1F8F70")
        g = Geo()
        for z in (AS_TOP + 22.0, AS_TOP + 40.0):
            box(g, (tx, ty - r - 0.4, z), (2.4, 0.6, 3.4), p=5, cuts=2)
        rig.part(jn, g, glow="#FFF1D6", outline=0)
    g = Geo()
    cyl(g, (-118.0, 26.0, AS_TOP), (-118.0, 26.0, AS_TOP + 30.0), 14.0, 13.0, bevel=0.6, segs=28)
    rig.part("towerStump", g, AS_WHITE)
    g = Geo().slab([(-132.0, AS_TOP + 29.0), (-126.0, AS_TOP + 36.0), (-118.0, AS_TOP + 31.0), (-110.0, AS_TOP + 38.0), (-104.0, AS_TOP + 29.0)], 12.0, 1.4)
    rig.part("towerStump", g, AS_WHITE_DK, outline=0.5)
    g = Geo().lathe([(14.0, 0.0), (14.7, 0.4), (14.7, 9.2), (13.8, 9.6)], (-118.0, 26.0, AS_TOP + 8.0), (-118.0, 26.0, AS_TOP + 17.6), segs=28)
    rig.part("towerStump", g, team=True, outline=0.3)      # the stump keeps its lowest team band

    # -- the gatehouse on the pad: star-white with a team door and mint edge lights -------------------------------
    g = Geo()
    box(g, (-4.0, -28.0, 28.0), (20.0, 14.0, 20.0), p=6)
    rig.part("body", g, AS_WHITE)
    g = Geo()
    box(g, (-4.0, -28.2, 42.6), (20.6, 14.4, 4.4), p=6, cuts=2)
    rig.part("body", g, team=True, outline=0.4)
    g = Geo()
    box(g, (-4.0, -28.4, 49.6), (21.0, 14.6, 2.2), p=6)
    rig.part("body", g, AS_WHITE_LT)
    g = Geo().slab([(-13.0, 8.0), (5.0, 8.0), (5.0, 38.0), (-4.0, 43.0), (-13.0, 38.0)], -42.4, 1.2)
    rig.part("body", g, team=True, outline=0.45)
    g = Geo()
    for x in (-15.0, 7.0):
        box(g, (x, -42.6, 24.0), (0.8, 0.6, 16.0), p=4, cuts=1)
    rig.part("body", g, glow=AS_MINT, outline=0)

    # -- the hovering disc mounts with struts into the asteroid -----------------------------------------------
    for i, (x, y, z) in enumerate(M):
        if i == 0:
            anchor = (x - 4.0, y + 12.0, 46.0)
        elif i == 3:
            anchor = (-52.0, -10.0, 250.0)
        else:
            anchor = (cx + 40.0, cy - 20.0, z - 24.0)
        platform(rig, "body", (x, y, z), AS_WHITE_LT, AS_WHITE_DK, style="disc", r=(24, 18), t=5, depth_to=anchor, accent=AS_MINT)

    # the orbiting rocks (the `rocks` prop: joints under root, all six alike)
    for i in range(AS_ORB_N):
        c = as_orbit_at(i * AS_ORB_STEP)
        rig.joint(f"orb{i}", "root", c)
        g, crs = as_rock_geo(c, i * AS_ORB_STEP)
        rig.part(f"orb{i}", g, AS_ROCK_LT)
        rig.part(f"orb{i}", crs, glow=AS_MINT, outline=0.4, outline_hex="#1F8F70")

    # -- damage ---------------------------------------------------------------------------------------
    chipped_cracks(rig, "crack1", [[(cx - 30.0, fy - 1.2, 194.0), (cx - 26.0, fy - 1.2, 184.0), (cx - 30.0, fy - 1.2, 172.0)],
                                   [(-8.0, -42.4, 40.0), (-4.0, -42.4, 30.0)]], AS_SEAM, AS_WHITE_LT, w=1.6)
    chipped_cracks(rig, "crack2", [[(cx + 20.0, fy - 1.2, 194.0), (cx + 24.0, fy - 1.2, 182.0)], [(-52.0, -25.4, 246.0), (-48.0, -25.4, 236.0)]],
                   AS_SEAM, AS_WHITE_LT, w=1.6)
    chipped_cracks(rig, "crack3", [[(cx - 46.0, fy - 1.2, 160.0), (cx - 42.0, fy - 1.2, 148.0)]], AS_SEAM, AS_WHITE_LT, w=1.6)
    as_breach(rig, "breachF", cx + 12.0, fy, 164.0, 22.0, 20.0, seed=61)
    flames(rig, "breachF", [(cx + 12.0, fy - 6.0, 156.0, 0.8)], out="#C77BF0", body="#E7B8FF", core="#FFF2FF")
    flames(rig, "fire3", [(cx - 40.0, fy - 4.0, 210.0, 0.8)], out="#C77BF0", body="#E7B8FF", core="#FFF2FF")
    g = Geo()
    pts = [(cx - 18.0, AS_TOP - 4.0), (cx - 10.0, 186.0), (cx - 20.0, 160.0), (cx - 8.0, 130.0), (cx - 14.0, 104.0)]
    for (x0_, z0_), (x1_, z1_) in zip(pts, pts[1:]):
        g.capsule((x0_, cy - 40.0, z0_), (x1_, cy - 40.0, z1_), 1.6, 1.2, segs=6, rings=1)
    rig.part("split", g, glow="#E7B8FF", outline=0.6, outline_hex="#5A2E8A")
    g = Geo()
    g.slab([(cx + 12.0 + 9.0 * math.cos(k * 0.9) * (1.0 if k % 2 else 0.7), 186.0 + 7.0 * math.sin(k * 0.9) * (1.0 if k % 2 else 0.7)) for k in range(7)],
           fy - 1.4, 0.6)
    rig.part("soot", g, "#2A2236", outline=0, highlight=False)
    rubble(rig, "rubble1", [(-150.0, -56.0), (-124.0, -60.0)], AS_ROCK, seed=151)
    rubble(rig, "rubble2", [(-70.0, -60.0), (-30.0, -62.0)], AS_ROCK_DK, seed=157)
    rubble(rig, "rubble3", [(-160.0, -62.0), (-108.0, -66.0), (-10.0, -62.0)], AS_ROCK, seed=163, size=1.2)
    g = Geo()
    crystal_prism(g, (-36.0, -60.0, 2.0), (-28.0, -64.0, 8.0), 2.4, facets=6)
    rig.part("rubble1", g, glow=AS_MINT, outline=0.5, outline_hex="#1F8F70")

    flag(rig, "root", "flagA", (-118.0 - 22.0, 26.0 + 6.0, 330.0), length=30, height=16, pole=292.0, pole_color=AS_WHITE_DK, finial=AS_MINT)
    flag(rig, "root", "flagB", (-150.0, 40.0, AS_TOP + 40.0), length=24, height=14, pole=AS_TOP, pole_color=AS_WHITE_DK, finial=AS_MINT)

    # -- Treasury: energy cells (1), a crystal cluster on a sled (2), a star-core vault (3) ----------------------
    g = Geo()
    for i, x in enumerate((-160.0, -152.0, -144.0)):
        cyl(g, (x, -58.0, 0.0), (x, -58.0, 10.0), 3.0, bevel=0.5)
    rig.part("treasury1", g, AS_WHITE_DK, finish="metal")
    g = Geo()
    for x in (-160.0, -152.0, -144.0):
        box(g, (x, -61.0, 5.0), (1.2, 0.4, 3.4), p=5, cuts=1)
    rig.part("treasury1", g, glow=AS_MINT, outline=0)
    g = Geo()
    box(g, (-124.0, -60.0, 2.0), (10.0, 6.0, 2.0), p=6)
    rig.part("treasury2", g, AS_WHITE_DK, finish="metal")
    g = Geo()
    for base, tip in (((-126.0, -60.0, 4.0), (-128.0, -62.0, 18.0)), ((-120.0, -60.0, 4.0), (-116.0, -63.0, 14.0)), ((-130.0, -58.0, 4.0), (-134.0, -60.0, 12.0))):
        crystal_prism(g, base, tip, 2.4, facets=6)
    rig.part("treasury2", g, glow=AS_MINT, outline=0.5, outline_hex="#1F8F70")
    g = Geo()
    box(g, (-96.0, -60.0, 8.0), (8.0, 7.0, 8.0), p=6)
    rig.part("treasury3", g, AS_WHITE)
    g = Geo().sphere((-96.0, -67.4, 8.0), 4.0, cuts=3)
    rig.part("treasury3", g, glow="#F4ECFF", outline=0.4, outline_hex="#C9A6FF")


def as_breach(rig, joint, x, y, z, w, h, seed=0):
    """A blown hole in the star-white facade: a dark jagged opening, broken panel edges."""
    rnd = random.Random(seed)
    n = 14
    pts, inner = [], []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = 0.72 + 0.28 * rnd.random()
        pts.append((x + math.cos(a) * w / 2 * k, z + math.sin(a) * h / 2 * k))
        inner.append((x + math.cos(a) * w / 2 * k * 0.72, z + math.sin(a) * h / 2 * k * 0.66 - h * 0.08))
    rig.part(joint, Geo().slab(pts, y - 2.4, 1.6), "#3A3048", outline=0.6, outline_hex=AS_HOLE)
    rig.part(joint, Geo().slab(inner, y - 3.4, 1.0), AS_HOLE, outline=0)
    g = Geo()
    for i in range(0, n, 3):
        px_, pz_ = pts[i]
        box(g, (px_, y - 3.0, pz_), (2.6 + 1.6 * rnd.random(), 1.4, 1.6 + 1.0 * rnd.random()), p=5, cuts=2)
    rig.part(joint, g, AS_WHITE_LT, outline=0.5)


def crumble_asteroid(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "rubble1": {"show": True}, "lamp2": {"hide": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "breachF": {"show": True}, "soot": {"show": True},
                     "bannerA": {"r": 10.0, "sz": 0.55, "x": 1.0}, "beam": {"hide": True}, "beamThin": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "fire3": {"show": True}, "split": {"show": True},
                     "towerB": {"hide": True}, "towerStump": {"show": True}, "bannerB": {"r": -14.0, "sz": 0.82, "x": -1.0}})
    return pose


ASTEROID_CITADEL = base_module(
    "cosmic", "Asteroid Citadel", height=330, width=180, canvas=(470, 740), feet=(360, 690),
    build=build_asteroid, crumble=crumble_asteroid, mount_depth=AS_DEPTHS, skin="asteroid_citadel",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((AS_PAD[0], AS_PAD[1] - 10.0, 40.0), 3, 24), ((-118.0, 26.0 - 10.0, 304.0), 2, 18), ((AS_C[0] - 70.0, AS_C[1] - 38.0, AS_TOP + 23.0), 3, 12)],
    smoke=[((AS_C[0] + 12.0, AS_C[1] - 40.0, 180.0), 2), ((AS_C[0] - 40.0, AS_C[1] - 40.0, 220.0), 3), ((-4.0, -44.0, 50.0), 3)],
    horn=(-90, 330), yaw=BASE_YAW,
    props=[prop_loop("rocks", [f"orb{i}" for i in range(AS_ORB_N)], AS_ORB_FRAMES, as_rocks_pose, ms=AS_ORB_MS, crumble=(0, 3), z="front",
                     hold=0, anchor=AS_ORB_C, occlude=["body"], outline=(2.0, 0.6, 0.56))],
    extra_meta={
        "collapseMaterial": "energy",
        # the asteroid's top with its towers falls toward the lane first, the facade a beat later
        "topple": [topple_lu(-160, -20, 190, delay_ms=0, push=1.0, sink_lu=30),
                   topple_lu(-150, -10, 90, delay_ms=170, push=0.8, sink_lu=24)],
        "rubbleColors": [AS_ROCK, AS_ROCK_DK, AS_WHITE, AS_MINT],
        "dustColor": "#B9B2C6",
        "ambientLu": [ambient_lu("stars", (AS_C[0], AS_C[1], 240.0), 60, 0.8), ambient_lu("glints", (AS_PAD[0], AS_PAD[1] - 20.0, 40.0), 14, 0.7,
                                                                                         color="#BDF7E6"),
                      ambient_lu("glints", (AS_C[0] - 58.0, AS_C[1] - 30.0, 156.0), 10, 0.5, color="#BDF7E6")],
    },
)


# ---------------------------------------------------------------------------------------------------
# Solar Sail Ark (round 3; Epic, Trophy Road 3,900): the ark as a short white starship standing nose-up in its landing
# ring, a great sunburst of solar sails unfurled behind and above it: seven broad pointed petals on pale gold ribs
# (midrib, curved edge ribs, a gold finial at each point), team cloth alternating with pale champagne film, fanning out
# from behind the hull's shoulder from the lane side round to the far side (the left half stands clear of the turrets
# in battle; menus show it whole). The hull is star white between gold trim rings: a thin team stripe under the lower
# row of warm lit viewports, a broad team band round the upper hull, dark void bands at its foot and shoulder, a gold
# collar, a ring of antenna spikes and a glowing sun beacon on its white nose; a dish array on a post stands at the
# left foot. Light sweeps across the sails from root to tip (the `shimmer` prop loop: a band of light on every petal,
# cut where the hull stands in front, then a rest) and the arrays' lights blink (the `blink` prop loop). Team colour:
# the four team petals, the hull's band and stripe, the doorway, the fin tips and the flags (as broad as the Star
# Ark's, A11). Code ambient: stars, glints on the sails.
#
# Crumble: 75% cracks, a chunk bitten out of the upper band with sparks, the back fin lost, a petal's point torn away;
# 50% violet plasma fire in the gap, the lowest petal snapped and hanging, scorch, the viewports dark, the antenna
# spikes bent; 25% a breach at the foot with a hanging cable and a second fire, the nose knocked askew, the two lowest
# petals torn off (ragged stubs).

SS_WHITE = "#DCD8E6"          # the white hull (star white, so the shading shows)
SS_WHITE_LT = "#E9E6F0"
SS_WHITE_DK = "#B6B0C6"
SS_VOID = "#2E2446"           # void bands, seams, the ramp
SS_VOID_LT = "#45376A"
SS_SAIL = "#EEE4C6"           # pale champagne sail film
SS_SAIL_DK = "#D6C9A4"        # the cells' seams
SS_RIB = "#CDB27C"            # gold ribs and trims (pale: big gold reads as the orange team)
SS_RIB_DK = "#A08C5C"
SS_GOLD = "#E8B23A"           # small gold accents only (finials, the collar studs)
SS_LIGHT = "#FFF2D0"          # warm viewport light
SS_SUN = "#FFE9AE"            # the sun beacon
SS_SHEEN = "#FFF8E6"          # the light sweeping the sails
SS_HOLE = "#120C1E"
SS_CRACK = "#150F22"
SS_DEPTHS = [-40, -24, -40, -24]
SS_PROFILE = [(0, 0), (38, 0), (43, 18), (43, 56), (40, 100), (34, 136), (27, 162), (20, 178), (0, 184)]   # a shorter, slimmer hull
SS_NOSE0, SS_NOSE1 = Z0 + 172.0, Z0 + 240.0           # the nose cone (its tip at z 260)
SS_HUB = (-103.0, 66.0, 192.0)                        # the sail fan's hub (behind the hull's shoulder: every root hidden)
SS_BLADES = [(32.0, 118.0), (56.0, 132.0), (80.0, 116.0), (104.0, 117.0), (128.0, 107.0), (152.0, 83.0), (176.0, 76.0)]   # angle, length
SS_R0 = 30.0                                          # the blades start inside the hull
SS_PK = 0.2                                           # a petal's greatest half width, as a share of its length
SS_TEAM = (0, 2, 4, 6)                                # the team-cloth petals (the others are champagne film)
SS_TILT, SS_BOW = 0.2, 3.0                            # tips lean toward the camera; the film billows
SS_HEM = 0.8                                          # the team hem starts here (fraction of the blade)
SS_SNAP = 0.34                                        # where a blade snaps (just outside the hull)
SS_SWEEP, SS_SWEEP_MS, SS_REST = 10, 80, 25           # sweep steps, step ms, rest steps (a sweep every 2.8 s)
SS_SPIKES = (-165.0, -125.0, -55.0, -15.0)            # the antenna spikes round the nose collar (hull angles)
SS_SPIKE_Z = SS_NOSE0 + 22.0
SS_DISH = (-150.0, -36.0)                            # the dish array's post
SS_FALLEN = (6, 5)                                    # the blades torn off at 25% (the hanging one at 50%: 6)


def ss_radius(z):
    h = z - Z0
    for (r0, z0), (r1, z1) in zip(SS_PROFILE[1:], SS_PROFILE[2:]):
        if z0 <= h <= z1 and z1 > z0:
            return r0 + (r1 - r0) * (h - z0) / (z1 - z0)
    if SS_NOSE0 <= z <= SS_NOSE1:
        return 21.0 - 13.0 * (z - SS_NOSE0) / (SS_NOSE1 - SS_NOSE0)
    return 18


def ss_on_hull(a_deg, z, out=0.6):
    a = math.radians(a_deg)
    r = ss_radius(z) + out
    return (SP[0] + r * math.cos(a), SP[1] + r * math.sin(a) * 0.8, z)


def ss_front(z, dx=0.0, push=1.2):
    r = ss_radius(z)
    return (SP[0] + dx, SP[1] - 0.8 * math.sqrt(max(1.0, r * r - dx * dx)) - push, z)


def ss_pt(b, u, v, lift=0.0):
    """A point on blade b: u along it (0 at the root inside the hull, 1 at the tip), v across it (-1..1), `lift` lu
    toward the camera from the film's front face."""
    a_deg, L = SS_BLADES[b]
    a = math.radians(a_deg)
    r = SS_R0 + u * (L - SS_R0)
    uu = min(max(u, 0.0), 1.0)
    w = max(3.0, SS_PK * L * math.sin(math.pi * uu ** 1.3) ** 0.7) if uu < 1.0 else 0.6   # a petal: widest at 0.6, pointed
    dx, dz = math.cos(a), math.sin(a)
    return (SS_HUB[0] + r * dx - v * w * dz, SS_HUB[1] - SS_TILT * r - SS_BOW * (1.0 - v * v) - lift, SS_HUB[2] + r * dz + v * w * dx)


def ss_panel(b, u0, u1, lift=0.0, thick=1.4, n=6, m=6, v0=-1.0, v1=1.0):
    """A bowed piece of blade b between u0 and u1: a closed thin shell whose front face looks at the camera."""
    import bmesh
    verts, faces = [], []
    W = m + 1
    N = (n + 1) * W

    def idx(side, i, j):
        return side * N + i * W + j

    for side in (0, 1):
        for i in range(n + 1):
            u = u0 + (u1 - u0) * i / n
            for j in range(m + 1):
                x, y, z = ss_pt(b, u, v0 + (v1 - v0) * j / m, lift)
                verts.append((x, y + side * thick, z))
    for i in range(n):
        for j in range(m):
            faces.append((idx(0, i, j), idx(0, i, j + 1), idx(0, i + 1, j + 1), idx(0, i + 1, j)))
            faces.append((idx(1, i, j), idx(1, i + 1, j), idx(1, i + 1, j + 1), idx(1, i, j + 1)))
    for i in range(n):
        for j in (0, m):
            faces.append((idx(0, i, j), idx(0, i + 1, j), idx(1, i + 1, j), idx(1, i, j)))
    for j in range(m):
        for i in (0, n):
            faces.append((idx(0, i, j), idx(1, i, j), idx(1, i, j + 1), idx(0, i, j + 1)))
    g = Geo()._add(verts, faces, Matrix.Identity(4))
    bmesh.ops.recalc_face_normals(g.bm, faces=g.bm.faces[:])
    return g


def ss_curve(g, b, u, r, lift=0.5, v0=-1.0, v1=1.0, n=6):
    """A rib across blade b at u (following the billow)."""
    pts = [ss_pt(b, u, v0 + (v1 - v0) * k / n, lift) for k in range(n + 1)]
    for a_, b_ in zip(pts, pts[1:]):
        g.capsule(a_, b_, r, segs=6, rings=1)
    return g


def ss_rib(g, b, v, u0, u1, r0, r1, lift=0.4, n=10):
    """A rib along petal b at v (following the petal's curved edge when |v| = 1), from u0 to u1."""
    pts = [ss_pt(b, u0 + (u1 - u0) * k / n, v, lift) for k in range(n + 1)]
    for k, (a_, b_) in enumerate(zip(pts, pts[1:])):
        g.capsule(a_, b_, r0 + (r1 - r0) * k / n, r0 + (r1 - r0) * (k + 1) / n, segs=6, rings=1)
    return g


def ss_blade(rig, joint, hem_joint, b):
    """One sail petal: champagne film (or team cloth for every other petal) bowed toward the camera, two fine seams,
    a gold midrib, gold edge ribs following its curved outline and a gold finial at its point; the outer part (past
    SS_HEM) is its own joint so it can tear away."""
    team = b in SS_TEAM
    for jn, u0, u1, n in ((joint, 0.0, SS_HEM, 9), (hem_joint, SS_HEM, 1.0, 4)):
        if team:
            rig.part(jn, ss_panel(b, u0, u1, n=n, m=8), team=True, outline=0.45)
        else:
            rig.part(jn, ss_panel(b, u0, u1, n=n, m=8), SS_SAIL, finish="gloss", outline=0.45, outline_hex="#9C8A5E")
        g = Geo()
        for v in (-0.5, 0.5):
            ss_rib(g, b, v, max(u0, 0.08), min(u1, 0.97), 0.38, 0.3, lift=0.15, n=6)
        rig.part(jn, g, SS_RIB_DK if team else SS_SAIL_DK, outline=0, highlight=False)
        g = Geo()
        for v in (-1.0, 1.0):
            ss_rib(g, b, v, max(u0, 0.04), min(u1, 0.995), 1.2, 1.0, lift=0.4, n=6)
        ss_rib(g, b, 0.0, max(u0, 0.04), min(u1, 0.99), 1.0, 0.75, lift=0.35, n=6)
        rig.part(jn, g, SS_RIB, finish="metal", outline=0.4, outline_hex=SS_RIB_DK)
    g = Geo().sphere(ss_pt(b, 1.03, 0.0, 0.6), 2.4, cuts=2)
    rig.part(hem_joint, g, SS_GOLD, finish="metal", outline=0.4, outline_hex=SS_RIB_DK)


def ss_sheen_pose(f):
    return {f"sheen{k}": ({"show": True} if k == f else {"hide": True}) for k in range(SS_SWEEP)}


def ss_blink_pose(f):
    return {f"blink{k}": ({"show": True} if k == f else {"hide": True}) for k in range(2)} if f < 2 else \
        {"blink0": {"hide": True}, "blink1": {"hide": True}}


def ss_spike(i):
    """Antenna spike i round the nose collar: its foot and tip."""
    a = SS_SPIKES[i]
    foot = ss_on_hull(a, SS_SPIKE_Z, -1.0)
    ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a)) * 0.8
    tip = (foot[0] + ca * 9.0, foot[1] + sa * 9.0, foot[2] + 12.0)
    return foot, tip


def ss_band(z0, z1, color=None, team=False, out=1.0, rig=None, joint="body", **kw):
    """A band round the hull between z0 and z1 (bulging a little at its middle)."""
    g = Geo().lathe([(ss_radius(z0) + out, 0), (ss_radius((z0 + z1) / 2) + out + 0.6, (z1 - z0) / 2), (ss_radius(z1) + out, z1 - z0)],
                    (SP[0], SP[1], z0), (SP[0], SP[1], z1), segs=40, squash=(1.0, 0.8))
    if team:
        rig.part(joint, g, team=True, **kw)
    else:
        rig.part(joint, g, color, **kw)


def build_solar(rig, M):
    for j, pos in (("tip", (SP[0], SP[1], SS_NOSE0)), ("fin", (SP[0] - 42, SP[1], 64)), ("strut", (0, 0, 0)), ("spikes", (SP[0], SP[1], SS_SPIKE_Z))):
        rig.joint(j, "body", pos)
    for j in ("crack1", "crack2", "crack3", "rubble1", "rubble2", "rubble3", "notch", "sparks1", "fire1", "scorch", "darkwin",
              "breach", "fire2", "cable", "tear1", "stub5", "stub6", "spikesBent"):
        rig.joint(j, "body", (0, 0, 0), hidden=True)
    ZA, ZB = Z0 + 34.0, Z0 + 104.0          # the team bands' feet
    ZV = Z0 + 152.0                         # the upper void band

    # -- the sail fan behind the hull: seven blades (one joint each, snapping just outside the hull) -----------------
    for b in range(len(SS_BLADES)):
        rig.joint(f"blade{b}", "body", ss_pt(b, SS_SNAP, 0.0))
        rig.joint(f"hem{b}", f"blade{b}", ss_pt(b, SS_HEM, 0.0))
        ss_blade(rig, f"blade{b}", f"hem{b}", b)
    # 75%: the top-left blade's hem torn away, a ragged scrap of team cloth left on the rib
    tb = 3
    pts = [ss_pt(tb, SS_HEM, v, 0.2) for v in (-1.0, 1.0)]
    rag = [(pts[0][0], pts[0][2]), (pts[1][0], pts[1][2])]
    for k, v in enumerate((0.8, 0.35, -0.1, -0.55, -0.9)):
        q = ss_pt(tb, SS_HEM + (0.07 if k % 2 == 0 else 0.03), v, 0.2)
        rag.append((q[0], q[2]))
    g = Geo().slab(rag, ss_pt(tb, SS_HEM, 0.0, 0.6)[1], 1.0)
    if tb in SS_TEAM:
        rig.part("tear1", g, team=True, outline=0.4)
    else:
        rig.part("tear1", g, SS_SAIL, finish="gloss", outline=0.4, outline_hex="#9C8A5E")
    # 25%: the stubs of the torn-off blades (a broken rib end and a ragged edge of film)
    for b in SS_FALLEN:
        j = f"stub{b}"
        if b in SS_TEAM:
            rig.part(j, ss_panel(b, 0.0, SS_SNAP + 0.06, n=3), team=True, outline=0.45)
        else:
            rig.part(j, ss_panel(b, 0.0, SS_SNAP + 0.06, n=3), SS_SAIL, finish="gloss", outline=0.45, outline_hex="#9C8A5E")
        g = Geo()
        for v in (-1.0, 1.0):
            g.capsule(ss_pt(b, 0.05, v, 0.4), ss_pt(b, SS_SNAP + (0.12 if v > 0 else 0.04), v, 0.4), 1.3, 1.15, segs=8, rings=1)
        rig.part(j, g, SS_RIB, finish="metal", outline=0.4, outline_hex=SS_RIB_DK)

    # -- the shimmer: a band of light across every blade, from root to tip (`shimmer` prop, one joint per step) -------
    rig.joint("sheen", "root", SS_HUB)
    for f in range(SS_SWEEP):
        rig.joint(f"sheen{f}", "sheen", SS_HUB, hidden=True)
        u = 0.14 + (SS_HEM - 0.18) * f / (SS_SWEEP - 1)
        g = Geo()
        for b in range(len(SS_BLADES)):
            g._add_bm(ss_panel(b, max(0.0, u - 0.045), min(SS_HEM - 0.01, u + 0.045), lift=0.7, thick=0.5, n=2, m=6, v0=-0.92, v1=0.92).bm,
                      Matrix.Identity(4))
        rig.part(f"sheen{f}", g, glow=SS_SHEEN, outline=0)

    # -- the landing ring on four legs over a mint engine glow ----------------------------------------------------
    g = Geo()
    cyl(g, (SP[0], SP[1], 2), (SP[0], SP[1], 6), 34, 38, bevel=0.6, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, glow=K.MINT, outline=0)
    g = Geo()
    cyl(g, (SP[0], SP[1], 5), (SP[0], SP[1], Z0 + 2), 36, 40, bevel=1.0, segs=36, squash=(1.0, 0.72))
    rig.part("body", g, SS_VOID, finish="gloss")
    g, gs = Geo(), Geo()
    for a in range(0, 360, 10):
        a0, a1 = math.radians(a), math.radians(a + 10)
        g.capsule((SP[0] + 56 * math.cos(a0), SP[1] + 56 * math.sin(a0) * 0.72, 22), (SP[0] + 56 * math.cos(a1), SP[1] + 56 * math.sin(a1) * 0.72, 22),
                  3.2, segs=10, rings=2)
        gs.capsule((SP[0] + 56 * math.cos(a0), SP[1] - 1.2 + 56 * math.sin(a0) * 0.72, 18.6),
                   (SP[0] + 56 * math.cos(a1), SP[1] - 1.2 + 56 * math.sin(a1) * 0.72, 18.6), 1.2, segs=8, rings=2)
    rig.part("body", g, SS_WHITE, finish="gloss", outline_hex=K.STAR_TRIM)
    rig.part("body", gs, SS_RIB, finish="metal", outline=0)
    for a in (-135, -45, 45, 135):
        c, s_ = math.cos(math.radians(a)), math.sin(math.radians(a)) * 0.72
        top = (SP[0] + 38 * c, SP[1] + 38 * s_, 40)
        foot = (SP[0] + 68 * c, SP[1] + 68 * s_, 3)
        g = Geo().capsule(top, foot, 3.4, 2.6)
        rig.part("body", g, SS_WHITE_DK, finish="metal")
        g = Geo()
        cyl(g, (foot[0], foot[1], 0), (foot[0], foot[1], 4), 7.0, 6.0, bevel=0.8, segs=16, squash=(1.0, 0.72))
        rig.part("body", g, SS_WHITE, finish="gloss", outline_hex=K.STAR_TRIM)

    # -- the hull: white, two broad team bands between pale gold trim rings, void bands at the foot and the shoulder --
    g = Geo().lathe(SS_PROFILE, (SP[0], SP[1], Z0), (SP[0], SP[1], Z0 + 184), segs=40, squash=(1.0, 0.8))
    rig.part("body", g, SS_WHITE, finish="gloss", outline_hex=K.STAR_TRIM)
    for z0, z1 in ((Z0 + 4, Z0 + 28), (ZV, ZV + 18)):
        ss_band(z0, z1, SS_VOID, out=1.4, rig=rig, finish="gloss")
    ss_band(ZA, ZA + 44, SS_WHITE_LT, out=1.0, rig=rig, finish="gloss", outline_hex=K.STAR_TRIM)
    ss_band(ZA + 4.0, ZA + 13.0, team=True, out=1.9, rig=rig, outline=0.35)    # a team stripe under the lower viewports
    ss_band(ZB, ZB + 40, team=True, out=1.0, rig=rig)                          # the broad team band round the upper hull
    g = Geo()
    for z in (ZA - 2, ZA + 46, ZB - 2, ZB + 42):
        cyl(g, (SP[0], SP[1], z - 1.3), (SP[0], SP[1], z + 1.3), ss_radius(z) + 2.4, bevel=0.3, segs=40, squash=(1.0, 0.8))
    rig.part("body", g, SS_RIB, finish="metal", outline=0.45, outline_hex=SS_RIB_DK)
    seams, strips = Geo(), Geo()
    for a_deg in (-150, -118, -86, -54, -22):
        seams.capsule(ss_on_hull(a_deg, ZA + 50, 0.9), ss_on_hull(a_deg, ZB - 6, 0.9), 0.8, segs=6, rings=2)
        seams.capsule(ss_on_hull(a_deg, ZB + 46, 0.9), ss_on_hull(a_deg, ZV - 2, 0.9), 0.8, segs=6, rings=2)
    for a_deg in (-126, -62):
        strips.capsule(ss_on_hull(a_deg, Z0 + 8, 2.2), ss_on_hull(a_deg, Z0 + 24, 2.2), 1.2, segs=6, rings=2)
    rig.part("body", seams, SS_WHITE_DK, outline=0, highlight=False)
    rig.part("body", strips, glow=K.MINT, outline=0)
    bez, pane = Geo(), Geo()
    for zc, arc in ((ZA + 22, range(-150, -25, 17)), (ZB + 20, range(-146, -30, 19))):
        for a_deg in arc:
            bez.blob(ss_on_hull(a_deg, zc, 1.8), (3.6, 3.6, 3.6), p=2.4, rot=(0, 0, a_deg + 90))
            pane.blob(ss_on_hull(a_deg, zc, 3.0), (2.5, 2.5, 2.5), p=2.4, rot=(0, 0, a_deg + 90))
    rig.part("body", bez, SS_WHITE_LT, finish="gloss", outline=0.5, outline_hex=K.STAR_TRIM)
    rig.part("body", pane, glow=SS_LIGHT, outline=0)
    g = Geo()
    for a_deg in range(-140, -30, 14):
        g.blob(ss_on_hull(a_deg, ZV + 9, 2.2), (3.0, 3.0, 2.6), p=3.0, rot=(0, 0, a_deg + 90))
    rig.part("body", g, glow=SS_LIGHT, outline=0.6, outline_hex=SS_VOID)

    # -- the nose (knocked askew at 25%): white cone, gold collar, antenna spikes, the sun beacon --------------------
    g = Geo().lathe([(0, 0), (21, 0), (16, 22), (8, 48), (0, 64)], (SP[0], SP[1], SS_NOSE0 + 4), (SP[0], SP[1], SS_NOSE1), segs=32, squash=(1.0, 0.8))
    rig.part("tip", g, SS_WHITE_LT, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo()
    cyl(g, (SP[0], SP[1], SS_NOSE0 + 14), (SP[0], SP[1], SS_NOSE0 + 19), 19.6, bevel=0.5, segs=32, squash=(1.0, 0.8))
    rig.part("tip", g, SS_RIB, finish="metal", outline=0.45, outline_hex=SS_RIB_DK)
    g = Geo()
    for a_deg in range(-160, -15, 20):
        g.sphere((SP[0] + 20.2 * math.cos(math.radians(a_deg)), SP[1] + 20.2 * 0.8 * math.sin(math.radians(a_deg)), SS_NOSE0 + 16.5), 1.3, cuts=2)
    rig.part("tip", g, SS_GOLD, finish="metal", outline=0.3)
    g = Geo()
    for k in range(5):
        zz = SS_NOSE0 + 26 + k * 6.5
        r_ = 17.0 - k * 2.4
        g.blob((SP[0] - 2.0, SP[1] - r_ * 0.8 - 0.6, zz), (3.8 - k * 0.5, 1.2, 2.3), p=2.6)
    rig.part("tip", g, glow=SS_LIGHT, outline=0.6, outline_hex=SS_VOID)
    g = Geo().sphere((SP[0], SP[1], SS_NOSE1 + 1.0), 5.6, cuts=3)
    rig.part("tip", g, glow=SS_SUN, outline=0.8, outline_hex="#C9A24E")
    g = Geo().lathe([(6.8, -0.8), (9.8, 0), (6.8, 0.8)], (SP[0], SP[1] - 2, SS_NOSE1 + 1.0), (SP[0], SP[1] - 3, SS_NOSE1 + 1.0), segs=24)
    rig.part("tip", g, glow="#FFF4D6", outline=0)
    for i in range(len(SS_SPIKES)):
        foot, tip = ss_spike(i)
        g = Geo().capsule(foot, tip, 1.5, 0.9, segs=6, rings=1)
        rig.part("spikes", g, SS_WHITE_DK, finish="metal", outline=0.4)
        g = Geo().sphere(tip, 1.4, cuts=2)
        rig.part("spikes", g, SS_RIB, finish="metal", outline=0.3)
    for i in range(len(SS_SPIKES)):
        foot, tip = ss_spike(i)
        bent = (tip[0] + (foot[0] - tip[0]) * 0.2, tip[1], foot[2] - 4.0)
        g = Geo().capsule(foot, bent, 1.5, 0.9, segs=6, rings=1)
        rig.part("spikesBent", g, SS_WHITE_DK, finish="metal", outline=0.4)

    # -- the dish array at the left foot ------------------------------------------------------------------------
    dx, dy = SS_DISH
    g = Geo()
    cyl(g, (dx, dy, 0), (dx, dy, 3), 7.0, 6.0, bevel=0.6, segs=16, squash=(1.0, 0.8))
    cyl(g, (dx, dy, 3), (dx, dy, 34), 2.6, 2.0, bevel=0.4, segs=12)
    rig.part("body", g, SS_WHITE_DK, finish="metal")
    g = Geo().lathe([(0.0, 0.0), (2.0, 0.4), (8.0, 3.2), (10.0, 5.0), (9.4, 5.4), (0.0, 1.6)], (dx, dy, 32.0), (dx - 5.0, dy - 3.0, 40.0), segs=24)
    rig.part("body", g, SS_WHITE_LT, finish="gloss", outline=0.5, outline_hex=K.STAR_TRIM)
    g = Geo().capsule((dx - 1.0, dy - 0.6, 35.0), (dx - 3.6, dy - 2.0, 41.0), 0.9, 0.7, segs=6, rings=1)
    rig.part("body", g, SS_RIB, finish="metal", outline=0.3)

    # -- the lights that blink (the `blink` prop: the spike tips with the dish, then the dish alone, then dark) -------
    rig.joint("blinks", "root", (SP[0], SP[1], SS_SPIKE_Z))
    rig.joint("blink0", "blinks", (SP[0], SP[1], SS_SPIKE_Z), hidden=True)
    rig.joint("blink1", "blinks", (SP[0], SP[1], SS_SPIKE_Z), hidden=True)
    g = Geo()
    for i in range(len(SS_SPIKES)):
        g.sphere(ss_spike(i)[1], 2.0, cuts=2)
    g.sphere((dx - 4.2, dy - 2.4, 42.4), 2.0, cuts=2)
    rig.part("blink0", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)
    g = Geo().sphere((dx - 4.2, dy - 2.4, 42.4), 2.0, cuts=2)
    g.sphere(ss_spike(0)[1], 2.0, cuts=2).sphere(ss_spike(3)[1], 2.0, cuts=2)
    rig.part("blink1", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)

    # -- fins (the back one lost at 75%) with team tips ------------------------------------------------------------
    g = Geo().slab([(SP[0] - 40, 22), (SP[0] - 74, 8), (SP[0] - 62, 58), (SP[0] - 44, 112)], SP[1] + 2, 6)
    rig.part("fin", g, SS_WHITE_DK, finish="gloss")
    g = Geo().slab([(SP[0] - 66, 8), (SP[0] - 76, 8), (SP[0] - 66, 34)], SP[1] + 2, 6.6)
    rig.part("fin", g, team=True, outline=0.6)
    g = Geo().slab([(SP[0] + 40, 28), (SP[0] + 62, 14), (SP[0] + 52, 70), (SP[0] + 41, 102)], SP[1] + 10, 6)
    rig.part("body", g, SS_WHITE_DK, finish="gloss")
    g = Geo().slab([(SP[0] + 56, 14), (SP[0] + 64, 14), (SP[0] + 58, 32)], SP[1] + 10, 6.6)
    rig.part("body", g, team=True, outline=0.6)

    # -- the ramp and the lit team doorway (the gate) ----------------------------------------------------------
    g = Geo().slab([(-64, 0), (-64, 14), (-4, 1.6), (-4, 0)], -30, 24)
    rig.part("body", g, K.VIOLET_DK, finish="gloss")
    g = Geo()
    for yy in (-42.5, -17.5):
        g.capsule((-64, yy, 14.8), (-4, yy, 2.4), 0.9, segs=6, rings=2)
    rig.part("body", g, glow=K.MINT, outline=0)
    door = ss_on_hull(-62, Z0 + 18, 0.0)
    g = Geo().blob((door[0] + 2, door[1] - 2, Z0 + 16), (14, 5, 16), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, SS_WHITE_LT, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((door[0] + 3.2, door[1] - 4.4, Z0 + 15), (10, 4, 12.5), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, team=True)
    g = Geo().blob((door[0] + 4.2, door[1] - 6.8, Z0 + 13), (6.4, 3, 8.8), p=4.0, rot=(0, 0, -28))
    rig.part("body", g, glow=SS_LIGHT, outline=0)

    # -- hover discs at the mounts, struts into the hull --------------------------------------------------------
    for i, (x, y, z) in enumerate(M):
        r = ss_radius(min(z - 20, Z0 + 170))
        anchor = (SP[0] + r * 0.6, SP[1] - r * 0.55, min(z - 22, Z0 + 168))
        if i == 0:
            anchor = (x - 4, y + 12, 24)
        platform(rig, "strut" if i == 2 else "body", (x, y, z), SS_WHITE_LT, SS_WHITE_DK, style="disc", r=(24, 18), t=5, depth_to=anchor,
                 accent=K.MINT)

    # -- damage ---------------------------------------------------------------------------------------------
    x, y, z = ss_front(ZB + 22, -7.0, push=1.0)
    g = Geo().slab(_jagged(x, z, 17.0, 16.0, seed=1), y, 2.2)
    rig.part("notch", g, SS_WHITE_DK, outline=0.6)
    g = Geo().slab(_jagged(x + 0.5, z - 0.5, 12.0, 11.5, seed=2), y - 1.4, 1.0)
    rig.part("notch", g, SS_HOLE, outline=0, highlight=False)
    g = Geo()
    g.capsule((x - 2.0, y - 2.4, z + 3.0), (x + 4.0, y - 3.4, z - 6.0), 0.9)
    g.capsule((x + 2.0, y - 2.4, z + 1.0), (x - 3.0, y - 3.6, z - 8.0), 0.9)
    rig.part("notch", g, K.STAR_TRIM, finish="metal", outline=0.4)
    g = Geo().star((x + 5.4, y - 4.0, z - 9.0), 7.0, 2.4, 1.0, points=5)
    rig.part("sparks1", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)
    plasma(rig, "fire1", [(x, y - 3.0, z - 8.0, 1.4)])
    g = Geo()
    g.slab(_jagged(x + 2.0, z + 15.0, 8.0, 8.0, seed=3, amp=0.35), y + 0.4, 0.8)
    xx, yy, zz = ss_front(ZA + 30, 14.0, push=0.8)
    g.slab(_jagged(xx, zz + 8.0, 9.0, 7.0, seed=4, amp=0.3), yy, 0.8)
    rig.part("scorch", g, "#3A3448", outline=0, highlight=False)
    g = Geo()
    for zc, arc in ((ZA + 22, range(-150, -25, 17)), (ZB + 20, range(-146, -30, 19))):
        for a_deg in arc:
            g.blob(ss_on_hull(a_deg, zc, 3.4), (2.7, 2.7, 2.7), p=2.4, rot=(0, 0, a_deg + 90))
    for a_deg in range(-140, -30, 14):
        g.blob(ss_on_hull(a_deg, ZV + 9, 2.8), (3.2, 3.2, 2.8), p=3.0, rot=(0, 0, a_deg + 90))
    rig.part("darkwin", g, "#2A2140", outline=0, highlight=False)
    bx, by, bz = ss_front(Z0 + 44, 18.0, push=1.0)
    g = Geo().slab(_jagged(bx, bz, 16.0, 18.0, seed=5, amp=0.3), by, 2.4)
    rig.part("breach", g, SS_WHITE_DK, outline=0.6)
    g = Geo().slab(_jagged(bx, bz - 1.0, 11.5, 13.0, seed=6, amp=0.3), by - 1.4, 1.0)
    rig.part("breach", g, SS_HOLE, outline=0, highlight=False)
    g = Geo()
    g.capsule((bx - 4.0, by - 3.0, bz + 6.0), (bx + 6.0, by - 7.0, bz - 10.0), 1.6)
    g.capsule((bx + 6.0, by - 7.0, bz - 10.0), (bx + 10.0, by - 8.0, bz - 20.0), 1.4)
    rig.part("cable", g, SS_VOID, outline=0.5)
    g = Geo().star((bx + 10.0, by - 9.5, bz - 21.0), 4.0, 1.5, 1.0, points=5)
    rig.part("cable", g, glow=K.MINT_CORE, outline=0.6, outline_hex=K.MINT)
    plasma(rig, "fire2", [(bx - 4.0, by - 4.0, bz - 12.0, 1.4)])
    chipped_cracks(rig, "crack1", [[ss_on_hull(-100, ZB + 34, 2), ss_on_hull(-94, ZB + 26, 2), ss_on_hull(-100, ZB + 14, 2)],
                                   [ss_on_hull(-70, ZV - 6, 2), ss_on_hull(-64, ZV - 14, 2)]], SS_CRACK, SS_WHITE_LT, w=1.8)
    chipped_cracks(rig, "crack2", [[ss_on_hull(-116, ZA + 40, 2), ss_on_hull(-110, ZA + 30, 2), ss_on_hull(-116, ZA + 18, 2)],
                                   [ss_on_hull(-60, ZB + 6, 2), ss_on_hull(-54, ZB - 4, 2)]], SS_CRACK, SS_WHITE_LT, w=1.8)
    chipped_cracks(rig, "crack3", [[ss_on_hull(-90, ZV + 2, 2), ss_on_hull(-84, ZV - 6, 2), ss_on_hull(-90, ZV - 16, 2)],
                                   [ss_on_hull(-130, ZA + 60, 2), ss_on_hull(-124, ZA + 52, 2)]], SS_CRACK, SS_WHITE_LT, w=1.8)
    rubble(rig, "rubble1", [(-162, -42), (-126, -52)], SS_WHITE_DK, seed=3)
    rubble(rig, "rubble2", [(-98, -58), (-70, -60)], SS_WHITE, seed=13)
    rubble(rig, "rubble3", [(-156, -60), (-120, -62), (16, -56)], SS_WHITE_DK, seed=23, size=1.2)
    for j, pts2 in (("rubble2", [(-84, -62)]), ("rubble3", [(-138, -66), (4, -60)])):
        g = Geo()
        for x2, y2 in pts2:
            g.slab([(x2 - 6, 2), (x2 + 5, 3), (x2 + 7, 9), (x2 - 3, 11)], y2 - 6, 0.8)
        rig.part(j, g, SS_SAIL, outline=0.45, outline_hex="#9C8A5E")

    tx_, ty_, tz_ = ss_pt(4, 1.04, 0.0, 0.6)
    flag(rig, "root", "flagA", (tx_, ty_, tz_ + 30.0), length=28, height=15, pole=tz_ + 2.0, pole_color=SS_RIB_DK, finial=SS_GOLD)
    flag(rig, "root", "flagB", (-162, 18, 120), length=24, height=14, pole=14, pole_color=K.STAR_TRIM, finial=SS_GOLD)

    # -- Treasury: the sun forge: light cells (1), a sun crystal on an anvil (2), a forge ring round a small sun (3) ----
    g = Geo()
    for k, x in enumerate((-162, -152, -142)):
        cyl(g, (x, -58, 0), (x, -58, 18 - k * 2), 4.2, bevel=0.8)
    rig.part("treasury1", g, SS_WHITE_DK, finish="gloss")
    g = Geo()
    for k, x in enumerate((-162, -152, -142)):
        cyl(g, (x, -62.4, 4), (x, -62.4, 14 - k * 2), 1.4, bevel=0.3)
    rig.part("treasury1", g, glow=SS_SUN, outline=0)
    g = Geo()
    box(g, (-128, -62, 5), (9, 7, 5), p=5, taper=(1.0, 0.8))
    box(g, (-128, -62, 12), (12, 6, 2.6), p=5)
    rig.part("treasury2", g, K.STAR_TRIM, finish="metal")
    g = Geo().lathe([(0, 0), (3.4, 3), (3.0, 10), (0, 15)], (-128, -62, 14), (-127, -62, 29), segs=6)
    rig.part("treasury2", g, glow="#FFF0C8", outline=0.8, outline_hex="#C9A24E")
    g = Geo()
    for i in range(24):
        a0, a1 = 2 * math.pi * i / 24, 2 * math.pi * (i + 1) / 24
        g.capsule((-102 + 11 * math.cos(a0), -64, 14 + 11 * math.sin(a0)), (-102 + 11 * math.cos(a1), -64, 14 + 11 * math.sin(a1)), 1.8, segs=8, rings=2)
    g.capsule((-110, -64, 0), (-106, -64, 6), 2.0).capsule((-94, -64, 0), (-98, -64, 6), 2.0)
    rig.part("treasury3", g, SS_RIB, finish="metal", outline=0.5, outline_hex=SS_RIB_DK)
    g = Geo().sphere((-102, -65, 14), 6.4, cuts=4)
    rig.part("treasury3", g, glow=SS_SUN, outline=0.8, outline_hex="#C9A24E")


def crumble_solar(stage):
    pose = {}
    if stage >= 1:
        pose.update({"crack1": {"show": True}, "fin": {"hide": True}, "rubble1": {"show": True}, "notch": {"show": True},
                     "sparks1": {"show": True}, "hem3": {"hide": True}, "tear1": {"show": True}})
    if stage >= 2:
        pose.update({"crack2": {"show": True}, "rubble2": {"show": True}, "fire1": {"show": True}, "scorch": {"show": True},
                     "darkwin": {"show": True}, "sparks1": {"hide": True}, "blade6": {"r": 58.0, "z": -4.0},
                     "spikes": {"hide": True}, "spikesBent": {"show": True}})
    if stage >= 3:
        pose.update({"crack3": {"show": True}, "rubble3": {"show": True}, "breach": {"show": True}, "cable": {"show": True},
                     "fire2": {"show": True}, "tip": {"r": 13.0, "x": -4.0, "z": -6.0}, "blade5": {"hide": True},
                     "blade6": {"hide": True}, "stub5": {"show": True}, "stub6": {"show": True}, "spikesBent": {"r": 13.0, "x": -4.0, "z": -6.0}})
    return pose


SOLAR_SAIL_ARK = base_module(
    "cosmic", "Solar Sail Ark", height=330, width=190, canvas=(500, 760), feet=(390, 710),
    build=build_solar, crumble=crumble_solar, mount_depth=SS_DEPTHS, skin="solar_sail_ark",
    flags=[{"name": "flagA", "crumbleMax": 2}, {"name": "flagB", "crumbleMax": 3, "phase": 1.7, "z": "back"}],
    lights=[((-40, -46, 30), 3, 30), ((SP[0], SP[1] - 20, SS_NOSE1 + 1.0), 2, 24), ((SP[0], SP[1] - 36, Z0 + 124), 1, 26),
            ((SP[0], SP[1] - 30, Z0 + 56), 1, 26), ((SP[0], SP[1] - 30, 4), 3, 34)],
    smoke=[((SP[0], SP[1], Z0 + 196), 2), ((SP[0] - 20, -10, 90), 3), ((-40, -20, 30), 3)],
    horn=(-120, 340), yaw=BASE_YAW,
    props=[prop_loop("shimmer", ["sheen"], SS_SWEEP + 1, ss_sheen_pose, ms=SS_SWEEP_MS, crumble=(0, 1), z="front", hold=SS_SWEEP,
                     anchor=ss_pt(3, 0.5, 0.0), occlude=["body"], alpha=0.55, outline="none",
                     sequence=list(range(SS_SWEEP)) + [SS_SWEEP] * SS_REST),
           prop_loop("blink", ["blinks"], 3, ss_blink_pose, ms=380, crumble=(0, 1), z="front", hold=2,
                     anchor=(SP[0], SP[1], SS_SPIKE_Z), sequence=[0, 2, 1, 2], outline="none")],
    extra_meta={
        "collapseMaterial": "energy",
        # the sail fan with the nose falls toward the lane first, the hull a beat later
        "topple": [topple_lu(-185, -10, 190, delay_ms=0, push=1.0, sink_lu=30),
                   topple_lu(-145, -35, 80, delay_ms=170, push=0.75, sink_lu=20)],
        "rubbleColors": [SS_WHITE, SS_SAIL, SS_VOID_LT, SS_RIB],
        "dustColor": "#D8D2C8",
        "ambientLu": [ambient_lu("stars", (SP[0], SP[1] - 30, 290), 50, 1.2), ambient_lu("stars", (-150.0, 0.0, 160.0), 40, 0.8),
                      ambient_lu("glints", ss_pt(3, 0.55, 0.0, 2.0), 34, 0.9, color="#FFF6DC"),
                      ambient_lu("glints", ss_pt(5, 0.55, 0.0, 2.0), 26, 0.7, color="#FFF6DC")],
    },
)

SKINS = [NEBULA_ARK, ASTEROID_CITADEL, SOLAR_SAIL_ARK]
