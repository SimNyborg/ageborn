"""War Chariot: Bronze Age heavy (A17.9), rider rig. Scythe Charge (first hit x2, knockback), ~110 lu.

Look (A17.12): a stocky dun horse in a team breast collar with a team plume on the bridle
pulls a light two-wheeled chariot: a plum wickerwork car with a big team side panel, sandstone
rails and bronze studs, six-spoked wheels with aged-bronze scythe blades on the hubs, and a
tall team swallowtail pennant on a pole at the back that trails in the wind. The charioteer
(open-faced helmet with a team crest, linen cuirass) holds the reins in the far hand and a
bronze khopesh in the near hand. The walk is a trot with the wheels rolling; the attack is
the charge lean: the horse lunges, the car lurches forward, the khopesh sweeps down in a big
smeared arc and the scythed hubs throw sparks on impact.
"""
import math

from ageborn_art import fx, retime
from ageborn_art import rigs_bronze as B
from ageborn_art import rigs_gunpowder as G
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

# heavy melee timing (long wind-up, held impact); additive, the set lives in retime.py
retime.HEAVY_MELEE.add("war_chariot")

SLUG = "war_chariot"
NAME = "War Chariot"
HEIGHT_LU = 110
YAW_DEG = -10.0
CANVAS = (470, 300)
FEET = (250, 276)
ANCHORS = {"head": (-10, 104), "hitCenter": (0, 42)}

COAT = "#B8A07E"
COAT_DK = "#9A8364"
MANE = "#3F332B"
HOOF = "#4A4038"

HX = 26.0                    # the horse is this far ahead of the unit origin
AX = -32.0                   # the chariot axle
WHEEL_R = 16.0
FLOOR_Z = 20.0
DRIVER = (-30.0, 0.0, 18.0)  # pose offset of the driver's skeleton (feet on the car floor)
HR = (0.0, G.ARM_Y["r"], G.HAND_Z)
BLADE = 22.0
SMEAR = {"joint": "khopesh", "inner": (HR[0] + 7.0, HR[1] - 1.0, HR[2] + BLADE - 6.0),
         "outer": (HR[0] + 12.0, HR[1] - 1.0, HR[2] + BLADE + 2.0), "color": B.BRONZE_HI, "taper": 0.4,
         "start": 0.15, "behind": 6.0}


def _leg(rig, name, x, y, z_top, front):
    rig.joint(name, "horse", (x, y, z_top))
    x2 = x + (1.5 if front else -1.0)
    rig.joint(f"{name}2", name, (x2, y, 16.5))
    g = Geo().capsule((x, y, z_top), (x2, y, 16.5), 6.4 if not front else 5.8, 3.9)
    rig.part(name, g, COAT)
    g = Geo().capsule((x2, y, 16.5), (x2 + 0.5, y, 5.5), 3.5, 3.2)
    rig.part(f"{name}2", g, COAT)
    g = Geo().blob((x2 + 1.2, y, 2.6), (4.8, 4.3, 2.9), p=3.0, taper=(1.05, 0.85))
    rig.part(f"{name}2", g, HOOF)


def _horse(rig):
    rig.joint("horse", "unit", (HX, 0, 38))
    _leg(rig, "leg_fl", HX + 15, 6.0, 34, True)
    _leg(rig, "leg_bl", HX - 15, 6.0, 36, False)
    _leg(rig, "leg_fr", HX + 15, -6.0, 34, True)
    _leg(rig, "leg_br", HX - 15, -6.0, 36, False)
    g = Geo().blob((HX, 0, 38), (23, 11, 11.5), p=2.3)
    rig.part("horse", g, COAT)
    g = Geo().blob((HX - 1, 0, 47.5), (12, 11.6, 3.0), p=2.6)          # saddle cloth / yoke pad
    rig.part("horse", g, team=True, outline=0.8)
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
    for y in (-3.2, 3.2):
        g.lathe([(2.0, 0), (1.5, 2.8), (0, 6.0)], (HX + 27.5, y, 66), (HX + 26.5, y * 1.3, 73), segs=10)
    rig.part("hhead", g, COAT)
    g = Geo().blob((HX + 31.8, -4.9, 61.8), (1.9, 1.3, 2.2))
    rig.part("hhead", g, B.EYE, highlight=False, outline=0.8)
    g = Geo().sphere((HX + 32.6, -5.9, 61.6), 1.2, cuts=3).sphere((HX + 46.8, -3.4, 51.8), 1.0, cuts=3)
    rig.part("hhead", g, B.PUPIL, outline=0)
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


def _car(rig):
    rig.joint("cart", "unit", (AX, 0, WHEEL_R))
    rig.joint("wheel_l", "cart", (AX, 12.0, WHEEL_R))
    rig.joint("wheel_r", "cart", (AX, -12.0, WHEEL_R))
    G.wheel(rig, "wheel_l", (AX, 12.0, WHEEL_R), WHEEL_R, 3.0, rim=B.WOOD_DK, spokes=B.WOOD, hub=B.AGED,
            team_felloe=False, n_spokes=6)
    # draught pole from the car floor up to the yoke on the horse, and the traces
    g = Geo().capsule((AX + 14, 0, FLOOR_Z), (HX - 6, 0, 36.0), 1.6).capsule((HX - 6, 0, 36.0), (HX + 2, 0, 49.0), 1.6)
    rig.part("cart", g, B.WOOD_DK, outline=0.6)
    g = Geo().capsule((HX - 4, -12.0, 49.5), (HX - 4, 12.0, 49.5), 1.4)     # yoke
    rig.part("cart", g, B.WOOD, outline=0.6)
    # the car: floor, plum wicker body, team side panel, sandstone rails and bronze studs
    g = Geo().blob((AX + 1, 0, FLOOR_Z), (17, 12, 2.0), p=4.0)
    rig.part("cart", g, B.WOOD_DK)
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
            team_felloe=False, n_spokes=6)
    g = Geo()
    for y in (-19.5, 17.5):
        g.slab([(AX - 1, WHEEL_R + 1.8), (AX - 12, WHEEL_R + 3.0), (AX - 24, WHEEL_R + 0.5), (AX - 30, WHEEL_R - 4.0),
                (AX - 22, WHEEL_R - 1.8), (AX - 11, WHEEL_R - 1.2), (AX - 1, WHEEL_R - 1.8)], y, 1.2)
    rig.part("cart", g, B.AGED, finish="metal", outline=0.6)
    g = Geo().capsule((AX - 12, -20.3, WHEEL_R + 2.4), (AX - 28, -20.3, WHEEL_R - 2.6), 0.5)
    rig.part("cart", g, B.SAND_LT, outline=0)
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
    B.head_ball(rig)
    B.face(rig, cx=12.0, cz=50.0, brow=B.HAIR, eye_r=(3.2, 3.0, 3.8))
    g = Geo()
    for x, y, z, r in ((11.6, -3.0, 40.6, 2.4), (12.6, 0.0, 39.8, 2.6), (11.6, 3.0, 40.6, 2.2)):
        g.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    rig.part("head", g, B.HAIR, finish="hair")
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


def build(rig):
    rig.joint("unit", "root", (0, 0, 0))
    _horse(rig)
    _car(rig)
    _driver(rig)
    rig.track("_foot", "leg_fr2", (HX + 17.8, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def khopesh(a, f, w):
    return G.arm("r", a, f, w, w_rest=90.0)


def reins(a=-30, f=-10):
    return G.arm("l", a, f)


DRV = {"driver": {"x": DRIVER[0], "z": DRIVER[2]}}
STANCE = merge(DRV, khopesh(-30, 40, 70), reins(), {"torso": {"r": -4}})
SPIN_PER_FRAME = 15.0     # 6 spokes: 8 x 15 = 120 degrees, a seamless loop


def car(dx=0.0, dz=0.0, tilt=0.0, spin=0.0):
    return {"cart": {"x": dx, "z": dz, "r": tilt}, "wheel_r": {"r": -spin}, "wheel_l": {"r": -spin}}


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, car(tilt=0.3 * c), {
        "horse": {"z": 1.0 * c}, "neck": {"r": -3.0 * lag}, "hhead": {"r": 2.5 * lag},
        "leg_fr": {"r": 1.0 * c}, "leg_br": {"r": -1.0 * c},
        "hips": {"z": 0.8 * c}, "torso": {"r": 1.0 * c}, "head": {"r": -2.0 * lag},
        "arm_r": {"r": 2 * lag}, "hand_r": {"r": -3 * lag},
    })


def _walk(f):
    # a trot: diagonal leg pairs move together, 0.8 s per cycle; the car bounces a frame behind
    p = 2 * math.pi * f / 8
    s, c = math.sin(p), math.cos(p)
    bob = -1.6 * math.cos(2 * p)
    lag = -1.0 * math.cos(2 * (p - 2 * math.pi / 8))
    up = lambda v: max(0.0, v)
    return merge(STANCE, car(dz=0.5 * lag, tilt=0.6 * lag, spin=SPIN_PER_FRAME * f), {
        "horse": {"z": bob - 0.4, "r": 1.5 * s},
        "leg_fr": {"r": 20 * s}, "leg_fr2": {"r": -46 * up(c)},
        "leg_bl": {"r": 16 * s}, "leg_bl2": {"r": 32 * up(-c)},
        "leg_fl": {"r": -20 * s}, "leg_fl2": {"r": -46 * up(-c)},
        "leg_br": {"r": -16 * s}, "leg_br2": {"r": 32 * up(c)},
        "neck": {"r": -7 * math.cos(2 * p)}, "hhead": {"r": 3 * math.cos(2 * p)},
        "hips": {"z": 0.8 * lag}, "torso": {"r": -1.5 * lag},
        "arm_r": {"r": 3 * lag}, "hand_r": {"r": 3 * lag},
    })


def _attack(f):
    # 0-1 anticipation (the horse gathers, the driver raises the khopesh, squash), 2 held
    # extreme (horse rearing a little, blade high behind), 3 smear (the charge lunge, blade
    # sweeping down), 4 held impact (lunge, blade low and forward, sparks off the scythes,
    # dust), 5-7 recovery (fx.MELEE_MS, retimed as a heavy melee)
    sq = pick(f, [-0.04, -0.08, 0.05, 0.04, -0.12, -0.07, -0.02, 0.0])
    fwd = pick(f, [-1, -3, -5, 5, 12, 10, 5, 0])
    pose = merge(DRV, car(fwd * 0.9, 0, pick(f, [0, -1, -2, 2, 4, 2, 1, 0]),
                          pick(f, [0, -10, -15, 15, 45, 55, 60, 60])), {
        "unit": dict(squash(sq), x=fwd * 0.1),
        "horse": {"x": fwd, "r": pick(f, [3, 7, 11, 0, -6, -4, -1, 0]), "z": pick(f, [0, 1, 2, 0, -1.5, -1, 0, 0])},
        "leg_fr": {"r": pick(f, [10, 24, 34, -10, -22, -14, -4, 0])},
        "leg_fr2": {"r": pick(f, [-20, -50, -70, -10, 0, 0, 0, 0])},
        "leg_fl": {"r": pick(f, [6, 16, 26, 20, 18, 10, 2, 0])},
        "leg_fl2": {"r": pick(f, [-14, -40, -56, -44, -30, -16, -5, 0])},
        "leg_br": {"r": pick(f, [4, 8, 12, -10, -24, -14, -4, 0])},
        "leg_bl": {"r": pick(f, [2, 6, 8, -6, -14, -8, -2, 0])},
        "neck": {"r": pick(f, [4, 8, 12, -6, -14, -10, -4, 0])},
        "hhead": {"r": pick(f, [-3, -6, -8, 2, 6, 4, 1, 0])},
        "torso": {"r": pick(f, [6, 12, 16, -8, -20, -16, -8, -4])},
        "head": {"r": pick(f, [2, 4, 6, -3, -6, -5, -2, 0])},
        "hips": {"x": pick(f, [0, -1, -2, 2, 4, 3, 1, 0])},
        "sparks": {"show": f in (4, 5), "s": pick(f, [1, 1, 1, 1, 1.0, 0.7, 1, 1])},
        "dust": {"show": f in (4, 5, 6), "s": pick(f, [1, 1, 1, 1, 0.8, 1.1, 1.3, 1]),
                 "z": pick(f, [0, 0, 0, 0, 0, 2, 4, 0])},
    }, khopesh(pick(f, [20, 110, 140, 60, 20, 10, -10, -30]), pick(f, [80, 140, 170, 40, 5, 0, 20, 40]),
               pick(f, [90, 160, 185, 50, -8, -14, 30, 70])), reins(pick(f, [-30, -34, -38, -20, -10, -14, -24, -30]),
                                                                    pick(f, [-10, -14, -18, 0, 6, 2, -6, -10])))
    if f == 3:
        pose["khopesh"] = {"sz": 1.2}   # smear frame: the blade stretches along the sweep
    if f in (3, 4):
        B.yell(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, car(-2.0 * a, 0, 2.0 * a), {
        "unit": dict(squash(-0.06 * a), x=-3.0 * a),
        "horse": {"r": 5 * a}, "neck": {"r": 14 * a}, "hhead": {"r": -8 * a},
        "torso": {"r": 14 * a}, "head": {"r": 10 * a}, "arm_r": {"r": 14 * a},
    })


def _die(f):
    # the horse stumbles and pitches, the car tips back and the near wheel comes off
    pose = merge(STANCE, car(pick(f, [-3, -6, -8]), 0, pick(f, [6, 12, 14]), pick(f, [-20, -40, -50])), {
        "unit": dict(squash(pick(f, [0.04, -0.12, -0.22])), x=pick(f, [-4, -7, -8])),
        "horse": {"r": pick(f, [-8, -12, -14]), "z": pick(f, [1, -3, -5])},
        "neck": {"r": pick(f, [20, 12, 10])}, "hhead": {"r": -10},
        "leg_fr": {"r": pick(f, [40, 60, 70])}, "leg_fl": {"r": pick(f, [30, 55, 65])},
        "leg_fr2": {"r": -50}, "leg_fl2": {"r": -60},
        "leg_br": {"r": pick(f, [-20, -40, -50])}, "leg_bl": {"r": pick(f, [-16, -36, -46])},
        "wheel_r": {"x": pick(f, [0, -4, -8]), "y": pick(f, [0, -3, -5]), "z": pick(f, [0, -4, -6]),
                    "rx": pick(f, [0, 20, 40])},
        "torso": {"r": pick(f, [22, 30, 34])}, "head": {"r": pick(f, [12, -4, -6])},
        "arm_r": {"r": pick(f, [60, 50, 50])}, "arm_l": {"r": pick(f, [90, 80, 80])},
        "dust": {"show": f >= 1, "s": pick(f, [1, 1.0, 1.4])},
    })
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=100),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR, durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
