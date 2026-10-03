"""Siege Belfry: Medieval Age epic siege tower, armored mech (CONTENT_PLAN 5.3). Drawbridge slam, ~112 lu.

Look (A11 vehicle rig, the Battering Ram's wheels and crew): a tall wooden siege tower on four chunky
spoked wheels, dark corner posts and cross braces, wet team hides draped over the front and the near
side (a big parchment bear paw), a hinged plank drawbridge on the front of the top storey with iron
straps and chains, a crenellated top platform where two little archers in kettle hats peek over the
parapet with their bows, and a team pennant on the roof. The crew's booted legs push between the wheels.

"A viewer expects the drawbridge to crash down like a hammer while the archers shoot from the top, and
the tall tower to sway as the crew roll it forward."

Animation (ANIM_SPEC G6 wheeled, appendix B for a vehicle; riders get attack_alt, ANIM_SPEC R3):
  idle      the tower creaks and sways a little, the archers look about, the pennant flutters
  walk      walk v3 (G6): six-spoke wheels roll 2 spoke spacings per 640 ms at radius 15.3 lu (50 lu/s,
            card 40 x 1.25), the tall tower sways (pitch) once per cycle, the crew's legs jog, the
            pennant whips, dust off the back wheels
  attack    DRAWBRIDGE SLAM: the chains run out, the drawbridge tips forward and slams down flat like a
            hammer (a smear and an impact burst, dust), the tower lurches, then the crew winch it up
  attack_b  LURCH SLAM: the crew rock the whole tower back on its back wheels (the held extreme), then
            it lurches forward and the bridge slams harder
  attack_alt  the two archers draw and loose over the parapet (the arrow leaves `muzzle`), the tower
            stands still
  hit       vehicle: a sway and a creak, the archers duck
  die       wreck: the tower tips back, a wheel pops off, the bridge falls, the archers tumble out
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units import battering_ram as R

SLUG = "siege_belfry"
GAIT_NAME = "wheeled"
NAME = "Siege Belfry"
HEIGHT_LU = 112
YAW_DEG = -10.0
CANVAS = (330, 340)
FEET = (150, 310)
ANCHORS = {"head": (0, 104), "hitCenter": (0, 52), "muzzle": (14, 108)}
NO_RETIME = True

WOOD, DARK_WOOD, IRON, STEEL, GOLD = R.WOOD, R.DARK_WOOD, R.IRON, R.STEEL, R.GOLD
PARCH, SKIN, HOSE, BOOT, HAIR = R.PARCH, R.SKIN, "#626A74", R.BOOT, R.HAIR
BOW = "#9A8268"
STRING = "#EDE6D6"

AXLES = (-17.0, 17.0)
X0, X1 = -22.0, 21.0                   # the tower's back and front faces
Z_BASE, Z_TOP = 27.0, 96.0
HINGE = (X1 + 1.0, 0.0, 58.0)          # the drawbridge hinge (bottom of the plank door)
BRIDGE = 32.0
WALK_DUR = [80] * 8                    # 640 ms: 2 spoke spacings (32.04 lu) per cycle = 50.1 lu/s
ARCHERS = ((-7.0, -6.0), (9.0, -8.0))  # (x, y) of the two archers on the platform


def _archer(rig, name, x, y, front):
    z = Z_TOP
    rig.joint(name, "hull", (x, y, z + 2.0))
    g = Geo().capsule((x, y, z + 1.0), (x + 0.6, y, z + 10.0), 4.6, 4.2)
    rig.part(name, g, team=True)
    hx, hz = x + 1.4, z + 15.0
    head = Geo().blob((hx, y, hz), (5.4, 5.0, 5.2), p=2.3)
    head.blob((hx + 5.4, y - 0.4, hz - 1.0), (1.8, 1.6, 1.7), p=2.0)
    K.face2(rig, [head], SKIN, cx=hx + 4.4, cz=hz + 0.6, eye_dy=(y - 2.2, y + 2.2), eye_r=(2.1, 1.9, 2.4),
            pupil_r=(0.9, 1.3, 1.5), brow=HAIR, brow_w=0.55, mouth_dz=-3.6, mouth_x=hx + 4.8, head=name,
            mouth_w=2.8, eye_at=(hx + 5.0, hz + 0.8), mark_r=2.2)
    rig.part(name, head, SKIN)
    g = Geo().blob((hx - 0.4, y, hz + 3.2), (5.8, 5.4, 4.0), p=2.4)
    g.clip((0, 0, hz + 2.6), (0, 0, -1))
    g.lathe([(0, -0.5), (7.6, -0.5), (8.0, 0.0), (7.6, 0.5), (0, 0.5)], (hx - 0.4, y, hz + 2.8), segs=20)
    rig.part(name, g, STEEL, finish="metal")
    # the bow arm: a fist and a short bow (rest pointing forward, the bow upright)
    arm = name + "_arm"
    rig.joint(arm, name, (x + 2.0, y - 4.0, z + 9.0))
    g = Geo().capsule((x + 2.0, y - 4.2, z + 9.0), (x + 7.6, y - 4.2, z + 8.0), 1.8, 1.6)
    g.blob((x + 8.4, y - 4.2, z + 8.0), (2.0, 1.8, 2.0), p=2.3)
    rig.part(arm, g, SKIN)
    g = Geo()
    n = 6
    for i in range(n):
        a0, a1 = math.radians(-60 + 120 * i / n), math.radians(-60 + 120 * (i + 1) / n)
        g.capsule((x + 5.4 + 3.4 * math.cos(a0), y - 5.0, z + 8.0 + 9.0 * math.sin(a0)),
                  (x + 5.4 + 3.4 * math.cos(a1), y - 5.0, z + 8.0 + 9.0 * math.sin(a1)), 0.8)
    rig.part(arm, g, BOW, outline=0.5)
    g = Geo().capsule((x + 7.1, y - 5.0, z + 0.2), (x + 7.1, y - 5.0, z + 15.8), 0.35, segs=6, rings=2)
    rig.part(arm, g, STRING, outline=0.3)
    if front:
        rig.track("muzzle", arm, (x + 12.0, y - 5.0, z + 8.0))


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, R.R_WHEEL))
    rig.joint("odo", "root", (0, 0, 0))
    R._wheel(rig, "wheel_bf", AXLES[0], 13.0)
    R._wheel(rig, "wheel_ff", AXLES[1], 13.0)
    rig.joint("hull", "chassis", (0, 0, Z_BASE))

    # the frame: a base, four corner posts, braces, the top platform and its parapet
    g = Geo().blob(((X0 + X1) / 2, 0, Z_BASE), (24.0, 14.0, 3.2), p=3.5)
    rig.part("hull", g, DARK_WOOD)
    g = Geo()
    for x in (X0, X1):
        for y in (-12.0, 12.0):
            g.capsule((x, y, Z_BASE), (x + (1.5 if x < 0 else -1.5), y, Z_TOP), 2.2)
    for z in (50.0, 72.0):
        g.capsule((X0, 12.0, z), (X1, 12.0, z), 1.6)
    rig.part("hull", g, DARK_WOOD)
    g = Geo().blob(((X0 + X1) / 2, 0, Z_TOP), (24.0, 14.6, 2.6), p=3.6)
    rig.part("hull", g, WOOD)
    g = Geo()
    for x in range(-22, 23, 9):   # crenellated parapet (merlons)
        g.blob((float(x), -14.0, Z_TOP + 4.6), (3.2, 1.4, 3.4), p=3.0)
        g.blob((float(x), 14.0, Z_TOP + 4.6), (3.2, 1.4, 3.4), p=3.0)
    g.blob((X0 + 1.0, 0.0, Z_TOP + 4.6), (1.4, 13.0, 3.4), p=3.0)
    rig.part("hull", g, WOOD, outline=0.7)
    # pennant on the roof
    g = Geo().capsule((X0 + 4.0, 0.0, Z_TOP), (X0 + 2.0, 0.0, Z_TOP + 26.0), 1.1)
    rig.part("hull", g, DARK_WOOD, outline=0.7)
    rig.secondary("pennant", "hull", (X0 + 2.2, 0.0, Z_TOP + 24.0), (X0 - 12.0, 0.0, Z_TOP + 21.0), max_deg=16,
                  gain=1.2, rot_gain=0.6)
    pts = [(0.0, 0.0), (-14.0, -1.0), (-10.0, -4.2), (-14.0, -7.4), (0.0, -8.2)]
    g = Geo().slab([(X0 + 2.2 + x, Z_TOP + 24.4 + z) for x, z in pts], 0.0, 1.2)
    rig.part("pennant", g, team=True, outline=0.8)

    for i, (x, y) in enumerate(ARCHERS):
        _archer(rig, f"archer{i}", x, y, front=i == 1)

    # the drawbridge on its hinge (modelled upright against the front of the top storey)
    rig.joint("bridge", "hull", HINGE)
    hx, hy, hz = HINGE
    g = Geo().blob((hx + 1.2, 0.0, hz + BRIDGE / 2), (1.8, 11.4, BRIDGE / 2), p=4.0)
    rig.part("bridge", g, WOOD)
    g = Geo()
    for z in (hz + 5.0, hz + BRIDGE - 5.0):
        g.blob((hx + 3.0, 0.0, z), (0.8, 11.6, 1.4), p=3.0)
    rig.part("bridge", g, IRON, finish="metal", outline=0.5)
    g = Geo()
    for y in (-10.0, 10.0):
        g.capsule((hx + 2.0, y, hz + BRIDGE - 1.0), (X1 - 2.0, y, Z_TOP + 6.0), 0.9)
    rig.part("bridge", g, IRON, finish="metal", outline=0.4)
    rig.track("bridgeTip", "bridge", (hx + 1.2, 0.0, hz + BRIDGE))
    rig.track("_foot", "odo", (0, 0, 0))

    # crew legs pushing between the wheels
    for i, cx in enumerate((-8.0, 4.0)):
        for side, y in (("l", -3.0), ("r", -9.0)):
            n = f"c{i}_{side}"
            rig.joint(n, "chassis", (cx, y, 25.0))
            rig.joint(n + "2", n, (cx + 1.0, y, 13.5))
            g = Geo().capsule((cx, y, 26.0), (cx + 1.0, y, 13.5), 3.2, 2.8)
            rig.part(n, g, HOSE if side == "r" else "#4E555D")
            g = Geo().capsule((cx + 1.0, y, 13.5), (cx + 1.5, y, 3.8), 2.8, 2.6)
            rig.part(n + "2", g, HOSE if side == "r" else "#4E555D")
            g = Geo().blob((cx + 3.8, y, 2.4), (5.0, 3.2, 2.6), p=2.8, taper=(1.02, 0.85))
            rig.part(n + "2", g, BOOT)

    # the upper storeys: near-side plank walls with plank seams (wood shows above the hides)
    g = Geo().blob(((X0 + X1) / 2, -13.2, 80.0), (21.6, 1.4, 16.0), p=4.0)
    rig.part("hull", g, WOOD)
    g = Geo()
    for x in range(-17, 18, 6):
        g.capsule((float(x), -14.6, 65.0), (float(x), -14.6, 95.0), 0.6)
    rig.part("hull", g, DARK_WOOD, outline=0.3)
    g = Geo().blob((X1 + 0.4, 0.0, 87.0), (1.4, 12.6, 9.0), p=4.0)   # the front wall above the bridge
    rig.part("hull", g, WOOD)
    # wet team hides draped over the lower near side and the front, a parchment paw, a ragged hem
    hide = Geo().blob(((X0 + X1) / 2, -13.8, 47.0), (22.6, 1.6, 19.0), p=4.0)
    hface = F.Face(rig, "hull", [hide])
    rig.part("hull", hide, team=True)
    g = K.paw(hface, Geo(), K.scr(hface, (0.0, -15.0, 47.0)), s=2.0)
    rig.part("hull", g, PARCH, highlight=False, outline=0)
    g = Geo()
    for x in range(-18, 19, 7):   # ragged hem
        g.blob((float(x), -14.0, 28.6), (3.0, 1.4, 2.4), p=2.0)
        g.blob((float(x) + 3.5, -14.0, 65.6), (3.0, 1.4, 2.0), p=2.0)
    rig.part("hull", g, team=True, outline=0.5)
    g = Geo().blob((X1 + 0.6, 0.0, 42.0), (1.4, 12.6, 15.0), p=4.0)
    rig.part("hull", g, team=True, outline=0.6)
    g = Geo()
    for x in (X0, X1):
        g.capsule((x, -12.6, Z_BASE), (x + (1.5 if x < 0 else -1.5), -12.6, Z_TOP), 2.2)
    g.capsule((X0, -12.8, 50.0), (X1, -12.8, 72.0), 1.6)   # a diagonal brace over the hide
    rig.part("hull", g, DARK_WOOD, outline=0.7)
    R._wheel(rig, "wheel_bn", AXLES[0], -13.0)
    R._wheel(rig, "wheel_fn", AXLES[1], -13.0)


# -- poses ---------------------------------------------------------------------------------
WHEELS = ("wheel_bn", "wheel_fn", "wheel_bf", "wheel_ff")


def _wheels(deg):
    return {w: {"r": -deg} for w in WHEELS}


def _crew(step=None, brace=0.0):
    pose = {}
    for i in range(2):
        for side, ph in (("l", 0.0), ("r", math.pi)):
            n = f"c{i}_{side}"
            if step is not None:
                p = step + ph + i * math.pi * 0.5
                lift = max(0.0, math.sin(p))
                pose[n] = {"r": 30 * math.cos(p) + 18 * lift, "z": 2.4 * lift}
                pose[n + "2"] = {"r": -55 * lift}
            else:
                pose[n] = {"r": brace * (-30 if side == "r" else 12)}
                pose[n + "2"] = {"r": brace * (10 if side == "r" else -18)}
    return pose


def bridge(deg):
    """The drawbridge swung `deg` forward from upright (90 = flat, pointing ahead)."""
    return {"bridge": {"r": -deg}}


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    look = [0, 0, 1, 1, -1, 0][f]
    pose = merge(M.body_about((0, 0, 0), r=0.6 * c), _crew(brace=0.2), bridge(1.0 * lag), {
        "hull": dict(squash(0.01 * c)), "pennant": {"r": 5 * lag},
        "archer0": {"rz": 20 * look, "z": 0.6 * c}, "archer1": {"rz": -20 * look, "z": 0.6 * lag}})
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -math.cos(p)
    return merge(_wheels(R.WHEEL_STEP * f), _crew(step=p), bridge(2.0 * math.sin(p - 1.0)), {
        "odo": {"x": R.ODO_AMP * math.cos(p)},
        "hull": dict(squash(-0.02 * math.cos(p)), z=1.6 * bump + 0.3, r=1.8 * math.sin(p)),
        "archer0": {"z": 1.0 * math.sin(p - 1.2), "r": 3 * math.sin(p - 1.0)},
        "archer1": {"z": 1.0 * math.sin(p - 1.6), "r": 3 * math.sin(p - 1.4)},
        "pennant": {"r": 8 * math.sin(p - 1.4)},
    })


WALK_DUST = {k: [{"kind": "dust", "ground": (AXLES[0] - (13.0 if k % 2 else 8.0), 0.0),
                  "size_lu": 6.0 if k % 2 else 4.5, "puffs": 3, "seed": 140 + k, "spread": 1.0, "dir": -1.0}]
             for k in range(8)}


# attack: moves.HEAVY_MELEE_MS (1230 ms, impact at step 6); 10 unique poses on 12 steps
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        creak chains tip HOLD  fall  fall SLAM  bounce winch  up
A_BR = [0, 4, 10, 16, 52, 92, 122, 112, 60, 12]
A_R = [0.0, -0.5, -1.0, -1.5, 0.0, 1.0, 2.5, 0.5, 0.0, 0.0]
A_X = [0.0, -0.5, -1.0, -1.5, 0.0, 1.5, 3.0, 2.0, 0.5, 0.0]
A_Q = [0.0, -0.01, -0.02, -0.03, 0.02, 0.03, -0.08, 0.03, 0.0, 0.0]
A_BRACE = [0.3, 0.5, 0.8, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4, 0.3]


def _attack_pose(f):
    return merge(M.body_about((AXLES[1], 0, 0), x=A_X[f], r=-A_R[f], q=A_Q[f]), _wheels(-A_X[f] * 3),
                 _crew(brace=A_BRACE[f]), bridge(A_BR[f]), {
                     "archer0": {"z": [0, 0, 0, 0, 0, 0, 1.5, 0.5, 0, 0][f]},
                     "archer1": {"z": [0, 0, 0, 0, 0, 0, 1.5, 0.5, 0, 0][f]},
                     "pennant": {"r": [0, 2, 3, 4, -2, -6, -12, 6, 2, 0][f]}})


TIP = (HINGE[0] + 1.2, 0.0, HINGE[2] + BRIDGE)
SWING = {"kind": "arc", "joint": "bridge", "inner": (HINGE[0] + 1.2, 0, HINGE[2] + BRIDGE * 0.4), "outer": TIP,
         "color": "#E0D5BE", "taper": 0.2, "white": 0.3, "t0": 0.0, "t1": 0.95, "lines": 3}


def _ov(big=False):
    return {
        4: [dict(SWING, **{"from": 3})],
        5: [dict(SWING, **{"from": 4})],
        6: [dict(SWING, **{"from": 5, "lines": 2}),
            {"kind": "burst", "joint": "bridge", "point": TIP, "r0_lu": 8.0, "r1_lu": 17.0 if big else 15.0,
             "n": 7, "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (50.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 151, "spread": 1.3},
            {"kind": "dust", "ground": (AXLES[0] - 6.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 152,
             "spread": 1.0, "dir": -1.0}],
    }


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6, smear=4,
                  sequence=ATTACK_SEQ, overlays=_ov(), extra={"noMuzzle": True})


# attack B: lurch slam. 0 = A creak, 1 rock back, 2 further, 3 HOLD (reared back on the back wheels, the
# bridge half open), 4-5 lurch forward, the bridge falling, 6 SLAM, 7-9 = A
OB_R = [3.0, 6.0, 8.0, 4.0, 0.0, -3.0]
OB_X = [-1.5, -3.0, -4.0, -1.0, 2.0, 4.5]
OB_BR = [8, 18, 30, 64, 100, 126]
OB_Q = [-0.01, -0.02, -0.03, 0.02, 0.03, -0.10]


def _b_pose(i):
    if i == 0 or i >= 7:
        return _attack_pose(i)
    k = i - 1
    return merge(M.body_about((AXLES[0], 0, 0), x=OB_X[k], r=OB_R[k], q=OB_Q[k]), _wheels(-OB_X[k] * 3),
                 _crew(brace=1.0), bridge(OB_BR[k]), {
                     "archer0": {"r": 4 * OB_R[k] / 8}, "archer1": {"r": 4 * OB_R[k] / 8},
                     "pennant": {"r": -5 * OB_R[k]}})


def _attack_b():
    reuse = {0: ("attack", 0), 7: ("attack", 7), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6, smear=4,
                  sequence=ATTACK_SEQ, overlays=_ov(True), reuse=reuse, extra={"noMuzzle": True})


# attack_alt: the archers' own sim attack (10 every 1.4 s), the tower stands in idle pose 0
ALT_MS = [100, 140, 220, 140, 160, 240]       # 1000 ms, impact at 460 ms
ALT_SEQ = [0, 1, 2, 3, 4, 0]
ALT_AIM = [0, 10, 24, 18, 8]
ALT_DRAW = [0, 0.4, 1.0, 0.0, 0.0]


def _alt_pose(i):
    pose = _idle(0)
    if i == 0:
        return pose
    for k, name in enumerate(("archer0", "archer1")):
        pose[f"{name}_arm"] = {"r": ALT_AIM[i] + 4 * k}
        pose[name] = dict(pose.get(name, {}), r=-6 * ALT_DRAW[i], z=1.2 * ALT_DRAW[i])
    return pose


def _attack_alt():
    tip = (ARCHERS[1][0] + 12.0, ARCHERS[1][1] - 5.0, Z_TOP + 8.0)
    ov = {3: [{"kind": "rings", "joint": "archer1_arm", "point": tip, "radii_lu": (3.0, 5.0), "a0": -50.0,
               "a1": 50.0, "color": "#FFF4D6"}]}
    return M.clip("attack_alt", [_alt_pose(i) for i in range(5)], ALT_MS, impact=3, sequence=ALT_SEQ,
                  overlays=ov, reuse={0: ("idle", 0)})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_wheels(-6 * a), _crew(brace=0.3), bridge(6 * a), {
        "body": dict(squash([-0.06, 0.04, 0.02, -0.02, 0.0][k]), x=-3.0 * max(a, 0) + 1.0 * min(a, 0)),
        "hull": {"r": 3 * a}, "archer0": {"z": -4.0 * max(a, 0)}, "archer1": {"z": -4.0 * max(a, 0)},
        "pennant": {"r": 8 * a}})
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


D_BODY = [dict(x=-2, z=0, r=2, q=-0.05), dict(x=-4, z=4, r=6, q=0.04), dict(x=-6, z=2, r=11, q=0.02),
          dict(x=-8, z=0, r=16, q=-0.10), dict(x=-9, z=-3, r=20, q=-0.14), dict(x=-9, z=-4, r=21, q=-0.12),
          dict(x=-9, z=-4, r=21, q=-0.13), dict(x=-9, z=-4, r=21, q=-0.16, s=0.95)]
D_WHEEL = [(0, 0, 0), (4, 5, -40), (10, 8, -90), (16, 3, -150), (20, -2, -200), (21, -2, -205),
           (21, -2, -205), (21, -2, -205)]


def _die(k):
    b = D_BODY[k]
    wx, wz, wr = D_WHEEL[k]
    pose = merge(M.body_about((AXLES[0], 0, 0), x=b["x"], z=b["z"], r=b["r"], q=b["q"], s=b.get("s", 1.0)),
                 _crew(brace=0.0), bridge([0, 20, 50, 90, 124, 118, 120, 120][k]), {
                     "wheel_fn": {"x": wx, "z": wz, "r": wr},
                     "archer0": {"x": [0, -2, -8, -14, -20, -22, -22, -22][k], "z": [0, 6, 10, 2, -20, -40, -48, -50][k],
                                 "r": [0, 20, 80, 160, 240, 270, 270, 270][k]},
                     "archer1": {"x": [0, 2, 8, 16, 24, 28, 28, 28][k], "z": [0, 8, 12, 4, -20, -42, -50, -52][k],
                                 "r": [0, -20, -90, -170, -250, -275, -275, -275][k]}})
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 3:
        pose = merge(pose, F.expr("o"))
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], WALK_DUR, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        _attack_alt(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
