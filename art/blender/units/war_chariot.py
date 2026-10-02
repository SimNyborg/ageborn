"""War Chariot: Bronze Age heavy (A17.9), rider rig. Scythe Charge (first hit x2, knockback), ~110 lu.

Look (A17.12): a stocky chestnut horse (a deep chest, a tucked waist, round haunches, jointed
legs with knees, hocks, fetlock tufts and dark hooves, an arched neck with a dark mane, a
muzzle with a nostril) in a team breast collar and a team saddle cloth with a verdigris trim,
a team plume on the bridle, pulls a light two-wheeled chariot: a plum wickerwork car with a
big team side panel, sandstone rails and bronze studs, six-spoked wheels (a team spoke and a
rim stud mark the roll) with polished-bronze scythe blades on the hubs that spin with the
wheels, and a tall team swallowtail pennant on a pole at the back. The charioteer (face kit,
open-faced helmet with a team crest, linen cuirass) holds the reins in the far hand and a
bronze khopesh in the near hand.

Animation (cartoon kit v2; a viewer expects a war chariot to charge and slash as it passes):
  idle    the horse paws the ground and tosses its head, the driver shifts, blink
  walk    walk v3 (ANIM_SPEC G4/G6): the horse trots at the ground speed with planted hooves
          (diagonal pairs, legs solved by IK), the car bounces a frame late, the 4-spoke wheels roll
          exactly 2 spoke spacings per cycle (no strobe), the driver posts and the pennant whips
  attack_b  REAR AND CHOP: the horse rears and strikes down with its forehooves while the driver
          chops overhead
  attack_c  FISHTAIL SWEEP: the car swings out sideways, then whips round so the scythed hubs
          sweep the ground (ring smears, sparks) and the khopesh slashes flat
  attack  DRIVE-BY SCYTHE CHARGE: the horse gathers on its haunches and the driver cocks the
          khopesh high behind his head (the held extreme), the horse lunges, the car fishtails
          (hull tilt), the scythed hubs whirl (ring smears) and the driver slashes down and
          through (two smear frames); impact with sparks off the scythes, dust from the
          wheels, the horse's head thrown forward
  hit     vehicle: the car bounces on its axle, the driver ducks, the pennant whips
  die     D7 wreck: the horse stumbles onto its knees, the car tips onto its side and the
          driver is thrown (X eyes)
"""
import math

from ageborn_art import face as F
from ageborn_art import gait as GT
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art import rigs_gunpowder as G
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "war_chariot"
# planted hooves: the runtime frame-locks the body like a rider's mount (ANIM_SPEC R2); the wheels turn
# exactly one frame's advance per frame, so they stay consistent with the lock
GAIT_NAME = "rider"
NAME = "War Chariot"
HEIGHT_LU = 110
YAW_DEG = -10.0
CANVAS = (470, 300)
FEET = (250, 276)
ANCHORS = {"head": (-10, 104), "hitCenter": (0, 42)}
NO_RETIME = True

COAT = "#7C604B"          # chestnut, held at ~39% saturation (the A11 colour rule)
COAT_DK = "#634D3C"
MANE = "#2A211D"
HOOF = "#4A4038"

HX = 26.0                    # the horse is this far ahead of the unit origin
AX = -32.0                   # the chariot axle
WHEEL_R = 15.0            # 4 spokes; 2 spoke spacings (180 deg, 47 lu of rim) per 576 ms walk cycle
FLOOR_Z = 20.0
DRIVER = (-30.0, 0.0, 18.0)  # pose offset of the driver's skeleton (feet on the car floor)
HR = (0.0, G.ARM_Y["r"], G.HAND_Z)
BLADE = 22.0


LEGS = {}


def _leg(rig, name, x, y, z_top, front):
    """A jointed leg: forearm to the knee (front) or gaskin back to the hock (hind), then the
    cannon to the fetlock (a dark tuft), a pastern and a dark hoof with a lighter sole."""
    rig.joint(name, "horse", (x, y, z_top))
    kx = x + (1.2 if front else -4.5)
    kz = 18.0 if front else 19.0
    rig.joint(f"{name}2", name, (kx, y, kz))
    fx_ = kx + (0.6 if front else 1.8)
    g = Geo().capsule((x, y, z_top), (kx, y, kz), 6.8 if not front else 6.0, 3.6)
    rig.part(name, g, COAT)
    g = Geo().blob((kx, y, kz), (3.8, 3.4, 3.4), p=2.2)                          # knee / hock
    g.capsule((kx, y, kz), (fx_, y, 6.2), 3.0, 2.7)
    rig.part(f"{name}2", g, COAT)
    g = Geo().blob((fx_ + 0.4, y, 5.6), (3.3, 3.1, 2.8), p=2.2)                 # fetlock tuft
    g.lathe([(2.4, 0), (0, 3.0)], (fx_ - 0.6, y, 5.0), (fx_ - 3.0, y, 3.4), segs=8)
    rig.part(f"{name}2", g, MANE, finish="hair", outline=0.8)
    g = Geo().blob((fx_ + 1.5, y, 2.2), (4.6, 4.0, 2.5), p=3.0, taper=(1.08, 0.82))
    rig.part(f"{name}2", g, HOOF)
    key = name[4:]
    LEGS[key] = GT.Leg(name, f"{name}2", (fx_ + 1.5, y, 0.6), bend=1.0 if front else -1.0)
    rig.track(f"_foot_{key}", f"{name}2", (fx_ + 1.5, y, 0.4))


def _horse(rig):
    rig.joint("horse", "unit", (HX, 0, 38))
    _leg(rig, "leg_fl", HX + 15, 6.0, 34, True)
    _leg(rig, "leg_bl", HX - 15, 6.0, 36, False)
    _leg(rig, "leg_fr", HX + 15, -6.0, 34, True)
    _leg(rig, "leg_br", HX - 15, -6.0, 36, False)
    # a deep chest, a tucked waist and round haunches (not a box)
    g = Geo().blob((HX, 0, 39.5), (21, 10.2, 9.6), p=2.3)
    g.blob((HX + 12.5, 0, 38.0), (11.5, 10.8, 12.8), p=2.3)                   # chest
    g.blob((HX - 12.5, 0, 40.5), (12.5, 11.0, 11.8), p=2.3)                   # haunch
    rig.part("horse", g, COAT)
    g = Geo().blob((HX - 1, 0, 46.5), (13.5, 11.6, 6.0), p=2.8)        # team saddle cloth over the back
    g.clip((0, 0, 40.0), (0, 0, -1))
    rig.part("horse", g, team=True, outline=0.8)
    g = Geo().blob((HX - 1, 0, 40.2), (14.0, 12.0, 1.1), p=3.2)        # verdigris trim on the cloth
    rig.part("horse", g, B.VERD, outline=0.5)
    # a team caparison panel hanging on the near flank, with a verdigris hem and bronze studs
    g = Geo().slab([(HX - 12, 45.0), (HX + 10, 45.0), (HX + 12, 36.0), (HX + 6, 33.0), (HX - 1, 35.5),
                    (HX - 8, 33.0), (HX - 14, 36.0)], -11.2, 1.4)
    rig.part("horse", g, team=True, outline=0.8)
    g = Geo()
    for (x0, z0), (x1, z1) in (((HX + 12, 36.0), (HX + 6, 33.0)), ((HX + 6, 33.0), (HX - 1, 35.5)),
                               ((HX - 1, 35.5), (HX - 8, 33.0)), ((HX - 8, 33.0), (HX - 14, 36.0))):
        g.capsule((x0, -12.2, z0), (x1, -12.2, z1), 0.9)
    rig.part("horse", g, B.VERD, outline=0.4)
    g = Geo().capsule((HX + 3, -10.8, 49.0), (HX + 3, -11.4, 33.0), 1.0)     # girth strap
    rig.part("horse", g, B.LEATHER_DK, outline=0.4)
    # neck, head (1.2x), mane, team breast collar
    rig.joint("neck", "horse", (HX + 19, 0, 46))
    rig.joint("hhead", "neck", (HX + 29, 0, 62), scale=1.2)
    g = Geo().capsule((HX + 18, 0, 43), (HX + 28, 0, 60), 8.6, 6.6)
    rig.part("neck", g, COAT)
    g = Geo()
    for i in range(6):
        t = i / 5
        g.blob((HX + 14 + 11 * t, 0, 53 + 13 * t), (4.6, 3.0, 4.6), p=2.2, rot=(0, -35, 0))
    g.blob((HX + 27, 0, 68.5), (3.4, 2.6, 4.2), p=2.2)                  # forelock tuft
    rig.part("neck", g, MANE, finish="hair")
    g = Geo().capsule((HX + 17, -9.0, 48.0), (HX + 27, 0.0, 41.0), 2.8)
    g.capsule((HX + 27, 0.0, 41.0), (HX + 17, 9.0, 48.0), 2.8)
    rig.part("neck", g, team=True, outline=0.8)
    g = Geo()
    for i in range(3):
        g.sphere((HX + 20 + 2.8 * i, -8.2 + 2.8 * i, 46.2 - 1.6 * i), 1.1, cuts=2)
    rig.part("neck", g, B.BRONZE_HI, finish=B.POLISH, outline=0.5)
    g = Geo().blob((HX + 35, 0, 59), (11.5, 6.0, 6.8), p=2.4, rot=(0, 40, 0))
    g.blob((HX + 42.4, 0, 51.6), (6.2, 5.6, 5.4), p=2.2)
    g.blob((HX + 33.0, 0, 55.2), (5.4, 5.8, 4.8), p=2.2)                      # cheek
    for y in (-3.2, 3.2):
        g.lathe([(2.0, 0), (1.5, 2.8), (0, 6.0)], (HX + 27.5, y, 66), (HX + 26.5, y * 1.3, 73), segs=10)
    rig.part("hhead", g, COAT)
    g = Geo().blob((HX + 31.8, -4.9, 61.8), (1.9, 1.3, 2.2))
    rig.part("hhead", g, B.EYE, highlight=False, outline=0.8)
    g = Geo().sphere((HX + 32.6, -5.9, 61.6), 1.2, cuts=3)
    g.blob((HX + 46.2, -3.6, 52.6), (1.5, 1.0, 1.1), p=2.2)                    # nostril
    g.capsule((HX + 41.0, -5.2, 48.6), (HX + 47.0, -3.6, 49.4), 0.55)          # lip line
    rig.part("hhead", g, B.PUPIL, outline=0)
    g = Geo().capsule((HX + 30.4, -5.6, 64.6), (HX + 33.6, -5.8, 63.8), 0.8)   # brow over the eye
    rig.part("hhead", g, COAT_DK, outline=0.3)
    g = Geo().capsule((HX + 28.0, -5.6, 64.0), (HX + 43.6, -5.0, 53.0), 0.9)   # bridle
    g.capsule((HX + 36.0, -5.8, 63.0), (HX + 33.0, -6.0, 52.0), 0.9)
    rig.part("hhead", g, B.LEATHER_DK, outline=0.4)
    rig.secondary("hplume", "hhead", (HX + 27.0, 0, 70.0), (HX + 18.0, 0, 79.0), max_deg=14, gain=1.1)
    g = Geo()
    for x, z, r in ((HX + 27.0, 72.0, 2.6), (HX + 24.5, 75.0, 3.0), (HX + 21.5, 77.0, 2.8), (HX + 18.5, 77.6, 2.2)):
        g.blob((x, 0, z), (r * 1.1, r * 0.8, r), p=2.1)
    rig.part("hplume", g, team=True)
    rig.secondary("tail", "horse", (HX - 23, 0, 45), (HX - 29, 0, 30), max_deg=15, gain=1.0)
    g = Geo().capsule((HX - 23, 0, 45), (HX - 28, 0, 39), 2.4, 2.8).capsule((HX - 28, 0, 39), (HX - 29, 0, 30), 2.8, 1.2)
    rig.part("tail", g, MANE, finish="hair")


def _marker(rig, joint, y):
    """One team-painted spoke and a bronze rim stud, so the roll reads (6 spokes alias)."""
    cx, cz = AX, WHEEL_R
    g = Geo().capsule((cx + 3.2, y - 0.8, cz), (cx + WHEEL_R - 4.0, y - 0.8, cz), 1.5, 1.2)
    rig.part(joint, g, team=True, outline=0.5)
    g = Geo().sphere((cx + WHEEL_R - 1.0, y - 1.8, cz), 1.9, cuts=3)
    rig.part(joint, g, B.BRONZE_HI, finish=B.POLISH, outline=0.5)


def _car(rig):
    rig.joint("cart", "unit", (AX, 0, WHEEL_R))
    rig.joint("wheel_l", "cart", (AX, 12.0, WHEEL_R))
    rig.joint("wheel_r", "cart", (AX, -12.0, WHEEL_R))
    G.wheel(rig, "wheel_l", (AX, 12.0, WHEEL_R), WHEEL_R, 3.0, rim=B.WOOD_DK, spokes=B.WOOD, hub=B.AGED,
            team_felloe=False, n_spokes=4)
    _marker(rig, "wheel_l", 12.0)
    # draught pole from the car floor up to the yoke on the horse, and the traces
    g = Geo().capsule((AX + 14, 0, FLOOR_Z), (HX - 6, 0, 36.0), 1.6).capsule((HX - 6, 0, 36.0), (HX + 2, 0, 49.0), 1.6)
    rig.part("cart", g, B.WOOD_DK, outline=0.6)
    g = Geo().capsule((HX - 4, -12.0, 49.5), (HX - 4, 12.0, 49.5), 1.4)     # yoke
    rig.part("cart", g, B.WOOD, outline=0.6)
    # the car: floor, plum wicker body, team side panel, sandstone rails and bronze studs
    g = Geo().blob((AX + 1, 0, FLOOR_Z), (17, 12, 2.0), p=4.0)
    rig.part("cart", g, B.WOOD_DK)
    g = Geo().blob((AX + 1, 0, FLOOR_Z - 1.6), (16.4, 11.4, 1.6), p=4.0)   # team-painted underside
    rig.part("cart", g, team=True, outline=0.6)
    g = Geo().blob((AX + 3, 0, FLOOR_Z + 10.5), (14.5, 11.8, 10.0), p=3.0, taper=(1.0, 0.9), shift=(0.25, 0))
    g.clip((AX - 12, 0, 0), (-1, 0, 0))
    rig.part("cart", g, B.PLUM)
    g = Geo().slab([(AX - 9, FLOOR_Z + 1.5), (AX + 13, FLOOR_Z + 1.5), (AX + 18, FLOOR_Z + 18.0),
                    (AX + 10, FLOOR_Z + 20.0), (AX - 9, FLOOR_Z + 15.0)], -12.4, 1.4)
    rig.part("cart", g, team=True, outline=0.8)
    g = Geo().capsule((AX - 11, -12.8, FLOOR_Z + 16.2), (AX + 10, -12.8, FLOOR_Z + 21.2), 1.3)
    g.capsule((AX + 10, -12.8, FLOOR_Z + 21.2), (AX + 18.5, -4.0, FLOOR_Z + 19.0), 1.3)
    g.capsule((AX + 18.5, -4.0, FLOOR_Z + 19.0), (AX + 18.5, 8.0, FLOOR_Z + 19.0), 1.3)
    g.capsule((AX - 11, -12.8, FLOOR_Z + 16.2), (AX - 11, -12.8, FLOOR_Z + 1.0), 1.2)
    rig.part("cart", g, B.SAND, outline=0.6)
    g = Geo()
    for x, z in ((AX - 5, FLOOR_Z + 8), (AX + 3, FLOOR_Z + 8), (AX + 11, FLOOR_Z + 9)):
        g.sphere((x, -13.4, z), 1.2, cuts=2)
    rig.part("cart", g, B.BRONZE_HI, finish=B.POLISH, outline=0.5)
    # team pennant on a tall pole at the back of the car
    px, py = AX - 11.0, 6.0
    g = Geo().capsule((px, py, FLOOR_Z), (px - 1.0, py, 106.0), 1.1)
    rig.part("cart", g, B.WOOD_DK, outline=0.6)
    g = Geo().sphere((px - 1.0, py, 107.6), 1.8, cuts=3)
    rig.part("cart", g, B.BRONZE, finish=B.POLISH, outline=0.5)
    rig.secondary("pennant", "cart", (px - 1.0, py - 0.6, 104.0), (px - 22.0, py - 0.6, 99.0), max_deg=14,
                  gain=1.2)
    pts = [(0.0, 0.0), (-22.0, -1.8), (-15.5, -6.0), (-22.0, -10.6), (0.0, -11.4)]
    g = Geo().slab([(px - 1.0 + x, 104.5 + z) for x, z in pts], py - 0.6, 1.4)
    rig.part("pennant", g, team=True, outline=0.8)
    # near wheel and the scythe blades on the hubs
    G.wheel(rig, "wheel_r", (AX, -12.0, WHEEL_R), WHEEL_R, 3.0, rim=B.WOOD_DK, spokes=B.WOOD, hub=B.AGED,
            team_felloe=False, n_spokes=4)
    _marker(rig, "wheel_r", -12.0)
    # the scythed hubs: curved polished-bronze blades on the axle ends; they spin with the wheels
    for jn, y in (("scy_r", -19.5), ("scy_l", 17.5)):
        rig.joint(jn, "cart", (AX, y, WHEEL_R))
        g = Geo()
        for sgn in (1, -1):
            pts = [(AX, WHEEL_R + 1.4), (AX - 9, WHEEL_R + 2.6), (AX - 18, WHEEL_R + 1.0), (AX - 24, WHEEL_R - 3.5),
                   (AX - 17, WHEEL_R - 0.8), (AX - 9, WHEEL_R - 0.4), (AX, WHEEL_R - 1.4)]
            if sgn < 0:
                pts = [(2 * AX - x, 2 * WHEEL_R - z) for x, z in pts]
            g.slab(pts, y, 1.2)
        rig.part(jn, g, B.BRONZE, finish=B.POLISH, outline=0.6)
        if jn == "scy_r":
            g = Geo().capsule((AX - 9, -20.3, WHEEL_R + 2.2), (AX - 22, -20.3, WHEEL_R - 2.4), 0.5)
            g.capsule((AX + 9, -20.3, WHEEL_R - 2.2), (AX + 22, -20.3, WHEEL_R + 2.4), 0.5)
            rig.part(jn, g, B.SAND_LT, outline=0)
    B.sparks(rig, "cart", (AX - 20.0, -22.0, 4.0), size=1.6, name="sparks", seed=2)
    B.dust_puff(rig, "unit", (AX - 20.0, -8.0, 3.0), size=1.2, name="dust")


def _driver(rig):
    rig.joint("driver", "cart", (0, 0, 0))
    G.skeleton(rig, parent="driver")
    g = Geo().blob((0.4, 0, 16.0), (10.0, 9.4, 6.0), p=2.4)             # (hidden in the car)
    rig.part("hips", g, B.PLUM)
    B.cuirass(rig, B.LINEN, trim=B.VERD, z=28.5)
    for s, y in (("r", -12.0), ("l", 11.5)):
        g = Geo().blob((0.4, y, 37.0), (6.2, 5.4, 4.6), p=2.6)
        rig.part(f"arm_{s}", g, B.LINEN)
    beard = Geo()
    for x, y, z, r in ((11.6, -3.0, 40.6, 2.4), (12.6, 0.0, 39.8, 2.6), (11.6, 3.0, 40.6, 2.2)):
        beard.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    B.face_kit(rig, cx=13.4, cz=50.0, eye_r=(3.8, 3.4, 4.5), extra=[beard], mouth_z=44.8, mouth_w=4.8)
    rig.part("head", beard, B.HAIR, finish="hair")
    B.helmet(rig, crest_len=18.0, crest_h=8.0)
    for s in ("r", "l"):
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.0, r1=3.6)
    # reins from the far fist toward the horse's mouth (a short visible run)
    g = Geo().capsule((0.5, G.ARM_Y["l"], G.HAND_Z), (22.0, G.ARM_Y["l"] - 2, G.HAND_Z - 3.0), 0.6)
    rig.part("hand_l", g, B.LEATHER_DK, outline=0.3)
    # the khopesh in the near fist, modelled pointing up: a grip, a straight neck and the hook
    x, y, z = HR
    rig.joint("khopesh", "hand_r", HR)
    g = Geo().capsule((x, y - 1.0, z - 4.0), (x, y - 1.0, z + 3.5), 1.5)
    g.sphere((x, y - 1.0, z - 5.0), 1.9, cuts=3)
    rig.part("khopesh", g, B.WOOD_DK, outline=0.6)
    pts = [(x - 1.2, z + 3.5), (x + 1.2, z + 3.5), (x + 1.4, z + 11.0), (x + 4.5, z + 15.0), (x + 9.5, z + 18.0),
           (x + 12.5, z + 22.5), (x + 11.5, z + 25.0), (x + 7.0, z + 22.5), (x + 2.5, z + 19.0), (x - 1.2, z + 12.5)]
    g = Geo().slab(pts, y - 1.0, 1.6)
    rig.part("khopesh", g, B.AGED, finish="metal", outline=0.7)
    g = Geo().capsule((x + 1.8, y - 2.0, z + 11.2), (x + 5.0, y - 2.0, z + 15.2), 0.6)
    g.capsule((x + 5.0, y - 2.0, z + 15.2), (x + 11.6, y - 2.0, z + 21.4), 0.6)
    rig.part("khopesh", g, B.SAND_LT, outline=0)
    rig.track("bladeTip", "khopesh", (x + 12.0, y - 1.0, z + 24.0))
    rig.part("hand_r", Geo().blob((0.3, G.ARM_Y["r"], G.HAND_Z + 3.2), (4.3, 4.3, 1.7), p=2.6), B.LEATHER,
             outline=0.6)


def build(rig):
    global RIG
    RIG = rig
    LEGS.clear()
    rig.joint("unit", "root", (0, 0, 0))
    _horse(rig)
    _car(rig)
    _driver(rig)


# -- poses ---------------------------------------------------------------------------------
def khopesh(a, f, w):
    return G.arm("r", a, f, w, w_rest=90.0)


def reins(a=-30, f=-10):
    return G.arm("l", a, f)


DRV = {"driver": {"x": DRIVER[0], "z": DRIVER[2]}}
STANCE = merge(DRV, khopesh(-30, 40, 70), reins(), {"torso": {"r": -4}})


def car(dx=0.0, dz=0.0, tilt=0.0, spin=0.0):
    return {"cart": {"x": dx, "z": dz, "r": tilt}, "wheel_r": {"r": -spin}, "wheel_l": {"r": -spin},
            "scy_r": {"r": -spin}, "scy_l": {"r": -spin}}


def _idle(f):
    # 6 poses x 150 ms: the horse paws the ground (the near foreleg lifts, scrapes back on 3)
    # and tosses its head; the driver breathes and blinks
    c = math.cos(2 * math.pi * f / 6)
    lag = math.cos(2 * math.pi * (f - 1) / 6)
    paw = [0.0, 0.6, 1.0, 0.3, 0.0, 0.0][f]
    pose = merge(STANCE, car(tilt=0.3 * c), {
        "horse": {"z": 1.0 * c}, "neck": {"r": -3.0 * lag + 6 * paw}, "hhead": {"r": 2.5 * lag - 5 * paw},
        "leg_fr": {"r": 30 * paw - 8 * (f == 3)}, "leg_fr2": {"r": -55 * paw},
        "leg_br": {"r": -1.0 * c},
        "hips": {"z": 0.8 * c}, "torso": {"r": 1.0 * c}, "head": {"r": -2.0 * lag},
        "arm_r": {"r": 2 * lag}, "hand_r": {"r": -3 * lag},
    })
    if f == 4:
        pose = merge(pose, F.expr("blink"))
    return pose


# -- walk v3: trot at ground speed (card 65 x 1.25 = 81.25 lu/s), 8 x 72 ms -----------------------
# the 4-spoke wheels (r 15 lu, 94 lu of rim) turn 22.5 degrees a frame: 2 spoke spacings (47 lu of
# rim) per 576 ms cycle = 82 lu/s in character space = the ground speed (yaw 10 degrees)
RIG = None
SPEED = 81.25
WALK_N, WALK_CYCLE = 8, 576
SPIN_PER_FRAME = 22.5
GAIT = None


def _gait():
    global GAIT
    if GAIT is None:
        GAIT = GT.Gait(WALK_N, WALK_CYCLE, SPEED, GT.quad_feet(LEGS, GT.TROT,
                                                              x_off={"fr": 2.0, "fl": 2.0, "br": -1.0, "bl": -1.0}),
                       0.42, lift=7.0, kick=2.0, reach=2.5, toe_off=0.0, heel_strike=0.0)
    return GAIT


def _walk(f, report=None):
    g = _gait()
    p = 2 * math.pi * f / WALK_N

    def extra(ctx):
        # the car rides a frame late on the pole, the driver posts (60-80% of the bob, a frame late)
        lag_z = -ctx["bob"] * math.cos(2 * (2 * math.pi * (f - 1) / WALK_N - ctx["low"]))
        nod = math.cos(2 * (p - ctx["low"]))
        return merge(STANCE, car(dz=0.9 * lag_z, tilt=0.8 * lag_z, spin=SPIN_PER_FRAME * f), {
            "neck": {"r": -5.0 * nod - 3.0}, "hhead": {"r": 3.0 * nod},
            "tail": {"r": 6 * math.sin(p)},
            "hips": {"z": 0.7 * lag_z}, "torso": {"r": -2.0 - 1.0 * lag_z},
            "arm_r": {"r": 3.0 * lag_z}, "hand_r": {"r": 3.0 * lag_z}, "arm_l": {"r": -2.0 * lag_z},
            "head": {"r": 1.5 * lag_z},
        })
    return GT.quad_walk(RIG, f, g, {}, trunk="horse", base_z=-2.6, bob=2.0, beats=2, pitch=1.6, roll=1.2,
                        extra=extra, report=report)


def _hooves(pose, fr=None, fl=None, br=None, bl=None):
    """Hooves placed by IK: (x, lift) in character space per leg (None keeps the leg's FK pose)."""
    tg = {}
    for k, v in (("fr", fr), ("fl", fl), ("br", br), ("bl", bl)):
        if v is not None:
            tg[k] = (LEGS[k], v[0], LEGS[k].end.z + v[1], 0.0)
    return GT.solve(RIG, pose, tg) if tg else pose


# 10 unique frames in the 12 heavy steps (moves.HEAVY_MELEE_MS; impact on step 6)
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#          shift gath  coil  HOLD  sm1  sm2  IMP  shock foll  rec
A_FWD = [-1, -3, -5, -6, 2, 8, 13, 12, 7, 2]
A_TILT = [0, -1, -2, -3, 2, 4, 5, 3, 1, 0]
A_YAW = [0, 0, 0, 0, 4, 8, 6, 2, -2, 0]
A_SPIN = [0, -8, -14, -16, 30, 110, 210, 280, 320, 340]
A_HR = [2, 6, 11, 14, 4, -4, -8, -6, -2, 0]
A_HZ = [0, 1, 2.5, 3.5, 1, -1, -2, -1, 0, 0]
L_FR = [8, 24, 36, 42, 10, -16, -26, -18, -6, 0]
L_FR2 = [-18, -50, -72, -80, -40, -6, 0, 0, 0, 0]
L_FL = [4, 16, 28, 34, 26, 16, 18, 10, 2, 0]
L_FL2 = [-12, -40, -58, -64, -50, -36, -28, -14, -4, 0]
L_BR = [4, 8, 12, 14, -4, -18, -26, -16, -6, 0]
L_BR2 = [0, 10, 18, 22, 10, 4, 0, 0, 0, 0]
L_BL = [2, 6, 10, 12, -2, -10, -16, -10, -4, 0]
L_BL2 = [0, 8, 14, 18, 8, 2, 0, 0, 0, 0]
A_NECK = [3, 8, 13, 16, 2, -4, -8, -6, -3, -1]
A_HH = [-2, -6, -9, -10, -2, 2, 4, 3, 2, 1]
A_Q = [-0.02, -0.06, 0.03, 0.06, 0.04, 0.02, -0.1, -0.06, -0.02, 0.0]
D_T = [4, 10, 16, 20, 0, -12, -22, -20, -12, -6]
D_H = [2, 4, 6, 6, 0, -4, -8, -6, -3, -1]
# khopesh arm in WORLD degrees (upper arm, forearm, blade); the driver's torso lean is subtracted
K_A = [20, 70, 120, 140, 90, 30, -20, -30, -30, -30]
K_F = [80, 120, 160, 175, 90, 20, -20, -10, 20, 40]
K_W = [90, 140, 175, 190, 110, 20, -30, -40, 20, 70]
R_A = [-30, -34, -38, -40, -24, -16, -10, -14, -24, -30]
R_F = [-10, -14, -18, -20, -4, 4, 6, 2, -6, -10]


def _attack(f):
    t = D_T[f]
    fwd = A_FWD[f]
    pose = merge(DRV, car(fwd * 0.9, 0, A_TILT[f], A_SPIN[f]), {
        "cart": {"rz": A_YAW[f]},
        "unit": dict(squash(A_Q[f]), x=fwd * 0.1),
        "horse": {"x": fwd, "r": A_HR[f], "z": A_HZ[f]},
        "leg_fr": {"r": L_FR[f]}, "leg_fr2": {"r": L_FR2[f]},
        "leg_fl": {"r": L_FL[f]}, "leg_fl2": {"r": L_FL2[f]},
        "leg_br": {"r": L_BR[f]}, "leg_br2": {"r": L_BR2[f]},
        "leg_bl": {"r": L_BL[f]}, "leg_bl2": {"r": L_BL2[f]},
        "neck": {"r": A_NECK[f]}, "hhead": {"r": A_HH[f]},
        "torso": {"r": t}, "head": {"r": D_H[f]},
        "hips": {"x": fwd * 0.3},
        "sparks": {"show": f in (6, 7), "s": 1.0 if f == 6 else 0.7},
        "dust": {"show": f in (6, 7, 8), "s": [0.8, 1.15, 1.35][min(2, max(0, f - 6))],
                 "z": [0, 2, 4][min(2, max(0, f - 6))]},
    }, khopesh(K_A[f] - t, K_F[f] - t, K_W[f] - t), reins(R_A[f] - t, R_F[f] - t))
    if f in (4, 5):
        pose.setdefault("khopesh", {})["sz"] = 1.2
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


BLADE_IN = (HR[0] + 3.0, HR[1] - 1.0, HR[2] + 12.0)
BLADE_OUT = (HR[0] + 12.0, HR[1] - 1.0, HR[2] + 24.0)


def _attack_clip():
    blade = {"kind": "arc", "joint": "khopesh", "inner": BLADE_IN, "outer": BLADE_OUT, "color": B.SAND_LT,
             "white": 0.3, "taper": 0.15, "lines": 3}
    ring = {"kind": "arc", "joint": "scy_r", "inner": (AX, -20.0, WHEEL_R), "outer": (AX - 24.0, -20.0, WHEEL_R - 3.5),
            "color": B.SAND_LT, "white": 0.3, "taper": 0.3, "band": 0.4, "lines": 2, "samples": 20}
    ov = {
        4: [dict(blade, **{"from": 3, "t1": 0.95})],
        5: [dict(blade, **{"from": 3, "t0": 0.3, "t1": 0.95}), dict(ring, **{"from": 4, "t1": 1.0})],
        6: [dict(ring, **{"from": 5, "t1": 1.0}),
            {"kind": "burst", "joint": "khopesh", "point": BLADE_OUT, "r0_lu": 7.0, "r1_lu": 14.0, "n": 5,
             "a0": -80.0, "arc": 140.0},
            {"kind": "dust", "ground": (AX - 6.0, 0.0), "size_lu": 9.0, "puffs": 5, "seed": 3, "spread": 1.1},
            {"kind": "dust", "ground": (HX + 18.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 6, "spread": 0.9}],
        7: [dict(ring, **{"from": 6, "t1": 1.0, "lines": 1})],
    }
    return M.clip("attack", [_attack(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=M.HEAVY_MELEE_IMPACT,
                  smear=4, sequence=ATTACK_SEQ, overlays=ov)


# -- attack B: the horse rears and strikes with its forehooves, the driver chops overhead ----------
# 0 = A shift, 1 = A gather, 2 rising, 3 HOLD (reared up on the hind legs, forelegs folded high, the
# khopesh raised over the driver's head), 4 smear, 5 smear, 6 IMPACT (the forehooves slam down, the
# chop lands, dust), 7 shock, 8-9 = A follow and recover
HIND = (HX - 15 - 4.5 + 1.8 + 1.5, 0.0)       # hind hoof x (the rear's pivot on the ground)
B_REAR = [18, 40, 26, 6, -3, -1]               # horse pitch (deg), about the hind hooves
B_FX = [4, 6, 8, 10, 12, 12]                    # forehooves reach forward (lu)
B_FL = [18, 30, 22, 8, 0, 0]                    # forehoof lift (lu)
B_CT = [3, 7, 4, 1, -1, 0]                      # the car tips up with the pole
B_KA = [80, 120, 80, 20, -30, -35]              # khopesh arm, world deg
B_KF = [130, 165, 90, 10, -40, -40]
B_KW = [140, 175, 100, 10, -50, -55]
B_DT = [6, 10, 0, -14, -24, -22]
B_Q = [0.02, 0.05, 0.04, 0.0, -0.10, -0.06]


def _b_pose(i):
    if i in (0, 1, 8, 9):
        return _attack(i)
    k = i - 2
    rear = B_REAR[k]
    off = M.about((HIND[0] - HX, 0.0, -38.0), r=rear)
    t = B_DT[k]
    pose = merge(DRV, car(0.0, 0.0, B_CT[k], [10, 20, 60, 120, 170, 190][k]), {
        "unit": dict(squash(B_Q[k])),
        "horse": {"r": rear, "x": off["x"], "z": off["z"]},
        "neck": {"r": [10, 16, 6, -4, -10, -6][k]}, "hhead": {"r": [-8, -14, -4, 4, 8, 4][k]},
        "torso": {"r": t}, "head": {"r": [-4, -8, 0, 6, 8, 6][k]},
        "sparks": {"show": False},
        "dust": {"show": k in (4, 5), "s": 1.0 if k == 4 else 1.3, "x": HX + 34.0, "z": 0.0 if k == 4 else 2.0},
    }, khopesh(B_KA[k] - t, B_KF[k] - t, B_KW[k] - t), reins(-40 - t, -20 - t))
    fx = LEGS["fr"].end.x + B_FX[k]
    pose = _hooves(pose, fr=(fx, B_FL[k]), fl=(fx - 3.0, B_FL[k] * 0.85),
                   br=(LEGS["br"].end.x + 1.0, 0.0), bl=(LEGS["bl"].end.x + 1.0, 0.0))
    if k in (2, 3):
        pose.setdefault("khopesh", {})["sz"] = 1.2
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_b():
    blade = {"kind": "arc", "joint": "khopesh", "inner": BLADE_IN, "outer": BLADE_OUT, "color": B.SAND_LT,
             "white": 0.3, "taper": 0.15, "lines": 3}
    ov = {
        4: [dict(blade, **{"from": 3, "t1": 0.95})],
        5: [dict(blade, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [{"kind": "burst", "joint": "khopesh", "point": BLADE_OUT, "r0_lu": 7.0, "r1_lu": 14.0, "n": 5,
             "a0": -100.0, "arc": 140.0},
            {"kind": "dust", "ground": (HX + 22.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 31, "spread": 1.1},
            {"kind": "burst", "joint": "root", "point": (HX + 22.0, 0, 2.0), "r0_lu": 10.0, "r1_lu": 18.0,
             "n": 4, "a0": 10.0, "arc": 160.0}],
        7: [{"kind": "dust", "ground": (HX + 26.0, 0.0), "size_lu": 12.0, "puffs": 4, "seed": 32, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=M.HEAVY_MELEE_IMPACT,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


# -- attack C: fishtail scythe sweep ---------------------------------------------------------------
# 2 the car swings out, 3 HOLD (the car slewed sideways toward the camera, tilted on one wheel, the
# driver braced low with the khopesh drawn back flat), 4-5 the car whips round (ring smears on the
# scythed hubs), 6 IMPACT (the car straight, the hub scythes and the flat slash land: sparks, dust),
# 7 shock, 8-9 = A follow and recover
C_YAW = [20, 44, 16, -8, -12, -4]               # the car slews (cart rz)
C_TILT = [2, 5, 2, -1, -2, -1]
C_RX = [-10, -26, -10, 2, 4, 1]                   # up on the near wheel
C_SPIN = [20, 40, 120, 220, 290, 320]
C_HX = [0, 2, 4, 6, 7, 6]
C_KA = [-40, -60, -10, -5, -20, -24]            # khopesh arm: drawn back flat, then a flat slash
C_KF = [-60, -90, -20, 0, -10, -14]
C_KW = [170, 180, 60, 0, -10, -14]
C_KRZ = [40, 70, 20, -10, -30, -20]
C_DT = [-14, -26, -4, -12, -18, -16]


def _c_pose(i):
    if i in (0, 1, 8, 9):
        return _attack(i)
    k = i - 2
    t = C_DT[k]
    pose = merge(DRV, car(-2.0, 0.0, C_TILT[k], C_SPIN[k]), {
        "cart": {"rz": C_YAW[k], "rx": C_RX[k]},
        "unit": dict(squash([-0.04, -0.06, 0.04, 0.02, -0.08, -0.04][k])),
        "horse": {"x": C_HX[k], "z": [-1, -2.5, -1, 0, -1.5, -1][k], "r": [-2, -4, 0, 2, -2, -1][k]},
        "neck": {"r": [4, 8, 0, -6, -10, -6][k]}, "hhead": {"r": [-2, -4, 0, 4, 6, 3][k]},
        "torso": {"r": t, "rz": [16, 30, 0, -10, -16, -8][k]}, "head": {"r": [4, 8, 0, -2, -4, -2][k]},
        "hips": {"z": [-1.5, -3.0, -1.0, -0.5, -2.0, -1.0][k]},
        "arm_r": {"rz": C_KRZ[k]},
        "sparks": {"show": k in (4, 5), "s": 1.2 if k == 4 else 0.8},
        "dust": {"show": k in (3, 4, 5), "s": [1, 1, 1, 0.9, 1.3, 1.5][k], "z": [0, 0, 0, 0, 2, 4][k]},
    }, khopesh(C_KA[k] - t, C_KF[k] - t, C_KW[k] - t), reins(-34 - t, -14 - t))
    # the horse digs in: forelegs braced forward, hind legs under
    pose = _hooves(pose, fr=(LEGS["fr"].end.x + C_HX[k] + 5.0, 0.0), fl=(LEGS["fl"].end.x + C_HX[k] + 3.0, 0.0),
                   br=(LEGS["br"].end.x + C_HX[k] - 1.0, 0.0), bl=(LEGS["bl"].end.x + C_HX[k] - 2.0, 0.0))
    if k in (2, 3):
        pose.setdefault("khopesh", {})["sz"] = 1.2
    if k in (0, 1):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.9}})
    else:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.2}})
    return pose


def _attack_c():
    ring = {"kind": "arc", "joint": "scy_r", "inner": (AX, -20.0, WHEEL_R), "outer": (AX - 24.0, -20.0, WHEEL_R - 3.5),
            "color": B.SAND_LT, "white": 0.3, "taper": 0.3, "band": 0.4, "lines": 2, "samples": 20}
    blade = {"kind": "arc", "joint": "khopesh", "inner": BLADE_IN, "outer": BLADE_OUT, "color": B.SAND_LT,
             "white": 0.3, "taper": 0.15, "lines": 3}
    ov = {
        4: [dict(ring, **{"from": 3, "t1": 1.0}), dict(blade, **{"from": 3, "t1": 0.95})],
        5: [dict(ring, **{"from": 4, "t1": 1.0}), dict(blade, **{"from": 3, "t0": 0.3, "t1": 0.95})],
        6: [dict(ring, **{"from": 5, "t1": 1.0}),
            {"kind": "burst", "joint": "scy_r", "point": (AX - 22.0, -20.0, WHEEL_R - 3.0), "r0_lu": 7.0,
             "r1_lu": 14.0, "n": 5, "a0": -60.0, "arc": 160.0},
            {"kind": "dust", "ground": (AX - 10.0, 0.0), "size_lu": 11.0, "puffs": 5, "seed": 41, "spread": 1.3},
            {"kind": "dust", "ground": (AX + 16.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 42, "spread": 0.9}],
        7: [dict(ring, **{"from": 6, "t1": 1.0, "lines": 1})],
    }
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_c", [_c_pose(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=M.HEAVY_MELEE_IMPACT,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    # vehicle: the car bounces on its axle, the driver ducks and squeezes his eyes, the horse
    # throws its head, the pennant whips (follow-through)
    a = M.HIT_AMT[k]
    b = [0.0, 1.0, -0.6, 0.3, 0.0][k]
    pose = merge(STANCE, car(-2.0 * a, -1.5 * b, 2.0 * a), {
        "unit": dict(squash([-0.08, 0.04, -0.03, 0.02, 0.0][k]), x=-3.0 * max(a, 0)),
        "horse": {"r": 5 * a, "z": 1.5 * b}, "neck": {"r": 14 * a}, "hhead": {"r": -8 * a},
        "torso": {"r": -14 * max(a, 0) + 6 * min(a, 0)}, "head": {"r": -10 * max(a, 0)},
        "hips": {"z": -3.0 * max(a, 0)}, "arm_r": {"r": 14 * a},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


# death: 8 unique poses, 12 steps (about 1 s). 0 struck (the horse throws its head up, the car
# jolts), 1 the forelegs buckle and the car's near wheel lifts, 2 the horse drops onto its
# knees, the car rolls toward the camera, 3 the car lands on its side and the driver is thrown,
# 4 a small bounce, 5-6 settle (the horse's head sinks), 7 hand-off (the dust poof covers it)
DIE_SEQ = [0, 1, 2, 3, 3, 4, 5, 5, 6, 6, 7, 7]
DIE_MS = [60, 70, 80, 70, 60, 60, 80, 90, 90, 100, 100, 110]


def _die(f):
    roll = pick(f, [0, 8, 26, 50, 44, 50, 52, 52])     # the car rolls away onto its side (rx)
    pose = merge(STANCE, car(pick(f, [-3, -5, -6, -8, -8, -8, -8, -8]),
                             pick(f, [1, 3, 5, -2, 1, -3, -3.5, -3.5]),
                             pick(f, [4, 8, 12, 6, 7, 5, 5, 5]),
                             pick(f, [-10, -25, -40, -45, -48, -50, -50, -50])), {
        "cart": {"rx": roll, "y": pick(f, [0, 1, 3, 6, 6, 6, 6, 6])},
        "unit": {"x": pick(f, [-3, -5, -6, -7, -7, -7, -7, -7]),
                 "s": pick(f, [1, 1, 1, 1, 1, 1, 1, 0.94])},
        "horse": {"r": pick(f, [6, -8, -18, -20, -18, -19, -19, -19]),
                  "z": pick(f, [1, -4, -12, -15, -13, -15, -15.5, -15.5])},
        "neck": {"r": pick(f, [22, 10, -6, -14, -10, -18, -24, -24])},
        "hhead": {"r": pick(f, [-14, -6, 4, 8, 6, 10, 12, 12])},
        # forelegs fold under the chest (kneeling), hind legs crouch
        "leg_fr": {"r": pick(f, [20, 40, 70, 80, 78, 80, 80, 80])},
        "leg_fr2": {"r": pick(f, [-30, -90, -140, -150, -148, -150, -150, -150])},
        "leg_fl": {"r": pick(f, [10, 30, 64, 74, 72, 74, 74, 74])},
        "leg_fl2": {"r": pick(f, [-20, -80, -134, -146, -144, -146, -146, -146])},
        "leg_br": {"r": pick(f, [-6, 10, 26, 34, 32, 36, 38, 38])},
        "leg_br2": {"r": pick(f, [10, 30, 50, 60, 58, 62, 64, 64])},
        "leg_bl": {"r": pick(f, [-2, 14, 30, 38, 36, 40, 42, 42])},
        "leg_bl2": {"r": pick(f, [6, 26, 46, 56, 54, 58, 60, 60])},
        "torso": {"r": pick(f, [18, 26, 36, 50, 46, 50, 52, 52])}, "head": {"r": pick(f, [12, -4, -8, -10, -8, -10, -10, -10])},
        "hips": {"x": pick(f, [0, -2, -5, -9, -9, -9, -9, -9]), "z": pick(f, [0, 2, 4, -2, 0, -2, -2, -2])},
        "arm_r": {"r": pick(f, [60, 70, 90, 110, 100, 110, 110, 110])},
        "arm_l": {"r": pick(f, [90, 100, 120, 130, 126, 130, 130, 130])},
        "dust": {"show": f in (2, 3, 4, 5), "s": pick(f, [1, 1, 1.0, 1.3, 1.5, 1.6, 1, 1]),
                 "z": pick(f, [0, 0, 0, 0, 2, 4, 0, 0])},
        "sparks": {"show": f == 3},
    })
    if f == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif f < 3:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def _die_extra():
    total = sum(DIE_MS)
    handoff = sum(DIE_MS[:len(DIE_MS) - 2])
    h = HEIGHT_LU
    return {"fx": [{"id": "fx.dust_poof", "atMs": handoff - 40, "offsetLu": [0, round(h * 0.36, 1)]},
                   {"id": "fx.ko_stars", "atMs": handoff + 40, "offsetLu": [0, round(h * 0.55, 1)],
                    "loops": 2, "scalePow": 0.5}],
            "hideUnitAtMs": total}


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [150] * 6, loop=True),
        M.walk_clip("walk", RIG, _walk, _gait(), "rider"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        Clip("die", 8, _die, sequence=DIE_SEQ, durations=DIE_MS, extra=_die_extra()),
    ]
    M.check_contract([c for c in cl if c.name != "die"], heavy=True)
    assert cl[-1].total_ms() == 970
    return M.check_variants(cl)
