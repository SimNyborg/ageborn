"""Shared rigs and parts for the Gunpowder Age units (DESIGN A5.4): corsair, fusilier,
grenadier, field surgeon, the cuirassier's rider and horse, the bronze cannon's crew and
the balloon admiral.

Biped: matches the Stone, Medieval and Future bipeds (bonker, footman, pulse_trooper):
68 lu tall, head about a third of the height, feet at the origin, facing +X, near side at
-Y. Arms are modelled hanging straight down, so a pose names each arm segment by the
direction it points (degrees in torso space, counter-clockwise on screen, 0 = forward,
-90 = down, 90 = up) and `arm()` converts that to joint rotations. `ik2()` solves an arm
for a target point (both hands on a musket).

Joint names: body > hips > torso > head; thigh_r/l > shin_r/l; arm_r/l > fore_r/l >
hand_r/l. `_r` is the near side (-Y, toward the camera), `_l` the far side.

Palette (DESIGN A11, Gunpowder): bottle green, cream and dark wood as large areas, brass as
an accent (under 10% of a silhouette). Team colour goes on coats, sashes, cap fronts,
saddle cloths, gun carriages and the balloon's envelope.
"""
import math

from .anim import merge, squash
from .geometry import Geo

# -- palette ------------------------------------------------------------------------------
GREEN = "#2E5E4E"
CREAM = "#EFE6CF"
WOOD = "#4A3B2E"
BRASS = "#C9A227"
SKIN = "#EBC4A0"
HAIR = "#3B2D25"
IRON = "#3C3F45"
STEEL = "#A9B1BB"
BLACK = "#2A2A2E"
LEATHER = "#6E5646"
TAN = "#B89E7E"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"
SMOKE = "#E9E6DE"
FLASH = "#FFF4DC"
FLASH_CORE = "#FFFFFF"
FIRE = "#FFE3B0"

# -- biped layout in lu (character space) ------------------------------------------------
HIP_Z = 15.0
KNEE_Z = 8.5
SHOULDER_Z = 36.0
ELBOW_Z = 28.0
HAND_Z = 21.0
UPPER = SHOULDER_Z - ELBOW_Z
LOWER = ELBOW_Z - HAND_Z
LEG_Y = 6.0
ARM_Y = {"r": -12.5, "l": 12.0}
SIDE_Y = {"r": -1.0, "l": 1.0}


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


def legs(rig, breeches, boot, stocking=None, thigh_r=4.7, hip_z=HIP_Z, tall_boot=False,
         boot_finish="gloss"):
    """Stocky legs: breeches to the knee, stockings (or tall riding boots), buckled shoes."""
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        g = Geo().capsule((0, y, hip_z), (0.5, y, KNEE_Z), thigh_r, thigh_r - 0.5)
        rig.part(f"thigh_{s}", g, breeches)
        g = Geo().capsule((0.5, y, KNEE_Z), (1.0, y, 4.0), thigh_r - 0.7, 3.7)
        rig.part(f"shin_{s}", g, stocking or breeches)
        g = Geo().blob((3.4, y, 2.7), (6.9, 4.6, 2.9), p=2.8, taper=(1.02, 0.82))
        g.blob((0.9, y, 5.2), (4.4, 4.3, 2.6), p=2.6)
        if tall_boot:
            g.capsule((0.6, y, 5.0), (0.5, y, 10.2), 4.5, 4.9)
        rig.part(f"shin_{s}", g, boot, finish=boot_finish)
        if tall_boot:
            g = Geo().blob((0.4, y, 10.6), (5.4, 5.2, 1.7), p=2.6)
            rig.part(f"shin_{s}", g, boot, finish=boot_finish)


def arm_parts(rig, s, sleeve=None, hand=SKIN, team_sleeve=False, r0=4.3, r1=3.8, fist=4.3,
              cuff=None, glove_finish="matte", arm_y=None):
    """Upper arm, forearm (with an optional turned-back cuff) and a fist on one side."""
    y = (arm_y or ARM_Y)[s]
    g = Geo().capsule((0, y, SHOULDER_Z), (0, y, ELBOW_Z), r0, r1 + 0.2)
    rig.part(f"arm_{s}", g, sleeve, team=team_sleeve)
    g = Geo().capsule((0, y, ELBOW_Z), (0, y, HAND_Z + 2.0), r1 + 0.2, r1)
    rig.part(f"fore_{s}", g, sleeve, team=team_sleeve)
    if cuff:
        g = Geo().blob((0, y, HAND_Z + 3.4), (r1 + 1.2, r1 + 1.2, 2.0), p=2.6)
        rig.part(f"fore_{s}", g, cuff)
    g = Geo().blob((0.4, y, HAND_Z - 0.4), (fist, fist - 0.2, fist), p=2.3)
    rig.part(f"hand_{s}", g, hand, finish=glove_finish)


def head_ball(rig, skin=SKIN, center=(2, 0, 49.5), r=(11.8, 11.2, 11.6), nose=(13.8, -0.6, 48.2),
              nose_r=(3.4, 3.0, 3.2), jaw=True):
    g = Geo().blob(center, r, p=2.3)
    if jaw:
        g.blob((center[0] + 4, 0, center[2] - 5.5), (8.6, 9.4, 6.2), p=2.2)
    g.blob(nose, nose_r, p=2.0)
    rig.part("head", g, skin)


def face(rig, pupil=PUPIL, brow=HAIR, mouth=MOUTH, tooth=TOOTH, cx=13.0, cz=51.0,
         eye_dy=(-4.6, 4.4), brow_angry=True, eye_r=(3.4, 3.2, 4.2), patch=False):
    """Big cartoon eyes (the near one can be an eyepatch), a brow bar and a mouth with an
    open 'yell' variant (hidden joint). cx is the face plane x, cz the eye height."""
    for i, y in enumerate(eye_dy):
        if patch and i == 0:
            g = Geo().blob((cx - 0.6, y, cz), (2.6, 3.8, 4.0), p=2.4)
            rig.part("head", g, BLACK, outline=0.8)
            continue
        g = Geo().blob((cx - 1.4, y, cz), eye_r)
        rig.part("head", g, EYE, highlight=False)
        g = Geo().blob((cx + 1.4, y - 0.4, cz - 0.4), (1.3, 1.9, 1.9))
        rig.part("head", g, pupil, outline=0)
    if brow:
        g = Geo()
        a = 2.2 if brow_angry else -0.6
        g.capsule((cx - 1.8, eye_dy[0] - 3.4, cz + 5.2 + a * 0.4), (cx + 0.9, -0.4, cz + 3.8 - a * 0.5), 1.9, 1.7)
        g.capsule((cx + 0.9, -0.4, cz + 3.8 - a * 0.5), (cx - 1.8, eye_dy[1] + 3.2, cz + 5.2 + a * 0.4), 1.7, 1.9)
        rig.part("head", g, brow, finish="hair")
    mz = cz - 7.2
    rig.joint("mouth", "head", (cx + 0.5, 0, mz))
    g = Geo().blob((cx + 0.5, -0.4, mz), (1.5, 4.0, 1.2), p=2.4)
    rig.part("mouth", g, mouth, outline=0, highlight=False)
    rig.joint("yell", "head", (cx + 0.3, 0, mz - 0.4), hidden=True)
    g = Geo().blob((cx + 0.3, -0.4, mz - 0.6), (2.2, 3.6, 3.0), p=2.2)
    rig.part("yell", g, mouth, outline=0, highlight=False)
    g = Geo().blob((cx + 1.6, -1.8, mz + 1.6), (0.8, 1.2, 0.9), p=3.0).blob((cx + 1.6, 1.0, mz + 1.6), (0.8, 1.2, 0.9), p=3.0)
    rig.part("yell", g, tooth, outline=0, highlight=False)


def moustache(rig, color, cx=13.2, z=44.6, curl=True):
    g = Geo().blob((cx, -3.4, z), (2.8, 3.8, 1.8), p=2.2, rot=(18, 0, 0))
    g.blob((cx, 2.4, z), (2.8, 3.8, 1.8), p=2.2, rot=(-18, 0, 0))
    if curl:
        g.capsule((cx - 0.4, -6.6, z - 0.4), (cx - 1.2, -8.4, z + 1.8), 1.3, 0.9)
    rig.part("head", g, color, finish="hair")


def tricorn(rig, joint="head", c=(1.5, 0, 58.5), color=BLACK, trim=CREAM, cockade=None,
            team_cockade=False, scale=1.0):
    """Tricorne: a low crown and a brim turned up on three sides (points forward, near-back
    and far-back), with a cream edge braid and a cockade on the near side."""
    x, y, z = c
    k = scale
    g = Geo().blob((x, y, z + 2.2 * k), (8.6 * k, 8.6 * k, 6.8 * k), p=2.4)
    g.clip((x, y, z - 1.0 * k), (0, 0, -1))
    rig.part(joint, g, color, finish="matte")
    # the brim: three upturned wings between three corners (a rounded triangle, rim up)
    corners = [(14.5, 0.0), (-8.5, -12.5), (-8.5, 12.5)]
    g = Geo()
    for i in range(3):
        (ax, ay), (bx, by) = corners[i], corners[(i + 1) % 3]
        mx, my = (ax + bx) / 2 * 0.72, (ay + by) / 2 * 0.72
        d = math.hypot(bx - ax, by - ay)
        ang = math.degrees(math.atan2(by - ay, bx - ax))
        g.blob((x + mx * k, y + my * k, z + 2.0 * k), (d * 0.52 * k, 1.9 * k, 4.2 * k), p=2.4,
               rot=(0, 0, ang))
    for ax, ay in corners:
        g.sphere((x + ax * 0.92 * k, y + ay * 0.92 * k, z + 2.6 * k), 2.2 * k, cuts=3)
    rig.part(joint, g, color, finish="matte")
    g = Geo()
    for i in range(3):
        (ax, ay), (bx, by) = corners[i], corners[(i + 1) % 3]
        g.capsule((x + ax * 0.97 * k, y + ay * 0.97 * k, z + 5.8 * k),
                  (x + bx * 0.97 * k, y + by * 0.97 * k, z + 5.8 * k), 0.75 * k)
    rig.part(joint, g, trim, outline=0.6)
    if cockade or team_cockade:
        g = Geo().blob((x + 4.5 * k, y - 8.4 * k, z + 3.4 * k), (2.8 * k, 1.4 * k, 2.8 * k), p=2.2, rot=(0, 0, -30))
        rig.part(joint, g, cockade, team=team_cockade, outline=0.6)


def bicorne(rig, joint="head", c=(1.0, 0, 58.5), color=BLACK, trim=BRASS, team_cockade=True,
            scale=1.0, fore_aft=True):
    """Bicorne worn fore-and-aft: a tall half-moon that reads as 'officer' in silhouette."""
    x, y, z = c
    k = scale
    g = Geo().blob((x, y, z + 0.5 * k), (8.2 * k, 8.4 * k, 4.4 * k), p=2.3)
    if fore_aft:
        g.blob((x, y, z + 4.0 * k), (16.5 * k, 3.4 * k, 8.4 * k), p=2.5, taper=(1.0, 0.72))
        g.clip((x, y, z - 0.5 * k), (0, 0, -1))
    else:
        g.blob((x, y, z + 4.0 * k), (3.4 * k, 16.5 * k, 8.4 * k), p=2.5, taper=(1.0, 0.72))
        g.clip((x, y, z - 0.5 * k), (0, 0, -1))
    rig.part(joint, g, color, finish="gloss")
    g = Geo()
    if fore_aft:
        n = 10
        pts = []
        for i in range(n + 1):
            t = math.pi * i / n
            pts.append((x + 16.2 * k * math.cos(t), y - 3.4 * k, z - 0.2 * k + 11.6 * k * math.sin(t) * 0.78))
        for a, b in zip(pts, pts[1:]):
            g.capsule(a, b, 0.8 * k)
    rig.part(joint, g, trim, finish="metal", outline=0.5)
    if team_cockade:
        g = Geo().blob((x + 2.0 * k, y - 3.9 * k, z + 4.2 * k), (2.9 * k, 1.2 * k, 2.9 * k), p=2.2)
        rig.part(joint, g, team=True, outline=0.6)


GUNWOOD = "#7A6652"
GUNMETAL = "#6F7780"


def musket(rig, joint, grip, length=52.0, bayonet=0.0, stock=GUNWOOD, barrel=GUNMETAL, brass=BRASS,
           r=1.0):
    """A flintlock musket along +X from the grip (the near hand holds the wrist of the stock).
    Returns the muzzle point (character space)."""
    gx, gy, gz = grip
    g = Geo()
    # butt stock (behind the grip, dropped a little) and the long fore-stock
    g.blob((gx - 7.5 * r, gy, gz - 1.6 * r), (7.5 * r, 2.1 * r, 3.4 * r), p=2.6, rot=(0, 14, 0),
           taper=(1.0, 0.8))
    g.capsule((gx - 1.0, gy, gz), (gx + length * 0.72, gy, gz + 0.8), 1.9 * r, 1.5 * r)
    rig.part(joint, g, stock)
    g = Geo().capsule((gx + 4.0, gy, gz + 1.6 * r), (gx + length, gy, gz + 1.6 * r), 1.25 * r, 1.15 * r)
    rig.part(joint, g, barrel, finish="metal", outline=0.9)
    g = Geo().blob((gx + 3.0, gy - 0.4, gz + 2.0), (2.6, 1.4, 1.8), p=2.6)   # lock
    g.capsule((gx + length * 0.4, gy, gz + 0.2), (gx + length * 0.4, gy, gz + 2.4), 1.9 * r)  # band
    g.capsule((gx + length * 0.66, gy, gz + 0.4), (gx + length * 0.66, gy, gz + 2.4), 1.8 * r)
    g.blob((gx - 14.0 * r, gy, gz - 3.4 * r), (1.2, 2.2, 3.4 * r), p=2.4, rot=(0, 14, 0))  # butt plate
    rig.part(joint, g, brass, finish="metal", outline=0.7)
    if bayonet > 0:
        g = Geo().lathe([(0.9, 0), (0.8, bayonet * 0.4), (0.55, bayonet * 0.85), (0, bayonet)],
                        (gx + length - 1.0, gy + 0.6, gz + 3.4 * r), (gx + length + bayonet, gy + 0.6, gz + 3.4 * r),
                        segs=8, squash=(1.0, 0.6))
        rig.part(joint, g, STEEL, finish="metal", outline=0.7)
    return (gx + length + 1.0, gy, gz + 1.6 * r)


def muzzle_flash(rig, joint, muzzle, size=1.0, name="flash"):
    """A hidden flash joint: a yellow-white star-burst along +X with a white core."""
    mx, my, mz = muzzle
    k = size
    rig.joint(name, joint, muzzle, hidden=True)
    g = Geo().blob((mx + 7.5 * k, my - 1, mz), (8.0 * k, 2.0 * k, 3.6 * k), p=2.0)
    g.blob((mx + 4.5 * k, my - 1, mz + 2.6 * k), (5.4 * k, 1.8 * k, 2.0 * k), p=2.0, rot=(0, -38, 0))
    g.blob((mx + 4.5 * k, my - 1, mz - 2.6 * k), (5.4 * k, 1.8 * k, 2.0 * k), p=2.0, rot=(0, 38, 0))
    rig.part(name, g, glow=FIRE, outline=0)
    g = Geo().blob((mx + 5.0 * k, my - 2, mz), (5.2 * k, 1.8 * k, 2.2 * k), p=2.0)
    rig.part(name, g, glow=FLASH, outline=0)
    g = Geo().blob((mx + 3.2 * k, my - 3, mz), (2.8 * k, 1.4 * k, 1.5 * k), p=2.0)
    rig.part(name, g, glow=FLASH_CORE, outline=0)


def smoke_puff(rig, joint, at, size=1.0, name="smoke", parent_hidden=True):
    """A hidden joint with a cluster of white-grey powder smoke balls (dust finish)."""
    x, y, z = at
    k = size
    rig.joint(name, joint, at, hidden=parent_hidden)
    g = Geo()
    for dx, dz, r in ((0, 0, 4.6), (5.2, 1.6, 3.8), (-3.2, 3.8, 3.6), (2.6, 5.4, 3.2),
                      (8.6, -0.6, 2.8), (-5.8, 0.4, 2.6)):
        g.sphere((x + dx * k, y - 2, z + dz * k), r * k, cuts=4)
    rig.part(name, g, SMOKE, finish="dust", outline=0.8)


def wheel(rig, joint, center, radius, width, rim=IRON, spokes=WOOD, hub=BRASS, team_felloe=True,
          n_spokes=8):
    """A spoked carriage wheel facing the camera (axis along Y): iron tyre, felloe (the wooden
    ring, team-painted), spokes and a brass hub cap. Rotating the joint's `r` spins it."""
    cx, cy, cz = center

    def ring(r_mid, thick, depth, segs=26):
        g = Geo()
        for i in range(segs):
            a0, a1 = 2 * math.pi * i / segs, 2 * math.pi * (i + 1) / segs
            g.capsule((cx + r_mid * math.cos(a0), cy, cz + r_mid * math.sin(a0)),
                      (cx + r_mid * math.cos(a1), cy, cz + r_mid * math.sin(a1)), thick)
        for v in g.bm.verts:   # flatten the tube's depth into a band `depth` wide
            v.co.y = cy + (v.co.y - cy) * depth / (2 * thick)
        return g

    rig.part(joint, ring(radius - 1.0, 1.4, width), rim, finish="metal")
    rig.part(joint, ring(radius - 3.4, 1.6, width * 0.8), spokes if not team_felloe else None,
             team=team_felloe)
    g = Geo()
    for i in range(n_spokes):
        a = 2 * math.pi * i / n_spokes
        g.capsule((cx + 3.0 * math.cos(a), cy, cz + 3.0 * math.sin(a)),
                  (cx + (radius - 4.0) * math.cos(a), cy, cz + (radius - 4.0) * math.sin(a)), 1.25, 1.0)
    rig.part(joint, g, spokes)
    g = Geo().lathe([(0, -1.0), (4.2, -1.0), (4.2, 1.2), (2.8, 3.0), (0, 3.2)],
                    (cx, cy - 1.0, cz), (cx, cy - 6.0, cz), segs=16)
    rig.part(joint, g, hub, finish="metal", outline=0.8)


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


def rot2(p, deg, about=(0.0, 0.0)):
    """Rotate an (x, z) point counter-clockwise by deg about `about`."""
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    x, z = p[0] - about[0], p[1] - about[1]
    return (about[0] + x * c - z * s, about[1] + x * s + z * c)


def idle_wave(f):
    """(c, lag) for the 4 idle poses played 0-1-2-3-2-1: c is the breath, lag one pose behind."""
    return [-1.0, -0.45, 0.45, 1.0][f], [-1.0, -1.0, -0.45, 0.45][f]


def idle_body(f, bob=1.2, sq=0.04, lean=1.5):
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
    from .anim import pick
    return {
        "torso": {"r": pick(f, [16, 8, 4])},
        "head": {"r": pick(f, [14, -6, -6])},
        "thigh_r": {"r": pick(f, [25, 10, 10])}, "thigh_l": {"r": pick(f, [-10, -5, -5])},
    }
