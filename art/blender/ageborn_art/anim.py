"""Animation helpers: keyed tracks with easing, loop waves and clip definitions.

A clip is a pose function of the frame index. Poses are plain dicts (see rig.py), so
clips stay readable data plus a few procedural helpers (bob, walk cycle, squash).
Frame 0 of a loop follows the last frame seamlessly; the loop never repeats a frame.
"""
import math


def ease(kind, u):
    u = max(0.0, min(1.0, u))
    if kind == "lin":
        return u
    if kind == "in":
        return u * u * u
    if kind == "out":
        return 1 - (1 - u) ** 3
    if kind == "hold":
        return 0.0
    if kind == "step":
        return 1.0
    if kind == "back":  # overshoot, for snappy strikes and pops
        c = 1.9
        return 1 + (c + 1) * (u - 1) ** 3 + c * (u - 1) ** 2
    return u * u * (3 - 2 * u)  # "io": smoothstep


def key(f, keys):
    """Interpolate keys [(frame, value, ease_into_this_key?), ...] at frame f."""
    if f <= keys[0][0]:
        return keys[0][1]
    for a, b in zip(keys, keys[1:]):
        if f <= b[0]:
            kind = b[2] if len(b) > 2 else "io"
            u = (f - a[0]) / (b[0] - a[0]) if b[0] > a[0] else 1.0
            return a[1] + (b[1] - a[1]) * ease(kind, u)
    return keys[-1][1]


def wave(f, n, phase=0.0, cycles=1):
    """sin over a loop of n frames: exact at every frame and seamless."""
    return math.sin(2 * math.pi * (cycles * f / n + phase))


def merge(*poses):
    """Combine poses; numeric channels add (scales multiply), flags OR."""
    out = {}
    for p in poses:
        for j, ch in p.items():
            dst = out.setdefault(j, {})
            for k, v in ch.items():
                if k in ("s", "sx", "sy", "sz", "alpha"):
                    dst[k] = dst.get(k, 1.0) * v
                elif isinstance(v, bool):
                    dst[k] = dst.get(k, False) or v
                else:
                    dst[k] = dst.get(k, 0.0) + v
    return out


def squash(amount):
    """Volume-preserving squash (amount < 0) or stretch (> 0) on a joint, e.g. 0.1 = 0.9/1.1."""
    return {"sz": 1.0 + amount, "sx": 1.0 - amount * 0.9, "sy": 1.0 - amount * 0.9}


class Clip:
    def __init__(self, name, frames, pose_fn, loop=False, impact=None, fps=12):
        self.name, self.frames, self.pose_fn, self.loop = name, frames, pose_fn, loop
        self.impact, self.fps = impact, fps

    def pose(self, f):
        return self.pose_fn(f)

    def meta(self):
        m = {"frames": self.frames, "fps": self.fps, "loop": self.loop,
             "durationMs": round(1000 * self.frames / self.fps)}
        if self.impact is not None:
            # impactAt: normalised time at which the contact frame starts (DESIGN B5).
            m["impactFrame"] = self.impact
            m["impactAt"] = round(self.impact / self.frames, 4)
        return m
