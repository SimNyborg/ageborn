"""Shared rigs and parts for the Future Age units (DESIGN A5.6): photon knight, rail gunner,
EMP saboteur (biped), walker mech and chrono titan (walker: hull on two IK legs) and the
repair drone (flyer). The pulse trooper (units/pulse_trooper.py) is the style reference:
charcoal undersuit, glossy white armour, team plates, mint/magenta energy.

Biped: the same proportions as the other ages' bipeds (68 lu tall, head about a third of the
height, feet at the origin, facing +X, near side at -Y). Arms are modelled hanging straight
down, so a pose names each arm segment by the direction it points (degrees in torso space,
counter-clockwise on screen, 0 = forward, -90 = down, 90 = up); `arm()` converts that to joint
rotations and `ik2()` solves an arm for a target point. The helpers are copied from the
Modern module on purpose, so the ages can be tuned independently.

Joint names: body > hips > torso > head; thigh_r/l > shin_r/l; arm_r/l > fore_r/l > hand_r/l.
`_r` is the near side (-Y, toward the camera), `_l` the far side.

Walker: `walker_leg()` builds a mech leg modelled straight down (thigh, shin, foot on their own
joints); `leg_ik()` poses it so the ankle reaches a target in hips space with the foot kept
flat, bending the knee forward (humanoid) or backward (reverse-joint). `walker_cycle()` gives
planted/swing foot targets so the feet never slide (the `_foot` tracker then yields the walk's
natural speed).

Palette (DESIGN A11, Future): charcoal and white as large areas, magenta and mint energy
(outside the team hue bands), cyan only as a small accent (it is inside the blue band).
Team colour goes on chest plates, shoulder pads, helmet caps, crests and hull plates.
"""
import math

from .anim import merge, pick, squash
from .geometry import Geo

# -- palette ------------------------------------------------------------------------------
CHARCOAL = "#23262E"
SUIT = "#2E323C"
SUIT_LT = "#444A57"
ARMOR = "#E9EDF2"
TRIM = "#A9B1BD"
STEEL = "#8D96A3"
GUNMETAL = "#3A3F4A"
MINT = "#3AF0B4"
MINT_CORE = "#D6FFF1"
MAGENTA = "#F03AA8"
MAGENTA_CORE = "#FFD6EE"
CYAN = "#29E3F5"
VISOR_DARK = "#1B1E25"
VENT = "#E6EAEE"
SKIN = "#EBC4A0"
WHITE = "#FFFFFF"

# -- biped layout in lu (character space) ------------------------------------------------
HIP_Z = 15.0
KNEE_Z = 8.5
SHOULDER_Z = 36.0
ELBOW_Z = 28.0
HAND_Z = 21.0
UPPER = SHOULDER_Z - ELBOW_Z
LOWER = ELBOW_Z - HAND_Z
LEG_Y = 6.0
ARM_Y = {"r": -12.5, "l": 11.0}
SIDE_Y = {"r": -1.0, "l": 1.0}
SH = (0.0, SHOULDER_Z)   # shoulder in torso space (x, z)


def skeleton(rig, head=(1, 0, 38), arm_y=None, hip_z=HIP_Z, parent="root"):
    """Adds the biped joints (no parts)."""
    arm_y = arm_y or ARM_Y
    rig.joint("body", parent, (0, 0, 0))
    rig.joint("hips", "body", (0, 0, hip_z))
    rig.joint("torso", "hips", (0, 0, hip_z + 1))
    rig.joint("head", "torso", head)
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        rig.joint(f"thigh_{s}", "hips", (0, y, hip_z))
        rig.joint(f"shin_{s}", f"thigh_{s}", (0.5, y, KNEE_Z))
        y = arm_y[s]
        rig.joint(f"arm_{s}", "torso", (0, y, SHOULDER_Z))
        rig.joint(f"fore_{s}", f"arm_{s}", (0, y, ELBOW_Z))
        rig.joint(f"hand_{s}", f"fore_{s}", (0, y, HAND_Z))


def legs(rig, suit=SUIT, armor=ARMOR, thigh_r=4.6, hip_z=HIP_Z, knee_pad=True, team_thigh=False):
    """Charcoal undersuit legs with big glossy white boots and knee pads (pulse trooper)."""
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        g = Geo().capsule((0, y, hip_z), (0.5, y, KNEE_Z), thigh_r, thigh_r - 0.5)
        rig.part(f"thigh_{s}", g, suit, team=team_thigh and s == "r")
        g = Geo().capsule((0.5, y, KNEE_Z), (1.0, y, 4.6), thigh_r - 0.7, 3.8)
        rig.part(f"shin_{s}", g, suit)
        g = Geo().blob((3.0, y, 3.1), (7.2, 5.0, 3.4), p=3.0, taper=(1.05, 0.85))
        g.blob((0.9, y, 7.0), (4.8, 4.7, 3.2), p=2.6)
        rig.part(f"shin_{s}", g, armor, finish="gloss")
        if knee_pad:
            g = Geo().blob((2.2, y, KNEE_Z + 0.4), (3.2, 3.9, 3.0), p=2.6)
            rig.part(f"shin_{s}", g, armor, finish="gloss", outline_hex=TRIM)


def arm_parts(rig, s, sleeve=SUIT, glove=ARMOR, r0=4.1, r1=3.6, fist=4.2, arm_y=None,
              bracer=True, team_sleeve=False):
    """Suit upper arm, white armoured forearm bracer and a white gauntlet fist."""
    y = (arm_y or ARM_Y)[s]
    g = Geo().capsule((0, y, SHOULDER_Z), (0, y, ELBOW_Z), r0, r1 + 0.2)
    rig.part(f"arm_{s}", g, sleeve, team=team_sleeve)
    g = Geo().capsule((0, y, ELBOW_Z), (0, y, HAND_Z + 2.0), r1 + 0.1, r1 - 0.2)
    rig.part(f"fore_{s}", g, sleeve)
    if bracer:
        g = Geo().blob((0.3, y, HAND_Z + 4.2), (r1 + 1.3, r1 + 1.2, 3.6), p=2.8, taper=(0.9, 1.1))
        rig.part(f"fore_{s}", g, glove, finish="gloss", outline_hex=TRIM)
    g = Geo().blob((0.4, y, HAND_Z - 0.4), (fist, fist - 0.2, fist), p=2.4)
    rig.part(f"hand_{s}", g, glove, finish="gloss", outline_hex=TRIM)


def shoulders(rig, arm_y=None, r=(6.8, 5.8, 5.4), z=37.6, far=True):
    """Team shoulder pads (the near one is the big team cue of the upper body)."""
    for s in ("r", "l") if far else ("r",):
        y = (arm_y or ARM_Y)[s]
        g = Geo().blob((0.5, y - 0.3 * SIDE_Y[s], z), r, p=2.6)
        rig.part(f"arm_{s}", g, team=True)


def torso_armor(rig, suit=SUIT, team_chest=True, belt=TRIM, belt_light=MINT, pack=True, bulk=1.0):
    """Charcoal suit torso, a team chest plate, a trim belt with a light, a backpack cell."""
    k = bulk
    g = Geo().blob((0, 0, 28), (9.8 * k, 9.6 * k, 11.2), p=2.4, taper=(0.95, 1.05))
    g.blob((0, 0, 17.5), (8.8 * k, 9.2 * k, 4.2), p=2.6)
    rig.part("torso", g, suit)
    if team_chest:
        g = Geo().blob((1.8, 0, 32.0), (9.6 * k, 10.4 * k, 7.4), p=3.0, taper=(0.9, 1.0))
        rig.part("torso", g, team=True)
    g = Geo().blob((0.4, 0, 21.8), (10.2 * k, 10.2 * k, 2.4), p=3.4)
    rig.part("torso", g, belt)
    if belt_light:
        g = Geo().blob((10.4 * k, -2.0, 21.8), (1.4, 2.4, 1.4), p=2.4)
        rig.part("torso", g, glow=belt_light, outline=1.0, outline_hex=suit)
    if pack:
        g = Geo().blob((-11.0 * k, 0, 31), (4.4, 8.2, 8.6), p=4.0)
        rig.part("torso", g, suit)
        g = Geo().capsule((-15.2 * k, -4.5, 26.5), (-15.2 * k, -4.5, 35.5), 1.7)
        g.capsule((-15.2 * k, 1.5, 26.5), (-15.2 * k, 1.5, 35.5), 1.7)
        rig.part("torso", g, glow=MINT, outline=1.0, outline_hex=suit)


def visor_eyes(rig, cx=13.4, cz=50.3, color=MINT, dy=(-4.0, 2.2), size=(1.2, 1.9, 2.4)):
    """Two glowing visor 'eyes' on joint `eyes`; `eyes_x` (hidden) are the KO crosses.
    Squint by scaling `eyes` sz (pose helper `squint`)."""
    rig.joint("eyes", "head", (cx, 0, cz))
    g = Geo()
    for y in dy:
        g.blob((cx + 0.3, y, cz), size, p=3.0)
    rig.part("eyes", g, glow=color, outline=0)
    rig.joint("eyes_x", "head", (cx, 0, cz), hidden=True)
    g = Geo()
    for y in dy:
        g.capsule((cx + 0.5, y - 1.7, cz + 1.7), (cx + 0.5, y + 1.7, cz - 1.7), 0.75)
        g.capsule((cx + 0.5, y - 1.7, cz - 1.7), (cx + 0.5, y + 1.7, cz + 1.7), 0.75)
    rig.part("eyes_x", g, glow=color, outline=0)


def ko(pose):
    pose.update({"eyes": {"hide": True}, "eyes_x": {"show": True}})
    return pose


def squint(pose, k=0.4):
    pose.setdefault("eyes", {})["sz"] = k
    return pose


def sparks(rig, joint, at, color=MINT, core=WHITE, size=1.0, name="sparks", rays=6, seed=0,
           hidden=True):
    """A hidden burst of short energy rays around `at` in the side plane."""
    x, y, z = at
    rig.joint(name, joint, at, hidden=hidden)
    g = Geo()
    for i in range(rays):
        a = math.radians(360.0 * i / rays + 17 * seed + (11 if i % 2 else 0))
        r0, r1 = 2.5 * size, (8.5 if i % 2 == 0 else 6.0) * size
        g.capsule((x + r0 * math.cos(a), y - 2, z + r0 * math.sin(a)),
                  (x + r1 * math.cos(a), y - 2, z + r1 * math.sin(a)), 1.1 * size, 0.35 * size,
                  segs=8, rings=2)
    rig.part(name, g, glow=color, outline=0)
    g = Geo().sphere((x, y - 2.5, z), 2.6 * size, cuts=3)
    rig.part(name, g, glow=core, outline=0)


def puff(rig, joint, at, size=1.0, name="vent", color=VENT, spread=1.0, hidden=True):
    """A cluster of light vent-steam balls (dust finish) on a hidden joint."""
    x, y, z = at
    k = size
    rig.joint(name, joint, at, hidden=hidden)
    g = Geo()
    for dx, dz, r in ((0, 0, 3.2), (3.6, 1.8, 2.6), (-2.6, 2.8, 2.4), (1.2, 4.6, 2.1)):
        g.sphere((x + dx * k * spread, y - 2, z + dz * k), r * k, cuts=4)
    rig.part(name, g, color, finish="dust", outline=0.8)


# -- biped posing --------------------------------------------------------------------------
def arm(s, a, f, w=None, w_rest=-90.0):
    """Arm on side s: upper arm pointing `a` degrees, forearm `f` degrees (torso space).
    `w` is the held item's direction if its rest (as modelled) points `w_rest` degrees."""
    pose = {f"arm_{s}": {"r": a + 90.0}, f"fore_{s}": {"r": f - a}}
    if w is not None:
        pose[f"hand_{s}"] = {"r": w - w_rest - (f + 90.0)}
    return pose


def ik2(shoulder, target, l1=UPPER, l2=LOWER, elbow_down=True):
    """Two-bone solve in the side plane: (a, f) directions (deg) so the end joint reaches
    `target` from `shoulder` (both (x, z)). Out-of-reach targets straighten the chain."""
    dx, dz = target[0] - shoulder[0], target[1] - shoulder[1]
    d = max(1e-3, min(l1 + l2 - 1e-3, math.hypot(dx, dz)))
    base = math.degrees(math.atan2(dz, dx))
    cos_a = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
    off = math.degrees(math.acos(max(-1.0, min(1.0, cos_a))))
    a = base - off if elbow_down else base + off
    ex = shoulder[0] + l1 * math.cos(math.radians(a))
    ez = shoulder[1] + l1 * math.sin(math.radians(a))
    f = math.degrees(math.atan2(target[1] - ez, target[0] - ex))
    return a, f


def rot2(p, deg, about=(0.0, 0.0)):
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    x, z = p[0] - about[0], p[1] - about[1]
    return (about[0] + x * c - z * s, about[1] + x * s + z * c)


def hold2(joint, g0, fore, gx, gz, deg, near_off=(-0.4, 0.4), far_off=(-1.0, -1.0), sh=SH):
    """A two-handed long gun on `joint` (a child of the torso, modelled with its grip at g0,
    pointing +X): grip at (gx, gz) in torso space pointing `deg`; the near hand holds the
    grip, the far hand the fore-end `fore` lu further along. Returns the pose."""
    pose = {joint: {"x": gx - g0[0], "z": gz - g0[2], "r": deg}}
    a, f = ik2(sh, (gx + near_off[0], gz + near_off[1]))
    pose.update(arm("r", a, f))
    fx_, fz = gx + fore * math.cos(math.radians(deg)), gz + fore * math.sin(math.radians(deg))
    a, f = ik2(sh, (fx_ + far_off[0], fz + far_off[1]))
    pose.update(arm("l", a, f))
    return pose


def idle_wave(f):
    """(c, lag) for the 4 idle poses played 0-1-2-3-2-1: c is the breath, lag one pose behind."""
    return [-1.0, -0.45, 0.45, 1.0][f], [-1.0, -1.0, -0.45, 0.45][f]


def idle_body(f, bob=1.3, sq=0.045, lean=1.5):
    c, lag = idle_wave(f)
    return {"hips": {"z": bob * c}, "body": squash(sq * c), "torso": {"r": lean * c},
            "head": {"r": -2.5 * lag, "z": 0.4 * lag}}


def walk_legs(f, stride=30.0, lift=58.0, bob=2.4, lean=-8.0, sway=6.0):
    """Biped walk (8 frames, contact on 0 and 4, passing on 2 and 6).
    Returns (pose, phase, lagged bob in -1..0.5)."""
    p = 2 * math.pi * f / 8
    lift_r, lift_l = max(0.0, -math.sin(p)), max(0.0, math.sin(p))
    b = [-1.0, -0.25, 0.5, -0.25, -1.0, -0.25, 0.5, -0.25][f] * bob
    b_lag = [-0.25, -1.0, -0.25, 0.5, -0.25, -1.0, -0.25, 0.5][f] * bob
    return merge({
        "hips": {"z": b},
        "body": squash(0.03 * b / max(0.1, bob)),
        "torso": {"r": lean + 1.0 * math.cos(2 * p), "rz": sway * math.sin(p)},
        "head": {"r": -lean * 0.4 - 1.5 * b_lag / max(0.1, bob)},
        "thigh_r": {"r": stride * math.cos(p) + 14 * lift_r}, "shin_r": {"r": -lift * lift_r},
        "thigh_l": {"r": -stride * math.cos(p) + 14 * lift_l}, "shin_l": {"r": -lift * lift_l},
    }), p, b_lag / max(0.1, bob)


def hit_body(f, amt=1.0):
    a = [1.0, 0.55, 0.2][f] * amt
    return {"body": dict(squash(-0.12 * a), x=-4.0 * a), "torso": {"r": 14 * a},
            "head": {"r": 12 * a}}


def die_limbs(f):
    """Arm and leg flails for the 3 death frames (merge over fx.die_pose)."""
    return {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    }


# -- walker legs -----------------------------------------------------------------------------
def walker_leg(rig, s, hip, thigh, shin, parent="hips"):
    """Joints for one mech leg modelled straight down from `hip` (x, y, z): thigh (hip to
    knee), shin (knee to ankle) and foot (at the ankle). Returns (knee, ankle) positions."""
    x, y, z = hip
    knee = (x, y, z - thigh)
    ankle = (x, y, z - thigh - shin)
    rig.joint(f"thigh_{s}", parent, hip)
    rig.joint(f"shin_{s}", f"thigh_{s}", knee)
    rig.joint(f"foot_{s}", f"shin_{s}", ankle)
    return knee, ankle


def leg_ik(s, hip_xz, target_xz, l1, l2, knee_fwd=True, body_r=0.0, foot_r=0.0):
    """Pose for a walker leg (modelled straight down) so the ankle reaches `target_xz` (in
    the leg's parent space, x forward, z up) with the foot at `foot_r` degrees in world
    (0 = flat). `body_r` is the summed rotation of the leg's parents (to keep feet flat)."""
    a, f = ik2(hip_xz, target_xz, l1, l2, elbow_down=not knee_fwd)
    return {f"thigh_{s}": {"r": a + 90.0}, f"shin_{s}": {"r": f - a},
            f"foot_{s}": {"r": -(f + 90.0) - body_r + foot_r}}


def walker_cycle(f, n, stride, lift, phase=0.0):
    """Foot offset (dx, dz, planted) at frame f of an n-frame loop for a two-leg walker.
    The foot is planted for the first half (sliding back from +stride/2 to -stride/2 at
    constant speed, so the ground does not slip) and swings forward in an arc for the second."""
    u = ((f / n) + phase) % 1.0
    if u < 0.5:
        t = u / 0.5
        return stride / 2 - stride * t, 0.0, True
    t = (u - 0.5) / 0.5
    e = t * t * (3 - 2 * t)
    return -stride / 2 + stride * e, lift * math.sin(math.pi * t), False
