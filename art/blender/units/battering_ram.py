"""Battering Ram: Medieval Age siege vehicle (DESIGN A5.3). Swinging ram, ~90 lu.

Look (A11 vehicle rig): a wheeled siege shed with a rounded team-hide "tortoise" roof
strapped with curved dark wooden ribs, a scalloped team valance, a heavy log hung on chains under the roof, and a big
steel ram's head with curled gold horns sticking out of the front. Four chunky spoked
wheels (the near two in front), a team pennant on a pole at the back. The walk rolls the
wheels (spokes turn exactly with the ground: 135 degrees per 0.8 s cycle at radius 15.3 lu
is 45 lu/s, the sim speed), bounces the hull and sways the log. The attack hauls the log
back (held), swings it forward (smear) and slams (held impact, hull lurch), then the log
rocks back and forth to rest.
"""
import math

from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "battering_ram"
NAME = "Battering Ram"
HEIGHT_LU = 92
YAW_DEG = -10.0
CANVAS = (340, 236)
FEET = (150, 214)
ANCHORS = {"head": (0, 80), "hitCenter": (0, 40)}

WOOD = "#9C8468"
DARK_WOOD = "#5E5045"
LOG = "#8A7560"
IRON = "#5A6068"
STEEL = "#A7B0BB"
GOLD = "#D4A437"
PARCH = "#E8DFC8"
ROPE = "#CDBB92"
EYE = "#FAF6EE"
PUPIL = "#221C19"

R_WHEEL = 15.3
AXLES = (-25.0, 22.0)
PIVOT = (-2.0, 0.0, 68.0)   # the log's chains hang from here
LOG_Z = 37.0
HEAD_X = 44.0               # the ram head's centre, in front of the shed
WALK_MS = 100
WHEEL_STEP = 135.0 / 8      # degrees per walk frame (8 spokes: 3 spokes per cycle)
SMEAR = {"joint": "ram", "inner": (HEAD_X - 4, 0, LOG_Z - 8), "outer": (HEAD_X - 4, 0, LOG_Z + 8),
         "color": STEEL, "taper": 0.5, "start": 0.3, "behind": 20.0}


def _wheel(rig, name, x, y):
    rig.joint(name, "chassis", (x, y, R_WHEEL))
    g = Geo()   # the tyre: a ring of capsules (a lathe would cap it into a disk)
    n = 16
    for k in range(n):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        g.capsule((x + (R_WHEEL - 1.6) * math.cos(a0), y, R_WHEEL + (R_WHEEL - 1.6) * math.sin(a0)),
                  (x + (R_WHEEL - 1.6) * math.cos(a1), y, R_WHEEL + (R_WHEEL - 1.6) * math.sin(a1)),
                  2.4, segs=10, rings=2)
    rig.part(name, g, DARK_WOOD)
    g = Geo()
    for k in range(8):
        a = math.radians(45 * k)
        g.capsule((x, y, R_WHEEL), (x + (R_WHEEL - 2.5) * math.cos(a), y, R_WHEEL + (R_WHEEL - 2.5) * math.sin(a)),
                  1.5, 1.2, segs=8, rings=2)
    rig.part(name, g, WOOD, outline=0.8)
    g = Geo().blob((x, y - 1.0, R_WHEEL), (4.4, 3.2, 4.4), p=2.4)
    rig.part(name, g, IRON, finish="metal")
    g = Geo()
    for k in range(8):   # iron studs on the tyre, so the roll reads
        a = math.radians(45 * k + 22.5)
        g.sphere((x + (R_WHEEL - 1.2) * math.cos(a), y - 2.2, R_WHEEL + (R_WHEEL - 1.2) * math.sin(a)), 1.2, cuts=2)
    rig.part(name, g, IRON, finish="metal", outline=0)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, R_WHEEL))
    rig.joint("odo", "root", (0, 0, 0))     # odometer for the walk metadata (no parts)
    # far wheels first
    _wheel(rig, "wheel_bf", AXLES[0], 15.0)
    _wheel(rig, "wheel_ff", AXLES[1], 15.0)
    rig.joint("hull", "chassis", (0, 0, 24.0))

    # base frame: two long beams and cross pieces
    g = Geo()
    for y in (-11.0, 11.0):
        g.blob((-2.0, y, 24.0), (40.0, 3.0, 3.4), p=3.5)
    g.blob((-40.0, 0, 24.0), (3.0, 14.0, 3.2), p=3.5).blob((36.0, 0, 24.0), (3.0, 14.0, 3.2), p=3.5)
    rig.part("hull", g, DARK_WOOD)

    # the shed: a rounded team-hide "tortoise" roof strapped with curved wooden ribs
    RX, RY, RZ, RP, RC = 41.0, 22.5, 37.0, 2.6, -2.0
    g = Geo().blob((RC, 0, 38.0), (RX, RY, RZ), p=RP, cuts=10)
    g.clip((0, 0, 38.0), (0, 0, -1))
    rig.part("hull", g, team=True)
    # scalloped team valance hanging from the near eave
    g = Geo().blob((-2.0, -21.4, 36.2), (37.5, 1.2, 3.4), p=3.0)
    for x in range(-34, 33, 8):
        g.blob((x + 2.0, -21.4, 32.6), (3.8, 1.2, 2.6), p=2.0)
    rig.part("hull", g, team=True, outline=0.8)
    g = Geo()
    for x in (-24.0, -8.0, 8.0, 24.0):   # ribs over the near half of the roof
        k = (1 - abs((x - RC) / RX) ** RP) ** (1 / RP)
        pts = []
        for i in range(8):
            t = math.radians(-6 + 104 * i / 7)
            c, sn = math.cos(t), math.sin(t)
            n = (abs(c) ** RP + abs(sn) ** RP) ** (1 / RP)
            pts.append((x, -(RY * k + 1.0) * c / n, 38.0 + (RZ * k + 1.0) * sn / n))
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 1.8, segs=8, rings=2)
    g.capsule((-40.0, -22.4, 38.4), (36.0, -22.4, 38.4), 2.1)   # eave beam
    rig.part("hull", g, DARK_WOOD)
    g = Geo().blob((RC, 0, 38.0 + RZ + 0.6), (RX * 0.55, 3.0, 2.4), p=3.0)   # ridge board
    rig.part("hull", g, WOOD)
    # pennant pole at the back with a team swallowtail (follow-through)
    g = Geo().capsule((-34.0, -3.0, 68.0), (-37.0, -3.0, 94.0), 1.3)
    rig.part("hull", g, DARK_WOOD, outline=0.8)
    g = Geo().sphere((-37.1, -3.0, 95.0), 1.9, cuts=3)
    rig.part("hull", g, GOLD, finish="metal", outline=0.8)
    rig.secondary("pennant", "hull", (-36.8, -3.0, 92.0), (-52.0, -3.0, 88.0), max_deg=16, gain=1.2,
                  rot_gain=0.6)
    pts = [(0.0, 0.0), (-17.0, -1.2), (-12.5, -5.0), (-17.0, -8.8), (0.0, -9.8)]
    g = Geo().slab([(-36.8 + x, 92.5 + z) for x, z in pts], -3.0, 1.2)
    rig.part("pennant", g, team=True, outline=0.8)

    # the log on two chains, swinging from the pivot; steel ram head with gold curled horns
    rig.joint("ram", "hull", PIVOT)
    px, py, pz = PIVOT
    g = Geo()
    for x in (-18.0, 14.0):
        for k in range(6):
            z = pz - 3 - k * (pz - LOG_Z - 6) / 5.5
            g.blob((x, 0.0, z), (1.3, 0.9, 2.2), p=2.2)
    rig.part("ram", g, IRON, finish="metal", outline=0.6)
    g = Geo().capsule((-56.0, 0, LOG_Z), (HEAD_X - 6, 0, LOG_Z), 6.0, 6.6)
    rig.part("ram", g, LOG)
    g = Geo()
    for x in (-50.0, -30.0, 26.0):
        g.lathe([(6.9, -1.6), (7.3, 0), (6.9, 1.6)], (x, 0, LOG_Z), (x + 1, 0, LOG_Z), segs=18)
    rig.part("ram", g, IRON, finish="metal", outline=0.8)
    hx, hz = HEAD_X, LOG_Z
    g = Geo().blob((hx, 0, hz + 1.0), (10.5, 8.4, 9.0), p=2.4, taper=(0.9, 1.0))
    g.blob((hx + 8.5, 0, hz - 2.0), (6.0, 6.2, 5.6), p=2.3)          # snout
    g.lathe([(7.4, 0), (7.8, 3.5), (7.2, 5.0)], (hx - 12.0, 0, hz), (hx - 7.0, 0, hz), segs=18)  # collar
    rig.part("ram", g, STEEL, finish="metal")
    g = Geo()
    for sgn in (-1.0, 1.0):  # curled horns: spheres along a spiral beside the head
        for k in range(9):
            t = k / 8.0
            ang = math.radians(100 + 300 * t)
            rr = 8.0 * (1 - 0.6 * t)
            g.sphere((hx - 3.0 + rr * math.cos(ang), sgn * (9.0 + 1.2 * t), hz + 3.0 + rr * math.sin(ang)),
                     3.3 * (1 - 0.45 * t), cuts=3)
    rig.part("ram", g, GOLD, finish="metal")
    g = Geo().blob((hx + 5.5, -7.2, hz + 4.0), (2.2, 1.2, 1.8), p=2.2)
    rig.part("ram", g, EYE, highlight=False, outline=0.6)
    g = Geo().blob((hx + 6.3, -7.9, hz + 3.8), (1.1, 0.9, 1.2), p=2.2)
    g.capsule((hx + 3.0, -7.8, hz + 7.4), (hx + 7.8, -7.6, hz + 5.6), 0.9)  # angry brow
    rig.part("ram", g, PUPIL, outline=0)
    rig.track("ramHead", "ram", (hx + 13.0, 0, hz - 1.0))
    rig.track("_foot", "odo", (0, 0, 0))
    # near wheels last so they sit in front
    _wheel(rig, "wheel_bn", AXLES[0], -15.0)
    _wheel(rig, "wheel_fn", AXLES[1], -15.0)


# -- poses ---------------------------------------------------------------------------------
WHEELS = ("wheel_bn", "wheel_fn", "wheel_bf", "wheel_ff")


def _wheels(deg):
    # a forward roll turns the wheels clockwise on screen (negative r)
    return {w: {"r": -deg} for w in WHEELS}


def _idle(f):
    c = [-1.0, -0.45, 0.45, 1.0][f]
    lag = [-1.0, -1.0, -0.45, 0.45][f]
    return {"hull": dict(squash(0.015 * c), z=0.5 * c), "ram": {"r": 2.5 * lag}}


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -abs(math.sin(p))      # two bumps per cycle, like cobbles
    return merge(_wheels(WHEEL_STEP * f), {
        "odo": {"x": 9.0 * math.cos(p)},
        "hull": dict(squash(0.02 * math.cos(2 * p)), z=1.2 * bump + 0.6, r=0.8 * math.sin(p)),
        "ram": {"r": 5.0 * math.sin(p - 1.0)},
    })


def _attack(f):
    # 0-1 haul the log back (hull leans back, squash), 2 held extreme, 3 smear (swing),
    # 4 held impact: log far forward, hull lurches, squash 0.85/1.15; 5-7 the log rocks
    ram = pick(f, [-14, -26, -32, 8, 30, 16, -6, 3])
    return {
        "body": dict(squash(pick(f, [-0.03, -0.06, 0.04, 0.03, -0.12, -0.06, -0.02, 0.0])),
                     x=pick(f, [-1, -2.5, -3, 1, 5, 4, 2, 0])),
        "hull": {"r": pick(f, [1.5, 3, 3.5, -1, -3.5, -2, 0.5, 0])},
        "ram": {"r": ram, "sx": 1.1 if f == 3 else 1.0},
        **_wheels(pick(f, [-4, -9, -11, 3, 12, 10, 5, 0])),
    }


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return {"body": dict(squash(-0.06 * a), x=-4.0 * a), "hull": {"r": 4 * a}, "ram": {"r": -10 * a},
            **_wheels(-8 * a)}


def _die(f):
    # collapse: the hull tips back and squashes, the front wheel pops off, the log drops
    # a vehicle collapses rather than flattening wide (keeps it inside its canvas)
    body = [{"x": -4.0, "z": 3.0, "r": 10.0, "sz": 1.06, "sx": 0.96, "sy": 0.96},
            {"x": -6.0, "z": 0.0, "r": 6.0, "sz": 0.74, "sx": 1.1, "sy": 1.1},
            {"x": -6.0, "z": 0.0, "r": 3.0, "s": 0.85, "sz": 0.55, "sx": 1.15, "sy": 1.15}][f]
    pose = merge({"body": body}, {
        "hull": {"r": pick(f, [8, 4, 2])},
        "ram": {"r": pick(f, [-20, -8, 0]), "z": pick(f, [0, -4, -6])},
        "wheel_fn": {"x": pick(f, [4, 8, 10]), "z": pick(f, [4, 2, 0]), "r": pick(f, [-40, -70, -90])},
    })
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
