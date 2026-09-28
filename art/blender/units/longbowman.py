"""Longbowman: Medieval Age ranged (DESIGN A5.3). Longbow, arrow, ~68 lu.

Look (A11): a wiry archer in a team hood with a long liripipe tail and a team shoulder
cape, a leather jerkin over a team tunic, slate hose and brown boots, a leather quiver of
parchment-fletched arrows on his back, and a longbow as tall as he is, held diagonally in
the far hand so the bow is its own shape in every frame. The attack reaches for an arrow,
nocks, draws to the cheek (held), releases with a string snap and a bow-arm kick, and
settles. The projectile (proj.arrow) spawns at the per-frame `muzzle` anchor on the
release frame.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "longbowman"
NAME = "Longbowman"
HEIGHT_LU = 68
CANVAS = (256, 232)
FEET = (104, 206)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32), "muzzle": (33, 34)}  # muzzle: release frame

SKIN = "#EBC4A0"
HAIR = "#5A3F2C"
LEATHER = "#7A6352"
DARK_LEATHER = "#584839"
HOSE = "#6B7682"
SLEEVE = "#61704D"
BOOT = "#4F433B"
WOOD = "#B89C78"
GRIP = "#8E2A4A"
STRING = "#EDE6D6"
PARCH = "#E8DFC8"
STEEL = "#A7B0BB"
GOLD = "#D4A437"

HL = (0.0, B.ARM_Y["r"] - 1.5, B.HAND_Z)   # bow hand (near side, so bow and arrow read)
BOW_HALF = 34.0                       # grip to tip
BOW_BEND = 6.0                        # tips sit this far behind the grip (toward the archer)
DRAWS = (0.0, 9.0, 17.0)              # string draw beyond the tips (rest, half, full)
ARROW = 34.0
AZ, AY = 4.5, 4.5   # the arrow rides above the fist and in front of the bow arm
SHOULDER_L = (0.0, B.SHOULDER_Z)
SHOULDER_R = (0.0, B.SHOULDER_Z)


def _bow_x(z):
    return -BOW_BEND * (z / BOW_HALF) ** 2


def build(rig):
    B.skeleton(rig)
    B.legs(rig, HOSE, BOOT, cuff=DARK_LEATHER)

    # quiver on the back (drawn first so the body covers its lower end)
    g = Geo().capsule((-9.5, 5.0, 22.0), (-13.5, 5.0, 44.0), 3.8, 4.2)
    rig.part("torso", g, DARK_LEATHER)
    g = Geo()
    for dx, dy in ((0, -1.2), (-2.6, 1.0), (2.2, 1.2)):
        g.blob((-14.2 + dx, 5.0 + dy, 48.5), (1.4, 1.2, 3.4), p=2.2, rot=(0, -12, 0))
    rig.part("torso", g, PARCH, outline=0.8)

    # torso: team tunic, leather jerkin, belt
    g = Geo().blob((0, 0, 27.0), (10.2, 9.4, 11.6), p=2.3, taper=(1.12, 0.92))
    rig.part("torso", g, team=True)
    rig.secondary("hem", "hips", (0.5, 0, 17.5), (0.5, 0, 9.0), max_deg=8, gain=0.7)
    g = Geo().blob((0.6, 0, 14.8), (11.4, 10.4, 4.8), p=2.7, taper=(1.12, 1.0))
    rig.part("hem", g, team=True)
    g = Geo().blob((0.4, 0, 28.5), (10.8, 9.9, 8.4), p=2.8, taper=(1.02, 0.94))
    g.clip((0, 0, 36.0), (0, 0, 1))
    rig.part("torso", g, LEATHER)
    g = Geo().blob((0.4, 0, 20.4), (11.4, 10.4, 1.8), p=3.2)
    rig.part("torso", g, DARK_LEATHER)
    g = Geo().blob((11.3, -2.2, 20.4), (1.2, 2.0, 2.0), p=3.0)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    # quiver strap across the chest
    g = Geo().capsule((9.4, -3.0, 22.5), (4.0, -9.0, 35.5), 1.3)
    rig.part("torso", g, DARK_LEATHER, outline=0.8)

    # head, face, a small goatee, team hood with a cape and a long liripipe tail
    g = Geo().blob((2, 0, 48.5), (11.0, 10.4, 11.2), p=2.3)
    g.blob((13.0, -0.6, 47.6), (2.9, 2.7, 3.0), p=2.0)  # nose
    rig.part("head", g, SKIN)
    B.face(rig, cx=11.8, cz=49.6, brow=HAIR, eye_r=(3.2, 3.0, 3.8))
    g = Geo().blob((11.2, -0.4, 39.6), (3.2, 3.4, 3.0), p=2.2)
    rig.part("head", g, HAIR, finish="hair")
    g = Geo().blob((0.5, 0, 51.5), (12.6, 12.0, 13.0), p=2.3, taper=(1.02, 0.86), shift=(-0.12, 0))
    g.clip((6.8, 0, 50.0), (1, 0, 0.22))
    g.blob((-1.0, 0, 64.5), (6.0, 5.0, 3.6), p=2.2, rot=(0, -20, 0))  # hood point
    rig.part("head", g, team=True)
    g = Geo().blob((0.5, 0, 38.2), (11.0, 11.6, 4.2), p=2.6, taper=(1.1, 0.9))  # hood collar
    g.lathe([(3.4, 0), (0, -4.4)], (8.0, -5.0, 35.2), segs=10)
    rig.part("torso", g, team=True)
    rig.secondary("tail", "head", (-10.0, 0, 55.0), (-24.0, 0, 44.0), max_deg=16, gain=1.1)
    g = Geo().capsule((-10.0, 0, 55.0), (-17.0, 0, 50.5), 3.6, 2.6)
    g.capsule((-17.0, 0, 50.5), (-24.0, 0, 44.0), 2.6, 1.6)
    rig.part("tail", g, team=True)
    # a jaunty parchment feather on the hood
    g = Geo().blob((-6.0, -9.0, 60.5), (7.0, 1.0, 1.9), p=2.0, rot=(0, 28, 0))
    rig.part("head", g, PARCH, outline=0.8)

    # arms: green linen sleeves, leather bracer on the bow arm, bare hands
    B.arm_parts(rig, "r", SLEEVE, hand=SKIN, cuff=LEATHER, glove_finish="matte")
    B.arm_parts(rig, "l", SLEEVE, hand=SKIN, cuff=LEATHER)

    # the longbow in the far hand, modelled upright (rest direction 90): a D-shaped stave
    hx, hy, hz = HL
    g = Geo()
    n = 10
    for i in range(n):
        z0 = -BOW_HALF + 2 * BOW_HALF * i / n
        z1 = -BOW_HALF + 2 * BOW_HALF * (i + 1) / n
        r0 = 0.9 + 1.4 * (1 - abs(z0) / BOW_HALF)
        r1 = 0.9 + 1.4 * (1 - abs(z1) / BOW_HALF)
        g.capsule((hx + _bow_x(z0), hy, hz + z0), (hx + _bow_x(z1), hy, hz + z1), r0, r1, segs=10, rings=2)
    rig.part("hand_r", g, WOOD)
    g = Geo().capsule((hx + 0.2, hy, hz - 4.0), (hx + 0.2, hy, hz + 4.0), 2.8)
    rig.part("hand_r", g, GRIP)
    g = Geo()
    for sgn in (-1, 1):
        g.sphere((hx + _bow_x(BOW_HALF), hy, hz + sgn * BOW_HALF), 1.5, cuts=3)
    rig.part("hand_r", g, DARK_LEATHER, outline=0.8)
    # the bow hand sits in front of the grip
    g = Geo().blob((hx + 0.6, hy - 2.5, hz), (3.8, 2.8, 4.0), p=2.3)
    rig.part("hand_r", g, SKIN)

    # strings: rest, half draw and full draw (one visible per frame)
    tx = hx + _bow_x(BOW_HALF)
    for k, d in enumerate(DRAWS):
        rig.joint(f"string{k}", "hand_r", (tx, hy, hz), hidden=k != 0)
        nock = (tx - d, hy, hz + AZ)
        g = Geo().capsule((tx, hy, hz + BOW_HALF), nock, 0.55, segs=8, rings=2)
        g.capsule(nock, (tx, hy, hz - BOW_HALF), 0.55, segs=8, rings=2)
        rig.part(f"string{k}", g, STRING, outline=0.5, outline_hex=DARK_LEATHER)

    # the arrow, modelled nocked at full draw; poses slide it along the bow
    ax0 = tx - DRAWS[2]
    rig.joint("arrow", "hand_r", (ax0, hy - AY, hz + AZ), hidden=True)
    g = Geo().capsule((ax0, hy - AY, hz + AZ), (ax0 + ARROW - 4, hy - AY, hz + AZ), 1.1, segs=8, rings=2)
    rig.part("arrow", g, WOOD, outline=0.6)
    g = Geo().lathe([(0, 0), (2.7, 0.8), (0, 6.0)], (ax0 + ARROW - 4.5, hy - AY, hz + AZ),
                    (ax0 + ARROW + 4, hy - AY, hz + AZ), segs=10)
    rig.part("arrow", g, STEEL, finish="metal", outline=0.6)
    g = Geo().slab([(ax0 + 1, hz + AZ), (ax0 + 6.5, hz + AZ), (ax0 + 4.5, hz + AZ + 3.1), (ax0 - 0.5, hz + AZ + 2.7)],
                   hy - AY, 0.8)
    g.slab([(ax0 + 1, hz + AZ), (ax0 + 6.5, hz + AZ), (ax0 + 4.5, hz + AZ - 3.1), (ax0 - 0.5, hz + AZ - 2.7)],
           hy - AY, 0.8)
    rig.part("arrow", g, PARCH, outline=0.6)
    # the arrow spawns where its head rests at full draw
    rig.track("muzzle", "hand_r", (ax0 + ARROW + 3, hy - AY, hz + AZ))
    rig.track("_foot", "shin_r", (3.3, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def bow(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


# While drawing, the torso turns side-on (rz 30, the near shoulder forward), so the bow arm
# reaches well clear of the body. The far hand then sits ~24 lu deeper than the string and
# the net 12 degree turn shows it this much further back on screen; the solve compensates.
DRAW_TWIST = 30.0
REACH = 4.0  # the bow shoulder pushes forward while drawing
DEPTH_SHIFT = -24.0 * 0.21


def draw_to(a, f, w, k, flip=False, extra=(0.0, 0.0)):
    """Bow arm (a, f, w), string k drawn, and the near hand solved onto the nock."""
    d = DRAWS[k]
    bx, bz = B.fk_hand(SHOULDER_L, a, f)
    bx += REACH
    t = math.radians(w - 90.0)
    lx, lz = _bow_x(BOW_HALF) - d, AZ   # nock in bow space
    nx = bx + lx * math.cos(t) - lz * math.sin(t) + extra[0]
    nz = bz + lx * math.sin(t) + lz * math.cos(t) + extra[1]
    ra, rf = B.ik2(SHOULDER_R, (nx - DEPTH_SHIFT, nz), elbow_down=not flip)
    pose = merge(bow(a, f, w), B.arm("l", ra, rf), {"arm_r": {"x": REACH}})
    for i in range(3):
        pose[f"string{i}"] = {"show": i == k, "hide": i != k}
    return pose


STANCE = merge(bow(-45, -12, 48), B.arm("l", -78, -62), {"torso": {"r": -2}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), {
        "arm_r": {"r": 2 * lag}, "hand_r": {"r": -3 * lag},
        "arm_l": {"r": -3 * lag}, "fore_l": {"r": 4 * lag},
    })


def _walk(f):
    pose, p, bl = B.walk_legs(f)
    return merge(STANCE, pose, {
        "arm_l": {"r": 22 * math.cos(p)}, "fore_l": {"r": 12 * max(0.0, math.cos(p))},
        "arm_r": {"r": -6 * math.cos(p)}, "hand_r": {"r": 5 * bl},
    })


ATTACK_MS = [83, 83, 100, 167, 83, 83, 100, 100]
ATTACK_IMPACT = 4


def _attack(f):
    # 0 reach over the shoulder for an arrow, 1 nock (bow up), 2 half draw, 3 full draw
    # (held, lean back), 4 release: string snaps, bow arm kicks, 5 draw hand flies back,
    # 6 bow drops, 7 settle toward the stance
    body = {
        "body": dict(squash(pick(f, [0.02, 0.0, -0.03, -0.06, 0.05, 0.02, 0.0, 0.0])),
                     x=pick(f, [0, 0.5, 0, -1.0, 1.0, 0.5, 0, 0])),
        "torso": {"r": pick(f, [4, 0, 4, 7, -2, -1, 0, -2]),
                  "rz": pick(f, [8, DRAW_TWIST - 4, DRAW_TWIST, DRAW_TWIST, DRAW_TWIST, 24, 14, 4])},
        # the head turns back toward the camera so the aiming face stays visible
        "head": {"r": pick(f, [4, -2, -3, -4, 0, 1, 1, 0]),
                 "rz": pick(f, [-6, -22, -24, -24, -24, -18, -10, -3])},
        "thigh_r": {"r": pick(f, [0, 6, 8, 10, 10, 8, 4, 0])},
        "thigh_l": {"r": pick(f, [0, -6, -8, -10, -10, -8, -4, 0])},
    }
    if f == 0:
        pose = merge(bow(-25, 10, 72), B.arm("l", 150, 60), body)
        pose["arrow"] = {"show": False}
    elif f in (1, 2, 3):
        k = f - 1
        w = pick(f, [0, 94, 92, 91])
        a = pick(f, [0, -24, -20, -18])
        pose = merge(draw_to(a, a + 8, w, k), body)
        pose["arrow"] = {"show": True, "x": DRAWS[2] - DRAWS[k]}
    elif f == 4:
        pose = merge(bow(-6, -2, 84), B.arm("l", 170, 175), body)
        pose.update({"string0": {"show": True}})
    else:
        a = pick(f, [0, 0, 0, 0, 0, -2, -22, -40])
        fo = pick(f, [0, 0, 0, 0, 0, 2, -6, -12])
        w = pick(f, [0, 0, 0, 0, 0, 84, 70, 56])
        pose = merge(bow(a, fo, w),
                     B.arm("l", pick(f, [0] * 5 + [-170, -120, -95]),
                           pick(f, [0] * 5 + [150, -150, -70])), body)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_r": {"r": 16 * a}, "hand_r": {"r": 12 * a},
                                         "arm_l": {"r": 24 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_r": {"r": pick(f, [50, 40, 40])}, "hand_r": {"r": pick(f, [40, 30, 30])},
        "arm_l": {"r": pick(f, [120, 90, 90])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
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
