"""Shape kit for the format 2 scenes: vegetation and architecture with the toon look (chunky, rounded,
slightly tapered; A11 and the UI art sheet 3.4). All shapes are authored in lane lu (x right, y depth
away from the camera, z up) and appended to `Geo` objects that `Parts` groups by material.

Light comes from above and in front with no side component, so a vertical face is lit only when it
faces the camera within about 30 degrees: buildings turned 12-25 degrees show a lit front and a
shaded side, which is what gives the strips their volume.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.common import _jitter, box, cyl, rock


class Parts:
    """Geometry grouped by material: `g(color, finish, outline)` returns the Geo for that material;
    `flush(st)` adds every group to the stage as one part (one material, one hull)."""

    def __init__(self):
        self.groups = {}
        self.order = []

    def g(self, color, finish="matte", outline=0.5, glow=False, highlight=True):
        key = (color, finish, outline, glow, highlight)
        if key not in self.groups:
            self.groups[key] = Geo()
            self.order.append(key)
        return self.groups[key]

    def flush(self, st):
        for key in self.order:
            color, finish, outline, glow, highlight = key
            geo = self.groups[key]
            if not geo.bm.verts:
                geo.bm.free()
                continue
            if glow:
                st.part(geo, None, glow=("#%06X" % color) if isinstance(color, int) else color)
            else:
                st.part(geo, color, outline=outline, finish=finish, highlight=highlight)
        self.groups.clear()
        self.order.clear()


def rot_xy(x, y, cx, cy, deg):
    a = math.radians(deg)
    dx, dy = x - cx, y - cy
    return cx + dx * math.cos(a) - dy * math.sin(a), cy + dx * math.sin(a) + dy * math.cos(a)


# -- vegetation -----------------------------------------------------------------------------------
def cypress(g, gt, x, y, h, r, seed=0, z=0.0):
    """A tall flame-shaped cypress: a lumpy lathe with a short trunk."""
    rnd = random.Random(seed)
    g.bm.verts.ensure_lookup_table()
    n0 = len(g.bm.verts)
    prof = [(0, 0), (r * 0.55, h * 0.03), (r * 0.98, h * 0.2), (r, h * 0.36), (r * 0.82, h * 0.58), (r * 0.5, h * 0.8),
            (r * 0.16, h * 0.96), (0, h)]
    g.lathe(prof, (x, y, z + h * 0.06), (x + rnd.uniform(-0.04, 0.04) * h, y, z + h * 1.06), segs=10)
    _jitter(g, n0, (x, y, z + h * 0.5), 0.07, seed, 0.16)
    gt.capsule((x, y + 1, z), (x, y + 1, z + h * 0.12), r * 0.16)


def olive(gc, gt, x, y, s, seed=0, z=0.0, spread=1.0):
    """An olive tree: a short gnarled forked trunk and a rounded, silvery canopy of overlapping lumps
    (a lower row and a crown)."""
    rnd = random.Random(seed)
    lean = rnd.uniform(-0.3, 0.3)
    a = (x, y + 2, z)
    b = (x + lean * 7 * s, y + 2, z + 9 * s)
    gt.capsule(a, b, 2.4 * s, 1.8 * s)
    for side in (-1, 1):
        c = (b[0] + side * rnd.uniform(4, 6.5) * s, y + 2, b[2] + rnd.uniform(5, 7.5) * s)
        gt.capsule(b, c, 1.6 * s, 1.0 * s)
    gc.bm.verts.ensure_lookup_table()
    n0 = len(gc.bm.verts)
    low = 3 + rnd.randint(0, 1)
    for k in range(low):
        t = k / max(1, low - 1)
        cx = x + (t - 0.5) * 24 * s * spread + rnd.uniform(-2, 2) * s
        gc.blob((cx, y + rnd.uniform(-3, 2), z + 17 * s + rnd.uniform(-1.5, 1.5) * s),
                (rnd.uniform(8, 10) * s, 7 * s, rnd.uniform(6, 7.5) * s), p=2.0, cuts=3)
    for k in range(2):
        cx = x + (k - 0.5) * 11 * s * spread + rnd.uniform(-2, 2) * s
        gc.blob((cx, y + rnd.uniform(-2, 2), z + 24 * s + rnd.uniform(-1, 1.5) * s),
                (rnd.uniform(7, 9) * s, 6.5 * s, rnd.uniform(5.5, 7) * s), p=2.0, cuts=3)
    _jitter(gc, n0, (x, y, z + 20 * s), 0.09, seed + 7, 0.25 / s)


def round_bush(g, x, y, r, seed=0, z=0.0, flat=0.75):
    rnd = random.Random(seed)
    g.bm.verts.ensure_lookup_table()
    n0 = len(g.bm.verts)
    for k in range(3):
        g.blob((x + (k - 1) * r * 0.7 + rnd.uniform(-1, 1), y + rnd.uniform(-2, 2), z + r * flat * (0.9 + 0.25 * (k == 1))),
               (r * rnd.uniform(0.6, 0.8), r * 0.6, r * flat * rnd.uniform(0.75, 0.95)), p=2.0, cuts=3)
    _jitter(g, n0, (x, y, z + r * 0.6), 0.08, seed, 0.3 / max(1.0, r * 0.1))


def broadleaf(gc, gt, x, y, h, r, seed=0, z=0.0):
    """A round deciduous tree: trunk and a 3-5 blob canopy (one bigger crown blob on top)."""
    rnd = random.Random(seed)
    gt.capsule((x, y + 1, z), (x + rnd.uniform(-2, 2), y + 1, z + h * 0.5), r * 0.14, r * 0.1)
    gc.bm.verts.ensure_lookup_table()
    n0 = len(gc.bm.verts)
    for k in range(4):
        a = k * 1.7 + rnd.uniform(0, 0.6)
        gc.blob((x + math.cos(a) * r * 0.45, y + math.sin(a) * r * 0.3, z + h * 0.62 + math.sin(a * 1.3) * r * 0.25),
                (r * rnd.uniform(0.55, 0.7),) * 2 + (r * rnd.uniform(0.5, 0.62),), p=2.0, cuts=3)
    gc.blob((x, y, z + h * 0.8), (r * 0.62, r * 0.55, r * 0.55), p=2.0, cuts=3)
    _jitter(gc, n0, (x, y, z + h * 0.7), 0.07, seed, 0.25 / max(1.0, r * 0.06))


# -- architecture ---------------------------------------------------------------------------------
def steps(g, x, y, z, w, d, n, rise, run, yaw=0.0):
    """A stepped platform (stylobate): n slabs, each `run` smaller per side, `rise` high."""
    for i in range(n):
        box(g, (x, y, z + rise * (i + 0.5)), (w / 2 - run * i, d / 2 - run * i * 0.6, rise / 2), p=7, rot=(0, 0, yaw), cuts=2)
    return z + rise * n


def column(g_shaft, g_cap, x, y, z0, h, r, flutes=False):
    """A Doric column: a tapered shaft (entasis), an echinus and a square abacus."""
    prof = [(0, 0), (r * 1.02, 0), (r * 1.04, h * 0.3), (r * 0.94, h * 0.75), (r * 0.82, h * 0.93), (0.01, h * 0.93)]
    g_shaft.lathe(prof, (x, y, z0), (x, y, z0 + h), segs=12)
    g_cap.lathe([(0, 0), (r * 0.82, 0), (r * 1.25, h * 0.045), (r * 1.25, h * 0.06), (0, h * 0.06)],
                (x, y, z0 + h * 0.93), (x, y, z0 + h * 0.99), segs=12)
    box(g_cap, (x, y, z0 + h * 1.005), (r * 1.4, r * 1.4, h * 0.03), p=6, cuts=1)


def temple(P, x, y, z, w, d, h, cols, yaw=0.0, stone=0xE2DACB, roof=0xA9836B, trim=0xCBBFA8, dark=0x6A5566,
           steps_n=3, outline=0.5, pediment=True, cella=True):
    """A Doric temple on a stepped stylobate: a front row of columns (and the first side columns when
    turned), a frieze with triglyph marks, a pediment and a tiled roof. Returns the top z of the roof."""
    gs = P.g(stone, outline=outline)
    gc = P.g(trim, outline=outline)
    gd = P.g(dark, outline=0.0, highlight=False)
    gr = P.g(roof, outline=outline)
    rise, run = h * 0.035, h * 0.05
    top = steps(gc, x, y, z, w + run * 4, d + run * 4, steps_n, rise, run, yaw)
    ch = h * 0.62
    r = min(w / (cols * 2.0 + 1) * 0.55, h * 0.06)
    # the cella wall, dark between the columns (the shaded interior reads as depth)
    if cella:
        box(gd, (x, y + d * 0.1, top + ch * 0.5), (w / 2 - r * 2.2, d / 2 - r * 2, ch * 0.5), p=6, rot=(0, 0, yaw), cuts=2)
    span = w - r * 2.6
    for i in range(cols):
        cx = x - span / 2 + span * i / max(1, cols - 1)
        px, py = rot_xy(cx, y - d / 2 + r * 1.3, x, y, yaw)
        column(gs, gc, px, py, top, ch, r)
    # side colonnade: two columns down the turned side
    if abs(yaw) > 4:
        sx = x + (span / 2 if yaw < 0 else -span / 2)
        for j in (1, 2, 3):
            px, py = rot_xy(sx, y - d / 2 + r * 1.3 + j * (d - r * 2.6) / 3, x, y, yaw)
            column(gs, gc, px, py, top, ch, r)
    et = top + ch
    eh = h * 0.13
    box(gc, (x, y, et + eh * 0.5), (w / 2 + r * 0.3, d / 2 + r * 0.3, eh * 0.5), p=6, rot=(0, 0, yaw), cuts=2)
    # triglyph marks on the frieze (dark slots on the camera face)
    n = cols * 2 - 1
    for i in range(n):
        tx = x - (w / 2) + w * (i + 0.5) / n
        px, py = rot_xy(tx, y - d / 2 - r * 0.32, x, y, yaw)
        box(gd, (px, py, et + eh * 0.62), (r * 0.28, 0.5, eh * 0.24), p=4, rot=(0, 0, yaw), cuts=1)
    rt = et + eh
    ph = h * 0.2
    if pediment:
        # the pediment: a triangular gable, and two roof slopes behind it
        pts = [(x - w / 2 - r * 0.6, rt), (x + w / 2 + r * 0.6, rt), (x, rt + ph)]
        g = P.g(stone, outline=outline)
        g.slab([(px_, pz_) for px_, pz_ in pts], y - d / 2 + 1.5, 3.0, rot=(0, 0, yaw), origin=(x, y, rt))
        inner = [(x - w / 2 + r * 1.2, rt + ph * 0.12), (x + w / 2 - r * 1.2, rt + ph * 0.12), (x, rt + ph * 0.8)]
        gd.slab(inner, y - d / 2 - 0.4, 1.0, rot=(0, 0, yaw), origin=(x, y, rt))
        for side in (-1, 1):
            # one slope: a thin box tilted along the gable (the left one rises to the right)
            ang = math.degrees(math.atan2(ph, w / 2)) * side
            box(gr, (x + side * w * 0.25, y + 2, rt + ph * 0.5), (w * 0.28 + r, d / 2 + r * 0.6, ph * 0.12), p=5,
                rot=(0, ang, yaw), cuts=2)
    return rt + ph


def tholos(P, x, y, z, rad, h, cols=8, stone=0xE2DACB, roof=0xA9836B, trim=0xCBBFA8, dark=0x6A5566, outline=0.5):
    """A round temple: a circular stepped base, a ring of columns round a dark drum, a conical roof."""
    gs, gc, gd, gr = P.g(stone, outline=outline), P.g(trim, outline=outline), P.g(dark, outline=0.0, highlight=False), \
        P.g(roof, outline=outline)
    for i in range(3):
        cyl(gc, (x, y, z + i * h * 0.035), (x, y, z + (i + 1) * h * 0.035), rad * (1.16 - i * 0.05), bevel=0.4, segs=24)
    top = z + h * 0.105
    ch = h * 0.58
    cyl(gd, (x, y, top), (x, y, top + ch), rad * 0.72, bevel=0.3, segs=20)
    r = rad * 0.12
    for k in range(cols):
        a = math.pi * 2 * k / cols + math.pi / cols
        px, py = x + math.cos(a) * rad * 0.95, y + math.sin(a) * rad * 0.95
        if py > y + rad * 0.5:
            continue   # hidden behind the drum
        column(gs, gc, px, py, top, ch, r)
    cyl(gc, (x, y, top + ch), (x, y, top + ch + h * 0.1), rad * 1.06, bevel=0.6, segs=24)
    gr.lathe([(0, 0), (rad * 1.14, 0), (rad * 0.7, h * 0.14), (rad * 0.2, h * 0.24), (0, h * 0.26)],
             (x, y, top + ch + h * 0.1), (x, y, top + ch + h * 0.36), segs=24)
    return top + ch + h * 0.36


def cube_house(P, x, y, z, w, h, d, yaw=0.0, wall=0xE8E2D4, roof=None, dark=0x6A5566, door=True, windows=1,
               outline=0.5, seed=0):
    """A whitewashed cube house: flat roof with a parapet lip, or a low tiled roof; a door and windows
    as dark slots on the camera face."""
    rnd = random.Random(seed)
    gw = P.g(wall, outline=outline)
    gd = P.g(dark, outline=0.0, highlight=False)
    box(gw, (x, y, z + h / 2), (w / 2, d / 2, h / 2), p=8, rot=(0, 0, yaw), cuts=2)
    if roof is None:
        box(gw, (x, y, z + h + 0.8), (w / 2 + 0.6, d / 2 + 0.6, 1.0), p=6, rot=(0, 0, yaw), cuts=1)
    else:
        gr = P.g(roof, outline=outline)
        gr.lathe([(0, 0), (w * 0.72, 0), (0.4, h * 0.42), (0, h * 0.44)], (x, y, z + h), (x, y, z + h * 1.44), segs=4,
                 rot=(0, 0, 45 + yaw), squash=(1.0, d / w))
    fy = y - d / 2 - 0.3
    if door:
        dx = x + rnd.uniform(-0.25, 0.25) * w
        px, py = rot_xy(dx, fy, x, y, yaw)
        box(gd, (px, py, z + h * 0.24), (w * 0.09, 0.6, h * 0.24), p=5, rot=(0, 0, yaw), cuts=1)
    for i in range(windows):
        wx = x + (i - (windows - 1) / 2) * w * 0.36 + rnd.uniform(-1, 1)
        px, py = rot_xy(wx, fy, x, y, yaw)
        box(gd, (px, py, z + h * 0.68), (w * 0.065, 0.6, h * 0.09), p=5, rot=(0, 0, yaw), cuts=1)
    return (x, fy, z + h * 0.68)


def dry_wall(g, x0, x1, y, z, h, seed=0, block=9.0):
    """A dry-stone wall: one course of rounded blocks of varying size."""
    rnd = random.Random(seed)
    x = x0
    while x < x1:
        bw = block * rnd.uniform(0.7, 1.3)
        rock(g, (x + bw / 2, y, z + h / 2), (bw / 2 + 0.6, h * 0.45, h / 2), seed=seed + int(x), jag=0.1, p=3.0, cuts=2)
        x += bw
    return g


def stairs(g, x, y, z0, z1, w, run, yaw=0.0):
    """A straight stair from z0 up to z1 (toward +y): thin slabs."""
    n = max(2, int((z1 - z0) / 2.6))
    for i in range(n):
        t = i / n
        sx, sy = rot_xy(x, y + t * run, x, y, yaw)
        box(g, (sx, sy, z0 + (z1 - z0) * t + 1.0), (w / 2, run / n * 0.6 + 0.6, 1.2), p=6, rot=(0, 0, yaw), cuts=1)


def hill(g, x, y, z, rx, ry, h, seed=0, jag=0.06, p=2.4):
    """A rounded hill (a lumpy half-blob below z, so its foot is hidden)."""
    rock(g, (x, y, z), (rx, ry, h), seed=seed, jag=jag, p=p, cuts=4)
    return g


# -- round 2 kit: winter, coast, tropics, desert, city, space --------------------------------------
class StaticRig:
    """Lets a prop builder (`fauna.*`) draw into a strip's `Parts` as static geometry: every part is moved
    by `offset` (scaled by `s` about the builder's origin, mirrored with `flip`) and merged into the
    part group of its colour. Joints are ignored (the rest pose is drawn)."""

    def __init__(self, pt, offset, s=1.0, flip=False):
        self.pt = pt
        self.offset = offset
        self.s = s
        self.flip = flip

    def joint(self, name, parent, pos, **k):
        return name

    def part(self, joint, geo, fill=None, team=False, glow=None, outline=0.5, finish="matte", highlight=True, **k):
        if glow:
            g = self.pt.g(int(glow.lstrip("#"), 16), glow=True)
        else:
            c = int(fill.lstrip("#"), 16) if isinstance(fill, str) else fill
            g = self.pt.g(c, finish=finish, outline=outline, highlight=highlight)
        geo.bm.verts.ensure_lookup_table()
        ox, oy, oz = self.offset
        for v in geo.bm.verts:
            x, y, z = v.co
            v.co = ((-x if self.flip else x) * self.s + ox, y * self.s + oy, z * self.s + oz)
        if self.flip:
            import bmesh
            bmesh.ops.reverse_faces(geo.bm, faces=geo.bm.faces[:])
        _merge(g, geo)


def _merge(g, tmp):
    """Appends the geometry of the Geo `tmp` to `g` (and frees it)."""
    from mathutils import Matrix
    g._add_bm(tmp.bm, Matrix.Identity(4))
    return g


def snow_cap(g_snow, center, radii, seed=0, jag=0.16, p=2.3, cut=None, grow=1.035, cuts=4):
    """Snow lying on a `rock(center, radii, seed, jag, p)`: the same lumpy shape a touch bigger, cut off
    below `cut` (world z; default the upper 40%), so the cap follows the rock and ends in a wavy edge."""
    from ageborn_art.geometry import Geo
    tmp = Geo()
    rock(tmp, center, (radii[0] * grow, radii[1] * grow, radii[2] * grow), seed=seed, jag=jag, p=p, cuts=cuts)
    z = cut if cut is not None else center[2] + radii[2] * 0.2
    tmp.clip((center[0], center[1], z), (0, 0, -1))
    return _merge(g_snow, tmp)


def annulus(g, center, r0, r1, thick, rot=(0.0, 0.0, 0.0), segs=96):
    """A flat ring (a planet's ring, a habitat wheel's rim) as an open annulus: top, bottom, inner and
    outer faces, no caps across its hole (a lathe would close it into a disc). Built round +z, then
    turned by `rot` (degrees, XYZ) about its centre."""
    from mathutils import Euler, Matrix, Vector
    verts, faces = [], []
    for k in range(segs):
        a = 2 * math.pi * k / segs
        c, s_ = math.cos(a), math.sin(a)
        verts += [(r0 * c, r0 * s_, -thick / 2), (r1 * c, r1 * s_, -thick / 2), (r1 * c, r1 * s_, thick / 2), (r0 * c, r0 * s_, thick / 2)]
    for k in range(segs):
        a, b = 4 * k, 4 * ((k + 1) % segs)
        faces += [[a + 3, a + 2, b + 2, b + 3], [a, b, b + 1, a + 1], [a + 1, b + 1, b + 2, a + 2], [a, a + 3, b + 3, b]]
    m = Matrix.Translation(Vector(center)) @ Euler(tuple(math.radians(v) for v in rot), "XYZ").to_matrix().to_4x4()
    g._add(verts, faces, m, smooth=True)
    return g


def tube_ring(g, center, R, r, rot=(0.0, 0.0, 0.0), segs=36):
    """A torus as a ring of short capsules (a habitat wheel), turned by `rot` (degrees, XYZ)."""
    from mathutils import Euler, Vector
    e = Euler(tuple(math.radians(v) for v in rot), "XYZ").to_matrix()
    pts = [Vector(center) + e @ Vector((R * math.cos(2 * math.pi * k / segs), R * math.sin(2 * math.pi * k / segs), 0)) for k in range(segs)]
    for k in range(segs):
        g.capsule(tuple(pts[k]), tuple(pts[(k + 1) % segs]), r, segs=10, rings=3)
    return g


def loft_point(rows, t, u):
    """A point on a lofted surface (see `loft`): t along the rows (0 = nearest), u across (-1..1)."""
    i = max(0, min(len(rows) - 2, int(math.floor(t))))
    f = max(0.0, min(1.0, t - i))
    a, b = rows[i], rows[i + 1]
    cx, y, z, hw, bu = (a[k] + (b[k] - a[k]) * f for k in range(5))
    return (cx + u * hw, y, z + bu * (1 - u * u))


def loft(g, rows, nu=14, thick=12.0):
    """A lofted solid (a glacier's ice, a snowfield): rows from near to far, each (cx, y, z, half width,
    bulge); the top bulges across each row by (1 - u^2), the solid is `thick` lu deep. Normals are made
    to point outward."""
    import bmesh
    from mathutils import Matrix
    verts, faces = [], []
    W = nu + 1
    n = len(rows)
    for top in (True, False):
        for (cx, y, z, hw, bu) in rows:
            for j in range(W):
                u = -1 + 2 * j / nu
                verts.append((cx + u * hw, y, z + bu * (1 - u * u) if top else z - thick))
    B = n * W
    for i in range(n - 1):
        for j in range(nu):
            a = i * W + j
            faces.append([a, a + 1, a + W + 1, a + W])
            faces.append([B + a + W, B + a + W + 1, B + a + 1, B + a])
    for i in range(n - 1):
        for j in (0, nu):
            a = i * W + j
            faces.append([a, a + W, B + a + W, B + a])
    for i in (0, n - 1):
        for j in range(nu):
            a = i * W + j
            faces.append([a, a + 1, B + a + 1, B + a])
    g.bm.faces.ensure_lookup_table()
    f0 = len(g.bm.faces)
    g._add(verts, faces, Matrix.Identity(4), smooth=True)
    g.bm.faces.ensure_lookup_table()
    bmesh.ops.recalc_face_normals(g.bm, faces=list(g.bm.faces[f0:]))
    return g
def peak(g_rock, g_snow, x, y, z, rx, h, seed=0, snow=0.55, jag=0.16, segs=12, squash=0.55, lean=0.0):
    """A sharp mountain peak (a lathed cone with a shoulder, lumpy) with a snow cap over its upper part:
    the cap is the same cone a little wider above the snowline, jittered by the same noise, so it
    follows the rock's lumps and ends in a wavy snowline. `snow` is the snowline as a share of the
    height (1 = no snow)."""
    rnd = random.Random(seed)
    prof = [(0, 0), (rx, 0), (rx * 0.6, h * 0.42), (rx * rnd.uniform(0.18, 0.28), h * 0.88), (rx * 0.05, h), (0, h * 1.01)]
    top = (x + lean * h, y, z + h)
    yaw = rnd.uniform(0, 30)
    for g, grow, z0 in ((g_rock, 1.0, 0.0), (g_snow, 1.045, snow)):
        if g is None or z0 >= 1.0:
            continue
        g.bm.verts.ensure_lookup_table()
        n0 = len(g.bm.verts)
        if z0 > 0:
            # the cap: the cone above the snowline, a touch wider
            p2 = []
            for (r, hz), (r2, hz2) in zip(prof, prof[1:]):
                if hz2 < h * z0:
                    continue
                if hz < h * z0 <= hz2:
                    t = (h * z0 - hz) / max(1e-6, hz2 - hz)
                    p2.append((0, h * z0 - 0.5))
                    p2.append(((r + (r2 - r) * t) * grow, h * z0))
                p2.append((r2 * grow, hz2))
            pr = p2
        else:
            pr = prof
        g.lathe(pr, (x, y, z), top if lean else None, segs=segs, rot=(0, 0, 0) if lean else (0, 0, yaw), squash=(1.0, squash))
        _jitter(g, n0, (x, y, z + h * 0.4), jag * 0.6, seed, 2.2 / max(1.0, rx * 0.5))
    return g


def spruce(g_green, g_snow, gt, x, y, h, r, seed=0, z=0.0, tiers=4, snow=True):
    """A snow-laden spruce: drooping tiers of dark needles, each with a white cap over its upper part
    (the cap is the tier's cone, a little wider and starting a third of the way up), on a short trunk."""
    rnd = random.Random(seed)
    gt.capsule((x, y + 1, z), (x, y + 1, z + h * 0.18), r * 0.12)
    for k in range(tiers):
        t = k / max(1, tiers - 1)
        rr = r * (1.0 - 0.62 * t) * rnd.uniform(0.92, 1.06)
        z0 = z + h * (0.12 + 0.2 * k * (4.0 / tiers))
        th = h * (0.36 - 0.03 * k)
        if k == tiers - 1:
            th = (z + h) - z0
        g_green.lathe([(0, 0), (rr, -th * 0.06), (rr * 0.5, th * 0.4), (rr * 0.07, th * 0.95), (0, th)], (x, y, z0), (x, y, z0 + th), segs=9,
                      rot=(0, 0, rnd.uniform(0, 40)))
        if not snow:
            continue
        if k == tiers - 1:
            # the top: a white tip
            g_snow.lathe([(0, th * 0.55), (rr * 0.36, th * 0.55), (rr * 0.1, th * 0.92), (0, th * 1.04)], (x, y - 0.3, z0), (x, y - 0.3, z0 + th),
                         segs=9)
            continue
        # snow lying on the tier: a few soft lumps on its upper slope, more on the side facing the sky
        for j in range(3):
            a = math.radians(rnd.uniform(-170, -10))
            u = rnd.uniform(0.28, 0.5)
            rad = rr * (1.0 - u * 0.98) + rr * 0.04
            g_snow.blob((x + math.cos(a) * rad, y + math.sin(a) * rad * 0.9, z0 + th * u + th * 0.04),
                        (rr * rnd.uniform(0.3, 0.42), rr * 0.26, th * 0.1), p=2.0, rot=(0, math.degrees(math.atan2(-math.cos(a) * th, rr)) * 0.5, 0))
    return g_green


def hide_tent(P, x, y, z, r, h, hide=0xA88A6A, pole=0x6E5A48, dark=0x3A302A, seed=0, yaw=0.0):
    """A hide tent: a cone of stitched hides with the poles crossing above its tip and a dark door flap."""
    rnd = random.Random(seed)
    gh = P.g(hide, outline=0.5)
    gp = P.g(pole, outline=0.3)
    gd = P.g(dark, outline=0.0, highlight=False)
    gh.lathe([(0, 0), (r, 0), (r * 0.55, h * 0.45), (r * 0.12, h * 0.92), (0, h * 0.94)], (x, y, z), (x, y, z + h * 0.94), segs=10,
             rot=(0, 0, yaw))
    for k in range(4):
        a = math.radians(yaw + 45 + k * 90 + rnd.uniform(-10, 10))
        gp.capsule((x + math.cos(a) * r * 0.1, y + math.sin(a) * r * 0.1, z + h * 0.86),
                   (x - math.cos(a) * r * 0.22, y - math.sin(a) * r * 0.22, z + h * 1.18), 0.7)
    # the door: a dark triangle on the camera side
    gd.slab([(x - r * 0.2, z + 0.4), (x + r * 0.24, z + 0.4), (x + 0.6, z + h * 0.42)], y - r * 0.8, 1.2)
    return (x, y - r * 0.8, z + h * 0.2)


def drying_rack(P, x, y, z, w, h, wood=0x6E5A48, hide=0xB09070, hide2=0x8C7058):
    """Two A-frame posts with a crossbar and hides hanging from it."""
    gw = P.g(wood, outline=0.4)
    for sx in (-w / 2, w / 2):
        gw.capsule((x + sx - 3, y, z), (x + sx, y, z + h), 0.9)
        gw.capsule((x + sx + 3, y, z), (x + sx, y, z + h), 0.9)
    gw.capsule((x - w / 2 - 2, y, z + h - 1), (x + w / 2 + 2, y, z + h - 1), 0.8)
    for k, c in enumerate((hide, hide2, hide)):
        hx = x - w / 2 + w * (k + 0.5) / 3
        P.g(c, outline=0.4).blob((hx, y - 0.8, z + h - 1 - h * 0.24), (w / 7.2, 1.0, h * 0.24), p=3.0, taper=(0.75, 1.0))


def icicles(g, x0, x1, y, z_top, length, seed=0, n=None):
    """A row of hanging icicles under a ledge: tapered spikes of uneven length."""
    rnd = random.Random(seed)
    n = n or max(2, int((x1 - x0) / 3.2))
    for i in range(n):
        x = x0 + (x1 - x0) * (i + rnd.uniform(0.2, 0.8)) / n
        L = length * rnd.uniform(0.35, 1.0)
        g.lathe([(0.01, 0), (1.2 + L * 0.08, 0), (0.01, -L)], (x, y, z_top), None, segs=6)
    return g


def frond(g, top, a, L, w, segs=4):
    """A palm frond from `top`: a broad leaf arching out at angle `a` (about z) and drooping, built from
    flattened lobes along its curve, widest a third of the way out."""
    dx, dy = math.cos(a), math.sin(a) * 0.6
    prev = top
    for j in range(segs):
        t = (j + 1) / segs
        droop = -(t ** 1.8) * L * 0.55 + t * L * 0.18
        p = (top[0] + dx * L * t, top[1] + dy * L * t, top[2] + droop)
        mx, my, mz = (prev[0] + p[0]) / 2, (prev[1] + p[1]) / 2, (prev[2] + p[2]) / 2
        hx, hy, hz = p[0] - prev[0], p[1] - prev[1], p[2] - prev[2]
        seg = math.sqrt(hx * hx + hy * hy + hz * hz)
        elev = math.degrees(math.atan2(hz, math.hypot(hx, hy)))
        yaw = math.degrees(math.atan2(hy, hx))
        ww = w * (0.75 + 0.6 * math.sin(math.pi * min(1.0, (t - 0.5 / segs) * 1.3)))
        g.blob((mx, my, mz), (seg * 0.62, ww, max(0.6, w * 0.16)), p=2.0, rot=(0, -elev, yaw))
        prev = p
    return g


def palm(gf, gf2, gt, x, y, h, lean=0.25, seed=0, z=0.0, fronds=7, r=1.0):
    """A palm: a curved, ringed trunk leaning to one side and a crown of drooping fronds (each a long
    tapered leaf arching out and down), with a few coconuts."""
    rnd = random.Random(seed)
    pts = []
    for k in range(6):
        t = k / 5
        pts.append((x + lean * h * t * t, y, z + h * t))
    for (ax, ay, az), (bx, by, bz) in zip(pts, pts[1:]):
        gt.capsule((ax, ay, az), (bx, by, bz), 2.4 * r * (1.1 - 0.3 * (az - z) / h), 2.2 * r * (1.1 - 0.3 * (bz - z) / h))
    top = pts[-1]
    for k in range(fronds):
        a = 2 * math.pi * k / fronds + rnd.uniform(-0.2, 0.2)
        L = h * rnd.uniform(0.42, 0.55) * r
        frond(gf if k % 2 else gf2, top, a, L, L * 0.13)
    gc = gt
    for k in range(3):
        a = k * 2.1
        gc.sphere((top[0] + math.cos(a) * 2.2 * r, top[1] - 1 + math.sin(a) * 1.4, top[2] - 2.6 * r), 1.6 * r, cuts=2)
    return top


# -- round 3 kit: volcano, birch, waterfall, standing stones, camp details ----------------------------
def _wavy(g, n0, z0, amp, seed, cx, cy, tol=0.6, freq=3.0):
    """Moves the vertices added since n0 that lie at height z0 (a lathe's ring) up and down by a smooth
    seeded noise round the axis (cx, cy): a ragged edge instead of a ruled line."""
    rnd = random.Random(seed)
    waves = [(rnd.uniform(0.6, 1.4) * freq * (k + 1), rnd.uniform(0, 6.28)) for k in range(3)]
    g.bm.verts.ensure_lookup_table()
    for v in g.bm.verts[n0:]:
        if abs(v.co.z - z0) > tol:
            continue
        a = math.atan2(v.co.y - cy, v.co.x - cx)
        v.co.z += amp * sum(math.sin(a * f + ph) / (k + 1) for k, (f, ph) in enumerate(waves)) / 1.83


def volcano(P, x, y, z, R, H, seed=0, crater=0.12, squash=0.62, body=0x8C7B68, ash=0x9A928C, rib=0x5E5248, snow=0xEEF0EE,
            foot=None, forest=None, glow=0xF0A060, glow_hi=0xFFD8A0, outline=0.0, ribs=3, streaks=4, notch=0.38, trees=64):
    """A stratovolcano: concave flanks (radius falling off as (1 - t)^1.8, so the top is steep and the foot
    broad), a green foot (`foot` colour) whose treeline climbs the gullies in ragged tongues, the body in
    stone brown, an ash cap with a ragged lower edge round a small crater whose near lip dips (a notch) so
    the glow of the lava lake on the far inner wall shows above it, a few broad lava tongues down the
    front, short snow patches in the high gullies, and small conifers along the treeline. `forest` =
    (green, green_dk, trunk) colours or None. Returns the crater centre at the rim's height."""
    rnd = random.Random(seed)
    cr = R * crater

    def rad(t):
        return cr * 1.05 + (R - cr * 1.05) * (1.0 - t) ** 1.8

    def surf(t, a, lift=0.0):
        r = rad(t) + lift
        return (x + r * math.cos(a), y + r * math.sin(a) * squash, z + H * t)

    front = -math.pi / 2
    # the summit: a ragged lip round a shallow floor (the lava lake sits on it; from the game's low camera
    # only its far half shows, as a glowing crescent above the near lip)
    rim = [(cr * 0.98, H * 0.999), (cr * 0.9, H * 0.986), (0.01, H * 0.986)]
    # radial erosion ridges: the radius swells and dips round the cone (strongest mid-slope), so the toon
    # light draws lit spurs and shaded gullies down the flanks
    ph = [rnd.uniform(0, 6.28) for _ in range(3)]

    def kfac(a, t, amp=0.1):
        w = math.sin(math.pi * min(1.0, max(0.0, t) / 0.96)) ** 0.7
        rr = (0.55 * math.sin(9 * a + ph[0]) + 0.3 * math.sin(17 * a + ph[1]) + 0.4 * math.sin(4 * a + ph[2])) / 1.25
        return 1.0 + amp * rr * w

    def ridged(geo, n_from):
        geo.bm.verts.ensure_lookup_table()
        for v in geo.bm.verts[n_from:]:
            dx, dy = v.co.x - x, (v.co.y - y) / squash
            if dx * dx + dy * dy < 1.0:
                continue
            a = math.atan2(dy, dx)
            k = kfac(a, (v.co.z - z) / H)
            v.co.x = x + dx * k
            v.co.y = y + dy * k * squash

    def wave(a, sd, f):
        r2 = random.Random(sd)
        ws = [(r2.uniform(0.6, 1.4) * f * (j + 1), r2.uniform(0, 6.28)) for j in range(3)]
        return sum(math.sin(a * fr + p_) / (j + 1) for j, (fr, p_) in enumerate(ws)) / 1.83

    def skin(geo, t_lo, t_hi, off, segs=96, rings=10):
        """A shell lying on the ridged cone `off` lu out, between per-angle heights t_lo(a) and t_hi(a)
        (fractions of H): a cap or a foot with a ragged edge that never sticks out of the silhouette."""
        verts, faces = [], []
        for i in range(rings + 1):
            for j in range(segs):
                a = 2 * math.pi * j / segs
                lo, hi = t_lo(a), t_hi(a)
                t = lo + (hi - lo) * i / rings
                r = (rad(t) + off) * kfac(a, t)
                verts.append((x + r * math.cos(a), y + r * math.sin(a) * squash, z + H * t))
        for i in range(rings):
            for j in range(segs):
                j2 = (j + 1) % segs
                faces.append([i * segs + j, i * segs + j2, (i + 1) * segs + j2, (i + 1) * segs + j])
        from mathutils import Matrix
        geo._add(verts, faces, Matrix.Identity(4), smooth=True)

    front = -math.pi / 2
    # the summit: a ragged lip round a shallow floor (the lava lake sits on it; from the game's low camera
    # only its far half shows, as a glowing crescent above the near lip)
    rim = [(cr * 0.98, H * 0.999), (cr * 0.9, H * 0.986), (0.01, H * 0.986)]
    # the body: the whole cone in stone brown
    g = P.g(body, outline=outline)
    g.bm.verts.ensure_lookup_table()
    n0 = len(g.bm.verts)
    g.lathe([(rad(k / 24), H * k / 24 * 0.995) for k in range(25)] + rim, (x, y, z), None, segs=96, squash=(1.0, squash))
    ridged(g, n0)
    # the near lip dips: the notch
    g.bm.verts.ensure_lookup_table()
    for v in g.bm.verts[n0:]:
        if v.co.z > z + H * 0.9:
            a = math.atan2((v.co.y - y) / squash, v.co.x - x)
            da = abs(((a - front + math.pi) % (2 * math.pi)) - math.pi)
            v.co.z -= H * 0.035 * math.exp(-(da / notch) ** 2)
    _wavy(g, n0, z + H * 0.999, H * 0.03, seed + 11, x, y, tol=H * 0.02, freq=2.5)
    # the ash cap and the green foot: shells on the cone with ragged edges (ash tongues down the gullies,
    # the treeline climbing them)
    def notch_t(a):
        da = abs(((a - front + math.pi) % (2 * math.pi)) - math.pi)
        return 0.955 - 0.035 * math.exp(-(da / notch) ** 2)
    skin(P.g(ash, outline=outline, highlight=False), lambda a: 0.78 + 0.07 * wave(a, seed + 3, 2.2), notch_t, 0.45)
    if foot is not None:
        skin(P.g(foot, outline=outline, highlight=False), lambda a: 0.0, lambda a: 0.5 + 0.12 * wave(a, seed + 5, 4.0), 0.6, rings=8)
    # the lava lake on the summit floor, brighter at its heart
    P.g(glow, glow=True).blob((x, y + cr * 0.06 * squash, z + H * 0.987), (cr * 0.84, cr * 0.8 * squash, 0.9), p=2.4, cuts=3)
    P.g(glow_hi, glow=True).blob((x - cr * 0.12, y + cr * 0.3 * squash, z + H * 0.989), (cr * 0.4, cr * 0.26 * squash, 0.6), p=2.2, cuts=2)
    # old lava flows: a few soft darker tongues from below the lip, tapering to rounded ends
    gr = P.g(rib, outline=outline)
    for i in range(ribs):
        a = front + (i - (ribs - 1) / 2) * (1.5 / max(1, ribs - 1)) + rnd.uniform(-0.1, 0.1)
        t_0, t_1 = rnd.uniform(0.86, 0.93), rnd.uniform(0.5, 0.66)
        n = 7
        wob = rnd.uniform(0.6, 1.4)
        pts = [surf(t_0 + (t_1 - t_0) * j / n, a + math.sin(j * wob + i * 2.1) * 0.04, lift=0.9) for j in range(n + 1)]
        w = rnd.uniform(2.6, 3.6) * (R / 230.0)
        for j, (p0, p1) in enumerate(zip(pts, pts[1:])):
            w0 = w * (0.7 + 0.5 * math.sin(math.pi * (j + 0.5) / n))
            gr.capsule(p0, p1, max(0.9, w0), max(0.8, w0 * 0.92))
    # snow lying in the high gullies: short broad patches, more on the left (shaded) shoulder
    gs = P.g(snow, outline=0.0)
    for i in range(streaks):
        a = front - 0.9 + i * (1.5 / max(1, streaks - 1)) + rnd.uniform(-0.06, 0.06)
        if abs(a - front) < 0.25:
            a += 0.3
        t_0, t_1 = rnd.uniform(0.86, 0.92), rnd.uniform(0.7, 0.78)
        pts = [surf(t_0 + (t_1 - t_0) * j / 4, a, lift=0.8) for j in range(5)]
        for j, (p0, p1) in enumerate(zip(pts, pts[1:])):
            gs.capsule(p0, p1, (3.0 - j * 0.55) * (R / 230.0), (2.6 - j * 0.55) * (R / 230.0))
    # small conifers along the treeline (camera side)
    if forest and trees:
        gt1, gt2, gtt = P.g(forest[0], outline=0.0), P.g(forest[1], outline=0.0), P.g(forest[2], outline=0.0)
        for k in range(trees):
            a = front + rnd.uniform(-1.45, 1.45)
            t = rnd.uniform(0.3, 0.56)
            px, py, pz = surf(t, a)
            h = rnd.uniform(9.0, 15.0) * (R / 230.0)
            spruce(gt1 if k % 3 else gt2, None, gtt, px, py - 2, h, h * 0.3, seed=seed * 31 + k, z=pz - 1, tiers=3, snow=False)
    return (x, y, z + H * 0.996)


def birch(gc, gc2, gt, gm, x, y, h, r, seed=0, z=0.0, lean=0.0):
    """A birch: a slender pale trunk with dark bark marks, forking near the top into thin branches, and
    an airy canopy of small drooping blobs (two greens)."""
    rnd = random.Random(seed)
    top = (x + lean * h * 0.7, y, z + h * 0.7)
    gt.capsule((x, y, z), top, r * 0.1, r * 0.065)
    for k in range(5):
        t = 0.12 + k * 0.15 + rnd.uniform(-0.03, 0.03)
        px = x + lean * h * 0.7 * t
        gm.blob((px + rnd.uniform(-0.3, 0.3) * r * 0.06, y - r * 0.09, z + h * 0.7 * t), (r * rnd.uniform(0.05, 0.08), 0.5, r * 0.022), p=2.4)
    for side in (-1, 1):
        gt.capsule((top[0], y, top[2] - h * 0.08), (top[0] + side * r * 0.42, y + rnd.uniform(-2, 2), top[2] + h * 0.14), r * 0.045, r * 0.025)
    gc.bm.verts.ensure_lookup_table()
    for k in range(7):
        a = k * 0.9 + rnd.uniform(0, 0.5)
        cx = top[0] + math.cos(a) * r * 0.5
        cz = top[2] + h * 0.08 + math.sin(a * 1.7) * r * 0.32 + (0.2 if k == 6 else 0) * h
        (gc if k % 2 else gc2).blob((cx, y + math.sin(a) * r * 0.25, cz), (r * rnd.uniform(0.3, 0.42), r * 0.3, r * rnd.uniform(0.34, 0.44)), p=2.0, cuts=3,
                                    taper=(1.0, 0.85))


def menhir(g, x, y, z, h, w, seed=0, lean=0.0, yaw=0.0):
    """A standing stone: a tall, slightly tapering slab with weathered, lumpy faces."""
    rock(g, (x, y, z + h * 0.5), (w * 0.5, w * 0.34, h * 0.52), seed=seed, jag=0.12, p=3.2, cuts=3, rot=(0, lean, yaw))
    return (x, y, z + h)


def dolmen(g, gcap, x, y, z, w, h, seed=0):
    """Two uprights and a capstone."""
    for k, dx in enumerate((-w * 0.32, w * 0.32)):
        rock(g, (x + dx, y, z + h * 0.45), (w * 0.12, w * 0.12, h * 0.48), seed=seed + k, jag=0.1, p=3.0, cuts=2)
    rock(gcap, (x, y, z + h * 0.98), (w * 0.6, w * 0.22, h * 0.14), seed=seed + 5, jag=0.12, p=2.8, cuts=3, rot=(0, -4, 6))


def waterfall(P, x, y, z_top, z_bot, w, water=0xBCCED2, water_hi=0xDCE8EA, foam=0xEEF2F2, pool=0x9AB2B8, seed=0, pool_r=None):
    """A falling sheet of water in front of a cliff notch: a gently widening sheet (gloss), lighter streaks
    down it, foam blobs where it meets its pool, and the pool itself. Returns the sheet's mid point (for its
    shimmer prop) as (x, y, z)."""
    rnd = random.Random(seed)
    gw = P.g(water, finish="gloss", outline=0.4)
    gw.slab([(x - w * 0.42, z_top + 1.0), (x + w * 0.42, z_top + 1.0), (x + w * 0.5, z_bot), (x - w * 0.5, z_bot)], y, 3.0)
    gh = P.g(water_hi, outline=0.0, highlight=False)
    for k in range(5):
        u = (k + 0.5) / 5 - 0.5
        gh.capsule((x + u * w * 0.78, y - 1.8, z_top - 2), (x + u * w * 0.92, y - 1.8, z_bot + 3), 0.7, 0.9)
    pr = pool_r or w * 1.4
    P.g(pool, finish="gloss", outline=0.3).blob((x, y - pr * 0.3, z_bot - 1.4), (pr, pr * 0.42, 2.0), p=2.4, cuts=3)
    gf = P.g(foam, outline=0.3)
    for k in range(7):
        gf.blob((x + rnd.uniform(-0.6, 0.6) * w, y - 3 - rnd.uniform(0, 4), z_bot + rnd.uniform(0.5, 3.0)), (rnd.uniform(3, 5.5), 2.4, rnd.uniform(2.2, 3.6)), p=2.0,
                cuts=2)
    return (x, y - 1.6, (z_top + z_bot) / 2)


def firewood(g, x, y, z, n=5, L=14.0, r=1.6, seed=0):
    """A small pile of split logs."""
    rnd = random.Random(seed)
    for k in range(n):
        row = 0 if k < (n + 1) // 2 else 1
        dx = (k - (n - 1) / 2) * r * 1.9 if row == 0 else (k - (n + 1) // 2 - 0.5) * r * 1.9
        g.capsule((x + dx - L / 2, y + rnd.uniform(-1, 1), z + r + row * r * 1.7), (x + dx + L / 2, y + rnd.uniform(-1, 1), z + r + row * r * 1.7), r)


def antler_post(gw, gb, x, y, z, h):
    """A carved post crowned with a pair of antlers (a camp's marker)."""
    gw.capsule((x, y, z), (x, y, z + h), 1.6, 1.3)
    for k in range(3):
        gw.blob((x, y - 1.5, z + h * (0.3 + 0.2 * k)), (2.0, 0.6, 1.0), p=2.6)
    for side in (-1, 1):
        pts = [(x, y, z + h), (x + side * 5, y, z + h + 6), (x + side * 8, y, z + h + 13), (x + side * 7, y, z + h + 19)]
        for p0, p1 in zip(pts, pts[1:]):
            gb.capsule(p0, p1, 0.9, 0.7)
        gb.capsule((x + side * 5, y, z + h + 6), (x + side * 10, y, z + h + 8), 0.7, 0.5)
        gb.capsule((x + side * 8, y, z + h + 13), (x + side * 12, y, z + h + 15), 0.6, 0.45)


# -- round 3 kit: a hilltop castle, timber framing, a watermill ------------------------------------
def _at(cx, cy, lx, ly, yaw):
    """A local offset (lx, ly) about (cx, cy), turned by `yaw` degrees."""
    return rot_xy(cx + lx, cy + ly, cx, cy, yaw)


def merlons(g, ax, ay, bx, by, z, step=5.6, w=2.6, d=2.4, h=3.0):
    """Crenellations along a wall top from (ax, ay) to (bx, by): merlons with gaps."""
    L = math.hypot(bx - ax, by - ay)
    n = max(1, int(L / step))
    ang = math.degrees(math.atan2(by - ay, bx - ax))
    for k in range(n + 1):
        t = k / n
        box(g, (ax + (bx - ax) * t, ay + (by - ay) * t, z + h / 2), (w / 2, d / 2, h / 2), p=6, cuts=1, rot=(0, 0, ang))


def ring_merlons(g, x, y, z, r, n=10, w=2.6, h=3.0):
    """Crenellations round a tower top."""
    for k in range(n):
        a = 2 * math.pi * (k + 0.5) / n
        box(g, (x + math.cos(a) * (r - 1.2), y + math.sin(a) * (r - 1.2), z + h / 2), (w / 2, 1.2, h / 2), p=6, cuts=1,
            rot=(0, 0, math.degrees(a) + 90))


def wall(g, ax, ay, bx, by, z, h, t=7.0):
    """A straight curtain wall from (ax, ay) to (bx, by), `h` high and `t` thick, with a plinth."""
    L = math.hypot(bx - ax, by - ay)
    ang = math.degrees(math.atan2(by - ay, bx - ax))
    mx, my = (ax + bx) / 2, (ay + by) / 2
    box(g, (mx, my, z + h / 2), (L / 2, t / 2, h / 2), p=7, cuts=2, rot=(0, 0, ang))
    box(g, (mx, my, z + 1.6), (L / 2 + 0.4, t / 2 + 1.0, 1.8), p=6, cuts=1, rot=(0, 0, ang))


def round_tower(gs, groof, gd, x, y, z0, z1, r, roof=True, roof_h=None, slits=2, crown=None):
    """A round tower: a slightly battered drum, a corbelled parapet ring, then a slate cone (`roof`) or
    crenellations; arrow slits on the camera face. Returns the top point (the cone's tip or the parapet)."""
    cyl(gs, (x, y, z0), (x, y, z1), r * 1.06, r, bevel=0.8, segs=20)
    gc = crown or gs
    cyl(gc, (x, y, z1 - 1.2), (x, y, z1 + 2.4), r + 1.3, bevel=0.5, segs=20)
    for k in range(slits):
        zz = z0 + (z1 - z0) * (0.34 + 0.32 * k)
        box(gd, (x + (k - (slits - 1) / 2) * r * 0.5, y - r - 0.15, zz), (0.7, 0.6, 2.6), p=4, cuts=1)
    if roof:
        rh = roof_h or r * 2.3
        groof.lathe([(0.01, 0), (r + 2.6, 0), (r + 1.4, rh * 0.14), (r * 0.5, rh * 0.62), (0.3, rh), (0.01, rh + 0.6)],
                    (x, y, z1 + 2.2), (x, y, z1 + 2.2 + rh), segs=20)
        return (x, y, z1 + 2.2 + rh)
    ring_merlons(gc, x, y, z1 + 2.4, r + 1.3, n=max(8, int(r * 0.9)))
    return (x, y, z1 + 5.4)


def gable_roof(g, x, y, z, w, d, rh, oh=1.4, yaw=0.0, along_x=True):
    """A gable roof over a w x d footprint centred on (x, y) at height z, `rh` high: a triangular prism
    with its ridge along x (the camera sees a sloped plane) or along y (the gable end faces the camera)."""
    if along_x:
        g.slab([(x - d / 2 - oh, z), (x + d / 2 + oh, z), (x, z + rh)], y, w + 2 * oh, rot=(0, 0, 90 + yaw), origin=(x, y, 0))
    else:
        g.slab([(x - w / 2 - oh, z), (x + w / 2 + oh, z), (x, z + rh)], y, d + 2 * oh, rot=(0, 0, yaw), origin=(x, y, 0))


def castle(P, cx, cy, z, yaw=-12.0, stone=0xBDB4A2, stone_dk=0x9E9584, roof=0x6B7682, roof_dk=0x57616D, dark=0x46404A,
           banner=0x8E2A4A, trim=0xD4A437, outline=0.4):
    """A hilltop castle (round 3, Medieval classic), about 190 lu wide: a curtain wall with round corner
    towers (slate cones at the front) and a twin-towered gatehouse, a square keep with corner turrets and a
    long banner, a taller round great tower, a hall roof in the bailey; crenellations, arrow slits. The
    plan is turned by `yaw` so the fronts are lit and the sides shaded. Returns a dict with `great` and
    `keep` (cone tips, for pennants), `gate` (the gate's foot) and `windows` (points for night lights)."""
    gs, gs2 = P.g(stone, outline=outline), P.g(stone_dk, outline=outline)
    gr, gr2 = P.g(roof, outline=outline), P.g(roof_dk, outline=outline)
    gd = P.g(dark, outline=0.0, highlight=False)
    at = lambda lx, ly: _at(cx, cy, lx, ly, yaw)  # noqa: E731
    out = {"windows": []}
    # the bailey's hall (its roof shows over the front wall) and the back wall
    hx, hy = at(-6, 10)
    box(gs2, (hx, hy, z + 12), (18, 9, 12), p=7, cuts=2, rot=(0, 0, yaw))
    gable_roof(gr2, hx, hy, z + 24, 36, 18, 13, yaw=yaw)
    (bax, bay), (bbx, bby) = at(-64, 26), at(64, 26)
    wall(gs2, bax, bay, bbx, bby, z, 26)
    merlons(gs2, bax, bay, bbx, bby, z + 26)
    # the great tower (back left) and the back towers
    gx, gy = at(-42, 16)
    out["great"] = round_tower(gs, gr, gd, gx, gy, z, z + 76, 13, roof_h=26, slits=3)
    out["windows"].append((gx + 3, gy - 13.4, z + 58))
    round_tower(gs2, gr2, gd, bax, bay, z, z + 44, 10, roof=False, slits=1)
    round_tower(gs2, gr2, gd, bbx, bby, z, z + 46, 10, roof_h=22, slits=1)
    # the keep: a square donjon with corner turrets, a banner and windows
    kx, ky = at(16, 4)
    box(gs, (kx, ky, z + 34), (24, 17, 34), p=7, cuts=2, rot=(0, 0, yaw))
    for lx, ly in ((-24, -17), (24, -17), (-24, 17), (24, 17)):
        tx, ty = _at(kx, ky, lx, ly, yaw)
        tip = round_tower(gs, gr, gd, tx, ty, z + 40, z + 74, 5.4, roof_h=13, slits=0)
        if (lx, ly) == (24, -17):
            out["keep"] = tip
    fx, fy = _at(kx, ky, 0, -17.6, yaw)
    merlons(gs, *_at(kx, ky, -19, -17.4, yaw), *_at(kx, ky, 19, -17.4, yaw), z + 68, step=5.2)
    box(P.g(banner, outline=0.3), (fx - 7, fy - 0.6, z + 44), (4.6, 0.5, 14), p=4, cuts=1, rot=(0, 0, yaw))
    P.g(banner, outline=0.3).slab([(fx - 11.6, z + 30), (fx - 2.4, z + 30), (fx - 7, z + 25)], fy - 0.6, 1.0)
    box(P.g(trim, outline=0.0), (fx - 7, fy - 1.2, z + 48), (1.6, 0.4, 2.0), p=3, cuts=1, rot=(0, 0, yaw))
    for k, (lx, lz) in enumerate(((8, 52), (15, 52), (11, 34))):
        wx, wy = _at(kx, ky, lx, -17.4, yaw)
        box(gd, (wx, wy, z + lz), (1.6, 0.5, 3.0 if k < 2 else 2.4), p=4, cuts=1, rot=(0, 0, yaw))
        out["windows"].append((wx, wy - 0.6, z + lz))
    # the side walls and the front wall with its corner towers
    (fax, fay), (fbx, fby) = at(-84, -26), at(84, -26)
    wall(gs, fax, fay, bax, bay, z, 28)
    merlons(gs, fax, fay, bax, bay, z + 28)
    wall(gs, fbx, fby, bbx, bby, z, 28)
    merlons(gs, fbx, fby, bbx, bby, z + 28)
    wall(gs, fax, fay, fbx, fby, z, 30)
    merlons(gs, fax, fay, fbx, fby, z + 30)
    round_tower(gs, gr, gd, fax, fay, z - 4, z + 50, 12, roof_h=27)
    round_tower(gs, gr, gd, fbx, fby, z - 4, z + 50, 12, roof_h=27)
    # the gatehouse: two drum towers, the gate block with its dark arch and a machicolation band
    for lx in (-13, 13):
        tx, ty = at(lx, -31)
        round_tower(gs, gr, gd, tx, ty, z - 2, z + 44, 9, roof=False, slits=1)
    gtx, gty = at(0, -31)
    box(gs, (gtx, gty, z + 19), (10, 7, 19), p=7, cuts=2, rot=(0, 0, yaw))
    box(gs2, (gtx, gty - 1.0, z + 37), (11.5, 7.4, 2.0), p=6, cuts=1, rot=(0, 0, yaw))
    merlons(gs, *at(-10, -37.6), *at(10, -37.6), z + 39, step=5.0)
    arch = [(gtx - 5, z), (gtx + 5, z)] + [(gtx + 5 * math.cos(math.pi * k / 8), z + 11 + 5 * math.sin(math.pi * k / 8)) for k in range(9)]
    gd.slab(arch, gty - 7.4, 1.0)
    out["gate"] = (gtx, gty - 8, z)
    wx, wy = at(0, -38.4)
    box(gd, (wx, wy, z + 28), (1.4, 0.4, 2.6), p=4, cuts=1)
    out["windows"] += [(wx, wy - 0.4, z + 28), (gtx - 9, gty - 9, z + 8), (gtx + 9, gty - 9, z + 8)]
    return out


def timber_house(P, x, y, z, w, d, h1, h2, rh, plaster=0xE8DFC8, timber=0x5E4A3E, roof=0x6B7682, base=0xA09888, dark=0x46404A,
                 yaw=0.0, jetty=1.6, thatch=False, chimney=0x8E7E70, seed=0, outline=0.5, along_x=True):
    """A timber-framed house (round 3, Medieval): a plaster ground floor on a stone sill, a jettied upper
    floor, dark posts, rails and braces on the camera face, a steep gable roof (slate, or thatch with a
    rounded ridge), a chimney stack. Returns (a window point, the chimney top or None)."""
    rnd = random.Random(seed)
    gw, gt = P.g(plaster, outline=outline), P.g(timber, outline=0.0)
    gr, gd, gb = P.g(roof, outline=outline), P.g(dark, outline=0.0, highlight=False), P.g(base, outline=outline)
    at = lambda lx, ly: _at(x, y, lx, ly, yaw)  # noqa: E731
    box(gb, (x, y, z + 1.6), (w / 2 + 0.5, d / 2 + 0.5, 1.8), p=6, cuts=1, rot=(0, 0, yaw))
    box(gw, (x, y, z + h1 / 2), (w / 2, d / 2, h1 / 2), p=8, cuts=2, rot=(0, 0, yaw))
    ux, uy = at(0, -jetty / 2)
    box(gw, (ux, uy, z + h1 + h2 / 2), (w / 2 + 0.6, d / 2 + jetty / 2, h2 / 2), p=8, cuts=2, rot=(0, 0, yaw))
    f1, f2 = -d / 2 - 0.35, -d / 2 - jetty - 0.35
    # the frame on the camera face
    n = max(3, int(w / 7))
    for k in range(n + 1):
        lx = -w / 2 + 0.8 + (w - 1.6) * k / n
        px, py = at(lx, f1)
        box(gt, (px, py, z + h1 / 2), (0.7, 0.4, h1 / 2), p=4, cuts=1, rot=(0, 0, yaw))
        px, py = at(lx, f2)
        box(gt, (px, py, z + h1 + h2 / 2), (0.7, 0.4, h2 / 2), p=4, cuts=1, rot=(0, 0, yaw))
        if k < n and k % 2 == 0:
            px, py = at(lx + (w - 1.6) / n / 2, f2)
            box(gt, (px, py, z + h1 + h2 * 0.5), (0.55, 0.35, h2 * 0.42), p=4, cuts=1, rot=(0, (36 if k % 4 == 0 else -36), yaw))
    for lz, half in ((z + h1 - 0.7, 0.8), (z + h1 + h2 * 0.5, 0.55), (z + h1 + h2 - 0.6, 0.7)):
        px, py = at(0, f1 if lz < z + h1 else f2)
        box(gt, (px, py, lz), (w / 2 + (0.6 if lz > z + h1 else 0), 0.4, half), p=4, cuts=1, rot=(0, 0, yaw))
    # door and windows
    px, py = at(-w * 0.2 + rnd.uniform(-1, 1), f1 - 0.2)
    box(gd, (px, py, z + h1 * 0.36), (w * 0.08, 0.4, h1 * 0.36), p=4, cuts=1, rot=(0, 0, yaw))
    win = None
    for k, lx in enumerate((-w * 0.24, w * 0.24)):
        px, py = at(lx, f2 - 0.2)
        box(gd, (px, py, z + h1 + h2 * 0.55), (w * 0.07, 0.4, h2 * 0.2), p=4, cuts=1, rot=(0, 0, yaw))
        win = win or (px, py - 0.4, z + h1 + h2 * 0.55)
    px, py = at(w * 0.22, f1 - 0.2)
    box(gd, (px, py, z + h1 * 0.55), (w * 0.08, 0.4, h1 * 0.16), p=4, cuts=1, rot=(0, 0, yaw))
    # the roof
    rz = z + h1 + h2
    rx, ry = at(0, -jetty / 2)
    gable_roof(gr, rx, ry, rz - 0.4, w + 1.2, d + jetty + 1.2, rh, oh=1.8 if thatch else 1.2, yaw=yaw, along_x=along_x)
    if thatch:
        if along_x:
            a, b = at(-w / 2 - 1.4, -jetty / 2), at(w / 2 + 1.4, -jetty / 2)
            gr.capsule((a[0], a[1], rz + rh - 1.2), (b[0], b[1], rz + rh - 1.2), 1.8)
    top = None
    if chimney is not None:
        cx_, cy_ = at(w * 0.3, d * 0.1)
        box(P.g(chimney, outline=outline), (cx_, cy_, rz + rh * 0.5), (2.2, 2.2, rh * 0.5 + 3.5), p=6, cuts=1, rot=(0, 0, yaw))
        top = (cx_, cy_, rz + rh + 3.5)
    return win, top


def field_patch(g, hill, x0, x1, z0, z1, lean0=0.0, lean1=0.0, grow=1.012):
    """A field lying on a hill (`hill` = the x, y, z, rx, ry, h, seed, jag, p of its `kit.hill`): the same
    lumpy shape a touch bigger, cut to the band between the slanted lines x = x0 + lean0 (z' - z) and
    x = x1 + lean1 (z' - z) and between heights z0 and z1, so it follows the hill like a crop."""
    x, y, z, rx, ry, h, seed, jag, p = hill
    tmp = Geo()
    rock(tmp, (x, y, z), (rx * grow, ry * grow, h * grow), seed=seed, jag=jag, p=p, cuts=4)
    tmp.clip((x0, y, z), (-1.0, 0.0, lean0))
    tmp.clip((x1, y, z), (1.0, 0.0, -lean1))
    if z0 is not None:
        tmp.clip((x, y, z0), (0.0, 0.0, -1.0))
    if z1 is not None:
        tmp.clip((x, y, z1), (0.0, 0.0, 1.0))
    return _merge(g, tmp)


def plate(g, pts, z0, z1):
    """A vertical prism from z0 to z1 over a plan polygon `pts` [(x, y)] (counter-clockwise seen from
    above): a slab turned upright, flat-shaded (fort walls, terraces)."""
    pl = [(x, -y) for x, y in pts]
    g.slab(pl, (z0 + z1) / 2, z1 - z0, rot=(90, 0, 0), origin=(0, 0, 0))


def star_outline(cx, cy, Rb, n=4, yaw=0.0, k_sh=0.7, a_sh=19.0, k_fl=0.56, a_fl=31.0, front=-90.0):
    """The plan of a bastioned fort with `n` arrowhead bastions (one pointing at the camera): for each
    bastion its flank foot, shoulder, tip, shoulder and flank foot, the curtains between, counter-clockwise."""
    pts = []
    for k in range(n):
        th = front + 360.0 * k / n + yaw
        for r, a in ((k_fl, -a_fl), (k_sh, -a_sh), (1.0, 0.0), (k_sh, a_sh), (k_fl, a_fl)):
            t = math.radians(th + a)
            pts.append((cx + Rb * r * math.cos(t), cy + Rb * r * math.sin(t)))
    return pts


def star_fort(P, cx, cy, z0, h, Rb, yaw=-10.0, stone=0xE6DCC2, stone_dk=0xC8BCA0, cord=0xD8CCB0, grass=0x7E9466, roof=0x6E6A70,
              roof2=0x8A6E5E, dark=0x3E3A40, outline=0.4, front=-45.0, ravelin=True):
    """A bastioned star fort (round 3, Gunpowder classic): four arrowhead bastions (one pointing at the
    camera) and curtains in pale dressed stone on a darker plinth, a cordon, a grass rampart on top behind
    a parapet with embrasures, sentry boxes on the bastion tips, the gate with its pediment on the left
    curtain, barracks and a chapel inside. Returns {'flag': flagpole foot, 'gate': gate foot, 'windows': [...]}."""
    out = {"windows": []}
    gs, gs2 = P.g(stone, outline=outline), P.g(stone_dk, outline=outline)
    gd = P.g(dark, outline=0.0, highlight=False)
    star = star_outline(cx, cy, Rb, yaw=yaw, front=front)
    plinth = star_outline(cx, cy, Rb * 1.07, yaw=yaw, front=front)
    plate(gs2, plinth, z0 - 8, z0 + 4)
    plate(gs, star, z0, z0 + h)
    cords = star_outline(cx, cy, Rb * 1.015, yaw=yaw, front=front)
    plate(P.g(cord, outline=0.2), cords, z0 + h - 3.2, z0 + h - 1.6)
    # the rampart: grass a little inside the parapet
    plate(P.g(grass, outline=0.0), star_outline(cx, cy, Rb * 0.93, yaw=yaw, front=front), z0 + h, z0 + h + 1.6)
    # the parapet with its embrasures, along every outer edge
    for (ax, ay), (bx, by) in zip(star, star[1:] + star[:1]):
        L = math.hypot(bx - ax, by - ay)
        n = max(1, int(L / 9.0))
        ang = math.degrees(math.atan2(by - ay, bx - ax))
        for k in range(n):
            t = (k + 0.5) / n
            box(gs, (ax + (bx - ax) * t, ay + (by - ay) * t, z0 + h + 2.2), (L / n / 2 - 1.6, 1.6, 2.4), p=6, cuts=1, rot=(0, 0, ang))
    # sentry boxes (guerites) on the bastion tips
    for k in range(4):
        tx, ty = star[k * 5 + 2]
        ux, uy = (tx - cx) / Rb, (ty - cy) / Rb
        gx, gy = tx - ux * 2.4, ty - uy * 2.4
        sb = max(2.4, Rb * 0.034)
        cyl(gs, (gx, gy, z0 + h - 2), (gx, gy, z0 + h + sb * 2.6), sb, bevel=0.3, segs=12)
        gs2.lathe([(0.01, 0), (sb * 1.2, 0), (sb * 0.9, sb * 0.75), (0.4, sb * 1.5), (0.01, sb * 1.6)], (gx, gy, z0 + h + sb * 2.6), (gx, gy, z0 + h + sb * 4.2), segs=12)
        box(gd, (gx + ux * 0.4, gy - sb * 0.96, z0 + h + sb * 1.2), (sb * 0.25, 0.4, sb * 0.6), p=4, cuts=1)
        box(gs2, (gx, gy, z0 + h - 3.2), (sb * 0.85, sb * 0.85, 1.2), p=4, cuts=1)
    # inside: two barracks blocks and a church with its tower and spire (their roofs show over the rampart);
    # sized with the fort (`sc`)
    sc = Rb / 72.0
    gr, gr2 = P.g(roof, outline=outline), P.g(roof2, outline=outline)
    zi = z0 + h + 1.6
    for (lx, ly, w, d, hh, g_) in ((-22, 16, 32, 11, 10, gr), (20, 22, 28, 11, 9, gr2), (-4, 34, 40, 10, 9, gr2)):
        bx_, by_ = _at(cx, cy, lx * sc, ly * sc, yaw)
        w, d, hh = w * sc, d * sc, hh * sc
        box(gs, (bx_, by_, zi + hh / 2), (w / 2, d / 2, hh / 2), p=7, cuts=2, rot=(0, 0, yaw))
        gable_roof(g_, bx_, by_, zi + hh - 0.3, w, d, 7.0 * sc, yaw=yaw)
        for k in range(3):
            wx, wy = _at(bx_, by_, -w / 3 + k * w / 3, -d / 2 - 0.3, yaw)
            box(gd, (wx, wy, zi + hh * 0.55), (1.1 * sc, 0.4, 1.8 * sc), p=4, cuts=1, rot=(0, 0, yaw))
            if k == 1 and lx < 0:
                out["windows"].append((wx, wy - 0.5, zi + hh * 0.55))
    chx, chy = _at(cx, cy, 4 * sc, 2 * sc, yaw)
    box(gs, (chx, chy, zi + 7 * sc), (8 * sc, 13 * sc, 7 * sc), p=7, cuts=2, rot=(0, 0, yaw))
    gable_roof(gr, chx, chy, zi + 13.7 * sc, 16 * sc, 26 * sc, 8 * sc, yaw=yaw, along_x=False)
    tx_, ty_ = _at(chx, chy, 0, -15 * sc, yaw)
    box(gs, (tx_, ty_, zi + 13 * sc), (4.6 * sc, 4.6 * sc, 13 * sc), p=7, cuts=2, rot=(0, 0, yaw))
    box(P.g(cord, outline=outline), (tx_, ty_, zi + 26.6 * sc), (5.2 * sc, 5.2 * sc, 0.9 * sc), p=6, cuts=1, rot=(0, 0, yaw))
    gr.lathe([(0.01, 0), (6.4 * sc, 0), (4.0 * sc, 3 * sc), (0.3, 16 * sc), (0.01, 16.4 * sc)], (tx_, ty_, zi + 27.4 * sc), (tx_, ty_, zi + 43.8 * sc), segs=8,
             rot=(0, 0, 22.5 + yaw))
    box(gd, (tx_, ty_ - 4.8 * sc, zi + 20 * sc), (1.2 * sc, 0.4, 2.4 * sc), p=4, cuts=1, rot=(0, 0, yaw))
    out["windows"].append((tx_, ty_ - 5.3 * sc, zi + 20 * sc))
    out["spire"] = (tx_, ty_, zi + 44 * sc)
    out["flag"] = _at(cx, cy, 30 * sc, 4 * sc, yaw) + (zi,)
    # the gate on the front-left curtain: a pale block with a pediment and a dark arch (built facing -y,
    # then turned to the curtain: local -y is the curtain's outside for a counter-clockwise plan)
    (ax, ay), (bx, by) = star[19], star[0]
    ang = math.degrees(math.atan2(by - ay, bx - ax))
    nx, ny = math.sin(math.radians(ang)), -math.cos(math.radians(ang))
    px, py = (ax + bx) / 2 + nx * 1.2, (ay + by) / 2 + ny * 1.2
    box(gs, (px, py, z0 + h * 0.5 + 2), (9, 2.2, h * 0.5 + 2), p=6, cuts=1, rot=(0, 0, ang))
    zt = z0 + h + 4
    P.g(cord, outline=outline).slab([(px - 10.5, zt), (px + 10.5, zt), (px, zt + 6.5)], py - 1.0, 4.0, rot=(0, 0, ang), origin=(px, py, 0))
    arch = [(px - 3.6, z0), (px + 3.6, z0)] + [(px + 3.6 * math.cos(math.pi * k / 8), z0 + 8 + 3.6 * math.sin(math.pi * k / 8)) for k in range(9)]
    gd.slab(arch, py - 2.5, 0.8, rot=(0, 0, ang), origin=(px, py, 0))
    out["gate"] = (px + nx * 3, py + ny * 3, z0)
    out["windows"].append((px + nx * 3, py + ny * 3, z0 + 6))
    if ravelin:
        # a ravelin before the gate: a low triangular outwork pointing at the camera, its own sentry box,
        # a bridge across the ditch to the gate
        d0, rr = Rb * 0.3, Rb * 0.62
        tip = (px + nx * (d0 + rr), py + ny * (d0 + rr))
        ex, ey = math.cos(math.radians(ang)), math.sin(math.radians(ang))
        wing = Rb * 0.5
        bl = (px + nx * d0 - ex * wing, py + ny * d0 - ey * wing)
        br = (px + nx * d0 + ex * wing, py + ny * d0 + ey * wing)
        tri = [bl, tip, br] if (tip[0] - bl[0]) * (br[1] - bl[1]) - (tip[1] - bl[1]) * (br[0] - bl[0]) > 0 else [br, tip, bl]
        hr = h * 0.62
        plate(gs2, [(x_ + (x_ - (bl[0] + br[0] + tip[0]) / 3) * 0.07, y_ + (y_ - (bl[1] + br[1] + tip[1]) / 3) * 0.07) for x_, y_ in tri], z0 - 8, z0 + 2)
        plate(gs, tri, z0 - 2, z0 + hr)
        for (ax_, ay_), (bx_, by_) in ((bl, tip), (tip, br)):
            L = math.hypot(bx_ - ax_, by_ - ay_)
            a_ = math.degrees(math.atan2(by_ - ay_, bx_ - ax_))
            n = max(1, int(L / 9.0))
            for k in range(n):
                t = (k + 0.5) / n
                box(gs, (ax_ + (bx_ - ax_) * t, ay_ + (by_ - ay_) * t, z0 + hr + 2.2), (L / n / 2 - 1.6, 1.4, 2.2), p=6, cuts=1, rot=(0, 0, a_))
        sb = max(2.4, Rb * 0.034)
        gx, gy = tip[0] - nx * 2.4, tip[1] - ny * 2.4
        cyl(gs, (gx, gy, z0 + hr - 2), (gx, gy, z0 + hr + sb * 2.6), sb, bevel=0.3, segs=12)
        gs2.lathe([(0.01, 0), (sb * 1.2, 0), (sb * 0.9, sb * 0.75), (0.4, sb * 1.5), (0.01, sb * 1.6)], (gx, gy, z0 + hr + sb * 2.6), (gx, gy, z0 + hr + sb * 4.2), segs=12)
        plate(P.g(grass, outline=0.0), [((x_ * 0.86 + (bl[0] + br[0] + tip[0]) / 3 * 0.14), (y_ * 0.86 + (bl[1] + br[1] + tip[1]) / 3 * 0.14)) for x_, y_ in tri], z0 + hr, z0 + hr + 1.4)
        out["ravelin"] = tip
    return out


# -- round 3 kit: a mid-century city ----------------------------------------------------------------
def setback_tower(P, x, y, z, w, d, h, wall=0xB8B4A8, wall_dk=0x9C988C, win=0x5A5E66, trim=0xCFCABC, yaw=0.0, tiers=3, crown="flat",
                  roof=0x6E7076, seed=0, outline=0.4, rows=None):
    """A mid-century tower (round 3, Modern): a shaft with setbacks (`tiers` blocks, each narrower and
    shorter), window bands (dark rows on the camera face), a pale cornice per tier, and a crown: 'flat'
    (a roof box), 'spire' (an Art Deco needle over stepped fins), 'dome' (a lantern dome) or 'mast' (a
    short antenna). Returns (top point, [window points for night lights])."""
    rnd = random.Random(seed)
    gw, gd = P.g(wall, outline=outline), P.g(win, outline=0.0, highlight=False)
    gt = P.g(trim, outline=0.3)
    lights = []
    zz, ww, dd = z, w, d
    hs = [h * f for f in ((0.62, 0.24, 0.14) if tiers == 3 else (0.72, 0.28) if tiers == 2 else (1.0,))]
    for k, th in enumerate(hs):
        box(gw, (x, y, zz + th / 2), (ww / 2, dd / 2, th / 2), p=8, cuts=2, rot=(0, 0, yaw))
        box(gt, (x, y, zz + th - 0.6), (ww / 2 + 0.6, dd / 2 + 0.6, 0.7), p=6, cuts=1, rot=(0, 0, yaw))
        # the window bays: vertical dark strips between pale piers (the mid-century look), broken by a
        # spandrel band every few floors (`rows` lu)
        fy = -dd / 2 - 0.3
        cols = max(2, int(ww / 4.8))
        bay = (ww - 2.4) / cols
        nb = max(1, int(th / ((rows or 5.0) * 3.2)))
        for c in range(cols):
            lx = -ww / 2 + 1.2 + bay * (c + 0.5)
            for r in range(nb):
                z0_ = zz + 1.6 + (th - 3.2) * r / nb
                z1_ = zz + 1.6 + (th - 3.2) * (r + 1) / nb - 1.0
                px, py = _at(x, y, lx, fy, yaw)
                box(gd, (px, py, (z0_ + z1_) / 2), (bay * 0.3, 0.4, (z1_ - z0_) / 2), p=4, cuts=1, rot=(0, 0, yaw))
        if k == 0:
            for r in range(2):
                wz = zz + th * (0.35 + 0.3 * r)
                cx_, cy_ = _at(x, y, rnd.uniform(-0.3, 0.3) * ww, fy - 0.3, yaw)
                lights.append((cx_, cy_, wz))
        zz += th
        ww, dd = ww * 0.76, dd * 0.8
    if crown == "spire":
        for k in range(3):
            box(gt, (x, y, zz + 2 + k * 3), (ww / 2 * (1 - k * 0.24), dd / 2 * (1 - k * 0.24), 1.5), p=6, cuts=1, rot=(0, 0, yaw))
        gt.lathe([(0.01, 0), (ww * 0.22, 0), (0.3, h * 0.22), (0.01, h * 0.22 + 0.4)], (x, y, zz + 9), (x, y, zz + 9 + h * 0.22), segs=8)
        top = (x, y, zz + 9 + h * 0.22)
    elif crown == "dome":
        cyl(gt, (x, y, zz), (x, y, zz + 4), ww * 0.34, bevel=0.3, segs=14)
        P.g(roof, outline=0.3).lathe([(0.01, 0), (ww * 0.36, 0), (ww * 0.3, ww * 0.18), (ww * 0.12, ww * 0.32), (0.01, ww * 0.36)], (x, y, zz + 4),
                                     (x, y, zz + 4 + ww * 0.36), segs=16)
        top = (x, y, zz + 4 + ww * 0.36)
    elif crown == "mast":
        gt.capsule((x, y, zz), (x, y, zz + h * 0.18), 0.5, 0.3)
        top = (x, y, zz + h * 0.18)
    else:
        box(P.g(roof, outline=0.3), (x + ww * 0.15, y, zz + 2), (ww * 0.2, dd * 0.24, 2), p=6, cuts=1, rot=(0, 0, yaw))
        top = (x, y, zz + 4)
    return top, lights


def lattice_mast(g, x, y, z, h, base=7.0, segs=10):
    """A radio mast: a tapering lattice of four legs braced in X panels, a platform near the top."""
    for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        g.capsule((x + sx * base, y + sy * base * 0.8, z), (x + sx * 0.8, y + sy * 0.6, z + h), 0.55, 0.3)
    for k in range(segs):
        t0, t1 = k / segs, (k + 1) / segs
        r0, r1 = base * (1 - t0) + 0.8 * t0, base * (1 - t1) + 0.8 * t1
        z0, z1 = z + h * t0, z + h * t1
        g.capsule((x - r0, y - r0 * 0.8, z0), (x + r1, y - r1 * 0.8, z1), 0.28)
        g.capsule((x + r0, y - r0 * 0.8, z0), (x - r1, y - r1 * 0.8, z1), 0.28)
    g.capsule((x, y, z + h), (x, y, z + h + h * 0.08), 0.35, 0.2)
    return (x, y, z + h * 1.08)


def suspension_bridge(P, x0, x1, y, deck_z, tower_h, steel=0x8A8E94, steel_dk=0x6E7278, deck=0x7A7E84, cable=0x5E6268, outline=0.4):
    """A suspension bridge in side view: two towers with portal beams, the main cables hanging between
    them and down to the anchorages, vertical hangers, a deck on a truss. Returns the two tower tops."""
    gs, gd = P.g(steel, outline=outline), P.g(deck, outline=outline)
    gc = P.g(cable, outline=0.0, highlight=False)
    L = x1 - x0
    ta, tb = x0 + L * 0.22, x1 - L * 0.22
    box(gd, ((x0 + x1) / 2, y, deck_z), (L / 2, 4.0, 1.2), p=6, cuts=2)
    box(P.g(steel_dk, outline=0.3), ((x0 + x1) / 2, y - 0.6, deck_z - 2.6), (L / 2, 3.6, 1.6), p=5, cuts=1)
    tops = []
    for tx in (ta, tb):
        for sy in (-3.6, 3.6):
            box(gs, (tx, y + sy, deck_z - 30 + (tower_h + 30) / 2), (1.6, 1.0, (tower_h + 30) / 2), p=6, cuts=1, taper=(1.15, 0.85))
        for zz in (deck_z + tower_h * 0.45, deck_z + tower_h * 0.92):
            box(gs, (tx, y, zz), (2.2, 4.6, 1.4), p=6, cuts=1)
        tops.append((tx, y, deck_z + tower_h))
    sag = tower_h * 0.82

    def cable_z(xx):
        if ta <= xx <= tb:
            u = (xx - (ta + tb) / 2) / ((tb - ta) / 2)
            return deck_z + tower_h - sag * (1 - u * u)
        if xx < ta:
            return deck_z + 2 + (tower_h - 2) * ((xx - x0) / (ta - x0)) ** 1.6
        return deck_z + 2 + (tower_h - 2) * ((x1 - xx) / (x1 - tb)) ** 1.6
    n = 48
    for k in range(n):
        xa, xb = x0 + L * k / n, x0 + L * (k + 1) / n
        gc.capsule((xa, y - 4.2, cable_z(xa)), (xb, y - 4.2, cable_z(xb)), 0.6)
    for k in range(1, 40):
        xx = x0 + L * k / 40
        zc = cable_z(xx)
        if zc > deck_z + 3:
            gc.capsule((xx, y - 4.1, deck_z + 1.2), (xx, y - 4.1, zc), 0.22)
    return tops


def warehouse(P, x, y, z, w, d, h, brick=0x8E6A5E, brick_dk=0x765A50, roof=0x5E6064, win=0x3E3A40, trim=0xB8A67A, yaw=0.0, saw=3,
              outline=0.5, seed=0):
    """A brick warehouse (round 3, Modern): a long block with pilasters and rows of dark windows, a stone
    band, a sawtooth roof (`saw` teeth; 0 = a flat parapet), a loading door. Returns a window point."""
    gb, gb2, gd = P.g(brick, outline=outline), P.g(brick_dk, outline=outline), P.g(win, outline=0.0, highlight=False)
    gt, gr = P.g(trim, outline=0.3), P.g(roof, outline=outline)
    box(gb, (x, y, z + h / 2), (w / 2, d / 2, h / 2), p=8, cuts=2, rot=(0, 0, yaw))
    fy = -d / 2 - 0.3
    n = max(2, int(w / 9))
    for k in range(n + 1):
        px, py = _at(x, y, -w / 2 + w * k / n, fy, yaw)
        box(gb2, (px, py, z + h / 2), (0.9, 0.5, h / 2), p=4, cuts=1, rot=(0, 0, yaw))
    for r, zr in enumerate((0.34, 0.7)):
        for k in range(n):
            px, py = _at(x, y, -w / 2 + w * (k + 0.5) / n, fy - 0.1, yaw)
            box(gd, (px, py, z + h * zr), (w / n * 0.3, 0.4, h * 0.11), p=4, cuts=1, rot=(0, 0, yaw))
    px, py = _at(x, y, 0, fy - 0.2, yaw)
    box(gt, (px, py, z + h * 0.52), (w / 2 + 0.4, 0.5, 0.8), p=4, cuts=1, rot=(0, 0, yaw))
    dx, dy = _at(x, y, w * 0.3, fy - 0.2, yaw)
    box(gd, (dx, dy, z + h * 0.2), (w * 0.08, 0.4, h * 0.2), p=4, cuts=1, rot=(0, 0, yaw))
    if saw:
        for k in range(saw):
            lx = -w / 2 + w * (k + 0.5) / saw
            sx, sy = _at(x, y, lx, 0, yaw)
            gr.slab([(sx - w / saw / 2, z + h), (sx + w / saw / 2, z + h), (sx + w / saw / 2, z + h + w / saw * 0.42)], sy, d, rot=(0, 0, yaw), origin=(sx, sy, 0))
    else:
        box(gb2, (x, y, z + h + 1.2), (w / 2 + 0.4, d / 2 + 0.4, 1.2), p=6, cuts=1, rot=(0, 0, yaw))
    return _at(x, y, -w * 0.3, fy - 0.6, yaw) + (z + h * 0.7,)


def water_tower(P, x, y, z, h, r, wood=0x7A6450, wood_dk=0x5E4C3E, roof=0x5E5A56, steel=0x4A4A4E, outline=0.5):
    """A rooftop water tank on stilts: a staved barrel with hoops and a conical cap on a braced frame."""
    gs, gw, gk = P.g(steel, outline=0.3), P.g(wood, outline=outline), P.g(wood_dk, outline=0.0)
    for a in (45, 135, 225, 315):
        t = math.radians(a)
        gs.capsule((x + math.cos(t) * r * 0.9, y + math.sin(t) * r * 0.6, z), (x + math.cos(t) * r * 0.7, y + math.sin(t) * r * 0.5, z + h * 0.45), 0.5)
    gs.capsule((x - r * 0.8, y - r * 0.5, z + h * 0.1), (x + r * 0.8, y - r * 0.5, z + h * 0.4), 0.3)
    gs.capsule((x + r * 0.8, y - r * 0.5, z + h * 0.1), (x - r * 0.8, y - r * 0.5, z + h * 0.4), 0.3)
    cyl(gw, (x, y, z + h * 0.45), (x, y, z + h * 0.88), r, r * 0.94, bevel=0.6, segs=16)
    for f in (0.55, 0.75):
        cyl(gk, (x, y, z + h * f), (x, y, z + h * f + 0.6), r * (1.02 - (f - 0.45) * 0.1), bevel=0.1, segs=16)
    P.g(roof, outline=outline).lathe([(0.01, 0), (r * 1.08, 0), (0.3, h * 0.16), (0.01, h * 0.17)], (x, y, z + h * 0.88), (x, y, z + h * 1.05), segs=16)
    return (x, y, z + h * 1.05)


# -- round 3 kit: a future megacity -----------------------------------------------------------------
def spire(P, x, y, z, h, r, white=0xE4E6EE, white2=0xCDD0DA, dark=0x23262E, glow=0x3AF0B4, rings=2, fins=3, seed=0, outline=0.4):
    """A needle spire (round 3, Future): a tall concave-tapering shaft over a flared base with buttress fins,
    ring balconies, a dark window band up the camera face with a glowing seam, a slim tip. Returns the tip."""
    rnd = random.Random(seed)
    gw, gw2, gd = P.g(white, finish="gloss", outline=outline), P.g(white2, outline=outline), P.g(dark, finish="gloss", outline=0.0)
    prof = [(0.01, 0), (r * 1.5, 0), (r * 1.25, h * 0.06), (r, h * 0.18), (r * 0.78, h * 0.45), (r * 0.5, h * 0.72), (r * 0.26, h * 0.9), (r * 0.1, h), (0.01, h + 0.4)]
    gw.lathe(prof, (x, y, z), (x, y, z + h), segs=18)
    for k in range(fins):
        a = -90 + (k - (fins - 1) / 2) * 70 + rnd.uniform(-6, 6)
        t = math.radians(a)
        fx, fy = x + math.cos(t) * r * 1.2, y + math.sin(t) * r * 0.9
        gw2.slab([(fx - r * 0.9, z), (fx + r * 0.2, z), (fx - r * 0.1, z + h * 0.34)], fy, r * 0.22, rot=(0, 0, a + 90), origin=(fx, fy, 0))
    for k in range(rings):
        f = 0.36 + 0.24 * k
        rr = r * (1.0 - f * 0.9) + r * 0.32
        cyl(gw2, (x, y, z + h * f), (x, y, z + h * f + 2.2), rr, bevel=0.5, segs=18)
        cyl(P.g(glow, glow=True), (x, y, z + h * f + 0.6), (x, y, z + h * f + 1.4), rr + 0.25, bevel=0.1, segs=18)
    box(gd, (x, y - r * 0.82, z + h * 0.4), (r * 0.18, 0.5, h * 0.26), p=4, cuts=1)
    box(P.g(glow, glow=True), (x, y - r * 0.86, z + h * 0.4), (r * 0.04, 0.4, h * 0.25), p=4, cuts=1)
    return (x, y, z + h)


def sky_arch(P, x0, x1, y, z0, apex, thick=7.0, white=0xE4E6EE, glow=0x3AF0B4, n=40):
    """A parabolic sky arch from (x0, z0) to (x1, z0) rising to `apex`: a ribbon of thick segments with a
    glowing seam along its face. Returns its top point."""
    g = P.g(white, finish="gloss", outline=0.4)
    gg = P.g(glow, glow=True)
    xm = (x0 + x1) / 2
    half = (x1 - x0) / 2

    def pt(t):
        xx = x0 + (x1 - x0) * t
        u = (xx - xm) / half
        return xx, z0 + (apex - z0) * (1 - u * u)
    for k in range(n):
        (xa, za), (xb, zb) = pt(k / n), pt((k + 1) / n)
        w = thick * (1.0 + 0.4 * abs(2 * k / n - 1))  # thicker toward the feet
        g.capsule((xa, y, za), (xb, y, zb), w, w)
        gg.capsule((xa, y - w * 0.9, za), (xb, y - w * 0.9, zb), 0.5, 0.5)
    return (xm, y, apex)


def hover_disc(P, x, y, z, r, white=0xE4E6EE, dark=0x3A3E48, glow=0x3AF0B4, outline=0.4):
    """A hovering platform: a thick disc with a rim, a little pavilion on top and a glowing underside."""
    gw, gd = P.g(white, finish="gloss", outline=outline), P.g(dark, outline=0.3)
    gw.lathe([(0.01, 0), (r * 0.5, 0), (r, r * 0.12), (r * 1.02, r * 0.2), (r * 0.9, r * 0.26), (0.01, r * 0.26)], (x, y, z), (x, y, z + r * 0.26), segs=24)
    cyl(gd, (x, y, z + r * 0.26), (x, y, z + r * 0.36), r * 0.5, bevel=0.3, segs=16)
    gd.lathe([(0.01, 0), (r * 0.36, 0), (r * 0.3, r * 0.14), (0.01, r * 0.2)], (x, y, z + r * 0.36), (x, y, z + r * 0.56), segs=16)
    P.g(glow, glow=True).blob((x, y, z + 0.4), (r * 0.42, r * 0.36, 0.8), p=2.0, cuts=2)
    return (x, y, z)


# the cliff profile of a butte, bottom to top: (height share, inset): vertical cliffs of hard rock with
# receding soft beds between them (the ledges that show its strata), the cap rock standing out under the top
_BUTTE_PROFILE = ((0.0, 1.0), (0.3, 0.985), (0.34, 0.952), (0.6, 0.94), (0.645, 0.905), (0.86, 0.895), (0.875, 0.935), (1.0, 0.92))


def _butte_plan(rx, ry, seed):
    """The irregular plan of a butte: 19 corners round a lobed ellipse (two smooth waves and a jitter), so its
    cliffs jut out in buttresses and fall back in bays."""
    rnd = random.Random(seed)
    n = 19
    p1, p2 = rnd.uniform(0, 6.28), rnd.uniform(0, 6.28)
    pts = []
    for i in range(n):
        a = 2 * math.pi * (i + rnd.uniform(-0.3, 0.3)) / n
        k = 1.0 + 0.12 * math.sin(2 * a + p1) + 0.07 * math.sin(3 * a + p2) + rnd.uniform(-0.07, 0.05)
        pts.append((math.cos(a) * rx * k, math.sin(a) * ry * k))
    return pts


def _prism(g, x, y, z, plan, levels, cap=True):
    """A faceted column: the `plan` polygon (corners relative to x, y) at each (z, scale) level, side faces
    flat (crisp corners), the top closed."""
    from mathutils import Matrix
    n = len(plan)
    verts, faces = [], []
    for zz, s in levels:
        verts += [(x + px * s, y + py * s, zz) for px, py in plan]
    for k in range(len(levels) - 1):
        for i in range(n):
            j = (i + 1) % n
            a, b = k * n + i, k * n + j
            faces.append([a, b, b + n, a + n])
    if cap:
        faces.append([(len(levels) - 1) * n + i for i in range(n)])
        faces.append([i for i in range(n - 1, -1, -1)])
    g._add(verts, faces, Matrix.Identity(4), smooth=False)
    return g


def butte(g_body, g_bands, g_talus, x, y, z, rx, ry, h, seed=0, bands=((0.22, 0.3), (0.48, 0.55), (0.72, 0.8)), g_gully=None, g_cap=None,
          tier=0.0):
    """A desert butte (round 3, review 2: stacked boxes read as pancakes; rounded rocks then read as loaves
    and lathed columns as barrels): a flat-topped column of rock on an irregular plan with crisp corners,
    near-vertical cliffs stepping back at soft beds (ledges), darker strata on its faces (bands of the same
    column a touch proud of it), a cap rock standing out under the top, dark gullies down the camera faces,
    and a tall talus cone of scree flaring round its lower half with fallen boulders. `bands` are (from, to)
    fractions of the height; `g_bands` one Geo per band; `tier` (a share of the height) stands a smaller,
    off-centre upper tier on the top, so the skyline steps."""
    rnd = random.Random(seed)
    plan = _butte_plan(rx, ry, seed)

    def inset(f):
        for (f0, s0), (f1, s1) in zip(_BUTTE_PROFILE, _BUTTE_PROFILE[1:]):
            if f0 <= f <= f1:
                return s0 + (s1 - s0) * (f - f0) / max(1e-6, f1 - f0)
        return _BUTTE_PROFILE[-1][1]

    _prism(g_body, x, y, z, plan, [(z + f * h, s) for f, s in _BUTTE_PROFILE])
    for k, (f0, f1) in enumerate(bands):
        _prism(g_bands[k % len(g_bands)], x, y, z, plan, [(z + f0 * h, inset(f0) * 1.012), (z + f1 * h, inset(f1) * 1.012)], cap=True)
    if g_cap is not None:
        _prism(g_cap, x, y, z, plan, [(z + 0.875 * h, 0.935 * 1.01), (z + h + 0.4, 0.92 * 1.01)])
    if tier > 0:
        sub = [(px * 0.5 + rx * 0.18, py * 0.6) for px, py in _butte_plan(rx, ry, seed + 3)]
        th = h * tier
        _prism(g_body, x, y, z + h, sub, [(z + h - 1, 1.0), (z + h + th * 0.86, 0.95), (z + h + th * 0.88, 0.99), (z + h + th, 0.97)])
        if g_cap is not None:
            _prism(g_cap, x, y, z + h, sub, [(z + h + th * 0.88, 0.995), (z + h + th + 0.4, 0.975)])
    if g_gully is not None:
        front = [i for i, (px, py) in enumerate(plan) if py < -0.35 * ry]
        for i in rnd.sample(front, min(len(front), max(2, int(rx / 26)))):
            j = (i + 1) % len(plan)
            t = rnd.uniform(0.3, 0.7)
            px, py = (plan[i][0] + (plan[j][0] - plan[i][0]) * t, plan[i][1] + (plan[j][1] - plan[i][1]) * t)
            f_top = rnd.uniform(0.62, 0.84)
            g_gully.capsule((x + px * inset(f_top), y + py * inset(f_top) - 0.8, z + h * f_top),
                            (x + px * 0.99, y + py * 0.99 - 0.8, z + h * 0.36), rnd.uniform(1.2, 2.0), 0.6)
    # the talus: a scree cone flaring round the lower half of the cliffs, boulders fallen onto it
    n0 = len(g_talus.bm.verts)
    g_talus.lathe([(0.01, 0.0), (rx * 1.5, 0.0), (rx * 1.24, h * 0.12), (rx * 1.06, h * 0.29), (rx * 0.97, h * 0.44), (0.01, h * 0.45)],
                  (x, y, z), (x, y, z + h), segs=26, squash=(1.0, ry / rx * 1.04))
    _jitter(g_talus, n0, (x, y, z), 0.08, seed + 7, 2.2 / max(1.0, min(rx, ry)))
    for k in range(int(rx / 9)):
        a = rnd.uniform(math.pi * 1.05, math.pi * 1.95)
        r = rnd.uniform(1.05, 1.4)
        bx, by = x + math.cos(a) * rx * r, y + math.sin(a) * ry * r
        bz = z + h * max(0.0, 0.42 - (r - 1.0) * 1.05)
        rock(g_body, (bx, by, bz), (rnd.uniform(3, 7), rnd.uniform(3, 6), rnd.uniform(2.5, 5)), seed=seed + 30 + k, jag=0.25, p=2.2, cuts=2)


def sweep(g, pts, radii, squash=1.0, segs=14):
    """A tube along a path in the side (XZ) plane (a natural arch, a thick bough): `pts` the path points,
    `radii` the radius at each, an elliptic section whose depth (y) axis is scaled by `squash`; both ends
    capped. Returns the index of the first vertex added (for `_jitter`)."""
    from mathutils import Matrix, Vector
    g.bm.verts.ensure_lookup_table()
    n0 = len(g.bm.verts)
    n = len(pts)
    verts, faces = [], []
    Y = Vector((0.0, 1.0, 0.0))
    for i, (p, r) in enumerate(zip(pts, radii)):
        a, b = Vector(pts[max(0, i - 1)]), Vector(pts[min(n - 1, i + 1)])
        t = (b - a).normalized()
        nrm = t.cross(Y).normalized()
        for k in range(segs):
            th = 2 * math.pi * k / segs
            q = Vector(p) + nrm * (r * math.cos(th)) + Y * (r * squash * math.sin(th))
            verts.append(tuple(q))
    for i in range(n - 1):
        for k in range(segs):
            j = (k + 1) % segs
            faces.append([i * segs + k, i * segs + j, (i + 1) * segs + j, (i + 1) * segs + k])
    faces.append([k for k in range(segs - 1, -1, -1)])
    faces.append([(n - 1) * segs + k for k in range(segs)])
    g._add(verts, faces, Matrix.Identity(4), smooth=True)
    g.bm.faces.ensure_lookup_table()
    import bmesh
    bmesh.ops.recalc_face_normals(g.bm, faces=list(g.bm.faces[-(len(faces)):]))
    return n0


def acacia(gb, ga, ga2, x, y, z, h, seed=0, spread=1.0):
    """A flat-topped umbrella thorn tree: a leaning trunk forking into three limbs that fan up and out, and
    a wide flat crown in two or three overlapping layers (the lower and outer ones darker)."""
    rnd = random.Random(seed)
    lean = rnd.uniform(-0.08, 0.08) * h
    fork = (x + lean, y, z + h * 0.48)
    gb.capsule((x, y, z), fork, max(0.8, h * 0.035), max(0.6, h * 0.026))
    tops = []
    for k, a in enumerate((-0.9, 0.05, 0.85)):
        dx = a * h * 0.36 * spread + rnd.uniform(-0.04, 0.04) * h
        top = (fork[0] + dx, y + rnd.uniform(-2, 2), z + h * rnd.uniform(0.8, 0.9))
        gb.capsule(fork, top, max(0.5, h * 0.022), max(0.4, h * 0.014))
        tops.append(top)
    w = h * 0.58 * spread
    ga2.blob((fork[0], y, z + h * 0.86), (w, h * 0.26, h * 0.075), p=2.2, cuts=3)
    for k, top in enumerate(tops):
        (ga if k != 1 else ga2).blob((top[0], top[1], top[2] + h * 0.05), (w * rnd.uniform(0.45, 0.6), h * 0.22, h * 0.07), p=2.2, cuts=3)
    ga.blob((fork[0] + rnd.uniform(-0.1, 0.1) * h, y - 1, z + h * 0.97), (w * 0.62, h * 0.2, h * 0.06), p=2.2, cuts=3)


def baobab(gb, ga, x, y, z, h, seed=0):
    """A baobab: a fat bottle trunk, stubby crooked boughs radiating from its top, small sparse crowns."""
    rnd = random.Random(seed)
    r0 = h * 0.2
    gb.lathe([(0.01, 0), (r0 * 1.1, 0), (r0 * 1.16, h * 0.18), (r0 * 1.0, h * 0.45), (r0 * 0.78, h * 0.68), (r0 * 0.5, h * 0.78), (0.01, h * 0.8)],
             (x, y, z), (x, y, z + h), segs=16)
    for k in range(7):
        a = math.pi * (0.12 + 0.76 * k / 6) + rnd.uniform(-0.1, 0.1)
        L = h * rnd.uniform(0.22, 0.34)
        p0 = (x + math.cos(a) * r0 * 0.4, y + rnd.uniform(-2, 2), z + h * 0.76)
        p1 = (p0[0] + math.cos(a) * L, p0[1] + rnd.uniform(-3, 3), p0[2] + math.sin(a) * L * 0.8)
        gb.capsule(p0, p1, h * 0.04, h * 0.022)
        ga.blob((p1[0], p1[1], p1[2] + h * 0.03), (h * 0.1, h * 0.08, h * 0.05), p=2.2, cuts=2)


def kopje(g, g2, x, y, z, r, h, seed=0, n=9):
    """A kopje: a heap of rounded granite boulders, wide at the foot and stacked to a crest."""
    rnd = random.Random(seed)
    for k in range(n):
        t = k / max(1, n - 1)
        rr = r * (0.55 - 0.3 * t) * rnd.uniform(0.85, 1.15)
        bx = x + rnd.uniform(-1, 1) * r * (0.75 - 0.5 * t)
        bz = z + h * t * 0.78 + rr * 0.45
        rock(g if k % 3 else g2, (bx, y + rnd.uniform(-0.3, 0.3) * r * 0.5, bz), (rr * 1.15, rr * 0.8, rr * 0.82), seed=seed * 31 + k, jag=0.1, p=2.2, cuts=3)


def termite_mound(g, g2, x, y, z, h, seed=0):
    """A termite mound: a lumpy spire of baked earth with two or three lower side spires and fins."""
    rnd = random.Random(seed)
    g.bm.verts.ensure_lookup_table()
    n0 = len(g.bm.verts)
    g.lathe([(0.01, 0), (h * 0.34, 0), (h * 0.25, h * 0.3), (h * 0.17, h * 0.62), (h * 0.07, h * 0.94), (0.01, h)], (x, y, z), (x, y, z + h), segs=12)
    _jitter(g, n0, (x, y, z + h * 0.5), 0.12, seed, 2.4 / max(1.0, h * 0.4))
    for k in range(rnd.randint(2, 3)):
        sx = x + rnd.choice((-1, 1)) * h * rnd.uniform(0.16, 0.26)
        sh = h * rnd.uniform(0.4, 0.62)
        g2.lathe([(0.01, 0), (sh * 0.3, 0), (sh * 0.2, sh * 0.5), (sh * 0.07, sh * 0.92), (0.01, sh)], (sx, y + rnd.uniform(-2, 2), z), (sx, y, z + sh), segs=10)


def windmill_hub(x, y, z, h, r):
    """Where a `windmill_tower`'s sails turn: in front of its cap (the anchor for the sails prop)."""
    return (x, y - r * 0.86, z + h + r * 0.2)


def windmill_tower(P, x, y, z, h, r, body=0x8E8270, body_dk=0x766A5A, cap=0x5E5450, trim=0xE6DECC, dark=0x3E3834, octagon=True,
                   gallery=True, base=None, outline=0.5):
    """A tower (smock) mill: on an optional brick `base`, a strongly tapering body (eight-sided, or round), a
    stage gallery round its middle, a door and small windows on the camera face, a boat-shaped cap turned to
    the wind. The sails are a prop (`fauna.windmill_sails`, at `windmill_hub`). Returns the hub point and a
    window point (for a night light)."""
    gb, gd, gc = P.g(body, outline=outline), P.g(dark, outline=0.0, highlight=False), P.g(cap, outline=outline)
    segs = 8 if octagon else 18
    zb = z
    if base is not None:
        zb = z + h * 0.22
        P.g(base, outline=outline).lathe([(0.01, 0), (r * 1.04, 0), (r, h * 0.22), (0.01, h * 0.22)], (x, y, z), (x, y, zb), segs=segs, rot=(0, 0, 22.5))
    gb.lathe([(0.01, 0), (r * 0.98, 0), (r * 0.9, (z + h - zb) * 0.12), (r * 0.5, z + h - zb), (0.01, z + h - zb)], (x, y, zb), (x, y, z + h), segs=segs,
             rot=(0, 0, 22.5))
    if gallery:
        gg = P.g(body_dk, outline=0.3)
        zg = z + h * 0.3
        cyl(gg, (x, y, zg), (x, y, zg + 1.6), r * 1.2, bevel=0.3, segs=16)
        for k in range(10):
            a = math.pi * (1.05 + 0.9 * k / 9)
            gg.capsule((x + math.cos(a) * r * 1.18, y + math.sin(a) * r * 1.18, zg + 1.6), (x + math.cos(a) * r * 1.18, y + math.sin(a) * r * 1.18, zg + 6), 0.3)
    gd.slab([(x - r * 0.2, z), (x + r * 0.2, z), (x + r * 0.2, z + h * 0.15), (x - r * 0.2, z + h * 0.15)], y - r * 1.0, 0.8)
    win = None
    for f in (0.5, 0.74):
        rr = r * (0.98 - 0.48 * f)
        zz = z + h * f
        gd.slab([(x - rr * 0.14, zz), (x + rr * 0.14, zz), (x + rr * 0.14, zz + h * 0.06), (x - rr * 0.14, zz + h * 0.06)], y - rr * 0.97, 0.8)
        win = win or (x, y - rr - 1, zz + h * 0.03)
    gc.blob((x, y + r * 0.06, z + h + r * 0.22), (r * 0.58, r * 0.7, r * 0.3), p=2.4, taper=(1.0, 0.7))
    hub = windmill_hub(x, y, z, h, r)
    P.g(trim, outline=0.3).capsule((x, y - r * 0.4, hub[2]), (hub[0], hub[1] + 0.6, hub[2]), r * 0.12)
    return hub, win


def stepped_gable_house(P, x, y, z, w, h, steps=4, brick=0x9A6A58, brick_dk=0x7E5648, trim=0xE6DECC, dark=0x3E3834, d=None, yaw=0.0,
                        hoist=True, outline=0.5):
    """A Hanseatic town house or warehouse facing the camera: a tall brick front with a crow-stepped gable,
    pale string courses, rows of dark windows (a loading door stack in the middle with a hoist beam), a deep
    body behind. Returns a window point (for a night light)."""
    gb, gb2, gt, gd = P.g(brick, outline=outline), P.g(brick_dk, outline=0.3), P.g(trim, outline=0.0), P.g(dark, outline=0.0, highlight=False)
    d = d or w * 1.2
    box(gb2, (x, y + d / 2, z + h / 2), (w * 0.48, d / 2, h / 2), p=8, cuts=1, rot=(0, 0, yaw))
    sw, sh = w / (2 * steps + 1), h * 0.11       # one step of the gable: in, then up (mirrored on the left)
    right = [p_ for k in range(steps) for p_ in ((x + w / 2 - (k + 1) * sw, z + h + k * sh), (x + w / 2 - (k + 1) * sw, z + h + (k + 1) * sh))]
    left = [p_ for k in range(steps - 1, -1, -1) for p_ in ((x - w / 2 + (k + 1) * sw, z + h + (k + 1) * sh), (x - w / 2 + (k + 1) * sw, z + h + k * sh))]
    gb.slab([(x - w / 2, z), (x + w / 2, z), (x + w / 2, z + h)] + right + left + [(x - w / 2, z + h)], y, 3.0, rot=(0, 0, yaw), origin=(x, y, 0))
    for zz in (z + h * 0.34, z + h * 0.68):
        gt.slab([(x - w / 2, zz), (x + w / 2, zz), (x + w / 2, zz + 0.9), (x - w / 2, zz + 0.9)], y - 1.7, 0.4, rot=(0, 0, yaw), origin=(x, y, 0))
    cols = max(2, int(w / 7))
    win = None
    for row in range(3):
        zz = z + h * (0.1 + row * 0.3)
        for c in range(cols):
            cx = x - w / 2 + w * (c + 0.5) / cols
            if hoist and c == cols // 2:
                gd.slab([(cx - 1.8, zz), (cx + 1.8, zz), (cx + 1.8, zz + h * 0.2), (cx - 1.8, zz + h * 0.2)], y - 1.8, 0.4, rot=(0, 0, yaw), origin=(x, y, 0))
                continue
            gd.slab([(cx - 1.2, zz + h * 0.04), (cx + 1.2, zz + h * 0.04), (cx + 1.2, zz + h * 0.17), (cx - 1.2, zz + h * 0.17)], y - 1.8, 0.4,
                    rot=(0, 0, yaw), origin=(x, y, 0))
            win = win or (cx, y - 3, zz + h * 0.1)
    if hoist:
        gt2 = P.g(brick_dk, outline=0.2)
        gt2.capsule((x, y - 1, z + h + steps * sh * 0.7), (x, y - 6, z + h + steps * sh * 0.7), 0.6)
    return win


def church(P, x, y, z, nave_w, nave_h, tower_h, stone=0xC8BCA8, stone_dk=0xA89C88, roof=0x6B7682, spire=0x57616D, dark=0x3E3834, yaw=0.0,
           outline=0.5):
    """A church: a long nave with a steep roof, a square west tower with belfry openings, and a tall slender
    spire (four-sided). Returns the spire's tip and a window point."""
    gs, gs2, gr, gp, gd = P.g(stone, outline=outline), P.g(stone_dk, outline=0.3), P.g(roof, outline=0.4), P.g(spire, outline=0.4), P.g(dark, outline=0.0, highlight=False)
    box(gs2, (x + nave_w * 0.6, y + 6, z + nave_h / 2), (nave_w / 2, 9, nave_h / 2), p=8, cuts=1, rot=(0, 0, yaw))
    gable_roof(gr, x + nave_w * 0.6, y + 6, z + nave_h, nave_w, 18, nave_h * 0.7, yaw=yaw)
    tw = nave_h * 0.62
    box(gs, (x, y, z + tower_h / 2), (tw / 2, tw / 2, tower_h / 2), p=8, cuts=2, rot=(0, 0, yaw))
    for zz in (z + tower_h * 0.4, z + tower_h * 0.8):
        gd.slab([(x - tw * 0.14, zz), (x + tw * 0.14, zz), (x + tw * 0.14, zz + tower_h * 0.1), (x - tw * 0.14, zz + tower_h * 0.1)], y - tw / 2 - 0.5, 0.6)
    sh = tower_h * 1.15
    gp.lathe([(0.01, 0), (tw * 0.74, 0), (tw * 0.5, sh * 0.08), (0.4, sh), (0.01, sh * 1.01)], (x, y, z + tower_h), (x, y, z + tower_h + sh), segs=4, rot=(0, 0, 45 + yaw))
    for k in range(3):
        gd.slab([(x + nave_w * 0.25 + k * nave_w * 0.25 - 1.4, z + nave_h * 0.3), (x + nave_w * 0.25 + k * nave_w * 0.25 + 1.4, z + nave_h * 0.3),
                 (x + nave_w * 0.25 + k * nave_w * 0.25 + 1.4, z + nave_h * 0.75), (x + nave_w * 0.25 + k * nave_w * 0.25 - 1.4, z + nave_h * 0.75)], y - 3.4, 0.6)
    return (x, y, z + tower_h + sh), (x + nave_w * 0.5, y - 5, z + nave_h * 0.5)


def stone_lighthouse(P, st, x, y, z, h, stone=0xD6CCB8, band=0x8E6A5A, stone_dk=0xA89C88, glass=0x8EA4A4, dark=0x3E3834, outline=0.4):
    """A stone lighthouse: a tapering round tower with two bands, a gallery, the lantern room and a dark cap,
    small windows; its lamp and a window light at night. Returns the lamp point."""
    gs, gb = P.g(stone, outline=outline), P.g(band, outline=0.3)
    r0, r1 = h * 0.12, h * 0.085
    cyl(gs, (x, y, z), (x, y, z + h), r0, r1, bevel=0.6, segs=18)
    for f in (0.33, 0.68):
        zb = z + h * f
        rr = r0 + (r1 - r0) * f + 0.25
        cyl(gb, (x, y, zb), (x, y, zb + h * 0.08), rr, rr - (r0 - r1) * 0.08, bevel=0.2, segs=18)
    cyl(P.g(stone_dk, outline=0.3), (x, y, z + h - 1), (x, y, z + h + 2.4), r1 * 1.35, bevel=0.3, segs=18)
    cyl(P.g(glass, finish="gloss", outline=0.3), (x, y, z + h + 2.4), (x, y, z + h + h * 0.13), r1 * 0.75, bevel=0.2, segs=14)
    P.g(dark, outline=0.3).lathe([(0.01, 0), (r1 * 0.95, 0), (r1 * 0.8, h * 0.03), (r1 * 0.3, h * 0.08), (0.01, h * 0.1)], (x, y, z + h + h * 0.13),
                                 (x, y, z + h + h * 0.23), segs=14)
    gd = P.g(dark, outline=0.0, highlight=False)
    for f in (0.18, 0.5, 0.82):
        rr = r0 + (r1 - r0) * f
        box(gd, (x, y - rr + 0.3, z + h * f), (1.1, 0.5, 2.2), p=4, cuts=1)
    lamp = (x, y - r1 * 0.5, z + h + h * 0.08)
    st.light(lamp, 6)
    st.light((x, y - r0, z + h * 0.5), 3)
    return lamp
