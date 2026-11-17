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

from ageborn_art import look
from ageborn_art.geometry import Geo

from world import kit_wa as KW
from world import look_world as LW
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
# World wave A (the detail standard; opted in below): the sharpened points in fresh-cut wood (a lighter tip on every
# stake, so the row reads as stakes at a glance), the rails lashed with crossed ties that read (1.2 lu), stones and
# grass in the earth bank, the team hide in two tones (a team-dark laced border) and tied to the stakes at its corners,
# splintered stumps (the crumble stages add breaks, not just fallen tops), a two-tone banner (team-dark hems).
GRASS = "#7E9654"
PALISADE_KINDS = {WOOD: "wood", WOOD_DK: "wood", BARK: "wood", TIP: "wood", ROPE: "leather", EARTH: "leather",
                  STONE: "stone", STONE_DK: "stone", BONE: "bone", GRASS: "fur", "#6E5A45": "wood", "team": "hide",
                  "#B09778": "wood", "#6E5A47": "wood"}


WOOD_LT = "#B09778"      # the lighter bark of every other stake (the pilot review's nit 2)
GRAIN = "#6E5A47"


def _stake_wa(f, base, top, r, stage, lean_fall=1.0, tone=WOOD):
    """_stake for the Palisade (world wave A): the point a separate fresh-cut piece (TIP), a splintered stump once
    the stake breaks, and the fallen top with its own point (the same length as before); the shaft in `tone` with two
    dark grain lines down its lane-facing side (they stand while the stake does)."""
    d = [t - b for t, b in zip(top, base)]
    L0 = math.sqrt(sum(v * v for v in d))
    u = [v / L0 for v in d]
    point = tuple(t + u_ * r * 3.2 for t, u_ in zip(top, u))
    mid = tuple(b + (t - b) * 0.35 for b, t in zip(base, top))

    def body(fallen):
        g = Geo()
        if not fallen:
            g.capsule(base, top, r, r * 0.9)
            return g, tone
        g.capsule(base, mid, r, r)
        return g, WOOD_DK

    def grain(fallen):
        if fallen:
            return None, None
        g = Geo()
        for ox, oy, t0, t1 in ((0.93, -0.3, 0.12, 0.78), (0.86, 0.45, 0.3, 0.9)):
            p0 = tuple(b + (t - b) * t0 for b, t in zip(base, top))
            p1 = tuple(b + (t - b) * t1 for b, t in zip(base, top))
            g.capsule((p0[0] + ox * r, p0[1] + oy * r, p0[2]), (p1[0] + ox * r * 0.9, p1[1] + oy * r * 0.9, p1[2]),
                      0.42, 0.34)
        return g, GRAIN
    f.breakable(grain, stage, fall=True, outline=0)

    def tip(fallen):
        if fallen:
            return None, None
        return Geo().lathe([(r * 0.9, 0), (0, r * 3.2)], top, point, segs=10), TIP
    f.breakable(body, stage, fall=True)
    f.breakable(tip, stage, fall=True)
    if stage <= 3:
        g = Geo()   # the stump's splinters: three light points standing out of the break
        for dx, dy, h in ((-0.5, -0.6, 3.4), (0.6, 0.3, 2.6), (0.0, 0.8, 2.0)):
            p0 = (mid[0] + dx * r * 0.6, mid[1] + dy * r * 0.6, mid[2] - 0.6)
            g.lathe([(r * 0.42, 0), (0, h)], p0, (p0[0] + 0.3, p0[1], p0[2] + h), segs=6)
        f.add(g, TIP, "body", stage, 3, outline=0.4)
        L = math.dist(base, top) * 0.6     # the broken-off top lying in front, its point at the far end
        x, y = base[0] + 4.0 * lean_fall, base[1]
        a, b = (x, y - 2, r), (x + L * 0.9, y + 3, r * 0.9)
        cut = r * 2.6 / math.dist(a, b)
        bb = tuple(p + (q - p) * (1.0 - cut) for p, q in zip(a, b))
        f.add(Geo().capsule(a, bb, r * 0.9), WOOD, "body", stage, 3)
        f.add(Geo().lathe([(r * 0.8, 0), (0, r * 2.6)], bb, b, segs=10), TIP, "body", stage, 3)


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
        _stake_wa(f, b, t, f.rnd.uniform(3.2, 3.8), stage, tone=WOOD_LT if i % 2 else WOOD)
    # two lashed rails across the stakes (they fall at stage 2 and 3), tied with crossed ropes at every second stake
    for z, st in ((26.0, 3), (52.0, 2)):
        f.breakable(lambda fallen, z=z: ((Geo().capsule((3.6, -36, z), (5.6, 36, z - 2), 2.2) if not fallen
                                           else Geo().capsule((10, -30, 2.0), (14, 28, 2.4), 2.0)), BARK), st)
        g = Geo()
        for y in ys[::2]:
            g.capsule((4.6, y - 1.9, z + 1.9), (4.9, y + 1.9, z - 1.9), 1.15)
            g.capsule((4.6, y - 1.9, z - 1.9), (4.9, y + 1.9, z + 1.9), 1.15)
        f.add(g, ROPE, "body", 0, st - 1, outline=0.4)
    # stones and grass in the earth bank (they stay through every stage)
    g = Geo()
    for k, (y, r) in enumerate(((-30.0, 3.4), (-14.0, 2.8), (3.0, 3.6), (21.0, 3.0), (33.0, 2.6))):
        rock(g, (8.6, y, 2.2), (r, r * 1.2, r * 0.8), seed=40 + k, jag=0.16, p=2.4, cuts=3)
    f.add(g, STONE, "body", 0, 3, outline=0.5)
    g = Geo()
    for k, y in enumerate((-36.0, -22.0, -6.0, 12.0, 27.0)):
        for j in range(3):
            a = math.radians(-30 + 30 * j)
            g.capsule((6.6, y + j * 1.6, 3.6), (7.4 + 2.2 * math.sin(a), y + j * 1.6 + 1.0, 7.8 + j % 2), 0.9, 0.5)
    f.add(g, GRASS, "body", 0, 3, outline=0.4)
    # the team hide stretched on the stakes, laced with a team-dark border and tied at its corners, a bone hand-print
    g = Geo().blob((8.6, -2.0, 46.0), (2.0, 14.0, 13.0), p=2.6)
    f.add(g, None, "body", 0, 1, team=True)
    j = f.group("body", 0, 1)
    look.team_part(f.rig, j, Geo().blob((8.1, -2.0, 46.0), (1.6, 15.6, 14.6), p=2.6))
    g = Geo()
    for dy, dz in ((-12.5, 11.0), (8.5, 11.0), (-12.5, -10.5), (8.5, -10.5)):
        g.capsule((9.4, -2.0 + dy - 1.6, 46.0 + dz + 1.6), (9.6, -2.0 + dy + 1.6, 46.0 + dz - 1.6), 1.0)
    f.add(g, ROPE, "body", 0, 1, outline=0.4)
    g = Geo().blob((9.8, -2.0, 30.0), (2.0, 13.0, 9.0), p=2.6)
    f.add(g, None, "body", 2, 2, team=True)
    look.team_part(f.rig, f.group("body", 2, 2), Geo().blob((9.3, -2.0, 30.0), (1.6, 14.4, 10.4), p=2.6))
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


def _banner_hems(mod, base, h, length, width):
    """World wave A: a team-dark hem along the bottom edge of the fort's banner (its three waving segments), so the
    flag is a two-tone team zone; added after the shared banner (fort_toon.banner) is built."""
    build = mod.build

    def _build(rig):
        build(rig)
        bx, by, bz = base
        top = bz + h - 2.0
        seg = length / 3
        for i in range(3):
            x0 = bx - 1.0 - seg * i
            x1 = x0 - seg - 0.6 * (i < 2)
            w0, w1 = width * (1.0 - 0.1 * i), width * (1.0 - 0.1 * (i + 1))
            if i == 2:
                x1 = x0 - seg * 0.55
                w1 = width * 0.82
            pts = [(x0, top - w0 + 2.2), (x1, top - w1 + 2.2 - 0.3 * i), (x1, top - w1 - 0.3 * i + 0.2),
                   (x0, top - w0 + 0.2)]
            look.team_part(rig, f"flag{i}", Geo().slab(pts, by - 0.85, 0.3), outline=0)
        # the hoist bound to the pole with a team-dark cord (it waves with the first segment)
        g = Geo().blob((bx - 2.2, by, top - width * 0.45), (1.6, 1.6, width * 0.55), p=2.4)
        look.team_part(rig, "flag0", g, outline=0.4)
    mod.build = _build
    return mod


_banner_hems(PALISADE, (-7.0, 1.0, 0.0), 92.0, 22.0, 10.0)
LW.opt_in(PALISADE, PALISADE_KINDS, highlight=1.8, shade=KW.SHADE_WORLD)


# ================================================================================== Thorn Hedge (wall)
def _thorn_hedge(f):
    f.add(Geo().blob((0, 0, 0), (12, 38, 4.0), p=2.4), EARTH, "body", 0, 3)
    f.add(Geo().blob((0, 0, 0), (15, 40, 3.4), p=2.4), EARTH, "rubble")
    ys = [-30 + i * 10 for i in range(7)]
    for i, y in enumerate(ys):   # short stakes the hedge is woven between (world wave A: fresh-cut points, splinters)
        b = (0.0, y, -1.0)
        t = (2.0, y, 44 + (i % 2) * 6)
        _stake_wa(f, b, t, 2.4, f.stage_for(0.5, edge=abs(y) / 30.0, keep=0.3))
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
        g = Geo().blob((3.6, y, 44.0), (2.8, 3.4, 2.8), p=2.2)     # (world wave A: the knot 2.4 -> 2.8 lu)
        f.add(g, None, "body", 0, 2, team=True, outline=0.5)
    for k in range(7):
        y = -30 + k * 10
        f.add(Geo().blob((10 + (k % 2) * 6, y, 3.0), (6, 5, 3), p=2.0), BRAMBLE_DK, "rubble")
    f.add(Geo().slab([(14, 4), (22, 3), (20, 0.5), (12, 1)], 0.0, 4.0), None, "rubble", team=True)
    scaffold(f, -10, 12, -34, 34, 48, levels=1)
    _thorn_hedge_wa(f)


def _thorn_hedge_wa(f):
    """The Thorn Hedge's world wave A detail: pale blackthorn blossom and leaf sprigs on the bramble (the lower two rows,
    which stand longest), the team rags in two tones (team-dark fly edges), stones and grass along the bank."""
    g, gl = Geo(), Geo()
    for i in range(12):
        y = -32 + i * 5.8
        for z in (12.0, 26.0):
            for k in range(3):
                a = i * 1.7 + k * 2.1 + z
                cy, cz = y + 4.6 * math.cos(a), z + 4.0 * math.sin(a)
                if k == 1:          # one leaf sprig a ball, a sparse blossom: the bramble balls stay the read
                    gl.blob((6.6, cy + 1.6, cz - 1.4), (0.7, 2.2, 0.9), p=2.0, rot=(0, 0, 30))
                if (i + k) % 3 == 0 and z < 20.0:
                    g.blob((7.0 - abs(math.sin(a)) * 1.6, cy, cz), (0.7, 0.8, 0.7), p=2.0)
    f.add(g, BONE_DK, "body", 0, 1, outline=0.3)
    f.add(gl, LEAF, "body", 0, 1, outline=0)
    for y in (-18.0, 6.0, 24.0):
        j = f.group("body", 0, 1)
        look.team_part(f.rig, j, Geo().slab([(7.2, 41.0), (8.0, 40.0), (6.0, 34.0), (5.4, 35.4)], y - 0.75, 0.3))
    g = Geo()
    for k, (y, r) in enumerate(((-29.0, 2.8), (-12.0, 2.4), (2.0, 3.0), (17.0, 2.6), (31.0, 2.2))):
        rock(g, (8.2, y, 2.0), (r, r * 1.2, r * 0.8), seed=50 + k, jag=0.16, p=2.4, cuts=3)
    f.add(g, STONE, "body", 0, 3, outline=0.5)
    g = Geo()
    for k, y in enumerate((-34.0, -21.0, -5.0, 10.0, 26.0)):
        for jj in range(3):
            a = math.radians(-30 + 30 * jj)
            g.capsule((6.6, y + jj * 1.6, 3.0), (7.4 + 2.2 * math.sin(a), y + jj * 1.6 + 1.0, 7.0 + jj % 2), 0.9, 0.5)
    f.add(g, GRASS, "body", 0, 3, outline=0.4)


THORN_HEDGE = make("thorn_hedge", "Thorn Hedge", AGE, "wall", _thorn_hedge, canvas=(300, 220), feet=(150, 190), height=64,
                   hit=(2, 26), material="wood", flag=(-8.0, 2.0, 0.0, 66.0), flag_len=18.0, foot=24.0, yaw=-38.0)
TH_KINDS = {EARTH: "leather", BRAMBLE: "fur", BRAMBLE_DK: "fur", THORN: "wood", WOOD: "wood", WOOD_DK: "wood",
            TIP: "wood", STONE: "stone", GRASS: "fur", BONE_DK: "bone", LEAF: "fur", ROPE: "leather", "#6E5A45": "wood",
            "team": "hide"}
_banner_hems(THORN_HEDGE, (-8.0, 2.0, 0.0), 66.0, 18.0, 10.0)
LW.opt_in(THORN_HEDGE, TH_KINDS, highlight=1.8, shade=KW.SHADE_WORLD)


# ================================================================================== Sling Perch (tower)
# World wave A: the braces lashed where they cross and where they meet the stilts, the deck in planks, the team hide
# on the parapet in two tones (a team-dark border), stones and grass at the stilts' feet, a two-tone banner (team-dark
# hems).
SP_KINDS = {BARK: "wood", WOOD: "wood", WOOD_DK: "wood", ROPE: "leather", BONE: "bone", STONE: "stone",
            STONE_DK: "stone", GRASS: "fur", "#6E5A45": "wood", "team": "hide"}


def _sling_perch_wa(f):
    """The Sling Perch's world wave A detail (over the old model; same footprint, platform and crew point)."""
    for z in (16.0, 30.0):     # the braces' crossing tie and their lashed ends on the front stilts
        g = Geo()
        g.capsule((0.0, -10.4, z + 3.0 + 1.7), (0.0, -10.4, z + 3.0 - 1.7), 0.95)
        g.capsule((-1.6, -10.4, z + 3.0), (1.6, -10.4, z + 3.0), 0.95)
        for x0, z0 in ((-8.4, z), (8.4, z + 6.0), (8.4, z), (-8.4, z + 6.0)):
            lx = (9.0 if x0 > 0 else -9.0) * (1.0 - 0.3 * (z0 + 1.0) / 47.0)
            ly = -9.0 * (1.0 - 0.3 * (z0 + 1.0) / 47.0)
            KW.wrap_geo((lx, ly, z0 - 1.6), (lx * 0.995, ly * 0.995, z0 + 1.6), 2.4, 2, w=0.6, g=g)
        f.add(g, ROPE, "body", 0, 2, outline=0.4)
    g = Geo()                  # the deck's planks (seams across the platform's top and its front edge)
    for k in range(5):
        y = -10.0 + k * 5.0
        g.capsule((-11.2, y, 48.35), (11.2, y, 48.35), 0.42)
        g.capsule((12.6, y, 47.6), (12.6, y, 44.6), 0.42)
    f.add(g, WOOD_DK, "body", 0, 2, outline=0)
    g = Geo()                  # stones and grass at the stilts' feet (inside the old width: it sets the sheet's)
    for k, (x, y, r) in enumerate(((-9.6, -12.4, 2.4), (9.4, -12.6, 2.2), (-3.0, -14.2, 1.8), (11.0, -4.0, 1.6))):
        rock(g, (x, y, 1.4), (r, r * 1.1, r * 0.7), seed=60 + k, jag=0.18, p=2.4, cuts=3)
    f.add(g, STONE, "body", 0, 3, outline=0.5)
    g = Geo()
    for k, (x, y) in enumerate(((-7.0, -13.0), (4.0, -13.6), (-10.6, -6.0), (8.0, -9.4))):
        for j in range(3):
            a = math.radians(-35 + 35 * j)
            g.capsule((x + j * 1.2, y, 0.6), (x + j * 1.2 + 2.0 * math.sin(a), y - 0.6, 4.4 + j % 2), 0.8, 0.45)
    f.add(g, GRASS, "body", 0, 3, outline=0.4)
    for st in range(3):         # the hide's team-dark border (the parapet is seen edge-on from the lane camera: stakes,
        h = [10.0, 8.0, 5.0][st]   # withies or ties on it would only cover the hide, its team face)
        j = f.group("front", st, st)
        look.team_part(f.rig, j, Geo().blob((9.1, -2.0, 46.0 + h * 0.5), (1.3, 9.2, h * 0.45 + 1.1), p=2.6))


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
    _sling_perch_wa(f)


SLING_PERCH = make("sling_perch", "Sling Perch", AGE, "tower", _sling_perch, canvas=(240, 270), feet=(118, 236), height=96,
                   hit=(0, 30), material="wood", flag=(-11.0, 9.0, 44.0, 38.0), flag_len=16.0, foot=16.0, yaw=-14.0,
                   crew=dict(visualId="unit.pebbler", at=(0.5, 0.0, 47.8), scale=0.6))
_banner_hems(SLING_PERCH, (-11.0, 9.0, 44.0), 38.0, 16.0, 10.0)
LW.opt_in(SLING_PERCH, SP_KINDS, highlight=1.8, shade=KW.SHADE_WORLD)


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
        # (world wave A: the band 1.3 -> 1.8 lu and 0.6 lu forward, over the ribs it lashes: the thin band lost its
        # team under outline v4 and behind the ribs)
        g = Geo().capsule((10.0, -12, 56.0 + h * 0.55), (10.0, 12, 56.0 + h * 0.55), 1.8)
        f.add(g, None, "front", st, st, team=True, outline=0.4)
    for k in range(6):
        f.add(Geo().capsule((6 + k * 4, -10 + k * 4, 3), (24 + k * 3, -4 + k * 3, 3.2), 2.6), BONE_DK, "rubble")
    f.add(Geo().blob((16, 4, 2), (7, 8, 1.4), p=2.4), None, "rubble", team=True)
    scaffold(f, -13, 13, -13, 13, 58)
    _bone_watchtower_wa(f)


def _bone_watchtower_wa(f):
    """The Bone Watchtower's world wave A detail: hide lashings where the tusk arches meet the leg bones, cracks and
    worn grooves on the near leg bones, the deck in planks, the skull totem with dark eye sockets and a jaw, the team
    hide under the platform in two tones (a team-dark border), stones and grass at the bones' feet."""
    g = Geo()
    for y in (-11.0, 11.0):
        for x, z in ((-12.0, 18.0), (12.0, 18.0)):
            lx = (10.0 if x > 0 else -10.0) * (1.0 - 0.2 * z / 54.0)
            ly = (10.0 if y > 0 else -10.0) * (1.0 - 0.2 * z / 54.0)
            KW.wrap_geo((lx, ly, z - 2.2), (lx * 0.99, ly * 0.99, z + 2.2), 3.0, 2, w=0.6, g=g)
    f.add(g, "#8A6A50", "body", 0, 2, outline=0.4)
    g = Geo()            # cracks and worn grooves on the two near leg bones
    for x in (-10.0, 10.0):
        for z0, dz in ((14.0, 5.0), (30.0, 4.0), (40.0, 6.0)):
            k = 1.0 - 0.2 * z0 / 54.0
            g.capsule((x * k + 0.6, -10.0 * k - 3.0, z0), (x * k - 0.4, -10.0 * k - 2.9, z0 + dz), 0.35, 0.3)
    f.add(g, "#9E9076", "body", 0, 2, outline=0)
    g = Geo()            # the deck's planks
    for k in range(5):
        y = -11.0 + k * 5.5
        g.capsule((-12.2, y, 58.5), (12.2, y, 58.5), 0.42)
    f.add(g, WOOD_DK, "body", 0, 2, outline=0)
    g = Geo()            # the skull's sockets and its jaw line
    g.blob((-12.7, 6.0, 79.6), (1.0, 0.6, 1.1), p=2.0).blob((-15.3, 6.0, 79.6), (1.0, 0.6, 1.1), p=2.0)
    g.capsule((-14.6, 6.4, 75.4), (-12.2, 6.4, 75.4), 0.3)
    f.add(g, "#3A322E", "body", 0, 1, outline=0)
    j = f.group("body", 0, 2)  # the team hide's team-dark border
    look.team_part(f.rig, j, Geo().blob((4.0, -9.4, 46.0), (10.2, 1.3, 9.2), p=2.6))
    g = Geo()            # stones and grass at the bones' feet (inside the old width)
    for k, (x, y, r) in enumerate(((-6.0, -14.6, 2.2), (6.4, -14.0, 2.4), (13.0, -2.0, 1.6))):
        rock(g, (x, y, 1.4), (r, r * 1.1, r * 0.7), seed=80 + k, jag=0.18, p=2.4, cuts=3)
    f.add(g, STONE, "body", 0, 3, outline=0.5)
    g = Geo()
    for k, (x, y) in enumerate(((-2.0, -14.0), (10.0, -12.0), (-13.0, -12.0))):
        for jj in range(3):
            a = math.radians(-35 + 35 * jj)
            g.capsule((x + jj * 1.2, y, 0.6), (x + jj * 1.2 + 2.0 * math.sin(a), y - 0.6, 4.4 + jj % 2), 0.8, 0.45)
    f.add(g, GRASS, "body", 0, 3, outline=0.4)


BONE_WATCHTOWER = make("bone_watchtower", "Bone Watchtower", AGE, "tower", _bone_watchtower, canvas=(240, 300),
                       feet=(118, 266), height=108, hit=(0, 34), material="wood", flag=(-12.0, -8.0, 54.0, 40.0),
                       flag_len=16.0, foot=18.0, yaw=-14.0,
                       crew=dict(visualId="unit.pebbler", at=(0.5, 0.0, 57.8), scale=0.6))
BW_KINDS = {BONE: "bone", BONE_DK: "bone", "#9E9076": "bone", WOOD: "wood", WOOD_DK: "wood", BARK: "wood",
            "#8A6A50": "leather", STONE: "stone", GRASS: "fur", "#6E5A45": "wood", "team": "hide"}
_banner_hems(BONE_WATCHTOWER, (-12.0, -8.0, 54.0), 40.0, 16.0, 10.0)
LW.opt_in(BONE_WATCHTOWER, BW_KINDS, highlight=1.8, shade=KW.SHADE_WORLD)


# ================================================================================== War Camp (camp)
# World wave A: the tipi's hide in panels (stitched seams up the cone), the team bands in two tones (team-dark edges),
# the poles lashed where they cross, pegs and guy ropes round the foot, the fire pit's stones with an ember bed and a
# split log, a two-tone banner (team-dark hems).
HIDE_DK = "#9A8A6E"
EMBER = "#7A4A36"
WC_KINDS = {HIDE: "hide", HIDE_DK: "hide", BARK: "wood", WOOD_DK: "wood", BONE: "bone", STONE: "stone", ASH: "stone",
            ROPE: "leather", TIP: "wood", "#6E5A45": "wood", "team": "hide"}


def _war_camp_wa(f):
    """The War Camp's world wave A detail (over the old model; same footprint, door and fire pit)."""
    prof = [(22.0, 0), (19.0, 14), (12.0, 34), (5.0, 50)]
    g = Geo()                  # stitched seams up the cone between the hide panels (the camera side)
    for a in (-150.0, -118.0, -86.0, -54.0, -22.0, 10.0):
        t = math.radians(a)
        pts = [((r + 0.25) * math.cos(t), (r + 0.25) * math.sin(t), z) for r, z in prof]
        for p, q in zip(pts, pts[1:]):
            g.capsule(p, q, 0.5, 0.45)
    f.add(g, HIDE_DK, "body", 0, 1, outline=0)
    g = Geo()                  # the stitches across one seam
    t = math.radians(-54.0)
    for k in range(7):
        z = 3.0 + k * 6.6
        r = 22.0 - 3.0 * min(1.0, z / 14.0) - 7.0 * max(0.0, min(1.0, (z - 14.0) / 20.0)) + 0.5
        c, s_ = math.cos(t), math.sin(t)
        g.capsule(((r) * c - 1.0 * s_, (r) * s_ + 1.0 * c, z), ((r) * c + 1.0 * s_, (r) * s_ - 1.0 * c, z + 0.4), 0.32)
    f.add(g, BONE, "body", 0, 1, outline=0)
    for lo, hi, z0, z1, r0, r1 in ((0, 2, 14.0, 22.6, 19.7, 17.5), (0, 1, 36.0, 41.4, 10.3, 8.5)):
        j = f.group("body", lo, hi)
        g = Geo()               # the team bands' team-dark edges
        g.lathe([(r0 + 0.1, 0.0), (r0 + 0.2, 0.4), (r0 - 0.1, 1.3), (r0 - 0.3, 1.4)], (0, 0, z0 - 0.2), (0, 0, z0 + 2),
                segs=28)
        g.lathe([(r1 + 0.3, 0.0), (r1 + 0.4, 0.2), (r1 + 0.1, 1.2), (r1 - 0.1, 1.3)], (0, 0, z1 - 1.2),
                (0, 0, z1 + 2), segs=28)
        look.team_part(f.rig, j, g)
    g = Geo()                  # the poles lashed where they cross
    g.lathe([(3.6, -1.6), (4.3, -0.8), (4.3, 0.8), (3.6, 1.6)], (0, 0, 55.0), (0, 0, 57.0), segs=16)
    f.add(g, ROPE, "body", 0, 1, outline=0.4)
    g = Geo()                  # pegs and guy ropes round the foot (the camera side)
    for a in (-140.0, -100.0, -60.0, -20.0):
        t = math.radians(a)
        c, s_ = math.cos(t), math.sin(t)
        g.capsule((24.6 * c, 24.6 * s_ * 0.9, 0.0), (23.8 * c, 23.8 * s_ * 0.9, 3.4), 0.7, 0.55)
    f.add(g, BARK, "body", 0, 3, outline=0.4)
    g = Geo()
    for a in (-140.0, -100.0, -60.0, -20.0):
        t = math.radians(a)
        c, s_ = math.cos(t), math.sin(t)
        g.capsule((21.4 * c, 21.4 * s_, 2.4), (24.0 * c, 24.0 * s_ * 0.9, 3.0), 0.4)
    f.add(g, ROPE, "body", 0, 1, outline=0.3)
    f.add(Geo().blob((30.0, -12.0, 1.6), (3.0, 2.6, 0.8), p=2.2), EMBER, "body", 0, 1, outline=0)
    g = Geo().capsule((26.4, -15.0, 2.2), (33.6, -9.6, 2.6), 1.0)
    f.add(g, BARK, "body", 0, 3, outline=0.4)
    f.add(Geo().capsule((33.4, -9.8, 2.6), (33.9, -9.4, 2.7), 0.95), TIP, "body", 0, 3, outline=0.3)


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
    # world wave A: the torn team band lying across the rubble, rucked up so it reads (outline v4 thins a flat rag)
    f.add(Geo().blob((-6.0, -12.0, 3.4), (9.0, 2.6, 2.8), p=2.4, rot=(0, 0, 18)), None, "rubble", team=True)
    scaffold(f, -20, 20, -20, 20, 50, levels=1)
    _war_camp_wa(f)


WAR_CAMP = make("war_camp", "War Camp", AGE, "camp", _war_camp, canvas=(290, 250), feet=(140, 214), height=86, hit=(0, 26),
                material="wood", flag=(-22.0, -12.0, 0.0, 76.0), flag_len=22.0, foot=30.0, yaw=-24.0,
                lights=[((30.0, -12.0, 7.0), 14, 1)], smoke=[((30.0, -12.0, 12.0), 0), ((0.0, 0.0, 58.0), 2)],
                extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})
_banner_hems(WAR_CAMP, (-22.0, -12.0, 0.0), 76.0, 22.0, 10.0)
LW.opt_in(WAR_CAMP, WC_KINDS, highlight=1.8, shade=KW.SHADE_WORLD)


# ================================================================================== Spike Pit (trap)
def _spike_pit(f):
    rim = Geo().lathe([(14.0, 0), (17.0, 1.6), (15.4, 3.0), (12.0, 2.0)], (0, 0, 0), (0, 0, 3.0), segs=28, squash=(1.6, 1.0))
    f.add(rim, EARTH, "trap", 0, 3)
    f.add(Geo().blob((0, 0, 0.4), (21, 13, 0.8), p=2.4), EARTH_DK, "trap", 0, 3, outline=0)
    stakes = [((-12 + k * 4.0) * 1.0, (-6 + (k % 3) * 6.0) * 0.9) for k in range(7)]

    def spikes(lo, hi, broken=False):
        # world wave A: the shafts in weathered wood, the fire-hardened points fresh-cut (two tones: they read as
        # sharpened stakes), a splinter on every snapped one
        g, gp = Geo(), Geo()
        for i, (x, y) in enumerate(stakes):
            h = 9.0 if not broken or i % 2 else 4.0
            b = (x, y, 0.5)
            t = (x + 1.5, y, h)
            g.capsule(b, t, 1.2, 1.0)
            if not broken or i % 2:
                gp.lathe([(1.0, 0), (0, 3.6)], t, (x + 2.2, y, h + 3.4), segs=8)
            else:
                gp.lathe([(0.5, 0), (0, 2.2)], (x + 1.4, y - 0.3, h - 0.4), (x + 1.8, y - 0.3, h + 1.8), segs=6)
        f.add(g, WOOD, "trap", lo, hi, outline=0.4)
        f.add(gp, TIP, "trap", lo, hi, outline=0.4)
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
    g = Geo()                         # world wave A: a second leaf tone and twigs over the cover
    for k in range(6):
        g.blob((-12 + k * 4.6, ((k * 23) % 11) - 4.0, 4.2), (2.4, 1.9, 1.0), p=2.0)
    f.add(g, LEAF_DK, "trap", 1, 1)
    g = Geo()
    for k in range(4):
        g.capsule((-10 + k * 6, -7 + (k % 2) * 9, 4.4), (-6 + k * 6, -5 + (k % 2) * 8, 4.8), 0.5)
    f.add(g, BARK, "trap", 1, 1, outline=0.3)
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
    # world wave A: the rag's team-dark fly edge (two tones), its tie on the stick; stones and grass on the rim
    j = f.group("trap", 0, 3)
    look.team_part(f.rig, j, Geo().slab([(-24.6, 14.25), (-26.0, 14.0), (-24.0, 11.0), (-22.8, 11.2)], 7.25, 0.3))
    f.add(KW.wrap_geo((-17.9, 8.0, 10.6), (-18.05, 8.0, 15.8), 0.9, 2, w=0.55), ROPE, "trap", 0, 3, outline=0.3)
    g = Geo()
    for k, (x, y, r) in enumerate(((-22.0, -9.0, 2.2), (6.0, -14.6, 1.8), (21.0, -8.0, 2.0), (-4.0, 15.0, 1.6))):
        rock(g, (x, y, 2.4), (r, r * 1.1, r * 0.7), seed=70 + k, jag=0.18, p=2.4, cuts=3)
    f.add(g, STONE, "trap", 0, 3, outline=0.5)
    g = Geo()
    for k, (x, y) in enumerate(((-14.0, -14.0), (13.0, -13.0), (24.0, 2.0))):
        for jj in range(3):
            a = math.radians(-35 + 35 * jj)
            g.capsule((x + jj * 1.1, y, 1.8), (x + jj * 1.1 + 1.8 * math.sin(a), y - 0.5, 5.0 + jj % 2), 0.7, 0.4)
    f.add(g, GRASS, "trap", 0, 3, outline=0.4)


LEAF_DK = "#6F8450"
SPK_KINDS = {EARTH: "leather", EARTH_DK: "leather", WOOD: "wood", TIP: "wood", BARK: "wood", LEAF: "fur",
             LEAF_DK: "fur", STONE: "stone", GRASS: "fur", ROPE: "leather", "team": "hide"}
SPIKE_PIT = make("spike_pit", "Spike Pit", AGE, "trap", _spike_pit, canvas=(200, 120), feet=(100, 92), height=24,
                 hit=(0, 6), material="wood", foot=28.0, yaw=-12.0)
LW.opt_in(SPIKE_PIT, SPK_KINDS, highlight=1.8, shade=KW.SHADE_WORLD)


FORTS = [PALISADE, THORN_HEDGE, SLING_PERCH, BONE_WATCHTOWER, WAR_CAMP, SPIKE_PIT]
