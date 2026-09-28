"""Star Legionnaire: Cosmic Age infantry (docs/design-lane-ages.md A17.11). Energy blade, blunt,
laser damage, ~68 lu. Deflector: takes 20% less damage from ranged attacks (the disc is the cue).

Look (A17.12, Cosmic palette): a legionary of the star legions. A crested violet dome helmet
with a team brow band, a star-white faceplate with slanted glowing violet eye slits (squint on
the strike, X on death) and a tall violet crest fin with a star-white edge; a team chest plate under a violet collar, big team shoulder pads
with star-white rims, a short team cape that trails on follow-through, violet boots and bracers
over a void undersuit. The far forearm carries the deflector, big and turned to face the camera: a
round mint energy disc with a bright hexagon rim projected from a star-white emitter. The near hand holds a broad violet
energy gladius with a white core, the brightest shape on the unit. The attack is a forward
cut: shoulder the disc, draw the blade back, a violet smear, a held lunge with a spark burst.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "star_legionnaire"
NAME = "Star Legionnaire"
HEIGHT_LU = 68
CANVAS = (288, 256)
FEET = (124, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}

BLADE_LEN = 30.0
HILT = 7.0
HR = (0.0, K.ARM_Y["r"], K.HAND_Z)
HL = (0.0, K.ARM_Y["l"], K.HAND_Z)
TIP = (HR[0], HR[1] - 1.0, HR[2] + HILT + BLADE_LEN + 2.0)

SMEAR = {"joint": "blade", "inner": (HR[0], HR[1] - 1.0, HR[2] + HILT + BLADE_LEN * 0.3),
         "outer": TIP, "color": K.VIOLET_GLOW, "taper": 0.4, "start": 0.3}


def build(rig):
    K.skeleton(rig)
    K.legs(rig, team_shin=True)
    rig.joint("blade", "hand_r", HR)
    rig.joint("disc", "fore_l", (HL[0], HL[1], HL[2] + 4.0))

    # deflector disc on the far forearm, facing forward and turned toward the camera
    n = (math.cos(math.radians(-72)), math.sin(math.radians(-72)), 0.0)   # facing the camera
    bx, by, bz = HL[0] + 3.0, HL[1] - 6.0, HL[2] + 5.0
    g = Geo().blob((HL[0] + 1.6, HL[1] - 1.0, HL[2] + 4.5), (3.0, 3.2, 3.6), p=3.0)
    rig.part("disc", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)

    def along(d):
        return (bx + n[0] * d, by + n[1] * d, bz)

    g = Geo().lathe([(0, -0.3), (17.6, -0.2), (18.6, 0.8), (17.4, 1.6), (0, 1.4)], along(0), along(1),
                    segs=6)
    rig.part("disc", g, glow=K.MINT, outline=1.0, outline_hex=K.VOID)
    g = Geo().lathe([(0, 0), (13.6, 0.1), (13.6, 0.9), (0, 1.0)], along(1.2), along(2.2), segs=24)
    rig.part("disc", g, glow="#8AF2D2", outline=0)
    g = Geo().lathe([(0, 0), (5.0, 0.2), (4.5, 1.2), (0, 1.8)], along(2.0), along(3.6), segs=16)
    rig.part("disc", g, glow=K.MINT_CORE, outline=0)
    K.sparks(rig, "disc", along(3.0), color=K.MINT, size=1.1, name="flare", seed=2)

    K.arm_parts(rig, "l")

    # short team cape behind the shoulders (drawn first so the torso covers its top)
    rig.secondary("cape", "torso", (-8.0, 0, 38.0), (-14.0, 0, 14.0), max_deg=16, gain=1.0)
    g = Geo().blob((-11.5, 0.5, 26.5), (3.4, 12.0, 13.0), p=3.0, taper=(1.3, 0.9), shift=(0.2, 0))
    rig.part("cape", g, team=True)
    g = Geo().blob((-12.6, 0.5, 16.8), (2.2, 12.4, 1.4), p=3.0)
    rig.part("cape", g, K.VIOLET_DK, outline=0.6)

    K.torso(rig, pack=False)
    # segmented violet ab bands (the legion's lorica) under the team plate
    g = Geo()
    for z in (24.4, 27.2):
        g.blob((1.2, 0, z), (9.9, 9.9, 1.2), p=3.0)
    rig.part("torso", g, K.VIOLET, finish="gloss")
    g = Geo().blob((0.6, 0, 16.6), (10.6, 10.4, 4.2), p=2.8, taper=(1.12, 1.0))
    g.clip((0, 0, 12.8), (0, 0, -1))
    rig.part("hips", g, K.VIOLET_DK, finish="gloss")

    # helmet: a crested violet dome, a star-white faceplate with slanted glowing violet eye slits,
    # a tall violet crest fin with a star-white edge, a team brow band (no Future visor bar)
    g = Geo().blob((2.0, 0, 51.0), (12.0, 11.4, 12.2), p=2.4, shift=(0.1, 0))
    g.blob((-5.0, 0, 44.0), (7.0, 9.6, 5.4), p=2.4)                  # neck guard
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().lathe([(12.3, 0), (12.6, 1.4), (12.2, 2.8)], (2.0, 0, 54.0), (2.0, 0, 56.8), segs=26)
    rig.part("head", g, team=True, outline=0.6)
    K.face_plate(rig, c=(2.0, 0, 51.0), r=(12.0, 11.4, 12.2), x0=4.5, top=54.2, eye_z=51.2)
    fin = [(6.0, 60.0), (3.0, 67.0), (-2.0, 74.0), (-6.0, 77.0), (-8.0, 73.0), (-12.0, 66.0), (-16.0, 61.0),
           (-11.0, 56.0), (0.0, 58.0)]
    g = Geo().slab(fin, 0.0, 3.2)
    rig.part("head", g, K.VIOLET, finish="gloss", outline_hex=K.VIOLET_DK)
    g = Geo().capsule((6.4, 0.0, 60.2), (2.6, 0.0, 68.0), 1.3).capsule((2.6, 0.0, 68.0), (-5.6, 0.0, 77.0), 1.3, 0.8)
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)

    K.arm_parts(rig, "r")
    K.shoulders(rig, r=(8.2, 7.0, 6.6))

    # the energy gladius, along +Z from the near fist
    hx, hy, hz = HR
    g = Geo().capsule((hx, hy, hz - 4.2), (hx, hy, hz + 4.6), 1.6)
    rig.part("blade", g, K.VOID_LT, outline=0.8)
    g = Geo().blob((hx, hy, hz - 5.4), (2.2, 2.2, 1.8), p=2.4)
    g.blob((hx, hy, hz + 5.8), (6.0, 2.8, 1.9), p=2.6)
    rig.part("blade", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    g = Geo().blob((hx + 4.6, hy - 1.0, hz + 5.8), (1.1, 1.1, 1.1), p=2.2)
    g.blob((hx - 4.6, hy - 1.0, hz + 5.8), (1.1, 1.1, 1.1), p=2.2)
    rig.part("blade", g, glow=K.MINT, outline=0)
    b0 = hz + HILT
    # broad leaf blade: widest two thirds up, a pointed tip
    g = Geo().blob((hx, hy - 0.4, b0 + BLADE_LEN / 2), (4.4, 1.5, BLADE_LEN / 2 + 1.0), p=2.2,
                   taper=(0.85, 0.55))
    rig.part("blade", g, glow=K.VIOLET_GLOW, outline=1.0, outline_hex=K.VIOLET)
    g = Geo().blob((hx + 0.2, hy - 1.3, b0 + BLADE_LEN / 2 - 0.5), (1.8, 0.9, BLADE_LEN / 2 - 1.5),
                   p=2.2, taper=(0.9, 0.5))
    rig.part("blade", g, glow=K.VIOLET_CORE, outline=0)
    rig.track("bladeTip", "blade", TIP)
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))
    K.sparks(rig, "blade", (hx, hy - 2.0, b0 + BLADE_LEN * 0.85), color=K.VIOLET_GLOW, size=1.3,
             name="sparks")


# -- poses ---------------------------------------------------------------------------------
def guard(sa, sf, sw, da=-62.0, df=-2.0):
    """Blade arm (upper, fore, blade directions); disc arm held forward."""
    return merge(K.arm("r", sa, sf, sw, 90.0), K.arm("l", da, df))


STANCE = merge(guard(-75, -20, 40), {"torso": {"r": -2}})


def _idle(f):
    c, lag = K.idle_wave(f)
    return merge(STANCE, K.idle_body(f, bob=1.2, sq=0.04), {
        "arm_r": {"r": 2.5 * lag}, "hand_r": {"r": -3.5 * lag},
        "arm_l": {"r": 2.0 * lag},
        "disc": {"s": 1.0 + 0.03 * c},
    })


def _walk(f):
    pose, p, bl = K.walk_legs(f, stride=30, lean=-7)
    return merge(STANCE, pose, {
        "arm_r": {"r": -6 * math.cos(p)}, "hand_r": {"r": 4 * bl},
        "arm_l": {"r": 5 * math.cos(p)},
    })


def _attack(f):
    # 0-1 draw back (disc forward), 2 held extreme, 3 smear, 4 held lunge impact with sparks,
    # 5-7 recovery back to guard
    sa = pick(f, [-40, 10, 40, 10, -20, -30, -50, -68])
    sf = pick(f, [20, 80, 110, 20, -5, -10, -15, -20])
    sw = pick(f, [60, 110, 135, 30, -5, 5, 20, 36])
    sq = pick(f, [-0.04, -0.08, 0.06, 0.05, -0.14, -0.07, -0.02, 0.0])
    pose = merge(guard(sa, sf, sw, pick(f, [-50, -35, -25, -50, -62, -62, -62, -62]),
                       pick(f, [10, 20, 25, 0, -8, -5, -3, -2])), {
        "body": dict(squash(sq), x=pick(f, [-1, -2.5, -3.5, 2.5, 7, 6, 3, 0.5])),
        "hips": {"z": pick(f, [0, -0.8, 0.8, 0, -2.6, -1.8, -0.6, 0])},
        "torso": {"r": pick(f, [4, 9, 13, -6, -20, -16, -8, -3])},
        "head": {"r": pick(f, [2, 5, 6, -3, -8, -6, -3, 0])},
        "thigh_r": {"r": pick(f, [0, -6, -8, 12, 26, 22, 10, 2])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [0, 6, 8, -8, -18, -14, -6, 0])},
        "shin_l": {"r": pick(f, [0, -4, -6, -6, -8, -6, -2, 0])},
        "sparks": {"show": f == 4, "s": 1.0},
    })
    if f == 3:
        pose.setdefault("blade", {})["sz"] = 1.25
    if f in (3, 4):
        K.squint(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    # the deflector flares as it takes the blow
    return merge(STANCE, K.hit_body(f), {
        "arm_r": {"r": 16 * a}, "hand_r": {"r": 10 * a},
        "arm_l": {"r": 12 * a},
        "flare": {"show": f == 0},
    })


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), K.die_limbs(f), {
        "arm_r": {"r": pick(f, [50, 60, 60])}, "hand_r": {"r": pick(f, [40, 30, 30])},
        "arm_l": {"r": pick(f, [90, 70, 70])},
        "disc": {"s": pick(f, [0.8, 0.5, 0.3])},
    })
    if f in (0, 1):
        K.ko(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
