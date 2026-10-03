"""Bulldozer: Modern Age epic Siege, armored mech (CONTENT_PLAN 5.6). Blade, 220 vs the base and forts, ~84 lu.

Look (A11 vehicle rig, Modern palette): a chunky armoured bulldozer: a boxy olive engine hood with a
louvred grille and a tall exhaust stack, a rubber track (scrolling grousers, spinning road wheels, caked
mud), team side armour plates (a cream chevron, hazard stripes) and an open cab with a team roof and a
roll cage. A big curved steel blade on two hydraulic arms in front, its lip scuffed bright, a team stripe
along its top edge. The driver bounces in his seat in a leather cap and goggles; a team pennant on a whip
antenna (the heavies' pennant cue, A11).

"A viewer expects it to lower the blade and shove, a dirt wave rolling ahead, a slow tracked crawl, the
driver bouncing."

Animation (ANIM_SPEC G6 tracked, appendix B vehicles):
  idle      the engine shivers the hull, the stack puffs, the driver looks round and blinks
  walk      crawl: the track scrolls exactly 2 grouser spacings per 512 ms cycle at the ground speed (45 x
            1.25 = 56.25 lu/s), the hull heaves on its suspension, the blade bobs on its arms a beat late,
            the driver bounces, the stack puffs, dust from the rear
  attack    BLADE SHOVE: the blade lifts high and the hull rears back on its tracks (the held extreme,
            holdLoop), then the blade slams down and it lunges forward, a dirt wave rolling ahead
  attack_b  TILT SCOOP: the blade drops to the ground with the nose dipped (the held extreme, holdLoop) and
            scoops up and forward in a rising heave, dirt flying over the blade
  hit       vehicle: a suspension bounce, the driver ducks with his eyes squeezed, the pennant whips
  die       D7 wreck and bail: struck, it hops, lands tilted on a snapped track, the blade drops askew,
            black smoke; the driver leaps out and runs
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_modern as KM
from ageborn_art import moves as M
from ageborn_art import rigs_modern as R
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "bulldozer"
GAIT_NAME = "tracked"
NAME = "Bulldozer"
HEIGHT_LU = 86
YAW_DEG = -10.0
CANVAS = (470, 320)
FEET = (210, 290)
ANCHORS = {"head": (0, 78), "hitCenter": (0, 30)}
NO_RETIME = True

TR_R = 10.5
TX0, TX1 = -30.0, 26.0
TY = -15.0
TW = 9.0
PITCH = 12.5
STEP_LU = PITCH / 4
WALK_MS = [64, 64, 64, 64, 64, 64, 64, 64]     # 3.59 lu per step (scaled) at 56.25 lu/s
WHEELS = (-30.0, -16.0, -2.0, 12.0, 26.0)
SCALE = 1.15
ARM_PIVOT = (8.0, 0.0, 24.0)                   # the blade arms hinge on the hull side
BLADE_X = 44.0
DRIVER = (-14.0, 0.0, 44.0)
STEEL_LT = "#B9C0C6"
_W = {}


def build(rig):
    rig.joint("body", "root", (0, 0, 0), scale=SCALE)
    rig.joint("odo", "root", (0, 0, 0))
    rig.joint("hull", "body", (0, 0, 16.0))
    g = Geo().blob(((TX0 + TX1) / 2, 14.0, TR_R), ((TX1 - TX0) / 2 + TR_R, 4.0, TR_R), p=3.2)
    rig.part("hull", g, R.RUBBER, finish="gloss")
    # chassis and the engine hood (front), the cab deck (back)
    g = Geo().blob((-2.0, 0, 24.0), (34.0, 15.0, 6.4), p=3.6)
    rig.part("hull", g, R.OLIVE)
    hood = Geo().blob((10.0, 0, 34.0), (16.0, 12.0, 8.0), p=3.6, taper=(1.0, 0.9))
    hface = F.Face(rig, "hull", [hood])
    rig.part("hull", hood, R.OLIVE, finish="gloss")
    g = Geo()
    for z in (29.0, 32.0, 35.0, 38.0):
        g.blob((26.4, -2.0, z), (0.6, 8.0, 0.6), p=3.0)
    rig.part("hull", g, "#2F2E33", outline=0)                               # grille louvres
    g = Geo().blob((26.0, 0, 33.4), (1.0, 10.0, 6.6), p=3.6)
    rig.part("hull", g, R.GUNMETAL, finish="metal", outline=0.6)
    g = Geo().capsule((18.0, -6.0, 40.0), (18.0, -6.0, 52.0), 2.0, 1.7)         # exhaust stack
    rig.part("hull", g, R.GUNMETAL, finish="metal", outline=0.7)
    g = Geo().lathe([(2.2, 0), (2.8, 1.2), (2.4, 2.4)], (18.0, -6.0, 51.6), (18.0, -6.0, 54.0), segs=12)
    rig.part("hull", g, "#1E1C1C", outline=0.5)
    g = Geo()
    hface.stroke(g, hface.hit(12.0, 40.0), [(-10.0, 0.0), (10.0, 0.0)], 0.8, 0.4)
    rig.part("hull", g, "#4E5238", highlight=False, outline=0)
    # team side armour with a chevron and hazard stripes
    plate = Geo().blob((-2.0, TY - 3.2, 23.0), (33.0, 1.8, 6.0), p=3.6)
    pface = F.Face(rig, "hull", [plate])
    rig.part("hull", plate, team=True)
    g = KM.chevron(pface, Geo(), (2.0, 23.4), s=1.0, n=2, w=1.8, gap=2.8)
    rig.part("hull", g, KM.CREAM, highlight=False, outline=0)
    g = KM.stripes(pface, Geo(), (-27.0, 23.0), 10.0, 8.0, n=4, slant=0.6)
    rig.part("hull", g, KM.STRIPE_DK, highlight=False, outline=0)
    # the cab: seat, roll cage posts, a team roof
    g = Geo().blob((-16.0, 0, 33.0), (6.0, 8.0, 4.0), p=3.0)
    rig.part("hull", g, R.LEATHER)
    g = Geo()
    for x, y in ((-24.0, -9.0), (-8.0, -9.0), (-24.0, 9.0), (-8.0, 9.0)):
        g.capsule((x, y, 30.0), (x + 1.0, y, 60.0), 1.1)
    rig.part("hull", g, R.GUNMETAL, finish="metal", outline=0.6)
    g = Geo().blob((-15.5, 0, 61.0), (10.6, 11.0, 1.8), p=3.4)
    rig.part("hull", g, team=True)
    # track
    rig.joint("track", "body", (0, TY, 0))
    names, _ = R.tread(rig, "tn", "track", TX0, TX1, TR_R, TY, TW, PITCH, WHEELS, 4.6)
    _W["n"] = names
    g = Geo()
    for x, r in ((-20.0, 2.6), (2.0, 2.2), (18.0, 2.4)):
        g.blob((x, TY - 3.4, 3.0), (r * 1.6, 0.8, r), p=2.2)
    rig.part("track", g, KM.MUD, outline=0)
    # the blade on its arms
    rig.joint("arms", "hull", ARM_PIVOT)
    ax, ay, az = ARM_PIVOT
    g = Geo()
    for y in (-14.0, 14.0):
        g.capsule((ax, y, az), (BLADE_X - 4.0, y, 12.0), 2.0, 1.8)
    rig.part("arms", g, R.OLIVE_LT, outline=0.6)
    g = Geo().capsule((ax + 8.0, -14.5, az + 8.0), (BLADE_X - 12.0, -14.5, 18.0), 1.4)   # hydraulic ram
    rig.part("arms", g, STEEL_LT, finish="metal", outline=0.5)
    blade = Geo()
    for i in range(8):                                                           # a curved mouldboard
        z = 2.0 + i * 4.6
        x = BLADE_X + 4.0 * math.sin(math.pi * i / 7.0)
        blade.blob((x, 0, z), (2.6, 19.0, 2.8), p=3.0)
    rig.part("arms", blade, R.GUNMETAL, finish="metal")
    g = Geo()                                                                    # crescent end plates
    for y in (-19.6, 19.6):
        for i in range(8):
            z = 2.0 + i * 4.6
            x = BLADE_X + 4.0 * math.sin(math.pi * i / 7.0) - 3.0
            g.blob((x, y, z), (5.0, 1.0, 2.9), p=3.0)
    rig.part("arms", g, R.OLIVE_LT, finish="metal", outline=0.6)
    g = Geo().blob((BLADE_X + 1.0, 0, 1.6), (2.6, 19.2, 1.4), p=3.2)             # bright worn lip
    rig.part("arms", g, STEEL_LT, finish="metal", outline=0.6)
    g = Geo().blob((BLADE_X + 1.2, 0, 33.6), (2.8, 19.4, 2.0), p=3.2)            # team stripe on top
    rig.part("arms", g, team=True, outline=0.6)
    rig.track("bladeTip", "arms", (BLADE_X + 2.0, -10.0, 4.0))
    rig.joint("dirt", "arms", (BLADE_X + 10.0, -6.0, 6.0), hidden=True)        # the dirt wave
    g = Geo()
    for dx, dz, r in ((0, 0, 6.0), (6, 4, 4.8), (-3, 8, 4.4), (10, -1, 3.8), (4, 12, 3.4)):
        g.sphere((BLADE_X + 10.0 + dx, -6.0, 6.0 + dz), r, cuts=4)
    rig.part("dirt", g, KM.MUD_LT, finish="dust", outline=0.6)
    # the driver: team jacket, a round head with the face kit, leather cap and goggles
    cx, cy, cz = DRIVER
    rig.joint("cmdr", "hull", DRIVER, scale=1.2)
    g = Geo().blob((cx, 0, cz + 3.4), (6.0, 6.4, 5.4), p=2.4)
    rig.part("cmdr", g, team=True)
    hc = (cx + 1.0, 0.0, cz + 13.0)
    KM.crew_head(rig, "c_head", "cmdr", hc, k=1.0, brow=R.HAIR)
    g = Geo().blob((hc[0] - 0.6, 0, hc[2] + 3.4), (8.4, 8.0, 5.8), p=2.3)
    g.clip((hc[0], 0, hc[2] + 0.6), (0, 0, -1))
    rig.part("c_head", g, R.LEATHER)
    g = Geo()
    for y in (-3.4, 3.0):
        g.lathe([(0, 0), (2.3, 0.2), (2.4, 1.6), (0, 1.8)], (hc[0] + 5.6, y, hc[2] + 5.0), (hc[0] + 7.4, y, hc[2] + 5.8),
                segs=12)
    rig.part("c_head", g, R.GUNMETAL, finish="metal", outline=0.5)
    rig.joint("c_arm", "cmdr", (cx + 2.0, -6.4, cz + 5.6))                     # the arm on the levers
    g = Geo().capsule((cx + 2.0, -6.4, cz + 5.6), (cx + 9.0, -7.0, cz + 2.0), 2.0, 1.8)
    rig.part("c_arm", g, team=True, outline=0.5)
    g = Geo().blob((cx + 10.0, -7.2, cz + 1.6), (2.4, 2.0, 2.4), p=2.3)
    rig.part("c_arm", g, R.LEATHER, outline=0.5)
    KM.crew_runner(rig, "bail", "root", (0.0, -18.0, 0.0), k=1.25)
    R.pennant(rig, "hull", (-24.0, 8.0, 60.0), 26.0, length=16.0, w=8.0)
    R.smoke_puff(rig, "hull", (18.0, -6.0, 58.0), size=0.7, name="exhaust", color=R.SMOKE_DK)
    R.smoke_puff(rig, "hull", (-6.0, -4.0, 62.0), size=1.4, name="wreck", color="#6E6A66")
    rig.joint("snap", "track", (TX0 - 6.0, TY, 2.0), hidden=True)
    g = Geo()
    for k in range(4):
        g.capsule((TX0 - 6.0 - 4.0 * k, TY - 0.5, 1.6 + 0.4 * k), (TX0 - 10.0 - 4.0 * k, TY - 0.5, 1.6 + 0.4 * k), 1.8)
    rig.part("snap", g, R.RUBBER, finish="gloss", outline=0.5)
    rig.track("_foot", "odo", (0, 0, 0))


def _tracks(step, moving=True):
    return R.tread_pose("tn", _W["n"], step, STEP_LU if moving else 0.0, PITCH)


def _idle(f):
    t = f / 6 * 2 * math.pi
    pose = merge(_tracks(0, False), {
        "hull": dict(squash(0.012 * math.cos(2 * t)), z=0.45 * math.cos(2 * t)),
        "arms": {"r": 0.6 * math.sin(t - 0.8)},
        "c_head": {"rz": [0, 8, 14, 4, -10, -4][f]}, "cmdr": {"z": 0.4 * math.cos(2 * t)},
        "exhaust": {"show": f in (1, 4), "s": [1, 0.8, 1, 1, 0.9, 1][f], "z": [0, 0, 0, 0, 2, 0][f]},
    })
    if f == 4:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -abs(math.sin(p))
    lag = -abs(math.sin(p - 0.8))
    return merge(_tracks(f), {
        "odo": {"x": 2.0 * STEP_LU * SCALE * math.cos(p)},
        "hull": dict(squash(0.03 * math.cos(2 * p)), z=2.4 * bump + 1.2, r=1.5 * math.sin(p)),
        "arms": {"r": -1.4 * math.sin(p - 0.9)},
        "cmdr": {"z": 1.6 * lag + 0.8, "r": -4.0 * math.sin(p - 0.8)},
        "c_head": {"r": 3.0 * math.sin(p - 1.2)},
        "exhaust": {"show": f % 4 in (1, 2), "s": [1, 0.8, 1.15, 1][f % 4], "x": [0, -1.0, -4.0, 0][f % 4],
                    "z": [0, 0, 3.0, 0][f % 4]},
    })


def _walk_clip():
    ov = {f: [{"kind": "dust", "ground": (-42.0 - 4.0 * (f % 4), 0.0), "size_lu": 4.5 + 1.2 * (f % 4), "puffs": 3,
               "seed": 160 + f, "spread": 1.0, "dir": -1.0}] for f in range(8)}
    return M.clip("walk", [_walk(f) for f in range(8)], WALK_MS, loop=True, overlays=ov)


# moves.HEAVY_MELEE_MS (12 steps, impact on step 6 at 560 of 1230 ms); the 200 ms hold is split into the
# hold (130) and a wobble partner (70) for the holdLoop: 11 unique frames
ATTACK_MS = [70, 90, 100, 130, 70, 60, 50, 150, 90, 110, 100, 210]
ATTACK_IMPACT = 7
#        read  lift  rear  HOLD  wob   drop  slam  IMP   push  ease  settle
A_ARM = [0.0, -10.0, -22.0, -26.0, -25.0, -8.0, 6.0, 8.0, 5.0, 2.0, 0.0]     # blade up = negative
A_HR = [0.0, 2.0, 4.5, 5.5, 5.0, 1.0, -2.5, -3.5, -2.0, -0.5, 0.0]           # hull pitch, nose up +
A_BX = [0.0, -1.0, -3.0, -4.0, -3.6, 0.0, 4.0, 8.0, 7.0, 3.0, 0.0]
A_BZ = [0.0, 0.5, 1.5, 2.0, 1.8, 0.5, -0.5, -1.0, -0.5, 0.0, 0.0]
A_Q = [0.0, 0.02, 0.04, 0.05, 0.06, 0.0, -0.06, -0.10, -0.04, 0.0, 0.0]
A_CZ = [0.0, 1.0, 2.0, 2.0, 2.4, 0.0, -3.0, -4.0, -2.0, 0.0, 0.0]


def _a_pose(i):
    wheel = [0, 0, -2.0, -3.0, -3.0, 0, 3.0, 6.0, 8.0, 9.0, 9.0][i]
    pose = merge(_tracks(0, False), {
        "body": dict(squash(A_Q[i]), x=A_BX[i], z=A_BZ[i]),
        "hull": {"r": A_HR[i]},
        "arms": {"r": A_ARM[i]},
        "cmdr": {"z": A_CZ[i], "r": [0, 2, 4, 4, 5, 0, -6, -8, -4, 0, 0][i]},
        "dirt": {"show": i in (7, 8), "s": [1, 1, 1, 1, 1, 1, 1, 1.0, 1.35, 1, 1][i],
                 "x": [0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0][i]},
        "exhaust": {"show": i in (2, 3, 4, 7), "s": 1.2},
    })
    for name, wr in _W["n"]:
        pose.setdefault(name, {})["r"] = pose.get(name, {}).get("r", 0.0) - math.degrees(wheel / wr)
    if i in (2, 3, 4):
        pose = merge(pose, F.expr("grit"))
    elif i in (6, 7, 8):
        pose = merge(pose, F.expr("yell"))
    return pose


#        read  dip   lower HOLD  wob   dig   heave IMP   lift  ease  settle      (B: tilt scoop, rising)
B_ARM = [0.0, 6.0, 12.0, 14.0, 13.5, 8.0, -6.0, -16.0, -14.0, -6.0, 0.0]
B_HR = [0.0, -2.0, -4.0, -5.0, -4.6, -3.0, 1.0, 3.5, 2.0, 0.5, 0.0]
B_BX = [0.0, 0.5, 1.0, 1.0, 1.2, 3.0, 6.0, 8.0, 6.0, 3.0, 0.0]
B_BZ = [0.0, -0.5, -1.0, -1.5, -1.3, -1.0, 1.0, 2.5, 1.0, 0.0, 0.0]
B_Q = [0.0, -0.03, -0.05, -0.07, -0.06, 0.02, 0.05, 0.08, 0.02, 0.0, 0.0]


def _b_pose(i):
    if i in (0, 10):
        return _a_pose(i)
    pose = merge(_tracks(0, False), {
        "body": dict(squash(B_Q[i]), x=B_BX[i], z=B_BZ[i]),
        "hull": {"r": B_HR[i]},
        "arms": {"r": B_ARM[i]},
        "cmdr": {"z": [0, -1, -2, -2, -2, 0, 2, 3, 1, 0, 0][i], "r": [0, -3, -5, -6, -6, -2, 4, 6, 2, 0, 0][i]},
        "dirt": {"show": i in (7, 8), "z": [0, 0, 0, 0, 0, 0, 0, 14, 22, 0, 0][i], "s": ([1] * 7 + [1.1, 1.4, 1, 1])[i]},
        "exhaust": {"show": i in (5, 6, 7), "s": 1.2},
    })
    if i in (2, 3, 4):
        pose = merge(pose, F.expr("grit"))
    elif i in (6, 7, 8):
        pose = merge(pose, F.expr("yell"))
    return pose


def _dust(seed, x=58.0):
    return [{"kind": "dust", "ground": (x, 0.0), "size_lu": 9.0, "puffs": 5, "seed": seed, "spread": 1.2},
            {"kind": "dust", "ground": (-32.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": seed + 1, "spread": 0.9,
             "dir": -1.0}]


def _attack_clip():
    ov = {7: _dust(171) + [{"kind": "burst", "joint": "arms", "point": (BLADE_X + 3.0, -10.0, 10.0), "r0_lu": 10.0,
                            "r1_lu": 18.0, "n": 6, "a0": -60.0, "arc": 130.0}],
          8: _dust(173, x=64.0)[:1]}
    return M.clip("attack", [_a_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  sequence=list(range(11)) + [10], extra={"holdStep": 3, "holdLoop": [3, 4]})


def _attack_b():
    ov = {7: _dust(175) + [{"kind": "burst", "joint": "arms", "point": (BLADE_X + 3.0, -10.0, 26.0), "r0_lu": 10.0,
                            "r1_lu": 18.0, "n": 6, "a0": -20.0, "arc": 130.0}]}
    return M.clip("attack_b", [_b_pose(i) for i in range(11)], ATTACK_MS, impact=ATTACK_IMPACT, overlays=ov,
                  sequence=list(range(11)) + [10], reuse={0: ("attack", 0), 10: ("attack", 10)},
                  extra={"holdStep": 3, "holdLoop": [3, 4]})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_tracks(0, False), {
        "body": dict(squash([-0.08, -0.05, 0.03, -0.02, 0.0][k]), x=-4.0 * max(a, 0) + 1.2 * min(a, 0)),
        "hull": {"r": 4.0 * a}, "arms": {"r": -3.0 * a},
        "cmdr": {"z": -4.0 * max(a, 0), "r": 12 * a},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


D_BX = [-3.0, -6.0, -7.0, -7.0, -7.0, -7.0, -7.0, -7.0, -7.0, -7.0]
D_BZ = [2.0, 7.0, 0.0, 1.5, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
D_HR = [6.0, 9.0, -6.0, -8.0, -7.0, -7.0, -7.0, -7.0, -7.0, -7.0]
D_Q = [0.06, 0.04, -0.12, 0.04, -0.04, 0.0, 0.0, 0.0, -0.02, -0.04]
B_PATH = [None, None, None, (-8, 50, 20), (-26, 58, 40), (-46, 32, 25), (-62, 0, 0), (-68, 0, 4),
          (-74, 1.5, 0), (-80, 0, 4)]
B_RUN = [0, 0, 0, 0.9, 1.0, 0.6, -0.6, 0.8, -0.8, 0.8]
B_WAVE = [0, 0, 0, 10, -10, 30, 120, 40, 130, 40]


def _die(k):
    pose = merge(_tracks(0, False), {
        "body": dict(squash(D_Q[k]), x=D_BX[k], z=D_BZ[k]),
        "hull": {"r": D_HR[k]},
        "arms": {"r": [4, 10, 18, 20, 20, 20, 20, 20, 20, 20][k], "rx": [0, 4, 8, 10, 10, 10, 10, 10, 10, 10][k]},
        "wreck": {"show": k >= 2, "s": [1, 1, 0.8, 1.0, 1.2, 1.35, 1.45, 1.5, 1.55, 1.6][k],
                  "z": [0, 0, 0, 2, 5, 8, 11, 13, 15, 16][k]},
        "snap": {"show": k >= 2},
        "exhaust": {"show": k in (0, 1), "s": 1.3},
    })
    bp = B_PATH[k]
    if bp is None:
        pose["cmdr"] = {"z": [0, 3, 7][k], "r": [0, -6, 6][k]}
    else:
        x, z, r = bp
        pose["cmdr"] = {"hide": True}
        pose = merge(pose, {"bail": {"show": True, "x": x, "z": z, "r": r, "rz": 180.0 if k >= 5 else 0.0}},
                     KM.run_pose("bail", B_RUN[k], B_WAVE[k]))
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "o"))
    elif k < 3:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 1.6}})
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(6)], [153, 154, 153, 153, 154, 153], loop=True),
        _walk_clip(),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(10)], M.DIE_MS, extra=M.die_meta(HEIGHT_LU)),
    ]
    return M.check_variants(M.check_contract(cl, attack_ms=1230, attack_impact_at=0.4634))
