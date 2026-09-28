"""Corsair: Gunpowder Age infantry (DESIGN A5.4). Cutlass, blunt, Boarding Hook, ~68 lu.

Look (A11, Gunpowder palette): a stocky pirate in a team bandana with knot tails that fly
behind, a team waistcoat over a loose cream shirt, a bottle-green sash, baggy dark-wood
breeches and tall black boots. Black beard, an eyepatch over the near eye and a brass
earring. He swings an oversized curved cutlass (brass basket guard) in the near hand and
holds an iron boarding hook on a coil of rope in the far hand, so the Boarding Hook trait
reads at a glance. The attack is a big overhead slash with a held wind-up, a smear frame
and a squashed impact with a yell.
"""
from ageborn_art import fx
from ageborn_art import rigs_gunpowder as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "corsair"
NAME = "Corsair"
HEIGHT_LU = 68
CANVAS = (264, 232)
FEET = (112, 206)
ANCHORS = {"head": (2, 66), "hitCenter": (0, 32)}

BEARD = "#2F2724"
BREECH = "#4A3B2E"
BOOT = "#2E2A2A"
BLADE = "#C9D0D8"
ROPE = "#A89478"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # near hand: cutlass
HL = (0.0, B.ARM_Y["l"], B.HAND_Z)   # far hand: hook
BL = 34.0                            # blade length from the hand
SMEAR = {"joint": "hand_r", "inner": (HR[0] + 3.0, HR[1], HR[2] + 14), "outer": (HR[0] + 6.5, HR[1], HR[2] + 4 + BL),
         "color": BLADE, "taper": 0.45, "start": 0.25, "behind": 4.0}


def build(rig):
    B.skeleton(rig)
    # legs: baggy breeches, tall black boots with turned-down tops
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().capsule((0, y, 15), (0.8, y, 8.5), 5.4, 5.0)
        rig.part(f"thigh_{s}", g, BREECH)
        g = Geo().capsule((0.8, y, 8.5), (1.0, y, 4.0), 4.2, 3.9)
        g.blob((3.4, y, 2.7), (7.0, 4.7, 2.9), p=2.8, taper=(1.02, 0.82))
        rig.part(f"shin_{s}", g, BOOT, finish="gloss")
        g = Geo().blob((0.9, y, 9.4), (5.6, 5.5, 2.2), p=2.6)
        rig.part(f"shin_{s}", g, BOOT, finish="gloss")

    # torso: cream shirt, team waistcoat (open at the front), green sash with knot tails
    g = Geo().blob((0, 0, 28.5), (11.4, 10.2, 11.8), p=2.3, taper=(1.1, 0.95))
    g.blob((0, 0, 18.0), (10.8, 9.8, 4.8), p=2.6)
    rig.part("torso", g, B.CREAM)
    g = Geo().blob((-0.6, 0, 28.0), (11.8, 10.9, 11.6), p=2.5, taper=(1.12, 0.94))
    g.clip((0, 0, 37.4), (0, 0, 1))
    g.clip((8.6, 0, 0), (1, -0.35, 0))  # open front: the shirt shows
    rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 20.4), (12.0, 11.1, 3.0), p=3.0)
    rig.part("torso", g, B.GREEN)
    g = Geo().blob((11.8, -3.2, 20.6), (1.6, 2.8, 2.4), p=2.4)  # big brass buckle
    rig.part("torso", g, B.BRASS, finish="metal", outline=0.6)
    rig.secondary("sash", "hips", (-8.0, -8.0, 19.0), (-12.0, -9.0, 9.0), max_deg=16, gain=1.2)
    g = Geo().capsule((-8.0, -8.5, 19.0), (-11.5, -9.5, 10.5), 2.4, 1.9)
    g.capsule((-7.0, -9.2, 19.0), (-8.5, -10.2, 11.5), 2.0, 1.6)
    rig.part("sash", g, B.GREEN)
    g = Geo().blob((4.0, 0, 36.5), (5.6, 6.4, 2.4), p=2.4)  # open collar
    rig.part("torso", g, B.CREAM)

    # head: big, black beard, eyepatch, bandana with flying knot tails, brass earring
    B.head_ball(rig, center=(2, 0, 49.0), nose=(14.0, -0.6, 47.8), nose_r=(3.8, 3.2, 3.4))
    B.face(rig, cx=12.4, cz=50.4, brow=BEARD, patch=True, eye_r=(3.3, 3.1, 4.0))
    g = Geo().blob((7.2, 0, 41.2), (8.4, 10.2, 5.4), p=2.3)          # beard
    g.blob((10.0, 0, 38.0), (4.6, 5.2, 4.2), p=2.2)
    g.blob((-5.5, 0, 47.0), (5.6, 10.4, 6.2), p=2.2)                 # hair at the back
    rig.part("head", g, BEARD, finish="hair")
    B.moustache(rig, BEARD, cx=13.4, z=44.6)
    g = Geo().blob((0.5, 0, 55.5), (12.4, 12.2, 8.8), p=2.4)
    g.clip((0, 0, 55.6), (0, 0, -1))
    g.blob((-10.4, 0, 54.5), (3.6, 4.2, 3.6), p=2.2)                  # knot
    rig.part("head", g, team=True)
    rig.secondary("knot", "head", (-11.5, 0, 54.5), (-20.0, 0, 49.0), max_deg=16, gain=1.3)
    g = Geo().capsule((-11.5, -1.5, 54.5), (-19.5, -2.5, 50.5), 2.6, 1.8)
    g.capsule((-11.5, 1.5, 54.0), (-17.5, 2.5, 46.5), 2.4, 1.6)
    rig.part("knot", g, team=True)
    g = Geo().lathe([(1.7, -0.5), (1.7, 0.5), (1.0, 0.5), (1.0, -0.5)], (-1.0, -12.2, 43.2),
                    (-1.0, -13.2, 43.2), segs=12)
    rig.part("head", g, B.BRASS, finish="metal", outline=0.5)

    # arms: rolled cream sleeves, bare forearms
    for s in ("r", "l"):
        y = B.ARM_Y[s]
        g = Geo().capsule((0, y, B.SHOULDER_Z), (0, y, B.ELBOW_Z), 4.8, 4.3)
        rig.part(f"arm_{s}", g, B.CREAM)
        g = Geo().capsule((0, y, B.ELBOW_Z), (0, y, B.HAND_Z + 2.0), 3.9, 3.7)
        rig.part(f"fore_{s}", g, B.SKIN)
        g = Geo().blob((0.4, y, B.HAND_Z - 0.4), (4.4, 4.2, 4.4), p=2.3)
        rig.part(f"hand_{s}", g, B.SKIN)
    for s, y in (("r", -12.4), ("l", 11.8)):
        g = Geo().blob((0, y, 37.0), (5.8, 5.2, 4.6), p=2.4)  # waistcoat shoulder
        rig.part(f"arm_{s}", g, team=True)

    # cutlass: modelled pointing up from the near fist; curved broad blade, basket guard
    hx, hy, hz = HR
    # a single curved blade: back edge straight-ish, belly curving out to a clipped point
    back = [(hx - 1.4, hz + 4.0), (hx - 0.6, hz + 14), (hx + 1.2, hz + 24), (hx + 4.0, hz + 32),
            (hx + 7.4, hz + 4 + BL)]
    edge = [(hx + 9.6, hz + 4 + BL - 3.5), (hx + 8.4, hz + 28), (hx + 6.4, hz + 18),
            (hx + 4.4, hz + 9), (hx + 2.4, hz + 4.0)]
    g = Geo().slab(back + edge, hy - 0.8, 1.5)
    rig.part("hand_r", g, BLADE, finish="metal", outline_hex="#6F7780")
    g = Geo().capsule((hx, hy, hz - 5.0), (hx, hy, hz + 3.0), 1.5)
    rig.part("hand_r", g, B.LEATHER)
    g = Geo().blob((hx + 2.5, hy - 0.8, hz + 1.0), (5.2, 3.2, 4.6), p=2.2)  # basket guard
    g.clip((hx - 1.0, hy, hz), (-1, 0, 0))
    g.blob((hx, hy, hz + 4.2), (3.6, 2.6, 1.0), p=2.4)
    g.sphere((hx, hy, hz - 5.8), 1.6, cuts=3)
    rig.part("hand_r", g, B.BRASS, finish="metal", outline=0.7)

    # boarding hook in the far hand: a 3-pronged iron grapnel with a rope coil
    fx_, fy, fz = HL
    g = Geo().capsule((fx_ + 1.0, fy, fz), (fx_ + 1.0, fy, fz + 9.0), 1.2)
    for ang in (-50, 0, 50):
        import math
        a = math.radians(ang)
        g.capsule((fx_ + 1.0, fy, fz + 8.5), (fx_ + 1.0 + 6.0 * math.sin(a), fy + 3.0 * math.sin(a) * 0,
                                               fz + 10.5 + 1.5 * math.cos(a)), 1.1, 0.9)
        g.capsule((fx_ + 1.0 + 6.0 * math.sin(a), fy, fz + 10.5 + 1.5 * math.cos(a)),
                  (fx_ + 1.0 + 7.6 * math.sin(a), fy, fz + 13.8), 0.9, 0.5)
    rig.part("hand_l", g, B.IRON, finish="metal", outline=0.8)
    g = Geo().lathe([(4.2, -1.8), (4.8, 0), (4.2, 1.8), (2.4, 1.8), (1.9, 0), (2.4, -1.8)],
                    (fx_ + 0.5, fy + 1.0, fz - 5.0), (fx_ + 0.5, fy + 3.0, fz - 5.0), segs=16)
    rig.part("hand_l", g, ROPE, finish="hair")

    rig.track("bladeTip", "hand_r", (hx + 7.4, hy, hz + 4 + BL - 1.5))
    rig.track("_foot", "shin_r", (3.4, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def blade_arm(a, f, w):
    return B.arm("r", a, f, w, w_rest=90.0)


def hook_arm(a, f, w=None):
    return B.arm("l", a, f, w, w_rest=90.0)


# cutlass held up and forward, hook held low in front
STANCE = merge(blade_arm(-15, 30, 55), hook_arm(-60, -15, 70), {"torso": {"r": -3}})


def _idle(f):
    c, lag = B.idle_wave(f)
    return merge(STANCE, B.idle_body(f), {
        "arm_r": {"r": 3 * lag}, "hand_r": {"r": -5 * lag},
        "arm_l": {"r": -4 * lag}, "hand_l": {"r": 4 * c},
    })


def _walk(f):
    import math
    pose, p, bl = B.walk_legs(f, lean=-9.0)
    return merge(STANCE, pose, {
        "arm_l": {"r": 18 * math.cos(p)}, "fore_l": {"r": 8 * max(0.0, math.cos(p))},
        "arm_r": {"r": -5 * math.cos(p - 0.8)}, "hand_r": {"r": 6 * bl},
    })


def _attack(f):
    # 0-1 anticipation (squash 0.9/1.1), 2 held extreme (blade far back over the shoulder),
    # 3 smear, 4 held impact (squash 0.85/1.15, yell), 5-7 recovery. fx.MELEE_MS timing.
    a = pick(f, [40, 80, 100, 70, -20, -18, -25, -15])
    fo = pick(f, [100, 120, 135, 60, -22, -15, 10, 30])
    w = pick(f, [120, 135, 150, 60, -5, 5, 30, 55])
    sq = pick(f, [-0.05, -0.10, 0.08, 0.05, -0.15, -0.08, 0.0, 0.0])
    pose = merge(blade_arm(a, fo, w), hook_arm(pick(f, [-50, -20, 5, -40, -110, -100, -80, -60]),
                                                 pick(f, [-10, 20, 45, 0, -70, -55, -35, -15]),
                                                 pick(f, [80, 100, 110, 60, 20, 30, 50, 70])), {
        "body": dict(squash(sq), x=pick(f, [-1, -2.5, -3.5, 2, 6, 5, 2, 0])),
        "hips": {"z": pick(f, [0, -0.8, 0.8, 0, -2.5, -1.8, -0.6, 0])},
        "torso": {"r": pick(f, [4, 10, 16, -6, -24, -20, -10, -3])},
        "head": {"r": pick(f, [2, 6, 8, -4, -10, -8, -3, 0])},
        "thigh_r": {"r": pick(f, [0, -6, -8, 10, 22, 18, 8, 0])},
        "shin_r": {"r": pick(f, [0, 0, 0, -8, -16, -12, -4, 0])},
        "thigh_l": {"r": pick(f, [0, 6, 8, -6, -16, -12, -6, 0])},
        "shin_l": {"r": pick(f, [0, -4, -6, -4, -6, -4, 0, 0])},
    })
    if f == 3:
        pose["hand_r"]["sz"] = 1.3  # smear frame: the blade stretched along the swing
    if f in (3, 4):
        B.yell(pose)
    return pose


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    return merge(STANCE, B.hit_body(f), {"arm_r": {"r": 18 * a}, "hand_r": {"r": 12 * a},
                                         "arm_l": {"r": 30 * a}})


def _die(f):
    pose = merge(STANCE, fx.die_pose(f), B.die_limbs(f), {
        "arm_r": {"r": pick(f, [40, 50, 50])}, "hand_r": {"r": pick(f, [30, 20, 20])},
        "arm_l": {"r": pick(f, [120, 90, 90])},
    })
    if f == 0:
        B.yell(pose)
    return pose


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
