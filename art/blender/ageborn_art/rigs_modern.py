"""Shared rigs and parts for the Modern Age units (DESIGN A5.5): trench raider, rifleman,
bazooka trooper, radio operator (biped), tankette and behemoth tank (vehicle: hull, treads,
turret, barrel) and the gyrocopter (flyer: body, rotor).

Biped: the same proportions as the Stone, Medieval, Gunpowder and Future bipeds (bonker,
footman, fusilier, pulse_trooper): 68 lu tall, head about a third of the height, feet at the
origin, facing +X, near side at -Y. Arms are modelled hanging straight down, so a pose
names each arm segment by the direction it points (degrees in torso space, counter-clockwise
on screen, 0 = forward, -90 = down, 90 = up) and `arm()` converts that to joint rotations.
`ik2()` solves an arm for a target point (both hands on a rifle). The helpers are copied
from the Gunpowder module on purpose, so the two ages can be tuned independently.

Joint names: body > hips > torso > head; thigh_r/l > shin_r/l; arm_r/l > fore_r/l >
hand_r/l. `_r` is the near side (-Y, toward the camera), `_l` the far side.

Vehicle: `tread()` builds a track belt around a stadium path with road wheels on their own
joints and the grousers (the link teeth) in TREAD_PHASES phase-shifted copies on hidden
joints; `tread_pose()` shows the copy for a walk frame and turns the wheels by the same
distance, so the belt scrolls exactly with the ground.

Palette (DESIGN A11, Modern): olive, khaki and gunmetal as large areas; signal red-violet as
an accent (under 10% of a silhouette). Team colour goes on tunics, sleeves, helmet bands,
hull side skirts, turret sides and the gyrocopter's pod.
"""
import math

from .anim import merge, pick, squash
from .geometry import Geo

# -- palette ------------------------------------------------------------------------------
OLIVE = "#62664A"
OLIVE_LT = "#7C8060"
KHAKI = "#B8A67A"
KHAKI_LT = "#CFC29C"
GUNMETAL = "#3A3F45"
STEEL = "#8C949C"
SIGNAL = "#B0306A"
SKIN = "#EBC4A0"
HAIR = "#4A3A2E"
LEATHER = "#6B5444"
BOOT = "#3E342D"
WOOD = "#8A6E55"
RUBBER = "#34373C"
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"
GLASS = "#BFD8E0"
SMOKE = "#E6E3DC"
SMOKE_DK = "#9A968E"
FLASH = "#FFF1C8"
FLASH_CORE = "#FFFFFF"
FIRE = "#FFE9C4"   # desaturated: effect flashes follow the A11 colour rule

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


def legs(rig, trousers=OLIVE, boot=BOOT, puttee=KHAKI, thigh_r=4.8, hip_z=HIP_Z):
    """Baggy trousers, wrapped puttees (banded) and chunky ankle boots."""
    for s in ("r", "l"):
        y = LEG_Y * SIDE_Y[s]
        g = Geo().capsule((0, y, hip_z), (0.5, y, KNEE_Z), thigh_r, thigh_r - 0.3)
        rig.part(f"thigh_{s}", g, trousers)
        g = Geo().capsule((0.5, y, KNEE_Z), (1.0, y, 4.2), thigh_r - 0.6, 3.9)
        rig.part(f"shin_{s}", g, puttee)
        g = Geo()
        for z in (5.6, 8.0):   # puttee wraps, slanted
            g.blob((0.8, y, z), (4.5, 4.4, 0.8), p=2.4, rot=(0, 12, 0))
        rig.part(f"shin_{s}", g, KHAKI_LT, outline=0.5)
        g = Geo().blob((3.6, y, 2.7), (7.0, 4.8, 2.9), p=2.9, taper=(1.02, 0.84))
        g.blob((0.9, y, 4.8), (4.5, 4.4, 2.4), p=2.6)
        rig.part(f"shin_{s}", g, boot, finish="gloss")


def arm_parts(rig, s, sleeve=None, hand=SKIN, team_sleeve=True, r0=4.4, r1=3.9, fist=4.3,
              cuff=None, glove_finish="matte", arm_y=None, rolled=False):
    """Upper arm, forearm (optionally a rolled-up sleeve showing the skin) and a fist."""
    y = (arm_y or ARM_Y)[s]
    g = Geo().capsule((0, y, SHOULDER_Z), (0, y, ELBOW_Z), r0, r1 + 0.2)
    rig.part(f"arm_{s}", g, sleeve, team=team_sleeve)
    if rolled:
        g = Geo().capsule((0, y, ELBOW_Z), (0, y, HAND_Z + 2.0), r1, r1 - 0.3)
        rig.part(f"fore_{s}", g, SKIN)
        g = Geo().blob((0, y, ELBOW_Z + 0.4), (r1 + 1.0, r1 + 1.0, 2.2), p=2.6)
        rig.part(f"fore_{s}", g, sleeve, team=team_sleeve)
    else:
        g = Geo().capsule((0, y, ELBOW_Z), (0, y, HAND_Z + 2.0), r1 + 0.2, r1)
        rig.part(f"fore_{s}", g, sleeve, team=team_sleeve)
    if cuff:
        g = Geo().blob((0, y, HAND_Z + 3.2), (r1 + 1.0, r1 + 1.0, 1.8), p=2.6)
        rig.part(f"fore_{s}", g, cuff)
    g = Geo().blob((0.4, y, HAND_Z - 0.4), (fist, fist - 0.2, fist), p=2.3)
    rig.part(f"hand_{s}", g, hand, finish=glove_finish)


def head_ball(rig, skin=SKIN, center=(2, 0, 48.5), r=(11.8, 11.2, 11.6), nose=(13.6, -0.6, 47.2),
              nose_r=(3.4, 3.0, 3.2), jaw=True, chin=None):
    g = Geo().blob(center, r, p=2.3)
    if jaw:
        g.blob((center[0] + 4, 0, center[2] - 5.5), (8.6, 9.4, 6.2), p=2.2)
    g.blob(nose, nose_r, p=2.0)
    rig.part("head", g, skin)
    if chin:   # stubble shadow on the jaw
        g = Geo().blob((center[0] + 5.0, 0, center[2] - 7.4), (8.2, 9.6, 4.2), p=2.2)
        g.clip((center[0] + 1.0, 0, 0), (-1, 0, 0))
        rig.part("head", g, chin, outline=0.5)


def face(rig, pupil=PUPIL, brow=HAIR, mouth=MOUTH, tooth=TOOTH, cx=12.4, cz=49.8,
         eye_dy=(-4.6, 4.4), brow_angry=True, eye_r=(3.3, 3.1, 4.0), grin=False):
    """Big cartoon eyes, a brow bar and a mouth with an open 'yell' variant (hidden joint)
    and a squint variant of the eyes (hidden joint `squint`, shown on fire frames)."""
    rig.joint("eyes", "head", (cx, 0, cz))
    for y in eye_dy:
        g = Geo().blob((cx - 1.4, y, cz), eye_r)
        rig.part("eyes", g, EYE, highlight=False)
        g = Geo().blob((cx + 1.4, y - 0.4, cz - 0.4), (1.3, 1.9, 1.9))
        rig.part("eyes", g, pupil, outline=0)
    rig.joint("squint", "head", (cx, 0, cz), hidden=True)
    g = Geo()
    for y in eye_dy:
        g.capsule((cx + 1.2, y - 2.6, cz - 0.2), (cx + 1.2, y + 2.6, cz + 0.4), 0.9)
    rig.part("squint", g, pupil, outline=0)
    if brow:
        g = Geo()
        a = 2.2 if brow_angry else -0.6
        g.capsule((cx - 1.8, eye_dy[0] - 3.4, cz + 5.2 + a * 0.4), (cx + 0.9, -0.4, cz + 3.8 - a * 0.5), 1.9, 1.7)
        g.capsule((cx + 0.9, -0.4, cz + 3.8 - a * 0.5), (cx - 1.8, eye_dy[1] + 3.2, cz + 5.2 + a * 0.4), 1.7, 1.9)
        rig.part("head", g, brow, finish="hair")
    mz = cz - 7.2
    rig.joint("mouth", "head", (cx + 0.5, 0, mz))
    if grin:
        g = Geo().blob((cx + 0.6, -0.8, mz + 0.2), (1.6, 4.4, 1.6), p=2.4, rot=(-8, 0, 0))
        rig.part("mouth", g, mouth, outline=0, highlight=False)
        g = Geo().blob((cx + 1.7, -0.8, mz + 0.9), (0.7, 3.6, 0.7), p=3.0)
        rig.part("mouth", g, tooth, outline=0, highlight=False)
    else:
        g = Geo().blob((cx + 0.5, -0.4, mz), (1.5, 4.0, 1.2), p=2.4)
        rig.part("mouth", g, mouth, outline=0, highlight=False)
    rig.joint("yell", "head", (cx + 0.3, 0, mz - 0.4), hidden=True)
    g = Geo().blob((cx + 0.3, -0.4, mz - 0.6), (2.2, 3.6, 3.0), p=2.2)
    rig.part("yell", g, mouth, outline=0, highlight=False)
    g = Geo().blob((cx + 1.6, -1.8, mz + 1.6), (0.8, 1.2, 0.9), p=3.0).blob((cx + 1.6, 1.0, mz + 1.6), (0.8, 1.2, 0.9), p=3.0)
    rig.part("yell", g, tooth, outline=0, highlight=False)
    # KO eyes (X) for the first death frames
    rig.joint("eyes_x", "head", (cx, 0, cz), hidden=True)
    g = Geo()
    for y in eye_dy:
        g.capsule((cx + 0.4, y - 2.0, cz + 2.2), (cx + 0.4, y + 2.0, cz - 2.2), 0.8)
        g.capsule((cx + 0.4, y - 2.0, cz - 2.2), (cx + 0.4, y + 2.0, cz + 2.2), 0.8)
    rig.part("eyes_x", g, pupil, outline=0)


def ko(pose):
    pose.update({"eyes": {"hide": True}, "eyes_x": {"show": True}})
    return pose


def yell(pose):
    pose.update({"mouth": {"hide": True}, "yell": {"show": True}})
    return pose


def squint(pose):
    pose.update({"eyes": {"hide": True}, "squint": {"show": True}})
    return pose


# -- headgear -----------------------------------------------------------------------------
def helmet_brodie(rig, c=(1.5, 0, 57.0), color=OLIVE, band=True, k=1.0, joint="head"):
    """Brodie 'soup bowl': a low dome on a wide flat brim, tilted a little forward. The wide
    flat disc is the Modern infantry's signature silhouette. A team band wraps the dome."""
    x, y, z = c
    g = Geo().blob((x, y, z + 0.6 * k), (12.6 * k, 12.2 * k, 9.4 * k), p=2.2)
    g.clip((x, y, z - 0.6 * k), (0, 0, -1))
    g.blob((x + 0.8 * k, y, z - 0.5 * k), (17.2 * k, 16.0 * k, 1.7 * k), p=2.4)   # brim
    rig.part(joint, g, color, finish="gloss")
    if band:
        g = Geo().lathe([(12.75 * k, 0), (12.6 * k, 2.2 * k), (11.9 * k, 4.2 * k)],
                        (x, y, z + 0.4 * k), (x, y, z + 5.0 * k), segs=24)
        rig.part(joint, g, team=True, outline=0.6)


def helmet_round(rig, c=(1.5, 0, 56.0), color=OLIVE, band=True, net=True, strap=True, k=1.0,
                 joint="head"):
    """Round steel helmet: a deep dome with a small flared rim, net lines and a chin strap.
    A team band runs round the dome (the team cue on a helmet-heavy silhouette)."""
    x, y, z = c
    g = Geo().blob((x, y, z + 1.5 * k), (12.6 * k, 12.2 * k, 10.4 * k), p=2.3)
    g.clip((x, y, z - 3.0 * k), (0, 0, -1))
    g.lathe([(12.9 * k, 0), (14.0 * k, -0.6 * k), (14.2 * k, -1.8 * k), (12.4 * k, -2.0 * k)],
            (x, y, z - 1.4 * k), (x, y, z - 3.4 * k), segs=24)
    rig.part(joint, g, color, finish="gloss")
    if band:
        g = Geo().lathe([(12.9 * k, 0), (13.0 * k, 2.2 * k), (12.6 * k, 4.0 * k)],
                        (x, y, z - 0.6 * k), (x, y, z + 3.8 * k), segs=24)
        rig.part(joint, g, team=True, outline=0.6)
    if net:
        g = Geo()
        for a in (-50, -20, 10, 40):
            g.capsule((x + (a / 50) * 8 * k, y - 11.2 * k, z + 4.4 * k),
                      (x + (a / 50) * 4 * k, y - 5.0 * k, z + 11.0 * k), 0.55 * k, segs=6, rings=2)
        rig.part(joint, g, KHAKI, outline=0)
    if strap:
        g = Geo().capsule((x + 3.0 * k, y - 11.2 * k, z - 2.4 * k), (x + 9.0 * k, y - 8.0 * k, z - 13.0 * k), 0.8 * k)
        rig.part(joint, g, LEATHER, outline=0.5)


def field_cap(rig, c=(1.0, 0, 57.5), color=OLIVE, team_band=True, joint="head"):
    """Soft side cap (for the radio operator under the headphones)."""
    x, y, z = c
    g = Geo().blob((x, y, z), (12.4, 11.8, 6.4), p=2.2)
    g.clip((x, y, z - 1.5), (0, 0, -1))
    g.blob((x + 11.0, y, z - 0.8), (6.0, 9.0, 1.2), p=2.6, rot=(0, -8, 0))   # visor
    rig.part(joint, g, color)
    if team_band:
        g = Geo().lathe([(12.5, 0), (12.6, 1.8), (12.2, 3.2)], (x, y, z - 1.2), (x, y, z + 2.0), segs=22)
        rig.part(joint, g, team=True, outline=0.6)


# -- torso gear ---------------------------------------------------------------------------
def tunic(rig, collar=OLIVE, belt=KHAKI, buckle=STEEL, pockets=True, skirt=True):
    """Team tunic with an olive collar, breast pockets, a webbing belt with pouches."""
    g = Geo().blob((0, 0, 28.0), (10.8, 9.8, 11.8), p=2.4, taper=(1.08, 0.94))
    g.blob((0, 0, 18.0), (10.4, 9.6, 4.6), p=2.6)
    rig.part("torso", g, team=True)
    g = Geo().blob((1.2, 0, 37.4), (7.4, 7.8, 2.6), p=2.4)
    rig.part("torso", g, collar)
    if pockets:
        g = Geo().blob((8.6, -4.6, 31.0), (2.6, 3.6, 3.2), p=3.2).blob((8.9, 3.6, 31.0), (2.2, 3.2, 3.0), p=3.2)
        rig.part("torso", g, team=True, outline=0.5)
    g = Geo().blob((0.2, 0, 20.6), (11.4, 10.6, 2.4), p=3.2)
    rig.part("torso", g, belt)
    g = Geo().blob((7.6, -8.4, 19.0), (3.2, 2.4, 3.4), p=3.2).blob((-3.0, -10.2, 19.2), (3.4, 2.2, 3.4), p=3.2)
    rig.part("torso", g, belt, outline=0.7)
    g = Geo().blob((11.4, -1.0, 20.6), (1.2, 2.6, 2.0), p=3.2)
    rig.part("torso", g, buckle, finish="metal", outline=0.5)
    if skirt:
        g = Geo().blob((0.5, 0, 15.8), (11.4, 10.4, 5.8), p=2.6, taper=(1.1, 1.0))
        g.clip((0, 0, 11.0), (0, 0, -1))
        rig.part("hips", g, team=True)


def shoulders(rig, arm_y=None):
    for s in ("r", "l"):
        y = (arm_y or ARM_Y)[s]
        g = Geo().blob((0, y - 0.1 * SIDE_Y[s], 37.0), (5.6, 5.0, 4.4), p=2.4)
        rig.part(f"arm_{s}", g, team=True)


# -- weapons and effects --------------------------------------------------------------------
def rifle(rig, joint, grip, length=46.0, stock=WOOD, barrel=GUNMETAL, bayonet=0.0, sling=True,
          k=1.0):
    """A bolt-action rifle along +X from the grip (the near hand holds the wrist of the
    stock), with a wooden stock and fore-end, a gunmetal barrel and bolt, and a sling.
    Returns the muzzle point (character space)."""
    gx, gy, gz = grip
    g = Geo()
    g.blob((gx - 8.0 * k, gy, gz - 2.2 * k), (8.0 * k, 2.2 * k, 3.6 * k), p=2.8, rot=(0, 16, 0),
           taper=(1.0, 0.75))                                                     # butt
    g.capsule((gx - 1.0, gy, gz), (gx + length * 0.70, gy, gz + 0.6), 2.0 * k, 1.6 * k)  # fore-end
    rig.part(joint, g, stock)
    g = Geo().capsule((gx + 2.0, gy, gz + 1.8 * k), (gx + length, gy, gz + 1.8 * k), 1.3 * k, 1.15 * k)
    g.blob((gx + 3.5, gy, gz + 2.6 * k), (5.0 * k, 1.8 * k, 1.8 * k), p=3.0)       # receiver
    g.capsule((gx + 2.5, gy - 1.6 * k, gz + 3.4 * k), (gx + 2.0, gy - 4.2 * k, gz + 2.4 * k), 0.8 * k)  # bolt
    g.sphere((gx + 2.0, gy - 4.4 * k, gz + 2.3 * k), 1.3 * k, cuts=3)
    g.blob((gx + length - 1.2, gy, gz + 3.4 * k), (0.9, 0.8, 1.2), p=2.4)          # front sight
    rig.part(joint, g, barrel, finish="metal", outline=0.9)
    if sling:
        g = Geo()
        pts = [(gx - 10.0 * k, gz - 2.5 * k), (gx + 4.0, gz - 6.0 * k), (gx + 18.0, gz - 5.2 * k),
               (gx + length * 0.55, gz - 1.0)]
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            g.capsule((ax, gy - 1.6, az), (bx, gy - 1.6, bz), 0.7 * k, segs=8, rings=2)
        rig.part(joint, g, LEATHER, outline=0.5)
    if bayonet > 0:
        g = Geo().lathe([(0.9, 0), (0.8, bayonet * 0.4), (0.5, bayonet * 0.85), (0, bayonet)],
                        (gx + length - 1.0, gy + 0.6, gz + 0.2), (gx + length + bayonet, gy + 0.6, gz + 0.2),
                        segs=8, squash=(1.0, 0.6))
        rig.part(joint, g, STEEL, finish="metal", outline=0.7)
    return (gx + length + 1.0, gy, gz + 1.8 * k)


def muzzle_flash(rig, joint, muzzle, size=1.0, name="flash", back=False):
    """A hidden flash joint: a yellow-white star-burst along +X (or -X) with a white core."""
    mx, my, mz = muzzle
    k = size
    d = -1.0 if back else 1.0
    rig.joint(name, joint, muzzle, hidden=True)
    g = Geo().blob((mx + d * 7.0 * k, my - 1, mz), (7.6 * k, 2.0 * k, 3.4 * k), p=2.0)
    g.blob((mx + d * 4.2 * k, my - 1, mz + 2.6 * k), (5.2 * k, 1.8 * k, 1.9 * k), p=2.0, rot=(0, -38 * d, 0))
    g.blob((mx + d * 4.2 * k, my - 1, mz - 2.6 * k), (5.2 * k, 1.8 * k, 1.9 * k), p=2.0, rot=(0, 38 * d, 0))
    rig.part(name, g, glow=FIRE, outline=0)
    g = Geo().blob((mx + d * 4.6 * k, my - 2, mz), (4.8 * k, 1.8 * k, 2.1 * k), p=2.0)
    rig.part(name, g, glow=FLASH, outline=0)
    g = Geo().blob((mx + d * 2.8 * k, my - 3, mz), (2.6 * k, 1.4 * k, 1.4 * k), p=2.0)
    rig.part(name, g, glow=FLASH_CORE, outline=0)


def smoke_puff(rig, joint, at, size=1.0, name="smoke", color=SMOKE, spread=1.0):
    """A hidden joint with a cluster of grey-white smoke balls (dust finish)."""
    x, y, z = at
    k = size
    rig.joint(name, joint, at, hidden=True)
    g = Geo()
    for dx, dz, r in ((0, 0, 4.6), (5.2, 1.6, 3.8), (-3.2, 3.8, 3.6), (2.6, 5.4, 3.2),
                      (8.6, -0.6, 2.8), (-5.8, 0.4, 2.6)):
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
    c, s = math.cos(math.radians(deg)), math.sin(math.radians(deg))
    x, z = p[0] - about[0], p[1] - about[1]
    return (about[0] + x * c - z * s, about[1] + x * s + z * c)


def hold2(joint, g0, fore, gx, gz, deg, near_off=(-0.4, 0.4), far_off=(-1.0, -1.0)):
    """A two-handed long gun on `joint` (modelled with its grip at g0, pointing +X): grip at
    (gx, gz) in torso space pointing `deg`; the near hand holds the grip, the far hand the
    fore-end `fore` lu further along. Returns the pose."""
    pose = {joint: {"x": gx - g0[0], "z": gz - g0[2], "r": deg}}
    a, f = ik2(SH, (gx + near_off[0], gz + near_off[1]))
    pose.update(arm("r", a, f))
    fx_, fz = gx + fore * math.cos(math.radians(deg)), gz + fore * math.sin(math.radians(deg))
    a, f = ik2(SH, (fx_ + far_off[0], fz + far_off[1]))
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


# -- vehicle: treads ---------------------------------------------------------------------------
TREAD_PHASES = 4


def _stadium(x0, x1, zc, r, n_arc=10):
    """Points around a stadium (two half circles of radius r centred at (x0, zc), (x1, zc)),
    clockwise on screen starting at the top-left: top run forward, front arc, bottom run
    backward, back arc. Returns [(x, z, s)] with s the arc length."""
    pts = [(x0, zc + r), (x1, zc + r)]
    for i in range(1, n_arc):
        a = math.pi / 2 - math.pi * i / n_arc
        pts.append((x1 + r * math.cos(a), zc + r * math.sin(a)))
    pts += [(x1, zc - r), (x0, zc - r)]
    for i in range(1, n_arc):
        a = -math.pi / 2 - math.pi * i / n_arc
        pts.append((x0 + r * math.cos(a), zc + r * math.sin(a)))
    out, s = [], 0.0
    for i, p in enumerate(pts):
        if i:
            s += math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1])
        out.append((p[0], p[1], s))
    total = s + math.hypot(pts[0][0] - pts[-1][0], pts[0][1] - pts[-1][1])
    return out, total


def _along(path, total, s):
    """Point and tangent angle at arc length s on a closed path from _stadium."""
    s %= total
    n = len(path)
    for i in range(n):
        x0, z0, s0 = path[i]
        x1, z1, _ = path[(i + 1) % n]
        s1 = path[i + 1][2] if i + 1 < n else total
        if s <= s1:
            u = (s - s0) / max(1e-6, s1 - s0)
            return (x0 + (x1 - x0) * u, z0 + (z1 - z0) * u), math.atan2(z1 - z0, x1 - x0)
    return (path[0][0], path[0][1]), 0.0


def tread(rig, prefix, parent, x0, x1, r, y, width, pitch, wheels, wheel_r, color=RUBBER,
          tooth=STEEL, hub=OLIVE_LT, hub_team=False, n_arc=12, thick=2.6, sprocket=True):
    """A track: a rubber belt around a stadium path (end radius r, centred at z = r, from x0 to
    x1 at depth y), road wheels (their x in `wheels`, radius wheel_r) and grousers every `pitch`
    lu in TREAD_PHASES copies, each shifted by pitch / TREAD_PHASES along the belt.
    Joints: `<prefix>_ph<k>` (hidden copies), `<prefix>_w<i>` (wheels, spin with r)."""
    path, total = _stadium(x0, x1, r, r - thick * 0.5, n_arc)
    g = Geo()
    for i in range(len(path)):
        a = path[i]
        b = path[(i + 1) % len(path)]
        g.capsule((a[0], y, a[1]), (b[0], y, b[1]), thick, segs=10, rings=2)
    # side plate that fills the belt (the inner face of the track)
    rig.part(parent, g, color, finish="gloss")
    g = Geo().blob(((x0 + x1) / 2, y + width * 0.25, r), ((x1 - x0) / 2 + r * 0.6, width * 0.35, r * 0.8), p=3.2)
    rig.part(parent, g, RUBBER)
    names = []
    for i, wx in enumerate(wheels):
        name = f"{prefix}_w{i}"
        big = sprocket and i in (0, len(wheels) - 1)
        wr = wheel_r * (1.0 if not big else (r - thick) / wheel_r)
        wz = r if big else wheel_r + thick * 0.9
        rig.joint(name, parent, (wx, y, wz))
        g = Geo().lathe([(0, -width * 0.30), (wr, -width * 0.30), (wr, width * 0.2), (0, width * 0.2)],
                        (wx, y - width * 0.1, wz), (wx, y - width * 0.1 - 1, wz), segs=20)
        rig.part(name, g, GUNMETAL, finish="metal")
        g = Geo().lathe([(0, -0.8), (wr * 0.62, -0.8), (wr * 0.55, 0.9), (0, 1.2)],
                        (wx, y - width * 0.42, wz), (wx, y - width * 0.42 - 1, wz), segs=16)
        rig.part(name, g, hub, team=hub_team, finish="gloss", outline=0.6)
        g = Geo()
        nb = 6 if big else 4
        for k in range(nb):   # bolts (or sprocket teeth) so the spin reads
            a = 2 * math.pi * k / nb
            rr = wr * (0.82 if big else 0.36)
            g.sphere((wx + rr * math.cos(a), y - width * 0.46 - (0.4 if big else 1.2), wz + rr * math.sin(a)),
                     (1.3 if big else 0.9) * max(1.0, wr / 6.0), cuts=2)
        rig.part(name, g, STEEL if big else GUNMETAL, finish="metal", outline=0)
        names.append((name, wr))
    for k in range(TREAD_PHASES):
        name = f"{prefix}_ph{k}"
        rig.joint(name, parent, (0, y, r), hidden=True)
        g = Geo()
        s = pitch * k / TREAD_PHASES
        while s < total - 1e-6:
            (px, pz), ang = _along(path, total, s)
            nx, nz = math.sin(ang), -math.cos(ang)   # outward normal (clockwise path)
            cx, cz = px + nx * thick * 0.9, pz + nz * thick * 0.9
            g.blob((cx, y - 0.2, cz), (pitch * 0.26, width * 0.5 + 0.4, 1.3), p=3.0,
                   rot=(0, -math.degrees(ang), 0))
            s += pitch
        rig.part(name, g, tooth, finish="metal", outline=0.5)
    return names, total


def tread_pose(prefix, names, step, dist_per_step, pitch):
    """Pose for walk step `step` when the vehicle moves dist_per_step lu per step: the belt's
    grousers advance (phase copy) and the wheels roll the same distance (clockwise)."""
    d = dist_per_step * step
    k = int(round((d % pitch) / pitch * TREAD_PHASES)) % TREAD_PHASES
    pose = {f"{prefix}_ph{k}": {"show": True}}
    for name, wr in names:
        pose[name] = {"r": -math.degrees(d / wr)}
    return pose


def tread_static(prefix, names):
    return tread_pose(prefix, names, 0, 0.0, 1.0)


def pennant(rig, parent, pole_base, height, length=16.0, name="pennant", pole=GUNMETAL,
            tip=SIGNAL, w=9.0, gain=1.2, max_deg=18):
    """A radio antenna with a team swallowtail pennant at the top (the heavies' team cue,
    DESIGN A11), swinging on follow-through."""
    x, y, z = pole_base
    rig.joint(f"{name}_mast", parent, pole_base)
    g = Geo().capsule((x, y, z), (x - 2.5, y, z + height), 1.0, 0.7)
    rig.part(f"{name}_mast", g, pole, finish="metal", outline=0.6)
    g = Geo().sphere((x - 2.5, y, z + height + 0.6), 1.6, cuts=3)
    rig.part(f"{name}_mast", g, tip, outline=0.6)
    top = (x - 2.4, y, z + height - 1.5)
    rig.secondary(name, f"{name}_mast", top, (top[0] - length, y, top[2] - 4.0), max_deg=max_deg,
                  gain=gain, rot_gain=0.6)
    pts = [(0.0, 0.0), (-length, -1.0), (-length * 0.72, -w * 0.5), (-length, -w * 0.9), (0.0, -w)]
    g = Geo().slab([(top[0] + px_, top[2] + pz_) for px_, pz_ in pts], y, 1.2)
    rig.part(name, g, team=True, outline=0.8)
