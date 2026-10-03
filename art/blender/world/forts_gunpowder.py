"""Gunpowder forts in the cartoon style (DESIGN A16.14.4; the MVP release check flagged the realistic ones;
CONTENT_PLAN 5.4 adds the Cavalry Picket and the Fougasse).

Built with `world/fort_toon.py` (the cartoon unit look, the fort sheet contract of
`src/visuals/fortViews/atlasFortView.ts`). Heights, hit points, flag and crew points follow the realistic forts
they replace, so the game's placement and the crew on the redoubt line up unchanged.

  gabion_wall     wall   three tiers of wicker gabions filled with earth on a bank, team boards, a cream anchor
  musket_redoubt  tower  an earth-and-fascine redoubt with a timber platform, gabion parapet; a Fusilier crew
  militia_muster  camp   a striped team ridge tent, a stand of muskets, a team drum, powder kegs, a crate
  powder_keg      trap   a buried powder keg with a fuse under a scatter of straw, a team rag marker
  cavalry_picket  camp   a picket line: a tethering rail with a team saddle-cloth, a lean-to, hay and a horseshoe
                         sign; the rail gate swings open (the brute camp; its levy is the Picket Rider)
  fougasse        trap   a buried mine: a keg under a cairn of stones, the fuse snaking to a team marker (double blast)

Run: `<venv>/bin/python art/blender/world/render_forts.py --age gunpowder --out <scratch> [--only a,b] [--install]`.
"""
import math

from ageborn_art.geometry import Geo

from world.common import rock
from world.fort_toon import make, scaffold

AGE = "gunpowder"
WICKER = "#9A8668"
WICKER_DK = "#7A6852"
EARTH = "#8A7660"
EARTH_DK = "#6E5E4C"
WOOD = "#9C8266"
WOOD_DK = "#6E5A48"
WALNUT = "#5E4A3C"
IRON = "#4E5258"
IRON_LT = "#8E96A0"
ROPE = "#C2AE86"
CREAM = "#EFE6CF"
CANVAS = "#DCD2BA"
STRAW = "#CDBB92"
STONE = "#A8A49A"
STONE_DK = "#86827A"
BRASS = "#B8A570"
FIRE = "#FFE3B0"
HAY = "#C8B47E"


def _anchor(f, c, s, y, fam="body", lo=0, hi=1):
    """A cream anchor on a team surface facing -y (shank, stock, ring and arms as flat strokes)."""
    x, z = c
    g = Geo().capsule((x, y, z + 2.6 * s), (x, y, z - 2.8 * s), 0.55 * s)
    g.capsule((x - 1.9 * s, y, z + 1.6 * s), (x + 1.9 * s, y, z + 1.6 * s), 0.5 * s)
    g.lathe([(1.1 * s, -0.3), (1.5 * s, 0), (1.1 * s, 0.3)], (x, y + 0.2, z + 3.6 * s), (x, y - 0.2, z + 3.6 * s), segs=12)
    for k in range(5):
        a0 = math.radians(200 + 35 * k)
        a1 = math.radians(200 + 35 * (k + 1))
        g.capsule((x + 2.8 * s * math.cos(a0), y, z - 0.8 * s + 2.2 * s * math.sin(a0)),
                  (x + 2.8 * s * math.cos(a1), y, z - 0.8 * s + 2.2 * s * math.sin(a1)), 0.5 * s)
    f.add(g, CREAM, fam, lo, hi, outline=0.2)


def _gabion(x, y, z, r, h):
    """A wicker gabion: a basket cylinder with weave bands, earth showing on top."""
    g = Geo().lathe([(r, 0), (r + 0.4, h * 0.5), (r, h)], (x, y, z), (x, y, z + h), segs=16)
    return g


def _gabion_bands(x, y, z, r, h):
    g = Geo()
    for t in (0.18, 0.5, 0.82):
        g.lathe([(r + 0.35, -0.5), (r + 0.75, 0), (r + 0.35, 0.5)], (x, y, z + h * t), (x, y, z + h * t + 0.05), segs=16)
    return g


# ============================================================================== Gabion Wall (wall)
def _gabion_wall(f):
    f.add(Geo().blob((0, 0, 0), (16, 42, 4.0), p=2.4), EARTH, "body", 0, 3)
    f.add(Geo().blob((0, 0, 0), (19, 45, 3.4), p=2.4), EARTH, "rubble")
    rows = [(0.0, 6, 0.0, 7.0, 17.0), (-2.0, 5, 17.0, 6.6, 15.0), (-4.0, 3, 32.0, 6.0, 13.0)]
    for ri, (x, n, z, r, h) in enumerate(rows):
        span = (n - 1) * r * 2.0
        for i in range(n):
            y = -span / 2 + i * r * 2.0
            st = [4, 3, 2][ri] if i % 2 or ri == 0 else [4, 3, 1][ri]

            def make_(fallen, x=x, y=y, z=z, r=r, h=h):
                if not fallen:
                    return _gabion(x, y, z, r, h), WICKER
                g = Geo().blob((x + 14 + (y % 7), y, 3.0), (r * 1.1, r, 3.0), p=2.4)
                return g, WICKER_DK
            f.breakable(make_, st)
            if st > 1:
                f.add(_gabion_bands(x, y, z, r, h), WICKER_DK, "body", 0, min(3, st - 1), outline=0.2)
                f.add(Geo().blob((x, y, z + h), (r * 0.9, r * 0.9, 1.6), p=2.4), EARTH_DK, "body", 0, min(3, st - 1),
                      outline=0)
    # team boards lashed across the front of the bottom tier, a cream anchor
    for y0, y1, st in ((-40.0, -8.0, 3), (8.0, 40.0, 3)):
        g = Geo().blob((7.6, (y0 + y1) / 2, 9.0), (1.2, (y1 - y0) / 2, 4.6), p=4.0)
        f.add(g, None, "body", 0, st - 1, team=True, outline=0.4)
    _anchor(f, (8.0, 9.0), 1.4, -24.0, lo=0, hi=1)
    _anchor(f, (8.0, 9.0), 1.4, 24.0, lo=0, hi=1)
    g = Geo()
    for y in (-30.0, 0.0, 30.0):
        g.capsule((8.4, y, 3.0), (8.4, y, 15.0), 0.6)
    f.add(g, ROPE, "body", 0, 2, outline=0.2)
    for k in range(6):
        f.add(Geo().blob((10 + k * 3, -30 + k * 11, 2.2), (6.0, 5.0, 2.4), p=2.4), WICKER_DK, "rubble")
    f.add(Geo().blob((14, 4, 2.4), (8, 10, 1.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -10, 10, -42, 42, 46)


GABION_WALL = make("gabion_wall", "Gabion Wall", AGE, "wall", _gabion_wall, canvas=(300, 250), feet=(150, 218),
                   height=86, hit=(3, 28), material="stone", flag=(-9.0, 0.0, 0.0, 84.0), flag_len=24.0, foot=28.0,
                   yaw=-38.0)


# ============================================================================ Musket Redoubt (tower)
def _musket_redoubt(f):
    # an earth mound faced with fascines (bundled sticks), three courses that break from the top
    for r, (z0, z1, st) in enumerate(((0.0, 13.0, 4), (13.0, 25.0, 3), (25.0, 36.0, 2))):
        def make_(fallen, z0=z0, z1=z1, r=r):
            if not fallen:
                w = 15.0 - r * 1.0
                g = Geo().blob((0, 0, (z0 + z1) / 2), (w, w, (z1 - z0) / 2 + 0.4), p=5.0)
                return g, EARTH if r % 2 else EARTH_DK
            g = Geo()
            for k in range(3):
                rock(g, (17 + k * 6, -6 + k * 6, 2.4), (4.6, 3.8, 2.4), seed=r * 3 + k, jag=0.2)
            return g, EARTH_DK
        f.breakable(make_, st)
        g = Geo()
        w = 15.4 - r * 1.0
        for z in (z0 + 3.0, z0 + 7.5):
            if z < z1:
                g.capsule((-w + 1, -w, z), (w - 1, -w, z), 1.3)
                g.capsule((w, -w + 1, z), (w, w - 1, z), 1.3)
        f.add(g, WICKER, "body", 0, min(3, st - 1), outline=0.3)            # fascine bundles
    # the timber platform at z 37 the crew stands on; it sinks with the broken top
    f.add(Geo().blob((1, 0, 37.0), (16, 16, 1.8), p=4.0), WOOD, "body", 0, 1)
    f.add(Geo().blob((2, 0, 26.0), (15, 14, 1.8), p=4.0, rot=(0, 6, 0)), WOOD, "body", 2, 2)
    f.add(Geo().blob((3, 0, 14.0), (14, 13, 1.6), p=4.0, rot=(0, -9, 0)), WOOD_DK, "body", 3, 3)
    # a team board hung on the near face with a cream anchor, an embrasure
    g = Geo().slab([(-7, 33), (7, 33), (7, 18), (0, 15), (-7, 18)], -15.6, 1.0)
    f.add(g, None, "body", 0, 1, team=True, outline=0.5)
    _anchor(f, (0.0, 25.0), 1.4, -16.4)
    f.add(Geo().blob((9.0, -15.2, 9.0), (2.4, 0.8, 2.2), p=2.4), "#3A3632", "body", 0, 2, outline=0)
    # a lantern on a post (the light)
    f.add(Geo().capsule((12.0, 10.0, 36.0), (12.0, 10.0, 41.0), 0.7), WALNUT, "body", 0, 1)
    f.add(Geo().blob((12.0, 10.0, 42.4), (1.8, 1.8, 2.2), p=2.6), None, "body", 0, 1, glow=FIRE, outline=0.5)
    # gabion parapet over the crew (front family), team bands on the baskets
    for st in range(4):
        h = [9.0, 7.0, 0.0, 0.0][st]
        if h <= 0:
            continue
        g = Geo()
        for y in (-10.0, 0.0, 10.0):
            g.lathe([(4.6, 0), (4.9, h * 0.5), (4.6, h)], (14.0, y, 37.4), (14.0, y, 37.4 + h), segs=14)
        f.add(g, WICKER, "front", st, st)
        g = Geo()
        for y in (-10.0, 0.0, 10.0):
            g.lathe([(4.95, -0.6), (5.3, 0), (4.95, 0.6)], (14.0, y, 37.4 + h * 0.5), (14.0, y, 37.45 + h * 0.5), segs=14)
        f.add(g, None, "front", st, st, team=True, outline=0.3)
    for k in range(6):
        g = Geo()
        rock(g, (10 + k * 4, -10 + k * 4, 2.4), (4.6, 3.8, 2.4), seed=40 + k, jag=0.2)
        f.add(g, EARTH_DK, "rubble")
    f.add(Geo().blob((16, 2, 2), (7, 8, 1.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -16, 16, -16, 16, 40)


MUSKET_REDOUBT = make("musket_redoubt", "Musket Redoubt", AGE, "tower", _musket_redoubt, canvas=(240, 260),
                      feet=(118, 228), height=96, hit=(0, 22), material="wood", flag=(-11.0, 9.0, 37.6, 34.0),
                      flag_len=16.0, foot=18.0, yaw=-14.0,
                      crew=dict(visualId="unit.fusilier", at=(1.0, 0.0, 38.4), scale=0.6),
                      lights=[((12.0, 10.0, 42.4), 7, 2)])


# ============================================================================== Militia Muster (camp)
def _ridge_tent(f, lo, hi, sag=0.0, x0=-24.0, x1=14.0, y=-2.0, w=15.0, h=34.0):
    g = Geo()
    for side in (-1, 1):
        g.slab([(x0, 0.0), (x1, 0.0), (x1, h - sag), (x0, h - sag)], y + side * w * 0.5, 1.0)
    g = Geo().blob(((x0 + x1) / 2, y, (h - sag) * 0.48), ((x1 - x0) / 2, w * 0.5, (h - sag) * 0.5), p=2.0,
                   taper=(1.0, 0.18))
    g.clip((0, 0, 0.2), (0, 0, -1))
    f.add(g, CANVAS, "body", lo, hi)
    g = Geo()
    for k in range(5):   # team stripes down the roof
        xx = x0 + 4 + k * (x1 - x0 - 8) / 4
        g.blob((xx, y, (h - sag) * 0.5), (2.2, w * 0.52, (h - sag) * 0.5), p=2.0, taper=(1.0, 0.18))
    g.clip((0, 0, 0.2), (0, 0, -1))
    f.add(g, None, "body", lo, hi, team=True, outline=0.3)
    g = Geo()
    for k in range(9):   # a scalloped team valance along the near eave
        g.blob((x0 + 2 + k * (x1 - x0 - 4) / 8, y - w * 0.5 - 0.6, 8.0), (2.2, 0.8, 2.2), p=2.0)
    f.add(g, None, "body", lo, hi, team=True, outline=0.3)


def _militia_muster(f):
    _ridge_tent(f, 0, 1)
    _ridge_tent(f, 2, 2, sag=6.0)
    g = Geo().blob((-6, -2, 6), (20, 14, 6), p=2.2)
    f.add(g, CANVAS, "body", 3, 3)
    f.add(Geo().blob((0, -8, 7), (12, 7, 3), p=2.4), None, "body", 3, 3, team=True)
    g = Geo().capsule((-26, -2, 34.5), (16, -2, 34.5), 0.9)
    for x in (-24, 14):
        g.capsule((x, -2, 0), (x, -2, 36), 0.9)
    f.add(g, WALNUT, "body", 0, 1, outline=0.4)
    # the door flap at the lane end (closed, half open, open)
    for i, w in enumerate((1.0, 0.5, 0.0)):
        if i > 0:
            f.add(Geo().blob((14.6, -2.0, 9.0), (0.6, 6.0, 9.0), p=2.0, taper=(1.0, 0.2)), "#3A322E", "door", i, i, outline=0)
        if w > 0:
            g = Geo().blob((15.2, -2.0 - 8.0 * (1 - w), 11.0), (0.8, 8.0 * w, 11.0), p=2.0, taper=(1.0, 0.25))
            f.add(g, CANVAS, "door", i, i)
    # a stand of muskets, a team drum, powder kegs, a crate
    g = Geo()
    for k in range(3):
        a = math.radians(120 * k)
        g.capsule((28 + 4 * math.cos(a), 8 + 4 * math.sin(a), 0), (28, 8, 32), 0.9)
    f.add(g, WALNUT, "body", 0, 1, outline=0.4)
    g = Geo()
    for k in range(3):
        a = math.radians(120 * k)
        g.capsule((28 + 0.4 * math.cos(a), 8 + 0.4 * math.sin(a), 30), (28 - 1.0 * math.cos(a), 8, 38), 0.4)
    f.add(g, IRON_LT, "body", 0, 1, finish="metal", outline=0.3)
    f.add(Geo().lathe([(5.0, 0), (5.2, 3.5), (5.0, 7.0)], (24, -18, 0), (24, -18, 7.0), segs=20), None, "body", 0, 2,
          team=True)
    g = Geo()
    for z in (0.6, 6.4):
        g.lathe([(5.3, -0.5), (5.7, 0), (5.3, 0.5)], (24, -18, z), (24, -18, z + 0.05), segs=20)
    f.add(g, CREAM, "body", 0, 2, outline=0.3)
    f.add(Geo().lathe([(0, 0), (4.9, 0), (4.9, 0.4), (0, 0.4)], (24, -18, 7.0), (24, -18, 7.4), segs=20), "#EFE9DA",
          "body", 0, 2)
    for k, (x, y) in enumerate(((-34, -14), (-28, -18))):
        g = Geo().lathe([(3.2, 0), (3.8, 4.5), (3.2, 9.0)], (x, y, 0), (x, y, 9.0), segs=16)
        f.add(g, WALNUT, "body", 0, 2)
        g = Geo()
        for z in (1.6, 7.4):
            g.lathe([(3.5, -0.5), (3.8, 0), (3.5, 0.5)], (x, y, z), (x, y, z + 0.05), segs=16)
        f.add(g, IRON, "body", 0, 2, finish="metal", outline=0.3)
    f.add(Geo().blob((30, 18, 3), (4.6, 3.6, 3.0), p=5.0), WOOD, "body", 0, 3)
    for k in range(5):
        a = k * 1.3
        f.add(Geo().capsule((math.cos(a) * 14, math.sin(a) * 14, 1.2),
                            (math.cos(a) * 14 + 28 * math.cos(a + 1.4), math.sin(a) * 14 + 20 * math.sin(a + 1.4), 1.4), 1.1),
              WALNUT, "rubble")
    f.add(Geo().blob((6, -8, 3), (14, 8, 2.4), p=2.4), None, "rubble", team=True)
    f.add(Geo().blob((-6, 6, 2), (14, 10, 2.0), p=2.4), CANVAS, "rubble")
    scaffold(f, -24, 14, -10, 6, 40, levels=1)


MILITIA_MUSTER = make("militia_muster", "Militia Muster", AGE, "camp", _militia_muster, canvas=(300, 250),
                      feet=(150, 214), height=76, hit=(0, 20), material="wood", flag=(-30.0, -18.0, 0.0, 66.0),
                      flag_len=22.0, foot=30.0, yaw=-24.0, extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ================================================================================= Powder Keg (trap)
def _keg(f, lo, hi, x=0.0, y=0.0, z=0.0, s=1.0, fill=WALNUT):
    g = Geo().lathe([(4.2 * s, 0), (5.0 * s, 5.0 * s), (4.2 * s, 10.0 * s)], (x, y, z), (x, y, z + 10.0 * s), segs=18)
    f.add(g, fill, "trap", lo, hi)
    g = Geo()
    for t in (0.15, 0.85):
        g.lathe([(4.5 * s, -0.5), (4.9 * s, 0), (4.5 * s, 0.5)], (x, y, z + 10 * s * t), (x, y, z + 10 * s * t + 0.05),
                segs=18)
    f.add(g, IRON, "trap", lo, hi, finish="metal", outline=0.3)
    f.add(Geo().blob((x, y - 4.6 * s, z + 5.0 * s), (2.0 * s, 0.6, 2.0 * s), p=2.4), CREAM, "trap", lo, hi, outline=0.2)


def _powder_keg(f):
    f.add(Geo().blob((0, 0, 0.3), (18, 12, 0.8), p=2.4), EARTH, "trap", 0, 3, outline=0)
    _keg(f, 0, 0)                                                   # unarmed: the keg sits in plain view
    # armed: the keg half buried under straw, the fuse snaking off
    _keg(f, 1, 1, z=-4.0)
    g = Geo()
    for k in range(10):
        g.blob((-12 + k * 2.6, ((k * 31) % 11) - 5.0, 2.4), (3.0, 2.2, 1.0), p=2.0)
    f.add(g, STRAW, "trap", 1, 1)
    # sprung: staves flung out, a scorch
    f.add(Geo().blob((0, 0, 0.5), (12, 8, 0.7), p=2.4), "#4A423A", "trap", 2, 3, outline=0)
    g = Geo()
    for k in range(6):
        a = k * math.pi / 3
        g.blob((math.cos(a) * 8.0, math.sin(a) * 6.0, 3.0 + (k % 2) * 3), (3.6, 1.0, 1.0), p=2.4, rot=(0, 30 * (k % 3), 0))
    f.add(g, WALNUT, "trap", 2, 2)
    g = Geo()
    for k in range(4):
        a = k * math.pi / 2 + 0.4
        g.blob((math.cos(a) * 10.0, math.sin(a) * 7.0, 1.0), (3.4, 1.0, 0.8), p=2.4)
    f.add(g, WALNUT, "trap", 3, 3)
    # fuse and a team rag marker (every frame)
    g = Geo().capsule((-3.0, 2.0, 1.0), (-10.0, 5.0, 0.8), 0.45).capsule((-10.0, 5.0, 0.8), (-16.0, 8.0, 0.8), 0.45)
    f.add(g, "#3A3632", "trap", 0, 1, outline=0.2)
    f.add(Geo().capsule((-17.0, 8.0, 0), (-18.0, 8.0, 16.0), 0.9), WALNUT, "trap", 0, 3)
    g = Geo().slab([(-18.0, 15.5), (-26.0, 14.0), (-24.0, 11.0), (-18.0, 11.5)], 8.0, 1.0)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)
    f.add(Geo().blob((-15.0, 10.0, 2.0), (3.6, 2.6, 2.2), p=2.2), None, "trap", 0, 3, team=True, outline=0.5)


POWDER_KEG = make("powder_keg", "Powder Keg", AGE, "trap", _powder_keg, canvas=(200, 120), feet=(100, 92), height=24,
                  hit=(0, 6), material="wood", foot=28.0, yaw=-12.0)


# ============================================================================= Cavalry Picket (camp)
def _cavalry_picket(f):
    # a lean-to of planks with a team canvas roof
    def leanto(lo, hi, sag=0.0):
        g = Geo()
        for x in (-30.0, -6.0):
            g.capsule((x, 4.0, 0), (x, 4.0, 30.0 - sag), 1.1)
            g.capsule((x, -12.0, 0), (x, -12.0, 18.0 - sag * 0.5), 1.0)
        f.add(g, WOOD_DK, "body", lo, hi, outline=0.4)
        g = Geo().blob((-18.0, -4.0, 24.0 - sag * 0.8), (15.0, 10.0, 1.2), p=4.0, rot=(-35, 0, 0))
        f.add(g, None, "body", lo, hi, team=True)
        g = Geo()
        for k in range(7):
            g.blob((-31.0 + k * 4.3, -11.8, 16.6 - sag * 0.5), (2.0, 0.8, 2.0), p=2.0)
        f.add(g, CREAM, "body", lo, hi, outline=0.3)                  # scalloped edge
        g = Geo().blob((-18.0, 4.6, 14.0), (13.0, 0.8, 14.0 - sag * 0.5), p=4.0)
        f.add(g, WOOD, "body", lo, hi)                                # back wall planks
    leanto(0, 1)
    leanto(2, 2, sag=7.0)
    f.add(Geo().blob((-18, -2, 4), (16, 10, 4), p=2.2), WOOD_DK, "body", 3, 3)
    f.add(Geo().blob((-16, -6, 5), (9, 6, 2.4), p=2.4), None, "body", 3, 3, team=True)
    # the tethering rail with a team saddle-cloth thrown over it and a saddle
    g = Geo()
    for x in (2.0, 26.0):
        g.capsule((x, 0.0, 0), (x, 0.0, 20.0), 1.3)
    g.capsule((0.0, 0.0, 19.0), (28.0, 0.0, 19.0), 1.2)
    f.add(g, WALNUT, "body", 0, 2, outline=0.4)
    g = Geo().blob((14.0, 0.0, 15.0), (6.0, 2.0, 6.0), p=3.0)
    f.add(g, None, "body", 0, 1, team=True, outline=0.4)
    g = Geo().blob((14.0, 0.0, 21.2), (5.4, 3.4, 2.4), p=2.6)
    f.add(g, "#6E5646", "body", 0, 1)
    _anchor(f, (14.0, 14.6), 0.9, -2.2)
    # hay bale and a bucket
    f.add(Geo().blob((34.0, -12.0, 4.6), (6.0, 4.6, 4.6), p=4.0), HAY, "body", 0, 3)
    g = Geo()
    for z in (2.4, 6.8):
        g.blob((34.0, -12.0, z), (6.1, 4.7, 0.5), p=4.0)
    f.add(g, "#9A8658", "body", 0, 3, outline=0.2)
    f.add(Geo().lathe([(3.0, 0), (3.4, 5.0), (3.0, 5.4)], (36.0, 8.0, 0), (36.0, 8.0, 5.4), segs=14), WOOD, "body", 0, 2)
    # a horseshoe sign on a post
    f.add(Geo().capsule((-36.0, -14.0, 0), (-36.0, -14.0, 26.0), 0.9), WALNUT, "body", 0, 2, outline=0.4)
    g = Geo()
    for k in range(7):
        a0 = math.radians(-30 + 40 * k)
        a1 = math.radians(-30 + 40 * (k + 1))
        if k < 6:
            g.capsule((-36.0 + 3.0 * math.cos(a0), -15.2, 26.0 + 3.0 * math.sin(a0)),
                      (-36.0 + 3.0 * math.cos(a1), -15.2, 26.0 + 3.0 * math.sin(a1)), 0.8)
    f.add(g, IRON_LT, "body", 0, 2, finish="metal", outline=0.3)
    # the door family: the rail gate across the front swings open (closed, half, open)
    for i, ang in enumerate((0.0, 45.0, 85.0)):
        a = math.radians(ang)
        hx, hy = 30.0, -16.0
        tx, ty = hx - 16.0 * math.cos(a), hy - 16.0 * math.sin(a)
        g = Geo()
        for z in (6.0, 13.0):
            g.capsule((hx, hy, z), (tx, ty, z), 0.9)
        g.capsule((tx, ty, 3.0), (tx, ty, 15.0), 0.9)
        g.capsule((hx, hy, 6.0), (tx, ty, 13.0), 0.7)
        f.add(g, WOOD, "door", i, i, outline=0.4)
    f.add(Geo().capsule((30.0, -16.0, 0), (30.0, -16.0, 17.0), 1.2), WALNUT, "body", 0, 3, outline=0.4)
    # rubble
    for k in range(5):
        a = k * 1.3
        f.add(Geo().capsule((math.cos(a) * 12, math.sin(a) * 12, 1.2),
                            (math.cos(a) * 12 + 26 * math.cos(a + 1.4), math.sin(a) * 12 + 18 * math.sin(a + 1.4), 1.4), 1.1),
              WALNUT, "rubble")
    f.add(Geo().blob((-10, -6, 3), (14, 8, 2.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -32, 0, -14, 6, 34, levels=1)


CAVALRY_PICKET = make("cavalry_picket", "Cavalry Picket", AGE, "camp", _cavalry_picket, canvas=(300, 250),
                      feet=(150, 214), height=70, hit=(0, 20), material="wood", flag=(-40.0, 0.0, 0.0, 62.0),
                      flag_len=20.0, foot=30.0, yaw=-24.0, extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ==================================================================================== Fougasse (trap)
def _fougasse(f):
    f.add(Geo().blob((0, 0, 0.3), (22, 13, 0.8), p=2.4), EARTH, "trap", 0, 3, outline=0)
    # unarmed: an open pit with the keg in it and a pile of stones beside it
    f.add(Geo().blob((0, 0, 0.6), (8, 6, 0.6), p=2.4), EARTH_DK, "trap", 0, 0, outline=0)
    _keg(f, 0, 0, z=-2.0, s=0.9)
    g = Geo()
    for k in range(6):
        rock(g, (12.0 + (k % 3) * 3.4, -6.0 + (k // 3) * 4.0, 1.8 + (k // 3) * 1.4), (2.4, 2.0, 1.8), seed=k, jag=0.25)
    f.add(g, STONE, "trap", 0, 0)
    # armed: a low cairn of stones over an earth mound hides the mine
    f.add(Geo().blob((0, 0, 1.0), (13, 9, 3.0), p=2.4), EARTH_DK, "trap", 1, 1)
    g = Geo()
    for k in range(9):
        a = k * 2 * math.pi / 9
        rock(g, (math.cos(a) * 7.0, math.sin(a) * 5.0, 3.0), (2.6, 2.2, 2.0), seed=10 + k, jag=0.25)
    rock(g, (0, 0, 4.6), (3.2, 2.8, 2.4), seed=30, jag=0.25)
    f.add(g, STONE, "trap", 1, 1)
    # sprung: stones flying up out of a dark burst; spent: a scorched crater ringed by stones
    f.add(Geo().blob((0, 0, 0.5), (14, 9, 0.7), p=2.4), "#4A423A", "trap", 2, 3, outline=0)
    g = Geo()
    for k in range(7):
        a = k * 2 * math.pi / 7
        rock(g, (math.cos(a) * 10.0, math.sin(a) * 7.0, 6.0 + (k % 3) * 4.0), (2.4, 2.0, 1.8), seed=40 + k, jag=0.25)
    f.add(g, STONE, "trap", 2, 2)
    f.add(Geo().blob((0, 0, 4.0), (6.0, 4.0, 4.0), p=2.0), None, "trap", 2, 2, glow=FIRE, outline=0.4)
    g = Geo()
    for k in range(8):
        a = k * 2 * math.pi / 8 + 0.2
        rock(g, (math.cos(a) * 14.0, math.sin(a) * 9.0, 1.4), (2.4, 2.0, 1.4), seed=60 + k, jag=0.25)
    f.add(g, STONE_DK, "trap", 3, 3)
    # the fuse snakes to a team marker (every frame)
    g = Geo().capsule((-4.0, 3.0, 1.0), (-11.0, 6.0, 0.8), 0.45).capsule((-11.0, 6.0, 0.8), (-17.0, 8.0, 0.8), 0.45)
    f.add(g, "#3A3632", "trap", 0, 1, outline=0.2)
    f.add(Geo().capsule((-19.0, 8.0, 0), (-20.0, 8.0, 16.0), 1.0), WALNUT, "trap", 0, 3)
    g = Geo().slab([(-20.0, 15.5), (-28.0, 14.0), (-26.0, 11.0), (-20.0, 11.5)], 8.0, 1.0)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)
    f.add(Geo().blob((-17.0, 10.0, 2.0), (3.6, 2.6, 2.2), p=2.2), None, "trap", 0, 3, team=True, outline=0.5)


FOUGASSE = make("fougasse", "Fougasse", AGE, "trap", _fougasse, canvas=(200, 120), feet=(100, 92), height=22,
                hit=(0, 6), material="stone", foot=28.0, yaw=-12.0)


FORTS = [GABION_WALL, MUSKET_REDOUBT, MILITIA_MUSTER, POWDER_KEG, CAVALRY_PICKET, FOUGASSE]
