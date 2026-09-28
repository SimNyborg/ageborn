"""Spear Hunter: Stone Age anti-armor with reach (DESIGN A5.2). Long flint spear, pierce, 72 lu.

Look (A11): the tallest and leanest of the cave folk, darker skin, a swept-back black mane
with two big team feathers (follow-through), ochre cheek stripes (accent), a bone tooth
necklace, a team sash across the chest and a team loincloth. The oversized spear (about his
own height, polearm = reach) is held low and forward with both hands, flint head up front
so the role reads at a glance. The attack is a lunging two-handed thrust: draw back, coil,
held extreme, a smeared lunge, a held full extension at impact, and a recovery.
"""
from ageborn_art import fx
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody, biped_hit, biped_idle, biped_walk

SLUG = "spear_hunter"
NAME = "Spear Hunter"
HEIGHT_LU = 72
CANVAS = (330, 224)
FEET = (130, 200)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 34)}

SKIN = "#A8876F"
HAIR = "#3A302A"
FUR = "#6F6255"
WOOD = "#9C8468"
FLINT = "#77726B"
FLINT_HI = "#A39E96"
CORD = "#C9B99A"
BONE = "#EDE3C8"
OCHRE = "#C98A3D"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"

SPEAR_FWD = 50.0   # tip distance ahead of the near fist (rest: the spear points +X)
SPEAR_BACK = 28.0


def build(rig):
    global ARM_R, ARM_L, SMEAR
    body = CaveBody(rig, SKIN, FUR, hip_z=18.5, knee_z=10.0, ankle_z=4.2, waist_z=19.5,
                    shoulder_z=39.0, neck_z=41.0, hip_y=5.4, shoulder_y=11.2,
                    elbow=(1.5, 31.0), wrist=(3.8, 24.0), leg_r=(4.2, 3.6, 3.2),
                    arm_r=(3.9, 3.4, 3.3), fist_r=3.9, torso=((0, 31.5), (9.4, 8.6, 11.2)),
                    torso_taper=(0.92, 1.06), foot_len=6.2)
    fr = body.fist["r"]

    # team sash across the chest and a team loincloth that swings
    g = Geo().capsule((8.0, -6.0, 26.5), (-1.0, 8.0, 40.0), 3.8, 3.4)
    g.capsule((-7.8, -3.0, 26.5), (-1.0, 8.0, 40.0), 3.6, 3.4)
    g.blob((0.4, 0, 25.6), (10.3, 9.7, 4.6), p=2.8)
    rig.part("torso", g, team=True)
    rig.secondary("cloth", "hips", (0.8, 0, 23.0), (0.0, 0, 12.0), max_deg=12, gain=0.9)
    g = Geo().blob((0.8, 0, 21.2), (10.4, 9.6, 3.4), p=2.6)
    g.blob((6.2, -3.5, 15.8), (5.2, 2.6, 7.4), p=2.4, taper=(0.7, 1.0))
    g.blob((-6.0, -2.0, 15.8), (5.2, 2.8, 7.4), p=2.4, taper=(0.7, 1.0))
    rig.part("cloth", g, team=True)
    g = Geo().capsule((0.9, -8.2, 23.6), (0.9, 8.2, 23.6), 1.5)
    rig.part("torso", g, FUR, finish="hair")
    # bone tooth necklace
    g = Geo()
    for x, y, z in ((7.8, -5.5, 36.0), (9.2, -1.5, 35.0), (9.0, 2.5, 35.4)):
        g.lathe([(1.3, 0), (1.0, 1.5), (0, 3.4)], (x, y, z + 1.6), (x + 0.6, y, z - 1.8), segs=8)
    rig.part("torso", g, BONE, outline=0.7)

    # head: long lean face, strong nose, stern brow; mane swept back with team feathers
    g = Geo().blob((2.2, 0, 52.0), (9.4, 9.2, 10.6), p=2.3)
    g.blob((6.0, 0, 45.6), (6.8, 7.6, 5.0), p=2.3)
    g.blob((12.2, -0.4, 50.0), (2.8, 2.0, 3.0), p=2.0, rot=(0, -20, 0))   # nose
    rig.part("head", g, SKIN)
    g = Geo().blob((-2.0, 0, 58.6), (9.6, 9.8, 5.2), p=2.2, rot=(0, -12, 0))  # hair cap
    g.blob((-7.8, 0, 52.5), (5.8, 9.2, 8.8), p=2.2)
    for (x0, z0), (x1, z1), r in (((-6, 60), (-15.5, 62), 3.2), ((-8, 55), (-17, 54), 3.0),
                                  ((-8, 50), (-15, 46.5), 2.8)):
        g.capsule((x0, 0, z0), (x1, 0, z1), r, 1.2)
    rig.part("head", g, HAIR, finish="hair")
    rig.secondary("feathers", "head", (-4.0, 1.0, 60.0), (-9.0, 1.0, 74.0), max_deg=14, gain=1.2)
    g = Geo()
    for (x1, z1), rot in (((-7.0, 74.0), (0, -22, 0)), ((-12.8, 70.0), (0, -48, 0))):
        cx, cz = (-4.0 + x1) / 2, (60.0 + z1) / 2
        g.blob((cx, 1.5, cz), (3.4, 1.1, 8.6), p=2.2, rot=rot, taper=(0.5, 1.0))
    rig.part("feathers", g, team=True, outline=0.8)
    g = Geo().capsule((-4.0, 1.5, 59.5), (-6.0, 1.5, 64.5), 0.7).capsule((-4.0, 1.5, 59.5), (-9.0, 1.5, 63.0), 0.7)
    rig.part("feathers", g, BONE, outline=0.6)
    # stern brow, eyes, ochre cheek stripes, tight mouth
    g = Geo().capsule((9.0, -7.4, 56.6), (12.2, -1.2, 55.0), 1.7, 1.4)
    g.capsule((12.2, 1.2, 55.0), (9.8, 6.4, 56.6), 1.4, 1.7)
    rig.part("head", g, HAIR, finish="hair", outline=0.6)
    for y in (-4.0, 3.6):
        g = Geo().blob((10.0, y, 52.2), (2.8, 2.8, 3.3))
        rig.part("head", g, EYE, highlight=False)
        g = Geo().blob((12.4, y - 0.3, 52.0), (1.1, 1.8, 2.0))
        rig.part("head", g, PUPIL, outline=0)
    g = Geo()
    for z in (47.6, 45.2):
        g.capsule((6.4, -8.9, z + 0.4), (9.4, -7.6, z), 0.8)
    rig.part("head", g, OCHRE, outline=0)
    rig.joint("mouth", "head", (11.0, 0, 45.2))
    g = Geo().blob((11.1, -0.6, 45.2), (1.0, 3.0, 0.8), p=2.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    rig.joint("yell", "head", (10.8, 0, 44.8), hidden=True)
    g = Geo().blob((10.8, -0.4, 44.8), (1.8, 3.0, 2.4), p=2.2)
    rig.part("yell", g, MOUTH, outline=0, highlight=False)
    g = Geo().blob((11.9, -1.3, 46.4), (0.6, 0.9, 0.7), p=3.0).blob((11.9, 0.9, 46.4), (0.6, 0.9, 0.7), p=3.0)
    rig.part("yell", g, TOOTH, outline=0, highlight=False)

    # team armband on the near arm, fur pad on the far shoulder
    g = Geo().capsule((0.6, -11.6, 35.0), (1.1, -11.6, 31.6), 4.0, 3.8)
    rig.part("arm_r", g, team=True, outline=0.8)
    g = Geo().blob((0.3, 11.4, 40.2), (5.8, 5.0, 4.4), p=2.4)
    rig.part("torso", g, FUR, finish="hair")

    # the spear: along +X from the near fist; wood shaft, cord binding, big flint head
    x0, y0, z0 = fr[0], fr[1] - 1.0, fr[2]
    rig.joint("spear", "fore_r", (x0, y0, z0))
    g = Geo().lathe([(0, -SPEAR_BACK - 1.0), (1.5, -SPEAR_BACK), (1.7, 0), (1.5, SPEAR_FWD - 9.0),
                     (0, SPEAR_FWD - 8.0)], (x0, y0, z0), (x0 + 1, y0, z0), segs=12)
    rig.part("spear", g, WOOD)
    g = Geo().lathe([(2.3, SPEAR_FWD - 11.0), (2.6, SPEAR_FWD - 9.5), (2.3, SPEAR_FWD - 7.2),
                     (0, SPEAR_FWD - 7.0)], (x0, y0, z0), (x0 + 1, y0, z0), segs=12)
    g.lathe([(0, -SPEAR_BACK + 5.4), (2.0, -SPEAR_BACK + 5.5), (2.0, -SPEAR_BACK + 8.0),
             (0, -SPEAR_BACK + 8.1)], (x0, y0, z0), (x0 + 1, y0, z0), segs=12)
    rig.part("spear", g, CORD, outline=0.7)
    # leaf-shaped flint head, flattened toward the camera so the blade shape reads
    hx = x0 + SPEAR_FWD - 9.5
    g = Geo().lathe([(0, 0), (3.2, 1.2), (4.6, 4.5), (3.9, 8.0), (1.6, 11.5), (0, 13.0)],
                    (hx, y0, z0), (hx + 1, y0, z0), segs=14, squash=(1.0, 0.42))
    rig.part("spear", g, FLINT, finish="gloss")
    g = Geo().lathe([(0, 0), (1.4, 1.5), (1.8, 5.0), (0.8, 8.5), (0, 9.5)],
                    (hx + 2.0, y0 - 1.2, z0 + 1.0), (hx + 3.0, y0 - 1.2, z0 + 1.0), segs=10,
                    squash=(0.9, 0.4))
    rig.part("spear", g, FLINT_HI, outline=0, highlight=False)
    # team streamers tied under the head
    bx = x0 + SPEAR_FWD - 12.0
    g = Geo().slab([(bx, z0 - 0.5), (bx - 2.5, z0 - 11.0), (bx - 6.5, z0 - 12.5), (bx - 3.0, z0 - 0.5)],
                   y0 - 2.4, 1.2)
    g.slab([(bx + 1.0, z0 - 0.5), (bx + 2.0, z0 - 9.0), (bx - 1.5, z0 - 10.0), (bx - 1.5, z0 - 0.5)],
           y0 - 3.4, 1.2)
    rig.part("spear", g, team=True, outline=0.8)
    tip = (x0 + SPEAR_FWD + 2.0, y0, z0)
    rig.track("spearTip", "spear", tip)
    SMEAR = {"joint": "spear", "inner": (x0 + SPEAR_FWD - 16.0, y0, z0), "outer": tip,
             "color": FLINT_HI, "taper": 0.3, "start": 0.2, "behind": 4.0}
    rig.track("_foot", "shin_r", (2.9, -5.4, 0.5))
    ARM_R = body.arm("r", "spear", tip)
    ARM_L = body.arm("l")


ARM_R = ARM_L = None
SMEAR = None  # set in build()


# -- poses ---------------------------------------------------------------------------------
def spear_arm(a, b, c, torso=0.0):
    """Arm directions in torso space; the spear angle `c` is world-level (the torso's
    rotation is taken out, so c = 0 is a level thrust whatever the lean)."""
    return ARM_R.pose(a, b, c - torso)


def off_arm(a, b):
    return ARM_L.pose(a, b)


def stance():
    # spear low at the hip, pointing forward and a little up; far hand forward on the shaft
    return merge(spear_arm(-72, -8, 14, -4), off_arm(-28, 4), {"torso": {"r": -4}})


def _idle(f):
    def extra(c, lag):
        return {"arm_r": {"r": 2 * lag}, "spear": {"r": -3 * lag}, "arm_l": {"r": 2 * lag}}
    return biped_idle(f, stance(), extra=extra)


def _walk(f):
    import math

    def extra(p, lag_p, bob, bob_lag):
        return {"arm_r": {"r": -6 * math.cos(p)}, "spear": {"r": 3 * math.cos(lag_p)},
                "arm_l": {"r": 8 * math.cos(p)}}
    return biped_walk(f, stance(), lean=-7.0, bob_k=0.9, thigh=28.0, extra=extra)


def _attack(f):
    # 0-1 draw back and coil (squash), 2 held extreme (spear far back, weight on the back
    # foot), 3 smear (lunging forward), 4 held impact: full extension, spear level, front
    # knee bent, squash 0.85/1.15, yell; 5-7 recovery. Timing: fx.MELEE_MS.
    a = pick(f, [-110, -150, -165, -70, -10, -16, -40, -66])
    b = pick(f, [-60, 200, 185, -20, 4, 0, -6, -8])
    c = pick(f, [10, 8, 6, 2, -2, 0, 6, 12])
    tr = pick(f, [4, 8, 12, -12, -26, -22, -12, -6])
    sq = pick(f, [-0.05, -0.10, 0.06, 0.05, -0.15, -0.08, -0.02, 0.0])
    pose = merge(spear_arm(a, b, c, tr), off_arm(pick(f, [-50, -70, -80, -20, 10, 4, -12, -24]),
                                             pick(f, [-10, -24, -30, 6, 10, 8, 6, 4])), {
        "body": dict(squash(sq), x=pick(f, [-1.5, -3.0, -4.5, 3.0, 9.0, 8.0, 4.0, 1.0])),
        "hips": {"z": pick(f, [0, -0.8, -1.2, -0.4, -3.0, -2.2, -0.8, 0])},
        "torso": {"r": tr},
        "head": {"r": pick(f, [-2, -4, -6, 6, 16, 14, 8, 4])},
        "thigh_r": {"r": pick(f, [0, -8, -12, 18, 40, 34, 16, 4])},
        "shin_r": {"r": pick(f, [0, 0, 0, -16, -34, -30, -12, -2])},
        "thigh_l": {"r": pick(f, [6, 14, 20, -10, -22, -18, -8, 0])},
        "shin_l": {"r": pick(f, [-6, -12, -16, -4, -8, -6, -2, 0])},
    })
    if f == 3:
        pose["spear"]["sx"] = 1.08  # smear frame: the spear stretches along the thrust
    if f in (3, 4):
        pose.update({"mouth": {"hide": True}, "yell": {"show": True}})
    return pose


def _hit(f):
    return biped_hit(f, stance(), extra=lambda a: {"arm_r": {"r": 14 * a}, "spear": {"r": 10 * a}})


def _die(f):
    pose = merge(stance(), fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "arm_r": {"r": pick(f, [50, 40, 40])}, "spear": {"r": pick(f, [40, 30, 30])},
        "arm_l": {"r": pick(f, [120, 90, 90])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        pose.update({"mouth": {"hide": True}, "yell": {"show": True}})
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
