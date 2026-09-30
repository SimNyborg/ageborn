"""Industrial Age turrets (docs/design-lane-ages.md A17.10, A17.12): Gatling Gun, Mortar Pit, Boiler
Mortar, Tesla Tower. Same contract as the other ages (common.turret_module): a static `mount` frame
and a rotating head (`idle`, `fire` with a per-frame muzzle anchor), plus `build` and `destroyed`.

Palette (A17.12): iron, coal, smoke cream, muted brick; copper and brass as small accents. The Tesla
arcs are a pale violet-white (outside the team hue bands), never cyan.
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import kit_medieval as K
from ageborn_art.geometry import Geo

from world.common import TURRET_YAW, box, cyl, muzzle_flash, pennant, smoke_puff, turret_module

IRON = "#5B6168"
IRON_LT = "#767D86"
IRON_DK = "#454A51"
COAL = "#2B2A2E"
COAL_LT = "#403F45"
CREAM = "#DCD6C8"
BRICK = "#8A6A63"
BRICK_DK = "#735852"
MORTAR_JOINT = "#B9AFA2"
COPPER = "#B06A3B"
BRASS = "#9A8A62"
BRASS_LT = "#B8A776"
WOOD = "#7A624E"            # held under 40% saturation (A11 colour rule)
SAND = "#B7A98C"
BORE = "#1E1C1C"
EMBER = "#FFD9A8"
STEAM = "#F2F0EA"
ARC = "#E4DAFF"
ARC_CORE = "#FFFFFF"
GLASS = "#D6D2E6"

CANVAS = (300, 220)
FEET = (100, 180)


def brick_block(rig, joint, c, r, rows=3, color=BRICK, joint_color=MORTAR_JOINT, seed=0):
    """A brick plinth: a rounded block with mortar courses drawn as thin light bands."""
    x, y, z = c
    rx, ry, rz = r
    g = Geo()
    box(g, c, r, p=6)
    rig.part(joint, g, color)
    g = Geo()
    for k in range(1, rows):
        zz = z - rz + 2 * rz * k / rows
        box(g, (x, y - ry - 0.2, zz), (rx - 0.6, 0.4, 0.35), p=4, cuts=2)
    for k in range(rows):
        zz = z - rz + 2 * rz * (k + 0.5) / rows
        off = (k % 2) * rx * 0.33
        for xx in (x - rx * 0.66 + off, x + off):
            if abs(xx - x) < rx - 1.5:
                box(g, (xx, y - ry - 0.2, zz), (0.35, 0.4, rz / rows - 0.3), p=4, cuts=2)
    rig.part(joint, g, joint_color, outline=0, highlight=False)


STRIPE_DK = "#2F2E33"
STRIPE_LT = "#D9CFA8"      # pale hazard yellow-cream (under 40% saturation, A11 colour rule)
SKIN = "#EBC4A0"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
LEATHER = "#6B5444"
SHELL_BRASS = "#B8A776"


def works_plinth(rig, r=15.0, h=9.0, sign=True):
    """Industrial works plinth: a brick footing under a riveted iron cap plate with a hazard-striped
    edge, and a team enamel sign with a cream cog on the near face (the age's emblem)."""
    d = r * 0.78
    brick_block(rig, "mount", (0, 2, (h - 2.4) / 2), (r, d, (h - 2.4) / 2), rows=2)
    g = Geo()
    box(g, (0, 2, h - 1.2), (r + 1.0, d + 1.0, 1.4), p=6)
    rig.part("mount", g, team=True)             # a team-enamelled cap plate
    # the cap's near edge: dark and pale hazard stripes
    edge = Geo()
    box(edge, (0, 2 - d - 1.05, h - 1.2), (r + 0.6, 0.25, 1.15), p=6, cuts=2)
    ef = F.Face(rig, "mount", [edge], yaw_deg=TURRET_YAW)
    rig.part("mount", edge, STRIPE_LT, outline=0.3)
    g = KI.stripes(ef, Geo(), K.scr(ef, (0, 2 - d - 1.3, h - 1.2)), 2 * r, 2.0, n=int(r / 1.6), slant=0.9)
    rig.part("mount", g, STRIPE_DK, highlight=False, outline=0)
    g = Geo()
    for x in range(int(-r) + 2, int(r) - 1, 5):
        g.sphere((x, 2 - d - 0.8, h - 0.1), 0.7, cuts=2)
    rig.part("mount", g, BRASS_LT, finish="metal", outline=0)
    if sign:
        sx, sz = -r * 0.42, (h - 2.4) * 0.5
        plate = Geo()
        box(plate, (sx, 2 - d - 0.9, sz), (5.6, 0.5, 3.4), p=5, cuts=2)
        pf = F.Face(rig, "mount", [plate], yaw_deg=TURRET_YAW)
        rig.part("mount", plate, team=True, outline=0.5)
        g = KI.cog(pf, Geo(), K.scr(pf, (sx, 2 - d - 1.5, sz)), s=0.7)
        rig.part("mount", g, KI.CREAM, highlight=False, outline=0)


def crewman(rig, parent, at, name="crew", k=1.0):
    """A small turret crewman from the waist up: a team jacket, a leather cap with goggles, big
    eyes (their own joint so they can squeeze), and arms on joint `<name>_arms` pivoting at the
    shoulder, modelled reaching forward-up (hands at +x)."""
    x, y, z = at
    rig.joint(name, parent, at)
    g = Geo().blob((x, y, z + 4.2 * k), (5.4 * k, 5.2 * k, 5.4 * k), p=2.4, taper=(1.1, 0.9))
    rig.part(name, g, team=True)
    hz = z + 13.0 * k
    g = Geo().blob((x + 0.6 * k, y, hz), (5.6 * k, 5.4 * k, 5.6 * k), p=2.3)
    g.blob((x + 6.0 * k, y - 0.4, hz - 1.0 * k), (1.8 * k, 1.6 * k, 1.7 * k), p=2.0)
    rig.part(name, g, SKIN)
    g = Geo().blob((x - 0.2, y, hz + 2.8 * k), (6.2 * k, 6.0 * k, 4.4 * k), p=2.3)
    g.clip((x, y, hz + 1.0 * k), (0, 0, -1))
    g.blob((x + 5.4 * k, y, hz + 2.0 * k), (2.6 * k, 5.0 * k, 0.8 * k), p=2.6)
    rig.part(name, g, LEATHER)
    rig.joint(f"{name}_eyes", name, (x + 4.6 * k, y, hz + 0.4 * k))
    g = Geo()
    for yy in (-2.4 * k, 2.2 * k):
        g.blob((x + 4.4 * k, y + yy, hz + 0.4 * k), (1.6 * k, 1.6 * k, 2.0 * k))
    rig.part(f"{name}_eyes", g, EYE, highlight=False, outline=0.4)
    g = Geo()
    for yy in (-2.4 * k, 2.2 * k):
        g.blob((x + 5.7 * k, y + yy - 0.2, hz + 0.3 * k), (0.6 * k, 1.0 * k, 1.1 * k))
    rig.part(f"{name}_eyes", g, PUPIL, outline=0)
    g = Geo().blob((x + 5.6 * k, y - 0.4, hz - 3.4 * k), (0.8, 2.0 * k, 0.7 * k), p=2.4)
    rig.part(name, g, MOUTH, outline=0, highlight=False)
    sh = (x + 0.6 * k, y - 4.6 * k, z + 7.6 * k)
    rig.joint(f"{name}_arms", name, sh)
    g = Geo()
    for dy in (0.0, 8.4 * k):
        g.capsule((sh[0], sh[1] + dy, sh[2]), (sh[0] + 9.0 * k, sh[1] + dy * 0.8, sh[2] + 3.0 * k), 1.9 * k, 1.6 * k)
        g.sphere((sh[0] + 10.0 * k, sh[1] + dy * 0.8, sh[2] + 3.4 * k), 2.1 * k, cuts=3)
    rig.part(f"{name}_arms", g, team=True, outline=0.5)
    return (sh[0] + 11.0 * k, sh[1] + 3.4 * k, sh[2] + 3.4 * k)


def sandbags(rig, joint, r=17.0, rows=2, color=SAND, team_tarp=False):
    g = Geo()
    for row in range(rows):
        n = 7
        for k in range(n):
            a = math.pi * (0.1 + 0.8 * k / (n - 1)) + (0.06 if row % 2 else 0)
            x, y = r * math.cos(a) * 0.9, -r * math.sin(a) * 0.55 + 2
            g.blob((x, y, 3 + row * 5), (5.4, 4.0, 3.0), p=2.6, rot=(0, 0, math.degrees(-a) + 90))
    g.blob((0, 6, 4), (r * 0.9, 6, 4), p=3)
    rig.part(joint, g, color, finish="hair")
    if team_tarp:   # a team tarpaulin thrown over the front sandbags
        g = Geo()
        for k in range(5):
            a = math.pi * (0.3 + 0.4 * k / 4)
            x, y = r * math.cos(a) * 0.9, -r * math.sin(a) * 0.55 + 1.2
            g.blob((x, y, 9.4), (5.8, 4.2, 2.4), p=2.6, rot=(0, 0, math.degrees(-a) + 90))
        rig.part(joint, g, team=True, outline=0.5)


# -- Gatling Gun: a crank-fed six-barrel gun with a hopper on a riveted pedestal -------------------
def gatling_build(rig):
    works_plinth(rig, r=16.0, h=6.0)
    g = Geo()   # a heap of spent brass casings on the plinth
    for dx, dy, a in ((9.0, -6.0, 20), (11.0, -4.4, -40), (8.4, -3.6, 70), (12.4, -7.0, 5)):
        t = math.radians(a)
        g.capsule((dx, dy, 6.4), (dx + 2.2 * math.cos(t), dy + 2.2 * math.sin(t), 6.6), 0.75)
    rig.part("mount", g, SHELL_BRASS, finish="metal", outline=0.3)
    g = Geo()
    cyl(g, (0, 0, 5), (0, 0, 14), 7.6, 5.4, bevel=0.8, segs=20)
    rig.part("mount", g, IRON, finish="metal")
    g = Geo()
    for a in range(-160, -10, 30):
        t = math.radians(a)
        g.sphere((6.9 * math.cos(t), 6.9 * math.sin(t) * 0.9, 7.4), 0.8, cuts=2)
    rig.part("mount", g, BRASS_LT, finish="metal", outline=0)
    pennant(rig, "mount", -14, 6, 5, h=30, pole=IRON_DK, finial=BRASS_LT)
    # head: yoke, the gun on a joint (barrels on their own spinning joint)
    g = Geo()
    box(g, (0, 0, 15.5), (5, 6.5, 2.0), p=5)
    for y in (-6.2, 6.2):
        box(g, (0, y, 18.5), (2.4, 0.9, 4.4), p=4)
    rig.part("head", g, IRON_DK, finish="metal")
    rig.joint("gun", "head", (0, 0, 20))
    g = Geo()   # the team-painted receiver housing and the breech drum
    cyl(g, (-9, 0, 20.5), (4, 0, 20.5), 4.6, bevel=0.8, segs=18)
    rig.part("gun", g, team=True)
    g = Geo()
    cyl(g, (-6, 0, 20.5), (-4.6, 0, 20.5), 4.9, bevel=0.2, segs=18)
    cyl(g, (1, 0, 20.5), (2.4, 0, 20.5), 4.9, bevel=0.2, segs=18)
    rig.part("gun", g, BRASS, finish="metal", outline=0.4)
    rig.joint("crank", "gun", (-7.0, -6.0, 20.5))   # the crank on the near side (it turns)
    g = Geo()
    g.capsule((-7.0, -5.2, 20.5), (-7.0, -7.0, 20.5), 1.0)
    g.capsule((-7.0, -7.0, 20.5), (-10.5, -7.0, 16.5), 0.8)
    g.capsule((-10.5, -7.0, 16.5), (-10.5, -9.4, 16.5), 0.9)
    rig.part("crank", g, IRON_DK, finish="metal", outline=0.4)
    g = Geo().capsule((-10.5, -9.4, 16.5), (-10.5, -11.4, 16.5), 1.3)
    rig.part("crank", g, WOOD, outline=0.4)
    # a round team ammo drum on the far side and an ejected casing (hidden)
    g = Geo()
    cyl(g, (-3.0, 5.0, 24.0), (-3.0, 8.4, 24.0), 5.4, bevel=0.6, segs=20)
    rig.part("gun", g, team=True)
    rig.joint("casing", "gun", (-4.0, -4.0, 18.0), hidden=True)
    g = Geo().capsule((-4.0, -5.0, 18.0), (-4.0, -5.0, 15.6), 0.8)
    rig.part("casing", g, SHELL_BRASS, finish="metal", outline=0.4)
    g = Geo()   # the gravity hopper on top
    box(g, (-1.0, 0, 28.0), (3.6, 2.4, 5.2), p=4, taper=(0.8, 1.1))
    rig.part("gun", g, team=True, outline=0.5)                 # a team-painted hopper
    g = Geo()
    for z in (26.0, 29.0, 32.0):
        cyl(g, (-3.0, -2.4, z), (1.0, -2.4, z), 0.7, bevel=0.1, segs=8)
    rig.part("gun", g, BRASS_LT, finish="metal", outline=0)
    rig.joint("barrels", "gun", (4, 0, 20.5))
    g = Geo()
    for k in range(6):
        a = 2 * math.pi * k / 6
        dy, dz = 2.3 * math.cos(a), 2.3 * math.sin(a)
        cyl(g, (4, dy, 20.5 + dz), (27, dy, 20.5 + dz), 0.95, bevel=0.1, segs=10)
    rig.part("barrels", g, IRON_DK, finish="metal", outline=0.4)
    g = Geo()
    for x in (12.0, 24.0):
        cyl(g, (x, 0, 20.5), (x + 1.6, 0, 20.5), 3.7, bevel=0.3, segs=18)
    rig.part("barrels", g, COPPER, finish="metal", outline=0.4)
    muzzle_flash(rig, "gun", (27.5, 0, 20.5), 0.9)
    smoke_puff(rig, "gun", (29, 0, 21.5), 0.55)


def gatling_idle(f):
    # 6 frames: a slow barrel turn (one twelfth of a turn per frame), the gun nodding as it scans,
    # the crank ticking round
    return {"gun": {"r": 1.4 * math.sin(f / 6 * 2 * math.pi), "rz": 3.0 * math.sin(f / 6 * 2 * math.pi - 1.0)},
            "barrels": {"rx": 10.0 * f}, "crank": {"r": -60.0 * f}}


def gatling_fire(f):
    # 0 spin-up (the barrels blur), 1 the shot (one flash: the clip repeats for the rapid fire),
    # 2 a casing flips out, 3 it falls, 4 the barrels spin down
    return {"gun": {"x": [0.4, -2.0, -0.8, -0.3, 0][f], "z": [0, 0.5, 0.2, 0, 0][f], "r": [0.5, 1.5, 0.8, 0.3, 0][f]},
            "barrels": {"rx": [25, 55, 85, 105, 120][f]}, "crank": {"r": [-80, -200, -320, -400, -440][f]},
            "casing": {"show": f in (2, 3), "x": [0, 0, -2.0, -5.0, 0][f], "z": [0, 0, 3.0, -2.0, 0][f],
                       "r": [0, 0, 80, 220, 0][f]},
            "smoke": {"show": f in (2, 3, 4), "s": [1, 1, 0.8, 1.0, 1.2][f], "z": [0, 0, 0, 1.5, 3][f]}}


GATLING_OVERLAYS = {"fire": {
    0: [{"kind": "rings", "joint": "barrels", "point": (26.0, 0, 20.5), "radii_lu": (4.0, 6.5), "a0": -90.0,
         "a1": 90.0}],
    1: [{"kind": "burst", "joint": "gun", "point": (29.0, 0, 20.5), "r0_lu": 7.0, "r1_lu": 12.0, "n": 5, "a0": -60.0,
         "arc": 120.0}],
    2: [{"kind": "rings", "joint": "barrels", "point": (26.0, 0, 20.5), "radii_lu": (4.0,), "a0": -90.0,
         "a1": 90.0}]}}


# -- Mortar Pit: a wide ring of sandbags round a short, fat tube on a base plate ----------------------
PIT_ANG = 50.0
PIT_L = 13.0


def pit_build(rig):
    g = Geo()
    cyl(g, (0, 2, 0), (0, 2, 3), 17.5, 16.5, bevel=0.8, segs=24, squash=(1.0, 0.75))
    rig.part("mount", g, "#6F665A")
    sandbags(rig, "head", r=20.0, rows=2, team_tarp=True)   # the ring is part of the head: squat and wide
    pennant(rig, "mount", -15, 7, 8, h=28, pole=IRON_DK, finial=BRASS_LT)
    g = Geo()   # an ammo crate with a team lid behind the pit
    box(g, (-13.0, -8.0, 4.4), (5.2, 3.6, 3.6), p=5)
    rig.part("mount", g, WOOD)
    g = Geo()
    box(g, (-13.0, -8.0, 8.6), (5.8, 4.2, 1.2), p=5)
    rig.part("mount", g, team=True, outline=0.5)
    g = Geo()
    for dx in (-3.4, 0.0, 3.4):
        box(g, (-13.0 + dx, -11.7, 4.4), (0.9, 0.3, 3.2), p=4, cuts=2)
    rig.part("mount", g, STRIPE_DK, outline=0, highlight=False)
    g = Geo()   # shells stacked by the tube
    for dx, dy in ((9, 6), (12, 3.6)):
        g.capsule((dx, dy, 3.4), (dx, dy, 9.0), 1.7)
    rig.part("mount", g, IRON_DK, finish="metal", outline=0.4)
    g = Geo()
    for dx, dy in ((9, 6), (12, 3.6)):
        g.sphere((dx, dy, 9.4), 1.2, cuts=2)
    rig.part("mount", g, COPPER, finish="metal", outline=0.3)
    # head: base plate, bipod and the tube pointing up and forward
    g = Geo()
    cyl(g, (0, 0, 3.0), (0, 0, 5.0), 8.0, bevel=0.4, segs=18, squash=(1.0, 0.7))
    rig.part("head", g, IRON_DK, finish="metal")
    rig.joint("gun", "head", (0, 0, 6))
    ang = math.radians(PIT_ANG)
    ux, uz = math.cos(ang), math.sin(ang)
    L = PIT_L
    g = Geo()
    cyl(g, (0, 0, 6), (ux * L, 0, 6 + uz * L), 5.6, 5.2, bevel=0.6, segs=18)
    rig.part("gun", g, IRON, finish="metal")
    g = Geo()
    cyl(g, (ux * (L - 3), 0, 6 + uz * (L - 3)), (ux * (L + 0.5), 0, 6 + uz * (L + 0.5)), 6.3, bevel=0.6, segs=18)
    rig.part("gun", g, IRON_DK, finish="metal")
    g = Geo()
    cyl(g, (ux * 5, 0, 6 + uz * 5), (ux * 8, 0, 6 + uz * 8), 5.9, bevel=0.3, segs=18)
    rig.part("gun", g, team=True, outline=0.4)
    g = Geo().lathe([(0, -0.2), (4.2, -0.2), (4.2, 0.4), (0, 0.4)], (ux * (L + 0.6), 0, 6 + uz * (L + 0.6)),
                    (ux * (L + 1.6), 0, 6 + uz * (L + 1.6)), segs=14)
    rig.part("gun", g, BORE, outline=0)
    # the loader crouched behind the tube with a shell (hidden once it is dropped in)
    hand = crewman(rig, "head", (-12.5, 3.0, 8.0), name="crew", k=1.12)
    rig.joint("shell", "crew_arms", hand)
    g = Geo().capsule((hand[0], hand[1] - 3.0, hand[2] - 2.0), (hand[0], hand[1] - 3.0, hand[2] + 4.0), 2.0)
    rig.part("shell", g, IRON_DK, finish="metal", outline=0.5)
    g = Geo().sphere((hand[0], hand[1] - 3.0, hand[2] + 4.4), 1.6, cuts=2)
    rig.part("shell", g, COPPER, finish="metal", outline=0.3)
    g = Geo()   # bipod
    for y in (-4.5, 4.5):
        g.capsule((ux * 9, 0, 6 + uz * 9), (13.0, y * 1.4, 3.0), 0.9)
    rig.part("head", g, IRON_DK, finish="metal", outline=0.4)
    tip = (ux * (L + 1.0), 0, 6 + uz * (L + 1.0))
    muzzle_flash(rig, "gun", tip, 1.1)
    smoke_puff(rig, "gun", (tip[0] + 1, 0, tip[2] + 3), 0.9)


PIT_TIP = (math.cos(math.radians(PIT_ANG)) * (PIT_L + 1.0), 0, 6 + math.sin(math.radians(PIT_ANG)) * (PIT_L + 1.0))


def pit_idle(f):
    # 6 frames: the loader fidgets (bobs, glances up at the sky and back), shell cradled
    t = f / 6 * 2 * math.pi
    return {"gun": {"sz": 1 + 0.015 * math.sin(t)},
            "crew": {"z": 0.6 * math.sin(t), "r": [0, 2, 6, 6, 2, 0][f]},
            "crew_arms": {"r": -58.0 + 4.0 * math.sin(t)},
            "crew_eyes": {"z": [0, 0.3, 0.8, 0.8, 0.3, 0][f]}}


def pit_fire(f):
    # 0 the loader holds the shell over the muzzle, 1 THUMP: it is gone, he ducks with his hands
    # over his cap, 2 smoke rolls out, 3 he peeks, 4 settles
    return {"gun": {"sz": [1.02, 0.84, 1.06, 1.0, 1.0][f], "sx": [1.0, 1.08, 0.97, 1.0, 1.0][f],
                    "z": [0, -1.5, 0.5, 0, 0][f]},
            "crew": {"z": [1.5, -4.0, -3.5, -1.0, 0][f], "x": [2.0, -1.0, -1.0, 0, 0][f], "r": [-8, 12, 10, 4, 0][f]},
            "crew_arms": {"r": [6.0, 52.0, 50.0, -20.0, -50.0][f]},
            "shell": {"hide": f in (1, 2, 3)},
            "crew_eyes": {"sz": [1.0, 0.25, 0.25, 1.0, 1.0][f]},
            "flash": {"r": PIT_ANG}, "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.2, 1.45, 1][f],
                                            "z": [0, 0, 3, 6, 0][f]}}


PIT_OVERLAYS = {"fire": {
    1: [{"kind": "burst", "joint": "gun", "point": PIT_TIP, "r0_lu": 6.0, "r1_lu": 11.0, "n": 6, "a0": 0.0,
         "arc": 180.0},
        {"kind": "dust", "ground": (14.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 81, "spread": 1.0}]}}


# -- Boiler Mortar: a fat mortar on trunnions over a riveted boiler, with a steam vent -------------
def boiler_build(rig):
    works_plinth(rig, r=17.0, h=10.0)
    g = Geo()   # firebox door with a warm grate on the brick front
    cyl(g, (6, -10.4, 5), (6, -11.4, 5), 3.4, bevel=0.3, segs=16)
    rig.part("mount", g, COAL_LT, finish="metal", outline=0.4)
    g = Geo()
    for dz in (-1.2, 0.0, 1.2):
        box(g, (6, -11.8, 5 + dz), (2.4, 0.3, 0.35), p=4, cuts=2)
    rig.part("mount", g, glow=EMBER, outline=0)
    pennant(rig, "mount", -15, 7, 10, h=28, pole=IRON_DK, finial=BRASS_LT)
    # the boiler (a horizontal drum across the plinth), part of the head so it vents on fire
    g = Geo()
    cyl(g, (-13, 0, 17), (13, 0, 17), 9.2, bevel=1.6, segs=24)
    rig.part("head", g, team=True)              # the boiler drum is team-painted
    g = Geo()   # riveted domed end caps
    for x, d in ((-13.0, -1), (13.0, 1)):
        g.blob((x + d * 1.2, 0, 17), (2.6, 8.6, 8.6), p=2.2)
    rig.part("head", g, IRON_LT, finish="metal", outline=0.5)
    g = Geo()
    for x in (-9.0, 9.0):
        cyl(g, (x, 0, 17), (x + 1.5, 0, 17), 9.6, bevel=0.3, segs=22)
    rig.part("head", g, COPPER, finish="metal", outline=0.4)
    g = Geo()
    for x in (-5.2, 1.8):
        cyl(g, (x, 0, 17), (x + 3.4, 0, 17), 9.5, bevel=0.3, segs=22)
    rig.part("head", g, IRON_DK, finish="metal", outline=0.4)
    g = Geo()   # rivets along the drum
    for x in range(-11, 12, 4):
        g.sphere((x, -8.4, 20.0), 0.8, cuts=2)
    rig.part("head", g, BRASS_LT, finish="metal", outline=0)
    g = Geo()   # the steam vent and the pressure gauge
    cyl(g, (-8, 0, 23), (-9, 0, 31), 1.5, 1.3, bevel=0.2, segs=12)
    cyl(g, (-9.2, 0, 30.5), (-9.4, 0, 32.5), 2.4, bevel=0.3, segs=12)
    rig.part("head", g, IRON_DK, finish="metal", outline=0.4)
    KI.gauge(rig, "head", (-2.0, -8.0, 20.6), r=3.4, name="gauge", normal=(0.0, -1.0))
    # a safety valve that jets steam sideways as the pressure builds (hidden)
    rig.joint("jet", "head", (10.0, -6.0, 24.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((2, 1, 2.2), (5, 2.4, 2.6), (8.5, 3.6, 3.0), (12, 5.0, 2.6)):
        g.sphere((10.0 + dx, -8.0, 24.0 + dz), r, cuts=3)
    rig.part("jet", g, STEAM, finish="dust", outline=0.5)
    rig.joint("steam", "head", (-9.2, 0, 34), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 2, 3.4), (-3, 6, 3.0), (2, 8, 2.6), (-1, 11, 2.2)):
        g.sphere((-9.2 + dx, -1, 34 + dz), r, cuts=3)
    rig.part("steam", g, STEAM, finish="dust", outline=0.5)
    # trunnion cradle and the fat barrel on its own joint, pointing up and forward
    g = Geo()
    for y in (-6.0, 6.0):
        box(g, (4.0, y, 25.0), (3.2, 1.0, 3.8), p=4)
    rig.part("head", g, IRON_DK, finish="metal")
    rig.joint("gun", "head", (4, 0, 26))
    ang = math.radians(48)
    ux, uz = math.cos(ang), math.sin(ang)
    L = 21.0
    g = Geo()
    cyl(g, (-ux * 6, 0, 26 - uz * 6), (ux * L, 0, 26 + uz * L), 5.8, 4.8, bevel=1.0, segs=20)
    rig.part("gun", g, IRON_DK, finish="metal")
    g = Geo()
    cyl(g, (ux * (L - 3), 0, 26 + uz * (L - 3)), (ux * (L + 1), 0, 26 + uz * (L + 1)), 5.9, bevel=0.8, segs=20)
    cyl(g, (0, -6.8, 26), (0, 6.8, 26), 2.0, bevel=0.3, segs=12)
    rig.part("gun", g, IRON, finish="metal")
    g = Geo()
    cyl(g, (ux * 5, 0, 26 + uz * 5), (ux * 6.5, 0, 26 + uz * 6.5), 5.6, bevel=0.3, segs=20)
    rig.part("gun", g, COPPER, finish="metal", outline=0.4)
    g = Geo()
    cyl(g, (ux * 9, 0, 26 + uz * 9), (ux * 14, 0, 26 + uz * 14), 5.5, bevel=0.3, segs=20)
    rig.part("gun", g, team=True, outline=0.4)
    g = Geo().lathe([(0, -0.2), (4.0, -0.2), (4.0, 0.4), (0, 0.4)], (ux * (L + 1.1), 0, 26 + uz * (L + 1.1)),
                    (ux * (L + 2.1), 0, 26 + uz * (L + 2.1)), segs=16)
    rig.part("gun", g, BORE, outline=0)
    tip = (4 + ux * (L + 1.5), 0, 26 + uz * (L + 1.5))
    muzzle_flash(rig, "gun", tip, 1.5)
    smoke_puff(rig, "gun", (tip[0] + 1, 0, tip[2] + 4), 1.2)


BOILER_TIP = (4 + math.cos(math.radians(48)) * 22.5, 0, 26 + math.sin(math.radians(48)) * 22.5)


def boiler_idle(f):
    # 6 frames: the boiler breathes, the vent puffs twice, the gauge needle trembles
    t = f / 6 * 2 * math.pi
    return {"gun": {"sz": 1 + 0.012 * math.sin(t)}, "head": {"sx": 1 + 0.01 * math.sin(t)},
            "steam": {"show": f in (1, 2, 4), "s": [0.6, 0.6, 0.85, 0.6, 0.7, 0.6][f], "z": [0, 0, 2.5, 0, 1.0, 0][f]},
            "gauge_needle": {"r": [-20, -14, -24, -16, -22, -12][f]}}


def boiler_fire(f):
    # 0 the needle swings into the red, the boiler swells and the safety valve hisses, 1 THUMP
    # (squash, flash), 2-4 steam and smoke roll out, the needle drops back
    return {"gun": {"sz": [1.04, 0.84, 1.07, 1.0, 1.0][f], "sx": [0.98, 1.1, 0.96, 1.0, 1.0][f],
                    "x": [0.5, -2.0, -0.6, 0, 0][f]},
            "head": {"sz": [1.03, 0.93, 1.03, 1.0, 1.0][f], "sx": [1.04, 1.02, 0.99, 1.0, 1.0][f]},
            "flash": {"r": 48.0},
            "gauge_needle": {"r": [-100, -110, -60, -30, -20][f]},
            "jet": {"show": f in (0, 1), "s": [0.8, 1.1, 1, 1, 1][f]},
            "steam": {"show": f in (1, 2, 3, 4), "s": [1, 0.9, 1.2, 1.4, 1.1][f], "z": [0, 0, 2, 4, 6][f]},
            "smoke": {"show": f in (1, 2, 3), "s": [1, 0.8, 1.1, 1.3, 1][f], "z": [0, 0, 2, 4, 0][f]}}


BOILER_OVERLAYS = {"fire": {
    1: [{"kind": "burst", "joint": "gun", "point": BOILER_TIP, "r0_lu": 7.0, "r1_lu": 13.0, "n": 6, "a0": -10.0,
         "arc": 180.0},
        {"kind": "dust", "ground": (-14.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 82, "spread": 1.0, "dir": -1.0},
        {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 83, "spread": 1.0}]}}


# -- Tesla Tower: a brick footing, and a tall copper coil crowned by a sparking globe (the head) -------
TESLA_TOP = 64.0      # the globe centre: the coil is about twice as tall as before


def tesla_build(rig):
    works_plinth(rig, r=13.0, h=9.0)
    g = Geo()
    cyl(g, (0, 0, 9), (0, 0, 13), 9.0, 8.0, bevel=0.8, segs=22)
    rig.part("mount", g, IRON_DK, finish="metal")
    g = Geo()
    cyl(g, (0, 0, 10.5), (0, 0, 12.5), 9.2, bevel=0.3, segs=22)
    rig.part("mount", g, team=True, outline=0.3)
    pennant(rig, "mount", -12, 7, 8, h=28, pole=IRON_DK, finial=BRASS_LT)
    # head: the coil column (an iron core wound with copper, cream insulators, a team band and
    # an iron lattice), the corona ring and the globe (glass over a glowing core) with arcs
    top = TESLA_TOP
    g = Geo()
    cyl(g, (0, 0, 13), (0, 0, top - 8.0), 4.0, 3.2, bevel=0.4, segs=16)
    rig.part("head", g, IRON, finish="metal")
    g, gd = Geo(), Geo()     # windings: copper with darker aged-copper turns between (colour rule)
    n = 16
    for k in range(n):
        z = 17.0 + k * (top - 30.0) / (n - 1)
        cyl(g if k % 2 == 0 else gd, (0, 0, z - 0.9), (0, 0, z + 0.9), 6.4 - k * 0.14, bevel=0.5, segs=18)
    rig.part("head", g, COPPER, finish="metal", outline=0.3)
    rig.part("head", gd, team=True, outline=0.3)
    g = Geo()
    for z, r in ((14.6, 8.2), (top - 11.0, 7.0)):
        cyl(g, (0, 0, z - 1.1), (0, 0, z + 1.1), r, bevel=0.5, segs=20)
    rig.part("head", g, CREAM, finish="gloss", outline=0.4)
    g = Geo()
    cyl(g, (0, 0, 28.0), (0, 0, 33.0), 7.4, bevel=0.5, segs=20)
    cyl(g, (0, 0, top - 16.0), (0, 0, top - 13.6), 6.6, bevel=0.4, segs=20)
    rig.part("head", g, team=True, outline=0.4)
    g = Geo()   # a lattice of iron struts round the coil
    for a in (-150, -90, -30, 90):
        t = math.radians(a)
        g.capsule((8.6 * math.cos(t), 8.6 * math.sin(t) * 0.8, 15.0),
                  (5.0 * math.cos(t), 5.0 * math.sin(t) * 0.8, top - 11.0), 0.8)
    rig.part("head", g, IRON_DK, finish="metal", outline=0.3)
    g = Geo().lathe([(9.0, -1.4), (10.6, 0), (9.0, 1.4), (7.6, 0)], (0, 0, top - 7.6), (0, 0, top - 6.6), segs=24)
    rig.part("head", g, team=True, outline=0.4)                                    # corona ring
    g = Geo().sphere((0, 0, top), 8.4, cuts=4)
    rig.part("head", g, GLASS, finish="gloss", outline=0.8, outline_hex=IRON_DK)
    g = Geo().sphere((0, -3.4, top), 5.0, cuts=3)
    rig.part("head", g, glow=ARC, outline=0)
    g = Geo().sphere((-1.2, -6.6, top + 1.4), 2.4, cuts=3)
    rig.part("head", g, glow=ARC_CORE, outline=0)
    for i in range(3):
        rig.joint(f"spark{i}", "head", (0, 0, top), hidden=True)
        a = math.radians(20 + i * 120)
        pts = [(0, -4, top)]
        for k in range(1, 5):
            j = (1 if k % 2 else -1) * 2.4
            pts.append((math.cos(a) * 5.0 * k - math.sin(a) * j, -4, top + math.sin(a) * 5.0 * k + math.cos(a) * j))
        g = Geo()
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule(p0, p1, 0.9)
        rig.part(f"spark{i}", g, glow=ARC_CORE, outline=0.5, outline_hex="#9A86D8")


def tesla_idle(f):
    # 6 frames: the coil crackles (one or two small arcs dancing round the globe), the head hums
    return {"head": {"sz": 1 + 0.015 * math.sin(f / 6 * 2 * math.pi)},
            f"spark{f % 3}": {"show": True, "s": [0.7, 0.8, 0.6, 0.75, 0.65, 0.8][f], "rx": 25.0 * f},
            f"spark{(f + 2) % 3}": {"show": f % 2 == 0, "s": 0.55}}


def tesla_fire(f):
    # 0 charge: the column squashes down, rings gather round the globe; 1 ZAP: every arc out and
    # the column stretches; 2-4 the arcs die down
    return {"head": {"sz": [0.92, 1.1, 1.03, 1.0, 1.0][f], "sx": [1.05, 0.95, 0.99, 1.0, 1.0][f]},
            "spark0": {"show": f in (0, 1, 2), "s": [0.6, 1.35, 0.9, 1, 1][f]},
            "spark1": {"show": f in (1, 3), "s": [1, 1.3, 1, 0.7, 1][f]},
            "spark2": {"show": f in (1, 2, 4), "s": [1, 1.4, 0.8, 1, 0.5][f]}}


TESLA_OVERLAYS = {
    "fire": {
        0: [{"kind": "rings", "joint": "head", "point": (0, 0, TESLA_TOP), "radii_lu": (12.0, 17.0), "a0": 0.0,
             "a1": 360.0, "color": "#EEE8FF"}],
        1: [{"kind": "burst", "joint": "head", "point": (0, 0, TESLA_TOP), "r0_lu": 11.0, "r1_lu": 20.0, "n": 9,
             "a0": 0.0, "arc": 360.0, "color": "#F2EEFF"}]},
}


TURRETS = [
    turret_module("gatling_gun", "Gatling Gun", "industrial", 34, CANVAS, FEET, (0, 20), (27.5, 0, 20.5), gatling_build,
                  gatling_idle, gatling_fire, muzzle_joint="gun", idle_frames=6, overlays=GATLING_OVERLAYS),
    turret_module("mortar_pit", "Mortar Pit", "industrial", 28, CANVAS, FEET, (0, 6), PIT_TIP, pit_build,
                  pit_idle, pit_fire, aim=(0, 0), muzzle_joint="gun", fire_kind="launch", idle_frames=6,
                  overlays=PIT_OVERLAYS),
    turret_module("boiler_mortar", "Boiler Mortar", "industrial", 46, CANVAS, FEET, (4, 26), BOILER_TIP, boiler_build,
                  boiler_idle, boiler_fire, aim=(0, 0), muzzle_joint="gun", fire_kind="launch", idle_frames=6,
                  overlays=BOILER_OVERLAYS),
    turret_module("tesla_tower", "Tesla Tower", "industrial", 72, (300, 250), (100, 210), (0, 13), (0, 0, TESLA_TOP),
                  tesla_build,
                  tesla_idle, tesla_fire, aim=(0, 0), fire_kind="arc", idle_frames=6, overlays=TESLA_OVERLAYS),
]
