"""Bazooka Trooper: Modern Age anti-armor (DESIGN A5.5). Rocket (proj.rocket), 200 lu, ~70 lu.

Look (A11, Modern palette): a broad soldier in a round helmet with a team band and a pair
of goggles pushed up on its front, a team tunic with rolled-up team sleeves, khaki webbing
with rocket pouches, olive trousers and khaki puttees. A huge olive launcher tube rests on
his near shoulder (khaki bands, a flared rear bell, a pistol grip and a front grip), with
a gunmetal warhead with a signal red-violet band peeking out of the front: the long tube
is the anti-armor silhouette at 56 px. The attack braces (crouch), aims (held, squint),
fires with a front flash and a big back-blast of smoke, kicks him back (squash), the smoke
billows while the tube is empty, and a fresh warhead is back in the tube as he settles.
The projectile (proj.rocket) spawns at the exported per-frame `muzzle` anchor.
"""
from ageborn_art import fx
from ageborn_art import rigs_modern as M
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "bazooka_trooper"
NAME = "Bazooka Trooper"
HEIGHT_LU = 70
CANVAS = (336, 224)
FEET = (148, 202)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (40, 44)}

TY, TZ = -15.5, 37.5         # tube axis: in front of the near shoulder
T0, T1 = -30.0, 30.0         # tube ends (x)
TR = 4.3                     # tube radius
PIVOT = (-2.0, TY, TZ)       # the tube rotates about the shoulder
GRIP = (6.0, TY + 1.0, TZ - 8.5)
FORE = (15.0, TY + 1.0, TZ - 6.0)
MUZZLE = (T1 + 1.0, TY, TZ)
WARHEAD = "#50565C"


def build(rig):
    M.skeleton(rig)
    M.legs(rig, thigh_r=5.0)
    M.tunic(rig)
    g = Geo()   # rocket pouches on the belt (back)
    for x in (-6.5, -2.0):
        g.blob((x, -10.2, 17.6), (2.2, 1.8, 4.2), p=3.0)
    rig.part("torso", g, M.KHAKI, outline=0.6)

    M.head_ball(rig)
    M.face(rig, brow=M.HAIR)
    g = Geo().blob((-6.0, 0, 46.0), (5.6, 9.8, 6.0), p=2.2)
    rig.part("head", g, M.HAIR, finish="hair")
    M.helmet_round(rig, c=(1.0, 0, 55.0), net=False)
    g = Geo()   # goggles pushed up on the helmet front
    for y in (-4.6, 4.2):
        g.lathe([(0, 0), (3.0, 0.2), (3.2, 2.2), (0, 2.4)], (11.4, y, 59.0), (13.8, y, 59.6), segs=14)
    rig.part("head", g, M.LEATHER, outline=0.6)
    g = Geo()
    for y in (-4.6, 4.2):
        g.blob((13.6, y, 59.5), (0.8, 2.3, 2.3), p=2.2)
    rig.part("head", g, M.GLASS, finish="gloss", outline=0)

    for s in ("r", "l"):
        M.arm_parts(rig, s, rolled=True, fist=4.5)
    M.shoulders(rig)

    # the launcher, on its own joint (pivot at the shoulder); hands are posed by IK
    rig.joint("tube", "torso", PIVOT)
    g = Geo().capsule((T0 + 4, TY, TZ), (T1 - 2, TY, TZ), TR, TR, segs=20)
    rig.part("tube", g, team=True)
    g = Geo()   # flared rear bell and front ring
    g.lathe([(TR - 0.4, 0), (TR + 1.4, 2.0), (TR + 3.4, 7.0), (TR + 2.4, 7.6), (TR - 0.5, 1.0)],
            (T0 + 7.5, TY, TZ), (T0 - 2, TY, TZ), segs=22)
    g.lathe([(TR + 0.8, 0), (TR + 1.0, 3.0), (TR - 0.2, 3.6)], (T1 - 3.5, TY, TZ), (T1 + 2, TY, TZ), segs=22)
    rig.part("tube", g, M.GUNMETAL, finish="metal")
    g = Geo()   # khaki bands, shoulder pad, sight
    for x in (-12.0, 6.0):
        g.lathe([(TR + 0.5, -1.6), (TR + 0.7, 0), (TR + 0.5, 1.6)], (x, TY, TZ), (x + 1, TY, TZ), segs=20)
    rig.part("tube", g, M.OLIVE, finish="gloss", outline=0.6)
    g = Geo().blob((-3.0, TY + 1.0, TZ - 4.6), (6.0, 2.6, 1.8), p=3.0)
    rig.part("tube", g, M.KHAKI, outline=0.6)
    g = Geo().blob((2.0, TY - 1.0, TZ + TR + 1.6), (2.2, 1.0, 2.0), p=3.0)   # sight frame
    g.capsule((GRIP[0], GRIP[1], TZ - TR), (GRIP[0] - 1.5, GRIP[1], GRIP[2]), 1.4)       # pistol grip
    g.capsule((FORE[0], FORE[1], TZ - TR), (FORE[0] + 0.5, FORE[1], FORE[2] - 1.0), 1.3)  # front grip
    rig.part("tube", g, M.GUNMETAL, finish="metal", outline=0.6)
    # the warhead peeking out of the front (hidden while the tube is empty)
    rig.joint("rocket", "tube", (T1, TY, TZ))
    g = Geo().lathe([(TR - 0.9, 0), (TR - 0.8, 2.0), (TR - 1.6, 5.4), (1.0, 7.6), (0, 8.0)],
                    (T1 - 1.0, TY, TZ), (T1 + 8, TY, TZ), segs=18)
    rig.part("rocket", g, WARHEAD, finish="metal")
    g = Geo().lathe([(TR - 0.7, 0), (TR - 0.6, 1.6), (TR - 0.9, 2.4)], (T1 + 0.4, TY, TZ), (T1 + 3, TY, TZ), segs=18)
    rig.part("rocket", g, M.SIGNAL, outline=0.5)
    rig.track("muzzle", "tube", MUZZLE)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    M.muzzle_flash(rig, "tube", (T1 + 2, TY, TZ), size=1.9)
    M.muzzle_flash(rig, "tube", (T0 - 2, TY, TZ), size=1.5, name="blast", back=True)
    # back-blast smoke (left in place by the tube: parented to the root)
    rig.joint("smoke", "root", (T0 - 14, -8, TZ - 2), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 7.0), (-8, 3, 6.0), (-4, 9, 5.4), (5, 7, 5.0), (-14, -2, 4.6),
                      (-11, 10, 4.2), (4, -4, 4.4)):
        g.sphere((T0 - 14 + dx, -8, TZ - 2 + dz), r, cuts=4)
    rig.part("smoke", g, M.SMOKE, finish="dust", outline=0.8)


# -- poses ---------------------------------------------------------------------------------
def aim(deg, dx=0.0, dz=0.0):
    """Tube pointing `deg` (pivot shifted dx, dz); both hands on its grips by IK."""
    import math
    pose = {"tube": {"r": deg, "x": dx, "z": dz}}
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))

    def world(p):
        x, z = p[0] - PIVOT[0], p[2] - PIVOT[2]
        return (PIVOT[0] + dx + x * c - z * s, PIVOT[2] + dz + x * s + z * c)
    gx, gz = world(GRIP)
    a, f = M.ik2(M.SH, (gx - 0.4, gz + 0.8))
    pose.update(M.arm("r", a, f))
    fx_, fz = world(FORE)
    a, f = M.ik2(M.SH, (fx_ - 0.6, fz))
    pose.update(M.arm("l", a, f))
    return pose


def _idle(f):
    c, lag = M.idle_wave(f)
    return merge(M.idle_body(f, bob=1.4), aim(7.0 + 2.0 * lag, dz=0.4 * lag))


def _walk(f):
    pose, p, bl = M.walk_legs(f, lean=-6.0, stride=28.0)
    return merge(pose, aim(6.0 - 2.5 * bl, dz=0.6 * bl))


ATTACK_MS = [83, 83, 125, 83, 125, 83, 83, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 brace (crouch), 1 aim, 2 aim held (squint), 3 FIRE (flash front and back, blast),
    # 4 kick held (squash, tube up, body back), 5 smoke billows, 6 recover, 7 settle (reloaded)
    deg = pick(f, [4.0, 1.0, 0.0, 0.0, 10.0, 6.0, 4.0, 6.0])
    pose = merge(aim(deg, dx=pick(f, [0, 0.5, 0.8, 0.8, -2.5, -1.5, -0.5, 0])), {
        "body": dict(squash(pick(f, [-0.05, -0.07, -0.08, 0.02, -0.12, -0.06, -0.03, 0])),
                     x=pick(f, [0, 0.5, 1.0, 0.0, -4.0, -3.0, -1.5, -0.5])),
        "hips": {"z": pick(f, [-1.5, -2.0, -2.2, -2.2, -2.8, -2.0, -1.0, 0])},
        "torso": {"r": pick(f, [-3, -4, -5, -5, 4, 2, 0, 0])},
        "head": {"r": pick(f, [-3, -6, -8, -8, 3, 0, -1, 0]), "x": pick(f, [0, 0.6, 1.0, 1.0, 0, 0, 0, 0])},
        "thigh_r": {"r": pick(f, [10, 14, 16, 16, 12, 10, 6, 2])},
        "shin_r": {"r": pick(f, [-8, -12, -14, -14, -12, -8, -4, 0])},
        "thigh_l": {"r": pick(f, [-12, -16, -18, -18, -20, -18, -12, -4])},
        "shin_l": {"r": pick(f, [-6, -8, -10, -10, -10, -8, -4, 0])},
        "flash": {"show": f == 3},
        "blast": {"show": f == 3},
        "rocket": {"hide": f in (3, 4, 5, 6)},
        "smoke": {"show": f in (3, 4, 5), "s": pick(f, [1, 1, 1, 0.7, 1.0, 1.2, 1, 1]),
                  "x": pick(f, [0, 0, 0, 2, 0, -3, 0, 0]), "z": pick(f, [0, 0, 0, 0, 1, 4, 0, 0])},
    })
    if f in (2, 3):
        M.squint(pose)
    if f == 4:
        M.yell(pose)
    return pose


def _hit(f):
    return merge(aim(7.0 + [12, 7, 2][f]), M.hit_body(f))


def _die(f):
    pose = merge(aim(pick(f, [30, 22, 22])), fx.die_pose(f), M.die_limbs(f))
    if f in (0, 1):
        M.ko(pose)
    if f == 0:
        M.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
