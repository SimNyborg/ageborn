"""Spear Hunter: Stone Age anti-armor with reach (DESIGN A5.2). Long flint spear, pierce, 72 lu.

Look (A11): the tallest and leanest of the cave folk, darker skin, a swept-back black mane
with two big team feathers (follow-through), ochre cheek stripes (accent), a bone tooth
necklace, a team sash across the chest and a team loincloth. The oversized spear (about his
own height, polearm = reach) is held low and forward with both hands, flint head up front
so the role reads at a glance. Bone earrings, fur leg wraps and a quiver of spare flint
points on his back; two cream feathers hang from the spear binding.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    peers out under his hand, weight shift, blink
  walk    sneak: low, long strides, a tip-toe up frame
  attack  LEAPING FISH-STAB: coils, raises the spear overhead point-down, hops in and stabs
          down and forward (streak smear, dust, impact lines); the spear quivers, then he
          pulls it out
  hit     light;  die  D1 fling and spin, X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody

SLUG = "spear_hunter"
NAME = "Spear Hunter"
HEIGHT_LU = 72
CANVAS = (330, 224)
FEET = (130, 200)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 34)}
NO_RETIME = True

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
    global ARM_R, ARM_L, TIPSPEC
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
    eyes = Geo()
    for y in (-4.2, 3.6):
        eyes.blob((9.8, y, 52.2), (3.5, 3.4, 4.1))
    pup = Geo()
    for y in (-4.2, 3.6):
        pup.blob((12.6, y - 0.3, 52.0), (1.3, 2.2, 2.4))
    face = F.Face(rig, "head", [g, eyes, pup])
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
    # stern brow, eyes (face kit), ochre cheek stripes, tight mouth, bone earring
    rig.joint("brow", "head", (11.0, 0, 55.6))
    g = Geo().capsule((9.0, -7.6, 57.0), (12.4, -1.2, 55.2), 1.9, 1.6)
    g.capsule((12.4, 1.2, 55.2), (9.8, 6.4, 56.8), 1.6, 1.9)
    rig.part("brow", g, HAIR, finish="hair", outline=0.6)
    rig.part("head", eyes, EYE, highlight=False)
    rig.joint("pupils", "head", (12.6, 0, 52.0))
    rig.part("pupils", pup, PUPIL, outline=0)
    g = Geo()
    for z in (47.8, 45.0):
        c = face.hit(7.6, z)
        face.stroke(g, c, [(-2.2, 0.5), (2.0, -0.3)], 1.5, 0.4)
    rig.part("head", g, OCHRE, highlight=False, outline=0)
    g = Geo().capsule((1.0, -9.4, 49.0), (1.4, -9.8, 44.6), 1.0).sphere((1.4, -9.8, 43.6), 1.5, cuts=2)
    rig.part("head", g, BONE, outline=0.5)
    rig.joint("mouth", "head", (11.0, 0, 45.2))
    c = face.hit(11.4, 45.0)
    g = Geo()
    face.decal(g, c, [(-2.0, 0.5), (1.8, 0.7), (1.9, -0.3), (-1.9, -0.5)], 0.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    face.eye_marks([(12.2, 52.2)], 3.5, SKIN)
    face.mouths((11.2, 44.8), 5.4)

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
    TIPSPEC = {"joint": "spear", "inner": (x0 + SPEAR_FWD - 16.0, y0, z0), "outer": tip,
             "color": FLINT_HI, "taper": 0.3, "start": 0.2, "behind": 4.0}
    # two cream feathers hanging from the head binding (they flutter)
    rig.secondary("tassel", "spear", (x0 + SPEAR_FWD - 10.0, y0 - 2.0, z0 - 1.0),
                  (x0 + SPEAR_FWD - 12.0, y0 - 2.0, z0 - 11.0), max_deg=30, gain=1.4)
    fx0 = x0 + SPEAR_FWD - 10.0
    g = Geo().blob((fx0 - 0.8, y0 - 2.6, z0 - 6.0), (1.9, 0.8, 4.6), p=2.2, rot=(0, 10, 0))
    g.blob((fx0 + 1.4, y0 - 3.4, z0 - 5.0), (1.7, 0.8, 4.0), p=2.2, rot=(0, -12, 0))
    rig.part("tassel", g, BONE, outline=0.6)
    # team-dyed leg wraps
    for side, y in (("r", -5.4), ("l", 5.4)):
        g = Geo().capsule((0.7, y, 8.4), (1.0, y, 5.2), 4.2, 4.0)
        rig.part(f"shin_{side}", g, team=True, outline=0.7)
    # a quiver of spare flint points on his back
    g = Geo().capsule((-8.5, 3.0, 26.0), (-12.5, 3.0, 42.0), 3.4, 3.8)
    rig.part("torso", g, "#7A5E48")
    g = Geo()
    for dx, dz in ((0.0, 0.0), (-2.6, -1.0), (2.2, -1.4)):
        g.lathe([(0, 0), (1.8, 1.0), (2.1, 3.2), (0, 6.4)], (-12.8 + dx, 3.0, 42.6 + dz),
                (-14.0 + dx, 3.0, 49.0 + dz), segs=8, squash=(1.0, 0.5))
    rig.part("torso", g, FLINT, finish="gloss", outline=0.6)
    rig.track("_foot", "shin_r", (2.9, -5.4, 0.5))
    ARM_R = body.arm("r", "spear", tip)
    ARM_L = body.arm("l")


ARM_R = ARM_L = None
TIPSPEC = None  # set in build() (the v1 ribbon smear is replaced by smear2 overlays)


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
    peer = [0.0, 0.6, 1.0, 1.0, 0.5, 0.0][f]

    def extra(ctx):
        return merge(off_arm(-28 + 118 * peer, 4 + 150 * peer), {
            "arm_r": {"r": 2 * ctx["lag"]}, "spear": {"r": -3 * ctx["lag"]},
            "head": {"r": -4 * peer}, "brow": {"z": -0.6 * peer}, "pupils": {"x": 0.5 * peer}})
    base = {k: v for k, v in stance().items() if k not in ("arm_l", "fore_l")}
    return M.idle_v2(f, base, frames=6, extra=extra, face_blink=F.expr("blink"), blink=5)


def _walk(f):
    def extra(ctx):
        return {"hips": {"z": -2.2}, "spear": {"r": 4 * math.cos(ctx["lag_p"])},
                "arm_l": {"r": -8 * math.cos(ctx["p"])}}
    return M.walk_v2(f, stance(), HEIGHT_LU, thigh=40.0, knee=70.0, lift_lu=6.0, bob_pct=0.045,
                     lean=-12.0, arm=10.0, fore=6.0, arms=("r",), extra=extra)


# 11 unique frames, moves.SMALL_MELEE_MS
#         read  dip   wind  HOLD  hop  lead   IMP  quiver quiver pull settle
S_A = [-76, -120, 60, 100, 90, 30, -20, -18, -20, -60, -70]
S_B = [-10, -60, 100, 95, 75, 12, -26, -24, -26, -12, -8]
S_C = [12, 10, -10, -55, -50, -40, -36, -30, -41, 0, 12]
S_T = [-4, 6, 4, 8, 0, -14, -24, -20, -22, -10, -5]
S_Q = [-0.03, -0.12, 0.06, 0.11, 0.08, 0.02, -0.18, -0.06, -0.08, 0.0, 0.0]
S_X = [-0.5, -2.0, -2.5, -2.0, 5.0, 9.0, 12.0, 11.5, 11.0, 6.0, 1.5]
S_Z = [0.0, -2.8, 0.8, 2.4, 8.5, 4.5, -2.6, -1.2, -1.6, -0.4, 0.0]
S_H = [-2, 2, -6, -12, -10, 4, 12, 8, 8, 2, 0]
S_THR = [0, -10, -4, -6, 22, 30, 34, 28, 28, 10, 2]
S_SHR = [0, 8, 0, 0, -34, -24, -28, -22, -24, -6, 0]
S_THL = [4, 10, 4, 12, -8, -16, -22, -18, -18, -6, 0]
S_SHL = [-4, -12, -2, -14, -28, -10, -8, -6, -6, -2, 0]
S_OA = [-28, -80, 50, 100, 85, 25, -10, -10, -12, -30, -28]
S_OB = [4, -30, 90, 110, 80, 10, -14, -12, -14, 2, 4]


def _attack_pose(f):
    pose = merge(spear_arm(S_A[f], S_B[f], S_C[f], S_T[f]), off_arm(S_OA[f], S_OB[f]), {
        "torso": {"r": S_T[f]}, "head": {"r": S_H[f]},
        "thigh_r": {"r": S_THR[f]}, "shin_r": {"r": S_SHR[f]},
        "thigh_l": {"r": S_THL[f]}, "shin_l": {"r": S_SHL[f]},
    }, M.body_about((0, 0, 22), x=S_X[f], z=S_Z[f], q=S_Q[f]))
    if f == 3:   # on his toes
        pose = merge(pose, {"shin_r": {"r": -12}, "shin_l": {"r": -12}})
    if f in (4, 5):
        pose["spear"]["sx"] = 1.1
    if f in (7, 8):
        pose["spear"]["sz"] = 1.0 + (0.06 if f == 7 else -0.05)
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6, 7):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _attack_clip():
    tip = TIPSPEC["outer"]
    ov = {
        4: [{"kind": "streak", "joint": "spear", "point": tip, "color": FLINT_HI, "width_lu": 7.0, "from": 3}],
        5: [{"kind": "streak", "joint": "spear", "point": tip, "color": FLINT_HI, "width_lu": 8.0}],
        6: [{"kind": "dust", "joint": "spear", "point": tip, "ground_snap": True, "size_lu": 8.0, "puffs": 4,
             "seed": 3},
            {"kind": "burst", "joint": "spear", "point": tip, "r0_lu": 7.0, "r1_lu": 13.0, "n": 4, "a0": 30.0,
             "arc": 120.0}],
        7: [{"kind": "burst", "joint": "spear", "point": (tip[0] - 26.0, tip[1], tip[2]), "r0_lu": 3.0,
             "r1_lu": 6.0, "n": 2, "a0": 60.0, "arc": 60.0, "color": "#FFFFFF"}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
                "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
                "arm_r": {"r": 12 * a}, "spear": {"r": 10 * a},
                "arm_l": {"r": 30 * a}, "brow": {"z": 1.4 * max(a, 0)}, "feathers": {"r": 12 * a}}
    return M.hit_light(k, stance(), recoil, face_hurt=F.expr("squeeze", "grit"))


def _die(k):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(stance(), M.die_d1(k, center_z=30.0, lie_z=10.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 60 * flail + 20}, "spear": {"r": 40 * flail},
        "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.8}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        # 6 unique idle poses in the same 920 ms (atlas budget)
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], M.WALK_MS, loop=True),
        _attack_clip(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_contract(cl)
