"""Sapper: Industrial Age Epic siege (docs/design-lane-ages.md A17.10). 240 vs the base / 2.0 s
(12 vs units), melee, fast (speed 85), medium, ~70 lu. siegeOnly: runs for the base. Short Fuse: on
death the charge goes off for 180 splash r60 (the game adds fx.explosion_m).

Look (A17.12, Industrial palette): a wiry demolition man in a running crouch. A padded leather
helmet with a small brass lamp (a warm glow) and goggles pushed up, a cream scarf streaming
behind him on follow-through, a team work jacket and team sleeves, iron-blue trousers with
gaiters. On his back rides a big striped charge box (coal and cream hazard bands, a team lid,
copper corner caps) with a fuse coiling out of it whose tip fizzes with a white-hot sparkle (A17.12
"lit fuse sparkle", flickering in every clip). In his near hand a bundled charge of three paper
sticks with a short lit fuse. The walk is a forward-leaning sprint; the attack winds the charge
back, slams it into the target with a smear and a spark burst (held impact), and recovers.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "sapper"
NAME = "Sapper"
HEIGHT_LU = 70
CANVAS = (300, 262)
FEET = (132, 238)
ANCHORS = {"head": (6, 64), "hitCenter": (0, 30)}

HR = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
STICK = 13.0
PAPER = "#C9B9A0"
FUSE_TIP = (-22.0, 2.0, 60.0)
SMEAR = {"joint": "charge", "inner": (HR[0], HR[1], HR[2] + 4.0), "outer": (HR[0], HR[1], HR[2] + STICK + 2.0),
         "color": PAPER, "taper": 0.5, "start": 0.3}


def build(rig):
    I.skeleton(rig)
    I.legs(rig, trousers=I.DENIM, gaiter=I.LEATHER_DK)
    # the charge box on the back (drawn first) with its fuse
    I.stripes_box(rig, "torso", (-15.0, 0.0, 30.0), (6.6, 10.6, 10.2), n=3)
    g = Geo()
    for y in (-10.4, 10.4):
        for z in (20.8, 39.2):
            g.blob((-15.0 - 5.4, y, z), (1.8, 1.4, 1.8), p=3.0)
    rig.part("torso", g, I.COPPER, finish="metal", outline=0.4)
    g = Geo().capsule((6.0, -10.0, 37.0), (-8.0, -9.4, 22.0), 1.5)   # strap
    rig.part("torso", g, I.LEATHER, outline=0.6)
    g = Geo()
    pts = [(-16.0, 2.0, 41.0), (-17.5, 2.0, 47.0), (-21.0, 2.0, 50.0), (-20.0, 2.0, 55.0), FUSE_TIP]
    for a, b in zip(pts, pts[1:]):
        g.capsule(a, b, 0.9)
    rig.part("torso", g, I.COAL_LT, outline=0.4)
    I.fuse_spark(rig, "torso", FUSE_TIP, size=1.8, name="spark", seed=1)

    I.jacket(rig, collar=I.CREAM_DK)
    # scarf: a wrap at the neck and a tail streaming back on follow-through
    g = Geo().lathe([(7.4, 0), (8.0, 1.6), (7.6, 3.2)], (1.2, 0, 36.0), (1.2, 0, 39.4), segs=18)
    rig.part("torso", g, I.CREAM)
    rig.secondary("scarf", "torso", (-4.0, -2.0, 38.0), (-18.0, -2.0, 36.0), max_deg=24, gain=1.3)
    g = Geo().blob((-10.0, -2.0, 37.4), (8.0, 2.2, 2.0), p=2.4, taper=(1.0, 0.7))
    g.blob((-17.0, -2.0, 36.2), (3.0, 2.0, 2.6), p=2.4)
    rig.part("scarf", g, I.CREAM, outline=0.6)

    I.head_ball(rig)
    I.face(rig, brow=I.HAIR, brow_angry=True, grin=True)
    I.ear(rig)
    # padded leather helmet with ear flaps, a brass lamp and goggles pushed up
    g = Geo().blob((0.8, 0, 57.4), (12.4, 12.0, 8.6), p=2.3)
    g.clip((0, 0, 53.4), (0, 0, -1))
    g.blob((-1.0, -10.4, 49.0), (4.6, 2.2, 5.6), p=2.4)
    g.blob((-1.0, 10.4, 49.0), (4.6, 2.2, 5.6), p=2.4)
    rig.part("head", g, I.LEATHER)
    g = Geo()
    for a in (-40, 0, 40):
        g.capsule((0.8 + 11.6 * math.sin(math.radians(a)) * 0.2 - 8, -6.0 + a * 0.15, 64.0),
                  (0.8 + 12.4 * math.cos(math.radians(a)) * 0.8, -3.0 + a * 0.15, 57.0), 0.8)
    rig.part("head", g, I.LEATHER_DK, outline=0)
    I.goggles(rig, at=(10.2, 0, 60.4), k=0.9)
    g = Geo().lathe([(0, 0), (2.6, 0.1), (2.8, 2.6), (0, 2.8)], (8.0, 0, 64.6), (9.6, 0, 66.6), segs=14)
    rig.part("head", g, I.BRASS, finish="metal", outline=0.6)
    g = Geo().blob((9.8, 0, 66.8), (0.7, 2.2, 2.2), p=2.2, rot=(0, -36, 0))
    rig.part("head", g, glow=I.EMBER, outline=0)

    for s in ("r", "l"):
        I.arm_parts(rig, s, team_sleeve=True, fist=4.5, cuff=I.LEATHER_DK)
    I.shoulders(rig)

    # the charge: three paper sticks bound with twine, a short fuse at the top
    rig.joint("charge", "hand_r", HR)
    x, y, z = HR
    g = Geo()
    for dx, dy in ((-2.0, 0.0), (2.0, 0.0), (0.0, -2.2)):
        g.capsule((x + dx, y + dy, z - 4.0), (x + dx, y + dy, z + STICK), 2.1)
    rig.part("charge", g, PAPER)
    g = Geo()
    for zz in (z + 1.0, z + STICK - 3.0):
        g.lathe([(4.4, -0.6), (4.6, 0), (4.4, 0.6)], (x, y - 0.7, zz), (x, y - 0.7, zz + 1), segs=16)
    rig.part("charge", g, I.BRICK, outline=0.4)
    g = Geo().capsule((x, y - 1.0, z + STICK + 1.0), (x - 1.0, y - 1.0, z + STICK + 5.0), 0.7)
    rig.part("charge", g, I.COAL_LT, outline=0.3)
    I.fuse_spark(rig, "charge", (x - 1.0, y - 1.6, z + STICK + 5.6), size=0.9, name="spark2", seed=3)
    I.fuse_spark(rig, "charge", (x + 4.0, y - 3.0, z + STICK + 2.0), size=2.2, name="burst", seed=5,
                 hidden=True)
    rig.track("chargeTip", "charge", (x, y, z + STICK + 2.0))
    rig.track("fuse", "torso", FUSE_TIP)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


def grip(a, f, w, la=-80.0, lf=-60.0):
    return merge(I.arm("r", a, f, w=w, w_rest=90.0), I.arm("l", la, lf))


def fizz(k):
    """The fuse sparkles flicker: a different size and turn per frame."""
    s = [1.0, 0.75, 1.15, 0.85, 1.05, 0.7, 1.2, 0.9][k % 8]
    return {"spark": {"s": s, "r": 23.0 * k}, "spark2": {"s": 1.9 - s, "r": -31.0 * k}}


CROUCH = {"hips": {"z": -2.5}, "torso": {"r": -16.0}, "head": {"r": 10.0},
          "thigh_r": {"r": 8.0}, "shin_r": {"r": -10.0}, "thigh_l": {"r": -4.0}, "shin_l": {"r": -12.0}}
IDLE = (-66.0, -6.0, 64.0)


def _idle(f):
    c, lag = I.idle_wave(f)
    a, fo, w = IDLE
    return merge(I.idle_body(f, bob=1.1), CROUCH, grip(a + 2 * lag, fo + 3 * lag, w + 4 * lag, -60 + 3 * c, -30),
                 fizz(f), {"scarf": {"r": 3.0 * lag}})


def _walk(f):
    pose, p, bl = I.walk_legs(f, stride=36.0, lift=70.0, bob=3.0, lean=-26.0, sway=8.0)
    sw = math.cos(p)
    return merge(pose, {"hips": {"z": -2.0}, "head": {"r": 12.0}},
                 grip(-50 + 26 * sw, 0 + 16 * sw, 60 + 16 * sw, -50 - 40 * sw, -10 - 30 * sw), fizz(f))


def _attack(f):
    # 0-1 wind the charge back, 2 held extreme (charge high behind, yell), 3 smear (slam),
    # 4 held impact (charge jammed against the target, spark burst, squash), 5-7 recover
    a = pick(f, [0, 30, 60, 10, -20, -26, -26, -22])
    fo = pick(f, [60, 100, 130, 30, -12, -4, 20, 36])
    w = pick(f, [110, 150, 170, 40, -10, 10, 40, 58])
    la = pick(f, [-60, -80, -100, -40, -20, -30, -45, -58])
    lf = pick(f, [-30, -50, -70, -20, 0, -10, -20, -30])
    pose = merge(CROUCH, grip(a, fo, w, la, lf), fizz(f), {
        "body": dict(squash(pick(f, [0.03, 0.06, 0.08, 0.02, -0.14, -0.08, -0.03, 0.0])),
                     x=pick(f, [-1, -2.5, -3.5, 2.0, 5.0, 4.0, 2.0, 0.5])),
        "torso": {"r": pick(f, [4, 10, 14, -10, -18, -14, -8, -4])},
        "head": {"r": pick(f, [0, 2, 4, -2, -6, -4, -2, 0])},
        "thigh_r": {"r": pick(f, [2, 4, 6, 18, 26, 22, 14, 6])},
        "shin_r": {"r": pick(f, [0, 0, -4, -10, -16, -12, -6, 0])},
        "burst": {"show": f == 4, "s": 1.0},
        "scarf": {"r": pick(f, [0, 0, 0, 0, 0, 0, 0, 0])},
    })
    if f == 3:
        pose["charge"] = {"sz": 1.12}
    if f in (2, 3, 4):
        I.yell(pose)
    return pose


def _hit(f):
    a, fo, w = IDLE
    k = [1.0, 0.55, 0.2][f]
    return merge(CROUCH, grip(a + 16 * k, fo + 18 * k, w + 8 * k, -40 + 20 * k, -10 + 20 * k), I.hit_body(f), fizz(f))


def _die(f):
    pose = merge(grip(pick(f, [40, 10, -20]), pick(f, [80, 40, 0]), pick(f, [160, 130, 110]),
                      pick(f, [40, 10, -20]), pick(f, [80, 30, 0])),
                 fx.die_pose(f), I.die_limbs(f), fizz(f), {"burst": {"show": f == 0}})
    if f in (0, 1):
        I.ko(pose)
        I.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
