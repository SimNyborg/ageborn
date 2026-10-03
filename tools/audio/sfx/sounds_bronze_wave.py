"""The Bronze wave's sounds (CONTENT_PLAN 5.2, DESIGN A13): the attacks of the 13 new Bronze units, the
two new turrets and the Sandstorm and Charybdis powers.

Same building blocks and loudness targets as `sounds.py` (shots -24..-28, melee swings -27, power
casts -19/-20), so the new cards sit in the existing mix. Every attack opens with a hard mid-band
transient that reads on a phone speaker; the musical ones (the aulos note, the chorus wail) stay in
the Bronze key, D.

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAVES, GM, KIT_ORCH, TOM_LF, TOM_LM, WOOD_HI, WOOD_LO, at, bp, click, crack, debris, dsp, fade, formant, gm_notes,
    grunt, hz, knock, lp, mixdown, mn, n_of, nburst, noise, osc, perc, pluck, room, rumble, sample, thump, whoosh,
)
from sounds import bronze_clang, flutter, pv, sfx


def _cut(x: np.ndarray, d: float, fout: float = 0.25) -> np.ndarray:
    return fade(dsp.pad_to(x, n_of(d))[: n_of(d)], 0.002, fout)


# ---------------------------------------------------------------------------------------- melee


@sfx("kopis_hack", -27, 3, noisy=True)
def kopis_hack(v, rng):
    # Shield Bearer: a short forward-curved blade, a tight chop with a dull bronze ring behind the shield.
    p = pv(v)
    sw = whoosh(rng, 0.13, 500 * p, 2100 * p, 1.8, 0.5)
    chop = mixdown(crack(rng, 0.04, 900, 4200, 0.01), at(0, thump(170 * p, 95, 0.07, 0.01, 0.025), 0.5))
    ring = bronze_clang(620 * p, 0.25, 0.6, 0.06) * 0.18
    return mixdown(sw, at(0.11, chop), at(0.11, ring))


@sfx("rhomphaia_cut", -27, 3, noisy=True)
def rhomphaia_cut(v, rng):
    # Thracian Raider: a long two-handed blade, a fast rising swish that rips through.
    p = pv(v)
    sw = whoosh(rng, 0.2, 380 * p, 2600 * p, 2.0, 0.6)
    rip = bp(noise(0.08, rng), 1800, 6000) * dsp.env_adsr(0.08, 0.002, 0.03, 0.3, 0.04) * 0.6
    return mixdown(sw, at(0.15, rip), at(0.15, thump(150 * p, 90, 0.06, 0.01, 0.02), 0.35))


@sfx("trunk_lash", -24, 3, phone_gap=-6.0)
def trunk_lash(v, rng):
    # War Elephant: a heavy trunk swing, a deep body slam and a short trumpet blast.
    p = pv(v)
    sw = whoosh(rng, 0.24, 180 * p, 900 * p, 1.4, 0.5)
    slam = mixdown(thump(95 * p, 45, 0.3, 0.04, 0.1, 2.2, hp_hz=55), at(0, perc(TOM_LF, 118, KIT_ORCH, pitch=0.7 * p, length=0.3), 0.7))
    d = 0.42
    f = dsp.glide(520 * p, 640 * p, d) * (1 + 0.02 * osc(23, "sine", d))
    horn = formant(osc(f, "saw") + 0.1 * noise(d, rng), [(700, 260, 1.0), (1500, 400, 0.5), (2800, 500, 0.2)])
    horn = horn * dsp.env_adsr(d, 0.02, 0.1, 0.7, 0.18) * 0.7
    return room(mixdown(sw, at(0.16, slam), at(0.2, horn)), rng, 0.4, 0.15)


@sfx("sagaris_sweep", -27, 3, noisy=True)
def sagaris_sweep(v, rng):
    # Amazon Rider: a light axe swept from the saddle, with a hoof stamp and the horse's snort.
    p = pv(v)
    sw = whoosh(rng, 0.16, 600 * p, 2400 * p, 1.8, 0.5)
    bite = mixdown(crack(rng, 0.05, 700, 3600, 0.012), at(0, knock(700 * p, 0.06, 0.015, rng), 0.4))
    hoof = perc(WOOD_LO, 100, pitch=0.6 * p, length=0.06)
    snort = bp(noise(0.12, rng), 300, 1800) * dsp.env_adsr(0.12, 0.004, 0.04, 0.4, 0.06) * 0.35
    return mixdown(at(0, hoof, 0.5), at(0.02, sw), at(0.15, bite), at(0.18, snort))


@sfx("labrys_chop", -24, 3, phone_gap=-6.0)
def labrys_chop(v, rng):
    # Minotaur: a huge double axe, a deep swing, a heavy impact and a bull's grunt.
    p = pv(v)
    sw = whoosh(rng, 0.24, 220 * p, 1400 * p, 1.6, 0.55)
    hit = mixdown(thump(110 * p, 48, 0.26, 0.03, 0.09, 2.4, hp_hz=60), at(0, crack(rng, 0.06, 600, 3200, 0.016), 0.8),
                  at(0, perc(TOM_LM, 120, KIT_ORCH, pitch=0.7 * p, length=0.25), 0.5))
    bull = grunt(rng, 95 * p, 0.28, "o", 0.8) * 0.6
    return room(mixdown(at(0, bull), at(0.04, sw), at(0.22, hit)), rng, 0.35, 0.14)


@sfx("hydra_bite", -24, 3, phone_gap=-6.0)
def hydra_bite(v, rng):
    # Hydra: three heads snap in a quick ripple over a wet hiss and a low growl.
    p = pv(v)
    hiss = bp(noise(0.36, rng), 2400, 7000) * dsp.env_adsr(0.36, 0.03, 0.1, 0.5, 0.15) * 0.4
    growl = lp(osc(dsp.glide(70 * p, 58 * p, 0.4), "saw") * (0.7 + 0.3 * osc(19, "sine", 0.4)), 600) * dsp.env_adsr(0.4, 0.02, 0.1, 0.7, 0.15) * 0.8
    snaps = mixdown(*[at(0.12 + 0.07 * k, mixdown(perc(WOOD_HI, 110, pitch=(0.8 + 0.1 * k) * p, length=0.05), at(0, crack(rng, 0.03, 900, 4200, 0.008), 0.6))) for k in range(3)])
    return room(mixdown(hiss, at(0, growl), at(0, snaps)), rng, 0.4, 0.15)


@sfx("horse_ram", -23, 3, phone_gap=-6.0)
def horse_ram(v, rng):
    # Wooden Horse: a creaking timber frame lurches and its head slams the target.
    p = pv(v)
    creak = bp(osc(dsp.glide(85 * p, 60 * p, 0.22), "saw"), 400, 1500) * dsp.env_adsr(0.22, 0.02, 0.08, 0.6, 0.06) * 0.35
    slam = mixdown(thump(100 * p, 42, 0.32, 0.04, 0.11, 2.4, hp_hz=50), at(0, perc(WOOD_LO, 120, pitch=0.45 * p, length=0.18), 0.8),
                   at(0, crack(rng, 0.07, 500, 2800, 0.02), 0.7), at(0.01, debris(rng, 0.35, 110, 700, 4000, 0.12, 0.012), 0.4))
    return room(mixdown(creak, at(0.2, slam)), rng, 0.4, 0.15)


# ---------------------------------------------------------------------------------------- ranged


@sfx("shot_discus", -27, 3, noisy=True)
def shot_discus(v, rng):
    # Discus Thrower: a spin-up grunt and a whirring bronze disc that hums as it flies.
    p = pv(v)
    wind = whoosh(rng, 0.14, 300 * p, 900 * p, 1.4, 0.4) * 0.6
    whir = flutter(rng, 0.3, 900 * p, 2200 * p, 38 * p, 1.6)
    hum = osc(dsp.glide(410 * p, 360 * p, 0.3), "tri") * dsp.env_adsr(0.3, 0.01, 0.1, 0.5, 0.15) * 0.15
    return mixdown(wind, at(0.1, click(rng, 0.004, 1200, 5000), 0.4), at(0.1, whir), at(0.1, hum))


@sfx("shot_belly_bow", -26, 3)
def shot_belly_bow(v, rng):
    # Belly Bowman: a gastraphetes cocked against the belly, a heavy clack and a deep twang.
    p = pv(v)
    clack = mixdown(perc(CLAVES, 100, pitch=0.6 * p, length=0.05), at(0, nburst(rng, 0.02, 700, 3000, 0.005), 0.7))
    twang = pluck(82 * p, 0.3, rng, bright=0.35)
    thunk = thump(170 * p, 85, 0.08, 0.01, 0.025, 1.8) * 0.6
    fly = whoosh(rng, 0.14, 800, 2400, 2.0, 0.3) * 0.3
    return mixdown(clack, at(0.005, thunk), at(0.006, twang, 0.85), at(0.02, fly))


@sfx("aulos_note", -28, 3)
def aulos_note(v, rng):
    # Aulos Piper: a reedy double-pipe trill on D (the Bronze key), short enough to repeat every 1.2 s.
    notes = [("D5", "F#5"), ("A4", "D5"), ("F#5", "A5")][v % 3]
    d = 0.32
    out = np.zeros(n_of(d))
    for k, name in enumerate(notes):
        f = hz(name) * (1 + 0.006 * osc(6.5, "sine", d / 2))
        reed = osc(f, "saw") * 0.6 + osc(f * 1.003, "square") * 0.25
        reed = formant(reed, [(1100, 500, 1.0), (2600, 700, 0.4)]) * dsp.env_adsr(d / 2, 0.012, 0.05, 0.75, 0.05)
        out = mixdown(out, at(k * d / 2, reed))
    breath = bp(noise(d, rng), 2000, 6000) * dsp.env_adsr(d, 0.01, 0.1, 0.3, 0.1) * 0.08
    return _cut(mixdown(out, at(0, breath)), d, 0.06)


@sfx("chorus_wail", -27, 3)
def chorus_wail(v, rng):
    # Tragic Chorus: masked voices sing a falling lament (D minor) with a hollow, unsettling chord.
    p = pv(v)
    d = 0.6
    out = np.zeros(n_of(d))
    for k, name in enumerate(("D4", "F4", "A4")):
        f = dsp.glide(hz(name) * p * 1.02, hz(name) * p * 0.94, d) * (1 + 0.01 * osc(5 + k, "sine", d))
        voice = formant(osc(f, "saw") + 0.15 * noise(d, rng), [(600, 160, 1.0), (1000, 200, 0.6), (2500, 400, 0.2)])
        out = mixdown(out, at(0.02 * k, voice * dsp.env_adsr(d, 0.06 + 0.02 * k, 0.15, 0.7, 0.2) * 0.45))
    return room(_cut(out, d, 0.15), rng, 0.45, 0.22)


# ---------------------------------------------------------------------------------------- turrets


@sfx("net_cast", -27, 3, noisy=True)
def net_cast(v, rng):
    # Net Caster: a looping rope swish, the release and a soft fluttering net in flight.
    p = pv(v)
    loop = flutter(rng, 0.28, 400 * p, 1200 * p, 9 * p, 1.2) * 0.7
    release = mixdown(click(rng, 0.004, 1000, 4000), at(0, knock(500 * p, 0.05, 0.012, rng), 0.4))
    fly = flutter(rng, 0.25, 700, 2000, 16, 1.3) * 0.4
    return mixdown(loop, at(0.24, release, 0.6), at(0.25, fly))


@sfx("shot_polybolos", -25, 3)
def shot_polybolos(v, rng):
    # Polybolos: the repeating bolt-thrower; a chain ratchet and a sharp torsion snap with a bolt hiss.
    p = pv(v)
    chain = mixdown(*[at(0.03 * k, perc(CLAVES, 84 + 3 * k, pitch=(0.9 + 0.04 * k) * p, length=0.03), 0.45) for k in range(3)])
    snap = mixdown(pluck(96 * p, 0.25, rng, bright=0.4), at(0, perc(WOOD_LO, 112, pitch=0.6 * p, length=0.1), 0.6), at(0, thump(160 * p, 80, 0.1, 0.015, 0.04, 2.0), 0.5))
    bolt = whoosh(rng, 0.18, 900, 2800, 2.0, 0.25) * 0.35
    return room(mixdown(chain, at(0.09, snap), at(0.1, bolt)), rng, 0.25, 0.12)


# ---------------------------------------------------------------------------------------- powers


@sfx("pw_sandstorm", -20, 2, max_s=1.8, noisy=True)
def pw_sandstorm(v, rng):
    # Sandstorm (Field signal, whole lane): a gust slams in, a hissing wall of grit roars down the lane.
    d = 1.7
    t = dsp.tvec(d)
    env = np.clip(t / 0.15, 0, 1) * np.exp(-np.maximum(0, t - 0.6) / 0.6)
    roar = dsp.sweep_lp(noise(d, rng, "pink"), dsp.glide(900, 3600, d, 0.5), 0.8) * env * 1.3
    grit = bp(noise(d, rng), 3500, 10000) * (0.6 + 0.4 * osc(13, "sine", d)) * env * 0.4
    gust = mixdown(nburst(rng, 0.25, 300, 2500, 0.08, 0.002, "pink"), at(0, thump(120, 50, 0.2, 0.03, 0.08, 2.0), 0.5))
    low = rumble(rng, d, 220, 0.5) * 0.6
    return _cut(mixdown(at(0, gust), at(0, roar), at(0, grit), at(0, low)), d, 0.3)


@sfx("pw_whirlpool", -20, 2, max_s=2.4, noisy=True, phone_gap=-6.0)
def pw_whirlpool(v, rng):
    # Charybdis (Home pull): water crashes open into a churning, gurgling vortex that sucks inward.
    d = 2.3
    t = dsp.tvec(d)
    crash = mixdown(thump(80, 36, 0.5, 0.05, 0.16, 2.2, hp_hz=50), at(0, nburst(rng, 0.4, 400, 4000, 0.12, 0.002, "pink"), 1.2))
    swirl_cut = 700 + 500 * np.sin(2 * np.pi * 1.6 * t)
    churn = dsp.sweep_lp(noise(d, rng, "brown"), swirl_cut, 1.2) * np.clip(t / 0.3, 0, 1) * 1.8
    gurgle = debris(rng, d, 40, 200, 1200, 1.2, 0.03) * 0.5
    suck = whoosh(rng, 1.4, 1800, 300, 1.4, 0.7) * 0.5
    return _cut(mixdown(at(0, crash), at(0.05, churn), at(0.2, gurgle), at(0.6, suck)), d, 0.5)
