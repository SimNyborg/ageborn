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

Motion (cartoon kit v2; a viewer expects a walking giant whose ability is Stomp to stamp the
ground so hard it shakes, with a slow, heavy wind-up):
  idle    breathes (the chest rises, steam-like heat pulses in the heart, the crest sways)
  walk    walk v3 heavy walk (ANIM_SPEC G3) at the ground speed: 10 frames, 1.25 s, a hard contact
          with a jolt, a deep down, a slow passing; planted feet by IK with a heel-toe roll, the
          shoulders rolling and the arms swinging, the crest trailing
  attack_b  SHIELD BASH: coils behind the shield in a low crouch, then rams it forward in a long
          lunge (sparks off the rim, a dust crescent)
  attack_c  OVERHEAD CHOP: rises with the sword raised high behind his head, then chops it down
          in front with a deep crouch (the heart flares, sparks off the blade)
  attack  QUAKE STOMP: shifts his weight, lifts the near foot to his chest with the shield
          raised high and the sword held out for balance (the long held extreme), then stamps
          the foot down and slams the shield rim into the ground: a deep crouch, a dust ring,
          ground-crack lines, sparks and the heart flaring
  hit     mech: a hard jolt without squash, every seam flashes white, a plate pops out and back
  die     staggers, crumples onto one knee and bursts (the seams flare white, plates fly off),
          which sets up the game's Molten Heart burst, then slumps for the dust hand-off
"""
import math

from ageborn_art import gait as GT
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art import rigs_future as F
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo


SLUG = "bronze_colossus"
GAIT_NAME = "heavy"
NAME = "Bronze Colossus"
HEIGHT_LU = 200
YAW_DEG = -46.0          # turned toward the camera: helmet front, chest, seams and sash read
CANVAS = (640, 610)
FEET = (262, 580)
ANCHORS = {"head": (6, 196), "hitCenter": (0, 104)}
NO_RETIME = True

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
    global RIG
    RIG = rig
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
    rig.track("_foot_l", "foot_l", (6.0, LEG_Y["l"], ANK_REST - 12.0))

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
    # 6 poses x 150 ms: breathing (the chest rises and widens, the head and crest sway >= 3 lu)
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    return merge(stand(2.4 * c), REST, _glow(f), {
        "torso": dict(squash(0.025 * c), r=1.6 * c),
        "head": {"r": -3.5 * lag, "x": 1.6 * lag, "z": 1.2 * c},
        "crest": {"r": 5.0 * lag},
        "arm_r": {"r": 2.5 * lag}, "arm_l": {"r": 2.0 * lag}, "hand_r": {"r": -3.0 * lag},
        "eyes": {"s": 1.0 + 0.08 * (f == 3)},
    })


# -- walk v3: G3 heavy walk at ground speed (card 40 x 1.25 = 50 lu/s), 10 x 125 ms ----------------
# the statue is turned 46 degrees to the camera, so a planted foot moves 50 / cos 46 = 72 lu/s in
# character space (gait.Gait yaw_deg); the screen step is 50 x 0.625 = 31 lu
RIG = None
SPEED = 50.0
WALK_N, WALK_CYCLE = 10, 1250
LEGS = {s: GT.Leg(f"thigh_{s}", f"shin_{s}", (0.0, LEG_Y[s], ANK_REST), foot=f"foot_{s}",
                  toe=(20.0, LEG_Y[s], ANK_REST - 10.0), heel=(-10.0, LEG_Y[s], ANK_REST - 10.0))
        for s in ("r", "l")}
GAIT = GT.Gait(WALK_N, WALK_CYCLE, SPEED, {"r": (LEGS["r"], -0.03, 0.0, ANKLE_H), "l": (LEGS["l"], 0.47, -2.0, ANKLE_H)},
               0.56, yaw_deg=YAW_DEG, lift=12.0, kick=3.0, reach=4.0, toe_off=16.0, heel_strike=10.0,
               lift_peak=0.45, early_lift=3.0)
# key poses per half cycle (5 frames): CONTACT (hard, a jolt), DOWN (deep), PASSING, PASSING, UP (short)
W_BOB = [-4.0, -7.5, -3.0, 0.5, 1.5]
W_JOLT = [-0.03, -0.05, 0.0, 0.01, 0.02]
W_SH = [2.5, 3.0, 1.0, -1.0, -2.0]          # shoulder roll (deg), the weight side drops on contact


def _walk(f, report=None):
    k = f % 5
    side = 1 if f < 5 else -1                 # the near foot lands on frame 0, the far on 5
    p = 2 * math.pi * f / WALK_N
    lag_k = (f - 1) % 5
    swing = math.cos(2 * math.pi * (f - 1) / WALK_N)    # arms swing against the legs, a frame late
    pose = merge(REST, _glow(f), {
        "hips": {"x": 0.0, "z": LIFT + W_BOB[k]},
        "body": squash(W_JOLT[k]),
        "torso": dict(r=-6.0 + 1.5 * math.cos(2 * p), rz=6.0 * math.sin(p), rx=W_SH[k] * side),
        "head": {"r": 2.0 - 0.8 * W_BOB[lag_k]},
        "crest": {"r": 4.0 * W_BOB[lag_k] / 7.5},
        "arm_r": {"r": -16 * swing}, "fore_r": {"r": -8 * max(0.0, swing)}, "hand_r": {"r": 4 * swing},
        "arm_l": {"r": 10 * swing}, "fore_l": {"r": 4 * max(0.0, -swing)},
    })
    return GT.solve(RIG, pose, GAIT.targets(f), report=report)


# 10 unique frames in the 12 heavy steps (moves.HEAVY_MELEE_MS; impact on step 6)
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#          shift  dip  lift  HOLD  down  down  IMP  shock  foll  rec
FOOT = [(10, 0), (8, 0), (18, 22), (22, 44), (26, 22), (28, 6), (28, 0), (28, 0), (24, 0), (14, 0)]
BOB = [0, -5, 2, 6, 2, -4, -13, -11, -5, -1]
DX = [-2, -3, -2, -3, 2, 6, 9, 9, 6, 2]
TORSO = [3, 6, 8, 10, -4, -12, -22, -20, -10, -3]
HEAD = [1, 3, 4, 4, -2, -6, -8, -7, -3, 0]
Q = [0.0, -0.03, 0.02, 0.04, 0.02, 0.0, -0.09, -0.06, -0.02, 0.0]
# sword out behind for balance, shield raised then slammed down (torso-space directions)
RA = [-80, -70, -20, 0, -30, -60, -84, -84, -84, -84]
RF = [40, 30, 10, 10, 0, -20, 30, 36, 40, 44]
SWA = [118, 110, 150, 170, 140, 110, 100, 108, 116, 122]
LA = [-40, -34, 10, 30, -10, -40, -66, -64, -56, -44]
LF = [-8, 0, 40, 60, 10, -40, -70, -66, -50, -12]
HEART = [1.0, 1.05, 1.1, 1.2, 1.3, 1.4, 1.7, 1.5, 1.2, 1.0]


def _attack(f):
    fx_, lift = FOOT[f]
    pose = merge(legs((STANCE_X["r"] + fx_ - 10, lift), (STANCE_X["l"], 0.0), (DX[f], LIFT + BOB[f])),
                 arms(RA[f], RF[f], SWA[f], LA[f], LF[f]), _glow(f), {
        "torso": dict(squash(Q[f]), r=TORSO[f]),
        "head": {"r": HEAD[f]},
        "crest": {"r": [0, 2, -4, -8, 4, 8, 12, 6, 0, 0][f]},
        "dust": {"show": f in (7, 8), "s": [0.7, 0.8, 1.0][min(2, max(0, f - 6))],
                 "x": -34.0, "z": [0, 3, 6][min(2, max(0, f - 6))]},
        "sparks": {"show": f in (6, 7), "x": -40.0, "z": -12.0, "s": 1.0 if f == 6 else 0.7},
        "heart": {"s": HEART[f]},
        "eyes": {"s": 1.3 if f in (3, 6) else 1.0},
    })
    if f in (6, 7):
        pose = _flare(pose) if f == 6 else pose
    return pose


def _attack_clip():
    foot = STANCE_X["r"] + 18.0
    ov = {
        4: [{"kind": "arc", "joint": "shield", "inner": (HAND["l"][0] + 12.0, HAND["l"][1] - 10.0, HAND["l"][2] + 8.0),
             "outer": (HAND["l"][0] + 30.0, HAND["l"][1] - 20.0, HAND["l"][2] + 30.0), "from": 3, "color": B.SAND_LT,
             "white": 0.3, "taper": 0.2, "lines": 3, "line_gap_lu": 4.0, "line_lu": 2.2, "outline_lu": 2.0}],
        5: [{"kind": "dust", "ground": (foot, 0.0), "size_lu": 8.0, "puffs": 3, "seed": 2, "spread": 0.6}],
        6: [{"kind": "dust", "ground": (foot - 30.0, 0.0), "size_lu": 12.0, "puffs": 3, "seed": 3, "spread": 0.8},
            {"kind": "dust", "ground": (foot + 26.0, 0.0), "size_lu": 12.0, "puffs": 3, "seed": 4, "spread": 0.8},
            {"kind": "burst", "joint": "root", "point": (foot, 0, 3.0), "r0_lu": 24.0, "r1_lu": 38.0,
             "n": 3, "a0": 4.0, "arc": 42.0},
            {"kind": "burst", "joint": "root", "point": (foot, 0, 3.0), "r0_lu": 24.0, "r1_lu": 38.0,
             "n": 3, "a0": 134.0, "arc": 42.0}],
        7: [{"kind": "dust", "ground": (foot - 38.0, 0.0), "size_lu": 14.0, "puffs": 3, "seed": 5, "spread": 0.9},
            {"kind": "dust", "ground": (foot + 34.0, 0.0), "size_lu": 14.0, "puffs": 3, "seed": 6, "spread": 0.9},
            {"kind": "burst", "joint": "root", "point": (foot, 0, 3.0), "r0_lu": 40.0, "r1_lu": 50.0,
             "n": 3, "a0": 4.0, "arc": 42.0},
            {"kind": "burst", "joint": "root", "point": (foot, 0, 3.0), "r0_lu": 40.0, "r1_lu": 50.0,
             "n": 3, "a0": 134.0, "arc": 42.0}],
    }
    return M.clip("attack", [_attack(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=M.HEAVY_MELEE_IMPACT,
                  smear=4, sequence=ATTACK_SEQ, overlays=ov)


# -- attack B: shield bash forward ---------------------------------------------------------------
# 0 = A shift, 1 = A dip, 2 coil, 3 HOLD (a low crouch, twisted back behind the shield, the shield
# drawn in to the chest, the sword held back), 4-5 the lunge (shield smear), 6 IMPACT (the shield
# rammed out at arm's length, a long lunge, sparks and a dust crescent), 7 shock, 8-9 = A's
#       coil  HOLD  sm1   sm2   IMP   shock
B_FOOT = [(14, 6), (8, 0), (24, 16), (40, 6), (46, 0), (46, 0)]
B_BACK = [-14, -18, -18, -16, -14, -14]
B_BOB = [-6, -12, -6, -8, -16, -14]
B_DX = [-4, -8, 0, 10, 16, 16]
B_TORSO = [8, 12, -4, -14, -20, -18]
B_TRZ = [16, 30, 10, -10, -18, -12]
B_LA = [-40, -55, -30, -20, -4, -6]         # shield arm (torso deg): drawn in low, then rammed out
B_LF = [-10, -20, -10, -10, -2, -4]
B_RA = [-110, -130, -100, -80, -70, -72]
B_RF = [-40, -60, -10, 20, 30, 32]
B_SW = [100, 80, 110, 130, 140, 136]


def _b(i):
    if i in (0, 1, 8, 9):
        return _attack(i)
    k = i - 2
    fx_, lift = B_FOOT[k]
    pose = merge(legs((STANCE_X["r"] + fx_ - 10, lift), (STANCE_X["l"] + B_BACK[k] + 12, 0.0),
                      (B_DX[k], LIFT + B_BOB[k])),
                 arms(B_RA[k], B_RF[k], B_SW[k], B_LA[k], B_LF[k]), _glow(f=i), {
        "torso": dict(squash([-0.02, -0.05, 0.02, 0.03, -0.09, -0.06][k]), r=B_TORSO[k], rz=B_TRZ[k]),
        "head": {"r": [2, 4, -2, -4, -6, -5][k]},
        "crest": {"r": [-2, -6, 6, 10, 12, 6][k]},
        "heart": {"s": [1.1, 1.2, 1.3, 1.4, 1.7, 1.5][k]},
        "eyes": {"s": 1.3 if k in (1, 4) else 1.0},
        "dust": {"show": k in (4, 5), "s": 0.9 if k == 4 else 1.2, "x": 30.0, "z": 0.0 if k == 4 else 4.0},
        "sparks": {"show": k == 4, "x": 6.0, "z": 60.0},
    })
    return _flare(pose) if k == 4 else pose


def _attack_b():
    sh = {"kind": "arc", "joint": "shield", "inner": (HAND["l"][0] + 12.0, HAND["l"][1] - 10.0, HAND["l"][2] + 8.0),
          "outer": (HAND["l"][0] + 30.0, HAND["l"][1] - 20.0, HAND["l"][2] + 30.0), "color": B.SAND_LT,
          "white": 0.3, "taper": 0.2, "lines": 3, "line_gap_lu": 4.0, "line_lu": 2.2, "outline_lu": 2.0}
    foot = STANCE_X["r"] + 36.0
    ov = {
        4: [dict(sh, **{"from": 3})],
        5: [dict(sh, **{"from": 3, "t0": 0.3})],
        6: [{"kind": "burst", "joint": "shield", "point": (HAND["l"][0] + 40.0, HAND["l"][1] - 20.0, HAND["l"][2] + 8.0),
             "r0_lu": 22.0, "r1_lu": 40.0, "n": 6, "a0": -70.0, "arc": 140.0},
            {"kind": "dust", "ground": (foot, 0.0), "size_lu": 12.0, "puffs": 4, "seed": 61, "spread": 0.9},
            {"kind": "dust", "ground": (-20.0, 0.0), "size_lu": 10.0, "puffs": 3, "seed": 62, "spread": 0.8}],
        7: [{"kind": "dust", "ground": (foot + 10.0, 0.0), "size_lu": 14.0, "puffs": 3, "seed": 63, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=M.HEAVY_MELEE_IMPACT,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


# -- attack C: overhead sword chop -------------------------------------------------------------------
# 2 rising, 3 HOLD (tall, up on the near toes, the sword raised high behind the head, the shield
# low and out for balance), 4-5 the chop (blade smear), 6 IMPACT (the sword chopped down in front, a
# deep crouch, sparks at the blade), 7 shock, 8-9 = A's
C_FOOT = [(12, 0), (12, 0), (20, 8), (30, 2), (32, 0), (32, 0)]
C_BOB = [2, 6, 0, -6, -14, -12]
C_DX = [-3, -5, 0, 6, 10, 10]
C_TORSO = [8, 14, -2, -16, -26, -24]
C_RA = [60, 110, 80, 10, -40, -44]           # sword arm (torso deg)
C_RF = [110, 150, 100, 20, -40, -44]
C_SW = [170, 200, 130, 40, -20, -26]
C_LA = [-60, -70, -50, -40, -50, -48]
C_LF = [-20, -30, -10, 0, -20, -18]


def _c(i):
    if i in (0, 1, 8, 9):
        return _attack(i)
    k = i - 2
    fx_, lift = C_FOOT[k]
    pose = merge(legs((STANCE_X["r"] + fx_ - 10, lift), (STANCE_X["l"] - 4, 0.0), (C_DX[k], LIFT + C_BOB[k])),
                 arms(C_RA[k], C_RF[k], C_SW[k], C_LA[k], C_LF[k]), _glow(f=i), {
        "torso": dict(squash([0.02, 0.05, 0.03, 0.0, -0.09, -0.06][k]), r=C_TORSO[k]),
        "head": {"r": [-2, -6, 0, 4, 8, 7][k]},
        "crest": {"r": [-4, -8, 4, 10, 12, 6][k]},
        "heart": {"s": [1.1, 1.25, 1.3, 1.4, 1.8, 1.5][k]},
        "eyes": {"s": 1.3 if k in (1, 4) else 1.0},
        "sparks": {"show": k == 4, "x": 40.0, "z": 0.0},
        "dust": {"show": k in (4, 5), "s": 0.8 if k == 4 else 1.1, "x": 10.0, "z": 0.0},
    })
    return _flare(pose) if k == 4 else pose


def _attack_c():
    blade = {"kind": "arc", "joint": "sword", "inner": (SW[0], SW[1], SW[2] + 30.0),
             "outer": (SW[0], SW[1], SW[2] + 13.0 + BLADE), "color": B.SAND_LT, "white": 0.3, "taper": 0.15,
             "lines": 3, "line_gap_lu": 4.0, "line_lu": 2.2, "outline_lu": 2.0}
    foot = STANCE_X["r"] + 40.0
    ov = {
        4: [dict(blade, **{"from": 3, "t1": 0.95})],
        5: [dict(blade, **{"from": 3, "t0": 0.35, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "sword", "point": (SW[0], SW[1], SW[2] + 13.0 + BLADE), "r0_lu": 18.0,
             "r1_lu": 34.0, "n": 6, "a0": 10.0, "arc": 160.0},
            {"kind": "dust", "ground": (foot + 20.0, 0.0), "size_lu": 12.0, "puffs": 4, "seed": 71, "spread": 0.9},
            {"kind": "dust", "ground": (foot - 40.0, 0.0), "size_lu": 9.0, "puffs": 3, "seed": 72, "spread": 0.8}],
        7: [{"kind": "dust", "ground": (foot + 26.0, 0.0), "size_lu": 14.0, "puffs": 3, "seed": 73, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_c", [_c(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=M.HEAVY_MELEE_IMPACT,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    # mech: a hard jolt back with no squash, every seam flashes white on the contact, the near
    # chest plate pops out and snaps back, the crest whips
    a = [1.0, 0.8, 0.35, -0.12, 0.0][k]
    pose = merge(stand(-2.0 * max(a, 0), -4.0 * a), REST, _glow(0), {
        "torso": {"r": 7 * a}, "head": {"r": 9 * a},
        "arm_r": {"r": 10 * a}, "arm_l": {"r": 8 * a},
        "heart": {"s": 1.0 + 0.7 * max(a, 0)},
        "crest": {"r": -10 * a},
    })
    if k <= 1:
        _flare(pose)
    if k in (1, 2):
        pose["plate_0"] = {"show": True, "x": 6.0 if k == 1 else 2.0, "y": -3.0, "z": 3.0 if k == 1 else 1.0,
                           "r": 18 if k == 1 else 6}
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
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150] * 6, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "heavy"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        Clip("die", 8, _die, sequence=DIE_SEQ, durations=DIE_MS, extra=_die_extra()),
    ]
    M.check_contract([c for c in cl if c.name != "die"], heavy=True)
    assert cl[-1].total_ms() == 1050
    return M.check_variants(cl)
