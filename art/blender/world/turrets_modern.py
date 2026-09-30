"""Modern Age turrets (DESIGN A5.5, A14.2): MG Nest, Flak Gun, Howitzer, Searchlight Sniper.

Same contract as the other ages (common.turret_module): a static `mount` frame and a rotating head
(`idle`, `fire` with a per-frame muzzle anchor), plus `build` and `destroyed`. Cartoon kit v2 (art
director plan 2026-09-30): every turret has a crew member with a face that acts, a 6-frame idle
with character, a readable anticipation in `fire`, one flash on the shot frame, and the Modern
mount (a concrete pad with a hazard-striped edge and a team sign with a cream chevron, sandbags).

Palette (A11, Modern): olive, khaki and gunmetal as large areas; signal red-violet as an accent.
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art import kit_modern as KM
from ageborn_art.geometry import Geo

from world.common import TURRET_YAW, box, cyl, muzzle_flash, pennant, smoke_puff, turret_module

OLIVE = "#62664A"
OLIVE_LT = "#7C8060"
OLIVE_DK = "#4E5238"
KHAKI = "#B8A67A"
SAND = "#B7A98C"
GUNMETAL = "#3A3F45"
STEEL = "#8C949C"
CONCRETE = "#A29F96"
CONCRETE_DK = "#8A877F"
BORE = "#1E1C1C"
LENS = "#FFF6D8"
SIGNAL = "#B0306A"
SKIN = "#EBC4A0"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
LEATHER = "#6B5444"
BRASS = "#C8B27A"
WOOD = "#8A6E55"

CANVAS = (300, 220)
FEET = (100, 180)


def concrete_pad(rig, r=16.0, h=5.0, sign=True):
    """The Modern mount: a concrete pad with a hazard-striped near edge, bolts, and a team sign
    with a cream chevron on the near face."""
    d = r * 0.72
    g = Geo()
    box(g, (0, 2, h / 2), (r, d, h / 2), p=6)
    rig.part("mount", g, CONCRETE)
    edge = Geo()
    box(edge, (0, 2 - d - 0.2, h - 1.0), (r - 0.4, 0.3, 1.0), p=6, cuts=2)
    ef = F.Face(rig, "mount", [edge], yaw_deg=TURRET_YAW)
    rig.part("mount", edge, KM.STRIPE_LT, outline=0.3)
    g = KM.stripes(ef, Geo(), K.scr(ef, (0, 2 - d - 0.5, h - 1.0)), 2 * r - 1.0, 1.8, n=int(r / 1.6), slant=0.9)
    rig.part("mount", g, KM.STRIPE_DK, highlight=False, outline=0)
    g = Geo()   # chips and a crack line in the concrete
    for x, z in ((-r + 3.0, 1.2), (r - 4.0, 1.6)):
        g.blob((x, 2 - d - 0.3, z), (1.4, 0.5, 0.9), p=2.4)
    rig.part("mount", g, CONCRETE_DK, outline=0)
    if sign:
        sx, sz = r * 0.45, h * 0.42
        plate = Geo()
        box(plate, (sx, 2 - d - 0.6, sz), (4.6, 0.5, 2.3), p=5, cuts=2)
        pf = F.Face(rig, "mount", [plate], yaw_deg=TURRET_YAW)
        rig.part("mount", plate, team=True, outline=0.5)
        g = KM.chevron(pf, Geo(), K.scr(pf, (sx, 2 - d - 1.2, sz)), s=0.55, n=1, w=1.8)
        rig.part("mount", g, KM.CREAM, highlight=False, outline=0)


def sandbags(rig, joint, r=17.0, rows=2, z0=3.0, arc=(0.1, 0.9), n=7, color=SAND, team_top=False):
    g = Geo()
    gt = Geo()
    for row in range(rows):
        for k in range(n):
            a = math.pi * (arc[0] + (arc[1] - arc[0]) * k / (n - 1)) + (0.06 if row % 2 else 0)
            x, y = r * math.cos(a) * 0.9, -r * math.sin(a) * 0.55 + 2
            tgt = gt if (team_top and row == rows - 1 and k % 2 == 1) else g
            tgt.blob((x, y, z0 + row * 5), (5.4, 4.0, 3.0), p=2.6, rot=(0, 0, math.degrees(-a) + 90))
    rig.part(joint, g, color, finish="hair")
    if team_top:
        rig.part(joint, gt, team=True, outline=0.5)
    g = Geo()   # the tie strings on the front bags
    for k in range(1, n - 1, 2):
        a = math.pi * (arc[0] + (arc[1] - arc[0]) * k / (n - 1))
        x, y = r * math.cos(a) * 0.9, -r * math.sin(a) * 0.55 + 2 - 3.6
        g.capsule((x, y, z0 - 2.0), (x, y, z0 + 2.0), 0.35, segs=6, rings=2)
    rig.part(joint, g, "#8E805F", outline=0)


def gunner(rig, parent, at, name="crew", k=1.0, cap=False):
    """A turret crewman from the waist up: a team jacket, a round olive helmet with a team band (or
    a soft cap), big eyes on their own joint (they squeeze), a mouth that can yell (hidden joint
    `<name>_yell`), and arms on `<name>_arms` pivoting at the shoulder, modelled reaching forward.
    Returns the hand point."""
    x, y, z = at
    rig.joint(name, parent, at)
    g = Geo().blob((x, y, z + 4.2 * k), (5.4 * k, 5.2 * k, 5.4 * k), p=2.4, taper=(1.1, 0.9))
    rig.part(name, g, team=True)
    hz = z + 13.0 * k
    g = Geo().blob((x + 0.6 * k, y, hz), (5.6 * k, 5.4 * k, 5.6 * k), p=2.3)
    g.blob((x + 6.0 * k, y - 0.4, hz - 1.0 * k), (1.8 * k, 1.6 * k, 1.7 * k), p=2.0)
    rig.part(name, g, SKIN)
    if cap:
        g = Geo().blob((x - 0.2, y, hz + 2.8 * k), (6.2 * k, 6.0 * k, 4.4 * k), p=2.3)
        g.clip((x, y, hz + 1.0 * k), (0, 0, -1))
        g.blob((x + 5.4 * k, y, hz + 2.0 * k), (2.6 * k, 5.0 * k, 0.8 * k), p=2.6)
        rig.part(name, g, OLIVE)
    else:
        g = Geo().blob((x + 0.2 * k, y, hz + 2.2 * k), (7.0 * k, 6.8 * k, 5.8 * k), p=2.3)
        g.clip((x, y, hz + 0.2 * k), (0, 0, -1))
        g.lathe([(7.2 * k, 0), (7.9 * k, -0.4 * k), (8.0 * k, -1.0 * k), (7.0 * k, -1.2 * k)],
                (x + 0.2 * k, y, hz + 0.9 * k), (x + 0.2 * k, y, hz - 0.3 * k), segs=20)
        rig.part(name, g, OLIVE, finish="gloss")
        g = Geo().lathe([(7.1 * k, 0), (7.2 * k, 1.2 * k), (6.8 * k, 2.2 * k)], (x + 0.2 * k, y, hz + 0.9 * k),
                        (x + 0.2 * k, y, hz + 3.1 * k), segs=20)
        rig.part(name, g, team=True, outline=0.4)
    rig.joint(f"{name}_eyes", name, (x + 4.6 * k, y, hz + 0.2 * k))
    g = Geo()
    for yy in (-2.4 * k, 2.2 * k):
        g.blob((x + 4.4 * k, y + yy, hz + 0.2 * k), (1.6 * k, 1.6 * k, 2.0 * k))
    rig.part(f"{name}_eyes", g, EYE, highlight=False, outline=0.4)
    g = Geo()
    for yy in (-2.4 * k, 2.2 * k):
        g.blob((x + 5.7 * k, y + yy - 0.2, hz + 0.1 * k), (0.6 * k, 1.0 * k, 1.1 * k))
    rig.part(f"{name}_eyes", g, PUPIL, outline=0)
    g = Geo().blob((x + 5.6 * k, y - 0.4, hz - 3.4 * k), (0.8, 2.0 * k, 0.7 * k), p=2.4)
    rig.part(name, g, MOUTH, outline=0, highlight=False)
    rig.joint(f"{name}_yell", name, (x + 5.6 * k, y, hz - 3.6 * k), hidden=True)
    g = Geo().blob((x + 5.8 * k, y - 0.6, hz - 3.8 * k), (1.1 * k, 2.0 * k, 1.6 * k), p=2.2)
    rig.part(f"{name}_yell", g, MOUTH, outline=0, highlight=False)
    sh = (x + 0.6 * k, y - 4.6 * k, z + 7.6 * k)
    rig.joint(f"{name}_arms", name, sh)
    g = Geo()
    for dy in (0.0, 8.4 * k):
        g.capsule((sh[0], sh[1] + dy, sh[2]), (sh[0] + 9.0 * k, sh[1] + dy * 0.8, sh[2] + 3.0 * k), 1.9 * k, 1.6 * k)
    rig.part(f"{name}_arms", g, team=True, outline=0.5)
    g = Geo()
    for dy in (0.0, 8.4 * k):
        g.sphere((sh[0] + 10.0 * k, sh[1] + dy * 0.8, sh[2] + 3.4 * k), 2.1 * k, cuts=3)
    rig.part(f"{name}_arms", g, SKIN, outline=0.5)
    return (sh[0] + 11.0 * k, sh[1] + 3.4 * k, sh[2] + 3.4 * k)


def _burst(joint, point, r0=5.0, r1=10.0, n=5, a0=-60.0, arc=120.0):
    return {"kind": "burst", "joint": joint, "point": point, "r0_lu": r0, "r1_lu": r1, "n": n, "a0": a0,
            "arc": arc, "color": "#FFF4D6"}


# -- MG Nest: a belt-fed machine gun behind a sandbag ring, a helmeted gunner -----------------------
MG_MUZ = (24.0, 0.0, 19.5)


def mg_build(rig):
    concrete_pad(rig, r=17.0, h=3.0, sign=False)
    sandbags(rig, "mount", r=19.0, rows=3, z0=5.0, team_top=True)
    pennant(rig, "mount", -15, 6, 4, h=32, pole=STEEL, finial=STEEL)
    g = Geo()   # an ammo can on the sandbags
    box(g, (-12.0, -6.0, 18.5), (3.2, 2.2, 2.4), p=5)
    rig.part("mount", g, OLIVE, outline=0.5)
    g = Geo()
    for dx, dy in ((-6, -5), (6, -5), (0, 6)):
        g.capsule((dx, dy, 8), (0, 0, 17), 0.9)
    rig.part("mount", g, GUNMETAL, finish="metal", outline=0.4)
    # the gunner crouched behind the gun (head rotates with it)
    hand = gunner(rig, "head", (-11.0, 3.0, 10.0), name="crew", k=1.05)
    del hand
    rig.joint("gun", "head", (0, 0, 18))
    g = Geo()
    box(g, (0, 0, 19), (7, 3, 3.2), p=5)
    rig.part("gun", g, GUNMETAL, finish="metal")
    g = Geo()
    cyl(g, (6, 0, 19.5), (MG_MUZ[0], 0, 19.5), 1.6, bevel=0.2, segs=12)
    cyl(g, (6, 0, 19.5), (15, 0, 19.5), 2.7, bevel=0.4, segs=12)            # cooling jacket
    rig.part("gun", g, STEEL, finish="metal", outline=0.5)
    g = Geo()
    for x in (8.0, 10.5, 13.0):
        cyl(g, (x, 0, 19.5), (x + 0.8, 0, 19.5), 2.9, bevel=0.1, segs=12)
    rig.part("gun", g, GUNMETAL, finish="metal", outline=0)
    g = Geo().capsule((-6, 0, 18.5), (-14, 0, 15.5), 2.1, 1.5)
    rig.part("gun", g, WOOD, outline=0.5)
    g = Geo()
    box(g, (1, -4.8, 16), (4, 1.6, 3.4), p=5)
    rig.part("gun", g, OLIVE, outline=0.5)
    g = Geo()
    box(g, (-2, 3.4, 23), (6, 0.8, 4.4), p=5)
    rig.part("gun", g, team=True, outline=0.4)
    # the ammo belt: brass rounds on a khaki strip hanging from the feed, two phase copies (it feeds)
    for ph in range(2):
        rig.joint(f"belt{ph}", "gun", (1.0, -5.0, 17.0), hidden=True)
        pts = [(1.0 - (0.9 if ph else 0.0), 16.4), (-1.6, 13.6), (-3.2, 10.6), (-3.8, 7.6)]
        g = Geo()
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            g.capsule((ax, -5.4, az), (bx, -5.4, bz), 1.1, segs=8, rings=2)
        rig.part(f"belt{ph}", g, KHAKI, outline=0.4)
        g = Geo()
        for ax, az in pts:
            g.capsule((ax - 0.4, -6.4, az + 1.2), (ax + 0.4, -6.4, az - 1.2), 0.95)
        rig.part(f"belt{ph}", g, BRASS, finish="metal", outline=0.3)
    rig.joint("casing", "gun", (2.0, -4.0, 20.5), hidden=True)
    g = Geo().capsule((2.0, -4.6, 20.5), (2.0, -4.6, 22.6), 0.7)
    rig.part("casing", g, BRASS, finish="metal", outline=0.3)
    muzzle_flash(rig, "gun", MG_MUZ, 0.9)
    smoke_puff(rig, "gun", (26, 0, 20), 0.5)


def mg_idle(f):
    # 6 frames: the gunner's helmet bobs as he chews gum and scans, the gun sways, the belt swings
    t = f / 6 * 2 * math.pi
    return {"gun": {"r": 0.9 * math.sin(t)},
            "crew": {"z": [0, 0.6, 0.2, -0.4, 0.3, 0.8][f], "r": [0, 3, 5, 0, -4, -2][f]},
            "crew_arms": {"r": -10.0 + 3.0 * math.sin(t)},
            "crew_eyes": {"sz": 0.2 if f == 3 else 1.0},
            f"belt{f % 2}": {"show": True, "r": 4.0 * math.sin(t + 1.0)}}


def mg_fire(f):
    # 0 the gunner squints and leans in, 1 the shot (one flash; the clip repeats for the rapid fire),
    # the belt feeds a round, 2 a casing flips out, 3 it falls, 4 settles
    return {"gun": {"x": [0.3, -2.0, -0.8, -0.3, 0][f], "z": [0, 0.5, 0.2, 0, 0][f], "r": [0, 1.4, 0.6, 0.2, 0][f]},
            "crew": {"x": [0.8, -0.6, -0.3, 0, 0][f], "r": [-3, 3, 1, 0, 0][f]},
            "crew_arms": {"r": [-12, -6, -9, -10, -10][f]},
            "crew_eyes": {"sz": [0.35, 0.3, 1.0, 1.0, 1.0][f]},
            "crew_yell": {"show": f in (1, 2)},
            f"belt{f % 2}": {"show": True, "x": [0, 0.8, 0.4, 0, 0][f]},
            "casing": {"show": f in (2, 3), "x": [0, 0, -2.0, -5.0, 0][f], "z": [0, 0, 3.0, -2.0, 0][f],
                       "r": [0, 0, 80, 220, 0][f]},
            "smoke": {"show": f in (2, 3, 4), "s": [1, 1, 0.8, 1.0, 1.2][f], "z": [0, 0, 0, 1.5, 3][f]}}


MG_OVERLAYS = {"fire": {1: [_burst("gun", (MG_MUZ[0] + 2.0, 0, 19.5), 5.0, 9.0)]}}


# -- Flak Gun: twin barrels on a traversing mount with a shield plate and a seated gunner ------------
FLAK_MUZ = (31.0, 0.0, 20.0)


def flak_build(rig):
    concrete_pad(rig, r=17.0, h=5.0)
    g = Geo()
    cyl(g, (0, 0, 5), (0, 0, 8), 12, 11, bevel=0.8, segs=24, squash=(1.0, 0.8))
    rig.part("mount", g, OLIVE_DK, finish="metal")
    g = Geo()
    cyl(g, (0, 0, 8), (0, 0, 12), 8, 7, bevel=0.8, segs=20)
    rig.part("mount", g, OLIVE)
    g = Geo()
    for a in range(0, 360, 45):
        t = math.radians(a)
        g.sphere((7.6 * math.cos(t), 7.6 * math.sin(t) * 0.8, 10.4), 0.7, cuts=2)
    rig.part("mount", g, STEEL, finish="metal", outline=0)
    pennant(rig, "mount", -15, 6, 5, h=32, pole=STEEL, finial=STEEL)
    g = Geo()
    box(g, (0, 0, 16), (9, 7, 4.5), p=5)
    rig.part("head", g, team=True)
    # the shield plate with camo and a team band
    shield = Geo().slab([(-6, 12), (8, 12), (10, 26), (-4, 26)], -8, 1.6)
    sface = F.Face(rig, "head", [shield], yaw_deg=TURRET_YAW)
    rig.part("head", shield, OLIVE)
    g = KM.mud(sface, Geo(), [(K.scr(sface, (0.0, -9.0, 22.0)), 3.0, 1.6), (K.scr(sface, (5.0, -9.0, 15.0)), 2.4, 1.4)])
    rig.part("head", g, OLIVE_DK, highlight=False, outline=0)
    g = Geo().slab([(-5, 19), (9, 19), (9.4, 22.4), (-4.4, 22.4)], -9.4, 0.8)
    rig.part("head", g, team=True, outline=0.4)
    # the gunner on a seat behind the breech (arms on the traverse wheels)
    gunner(rig, "head", (-12.0, 3.0, 9.0), name="crew", k=1.0)
    g = Geo()
    cyl(g, (-5.0, -6.5, 17.0), (-5.0, -7.5, 17.0), 3.0, bevel=0.3, segs=14)     # traverse handwheel
    rig.part("head", g, GUNMETAL, finish="metal", outline=0.4)
    rig.joint("gun", "head", (0, 0, 20))
    for i, y in enumerate((-3, 3)):
        rig.joint(f"bar{i}", "gun", (0, y, 20))
        g = Geo()
        cyl(g, (-4, y, 20), (30, y, 20), 1.6, bevel=0.2, segs=12)
        cyl(g, (-4, y, 20), (8, y, 20), 2.7, bevel=0.4, segs=12)
        cyl(g, (26, y, 20), (31, y, 20), 2.4, bevel=0.3, segs=12)
        rig.part(f"bar{i}", g, GUNMETAL, finish="metal", outline=0.5)
        g = Geo()
        cyl(g, (12, y, 20), (13.4, y, 20), 2.0, bevel=0.2, segs=12)
        rig.part(f"bar{i}", g, SIGNAL, outline=0.3)
    g = Geo()   # a clip of shells on top of the breech
    for dx in (-2.0, 0.0, 2.0):
        g.capsule((dx, 0, 24.0), (dx, 0, 28.0), 0.9)
    rig.part("gun", g, BRASS, finish="metal", outline=0.3)
    muzzle_flash(rig, "gun", FLAK_MUZ, 1.0)
    smoke_puff(rig, "gun", (33, 0, 21), 0.7)


def flak_idle(f):
    # 6 frames: the barrels scan the sky (they sweep up and back), the gunner cranks the wheel
    t = f / 6 * 2 * math.pi
    return {"gun": {"r": 5.0 * math.sin(t)}, "head": {"rz": 3.0 * math.sin(t - 0.8)},
            "crew": {"r": 3.0 * math.sin(t - 1.0), "z": 0.4 * math.cos(t)},
            "crew_arms": {"r": -12.0 + 6.0 * math.sin(2 * t)},
            "crew_eyes": {"z": 0.5 * math.sin(t)}}


def flak_fire(f):
    # 0 the barrels lift onto the target (anticipation), 1 the shot: the near barrel slams back with
    # the flash, 2 the far barrel's recoil ripples through the mount, 3-4 run out and settle
    return {"gun": {"r": [3.0, 5.0, 3.0, 1.5, 0][f], "x": [0.6, -1.0, -0.5, 0, 0][f]},
            "bar0": {"x": [0, -4.5, -2.5, -0.8, 0][f]},
            "bar1": {"x": [0, -2.0, -3.5, -1.2, 0][f]},
            "crew": {"x": [0.5, -0.8, -0.5, 0, 0][f]},
            "crew_eyes": {"sz": [0.35, 0.3, 1.0, 1.0, 1.0][f]},
            "crew_yell": {"show": f == 1},
            "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.1, 1.3, 1][f], "z": [0, 0, 1.5, 3, 0][f]}}


FLAK_OVERLAYS = {"fire": {1: [_burst("gun", (FLAK_MUZ[0] + 2.0, -3.0, 20.0), 6.0, 11.0)]}}


# -- Howitzer: a big gun on a split-trail carriage with spades, a breech that opens ------------------
HOW_MUZ = (38.0, 0.0, 19.0)


def howitzer_build(rig):
    concrete_pad(rig, r=18.0, h=4.0)
    g = Geo()   # split trails with spades dug in behind
    for y in (-7.0, 7.0):
        g.capsule((-4.0, y * 0.5, 9.0), (-20.0, y, 4.5), 1.8)
    rig.part("mount", g, OLIVE, outline=0.5)
    g = Geo()
    for y in (-7.0, 7.0):
        box(g, (-21.0, y, 4.0), (1.0, 2.6, 2.4), p=4)
    rig.part("mount", g, GUNMETAL, finish="metal", outline=0.4)
    pennant(rig, "mount", -17, 7, 5, h=30, pole=STEEL, finial=STEEL)
    g = Geo()
    for y in (-9, 9):
        cyl(g, (-2, y, 9), (-2, y * 1.3, 9), 7, bevel=0.8, segs=16)
    rig.part("mount", g, "#34373C")
    g = Geo()
    for y in (-12, 12):
        cyl(g, (-2, y, 9), (-2, y * 1.02, 9), 4.2, bevel=0.3, segs=14)
    rig.part("mount", g, team=True, outline=0.4)
    g = Geo()
    for a in range(0, 360, 60):
        t = math.radians(a)
        g.sphere((-2 + 2.0 * math.cos(t), -12.4, 9 + 2.0 * math.sin(t)), 0.6, cuts=2)
    rig.part("mount", g, STEEL, finish="metal", outline=0)
    # the gun shield (olive with a team panel and a chevron) and the cradle
    shield = Geo().slab([(3, 9), (9, 9), (10.4, 31), (3, 33)], -7, 1.8)
    rig.part("head", shield, OLIVE)
    panel = Geo().slab([(3.8, 11), (8.6, 11), (9.6, 29.6), (3.8, 31.2)], -8.4, 0.8)
    pface = F.Face(rig, "head", [panel], yaw_deg=TURRET_YAW)
    rig.part("head", panel, team=True, outline=0.4)
    g = KM.chevron(pface, Geo(), K.scr(pface, (6.5, -9.2, 23.5)), s=0.5, n=1, w=1.9)
    rig.part("head", g, KM.CREAM, highlight=False, outline=0)
    g = Geo()
    box(g, (-2, 0, 16), (9, 6, 4.5), p=5)
    rig.part("head", g, OLIVE)
    # the loader crouched at the breech with a shell
    hand = gunner(rig, "head", (-17.0, -2.0, 6.0), name="crew", k=1.05, cap=True)
    rig.joint("shell", "crew_arms", hand)
    g = Geo().capsule((hand[0] - 2.0, hand[1] - 2.4, hand[2]), (hand[0] + 3.4, hand[1] - 2.4, hand[2] + 0.8), 1.8)
    rig.part("shell", g, BRASS, finish="metal", outline=0.4)
    rig.joint("gun", "head", (0, 0, 18))
    g = Geo()
    cyl(g, (-10, 0, 19), (6, 0, 19), 4.8, bevel=0.8, segs=16)
    rig.part("gun", g, OLIVE_LT, finish="metal")
    g = Geo()
    cyl(g, (6, 0, 19), (34, 0, 19), 2.9, 2.5, bevel=0.3, segs=16)
    cyl(g, (32, 0, 19), (HOW_MUZ[0] - 1, 0, 19), 3.5, bevel=0.5, segs=16)
    rig.part("gun", g, GUNMETAL, finish="metal", outline=0.5)
    g = Geo()
    cyl(g, (18, 0, 19), (19.5, 0, 19), 3.1, bevel=0.2, segs=16)
    rig.part("gun", g, SIGNAL, outline=0.3)
    g = Geo().lathe([(0, -0.2), (2.0, -0.2), (2.0, 0.4), (0, 0.4)], (HOW_MUZ[0] - 0.9, 0, 19), (HOW_MUZ[0], 0, 19),
                    segs=12)
    rig.part("gun", g, BORE, outline=0)
    # the breech block on its own joint (it swings open to eject the casing)
    rig.joint("breech", "gun", (-10.0, -2.0, 19.0))
    g = Geo()
    box(g, (-11.2, 0, 19), (1.6, 3.6, 3.6), p=5)
    rig.part("breech", g, GUNMETAL, finish="metal", outline=0.4)
    g = Geo().capsule((-12.4, -4.0, 20.0), (-15.4, -4.0, 16.0), 0.8)
    rig.part("breech", g, STEEL, finish="metal", outline=0.3)
    rig.joint("casing", "gun", (-12.0, 0.0, 19.0), hidden=True)
    g = Geo().capsule((-11.0, -2.0, 19.0), (-16.0, -2.0, 19.0), 1.9)
    rig.part("casing", g, BRASS, finish="metal", outline=0.4)
    muzzle_flash(rig, "gun", HOW_MUZ, 1.5)
    smoke_puff(rig, "gun", (HOW_MUZ[0] + 2, 0, 20), 1.2)


def howitzer_idle(f):
    # 6 frames: the barrel creeps up and down as it lays, the loader cradles the shell and glances up
    t = f / 6 * 2 * math.pi
    return {"gun": {"r": 1.6 * math.sin(t)},
            "crew": {"z": 0.5 * math.sin(t), "r": [0, 2, 5, 5, 2, 0][f]},
            "crew_arms": {"r": -40.0 + 4.0 * math.sin(t)},
            "crew_eyes": {"z": [0, 0.3, 0.7, 0.7, 0.3, 0][f], "sz": 0.2 if f == 4 else 1.0}}


def howitzer_fire(f):
    # 0 the loader has rammed the shell and covers his ears (anticipation, the barrel lifts), 1 BOOM:
    # a huge recoil, the whole carriage jumps, 2 the breech swings open and the casing flies out,
    # 3 the casing falls, the barrel runs out, 4 the breech closes
    return {"gun": {"x": [0.5, -7.0, -5.0, -2.0, 0][f], "r": [2.0, 7.0, 4.5, 1.5, 0][f],
                    "sz": [1.0, 0.92, 1.04, 1.0, 1.0][f]},
            "head": {"z": [0, 1.4, 0.4, 0, 0][f], "r": [0, 1.5, 0.5, 0, 0][f]},
            "breech": {"r": [0, 0, -70, -55, 0][f]},
            "casing": {"show": f in (2, 3), "x": [0, 0, -4.0, -9.0, 0][f], "z": [0, 0, 3.0, -6.0, 0][f],
                       "r": [0, 0, 40, 130, 0][f]},
            "shell": {"hide": True},
            "crew": {"z": [-1.5, -3.0, -2.5, -1.0, 0][f], "r": [10, 14, 10, 4, 0][f]},
            "crew_arms": {"r": [55.0, 60.0, 55.0, 10.0, -30.0][f]},
            "crew_eyes": {"sz": [0.25, 0.2, 0.25, 1.0, 1.0][f]},
            "crew_yell": {"show": f in (1, 2)},
            "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.15, 1.4, 1][f], "z": [0, 0, 2, 4, 0][f]}}


HOW_OVERLAYS = {"fire": {1: [_burst("gun", (HOW_MUZ[0] + 3.0, 0, 19.0), 8.0, 15.0, n=6, a0=-70.0, arc=140.0),
                             {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 91,
                              "spread": 1.0, "dir": -1.0},
                             {"kind": "dust", "ground": (12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 92,
                              "spread": 1.0}]}}


# -- Searchlight Sniper: a searchlight drum with a scoped rifle and a sniper in a soft cap -----------
SL_MUZ = (27.0, -9.0, 15.0)


def searchlight_build(rig):
    concrete_pad(rig, r=14.0, h=4.0)
    sandbags(rig, "mount", r=14.0, rows=1, z0=6.0, arc=(0.15, 0.85), n=5)
    g = Geo()
    cyl(g, (0, 0, 4), (0, 0, 14), 3, bevel=0.4)
    rig.part("mount", g, STEEL, finish="metal", outline=0.5)
    pennant(rig, "mount", -13, 5, 4, h=32, pole=STEEL, finial=STEEL)
    # the searchlight drum with the rifle along its side
    g = Geo()
    cyl(g, (-8, 0, 20), (8, 0, 20), 7, 8, bevel=1.0, segs=20)
    rig.part("head", g, OLIVE)
    g = Geo()
    for x in (3.0, 5.6):   # cooling ribs
        cyl(g, (x, 0, 20), (x + 0.8, 0, 20), 7.6, bevel=0.2, segs=20)
    rig.part("head", g, OLIVE_DK, outline=0)
    g = Geo()
    cyl(g, (-8, 0, 20.5), (1.5, 0, 20.5), 7.4, 7.9, bevel=0.5, segs=20)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo().lathe([(0, 0), (6.8, 0), (6.8, 0.5), (0, 1.2)], (8.2, 0, 20), (9.2, 0, 20), segs=20)
    rig.part("head", g, glow=LENS, outline=0.8, outline_hex=STEEL)
    g = Geo()   # the rifle and its scope
    cyl(g, (-6, -9, 15), (SL_MUZ[0] - 1, -9, 15), 1.1, bevel=0.2, segs=10)
    box(g, (-3, -9, 14.5), (6, 1.6, 2.2), p=5)
    cyl(g, (0, -9, 18), (9, -9, 18), 1.5, bevel=0.3, segs=10)
    rig.part("head", g, GUNMETAL, finish="metal", outline=0.5)
    g = Geo().capsule((-9.0, -9, 14.0), (-4.0, -9, 14.6), 1.8)
    rig.part("head", g, WOOD, outline=0.4)
    # the sniper behind the rifle, cheek on the stock
    gunner(rig, "head", (-14.0, -8.0, 5.0), name="crew", k=0.95, cap=True)
    # a scope glint (a small white star) and the beam
    rig.joint("glint", "head", (9.4, -10.4, 18.0), hidden=True)
    g = Geo().star((9.6, -11.0, 18.0), 3.0, 0.8, 0.6, points=4, rot=(90, 0, 0))
    rig.part("glint", g, glow="#FFFFFF", outline=0.4, outline_hex=STEEL)
    rig.joint("beam", "head", (9, 0, 20), hidden=True)
    g = Geo().lathe([(7, 0), (11.5, 24), (0.1, 24)], (9.5, 1, 20), (34, 1, 20), segs=16)
    rig.part("beam", g, glow="#FFF8E6", outline=0)
    muzzle_flash(rig, "head", SL_MUZ, 0.8)


def searchlight_idle(f):
    # 6 frames: the light sweeps up and down the lane, the scope glints once, the sniper blinks
    t = f / 6 * 2 * math.pi
    return {"head": {"r": 3.0 * math.sin(t), "rz": 2.0 * math.sin(t + 1.0)},
            "glint": {"show": f == 2},
            "crew_eyes": {"sz": 0.25 if f in (1, 2, 3) else (0.2 if f == 5 else 1.0)}}


def searchlight_fire(f):
    # 0 the light snaps onto the target (beam on, a glint), 1 CRACK (flash), 2 the kick, 3-4 settle
    return {"head": {"x": [0.4, -2, -1, 0, 0][f], "r": [0, 1.5, 0.8, 0, 0][f]},
            "beam": {"show": f in (0, 1)},
            "glint": {"show": f == 0},
            "crew": {"x": [0.4, -1.0, -0.5, 0, 0][f]},
            "crew_eyes": {"sz": [0.25, 0.25, 1.0, 1.0, 1.0][f]}}


SL_OVERLAYS = {"fire": {1: [_burst("head", (SL_MUZ[0] + 2.0, -9.0, 15.0), 5.0, 9.0)]}}


TURRETS = [
    turret_module("mg_nest", "MG Nest", "modern", 30, CANVAS, FEET, (0, 18), MG_MUZ, mg_build,
                  mg_idle, mg_fire, muzzle_joint="gun", idle_frames=6, overlays=MG_OVERLAYS),
    turret_module("flak_gun", "Flak Gun", "modern", 38, CANVAS, FEET, (0, 16), FLAK_MUZ, flak_build,
                  flak_idle, flak_fire, muzzle_joint="gun", aim=(-70, 30), idle_frames=6, overlays=FLAK_OVERLAYS),
    turret_module("howitzer", "Howitzer", "modern", 36, CANVAS, FEET, (0, 16), HOW_MUZ, howitzer_build,
                  howitzer_idle, howitzer_fire, muzzle_joint="gun", aim=(-40, 10), idle_frames=6,
                  overlays=HOW_OVERLAYS),
    turret_module("searchlight_sniper", "Searchlight Sniper", "modern", 34, CANVAS, FEET, (0, 18), SL_MUZ,
                  searchlight_build, searchlight_idle, searchlight_fire, idle_frames=6, overlays=SL_OVERLAYS),
]
