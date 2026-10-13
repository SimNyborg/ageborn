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
