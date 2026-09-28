"""Bronze Colossus: Bronze Age Legendary siege heavy (A17.9), walker rig. Stomp (splash, slow),
Molten Heart (burst on death), ~200 lu. Rendered at the Legendary sheet scale.

Look (A17.12): a huge walking statue of a hoplite cast in aged bronze, streaked with verdigris,
with white-hot seams at the joints and a cracked molten heart in the chest. It is turned well
toward the camera (YAW_DEG) so the face and chest read: a great crested helmet (a team crest
like a sail, polished brow and cheek plates, glowing eye slits in a dark T-shaped face
opening), a wide team sash across the chest, team pauldrons and pteruges, polished-bronze
greaves and bracers, heavy sandalled feet that plant without sliding. The near hand holds a
short polished leaf sword; the far arm carries a big round team shield in front of the body
(polished rim, plum back, sandstone lambda).

Motion: the idle breathes (the chest rises, the head and crest sway several lu); the walk is a
slow, heavy stride (1.4 s); the attack is an overhead sword chop into the ground with a stomp
(dust ring and sparks on the held impact); a hit recoils 7 degrees with a seam flash; the death
staggers, crumples forward onto one knee and bursts (the seams flare white, plates fly off),
which sets up the game's Molten Heart burst, then slumps for the dust hand-off.
"""
import math

from ageborn_art import fx, retime
from ageborn_art import rigs_bronze as B
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

retime.HEAVY_MELEE.add("bronze_colossus")

SLUG = "bronze_colossus"
NAME = "Bronze Colossus"
HEIGHT_LU = 200
YAW_DEG = -46.0          # turned toward the camera: helmet front, chest, seams and sash read
CANVAS = (640, 610)
FEET = (262, 580)
ANCHORS = {"head": (6, 196), "hitCenter": (0, 104)}

BR = "#AC8F6C"           # statue bronze, aged (sat ~37%, outside the colour rule)
BR_DK = "#806A4E"
BR_LT = "#C0A585"
PATINA = B.VERD_LT
SEAM = B.FIRE
SEAM_CORE = B.FIRE_CORE
FLARE = "#FFFFFF"
DARK = "#2E2722"
POL = B.BRONZE           # polished bronze accents (<= 10% of the silhouette)
RICH = "bronze_rich"     # the polished finish with a tighter highlight (config.FINISHES)

HIP_Z = 62.0
THIGH, SHIN = 32.0, 36.0
ANK_REST = HIP_Z - THIGH - SHIN
ANKLE_H = 11.0
LEG_Y = {"r": -16.0, "l": 16.0}
STANCE_X = {"r": 10.0, "l": -12.0}
LIFT = 8.0
SHOULDER_Z = 134.0
ARM_Y = {"r": -38.0, "l": 36.0}
UPPER, LOWER = 25.0, 25.0
HAND = {s: (0.0, ARM_Y[s], SHOULDER_Z - UPPER - LOWER) for s in ("r", "l")}
BLADE = 64.0             # leaf sword, grip to tip (modelled pointing up from the near fist)
SW = (HAND["r"][0] + 1.5, HAND["r"][1] - 2.0, HAND["r"][2])
SMEAR = {"joint": "sword", "inner": (SW[0], SW[1], SW[2] + 20.0), "outer": (SW[0], SW[1], SW[2] + BLADE + 6.0),
         "color": B.BRONZE_HI, "taper": 0.45, "start": 0.3, "behind": 8.0}

FLARES = []              # hidden white-hot copies of every seam, shown on the hit and the burst


def _seam(rig, joint, build, r=1.2):
    """A glowing seam on `joint` plus a hidden, fatter white flare copy (`flare_<n>`)."""
    rig.part(joint, build(r), glow=SEAM, outline=0.8, outline_hex=DARK)
    name = f"flare_{len(FLARES)}"
    rig.joint(name, joint, rig.rest[joint], hidden=True)
    rig.part(name, build(r * 1.9), glow=FLARE, outline=0)
    FLARES.append(name)


def _line(pts):
    def build(r):
        g = Geo()
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, r, r * 0.8, segs=8, rings=2)
        return g
    return build


def _ring(center, radius, axis_y=True, sg=1):
    x, y, z = center

    def build(r):
        return Geo().lathe([(0, -r), (radius + r * 0.2, -r), (radius + r * 0.6, 0), (radius + r * 0.2, r), (0, r)],
                           (x, y, z), (x, y + 1, z) if axis_y else (x, y, z + 1), segs=20)
    return build


def _arm(rig, s):
    y = ARM_Y[s]
    z = SHOULDER_Z
    sg = 1 if s == "r" else -1
    g = Geo().capsule((0, y, z), (0, y, z - UPPER), 9.0, 8.0)
    rig.part(f"arm_{s}", g, BR, finish="metal")
    g = Geo().blob((1.0, y - 1.0 * sg, z + 3.0), (13.0, 11.0, 10.5), p=2.6)      # shoulder
    rig.part(f"arm_{s}", g, BR, finish="metal")
    g = Geo().blob((1.0, y - 1.6 * sg, z + 5.0), (15.0, 13.0, 8.0), p=2.6, taper=(1.15, 0.9))   # team pauldron
    g.clip((0, 0, z - 2.0), (0, 0, -1))
    rig.part(f"arm_{s}", g, team=True)
    g = Geo().blob((1.0, y - 1.6 * sg, z - 2.4), (15.6, 13.6, 1.5), p=3.0)
    rig.part(f"arm_{s}", g, B.VERD, finish="metal", outline=0.6)
    g = Geo().lathe([(0, -3.0), (9.2, -2.8), (9.6, 0), (9.2, 2.8), (0, 3.0)], (0, y, z - UPPER), (0, y + 1, z - UPPER),
                    segs=18)
    rig.part(f"fore_{s}", g, DARK, finish="metal")
    # the elbow seam lies in the XZ plane (a ring around the joint seen from the side)
    _seam(rig, f"fore_{s}", _ring((0, y - 0.5 * sg, z - UPPER), 9.6), r=1.1)
    g = Geo().capsule((0, y, z - UPPER), (0, y, z - UPPER - LOWER + 4), 8.4, 8.8)
    rig.part(f"fore_{s}", g, BR, finish="metal")
    g = Geo().blob((0.5, y, z - UPPER - 14.0), (10.2, 10.2, 5.4), p=3.0)           # polished bracer
    rig.part(f"fore_{s}", g, B.VERD, finish="metal", outline=0.8)
    x, hy, hz = HAND[s]
    g = Geo().blob((x + 1.5, hy, hz - 2.0), (11.0, 9.6, 10.4), p=2.6)              # big fist
    g.blob((x + 8.0, hy - 4.0 * sg, hz + 1.0), (4.4, 4.0, 4.0), p=2.4)              # thumb
    rig.part(f"hand_{s}", g, BR, finish="metal")


def _sword(rig):
    """A short polished leaf sword along +Z from the near fist: verdigris grip, a crossguard,
    a leaf blade widest two thirds up, a white-hot fuller seam."""
    x, y, z = SW
    rig.joint("sword", "hand_r", SW)
    g = Geo().capsule((x, y, z - 12.0), (x, y, z + 10.0), 2.6, 2.4)
    rig.part("sword", g, B.PLUM_DK, outline=0.8)
    g = Geo().sphere((x, y, z - 13.5), 3.8, cuts=3)                                    # pommel
    g.blob((x, y, z + 11.0), (4.0, 9.0, 2.4), p=2.4)                                   # guard
    rig.part("sword", g, B.VERD, finish="metal", outline=0.7)
    b0 = z + 13.0
    g = Geo().lathe([(0, 0), (4.0, 2.0), (5.2, BLADE * 0.35), (6.4, BLADE * 0.62), (3.8, BLADE * 0.86), (0, BLADE)],
                    (x, y, b0), (x, y, b0 + BLADE), segs=14, squash=(1.0, 0.3))
    rig.part("sword", g, "#D6C29E", finish=B.POLISH, outline=0.8, outline_hex=BR_DK)
    g = Geo().capsule((x, y - 2.0, b0 + 3.0), (x, y - 2.0, b0 + BLADE * 0.72), 0.9, 0.5, segs=8, rings=2)
    rig.part("sword", g, glow=SEAM, outline=0)
    rig.track("swordTip", "sword", (x, y, b0 + BLADE))


def _shield(rig):
    """The team aspis on the far fist, held in front of the body and turned to the camera."""
    x, y, z = HAND["l"]
    rig.joint("shield", "hand_l", HAND["l"])
    nx, ny = 0.85, -0.53
    L = math.hypot(nx, ny)
    nx, ny = nx / L, ny / L
    c = (x + 8.0 + nx * 8.0, y + ny * 8.0 - 6.0, z + 8.0)
    R = 31.0

    def at(d):
        return (c[0] + nx * d, c[1] + ny * d, c[2])
    # plum back, polished rim, team face (a shallow dome), sandstone lambda, boss
    g = Geo().lathe([(0, -3.0), (R * 0.95, -2.6), (R, 0.0), (0, 0.4)], at(-3.0), at(-2.0), segs=32)
    rig.part("shield", g, B.PLUM_DK, outline=0.8)
    g = Geo().lathe([(0, -1.0), (R, -1.0), (R + 0.5, 0.8), (R - 0.3, 2.2), (R - 2.8, 2.2), (0, 1.6)],
                    at(0.0), at(1.0), segs=32)
    rig.part("shield", g, POL, finish=B.POLISH, outline=0.8)
    g = Geo().lathe([(0, 0.0), (R - 2.6, 0.0), (R - 3.0, 1.6), (R * 0.5, 3.4), (0, 4.2)], at(1.0), at(2.0), segs=32)
    rig.part("shield", g, team=True, outline=0.8)
    # lambda chevron, lying on the face (built in the face plane)
    ux, uy = -ny, nx          # in-plane horizontal axis of the face
    k = R / 13.0

    def face(u, v, d=4.6):
        return (c[0] + ux * u + nx * d, c[1] + uy * u + ny * d, c[2] + v)
    g = Geo()
    g.capsule(face(-5.6 * k, -6.2 * k), face(0, 6.4 * k, 5.2), 1.5 * k)
    g.capsule(face(0, 6.4 * k, 5.2), face(5.6 * k, -6.2 * k), 1.5 * k)
    rig.part("shield", g, B.SAND_LT, outline=0.6)
    g = Geo().sphere(face(0, 0, 5.6), 4.2, cuts=3)
    rig.part("shield", g, B.BRONZE_HI, finish=RICH, outline=0.6)


def _debris(rig):
    """Hidden bronze plates that fly off in the death burst (shown and moved by pose)."""
    for i, (x, y, z, rx, rz, rot) in enumerate(((20.0, -34.0, 120.0, 15.0, 10.0, 20), (-6.0, -34.0, 140.0, 13.0, 9.0, -30),
                                                 (18.0, -34.0, 80.0, 12.0, 9.0, 50), (-14.0, -34.0, 100.0, 11.0, 8.0, -60))):
        name = f"plate_{i}"
        rig.joint(name, "torso", (x, y, z), hidden=True)
        g = Geo().blob((x, y, z), (rx, 2.6, rz), p=2.4, rot=(0, rot, 0))
        g.blob((x + rx * 0.3, y - 2.2, z + rz * 0.3), (rx * 0.5, 1.0, rz * 0.4), p=2.2, rot=(0, rot, 0))
        rig.part(name, g, BR_LT, finish="metal", outline=0.8)
        g = Geo().capsule((x - rx * 0.8, y + 0.4, z), (x + rx * 0.8, y + 0.4, z), 1.4)
        rig.part(name, g, glow=SEAM, outline=0)
    rig.joint("burst", "torso", (22.0, -24.0, 112.0), hidden=True)
    g = Geo().sphere((22.0, -34.0, 112.0), 24.0, cuts=4)
    rig.part("burst", g, glow=SEAM, outline=0)
    g = Geo().sphere((24.0, -44.0, 113.0), 15.0, cuts=4)
    rig.part("burst", g, glow=FLARE, outline=0)
    g = Geo()
    for i in range(10):
        a = 2 * math.pi * (i + 0.3) / 10
        L = 48.0 if i % 2 == 0 else 34.0
        g.capsule((22.0 + 18 * math.cos(a), -46.0, 112.0 + 18 * math.sin(a)),
                  (22.0 + L * math.cos(a), -46.0, 112.0 + L * math.sin(a)), 3.6, 1.0, segs=6, rings=2)
    rig.part("burst", g, glow=FLARE, outline=0)


def build(rig):
    FLARES.clear()
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("hips", "body", (0, 0, HIP_Z))
    rig.joint("torso", "hips", (0, 0, HIP_Z + 12.0))
    rig.joint("head", "torso", (4.0, 0, 146.0))
    for s in ("r", "l"):
        F.walker_leg(rig, s, (0.0, LEG_Y[s], HIP_Z), THIGH, SHIN)
        y = ARM_Y[s]
        rig.joint(f"arm_{s}", "torso", (0, y, SHOULDER_Z))
        rig.joint(f"fore_{s}", f"arm_{s}", (0, y, SHOULDER_Z - UPPER))
        rig.joint(f"hand_{s}", f"fore_{s}", HAND[s])

    _arm(rig, "l")

    # legs: bronze thighs, glowing knee seams, polished greaves, sandalled feet
    for s in ("r", "l"):
        y = LEG_Y[s]
        kz = HIP_Z - THIGH
        sg = 1 if s == "r" else -1
        g = Geo().capsule((0, y, HIP_Z), (0, y, kz), 10.0, 8.4)
        rig.part(f"thigh_{s}", g, BR, finish="metal")
        g = Geo().lathe([(0, -4.0), (8.8, -3.8), (9.4, 0), (8.8, 3.8), (0, 4.0)], (0, y, kz), (0, y + 1, kz), segs=20)
        rig.part(f"shin_{s}", g, DARK, finish="metal")
        _seam(rig, f"shin_{s}", _ring((0, y - 0.6 * sg, kz), 9.8), r=1.2)
        g = Geo().capsule((0, y, kz), (0, y, ANK_REST + 4), 7.6, 6.4)
        rig.part(f"shin_{s}", g, BR, finish="metal")
        g = Geo().blob((3.6, y, kz - 15.0), (8.6, 9.0, 10.5), p=2.6, taper=(0.82, 1.08))      # polished greave
        rig.part(f"shin_{s}", g, POL, finish=RICH)
        g = Geo().blob((3.2, y, kz - 3.4), (8.4, 9.0, 1.4), p=3.0)
        g.blob((3.2, y, kz - 31.0), (7.8, 8.4, 1.4), p=3.0)
        rig.part(f"shin_{s}", g, B.VERD_DK, finish="metal", outline=0.6)
        a = ANK_REST
        g = Geo().blob((6.0, y, a - 6.2), (17.0, 10.0, 6.0), p=3.0, taper=(1.0, 0.85))
        g.blob((-5.0, y, a - 3.0), (9.0, 9.0, 7.0), p=2.8)
        rig.part(f"foot_{s}", g, BR, finish="metal")
        g = Geo().blob((6.0, y, a - 10.6), (17.8, 10.6, 1.8), p=3.4)                           # sole
        g.capsule((-2.0, y - 9.6 * sg, a - 1.0), (10.0, y - 10.0 * sg, a - 7.0), 1.4)            # strap
        rig.part(f"foot_{s}", g, DARK, finish="metal", outline=0.6)
    rig.track("_foot", "foot_r", (6.0, LEG_Y["r"], ANK_REST - 12.0))

    # pelvis, a plum kilt under the team pteruges, a verdigris belt
    g = Geo().blob((0, 0, HIP_Z + 6.0), (22.0, 22.0, 12.0), p=2.8)
    rig.part("hips", g, BR, finish="metal")
    g = Geo().blob((0.5, 0, HIP_Z - 2.0), (22.6, 22.6, 7.0), p=2.6, taper=(1.0, 1.08))
    rig.part("hips", g, B.PLUM)
    rig.secondary("hem", "hips", (1.0, 0, HIP_Z + 4.0), (1.0, 0, HIP_Z - 20.0), max_deg=6, gain=0.6)
    g = Geo()
    n = 9
    for k in range(n):
        ang = math.pi * (0.55 + 1.9 * k / (n - 1))
        g.blob((23.0 * math.cos(ang), 23.0 * math.sin(ang), HIP_Z - 5.0), (6.0, 3.8, 11.5), p=3.4, taper=(0.9, 1.0),
               rot=(0, 0, math.degrees(ang) + 90))
    rig.part("hem", g, team=True)
    g = Geo().blob((1.0, 0, HIP_Z + 7.0), (23.6, 23.4, 3.4), p=3.2)                            # belt
    rig.part("hips", g, B.VERD, finish="metal")
    _seam(rig, "hips", _ring((1.0, 0, HIP_Z + 11.0), 21.0, axis_y=False), r=1.1)

    # torso: a muscled bronze cuirass, patina streaks, molten cracks and heart, team sash
    g = Geo().blob((0, 0, 88.0), (19.0, 19.0, 13.0), p=2.6)
    rig.part("torso", g, BR, finish="metal")
    g = Geo().blob((1.0, 0, 114.0), (30.0, 29.0, 25.0), p=2.6, taper=(0.78, 1.1))
    rig.part("torso", g, BR_LT, finish="metal")
    g = Geo().blob((17.0, -9.0, 118.0), (12.0, 10.0, 8.6), p=2.2)                                  # pecs
    g.blob((17.0, 9.0, 118.0), (12.0, 10.0, 8.6), p=2.2)
    g.blob((20.0, -6.0, 100.0), (8.0, 9.0, 5.0), p=2.4).blob((20.0, 6.0, 100.0), (8.0, 9.0, 5.0), p=2.4)
    rig.part("torso", g, BR_LT, finish="metal")
    g = Geo()
    for x, y, z, rx, rz in ((22.0, -18.0, 128.0, 1.6, 10.0), (4.0, -27.0, 122.0, 1.8, 9.0),
                            (-12.0, -22.0, 116.0, 1.6, 12.0), (14.0, -24.0, 96.0, 1.4, 7.0)):
        g.blob((x, y, z), (rx * 2.2, 1.8, rz), p=2.2)
    rig.part("torso", g, PATINA)
    # white-hot cracks radiating from the heart (on the camera side of the chest)
    _seam(rig, "torso", _line([(20.0, -24.0, 130.0), (24.0, -21.0, 121.0), (24.5, -19.0, 112.0),
                               (27.0, -14.0, 101.0), (24.0, -10.0, 92.0)]), r=1.5)
    _seam(rig, "torso", _line([(25.0, -19.0, 117.0), (29.0, -6.0, 118.0), (27.0, 4.0, 124.0)]), r=1.2)
    _seam(rig, "torso", _line([(24.0, -20.0, 110.0), (12.0, -28.0, 104.0), (4.0, -29.0, 96.0)]), r=1.2)
    _seam(rig, "torso", _ring((3.0, 0, 140.0), 14.0, axis_y=False), r=1.2)                       # neck
    rig.joint("heart", "torso", (26.5, -18.0, 115.0))
    g = Geo().sphere((26.5, -18.0, 115.0), 3.6, cuts=3)
    rig.part("heart", g, glow=SEAM_CORE, outline=0.8, outline_hex=SEAM)
    g = Geo()
    g.capsule((18.0, -26.0, 136.0), (26.0, 6.0, 96.0), 7.4, 6.4)                                  # sash
    g.capsule((26.0, 6.0, 96.0), (-10.0, 24.0, 92.0), 6.4)
    g.capsule((-22.0, -18.0, 134.0), (18.0, -26.0, 136.0), 6.8)
    rig.part("torso", g, team=True)
    g = Geo().blob((4.0, 0, 141.0), (14.0, 15.0, 5.0), p=2.6)                                     # neck
    rig.part("torso", g, BR_DK, finish="metal")

    # head: a great crested helmet, polished brow and cheek plates, a dark T face opening
    g = Geo().blob((6.0, 0, 158.0), (15.0, 14.0, 15.0), p=2.4)
    g.blob((13.0, 0, 147.0), (8.0, 10.0, 6.0), p=2.4)
    rig.part("head", g, BR_LT, finish="metal")
    g = Geo().blob((-2.0, 0, 150.0), (8.0, 14.6, 8.0), p=2.4)                                     # neck guard
    rig.part("head", g, BR_DK, finish="metal")
    g = Geo()
    for yy in (-10.5, 10.5):                                                                        # cheek plates
        g.blob((14.0, yy, 148.5), (6.4, 3.4, 8.6), p=2.4, taper=(0.7, 1.0), rot=(0, -8, 0))
    rig.part("head", g, BR_LT, finish="metal", outline=0.8)
    g = Geo().slab([(19.5, 163.0), (23.0, 163.0), (23.0, 158.0), (21.6, 150.0), (19.6, 142.0), (17.0, 142.0),
                    (18.4, 158.0)], 0.0, 14.0)
    rig.part("head", g, DARK, outline=0)
    g = Geo().blob((18.8, 0, 160.2), (4.2, 12.4, 2.8), p=2.6)                                      # eye band
    rig.part("head", g, DARK, outline=0)
    rig.joint("eyes", "head", (21.0, 0, 160.0))
    g = Geo().capsule((20.8, -8.0, 160.6), (22.0, -2.0, 159.8), 1.6).capsule((22.0, 2.0, 159.8), (20.8, 8.0, 160.6), 1.6)
    rig.part("eyes", g, glow=SEAM_CORE, outline=0.6, outline_hex=SEAM)
    g = Geo().blob((6.4, 0, 158.6), (15.6, 14.6, 2.0), p=2.8)                                      # polished brow band
    rig.part("head", g, B.VERD, finish="metal", outline=0.6)
    g = Geo().capsule((20.0, -6.0, 165.0), (20.4, 6.0, 165.0), 1.8)
    rig.part("head", g, POL, finish=RICH, outline=0.6)
    g = Geo().blob((2.0, -9.0, 166.0), (8.0, 1.8, 5.0), p=2.2)
    rig.part("head", g, PATINA)
    g = Geo().capsule((4.0, 0, 172.0), (3.0, 0, 176.0), 2.4)
    rig.part("head", g, B.VERD_DK, finish="metal", outline=0.6)
    rig.secondary("crest", "head", (12.0, 0, 176.0), (-26.0, 0, 176.0), max_deg=8, gain=0.8)
    g = Geo()
    n = 10
    for i in range(n):
        t = i / (n - 1)
        a = math.pi * (0.1 + 0.95 * t)
        x = 8.0 + 12.0 * math.cos(a) - 24.0 * t
        z = 175.0 + 20.0 * math.sin(a) * (1.0 - 0.25 * t)
        r = 6.0 + 2.6 * math.sin(math.pi * t) - 2.0 * t
        g.blob((x, 0, z), (r * 1.05, 4.2, r), p=2.1)
    rig.part("crest", g, team=True)

    _shield(rig)
    _arm(rig, "r")
    _sword(rig)
    _debris(rig)
    B.dust_puff(rig, "root", (40.0, -22.0, 4.0), size=2.6, name="dust")
    B.sparks(rig, "root", (78.0, -30.0, 30.0), size=2.8, name="sparks", rays=8, seed=3)


# -- poses ---------------------------------------------------------------------------------
def legs(foot_r, foot_l, hips=(0.0, 0.0)):
    pose = {}
    for s, (fx_, lift) in (("r", foot_r), ("l", foot_l)):
        tgt = (fx_ - hips[0], ANKLE_H + lift - hips[1])
        pose.update(F.leg_ik(s, (0.0, HIP_Z), tgt, THIGH, SHIN, knee_fwd=True))
    pose["hips"] = {"x": hips[0], "z": hips[1]}
    return pose


def stand(bob=0.0, dx=0.0):
    return legs((STANCE_X["r"], 0.0), (STANCE_X["l"], 0.0), (dx, LIFT + bob))


def arms(ra, rf, sw, la=-40.0, lf=-8.0):
    """Sword arm (upper, fore, sword direction) and the shield arm held forward; the shield
    keeps the torso's orientation (w = w_rest)."""
    return merge(F.arm("r", ra, rf, sw, w_rest=90.0), F.arm("l", la, lf, -90.0, w_rest=-90.0))


REST = arms(-84, 44, 122)
WALK_MS = [175] * 8
STRIDE = 28.0            # natural speed 2 x 28 / 1.4 s = 40 lu/s (sim speed 40)


def _glow(f):
    return {"heart": {"s": [1.0, 1.15, 0.9, 1.1, 0.95, 1.2, 1.0, 1.05][f % 8]}}


def _flare(pose):
    for n in FLARES:
        pose.setdefault(n, {})["show"] = True
    return pose


def _idle(f):
    # breathing: the chest rises and widens, the head and crest sway (>= 3 lu at the head)
    c, lag = F.idle_wave(f)
    return merge(stand(2.4 * c), REST, _glow(f), {
        "torso": dict(squash(0.025 * c), r=1.6 * c),
        "head": {"r": -3.5 * lag, "x": 1.6 * lag, "z": 1.2 * c},
        "crest": {"r": 5.0 * lag},
        "arm_r": {"r": 2.5 * lag}, "arm_l": {"r": 2.0 * lag}, "hand_r": {"r": -3.0 * lag},
    })


def _walk(f):
    xr, lr, _ = F.walker_cycle(f, 8, STRIDE, 18.0)
    xl, ll, _ = F.walker_cycle(f, 8, STRIDE, 18.0, phase=0.5)
    bob = [-4.0, -1.5, 2.0, 0.0, -4.0, -1.5, 2.0, 0.0][f]
    lag = [0.0, -4.0, -1.5, 2.0, 0.0, -4.0, -1.5, 2.0][f]
    p = 2 * math.pi * f / 8
    return merge(legs((STANCE_X["r"] + xr, lr), (STANCE_X["l"] + xl, ll), (0.0, LIFT + bob)), REST, _glow(f), {
        "torso": dict(r=-4.0 + 1.5 * math.cos(2 * p), rz=5.0 * math.sin(p), rx=2.0 * math.sin(p)),
        "head": {"r": 1.0 - 0.5 * lag},
        "arm_r": {"r": -8 * math.cos(p) + 0.8 * lag}, "hand_r": {"r": 3 * math.cos(p)},
        "arm_l": {"r": 5 * math.cos(p)},
    })


ATTACK_MS = [100, 100, 200, 50, 167, 100, 100, 100]


def _attack(f):
    # 0-1 raise the sword over the head and lift the near foot (coil), 2 held extreme (blade
    # far back behind the head), 3 smear (the chop), 4 held impact: blade driven into the
    # ground ahead, foot stamped, deep crouch, dust ring and sparks; 5-7 heavy recovery
    ra = pick(f, [-20, 70, 110, 20, -30, -36, -52, -66])
    rf = pick(f, [30, 120, 150, -5, -40, -40, -30, -14])
    sw = pick(f, [115, 150, 175, 10, -52, -46, -10, 40])
    la = pick(f, [-36, -24, -18, -46, -58, -56, -50, -42])
    lf = pick(f, [-4, 6, 12, -14, -22, -20, -14, -9])
    foot = pick(f, [(12, 6), (16, 20), (18, 26), (22, 8), (24, 0), (22, 0), (16, 0), (11, 0)])
    bob = pick(f, [0, -2, 1, -2, -16, -13, -6, -1])
    dx = pick(f, [-1, -3, -4, 3, 8, 7, 4, 1])
    pose = merge(legs((STANCE_X["r"] + foot[0] - 10, foot[1]), (STANCE_X["l"], 0.0), (dx, LIFT + bob)),
                 arms(ra, rf, sw, la, lf), _glow(f), {
        "torso": dict(squash(pick(f, [-0.02, -0.05, 0.05, 0.03, -0.1, -0.06, -0.02, 0])),
                      r=pick(f, [2, 8, 12, -8, -24, -20, -10, -3])),
        "head": {"r": pick(f, [1, 4, 6, -3, -8, -6, -3, 0])},
        "dust": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.85, 1.15, 1.35, 1]),
                 "z": pick(f, [0, 0, 0, 0, 0, 3, 6, 0])},
        "sparks": {"show": f == 4},
        "heart": {"s": pick(f, [1, 1.1, 1.2, 1.3, 1.5, 1.3, 1.1, 1])},
    })
    if f == 3:
        pose.setdefault("sword", {})["sz"] = 1.2
    return pose


def _hit(f):
    # a 7 degree recoil with a white seam flash on the first frames
    a = [1.0, 0.55, 0.2][f]
    pose = merge(stand(-2.0 * a, -3.5 * a), REST, _glow(0), {
        "torso": dict(squash(-0.04 * a), r=7 * a), "head": {"r": 8 * a},
        "arm_r": {"r": 10 * a}, "arm_l": {"r": 8 * a},
        "heart": {"s": 1.0 + 0.6 * a},
    })
    if f == 0:
        _flare(pose)
    return pose


# death: 8 unique poses, 12 steps (about 1.05 s). 0 struck (recoil, heart flares), 1 stagger,
# 2 knees buckle and the body pitches forward, 3 crumple onto the near knee, 4 BURST (every
# seam flares white, the chest bursts, plates fly off), 5 plates falling, the body slumping,
# 6 slumped forward on the ground, 7 hand-off (the dust poof covers it)
DIE_SEQ = [0, 1, 2, 3, 3, 4, 4, 5, 6, 6, 7, 7]
DIE_MS = [70, 80, 90, 80, 70, 60, 70, 90, 100, 110, 110, 120]
PLATE_PATH = {  # (dx, dz, spin) per die frame for each plate, lu in torso space
    4: [(26, 16, 40), (-14, 28, -50), (30, -4, 60), (-26, 10, -70)],
    5: [(52, 6, 110), (-30, 34, -120), (58, -40, 150), (-52, -16, -150)],
}


def _die(f):
    kneel = pick(f, [0, 0, 8, 18, 20, 24, 28, 28])
    dx = pick(f, [-3, -6, -4, 4, 6, 8, 10, 10])
    torso = pick(f, [8, 12, -12, -30, -26, -38, -48, -52])
    foot_r = pick(f, [(STANCE_X["r"], 0), (STANCE_X["r"] - 2, 4), (STANCE_X["r"] + 6, 0), (STANCE_X["r"] + 14, 0),
                      (STANCE_X["r"] + 14, 0), (STANCE_X["r"] + 16, 0), (STANCE_X["r"] + 18, 0), (STANCE_X["r"] + 18, 0)])
    pose = merge(legs(foot_r, (STANCE_X["l"] - 4, 0.0), (dx, LIFT - kneel * 1.4)),
                 arms(pick(f, [-40, -20, -70, -100, -90, -110, -120, -120]),
                      pick(f, [10, 30, -30, -80, -70, -95, -100, -100]),
                      pick(f, [90, 110, 30, -40, -30, -60, -80, -80]),
                      pick(f, [-20, -10, -50, -70, -60, -76, -80, -80]),
                      pick(f, [10, 20, -20, -40, -30, -50, -56, -56])), {
        "body": {"r": pick(f, [4, 6, -2, -6, -6, -8, -10, -10]),
                 "s": pick(f, [1, 1, 1, 1, 1.02, 1, 0.98, 0.9])},
        "torso": dict(squash(pick(f, [0, 0, -0.02, -0.04, 0.05, -0.03, -0.05, -0.08])), r=torso),
        "head": {"r": pick(f, [10, 14, -8, -14, -4, -16, -20, -22])},
        "heart": {"s": pick(f, [1.6, 1.9, 2.1, 2.4, 3.2, 2.0, 1.2, 0.9])},
        "crest": {"r": pick(f, [-6, -10, 8, 14, 6, 10, 12, 12])},
    })
    if f in (0, 3, 4):
        _flare(pose)
    if f in (4, 5):
        pose["burst"] = {"show": True, "s": 1.0 if f == 4 else 0.55}
        for i, (px_, pz, spin) in enumerate(PLATE_PATH[f]):
            pose[f"plate_{i}"] = {"show": True, "x": px_, "z": pz, "r": spin}
    if f in (0, 4):
        pose["sparks"] = {"show": True}
    return pose


def _die_extra():
    total = sum(DIE_MS)
    handoff = sum(DIE_MS[:len(DIE_MS) - 2])
    burst = sum(DIE_MS[:DIE_SEQ.index(4)])
    h = HEIGHT_LU
    return {
        "fx": [
            {"id": "fx.dust_poof", "atMs": handoff - 40, "offsetLu": [0, round(h * 0.36, 1)]},
            {"id": "fx.ko_stars", "atMs": handoff + 40, "offsetLu": [0, round(h * 0.55, 1)],
             "loops": 2, "scalePow": 0.5},
        ],
        "burstAtMs": burst,
        "hideUnitAtMs": total,
    }


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=ATTACK_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 8, _die, sequence=DIE_SEQ, durations=DIE_MS, extra=_die_extra()),
    ]
