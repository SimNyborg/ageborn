"""Amber and Dust (queue item 48): the sounds of the collect moment (`src/ui/components/collect.ts`).

A moment plays, in order: the pickup as the pieces burst out of the reward (its swish carries them to the
counter), a tick as each piece lands (the game raises each tick a semitone, so the count climbs), and the
chime as the count ends. Spending plays one short reverse sound.

- **Amber** is warm polished resin: glassy taps like polished stones touching, a honey-warm swish, and a
  round, bright chime (C6 E6 G6 over C5).
- **Dust** is star dust, the rarer one, so it is richer and slower: an airy shimmer with glittering grains,
  glassy twinkles with bell partials, and a deeper, longer chord (C5 G5 E6 B6) with a falling sparkle.

Quiet, as UI sounds are (README "Loudness targets"): pickups and spends -29, ticks -33 (they repeat fast),
chimes -26 (Dust -25.5, it is longer). Musical sounds in C; synthesized only (no soundfont layers).

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import at, bell, blip, bp, chime, click, dsp, env_exp, fm_bell, hz, knock, mixdown, noise, room, whoosh
from sounds import pv, sfx

# Glass-like partials: a polished stone tapping glass (Amber) and a small glass bell (Dust).
RESIN = ((1, 1.0), (2.0, 0.32), (3.0, 0.12), (4.2, 0.06))
TWINKLE = ((1, 1.0), (2.76, 0.45), (5.4, 0.25), (8.9, 0.1))
GLASS = ((1, 1.0), (2.0, 0.35), (2.76, 0.25), (4.07, 0.12))


def resin_tap(freq: float, rng: np.random.Generator, dur: float = 0.12) -> np.ndarray:
    """A polished piece of amber touching another: a short glassy ping, a warm octave under it, a tick."""
    ping = bell(freq, dur, 0.8, 0.035, RESIN)
    warm = blip(freq / 2, dur * 0.7, 0.018)
    return mixdown(ping, at(0, warm, 0.3), at(0, click(rng, 0.003, 3000, 9000), 0.1))


def twinkle(freq: float, dur: float = 0.2, tau: float = 0.05, bright: float = 1.1) -> np.ndarray:
    """A mote of star dust: a tiny glass bell with high inharmonic partials."""
    return bell(freq, dur, bright, tau, TWINKLE)


def air(rng: np.random.Generator, dur: float, lo: float, hi: float, attack: float, release: float) -> np.ndarray:
    """A breath of shimmer: pink noise in a high band with a slow swell and a soft end."""
    return bp(noise(dur, rng, "pink"), lo, hi) * dsp.env_adsr(dur, attack, dur, 1.0, release)


# =================================================================================================
# Amber


@sfx("amber_pickup", -29, 3, hp_hz=200, noisy=True)
def amber_pickup(v, rng):
    # The pieces burst out of the reward: a soft warm toss, three polished stones clinking (G5 C6 E6),
    # and a honey-warm swish that swells as they fly and peaks as they reach the counter (0.6 s later).
    p = pv(v)
    puff = bp(noise(0.06, rng, "pink"), 300, 1800) * env_exp(0.06, 0.018, 0.004)
    taps = [at(0.01 + k * 0.042 + 0.012 * rng.random(), resin_tap(hz(n) * p, rng), g) for k, (n, g) in enumerate((("G5", 0.6), ("C6", 0.75), ("E6", 0.65)))]
    swish = whoosh(rng, 0.55, 450 * p, 2400 * p, 1.3, 0.85) * 0.32
    return mixdown(at(0, puff, 0.5), *taps, at(0.12, swish))


@sfx("amber_tick", -33, 3, hp_hz=400)
def amber_tick(v, rng):
    # One piece lands in the counter: a warm glass-and-resin "tink" (E6). The game pitches each tick.
    f = hz("E6") * [1.0, 1.004, 0.996][v]
    return resin_tap(f, rng, 0.11)


@sfx("amber_chime", -26, 2, hp_hz=180)
def amber_chime(v, rng):
    # The count ends: a warm, round chime, C6 E6 G6 rolled over a soft C5, with a little sparkle on top.
    roll = (0.0, 0.035, 0.07) if v == 0 else (0.0, 0.03, 0.062)
    bells = [at(t, chime(hz(n), 0.95, 0.32), g) for t, n, g in zip(roll, ("C6", "E6", "G6"), (0.7, 0.55, 0.5))]
    body = at(0, chime(hz("C5"), 0.85, 0.3), 0.35)
    sparkle = at(0.09, fm_bell(hz("C7"), 0.5, 2.0, 1.2, 0.16, 0.03), 0.12)
    return room(mixdown(*bells, body, sparkle), rng, 0.3, 0.16)


@sfx("amber_spend", -29, 2, hp_hz=200, noisy=True)
def amber_spend(v, rng):
    # Amber is spent: the pieces leave the counter, glassy taps stepping down (E6 C6 G5) on a falling
    # swish, and a soft knock as they land in what was bought.
    p = pv(v)
    taps = [at(k * 0.04, resin_tap(hz(n) * p, rng), g) for k, (n, g) in enumerate((("E6", 0.6), ("C6", 0.55), ("G5", 0.5)))]
    swish = whoosh(rng, 0.3, 2600 * p, 700 * p, 1.2, 0.35) * 0.4
    land = knock(620 * p, 0.09, 0.016, rng)
    return mixdown(*taps, at(0.02, swish), at(0.3, land, 0.32))


# =================================================================================================
# Dust


@sfx("dust_pickup", -29, 3, hp_hz=220, noisy=True)
def dust_pickup(v, rng):
    # Star dust lifts off: a soft glassy bloom (C5 and G5), glittering grains climbing the C pentatonic,
    # and an airy shimmer that swells and sparkles as the motes fly, peaking as they arrive (0.7 s later;
    # slower than Amber's toss).
    p = pv(v)
    bloom = mixdown(blip(hz("C5") * p, 0.5, 0.16), at(0, blip(hz("G5") * p, 0.5, 0.13), 0.6)) * dsp.env_adsr(0.5, 0.03, 0.5, 1.0, 0.2)
    climb = ("C6", "D6", "E6", "G6", "A6", "C7")
    grains = [at(0.02 + k * 0.04 + 0.01 * rng.random(), twinkle(hz(n) * p, 0.18, 0.045), 0.2 + 0.04 * rng.random()) for k, n in enumerate(climb)]
    shimmer = whoosh(rng, 0.72, 1300 * p, 7000 * p, 1.5, 0.85) * 0.26
    high = ("E7", "G7", "D7", "A7", "C8")
    flecks = [at(0.34 + k * 0.08 + 0.02 * rng.random(), twinkle(hz(high[k]) * p, 0.12, 0.03, 0.8), 0.07) for k in range(5)]
    return mixdown(at(0, bloom, 0.35), *grains, at(0.1, shimmer), *flecks)


@sfx("dust_tick", -33, 3, hp_hz=450)
def dust_tick(v, rng):
    # A mote lands in the counter: a glassy twinkle (C6 with bell partials) and a breath of air. The game
    # pitches each tick.
    f = hz("C6") * [1.0, 1.004, 0.996][v]
    breath = air(rng, 0.09, 5000, 12000, 0.004, 0.06)
    return mixdown(twinkle(f, 0.17, 0.055), at(0, breath, 0.05), at(0, blip(f * 2, 0.06, 0.012), 0.12))


@sfx("dust_chime", -25.5, 2, hp_hz=150, max_s=1.6)
def dust_chime(v, rng):
    # The count ends: a deeper, richer chord than Amber's, C5 G5 E6 B6 rolled slowly in glass bells, a
    # sparkle falling through it (E7 to E6) and an airy shimmer that rings out.
    roll = (0.0, 0.055, 0.11, 0.165) if v == 0 else (0.0, 0.05, 0.1, 0.15)
    notes = ("C5", "G5", "E6", "B6")
    chord = [at(t, bell(hz(n), 1.35, 0.9, 0.5, GLASS), g) for t, n, g in zip(roll, notes, (0.6, 0.5, 0.42, 0.22))]
    glass = [at(t, fm_bell(hz(n), 1.0, 3.5, 1.5, 0.35, 0.05), 0.12) for t, n in zip(roll, notes)]
    fall = ("E7", "D7", "C7", "A6", "G6", "E6")
    sparkle = [at(0.21 + k * 0.065, twinkle(hz(n), 0.3, 0.07, 1.2), 0.12) for k, n in enumerate(fall)]
    shimmer = air(rng, 1.2, 4500, 11000, 0.2, 0.7)
    return room(mixdown(*chord, *glass, *sparkle, at(0.05, shimmer, 0.035)), rng, 0.45, 0.22)


@sfx("dust_spend", -29, 2, hp_hz=220, noisy=True)
def dust_spend(v, rng):
    # Dust is spent: glitter falling down the pentatonic (A6 G6 E6 D6 C6) on an airy falling swish,
    # settling into what was bought with a soft glassy bloom (C5).
    p = pv(v)
    fall = ("A6", "G6", "E6", "D6", "C6")
    grains = [at(k * 0.042 + 0.008 * rng.random(), twinkle(hz(n) * p, 0.16, 0.045), 0.22) for k, n in enumerate(fall)]
    swish = whoosh(rng, 0.34, 6500 * p, 1200 * p, 1.4, 0.3) * 0.28
    bloom = mixdown(blip(hz("C5") * p, 0.3, 0.09), at(0, twinkle(hz("C6") * p, 0.25, 0.06, 0.7), 0.5))
    return mixdown(*grains, at(0.02, swish), at(0.3, bloom, 0.4))
