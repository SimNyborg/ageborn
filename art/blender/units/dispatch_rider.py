"""Dispatch Rider: Industrial Age common infantry Raider (CONTENT_PLAN 5.5). A despatch motorcycle, ~66 lu.

Look (A11, Industrial palette): a goggled motorcycle courier hunched over an early motorbike: a team
leather helmet with ear flaps, brass goggles, a cream scarf streaming behind (a follow-through
secondary), a team jacket with a leather despatch satchel, breeches and tall boots on the foot pegs.
The bike: a team fuel tank with a cream cog, a black frame, a dark engine block with a brass
cylinder, a leather saddle, wide handlebars, a headlamp, an exhaust pipe and two wire wheels, each
with one bold cream rim mark so the roll reads. A big spanner hangs at his hip.

"A viewer expects a skidding wheelie bump and a spanner swing, and the motorbike to race along with
exhaust puffs and the scarf flapping."

Animation (ANIM_SPEC G6 wheeled, appendix B for a raider: ram, club swing, skid):
  idle      revs the engine (a puff), the scarf settles, he wipes his goggles, blink
  walk      the wheels turn 2 full turns per cycle at the ground speed (110 x 1.25 = 137.5
            lu/s; one rim mark at 90 degrees a frame, 952 ms cycle), the bike bounces, exhaust puffs, the scarf streams
  attack    WHEELIE BUMP: the front wheel rears up (the held extreme), then slams down onto the target
            with a dust burst and impact lines
  attack_b  SPANNER SWING: leans out of the saddle and swings the big spanner overhead and down
  attack_c  SKID KICK: the bike slews sideways in a spray of dust and he kicks out with his boot
  hit       light: he wobbles in the saddle, the bike bounces
  die       D1 fling: he is thrown over the handlebars, the helmet pops off; the bike tips over
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "dispatch_rider"
GAIT_NAME = "wheeled"
NAME = "Dispatch Rider"
HEIGHT_LU = 74
YAW_DEG = -10.0
CANVAS = (400, 310)
FEET = (190, 272)
ANCHORS = {"head": (6, 72), "hitCenter": (0, 30)}
NO_RETIME = True

R_W = 8.0
REAR, FRONT = -18.0, 20.0
BIKE_S = 1.3                                   # the bike is modelled small and scaled about the rear contact
R_EFF = R_W * BIKE_S
WALK_MS = 119                                 # 952 ms cycle: 137.3 lu/s
STRIDE = 2 * (2 * math.pi * R_EFF)            # two full turns per cycle (one rim mark): 130.7 lu
STEP = STRIDE / 8
ODO_AMP = STRIDE / 4
SEAT_Z = 11.5                                 # the rider sits this much above his standing pose
BODY_X = -3.0
CAP_C = (1.0, 0.0, 56.0)
FIST = (0.4, I.ARM_Y["r"] - 1.4, I.HAND_Z - 0.4)
SCARF = "#E8DFC8"
TYRE = "#2B2A2E"
SOOT = "#2F2D2E"


def _wheel(rig, name, x, y, far=False):
    from ageborn_art import colors as C
    k = 0.8 if far else 1.0
    sh = (lambda c: C.scale(c, k))
    rig.joint(name, "bike", (x, y, R_W))
    g = Geo()
    n = 18
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        g.capsule((x + (R_W - 1.2) * math.cos(a0), y, R_W + (R_W - 1.2) * math.sin(a0)),
                  (x + (R_W - 1.2) * math.cos(a1), y, R_W + (R_W - 1.2) * math.sin(a1)), 1.8, segs=10, rings=2)
    rig.part(name, g, sh(TYRE))
    g = Geo()
    for i in range(8):
        a = math.radians(45 * i)
        g.capsule((x, y, R_W), (x + (R_W - 2.0) * math.cos(a), y, R_W + (R_W - 2.0) * math.sin(a)), 0.45)
    rig.part(name, g, sh(I.IRON_LT), finish="metal", outline=0)
    g = Geo().blob((x + (R_W - 1.2), y - 1.4, R_W), (1.6, 0.8, 2.2), p=2.4)   # the bold rim mark
    rig.part(name, g, sh(I.CREAM), outline=0)
    g = Geo().sphere((x, y - 1.0, R_W), 1.6, cuts=2)
    rig.part(name, g, sh(I.BRASS_LT), finish="metal", outline=0.3)


def _cap(rig, joint):
    x, y, z = CAP_C
    g = Geo().blob((x - 0.4, y, z + 0.8), (12.4, 11.8, 7.0), p=2.3)
    g.clip((x, y, z - 2.4), (0, 0, -1))
    g.blob((x - 1.0, -11.0, z - 4.0), (3.4, 1.6, 5.0), p=2.4)               # ear flaps
    g.blob((x - 1.0, 11.0, z - 4.0), (3.4, 1.6, 5.0), p=2.4)
    rig.part(joint, g, team=True)
    I.goggles(rig, at=(x + 9.6, 0, z - 1.0), joint=joint, rim=I.BRASS_LT)


def build(rig):
    rig.joint("bike", "root", (REAR, 0, 0))
    rig.rest_scale["bike"] = BIKE_S
    _wheel(rig, "wf", REAR, 3.0, far=True)
    _wheel(rig, "ff", FRONT, 3.0, far=True)
    # the motorbike (between the wheels)
    g = Geo().capsule((REAR, -2.0, R_W), (2.0, -2.0, 20.0), 1.3)
    g.capsule((2.0, -2.0, 20.0), (15.0, -2.0, 24.0), 1.3)
    g.capsule((-8.0, -2.0, 22.0), (2.0, -2.0, 20.0), 1.2)
    rig.part("bike", g, SOOT, finish="metal", outline=0.5)                  # frame
    g = Geo().blob((0.0, 0, 13.0), (6.0, 4.0, 4.4), p=2.8)
    rig.part("bike", g, I.IRON_DK, finish="metal", outline=0.6)             # engine
    g = Geo().lathe([(2.4, 0), (2.6, 2.0), (2.4, 4.0)], (2.0, -3.0, 16.0), (2.0, -3.0, 21.0), segs=12)
    rig.part("bike", g, I.BRASS_LT, finish="metal", outline=0.4)            # cylinder
    tank = Geo().blob((6.0, 0, 23.0), (8.0, 4.4, 3.6), p=2.6)
    tface = F.Face(rig, "bike", [Geo().blob((6.0, 0, 23.0), (8.0, 4.4, 3.6), p=2.6)])
    rig.part("bike", tank, team=True)
    g = KI.cog(tface, Geo(), (6.0, 23.0), s=0.6)
    rig.part("bike", g, I.CREAM, highlight=False, outline=0)
    g = Geo().blob((-6.0, 0, 23.4), (5.0, 3.6, 1.6), p=2.6)
    rig.part("bike", g, I.LEATHER, outline=0.5)                            # saddle
    g = Geo().capsule((15.0, -2.0, 25.0), (FRONT, -2.0, R_W), 1.2)
    rig.part("bike", g, I.IRON_LT, finish="metal", outline=0.5)             # fork
    g = Geo().capsule((10.0, -10.0, 31.0), (10.0, 6.0, 31.0), 0.9)
    g.capsule((15.0, -2.0, 25.0), (10.0, -2.0, 31.0), 1.0)
    rig.part("bike", g, SOOT, finish="metal", outline=0.4)                  # handlebars
    g = Geo().lathe([(0, 0), (2.2, 0), (2.6, 1.8), (0, 2.2)], (17.0, -2.0, 26.0), (19.6, -2.0, 26.0), segs=14)
    rig.part("bike", g, I.BRASS_LT, finish="metal", outline=0.4)
    g = Geo().blob((19.8, -2.0, 26.0), (0.5, 1.8, 1.8), p=2.2)
    rig.part("bike", g, glow="#FFF1C8", outline=0)                          # headlamp
    g = Geo().capsule((-2.0, -5.0, 11.0), (-24.0, -5.0, 12.0), 1.2)
    rig.part("bike", g, I.IRON_LT, finish="metal", outline=0.4)             # exhaust
    g = Geo()
    for x in (REAR, FRONT):
        pts = [(x + 10.0 * math.cos(math.radians(a)), R_W + 10.0 * math.sin(math.radians(a))) for a in range(20, 161, 35)]
        for p0, p1 in zip(pts, pts[1:]):
            g.capsule((p0[0], -1.0, p0[1]), (p1[0], -1.0, p1[1]), 1.1)
    rig.part("bike", g, I.IRON_DK, finish="metal", outline=0.4)             # mudguards
    I.steam_puff(rig, "bike", (-27.0, -5.0, 13.0), size=1.0, name="exhaust", color=I.SMOKE_DK)

    # the rider (an Industrial biped; his body sits on the saddle)
    KI.skeleton_v3(rig)
    KI.legs_v3(rig, trousers=I.TWEED, gaiter=I.LEATHER_DK)
    del rig.trackers["_foot_l"]
    I.jacket(rig, hem_z=13.0)
    g = Geo().blob((-8.0, 9.0, 21.0), (5.0, 2.6, 5.0), p=2.6)
    rig.part("torso", g, I.LEATHER, outline=0.6)                           # despatch satchel
    g = Geo().capsule((10.0, -8.0, 36.0), (-8.0, 8.0, 24.0), 1.1)
    rig.part("torso", g, I.LEATHER_DK, outline=0.4)
    rig.secondary("scarf", "torso", (2.0, -4.0, 37.0), (-12.0, -4.0, 38.0), max_deg=26, gain=1.6)
    g = Geo().blob((-5.0, -4.0, 37.6), (7.0, 2.4, 1.8), p=2.4, rot=(0, -8, 0))
    rig.part("scarf", g, SCARF, outline=0.5)
    g = Geo().lathe([(7.0, 0), (7.6, 1.6), (7.2, 3.0)], (1.2, 0, 36.0), (1.2, 0, 39.0), segs=18)
    rig.part("torso", g, SCARF, outline=0.5)
    KI.head_face(rig, brow=I.HAIR, brow_angry=True, mouth_dz=-9.0, mouth_w=5.6)
    I.moustache(rig, I.HAIR, curl=False, big=0.9)
    I.ear(rig)
    rig.joint("hat", "head", CAP_C)
    _cap(rig, "hat")
    KI.loose(rig, "hat_loose", CAP_C, lambda j: _cap(rig, j))
    for s in ("r", "l"):
        I.arm_parts(rig, s, sleeve=None, team_sleeve=True, fist=4.4, cuff=I.LEATHER_DK)
    I.shoulders(rig, team=True)
    rig.joint("spanner", "hand_r", FIST)
    I.wrench(rig, "spanner", FIST, length=20.0, jaw=8.0)
    rig.rest_scale["spanner"] = 1.1
    rig.track("spannerHead", "spanner", (FIST[0], FIST[1], FIST[2] + 24.0))

    # near wheels last
    _wheel(rig, "wn", REAR, -6.0)
    _wheel(rig, "fn", FRONT, -6.0)
    rig.joint("odo", "root", (0, 0, 0))
    rig.track("_foot", "odo", (0, 0, 0))


# -- poses -----------------------------------------------------------------------------------
def _roll(d):
    a = -math.degrees(d / R_EFF)
    return {w: {"r": a} for w in ("wn", "wf", "fn", "ff")}


def ride(lean=-30.0, la=-30.0, lf=-20.0, ra=-30.0, rf=-20.0, rw=-90.0, z=0.0):
    """The seated rider: hips on the saddle, feet on the pegs, hands on the bars (world angles)."""
    return merge(KI.aim_arm("r", ra, rf, lean, rw), KI.aim_arm("l", la, lf, lean), {
        "body": {"z": SEAT_Z + z, "x": BODY_X},
        "torso": {"r": lean}, "head": {"r": -0.6 * lean},
        "thigh_r": {"r": 72}, "shin_r": {"r": -82}, "foot_r": {"r": 10},
        "thigh_l": {"r": 66}, "shin_l": {"r": -78}, "foot_l": {"r": 10},
    })


def about_rear(r=0.0, z=0.0, x=0.0):
    """The bike and the rider tilt together about the rear wheel contact."""
    rr = math.radians(r)
    ox = REAR - 6.0
    # the rider's body origin (x -6, z SEAT_Z) rotated about the rear contact (REAR, 0)
    dx, dz = BODY_X - REAR, SEAT_Z
    nx = REAR + dx * math.cos(rr) - dz * math.sin(rr)
    nz = dx * math.sin(rr) + dz * math.cos(rr)
    del ox
    return {"bike": {"r": r, "z": z, "x": x}, "body": {"r": r, "x": nx + x, "z": nz + z}}


STANCE = ride()


def _idle(f):
    rev = [0.0, 0.6, 1.0, 0.4, 0.0, 0.0][f]
    pose = merge(ride(lean=-20.0 + 2 * rev), _roll(0), {
        "bike": {"z": 0.3 * ((-1) ** f)}, "exhaust": {"show": f in (1, 2), "s": 0.7 + 0.4 * rev},
        "scarf": {"r": -6 * rev},
    })
    if f == 4:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bob = 0.8 * math.cos(2 * p)
    return merge(ride(z=bob * 0.7), _roll(STEP * f), {
        "odo": {"x": ODO_AMP * math.cos(p)},
        "bike": {"z": bob, "r": 0.8 * math.sin(2 * p)},
        "exhaust": {"show": f % 2 == 0, "s": [0.8, 1, 1.1, 1, 0.8, 1, 1.1, 1][f]},
        "scarf": {"r": 8 * math.sin(2 * p)}, "head": {"r": 14 + 2 * math.sin(2 * p - 1.0)},
    })


WALK_DUST = {k: [{"kind": "dust", "ground": (REAR - 10.0, 0.0), "size_lu": 5.0 if k % 2 else 3.5, "puffs": 3,
                  "seed": 320 + k, "spread": 1.0, "dir": -1.0}] for k in range(8)}

# -- attack A: wheelie bump (SMALL_MELEE_MS, impact 6) ------------------------------------------------
#        read rev  rear HOLD smear smear BUMP  bounce recoil settle settle
A_R = [0.0, 2.0, 12.0, 20.0, 12.0, 2.0, -3.0, 1.5, -0.5, 0.0, 0.0]
A_X = [0.0, -1.0, -1.0, -1.5, 2.0, 5.0, 7.0, 5.0, 2.0, 0.5, 0.0]


def _attack_pose(f):
    pose = merge(ride(lean=[-24, -20, -12, -8, -16, -26, -32, -28, -26, -24, -24][f]), _roll(A_X[f]),
                 about_rear(r=A_R[f], x=A_X[f]), {
        "exhaust": {"show": f in (1, 2, 3), "s": 1.2},
        "scarf": {"r": [0, 0, 10, 16, 0, -14, -20, -10, 0, 0, 0][f]},
    })
    if f in (2, 3):
        pose = merge(pose, F.expr("grit"))
    elif f in (4, 5, 6):
        pose = merge(pose, F.expr("yell"))
    return pose


def _bump_fx(seed):
    pt = (FRONT + 6.0, 0, 6.0)
    return [{"kind": "burst", "joint": "fn", "point": (FRONT + 7.0, -6.0, R_W + 2.0), "r0_lu": 7.0, "r1_lu": 14.0, "n": 6,
             "a0": -30.0, "arc": 150.0, "color": "#FFF4D6"},
            {"kind": "dust", "ground": (pt[0], 0.0), "size_lu": 7.0, "puffs": 4, "seed": seed, "spread": 1.2}]


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays={6: _bump_fx(331)}, extra={"holdStep": 3})


# -- attack B: spanner swing from the saddle. Unique frames 0, 1, 9, 10 are A's.
#        lift HOLD smear smear IMP  bounce recoil
B_A = [40, 100, 70, 20, -18, -24, -40]
B_F = [96, 130, 60, 0, -30, -36, -10]
B_W = [128, 150, 70, 0, -24, -30, 14]


def _b_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    lean = [-14, -8, -18, -26, -32, -30, -26][k]
    pose = merge(ride(lean=lean, ra=B_A[k], rf=B_F[k], rw=B_W[k]), _roll(0), {
        "bike": {"r": [0, 0, -1, -2, -3, -1, 0][k]}, "torso": {"rz": [-10, -16, -6, 6, 12, 10, 4][k]},
    })
    pose = merge(pose, F.expr("yell" if k in (2, 3, 4) else "grit"))
    return pose


def _attack_b():
    arc = {"kind": "arc", "joint": "spanner", "inner": (FIST[0], FIST[1], FIST[2] + 10.0),
           "outer": (FIST[0], FIST[1], FIST[2] + 24.0), "color": I.IRON_LT, "white": 0.35, "taper": 0.15, "lines": 3}
    ov = {4: [dict(arc, **{"from": 3, "t0": 0.0, "t1": 0.95})],
          5: [dict(arc, **{"from": 4, "t0": 0.2, "t1": 1.0})],
          6: [{"kind": "burst", "joint": "spanner", "point": (FIST[0], FIST[1], FIST[2] + 24.0), "r0_lu": 6.0,
               "r1_lu": 12.0, "n": 6, "a0": -20.0, "arc": 160.0, "color": "#FFF4D6"}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  smear=4, overlays=ov, reuse=reuse, extra={"holdStep": 3})


# -- attack C: skid kick: the bike slews (yaw) with a dust spray, he kicks out with the near boot.
def _c_pose(i):
    if i in (0, 1, 9, 10):
        return _attack_pose(i)
    k = i - 2
    yaw = [10, 24, 30, 26, 18, 10, 4][k]
    pose = merge(ride(lean=[-20, -14, -18, -22, -24, -24, -24][k]), _roll(0), {
        "bike": {"rz": yaw, "r": [0, -2, -3, -2, -1, 0, 0][k]}, "body": {"rz": yaw},
        "thigh_r": {"r": [60, 40, 20, 10, 20, 40, 60][k]}, "shin_r": {"r": [-70, -40, -10, -4, -20, -50, -70][k]},
        "exhaust": {"show": True, "s": 1.1},
    })
    pose = merge(pose, F.expr("yell" if k in (2, 3, 4) else "grit"))
    return pose


def _attack_c():
    ov = {4: [{"kind": "dust", "ground": (REAR - 4.0, 0.0), "size_lu": 9.0, "puffs": 5, "seed": 335, "spread": 1.6, "dir": -1.0}],
          6: [{"kind": "burst", "joint": "foot_r", "point": (8.0, -6.0, 2.0), "r0_lu": 6.0, "r1_lu": 12.0, "n": 6,
               "a0": -40.0, "arc": 140.0, "color": "#FFF4D6"},
              {"kind": "dust", "ground": (REAR, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 336, "spread": 1.4, "dir": -1.0}]}
    reuse = {0: ("attack", 0), 1: ("attack", 1), 9: ("attack", 9), 10: ("attack", 10)}
    return M.clip("attack_c", [_c_pose(i) for i in range(11)], M.SMALL_MELEE_MS, impact=M.SMALL_MELEE_IMPACT,
                  overlays=ov, reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(ride(lean=-24 + 14 * a), _roll(-2 * a), {
        "bike": {"z": [-1.0, 1.0, 0.4, -0.2, 0][k], "r": 2 * a}, "head": {"r": 16 * a},
        "hat": {"z": 2.0 * max(a, 0)}, "scarf": {"r": 10 * a},
    })
    if k < 2:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


def _die(k):
    fl = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    # he is thrown forward over the bars and lands on his back; the bike tips onto its side
    pose = merge(ride(), M.die_d1(k, center_z=34.0, lie_z=11.0, height=HEIGHT_LU), {
        "torso": {"r": 10 * fl}, "arm_r": {"r": 60 * fl + 20}, "arm_l": {"r": 110 * fl + 30},
        "thigh_r": {"r": 40 * fl + 20}, "shin_r": {"r": -30 * fl}, "thigh_l": {"r": -20 * fl + 10},
        "bike": {"rx": -[0, 6, 14, 30, 50, 70, 80, 84, 84, 84][k], "z": [0, 1, 2, 1, 0, -1, -2, -2, -2, -2][k]},
    })
    pose["body"] = dict(pose.get("body", {}), x=pose.get("body", {}).get("x", 0.0) + [0, 4, 10, 16, 20, 22, 24, 24, 24, 24][k])
    hp = KI.HAT_POP[k]
    if hp is not None:
        x, z, r = hp
        pose["hat"] = {"hide": True}
        pose["hat_loose"] = {"show": True, "x": x + 24, "z": z, "r": r}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 2.0}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [WALK_MS] * 8, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        _attack_c(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in (0, 1, 2, 3, 4, 5, 6, 8)], M.DIE_MS,
               sequence=[0, 1, 2, 3, 4, 5, 6, 6, 7, 7], extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl))
