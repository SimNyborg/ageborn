"""Elk Chieftain: Stone Age legendary war leader (CONTENT_PLAN 5.1). Antler sweep, cleave 2, a first hit
x2 with knockback; the War Horn aura gives allies within 180 lu +15% damage. ~118 lu with antlers.

Look (A11, PLAN.md): a giant Irish-elk-like stag with a huge palmate rack of antlers (the silhouette),
a shaggy neck mane, long legs with dark socks, a pale rump; it wears a team saddle blanket with a
bone-bead fringe and a team bridle. On its back rides the chieftain: a broad, bearded chief with a
crown of eagle feathers and bone, a team cape, a bear-claw necklace and a big curved bone war horn
on a team cord, which he lifts and blows on the beat (blast rings). A team pennant flies from a
spear in a saddle socket (ground Legendaries carry a pennant, A11).

"A viewer expects the elk to sweep and thrust with its antlers and rear to strike with its hooves,
the chief to blow his horn, and the elk to move in a high-stepping trot."

Animation (ANIM_SPEC G5 rider on a mount; the chief has no sim attack of his own, so no attack_alt):
  idle      the elk breathes and flicks an ear, the chief scans and rests the horn on his knee
  walk      walk v3 trot at ground speed (card 50 x 1.25 = 62.5 lu/s), 10 frames in 900 ms,
            high-stepping, the antlers bobbing a frame late, the chief posting, the cape flapping
  attack    ANTLER SWEEP: the elk lowers its rack to one side (held extreme) and sweeps it across
            in a wide broadside arc; the chief lifts the horn and blows (rings) on the impact
  attack_b  REARING STRIKE: rears up on its hind legs (hind hooves planted by IK) and strikes down
            with both forehooves; the chief hangs on and points the horn ahead
  attack_c  ANTLER THRUST: a lunge with the rack lowered straight ahead
  hit       beast: head shake, the chief ducks;  die  D4 heavy topple, the chief tumbles off, X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad

SLUG = "elk_chieftain"
GAIT_NAME = "rider"
NAME = "Elk Chieftain"
# A11 Legendary band (170-220 lu): the elk is modelled at 118 lu and the whole rig rides a uniform
# root scale (MODEL_SCALE); the gait keeps the card's ground speed (check_walk measures the planted hooves).
MODEL_SCALE = 172.0 / 118.0
HEIGHT_LU = 172
YAW_DEG = -10.0
CANVAS = (613, 480)
FEET = (277, 432)
ANCHORS = {"head": (35, 164), "hitCenter": (0, 73)}
NO_RETIME = True

COAT = "#8C7660"
COAT_DK = "#6E5C4A"
MANE = "#5E4E40"
RUMP = "#D2C4AC"
SOCK = "#4E4239"
HOOF = "#38322D"
ANTLER = "#E6DCC4"
ANTLER_DK = "#BFB197"
NOSE = "#2E2826"
SKIN = "#C49C80"
BEARD = "#4A3A30"
FEATHER = "#EDE6D6"
FEATHER_TIP = "#5B4A3E"
BONE = "#EDE3C8"
WOOD = "#8A7560"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2A2A"

BODY_SCALE = 1.0
RACK_TIP = (52.0, -14.0, 104.0)
HORN_TIP = (14.0, -12.0, 96.0)


def _leg(rig, name, p0, p1, front):
    x0, y, z0 = p0
    x1, _, z1 = p1
    col = COAT if y < 0 else COAT_DK
    sock = SOCK if y < 0 else "#3E352E"
    g = Geo().capsule(p0, p1, 6.6 if front else 7.6, 4.0)
    g.blob((x0 + (1.5 if front else -1.5), y, z0 - 4.0), (7.0, 5.6, 8.6), p=2.2)
    rig.part(f"leg_{name}", g, col)
    g = Geo().capsule(p1, (x1 + (1.0 if front else 0.6), y, 5.0), 3.4, 3.0)
    g.blob((x1, y, z1), (4.0, 3.8, 3.6), p=2.2)
    rig.part(f"leg_{name}2", g, sock)
    g = Geo().blob((x1 + 1.8, y, 2.6), (4.4, 4.0, 2.8), p=3.0, taper=(1.05, 0.82))
    rig.part(f"leg_{name}2", g, HOOF, finish="gloss")


def _rack(rig, joint, side_y):
    """One antler: a beam back and up from the skull, then a broad palm with tines (char space)."""
    g = Geo()
    b0 = (34.0, side_y * 0.6, 84.0)
    b1 = (36.0, side_y * 1.6, 92.0)
    b2 = (40.0, side_y * 2.6, 98.0)
    g.capsule(b0, b1, 2.2, 2.0).capsule(b1, b2, 2.0, 1.8)
    g.capsule(b1, (44.0, side_y * 1.8, 90.0), 1.4, 0.6)   # brow tine forward
    palm = [(36.0, 96.0), (44.0, 100.0), (54.0, 104.0), (58.0, 98.0), (50.0, 94.0), (40.0, 92.0)]
    g.slab(palm, side_y * 2.6, 2.2)
    for (x0, z0), (x1, z1) in (((38.0, 100.0), (34.0, 110.0)), ((44.0, 102.0), (43.0, 113.0)),
                               ((50.0, 104.0), (52.0, 114.0)), ((56.0, 102.0), (62.0, 109.0)),
                               ((57.0, 99.0), (64.0, 100.0))):
        g.capsule((x0, side_y * 2.6, z0), (x1, side_y * 2.7, z1), 1.6, 0.5)
    rig.part(joint, g, ANTLER if side_y < 0 else ANTLER_DK, finish="gloss")


def _chief(rig):
    """The chieftain riding on the elk's back (waist up, legs over the flanks)."""
    rig.joint("chief", "trunk", (-2.0, 0, 66.0))
    rig.rest_scale["chief"] = 1.15
    g = Geo().blob((-2.0, 0, 76.0), (8.6, 8.0, 10.0), p=2.3, taper=(1.05, 0.9))
    rig.part("chief", g, team=True)   # the chief's team war tunic
    g = Geo().blob((-2.0, 0, 71.0), (9.0, 8.6, 5.0), p=2.4)
    rig.part("chief", g, team=True)
    for y in (-1, 1):   # legs over the flanks
        g = Geo().capsule((0.0, 7.6 * y, 68.0), (5.0, 15.0 * y, 60.0), 3.6, 3.2).capsule((5.0, 15.0 * y, 60.0), (3.0, 15.6 * y, 50.0), 3.2, 2.8)
        rig.part("chief", g, SKIN if y < 0 else "#A3826A")
        g = Geo().blob((4.0, 15.8 * y, 48.6), (4.0, 2.8, 2.6), p=2.4)
        rig.part("chief", g, "#75685B", finish="hair")
    g = Geo()
    for k in range(5):
        a = -0.9 + k * 0.45
        g.lathe([(1.0, 0), (0.6, 1.6), (0, 3.4)], (-2.0 + math.cos(a) * 8.0, math.sin(a) * 7.6, 82.0),
                (-1.6 + math.cos(a) * 8.6, math.sin(a) * 8.2, 78.6), segs=6)
    rig.part("chief", g, BONE, outline=0.4)
    rig.secondary("cape", "chief", (-8.0, 0, 84.0), (-18.0, 0, 70.0), max_deg=18, gain=1.3)
    g = Geo().blob((-12.0, 0, 78.0), (3.4, 9.0, 9.4), p=2.4, taper=(1.25, 0.8))
    for y in (-6.0, -1.0, 4.0):
        g.lathe([(2.2, 0), (0, -3.0)], (-13.4, y, 69.6), segs=8)
    rig.part("cape", g, team=True)
    # head: broad, bearded, a crown of eagle feathers
    rig.joint("chief_head", "chief", (-1.0, 0, 86.0))
    g = Geo().blob((0.0, 0, 92.0), (7.6, 7.2, 7.6), p=2.25)
    g.blob((7.4, -0.4, 91.0), (2.2, 2.0, 2.0), p=2.0)
    rig.part("chief_head", g, SKIN)
    g = Geo().blob((4.6, 0, 87.6), (6.0, 7.0, 4.4), p=2.3)
    rig.part("chief_head", g, BEARD, finish="hair")
    for y in (-2.8, 2.4):
        rig.part("chief_head", Geo().blob((5.8, y, 93.6), (2.0, 2.0, 2.6)), EYE, highlight=False)
        rig.part("chief_head", Geo().blob((7.4, y - 0.3, 93.4), (0.8, 1.2, 1.4)), PUPIL, outline=0)
    g = Geo().capsule((4.2, -4.8, 96.6), (7.6, -2.0, 95.8), 1.0, 0.8)
    rig.part("chief_head", g, BEARD, outline=0.4)
    g = Geo().lathe([(7.0, 0), (7.8, 0.4), (7.8, 2.4), (6.8, 2.8)], (0.4, 0, 96.0), (-0.4, 0, 98.4), segs=20)
    rig.part("chief_head", g, team=True, outline=0.6)
    g = Geo()
    for k in range(7):
        a = math.radians(-70 + k * 23)
        x0, z0 = -0.4 + math.sin(a) * 5.0, 98.0
        g.blob((x0 - 2.0 - math.cos(a) * 1.0, -2.0 + k * 0.6, z0 + 5.6 + 2.0 * math.cos(a)), (1.4, 0.8, 5.2), p=2.2,
               rot=(0, -30 + k * 10, 0))
    rig.part("chief_head", g, FEATHER, outline=0.4)
    # near arm with the war horn (blown on the beat), far arm holding the reins
    rig.joint("chief_arm", "chief", (-1.0, -8.6, 82.0))
    g = Geo().capsule((-1.0, -8.6, 82.0), (4.0, -9.2, 75.0), 2.8, 2.4)
    g.blob((5.2, -9.4, 73.6), (3.0, 2.8, 2.8), p=2.2)
    rig.part("chief_arm", g, SKIN)
    rig.joint("horn", "chief_arm", (5.2, -9.4, 73.6))
    g = Geo().lathe([(1.0, 0), (1.6, 4.0), (2.6, 9.0), (3.8, 12.0)], (5.2, -10.4, 73.0), (13.0, -11.6, 78.0), segs=14)
    rig.part("horn", g, BONE, finish="gloss")
    g = Geo().lathe([(1.6, 0), (1.9, 0.4), (1.9, 1.6), (1.6, 2.0)], (7.6, -10.8, 74.4), (8.6, -11.0, 75.0), segs=12)
    rig.part("horn", g, team=True, outline=0.4)
    rig.joint("chief_arm_l", "chief", (-1.0, 8.2, 82.0))
    g = Geo().capsule((-1.0, 8.2, 82.0), (6.0, 8.6, 76.0), 2.6, 2.2)
    rig.part("chief_arm_l", g, "#A3826A")


def build(rig):
    global RIG, LEGS
    RIG = rig
    q = Quad(rig, trunk=(0, 52), front_x=20.0, back_x=-19.0, leg_y=7.0, shoulder_z=54.0,
             hip_z=52.0, knee_z=26.0, hock_z=24.0, knee_dx=1.0, hock_dx=-3.0, far_dx=-3.0)
    rig.rest_scale["body"] = BODY_SCALE
    LEGS = {}
    for name in ("fl", "bl", "fr", "br"):
        p0, p1, _ = q.legs[name]
        _leg(rig, name, p0, p1, name[0] == "f")
        LEGS[name] = G.Leg(f"leg_{name}", f"leg_{name}2", (p1[0] + 1.8, p1[1], 0.8),
                           bend=1.0 if name[0] == "f" else -1.0)
        rig.track(f"_foot_{name}", f"leg_{name}2", (p1[0] + 1.8, p1[1], 0.6))
    # deep-chested body, pale rump, shaggy mane under the neck
    g = Geo().blob((2, 0, 58), (25, 12.5, 12.5), p=2.2)
    g.blob((14, 0, 62), (13, 12.0, 13.0), p=2.2)
    rig.part("trunk", g, COAT)
    rig.part("trunk", Geo().blob((-22.0, 0, 60.0), (5.6, 10.6, 9.0), p=2.2), RUMP)
    # team saddle blanket with a bone fringe, a team pennant on a spear
    g = Geo().blob((-2.0, 0, 64.0), (17.0, 14.4, 9.4), p=2.8)
    g.clip((0, 0, 51.0), (0, 0, -1))
    rig.part("trunk", g, team=True)
    g = Geo()
    for x in (-12.0, -7.0, -2.0, 3.0, 8.0):
        g.sphere((x, -13.6, 54.4), 1.3, cuts=2)
    rig.part("trunk", g, BONE, outline=0.4)
    g = Geo().lathe([(0, -4.0), (13.0, -3.8), (13.4, 3.8), (0, 4.0)], (4.0, 0, 58.0), (5.0, 0, 58.0), segs=24, squash=(1.0, 1.0))
    g.clip((0, 0, 50.0), (0, 0, 1))
    rig.part("trunk", g, team=True, outline=0.6)
    rig.joint("pole", "trunk", (-14, 5.0, 64))
    g = Geo().capsule((-14, 5.0, 60), (-18, 5.0, 112), 1.3, 1.1)
    g.lathe([(1.8, 0), (1.2, 2.6), (0, 5.0)], (-18.1, 5.0, 112), (-18.4, 5.0, 117), segs=8)
    rig.part("pole", g, WOOD)
    rig.secondary("pennant", "pole", (-17.6, 5.0, 108), (-36, 5.0, 104), max_deg=14, gain=1.3)
    pts = [(-17.6, 110.0), (-38.0, 107.0), (-31.0, 101.0), (-37.5, 94.0), (-17.2, 93.5)]
    rig.part("pennant", Geo().slab(pts, 5.0, 1.4), team=True, outline=0.8)
    # neck (up and forward), mane, head with the face kit, the rack
    rig.joint("neck", "trunk", (22, 0, 64))
    rig.joint("head", "neck", (32, 0, 80))
    g = Geo().capsule((22, 0, 64), (31, 0, 79), 8.0, 6.0)
    rig.part("neck", g, COAT)
    g = Geo().lathe([(8.2, 0), (8.8, 0.5), (8.4, 5.0), (7.8, 5.5)], (24.4, 0, 66.0), (26.4, 0, 70.4), segs=20)
    rig.part("neck", g, team=True, outline=0.6)   # a team neck band with the war-horn tassel
    g = Geo()
    for k in range(5):
        t = k / 4
        g.lathe([(3.4, 0), (2.2, 2.6), (0, 6.0)], (24 + 6 * t, -5.6, 62 + 14 * t), (22 + 6 * t, -7.4, 56 + 14 * t), segs=8,
                squash=(1.0, 0.6))
    rig.part("neck", g, MANE, finish="hair")
    head = Geo().blob((34, 0, 81.0), (7.4, 6.4, 6.4), p=2.25)
    head.lathe([(5.4, 0), (4.8, 4.0), (3.8, 9.0), (0, 10.4)], (37.0, 0, 80.0), (47.0, 0, 75.0), segs=16)
    eye = Geo().blob((38.0, -5.2, 82.6), (2.0, 1.4, 1.8))
    pup = Geo().blob((39.0, -5.6, 82.5), (0.8, 0.8, 1.2))
    face = F.Face(rig, "head", [head, eye, pup])
    rig.part("head", head, COAT)
    rig.part("head", Geo().blob((46.6, -0.4, 75.6), (2.2, 2.6, 2.0), p=2.2), NOSE, outline=0.5)
    rig.part("head", eye, EYE, highlight=False)
    rig.joint("pupils", "head", (39.0, -5.6, 82.5))
    rig.part("pupils", pup, PUPIL, outline=0)
    face.eye_marks([(39.0, 82.6)], 1.8, COAT)
    rig.joint("ears", "head", (31.0, 0, 86.0))
    g = Geo()
    for y in (-1, 1):
        g.blob((29.0, 6.0 * y, 88.0), (3.0, 1.4, 5.0), p=2.2, rot=(-30 * y, -40, 0), taper=(1.1, 0.4))
    rig.part("ears", g, COAT_DK)
    g = Geo().lathe([(6.0, 0), (6.6, 0.4), (6.6, 1.8), (5.8, 2.2)], (38.0, 0, 79.0), (39.0, 0, 80.0), segs=16, rot=(0, 30, 0))
    rig.part("head", g, team=True, outline=0.4)   # team bridle
    for s in (-1, 1):
        _rack(rig, "head", s * 5.0)
    rig.joint("jaw", "head", (38, 0, 76))
    jaw = Geo().blob((42.0, 0, 74.4), (4.6, 3.6, 1.8), p=2.2)
    jface = F.Face(rig, "jaw", [jaw])
    rig.part("jaw", jaw, COAT)
    jaw.bm.free()
    jface.mouths((44.0, 74.4), 3.0)
    rig.track("rackTip", "head", RACK_TIP)
    # short tail
    rig.secondary("tail", "trunk", (-25, 0, 64), (-28, 0, 58), max_deg=20, gain=1.3)
    rig.part("tail", Geo().blob((-26.4, 0, 61.0), (2.4, 2.2, 3.6), p=2.2), RUMP)
    _chief(rig)
    rig.rest_scale["root"] = MODEL_SCALE


CENTER = (0, 0, 58.0)
RIG = None
LEGS = None
SPEED = 62.5
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = G.Gait(10, 900, SPEED, G.quad_feet(LEGS, G.TROT, scale=BODY_SCALE,
                                                  x_off={"fr": 2.0, "fl": 2.0, "br": -1.0, "bl": -1.0}),
                      0.46, lift=10.0, kick=3.0, reach=3.0, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _chief_pose(lag=0.0, horn=0.0, duck=0.0, point=0.0):
    """horn 1 = horn at the lips (blowing), point 1 = horn pointed ahead."""
    return {
        "chief": {"z": -1.6 * lag - 3.0 * duck, "r": 3.0 * lag - 10.0 * duck},
        "chief_head": {"r": -4.0 * lag - 14 * horn + 8 * duck},
        "chief_arm": {"r": 30 + 110 * horn + 80 * point},
        "horn": {"r": -60 * horn - 50 * point},
        "chief_arm_l": {"r": 10 * lag},
        "cape": {"r": 6 * lag},
    }


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    pose = merge({
        "trunk": {"z": -1.2 * c, "r": 0.6 * c},
        "body": squash(-0.02 * c),
        "neck": {"r": 2.0 * lag}, "head": {"r": -2.4 * lag},
        "ears": {"r": [0, 0, 14, -6, 0, 0][f]},
        "tail": {"r": 10 * math.sin(2 * math.pi * f / n)},
    }, _chief_pose(0.6 * lag), {"chief_head": {"rz": [0, 10, 20, 10, -10, 0][f]}})
    if f == 4:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f, report=None):
    g = _gait()

    def extra(ctx):
        p = ctx["p"]
        lag = math.cos(2 * p - 1.0)
        return merge({"neck": {"r": -4.0 * math.cos(2 * p - 0.6)}, "head": {"r": 3.0 * math.cos(2 * p - 1.2)},
                      "ears": {"r": 6 * math.cos(2 * p - 1.4)}}, _chief_pose(lag))
    return G.quad_walk(RIG, f, g, {}, base_z=-3.6, bob=3.1, beats=2, pitch=2.0, roll=1.6, extra=extra, report=report)


def _ek(x, z, q, r, n, h, j, fr, fl, br, bl, nrz=0.0, hrz=0.0, ears=0.0):
    return merge(M.body_about(CENTER, x=x, z=z, q=q), {
        "trunk": {"r": r},
        "neck": {"r": n, "rz": nrz}, "head": {"r": h, "rz": hrz}, "jaw": {"r": j},
        "leg_fr": {"r": fr[0]}, "leg_fr2": {"r": fr[1]},
        "leg_fl": {"r": fl[0]}, "leg_fl2": {"r": fl[1]},
        "leg_br": {"r": br[0]}, "leg_br2": {"r": br[1]},
        "leg_bl": {"r": bl[0]}, "leg_bl2": {"r": bl[1]},
        "ears": {"r": ears},
    })


ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        x    z     q      r   n    h   j    fr        fl        br        bl      nrz  hrz  horn
A_TAB = [
    (-1.0, 0.0, -0.02, 0, -4, -2, 0, (0, 0), (0, 0), (0, 0), (0, 0), 0, 0, 0.0),
    (-2.0, -1.0, -0.04, -2, -16, -8, -2, (-10, 6), (-6, 4), (6, 8), (4, 6), 20, 8, 0.2),
    (-3.0, -2.5, -0.06, -4, -32, -16, -4, (-16, 10), (-8, 6), (10, 14), (8, 12), 40, 16, 0.4),
    (-4.0, -3.5, -0.08, -6, -44, -22, -6, (-22, 14), (-10, 8), (14, 20), (12, 18), 54, 22, 0.6),
    (0.0, -2.0, 0.0, -4, -30, -12, -8, (-14, 8), (-6, 4), (6, 10), (4, 8), 10, 4, 0.8),
    (3.0, -0.5, 0.04, -2, -16, -4, -10, (-8, 4), (-2, 2), (0, 4), (0, 4), -30, -14, 1.0),
    (5.0, 1.0, 0.07, 2, -4, 6, -14, (-4, 0), (2, 0), (-6, 4), (-4, 2), -54, -24, 1.0),
    (4.0, 0.0, -0.05, 1, -6, 2, -6, (-2, 0), (0, 0), (-4, 2), (-2, 2), -30, -14, 0.8),
    (2.0, 0.0, 0.02, 0, -2, 0, -2, (0, 0), (0, 0), (-2, 0), (-1, 0), -8, -4, 0.3),
    (0.5, 0.0, 0.0, 0, 0, 0, 0, (0, 0), (0, 0), (0, 0), (0, 0), 0, 0, 0.0),
]


def _attack_pose(f):
    x, z, q, r, n, h, j, fr, fl, br, bl, nrz, hrz, horn = A_TAB[f]
    return merge(_ek(x, z, q, r, n, h, j, fr, fl, br, bl, nrz, hrz, ears=-14 if 2 <= f <= 6 else 0),
                 _chief_pose(0.0, horn=horn))


def _sweep(t0=0.0, t1=0.9, lines=3, frm=None):
    s = {"kind": "arc", "joint": "head", "inner": (RACK_TIP[0] - 16, RACK_TIP[1], RACK_TIP[2] - 10),
         "outer": RACK_TIP, "color": ANTLER, "taper": 0.15, "t0": t0, "t1": t1, "lines": lines,
         "white": 0.35, "samples": 18}
    if frm is not None:
        s["from"] = frm
    return s


def _attack_clip():
    ov = {
        4: [_sweep(0.0, 0.9, 3, 3)],
        5: [_sweep(0.2, 0.95, 3, 4)],
        6: [{"kind": "burst", "joint": "head", "point": RACK_TIP, "r0_lu": 10.0, "r1_lu": 20.0, "n": 6, "a0": -40.0, "arc": 160.0},
            {"kind": "rings", "joint": "horn", "point": HORN_TIP, "radii_lu": (8.0 * MODEL_SCALE, 14.0 * MODEL_SCALE), "a0": -50.0, "a1": 50.0},
            {"kind": "dust", "ground": (40.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 151, "spread": 1.4}],
        7: [{"kind": "rings", "joint": "horn", "point": HORN_TIP, "radii_lu": (12.0 * MODEL_SCALE, 20.0 * MODEL_SCALE), "a0": -50.0, "a1": 50.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


def _plant_hind(pose, dx=0.0):
    t = {n: (LEGS[n], LEGS[n].end.x * BODY_SCALE + dx, LEGS[n].end.z * BODY_SCALE, 0.0) for n in ("br", "bl")}
    return G.solve(RIG, pose, t)


B_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 6, 6, 7, 7]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 2)
    tab = [
        (-3.0, 4.0, 0.03, 16, 10, 6, -4, (40, -60), (34, -56)),
        (-6.0, 12.0, 0.06, 36, 16, 10, -10, (80, -110), (70, -100)),
        (0.0, 8.0, 0.04, 20, 4, 0, -10, (50, -60), (44, -56)),
        (5.0, -2.0, -0.12, -2, -8, -6, -14, (10, -4), (6, -2)),
        (4.0, -1.0, 0.03, -1, -4, -2, -6, (4, 0), (2, 0)),
    ][i - 1]
    x, z, q, r, n, h, j, fr, fl = tab
    pose = merge(_ek(x, z, q, r, n, h, j, fr, fl, (0, 0), (0, 0), ears=-16), _chief_pose(0.0, duck=0.4, point=0.8 if i >= 3 else 0.3))
    return _plant_hind(pose, dx=x * 0.5)


def _attack_b():
    hoof = (LEGS["fr"].end.x + 2.0, -7.0, 1.0)
    ov = {3: [{"kind": "streak", "joint": "leg_fr2", "point": hoof, "color": COAT, "width_lu": 8.0, "white": 0.4, "from": 2}],
          4: [{"kind": "rings", "joint": "leg_fr2", "point": hoof, "radii_lu": (12.0 * MODEL_SCALE, 20.0 * MODEL_SCALE), "a0": 15.0, "a1": 165.0, "color": "#E6D8BE"},
              {"kind": "dust", "ground": (28.0, 0.0), "size_lu": 11.0, "puffs": 6, "seed": 152, "spread": 1.5}]}
    reuse = {0: ("attack", 0), 6: ("attack", 8), 7: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], M.HEAVY_MELEE_MS, impact=4, sequence=B_SEQ,
                  overlays=ov, reuse=reuse)


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 2)
    tab = [
        (-3.0, -1.0, -0.04, -4, -24, -20, -4, (-10, 10), (-8, 8), (14, 18), (12, 16)),
        (-6.0, -3.0, -0.08, -6, -40, -30, -8, (-16, 16), (-14, 14), (20, 28), (18, 24)),
        (6.0, -1.0, 0.06, -4, -36, -28, -10, (24, -20), (20, -16), (-24, 8), (-20, 6)),
        (12.0, -2.0, -0.12, -6, -40, -30, -12, (16, -2), (12, 0), (-22, 8), (-18, 6)),
        (10.0, -1.0, -0.03, -4, -28, -20, -6, (8, 0), (6, 0), (-14, 6), (-10, 4)),
    ][i - 1]
    x, z, q, r, n, h, j, fr, fl, br, bl = tab
    return merge(_ek(x, z, q, r, n, h, j, fr, fl, br, bl, ears=-16), _chief_pose(0.0, duck=0.6, point=1.0 if i >= 3 else 0.0))


def _attack_c():
    ov = {3: [{"kind": "streak", "joint": "head", "point": RACK_TIP, "color": ANTLER, "width_lu": 12.0, "white": 0.4, "from": 2}],
          4: [{"kind": "burst", "joint": "head", "point": RACK_TIP, "r0_lu": 10.0, "r1_lu": 18.0, "n": 6, "a0": -60.0, "arc": 140.0},
              {"kind": "dust", "ground": (36.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 153, "spread": 1.2}]}
    reuse = {0: ("attack", 0), 6: ("attack", 8), 7: ("attack", 9)}
    return M.clip("attack_c", [_c_pose(i) for i in range(8)], M.HEAVY_MELEE_MS, impact=4, sequence=B_SEQ,
                  overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a, shake):
        return merge({"body": dict(squash(-0.05 * max(a, 0)), x=-4.0 * max(a, 0) + 1.0 * min(a, 0)),
                      "trunk": {"r": 4 * a},
                      "neck": {"r": 8 * a}, "head": {"r": 6 * a + 8 * shake, "rx": 12 * shake},
                      "ears": {"r": -24 * max(a, 0)},
                      "leg_br": {"r": -10 * max(a, 0)}, "leg_bl": {"r": -8 * max(a, 0)},
                      "leg_br2": {"r": 14 * max(a, 0)}, "leg_bl2": {"r": 12 * max(a, 0)}},
                     _chief_pose(0.0, duck=max(a, 0)))
    return M.hit_beast(k, {}, recoil, face_hurt=F.expr("squeeze"))


def _die_pose(k):
    kick = [0.0, 0.3, 0.7, 1.0, 0.6, 1.0, 0.4, 0.2, 0.1, 0.0][k]
    pose = merge(M.die_d4(k, center_z=58.0, back_z=40.0, height=HEIGHT_LU, heavy=True, roll=-0.62), {
        "neck": {"r": [10, 16, 12, 6, 2, 0, 0, 0, 0, 0][k]},
        "head": {"r": [8, -6, -10, -14, -12, -10, -8, -8, -8, -8][k]},
        "jaw": {"r": -14},
        "leg_fr": {"r": 30 * kick - 10}, "leg_fr2": {"r": -30 * kick},
        "leg_fl": {"r": -20 * kick + 10}, "leg_fl2": {"r": -20 * kick},
        "leg_br": {"r": -26 * kick}, "leg_br2": {"r": 26 * kick},
        "leg_bl": {"r": 20 * kick}, "leg_bl2": {"r": 20 * kick},
        "ears": {"r": -20},
        "pole": {"hide": k >= 3, "r": 25 * min(1.0, k)},
        "chief": {"x": [0, -4, -10, -18, -24, -28, -30, -30, -30, -30][k], "z": [0, 8, 14, 10, 0, -10, -16, -18, -18, -18][k],
                  "r": [0, 20, 60, 110, 150, 170, 180, 180, 180, 180][k], "hide": k >= 7},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    elif k >= 3:
        pose = merge(pose, F.expr("x"), F.expr("tongue", mouth=None))
    return pose


def clips():
    keep = M.HEAVY_DIE_KEEP
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)], [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.walk_clip("walk", RIG, _walk, _gait(), "rider"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die_pose(keep[i]) for i in range(len(keep))], M.DIE_MS_HEAVY,
               sequence=M.DIE_SEQ_HEAVY, extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
