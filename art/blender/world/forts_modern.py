"""Modern forts in the cartoon style (DESIGN A16.14.4; the MVP release check flagged the realistic ones;
CONTENT_PLAN 5.6 adds the Rifle Depot and the Wire Snare).

Built with `world/fort_toon.py` (the cartoon unit look, the fort sheet contract of
`src/visuals/fortViews/atlasFortView.ts`). Heights, hit points, flag points and the Pillbox muzzle follow the
realistic forts they replace, so placement in the game lines up unchanged. Palette: the Modern turrets'
sandbag khaki, concrete, corrugated iron, olive canvas and gunmetal (under 40% saturation, A11 colour rule);
team colour on tarps, painted bands and plates, each with a cream chevron (the Modern emblem on the turret
shields).

  sandbag_bunker  wall   a curved breastwork of plump sandbags on a timber frame, a team tarp over the roof
                         beam, a firing slit and a corrugated sheet
  pillbox         tower  (crewless) a squat hexagonal concrete pillbox with a team band, a firing slit with a
                         machine-gun barrel (the muzzle), sandbags round the base and a periscope
  forward_base    camp   a corrugated half-round hut with an olive canvas porch, a team panel, a radio mast
                         and jerrycans; the hut door swings open
  minefield       trap   flat mines dug into the lane, team marker tape on stakes and a skull-free warning
                         sign (a cream chevron)
  rifle_depot     camp   (W2 ranged camp) an olive bell tent with a team awning, a rifle rack and ammo crates;
                         the tent flap opens for the Rifle Levy
  wire_snare      trap   a concertina wire coil on iron pickets that is drawn taut across the lane when armed

Run: `<venv>/bin/python art/blender/world/render_forts.py --age modern --out <scratch> [--only a,b] [--install]`.
"""
import math

from ageborn_art.geometry import Geo

from world.common import rock
from world.fort_toon import make, scaffold

AGE = "modern"
KHAKI = "#B9AC88"
KHAKI_LT = "#C9BD9A"
KHAKI_DK = "#968A6A"
CONCRETE = "#A6A39A"
CONCRETE_LT = "#BAB7AE"
CONCRETE_DK = "#86837B"
CORR = "#767A74"
CORR_LT = "#8E928B"
OLIVE = "#6E7250"
OLIVE_LT = "#82865F"
OLIVE_DK = "#585B40"
GUNMETAL = "#4A4E54"
GUNMETAL_DK = "#35383D"
TIMBER = "#8A7460"
TIMBER_DK = "#66574A"
EARTH = "#8C7D68"
EARTH_DK = "#6F6352"
CREAM = "#E8E0CC"
COAL = "#2C2C30"
WIRE = "#5E5D5B"
SCORCH = "#4A433B"
FIRE = "#FFE3B0"
LAMP = "#F6EFC8"


def _chevron(f, x, y, z, s, fam="body", lo=0, hi=1, rot=(0, 0, 0)):
    """A cream chevron (two stacked up-pointing bars) on a team surface facing -y."""
    g = Geo()
    for k in range(2):
        zz = z + k * 2.0 * s
        g.slab([(x - 3.0 * s, zz - 1.0 * s), (x, zz + 1.6 * s), (x + 3.0 * s, zz - 1.0 * s), (x + 3.0 * s, zz + 0.2 * s),
                (x, zz + 2.8 * s), (x - 3.0 * s, zz + 0.2 * s)], y, 0.5, rot=rot)
    f.add(g, CREAM, fam, lo, hi, outline=0.15)


def _chevron_x(f, y, z, s, x, fam="body", lo=0, hi=1):
    """The same chevron on a surface facing +x (the lane side): a capsule pair in the y-z plane."""
    g = Geo()
    for k in range(2):
        zz = z + k * 2.0 * s
        g.capsule((x, y - 2.8 * s, zz - 0.6 * s), (x, y, zz + 1.6 * s), 0.55 * s)
        g.capsule((x, y, zz + 1.6 * s), (x, y + 2.8 * s, zz - 0.6 * s), 0.55 * s)
    f.add(g, CREAM, fam, lo, hi, outline=0.15)


def _sandbag(g, x, y, z, ln=9.0, ang=0.0, w=3.0, h=2.0):
    """One plump sandbag (a pillow blob) along `ang` degrees in the ground plane."""
    g.blob((x, y, z), (ln * 0.5, w, h), p=2.6, rot=(0, 0, ang))
    return g


def _ties(g, x, y, z, ang=0.0):
    """The tie string across a sandbag's end."""
    a = math.radians(ang)
    dx, dy = math.cos(a) * 3.2, math.sin(a) * 3.2
    g.capsule((x + dx - 0.2, y + dy - 1.8, z + 1.4), (x + dx + 0.2, y + dy + 1.8, z + 1.4), 0.3)
    return g


def _wire(f, pts, lo, hi, fam="body", r=0.3, fill=WIRE):
    """Barbed wire: a loose zigzag of thin strands with little barbs."""
    g = Geo()
    for (a, b) in zip(pts, pts[1:]):
        g.capsule(a, b, r)
        mx, my, mz = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
        g.capsule((mx - 0.5, my, mz - 0.8), (mx + 0.5, my, mz + 0.8), r * 0.7)
    f.add(g, fill, fam, lo, hi, outline=0.15)


def _coil(f, x0, x1, y, z, r, turns, lo, hi, fam="body", ax="y", wire_r=0.28):
    """A concertina coil: a helix of wire loops along y (or x) from x0 to x1 (centre height z)."""
    g = Geo()
    n = turns * 10
    pts = []
    for k in range(n + 1):
        t = k / n
        a = 2 * math.pi * turns * t
        u = x0 + (x1 - x0) * t
        if ax == "y":
            pts.append((y + r * math.cos(a), u, z + r * math.sin(a)))
        else:
            pts.append((u, y + r * math.cos(a), z + r * math.sin(a)))
    for (a, b) in zip(pts, pts[1:]):
        g.capsule(a, b, wire_r)
    for k in range(0, n, 3):
        a, b = pts[k], pts[k + 1]
        g.capsule((a[0] - 0.5, a[1], a[2] - 0.6), (a[0] + 0.5, a[1], a[2] + 0.6), wire_r * 0.7)
    f.add(g, WIRE, fam, lo, hi, outline=0.06)


# ============================================================================== Sandbag Bunker (wall)
def _sandbag_bunker(f):
    f.add(Geo().blob((-4, 0, 0), (19, 44, 5.0), p=2.4), EARTH, "body", 0, 3)                # the dug-in bank
    f.add(Geo().blob((-4, 0, 0), (22, 46, 4.2), p=2.4), EARTH, "rubble")
    # five courses of sandbags in a shallow arc bowed toward the lane; the top courses fall first
    courses = [(2.2, 4), (6.4, 4), (10.6, 3), (14.8, 3), (19.0, 2), (23.2, 2), (27.4, 1)]
    for ci, (z, st) in enumerate(courses):
        def make_(fallen, z=z, ci=ci):
            g = Geo()
            n = 8
            for k in range(n):
                y = -35.0 + (k + (0.5 if ci % 2 else 0.0)) * (70.0 / n)
                if y > 36:
                    continue
                bow = 4.0 * math.cos(math.pi * y / 80.0)
                if not fallen:
                    _sandbag(g, 2.0 + bow - ci * 0.5, y, z, ang=-6.0 * y / 35.0)
                elif k % 2 == 0:
                    _sandbag(g, 14.0 + bow + (k % 3) * 3.0, y + 2.0, 2.0 + (k % 2) * 1.2, ang=k * 41)
            return g, KHAKI if ci % 2 else KHAKI_LT
        f.breakable(make_, st)
    # tie strings on the near face of the lower courses
    g = Geo()
    for ci, (z, _st) in enumerate(courses[:4]):
        for k in range(8):
            y = -35.0 + (k + (0.5 if ci % 2 else 0.0)) * (70.0 / 8)
            if y > 36:
                continue
            bow = 4.0 * math.cos(math.pi * y / 80.0)
            g.capsule((2.0 + bow - ci * 0.5 + 4.2, y - 1.8, z + 0.4), (2.0 + bow - ci * 0.5 + 4.2, y + 1.8, z + 0.4), 0.3)
    f.add(g, KHAKI_DK, "body", 0, 2, outline=0.12)
    # the timber frame behind the bags: posts and a roof beam, the team tarp draped over it
    g = Geo()
    for y in (-30.0, -10.0, 10.0, 30.0):
        g.capsule((-6.0, y, 0.0), (-6.0, y, 36.0), 1.4)
    g.capsule((-6.0, -36.0, 36.0), (-6.0, 36.0, 36.0), 1.6)
    f.add(g, TIMBER_DK, "body", 0, 1, outline=0.4)
    g = Geo()
    for y in (-30.0, 10.0):
        g.capsule((-6.0, y, 0.0), (-6.0, y, 24.0), 1.4)
    f.add(g, TIMBER_DK, "body", 2, 2, outline=0.4)                                          # 33%: stumps
    for st, (z, sag, ext) in enumerate(((36.0, 0.0, 34.0), (35.0, 1.6, 30.0), (24.0, 3.0, 18.0))):
        g = Geo().blob((-3.0, -4.0 if st == 2 else 0.0, z + 1.0 - sag), (9.0, ext, 1.2), p=3.0, rot=(0, -14 - st * 6, 0))
        f.add(g, None, "body", st, st, team=True, outline=0.45)
        g = Geo()
        for k in range(5):
            yy = -ext + (k + 0.5) * (2 * ext / 5)
            g.capsule((3.0, yy, z - 2.0 - sag), (5.2, yy, z - 6.0 - sag + (k % 2)), 0.6)       # tarp tie ropes
        f.add(g, KHAKI_DK, "body", st, st, outline=0.15)
    _chevron_x(f, -2.0, 33.6, 1.2, 4.4, lo=0, hi=0)
    # a corrugated sheet propped against the bags (grey) and a team-painted ammo box with a chevron
    g = Geo()
    for k in range(5):
        g.blob((12.0, -26.0 + k * 3.0, 9.0), (0.9, 1.8, 8.0), p=2.2, rot=(0, -18, 0))
    f.add(g, CORR_LT, "body", 0, 2, outline=0.35, finish="metal")
    f.add(Geo().blob((14.0, 18.0, 3.0), (3.6, 5.0, 3.0), p=5.0), OLIVE, "body", 0, 2, outline=0.4)
    f.add(Geo().blob((14.0, 18.0, 4.6), (3.8, 5.2, 0.9), p=4.0), None, "body", 0, 2, team=True, outline=0.3)
    # the firing slit (dark gap with a gunmetal lip) between the third and fourth courses
    f.add(Geo().blob((7.6, 6.0, 15.4), (1.0, 7.0, 1.4), p=4.0), COAL, "body", 0, 1, outline=0)
    f.add(Geo().capsule((8.0, -1.0, 13.8), (8.0, 13.0, 13.8), 0.6), GUNMETAL, "body", 0, 1, finish="metal", outline=0.2)
    # barbed wire on pickets in front
    g = Geo()
    for y in (-30.0, -8.0, 14.0, 34.0):
        g.capsule((24.0, y, 0), (24.0, y, 11.0), 0.6)
    f.add(g, GUNMETAL_DK, "body", 0, 2, outline=0.3, finish="metal")
    _wire(f, [(24.0, -34.0 + k * 8.6, 6.5 + (2.0 if k % 2 else -1.2)) for k in range(9)], 0, 1)
    # rubble: bags, the beam, the tarp
    g = Geo()
    for k in range(12):
        _sandbag(g, -8 + (k * 7) % 28, -34 + k * 6.0, 2.0 + (k % 2) * 1.4, ang=k * 37)
    f.add(g, KHAKI, "rubble")
    f.add(Geo().capsule((-10, -30, 1.4), (12, 26, 1.4), 1.5), TIMBER_DK, "rubble")
    f.add(Geo().blob((8, -6, 1.2), (11, 8, 0.9), p=3.0, rot=(0, 0, 24)), None, "rubble", team=True)
    scaffold(f, -12, 10, -40, 40, 42)


SANDBAG_BUNKER = make("sandbag_bunker", "Sandbag Bunker", AGE, "wall", _sandbag_bunker, canvas=(300, 250),
                      feet=(150, 218), height=78, hit=(3, 20), material="stone", flag=(-12.0, 0.0, 0.0, 72.0),
                      flag_len=22.0, foot=28.0, yaw=-38.0, pole_fill=GUNMETAL_DK, tip_fill=CREAM)


# ================================================================================= Pillbox (crewless tower)
PB_R = 15.0
PB_H = 18.0
PB_MUZ = (18.5, 0.0, 19.0)


def _hex(r, z0, z1, rot=0.0):
    """A hexagonal prism as a 6-segment lathe (flat-sided)."""
    return Geo().lathe([(r, 0), (r, z1 - z0), (0, z1 - z0)], (0, 0, z0), (0, 0, z1), segs=6, rot=(0, 0, rot))


def _pillbox(f):
    f.add(Geo().blob((0, 0, 0), (24, 22, 3.0), p=2.4), EARTH, "body", 0, 3)
    # the concrete walls (break from the top: full, chipped, cracked half, a stump)
    for st, h in enumerate((PB_H, PB_H, PB_H * 0.62, PB_H * 0.3)):
        f.add(_hex(PB_R, 0.0, h, rot=30), CONCRETE, "body", st, st, outline=0.55)
    # a slightly smaller roof slab overhang (intact and 66%), sunk and tilted at 33%
    f.add(Geo().lathe([(PB_R + 1.6, 0), (PB_R + 1.6, 2.6), (PB_R - 1.0, 4.4), (0, 4.4)], (0, 0, PB_H), (0, 0, PB_H + 4.4),
                      segs=6, rot=(0, 0, 30)), CONCRETE_LT, "body", 0, 1, outline=0.5)
    f.add(Geo().lathe([(PB_R * 0.7, 0), (PB_R * 0.7, 2.2), (0, 2.6)], (3, 0, PB_H * 0.62), (3, 0, PB_H * 0.62 + 2.6),
                      segs=6, rot=(10, 8, 30)), CONCRETE_LT, "body", 2, 2, outline=0.5)
    # chips and cracks at 66%
    g = Geo()
    for k, (y, z) in enumerate(((-8.0, PB_H + 2.0), (6.0, PB_H + 3.4), (-12.0, 8.0))):
        rock(g, (PB_R * 0.9, y, z), (2.2, 1.8, 1.4), seed=30 + k, jag=0.3)
    f.add(g, CONCRETE_DK, "body", 1, 2)
    g = Geo()
    g.capsule((PB_R * 0.87 + 0.3, -5.0, 16.0), (PB_R * 0.87 + 0.3, -2.0, 9.0), 0.35)
    g.capsule((PB_R * 0.87 + 0.3, -2.0, 9.0), (PB_R * 0.87 + 0.3, -6.0, 4.0), 0.35)
    f.add(g, COAL, "body", 1, 2, outline=0)
    # the team band round the walls with cream chevrons (front and lane side)
    for st, z in enumerate((PB_H - 6.4, PB_H - 6.4, PB_H * 0.62 - 4.0)):
        g = Geo().lathe([(PB_R + 0.45, -1.8), (PB_R + 0.45, 1.8)], (0, 0, z), (0, 0, z + 0.01), segs=6, rot=(0, 0, 30))
        f.add(g, None, "body", st, st, team=True, outline=0.3)
    _chevron(f, -2.0, -PB_R * 0.87 - 0.9, PB_H - 8.2, 0.9, lo=0, hi=1)
    # the firing slit and the machine-gun barrel (the muzzle) on the lane side
    f.add(Geo().blob((PB_R * 0.87 + 0.4, 0, PB_MUZ[2]), (0.8, 6.0, 1.4), p=4.0), COAL, "body", 0, 1, outline=0)
    g = Geo().capsule((PB_R * 0.87 - 1.0, 0, PB_MUZ[2]), (PB_MUZ[0] + 2.0, 0, PB_MUZ[2]), 0.9)
    g.lathe([(1.4, -0.8), (1.5, 0), (1.4, 0.8)], (PB_MUZ[0] + 1.0, 0, PB_MUZ[2]), (PB_MUZ[0] + 2.4, 0, PB_MUZ[2]), segs=12)
    f.add(g, GUNMETAL, "body", 0, 1, finish="metal", outline=0.35)
    # a periscope and a vent on the roof
    g = Geo().capsule((-5.0, 4.0, PB_H + 4.0), (-5.0, 4.0, PB_H + 10.0), 0.9)
    g.blob((-4.0, 4.0, PB_H + 10.4), (1.8, 1.2, 1.2), p=4.0)
    f.add(g, GUNMETAL_DK, "body", 0, 0, finish="metal", outline=0.35)
    f.add(Geo().blob((-3.0, 4.0, PB_H + 10.4), (0.4, 0.9, 0.7), p=2.0), None, "body", 0, 0, glow=LAMP, outline=0)
    f.add(Geo().lathe([(2.0, 0), (2.0, 2.0), (2.8, 2.4), (0, 3.0)], (5.0, -5.0, PB_H + 4.0), (5.0, -5.0, PB_H + 7.0),
                      segs=12), CONCRETE_DK, "body", 0, 1, outline=0.35)
    # sandbags round the base (front and lane side), a steel door at the back
    g = Geo()
    for k in range(9):
        a = math.radians(-150 + k * 22)
        x, y = math.cos(a) * (PB_R + 4.0), math.sin(a) * (PB_R + 4.0)
        _sandbag(g, x, y, 2.0, ln=8.0, ang=math.degrees(a) + 90)
        if k % 2 == 0:
            _sandbag(g, x * 0.98, y * 0.98, 5.4, ln=7.4, ang=math.degrees(a) + 90)
    f.add(g, KHAKI, "body", 0, 3)
    f.add(Geo().blob((-PB_R * 0.87 - 0.3, 4.0, 6.4), (0.6, 4.0, 6.4), p=4.0), GUNMETAL, "body", 0, 1, finish="metal",
          outline=0.35)
    # rubble: concrete blocks, the band, the barrel
    g = Geo()
    for k in range(9):
        rock(g, (-14 + (k * 7) % 30, -12 + (k * 5) % 24, 2.0 + (k % 3) * 0.8), (3.4, 2.8, 2.0), seed=40 + k, jag=0.25)
    f.add(g, CONCRETE, "rubble")
    f.add(Geo().capsule((6, -10, 1.2), (20, -4, 1.2), 0.9), GUNMETAL, "rubble", finish="metal")
    f.add(Geo().blob((-4, 10, 1.0), (8, 3, 0.7), p=4.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -18, 18, -18, 18, PB_H + 6, levels=1)


PILLBOX = make("pillbox", "Pillbox", AGE, "tower", _pillbox, canvas=(240, 200), feet=(118, 168), height=48,
               hit=(0, 16), material="stone", flag=(-8.0, 8.0, PB_H + 4.4, 30.0), flag_len=14.0, foot=18.0, yaw=-14.0,
               muzzle=PB_MUZ, lights=[((-3.0, 4.0, PB_H + 10.4), 6, 1)], pole_fill=GUNMETAL_DK, tip_fill=CREAM)


# ============================================================================ Forward Base (camp)
HUT_L, HUT_R = 22.0, 14.0


def _forward_base(f):
    f.add(Geo().blob((0, 0, 0), (34, 26, 1.0), p=3.0), EARTH, "body", 0, 3, outline=0)
    # the corrugated half-round hut along x (a squashed lathe), breaking from the top
    for st, (k, tilt) in enumerate(((1.0, 0), (1.0, 0), (0.62, 6), (0.32, 10))):
        g = Geo().capsule((-HUT_L, 0, 0), (HUT_L, 0, 0), HUT_R, segs=20)
        g.clip((0, 0, 0.2), (0, 0, -1)).clip((HUT_L, 0, 0), (1, 0, 0)).clip((-HUT_L, 0, 0), (-1, 0, 0))
        if k < 1.0:
            g.clip((0, 0, HUT_R * k), (0, 0, 1))
        f.add(g, CORR, "body", st, st, outline=0.55, finish="metal")
        # corrugation ribs over the shell
        g = Geo()
        for i in range(9):
            x = -HUT_L + 2.0 + i * (2 * HUT_L - 4.0) / 8
            g.lathe([(HUT_R + 0.3, -0.5), (HUT_R + 0.6, 0), (HUT_R + 0.3, 0.5)], (x, 0, 0), (x + 0.01, 0, 0), segs=20)
        g.clip((0, 0, 0.2), (0, 0, -1))
        if k < 1.0:
            g.clip((0, 0, HUT_R * k), (0, 0, 1))
        f.add(g, CORR_LT, "body", st, st, outline=0.2, finish="metal")
    # the gable end on the lane side (+x): plank wall, the doorway, a team panel with a chevron
    f.add(Geo().blob((HUT_L + 0.2, 0, HUT_R * 0.5), (0.9, HUT_R - 0.6, HUT_R * 0.5), p=2.0), TIMBER, "body", 0, 2,
          outline=0.45)
    f.add(Geo().blob((HUT_L + 0.8, -4.0, 6.4), (0.6, 4.4, 6.4), p=4.0), COAL, "body", 0, 3, outline=0)       # doorway
    f.add(Geo().blob((HUT_L + 1.2, 6.4, 8.4), (0.6, 4.4, 4.6), p=4.0), None, "body", 0, 1, team=True, outline=0.35)
    _chevron_x(f, 6.4, 7.0, 1.0, HUT_L + 1.9, lo=0, hi=1)
    # the olive canvas porch over the door, on two poles
    g = Geo().blob((HUT_L + 7.0, -2.0, 14.4), (7.0, 10.0, 0.8), p=3.0, rot=(0, 14, 0))
    f.add(g, None, "body", 0, 1, team=True, outline=0.45)
    # a team-painted panel on the near side of the shell with a cream chevron (stays to 33%)
    g = Geo().capsule((-12.0, 0, 0), (2.0, 0, 0), HUT_R + 0.5, segs=20)
    g.clip((0, 0, 3.0), (0, 0, -1)).clip((0, 0, 9.0), (0, 0, 1)).clip((0, -4.0, 0), (0, 1, 0))
    g.clip((2.0, 0, 0), (1, 0, 0)).clip((-12.0, 0, 0), (-1, 0, 0))
    f.add(g, None, "body", 0, 2, team=True, outline=0.35)
    _chevron(f, -5.0, -HUT_R - 0.9, 4.6, 0.8, lo=0, hi=1)
    g = Geo()
    for y in (-11.0, 7.0):
        g.capsule((HUT_L + 12.6, y, 0), (HUT_L + 12.6, y, 13.0), 0.6)
    f.add(g, TIMBER_DK, "body", 0, 1, outline=0.3)
    # the door (door family: closed, half open, open), hinged on the far jamb
    for i, ang in enumerate((0.0, 45.0, 85.0)):
        a = math.radians(ang)
        hy = -8.4
        cy, cx = hy + 4.4 * math.cos(a), HUT_L + 1.0 + 4.4 * math.sin(a)
        f.add(Geo().blob((cx, cy, 6.4), (0.6, 4.4, 6.4), p=4.0, rot=(0, 0, ang)), OLIVE_DK, "door", i, i, outline=0.4)
        f.add(Geo().blob((cx + 0.6 * math.cos(a), cy, 7.0), (0.3, 0.8, 0.8), p=2.0), GUNMETAL, "door", i, i, outline=0)
    # a window with a lit lamp on the near side, sandbag walls round the front, jerrycans
    f.add(Geo().blob((4.0, -HUT_R + 1.2, 9.0), (3.2, 0.8, 2.6), p=4.0, rot=(18, 0, 0)), None, "body", 0, 1, glow=LAMP,
          outline=0.45)
    g = Geo()
    for k in range(6):
        _sandbag(g, -16.0 + k * 6.6, -HUT_R - 4.0, 2.0, ln=7.0)
        if k % 2:
            _sandbag(g, -13.0 + k * 6.6, -HUT_R - 4.0, 5.4, ln=7.0)
    f.add(g, KHAKI, "body", 0, 3)
    g = Geo()
    for k in range(3):
        g.blob((HUT_L + 6.0, 10.0 + k * 3.6, 3.4), (1.6, 1.2, 3.4), p=5.0)
    f.add(g, OLIVE_DK, "body", 0, 2, outline=0.35)
    # the radio mast (the team pennant on top is the fort flag) with guy wires
    g = Geo().capsule((-14.0, 6.0, HUT_R - 2.0), (-14.0, 6.0, HUT_R + 30.0), 0.6)
    g.capsule((-16.0, 6.0, HUT_R + 24.0), (-12.0, 6.0, HUT_R + 24.0), 0.4)
    f.add(g, GUNMETAL, "body", 0, 1, finish="metal", outline=0.2)
    f.add(Geo().blob((-14.0, 6.0, HUT_R + 30.6), (1.0, 1.0, 1.0), p=2.0), None, "body", 0, 1, glow="#FFD2B0", outline=0.3)
    # rubble: corrugated sheets, the panel, planks
    g = Geo()
    for k in range(5):
        g.blob((-18 + k * 9.0, -10 + (k % 2) * 14, 1.2), (6.0, 4.0, 0.8), p=3.0, rot=(0, 0, k * 33))
    f.add(g, CORR, "rubble", finish="metal")
    g = Geo()
    for k in range(4):
        g.blob((-6 + k * 6.0, 4 + (k % 2) * 6, 1.6), (6.0, 1.4, 1.0), p=4.0, rot=(0, 0, k * 47))
    f.add(g, TIMBER_DK, "rubble")
    f.add(Geo().blob((14, -4, 1.2), (6, 5, 0.8), p=4.0, rot=(0, 0, 14)), None, "rubble", team=True)
    scaffold(f, -HUT_L - 3, HUT_L + 3, -HUT_R - 3, HUT_R + 3, HUT_R + 6, levels=1)


FORWARD_BASE = make("forward_base", "Forward Base", AGE, "camp", _forward_base, canvas=(300, 250), feet=(150, 214),
                    height=80, hit=(0, 14), material="metal", flag=(-14.0, 6.0, HUT_R + 30.0, 14.0), flag_len=16.0,
                    foot=30.0, yaw=-24.0, lights=[((4.0, -HUT_R + 1.2, 9.0), 8, 1)], pole_fill=GUNMETAL_DK,
                    tip_fill=CREAM, extra_meta={"flag": {"crumbleMax": 1, "z": "front"}})


# ================================================================================ Minefield (trap)
MINES = [(-12.0, -6.0), (2.0, 4.0), (14.0, -4.0), (-2.0, -12.0)]


def _mine(g, x, y, z):
    g.lathe([(0, 0), (3.6, 0), (3.8, 0.8), (3.0, 1.6), (0, 1.8)], (x, y, z), (x, y, z + 1.8), segs=18)
    return g


def _minefield(f):
    f.add(Geo().blob((0, 0, 0.3), (22, 14, 0.7), p=2.4), EARTH, "trap", 0, 3, outline=0)
    # unarmed: the mines stacked in a crate, not yet laid
    f.add(Geo().blob((-6.0, 6.0, 3.0), (5.0, 4.0, 3.0), p=5.0), OLIVE, "trap", 0, 0, outline=0.4)
    g = Geo()
    for k in range(2):
        _mine(g, -6.0 + (k - 0.5) * 4.0, 6.0, 6.0)
    f.add(g, GUNMETAL, "trap", 0, 0, finish="metal", outline=0.35)
    f.add(Geo().blob((-6.0, 1.8, 3.4), (5.2, 0.4, 1.0), p=4.0), None, "trap", 0, 0, team=True, outline=0.25)
    # armed: dug-in discs with little prongs, dirt rings
    g = Geo()
    for (x, y) in MINES:
        g.blob((x, y, 0.7), (5.2, 4.4, 0.8), p=2.4)
    f.add(g, EARTH_DK, "trap", 1, 1, outline=0)
    g = Geo()
    for (x, y) in MINES:
        _mine(g, x, y, -0.6)
    f.add(g, GUNMETAL, "trap", 1, 1, finish="metal", outline=0.35)
    g = Geo()
    for (x, y) in MINES:
        g.capsule((x, y, 1.0), (x, y, 2.4), 0.4)
    f.add(g, CREAM, "trap", 1, 1, outline=0.12)
    # sprung: a fireball and flung earth; spent: a scorched crater
    f.add(Geo().blob((0, 0, 0.5), (16, 10, 0.7), p=2.4), SCORCH, "trap", 2, 3, outline=0)
    f.add(Geo().blob((0, -2, 6.0), (8.0, 6.0, 6.0), p=2.0), None, "trap", 2, 2, glow=FIRE, outline=0.4)
    g = Geo()
    for k in range(8):
        a = k * 2 * math.pi / 8
        rock(g, (math.cos(a) * 12.0, math.sin(a) * 8.0, 3.0 + (k % 3) * 2.4), (2.0, 1.6, 1.4), seed=80 + k, jag=0.25)
    f.add(g, EARTH_DK, "trap", 2, 2)
    g = Geo()
    for k in range(7):
        a = k * 2 * math.pi / 7 + 0.4
        rock(g, (math.cos(a) * 15.0, math.sin(a) * 9.0, 1.0), (2.2, 1.6, 1.0), seed=90 + k, jag=0.2)
    f.add(g, EARTH_DK, "trap", 3, 3)
    # marker stakes with team tape (every frame) and a warning plate with a cream chevron
    g = Geo()
    for (x, y) in ((-22.0, 10.0), (20.0, 10.0)):
        g.capsule((x, y, 0), (x, y, 12.0), 0.6)
    f.add(g, TIMBER_DK, "trap", 0, 3, outline=0.15)
    g = Geo().blob((-1.0, 10.0, 9.2), (21.0, 0.3, 0.9), p=4.0)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.12)
    f.add(Geo().blob((-22.0, 9.0, 13.6), (3.6, 0.5, 2.8), p=4.0), None, "trap", 0, 3, team=True, outline=0.4)
    _chevron(f, -22.0, 8.3, 12.6, 0.7, fam="trap", lo=0, hi=3)


MINEFIELD = make("minefield", "Minefield", AGE, "trap", _minefield, canvas=(200, 120), feet=(100, 92), height=24,
                 hit=(0, 6), material="metal", foot=28.0, yaw=-12.0)


# ============================================================================ Rifle Depot (W2 ranged camp)
def _rifle(g, x, y, z0, lean):
    """A rifle stood on its butt (stock blob, barrel capsule)."""
    a = math.radians(lean)
    top = (x + math.sin(a) * 20.0, y, z0 + math.cos(a) * 20.0)
    g.capsule((x, y, z0 + 1.0), (x + math.sin(a) * 7.0, y, z0 + math.cos(a) * 7.0), 1.2, 0.9)
    g.capsule((x + math.sin(a) * 7.0, y, z0 + math.cos(a) * 7.0), top, 0.5)
    return g


def _rifle_depot(f):
    f.add(Geo().blob((0, 0, 0), (32, 24, 1.0), p=3.0), EARTH, "body", 0, 3, outline=0)
    # the olive bell tent: a cone on a short wall, losing its top as it breaks
    for st, (h, lean) in enumerate(((34.0, 0), (30.0, 4), (20.0, 10), (9.0, 0))):
        g = Geo().lathe([(18.0, 0), (17.6, 5.0), (8.0, h * 0.62), (1.2, h - 1.0), (0, h)], (0, 0, 0), (0, 0, h), segs=24,
                        rot=(0, lean, 0))
        f.add(g, OLIVE, "body", st, st, outline=0.55)
        g = Geo()
        for k in range(8):
            a = 2 * math.pi * k / 8 + 0.2
            g.capsule((17.9 * math.cos(a), 17.9 * math.sin(a), 0.4), (1.4 * math.cos(a), 1.4 * math.sin(a), h - 1.2),
                      0.35)
        if st < 3:
            f.add(g, OLIVE_DK, "body", st, st, outline=0.1)                                 # seams
    f.add(Geo().capsule((0, 0, 30.0), (0, 0, 40.0), 0.7), TIMBER_DK, "body", 0, 0, outline=0.3)           # pole top
    # guy ropes and pegs
    g = Geo()
    for k in range(6):
        a = 2 * math.pi * k / 6 + 0.5
        g.capsule((16.0 * math.cos(a), 16.0 * math.sin(a), 6.0), (24.0 * math.cos(a), 22.0 * math.sin(a), 0.4), 0.22)
    f.add(g, KHAKI_DK, "body", 0, 2, outline=0.1)
    # the team awning over the door (+x side, the lane) on two poles, scalloped hem with a chevron
    g = Geo().blob((22.0, -1.0, 15.0), (6.0, 11.0, 0.8), p=3.0, rot=(0, 16, 0))
    f.add(g, None, "body", 0, 1, team=True, outline=0.45)
    g = Geo()
    for k in range(5):
        g.blob((27.6, -10.0 + k * 4.6, 13.0), (0.5, 2.2, 1.6), p=2.0)                     # scalloped hem
    f.add(g, None, "body", 0, 1, team=True, outline=0.25)
    _chevron_x(f, -1.0, 15.6, 1.0, 28.2, lo=0, hi=1)
    g = Geo()
    for y in (-11.0, 9.0):
        g.capsule((27.6, y, 0), (27.6, y, 13.0), 0.6)
    f.add(g, TIMBER_DK, "body", 0, 1, outline=0.3)
    f.add(Geo().blob((17.2, -1.0, 6.6), (0.8, 4.6, 6.6), p=3.0, rot=(0, -18, 0)), COAL, "body", 0, 3, outline=0)  # door
    # the tent flap (door family: closed, half open, open), tied back to the left
    for i, (w, sh) in enumerate(((4.6, 0.0), (3.0, 1.6), (1.4, 3.2))):
        g = Geo().blob((17.6 + 0.2 * i, -1.0 - sh, 6.6), (0.9, w, 6.8), p=2.4, rot=(0, -18, 0))
        f.add(g, OLIVE_LT, "door", i, i, outline=0.4)
    # a rifle rack (four rifles leaning on a rail) and ammo crates on the near side
    g = Geo().capsule((6.0, -21.0, 12.0), (-10.0, -21.0, 12.0), 0.7)
    for x in (6.0, -10.0):
        g.capsule((x, -21.0, 0), (x, -21.0, 13.0), 0.7)
    f.add(g, TIMBER, "body", 0, 2, outline=0.3)
    g = Geo()
    for k in range(4):
        _rifle(g, 4.0 - k * 4.4, -22.6, 0.0, 12.0)
    f.add(g, TIMBER_DK, "body", 0, 1, outline=0.3)
    g = Geo()
    for k in range(4):
        x = 4.0 - k * 4.4
        a = math.radians(12.0)
        g.capsule((x + math.sin(a) * 9.0, -22.6, math.cos(a) * 9.0), (x + math.sin(a) * 19.0, -22.6, math.cos(a) * 19.0),
                  0.45)
    f.add(g, GUNMETAL, "body", 0, 1, finish="metal", outline=0.2)
    for (x, y, z, rz, lo, hi) in ((18.0, -16.0, 3.0, 8, 0, 3), (19.0, -15.0, 8.4, -6, 0, 1)):
        f.add(Geo().blob((x, y, z), (4.0, 2.8, 2.6), p=5.0, rot=(0, 0, rz)), OLIVE_DK, "body", lo, hi, outline=0.4)
        f.add(Geo().blob((x, y - 2.9, z), (2.6, 0.3, 1.2), p=4.0, rot=(0, 0, rz)), None, "body", lo, hi, team=True,
              outline=0.2)
    # a lantern by the door
    f.add(Geo().capsule((26.0, 12.0, 0), (26.0, 12.0, 18.0), 0.5), GUNMETAL_DK, "body", 0, 2, finish="metal")
    f.add(Geo().blob((26.0, 12.0, 17.0), (1.4, 1.4, 1.8), p=2.6), None, "body", 0, 2, glow=FIRE, outline=0.4)
    # rubble: canvas, poles, a rifle, crates
    f.add(Geo().blob((0, 0, 1.6), (18, 15, 1.6), p=2.2), OLIVE_DK, "rubble")
    g = Geo()
    for k in range(4):
        g.capsule((-14 + k * 6.0, -10 + k * 5.0, 1.0), (4 + k * 6.0, 8 - k * 4.0, 1.0), 0.8)
    f.add(g, TIMBER_DK, "rubble")
    f.add(Geo().blob((16, -8, 1.2), (6, 5, 0.8), p=4.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -20, 20, -20, 20, 30, levels=1)


RIFLE_DEPOT = make("rifle_depot", "Rifle Depot", AGE, "camp", _rifle_depot, canvas=(300, 250), feet=(150, 214),
                   height=72, hit=(0, 16), material="wood", flag=(0.0, 0.0, 36.0, 14.0), flag_len=16.0, foot=30.0,
                   yaw=-24.0, lights=[((26.0, 12.0, 17.0), 8, 2)], pole_fill=TIMBER_DK, tip_fill=CREAM,
                   extra_meta={"flag": {"crumbleMax": 0, "z": "front"}})


# ============================================================================== Wire Snare (trap)
def _wire_snare(f):
    f.add(Geo().blob((0, 0, 0.3), (22, 13, 0.7), p=2.4), EARTH, "trap", 0, 3, outline=0)
    # two screw pickets either side of the lane (every frame but spent, when one is bent flat)
    g = Geo()
    for y in (-13.0, 13.0):
        g.capsule((6.0, y, 0), (6.0, y, 11.0), 0.45)
        g.lathe([(1.0, -0.3), (1.2, 0), (1.0, 0.3)], (6.0, y, 10.4), (6.0, y, 11.2), segs=10)
    f.add(g, GUNMETAL, "trap", 0, 2, finish="metal", outline=0.12)
    g = Geo().capsule((6.0, -13.0, 0), (6.0, -13.0, 11.0), 0.6).capsule((6.0, 13.0, 0.8), (14.0, 16.0, 1.2), 0.6)
    f.add(g, GUNMETAL_DK, "trap", 3, 3, finish="metal", outline=0.3)
    # unarmed: a compact coil lying beside the pickets
    _coil(f, -14.0, -4.0, 8.0, 3.6, 3.4, 5, 0, 0, fam="trap", ax="x")
    # armed: the coil drawn taut across the lane between the pickets (springy loops), a trip strand
    _coil(f, -13.0, 13.0, 6.0, 5.0, 4.4, 9, 1, 1, fam="trap", ax="y")
    _wire(f, [(6.0, -13.0, 9.4), (6.0, 0.0, 8.6), (6.0, 13.0, 9.4)], 1, 1, fam="trap", r=0.25)
    # sprung: the coil snapped tight round the victim's spot, loose ends flying
    _coil(f, -6.0, 6.0, 6.0, 4.4, 5.6, 6, 2, 2, fam="trap", ax="y")
    _wire(f, [(6.0, -13.0, 9.4), (2.0, -9.0, 12.0), (-3.0, -11.0, 15.0)], 2, 2, fam="trap", r=0.25)
    _wire(f, [(6.0, 13.0, 9.4), (10.0, 9.0, 13.0), (14.0, 11.0, 15.0)], 2, 2, fam="trap", r=0.25)
    f.add(Geo().blob((4.0, 0, 6.0), (4.0, 3.0, 4.0), p=2.0), None, "trap", 2, 2, glow="#FFF4D6", outline=0.3)
    # spent: the wire trampled flat in a tangle
    g = Geo()
    for k in range(14):
        a0, a1 = k * 1.3, k * 1.3 + 1.1
        g.capsule((math.cos(a0) * (8 + k % 4), math.sin(a0) * (6 + k % 3), 0.8),
                  (math.cos(a1) * (8 + (k + 1) % 4), math.sin(a1) * (6 + (k + 1) % 3), 0.8), 0.28)
    f.add(g, WIRE, "trap", 3, 3, outline=0.15)
    # a team marker flag on a stake and a team sandbag (every frame)
    f.add(Geo().capsule((-22.0, 10.0, 0), (-22.6, 10.0, 16.0), 0.9), TIMBER_DK, "trap", 0, 3)
    g = Geo().slab([(-22.6, 15.6), (-30.0, 14.0), (-28.0, 11.0), (-22.6, 11.6)], 10.0, 1.0)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)
    g = Geo()
    _sandbag(g, -16.0, 12.0, 2.2, ln=8.0)
    _sandbag(g, -16.0, 4.0, 2.2, ln=8.0, ang=20)
    _sandbag(g, -16.4, 8.0, 5.8, ln=8.0, ang=8)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.4)
    # team marker rags tied to the pickets
    g = Geo()
    for y in (-13.0, 13.0):
        g.blob((7.4, y, 8.6), (1.6, 0.5, 2.4), p=2.2, rot=(0, -20, 0))
    f.add(g, None, "trap", 0, 2, team=True, outline=0.2)
    _chevron(f, -26.4, 9.3, 12.4, 0.55, fam="trap", lo=0, hi=3)


WIRE_SNARE = make("wire_snare", "Wire Snare", AGE, "trap", _wire_snare, canvas=(200, 120), feet=(100, 92), height=22,
                  hit=(0, 6), material="metal", foot=28.0, yaw=-12.0)


FORTS = [SANDBAG_BUNKER, PILLBOX, FORWARD_BASE, MINEFIELD, RIFLE_DEPOT, WIRE_SNARE]
