"""Hussar: Gunpowder Age epic skirmisher, pounce (CONTENT_PLAN 5.4), rider rig. Sabre, ~124 lu.

Look (A11, Gunpowder palette): a dappled grey light horse with a team saddle-cloth (a cream wolf-tooth
edge, a cream anchor), a black sheepskin over the saddle, ridden by a dashing hussar (1.2x): a tall
black fur busby with a team bag flying behind and a cream plume, a team dolman laced across the chest
with cream cords, a team pelisse slung over his near shoulder (fur trim), team breeches, short black
boots, a big curling moustache. He swings a long curved sabre.

"A viewer expects him to lean out of the saddle in a whipping sabre slash and to gallop, swerving
round the blocker on the pounce."

Animation (ANIM_SPEC G5 trot, appendix B for a sabre rider: whipping side slash, point thrust, overhead
cut; distinct from the Cuirassier's signature overhead cut):
  idle      the horse tosses its head and dances, the hussar twirls his moustache
  walk      walk v3 trot at ground speed (card 95 x 1.25 = 118.75 lu/s), a quick, light trot, the
            busby bag, plume, pelisse and tail streaming
  attack    WHIPPING SIDE SLASH: the horse gathers while he drops the sabre low behind his knee (the
            held extreme), then he leans right out of the saddle and whips the blade forward and up
            through the target, the busby bag flying
  attack_b  POINT THRUST: blade level over the horse's head, the point aimed, then a lunge along its neck
  attack_c  OVERHEAD CUT: rises in the stirrups with the sabre high behind his head, then cuts down
  hit       the horse shakes its head, the hussar rocks back
  die       D5 unhorsed: the horse rears, he is thrown off the back and lands flat
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as GT
from ageborn_art import kit_gunpowder as G
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "hussar"
GAIT_NAME = "rider"
NAME = "Hussar"
HEIGHT_LU = 124
YAW_DEG = -10.0
CANVAS = (480, 356)
FEET = (232, 312)
ANCHORS = {"head": (0, 116), "hitCenter": (0, 50)}
NO_RETIME = True

COAT = "#B9B6B0"       # dappled grey
COAT_DK = "#9A9690"
POINTS = "#6E6A66"     # grey points
MANE = "#E8E4DC"
HOOF = "#2F2E30"
STEEL = "#B8C0C9"
DARK = "#23262E"
BLADE = "#C9D0D8"
EYE = "#FAF6EE"
NOSE = "#6E5A4E"

# sabre: joint in the near hand (rider space, rest pose); blade modelled pointing up (+Z)
SX, SY, SZ = 9.5, -14.0, 65.5
SABRE = 46.0


RIG = None
LEGS = {}


def build(rig):
    global RIG
    RIG = rig
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("horse", "body", (0, 0, 40))
    for name, x, y, z, front in (("leg_fl", 17, 6.5, 36, True), ("leg_bl", -17, 6.5, 38, False),
                                 ("leg_fr", 17, -6.5, 36, True), ("leg_br", -17, -6.5, 38, False)):
        G.horse_leg(rig, name, "horse", x, y, z, front, COAT, POINTS, HOOF, feather=POINTS)
        # walk v3: the IK end is the bottom of the hoof; a tracker on every sole (planted hooves)
        x2 = x + (1.5 if front else -4.5)
        fx = x2 + (1.0 if front else 3.0)
        end = (fx + 1.2, y, 0.3)
        key = name[4:]
        LEGS[key] = GT.Leg(name, f"{name}2", end, bend=1.0 if front else -1.0)
        rig.track(f"_foot_{key}", f"{name}2", end)

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
    rig.part("horse", g, B.CREAM)
    g = Geo()
    for x in range(-22, 18, 4):                                # braid dashes on the edge
        g.blob((x, -15.0, 29.0), (1.2, 0.6, 1.4), p=2.2, rot=(0, 30, 0))
    rig.part("horse", g, "#CFC3A6", outline=0)
    g = G.anchor(cf, Geo(), K.scr(cf, (-6.0, -14.0, 40.5)), s=1.45, w=1.7)
    rig.part("horse", g, B.CREAM, highlight=False, outline=0)
    g = Geo()
    for x in (-18, -8, 2, 12):
        g.sphere((x, -14.6, 33.8), 1.3, cuts=3)
    rig.part("horse", g, B.BRASS, finish="metal", outline=0.8)
    g = Geo().blob((-2, 0, 55.5), (12.5, 10.5, 3.8), p=2.6)  # sheepskin
    rig.part("horse", g, "#2E2B2A", finish="hair")
    g = Geo().blob((-2, 0, 54.5), (11.5, 9.5, 3.6), p=2.6)   # saddle
    g.blob((-11.5, 0, 57.0), (2.6, 8.5, 4.0), p=2.4)
    rig.part("horse", g, B.WOOD)
    # a team portmanteau (saddle roll) behind the cantle, cream end caps
    g = Geo().capsule((-15.0, -9.0, 57.5), (-15.0, 9.0, 57.5), 3.6)
    rig.part("horse", g, team=True)
    g = Geo()
    for y in (-9.6, 9.6):
        g.blob((-15.0, y, 57.5), (3.8, 1.2, 3.8), p=2.4)
    rig.part("horse", g, B.CREAM, outline=0.5)
    g = Geo().blob((11.0, -10.4, 50.0), (3.8, 3.2, 5.6), p=2.6, rot=(0, -22, 0))   # pistol holster
    rig.part("horse", g, B.BLACK, finish="gloss")
    g = Geo().blob((12.6, -11.4, 55.0), (2.4, 2.0, 1.8), p=2.4, rot=(0, -22, 0))
    rig.part("horse", g, B.GUNWOOD, outline=0.5)

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
    rig.part("hhead", g, B.CREAM, outline=0.6)
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
    rig.part("hhead", g, B.BLACK, outline=0.5)
    g = Geo().capsule((47.5, -5.4, 52.5), (47.5, 5.4, 52.5), 1.3)
    rig.part("hhead", g, B.BRASS, finish="metal", outline=0.8)
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
    rig.part("rider", g, team=True)                                 # team breeches
    g = Geo().capsule((8, -11.5, 53), (7, -11.5, 40), 4.8, 4.2)
    g.blob((9.5, -11.5, 38.0), (5.8, 4.2, 3.0), p=2.8)
    g.blob((7.6, -11.5, 53.0), (5.6, 5.0, 2.4), p=2.6)        # boot top
    rig.part("rider", g, B.BLACK, finish="gloss")
    g = Geo().lathe([(2.6, 0), (3.0, 0.4), (3.0, 1.4), (2.6, 1.8)], (9.5, -12.0, 34.6), segs=12)
    rig.part("rider", g, STEEL, finish="metal", outline=0.4)   # stirrup
    # torso: team coat, steel cuirass with brass rivets and a glint, coat tails
    g = Geo().blob((-1, 0, 69.5), (9.4, 10.4, 11.6), p=2.4, taper=(1.0, 1.06))
    rig.part("ktorso", g, team=True)
    g = Geo()
    for z in (75.0, 72.0, 69.0, 66.0):
        g.capsule((7.8, -6.0, z), (9.4, 3.0, z), 0.75)
    rig.part("ktorso", g, B.CREAM, outline=0.4)                     # laced cord bars
    # the pelisse slung over the near shoulder: team with a dark fur trim, swinging late
    rig.secondary("pelisse", "ktorso", (-2.0, -11.0, 79.0), (-8.0, -12.0, 66.0), max_deg=16, gain=1.3)
    g = Geo().blob((-5.0, -12.0, 71.0), (5.6, 3.0, 9.0), p=2.4, rot=(0, -20, 0))
    rig.part("pelisse", g, team=True)
    g = Geo().blob((-7.6, -12.6, 63.4), (5.0, 3.2, 1.8), p=2.4, rot=(0, -20, 0))
    g.blob((-1.0, -12.6, 79.4), (5.0, 3.4, 1.8), p=2.4)
    rig.part("pelisse", g, "#3A3230", finish="hair", outline=0.5)
    g = Geo().blob((-0.6, 0, 63.4), (10.8, 11.6, 1.8), p=3.0)
    rig.part("ktorso", g, B.WOOD)
    rig.secondary("ktails", "ktorso", (-8.0, 0, 63.0), (-15.0, 0, 55.0), max_deg=16, gain=1.1)
    g = Geo().blob((-12.0, 0, 58.5), (6.0, 9.6, 3.2), p=2.6, rot=(0, -35, 0))
    rig.part("ktails", g, team=True)
    # head: face kit, moustache, helmet with a brass comb and a streaming team crest
    kh = Geo().blob((1.5, 0, 87), (8.8, 8.4, 8.6), p=2.3)
    kh.blob((10.4, -0.5, 85.8), (2.8, 2.5, 2.8), p=2.0)
    K.face2(rig, [kh], B.SKIN, cx=8.8, cz=87.0, eye_dy=(-3.6, 3.2), eye_r=(3.0, 2.8, 3.3),
            pupil_r=(1.2, 1.7, 2.0), brow=MANE, brow_w=0.8, mouth_w=4.2, mouth_dz=-5.2,
            head="khead", eye_at=(10.4, 87.2), mouth_x=9.6, mark_r=3.0)
    rig.part("khead", kh, B.SKIN)
    g = Geo().blob((9.4, -3.6, 82.6), (2.6, 4.6, 1.8), p=2.2, rot=(30, 0, 0))
    g.blob((9.4, 2.8, 82.6), (2.6, 4.6, 1.8), p=2.2, rot=(-30, 0, 0))
    g.sphere((9.2, -8.0, 84.0), 1.4, cuts=3)                          # curled moustache tips
    rig.part("khead", g, MANE, finish="hair")
    g = Geo().lathe([(0, 0), (9.0, 0), (9.8, 6.0), (9.6, 13.0), (0, 13.4)], (0.4, 0, 90.0), (0.4, 0, 103.4),
                    segs=24, squash=(1.0, 0.95))
    rig.part("khead", g, "#2B2826", finish="hair")                    # black fur busby
    rig.secondary("crest", "khead", (-6, 0, 101), (-18, 0, 92), max_deg=16, gain=1.4)
    g = Geo().capsule((-5.0, 0, 101.0), (-12.0, 0, 97.0), 4.4, 3.4).capsule((-12.0, 0, 97.0), (-17.0, 0, 91.0), 3.4, 2.0)
    rig.part("crest", g, team=True)                                  # the team busby bag
    g = Geo().capsule((5.0, -8.0, 98.0), (6.0, -8.0, 110.0), 1.9, 1.2)
    rig.part("khead", g, B.CREAM, finish="hair", outline=0.5)         # cream plume

    # far arm: reins
    rig.joint("karm_l", "ktorso", (0, 10.5, 77))
    rig.joint("kfore_l", "karm_l", (3, 12, 68))
    g = Geo().capsule((0, 10.5, 77), (3, 12, 68), 4.0, 3.6)
    rig.part("karm_l", g, team=True)
    g = Geo().capsule((3, 12, 68), (10, 11, 65.5), 3.6, 3.4).blob((10.5, 11, 65), (3.8, 3.8, 3.8), p=2.6)
    rig.part("kfore_l", g, B.CREAM)
    # near arm: team sleeve, cream gauntlet, sabre
    rig.joint("karm_r", "ktorso", (0, -10.5, 77))
    rig.joint("kfore_r", "karm_r", (3, -12, 68))
    rig.joint("sabre", "kfore_r", (SX, SY, SZ))
    g = Geo().capsule((0, -10.5, 77), (3, -12, 68), 4.2, 3.8)
    rig.part("karm_r", g, team=True)
    g = Geo().capsule((3, -12, 68), (8.5, -13, 66), 3.8, 3.6)
    g.blob((6.8, -12.6, 66.8), (3.6, 5.0, 5.0), p=2.4)
    rig.part("kfore_r", g, B.CREAM)
    for y in (-10.5, 10.5):   # team epaulettes with a cream fringe
        g = Geo().blob((-0.5, y * 1.02, 78.5), (6.8, 5.8, 4.6), p=2.4)
        rig.part("ktorso" if y > 0 else "karm_r", g, team=True)
        g = Geo().blob((-0.5, y * 1.06, 75.0), (6.4, 5.2, 1.4), p=2.6)
        rig.part("ktorso" if y > 0 else "karm_r", g, B.CREAM, outline=0.5)
    g = Geo().blob((SX + 0.6, SY, SZ), (3.8, 3.6, 3.8), p=2.3)    # fist
    rig.part("sabre", g, B.CREAM)
    back = [(SX - 1.2, SZ + 4.0), (SX - 0.8, SZ + 18), (SX + 0.8, SZ + 30), (SX + 3.8, SZ + 40),
            (SX + 7.0, SZ + SABRE)]
    edge = [(SX + 8.8, SZ + SABRE - 4.5), (SX + 6.8, SZ + 33), (SX + 4.6, SZ + 20),
            (SX + 3.2, SZ + 10), (SX + 2.4, SZ + 4.0)]
    g = Geo().slab(back + edge, SY - 1.2, 1.5)
    rig.part("sabre", g, BLADE, finish="metal", outline_hex="#6F7780")
    g = Geo().capsule((SX + 0.8, SY - 2.2, SZ + 7.0), (SX + 3.0, SY - 2.2, SZ + 34.0), 0.7)
    rig.part("sabre", g, "#8C96A2", finish="metal", outline=0, highlight=False)
    g = Geo().capsule((SX + 0.4, SY - 0.4, SZ - 5.0), (SX + 0.4, SY - 0.4, SZ + 3.0), 1.3)
    g.blob((SX + 2.6, SY - 1.4, SZ + 2.0), (4.6, 2.2, 3.0), p=2.2)
    g.clip((SX - 1.0, SY, SZ), (-1, 0, 0))
    rig.part("sabre", g, B.BRASS, finish="metal", outline=0.7)
    rig.track("sabreTip", "sabre", (SX + 7.0, SY, SZ + SABRE))


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


# -- walk v3: G5 quick trot at ground speed (card 95 x 1.25 = 118.75 lu/s), 8 x 75 ms ---------------
SPEED = 118.75
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = GT.Gait(8, 600, SPEED, GT.quad_feet(LEGS, GT.TROT, x_off={"fr": -1.0, "fl": -1.0, "br": -1.0,
                                                                          "bl": -1.0}),
                       0.48, lift=10.0, kick=4.0, reach=4.0, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _walk(f, report=None):
    g = _gait()
    lagp = 2 * math.pi * (f - 1) / g.frames

    def extra(ctx):
        p = ctx["p"]
        post = -math.cos(2 * (lagp - ctx["low"] / 2))     # the rider posts a frame late
        return merge(STANCE, {
            "neck": {"r": -7 * math.cos(2 * p - 0.5)}, "hhead": {"r": 5 * math.cos(2 * p - 1.1)},
            "rider": {"z": 1.6 * post},
            "ktorso": {"r": -3.0 * post}, "khead": {"r": 2.0 * post},
            "karm_r": {"r": 3.0 * post}, "ktails": {"r": 6 * post}, "crest": {"r": 8 * post}, "pelisse": {"r": 6 * post},
            "tail": {"r": 8 * math.sin(2 * p - 1.3)}, "forelock": {"r": 6 * math.cos(2 * p - 1.2)},
        })
    out = GT.quad_walk(RIG, f, g, {}, trunk="horse", base_z=-5.6, bob=2.0, beats=2, pitch=2.0, roll=1.5,
                       extra=extra, report=report)
    post = -math.cos(2 * (lagp - math.pi * g.stance / 2))
    return sabre_at(out, IDLE_SABRE + 5.0 * post)


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
KT = [2, 6, 12, 16, 2, -12, -24, -20, -6, 0]         # rider lean (+ = back)
RZ = [0, 1.0, 2.5, 3.5, 2.0, 0.5, -1.5, -1.0, 0.0, 0.0]   # rises in the stirrups
KARM_R = [40, 90, 135, 160, 130, 90, 30, 10, 30, 26]
KFORE_R = [50, 65, 80, 95, 40, 10, 0, 10, 35, 48]
SAB = [100, 120, 140, 150, 110, 40, -35, -62, 20, IDLE_SABRE - 6]
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
        "ktorso": {"r": KT[f]}, "khead": {"r": -0.5 * KT[f]},
        "karm_r": {"r": KARM_R[f] - KR0}, "kfore_r": {"r": KFORE_R[f] - KF0},
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


TIP = (SX + 7.0, SY, SZ + SABRE)
SIN = (SX + 3.0, SY, SZ + SABRE * 0.45)
CUT = {"kind": "arc", "joint": "sabre", "inner": SIN, "outer": TIP, "color": BLADE, "taper": 0.2,
       "white": 0.3, "t0": 0.0, "t1": 0.95, "lines": 3, "samples": 18}


def _attack_clip(name="attack", reuse=None):
    ov = {
        4: [dict(CUT, **{"from": 3}),
            {"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 61, "spread": 1.2,
             "dir": -1.0}],
        5: [dict(CUT, **{"from": 3, "t0": 0.2})],
        6: [dict(CUT, **{"from": 5, "t1": 1.0, "lines": 2}),
            {"kind": "burst", "joint": "sabre", "point": TIP, "r0_lu": 8.0, "r1_lu": 15.0, "n": 6,
             "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (32.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 62, "spread": 1.2}],
        7: [{"kind": "dust", "ground": (36.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 63, "spread": 1.5}],
    }
    return M.clip(name, [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov, reuse=reuse, extra={"holdStep": 3})


# -- attacks B and C (ANIM_SPEC appendix B): unique frames 0, 8, 9 are A's (shift, follow, settle);
# 1-7 are new (gather, coil, HOLD, smear, smear, IMPACT, follow-through), played on A's steps.
VAR = {
    # backhand sweep at the gallop: the sabre drops low behind his knee, then sweeps forward and up
    "b": dict(
        X=[-2.0, -4.0, -5.0, 3.0, 8.0, 11.0, 10.0], Z=[-1.0, -2.0, -2.5, 2.0, 3.0, 0.0, -0.5],
        R=[3, 6, 7, 4, 0, -4, -3], Q=[-0.03, -0.05, -0.06, 0.04, 0.03, -0.07, 0.02],
        SXX=[1.0, 0.98, 0.97, 1.05, 1.04, 1.0, 1.0],
        FR=[(10, -24), (20, -40), (24, -50), (40, -60), (36, -30), (18, 0), (14, -2)],
        FL=[(6, -14), (14, -30), (18, -40), (30, -70), (30, -40), (12, 0), (10, 0)],
        BR=[(4, 2), (12, 6), (18, 8), (-24, 0), (-28, 6), (-12, 0), (0, 0)],
        BL=[(2, 2), (8, 4), (14, 6), (-28, 0), (-24, 10), (-10, 0), (2, 0)],
        NECK=[0, 4, 8, -6, -10, 4, 6], HH=[2, -2, -4, 4, 6, -6, -6],
        KT=[0, 4, 8, -4, -12, -18, -14], KRZ=[6, 14, 20, 6, -8, -14, -10], RZ=[0.5, 1.0, 1.5, 1.5, 1.0, -1.0, -0.5],
        ARM=[10, -20, -40, 20, 70, 95, 100], FORE=[30, 0, -10, 30, 40, 10, 20],
        SAB=[40, -100, -140, -40, 10, 25, 45], TAIL=[2, 6, 10, -10, -14, -8, 4]),
    # point thrust: the arm drawn back with the blade level at his hip, then a long lunge
    "c": dict(
        X=[-1.0, -3.0, -5.0, 2.0, 8.0, 13.0, 12.0], Z=[-0.5, -1.5, -2.5, 0.0, 1.0, -0.5, -0.5],
        R=[2, 4, 6, 2, -2, -5, -4], Q=[-0.02, -0.04, -0.06, 0.04, 0.03, -0.08, 0.02],
        SXX=[1.0, 1.0, 0.97, 1.04, 1.04, 1.02, 1.0],
        FR=[(4, -10), (8, -20), (12, -30), (30, -50), (34, -30), (20, 0), (16, 0)],
        FL=[(2, -6), (6, -14), (10, -24), (24, -60), (28, -40), (14, 0), (12, 0)],
        BR=[(4, 2), (10, 4), (18, 8), (-20, 0), (-26, 4), (-14, 0), (-4, 0)],
        BL=[(2, 0), (8, 2), (14, 6), (-24, 0), (-20, 8), (-12, 0), (-2, 0)],
        NECK=[0, 4, 8, -8, -12, -14, -8], HH=[0, -2, -4, 6, 8, 8, 4],
        KT=[2, 6, 10, -8, -20, -28, -22], KRZ=[0, 0, 0, 0, 0, 0, 0], RZ=[0.3, 0.8, 1.2, 1.0, 0.5, -1.0, -0.5],
        ARM=[60, 86, 102, 100, 90, 78, 72], FORE=[40, 46, 52, 25, 10, 8, 20],
        SAB=[40, 28, 15, -2, -8, -6, 10], TAIL=[0, 4, 8, -8, -12, -10, -2]),
}


def _var_pose(v, i):
    if i in (0, 8, 9):
        return _attack_pose(i)
    T = VAR[v]
    k = i - 1
    pose = merge(STANCE, M.body_about(HX, x=T["X"][k], z=T["Z"][k], q=T["Q"][k]), {
        "body": {"sx": T["SXX"][k]},
        "horse": {"r": T["R"][k]},
        "leg_fr": {"r": T["FR"][k][0]}, "leg_fr2": {"r": T["FR"][k][1]},
        "leg_fl": {"r": T["FL"][k][0]}, "leg_fl2": {"r": T["FL"][k][1]},
        "leg_br": {"r": T["BR"][k][0]}, "leg_br2": {"r": T["BR"][k][1]},
        "leg_bl": {"r": T["BL"][k][0]}, "leg_bl2": {"r": T["BL"][k][1]},
        "neck": {"r": T["NECK"][k]}, "hhead": {"r": T["HH"][k]},
        "rider": {"z": T["RZ"][k]},
        "ktorso": {"r": T["KT"][k], "rz": T["KRZ"][k]}, "khead": {"r": -0.5 * T["KT"][k], "rz": -0.5 * T["KRZ"][k]},
        "karm_r": {"r": T["ARM"][k] - KR0}, "kfore_r": {"r": T["FORE"][k] - KF0},
        "tail": {"r": T["TAIL"][k]},
    })
    if k in (1, 2):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.7}})
    elif k in (3, 4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -0.8}})
    pose = sabre_at(pose, T["SAB"][k])
    if k in (3, 4):
        pose["sabre"]["sz"] = 1.12
    return pose


THRUST = {"kind": "streak", "joint": "sabre", "point": TIP, "color": BLADE, "width_lu": 9.0, "white": 0.35}


def _attack_v(v, name, reuse=True):
    if v == "b":
        ov = {
            4: [dict(CUT, **{"from": 3, "t0": 0.0, "t1": 1.0}),
                {"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 64,
                 "spread": 1.2, "dir": -1.0}],
            5: [dict(CUT, **{"from": 3, "t0": 0.3, "t1": 1.0})],
            6: [dict(CUT, **{"from": 5, "t1": 1.0, "lines": 2}),
                {"kind": "burst", "joint": "sabre", "point": TIP, "r0_lu": 8.0, "r1_lu": 15.0, "n": 6,
                 "a0": -40.0, "arc": 160.0},
                {"kind": "dust", "ground": (32.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 65, "spread": 1.2}],
        }
    else:
        ov = {
            4: [dict(THRUST, **{"from": 3, "t0": 0.0, "t1": 1.0})],
            5: [dict(THRUST, **{"from": 3, "t0": 0.3, "t1": 1.0, "width_lu": 8.0})],
            6: [dict(THRUST, **{"from": 4, "t0": 0.4, "t1": 1.0, "width_lu": 6.0}),
                {"kind": "burst", "joint": "sabre", "point": TIP, "r0_lu": 7.0, "r1_lu": 14.0, "n": 6,
                 "a0": -70.0, "arc": 140.0},
                {"kind": "dust", "ground": (34.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 66, "spread": 1.2}],
        }
    rz = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)} if reuse else None
    return M.clip(name, [_var_pose(v, i) for i in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov, reuse=rz, extra={"holdStep": 3})


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
        M.walk_clip("walk", RIG, _walk, _gait(), "rider"),
        _attack_v("b", "attack", reuse=False),
        _attack_v("c", "attack_b"),
        _attack_clip("attack_c", reuse={0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
