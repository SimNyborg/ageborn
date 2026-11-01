"""Visible battle damage (queue item 40, design 3.4): the quiet material layer of a damage step, the moment a unit
crosses 75%, 50% or 25% of its HP and a new mark appears on it. The battle view plays one of these with the step's
burst, 4 dB under the hit that caused it (the hit stays the loudest beat, A13), at most one per material per 200 ms and
at low priority; small and medium bodies only at their last step.

- `dmg_rip` (cloth and hide): a short tearing rip with loose threads.
- `dmg_clank` (a metal dent, a plate coming off): a dull plate clank with a short rattle as it lands.
- `dmg_splinter` (wood): a dry split and a few splinters.
- `dmg_crunch` (stone, crystal, bone, glass): a hard chip and gritty crumbs.
- `dmg_zap` (energy bodies and electrics): a short crackling zap.
- `dmg_ignite` (a machine's last stage, the fire catching): a soft low whump and a breath of flame.

Loudness: -31 to -32 LUFS (the material layers of the combat pass sit at -28: these are quieter still, a texture
under the battle, not a beat of their own). Imported at the end of sounds.py. Until a render runs, the game plays the
ZzFX versions in `src/audio/sounds.ts`.
"""
from __future__ import annotations

import numpy as np

from kit import SIDE_STICK, WOOD_LO, at, bell, bp, cloth, crack, crackle, debris, dsp, env_exp, knock, lp, mixdown, n_of, noise, perc, room, thump
from sounds import pv, sfx

# ------------------------------------------------------------------------------------------------ helpers


def _rip(rng: np.random.Generator, dur: float, lo: float, hi: float) -> np.ndarray:
    """A tear: band-passed noise chopped into fast grains that speed up (fibres giving way one after another)."""
    x = bp(noise(dur, rng, "white"), lo, hi)
    t = np.arange(n_of(dur)) / dsp.SR
    rate = 90 + 260 * (t / max(dur, 1e-6))
    chop = 0.5 + 0.5 * np.sign(np.sin(2 * np.pi * np.cumsum(rate) / dsp.SR))
    return x[: len(chop)] * chop * env_exp(dur, dur * 0.45, 0.004)[: len(chop)]


# ------------------------------------------------------------------------------------------------ the layers


@sfx("dmg_rip", -32, 3, hp_hz=600, noisy=True)
def dmg_rip(v, rng):
    p = pv(v)
    tear = _rip(rng, 0.11 * p, 1400, 6500)
    threads = cloth(rng, 0.09) * 0.5
    return mixdown(tear, at(0.04, threads))


@sfx("dmg_clank", -31, 3, hp_hz=250, noisy=True)
def dmg_clank(v, rng):
    p = pv(v)
    plate = ((1, 1.0), (2.1, 0.5), (3.3, 0.25), (4.6, 0.12))
    ring = bell([620, 540, 700][v % 3] * p, 0.22, 0.7, 0.05, plate)
    tick = lp(perc(SIDE_STICK, 100, pitch=0.9 * p, length=0.05), 5000, 2)
    rattle = debris(rng, 0.14, 120, 1500, 5500, 0.04, 0.004) * 0.4
    return mixdown(tick, at(0.002, ring, 0.7), at(0.05, rattle))


@sfx("dmg_splinter", -31, 3, hp_hz=200)
def dmg_splinter(v, rng):
    p = pv(v)
    split = crack(rng, 0.04, 900, 5200, 0.01)
    thock = perc(WOOD_LO, 96, pitch=[0.8, 0.9, 0.74][v % 3] * p, length=0.08)
    splinters = debris(rng, 0.12, 160, 2000, 7000, 0.035, 0.004) * 0.45
    return mixdown(split, at(0, thock, 0.5), at(0.01, splinters))


@sfx("dmg_crunch", -31, 3, hp_hz=300, noisy=True)
def dmg_crunch(v, rng):
    p = pv(v)
    chip = knock([1500, 1300, 1700][v % 3] * p, 0.05, 0.012, rng, ((1.0, 1.0), (1.9, 0.5), (3.1, 0.25)))
    grit = debris(rng, 0.13, 220, 1200, 6000, 0.04, 0.003) * 0.5
    return mixdown(crack(rng, 0.03, 1200, 6000, 0.008), at(0, chip, 0.6), at(0.008, grit))


@sfx("dmg_zap", -32, 3, hp_hz=400, noisy=True)
def dmg_zap(v, rng):
    p = pv(v)
    t = np.arange(n_of(0.09)) / dsp.SR
    f = 1300 * p * np.exp(-t / 0.05) + 300
    buzz = np.sign(np.sin(2 * np.pi * np.cumsum(f) / dsp.SR)) * env_exp(0.09, 0.03, 0.001)[: len(t)] * 0.35
    sparks = crackle(rng, 0.1, 500, 0.04) * 0.5
    return mixdown(lp(buzz, 6000, 2), at(0, sparks))


@sfx("dmg_ignite", -30, 3, hp_hz=60)
def dmg_ignite(v, rng):
    p = pv(v)
    whump = thump(110 * p, 55, 0.3, 0.04, 0.12, 1.4, hp_hz=60)
    breath = bp(noise(0.35, rng, "pink"), 250, 2200) * env_exp(0.35, 0.12, 0.03) * 0.6
    lick = crackle(rng, 0.3, 120, 0.12) * 0.25
    return room(mixdown(whump, at(0.01, breath), at(0.05, lick)), rng, 0.3, 0.12)


__all__ = ["dmg_rip", "dmg_clank", "dmg_splinter", "dmg_crunch", "dmg_zap", "dmg_ignite"]
