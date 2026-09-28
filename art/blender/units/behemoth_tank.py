"""Behemoth Tank: Modern Age legendary siege heavy (DESIGN A5.5). Main gun proj.shell
(range 240) plus a machine gun proj.bullet (range 150, priority air). ~150 lu.

Look (A11 vehicle rig, Modern palette): a huge, heavy tank, a head taller than every other
Modern unit. A long olive hull on two big rubber tracks (7 road wheels, sprocket and idler,
scrolling steel grousers) behind massive team-painted side skirts with rivets and a
signal red-violet stripe; a big rounded turret with team cheeks and a heavy mantlet, and a
long main gun with a bore evacuator and a big muzzle brake. On the turret roof a cupola
with a goggled commander in a headset working a machine gun that points up and forward
(the anti-air gun). Jerrycans and tow cables on the rear deck, twin exhaust stacks, a
headlight, and a tall antenna with a team pennant. Legendary white aura is added in game.

The walk scrolls both tracks with the ground and heaves the hull slowly; the attack
(main gun) settles the turret, braces, fires with a huge flash (barrel slides back, the hull
rocks back on its tracks and squashes), a smoke cloud rolls out, and the hull rocks forward
and settles. The main shell spawns at the per-frame `muzzle` anchor; the machine gun is a
second, independent attack, so its muzzle is exported per frame for every clip as
`mgMuzzle` (the game fires bullets from it while the tank walks or shoots).
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_modern as M
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "behemoth_tank"
NAME = "Behemoth Tank"
HEIGHT_LU = 150
YAW_DEG = -10.0
CANVAS = (560, 400)
FEET = (230, 372)
ANCHORS = {"head": (0, 128), "hitCenter": (0, 50)}
EXTRA_META = {"secondaryAttack": {"id": "mg", "anchor": "mgMuzzle", "projectile": "proj.bullet"}}

K = 1.0
TR_R = 17.0
TX0, TX1 = -62.0, 58.0
TY = -24.0
TW = 13.0
WALK_MS = 100
STEP_LU = 35.0 * WALK_MS / 1000.0     # sim speed 35 lu/s -> 3.5 lu per 100 ms step
PITCH = STEP_LU * M.TREAD_PHASES      # 14 lu grousers: one phase copy per step
WHEELS = (-62.0, -42.0, -22.0, -2.0, 18.0, 38.0, 58.0)
HULL_Z = 52.0
TURRET = (-14.0, 0.0, 70.0)
BARREL_Z = 88.0
MUZZLE = (128.0, -2.0, BARREL_Z)
CUPOLA = (-26.0, 0.0, 103.0)
MG_MUZZLE = (-2.0, -6.0, 124.0)
_W = {}


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 24.0))
    # far track (belt only)
    rig.joint("track_f", "body", (0, 20.0, 0))
    _W["f"], _ = M.tread(rig, "tf", "track_f", TX0, TX1, TR_R, 20.0, TW, PITCH, (TX0, TX1), 6.0)

    # hull: long box with a sloped glacis, rear overhang and fenders
    g = Geo().blob((-2.0, 0, 44.0), (70.0, 25.0, 15.0), p=3.6, taper=(1.0, 0.95))
    g.blob((58.0, 0, 42.0), (18.0, 24.0, 12.0), p=2.8, rot=(0, 30, 0))
    rig.part("hull", g, M.OLIVE)
    g = Geo().blob((-2.0, 0, 58.8), (68.0, 23.0, 2.0), p=3.6)   # deck plate
    rig.part("hull", g, M.OLIVE_LT)
    g = Geo()   # rear deck kit: jerrycans (khaki) and a tow cable
    for x in (-66.0, -58.0):
        g.blob((x, -12.0, 66.0), (3.4, 5.0, 6.4), p=3.4)
    rig.part("hull", g, M.KHAKI, outline=0.8)
    g = Geo().capsule((-50.0, -20.0, 61.5), (-20.0, -20.0, 61.5), 1.3)
    rig.part("hull", g, M.GUNMETAL, finish="metal", outline=0.6)
    g = Geo()   # twin exhaust stacks
    for y in (-10.0, 8.0):
        g.capsule((-60.0, y, 58.0), (-64.0, y, 72.0), 2.6, 2.2)
    rig.part("hull", g, M.GUNMETAL, finish="metal", outline=0.8)
    g = Geo().blob((68.0, -17.0, 55.0), (3.6, 3.4, 3.2), p=2.4)   # headlight
    rig.part("hull", g, "#FFF3C8", finish="gloss", outline=0.8, outline_hex=M.GUNMETAL)
    # team side skirts with rivets and a red-violet stripe
    g = Geo().blob((-2.0, TY - 5.0, 40.0), (70.0, 2.4, 11.0), p=4.0)
    rig.part("hull", g, team=True)
    g = Geo()
    for x in range(-66, 68, 10):
        g.sphere((x, TY - 7.8, 47.5), 1.2, cuts=2)
        g.sphere((x + 5, TY - 7.8, 32.0), 1.2, cuts=2)
    rig.part("hull", g, M.OLIVE_LT, finish="metal", outline=0)
    g = Geo().blob((-2.0, TY - 7.2, 36.0), (66.0, 0.8, 1.4), p=4.0)
    rig.part("hull", g, M.SIGNAL, outline=0)

    # near track
    rig.joint("track", "body", (0, TY, 0))
    names, _ = M.tread(rig, "tn", "track", TX0, TX1, TR_R, TY, TW, PITCH, WHEELS, 7.4, thick=3.4)
    _W["n"] = names

    # turret
    rig.joint("turret", "hull", TURRET)
    tx, ty, tz = TURRET
    g = Geo().blob((tx, 0, tz + 10.0), (38.0, 25.0, 19.0), p=2.6, taper=(1.0, 0.8))
    g.clip((tx, 0, tz - 1.0), (0, 0, -1))
    g.blob((tx - 30.0, 0, tz + 11.0), (10.0, 18.0, 8.0), p=3.0)   # bustle
    rig.part("turret", g, M.OLIVE, finish="gloss")
    g = Geo().blob((tx + 6.0, -20.5, tz + 10.0), (22.0, 3.0, 9.0), p=2.8)
    rig.part("turret", g, team=True)
    g = Geo()   # stowage box on the bustle
    g.blob((tx - 36.0, -12.0, tz + 12.0), (6.0, 6.0, 6.0), p=3.6)
    rig.part("turret", g, M.KHAKI, outline=0.8)
    g = Geo().blob((tx + 33.0, -2.0, BARREL_Z), (8.0, 11.0, 10.0), p=2.6)   # mantlet
    rig.part("turret", g, M.OLIVE_LT)
    rig.joint("barrel", "turret", (tx + 34.0, -2.0, BARREL_Z))
    g = Geo().capsule((tx + 34.0, -2.0, BARREL_Z), (MUZZLE[0] - 8.0, -2.0, BARREL_Z), 3.8, 3.3)
    rig.part("barrel", g, M.GUNMETAL, finish="metal")
    g = Geo().lathe([(3.4, 0), (5.4, 2.0), (5.6, 9.0), (3.4, 11.0)], (70.0, -2.0, BARREL_Z),
                    (81.0, -2.0, BARREL_Z), segs=20)   # bore evacuator
    g.lathe([(4.6, 0), (6.0, 1.2), (6.0, 8.0), (4.6, 9.4), (2.4, 9.6)], (MUZZLE[0] - 10.0, -2.0, BARREL_Z),
            (MUZZLE[0], -2.0, BARREL_Z), segs=20)   # muzzle brake
    rig.part("barrel", g, M.GUNMETAL, finish="metal")
    g = Geo().lathe([(3.7, -1.0), (3.9, 0), (3.7, 1.0)], (58.0, -2.0, BARREL_Z), (59.0, -2.0, BARREL_Z), segs=18)
    rig.part("barrel", g, M.SIGNAL, outline=0.5)
    rig.track("muzzle", "barrel", MUZZLE)
    M.muzzle_flash(rig, "barrel", (MUZZLE[0] + 1, -2.0, BARREL_Z), size=3.6)

    # cupola, commander and the anti-air machine gun
    cx, cy, cz = CUPOLA
    g = Geo().lathe([(9.0, 0), (9.4, 3.0), (8.6, 5.4), (0, 5.6)], (cx, 0, cz - 3.0), (cx, 0, cz + 3.0), segs=20)
    rig.part("turret", g, M.OLIVE_LT)
    rig.joint("cmdr", "turret", (cx, 0, cz + 2.0))
    g = Geo().blob((cx, 0, cz + 5.0), (7.4, 8.0, 5.0), p=2.4)
    rig.part("cmdr", g, team=True)
    hz = cz + 16.0
    g = Geo().blob((cx + 1.0, 0, hz), (8.2, 7.8, 8.0), p=2.3)
    g.blob((cx + 9.4, -0.5, hz - 1.4), (2.6, 2.3, 2.4), p=2.0)
    rig.part("cmdr", g, M.SKIN)
    g = Geo().blob((cx - 0.4, 0, hz + 3.6), (9.0, 8.6, 6.2), p=2.3)
    g.clip((cx, 0, hz + 0.4), (0, 0, -1))
    rig.part("cmdr", g, M.OLIVE, finish="gloss")
    g = Geo().lathe([(9.1, 0), (9.2, 1.8), (8.8, 3.0)], (cx - 0.4, 0, hz + 0.6), (cx - 0.4, 0, hz + 3.6), segs=20)
    rig.part("cmdr", g, team=True, outline=0.6)
    g = Geo().blob((cx - 1.0, -8.4, hz - 0.5), (3.2, 1.6, 3.6), p=2.4)   # headset cup + mic
    g.capsule((cx - 1.0, -9.0, hz - 2.0), (cx + 6.0, -8.0, hz - 6.0), 0.6)
    rig.part("cmdr", g, M.GUNMETAL, finish="gloss", outline=0.5)
    g = Geo()
    for y in (-3.6, 3.2):
        g.lathe([(0, 0), (2.4, 0.2), (2.5, 1.6), (0, 1.8)], (cx + 7.4, y, hz + 5.0), (cx + 9.4, y, hz + 5.6), segs=12)
    rig.part("cmdr", g, M.GUNMETAL, finish="metal", outline=0.5)
    rig.joint("c_eyes", "cmdr", (cx + 7.0, 0, hz + 0.5))
    g = Geo()
    for y in (-3.4, 3.2):
        g.blob((cx + 6.8, y, hz + 0.6), (2.3, 2.3, 2.9))
    rig.part("c_eyes", g, M.EYE, highlight=False, outline=0.6)
    g = Geo()
    for y in (-3.4, 3.2):
        g.blob((cx + 8.8, y - 0.3, hz + 0.4), (0.9, 1.4, 1.5))
    rig.part("c_eyes", g, M.PUPIL, outline=0)
    rig.joint("c_squint", "cmdr", (cx + 7.0, 0, hz + 0.5), hidden=True)
    g = Geo()
    for y in (-3.4, 3.2):
        g.capsule((cx + 8.6, y - 1.9, hz + 0.3), (cx + 8.6, y + 1.9, hz + 0.8), 0.7)
    rig.part("c_squint", g, M.PUPIL, outline=0)
    g = Geo().blob((cx + 8.4, -0.6, hz - 5.0), (1.4, 3.0, 1.2), p=2.4, rot=(-8, 0, 0))   # grin
    rig.part("cmdr", g, M.MOUTH, outline=0, highlight=False)
    g = Geo().blob((cx + 9.4, -0.6, hz - 4.4), (0.6, 2.4, 0.6), p=3.0)
    rig.part("cmdr", g, M.TOOTH, outline=0, highlight=False)
    # machine gun on a pintle in front of him, pointing up and forward
    rig.joint("mg", "turret", (cx + 8.0, -6.0, cz + 8.0))
    mx0, mz0 = cx + 8.0, cz + 8.0
    g = Geo().capsule((cx + 6.0, -6.0, cz), (mx0, -6.0, mz0), 1.2)
    rig.part("mg", g, M.GUNMETAL, finish="metal", outline=0.6)
    ang = math.atan2(MG_MUZZLE[2] - mz0, MG_MUZZLE[0] - mx0)
    ln = math.hypot(MG_MUZZLE[2] - mz0, MG_MUZZLE[0] - mx0)
    ux, uz = math.cos(ang), math.sin(ang)
    g = Geo().blob((mx0 + ux * 4.0, -6.0, mz0 + uz * 4.0), (6.0, 2.4, 3.0), p=3.0, rot=(0, -math.degrees(ang), 0))
    g.capsule((mx0, -6.0, mz0), (MG_MUZZLE[0], -6.0, MG_MUZZLE[2]), 1.3)
    g.blob((mx0 + ux * (ln - 2.0), -6.0, mz0 + uz * (ln - 2.0)), (2.2, 1.8, 1.8), p=2.4,
           rot=(0, -math.degrees(ang), 0))
    rig.part("mg", g, M.GUNMETAL, finish="metal", outline=0.8)
    g = Geo().blob((mx0 - 1.0, -7.5, mz0 + 1.0), (3.4, 2.8, 3.2), p=2.4)   # his hand on the grip
    rig.part("mg", g, M.SKIN, outline=0.6)
    rig.track("mgMuzzle", "mg", MG_MUZZLE)

    M.pennant(rig, "turret", (tx - 34.0, 12.0, tz + 20.0), 58.0, length=24.0, w=12.0, max_deg=16)

    M.smoke_puff(rig, "hull", (-66.0, -10.0, 78.0), size=1.1, name="exhaust", color=M.SMOKE_DK)
    rig.joint("smoke", "root", (MUZZLE[0] + 16, -20, BARREL_Z + 24), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 11.0), (12, 5, 9.0), (-8, 10, 8.0), (6, 15, 7.4), (20, -2, 6.6),
                      (-14, -2, 6.4), (-2, -9, 6.0)):
        g.sphere((MUZZLE[0] + 16 + dx, -20, BARREL_Z + 24 + dz), r, cuts=4)
    rig.part("smoke", g, M.SMOKE, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ---------------------------------------------------------------------------------
def _tracks(step, moving=True):
    d = STEP_LU if moving else 0.0
    return merge(M.tread_pose("tn", _W["n"], step, d, PITCH),
                 M.tread_pose("tf", _W["f"], step, d, PITCH))


def _idle(f):
    c, lag = M.idle_wave(f)
    return merge(_tracks(0, False), {
        "hull": dict(squash(0.01 * c), z=0.6 * c),
        "turret": {"r": 0.4 * lag},
        "cmdr": {"z": 0.6 * lag, "r": 2.0 * lag},
        "mg": {"r": 3.0 * lag},
        "exhaust": {"show": f in (1, 3), "s": pick(f, [1, 0.8, 1, 1.15]), "z": pick(f, [0, 0, 0, 4])},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    return merge(_tracks(f), {
        "odo": {"x": 2.0 * STEP_LU * math.cos(p)},   # stride 28 lu per 0.8 s = 35 lu/s
        "hull": dict(squash(0.012 * math.cos(2 * p)), z=0.9 * math.cos(2 * p) + 0.2,
                     r=0.7 * math.sin(p)),
        "turret": {"r": -0.4 * math.sin(p - 0.8)},
        "cmdr": {"r": -2.0 * math.sin(p - 1.0), "z": 0.5 * math.cos(2 * p)},
        "mg": {"r": 2.0 * math.sin(p - 1.4)},
        "exhaust": {"show": f % 4 == 1, "x": -3.0},
    })


ATTACK_MS = [100, 100, 150, 83, 150, 100, 100, 150]
ATTACK_IMPACT = 3


def _attack(f):
    pose = merge(_tracks(0, False), {
        "body": dict(squash(pick(f, [0, -0.02, -0.04, 0.05, -0.07, -0.03, 0.02, 0])),
                     x=pick(f, [0, 0.5, 1.0, -3.0, -6.0, -4.0, -1.0, 0])),
        "hull": {"r": pick(f, [0, -0.6, -1.0, 2.4, 3.4, 1.8, -1.0, 0])},
        "turret": {"r": pick(f, [0.8, 1.6, 1.8, 3.0, 2.6, 1.2, 0.4, 0])},
        "barrel": {"x": pick(f, [0, 0, 0, -11.0, -9.0, -4.0, 0, 0]),
                   "r": pick(f, [1.5, 2.5, 2.5, 3.5, 4.0, 2.5, 1.0, 0])},
        "cmdr": {"z": pick(f, [0, -1, -2, -3, -2, -1, 0, 0]), "r": pick(f, [0, -3, -4, 12, 9, 4, 0, 0])},
        "mg": {"r": pick(f, [0, 0, 0, 8, 6, 3, 0, 0])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.75, 1.05, 1.3, 1]),
                  "x": pick(f, [0, 0, 0, 0, -10, 0, 6, 0]), "z": pick(f, [0, 0, 0, 0, -12, 0, 7, 0])},
        "exhaust": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 1.2, 1.4, 1, 1])},
    })
    # the tracks lurch back with the recoil
    for i, (name, wr) in enumerate(_W["n"] + _W["f"]):
        pose.setdefault(name, {})["r"] = pose.get(name, {}).get("r", 0.0) + \
            math.degrees(pick(f, [0, 0, 0, 3.0, 6.0, 6.0, 5.0, 4.0]) / wr)
    if f in (2, 3, 4):
        pose.update({"c_eyes": {"hide": True}, "c_squint": {"show": True}})
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    pose = merge(_tracks(0, False), {"body": dict(squash(-0.05 * a), x=-4.0 * a), "hull": {"r": 3.0 * a},
                                     "cmdr": {"r": 14 * a, "z": -1.5 * a}, "turret": {"r": 1.5 * a},
                                     "mg": {"r": 10 * a}})
    pose.update({"c_eyes": {"hide": True}, "c_squint": {"show": True}})
    return pose


def _die(f):
    body = [{"x": -4.0, "z": 4.0, "r": 6.0, "sz": 1.06, "sx": 0.96, "sy": 0.96},
            {"x": -6.0, "z": 0.0, "r": 3.0, "sz": 0.74, "sx": 1.08, "sy": 1.08},
            {"x": -6.0, "z": 0.0, "r": 1.5, "s": 0.85, "sz": 0.55, "sx": 1.12, "sy": 1.12}][f]
    return merge(_tracks(0, False), {"body": body}, {
        "turret": {"z": pick(f, [14, 22, 14]), "r": pick(f, [12, 22, 16]), "x": pick(f, [-3, -8, -10])},
        "cmdr": {"z": pick(f, [10, 8, 2]), "r": pick(f, [24, -10, -10])},
        "barrel": {"r": pick(f, [-8, -18, -24])},
        "c_eyes": {"hide": True}, "c_squint": {"show": True},
        "exhaust": {"show": True, "s": pick(f, [1.2, 1.6, 1.8])},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
