"""Building blocks for the sound effects: transients, bodies, tails, bells, plucks, whooshes, debris,
and General MIDI layers from FluidSynth.

Every effect is built as layers: a short transient (the click that makes it read at low volume), a
body (the pitch and weight), and a tail (air, room, debris). Functions return mono float arrays at
48 kHz.
"""
from __future__ import annotations

import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
import dsp  # noqa: E402
import gm  # noqa: E402
from dsp import SR, db, env_exp, fade, hp, layer, lp, bp, n_of, noise, osc, peq, sat  # noqa: E402,F401

# ------------------------------------------------------------------------------------------------
# Transients


def click(rng: np.random.Generator, dur: float = 0.006, lo: float = 1500, hi: float = 8000, tau: float = 0.0015) -> np.ndarray:
    """A short band-limited tick: the attack that keeps an effect readable on small speakers."""
    return bp(noise(dur, rng), lo, hi) * env_exp(dur, tau, 0.0002) * 2.5


def blip(freq: float, dur: float = 0.03, tau: float = 0.008, shape: str = "sine") -> np.ndarray:
    return osc(freq, shape, dur) * env_exp(dur, tau, 0.0005)


# ------------------------------------------------------------------------------------------------
# Bodies


def thump(f0: float, f1: float, dur: float, pitch_tau: float = 0.03, amp_tau: float = 0.08, drive: float = 1.6, harm: float = 0.3) -> np.ndarray:
    """A pitched-down sine punch (kick-drum style) with a touch of saturation and a 2nd harmonic,
    so it stays audible on phone speakers that cannot play the fundamental."""
    f = dsp.drop(f0, f1, dur, pitch_tau)
    x = osc(f, "sine") + harm * osc(f * 2, "sine") * env_exp(dur, amp_tau * 0.5)
    return sat(x * env_exp(dur, amp_tau, 0.001), drive)


def tone(freq, dur: float, shape: str = "sine", attack: float = 0.005, tau: float | None = None, release: float = 0.05) -> np.ndarray:
    x = osc(freq, shape, dur)
    if tau is not None:
        return x * env_exp(dur, tau, attack)
    return x * dsp.env_adsr(dur, attack, dur, 1.0, min(release, dur / 2))


def nburst(rng: np.random.Generator, dur: float, lo: float, hi: float, tau: float, attack: float = 0.001, color: str = "white") -> np.ndarray:
    return bp(noise(dur, rng, color), lo, hi) * env_exp(dur, tau, attack)


def rumble(rng: np.random.Generator, dur: float, cutoff: float = 250, tau: float = 0.4, attack: float = 0.01) -> np.ndarray:
    return lp(noise(dur, rng, "brown"), cutoff, 2) * env_exp(dur, tau, attack) * 2.0


def whoosh(rng: np.random.Generator, dur: float, f0: float, f1: float, res: float = 1.6, peak: float = 0.5, color: str = "pink") -> np.ndarray:
    """Noise through a swept band pass with a swell-and-fade envelope (swings, flights)."""
    x = noise(dur, rng, color)
    centre = dsp.glide(f0, f1, dur)
    y = dsp.sweep_bp(x, centre, res)
    t = np.linspace(0, 1, len(y))
    env = np.where(t < peak, (t / peak) ** 2, ((1 - t) / (1 - peak)) ** 1.5)
    return y * env * 3


# ------------------------------------------------------------------------------------------------
# Tonal colour


def bell(freq: float, dur: float, bright: float = 1.0, tau: float = 0.5, partials: tuple = ((1, 1.0), (2.0, 0.5), (2.76, 0.35), (4.07, 0.2), (5.4, 0.12))) -> np.ndarray:
    """Additive bell: inharmonic partials, higher ones decaying faster."""
    out = np.zeros(n_of(dur))
    for ratio, amp in partials:
        f = freq * ratio
        if f > 16000:
            continue
        out += osc(f, "sine", dur) * amp * (bright if ratio > 1 else 1) * env_exp(dur, tau / ratio**0.7, 0.001)
    return out


def fm_bell(freq: float, dur: float, ratio: float = 3.5, index: float = 2.5, tau: float = 0.4, idx_tau: float = 0.08) -> np.ndarray:
    idx = index * np.exp(-dsp.tvec(dur) / idx_tau)
    return dsp.fm(np.full(n_of(dur), freq), ratio, idx) * env_exp(dur, tau, 0.001)


def chime(freq: float, dur: float = 0.8, tau: float = 0.35) -> np.ndarray:
    """A soft, round chime: sine plus a gentle FM shimmer and an octave."""
    return 0.7 * blip(freq, dur, tau) + 0.35 * fm_bell(freq, dur, 2.0, 1.2, tau * 0.8, 0.05) + 0.15 * blip(freq * 2, dur, tau * 0.5)


def pluck(freq: float, dur: float, rng: np.random.Generator, damp: float = 0.5, bright: float = 0.6) -> np.ndarray:
    """Karplus-Strong plucked string."""
    n = n_of(dur)
    period = max(2, int(round(SR / freq)))
    buf = lp(rng.standard_normal(period), 800 + 7000 * bright, 1)
    out = np.empty(n)
    a = 0.5 * (1 - damp * 0.02)
    idx = 0
    for i in range(n):
        v = buf[idx]
        nxt = buf[(idx + 1) % period]
        buf[idx] = a * (v + nxt) * 0.998 + 0.0
        out[i] = v
        idx = (idx + 1) % period
    return out * env_exp(dur, dur / 3, 0.0005)


def formant(src: np.ndarray, formants: list[tuple[float, float, float]]) -> np.ndarray:
    """Parallel band passes (centre Hz, bandwidth Hz, gain) for vocal and nasal colours."""
    out = np.zeros_like(src)
    for f, bw, g in formants:
        out += bp(src, max(40, f - bw / 2), f + bw / 2) * g
    return out


def debris(rng: np.random.Generator, dur: float, density: float, lo: float, hi: float, tau: float = 0.3, grain: float = 0.012) -> np.ndarray:
    """Scattered short grains (pebbles, splinters, sparks) with a decaying density."""
    n = n_of(dur)
    out = np.zeros(n)
    t = 0.0
    while t < dur:
        t += rng.exponential(1 / (density * np.exp(-t / tau) + 1e-3))
        if t >= dur:
            break
        g = nburst(rng, grain * (0.5 + rng.random()), lo * (0.7 + 0.6 * rng.random()), hi, grain / 3) * (0.3 + rng.random()) * np.exp(-t / tau)
        i = n_of(t)
        e = min(n, i + len(g))
        out[i:e] += g[: e - i]
    return out


def crackle(rng: np.random.Generator, dur: float, density: float = 300, tau: float = 0.2) -> np.ndarray:
    """Electric crackle: sparse sharp clicks through a band pass."""
    n = n_of(dur)
    imp = (rng.random(n) < density / SR) * rng.uniform(-1, 1, n)
    imp *= np.exp(-np.arange(n) / SR / tau)
    return bp(imp, 900, 6000) * 4


def room(x: np.ndarray, rng: np.random.Generator, size: float = 0.35, wet: float = 0.18, damp: float = 5000) -> np.ndarray:
    """A small mono room around an effect (ties layers together, never washy)."""
    h = dsp.ir(size, rng, predelay=0.006, damp_hz=damp, stereo=False, early=6)
    w = dsp.convolve(x, h) * wet * 0.3
    out = dsp.pad_to(x, len(w))
    return out + w


def at(offset: float, x: np.ndarray, gain: float = 1.0):
    return (offset, x, gain)


def mixdown(*parts) -> np.ndarray:
    return layer(*parts)


# ------------------------------------------------------------------------------------------------
# General MIDI layers (FluidR3_GM)


def gm_note(program: int, midi: int, dur: float = 0.4, vel: int = 110, tail: float = 1.2, drums: bool = False) -> np.ndarray:
    return gm.one_shot(program, midi, dur, vel, drums=drums, tail=tail)


def gm_notes(program: int, notes: list[tuple[float, float, int, int]], tail: float = 1.2, drums: bool = False) -> np.ndarray:
    """(start s, length s, midi, velocity) notes on one GM program, as mono."""
    return gm.phrase(program, notes, drums=drums, tail=tail)


def gm_drum(note: int, vel: int = 110, kit: int = 0, tail: float = 1.0) -> np.ndarray:
    return gm.one_shot(kit, note, 0.2, vel, drums=True, tail=tail)


GM = dict(
    celesta=8, glock=9, musicbox=10, vibes=11, marimba=12, xylo=13, tubular=14, harp=46, timpani=47,
    strings=48, tremolo=44, pizz=45, choir=52, oohs=53, orch_hit=55, trumpet=56, trombone=57, tuba=58,
    horn=60, brass=61, piccolo=72, flute=73, panflute=75, saw=81, square=80, warm_pad=89, taiko=116,
    woodblock=115, timp=47, synth_bass=38, gunshot=127, helicopter=125, breath=121, fret=120,
    seashore=122, reverse_cymbal=119, steel_drum=114, agogo=113, tinkle_bell=112, contrabass=43,
)

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def mn(name: str) -> int:
    pc = NOTE[name[0]]
    rest = name[1:]
    if rest.startswith("#"):
        pc, rest = pc + 1, rest[1:]
    elif rest.startswith("b"):
        pc, rest = pc - 1, rest[1:]
    return 12 * (int(rest) + 1) + pc


def hz(name: str) -> float:
    return dsp.midi_hz(mn(name))
