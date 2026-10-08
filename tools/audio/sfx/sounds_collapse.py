"""The destroyed base's collapse (DESIGN A12, A13; owner feedback 2026-10-07: "the base must have a
better destruction animation"). The game layers these on the art's beats:

- `base_doom_rumble` (the final blow): a deep rumble that swells under groaning stone and cracks for the
  build-up while the base trembles; it peaks where the base gives way.
- `base_destroyed` (the break, every age): the shared crash, a deep boom and a big crack with a rubble
  roar, under
- `base_break_<material>` (the break): the material's own crash. `stone` (Stone, Bronze, Medieval): rock
  crunch, grinding masonry and splintering timber. `iron` (Gunpowder, Industrial): brick and masonry
  crunch, a powder or boiler blast with a fire whoosh, iron clangs. `concrete` (Modern): a heavy slab
  crash, gravel, a rebar ping and electric sparks. `energy` (Future, Cosmic): a shield shattering like
  glass, a falling zap and a deep boom with a shimmer tail.
- `base_debris_<material>` (200 ms after the break): the rattle of debris landing: pebbles and wood
  knocks, metal tinkles and clanks, gravel and rebar, glass tinkles and crackle.
- `base_settle_thud` (the biggest piece hits the ground): a final deep thud with a dust whoosh.

Loudness: the crash is the loudest moment of a match (-16 LUFS window), the material layer sits a
little under it, the rattle and the rumble clearly under (-22, -21). Imported at the end of sounds.py.
"""
from __future__ import annotations

import numpy as np

from kit import (
    GM, KIT_ORCH, KIT_POWER, SNARE, TOM_L, TOM_LF, WOOD_LO, at, bell, bp, crack, crackle, debris, dsp, env_exp,
    hp, knock, lp, mixdown, n_of, nburst, noise, osc, perc, room, rumble, sample, thump, whoosh,
)
from sounds import explosion, glass_bell, sfx


def _grind(rng, dur: float, lo: float, hi: float, rate: float) -> np.ndarray:
    """Grinding masonry: band-passed noise under a fast, uneven tremolo."""
    x = bp(noise(dur, rng, "pink"), lo, hi)
    t = dsp.tvec(dur)
    am = 0.55 + 0.45 * np.abs(np.sin(2 * np.pi * rate * t + 1.7 * np.sin(2 * np.pi * 3.1 * t)))
    return x * am * env_exp(dur, dur * 0.6, 0.04) * 1.6


def _clang(freq: float, dur: float = 0.5) -> np.ndarray:
    """A struck iron bar: inharmonic partials, the high ones dying fast."""
    return bell(freq, dur, 0.9, 0.12, ((1, 1.0), (2.76, 0.7), (5.4, 0.45), (8.9, 0.25)))


def _tinkles(rng, dur: float, count: int, lo: float, hi: float, glass: bool) -> np.ndarray:
    out = np.zeros(n_of(dur + 0.4))
    for k in range(count):
        t0 = rng.uniform(0, dur) ** 1.3 / dur ** 0.3
        f = rng.uniform(lo, hi)
        g = glass_bell(f, 0.3, 0.12, 0.6) if glass else bell(f, 0.25, 0.8, 0.06, ((1, 1), (2.4, 0.6), (4.1, 0.3)))
        g = g * (0.35 + 0.65 * rng.random()) * (1 - 0.6 * t0 / dur)
        i = n_of(t0)
        e = min(len(out), i + len(g))
        out[i:e] += g[: e - i]
    return out


def _knocks(rng, dur: float, count: int, p: float = 1.0) -> np.ndarray:
    """Stones and wood pieces landing: dry knocks with a decaying density."""
    out = np.zeros(n_of(dur + 0.3))
    for k in range(count):
        t0 = rng.uniform(0, dur) ** 1.5 / dur ** 0.5
        g = knock(rng.uniform(380, 900) * p, 0.07, 0.016, rng) * (0.4 + 0.6 * rng.random()) * (1 - 0.7 * t0 / dur)
        i = n_of(t0)
        e = min(len(out), i + len(g))
        out[i:e] += g[: e - i]
    return out


# ------------------------------------------------------------------------------------- build-up


@sfx("base_doom_rumble", -21, 2, max_s=0.85, phone_gap=-6.0)
def base_doom_rumble(v, rng):
    d = 0.8
    t = dsp.tvec(d)
    swell = np.clip(t / 0.52, 0, 1) ** 1.6 * np.where(t < 0.55, 1.0, np.exp(-(t - 0.55) / 0.08))
    rum = lp(noise(d, rng, "brown"), 220, 2) * swell * 3.0
    sub = thump(62, 48, d, 0.4, 0.5, 1.6, hp_hz=40) * swell
    groan = _grind(rng, d, 160, 900, [13.0, 15.5][v]) * swell * 0.7
    cracks = mixdown(*[at(tt, crack(rng, 0.05, 700, 3600, 0.014), g) for tt, g in ((0.12, 0.35), (0.27, 0.5), (0.38, 0.45), (0.47, 0.7), (0.52, 0.8))])
    trickle = debris(rng, d, 90, 900, 4200, 0.5, 0.01) * 0.35 * np.clip(t / 0.3, 0, 1)[: n_of(d)]
    return room(mixdown(rum, at(0, sub, 0.7), at(0, groan), at(0, cracks), at(0, trickle)), rng, 0.45, 0.15)


# ------------------------------------------------------------------------------------- the break


@sfx("base_destroyed", -16, 2, max_s=2.0, phone_gap=-6.0)
def base_destroyed(v, rng):
    # The shared crash: a big blast with a deep boom, a huge crack and a roar of rubble.
    big = explosion(rng, 1.0, [0.82, 0.76][v])
    boom = thump(78, 34, 1.2, 0.09, 0.32, 2.6, hp_hz=45)
    snap = mixdown(crack(rng, 0.09, 500, 3200, 0.03), at(0.004, crack(rng, 0.06, 1200, 5000, 0.015), 0.6))
    roar = _grind(rng, 1.5, 120, 1400, 9.0) * 0.8
    rain = debris(rng, 1.6, 70, 500, 3800, 0.6, 0.016) * 0.55
    return mixdown(big, at(0, boom, 0.9), at(0, snap, 0.9), at(0.06, roar), at(0.18, rain))


@sfx("base_break_stone", -18, 2, max_s=1.5, noisy=True, phone_gap=-6.0)
def base_break_stone(v, rng):
    p = [1.0, 0.93][v]
    toms = mixdown(perc(TOM_LF, 127, KIT_ORCH, pitch=0.55 * p, length=0.7), at(0.07, perc(TOM_L, 120, KIT_ORCH, pitch=0.6 * p, length=0.5), 0.7))
    crunch = mixdown(*[at(tt, crack(rng, 0.06, 450, 2600, 0.02), g) for tt, g in ((0.0, 1.0), (0.05, 0.7), (0.12, 0.8), (0.21, 0.6), (0.33, 0.5))])
    grind = _grind(rng, 1.2, 250, 1600, 11.0) * 0.8
    splinter = mixdown(at(0.03, crack(rng, 0.03, 2200, 7000, 0.006), 0.6), at(0.09, crack(rng, 0.03, 2600, 7500, 0.006), 0.5),
                       at(0.04, perc(WOOD_LO, 110, pitch=0.7 * p, length=0.12), 0.5))
    knocks = _knocks(rng, 0.9, 10, p) * 0.5
    return room(mixdown(toms, at(0, crunch), at(0.02, grind), at(0, splinter), at(0.2, knocks)), rng, 0.5, 0.18)


@sfx("base_break_iron", -18, 2, max_s=1.6, noisy=True, phone_gap=-6.0)
def base_break_iron(v, rng):
    p = [1.0, 0.94][v]
    blast = explosion(rng, 0.55, 0.9 * p)
    crunch = mixdown(*[at(tt, crack(rng, 0.05, 500, 3000, 0.018), g) for tt, g in ((0.0, 0.9), (0.08, 0.6), (0.17, 0.6))])
    clangs = mixdown(at(0.05, _clang(430 * p, 0.6), 0.5), at(0.19, _clang(610 * p, 0.5), 0.4), at(0.34, _clang(520 * p, 0.45), 0.35))
    fire = whoosh(rng, 0.9, 260, 1300, 1.1, 0.25, "pink") * 0.6
    grind = _grind(rng, 1.0, 200, 1300, 10.0) * 0.6
    return room(mixdown(blast, at(0, crunch), at(0, clangs), at(0.04, fire), at(0.06, grind)), rng, 0.5, 0.18)


@sfx("base_break_concrete", -18, 2, max_s=1.5, noisy=True, phone_gap=-6.0)
def base_break_concrete(v, rng):
    p = [1.0, 0.95][v]
    slab = mixdown(thump(70 * p, 38, 0.8, 0.06, 0.24, 2.4, hp_hz=48), at(0, perc(SNARE, 127, KIT_POWER, pitch=0.5 * p, length=0.6), 0.8))
    body = nburst(rng, 1.0, 140, 900, 0.25, 0.002, "pink") * 1.3
    crunch = mixdown(*[at(tt, crack(rng, 0.05, 600, 3400, 0.016), g) for tt, g in ((0.0, 1.0), (0.06, 0.6), (0.15, 0.5))])
    rebar = mixdown(at(0.08, bell(1650 * p, 0.6, 1.0, 0.18, ((1, 1), (2.9, 0.5), (5.6, 0.3))), 0.3), at(0.26, bell(1980 * p, 0.45, 1.0, 0.14, ((1, 1), (2.7, 0.5))), 0.22))
    sparks = crackle(rng, 0.6, 260, 0.18) * 0.4
    gravel = debris(rng, 1.2, 120, 700, 4200, 0.4, 0.012) * 0.6
    return room(mixdown(slab, at(0, body), at(0, crunch), at(0, rebar), at(0.05, sparks), at(0.12, gravel)), rng, 0.45, 0.16)


@sfx("base_break_energy", -18, 2, max_s=1.6, noisy=True, phone_gap=-6.0)
def base_break_energy(v, rng):
    p = [1.0, 0.94][v]
    boom = thump(90 * p, 36, 0.9, 0.07, 0.26, 2.4, hp_hz=48)
    d = 0.5
    sweep = osc(dsp.glide(2400 * p, 160, d, 0.6), "saw") * env_exp(d, 0.18, 0.002)
    zap = bp(sweep, 300, 5000) * 0.7
    shatter = mixdown(nburst(rng, 0.25, 2500, 9000, 0.05, 0.0008) * 1.2, at(0, _tinkles(rng, 0.7, 26, 2200, 6200, True), 0.9))
    shimmer = mixdown(*[at(0.1 + 0.06 * k, glass_bell(f * p, 1.0, 0.5, 0.7), 0.25) for k, f in enumerate((1318.5, 1760.0, 2349.3))])
    hum = osc(np.full(n_of(0.6), 110.0 * p), "sine") * env_exp(0.6, 0.15, 0.002) * 0.5
    return room(mixdown(boom, at(0, zap), at(0, shatter), at(0.05, shimmer), at(0, hum)), rng, 0.5, 0.2)


# ------------------------------------------------------------------------------------- the rattle


@sfx("base_debris_stone", -22, 2, max_s=1.6, phone_gap=-5.0)
def base_debris_stone(v, rng):
    p = [1.0, 1.06][v]
    knocks = _knocks(rng, 1.2, 18, p)
    grains = debris(rng, 1.3, 110, 600, 3800, 0.45, 0.012) * 0.7
    wood = mixdown(*[at(rng.uniform(0.05, 0.7), perc(WOOD_LO, 96, pitch=rng.uniform(0.6, 0.85) * p, length=0.1), 0.35) for _ in range(4)])
    return room(mixdown(knocks, at(0, grains), at(0, wood)), rng, 0.4, 0.15)


@sfx("base_debris_iron", -22, 2, max_s=1.6, phone_gap=-5.0)
def base_debris_iron(v, rng):
    p = [1.0, 1.05][v]
    tink = _tinkles(rng, 1.1, 14, 1700 * p, 3800 * p, False) * 0.6
    clanks = mixdown(*[at(rng.uniform(0.05, 0.8), _clang(rng.uniform(380, 720) * p, 0.35), 0.3) for _ in range(4)])
    knocks = _knocks(rng, 1.1, 12, 0.85 * p) * 0.7
    grains = debris(rng, 1.2, 90, 700, 4000, 0.4, 0.012) * 0.5
    return room(mixdown(tink, at(0, clanks), at(0, knocks), at(0, grains)), rng, 0.4, 0.15)


@sfx("base_debris_concrete", -22, 2, max_s=1.6, phone_gap=-5.0)
def base_debris_concrete(v, rng):
    p = [1.0, 1.04][v]
    gravel = debris(rng, 1.3, 150, 500, 4200, 0.5, 0.014)
    knocks = _knocks(rng, 1.1, 12, 0.75 * p) * 0.6
    ping = mixdown(at(0.3, bell(2100 * p, 0.4, 1.0, 0.12, ((1, 1), (2.8, 0.4))), 0.2), at(0.62, bell(1750 * p, 0.35, 1.0, 0.1, ((1, 1), (2.6, 0.4))), 0.15))
    return room(mixdown(gravel, at(0, knocks), at(0, ping)), rng, 0.4, 0.15)


@sfx("base_debris_energy", -23, 2, max_s=1.6, phone_gap=-5.0)
def base_debris_energy(v, rng):
    p = [1.0, 1.05][v]
    glass = _tinkles(rng, 1.2, 22, 2600 * p, 7200 * p, True) * 0.7
    fizz = crackle(rng, 1.2, 140, 0.5) * 0.35
    knocks = _knocks(rng, 1.0, 8, 1.1 * p) * 0.4
    return room(mixdown(glass, at(0, fizz), at(0, knocks)), rng, 0.45, 0.18)


# ------------------------------------------------------------------------------------- the final thud


@sfx("base_settle_thud", -19, 2, max_s=1.1, phone_gap=-6.0)
def base_settle_thud(v, rng):
    p = [1.0, 0.9][v]
    thud = thump(66 * p, 32, 0.9, 0.07, 0.25, 2.6, hp_hz=42)
    tom = perc(TOM_LF, 127, KIT_ORCH, pitch=0.5 * p, length=0.8)
    dust = whoosh(rng, 0.8, 900, 300, 1.0, 0.08, "pink") * 0.45
    crunch = mixdown(crack(rng, 0.05, 500, 2600, 0.02), at(0.03, crack(rng, 0.04, 700, 3200, 0.012), 0.5))
    rocks = _knocks(rng, 0.6, 7, 0.8 * p) * 0.45
    return room(mixdown(thud, at(0, tom, 0.9), at(0, crunch, 0.7), at(0.02, dust), at(0.08, rocks)), rng, 0.45, 0.16)
