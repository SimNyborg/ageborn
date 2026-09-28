"""Key-pose animation for the heroic style.

A clip is authored as a few strong key poses on a frame grid, with an ease per segment, the
way an animator blocks a shot: anticipation, a held extreme, a fast contact (smear), a held
impact, follow-through and settle. `keyed()` turns the keys into a pose function per unique
frame; the timing (holds) lives in the per-frame durations.

Pose dicts are the base rig's: {joint: {r, rx, rz, x, y, z, s, sx, sy, sz, show, hide}}.
"""
import math

from ageborn_art.anim import Clip, ease, lerp_pose, merge, squash  # noqa: F401  (re-exported)


def _ease(kind, u):
    if kind == "snap":        # contact: almost all of the move in the first half
        return 1 - (1 - u) ** 5
    if kind == "slow":        # a long, slow build (anticipation)
        return u * u * (3 - 2 * u) ** 1.0
    if kind == "over":        # overshoot and settle
        c = 2.2
        return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2
    return ease(kind, u)


def keyed(keys):
    """keys: [(frame, pose, ease_into_this_key), ...] sorted by frame. Returns f -> pose."""
    def fn(f):
        if f <= keys[0][0]:
            return keys[0][1]
        for a, b in zip(keys, keys[1:]):
            if f <= b[0]:
                kind = b[2] if len(b) > 2 else "io"
                u = (f - a[0]) / float(b[0] - a[0])
                return lerp_pose(a[1], b[1], _ease(kind, u))
        return keys[-1][1]
    return fn


def cyc(f, n, phase=0.0):
    return math.cos(2 * math.pi * (f / n + phase))


def syc(f, n, phase=0.0):
    return math.sin(2 * math.pi * (f / n + phase))


def with_flags(pose, **joints):
    """Adds boolean flags, e.g. with_flags(p, yell={"show": True})."""
    out = {j: dict(ch) for j, ch in pose.items()}
    for j, ch in joints.items():
        out.setdefault(j, {}).update(ch)
    return out
