"""Standard Bearer: Bronze Age support (A17.9). Damage aura (+15%), throws darts, ~70 lu.

Look (A17.12): a veteran in a conical aged-bronze pilos helmet, a linen tunic with a plum
belt sash and a team cloak clasped on the shoulders that streams behind him, greaves and
sandals, a plum-and-sandstone frame drum at the hip. In the far hand a tall eagle standard:
a pole with a crossbar and a big team banner (sandstone fringe, a lambda emblem) that swings
with follow-through, crowned by an aged-bronze eagle with spread wings (the aura reads from
far away). The near hand throws darts. The attack plants and dips the standard forward (the
banner wave) while the near arm throws a dart; the dart leaves at the per-frame `muzzle`.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "standard_bearer"
NAME = "Standard Bearer"
HEIGHT_LU = 70
CANVAS = (300, 322)
FEET = (142, 292)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 32)}

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand: darts (modelled along +X)
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand: the standard (modelled pointing up)
POLE_UP, POLE_DOWN = 78.0, 18.0
DART_F, DART_B = 26.0, 7.0
SMEAR = {"joint": "dart", "inner": (HR[0] + DART_F - 10, HR[1] - 1.0, HR[2]),
         "outer": (HR[0] + DART_F, HR[1] - 1.0, HR[2]), "color": B.WOOD, "taper": 0.4, "start": 0.2, "behind": 4.0}


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig)

    # the standard in the far hand (built first: it sits behind the body)
    hx, hy, hz = HL
    py = hy + 0.6
    rig.joint("standard", "hand_l", HL)
    g = Geo().capsule((hx, py, hz - POLE_DOWN), (hx, py, hz + POLE_UP), 1.3, 1.2, segs=12)
    rig.part("standard", g, B.WOOD_DK, outline=0.8)
    top = hz + POLE_UP
    g = Geo().capsule((hx - 13.0, py, top - 8.0), (hx + 13.0, py, top - 8.0), 1.1)
    g.lathe([(1.8, 0), (1.9, 2.2), (0, 3.0)], (hx, py, hz - POLE_DOWN + 0.5), (hx, py, hz - POLE_DOWN - 2.5), segs=10)
    rig.part("standard", g, B.AGED_DK, finish="metal", outline=0.6)
    # the banner hangs from the crossbar and swings (follow-through)
    rig.secondary("banner", "standard", (hx, py - 1.2, top - 8.0), (hx, py - 1.2, top - 34.0), max_deg=12,
                  gain=1.0)
    bz = top - 9.0
    pts = [(hx - 12.0, bz), (hx + 12.0, bz), (hx + 12.0, bz - 24.0), (hx + 6.0, bz - 29.0), (hx, bz - 25.0),
           (hx - 6.0, bz - 29.0), (hx - 12.0, bz - 24.0)]
    g = Geo().slab(pts, py - 1.4, 1.6)
    rig.part("banner", g, team=True, outline=0.8)
    g = Geo()
    for i in range(7):
        x = hx - 11.0 + i * 22.0 / 6
        g.blob((x, py - 2.4, bz - 0.8), (1.6, 0.8, 1.5), p=2.2)
    g.capsule((hx - 5.0, py - 2.5, bz - 20.0), (hx, py - 2.6, bz - 8.0), 1.4)
    g.capsule((hx, py - 2.6, bz - 8.0), (hx + 5.0, py - 2.5, bz - 20.0), 1.4)
    rig.part("banner", g, B.SAND_LT, outline=0.5)
    # the eagle on top: body, spread wings, head with a polished beak, on a small plinth
    ex, ez = hx, top + 2.0
    g = Geo().blob((ex, py, ez - 0.8), (3.0, 3.0, 1.6), p=3.0)
    rig.part("standard", g, B.AGED_DK, finish="metal", outline=0.6)
    g = Geo().blob((ex + 0.5, py, ez + 5.2), (3.6, 3.2, 5.0), p=2.2, rot=(0, 18, 0))
    g.sphere((ex + 3.0, py, ez + 10.8), 2.6, cuts=3)
    for s in (-1, 1):
        k = 1.0 if s < 0 else 0.8
        g.slab([(ex - 1.0, ez + 7.0), (ex - 3.0 + 3.0 * s, ez + 7.0 + 14.0 * k), (ex - 7.0 + 3.0 * s, ez + 7.0 + 12.0 * k),
                (ex - 8.0 + 3.0 * s, ez + 7.0 + 8.0 * k), (ex - 11.0 + 3.0 * s, ez + 7.0 + 5.0 * k),
                (ex - 10.0 + 3.0 * s, ez + 5.0), (ex - 4.0, ez + 3.0)],
               py + 2.6 * s, 1.4)
    g.slab([(ex - 2.0, ez + 1.5), (ex - 7.5, ez - 1.0), (ex - 7.0, ez + 2.0), (ex - 2.0, ez + 4.0)], py, 1.6)
    rig.part("standard", g, B.AGED, finish="metal", outline=0.7)
    g = Geo().lathe([(1.2, 0), (0.7, 1.6), (0, 3.0)], (ex + 5.2, py, ez + 10.6), (ex + 8.2, py, ez + 9.6), segs=8)
    rig.part("standard", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    g = Geo().sphere((ex + 4.0, py - 2.2, ez + 11.4), 0.7, cuts=2)
    rig.part("standard", g, B.PUPIL, outline=0)

    # team cloak clasped on the shoulders, streaming back (follow-through)
    rig.secondary("cloak", "torso", (-6.0, 0, 38.0), (-14.0, 0, 12.0), max_deg=10, gain=0.9)
    g = Geo().blob((-8.4, 0, 27.0), (4.4, 12.4, 12.8), p=2.4, taper=(1.3, 0.8), shift=(0.2, 0))
    g.blob((-2.0, 0, 37.8), (8.6, 12.8, 3.2), p=2.6)
    rig.part("cloak", g, team=True)
    # linen tunic with a plum sash, bronze clasp
    g = Geo().blob((0.2, 0, 27.5), (10.4, 9.6, 11.6), p=2.4, taper=(1.1, 0.92))
    rig.part("torso", g, B.LINEN)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=9, gain=0.8)
    g = Geo().blob((0.6, 0, 14.8), (11.4, 10.4, 5.4), p=2.4, taper=(1.14, 0.92))
    rig.part("hem", g, B.LINEN)
    g = Geo().blob((0.6, 0, 10.2), (11.6, 10.6, 1.1), p=3.0)
    rig.part("hem", g, B.PLUM, outline=0.6)
    g = Geo().blob((0.4, 0, 20.6), (11.2, 10.3, 2.2), p=3.2)
    g.capsule((10.0, -6.0, 36.0), (-2.0, 9.0, 22.0), 1.6)
    rig.part("torso", g, B.PLUM)
    g = Geo().sphere((7.6, -8.6, 37.2), 1.7, cuts=3)
    rig.part("torso", g, B.BRONZE_HI, finish=B.POLISH, outline=0.5)
    # frame drum at the near hip
    rig.joint("drum", "hips", (2.0, -12.0, 16.0))
    g = Geo().lathe([(0, -2.2), (7.4, -2.2), (7.8, 0), (7.4, 2.2), (0, 2.2)], (2.0, -12.0, 15.0), (2.0, -13.0, 15.0),
                    segs=24)
    rig.part("drum", g, B.PLUM)
    g = Geo().lathe([(0, 0), (6.4, 0), (6.2, 0.6), (0, 0.8)], (2.0, -14.3, 15.0), (2.0, -15.3, 15.0), segs=24)
    rig.part("drum", g, B.SAND_LT, outline=0.5)

    # head: moustache, pilos helmet with a polished rim and a knob
    B.head_ball(rig)
    B.face(rig, cx=12.0, cz=50.0, brow=B.HAIR, eye_r=(3.2, 3.0, 3.8))
    g = Geo().blob((12.4, -3.4, 44.0), (2.6, 3.6, 1.8), p=2.2, rot=(16, 0, 0))
    g.blob((12.4, 2.4, 44.0), (2.6, 3.6, 1.8), p=2.2, rot=(-16, 0, 0))
    g.blob((-6.0, 0, 46.4), (5.4, 9.2, 6.0), p=2.2)
    rig.part("head", g, B.HAIR, finish="hair")
    g = Geo().lathe([(0, 0), (12.6, 0), (12.0, 3.0), (8.6, 10.0), (3.6, 15.0), (0, 16.0)], (1.0, 0, 53.6),
                    (0.0, 0, 69.6), segs=28, squash=(1.0, 0.95))
    rig.part("head", g, B.AGED, finish="metal")
    g = Geo().blob((1.0, 0, 53.8), (13.2, 12.6, 1.3), p=2.8)
    g.sphere((0.0, 0, 70.4), 1.8, cuts=3)
    rig.part("head", g, B.BRONZE, finish=B.POLISH, outline=0.6)

    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.0, r1=3.6)
    # the dart in the near fist, modelled level along +X; hidden once thrown
    hx, hy, hz = HR
    rig.joint("dart", "hand_r", (hx, hy - 1.0, hz))
    g = Geo().capsule((hx - DART_B, hy - 1.0, hz), (hx + DART_F - 5.0, hy - 1.0, hz), 0.85, 0.8, segs=10)
    rig.part("dart", g, B.WOOD, outline=0.6)
    g = Geo().lathe([(0, 0), (1.1, 0.6), (1.7, 2.2), (1.0, 4.4), (0, 6.2)], (hx + DART_F - 6.0, hy - 1.0, hz),
                    (hx + DART_F, hy - 1.0, hz), segs=10, squash=(1.0, 0.5))
    rig.part("dart", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    rig.track("muzzle", "hand_r", (hx + DART_F * 0.6, hy - 1.0, hz))
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def throw(a, f, w):
    return B.arm("r", a, f, w, w_rest=0.0)


def standard(a, f, w):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(throw(-80, -20, 20), standard(-40, 20, 86), {"torso": {"r": -2}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), {
        "arm_r": {"r": 2 * lag}, "arm_l": {"r": 1.5 * lag}, "hand_l": {"r": -1.5 * lag},
    })


def _walk(f):
    pose, p, bl = B.walk_legs(f, stride=38.0, lift=62.0)
    return merge(STANCE, pose, {
        "arm_r": {"r": 10 * math.cos(p)}, "hand_r": {"r": 3 * bl},
        "arm_l": {"r": -3 * math.cos(p)}, "hand_l": {"r": 2.0 * bl},
    })


def _attack(f):
    # 0 raise the standard and draw the dart back, 1 wind back, 2 held extreme (standard
    # tilted back, dart cocked), 3 whip (smear) as the standard dips forward, 4 release (dart
    # gone, projectile at `muzzle`), banner dipped forward, lunge; 5-7 recover and draw a dart
    a = pick(f, [-150, -168, -175, 100, 10, -40, -70, -80])
    b = pick(f, [165, 176, -178, 40, 2, -40, -30, -20])
    c = pick(f, [14, 16, 18, 8, -6, -30, 10, 20])
    tr = pick(f, [8, 12, 16, 0, -18, -14, -6, -2])
    sw = pick(f, [95, 100, 104, 88, 78, 80, 85, 88]) - tr
    sq = pick(f, [-0.05, 0.0, 0.06, 0.04, -0.12, -0.06, -0.02, 0.0])
    pose = merge(throw(a, b, c), standard(pick(f, [-30, -20, -14, -40, -44, -44, -42, -40]),
                                          pick(f, [30, 40, 44, 16, 10, 12, 16, 20]), sw), {
        "body": dict(squash(sq), x=pick(f, [-1.5, -2.5, -3.5, 1.0, 5.0, 4.0, 1.5, 0])),
        "hips": {"z": pick(f, [-0.6, 0.0, 0.8, 0.2, -2.2, -1.5, -0.5, 0])},
        "torso": {"r": tr},
        "head": {"r": pick(f, [-4, -6, -8, -2, 8, 6, 2, 0])},
        "thigh_r": {"r": pick(f, [-6, -10, -12, 8, 22, 16, 6, 0])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [6, 10, 12, -6, -14, -10, -4, 0])},
        "dart": {"hide": f in (4, 5)},
    })
    if f == 3:
        pose["dart"]["sx"] = 1.2
    if f in (3, 4):
        B.yell(pose)
    return pose


ATTACK_MS = [83, 83, 167, 42, 125, 83, 100, 100]


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_r": {"r": 16 * a}, "arm_l": {"r": 10 * a}, "hand_l": {"r": 8 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_r": {"r": pick(f, [80, 60, 60])},
        "arm_l": {"r": pick(f, [8, 4, 4])}, "hand_l": {"r": pick(f, [-10, -14, -14])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=4, smear=3, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
