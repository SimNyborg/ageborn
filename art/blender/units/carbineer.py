"""Carbineer: Industrial Age ranged (docs/design-lane-ages.md A17.10). Bullet (proj.bullet), 250 lu,
~68 lu.

Look (A17.12, Industrial palette): a frontier-style rifleman in a very wide-brimmed coal slouch hat
(the brim dips at the front and back) with a team band, a long team duster coat down to the shins
(lapels, brass buttons, a leather belt, long coat tails that swing behind him on follow-through), iron-blue trousers tucked into tall boots, a dark moustache and a
cartridge bandolier across the chest. He carries a short lever-action carbine (brass receiver,
wooden stock, big lever loop) diagonally across his chest at port arms. The attack shoulders the carbine, aims (held, squint),
fires level with a flash and a puff, kicks up, then works the lever ("lever cock": the loop swings
down and a brass casing flips out) and settles. The projectile spawns at the per-frame `muzzle`
anchor on the fire frame.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "carbineer"
NAME = "Carbineer"
HEIGHT_LU = 68
CANVAS = (290, 222)
FEET = (104, 198)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32), "muzzle": (54, 36)}

G0 = (4.0, -15.0, 27.0)     # carbine grip at rest (character space)
FORE = 12.0
LENGTH = 38.0


def build(rig):
    I.skeleton(rig)
    I.legs(rig, trousers=I.DENIM, gaiter=I.LEATHER_DK)
    I.long_coat(rig, tail_len=21.0, long=True)
    # bandolier across the chest (leather with brass cartridge tips)
    g = Geo().capsule((10.4, -7.0, 36.0), (8.0, 8.0, 19.0), 1.7)
    rig.part("torso", g, I.LEATHER, outline=0.6)
    g = Geo()
    for t in (0.2, 0.4, 0.6, 0.8):
        g.blob((10.4 - 2.4 * t + 0.8, -7.0 + 15.0 * t, 36.0 - 17.0 * t), (0.8, 1.0, 1.4), p=2.6)
    rig.part("torso", g, I.BRASS_LT, finish="metal", outline=0)

    I.head_ball(rig)
    I.face(rig, brow=I.HAIR, brow_angry=False)
    I.moustache(rig, I.HAIR, curl=True)
    I.back_hair(rig, I.HAIR)
    I.ear(rig)
    I.slouch_hat(rig, c=(1.0, 0, 57.8))

    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, fist=4.3, cuff=I.COAL_LT)
    I.shoulders(rig)

    rig.joint("gun", "torso", G0)
    muzzle = I.lever_carbine(rig, "gun", G0, length=LENGTH)
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.2), (3.6, 3.0, 3.4), p=2.4)
    rig.part("gun", g, I.SKIN)
    rig.track("muzzle", "gun", muzzle)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    I.muzzle_flash(rig, "gun", muzzle, size=1.6)
    rig.joint("smoke", "gun", muzzle, hidden=True)
    g = Geo()
    for dx, dz, r in ((6.0, 1.0, 3.6), (10.0, 3.0, 3.0), (3.0, 4.0, 2.6)):
        g.sphere((muzzle[0] + dx, muzzle[1] - 2, muzzle[2] + dz), r, cuts=4)
    rig.part("smoke", g, I.SMOKE, finish="dust", outline=0.8)
    rig.joint("casing", "gun", (G0[0] + 2, G0[1], G0[2] + 6), hidden=True)
    g = Geo().capsule((G0[0] + 0.5, G0[1] - 2, G0[2] + 6.5), (G0[0] + 3.5, G0[1] - 2, G0[2] + 8.0), 1.0)
    rig.part("casing", g, I.BRASS_LT, finish="metal", outline=0.5)


PORT = (4.0, 27.0, 52.0)     # port arms: the carbine held diagonally across the chest


def hold(gx, gz, deg):
    return I.hold2("gun", G0, FORE, gx, gz, deg)


def _idle(f):
    c, lag = I.idle_wave(f)
    return merge(I.idle_body(f), hold(PORT[0], PORT[1] + 0.5 * lag, PORT[2] + 2.0 * lag))


def _walk(f):
    pose, p, bl = I.walk_legs(f, lean=-7.0)
    return merge(pose, hold(PORT[0], PORT[1] + 0.8 * bl, PORT[2] - 3.0 * bl))


ATTACK_MS = [83, 83, 125, 83, 83, 100, 83, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 raise, 1 shoulder, 2 aim (held, squint), 3 FIRE, 4 kick, 5 lever down (casing),
    # 6 lever home, 7 settle back to port arms
    gx = pick(f, [5.5, 5.0, 5.0, 5.0, 2.5, 4.0, 4.5, 5.5])
    gz = pick(f, [29.0, 32.0, 32.5, 32.5, 34.0, 30.0, 31.0, 27.0])
    deg = pick(f, [16.0, 3.0, 0.0, 0.0, 14.0, -4.0, 0.0, 26.0])
    pose = merge(hold(gx, gz, deg), {
        "body": dict(squash(pick(f, [0, -0.03, -0.05, 0.03, -0.1, -0.04, -0.02, 0])),
                     x=pick(f, [0, 0.5, 1.0, 0.0, -3.0, -1.5, -1.0, -0.5])),
        "torso": {"r": pick(f, [-2, -3, -4, -4, 5, 0, -1, 0])},
        "head": {"r": pick(f, [-2, -6, -9, -8, 4, -3, -3, 0]),
                 "x": pick(f, [0, 0.8, 1.2, 1.2, 0, 0.6, 0.6, 0])},
        "thigh_r": {"r": pick(f, [4, 10, 12, 12, 8, 8, 6, 2])},
        "shin_r": {"r": pick(f, [0, -4, -6, -6, -4, -4, -2, 0])},
        "thigh_l": {"r": pick(f, [-4, -10, -12, -14, -14, -12, -10, -4])},
        "lever": {"r": pick(f, [0, 0, 0, 0, 0, 48, 12, 0])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 0.9, 1.25, 1, 1]),
                  "x": pick(f, [0, 0, 0, 0, 0, 3, 0, 0]), "z": pick(f, [0, 0, 0, 0, 0, 2, 0, 0])},
        "casing": {"show": f in (5, 6), "x": pick(f, [0, 0, 0, 0, 0, -2, -6, 0]),
                   "z": pick(f, [0, 0, 0, 0, 0, 3, 8, 0]), "r": pick(f, [0, 0, 0, 0, 0, 60, 170, 0])},
    })
    if f in (5, 6):   # the near hand rides the lever loop down and back
        rad = math.radians(deg)
        drop = 5.5 if f == 5 else 2.0
        bx = gx + 2.0 * math.cos(rad) + drop * 0.6
        bz = gz - 5.0 - drop
        a, fo = I.ik2(I.SH, (bx, bz))
        pose.update(I.arm("r", a, fo))
    if f in (2, 3):
        I.squint(pose)
    return pose


def _hit(f):
    return merge(hold(PORT[0], PORT[1], PORT[2] + [14, 8, 3][f]), I.hit_body(f))


def _die(f):
    pose = merge(hold(PORT[0], PORT[1], PORT[2] + pick(f, [34, 24, 24])), fx.die_pose(f), I.die_limbs(f))
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
