"""Tankette: Modern Age heavy (DESIGN A5.5). Shell (proj.shell), 90 lu, armored mech. ~88 lu.

Look (A11 vehicle rig, Modern palette): a stubby, chunky little tank. An olive hull with a
sloped glacis and big team-painted side skirts over the upper run of a rubber track
(scrolling steel grousers, spinning road wheels, sprocket and idler), a round olive turret
with team cheeks and a short fat gun with a gunmetal muzzle brake, a commander in a
leather tank cap with goggles popping out of the hatch, a rear exhaust and a radio antenna
with a team pennant (the heavies' pennant cue, A11). The walk scrolls the track exactly with
the ground and bounces the hull; the attack ducks the commander, fires with a big flash
(the barrel slides back, the hull rocks back on its springs), the smoke rolls out and the
hull settles. The shell spawns at the per-frame `muzzle` anchor.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_modern as M
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "tankette"
NAME = "Tankette"
HEIGHT_LU = 96
YAW_DEG = -10.0
CANVAS = (392, 290)
FEET = (170, 268)
ANCHORS = {"head": (0, 86), "hitCenter": (0, 34)}

TR_R = 10.5                  # track end radius
TX0, TX1 = -30.0, 30.0       # track end centres
TY = -15.0                   # near track depth
TW = 9.0
PITCH = 12.5                 # grouser pitch: walk moves 3.125 lu/step = PITCH / 4
STEP_LU = 50.0 * 0.0625      # sim speed 50 lu/s, 62.5 ms per walk step
WHEELS = (-30.0, -15.0, 0.0, 15.0, 30.0)
TURRET = (-4.0, 0.0, 40.0)
BARREL_Z = 48.0
MUZZLE = (47.0, -1.0, BARREL_Z)
_W = {}
SCALE = 1.15               # the whole vehicle, so the Heavy reads big next to 68 lu infantry


def build(rig):
    rig.joint("body", "root", (0, 0, 0), scale=SCALE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 16.0))
    # far track (static belt, mostly hidden)
    g = Geo().blob((0, 14.0, TR_R), (TX1 + TR_R, 4.0, TR_R), p=3.2)
    rig.part("hull", g, M.RUBBER, finish="gloss")

    # hull: rounded box with a sloped glacis and a rear deck
    g = Geo().blob((-1.0, 0, 26.0), (37.0, 15.5, 10.5), p=3.4, taper=(1.0, 0.94), shift=(0.05, 0))
    g.blob((30.0, 0, 26.0), (10.0, 15.0, 8.6), p=2.6, rot=(0, 28, 0))
    rig.part("hull", g, M.OLIVE)
    g = Geo()   # hatch / vision slit / headlight
    g.blob((33.0, -11.0, 31.0), (3.0, 2.6, 2.4), p=2.6)
    rig.part("hull", g, M.GLASS, finish="gloss", outline=0.8)
    g = Geo().blob((24.0, -5.0, 36.4), (6.0, 4.0, 1.2), p=3.2)
    rig.part("hull", g, M.GUNMETAL, finish="metal", outline=0.6)
    g = Geo()   # rear exhaust pipe
    g.capsule((-36.0, -9.0, 30.0), (-42.0, -9.0, 30.0), 2.2)
    rig.part("hull", g, M.GUNMETAL, finish="metal", outline=0.7)
    # team side skirt with rivets
    g = Geo().blob((0.0, TY - 3.2, 22.0), (38.0, 1.8, 6.4), p=3.6)
    rig.part("hull", g, team=True)
    g = Geo()
    for x in range(-32, 36, 8):
        g.sphere((x, TY - 5.2, 25.4), 0.9, cuts=2)
    rig.part("hull", g, M.OLIVE_LT, finish="metal", outline=0)

    # near track: belt, wheels, grousers (phase copies)
    rig.joint("track", "body", (0, TY, 0))
    names, _ = M.tread(rig, "tn", "track", TX0, TX1, TR_R, TY, TW, PITCH, WHEELS, 4.6)
    _W["n"] = names

    # turret
    rig.joint("turret", "hull", TURRET)
    tx, ty, tz = TURRET
    g = Geo().blob((tx, 0, tz + 7.0), (17.0, 14.0, 10.0), p=2.4, taper=(1.0, 0.78))
    g.clip((tx, 0, tz - 0.5), (0, 0, -1))
    rig.part("turret", g, M.OLIVE, finish="gloss")
    g = Geo().blob((tx + 2.0, -11.8, tz + 5.6), (11.5, 2.4, 5.4), p=2.6)
    rig.part("turret", g, team=True)
    g = Geo().blob((tx - 2.0, 0, tz + 16.2), (7.4, 7.4, 1.5), p=2.6)   # hatch ring
    rig.part("turret", g, M.GUNMETAL, finish="metal", outline=0.6)
    g = Geo().blob((tx - 10.0, 3.0, tz + 20.5), (1.2, 6.8, 5.6), p=2.6, rot=(0, -20, 0))  # open lid
    rig.part("turret", g, M.OLIVE_LT)
    # the gun: mantlet, barrel on its own joint for the recoil slide
    g = Geo().blob((tx + 14.5, -1.0, BARREL_Z), (4.6, 5.4, 5.0), p=2.6)
    rig.part("turret", g, M.OLIVE_LT)
    rig.joint("barrel", "turret", (tx + 15.0, -1.0, BARREL_Z))
    g = Geo().capsule((tx + 15.0, -1.0, BARREL_Z), (MUZZLE[0] - 4.0, -1.0, BARREL_Z), 2.6, 2.3)
    rig.part("barrel", g, M.GUNMETAL, finish="metal")
    g = Geo().lathe([(3.4, 0), (4.0, 1.0), (4.0, 5.0), (3.2, 6.2), (1.6, 6.4)],
                    (MUZZLE[0] - 6.0, -1.0, BARREL_Z), (MUZZLE[0] + 1.0, -1.0, BARREL_Z), segs=18)
    rig.part("barrel", g, M.GUNMETAL, finish="metal")
    g = Geo().lathe([(3.1, -0.8), (3.3, 0), (3.1, 0.8)], (MUZZLE[0] - 9.5, -1.0, BARREL_Z),
                    (MUZZLE[0] - 8.5, -1.0, BARREL_Z), segs=16)
    rig.part("barrel", g, M.SIGNAL, outline=0.4)
    rig.track("muzzle", "barrel", MUZZLE)
    M.muzzle_flash(rig, "barrel", (MUZZLE[0] + 1, -1.0, BARREL_Z), size=2.4)

    # commander in the hatch (scaled a little up: a big friendly head reads at 56 px)
    rig.joint("cmdr", "turret", (tx - 2.0, 0, tz + 14.5))
    cx, cz = tx - 2.0, tz + 14.5
    g = Geo().blob((cx, 0, cz + 3.0), (6.4, 6.6, 5.0), p=2.4)   # shoulders
    rig.part("cmdr", g, team=True)
    g = Geo().blob((cx + 1.0, 0, cz + 12.5), (7.6, 7.2, 7.4), p=2.3)
    g.blob((cx + 8.6, -0.5, cz + 11.2), (2.4, 2.1, 2.2), p=2.0)   # nose
    rig.part("cmdr", g, M.SKIN)
    g = Geo().blob((cx - 0.4, 0, cz + 16.0), (8.4, 8.0, 5.8), p=2.3)   # leather cap
    g.clip((cx, 0, cz + 12.8), (0, 0, -1))
    g.blob((cx - 1.0, -7.4, cz + 12.0), (3.0, 1.4, 4.0), p=2.3).blob((cx - 1.0, 7.4, cz + 12.0), (3.0, 1.4, 4.0), p=2.3)
    rig.part("cmdr", g, M.LEATHER)
    g = Geo()   # goggles on the cap
    for y in (-3.4, 3.0):
        g.lathe([(0, 0), (2.2, 0.2), (2.3, 1.6), (0, 1.8)], (cx + 6.6, y, cz + 17.0), (cx + 8.4, y, cz + 17.6), segs=12)
    rig.part("cmdr", g, M.GUNMETAL, finish="metal", outline=0.5)
    g = Geo()
    for y in (-3.4, 3.0):
        g.blob((cx + 8.3, y, cz + 17.5), (0.6, 1.6, 1.6), p=2.2)
    rig.part("cmdr", g, M.GLASS, finish="gloss", outline=0)
    rig.joint("c_eyes", "cmdr", (cx + 6.8, 0, cz + 13.0))
    g = Geo()
    for y in (-3.2, 3.0):
        g.blob((cx + 6.4, y, cz + 13.0), (2.2, 2.2, 2.8))
    rig.part("c_eyes", g, M.EYE, highlight=False, outline=0.6)
    g = Geo()
    for y in (-3.2, 3.0):
        g.blob((cx + 8.2, y - 0.3, cz + 12.8), (0.9, 1.3, 1.4))
    rig.part("c_eyes", g, M.PUPIL, outline=0)
    rig.joint("c_squint", "cmdr", (cx + 6.8, 0, cz + 13.0), hidden=True)
    g = Geo()
    for y in (-3.2, 3.0):
        g.capsule((cx + 8.0, y - 1.8, cz + 12.8), (cx + 8.0, y + 1.8, cz + 13.2), 0.7)
    rig.part("c_squint", g, M.PUPIL, outline=0)
    g = Geo().blob((cx + 8.0, -0.6, cz + 8.4), (1.0, 2.8, 0.9), p=2.4)
    rig.part("cmdr", g, M.MOUTH, outline=0, highlight=False)

    # antenna with a team pennant at the back of the turret
    M.pennant(rig, "turret", (tx - 12.0, 6.0, tz + 12.0), 40.0, length=16.0, w=8.5)

    # exhaust puff and gun smoke (left in place: parented to the root)
    M.smoke_puff(rig, "hull", (-46.0, -9.0, 32.0), size=0.7, name="exhaust", color=M.SMOKE_DK)
    rig.joint("smoke", "root", (MUZZLE[0] + 12, -12, BARREL_Z + 16), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 7.0), (8, 3, 5.6), (-5, 6, 5.0), (4, 9, 4.6), (13, -2, 4.2), (-9, -1, 4.0)):
        g.sphere((MUZZLE[0] + 12 + dx, -12, BARREL_Z + 16 + dz), r, cuts=4)
    rig.part("smoke", g, M.SMOKE, finish="dust", outline=0.8)
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses ---------------------------------------------------------------------------------
def _tracks(step, moving=True):
    return M.tread_pose("tn", _W["n"], step, STEP_LU if moving else 0.0, PITCH)


def _idle(f):
    c, lag = M.idle_wave(f)
    # engine idle: a quick shiver of the hull, the commander breathes and looks around
    return merge(_tracks(0, False), {
        "hull": dict(squash(0.012 * c), z=0.5 * c),
        "cmdr": {"z": 0.6 * lag, "r": 2.0 * lag},
        "turret": {"r": 0.6 * lag},
        "exhaust": {"show": f in (1, 3), "s": pick(f, [1, 0.8, 1, 1.1]), "z": pick(f, [0, 0, 0, 3])},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -abs(math.sin(p))
    return merge(_tracks(f), {
        "odo": {"x": 2.0 * STEP_LU * SCALE * math.cos(p)},   # ground speed of the scaled track
        "hull": dict(squash(0.02 * math.cos(2 * p)), z=1.4 * bump + 0.7, r=0.9 * math.sin(p)),
        "cmdr": {"r": -2.5 * math.sin(p - 0.8), "z": 0.5 * math.cos(2 * p)},
        "exhaust": {"show": f % 4 == 1, "s": 0.9, "x": -2.0},
    })


ATTACK_MS = [83, 83, 125, 83, 125, 83, 83, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 turret settles, barrel lifts; 1 brace (hull squats forward), 2 held (commander ducks,
    # squints); 3 FIRE: flash, barrel slides back, hull rocks back; 4 held recoil, smoke;
    # 5 barrel returns, smoke rolls; 6 hull rocks forward; 7 settle, commander pops up
    pose = merge(_tracks(0, False), {
        "body": dict(squash(pick(f, [0, -0.03, -0.05, 0.05, -0.08, -0.03, 0.02, 0])),
                     x=pick(f, [0, 0.5, 1.0, -2.0, -4.0, -3.0, -1.0, 0])),
        "hull": {"r": pick(f, [0, -1.0, -1.5, 3.0, 4.0, 2.0, -1.2, 0])},
        "turret": {"r": pick(f, [1.0, 2.0, 2.0, 3.5, 3.0, 1.5, 0.5, 0])},
        "barrel": {"x": pick(f, [0, 0, 0, -7.0, -6.0, -2.5, 0, 0]),
                   "r": pick(f, [2, 3, 3, 4, 5, 3, 1, 0]),
                   "sz": pick(f, [1, 1, 1, 1.15, 1.05, 1, 1, 1])},
        "cmdr": {"z": pick(f, [0, -2, -5, -6, -5, -3, 0, 0.5]), "r": pick(f, [0, -4, -6, 10, 8, 4, 0, 0])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.8, 1.1, 1.3, 1]),
                  "x": pick(f, [0, 0, 0, 0, -6, 0, 4, 0]), "z": pick(f, [0, 0, 0, 0, -8, 0, 5, 0])},
    })
    if f in (2, 3, 4):
        pose.update({"c_eyes": {"hide": True}, "c_squint": {"show": True}})
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    pose = merge(_tracks(0, False), {"body": dict(squash(-0.06 * a), x=-4.0 * a), "hull": {"r": 4.0 * a},
                                     "cmdr": {"r": 14 * a, "z": -1.5 * a}, "turret": {"r": 2 * a}})
    pose.update({"c_eyes": {"hide": True}, "c_squint": {"show": True}})
    return pose


def _die(f):
    body = [{"x": -4.0, "z": 3.0, "r": 8.0, "sz": 1.06, "sx": 0.96, "sy": 0.96},
            {"x": -6.0, "z": 0.0, "r": 4.0, "sz": 0.74, "sx": 1.1, "sy": 1.1},
            {"x": -6.0, "z": 0.0, "r": 2.0, "s": 0.85, "sz": 0.55, "sx": 1.15, "sy": 1.15}][f]
    return merge(_tracks(0, False), {"body": body}, {
        "turret": {"z": pick(f, [10, 14, 8]), "r": pick(f, [18, 30, 20]), "x": pick(f, [-2, -5, -6])},
        "cmdr": {"z": pick(f, [8, 6, 0]), "r": pick(f, [20, -10, -10])},
        "barrel": {"r": pick(f, [-10, -24, -30])},
        "c_eyes": {"hide": True}, "c_squint": {"show": True},
        "smoke": {"show": f in (0, 1), "s": pick(f, [0.8, 1.1, 1]), "x": -52.0, "z": -24.0},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
