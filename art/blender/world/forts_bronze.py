"""Bronze Age forts in the cartoon style (DESIGN A16.14.4; the MVP release check flagged the realistic forts).

Built with `world/fort_toon.make` (the cel shading, 2D outline and v3 sheets of the units) and the fort sheet
contract of the realistic pipeline, so `src/visuals/fortViews/atlasFortView.ts` draws them unchanged:

  cyclopean_wall  wall    giant rounded limestone blocks in four courses, two team aspis shields, a team
                          linen banner on a cedar beam; the top blocks tumble off as it crumbles
  pyrgos_tower    tower   a whitewashed square tower with a crenellated cedar deck; the Javelineer crew
                          stands behind the front parapet (drawn over the crew)
  muster_tents    camp    two linen tents with team panels round a campfire, a door flap that opens
  hidden_stakes   trap    a reed mat hiding sharpened stakes: unarmed (stacked), armed (a few tips peek),
                          sprung (the stakes snap up), spent (broken)
  hoplon_line     wall    W2 cover wall: a row of locked team hoplons on a timber rack, spears behind them
  slinger_camp    camp    W2 ranged camp: a round fieldstone sheepfold with a team awning, a heap of sling
                          stones and a target post

Palette (A17.12 Bronze): sandstone, whitewash, cedar, linen; team colour on shields, banners and panels;
polished bronze only as small accents (bosses, finials). Everything has the cartoon look: chunky rounded
shapes, a thick outline, two-tone cel shading.
"""
import math

from ageborn_art import rigs_bronze as P
from ageborn_art.geometry import Geo

from world.common import rock
from world.fort_toon import make, scaffold

AGE = "bronze"
LIME = "#CFC2A6"
LIME_DK = "#B4A88E"
LIME_LT = "#E2D8C2"
WHITE = "#E8E0CE"
WHITE_DK = "#CFC5B0"
CEDAR = "#8A6A4E"
CEDAR_DK = "#634C38"
REED = "#C8B98E"
REED_DK = "#A99A70"
EARTH = "#9C8B72"
LINEN = P.LINEN
ROPE = "#C2AE86"
FIRE = "#FFE3B0"
STAKE = "#D8C7A2"


def _aspis(f, c, r, fam="body", lo=0, hi=9, face="y", rim=P.AGED):
    """A round team shield seen on its face: a team dish, an aged-bronze rim, a sandstone lambda, a boss."""
    x, y, z = c
    if face == "y":
        g = Geo().blob((x, y, z), (r, 1.6, r), p=2.0)
        f.add(g, None, fam, lo, hi, team=True, outline=0.8)
        g = Geo().lathe([(r - 1.2, -0.7), (r + 0.3, -0.5), (r + 0.3, 0.5), (r - 1.2, 0.7)], (x, y - 1.4, z),
                        (x, y - 2.0, z), segs=24)
        f.add(g, rim, fam, lo, hi, finish="metal", outline=0.5)
        g = Geo()
        g.capsule((x - r * 0.42, y - 1.9, z - r * 0.45), (x, y - 1.9, z + r * 0.45), 0.9)
        g.capsule((x, y - 1.9, z + r * 0.45), (x + r * 0.42, y - 1.9, z - r * 0.45), 0.9)
        f.add(g, P.SAND_LT, fam, lo, hi, outline=0.3)
        f.add(Geo().sphere((x, y - 2.2, z), r * 0.16, cuts=3), P.BRONZE_HI, fam, lo, hi, finish=P.POLISH, outline=0.4)
    else:
        g = Geo().blob((x, y, z), (1.6, r, r), p=2.0)
        f.add(g, None, fam, lo, hi, team=True, outline=0.8)
        g = Geo().lathe([(r - 1.2, -0.7), (r + 0.3, -0.5), (r + 0.3, 0.5), (r - 1.2, 0.7)], (x + 1.4, y, z),
                        (x + 2.0, y, z), segs=24)
        f.add(g, rim, fam, lo, hi, finish="metal", outline=0.5)
        f.add(Geo().sphere((x + 2.2, y, z), r * 0.16, cuts=3), P.BRONZE_HI, fam, lo, hi, finish=P.POLISH, outline=0.4)


def _rubble(f, center, spread, n, seed, colours, size=(3.0, 6.0)):
    cx, cy = center
    rnd = f.rnd
    for k in range(n):
        a = rnd.uniform(0, 2 * math.pi)
        d = rnd.uniform(0.2, 1.0)
        x, y = cx + spread[0] * d * math.cos(a), cy + spread[1] * d * math.sin(a)
        s = rnd.uniform(*size)
        g = Geo()
        rock(g, (x, y, s * 0.45), (s, s * rnd.uniform(0.8, 1.1), s * 0.7), seed=seed + k, jag=0.1, p=3.0)
        f.add(g, colours[k % len(colours)], "rubble", 0, 0)


# ====================================================================================== Cyclopean Wall
def _cyclopean(f):
    rnd = f.rnd
    f.add(Geo().blob((0, 0, 0.6), (17, 40, 2.4), p=3.0), EARTH, "body")            # earth bank
    courses = [(9.0, 4, 16.0, 18.0), (25.0, 5, 15.0, 16.0), (40.0, 4, 14.0, 14.5), (54.0, 5, 13.0, 13.0)]
    span = 66.0
    for ci, (z, n, hgt, thick) in enumerate(courses):
        ys = [-span / 2 + span * i / n for i in range(n + 1)]
        for i in range(n):
            y0, y1 = ys[i], ys[i + 1]
            y = (y0 + y1) / 2 + (2.0 if ci % 2 else -2.0)
            ry = (y1 - y0) / 2 - 0.5
            rz = hgt / 2 * rnd.uniform(0.94, 1.06)
            rx = thick / 2 * rnd.uniform(0.94, 1.04)
            col = (LIME, LIME_DK, LIME_LT)[(i + ci) % 3]
            stage = f.stage_for((ci + 1) / len(courses), abs(y) / (span / 2), keep=0.15 if ci == 0 else 0.0)
            xoff = -ci * 0.8 + rnd.uniform(-0.6, 0.6)
            rot = (rnd.uniform(-4, 4), rnd.uniform(-3, 3), rnd.uniform(-3, 3))

            def make_block(fallen, y=y, z=z, rx=rx, ry=ry, rz=rz, col=col, xoff=xoff, rot=rot, ci=ci, i=i):
                g = Geo()
                if fallen:
                    rock(g, (22 + 6 * ((i + ci) % 3), y * 0.8, rz * 0.55), (rx * 0.8, ry * 0.7, rz * 0.6),
                         seed=31 + 7 * ci + i, jag=0.08, p=3.6, rot=(rot[0] * 4, rot[1] * 6, rot[2] * 10))
                else:
                    rock(g, (xoff, y, z), (rx, ry, rz), seed=11 + 7 * ci + i, jag=0.06, p=3.8, rot=rot)
                return g, col
            f.breakable(make_block, stage)
    # capstones along the top (fall first)
    for i in range(4):
        y = -24.0 + 16.0 * i
        stage = f.stage_for(1.0, abs(y) / 33.0)

        def make_cap(fallen, y=y, i=i):
            g = Geo()
            if fallen:
                rock(g, (28 + 4 * i, y * 0.7, 3.6), (6.0, 6.0, 3.6), seed=61 + i, jag=0.08, p=3.4)
            else:
                rock(g, (-2.0, y, 64.5), (6.4, 7.0, 4.2), seed=51 + i, jag=0.06, p=3.6)
            return g, LIME_LT
        f.breakable(make_cap, stage)
    # team: a linen banner on a cedar beam over the lane face, two painted aspis shields
    f.add(Geo().capsule((9.5, -20, 58), (9.5, 20, 58), 1.6), CEDAR, "body", 0, 1)
    for y0 in (-17.0, 5.0):
        g = Geo().blob((10.8, y0 + 6.0, 45.0), (0.9, 6.0, 12.0), p=3.0)          # linen banners on the lane face
        f.add(g, None, "body", 0, 1, team=True, outline=0.8)
        g = Geo().blob((11.2, y0 + 6.0, 33.6), (0.8, 6.2, 1.0), p=3.0)
        f.add(g, P.SAND_LT, "body", 0, 1, outline=0.4)
    _aspis(f, (8.0, -27.0, 22.0), 7.0, lo=0, hi=2, face="x")
    _aspis(f, (8.0, 26.0, 20.0), 7.0, lo=0, hi=1, face="x")
    _rubble(f, (8.0, 0.0), (18.0, 26.0), 14, 70, (LIME, LIME_DK, LIME_LT))
    scaffold(f, -8.0, 8.0, -30.0, 30.0, 66.0, wood=CEDAR, rope=ROPE)


CYCLOPEAN = make("cyclopean_wall", "Cyclopean Wall", AGE, "wall", _cyclopean, canvas=(300, 300), feet=(140, 264),
                 height=84, hit=(4, 34), material="stone", flag=(-8.0, 2.0, 66.0, 22.0), foot=28.0,
                 pole_fill=CEDAR_DK, tip_fill=P.BRONZE_HI)


# ====================================================================================== Pyrgos Tower
def _pyrgos(f):
    rnd = f.rnd
    W, D, H = 24.0, 20.0, 58.0
    f.add(Geo().blob((0, 0, 1.6), (18, 15, 2.8), p=3.2), LIME_DK, "body")              # plinth
    # coursed whitewash blocks: rounded, slightly uneven, the top courses fall first
    ch = 9.6
    nc = int(H // ch)
    for ci in range(nc):
        z = 3.0 + ci * ch + ch / 2
        for face in ("-y", "+x"):
            L = W if face == "-y" else D
            n = 3
            for i in range(n):
                off = (i + 0.5) * L / n - L / 2 + (1.4 if ci % 2 else -1.4)
                if abs(off) > L / 2 - 2:
                    continue
                c = (off, -D / 2, z) if face == "-y" else (W / 2, off, z)
                r = (L / n / 2 - 0.4, 2.0, ch / 2 - 0.4) if face == "-y" else (2.0, L / n / 2 - 0.4, ch / 2 - 0.4)
                col = WHITE if (ci + i) % 3 else WHITE_DK
                stage = f.stage_for((ci + 1) / nc, abs(off) / (L / 2) * 0.6, keep=0.1)

                def make_b(fallen, c=c, r=r, col=col, ci=ci, i=i, face=face):
                    g = Geo()
                    if fallen:
                        rock(g, (c[0] + 14 + 4 * i, c[1] - 6, r[2] * 0.5), (3.6, 3.6, r[2] * 0.6), seed=91 + ci * 5 + i,
                             jag=0.08, p=3.6)
                    else:
                        g.blob(c, r, p=4.2)
                    return g, col
                f.breakable(make_b, stage)
    f.add(Geo().blob((0, 0, 3.0 + H / 2), (W / 2 - 1.5, D / 2 - 1.5, H / 2), p=5.0), WHITE_DK, "body")   # core
    f.add(Geo().blob((-3.0, -D / 2 - 0.8, 12.0), (4.2, 1.0, 8.0), p=3.0, taper=(0.9, 1.0)), "#3E3430", "body", 0, 2)
    f.add(Geo().blob((-3.0, -D / 2 - 1.2, 20.6), (6.0, 1.6, 1.4), p=4.0), CEDAR_DK, "body", 0, 2)        # lintel
    f.add(Geo().blob((0, 0, H + 3.6), (W / 2 + 2.4, D / 2 + 2.4, 1.6), p=5.0), CEDAR, "body", 0, 2)      # deck
    # a team band of painted shields round the deck
    _aspis(f, (W / 2 + 2.6, -4.0, H - 2.0), 4.6, lo=0, hi=1, face="x")
    _aspis(f, (2.0, -D / 2 - 2.0, H - 2.0), 4.6, lo=0, hi=1, face="y")
    f.add(Geo().blob((0, 0, H - 6.0), (W / 2 + 0.6, D / 2 + 0.6, 1.6), p=5.0), None, "body", 0, 3, team=True,
          outline=0.6)
    # the front parapet (drawn over the crew), crenellated, per crumble stage
    for st in range(4):
        g = Geo()
        merl = 4 if st < 2 else (3 if st == 2 else 2)
        g.blob((0.5, -D / 2 - 1.6, H + 7.6), (W / 2 + 2.0, 1.6, 2.6), p=5.0)
        g.blob((W / 2 + 1.6, 0.0, H + 7.6), (1.6, D / 2 + 2.0, 2.6), p=5.0)
        for k in range(merl):
            y = -D / 2 - 1.6
            x = -W / 2 + 2 + k * (W / max(1, merl - 1) - 1)
            g.blob((x, y, H + 12.0), (2.4, 1.6, 2.4), p=4.0)
        f.add(g, WHITE if st < 2 else WHITE_DK, "front", st, st)
    _rubble(f, (6.0, -4.0), (16.0, 14.0), 12, 120, (WHITE, WHITE_DK, LIME))
    scaffold(f, -W / 2 - 2, W / 2 + 2, -D / 2 - 2, D / 2 + 2, H + 6, wood=CEDAR, rope=ROPE, levels=3)


PYRGOS = make("pyrgos_tower", "Pyrgos Tower", AGE, "tower", _pyrgos, canvas=(260, 340), feet=(120, 306),
              height=104, hit=(0, 34), material="stone", flag=(-9.0, 6.0, 72.0, 20.0), foot=18.0,
              crew=dict(visualId="unit.javelineer", at=(0.0, -2.0, 62.0), scale=0.6), pole_fill=CEDAR_DK,
              tip_fill=P.BRONZE_HI)


# ====================================================================================== Muster Tents
def _tent(f, cx, cy, w, d, h, panel_team=True, stage=4):
    """A ridge tent of linen with a team side panel; `stage` = the crumble stage it collapses at."""
    def make_t(fallen):
        g = Geo()
        if fallen:
            g.blob((cx, cy, 2.4), (w * 0.6, d * 0.6, 2.4), p=2.4)
            return g, LINEN
        g.slab([(cx - w / 2, 0.0), (cx - 1.2, h - 0.6), (cx, h), (cx + 1.2, h - 0.6), (cx + w / 2, 0.0)], cy, d)
        return g, LINEN
    f.breakable(make_t, stage)
    if panel_team:
        def make_p(fallen):
            g = Geo()
            if fallen:
                return None, None
            g.slab([(cx - w / 2 * 0.86, 1.0), (cx, h * 0.62), (cx + w / 2 * 0.86, 1.0)], cy - d / 2 - 0.9, 1.0)
            return g, None
        f.breakable(make_p, stage, fall=False, outline=0.7)
    f.add(Geo().capsule((cx, cy - d / 2 - 1.0, 0), (cx, cy - d / 2 - 1.0, h + 3.0), 0.9), CEDAR_DK, "body", 0,
          min(3, stage - 1))


def _muster(f):
    f.add(Geo().blob((0, 0, 0.6), (30, 26, 1.8), p=3.0), EARTH, "body")
    _tent(f, -8.0, 6.0, 30.0, 22.0, 34.0, stage=3)
    _tent(f, 10.0, -6.0, 26.0, 20.0, 28.0, stage=2)
    # the door flap of the front tent (closed, half, open): the levy comes out of it
    for k, (w, ang) in enumerate(((7.0, 0.0), (6.0, 35.0), (5.0, 70.0))):
        g = Geo().blob((10.0 + 0.2 * k, -16.6 - 0.8 * k, 9.0), (w * 0.6, 1.2, 9.0), p=2.0, taper=(1.0, 0.4),
                       rot=(0, 0, -ang))
        f.add(g, None, "door", k, k, team=True, outline=0.7)
    f.add(Geo().blob((10.0, -15.4, 8.5), (5.4, 0.6, 8.6), p=2.0, taper=(1.0, 0.4)), "#3E3430", "body", 0, 2)
    # campfire with a stone ring (the light and the smoke come from here)
    g = Geo()
    for k in range(8):
        a = 2 * math.pi * k / 8
        rock(g, (24 + 4.6 * math.cos(a), -4 + 4.6 * math.sin(a), 1.2), (1.6, 1.6, 1.2), seed=140 + k, jag=0.08)
    f.add(g, LIME_DK, "body")
    f.add(Geo().capsule((21.5, -4.0, 1.2), (26.5, -4.0, 2.8), 0.9).capsule((24, -6.5, 1.2), (24, -1.5, 2.8), 0.9),
          CEDAR_DK, "body")
    f.add(Geo().blob((24.0, -4.0, 4.0), (2.2, 2.2, 3.2), p=1.8, taper=(1.0, 0.2)), FIRE, "body", 0, 1, glow=FIRE)
    # spear rack and a stack of shields by the tents (team)
    f.add(Geo().capsule((-24, -12, 0), (-24, -12, 20), 0.9).capsule((-18, -12, 0), (-18, -12, 20), 0.9)
          .capsule((-25, -12, 14), (-17, -12, 14), 0.7), CEDAR_DK, "body", 0, 2)
    for k in range(3):
        f.add(Geo().capsule((-23 + 2.4 * k, -13, 2), (-24 + 2.4 * k, -13, 30), 0.5), "#7A6A56", "body", 0, 2)
        f.add(Geo().lathe([(0, 0), (1.2, 0.3), (0, 3.0)], (-24 + 2.4 * k, -13, 30), (-24 + 2.4 * k, -13, 33.0),
                          segs=8), P.AGED, "body", 0, 2, finish="metal")
    _aspis(f, (-21.0, -15.0, 6.0), 5.2, lo=0, hi=2, face="y")
    _rubble(f, (0.0, 0.0), (22.0, 18.0), 10, 160, (LINEN, CEDAR, LIME_DK))
    scaffold(f, -22.0, 22.0, -16.0, 16.0, 30.0, wood=CEDAR, rope=ROPE, levels=1)


MUSTER = make("muster_tents", "Muster Tents", AGE, "camp", _muster, canvas=(340, 260), feet=(166, 226),
              height=76, hit=(0, 22), material="wood", flag=(-8.0, 6.0, 34.0, 18.0), foot=32.0,
              lights=[((24.0, -4.0, 6.0), 12, 1)], smoke=[((24.0, -4.0, 8.0), 0)], pole_fill=CEDAR_DK,
              tip_fill=P.BRONZE_HI, extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ====================================================================================== Hidden Stakes
def _stakes(f):
    # trap frames: 0 unarmed (stakes stacked by a rolled mat), 1 armed (a reed mat over the pit, a few
    # tips peek through), 2 sprung (the stakes snap up through the torn mat), 3 spent (broken stakes)
    f.add(Geo().blob((0, 0, 0.4), (16, 26, 1.2), p=3.0), EARTH, "trap", 0, 3)
    g = Geo()
    for k in range(5):                                                    # stacked stakes and a rolled mat
        g.capsule((-10 + 0.5 * k, -14 + 6 * k, 1.6 + (k % 2) * 1.6), (8 + 0.5 * k, -12 + 6 * k, 1.6 + (k % 2) * 1.6), 1.1)
    f.add(g, STAKE, "trap", 0, 0)
    f.add(Geo().capsule((-6, 14, 2.6), (8, 14, 2.6), 2.6), REED, "trap", 0, 0)
    mat = Geo().blob((0, 0, 1.6), (14, 22, 1.0), p=3.0)
    f.add(mat, REED, "trap", 1, 1)
    g = Geo()
    for k in range(6):                                                    # reed weave lines
        g.capsule((-12 + 4.8 * k, -21, 2.5), (-12 + 4.8 * k, 21, 2.5), 0.35)
    f.add(g, REED_DK, "trap", 1, 1, outline=0)
    g = Geo()
    for x, y in ((-6, -10), (2, 4), (8, -2)):                              # a few tips peek
        g.lathe([(0, 0), (0.9, 0.2), (0, 3.4)], (x, y, 1.8), (x, y, 5.2), segs=8)
    f.add(g, STAKE, "trap", 1, 1, outline=0.4)
    g = Geo()
    for k in range(9):                                                    # sprung: stakes up through the mat
        x = -10 + (k % 3) * 9 + (1.5 if k // 3 == 1 else 0)
        y = -16 + (k // 3) * 14
        lean = (k % 3 - 1) * 6
        g.capsule((x, y, 0), (x + lean * 0.3, y, 13.0), 1.2, 0.9)
        g.lathe([(0, 0), (1.0, 0.3), (0, 4.2)], (x + lean * 0.3, y, 13.0), (x + lean * 0.35, y, 17.0), segs=8)
    f.add(g, STAKE, "trap", 2, 2, outline=0.6)
    f.add(Geo().blob((-12, 0, 1.2), (3, 20, 0.8), p=2.4).blob((12, 0, 1.2), (3, 20, 0.8), p=2.4), REED, "trap", 2, 2)
    g = Geo()
    for k in range(7):                                                    # spent: snapped stakes, splinters
        x = -9 + (k % 3) * 8
        y = -14 + (k // 3) * 12
        g.capsule((x, y, 0), (x + 2, y + 1, 4.0 + (k % 2) * 2.0), 1.1, 0.8)
        g.capsule((x + 4, y - 2, 0.8), (x + 10, y + 1, 1.2), 0.8)
    f.add(g, "#B9A882", "trap", 3, 3, outline=0.5)
    # a small team pennant on a stick marks the trap for its owner (always visible, A16.14.3)
    g = Geo().capsule((-14, -20, 0), (-14, -20, 14), 0.6)
    f.add(g, CEDAR_DK, "trap", 0, 3)
    g = Geo().slab([(-14.0, 14.0), (-7.0, 12.0), (-14.0, 9.6)], -20.0, 0.9)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.6)


STAKES = make("hidden_stakes", "Hidden Stakes", AGE, "trap", _stakes, canvas=(300, 140), feet=(150, 104),
              height=22, hit=(0, 6), material="wood", foot=28.0)


# ====================================================================================== Hoplon Line (W2)
def _hoplon(f):
    f.add(Geo().blob((0, 0, 0.6), (14, 38, 2.0), p=3.0), EARTH, "body")
    # a low timber rack the shields lean on, two stout posts at the ends
    f.add(Geo().capsule((-4, -34, 0), (-4, -34, 34), 2.2).capsule((-4, 34, 0), (-4, 34, 34), 2.2), CEDAR_DK, "body", 0, 2)
    f.add(Geo().capsule((-5, -35, 30), (-5, 35, 30), 1.6), CEDAR, "body", 0, 1)
    # spears standing behind the shield wall (they fall with the rack)
    for k in range(7):
        y = -27 + 9 * k

        def make_spear(fallen, y=y, k=k):
            g = Geo()
            if fallen:
                g.capsule((10 + 2 * (k % 3), y, 1.2), (30 + 2 * (k % 3), y + 4, 1.2), 0.7)
                return g, "#7A6A56"
            g.capsule((-7, y, 0), (-7 + 1.6, y, 50), 0.7)
            g.lathe([(0, 0), (1.3, 0.4), (0, 4.4)], (-5.4, y, 50), (-5.2, y, 54.4), segs=8)
            return g, "#7A6A56"
        f.breakable(make_spear, 3 if k % 2 else 2)
    # the locked hoplons: overlapping team shields in a row, rims touching
    for k in range(6):
        y = -27.5 + 11 * k
        stage = f.stage_for(0.6, abs(y) / 30.0, keep=0.2)

        def make_shield(fallen, y=y, k=k):
            g = Geo()
            if fallen:
                g.blob((16 + 4 * (k % 2), y, 1.8), (9.5, 9.5, 1.6), p=2.0)
                return g, None
            g.blob((1.0, y, 16.0), (1.8, 9.6, 9.6), p=2.0, rot=(0, 8, 0))
            return g, None
        f.breakable(make_shield, stage, outline=0.8)

        def make_rim(fallen, y=y):
            g = Geo()
            if fallen:
                return None, None
            g.lathe([(8.6, -0.6), (9.9, -0.4), (9.9, 0.4), (8.6, 0.6)], (2.6, y, 16.0), (3.2, y, 16.0), segs=24)
            g.sphere((3.6, y, 16.0), 1.6, cuts=3)
            return g, P.AGED
        f.breakable(make_rim, stage, fall=False, finish="metal", outline=0.5)
    # a sandstone lambda on the middle shields
    for y in (-5.5, 5.5):
        g = Geo()
        g.capsule((3.8, y - 4.0, 11.6), (3.8, y, 20.0), 0.9).capsule((3.8, y, 20.0), (3.8, y + 4.0, 11.6), 0.9)
        f.add(g, P.SAND_LT, "body", 0, 1, outline=0.3)
    _rubble(f, (6.0, 0.0), (16.0, 26.0), 10, 210, (CEDAR, CEDAR_DK, "#7A6A56"))
    scaffold(f, -8.0, 4.0, -34.0, 34.0, 36.0, wood=CEDAR, rope=ROPE, levels=1)


HOPLON = make("hoplon_line", "Hoplon Line", AGE, "wall", _hoplon, canvas=(300, 260), feet=(146, 230),
              height=58, hit=(2, 20), material="wood", flag=(-6.0, 34.0, 34.0, 18.0), foot=28.0,
              pole_fill=CEDAR_DK, tip_fill=P.BRONZE_HI)


# ====================================================================================== Slinger Camp (W2)
def _slinger(f):
    rnd = f.rnd
    f.add(Geo().blob((0, 0, 0.6), (28, 24, 1.8), p=3.0), EARTH, "body")
    # a round dry-stone sheepfold, its top stones fall first
    for ring in range(4):
        z = 3.4 + ring * 5.6
        n = 12
        for k in range(n):
            a = 2 * math.pi * (k + 0.5 * (ring % 2)) / n
            if -0.25 < math.cos(a) and math.sin(a) < -0.85:      # the doorway gap toward the camera
                continue
            x, y = 15 * math.cos(a), 13 * math.sin(a)
            stage = f.stage_for((ring + 1) / 4, abs(math.cos(a)) * 0.5)

            def make_s(fallen, x=x, y=y, z=z, k=k, ring=ring, a=a):
                g = Geo()
                if fallen:
                    rock(g, (x * 1.4 + 6, y * 1.3, 2.0), (3.0, 2.6, 2.0), seed=300 + ring * 20 + k, jag=0.1, p=3.2)
                else:
                    rock(g, (x, y, z), (3.6, 3.0, 2.9), seed=250 + ring * 20 + k, jag=0.08, p=3.4,
                         rot=(0, 0, math.degrees(a)))
                return g, (LIME, LIME_DK, EARTH)[(k + ring) % 3]
            f.breakable(make_s, stage)
    # a team awning on two poles over the back of the fold
    f.add(Geo().capsule((-12, -6, 0), (-12, -6, 30), 1.0).capsule((-12, 10, 0), (-12, 10, 30), 1.0), CEDAR_DK, "body", 0, 2)
    f.add(Geo().blob((-6, 2, 29.0), (9.0, 11.0, 1.4), p=3.0, rot=(0, -14, 0)), None, "body", 0, 1, team=True,
          outline=0.8)
    # a heap of sling stones and a sling hung on the post; a straw target post at the side
    g = Geo()
    for k in range(9):
        a = 2 * math.pi * k / 9
        g.sphere((-4 + 3.2 * math.cos(a) * (k % 3) / 2, 4 + 3.2 * math.sin(a) * (k % 3) / 2, 1.6 + (k % 3) * 0.8), 1.4,
                 cuts=2)
    f.add(g, "#B7AFA0", "body", 0, 2, finish="metal")
    f.add(Geo().capsule((-12.4, -7.2, 26), (-12.4, -7.2, 18), 0.4).blob((-12.4, -7.6, 17.2), (1.6, 0.8, 1.2), p=2.2),
          P.LEATHER, "body", 0, 1)
    f.add(Geo().capsule((22, 10, 0), (22, 10, 22), 1.0), CEDAR_DK, "body", 0, 2)
    f.add(Geo().blob((22.4, 10, 20.0), (2.8, 5.6, 5.6), p=2.0), REED, "body", 0, 2)
    f.add(Geo().blob((24.8, 10, 20.0), (0.6, 2.4, 2.4), p=2.0), None, "body", 0, 2, team=True, outline=0.4)
    # the door: a hurdle gate of woven withies in the gap (closed, half, open)
    for k, ang in enumerate((0.0, 40.0, 80.0)):
        g = Geo().blob((4.0 - 2.0 * k, -13.6 - 1.6 * k, 7.0), (5.6, 1.0, 7.0), p=3.0, rot=(0, 0, -ang))
        f.add(g, REED_DK, "door", k, k, outline=0.6)
        g = Geo().blob((4.0 - 2.0 * k, -14.4 - 1.6 * k, 10.0), (5.0, 0.6, 1.4), p=3.0, rot=(0, 0, -ang))
        f.add(g, None, "door", k, k, team=True, outline=0.5)
    _rubble(f, (4.0, 0.0), (20.0, 16.0), 12, 340, (LIME, LIME_DK, EARTH))
    scaffold(f, -16.0, 16.0, -14.0, 14.0, 26.0, wood=CEDAR, rope=ROPE, levels=1)


SLINGER = make("slinger_camp", "Slinger Camp", AGE, "camp", _slinger, canvas=(320, 240), feet=(156, 210),
               height=60, hit=(0, 18), material="stone", flag=(-12.0, 10.0, 30.0, 16.0), foot=32.0,
               pole_fill=CEDAR_DK, tip_fill=P.BRONZE_HI, extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


FORTS = [CYCLOPEAN, PYRGOS, MUSTER, STAKES, HOPLON, SLINGER]
