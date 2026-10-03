"""Wooden Horse: Bronze Age Epic Siege (CONTENT_PLAN 5.2 #10). Siege only: a head-ram vs the base; two
spearmen poke from hatches; on death two Hoplites jump out. ~100 lu.

A viewer expects a giant wooden horse on wheels to rock back and butt the gate with its head,
and to roll forward on squeaky wheels with soldiers peeking out.

Look: a big planked horse statue (warm wood, dark plank seams, pegs) on a wheeled platform with
four chunky spoked wheels, stiff wooden legs, a team-painted mane and saddle cloth with a
sandstone lambda, a bronze-capped nose (the ram), a big painted eye with a cartoon brow, a rope
tail. Two hatches in its flank open to show helmeted spearmen with team crests.

Animation (cartoon kit v2, heavy timing; vehicle rig like the Battering Ram):
  idle    a hatch creaks open and a spearman peeks out and blinks, the tail sways
  walk    walk v3 at ground speed (ANIM_SPEC G6 wheeled, card 45 x 1.25 = 56.25 lu/s): four-spoked
          wheels turning 2 spoke spacings per 614 ms cycle (22.5 degrees a frame), one bump per cycle
          with a pitch, the head nodding a frame late, dust kicked up behind the rear wheels
  attack_b  HEAD HAMMER: the hull stays level while the neck swings far back on its hinge (held
          extreme), then the head hammers down and forward into the gate
  attack_alt  the hatch spearmen's own sim attack (6 every 1.2 s): both hatches open and the
          spearmen jab out while the horse stands (they never jab in A or B)
  attack  ROCK AND BUTT: the horse rocks back onto its rear wheels (the front wheels lift, the
          head rears, held extreme), then lurches forward and slams its bronze nose into the
          target (impact lines, dust, the planks rattle); the hatch spearmen hold on
  hit     vehicle: a bounce, the hatches slam shut
  die     wreck: a front wheel pops off, the hull sags and splits, the hatches burst open and
          two hoplites leap out (they become the two summoned Hoplites)
"""
import math

from ageborn_art import face as F
from ageborn_art import kit_bronze as K
from ageborn_art import moves as M
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import merge, squash
from ageborn_art.geometry import Geo

SLUG = "wooden_horse"
GAIT_NAME = "wheeled"
NAME = "Wooden Horse"
HEIGHT_LU = 104
YAW_DEG = -10.0
CANVAS = (400, 320)
FEET = (200, 280)
ANCHORS = {"head": (30, 100), "hitCenter": (0, 48)}
NO_RETIME = True

WOOD = "#B39570"
WOOD_DK = "#7E6650"
SEAM = "#5E4C3C"
ROPE = "#CDBB92"
R_WHEEL = 11.0
AXLES = (-24.0, 22.0)
SPOKES = 4
# G6: 2 spoke spacings per cycle at the ground speed (card 45 x 1.25 = 56.25 lu/s): the rim travels
# 2 x 2 pi r / 4 = 34.56 lu per cycle, so the cycle is 614 ms and the wheel turns 22.5 degrees a frame (25%)
SPEED = 56.25
CYCLE_LU = 2 * 2 * math.pi * R_WHEEL / SPOKES
WALK_CYCLE_MS = round(1000 * CYCLE_LU / SPEED)
WALK_DUR = [round(WALK_CYCLE_MS * (i + 1) / 8) - round(WALK_CYCLE_MS * i / 8) for i in range(8)]
WHEEL_STEP = 2 * (360.0 / SPOKES) / 8
ODO_AMP = CYCLE_LU / 4                            # strideLu = 2 x the odometer's x range
HATCHES = ((-10.0, 44.0), (8.0, 44.0))


def _wheel(rig, name, x, y):
    rig.joint(name, "chassis", (x, y, R_WHEEL))
    g = Geo()
    n = 14
    for k in range(n):
        a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1) / n
        g.capsule((x + (R_WHEEL - 1.4) * math.cos(a0), y, R_WHEEL + (R_WHEEL - 1.4) * math.sin(a0)),
                  (x + (R_WHEEL - 1.4) * math.cos(a1), y, R_WHEEL + (R_WHEEL - 1.4) * math.sin(a1)), 2.1, segs=10, rings=2)
    rig.part(name, g, WOOD_DK)
    g = Geo()
    for k in range(SPOKES):                      # four thick pale spokes that read at 1x
        a = math.radians(360.0 / SPOKES * k)
        g.capsule((x, y, R_WHEEL), (x + (R_WHEEL - 2.2) * math.cos(a), y, R_WHEEL + (R_WHEEL - 2.2) * math.sin(a)), 1.8, 1.4,
                  segs=8, rings=2)
    rig.part(name, g, "#D9C7A4", outline=0.7)
    g = Geo().blob((x, y - 1.0, R_WHEEL), (4.2, 2.6, 4.2), p=2.4)
    rig.part(name, g, team=True, outline=0.6)


def _spearman(rig, name, x, z, hidden=True):
    """A helmeted spearman in a hatch: head with a crested helmet and a spear arm (`<name>_spear`)."""
    rig.joint(name, "hull", (x, -16.0, z), hidden=hidden)
    head = Geo().blob((x, -17.0, z + 1.0), (5.6, 5.0, 5.6), p=2.25)
    head.blob((x + 5.2, -17.4, z + 0.2), (1.5, 1.4, 1.4), p=2.0)
    rig.part(name, head, B.SKIN)
    eye, pup = Geo(), Geo()
    for dy in (-2.2, 2.0):
        eye.blob((x + 3.8, -17.0 + dy, z + 1.4), (1.5, 1.4, 1.9))
        pup.blob((x + 4.9, -17.2 + dy, z + 1.2), (0.7, 1.0, 1.1))
    rig.part(name, eye, B.EYE, highlight=False)
    rig.part(name, pup, B.PUPIL, outline=0)
    g = Geo().blob((x - 0.4, -17.0, z + 3.4), (6.2, 5.8, 4.6), p=2.4)
    g.clip((0, 0, z + 2.0), (0, 0, -1))
    rig.part(name, g, B.BRONZE, finish=B.POLISH)
    g = Geo()
    for i in range(5):
        t = i / 4
        g.blob((x + 2.0 - 8.0 * t, -17.0, z + 8.6 + 2.2 * math.sin(math.pi * t)), (2.2, 1.6, 2.0), p=2.1)
    rig.part(name, g, team=True)
    rig.joint(f"{name}_spear", name, (x + 2.0, -19.0, z - 2.0))
    g = Geo().capsule((x - 6.0, -19.5, z - 3.0), (x + 14.0, -19.5, z - 3.0), 0.8)
    rig.part(f"{name}_spear", g, B.WOOD_DK, outline=0.5)
    g = Geo().lathe([(0, 0), (1.4, 0.6), (0, 5.0)], (x + 13.5, -19.5, z - 3.0), (x + 18.5, -19.5, z - 3.0), segs=8,
                    squash=(1.0, 0.5))
    rig.part(f"{name}_spear", g, B.BRONZE, finish=B.POLISH, outline=0.4)
    g = Geo().blob((x + 2.0, -19.6, z - 3.0), (1.8, 1.6, 1.8), p=2.2)
    rig.part(f"{name}_spear", g, B.SKIN, outline=0.5)


def _jumper(rig, name, x, z):
    """A small whole hoplite leaping out of the wreck (hidden until the death)."""
    rig.joint(name, "root", (x, 0, z), hidden=True)
    g = Geo().blob((x, -2.0, z + 8.0), (5.0, 4.6, 6.4), p=2.3)
    rig.part(name, g, team=True)
    g = Geo().blob((x + 0.6, -2.0, z + 17.0), (5.2, 4.8, 5.2), p=2.25)
    rig.part(name, g, B.SKIN)
    g = Geo().blob((x + 0.2, -2.0, z + 19.4), (5.8, 5.4, 4.0), p=2.4)
    g.clip((0, 0, z + 18.0), (0, 0, -1))
    rig.part(name, g, B.BRONZE, finish=B.POLISH)
    for dy in (-1.8, 1.8):
        g = Geo().capsule((x, -2.0 + dy, z + 2.0), (x + (2.0 if dy < 0 else -2.0), -2.0 + dy, z - 4.0), 1.6, 1.4)
        rig.part(name, g, B.SKIN)
    B.aspis(rig, name, (x + 3.0, -7.0, z + 8.0), r=5.0, depth=1.2, rim_w=0.8)


def build(rig):
    rig.joint("body", "root", (0, 0, 0))
    rig.joint("chassis", "body", (0, 0, R_WHEEL))
    rig.joint("odo", "root", (0, 0, 0))
    _wheel(rig, "wheel_bf", AXLES[0], 12.0)
    _wheel(rig, "wheel_ff", AXLES[1], 12.0)
    # platform
    g = Geo().blob((0, 0, R_WHEEL + 6.0), (36.0, 14.0, 3.4), p=3.6)
    rig.part("chassis", g, WOOD_DK)
    g = Geo()
    for x in range(-32, 36, 8):
        g.capsule((x, -14.2, R_WHEEL + 4.0), (x, -14.2, R_WHEEL + 8.0), 0.5)
    rig.part("chassis", g, SEAM, outline=0)
    rig.joint("hull", "chassis", (0, 0, 22.0))
    # stiff wooden legs on the platform
    for x, y, col in ((-18.0, 7.0, WOOD_DK), (16.0, 7.0, WOOD_DK), (-20.0, -7.0, WOOD), (14.0, -7.0, WOOD)):
        g = Geo().capsule((x, y, 44.0), (x + 1.0, y, 23.0), 4.6, 4.0)
        g.blob((x + 2.0, y, 22.6), (5.6, 4.4, 2.4), p=2.6)
        rig.part("hull", g, col)
    # barrel body of planks
    g = Geo().blob((0, 0, 50.0), (30.0, 14.0, 13.0), p=2.2)
    rig.part("hull", g, WOOD)
    g = Geo()
    for z in (43.0, 49.0, 55.0):
        g.capsule((-26.0, -13.2 + abs(z - 49) * 0.2, z), (26.0, -13.2 + abs(z - 49) * 0.2, z), 0.45)
    for x in (-20.0, 0.0, 20.0):
        g.sphere((x, -14.0, 47.0), 0.9, cuts=2)
    rig.part("hull", g, SEAM, outline=0)
    # team saddle cloth with a lambda
    g = Geo().blob((-2.0, 0, 55.0), (18.0, 15.0, 11.0), p=3.0)
    g.clip((0, 0, 47.5), (0, 0, -1))
    rig.part("hull", g, team=True)
    g = Geo().blob((-2.0, 0, 47.9), (18.2, 15.2, 1.3), p=3.0)
    rig.part("hull", g, B.SAND, outline=0.5)
    g = Geo()
    for x in range(-18, 16, 5):
        g.lathe([(1.4, 0), (1.8, -1.6), (0, -4.2)], (x, -15.0, 47.0), segs=8)
    rig.part("hull", g, B.SAND_LT, outline=0.4)
    K.lambda_mark(rig, "hull", (-2.0, -15.4, 56.0), size=1.4)
    # A11: heavies carry a pennant: a team banner on a pole at the back
    g = Geo().capsule((-24.0, 6.0, 52.0), (-27.0, 6.0, 98.0), 1.3, 1.1).sphere((-27.2, 6.0, 99.4), 2.0, cuts=3)
    rig.part("hull", g, WOOD_DK)
    rig.secondary("pennant", "hull", (-26.8, 6.0, 95.0), (-50.0, 6.0, 88.0), max_deg=12, gain=1.2)
    g = Geo().slab([(-26.8, 96.0), (-50.0, 92.0), (-41.0, 85.0), (-49.0, 77.0), (-26.6, 77.0)], 6.0, 1.6)
    rig.part("pennant", g, team=True, outline=0.8)
    # hatches in the flank (doors open by pose) and the spearmen behind them
    for i, (hx, hz) in enumerate(HATCHES):
        g = Geo().blob((hx, -14.4, hz), (5.4, 1.0, 5.0), p=3.0)
        rig.part("hull", g, SEAM, outline=0.4)               # the dark hole
        rig.joint(f"door{i}", "hull", (hx - 5.4, -15.2, hz))
        g = Geo().blob((hx, -15.2, hz), (5.6, 1.0, 5.2), p=3.2)
        rig.part(f"door{i}", g, WOOD_DK, outline=0.6)
        _spearman(rig, f"man{i}", hx + 1.0, hz - 1.0)
    # neck, head with a bronze nose cap, painted eye, team mane
    rig.joint("neck", "hull", (20.0, 0, 58.0))
    g = Geo().capsule((20.0, 0, 56.0), (31.0, 0, 82.0), 9.6, 7.4)
    rig.part("neck", g, WOOD)
    rig.joint("head", "neck", (32.0, 0, 84.0))
    head = Geo().blob((38.0, 0, 86.0), (11.0, 7.6, 7.8), p=2.4, rot=(0, 20, 0))
    head.blob((47.0, 0, 81.0), (6.4, 6.4, 6.2), p=2.4)
    eye = Geo().blob((39.0, -6.8, 88.0), (3.2, 1.4, 3.4))
    pup = Geo().blob((40.6, -7.6, 87.8), (1.3, 0.8, 2.0))
    face = F.Face(rig, "head", [head, eye, pup])
    rig.part("head", head, WOOD)
    rig.part("head", eye, B.EYE, highlight=False)
    rig.joint("pupils", "head", (40.6, -7.6, 87.8))
    rig.part("pupils", pup, B.PUPIL, outline=0)
    face.eye_marks([(40.4, 88.0)], 3.2, WOOD)
    rig.joint("brow", "head", (40.0, -7.0, 92.0))
    g = Geo().capsule((36.6, -7.6, 93.0), (43.0, -6.0, 91.0), 1.4, 1.1)
    rig.part("brow", g, SEAM, outline=0.5)
    g = Geo().blob((50.5, 0, 80.0), (4.4, 7.0, 6.6), p=2.6)
    rig.part("head", g, B.BRONZE, finish=B.POLISH)            # the ram cap on the nose
    for y in (-3.0, 3.0):
        g = Geo().blob((31.0, y, 94.0), (2.0, 1.6, 4.4), p=2.2, rot=(0, -20, 0))
        rig.part("head", g, WOOD_DK, outline=0.5)
    g = Geo()
    for i in range(8):
        t = i / 7
        g.blob((29.0 - 14.0 * t, 0, 93.0 - 33.0 * t), (5.0, 3.6, 4.6), p=2.2, rot=(0, -55, 0))
    rig.part("neck", g, team=True)
    rig.track("nose", "head", (54.0, 0, 80.0))
    # rope tail
    rig.secondary("tail", "hull", (-29.0, 0, 54.0), (-34.0, 0, 34.0), max_deg=12, gain=1.0)
    g = Geo().capsule((-29.0, 0, 54.0), (-33.0, 0, 38.0), 2.2, 2.6)
    g.lathe([(2.6, 0), (3.2, -2.0), (0, -7.0)], (-33.2, 0, 39.0), segs=10)
    rig.part("tail", g, ROPE, finish="hair")
    _wheel(rig, "wheel_bn", AXLES[0], -12.0)
    _wheel(rig, "wheel_fn", AXLES[1], -12.0)
    _jumper(rig, "jump0", -6.0, 40.0)
    _jumper(rig, "jump1", 8.0, 40.0)
    rig.track("_foot", "odo", (0, 0, 0))
    # a hoplite pushes from behind, leaning into the platform (walk v3: his legs jog behind the horse,
    # so the crew's steps read in the silhouette; G6 crew on foot)
    for side, y, k in (("l", -2.0, 0.8), ("r", -8.0, 1.0)):
        n = f"c_{side}"
        rig.joint(n, "chassis", (-47.0, y, 23.0))
        rig.joint(n + "2", n, (-46.0, y, 12.5))
        skin = B.SKIN if k == 1.0 else B.SKIN_DK
        rig.part(n, Geo().capsule((-47.0, y, 24.0), (-46.0, y, 12.5), 3.2, 2.8), skin)
        g = Geo().capsule((-46.0, y, 12.5), (-45.5, y, 3.8), 2.8, 2.5)
        rig.part(n + "2", g, skin)
        g = Geo().blob((-43.4, y, 2.2), (4.2, 3.0, 2.2), p=2.8, taper=(1.02, 0.85))
        rig.part(n + "2", g, B.LEATHER if k == 1.0 else B.LEATHER_DK)
    rig.joint("c_body", "chassis", (-47.0, -4.0, 23.0))
    rig.part("c_body", Geo().capsule((-47.0, -4.0, 25.0), (-41.5, -4.0, 34.0), 5.4, 5.0), team=True)
    rig.part("c_body", Geo().blob((-47.0, -4.0, 23.6), (5.8, 5.4, 2.6), p=2.6), B.LINEN, outline=0.5)
    g = Geo().capsule((-41.5, -7.0, 33.0), (-35.5, -7.0, 24.0), 2.3, 2.1).blob((-35.0, -7.0, 23.4), (2.5, 2.3, 2.5), p=2.3)
    rig.part("c_body", g, B.SKIN)
    g = Geo().blob((-39.0, -4.0, 40.4), (4.8, 4.6, 4.7), p=2.3)
    g.blob((-34.6, -4.4, 39.6), (1.6, 1.5, 1.5), p=2.0)
    rig.part("c_body", g, B.SKIN)
    rig.part("c_body", Geo().blob((-35.8, -8.4, 41.4), (1.1, 0.6, 1.4), p=2.0), B.EYE, outline=0.4)
    rig.part("c_body", Geo().blob((-35.2, -8.8, 41.2), (0.6, 0.4, 0.8), p=2.0), B.PUPIL, outline=0)
    g = Geo().blob((-39.4, -4.0, 43.4), (5.2, 5.0, 3.8), p=2.4)
    g.clip((0, 0, 42.6), (0, 0, -1))
    rig.part("c_body", g, B.BRONZE, finish=B.POLISH)
    rig.part("c_body", Geo().blob((-41.0, -4.0, 47.8), (4.4, 1.2, 2.2), p=2.2), team=True, outline=0.4)


WHEELS = ("wheel_bn", "wheel_fn", "wheel_bf", "wheel_ff")


def _wheels(deg):
    return {w: {"r": -deg} for w in WHEELS}


def _hatch(i, open_=0.0, poke=0.0, peek=0.0):
    """Door i swung open (0..1), its spearman peeking (0..1) and jabbing his spear (0..1)."""
    out = {f"door{i}": {"rz": -100 * open_}}
    if open_ > 0.05 or peek > 0.05:
        out[f"man{i}"] = {"show": True, "y": -2.0 * peek, "x": 1.0 * peek}
        out[f"man{i}_spear"] = {"x": 8.0 * poke}
    return out


def _crew(step=None, brace=0.0):
    """The pusher's legs: `step` (walk phase, radians) jogs them; `brace` (0..1) plants them back in a lunge."""
    pose = {}
    for side, ph in (("l", 0.0), ("r", math.pi)):
        n = f"c_{side}"
        if step is not None:
            p = step + ph
            lift = max(0.0, math.sin(p))
            pose[n] = {"r": -14 + 30 * math.cos(p) + 14 * lift, "z": 1.8 * lift}
            pose[n + "2"] = {"r": -58 * lift}
        else:
            back = -30 if side == "r" else 10
            pose[n] = {"r": brace * back - 8}
            pose[n + "2"] = {"r": brace * (10 if side == "r" else -16)}
    if step is not None:
        pose["c_body"] = {"z": 1.4 * abs(math.sin(step)), "r": -2 * math.cos(2 * step)}
    else:
        pose["c_body"] = {"r": -6 * brace, "x": -1.5 * brace}
    return pose


def _idle(f):
    n = M.IDLE_FRAMES_HEAVY
    c = math.cos(2 * math.pi * f / n)
    op = [0.0, 0.5, 1.0, 1.0, 0.5, 0.0][f]
    pose = merge({"hull": dict(squash(0.012 * c), z=0.4 * c), "neck": {"r": 1.5 * c}},
                 _hatch(1, op, 0.0, op), _hatch(0), _crew(brace=0.2))
    if f == 3:
        pose = merge(pose, {"man1": {"z": 0.6}})
    return pose


def _walk(f):
    p = 2 * math.pi * f / 8
    bump = -math.cos(p)            # one bump per cycle (G6): lowest on frame 0
    return merge(_wheels(WHEEL_STEP * f), _crew(step=p), {
        "odo": {"x": ODO_AMP * math.cos(p)},
        "hull": dict(squash(-0.025 * math.cos(p)), z=2.2 * bump + 0.6, r=1.6 * math.sin(p)),
        "neck": {"r": 3.5 * math.sin(p - 0.8)}, "head": {"r": 3.0 * math.sin(p - 1.4)},
        "tail": {"r": 6 * math.sin(p - 1.2)},
    }, _hatch(0), _hatch(1, 0.35, 0.0, 0.35 + 0.15 * math.sin(p - 1.0)))


def _walk_clip():
    dust = [{"kind": "dust", "ground": (AXLES[0] - 12.0, 0.0), "size_lu": 5.0, "puffs": 3, "seed": 40 + f,
             "spread": 0.9, "dir": -1.0} for f in range(8)]
    ov = {0: [dust[0]], 2: [dust[2]], 4: [dust[4]], 6: [dust[6]]}
    return M.clip("walk", [_walk(f) for f in range(8)], WALK_DUR, loop=True, overlays=ov)


ATTACK_SEQ = [0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 9, 9]
#       shift  rock  rock HOLD  lurch lurch BUTT  shock back  settle
BR = [1.0, 5.0, 9.0, 11.0, 3.0, -3.0, -6.0, -3.0, -1.0, 0.0]
BX = [-1.0, -2.0, -3.5, -4.0, 0.0, 4.0, 7.0, 5.0, 2.0, 0.0]
BQ = [-0.01, -0.02, -0.03, -0.04, 0.02, 0.04, -0.08, 0.03, -0.01, 0.0]
NK = [0, 4, 10, 14, 4, -6, -14, -10, -4, 0]
HD = [0, 4, 8, 10, 2, -6, -10, -8, -2, 0]
WHL = [-2, -6, -10, -12, -2, 8, 14, 10, 4, 0]
POKE = [0.0] * 10                     # the spearmen never jab in A or B (their own attack_alt)
OPEN = [0.0, 0.0, 0.1, 0.2, 0.2, 0.2, 0.3, 0.3, 0.2, 0.0]   # they only peek and hold on


def _attack_pose(f):
    r = BR[f]
    pivot = (AXLES[0], 0.0, 0.0) if r >= 0 else (AXLES[1], 0.0, 0.0)
    pose = merge(M.body_about(pivot, x=BX[f], q=BQ[f], r=r), _wheels(WHL[f]), _crew(brace=min(1.0, 0.3 + 0.12 * f)), {
        "neck": {"r": NK[f]}, "head": {"r": HD[f]}, "tail": {"r": -3 * r}, "pennant": {"r": -2 * r},
    }, _hatch(0, OPEN[f], POKE[f], OPEN[f]), _hatch(1, OPEN[f], POKE[max(0, f - 1)], OPEN[f]))
    if f in (2, 3):
        pose = merge(pose, {"brow": {"z": -1.0}})
    elif f in (5, 6, 7):
        pose = merge(pose, F.expr("squeeze", mouth=None) if f == 6 else {}, {"brow": {"z": -0.8}})
    return pose


NOSE = (54.0, 0.0, 80.0)


def _attack_clip():
    ov = {
        4: [{"kind": "streak", "joint": "head", "point": NOSE, "color": WOOD, "width_lu": 8.0, "white": 0.3,
             "from": 3, "t1": 0.95}],
        5: [{"kind": "streak", "joint": "head", "point": NOSE, "color": WOOD, "width_lu": 8.0, "white": 0.3,
             "from": 4, "t1": 0.95}],
        6: [{"kind": "burst", "joint": "head", "point": NOSE, "r0_lu": 8.0, "r1_lu": 17.0, "n": 6,
             "a0": -80.0, "arc": 160.0},
            {"kind": "dust", "ground": (30.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 21, "spread": 1.2},
            {"kind": "dust", "ground": (-22.0, 0.0), "size_lu": 6.0, "puffs": 3, "seed": 22, "spread": 1.0,
             "dir": -1.0}],
    }
    return M.clip("attack", [_attack_pose(f) for f in range(10)], M.HEAVY_MELEE_MS,
                  impact=6, smear=4, sequence=ATTACK_SEQ, overlays=ov)


# -- attack B: the head hammer (the neck swings back on its hinge, the hull stays level) ---------------
# 0 = A shift, 1 brace, 2 swing back, 3 HOLD (the neck swung far back, the head over the hull, the
# hull level and squatting), 4-5 the hammer (smear), 6 IMPACT (the head hammered down and forward into
# the gate), 7 shock, 8-9 = A's
#      brace back HOLD ham  ham  IMP  shock
HB_NK = [6, 26, 40, 20, -10, -26, -20]
HB_HD = [4, 14, 20, 8, -10, -18, -14]
HB_R = [0.0, -1.0, -1.5, 0.0, -2.0, -4.0, -2.5]
HB_X = [0.0, -1.0, -1.5, 1.0, 3.0, 5.0, 4.0]
HB_Q = [-0.02, -0.04, -0.05, 0.02, 0.03, -0.07, 0.02]
HB_W = [-1, -3, -4, 0, 4, 8, 6]


def _b_pose(i):
    if i == 0 or i >= 8:
        return _attack_pose(i)
    k = i - 1
    r = HB_R[k]
    pivot = (AXLES[0], 0.0, 0.0) if r >= 0 else (AXLES[1], 0.0, 0.0)
    pose = merge(M.body_about(pivot, x=HB_X[k], q=HB_Q[k], r=r), _wheels(HB_W[k]), _crew(brace=0.8), {
        "neck": {"r": HB_NK[k]}, "head": {"r": HB_HD[k]}, "tail": {"r": 4 * k - 8},
    }, _hatch(0, 0.2, 0.0, 0.2), _hatch(1, 0.2, 0.0, 0.2))
    pose = merge(pose, {"brow": {"z": -1.0}}, F.expr("squeeze", mouth=None) if i == 6 else {})
    return pose


def _attack_b():
    ov = {
        4: [{"kind": "arc", "joint": "head", "inner": (40.0, 0.0, 80.0), "outer": NOSE, "color": WOOD,
             "white": 0.3, "taper": 0.2, "lines": 3, "from": 3, "t1": 0.95}],
        5: [{"kind": "arc", "joint": "head", "inner": (40.0, 0.0, 80.0), "outer": NOSE, "color": WOOD,
             "white": 0.3, "taper": 0.2, "lines": 3, "from": 4, "t0": 0.2, "t1": 0.95}],
        6: [{"kind": "burst", "joint": "head", "point": NOSE, "r0_lu": 8.0, "r1_lu": 17.0, "n": 6,
             "a0": -110.0, "arc": 160.0},
            {"kind": "dust", "ground": (34.0, 0.0), "size_lu": 8.0, "puffs": 4, "seed": 31, "spread": 1.2}],
    }
    reuse = {0: ("attack", 0), 8: ("attack", 8), 9: ("attack", 9)}
    return M.clip("attack_b", [_b_pose(i) for i in range(10)], M.HEAVY_MELEE_MS, impact=6,
                  sequence=ATTACK_SEQ, overlays=ov, reuse=reuse)


# -- attack_alt: the hatch spearmen's own attack (ANIM_SPEC R3), played while the horse stands -------
# the horse holds idle pose 0; both hatches swing open and the spearmen draw back and jab out
ALT_MS = [100, 140, 200, 160, 200, 200]       # 1000 ms, the jab at 440 ms (warped to the rider wind-up)
ALT_SEQ = [0, 1, 2, 3, 4, 0]
ALT_OPEN = [0.0, 0.8, 1.0, 1.0, 0.7]
ALT_POKE = [0.0, -0.4, -0.6, 1.0, 0.5]


def _alt_pose(i):
    pose = _idle(0)
    if i == 0:
        return pose
    return merge(pose, _hatch(0, ALT_OPEN[i], ALT_POKE[i], ALT_OPEN[i]),
                 _hatch(1, ALT_OPEN[i], ALT_POKE[max(1, i - 1)] if i == 3 else ALT_POKE[i], ALT_OPEN[i]))


def _attack_alt():
    return M.clip("attack_alt", [_alt_pose(i) for i in range(5)], ALT_MS, impact=3, sequence=ALT_SEQ,
                  reuse={0: ("idle", 0)}, extra={"noMuzzle": True})


def _hit(k):
    a = M.HIT_AMT[k]
    pose = merge(_wheels(-8 * a), {
        "body": dict(squash([-0.08, 0.05, 0.02, -0.02, 0.0][k]), x=-4.0 * max(a, 0) + 1.2 * min(a, 0)),
        "hull": {"r": 3 * a, "z": [-1.5, 1.5, 0.5, -0.3, 0.0][k]},
        "neck": {"r": 6 * a}, "head": {"r": 4 * a},
    }, _hatch(0), _hatch(1))
    if k <= 1:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    return pose


D_BODY = [dict(x=-2, z=0, r=2, q=-0.06), dict(x=-4, z=5, r=6, q=0.05), dict(x=-6, z=3, r=9, q=0.02),
          dict(x=-7, z=0, r=10, q=-0.12), dict(x=-7, z=-3, r=11, q=-0.16), dict(x=-7, z=-4, r=11, q=-0.14),
          dict(x=-7, z=-4, r=11, q=-0.15), dict(x=-7, z=-4, r=11, q=-0.18, s=0.95)]
D_WHEEL = [(0, 0, 0), (4, 5, -40), (10, 8, -90), (16, 3, -150), (20, -2, -200), (21, -2, -205),
           (21, -2, -205), (21, -2, -205)]
# the two hoplites leap out of the hatches: (x, z, r) per step
D_J0 = [None, None, (-4, 14, 20), (-12, 28, 50), (-22, 22, 70), (-30, 6, 80), (-34, -2, 80), (-34, -2, 80)]
D_J1 = [None, None, (6, 16, -20), (16, 30, -40), (26, 22, -60), (34, 6, -60), (38, -2, -60), (38, -2, -60)]


def _die(k):
    b = D_BODY[k]
    wx, wz, wr = D_WHEEL[k]
    pose = merge(M.body_about((AXLES[0], 0, 0), x=b["x"], z=b["z"], r=b["r"], q=b["q"], s=b.get("s", 1.0)), {
        "hull": {"r": [0, 2, 4, 5, 6, 6, 6, 6][k], "z": [0, 0, -1, -3, -5, -5, -5, -5][k]},
        "neck": {"r": [0, 6, 2, -14, -24, -26, -26, -26][k]}, "head": {"r": [0, 4, 0, -8, -10, -10, -10, -10][k]},
        "wheel_fn": {"x": wx, "z": wz, "r": wr},
        "door0": {"rz": -100 if k >= 1 else 0}, "door1": {"rz": -100 if k >= 1 else 0},
    })
    for name, path in (("jump0", D_J0), ("jump1", D_J1)):
        if path[k] is not None:
            x, z, r = path[k]
            pose[name] = {"show": True, "x": x, "z": z, "r": r}
    # the pusher stumbles back from the collapsing horse and fades out (he is not one of the riders)
    back = [0, -3, -7, -11, -14, -16, -16, -16][k]
    fade = [1.0, 1.0, 0.85, 0.55, 0.25, 0.0, 0.0, 0.0][k]
    for n, r in (("c_body", -10), ("c_l", 18), ("c_r", -22)):
        pose[n] = {"x": back, "r": r * min(1.0, k / 2), "alpha": fade, "hide": fade < 0.02}
    if k == 0:
        pose = merge(pose, F.expr("squeeze", mouth=None))
    elif k >= 3:
        pose = merge(pose, F.expr("x", mouth=None))
    return pose


def clips():
    cl = [
        M.clip("idle", [_idle(f) for f in range(M.IDLE_FRAMES_HEAVY)],
               [M.IDLE_MS_HEAVY] * M.IDLE_FRAMES_HEAVY, loop=True),
        _walk_clip(),
        _attack_clip(),
        _attack_b(),
        _attack_alt(),
        M.clip("hit", [_hit(k) for k in range(5)], M.HIT_MS),
        M.clip("die", [_die(k) for k in range(8)], M.DIE_MS_HEAVY, sequence=M.DIE_SEQ_HEAVY,
               extra=M.die_meta(HEIGHT_LU, heavy=True)),
    ]
    return M.check_variants(M.check_contract(cl, heavy=True))
