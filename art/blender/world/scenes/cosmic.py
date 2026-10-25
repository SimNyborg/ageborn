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

"Nebula Shipyard" (format 2, round 3; Epic, Wardrobe Crate; a set with Nebula Ark): a star-ark under
construction in an orbital drydock, the same space hints as the classic; its description is at its
constants.
"""
import math
import random

from ageborn_art.geometry import Geo

from world.common import box, cyl, rock
from world.scenes import fauna, kit
from world.scenes.common import PaintedProp, Prop, Scene, mixc, ridge, rgb01
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


# -- Ringed Giant (round 2; Rare, Time Capsule) --------------------------------------------------------
# An orbital outpost on a moonlet under a ringed gas giant (`celestial: 'own'`, `weather: 'space'`): the
# giant fills a third of the sky, three times the classic's small planet, banded ochre and violet, its
# rings crossing in front and behind; an asteroid belt beyond. Far: the moonlet's cratered ridges, the
# station: a habitat wheel on a pylon, a docking tower, domes and solar arrays. Mid: the station deck:
# truss struts, solar panels, a docking bay with a shuttle at its clamp, cargo pods and antenna masts.
# Ambient: asteroids drift past, a shooting star now and then, the docked shuttle bobs at its clamp,
# the station lights blink; windows and bay lights glow under night skies.
# Palette (PLAN 2b): void #1E1830, planet ochre-violet #A88A9A (low saturation), star white; station
# hulls as the classic's (white-lilac, violet bands, mint lights). Violets and ochre-violets sit outside
# the team-hue bands; mint lights are small accents.
RG_PAL = dict(skyTop=0x1C1830, skyBottom=0x403462, light=0xE8E4FF, far=0x4A3E6E, mid=0x36305A, near=0x262040)
RG = dict(
    planet=0xA88A9A, band1=0x8E7088, band2=0xC0A8AC, band3=0x7A6078, band4=0xB49488, ring=0xD4C8DC, ring2=0xA898B4, ring3=0x8C7EA0,
    regolith=0x5E5872, regolith_dk=0x4C4660, regolith_lt=0x726C86, crater=0x443F58, hull=0xE6E4F0, hull_dk=0xB8B4CC, band=0x7460B0,
    metal=0x9A98AC, metal_dk=0x5E5C70, panel=0x4A4A7A, panel_lt=0x6A6AA0, glass=0xD6D0EE, mint=0x3FE0B0, window=0xBFF3E0, pod=0xC8B8A4,
    rock=0x6A6274,
)
RG_SKY = {"top": "#1C1630", "bottom": "#3E3262", "horizon": "#4A3C70", "cloudTint": "#5A4C80", "celestial": "none",
          "stars": 220, "nebula": False, "clouds": 0}
RG_FAR_E = math.radians(8.0)
RG_MID_E = math.radians(12.0)
RG_PLANET = (430.0, 1500.0, 120.0, 168.0)     # the giant (back): x, depth, z, radius (rising behind the
                                             # moonlet, so a phone shows its banded middle under the HUD)
RG_DOCK = (690.0, 60.0, 92.0)                # the docking clamp (mid)


def rg_back(st, P):
    """The ringed giant: a banded sphere, its rings tilted across it, an asteroid belt beyond."""
    pt = Parts()
    px, py, pz, R = RG_PLANET
    pt.g(RG["planet"], outline=0.0).sphere((px, py, pz), R, cuts=8)
    bands = [(-0.62, 0.1, RG["band3"]), (-0.36, 0.08, RG["band1"]), (-0.12, 0.05, RG["band2"]), (0.1, 0.09, RG["band1"]), (0.34, 0.06, RG["band4"]),
             (0.55, 0.07, RG["band3"]), (0.76, 0.05, RG["band2"])]
    for (lat, w, c) in bands:
        z0, z1 = R * lat, R * (lat + w)
        r0 = math.sqrt(max(1.0, R * R - z0 * z0)) + 0.6
        r1 = math.sqrt(max(1.0, R * R - z1 * z1)) + 0.6
        pt.g(c, outline=0.0).lathe([(r0 - 0.4, 0), (r0, 0), (r1, z1 - z0), (r1 - 0.4, z1 - z0)], (px, py, pz + z0), (px, py, pz + z1), segs=48)
    # a storm spot
    pt.g(RG["band4"], outline=0.0).blob((px - R * 0.36, py - R * 0.92, pz - R * 0.2), (R * 0.16, R * 0.06, R * 0.07), p=2.0)
    # the rings: three annuli round the planet, tipped toward the camera and tilted a little on screen
    tilt = (14.0, -12.0, 0.0)
    for (r0, r1, c) in ((R * 1.3, R * 1.6, RG["ring"]), (R * 1.64, R * 1.76, RG["ring2"]), (R * 1.82, R * 1.94, RG["ring3"])):
        kit.annulus(pt.g(c, outline=0.0), (px, py, pz), r0, r1, 1.6, rot=tilt, segs=128)
    # the asteroid belt: small rocks along a shallow arc across the sky
    rnd = random.Random(9)
    ga = pt.g(mixc(RG["rock"], P["skyBottom"], 0.2), outline=0.0)
    for k in range(46):
        x = -240 + k * 38 + rnd.uniform(-14, 14)
        if 760 < x < 1000:
            continue
        z = 200 + 40 * math.sin((x + 200) / 600) + rnd.uniform(-14, 14)
        rock(ga, (x, py + 300, z), (rnd.uniform(3, 7),) * 2 + (rnd.uniform(2.4, 5),), seed=200 + k, jag=0.3, p=2.0, cuts=2)
    pt.flush(st)


def rg_far(st, P):
    pt = Parts()
    rnd = random.Random(81)
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # 1. the moonlet: cratered ridges
    ridge(st, hz(0x5A5276, 0.26), -300, 1500, -20, 150, 640, 17, lumps=9, jag=0.1, peaks=False)
    g = pt.g(RG["regolith"], outline=0.0)
    for x, rx, h, seed in ((-150, 260, 110, 1), (330, 240, 90, 2), (760, 280, 104, 3), (1220, 300, 118, 4)):
        kit.hill(g, x, 340, -10, rx, 90, h, seed=seed, jag=0.06, p=2.3)
    for k in range(14):
        crater(pt, rnd.uniform(-240, 1440), rnd.uniform(250, 270), rnd.uniform(30, 80), rnd.uniform(10, 22), seed=k)
    # 2. the station: a habitat wheel on a pylon, a docking tower, domes, solar arrays
    gh, gb, gm, gmd = pt.g(RG["hull"], outline=0.5), pt.g(RG["band"], outline=0.4), pt.g(RG["metal"], finish="metal", outline=0.4), \
        pt.g(RG["metal_dk"], outline=0.4)
    gw = pt.g(RG["window"], glow=True)
    wx, wy, wz = 300.0, 300.0, 196.0
    gmd.capsule((wx, wy, 70), (wx, wy, wz - 30), 4.0, 3.0)
    # the wheel: a torus tipped toward the camera, spokes to a hub; hazed into the scene (round 3, review 2:
    # in the station's white it was the brightest thing in the half, brighter than the units)
    from mathutils import Euler, Vector
    tip = (68.0, 0.0, 0.0)
    ghw, gbw = pt.g(hz(RG["hull"], 0.34), outline=0.3), pt.g(hz(RG["band"], 0.3), outline=0.3)
    gmw = pt.g(hz(RG["metal_dk"], 0.24), outline=0.3)
    kit.tube_ring(ghw, (wx, wy, wz), 66, 7, rot=tip, segs=40)
    kit.annulus(gbw, (wx, wy, wz), 58.4, 59.6, 15.2, rot=tip, segs=64)
    e = Euler(tuple(math.radians(v) for v in tip), "XYZ").to_matrix()
    for k in range(6):
        a = math.pi * 2 * k / 6
        q = Vector((wx, wy, wz)) + e @ Vector((60 * math.cos(a), 60 * math.sin(a), 0))
        gmw.capsule((wx, wy, wz), tuple(q), 1.8)
    ghw.sphere((wx, wy, wz), 12, cuts=4)
    gbw.lathe([(12.4, -2), (13, -2), (13, 2), (12.4, 2)], (wx, wy, wz), (wx, wy, wz + 1), segs=24)
    for k in range(12):
        a = math.pi * 2 * (k + 0.5) / 12
        q = Vector((wx, wy, wz)) + e @ Vector((66 * math.cos(a), 66 * math.sin(a), 0)) + Vector((0, -7.2, 0))
        if q.y > wy:
            continue
        gw.sphere(tuple(q), 2.0, cuts=2)
        if k % 2 == 0:
            st.light(tuple(q), 4)
    # the docking tower with a beacon
    tx = 620.0
    box(gh, (tx, 310, 120), (16, 14, 60), p=6, cuts=2, taper=(1.12, 0.9))
    for t in (0.3, 0.6, 0.9):
        box(gb, (tx, 295.4, 64 + 120 * t), (14, 0.8, 2.2), p=4, cuts=1)
    cyl(gh, (tx, 310, 180), (tx, 310, 190), 24, bevel=1.2, segs=28)
    gm.capsule((tx, 310, 190), (tx, 310, 232), 1.6)
    st.amb("blink", "bd.light", (tx, 310, 236), period=1300, tint=0xD8FFF0)
    for k in range(3):
        st.light((tx - 8 + k * 8, 293, 150), 4)
    # domes
    dome(pt, 450, 290, 64, 30)
    dome(pt, 980, 300, 70, 36)
    st.light((450, 256, 74), 5)
    # solar arrays on masts
    gp, gpl = pt.g(RG["panel"], finish="gloss", outline=0.4), pt.g(RG["panel_lt"], outline=0.0)
    for x in (100, 820, 1160):
        gmd.capsule((x, 300, 80), (x, 300, 150), 2.0)
        for side in (-1, 1):
            box(gp, (x + side * 30, 300, 150), (24, 1.0, 12), p=10, cuts=1, rot=(-20, 0, 0))
            for k in range(3):
                box(gpl, (x + side * 30 - 16 + k * 16, 298.6, 150), (0.5, 1.0, 12), p=4, cuts=1, rot=(-20, 0, 0))
        st.amb("blink", "bd.light", (x, 300, 156), period=1700, tint=0xF6C6E4)
    pt.flush(st)


def rg_mid(st, P):
    pt = Parts()
    rnd = random.Random(83)
    # the deck: a regolith bank with plates
    g = pt.g(RG["regolith_dk"], outline=0.0)
    for i in range(15):
        x = -300 + i * 130
        rock(g, (x, 80, 8), (96, 60, 38 + rnd.uniform(0, 10)), seed=i, jag=0.06, p=2.4)
    for i in range(6):
        crater(pt, rnd.uniform(-240, 1440), rnd.uniform(40, 60), 40, rnd.uniform(9, 15), seed=100 + i)
    # truss struts along the deck
    gt = pt.g(RG["metal_dk"], outline=0.4)
    for x0 in (-240, 860):
        for k in range(10):
            x = x0 + k * 40
            gt.capsule((x, 70, 40), (x, 70, 96), 1.6)
            gt.capsule((x, 70, 96), (x + 40, 70, 96), 1.4)
            gt.capsule((x, 70, 40), (x + 40, 70, 96), 1.0)
        gt.capsule((x0, 70, 68), (x0 + 400, 70, 68), 1.2)
    # solar panel arrays on the trusses
    gp, gpl = pt.g(RG["panel"], finish="gloss", outline=0.5), pt.g(RG["panel_lt"], outline=0.0)
    for x in (-160, 0, 140, 940, 1100, 1260):
        box(gp, (x, 74, 110), (34, 1.0, 15), p=10, cuts=1, rot=(-24, 0, 0))
        for k in range(4):
            box(gpl, (x - 26 + k * 17, 72.2, 110), (0.6, 1.0, 15), p=4, cuts=1, rot=(-24, 0, 0))
    # the docking bay (x 600-780): a hangar ring with a clamp arm; the shuttle is a prop
    gh, gb = pt.g(RG["hull"], outline=0.5), pt.g(RG["band"], outline=0.4)
    dx, dy, dz = RG_DOCK
    box(gh, (dx, dy + 30, 64), (78, 22, 24), p=6, cuts=2)
    box(pt.g(0x2E2A44, outline=0.0, highlight=False), (dx, dy + 7.4, 66), (56, 0.6, 18), p=4, cuts=1)
    box(gb, (dx, dy + 7, 88), (76, 1.0, 2.4), p=4, cuts=1)
    gmd = pt.g(RG["metal"], finish="metal", outline=0.4)
    gmd.capsule((dx - 50, dy + 10, 88), (dx - 20, dy, dz - 4), 2.4)
    for k in range(5):
        st.light((dx - 48 + k * 24, dy + 6, 84), 4)
    # cargo pods and an antenna mast
    gpo = pt.g(RG["pod"], outline=0.5)
    for (x, z) in ((460, 40), (482, 40), (470, 60)):
        gpo.capsule((x - 8, 66, z + 8), (x + 8, 66, z + 8), 8)
    gt.capsule((380, 66, 40), (380, 66, 150), 1.6)
    pt.g(RG["hull"], finish="gloss", outline=0.4).lathe([(0.01, 0), (9, 1.6), (10, 3.6), (0.01, 1.8)], (381, 65, 132), (387, 60, 137), segs=16)
    st.amb("blink", "bd.light", (380, 66, 154), period=1200, tint=0xD8FFF0)
    habitat(pt, st, 220, 84, 40, 90, 17, windows=3)
    habitat(pt, st, 1380, 84, 40, 100, 18, windows=3)
    pt.flush(st)


def _star_streak(i):
    """A shooting star: a bright head and a tapering tail (one frame)."""
    import numpy as np
    w, h = 90, 12
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    t = xx / (w - 1)
    core = np.clip(1 - np.abs(yy - h / 2 + (1 - t) * 3) / (0.6 + 2.4 * t), 0, 1) * t ** 1.6
    head = np.clip(1 - np.sqrt((xx - (w - 4)) ** 2 + (yy - h / 2) ** 2) / 4.0, 0, 1)
    out = np.zeros((h, w, 4), np.float32)
    out[..., :3] = rgb01(0xF6F2FF)
    out[..., 3] = np.clip(core * 0.9 + head, 0, 1)
    return out


def rg_props():
    dx, dy, dz = RG_DOCK
    dock = [dx, -round(dz * math.cos(RG_MID_E) + (dy - 8) * math.sin(RG_MID_E), 1)]
    plist = [
        Prop("shuttle", "mid", _shuttle(0), [{}], (86, 46, 10), dock[1]),
        Prop("ast", "far", fauna.asteroid(size=1.6, seed=3), [{"a": {"r": a}} for a in (0, 45, 90, 135)], (40, 30, 30), -250),
        Prop("astb", "far", fauna.asteroid(color="#5E5868", size=1.0, seed=7), [{"a": {"r": a}} for a in (0, 60, 120)], (28, 20, 20), -280),
        PaintedProp("meteor", "back", _star_streak, 1, ax=0.95, ay=0.5, ppl=0.9),
    ]
    sprites = [
        {"kind": "bob", "layer": "mid", "frames": ["shuttle_0"], "fps": 1, "at": dock, "amp": [0.8, 1.6], "periodS": 6, "tilt": 1.2},
        {"kind": "path", "layer": "far", "fps": 0.6, "periodS": 70, "keys": [[0, -340, -250, 1], [70, 1560, -300, 1]],
         "group": [{"frames": ["ast_0", "ast_1", "ast_2", "ast_3"]}]},
        {"kind": "path", "layer": "far", "fps": 0.5, "periodS": 95, "keys": [[0, 1560, -270, 1], [95, -340, -230, 1]], "face": "fixed",
         "group": [{"frames": ["astb_0", "astb_1", "astb_2"]}, {"frames": ["astb_1", "astb_2", "astb_0"], "dx": 60, "dy": 18}]},
        {"kind": "path", "layer": "back", "fps": 1, "periodS": 11, "face": "fixed",
         "keys": [[0, 760, -470, 0, 0], [0.15, 700, -450, 1, 0], [0.9, 360, -330, 1, 0], [1.1, 300, -312, 0, 0], [11, 300, -312, 0, 0]],
         "group": [{"frames": ["meteor_0"]}]},
    ]
    return plist, sprites


# -- Nebula Shipyard (round 3; Epic, Wardrobe Crate; a set with Nebula Ark) ---------------------------
# A star-ark under construction in an orbital drydock (`celestial: 'own'`, `weather: 'space'`). Back: a
# nebula cloud of soft violet glows. Far: the yard's floor plate with a plate shop and fuel spheres; the
# drydock's lattice cradle with the half-built ark inside: its bow plated (lilac-grey with plate seams, two
# violet bands, rows of lit windows, a dorsal spine with the bridge tower, cradle struts under the keel), its
# stern still bare hoops on the keel, turned toward the camera so they read as a cage, with stringers and two
# engine rings; plates hang from the gantry cranes on the top girder; docking lights. Mid: the yard deck: a hull
# ring on its cradle, a low goliath crane over a stack of plates (kept under the ark's keel line), welding rigs,
# gantries, floodlights, cargo pods and a landing pad with a yard shuttle. Ambient: welding sparks, a crane arm
# swings, cargo pods drift past, a shuttle crosses, docking lights blink; windows, welding points, floodlights,
# the pad and the gantry lamps glow under night skies.
# Palette (PLAN 2b): void #1E1830, nebula violet #8E44C8, mint #3FE0B0 (both outside the team-hue bands); the
# hull a step darker than the classic's white-lilac, so the units' bases stay the brighter objects.
NS_PAL = dict(skyTop=0x1E1830, skyBottom=0x48366E, light=0xE8E4FF, far=0x4A3E6E, mid=0x36305A, near=0x262040)
NS = dict(
    hull=0xACA6C4, hull_dk=0x8A84A4, band=0x7460B0, frame=0x6A6880, frame_dk=0x4E4C62, deck=0x5A5672, deck_dk=0x46425C, rib=0x7C7896,
    nebula=0x8E44C8, nebula_dk=0x5E3A8E, mint=0x3FE0B0, mint_lt=0x9CF0D4, window=0xBFF3E0, pod=0xC8B8A4, pod_dk=0xA8988A, metal=0x9A98AC,
    rock=0x4E4864, glass=0xD6D0EE, lamp=0xF2F0FF,
)
NS_SKY = {"top": "#1E1830", "bottom": "#48366E", "horizon": "#56427C", "cloudTint": "#5E4C86", "celestial": "none",
          "stars": 200, "nebula": True, "clouds": 0}
NS_FAR_E = math.radians(8.0)
NS_MID_E = math.radians(12.0)
NS_DOCK = (150.0, 790.0, 600.0, 30.0, 270.0)   # the drydock: x0, x1, depth, foot z, top girder z (far)
NS_ARK = (170.0, 770.0, 600.0, 132.0, 64.0)    # the ark: stern x, bow x, depth, axis z, radius (far)
NS_SEAM = 0.46                                 # where the plating ends (a share of the ark's length from the stern)
NS_HOOP_YAW = 22.0                             # the bare hoops turn this much toward the camera (they read as a cage)
NS_CRANE = (480.0, 600.0, 282.0)               # the swinging crane arm's pivot (far)
NS_POD_Y = -250.0                              # the drifting cargo pods' height (far, screen lu)


def ns_back(st, P):
    """The nebula: a wide drift of soft violet glows with bright knots, stars between."""
    pt = Parts()
    rnd = random.Random(19)
    # soft bands close to the sky's colour (their edges melt into it), brighter knots in their hearts
    gvs = [pt.g(mixc(NS["nebula"], P["skyBottom"], t), glow=True) for t in (0.82, 0.72, 0.62)]
    for layer, (n, sz, zoff) in enumerate(((30, (70, 120, 24, 44), 0), (22, (40, 80, 14, 30), 6), (12, (20, 40, 8, 16), 12))):
        for k in range(n):
            x = rnd.uniform(-260, 1460)
            if 760 < x < 1000:
                continue
            z = 160 + 70 * math.sin((x + 300) / 340) + rnd.uniform(-24, 24) + zoff
            gvs[layer].blob((x, 1500 - layer * 20, z), (rnd.uniform(sz[0], sz[1]), 24, rnd.uniform(sz[2], sz[3])), p=2.0, cuts=3)
    gs = pt.g(0xF2F0FF, glow=True)
    for k in range(40):
        gs.sphere((rnd.uniform(-260, 1460), 1440, rnd.uniform(80, 330)), rnd.uniform(1.0, 2.2), cuts=2)
    pt.flush(st)


def _ark_radius(x):
    """The ark hull's radius at x (far): full at the seam, a long ogive to the bow, tapering toward the stern."""
    sx, bx, _, _, R = NS_ARK
    mid_x = sx + (bx - sx) * NS_SEAM
    if x >= mid_x:
        t = min(1.0, (x - mid_x) / (bx - mid_x))
        return R * max(0.0, 1 - t ** 2.4) ** 0.5
    t = min(1.0, (mid_x - x) / (mid_x - sx))
    return R * (1 - 0.34 * t ** 1.5)


def _hoop_point(x, a):
    """A point on the bare hoop at x, at angle `a` round it (radians: 0 the far side, pi/2 the top, pi the near
    side), with the hoops' turn toward the camera."""
    _, _, ay, az, _ = NS_ARK
    r = _ark_radius(x)
    s, c = math.sin(math.radians(NS_HOOP_YAW)), math.cos(math.radians(NS_HOOP_YAW))
    return (x - r * math.cos(a) * s, ay + r * math.cos(a) * c, az + r * math.sin(a))


def ns_far(st, P):
    pt = Parts()
    hz = lambda c, t: mixc(c, P["skyBottom"], t)  # noqa: E731
    # 1. the moonlet's rim beyond the yard, low and dark; the yard's floor plate the dock stands on, with
    # panel seams and a row of mint lights
    ridge(st, hz(0x5A5276, 0.26), -300, 1500, -20, 110, 660, 21, lumps=9, jag=0.08, peaks=False)
    x0, x1, dy, fz, gz = NS_DOCK
    gfl, gfl2 = pt.g(hz(NS["deck"], 0.1), outline=0.3), pt.g(hz(NS["deck_dk"], 0.1), outline=0.2)
    box(gfl, (600, 540, fz - 14), (1100, 120, 14), p=8, cuts=2)
    for k in range(17):
        box(gfl2, (-300 + k * 112, 452, fz + 0.4), (1.2, 30, 0.5), p=6, cuts=1)
    gle = pt.g(NS["mint"], glow=True)
    for k in range(36):
        gle.sphere((-290 + k * 50, 470, fz + 0.6), 1.1, cuts=2)
    # a plate shop left of the dock (lit windows) and fuel spheres to its right
    gsh, gsh2 = pt.g(hz(NS["hull_dk"], 0.1), outline=0.4), pt.g(hz(NS["frame_dk"], 0.1), outline=0.3)
    box(gsh, (10, 520, fz + 26), (64, 30, 26), p=8, cuts=2)
    for k in range(4):
        gsh2.slab([(-50 + k * 32, fz + 52), (-26 + k * 32, fz + 52), (-26 + k * 32, fz + 62)], 506, 22)
    gwin = pt.g(NS["window"], glow=True)
    for k in range(9):
        gwin.blob((-44 + k * 12, 489.4, fz + 34), (3.2, 0.5, 2.2), p=4, cuts=1)
    st.light((10, 486, fz + 34), 4)
    gfs = pt.g(hz(NS["metal"], 0.12), finish="metal", outline=0.4)
    for (x, r) in ((880, 22), (936, 17)):
        gfs.sphere((x, 520, fz + 12 + r), r, cuts=4)
        for sx in (-0.6, 0.6):
            gsh2.capsule((x + sx * r, 510, fz), (x + sx * r * 0.7, 512, fz + 14 + r * 0.5), 1.2)
    # 2. the drydock: lattice columns and a top girder, cross braces, docking lights along the girder
    gf, gf2 = pt.g(NS["frame"], outline=0.4), pt.g(NS["frame_dk"], outline=0.3)
    cols = [x0 + (x1 - x0) * k / 5 for k in range(6)]
    for x in cols:
        for sy in (-30, 30):
            box(gf, (x, dy + sy, (fz + gz) / 2), (3.4, 3.4, (gz - fz) / 2), p=8, cuts=1)
        for k in range(6):
            z0 = fz + (gz - fz) * k / 6
            z1 = fz + (gz - fz) * (k + 1) / 6
            gf2.capsule((x - 3, dy - 30, z0), (x + 3, dy - 30, z1), 0.7)
    for sy in (-30, 30):
        box(gf, ((x0 + x1) / 2, dy + sy, gz), ((x1 - x0) / 2 + 8, 4, 4), p=8, cuts=1)
        box(gf2, ((x0 + x1) / 2, dy + sy, fz + 30), ((x1 - x0) / 2 + 4, 3, 2.4), p=8, cuts=1)
    for a, b in zip(cols, cols[1:]):
        gf2.capsule((a, dy - 30, gz - 4), (b, dy - 30, fz + 32), 0.8)
        gf2.capsule((a, dy - 30, fz + 32), (b, dy - 30, gz - 4), 0.8)
    gl = pt.g(NS["mint"], glow=True)
    for k in range(12):
        x = x0 + (x1 - x0) * k / 11
        gl.sphere((x, dy - 35, gz - 4), 1.6, cuts=2)
    for k in range(4):
        st.amb("blink", "bd.light", (x0 + (x1 - x0) * (k + 0.5) / 4, dy - 35, gz - 4), "far", period=1300 + k * 230, tint=0x9CF0D4)
    # 3. the half-built ark (the signature). The bow is plated: a lilac-grey hull with plate seams and two
    # violet bands, rows of lit windows, a dorsal spine with the bridge tower, cradle struts under it. The
    # stern is bare: hoops on the keel (turned a little toward the camera, so they read as a cage) with
    # stringers along them and two engine rings at the stern; plates hang from the cranes; welding sparks
    # fly along the seam.
    sx, bx, ay, az, R = NS_ARK
    mid_x = sx + (bx - sx) * NS_SEAM
    L = bx - mid_x
    rad = _ark_radius
    gh, ghd, gb = pt.g(NS["hull"], finish="gloss", outline=0.5), pt.g(NS["hull_dk"], outline=0.3), pt.g(NS["band"], outline=0.3)
    gw = pt.g(NS["window"], glow=True)
    n = 18
    gh.lathe([(0.01, 0)] + [(max(0.01, rad(mid_x + L * k / n)), L * k / n) for k in range(n + 1)], (mid_x, ay, az), (bx, ay, az), segs=36)
    for k in range(1, 9):                     # plate seams
        xx = mid_x + k * 30
        if xx > bx - 44:
            break
        rr = rad(xx) + 0.35
        ghd.lathe([(rr - 0.8, 0), (rr, 0), (rr, 1.1), (rr - 0.8, 1.1)], (xx, ay, az), (xx + 1.1, ay, az), segs=36)
    for xx in (mid_x + 0.26 * L, mid_x + 0.31 * L):     # the violet bands
        rr = rad(xx) + 0.6
        gb.lathe([(rr - 1.0, 0), (rr, 0), (rr, 5.0), (rr - 1.0, 5.0)], (xx, ay, az), (xx + 5.0, ay, az), segs=36)
    wins = []
    for row, phi in enumerate((0.34, -0.2)):
        k = 0
        xx = mid_x + 14
        while xx < bx - 56:
            rr = rad(xx)
            if (k * 7 + row * 3) % 5 and not (mid_x + 0.24 * L < xx < mid_x + 0.34 * L):
                p_ = (xx, ay - rr * math.cos(phi) - 0.3, az + rr * math.sin(phi))
                gw.blob(p_, (1.8, 0.7, 1.2), p=3, cuts=2)
                if row == 0 and k % 7 == 3:
                    wins.append((p_[0], p_[1] - 2, p_[2]))
            xx += 11
            k += 1
    # the dorsal spine along the crown and the bridge tower on it
    spine = [(mid_x + 6 + k * 0.045 * L, az + rad(mid_x + 6 + k * 0.045 * L)) for k in range(15)]
    ghd.slab([(x_, z_ + 5.0) for x_, z_ in spine] + [(x_, z_ - 6.0) for x_, z_ in reversed(spine)], ay, 16)
    tx_ = mid_x + 0.5 * L
    tz_ = az + rad(tx_) + 4
    box(gh, (tx_, ay, tz_ + 7), (18, 9, 7), p=8, cuts=1)
    box(ghd, (tx_ + 2, ay, tz_ + 18), (11, 7, 4.5), p=8, cuts=1)
    gw.blob((tx_ + 2, ay - 7.2, tz_ + 18.5), (8.5, 0.6, 1.4), p=4, cuts=1)
    pt.g(NS["frame_dk"], outline=0.2).capsule((tx_ - 6, ay, tz_ + 22), (tx_ - 6, ay, tz_ + 44), 0.6)
    st.amb("blink", "bd.light", (tx_ - 6, ay - 1, tz_ + 45), "far", period=1100, tint=0x9CF0D4)
    st.light((tx_ + 2, ay - 9, tz_ + 18), 3)
    # cradle struts from the dock floor to the plated keel
    gcr = pt.g(NS["frame_dk"], outline=0.4)
    for xx in (mid_x + 24, mid_x + 0.36 * L, mid_x + 0.66 * L):
        zb = az - rad(xx) + 3
        for dx in (-12, 12):
            gcr.capsule((xx + dx, ay - 22, fz), (xx, ay - 14, zb), 1.6)
    # the bare stern: hoops, stringers, the keel, two engine rings
    gr, gk = pt.g(NS["rib"], outline=0.3), pt.g(NS["frame_dk"], outline=0.4)
    hoops = [sx + 8 + k * (mid_x - 2 - sx - 8) / 9 for k in range(10)]
    for xx in hoops:
        r = rad(xx)
        kit.annulus(gr, (xx, ay, az), r - 3.0, r, 2.6, rot=(0, 90, NS_HOOP_YAW), segs=44)
    for a_deg, rr in ((90, 1.7), (145, 1.0), (195, 1.0), (240, 1.1), (270, 2.8), (35, 0.8), (320, 0.8)):
        a = math.radians(a_deg)
        pts = [_hoop_point(xx, a) for xx in hoops] + [_hoop_point(mid_x + 3, a)]
        for p_, q_ in zip(pts, pts[1:]):
            gk.capsule(p_, q_, rr)
    for dz in (0.44, -0.44):
        c_ = (sx - 6, ay, az + R * dz)
        kit.annulus(gk, c_, R * 0.2, R * 0.3, 4.0, rot=(0, 90, NS_HOOP_YAW), segs=32)
        gk.capsule((sx - 6, ay, az + R * dz), (hoops[0], ay, az + R * dz * 0.7), 1.6)
    # plates being fitted on the bare hoops next to the seam (darker, not yet painted)
    for (xx, a_deg) in ((hoops[-1] - 4, 160), (hoops[-2] - 4, 150), (hoops[-1] - 6, 205)):
        p_ = _hoop_point(xx, math.radians(a_deg))
        ghd.blob((p_[0], p_[1] - 1.0, p_[2]), (13, 1.6, 9), p=5, cuts=2, rot=(a_deg - 180, 0, NS_HOOP_YAW * 0.5))
    for (xx, a_deg) in ((mid_x - 2, 165), (mid_x - 2, 212), (hoops[-3], 172)):
        p_ = _hoop_point(xx, math.radians(a_deg))
        st.amb("emit", "fx.p.spark", (p_[0], p_[1] - 3, p_[2]), rate=2.4, speed=26, scale=0.6, tint=0xFFF2C8, alpha=0.95, life=500)
        st.light((p_[0], p_[1] - 5, p_[2]), 3)
    for w in wins[:3]:
        st.light(w, 3)
    # 4. gantry cranes along the top girder (the swinging arm is a prop), hanging cables and plates
    gpl = pt.g(NS["hull_dk"], outline=0.4)
    for x in (300.0, 640.0, 740.0):
        box(gf, (x, dy, gz + 10), (8, 34, 6), p=8, cuts=1)
        gf2.capsule((x, dy - 20, gz + 6), (x, dy - 20, az + R + 32), 0.4)
        box(gpl, (x, dy - 20, az + R + 24), (13, 1.2, 8), p=6, cuts=1)
    box(gf, (NS_CRANE[0], NS_CRANE[1], NS_CRANE[2] - 6), (6, 30, 5), p=8, cuts=1)
    # 5. distant hulls and beacons beyond the yard (right of the moons' place)
    gd, gd2 = pt.g(hz(NS["hull_dk"], 0.25), outline=0.2), pt.g(hz(NS["band"], 0.3), outline=0.0)
    for (x, y, z, L, r) in ((1150, 720, 180, 150, 13), (1330, 760, 236, 104, 9)):
        gd.blob((x, y, z), (L / 2, r * 1.2, r), p=3.2, taper=(1.0, 0.6))
        gd.blob((x - L * 0.25, y - 2, z + r * 0.9), (L * 0.12, r * 0.8, r * 0.5), p=3.0)
        gd2.blob((x + L * 0.1, y - r * 1.1, z), (L * 0.3, 0.6, r * 0.25), p=3.0)
        pt.g(NS["mint_lt"], glow=True).blob((x - L / 2 - 2, y, z), (3, r * 0.6, r * 0.5), p=2.0)
        st.amb("blink", "bd.light", (x + L / 2, y - r, z), "far", period=1700, tint=0xF6C6E4)
    pt.flush(st)


def _welding_rig(pt, st, x, y, z, flip=1):
    """A welding rig on the deck: a jointed robot arm on a turret base, its torch throwing sparks."""
    gm, gm2 = pt.g(NS["metal"], outline=0.5), pt.g(NS["frame_dk"], outline=0.4)
    cyl(gm2, (x, y, z), (x, y, z + 6), 8, bevel=0.6, segs=16)
    gm.capsule((x, y, z + 6), (x + flip * 10, y, z + 30), 2.6, 2.0)
    gm.capsule((x + flip * 10, y, z + 30), (x + flip * 28, y, z + 22), 2.0, 1.4)
    gm2.sphere((x + flip * 10, y, z + 30), 3.0)
    tip = (x + flip * 31, y, z + 20)
    pt.g(NS["mint_lt"], glow=True).sphere(tip, 1.2)
    st.amb("emit", "fx.p.spark", tip, rate=3.0, speed=22, scale=0.55, tint=0xFFF2C8, alpha=0.95, life=450)
    st.light(tip, 3)


def ns_mid(st, P):
    pt = Parts()
    # the yard deck: one plated floor with panel seams and a darker front edge, a mint edge strip
    gd, gd2 = pt.g(NS["deck"], outline=0.4), pt.g(NS["deck_dk"], outline=0.3)
    box(gd, (600, 84, 32), (1100, 50, 8), p=8, cuts=2)
    box(gd2, (600, 35, 30), (1100, 2.4, 10), p=6, cuts=1)
    for i in range(15):
        box(gd2, (-300 + i * 130, 84, 40.2), (1.0, 48, 0.4), p=6, cuts=1)
    pt.g(NS["mint"], glow=True).blob((600, 32.4, 38.4), (1100, 0.6, 0.5), p=6, cuts=1)
    # a hull ring on its cradle (x 290), being welded: a section of the next ark, turned like the bare hoops
    rx_, ry_, rr_ = 290.0, 104.0, 36.0
    kit.annulus(pt.g(NS["hull_dk"], outline=0.5), (rx_, ry_, 44 + rr_), rr_ - 6.5, rr_, 13.0, rot=(0, 90, 24), segs=56)
    kit.annulus(pt.g(NS["band"], outline=0.3), (rx_, ry_, 44 + rr_), rr_ - 0.6, rr_ + 0.8, 4.0, rot=(0, 90, 24), segs=56)
    gcr = pt.g(NS["frame_dk"], outline=0.4)
    box(gcr, (rx_, ry_, 42), (30, 16, 2.4), p=6, cuts=1)
    for sx in (-1, 1):
        box(gcr, (rx_ + sx * 14, ry_, 48), (6, 12, 6), p=6, cuts=1, rot=(0, sx * 18, 0))
    # floodlight masts with lamp heads (lit at night)
    gfm, glamp = pt.g(NS["frame_dk"], outline=0.4), pt.g(NS["lamp"], glow=True)
    for x in (150.0, 860.0):
        gfm.capsule((x, 120, 40), (x, 120, 150), 1.4, 1.0)
        box(gfm, (x, 120, 152), (9, 3, 2.4), p=6, cuts=1)
        for sx in (-5, 0, 5):
            glamp.blob((x + sx, 116.6, 152), (1.8, 0.6, 1.4), p=3, cuts=1)
        st.light((x, 112, 148), 6)
    # 1. gantries: walkways on legs with railings and lamps (lit at night)
    gf, gf2 = pt.g(NS["frame"], outline=0.5), pt.g(NS["frame_dk"], outline=0.4)
    for (x0, x1, h) in ((-240, 60, 90), (880, 1200, 96)):
        box(gf, ((x0 + x1) / 2, 110, 40 + h), ((x1 - x0) / 2, 9, 2.4), p=8, cuts=1)
        for x in range(int(x0), int(x1) + 1, 60):
            gf2.capsule((x, 104, 40), (x, 104, 40 + h), 1.6)
            gf2.capsule((x, 116, 40), (x, 116, 40 + h), 1.6)
        for k in range(int((x1 - x0) / 20) + 1):
            gf2.capsule((x0 + k * 20, 101, 40 + h + 2), (x0 + k * 20, 101, 40 + h + 10), 0.4)
        gf2.capsule((x0, 101, 40 + h + 10), (x1, 101, 40 + h + 10), 0.5)
        st.light(((x0 + x1) / 2, 98, 40 + h - 4), 5)
    # 2. cargo pods stacked by the gantries, cargo racks
    gp, gp2 = pt.g(NS["pod"], outline=0.5), pt.g(NS["pod_dk"], outline=0.4)
    for k, (x, y, z) in enumerate(((120, 70, 40), (150, 74, 40), (135, 72, 56), (1260, 70, 40), (1290, 74, 40), (330, 64, 40))):
        (gp if k % 2 else gp2).capsule((x - 10, y, z + 7), (x + 10, y, z + 7), 7, 7)
        pt.g(NS["band"], outline=0.2).blob((x, y - 6.6, z + 7), (2.4, 0.6, 6.8), p=3)
    # 3. welding rigs at the deck edge
    for (x, f) in ((346, -1), (652, 1), (1000, 1)):
        _welding_rig(pt, st, x, 60, 40, f)
    # 4. a low goliath crane straddling a stack of hull plates (x 430-630; kept under the ark's keel line):
    # lattice legs, the top beam, its trolley lowering a plate
    gpc, gpc2 = pt.g(NS["frame"], outline=0.5), pt.g(NS["frame_dk"], outline=0.4)
    cx0, cx1, cy0, ch = 430.0, 630.0, 112.0, 76.0
    for x in (cx0, cx1):
        for dy in (-12, 12):
            gpc.capsule((x - 8, cy0 + dy, 40), (x, cy0 + dy, 40 + ch), 2.0, 1.6)
            gpc.capsule((x + 8, cy0 + dy, 40), (x, cy0 + dy, 40 + ch), 2.0, 1.6)
        for k in range(3):
            z0, z1 = 48 + k * 22, 66 + k * 22
            gpc2.capsule((x - 7 + k * 1.8, cy0 - 12, z0), (x + 6 - k * 1.8, cy0 - 12, z1), 0.6)
        box(gpc2, (x, cy0, 44), (12, 16, 4), p=6, cuts=1)
    box(gpc, ((cx0 + cx1) / 2, cy0, 40 + ch + 5), ((cx1 - cx0) / 2 + 12, 15, 5), p=8, cuts=1)
    for k in range(9):
        x = cx0 + (cx1 - cx0) * k / 8
        gpc2.capsule((x, cy0 - 15.4, 40 + ch + 1), (x + (cx1 - cx0) / 16, cy0 - 15.4, 40 + ch + 9), 0.5)
    tx = cx0 + (cx1 - cx0) * 0.62
    box(pt.g(NS["hull_dk"], outline=0.4), (tx, cy0, 40 + ch - 2), (10, 12, 4), p=6, cuts=1)
    gpc2.capsule((tx, cy0 - 2, 40 + ch - 6), (tx, cy0 - 2, 84), 0.5)
    box(pt.g(NS["hull"], outline=0.5), (tx, cy0 - 2, 76), (18, 1.6, 8), p=6, cuts=1)
    pt.g(NS["mint"], glow=True).sphere((tx - 8, cy0 - 13, 40 + ch - 2), 1.3, cuts=2)
    gst_, gst2_ = pt.g(NS["hull_dk"], outline=0.5), pt.g(NS["hull"], outline=0.5)
    for k in range(5):
        box(gst_ if k % 2 else gst2_, ((cx0 + cx1) / 2 - 20, cy0 - 4, 42 + k * 3.4), (26 - k * 1.2, 12, 1.6), p=6, cuts=1)
    # 5. the landing pad (x 700-820): a ring of lights, a yard shuttle parked on it, beacon masts
    gpad = pt.g(NS["deck_dk"], outline=0.4)
    px_ = 762.0
    cyl(gpad, (px_, 96, 40), (px_, 96, 43), 46, bevel=0.5, segs=32, squash=(1.0, 0.4))
    glw = pt.g(NS["mint"], glow=True)
    for k in range(10):
        a = math.pi * (1.0 + k / 9)
        glw.sphere((px_ + math.cos(a) * 44, 96 + math.sin(a) * 18, 44), 1.4, cuts=2)
    st.light((px_, 80, 46), 6)
    _shuttle(0)(kit.StaticRig(pt, (px_ + 4, 96, 43)))
    for x in (px_ - 64, px_ + 64):
        pt.g(NS["metal"], outline=0.4).capsule((x, 110, 40), (x, 110, 120), 1.0)
        st.amb("blink", "bd.light", (x, 110, 122), "mid", period=1500, tint=0x9CF0D4)
    pt.flush(st)


def _crane_arm(rig):
    """A gantry crane's arm swinging over the ark: a lattice boom on its pivot, a cable with a hull plate."""
    rig.joint("a", "all", (0, 0, 0))
    g = Geo()
    g.capsule((0, 0, 0), (-70, 0, 6), 2.2, 1.4)
    for k in range(7):
        g.capsule((-k * 10, 0, 0.6), (-k * 10 - 10, 0, 4), 0.5)
    rig.part("a", g, "#6A6880", outline=0.3)
    rig.part("a", Geo().capsule((-66, 0, 5), (-66, 0, -34), 0.35), "#4E4C62", outline=0.0)
    rig.part("a", Geo().blob((-66, 0, -38), (12, 1.4, 7), p=6, cuts=1), "#A8A2BE", outline=0.4)


def ns_props():
    cx, cy, cz = NS_CRANE
    crane = scr((cx, cy, cz), NS_FAR_E)
    plist = [
        Prop("arm", "far", _crane_arm, [{"a": {"rz": a}} for a in (-14, -6, 4, 14)], (160, 20, 50), crane[1]),
        Prop("pod", "far", _pod_build, [{}], (30, 14, 14), NS_POD_Y),
        Prop("shut", "mid", _shuttle(1), [{}], (70, 30, 8), -170),
    ]
    sprites = [
        # the signature: a crane arm swings slowly over the half-built ark
        {"kind": "loop", "layer": "far", "frames": ["arm_0", "arm_1", "arm_2", "arm_3"], "fps": 0.8, "pingpong": True, "at": crane},
        # cargo pods drift past the yard on a tow line
        {"kind": "path", "layer": "far", "fps": 1, "periodS": 90, "keys": [[0, 1560, NS_POD_Y, 1], [90, -360, NS_POD_Y + 16, 1]],
         "group": [{"frames": ["pod_0"]}, {"frames": ["pod_0"], "dx": 34, "dy": -3}, {"frames": ["pod_0"], "dx": 68, "dy": -5}]},
        # a yard shuttle crosses high over the deck
        {"kind": "path", "layer": "mid", "fps": 1, "periodS": 60, "keys": [[0, -360, -170, 0], [2, -300, -170, 1], [24, 1500, -190, 1], [26, 1560, -190, 0],
                                                                          [60, 1560, -190, 0]],
         "group": [{"frames": ["shut_0"]}]},
    ]
    return plist, sprites


def _pod_build(rig):
    """A cargo pod on the tow line: a rounded canister with a violet band and a mint marker light."""
    rig.part("all", Geo().capsule((-9, 0, 0), (9, 0, 0), 6, 6), "#C8B8A4", outline=0.4)
    rig.part("all", Geo().blob((0, -5.8, 0), (2.4, 0.6, 5.6), p=3), "#7460B0", outline=0.2)
    rig.part("all", Geo().sphere((9.5, -2, 3), 1.0), glow="#9CF0D4", outline=0)


SCENES = {
    # the ringed planet is this sky's object: a sky theme brings its stars and colours, not a second moon
    "classic": Scene("cosmic", "classic", PAL, far, mid, back=back, sky=SKY, props=props,
                     hints={"celestial": "own", "weather": "space", "skyGrade": 0.35}, ground="deck",
                     # no air on the moon: less haze and desaturation than the A11 default (still muted)
                     look={"back": (0.26, 0.22, 0.3), "far": (0.16, 0.06, 0.14), "mid": (0.1, 0.0, 0.06)}),
    "ringed_giant": Scene("cosmic", "ringed_giant", RG_PAL, rg_far, rg_mid, back=rg_back, sky=RG_SKY, props=rg_props,
                          hints={"celestial": "own", "weather": "space", "skyGrade": 0.35}, ground="deck", back_fade=10.0,
                          # space: the giant keeps its colours (little haze), the station a little more
                          look={"back": (0.12, 0.06, 0.12), "far": (0.16, 0.06, 0.14), "mid": (0.1, 0.0, 0.06)}),
    "nebula_shipyard": Scene("cosmic", "nebula_shipyard", NS_PAL, ns_far, ns_mid, back=ns_back, sky=NS_SKY, props=ns_props,
                             hints={"celestial": "own", "weather": "space", "skyGrade": 0.35}, ground="deck", back_fade=10.0,
                             look={"back": (0.1, 0.04, 0.1), "far": (0.16, 0.06, 0.14), "mid": (0.1, 0.0, 0.06)}),
}
