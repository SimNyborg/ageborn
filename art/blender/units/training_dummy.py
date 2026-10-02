"""Training Dummy: the tutorial-only Stone Age dummy (DESIGN A5.2, hidden card). 60 lu.

Look (A11): a comic straw-stuffed burlap dummy that walks on stubby straw-bundle legs:
a round sack head with button eyes and a stitched grin, straw tufts sticking out of the
top and the cuffs, twine ties, a team bullseye painted on its chest (it is a practice
target) and a team scarf whose tail streams behind (follow-through). It swings a wooden
practice club with a floppy, over-eager bonk. On death it bursts (the shared poof).

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`):
  idle    a rubbery wobble; walk  walk v3 hop-waddle (ANIM_SPEC G1, waddle: side sway)
  attack_b  spin-wobble slap: winds up, spins round on the spot and slaps with the club flat
  attack  SPRING-BACK BONK: the whole dummy bends far back like a spring, whips forward with
          the club (bold smear), bonks (impact lines, straw puff), then wobbles back and forth
  hit     light;  die  D3 dizzy spin and sit
"""
import math

from ageborn_art import face as F  # noqa: F401
from ageborn_art import gait as G
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from ageborn_art.rigs_stone import CaveBody

SLUG = "training_dummy"
GAIT_NAME = "biped"
NAME = "Training Dummy"
HEIGHT_LU = 60
CANVAS = (232, 208)
FEET = (104, 186)
ANCHORS = {"head": (0, 58), "hitCenter": (0, 28)}
NO_RETIME = True

SACK = "#C8B48C"
SACK_DK = "#A8966E"
STRAW = "#D9C48E"
TWINE = "#8A7358"
WOOD = "#A58B6C"
BUTTON = "#3A3029"
STITCH = "#5A4636"
PAINT_W = "#EDE3C8"


THIGH_Z, KNEE_Z, ANKLE_Z = 16.0, 9.2, 3.0   # walk v3: longer straw legs (ANIM_SPEC 2.0 rule 5)
LIFT = 1.5


def build(rig):
    global ARM_R, ARM_L, SMEAR2, RIG
    RIG = rig
    body = CaveBody(rig, SACK, None, hip_z=13.0, knee_z=KNEE_Z, ankle_z=ANKLE_Z, waist_z=14.0,
                    shoulder_z=31.0, neck_z=33.0, hip_y=5.4, shoulder_y=11.2,
                    elbow=(1.2, 24.5), wrist=(3.0, 18.5), leg_r=(3.8, 3.4, 3.4),
                    arm_r=(3.4, 3.0, 3.0), fist_r=3.5, torso=((0, 24.0), (10.4, 9.4, 10.6)),
                    torso_taper=(1.12, 0.9), foot_len=4.2, foot_fill=SACK_DK,
                    build_torso=False, thigh_z=THIGH_Z, foot_joint=True, far_shade=0.8)
    rig.rest_offset["torso"] = (0, 0, LIFT)
    fr = body.fist["r"]
    # twine ties at the knees and wrists, straw tufts poking out of the cuffs
    for side, y in (("r", -5.4), ("l", 5.4)):
        g = Geo().capsule((0.6, y, 10.2), (0.7, y, 7.4), 4.0, 4.0)
        rig.part(f"shin_{side}", g, team=True, outline=0.6)
    for side, y in (("r", -11.7), ("l", 11.7)):
        g = Geo().capsule((2.2, y, 20.8), (2.6, y, 18.4), 3.5, 3.5)
        rig.part(f"fore_{side}", g, team=True, outline=0.6)
    # a team-painted sack torso with a pale bullseye ring on the chest (it is a target)
    import math
    g = Geo().blob((0, 0, 24.0), (10.6, 9.6, 10.8), p=2.2, taper=(1.12, 0.9))
    rig.part("torso", g, team=True)
    n = (math.cos(math.radians(40)), -math.sin(math.radians(40)), 0.0)
    c0 = (0.0 + 8.2 * n[0], 8.2 * n[1], 24.6)
    ring = Geo().lathe([(3.6, 0), (6.0, 0.1), (6.0, 1.2), (3.6, 1.3)], c0,
                       (c0[0] + n[0], c0[1] + n[1], c0[2]), segs=24)
    ring.lathe([(0, 0), (1.5, 0.3), (1.5, 1.9), (0, 2.2)], (c0[0] + 0.8 * n[0], c0[1] + 0.8 * n[1], c0[2]),
               (c0[0] + 1.8 * n[0], c0[1] + 1.8 * n[1], c0[2]), segs=14)
    rig.part("torso", ring, PAINT_W, outline=0)
    g = Geo().lathe([(8.0, 0), (9.4, 0.5), (9.6, 3.2), (8.2, 4.0)], (0.8, 0, 30.4), (0.4, 0, 34.4), segs=22)
    rig.part("torso", g, team=True)
    rig.secondary("scarf", "torso", (-6.0, -3.0, 32.0), (-15.0, -3.0, 24.0), max_deg=20, gain=1.4)
    g = Geo().slab([(-5.0, 34.0), (-16.0, 27.0), (-18.5, 19.5), (-12.5, 20.5), (-6.0, 29.0)], -4.0, 1.8)
    rig.part("scarf", g, team=True, outline=0.8)
    g = Geo().capsule((0.8, -8.6, 20.0), (0.8, 8.6, 20.0), 1.3)
    rig.part("torso", g, TWINE, outline=0.6)

    # head: a round sack tied at the neck, button eyes, stitched grin, straw hair
    g = Geo().blob((1.6, 0, 44.0), (10.6, 10.2, 10.4), p=2.2)
    rig.part("head", g, SACK)
    g = Geo().capsule((0.6, -6.4, 34.6), (0.6, 6.4, 34.6), 2.0)
    rig.part("head", g, TWINE, outline=0.6)
    g = Geo()
    for y, z in ((-4.2, 46.0), (3.6, 46.4)):
        g.lathe([(0, 0), (2.4, 0.1), (2.6, 0.9), (2.0, 1.4), (0, 1.5)], (10.9, y, z),
                (12.6, y - 0.9, z), segs=16)
    rig.part("head", g, BUTTON, outline=0, finish="gloss")
    g = Geo()
    for y, z in ((-4.2, 46.0), (3.6, 46.4)):
        g.sphere((12.2, y - 0.9, z + 0.8), 0.6, cuts=2)
    rig.part("head", g, PAINT_W, outline=0, highlight=False)
    rig.joint("mouth", "head", (11.6, 0, 39.6))
    g = Geo()
    pts = [(10.4, -5.0, 40.8), (11.4, -2.6, 39.4), (11.8, 0.0, 39.0), (11.4, 2.6, 39.4), (10.4, 4.8, 40.6)]
    for p0, p1 in zip(pts, pts[1:]):
        g.capsule(p0, p1, 0.7)
    for p in pts[1:-1]:
        g.capsule((p[0], p[1], p[2] + 1.3), (p[0], p[1], p[2] - 1.3), 0.45)
    rig.part("mouth", g, STITCH, outline=0)
    rig.joint("oh", "head", (11.4, 0, 39.6), hidden=True)
    g = Geo().blob((11.4, -0.4, 39.4), (1.4, 2.4, 2.4), p=2.2)
    rig.part("oh", g, STITCH, outline=0, highlight=False)
    rig.secondary("straw", "head", (0.0, 0, 53.0), (-3.0, 0, 62.0), max_deg=14, gain=1.2)
    g = Geo()
    for (x1, y1, z1), r in (((-1.0, -3.0, 61.5), 1.6), ((4.0, 1.0, 60.5), 1.4), ((-6.0, 2.0, 60.0), 1.5),
                            ((-9.0, -2.0, 57.5), 1.4), ((6.5, -3.0, 58.0), 1.2), ((1.5, 4.5, 61.0), 1.3)):
        g.capsule((0.0, 0, 52.0), (x1, y1, z1), r, 0.5)
    rig.part("straw", g, STRAW, finish="hair")
    # straw tufts poking out of the cuffs
    for side, y in (("r", -11.7), ("l", 11.7)):
        g = Geo()
        for dx, dz in ((-1.5, -1.0), (1.0, -2.0), (3.2, -0.5)):
            g.capsule((2.2, y, 21.5), (2.2 + dx, y, 21.5 + 5.0 - dz), 0.9, 0.4)
        rig.part(f"arm_{side}", g, STRAW, finish="hair", outline=0.6)

    # practice club: a wooden stick with a padded head bound in twine, along +Z
    rig.joint("club", "fore_r", fr)
    g = Geo().capsule((fr[0], fr[1] - 0.5, fr[2] - 3.0), (fr[0], fr[1] - 0.5, fr[2] + 18.0), 1.5, 1.8)
    rig.part("club", g, WOOD)
    g = Geo().blob((fr[0], fr[1] - 0.5, fr[2] + 21.0), (4.4, 4.4, 5.6), p=2.3)
    rig.part("club", g, SACK_DK)
    g = Geo().capsule((fr[0], fr[1] - 0.5, fr[2] + 17.4), (fr[0], fr[1] - 0.5, fr[2] + 18.4), 4.0, 4.0)
    rig.part("club", g, TWINE, outline=0.6)
    tip = (fr[0], fr[1] - 0.5, fr[2] + 21.0)
    rig.track("clubHead", "club", tip)
    SMEAR2 = {"kind": "arc", "joint": "club", "inner": (fr[0], fr[1] - 0.5, fr[2] + 14.0),
              "outer": (fr[0], fr[1] - 0.5, fr[2] + 26.0), "color": SACK, "taper": 0.15, "lines": 3}
    rig.track("_foot", "foot_r", (2.0, -5.4, 0.0))
    rig.track("_foot_l", "foot_l", (2.0, 5.4, 0.0))
    ARM_R = body.arm("r", "club", tip)
    ARM_L = body.arm("l")


ARM_R = ARM_L = None
SMEAR2 = None


def club_arm(a, b, c):
    return ARM_R.pose(a, b, c)


def off_arm(a, b):
    return ARM_L.pose(a, b)


def stance():
    # club held up over the shoulder, far arm out for balance (a proud, silly pose)
    return merge(club_arm(-50, 40, 155), off_arm(-40, -20), {"torso": {"r": -2}})


def _idle(f):
    def extra(ctx):
        w = math.sin(2 * math.pi * f / 8)
        return {"torso": {"r": 3 * w}, "head": {"r": -5 * w}, "arm_l": {"r": 10 * ctx["lag"]},
                "club": {"r": -6 * ctx["lag"]}, "straw": {"r": 4 * ctx["lag"]}}
    return M.idle_v2(f, stance(), bob=2.0, chest=0.045, extra=extra)


# -- walk v3: G1 hop-waddle at ground speed (card 50 x 1.25 = 62.5 lu/s), 8 x 85 ms ----------------
RIG = None
SPEED = 62.5
LEGS = {s: G.Leg(f"thigh_{s}", f"shin_{s}", (1.0, y, ANKLE_Z), foot=f"foot_{s}",
                 toe=(4.5, y, 0.4), heel=(-1.3, y, 0.4)) for s, y in (("r", -5.4), ("l", 5.4))}
GAIT = G.Gait(8, 720, SPEED, G.biped_feet(LEGS["l"], LEGS["r"], x_mid=1.2), 0.36,
              lift=6.0, kick=2.0, reach=0.0, toe_off=18.0, early_lift=1.6, drag=0.3, lift_peak=0.38)
for _k, (_leg, _ph, _x, _gz) in list(GAIT.feet.items()):
    GAIT.feet[_k] = (_leg, _ph - 0.03, _x, _gz)


class _OffArm:
    @staticmethod
    def pose(a, b):
        return off_arm(a, b)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"torso": {"rx": 7 * math.sin(ctx["p"])}, "club": {"r": -8 * lag},
                "straw": {"r": 8 * lag}}
    return M.walk_v3(RIG, f, stance(), GAIT, legs=LEGS, lean=-6.0, twist=4.0, nod=4.0, sway=5.0,
                     arms={"l": _OffArm}, arm=35.0, elbow=(20.0, 50.0), extra=extra, report=report)


# 11 unique frames, moves.SMALL_MELEE_MS: bend back like a spring, whip, bonk, wobble
#         read  dip  bend  HOLD  whip  whip  BONK wob+ wob- wob+ settle
TA = [40, 70, 100, 120, 70, 10, -30, -18, -28, -22, -50]
TB = [80, 110, 140, 160, 60, -10, -20, 0, -16, 10, 40]
TC = [140, 165, 180, 190, 70, -10, -5, 20, 0, 60, 155]
TT = [4, 12, 26, 34, -4, -20, -24, -12, -20, -8, -2]
TH = [2, 8, 16, 22, -8, -18, -20, 6, -12, 4, 0]
TQ = [-0.04, -0.1, 0.06, 0.14, 0.08, 0.0, -0.2, 0.08, -0.08, 0.03, 0.0]
TX = [-0.5, -1.5, -3.0, -4.0, 1.0, 4.0, 5.0, 3.0, 4.0, 2.0, 0.0]


def _attack_pose(f):
    pose = merge(club_arm(TA[f], TB[f], TC[f]), off_arm([-20, 0, 20, 30, -40, -90, -110, -70, -95, -60, -40][f],
                                                     [0, 20, 40, 50, -10, -50, -60, -30, -45, -25, -20][f]), {
        "torso": {"r": TT[f]}, "head": {"r": TH[f]},
        "straw": {"r": -1.2 * TT[f]},
        "thigh_r": {"r": [0, -6, -8, -10, 10, 20, 20, 12, 16, 6, 0][f]},
        "thigh_l": {"r": [0, 6, 8, 10, -6, -14, -14, -8, -12, -4, 0][f]},
    }, M.body_about((0, 0, 18), x=TX[f], q=TQ[f]))
    if f in (4, 5):
        pose["club"]["sx"] = 1.3
    if f in (4, 5, 6, 7):
        pose.update({"mouth": {"hide": True}, "oh": {"show": True}})
    return pose


def _attack_clip():
    tip = SMEAR2["outer"]
    ov = {4: [dict(SMEAR2)], 5: [dict(SMEAR2, t1=0.8)],
          6: [{"kind": "burst", "joint": "club", "point": tip, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5, "a0": 0.0,
               "arc": 180.0},
              {"kind": "dust", "joint": "straw", "point": (0.0, 0.0, 60.0), "size_lu": 5.0, "puffs": 3,
               "seed": 41, "color": "#E4D29E"}]}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


# -- attack B: spin-wobble slap (ANIM_SPEC appendix B; the tutorial dummy gets no C) ---------------
# unique: 0 = A read, 1 = A dip, 2 twist (winds the torso back), 3 HOLD (wound up, the club flat
# behind), 4 spin (back to the viewer), 5 spin (three quarters), 6 IMPACT (the flat slap in front),
# 7-10 = A wobble and settle
B_SEQ = list(range(11))
#        twist  HOLD  spin  spin   SLAP
B_RZ = [-40, -75, 110, 250, 365]
B_A = [10, 20, -10, -10, 0]
B_B = [30, 40, 0, 0, 10]
B_C = [170, 185, 10, 10, 10]
B_T = [6, 12, 0, -6, -16]
B_Q = [-0.04, 0.08, 0.04, 0.0, -0.18]
B_X = [-1.0, -2.0, 1.0, 3.0, 5.0]


def _b_pose(i):
    if i in (0, 1) or i >= 7:
        return _attack_pose(i)
    k = i - 2
    pose = merge(club_arm(B_A[k], B_B[k], B_C[k]), off_arm([-20, 10, -60, -90, -110][k], [0, 30, -20, -40, -60][k]), {
        "torso": {"r": B_T[k], "rz": B_RZ[k]}, "head": {"r": [4, 10, 0, -6, -18][k]},
        "straw": {"r": [-6, -14, 10, 14, 20][k]},
        "thigh_r": {"r": [-4, -8, 6, 14, 20][k]}, "thigh_l": {"r": [4, 8, -6, -12, -14][k]},
    }, M.body_about((0, 0, 18), x=B_X[k], q=B_Q[k]))
    if k >= 2:
        pose.update({"mouth": {"hide": True}, "oh": {"show": True}})
    return pose


def _attack_b():
    tip = SMEAR2["outer"]
    spin = dict(SMEAR2, t0=0.0, t1=0.95, samples=18, band=0.42)
    ov = {4: [dict(spin, **{"from": 3})], 5: [dict(spin, **{"from": 4})],
          6: [dict(spin, t0=0.3, **{"from": 5}),
              {"kind": "burst", "joint": "club", "point": tip, "r0_lu": 8.0, "r1_lu": 14.0, "n": 5, "a0": -60.0,
               "arc": 120.0},
              {"kind": "dust", "joint": "straw", "point": (0.0, 0.0, 60.0), "size_lu": 5.0, "puffs": 3,
               "seed": 42, "color": "#E4D29E"}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 7: ("attack", 7), 8: ("attack", 8), 9: ("attack", 9),
             10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, overlays=ov, reuse=reuse)


def _hit(k):
    def recoil(a):
        return {"head": {"r": 18 * a}, "torso": {"r": 14 * a}, "thigh_r": {"r": 22 * max(a, 0)},
                "arm_r": {"r": 20 * a}, "club": {"r": 16 * a}, "arm_l": {"r": 40 * a}, "straw": {"r": -12 * a}}
    return M.hit_light(k, stance(), recoil, face_hurt={"mouth": {"hide": True}, "oh": {"show": True}})


def _die(k):
    sit = [0.0, 0.0, 0.0, 0.2, 1.0, 0.9, 1.0, 1.0, 1.0, 1.0][k]
    flail = [0.3, 0.8, 1.0, 0.8, 0.3, 0.2, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(stance(), M.die_d3(k, center_z=24.0, height=HEIGHT_LU), {
        "hips": {"z": -12.0 * sit},
        "thigh_r": {"r": 85 * sit}, "shin_r": {"r": -30 * sit},
        "thigh_l": {"r": 80 * sit}, "shin_l": {"r": -25 * sit},
        "torso": {"r": 28 * sit + 8 * flail}, "head": {"r": 14 * flail - 18 * sit, "rx": 14 * sit},
        "arm_r": {"r": 60 * flail + 30 * sit}, "club": {"r": 40 * flail + 40 * sit},
        "arm_l": {"r": 90 * flail + 45 * sit},
        "straw": {"r": 20 * flail},
    })
    pose.update({"mouth": {"hide": True}, "oh": {"show": True}})
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
