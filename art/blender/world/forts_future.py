"""Future forts in the cartoon style (DESIGN A16.14.4; the MVP release check flagged the realistic ones;
CONTENT_PLAN 5.7 adds the Skyguard Pylon and the Mech Bay).

Built with `world/fort_toon.py` (the cartoon unit look, the fort sheet contract of
`src/visuals/fortViews/atlasFortView.ts`). Heights, hit points, flag points and the crewless towers' muzzles
follow the realistic forts they replace, so the game's placement lines up unchanged. Palette: the Future
units' glossy white, charcoal and trim, mint and magenta energy (outside the team hue bands, A11); team colour
on panels and plates, each with the pale Future hex.

  hardlight_barrier  wall   two white emitter posts with team caps and a wide mint hardlight wall between them
                            (cracking and flickering out as it breaks), a team base plate, warning chevrons
  sentry_pylon       tower  (crewless) a white pylon on a hex foot with a team collar and a sensor head: a dark
                            visor with mint robot eyes and a short laser barrel (the muzzle)
  clone_bay          camp   a white dome lab on a charcoal plinth, a team band with the hex, glowing clone vats
                            in the window, a mint door that slides open
  grav_mire          trap   a charcoal hex floor plate with a dim ring (unarmed), a mint gravity well (armed),
                            a violet-white implosion (sprung), a scorched spent plate
  skyguard_pylon     tower  (crewless, sky) a tall white mast with a team collar and a radar dish, a twin
                            anti-air laser angled up at the top (the muzzle)
  mech_bay           camp   a white hangar with a team roof band and the hex, a crane arm with a hook, a team
                            rolling shutter door (the door family), a mint hazard light

Run: `<venv>/bin/python art/blender/world/render_forts.py --age future --out <scratch> [--only a,b] [--install]`.
"""
import math

from ageborn_art.geometry import Geo

from world.common import rock
from world.fort_toon import make, scaffold

AGE = "future"
WHITE = "#E9EDF2"
WHITE_DK = "#C9D0D9"
TRIM = "#A9B1BD"
CHARCOAL = "#2E323C"
CHAR_LT = "#444A57"
GUNMETAL = "#3A3F4A"
VISOR = "#1B1E25"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
HOLO = "#9FF5D8"
MAGENTA = "#F03AA8"
HEX = "#E9EDF2"
VOIDL = "#C9B8F0"
SCORCH = "#3A3640"
STRIPE = "#D9DEE5"


def _hex(f, c, s, y, fam="body", lo=0, hi=1):
    """The pale Future hex ring with a dot on a team surface facing -y."""
    x, z = c
    g = Geo()
    pts = [(x + 3.2 * s * math.cos(math.radians(30 + 60 * k)), z + 3.2 * s * math.sin(math.radians(30 + 60 * k))) for k in range(7)]
    for (a, b) in zip(pts, pts[1:]):
        g.capsule((a[0], y, a[1]), (b[0], y, b[1]), 0.55 * s)
    g.sphere((x, y, z), 0.9 * s, cuts=2)
    f.add(g, HEX, fam, lo, hi, outline=0)


def _hex_x(f, c, s, x, fam="body", lo=0, hi=1):
    """The same hex on a team surface facing +x (the lane side)."""
    y, z = c
    g = Geo()
    pts = [(y + 3.2 * s * math.cos(math.radians(30 + 60 * k)), z + 3.2 * s * math.sin(math.radians(30 + 60 * k))) for k in range(7)]
    for (a, b) in zip(pts, pts[1:]):
        g.capsule((x, a[0], a[1]), (x, b[0], b[1]), 0.55 * s)
    g.sphere((x, y, z), 0.9 * s, cuts=2)
    f.add(g, HEX, fam, lo, hi, outline=0)


def _hexfoot(f, r, h, lo=0, hi=3, fam="body", x=0.0, y=0.0):
    """A charcoal hex foot with a white rim and a mint glow seam."""
    g = Geo().lathe([(0, 0), (r, 0), (r, h), (0, h)], (x, y, 0), (x, y, 1), segs=6, squash=(1.0, 0.85))
    f.add(g, CHARCOAL, fam, lo, hi, outline=0.5)
    g = Geo().lathe([(r - 0.6, h - 0.6), (r + 0.6, h - 0.6), (r + 0.6, h + 0.8), (r - 0.6, h + 0.8)], (x, y, 0), (x, y, 1),
                    segs=6, squash=(1.0, 0.85))
    f.add(g, WHITE, fam, lo, hi, outline=0.4, finish="gloss")
    g = Geo().lathe([(r - 1.6, 1.0), (r + 0.2, 1.0), (r + 0.2, 1.8), (r - 1.6, 1.8)], (x, y, 0), (x, y, 1), segs=6,
                    squash=(1.0, 0.85))
    f.add(g, None, fam, lo, hi, glow=MINT, outline=0)


# ========================================================================== Hardlight Barrier (wall)
def _hardlight(f):
    f.add(Geo().blob((0, 0, 1.0), (14, 44, 2.0), p=3.0), CHARCOAL, "body", 0, 3, outline=0.5)        # base plate
    f.add(Geo().blob((6.0, 0, 1.6), (2.6, 40, 1.4), p=3.4), None, "body", 0, 2, team=True, outline=0.3)
    g = Geo()
    for k in range(6):
        y = -34.0 + k * 13.6
        g.blob((12.6, y, 1.8), (0.6, 2.6, 0.8), p=3.0, rot=(0, 0, 30))
    f.add(g, STRIPE, "body", 0, 2, outline=0)                                                      # chevrons
    # the two emitter posts (white, team caps, mint emitter strips), the near one breaks at 33%
    for (y, st) in ((-36.0, 3), (36.0, 4)):
        def post(fallen, y=y):
            if not fallen:
                g = Geo().blob((0, y, 30.0), (5.0, 5.0, 30.0), p=3.4, taper=(0.85, 1.0))
                return g, WHITE
            return Geo().blob((14.0, y + 6.0, 4.0), (16.0, 4.2, 4.0), p=3.4, rot=(0, 0, 30)), WHITE_DK
        f.breakable(post, st, finish="gloss")
        f.add(Geo().blob((0, y, 61.0), (6.0, 6.0, 3.6), p=3.0), None, "body", 0, min(3, st - 1), team=True, outline=0.4)
        f.add(Geo().capsule((5.0, y - 1.0, 8.0), (5.0, y - 1.0, 56.0), 1.0), None, "body", 0, min(3, st - 1), glow=MINT,
              outline=0.3)
    # the hardlight wall between them: intact, cracked (66%), patchy (33%), gone (12%)
    for (st, z_top, bands) in ((0, 56.0, 3), (1, 50.0, 3), (2, 30.0, 2)):
        g = Geo().blob((0, 0, z_top / 2 + 2.0), (1.4, 33.0, z_top / 2 - 1.0), p=5.0)
        f.add(g, None, "body", st, st, glow=HOLO, outline=0.8)
        g = Geo()
        for b in range(bands):
            z = 10.0 + b * (z_top - 12.0) / max(1, bands - 1)
            g.blob((0.6, 0, z), (1.0, 33.0, 0.7), p=4.0)
        f.add(g, None, "body", st, st, glow=MINT_CORE, outline=0)
        if st >= 1:
            g = Geo()
            for k in range(4):
                a = 0.6 + k * 0.9
                g.capsule((1.4, -4.0 + k * 3.0, z_top * 0.55), (1.4, -4.0 + k * 3.0 + 9 * math.cos(a), z_top * 0.55 + 9 * math.sin(a)), 0.4)
            f.add(g, CHAR_LT, "body", st, st, outline=0)                                         # cracks
    _hex_x(f, (0.0, 1.6), 1.2, 13.0, lo=0, hi=2)
    # rubble: post pieces, the plate, team panel shards
    g = Geo()
    for k in range(6):
        g.blob((-8 + k * 5.0, -30 + k * 11.0, 2.0), (3.6, 2.6, 2.0), p=3.0, rot=(0, 0, k * 40))
    f.add(g, WHITE_DK, "rubble", finish="gloss")
    f.add(Geo().blob((0, 0, 1.0), (14, 44, 2.0), p=3.0), CHARCOAL, "rubble")
    f.add(Geo().blob((12, 4, 2.2), (6, 9, 0.8), p=3.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -8, 8, -42, 42, 58, wood=TRIM, rope=CHAR_LT)


HARDLIGHT_BARRIER = make("hardlight_barrier", "Hardlight Barrier", AGE, "wall", _hardlight, canvas=(300, 250),
                         feet=(150, 218), height=90, hit=(2, 32), material="energy", flag=(-10.0, 0.0, 0.0, 84.0),
                         flag_len=20.0, foot=28.0, yaw=-38.0, pole_fill=CHAR_LT, tip_fill=MINT)


# ============================================================================== Sentry Pylon (tower)
SP_TOP = 44.0
SP_MUZ = (19.0, 0.0, 50.8)


def _sentry(f):
    _hexfoot(f, 12.0, 4.0)
    # the pylon: a tapering white column with a team collar, in three pieces that fall from the top
    for (z0, z1, st) in ((4.0, 18.0, 4), (18.0, 32.0, 3), (32.0, SP_TOP, 2)):
        def piece(fallen, z0=z0, z1=z1):
            if not fallen:
                k0, k1 = 1.0 - 0.25 * z0 / SP_TOP, 1.0 - 0.25 * z1 / SP_TOP
                return Geo().lathe([(0, z0), (6.0 * k0, z0), (6.0 * k1, z1), (0, z1)], (0, 0, 0), (0, 0, 1), segs=16), WHITE
            return Geo().blob((14.0 + z0 * 0.2, -6.0 + z0 * 0.3, 3.0), (7.0, 4.0, 3.0), p=3.0, rot=(0, 0, z0 * 3)), WHITE_DK
        f.breakable(piece, st, finish="gloss")
    f.add(Geo().lathe([(0, 22.0), (5.8, 22.0), (5.8, 27.0), (0, 27.0)], (0, 0, 0), (0, 0, 1), segs=16), None, "body", 0, 2,
          team=True, outline=0.4)
    f.add(Geo().capsule((5.4, -2.0, 6.0), (4.6, -2.0, 40.0), 0.7), None, "body", 0, 1, glow=MINT, outline=0.3)
    _hex(f, (0.0, 24.5), 0.7, -6.2, lo=0, hi=2)
    # the sensor head: a white pod with a dark visor and mint eyes, a short laser barrel with a magenta ring
    f.add(Geo().blob((2.0, 0, SP_TOP + 6.0), (9.0, 7.6, 6.4), p=2.4), WHITE, "body", 0, 1, finish="gloss")
    f.add(Geo().blob((-1.0, 0, SP_TOP + 10.0), (7.0, 7.8, 2.4), p=2.6), None, "body", 0, 1, team=True, outline=0.4)
    f.add(Geo().blob((8.6, -2.6, SP_TOP + 7.2), (3.0, 4.6, 2.6), p=3.0), VISOR, "body", 0, 1, finish="gloss", outline=0.4)
    g = Geo().sphere((10.6, -4.2, SP_TOP + 7.6), 1.2, cuts=2).sphere((10.4, -0.8, SP_TOP + 7.6), 1.0, cuts=2)
    f.add(g, None, "body", 0, 1, glow=MINT, outline=0)
    f.add(Geo().capsule((8.0, 0, SP_MUZ[2]), (SP_MUZ[0] - 1.0, 0, SP_MUZ[2]), 1.8, 1.4), GUNMETAL, "body", 0, 1,
          finish="metal", outline=0.4)
    f.add(Geo().lathe([(1.0, 0), (2.6, 0.2), (2.6, 1.2), (1.2, 1.4)], (SP_MUZ[0] - 2.0, 0, SP_MUZ[2]), (SP_MUZ[0], 0, SP_MUZ[2]),
                      segs=14), MAGENTA, "body", 0, 1, outline=0.3)
    f.add(Geo().blob((4.0, 0, SP_TOP + 2.0), (8.0, 7.0, 5.0), p=2.4, rot=(0, 30, 20)), WHITE_DK, "body", 2, 2, finish="gloss")
    # rubble
    g = Geo()
    for k in range(5):
        g.blob((-10 + k * 6.0, -8 + (k % 2) * 10, 2.4), (4.0, 3.0, 2.4), p=3.0, rot=(0, 0, k * 50))
    f.add(g, WHITE_DK, "rubble", finish="gloss")
    f.add(Geo().blob((10, -6, 3.0), (8.0, 6.4, 3.0), p=2.4), WHITE, "rubble", finish="gloss")
    f.add(Geo().blob((-6, 8, 1.0), (6, 4, 0.8), p=3.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -12, 12, -10, 10, SP_TOP + 8, wood=TRIM, rope=CHAR_LT)


SENTRY_PYLON = make("sentry_pylon", "Sentry Pylon", AGE, "tower", _sentry, canvas=(240, 260), feet=(118, 228),
                    height=72, hit=(0, 30), material="metal", flag=(-9.0, 8.0, 14.0, 42.0), flag_len=12.0, foot=16.0,
                    yaw=-14.0, muzzle=SP_MUZ, lights=[((10.6, -4.2, SP_TOP + 7.6), 6, 1)], pole_fill=CHAR_LT,
                    tip_fill=MINT)


# ================================================================================= Clone Bay (camp)
CB_R = 22.0


def _clone_bay(f):
    f.add(Geo().blob((0, 0, 3.0), (CB_R + 6.0, CB_R * 0.75 + 4.0, 3.0), p=3.0), CHARCOAL, "body", 0, 3, outline=0.5)
    f.add(Geo().blob((0, 0, 5.8), (CB_R + 6.4, CB_R * 0.75 + 4.4, 0.6), p=3.0), None, "body", 0, 3, glow=MINT, outline=0)
    # the dome in three crumble shells (the top cracks off first)
    for (st, zcut) in ((0, None), (1, 26.0), (2, 17.0), (3, 11.0)):
        g = Geo().blob((0, 0, 6.0), (CB_R, CB_R * 0.75, 26.0), p=2.2)
        g.clip((0, 0, 6.0), (0, 0, -1))
        if zcut:
            g.clip((0, 0, zcut), (0, 0, 1))
        f.add(g, WHITE, "body", st, st, finish="gloss")
    band = Geo().blob((0, 0, 14.0), (CB_R + 0.4, CB_R * 0.75 + 0.4, 3.4), p=3.0)
    f.add(band, None, "body", 0, 2, team=True, outline=0.4)
    _hex(f, (10.0, 14.0), 1.0, -CB_R * 0.75 - 0.9, lo=0, hi=2)
    # the window with the clone vats glowing behind it
    f.add(Geo().blob((-9.0, -CB_R * 0.62, 22.0), (6.0, 1.6, 4.0), p=3.0), VISOR, "body", 0, 1, finish="gloss", outline=0.4)
    g = Geo()
    for k in range(3):
        g.capsule((-13.0 + k * 4.0, -CB_R * 0.62 - 1.0, 19.6), (-13.0 + k * 4.0, -CB_R * 0.62 - 1.0, 24.4), 1.3)
    f.add(g, None, "body", 0, 1, glow=HOLO, outline=0)
    # the doorway and the sliding door (door family: closed, half, open)
    f.add(Geo().blob((8.0, -CB_R * 0.72, 9.0), (5.0, 1.4, 6.6), p=4.0), CHARCOAL, "body", 0, 3, outline=0)
    for i, dx in enumerate((0.0, 5.0, 9.4)):
        f.add(Geo().blob((8.0 + dx, -CB_R * 0.74 - 0.8, 9.0), (4.6, 0.8, 6.2), p=4.0), None, "door", i, i, glow=HOLO,
              outline=0.5)
    # an antenna with a mint beacon, vents on the roof
    f.add(Geo().capsule((-6.0, 6.0, 28.0), (-7.0, 6.0, 44.0), 0.7), CHAR_LT, "body", 0, 1)
    f.add(Geo().sphere((-7.0, 6.0, 44.6), 1.6, cuts=3), None, "body", 0, 1, glow=MAGENTA, outline=0.3)
    f.add(Geo().blob((6.0, 4.0, 30.0), (4.0, 3.0, 1.6), p=3.0), GUNMETAL, "body", 0, 0, outline=0.4)
    # rubble
    g = Geo()
    for k in range(10):
        g.blob((-18 + (k * 7) % 36, -12 + (k * 5) % 20, 2.4 + (k % 3) * 0.8), (4.0, 3.0, 1.6), p=2.4, rot=(0, 0, k * 33))
    f.add(g, WHITE_DK, "rubble", finish="gloss")
    f.add(Geo().blob((0, 0, 3.0), (CB_R + 6.0, CB_R * 0.75 + 4.0, 3.0), p=3.0), CHARCOAL, "rubble")
    f.add(Geo().blob((-10, -10, 6.4), (8, 5, 1.0), p=3.0), None, "rubble", team=True)
    scaffold(f, -CB_R - 3, CB_R + 3, -CB_R * 0.75 - 3, CB_R * 0.75 + 3, 34, levels=1, wood=TRIM, rope=CHAR_LT)


CLONE_BAY = make("clone_bay", "Clone Bay", AGE, "camp", _clone_bay, canvas=(300, 250), feet=(150, 214), height=70,
                 hit=(0, 14), material="metal", flag=(-30.0, 16.0, 0.0, 58.0), flag_len=18.0, foot=30.0, yaw=-24.0,
                 lights=[((-7.0, 6.0, 44.6), 6, 1)], pole_fill=CHAR_LT, tip_fill=MINT)


# ================================================================================= Grav Mire (trap)
def _grav(f):
    _hexfoot(f, 13.0, 1.6, lo=0, hi=2, fam="trap")
    f.add(Geo().blob((0, 0, 1.6), (13.5, 11.5, 1.0), p=3.0), SCORCH, "trap", 3, 3, outline=0)
    # unarmed: a dim ring and folded emitters; armed: a glowing gravity well with orbiting specks
    f.add(Geo().lathe([(7.0, 2.0), (8.6, 2.0), (8.6, 2.6), (7.0, 2.6)], (0, 0, 0), (0, 0, 1), segs=24, squash=(1.0, 0.85)),
          CHAR_LT, "trap", 0, 0, outline=0.3)
    f.add(Geo().lathe([(0, 2.0), (8.6, 2.0), (8.0, 3.4), (0, 3.0)], (0, 0, 0), (0, 0, 1), segs=24, squash=(1.0, 0.85)),
          None, "trap", 1, 1, glow=HOLO, outline=0.4)
    f.add(Geo().lathe([(0, 2.6), (4.6, 2.6), (4.0, 4.0), (0, 3.8)], (0, 0, 0), (0, 0, 1), segs=20, squash=(1.0, 0.85)),
          None, "trap", 1, 1, glow=MINT_CORE, outline=0)
    g = Geo()
    for k in range(5):
        a = k * 2 * math.pi / 5
        g.sphere((9.6 * math.cos(a), 8.0 * math.sin(a), 5.0 + (k % 2) * 2.0), 0.9, cuts=2)
    f.add(g, None, "trap", 1, 1, glow=MINT, outline=0.2)
    # sprung: an implosion (a violet-white core and inward streaks); spent: a scorched cracked plate
    f.add(Geo().sphere((0, 0, 6.0), 5.4, cuts=4), None, "trap", 2, 2, glow=VOIDL, outline=0.4)
    g = Geo()
    for k in range(8):
        a = k * 2 * math.pi / 8
        g.capsule((13.0 * math.cos(a), 11.0 * math.sin(a), 3.0), (7.0 * math.cos(a), 6.0 * math.sin(a), 5.0), 0.6, 0.2)
    f.add(g, None, "trap", 2, 2, glow=MINT_CORE, outline=0)
    g = Geo()
    for k in range(6):
        a = k * 2 * math.pi / 6 + 0.3
        rock(g, (12.0 * math.cos(a), 10.0 * math.sin(a), 1.2), (2.4, 1.8, 1.0), seed=80 + k, jag=0.2)
    f.add(g, CHARCOAL, "trap", 3, 3)
    # a team marker post (every frame)
    f.add(Geo().capsule((-17.0, 9.0, 0), (-17.4, 9.0, 14.0), 0.8), CHAR_LT, "trap", 0, 3)
    f.add(Geo().slab([(-17.4, 13.6), (-24.0, 12.2), (-22.4, 9.6), (-17.4, 10.0)], 9.0, 1.0), None, "trap", 0, 3, team=True,
          outline=0.5)
    f.add(Geo().blob((-14.0, 11.0, 1.8), (3.0, 2.4, 1.8), p=2.4), None, "trap", 0, 3, team=True, outline=0.5)


GRAV_MIRE = make("grav_mire", "Grav Mire", AGE, "trap", _grav, canvas=(200, 120), feet=(100, 92), height=24, hit=(0, 6),
                 material="energy", foot=28.0, yaw=-12.0)


# ====================================================================== Skyguard Pylon (sky tower)
SG_TOP = 58.0
SG_MUZ = (14.0, 0.0, SG_TOP + 14.0)


def _skyguard(f):
    _hexfoot(f, 13.0, 4.0)
    # the mast: a white lattice-free column with fins, breaking in three
    for (z0, z1, st) in ((4.0, 22.0, 4), (22.0, 40.0, 3), (40.0, SG_TOP, 2)):
        def piece(fallen, z0=z0, z1=z1):
            if not fallen:
                k0, k1 = 1.0 - 0.35 * z0 / SG_TOP, 1.0 - 0.35 * z1 / SG_TOP
                return Geo().lathe([(0, z0), (5.6 * k0, z0), (5.6 * k1, z1), (0, z1)], (0, 0, 0), (0, 0, 1), segs=16), WHITE
            return Geo().blob((16.0 + z0 * 0.15, -4.0 + z0 * 0.2, 3.0), (8.0, 3.6, 3.0), p=3.0, rot=(0, 0, z0 * 4)), WHITE_DK
        f.breakable(piece, st, finish="gloss")
    g = Geo()
    for a in (0, 120, 240):
        ca, sa = math.cos(math.radians(a)), math.sin(math.radians(a))
        g.blob((6.0 * ca, 6.0 * sa, 12.0), (3.6 * abs(ca) + 1.0, 3.6 * abs(sa) + 1.0, 8.0), p=2.6)
    f.add(g, WHITE_DK, "body", 0, 3, finish="gloss")                                               # base fins
    f.add(Geo().lathe([(0, 30.0), (5.0, 30.0), (5.0, 35.0), (0, 35.0)], (0, 0, 0), (0, 0, 1), segs=16), None, "body", 0, 2,
          team=True, outline=0.4)
    _hex(f, (0.0, 32.5), 0.7, -5.6, lo=0, hi=2)
    f.add(Geo().capsule((4.6, -2.0, 6.0), (3.8, -2.0, 54.0), 0.7), None, "body", 0, 1, glow=MINT, outline=0.3)
    # a radar dish on an arm, the twin AA laser head angled up
    f.add(Geo().capsule((-2.0, 4.0, 46.0), (-10.0, 6.0, 52.0), 1.0), CHAR_LT, "body", 0, 1)
    f.add(Geo().lathe([(0, -1.6), (6.0, -0.4), (8.0, 2.4), (6.6, 2.6), (0, 0.4)], (-12.0, 6.0, 54.0), (-13.0, 6.6, 55.6),
                      segs=20), WHITE, "body", 0, 1, finish="gloss", outline=0.4)
    f.add(Geo().blob((0, 0, SG_TOP + 4.0), (7.4, 7.0, 5.4), p=2.4), WHITE, "body", 0, 1, finish="gloss")
    f.add(Geo().blob((-1.0, 0, SG_TOP + 7.6), (6.0, 7.2, 2.0), p=2.6), None, "body", 0, 1, team=True, outline=0.4)
    f.add(Geo().blob((5.6, -3.0, SG_TOP + 4.6), (2.4, 3.6, 2.2), p=3.0), VISOR, "body", 0, 1, finish="gloss", outline=0.4)
    f.add(Geo().sphere((7.4, -4.4, SG_TOP + 5.0), 1.0, cuts=2), None, "body", 0, 1, glow=MINT, outline=0)
    g = Geo()
    for y in (-2.6, 2.6):
        g.capsule((3.0, y, SG_TOP + 6.0), (SG_MUZ[0] - 1.0, y, SG_MUZ[2]), 1.3, 1.0)
    f.add(g, GUNMETAL, "body", 0, 1, finish="metal", outline=0.4)
    g = Geo()
    for y in (-2.6, 2.6):
        g.lathe([(0.8, 0), (2.0, 0.2), (2.0, 1.0), (1.0, 1.2)], (SG_MUZ[0] - 1.6, y, SG_MUZ[2] - 0.9),
                (SG_MUZ[0] - 0.6, y, SG_MUZ[2] - 0.3), segs=12)
    f.add(g, MAGENTA, "body", 0, 1, outline=0.3)
    f.add(Geo().blob((4.0, 0, SG_TOP - 14.0), (7.0, 6.0, 4.4), p=2.4, rot=(0, 40, 10)), WHITE_DK, "body", 2, 2, finish="gloss")
    # rubble
    g = Geo()
    for k in range(6):
        g.blob((-12 + k * 6.0, -8 + (k % 2) * 10, 2.4), (4.4, 3.0, 2.4), p=3.0, rot=(0, 0, k * 47))
    f.add(g, WHITE_DK, "rubble", finish="gloss")
    f.add(Geo().blob((12, -6, 3.0), (7.4, 6.0, 3.0), p=2.4), WHITE, "rubble", finish="gloss")
    f.add(Geo().blob((-6, 8, 1.0), (6, 4, 0.8), p=3.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -12, 12, -10, 10, SG_TOP + 6, wood=TRIM, rope=CHAR_LT)


SKYGUARD_PYLON = make("skyguard_pylon", "Skyguard Pylon", AGE, "tower", _skyguard, canvas=(240, 300), feet=(118, 266),
                      height=100, hit=(0, 30), material="metal", flag=(-16.0, 8.0, 0.0, 44.0), flag_len=16.0, foot=18.0,
                      yaw=-14.0, muzzle=SG_MUZ, lights=[((7.4, -4.4, SG_TOP + 5.0), 6, 1)], pole_fill=CHAR_LT,
                      tip_fill=MINT)


# ==================================================================================== Mech Bay (camp)
MW, MD, MH = 46.0, 26.0, 24.0


def _mech_bay(f):
    f.add(Geo().blob((0, 0, 1.6), (MW / 2 + 6, MD / 2 + 4, 1.6), p=4.0), CHARCOAL, "body", 0, 3, outline=0.5)
    # the hangar walls in three bands (the top breaks first), a rounded roof
    for (z0, z1, st) in ((1.6, 10.0, 4), (10.0, 18.0, 3), (18.0, MH, 2)):
        f.add(Geo().blob((0, 0, (z0 + z1) / 2), (MW / 2, MD / 2, (z1 - z0) / 2 + 0.2), p=6.0), WHITE, "body", 0,
              min(3, st - 1), finish="gloss", outline=0.5)
        if st <= 3:
            g = Geo()
            for k in range(6):
                g.blob((MW / 2 + 6 + (k % 3) * 5, -MD / 2 + k * 4.0, 2.4), (3.4, 2.4, 2.0), p=3.0, rot=(0, 0, k * 30))
            f.add(g, WHITE_DK, "body", st, 3, finish="gloss")
    g = Geo().blob((0, 0, MH), (MW / 2 + 1.4, MD / 2 + 1.4, 8.0), p=2.4)
    g.clip((0, 0, MH), (0, 0, -1))
    f.add(g, CHAR_LT, "body", 0, 0, finish="gloss", outline=0.5)
    g = Geo().blob((MW * 0.2, 0, MH), (MW * 0.3, MD / 2 + 1.4, 6.0), p=2.4)
    g.clip((0, 0, MH), (0, 0, -1))
    f.add(g, CHAR_LT, "body", 1, 1, finish="gloss", outline=0.5)
    f.add(Geo().blob((0, -MD / 2 - 0.2, MH - 2.6), (MW / 2 - 1.0, 0.9, 2.4), p=4.0), None, "body", 0, 1, team=True, outline=0.4)
    _hex(f, (MW / 2 - 7.0, MH - 2.6), 0.6, -MD / 2 - 1.2, lo=0, hi=1)
    # the doorway and the team rolling shutter (door family: closed, half, open)
    f.add(Geo().blob((-6.0, -MD / 2 + 0.2, 8.6), (8.0, 0.6, 8.0), p=4.0), VISOR, "body", 0, 3, outline=0)
    for i, frac in enumerate((1.0, 0.5, 0.08)):
        h = 8.0 * frac
        g = Geo().blob((-6.0, -MD / 2 - 1.0, 16.6 - h), (8.0, 0.8, h), p=4.0)
        f.add(g, None, "door", i, i, team=True, outline=0.4)
        g = Geo()
        nz = max(1, int(h * 2 / 3.0))
        for k in range(nz):
            g.blob((-6.0, -MD / 2 - 1.8, 16.6 - 2 * h + 1.5 + k * 3.0), (7.6, 0.3, 0.3), p=3.0)
        f.add(g, STRIPE, "door", i, i, outline=0)
    # a crane arm with a hook on the roof, a mint hazard light, chevrons beside the door
    f.add(Geo().capsule((14.0, 6.0, MH + 4.0), (14.0, 6.0, MH + 20.0), 1.4), CHAR_LT, "body", 0, 1, finish="metal")
    f.add(Geo().capsule((14.0, 6.0, MH + 19.0), (-8.0, 2.0, MH + 22.0), 1.2), WHITE, "body", 0, 1, finish="gloss")
    f.add(Geo().capsule((-8.0, 2.0, MH + 22.0), (-8.0, 2.0, MH + 12.0), 0.3), GUNMETAL, "body", 0, 1)
    f.add(Geo().lathe([(0, 0), (1.6, 0.4), (1.2, 2.4), (0, 2.6)], (-8.0, 2.0, MH + 9.6), (-8.0, 2.0, MH + 12.0), segs=12),
          GUNMETAL, "body", 0, 1, finish="metal")
    f.add(Geo().sphere((MW / 2 - 2.0, -MD / 2 - 1.0, MH + 1.6), 1.6, cuts=3), None, "body", 0, 2, glow=MINT, outline=0.3)
    g = Geo()
    for k in range(4):
        g.blob((4.4, -MD / 2 - 1.2, 3.0 + k * 3.4), (1.4, 0.4, 0.6), p=3.0, rot=(0, 30, 0))
    f.add(g, STRIPE, "body", 0, 2, outline=0)
    # rubble
    g = Geo()
    for k in range(12):
        g.blob((-18 + (k * 9) % 40, -12 + (k * 5) % 22, 2.0 + (k % 3) * 0.8), (3.6, 2.6, 1.8), p=3.0, rot=(0, 0, k * 29))
    f.add(g, WHITE_DK, "rubble", finish="gloss")
    f.add(Geo().blob((0, 0, 2.4), (MW / 2 - 4, MD / 2 - 3, 2.4), p=4.0), CHARCOAL, "rubble")
    f.add(Geo().blob((-8, -12, 1.4), (8, 5, 1.0), p=3.0), None, "rubble", team=True)
    scaffold(f, -MW / 2 - 3, MW / 2 + 3, -MD / 2 - 3, MD / 2 + 3, MH + 8, levels=1, wood=TRIM, rope=CHAR_LT)


MECH_BAY = make("mech_bay", "Mech Bay", AGE, "camp", _mech_bay, canvas=(300, 250), feet=(150, 214), height=76, hit=(0, 16),
                material="metal", flag=(20.0, 12.0, 0.0, 64.0), flag_len=18.0, foot=28.0, yaw=-24.0,
                lights=[((MW / 2 - 2.0, -MD / 2 - 1.0, MH + 1.6), 8, 2)], pole_fill=CHAR_LT, tip_fill=MINT,
                extra_meta={"flag": {"crumbleMax": 2, "z": "front"}})


FORTS = [HARDLIGHT_BARRIER, SENTRY_PYLON, CLONE_BAY, GRAV_MIRE, SKYGUARD_PYLON, MECH_BAY]
