"""Phalangite: Bronze Age anti-armor (A17.9). Sarissa, reach 65, priority armored, ~72 lu.

Look (A17.12): a phalanx pikeman in a tall aged-bronze helmet (a high pointed dome, cheek
guards, a team crest standing tall), a linen cuirass over a team chiton with team sleeves and
pteruges, greaves and sandals, and a small round team shield slung on the near shoulder so
both hands stay on the weapon. The sarissa is very long (about 1.4x his height, A11: polearm =
reach), held low and level in both hands with a polished leaf head and a bronze butt spike.
He stands braced, feet wide. The attack coils the sarissa back and drives it forward in a
long braced thrust (smear, held impact) and recovers.
"""
import math

from ageborn_art import fx
from ageborn_art import rigs_bronze as B
from ageborn_art.anim import Clip, merge, pick, squash
from ageborn_art.geometry import Geo

SLUG = "phalangite"
NAME = "Phalangite"
HEIGHT_LU = 72
CANVAS = (404, 256)
FEET = (112, 228)
ANCHORS = {"head": (2, 70), "hitCenter": (0, 33)}

HR = (0.0, B.ARM_Y["r"], B.HAND_Z)   # rear (near) hand holds the sarissa
BUTT, TIP = -28.0, 98.0
PY = HR[1] - 1.5
SHOULDER = (0.0, B.SHOULDER_Z)
DEPTH_SHIFT = 24.0 * 0.18
SMEAR = {"joint": "hand_r", "inner": (HR[0] + TIP - 34, PY, HR[2]), "outer": (HR[0] + TIP, PY, HR[2]),
         "color": B.BRONZE_HI, "taper": 0.3, "start": 0.2, "behind": 5.0}


def build(rig):
    B.skeleton(rig)
    B.sandal_legs(rig, thigh_r=4.9)

    # team chiton, linen cuirass, team pteruges
    g = Geo().blob((0, 0, 27.0), (10.6, 9.8, 12.0), p=2.3, taper=(1.1, 0.92))
    rig.part("torso", g, team=True)
    g = Geo().blob((1.0, 0, 29.0), (10.9, 10.1, 9.2), p=2.6, taper=(0.98, 1.0))
    g.clip((0, 0, 21.0), (0, 0, -1)).clip((0, 0, 37.0), (0, 0, 1))
    rig.part("torso", g, B.LINEN)
    g = Geo().blob((1.0, 0, 21.4), (11.4, 10.6, 1.4), p=3.2)
    g.blob((1.0, 0, 36.2), (10.4, 9.6, 1.1), p=3.2)
    rig.part("torso", g, B.AGED, finish="metal", outline=0.6)
    rig.secondary("hem", "hips", (0.5, 0, 17.0), (0.5, 0, 9.0), max_deg=8, gain=0.7)
    B.pteruges(rig, "hem", 17.6, B.LINEN, n=8, radius=(11.4, 10.6), length=8.0)
    g = Geo().blob((0.6, 0, 16.0), (11.0, 10.2, 3.6), p=2.6)
    rig.part("hem", g, team=True)

    # head: short beard, tall helmet with a standing team crest
    B.head_ball(rig)
    B.face(rig, cx=12.0, cz=50.0, brow=B.HAIR, eye_r=(3.2, 3.0, 3.8))
    g = Geo()
    for x, y, z, r in ((11.6, -3.0, 40.6, 2.6), (12.8, 0.0, 39.8, 2.8), (11.6, 3.0, 40.6, 2.4)):
        g.blob((x, y, z), (r, r, r * 0.95), p=2.1)
    rig.part("head", g, B.HAIR, finish="hair")
    B.helmet(rig, tall=6.0, crest_len=18.0, crest_h=11.0)

    # arms: team sleeves, bare forearms, leather bracers
    for s in ("r", "l"):
        y = B.ARM_Y[s]
        B.arm_parts(rig, s, B.SKIN, hand=B.SKIN, r0=4.1, r1=3.7)
        g = Geo().blob((0.3, y * 1.02, 33.4), (5.8, 5.4, 5.6), p=2.3)
        rig.part(f"arm_{s}", g, team=True)
        g = Geo().blob((0, y, B.HAND_Z + 3.4), (4.5, 4.5, 1.8), p=2.6)
        rig.part(f"fore_{s}", g, B.LEATHER, outline=0.7)

    # small round shield slung on the near shoulder
    rig.joint("pelte", "torso", (2.0, -14.0, 32.0))
    B.aspis(rig, "pelte", (3.0, -17.5, 29.0), r=8.8, depth=1.8, rim=B.BRONZE, rim_w=1.4)

    # the sarissa on the rear hand, modelled along +X (rest direction 0)
    hx, hy, hz = HR
    g = Geo().lathe([(0, BUTT - 0.5), (1.6, BUTT), (1.5, 0), (1.3, TIP - 13), (0, TIP - 12)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=10)
    rig.part("hand_r", g, B.WOOD)
    g = Geo().lathe([(0, TIP - 14.5), (1.6, TIP - 14), (2.8, TIP - 9.5), (1.8, TIP - 4.0), (0, TIP)],
                    (hx, PY, hz), (hx + 1, PY, hz), segs=12, squash=(1.0, 0.5))
    rig.part("hand_r", g, B.BRONZE, finish=B.POLISH)
    g = Geo().lathe([(1.7, BUTT + 0.5), (1.6, BUTT - 2.5), (0, BUTT - 6.0)], (hx, PY, hz), (hx + 1, PY, hz), segs=10)
    g.lathe([(0, 34.0), (1.9, 34.2), (1.9, 36.6), (0, 36.8)], (hx, PY, hz), (hx + 1, PY, hz), segs=10)  # joint sleeve
    rig.part("hand_r", g, B.AGED_DK, finish="metal", outline=0.6)
    # team ribbon tied under the head (follow-through)
    px0 = hx + TIP - 16.0
    rig.secondary("pennon", "hand_r", (px0, PY, hz - 0.8), (px0 - 12, PY, hz - 6.0), max_deg=14,
                  gain=1.2, rot_gain=0.4)
    pts = [(0.0, 0.0), (-12.0, -2.0), (-9.0, -4.6), (-12.5, -7.4), (0.0, -6.8)]
    g = Geo().slab([(px0 + x, hz - 0.8 + z) for x, z in pts], PY, 1.2)
    rig.part("pennon", g, team=True, outline=0.8)
    rig.track("sarissaTip", "hand_r", (hx + TIP, PY, hz))
    rig.track("_foot", "shin_r", (3.1, -6.0, 0.5))


# -- poses ---------------------------------------------------------------------------------
def _dir(deg):
    return math.cos(math.radians(deg)), math.sin(math.radians(deg))


def sarissa(a, f, w, grip=24.0):
    """Rear hand (a, f), sarissa pointing w degrees; the far hand grips as far forward as it
    can reach (at most `grip` lu ahead of the rear hand)."""
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
    pose.setdefault("pennon", {})["r"] = pose.get("pennon", {}).get("r", 0.0) - 0.6 * w
    return pose


BRACE = {"thigh_r": {"r": 14}, "shin_r": {"r": -8}, "thigh_l": {"r": -14}, "shin_l": {"r": -4},
         "hips": {"z": -1.2}}
STANCE = (-86, -30, 14)       # held low and nearly level: the reach reads at a glance


def _idle(f):
    c, lag = B.idle_wave(f)
    w = STANCE[2] + 1.5 * lag
    pose = merge(sarissa(STANCE[0] + 2 * lag, STANCE[1], w), BRACE, {"torso": {"r": -3}}, B.idle_body(f))
    return _pennon(pose, w)


def _walk(f):
    pose, p, bl = B.walk_legs(f, stride=30.0)
    w = 18 + 2.5 * bl
    return _pennon(merge(sarissa(-84 + 4 * math.cos(p), -32, w), pose), w)


def _attack(f):
    # 0-1 coil the sarissa back (anticipation), 2 held coil, 3 smear (thrust),
    # 4 held impact: a long braced lunge, level, 5-7 recover to the braced stance
    a = pick(f, [-105, -128, -138, -62, -28, -32, -58, -80])
    fo = pick(f, [-50, -95, -135, -28, -6, -10, -22, -30])
    tr = pick(f, [0, 6, 10, -8, -16, -14, -8, -4])
    w = pick(f, [10, 6, 4, 0, -2, 0, 6, 12]) - tr
    sq = pick(f, [-0.04, -0.08, 0.04, 0.06, -0.12, -0.08, -0.02, 0.0])
    pose = merge(sarissa(a, fo, w), {
        "body": dict(squash(sq), x=pick(f, [-1, -3, -5, 3, 10, 9, 4, 1])),
        "hips": {"z": pick(f, [-1, -2, -2.5, -1, -3.8, -3, -2, -1])},
        "torso": {"r": tr},
        "head": {"r": pick(f, [0, 3, 5, -3, -4, -3, -1, 0])},
        "thigh_r": {"r": pick(f, [12, 4, 0, 20, 36, 32, 22, 14])},
        "shin_r": {"r": pick(f, [-8, -4, -4, -12, -20, -16, -10, -8])},
        "thigh_l": {"r": pick(f, [-14, -20, -24, -26, -34, -30, -20, -14])},
        "shin_l": {"r": pick(f, [-4, -8, -10, -2, 0, -2, -4, -4])},
    })
    if f == 3:
        pose["hand_r"]["sx"] = 1.1   # smear frame: the sarissa stretches along the thrust
    if f in (3, 4):
        B.yell(pose)
    return _pennon(pose, w)


def _hit(f):
    a = [1.0, 0.55, 0.2][f]
    w = STANCE[2] + 14 * a
    pose = merge(sarissa(STANCE[0] + 10 * a, STANCE[1] + 10 * a, w), BRACE, B.hit_body(f))
    return _pennon(pose, w)


def _die(f):
    w = pick(f, [30, 20, 10])
    pose = merge(sarissa(-60, -20, w), fx.die_pose(f), {
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
