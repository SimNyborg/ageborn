"""Renders every sound id in `sounds.py` to float WAV masters in `.cache/out/sfx/<id>.<variant>.wav`.

Per variant: high pass, an adaptive dip if one 1/3 octave in 2-5 kHz sticks out (harshness), trim of
leading and trailing silence, loudness normalisation to the id's target (loudest 200 ms window, see
`analyze.py`), and a look-ahead limiter at -1.5 dBFS so no variant can clip after encoding.

Usage: python render_sfx.py [id ...]   (default: all; runs in parallel over the CPU cores)
"""
from __future__ import annotations

import json
import os
import sys
import zlib
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "lib"))
sys.path.insert(0, str(HERE))
import dsp  # noqa: E402
import loud  # noqa: E402
from sounds import REGISTRY  # noqa: E402

SR = dsp.SR
OUT = HERE.parent / ".cache" / "out" / "sfx"
CEILING_DB = -1.5


def tame_presence(x: np.ndarray) -> np.ndarray:
    """If the strongest 1/3 octave in 2-5 kHz sticks out more than 6 dB above the 300 Hz-10 kHz
    median, dip it by the excess (at most 6 dB)."""
    excess = loud.presence_peak(x, SR) - 6
    if excess <= 0 or len(x) < 2048:
        return x
    from scipy import signal

    f, pxx = signal.welch(x, SR, nperseg=min(len(x), 4096))
    band = (f >= 2000) & (f <= 5000)
    f0 = float(f[band][np.argmax(pxx[band])])
    return dsp.peq(x, f0, -min(6.0, excess), 1.4)


def phone_gap(x: np.ndarray) -> float:
    """How much quieter the sound is through a phone speaker (nothing below ~300 Hz), in LU."""
    return loud.max_window_lufs(dsp.hp(x, 300, 4), SR) - loud.max_window_lufs(x, SR)


def phone_enhance(x: np.ndarray, want_gap: float = -8.0) -> np.ndarray:
    """Harmonic bass enhancement for small speakers: if most of the weight sits below 300 Hz, add
    saturated upper harmonics of the lows (the ear hears the missing fundamental) and trim the deep
    sub a little, until the phone-speaker loudness is within `want_gap` LU of the full-range one."""
    if phone_gap(x) >= want_gap:
        return x
    lows = dsp.lp(x, 160, 2)
    peak = float(np.max(np.abs(lows))) + 1e-9
    harm = dsp.lp(dsp.hp(np.tanh(lows / peak * 4.0) * peak, 200, 2), 1800, 2)
    y = dsp.shelf(x, 90, -3.0, high=False)
    for a in (0.3, 0.5, 0.8, 1.2, 1.8, 2.5):
        cand = y + harm * a
        if phone_gap(cand) >= want_gap:
            return cand
    return y + harm * 2.5


def finish(x: np.ndarray, spec: dict) -> np.ndarray:
    x = np.asarray(x, dtype=float)
    if x.ndim == 2:
        x = x.mean(axis=1)
    x = dsp.hp(x, spec["hp"], 2)
    x = phone_enhance(x, spec["phone_gap"])
    if spec["noisy"]:
        x = tame_presence(x)
    if spec["timed"]:
        # Timed sounds keep their exact start and length (the game syncs to them).
        n = dsp.n_of(spec["max_s"])
        x = dsp.fade(dsp.pad_to(x, n), 0, 0.03)
    else:
        x = dsp.trim(x, floor_db=-58, tail_fade=0.03)
        if spec["max_s"] and len(x) > dsp.n_of(spec["max_s"]):
            x = dsp.fade(x[: dsp.n_of(spec["max_s"])], 0, min(0.25, spec["max_s"] / 5))
    for _ in range(3):
        lvl = loud.max_window_lufs(x, SR)
        x = x * dsp.db(spec["target"] - lvl)
        x = dsp.limit(x, CEILING_DB, lookahead=0.002, release=0.05)
    # A 1 ms fade-in removes any DC step at the very start.
    return dsp.fade(x, 0.001, 0.003)


def render_one(sid: str) -> dict:
    spec = REGISTRY[sid]
    out = []
    for v in range(spec["variants"]):
        rng = np.random.default_rng((zlib.crc32(sid.encode()) * 31 + v * 7919) & 0xFFFFFFFF)
        x = finish(spec["fn"](v, rng), spec)
        sf.write(str(OUT / f"{sid}.{v}.wav"), x.astype(np.float32), SR, subtype="FLOAT")
        out.append(round(len(x) / SR, 3))
    return {"id": sid, "variants": spec["variants"], "target": spec["target"], "noisy": spec["noisy"], "seconds": out}


def main(ids: list[str] | None = None) -> dict:
    OUT.mkdir(parents=True, exist_ok=True)
    ids = ids or list(REGISTRY)
    unknown = [i for i in ids if i not in REGISTRY]
    if unknown:
        raise SystemExit(f"unknown sound ids: {unknown}")
    idx_path = OUT / "index.json"
    index = json.loads(idx_path.read_text()) if idx_path.exists() else {}
    with ProcessPoolExecutor(max_workers=os.cpu_count() or 2) as ex:
        for info in ex.map(render_one, ids):
            index[info["id"]] = info
            print(f"  {info['id']}: {info['seconds']}")
    index = {k: index[k] for k in REGISTRY if k in index}
    idx_path.write_text(json.dumps(index, indent=1))
    return index


if __name__ == "__main__":
    main(sys.argv[1:] or None)
