"""Shared biped rig and pose helpers for the Medieval Age units (footman, longbowman,
pikeman, friar, the ram crew and the Ursa Paladin's rider).

The biped matches the Stone and Future bipeds (bonker, pulse_trooper): 68 lu tall, head
about a third of the height, feet at the origin, facing +X, the near side at -Y. Arms are
modelled hanging straight down, so a pose can name each arm segment by the direction it
points in (degrees in torso space, counter-clockwise on screen, 0 = forward, -90 = down,
90 = up) and `arm()` converts that to joint rotations. `ik2()` solves an arm for a target
point (the longbowman's drawing hand on the string).

Joint names: body > hips > torso > head; thigh_r/l > shin_r/l; arm_r/l > fore_r/l >
hand_r/l. `_r` is the near side (-Y, toward the camera), `_l` the far side.
"""
import math

from .anim import merge, squash
from .geometry import Geo

# rest layout in lu (character space)
HIP_Z = 15.0
KNEE_Z = 8.5
SHOULDER_Z = 36.0
ELBOW_Z = 28.0
HAND_Z = 21.0
UPPER = SHOULDER_Z - ELBOW_Z   # upper arm length
LOWER = ELBOW_Z - HAND_Z       # forearm length (to the hand joint)
LEG_Y = 6.0
ARM_Y = {"r": -12.5, "l": 12.0}
SIDE_Y = {"r": -1.0, "l": 1.0}


def skeleton(rig, head=(1, 0, 38), arm_y=None, hip_z=HIP_Z):
    """Adds the biped joints (no parts)."""
    arm_y = arm_y or ARM_Y
    rig.joint("body", "root", (0, 0, 0))
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


def legs(rig, hose, boot, cuff=None, thigh_r=4.7, hip_z=HIP_Z, boot_finish="matte"):
    """Stocky legs in hose with chunky boots (and an optional turned-down cuff)."""
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        g = Geo().capsule((0, y, hip_z), (0.5, y, KNEE_Z), thigh_r, thigh_r - 0.6)
        rig.part(f"thigh_{s}", g, hose)
        g = Geo().capsule((0.5, y, KNEE_Z), (1.0, y, 4.0), thigh_r - 0.6, 3.7)
        rig.part(f"shin_{s}", g, hose)
        g = Geo().blob((3.3, y, 2.8), (6.8, 4.6, 3.0), p=2.8, taper=(1.02, 0.84))
        g.blob((0.9, y, 5.6), (4.5, 4.4, 2.8), p=2.6)
        rig.part(f"shin_{s}", g, boot, finish=boot_finish)
        if cuff:
            g = Geo().blob((0.9, y, 8.2), (4.9, 4.8, 1.5), p=2.8)
            rig.part(f"shin_{s}", g, cuff)


def arm_parts(rig, s, sleeve=None, hand="#EBC4A0", team_sleeve=False, r0=4.3, r1=3.8,
              fist=4.3, glove_finish="matte", cuff=None, arm_y=None):
    """Upper arm, forearm and a fist on one side. sleeve=None with team_sleeve=True makes
    the whole sleeve team-coloured."""
    y = (arm_y or ARM_Y)[s]
    g = Geo().capsule((0, y, SHOULDER_Z), (0, y, ELBOW_Z), r0, r1 + 0.2)
    rig.part(f"arm_{s}", g, sleeve, team=team_sleeve)
    g = Geo().capsule((0, y, ELBOW_Z), (0, y, HAND_Z + 2.0), r1 + 0.2, r1)
    rig.part(f"fore_{s}", g, sleeve, team=team_sleeve)
    if cuff:
        g = Geo().blob((0, y, HAND_Z + 3.2), (r1 + 1.0, r1 + 1.0, 1.6), p=2.6)
        rig.part(f"fore_{s}", g, cuff)
    g = Geo().blob((0.4, y, HAND_Z - 0.4), (fist, fist - 0.2, fist), p=2.3)
    rig.part(f"hand_{s}", g, hand, finish=glove_finish)


def face(rig, skin_eye="#FAF6EE", pupil="#221C19", brow="#3B2D25", mouth="#4A2424",
         tooth="#F4EEDC", cx=13.0, cz=51.0, eye_dy=(-4.6, 4.4), brow_angry=True,
         brow_joint="head", eye_r=(3.4, 3.2, 4.2)):
    """Big cartoon eyes, a brow bar, and a mouth with an open 'yell' variant (hidden joint).
    cx is the face plane x, cz the eye height."""
    for y in eye_dy:
        g = Geo().blob((cx - 1.4, y, cz), eye_r)
        rig.part("head", g, skin_eye, highlight=False)
        g = Geo().blob((cx + 1.4, y - 0.4, cz - 0.4), (1.3, 1.9, 1.9))
        rig.part("head", g, pupil, outline=0)
    if brow:
        g = Geo()
        a = 2.2 if brow_angry else -0.6
        g.capsule((cx - 1.8, eye_dy[0] - 3.4, cz + 5.2 + a * 0.4), (cx + 0.9, -0.4, cz + 3.8 - a * 0.5), 1.9, 1.7)
        g.capsule((cx + 0.9, -0.4, cz + 3.8 - a * 0.5), (cx - 1.8, eye_dy[1] + 3.2, cz + 5.2 + a * 0.4), 1.7, 1.9)
        rig.part(brow_joint, g, brow, finish="hair")
    mz = cz - 7.2
    rig.joint("mouth", "head", (cx + 0.5, 0, mz))
    g = Geo().blob((cx + 0.5, -0.4, mz), (1.5, 4.0, 1.2), p=2.4)
    rig.part("mouth", g, mouth, outline=0, highlight=False)
    rig.joint("yell", "head", (cx + 0.3, 0, mz - 0.4), hidden=True)
    g = Geo().blob((cx + 0.3, -0.4, mz - 0.6), (2.2, 3.6, 3.0), p=2.2)
    rig.part("yell", g, mouth, outline=0, highlight=False)
    g = Geo().blob((cx + 1.6, -1.8, mz + 1.6), (0.8, 1.2, 0.9), p=3.0).blob((cx + 1.6, 1.0, mz + 1.6), (0.8, 1.2, 0.9), p=3.0)
    rig.part("yell", g, tooth, outline=0, highlight=False)


def yell(pose):
    pose.update({"mouth": {"hide": True}, "yell": {"show": True}})
    return pose


# -- posing --------------------------------------------------------------------------------
def arm(s, a, f, w=None, w_rest=-90.0):
    """Arm on side s: upper arm pointing `a` degrees, forearm `f` degrees (torso space).
    `w` is the held item's direction if its rest (as modelled) points `w_rest` degrees."""
    pose = {f"arm_{s}": {"r": a + 90.0}, f"fore_{s}": {"r": f - a}}
    if w is not None:
        pose[f"hand_{s}"] = {"r": w - w_rest - (f + 90.0)}
    return pose


def ik2(shoulder, target, l1=UPPER, l2=LOWER, elbow_down=True):
    """Two-bone solve in the side plane: (a, f) directions (deg) so the hand joint reaches
    `target` from `shoulder` (both (x, z)). Out-of-reach targets straighten the arm."""
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


def fk_hand(shoulder, a, f):
    """Hand joint position (x, z) for arm directions a, f from `shoulder` (x, z)."""
    ra, rf = math.radians(a), math.radians(f)
    return (shoulder[0] + UPPER * math.cos(ra) + LOWER * math.cos(rf),
            shoulder[1] + UPPER * math.sin(ra) + LOWER * math.sin(rf))


def idle_wave(f):
    """(c, lag) for the 4 idle poses played 0-1-2-3-2-1: c is the breath, lag one pose behind."""
    return [-1.0, -0.45, 0.45, 1.0][f], [-1.0, -1.0, -0.45, 0.45][f]


def idle_body(f, bob=1.2, sq=0.04, lean=1.5):
    c, lag = idle_wave(f)
    return {"hips": {"z": bob * c}, "body": squash(sq * c), "torso": {"r": lean * c},
            "head": {"r": -2.5 * lag, "z": 0.4 * lag}}


def walk_legs(f, stride=30.0, lift=58.0, bob=2.4, lean=-8.0, sway=6.0):
    """Biped walk (8 frames, contact on 0 and 4, passing on 2 and 6)."""
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
