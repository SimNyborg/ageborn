"""Trench Raider: Modern Age infantry (DESIGN A5.5). Melee, slash, ~68 lu.

Look (A11, Modern palette): a stocky raider under a wide olive Brodie "soup bowl" helmet
with a team band, a team tunic with breast pockets and team sleeves, a khaki webbing belt
with pouches and a stick grenade, olive trousers, khaki puttees and dark boots. Stubble,
angry brows and a cocky grin. He carries an oversized sharpened entrenching spade (wood
handle with a D-grip, a big steel blade) held up and forward, so the melee role reads at
56 px. The attack winds the spade back over his helmet (held), chops down with a smear and
slams the blade in front of him (held impact, squash, yell), then recovers.
"""
from ageborn_art import fx
from ageborn_art import rigs_modern as M
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "trench_raider"
NAME = "Trench Raider"
HEIGHT_LU = 68
CANVAS = (272, 262)
FEET = (120, 238)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

FIST = (0.4, M.ARM_Y["r"] - 1.2, M.HAND_Z - 0.4)
HANDLE = 28.0          # handle length from the fist to the blade socket
BLADE = 17.0           # blade length
BLADE_W = 7.2          # half width
SMEAR = {"joint": "spade", "inner": (FIST[0], FIST[1], FIST[2] + HANDLE + 1),
         "outer": (FIST[0], FIST[1], FIST[2] + HANDLE + BLADE + 1), "color": M.STEEL,
         "taper": 0.5, "start": 0.3}


def build(rig):
    M.skeleton(rig)
    M.legs(rig)
    M.tunic(rig)
    # stick grenade tucked into the belt at the back (near side)
    g = Geo().capsule((-7.0, -10.8, 14.5), (-9.5, -10.6, 24.5), 1.2)
    rig.part("torso", g, M.WOOD, outline=0.6)
    g = Geo().lathe([(2.6, 0), (2.9, 2.0), (2.6, 5.0), (0, 5.4)], (-9.7, -10.6, 24.0), (-10.6, -10.6, 29.0), segs=12)
    rig.part("torso", g, M.OLIVE, finish="gloss", outline=0.7)

    # head: stubble, grin, Brodie helmet with a team band, a strap under the chin
    M.head_ball(rig, chin="#C7A68C")
    M.face(rig, grin=True, brow=M.HAIR)
    g = Geo().blob((-6.4, 0, 47.5), (6.0, 10.0, 7.0), p=2.2)
    rig.part("head", g, M.HAIR, finish="hair")
    g = Geo().blob((-2.0, -11.2, 50.0), (2.6, 1.6, 3.4), p=2.2)   # ear
    rig.part("head", g, M.SKIN)
    M.helmet_brodie(rig, c=(1.5, 0, 57.5))
    g = Geo().capsule((6.0, -9.8, 55.5), (9.5, -8.0, 40.5), 0.7)
    rig.part("head", g, M.LEATHER, outline=0.4)

    for s in ("r", "l"):
        M.arm_parts(rig, s, rolled=True, fist=4.5)
    M.shoulders(rig)

    # the spade: along +Z from the near fist
    rig.joint("spade", "hand_r", FIST)
    cx, cy, cz = FIST
    g = Geo().capsule((cx, cy, cz - 5.0), (cx, cy, cz + HANDLE), 1.7, 1.9)
    rig.part("spade", g, M.WOOD)
    g = Geo()   # D-grip below the fist
    g.capsule((cx - 3.2, cy, cz - 5.0), (cx + 3.2, cy, cz - 5.0), 1.3)
    g.capsule((cx - 3.2, cy, cz - 5.0), (cx - 1.4, cy, cz - 9.6), 1.2)
    g.capsule((cx + 3.2, cy, cz - 5.0), (cx + 1.4, cy, cz - 9.6), 1.2)
    g.capsule((cx - 1.4, cy, cz - 9.6), (cx + 1.4, cy, cz - 9.6), 1.2)
    rig.part("spade", g, M.GUNMETAL, finish="metal", outline=0.7)
    g = Geo().lathe([(2.3, 0), (2.6, 3.0), (3.6, 5.0), (0, 5.2)], (cx, cy, cz + HANDLE - 3.5),
                    (cx, cy, cz + HANDLE + 2.0), segs=12)   # socket
    rig.part("spade", g, M.GUNMETAL, finish="metal", outline=0.8)
    bz = cz + HANDLE + BLADE / 2 + 1.0
    g = Geo().blob((cx, cy, bz), (BLADE_W, 1.5, BLADE / 2), p=2.3, taper=(1.0, 0.42))
    rig.part("spade", g, M.STEEL, finish="metal")
    g = Geo().blob((cx, cy - 0.9, bz + 1.5), (BLADE_W * 0.55, 1.0, BLADE * 0.3), p=2.2, taper=(1.0, 0.5))
    rig.part("spade", g, "#B9C0C6", finish="metal", outline=0)   # sharpened bright face
    rig.track("spadeTip", "spade", (cx, cy, cz + HANDLE + BLADE + 1.0))
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def grip(a, f, w, la=-80.0, lf=-60.0):
    """Near arm (a, f) holding the spade pointing `w`; far arm (la, lf)."""
    return merge(M.arm("r", a, f, w=w, w_rest=90.0), M.arm("l", la, lf))


IDLE = (-48.0, 12.0, 48.0)


def _idle(f):
    c, lag = M.idle_wave(f)
    a, fo, w = IDLE
    return merge(M.idle_body(f), grip(a + 2 * lag, fo + 3 * lag, w + 4 * lag, -78 + 3 * c, -50 + 4 * lag))


def _walk(f):
    pose, p, bl = M.walk_legs(f, lean=-7.0)
    import math
    sw = math.cos(p)
    a, fo, w = IDLE
    return merge(pose, grip(a + 4 * sw, fo + 3 * bl, w + 6 * bl, -80 - 22 * sw, -58 - 16 * sw))


def _attack(f):
    # 0-1 wind up, 2 held extreme (spade over the helmet, squash back, yell),
    # 3 smear (chop), 4 held impact (blade down in front, squash 0.85/1.15), 5-7 recover
    a = pick(f, [-30, 10, 45, 10, -18, -28, -40, -46])
    fo = pick(f, [40, 80, 110, 40, -8, -10, 2, 10])
    w = pick(f, [100, 140, 160, 60, -18, -12, 20, 42])
    la = pick(f, [-70, -95, -110, -30, 0, -20, -55, -75])
    lf = pick(f, [-40, -60, -70, -10, 10, -10, -40, -52])
    pose = merge(grip(a, fo, w, la, lf), {
        "body": dict(squash(pick(f, [0.03, 0.05, 0.08, 0.02, -0.15, -0.08, -0.03, 0.0])),
                     x=pick(f, [-1, -2.5, -3.5, 2.0, 5.0, 4.0, 2.0, 0.5])),
        "torso": {"r": pick(f, [4, 9, 13, -8, -16, -12, -6, -2])},
        "head": {"r": pick(f, [2, 4, 6, -4, -8, -6, -3, 0])},
        "thigh_r": {"r": pick(f, [4, 6, 8, 18, 26, 22, 14, 6])},
        "shin_r": {"r": pick(f, [0, 0, -4, -10, -16, -12, -6, 0])},
        "thigh_l": {"r": pick(f, [-4, -8, -10, -14, -18, -16, -10, -4])},
    })
    if f == 3:
        pose["spade"] = {"sz": 1.12}
    if f in (2, 3, 4):
        M.yell(pose)
    return pose


def _hit(f):
    a, fo, w = IDLE
    k = [1.0, 0.55, 0.2][f]
    return merge(grip(a + 16 * k, fo + 18 * k, w + 8 * k, -60 + 20 * k, -30 + 30 * k), M.hit_body(f))


def _die(f):
    pose = merge(grip(pick(f, [30, 0, -20]), pick(f, [70, 30, 0]), pick(f, [150, 120, 100]),
                      pick(f, [40, 10, -20]), pick(f, [80, 30, 0])),
                 fx.die_pose(f), M.die_limbs(f))
    if f in (0, 1):
        M.ko(pose)
        M.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
