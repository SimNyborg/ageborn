"""Flare Spotter: Industrial Age support (docs/design-lane-ages.md A17.10). Flare (proj.flare), 200 lu,
~68 lu. Every hit marks the target (+20% damage taken) for 3 s; follows the front.

Look (A17.12, Industrial palette): a lanky forward observer in a coal bowler hat with a team band,
a team Norfolk jacket with a belt, iron-grey sleeves with a wide team armband on the near arm,
cream breeches with leather gaiters, a tidy moustache and a pair of big brass-rimmed binoculars
hanging on a strap across his chest. In his near hand a stubby flare pistol (fat aged-brass
barrel, wooden grip) held up by his shoulder, muzzle skyward. The far hand points out targets.
The attack ("flare arc") levels the pistol up at 40 degrees, holds, fires with a white-magenta
flash (the flare is white-magenta, never red, A17.12) and a smoke puff, kicks, then he throws his
far arm out to point at the marked target and settles. The projectile spawns at the per-frame
`muzzle` anchor; `binoculars` is exported for the mark reticle effect.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "flare_spotter"
NAME = "Flare Spotter"
HEIGHT_LU = 70
CANVAS = (272, 248)
FEET = (116, 226)
ANCHORS = {"head": (2, 69), "hitCenter": (0, 32), "muzzle": (18, 52)}

HR = (0.6, I.ARM_Y["r"] - 1.2, I.HAND_Z - 0.2)   # near fist
BARREL = 14.0


def build(rig):
    I.skeleton(rig)
    I.legs(rig, trousers=I.CREAM_DK, gaiter=I.LEATHER, thigh_r=4.8)
    I.jacket(rig, collar=I.COAL_LT)
    # Norfolk jacket pleats (darker team stripes are not allowed: use thin coal lines)
    g = Geo()
    for y in (-4.0, 4.0):
        g.blob((10.2, y, 28.0), (0.8, 0.9, 8.0), p=3.0)
    rig.part("torso", g, I.COAL_LT, outline=0)
    # binoculars on a strap across the chest
    g = Geo().capsule((8.0, -8.6, 36.0), (11.6, -3.0, 25.0), 0.8)
    g.capsule((8.0, 8.6, 36.0), (11.6, 3.0, 25.0), 0.8)
    rig.part("torso", g, I.LEATHER, outline=0.4)
    # binoculars in the far hand, modelled in front of the face (y near 0) so they read over it
    HL = (0.4, I.ARM_Y["l"], I.HAND_Z - 0.4)
    rig.joint("bino", "hand_l", HL)
    I.binoculars(rig, "bino", (HL[0] + 3.0, -1.0, HL[2] + 1.0), k=1.2)
    g = Geo().capsule((HL[0], HL[1] - 2.0, HL[2]), (HL[0] + 2.0, -1.0, HL[2] + 1.0), 1.6)
    rig.part("bino", g, I.SKIN, outline=0.4)
    rig.track("binoculars", "bino", (HL[0] + 3.0, -1.0, HL[2] + 1.0))

    I.head_ball(rig)
    I.face(rig, brow=I.HAIR, brow_angry=False)
    I.moustache(rig, I.HAIR, curl=True, big=0.9)
    I.back_hair(rig, I.HAIR)
    I.ear(rig)
    I.bowler(rig, c=(1.0, 0, 57.6))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=I.IRON_LT, team_sleeve=False, fist=4.3, cuff=I.COAL_LT)
    I.shoulders(rig)
    I.armband(rig, "r")
    I.armband(rig, "l")

    # flare pistol along +X from the near fist
    rig.joint("pistol", "hand_r", HR)
    x, y, z = HR
    g = Geo().capsule((x - 1.0, y, z - 4.4), (x + 1.2, y, z + 1.0), 2.0, 2.2)   # grip
    rig.part("pistol", g, I.WOOD_LT)
    g = Geo().lathe([(0, 0), (3.2, 0.2), (3.4, BARREL - 2.4), (4.4, BARREL - 1.2), (4.4, BARREL), (0, BARREL)],
                    (x + 0.5, y, z + 2.0), (x + 0.5 + BARREL, y, z + 2.0), segs=18)
    rig.part("pistol", g, I.BRASS, finish="metal")
    g = Geo().blob((x + 0.2, y, z + 2.4), (3.2, 2.6, 3.0), p=3.2)   # breech and hammer
    g.capsule((x - 2.0, y, z + 4.0), (x - 3.6, y, z + 6.0), 0.9)
    rig.part("pistol", g, I.IRON_DK, finish="metal", outline=0.6)
    g = Geo().blob((x + 0.5 + BARREL + 0.3, y, z + 2.0), (0.4, 2.4, 2.4), p=2.2)   # the loaded flare
    rig.part("pistol", g, I.FLARE, outline=0.4)
    muz = (x + 1.0 + BARREL, y, z + 2.0)
    rig.track("muzzle", "pistol", muz)
    rig.joint("flash", "pistol", muz, hidden=True)
    g = Geo()
    for dx, dz, r in ((6.0, 0, (7.0, 2.4, 3.6)), (4.0, 2.6, (4.6, 2.0, 2.0)), (4.0, -2.6, (4.6, 2.0, 2.0))):
        g.blob((muz[0] + dx, muz[1] - 1, muz[2] + dz), r, p=2.0,
               rot=(0, (-36 if dz > 0 else 36) if dz else 0, 0))
    rig.part("flash", g, glow=I.FLARE, outline=0)
    g = Geo().blob((muz[0] + 3.6, muz[1] - 2, muz[2]), (3.4, 1.8, 2.0), p=2.0)
    rig.part("flash", g, glow=I.FLARE_CORE, outline=0)
    I.smoke_puff(rig, "pistol", (muz[0] + 5.0, muz[1], muz[2] + 2.0), size=0.8)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


def near(a, f, w):
    return I.arm("r", a, f, w=w, w_rest=0.0)


def far(a, f, w=0.0):
    return I.arm("l", a, f, w=w, w_rest=0.0)


IDLE_R = (-62.0, -18.0, -22.0)   # pistol held low and forward
LOOK = (10.0, 60.0)              # far arm: binoculars up at the eyes
DOWN = (-95.0, -70.0)            # far arm: binoculars lowered


def _idle(f):
    c, lag = I.idle_wave(f)
    a, fo, w = IDLE_R
    return merge(I.idle_body(f), near(a + 2 * lag, fo + 3 * lag, w + 3 * lag),
                 far(LOOK[0] + 1.5 * lag, LOOK[1] + 2 * lag, -4.0 * lag))


def _walk(f):
    pose, p, bl = I.walk_legs(f, lean=-6.0)
    sw = math.cos(p)
    a, fo, w = IDLE_R
    return merge(pose, near(a + 14 * sw, fo + 8 * sw + 3 * bl, w + 8 * sw),
                 far(LOOK[0] + 2 * bl, LOOK[1] + 3 * bl, -3.0 * bl))


ATTACK_MS = [83, 83, 125, 83, 100, 125, 100, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 raise, 1 level up to 40 degrees, 2 held aim (squint), 3 FIRE (white-magenta flash),
    # 4 kick up, 5 point at the target with the far arm (held), 6-7 binoculars back up
    a = pick(f, [-30, 15, 30, 30, 42, 30, -10, -50])
    fo = pick(f, [0, 30, 38, 38, 52, 40, 10, -12])
    w = pick(f, [10, 34, 40, 40, 58, 46, 12, -16])
    la = pick(f, [0, -60, -90, -90, -90, 20, 12, 10])
    lf = pick(f, [20, -80, -80, -80, -80, 20, 50, 60])
    pose = merge(near(a, fo, w), far(la, lf), {
        "body": dict(squash(pick(f, [0.02, 0.03, 0.02, 0.05, -0.06, -0.03, 0.0, 0.0])),
                     x=pick(f, [0, 0, 0.5, 0.5, -2.0, 1.5, 0.5, 0])),
        "torso": {"r": pick(f, [-1, -4, -6, -6, 2, -4, -2, 0])},
        "head": {"r": pick(f, [2, 6, 8, 8, 12, 0, 0, 0])},
        "thigh_r": {"r": pick(f, [2, 6, 8, 8, 6, 12, 6, 2])},
        "thigh_l": {"r": pick(f, [-2, -6, -8, -8, -8, -12, -6, -2])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 0.9, 1.3, 1, 1]),
                  "z": pick(f, [0, 0, 0, 0, 0, 3, 0, 0])},
    })
    if f in (2, 3):
        I.squint(pose)
    if f == 5:
        I.yell(pose)
    return pose


def _hit(f):
    a, fo, w = IDLE_R
    k = [1.0, 0.55, 0.2][f]
    return merge(near(a + 14 * k, fo + 14 * k, w + 8 * k), far(DOWN[0] + 40 * k, DOWN[1] + 40 * k), I.hit_body(f))


def _die(f):
    pose = merge(near(pick(f, [30, 0, -20]), pick(f, [70, 30, 0]), pick(f, [120, 90, 60])),
                 I.arm("l", pick(f, [40, 10, -20]), pick(f, [80, 30, 0])), fx.die_pose(f), I.die_limbs(f))
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
