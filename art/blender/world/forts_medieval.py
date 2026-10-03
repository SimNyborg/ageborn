"""Medieval forts in the cartoon style (DESIGN A16.14.4; the MVP release check flagged the realistic ones;
CONTENT_PLAN 5.3 adds the Bear Snares and the Crossbow Keep).

Built with `world/fort_toon.py` (the cartoon unit look, the fort sheet contract of
`src/visuals/fortViews/atlasFortView.ts`). Heights, hit points, flag and crew points follow the realistic forts
they replace, so the game's placement and the crew on the towers line up unchanged.

  shield_barricade  wall   a row of team pavises (parchment bear paws) on a timber frame on an earth bank
  longbow_tower     tower  a square limestone tower with a timber hoarding; a Longbowman crew
  crossbow_keep     tower  a round stone keep with arrow slits and a team shield; a Crossbowman crew (slow tower)
  levy_camp         camp   a striped team bell tent with a scalloped valance, its door flap, a cook fire
  wolf_pits         trap   a stake pit under a woven wattle hurdle, a team rag marker
  bear_snares       trap   three iron jaw snares hidden in leaves, chained to a stake with a team rag (chip trap)

Run: `<venv>/bin/python art/blender/world/render_forts.py --age medieval --out <scratch> [--only a,b] [--install]`.
"""
import math

from ageborn_art.geometry import Geo

from world.common import rock
from world.fort_toon import make, scaffold

AGE = "medieval"
STONE = "#B3B0A6"
STONE_LT = "#C6C3B8"
STONE_DK = "#8E8B82"
MORTAR = "#77746C"
WOOD = "#9C8266"
WOOD_DK = "#6E5A48"
OAK = "#7E6A56"
IRON = "#5A6068"
IRON_LT = "#8E96A0"
ROPE = "#C2AE86"
EARTH = "#8A7660"
EARTH_DK = "#6E5E4C"
PARCH = "#E8DFC8"
CANVAS = "#DCD2BA"
LEAF = "#869A5E"
LEAF_DK = "#6A7E48"
TIP = "#C9B08A"
FIRE = "#FFE3B0"
ASH = "#5A524A"


def _paw(f, c, s, y, fam="body", lo=0, hi=1):
    """A parchment bear paw on a team surface facing -y (pad and four toes, flat discs)."""
    x, z = c
    g = Geo().blob((x, y, z - 0.8 * s), (2.6 * s, 0.6, 2.1 * s), p=2.2)
    for a in (152, 114, 66, 28):
        r = math.radians(a)
        g.blob((x + math.cos(r) * 3.0 * s, y, z + math.sin(r) * 2.4 * s + 0.9 * s), (1.2 * s, 0.6, 1.3 * s), p=2.0)
    f.add(g, PARCH, fam, lo, hi, outline=0.2)


# ============================================================================= Shield Barricade (wall)
def _shield_barricade(f):
    f.add(Geo().blob((-2, 0, 0), (13, 40, 5.0), p=2.4), EARTH, "body", 0, 3)
    f.add(Geo().blob((-2, 0, 0), (16, 43, 4.0), p=2.4), EARTH, "rubble")
    # the frame: posts and two rails behind the shields
    for y in (-30, -10, 10, 30):
        st = 4 if abs(y) < 20 else 3
        f.breakable(lambda fallen, y=y: ((Geo().capsule((-4, y, -1), (-6, y, 54), 2.2) if not fallen
                                          else Geo().capsule((2, y, 2), (30, y + 4, 2.4), 2.0)), OAK), st)
    for z, st in ((20.0, 3), (42.0, 2)):
        f.breakable(lambda fallen, z=z: ((Geo().capsule((-4.5, -34, z), (-5.5, 34, z), 1.8) if not fallen
                                           else Geo().capsule((8, -28, 2.0), (12, 28, 2.4), 1.8)), WOOD_DK), st)
    # six tall pavises leaning back: team faces, an oak rim, iron bosses, parchment paws on two
    ws = [-28.0, -17.0, -5.6, 5.6, 17.0, 28.0]
    for i, y in enumerate(ws):
        h = 62.0 if i % 2 else 66.0
        st = f.stage_for(h / 66.0, edge=abs(y) / 28.0)

        def make_(fallen, y=y, h=h):
            g = Geo()
            if not fallen:
                g.blob((2.0, y, h * 0.5), (2.2, 5.6, h * 0.5), p=3.4, rot=(0, -10, 0), taper=(0.9, 1.0))
            else:
                g.blob((16.0, y, 2.4), (h * 0.45, 5.6, 2.0), p=3.4)
            return g, None
        f.breakable(make_, st)

        def rim(fallen, y=y, h=h):
            g = Geo()
            if not fallen:
                g.blob((1.4, y, h * 0.5), (1.8, 6.4, h * 0.5 + 1.0), p=3.4, rot=(0, -10, 0), taper=(0.9, 1.0))
            else:
                return None, None
            return g, OAK
        f.breakable(rim, st, fall=False)
        g = Geo().blob((5.6, y, h * 0.48), (1.4, 1.8, 1.8), p=2.2)
        f.add(g, IRON_LT, "body", 0, min(3, st - 1), finish="metal", outline=0.4)
        if i in (1, 4):
            g = Geo()
            for dz in (-6.0, 6.0):
                g.blob((5.4, y, h * 0.48 + dz), (0.6, 2.4, 1.6), p=2.0)
            f.add(g, PARCH, "body", 0, min(3, st - 1), outline=0.2)
    for k in range(6):
        y = -30 + k * 11
        f.add(Geo().blob((14 + (k % 2) * 6, y, 2.2), (9, 5, 1.8), p=3.0), None, "rubble", team=True)
        f.add(Geo().capsule((8, y + 3, 2.0), (26, y + 8, 2.4), 1.8), OAK, "rubble")
    scaffold(f, -12, 12, -36, 36, 64)


SHIELD_BARRICADE = make("shield_barricade", "Shield Barricade", AGE, "wall", _shield_barricade, canvas=(300, 250),
                        feet=(150, 218), height=88, hit=(4, 30), material="wood", flag=(-9.0, 1.0, 0.0, 82.0),
                        flag_len=22.0, foot=28.0, yaw=-38.0)


# ================================================================================ Longbow Tower (tower)
def _stone_courses(f, x0, x1, y0, y1, z0, z1, rows, name_fill=STONE, stages=None):
    """A square block of dressed stone in courses; upper courses break first (`stages` fixes the stage
    each course falls at, bottom first, so a platform can follow the broken top)."""
    h = (z1 - z0) / rows
    for r in range(rows):
        za = z0 + r * h
        st = stages[r] if stages else f.stage_for((r + 1) / rows, edge=0.0)

        def make_(fallen, za=za, r=r):
            g = Geo()
            if not fallen:
                g.blob(((x0 + x1) / 2, (y0 + y1) / 2, za + h / 2), ((x1 - x0) / 2 - r * 0.2, (y1 - y0) / 2 - r * 0.2, h / 2 + 0.2),
                       p=6.0)
                return g, STONE if r % 2 else STONE_LT
            g = Geo()
            for k in range(3):
                rock(g, (x1 + 8 + k * 7, (y0 + y1) / 2 - 8 + k * 6, 2.2), (4.0, 3.4, 2.4), seed=r * 3 + k, jag=0.15)
            return g, STONE_DK
        f.breakable(make_, st)
        g = Geo()   # mortar line on the near face
        g.capsule((x0 + 1, y0 - 0.3, za + h), (x1 - 1, y0 - 0.3, za + h), 0.5)
        for k in range(3):
            xx = x0 + 3 + ((k * 7 + r * 4) % int(x1 - x0 - 4))
            g.capsule((xx, y0 - 0.3, za + 0.6), (xx, y0 - 0.3, za + h - 0.6), 0.5)
        f.add(g, MORTAR, "body", 0, min(3, st - 1), outline=0)


def _longbow_tower(f):
    # the top two courses fall at stage 2, the next two at stage 3, the base stands (the platform follows)
    _stone_courses(f, -11, 11, -11, 11, 0, 50, 6, stages=[4, 4, 3, 3, 2, 2])
    # a timber hoarding (platform) at z 56 on corbels, the crew stands on it; it sinks with the broken top
    g = Geo()
    for x in (-10, 0, 10):
        g.capsule((x, -12, 49), (x, -12, 55), 1.4)
    f.add(g, OAK, "body", 0, 1, outline=0.4)
    f.add(Geo().blob((1, 0, 56.0), (15, 15, 2.4), p=4.0), WOOD, "body", 0, 1)
    f.add(Geo().blob((2, 0, 35.0), (14, 13, 2.2), p=4.0, rot=(0, 6, 0)), WOOD, "body", 2, 2)
    f.add(Geo().blob((3, 0, 18.8), (13, 12, 2.0), p=4.0, rot=(0, -9, 0)), WOOD_DK, "body", 3, 3)
    # a team banner hanging down the near face with a parchment paw, an arrow slit
    g = Geo().slab([(-6, 47), (6, 47), (6, 22), (0, 18), (-6, 22)], -11.8, 1.0)
    f.add(g, None, "body", 0, 1, team=True, outline=0.5)
    _paw(f, (0.0, 35.0), 1.3, -12.6)
    f.add(Geo().blob((7.0, -11.6, 16.0), (0.6, 0.8, 3.6), p=2.4), "#3A3632", "body", 0, 2, outline=0)
    # wooden parapet with team shields over the crew (front family)
    for st in range(4):
        h = [9.0, 7.0, 0.0, 0.0][st]
        if h <= 0:
            continue
        g = Geo().blob((11.0, 0, 56.0 + h * 0.5), (2.2, 14.0, h * 0.55 + 0.5), p=3.6)
        f.add(g, WOOD_DK, "front", st, st)
        for y in (-8.0, 0.0, 8.0):
            g = Geo().blob((12.8, y, 56.0 + h * 0.5), (1.0, 3.2, h * 0.5), p=2.6)
            f.add(g, None, "front", st, st, team=True, outline=0.4)
    for k in range(6):
        g = Geo()
        rock(g, (8 + k * 4, -10 + k * 4, 2.4), (4.4, 3.8, 2.6), seed=40 + k, jag=0.15)
        f.add(g, STONE_DK, "rubble")
    f.add(Geo().blob((14, 2, 2), (7, 8, 1.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -13, 13, -13, 13, 58)


LONGBOW_TOWER = make("longbow_tower", "Longbow Tower", AGE, "tower", _longbow_tower, canvas=(240, 300), feet=(118, 266),
                     height=112, hit=(0, 32), material="stone", flag=(-8.0, 9.0, 57.5, 40.0), flag_len=16.0, foot=17.0,
                     yaw=-14.0, crew=dict(visualId="unit.longbowman", at=(1.5, 0.0, 58.2), scale=0.6))


# ================================================================================ Crossbow Keep (tower)
def _crossbow_keep(f):
    # a round keep in courses, a battered plinth, arrow slits, a team shield with a parchment cross-bolt
    f.add(Geo().lathe([(15.0, 0), (14.0, 6.0), (13.0, 8.0), (0, 8.0)], (0, 0, 0), (0, 0, 8.0), segs=28),
          STONE_DK, "body", 0, 3)
    rows = 6
    for r in range(rows):
        za = 8.0 + r * 8.0
        st = [4, 4, 3, 3, 2, 2][r]   # the top two courses fall at stage 2, the next two at 3 (the platform follows)

        def make_(fallen, za=za, r=r):
            if not fallen:
                g = Geo().lathe([(12.4 - 0.15 * r, 0), (12.6 - 0.15 * r, 0.6), (12.6 - 0.15 * r, 7.4), (12.4 - 0.15 * r, 8.0)],
                                (0, 0, za), (0, 0, za + 8.0), segs=28)
                return g, STONE if r % 2 else STONE_LT
            g = Geo()
            for k in range(3):
                rock(g, (16 + k * 6, -6 + k * 6, 2.2), (4.0, 3.4, 2.4), seed=60 + r * 3 + k, jag=0.15)
            return g, STONE_DK
        f.breakable(make_, st)
        g = Geo().lathe([(12.7, -0.25), (12.9, 0), (12.7, 0.25)], (0, 0, za + 8.0), (0, 0, za + 8.05), segs=28)
        f.add(g, MORTAR, "body", 0, min(3, st - 1), outline=0)
    for z, last in ((22.0, 2), (42.0, 1)):
        f.add(Geo().blob((4.0, -11.6, z), (0.8, 0.8, 3.6), p=2.4), "#3A3632", "body", 0, last, outline=0)
    g = Geo().blob((-4.0, -12.4, 34.0), (5.4, 1.4, 6.4), p=2.6, taper=(0.4, 1.0))
    f.add(g, None, "body", 0, 1, team=True, outline=0.5)
    g = Geo().capsule((-7.4, -13.6, 37.0), (-0.6, -13.6, 31.0), 0.7)
    g.capsule((-1.4, -13.6, 31.6), (-0.4, -13.6, 30.6), 1.1)
    f.add(g, PARCH, "body", 0, 1, outline=0.2)
    # a stone platform at z 56 with a projecting wooden hoarding
    f.add(Geo().lathe([(13.0, 0), (15.0, 2.0), (15.0, 4.0), (0, 4.0)], (0, 0, 52.0), (0, 0, 56.0), segs=28),
          STONE_LT, "body", 0, 1)
    f.add(Geo().blob((2, 0, 41.0), (14, 13, 2.2), p=4.0, rot=(0, 6, 0)), WOOD, "body", 2, 2)
    f.add(Geo().blob((3, 0, 25.0), (13, 12, 2.0), p=4.0, rot=(0, -9, 0)), WOOD_DK, "body", 3, 3)
    # crenellated parapet over the crew (front family), team pennons on the merlons
    for st in range(4):
        h = [9.0, 7.0, 0.0, 0.0][st]
        if h <= 0:
            continue
        g = Geo()
        for k in range(5):
            a = math.radians(-70 + 35 * k)
            g.blob((13.0 * math.cos(a), 13.0 * math.sin(a), 56.0 + h * 0.5), (2.6, 3.0, h * 0.55), p=4.0)
        f.add(g, STONE_LT, "front", st, st)
        g = Geo().lathe([(14.6, -0.6), (15.2, 0), (14.6, 0.6)], (0, 0, 56.6 + h * 0.3), (0, 0, 56.7 + h * 0.3), segs=28)
        f.add(g, None, "front", st, st, team=True, outline=0.3)
    for k in range(6):
        g = Geo()
        rock(g, (10 + k * 4, -8 + k * 3, 2.4), (4.4, 3.8, 2.6), seed=80 + k, jag=0.15)
        f.add(g, STONE_DK, "rubble")
    f.add(Geo().blob((16, 2, 2), (7, 8, 1.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -15, 15, -15, 15, 58)


CROSSBOW_KEEP = make("crossbow_keep", "Crossbow Keep", AGE, "tower", _crossbow_keep, canvas=(240, 300), feet=(118, 266),
                     height=112, hit=(0, 32), material="stone", flag=(-9.0, 9.0, 57.5, 40.0), flag_len=16.0, foot=18.0,
                     yaw=-14.0, crew=dict(visualId="unit.crossbowman", at=(1.5, 0.0, 58.2), scale=0.6))


# =================================================================================== Levy Camp (camp)
def _levy_camp(f):
    # a striped bell tent: a cone roof in team and parchment stripes, a wall, a scalloped team valance
    def tent(lo, hi, sag=0.0):
        g = Geo().lathe([(20.0, 0), (20.0, 20.0 - sag)], (0, 0, 0), (0, 0, 20.0 - sag), segs=28)
        f.add(g, CANVAS, "body", lo, hi)
        g = Geo().lathe([(23.0, 0), (14.0, 16.0), (5.0, 30.0 - sag), (0, 34.0 - sag)], (0, 0, 20.0 - sag),
                        (0, 0, 54.0 - 2 * sag), segs=28)
        f.add(g, None, "body", lo, hi, team=True)
        g = Geo()
        for k in range(8):   # parchment stripes on the roof
            a = k * math.pi / 4
            g.capsule((math.cos(a) * 22.0, math.sin(a) * 22.0, 20.6 - sag), (math.cos(a) * 2.0, math.sin(a) * 2.0, 52.0 - 2 * sag),
                      2.2, 0.8)
        f.add(g, PARCH, "body", lo, hi, outline=0.3)
        g = Geo()
        for k in range(14):   # scalloped valance
            a = k * 2 * math.pi / 14
            g.blob((math.cos(a) * 23.2, math.sin(a) * 23.2, 18.6 - sag), (3.6, 3.6, 2.6), p=2.0)
        f.add(g, None, "body", lo, hi, team=True, outline=0.4)
    tent(0, 1)
    tent(2, 2, sag=5.0)
    g = Geo().lathe([(21.0, 0), (21.0, 10.0), (12.0, 18.0), (0, 20.0)], (0, 0, 0), (0, 0, 20.0), segs=28)
    f.add(g, CANVAS, "body", 3, 3)
    g = Geo().capsule((0, 0, 50.0), (0, 0, 64.0), 1.1)
    f.add(g, OAK, "body", 0, 2, outline=0.4)
    g = Geo().sphere((0, 0, 65.0), 1.8, cuts=3)
    f.add(g, "#D4A437", "body", 0, 2, finish="metal", outline=0.5)
    # guy ropes and pegs
    g = Geo()
    for k in range(5):
        a = math.radians(-150 + 60 * k)
        g.capsule((math.cos(a) * 22.0, math.sin(a) * 22.0, 19.0), (math.cos(a) * 34.0, math.sin(a) * 30.0, 0.5), 0.5)
    f.add(g, ROPE, "body", 0, 2, outline=0.3)
    # the door flap (door family: closed, half open, open)
    for i, (ang, w) in enumerate(((0.0, 8.0), (30.0, 6.0), (60.0, 3.6))):
        g = Geo().slab([(20.6, 0.0), (20.6 + w * 0.4, 0.0), (20.0, 18.0), (18.0, 18.0)], -6.0 - ang * 0.12, 1.2)
        f.add(g, CANVAS, "door", i, i)
        f.add(Geo().blob((19.6, -6.0, 3.0), (2.6, 3.6, 3.0 + 2 * i), p=2.2), "#3A322E", "door", i, i, outline=0)
    # the cook fire: a ring of stones, a tripod and a pot, a small pale flame
    g = Geo()
    for k in range(7):
        a = k * 2 * math.pi / 7
        rock(g, (34.0 + math.cos(a) * 5.0, -14.0 + math.sin(a) * 4.0, 1.4), (1.8, 1.6, 1.4), seed=k, jag=0.2)
    f.add(g, STONE_DK, "body", 0, 3)
    f.add(Geo().blob((34.0, -14.0, 1.2), (4.0, 3.4, 1.0), p=2.2), ASH, "body", 0, 3)
    f.add(Geo().lathe([(0, 0), (2.4, 1.0), (2.2, 3.4), (0, 6.0)], (34.0, -14.0, 1.0), (34.0, -14.0, 7.0), segs=10),
          None, "body", 0, 1, glow=FIRE, outline=0.4)
    g = Geo()
    for k in range(3):
        a = k * 2 * math.pi / 3
        g.capsule((34.0 + math.cos(a) * 6.0, -14.0 + math.sin(a) * 5.0, 0.0), (34.0, -14.0, 16.0), 0.7)
    f.add(g, OAK, "body", 0, 2, outline=0.3)
    f.add(Geo().blob((34.0, -14.0, 10.0), (3.6, 3.4, 3.0), p=2.2), IRON, "body", 0, 2, finish="metal")
    for k in range(5):
        a = k * 1.3
        f.add(Geo().capsule((math.cos(a) * 14, math.sin(a) * 14, 1.2), (math.cos(a) * 14 + 30 * math.cos(a + 1.4),
                                                                        math.sin(a) * 14 + 22 * math.sin(a + 1.4), 1.4), 1.2), OAK, "rubble")
    f.add(Geo().blob((6, -10, 3), (16, 9, 2.4), p=2.4), None, "rubble", team=True)
    f.add(Geo().blob((-4, 6, 2), (12, 10, 2.0), p=2.4), CANVAS, "rubble")
    scaffold(f, -20, 20, -20, 20, 50, levels=1)


LEVY_CAMP = make("levy_camp", "Levy Camp", AGE, "camp", _levy_camp, canvas=(300, 250), feet=(140, 214), height=86,
                 hit=(0, 24), material="wood", flag=(-26.0, -20.0, 0.0, 74.0), flag_len=20.0, foot=30.0, yaw=-24.0,
                 lights=[((34.0, -14.0, 5.0), 12, 1)], smoke=[((34.0, -14.0, 12.0), 0)],
                 extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ==================================================================================== Wolf Pits (trap)
def _wolf_pits(f):
    rim = Geo().lathe([(14.0, 0), (17.0, 1.6), (15.4, 3.0), (12.0, 2.0)], (0, 0, 0), (0, 0, 3.0), segs=28, squash=(1.6, 1.0))
    f.add(rim, EARTH, "trap", 0, 3)
    f.add(Geo().blob((0, 0, 0.4), (21, 13, 0.8), p=2.4), EARTH_DK, "trap", 0, 3, outline=0)
    stakes = [((-12 + k * 4.0), (-6 + (k % 3) * 6.0) * 0.9) for k in range(7)]

    def spikes(lo, hi, broken=False):
        g = Geo()
        for i, (x, y) in enumerate(stakes):
            h = 9.0 if not broken or i % 2 else 4.0
            g.capsule((x, y, 0.5), (x + 1.5, y, h), 1.2, 1.0)
            if not broken or i % 2:
                g.lathe([(1.0, 0), (0, 3.6)], (x + 1.5, y, h), (x + 2.2, y, h + 3.4), segs=8)
        f.add(g, TIP, "trap", lo, hi, outline=0.4)
    spikes(0, 0)
    spikes(2, 2)
    spikes(3, 3, broken=True)
    # armed: a woven wattle hurdle with a scatter of straw hides the pit
    g = Geo().blob((0, 0, 2.6), (19.0, 11.0, 0.9), p=3.4)
    f.add(g, WOOD, "trap", 1, 1)
    g = Geo()
    for k in range(7):
        x = -15 + k * 5.0
        g.capsule((x, -10.0, 3.4), (x + 1.0, 10.0, 3.4), 0.7)
    f.add(g, WOOD_DK, "trap", 1, 1, outline=0.3)
    g = Geo()
    for k in range(6):
        g.blob((-12 + k * 5.0, ((k * 37) % 11) - 5.0, 3.8), (2.6, 1.6, 0.6), p=2.0)
    f.add(g, "#CDBB92", "trap", 1, 1, outline=0.2)
    g = Geo()   # sprung: the hurdle snapped in two, its halves flung up
    g.blob((-9, -3, 7.0), (9.0, 6.0, 0.9), p=3.4, rot=(0, -30, 0))
    g.blob((9, 3, 7.0), (9.0, 6.0, 0.9), p=3.4, rot=(0, 30, 0))
    f.add(g, WOOD, "trap", 2, 2)
    # a marker stick with a team rag (every frame)
    f.add(Geo().capsule((-17.0, 8.0, 0), (-18.0, 8.0, 16.0), 0.9), OAK, "trap", 0, 3)
    g = Geo().slab([(-18.0, 15.5), (-26.0, 14.0), (-24.0, 11.0), (-18.0, 11.5)], 8.0, 1.0)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)
    g = Geo().blob((-15.0, 10.0, 2.0), (3.6, 2.6, 2.2), p=2.2)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)


WOLF_PITS = make("wolf_pits", "Wolf Pits", AGE, "trap", _wolf_pits, canvas=(200, 120), feet=(100, 92), height=24,
                 hit=(0, 6), material="wood", foot=28.0, yaw=-12.0)


# ================================================================================== Bear Snares (trap)
def _jaw(x, y, open_):
    """An iron jaw snare: a ring of teeth, open flat (two half rings) or snapped shut (upright)."""
    g = Geo()
    if open_:
        g.lathe([(4.6, -0.5), (5.2, 0), (4.6, 0.5)], (x, y, 1.4), (x, y, 1.5), segs=18)
        for k in range(8):
            a = k * math.pi / 4
            g.lathe([(0.6, 0), (0, 1.8)], (x + math.cos(a) * 4.6, y + math.sin(a) * 4.6, 1.4),
                    (x + math.cos(a) * 3.4, y + math.sin(a) * 3.4, 2.6), segs=5)
    else:
        for side in (-1, 1):
            g.capsule((x - 4.4, y + side * 0.8, 1.2), (x, y + side * 0.8, 7.0), 0.8)
            g.capsule((x, y + side * 0.8, 7.0), (x + 4.4, y + side * 0.8, 1.2), 0.8)
        for k in range(5):
            xx = x - 3.0 + k * 1.5
            g.lathe([(0.5, 0), (0, 1.6)], (xx, y, 5.4 - abs(xx - x) * 0.8), (xx, y, 3.8 - abs(xx - x) * 0.8), segs=5)
    return g


def _bear_snares(f):
    f.add(Geo().blob((0, 0, 0.3), (22, 13, 0.8), p=2.4), EARTH, "trap", 0, 3, outline=0)
    spots = ((-11.0, -4.0), (1.0, 5.0), (12.0, -3.0))
    for i, (x, y) in enumerate(spots):
        f.add(_jaw(x, y, True), IRON_LT, "trap", 0, 0, finish="metal", outline=0.4)       # unarmed: open, showing
        f.add(_jaw(x, y, False), IRON_LT, "trap", 2, 2, finish="metal", outline=0.4)      # sprung: snapped up
        f.add(_jaw(x, y, i != 1), IRON, "trap", 3, 3, finish="metal", outline=0.4)       # spent: some shut, rusty
    # armed: leaves and twigs hide the jaws
    g = Geo()
    for k in range(12):
        g.blob((-16 + k * 3.0, ((k * 29) % 13) - 6.0, 2.0), (3.0, 2.4, 1.0), p=2.0)
    f.add(g, LEAF, "trap", 1, 1)
    g = Geo()
    for k in range(6):
        g.blob((-13 + k * 5.2, ((k * 17) % 9) - 4.0, 2.6), (2.4, 1.8, 0.8), p=2.0)
    f.add(g, LEAF_DK, "trap", 1, 1, outline=0.3)
    # chains to a stake with a team rag (every frame)
    g = Geo()
    for x, y in spots:
        g.capsule((x, y, 1.0), (-19.0, 8.0, 3.0), 0.5)
    f.add(g, IRON, "trap", 0, 3, finish="metal", outline=0.3)
    f.add(Geo().capsule((-19.0, 8.0, 0), (-20.0, 8.0, 16.0), 1.0), OAK, "trap", 0, 3)
    g = Geo().slab([(-20.0, 15.5), (-28.0, 14.0), (-26.0, 11.0), (-20.0, 11.5)], 8.0, 1.0)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)
    g = Geo().blob((-17.0, 10.0, 2.0), (3.6, 2.6, 2.2), p=2.2)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)


BEAR_SNARES = make("bear_snares", "Bear Snares", AGE, "trap", _bear_snares, canvas=(200, 120), feet=(100, 92), height=20,
                   hit=(0, 6), material="wood", foot=28.0, yaw=-12.0)


FORTS = [SHIELD_BARRICADE, LONGBOW_TOWER, CROSSBOW_KEEP, LEVY_CAMP, WOLF_PITS, BEAR_SNARES]
