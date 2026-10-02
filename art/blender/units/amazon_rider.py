"""Amazon Rider: Bronze Age Epic Skirmisher (CONTENT_PLAN 5.2 #11). Pounce (search 180): rides round the
blocker to the back line; first strike x2. ~118 lu.

A viewer expects a horse archer-warrior to gallop in, lean out of the saddle and sweep her axe
flat through the enemy, and to ride at a quick trot.

Look: a dapple-grey steppe horse with a cream mane and tail, a team saddle cloth with a sandstone
fringe and lambda, a team saddle roll. The rider (1.2x) is an Amazon in a team Scythian cap with
ear flaps and a long braid that streams back, a team tunic with a sandstone zig-zag hem over
plum trousers, soft boots, a crescent pelte shield on the far arm, and a sagaris: a long haft
with a small bronze axe blade on one side and a spike on the other.

Animation (cartoon kit v2, built on the Cuirassier's rider rig):
  idle    the horse paws and snorts, the tail swishes, she spins the sagaris in her fingers
  walk    a quick trot, the braid and tail bouncing a frame late
  attack  LEAN-OUT FLAT SWEEP: the horse gathers, she draws the axe back level behind her with
          her torso twisted away (held extreme), the horse leaps, she leans out of the saddle
          and sweeps the axe flat through the target at chest height (a wide crescent smear),
          impact lines and dust as the forelegs land, the axe follows through and she sits up
  hit     the horse shakes its head, she rocks back
  die     D5 unhorsed: the horse rears, she is thrown off the back spinning, the horse flops
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as KB
from ageborn_art import kit_gunpowder as G
from ageborn_art import rigs_bronze as BZ
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "amazon_rider"
NAME = "Amazon Rider"
HEIGHT_LU = 118
YAW_DEG = -10.0
CANVAS = (480, 356)
FEET = (232, 312)
ANCHORS = {"head": (0, 116), "hitCenter": (0, 50)}
NO_RETIME = True

COAT = "#B3ADA6"       # dapple grey
COAT_DK = "#958F88"
POINTS = "#6E6862"     # darker lower legs
MANE = "#E9E1CF"       # cream mane and tail
HAIR = "#3A2C24"
HOOF = "#3A3634"
STEEL = "#B8C0C9"
DARK = "#23262E"
BLADE = BZ.BRONZE
EYE = "#FAF6EE"
NOSE = "#6E5A4E"

# sagaris: joint in the near hand (rider space, rest pose); haft modelled pointing up (+Z)
SX, SY, SZ = 9.5, -14.0, 65.5
SABRE = 34.0


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("horse", "body", (0, 0, 40))
    for name, x, y, z, front in (("leg_fl", 17, 6.5, 36, True), ("leg_bl", -17, 6.5, 38, False),
                                 ("leg_fr", 17, -6.5, 36, True), ("leg_br", -17, -6.5, 38, False)):
        G.horse_leg(rig, name, "horse", x, y, z, front, COAT, POINTS, HOOF, feather=POINTS)

    # barrel, the team shabraque (cream braided edge, brass studs, a cream anchor), saddle
    g = Geo().blob((0, 0, 41), (25, 11.5, 12), p=2.3)
    g.blob((14.0, 0, 42.0), (11.0, 12.0, 11.5), p=2.2)      # deep chest
    rig.part("horse", g, COAT)
    cap = Geo().blob((-3.5, 0, 43.5), (21.5, 13.8, 12.8), p=3.2, taper=(1.12, 0.92))
    cap.clip((0, 0, 27.4), (0, 0, -1))
    cf = F.Face(rig, "horse", [cap])
    rig.part("horse", cap, team=True)
    g = Geo().blob((-3.5, 0, 29.0), (22.4, 14.4, 2.4), p=3.4)
    g.blob((-24.4, 0, 40.0), (2.2, 14.2, 10.0), p=3.2)
    rig.part("horse", g, BZ.SAND)
    g = Geo()
    for x in range(-22, 18, 4):                                # fringe on the edge
        g.blob((x, -15.0, 29.0), (1.2, 0.6, 1.4), p=2.2, rot=(0, 30, 0))
    rig.part("horse", g, "#CFC3A6", outline=0)
    KB.lambda_mark(rig, "horse", (-6.0, -14.9, 39.5), size=1.4)
    for x, z in ((-14.0, 42.0), (2.0, 44.0), (-20.0, 34.0), (8.0, 36.0)):     # dapples on the haunch
        rig.part("horse", Geo().blob((x, -11.8, z), (2.6, 0.8, 2.2), p=2.2), COAT_DK, outline=0)
    g = Geo()
    for x in (-18, -8, 2, 12):
        g.sphere((x, -14.6, 33.8), 1.3, cuts=3)
    rig.part("horse", g, BZ.BRONZE_HI, finish=BZ.POLISH, outline=0.8)
    g = Geo().blob((-2, 0, 54.5), (11.5, 9.5, 3.6), p=2.6)   # saddle
    g.blob((-11.5, 0, 57.0), (2.6, 8.5, 4.0), p=2.4)
    rig.part("horse", g, B.WOOD)
    # a team portmanteau (saddle roll) behind the cantle, cream end caps
    g = Geo().capsule((-15.0, -9.0, 57.5), (-15.0, 9.0, 57.5), 3.6)
    rig.part("horse", g, team=True)
    g = Geo()
    for y in (-9.6, 9.6):
        g.blob((-15.0, y, 57.5), (3.8, 1.2, 3.8), p=2.4)
    rig.part("horse", g, BZ.SAND, outline=0.5)

    # neck with a plaited mane, a 1.25x head with a white blaze, bridle and brass bit
    rig.joint("neck", "horse", (21, 0, 49))
    rig.joint("hhead", "neck", (32, 0, 66), scale=1.25)
    g = Geo().capsule((20, 0, 46), (31, 0, 64), 9.2, 6.8)
    rig.part("neck", g, COAT)
    g = Geo()
    for i in range(6):
        t = i / 5
        g.sphere((16.5 + 13 * t, 0, 56.5 + 15 * t), 3.0 - 0.3 * t, cuts=3)   # plaits
    rig.part("neck", g, MANE, finish="hair")
    head = Geo().blob((38, 0, 63), (12.5, 6.4, 7.2), p=2.4, rot=(0, 40, 0))
    head.blob((46.0, 0, 55.2), (6.8, 6.0, 5.8), p=2.2)
    head.blob((33.0, 0, 62.0), (6.2, 6.6, 6.0), p=2.2)
    rig.part("hhead", head, COAT)
    g = Geo()
    for y in (-3.4, 3.4):
        g.lathe([(2.2, 0), (1.6, 2.4), (0, 5.0)], (30.5, y, 70), (29.4, y * 1.3, 76.0), segs=10)
    rig.part("hhead", g, COAT)
    g = Geo().blob((47.6, -1.0, 54.4), (4.4, 5.2, 4.2), p=2.2)        # nose pad
    rig.part("hhead", g, NOSE)
    g = Geo().blob((42.0, -2.8, 61.5), (7.2, 3.8, 2.4), p=2.4, rot=(0, 44, 0))   # blaze
    rig.part("hhead", g, "#E4DED4", outline=0.6)
    g = Geo().blob((34.6, -5.2, 66.2), (2.4, 1.5, 2.7))
    rig.part("hhead", g, EYE, highlight=False, outline=0.8)
    rig.joint("hpupil", "hhead", (35.4, -6.3, 65.8))
    g = Geo().sphere((35.5, -6.2, 66.0), 1.35, cuts=3)
    rig.part("hpupil", g, DARK, outline=0)
    rig.joint("hlid", "hhead", (35.0, -6.0, 66.0), hidden=True)
    g = Geo().blob((35.0, -6.2, 66.2), (2.6, 1.2, 2.9))
    rig.part("hlid", g, COAT_DK, outline=0.6)
    g = Geo().sphere((50.2, -4.2, 55.8), 1.2, cuts=3)                  # nostril
    rig.part("hhead", g, DARK, outline=0)
    g = Geo().capsule((44.0, -6.2, 58.8), (43.0, -6.0, 55.0), 1.0).capsule((43.0, -6.0, 55.0), (47.0, -5.6, 52.0), 1.0)
    g.capsule((33.0, -6.4, 70.0), (43.6, -6.4, 58.0), 1.0)
    rig.part("hhead", g, BZ.LEATHER_DK, outline=0.5)
    g = Geo().capsule((47.5, -5.4, 52.5), (47.5, 5.4, 52.5), 1.3)
    rig.part("hhead", g, BZ.BRONZE, finish=BZ.POLISH, outline=0.8)
    rig.secondary("forelock", "hhead", (31.0, 0, 71.0), (37.0, 0, 64.0), max_deg=16, gain=1.2)
    g = Geo().capsule((31.0, -1.0, 71.0), (35.0, -1.5, 67.0), 2.6, 2.0).capsule((35.0, -1.5, 67.0), (37.5, -1.8, 63.5), 2.0, 1.0)
    rig.part("forelock", g, MANE, finish="hair")
    rig.secondary("tail", "horse", (-26, 0, 49), (-32, 0, 34), max_deg=16, gain=1.1)
    g = Geo().capsule((-26, 0, 49), (-31, 0, 43), 2.8, 3.4).capsule((-31, 0, 43), (-32, 0, 34), 3.4, 1.6)
    rig.part("tail", g, MANE, finish="hair")

    # the rider, 1.2x relative to the horse, scaled about the saddle
    rig.joint("rider", "horse", (-2, 0, 57), scale=1.2)
    rig.joint("ktorso", "rider", (-1, 0, 58))
    rig.joint("khead", "ktorso", (0, 0, 79))
    g = Geo().capsule((-1, -8.5, 58), (8, -11.5, 52), 5.2, 4.6)
    rig.part("rider", g, BZ.PLUM)
    g = Geo()
    for t in (0.25, 0.65):
        g.blob((-1 + 9 * t, -13.2 + -3 * t * 0.3, 58 - 6 * t), (1.6, 0.8, 1.6), p=2.0)
    rig.part("rider", g, BZ.SAND_LT, outline=0)
    g = Geo().capsule((8, -11.5, 53), (7, -11.5, 40), 4.8, 4.2)
    g.blob((9.5, -11.5, 38.0), (5.8, 4.2, 3.0), p=2.8)
    rig.part("rider", g, BZ.LEATHER)
    g = Geo().blob((7.6, -11.5, 51.0), (5.6, 5.0, 2.0), p=2.6)        # boot cuff
    rig.part("rider", g, BZ.SAND_LT, outline=0.5)
    # torso: team tunic, sandstone zig-zag hem, a leather belt with a gorytos strap
    g = Geo().blob((-1, 0, 69.5), (9.2, 10.2, 11.4), p=2.4, taper=(1.0, 1.04))
    rig.part("ktorso", g, team=True)
    g = Geo()
    for k in range(8):
        a = math.pi * (0.55 + 1.9 * k / 7)
        g.blob((-1 + 10.0 * math.cos(a), 10.8 * math.sin(a), 60.5 + (1.0 if k % 2 else -0.3)), (2.0, 1.8, 1.4),
               p=2.4, rot=(0, 0, math.degrees(a) + 90))
    rig.part("ktorso", g, BZ.SAND_LT, outline=0.5)
    g = Geo().blob((-0.6, 0, 63.6), (10.2, 11.0, 1.6), p=3.0)
    rig.part("ktorso", g, BZ.LEATHER_DK)
    rig.secondary("ktails", "ktorso", (-8.0, 0, 63.0), (-15.0, 0, 55.0), max_deg=16, gain=1.1)
    g = Geo().blob((-11.0, 0, 59.0), (5.0, 9.0, 3.0), p=2.6, rot=(0, -35, 0))
    rig.part("ktails", g, team=True)
    # head: face kit, the Scythian cap with ear flaps, a long braid
    kh = Geo().blob((1.5, 0, 87), (8.8, 8.4, 8.6), p=2.3)
    kh.blob((10.4, -0.5, 85.8), (2.6, 2.4, 2.6), p=2.0)
    K.face2(rig, [kh], BZ.SKIN, cx=8.8, cz=87.0, eye_dy=(-3.6, 3.2), eye_r=(3.1, 2.9, 3.5),
            pupil_r=(1.2, 1.7, 2.0), brow=HAIR, brow_w=0.7, mouth_w=4.0, mouth_dz=-5.2,
            head="khead", eye_at=(10.4, 87.2), mouth_x=9.6, mark_r=3.0)
    rig.part("khead", kh, BZ.SKIN)
    g = Geo().blob((0.0, 0, 91.6), (9.6, 9.4, 8.4), p=2.3, taper=(1.02, 0.8))
    g.clip((0, 0, 89.0), (0, 0, -1))
    g.capsule((-1.0, 0, 97.0), (2.0, 0, 103.5), 4.8, 2.6)
    g.capsule((2.0, 0, 103.5), (6.0, 0, 103.0), 2.6, 1.4)
    rig.part("khead", g, team=True)
    g = Geo()
    for y in (-8.6, 8.6):
        g.blob((0.0, y, 83.0), (3.6, 1.6, 6.0), p=2.3, taper=(0.7, 1.0))
    rig.part("khead", g, team=True, outline=0.7)
    g = Geo().blob((0.2, 0, 89.4), (9.9, 9.7, 1.4), p=2.8)
    rig.part("khead", g, BZ.SAND, outline=0.5)
    rig.secondary("crest", "khead", (-7, 0, 86), (-18, 0, 70), max_deg=16, gain=1.3)
    g = Geo()
    for k in range(5):
        t = k / 4
        g.blob((-8.0 - 7.0 * t, 1.0, 85.0 - 14.0 * t), (2.6 - 0.4 * t, 2.4, 2.8 - 0.4 * t), p=2.2)
    rig.part("crest", g, HAIR, finish="hair")
    g = Geo().blob((-15.6, 1.0, 69.6), (1.8, 2.0, 1.2), p=2.4)
    rig.part("crest", g, team=True, outline=0.4)

    # far arm: reins
    rig.joint("karm_l", "ktorso", (0, 10.5, 77))
    rig.joint("kfore_l", "karm_l", (3, 12, 68))
    g = Geo().capsule((0, 10.5, 77), (3, 12, 68), 3.8, 3.4)
    rig.part("karm_l", g, BZ.SKIN)
    g = Geo().capsule((3, 12, 68), (10, 11, 65.5), 3.4, 3.2).blob((10.5, 11, 65), (3.6, 3.6, 3.6), p=2.6)
    rig.part("kfore_l", g, BZ.SKIN)
    # the pelte: a crescent wicker shield on the far forearm (plum, a bronze rim)
    g = Geo().blob((5.0, 15.0, 70.0), (8.0, 1.6, 9.0), p=2.2)
    g.clip((11.0, 0, 76.0), (0.6, 0, 1))
    rig.part("kfore_l", g, BZ.PLUM)
    g = Geo().blob((5.0, 14.2, 70.0), (8.6, 1.2, 9.6), p=2.2)
    g.clip((11.0, 0, 76.0), (0.6, 0, 1))
    g.clip((0, 14.0, 0), (0, -1, 0))
    rig.part("kfore_l", g, BZ.BRONZE, finish=BZ.POLISH, outline=0.5)
    # near arm: team sleeve, cream gauntlet, sabre
    rig.joint("karm_r", "ktorso", (0, -10.5, 77))
    rig.joint("kfore_r", "karm_r", (3, -12, 68))
    rig.joint("sabre", "kfore_r", (SX, SY, SZ))
    g = Geo().capsule((0, -10.5, 77), (3, -12, 68), 4.0, 3.6)
    rig.part("karm_r", g, BZ.SKIN)
    g = Geo().capsule((3, -12, 68), (8.5, -13, 66), 3.6, 3.4)
    rig.part("kfore_r", g, BZ.SKIN)
    g = Geo().blob((5.0, -12.6, 67.2), (3.6, 4.2, 2.0), p=2.6, rot=(0, -60, 0))
    rig.part("kfore_r", g, BZ.LEATHER, outline=0.6)               # bracer
    for y in (-10.5, 10.5):   # short team sleeves
        g = Geo().blob((-0.5, y * 1.02, 77.5), (5.6, 5.0, 4.4), p=2.4)
        rig.part("ktorso" if y > 0 else "karm_r", g, team=True)
    g = Geo().blob((SX + 0.6, SY, SZ), (3.6, 3.4, 3.6), p=2.3)    # fist
    rig.part("sabre", g, BZ.SKIN)
    g = Geo().capsule((SX, SY - 0.6, SZ - 8.0), (SX, SY - 0.6, SZ + SABRE), 1.1, 1.0)
    rig.part("sabre", g, BZ.WOOD_DK, outline=0.6)
    g = Geo()
    for z in (SZ - 5.0, SZ + 4.0):
        g.blob((SX, SY - 0.6, z), (1.5, 1.5, 0.6), p=3.0)
    rig.part("sabre", g, BZ.LEATHER, outline=0.3)
    # the axe blade (forward) and the back spike at the top of the haft
    hz = SZ + SABRE - 3.0
    g = Geo().slab([(SX + 0.6, hz + 2.4), (SX + 7.0, hz + 5.6), (SX + 9.4, hz + 2.0), (SX + 9.0, hz - 3.6),
                    (SX + 6.4, hz - 5.2), (SX + 0.6, hz - 2.4)], SY - 1.2, 1.6)
    rig.part("sabre", g, BLADE, finish=BZ.POLISH, outline_hex="#6E5A3A")
    g = Geo().capsule((SX + 8.8, SY - 2.2, hz + 3.4), (SX + 9.0, SY - 2.2, hz - 3.4), 0.6)
    rig.part("sabre", g, "#F4ECD6", outline=0)
    g = Geo().lathe([(1.6, 0), (1.2, 2.0), (0, 6.0)], (SX - 0.6, SY - 1.0, hz), (SX - 6.6, SY - 1.0, hz), segs=8)
    rig.part("sabre", g, BZ.AGED, finish="metal", outline=0.5)
    g = Geo().blob((SX, SY - 0.8, hz), (2.2, 2.0, 3.0), p=2.6)
    rig.part("sabre", g, BZ.BRONZE_HI, finish=BZ.POLISH, outline=0.4)
    rig.track("sabreTip", "sabre", (SX + 9.4, SY, SZ + SABRE - 3.0))
    rig.track("_foot", "leg_fr2", (19.8, -6.5, 0.5))


# -- poses ---------------------------------------------------------------------------------
SABRE_CHAIN = ("body", "horse", "rider", "ktorso", "karm_r", "kfore_r")


def sabre_at(pose, deg):
    """Points the sabre `deg` above the horizon, whatever its parents do."""
    chain = sum(pose.get(j, {}).get("r", 0.0) for j in SABRE_CHAIN)
    pose.setdefault("sabre", {})["r"] = deg - 90.0 - chain
    return pose


KR0, KF0 = 22.0, 46.0     # near arm at rest: the sabre sloped back against the shoulder
STANCE = {"karm_l": {"r": 22}, "kfore_l": {"r": 20}, "karm_r": {"r": KR0}, "kfore_r": {"r": KF0},
          "neck": {"r": -9}, "hhead": {"r": 7}}
IDLE_SABRE = 98.0
HX = (0.0, 0.0, 40.0)
HOOF_B = (-19.0, 0.0, 0.0)
H_BLINK = {"hlid": {"show": True}, "hpupil": {"hide": True}}


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    paw = [0.0, 0.0, 0.6, 1.0, 0.3, 0.0][f]      # the horse paws the ground with the near fore
    snort = [0.0, 0.0, 0.0, 0.5, 1.0, 0.3][f]
    pose = merge(STANCE, {
        "horse": {"z": 1.0 * c},
        "body": squash(0.02 * c),
        "neck": {"r": -3.0 * lag - 6 * snort}, "hhead": {"r": 2.5 * lag + 6 * snort},
        "rider": {"z": 0.8 * lag},
        "ktorso": {"r": 1.2 * lag}, "khead": {"r": -1.0 * lag},
        "karm_r": {"r": 2.0 * lag},
        "tail": {"r": [0, 8, 14, 4, -8, -4][f]},
        "leg_fr": {"r": 1.0 * c + 16 * paw}, "leg_fr2": {"r": -46 * paw},
        "leg_br": {"r": -1.0 * c},
    })
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    if f == 2:
        pose = merge(pose, H_BLINK)
    return sabre_at(pose, IDLE_SABRE + 1.5 * lag)


def _walk(f):
    p = 2 * math.pi * f / 8
    s_, c = math.sin(p), math.cos(p)
    bob = -2.0 * math.cos(2 * p)
    bob_lag = -1.6 * math.cos(2 * (p - 2 * math.pi / 8))
    up = lambda v: max(0.0, v)
    pose = merge(STANCE, {
        "horse": {"z": bob - 0.4, "r": 1.5 * s_},
        "leg_fr": {"r": 22 * s_ + 10 * up(c)}, "leg_fr2": {"r": -62 * up(c)},
        "leg_bl": {"r": 16 * s_}, "leg_bl2": {"r": 40 * up(-c)},
        "leg_fl": {"r": -22 * s_ + 10 * up(-c)}, "leg_fl2": {"r": -62 * up(-c)},
        "leg_br": {"r": -16 * s_}, "leg_br2": {"r": 40 * up(c)},
        "neck": {"r": -8 * math.cos(2 * p)}, "hhead": {"r": 4 * math.cos(2 * p)},
        "rider": {"z": bob_lag + 0.6},
        "ktorso": {"r": -2.5 * math.cos(2 * (p - 2 * math.pi / 8))},
        "karm_r": {"r": 3.0 * math.cos(2 * (p - 2 * math.pi / 8))},
        "tail": {"r": 6 * math.sin(2 * p)},
    })
    return sabre_at(pose, IDLE_SABRE + 4.0 * math.cos(2 * (p - 2 * math.pi / 8)))


# attack: 10 unique poses in the 12 heavy steps (moves.HEAVY_MELEE_MS), impact on pose 6
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#      shift  dip  coil HOLD leap  reach IMPACT skid follow settle
A_X = [-1.0, -3.0, -6.0, -8.0, 2.0, 9.0, 13.0, 12.0, 6.0, 1.0]
A_Z = [0.0, -1.5, -3.0, -4.0, 5.0, 7.0, 0.0, -1.0, 0.0, 0.0]
A_R = [2, 4, 9, 12, 10, 4, -6, -5, -2, 0]            # horse pitch (+ = forehand up)
A_Q = [-0.02, -0.05, -0.07, -0.08, 0.06, 0.04, -0.08, 0.02, 0.0, 0.0]
A_SX = [1.0, 1.0, 0.97, 0.96, 1.07, 1.05, 1.0, 1.0, 1.0, 1.0]
LFR = [(4, -8), (8, -20), (10, -32), (12, -42), (44, -76), (48, -46), (22, 0), (28, -4), (10, 0), (0, 0)]
LFL = [(0, 0), (4, -10), (6, -22), (8, -30), (34, -86), (42, -64), (16, 0), (22, 0), (6, 0), (0, 0)]
LBR = [(2, 0), (6, 4), (16, 8), (22, 10), (-32, 0), (-38, 12), (-18, 0), (6, 0), (2, 0), (0, 0)]
LBL = [(2, 0), (4, 2), (12, 6), (18, 8), (-36, 0), (-30, 16), (-14, 0), (10, 0), (4, 0), (0, 0)]
NECK = [2, -2, 6, 10, -6, -10, 6, 10, 4, 0]
HHEAD = [0, 4, -4, -6, 4, 6, -8, -10, -2, 0]
KT = [2, 6, 10, 12, 2, -14, -26, -22, -6, 0]         # rider lean (+ = back)
RZ = [0, 1.0, 2.5, 3.5, 2.0, 0.5, -1.5, -1.0, 0.0, 0.0]   # rises in the stirrups
KARM_R = [40, 80, 115, 130, 120, 100, 80, 60, 40, 26]
KFORE_R = [50, 70, 100, 115, 100, 85, 70, 60, 45, 48]
SAB = [100, 130, 168, 176, 130, 50, 2, -14, 30, IDLE_SABRE - 6]
KRZ = [0, -4, -10, -12, -6, 6, 8, 6, 2, 0]           # a small torso twist (away on the hold, into the sweep)
ARZ = [0, 0, 10, 15, 55, 35, 0, 0, 0, 0]              # the arm swings out about the vertical axis
A_TAIL = [0, 4, 8, 10, -12, -16, -8, 6, 4, 0]


def _attack_pose(f):
    pose = merge(STANCE, M.body_about(HX, x=A_X[f], z=A_Z[f], q=A_Q[f]), {
        "body": {"sx": A_SX[f]},
        "horse": {"r": A_R[f]},
        "leg_fr": {"r": LFR[f][0]}, "leg_fr2": {"r": LFR[f][1]},
        "leg_fl": {"r": LFL[f][0]}, "leg_fl2": {"r": LFL[f][1]},
        "leg_br": {"r": LBR[f][0]}, "leg_br2": {"r": LBR[f][1]},
        "leg_bl": {"r": LBL[f][0]}, "leg_bl2": {"r": LBL[f][1]},
        "neck": {"r": NECK[f]}, "hhead": {"r": HHEAD[f]},
        "rider": {"z": RZ[f]},
        "ktorso": {"r": KT[f], "rz": KRZ[f]}, "khead": {"r": -0.5 * KT[f], "rz": -0.5 * KRZ[f]},
        "karm_r": {"r": KARM_R[f] - KR0, "rz": ARZ[f]}, "kfore_r": {"r": KFORE_R[f] - KF0},
        "tail": {"r": A_TAIL[f]},
    })
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.7}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -0.8}})
    pose = sabre_at(pose, SAB[f])
    if f in (4, 5):
        pose["sabre"]["sz"] = 1.12
    return pose


TIP = (SX + 9.4, SY, SZ + SABRE - 3.0)
SIN = (SX + 3.0, SY, SZ + SABRE * 0.78)
CUT = {"kind": "arc", "joint": "sabre", "inner": SIN, "outer": TIP, "color": BLADE, "taper": 0.2,
       "white": 0.3, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}


def _attack_clip():
    ov = {
        4: [dict(CUT, **{"from": 3}),
            {"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 61, "spread": 1.2,
             "dir": -1.0}],
        5: [dict(CUT, **{"from": 3, "t0": 0.2})],
        6: [{"kind": "burst", "joint": "sabre", "point": TIP, "r0_lu": 8.0, "r1_lu": 15.0, "n": 6,
             "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (32.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 62, "spread": 1.2}],
        7: [{"kind": "dust", "ground": (36.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 63, "spread": 1.5}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


def _hit(k):
    def recoil(a, shake):
        return {"body": dict(squash(-0.06 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                "horse": {"r": 4 * a},
                "neck": {"r": 12 * a}, "hhead": {"r": -6 * a + 8 * shake, "rx": 10 * shake},
                "ktorso": {"r": 12 * a}, "khead": {"r": 8 * a},
                "karm_r": {"r": 16 * max(a, 0)}, "tail": {"r": 10 * a},
                "leg_br": {"r": -8 * max(a, 0)}, "leg_bl": {"r": -6 * max(a, 0)}}
    pose = M.hit_beast(k, STANCE, recoil, face_hurt=merge(F.expr("squeeze", "grit"), H_BLINK))
    return sabre_at(pose, IDLE_SABRE + 14 * M.HIT_AMT[k])


# die D5 unhorsed: 8 unique poses in the 12 heavy steps (moves.DIE_SEQ_HEAVY)
#        struck rear  thrown  air  buckle flop settle shrink
D_HR = [4, 26, 22, 4, -6, -2, 0, 0]
D_Z = [0, 0, 0, 0, -12, -22, -21, -21]
D_X = [-3, -4, -4, -2, 0, 0, 0, 0]
D_Q = [-0.08, 0.06, 0.03, 0.0, -0.1, -0.06, -0.03, -0.05]
D_S = [1, 1, 1, 1, 1, 1, 1, 0.94]
D_LF = [(6, -10), (44, -90), (40, -80), (6, -6), (-40, 110), (-62, 128), (-64, 130), (-64, 130)]
D_LB = [(-4, 0), (-6, 0), (-4, 0), (0, 0), (20, -30), (58, -118), (60, -122), (60, -122)]
D_NECK = [10, 18, 14, 0, -18, -30, -32, -32]
D_HH = [-6, -8, -6, 0, 8, 14, 16, 16]
D_RX = [0, -4, -22, -40, -48, -50, -50, -50]
D_RZ = [0, 3, 22, 10, -26, -20, -20, -20]
D_RR = [4, 25, 110, 250, 450, 450, 450, 450]


def _die(k):
    pose = merge(STANCE, M.body_about(HOOF_B, x=D_X[k], z=D_Z[k], r=D_HR[k], q=D_Q[k], s=D_S[k]), {
        "leg_fr": {"r": D_LF[k][0]}, "leg_fr2": {"r": D_LF[k][1]},
        "leg_fl": {"r": D_LF[k][0] - 6}, "leg_fl2": {"r": D_LF[k][1] - 8},
        "leg_br": {"r": D_LB[k][0]}, "leg_br2": {"r": D_LB[k][1]},
        "leg_bl": {"r": D_LB[k][0] - 4}, "leg_bl2": {"r": D_LB[k][1] + 6},
        "neck": {"r": D_NECK[k]}, "hhead": {"r": D_HH[k]},
        "tail": {"r": [0, 20, 16, 6, -10, -20, -20, -20][k]},
        "rider": {"x": D_RX[k], "z": D_RZ[k], "r": D_RR[k] - D_HR[k]},
        "karm_l": {"r": [20, 60, 120, 80, 40, 40, 40, 40][k]},
        "karm_r": {"r": [10, 40, 90, 60, 30, 30, 30, 30][k]},
        "ktorso": {"r": [6, 10, 0, 0, 0, 0, 0, 0][k]},
    })
    pose = sabre_at(pose, [IDLE_SABRE + 8, IDLE_SABRE + 20, 120, 200, 260, 262, 262, 262][k])
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"), H_BLINK)
    elif k < 4:
        pose = merge(pose, F.expr("o"))
    else:
        pose = merge(pose, F.expr("x", "tongue"), H_BLINK)
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [100] * 8, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_contract(cl, heavy=True)
