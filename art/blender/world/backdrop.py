"""Pre-rendered backdrop layers and arena grounds (DESIGN A11 Split-age lane, art review fix 3 and 4).

Per age, two wide strips rendered with the same toon shader and light as the units and bases:
  far  - distant silhouettes (mountains and a volcano, a castle on its hill, windmills and ships,
         a city skyline, megastructures), heavily hazed toward the sky's horizon colour;
  mid  - the mid-ground (pines and tents, orchards and cottages, hedges and a farm, ruins and
         telegraph poles, domes and light pylons), lightly hazed.
Per arena, the ground: the lane surface (a worn path with ruts, pebbles with cel shading and a
clear edge where lane meets grass) and the front soil under the HUD (tar pools with a raised rim and
a glossy highlight, shaded bones, snow drifts, cobbles and a moat, planks and sea, craters, neon
deck, orbital deck, rift crystals), with a soft darker front lip.

Layers keep DESIGN A11's low contrast: colours are desaturated and mixed toward the age's horizon
colour after rendering (far more than mid). Geometry is authored in lane lu (x = 0 at the left gate,
z up, y depth away from the camera); the camera looks along +y, tilted down a little.

Outputs (WebP; the far and mid strips keep alpha):
  public/art/backdrops/<age>/far.webp, mid.webp and <age>.json (frames and ambient specs)
  public/art/ground/<arena>.webp and ground.json

Usage: <venv>/bin/python art/blender/world/backdrop.py --out <scratch> [--only stone,tar_pits] [--no-install]
"""
import argparse
import json
import math
import os
import random
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
BLENDER = os.path.dirname(HERE)
REPO = os.path.dirname(os.path.dirname(BLENDER))
sys.path.insert(0, BLENDER)
sys.dont_write_bytecode = True

import numpy as np  # noqa: E402
from PIL import Image  # noqa: E402

from ageborn_art import config as C  # noqa: E402
from ageborn_art import render, scene, sheet  # noqa: E402
from ageborn_art.geometry import Geo  # noqa: E402
from ageborn_art.rig import Rig  # noqa: E402

from world.common import box, cyl, rock  # noqa: E402

AGES = ["stone", "medieval", "gunpowder", "modern", "future"]
ARENAS = ["tar_pits", "frostfang", "kingsmoat", "powder_bay", "iron_front", "neon_harbor", "orbital_ring", "chrono_rift"]

# layer frames (must match src/visuals/backdrops: FAR_FRAME, MID_FRAME, GROUND_FRAME), px per lu here
X0, WIDTH = -260.0, 1720.0
FRAMES = {
    "far": {"yTop": -560.0, "height": 580.0, "ppl": 0.9, "elev": 8.0},
    "mid": {"yTop": -300.0, "height": 320.0, "ppl": 1.2, "elev": 12.0},
    "ground": {"yTop": -40.0, "height": 290.0, "ppl": 1.3, "elev": 16.0},
}

PAL = {
    "stone": dict(skyTop=0x8db3cf, skyBottom=0xf0e2c4, far=0x9c98a6, mid=0x7f8762, near=0x5f7247, light=0xfff0cc),
    "medieval": dict(skyTop=0x92b6d6, skyBottom=0xeee6d0, far=0x97a1b3, mid=0x78886c, near=0x5a6e4e, light=0xfff4dc),
    "gunpowder": dict(skyTop=0x8cb6c6, skyBottom=0xf2e2c0, far=0x8ea3a6, mid=0x6c8874, near=0x546c56, light=0xfff0d0),
    "modern": dict(skyTop=0x98a8b6, skyBottom=0xe6dcc4, far=0x8a8f9a, mid=0x6c7264, near=0x565c4a, light=0xf2ead2),
    "future": dict(skyTop=0x2c2e50, skyBottom=0x9a7aa8, far=0x524e78, mid=0x3e3e60, near=0x2c2e46, light=0xd8f3ea),
}
# post-render look per layer: desaturation, haze toward the horizon colour (top, foot)
LOOK = {"far": (0.22, 0.14, 0.26), "mid": (0.14, 0.04, 0.12)}


def hx(v):
    return "#%06X" % v


def mixc(a, b, t):
    ar, ag, ab = (a >> 16) & 255, (a >> 8) & 255, a & 255
    br, bg, bb = (b >> 16) & 255, (b >> 8) & 255, b & 255
    return (round(ar + (br - ar) * t) << 16) | (round(ag + (bg - ag) * t) << 8) | round(ab + (bb - ab) * t)


def dk(a, p):
    return mixc(a, 0, p)


def lt(a, p):
    return mixc(a, 0xFFFFFF, p)


class Stage:
    """A static scene: parts on the root joint of a rig, rendered once."""

    def __init__(self, layer):
        f = FRAMES[layer]
        self.f = f
        C.set_render_scale(f["ppl"] / C.PX_PER_LU_1X)
        C.FILTER_WIDTH = 1.0
        C.CAMERA_ELEVATION_DEG = f["elev"]
        scene.reset()
        self.w = int(round(WIDTH * f["ppl"]))
        self.h = int(round(f["height"] * f["ppl"]))
        self.feet = (-X0 * f["ppl"], -f["yTop"] * f["ppl"])
        cam = scene.camera(self.w, self.h, self.feet)
        e = math.radians(f["elev"])
        from mathutils import Vector
        cam.location = cam.location - Vector((0.0, math.cos(e), -math.sin(e))) * 3000.0
        cam.data.clip_end = 12000.0
        self.rig = Rig("bd", yaw=0.0)
        self.rig.joint("all", "root", (0, 0, 0))
        self.ambient = []

    def part(self, g, color, outline=0.6, finish="matte", glow=None, highlight=True):
        if glow:
            self.rig.part("all", g, glow=glow, outline=0)
        else:
            self.rig.part("all", g, hx(color) if isinstance(color, int) else color, outline=outline, finish=finish,
                          highlight=highlight)

    def screen(self, p):
        """Screen lu (x right, y DOWN, lane space) of a 3D point."""
        e = math.radians(C.CAMERA_ELEVATION_DEG)
        x, y, z = p
        return (round(x, 1), round(-(z * math.cos(e) + y * math.sin(e)), 1))

    def amb(self, kind, part, p, layer, **k):
        x, y = self.screen(p)
        spec = {"kind": kind, "part": part, "x": x, "y": y, "layer": layer}
        spec.update(k)
        self.ambient.append(spec)

    def render(self, path):
        self.rig.apply({})
        render._update()
        self.rig.set_pass(False)
        render.render_to(path)
        return path


# -- shared shapes ------------------------------------------------------------------------------
def pine(g, x, y, h, r):
    for k in range(3):
        z0 = h * (0.22 + k * 0.24)
        g.lathe([(0, 0), (r * (1 - k * 0.22), 0), (r * 0.08, h * 0.42), (0, h * 0.44)], (x, y, z0), (x, y, z0 + h * 0.44), segs=9)
    return g


def round_tree(g, x, y, r, seed):
    rnd = random.Random(seed)
    for k in range(5):
        a = k * 1.3
        g.sphere((x + math.cos(a) * r * 0.45, y - 2, r * 1.3 + math.sin(a) * r * 0.35 + rnd.uniform(-2, 2)),
                 r * rnd.uniform(0.55, 0.75), cuts=3)
    return g


def ridge(st, color, x0, x1, base_z, height, depth, seed, lumps=9, jag=0.18, peaks=True):
    """A mountain or hill ridge: overlapping peaks (lathed cones with a shoulder, lumpy) whose lit and
    shaded flanks give the toon light real form; `peaks=False` makes rounded hills."""
    g = Geo()
    rnd = random.Random(seed)
    n = lumps
    for i in range(n):
        x = x0 + (x1 - x0) * (i + rnd.uniform(0.1, 0.9)) / n
        h = height * rnd.uniform(0.6, 1.1)
        rx = (x1 - x0) / n * rnd.uniform(0.9, 1.4)
        if peaks:
            n0 = len(g.bm.verts)
            prof = [(0, 0), (rx, 0), (rx * 0.62, h * 0.42), (rx * rnd.uniform(0.18, 0.3), h * 0.9), (rx * 0.06, h), (0, h * 1.01)]
            g.lathe(prof, (x, depth + rnd.uniform(-30, 30), base_z), (x, depth, base_z + h), segs=10,
                    rot=(0, 0, rnd.uniform(0, 36)), squash=(1.0, 0.5))
            from world.common import _jitter
            _jitter(g, n0, (x, depth, base_z + h * 0.4), jag * 0.6, seed + i, 2.2 / max(1.0, rx * 0.5))
        else:
            rock(g, (x, depth, base_z), (rx, 60, h), seed=seed + i, jag=jag, p=2.2, cuts=4)
    st.part(g, color, outline=0.0)


# -- far layers ---------------------------------------------------------------------------------
def far_stone(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, -10, 230, 420, 3, lumps=10)
    # volcano with a crater and a lava glow
    g = Geo().lathe([(0, 0), (240, 0), (170, 60), (64, 260), (46, 286), (30, 280), (0, 274)], (900, 200, -20),
                    (900, 200, 266), segs=32)
    st.part(g, mixc(P["far"], 0x7A6A62, 0.35), outline=0.0)
    g = Geo()
    for a in range(0, 360, 40):
        r = math.radians(a)
        g.capsule((900 + 56 * math.cos(r), 150, 200), (900 + 40 * math.cos(r) * 0.8, 150, 250), 6, 3)
    st.part(g, dk(P["far"], 0.12), outline=0.0)
    st.amb("emit", "fx.p.smoke", (900, 200, 270), "far", rate=1.2, speed=16, scale=3.2, tint=lt(P["far"], 0.35), alpha=0.55)
    ridge(st, dk(P["far"], 0.08), -300, 1500, -10, 130, 140, 7, lumps=13)


def castle(g_body, g_roof, x, y, z, s):
    box(g_body, (x, y, z + 40 * s), (60 * s, 20, 40 * s), p=6)
    for dx in (-66, 66):
        cyl(g_body, (x + dx * s, y, z), (x + dx * s, y, z + 110 * s), 16 * s, bevel=1, segs=16)
        g_roof.lathe([(0, 0), (19 * s, 0), (0.5, 42 * s), (0, 44 * s)], (x + dx * s, y, z + 110 * s), (x + dx * s, y, z + 154 * s), segs=16)
    box(g_body, (x, y + 10, z + 90 * s), (22 * s, 18, 70 * s), p=6)
    g_roof.lathe([(0, 0), (30 * s, 0), (0.5, 56 * s), (0, 58 * s)], (x, y + 10, z + 160 * s), (x, y + 10, z + 218 * s), segs=4, rot=(0, 0, 45))
    for k in range(7):
        box(g_body, (x - 54 * s + k * 18 * s, y - 16, z + 84 * s), (5 * s, 4, 6 * s), p=5)


def far_medieval(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, -10, 200, 420, 11, lumps=9, jag=0.12)
    ridge(st, P["far"], -300, 1500, 10, 100, 140, 12, lumps=9, jag=0.08, peaks=False)
    # castle on its hill
    g = Geo()
    rock(g, (340, 120, 30), (260, 60, 120), seed=4, jag=0.06, p=2.2)
    st.part(g, P["far"], outline=0.0)
    gb, gr = Geo(), Geo()
    castle(gb, gr, 340, 110, 140, 0.9)
    st.part(gb, dk(P["far"], 0.05), outline=0.0)
    st.part(gr, mixc(P["far"], 0x8E6070, 0.3), outline=0.0)
    gb, gr = Geo(), Geo()
    cyl(gb, (1120, 200, 60), (1120, 200, 200), 14, bevel=1, segs=14)
    gr.lathe([(0, 0), (18, 0), (0.5, 40), (0, 42)], (1120, 200, 200), (1120, 200, 242), segs=14)
    st.part(gb, back, outline=0.0)
    st.part(gr, dk(back, 0.08), outline=0.0)
    st.amb("drift", "bd.bird", (600, 0, 390), "sky", speed=22, scale=1, tint=dk(P["far"], 0.2))
    st.amb("drift", "bd.bird", (640, 0, 410), "sky", speed=22, scale=0.8, tint=dk(P["far"], 0.2))


def far_gunpowder(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 900, -10, 180, 420, 21, lumps=8, jag=0.12)
    # the sea on the right with three ships
    g = Geo()
    box(g, (1200, 200, 0), (330, 200, 2), p=6)
    st.part(g, mixc(P["skyBottom"], P["far"], 0.45), outline=0.0, finish="gloss")
    for sx, s in ((1010, 1.0), (1210, 0.8), (1350, 0.65)):
        gh, gs = Geo(), Geo()
        gh.blob((sx, 180, 18 * s + 6), (62 * s, 16 * s, 16 * s), p=3.0)
        for dx, h in ((-20, 150), (20, 120)):
            gh.capsule((sx + dx * s, 180, 20 * s), (sx + dx * s, 180, h * s + 20), 2.4 * s)
            gs.blob((sx + dx * s + 3, 176, h * s * 0.72 + 10), (16 * s, 3, h * s * 0.3), p=2.4)
        st.part(gh, dk(P["far"], 0.05), outline=0.0)
        st.part(gs, lt(P["far"], 0.4), outline=0.0)
    ridge(st, P["far"], -300, 860, 10, 90, 140, 22, lumps=8, jag=0.08, peaks=False)
    # windmills: towers here, sails turn as code ambient
    for wx in (120, 420, 690):
        g = Geo()
        cyl(g, (wx, 60, 50), (wx, 60, 140), 18, 11, bevel=1, segs=12)
        g.lathe([(0, 0), (14, 0), (0.5, 20), (0, 21)], (wx, 60, 140), (wx, 60, 161), segs=12)
        st.part(g, dk(P["far"], 0.06), outline=0.0)
        st.amb("rotate", "bd.windmill.sails", (wx, 40, 146), "far", speed=40, tint=lt(P["far"], 0.2))


def far_modern(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.35)
    ridge(st, back, -300, 1500, 0, 130, 460, 31, lumps=10, jag=0.1)
    rnd = random.Random(5)
    x = -280
    i = 0
    gb, gb2, gw = Geo(), Geo(), Geo()
    while x < 1480:
        w = rnd.uniform(40, 80)
        h = rnd.uniform(90, 290)
        d = rnd.uniform(60, 220)
        (gb if i % 2 else gb2).blob((x + w / 2, d, h / 2), (w / 2 - 2, 22, h / 2), p=8, cuts=2)
        # lit window rows: thin slabs, a few per building
        for wz in range(int(20), int(h - 14), 22):
            if rnd.random() < 0.55:
                gw.blob((x + w / 2, d - 23, wz), (w / 2 - 8, 1, 2.2), p=6, cuts=1)
        if i % 5 == 2:
            cyl(gb, (x + w / 2, d, h), (x + w / 2, d, h + 50), 5, 4, bevel=0.5, segs=10)
            st.amb("emit", "fx.p.smoke", (x + w / 2, d, h + 54), "far", rate=0.9, speed=12, scale=2.2, tint=lt(P["far"], 0.4), alpha=0.5)
        if i % 7 == 4:
            gb.capsule((x + 10, d, h), (x + 10, d, h + 120), 2.4)
            gb.capsule((x + 10, d, h + 118), (x + 90, d, h + 118), 2.0)
            st.amb("blink", "bd.light", (x + 10, d, h + 124), "far", period=1400, tint=0xF2D6D6)
        x += w + rnd.uniform(-6, 10)
        i += 1
    st.part(gb2, P["far"], outline=0.0)
    st.part(gb, dk(P["far"], 0.07), outline=0.0)
    st.part(gw, lt(P["far"], 0.28), outline=0.0, highlight=False)


def far_future(st, P):
    back = mixc(P["far"], P["skyBottom"], 0.3)
    ridge(st, back, -300, 1500, 0, 120, 460, 41, lumps=10, jag=0.1)
    # the ring arch
    g = Geo()
    for k in range(40):
        a0, a1 = math.pi * k / 40, math.pi * (k + 1) / 40
        g.capsule((700 + 200 * math.cos(a0), 300, 300 * math.sin(a0)), (700 + 200 * math.cos(a1), 300, 300 * math.sin(a1)), 9)
    st.part(g, lt(P["far"], 0.12), outline=0.0, finish="gloss")
    gt, gs = Geo(), Geo()
    for sx, h, w in ((60, 400, 34), (180, 300, 26), (470, 440, 40), (960, 380, 36), (1130, 470, 44), (1300, 320, 30)):
        gt.lathe([(0, 0), (w, 0), (w * 0.55, h * 0.6), (w * 0.35, h), (0, h + 40)], (sx, 160, 0), (sx, 160, h + 40), segs=6)
        gs.blob((sx, 160 - w * 0.5, h * 0.55), (2.4, 2, h * 0.4), p=4, cuts=2)
        st.amb("blink", "bd.light", (sx, 160, h + 44), "far", period=900 + (sx % 7) * 120, tint=0xF6C6E4)
    st.part(gt, P["far"], outline=0.0, finish="gloss")
    st.part(gs, None, glow="#8FD8C4")
    g = Geo()
    g.blob((620, 120, 270), (64, 20, 12), p=2.4)
    g.blob((870, 120, 336), (50, 20, 11), p=2.4)
    st.part(g, lt(P["far"], 0.15), outline=0.0, finish="gloss")
    st.amb("drift", "bd.skycar", (200, 0, 300), "sky", speed=60, tint=0xD8F3EA)
    st.amb("drift", "bd.skycar", (900, 0, 360), "sky", speed=-45, tint=0xF6D8EC, scale=0.7)


# -- mid layers ---------------------------------------------------------------------------------
def ground_band(st, P, z=30):
    g = Geo()
    rnd = random.Random(1)
    for i in range(14):
        x = -300 + i * 140
        rock(g, (x, 80, z - 30), (100, 60, 30 + rnd.uniform(0, 14)), seed=i, jag=0.05, p=2.4)
    st.part(g, P["mid"], outline=0.0)


def mid_stone(st, P):
    ground_band(st, P)
    rnd = random.Random(3)
    ga, gb = Geo(), Geo()
    for i in range(26):
        x = -240 + i * 67 + rnd.uniform(-20, 20)
        pine(ga if i % 3 else gb, x, 60 + rnd.uniform(-20, 40), rnd.uniform(90, 150), rnd.uniform(24, 32))
    g = Geo()
    for i in range(26):
        x = -240 + i * 67
        g.capsule((x, 60, 0), (x, 60, 30), 3)
    st.part(g, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    st.part(gb, dk(P["near"], 0.1), outline=0.5)
    for tx in (260, 980):
        g = Geo().lathe([(0, 0), (30, 0), (1, 70), (0, 72)], (tx, 20, 0), (tx, 20, 72), segs=9)
        st.part(g, mixc(P["near"], P["light"], 0.3), outline=0.5)
        g = Geo().blob((tx, -9, 12), (6, 2, 12), p=2.0, taper=(1.0, 0.4))
        st.part(g, 0x3A302A, outline=0.0, highlight=False)
        st.amb("emit", "fx.p.smoke", (tx, 20, 76), "mid", rate=0.8, speed=14, scale=1.3, tint=lt(P["mid"], 0.4), alpha=0.45)
    g = Geo()
    for i in range(10):
        rock(g, (-200 + i * 180, 0, 6), (22, 14, 14), seed=40 + i, jag=0.2)
    st.part(g, dk(P["mid"], 0.1), outline=0.5)


def mid_medieval(st, P):
    ground_band(st, P)
    rnd = random.Random(4)
    ga, gb, gt = Geo(), Geo(), Geo()
    for i in range(22):
        x = -220 + i * 80 + rnd.uniform(-20, 20)
        r = rnd.uniform(30, 44)
        round_tree(ga if i % 2 else gb, x, 70, r, i)
        gt.capsule((x, 70, 0), (x, 70, r * 1.0), 3.4)
    st.part(gt, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    st.part(gb, dk(P["near"], 0.1), outline=0.5)
    for cx in (140, 760, 1230):
        g = Geo()
        box(g, (cx, 20, 22), (34, 18, 22), p=6)
        st.part(g, mixc(P["near"], P["light"], 0.45), outline=0.5)
        g = Geo().lathe([(0, 0), (44, 0), (0.5, 40), (0, 42)], (cx, 20, 44), (cx, 20, 86), segs=4, rot=(0, 0, 45),
                        squash=(1.0, 0.55))
        st.part(g, dk(P["mid"], 0.15), outline=0.5)
        g = Geo()
        box(g, (cx - 10, -0.5, 12), (6, 1, 10), p=5)
        st.part(g, dk(P["near"], 0.3), outline=0.0, highlight=False)
    g = Geo()
    for x in range(-260, 1480, 60):
        g.capsule((x, -20, 0), (x, -20, 24), 2)
    g.capsule((-260, -20, 18), (1480, -20, 18), 1.4)
    g.capsule((-260, -20, 9), (1480, -20, 9), 1.4)
    st.part(g, dk(P["mid"], 0.2), outline=0.3)


def mid_gunpowder(st, P):
    ground_band(st, P)
    rnd = random.Random(12)
    ga, gt = Geo(), Geo()
    for i in range(9):
        x = -200 + i * 190 + rnd.uniform(-30, 30)
        if 520 < x < 720:
            continue
        r = rnd.uniform(28, 38)
        round_tree(ga, x, 90, r, 100 + i)
        gt.capsule((x, 90, 0), (x, 90, r), 3.4)
    st.part(gt, 0x5E4836, outline=0.4)
    st.part(ga, P["near"], outline=0.5)
    g = Geo()
    for i in range(12):
        x = -200 + i * 150
        rock(g, (x, 40, 20), (52, 26, 30), seed=60 + i, jag=0.1, p=2.4)
    st.part(g, dk(P["near"], 0.06), outline=0.5)
    g = Geo()
    for hx_ in (320, 900):
        g.lathe([(0, 0), (22, 0), (22, 18), (12, 38), (0, 44)], (hx_, 0, 0), (hx_, 0, 44), segs=14)
        g.lathe([(0, 0), (16, 0), (16, 12), (8, 28), (0, 32)], (hx_ + 40, 10, 0), (hx_ + 40, 10, 32), segs=14)
    st.part(g, mixc(P["light"], P["mid"], 0.35), outline=0.5, finish="hair")
    g = Geo()
    box(g, (615, 40, 37), (55, 26, 37), p=6)
    st.part(g, mixc(P["light"], P["near"], 0.4), outline=0.5)
    g = Geo().lathe([(0, 0), (70, 0), (0.5, 50), (0, 52)], (615, 40, 74), (615, 40, 126), segs=4, rot=(0, 0, 45),
                    squash=(1.0, 0.5))
    st.part(g, dk(P["mid"], 0.2), outline=0.5)
    g = Geo()
    cyl(g, (650, 50, 100), (650, 50, 140), 6, bevel=0.5, segs=10)
    st.part(g, dk(P["near"], 0.1), outline=0.4)
    g = Geo()
    for k in range(3):
        box(g, (585 + k * 30, 13, 40), (7, 1, 8), p=5)
    st.part(g, dk(P["near"], 0.3), outline=0.0, highlight=False)
    st.amb("emit", "fx.p.smoke", (650, 50, 144), "mid", rate=0.7, speed=14, scale=1.2, tint=lt(P["mid"], 0.4), alpha=0.45)


def mid_modern(st, P):
    ground_band(st, P)
    rnd = random.Random(8)
    ga, gb, gw = Geo(), Geo(), Geo()
    for i in range(9):
        x = -180 + i * 200
        h = rnd.uniform(90, 130)
        g = ga if i % 2 else gb
        g.blob((x + 48, 40, h / 2), (46, 20, h / 2), p=6, cuts=2)
        # broken top
        rock(g, (x + 70, 40, h), (22, 18, 16), seed=i, jag=0.3, p=2.0)
        for k in range(3):
            gw.blob((x + 18 + k * 28, 19, h * 0.55), (7, 1, 8), p=5, cuts=1)
    ruin = mixc(P["near"], 0x9A968C, 0.55)
    st.part(ga, ruin, outline=0.5)
    st.part(gb, dk(ruin, 0.08), outline=0.5)
    st.part(gw, dk(ruin, 0.4), outline=0.0, highlight=False)
    g, gwire = Geo(), Geo()
    poles = list(range(-220, 1480, 170))
    for x in poles:
        g.capsule((x, -10, 0), (x, -10, 150), 2.6)
        g.capsule((x - 14, -10, 140), (x + 14, -10, 140), 1.8)
    for a, b in zip(poles, poles[1:]):
        pts = [(a + (b - a) * t / 8, -10, 140 - 24 * math.sin(math.pi * t / 8)) for t in range(9)]
        for p, q in zip(pts, pts[1:]):
            gwire.capsule(p, q, 0.7)
    st.part(g, dk(P["mid"], 0.25), outline=0.3)
    st.part(gwire, dk(P["mid"], 0.35), outline=0.0, highlight=False)
    g = Geo()
    for i in range(30):
        g.blob((-250 + i * 60, -20, 5), (13, 7, 5), p=2.6)
    st.part(g, mixc(P["near"], P["light"], 0.3), outline=0.4, finish="hair")


def mid_future(st, P):
    ground_band(st, P)
    for x, r in ((80, 70), (520, 90), (1050, 80)):
        g = Geo()
        prof = [(0, 0)] + [(r * math.cos(math.pi / 2 * k / 8), r * 0.7 * math.sin(math.pi / 2 * k / 8)) for k in range(9)]
        g.lathe(prof, (x, 60, 0), (x, 60, r * 0.7), segs=28)
        st.part(g, P["near"], outline=0.5, finish="gloss")
        g = Geo()
        cyl(g, (x, 60, r * 0.25 - 1.5), (x, 60, r * 0.25 + 1.5), r * 0.93 + 1, bevel=0.3, segs=28)
        st.part(g, None, glow="#7FD8BE")
        st.amb("blink", "bd.light", (x, 60, r * 0.7 + 4), "mid", period=1300, tint=0xD8FFF0)
    g, gl = Geo(), Geo()
    for i in range(12):
        x = -230 + i * 145
        g.capsule((x, 20, 0), (x, 20, 150), 4)
        box(g, (x, 20, 152), (18, 6, 4), p=5)
        gl.blob((x, 15, 80), (1.6, 1, 60), p=3, cuts=1)
    st.part(g, dk(P["near"], 0.1), outline=0.4, finish="metal")
    st.part(gl, None, glow="#C9A4C0")
    g = Geo()
    box(g, (600, 0, 34), (900, 6, 4), p=6)
    st.part(g, dk(P["mid"], 0.1), outline=0.3, finish="metal")


FAR = {"stone": far_stone, "medieval": far_medieval, "gunpowder": far_gunpowder, "modern": far_modern, "future": far_future}
MID = {"stone": mid_stone, "medieval": mid_medieval, "gunpowder": mid_gunpowder, "modern": mid_modern, "future": mid_future}


# -- grounds ------------------------------------------------------------------------------------
GROUNDS = {
    "tar_pits": dict(top=0x8A7A62, path=0x9A8A70, rut=0x77684F, grass=0x7E8350, face=0x6B5B48, deep=0x4E4236),
    "frostfang": dict(top=0xE2E8EE, path=0xD2DAE2, rut=0xB8C4CF, grass=0xC8D6E0, face=0xB8C4CF, deep=0x8C98A6),
    "kingsmoat": dict(top=0x86906A, path=0x9C9478, rut=0x7C745E, grass=0x6E8A4E, face=0x6C6252, deep=0x4F4A42),
    "powder_bay": dict(top=0xD4C49E, path=0xDCCDA8, rut=0xBCAA84, grass=0x9AA070, face=0xB49E78, deep=0x8C7A5C),
    "iron_front": dict(top=0x7A7060, path=0x857A68, rut=0x655C4E, grass=0x6E6E4E, face=0x5C5448, deep=0x433D36),
    "neon_harbor": dict(top=0x5A5E6A, path=0x646874, rut=0x4A4E58, grass=0x40434E, face=0x40434E, deep=0x2C2E36),
    "orbital_ring": dict(top=0xB8BCC6, path=0xC4C8D0, rut=0xA0A6B0, grass=0x9AA0AC, face=0x9AA0AC, deep=0x23262E),
    "chrono_rift": dict(top=0x6A5A86, path=0x7A6A94, rut=0x584A72, grass=0x5A4C78, face=0x4C4064, deep=0x2E2640),
}


def dpt(sy, e=16.0):
    """Depth of a ground point that shows at screen y `sy` (lu, down)."""
    return -sy / math.sin(math.radians(e))


def ground_scene(st, arena):
    G = GROUNDS[arena]
    rnd = random.Random(sum(map(ord, arena)))
    xa, xb = X0 - 140, X0 + WIDTH + 140
    # the terrain: the back grass edge, the lane path, the lip, the front soil
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(-33), -2), ((xb - xa) / 2, dpt(-40) - dpt(-26) + 30, 2), p=6)
    st.part(g, None, glow=hx(G["grass"]))
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(-27) + dpt(29)) / 2, -1), ((xb - xa) / 2, (dpt(-27) - dpt(29)) / 2, 1), p=8)
    st.part(g, None, glow=hx(G["top"]))
    # worn centre and wheel ruts
    g = Geo()
    for i in range(60):
        x = xa + i * 30 + rnd.uniform(-8, 8)
        g.blob((x, dpt(rnd.uniform(-8, 10)), 0.2), (rnd.uniform(18, 34), rnd.uniform(18, 40), 0.3), p=2.2, cuts=2)
    st.part(g, None, glow=hx(G["path"]))
    g = Geo()
    for sy in (-14, 12):
        for i in range(34):
            x = xa + i * 54 + rnd.uniform(-10, 10)
            g.blob((x, dpt(sy + rnd.uniform(-2, 2)), 0.3), (rnd.uniform(18, 30), 6, 0.3), p=2.2, cuts=2)
    st.part(g, None, glow=hx(G["rut"]))
    # the lip: a raised bevel of the path edge, then the front face going down
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(29), -3), ((xb - xa) / 2, 8, 3), p=4)
    st.part(g, dk(G["top"], 0.12), outline=0.0)
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(33) + dpt(255)) / 2, -8), ((xb - xa) / 2, (dpt(33) - dpt(255)) / 2 + 10, 3), p=8)
    st.part(g, None, glow=hx(G["face"]))
    # soil variation on the front face: lighter and darker patches
    ga, gd = Geo(), Geo()
    for i in range(70):
        x = rnd.uniform(xa, xb)
        y = dpt(rnd.uniform(40, 250))
        (ga if i % 2 else gd).blob((x, y, -4.7), (rnd.uniform(40, 110), rnd.uniform(25, 60), 0.3), p=2.0, cuts=2)
    st.part(ga, None, glow=hx(lt(G["face"], 0.05)))
    st.part(gd, None, glow=hx(dk(G["face"], 0.06)))
    # pebbles on the lane, with a cel shade (lumpy rocks)
    g, g2 = Geo(), Geo()
    for i in range(110):
        x = rnd.uniform(xa, xb)
        sy = rnd.uniform(-24, 26)
        s = rnd.uniform(1.6, 4.2)
        rock(g if i % 3 else g2, (x, dpt(sy), s * 0.4), (s * 1.3, s * 1.1, s * 0.8), seed=i, jag=0.2, p=2.4, cuts=2)
    st.part(g, lt(G["top"], 0.12), outline=0.4)
    st.part(g2, dk(G["top"], 0.15), outline=0.4)
    # the grass edge where the lane meets the verge (tufts on both edges)
    gt = Geo()
    for sy, n in ((-27, 90), (29, 70)):
        for i in range(n):
            x = rnd.uniform(xa, xb)
            y = dpt(sy + rnd.uniform(-1.5, 1.5))
            for k in range(3):
                a = rnd.uniform(-0.5, 0.5)
                gt.capsule((x + k * 1.6, y, 0), (x + k * 1.6 + math.sin(a) * 6, y, 7 + rnd.uniform(0, 5)), 0.9, 0.3, segs=5, rings=2)
    st.part(gt, G["grass"] if arena not in ("neon_harbor", "orbital_ring") else lt(G["grass"], 0.2), outline=0.3, finish="hair")
    ARENA_DECOR[arena](st, G, rnd, xa, xb)


def decor_tar_pits(st, G, rnd, xa, xb):
    x = xa + 80
    pools = []
    while x < xb - 60:
        sy = rnd.uniform(70, 190)
        rx = rnd.uniform(40, 80) * (0.8 + (sy - 60) / 200)
        pools.append((x, sy, rx))
        x += rx * 2 + rnd.uniform(80, 240)
    rim, tar, sheen = Geo(), Geo(), Geo()
    for px, sy, rx in pools:
        y = dpt(sy)
        rz = rx * 0.9
        rock(rim, (px, y, -8), (rx * 1.18, rz * 1.18, 9), seed=int(px), jag=0.12, p=2.4, cuts=3)
        tar.blob((px, y, -0.6), (rx, rz, 1.2), p=2.2, cuts=3)
        sheen.blob((px - rx * 0.3, y + rz * 0.35, 1.0), (rx * 0.42, rz * 0.16, 0.3), p=2.0, cuts=2)
        sheen.blob((px + rx * 0.3, y + rz * 0.2, 1.0), (rx * 0.08, rz * 0.08, 0.3), p=2.0, cuts=2)
        for b in range(rnd.randint(1, 3)):
            br = rnd.uniform(2, 5)
            tar.sphere((px + rnd.uniform(-0.5, 0.5) * rx, y + rnd.uniform(-0.4, 0.3) * rz, 0.6), br, cuts=2)
    st.part(rim, lt(G["face"], 0.06), outline=0.5)
    st.part(tar, 0x2A2224, outline=0.6, finish="gloss")
    st.part(sheen, 0xE8DCC8, outline=0.0, highlight=False)
    # shaded bones
    gb = Geo()
    for i in range(8):
        bx = xa + 120 + i * (xb - xa) / 8 + rnd.uniform(0, 80)
        by = dpt(rnd.uniform(60, 220))
        a = rnd.uniform(-0.5, 0.5)
        dx, dy = math.cos(a) * 18, math.sin(a) * 18
        gb.capsule((bx - dx, by - dy, -2), (bx + dx, by + dy, -2), 3.2)
        for e in (-1, 1):
            gb.sphere((bx + e * dx, by + e * dy + 3.6, -1.6), 4.4, cuts=2)
            gb.sphere((bx + e * dx, by + e * dy - 3.6, -1.6), 4.4, cuts=2)
    st.part(gb, 0xE8DCC4, outline=0.6)
    soil_rocks(st, G, rnd, xa, xb, 50)


def soil_rocks(st, G, rnd, xa, xb, n, color=None):
    g = Geo()
    for i in range(n):
        x = rnd.uniform(xa, xb)
        sy = rnd.uniform(44, 240)
        s = rnd.uniform(2, 6) * (1 + (sy - 30) / 180)
        rock(g, (x, dpt(sy), s * 0.3 - 6), (s * 1.3, s * 1.1, s * 0.9), seed=i + 300, jag=0.2, p=2.4, cuts=2)
    st.part(g, color if color is not None else mixc(G["top"], G["face"], 0.4), outline=0.5)


def decor_frostfang(st, G, rnd, xa, xb):
    g = Geo()
    for i in range(16):
        x = xa + i * 120 + rnd.uniform(-30, 30)
        rock(g, (x, dpt(rnd.uniform(60, 200)), -6), (rnd.uniform(40, 80), 40, 10), seed=i, jag=0.08, p=2.2, cuts=3)
    st.part(g, 0xF2F6FA, outline=0.3)
    g = Geo()
    for i in range(12):
        x = xa + i * 150 + rnd.uniform(-30, 30)
        y = dpt(rnd.uniform(60, 200))
        g.capsule((x, y, 0.5), (x + 20, y - 30, 0.5), 1.2).capsule((x + 20, y - 30, 0.5), (x + 8, y - 60, 0.5), 1.0)
    st.part(g, 0x9AAAB8, outline=0.0, highlight=False)
    soil_rocks(st, G, rnd, xa, xb, 30, 0x8C98A6)


def decor_kingsmoat(st, G, rnd, xa, xb):
    g = Geo()
    for i in range(40):
        box(g, (xa + i * 44 + rnd.uniform(-4, 4), dpt(48), -4), (18, 16, 3), p=4)
    st.part(g, 0x9AA7AE, outline=0.5)
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(150) + dpt(260)) / 2, -5.4), ((xb - xa) / 2, (dpt(150) - dpt(260)) / 2, 2), p=8)
    st.part(g, 0x7F9AA8, outline=0.0, finish="gloss")
    g = Geo()
    for i in range(18):
        g.blob((xa + i * 100 + rnd.uniform(0, 40), dpt(rnd.uniform(165, 240)), -3.2), (20, 3, 0.3), p=2.0)
    st.part(g, 0xDCE8EE, outline=0.0, highlight=False)
    soil_rocks(st, G, rnd, xa, xb, 20)


def decor_powder_bay(st, G, rnd, xa, xb):
    g = Geo()
    for i in range(44):
        box(g, (xa + i * 40, dpt(66), -4), (18.5, (dpt(40) - dpt(96)) / 2, 2.4), p=4)
    st.part(g, 0x8A7560, outline=0.5)
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(100) + dpt(260)) / 2, -5.4), ((xb - xa) / 2, (dpt(100) - dpt(260)) / 2, 2), p=8)
    st.part(g, 0x9CB6BC, outline=0.0, finish="gloss")
    g = Geo()
    for i in range(12):
        x = xa + 60 + i * 150
        g.capsule((x, dpt(96), -30), (x, dpt(96), 4), 4.5)
    st.part(g, 0x5E4E40, outline=0.5)


def decor_iron_front(st, G, rnd, xa, xb):
    g, g2 = Geo(), Geo()
    for i in range(8):
        x = xa + 120 + i * 210 + rnd.uniform(-40, 40)
        y = dpt(rnd.uniform(60, 160))
        rock(g, (x, y, -8), (62, 50, 10), seed=i, jag=0.1, p=2.4, cuts=3)
        g2.blob((x, y, -1), (44, 34, 1.5), p=2.2, cuts=3)
    st.part(g, dk(G["face"], 0.1), outline=0.5)
    st.part(g2, dk(G["face"], 0.4), outline=0.4, highlight=False)
    g = Geo()
    for i in range(30):
        x = xa + i * 60
        g.capsule((x, dpt(130), 0), (x, dpt(130), 18), 1.4)
    for i in range(29):
        x = xa + i * 60
        for k in range(6):
            a, b = k / 6, (k + 1) / 6
            g.capsule((x + 60 * a, dpt(130), 12 + 3 * math.sin(a * 12)), (x + 60 * b, dpt(130), 12 + 3 * math.sin(b * 12)), 0.6)
    st.part(g, 0x3A3632, outline=0.3, finish="metal")
    soil_rocks(st, G, rnd, xa, xb, 40)


def decor_neon_harbor(st, G, rnd, xa, xb):
    g, g2 = Geo(), Geo()
    for i in range(22):
        (g if i % 2 else g2).blob((xa + i * 80 + 38, (dpt(34) + dpt(104)) / 2, -3), (37, (dpt(34) - dpt(104)) / 2, 2), p=6, cuts=2)
    st.part(g, G["face"], outline=0.4)
    st.part(g2, dk(G["face"], 0.08), outline=0.4)
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(34), -0.5), ((xb - xa) / 2, 1.2, 0.6), p=4, cuts=2)
    st.part(g, None, glow="#7FE8C4")
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(104), -0.5), ((xb - xa) / 2, 1.2, 0.6), p=4, cuts=2)
    st.part(g, None, glow="#E89CC8")
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(110) + dpt(260)) / 2, -5.4), ((xb - xa) / 2, (dpt(110) - dpt(260)) / 2, 2), p=8)
    st.part(g, 0x30343E, outline=0.0, finish="gloss")


def decor_orbital_ring(st, G, rnd, xa, xb):
    g, g2 = Geo(), Geo()
    for i in range(30):
        (g if i % 2 else g2).blob((xa + i * 60 + 28, (dpt(36) + dpt(76)) / 2, -3), (27, (dpt(36) - dpt(76)) / 2, 2), p=6, cuts=2)
    st.part(g, G["top"], outline=0.4, finish="metal")
    st.part(g2, dk(G["top"], 0.06), outline=0.4, finish="metal")
    g = Geo()
    box(g, ((xa + xb) / 2, dpt(78), -0.5), ((xb - xa) / 2, 1.2, 0.6), p=4, cuts=2)
    st.part(g, None, glow="#7FE8C4")
    g = Geo()
    box(g, ((xa + xb) / 2, (dpt(80) + dpt(260)) / 2, -5.4), ((xb - xa) / 2, (dpt(80) - dpt(260)) / 2, 2), p=8)
    st.part(g, 0x23262E, outline=0.0)
    g = Geo()
    for i in range(90):
        g.sphere((rnd.uniform(xa, xb), dpt(rnd.uniform(96, 250)), -3.2), rnd.uniform(0.6, 1.4), cuts=1)
    st.part(g, None, glow="#E8ECF4")


def decor_chrono_rift(st, G, rnd, xa, xb):
    g, gc = Geo(), Geo()
    for i in range(12):
        x = xa + i * 150 + rnd.uniform(0, 40)
        pts = [(x, 40), (x + 30, 80), (x + 10, 130), (x + 40, 180)]
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            g.capsule((ax, dpt(ay), 0.4), (bx, dpt(by), 0.4), 1.6)
        cx, cy = x + 70, dpt(rnd.uniform(50, 200))
        for k in range(3):
            a = rnd.uniform(-0.4, 0.4)
            gc.lathe([(0, 0), (4, 2), (3.6, 14), (0, 20)], (cx + k * 6, cy, -2), (cx + k * 6 + math.sin(a) * 20, cy, 18 + math.cos(a) * 4), segs=6)
    st.part(g, None, glow="#B8A6E0")
    st.part(gc, 0xB8A6E0, outline=0.5, finish="gloss")
    soil_rocks(st, G, rnd, xa, xb, 30)


ARENA_DECOR = {"tar_pits": decor_tar_pits, "frostfang": decor_frostfang, "kingsmoat": decor_kingsmoat,
               "powder_bay": decor_powder_bay, "iron_front": decor_iron_front, "neon_harbor": decor_neon_harbor,
               "orbital_ring": decor_orbital_ring, "chrono_rift": decor_chrono_rift}


# -- post-processing ------------------------------------------------------------------------------
def rgb01(v):
    return np.array([(v >> 16) & 255, (v >> 8) & 255, v & 255], np.float32) / 255.0


def finish_layer(arr, age, layer):
    """Desaturate and haze toward the horizon colour (more at the foot); a soft thin outline for mid."""
    P = PAL[age]
    desat, haze_top, haze_foot = LOOK[layer]
    rgb, a = arr[..., :3], arr[..., 3:4]
    luma = (rgb * np.array([0.3, 0.59, 0.11], np.float32)).sum(-1, keepdims=True)
    rgb = rgb + (luma - rgb) * desat
    horizon = rgb01(mixc(P["skyBottom"], P["light"], 0.35))
    h = arr.shape[0]
    f = FRAMES[layer]
    foot = (-f["yTop"]) * f["ppl"]            # the ground line's row
    rows = np.arange(h, dtype=np.float32)[:, None, None]
    t = np.clip(rows / max(1.0, foot), 0, 1)
    haze = haze_top + (haze_foot - haze_top) * t ** 2
    rgb = rgb + (horizon - rgb) * haze
    return np.concatenate([np.clip(rgb, 0, 1), a], -1)


def finish_ground(arr):
    """Opaque ground with a soft darker front lip toward the bottom (under the HUD)."""
    rgb, a = arr[..., :3], arr[..., 3:4]
    h = arr.shape[0]
    f = FRAMES["ground"]
    rows = (np.arange(h, dtype=np.float32) / f["ppl"] + f["yTop"])[:, None, None]   # screen lu
    shade = np.clip((rows - 40) / 210, 0, 1) ** 1.3 * 0.42
    rgb = rgb * (1 - shade)
    # fill any gap with the darkest soil
    rgb = rgb * a + (1 - a) * rgb.mean(axis=(0, 1), keepdims=True) * 0.6
    return np.concatenate([np.clip(rgb, 0, 1), np.ones_like(a)], -1)


def save_webp(arr, path, alpha=True, q=86):
    im = Image.fromarray((np.clip(arr, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")
    if not alpha:
        im = im.convert("RGB")
    im.save(path, "WEBP", quality=q, method=6)
    return os.path.getsize(path)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--no-install", action="store_true")
    args = ap.parse_args()
    only = [s for s in args.only.split(",") if s]
    out = os.path.abspath(args.out)
    os.makedirs(out, exist_ok=True)
    sizes = {}
    for age in AGES:
        if only and age not in only:
            continue
        meta = {}
        for layer, fn in (("far", FAR[age]), ("mid", MID[age])):
            st = Stage(layer)
            fn(st, PAL[age])
            raw = st.render(os.path.join(out, f"{age}_{layer}_raw.png"))
            arr = sheet.load(raw)
            if layer == "mid":
                arr, _ = sheet.outline(arr, None, 1.6, 0.62, 0.55, seed_inset_px=2)
            arr = finish_layer(arr, age, layer)
            dst = os.path.join(out, f"{age}_{layer}.webp")
            sizes[dst] = save_webp(arr, dst, alpha=True, q=88)
            f = FRAMES[layer]
            meta[layer] = {"image": f"{layer}.webp", "x0": X0, "width": WIDTH, "yTop": f["yTop"], "height": f["height"],
                           "pxPerLu": f["ppl"], "ambient": st.ambient}
            print(f"[{age}.{layer}] {sizes[dst] // 1024} KB, {len(st.ambient)} ambient", flush=True)
        with open(os.path.join(out, f"{age}.json"), "w") as fh:
            json.dump(meta, fh, separators=(",", ":"))
        if not args.no_install:
            dest = os.path.join(REPO, "public", "art", "backdrops", age)
            os.makedirs(dest, exist_ok=True)
            for layer in ("far", "mid"):
                shutil.copyfile(os.path.join(out, f"{age}_{layer}.webp"), os.path.join(dest, f"{layer}.webp"))
            shutil.copyfile(os.path.join(out, f"{age}.json"), os.path.join(dest, "layers.json"))
    for arena in ARENAS:
        if only and arena not in only:
            continue
        st = Stage("ground")
        ground_scene(st, arena)
        raw = st.render(os.path.join(out, f"ground_{arena}_raw.png"))
        arr = finish_ground(sheet.load(raw))
        dst = os.path.join(out, f"ground_{arena}.webp")
        sizes[dst] = save_webp(arr, dst, alpha=False, q=84)
        print(f"[ground.{arena}] {sizes[dst] // 1024} KB", flush=True)
        if not args.no_install:
            dest = os.path.join(REPO, "public", "art", "ground")
            os.makedirs(dest, exist_ok=True)
            shutil.copyfile(dst, os.path.join(dest, f"{arena}.webp"))
    print(json.dumps({os.path.basename(k): v for k, v in sizes.items()}))


if __name__ == "__main__":
    main()
