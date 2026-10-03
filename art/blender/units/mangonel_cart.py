"""Mangonel: Medieval Age epic artillery cart (CONTENT_PLAN 5.3). Arcing stone (proj.boulder), ~72 lu.

Look (A11 vehicle rig, the Battering Ram's wheels and crew): a low four-wheeled siege cart with team
planked sides (a parchment bear paw), dark beams, a twisted-rope torsion drum at the back, a long
throwing arm with a leather cup and a round stone, two upright posts in front carrying a padded team
crossbar the arm slams into, a spoked winch wheel on the near side and a team pennant on a pole at the front. A
crewman in a kettle hat pushes from behind; in the attack he hauls the release rope.

"A viewer expects the crew to winch the arm down, let it fly so it slams the crossbar and the cart
hops, and to push the cart along."

Animation (ANIM_SPEC G6 wheeled, appendix B for artillery: aimed shot, quick shot):
  idle      the arm creaks under tension, the crewman wipes his brow, the pennant sways
  walk      walk v3 (G6): six-spoke wheels roll exactly with the ground (2 spoke spacings per 570 ms
            at radius 15.3 lu = 56.2 lu/s, card 45 x 1.25), the hull bumps once per cycle, the
            crewman's legs drive behind the cart, dust off the back wheels, the pennant whips
  attack    AIMED SHOT: the crewman takes the rope and leans back (the held extreme, a hold loop with
            the arm quivering while the sim wind-up lasts), the arm whips up (a smear) and SLAMS the
            crossbar, the cart hops and the stone flies from the cup (`muzzle`); the crewman winches
            the arm back down and drops in a new stone
  attack_b  QUICK SHOT: the crewman yanks and dives aside with his hands over his ears; the slam
            rears the whole cart up on its back wheels
  hit       vehicle: a suspension bounce, the crewman ducks
  die       wreck: the arm snaps, a wheel pops off, the crewman is knocked flat, X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo
from units import battering_ram as R

SLUG = "mangonel_cart"
GAIT_NAME = "wheeled"
NAME = "Mangonel"
HEIGHT_LU = 72
YAW_DEG = -10.0
CANVAS = (380, 260)
FEET = (210, 232)
ANCHORS = {"head": (0, 66), "hitCenter": (0, 34), "muzzle": (8, 64)}
NO_RETIME = True

WOOD, DARK_WOOD, IRON, STEEL, GOLD = R.WOOD, R.DARK_WOOD, R.IRON, R.STEEL, R.GOLD
PARCH, ROPE, SKIN, HOSE, BOOT, HAIR = R.PARCH, R.ROPE, R.SKIN, "#626A74", R.BOOT, R.HAIR
LEATHER = "#6B5647"
STONE = "#8C8A86"

AXLES = (-20.0, 20.0)
PIVOT = (-6.0, 0.0, 30.0)             # the throwing arm's pivot in the torsion drum
ARM = 34.0
CROSSBAR = (3.0, 0.0, 60.0)
CUP = (PIVOT[0] + ARM, 0.0, PIVOT[2])   # the arm is modelled pointing forward (+x)
CREW_X = -64.0
COCKED = 148.0                         # arm angle: lying back over the rear, the cup low
SLAM = 60.0                            # arm angle against the crossbar


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, R.R_WHEEL))
    rig.joint("odo", "root", (0, 0, 0))
    R._wheel(rig, "wheel_bf", AXLES[0], 14.0)
    R._wheel(rig, "wheel_ff", AXLES[1], 14.0)
    rig.joint("hull", "chassis", (0, 0, 24.0))

    # the bed: two long beams, cross pieces, the far side planks, the torsion drum
    g = Geo()
    for y in (-11.0, 11.0):
        g.blob((0.0, y, 25.0), (32.0, 2.8, 3.0), p=3.5)
    g.blob((-30.0, 0, 25.0), (2.8, 13.0, 3.0), p=3.5).blob((30.0, 0, 25.0), (2.8, 13.0, 3.0), p=3.5)
    rig.part("hull", g, DARK_WOOD)
    g = Geo().blob((0.0, 12.6, 30.0), (30.0, 1.6, 6.4), p=3.6)
    rig.part("hull", g, team=True)
    g = Geo().capsule((PIVOT[0], -11.0, PIVOT[2]), (PIVOT[0], 11.0, PIVOT[2]), 5.2)
    rig.part("hull", g, team=True, outline=0.6)
    g = Geo()
    for y in (-11.6, 11.6):
        g.lathe([(5.6, -1.2), (6.4, 0), (5.6, 1.2)], (PIVOT[0], y, PIVOT[2]), (PIVOT[0], y + 0.1, PIVOT[2]), segs=18)
    rig.part("hull", g, IRON, finish="metal", outline=0.6)
    # the uprights and the padded team crossbar
    g = Geo()
    for y in (-9.0, 9.0):
        g.capsule((8.0, y, 26.0), (CROSSBAR[0], y, CROSSBAR[2] + 2.0), 2.0)
        g.capsule((18.0, y, 26.0), (CROSSBAR[0] + 1.0, y, CROSSBAR[2] - 4.0), 1.6)
    rig.part("hull", g, WOOD)
    g = Geo().capsule((CROSSBAR[0], -10.4, CROSSBAR[2]), (CROSSBAR[0], 10.4, CROSSBAR[2]), 3.8)
    rig.part("hull", g, team=True, outline=0.7)
    g = Geo()
    for y in (-6.0, 0.0, 6.0):
        g.lathe([(3.9, -0.5), (4.3, 0), (3.9, 0.5)], (CROSSBAR[0], y, CROSSBAR[2]), (CROSSBAR[0], y + 0.1, CROSSBAR[2]),
                segs=14)
    rig.part("hull", g, ROPE, outline=0.3)
    # pennant pole at the back
    g = Geo().capsule((26.0, -2.0, 26.0), (25.0, -2.0, 76.0), 1.2)
    rig.part("hull", g, DARK_WOOD, outline=0.8)
    g = Geo().sphere((25.0, -2.0, 77.0), 1.8, cuts=3)
    rig.part("hull", g, GOLD, finish="metal", outline=0.8)
    rig.secondary("pennant", "hull", (25.2, -2.0, 74.0), (10.0, -2.0, 70.0), max_deg=16, gain=1.2, rot_gain=0.6)
    pts = [(0.0, 0.0), (-15.0, -1.0), (-11.0, -4.4), (-15.0, -7.8), (0.0, -8.6)]
    g = Geo().slab([(25.2 + x, 74.5 + z) for x, z in pts], -2.0, 1.2)
    rig.part("pennant", g, team=True, outline=0.8)

    # the throwing arm, modelled pointing forward from the pivot, a leather cup, the stone
    rig.joint("arm", "hull", PIVOT)
    px, py, pz = PIVOT
    g = Geo().capsule((px - 3.0, py, pz), (CUP[0] - 3.0, py, pz), 2.6, 2.0)
    rig.part("arm", g, WOOD)
    g = Geo()
    for x in (px + 6.0, px + 18.0):
        g.lathe([(2.8, -0.7), (3.2, 0), (2.8, 0.7)], (x, py, pz), (x + 0.1, py, pz), segs=14)
    rig.part("arm", g, IRON, finish="metal", outline=0.5)
    g = Geo().blob((CUP[0], py, pz + 2.4), (5.0, 4.6, 2.6), p=2.4)
    g.clip((0, 0, pz + 2.6), (0, 0, 1))
    rig.part("arm", g, LEATHER)
    rig.joint("stone", "arm", (CUP[0], py, pz + 4.0))
    g = Geo().blob((CUP[0], py - 0.4, pz + 5.4), (4.2, 4.0, 3.8), p=2.2)
    rig.part("stone", g, STONE)
    rig.track("muzzle", "arm", (CUP[0], py, pz + 5.0))
    rig.track("_foot", "odo", (0, 0, 0))

    # the crewman behind the cart: legs, a leaning team body, a kettle hat
    for side, y in (("l", -2.0), ("r", -8.0)):
        n = f"c_{side}"
        rig.joint(n, "chassis", (CREW_X, y, 23.0))
        rig.joint(n + "2", n, (CREW_X + 1.0, y, 12.5))
        g = Geo().capsule((CREW_X, y, 24.0), (CREW_X + 1.0, y, 12.5), 3.4, 3.0)
        rig.part(n, g, HOSE if side == "r" else "#4E555D")
        g = Geo().capsule((CREW_X + 1.0, y, 12.5), (CREW_X + 1.5, y, 3.8), 3.0, 2.7)
        rig.part(n + "2", g, HOSE if side == "r" else "#4E555D")
        g = Geo().blob((CREW_X + 3.8, y, 2.4), (5.2, 3.4, 2.6), p=2.8, taper=(1.02, 0.85))
        g.blob((CREW_X + 1.6, y, 5.0), (3.6, 3.4, 2.3), p=2.6)
        rig.part(n + "2", g, BOOT)
    rig.joint("crew", "chassis", (CREW_X, -4.0, 23.0))
    g = Geo().capsule((CREW_X, -4.0, 25.0), (CREW_X + 5.5, -4.0, 36.0), 6.0, 5.4)
    rig.part("crew", g, team=True)
    rig.joint("crew_arm", "crew", (CREW_X + 5.0, -8.0, 34.0))
    g = Geo().capsule((CREW_X + 5.0, -8.5, 34.0), (CREW_X + 13.0, -8.5, 29.0), 2.4, 2.2)
    g.blob((CREW_X + 13.6, -8.5, 28.6), (2.6, 2.4, 2.6), p=2.3)
    rig.part("crew_arm", g, SKIN)
    rig.joint("crew_head", "crew", (CREW_X + 8.0, -4.0, 40.0))
    hx0, hy0, hz0 = CREW_X + 8.5, -4.0, 43.0
    head = Geo().blob((hx0, hy0, hz0), (6.4, 6.0, 6.2), p=2.3)
    head.blob((hx0 + 6.4, hy0 - 0.4, hz0 - 1.2), (2.2, 2.0, 2.1), p=2.0)
    K.face2(rig, [head], SKIN, cx=hx0 + 5.2, cz=hz0 + 0.6, eye_dy=(hy0 - 2.6, hy0 + 2.6),
            eye_r=(2.4, 2.2, 2.8), pupil_r=(1.0, 1.55, 1.75), brow=HAIR, brow_w=0.6, mouth_dz=-4.2,
            mouth_x=hx0 + 5.6, head="crew_head", mouth_w=3.4, eye_at=(hx0 + 6.0, hz0 + 0.8), mark_r=2.6)
    rig.part("crew_head", head, SKIN)
    g = Geo().blob((hx0 - 0.5, hy0, hz0 + 3.6), (6.8, 6.4, 4.8), p=2.4)
    g.clip((0, 0, hz0 + 3.0), (0, 0, -1))
    g.lathe([(0, -0.6), (9.0, -0.6), (9.6, 0.0), (9.0, 0.6), (0, 0.6)], (hx0 - 0.5, hy0, hz0 + 3.2), segs=22)
    rig.part("crew_head", g, STEEL, finish="metal")

    # the near side: team planks with a parchment paw, the winch wheel, then the near wheels
    pl = Geo().blob((0.0, -12.6, 30.0), (30.0, 1.6, 6.4), p=3.6)
    pf = F.Face(rig, "hull", [pl])
    rig.part("hull", pl, team=True)
    g = K.paw(pf, Geo(), K.scr(pf, (6.0, -14.0, 30.0)), s=1.4)
    rig.part("hull", g, PARCH, highlight=False, outline=0)
    g = Geo()
    for x in (-22.0, -8.0, 22.0):
        g.capsule((x, -14.4, 24.4), (x, -14.4, 35.6), 1.0)
    rig.part("hull", g, DARK_WOOD, outline=0.4)
    rig.joint("winch", "hull", (-14.0, -16.0, 36.0))
    g = Geo()
    for k in range(4):
        a = math.radians(45 * k)
        g.capsule((-14.0 - 8.0 * math.cos(a), -16.0, 36.0 - 8.0 * math.sin(a)),
                  (-14.0 + 8.0 * math.cos(a), -16.0, 36.0 + 8.0 * math.sin(a)), 1.1)
    g.sphere((-14.0, -16.6, 36.0), 2.4, cuts=2)
    rig.part("winch", g, WOOD, outline=0.6)
    R._wheel(rig, "wheel_bn", AXLES[0], -14.0)
    R._wheel(rig, "wheel_fn", AXLES[1], -14.0)


# -- poses ---------------------------------------------------------------------------------
WHEELS = ("wheel_bn", "wheel_fn", "wheel_bf", "wheel_ff")


def _wheels(deg):
    return {w: {"r": -deg} for w in WHEELS}


def arm(deg, loaded=True, quiver=0.0):
    return {"arm": {"r": deg + quiver}, "stone": {"hide": not loaded}}


def _crew(step=None, pull=0.0, duck=0.0):
    pose = {}
    if step is not None:
        for side, ph in (("l", 0.0), ("r", math.pi)):
            p = step + ph
            lift = max(0.0, math.sin(p))
            pose[f"c_{side}"] = {"r": -16 + 30 * math.cos(p) + 14 * lift, "z": 1.8 * lift}
            pose[f"c_{side}2"] = {"r": -55 * lift}
        pose["crew"] = {"z": 1.2 * abs(math.sin(step)), "r": -2 * math.cos(2 * step)}
        return pose
    pose["crew"] = {"r": 18 * pull - 30 * duck, "x": -2.0 * pull - 6.0 * duck, "z": -6.0 * duck}
    pose["crew_arm"] = {"r": -40 * pull + 90 * duck}
    pose["crew_head"] = {"r": -10 * pull + 20 * duck}
    pose["c_l"] = {"r": 14 * pull + 50 * duck}
    pose["c_r"] = {"r": -20 * pull + 40 * duck}
    pose["c_l2"] = {"r": -50 * duck}
    pose["c_r2"] = {"r": -60 * duck}
    return pose


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    wipe = [0, 0, 1, 1, 0, 0][f]
    pose = merge(arm(COCKED, quiver=0.8 * lag), _crew(pull=0.1), {
        "hull": dict(squash(0.012 * c), z=0.4 * c), "pennant": {"r": 4 * lag},
        "crew_arm": {"r": 70 * wipe}, "crew_head": {"r": -4 * wipe}})
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -math.cos(p)
    return merge(_wheels(R.WHEEL_STEP * f), _crew(step=p), arm(COCKED, quiver=2.0 * math.sin(p - 1.0)), {
        "odo": {"x": R.ODO_AMP * math.cos(p)},
        "hull": dict(squash(-0.03 * math.cos(p)), z=1.8 * bump + 0.4, r=2.0 * math.sin(p)),
        "crew_head": {"r": 3 * math.sin(p - 1.0)},
        "pennant": {"r": 8 * math.sin(p - 1.4)},
        "winch": {"r": -R.WHEEL_STEP * f * 0.5},
    })


WALK_DUST = {k: [{"kind": "dust", "ground": (AXLES[0] - (13.0 if k % 2 else 8.0), 0.0),
                  "size_lu": 6.0 if k % 2 else 4.5, "puffs": 3, "seed": 120 + k, "spread": 1.0, "dir": -1.0}]
             for k in range(8)}


# attack: moves.HEAVY_MELEE_MS (1230 ms, impact at step 6); 10 unique poses on 12 steps. Step 4 is the
# hold-loop partner (the arm quivers), step 5 the release smear.
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#        ready grab  lean HOLD quiver RELEASE SLAM  rock  winch  load
A_ARM = [COCKED, COCKED, COCKED + 2, COCKED + 3, COCKED + 1.5, 115, SLAM, SLAM + 6, 120, COCKED]
A_PULL = [0.0, 0.4, 0.8, 1.0, 0.95, 0.4, 0.0, 0.0, 0.2, 0.0]
A_HULL = [0.0, 0.0, -0.5, -1.0, -0.8, 0.5, 2.0, -1.5, 0.0, 0.0]
A_Z = [0.0, 0.0, -0.4, -0.8, -0.7, 1.0, 3.0, 0.5, 0.0, 0.0]
A_Q = [0.0, -0.01, -0.03, -0.05, -0.04, 0.04, 0.08, -0.06, 0.0, 0.0]
A_WINCH = [0, 0, 0, 0, 0, 0, 0, 0, 90, 180]


def _attack_pose(f, quick=False):
    loaded = f < 6 or f == 9
    pose = merge(arm(A_ARM[f], loaded=loaded, quiver=0.0), M.body_about((AXLES[0], 0, 0), z=A_Z[f], q=A_Q[f]), {
        "hull": {"r": A_HULL[f]}, "winch": {"r": A_WINCH[f]},
        "pennant": {"r": [0, 0, 2, 3, 2, -6, -12, 8, 2, 0][f]},
    })
    if quick and 1 <= f <= 7:
        duck = [0, 0.3, 0.8, 1.0, 1.0, 1.0, 1.0, 0.7][f]
        pose = merge(pose, _crew(pull=0.3 * (1 - duck), duck=duck))
        if f in (5, 6, 7):   # the slam rears the cart up on its back wheels
            pose = merge(pose, M.body_about((AXLES[0], 0, 0), r=[0, 0, 0, 0, 0, 3, 7, 3][f]))
    else:
        pose = merge(pose, _crew(pull=A_PULL[f]))
        if f == 8:
            pose = merge(pose, {"crew_arm": {"r": 30}})
    if f in (2, 3, 4):
        pose = merge(pose, F.expr("squeeze" if quick else "grit"))
    elif f in (5, 6):
        pose = merge(pose, F.expr("yell" if not quick else "squeeze"))
    return pose


SWING = {"kind": "arc", "joint": "arm", "inner": (PIVOT[0] + ARM * 0.4, 0, PIVOT[2]), "outer": CUP,
         "color": "#E0D5BE", "taper": 0.15, "white": 0.35, "t0": 0.0, "t1": 0.95, "lines": 3}


def _ov():
    return {
        5: [dict(SWING, **{"from": 4})],
        6: [dict(SWING, **{"from": 5, "lines": 2}),
            {"kind": "burst", "joint": "hull", "point": (CROSSBAR[0] + 2.0, 0, CROSSBAR[2] + 2.0), "r0_lu": 7.0,
             "r1_lu": 14.0, "n": 6, "a0": -40.0, "arc": 180.0},
            {"kind": "dust", "ground": (AXLES[1] + 6.0, 0.0), "size_lu": 7.0, "puffs": 4, "seed": 131, "spread": 1.2},
            {"kind": "dust", "ground": (AXLES[0] - 6.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 132, "spread": 1.0,
             "dir": -1.0}],
    }


def _attack_clip():
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=_ov(), extra={"holdStep": 3, "holdLoop": [3, 4]})


def _attack_b():
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_attack_pose(f, quick=True) for f in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=_ov(), reuse=reuse, extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_wheels(-8 * a), _crew(duck=0.5 * max(a, 0)), arm(COCKED, quiver=6 * a), {
        "body": dict(squash([-0.08, 0.05, 0.02, -0.02, 0.0][k]), x=-4.0 * max(a, 0) + 1.2 * min(a, 0)),
        "hull": {"r": 4 * a, "z": [-1.5, 1.5, 0.5, -0.3, 0.0][k]}, "pennant": {"r": 8 * a},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


D_BODY = [dict(x=-2, z=0, r=2, q=-0.06), dict(x=-4, z=6, r=6, q=0.05), dict(x=-6, z=3, r=9, q=0.02),
          dict(x=-7, z=0, r=10, q=-0.12), dict(x=-7, z=-3, r=11, q=-0.16), dict(x=-7, z=-4, r=11, q=-0.14),
          dict(x=-7, z=-4, r=11, q=-0.15), dict(x=-7, z=-4, r=11, q=-0.18, s=0.95)]
D_WHEEL = [(0, 0, 0), (4, 5, -40), (10, 8, -90), (16, 3, -150), (20, -2, -200), (21, -2, -205),
           (21, -2, -205), (21, -2, -205)]


def _die(k):
    b = D_BODY[k]
    wx, wz, wr = D_WHEEL[k]
    pose = merge(M.body_about((AXLES[0], 0, 0), x=b["x"], z=b["z"], r=b["r"], q=b["q"], s=b.get("s", 1.0)), {
        "hull": {"r": [0, 2, 4, 5, 6, 6, 6, 6][k], "z": [0, 0, -1, -3, -5, -5, -5, -5][k]},
        "arm": {"r": [COCKED, 150, 110, 60, 20, 10, 8, 8][k], "z": [0, 0, 2, 0, -6, -10, -10, -10][k]},
        "stone": {"hide": k >= 2},
        "wheel_fn": {"x": wx, "z": wz, "r": wr},
        "crew": {"r": [6, 20, 45, 70, 82, 84, 84, 84][k], "x": [0, -2, -5, -8, -10, -10, -10, -10][k],
                 "z": [0, 2, 1, -4, -10, -11, -11, -11][k]},
        "c_l": {"r": [10, 30, 50, 70, 80, 80, 80, 80][k], "z": [0, 2, 1, -2, -6, -7, -7, -7][k]},
        "c_r": {"r": [6, 24, 44, 64, 76, 76, 76, 76][k], "z": [0, 2, 1, -2, -6, -7, -7, -7][k]},
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
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        M.clip("walk", [_walk(f) for f in range(8)], R.WALK_DUR, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
