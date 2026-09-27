"""Animation helpers: keyed tracks with easing, loop waves, clip definitions with holds,
and the follow-through spring for secondary motion.

A clip is a pose function of the unique frame index. Poses are plain dicts (see rig.py),
so clips stay readable data plus a few procedural helpers (bob, walk cycle, squash).
A clip plays its unique frames in `sequence` order with per-step `durations` (ms): holds
and ping-pong loops cost no extra frames in the atlas (idle is 4 poses played 0-1-2-3-2-1).
"""
import math

from . import config as C


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


def pick(f, values):
    """Per-frame table lookup: values[f], clamped. Clearer than keys for 3-8 frame clips."""
    return values[max(0, min(len(values) - 1, int(f)))]


def wave(f, n, phase=0.0, cycles=1):
    """sin over a loop of n frames: exact at every frame and seamless."""
    return math.sin(2 * math.pi * (cycles * f / n + phase))


SCALE_CHANNELS = ("s", "sx", "sy", "sz", "alpha")


def merge(*poses):
    """Combine poses; numeric channels add (scales multiply), flags OR."""
    out = {}
    for p in poses:
        for j, ch in p.items():
            dst = out.setdefault(j, {})
            for k, v in ch.items():
                if k in SCALE_CHANNELS:
                    dst[k] = dst.get(k, 1.0) * v
                elif isinstance(v, bool):
                    dst[k] = dst.get(k, False) or v
                else:
                    dst[k] = dst.get(k, 0.0) + v
    return out


def lerp_pose(p0, p1, t):
    """Blend two poses channel by channel (used to sweep the smear between two frames)."""
    out = {}
    for j in set(p0) | set(p1):
        a, b = p0.get(j, {}), p1.get(j, {})
        ch = {}
        for k in set(a) | set(b):
            va, vb = a.get(k), b.get(k)
            if isinstance(va, bool) or isinstance(vb, bool):
                ch[k] = bool(vb if t >= 0.5 else va)
                continue
            d = 1.0 if k in SCALE_CHANNELS else 0.0
            va = d if va is None else va
            vb = d if vb is None else vb
            ch[k] = va + (vb - va) * t
        out[j] = ch
    return out


def squash(amount):
    """Volume-preserving squash (amount < 0) or stretch (> 0) on a joint, e.g. 0.1 = 0.9/1.1."""
    return {"sz": 1.0 + amount, "sx": 1.0 - amount * 0.9, "sy": 1.0 - amount * 0.9}


class Clip:
    """`frames` unique poses, played in `sequence` order for `durations` ms per step.

    impact: unique frame index of the contact frame (impactAt is computed from time).
    smear:  unique frame index that gets a swept smear ribbon (see render.py).
    extra:  additional metadata, e.g. the death clip's FX hand-off.
    """

    def __init__(self, name, frames, pose_fn, loop=False, impact=None, sequence=None,
                 durations=None, smear=None, extra=None):
        self.name, self.frames, self.pose_fn, self.loop = name, frames, pose_fn, loop
        self.impact, self.smear, self.extra = impact, smear, extra or {}
        self.sequence = list(sequence) if sequence is not None else list(range(frames))
        if durations is None:
            durations = C.FRAME_MS
        if isinstance(durations, (int, float)):
            durations = [durations] * len(self.sequence)
        assert len(durations) == len(self.sequence), name
        self.durations = [int(round(d)) for d in durations]

    def pose(self, f):
        return self.pose_fn(f)

    def total_ms(self):
        return sum(self.durations)

    def meta(self):
        m = {"frames": self.frames, "loop": self.loop, "sequence": self.sequence,
             "durationsMs": self.durations, "durationMs": self.total_ms()}
        if self.impact is not None:
            # impactAt: normalised time at which the contact frame starts (DESIGN B5).
            step = self.sequence.index(self.impact)
            m["impactFrame"] = self.impact
            m["impactAt"] = round(sum(self.durations[:step]) / self.total_ms(), 4)
        if self.smear is not None:
            m["smearFrame"] = self.smear
        m.update(self.extra)
        return m


def follow_through(steps, durations, loop, gain=1.0, hz=None, damping=None):
    """Secondary motion for one joint over a clip's playback.

    steps: per playback step, the parent's side-plane angle `A` (deg), the pivot position
    `px`, `pz` (lu) and the rest direction `ux`, `uz` and length `L` of the dangling part.
    The part is a damped spring around its rest angle: when the parent turns or its pivot
    changes speed, the part lags and then overshoots (about 20% with the default damping).
    The parent is taken to move linearly between frame starts, so every frame boundary is
    an impulse. Returns the offset angle (deg) sampled in the middle of each step.
    Loops run three times and return the last pass, so the result is seamless."""
    hz = hz or C.SPRING_HZ
    zeta = damping or C.SPRING_DAMPING
    w = 2 * math.pi * hz
    n = len(steps)

    def vel(j):
        k = j + 1
        if k >= n:
            if not loop:
                return (0.0, 0.0, 0.0)
            k = 0
        d = max(1e-3, durations[j] / 1000.0)
        a, b = steps[j], steps[k]
        return ((b["A"] - a["A"]) / d, (b["px"] - a["px"]) / d, (b["pz"] - a["pz"]) / d)

    phi = dphi = 0.0
    prev = vel(n - 1) if loop else (0.0, 0.0, 0.0)
    out = [0.0] * n
    for it in range(3 if loop else 1):
        for j in range(n):
            v = vel(j)
            s = steps[j]
            dA, dx, dz = v[0] - prev[0], v[1] - prev[1], v[2] - prev[2]
            # parent spins: the part keeps its world angle for a moment (inertia)
            dphi -= dA * gain
            # pivot changes speed: pseudo-force on the tip, torque = u x (-dv) / L
            dphi -= math.degrees((s["ux"] * dz - s["uz"] * dx) / max(1.0, s["L"])) * gain
            prev = v
            d = durations[j] / 1000.0
            sub = max(1, int(d / 0.002))
            h = d / sub
            for i in range(sub):
                acc = -w * w * phi - 2 * zeta * w * dphi
                dphi += acc * h
                phi += dphi * h
                if i == sub // 2 and it == (2 if loop else 0):
                    out[j] = phi
    return out


def soft_clamp(v, limit):
    return limit * math.tanh(v / limit) if limit > 0 else v
