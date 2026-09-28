"""Pikeman: Medieval Age anti-armor (DESIGN A5.3). Pike, reach 70, Brace, ~72 lu.

Look (A11): a sturdy pikeman in a steel morion (upturned crescent brim, tall comb, gold
rim), a slate breastplate over a team padded doublet with big puffed team sleeves, wine
breeches and brown boots, and a long pike (A11: polearm = reach) with a steel leaf head and
a team pennon that streams in the wind. He stands braced, feet wide. The attack coils the
pike back, then lunges into a long level thrust (smear, held impact) and recovers.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_medieval as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "pikeman"
NAME = "Pikeman"
HEIGHT_LU = 72
CANVAS = (344, 250)
FEET = (108, 222)
ANCHORS = {"head": (2, 68), "hitCenter": (0, 33)}

SKIN = "#EBC4A0"
HAIR = "#3E2F26"
STEEL = "#A7B0BB"
SLATE = "#6B7682"
WINE = "#8E2A4A"
BOOT = "#4F433B"
LEATHER = "#6B5647"
WOOD = "#B89C78"
GOLD = "#D4A437"
PARCH = "#E8DFC8"

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # rear (near) hand holds the pike
BUTT, TIP = -20.0, 74.0              # along the pike from the rear hand
PY = HR[1] - 1.5                     # pike depth: just in front of the near fist
SHOULDER = (0.0, B.SHOULDER_Z)
# the far hand sits ~24 lu deeper than the pike; the 18 degree view yaw shows it about this
# much further forward on screen, so its grip target is moved back by this amount
DEPTH_SHIFT = 24.0 * 0.31
SMEAR = {"joint": "hand_r", "inner": (HR[0] + TIP - 30, PY, HR[2]), "outer": (HR[0] + TIP, PY, HR[2]),
         "color": STEEL, "taper": 0.3, "start": 0.2, "behind": 5.0}


def build(rig):
    B.skeleton(rig)
    B.legs(rig, WINE, BOOT, cuff=LEATHER, thigh_r=5.0)

    # torso: team doublet, slate breastplate, belt; team breeches puff at the hips
    g = Geo().blob((0, 0, 27.5), (10.8, 9.8, 12.0), p=2.3, taper=(1.12, 0.92))
    rig.part("torso", g, team=True)
    g = Geo().blob((1.4, 0, 29.0), (10.6, 9.4, 8.8), p=2.6, taper=(0.96, 1.0))
    g.clip((0, 0, 21.5), (0, 0, -1))
    g.clip((0, 0, 36.8), (0, 0, 1))
    rig.part("torso", g, SLATE, finish="metal")
    g = Geo().capsule((10.2, -1.5, 34.0), (11.6, -1.5, 23.5), 1.0)  # breastplate ridge
    rig.part("torso", g, STEEL, finish="metal", outline=0.6)
    g = Geo().blob((0.4, 0, 20.6), (11.6, 10.6, 1.9), p=3.2)
    rig.part("torso", g, LEATHER)
    g = Geo().blob((11.5, -2.2, 20.6), (1.3, 2.1, 2.1), p=3.0)
    rig.part("torso", g, GOLD, finish="metal", outline=0.8)
    for s in ("r", "l"):
        y = B.LEG_Y * B.SIDE_Y[s]
        g = Geo().blob((1.0, y * 1.1, 14.0), (6.8, 5.6, 5.8), p=2.2)
        rig.part(f"thigh_{s}", g, team=True)

    # head: face, short beard, steel morion with a crescent brim, a comb and a gold rim
    g = Geo().blob((2, 0, 49.0), (11.4, 10.8, 11.2), p=2.3)
    g.blob((13.2, -0.6, 48.0), (3.0, 2.9, 3.1), p=2.0)
    rig.part("head", g, SKIN)
    B.face(rig, cx=12.0, cz=49.8, brow=HAIR, eye_r=(3.2, 3.0, 3.8))
    g = Geo().blob((7.0, 0, 41.2), (7.6, 9.0, 4.2), p=2.2)
    g.blob((-5.5, 0, 46.0), (5.6, 9.6, 6.0), p=2.2)
    rig.part("head", g, HAIR, finish="hair")
    g = Geo().blob((1.5, 0, 55.0), (11.8, 11.4, 9.6), p=2.4)
    g.clip((0, 0, 54.0), (0, 0, -1))
    rig.part("head", g, STEEL, finish="metal")
    g = Geo()
    g.blob((1.5, 0, 54.4), (13.5, 12.4, 1.4), p=2.6)
    g.blob((13.5, 0, 56.8), (6.0, 10.6, 1.4), p=2.4, rot=(0, -30, 0))   # front upturn
    g.blob((-10.5, 0, 56.8), (6.0, 10.6, 1.4), p=2.4, rot=(0, 30, 0))   # back upturn
    rig.part("head", g, STEEL, finish="metal")
    pts = [(-8.0, 60.0), (-5.0, 66.5), (2.0, 69.0), (8.0, 65.5), (9.5, 60.0)]
    g = Geo().slab([(x + 1.0, z) for x, z in pts], 0.0, 2.6)
    rig.part("head", g, STEEL, finish="metal")
    g = Geo().blob((1.5, 0, 54.0), (12.1, 11.7, 1.1), p=2.8)
    rig.part("head", g, GOLD, finish="metal", outline=0.6)
    # team feather plume tucked behind the comb (follow-through)
    rig.secondary("plume", "head", (-6.0, 0, 63.0), (-17.0, 0, 60.0), max_deg=12, gain=1.0)
    g = Geo()
    for x, z, r in ((-6.0, 64.0, 3.4), (-9.5, 66.0, 3.8), (-13.5, 65.2, 3.4), (-16.8, 62.6, 2.8),
                    (-18.6, 59.4, 2.2)):
        g.blob((x, 0, z), (r * 1.2, r * 0.8, r), p=2.1)
    rig.part("plume", g, team=True)

    # arms: puffed team sleeves, slate forearms, leather gloves
    for s in ("r", "l"):
        y = B.ARM_Y[s]
        B.arm_parts(rig, s, SLATE, hand=LEATHER, cuff=LEATHER)
        g = Geo().blob((0.3, y * 1.02, 33.2), (6.4, 5.8, 6.6), p=2.2)
        rig.part(f"arm_{s}", g, team=True)

    # the pike on the rear hand, modelled along +X (rest direction 0)
    hx, hy, hz = HR
    g = Geo().lathe([(0, BUTT - 0.5), (1.9, BUTT), (1.7, 0), (1.5, TIP - 12), (0, TIP - 11)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=10)
    rig.part("hand_r", g, WOOD)
    g = Geo().lathe([(0, TIP - 16), (1.9, TIP - 15.5), (2.2, TIP - 12), (3.4, TIP - 8), (0, TIP)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=12, squash=(1.0, 0.5))
    rig.part("hand_r", g, STEEL, finish="metal")
    g = Geo().lathe([(0, TIP - 17), (2.6, TIP - 16.5), (2.6, TIP - 15), (0, TIP - 14.5)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=12)
    rig.part("hand_r", g, GOLD, finish="metal", outline=0.6)
    g = Geo().sphere((hx + BUTT, PY, hz), 2.3, cuts=3)
    rig.part("hand_r", g, SLATE, finish="metal", outline=0.8)
    # team pennon below the head, streaming back (follow-through, held level)
    px0 = hx + TIP - 19.0
    rig.secondary("pennon", "hand_r", (px0, PY, hz - 1.0), (px0 - 15, PY, hz - 5.0), max_deg=14,
                  gain=1.2, rot_gain=0.4)
    pts = [(0.0, 0.0), (-15.0, -1.0), (-11.0, -4.8), (-15.0, -8.6), (0.0, -9.2)]
    g = Geo().slab([(px0 + x, hz - 0.8 + z) for x, z in pts], PY, 1.2)
    rig.part("pennon", g, team=True, outline=0.8)
    rig.track("pikeTip", "hand_r", (hx + TIP, PY, hz))
    rig.track("_foot", "shin_r", (3.3, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def _dir(deg):
    return math.cos(math.radians(deg)), math.sin(math.radians(deg))


def pike(a, f, w, grip=24.0):
    """Rear hand (a, f), pike pointing w degrees; the far hand grips the pike as far forward
    as it can reach (at most `grip` lu ahead of the rear hand)."""
    hx, hz = B.fk_hand(SHOULDER, a, f)
    dx, dz = _dir(w)
    g = grip
    while g > 2.0:
        tx, tz = hx + dx * g - DEPTH_SHIFT, hz + dz * g
        if math.hypot(tx - SHOULDER[0], tz - SHOULDER[1]) < B.UPPER + B.LOWER - 1.2:
            break
        g -= 1.0
    la, lf = B.ik2(SHOULDER, (tx, tz))
    return merge(B.arm("r", a, f, w, w_rest=0.0), B.arm("l", la, lf))


def _pennon(pose, w):
    # the pennon hangs back from the pike; counter-rotate a little so it streams level
    pose.setdefault("pennon", {})["r"] = pose.get("pennon", {}).get("r", 0.0) - 0.6 * w
    return pose


BRACE = {"thigh_r": {"r": 12}, "shin_r": {"r": -6}, "thigh_l": {"r": -12}, "shin_l": {"r": -4},
         "hips": {"z": -1.0}}
STANCE_PIKE = (-80, -40, 58)


def _stance():
    return merge(pike(*STANCE_PIKE), BRACE, {"torso": {"r": -3}})


def _idle(f):
    c, lag = B.idle_wave(f)
    w = STANCE_PIKE[2] + 2.0 * lag
    pose = merge(pike(STANCE_PIKE[0] + 2 * lag, STANCE_PIKE[1], w), BRACE, {"torso": {"r": -3}},
                 B.idle_body(f))
    return _pennon(pose, w)


def _walk(f):
    pose, p, bl = B.walk_legs(f, stride=30.0)
    w = 62 + 3 * bl
    return _pennon(merge(pike(-78 + 4 * math.cos(p), -38, w), pose), w)


def _attack(f):
    # 0-1 lower and coil the pike back (anticipation), 2 held coil, 3 smear (thrust),
    # 4 held impact: long lunge, pike level, 5-7 recover to the braced stance
    a = pick(f, [-100, -125, -135, -60, -28, -32, -55, -75])
    fo = pick(f, [-55, -100, -140, -30, -6, -10, -25, -38])
    tr = pick(f, [0, 6, 10, -8, -16, -14, -8, -4])
    w = pick(f, [30, 12, 6, 2, 0, 2, 20, 45]) - tr   # pike angle on screen, not in the torso
    sq = pick(f, [-0.04, -0.08, 0.04, 0.06, -0.12, -0.08, -0.02, 0.0])
    pose = merge(pike(a, fo, w), {
        "body": dict(squash(sq), x=pick(f, [-1, -3, -4.5, 3, 9, 8, 4, 1])),
        "hips": {"z": pick(f, [-1, -2, -2.5, -1, -3.5, -3, -2, -1])},
        "torso": {"r": tr},
        "head": {"r": pick(f, [0, 3, 5, -3, -4, -3, -1, 0])},
        "thigh_r": {"r": pick(f, [10, 4, 0, 18, 34, 30, 20, 12])},
        "shin_r": {"r": pick(f, [-6, -4, -4, -10, -18, -14, -8, -6])},
        "thigh_l": {"r": pick(f, [-12, -18, -22, -24, -32, -28, -18, -12])},
        "shin_l": {"r": pick(f, [-4, -8, -10, -2, 0, -2, -4, -4])},
    })
    if f == 3:
        pose["hand_r"]["sx"] = 1.12   # smear frame: the pike stretches along the thrust
    if f in (3, 4):
        B.yell(pose)
    return _pennon(pose, w)


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    w = STANCE_PIKE[2] + 12 * a
    pose = merge(pike(STANCE_PIKE[0] + 10 * a, STANCE_PIKE[1] + 10 * a, w), BRACE, B.hit_body(f))
    return _pennon(pose, w)


def _die(f):
    w = pick(f, [62, 48, 36])
    pose = merge(pike(-60, -20, w), fx.die_pose(f), {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    })
    if f == 0:
        B.yell(pose)
    return _pennon(pose, w)


def clips():
    return [
        Clip("idle", 4, _idle, loop=True, sequence=fx.IDLE_SEQUENCE, durations=fx.IDLE_MS),
        Clip("walk", 8, _walk, loop=True, durations=fx.WALK_MS),
        Clip("attack", 8, _attack, impact=fx.MELEE_IMPACT, smear=fx.MELEE_SMEAR,
             durations=fx.MELEE_MS),
        Clip("hit", 3, _hit, durations=fx.HIT_MS),
        Clip("die", 3, _die, durations=fx.DIE_MS, extra=fx.death_meta(HEIGHT_LU)),
    ]
