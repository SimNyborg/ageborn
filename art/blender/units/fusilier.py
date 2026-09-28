"""Fusilier: Gunpowder Age ranged (DESIGN A5.4). Musket (proj.musket), 240 lu, ~70 lu.

Look (A11, Gunpowder palette): a line infantryman in a team long coat with cream facings
(cuffs, turnbacks), cream crossbelts over a cream waistcoat, cream breeches, black gaiters,
and a black tricorne with a cream braid and a team cockade. He carries an oversized
flintlock with a bayonet at port arms (diagonal, so the tall silhouette reads 'musket' at
56 px). The attack shoulders the musket, aims level with a held sight, fires with a big
flash and a burst of powder smoke, kicks back and lets the smoke drift. The projectile
(proj.musket) spawns at the exported per-frame `muzzle` anchor on the fire frame.
"""
from ageborn_art import fx
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "fusilier"
NAME = "Fusilier"
HEIGHT_LU = 70
CANVAS = (304, 236)
FEET = (104, 214)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32), "muzzle": (62, 35)}

HAIR = "#5A4B40"
GAITER = B.BLACK
SHOE = "#2F2B2B"

ARM_Y = {"r": -12.5, "l": 10.5}
SH = (0.0, B.SHOULDER_Z)            # shoulder in torso space (x, z)
G0 = (4.0, -14.5, 27.0)              # musket grip at rest (character space)
FORE = 12.0                          # far hand: this far along the musket from the grip
LENGTH, BAYONET = 50.0, 13.0
MUZZLE = (G0[0] + LENGTH + 1.0, G0[1], G0[2] + 1.6)


def build(rig):
    B.skeleton(rig, arm_y=ARM_Y)
    B.legs(rig, B.CREAM, SHOE, stocking=GAITER, boot_finish="gloss")

    # torso: team coat, cream waistcoat front, cream crossbelts, brass buttons, black stock
    g = Geo().blob((0, 0, 28.0), (10.6, 9.8, 11.8), p=2.4, taper=(1.08, 0.94))
    g.blob((0, 0, 18.0), (10.2, 9.6, 4.6), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((5.0, -1.0, 27.5), (6.6, 4.6, 9.0), p=2.6, taper=(1.05, 0.7))
    g.clip((7.6, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM)
    g = Geo().capsule((1.0, -10.2, 37.0), (10.4, 0.0, 22.0), 1.7).capsule((10.4, 0.0, 22.0), (2.0, 9.6, 18.5), 1.7)
    rig.part("torso", g, B.CREAM, outline=0.8)
    g = Geo()
    for z in (32.0, 27.5, 23.0):
        g.sphere((11.4, -2.4, z), 1.05, cuts=3)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob((10.8, -2.6, 20.2), (2.6, 3.2, 2.4), p=3.0)  # cartridge box buckle
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.6)
    g = Geo().blob((1.2, 0, 37.2), (6.8, 7.2, 2.4), p=2.4)     # black neck stock
    rig.part("torso", g, B.BLACK)
    # coat skirts over the thighs (front flaps), team
    g = Geo().blob((0.5, 0, 15.5), (11.8, 10.8, 7.2), p=2.6, taper=(1.12, 1.0))
    g.clip((0, 0, 9.4), (0, 0, -1))
    rig.part("hips", g, team=True)    # coat tails with cream turnbacks, swinging behind the legs
    rig.secondary("tails", "hips", (-4.0, 0, 18.0), (-7.5, 0, 6.0), max_deg=12, gain=0.9)
    g = Geo().blob((-5.2, 0, 12.0), (5.2, 10.0, 7.8), p=2.6, taper=(0.7, 1.0), rot=(0, 10, 0))
    rig.part("tails", g, team=True)
    g = Geo().blob((-6.5, 0, 9.0), (3.8, 10.6, 4.4), p=2.6, rot=(0, 10, 0))
    rig.part("tails", g, B.CREAM)

    # head: big, powdered-brown hair with a queue at the back, tricorne
    B.head_ball(rig, center=(2, 0, 48.5), nose=(13.6, -0.6, 47.2))
    B.face(rig, cx=12.4, cz=49.8, brow=HAIR, eye_r=(3.3, 3.1, 4.0))
    g = Geo().blob((-6.4, 0, 48.0), (6.0, 10.2, 7.6), p=2.2)
    g.blob((-3.0, -10.4, 45.5), (3.2, 1.8, 4.4), p=2.2)   # side curl
    rig.part("head", g, HAIR, finish="hair")
    rig.secondary("queue", "head", (-10.0, 0, 46.0), (-13.0, 0, 37.0), max_deg=14, gain=1.0)
    g = Geo().capsule((-10.5, 0, 45.5), (-13.0, 0, 38.0), 2.2, 1.6)
    rig.part("queue", g, HAIR, finish="hair")
    g = Geo().blob((-11.2, 0, 43.0), (1.6, 2.6, 1.4), p=2.4)
    rig.part("queue", g, B.BLACK, outline=0.6)
    B.tricorn(rig, c=(1.0, 0, 58.5), team_cockade=True, scale=1.15)

    # arms: team sleeves, cream cuffs
    for s in ("r", "l"):
        B.arm_parts(rig, s, team_sleeve=True, cuff=B.CREAM, arm_y=ARM_Y)
    for s, y in (("r", -12.4), ("l", 10.4)):
        g = Geo().blob((0, y, 37.0), (5.6, 5.0, 4.2), p=2.4)  # shoulder
        rig.part(f"arm_{s}", g, team=True)

    # musket on its own joint under the torso; the far hand is part of the musket
    rig.joint("gun", "torso", G0)
    muzzle = B.musket(rig, "gun", G0, length=LENGTH, bayonet=BAYONET)
    g = Geo().blob((G0[0] + FORE, G0[1] + 2.4, G0[2] - 0.4), (3.6, 3.0, 3.4), p=2.4)
    rig.part("gun", g, B.SKIN)
    rig.track("muzzle", "gun", muzzle)
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))
    B.muzzle_flash(rig, "gun", muzzle, size=1.7)
    # the pan flash (a little puff at the lock) and the drifting smoke cloud
    rig.joint("pan", "gun", (G0[0] + 3.0, G0[1], G0[2] + 3.5), hidden=True)
    g = Geo().sphere((G0[0] + 3.0, G0[1] - 1.5, G0[2] + 5.0), 2.4, cuts=3)
    rig.part("pan", g, glow=B.FLASH, outline=0.6, outline_hex=B.FIRE)
    rig.joint("smoke", "root", (MUZZLE[0] + 8, -16, 35), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 6.0), (7.0, 2.0, 5.0), (-5.0, 4.5, 4.6), (3.0, 7.0, 4.2),
                      (12.0, -1.0, 3.6), (-9.0, 0.5, 3.4)):
        g.sphere((MUZZLE[0] + 8 + dx, -16, 35 + dz), r, cuts=4)
    rig.part("smoke", g, B.SMOKE, finish="dust", outline=0.8)


# -- poses ---------------------------------------------------------------------------------
def hold(gx, gz, deg, torso_r=0.0):
    """Musket grip at (gx, gz) in torso space pointing `deg`; both arms solved to hold it."""
    import math
    pose = {"gun": {"x": gx - G0[0], "z": gz - G0[2], "r": deg}}
    a, f = B.ik2(SH, (gx - 0.4, gz + 0.4))
    pose.update(B.arm("r", a, f))
    fx_, fz = gx + FORE * math.cos(math.radians(deg)), gz + FORE * math.sin(math.radians(deg))
    a, f = B.ik2(SH, (fx_ - 1.0, fz - 1.0))
    pose.update(B.arm("l", a, f))
    return pose


PORT = (6.0, 25.0, 48.0)   # grip x, z, musket angle: port arms, bayonet up


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(B.idle_body(f), hold(PORT[0], PORT[1] + 0.5 * lag, PORT[2] + 1.5 * lag))


def _walk(f):
    pose, p, bl = B.walk_legs(f, lean=-6.0)
    return merge(pose, hold(PORT[0], PORT[1] + 0.6 * bl, PORT[2] - 2.0 * bl))


ATTACK_MS = [83, 83, 125, 83, 83, 83, 125, 125]
ATTACK_IMPACT = 4


def _attack(f):
    # 0 bring down, 1 shoulder, 2 aim (held, head down on the sight), 3 pan flash,
    # 4 FIRE (flash, squint), 5 kick (gun up and back, squash), 6 smoke drifts, 7 recover
    gx = pick(f, [6.0, 5.0, 5.0, 5.0, 5.0, 2.5, 3.5, 5.5])
    gz = pick(f, [28.0, 31.5, 32.0, 32.0, 32.0, 33.5, 32.5, 29.0])
    deg = pick(f, [26.0, 6.0, 1.0, 1.0, 0.0, 16.0, 8.0, 34.0])
    pose = merge(hold(gx, gz, deg), {
        "body": dict(squash(pick(f, [0, -0.03, -0.05, -0.05, 0.03, -0.1, -0.04, 0])),
                     x=pick(f, [0, 0.5, 1.0, 1.0, 0.0, -3.0, -2.0, -0.5])),
        "torso": {"r": pick(f, [-2, -3, -4, -4, -4, 5, 2, 0])},
        "head": {"r": pick(f, [-2, -6, -9, -9, -8, 4, 0, 0]), "x": pick(f, [0, 0.8, 1.2, 1.2, 1.2, 0, 0, 0])},
        "thigh_r": {"r": pick(f, [4, 10, 12, 12, 12, 8, 6, 2])},
        "shin_r": {"r": pick(f, [0, -4, -6, -6, -6, -4, -2, 0])},
        "thigh_l": {"r": pick(f, [-4, -10, -12, -12, -14, -14, -10, -4])},
        "pan": {"show": f == 3},
        "flash": {"show": f == 4},
        "smoke": {"show": f in (5, 6), "s": pick(f, [1, 1, 1, 1, 1, 0.8, 1.15, 1]),
                  "x": pick(f, [0, 0, 0, 0, 0, 0, 4, 0]), "z": pick(f, [0, 0, 0, 0, 0, 0, 3, 0])},
    })
    if f == 4:
        pose["head"]["sz"] = 0.97
    return pose


def _hit(f):
    return merge(hold(PORT[0], PORT[1], PORT[2] + [14, 8, 3][f]), B.hit_body(f))


def _die(f):
    pose = merge(hold(PORT[0], PORT[1], PORT[2] + pick(f, [30, 20, 20])), fx.die_pose(f),
                 B.die_limbs(f))
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
