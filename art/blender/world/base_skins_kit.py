"""Shared building blocks for the base skin models (PLAN 2c, owner request 2026-10-08: "more base skins
that are not just a recolour of the standard"): leaves, rose blooms and bushes, climbing vines, gothic
windows, a stained-glass rose window, cartoon fire, masonry courses, hanging nets, shells and coral.

Every skin (world/base_skins_<age>.py) keeps the standard base's footprint, its four mount platforms
(common.BASE_MOUNTS through `place()`), flag clips, Treasury, crumble stages and team layer; these
helpers only add new geometry and materials on top (character space, lu: x toward the lane, y away
from the camera, z up; surfaces facing the camera are at -y).
"""
import math
import random

from ageborn_art.geometry import Geo

from world.common import box, rock

FIRE = "#FFC47A"
FIRE_CORE = "#FFF0CC"
FIRE_OUT = "#EE9A5C"


def flames(rig, joint, spots, out=FIRE_OUT, body=FIRE, core=FIRE_CORE):
    """Cartoon fire: teardrop tongues that lean and curl (outer, body, hot core). spots = [(x, y, z, k)]."""
    o, g, c = Geo(), Geo(), Geo()
    for x, y, z, k in spots:
        for dx, lean, r, h in ((0.0, 0.25, 6.6, 20.0), (-6.0, -0.35, 4.4, 13.0), (6.0, 0.45, 4.0, 11.0),
                               (2.5, -0.2, 3.0, 8.0)):
            cx, cz = x + dx * k, z + h * 0.42 * k
            o.blob((cx, y + 2, cz), (r * 1.3 * k, r * 0.9 * k, h * 0.62 * k), p=2.0, taper=(1.0, 0.08),
                   shift=(lean * 1.2, 0.0))
            g.blob((cx, y, cz - 0.6 * k), (r * k, r * 0.7 * k, h * 0.5 * k), p=2.0, taper=(1.0, 0.1),
                   shift=(lean, 0.0))
            c.blob((cx, y - 2.5, cz - 2.4 * k), (r * 0.5 * k, r * 0.4 * k, h * 0.28 * k), p=2.0,
                   taper=(1.0, 0.2), shift=(lean * 0.6, 0.0))
    rig.part(joint, o, glow=out, outline=0)
    rig.part(joint, g, glow=body, outline=0)
    rig.part(joint, c, glow=core, outline=0)


# -- foliage -------------------------------------------------------------------------------------
def leaf(g, p, length, width, angle_deg, tilt=0.0, thick=0.9):
    """A pointed leaf lying in the camera plane: its stalk end at p, pointing at `angle_deg` on screen
    (0 = toward the lane, 90 = up); `tilt` turns it toward (+) or away from (-) the camera."""
    a = math.radians(angle_deg)
    c = (p[0] + math.cos(a) * length * 0.5, p[1], p[2] + math.sin(a) * length * 0.5)
    g.blob(c, (width * 0.5, thick, length * 0.5), p=2.0, cuts=4, taper=(0.55, 0.12),
           rot=(tilt, 90.0 - angle_deg, 0.0))
    return g


def rose(gp, gc, gd, p, r, seed=0):
    """A rose bloom facing the camera at p with radius r: five outer petals (gp), a cupped heart (gc)
    and the dark swirl of the inner petals (gd), so it reads as a rose, not a dot, at lane size."""
    rnd = random.Random(seed)
    x, y, z = p
    a0 = rnd.uniform(0.0, 72.0)
    for k in range(5):
        a = math.radians(a0 + 72.0 * k)
        gp.blob((x + math.cos(a) * r * 0.5, y + 0.4, z + math.sin(a) * r * 0.5), (r * 0.58, r * 0.4, r * 0.48),
                p=2.2, cuts=4, rot=(0, 90.0 - math.degrees(a), 0))
    gc.blob((x, y - r * 0.3, z + r * 0.05), (r * 0.56, r * 0.48, r * 0.5), p=2.2, cuts=4)
    sw = math.radians(a0)
    gd.blob((x + math.cos(sw) * r * 0.1, y - r * 0.74, z + r * 0.12), (r * 0.34, 0.5, r * 0.11), p=2.0, cuts=3,
            rot=(0, 90.0 - 28.0, 0))
    gd.blob((x - r * 0.12, y - r * 0.74, z - r * 0.14), (r * 0.22, 0.5, r * 0.08), p=2.0, cuts=3,
            rot=(0, 90.0 + 20.0, 0))
    return gp


class Roses:
    """Collects rose blooms, leaves and stems in a handful of materials, then adds them as parts."""

    def __init__(self, petal, heart, swirl, leaf_dk, leaf_lt, stem):
        self.colors = dict(petal=petal, heart=heart, swirl=swirl, leaf_dk=leaf_dk, leaf_lt=leaf_lt, stem=stem)
        self.g = {k: Geo() for k in self.colors}
        self.n = 0

    def bloom(self, p, r=5.5):
        self.n += 1
        rose(self.g["petal"], self.g["heart"], self.g["swirl"], p, r, seed=self.n * 7 + int(p[0] * 3 + p[2]))
        return self

    def leaf(self, p, length, angle, light=False, width=None, tilt=0.0):
        leaf(self.g["leaf_lt" if light else "leaf_dk"], p, length, width or length * 0.52, angle, tilt=tilt)
        return self

    def stem(self, pts, r=1.1):
        for a, b in zip(pts, pts[1:]):
            self.g["stem"].capsule(a, b, r, r * 0.85, segs=8, rings=2)
        return self

    def vine(self, pts, r=1.1, every=6.5, length=5.2, blooms=(), bloom_r=5.0, seed=0):
        """A climbing stem through `pts` with alternating leaves every `every` lu and blooms at the
        given fractions (0..1) along it."""
        rnd = random.Random(seed)
        self.stem(pts, r)
        seglen = [math.dist(a, b) for a, b in zip(pts, pts[1:])]
        total = sum(seglen) or 1.0
        d = every * 0.5
        side = 1
        while d < total:
            p, ang = _along(pts, seglen, d)
            self.leaf(p, length * rnd.uniform(0.85, 1.15), ang + side * rnd.uniform(48, 70),
                      light=rnd.random() < 0.45, tilt=rnd.uniform(-18, 18))
            side = -side
            d += every * rnd.uniform(0.8, 1.2)
        for f in blooms:
            p, _ = _along(pts, seglen, total * f)
            self.bloom((p[0], p[1] - 1.2, p[2]), bloom_r * rnd.uniform(0.85, 1.15))
        return self

    def bush(self, c, radii, blooms=5, bloom_r=5.2, seed=0):
        """A rounded rose bush (lumpy leaf mound with leaf tufts) carrying `blooms` roses on its front."""
        rnd = random.Random(seed)
        rock(self.g["leaf_dk"], c, radii, seed=seed, jag=0.14, p=2.2, cuts=4)
        rx, ry, rz = radii
        for k in range(int(rx * rz / 30) + 4):
            a = rnd.uniform(0.1, math.pi - 0.1)
            px = c[0] + math.cos(a) * rx * rnd.uniform(0.3, 0.95)
            pz = c[2] + math.sin(a) * rz * rnd.uniform(0.2, 0.9)
            self.leaf((px, c[1] - ry * 0.85, pz), rnd.uniform(4.5, 6.5), rnd.uniform(20, 160), light=True,
                      tilt=rnd.uniform(-30, -5))
        for k in range(blooms):
            a = math.pi * (0.15 + 0.7 * (k + rnd.uniform(0.2, 0.8)) / blooms)
            px = c[0] + math.cos(a) * rx * rnd.uniform(0.2, 0.7)
            pz = c[2] + math.sin(a) * rz * rnd.uniform(0.15, 0.75)
            self.bloom((px, c[1] - ry * 0.9, pz), bloom_r * rnd.uniform(0.85, 1.12))
        return self

    def parts(self, rig, joint):
        c = self.colors
        rig.part(joint, self.g["stem"], c["stem"], outline=0.5)
        rig.part(joint, self.g["leaf_dk"], c["leaf_dk"], finish="hair", outline=0.6)
        rig.part(joint, self.g["leaf_lt"], c["leaf_lt"], finish="hair", outline=0.5)
        rig.part(joint, self.g["petal"], c["petal"], outline=0.6)
        rig.part(joint, self.g["heart"], c["heart"], finish="gloss", outline=0.4)
        rig.part(joint, self.g["swirl"], c["swirl"], outline=0, highlight=False)
        self.g = {k: Geo() for k in c}


def _along(pts, seglen, d):
    """Point and screen direction (degrees) at distance d along a polyline."""
    for (a, b), L in zip(zip(pts, pts[1:]), seglen):
        if d <= L or L == seglen[-1]:
            t = max(0.0, min(1.0, d / L)) if L else 0.0
            p = tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
            return p, math.degrees(math.atan2(b[2] - a[2], b[0] - a[0]))
        d -= L
    return pts[-1], 0.0


# -- masonry and windows -------------------------------------------------------------------------
def ashlar(rig, joint, x0, x1, z0, z1, y, tones, h=11.0, w=(15.0, 21.0), seed=0, gap=0.9, outline=0.5,
           skip=None):
    """Staggered bevelled blocks on a wall facing the camera (at y), alternating `tones` (2-3 hexes).
    `skip(x, z)` -> True leaves a block out (windows, a banner, a breach)."""
    rnd = random.Random(seed)
    geos = [Geo() for _ in tones]
    z = z0
    row = 0
    while z < z1 - 3:
        hh = min(h, z1 - z)
        x = x0 + (0 if row % 2 == 0 else (w[0] * 0.5))
        k = row
        if row % 2:
            # the first half block of an odd row
            x1h = x0 + w[0] * 0.5
            if not (skip and skip((x0 + x1h) / 2, z + hh / 2)):
                geos[(k + row) % len(tones)].blob(((x0 + x1h) / 2, y, z + hh / 2), ((x1h - x0) / 2 - gap, 1.4, hh / 2 - gap),
                                                  p=5.0, cuts=2)
        while x < x1 - 3:
            bw = rnd.uniform(*w)
            xe = min(x1, x + bw)
            if not (skip and skip((x + xe) / 2, z + hh / 2)):
                geos[(k * 7 + row * 3) % len(tones)].blob(((x + xe) / 2, y, z + hh / 2), ((xe - x) / 2 - gap, 1.4, hh / 2 - gap),
                                                          p=5.0, cuts=2)
            x = xe + 0.2
            k += 1
        z += hh + 0.4
        row += 1
    for g, t in zip(geos, tones):
        rig.part(joint, g, t, outline=outline)


def ring_blocks(rig, joint, cx, cy, r, z0, z1, tones, h=13.0, n=9, a0=1.02, a1=2.0, skip=None):
    """Bevelled blocks round the visible half of a round tower (angles in units of pi, staggered rows)."""
    geos = [Geo() for _ in tones]
    row = 0
    z = z0
    while z < z1 - 4:
        hh = min(h, z1 - z)
        off = 0.5 if row % 2 else 0.0
        for i in range(n + 1):
            aa = math.pi * (a0 + (i + off) / n * (a1 - a0))
            ab = math.pi * (a0 + (i + off + 0.92) / n * (a1 - a0))
            if ab > math.pi * a1 + 1e-6:
                continue
            am = (aa + ab) / 2
            rr = r + 0.4
            c = (cx + rr * math.cos(am), cy + rr * math.sin(am), z + hh / 2)
            if skip and skip(am, z + hh / 2):
                continue
            half = rr * (ab - aa) / 2
            geos[(i + row) % len(tones)].blob(c, (half - 0.6, 1.3, hh / 2 - 0.8), p=5.0, cuts=2,
                                              rot=(0, 0, math.degrees(am) + 90))
        z += hh + 0.4
        row += 1
    for g, t in zip(geos, tones):
        rig.part(joint, g, t, outline=0.5)


def lancet(rig, joint, x, y, z, w, h, glow_hex="#FFD89A", frame="#4A3B2E", sill=None, mullion=True):
    """A gothic lancet window (pointed arch) on a wall facing the camera, lit from inside, with a stone
    frame and an optional sill colour."""
    def outline_pts(ww, hh, cx, cz):
        # straight jambs up to the springing line, then an equilateral pointed arch (two arcs of
        # radius ww, each centred on the opposite springing point) meeting at the top
        top = cz + hh / 2
        spring = top - 0.866 * ww
        pts = [(cx - ww / 2, cz - hh / 2), (cx + ww / 2, cz - hh / 2), (cx + ww / 2, spring)]
        for i in range(1, 6):
            a = math.radians(60.0 * i / 6)
            pts.append((cx - ww / 2 + ww * math.cos(a), spring + ww * math.sin(a)))
        pts.append((cx, top))
        for i in range(5, 0, -1):
            a = math.radians(180.0 - 60.0 * i / 6)
            pts.append((cx + ww / 2 + ww * math.cos(a), spring + ww * math.sin(a)))
        pts.append((cx - ww / 2, spring))
        return pts
    g = Geo().slab(outline_pts(w + 3.6, h + 3.6, x, z), y, 1.6)
    rig.part(joint, g, frame, outline=0.5)
    g = Geo().slab(outline_pts(w, h, x, z), y - 0.9, 1.0)
    rig.part(joint, g, glow=glow_hex, outline=0)
    if mullion:
        g = Geo()
        box(g, (x, y - 1.6, z + 1.0), (0.7, 0.6, h / 2 - 1.5), p=4, cuts=2)
        box(g, (x, y - 1.6, z - h * 0.08), (w / 2 - 0.4, 0.6, 0.6), p=4, cuts=2)
        rig.part(joint, g, frame, outline=0)
    if sill:
        g = Geo()
        box(g, (x, y - 2.2, z - h / 2 - 2.6), (w / 2 + 3.2, 3.0, 1.5), p=5)
        rig.part(joint, g, sill, outline=0.5)


def rose_window(rig, joint, c, r, frame, frame_dk, panes, hub, glow_joint=None):
    """A round stained-glass rose window facing the camera at c = (x, y, z): a moulded stone ring,
    eight spokes ending in trefoil lobes, an inner ring and a boss; the panes glow in `panes` (a list of
    hexes, alternating by sector). The panes go on `glow_joint` (default: the same joint)."""
    x, y, z = c
    gj = glow_joint or joint
    # glowing panes: a disc split into sectors (alternating colours), set a little back
    for i in range(8):
        a0 = math.radians(22.5 + 45 * i)
        a1 = math.radians(22.5 + 45 * (i + 1))
        pts = [(x + math.cos(a0) * r * 0.22, z + math.sin(a0) * r * 0.22)]
        for k in range(7):
            a = a0 + (a1 - a0) * k / 6
            pts.append((x + math.cos(a) * r * 0.92, z + math.sin(a) * r * 0.92))
        pts.append((x + math.cos(a1) * r * 0.22, z + math.sin(a1) * r * 0.22))
        g = Geo().slab(pts, y + 0.8, 0.8)
        rig.part(gj, g, glow=panes[i % len(panes)], outline=0)
    g = Geo().slab([(x + math.cos(math.radians(a)) * r * 0.3, z + math.sin(math.radians(a)) * r * 0.3) for a in range(0, 360, 30)],
                   y + 0.6, 0.8)
    rig.part(gj, g, glow=hub, outline=0)
    # stone tracery: the outer moulding (a thick ring), spokes, an inner ring and the boss
    g = Geo()
    n = 40
    outer = [(x + math.cos(2 * math.pi * k / n) * (r + 2.6), z + math.sin(2 * math.pi * k / n) * (r + 2.6)) for k in range(n)]
    inner = [(x + math.cos(2 * math.pi * k / n) * r, z + math.sin(2 * math.pi * k / n) * r) for k in range(n)]
    for k in range(n):
        j = (k + 1) % n
        g.slab([outer[k], outer[j], inner[j], inner[k]], y - 0.6, 2.6)
    rig.part(joint, g, frame, outline=0.6)
    g = Geo()
    for i in range(8):
        a = math.radians(22.5 + 45 * i)
        g.capsule((x + math.cos(a) * r * 0.3, y - 0.9, z + math.sin(a) * r * 0.3),
                  (x + math.cos(a) * r * 0.96, y - 0.9, z + math.sin(a) * r * 0.96), 0.95, 0.8, segs=8, rings=2)
        # a small trefoil lobe near the rim between two spokes
        b = math.radians(45 * i)
        g.blob((x + math.cos(b) * r * 0.66, y - 0.9, z + math.sin(b) * r * 0.66), (r * 0.17, 0.7, r * 0.17), p=2.0, cuts=3)
    n2 = 24
    for k in range(n2):
        a0 = 2 * math.pi * k / n2
        a1 = 2 * math.pi * (k + 1) / n2
        g.capsule((x + math.cos(a0) * r * 0.31, y - 0.9, z + math.sin(a0) * r * 0.31),
                  (x + math.cos(a1) * r * 0.31, y - 0.9, z + math.sin(a1) * r * 0.31), 0.8, segs=6, rings=1)
    rig.part(joint, g, frame_dk, outline=0.4)
    g = Geo().sphere((x, y - 1.2, z), r * 0.12, cuts=3)
    rig.part(joint, g, frame, outline=0.4)


def lantern(rig, joint, x, y, z, iron="#4A4E56", glow_hex="#FFD08A", core="#FFF0CC", arm=8.0):
    """A wall lantern on a bracket (arm toward -x from the wall at x + arm)."""
    g = Geo().capsule((x + arm, y + 1, z + 7), (x, y, z + 7), 0.8)
    g.capsule((x, y, z + 7), (x, y, z + 5), 0.7)
    rig.part(joint, g, iron, finish="metal", outline=0.4)
    g = Geo()
    box(g, (x, y, z + 4.6), (3.2, 3.2, 0.9), p=4, cuts=2)
    box(g, (x, y, z - 3.4), (2.6, 2.6, 0.8), p=4, cuts=2)
    g.lathe([(0.1, 0), (3.4, 0.4), (0.1, 3.4)], (x, y, z + 5.2), segs=4)
    rig.part(joint, g, iron, finish="metal", outline=0.4)
    g = Geo().blob((x, y, z + 0.6), (2.4, 2.4, 3.6), p=3.0)
    rig.part(joint, g, glow=glow_hex, outline=0)
    g = Geo().blob((x, y - 1.6, z + 0.2), (1.0, 1.0, 1.8), p=2.0)
    rig.part(joint, g, glow=core, outline=0)
