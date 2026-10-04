"""Cosmic forts in the cartoon style (DESIGN A16.14.4; the MVP release check flagged the realistic ones;
CONTENT_PLAN 5.8 adds the Star Bulwark and the Stardust Snare).

Built with `world/fort_toon.py` (the cartoon unit look, the fort sheet contract of
`src/visuals/fortViews/atlasFortView.ts`). Heights, hit points, flag points and the crewless spire's muzzle
follow the realistic forts they replace (`styles/realistic/forts/cosmic.py`), so the game's placement lines up
unchanged. Palette: the Cosmic units' void, star white, nebula violet, lilac crystal and mint energy (outside the
team hue bands, A11); team colour on facings, bands and plates, each with the pale five-point star.

  void_rampart    wall   a void plinth with five leaning lilac crystal monoliths, team facings with mint seams;
                         the edge and top crystals snap off first
  ion_spire       tower  (crewless) a star-white spire on a void star foot with a team band, three struts holding a
                         floating ring and a floating violet crystal with a robot eye (the muzzle at its tip)
  warp_barracks   camp   a void dais with an upright team portal ring and the pale star, two pylons with mint cores;
                         the portal membrane is the door family (dim, swirling, open)
  void_mine       trap   a void orb on a star marker (unarmed), half sunk with a lilac core (armed), cracked open
                         and blazing (sprung), a crater (spent)
  star_bulwark    wall   (bunker family: cover) a low curved shield wall of star-white armour plates with team
                         panels and the pale star, a mint shield shimmer along the top, a step behind it
  stardust_snare  trap   a star plate: petals folded (unarmed), open with a glittering lilac dust cloud (armed), a
                         sparkling burst with mint streaks (sprung), a dulled dusty plate (spent)

Run: `<venv>/bin/python art/blender/world/render_forts.py --age cosmic --out <scratch> [--only a,b] [--install]`.
"""
import math

from ageborn_art.geometry import Geo

from world.common import rock
from world.fort_toon import make, scaffold

AGE = "cosmic"
VOID = "#241A38"
VOID_LT = "#3A2D56"
VOID_DK = "#170F26"
VIOLET = "#8E44C8"
VIOLET_DK = "#6B3399"
STAR = "#E4E0F4"
STAR_DK = "#C6C0DA"
STAR_TRIM = "#ABA3C6"
STAR_PALE = "#F4F1FF"
MINT = "#3FE0B0"
MINT_CORE = "#D8FFF0"
GLOW = "#C08CFF"
GLOW_CORE = "#F1E6FF"
LILAC = "#C9B6EE"
LILAC_DK = "#9C86C8"
LILAC_CORE = "#F2ECFF"
VISOR = "#140E22"
SCORCH = "#2E2838"


def _star_pts(cx, cz, r_out, r_in, points=5, rot=90.0):
    pts = []
    for k in range(points * 2):
        r = r_out if k % 2 == 0 else r_in
        a = math.radians(rot + 180.0 * k / points)
        pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


def _star(f, c, s, y, fam="body", lo=0, hi=1, fill=STAR_PALE):
    """The pale five-point star on a team surface facing -y."""
    f.add(Geo().slab(_star_pts(c[0], c[1], 3.4 * s, 1.4 * s), y - 0.4, 0.8), fill, fam, lo, hi, outline=0.3)


def _star_x(f, c, s, x, fam="body", lo=0, hi=1):
    """The same star on a team surface facing +x (the lane side)."""
    y, z = c
    g = Geo()
    pts = _star_pts(y, z, 3.4 * s, 1.4 * s)
    for (a, b) in zip(pts, pts[1:] + pts[:1]):
        g.capsule((x, a[0], a[1]), (x, b[0], b[1]), 0.5 * s)
    g.sphere((x, y, z), 1.2 * s, cuts=2)
    f.add(g, STAR_PALE, fam, lo, hi, outline=0)


def _starfoot(f, r, h, lo=0, hi=3, fam="body", x=0.0, y=0.0):
    """A void five-point star foot with a star-white rim and a mint glow seam."""
    g = Geo().star((x, y, h / 2), r + 2.0, r - 3.0, h, points=5, rot=(90, 0, 0))
    f.add(g, VOID_LT, fam, lo, hi, outline=0.5, finish="gloss")
    g = Geo().lathe([(0, h - 0.2), (r - 2.4, h - 0.2), (r - 2.4, h + 1.4), (0, h + 1.4)], (x, y, 0), (x, y, 1), segs=24,
                    squash=(1.0, 0.85))
    f.add(g, STAR, fam, lo, hi, outline=0.4, finish="gloss")
    g = Geo().lathe([(r - 3.4, h + 1.2), (r - 2.2, h + 1.2), (r - 2.2, h + 1.9), (r - 3.4, h + 1.9)], (x, y, 0), (x, y, 1),
                    segs=24, squash=(1.0, 0.85))
    f.add(g, None, fam, lo, hi, glow=MINT, outline=0)


def _crystal(g, base, h, r, lean=0.0, tilt=0.0):
    """A hexagonal crystal standing at `base` (x, y, z) with height h, leaning by `lean` (x) and `tilt` (y)."""
    x, y, z = base
    top = (x + lean, y + tilt, z + h)
    g.lathe([(0, 0), (r, 0.2), (r * 0.92, h * 0.72), (0, h)], (x, y, z), top, segs=6)


# ============================================================================== Void Rampart (wall)
def _rampart(f):
    f.add(Geo().blob((0, 0, 2.0), (12.0, 38.0, 2.4), p=3.0), VOID, "body", 0, 3, outline=0.5)            # plinth
    f.add(Geo().blob((0, 0, 2.6), (12.5, 38.5, 0.6), p=3.0), None, "body", 0, 3, glow=MINT, outline=0)
    f.add(Geo().blob((7.6, 0, 3.0), (2.0, 34.0, 1.6), p=3.4), None, "body", 0, 3, team=True, outline=0.3)
    # five leaning crystal monoliths (the tallest in the middle); each has a team facing and a mint seam
    specs = ((-28.0, 46.0, 4.6, 2), (-14.0, 58.0, 5.4, 3), (0.0, 68.0, 6.0, 3), (14.0, 56.0, 5.4, 3), (28.0, 44.0, 4.6, 1))
    for i, (y, h, r, st) in enumerate(specs):
        lean = -2.0 if i % 2 else -4.0

        def mono(fallen, y=y, h=h, r=r, lean=lean, i=i):
            g = Geo()
            if not fallen:
                _crystal(g, (0, y, 4.0), h, r, lean=lean, tilt=(i - 2) * 0.8)
                return g, LILAC
            g.lathe([(0, 0), (r, 0.2), (r * 0.92, h * 0.5), (0, h * 0.62)], (6.0 + i, y + 3.0, 3.0),
                    (6.0 + i + h * 0.55, y + 8.0, 4.0), segs=6)
            return g, LILAC_DK
        f.breakable(mono, st, finish="gloss", outline=0.7)
        hi = min(3, st - 1)
        f.add(Geo().blob((r * 0.6, y, 4.0 + h * 0.34), (1.4, r * 0.66, h * 0.26), p=3.0, rot=(0, -3, 0)), None, "body",
              0, hi, team=True, outline=0.4)
        f.add(Geo().capsule((r * 0.82, y + r * 0.5, 8.0), (r * 0.6 + lean * 0.4, y + r * 0.5, 4.0 + h * 0.7), 0.6), None,
              "body", 0, hi, glow=MINT, outline=0)
        # stumps left on the plinth when the crystal snaps
        if st <= 3:
            g = Geo()
            _crystal(g, (0, y, 4.0), h * 0.28, r)
            f.add(g, LILAC_DK, "body", st, 3, finish="gloss", outline=0.6)
    # inner glow cores between the monoliths
    g = Geo()
    for y in (-21.0, -7.0, 7.0, 21.0):
        g.sphere((1.0, y, 10.0), 1.6, cuts=2)
    f.add(g, None, "body", 0, 2, glow=GLOW_CORE, outline=0.3)
    _star_x(f, (0.0, 3.0), 1.0, 9.8, lo=0, hi=2)
    # rubble: crystal shards, the plinth, team facing shards
    g = Geo()
    for k in range(7):
        _crystal(g, (-6 + k * 3.0, -30 + k * 10.0, 1.0), 6.0 + (k % 3) * 2.0, 2.4, lean=4.0 * (1 if k % 2 else -1))
    f.add(g, LILAC_DK, "rubble", finish="gloss")
    f.add(Geo().blob((0, 0, 1.6), (12.0, 38.0, 2.0), p=3.0), VOID, "rubble")
    f.add(Geo().blob((10, 4, 2.2), (5, 8, 0.8), p=3.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -8, 8, -40, 40, 62, wood=STAR_TRIM, rope=VOID_LT)


VOID_RAMPART = make("void_rampart", "Void Rampart", AGE, "wall", _rampart, canvas=(300, 250), feet=(150, 218),
                    height=92, hit=(2, 34), material="energy", flag=(-11.0, 0.0, 0.0, 86.0), flag_len=20.0, foot=28.0,
                    yaw=-38.0, pole_fill=VOID_LT, tip_fill=MINT)


# =============================================================================== Ion Spire (tower)
IS_TOP = 40.0
IS_MUZ = (0.0, 0.0, 63.0)


def _ion(f):
    _starfoot(f, 13.0, 4.0)
    # the spire: a tapering star-white column in three pieces that fall from the top, a team band
    for (z0, z1, st) in ((4.0, 17.0, 4), (17.0, 29.0, 3), (29.0, IS_TOP, 2)):
        def piece(fallen, z0=z0, z1=z1):
            if not fallen:
                k0, k1 = 1.0 - 0.45 * z0 / IS_TOP, 1.0 - 0.45 * z1 / IS_TOP
                return Geo().lathe([(0, z0), (6.4 * k0, z0), (6.4 * k1, z1), (0, z1)], (0, 0, 0), (0, 0, 1), segs=6), STAR
            return Geo().blob((14.0 + z0 * 0.2, -6.0 + z0 * 0.3, 3.0), (7.0, 3.6, 3.0), p=3.0, rot=(0, 0, z0 * 3)), STAR_DK
        f.breakable(piece, st, finish="gloss")
    f.add(Geo().lathe([(0, 10.0), (6.0, 10.0), (5.6, 16.0), (0, 16.0)], (0, 0, 0), (0, 0, 1), segs=6), None, "body", 0, 3,
          team=True, outline=0.4)
    _star(f, (0.0, 13.0), 0.7, -5.4, lo=0, hi=3)
    f.add(Geo().capsule((4.6, -2.4, 18.0), (3.4, -1.6, 38.0), 0.7), None, "body", 0, 1, glow=MINT, outline=0.3)
    # three struts and the floating ring
    g = Geo()
    for k in range(3):
        a = math.radians(90 + 120 * k)
        x0, y0 = 3.2 * math.cos(a), 3.2 * math.sin(a) * 0.85
        x1, y1 = 9.0 * math.cos(a), 9.0 * math.sin(a) * 0.85
        g.capsule((x0, y0, IS_TOP - 2.0), (x1, y1, IS_TOP + 6.0), 1.1, 0.8)
    f.add(g, STAR_TRIM, "body", 0, 1, finish="metal", outline=0.5)
    g = Geo()
    n = 24
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        g.capsule((10.0 * math.cos(a0), 8.5 * math.sin(a0), IS_TOP + 7.0), (10.0 * math.cos(a1), 8.5 * math.sin(a1), IS_TOP + 7.0),
                  1.3, segs=8, rings=2)
    f.add(g, None, "body", 0, 1, team=True, outline=0.5)
    g = Geo()
    for k in range(5):
        a = 2 * math.pi * k / 5 + 0.4
        g.sphere((10.0 * math.cos(a), 8.5 * math.sin(a) - 0.8, IS_TOP + 7.6), 1.0, cuts=2)
    f.add(g, None, "body", 0, 1, glow=MINT_CORE, outline=0.3)
    # the floating crystal with a dark visor and a violet robot eye
    g = Geo()
    _crystal(g, (0, 0, IS_TOP + 4.0), 20.0, 5.2)
    f.add(g, None, "body", 0, 1, glow=GLOW, outline=0.9)
    g = Geo()
    _crystal(g, (-0.6, -1.6, IS_TOP + 6.0), 12.0, 2.2)
    f.add(g, None, "body", 0, 1, glow=GLOW_CORE, outline=0)
    f.add(Geo().blob((2.4, -3.0, IS_TOP + 13.0), (2.6, 2.6, 2.2), p=2.6), VISOR, "body", 0, 1, finish="gloss", outline=0.4)
    f.add(Geo().sphere((3.6, -4.2, IS_TOP + 13.2), 1.1, cuts=2), None, "body", 0, 1, glow=GLOW_CORE, outline=0)
    # the dim fallen crystal (stage 2+)
    g = Geo()
    g.lathe([(0, 0), (4.6, 0.2), (4.2, 12.0), (0, 18.0)], (6.0, -6.0, 4.0), (22.0, -2.0, 5.0), segs=6)
    f.add(g, LILAC_DK, "body", 2, 3, finish="gloss", outline=0.6)
    # rubble
    g = Geo()
    for k in range(5):
        g.blob((-10 + k * 6.0, -8 + (k % 2) * 10, 2.4), (4.0, 3.0, 2.4), p=3.0, rot=(0, 0, k * 50))
    f.add(g, STAR_DK, "rubble", finish="gloss")
    g = Geo()
    g.lathe([(0, 0), (4.6, 0.2), (4.2, 12.0), (0, 18.0)], (4.0, -6.0, 3.0), (20.0, -2.0, 4.0), segs=6)
    f.add(g, LILAC_DK, "rubble", finish="gloss")
    f.add(Geo().blob((-6, 8, 1.0), (6, 4, 0.8), p=3.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -12, 12, -10, 10, IS_TOP + 10, wood=STAR_TRIM, rope=VOID_LT)


ION_SPIRE = make("ion_spire", "Ion Spire", AGE, "tower", _ion, canvas=(240, 260), feet=(118, 228), height=76, hit=(0, 32),
                 material="energy", flag=(-9.0, 9.0, 6.0, 48.0), flag_len=12.0, foot=16.0, yaw=-12.0, muzzle=IS_MUZ,
                 lights=[((0.0, 0.0, 50.0), 16, 2)], pole_fill=VOID_LT, tip_fill=MINT)


# ============================================================================= Warp Barracks (camp)
WB_R = 17.0          # portal ring radius
WB_Z = 24.0          # portal centre height


def _ring_yz(g, c, R, r, n=32):
    """A ring in the y-z plane (facing the lane, +x) centred at c."""
    x, y, z = c
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        g.capsule((x, y + R * math.cos(a0), z + R * math.sin(a0)), (x, y + R * math.cos(a1), z + R * math.sin(a1)), r,
                  segs=8, rings=2)


def _warp(f):
    f.add(Geo().blob((0, 0, 3.0), (20.0, 30.0, 3.0), p=3.0), VOID, "body", 0, 3, outline=0.5)              # dais
    f.add(Geo().blob((0, 0, 3.4), (20.5, 30.5, 0.7), p=3.0), None, "body", 0, 3, glow=MINT, outline=0)
    f.add(Geo().blob((2.0, 0, 7.2), (13.0, 20.0, 1.6), p=3.0), STAR, "body", 0, 3, finish="gloss", outline=0.4)
    # the portal: a dark disc behind the membrane, a team ring in three crumble arcs, a star-white outer rim
    g = Geo()
    _ring_yz(g, (0, 0, WB_Z), WB_R + 2.4, 1.2)
    f.add(g, STAR, "body", 0, 1, finish="gloss", outline=0.5)
    f.add(Geo().blob((-0.6, 0, WB_Z), (1.0, WB_R, WB_R), p=2.0), VOID_DK, "body", 0, 2, outline=0)
    for (st, a_lo, a_hi) in ((4, 200, 340), (3, -20, 80), (2, 80, 200)):
        g = Geo()
        n = 12
        for i in range(n):
            a0 = math.radians(a_lo + (a_hi - a_lo) * i / n)
            a1 = math.radians(a_lo + (a_hi - a_lo) * (i + 1) / n)
            g.capsule((0, WB_R * math.cos(a0), WB_Z + WB_R * math.sin(a0)), (0, WB_R * math.cos(a1), WB_Z + WB_R * math.sin(a1)),
                      2.4, segs=8, rings=2)
        f.add(g, None, "body", 0, min(3, st - 1), team=True, outline=0.6)
    g = Geo()
    for k in range(6):
        a = math.radians(30 + 60 * k)
        g.sphere((1.6, WB_R * math.cos(a), WB_Z + WB_R * math.sin(a)), 1.2, cuts=2)
    f.add(g, None, "body", 0, 1, glow=MINT_CORE, outline=0.3)
    _star_x(f, (0.0, WB_Z + WB_R + 4.6), 1.0, 1.4, lo=0, hi=1)
    f.add(Geo().blob((0.6, 0, WB_Z + WB_R + 4.6), (1.4, 4.4, 4.4), p=2.6), None, "body", 0, 1, team=True, outline=0.4)
    # the membrane (door family): dim, swirling, open
    f.add(Geo().blob((0.4, 0, WB_Z), (0.6, WB_R - 1.2, WB_R - 1.2), p=2.0), None, "door", 0, 0, glow=VOID_LT, outline=0)
    f.add(Geo().blob((0.4, 0, WB_Z), (0.6, WB_R - 1.2, WB_R - 1.2), p=2.0), None, "door", 1, 1, glow=VIOLET, outline=0)
    g = Geo()
    for k in range(3):
        pts = []
        for i in range(10):
            t = i / 9
            a = math.radians(120 * k + 300 * t)
            r = (WB_R - 3.0) * (1.0 - 0.8 * t)
            pts.append((1.0, r * math.cos(a), WB_Z + r * math.sin(a)))
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.8, 0.6)
    f.add(g, None, "door", 1, 1, glow=GLOW, outline=0)
    f.add(Geo().blob((0.4, 0, WB_Z), (0.6, WB_R - 1.2, WB_R - 1.2), p=2.0), None, "door", 2, 2, glow=GLOW_CORE, outline=0)
    f.add(Geo().blob((1.0, 0, WB_Z), (0.6, WB_R * 0.5, WB_R * 0.5), p=2.0), None, "door", 2, 2, glow=MINT_CORE, outline=0)
    # pylons either side with mint cores; the near one breaks at 33%
    for (y, st) in ((-WB_R - 7.0, 3), (WB_R + 7.0, 4)):
        def pyl(fallen, y=y):
            if not fallen:
                return Geo().lathe([(0, 6.0), (4.2, 6.0), (3.0, 30.0), (0, 34.0)], (0, y, 0), (0, y, 1), segs=6), STAR
            return Geo().blob((12.0, y * 0.9, 4.0), (12.0, 3.6, 3.4), p=3.0, rot=(0, 0, 24)), STAR_DK
        f.breakable(pyl, st, finish="gloss")
        hi = min(3, st - 1)
        f.add(Geo().sphere((0.4, y, 36.4), 2.6, cuts=3), None, "body", 0, hi, glow=MINT, outline=0.5)
        f.add(Geo().lathe([(0, 12.0), (4.0, 12.0), (3.8, 16.0), (0, 16.0)], (0, y, 0), (0, y, 1), segs=6), None, "body", 0, hi,
              team=True, outline=0.4)
    # rubble
    g = Geo()
    for k in range(10):
        g.blob((-14 + (k * 7) % 28, -24 + (k * 11) % 48, 2.4 + (k % 3) * 0.8), (3.6, 2.6, 1.6), p=2.4, rot=(0, 0, k * 33))
    f.add(g, STAR_DK, "rubble", finish="gloss")
    f.add(Geo().blob((0, 0, 3.0), (20.0, 30.0, 3.0), p=3.0), VOID, "rubble")
    f.add(Geo().blob((6, -10, 6.4), (6, 8, 1.0), p=3.0), None, "rubble", team=True)
    scaffold(f, -16, 16, -WB_R - 10, WB_R + 10, 46, levels=1, wood=STAR_TRIM, rope=VOID_LT)


WARP_BARRACKS = make("warp_barracks", "Warp Barracks", AGE, "camp", _warp, canvas=(300, 250), feet=(150, 214), height=76,
                     hit=(0, 22), material="metal", flag=(-16.0, 16.0, 4.0, 58.0), flag_len=16.0, foot=26.0, yaw=-24.0,
                     lights=[((0.0, 0.0, 21.0), 18, 1)], pole_fill=VOID_LT, tip_fill=MINT)


# ================================================================================== Void Mine (trap)
def _void_mine(f):
    f.add(Geo().star((0, 0, 0.8), 12.0, 6.0, 1.6, points=5, rot=(90, 0, 0)), VOID_LT, "trap", 0, 2, outline=0.4,
          finish="gloss")
    f.add(Geo().blob((0, 0, 1.0), (13.0, 11.0, 1.0), p=3.0), SCORCH, "trap", 3, 3, outline=0)
    # unarmed: the orb sits on the star; armed: half sunk with a dim lilac core and orbiting specks
    f.add(Geo().sphere((0, 0, 7.6), 6.0, cuts=4), VOID, "trap", 0, 0, finish="gloss", outline=0.6)
    f.add(Geo().sphere((1.6, -3.4, 9.0), 2.0, cuts=3), None, "trap", 0, 0, glow=VIOLET, outline=0)
    g = Geo().sphere((0, 0, 2.6), 6.0, cuts=4)
    g.clip((0, 0, 1.6), (0, 0, -1))
    f.add(g, VOID, "trap", 1, 1, finish="gloss", outline=0.6)
    f.add(Geo().sphere((1.2, -3.6, 4.4), 2.4, cuts=3), None, "trap", 1, 1, glow=GLOW, outline=0.3)
    g = Geo()
    for k in range(5):
        a = k * 2 * math.pi / 5
        g.sphere((9.6 * math.cos(a), 8.0 * math.sin(a), 4.0 + (k % 2) * 2.0), 0.9, cuts=2)
    f.add(g, None, "trap", 1, 1, glow=LILAC, outline=0.2)
    # sprung: the orb cracked open, blazing (a violet-white core and rays); spent: a crater with void shards
    f.add(Geo().sphere((0, 0, 6.0), 6.6, cuts=4), None, "trap", 2, 2, glow=GLOW_CORE, outline=0.5)
    g = Geo()
    for k in range(8):
        a = k * 2 * math.pi / 8
        g.capsule((4.0 * math.cos(a), 3.4 * math.sin(a), 6.0), (14.0 * math.cos(a), 12.0 * math.sin(a), 6.0 + 4.0 * math.sin(a)),
                  0.9, 0.3)
    f.add(g, None, "trap", 2, 2, glow=GLOW, outline=0)
    g = Geo()
    for k in range(5):
        a = k * 2 * math.pi / 5 + 0.3
        rock(g, (11.0 * math.cos(a), 9.0 * math.sin(a), 1.2), (2.4, 1.8, 1.0), seed=90 + k, jag=0.2)
    f.add(g, VOID, "trap", 3, 3)
    # a team marker post (every frame)
    f.add(Geo().capsule((-17.0, 9.0, 0), (-17.4, 9.0, 14.0), 0.8), STAR_TRIM, "trap", 0, 3)
    f.add(Geo().slab([(-17.4, 13.6), (-24.0, 12.2), (-22.4, 9.6), (-17.4, 10.0)], 9.0, 1.0), None, "trap", 0, 3, team=True,
          outline=0.5)
    f.add(Geo().blob((-14.0, 11.0, 1.8), (3.0, 2.4, 1.8), p=2.4), None, "trap", 0, 3, team=True, outline=0.5)


VOID_MINE = make("void_mine", "Void Mine", AGE, "trap", _void_mine, canvas=(200, 120), feet=(100, 92), height=24, hit=(0, 6),
                 material="energy", foot=28.0, yaw=-12.0)


# ======================================================================== Star Bulwark (wall, cover)
SB_H = 34.0


def _bulwark(f):
    # a low void footing, the step behind the shield, a team stripe
    f.add(Geo().blob((0, 0, 2.0), (12.0, 42.0, 2.4), p=3.0), VOID, "body", 0, 3, outline=0.5)
    f.add(Geo().blob((-8.0, 0, 5.0), (5.0, 38.0, 2.6), p=3.4), VOID_LT, "body", 0, 3, finish="gloss", outline=0.4)
    f.add(Geo().blob((6.0, 0, 4.4), (1.6, 40.0, 0.6), p=3.4), None, "body", 0, 3, glow=MINT, outline=0)
    # five curved armour plates (the shield bows toward the lane), each with a team panel; the ends fall first
    plates = ((-32.0, 0.70, 1), (-16.0, 0.92, 3), (0.0, 1.0, 4), (16.0, 0.92, 2), (32.0, 0.70, 1))
    for i, (y, k, st) in enumerate(plates):
        x = 3.0 * (1.0 - (y / 34.0) ** 2)
        h = SB_H * k

        def plate(fallen, x=x, y=y, h=h, i=i):
            if not fallen:
                return Geo().blob((x, y, 4.0 + h / 2), (3.4, 7.6, h / 2), p=3.4, taper=(0.92, 1.0)), STAR
            return Geo().blob((x + 12.0, y + 4.0, 3.4), (h / 2, 7.0, 3.0), p=3.4, rot=(0, 0, 18 * (1 if i % 2 else -1))), STAR_DK
        f.breakable(plate, st, finish="gloss", outline=0.6)
        hi = min(3, st - 1)
        f.add(Geo().blob((x + 3.0, y, 4.0 + h * 0.46), (0.9, 5.6, h * 0.3), p=3.4), None, "body", 0, hi, team=True,
              outline=0.4)
        f.add(Geo().capsule((x + 3.2, y - 6.6, 8.0), (x + 3.2, y - 6.6, 4.0 + h - 3.0), 0.5), STAR_TRIM, "body", 0, hi,
              outline=0)
    # the pale star emblem and the shield shimmer along the top
    _star_x(f, (0.0, 4.0 + SB_H * 0.46), 1.2, 7.4, lo=0, hi=3)
    g = Geo()
    for i in range(10):
        y0, y1 = -30.0 + i * 6.0, -24.0 + i * 6.0
        z0 = 4.0 + SB_H * (0.72 if abs(y0) > 24 else 0.92 if abs(y0) > 8 else 1.0) + 2.0
        z1 = 4.0 + SB_H * (0.72 if abs(y1) > 24 else 0.92 if abs(y1) > 8 else 1.0) + 2.0
        g.capsule((2.0, y0, z0), (2.0, y1, z1), 0.9, 0.9)
    f.add(g, None, "body", 0, 0, glow=MINT, outline=0.3)
    g = Geo()
    for i in range(5):
        y = -16.0 + i * 8.0
        g.capsule((2.0, y, 4.0 + SB_H + 1.6), (2.0, y + 4.0, 4.0 + SB_H + 1.6), 0.7, 0.7)
    f.add(g, None, "body", 1, 1, glow=MINT, outline=0.3)
    # rubble: plate pieces, the footing, team panel shards
    g = Geo()
    for k in range(6):
        g.blob((-6 + k * 4.0, -32 + k * 12.0, 2.2), (4.0, 3.0, 2.0), p=3.0, rot=(0, 0, k * 40))
    f.add(g, STAR_DK, "rubble", finish="gloss")
    f.add(Geo().blob((0, 0, 1.6), (12.0, 42.0, 2.0), p=3.0), VOID, "rubble")
    f.add(Geo().blob((10, 4, 2.2), (5, 8, 0.8), p=3.0, rot=(0, 0, 20)), None, "rubble", team=True)
    scaffold(f, -10, 10, -42, 42, SB_H + 8, levels=1, wood=STAR_TRIM, rope=VOID_LT)


STAR_BULWARK = make("star_bulwark", "Star Bulwark", AGE, "wall", _bulwark, canvas=(300, 250), feet=(150, 218),
                    height=62, hit=(2, 22), material="metal", flag=(-12.0, 0.0, 0.0, 56.0), flag_len=18.0, foot=28.0,
                    yaw=-38.0, pole_fill=VOID_LT, tip_fill=MINT)


# ============================================================================ Stardust Snare (trap)
def _snare(f):
    f.add(Geo().star((0, 0, 0.8), 13.0, 7.0, 1.6, points=5, rot=(90, 0, 0)), VOID_LT, "trap", 0, 2, outline=0.4,
          finish="gloss")
    f.add(Geo().star((0, 0, 0.8), 13.0, 7.0, 1.4, points=5, rot=(90, 0, 0)), SCORCH, "trap", 3, 3, outline=0.3)
    # the star petals: folded up (unarmed), open with lit tips (armed, sprung)
    for k in range(5):
        a = math.radians(90 + 72 * k)
        c, s = math.cos(a), math.sin(a) * 0.85
        g = Geo().capsule((3.0 * c, 3.0 * s, 1.6), (6.0 * c, 6.0 * s, 8.0), 1.6, 0.9)
        f.add(g, STAR, "trap", 0, 0, finish="gloss", outline=0.4)
        g = Geo().capsule((3.0 * c, 3.0 * s, 1.8), (10.4 * c, 10.4 * s, 2.4), 1.6, 1.0)
        f.add(g, STAR, "trap", 1, 2, finish="gloss", outline=0.4)
        f.add(Geo().sphere((11.0 * c, 11.0 * s - 0.6, 2.8), 1.1, cuts=2), None, "trap", 1, 1, glow=MINT_CORE, outline=0.2)
    f.add(Geo().sphere((0, 0, 2.6), 2.8, cuts=3), None, "trap", 0, 2, team=True, outline=0.4)
    # armed: a glittering lilac dust cloud hovering over the plate
    g = Geo()
    for k in range(9):
        a = k * 2 * math.pi / 9
        r = 4.0 + (k % 3) * 2.4
        g.blob((r * math.cos(a), r * math.sin(a) * 0.8, 6.0 + (k % 4) * 1.4), (2.6, 2.4, 1.8), p=2.0)
    f.add(g, None, "trap", 1, 1, glow=LILAC, outline=0.3)
    g = Geo()
    for k in range(7):
        a = k * 2 * math.pi / 7 + 0.4
        g.sphere((6.6 * math.cos(a), 5.4 * math.sin(a) - 1.0, 9.0 + (k % 3) * 1.6), 0.7, cuts=2)
    f.add(g, None, "trap", 1, 1, glow=LILAC_CORE, outline=0)
    # sprung: a sparkling burst (a big dust cloud, four-point sparkles, mint streaks)
    f.add(Geo().blob((0, 0, 8.0), (13.0, 10.0, 6.6), p=2.0), None, "trap", 2, 2, glow=LILAC, outline=0.5)
    g = Geo()
    for k in range(5):
        a = k * 2 * math.pi / 5 + 0.2
        x, y, z = 9.0 * math.cos(a), 7.0 * math.sin(a) - 3.0, 10.0 + (k % 2) * 4.0
        g.star((x, y, z), 3.0, 0.8, 0.8, points=4)
    f.add(g, None, "trap", 2, 2, glow=GLOW_CORE, outline=0)
    g = Geo()
    for k in range(6):
        a = k * 2 * math.pi / 6
        g.capsule((6.0 * math.cos(a), 5.0 * math.sin(a), 6.0), (15.0 * math.cos(a), 12.0 * math.sin(a), 4.0), 0.6, 0.2)
    f.add(g, None, "trap", 2, 2, glow=MINT, outline=0)
    # spent: dull dust heaps on the plate
    g = Geo()
    for k in range(5):
        a = k * 2 * math.pi / 5 + 0.5
        g.blob((7.0 * math.cos(a), 6.0 * math.sin(a), 1.6), (2.6, 2.2, 1.0), p=2.0)
    f.add(g, LILAC_DK, "trap", 3, 3, outline=0.3)
    # a team marker post (every frame)
    f.add(Geo().capsule((-17.0, 9.0, 0), (-17.4, 9.0, 14.0), 0.8), STAR_TRIM, "trap", 0, 3)
    f.add(Geo().slab([(-17.4, 13.6), (-24.0, 12.2), (-22.4, 9.6), (-17.4, 10.0)], 9.0, 1.0), None, "trap", 0, 3, team=True,
          outline=0.5)
    f.add(Geo().blob((-14.0, 11.0, 1.8), (3.0, 2.4, 1.8), p=2.4), None, "trap", 0, 3, team=True, outline=0.5)


STARDUST_SNARE = make("stardust_snare", "Stardust Snare", AGE, "trap", _snare, canvas=(200, 120), feet=(100, 92), height=24,
                      hit=(0, 6), material="energy", foot=28.0, yaw=-12.0)


FORTS = [VOID_RAMPART, ION_SPIRE, WARP_BARRACKS, VOID_MINE, STAR_BULWARK, STARDUST_SNARE]
