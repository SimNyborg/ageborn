"""2D kinematics in the side plane (x forward, z up) for posing with planted feet and
two-handed grips. Mirrors how ageborn_art.rig.apply composes a joint: scale, then rotation
`r` (counter-clockwise on screen) about the pivot, then the x/z offset, then the parent.
Rolls (rx, rz) are ignored, so keep them small on posed chains."""
import math


def rot(p, piv, deg):
    a = math.radians(deg)
    c, s = math.cos(a), math.sin(a)
    dx, dz = p[0] - piv[0], p[1] - piv[1]
    return (piv[0] + dx * c - dz * s, piv[1] + dx * s + dz * c)


def rest_xz(rig, joint):
    v = rig.rest[joint]
    return (v.x, v.z)


def fk(rig, pose, joint, p):
    """Character-space position of point p (rest coords, x/z) attached to `joint`."""
    j = joint
    while j is not None:
        ch = pose.get(j, {})
        piv = rest_xz(rig, j)
        s = ch.get("s", 1.0)
        p = (piv[0] + (p[0] - piv[0]) * s * ch.get("sx", 1.0), piv[1] + (p[1] - piv[1]) * s * ch.get("sz", 1.0))
        p = rot(p, piv, ch.get("r", 0.0))
        p = (p[0] + ch.get("x", 0.0), p[1] + ch.get("z", 0.0))
        j = rig.parent_of[j]
    return p


def angle_sum(rig, pose, joint):
    """Sum of r over `joint` and all its ancestors."""
    t, j = 0.0, joint
    while j is not None:
        t += pose.get(j, {}).get("r", 0.0)
        j = rig.parent_of[j]
    return t


def ang(a, b):
    return math.degrees(math.atan2(b[1] - a[1], b[0] - a[0]))


def ik(rig, pose, upper, lower, end, target, bend=1, end_joint=None, end_angle=None, reach=0.999):
    """Two-bone IK: rotate `upper` and `lower` so the rest point `end` (x, z; on `lower`)
    lands on `target` (character space). bend=+1 puts the middle joint on the
    counter-clockwise side of the upper->target line (knees forward on a leg pointing down).
    end_joint/end_angle: also set that child joint's absolute side angle (a flat foot)."""
    P0, P1 = rest_xz(rig, upper), rest_xz(rig, lower)
    P2 = end
    l1 = math.dist(P0, P1)
    l2 = math.dist(P1, P2)
    parent = rig.parent_of[upper]
    base = angle_sum(rig, pose, parent)
    S = fk(rig, {**pose, upper: {k: v for k, v in pose.get(upper, {}).items() if k != "r"}}, upper, P0)
    d = max(abs(l1 - l2) + 1e-3, min((l1 + l2) * reach, math.dist(S, target)))
    alpha = math.degrees(math.atan2(target[1] - S[1], target[0] - S[0]))
    cb = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)
    beta = math.degrees(math.acos(max(-1.0, min(1.0, cb))))
    A1 = alpha + bend * beta
    K = (S[0] + l1 * math.cos(math.radians(A1)), S[1] + l1 * math.sin(math.radians(A1)))
    # the lower bone points from the knee toward the target (clamped reach)
    A2 = math.degrees(math.atan2(target[1] - K[1], target[0] - K[0]))
    a1r, a2r = ang(P0, P1), ang(P1, P2)
    r1 = A1 - a1r - base
    r2 = A2 - a2r - (base + r1)
    pose.setdefault(upper, {})["r"] = r1
    pose.setdefault(lower, {})["r"] = r2
    if end_joint is not None and end_angle is not None:
        # end_angle is absolute; the end joint's rest direction is taken as 0 (flat foot)
        pose.setdefault(end_joint, {})["r"] = end_angle - (base + r1 + r2)
    return pose


def aim(rig, pose, chain, angles):
    """Set absolute side angles (in the space of chain[0]'s parent) for a chain of joints.
    chain: [(joint, rest_angle)], angles: [deg] (None keeps the joint straight)."""
    acc = 0.0
    for (j, rest), a in zip(chain, angles):
        if a is None:
            r = 0.0
        else:
            r = a - rest - acc
        pose.setdefault(j, {})["r"] = pose.get(j, {}).get("r", 0.0) * 0 + r
        acc += r
    return pose
