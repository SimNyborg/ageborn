"""Bonker, heroic: Stone Age club brute, 68 lu.

Heroic build: a smaller head (a fifth of his height) on a huge chest, traps and shoulders, big
forearms and fists, stocky legs in fur boots. A team pelt mantle and kilt, a team headband with
tails, a bending team pelt cape and a swinging dreadlock. The club is a stone maul lashed with
leather and set with bone spikes, carried on the shoulder.

Animation: an 8-frame heavy idle, a stomping 8-frame walk with weight shift and torso twist,
a 14-frame overhead smash (big wind-up, held extreme, a smear with a team-coloured trail, a
held impact with a spark and yell, follow-through into the ground, recoil, settle), a 5-frame
hit with knockback, and a 12-frame death that flies, lands, bounces and pops into dust.
"""
import math

from ageborn_art.geometry import Geo
from hero.anim import Clip, cyc, keyed, merge, squash, syc, with_flags

SLUG = "bonker"
NAME = "Bonker"
HEIGHT_LU = 68
YAW_DEG = -20.0
CANVAS_LU = (-80, 96, -10, 120)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 34)}

SKIN = "#D6AE8E"
HAIR = "#2E2421"
LEATHER = "#6E5A48"
WOOD = "#86705A"
STONE = "#8E9198"
BONE = "#E6DEC9"
FUR = "#6B6158"
EYE = "#F5F1E8"
PUPIL = "#1A1614"
MOUTH = "#4A2626"
TEETH = "#F2EDE0"
PUFF = "#F1ECE2"
SPARK = "#FFF6D6"

SH_Y = 13.0
ELBOW_Z, WRIST_Z, FIST_Z = 35.5, 25.5, 22.0
CLUB_LEN = 34.0            # fist to the stone head's centre
FIST_R = (1.5, -SH_Y - 1.0, FIST_Z)

TRAIL = {"joint": "club", "inner": (FIST_R[0], FIST_R[1], FIST_Z + CLUB_LEN - 12),
         "outer": (FIST_R[0], FIST_R[1], FIST_Z + CLUB_LEN + 9), "behind": 1.5}


def _limb(g, a, b, r0, r1, bulge=None):
    g.capsule(a, b, r0, r1)
    if bulge:
        t, r, off = bulge
        c = tuple(a[i] + (b[i] - a[i]) * t + off[i] for i in range(3))
        g.blob(c, (r, r * 0.95, r * 1.25), p=2.2)
    return g


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, 27))
    rig.joint("torso", "hips", (0, 0, 32))
    rig.joint("head", "torso", (2, 0, 51))

    # -- legs: stocky, bent, fur boots with leather straps --------------------------------
    for side, y in (("r", -6.8), ("l", 6.8)):
        far = side == "l"
        rig.joint(f"thigh_{side}", "hips", (0, y, 27))
        rig.joint(f"shin_{side}", f"thigh_{side}", (1.0, y, 15))
        rig.joint(f"foot_{side}", f"shin_{side}", (0.0, y, 5))
        g = _limb(Geo(), (0, y, 27), (1.0, y, 15), 6.2, 4.8, (0.4, 5.2, (1.2, 0, 0)))
        rig.part(f"thigh_{side}", g, SKIN, "skin", far=far)
        g = _limb(Geo(), (1.0, y, 15), (0.0, y, 6), 4.8, 3.8, (0.35, 4.3, (-1.6, 0, 0)))
        rig.part(f"shin_{side}", g, SKIN, "skin", far=far)
        g = Geo().blob((3.8, y, 3.0), (7.6, 5.4, 3.3), p=2.6, taper=(1.05, 0.8))
        g.blob((0.4, y, 7.0), (5.2, 5.2, 3.6), p=2.4)
        rig.part(f"foot_{side}", g, FUR, "fur", far=far)
        g = Geo().lathe([(5.5, 0), (5.6, 1.2), (5.3, 2.0)], (0.4, y, 5.6), segs=14, squash=(1.0, 0.95))
        g.lathe([(4.6, 0), (4.8, 1.2), (4.5, 2.0)], (0.9, y, 9.8), segs=14)
        rig.part(f"foot_{side}", g, LEATHER, "leather", far=far)

    # -- kilt: team pelt with a jagged hem, on its own spring ---------------------------------
    rig.secondary("kilt", "hips", (1, 0, 27), (0, 0, 15), max_deg=10, gain=0.9)
    g = Geo().blob((0.8, 0, 24.0), (11.6, 10.6, 6.0), p=2.5, taper=(1.12, 0.95))
    for i in range(9):
        a = math.radians(-160 + i * 40)
        x, y = 11.2 * math.cos(a), 10.2 * math.sin(a)
        if y > 6:
            continue
        g.lathe([(3.3, 0), (0, -5.5 - 1.5 * (i % 2))], (x, y, 19.5), segs=10)
    rig.part("kilt", g, finish="fur", team=True)

    # -- torso: big chest, pecs, abs, traps -------------------------------------------------
    g = Geo().blob((2.0, 0, 35.5), (8.6, 8.6, 6.4), p=2.3)                          # belly
    g.blob((1.0, 0, 42.5), (10.2, 11.2, 9.4), p=2.25, taper=(0.82, 1.14))           # chest
    for y in (-5.2, 5.2):
        g.blob((8.2, y, 43.5), (4.0, 5.4, 4.4), p=2.2)                              # pecs
    g.blob((-1.5, 0, 49.5), (7.0, 10.5, 4.2), p=2.3)                                # traps
    rig.part("torso", g, SKIN, "skin")
    g = Geo().blob((1.0, 0, 29.5), (11.2, 10.4, 2.6), p=3.2)                        # belt
    g.capsule((10.4, -5.5, 46.0), (6.0, 7.5, 31.0), 1.6)                            # strap
    rig.part("torso", g, LEATHER, "leather")
    g = Geo().blob((11.6, -1.0, 29.8), (2.0, 3.6, 3.4), p=2.4)                      # skull buckle
    g.blob((12.8, -1.0, 28.2), (1.2, 2.4, 1.2), p=2.4)
    rig.part("torso", g, BONE, "bone")
    # team fur mantle over the shoulders and upper back
    g = Geo().blob((-2.5, 0, 48.0), (9.0, 15.6, 5.6), p=2.4)
    for x, y in ((-8, -12), (-10, -4), (-10, 5), (-8, 12), (-3, -15.5), (3, -15)):
        g.lathe([(3.0, 0), (0, -5.5)], (x, y, 45.0), segs=8)
    rig.part("torso", g, finish="fur", team=True)

    # -- cape: a team pelt down the back that bends on a 3-link chain -------------------------
    pts = [(-8, 0, 49), (-10.5, 0, 40), (-12, 0, 31), (-12.5, 0, 21)]
    rig.chain(["cape1", "cape2", "cape3"], "torso", pts, max_deg=22, gain=1.1, hz=1.7, damping=0.32)
    g = Geo()
    for i in range(7):
        t = i / 6.0
        z = 48 - 26 * t
        x = -9.0 - 3.5 * t
        g.blob((x, 0, z), (2.2, 10.5 + 3.0 * t, 5.2), p=2.6)
    for y in (-11, -5, 1, 7, 12):
        g.lathe([(2.8, 0), (0, -5.0 - (abs(y) % 3))], (-12.8, y, 22.5), segs=8)
    rig.skin(["cape1", "cape2", "cape3"], g, finish="fur", team=True, tip=pts[-1], stiff=0.3)

    # -- head: small skull, square jaw, heavy brow, beard, wild hair, team headband ---------
    g = Geo().blob((3.0, 0, 58.0), (7.0, 6.8, 7.4), p=2.3)                           # skull
    g.blob((6.3, 0, 53.4), (6.0, 6.3, 4.3), p=2.6)                                   # jaw
    g.blob((10.8, -0.3, 56.2), (2.2, 2.0, 2.5), p=2.2)                               # nose
    for y in (-6.4, 6.4):
        g.blob((3.0, y, 56.5), (1.6, 1.2, 2.0))                                      # ears
    rig.part("head", g, SKIN, "skin")
    g = Geo().capsule((9.0, -5.0, 59.8), (10.4, 0.0, 58.4), 1.9, 1.6)                # angry brow
    g.capsule((10.4, 0.0, 58.4), (9.0, 5.0, 59.8), 1.6, 1.9)
    rig.part("head", g, HAIR, "hair", line=0.5)
    for y in (-3.0, 3.0):
        g = Geo().blob((9.5, y, 57.3), (1.3, 1.7, 1.25))
        rig.part("head", g, EYE, "gloss", line=0.4)
        g = Geo().blob((10.6, y - 0.2, 57.2), (0.7, 1.0, 1.0))
        rig.part("head", g, PUPIL, "dark", line=0)
    g = Geo().blob((7.2, 0, 50.2), (5.4, 6.6, 4.4), p=2.3)                           # beard
    g.lathe([(3.2, 0), (0, -5.0)], (9.0, 0, 48.6), segs=10)
    g.blob((-0.5, 0, 62.4), (7.0, 7.3, 4.6), p=2.2)                                  # hair cap
    g.blob((-4.5, 0, 57.0), (4.4, 7.0, 6.4), p=2.2)
    for (x0, z0), (x1, z1), r in (((0, 64), (-2, 71), 2.8), ((4, 64), (6, 70), 2.4),
                                  ((-4, 63), (-9.5, 68), 2.6)):
        g.capsule((x0, 0, z0), (x1, -0.5, z1), r, 0.8)
    rig.part("head", g, HAIR, "hair")
    g = Geo().lathe([(7.45, 0), (7.6, 1.2), (7.4, 2.6)], (2.4, 0, 61.2), segs=20, squash=(1.0, 0.98))
    rig.part("head", g, finish="cloth", team=True)
    rig.chain(["band1", "band2"], "head", [(-4.2, 1.5, 62.5), (-9.5, 1.5, 60.0), (-14.5, 1.5, 57.5)],
              max_deg=30, gain=1.3, hz=2.3, damping=0.3)
    g = Geo().capsule((-4.2, 1.5, 62.5), (-9.5, 1.5, 60.0), 1.5, 1.4)
    g.capsule((-9.5, 1.5, 60.0), (-14.5, 1.5, 57.5), 1.4, 0.9)
    rig.skin(["band1", "band2"], g, finish="cloth", team=True, tip=(-14.5, 1.5, 57.5))
    # dreadlock, bending
    dpts = [(-5.5, 0.5, 60.0), (-10, 0.5, 55.5), (-13, 0.5, 49.5), (-14.5, 0.5, 43.5)]
    rig.chain(["dread1", "dread2", "dread3"], "head", dpts, max_deg=26, gain=1.1, hz=1.9, damping=0.3)
    g = Geo()
    for (a, b), (r0, r1) in zip(zip(dpts, dpts[1:]), ((3.0, 2.6), (2.6, 2.2), (2.2, 1.2))):
        g.capsule(a, b, r0, r1)
    rig.skin(["dread1", "dread2", "dread3"], g, HAIR, "hair", tip=dpts[-1])
    # mouth: snarl (teeth) and yell (open)
    rig.joint("mouth", "head", (10.6, 0, 52.4))
    g = Geo().blob((10.0, -0.3, 52.6), (1.0, 3.2, 0.9), p=2.6)
    rig.part("mouth", g, MOUTH, "dark", line=0)
    g = Geo().blob((10.8, -0.3, 52.9), (0.5, 2.6, 0.5), p=3.0)
    rig.part("mouth", g, TEETH, "bone", line=0)
    rig.joint("yell", "head", (10.0, 0, 52.0), hidden=True)
    g = Geo().blob((10.0, -0.3, 52.0), (1.8, 3.4, 2.6), p=2.2)
    rig.part("yell", g, MOUTH, "dark", line=0)
    g = Geo().blob((11.0, -0.3, 54.0), (0.6, 2.8, 0.6), p=3.0).blob((11.0, -0.3, 50.2), (0.6, 2.4, 0.5), p=3.0)
    rig.part("yell", g, TEETH, "bone", line=0)

    # -- arms: big delts, forearms and fists; bone pauldron on the club arm ---------------------
    for side, y in (("r", -SH_Y), ("l", SH_Y)):
        far = side == "l"
        yd = -1.0 if y < 0 else 1.0
        rig.joint(f"arm_{side}", "torso", (0, y, 47))
        rig.joint(f"fore_{side}", f"arm_{side}", (0.5, y + yd * 0.5, ELBOW_Z))
        g = Geo().sphere((0.2, y, 47.0), 6.4)                                        # deltoid
        g = _limb(g, (0, y, 46), (0.5, y + yd * 0.5, ELBOW_Z), 5.4, 4.6, (0.45, 5.0, (1.4, 0, 0)))
        rig.part(f"arm_{side}", g, SKIN, "skin", far=far)
        g = _limb(Geo(), (0.5, y + yd * 0.5, ELBOW_Z), (1.2, y + yd, WRIST_Z), 5.0, 4.2,
                  (0.3, 5.3, (0.8, 0, 0)))
        g.blob((1.5, y + yd, FIST_Z), (5.0, 4.8, 4.8), p=2.7)                        # fist
        rig.part(f"fore_{side}", g, SKIN, "skin", far=far)
        g = Geo().lathe([(5.3, 0), (5.6, 2.0), (5.2, 5.2)], (1.0, y + yd, 26.0), (0.6, y + yd, 34), segs=14)
        rig.part(f"fore_{side}", g, LEATHER, "leather", far=far)
    g = Geo().blob((0.5, -SH_Y - 1.5, 49.5), (7.4, 5.2, 5.0), p=2.3, taper=(1.0, 0.8))
    g.lathe([(2.0, 0), (0, 6.5)], (4.5, -SH_Y - 3.5, 52.0), (9.5, -SH_Y - 4.5, 57.0), segs=10)
    g.lathe([(1.8, 0), (0, 5.5)], (-2.5, -SH_Y - 3.5, 53.0), (-6.0, -SH_Y - 4.5, 58.5), segs=10)
    rig.part("arm_r", g, BONE, "bone")

    # -- the stone maul -----------------------------------------------------------------------
    rig.joint("club", "fore_r", FIST_R)
    fx_, fy, fz = FIST_R
    h = CLUB_LEN
    g = Geo().lathe([(0, -6.0), (2.3, -5.6), (2.4, -2), (2.6, 12), (3.4, h - 8), (0, h - 5)],
                    (fx_, fy, fz), segs=14)
    rig.part("club", g, WOOD, "wood")
    g = Geo()
    for z in (-3.5, -0.5, 2.5):
        g.lathe([(2.9, 0), (3.1, 1.0), (2.8, 2.0)], (fx_, fy, fz + z), segs=12)
    g.blob((fx_, fy, fz + h - 7.5), (4.4, 4.4, 2.6), p=2.4)
    rig.part("club", g, LEATHER, "leather")
    g = Geo().blob((fx_ + 0.5, fy, fz + h + 0.5), (8.6, 7.6, 9.4), p=2.35, rot=(0, 12, 0))
    g.blob((fx_ - 3.5, fy, fz + h + 5.5), (5.0, 5.4, 4.6), p=2.2)
    rig.part("club", g, STONE, "stone")
    g = Geo()
    for d in ((1, 0, 0.35), (-1, 0, 0.5), (0.25, -1, 0.25), (0.6, 0.0, 1.0)):
        L = math.sqrt(sum(c * c for c in d))
        d = tuple(c / L for c in d)
        b0 = (fx_ + d[0] * 7.2, fy + d[1] * 6.2, fz + h + d[2] * 7.5)
        g.lathe([(2.0, 0), (1.4, 2.6), (0, 6.0)], b0,
                (b0[0] + d[0] * 6, b0[1] + d[1] * 6, b0[2] + d[2] * 6), segs=10)
    rig.part("club", g, BONE, "bone")
    g = Geo().lathe([(8.9, 0), (9.2, 1.0), (8.8, 2.0)], (fx_ + 0.5, fy, fz + h - 3.0), segs=18,
                    squash=(1.0, 0.9))
    rig.part("club", g, LEATHER, "leather")

    # -- fx: impact spark (in front, at the ground where the maul lands) and the death pop ----
    sx, sy, sz = FIST_R[0] + 2, FIST_R[1] - 9, FIST_Z + CLUB_LEN + 2
    rig.joint("spark", "club", (sx, sy, sz), hidden=True)
    g = Geo().star((sx, sy, sz), 12, 4.4, 2.0, points=6)
    rig.part("spark", g, glow=SPARK, fx=True)
    g = Geo()
    for a in (0, 60, 120, 180, 240, 300):
        ca, sa = math.cos(math.radians(a + 30)), math.sin(math.radians(a + 30))
        g.capsule((sx + 13 * ca, sy - 0.5, sz + 13 * sa), (sx + 20 * ca, sy - 0.5, sz + 20 * sa), 1.3, 0.4)
    rig.part("spark", g, glow="#FFFFFF", fx=True)
    rig.joint("dust", "root", (52, -12, 2), hidden=True)
    g = Geo()
    for x, z, r in ((44, 3, 4.5), (50, 5, 5.5), (57, 4.5, 5.2), (63, 2.5, 4.0), (39, 2, 3.2)):
        g.sphere((x, -12, z), r, cuts=4)
    rig.part("dust", g, PUFF, "cloth", fx=True)
    _pop(rig, (-22, 0, 10))

    rig.track("clubHead", "club", (fx_, fy, fz + h))
    rig.track("_foot", "foot_r", (3.0, -6.8, 0.5))


def _pop(rig, c):
    """Death pop: a white flash ring, a cloud of puffs that breaks up, and little stars."""
    cx, cy, cz = c
    rig.joint("pop", "root", c, hidden=True)
    rig.joint("pop_flash", "pop", c)
    g = Geo().star((cx, cy - 6, cz), 22, 13, 2.0, points=8)
    rig.part("pop_flash", g, glow="#FFFFFF", fx=True)
    rig.joint("pop_cloud", "pop", c)
    g = Geo()
    for x, z, r in ((0, 0, 11), (-10, -3, 8), (10, -3, 8.5), (-6, 8, 8), (7, 8, 7.5), (0, 13, 6.5),
                    (-15, 4, 5.5), (15, 5, 5.5)):
        g.sphere((cx + x, cy - 4, cz + z), r, cuts=4)
    rig.part("pop_cloud", g, PUFF, "cloth", fx=True)
    for i, (dx, dz) in enumerate(((-1, 0.6), (1, 0.7), (-0.4, 1), (0.5, 1), (-1, -0.1), (1, 0))):
        j = rig.joint(f"pop_p{i}", "pop", (cx + dx * 12, cy, cz + dz * 12))
        g = Geo().sphere((cx + dx * 12, cy - 4, cz + dz * 12), 4.8 - 0.4 * (i % 3), cuts=4)
        rig.part(j, g, PUFF, "cloth", fx=True)
    for i, (dx, dz) in enumerate(((-1, 1.3), (0.2, 1.7), (1.1, 1.2))):
        j = rig.joint(f"pop_s{i}", "pop", (cx + dx * 14, cy, cz + dz * 14))
        g = Geo().star((cx + dx * 14, cy - 8, cz + dz * 14), 4.8, 2.1, 1.6, points=5)
        rig.part(j, g, glow=SPARK, fx=True)


# -- posing helpers ----------------------------------------------------------------------------
ARM_REST = math.degrees(math.atan2(ELBOW_Z - 47, 0.5))
FORE_REST = math.degrees(math.atan2(WRIST_Z - ELBOW_Z, 0.7))
CLUB_REST = 90.0


def club_arm(arm, fore, club):
    ra = arm - ARM_REST
    rf = fore - FORE_REST - ra
    return {"arm_r": {"r": ra}, "fore_r": {"r": rf}, "club": {"r": club - CLUB_REST - ra - rf}}


def off_arm(arm, fore):
    ra = arm - ARM_REST
    return {"arm_l": {"r": ra}, "fore_l": {"r": fore - FORE_REST - ra}}


def legs(tr, sr, fr, tl, sl, fl):
    return {"thigh_r": {"r": tr}, "shin_r": {"r": sr}, "foot_r": {"r": fr},
            "thigh_l": {"r": tl}, "shin_l": {"r": sl}, "foot_l": {"r": fl}}


# confident stance: wide base, chest out, maul resting on the shoulder
STANCE = merge(club_arm(-68, 0, 48), off_arm(-62, -20),
               legs(16, -22, 6, -14, -8, 14),
               {"hips": {"z": -1.6, "r": -4}, "torso": {"r": -3}, "head": {"r": 4},
                "club": {"rx": -10}})


def _idle(f):
    n = 8
    c = cyc(f, n)
    lag = cyc(f - 1.2, n)
    return merge(STANCE, {
        "hips": {"z": 0.9 * c},
        "body": squash(0.025 * c),
        "torso": {"r": 1.6 * c, "sx": 1 + 0.02 * c, "sy": 1 + 0.02 * c},
        "head": {"r": -2.2 * lag},
        "arm_r": {"r": 2.5 * lag}, "club": {"r": -3.5 * lag},
        "arm_l": {"r": -3 * lag}, "fore_l": {"r": 3 * lag},
        "thigh_r": {"r": -1.2 * c}, "shin_r": {"r": 2.4 * c}, "foot_r": {"r": -1.2 * c},
        "thigh_l": {"r": 1.2 * c}, "shin_l": {"r": 1.0 * c},
    })


def _walk(f):
    # heavy stomp: contact 0 / 4 lowest with a squash, passing 2 / 6 highest; the torso twists
    # against the hips, the off arm swings big, the maul bounces on the shoulder a frame late
    n = 8
    p = 2 * math.pi * f / n
    s, c = math.sin(p), math.cos(p)
    lift_r, lift_l = max(0.0, -s), max(0.0, s)
    bob = -1.4 * math.cos(2 * p) - 0.6
    lag = -math.cos(2 * (p - 2 * math.pi / n))
    return merge(club_arm(-68, 0, 48), {"club": {"rx": -10}}, {
        "hips": {"z": bob - 1.4, "r": -6 + 2 * math.cos(2 * p)},
        "body": squash(-0.035 * max(0.0, math.cos(2 * p))),
        "torso": {"r": -5 + 1.5 * lag, "rz": 9 * s},
        "head": {"r": 5 - 2 * lag, "rz": -6 * s},
        "thigh_r": {"r": 34 * c + 16 * lift_r}, "shin_r": {"r": -12 - 60 * lift_r},
        "foot_r": {"r": 10 * lift_r - 12 * max(0.0, -c) * (1 - lift_r)},
        "thigh_l": {"r": -34 * c + 16 * lift_l}, "shin_l": {"r": -12 - 60 * lift_l},
        "foot_l": {"r": 10 * lift_l - 12 * max(0.0, c) * (1 - lift_l)},
        "arm_l": {"r": 32 * c - 60 - ARM_REST}, "fore_l": {"r": 18 + 14 * max(0.0, c)},
        "arm_r": {"r": -4 * c + 2 * lag}, "club": {"r": -6 * lag},
    })


def _atk_key(arm, fore, club, off, off_f, lg, hips_z, hips_r, torso, head, body_x, sq, extra=None):
    p = merge(club_arm(arm, fore, club), off_arm(off, off_f), legs(*lg), {
        "hips": {"z": hips_z, "r": hips_r}, "torso": {"r": torso}, "head": {"r": head},
        "body": dict(squash(sq), x=body_x), "club": {"rx": -10},
    })
    return merge(p, extra) if extra else p


# 14 frames: 0 stance, 1-2 dip and gather, 3 wind-up extreme (held), 4 moving hold,
# 5 smear, 6 contact (impact, held), 7 impact settle, 8 follow-through, 9-10 recoil, 11-13 settle
A = {
    "stance": STANCE,
    "dip": _atk_key(-62, -24, 12, -50, -10, (12, -30, 10, -18, -16, 16), -3.8, -2, 4, 6, -1.0, -0.08),
    "gather": _atk_key(30, 80, 115, -10, 30, (6, -12, 4, -22, -10, 18), -0.6, 4, 10, 10, -3.0, 0.04),
    "wind": _atk_key(95, 118, 128, 40, 90, (0, -6, 0, -24, -6, 14), 1.0, 6, 14, 14, -4.5, 0.09),
    "wind2": _atk_key(98, 122, 132, 44, 94, (0, -6, 0, -25, -6, 14), 1.2, 7, 15, 15, -4.8, 0.10),
    "smear": _atk_key(40, 45, 50, -40, 0, (26, -30, 6, -20, -10, 14), -2.0, -8, -10, -6, 3.0, 0.06),
    "impact": _atk_key(-20, -12, -6, -100, -60, (40, -54, 14, -26, -18, 22), -8.0, -10, -14, -8, 8.0, -0.14),
    "settle": _atk_key(-22, -15, -9, -104, -66, (40, -54, 14, -26, -18, 22), -7.6, -10, -13, -7, 8.0, -0.10),
    "follow": _atk_key(-28, -24, -22, -95, -50, (38, -52, 12, -24, -16, 20), -6.5, -9, -18, -10, 8.5, -0.06),
    "recoil": _atk_key(-20, 10, 40, -80, -30, (30, -40, 10, -20, -14, 16), -4.5, -8, -12, -4, 6.5, 0.03),
    "back": _atk_key(-55, 8, 62, -66, -22, (20, -26, 6, -16, -10, 14), -2.2, -5, -5, 5, 3.0, 0.0),
}


def _attack_fn():
    k = keyed([(0, A["stance"]), (1, A["dip"], "io"), (2, A["gather"], "io"), (3, A["wind"], "out"),
               (4, A["wind2"], "lin"), (5, A["smear"], "in"), (6, A["impact"], "snap"),
               (7, A["settle"], "io"), (8, A["follow"], "out"), (9, A["recoil"], "io"),
               (10, A["back"], "io"), (13, A["stance"], "over")])

    def pose(f):
        p = k(f)
        if f == 5:
            p = merge(p, {"club": {"sz": 1.12}})
        if f in (5, 6, 7, 8):
            p = with_flags(p, mouth={"hide": True}, yell={"show": True})
        if f in (6, 7):
            p = with_flags(p, spark={"show": True, "s": 1.0 if f == 6 else 0.7})
        if f in (6, 7, 8, 9):
            p = with_flags(p, dust={"show": True, "s": [0.7, 1.0, 1.15, 1.2][f - 6],
                                    "z": [0, 1.5, 3, 4][f - 6]})
        return p
    return pose


def _hit(f):
    hit = merge(STANCE, {
        "body": dict(squash(-0.14), x=-6.5), "hips": {"z": -2.5, "r": 6},
        "torso": {"r": 22}, "head": {"r": 26},
        "arm_r": {"r": 22}, "club": {"r": 18}, "arm_l": {"r": 50}, "fore_l": {"r": 30},
        "thigh_r": {"r": -8}, "thigh_l": {"r": -6}, "shin_l": {"r": -10},
    })
    k = keyed([(0, merge(hit, {"body": {"x": 2.0}, "torso": {"r": -6}})), (1, hit, "snap"),
               (2, merge(hit, {"torso": {"r": -6}, "head": {"r": -10}, "body": {"x": -1.0}}), "io"),
               (3, merge(STANCE, {"torso": {"r": -4}, "head": {"r": -5}, "body": dict(squash(0.03))}), "io"),
               (4, STANCE, "io")])
    p = k(f)
    if f in (1, 2):
        p = with_flags(p, mouth={"hide": True}, yell={"show": True})
    return p


# die: 0 struck, 1 launched, 2 apex, 3 falling, 4 ground hit, 5 bounce, 6 lie, 7 pop,
# 8-11 the cloud grows, breaks into puffs and stars; the unit is hidden from frame 7
DIE_BODY = [(-5, 2, 14, -0.12), (-11, 12, 38, 0.1), (-16, 16, 62, 0.04), (-20, 10, 84, 0.0),
            (-22, 0, 92, -0.2), (-23, 3, 88, 0.06), (-23.5, 0, 90, -0.1)]


def _die(f):
    limbs = merge(STANCE, {"torso": {"r": 18}, "head": {"r": 22}, "arm_r": {"r": 60},
                           "fore_r": {"r": -30}, "club": {"r": 30},
                           "arm_l": {"r": 110}, "fore_l": {"r": 20},
                           "thigh_r": {"r": 20}, "shin_r": {"r": -20}, "thigh_l": {"r": 40},
                           "shin_l": {"r": -40}})
    if f < len(DIE_BODY):
        x, z, r, q = DIE_BODY[f]
        flail = [0.4, 1.0, 1.2, 0.9, 0.6, 0.8, 0.5][f]
        p = merge(STANCE if f == 0 else limbs, {"body": dict(squash(q), x=x, z=z, r=r)})
        if f > 0:
            p = merge(p, {"arm_l": {"r": 20 * flail}, "thigh_l": {"r": 15 * flail},
                          "head": {"r": 8 * flail}})
        if f in (0, 1, 2):
            p = with_flags(p, mouth={"hide": True}, yell={"show": True})
        return p
    # pop: the unit is gone; the fx play out
    k = f - 7
    p = {"body": {"hide": True}, "pop": {"show": True}}
    flash = [1.0, 0.55, 0.0, 0.0, 0.0][k]
    p["pop_flash"] = {"s": max(0.01, flash), "hide": flash <= 0}
    cloud = [1.0, 1.22, 1.3, 0.0, 0.0][k]
    p["pop_cloud"] = {"s": max(0.01, cloud), "hide": cloud <= 0}
    for i in range(6):
        grow = [0.0, 0.55, 1.0, 1.0, 0.7][k]
        spread = [0.0, 0.3, 0.8, 1.4, 1.9][k]
        dx = [-1, 1, -0.4, 0.5, -1, 1][i] * 8 * spread
        dz = [0.6, 0.7, 1, 1, -0.1, 0][i] * 8 * spread + 3 * spread
        p[f"pop_p{i}"] = {"s": max(0.01, grow if k > 0 else 0.01), "x": dx, "z": dz,
                          "hide": k == 0}
    for i in range(3):
        rise = [0.0, 0.0, 0.4, 1.0, 1.6][k]
        p[f"pop_s{i}"] = {"hide": k < 2, "z": 5 * rise, "x": [-2, 0, 2][i] * rise,
                          "rx": 0, "s": [0.01, 0.01, 0.8, 1.1, 0.9][k]}
    return p


def clips():
    atk = Clip("attack", 14, _attack_fn(), impact=6, smear=5,
               durations=[70, 70, 70, 140, 70, 35, 110, 70, 80, 70, 70, 70, 80, 90])
    atk.trails = {5: {"from": 4, "start": 0.35}, 6: {"from": 5, "start": 0.6}}
    die = Clip("die", 12, _die, durations=[50, 60, 70, 60, 60, 60, 110, 45, 60, 70, 80, 90],
               extra={"hideUnitAtMs": 525, "popAtMs": 525})
    return [
        Clip("idle", 8, _idle, loop=True, durations=130),
        Clip("walk", 8, _walk, loop=True, durations=75),
        atk,
        Clip("hit", 5, _hit, durations=[40, 90, 70, 70, 80]),
        die,
    ]
