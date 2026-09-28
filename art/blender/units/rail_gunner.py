"""Rail Gunner: Future Age anti-armour ranged (DESIGN A5.6). Instant rail (fx.beam_rail, laser
damage), pierces; ~74 lu, medium.

Look (A11, Future palette): heavier than the pulse trooper so the two read apart. A broad
white-armoured gunner with a big team shoulder pauldron, a team chest plate, a flat-topped
helmet with a team cap and a magenta scope monocle over the near eye, and a tall capacitor
pack on his back cabled to an oversized twin-rail cannon held at the hip. The rails are two
long white prongs with a magenta channel between them, three team coil rings round the
breech. The attack is a heavy shot: shoulder, brace low, the rails charge with magenta arcs
(held), the fire frame has a long white-magenta flash and a shock ring, a big recoil pushes
him back, the rails vent steam, and he settles. The rail beam starts at the per-frame
`muzzle` anchor of the fire frame.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "rail_gunner"
NAME = "Rail Gunner"
HEIGHT_LU = 74
CANVAS = (330, 236)
FEET = (104, 214)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 34)}

G0 = (2.0, -15.5, 25.0)     # grip at rest (character space); the gun is a torso child
FORE = 17.0                 # far hand: this far along the gun from the grip
RAIL0, RAIL1 = 20.0, 58.0   # rails from/to (x from the grip)
MUZZLE = (G0[0] + RAIL1 + 1.0, G0[1], G0[2] + 3.0)


def build(rig):
    F.skeleton(rig, head=(1, 0, 39))
    F.legs(rig, thigh_r=4.9)
    rig.joint("gun", "torso", G0)
    gx, gy, gz = G0

    # capacitor pack (behind the torso): a tall charcoal cylinder with a magenta window and
    # a team side panel
    g = Geo().capsule((-13.5, 0.5, 21.0), (-15.0, 0.5, 46.0), 6.2, 5.6)
    rig.part("torso", g, F.SUIT)
    g = Geo().blob((-13.8, -4.8, 33.0), (4.6, 1.6, 8.6), p=3.2)
    rig.part("torso", g, team=True, outline=0.6)
    g = Geo().capsule((-19.6, -1.0, 27.0), (-20.5, -1.0, 42.0), 1.6)
    rig.part("torso", g, glow=F.MAGENTA, outline=1.0, outline_hex=F.SUIT)
    g = Geo().blob((-15.0, 0.5, 47.5), (5.0, 5.0, 2.0), p=2.6)
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)

    F.torso_armor(rig, pack=False, bulk=1.08)
    g = Geo().blob((1.0, 0, 38.2), (8.8, 9.0, 2.6), p=2.6)     # white gorget
    rig.part("torso", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((0.6, 0, 16.8), (10.8, 10.6, 4.4), p=2.8, taper=(1.1, 1.0))
    g.clip((0, 0, 12.6), (0, 0, -1))
    rig.part("hips", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)

    # helmet: white, flat-topped with a team cap, dark visor, mint eyes, magenta scope
    g = Geo().blob((2.0, 0, 51.0), (11.8, 11.4, 11.4), p=2.8)
    g.blob((1.5, 0, 42.4), (7.6, 7.6, 3.2), p=2.4)
    rig.part("head", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((1.0, 0, 55.5), (12.4, 12.0, 7.6), p=3.2)
    g.clip((0, 0, 54.0), (0, 0, -1))
    g.clip((9.2, 0, 57.0), (1, 0, -0.5))
    rig.part("head", g, team=True)
    g = Geo().blob((10.2, 0, 49.8), (4.2, 9.0, 4.4), p=3.4)
    rig.part("head", g, F.VISOR_DARK, finish="gloss", outline_hex=F.SUIT)
    F.visor_eyes(rig, cx=13.8, cz=50.2, dy=(-3.8, 2.6), size=(1.1, 1.6, 2.2))
    rig.joint("scope", "head", (4.0, -12.0, 51.0))
    g = Geo().capsule((-2.0, -12.0, 51.0), (9.0, -11.0, 50.6), 1.4)
    rig.part("scope", g, F.SUIT, outline=0.7)
    g = Geo().lathe([(0, 0), (3.2, 0.2), (3.4, 3.2), (0, 3.4)], (10.0, -9.0, 50.2), (13.4, -8.0, 50.2), segs=16)
    rig.part("scope", g, F.SUIT, finish="gloss")
    g = Geo().lathe([(0, 0), (2.2, 0.2), (2.0, 0.8), (0, 1.0)], (13.2, -8.0, 50.2), (14.2, -7.7, 50.2), segs=16)
    rig.part("scope", g, glow=F.MAGENTA, outline=0)

    for s in ("r", "l"):
        F.arm_parts(rig, s, r0=4.4, r1=3.9, fist=4.4)
    # a big team pauldron on the near shoulder, a smaller one on the far
    g = Geo().blob((0.2, -13.4, 38.6), (8.0, 6.6, 6.4), p=2.6)
    g.blob((0.8, -14.2, 34.2), (6.4, 5.4, 2.6), p=2.6)
    rig.part("arm_r", g, team=True)
    g = Geo().blob((0.5, 11.6, 38.0), (6.2, 5.4, 5.0), p=2.6)
    rig.part("arm_l", g, team=True)

    # the rail cannon along +X from the grip
    g = Geo().blob((gx + 6.0, gy + 1.0, gz + 2.0), (13.0, 3.8, 5.0), p=3.6)          # receiver
    g.blob((gx - 7.0, gy + 1.0, gz + 1.0), (6.0, 3.0, 4.2), p=3.4, rot=(0, 12, 0))  # stock
    g.blob((gx + 0.5, gy + 1.0, gz - 2.6), (2.2, 2.0, 4.0), p=2.8, rot=(0, -12, 0))  # grip
    g.blob((gx + FORE, gy + 2.0, gz - 2.0), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))  # foregrip
    rig.part("gun", g, F.SUIT, finish="gloss")
    g = Geo().blob((gx + 8.0, gy + 1.0, gz + 7.2), (10.0, 3.0, 2.2), p=3.4)          # top shroud
    rig.part("gun", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo()
    for x in (gx + 10.5, gx + 14.0, gx + 17.5):
        g.lathe([(0, -0.9), (5.6, -0.8), (5.6, 0.8), (0, 0.9)], (x, gy + 1.0, gz + 2.0),
                (x + 1, gy + 1.0, gz + 2.0), segs=18)
    rig.part("gun", g, team=True, outline=0.7)
    # twin rails: white prongs with dark inner faces and a magenta channel between them
    for dz, h in ((7.4, 2.2), (-1.4, 2.0)):
        g = Geo().blob((gx + (RAIL0 + RAIL1) / 2, gy + 1.0, gz + dz), ((RAIL1 - RAIL0) / 2 + 1, 2.8, h),
                       p=3.4, taper=(1.0, 1.0))
        rig.part("gun", g, F.ARMOR, finish="gloss", outline_hex=F.TRIM)
    g = Geo().blob((gx + (RAIL0 + RAIL1) / 2 - 1, gy + 0.4, gz + 3.0), ((RAIL1 - RAIL0) / 2, 1.8, 1.6), p=3.0)
    rig.part("gun", g, glow=F.MAGENTA, outline=0.8, outline_hex=F.SUIT)
    g = Geo().blob((gx + RAIL1 - 2.0, gy + 1.0, gz + 9.6), (1.4, 1.2, 1.6), p=2.4)   # front sight
    g.blob((gx + 3.0, gy + 1.0, gz + 10.4), (3.2, 1.6, 1.8), p=3.0)                  # rear scope
    rig.part("gun", g, F.SUIT, outline=0.7)
    g = Geo().blob((gx + 6.4, gy + 0.4, gz + 10.4), (0.6, 1.2, 1.2), p=2.4)
    rig.part("gun", g, glow=F.CYAN, outline=0)
    # a cable from the pack to the breech
    g = Geo()
    pts = [(-17.0, 24.0), (-12.0, 17.0), (-4.0, 16.5), (gx - 2.0, gz - 3.0)]
    for (ax, az), (bx, bz) in zip(pts, pts[1:]):
        g.capsule((ax, -8.0, az), (bx, gy + 3.0, bz), 1.2, segs=8, rings=2)
    rig.part("torso", g, F.GUNMETAL, outline=0.6)
    rig.track("muzzle", "gun", MUZZLE)
    rig.track("_foot", "shin_r", (3.0, -6.0, 0.5))

    # charge arcs between the rails (two sizes), the fire flash with a shock ring, vent steam
    mx, my, mz = MUZZLE
    for name, k in (("arc_a", 0.9), ("arc_b", 1.5)):
        rig.joint(name, "gun", (gx + 40.0, gy, gz + 3.0), hidden=True)
        g = Geo()
        xs = [gx + RAIL0 + 3 + i * 7.0 for i in range(6)]
        for i, x in enumerate(xs):
            s = 1 if i % 2 else -1
            g.capsule((x, gy - 3.5, gz + 3.0 + 4.5 * k * s), (x + 3.5, gy - 3.5, gz + 3.0 - 4.0 * k * s), 0.9 * k + 0.3,
                      segs=8, rings=2)
        rig.part(name, g, glow=F.MAGENTA_CORE, outline=1.0, outline_hex=F.MAGENTA)
        g = Geo().sphere((mx - 1.0, my - 3.5, mz), 3.4 * k + 0.8, cuts=4)
        rig.part(name, g, glow=F.MAGENTA_CORE, outline=1.2, outline_hex=F.MAGENTA)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().blob((mx + 22.0, my - 1.0, mz), (24.0, 1.6, 5.4), p=2.0)
    g.blob((mx + 7.0, my - 1.0, mz + 5.6), (9.0, 1.4, 2.2), p=2.0, rot=(0, -30, 0))
    g.blob((mx + 7.0, my - 1.0, mz - 5.6), (9.0, 1.4, 2.2), p=2.0, rot=(0, 30, 0))
    rig.part("flash", g, glow=F.MAGENTA, outline=0)
    g = Geo().blob((mx + 18.0, my - 2.0, mz), (19.0, 1.4, 2.6), p=2.0)
    rig.part("flash", g, glow=F.WHITE, outline=0)
    g = Geo().lathe([(9.0, -1.0), (11.0, 0), (9.0, 1.0), (7.6, 0)], (mx + 3.0, my, mz), (mx + 4.0, my, mz), segs=22)
    rig.part("flash", g, glow=F.MAGENTA_CORE, outline=1.0, outline_hex=F.MAGENTA)
    F.puff(rig, "gun", (gx + 36.0, gy, gz + 10.0), size=1.1, name="vent", spread=1.6)


# -- poses ---------------------------------------------------------------------------------
PORT = (6.5, 23.5, -3.0)   # grip x, z, gun angle: held low at the hip


def hold(gx, gz, deg):
    return F.hold2("gun", G0, FORE, gx, gz, deg)


def _idle(f):
    c, lag = F.idle_wave(f)
    return merge(F.idle_body(f, bob=1.2), hold(PORT[0], PORT[1] + 0.6 * lag, PORT[2] + 1.8 * lag))


def _walk(f):
    pose, p, bl = F.walk_legs(f, lean=-6.0, stride=28.0)
    return merge(pose, hold(PORT[0], PORT[1] + 0.9 * bl, PORT[2] - 2.5 * bl))


ATTACK_MS = [83, 83, 125, 125, 83, 125, 83, 125]
ATTACK_IMPACT = 4


def _attack(f):
    # 0 shoulder, 1 brace low, 2-3 charge (arcs, held), 4 FIRE (level, flash),
    # 5 recoil (kick back and up, squash), 6 vent steam, 7 settle back to the hip
    gx = pick(f, [7.0, 7.5, 7.5, 7.5, 7.5, 1.5, 3.5, 6.0])
    gz = pick(f, [27.0, 28.0, 28.0, 28.0, 28.0, 30.5, 28.5, 25.0])
    deg = pick(f, [4.0, 0.0, 0.0, 0.0, 0.0, 16.0, 6.0, 0.0])
    pose = merge(hold(gx, gz, deg), {
        "body": dict(squash(pick(f, [0, -0.05, -0.06, -0.07, 0.03, -0.1, -0.05, -0.01])),
                     x=pick(f, [0, 0.5, 1.0, 1.0, 0.5, -5.0, -3.5, -1.5])),
        "hips": {"z": pick(f, [0, -2.0, -2.4, -2.6, -2.2, -3.0, -2.0, -0.6])},
        "torso": {"r": pick(f, [-2, -4, -5, -5, -4, 6, 2, 0])},
        "head": {"r": pick(f, [-2, -5, -7, -7, -6, 5, 1, 0]),
                 "x": pick(f, [0, 0.8, 1.0, 1.0, 1.0, 0, 0.4, 0])},
        "thigh_r": {"r": pick(f, [4, 14, 16, 16, 16, 12, 10, 4])},
        "shin_r": {"r": pick(f, [0, -12, -14, -14, -14, -10, -8, -2])},
        "thigh_l": {"r": pick(f, [-4, -14, -16, -16, -18, -18, -14, -6])},
        "shin_l": {"r": pick(f, [0, -6, -8, -8, -8, -6, -4, 0])},
        "arc_a": {"show": f == 2},
        "arc_b": {"show": f == 3},
        "flash": {"show": f == 4},
        "vent": {"show": f in (5, 6), "s": pick(f, [1, 1, 1, 1, 1, 0.8, 1.2, 1]),
                 "z": pick(f, [0, 0, 0, 0, 0, 0, 3, 0])},
    })
    if f in (2, 3, 4):
        F.squint(pose)
    return pose


def _hit(f):
    return merge(hold(PORT[0], PORT[1], PORT[2] + [14, 8, 3][f]), F.hit_body(f))


def _die(f):
    pose = merge(hold(PORT[0], PORT[1], PORT[2] + pick(f, [34, 24, 24])), fx.die_pose(f),
                 F.die_limbs(f))
    if f in (0, 1):
        F.ko(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
