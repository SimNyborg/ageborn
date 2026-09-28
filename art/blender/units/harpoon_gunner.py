"""Harpoon Gunner: Industrial Age anti-armor (docs/design-lane-ages.md A17.10). Harpoon
(proj.harpoon), 210 lu, ~70 lu, medium. Reel In: the first hit of each engagement pulls the target
25 lu toward the gunner.

Look (A17.12, Industrial palette): a stocky whaler-engineer with brass goggles over his eyes, a
knitted coal watch cap, a team pea jacket and team sleeves, a leather apron belt and a big coil
of cream rope slung on his back. On his near shoulder rests a heavy iron harpoon gun: a fat
riveted barrel with copper bands, a round breech drum with a crank, a pistol grip and a front
grip, and a barbed iron harpoon head sticking out of the muzzle with its rope running back to the
coil. The long gun with the barbed head is the anti-armor silhouette at 56 px. The attack braces,
aims (held), fires with a flash and a smoke puff (the harpoon leaves the tube), kicks him back,
then "reel-in yank": he heaves the gun back as if hauling the rope, and a fresh harpoon is seated
as he settles. The projectile spawns at the per-frame `muzzle` anchor.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "harpoon_gunner"
NAME = "Harpoon Gunner"
HEIGHT_LU = 70
CANVAS = (340, 228)
FEET = (148, 204)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (40, 44)}

TY, TZ = -15.5, 37.0         # barrel axis: in front of the near shoulder
T0, T1 = -20.0, 24.0         # barrel ends (x)
TR = 3.9
PIVOT = (-2.0, TY, TZ)
GRIP = (5.0, TY + 1.0, TZ - 8.5)
FORE = (14.0, TY + 1.0, TZ - 6.0)
MUZZLE = (T1 + 2.0, TY, TZ)
HEAD_LEN = 14.0


def build(rig):
    I.skeleton(rig)
    I.legs(rig, trousers=I.DENIM, cuff=I.CREAM_DK, thigh_r=5.1)
    # rope coil on the back (drawn first, behind the jacket)
    g = Geo()
    for k, r in enumerate((10.4, 8.6, 6.8)):
        g.lathe([(r - 1.5, -1.6), (r + 0.2, -1.8), (r + 1.5, 0), (r + 0.2, 1.8), (r - 1.5, 1.6)],
                (-11.5 - k * 0.8, 1.0, 27.0), (-13.5 - k * 0.8, 1.0, 27.0), segs=24)
    rig.part("torso", g, I.CREAM_DK, finish="hair")
    g = Geo().capsule((6.0, -9.4, 37.0), (-6.0, -8.8, 18.0), 1.5)   # coil strap
    rig.part("torso", g, I.LEATHER, outline=0.6)
    I.jacket(rig, collar=I.COAL_LT)
    g = Geo().blob((0.4, 0, 18.8), (11.2, 10.4, 3.8), p=3.2)   # apron belt with a hook
    rig.part("torso", g, I.LEATHER_DK)
    g = Geo().capsule((9.0, -8.6, 18.0), (10.6, -9.6, 12.0), 0.9)
    rig.part("torso", g, I.IRON_LT, finish="metal", outline=0.4)

    I.head_ball(rig)
    I.face(rig, brow=I.HAIR_RED, brow_angry=True, grin=True)
    I.ear(rig)
    g = Geo().blob((5.0, 0, 42.0), (9.8, 10.4, 5.6), p=2.2)   # short beard along the jaw
    g.clip((4.0, 0, 0), (-1, 0, 0)).clip((0, 0, 44.4), (0, 0, 1))
    rig.part("head", g, I.HAIR_RED, finish="hair", outline=0.5)
    # knitted watch cap (coal, a rolled cuff)
    g = Geo().blob((-0.4, 0, 57.6), (11.8, 11.4, 7.6), p=2.3, shift=(-0.1, 0))
    g.clip((0, 0, 56.0), (0, 0, -1))
    g.sphere((-3.0, 0, 65.4), 2.6, cuts=3)   # pompom
    rig.part("head", g, I.COAL_LT)
    g = Geo().lathe([(12.0, 0), (12.5, 1.4), (12.1, 3.2), (11.5, 3.8)], (0.2, 0, 55.4), (0.2, 0, 59.2), segs=24)
    rig.part("head", g, I.IRON, outline=0.6)
    I.goggles(rig, at=(11.2, 0, 59.4), k=1.0)

    for s in ("r", "l"):
        I.arm_parts(rig, s, team_sleeve=True, fist=4.6, cuff=I.COAL_LT)
    I.shoulders(rig)

    # the harpoon gun (pivot at the shoulder)
    rig.joint("tube", "torso", PIVOT)
    g = Geo().capsule((T0 + 3, TY, TZ), (T1 - 2, TY, TZ), TR, TR + 0.3, segs=20)
    rig.part("tube", g, team=True)
    g = Geo()   # flared muzzle and the breech drum
    g.lathe([(TR - 0.2, 0), (TR + 1.4, 1.6), (TR + 2.2, 4.6), (TR + 1.0, 5.2), (TR - 1.0, 5.0)],
            (T1 - 3.5, TY, TZ), (T1 + 2, TY, TZ), segs=22)
    rig.part("tube", g, I.IRON_DK, finish="metal")
    g = Geo().lathe([(0, -4.0), (6.4, -4.0), (7.0, -2.4), (7.0, 2.4), (6.4, 4.0), (0, 4.0)],
                    (T0 + 1.0, TY, TZ), (T0 + 1.0, TY - 1, TZ), segs=22)
    rig.part("tube", g, I.IRON_DK, finish="metal")
    g = Geo()
    I.rivets(g, [(T0 + 1.0 + 5.0 * math.cos(a), TY - 4.2, TZ + 5.0 * math.sin(a))
                 for a in (i * math.pi / 3 for i in range(6))], r=0.9)
    rig.part("tube", g, I.BRASS_LT, finish="metal", outline=0)
    g = Geo().capsule((T0 + 1.0, TY - 4.6, TZ), (T0 - 3.0, TY - 6.6, TZ - 5.0), 0.9)   # crank
    g.sphere((T0 - 3.0, TY - 6.8, TZ - 5.0), 1.5, cuts=2)
    rig.part("tube", g, I.WOOD_LT, outline=0.5)
    g = Geo()   # copper bands
    for x in (-6.0, 8.0):
        g.lathe([(TR + 0.5, -1.4), (TR + 0.7, 0), (TR + 0.5, 1.4)], (x, TY, TZ), (x + 1, TY, TZ), segs=20)
    rig.part("tube", g, I.COPPER, finish="metal", outline=0.5)
    g = Geo().blob((-3.0, TY + 1.0, TZ - 4.4), (6.0, 2.6, 1.8), p=3.0)   # shoulder pad
    rig.part("tube", g, I.LEATHER, outline=0.6)
    g = Geo().capsule((GRIP[0], GRIP[1], TZ - TR), (GRIP[0] - 1.5, GRIP[1], GRIP[2]), 1.5)
    g.capsule((FORE[0], FORE[1], TZ - TR), (FORE[0] + 0.5, FORE[1], FORE[2] - 1.0), 1.4)
    rig.part("tube", g, I.WOOD, outline=0.6)
    # the harpoon: a shaft and a big barbed head out of the muzzle (hidden once fired)
    rig.joint("harpoon", "tube", (T1, TY, TZ))
    hx = T1 + 1.0
    g = Geo().capsule((T1 - 4.0, TY, TZ), (hx + HEAD_LEN * 0.4, TY, TZ), 1.2)
    rig.part("harpoon", g, I.IRON_DK, finish="metal", outline=0.6)
    tip = hx + HEAD_LEN
    pts = [(hx + HEAD_LEN * 0.35, TZ + 1.2), (hx + HEAD_LEN * 0.15, TZ + 5.2), (hx + HEAD_LEN * 0.55, TZ + 2.0),
           (tip, TZ), (hx + HEAD_LEN * 0.55, TZ - 2.0), (hx + HEAD_LEN * 0.15, TZ - 5.2),
           (hx + HEAD_LEN * 0.35, TZ - 1.2)]
    g = Geo().slab(pts, TY, 2.4)
    rig.part("harpoon", g, I.IRON_LT, finish="metal", outline=0.8)
    # the rope from the breech back to the coil
    g = Geo()
    rpts = [(T0 + 2.0, TY + 2.0, TZ - 2.0), (T0 - 2.0, TY + 6.0, TZ - 6.0), (-10.0, -2.0, 28.0)]
    for a, b in zip(rpts, rpts[1:]):
        g.capsule(a, b, 0.8)
    rig.part("tube", g, I.CREAM_DK, outline=0.4)
    rig.track("muzzle", "tube", MUZZLE)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    I.muzzle_flash(rig, "tube", (T1 + 3, TY, TZ), size=1.7)
    rig.joint("smoke", "root", (T1 + 14, -20, TZ + 4), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 5.2), (6, 3, 4.2), (-4, 6, 4.0), (3, 8, 3.4), (10, -1, 3.2)):
        g.sphere((T1 + 14 + dx, -20, TZ + 4 + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)


def aim(deg, dx=0.0, dz=0.0):
    """Gun pointing `deg` (pivot shifted dx, dz); both hands on its grips by IK."""
    pose = {"tube": {"r": deg, "x": dx, "z": dz}}
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))

    def world(p):
        x, z = p[0] - PIVOT[0], p[2] - PIVOT[2]
        return (PIVOT[0] + dx + x * c - z * s, PIVOT[2] + dz + x * s + z * c)
    gx, gz = world(GRIP)
    a, f = I.ik2(I.SH, (gx - 0.4, gz + 0.8))
    pose.update(I.arm("r", a, f))
    fx_, fz = world(FORE)
    a, f = I.ik2(I.SH, (fx_ - 0.6, fz))
    pose.update(I.arm("l", a, f))
    return pose


def _idle(f):
    c, lag = I.idle_wave(f)
    return merge(I.idle_body(f, bob=1.4), aim(9.0 + 2.0 * lag, dz=0.4 * lag))


def _walk(f):
    pose, p, bl = I.walk_legs(f, lean=-6.0, stride=28.0)
    return merge(pose, aim(8.0 - 2.5 * bl, dz=0.6 * bl))


ATTACK_MS = [83, 83, 125, 83, 125, 100, 100, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 brace, 1 aim, 2 aim held (squint), 3 FIRE (flash, harpoon gone), 4 kick held,
    # 5 reel-in yank (lean back, gun hauled up), 6 recover, 7 settle (a fresh harpoon)
    deg = pick(f, [5.0, 1.0, 0.0, 0.0, 12.0, 17.0, 10.0, 8.0])
    pose = merge(aim(deg, dx=pick(f, [0, 0.5, 0.8, 0.8, -2.5, -4.0, -1.5, 0]),
                     dz=pick(f, [0, 0, 0, 0, 0.5, 1.5, 0.5, 0])), {
        "body": dict(squash(pick(f, [-0.05, -0.07, -0.08, 0.02, -0.12, 0.05, -0.03, 0])),
                     x=pick(f, [0, 0.5, 1.0, 0.0, -4.0, -5.0, -2.0, -0.5])),
        "hips": {"z": pick(f, [-1.5, -2.0, -2.2, -2.2, -2.8, -1.0, -0.8, 0])},
        "torso": {"r": pick(f, [-3, -4, -5, -5, 4, 12, 4, 0])},
        "head": {"r": pick(f, [-3, -6, -8, -8, 3, 6, 0, 0]), "x": pick(f, [0, 0.6, 1.0, 1.0, 0, 0, 0, 0])},
        "thigh_r": {"r": pick(f, [10, 14, 16, 16, 12, 18, 8, 2])},
        "shin_r": {"r": pick(f, [-8, -12, -14, -14, -12, -6, -4, 0])},
        "thigh_l": {"r": pick(f, [-12, -16, -18, -18, -20, -8, -10, -4])},
        "shin_l": {"r": pick(f, [-6, -8, -10, -10, -10, -18, -6, 0])},
        "flash": {"show": f == 3},
        "harpoon": {"hide": f in (3, 4, 5, 6)},
        "smoke": {"show": f in (3, 4, 5), "s": pick(f, [1, 1, 1, 0.7, 1.0, 1.2, 1, 1]),
                  "x": pick(f, [0, 0, 0, 0, 3, 6, 0, 0]), "z": pick(f, [0, 0, 0, 0, 1, 4, 0, 0])},
    })
    if f in (2, 3):
        I.squint(pose)
    if f in (4, 5):
        I.yell(pose)
    return pose


def _hit(f):
    return merge(aim(9.0 + [12, 7, 2][f]), I.hit_body(f))


def _die(f):
    pose = merge(aim(pick(f, [30, 22, 22])), fx.die_pose(f), I.die_limbs(f))
    if f in (0, 1):
        I.ko(pose)
    if f == 0:
        I.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
