"""Rockfall Shaman: Stone Age epic caster (CONTENT_PLAN 5.1). Every 9 s a boulder falls on the nearest
enemy within 380 lu after 1.0 s (the game draws the shadow and the falling boulder); a staff-sling
pebble (proj.rock) for the plain attack. 66 lu.

Look (A11, PLAN.md): a round, wise old shaman with a long white beard, a tall headdress of bone
beads and grey stone discs on strings, a team cloak with a ragged hem and a team skirt (hem 9 lu
up), stone-bead necklaces, and a long bone-and-wood staff ending in a leather sling cup.

"A viewer expects it to swing its staff to sling stones and to slam the staff down to call a
rockfall, and to waddle under the bead headdress."

Animation (ANIM_SPEC G2 brisk waddle, appendix B casters: two releases):
  idle      leans on the staff, the beads swing, he mutters and taps it, blink
  walk      walk v3 brisk waddle (card 60 x 1.25 = 75 lu/s), the staff planted as a walking stick on
            each contact, the headdress beads bouncing a frame late
  attack    STAFF SLING: raises the staff back over his shoulder (the cup loaded; the held extreme
            loops a chant frame), then whips it over the top (arc smear) and the pebble flies from
            the cup on the impact frame
  attack_b  GROUND SLAM: lifts the staff in both hands and slams its foot into the ground (rings and
            dust); a pebble pops up off the ground toward the foe
  hit       light;  die  D3 dizzy spin, sits down, the headdress tumbles over his eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "rockfall_shaman"
GAIT_NAME = "biped"
NAME = "Rockfall Shaman"
HEIGHT_LU = 66
CANVAS = (296, 252)
FEET = (128, 222)
ANCHORS = {"head": (2, 64), "hitCenter": (0, 29)}
NO_RETIME = True

SKIN = "#A88068"
BEARD = "#E6E0D4"
STONE = "#8E8A82"
STONE_LT = "#B7B2A8"
BONE = "#EDE3C8"
WOOD = "#8A6E54"
LEATHER = "#7A5E48"
ROCK = "#9A948A"
FUR = "#7A6B5E"

HIP_Y, SH_Y = 6.0, 11.8
STAFF_UP, STAFF_DN = 26.0, 16.0


def build(rig):
    global RIG, ARM_R, ARM_L, CUP, FOOT
    RIG = rig
    body = K.body(rig, SKIN, FUR, stocky=1.05, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(11.4, 10.4, 10.4), foot_len=4.4)
    fr, fl = body.fist["r"], body.fist["l"]
    K.wraps(rig, HIP_Y, SH_Y, wrists=())
    # team skirt (hem 9+ lu up) and a team cloak with a ragged hem
    rig.secondary("skirt", "hips", (0.5, 0, 22.0), (-1.0, 0, 12.0), max_deg=12, gain=1.0)
    rig.rest_offset["skirt"] = (0, 0, K.LIFT + 1.5)
    g = Geo().lathe([(9.4, 0), (11.6, 3.0), (12.6, 8.0), (13.0, 10.4), (0, 10.6)], (0.4, 0, 24.0), (0.4, 0, 13.4), segs=22)
    rig.part("skirt", g, team=True)
    rig.secondary("cloak", "torso", (-7.0, 0, 38.0), (-13.0, 0, 18.0), max_deg=14, gain=1.2)
    g = Geo().blob((-9.6, 0, 29.0), (4.0, 12.6, 11.0), p=2.4, taper=(1.25, 0.85))
    for y in (-8.0, -3.0, 2.5, 7.5):
        g.lathe([(2.4, 0), (0, -3.6)], (-11.0, y, 19.0), segs=8)
    rig.part("cloak", g, team=True)
    g = Geo().blob((0.6, 0, 33.4), (11.4, 11.0, 5.0), p=2.4)
    rig.part("torso", g, team=True)
    g = Geo()
    for k in range(7):
        a = -1.1 + k * 0.36
        g.sphere((math.cos(a) * 10.6 + 1.0, math.sin(a) * 10.0, 30.0 - 0.6 * abs(k - 3)), 1.5, cuts=2)
    rig.part("torso", g, STONE_LT, outline=0.4)
    # long white beard, bead-and-disc headdress
    beard = Geo().blob((7.0, 0, 40.0), (7.6, 9.2, 7.2), p=2.3)
    beard.blob((8.6, 0, 33.6), (4.6, 6.0, 5.0), p=2.3)
    cap = Geo().blob((-1.4, 0, 54.6), (10.6, 10.8, 6.4), p=2.2)
    K.head(rig, SKIN, z=47.0, r=(10.4, 10.0, 10.2), jaw=(7.4, 8.4, 5.2), eye_r=3.6, extra_geos=(beard, cap),
           brow_col=BEARD)
    rig.part("head", beard, BEARD, finish="hair")
    rig.part("head", cap, LEATHER, finish="hair")
    rig.secondary("beads", "head", (0.0, 0, 60.0), (-2.0, 0, 46.0), max_deg=14, gain=1.4)
    g = Geo()
    for k in range(5):
        a = math.radians(150 + k * 30)
        x, y = 1.0 + math.cos(a) * 10.8, math.sin(a) * 10.8
        for j in range(3):
            g.sphere((x, y, 55.0 - j * 3.0), 1.3, cuts=2)
    rig.part("beads", g, BONE, outline=0.4)
    g = Geo()
    for k, (x, z) in enumerate(((-2.0, 66.0), (3.4, 64.6), (-7.0, 64.0))):
        g.lathe([(3.4, 0), (3.6, 0.6), (3.6, 1.6), (3.2, 2.0)], (x, 0, z), (x, 0.8, z + 1.8), segs=14, rot=(70, 0, 0))
    rig.part("head", g, STONE)
    g = Geo().lathe([(10.4, 0), (11.2, 0.4), (11.2, 2.6), (10.2, 3.0)], (1.6, 0, 51.8), (0.4, 0, 54.6), segs=22)
    rig.part("head", g, team=True, outline=0.6)
    # the staff with a sling cup at its top end, in the near fist
    rig.joint("staff", "fore_r", fr)
    fx, fy, fz = fr
    g = Geo().capsule((fx, fy, fz - STAFF_DN), (fx, fy, fz + STAFF_UP), 1.5, 1.3)
    rig.part("staff", g, WOOD)
    g = Geo()
    for z in (-12.0, 8.0, 16.0):
        g.lathe([(1.7, 0), (2.0, 0.4), (2.0, 1.6), (1.7, 2.0)], (fx, fy, fz + z), segs=12)
    rig.part("staff", g, BONE, outline=0.4)
    CUP = (fx + 1.5, fy, fz + STAFF_UP + 2.2)
    g = Geo().blob(CUP, (3.4, 3.0, 2.2), p=2.2, taper=(0.8, 1.2))
    rig.part("staff", g, LEATHER, outline=0.6)
    g = Geo().lathe([(1.6, 0), (1.9, 0.4), (1.9, 1.6), (1.6, 2.0)], (fx, fy, fz + STAFF_UP - 3.0), segs=12)
    rig.part("staff", g, team=True, outline=0.4)
    rig.joint("pebble", "staff", CUP)
    rig.part("pebble", Geo().blob((CUP[0], CUP[1] - 0.6, CUP[2] + 1.6), (2.6, 2.4, 2.4), p=2.1), ROCK, outline=0.6)
    FOOT = (fx, fy, fz - STAFF_DN)
    rig.track("muzzle", "staff", CUP)
    ARM_R = body.arm("r", "staff", (fx, fy, fz + STAFF_UP))
    ARM_L = body.arm("l")


RIG = ARM_R = ARM_L = CUP = FOOT = None
SPEED = 75.0
LEGS = K.legs(HIP_Y)
GAIT = K.brisk(LEGS, SPEED, cycle=600, stance=0.44)


def staff(a, b, c):
    return ARM_R.pose(a, b, c)


def off(a, b):
    return ARM_L.pose(a, b)


def stance():
    return merge(staff(-50, 20, 92), off(-60, -10), {"torso": {"r": 3}})


def _idle(f):
    tap = [0.0, 0.0, 0.6, 1.0, 0.2, 0.0, 0.0, 0.0][f]

    def extra(ctx):
        return merge(staff(-50, 20 + 8 * tap, 92), off(-60, -10 + 10 * tap), {"beads": {"r": 8 * ctx["lag"]}},
                     F.expr("grit") if tap > 0.5 else {})
    return M.idle_v2(f, K.strip(stance(), "arm_r", "fore_r", "staff", "arm_l", "fore_l"), extra=extra,
                     face_blink=F.expr("blink"), blink=6)


def _walk(f, report=None):
    def extra(ctx):
        plant = 1.0 if ctx["key"] in (0, 1) else 0.0
        return merge(staff(-50 + 14 * math.cos(ctx["lag_p"] * 2), 20, 92 - 6 * plant),
                     {"beads": {"r": 8 * ctx["bob_lag"] / max(ctx["amp"], 1e-3)}, "torso": {"rx": 4.0 * math.sin(ctx["p"])}})
    return K.walk(RIG, f, {"torso": {"r": 3}}, GAIT, LEGS, arms={"l": K.Arm(ARM_L)}, robed=True, extra=extra, report=report)


# attack A: staff sling. 11 unique frames; frame 4 = chant (hold-loop partner)
#        read  lift  back  HOLD  chant  WHIP  IMP   follow return back  settle
A_A = [-50, -20, 80, 110, 108, 40, -10, -40, -50, -50, -50]
A_B = [20, 60, 130, 160, 158, 80, 20, -10, 0, 15, 20]
A_C = [92, 140, 190, 215, 212, 100, 30, 0, 50, 80, 92]
A_X = [0.0, -1.0, -2.0, -3.0, -3.0, 2.0, 5.0, 4.4, 2.0, 0.6, 0.0]
A_Z = [0.0, -0.6, 0.2, 0.8, 0.6, -0.4, -1.8, -0.8, -0.4, 0.0, 0.0]
A_Q = [-0.03, -0.05, 0.04, 0.08, 0.06, 0.02, -0.12, 0.03, -0.02, 0.0, 0.0]
A_T = [3, 8, 14, 18, 18, -6, -18, -12, -4, 2, 3]
A_THR = [0, -4, -6, -8, -8, 10, 20, 16, 6, 2, 0]
A_THL = [0, 4, 6, 8, 8, -4, -14, -10, -4, 0, 0]


def _attack_pose(f):
    pose = merge(staff(A_A[f], A_B[f], A_C[f]), off(-60 + 40 * (f in (3, 4)), -10 + 60 * (f in (3, 4))), {
        "torso": {"r": A_T[f]}, "head": {"r": -A_T[f] * 0.5},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": -abs(A_THR[f]) * 0.6},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": -abs(A_THL[f]) * 0.6},
        "pebble": {"hide": f in (6, 7)},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"))
    elif f == 4:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif f in (5, 6):
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_clip():
    arc = {"kind": "arc", "joint": "staff", "inner": (CUP[0], CUP[1], CUP[2] - 10), "outer": CUP, "color": WOOD,
           "taper": 0.1, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.4, "samples": 16}
    ov = {5: [dict(arc, **{"from": 4})],
          6: [{"kind": "burst", "joint": "staff", "point": CUP, "r0_lu": 5.0, "r1_lu": 10.0, "n": 5, "a0": -30.0, "arc": 120.0}]}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=5, overlays=ov, extra={"holdStep": 3, "holdLoop": [3, 4]})


# attack B: ground slam. 2 lift, 3 HOLD (staff high in both hands, foot down), 4 strain, 5 smear,
# 6 IMPACT (foot slammed into the ground in front, rings), 7 follow
def _b_pose(i):
    if i in (0, 1) or i >= 8:
        return _attack_pose(i)
    tab = [  # a, b, c, x, z, q, t
        (60, 100, 100, -1.0, 1.0, 0.04, 6),
        (100, 130, 100, -2.0, 2.4, 0.10, 12),
        (98, 128, 98, -2.0, 2.2, 0.08, 12),
        (20, 30, 80, 2.0, 0.0, 0.0, -8),
        (-40, -40, 70, 4.0, -2.4, -0.14, -18),
        (-30, -30, 75, 3.0, -1.2, -0.02, -12),
    ][i - 2]
    a, b, c, x, z, q, t = tab
    pose = merge(staff(a, b, c), off(a - 10, b - 10), {
        "torso": {"r": t}, "head": {"r": -t * 0.5},
        "thigh_r": {"r": -t * 0.8}, "thigh_l": {"r": t * 0.6},
        "pebble": {"hide": True},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q))
    return merge(pose, F.expr("grit" if i < 5 else "yell"))


def _attack_b():
    ov = {5: [{"kind": "streak", "joint": "staff", "point": FOOT, "color": WOOD, "width_lu": 7.0, "white": 0.4, "from": 4}],
          6: [{"kind": "rings", "joint": "staff", "point": FOOT, "radii_lu": (10.0, 17.0), "a0": 15.0, "a1": 165.0,
               "color": "#E6D8BE"},
              {"kind": "dust", "joint": "staff", "point": FOOT, "ground_snap": True, "size_lu": 9.0, "puffs": 5,
               "seed": 131, "spread": 1.3}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 8: ("attack", 8), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    return K.hit(k, stance(), extra=lambda a: {"staff": {"r": 14 * a}, "beads": {"r": 14 * a}, "cloak": {"r": 10 * a}})


def _die(k):
    return K.die_d3(k, stance(), HEIGHT_LU, extra=lambda kk, sit: {"staff": {"r": 50 * sit}}, center_z=26.0)


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
