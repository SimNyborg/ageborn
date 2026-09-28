"""Graviton Halberdier: Cosmic Age anti-armor Rare (docs/design-lane-ages.md A17.11). Reach 70,
melee anti-armour, laser damage, Brace, ~72 lu.

Look (A17.12, Cosmic palette): a heavy guard in star-white armour over a void suit. A tall
star-white helm with a dark visor band and mint slit and a team fin crest, big team shoulder
pads, a team chest plate and a long team tabard that swings. The halberd is the reach cue: a
long void shaft with star-white fittings, a broad violet crescent blade on the front and a back
spike, and between two forked prongs a floating violet gravity orb with a mint ring around it
(the orb bobs on its own). The attack is an overhead chop: plant the feet (brace), heave the
halberd up behind the head, a violet smear, a held impact with the orb flaring, recovery.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_cosmic as K
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "graviton_halberdier"
NAME = "Graviton Halberdier"
HEIGHT_LU = 72
CANVAS = (380, 272)
FEET = (132, 236)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 33)}

G0 = (6.0, -13.0, 24.0)       # grip (pole joint), character space; the halberd points +X
BACK = 16.0                   # shaft behind the grip
FORE = 18.0                   # far hand this far along
SHAFT = 64.0                  # grip to the head's socket
HEAD_X = G0[0] + SHAFT
ORB = (HEAD_X + 11.0, G0[1] - 1.0, G0[2] + 1.0)
TIP = (HEAD_X + 20.0, G0[1], G0[2])

SMEAR = {"joint": "pole", "inner": (HEAD_X - 6.0, G0[1], G0[2]), "outer": (HEAD_X + 8.0, G0[1], G0[2] - 14.0),
         "color": K.VIOLET_GLOW, "taper": 0.4, "start": 0.3}


def build(rig):
    K.skeleton(rig, head=(1, 0, 39))
    K.legs(rig, boot=K.VIOLET, knee=K.STAR)
    rig.joint("pole", "torso", G0)
    K.arm_parts(rig, "l", bracer=K.STAR)

    # tabard (behind the belt) and torso
    rig.secondary("tabard", "hips", (7.0, 0, 20.0), (8.5, 0, 4.0), max_deg=14, gain=0.9)
    g = Geo().blob((8.2, -0.5, 12.5), (2.4, 7.0, 8.8), p=3.2, taper=(1.14, 0.9))
    rig.part("tabard", g, team=True)
    g = Geo().blob((9.6, -0.5, 4.8), (1.4, 7.4, 1.2), p=3.0)
    rig.part("tabard", g, K.STAR, outline=0.6)
    K.torso(rig, pack=False, bulk=1.08, collar=K.STAR)
    g = Geo().blob((0.6, 0, 16.8), (11.0, 10.8, 4.4), p=2.8, taper=(1.12, 1.0))
    g.clip((0, 0, 12.8), (0, 0, -1))
    rig.part("hips", g, K.VIOLET, finish="gloss")

    # tall helm: star-white shell, visor band, team fin crest
    g = Geo().blob((2.0, 0, 51.0), (11.8, 11.2, 13.4), p=2.6, taper=(1.05, 0.9))
    g.blob((4.5, 0, 42.2), (9.0, 9.2, 3.6), p=2.4)
    rig.part("head", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    K.visor_band(rig, c=(2.0, 0, 51.0), r=(11.8, 11.2, 13.4), z0=47.6, z1=52.6, x0=6.5)
    g = Geo().blob((-1.0, 0, 64.0), (12.0, 2.8, 7.2), p=2.4, rot=(0, -10, 0))
    g.blob((-10.0, 0, 57.0), (4.0, 2.6, 7.0), p=2.4, rot=(0, 26, 0))
    rig.part("head", g, team=True)
    g = Geo().blob((-3.0, -11.0, 50.0), (3.4, 2.0, 3.4), p=2.4)
    rig.part("head", g, K.STAR_TRIM, finish="metal", outline=0.6)

    K.arm_parts(rig, "r", bracer=K.STAR)
    K.shoulders(rig, r=(7.6, 6.4, 6.0))

    # the halberd along +X from the grip
    gx, gy, gz = G0
    g = Geo().capsule((gx - BACK, gy, gz), (HEAD_X, gy, gz), 1.5)
    rig.part("pole", g, K.VOID_LT, finish="gloss", outline=0.8)
    g = Geo()
    for x in (gx - BACK, gx + FORE + 5, HEAD_X - 2.0):
        g.lathe([(0, -1.6), (2.4, -1.4), (2.4, 1.4), (0, 1.6)], (x, gy, gz), (x + 1, gy, gz), segs=12)
    rig.part("pole", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # crescent blade under the head (points down-forward), and a back spike on top
    blade = [(HEAD_X - 4, gz - 1.5), (HEAD_X + 8, gz - 1.5), (HEAD_X + 14, gz - 6), (HEAD_X + 15, gz - 13),
             (HEAD_X + 11, gz - 19), (HEAD_X + 7, gz - 13), (HEAD_X + 2, gz - 9), (HEAD_X - 4, gz - 6)]
    g = Geo().slab(blade, gy, 2.4)
    rig.part("pole", g, K.VIOLET, finish="metal", outline_hex=K.VIOLET_DK)
    edge = [(HEAD_X + 13.2, gz - 6.4), (HEAD_X + 15.8, gz - 13.0), (HEAD_X + 11.4, gz - 20.2),
            (HEAD_X + 12.6, gz - 13.2)]
    g = Geo().slab(edge, gy - 0.4, 2.8)
    rig.part("pole", g, glow=K.VIOLET_CORE, outline=0)
    g = Geo().slab([(HEAD_X - 2, gz + 1.5), (HEAD_X + 4, gz + 1.5), (HEAD_X + 1, gz + 11)], gy, 2.2)
    rig.part("pole", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    # the prongs and the floating gravity orb with a mint ring
    g = Geo()
    for dz in (4.2, -4.2):
        g.capsule((HEAD_X, gy, gz), (HEAD_X + 6, gy, gz + dz * 2.0), 1.2)
        g.capsule((HEAD_X + 6, gy, gz + dz * 2.0), (HEAD_X + 20, gy, gz + dz * 0.6), 1.2, 0.5)
    rig.part("pole", g, K.STAR_TRIM, finish="metal", outline=0.7)
    K.orb(rig, "pole", ORB, 5.4, color=K.VIOLET_GLOW, core=K.VIOLET_CORE, name="orb", line=K.VIOLET)
    g = Geo()
    ox, oy, oz = ORB
    for i in range(16):
        a0, a1 = 2 * math.pi * i / 16, 2 * math.pi * (i + 1) / 16
        g.capsule((ox + 8.6 * math.cos(a0), oy - 0.6 + 3.0 * math.sin(a0), oz + 2.2 * math.sin(a0)),
                  (ox + 8.6 * math.cos(a1), oy - 0.6 + 3.0 * math.sin(a1), oz + 2.2 * math.sin(a1)), 0.8, segs=6, rings=2)
    rig.part("orb", g, glow=K.MINT, outline=0)
    # hands on the shaft
    g = Geo().blob((gx + 0.4, gy - 1.0, gz), (3.6, 3.2, 3.6), p=2.4)
    g.blob((gx + FORE, gy + 3.0, gz), (3.4, 3.0, 3.4), p=2.4)
    rig.part("pole", g, K.STAR, finish="gloss", outline_hex=K.STAR_TRIM)
    rig.track("bladeTip", "pole", TIP)
    rig.track("_foot", "shin_r", (3.2, -6.0, 0.5))
    K.sparks(rig, "pole", (HEAD_X + 12, gy - 1, gz - 10), color=K.VIOLET_GLOW, size=1.4, name="sparks")


# -- poses ---------------------------------------------------------------------------------
def hold(gx, gz, deg):
    """Grip at (gx, gz) torso space, the halberd pointing `deg` degrees."""
    return K.hold2("pole", G0, FORE, gx, gz, deg, near_off=(-0.4, 0.2), far_off=(-0.6, -0.4))


STANCE = merge(hold(5.0, 25.0, 28.0), {"torso": {"r": -2}})


def _idle(f):
    c, lag = K.idle_wave(f)
    return merge(STANCE, K.idle_body(f, bob=1.1, sq=0.035), {
        "pole": {"r": 1.2 * lag},
        "orb": {"z": 1.2 * c, "s": 1.0 + 0.04 * lag},
    })


def _walk(f):
    pose, p, bl = K.walk_legs(f, stride=28, lean=-6)
    return merge(STANCE, pose, {"pole": {"r": 2.0 * bl, "z": 0.6 * bl}, "orb": {"z": -1.0 * bl}})


def _attack(f):
    # 0 brace (squat), 1 heave up, 2 held extreme (halberd behind the head), 3 smear,
    # 4 held impact (blade down in front, orb flares), 5-7 recovery
    gx = pick(f, [2, -2, -5, 6, 12, 10, 8, 6])
    gz = pick(f, [22, 34, 40, 34, 22, 23, 24, 25])
    deg = pick(f, [34, 78, 100, 50, 14, 16, 20, 26])
    pose = merge(hold(gx, gz, deg), {
        "body": dict(squash(pick(f, [-0.07, 0.04, 0.07, 0.03, -0.15, -0.08, -0.03, 0])),
                     x=pick(f, [-1, -2, -3, 2, 6, 5, 2.5, 0.5])),
        "hips": {"z": pick(f, [-1.4, 0, 0.8, 0, -2.6, -1.8, -0.6, 0])},
        "torso": {"r": pick(f, [0, 6, 10, -6, -18, -14, -8, -3])},
        "head": {"r": pick(f, [0, 4, 7, -2, -7, -5, -3, 0])},
        "thigh_r": {"r": pick(f, [8, 0, -6, 12, 26, 22, 10, 2])},
        "shin_r": {"r": pick(f, [-6, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [-8, 4, 8, -8, -18, -14, -6, 0])},
        "shin_l": {"r": pick(f, [-4, -4, -6, -6, -8, -6, -2, 0])},
        "orb": {"s": pick(f, [1, 1, 1.1, 1.2, 1.35, 1.15, 1.05, 1])},
        "sparks": {"show": f == 4},
    })
    if f in (3, 4):
        K.squint(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, K.hit_body(f), {"pole": {"r": 10 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), K.die_limbs(f), {
        "pole": {"r": pick(f, [30, 45, 50])},
        "orb": {"s": pick(f, [0.8, 0.5, 0.3]), "z": pick(f, [4, 8, 10])},
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
