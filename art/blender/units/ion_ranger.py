"""Ion Ranger: Cosmic Age ranged (docs/design-lane-ages.md A17.11). Ion bolt (proj.ion) that arcs to
one more enemy, laser damage, ~70 lu.

Look (A17.12, Cosmic palette): a lean sharpshooter in a void undersuit with violet armour, a
tall pointed team hood with a violet lining over a dark cowl face with one big glowing violet
mono-lens (no Future visor bar), and a short antenna with a violet tip. Team
chest plate and shoulder pads, a violet backpack cell. The long ion rifle (the reach cue) is a
void and star-white stock and shroud with four glowing mint coil rings along the barrel and a
forked emitter at the muzzle. The attack is the coil charge-up: the rings brighten back to
front (their glow grows), a mint charge ball swells between the emitter forks, the rifle fires
level with a star flash and kicks, and the coils vent a pale puff. The bolt spawns at the
exported per-frame `muzzle` anchor.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "ion_ranger"
NAME = "Ion Ranger"
HEIGHT_LU = 70
CANVAS = (330, 224)
FEET = (104, 204)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}

GX, GY, GZ = 5, -11, 30      # the rifle's grip (gun joint)
L = 56.0                     # rifle length from the grip to the emitter tip
MUZZLE = (GX + L + 3.0, GY + 1, GZ + 3.5)
COILS = (18.0, 25.0, 32.0, 39.0)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, 16))
    rig.joint("torso", "hips", (0, 0, 18))
    rig.joint("head", "torso", (1, 0, 40))
    for side, y in (("r", -5.8), ("l", 5.8)):
        rig.joint(f"thigh_{side}", "hips", (0, y, 16))
        rig.joint(f"shin_{side}", f"thigh_{side}", (0.5, y, 9.5))
    for side, y in (("r", -5.8), ("l", 5.8)):
        g = Geo().capsule((0, y, 16), (0.5, y, 9.5), 4.3, 3.8)
        rig.part(f"thigh_{side}", g, K.VOID)
        g = Geo().capsule((0.5, y, 9.5), (1.0, y, 5.0), 3.7, 3.5)
        rig.part(f"shin_{side}", g, K.VOID)
        g = Geo().blob((2.8, y, 3.2), (7.0, 4.8, 3.4), p=3.0, taper=(1.05, 0.85))
        g.blob((0.8, y, 7.4), (4.6, 4.5, 3.4), p=2.6)
        rig.part(f"shin_{side}", g, K.VIOLET, finish="gloss")
        g = Geo().blob((7.2, y, 2.4), (2.6, 4.4, 2.2), p=2.6)
        rig.part(f"shin_{side}", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
        g = Geo().blob((2.0, y, 10.4), (4.2, 4.7, 4.8), p=2.6)
        rig.part(f"shin_{side}", g, team=True, outline=0.6)

    # torso: void suit, team chest plate, violet collar, star belt, backpack cell
    K.torso(rig, pack=True)
    # thigh holster/violet faulds
    g = Geo().blob((0.6, 0, 16.6), (10.4, 10.2, 4.0), p=2.8, taper=(1.1, 1.0))
    g.clip((0, 0, 13.2), (0, 0, -1))
    rig.part("hips", g, K.VIOLET_DK, finish="gloss")

    # a tall pointed hood (void cloth with a team outer layer and a violet lining at the face
    # opening) over a dark cowl face with one big glowing violet mono-lens; a small antenna
    g = Geo().blob((1.0, 0, 50.0), (10.6, 10.2, 10.6), p=2.4)
    g.blob((1, 0, 42.4), (7.8, 7.8, 3.2), p=2.4)
    rig.part("head", g, K.VOID_LT, finish="gloss", outline_hex=K.VOID)
    hood = Geo().blob((-1.0, 0, 53.0), (12.6, 12.4, 13.0), p=2.3, taper=(1.0, 0.7), shift=(-0.25, 0))
    hood.blob((-8.0, 0, 64.0), (5.4, 5.0, 8.0), p=2.2, rot=(0, -38, 0))            # the tall point
    hood.clip((7.2, 0, 0), (1, 0, 0))
    rig.part("head", hood, team=True)
    g = Geo().lathe([(9.8, -0.9), (11.2, 0), (9.8, 0.9)], (7.6, 0, 50.0), (8.6, 0, 50.0), segs=28, squash=(1.0, 1.12))
    rig.part("head", g, K.VIOLET, finish="gloss", outline=0.6)                     # hood rim (lining)
    g = Geo().blob((-3.0, 0, 40.0), (9.0, 12.4, 4.0), p=2.4)                          # cowl on the shoulders
    rig.part("head", g, K.VOID_LT, outline=0.6)
    K.mono_lens(rig, (10.0, -1.8, 50.4), r=4.8, axis=(1.0, -0.3))
    rig.secondary("antenna", "head", (-8, 7.0, 58), (-12.0, 8.0, 70), max_deg=16, gain=1.2)
    g = Geo().capsule((-8, 7.0, 58), (-11.6, 8.0, 69), 0.9)
    rig.part("antenna", g, K.STAR_TRIM, outline=1.0)
    g = Geo().sphere((-12.0, 8.0, 70), 1.9, cuts=3)
    rig.part("antenna", g, glow=K.VIOLET_GLOW, outline=1.0, outline_hex=K.VOID)

    # far arm reaches the fore-grip; near arm holds the grip (modelled in the holding pose)
    rig.joint("arm_l", "torso", (0, 11, 37))
    g = Geo().capsule((0, 11, 37), (3, 11, 29), 3.8, 3.4).capsule((3, 11, 29), (GX + 16, 2, 31), 3.4, 3.2)
    rig.part("arm_l", g, K.VOID)
    g = Geo().blob((0.5, 11.6, 38.4), (6.6, 5.6, 5.4), p=2.6)
    rig.part("torso", g, team=True)
    rig.joint("arm_r", "torso", (0, -11.5, 37))
    rig.joint("gun", "arm_r", (GX, GY, GZ))
    g = Geo().capsule((0, -11.5, 37), (-1.5, -12, 29), 3.9, 3.5).capsule((-1.5, -12, 29), (4.5, -11, 29.5), 3.5, 3.3)
    rig.part("arm_r", g, K.VOID)
    g = Geo().blob((0.5, -12.4, 38.2), (7.6, 6.4, 6.2), p=2.6)
    rig.part("arm_r", g, team=True)
    g = Geo().blob((0.5, -12.4, 34.4), (7.2, 6.2, 1.2), p=2.6)
    rig.part("arm_r", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)

    # the ion rifle, along +X from the grip
    gx, gy, gz = GX, GY, GZ
    y = gy + 1
    g = Geo().blob((gx + 8, y, gz + 3.2), (13.0, 3.2, 4.0), p=3.6)             # receiver
    g.blob((gx - 7, y, gz + 2.2), (5.8, 2.6, 3.8), p=3.4, rot=(0, 10, 0))       # stock
    g.blob((gx + 0.5, y, gz - 1.5), (2.2, 2.0, 4.2), p=2.8, rot=(0, -12, 0))    # grip
    g.blob((gx + 16, y + 1, gz - 0.6), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))  # fore-grip
    rig.part("gun", g, K.VOID_LT)
    g = Geo().blob((gx + 9, y, gz + 7.0), (11.0, 2.8, 2.2), p=3.4)             # top shroud
    g.blob((gx + 10, y - 1.0, gz + 10.2), (4.2, 1.6, 1.6), p=3.0)               # scope
    g.lathe([(2.2, 0), (2.2, L - 14.0), (0, L - 13.8)], (gx + 14, y, gz + 3.5), (gx + L, y, gz + 3.5), segs=12)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((gx - 7.5, y, gz + 2.6), (4.6, 2.9, 3.0), p=3.2, rot=(0, 10, 0))   # team stock plate
    rig.part("gun", g, team=True, outline=0.6)
    g = Geo().blob((gx + 13.6, y - 2.4, gz + 10.2), (0.8, 0.8, 1.2), p=2.0)
    rig.part("gun", g, glow=K.MINT, outline=0)
    for i, x in enumerate(COILS):
        rig.joint(f"coil{i}", "gun", (gx + x, y, gz + 3.5))
        g = Geo().lathe([(0, -1.0), (4.6, -0.9), (5.0, 0), (4.6, 0.9), (0, 1.0)], (gx + x, y, gz + 3.5),
                        (gx + x + 1, y, gz + 3.5), segs=18)
        rig.part(f"coil{i}", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)
    # emitter: two forks at the muzzle and a violet ring
    g = Geo()
    for dz in (3.2, -3.2):
        g.blob((gx + L - 1.0, y, gz + 3.5 + dz), (5.0, 1.8, 1.2), p=2.6, rot=(0, -dz * 2.5, 0))
    g.lathe([(0, -0.5), (3.4, -0.4), (3.6, 1.6), (0, 1.8)], (gx + L - 6.0, y, gz + 3.5), (gx + L - 4, y, gz + 3.5), segs=16)
    rig.part("gun", g, K.VOID_LT, finish="gloss")
    g = Geo().lathe([(2.4, 0), (4.0, 0.2), (4.0, 1.4), (2.4, 1.6)], (gx + L - 4.0, y, gz + 3.5),
                    (gx + L - 2.0, y, gz + 3.5), segs=16)
    rig.part("gun", g, K.VIOLET_LT, finish="gloss")
    g = Geo().blob((gx + 16, y + 1.6, gz + 1.6), (3.6, 2.4, 3.2), p=2.6)
    g.blob((gx + 0.6, y - 1.6, gz + 1.8), (3.6, 3.2, 3.4), p=2.6)
    rig.part("gun", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    rig.track("muzzle", "gun", MUZZLE)
    rig.track("_foot", "shin_r", (2.8, -5.8, 0.5))

    mx, my, mz = MUZZLE
    K.orb(rig, "gun", (mx - 2.0, my - 1, mz), 2.8, name="charge", hidden=True)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().star((mx + 3.0, my - 3, mz), 9.0, 3.2, 1.4, points=4)
    rig.part("flash", g, glow=K.MINT, outline=0)
    g = Geo().blob((mx + 7.5, my - 2.5, mz), (9.0, 1.4, 2.2), p=2.0)
    rig.part("flash", g, glow=K.MINT, outline=0)
    g = Geo().sphere((mx + 2.0, my - 4.5, mz), 3.2, cuts=3)
    rig.part("flash", g, glow=K.MINT_CORE, outline=0)
    K.puff(rig, "gun", (gx + 28, y, gz + 9.0), size=0.9, name="vent")


# -- poses ---------------------------------------------------------------------------------
STANCE = {"gun": {"r": -6}, "arm_r": {"r": 2}, "arm_l": {"r": 2}}


def _coils(level):
    """Coil glow: rings swell from back to front as the charge builds (0..1)."""
    pose = {}
    for i in range(4):
        t = max(0.0, min(1.0, level * 4 - i))
        pose[f"coil{i}"] = {"s": 1.0 + 0.28 * t}
    return pose


def _idle(f):
    c, lag = K.idle_wave(f)
    return merge(STANCE, {
        "hips": {"z": 1.2 * c},
        "body": squash(0.04 * c),
        "torso": {"r": 1.2 * c},
        "head": {"r": -2.0 * lag, "z": 0.3 * lag},
        "gun": {"r": 2.5 * lag},
        "arm_l": {"r": 1.5 * lag},
        f"coil{f}": {"s": 1.12},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    lift_r, lift_l = max(0.0, -math.sin(p)), max(0.0, math.sin(p))
    bob = [-2.2, -0.5, 1.0, -0.5, -2.2, -0.5, 1.0, -0.5][f]
    bob_lag = [-0.5, -2.2, -0.5, 1.0, -0.5, -2.2, -0.5, 1.0][f]
    return merge(STANCE, {
        "hips": {"z": bob},
        "body": squash(0.025 * bob / 2.2),
        "torso": {"r": -5 + 1.0 * math.cos(2 * p), "rz": 4 * math.sin(p)},
        "head": {"r": 2 - 1.2 * bob_lag / 2.2},
        "thigh_r": {"r": 30 * math.cos(p) + 14 * lift_r}, "shin_r": {"r": -58 * lift_r},
        "thigh_l": {"r": -30 * math.cos(p) + 14 * lift_l}, "shin_l": {"r": -58 * lift_l},
        "gun": {"r": 5 + 2.5 * bob_lag / 2.2},
    })


ATTACK_MS = [83, 83, 83, 125, 83, 83, 83, 125]
ATTACK_IMPACT = 4


def _attack(f):
    # 0 shoulder, 1-3 coil charge-up (rings swell back to front, charge ball grows, held),
    # 4 fire: level, star flash, squint; 5 recoil; 6 vent puff; 7 settle
    pose = merge(_coils(pick(f, [0, 0.35, 0.7, 1.0, 0, 0, 0, 0])), {
        "body": dict(squash(pick(f, [0, -0.03, -0.05, -0.06, 0.03, -0.08, -0.03, 0])),
                     x=pick(f, [0, 0.5, 1.0, 1.0, 0, -2.5, -1.5, -0.5])),
        "torso": {"r": pick(f, [-1, -2, -3, -3, 0, 4, 2, 0])},
        "head": {"r": pick(f, [-2, -3, -4, -4, -1, 3, 2, 0])},
        "arm_r": {"r": pick(f, [1, 2, 3, 3, 0, 3, 2, 1])},
        "arm_l": {"r": pick(f, [1, 2, 3, 3, 0, 3, 2, 1])},
        "gun": {"r": pick(f, [-2, 1, 2, 2, 0, 4, 1, -3]),
                "x": pick(f, [0, 0, 0, 0, 0, -4.0, -1.5, 0])},
        "thigh_r": {"r": pick(f, [0, 4, 6, 6, 4, 2, 1, 0])},
        "thigh_l": {"r": pick(f, [0, -4, -6, -6, -9, -7, -4, 0])},
        "charge": {"show": f in (1, 2, 3), "s": pick(f, [0, 0.55, 0.9, 1.25, 0, 0, 0, 0])},
        "flash": {"show": f == 4},
        "vent": {"show": f == 6},
    })
    if f == 4:
        pose["eyes"] = {"sz": 0.4}
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, {
        "body": dict(squash(-0.1 * a), x=-4.0 * a),
        "torso": {"r": 13 * a},
        "head": {"r": 10 * a},
        "gun": {"r": 14 * a},
    })


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "gun": {"r": pick(f, [40, 20, 20])},
    })
    if f in (0, 1):
        K.ko(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
