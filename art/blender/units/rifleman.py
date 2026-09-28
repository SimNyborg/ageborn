"""Rifleman: Modern Age ranged (DESIGN A5.5). Bullet (proj.bullet), 260 lu, ~68 lu.

Look (A11, Modern palette): a round steel helmet with a team band, khaki netting and a
chin strap; a team tunic with breast pockets and team sleeves; khaki webbing; olive
trousers, khaki puttees; an olive backpack with a khaki bedroll on top (a hump that sets
his silhouette apart from the Trench Raider). He carries a long bolt-action rifle with a
wooden stock and a sling, angled up across his chest. The attack shoulders the rifle,
aims (held, squint), fires level with a flash and a puff, kicks back, then works the bolt
(the near hand pulls it back and a brass casing flips out) and settles. The projectile
(proj.bullet) spawns at the exported per-frame `muzzle` anchor on the fire frame.
"""
from ageborn_art import fx
from ageborn_art import rigs_modern as M
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "rifleman"
NAME = "Rifleman"
HEIGHT_LU = 68
CANVAS = (300, 212)
FEET = (104, 192)
ANCHORS = {"head": (2, 67), "hitCenter": (0, 32), "muzzle": (60, 36)}

G0 = (4.0, -15.0, 27.0)     # rifle grip at rest (character space)
FORE = 12.0                 # far hand: this far along the rifle from the grip
LENGTH = 46.0
MUZZLE = (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 1.8)
BRASS = "#C8A560"


def build(rig):
    M.skeleton(rig)
    M.legs(rig)
    # backpack with a bedroll (behind the torso; drawn before the tunic)
    g = Geo().blob((-12.0, 0, 29.0), (5.6, 9.4, 9.4), p=3.2)
    rig.part("torso", g, team=True)
    g = Geo().blob((-15.4, -3.0, 26.0), (2.6, 4.2, 4.0), p=3.2)   # side pocket
    rig.part("torso", g, M.OLIVE, outline=0.6)
    g = Geo().capsule((-12.5, -9.8, 41.0), (-12.5, 9.8, 41.0), 4.2)
    rig.part("torso", g, M.KHAKI)
    g = Geo().lathe([(4.4, 0), (4.5, 1.4), (4.4, 2.2)], (-12.5, -4.0, 41.0), (-12.5, -1.0, 41.0), segs=14)
    rig.part("torso", g, M.LEATHER, outline=0.5)
    M.tunic(rig)
    g = Geo().capsule((2.0, -10.4, 37.0), (-8.0, -9.0, 22.0), 1.5)   # pack strap
    rig.part("torso", g, M.KHAKI, outline=0.6)

    M.head_ball(rig)
    M.face(rig, brow=M.HAIR, brow_angry=False)
    g = Geo().blob((-2.0, -11.2, 49.0), (2.6, 1.6, 3.4), p=2.2)   # ear
    rig.part("head", g, M.SKIN)
    M.helmet_round(rig, c=(1.0, 0, 55.0))

    for s in ("r", "l"):
        M.arm_parts(rig, s, fist=4.3)
    M.shoulders(rig)

    rig.joint("gun", "torso", G0)
    muzzle = M.rifle(rig, "gun", G0, length=LENGTH)
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4), (3.6, 3.0, 3.4), p=2.4)
    rig.part("gun", g, M.SKIN)
    rig.track("muzzle", "gun", muzzle)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    M.muzzle_flash(rig, "gun", muzzle, size=1.7)
    rig.joint("smoke", "gun", muzzle, hidden=True)
    g = Geo()
    for dx, dz, r in ((6.0, 1.0, 3.6), (10.0, 3.0, 3.0), (3.0, 4.0, 2.6)):
        g.sphere((muzzle[0] + dx, muzzle[1] - 2, muzzle[2] + dz), r, cuts=4)
    rig.part("smoke", g, M.SMOKE, finish="dust", outline=0.8)
    # ejected casing, flipping up out of the bolt
    rig.joint("casing", "gun", (G0[0] + 2, G0[1], G0[2] + 9), hidden=True)
    g = Geo().capsule((G0[0] + 0.5, G0[1] - 2, G0[2] + 9.5), (G0[0] + 3.5, G0[1] - 2, G0[2] + 11.0), 1.0)
    rig.part("casing", g, BRASS, finish="metal", outline=0.5)


# -- poses ---------------------------------------------------------------------------------
PORT = (6.0, 25.5, 32.0)   # grip x, z, rifle angle: carried up across the chest


def hold(gx, gz, deg):
    return M.hold2("gun", G0, FORE, gx, gz, deg)


def _idle(f):
    c, lag = M.idle_wave(f)
    return merge(M.idle_body(f), hold(PORT[0], PORT[1] + 0.5 * lag, PORT[2] + 2.0 * lag))


def _walk(f):
    pose, p, bl = M.walk_legs(f, lean=-7.0)
    return merge(pose, hold(PORT[0], PORT[1] + 0.8 * bl, PORT[2] - 3.0 * bl))


ATTACK_MS = [83, 83, 125, 83, 83, 83, 83, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 raise, 1 shoulder, 2 aim (held, squint), 3 FIRE (flash), 4 kick (up, squash),
    # 5 bolt back (casing), 6 bolt home, 7 settle back to the carry
    gx = pick(f, [5.5, 5.0, 5.0, 5.0, 2.5, 3.0, 3.5, 5.5])
    gz = pick(f, [29.0, 32.0, 32.5, 32.5, 34.0, 31.0, 31.5, 28.0])
    deg = pick(f, [16.0, 3.0, 0.0, 0.0, 14.0, -6.0, -2.0, 24.0])
    pose = merge(hold(gx, gz, deg), {
        "body": dict(squash(pick(f, [0, -0.03, -0.05, 0.03, -0.1, -0.04, -0.02, 0])),
                     x=pick(f, [0, 0.5, 1.0, 0.0, -3.0, -1.5, -1.0, -0.5])),
        "torso": {"r": pick(f, [-2, -3, -4, -4, 5, 0, -1, 0])},
        "head": {"r": pick(f, [-2, -6, -9, -8, 4, -3, -3, 0]),
                 "x": pick(f, [0, 0.8, 1.2, 1.2, 0, 0.6, 0.6, 0])},
        "thigh_r": {"r": pick(f, [4, 10, 12, 12, 8, 8, 6, 2])},
        "shin_r": {"r": pick(f, [0, -4, -6, -6, -4, -4, -2, 0])},
        "thigh_l": {"r": pick(f, [-4, -10, -12, -14, -14, -12, -10, -4])},
        "flash": {"show": f == 3},
        "smoke": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 0.9, 1.25, 1, 1]),
                  "x": pick(f, [0, 0, 0, 0, 0, 3, 0, 0]), "z": pick(f, [0, 0, 0, 0, 0, 2, 0, 0])},
        "casing": {"show": f in (5, 6), "x": pick(f, [0, 0, 0, 0, 0, -2, -6, 0]),
                   "z": pick(f, [0, 0, 0, 0, 0, 3, 7, 0]), "r": pick(f, [0, 0, 0, 0, 0, 60, 160, 0])},
    })
    if f in (5, 6):   # the near hand works the bolt: pulled back to the bolt knob
        import math
        rad = math.radians(deg)
        bx = gx + 2.0 * math.cos(rad) - (3.5 if f == 5 else 0.5)
        bz = gz + 2.0 * math.sin(rad) + 3.0
        a, fo = M.ik2(M.SH, (bx, bz))
        pose.update(M.arm("r", a, fo))
    if f in (2, 3):
        M.squint(pose)
    return pose


def _hit(f):
    return merge(hold(PORT[0], PORT[1], PORT[2] + [14, 8, 3][f]), M.hit_body(f))


def _die(f):
    pose = merge(hold(PORT[0], PORT[1], PORT[2] + pick(f, [34, 24, 24])), fx.die_pose(f),
                 M.die_limbs(f))
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
