"""Stone Age forts in the cartoon style (DESIGN A16.14.4; the MVP release check flagged the realistic ones;
CONTENT_PLAN 5.1 adds the Thorn Hedge and the Bone Watchtower).

Built with `world/fort_toon.py` (the cartoon unit look, the fort sheet contract of
`src/visuals/fortViews/atlasFortView.ts`). Footprints, heights, flag and crew points follow the realistic
forts they replace, so the game's placement and the crew on the towers line up unchanged.

  palisade         wall    leaning sharpened stakes on an earth bank, lashed rails, a team hide with a bone hand
  thorn_hedge      wall    a low bramble hedge woven between short stakes, thorns, team rags (cheap wall)
  sling_perch      tower   a platform on four stilts with a team hide screen; a Pebbler slings from it
  bone_watchtower  tower   mammoth-leg stilts and tusk arches, a rib parapet and a skull totem; a Pebbler crew
  war_camp         camp    a team-banded hide tipi, its door flap (the levy pulse), a fire pit
  spike_pit        trap    a pit of sharpened stakes under a cover of branches, a team rag marker

Run: `<venv>/bin/python art/blender/world/render_forts.py --age stone --out <scratch> [--only a,b] [--install]`.
"""
import math

from ageborn_art.geometry import Geo

from world.fort_toon import make, scaffold
from world.common import rock

AGE = "stone"
BARK = "#6A5A4A"
WOOD = "#9C8266"
WOOD_DK = "#7A6450"
TIP = "#C9B08A"
ROPE = "#C2AE86"
EARTH = "#8A7660"
EARTH_DK = "#6E5E4C"
STONE = "#8E8A80"
STONE_DK = "#6F6B63"
BONE = "#EDE3C8"
BONE_DK = "#CDBF9E"
HIDE = "#B8A688"
THORN = "#5E6B4A"
BRAMBLE = "#6E7D52"
BRAMBLE_DK = "#55623F"
LEAF = "#869A5E"
FIRE = "#FFE3B0"
ASH = "#5A524A"


def _stake(f, base, top, r, stage, lean_fall=1.0):
    """A sharpened stake: whole in body frames before `stage`, a stump after, the top lying in front."""
    def make_(fallen):
        g = Geo()
        if not fallen:
            g.capsule(base, top, r, r * 0.9)
            d = [t - b for t, b in zip(top, base)]
            L = math.sqrt(sum(v * v for v in d))
            u = [v / L for v in d]
            tip = tuple(t + u_ * r * 3.2 for t, u_ in zip(top, u))
            g.lathe([(r * 0.9, 0), (0, r * 3.2)], top, tip, segs=10)
            return g, WOOD
        mid = tuple(b + (t - b) * 0.35 for b, t in zip(base, top))
        g.capsule(base, mid, r, r)
        return g, WOOD_DK
    f.breakable(make_, stage, fall=True)
    if stage <= 3:   # the broken-off top lies on the ground in front
        L = math.dist(base, top) * 0.6
        x, y = base[0] + 4.0 * lean_fall, base[1]
        g = Geo().capsule((x, y - 2, r), (x + L * 0.9, y + 3, r * 0.9), r * 0.9)
        f.add(g, WOOD, "body", stage, 3)


# ================================================================================== Palisade (wall)
def _palisade(f):
    g = Geo().blob((-2, 0, 0), (13, 40, 6.5), p=2.4)
    f.add(g, EARTH, "body", 0, 3)
    f.add(Geo().blob((-2, 0, 0), (16, 43, 5.0), p=2.4), EARTH, "rubble")
    ys = [-33.3 + i * 7.4 for i in range(10)]
    H = [72, 80, 74, 70, 78, 84, 73, 79, 71, 76]
    for i, y in enumerate(ys):
        b = (f.rnd.uniform(-0.8, 0.8), y, -2.0)
        t = (b[0] + 7.0 + f.rnd.uniform(-1.5, 1.5), y + f.rnd.uniform(-1.2, 1.2), H[i])
        stage = f.stage_for(H[i] / 84.0, edge=abs(y) / 34.0)
        _stake(f, b, t, f.rnd.uniform(3.2, 3.8), stage)
    # two lashed rails across the stakes (they fall at stage 2 and 3)
    for z, st in ((26.0, 3), (52.0, 2)):
        f.breakable(lambda fallen, z=z: ((Geo().capsule((3.6, -36, z), (5.6, 36, z - 2), 2.2) if not fallen
                                           else Geo().capsule((10, -30, 2.0), (14, 28, 2.4), 2.0)), BARK), st)
        g = Geo()
        for y in ys[::2]:
            g.capsule((4.4, y - 1.6, z + 1.6), (4.6, y + 1.6, z - 1.6), 0.8)
        f.add(g, ROPE, "body", 0, st - 1, outline=0.4)
    # the team hide stretched on the stakes, with a bone hand-print
    g = Geo().blob((8.6, -2.0, 46.0), (2.0, 14.0, 13.0), p=2.6)
    f.add(g, None, "body", 0, 1, team=True)
    g = Geo().blob((9.8, -2.0, 30.0), (2.0, 13.0, 9.0), p=2.6)
    f.add(g, None, "body", 2, 2, team=True)
    g = Geo()
    g.blob((11.0, -4.0, 46.0), (0.8, 3.0, 2.6), p=2.2)
    for k, a in enumerate((60, 85, 110, 135, 10)):
        r = math.radians(a)
        g.capsule((11.0, -4.0 + math.cos(r) * 2.4, 46.0 + math.sin(r) * 2.2),
                  (11.0, -4.0 + math.cos(r) * 5.4, 46.0 + math.sin(r) * 5.0), 0.8)
    f.add(g, BONE, "body", 0, 1, outline=0.3)
    # rubble: a scatter of broken stakes, the torn hide
    for k in range(6):
        y = -30 + k * 11
        f.add(Geo().capsule((8 + (k % 2) * 6, y, 2.0), (22 + (k % 3) * 4, y + 6, 2.4), 2.6), WOOD_DK, "rubble")
    f.add(Geo().blob((16, -4, 2.0), (8, 12, 1.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -12, 14, -36, 36, 70)


PALISADE = make("palisade", "Palisade", AGE, "wall", _palisade, canvas=(300, 270), feet=(150, 236), height=96,
                hit=(3, 38), material="wood", flag=(-7.0, 1.0, 0.0, 92.0), flag_len=22.0, foot=26.0, yaw=-38.0)


# ================================================================================== Thorn Hedge (wall)
def _thorn_hedge(f):
    f.add(Geo().blob((0, 0, 0), (12, 38, 4.0), p=2.4), EARTH, "body", 0, 3)
    f.add(Geo().blob((0, 0, 0), (15, 40, 3.4), p=2.4), EARTH, "rubble")
    ys = [-30 + i * 10 for i in range(7)]
    for i, y in enumerate(ys):   # short stakes the hedge is woven between
        b = (0.0, y, -1.0)
        t = (2.0, y, 44 + (i % 2) * 6)
        _stake(f, b, t, 2.4, f.stage_for(0.5, edge=abs(y) / 30.0, keep=0.3))
    # bramble balls (top ones fall first), each with thorn spikes
    for i in range(12):
        y = -32 + i * 5.8
        for row, z in enumerate((12.0, 26.0, 38.0)):
            if row == 2 and i % 2:
                continue
            c = (1.0 + f.rnd.uniform(-1.5, 1.5), y + f.rnd.uniform(-1.5, 1.5), z + f.rnd.uniform(-2, 2))
            rr = 7.0 - row * 1.0

            def make_(fallen, c=c, rr=rr):
                if fallen:
                    return None, None
                g = Geo().blob(c, (rr * 0.8, rr, rr * 0.9), p=2.0)
                return g, BRAMBLE if (i + row) % 2 else BRAMBLE_DK
            st = f.stage_for(z / 40.0, edge=abs(y) / 32.0)
            f.breakable(make_, st, fall=False)
            g = Geo()
            for k in range(5):
                a = k * 1.25 + i
                d = (math.cos(a) * 0.4 - 0.7, math.sin(a), math.cos(a * 1.7))
                n = math.sqrt(sum(v * v for v in d))
                d = [v / n for v in d]
                p0 = tuple(cc + dd * rr * 0.8 for cc, dd in zip(c, d))
                p1 = tuple(cc + dd * (rr * 0.8 + 3.0) for cc, dd in zip(c, d))
                g.lathe([(0.8, 0), (0, 3.0)], p0, p1, segs=6)
            f.add(g, THORN, "body", 0, min(3, st - 1), outline=0.3)
    # team rags tied along the top
    for y in (-18.0, 6.0, 24.0):
        g = Geo().slab([(4.0, 46.0), (8.0, 40.0), (6.0, 34.0), (3.0, 38.0)], y, 1.0)
        f.add(g, None, "body", 0, 1, team=True, outline=0.5)
        g = Geo().blob((3.6, y, 44.0), (2.4, 3.0, 2.4), p=2.2)
        f.add(g, None, "body", 0, 2, team=True, outline=0.5)
    for k in range(7):
        y = -30 + k * 10
        f.add(Geo().blob((10 + (k % 2) * 6, y, 3.0), (6, 5, 3), p=2.0), BRAMBLE_DK, "rubble")
    f.add(Geo().slab([(14, 4), (22, 3), (20, 0.5), (12, 1)], 0.0, 4.0), None, "rubble", team=True)
    scaffold(f, -10, 12, -34, 34, 48, levels=1)


THORN_HEDGE = make("thorn_hedge", "Thorn Hedge", AGE, "wall", _thorn_hedge, canvas=(300, 220), feet=(150, 190), height=64,
                   hit=(2, 26), material="wood", flag=(-8.0, 2.0, 0.0, 66.0), flag_len=18.0, foot=24.0, yaw=-38.0)


# ================================================================================== Sling Perch (tower)
def _sling_perch(f):
    # four stilts with cross braces, a platform at z 46, a ladder, a hide screen (front family)
    legs = ((-9, -9), (9, -9), (-9, 9), (9, 9))
    for i, (x, y) in enumerate(legs):
        st = 4 if i < 2 else 3
        f.breakable(lambda fallen, x=x, y=y: ((Geo().capsule((x, y, -1), (x * 0.7, y * 0.7, 46), 2.4) if not fallen
                                              else Geo().capsule((x + 8, y, 2), (x + 34, y + 4, 2.4), 2.2)), BARK), st)
    for z in (16.0, 30.0):
        g = Geo().capsule((-8.4, -9.2, z), (8.4, -9.2, z + 6), 1.2).capsule((8.4, -9.2, z), (-8.4, -9.2, z + 6), 1.2)
        f.add(g, WOOD_DK, "body", 0, 2, outline=0.5)
    g = Geo().blob((0, 0, 46.0), (13, 13, 2.4), p=3.6)
    f.add(g, WOOD, "body", 0, 2)
    f.add(Geo().blob((2, 0, 30.0), (11, 11, 2.0), p=3.6), WOOD_DK, "body", 3, 3)
    g = Geo()
    for z in range(4, 46, 7):
        g.capsule((13.0, -3.0, z), (13.0, 3.0, z), 0.9)
    g.capsule((12.6, -3.6, 0), (13.4, -3.6, 48), 1.1).capsule((12.6, 3.6, 0), (13.4, 3.6, 48), 1.1)
    f.add(g, WOOD_DK, "body", 0, 1, outline=0.4)
    # the parapet of woven branches and a team hide, drawn over the crew (front family)
    for st in range(4):
        h = [10.0, 8.0, 5.0, 0.0][st]
        if h <= 0:
            continue
        g = Geo().blob((8.0, 0, 46.0 + h * 0.5), (3.0, 12.0, h * 0.55 + 0.5), p=2.6)
        f.add(g, WOOD_DK, "front", st, st)
        g = Geo().blob((9.6, -2.0, 46.0 + h * 0.5), (1.6, 8.0, h * 0.45), p=2.6)
        f.add(g, None, "front", st, st, team=True)
    f.add(Geo().blob((10.0, 0, 52.0), (1.0, 3.0, 2.4), p=2.2), BONE, "front", 0, 1, outline=0.3)
    for k in range(5):
        f.add(Geo().capsule((6 + k * 4, -10 + k * 5, 2), (22 + k * 3, -4 + k * 4, 2.4), 2.0), BARK, "rubble")
    f.add(Geo().blob((14, 0, 2), (8, 8, 1.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -11, 11, -11, 11, 48)


SLING_PERCH = make("sling_perch", "Sling Perch", AGE, "tower", _sling_perch, canvas=(240, 270), feet=(118, 236), height=96,
                   hit=(0, 30), material="wood", flag=(-11.0, 9.0, 44.0, 38.0), flag_len=16.0, foot=16.0, yaw=-14.0,
                   crew=dict(visualId="unit.pebbler", at=(0.5, 0.0, 47.8), scale=0.6))


# ================================================================================== Bone Watchtower (tower)
def _bone_watchtower(f):
    # four mammoth-leg bones as stilts (knobbed ends), tusk arches, a platform at z 56
    for i, (x, y) in enumerate(((-10, -10), (10, -10), (-10, 10), (10, 10))):
        st = 4 if i < 2 else 3

        def make_(fallen, x=x, y=y):
            g = Geo()
            if not fallen:
                g.capsule((x, y, 0), (x * 0.8, y * 0.8, 54), 3.2, 2.6)
                g.blob((x, y, 2.0), (4.6, 4.6, 3.4), p=2.2).blob((x * 0.8, y * 0.8, 53.0), (4.0, 4.0, 3.0), p=2.2)
            else:
                g.capsule((x + 8, y, 3), (x + 38, y + 6, 3.2), 3.0)
            return g, BONE_DK
        f.breakable(make_, st)
    for y in (-11.0, 11.0):   # a curved tusk arch on each side
        g = Geo()
        pts = [(-12, y, 18), (-6, y, 30), (0, y, 34), (6, y, 30), (12, y, 18)]
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 2.0, 1.8)
        f.add(g, BONE, "body", 0, 2 if y < 0 else 1, finish="gloss")
    f.add(Geo().blob((0, 0, 56.0), (14, 14, 2.6), p=3.6), WOOD, "body", 0, 2)
    f.add(Geo().blob((3, 0, 34.0), (12, 12, 2.2), p=3.6), WOOD_DK, "body", 3, 3)
    # a skull totem on a pole at the back and a team hide hanging under the platform
    g = Geo().capsule((-12, 8, 56), (-14, 8, 76), 1.2)
    f.add(g, BARK, "body", 0, 1)
    g = Geo().blob((-14, 8, 79.0), (3.4, 3.0, 3.6), p=2.2).blob((-12.4, 8, 76.4), (2.2, 2.0, 2.4), p=2.2)
    f.add(g, BONE, "body", 0, 1)
    g = Geo().blob((4.0, -10.0, 46.0), (9.0, 1.6, 8.0), p=2.6)
    f.add(g, None, "body", 0, 2, team=True)
    # rib parapet over the crew (front family), lashed with a team band
    for st in range(3):
        h = [11.0, 8.0, 5.0][st]
        g = Geo()
        for k in range(5):
            y = -10 + k * 5
            g.capsule((9.0, y, 56.0), (10.0 + 1.5 * math.sin(k), y, 56.0 + h), 1.2, 0.8)
        f.add(g, BONE, "front", st, st, outline=0.4)
        g = Geo().capsule((9.4, -12, 56.0 + h * 0.55), (9.4, 12, 56.0 + h * 0.55), 1.3)
        f.add(g, None, "front", st, st, team=True, outline=0.4)
    for k in range(6):
        f.add(Geo().capsule((6 + k * 4, -10 + k * 4, 3), (24 + k * 3, -4 + k * 3, 3.2), 2.6), BONE_DK, "rubble")
    f.add(Geo().blob((16, 4, 2), (7, 8, 1.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -13, 13, -13, 13, 58)


BONE_WATCHTOWER = make("bone_watchtower", "Bone Watchtower", AGE, "tower", _bone_watchtower, canvas=(240, 300),
                       feet=(118, 266), height=108, hit=(0, 34), material="wood", flag=(-12.0, -8.0, 54.0, 40.0),
                       flag_len=16.0, foot=18.0, yaw=-14.0,
                       crew=dict(visualId="unit.pebbler", at=(0.5, 0.0, 57.8), scale=0.6))


# ================================================================================== War Camp (camp)
def _war_camp(f):
    # a hide tipi: a cone of hide with fold lines, a team band, poles crossing at the top
    g = Geo().lathe([(22.0, 0), (19.0, 14), (12.0, 34), (5.0, 50), (0, 56)], (0, 0, 0), (0, 0, 56), segs=28)
    f.add(g, HIDE, "body", 0, 1)
    g = Geo().lathe([(22.4, 0), (17.0, 22), (10.0, 40), (0, 42)], (0, 0, 0), (0, 0, 42), segs=28)
    f.add(g, HIDE, "body", 2, 2)
    g = Geo().lathe([(23.0, 0), (19.0, 14), (0, 20)], (0, 0, 0), (0, 0, 20), segs=28)
    f.add(g, HIDE, "body", 3, 3)
    g = Geo().lathe([(18.6, 0), (19.6, 0.6), (17.4, 8.0), (16.2, 8.6)], (0, 0, 14.0), (0, 0, 22.6), segs=28)
    f.add(g, None, "body", 0, 2, team=True)
    g = Geo().lathe([(9.4, 0), (10.2, 0.5), (8.4, 5.0), (7.6, 5.4)], (0, 0, 36.0), (0, 0, 41.4), segs=24)
    f.add(g, None, "body", 0, 1, team=True)
    g = Geo()
    for k in range(6):
        a = k * math.pi / 3 + 0.3
        g.capsule((math.cos(a) * 3.0, math.sin(a) * 3.0, 50.0), (math.cos(a) * -4.0, math.sin(a) * -4.0, 66.0), 1.1, 0.9)
    f.add(g, BARK, "body", 0, 1, outline=0.5)
    g = Geo()   # painted bone sun on the hide
    g.blob((19.0, -6.0, 28.0), (0.8, 3.0, 3.0), p=2.0)
    for k in range(6):
        a = k * math.pi / 3
        g.capsule((19.0, -6.0 + math.cos(a) * 3.6, 28.0 + math.sin(a) * 3.6),
                  (19.4, -6.0 + math.cos(a) * 6.0, 28.0 + math.sin(a) * 6.0), 0.7)
    f.add(g, BONE, "body", 0, 1, outline=0.3)
    # the door flap (door family: closed, half open, open)
    for i, (ang, w) in enumerate(((0.0, 8.0), (30.0, 6.0), (60.0, 3.6))):
        g = Geo().slab([(20.0, 0.0), (20.0 + w * 0.4, 0.0), (14.0, 20.0), (12.0, 20.0)], -6.0 - ang * 0.12, 1.2)
        f.add(g, HIDE, "door", i, i)
        f.add(Geo().blob((18.0, -6.0, 3.0), (3.0, 3.6, 3.0 + i), p=2.2), "#3A322E", "door", i, i, outline=0)
    # the fire pit in front with a ring of stones and a small pale flame
    g = Geo()
    for k in range(7):
        a = k * 2 * math.pi / 7
        rock(g, (30.0 + math.cos(a) * 5.0, -12.0 + math.sin(a) * 4.0, 1.4), (1.8, 1.6, 1.4), seed=k, jag=0.2)
    f.add(g, STONE, "body", 0, 3)
    f.add(Geo().blob((30.0, -12.0, 1.2), (4.0, 3.4, 1.0), p=2.2), ASH, "body", 0, 3)
    f.add(Geo().lathe([(0, 0), (2.4, 1.0), (2.2, 3.4), (0, 7.0)], (30.0, -12.0, 1.0), (30.0, -12.0, 8.0), segs=10),
          None, "body", 0, 1, glow=FIRE, outline=0.4)
    for k in range(5):
        a = k * 1.3
        f.add(Geo().capsule((math.cos(a) * 14, math.sin(a) * 14, 1.2), (math.cos(a) * 14 + 30 * math.cos(a + 1.4),
                                                                        math.sin(a) * 14 + 22 * math.sin(a + 1.4), 1.4), 1.3), BARK, "rubble")
    f.add(Geo().blob((6, -10, 3), (14, 8, 2.4), p=2.4), None, "rubble", team=True)
    f.add(Geo().blob((-4, 6, 2), (12, 10, 2.0), p=2.4), HIDE, "rubble")
    scaffold(f, -20, 20, -20, 20, 50, levels=1)


WAR_CAMP = make("war_camp", "War Camp", AGE, "camp", _war_camp, canvas=(290, 250), feet=(140, 214), height=86, hit=(0, 26),
                material="wood", flag=(-22.0, -12.0, 0.0, 76.0), flag_len=22.0, foot=30.0, yaw=-24.0,
                lights=[((30.0, -12.0, 7.0), 14, 1)], smoke=[((30.0, -12.0, 12.0), 0), ((0.0, 0.0, 58.0), 2)],
                extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ================================================================================== Spike Pit (trap)
def _spike_pit(f):
    rim = Geo().lathe([(14.0, 0), (17.0, 1.6), (15.4, 3.0), (12.0, 2.0)], (0, 0, 0), (0, 0, 3.0), segs=28, squash=(1.6, 1.0))
    f.add(rim, EARTH, "trap", 0, 3)
    f.add(Geo().blob((0, 0, 0.4), (21, 13, 0.8), p=2.4), EARTH_DK, "trap", 0, 3, outline=0)
    stakes = [((-12 + k * 4.0) * 1.0, (-6 + (k % 3) * 6.0) * 0.9) for k in range(7)]

    def spikes(lo, hi, broken=False):
        g = Geo()
        for i, (x, y) in enumerate(stakes):
            h = 9.0 if not broken or i % 2 else 4.0
            b = (x, y, 0.5)
            t = (x + 1.5, y, h)
            g.capsule(b, t, 1.2, 1.0)
            if not broken or i % 2:
                g.lathe([(1.0, 0), (0, 3.6)], t, (x + 2.2, y, h + 3.4), segs=8)
        f.add(g, TIP, "trap", lo, hi, outline=0.4)
    spikes(0, 0)                      # unarmed: the stakes show
    spikes(2, 2)                      # sprung: the stakes stand up through the broken cover
    spikes(3, 3, broken=True)         # spent: half the stakes snapped
    g = Geo()                         # armed: a cover of crossed branches and leaves hides the pit
    for k in range(6):
        a = k * 0.55
        g.capsule((-18 * math.cos(a), -10 * math.sin(a), 2.6), (18 * math.cos(a), 10 * math.sin(a), 2.8), 0.9)
    f.add(g, BARK, "trap", 1, 1, outline=0.4)
    g = Geo()
    for k in range(9):
        g.blob((-14 + k * 3.4, ((k * 37) % 13) - 6.0, 3.4), (3.0, 2.4, 1.2), p=2.0)
    f.add(g, LEAF, "trap", 1, 1)
    g = Geo()                         # sprung: broken branch bits flung up
    for k in range(5):
        g.capsule((-10 + k * 5, -8 + k * 3, 8 + (k % 2) * 3), (-6 + k * 5, -6 + k * 3, 11 + (k % 2) * 2), 0.8)
    f.add(g, BARK, "trap", 2, 2, outline=0.4)
    # a marker stick with a team rag (every frame)
    f.add(Geo().capsule((-17.0, 8.0, 0), (-18.0, 8.0, 16.0), 0.9), BARK, "trap", 0, 3)
    g = Geo().slab([(-18.0, 15.5), (-26.0, 14.0), (-24.0, 11.0), (-18.0, 11.5)], 8.0, 1.0)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)
    g = Geo().blob((-15.0, 10.0, 2.0), (3.6, 2.6, 2.2), p=2.2)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)


SPIKE_PIT = make("spike_pit", "Spike Pit", AGE, "trap", _spike_pit, canvas=(200, 120), feet=(100, 92), height=24,
                 hit=(0, 6), material="wood", foot=28.0, yaw=-12.0)


FORTS = [PALISADE, THORN_HEDGE, SLING_PERCH, BONE_WATCHTOWER, WAR_CAMP, SPIKE_PIT]
