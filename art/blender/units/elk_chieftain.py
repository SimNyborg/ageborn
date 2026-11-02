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

from ageborn_art import colors as CC
from ageborn_art import face as F
from ageborn_art import gait as G
from ageborn_art import look
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import Quad
from units import stone_w1 as W1

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
# W1 (the detail standard)
NECK_DK = "#6A5848"       # the elk's darker neck and shoulders under the mane (16 levels under the coat)
MANE_LT = "#86735F"       # lighter tips in the mane clumps (two tones)
SKIN_FAR = "#A3826A"
FUR_TOE = "#75685B"
LEATHER_DK = "#56412F"

DETAIL_STANDARD = True
LOOK_HIGHLIGHT = 1.65  # over the beasts' 1.45; not higher: the team highlight's white overlay is 0.30 x this (0.5 hides team)
LOOK_SHADE = W1.SHADE_MOUNT
LOOK_RIM = W1.RIM_BEAST
MATERIAL_KINDS = W1.kinds({COAT: "hide", COAT_DK: "hide", NECK_DK: "hide", MANE: "fur", MANE_LT: "fur", RUMP: "fur",
                           SOCK: "hide", "#3E352E": "hide", HOOF: "bone", ANTLER: "bone", ANTLER_DK: "bone",
                           NOSE: "hide", SKIN: "skin", SKIN_FAR: "skin", BEARD: "fur", FEATHER: "fur",
                           FEATHER_TIP: "fur", BONE: "bone", WOOD: "wood", FUR_TOE: "fur", LEATHER_DK: "leather",
                           "team": "hide"})

# -- skin: Aurora Elk (DESIGN A5.8, legendary; "aurora antlers and a star-speckled pelt") -------------------------
# Same joints, trackers, poses and clips. A night-violet pelt speckled with star-white four-point stars, a dusky
# violet mane, glowing mint aurora antlers with violet streaks (green and violet only, CONTENT_PLAN 5.1: neither is
# in the A11 team hue bands). The chieftain, the team blanket, bridle and pennant stay.
A_COAT = "#4F4766"
A_COAT_DK = "#383150"
A_MANE = "#6A5A8A"
A_SNOUT = "#BDB4D0"
AURORA = "#3AF0B4"
AURORA2 = "#C8A8F0"
STARWHITE = "#F2F0FF"
SKINS = {"aurora_elk": {
    "kinds": W1.kinds({A_COAT: "hide", A_COAT_DK: "hide", A_MANE: "fur", A_SNOUT: "fur"}),
    "palette": {COAT: A_COAT, COAT_DK: A_COAT_DK, NECK_DK: A_COAT_DK, MANE: A_MANE, MANE_LT: A_SNOUT, RUMP: A_SNOUT,
                CC.scale(COAT_DK, 0.8): CC.scale(A_COAT_DK, 0.8), CC.scale(MANE, 0.8): CC.scale(A_MANE, 0.8)}}}


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
    if y < 0:   # W1: a pale band over each hoof (the elk's leg markings: the dark socks in two tones, 2.4 lu)
        W1.ring(rig, f"leg_{name}2", (x1 + 0.9, y, 5.2), 3.15, height=1.7, fill=RUMP, outline=0, bulge=0.3)
        # W1: dark shaggy hair over the near elbow / stifle in two tones and a tuft over the knee (the long legs
        # were the elk's plainest fields at game scale)
        r0 = 6.6 if front else 7.6
        g, g2 = Geo(), Geo()
        for k, (dx, dz, L, tilt) in enumerate(((-2.6, -4.0, 7.0, -4 if front else -10),
                                               (2.0, -5.0, 7.4, 6 if front else -2),
                                               (-0.4, -11.0, 6.0, 2 if front else -6))):
            W1.fur_lock(g if k != 1 else g2, (x0 + dx, y - r0 + 0.8 + abs(dx) * 0.2, z0 + dz), L, tilt, r=2.0, dy=-0.6)
        rig.part(f"leg_{name}", g, MANE, finish="hair", outline=0.5)
        rig.part(f"leg_{name}", g2, MANE_LT, finish="hair", outline=0.5)
        g = Geo()
        for dx, L in ((-1.4, 4.6), (1.4, 4.0)):
            W1.fur_lock(g, (x1 + dx, y - 3.6, z1 + 1.6), L, 6 if front else -6, r=1.6, dy=-0.5)
        rig.part(f"leg_{name}2", g, MANE, finish="hair", outline=0.4)


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
    if getattr(rig, "skin", None) == "aurora_elk":
        # Aurora Elk: the rack glows mint (unshaded, like a light) with violet streaks along the palm
        rig.part(joint, g, glow=AURORA if side_y < 0 else "#2CC897", outline=0.6, outline_hex="#1E8C6C")
        st = Geo()
        for (x0, z0), (x1, z1) in (((38.0, 95.4), (52.0, 100.6)), ((41.0, 98.6), (55.0, 102.4)),
                                   ((42.0, 93.8), (54.0, 97.2)),     # W1: more streaks (the flat glowing palm)
                                   ((49.0, 96.4), (56.6, 99.6))):
            st.capsule((x0, side_y * 2.6 - (1.3 if side_y < 0 else -1.3), z0),
                       (x1, side_y * 2.6 - (1.3 if side_y < 0 else -1.3), z1), 0.7, 0.5, segs=8, rings=2)
        rig.part(joint, st, glow=AURORA2, outline=0)
        # W1: star-white sparkles along the palm (the glowing palm was the skin's biggest flat field)
        sp = Geo()
        for x, z in ((47.0, 96.9), (53.4, 101.0), (51.0, 109.0), (59.0, 105.5)):   # two on the palm, two on tines
            sp.sphere((x, side_y * 2.6 - (1.35 if side_y < 0 else -1.35), z), 0.65, cuts=2)
        rig.part(joint, sp, glow=STARWHITE, outline=0)
        return
    rig.part(joint, g, ANTLER if side_y < 0 else ANTLER_DK, finish="gloss")


def _chief(rig):
    """The chieftain riding on the elk's back (waist up, legs over the flanks)."""
    rig.joint("chief", "trunk", (-2.0, 0, 66.0))
    rig.rest_scale["chief"] = 1.15
    g = Geo().blob((-2.0, 0, 76.0), (8.6, 8.0, 10.0), p=2.3, taper=(1.05, 0.9))
    tunic_face = F.Face(rig, "chief", [g])
    rig.part("chief", g, team=True)   # the chief's team war tunic
    # W1: the war horn's leather baldric across the tunic with two bone studs (the tunic's plain blue field broken;
    # bright points on the rider)
    W1.seam(rig, "chief", tunic_face, [(3.0, 84.6), (-0.6, 80.0), (-4.2, 75.4), (-7.4, 71.4)], fill=LEATHER_DK, w=2.0)
    W1.beads(rig, "chief", [tuple(tunic_face.hit(x, z)) for x, z in ((0.4, 81.6), (-4.6, 75.0))], BONE, r=1.05)
    # W1: a team-dark sash belt round the tunic (the rider's team zone in two tones, still team)
    W1.ring(rig, "chief", (-2.0, 0, 70.4), 9.0, height=2.6, ry=8.6, team=True, segs=32, outline=0.5)
    g = Geo().blob((-2.0, 0, 71.0), (9.0, 8.6, 5.0), p=2.4)
    rig.part("chief", g, team=True)
    for y in (-1, 1):   # legs over the flanks
        g = Geo().capsule((0.0, 7.6 * y, 68.0), (5.0, 15.0 * y, 60.0), 3.6, 3.2).capsule((5.0, 15.0 * y, 60.0), (3.0, 15.6 * y, 50.0), 3.2, 2.8)
        rig.part("chief", g, SKIN if y < 0 else SKIN_FAR)
        g = Geo().blob((4.0, 15.8 * y, 48.6), (4.0, 2.8, 2.6), p=2.4)
        rig.part("chief", g, FUR_TOE, finish="hair")
    g = Geo()
    for k in range(5):
        a = -0.9 + k * 0.45
        g.lathe([(1.3, 0), (0.9, 1.8), (0, 4.0)], (-2.0 + math.cos(a) * 8.0, math.sin(a) * 7.6, 82.0),
                (-1.6 + math.cos(a) * 8.6, math.sin(a) * 8.2, 78.0), segs=6)
    rig.part("chief", g, BONE, finish="gloss", outline=0.4)
    rig.secondary("cape", "chief", (-8.0, 0, 84.0), (-18.0, 0, 70.0), max_deg=18, gain=1.3)
    g = Geo().blob((-12.0, 0, 78.0), (3.4, 9.0, 9.4), p=2.4, taper=(1.25, 0.8))
    for y in (-6.0, -1.0, 4.0):
        g.lathe([(2.2, 0), (0, -3.0)], (-13.4, y, 69.6), segs=8)
    cape_face = F.Face(rig, "cape", [g])
    rig.part("cape", g, team=True)
    W1.stripes(rig, "cape", cape_face, [[(-15.0, 72.6), (-10.4, 72.0)]], w=2.4)   # W1: a team-dark hem band
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
    # W1: dark eagle-feather tips on the crown (two tones)
    g = Geo()
    for k in range(0, 7, 2):
        a = math.radians(-70 + k * 23)
        x0, z0 = -0.4 + math.sin(a) * 5.0, 98.0
        g.blob((x0 - 2.0 - math.cos(a) * 1.0 - 0.6, -2.4 + k * 0.6, z0 + 9.4 + 2.0 * math.cos(a)), (1.3, 0.8, 1.6),
               p=2.2, rot=(0, -30 + k * 10, 0))
    rig.part("chief_head", g, FEATHER_TIP, outline=0)
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
    # W1: two carved dark rings on the war horn (texture rings, 1.1 lu)
    g = Geo()
    for t in (0.55, 0.8):
        cx, cy, cz = 5.2 + 7.8 * t, -10.4 - 1.2 * t, 73.0 + 5.0 * t
        r = 1.0 + 2.8 * t
        g.lathe([(r + 0.05, 0), (r + 0.3, 0.3), (r + 0.3, 0.8), (r + 0.05, 1.1)], (cx, cy, cz),
                (cx + 0.78, cy - 0.12, cz + 0.5), segs=14)
    rig.part("horn", g, LEATHER_DK, outline=0)
    rig.joint("chief_arm_l", "chief", (-1.0, 8.2, 82.0))
    g = Geo().capsule((-1.0, 8.2, 82.0), (6.0, 8.6, 76.0), 2.6, 2.2)
    rig.part("chief_arm_l", g, SKIN_FAR)


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
    blanket_face = F.Face(rig, "trunk", [g])
    rig.part("trunk", g, team=True)
    # W1: the blanket in two tones: a team-dark band along its hem (in pieces round the barrel)
    hem = [(-16.0, 54.6), (-10.0, 54.2), (-4.0, 54.0), (2.0, 54.1), (8.0, 54.4), (13.0, 54.9)]
    W1.stripes(rig, "trunk", blanket_face, [[a, b] for a, b in zip(hem, hem[1:])], w=2.6)
    # W1: a woven team-dark zigzag above the hem band (the saddle cloth's trim and pattern)
    zig = [(-15.0 + 2.6 * i, 57.4 if i % 2 == 0 else 60.6) for i in range(12)]
    W1.seam(rig, "trunk", blanket_face, zig, w=1.6, team=True)
    g = Geo()
    for x in (-12.0, -7.0, -2.0, 3.0, 8.0):
        g.sphere((x, -13.8, 54.0), 1.6, cuts=2)
    rig.part("trunk", g, BONE, finish="gloss", outline=0.4)
    # W1: a team-dark breast collar across the chest from the neck band to the blanket, with three bone studs
    # (cavalry: harness straps with studs)
    g = Geo().capsule((17.0, -11.6, 62.0), (23.4, -9.4, 58.6), 1.5).capsule((23.4, -9.4, 58.6), (27.0, -4.6, 57.0), 1.5)
    look.team_part(rig, "trunk", g, outline=0.5)
    g = Geo()
    for x, y, z in ((18.6, -12.4, 61.4), (23.0, -10.6, 58.8), (26.4, -6.4, 57.4)):
        g.sphere((x, y, z), 1.25, cuts=2)
    rig.part("trunk", g, BONE, finish="gloss", outline=0.4)
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
    # W1: the pennant in two tones (a team-dark hoist band) with the chieftain's bone antler sign (a 9 lu shape)
    look.team_part(rig, "pennant", Geo().slab([(-17.6, 110.0), (-21.6, 109.4), (-21.4, 93.6), (-17.2, 93.5)], 4.15, 0.5),
                   outline=0)
    g = Geo()
    for (xa, za), (xb, zb) in (((-27.0, 95.6), (-27.0, 101.6)), ((-27.0, 100.6), (-23.4, 105.2)),
                               ((-27.0, 100.6), (-30.6, 105.2)), ((-27.0, 102.6), (-27.0, 106.0))):
        dx, dz = xb - xa, zb - za
        n = math.hypot(dx, dz)
        nx, nz = -dz / n * 0.9, dx / n * 0.9
        g.slab([(xa - nx, za - nz), (xb - nx, zb - nz), (xb + nx, zb + nz), (xa + nx, za + nz)], 4.15, 0.5)
    rig.part("pennant", g, BONE, finish="gloss", outline=0)
    # neck (up and forward), mane, head with the face kit, the rack
    rig.joint("neck", "trunk", (22, 0, 64))
    rig.joint("head", "neck", (32, 0, 80))
    g = Geo().capsule((22, 0, 64), (31, 0, 79), 8.0, 6.0)
    rig.part("neck", g, NECK_DK)        # W1: the elk's darker neck (value structure: dark neck, coat, pale rump)
    g = Geo().lathe([(8.2, 0), (8.8, 0.5), (8.4, 5.0), (7.8, 5.5)], (24.4, 0, 66.0), (26.4, 0, 70.4), segs=20)
    rig.part("neck", g, team=True, outline=0.6)   # a team neck band with the war-horn tassel
    # W1: three polished bone studs on the neck band (bright points: the rider's highlight at game scale)
    W1.beads(rig, "neck", [(21.35, -7.71, 70.04), (25.4, -8.9, 68.2), (29.45, -7.71, 66.36)], BONE, r=1.25,
             outline=0.4)
    g = Geo()
    for k in range(5):
        t = k / 4
        g.lathe([(3.4, 0), (2.2, 2.6), (0, 6.0)], (24 + 6 * t, -5.6, 62 + 14 * t), (22 + 6 * t, -7.4, 56 + 14 * t), segs=8,
                squash=(1.0, 0.6))
    rig.part("neck", g, MANE, finish="hair")
    # W1: lighter tips on every other mane clump (two tones, 3 lu cones)
    g = Geo()
    for k in (0, 2, 4):
        t = k / 4
        g.lathe([(1.8, 0), (0, 3.0)], (23.2 + 6 * t, -7.0, 58.8 + 14 * t), (22.0 + 6 * t, -7.8, 56.0 + 14 * t), segs=8,
                squash=(1.0, 0.6))
    rig.part("neck", g, MANE_LT, finish="hair", outline=0)
    # W1: the shaggy throat mane continues down onto the chest (an elk's dark bib, two tones, 3-5 lu clumps)
    g, g2 = Geo(), Geo()
    for k, (x, z, L) in enumerate(((22.4, 58.4, 6.4), (21.2, 54.6, 6.0), (23.6, 54.0, 5.2))):
        (g if k != 2 else g2).lathe([(3.0, 0), (2.0, L * 0.45), (0, L)], (x, -6.2, z), (x - 1.6, -7.6, z - L), segs=8,
                                    squash=(1.0, 0.6))
    rig.part("neck", g, MANE, finish="hair", outline=0.5)
    rig.part("neck", g2, MANE_LT, finish="hair", outline=0.5)
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
    if getattr(rig, "skin", None) == "aurora_elk":
        _star_pelt(rig)
    rig.rest_scale["root"] = MODEL_SCALE
    if getattr(rig, "skin", None) is None:
        _damage_spots(rig)


def _star_pelt(rig):
    """Aurora Elk: star-white four-point stars (2.6-3.6 lu) and small specks over the near flank, haunch and neck."""
    g, dots = Geo(), Geo()
    for x, y, z, r in ((10.0, -12.6, 56.0, 1.8), (-6.0, -12.2, 50.0, 1.5), (-18.0, -11.6, 54.0, 1.6),
                       (20.0, -11.4, 62.0, 1.4), (2.0, -12.8, 50.6, 1.3)):
        g.star((x, y, z), r, r * 0.32, 0.5, points=4)
    for x, y, z in ((14.0, -12.4, 52.0), (-12.0, -12.4, 52.6), (6.0, -12.6, 59.0), (-1.0, -12.6, 56.6)):
        dots.sphere((x, y, z), 0.7, cuts=2)
    rig.part("trunk", g, glow=STARWHITE, outline=0)
    rig.part("trunk", dots, glow=STARWHITE, outline=0)
    g = Geo()
    g.star((27.0, -7.6, 70.0), 1.4, 0.45, 0.5, points=4)
    rig.part("neck", g, glow=STARWHITE, outline=0)
    # W1: aurora ribbons in the pelt (mint and violet glowing streaks over the shoulder, the haunch and the thighs:
    # the dark violet coat was one flat field, micro 3.4)
    def ribbon(joint, pts, col, r=0.8):
        g = Geo()
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, r, r)
        rig.part(joint, g, glow=col, outline=0)
    ribbon("trunk", [(15.6, -12.4, 64.6), (19.6, -12.2, 60.4), (24.6, -10.4, 56.6)], AURORA)
    ribbon("trunk", [(17.8, -12.6, 66.6), (22.0, -11.6, 62.6), (26.6, -8.8, 59.6)], AURORA2, r=0.65)
    ribbon("trunk", [(-17.6, -12.6, 61.0), (-21.0, -12.0, 56.4), (-23.4, -10.6, 52.0)], AURORA)
    ribbon("trunk", [(-15.4, -12.8, 58.4), (-18.6, -12.4, 54.0), (-20.6, -11.2, 50.4)], AURORA2, r=0.65)
    for leg, x0, z0 in (("leg_fr", 21.5, 50.0), ("leg_br", -20.5, 48.0)):
        ribbon(leg, [(x0 + 1.6, -12.2, z0), (x0 - 0.4, -12.6, z0 - 6.0), (x0 + 0.8, -12.0, z0 - 11.0)], AURORA)
    g = Geo()
    for x, y, z, r in ((22.0, -12.2, 44.0, 1.5), (-21.0, -12.4, 42.0, 1.4), (31.0, -6.8, 76.0, 1.2),
                       (12.0, -12.6, 48.6, 1.3), (-10.0, -12.4, 48.0, 1.2), (-24.6, -10.2, 58.0, 1.3),
                       (26.0, -10.6, 64.0, 1.2), (0.0, -12.6, 47.6, 1.1)):
        g.star((x, y, z), r, r * 0.32, 0.5, points=4)
    rig.part("trunk", g, glow=STARWHITE, outline=0)
    dots = Geo()
    for x, y, z in ((8.0, -12.6, 46.4), (-4.0, -12.6, 46.6), (-16.0, -12.2, 47.6), (18.0, -12.4, 50.6),
                    (-19.6, -11.8, 50.0), (24.0, -10.8, 60.0)):
        dots.sphere((x, y, z), 0.75, cuts=2)
    rig.part("trunk", dots, glow=STARWHITE, outline=0)
    # W1: stars down the near legs as well (the long dark legs were the skin's plainest fields: micro 3.56 and
    # edge 0.42 at idle 0)
    for leg, stars in (("leg_fr", ((19.6, -12.7, 40.0, 1.3),)), ("leg_br", ((-20.2, -13.2, 38.0, 1.3),)),
                       ("leg_fr2", ((21.4, -10.7, 19.0, 1.2), (21.8, -10.6, 11.0, 1.0))),
                       ("leg_br2", ((-21.8, -10.7, 17.5, 1.2), (-21.6, -10.6, 10.0, 1.0))),
                       ("leg_fr", ((21.6, -13.0, 47.0, 1.1), (20.0, -11.6, 30.5, 1.0))),
                       ("leg_br", ((-18.6, -14.0, 46.0, 1.1), (-22.6, -11.9, 29.5, 1.0))),
                       ("trunk", ((-23.5, -10.4, 62.0, 1.0), (-21.0, -10.3, 57.0, 0.9)))):   # and on the pale rump
        g = Geo()
        for x, y, z, r in stars:
            g.star((x, y, z), r, r * 0.32, 0.5, points=4)
        rig.part(leg, g, glow=STARWHITE, outline=0)
    # a speckle of small stars down the near legs and up the neck (the pelt reads as speckled at game scale)
    for joint, pts in (("leg_fr", ((22.0, -12.9, 43.0), (19.4, -12.2, 36.0), (21.4, -11.9, 33.0))),
                       ("leg_br", ((-21.0, -13.6, 43.5), (-19.6, -12.9, 36.5), (-22.2, -12.5, 34.0))),
                       ("leg_fr2", ((21.0, -10.6, 14.6), (21.6, -10.5, 7.8))),
                       ("leg_br2", ((-22.0, -10.6, 13.6), (-21.2, -10.5, 7.4))),
                       ("neck", ((28.6, -7.1, 72.0), (30.2, -6.7, 75.6)))):
        g = Geo()
        for p in pts:
            g.sphere(p, 0.7, cuts=2)
        rig.part(joint, g, glow=STARWHITE, outline=0)
    # and an aurora ribbon down each near sock, with specks on the thighs
    for leg, pts in (("leg_fr2", [(21.0, -10.8, 23.6), (21.9, -10.9, 19.6), (21.3, -10.8, 15.4)]),
                     ("leg_br2", [(-22.2, -10.8, 22.0), (-21.3, -10.9, 18.2), (-21.9, -10.8, 14.0)])):
        g = Geo()
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 0.7, 0.7)
        rig.part(leg, g, glow=AURORA, outline=0)
    for leg, pts in (("leg_fr", ((21.4, -12.4, 44.0), (20.2, -12.0, 34.0))),
                     ("leg_br", ((-19.0, -13.0, 42.6), (-21.6, -12.4, 33.0)))):
        g = Geo()
        for p in pts:
            g.sphere(p, 0.75, cuts=2)
        rig.part(leg, g, glow=STARWHITE, outline=0)


def _damage_spots(rig):
    """Damage spots (queue item 40 section 3.3, rider: the chieftain as a Stone soldier and the elk as a beast): the
    team blanket tears and a strip hangs from its hem, the chief's team tunic, scuffs on the elk's near shoulder
    and haunch, a crack in the near antler's palm; breath puffs from the nose. As the rest pose is drawn (the whole
    model x MODEL_SCALE)."""
    k = MODEL_SCALE
    rig.damage_spot_at("blanket", "trunk", -4.0 * k, 60.0 * k, 9.0, "hide", team=True)
    rig.damage_spot_at("tunic", "chief", -1.0 * k, 77.0 * k, 6.0, "hide", team=True)
    rig.damage_spot_at("shoulder", "leg_fr", 22.0 * k, 44.0 * k, 7.0, "hide")
    rig.damage_spot_at("haunch", "leg_br", -21.0 * k, 44.0 * k, 7.0, "hide")
    rig.damage_spot_at("antler", "head", 48.0 * k, 98.0 * k, 6.0, "stone", fill=ANTLER)
    rig.damage_spot_at("hem", "trunk", -8.0 * k, 55.0 * k, 12.0, "hide", kind="strip", team=True)
    rig.damage_spot("breath", "head", (48.0, -2.0, 75.0), 5.0, "breath", kind="emit", normal=(1, 0, 0))


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
        # W1 (item 38 B1'): the lunge from the hold to the impact was 18 units (26 lu drawn, over the 25 lu that
        # makes the runtime's stand-off jerk the body); now 12.5 (18 lu): the neck reaches further instead, so the
        # rack still lands straight ahead at the contact
        (-4.0, -3.0, -0.08, -6, -40, -30, -8, (-16, 16), (-14, 14), (20, 28), (18, 24)),
        (4.0, -1.0, 0.06, -4, -34, -26, -10, (24, -20), (20, -16), (-24, 8), (-20, 6)),
        (8.5, -2.0, -0.12, -6, -34, -26, -12, (16, -2), (12, 0), (-22, 8), (-18, 6)),
        (7.0, -1.0, -0.03, -4, -26, -18, -6, (8, 0), (6, 0), (-14, 6), (-10, 4)),
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
