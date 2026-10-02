"""Battering Ram: Medieval Age siege vehicle (DESIGN A5.3). Swinging ram, ~90 lu.

Look (A11 vehicle rig): a wheeled siege shed with a rounded team-hide "tortoise" roof
strapped with curved dark wooden ribs, stitched seams and a parchment bear paw, a scalloped
team valance, a heavy log hung on iron chains under the roof, and a big steel ram's head with
curled gold horns and an angry eye sticking out of the front. Four chunky spoked wheels, a
team pennant on a pole at the back. The crew shows: two pairs of booted legs push between
the wheels and a crewman in a kettle hat peeks out from under the back of the roof.

Animation (art director plan 2026-09-30, `ageborn_art/moves.py`, `kit_medieval.py`):
  idle    the chains sway, the peeking crewman looks about and blinks
  walk    walk v3 (ANIM_SPEC G6): six-spoke wheels roll exactly with the ground (2 spoke spacings,
          120 degrees, per 570 ms cycle at radius 15.3 lu = 56.2 lu/s, card 45 x 1.25), 15 degrees
          per frame so they never strobe; the crew's legs jog, the hull bumps once per cycle and
          pitches, the pennant whips, dust kicks off the back wheels
  attack_b  DOUBLE PUMP: a short pump swing first, then the crew rear the whole shed back on its
          back wheels with the log hauled right back (the held extreme), and the full slam
  attack  CREW HEAVE-HO: the crew brace and haul the log back on its chains (the held
          extreme: log right back, hull leaning, the crewman gritting his teeth), then the log
          swings through (smear) and SLAMS (impact lines, dust, the hull lurches and the
          planks rattle, the crewman yells), and the log rocks back to rest
  hit     vehicle: a suspension bounce, the crewman ducks with his eyes squeezed
  die     D7 wreck: a hop, the hull tips back and sags, a front wheel pops off, the log
          drops, and the crewman pops out of the back with X eyes
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_medieval as K
from ageborn_art import moves as M
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "battering_ram"
GAIT_NAME = "wheeled"
NAME = "Battering Ram"
HEIGHT_LU = 92
YAW_DEG = -10.0
CANVAS = (350, 250)
FEET = (156, 224)
ANCHORS = {"head": (0, 80), "hitCenter": (0, 40)}
NO_RETIME = True

WOOD = "#9C8468"
DARK_WOOD = "#5E5045"
LOG = "#8A7560"
IRON = "#5A6068"
STEEL = "#A7B0BB"
GOLD = "#D4A437"
PARCH = "#E8DFC8"
ROPE = "#CDBB92"
EYE = "#FAF6EE"
PUPIL = "#221C19"
SKIN = "#EBC4A0"
HOSE = "#8E2A4A"
BOOT = "#5E4E42"
HAIR = "#4A3B31"

R_WHEEL = 15.3
AXLES = (-25.0, 22.0)
PIVOT = (-2.0, 0.0, 68.0)   # the log's chains hang from here
CHAIN_L = 68.0 - 37.0       # chain length (pivot to log axis)
LOG_Z = 37.0
HEAD_X = 44.0               # the ram head's centre, in front of the shed
SPOKES = 6
WALK_CYCLE_MS = 570
WALK_DUR = [71, 71, 72, 71, 71, 71, 72, 71]          # 570 ms
WHEEL_STEP = 2 * (360.0 / SPOKES) / 8   # 15 degrees per frame: 2 spoke spacings per cycle (25%)
# the walk's natural speed comes from the odometer tracker (strideLu = 2 x its x range): the rim
# travels 2 x 2 pi r / SPOKES = 32.04 lu per cycle
ODO_AMP = 2 * 2 * math.pi * R_WHEEL / SPOKES / 4
CREW_X = (-5.0, 4.0, -54.0)  # the two pushers' hips between the wheels, and a third pushing from behind


def _wheel(rig, name, x, y):
    rig.joint(name, "chassis", (x, y, R_WHEEL))
    g = Geo()   # the tyre: a ring of capsules (a lathe would cap it into a disk)
    n = 16
    for k in range(n):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        g.capsule((x + (R_WHEEL - 1.6) * math.cos(a0), y, R_WHEEL + (R_WHEEL - 1.6) * math.sin(a0)),
                  (x + (R_WHEEL - 1.6) * math.cos(a1), y, R_WHEEL + (R_WHEEL - 1.6) * math.sin(a1)),
                  2.4, segs=10, rings=2)
    rig.part(name, g, DARK_WOOD)
    g = Geo()
    for k in range(SPOKES):
        a = math.radians(360.0 / SPOKES * k)
        g.capsule((x, y, R_WHEEL), (x + (R_WHEEL - 2.5) * math.cos(a), y, R_WHEEL + (R_WHEEL - 2.5) * math.sin(a)),
                  1.9, 1.5, segs=8, rings=2)
    rig.part(name, g, WOOD, outline=0.8)
    g = Geo().blob((x, y - 1.0, R_WHEEL), (4.4, 3.2, 4.4), p=2.4)
    rig.part(name, g, IRON, finish="metal")
    g = Geo()
    for k in range(SPOKES):   # iron studs on the tyre, so the roll reads
        a = math.radians(360.0 / SPOKES * (k + 0.5))
        g.sphere((x + (R_WHEEL - 1.2) * math.cos(a), y - 2.2, R_WHEEL + (R_WHEEL - 1.2) * math.sin(a)), 1.2, cuts=2)
    rig.part(name, g, IRON, finish="metal", outline=0)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, R_WHEEL))
    rig.joint("odo", "root", (0, 0, 0))     # odometer for the walk metadata (no parts)
    # far wheels first
    _wheel(rig, "wheel_bf", AXLES[0], 15.0)
    _wheel(rig, "wheel_ff", AXLES[1], 15.0)
    rig.joint("hull", "chassis", (0, 0, 24.0))

    # base frame: two long beams and cross pieces
    g = Geo()
    for y in (-11.0, 11.0):
        g.blob((-2.0, y, 24.0), (40.0, 3.0, 3.4), p=3.5)
    g.blob((-40.0, 0, 24.0), (3.0, 14.0, 3.2), p=3.5).blob((36.0, 0, 24.0), (3.0, 14.0, 3.2), p=3.5)
    rig.part("hull", g, DARK_WOOD)

    # the shed: a rounded team-hide "tortoise" roof strapped with curved wooden ribs
    RX, RY, RZ, RP, RC = 41.0, 22.5, 37.0, 2.6, -2.0
    roof = Geo().blob((RC, 0, 38.0), (RX, RY, RZ), p=RP, cuts=10)
    roof.clip((0, 0, 38.0), (0, 0, -1))
    rf = F.Face(rig, "hull", [roof])
    rig.part("hull", roof, team=True)
    g = K.paw(rf, Geo(), K.scr(rf, (0.0, -19.5, 58.0)), s=2.0)
    rig.part("hull", g, PARCH, highlight=False, outline=0)
    g = Geo()   # stitched seams between the ribs (short parchment dashes)
    for x in (-16.0, 16.0):
        for k in range(4):
            c = rf.hit(*K.scr(rf, (x, -19.0, 44.0 + 6.5 * k)))
            rf.stroke(g, c, [(-1.1, -1.0), (1.1, 1.0)], 1.0, 0.4)
    rig.part("hull", g, PARCH, highlight=False, outline=0)
    # scalloped team valance hanging from the near eave
    g = Geo().blob((-2.0, -21.4, 36.2), (37.5, 1.2, 3.4), p=3.0)
    for x in range(-34, 33, 8):
        g.blob((x + 2.0, -21.4, 32.6), (3.8, 1.2, 2.6), p=2.0)
    rig.part("hull", g, team=True, outline=0.8)
    g = Geo()
    for x in (-24.0, -8.0, 8.0, 24.0):   # ribs over the near half of the roof
        k = (1 - abs((x - RC) / RX) ** RP) ** (1 / RP)
        pts = []
        for i in range(8):
            t = math.radians(-6 + 104 * i / 7)
            c, sn = math.cos(t), math.sin(t)
            n = (abs(c) ** RP + abs(sn) ** RP) ** (1 / RP)
            pts.append((x, -(RY * k + 1.0) * c / n, 38.0 + (RZ * k + 1.0) * sn / n))
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 1.8, segs=8, rings=2)
    g.capsule((-40.0, -22.4, 38.4), (36.0, -22.4, 38.4), 2.1)   # eave beam
    rig.part("hull", g, DARK_WOOD)
    g = Geo().blob((RC, 0, 38.0 + RZ + 0.6), (RX * 0.55, 3.0, 2.4), p=3.0)   # ridge board
    rig.part("hull", g, WOOD)
    # pennant pole at the back with a team swallowtail (follow-through)
    g = Geo().capsule((-34.0, -3.0, 68.0), (-37.0, -3.0, 94.0), 1.3)
    rig.part("hull", g, DARK_WOOD, outline=0.8)
    g = Geo().sphere((-37.1, -3.0, 95.0), 1.9, cuts=3)
    rig.part("hull", g, GOLD, finish="metal", outline=0.8)
    rig.secondary("pennant", "hull", (-36.8, -3.0, 92.0), (-52.0, -3.0, 88.0), max_deg=16, gain=1.2,
                  rot_gain=0.6)
    pts = [(0.0, 0.0), (-17.0, -1.2), (-12.5, -5.0), (-17.0, -8.8), (0.0, -9.8)]
    g = Geo().slab([(-36.8 + x, 92.5 + z) for x, z in pts], -3.0, 1.2)
    rig.part("pennant", g, team=True, outline=0.8)

    # the log on two chains, swinging from the pivot; steel ram head with gold curled horns
    # two parallel chains, so the log swings like a pendulum but stays level
    px, py, pz = PIVOT
    for name, x in (("chain_a", -18.0), ("chain_b", 14.0)):
        rig.joint(name, "hull", (x, 0.0, pz))
        g = Geo()
        for k in range(6):
            z = pz - 3 - k * (pz - LOG_Z - 6) / 5.5
            g.blob((x, 0.0, z), (1.3, 0.9, 2.2), p=2.2)
        rig.part(name, g, IRON, finish="metal", outline=0.6)
    rig.joint("ram", "hull", PIVOT)
    g = Geo().capsule((-56.0, 0, LOG_Z), (HEAD_X - 6, 0, LOG_Z), 6.0, 6.6)
    rig.part("ram", g, LOG)
    g = Geo()
    for x in (-50.0, -30.0, 26.0):
        g.lathe([(6.9, -1.6), (7.3, 0), (6.9, 1.6)], (x, 0, LOG_Z), (x + 1, 0, LOG_Z), segs=18)
    rig.part("ram", g, IRON, finish="metal", outline=0.8)
    hx, hz = HEAD_X, LOG_Z
    g = Geo().blob((hx, 0, hz + 1.0), (10.5, 8.4, 9.0), p=2.4, taper=(0.9, 1.0))
    g.blob((hx + 8.5, 0, hz - 2.0), (6.0, 6.2, 5.6), p=2.3)          # snout
    g.lathe([(7.4, 0), (7.8, 3.5), (7.2, 5.0)], (hx - 12.0, 0, hz), (hx - 7.0, 0, hz), segs=18)  # collar
    rig.part("ram", g, STEEL, finish="metal")
    g = Geo()
    for sgn in (-1.0, 1.0):  # curled horns: spheres along a spiral beside the head
        for k in range(9):
            t = k / 8.0
            ang = math.radians(100 + 300 * t)
            rr = 8.0 * (1 - 0.6 * t)
            g.sphere((hx - 3.0 + rr * math.cos(ang), sgn * (9.0 + 1.2 * t), hz + 3.0 + rr * math.sin(ang)),
                     3.3 * (1 - 0.45 * t), cuts=3)
    rig.part("ram", g, GOLD, finish="metal")
    g = Geo().blob((hx + 5.5, -7.2, hz + 4.0), (2.2, 1.2, 1.8), p=2.2)
    rig.part("ram", g, EYE, highlight=False, outline=0.6)
    g = Geo().blob((hx + 6.3, -7.9, hz + 3.8), (1.1, 0.9, 1.2), p=2.2)
    g.capsule((hx + 3.0, -7.8, hz + 7.4), (hx + 7.8, -7.6, hz + 5.6), 0.9)  # angry brow
    rig.part("ram", g, PUPIL, outline=0)
    rig.track("ramHead", "ram", (hx + 13.0, 0, hz - 1.0))
    rig.track("_foot", "odo", (0, 0, 0))
    # the crew: two pairs of booted legs pushing between the wheels (far legs first)
    for i, cx in enumerate(CREW_X):
        for side, y in (("l", -3.0), ("r", -9.0)):
            n = f"c{i}_{side}"
            rig.joint(n, "chassis", (cx, y, 23.0))
            rig.joint(n + "2", n, (cx + 1.0, y, 12.5))
            g = Geo().capsule((cx, y, 24.0), (cx + 1.0, y, 12.5), 3.4, 3.0)
            rig.part(n, g, HOSE)
            g = Geo().capsule((cx + 1.0, y, 12.5), (cx + 1.5, y, 3.8), 3.0, 2.7)
            rig.part(n + "2", g, HOSE)
            g = Geo().blob((cx + 3.8, y, 2.4), (5.2, 3.4, 2.6), p=2.8, taper=(1.02, 0.85))
            g.blob((cx + 1.6, y, 5.0), (3.6, 3.4, 2.3), p=2.6)
            rig.part(n + "2", g, BOOT)
    # the rear pusher's body: leaning into the back beam, kettle hat, team tunic (walk v3: his legs
    # jog behind the shed, so the crew's steps read in the silhouette)
    rig.joint("c2_body", "chassis", (-54.0, -4.0, 23.0))
    g = Geo().capsule((-54.0, -4.0, 25.0), (-48.5, -4.0, 34.0), 5.6, 5.2)
    rig.part("c2_body", g, team=True)
    g = Geo().capsule((-48.5, -6.5, 33.0), (-41.5, -6.5, 27.0), 2.4, 2.2).blob((-41.0, -6.5, 26.5), (2.6, 2.4, 2.6), p=2.3)
    rig.part("c2_body", g, SKIN)
    g = Geo().blob((-46.0, -4.0, 40.5), (5.0, 4.8, 4.9), p=2.3)
    g.blob((-41.4, -4.4, 39.6), (1.7, 1.6, 1.6), p=2.0)
    rig.part("c2_body", g, SKIN)
    g = Geo().blob((-42.6, -8.6, 41.6), (1.2, 0.6, 1.5), p=2.0)
    rig.part("c2_body", g, EYE, outline=0.4)
    g = Geo().blob((-41.9, -9.0, 41.4), (0.6, 0.4, 0.8), p=2.0)
    rig.part("c2_body", g, PUPIL, outline=0)
    g = Geo().blob((-46.2, -4.0, 43.6), (5.4, 5.2, 3.8), p=2.4)
    g.clip((0, 0, 43.0), (0, 0, -1))
    g.lathe([(0, -0.5), (7.6, -0.5), (8.0, 0.0), (7.6, 0.5), (0, 0.5)], (-46.2, -4.0, 43.3), segs=20)
    rig.part("c2_body", g, STEEL, finish="metal")
    # a crewman in a kettle hat pops his head up out of a hatch in the roof
    g = Geo().lathe([(6.2, 0), (7.4, 0.6), (7.4, 2.2), (6.2, 2.8)], (-14.0, 0.0, 70.5), segs=20)
    rig.part("hull", g, DARK_WOOD, outline=0.8)
    rig.joint("peek", "hull", (-14.0, 0.0, 72.0))
    hx0, hy0, hz0 = -13.0, 0.0, 78.0
    head = Geo().blob((hx0, hy0, hz0), (7.6, 7.2, 7.4), p=2.3)
    head.blob((hx0 + 7.8, hy0 - 0.4, hz0 - 1.4), (2.5, 2.3, 2.4), p=2.0)   # nose
    K.face2(rig, [head], SKIN, cx=hx0 + 6.4, cz=hz0 + 0.6, eye_dy=(hy0 - 3.0, hy0 + 3.0),
            eye_r=(2.7, 2.5, 3.1), pupil_r=(1.15, 1.75, 1.95), brow=HAIR, brow_w=0.7, mouth_dz=-5.0,
            mouth_x=hx0 + 6.8, head="peek", mouth_w=3.8, eye_at=(hx0 + 7.4, hz0 + 0.8), mark_r=2.9)
    rig.part("peek", head, SKIN)
    g = Geo().blob((hx0 - 0.5, hy0, hz0 + 4.2), (8.0, 7.6, 5.6), p=2.4)
    g.clip((0, 0, hz0 + 3.6), (0, 0, -1))
    g.lathe([(0, -0.6), (10.6, -0.6), (11.2, 0.0), (10.6, 0.6), (0, 0.6)], (hx0 - 0.5, hy0, hz0 + 3.8), segs=22)
    rig.part("peek", g, STEEL, finish="metal")
    g = Geo().capsule((hx0 - 0.5, hy0, hz0 + 9.4), (hx0 - 0.5, hy0, hz0 + 10.6), 1.6)
    rig.part("peek", g, GOLD, finish="metal", outline=0.6)
    # near wheels last so they sit in front
    _wheel(rig, "wheel_bn", AXLES[0], -15.0)
    _wheel(rig, "wheel_fn", AXLES[1], -15.0)


# -- poses ---------------------------------------------------------------------------------
WHEELS = ("wheel_bn", "wheel_fn", "wheel_bf", "wheel_ff")


def swing(deg, tilt=0.0, stretch=1.0):
    """The log on its two chains swung `deg` (positive = forward and up), kept level
    (plus a small `tilt`): chains rotate, the log translates along the arc."""
    t = math.radians(deg)
    x, z = CHAIN_L * math.sin(t), CHAIN_L * (1 - math.cos(t))
    return {"chain_a": {"r": deg}, "chain_b": {"r": deg},
            "ram": {"x": x, "z": z, "r": tilt, "sx": stretch}}


def _wheels(deg):
    # a forward roll turns the wheels clockwise on screen (negative r)
    return {w: {"r": -deg} for w in WHEELS}


def _crew(lean=0.0, step=None, brace=0.0, stride=24.0):
    """The pushers' legs: `step` (walk phase, radians) marches them; `brace` (0..1) plants
    them back in a pushing lunge; `lean` tilts them with the hull."""
    pose = {}
    for i in range(3):
        for side, ph in (("l", 0.0), ("r", math.pi)):
            n = f"c{i}_{side}"
            if step is not None:
                p = step + ph + i * math.pi * 0.5
                lift = max(0.0, math.sin(p))
                if i == 2:     # the rear pusher leans in, legs driving back behind him
                    pose[n] = {"r": -16 + 30 * math.cos(p) + 14 * lift, "z": 1.8 * lift}
                    pose[n + "2"] = {"r": -55 * lift}
                    continue
                pose[n] = {"r": stride * math.cos(p) + 18 * lift, "z": 2.6 * lift}
                pose[n + "2"] = {"r": -60 * lift}
            else:
                back = -32 if side == "r" else 12
                pose[n] = {"r": brace * back - lean - (10 if i == 2 else 0)}
                pose[n + "2"] = {"r": brace * (10 if side == "r" else -18)}
    if step is not None:
        pose["c2_body"] = {"z": 1.2 * abs(math.sin(step)), "r": -2 * math.cos(2 * step)}
    else:
        pose["c2_body"] = {"r": -6 * brace, "x": -1.5 * brace}
    return pose


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    lag = math.cos(2 * math.pi * (f - 1) / n)
    look = [0, 0, 1, 1, -1, 0][f]
    pose = merge(swing(3.0 * lag), {"hull": dict(squash(0.015 * c), z=0.5 * c),
                  "peek": {"z": 0.8 * c, "rz": 22 * look}}, _crew(brace=0.2))
    if f == 5:
        pose = merge(pose, F.expr("blink"))
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -math.cos(p)            # one bump per cycle (G6): lowest on frame 0
    return merge(_wheels(WHEEL_STEP * f), _crew(step=p, stride=42.0), {
        "odo": {"x": ODO_AMP * math.cos(p)},
        "hull": dict(squash(-0.03 * math.cos(p)), z=1.9 * bump + 0.4, r=2.2 * math.sin(p)),
        "peek": {"z": 1.2 * math.sin(p - 1.2), "r": 3 * math.sin(p - 1.0)},
        "pennant": {"r": 8 * math.sin(p - 1.4)},
    }, swing(7.0 * math.sin(p - 1.0)))


WALK_DUST = {k: [{"kind": "dust", "ground": (AXLES[0] - (13.0 if k % 2 else 8.0), 0.0),
                  "size_lu": 6.0 if k % 2 else 4.5, "puffs": 3, "seed": 80 + k, "spread": 1.0,
                  "dir": -1.0}] + ([{"kind": "dust", "ground": (AXLES[1] - 10.0, 0.0), "size_lu": 4.0,
                                     "puffs": 2, "seed": 90 + k, "spread": 0.8, "dir": -1.0}] if k % 2 == 0 else [])
             for k in range(8)}


# attack: 10 unique poses in the 12 heavy steps (moves.HEAVY_MELEE_MS), impact on pose 6
ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#       shift  haul  coil HOLD  swing swing SLAM  rock  back  settle
RAM = [-8, -24, -40, -50, -12, 22, 40, 18, -10, 3]
RAM_TILT = [0, -2, -4, -5, 2, 4, 3, -2, 1, 0]
HULL = [0.5, 1.5, 3.0, 3.5, 0.0, -2.0, -4.0, 1.5, 0.5, 0.0]
BX = [0.0, -1.0, -2.0, -3.0, 0.0, 3.0, 5.0, 3.5, 1.0, 0.0]
BQ = [-0.01, -0.03, -0.05, -0.06, 0.03, 0.04, -0.10, 0.04, -0.02, 0.0]
BRACE = [0.3, 0.6, 0.9, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4, 0.3]
WHL = [-2, -5, -9, -11, -2, 6, 12, 9, 4, 0]


def _attack_pose(f):
    pose = merge(M.body_about((0, 0, 30), x=BX[f], q=BQ[f]), _wheels(WHL[f]), _crew(brace=BRACE[f]), {
        "hull": {"r": HULL[f]},
    }, swing(RAM[f], RAM_TILT[f], 1.08 if f in (4, 5) else 1.0), {
        "peek": {"z": [0, -0.5, -1.2, -1.6, 0.5, 1.0, 2.0, 1.2, 0.4, 0][f],
                 "r": [0, 4, 8, 10, 0, -6, -10, -4, 0, 0][f]},
    })
    if f in (1, 2, 3):
        pose = merge(pose, F.expr("grit"), {"brow": {"z": -0.6}})
    elif f in (5, 6, 7):
        pose = merge(pose, F.expr("yell"))
    return pose


RAM_TIP = (HEAD_X + 13.0, 0, LOG_Z - 1.0)
SWING = {"kind": "arc", "joint": "ram", "inner": (HEAD_X - 2.0, 0, LOG_Z - 6.0),
         "outer": (HEAD_X + 12.0, 0, LOG_Z), "color": "#C9D2DC", "taper": 0.2, "white": 0.3,
         "t0": 0.0, "t1": 0.95, "lines": 3}


def _attack_clip():
    ov = {
        4: [dict(SWING, **{"from": 3})],
        5: [dict(SWING, **{"from": 4})],
        6: [dict(SWING, **{"from": 5, "lines": 2}),
            {"kind": "burst", "joint": "ram", "point": RAM_TIP, "r0_lu": 8.0, "r1_lu": 16.0, "n": 6,
             "a0": -70.0, "arc": 150.0},
            {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 9.0, "puffs": 4, "seed": 71, "spread": 1.3},
            {"kind": "dust", "ground": (-24.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 72, "spread": 1.0,
             "dir": -1.0}],
        7: [{"kind": "dust", "ground": (34.0, 0.0), "size_lu": 7.0, "puffs": 3, "seed": 73, "spread": 1.6}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)



# -- attack B: double pump, the shed rears ----------------------------------------------------
# unique frames: 0 = A shift, 1 pump back, 2 pump forward (a short knock), 3 HOLD (the crew rear
# the shed back on its back wheels, the log hauled right back, the crewman cheering), 4-5 swing,
# 6 SLAM (the front drops, squash), 7-9 = A rock, back, settle; played on A's steps
#       pump-back pump HOLD  swing swing SLAM
OB_RAM = [-26, 16, -56, -20, 18, 44]
OB_TILT = [-2, 3, -6, 2, 4, 3]
OB_R = [2.0, -1.5, 7.0, 3.0, 0.5, -2.0]      # whole shed pitch about the back wheels
OB_Z = [0.0, -0.6, 1.2, 0.6, 0.0, -1.6]
OB_X = [-1.0, 1.5, -3.5, 0.5, 3.5, 5.5]
OB_Q = [-0.02, -0.04, 0.03, 0.03, 0.03, -0.12]
OB_BR = [0.7, 0.6, 1.0, 1.0, 0.9, 0.8]
OB_WHL = [-4, 3, -12, -4, 6, 12]
OB_PEEK = [(0.0, 0), (1.0, -6), (3.0, 10), (1.0, 0), (1.5, -6), (2.5, -10)]


def _b_pose(i):
    if i == 0 or i >= 7:
        return _attack_pose(i)
    k = i - 1
    pose = merge(M.body_about((AXLES[0], 0, 0), x=OB_X[k], z=OB_Z[k], r=OB_R[k], q=OB_Q[k]),
                 _wheels(OB_WHL[k]), _crew(brace=OB_BR[k]),
                 swing(OB_RAM[k], OB_TILT[k], 1.08 if k in (3, 4) else 1.0), {
                     "peek": {"z": OB_PEEK[k][0], "r": OB_PEEK[k][1]},
                     "pennant": {"r": -6 * OB_R[k]}})
    if k == 2:
        pose = merge(pose, F.expr("yell"), {"brow": {"z": 0.6}})
    elif k in (0, 1):
        pose = merge(pose, F.expr("grit"))
    elif k == 5:
        pose = merge(pose, F.expr("yell"))
    return pose


def _attack_b():
    ov = {
        2: [{"kind": "burst", "joint": "ram", "point": RAM_TIP, "r0_lu": 5.0, "r1_lu": 9.0, "n": 4,
             "a0": -40.0, "arc": 100.0}],
        3: [{"kind": "dust", "ground": (AXLES[1] + 4.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 74,
             "spread": 0.9}],
        4: [dict(SWING, **{"from": 3})],
        5: [dict(SWING, **{"from": 4})],
        6: [dict(SWING, **{"from": 5, "lines": 2}),
            {"kind": "burst", "joint": "ram", "point": RAM_TIP, "r0_lu": 9.0, "r1_lu": 18.0, "n": 7,
             "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 10.0, "puffs": 5, "seed": 75, "spread": 1.4},
            {"kind": "dust", "ground": (AXLES[1], 0.0), "size_lu": 7.0, "puffs": 3, "seed": 76, "spread": 1.0}],
    }
    reuse = {0: ("attack", 0), 7: ("attack", 7), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_wheels(-8 * a), _crew(brace=0.3), {
        "body": dict(squash([-0.08, 0.05, 0.02, -0.02, 0.0][k]), x=-4.0 * max(a, 0) + 1.2 * min(a, 0)),
        "hull": {"r": 4 * a, "z": [-1.5, 1.5, 0.5, -0.3, 0.0][k]},
        "peek": {"z": -4.5 * max(a, 0)},
    }, swing(-12 * a), {   # the crewman ducks into the hatch
        "pennant": {"r": 8 * a},
    })
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", "grit"))
    return pose


# die D7 wreck (8 unique heavy poses): a hop, the hull tips back and sags, a front wheel pops
# off, the log drops, and the crewman pops out of the hatch with X eyes
D_BODY = [dict(x=-2, z=0, r=2, q=-0.06), dict(x=-4, z=6, r=6, q=0.05), dict(x=-6, z=3, r=9, q=0.02),
          dict(x=-7, z=0, r=10, q=-0.12), dict(x=-7, z=-3, r=11, q=-0.16), dict(x=-7, z=-4, r=11, q=-0.14),
          dict(x=-7, z=-4, r=11, q=-0.15), dict(x=-7, z=-4, r=11, q=-0.18, s=0.95)]
D_WHEEL = [(0, 0, 0), (4, 5, -40), (10, 8, -90), (16, 3, -150), (20, -2, -200), (21, -2, -205),
           (21, -2, -205), (21, -2, -205)]
D_PEEK = [(0, 0, 0), (0, 6, -10), (-4, 16, 30), (-10, 20, 90), (-14, 10, 150), (-15, 8, 160),
          (-15, 8, 160), (-15, 8, 160)]


def _die(k):
    b = D_BODY[k]
    wx, wz, wr = D_WHEEL[k]
    px, pz, pr = D_PEEK[k]
    pose = merge(M.body_about((-25.0, 0, 0), x=b["x"], z=b["z"], r=b["r"], q=b["q"], s=b.get("s", 1.0)),
                 _crew(brace=0.0), {
        "hull": {"r": [0, 2, 4, 5, 6, 6, 6, 6][k], "z": [0, 0, -1, -3, -5, -5, -5, -5][k]},
        "ram": {"r": [0, -4, -6, 4, 8, 8, 8, 8][k], "z": [0, 0, -3, -6, -10, -10, -10, -10][k],
                "x": [-4, -8, -4, 2, 4, 4, 4, 4][k]},
        "chain_a": {"r": [-8, -16, -8, 4, 8, 8, 8, 8][k]}, "chain_b": {"r": [-8, -16, -8, 4, 8, 8, 8, 8][k]},
        "wheel_fn": {"x": wx, "z": wz, "r": wr},
        "peek": {"x": px, "z": pz, "r": pr},
        "c0_r": {"r": -30}, "c1_l": {"r": 30},
        # the rear pusher is knocked onto his back
        "c2_body": {"r": [6, 20, 45, 70, 82, 84, 84, 84][k], "x": [0, -2, -5, -8, -10, -10, -10, -10][k],
                    "z": [0, 2, 1, -4, -10, -11, -11, -11][k]},
        "c2_l": {"r": [10, 30, 50, 70, 80, 80, 80, 80][k], "z": [0, 2, 1, -2, -6, -7, -7, -7][k]},
        "c2_r": {"r": [6, 24, 44, 64, 76, 76, 76, 76][k], "z": [0, 2, 1, -2, -6, -7, -7, -7][k]},
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
        M.clip("walk", [_walk(f) for f in range(8)], WALK_DUR, loop=True, overlays=WALK_DUST),
        _attack_clip(),
        _attack_b(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
