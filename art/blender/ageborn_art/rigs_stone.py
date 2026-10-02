"""Shared rig helpers for the Stone Age units (DESIGN A5.2): a cave-folk biped body and a
quadruped skeleton (boar, sabertooth, mammoth), plus the clip poses they share.

Conventions match units/bonker.py (the style reference): characters face +X, up is +Z,
+Y is away from the camera; `_r` joints are the near side (y < 0), `_l` the far side.
Limb chains are posed by absolute side-plane directions (degrees, counter-clockwise on
screen, 0 = forward) and converted to joint rotations from the model's rest directions,
so a clip can say "arm straight up" without knowing how the arm was modelled.

Nothing here changes the other units: it only builds on rig.Rig and geometry.Geo.
"""
import math

from .anim import merge, squash
from .geometry import Geo


def side_deg(p0, p1):
    """Side-plane direction (deg, counter-clockwise, 0 = +X) from p0 to p1 (x, y, z)."""
    return math.degrees(math.atan2(p1[2] - p0[2], p1[0] - p0[0]))


class Chain:
    """A two-bone limb (upper, lower) with an optional held item on the end joint.
    `points` are the rest positions (character space) of the upper pivot, the lower pivot,
    the end (wrist/grip) and, for a held item, its tip."""

    def __init__(self, upper, lower, points, held=None):
        self.upper, self.lower, self.held = upper, lower, held
        p0, p1, p2 = points[0], points[1], points[2]
        self.rest_a = side_deg(p0, p1)
        self.rest_b = side_deg(p1, p2)
        self.rest_c = side_deg(p2, points[3]) if held else None

    def pose(self, a, b, c=None):
        """Upper limb pointing `a`, lower limb `b`, held item `c` (absolute, in the space of
        the chain's parent joint)."""
        ra = a - self.rest_a
        rb = b - self.rest_b - ra
        out = {self.upper: {"r": ra}, self.lower: {"r": rb}}
        if self.held and c is not None:
            out[self.held] = {"r": c - self.rest_c - ra - rb}
        return out


# -- cave-folk biped ---------------------------------------------------------------------------
class CaveBody:
    """Joints and bare-skin body of a cave-folk biped. Dimensions are in lu for the unit's
    own height (see the defaults: a 68 lu stocky Bonker-like build). Joint names:
    body > hips > torso > head; hips > thigh_r/l > shin_r/l; torso > arm_r/l > fore_r/l.
    The unit adds its head, clothes and props on these joints."""

    def __init__(self, rig, skin, foot, *, hip_z=15.0, knee_z=8.5, ankle_z=3.8, waist_z=16.0,
                 shoulder_z=36.0, neck_z=38.0, hip_y=6.0, shoulder_y=12.5, elbow=(1.5, 28.5),
                 wrist=(4.0, 22.0), leg_r=(4.7, 4.1, 3.7), arm_r=(4.5, 3.9, 3.8), fist_r=4.5,
                 torso=((0, 29), (11.5, 9.8, 11.5)), torso_taper=(1.08, 0.92), foot_len=6.6,
                 foot_fill=None, foot_finish="hair", build_torso=True, thigh_z=None,
                 foot_joint=False, far_shade=1.0):
        """walk v3 (ANIM_SPEC 2.0 rule 5): `thigh_z` puts the thigh pivots higher than the hips
        joint (longer legs), `foot_joint` adds `foot_r/l` joints at the ankle carrying the feet
        (planted feet, toe-off), `far_shade` darkens the far leg (0.8 = 20% darker)."""
        from .colors import scale as _scale
        self.rig = rig
        tz = hip_z if thigh_z is None else thigh_z
        self.skin = skin
        self.d = dict(hip_z=hip_z, knee_z=knee_z, ankle_z=ankle_z, waist_z=waist_z,
                      shoulder_z=shoulder_z, neck_z=neck_z, hip_y=hip_y, shoulder_y=shoulder_y)
        rig.joint("body", "root", (0, 0, 0))
        rig.joint("hips", "body", (0, 0, hip_z))
        rig.joint("torso", "hips", (0, 0, waist_z))
        rig.joint("head", "torso", (1, 0, neck_z))
        for side, y in (("r", -hip_y), ("l", hip_y)):
            rig.joint(f"thigh_{side}", "hips", (0, y, tz))
            rig.joint(f"shin_{side}", f"thigh_{side}", (0.5, y, knee_z))
            if foot_joint:
                rig.joint(f"foot_{side}", f"shin_{side}", (1.0, y, ankle_z))
        self.fist = {}
        self.chains = {}
        for side, y in (("r", -shoulder_y), ("l", shoulder_y)):
            yd = -0.5 if y < 0 else 0.5
            sh = (0.0, y, shoulder_z)
            el = (elbow[0], y + yd, elbow[1])
            wr = (wrist[0], y + yd, wrist[1])
            rig.joint(f"arm_{side}", "torso", sh)
            rig.joint(f"fore_{side}", f"arm_{side}", el)
            self.fist[side] = (wr[0] + 0.3, wr[1], wr[2] - 1.6)
            self.chains[side] = (sh, el, wr)

        # legs
        self.foot_part = {}
        for side, y in (("r", -hip_y), ("l", hip_y)):
            sk = skin if side == "r" else _scale(skin, far_shade)
            g = Geo().capsule((0, y, tz), (0.5, y, knee_z), leg_r[0], leg_r[1])
            rig.part(f"thigh_{side}", g, sk)
            g = Geo().capsule((0.5, y, knee_z), (1.0, y, ankle_z), leg_r[1], leg_r[2])
            rig.part(f"shin_{side}", g, sk)
            fj = f"foot_{side}" if foot_joint else f"shin_{side}"
            if foot:
                ft = foot if side == "r" else _scale(foot, far_shade)
                g = Geo().blob((foot_len * 0.48, y, 2.9), (foot_len, 4.6, 3.1), p=2.6, taper=(1.0, 0.85))
                rig.part(fj, g, ft, finish=foot_finish)
                g = Geo().blob((0.8, y, ankle_z + 1.8), (4.4, 4.3, 2.4), p=2.4)
                rig.part(f"shin_{side}", g, ft, finish=foot_finish)
            else:
                g = Geo().blob((foot_len * 0.45, y, 2.6), (foot_len, 4.2, 2.7), p=2.4, taper=(1.0, 0.8))
                rig.part(fj, g, foot_fill or sk)
        if build_torso:
            (tx, tz), radii = torso
            g = Geo().blob((tx, 0, tz), radii, p=2.2, taper=torso_taper)
            rig.part("torso", g, skin)
        # arms and fists
        for side in ("r", "l"):
            sh, el, wr = self.chains[side]
            g = Geo().capsule(sh, el, arm_r[0], arm_r[1])
            rig.part(f"arm_{side}", g, skin)
            g = Geo().capsule(el, wr, arm_r[1], arm_r[2])
            g.blob(self.fist[side], (fist_r, fist_r * 0.96, fist_r * 0.96), p=2.3)
            rig.part(f"fore_{side}", g, skin)

    def arm(self, side, held=None, tip=None):
        """A Chain for one arm; `held` names a joint on the fist whose rest points to `tip`."""
        sh, el, wr = self.chains[side]
        pts = [sh, el, wr] + ([tip] if held else [])
        return Chain(f"arm_{side}", f"fore_{side}", pts, held)


def biped_idle(f, stance, amp=1.0, extra=None):
    """4 poses played 0-1-2-3-2-1 at 200 ms: hips bob 2.4 lu, squash +-4%, head lags."""
    c = [-1.0, -0.45, 0.45, 1.0][f]
    lag = [-1.0, -1.0, -0.45, 0.45][f]
    return merge(stance, {
        "hips": {"z": 1.2 * c * amp},
        "body": squash(0.04 * c * amp),
        "torso": {"r": 1.5 * c * amp},
        "head": {"r": -2.5 * lag * amp, "z": 0.4 * lag},
    }, extra(c, lag) if extra else {})


WALK_BOB = [-2.4, -0.6, 1.2, -0.6, -2.4, -0.6, 1.2, -0.6]


def biped_walk(f, stance, lean=-8.0, bob_k=1.0, thigh=30.0, knee=58.0, lift=14.0, extra=None):
    """8 frames: contact frames 0 and 4 lowest, passing frames 2 and 6 highest; the swinging
    foot lifts; `extra(p, lag_p, bob, bob_lag)` adds the unit's arm and prop motion."""
    p = 2 * math.pi * f / 8
    lag_p = 2 * math.pi * (f - 1) / 8
    lift_r, lift_l = max(0.0, -math.sin(p)), max(0.0, math.sin(p))
    bob = WALK_BOB[f] * bob_k
    bob_lag = WALK_BOB[(f - 1) % 8] * bob_k
    return merge(stance, {
        "hips": {"z": bob},
        "body": squash(0.03 * bob / 2.4),
        "torso": {"r": lean + 1.0 * math.cos(2 * p), "rz": 6 * math.sin(p)},
        "head": {"r": -lean * 0.4 - 1.5 * bob_lag / 2.4},
        "thigh_r": {"r": thigh * math.cos(p) + lift * lift_r}, "shin_r": {"r": -knee * lift_r},
        "thigh_l": {"r": -thigh * math.cos(p) + lift * lift_l}, "shin_l": {"r": -knee * lift_l},
    }, extra(p, lag_p, bob, bob_lag) if extra else {})


def biped_hit(f, stance, extra=None):
    a = [1.0, 0.55, 0.2][f]
    return merge(stance, {
        "body": dict(squash(-0.12 * a), x=-4.0 * a),
        "torso": {"r": 14 * a},
        "head": {"r": 12 * a},
        "arm_l": {"r": 30 * a},
    }, extra(a) if extra else {})


# -- quadruped --------------------------------------------------------------------------------
class Quad:
    """Quadruped skeleton: body > trunk (the barrel, pivot at the hips' height) > neck > head
    > jaw; trunk > leg_<fr|fl|br|bl> (upper, pivot at shoulder or hip) > leg_<..>2 (lower,
    pivot at the knee or hock) > leg_<..>3 (paw or foot, optional). The unit builds the
    meshes; this class only places the joints and remembers the leg geometry."""

    def __init__(self, rig, trunk=(0, 40), front_x=18.0, back_x=-18.0, leg_y=7.0,
                 shoulder_z=40.0, hip_z=40.0, knee_z=20.0, hock_z=20.0, knee_dx=1.5,
                 hock_dx=-2.0, far_dx=-2.0, feet=False, foot_z=6.0):
        self.rig = rig
        rig.joint("body", "root", (0, 0, 0))
        rig.joint("trunk", "body", (trunk[0], 0, trunk[1]))
        self.legs = {}
        for name, x, y, top, mid, dx in (
                ("fl", front_x + far_dx, leg_y, shoulder_z, knee_z, knee_dx),
                ("bl", back_x + far_dx, leg_y, hip_z, hock_z, hock_dx),
                ("fr", front_x, -leg_y, shoulder_z, knee_z, knee_dx),
                ("br", back_x, -leg_y, hip_z, hock_z, hock_dx)):
            p0 = (x, y, top)
            p1 = (x + dx, y, mid)
            rig.joint(f"leg_{name}", "trunk", p0)
            rig.joint(f"leg_{name}2", f"leg_{name}", p1)
            p2 = (x + dx * 0.6, y, foot_z) if feet else None
            if feet:
                rig.joint(f"leg_{name}3", f"leg_{name}2", p2)
            self.legs[name] = (p0, p1, p2)


def trot(f, fr=20.0, br=16.0, knee=46.0, hock=32.0, bob=1.75, nod=6.0, roll=1.5):
    """Diagonal-pair trot (front-right with back-left), 8 frames: lowest on 0 and 4."""
    p = 2 * math.pi * f / 8
    s, c = math.sin(p), math.cos(p)
    up = lambda v: max(0.0, v)
    return {
        "trunk": {"z": -bob * math.cos(2 * p) - 0.4, "r": roll * s},
        "leg_fr": {"r": fr * s}, "leg_fr2": {"r": -knee * up(c)},
        "leg_bl": {"r": br * s}, "leg_bl2": {"r": hock * up(-c)},
        "leg_fl": {"r": -fr * s}, "leg_fl2": {"r": -knee * up(-c)},
        "leg_br": {"r": -br * s}, "leg_br2": {"r": hock * up(c)},
        "neck": {"r": -nod * math.cos(2 * p)},
    }


def walk4(f, fr=16.0, br=14.0, knee=30.0, hock=24.0, bob=1.4, nod=4.0, roll=1.2):
    """A slow four-beat walk (left hind, left fore, right hind, right fore, a quarter cycle
    apart): the heavy gait of an elephant or mammoth, always three feet down."""
    p = 2 * math.pi * f / 8
    up = lambda v: max(0.0, v)
    ph = {"bl": 0.0, "fl": 0.25, "br": 0.5, "fr": 0.75}
    out = {"trunk": {"z": -bob * math.cos(4 * p) - 0.3, "r": roll * math.sin(2 * p)},
           "neck": {"r": -nod * math.cos(4 * p + 0.6)}}
    for leg, off in ph.items():
        q = p - 2 * math.pi * off
        swing = math.sin(q)
        lift = up(math.cos(q) - 0.35) / 0.65  # the foot is up for about a third of the cycle
        amp = fr if leg[0] == "f" else br
        out[f"leg_{leg}"] = {"r": amp * swing}
        out[f"leg_{leg}2"] = {"r": (-knee if leg[0] == "f" else hock) * lift}
    return out


def bound(f, fr=34.0, br=30.0, knee=60.0, hock=50.0, spine=7.0, bob=3.0):
    """A cat's bounding gallop, 8 frames: the front pair reaches while the back pair pushes,
    then gathers under the body; the spine flexes (trunk pitch) and the body lifts in the
    flight phase (frames 2-3)."""
    p = 2 * math.pi * f / 8
    s, c = math.sin(p), math.cos(p)
    up = lambda v: max(0.0, v)
    sf = math.sin(p + 0.35)   # the far legs lead by a little (a rotary gallop, not a hop)
    sb = math.sin(p - math.pi * 0.85)
    sbf = math.sin(p - math.pi * 0.85 + 0.35)
    return {
        "trunk": {"z": bob * s - 0.6, "r": spine * c},
        "leg_fr": {"r": fr * s}, "leg_fr2": {"r": -knee * up(math.cos(p))},
        "leg_fl": {"r": fr * sf}, "leg_fl2": {"r": -knee * up(math.cos(p + 0.35))},
        "leg_br": {"r": br * sb}, "leg_br2": {"r": hock * up(math.cos(p - math.pi * 0.85))},
        "leg_bl": {"r": br * sbf}, "leg_bl2": {"r": hock * up(math.cos(p - math.pi * 0.85 + 0.35))},
        "neck": {"r": -spine * 0.8 * c},
        "head": {"r": spine * 0.5 * c},
    }
