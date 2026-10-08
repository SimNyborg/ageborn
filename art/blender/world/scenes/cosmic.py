"""Cosmic scenes (DESIGN A17.12: ringed planets, nebula clouds, drifting asteroids; the Future space-tech
kit, PLAN 2b "the Future and Cosmic merge").

Classic "Crystal Moon Base" (format 2, the first Blender layers for Cosmic): a moon base among crystal
spires under a dark violet sky with stars and nebula glows (painted by the game). Back: a pale ringed
planet and distant crystal ranges. Far: cratered moon ridges, crystal spire clusters, glass domes with
landing rings and a comms tower with a turning dish. Mid: white habitat modules with violet bands and lit
round windows, a greenhouse dome, crystal outcrops, beacon masts and a landing pad where a shuttle lands
every 40 s; a rover drives along the ridge. Ambient: beacons blink, crystals glint, the shuttle lands and
lifts off, the rover crawls, the dish turns.

Palette (A17.12): void #1E1830, nebula violet #8E44C8, star white #F2F0FF, mint #3FE0B0 accents. Saturated
colours stay outside the team-hue bands (violets at hue 258-300, mint at 162; A11 colour rule).
Hints: `weather: 'space'` (a sky theme's snow, rain and petals become ice motes, meteors and sparkles) and
`celestial: 'own'` (the planet is this sky's object: a sky theme brings its colours and stars, no sun or
moon). Less haze than the A11 default (`look`): there is no air on the moon; the colour rule still holds.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.common import box, cyl, rock
from world.scenes import kit
from world.scenes.common import Prop, Scene, mixc, ridge
from world.scenes.kit import Parts

PAL = dict(skyTop=0x241C3C, skyBottom=0x5C4884, light=0xE8E4FF, far=0x4A3E6E, mid=0x36305A, near=0x262040)
K = dict(
    regolith=0x615B76, regolith_dk=0x524C66, regolith_lt=0x77718C, crater=0x48435C, crystal=0xB89EE8,
    crystal_dk=0x8058CE, crystal_deep=0x6642B6, hull=0xE6E4F0, hull_dk=0xB8B4CC, band=0x7460B0, metal=0x9A98AC,
    metal_dk=0x5E5C70, glass=0xD6D0EE, mint=0x3FE0B0, mint_lt=0x9CF0D4, lilac=0xD8C8FF, window=0xBFF3E0,
    plant=0x6EBA8A, planet=0xA48AB0, planet_band=0x8C74A0, ring=0xD8CCE8,
)
SKY = {"top": "#241C3C", "bottom": "#5C4884", "horizon": "#6C5894", "cloudTint": "#6A5A8A", "celestial": "none",
       "stars": 170, "nebula": True, "clouds": 0}
MID_E = math.radians(12.0)
FAR_E = math.radians(8.0)
# With your base at the left the strips' x 0-800 show (from about 850 the seam cross-fades), and a phone
# shrinks the far and back strips toward the ground line under the HUD's top bar: the moving props and
# the planet sit where both see them.
PAD = (580.0, 66.0, 52.0)      # the landing pad's deck centre (mid layer)
DISH = (190.0, 250.0, 170.0)   # the comms dish pivot (far layer)
PLANET = (820.0, 1500.0, 185.0)  # the ringed planet (back layer), rising behind the ridges


def scr(p, e):
    x, y, z = p
    return [round(x, 1), -round(z * math.cos(e) + y * math.sin(e), 1)]


def crystal(g, x, y, z, h, r, lean=(0.0, 0.0), seed=0):
    """A faceted crystal: a six-sided prism with a pointed tip, leaning a little."""
    rnd = random.Random(seed)
    top = (x + lean[0] * h, y + lean[1] * h, z + h)
    g.lathe([(0.01, 0), (r, 0), (r * 1.02, h * 0.06), (r * 0.9, h * 0.76), (0.01, h)], (x, y, z), top, segs=6,
            rot=(0, 0, rnd.uniform(0, 60)))


def cluster(gs, x, y, z, n, h, r, seed=0, glow=None):
    """A spray of crystals round one big spire (and a small glowing shard at its foot when `glow` is a Geo)."""
    rnd = random.Random(seed)
    crystal(gs[0], x, y, z - 4, h, r, (rnd.uniform(-0.05, 0.05), 0), seed)
    if glow is not None:
        crystal(glow, x + r * 0.8, y - r * 1.2, z - 3, h * 0.22, r * 0.4, (0.12, 0), seed + 99)
        crystal(glow, x - r * 1.1, y - r, z - 3, h * 0.16, r * 0.32, (-0.15, 0), seed + 98)
    for k in range(n):
        a = (k + 0.5) / n
        side = -1 if k % 2 else 1
        hh = h * rnd.uniform(0.3, 0.7)
        crystal(gs[k % len(gs)], x + side * r * rnd.uniform(0.9, 2.2), y + rnd.uniform(-6, 8), z - 4, hh, r * rnd.uniform(0.45, 0.75),
                (side * rnd.uniform(0.08, 0.3) * a + side * 0.06, rnd.uniform(-0.05, 0.05)), seed + k + 1)


def crater(P, x, y, z, rx, seed=0):
    """A crater on a slope: a raised rim round a darker floor."""
    gr = P.g(K["regolith_lt"], outline=0.0)
    gf = P.g(K["crater"], outline=0.0)
    gr.lathe([(rx * 0.78, 0), (rx, 0.2), (rx * 0.96, 2.8), (rx * 0.82, 3.6), (rx * 0.7, 1.2)], (x, y, z), (x, y, z + 3.6), segs=24,
             squash=(1.0, 0.42))
    gf.lathe([(0.01, 0), (rx * 0.74, 0), (rx * 0.74, 0.6), (0.01, 0.6)], (x, y, z + 0.4), (x, y, z + 1.0), segs=24, squash=(1.0, 0.4))


def dome(P, x, y, z, r, base_h=10.0, ring=True):
    """A glass dome on a white hull drum with a mint light strip; a landing ring round it on struts."""
    gh = P.g(K["hull"], outline=0.5)
    gg = P.g(K["glass"], finish="gloss", outline=0.5)
    gm = P.g(K["mint"], glow=True)
    cyl(gh, (x, y, z), (x, y, z + base_h), r * 1.08, bevel=1.2, segs=32)
    gg.lathe([(r * math.cos(math.pi / 2 * k / 10), r * 0.86 * math.sin(math.pi / 2 * k / 10)) for k in range(11)],
             (x, y, z + base_h), (x, y, z + base_h + r * 0.86), segs=32)
    gr = P.g(K["band"], outline=0.4)
    gr.lathe([(r * 0.2, 0), (r * 0.26, 0), (r * 0.26, 2.6), (r * 0.2, 2.6)], (x, y, z + base_h + r * 0.84), (x, y, z + base_h + r * 0.84 + 2.6),
             segs=16)
    cyl(gm, (x, y, z + base_h * 0.45), (x, y, z + base_h * 0.45 + 1.6), r * 1.09 + 0.3, bevel=0.2, segs=32)
    if ring:
        gmetal = P.g(K["metal"], finish="metal", outline=0.4)
        R = r * 1.7
        gmetal.lathe([(R - 3.2, -1.4), (R + 3.2, -1.4), (R + 3.2, 1.4), (R - 3.2, 1.4)], (x, y, z + base_h * 0.6),
                     (x, y, z + base_h * 0.6 + 1), segs=40, squash=(1.0, 0.55))
        for k in range(8):
            a = math.pi * 2 * k / 8 + 0.2
            px, py = x + math.cos(a) * R, y + math.sin(a) * R * 0.55
            if py > y + R * 0.3:
                continue
            gmetal.capsule((px, py, z - 6), (px, py, z + base_h * 0.6), 1.2)
            gm.sphere((px, py - 1, z + base_h * 0.6 + 2.4), 1.4, cuts=2)


def habitat(P, st, x, y, z, length, r, windows=4, lights=True):
    """A white habitat module lying along x: violet bands, round lit windows, a hatch."""
    gh = P.g(K["hull"], outline=0.5)
    gb = P.g(K["band"], outline=0.4)
    gw = P.g(K["window"], glow=True)
    gk = P.g(K["hull_dk"], outline=0.4)
    gh.capsule((x - length / 2, y, z + r), (x + length / 2, y, z + r), r, r, segs=20)
    for t in (0.2, 0.8):
        bx = x - length / 2 + length * t
        gb.lathe([(r + 0.2, -1.4), (r + 0.9, -1.4), (r + 0.9, 1.4), (r + 0.2, 1.4)], (bx, y, z + r), (bx + 1, y, z + r), segs=24)
    for k in range(windows):
        wx = x - length * 0.32 + length * 0.64 * k / max(1, windows - 1)
        gw.lathe([(0.01, 0), (r * 0.22, 0), (r * 0.22, 0.6), (0.01, 0.6)], (wx, y - r * 0.96, z + r * 1.05), (wx, y - r * 1.1, z + r * 1.05),
                 segs=12)
        if lights and k % 2 == 0:
            st.light((wx, y - r, z + r * 1.05), 4.5)
    for side in (-1, 1):
        box(gk, (x + side * length * 0.42, y, z + 1.6), (3, r * 0.6, 3.2), p=5, cuts=1)


def back(st, P):
    """A pale ringed planet low in the sky and distant crystal ranges."""
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    pt = Parts()
    px, py, pz = PLANET
    R = 54.0
    pt.g(hz(K["planet"], 0.42), outline=0.0).sphere((px, py, pz), R, cuts=6)
    gbnd = pt.g(hz(K["planet_band"], 0.42), outline=0.0)
    for dz, w in ((10, 4.4), (-8, 3.6), (22, 2.6)):
        rr = math.sqrt(max(1.0, R * R - dz * dz)) + 0.3
        gbnd.lathe([(rr - 0.3, -w / 2), (rr, -w / 2), (rr, w / 2), (rr - 0.3, w / 2)], (px, py, pz + dz), (px, py, pz + dz + 1), segs=40)
    pt.g(hz(K["ring"], 0.42), outline=0.0).lathe([(60, -0.4), (88, -0.4), (88, 0.4), (60, 0.4)], (px, py, pz), (px - 0.22, py - 1, pz + 0.1),
                                                 segs=64, squash=(1.0, 0.2))
    ridge(st, hz(0x6A6084, 0.4), -300, 1500, -60, 200, 1400, 71, lumps=9, jag=0.1, peaks=False)
    gc = pt.g(hz(K["crystal"], 0.42), outline=0.0)
    rnd = random.Random(5)
    for i in range(11):
        x = -240 + i * 160 + rnd.uniform(-40, 40)
        crystal(gc, x, 1350, 60, rnd.uniform(70, 170), rnd.uniform(12, 20), (rnd.uniform(-0.12, 0.12), 0), seed=i)
    pt.flush(st)


def far(st, P):
    pt = Parts()
    rnd = random.Random(51)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    ridge(st, hz(0x6E6688, 0.3), -300, 1500, -20, 160, 560, 7, lumps=9, jag=0.1, peaks=False)
    g = pt.g(K["regolith"], outline=0.0)
    for x, rx, h, seed in ((-150, 260, 120, 1), (330, 240, 95, 2), (760, 280, 110, 3), (1220, 300, 125, 4)):
        kit.hill(g, x, 320, -10, rx, 90, h, seed=seed, jag=0.06, p=2.3)
    for i in range(14):
        crater(pt, rnd.uniform(-240, 1440), rnd.uniform(240, 262), rnd.uniform(30, 80), rnd.uniform(10, 24), seed=i)
    # crystal spire clusters (the big one at x 520 is the signature)
    gs = [pt.g(K["crystal"], finish="gloss", outline=0.5), pt.g(K["crystal_dk"], finish="gloss", outline=0.5)]
    gs.append(pt.g(K["crystal_deep"], finish="gloss", outline=0.5))
    gglow = pt.g(K["lilac"], glow=True)
    cluster(gs, 520, 250, 60, 7, 270, 21, seed=11, glow=gglow)
    cluster(gs, 120, 262, 60, 5, 180, 15, seed=12, glow=gglow)
    cluster(gs, 1290, 252, 76, 6, 220, 17, seed=13, glow=gglow)
    cluster(gs, 880, 270, 64, 4, 130, 12, seed=14)
    for x, h in ((520, 250), (120, 160), (1290, 200)):
        st.amb("blink", "fx.p.star", (x, 240, 60 + h * 0.96), period=2600, tint=0xF2F0FF, scale=0.65)
    # domes with landing rings
    dome(pt, 330, 240, 52, 42)
    dome(pt, 960, 236, 56, 34)
    for x in (330, 960):
        st.light((x, 200, 64), 6)
    # the comms tower (its dish turns as a prop) with a beacon
    gi = pt.g(K["metal_dk"], outline=0.4)
    dx, dy, dz = DISH
    for sx in (-8, 8):
        gi.capsule((dx + sx, dy, 60), (dx + sx * 0.3, dy, dz - 8), 1.6)
    for k in range(5):
        z0 = 60 + k * (dz - 70) / 5
        gi.capsule((dx - 8 + k * 1.1, dy, z0), (dx + 8 - (k + 1) * 1.1, dy, z0 + (dz - 70) / 5), 0.8)
    st.amb("blink", "bd.light", (dx, dy, dz + 26), period=1500, tint=0xF6C6E4)
    # small habitat blocks round the domes
    for x, z in ((250, 54), (410, 50), (1030, 58)):
        box(pt.g(K["hull"], outline=0.4), (x, 228, z + 6), (14, 9, 6), p=6, cuts=2)
        box(pt.g(K["band"], outline=0.0), (x, 218.6, z + 7), (10, 0.6, 1.2), p=4, cuts=1)
    pt.flush(st)


def mid(st, P):
    pt = Parts()
    rnd = random.Random(61)
    g = pt.g(K["regolith_dk"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 38 + rnd.uniform(0, 10)), seed=i, jag=0.06, p=2.4)
    for i in range(8):
        crater(pt, rnd.uniform(-240, 1440), rnd.uniform(40, 60), 40, rnd.uniform(9, 16), seed=100 + i)
    gr = pt.g(K["crater"], outline=0.5)
    for i in range(16):
        rock(gr, (rnd.uniform(-250, 1450), rnd.uniform(30, 50), 40), (rnd.uniform(5, 10), 6, rnd.uniform(4, 8)), seed=200 + i, jag=0.25)
    # habitat modules (left) linked by a tube, an antenna on top
    habitat(pt, st, -170, 70, 38, 128, 21)
    habitat(pt, st, -20, 84, 44, 104, 18, windows=3)
    habitat(pt, st, 120, 70, 38, 116, 20)
    pt.g(K["hull_dk"], outline=0.4).capsule((-112, 76, 66), (-76, 80, 66), 7)
    pt.g(K["hull_dk"], outline=0.4).capsule((36, 78, 64), (64, 74, 64), 7)
    gi = pt.g(K["metal_dk"], outline=0.4)
    gi.capsule((-20, 84, 78), (-20, 84, 160), 1.8)
    pt.g(K["hull"], finish="gloss", outline=0.4).lathe([(0.01, 0), (8, 1.6), (9, 3.6), (0.01, 1.8)], (-19, 83, 144), (-13, 78, 149), segs=16)
    st.amb("blink", "bd.light", (-20, 84, 164), period=1200, tint=0xD8FFF0)
    # the greenhouse dome (right) and a second block
    gh = pt.g(K["hull"], outline=0.5)
    cyl(gh, (1090, 80, 40), (1090, 80, 50), 44, bevel=1.2, segs=32)
    pt.g(K["plant"], outline=0.4).blob((1090, 84, 56), (34, 20, 10), p=2.2)
    pt.g(K["glass"], finish="gloss", outline=0.5).lathe([(40 * math.cos(math.pi / 2 * k / 10), 34 * math.sin(math.pi / 2 * k / 10)) for k in range(11)],
                                                       (1090, 80, 50), (1090, 80, 84), segs=32)
    habitat(pt, st, 1220, 72, 38, 120, 20)
    habitat(pt, st, 1370, 82, 42, 96, 17, windows=3)
    # crystal outcrops
    gs = [pt.g(K["crystal"], finish="gloss", outline=0.5), pt.g(K["crystal_dk"], finish="gloss", outline=0.5),
          pt.g(K["crystal_deep"], finish="gloss", outline=0.5)]
    gglow = pt.g(K["lilac"], glow=True)
    for x, h, r, n in ((270, 140, 12, 6), (420, 90, 9, 4), (820, 150, 13, 6), (960, 84, 8, 4), (1450, 120, 11, 5)):
        cluster(gs, x, 66, 40, n, h, r, seed=int(x), glow=gglow if h > 100 else None)
        st.amb("blink", "fx.p.star", (x, 56, 40 + h * 0.95), period=2600, tint=0xF2F0FF, scale=0.65)
    # the landing pad: an octagonal deck on legs with mint edge lights
    px, py, pz = PAD
    gm = pt.g(K["metal"], finish="metal", outline=0.5)
    gm.lathe([(0.01, 0), (54, 0), (57, 2.2), (54, 4.4), (0.01, 4.4)], (px, py, pz - 4.4), (px, py, pz), segs=8, rot=(0, 0, 22.5), squash=(1.0, 0.5))
    for a in range(0, 360, 90):
        r = math.radians(a + 45)
        gm.capsule((px + math.cos(r) * 40, py + math.sin(r) * 18, 34), (px + math.cos(r) * 34, py + math.sin(r) * 15, pz - 3), 2.2)
    gl = pt.g(K["mint"], glow=True)
    for a in range(0, 360, 45):
        r = math.radians(a + 22.5)
        if math.sin(r) > 0.3:
            continue
        gl.sphere((px + math.cos(r) * 54, py + math.sin(r) * 27 - 1, pz + 0.8), 2.0, cuts=2)
    pt.g(K["band"], outline=0.0).lathe([(19, 0), (22, 0), (22, 0.6), (19, 0.6)], (px, py, pz + 0.2), (px, py, pz + 0.8), segs=24,
                                       squash=(1.0, 0.5))
    st.light((px, py - 22, pz + 2), 7)
    # beacon masts
    for x in (220, 700, 1010):
        gi.capsule((x, 60, 40), (x, 60, 130), 2.0)
        pt.g(K["hull"], finish="gloss", outline=0.4).lathe([(0.01, 0), (6.5, 1.4), (7.4, 3.2), (0.01, 1.6)], (x + 1, 59, 112),
                                                           (x + 6, 55, 116), segs=16)
        box(pt.g(K["hull_dk"], outline=0.3), (x, 60, 42), (7, 5, 3.4), p=5, cuts=1)
        st.amb("blink", "bd.light", (x, 60, 134), period=1200, tint=0xD8FFF0)
    pt.flush(st)


# -- props ----------------------------------------------------------------------------------------
def _shuttle(flame):
    def build(rig0):
        rig0.joint("s", "all", (0, 0, 0), scale=1.45)
        rig = _Into(rig0, "s")
        rig.part("all", Geo().blob((0, 0, 12), (20, 7, 6.4), p=2.6, taper=(1.0, 0.8)), "#E6E4F0", finish="gloss", outline=0.5)
        rig.part("all", Geo().blob((10, -2, 15), (6, 4.6, 3.4), p=2.4), "#6E48B8", finish="gloss", outline=0.4)
        g = Geo().slab([(-18, 10), (-6, 10), (-14, 22), (-20, 22)], 0, 2.4)
        rig.part("all", g, "#7460B0", outline=0.4)
        g = Geo()
        for sx in (-12, 10):
            g.capsule((sx, 0, 6), (sx - 4, 0, 0), 1.0)
            g.blob((sx - 4.6, 0, 0), (3, 2, 0.8), p=3.0)
        rig.part("all", g, "#5E5C70", outline=0.3)
        if flame:
            k = 1.0 if flame == 1 else 1.35
            rig.part("all", Geo().blob((-21, 0, 10), (5 * k, 3, 2.6), p=2.0, taper=(1.0, 1.0), rot=(0, 0, 0)), glow="#9CF0D4", outline=0)
            rig.part("all", Geo().blob((-6, 0, 3), (3, 2.4, 5 * k), p=2.0, taper=(0.25, 1.0)), glow="#BFF3E0", outline=0)
    return build


class _Into:
    """Routes parts added to "all" onto another joint (a scaled sub-joint)."""

    def __init__(self, rig, joint):
        self.rig = rig
        self.j = joint

    def part(self, joint, geo, *a, **k):
        return self.rig.part(self.j if joint == "all" else joint, geo, *a, **k)


def _rover(rig):
    rig.part("all", Geo().blob((0, 0, 9), (14, 6, 4.6), p=3.6), "#E6E4F0", outline=0.5)
    rig.part("all", Geo().blob((6, -1, 14), (6, 4.4, 3.2), p=2.6), "#6E48B8", finish="gloss", outline=0.4)
    rig.part("all", Geo().capsule((-8, 0, 13), (-8, 0, 24), 0.6), "#5E5C70", outline=0.2)
    rig.part("all", Geo().sphere((-8, 0, 25), 1.4, cuts=2), glow="#3FE0B0", outline=0)
    for k in range(2):
        rig.joint(f"w{k}", "all", (0, 0, 0), hidden=True)
        g = Geo()
        for x in (-9, 0, 9):
            g.lathe([(0, -0.9), (3.6, -0.9), (3.6, 0.9), (0, 0.9)], (x, -6, 3.6), (x, -7, 3.6), segs=10, rot=(0, 0, 18 * k))
        rig.part(f"w{k}", g, "#4A4858", outline=0.4)


def _dish(rig):
    rig.joint("d", "all", (0, 0, 0))
    g = Geo().lathe([(0.01, 0), (12, 2.4), (14, 6), (13, 6.4), (0.01, 3)], (0, 0, 0), (-0.6, -1, 0.2), segs=20)
    rig.part("d", g, "#D8D6E4", finish="gloss", outline=0.4)
    rig.part("d", Geo().capsule((0, -1, 0.5), (0, -9, 1.2), 0.7), "#5E5C70", outline=0.2)
    rig.part("d", Geo().sphere((0, -9.6, 1.3), 1.1, cuts=2), glow="#3FE0B0", outline=0)


def props():
    px, py, pz = PAD
    pad = scr((px, py, pz), MID_E)
    land = [pad[0], pad[1]]
    plist = [
        Prop("shuttle", "mid", _shuttle(1), [{}], (86, 46, 10), pad[1]),
        Prop("shuttleb", "mid", _shuttle(2), [{}], (86, 46, 10), pad[1]),
        Prop("parked", "mid", _shuttle(0), [{}], (86, 46, 10), pad[1]),
        Prop("rover", "mid", _rover, [{"w0": {"show": True}}, {"w1": {"show": True}}], (40, 30, 3), -58),
        Prop("dish", "far", _dish, [{"d": {"rz": a}} for a in (-34, -12, 12, 34)], (36, 20, 18), scr(DISH, FAR_E)[1]),
    ]
    sprites = [
        {"kind": "path", "layer": "mid", "fps": 10, "periodS": 40,
         "keys": [[0, land[0] + 150, -330, 0, 0], [1.2, land[0] + 130, -290, 1, 1], [7, land[0], land[1], 1, 0], [7.05, land[0], land[1], 0, 0],
                  [16.95, land[0], land[1], 0, 0], [17, land[0], land[1], 1, 1], [23, land[0] - 130, -300, 1, 0], [24.2, land[0] - 150, -340, 0, 0]],
         "face": "fixed", "group": [{"frames": ["shuttle_0", "shuttleb_0"], "dx": 0, "dy": 0}]},
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 40, "keys": [[7, land[0], land[1], 1], [17, land[0], land[1], 1]],
         "face": "fixed", "group": [{"frames": ["parked_0"], "dx": 0, "dy": 0}]},
        {"kind": "path", "layer": "mid", "fps": 4, "periodS": 150, "keys": [[0, -330, -57, 1], [150, 1540, -57, 1]],
         "group": [{"frames": ["rover_0", "rover_1"], "dx": 0, "dy": 0}]},
        {"kind": "loop", "layer": "far", "frames": [f"dish_{k}" for k in range(4)], "fps": 1.5, "pingpong": True, "at": scr(DISH, FAR_E)},
    ]
    return plist, sprites


SCENES = {
    # the ringed planet is this sky's object: a sky theme brings its stars and colours, not a second moon
    "classic": Scene("cosmic", "classic", PAL, far, mid, back=back, sky=SKY, props=props,
                     hints={"celestial": "own", "weather": "space", "skyGrade": 0.35}, ground="deck",
                     # no air on the moon: less haze and desaturation than the A11 default (still muted)
                     look={"back": (0.26, 0.22, 0.3), "far": (0.16, 0.06, 0.14), "mid": (0.1, 0.0, 0.06)}),
}
