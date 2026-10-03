"""Stone Age biped kit for the content-expansion units (CONTENT_PLAN 5.1, built to ANIM_SPEC from the
start). It packages what the shipped Stone bipeds (Bonker, Pebbler, Drum Shaman) do by hand:

  body()      `rigs_stone.CaveBody` with the walk-v3 legs (thighs at 19.5 lu, foot joints, the far leg
              20% darker, sole trackers) and the upper body lifted 2 lu
  head()      a round cartoon head with the face kit: eyes, pupils, a brow joint, a default mouth decal,
              eye marks (lids, squeeze, X, spiral) and mouths (grit, yell, O, tongue)
  pelt()      a team pelt tunic and a ragged team skirt on a secondary joint (hem 9+ lu above the soles)
  wraps()     team shin and wrist wraps (the 18% team rule while the legs move)
  legs() / jog() / brisk()   the IK legs and the G1 bounce jog or the G2 brisk walk at ground speed
  idle(), hit(), die_d1(), die_d3()   the shared clip poses (moves.py)

Units keep their own weapons, props, poses and attacks. Characters face +X; `_r` is the near side.
"""
import math

from . import face as F
from . import gait as G
from . import moves as M
from .anim import merge
from .colors import scale as cscale
from .geometry import Geo
from .rigs_stone import CaveBody

THIGH_Z, KNEE_Z, ANKLE_Z = 19.5, 11.5, 4.0
LIFT = 2.0
EYE = "#FAF6EE"
PUPIL = "#221C19"
MOUTH = "#4A2424"
TOOTH = "#F4EEDC"
BONE = "#EDE3C8"


def body(rig, skin, foot, *, stocky=1.0, hip_y=5.6, shoulder_y=11.4, torso_r=(10.2, 9.0, 10.2), foot_len=4.6,
         fist=4.2, waist_z=17.0, shoulder_z=35.0, neck_z=37.0):
    """The cave-folk body at walk-v3 proportions. `stocky` thickens limbs (1.0 = Pebbler, 1.15 = Bonker)."""
    k = stocky
    b = CaveBody(rig, skin, foot, hip_z=16.0, knee_z=KNEE_Z, ankle_z=ANKLE_Z, waist_z=waist_z,
                 shoulder_z=shoulder_z, neck_z=neck_z, hip_y=hip_y, shoulder_y=shoulder_y,
                 elbow=(1.5, 28.0), wrist=(3.5, 21.5), leg_r=(3.8 * k, 3.3 * k, 3.1 * k),
                 arm_r=(4.0 * k, 3.5 * k, 3.4 * k), fist_r=fist, torso=((0, 28.5), torso_r),
                 torso_taper=(1.04, 0.95), foot_len=foot_len, thigh_z=THIGH_Z, foot_joint=True,
                 far_shade=0.8)
    rig.rest_offset["torso"] = (0, 0, LIFT)
    rig.track("_foot", "foot_r", (2.2, -hip_y, 0.0))
    rig.track("_foot_l", "foot_l", (2.2, hip_y, 0.0))
    return b


def head(rig, skin, *, z=47.5, r=(10.4, 10.0, 10.4), jaw=(7.2, 8.2, 5.2), nose=2.7, eye_r=4.0, eye_gap=(-4.6, 3.8),
         brow_col="#3B2D25", extra_geos=(), grin="grit"):
    """A round cartoon head on the `head` joint, centred (2, 0, z), with the full face kit. Returns
    (face, geos) so the unit can add hair, hoods and decals; `extra_geos` are geometry the unit adds
    that the face rays must see (hair, hoods), passed in before the face is built."""
    hd = Geo().blob((2, 0, z), r, p=2.25)
    hd.blob((5.5, 0, z - 5.1), jaw, p=2.2)
    hd.blob((12.8, -0.5, z - 0.9), (nose, nose * 0.92, nose * 0.92), p=2.0)
    eyes = Geo()
    pup = Geo()
    for y in eye_gap:
        eyes.blob((10.6, y, z + 1.1), (eye_r, eye_r * 0.97, eye_r * 1.22))
        pup.blob((13.7, y - 0.4, z + 0.7), (1.5, 2.4, 2.6))
    face = F.Face(rig, "head", [hd, eyes, pup, *extra_geos])
    rig.part("head", hd, skin)
    rig.part("head", eyes, EYE, highlight=False)
    rig.joint("pupils", "head", (13.7, 0, z + 0.7))
    rig.part("pupils", pup, PUPIL, outline=0)
    rig.joint("brow", "head", (11.0, 0, z + 5.9))
    g = Geo().capsule((9.0, -8.0, z + 5.7), (12.8, -3.4, z + 5.3), 1.6, 1.3)
    rig.part("brow", g, brow_col, finish="hair", outline=0.6)
    rig.joint("mouth", "head", (12.2, 0, z - 4.7))
    c = face.hit(12.4, z - 4.9)
    g = Geo()
    if grin == "smile":
        face.decal(g, c, [(-2.2, 0.6), (0.0, -0.6), (2.2, 0.6), (1.4, -1.0), (-1.4, -1.0)], 0.4)
    else:
        face.decal(g, c, [(-2.4, 0.6), (2.2, 1.0), (2.4, -0.4), (-2.2, -0.8)], 0.4)
    rig.part("mouth", g, MOUTH, outline=0, highlight=False)
    g = Geo()
    face.decal(g, c - face.view * 0.25, [(-0.6, 0.9), (0.6, 1.0), (0.6, -0.1), (-0.6, -0.2)], 0.4)
    rig.part("mouth", g, TOOTH, outline=0, highlight=False)
    face.eye_marks([(13.4, z + 1.1)], eye_r, skin)
    face.mouths((12.3, z - 5.1), 5.6)
    return face


def pelt(rig, fur, *, emblem=True, z=26.2, r=(10.9, 9.9, 7.4), skirt_r=(11.2, 10.0, 4.4), strap=True, tufts=True):
    """Team pelt tunic (a one-shoulder strap, fur tufts, a bone hand-print) and a ragged team skirt."""
    p = Geo().blob((0.4, 0, z), r, p=2.5, taper=(1.05, 0.95))
    if strap:
        p.capsule((8.4, -5.2, z + 1.3), (2.5, 8.0, z + 9.8), 2.9, 2.9)
    deco = F.Face(rig, "torso", [p])
    rig.part("torso", p, team=True)
    if emblem:
        g = Geo()
        c = deco.hit(3.5, z - 1.2)
        deco.decal(g, c, F.ellipse(0, -0.6, 2.2, 1.9, 12), 0.4)
        for a, L in ((55, 2.8), (80, 3.2), (105, 3.0), (130, 2.5), (8, 2.4)):
            ra = math.radians(a)
            deco.stroke(g, c, [(math.cos(ra) * 1.5, -0.6 + math.sin(ra) * 1.5),
                               (math.cos(ra) * (1.5 + L), -0.6 + math.sin(ra) * (1.5 + L))], 1.2, 0.4)
        rig.part("torso", g, BONE, highlight=False, outline=0)
    if tufts:
        g = Geo()
        for x, y in ((8.5, -4.5), (3.0, -8.8), (-4.0, -8.8)):
            g.lathe([(2.0, 0), (0, 3.2)], (x, y, z + 5.8), (x - 0.5, y - 0.4, z + 8.8), segs=8)
        rig.part("torso", g, fur, finish="hair")
    rig.secondary("skirt", "hips", (0.5, 0, 22.0), (-1.0, 0, 13.5), max_deg=10, gain=1.0)
    rig.rest_offset["skirt"] = (0, 0, LIFT + 1.5)
    g = Geo().blob((0.6, 0, 21.2), skirt_r, p=2.6, taper=(1.08, 0.98))
    for x, y in ((8.0, -5.5), (2.5, -9.5), (-4.5, -9.0), (9.5, 2.5), (-9.5, -2.5)):
        g.lathe([(3.0, 0), (0, -3.4)], (x, y, 18.2), segs=10)
    rig.part("skirt", g, team=True)
    return deco


def wraps(rig, hip_y=5.6, shoulder_y=11.4, wrists=("r", "l"), wrist_col=None):
    """Team shin wraps below the knee and wrist wraps (or `wrist_col` leather)."""
    for side, y in (("r", -hip_y), ("l", hip_y)):
        g = Geo().capsule((0.6, y, 11.2), (0.95, y, 5.6), 3.8, 3.6)
        rig.part(f"shin_{side}", g, team=True, outline=0.7)
    for side in wrists:
        y = -shoulder_y - 0.5 if side == "r" else shoulder_y + 0.5
        g = Geo().capsule((2.6, y, 23.8), (3.2, y, 21.0), 4.0, 4.0)
        if wrist_col:
            rig.part(f"fore_{side}", g, wrist_col, outline=0.8)
        else:
            rig.part(f"fore_{side}", g, team=True, outline=0.8)


def legs(hip_y=5.6, toe=4.9, heel=-1.4):
    return {s: G.Leg(f"thigh_{s}", f"shin_{s}", (1.0, y, ANKLE_Z), foot=f"foot_{s}",
                     toe=(toe, y, 0.4), heel=(heel, y, 0.4)) for s, y in (("r", -hip_y), ("l", hip_y))}


def jog(lg, speed, cycle=616, stance=0.38, x_mid=1.6, lift=6.5):
    g = G.Gait(8, cycle, speed, G.biped_feet(lg["l"], lg["r"], x_mid=x_mid), stance,
               lift=lift, kick=3.0, reach=0.0, toe_off=24.0, early_lift=1.6, drag=0.3, lift_peak=0.38)
    for k, (leg, ph, x, gz) in list(g.feet.items()):
        g.feet[k] = (leg, ph - 0.03, x, gz)
    return g


def brisk(lg, speed, cycle=560, stance=0.44, x_mid=1.4):
    g = G.Gait(8, cycle, speed, G.biped_feet(lg["l"], lg["r"], x_mid=x_mid), stance,
               lift=6.0, kick=2.0, reach=0.0, toe_off=20.0, early_lift=1.4, drag=0.3, lift_peak=0.38)
    for k, (leg, ph, x, gz) in list(g.feet.items()):
        g.feet[k] = (leg, ph - 0.03, x, gz)
    return g


class Arm:
    """walk_v3 arm adapter around a rigs_stone Chain."""

    def __init__(self, chain):
        self.chain = chain

    def pose(self, a, b):
        return self.chain.pose(a, b)


def hit(k, stance, extra=None):
    def recoil(a):
        out = {"head": {"r": 16 * a}, "torso": {"r": 12 * a},
               "thigh_r": {"r": 22 * max(a, 0)}, "shin_r": {"r": -26 * max(a, 0)},
               "arm_r": {"r": 14 * a}, "arm_l": {"r": 36 * a}, "fore_l": {"r": 20 * a},
               "brow": {"z": 1.4 * max(a, 0)}}
        return merge(out, extra(a) if extra else {})
    return M.hit_light(k, stance, recoil, face_hurt=F.expr("squeeze", "grit"))


def die_d1(k, stance, height, extra=None, center_z=27.0):
    flail = [0.3, 1.0, 1.0, 0.8, 0.2, 0.5, 0.1, 0.0, 0.0, 0.0][k]
    pose = merge(stance, M.die_d1(k, center_z=center_z, lie_z=10.0, height=height), {
        "torso": {"r": 10 * flail}, "head": {"r": 14 * flail - 6},
        "arm_r": {"r": 80 * flail + 30}, "arm_l": {"r": 110 * flail + 30}, "fore_l": {"r": 40 * flail},
        "thigh_r": {"r": 40 * flail + 20}, "shin_r": {"r": -30 * flail},
        "thigh_l": {"r": -20 * flail + 10}, "shin_l": {"r": -20 * flail},
    }, extra(k, flail) if extra else {})
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"), {"brow": {"z": 1.8}})
    else:
        pose = merge(pose, F.expr("x", "tongue"))
    return pose


def die_d3(k, stance, height, extra=None, center_z=26.0):
    """Dizzy spin, then a hard sit (hips about -12, thighs forward 80, torso back, arms wide)."""
    sit = min(1.0, max(0.0, (k - 3) / 2))
    pose = merge(stance, M.die_d3(k, center_z=center_z, height=height), {
        "hips": {"z": -12.0 * sit}, "torso": {"r": 28 * sit}, "head": {"r": -10 * sit + 8 * math.sin(k)},
        "thigh_r": {"r": 82 * sit}, "shin_r": {"r": -20 * sit}, "thigh_l": {"r": 80 * sit}, "shin_l": {"r": -16 * sit},
        "arm_r": {"r": 60 * sit + 20 * (1 - sit)}, "arm_l": {"r": 70 * sit + 30 * (1 - sit)},
    }, extra(k, sit) if extra else {})
    if k == 0:
        pose = merge(pose, F.expr("squeeze", "yell"))
    elif k < 4:
        pose = merge(pose, F.expr("o"))
    else:
        pose = merge(pose, F.expr("spiral", "tongue"))
    return pose


def walk(rig, f, carry, g, lg, *, arms=None, lean=-11.0, extra=None, report=None, robed=False):
    if robed:
        return M.walk_v3(rig, f, carry, g, legs=lg, bob=M.BRISK_BOB, sq=M.BRISK_SQ, lean=-6.0, twist=5.0,
                         nod=3.0, arms=arms, arm=30.0, elbow=(40.0, 70.0), extra=extra, report=report)
    return M.walk_v3(rig, f, carry, g, legs=lg, lean=lean, twist=7.0, nod=3.0, arms=arms, arm=35.0,
                     elbow=(40.0, 75.0), extra=extra, report=report)


def strip(pose, *joints):
    """`pose` without the channels of `joints` (anim.merge adds channels, so a clip that re-poses an arm on
    top of a stance must drop the stance's arm first)."""
    return {j: ch for j, ch in pose.items() if j not in joints}


def darker(col, k=0.8):
    return cscale(col, k)
