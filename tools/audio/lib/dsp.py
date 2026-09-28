"""Small synthesis and processing toolkit for the Ageborn sound pipeline (numpy + scipy).

Conventions: 48 kHz float64 arrays; mono is 1-D, stereo is shape (n, 2). Every random choice goes
through an explicit `np.random.Generator` so renders are reproducible.
"""
from __future__ import annotations

import numpy as np
from scipy import signal

SR = 48000


# ------------------------------------------------------------------------------------------------
# Time and envelopes


def n_of(seconds: float) -> int:
    return max(1, int(round(seconds * SR)))


def tvec(seconds: float) -> np.ndarray:
    return np.arange(n_of(seconds)) / SR


def env_exp(seconds: float, tau: float, attack: float = 0.001) -> np.ndarray:
    """Fast linear attack, exponential decay with time constant `tau`, silent at the end."""
    t = tvec(seconds)
    a = np.clip(t / max(attack, 1e-5), 0, 1)
    e = a * np.exp(-np.maximum(t - attack, 0) / tau)
    return e * fade_curve(len(t), min(0.01, seconds / 4))


def env_adsr(seconds: float, a: float, d: float, s: float, r: float) -> np.ndarray:
    """Attack, decay to level `s`, hold, release `r` at the end (total length `seconds`)."""
    n = n_of(seconds)
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-5), s + (1 - s) * np.exp(-(t - a) / max(d, 1e-5)))
    rel_start = seconds - r
    e = np.where(t > rel_start, e * np.clip(1 - (t - rel_start) / max(r, 1e-5), 0, 1) ** 2, e)
    return e


def fade_curve(n: int, fade_s: float) -> np.ndarray:
    """1 everywhere, with a raised-cosine fade out over the last `fade_s`."""
    out = np.ones(n)
    k = min(n, n_of(fade_s))
    if k > 1:
        out[-k:] = 0.5 * (1 + np.cos(np.linspace(0, np.pi, k)))
    return out


def fade(x: np.ndarray, fin: float = 0.0, fout: float = 0.01) -> np.ndarray:
    x = np.array(x, dtype=float)
    n = len(x)
    if fin > 0:
        k = min(n, n_of(fin))
        ramp = 0.5 * (1 - np.cos(np.linspace(0, np.pi, k)))
        x[:k] = (x[:k].T * ramp).T
    if fout > 0:
        k = min(n, n_of(fout))
        ramp = 0.5 * (1 + np.cos(np.linspace(0, np.pi, k)))
        x[-k:] = (x[-k:].T * ramp).T
    return x


def glide(f0: float, f1: float, seconds: float, curve: float = 1.0) -> np.ndarray:
    """Frequency trajectory from f0 to f1 (exponential in pitch; curve > 1 moves early)."""
    n = n_of(seconds)
    u = np.linspace(0, 1, n) ** (1 / curve)
    return f0 * (f1 / f0) ** u


def drop(f0: float, f1: float, seconds: float, tau: float) -> np.ndarray:
    """Pitch drop from f0 towards f1 with time constant tau (kick and impact bodies)."""
    t = tvec(seconds)
    return f1 + (f0 - f1) * np.exp(-t / tau)


# ------------------------------------------------------------------------------------------------
# Oscillators


def _phase(freq, seconds: float | None = None) -> np.ndarray:
    if np.isscalar(freq):
        freq = np.full(n_of(seconds or 0.1), float(freq))
    return np.cumsum(np.asarray(freq, dtype=float)) / SR


def _blep(t: np.ndarray, dt: np.ndarray) -> np.ndarray:
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]
    out[m] = x + x - x * x - 1
    m2 = t > 1 - dt
    x = (t[m2] - 1) / dt[m2]
    out[m2] = x * x + x + x + 1
    return out


def osc(freq, shape: str = "sine", seconds: float | None = None, phase0: float = 0.0, duty: float = 0.5) -> np.ndarray:
    """Band-limited oscillator (polyBLEP saw and square) following a frequency array."""
    f = np.full(n_of(seconds or 0.1), float(freq)) if np.isscalar(freq) else np.asarray(freq, dtype=float)
    ph = (np.cumsum(f) / SR + phase0) % 1.0
    dt = np.clip(f / SR, 1e-6, 0.5)
    if shape == "sine":
        return np.sin(2 * np.pi * ph)
    if shape == "tri":
        return 2 * np.abs(2 * ph - 1) - 1
    if shape == "saw":
        return 2 * ph - 1 - _blep(ph, dt)
    if shape == "square":
        sq = np.where(ph < duty, 1.0, -1.0)
        sq += _blep(ph, dt) - _blep((ph - duty) % 1.0, dt)
        return sq
    raise ValueError(shape)


def fm(carrier, ratio: float, index, seconds: float | None = None) -> np.ndarray:
    """Two-operator FM: sine carrier modulated by a sine at carrier*ratio with index (array ok)."""
    c = np.full(n_of(seconds or 0.1), float(carrier)) if np.isscalar(carrier) else np.asarray(carrier, dtype=float)
    idx = np.full(len(c), float(index)) if np.isscalar(index) else np.asarray(index, dtype=float)[: len(c)]
    mph = np.cumsum(c * ratio) / SR
    cph = np.cumsum(c) / SR
    return np.sin(2 * np.pi * cph + idx * np.sin(2 * np.pi * mph))


def noise(seconds: float, rng: np.random.Generator, color: str = "white") -> np.ndarray:
    n = n_of(seconds)
    w = rng.standard_normal(n)
    if color == "white":
        return w / 3
    spec = np.fft.rfft(w)
    f = np.fft.rfftfreq(n, 1 / SR)
    f[0] = f[1] if len(f) > 1 else 1
    if color == "pink":
        spec /= np.sqrt(f)
    elif color == "brown":
        spec /= f
    x = np.fft.irfft(spec, n)
    return x / (np.max(np.abs(x)) + 1e-12) * 0.8


# ------------------------------------------------------------------------------------------------
# Filters


def _sos(kind: str, f, order: int = 2):
    nyq = SR / 2
    if kind in ("lp", "hp"):
        return signal.butter(order, min(max(f, 10), nyq * 0.95) / nyq, btype="low" if kind == "lp" else "high", output="sos")
    lo, hi = f
    return signal.butter(order, [max(lo, 10) / nyq, min(hi, nyq * 0.95) / nyq], btype="band", output="sos")


def lp(x, f, order: int = 2):
    return signal.sosfilt(_sos("lp", f, order), x, axis=0)


def hp(x, f, order: int = 2):
    return signal.sosfilt(_sos("hp", f, order), x, axis=0)


def bp(x, lo, hi, order: int = 2):
    return signal.sosfilt(_sos("bp", (lo, hi), order), x, axis=0)


def peq(x, f0: float, gain_db: float, q: float = 1.0):
    """RBJ peaking EQ."""
    a = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    al = np.sin(w) / (2 * q)
    b = [1 + al * a, -2 * np.cos(w), 1 - al * a]
    aa = [1 + al / a, -2 * np.cos(w), 1 - al / a]
    return signal.lfilter(np.array(b) / aa[0], np.array(aa) / aa[0], x, axis=0)


def shelf(x, f0: float, gain_db: float, high: bool = True):
    """RBJ shelving EQ (slope 1)."""
    a = 10 ** (gain_db / 40)
    w = 2 * np.pi * f0 / SR
    cw, sw = np.cos(w), np.sin(w)
    al = sw / 2 * np.sqrt(2)
    s = 2 * np.sqrt(a) * al
    if high:
        b = [a * ((a + 1) + (a - 1) * cw + s), -2 * a * ((a - 1) + (a + 1) * cw), a * ((a + 1) + (a - 1) * cw - s)]
        aa = [(a + 1) - (a - 1) * cw + s, 2 * ((a - 1) - (a + 1) * cw), (a + 1) - (a - 1) * cw - s]
    else:
        b = [a * ((a + 1) - (a - 1) * cw + s), 2 * a * ((a - 1) - (a + 1) * cw), a * ((a + 1) - (a - 1) * cw - s)]
        aa = [(a + 1) + (a - 1) * cw + s, -2 * ((a - 1) + (a + 1) * cw), (a + 1) + (a - 1) * cw - s]
    return signal.lfilter(np.array(b) / aa[0], np.array(aa) / aa[0], x, axis=0)


def sweep_lp(x: np.ndarray, cutoff: np.ndarray, res: float = 0.7) -> np.ndarray:
    """Time-varying resonant low pass (Chamberlin state-variable filter, per sample)."""
    x = np.asarray(x, dtype=float)
    c = np.broadcast_to(np.asarray(cutoff, dtype=float), x.shape)
    f = 2 * np.sin(np.pi * np.clip(c, 20, SR / 6) / SR)
    q = 1 / max(res, 0.5)
    low = band = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        low += f[i] * band
        high = x[i] - low - q * band
        band += f[i] * high
        out[i] = low
    return out


def sweep_bp(x: np.ndarray, center: np.ndarray, res: float = 2.0) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    c = np.broadcast_to(np.asarray(center, dtype=float), x.shape)
    f = 2 * np.sin(np.pi * np.clip(c, 20, SR / 6) / SR)
    q = 1 / max(res, 0.5)
    low = band = 0.0
    out = np.empty_like(x)
    for i in range(len(x)):
        low += f[i] * band
        high = x[i] - low - q * band
        band += f[i] * high
        out[i] = band
    return out


# ------------------------------------------------------------------------------------------------
# Dynamics and colour


def sat(x, drive: float = 2.0):
    """Soft saturation (tanh), level-compensated for small signals."""
    return np.tanh(np.asarray(x) * drive) / np.tanh(drive)


def _smooth_blocks(target: np.ndarray, attack: float, release: float, block: int) -> np.ndarray:
    """Asymmetric one-pole smoothing of a gain curve in dB, evaluated per block of samples."""
    nb = int(np.ceil(len(target) / block))
    padded = np.pad(target, (0, nb * block - len(target)), mode="edge")
    tb = padded.reshape(nb, block).min(axis=1)
    a_att = np.exp(-block / (max(attack, 1e-4) * SR))
    a_rel = np.exp(-block / (max(release, 1e-4) * SR))
    out = np.empty(nb)
    cur = 0.0 if tb[0] >= 0 else tb[0]
    for i in range(nb):
        t = tb[i]
        a = a_att if t < cur else a_rel
        cur = a * cur + (1 - a) * t
        out[i] = cur
    centers = np.arange(nb) * block + block / 2
    return np.interp(np.arange(len(target)), centers, out)


def compress(x: np.ndarray, threshold_db: float = -18, ratio: float = 3, attack: float = 0.01, release: float = 0.15, makeup_db: float = 0, knee_db: float = 6) -> np.ndarray:
    """Feed-forward peak compressor with a soft knee (stereo-linked)."""
    x = np.asarray(x, dtype=float)
    lvl = np.abs(x) if x.ndim == 1 else np.max(np.abs(x), axis=1)
    lvl_db = 20 * np.log10(lvl + 1e-9)
    over = lvl_db - threshold_db
    slope = 1 - 1 / ratio
    gr = np.where(over <= -knee_db / 2, 0.0, np.where(over >= knee_db / 2, -slope * over, -slope * (over + knee_db / 2) ** 2 / (2 * knee_db)))
    g = _smooth_blocks(gr, attack, release, 32)
    gain = 10 ** ((g + makeup_db) / 20)
    return x * (gain if x.ndim == 1 else gain[:, None])


def limit(x: np.ndarray, ceiling_db: float = -1.0, lookahead: float = 0.004, release: float = 0.08) -> np.ndarray:
    """Look-ahead peak limiter: smooth gain, and the output never exceeds the ceiling."""
    from scipy.ndimage import minimum_filter1d, uniform_filter1d

    x = np.asarray(x, dtype=float)
    ceil = 10 ** (ceiling_db / 20)
    lvl = np.abs(x) if x.ndim == 1 else np.max(np.abs(x), axis=1)
    need = np.minimum(1.0, ceil / np.maximum(lvl, 1e-9))
    w = max(1, int(lookahead * SR))
    held = minimum_filter1d(need, size=2 * w + 1, mode="nearest")
    ramp = uniform_filter1d(held, size=w, mode="nearest")  # a w-sample mean of a (2w+1)-sample minimum never exceeds `need`
    need_db = 20 * np.log10(np.maximum(ramp, 1e-6))
    slow = 10 ** (_smooth_blocks(need_db, 0.0005, release, 32) / 20)
    g = np.minimum(slow, ramp)
    y = x * (g if x.ndim == 1 else g[:, None])
    return np.clip(y, -ceil, ceil)


# ------------------------------------------------------------------------------------------------
# Space


def ir(seconds: float, rng: np.random.Generator, predelay: float = 0.01, damp_hz: float = 6000, stereo: bool = True, early: int = 8) -> np.ndarray:
    """Synthetic room impulse response: early reflections plus a decaying, darkening noise tail."""
    n = n_of(seconds + predelay)
    chans = 2 if stereo else 1
    out = np.zeros((n, chans))
    t = np.arange(n) / SR
    for c in range(chans):
        tail = rng.standard_normal(n) * np.exp(-6.9 * t / seconds)  # -60 dB at `seconds`
        tail[: n_of(predelay)] = 0
        # Darker as it decays: blend a low-passed copy in over time.
        dark = lp(tail, damp_hz * 0.35, 1)
        mixw = np.clip(t / seconds, 0, 1)
        tail = tail * (1 - mixw) + dark * mixw
        tail = lp(tail, damp_hz, 1)
        for k in range(early):
            d = n_of(predelay * (0.3 + rng.random() * 1.2))
            if d < n:
                tail[d] += (rng.random() * 2 - 1) * 0.6 * (1 - k / early)
        out[:, c] = tail
    out /= np.sqrt(np.sum(out**2) / chans) + 1e-12
    return out if stereo else out[:, 0]


def convolve(x: np.ndarray, h: np.ndarray) -> np.ndarray:
    """Convolve mono or stereo `x` with mono or stereo IR `h` (output length len(x)+len(h)-1)."""
    x2 = x if x.ndim == 2 else x[:, None]
    h2 = h if h.ndim == 2 else h[:, None]
    chans = max(x2.shape[1], h2.shape[1])
    out = np.zeros((len(x2) + len(h2) - 1, chans))
    for c in range(chans):
        out[:, c] = signal.fftconvolve(x2[:, min(c, x2.shape[1] - 1)], h2[:, min(c, h2.shape[1] - 1)])
    return out if chans > 1 else out[:, 0]


def reverb(x: np.ndarray, h: np.ndarray, wet: float, keep_len: bool = False) -> np.ndarray:
    """Dry plus `wet` times the convolution (the tail is kept unless keep_len)."""
    w = convolve(x, h) * wet
    if w.ndim == 2 and x.ndim == 1:
        dry = np.stack([x, x], axis=1)
    else:
        dry = x
    out = pad_to(w, len(w))
    out[: len(dry)] += dry
    return out[: len(x)] if keep_len else out


def echo(x: np.ndarray, delay: float, feedback: float, taps: int = 4, damp_hz: float = 4000) -> np.ndarray:
    d = n_of(delay)
    out = pad_to(x, len(x) + d * taps)
    cur = x
    for k in range(1, taps + 1):
        cur = lp(cur, damp_hz, 1) * feedback
        out[k * d : k * d + len(cur)] += cur
    return out


# ------------------------------------------------------------------------------------------------
# Assembly


def pad_to(x: np.ndarray, n: int) -> np.ndarray:
    if len(x) >= n:
        return np.array(x[:n], dtype=float)
    shape = (n,) + x.shape[1:]
    out = np.zeros(shape)
    out[: len(x)] = x
    return out


def layer(*parts) -> np.ndarray:
    """Sums (offset_seconds, signal, gain) tuples or bare signals into one buffer."""
    items = []
    for p in parts:
        if isinstance(p, tuple):
            off, sig, g = (p + (1.0,))[:3] if len(p) == 2 else p
            items.append((n_of(off) if off > 0 else 0, np.asarray(sig, dtype=float), g))
        else:
            items.append((0, np.asarray(p, dtype=float), 1.0))
    stereo = any(s.ndim == 2 for _, s, _ in items)
    n = max(o + len(s) for o, s, _ in items)
    out = np.zeros((n, 2)) if stereo else np.zeros(n)
    for o, s, g in items:
        if stereo and s.ndim == 1:
            s = np.stack([s, s], axis=1)
        out[o : o + len(s)] += s * g
    return out


def to_mono(x: np.ndarray) -> np.ndarray:
    return x.mean(axis=1) if x.ndim == 2 else x


def pan(x: np.ndarray, p: float) -> np.ndarray:
    """Equal-power pan of a mono signal to stereo (p in -1..1)."""
    a = (p + 1) * np.pi / 4
    return np.stack([x * np.cos(a), x * np.sin(a)], axis=1)


def trim(x: np.ndarray, floor_db: float = -60, tail_fade: float = 0.02, head: bool = True) -> np.ndarray:
    """Cuts leading and trailing silence below `floor_db` relative to the peak, then fades the end."""
    lvl = np.abs(x) if x.ndim == 1 else np.max(np.abs(x), axis=1)
    thr = np.max(lvl) * 10 ** (floor_db / 20)
    idx = np.nonzero(lvl > thr)[0]
    if len(idx) == 0:
        return x[:1]
    a = max(0, idx[0] - n_of(0.0005)) if head else 0
    b = min(len(x), idx[-1] + n_of(tail_fade))
    return fade(x[a:b], 0, min(tail_fade, (b - a) / SR / 3))


def norm_peak(x: np.ndarray, db: float = -1.0) -> np.ndarray:
    return x * (10 ** (db / 20) / (np.max(np.abs(x)) + 1e-12))


def db(g: float) -> float:
    return 10 ** (g / 20)


def midi_hz(m: float) -> float:
    return 440.0 * 2 ** ((m - 69) / 12)
