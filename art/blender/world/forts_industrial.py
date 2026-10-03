"""Industrial forts in the cartoon style (DESIGN A16.14.4; the MVP release check flagged the realistic ones;
CONTENT_PLAN 5.5 adds the Rail Barricade and the Tesla Pylon).

Built with `world/fort_toon.py` (the cartoon unit look, the fort sheet contract of
`src/visuals/fortViews/atlasFortView.ts`). Heights, hit points, flag and crew points follow the realistic forts
they replace, so the game's placement and the crew on the nest line up unchanged. Palette: the Industrial
turrets' iron, coal, brick, brass and sandbag khaki (under 40% saturation, A11 colour rule); team colour on
painted sheets and plates, each with a cream cog.

  trench_parapet    wall   a timber revetment topped with sandbags on an earth bank, a team corrugated sheet,
                           barbed wire on iron pickets in front
  sniper_nest       tower  a riveted iron lattice tower with a timber deck and a team shield plate; a Carbineer crew
  recruiting_depot  camp   a brick hut with a slate roof and a smoking chimney, a team poster board, a gas lamp,
                           team bunting; the plank door swings open
  tripwire_charge   trap   an ammunition box charge dug in, a tripwire across the lane between two pickets
  rail_barricade    wall   (heavy) stacked sleepers and steel rails, two rail hedgehogs, a team buffer beam with
                           hazard stripes
  tesla_pylon       tower  (crewless, chain) an iron lattice pylon with brass coil rings and a glowing copper
                           sphere on top (the muzzle the arcs leave from)

Run: `<venv>/bin/python art/blender/world/render_forts.py --age industrial --out <scratch> [--only a,b] [--install]`.
"""
import math

from ageborn_art.geometry import Geo

from world.common import rock
from world.fort_toon import make, scaffold

AGE = "industrial"
IRON = "#5B6168"
IRON_LT = "#7E858E"
IRON_DK = "#454A51"
COAL = "#2E2D31"
CREAM = "#E6DFCE"
BRICK = "#8E6A62"
BRICK_LT = "#A07C72"
BRICK_DK = "#735852"
MORTAR = "#B9AFA2"
SLATE = "#4A4950"
SLATE_LT = "#5E5D66"
COPPER = "#A87050"
BRASS = "#A8976A"
BRASS_LT = "#C2B286"
TIMBER = "#8E7660"
TIMBER_DK = "#6A5848"
KHAKI = "#B4A886"
KHAKI_DK = "#94896C"
EARTH = "#8A7A66"
EARTH_DK = "#6E604F"
CONCRETE = "#A9A59C"
STRIPE_DK = "#2F2E33"
STRIPE_LT = "#D9CFA8"
WIRE = "#3C3A3A"
FIRE = "#FFE3B0"
ARC = "#E4DAFF"
SCORCH = "#4A423A"


def _cog(f, c, s, y, fam="body", lo=0, hi=1):
    """A cream cog on a team surface facing -y: a toothed wheel with a dark hub hole."""
    x, z = c
    g = Geo().star((x, y, z), 3.0 * s, 2.3 * s, 0.6, points=8)
    g.lathe([(0, -0.4), (2.4 * s, -0.4), (2.4 * s, 0.4), (0, 0.4)], (x, y, z), (x, y - 0.01, z), segs=20)
    f.add(g, CREAM, fam, lo, hi, outline=0.2)
    f.add(Geo().blob((x, y - 0.55, z), (0.9 * s, 0.3, 0.9 * s), p=2.0), COAL, fam, lo, hi, outline=0)


def _cog_x(f, c, s, x, fam="body", lo=0, hi=1):
    """The same cog on a team surface facing +x (the lane side)."""
    y, z = c
    g = Geo().star((x, y, z), 3.0 * s, 2.3 * s, 0.6, points=8, rot=(0, 0, 90))
    f.add(g, CREAM, fam, lo, hi, outline=0.2)
    f.add(Geo().blob((x + 0.55, y, z), (0.3, 0.9 * s, 0.9 * s), p=2.0), COAL, fam, lo, hi, outline=0)


def _sandbag(g, x, y, z, ln=9.0, ang=0.0):
    """One plump sandbag (a pillow blob) along `ang` degrees in the ground plane."""
    g.blob((x, y, z), (ln * 0.5, 3.0, 2.0), p=2.6, rot=(0, 0, ang))
    return g


def _wire(f, pts, lo, hi, fam="body", r=0.35):
    """Barbed wire: a loose zigzag of thin strands with little barbs."""
    g = Geo()
    for (a, b) in zip(pts, pts[1:]):
        g.capsule(a, b, r)
        mx, my, mz = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2)
        g.capsule((mx - 0.5, my, mz - 0.8), (mx + 0.5, my, mz + 0.8), r * 0.7)
    f.add(g, "#6E6C6A", fam, lo, hi, outline=0.15)


# ============================================================================== Trench Parapet (wall)
def _trench_parapet(f):
    f.add(Geo().blob((-4, 0, 0), (18, 42, 6.0), p=2.4), EARTH, "body", 0, 3)          # the spoil bank
    f.add(Geo().blob((-4, 0, 0), (21, 45, 4.6), p=2.4), EARTH, "rubble")
    # the timber revetment: upright planks that tip over toward the lane as the wall breaks
    for i in range(12):
        y = -33.0 + i * 6.0
        st = 4 if i in (0, 11) else [2, 3, 4, 3, 1, 3, 2, 4, 3, 1, 3, 2][i]

        def make_(fallen, y=y, i=i):
            if not fallen:
                return Geo().blob((0.4, y, 14.0), (1.3, 2.75, 14.0), p=4.0, rot=(0, -4, 0)), TIMBER if i % 2 else TIMBER_DK
            return Geo().blob((16.0 + (i % 3) * 3, y + (i % 2) * 2 - 1, 1.3), (13.0, 2.75, 1.2), p=4.0,
                              rot=(0, 0, (i % 3 - 1) * 14)), TIMBER_DK
        f.breakable(make_, st)
    g = Geo()
    for y in (-34.0, -12.0, 12.0, 34.0):
        g.capsule((-1.6, y, -1.0), (-2.4, y, 31.0), 1.3)
    f.add(g, TIMBER_DK, "body", 0, 3, outline=0.4)
    # sandbags: two courses along the top (they slump first), one in front of the planks
    for row, (x, z, st) in enumerate(((-2.4, 30.0, 1), (-2.4, 34.0, 1), (6.2, 2.2, 3))):
        g = Geo()
        n = 8 if row < 2 else 7
        for k in range(n):
            y = -35.0 + (k + (0.5 if row == 1 else 0.0)) * (70.0 / (n - (1 if row == 1 else 0)))
            if row == 1 and y > 32:
                continue
            _sandbag(g, x, y, z)
        f.add(g, KHAKI, "body", 0, st - 1)
        g = Geo()
        for k in range(n):
            y = -35.0 + (k + (0.5 if row == 1 else 0.0)) * (70.0 / (n - (1 if row == 1 else 0)))
            if row == 1 and y > 32:
                continue
            g.capsule((x - 1.4, y - 1.4, z + 1.6), (x + 1.4, y - 1.4, z + 1.6), 0.35)
        f.add(g, KHAKI_DK, "body", 0, st - 1, outline=0.15)                            # tie strings
    g = Geo()
    for k in range(5):
        _sandbag(g, -2.4 + (k % 2) * 3.0, -20.0 + k * 9.0, 22.0 + (k % 2) * 2.2, ang=10 * (k - 2))
    f.add(g, KHAKI, "body", 1, 1)                                                      # 66%: the top slumped
    # a corrugated iron sheet (grey) and a team-painted one with a cream cog, nailed over the planks
    for (y0, y1, team, lo, hi) in ((-30.0, -14.0, False, 0, 2), (-6.0, 14.0, True, 0, 1)):
        g = Geo()
        for k in range(5):
            yy = y0 + (k + 0.5) * (y1 - y0) / 5
            g.blob((2.4, yy, 13.0), (0.9, (y1 - y0) / 10 + 0.3, 11.0), p=2.2)
        f.add(g, None if team else IRON_LT, "body", lo, hi, team=team, outline=0.35, finish="matte" if team else "metal")
    _cog_x(f, (4.0, 14.0), 1.5, 3.4, lo=0, hi=1)
    f.add(Geo().blob((3.0, 2.0, 9.0), (1.0, 8.0, 7.0), p=3.0, rot=(18, 0, 0)), None, "body", 2, 2, team=True, outline=0.35)
    # barbed wire on angle-iron pickets in front (the lane side)
    g = Geo()
    for y in (-30.0, -10.0, 10.0, 30.0):
        g.capsule((22.0, y, 0), (22.0, y, 12.0), 0.6)
    f.add(g, IRON_DK, "body", 0, 2, outline=0.3, finish="metal")
    pts = [(22.0, -34.0 + k * 8.5, 7.0 + (2.0 if k % 2 else -1.4)) for k in range(9)]
    _wire(f, pts, 0, 1, r=0.28)
    # rubble: sandbags, planks and the team sheet
    g = Geo()
    for k in range(10):
        _sandbag(g, -6 + (k * 7) % 26, -32 + k * 7.0, 2.0, ang=k * 37)
    f.add(g, KHAKI, "rubble")
    g = Geo()
    for k in range(4):
        g.blob((4 + k * 4, -20 + k * 12, 1.2 + k * 0.3), (2.8, 13.0, 1.0), p=4.0, rot=(0, 0, (k - 1.5) * 22))
    f.add(g, TIMBER_DK, "rubble")
    f.add(Geo().blob((20, 4, 1.2), (10, 7, 0.9), p=3.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -10, 8, -40, 40, 40)


TRENCH_PARAPET = make("trench_parapet", "Trench Parapet", AGE, "wall", _trench_parapet, canvas=(300, 250),
                      feet=(150, 218), height=80, hit=(3, 26), material="wood", flag=(-8.0, 0.0, 0.0, 76.0),
                      flag_len=22.0, foot=28.0, yaw=-38.0, pole_fill=TIMBER_DK, tip_fill=BRASS_LT)


# ================================================================================= Sniper Nest (tower)
PZ = 46.0


def _lattice(f, legs, z0, z1, lo, hi, r=1.3, fill=IRON_LT):
    """Four splayed iron legs with X braces between them (z0..z1)."""
    g = Geo()
    for (x, y) in legs:
        g.capsule((x * 1.3, y * 1.3, z0), (x, y, z1), r, r * 0.85)
    for zz0, zz1 in ((z0 + 2, (z0 + z1) / 2), ((z0 + z1) / 2, z1 - 1)):
        def at(x, y, z):
            t = (z - z0) / max(1.0, z1 - z0)
            k = 1.3 - 0.3 * t
            return (x * k, y * k, z)
        for (a, b) in ((legs[0], legs[1]), (legs[1], legs[3]), (legs[3], legs[2]), (legs[2], legs[0])):
            g.capsule(at(a[0], a[1], zz0), at(b[0], b[1], zz1), r * 0.5)
            g.capsule(at(b[0], b[1], zz0), at(a[0], a[1], zz1), r * 0.5)
    f.add(g, fill, "body", lo, hi, outline=0.35)


def _sniper_nest(f):
    legs = [(-10.0, -9.0), (10.0, -9.0), (-10.0, 9.0), (10.0, 9.0)]
    g = Geo()
    for (x, y) in legs:
        g.lathe([(3.4, 0), (3.4, 2.6), (2.6, 3.4), (0, 3.4)], (x * 1.3, y * 1.3, 0), (x * 1.3, y * 1.3, 3.4), segs=14)
    f.add(g, CONCRETE, "body", 0, 3)                                                   # footings
    _lattice(f, legs, 2.0, PZ, 0, 1)
    # 33%: the tower buckles, the deck drops to half height; 12%: a stump of legs
    _lattice(f, [(-10.0, -9.0), (10.0, -9.0), (-10.0, 9.0), (10.0, 9.0)], 2.0, 30.0, 2, 2)
    _lattice(f, legs, 2.0, 14.0, 3, 3)
    g = Geo()
    for (x, y) in legs:
        g.capsule((x, y, 30.0), (x + 6.0, y * 0.9, 38.0), 1.1)
    f.add(g, IRON_DK, "body", 2, 2, outline=0.35, finish="metal")
    # the deck (timber planks on an iron frame), sinking with the broken tower
    for (z, rot, lo, hi) in ((PZ, (0, 0, 0), 0, 1), (37.0, (0, 9, 0), 2, 2), (15.0, (0, -12, 4), 3, 3)):
        g = Geo()
        for k in range(5):
            g.blob((-12.0 + k * 6.0, 0, z + 0.9), (2.8, 14.0, 1.0), p=4.0)
        f.add(Geo().blob((0, 0, z + 0.9), (15.0, 14.0, 1.0), p=4.0, rot=rot), TIMBER_DK, "body", lo, hi, outline=0.3)
        if lo == 0:
            f.add(g, TIMBER, "body", lo, hi, outline=0.25)                             # planks over the frame
    g = Geo()
    for k in range(9):
        g.sphere((-13.0 + k * 3.25, -14.2, PZ + 0.6), 0.6, cuts=2)
    f.add(g, IRON_LT, "body", 0, 1, finish="metal", outline=0.15)                      # rivets on the deck edge
    # a ladder up the back
    g = Geo()
    for s in (-1, 1):
        g.capsule((-26.0, s * 3.5, 0), (-15.0, s * 3.5, PZ + 2.0), 0.55)
    for k in range(1, 10):
        t = k / 10
        g.capsule((-26.0 + 11 * t, -3.5, (PZ + 2) * t), (-26.0 + 11 * t, 3.5, (PZ + 2) * t), 0.4)
    f.add(g, IRON_DK, "body", 0, 1, finish="metal", outline=0.3)
    # sandbags on the back corners, a side plate and a lamp on a hook
    g = Geo()
    for (x, y) in ((-11.0, 9.0), (-11.0, -2.0), (11.0, 9.0)):
        _sandbag(g, x, y, PZ + 3.6, ln=8.0, ang=90)
    f.add(g, KHAKI, "body", 0, 1)
    f.add(Geo().blob((14.6, 0, PZ + 6.5), (1.0, 11.0, 5.0), p=4.0), None, "body", 0, 1, team=True, outline=0.4)
    f.add(Geo().blob((13.0, -4.0, 30.0), (1.0, 7.0, 4.0), p=4.0, rot=(0, 0, 0)), None, "body", 2, 2, team=True, outline=0.4)
    f.add(Geo().blob((12.0, -4.0, 4.0), (1.0, 6.0, 3.0), p=4.0, rot=(0, 30, 0)), None, "body", 3, 3, team=True, outline=0.4)
    f.add(Geo().capsule((-14.0, 12.0, PZ + 2.0), (-14.0, 12.0, PZ + 12.0), 0.5), IRON_DK, "body", 0, 1)
    f.add(Geo().blob((-14.0, 12.0, PZ + 10.4), (1.6, 1.6, 2.0), p=2.6), None, "body", 0, 1, glow=FIRE, outline=0.4)
    # the team shield plate across the front, drawn over the crew (front family), a slit and rivets
    for st in range(4):
        if st >= 3:
            continue
        z = PZ if st < 2 else 37.0
        w, h = ((13.0, 6.0), (13.0, 5.0), (8.0, 4.4))[st]
        rot = ((0, 0, 0), (0, 0, 0), (12, 6, 0))[st]
        f.add(Geo().blob((0 if st < 2 else -4.0, -12.8, z + 7.4), (w, 0.9, h), p=4.0, rot=rot), None, "front", st, st,
              team=True, outline=0.5)
        if st < 2:
            f.add(Geo().blob((5.0, -13.8, z + 10.2), (2.8, 0.4, 0.7), p=3.0), COAL, "front", st, st, outline=0)
            g = Geo()
            for k in range(6):
                g.sphere((-11.0 + k * 4.4, -13.8, z + 12.4 - (st * 1.0)), 0.5, cuts=2)
            f.add(g, IRON_LT, "front", st, st, finish="metal", outline=0.15)
    _cog(f, (-4.0, PZ + 7.0), 1.2, -13.9, fam="front", lo=0, hi=1)
    # rubble: girders, the team plate, concrete
    g = Geo()
    for k in range(6):
        a = k * 1.1
        x0, y0 = -14 + k * 5.0, -9 + (k % 3) * 8.0
        g.capsule((x0, y0, 1.2), (x0 + 26 * math.cos(a), y0 + 18 * math.sin(a), 1.2), 1.2)
    f.add(g, IRON, "rubble", finish="metal")
    g = Geo()
    for k in range(6):
        rock(g, (-6 + k * 4.0, -8 + (k % 2) * 10, 1.8), (3.4, 2.8, 1.8), seed=20 + k, jag=0.2)
    f.add(g, CONCRETE, "rubble")
    f.add(Geo().blob((12, -8, 1.2), (11, 6, 0.8), p=4.0, rot=(0, 0, 18)), None, "rubble", team=True)
    scaffold(f, -16, 16, -14, 14, PZ + 6)


SNIPER_NEST = make("sniper_nest", "Sniper Nest", AGE, "tower", _sniper_nest, canvas=(240, 260), feet=(118, 228),
                   height=100, hit=(0, 30), material="metal", flag=(-12.0, 10.0, 47.8, 32.0), flag_len=14.0, foot=18.0,
                   yaw=-14.0, crew=dict(visualId="unit.carbineer", at=(2.0, 0.0, 47.8), scale=0.6),
                   lights=[((-14.0, 12.0, PZ + 10.4), 7, 1)], pole_fill=IRON_DK, tip_fill=BRASS_LT)


# ============================================================================ Recruiting Depot (camp)
W, D, H = 44.0, 26.0, 22.0


def _bricks(z0, z1, skip_door=True):
    """Cartoon bricks on the two faces the camera sees (-y and +x), courses z0..z1, in one Geo."""
    g = Geo()
    ch = 3.4
    ci = int(z0 // ch)
    z = ci * ch
    while z < z1 - 0.1:
        off = 3.4 if ci % 2 else 0.0
        x = -W / 2 + 1.0 - off
        while x < W / 2 - 1.0:
            cx = x + 3.3
            if -W / 2 + 1.5 < cx < W / 2 - 1.5 and not (skip_door and -10.0 < cx < 2.0 and z < 15.0):
                g.blob((cx, -D / 2 - 0.4, z + ch / 2), (3.0, 1.0, ch / 2 - 0.25), p=4.0)
            x += 6.8
        y = -D / 2 + 1.0 - off
        while y < D / 2 - 1.0:
            cy = y + 3.3
            if -D / 2 + 1.5 < cy < D / 2 - 1.5:
                g.blob((W / 2 + 0.4, cy, z + ch / 2), (1.0, 3.0, ch / 2 - 0.25), p=4.0)
            y += 6.8
        ci += 1
        z += ch
    return g


def _recruiting_depot(f):
    # the core walls (mortar colour shows between the bricks), in three bands that break from the top
    for (z0, z1, st) in ((0.0, 10.2, 4), (10.2, 17.0, 3), (17.0, H, 2)):
        f.add(Geo().blob((0, 0, (z0 + z1) / 2), (W / 2, D / 2, (z1 - z0) / 2 + 0.2), p=6.0), MORTAR, "body", 0,
              min(3, st - 1), outline=0.5)
        f.add(_bricks(z0, z1), BRICK, "body", 0, min(3, st - 1), outline=0.2)
        if st <= 3:
            g = Geo()
            for k in range(7):
                rock(g, (W / 2 + 6 + (k % 3) * 5, -D / 2 + k * 4.0, 1.8 + (k % 2) * 1.6), (3.0, 2.0, 1.8), seed=st * 9 + k,
                     jag=0.15)
            f.add(g, BRICK_DK, "body", st, 3)
    f.add(Geo().blob((0, -D / 2 + 0.2, 6.6), (5.6, 0.6, 7.0), p=4.0), COAL, "body", 0, 3, outline=0)   # the doorway
    # a brick quoin trim and a door frame
    g = Geo()
    for x in (-W / 2, W / 2):
        g.blob((x, -D / 2, H / 2), (1.6, 1.6, H / 2), p=5.0)
    f.add(g, BRICK_LT, "body", 0, 1, outline=0.4)
    g = Geo().capsule((-10.4, -D / 2 - 1.2, 0), (-10.4, -D / 2 - 1.2, 14.6), 1.1)
    g.capsule((1.4, -D / 2 - 1.2, 0), (1.4, -D / 2 - 1.2, 14.6), 1.1)
    g.capsule((-11.2, -D / 2 - 1.2, 14.6), (2.2, -D / 2 - 1.2, 14.6), 1.2)
    f.add(g, TIMBER_DK, "body", 0, 2, outline=0.4)
    # slate roof (two slopes with a ridge), a chimney (the smoke point)
    for s, (lo, hi) in ((-1, (0, 0)), (1, (0, 1))):
        g = Geo().blob((0, s * (D / 4 + 0.4), H + 5.6), (W / 2 + 3.0, D / 4 + 3.2, 1.3), p=4.0, rot=(s * 30, 0, 0))
        f.add(g, SLATE, "body", lo, hi, outline=0.5)
        g = Geo()
        for k in range(3):
            g.blob((0, s * (D / 4 + 0.4) + s * (k - 1) * 3.4, H + 5.6 + 2.0 * (1 - k) * 0.85 + 1.2),
                   (W / 2 + 3.1, 0.5, 0.35), p=3.0, rot=(s * 30, 0, 0))
        f.add(g, SLATE_LT, "body", lo, hi, outline=0)
    f.add(Geo().capsule((-W / 2 - 3, 0, H + 11.0), (W / 2 + 3, 0, H + 11.0), 1.3), SLATE_LT, "body", 0, 0, outline=0.4)
    g = Geo().blob((W * 0.2, -D / 4 - 0.6, H + 4.4), (W * 0.32, D / 4 + 2.6, 1.3), p=4.0, rot=(-30, 10, 0))
    f.add(g, SLATE, "body", 1, 2, outline=0.5)                                         # 66%: half the roof left
    f.add(Geo().blob((-14.0, 4.0, H + 9.0), (3.2, 3.2, 9.0), p=5.0), BRICK, "body", 0, 2, outline=0.5)
    f.add(Geo().blob((-14.0, 4.0, H + 18.4), (3.8, 3.8, 1.0), p=5.0), BRICK_DK, "body", 0, 2, outline=0.4)
    f.add(Geo().blob((-14.0, 4.0, H + 19.0), (2.2, 2.2, 0.6), p=3.0), COAL, "body", 0, 2, outline=0)
    # the plank door (door family: closed, half open, open), hinged at the right jamb
    for i, ang in enumerate((0.0, 45.0, 85.0)):
        a = math.radians(ang)
        hx, hy = 0.8, -D / 2 - 0.9
        cx, cy = hx - 5.2 * math.cos(a), hy - 5.2 * math.sin(a)
        g = Geo().blob((cx, cy, 7.0), (5.2, 0.7, 7.0), p=4.0, rot=(0, 0, ang))
        f.add(g, TIMBER, "door", i, i, outline=0.4)
        g = Geo()
        for z in (3.0, 11.0):
            g.blob((cx, cy - 0.6 * math.cos(a), z), (5.0, 0.4, 0.6), p=3.0, rot=(0, 0, ang))
        f.add(g, IRON_DK, "door", i, i, outline=0.2, finish="metal")
    # the recruiting poster board (team colour, a cream cog) and a gas lamp
    f.add(Geo().blob((12.0, -D / 2 - 1.6, 12.0), (6.4, 0.7, 7.6), p=4.0), TIMBER_DK, "body", 0, 1, outline=0.4)
    f.add(Geo().blob((12.0, -D / 2 - 2.3, 12.4), (5.2, 0.5, 6.4), p=4.0), None, "body", 0, 1, team=True, outline=0.3)
    _cog(f, (12.0, 14.0), 1.2, -D / 2 - 2.9)
    g = Geo()
    for z in (8.0, 9.6):
        g.blob((12.0, -D / 2 - 2.9, z), (3.6, 0.3, 0.45), p=3.0)
    f.add(g, CREAM, "body", 0, 1, outline=0)
    f.add(Geo().blob((10.0, -D / 2 - 2.3, 9.0), (4.0, 0.5, 4.0), p=4.0, rot=(0, 24, 0)), None, "body", 2, 2, team=True,
          outline=0.3)
    g = Geo().capsule((22.0, -18.0, 0), (22.0, -18.0, 27.0), 0.7)
    g.capsule((22.0, -18.0, 27.0), (20.0, -18.0, 29.0), 0.5)
    f.add(g, IRON_DK, "body", 0, 2, outline=0.35, finish="metal")
    f.add(Geo().lathe([(0, 0), (1.9, 0.6), (1.6, 3.4), (0, 4.0)], (22.0, -18.0, 27.2), (22.0, -18.0, 31.2), segs=12), None,
          "body", 0, 2, glow=FIRE, outline=0.4)
    f.add(Geo().lathe([(0, 0), (2.4, 0), (0, 1.4)], (22.0, -18.0, 31.0), (22.0, -18.0, 32.4), segs=12), IRON_DK, "body", 0,
          2, finish="metal")
    # team bunting along the near eave
    g = Geo()
    for k in range(7):
        x = -W / 2 + 3 + k * (W - 6) / 6
        sag = 1.4 * math.sin(math.pi * k / 6)
        g.slab([(x - 2.4, H + 1.6 - sag), (x + 2.4, H + 1.6 - sag), (x, H - 3.0 - sag)], -D / 2 - 2.8, 0.5)
    f.add(g, None, "body", 0, 1, team=True, outline=0.3)
    g = Geo()
    for k in range(6):
        x0 = -W / 2 + 3 + k * (W - 6) / 6
        x1 = x0 + (W - 6) / 6
        g.capsule((x0, -D / 2 - 2.8, H + 1.6 - 1.4 * math.sin(math.pi * k / 6)),
                  (x1, -D / 2 - 2.8, H + 1.6 - 1.4 * math.sin(math.pi * (k + 1) / 6)), 0.3)
    f.add(g, "#C2AE86", "body", 0, 1, outline=0.2)
    # crates by the door
    f.add(Geo().blob((-18.0, -D / 2 - 6.0, 3.2), (3.6, 3.2, 3.2), p=5.0), TIMBER, "body", 0, 3, outline=0.4)
    f.add(Geo().blob((-17.0, -D / 2 - 6.0, 8.6), (2.8, 2.6, 2.4), p=5.0, rot=(0, 0, 12)), TIMBER_DK, "body", 0, 1,
          outline=0.4)
    # rubble
    g = Geo()
    for k in range(14):
        rock(g, (-18 + (k * 9) % 40, -12 + (k * 5) % 22, 1.8 + (k % 3) * 0.8), (3.2, 2.2, 1.8), seed=50 + k, jag=0.15)
    f.add(g, BRICK, "rubble")
    f.add(Geo().blob((0, 0, 3), (W / 2 - 4, D / 2 - 3, 3.0), p=4.0), BRICK_DK, "rubble")
    f.add(Geo().blob((14, -10, 1.0), (8, 6, 0.8), p=3.0, rot=(0, 0, 14)), SLATE, "rubble")
    f.add(Geo().blob((-8, -12, 1.4), (8, 5, 1.0), p=3.0), None, "rubble", team=True)
    scaffold(f, -W / 2 - 3, W / 2 + 3, -D / 2 - 3, D / 2 + 3, H + 8, levels=1)


RECRUITING_DEPOT = make("recruiting_depot", "Recruiting Depot", AGE, "camp", _recruiting_depot, canvas=(300, 250),
                        feet=(150, 214), height=76, hit=(0, 16), material="stone", flag=(20.0, 12.0, 0.0, 64.0),
                        flag_len=18.0, foot=28.0, yaw=-24.0, lights=[((22.0, -18.0, 29.0), 10, 2)],
                        smoke=[((-14.0, 4.0, 40.0), 0)], pole_fill=IRON_DK, tip_fill=BRASS_LT,
                        extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


# ============================================================================== Tripwire Charge (trap)
def _ammo_box(f, lo, hi, z=0.0, team_band=False):
    f.add(Geo().blob((-2.0, 4.0, z + 3.0), (5.0, 3.6, 3.0), p=5.0), TIMBER, "trap", lo, hi, outline=0.4)
    g = Geo()
    for xx in (-5.6, 1.6):
        g.blob((xx, 4.0, z + 3.0), (0.6, 3.8, 3.1), p=4.0)
    f.add(g, TIMBER_DK, "trap", lo, hi, outline=0.25)
    if team_band:
        f.add(Geo().blob((-2.0, 4.0, z + 4.6), (5.2, 3.8, 0.8), p=4.0), None, "trap", lo, hi, team=True, outline=0.3)
    f.add(Geo().star((-2.0, 0.2, z + 2.6), 1.6, 0.7, 0.4, points=5), CREAM, "trap", lo, hi, outline=0.15)


def _tripwire_charge(f):
    f.add(Geo().blob((0, 2, 0.3), (18, 11, 0.7), p=2.4), EARTH, "trap", 0, 3, outline=0)
    # unarmed: the box sits on the ground, the wire still coiled beside it
    _ammo_box(f, 0, 0)
    g = Geo()
    for k in range(10):
        a0, a1 = k * 0.9, (k + 1) * 0.9
        g.capsule((-12 + 3 * math.cos(a0), -8 + 2 * math.sin(a0), 1.0 + 0.1 * k),
                  (-12 + 3 * math.cos(a1), -8 + 2 * math.sin(a1), 1.0 + 0.1 * (k + 1)), 0.3)
    f.add(g, WIRE, "trap", 0, 0, outline=0.15)
    # armed: dug in with a team band, the wire stretched across the lane between two pickets
    f.add(Geo().blob((-2.0, 4.0, 0.8), (7.4, 5.4, 1.2), p=2.4), EARTH_DK, "trap", 1, 1, outline=0)
    _ammo_box(f, 1, 1, z=-2.4, team_band=True)
    g = Geo()
    for y in (-12.0, 12.0):
        g.capsule((14.0, y, 0), (14.0, y, 7.0), 0.55)
    f.add(g, IRON_DK, "trap", 0, 2, finish="metal", outline=0.3)
    g = Geo().capsule((14.0, -12.0, 5.6), (14.0, 0.0, 5.0), 0.25).capsule((14.0, 0.0, 5.0), (14.0, 12.0, 5.6), 0.25)
    g.capsule((14.0, 0.0, 5.0), (6.0, 2.0, 2.6), 0.22).capsule((6.0, 2.0, 2.6), (-0.5, 4.0, 3.4), 0.22)
    f.add(g, WIRE, "trap", 1, 1, outline=0.15)
    g = Geo()
    for k in range(3):
        _sandbag(g, -10.0 + k * 5.0, 12.0, 2.2, ln=7.0)
    f.add(g, KHAKI, "trap", 0, 1)
    # sprung: a burst with flung planks; spent: a scorched crater with shards
    f.add(Geo().blob((0, 2, 0.5), (14, 9, 0.7), p=2.4), SCORCH, "trap", 2, 3, outline=0)
    f.add(Geo().blob((0, 2, 5.0), (7.0, 5.0, 5.0), p=2.0), None, "trap", 2, 2, glow=FIRE, outline=0.4)
    g = Geo()
    for k in range(7):
        a = k * 2 * math.pi / 7
        g.blob((math.cos(a) * 11.0, 2 + math.sin(a) * 7.0, 4.0 + (k % 3) * 3.0), (2.6, 1.0, 0.8), p=3.0,
               rot=(0, 25 * (k % 3), k * 40))
    f.add(g, TIMBER, "trap", 2, 2, outline=0.3)
    g = Geo()
    for k in range(8):
        a = k * 2 * math.pi / 8 + 0.3
        g.blob((math.cos(a) * 13.0, 2 + math.sin(a) * 8.0, 0.8), (2.4, 1.2, 0.6), p=3.0, rot=(0, 0, k * 50))
    f.add(g, TIMBER_DK, "trap", 3, 3, outline=0.25)
    g = Geo()
    for k in range(7):
        a = k * 2 * math.pi / 7
        rock(g, (math.cos(a) * 15.0, 2 + math.sin(a) * 9.0, 1.2), (2.4, 1.8, 1.2), seed=70 + k, jag=0.2)
    f.add(g, EARTH_DK, "trap", 3, 3)
    # a team marker pennant on a stake (every frame)
    f.add(Geo().capsule((-22.0, 10.0, 0), (-22.6, 10.0, 16.0), 0.9), TIMBER_DK, "trap", 0, 3)
    g = Geo().slab([(-22.6, 15.6), (-30.0, 14.0), (-28.0, 11.0), (-22.6, 11.6)], 10.0, 1.0)
    f.add(g, None, "trap", 0, 3, team=True, outline=0.5)
    f.add(Geo().blob((-19.6, 12.0, 2.0), (3.4, 2.6, 2.2), p=2.2), None, "trap", 0, 3, team=True, outline=0.5)


TRIPWIRE_CHARGE = make("tripwire_charge", "Tripwire Charge", AGE, "trap", _tripwire_charge, canvas=(200, 120),
                       feet=(100, 92), height=24, hit=(0, 6), material="metal", foot=28.0, yaw=-12.0)


# ============================================================================= Rail Barricade (heavy wall)
def _hedgehog(g, x, y, s=1.0):
    """A rail hedgehog: three crossed I-beam rails (chunky capsules)."""
    L = 15.0 * s
    for (dx, dy, dz) in ((1.0, 0.3, 0.9), (-0.9, 0.4, 0.9), (0.1, -1.0, 0.75)):
        n = math.sqrt(dx * dx + dy * dy + dz * dz)
        ux, uy, uz = dx / n, dy / n, dz / n
        c = (x, y, 9.0 * s)
        g.capsule((c[0] - ux * L * 0.6, c[1] - uy * L * 0.6, max(0.8, c[2] - uz * L * 0.6)),
                  (c[0] + ux * L * 0.6, c[1] + uy * L * 0.6, c[2] + uz * L * 0.6), 1.5 * s)
    return g


def _rail_barricade(f):
    f.add(Geo().blob((-2, 0, 0), (18, 44, 4.0), p=2.4), EARTH, "body", 0, 3)
    f.add(Geo().blob((-2, 0, 0), (21, 46, 3.4), p=2.4), EARTH, "rubble")
    # a crib of stacked timber sleepers (alternating courses), breaking from the top
    courses = [(0.0, 4), (4.6, 4), (9.2, 3), (13.8, 3), (18.4, 2), (23.0, 1)]
    for ci, (z, st) in enumerate(courses):
        def make_(fallen, z=z, ci=ci):
            g = Geo()
            if not fallen:
                for k in range(4):
                    y = -36.0 + k * 24.0 + (6.0 if ci % 2 else 0.0)
                    g.blob((0, y, z + 2.3), (6.0, 10.6, 2.2), p=4.0)
                return g, TIMBER if ci % 2 else TIMBER_DK
            for k in range(3):
                g.blob((16 + k * 5, -26 + k * 22 + ci * 3, 1.2 + k * 0.3), (2.2, 10.0, 1.1), p=4.0, rot=(0, 0, 18 * (k - 1)))
            return g, TIMBER_DK
        f.breakable(make_, st)
    # steel rails laid along the crib between courses (they bend and slip as it breaks)
    for (z, st) in ((9.0, 3), (18.2, 2), (27.4, 1)):
        g = Geo()
        for x in (-3.0, 3.0):
            g.blob((x, 0, z + 1.0), (1.0, 42.0, 1.1), p=4.0)
            g.blob((x, 0, z + 2.2), (1.6, 42.0, 0.5), p=4.0)
        f.add(g, IRON_LT, "body", 0, st - 1, finish="metal", outline=0.35)
    g = Geo()
    g.capsule((2.0, -40.0, 18.0), (3.0, -20.0, 24.0), 1.1).capsule((3.0, -20.0, 24.0), (6.0, -6.0, 36.0), 1.1)
    f.add(g, IRON_LT, "body", 0, 1, finish="metal", outline=0.35)                         # one rail bent up
    # the team buffer beam across the lane face with hazard stripes and a cream cog, two buffers
    for st, (z, rot) in enumerate(((18.0, (0, 0, 0)), (18.0, (0, 0, 0)), (12.0, (14, 0, 0)))):
        f.add(Geo().blob((7.2, 0, z), (1.6, 22.0, 4.2), p=4.0, rot=rot), None, "body", st, st, team=True, outline=0.5)
        g = Geo()
        for k in range(6):
            yy = -19.0 + k * 7.6
            g.blob((8.6, yy, z), (0.4, 1.4, 4.0), p=3.0, rot=(30, 0, 0))
        f.add(g, STRIPE_LT if st != 2 else STRIPE_DK, "body", st, st, outline=0.1)
    _cog_x(f, (0.0, 18.0), 1.5, 9.2, lo=0, hi=1)
    g = Geo()
    for y in (-14.0, 14.0):
        g.lathe([(2.6, 0), (2.6, 3.0), (3.6, 3.4), (3.6, 4.8), (0, 4.8)], (8.8, y, 18.0), (13.6, y, 18.0), segs=16)
    f.add(g, IRON_DK, "body", 0, 1, finish="metal", outline=0.4)
    # two rail hedgehogs in front, one bigger behind the crib end
    g = Geo()
    _hedgehog(g, 20.0, -28.0)
    _hedgehog(g, 20.0, 22.0, s=0.9)
    f.add(g, IRON, "body", 0, 2, finish="metal", outline=0.4)
    g = Geo()
    _hedgehog(g, -14.0, 36.0, s=1.1)
    f.add(g, IRON, "body", 0, 3, finish="metal", outline=0.4)
    g = Geo()
    for (x, y) in ((20.0, -28.0), (20.0, 22.0)):
        g.blob((x, y, 0.6), (5.0, 4.0, 0.8), p=2.4)
    f.add(g, EARTH_DK, "body", 0, 2, outline=0)
    # rivets on the beam, a lamp on a hook at the crib end
    g = Geo()
    for k in range(8):
        g.sphere((8.8, -20.0 + k * 5.7, 22.6), 0.55, cuts=2)
    f.add(g, IRON_LT, "body", 0, 1, finish="metal", outline=0.15)
    f.add(Geo().capsule((-4.0, -40.0, 27.0), (-4.0, -40.0, 36.0), 0.6), IRON_DK, "body", 0, 1)
    f.add(Geo().blob((-4.0, -41.4, 34.4), (1.6, 1.6, 2.0), p=2.6), None, "body", 0, 1, glow=FIRE, outline=0.4)
    # rubble: sleepers, rails, the team beam
    g = Geo()
    for k in range(7):
        g.blob((-6 + (k * 7) % 28, -34 + k * 10.0, 1.2 + (k % 2) * 1.6), (2.4, 10.0, 1.2), p=4.0, rot=(0, 0, k * 31))
    f.add(g, TIMBER_DK, "rubble")
    g = Geo()
    for k in range(3):
        g.capsule((-8 + k * 8, -36 + k * 6, 1.0), (4 + k * 10, 30 - k * 10, 1.0), 1.0)
    f.add(g, IRON_LT, "rubble", finish="metal")
    f.add(Geo().blob((16, 0, 1.4), (4.0, 20.0, 1.2), p=4.0, rot=(0, 0, 24)), None, "rubble", team=True)
    scaffold(f, -10, 10, -42, 42, 44)


RAIL_BARRICADE = make("rail_barricade", "Rail Barricade", AGE, "wall", _rail_barricade, canvas=(300, 250),
                      feet=(150, 218), height=84, hit=(3, 26), material="metal", flag=(-10.0, 0.0, 0.0, 80.0),
                      flag_len=22.0, foot=28.0, yaw=-38.0, pole_fill=IRON_DK, tip_fill=BRASS_LT)


# ================================================================================ Tesla Pylon (tower)
TOP = 58.0


def _tesla_pylon(f):
    # a concrete plinth with a team plate and a cream cog
    f.add(Geo().blob((0, 0, 3.4), (13.0, 13.0, 3.4), p=5.0), CONCRETE, "body", 0, 3, outline=0.5)
    f.add(Geo().blob((0, -13.4, 3.6), (8.0, 0.7, 2.6), p=4.0), None, "body", 0, 2, team=True, outline=0.3)
    _cog(f, (0.0, 3.6), 0.8, -14.2, lo=0, hi=2)
    # the tapering iron lattice (four legs and X braces), losing its top as it breaks
    legs = [(-5.0, -5.0), (5.0, -5.0), (-5.0, 5.0), (5.0, 5.0)]

    def lattice(z1, lo, hi, lean=0.0):
        g = Geo()
        for (x, y) in legs:
            g.capsule((x * 1.9, y * 1.9, 6.0), (x * (1.0 - 0.0) + lean, y, z1), 1.1, 0.9)
        nb = int((z1 - 6.0) // 9.0)
        for b in range(nb):
            za, zb = 6.0 + b * 9.0, 6.0 + (b + 1) * 9.0

            def at(x, y, z):
                t = (z - 6.0) / max(1.0, z1 - 6.0)
                k = 1.9 - 0.9 * t
                return (x * k + lean * t, y * k, z)
            for (a, c) in ((legs[0], legs[1]), (legs[1], legs[3]), (legs[0], legs[2])):
                g.capsule(at(a[0], a[1], za), at(c[0], c[1], zb), 0.45)
                g.capsule(at(c[0], c[1], za), at(a[0], a[1], zb), 0.45)
        f.add(g, IRON_LT, "body", lo, hi, outline=0.35)
    lattice(TOP - 6.0, 0, 1)
    lattice(34.0, 2, 2, lean=3.0)
    lattice(18.0, 3, 3)
    # brass coil rings up the mast (the lowest stays longest), porcelain insulators
    for (z, r, hi) in ((20.0, 9.0, 2), (32.0, 7.6, 1), (44.0, 6.2, 1)):
        g = Geo().lathe([(r, -0.9), (r + 1.0, 0), (r, 0.9), (r - 0.6, 0)], (0, 0, z), (0, 0, z + 0.01), segs=24)
        f.add(g, BRASS, "body", 0, hi, finish="metal", outline=0.35)
    g = Geo()
    for z in (TOP - 6.0, TOP - 3.2):
        g.lathe([(2.4, -0.8), (3.2, 0), (2.4, 0.8)], (0, 0, z), (0, 0, z + 0.01), segs=16)
    g.capsule((0, 0, TOP - 8.0), (0, 0, TOP - 1.0), 1.6)
    f.add(g, CREAM, "body", 0, 1, outline=0.3)
    # the copper sphere on top (the muzzle; it glows) with a brass collar
    f.add(Geo().lathe([(0, 0), (3.6, 0), (3.0, 1.6), (0, 1.6)], (0, 0, TOP - 1.0), (0, 0, TOP + 0.6), segs=18), BRASS_LT,
          "body", 0, 1, finish="metal")
    f.add(Geo().sphere((0, 0, TOP + 5.2), 5.4, cuts=5), COPPER, "body", 0, 0, finish="metal", outline=0.5)
    f.add(Geo().sphere((-1.6, -2.4, TOP + 6.8), 1.8, cuts=3), None, "body", 0, 0, glow=ARC, outline=0)
    f.add(Geo().sphere((0, 0, TOP + 4.8), 4.6, cuts=4), COPPER, "body", 1, 1, finish="metal", outline=0.5)  # 66%: dented
    # little arcs crackling between the rings (light family stays in the meta; drawn as glow strokes)
    g = Geo()
    for k, (z0, z1, a) in enumerate(((32.0, 44.0, 0.6), (20.0, 32.0, 2.4))):
        r0, r1 = 7.6 if k == 0 else 9.0, 6.2 if k == 0 else 7.6
        p0 = (r0 * math.cos(a), r0 * math.sin(a), z0)
        pm = ((r0 + r1) / 2 * math.cos(a + 0.4) + 1.6, (r0 + r1) / 2 * math.sin(a + 0.4), (z0 + z1) / 2)
        p1 = (r1 * math.cos(a), r1 * math.sin(a), z1)
        g.capsule(p0, pm, 0.35).capsule(pm, p1, 0.35)
    f.add(g, None, "body", 0, 0, glow=ARC, outline=0.15)
    # a hazard-striped warning sign on the leg, a cable to a junction box
    f.add(Geo().blob((7.0, -10.6, 12.0), (2.8, 0.5, 2.8), p=3.0, rot=(0, 45, 0)), STRIPE_LT, "body", 0, 2, outline=0.4)
    f.add(Geo().star((7.0, -11.2, 12.0), 1.6, 0.6, 0.3, points=4, rot=(0, 20, 0)), STRIPE_DK, "body", 0, 2, outline=0)
    f.add(Geo().blob((-16.0, -6.0, 3.6), (3.2, 2.6, 3.6), p=5.0), IRON_DK, "body", 0, 3, finish="metal", outline=0.4)
    g = Geo().capsule((-13.0, -6.0, 3.0), (-9.0, -6.0, 1.0), 0.6).capsule((-9.0, -6.0, 1.0), (-6.0, -4.0, 6.4), 0.6)
    f.add(g, COAL, "body", 0, 3, outline=0.2)
    # rubble: girders, the sphere, ring pieces
    g = Geo()
    for k in range(5):
        a = k * 1.2 + 0.3
        g.capsule((-10 + k * 4.0, -8 + k * 3.0, 1.0), (-10 + k * 4.0 + 24 * math.cos(a), -8 + k * 3.0 + 16 * math.sin(a), 1.0),
                  1.0)
    f.add(g, IRON, "rubble", finish="metal")
    f.add(Geo().sphere((18.0, -6.0, 4.2), 4.4, cuts=4), COPPER, "rubble", finish="metal")
    f.add(Geo().lathe([(7.0, -0.8), (8.0, 0), (7.0, 0.8)], (-4, 8, 1.0), (-4, 8, 1.01), segs=20, rot=(10, 0, 0)), BRASS,
          "rubble", finish="metal")
    f.add(Geo().blob((0, 0, 2.4), (12, 12, 2.4), p=4.0), CONCRETE, "rubble")
    f.add(Geo().blob((4, -14, 1.0), (6, 3, 0.8), p=4.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -12, 12, -12, 12, TOP)


TESLA_PYLON = make("tesla_pylon", "Tesla Pylon", AGE, "tower", _tesla_pylon, canvas=(240, 300), feet=(118, 266),
                   height=100, hit=(0, 30), material="metal", flag=(-16.0, 8.0, 0.0, 44.0), flag_len=16.0, foot=18.0,
                   yaw=-14.0, muzzle=(0.0, 0.0, TOP + 5.2), lights=[((0.0, 0.0, TOP + 5.2), 14, 1)],
                   pole_fill=IRON_DK, tip_fill=BRASS_LT)


FORTS = [TRENCH_PARAPET, SNIPER_NEST, RECRUITING_DEPOT, TRIPWIRE_CHARGE, RAIL_BARRICADE, TESLA_PYLON]
