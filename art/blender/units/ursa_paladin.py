"""Ursa Paladin: Medieval Age Legendary siege heavy (DESIGN A5.3). Cleave, Roar, ~190 lu.

Look (A11 rider rig, Legendary scale): a huge brown war bear with a shaped anatomy (a
shoulder hump, elbows and hocks with fur tufts, big paws with cream claws, a cream muzzle, a
wet nose, angry brows and a roaring jaw with teeth and a tongue), in a team barding with a
parchment hem, gold studs and a big parchment bear paw on the flank, a steel chanfron with a
gold ridge. It carries a paladin (1.5x) in bright steel plate with a team tabard, a great
helm with a gold crown crest (an accent), glowing eye slits and a team plume, and a wine
cape. The paladin swings an oversized gold-banded warhammer (cleave) in the near hand and
holds a tall team war banner in the far hand. Plume, cape, banner and tail follow through.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    the bear sniffs the air (the head lifts, the nose twitches) and blinks; the
          paladin raises his hammer fist
  walk    heavy 4-beat: diagonal pairs, the shoulder hump rolling, the head nodding
  attack  BEAR SWIPE AND HAMMER SPIN: the bear rears with a forepaw raised high, claws out,
          roaring, while the paladin winds the hammer straight back (the held extreme); the
          paw rakes down (claw smear) as the hammer sweeps round in a wide flat circle toward
          the viewer (a hollow ring smear), both land together on the impact (the cleave
          reads as a wide arc), and the hammer carries on round as the bear settles
  hit     beast: the bear shakes its head, eyes squeezed, the paladin rocks back
  die     D5 unhorsed: the bear rears, the paladin is thrown off the back spinning and lands
          flat behind it, the bear flops down on its belly, X eyes and tongue
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "ursa_paladin"
NAME = "Ursa Paladin"
HEIGHT_LU = 190
YAW_DEG = -10.0
SHEET_SCALE = 1.25   # render this unit with --scale 1.25 (Legendary budget)
CANVAS = (540, 500)
FEET = (262, 456)
ANCHORS = {"head": (10, 186), "hitCenter": (0, 80)}
NO_RETIME = True

FUR = "#7B6453"
FUR_DARK = "#5A493E"
MUZZLE = "#D9C7AE"
NOSE = "#2B2522"
MOUTH = "#5A2231"
TOOTH = "#F4EEDC"
CLAW = "#E8DFC8"
EYE = "#FAF6EE"
PUPIL = "#221C19"
STEEL = "#B7C0CA"
STEEL_DARK = "#6B7682"
DARK = "#23262E"
WINE = "#8E2A4A"
PARCH = "#E8DFC8"
GOLD = "#D4A437"
POLE = "#6B5647"

P = (-4.0, 0.0, 104.0)      # the paladin's seat (rider pivot, scale 1.5)
RS = 1.5


def R(x, y, z):
    """Rider-local point (a 68 lu biped with its hips at the origin) to character space;
    parts are built unscaled around P and the rider joint scales them by RS."""
    return (P[0] + x, P[1] + y, P[2] + z)


# weapon joints sit at the rider's hands, modelled pointing up (rest direction 90)
HAMMER = 32.0     # haft length to the head centre (rider units)
TONGUE = "#CF8E86"


def _bear_leg(rig, name, x, y, front):
    """A shaped bear leg: a thick upper leg to the elbow (front) or a haunch to the hock
    (hind, bent back), fur tufts at the joint, a wrist, a big paw with cream claws."""
    rig.joint(name, "bear", (x, y, 70))
    x2 = x + (3 if front else -7)
    rig.joint(f"{name}2", name, (x2, y, 36))
    if front:
        g = Geo().capsule((x, y, 72), (x2, y, 36), 14.5, 11.0)
        g.blob((x2 - 5, y, 40), (8.0, 10.0, 8.5), p=2.2)                  # elbow
    else:
        g = Geo().capsule((x, y, 74), (x2, y, 36), 17.0, 10.0)
        g.blob((x + 2, y, 66), (18.0, 15.0, 16.0), p=2.2)                 # haunch
        g.blob((x2 - 4, y, 38), (7.0, 9.0, 7.5), p=2.2)                   # hock
    rig.part(name, g, FUR, finish="hair")
    g = Geo()
    for dz in (0.0, 5.5):                                                  # fur tufts
        g.lathe([(3.4, 0), (0, 6.0)], (x2 - 8, y - 5.5, 38 + dz), (x2 - 14, y - 6.0, 36 + dz), segs=8)
    rig.part(name, g, FUR_DARK, finish="hair", outline=0.8)
    fx = x2 + (1 if front else 5)
    g = Geo().capsule((x2, y, 36), (fx, y, 9), 11.0, 9.6)
    g.blob((fx + 4, y, 6.0), (14.5, 11.5, 6.8), p=2.4, taper=(1.05, 0.9))  # paw
    rig.part(f"{name}2", g, FUR, finish="hair")
    g = Geo()
    for dy in (-6.0, -2.0, 2.0, 6.0):
        g.lathe([(2.4, 0), (1.8, 2.6), (0, 6.5)], (fx + 16.0, y + dy, 4.4), (fx + 22.0, y + dy, 1.2), segs=8)
    rig.part(f"{name}2", g, CLAW, outline=0.8)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("bear", "body", (0, 0, 72))
    # far legs first
    _bear_leg(rig, "leg_fl", 34, 15, True)
    _bear_leg(rig, "leg_bl", -34, 15, False)
    _bear_leg(rig, "leg_fr", 34, -15, True)
    _bear_leg(rig, "leg_br", -34, -15, False)

    # barrel with a shoulder hump, stub tail
    g = Geo().blob((-2, 0, 74), (52, 29, 31), p=2.3, taper=(0.92, 1.0))
    g.blob((26, 0, 88), (26, 25, 22), p=2.2)
    rig.part("bear", g, FUR, finish="hair")
    rig.secondary("tail", "bear", (-52, 0, 82), (-60, 0, 76), max_deg=18, gain=1.0)
    g = Geo().blob((-56, 0, 80), (7, 6, 6), p=2.2)
    rig.part("tail", g, FUR_DARK, finish="hair")
    # team barding over the back with a parchment hem, gold studs and a wine saddle
    bard = Geo().blob((-6, 0, 80), (44, 31.5, 27), p=2.6, taper=(1.05, 0.92))
    bard.clip((0, 0, 60), (0, 0, -1))
    bf = F.Face(rig, "bear", [bard])
    rig.part("bear", bard, team=True)
    g = K.paw(bf, Geo(), K.scr(bf, (-14.0, -31.0, 80.0)), s=3.0)
    rig.part("bear", g, PARCH, highlight=False, outline=0)
    # fur tufts along the back of the hump and the rump (silhouette notches)
    g = Geo()
    for x, z in ((34, 108), (22, 111), (-34, 104), (-46, 98)):
        g.lathe([(4.0, 0), (0, 6.5)], (x, 0, z - 3), (x - 4, 0, z + 3), segs=8)
    rig.part("bear", g, FUR_DARK, finish="hair", outline=0.8)
    g = Geo().blob((-6, 0, 61.2), (44.8, 32.2, 2.6), p=3.0)
    g.clip((0, 0, 59.0), (0, 0, -1))
    rig.part("bear", g, PARCH)
    g = Geo()
    for x in (-38, -22, -6, 10, 26):
        g.sphere((x * 1.0, -32.6, 63.0), 1.9, cuts=3)
    rig.part("bear", g, GOLD, finish="metal", outline=0.8)
    g = Geo().blob((-4, 0, 104), (17, 15, 5), p=2.6).blob((-19, 0, 108), (4, 13, 6), p=2.4)
    rig.part("bear", g, WINE)

    # head: neck joint, a big round head with small ears, cream muzzle, steel chanfron,
    # angry brows and a jaw that drops for the roar
    rig.joint("neck", "bear", (44, 0, 88))
    rig.joint("bhead", "neck", (58, 0, 88))
    g = Geo().capsule((40, 0, 84), (58, 0, 88), 20, 17)
    rig.part("neck", g, FUR, finish="hair")
    head_g = Geo().blob((68, 0, 90), (19.5, 18.5, 17.5), p=2.2)
    for sgn in (-1, 1):
        head_g.blob((60, sgn * 13.5, 105.5), (5.6, 3.6, 5.6), p=2.2)
    head_g.blob((60, 0, 80), (15.0, 20.0, 12.0), p=2.2)                  # cheek ruff
    eyes = Geo()
    for y in (-10.0, 7.0):
        eyes.blob((80.5, y, 94.5), (4.0, 3.6, 4.2))
    bface = F.Face(rig, "bhead", [head_g, eyes])
    rig.part("bhead", head_g, FUR, finish="hair")
    g = Geo()
    for sgn in (-1, 1):
        g.blob((61, sgn * 13.5 - sgn * 1.2 - 1.2, 105.0), (3.2, 1.6, 3.2), p=2.2)
    rig.part("bhead", g, MUZZLE, outline=0.6)
    g = Geo().blob((85, 0, 84), (12.5, 11.0, 9.5), p=2.2)
    rig.part("bhead", g, MUZZLE)
    g = Geo().blob((96.5, -1, 87.5), (4.4, 5.6, 3.6), p=2.2)
    rig.part("bhead", g, NOSE, finish="gloss", outline=0.8)
    g = Geo().blob((68, 0, 104.5), (15.5, 16.0, 6.5), p=2.6, rot=(0, 12, 0))
    g.clip((0, 0, 99.0), (0, 0, -1))
    rig.part("bhead", g, STEEL, finish="metal")
    g = Geo().capsule((58, 0, 108.8), (82, 0, 101.5), 1.8)
    rig.part("bhead", g, GOLD, finish="metal", outline=0.8)
    rig.part("bhead", eyes, EYE, highlight=False)
    rig.joint("pupils", "bhead", (83.4, 0, 94.2))
    g = Geo()
    for y in (-10.0, 7.0):
        g.blob((83.8, y - 0.6, 94.0), (1.7, 2.3, 2.4))
    rig.part("pupils", g, PUPIL, outline=0)
    bface.eye_marks([K.scr(bface, (83.0, -11.5, 94.5))], 4.4, FUR)
    g = Geo().capsule((77, -15.5, 101.5), (83.5, -3.0, 98.0), 2.2, 1.8)
    g.capsule((83.5, 2.0, 98.0), (79, 12.5, 101.0), 1.8, 2.2)
    rig.part("bhead", g, FUR_DARK, finish="hair")
    rig.joint("jaw", "bhead", (74, 0, 80))
    g = Geo().blob((84, 0, 75.5), (11.5, 9.2, 4.2), p=2.3, rot=(0, 6, 0))
    rig.part("jaw", g, MUZZLE)
    g = Geo().blob((84, 0, 79.0), (10.5, 8.0, 2.8), p=2.4)
    rig.part("jaw", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    for dy in (-5.0, 5.0):
        g.lathe([(1.6, 0), (0, 3.2)], (92, dy, 78.5), (92, dy, 81.7), segs=8)
        g.lathe([(1.6, 0), (0, 3.2)], (92, dy, 83.5), (92, dy, 80.3), segs=8)
    rig.part("jaw", g, TOOTH, outline=0.5)
    rig.joint("btongue", "jaw", (88, 0, 77), hidden=True)
    g = Geo().blob((93, -1.0, 74.0), (5.0, 4.0, 2.2), p=2.2, rot=(0, 30, 0))
    rig.part("btongue", g, TONGUE, outline=0.6)
    rig.track("_foot", "leg_fr2", (38, -15, 0.5))

    # -- the paladin (built in rider units around P, scaled 1.5 by the rider joint) --------
    rig.joint("rider", "bear", P, scale=RS)
    rig.joint("torso", "rider", R(0, 0, 1))
    rig.joint("head", "torso", R(1, 0, 23))
    # legs astride: the near leg shows in front of the barding
    for s, y in (("r", -10.5), ("l", 10.5)):
        g = Geo().capsule(R(0, y * 0.8, 1), R(10, y, -6), 5.2, 4.6).capsule(R(10, y, -6), R(9, y, -18), 4.6, 4.2)
        g.blob(R(11.5, y, -20.5), (6.5, 4.6, 3.4), p=2.8)
        rig.part("rider", g, STEEL, finish="metal")
        g = Geo().blob(R(10, y * 1.02, -6), (4.6, 4.8, 4.6), p=2.4)
        rig.part("rider", g, GOLD, finish="metal", outline=0.6)
    # cape from the shoulders (follow-through)
    rig.secondary("cape", "torso", R(-6, 0, 20), R(-18, 0, -4), max_deg=14, gain=1.0)
    g = Geo().blob(R(-10, 0, 8), (5.5, 13.5, 14.5), p=2.4, taper=(1.35, 0.9), rot=(0, -26, 0))
    rig.part("cape", g, WINE)
    # torso: steel plate, team tabard with a parchment cross, gold belt
    g = Geo().blob(R(0, 0, 12), (9.8, 10.4, 11.6), p=2.4, taper=(0.95, 1.08))
    rig.part("torso", g, STEEL, finish="metal")
    g = Geo().blob(R(0.6, 0, 7.8), (10.6, 11.2, 9.8), p=2.8, taper=(1.12, 0.94))
    g.clip(R(0, 0, 16.5), (0, 0, 1))
    rig.part("torso", g, team=True)
    g = Geo().capsule(R(10.8, -2.8, 13.5), R(11.2, -2.8, 3.0), 1.3).capsule(R(10.9, -7.2, 9.6), R(10.9, 1.8, 9.6), 1.3)
    rig.part("torso", g, PARCH, outline=0.6)
    g = Geo().blob(R(0.5, 0, 1.4), (10.8, 11.4, 1.8), p=3.2)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    for s, y in (("r", -11.5), ("l", 11.5)):
        g = Geo().blob(R(0, y, 21.5), (7.2, 6.0, 5.6), p=2.4)
        rig.part("torso", g, STEEL, finish="metal")
    # great helm with a gold crown crest, eye slit with glowing eyes, team plume
    g = Geo().blob(R(1.5, 0, 33), (10.0, 9.8, 11.2), p=3.0, taper=(1.05, 0.92))
    rig.part("head", g, STEEL, finish="metal")
    g = Geo().capsule(R(11.0, 4.0, 34.5), R(10.9, -4.5, 34.5), 1.7).capsule(R(10.9, -4.5, 34.5), R(8.0, -9.4, 34.5), 1.7)
    rig.part("head", g, DARK, outline=0)
    g = Geo().sphere(R(11.4, -3.4, 34.6), 1.25, cuts=3).sphere(R(10.2, -7.4, 34.6), 1.25, cuts=3)
    rig.part("head", g, glow="#FFFFFF", outline=0)
    g = Geo().capsule(R(11.3, -1.0, 43.5), R(11.5, -1.0, 37.0), 1.1).capsule(R(11.4, -1.0, 32.5), R(11.5, -1.0, 26.5), 1.1)
    for k in range(5):   # crown points
        a = math.radians(-60 + 30 * k)
        g.lathe([(1.8, 0), (0, 4.2)], R(1.5 + 9.2 * math.cos(a), 9.0 * math.sin(a), 42.0),
                R(1.5 + 9.2 * math.cos(a), 9.0 * math.sin(a), 46.5), segs=8)
    g.lathe([(9.9, -1.2), (10.3, 0), (9.9, 1.2)], R(1.5, 0, 42.2), R(1.5, 0, 43.2), segs=24, squash=(1.0, 0.97))
    rig.part("head", g, GOLD, finish="metal", outline=0.8)
    rig.secondary("plume", "head", R(-2, 0, 45), R(-20, 0, 42), max_deg=12, gain=1.0)
    g = Geo()
    for x, z, r in ((-1, 46, 4.6), (-5, 50, 5.4), (-10.5, 51.5, 5.2), (-16, 49.5, 4.6), (-20, 45, 3.8),
                    (-22, 40, 3.0)):
        g.blob(R(x, 0, z), (r * 1.15, r * 0.9, r), p=2.1)
    rig.part("plume", g, team=True)

    # arms (rest hanging): far arm holds the banner, near arm the warhammer
    for s, y in (("r", -12.5), ("l", 12.0)):
        rig.joint(f"arm_{s}", "torso", R(0, y, 20))
        rig.joint(f"fore_{s}", f"arm_{s}", R(0, y, 12))
        rig.joint(f"hand_{s}", f"fore_{s}", R(0, y, 5))
        g = Geo().capsule(R(0, y, 20), R(0, y, 12), 4.4, 4.0)
        rig.part(f"arm_{s}", g, STEEL, finish="metal")
        g = Geo().capsule(R(0, y, 12), R(0, y, 7), 4.0, 3.8).blob(R(0, y, 7.6), (4.8, 4.8, 2.0), p=2.6)
        rig.part(f"fore_{s}", g, STEEL, finish="metal")
        g = Geo().blob(R(0.4, y, 4.6), (4.4, 4.2, 4.4), p=2.4)
        rig.part(f"hand_{s}", g, STEEL_DARK, finish="metal")

    # banner on a tall pole in the far hand; the cloth hangs back from the top and swings
    x, y, z = R(0, 12.0, 5)
    g = Geo().capsule((x, y, z - 22), (x, y, z + 66), 1.4)
    rig.part("hand_l", g, POLE, outline=0.8)
    g = Geo().lathe([(0, 0), (2.8, 1.5), (0, 7.0)], (x, y, z + 66), (x, y, z + 74), segs=10)
    rig.part("hand_l", g, GOLD, finish="metal", outline=0.8)
    g = Geo().capsule((x - 1, y, z + 62), (x - 23, y, z + 62), 1.2)
    rig.part("hand_l", g, POLE, outline=0.8)
    rig.secondary("banner", "hand_l", (x - 1, y, z + 62), (x - 12, y, z + 34), max_deg=10, gain=1.0)
    pts = [(-1, 62), (-23, 62), (-23, 32), (-17, 36), (-12, 30), (-7, 36), (-1, 32)]
    g = Geo().slab([(x + px, z + pz) for px, pz in pts], y - 0.5, 1.4)
    rig.part("banner", g, team=True, outline=0.8)
    g = Geo().blob((x - 12, y - 1.8, z + 49), (5.8, 0.8, 5.8), p=2.0)
    rig.part("banner", g, PARCH, outline=0.6)
    g = Geo()
    for dx, dz, r in ((-12, 47.2, 2.3), (-15.6, 51.8, 1.2), (-13.2, 53.2, 1.2), (-10.6, 53.2, 1.2), (-8.4, 51.8, 1.2)):
        g.blob((x + dx, y - 2.6, z + dz), (r, 0.6, r), p=2.0)
    rig.part("banner", g, FUR_DARK, outline=0)   # a bear paw emblem

    # the warhammer in the near hand: a long haft, a big steel head with gold bands and a spike
    x, y, z = R(0, -12.5, 5)
    g = Geo().capsule((x, y - 1, z - 9), (x, y - 1, z + HAMMER - 4), 1.8)
    rig.part("hand_r", g, POLE, outline=0.8)
    g = Geo().sphere((x, y - 1, z - 10), 2.4, cuts=3)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.8)
    hz = z + HAMMER
    g = Geo().blob((x, y - 1, hz), (10.0, 6.4, 6.8), p=3.6)
    g.lathe([(0, 0), (3.8, 1.0), (0, 8.0)], (x + 9.0, y - 1, hz), (x + 17.0, y - 1, hz), segs=10)
    g.lathe([(0, 0), (3.2, 1.0), (0, 6.0)], (x, y - 1, hz + 6.0), (x, y - 1, hz + 12.0), segs=10)
    rig.part("hand_r", g, STEEL, finish="metal")
    g = Geo()
    for dx in (-6.5, 6.5):
        g.blob((x + dx, y - 1, hz), (1.4, 6.9, 7.3), p=3.0)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.8)
    rig.track("hammerHead", "hand_r", (x, y - 1, hz))


# -- poses ---------------------------------------------------------------------------------
def hammer(a, f, w, yaw=0.0):
    p = B.arm("r", a, f, w, w_rest=90.0)
    if yaw:
        p["arm_r"]["rz"] = yaw
    return p


def banner(a, f, w=90.0):
    return B.arm("l", a, f, w, w_rest=90.0)


STANCE = merge(hammer(-40, 30, 62), banner(-50, 20, 94), {"torso": {"r": -3}})
BELLY = (0.0, 0.0, 72.0)
HIND = (-34.0, 0.0, 0.0)


def _banner_hang(pose):
    # keep the banner cloth hanging down whatever the pole does
    chain = sum(pose.get(j, {}).get("r", 0.0) for j in ("body", "bear", "rider", "torso", "arm_l", "fore_l", "hand_l"))
    pose.setdefault("banner", {})["r"] = pose.get("banner", {}).get("r", 0.0) - chain
    return pose


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    sniff = [0.0, 0.4, 1.0, 0.7, 1.0, 0.2][f]
    pose = merge(STANCE, {
        "bear": {"z": 1.6 * c},
        "body": squash(0.02 * c),
        "neck": {"r": -3.0 * lag + 7 * sniff}, "bhead": {"r": 2.5 * lag + 5 * sniff},
        "jaw": {"r": -3 * sniff},
        "rider": {"z": 1.0 * lag},
        "torso": {"r": 1.2 * lag},
        "head": {"r": -1.5 * lag},
        "arm_r": {"r": 2.5 * lag}, "hand_r": {"r": -3 * lag},
        "leg_fr": {"r": 1.0 * c}, "leg_br": {"r": -1.0 * c},
        "tail": {"r": 6 * lag},
    })
    if f == 5:
        pose = merge(pose, F.expr("blink", mouth=None))
    return _banner_hang(pose)


def _walk(f):
    # a heavy bear walk: diagonal pairs, 0.88 s per cycle, the hump rolling and the head nodding
    p = 2 * math.pi * f / 8
    s = math.sin(p)
    c = math.cos(p)
    bob = -2.4 * math.cos(2 * p)
    lagp = 2 * (p - 2 * math.pi / 8)
    up = lambda v: max(0.0, v)
    return _banner_hang(merge(STANCE, {
        "bear": {"z": bob - 0.6, "r": 1.4 * s, "rx": 1.6 * s},
        # swing kept short so the paws plant at the sim speed (55 lu/s, playback ~1x)
        "leg_fr": {"r": 9 * s + 4 * up(c)}, "leg_fr2": {"r": -36 * up(c)},
        "leg_bl": {"r": 8 * s}, "leg_bl2": {"r": 26 * up(-c)},
        "leg_fl": {"r": -9 * s + 4 * up(-c)}, "leg_fl2": {"r": -36 * up(-c)},
        "leg_br": {"r": -8 * s}, "leg_br2": {"r": 26 * up(c)},
        "neck": {"r": -6 * math.cos(2 * p)}, "bhead": {"r": 4 * math.cos(2 * p)},
        "rider": {"z": -1.5 * math.cos(lagp)},
        "torso": {"r": -1.5 * math.cos(lagp)},
        "hand_r": {"r": 3 * math.cos(lagp)},
        "arm_l": {"r": 2 * math.cos(lagp)},
        "tail": {"r": 5 * math.sin(2 * p)},
    }))


# attack: 10 unique poses in the 12 heavy steps (moves.HEAVY_MELEE_MS), impact on pose 6. The
# hammer arm is held level and swung round the paladin's vertical axis (yaw): -180 points
# straight back, -90 toward the viewer, 0 forward.
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        shift  dip  rear  HOLD  swipe sweep IMPACT carry follow settle
BR = [2, -2, 12, 18, 6, -2, -6, -4, -1, 0]            # bear pitch about the hind paws
BX = [-1.0, -2.0, -4.0, -5.0, 1.0, 5.0, 8.0, 7.0, 3.0, 0.0]
BQ = [-0.02, -0.05, 0.03, 0.04, 0.02, -0.02, -0.07, 0.02, 0.0, 0.0]
PAW = [(6, -10), (10, -20), (60, -70), (84, -80), (50, -20), (30, 10), (18, 16), (14, 8), (6, 0), (0, 0)]
PAW_L = [(2, 0), (4, -6), (10, -20), (14, -26), (8, -14), (4, 0), (-2, 0), (0, 0), (0, 0), (0, 0)]
NECK = [2, -6, 10, 14, 0, -8, -10, -6, -2, 0]
BHEAD = [0, 4, 6, 8, -2, -4, 4, 2, 0, 0]
JAW = [-2, -8, -18, -26, -20, -18, -28, -20, -8, 0]
H_YAW = [-20, -100, -150, -172, -120, -70, -14, 30, 20, 0]
H_A = [-30, -6, 10, 22, 12, 4, 4, -2, -20, -36]
H_F = [20, 0, 2, 8, 2, -2, -4, -8, 5, 28]
H_W = [60, 20, 14, 26, 14, 8, 8, -4, 20, 58]
T_YAW = [0, -12, -24, -34, -14, 6, 24, 34, 18, 4]
T_R = [-3, 2, 6, 10, 2, -4, -6, -8, -6, -3]


def _attack_pose(f):
    pose = merge(hammer(H_A[f], H_F[f], H_W[f], yaw=H_YAW[f]), banner(-50, 20, 94), {
        "bear": {"r": 0.0},
        "leg_fr": {"r": PAW[f][0]}, "leg_fr2": {"r": PAW[f][1]},
        "leg_fl": {"r": PAW_L[f][0]}, "leg_fl2": {"r": PAW_L[f][1]},
        "leg_br": {"r": [2, 4, 10, 14, 4, -4, -8, -6, -2, 0][f]},
        "leg_bl": {"r": [2, 4, 8, 12, 2, -4, -6, -4, -2, 0][f]},
        "neck": {"r": NECK[f]}, "bhead": {"r": BHEAD[f]}, "jaw": {"r": JAW[f]},
        "torso": {"r": T_R[f], "rz": T_YAW[f]},
        "head": {"r": -0.4 * T_R[f], "rz": -0.5 * T_YAW[f]},
        "tail": {"r": [0, 4, 10, 12, -6, -10, -8, 4, 2, 0][f]},
    }, M.body_about(HIND, x=BX[f], r=BR[f], q=BQ[f]))
    if f in (4, 5):
        pose["hand_r"]["sz"] = 1.15
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("squeeze", mouth=None) if f == 1 else {})
    if f in (5, 6, 7):
        pose = merge(pose, {"btongue": {"show": True}})
    return _banner_hang(pose)


RX, RY, RZ = R(0, -12.5, 5)
HEAD_C = (RX, RY - 1, RZ + HAMMER)
SWEEP = {"kind": "arc", "joint": "hand_r", "inner": (RX, RY - 1, RZ + HAMMER * 0.3),
         "outer": (RX, RY - 1, RZ + HAMMER + 8), "color": "#D6DDE6", "taper": 0.15, "white": 0.3,
         "t0": 0.0, "t1": 0.95, "lines": 3, "line_gap_lu": 3.4, "outline_lu": 1.6, "samples": 20}
CLAWS = [(34 + 3 + 1 + 20.0, -15 + dy, 3.0) for dy in (-6.0, 0.0, 6.0)]


def _attack_clip():
    claw = {"kind": "claw", "joint": "leg_fr2", "points": CLAWS, "color": "#F2EAD8", "width_lu": 4.5,
            "white": 0.3}
    ov = {
        4: [dict(SWEEP, **{"from": 3}), dict(claw, **{"from": 3})],
        5: [dict(SWEEP, **{"from": 3}), dict(claw, **{"from": 4})],
        6: [dict(SWEEP, **{"from": 5, "t1": 1.0, "lines": 2}),
            {"kind": "burst", "joint": "hand_r", "point": HEAD_C, "r0_lu": 12.0, "r1_lu": 22.0, "n": 6,
             "a0": -60.0, "arc": 150.0},
            {"kind": "dust", "ground": (56.0, 0.0), "size_lu": 14.0, "puffs": 5, "seed": 61, "spread": 1.3}],
        7: [{"kind": "dust", "ground": (60.0, 0.0), "size_lu": 11.0, "puffs": 4, "seed": 62, "spread": 1.6}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


def _hit(k):
    def recoil(a, shake):
        return {"body": dict(squash(-0.05 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "bear": {"r": 3 * a},
                "neck": {"r": 10 * a}, "bhead": {"r": -6 * a + 8 * shake, "rx": 10 * shake},
                "jaw": {"r": -10 * max(a, 0)},
                "torso": {"r": 10 * a}, "head": {"r": 6 * a}, "arm_r": {"r": 12 * a},
                "tail": {"r": 10 * a}}
    return _banner_hang(M.hit_beast(k, STANCE, recoil, face_hurt=F.expr("squeeze", mouth=None)))


# die D5 unhorsed: 8 unique poses in the 12 heavy steps (moves.DIE_SEQ_HEAVY)
#        struck rear  thrown  air  flop  flat settle shrink
D_BR = [4, 22, 18, 4, -4, -2, 0, 0]
D_Z = [0, 0, 0, 0, -26, -36, -35, -35]
D_X = [-3, -4, -4, -2, 0, 0, 0, 0]
D_Q = [-0.06, 0.05, 0.02, 0.0, -0.08, -0.05, -0.02, -0.04]
D_S = [1, 1, 1, 1, 1, 1, 1, 0.95]
D_LF = [(6, -10), (60, -60), (50, -50), (10, -6), (-50, 40), (-70, 60), (-72, 62), (-72, 62)]
D_LB = [(-4, 0), (-6, 0), (-4, 0), (0, 0), (40, -20), (70, -40), (72, -42), (72, -42)]
D_NECK = [8, 16, 12, 0, -14, -22, -24, -24]
D_BH = [-4, -8, -4, 0, 4, 8, 10, 10]
D_JAW = [-14, -24, -20, -10, -16, -18, -18, -18]
D_RX = [0, -4, -26, -48, -62, -64, -64, -64]
D_RZ = [0, 4, 30, 18, -40, -30, -30, -30]
D_RR = [4, 25, 110, 250, 450, 450, 450, 450]


def _die(k):
    pose = merge(STANCE, M.body_about(HIND, x=D_X[k], z=D_Z[k], r=D_BR[k], q=D_Q[k], s=D_S[k]), {
        "leg_fr": {"r": D_LF[k][0]}, "leg_fr2": {"r": D_LF[k][1]},
        "leg_fl": {"r": D_LF[k][0] - 6}, "leg_fl2": {"r": D_LF[k][1] - 6},
        "leg_br": {"r": D_LB[k][0]}, "leg_br2": {"r": D_LB[k][1]},
        "leg_bl": {"r": D_LB[k][0] - 4}, "leg_bl2": {"r": D_LB[k][1] + 4},
        "neck": {"r": D_NECK[k]}, "bhead": {"r": D_BH[k]}, "jaw": {"r": D_JAW[k]},
        "tail": {"r": [0, 16, 12, 4, -10, -16, -16, -16][k]},
        "rider": {"x": D_RX[k], "z": D_RZ[k], "r": D_RR[k] - D_BR[k]},
        "arm_r": {"r": [20, 70, 130, 90, 50, 50, 50, 50][k]},
        "arm_l": {"r": [10, 60, 120, 80, 40, 40, 40, 40][k]},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    elif k >= 4:
        pose = merge(pose, F.expr("x", mouth=None), {"btongue": {"show": True}})
    return _banner_hang(pose)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [110] * 8, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True)
