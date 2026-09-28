"""Pulse Trooper: Future Age ranged (DESIGN A5.6). Plasma bolt, laser damage, ~70 lu.

Look (A11): charcoal undersuit, white armour, a big helmet whose upper dome is team-coloured
over a white faceplate with a dark visor and two mint "eyes" (they squint when firing and
turn to X on death), team chest plate and shoulder pads, and an oversized white-and-charcoal
plasma rifle (20% longer than v1) with mint coils and a wide flared muzzle with a magenta
ring. The attack charges a mint glow at the muzzle, fires level with a stretched flash,
recoils and vents a puff. The projectile itself is proj.plasma (separate); it spawns at the
exported per-frame `muzzle` anchor of the fire frame.
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "pulse_trooper"
NAME = "Pulse Trooper"
HEIGHT_LU = 70
CANVAS = (256, 212)
FEET = (92, 194)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}

SUIT = "#2E323C"
ARMOR = "#E9EDF2"
TRIM = "#A9B1BD"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
MAGENTA = "#F03AA8"
VISOR_DARK = "#1B1E25"
VENT = "#E6EAEE"

GX, GY, GZ = 5, -11, 30      # the rifle's grip (gun joint)
GUN_SCALE = 1.2              # 20% longer than v1


def X(dx):
    """x along the rifle, measured from the grip, stretched by GUN_SCALE."""
    return GX + dx * GUN_SCALE


MUZZLE = (X(40.0) + 4.5, GY + 1, GZ + 3.5)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, 16))
    rig.joint("torso", "hips", (0, 0, 18))
    rig.joint("head", "torso", (1, 0, 40))
    for side, y in (("r", -5.8), ("l", 5.8)):
        rig.joint(f"thigh_{side}", "hips", (0, y, 16))
        rig.joint(f"shin_{side}", f"thigh_{side}", (0.5, y, 9.5))

    # legs: charcoal suit, big white boots
    for side, y in (("r", -5.8), ("l", 5.8)):
        g = Geo().capsule((0, y, 16), (0.5, y, 9.5), 4.4, 3.9)
        rig.part(f"thigh_{side}", g, SUIT)
        g = Geo().capsule((0.5, y, 9.5), (1.0, y, 5.0), 3.8, 3.6)
        rig.part(f"shin_{side}", g, SUIT)
        g = Geo().blob((2.8, y, 3.2), (7.0, 4.8, 3.4), p=3.0, taper=(1.05, 0.85))
        g.blob((0.8, y, 7.0), (4.6, 4.5, 3.0), p=2.6)
        rig.part(f"shin_{side}", g, ARMOR, finish="gloss")

    # torso: suit, team chest plate, belt with a light, backpack power cell
    g = Geo().blob((0, 0, 28), (9.8, 9.6, 11.2), p=2.4, taper=(0.95, 1.05))
    g.blob((0, 0, 17.5), (8.8, 9.2, 4.2), p=2.6)
    rig.part("torso", g, SUIT)
    g = Geo().blob((1.8, 0, 32.2), (9.6, 10.4, 7.4), p=3.0, taper=(0.9, 1.0))
    rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 21.8), (10.2, 10.2, 2.4), p=3.4)
    rig.part("torso", g, TRIM)
    g = Geo().blob((10.4, -2.0, 21.8), (1.4, 2.4, 1.4), p=2.4)
    rig.part("torso", g, glow=MINT, outline=1.0, outline_hex=SUIT)
    g = Geo().blob((-11.0, 0, 31), (4.4, 8.2, 8.6), p=4.0)
    rig.part("torso", g, SUIT)
    g = Geo().capsule((-15.2, -4.5, 26.5), (-15.2, -4.5, 35.5), 1.7).capsule((-15.2, 1.5, 26.5), (-15.2, 1.5, 35.5), 1.7)
    rig.part("torso", g, glow=MINT, outline=1.0, outline_hex=SUIT)

    # helmet: white dome and faceplate; the upper dome (about 60%) is a team cap
    g = Geo().blob((2, 0, 51), (11.4, 11.0, 11.6), p=2.5)
    g.blob((0, 0, 42.2), (7.5, 7.5, 3.2), p=2.4)
    rig.part("head", g, ARMOR, finish="gloss")
    g = Geo().blob((2, 0, 51.1), (11.75, 11.35, 11.95), p=2.5, cuts=8)
    g.clip((0, 0, 47.6), (0, 0, -1))              # keep the upper ~60%
    g.clip((8.4, 0, 50.0), (1, 0, -0.3))           # keep the faceplate white
    g.blob((-0.5, 0, 62.6), (10.4, 2.8, 2.6), p=2.8, rot=(0, -8, 0))  # crest
    rig.part("head", g, team=True)
    g = Geo().blob((10.4, -0.6, 49.8), (4.6, 10.0, 5.4), p=3.2)
    rig.part("head", g, VISOR_DARK, finish="gloss", outline_hex=SUIT)
    # visor eye slit (v3: one wide bright band that reads as a face in profile at 56 px):
    # squints on the fire frame, X on the first death frames
    rig.joint("eyes", "head", (13.4, 0, 50.3))
    g = Geo().blob((14.3, -2.2, 50.6), (1.6, 7.4, 2.0), p=3.4)
    g.blob((14.9, -3.2, 50.6), (0.9, 1.6, 1.6), p=2.4)
    rig.part("eyes", g, glow=MINT, outline=0)
    rig.joint("eyes_x", "head", (13.4, 0, 50.3), hidden=True)
    g = Geo()
    for y in (-4.0, 2.2):
        g.capsule((13.9, y - 1.7, 52.0), (13.9, y + 1.7, 48.6), 0.75)
        g.capsule((13.9, y - 1.7, 48.6), (13.9, y + 1.7, 52.0), 0.75)
    rig.part("eyes_x", g, glow=MINT, outline=0)
    g = Geo().blob((-3.5, -10.4, 50.0), (4.4, 2.0, 4.4), p=2.4)  # ear pod
    rig.part("head", g, SUIT)
    g = Geo().blob((-3.5, -12.2, 50.0), (1.7, 0.8, 1.7), p=2.2)
    rig.part("head", g, glow=MINT, outline=0)
    rig.secondary("antenna", "head", (-8, 7.5, 54), (-12.2, 8.6, 67), max_deg=16, gain=1.2)
    g = Geo().capsule((-8, 7.5, 54), (-12, 8.5, 66), 0.9)
    rig.part("antenna", g, SUIT, outline=1.0)
    g = Geo().sphere((-12.2, 8.6, 67), 2.0, cuts=3)
    rig.part("antenna", g, glow=MAGENTA, outline=1.0, outline_hex=MAGENTA)

    # far arm reaches the foregrip; near arm holds the grip. Arms are modelled in the
    # holding pose, so clips only add small deltas.
    rig.joint("arm_l", "torso", (0, 11, 37))
    g = Geo().capsule((0, 11, 37), (3, 11, 29), 3.9, 3.5).capsule((3, 11, 29), (X(10), 2, 31), 3.5, 3.3)
    rig.part("arm_l", g, SUIT)
    g = Geo().blob((0.5, 11.6, 38.4), (6.6, 5.6, 5.4), p=2.6)
    rig.part("torso", g, team=True)
    rig.joint("arm_r", "torso", (0, -11.5, 37))
    rig.joint("gun", "arm_r", (GX, GY, GZ))
    g = Geo().capsule((0, -11.5, 37), (-1.5, -12, 29), 4.0, 3.6).capsule((-1.5, -12, 29), (4.5, -11, 29.5), 3.6, 3.4)
    rig.part("arm_r", g, SUIT)
    g = Geo().blob((0.5, -12.2, 38.4), (6.8, 5.8, 5.6), p=2.6)
    rig.part("arm_r", g, team=True)

    # the plasma rifle, along +X from the grip, 20% longer, with a wide flared muzzle
    gx, gy, gz = GX, GY, GZ
    k = GUN_SCALE
    g = Geo().blob((X(10), gy + 1, gz + 3.5), (13.5 * k, 3.4, 4.2), p=3.6)  # receiver
    g.blob((gx - 6, gy + 1, gz + 2.5), (5.5, 2.6, 3.8), p=3.4, rot=(0, 10, 0))  # stock
    g.blob((gx + 0.5, gy + 1, gz - 1.5), (2.2, 2.0, 4.2), p=2.8, rot=(0, -12, 0))  # grip
    g.blob((X(13), gy + 2, gz - 1.0), (2.0, 1.8, 3.4), p=2.8, rot=(0, -8, 0))  # foregrip
    rig.part("gun", g, SUIT)
    g = Geo().blob((X(12), gy + 1, gz + 7.0), (11.5 * k, 3.0, 2.4), p=3.4)  # top shroud
    g.lathe([(3.4, 0), (3.6, 4), (3.0, 14.5), (0, 14.7)], (X(23), gy + 1, gz + 3.5),
            (X(40), gy + 1, gz + 3.5), segs=14)
    rig.part("gun", g, ARMOR, finish="gloss", outline_hex=TRIM)
    g = Geo()
    for x in (X(17.5), X(21), X(24.5)):
        g.lathe([(0, -0.7), (4.3, -0.6), (4.3, 0.6), (0, 0.7)], (x, gy + 1, gz + 3.5), (x + 1, gy + 1, gz + 3.5), segs=16)
    rig.part("gun", g, glow=MINT, outline=1.0, outline_hex=SUIT)
    # flared muzzle: a wide charcoal brake with a magenta ring at the mouth
    g = Geo().lathe([(0, -0.5), (3.2, -0.4), (5.6, 1.6), (6.0, 4.0), (4.4, 4.6), (0, 4.7)],
                    (X(40) - 1.0, gy + 1, gz + 3.5), (X(40) + 10, gy + 1, gz + 3.5), segs=18)
    rig.part("gun", g, SUIT, finish="gloss")
    g = Geo().lathe([(3.0, 0), (6.2, 0.2), (6.2, 1.8), (3.2, 2.0)], (X(40) + 2.8, gy + 1, gz + 3.5),
                    (X(40) + 12, gy + 1, gz + 3.5), segs=18)
    rig.part("gun", g, MAGENTA)
    g = Geo().blob((X(13), gy + 1.6, gz + 1.6), (3.6, 2.4, 3.2), p=2.6)  # far hand on the foregrip
    g.blob((gx + 0.6, gy - 0.6, gz + 1.8), (3.6, 3.2, 3.4), p=2.6)  # near hand on the grip
    rig.part("gun", g, ARMOR, finish="gloss", outline_hex=TRIM)
    rig.track("muzzle", "gun", MUZZLE)
    rig.track("_foot", "shin_r", (2.8, -5.8, 0.5))

    # muzzle charge, flash (16 lu, stretched 3:1 along the barrel) and a vent puff
    mx, my, mz = MUZZLE
    rig.joint("charge", "gun", MUZZLE, hidden=True)
    g = Geo().sphere(MUZZLE, 3.4, cuts=4)
    rig.part("charge", g, glow=MINT_CORE, outline=1.4, outline_hex=MINT)
    rig.joint("flash", "gun", MUZZLE, hidden=True)
    g = Geo().blob((mx + 8.5, my - 1, mz), (9.0, 1.6, 3.2), p=2.0)
    g.blob((mx + 5.0, my - 1, mz + 2.2), (6.0, 1.5, 1.9), p=2.0, rot=(0, -34, 0))
    g.blob((mx + 5.0, my - 1, mz - 2.2), (6.0, 1.5, 1.9), p=2.0, rot=(0, 34, 0))
    rig.part("flash", g, glow=MINT, outline=0)
    g = Geo().blob((mx + 5.5, my - 2, mz), (5.6, 1.4, 1.9), p=2.0)
    rig.part("flash", g, glow="#FFFFFF", outline=0)
    vx, vy, vz = X(8), gy + 1, gz + 10.5
    rig.joint("vent", "gun", (vx, vy, vz), hidden=True)
    g = Geo().sphere((vx, vy - 1, vz + 1.5), 2.8, cuts=4).sphere((vx - 2.6, vy - 1.5, vz + 4.2), 2.2, cuts=4)
    g.sphere((vx + 2.2, vy - 1.5, vz + 3.6), 1.9, cuts=4)
    rig.part("vent", g, VENT, finish="dust")


# -- poses ---------------------------------------------------------------------------------
STANCE = {"gun": {"r": -6}, "arm_r": {"r": 2}, "arm_l": {"r": 2}}


def _idle(f):
    c = [-1.0, -0.45, 0.45, 1.0][f]
    lag = [-1.0, -1.0, -0.45, 0.45][f]
    return merge(STANCE, {
        "hips": {"z": 1.2 * c},
        "body": squash(0.04 * c),
        "torso": {"r": 1.2 * c},
        "head": {"r": -2.0 * lag, "z": 0.3 * lag},
        "gun": {"r": 2.5 * lag},
        "arm_l": {"r": 1.5 * lag},
    })


def _walk(f):
    import math
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
    # 0 raise, 1 brace, 2-3 charge (held), 4 fire: gun level, flash, eyes squint;
    # 5 recoil: gun 4 lu back along its axis and 10 degrees up, squash 0.92/1.08;
    # 6 vent puff; 7 settle
    pose = {
        "body": dict(squash(pick(f, [0, -0.03, -0.05, -0.06, 0.03, -0.08, -0.03, 0])),
                     x=pick(f, [0, 0.5, 1.0, 1.0, 0, -2.5, -1.5, -0.5])),
        "torso": {"r": pick(f, [-1, -2, -3, -3, 0, 4, 2, 0])},
        "head": {"r": pick(f, [-1, -2, -3, -3, 0, 3, 2, 0])},
        "arm_r": {"r": pick(f, [1, 2, 3, 3, 0, 3, 2, 1])},
        "arm_l": {"r": pick(f, [1, 2, 3, 3, 0, 3, 2, 1])},
        "gun": {"r": pick(f, [-2, 2, 3, 3, 0, 3, 1, -3]),
                "x": pick(f, [0, 0, 0, 0, 0, -4.0, -1.5, 0])},
        "thigh_r": {"r": pick(f, [0, 4, 6, 6, 4, 2, 1, 0])},
        "thigh_l": {"r": pick(f, [0, -4, -6, -6, -9, -7, -4, 0])},
        "charge": {"show": f in (2, 3), "s": pick(f, [0, 0, 0.6, 1.2, 0, 0, 0, 0])},
        "flash": {"show": f == 4},
        "vent": {"show": f == 6},
    }
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
        pose.update({"eyes": {"hide": True}, "eyes_x": {"show": True}})
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
