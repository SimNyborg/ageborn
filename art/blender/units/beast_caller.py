"""Beast Caller: Stone Age epic support summoner (CONTENT_PLAN 5.1, X0 M3). Sends a Cave Pup every
8 s (two at most; the game draws the summon puff and leash line). Staff, blunt, 64 lu.

Look (A11, PLAN.md): a lean, hunched beast-master in a wolf-skull hood (the grey skull's snout over
her brow, ears up, the pelt hanging down her back), a team shawl of stitched hides with dangling
teeth and claws, a team skirt, bare feet with fur anklets, and a gnarled staff topped with a
bound bone fetish and feathers. Sharp eyes, a sly grin.

"A viewer expects it to poke with its staff, howl with cupped hands to call beasts, and to sneak."

Animation (ANIM_SPEC G1 sneak, appendix B staff: a poke, an overhead swat, a low sweep):
  idle      cups both hands at her mouth and howls (the summon beat as a character beat), blink
  walk      walk v3 sneaking jog (card 65 x 1.25 = 81.25 lu/s): low and long, the staff held
            across the body, the hood's pelt flapping
  attack    STAFF POKE: draws the staff back along the forearm (held extreme) and jabs the fetish
            end forward
  attack_b  OVERHEAD SWAT: lifts the staff high in both hands and swats it down
  attack_c  LOW SWEEP: crouches and sweeps the staff's foot round at ankle height
  hit       light;  die  D3 dizzy spin, sits down, the hood slips over her eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_stone as K
from ageborn_art import moves as M
from ageborn_art.anim import merge
from ageborn_art.geometry import Geo

SLUG = "beast_caller"
GAIT_NAME = "biped"
NAME = "Beast Caller"
HEIGHT_LU = 66
CANVAS = (284, 236)
FEET = (124, 210)
ANCHORS = {"head": (2, 62), "hitCenter": (0, 29)}
NO_RETIME = True

SKIN = "#C49C80"
HAIR = "#2F2622"
SKULL = "#E2D8C2"
SKULL_DK = "#B8AC94"
PELT = "#8A8378"
WOOD = "#8A6E54"
WOOD_DK = "#6A5240"
BONE = "#EDE3C8"
FEATHER = "#E9DFC9"
FUR = "#7A6B5E"

HIP_Y, SH_Y = 5.6, 11.2
STAFF_UP, STAFF_DN = 22.0, 18.0


def _staff(rig, joint, fist):
    fx, fy, fz = fist
    g = Geo().capsule((fx, fy, fz - STAFF_DN), (fx, fy, fz + STAFF_UP), 1.5, 1.3)
    for z in (-8.0, 6.0, 14.0):
        g.blob((fx + 0.8, fy - 0.4, fz + z), (1.9, 1.7, 1.6), p=2.0)
    rig.part(joint, g, WOOD)
    g = Geo().blob((fx + 1.0, fy, fz + STAFF_UP + 2.6), (3.2, 2.8, 3.6), p=2.2)     # bone fetish
    g.lathe([(1.0, 0), (0.6, 1.8), (0, 3.4)], (fx + 3.0, fy - 0.6, fz + STAFF_UP + 4.0), (fx + 5.6, fy - 0.6, fz + STAFF_UP + 6.4), segs=8)
    rig.part(joint, g, BONE, outline=0.6)
    g = Geo()
    for dz in (-1.0, 2.0):
        g.lathe([(1.8, 0), (2.1, 0.4), (2.1, 1.6), (1.8, 2.0)], (fx, fy, fz + STAFF_UP + dz - 3.0), segs=12)
    rig.part(joint, g, team=True, outline=0.5)
    g = Geo()
    for a in (-0.5, 0.2):
        g.blob((fx - 2.0 + a * 2, fy - 1.0, fz + STAFF_UP - 1.0 - abs(a) * 4), (1.0, 0.6, 3.6), p=2.2, rot=(0, 25 + a * 20, 0))
    rig.part(joint, g, FEATHER, outline=0.4)


def build(rig):
    global RIG, ARM_R, ARM_L, TIP, FOOT
    RIG = rig
    body = K.body(rig, SKIN, FUR, stocky=0.95, hip_y=HIP_Y, shoulder_y=SH_Y, torso_r=(9.8, 8.8, 10.0), foot_len=4.4)
    fr, fl = body.fist["r"], body.fist["l"]
    K.pelt(rig, FUR, emblem=False, r=(10.6, 9.6, 7.8), skirt_r=(11.0, 9.8, 4.8))
    K.wraps(rig, HIP_Y, SH_Y, wrists=("r", "l"))
    # team hide shawl over the shoulders with dangling teeth and claws
    g = Geo().blob((0.6, 0, 33.6), (11.8, 11.6, 5.4), p=2.4, taper=(1.05, 0.9))
    rig.part("torso", g, team=True)
    g = Geo()
    for k in range(6):
        a = -1.0 + k * 0.42
        x, y = math.cos(a) * 11.0 + 0.6, math.sin(a) * 10.8
        g.lathe([(0.9, 0), (0.6, 1.4), (0, 3.2)], (x, y, 29.2), (x + 0.4, y * 1.04, 25.6), segs=6)
    rig.part("torso", g, BONE, outline=0.4)
    # wolf-skull hood: the skull over the brow, the pelt hanging down the back
    hood = Geo().blob((-1.0, 0, 54.4), (11.4, 11.2, 7.0), p=2.2)
    hood.blob((-7.0, 0, 47.4), (5.6, 10.6, 8.6), p=2.2)
    K.head(rig, SKIN, z=46.5, r=(10.2, 9.8, 10.0), jaw=(7.0, 7.8, 5.0), extra_geos=(hood,), brow_col=HAIR, grin="smile")
    rig.part("head", hood, PELT, finish="hair")
    g = Geo().blob((5.0, 0, 57.4), (8.0, 7.0, 4.4), p=2.2)
    g.lathe([(3.6, 0), (3.0, 3.0), (2.2, 6.0), (0, 7.0)], (9.0, 0, 57.0), (16.6, 0, 55.0), segs=14)
    rig.part("head", g, SKULL)
    g = Geo()
    for y in (-3.0, 3.0):
        g.blob((8.6, y, 58.6), (1.8, 1.4, 1.6), p=2.0)   # dark eye sockets
    g.blob((16.2, 0, 55.6), (1.2, 1.4, 1.0), p=2.0)
    rig.part("head", g, "#3A322E", outline=0)
    g = Geo()
    for y in (-2.4, 2.4):   # teeth along the skull's brim
        g.lathe([(0.8, 0), (0, 2.0)], (14.4, y, 53.4), (14.8, y, 51.4), segs=6)
    rig.part("head", g, SKULL_DK, outline=0.3)
    g = Geo()
    for y in (-1, 1):
        g.lathe([(2.6, 0), (1.6, 3.0), (0, 6.4)], (1.0, 6.6 * y, 60.0), (-0.4, 7.6 * y, 66.4), segs=8, squash=(1.0, 0.55))
    rig.part("head", g, PELT, finish="hair")
    rig.secondary("hoodtail", "head", (-10.0, 0, 50.0), (-14.0, 0, 30.0), max_deg=16, gain=1.3)
    g = Geo().blob((-12.0, 0, 40.0), (3.4, 8.6, 10.4), p=2.4, taper=(1.2, 0.7))
    for y in (-5.0, 0.0, 5.0):
        g.lathe([(2.2, 0), (0, -3.2)], (-12.6, y, 30.6), segs=8)
    rig.part("hoodtail", g, PELT, finish="hair")
    # the staff in the near fist
    rig.joint("staff", "fore_r", fr)
    _staff(rig, "staff", fr)
    TIP = (fr[0] + 1.0, fr[1], fr[2] + STAFF_UP + 3.0)
    FOOT = (fr[0], fr[1], fr[2] - STAFF_DN)
    rig.track("staffTip", "staff", TIP)
    ARM_R = body.arm("r", "staff", (fr[0], fr[1], fr[2] + STAFF_UP))
    ARM_L = body.arm("l")


RIG = ARM_R = ARM_L = TIP = FOOT = None
SPEED = 81.25
LEGS = K.legs(HIP_Y)
GAIT = K.jog(LEGS, SPEED, cycle=640, stance=0.40, lift=6.0)


def staff(a, b, c, rz=0.0):
    p = ARM_R.pose(a, b, c)
    if rz:
        p["arm_r"]["rz"] = rz
    return p


def off(a, b):
    return ARM_L.pose(a, b)


def stance():
    return merge(staff(-40, 10, 80), off(-60, -10), {"torso": {"r": -6}})


def _idle(f):
    howl = [0.0, 0.3, 0.8, 1.0, 1.0, 0.7, 0.2, 0.0][f]

    def extra(ctx):
        return merge(off(-60 + 130 * howl, -10 + 140 * howl), staff(-40, 10, 80),
                     {"head": {"r": 22 * howl}, "torso": {"r": 8 * howl}, "hoodtail": {"r": 4 * ctx["lag"]}},
                     F.expr("o", "squeeze") if howl > 0.9 else {})
    return M.idle_v2(f, K.strip(stance(), "arm_r", "fore_r", "staff", "arm_l", "fore_l"), extra=extra,
                     face_blink=F.expr("blink"), blink=6)


def _walk(f, report=None):
    def extra(ctx):
        lag = ctx["bob_lag"] / max(ctx["amp"], 1e-3)
        return {"staff": {"r": -4 * lag}, "hoodtail": {"r": -10 + 6 * lag}}
    carry = merge({"torso": {"r": -4}}, staff(-60, 20, 150))
    return M.walk_v3(RIG, f, carry, GAIT, legs=LEGS, bob=[-4.4, -5.2, -1.8, 0.8], lean=-16.0, twist=6.0, nod=3.0,
                     arms={"l": K.Arm(ARM_L)}, arm=30.0, elbow=(40.0, 70.0), extra=extra, report=report)


# attack A: staff poke. 11 unique frames, SMALL_MELEE_MS
#        read  draw  draw2 HOLD  thrust lead IMP   recoil back  settle settle
A_A = [-40, -60, -100, -120, -40, -10, 0, -10, -25, -35, -40]
A_B = [10, -20, -60, -80, -20, -2, 2, 0, 0, 5, 10]
A_C = [80, 20, 5, 0, 2, 0, -2, 10, 40, 70, 80]
A_X = [-0.5, -1.5, -3.0, -4.0, 2.0, 6.0, 9.0, 8.0, 5.0, 2.0, 0.5]
A_Z = [0.0, -1.4, -2.4, -3.0, -2.0, -2.6, -3.2, -2.0, -1.0, -0.4, 0.0]
A_Q = [-0.03, -0.06, -0.06, -0.08, 0.08, 0.04, -0.14, 0.03, -0.04, 0.01, 0.0]
A_T = [-6, 2, 10, 14, -8, -16, -22, -16, -10, -8, -6]
A_THR = [0, -6, -10, -12, 18, 30, 36, 30, 18, 6, 1]
A_SHR = [0, 8, 10, 12, -18, -26, -22, -16, -10, -4, 0]
A_THL = [0, 8, 12, 14, -8, -18, -26, -22, -14, -4, -1]
A_SHL = [0, -12, -18, -22, -12, -8, -4, -4, -2, 0, 0]


def _attack_pose(f):
    pose = merge(staff(A_A[f], A_B[f], A_C[f]), off(-60, -10), {
        "torso": {"r": A_T[f]}, "head": {"r": -A_T[f] * 0.4},
        "thigh_r": {"r": A_THR[f]}, "shin_r": {"r": A_SHR[f]},
        "thigh_l": {"r": A_THL[f]}, "shin_l": {"r": A_SHL[f]},
    }, M.body_about((0, 0, 20), x=A_X[f], z=A_Z[f], q=A_Q[f]))
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.8}})
    elif f in (4, 5, 6):
        pose = merge(pose, F.expr("yell"), {"brow": {"z": -1.0}})
    return pose


def _attack_clip():
    ov = {4: [{"kind": "streak", "joint": "staff", "point": TIP, "color": BONE, "width_lu": 7.0, "white": 0.4, "from": 3}],
          6: [{"kind": "burst", "joint": "staff", "point": TIP, "r0_lu": 6.0, "r1_lu": 11.0, "n": 5, "a0": -60.0, "arc": 120.0},
              {"kind": "dust", "ground": (12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 121, "spread": 0.8}]}
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS,
                  impact=M.SMALL_MELEE_IMPACT, smear=4, overlays=ov)


B_SEQ = [0, 1, 1, 2, 3, 3, 4, 5, 5, 6, 7]
C_SEQ = B_SEQ


def _v_pose(tab, i, off_arm):
    a, b, c, x, z, q, t, thr, shr, thl, shl = tab[i - 1]
    pose = merge(staff(a, b, c), off(*off_arm), {
        "torso": {"r": t}, "head": {"r": -t * 0.5},
        "thigh_r": {"r": thr}, "shin_r": {"r": shr}, "thigh_l": {"r": thl}, "shin_l": {"r": shl},
    }, M.body_about((0, 0, 20), x=x, z=z, q=q))
    return merge(pose, F.expr("grit" if i < 3 else "yell"), {"brow": {"z": -1.0}})


# attack B: overhead swat. 1 lift, 2 HOLD (staff high over the head in both hands, up on the toes),
# 3 smear, 4 IMPACT (staff swatted down in front, squash), 5 follow
B_TAB = [
    (40, 90, 150, -1.0, 1.0, 0.04, 6, 2, -4, 2, -4),
    (90, 120, 170, -2.0, 2.4, 0.10, 12, 2, -10, 2, -10),
    (40, 40, 60, 3.0, 1.0, 0.04, -10, 18, -16, -10, -6),
    (-20, -30, -20, 6.0, -2.6, -0.16, -24, 24, -16, -20, -6),
    (-20, -20, 0, 5.0, -1.4, -0.04, -18, 18, -12, -16, -4),
]


def _b_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    return _v_pose(B_TAB, i, (60 + 30 * (i < 3), 110))


def _attack_b():
    arc = {"kind": "arc", "joint": "staff", "inner": (TIP[0], TIP[1], TIP[2] - 10), "outer": TIP, "color": BONE,
           "taper": 0.1, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.35}
    ov = {3: [dict(arc, **{"from": 2})],
          4: [{"kind": "burst", "joint": "staff", "point": TIP, "r0_lu": 7.0, "r1_lu": 13.0, "n": 5, "a0": -20.0, "arc": 140.0},
              {"kind": "dust", "ground": (16.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 122, "spread": 0.8}]}
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4, sequence=B_SEQ,
                  overlays=ov, reuse=reuse)


# attack C: low sweep. 1 crouch, 2 HOLD (deep crouch, the staff's foot cocked back behind), 3 smear,
# 4 IMPACT (the staff's foot swept through at ankle height in front), 5 follow
C_TAB = [
    (-80, -60, 200, -1.0, -3.0, -0.08, 6, 20, -34, -12, -14),
    (-100, -80, 215, -2.0, -6.0, -0.12, 10, 36, -64, -22, -24),
    (-80, -60, 180, 2.0, -6.0, -0.06, -6, 38, -62, -26, -20),
    (-60, -40, 170, 5.0, -6.4, -0.14, -12, 38, -58, -28, -18),
    (-55, -30, 160, 4.0, -5.0, -0.04, -10, 30, -46, -22, -14),
]


def _c_pose(i):
    if i == 0:
        return _attack_pose(0)
    if i >= 6:
        return _attack_pose(i + 3)
    p = _v_pose(C_TAB, i, (-80, -40))
    p["arm_r"]["rz"] = [60, 120, 40, -20, -40][i - 1]
    return p


def _attack_c():
    arc = {"kind": "arc", "joint": "staff", "inner": (FOOT[0], FOOT[1], FOOT[2] + 8), "outer": FOOT, "color": WOOD,
           "taper": 0.1, "t0": 0.0, "t1": 0.9, "lines": 3, "white": 0.35, "samples": 16}
    ov = {3: [dict(arc, **{"from": 2})],
          4: [{"kind": "dust", "ground": (14.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 123, "spread": 1.2}]}
    reuse = {0: ("attack", 0), 6: ("attack", 9), 7: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(8)], M.SMALL_MELEE_MS, impact=4, sequence=C_SEQ,
                  overlays=ov, reuse=reuse)


def _hit(k):
    return K.hit(k, stance(), extra=lambda a: {"staff": {"r": 16 * a}, "hoodtail": {"r": 12 * a}})


def _die(k):
    return K.die_d3(k, stance(), HEIGHT_LU, extra=lambda kk, sit: {"staff": {"r": 50 * sit}}, center_z=26.0)


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES)], [M.IDLE_MS] * M.IDLE_FRAMES, loop=True),
        M.walk_clip("walk", RIG, _walk, GAIT, "biped"),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
