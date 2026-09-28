"""Loudness and spectrum analysis (ITU-R BS.1770 K-weighting, EBU R128 gating).

Everything the pipeline cannot hear it measures here: sample peak, 4x oversampled true peak,
integrated loudness (LUFS), the loudest short window (for short effects), and the energy balance
across bands (muddy lows, harsh 2-5 kHz presence).
"""
from __future__ import annotations

import numpy as np
from scipy import signal


def _k_weight_sos(fs: int) -> np.ndarray:
    # Stage 1: high shelf (+4 dB above ~1.7 kHz), stage 2: RLB high pass (~38 Hz). Same
    # analogue prototypes as BS.1770, bilinear-transformed for any sample rate.
    f0, g, q = 1681.974450955533, 3.999843853973347, 0.7071752369554196
    k = np.tan(np.pi * f0 / fs)
    vh = 10 ** (g / 20)
    vb = vh ** 0.4996667741545416
    a0 = 1 + k / q + k * k
    b_shelf = [(vh + vb * k / q + k * k) / a0, 2 * (k * k - vh) / a0, (vh - vb * k / q + k * k) / a0]
    a_shelf = [1, 2 * (k * k - 1) / a0, (1 - k / q + k * k) / a0]
    f0, q = 38.13547087602444, 0.5003270373238773
    k = np.tan(np.pi * f0 / fs)
    a0 = 1 + k / q + k * k
    b_hp = [1, -2, 1]
    a_hp = [1, 2 * (k * k - 1) / a0, (1 - k / q + k * k) / a0]
    return np.array([b_shelf + a_shelf, b_hp + a_hp], dtype=float)


def _channels(x: np.ndarray) -> np.ndarray:
    x = np.asarray(x, dtype=np.float64)
    return x[None, :] if x.ndim == 1 else x.T if x.shape[0] > x.shape[1] else x


def k_power(x: np.ndarray, fs: int) -> np.ndarray:
    """Per-sample K-weighted power summed over channels."""
    ch = _channels(x)
    sos = _k_weight_sos(fs)
    y = signal.sosfilt(sos, ch, axis=-1)
    return np.sum(y * y, axis=0)


def integrated_lufs(x: np.ndarray, fs: int) -> float:
    p = k_power(x, fs)
    block, hop = int(0.4 * fs), int(0.1 * fs)
    if len(p) < block:
        p = np.pad(p, (0, block - len(p)))
    c = np.concatenate([[0.0], np.cumsum(p)])
    starts = np.arange(0, len(p) - block + 1, hop)
    z = (c[starts + block] - c[starts]) / block
    lk = -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
    z1 = z[lk > -70]
    if len(z1) == 0:
        return -99.0
    rel = -0.691 + 10 * np.log10(np.mean(z1)) - 10
    z2 = z[(lk > -70) & (lk > rel)]
    return float(-0.691 + 10 * np.log10(np.mean(z2))) if len(z2) else -99.0


def max_window_lufs(x: np.ndarray, fs: int, window_s: float = 0.2) -> float:
    """Loudest K-weighted window (default 200 ms): a fair loudness for short effects."""
    p = k_power(x, fs)
    w = max(1, int(window_s * fs))
    if len(p) < w:
        p = np.pad(p, (0, w - len(p)))
    c = np.concatenate([[0.0], np.cumsum(p)])
    z = (c[w:] - c[:-w]) / w
    return float(-0.691 + 10 * np.log10(max(float(z.max()), 1e-20)))


def peak_db(x: np.ndarray) -> float:
    return float(20 * np.log10(max(float(np.max(np.abs(x))), 1e-9)))


def true_peak_db(x: np.ndarray) -> float:
    ch = _channels(x)
    up = signal.resample_poly(ch, 4, 1, axis=-1)
    return float(20 * np.log10(max(float(np.max(np.abs(up))), 1e-9)))


BANDS = [(20, 100, "sub"), (100, 300, "low"), (300, 2000, "mid"), (2000, 5000, "presence"), (5000, 10000, "air"), (10000, 20000, "top")]


def band_balance(x: np.ndarray, fs: int) -> dict[str, float]:
    """Share of spectral energy per band in dB relative to the total (Welch PSD)."""
    ch = _channels(x)
    mono = ch.mean(axis=0)
    n = min(len(mono), 8192)
    if n < 256:
        mono = np.pad(mono, (0, 256 - len(mono)))
        n = 256
    f, pxx = signal.welch(mono, fs, nperseg=n)
    total = float(np.sum(pxx)) + 1e-30
    out = {}
    for lo, hi, name in BANDS:
        m = (f >= lo) & (f < hi)
        out[name] = float(10 * np.log10(float(np.sum(pxx[m])) / total + 1e-12))
    return out


def presence_peak(x: np.ndarray, fs: int) -> float:
    """How far the strongest 1/3-octave bin in 2-5 kHz sticks out above the 300 Hz-10 kHz median, in dB.

    A narrow, loud resonance there reads as harsh and fatiguing on phone speakers.
    """
    ch = _channels(x)
    mono = ch.mean(axis=0)
    n = min(len(mono), 8192)
    if n < 512:
        return 0.0
    f, pxx = signal.welch(mono, fs, nperseg=n)
    centers = 1000 * 2 ** (np.arange(-5, 14) / 3)
    levels = []
    for c in centers:
        m = (f >= c / 2 ** (1 / 6)) & (f < c * 2 ** (1 / 6))
        levels.append(10 * np.log10(float(np.sum(pxx[m])) + 1e-30) if np.any(m) else -300)
    levels = np.array(levels)
    ref = np.median(levels[(centers > 300) & (centers < 10000)])
    pres = levels[(centers >= 2000) & (centers <= 5000)]
    return float(pres.max() - ref)


def report(x: np.ndarray, fs: int, short: bool = False) -> dict[str, float]:
    r = {
        "peak": peak_db(x),
        "tp": true_peak_db(x),
        "lufs": max_window_lufs(x, fs) if short else integrated_lufs(x, fs),
        "presence_peak": presence_peak(x, fs),
    }
    r.update({f"band_{k}": v for k, v in band_balance(x, fs).items()})
    return r
