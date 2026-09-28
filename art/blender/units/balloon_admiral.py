"""Balloon Admiral: Gunpowder Age Legendary air bomber (DESIGN A5.4), flyer rig (A11).
Bombs (proj.bomb) dropped below, ~200 lu. Rendered at 1-1.25x (Legendary size budget).

Look (A11, Gunpowder palette): a big hot-air balloon whose envelope has team gores
alternating with cream gores, a brass crown ring with a streaming team pennant, cream
rigging down to a wicker gondola with a dark-wood rim, a rack of black bombs along its side
and sandbags that swing. In the gondola stands the Admiral: a white-whiskered old salt in a
team coat with brass epaulettes and a huge black bicorne worn athwart (brass edge, team
cockade), peering through a brass telescope. Origin (the feet anchor) is the gondola's
lowest point; the battle view lifts air units to flight altitude.

Clips: idle hovers (the envelope breathes one pose behind the gondola), walk is the flight
loop (lean into the wind, bob, pennant and sandbags trailing), attack points the telescope
down, lowers a bomb out of the floor hatch (held, fuse sparking), releases it on the impact
frame (proj.bomb spawns at the exported per-frame `muzzle` anchor) and the lightened balloon
lurches up; hit rocks the gondola; die rips the envelope, which sags and collapses.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "balloon_admiral"
NAME = "Balloon Admiral"
HEIGHT_LU = 200
YAW_DEG = -10.0
CANVAS = (300, 424)
FEET = (158, 380)
ANCHORS = {"head": (0, 200), "hitCenter": (0, 110), "muzzle": (0, -8)}

WICKER = "#B89E7E"
WICKER_DK = "#8F785C"
ROPE = "#D8CCB0"
SAND = "#C8B89A"
HAIR = "#ECE8E0"
BOMB = "#34363C"

ENV_C = 118.0            # envelope: widest ring height
NECK_Z = 74.0
GON_TOP = 22.0
HATCH = (2.0, 0.0, -1.0)  # the bomb hangs here below the gondola floor


def _envelope_profile():
    # (radius, z) from the neck up: a pear, widest at ENV_C, rounded crown
    prof = [(0.0, NECK_Z - 1.0), (7.0, NECK_Z), (9.0, NECK_Z + 6), (18.0, NECK_Z + 16),
            (30.0, NECK_Z + 28), (39.0, ENV_C - 10), (43.0, ENV_C), (44.0, ENV_C + 12),
            (42.0, ENV_C + 26), (37.0, ENV_C + 40), (28.0, ENV_C + 53), (16.0, ENV_C + 61),
            (0.0, ENV_C + 64)]
    return prof


def build(rig):
    rig.joint("unit", "root", (0, 0, 0))
    rig.joint("gondola", "unit", (0, 0, 10))
    rig.joint("envelope", "unit", (0, 0, NECK_Z))

    # -- envelope: team body with cream gores, brass crown and a team pennant ------------------
    prof = _envelope_profile()
    g = Geo().lathe(prof, segs=36)
    rig.part("envelope", g, team=True)
    n = 12
    for i in range(0, n, 2):
        t1, t2 = 2 * math.pi * i / n + 0.26, 2 * math.pi * (i + 1) / n + 0.26
        g = Geo().lathe([(r * 1.012, z) for r, z in prof], segs=36)
        g.clip((0, 0, 0), (math.sin(t1), -math.cos(t1), 0))
        g.clip((0, 0, 0), (-math.sin(t2), math.cos(t2), 0))
        rig.part("envelope", g, B.CREAM, outline=0.8)
    g = Geo().lathe([(9.5, -1.4), (10.2, 0), (9.5, 1.4), (8.0, 1.4), (8.0, -1.4)], (0, 0, NECK_Z + 5),
                    (0, 0, NECK_Z + 6), segs=24)                       # neck band
    g.lathe([(0, -1.0), (15.5, -1.0), (16.5, 0.6), (15.0, 2.2), (0, 2.2)], (0, 0, ENV_C + 61.2),
            (0, 0, ENV_C + 62.2), segs=24)                             # crown cap
    rig.part("envelope", g, B.BRASS, finish="metal", outline=0.8)
    g = Geo().capsule((0, 0, ENV_C + 62), (0, 0, ENV_C + 78), 1.0)
    g.sphere((0, 0, ENV_C + 79), 1.8, cuts=3)
    rig.part("envelope", g, B.BRASS, finish="metal", outline=0.7)
    pz = ENV_C + 76.5
    rig.secondary("pennant", "envelope", (0, 0, pz), (-20, 0, pz - 3), max_deg=14, gain=1.3, rot_gain=0.4)
    pts = [(0.0, 0.0), (-22.0, -1.2), (-16.5, -4.8), (-22.0, -8.8), (0.0, -9.8)]
    g = Geo().slab([(x, pz + z) for x, z in pts], 0.0, 1.2)
    rig.part("pennant", g, team=True, outline=0.8)

    # -- rigging: cream ropes from the neck band to the gondola rim ----------------------------
    g = Geo()
    for x, y in ((15.0, -9.0), (-15.0, -9.0), (15.0, 9.0), (-15.0, 9.0)):
        g.capsule((x, y, GON_TOP + 10), (x * 0.52, y * 0.8, NECK_Z + 5), 0.7)
    rig.part("gondola", g, ROPE, outline=0.5)

    # -- gondola: wicker tub with a dark rim, woven bands, a bomb rack and sandbags ------------
    g = Geo().blob((0, 0, 21.0), (19.0, 12.0, 11.0), p=3.4, taper=(0.86, 1.0))
    rig.part("gondola", g, WICKER, finish="hair")
    g = Geo()
    for z in (15.5, 21.5, 27.0):
        g.blob((0, 0, z), (19.2 * (0.9 + 0.1 * (z - 10) / 22), 12.2, 0.9), p=3.4)
    rig.part("gondola", g, WICKER_DK, outline=0)
    g = Geo().blob((0, 0, 32.0), (20.4, 13.2, 1.8), p=3.6)
    rig.part("gondola", g, B.WOOD)
    g = Geo().blob((0, 0, 32.4), (8.6, 13.4, 1.9), p=3.6)             # team rail band at the front
    g.clip((-8.0, 0, 0), (-1, 0, 0))
    rig.part("gondola", g, team=True, outline=0.6)
    g = Geo()
    for x in (-10.5, -3.5, 3.5, 10.5):                               # bomb rack on the near side
        g.sphere((x, -13.8, 20.5), 3.2, cuts=4)
    rig.part("gondola", g, BOMB, finish="gloss")
    g = Geo()
    for x in (-10.5, -3.5, 3.5, 10.5):
        g.capsule((x + 1.4, -15.8, 23.0), (x + 2.4, -16.2, 25.0), 0.5)
    rig.part("gondola", g, B.TAN, outline=0)
    for i, (x, y) in enumerate(((-17.5, -8.0), (17.5, -8.0))):
        j = f"bag{i}"
        rig.secondary(j, "gondola", (x, y, 31.0), (x, y, 17.0), max_deg=18, gain=1.2)
        g = Geo().capsule((x, y, 31.0), (x, y, 20.0), 0.5)
        rig.part(j, g, ROPE, outline=0.4)
        g = Geo().blob((x, y, 17.5), (3.2, 3.2, 4.0), p=2.2, taper=(1.0, 0.7))
        rig.part(j, g, SAND)

    # -- the admiral, 1.15x, standing in the gondola --------------------------------------------
    rig.joint("crew", "gondola", (2.0, 0, 8.0), scale=1.15)
    rig.joint("body", "crew", (2.0, 0, 8.0))
    rig.joint("torso", "body", (2.0, 0, 24.0))
    rig.joint("head", "torso", (3.0, 0, 46.0))
    ox, oz = 2.0, 8.0   # admiral space: the biped layout from B shifted to the crew origin

    def P(x, y, z):
        return (ox + x, y, oz + z)

    g = Geo().blob(P(0, 0, 28.0), (10.6, 9.8, 11.8), p=2.4, taper=(1.08, 0.94))
    rig.part("torso", g, team=True)
    g = Geo().blob(P(5.2, -1.0, 27.5), (6.4, 4.8, 8.8), p=2.6, taper=(1.05, 0.7))
    g.clip(P(7.6, 0, 0), (-1, 0, 0))
    rig.part("torso", g, B.CREAM)
    g = Geo()
    for z in (32.0, 27.5):
        g.sphere(P(11.6, -2.8, z), 1.0, cuts=3)
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.5)
    g = Geo().blob(P(1.2, 0, 37.2), (6.8, 7.2, 2.4), p=2.4)
    rig.part("torso", g, B.CREAM)
    g = Geo().blob(P(2, 0, 48.5), (11.6, 11.0, 11.4), p=2.3)
    g.blob(P(6, 0, 43.0), (8.6, 9.4, 6.2), p=2.2)
    g.blob(P(13.8, -0.6, 47.4), (3.8, 3.2, 3.6), p=2.0)
    rig.part("head", g, B.SKIN)
    for y in (-4.4, 4.2):
        g = Geo().blob(P(11.0, y, 49.8), (3.2, 3.0, 3.6))
        rig.part("head", g, B.EYE, highlight=False)
        g = Geo().blob(P(13.6, y - 0.4, 49.4), (1.2, 1.8, 1.8))
        rig.part("head", g, B.PUPIL, outline=0)
    g = Geo().blob(P(13.4, -4.0, 43.8), (3.0, 5.0, 2.2), p=2.2, rot=(24, 0, 0))    # walrus moustache
    g.blob(P(13.4, 3.0, 43.8), (3.0, 5.0, 2.2), p=2.2, rot=(-24, 0, 0))
    g.blob(P(4.5, -10.2, 44.5), (4.6, 2.4, 6.0), p=2.2)                            # whiskers
    g.blob(P(-5.8, 0, 47.0), (5.6, 10.2, 6.4), p=2.2)
    g.capsule(P(10.0, -7.8, 55.0), P(13.0, -1.0, 53.4), 1.8).capsule(P(13.0, -1.0, 53.4), P(10.0, 6.0, 55.0), 1.8)
    rig.part("head", g, HAIR, finish="hair")
    B.bicorne(rig, joint="head", c=P(0.5, 0, 57.5), scale=1.2)
    # epaulettes and arms: the near arm holds the telescope, the far hand grips the rail
    rig.joint("arm_r", "torso", P(0, -12.5, 36))
    rig.joint("fore_r", "arm_r", P(0, -12.5, 28))
    rig.joint("hand_r", "fore_r", P(0, -12.5, 21))
    g = Geo().capsule(P(0, -12.5, 36), P(0, -12.5, 28), 4.3, 4.0)
    rig.part("arm_r", g, team=True)
    g = Geo().capsule(P(0, -12.5, 28), P(0, -12.5, 23), 4.0, 3.8)
    g.blob(P(0, -12.5, 24.4), (5.0, 5.0, 2.0), p=2.6)
    rig.part("fore_r", g, B.CREAM)
    g = Geo().blob(P(0.4, -12.5, 20.6), (4.2, 4.0, 4.2), p=2.3)
    rig.part("hand_r", g, B.CREAM)
    for y in (-12.8, 12.0):
        g = Geo().blob(P(0, y, 38.0), (6.6, 5.4, 3.6), p=2.4)
        rig.part("torso" if y > 0 else "arm_r", g, B.BRASS, finish="metal", outline=0.8)
    # telescope, modelled pointing up out of the fist (three brass draws)
    hx, hy, hz = P(0.4, -13.6, 21.0)
    g = Geo().lathe([(0, -3.0), (2.3, -3.0), (2.3, 6.0), (1.9, 6.2), (1.9, 12.0), (1.5, 12.2),
                     (1.5, 17.0), (2.0, 17.4), (2.0, 19.0), (0, 19.0)], (hx, hy, hz), segs=14)
    rig.part("hand_r", g, B.BRASS, finish="metal", outline_hex=B.WOOD)
    g = Geo().lathe([(0, -0.8), (2.5, -0.8), (2.5, 3.0), (0, 3.0)], (hx, hy, hz - 1.0), segs=14)
    rig.part("hand_r", g, B.BLACK, outline=0.6)

    # the bomb that drops through the floor hatch in the attack
    rig.joint("bomb", "gondola", HATCH, hidden=True)
    bx, by, bz = HATCH
    g = Geo().sphere((bx, by - 2, bz - 4.0), 5.2, cuts=5)
    rig.part("bomb", g, BOMB, finish="gloss", outline_hex="#50535A")
    g = Geo().capsule((bx + 2.0, by - 2, bz), (bx + 3.2, by - 2, bz + 2.6), 0.7)
    rig.part("bomb", g, B.TAN, outline=0)
    g = Geo().star((bx + 3.4, by - 4, bz + 3.0), 2.8, 1.1, 1.0, points=5)
    rig.part("bomb", g, glow=B.FIRE, outline=0)
    rig.track("muzzle", "bomb", (bx, by, bz - 4.0))

    # the tear in the envelope on death (a dark hole and a puff of escaping air)
    rig.joint("tear", "envelope", (30.0, -30.0, ENV_C + 20), hidden=True)
    g = Geo().blob((26.0, -34.0, ENV_C + 22), (7.0, 3.0, 9.0), p=2.2, rot=(0, 0, -40))
    rig.part("tear", g, B.WOOD, outline=0.6)


# -- poses ---------------------------------------------------------------------------------
def scope(a, f, w):
    """The near arm: upper arm and forearm directions and the telescope's direction."""
    return {"arm_r": {"r": a + 90.0}, "fore_r": {"r": f - a},
            "hand_r": {"r": w - 90.0 - (f + 90.0)}}


STANCE = merge(scope(-20, 40, 5), {"torso": {"r": -2}})


def _idle(f):
    c, lag = [-1.0, -0.45, 0.45, 1.0][f], [-1.0, -1.0, -0.45, 0.45][f]
    return merge(STANCE, {
        "unit": {"z": 2.0 * c},
        "envelope": dict(squash(0.025 * lag), z=-0.8 * lag, r=0.6 * lag),
        "gondola": {"r": 1.2 * c},
        "torso": {"r": 1.2 * lag},
        "head": {"r": -2.0 * lag},
        "arm_r": {"r": 2.0 * lag},
    })


WALK_MS = 100


def _walk(f):
    # flight: lean into the wind, a slow double bob, the gondola swings a beat behind
    p = 2 * math.pi * f / 8
    pl = p - 2 * math.pi / 8
    return merge(STANCE, {
        "unit": {"z": 2.2 * math.sin(p), "r": -3.0},
        "envelope": dict(squash(0.02 * math.sin(pl)), r=1.5 * math.cos(p)),
        "gondola": {"r": 3.0 * math.sin(pl)},
        "torso": {"r": -3.0 + 1.5 * math.sin(pl)},
        "head": {"r": 1.5 * math.cos(pl)},
        "arm_r": {"r": 3.0 * math.sin(pl)},
    })


ATTACK_MS = [83, 83, 167, 83, 83, 83, 125, 125]
ATTACK_IMPACT = 3


def _attack(f):
    # 0 the admiral points the telescope down at the target, 1 the bomb lowers out of the
    # hatch, 2 held (fuse sparks), 3 release: the bomb is gone, the balloon lurches up
    # (stretch), 4 bounce (squash), 5-7 settle
    pose = merge(scope(pick(f, [-40, -30, -25, 10, 20, 5, -10, -20]),
                       pick(f, [-40, -30, -25, 60, 80, 60, 45, 40]),
                       pick(f, [-55, -60, -60, 75, 90, 45, 20, 5])), {
        "unit": {"z": pick(f, [0, -1.0, -1.5, 3.0, 5.0, 3.0, 1.0, 0])},
        "envelope": dict(squash(pick(f, [0, -0.02, -0.03, 0.05, -0.04, 0.02, -0.01, 0])),
                         z=pick(f, [0, 0, 0, 1.5, -1.0, 0.5, 0, 0])),
        "gondola": {"r": pick(f, [2, 4, 5, -4, -6, -3, 1, 0]),
                    "z": pick(f, [0, 0, 0, -1.5, 0.8, 0, 0, 0])},
        "torso": {"r": pick(f, [-10, -12, -14, 6, 10, 4, 0, -2])},
        "head": {"r": pick(f, [-8, -10, -12, 8, 12, 4, 0, 0])},
        "bomb": {"show": f in (1, 2), "z": pick(f, [0, 0, -3.0, 0, 0, 0, 0, 0])},
    })
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, {
        "unit": {"x": -4.0 * a},
        "gondola": {"r": 8 * a},
        "envelope": dict(squash(-0.05 * a), r=4 * a),
        "torso": {"r": 12 * a}, "head": {"r": 10 * a}, "arm_r": {"r": 20 * a},
    })


def _die(f):
    # the envelope tears and sags; the whole balloon tips over and drops (the sim does the
    # crash splash); smaller spin than a biped so the tall shape stays in frame
    d = fx.die_pose(f)["body"]
    return merge(STANCE, {
        "unit": {"x": d["x"], "z": pick(f, [4.0, -2.0, -4.0]), "r": d["r"] * 0.35,
                 "s": d.get("s", 1.0)},
        "envelope": dict(sz=pick(f, [0.9, 0.62, 0.4]), sx=pick(f, [1.06, 1.18, 1.22]),
                         sy=pick(f, [1.06, 1.18, 1.22]), r=pick(f, [8, 16, 22]),
                         z=pick(f, [-2, -8, -14])),
        "tear": {"show": True},
        "gondola": {"r": pick(f, [10, 16, 20])},
        "torso": {"r": pick(f, [20, 12, 8])}, "head": {"r": pick(f, [16, -6, -6])},
        "arm_r": {"r": pick(f, [90, 60, 60])},
    })


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=ATTACK_IMPACT, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
