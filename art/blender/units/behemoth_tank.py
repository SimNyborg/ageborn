"""Behemoth Tank: Modern Age legendary siege heavy (DESIGN A5.5). Main gun proj.shell (range 240) plus
a machine gun proj.bullet (range 150, priority air). ~172 lu with the pennant.

Look (A11 vehicle rig, Modern palette): a huge, heavy tank, a head taller than every other Modern
unit. A long olive hull with dark olive camo patches on two big rubber tracks (7 road wheels,
sprocket and idler, scrolling steel grousers, mud on the belt) behind massive team-painted side
skirts with rivets, cream chevrons, a signal stripe and hazard stripes at the rear; sandbags piled
on the glacis with a spare track run, a big rounded turret with camo, team cheeks and a heavy
mantlet, and a long main gun with a bore evacuator, a signal band and a big muzzle brake. On the
turret roof a cupola with a goggled commander (the face kit, a headset, a team jacket) working a
machine gun that points up and forward (the anti-air gun). Jerrycans and tow cables on the rear
deck, twin exhaust stacks, a headlight, and a tall antenna with a team pennant. Legendary white aura
is added in game.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    the engine rumbles, the turret scans slowly, the commander looks round and blinks, the
          exhaust stacks puff
  walk    roll: both tracks scroll with the ground, the hull heaves slowly, the commander sways a
          step late, the pennant whips
  attack  MAIN GUN BLAST AND HULL REAR: the turret settles and the commander ducks behind the
          cupola (the held extreme), BOOM (one huge flash, impact lines): the barrel slams back and
          the whole hull rears up at the front on its rear wheels, smoke rolls out, it slams back
          down with a squash and dust, rocks forward and settles as the commander pops back up.
          The main shell leaves the per-frame `muzzle` anchor on the fire frame; the machine gun is
          a second, independent attack, so its muzzle is exported per frame for every clip as
          `mgMuzzle` (the game fires the bullets and their flashes; no fake MG flash is baked in).
  hit     vehicle: a suspension bounce, the commander ducks with his eyes squeezed, the pennant whips
  die     D7 wreck and bail (heavy): a blast lifts the turret askew, the hull drops on a snapped
          track, black smoke pours out; the commander leaps out of the cupola and runs
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "behemoth_tank"
NAME = "Behemoth Tank"
HEIGHT_LU = 172
YAW_DEG = -10.0
CANVAS = (660, 480)
FEET = (282, 446)
ANCHORS = {"head": (0, 147), "hitCenter": (0, 58)}
EXTRA_META = {"secondaryAttack": {"id": "mg", "anchor": "mgMuzzle", "projectile": "proj.bullet"}}
NO_RETIME = True

SCALE = 1.15               # the whole tank: a Legendary towers over the Heavies
TR_R = 17.0
TX0, TX1 = -62.0, 58.0
TY = -24.0
TW = 13.0
WALK_MS = 100
STEP_LU = 35.0 * WALK_MS / 1000.0     # sim speed 35 lu/s -> 3.5 lu per 100 ms step
PITCH = STEP_LU * R.TREAD_PHASES      # 14 lu grousers: one phase copy per step
WHEELS = (-62.0, -42.0, -22.0, -2.0, 18.0, 38.0, 58.0)
HULL_Z = 52.0
TURRET = (-14.0, 0.0, 70.0)
BARREL_Z = 88.0
MUZZLE = (128.0, -2.0, BARREL_Z)
CUPOLA = (-26.0, 0.0, 103.0)
MG_MUZZLE = (-2.0, -6.0, 124.0)
CAMO = "#4E5238"
_W = {}


def _camo(face, g, spots):
    return KM.mud(face, g, spots)


def build(rig):
    rig.joint("body", "root", (0, 0, 0), scale=SCALE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 24.0))
    # far track (belt only)
    rig.joint("track_f", "body", (0, 20.0, 0))
    _W["f"], _ = R.tread(rig, "tf", "track_f", TX0, TX1, TR_R, 20.0, TW, PITCH, (TX0, TX1), 6.0)

    # hull: long box with a sloped glacis, rear overhang and fenders; camo patches
    hull = Geo().blob((-2.0, 0, 44.0), (70.0, 25.0, 15.0), p=3.6, taper=(1.0, 0.95))
    hull.blob((58.0, 0, 42.0), (18.0, 24.0, 12.0), p=2.8, rot=(0, 30, 0))
    hface = F.Face(rig, "hull", [hull])
    rig.part("hull", hull, R.OLIVE)
    g = _camo(hface, Geo(), [((20.0, 55.0), 9.0, 3.0), ((-30.0, 56.0), 11.0, 2.6), ((60.0, 48.0), 6.0, 4.0)])
    rig.part("hull", g, CAMO, highlight=False, outline=0)
    g = Geo().blob((-2.0, 0, 58.8), (68.0, 23.0, 2.0), p=3.6)   # deck plate
    rig.part("hull", g, R.OLIVE_LT)
    g = Geo()   # sandbags piled on the glacis and a spare track run
    for x, y, z in ((56.0, -14.0, 58.0), (62.0, -6.0, 55.0), (54.0, 2.0, 59.0), (60.0, 10.0, 56.0),
                    (57.0, -8.0, 63.0)):
        g.blob((x, y, z), (5.2, 3.8, 2.8), p=2.6, rot=(0, 30, 0))
    rig.part("hull", g, R.KHAKI, finish="hair", outline=0.6)
    g = Geo()
    for k in range(5):
        g.blob((66.0 + 2.4 * k, -20.0, 49.0 - 3.6 * k), (1.6, 3.0, 2.2), p=3.0, rot=(0, 55, 0))
    rig.part("hull", g, R.GUNMETAL, finish="metal", outline=0.5)
    g = Geo()   # rear deck kit: jerrycans (khaki) and a tow cable
    for x in (-66.0, -58.0):
        g.blob((x, -12.0, 66.0), (3.4, 5.0, 6.4), p=3.4)
    rig.part("hull", g, R.KHAKI, outline=0.8)
    g = Geo().capsule((-50.0, -20.0, 61.5), (-20.0, -20.0, 61.5), 1.4)
    rig.part("hull", g, R.GUNMETAL, finish="metal", outline=0.6)
    g = Geo()   # twin exhaust stacks
    for y in (-10.0, 8.0):
        g.capsule((-60.0, y, 58.0), (-64.0, y, 72.0), 2.7, 2.3)
    rig.part("hull", g, R.GUNMETAL, finish="metal", outline=0.8)
    g = Geo().blob((68.0, -17.0, 55.0), (3.6, 3.4, 3.2), p=2.4)   # headlight
    rig.part("hull", g, "#FFF3C8", finish="gloss", outline=0.8, outline_hex=R.GUNMETAL)
    # team side skirts with rivets, chevrons, a signal stripe and hazard stripes at the rear
    skirt = Geo().blob((-2.0, TY - 5.0, 40.0), (70.0, 2.4, 11.0), p=4.0)
    sface = F.Face(rig, "hull", [skirt])
    rig.part("hull", skirt, team=True)
    for cxz in ((-6.0, 41.0), (30.0, 41.0)):
        g = KM.chevron(sface, Geo(), cxz, s=1.3, n=2, w=1.8, gap=2.8)
        rig.part("hull", g, KM.CREAM, highlight=False, outline=0)
    g = KM.stripes(sface, Geo(), (-60.0, 41.0), 14.0, 15.0, n=4, slant=0.6)
    rig.part("hull", g, KM.STRIPE_DK, highlight=False, outline=0)
    g = Geo()
    for x in range(-66, 68, 10):
        g.sphere((x, TY - 7.8, 47.5), 1.2, cuts=2)
        g.sphere((x + 5, TY - 7.8, 32.0), 1.2, cuts=2)
    rig.part("hull", g, R.OLIVE_LT, finish="metal", outline=0)
    g = Geo().blob((-2.0, TY - 7.2, 36.0), (66.0, 0.8, 1.4), p=4.0)
    rig.part("hull", g, R.SIGNAL, outline=0)

    # near track
    rig.joint("track", "body", (0, TY, 0))
    names, _ = R.tread(rig, "tn", "track", TX0, TX1, TR_R, TY, TW, PITCH, WHEELS, 7.4, thick=3.4)
    _W["n"] = names
    g = Geo()
    for x, r in ((-40.0, 3.4), (-6.0, 2.8), (26.0, 3.2), (50.0, 2.4)):
        g.blob((x, TY - 4.0, 4.0), (r * 1.6, 0.8, r), p=2.2)
    rig.part("track", g, KM.MUD, outline=0)
    rig.joint("snap", "track", (TX0 - 8.0, TY, 2.0), hidden=True)
    g = Geo()
    for k in range(5):
        g.capsule((TX0 - 8.0 - 5.0 * k, TY - 0.5, 2.0 + 0.5 * k), (TX0 - 13.0 - 5.0 * k, TY - 0.5, 2.0 + 0.5 * k), 2.6)
    rig.part("snap", g, R.RUBBER, finish="gloss", outline=0.5)

    # turret
    rig.joint("turret", "hull", TURRET)
    tx, ty, tz = TURRET
    tur = Geo().blob((tx, 0, tz + 10.0), (38.0, 25.0, 19.0), p=2.6, taper=(1.0, 0.8))
    tur.clip((tx, 0, tz - 1.0), (0, 0, -1))
    tur.blob((tx - 30.0, 0, tz + 11.0), (10.0, 18.0, 8.0), p=3.0)   # bustle
    tface = F.Face(rig, "turret", [tur])
    rig.part("turret", tur, R.OLIVE, finish="gloss")
    g = _camo(tface, Geo(), [((tx - 22.0, tz + 20.0), 8.0, 3.4), ((tx + 18.0, tz + 22.0), 7.0, 2.8)])
    rig.part("turret", g, CAMO, highlight=False, outline=0)
    cheek = Geo().blob((tx + 6.0, -20.5, tz + 10.0), (22.0, 3.0, 9.0), p=2.8)
    cface = F.Face(rig, "turret", [cheek])
    rig.part("turret", cheek, team=True)
    g = KM.chevron(cface, Geo(), (tx + 6.0, tz + 10.5), s=1.1, n=2, w=1.8, gap=2.8)
    rig.part("turret", g, KM.CREAM, highlight=False, outline=0)
    g = Geo()   # stowage box on the bustle
    g.blob((tx - 36.0, -12.0, tz + 12.0), (6.0, 6.0, 6.0), p=3.6)
    rig.part("turret", g, R.KHAKI, outline=0.8)
    g = Geo().blob((tx + 33.0, -2.0, BARREL_Z), (8.0, 11.0, 10.0), p=2.6)   # mantlet
    rig.part("turret", g, R.OLIVE_LT)
    g = Geo()
    for dz in (-5.0, 0.0, 5.0):
        g.sphere((tx + 38.6, -9.0, BARREL_Z + dz), 1.1, cuts=2)
    rig.part("turret", g, R.GUNMETAL, finish="metal", outline=0)
    rig.joint("barrel", "turret", (tx + 34.0, -2.0, BARREL_Z))
    g = Geo().capsule((tx + 34.0, -2.0, BARREL_Z), (MUZZLE[0] - 8.0, -2.0, BARREL_Z), 3.9, 3.4)
    rig.part("barrel", g, R.GUNMETAL, finish="metal")
    g = Geo().lathe([(3.4, 0), (5.4, 2.0), (5.6, 9.0), (3.4, 11.0)], (70.0, -2.0, BARREL_Z),
                    (81.0, -2.0, BARREL_Z), segs=20)   # bore evacuator
    g.lathe([(4.6, 0), (6.2, 1.2), (6.2, 8.0), (4.6, 9.4), (2.4, 9.6)], (MUZZLE[0] - 10.0, -2.0, BARREL_Z),
            (MUZZLE[0], -2.0, BARREL_Z), segs=20)   # muzzle brake
    rig.part("barrel", g, R.GUNMETAL, finish="metal")
    g = Geo().lathe([(3.8, -1.1), (4.0, 0), (3.8, 1.1)], (58.0, -2.0, BARREL_Z), (59.0, -2.0, BARREL_Z), segs=18)
    rig.part("barrel", g, R.SIGNAL, outline=0.5)
    g = Geo().lathe([(0, -0.2), (2.4, -0.2), (2.4, 0.4), (0, 0.4)], (MUZZLE[0] + 0.1, -2.0, BARREL_Z),
                    (MUZZLE[0] + 1.0, -2.0, BARREL_Z), segs=14)
    rig.part("barrel", g, "#1E1C1C", outline=0)
    rig.track("muzzle", "barrel", MUZZLE)
    R.muzzle_flash(rig, "barrel", (MUZZLE[0] + 1, -2.0, BARREL_Z), size=3.8)

    # cupola, commander (face kit, goggles, headset) and the anti-air machine gun
    cx, cy, cz = CUPOLA
    g = Geo().lathe([(9.0, 0), (9.4, 3.0), (8.6, 5.4), (0, 5.6)], (cx, 0, cz - 3.0), (cx, 0, cz + 3.0), segs=20)
    rig.part("turret", g, R.OLIVE_LT)
    g = Geo()
    for a in range(200, 341, 35):
        t = math.radians(a)
        g.blob((cx + 9.2 * math.cos(t), 9.2 * math.sin(t), cz + 2.0), (1.4, 1.4, 1.2), p=2.4)
    rig.part("turret", g, R.GLASS, finish="gloss", outline=0.4)          # vision blocks
    rig.joint("cmdr", "turret", (cx, 0, cz + 2.0), scale=1.15)
    g = Geo().blob((cx, 0, cz + 5.0), (7.4, 8.0, 5.0), p=2.4)
    rig.part("cmdr", g, team=True)
    hz = cz + 15.0
    KM.crew_head(rig, "c_head", "cmdr", (cx + 1.0, 0.0, hz), k=1.05, brow=R.HAIR)
    g = Geo().blob((cx + 0.6, 0, hz + 3.6), (9.0, 8.6, 6.2), p=2.3)     # steel helmet
    g.clip((cx + 1.0, 0, hz + 1.2), (0, 0, -1))
    rig.part("c_head", g, R.OLIVE, finish="gloss")
    g = Geo().lathe([(9.1, 0), (9.2, 1.8), (8.8, 3.0)], (cx + 0.6, 0, hz + 1.4), (cx + 0.6, 0, hz + 4.4), segs=20)
    rig.part("c_head", g, team=True, outline=0.6)
    g = Geo().blob((cx - 1.0, -8.2, hz - 0.5), (3.2, 1.6, 3.6), p=2.4)   # headset cup + mic
    g.capsule((cx - 1.0, -8.8, hz - 2.0), (cx + 6.0, -8.0, hz - 6.0), 0.6)
    rig.part("c_head", g, R.GUNMETAL, finish="gloss", outline=0.5)
    g = Geo()
    for y in (-3.6, 3.2):
        g.lathe([(0, 0), (2.4, 0.2), (2.5, 1.6), (0, 1.8)], (cx + 6.8, y, hz + 5.6), (cx + 8.8, y, hz + 6.2), segs=12)
    rig.part("c_head", g, R.GUNMETAL, finish="metal", outline=0.5)
    g = Geo()
    for y in (-3.6, 3.2):
        g.blob((cx + 8.7, y, hz + 6.1), (0.6, 1.8, 1.8), p=2.2)
    rig.part("c_head", g, R.GLASS, finish="gloss", outline=0)
    # machine gun on a pintle in front of him, pointing up and forward (with an ammo box)
    rig.joint("mg", "turret", (cx + 8.0, -6.0, cz + 8.0))
    mx0, mz0 = cx + 8.0, cz + 8.0
    g = Geo().capsule((cx + 6.0, -6.0, cz), (mx0, -6.0, mz0), 1.3)
    rig.part("mg", g, R.GUNMETAL, finish="metal", outline=0.6)
    ang = math.atan2(MG_MUZZLE[2] - mz0, MG_MUZZLE[0] - mx0)
    ln = math.hypot(MG_MUZZLE[2] - mz0, MG_MUZZLE[0] - mx0)
    ux, uz = math.cos(ang), math.sin(ang)
    g = Geo().blob((mx0 + ux * 4.0, -6.0, mz0 + uz * 4.0), (6.4, 2.6, 3.2), p=3.0, rot=(0, -math.degrees(ang), 0))
    g.capsule((mx0, -6.0, mz0), (MG_MUZZLE[0], -6.0, MG_MUZZLE[2]), 1.4)
    g.blob((mx0 + ux * (ln - 2.0), -6.0, mz0 + uz * (ln - 2.0)), (2.4, 2.0, 2.0), p=2.4,
           rot=(0, -math.degrees(ang), 0))
    rig.part("mg", g, R.GUNMETAL, finish="metal", outline=0.8)
    g = Geo().blob((mx0 + 1.0, -9.6, mz0 - 1.0), (2.6, 1.6, 2.2), p=3.2)
    rig.part("mg", g, R.OLIVE_LT, outline=0.5)
    g = Geo().blob((mx0 - 1.0, -7.5, mz0 + 1.0), (3.4, 2.8, 3.2), p=2.4)   # his gloved hand on the grip
    rig.part("mg", g, R.LEATHER, outline=0.6)
    rig.track("mgMuzzle", "mg", MG_MUZZLE)

    R.pennant(rig, "turret", (tx - 34.0, 12.0, tz + 20.0), 58.0, length=26.0, w=13.0, max_deg=18)

    R.smoke_puff(rig, "hull", (-66.0, -10.0, 78.0), size=1.15, name="exhaust", color=R.SMOKE_DK)
    rig.joint("smoke", "root", (MUZZLE[0] + 16, -20, BARREL_Z + 24), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 11.0), (12, 5, 9.0), (-8, 10, 8.0), (6, 15, 7.4), (20, -2, 6.6),
                      (-14, -2, 6.4), (-2, -9, 6.0)):
        g.sphere((MUZZLE[0] + 16 + dx, -20, BARREL_Z + 24 + dz), r, cuts=4)
    rig.part("smoke", g, R.SMOKE, finish="dust", outline=0.8)
    R.smoke_puff(rig, "hull", (-10.0, -6.0, 100.0), size=2.2, name="wreck", color="#6E6A66")
    KM.crew_runner(rig, "bail", "root", (0.0, -40.0, 0.0), k=1.3)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ------------------------------------------------------------------------------------------
def _tracks(step, moving=True):
    d = STEP_LU if moving else 0.0
    return merge(R.tread_pose("tn", _W["n"], step, d, PITCH),
                 R.tread_pose("tf", _W["f"], step, d, PITCH))


def _idle(f):
    t = 2 * math.pi * f / 6
    pose = merge(_tracks(0, False), {
        "hull": dict(squash(0.01 * math.cos(2 * t)), z=0.5 * math.cos(2 * t)),
        "turret": {"r": 0.4 * math.sin(t), "rz": 1.5 * math.sin(t - 0.6)},
        "cmdr": {"z": 0.5 * math.sin(t - 1.0), "r": 2.0 * math.sin(t - 1.0)},
        "c_head": {"rz": [0, 6, 10, 4, -8, -4][f]},
        "mg": {"r": 3.0 * math.sin(t - 1.4)},
        "exhaust": {"show": f in (1, 4), "s": [1, 0.85, 1, 1, 0.95, 1][f], "z": [0, 0, 0, 0, 2.5, 0][f]},
    })
    if f == 3:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_tracks(f), {
        "odo": {"x": 2.0 * STEP_LU * SCALE * math.cos(p)},   # ground speed of the scaled track
        "hull": dict(squash(0.014 * math.cos(2 * p)), z=1.0 * math.cos(2 * p) + 0.2, r=0.8 * math.sin(p)),
        "turret": {"r": -0.5 * math.sin(p - 0.8)},
        "cmdr": {"r": -2.5 * math.sin(p - 1.0), "z": 0.6 * math.cos(2 * p)},
        "c_head": {"r": 2.0 * math.sin(p - 1.4)},
        "mg": {"r": 2.0 * math.sin(p - 1.4)},
        "exhaust": {"show": f % 4 == 1, "x": -3.0},
    })


# 9 unique frames in 933 ms; fire on frame 3 at 350 ms (impactAt 0.3751, as shipped)
ATTACK_MS = [70, 80, 200, 80, 110, 90, 100, 100, 103]
ATTACK_IMPACT = 3
#       settle duck HOLD BOOM rear  slam rock settle settle
BX = [0.0, 0.5, 1.0, -3.0, -6.0, -7.0, -4.0, -1.5, 0.0]
BQ = [0.0, -0.02, -0.04, 0.03, 0.02, -0.08, 0.02, -0.01, 0.0]
REAR = [0.0, -0.6, -1.2, 3.0, 6.5, -1.0, 1.2, -0.3, 0.0]     # hull pitch about the rear wheels
TUR = [0.8, 1.4, 1.6, 3.0, 2.6, 0.6, 0.8, 0.2, 0.0]
BAR = [0.0, 0.0, 0.0, -12.0, -10.0, -4.0, -1.0, 0.0, 0.0]
CZ = [-1.0, -6.0, -9.0, -9.0, -9.0, -8.0, -3.0, 0.5, 0.0]


def _attack_pose(f):
    rear = REAR[f]
    # pitch about the rear road wheel (x = TX0, z = TR_R): nose up means the front lifts
    piv = M.about((TX0, 0, TR_R - 24.0), r=rear)
    pose = merge(_tracks(0, False), {
        "body": dict(squash(BQ[f]), x=BX[f]),
        "hull": {"r": rear, "x": piv["x"], "z": piv["z"]},
        "track": dict(M.about((TX0, 0, TR_R), r=rear * 0.5), r=rear * 0.5),
        "track_f": dict(M.about((TX0, 0, TR_R), r=rear * 0.5), r=rear * 0.5),
        "turret": {"r": TUR[f]},
        "barrel": {"x": BAR[f], "r": [1.5, 2.5, 2.5, 3.5, 4.0, 1.5, 0.5, 0, 0][f]},
        "cmdr": {"z": CZ[f], "r": [0, -3, -4, 10, 8, 3, -2, 1, 0][f]},
        "mg": {"r": [0, 0, 0, 8, 10, -3, 2, 0, 0][f]},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": [1, 1, 1, 1, 0.75, 1.05, 1.3, 1, 1][f],
                  "x": [0, 0, 0, 0, -10, 0, 6, 0, 0][f], "z": [0, 0, 0, 0, -8, 0, 7, 0, 0][f]},
        "exhaust": {"show": f in (4, 5), "s": [1, 1, 1, 1, 1.2, 1.4, 1, 1, 1][f]},
    })
    for name, wr in _W["n"] + _W["f"]:
        pose.setdefault(name, {})["r"] = pose.get(name, {}).get("r", 0.0) + \
            math.degrees([0, 0, 0, 3.0, 6.0, 7.0, 6.0, 5.0, 4.0][f] / wr)
    if f in (1, 2, 3, 4):
        pose = merge(pose, F.expr("squeeze", "grit"))
    elif f == 7:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.0}})
    return pose


def _attack_clip():
    ov = {
        3: [{"kind": "burst", "joint": "barrel", "point": (MUZZLE[0] + 6.0, -2.0, BARREL_Z), "r0_lu": 13.0,
             "r1_lu": 22.0, "n": 7, "a0": -70.0, "arc": 140.0}],
        5: [{"kind": "dust", "ground": (-40.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 71, "spread": 1.2,
             "dir": -1.0},
            {"kind": "dust", "ground": (40.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 72, "spread": 1.2,
             "dir": 1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(9)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_tracks(0, False), {
        "body": dict(squash([-0.06, -0.04, 0.02, -0.01, 0.0][k]), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
        "hull": {"r": 3.0 * a},
        "cmdr": {"z": -5.0 * max(a, 0), "r": 12 * a},
        "turret": {"r": 1.5 * a},
        "mg": {"r": 10 * a},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


# D7 heavy: 8 unique poses in the 12 heavy death steps (moves.DIE_SEQ_HEAVY)
D_BZ = [2.0, 5.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
D_HR = [3.0, 5.0, -4.0, -5.0, -5.0, -5.0, -5.0, -5.0]
D_Q = [0.04, 0.03, -0.08, 0.02, -0.02, 0.0, -0.02, -0.03]
D_TUR = [(0, 2, 3), (-4, 14, 14), (-8, 10, 18), (-8, 9, 18), (-8, 9, 18), (-8, 9, 18), (-8, 9, 18), (-8, 9, 18)]
B_PATH = [None, (-20, 136, 20), (-44, 146, 40), (-70, 110, 25), (-96, 40, 10), (-108, 0, 0), (-114, 1.5, 4),
          (-120, 0, 0)]
B_RUN = [0, 0.9, 1.0, 0.6, 0.3, -0.7, 0.8, -0.8]
B_ARM = [0, 10, -10, 30, 60, 120, 40, 130]


def _die(k):
    tx, tz, tr = D_TUR[k]
    pose = merge(_tracks(0, False), {
        "body": dict(squash(D_Q[k]), x=-4.0, z=D_BZ[k]),
        "hull": {"r": D_HR[k]},
        "turret": {"x": tx, "z": tz, "r": tr},
        "barrel": {"r": [-2, -10, -20, -22, -22, -22, -22, -22][k]},
        "mg": {"r": [5, 30, 50, 50, 50, 50, 50, 50][k]},
        "wreck": {"show": k >= 1, "s": [1, 0.8, 1.0, 1.15, 1.3, 1.4, 1.45, 1.5][k],
                  "z": [0, 0, 4, 8, 12, 15, 17, 19][k]},
        "snap": {"show": k >= 2},
        "exhaust": {"show": k == 0, "s": 1.4},
    })
    bp = B_PATH[k]
    if bp is None:
        pose["cmdr"] = {"z": 3.0}
        pose = merge(pose, F.expr("squeeze", "o"))
    else:
        x, z, r = bp
        pose["cmdr"] = {"hide": True}
        pose = merge(pose, {"bail": {"show": True, "x": x, "z": z, "r": r, "rz": 180.0 if k >= 4 else 0.0}},
                     KM.run_pose("bail", B_RUN[k], B_ARM[k]))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150] * 6, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    by = {c.name: c for c in cl}
    assert by["walk"].total_ms() == 800
    return M.check_contract(cl, heavy=True, attack_ms=933, attack_impact_at=0.3751)
