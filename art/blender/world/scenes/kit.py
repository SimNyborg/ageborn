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
