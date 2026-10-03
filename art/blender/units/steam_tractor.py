"""Steam Tractor: Industrial Age common Heavy Brute, armored mech (CONTENT_PLAN 5.5). Plough blade, cleave 2,
~92 lu.

Look (A11 vehicle rig, Industrial palette): a stubby traction engine: a team-painted boiler with brass
bands and a cream cog on the side, a tall black smokestack at the front that puffs, a big iron rear
driving wheel with four cream spokes and a smaller front wheel, a flywheel turning on the side, a
riveted coal tender with a team canopy over the driver (a round face in a flat cap), and a heavy
curved plough blade on an arm at the front with hazard stripes.

"A viewer expects it to lurch forward and scoop sideways with the plough, tossing two foes, the
chimney puffing; and to clank along on its big wheels."

Animation (ANIM_SPEC G6 wheeled):
  idle      the boiler breathes, the flywheel ticks over, the stack puffs, the driver taps the gauge
  walk      the rear wheel turns 2 spoke spacings per 656 ms cycle at the ground speed (50 x 1.25 =
            62.5 lu/s), the front wheel and the flywheel turn with it, the hull clanks (a jolt per half
            cycle), the stack puffs, dust from the rear wheel
  attack    PLOUGH SCOOP: it rocks back on the rear wheel with the blade dipped low (the held extreme),
            then lurches forward and the blade scoops up and across (a crescent smear), a big puff
  attack_b  BLADE SLAM: the front rears up with the blade raised high, then slams down (ground dust)
  hit       vehicle: a suspension bounce, the driver ducks
  die       wreck: the boiler bursts a steam cloud, the front wheel rolls off, it slumps nose-down
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_industrial as KI
from ageborn_art import moves as M
from ageborn_art import rigs_industrial as I
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "steam_tractor"
GAIT_NAME = "wheeled"
NAME = "Steam Tractor"
HEIGHT_LU = 92
YAW_DEG = -10.0
CANVAS = (480, 350)
FEET = (230, 302)
ANCHORS = {"head": (0, 86), "hitCenter": (0, 40)}
NO_RETIME = True

R_REAR, R_FRONT = 13.0, 8.0
REAR_X, FRONT_X = -26.0, 30.0
SPOKES = 4
WALK_MS = 82
STRIDE = 2 * (2 * math.pi * R_REAR / SPOKES)      # 40.8 lu per 656 ms cycle = 62.2 lu/s
STEP = STRIDE / 8
ODO_AMP = STRIDE / 4
NY = -16.0                                        # near wheel plane
BLADE_P = (46.0, 0.0, 14.0)                       # the blade arm's pivot
BLADE_TIP = (60.0, -10.0, 6.0)
STACK = (34.0, 0.0, 44.0)
HULL_DK = I.IRON_DK
SOOT = "#2F2D2E"


def _wheel(rig, name, x, y, r, spokes, far=False):
    from ageborn_art import colors as C
    k = 0.8 if far else 1.0
    sh = (lambda c: C.scale(c, k))
    rig.joint(name, "chassis", (x, y, r))
    g = Geo()
    n = 18
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        g.capsule((x + (r - 1.6) * math.cos(a0), y, r + (r - 1.6) * math.sin(a0)),
                  (x + (r - 1.6) * math.cos(a1), y, r + (r - 1.6) * math.sin(a1)), 2.2, segs=10, rings=2)
    rig.part(name, g, sh(HULL_DK), finish="metal")
    g = Geo()
    for i in range(spokes):
        a = math.radians(360.0 / spokes * i)
        g.capsule((x, y, r), (x + (r - 2.4) * math.cos(a), y, r + (r - 2.4) * math.sin(a)), 1.8, 1.4, segs=8, rings=2)
    rig.part(name, g, sh(I.CREAM), outline=0.7)
    g = Geo().blob((x, y - 1.4, r), (3.2, 2.2, 3.2), p=2.4)
    rig.part(name, g, sh(I.BRASS_LT), finish="metal", outline=0.5)
    g = Geo()
    for i in range(12):   # grip cleats on the rim
        a = 2 * math.pi * (i + 0.5) / 12
        g.blob((x + r * math.cos(a), y - 0.6, r + r * math.sin(a)), (1.2, 2.6, 1.2), p=2.6)
    rig.part(name, g, sh(SOOT), finish="metal", outline=0)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, 0))
    rig.joint("odo", "root", (0, 0, 0))
    _wheel(rig, "rear_f", REAR_X, 14.0, R_REAR, SPOKES, far=True)
    _wheel(rig, "front_f", FRONT_X, 12.0, R_FRONT, 3, far=True)
    rig.joint("hull", "chassis", (0, 0, 20.0))
    # the boiler: a team-painted cylinder lying along x with brass bands and a smokebox
    g = Geo().capsule((-6.0, 0, 30.0), (38.0, 0, 30.0), 11.0, 11.0)
    rig.part("hull", g, team=True)
    boiler_face = F.Face(rig, "hull", [Geo().capsule((-6.0, 0, 30.0), (38.0, 0, 30.0), 11.0, 11.0)])
    g = Geo()
    for x in (2.0, 18.0, 32.0):
        g.lathe([(11.2, -0.9), (11.6, 0), (11.2, 0.9)], (x, 0, 30.0), (x + 1.2, 0, 30.0), segs=24)
    rig.part("hull", g, I.BRASS_LT, finish="metal", outline=0.4)
    g = KI.cog(boiler_face, Geo(), (10.0, 30.0), s=1.0)
    rig.part("hull", g, I.CREAM, highlight=False, outline=0)
    g = Geo().lathe([(0, 0), (11.4, 0), (11.6, 2.0), (0, 3.0)], (40.0, 0, 30.0), (43.0, 0, 30.0), segs=24)
    rig.part("hull", g, SOOT, finish="metal", outline=0.8)
    # the frame under the boiler, the tender and the canopy
    g = Geo().blob((4.0, 0, 18.0), (40.0, 13.0, 2.4), p=4.0)
    rig.part("hull", g, HULL_DK, finish="metal")
    g = Geo().blob((-22.0, 0, 30.0), (12.0, 13.0, 12.0), p=4.0)
    rig.part("hull", g, I.IRON, finish="metal")
    g = Geo()
    I.rivets(g, [(-22.0 + dx, -13.4, z) for dx in (-9, -3, 3, 9) for z in (22.0, 38.0)], r=0.9)
    rig.part("hull", g, I.IRON_LT, finish="metal", outline=0)
    g = Geo()
    for x in (-32.0, -12.0):
        g.capsule((x, -10.0, 42.0), (x, -10.0, 60.0), 1.0)
    rig.part("hull", g, I.IRON_DK, finish="metal", outline=0.4)
    g = Geo().blob((-21.0, 0, 61.0), (16.0, 14.0, 2.0), p=3.0)
    rig.part("hull", g, team=True)                                      # canopy
    # the driver
    hx, hy, hz = -20.0, -4.0, 50.0
    rig.joint("driver", "hull", (hx, hy, hz))
    head = Geo().blob((hx, hy, hz), (5.4, 5.2, 5.2), p=2.3)
    head.blob((hx + 5.2, hy - 0.4, hz - 1.0), (1.8, 1.6, 1.7), p=2.0)
    from ageborn_art import kit_medieval as K
    K.face2(rig, [head], I.SKIN, cx=hx + 4.4, cz=hz + 0.6, eye_dy=(hy - 2.2, hy + 2.2), eye_r=(2.0, 1.9, 2.4),
            pupil_r=(0.9, 1.3, 1.5), brow=I.HAIR, brow_w=0.5, mouth_dz=-3.6, mouth_x=hx + 4.8, head="driver",
            mouth_w=3.0, eye_at=(hx + 5.0, hz + 0.8), mark_r=2.2)
    rig.part("driver", head, I.SKIN)
    I.flat_cap(rig, c=(hx, hy, hz + 4.0), joint="driver", k=0.48, team=False)
    g = Geo().blob((hx, hy, hz - 7.0), (5.0, 5.4, 4.0), p=2.4)
    rig.part("driver", g, I.DENIM)
    # the smokestack, the steam dome and the flywheel
    sx, sy, sz = STACK
    g = Geo().capsule((sx, sy, sz - 6.0), (sx, sy, sz + 18.0), 3.8, 3.4)
    g.lathe([(0, 0), (3.6, 0), (6.4, 5.0), (6.6, 6.6), (0, 6.6)], (sx, sy, sz + 16.0), (sx, sy, sz + 22.6), segs=18)
    rig.part("hull", g, SOOT, finish="metal", outline=0.8)
    I.steam_puff(rig, "hull", (sx + 1.0, sy, sz + 30.0), size=1.8, name="puff", color=I.SMOKE)
    g = Geo().blob((14.0, 0, 42.0), (4.0, 4.0, 3.0), p=2.4)
    rig.part("hull", g, I.BRASS, finish="metal", outline=0.6)
    I.steam_puff(rig, "hull", (14.0, -4.0, 50.0), size=1.2, name="vent")
    rig.joint("fly", "hull", (-4.0, -13.0, 40.0))
    g = Geo()
    for i in range(6):
        a = math.radians(60 * i)
        g.capsule((-4.0, -13.6, 40.0), (-4.0 + 7.0 * math.cos(a), -13.6, 40.0 + 7.0 * math.sin(a)), 0.9)
    n = 14
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        g.capsule((-4.0 + 7.2 * math.cos(a0), -13.6, 40.0 + 7.2 * math.sin(a0)),
                  (-4.0 + 7.2 * math.cos(a1), -13.6, 40.0 + 7.2 * math.sin(a1)), 1.3, segs=8, rings=2)
    rig.part("fly", g, I.IRON_LT, finish="metal", outline=0.5)
    # the plough blade on its arm
    rig.joint("blade", "hull", BLADE_P)
    rig.rest_scale["blade"] = 1.4
    bx, by, bz = BLADE_P
    g = Geo().capsule((bx - 8.0, -8.0, bz + 6.0), (bx + 6.0, -8.0, bz), 1.6)
    g.capsule((bx - 8.0, 8.0, bz + 6.0), (bx + 6.0, 8.0, bz), 1.6)
    rig.part("blade", g, HULL_DK, finish="metal", outline=0.6)
    blade = Geo().blob((bx + 10.0, 0, bz - 2.0), (3.0, 16.0, 9.0), p=3.0, rot=(0, -18, 30))
    bface = F.Face(rig, "blade", [Geo().blob((bx + 10.0, 0, bz - 2.0), (3.0, 16.0, 9.0), p=3.0, rot=(0, -18, 30))])
    rig.part("blade", blade, I.IRON, finish="metal", outline=0.8)
    g = Geo()
    KI.stripes(bface, g, (bx + 10.0, bz - 2.0), 12.0, 7.0, n=3)
    rig.part("blade", g, I.CREAM, highlight=False, outline=0)
    rig.track("bladeTip", "blade", BLADE_TIP)
    # near wheels last
    _wheel(rig, "rear_n", REAR_X, NY, R_REAR, SPOKES)
    _wheel(rig, "front_n", FRONT_X, NY + 4.0, R_FRONT, 3)
    # wreck parts
    rig.joint("burst", "hull", (10.0, -10.0, 44.0), hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 12.0), (12, 4, 9.0), (-10, 6, 9.0), (2, 14, 8.0)):
        g.sphere((10.0 + dx, -16.0, 44.0 + dz), r, cuts=4)
    rig.part("burst", g, I.STEAM, finish="dust", outline=0.6)
    rig.track("_foot", "odo", (0, 0, 0))


WHEELS_REAR = ("rear_n", "rear_f")
WHEELS_FRONT = ("front_n", "front_f")


def _roll(d):
    """Wheel and flywheel angles after rolling d lu (clockwise on screen = negative r)."""
    rr = -math.degrees(d / R_REAR)
    rf = -math.degrees(d / R_FRONT)
    out = {w: {"r": rr} for w in WHEELS_REAR}
    out.update({w: {"r": rf} for w in WHEELS_FRONT})
    out["fly"] = {"r": rr * 1.6}
    return out


def _idle(f):
    c = math.cos(2 * math.pi * f / 6)
    return merge(_roll(0), {
        "hull": dict(squash(0.015 * c), z=0.5 * c), "fly": {"r": 30 * f},
        "puff": {"show": f in (0, 1, 3, 4), "s": [0.8, 1.1, 1, 0.8, 1.1, 1][f], "z": [0, 3, 0, 0, 3, 0][f]},
        "driver": {"r": 4 * c},
    })


def _walk(f):
    p = 2 * math.pi * f / 8
    jolt = -abs(math.sin(p))
    return merge(_roll(STEP * f), {
        "odo": {"x": ODO_AMP * math.cos(p)},
        "hull": dict(squash(0.025 * jolt), z=1.6 * jolt + 0.4, r=1.0 * math.sin(2 * p)),
        "puff": {"show": f in (0, 1, 4, 5), "s": [0.8, 1.15, 1, 1, 0.8, 1.15, 1, 1][f], "z": [0, 4, 0, 0, 0, 4, 0, 0][f]},
        "driver": {"z": 0.8 * math.sin(p - 1.0)}, "blade": {"r": 2 * math.sin(p - 0.8)},
    })


WALK_DUST = {k: [{"kind": "dust", "ground": (REAR_X - 12.0, 0.0), "size_lu": 6.0 if k % 2 else 4.5, "puffs": 3,
                  "seed": 260 + k, "spread": 1.0, "dir": -1.0}] for k in range(8)}

# attack: moves.HEAVY_MELEE_MS (1230 ms, impact at step 6); 10 unique poses on 12 steps
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        ready rock  dip  HOLD smear smear SCOOP over  back  settle
A_X = [0.0, -2.0, -4.0, -5.0, 0.0, 5.0, 9.0, 8.0, 3.0, 0.0]
A_R = [0.0, -2.0, -4.0, -5.0, -2.0, 1.0, 3.0, 2.0, 0.5, 0.0]
A_BR = [0.0, -4.0, -9.0, -12.0, 14.0, 44.0, 62.0, 56.0, 18.0, 0.0]
A_BZ = [0.0, 0.0, 1.0, 1.0, 0.0, 2.0, 4.0, 3.0, 1.0, 0.0]
A_BRZ = [0, 0, 8, 12, 0, -18, -30, -26, -8, 0]
A_Q = [0.0, -0.01, -0.03, -0.04, 0.0, 0.04, 0.07, -0.03, 0.0, 0.0]


def _attack_pose(f, slam=False):
    if slam:
        br = [0.0, 10.0, 26.0, 34.0, 20.0, -4.0, -16.0, -12.0, -4.0, 0.0][f]
        rr = [0.0, 2.0, 5.0, 6.5, 4.0, -1.0, -3.0, -1.0, 0.0, 0.0][f]
        pose = merge(_roll(0), M.body_about((REAR_X, 0, 0), x=[0, -1, -2, -2, 1, 3, 4, 3, 1, 0][f], r=rr,
                                            q=[0, 0, 0.02, 0.03, 0, -0.03, -0.08, 0.02, 0, 0][f]), {
            "blade": {"r": br, "z": [0, 2, 6, 8, 4, 2, 1, 1, 0, 0][f]},
        })
    else:
        pose = merge(_roll(A_X[f]), M.body_about((REAR_X, 0, 0), x=A_X[f], r=A_R[f], q=A_Q[f]), {
            "blade": {"r": A_BR[f], "z": A_BZ[f], "rz": A_BRZ[f]},
        })
    pose = merge(pose, {
        "puff": {"show": f in (5, 6, 7), "s": [1, 1, 1, 1, 1, 0.8, 1.3, 1.5, 1, 1][f], "z": [0, 0, 0, 0, 0, 0, 4, 8, 0, 0][f]},
        "vent": {"show": f in (2, 3), "s": 0.9},
        "driver": {"r": [0, -4, -8, -10, -4, 6, 10, 8, 2, 0][f]},
    })
    return pose


def _ov(slam=False):
    arc = {"kind": "arc", "joint": "blade", "inner": (BLADE_P[0] + 6.0, -6.0, BLADE_P[2]), "outer": BLADE_TIP,
           "color": I.IRON_LT, "white": 0.35, "taper": 0.15, "lines": 3}
    hit = [{"kind": "burst", "joint": "blade", "point": BLADE_TIP, "r0_lu": 10.0, "r1_lu": 20.0, "n": 7,
            "a0": -20.0, "arc": 160.0, "color": "#FFF4D6"},
           {"kind": "dust", "ground": (BLADE_TIP[0] + 4.0, 0.0), "size_lu": 9.0, "puffs": 5, "seed": 281 if slam else 283,
            "spread": 1.4}]
    return {4: [dict(arc, **{"from": 3, "t0": 0.0, "t1": 0.95})],
            5: [dict(arc, **{"from": 4, "t0": 0.2, "t1": 1.0})],
            6: [dict(arc, **{"from": 5, "t0": 0.3, "t1": 1.0, "lines": 2})] + hit}


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, smear=4, overlays=_ov(), extra={"holdStep": 3})


def _attack_b():
    reuse = {0: ("attack", 0), 9: ("attack", 9)}
    return M.clip("attack_b", [_attack_pose(f, slam=True) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, smear=4, overlays=_ov(True), reuse=reuse, extra={"holdStep": 3})


def _hit(k):
    a = M.HIT_AMT[k]
    duck = [0.8, 1.0, 0.6, 0.1, 0.0][k]
    return merge(_roll(-3 * a), {
        "body": dict(squash([-0.06, 0.04, 0.02, -0.02, 0.0][k]), x=-3.0 * max(a, 0) + 1.0 * min(a, 0)),
        "hull": {"r": 2.5 * a, "z": [-1.5, 1.5, 0.5, -0.3, 0.0][k]},
        "driver": {"z": -3.0 * duck, "r": 10 * a}, "blade": {"r": 6 * a},
    })


D_BODY = [dict(x=-1, z=0, r=1, q=-0.04), dict(x=0, z=4, r=-2, q=0.04), dict(x=2, z=6, r=-5, q=0.02),
          dict(x=3, z=3, r=-8, q=-0.06), dict(x=3, z=1, r=-9, q=-0.08), dict(x=3, z=1, r=-9, q=-0.07),
          dict(x=3, z=1, r=-9, q=-0.07), dict(x=3, z=1, r=-9, q=-0.08, s=0.97)]
D_WHEEL = [(0, 0, 0), (4, 5, -40), (10, 8, -100), (18, 4, -170), (24, -1, -240), (26, -1, -250),
           (26, -1, -250), (26, -1, -250)]


def _die(k):
    b = D_BODY[k]
    wx, wz, wr = D_WHEEL[k]
    pose = merge(_roll(0), M.body_about((FRONT_X, 0, 0), x=b["x"], z=b["z"], r=b["r"], q=b["q"], s=b.get("s", 1.0)), {
        "front_n": {"x": wx, "z": wz, "r": wr},
        "burst": {"show": k >= 1, "s": [1, 0.6, 0.8, 0.9, 0.95, 1.0, 1.0, 1.0][k], "z": [0, 0, 4, 8, 12, 16, 20, 24][k]},
        "blade": {"r": [0, -4, -8, -10, -10, -10, -10, -10][k]},
        "driver": {"z": [0, 3, 6, 4, 0, -2, -3, -3][k], "r": [0, 10, 20, 30, 40, 40, 40, 40][k]},
    })
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 3:
        pose = merge(pose, F.expr("o"))
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)], [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], [WALK_MS] * 8, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
