"""Land Dreadnought: Industrial Age Legendary siege heavy (docs/design-lane-ages.md A17.10). Main gun
proj.shell (130 splash r40 / 2.2 s, range 160, ground). Two sponson gunners (riders) each shoot
proj.bullet 10 / 0.5 s at range 160 (G+A); on death the crew bails out as 2 Carbineers. ~180 lu with
the pennant, huge.

Look (A17.12 vehicle rig, Industrial palette): a rhomboid landship. The full-length track belt runs
all the way round a tall riveted iron side frame (a high, jutting nose and a sloped tail), with
steel grousers that scroll with the ground. The side frame carries a wide team band and a big team
roundel with a cream ring; a riveted near-side sponson with an open top holds the first gunner
(leather tanker cap, goggles) behind a rotary machine gun; the second gunner stands in a raised
rear barbette over the far sponson with his own gun, so both riders read from the side. A squat
forward casemate on the roof carries the main gun (a long iron barrel with copper bands and a
muzzle ring). A coal exhaust stack puffs smoke, twin trailing steering wheels ride behind the tail
(the landship's signature), and a tall mast flies the team pennant. Legendary white aura is added in
game.

The walk scrolls both belts with the ground (35 lu/s) and heaves the hull; the attack (main gun)
settles, fires with a big flash (barrel slides back, hull rocks back and squashes), smoke rolls out
and the hull rocks forward. The shell spawns at the per-frame `muzzle` anchor; the riders' guns are
independent attacks, so `rider0Muzzle` and `rider1Muzzle` are exported per frame for every clip
(`meta.ageborn.riders`). The die clip ("crew bails out") pops both gunners up out of their hatches
with their arms up while the hull slumps and smokes; the game spawns the 2 Carbineers.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "land_dreadnought"
NAME = "Land Dreadnought"
HEIGHT_LU = 180
YAW_DEG = -10.0
CANVAS = (640, 470)
FEET = (262, 440)
ANCHORS = {"head": (0, 150), "hitCenter": (0, 60)}
EXTRA_META = {"riders": [
    {"id": "rider0", "anchor": "rider0Muzzle", "projectile": "proj.bullet"},
    {"id": "rider1", "anchor": "rider1Muzzle", "projectile": "proj.bullet"},
]}

WALK_MS = 100
STEP_LU = 35.0 * WALK_MS / 1000.0     # 3.5 lu per 100 ms step at sim speed 35
PITCH = STEP_LU * I.TREAD_PHASES      # 14 lu grousers: one phase copy per step
# the rhomboid, clockwise on screen from the top rear (x forward, z up)
RHOMB = [(-68.0, 92.0), (58.0, 92.0), (104.0, 48.0), (72.0, 2.0), (-58.0, 2.0), (-92.0, 42.0)]
RADII = [14.0, 14.0, 12.0, 16.0, 16.0, 12.0]
TY = -30.0            # near belt plane
TW = 14.0
CASEMATE = (22.0, 0.0, 96.0)
BARREL_Z = 112.0
MUZZLE = (112.0, -2.0, BARREL_Z)
SPONSON = (6.0, TY - 14.0, 44.0)
R0_MUZZLE = (40.0, TY - 18.0, 66.0)
BARBETTE = (-46.0, 10.0, 100.0)
R1_MUZZLE = (-14.0, 4.0, 127.0)
_T = {}


def _frame_plate(rig, joint, y, inset, color, team_band):
    """The side frame: the rhomboid inset from the belt, a thick plate."""
    pts = []
    import ageborn_art.rigs_industrial as RI
    path, total = RI._rounded_path(RHOMB, [r + 2 for r in RADII], n_arc=5)
    cx = sum(p[0] for p in RHOMB) / len(RHOMB)
    cz = sum(p[1] for p in RHOMB) / len(RHOMB)
    for x, z, _ in path:
        dx, dz = x - cx, z - cz
        L = math.hypot(dx, dz)
        pts.append((x - dx / L * inset, z - dz / L * inset))
    g = Geo().slab(pts, y, 12.0)
    rig.part(joint, g, color, finish="metal")
    return pts


def gunner(rig, joint, at, name, face_x=1.0):
    """A small crewman from the chest up: team tunic, leather tanker cap, goggles, eyes."""
    x, y, z = at
    rig.joint(name, joint, at)
    g = Geo().blob((x, y, z + 4.0), (7.4, 7.8, 5.6), p=2.4)
    rig.part(name, g, team=True)
    hz = z + 15.0
    g = Geo().blob((x + 1.0, y, hz), (7.6, 7.4, 7.4), p=2.3)
    g.blob((x + 8.4, y - 0.5, hz - 1.4), (2.4, 2.2, 2.2), p=2.0)
    rig.part(name, g, I.SKIN)
    g = Geo().blob((x - 0.2, y, hz + 3.4), (8.4, 8.2, 6.0), p=2.3)
    g.clip((x, y, hz + 0.8), (0, 0, -1))
    g.blob((x - 1.0, y - 6.8, hz - 1.0), (3.0, 1.6, 4.0), p=2.4)
    rig.part(name, g, I.LEATHER)
    g = Geo()
    for yy in (-3.2, 3.0):
        g.lathe([(0, 0), (2.2, 0.1), (2.4, 1.6), (0, 1.8)], (x + 5.4, y + yy, hz + 4.6), (x + 7.2, y + yy, hz + 5.0),
                segs=12)
    rig.part(name, g, I.BRASS, finish="metal", outline=0.5)
    rig.joint(f"{name}_eyes", name, (x + 6.6, y, hz + 0.6))
    g = Geo()
    for yy in (-3.2, 3.0):
        g.blob((x + 6.4, y + yy, hz + 0.6), (2.1, 2.1, 2.6))
    rig.part(f"{name}_eyes", g, I.EYE, highlight=False, outline=0.5)
    g = Geo()
    for yy in (-3.2, 3.0):
        g.blob((x + 8.2, y + yy - 0.3, hz + 0.4), (0.8, 1.3, 1.4))
    rig.part(f"{name}_eyes", g, I.PUPIL, outline=0)
    rig.joint(f"{name}_ko", name, (x + 6.6, y, hz + 0.6), hidden=True)
    g = Geo()
    for yy in (-3.2, 3.0):
        g.capsule((x + 8.0, y + yy - 1.7, hz + 2.2), (x + 8.0, y + yy + 1.7, hz - 1.2), 0.6)
        g.capsule((x + 8.0, y + yy - 1.7, hz - 1.2), (x + 8.0, y + yy + 1.7, hz + 2.2), 0.6)
    rig.part(f"{name}_ko", g, I.PUPIL, outline=0)
    g = Geo().blob((x + 8.0, y - 0.6, hz - 4.8), (1.2, 2.8, 1.0), p=2.4)
    rig.part(name, g, I.MOUTH, outline=0, highlight=False)
    # arms up (hidden; shown when he bails out)
    rig.joint(f"{name}_arms", name, (x, y, z + 8.0), hidden=True)
    g = Geo()
    for yy in (-7.0, 7.0):
        g.capsule((x, y + yy, z + 8.0), (x + 3.0, y + yy * 1.3, z + 24.0), 2.6, 2.2)
        g.sphere((x + 3.4, y + yy * 1.35, z + 26.0), 3.0, cuts=3)
    rig.part(f"{name}_arms", g, team=True, outline=0.6)


def rotary_gun(rig, joint, p0, p1, k=1.0):
    """A crank-fed rotary machine gun from breech p0 to muzzle p1 (in the side plane)."""
    ang = math.atan2(p1[2] - p0[2], p1[0] - p0[0])
    ux, uz = math.cos(ang), math.sin(ang)
    g = Geo().blob((p0[0] + ux * 3.0, p0[1], p0[2] + uz * 3.0), (5.6 * k, 3.4 * k, 3.6 * k), p=3.0,
                   rot=(0, -math.degrees(ang), 0))
    rig.part(joint, g, I.BRASS, finish="metal", outline=0.7)
    g = Geo()
    for dy, dz in ((-1.4, 0.0), (1.4, 0.0), (0.0, 1.4), (0.0, -1.4)):
        g.capsule((p0[0] + ux * 5.0 - uz * dz, p0[1] + dy, p0[2] + uz * 5.0 + ux * dz),
                  (p1[0] - uz * dz, p1[1] + dy, p1[2] + ux * dz), 0.8 * k)
    rig.part(joint, g, I.IRON_DK, finish="metal", outline=0.6)
    g = Geo().lathe([(3.0 * k, -0.8), (3.2 * k, 0), (3.0 * k, 0.8)], (p1[0] - ux * 2.0, p1[1], p1[2] - uz * 2.0),
                    (p1[0] - ux * 1.0, p1[1], p1[2] - uz * 1.0), segs=14)
    rig.part(joint, g, I.COPPER, finish="metal", outline=0.4)
    g = Geo().capsule((p0[0], p0[1] - 3.8, p0[2]), (p0[0] - 2.0, p0[1] - 5.4, p0[2] - 4.0), 0.7)   # crank
    rig.part(joint, g, I.WOOD_LT, outline=0.4)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 30.0))

    # far side: belt and frame (mostly hidden behind the hull)
    rig.joint("track_f", "hull", (0, 30.0, 0))
    _frame_plate(rig, "track_f", 30.0, 3.0, I.IRON_DK, False)
    _T["f"] = I.poly_tread(rig, "tf", "track_f", RHOMB, RADII, 30.0, TW, PITCH)

    # the hull box between the frames, the roof and the trailing steering wheels
    g = Geo().blob((4.0, 0, 50.0), (84.0, 26.0, 36.0), p=4.0, taper=(0.9, 1.0))
    rig.part("hull", g, I.IRON)
    g = Geo().blob((-4.0, 0, 88.0), (64.0, 26.0, 4.0), p=4.0)
    rig.part("hull", g, I.IRON_LT, finish="metal")
    rig.joint("tail", "hull", (-92.0, 0, 30.0))
    g = Geo()
    g.capsule((-80.0, -6.0, 36.0), (-118.0, -6.0, 18.0), 2.2)
    g.capsule((-80.0, 10.0, 36.0), (-118.0, 10.0, 18.0), 2.2)
    rig.part("tail", g, I.IRON_DK, finish="metal", outline=0.8)
    names = I.wheel_row(rig, "tw", "tail", (-120.0,), 14.0, -10.0, 13.0, color=I.WOOD, hub=I.BRASS, bolts=8)
    g = Geo()
    for k in range(10):
        a = 2 * math.pi * k / 10
        g.capsule((-120.0, -11.6, 14.0), (-120.0 + 11.0 * math.cos(a), -11.6, 14.0 + 11.0 * math.sin(a)), 0.9)
    rig.part("tw0", g, I.WOOD_LT, outline=0.4)
    g = Geo().lathe([(12.0, -1.2), (13.4, -1.2), (13.4, 1.2), (12.0, 1.2)], (-120.0, -10.0, 14.0), (-120.0, -11.0, 14.0),
                    segs=24)
    rig.part("tw0", g, I.IRON_DK, finish="metal", outline=0.5)
    _T["wheels"] = names

    # the exhaust stack and the pennant mast
    g = Geo().lathe([(4.0, 0), (4.2, 2.0), (3.6, 26.0), (5.0, 28.0), (5.2, 31.0), (3.4, 31.4)],
                    (-26.0, 12.0, 90.0), (-28.0, 12.0, 121.0), segs=18)
    rig.part("hull", g, I.COAL_LT, finish="metal")
    I.steam_puff(rig, "hull", (-29.0, 8.0, 127.0), size=1.8, name="exhaust", color=I.SMOKE_DK)
    I.pennant(rig, "hull", (-70.0, 14.0, 90.0), 88.0, length=26.0, w=13.0, max_deg=16)

    # rear barbette with the second gunner (over the far sponson)
    bx, by, bz = BARBETTE
    g = Geo().lathe([(13.0, 0), (13.6, 2.0), (13.0, 12.0), (11.4, 13.0), (0, 13.0)], (bx, by, bz - 10.0),
                    (bx, by, bz + 3.0), segs=26)
    rig.part("hull", g, I.IRON_LT, finish="metal")
    g = Geo()
    I.rivets(g, [(bx + 13.2 * math.cos(math.radians(a)), by + 13.2 * math.sin(math.radians(a)), bz - 3.0)
                 for a in range(-170, -10, 22)], r=1.0)
    rig.part("hull", g, I.BRASS_LT, finish="metal", outline=0)
    gunner(rig, "hull", (bx + 1.0, by, bz), "g1")
    rig.joint("mg1", "hull", (bx + 10.0, by - 4.0, bz + 12.0))
    rotary_gun(rig, "mg1", (bx + 8.0, by - 4.0, bz + 12.0), R1_MUZZLE, k=1.0)
    g = Geo().blob((bx + 7.0, by - 6.0, bz + 11.0), (3.0, 2.4, 2.8), p=2.4)
    rig.part("mg1", g, I.SKIN, outline=0.5)
    rig.track("rider1Muzzle", "mg1", R1_MUZZLE)
    I.muzzle_flash(rig, "mg1", R1_MUZZLE, size=0.9, name="flash1")

    # the forward casemate and the main gun
    cx, cy, cz = CASEMATE
    g = Geo().blob((cx, cy, cz + 6.0), (26.0, 24.0, 12.0), p=3.2, taper=(1.0, 0.82))
    g.clip((0, 0, cz - 4.0), (0, 0, -1))
    rig.part("hull", g, I.IRON_LT, finish="metal")
    g = Geo().blob((cx + 1.0, -24.6, cz + 6.0), (20.0, 1.4, 6.0), p=3.2)
    rig.part("hull", g, team=True, outline=0.6)
    g = Geo()
    I.rivets(g, [(cx + dx, -25.8, cz + dz) for dx in (-16, -8, 0, 8, 16) for dz in (1.0, 11.0)], r=0.9)
    rig.part("hull", g, I.BRASS_LT, finish="metal", outline=0)
    g = Geo().blob((cx + 22.0, -2.0, BARREL_Z), (7.0, 10.0, 8.0), p=2.6)   # mantlet
    rig.part("hull", g, I.IRON_DK, finish="metal")
    rig.joint("barrel", "hull", (cx + 24.0, -2.0, BARREL_Z))
    g = Geo().capsule((cx + 24.0, -2.0, BARREL_Z), (MUZZLE[0] - 6.0, -2.0, BARREL_Z), 3.6, 3.1)
    rig.part("barrel", g, I.IRON_DK, finish="metal")
    g = Geo()
    for x in (cx + 36.0, cx + 56.0):
        g.lathe([(3.8, -1.4), (4.1, 0), (3.8, 1.4)], (x, -2.0, BARREL_Z), (x + 1, -2.0, BARREL_Z), segs=18)
    rig.part("barrel", g, I.COPPER, finish="metal", outline=0.5)
    g = Geo().lathe([(3.4, 0), (5.2, 1.4), (5.2, 5.6), (3.6, 6.4), (2.2, 6.6)], (MUZZLE[0] - 7.0, -2.0, BARREL_Z),
                    (MUZZLE[0], -2.0, BARREL_Z), segs=20)
    rig.part("barrel", g, I.IRON, finish="metal")
    rig.track("muzzle", "barrel", MUZZLE)
    I.muzzle_flash(rig, "barrel", (MUZZLE[0] + 1, -2.0, BARREL_Z), size=3.4)
    g = Geo().blob((cx - 4.0, -6.0, cz + 18.6), (8.0, 8.0, 3.0), p=2.4)   # hatch
    rig.part("hull", g, I.IRON_DK, finish="metal", outline=0.6)

    # near side: the side frame (team band, roundel, rivets), the belt, the sponson
    rig.joint("track", "hull", (0, TY, 0))
    pts = _frame_plate(rig, "track", TY + 4.0, 5.0, I.IRON, True)
    g = Geo().slab([(-84.0, 63.0), (99.0, 63.0), (79.0, 31.0), (-80.0, 31.0)], TY - 2.6, 1.6)
    rig.part("track", g, team=True)
    g = Geo()
    cxr, czr = -40.0, 47.0
    g.lathe([(0, -1.0), (15.0, -1.0), (15.0, 1.0), (0, 1.0)], (cxr, TY - 3.6, czr), (cxr, TY - 4.6, czr), segs=32)
    rig.part("track", g, I.CREAM, outline=0.6)
    g = Geo().lathe([(0, -1.0), (11.0, -1.0), (11.0, 1.0), (0, 1.0)], (cxr, TY - 4.8, czr), (cxr, TY - 5.8, czr), segs=32)
    rig.part("track", g, team=True, outline=0.4)
    g = Geo().lathe([(0, -1.0), (4.6, -1.0), (4.6, 1.0), (0, 1.0)], (cxr, TY - 6.0, czr), (cxr, TY - 7.0, czr), segs=24)
    rig.part("track", g, I.CREAM, outline=0.3)
    g = Geo()
    for x in range(-64, 64, 10):
        g.sphere((x, TY - 3.6, 72.0), 1.1, cuts=2)
        g.sphere((x + 5, TY - 3.6, 22.0), 1.1, cuts=2)
    rig.part("track", g, I.IRON_LT, finish="metal", outline=0)
    g = Geo().blob((80.0, TY - 3.0, 70.0), (3.6, 2.0, 2.4), p=2.6)   # vision slit
    rig.part("track", g, I.COAL, outline=0, highlight=False)
    _T["n"] = I.poly_tread(rig, "tn", "track", RHOMB, RADII, TY, TW, PITCH, thick=4.2)
    names = I.wheel_row(rig, "rw", "track", (-50.0, -30.0, -10.0, 10.0, 30.0, 50.0), 11.0, TY + 1.0, 6.4)
    _T["road"] = names

    # the near sponson: a riveted half drum sticking out of the frame, open on top
    sx, sy, sz = SPONSON
    g = Geo().blob((sx, sy + 4.0, sz), (24.0, 10.0, 16.0), p=2.8, taper=(0.8, 1.0))
    g.clip((0, sy + 8.0, 0), (0, 1, 0))
    rig.part("track", g, I.IRON_LT, finish="metal")
    g = Geo().blob((sx, sy + 4.0, sz + 2.0), (24.6, 10.6, 5.0), p=2.8)
    g.clip((0, sy + 8.0, 0), (0, 1, 0))
    rig.part("track", g, team=True, outline=0.6)
    g = Geo()
    I.rivets(g, [(sx + dx, sy - 5.6, sz + dz) for dx in (-16, -8, 0, 8, 16) for dz in (-10.0, 12.0)], r=1.0)
    rig.part("track", g, I.BRASS_LT, finish="metal", outline=0)
    gunner(rig, "track", (sx + 2.0, sy + 3.0, sz + 11.0), "g0")
    rig.joint("mg0", "track", (sx + 16.0, sy - 2.0, sz + 16.0))
    rotary_gun(rig, "mg0", (sx + 14.0, R0_MUZZLE[1], sz + 16.0), R0_MUZZLE, k=1.0)
    g = Geo().blob((sx + 12.6, R0_MUZZLE[1] - 2.0, sz + 15.0), (3.0, 2.4, 2.8), p=2.4)
    rig.part("mg0", g, I.SKIN, outline=0.5)
    rig.track("rider0Muzzle", "mg0", R0_MUZZLE)
    I.muzzle_flash(rig, "mg0", R0_MUZZLE, size=0.9, name="flash0")

    rig.joint("smoke", "root", (MUZZLE[0] + 16, -20, BARREL_Z + 30), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 11.0), (12, 5, 9.0), (-8, 10, 8.0), (6, 15, 7.4), (20, -2, 6.6),
                      (-14, -2, 6.4), (-2, -9, 6.0)):
        g.sphere((MUZZLE[0] + 16 + dx, -20, BARREL_Z + 30 + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ---------------------------------------------------------------------------------
def _tracks(step, moving=True):
    d = STEP_LU if moving else 0.0
    return merge(I.poly_tread_pose("tn", step, d, PITCH), I.poly_tread_pose("tf", step, d, PITCH),
                 I.wheel_spin(_T["road"], d * step), I.wheel_spin(_T["wheels"], d * step))


def _riders(t, fire0=False, fire1=False):
    """Gunner sway and gun jitter; `t` is a phase in radians."""
    return {
        "g0": {"r": 2.0 * math.sin(t), "z": 0.5 * math.cos(t)},
        "g1": {"r": 2.0 * math.sin(t + 1.3), "z": 0.5 * math.cos(t + 1.3)},
        "mg0": {"r": 3.0 * math.sin(t + 0.6)}, "mg1": {"r": 3.0 * math.sin(t + 2.0)},
        "flash0": {"show": fire0}, "flash1": {"show": fire1},
    }


def _idle(f):
    c, lag = I.idle_wave(f)
    return merge(_tracks(0, False), _riders(f * math.pi / 2), {
        "hull": dict(squash(0.01 * c), z=0.6 * c),
        "exhaust": {"show": f in (1, 3), "s": pick(f, [1, 0.8, 1, 1.15]), "z": pick(f, [0, 0, 0, 4])},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_tracks(f), _riders(p), {
        "odo": {"x": 2.0 * STEP_LU * math.cos(p)},
        "hull": dict(squash(0.012 * math.cos(2 * p)), z=0.9 * math.cos(2 * p) + 0.2, r=0.7 * math.sin(p)),
        "tail": {"r": -1.5 * math.sin(p)},
        "exhaust": {"show": f % 4 == 1, "x": -4.0},
    })


ATTACK_MS = [100, 100, 150, 83, 150, 100, 100, 150]
ATTACK_IMPACT = 3


def _attack(f):
    pose = merge(_tracks(0, False), _riders(f * 0.8), {
        "body": dict(squash(pick(f, [0, -0.02, -0.04, 0.05, -0.07, -0.03, 0.02, 0])),
                     x=pick(f, [0, 0.5, 1.0, -3.0, -6.0, -4.0, -1.0, 0])),
        "hull": {"r": pick(f, [0, -0.6, -1.0, 2.4, 3.4, 1.8, -1.0, 0])},
        "barrel": {"x": pick(f, [0, 0, 0, -10.0, -8.0, -4.0, 0, 0]),
                   "r": pick(f, [1.0, 2.0, 2.0, 3.0, 3.5, 2.0, 1.0, 0])},
        "g0": {"r": pick(f, [0, 0, 0, 10, 8, 4, 0, 0])}, "g1": {"r": pick(f, [0, 0, 0, 12, 9, 4, 0, 0])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.75, 1.05, 1.3, 1]),
                  "x": pick(f, [0, 0, 0, 0, -10, 0, 6, 0]), "z": pick(f, [0, 0, 0, 0, -12, 0, 7, 0])},
        "exhaust": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 1.2, 1.4, 1, 1])},
    })
    rec = pick(f, [0, 0, 0, 3.0, 6.0, 6.0, 5.0, 4.0])
    for name, r in _T["road"] + _T["wheels"]:
        pose.setdefault(name, {})["r"] = pose.get(name, {}).get("r", 0.0) + math.degrees(rec / r)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(_tracks(0, False), _riders(0.0), {
        "body": dict(squash(-0.05 * a), x=-4.0 * a), "hull": {"r": 3.0 * a},
        "g0": {"r": 14 * a, "z": -1.5 * a}, "g1": {"r": 14 * a, "z": -1.5 * a},
        "mg0": {"r": 10 * a}, "mg1": {"r": 10 * a},
    })


def _die(f):
    # the hull slumps and smokes; both gunners pop up out of their hatches with their arms up
    body = [{"x": -4.0, "z": 3.0, "r": 5.0, "sz": 1.05, "sx": 0.97, "sy": 0.97},
            {"x": -6.0, "z": 0.0, "r": 2.5, "sz": 0.8, "sx": 1.06, "sy": 1.06},
            {"x": -6.0, "z": 0.0, "r": 1.5, "s": 0.88, "sz": 0.62, "sx": 1.1, "sy": 1.1}][f]
    return merge(_tracks(0, False), {"body": body}, {
        "barrel": {"r": pick(f, [-6, -14, -18])},
        "g0": {"z": pick(f, [10, 18, 16]), "x": pick(f, [-2, -6, -8]), "r": pick(f, [10, -8, -12])},
        "g1": {"z": pick(f, [12, 20, 18]), "x": pick(f, [-4, -8, -10]), "r": pick(f, [14, -6, -10])},
        "g0_arms": {"show": True}, "g1_arms": {"show": True},
        "g0_eyes": {"hide": True}, "g0_ko": {"show": True},
        "g1_eyes": {"hide": True}, "g1_ko": {"show": True},
        "mg0": {"r": pick(f, [-10, -20, -26])}, "mg1": {"r": pick(f, [-10, -20, -26])},
        "exhaust": {"show": True, "s": pick(f, [1.3, 1.7, 2.0])},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
