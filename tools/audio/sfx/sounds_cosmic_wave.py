"""The Cosmic wave's sounds (CONTENT_PLAN 5.8, DESIGN A13): the attacks of the 13 new Cosmic units and the Swarm
Matron's Swarmling, the two new turrets and the Meteor Drizzle and Pulsar Pulse powers.

Same building blocks and loudness targets as `sounds.py` (shots -22..-25, melee hits -26/-27, turrets -21/-22,
power casts -19/-20), so the new cards sit in the existing mix. Cosmic is airy synthesis: glassy crystal bells,
soft FM chirps, deep sub swells and starry glints, always opened by a short click or snap so every attack reads
on a phone speaker. The Leviathan's song is the one musical sound (a low whale call on A with a fifth above).

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    at, bell, bp, click, crack, crackle, dsp, env_exp, fade, fm_bell, hz, lp, mixdown, n_of, noise, osc, room, sat,
    thump, whoosh,
)
from sounds import pv, sfx
from sounds_future_wave import _cut, _pew, _servo, _zap


def _glass(f0: float, dur: float = 0.4, tau: float = 0.12, gain: float = 1.0) -> np.ndarray:
    """A crystal bell: bright inharmonic partials with a quick shimmer."""
    return bell(f0, dur, 0.9 * gain, tau, ((1, 1.0), (2.76, 0.5), (5.4, 0.25), (8.9, 0.12)))


def _glints(rng, n: int, f0: float, p: float, step: float = 0.05, gain: float = 0.12) -> np.ndarray:
    return mixdown(*[at(step * k, fm_bell((f0 + 230 * k) * p, 0.18, 3.5, 1.0, 0.05, 0.02), gain) for k in range(n)])


# ---------------------------------------------------------------------------------------- melee


@sfx("crystal_slam", -26, 3, noisy=True, phone_gap=-6.0)
def crystal_slam(v, rng):
    # Crystal Guard: a heavy fist thud with a glassy ring and a scatter of shard tinkles.
    p = pv(v)
    hit = mixdown(thump(120 * p, 60, 0.16, 0.01, 0.05, 1.8), at(0, crack(rng, 0.03, 1500, 7000, 0.006), 0.5))
    ring_ = _glass(1760 * p, 0.45, 0.14, 0.6)
    return mixdown(hit, at(0.005, ring_, 0.5), at(0.03, _glints(rng, 4, 3000, p, 0.035, 0.1)))


@sfx("board_kick", -26, 3, noisy=True)
def board_kick(v, rng):
    # Void Skimmer: the hover board's whine surges, the board flips with a whoosh and the kick lands with a smack.
    p = pv(v)
    fan = _servo(0.3, 380 * p, 820 * p, 0.25)
    flip = whoosh(rng, 0.12, 1400 * p, 3800 * p, 2.0, 0.4) * 0.7
    smack = mixdown(thump(160 * p, 90, 0.08, 0.006, 0.03, 1.6), at(0, click(rng, 0.005, 1500, 6000), 0.5))
    return mixdown(fan, at(0.1, flip), at(0.17, smack))


@sfx("swarm_bite", -27, 3, noisy=True)
def swarm_bite(v, rng):
    # Swarmling: a skittering chitter, then a sharp clicky snap of mandibles.
    p = pv(v)
    chit = mixdown(*[at(0.012 * k, click(rng, 0.004, 2500 * p, 9000), 0.35) for k in range(5)])
    snap = mixdown(crack(rng, 0.02, 2000, 9000, 0.004), at(0, thump(300 * p, 160, 0.05, 0.004, 0.02, 1.4), 0.4))
    return mixdown(chit, at(0.07, snap))


@sfx("golem_uppercut", -25, 3, noisy=True, phone_gap=-6.0, max_s=0.9)
def golem_uppercut(v, rng):
    # Asteroid Golem: a grinding rock swing, a deep boom and a rattle of falling pebbles.
    p = pv(v)
    grind = bp(noise(0.2, rng, "brown"), 200, 1200) * dsp.env_adsr(0.2, 0.08, 0.05, 0.7, 0.06) * 0.4
    boom = mixdown(thump(70 * p, 38, 0.32, 0.012, 0.09, 2.0), at(0, crack(rng, 0.04, 800, 4000, 0.01), 0.5))
    pebbles = mixdown(*[at(0.05 + 0.045 * k, click(rng, 0.008, 600, 3000), 0.3 - 0.03 * k) for k in range(6)])
    return mixdown(grind, at(0.16, boom), at(0.18, pebbles))


# ---------------------------------------------------------------------------------------- ranged


@sfx("moon_spit", -25, 4, noisy=True)
def moon_spit(v, rng):
    # Moonlings (and the Leviathan's riders): a cheeky little "ptoo" with a rising bubbly chirp.
    p = pv(v)
    f = dsp.glide(420 * p, 1300 * p, 0.1)
    chirp = osc(f, "sine") * env_exp(0.1, 0.05, 0.002) * 0.6
    puff = bp(noise(0.05, rng), 1500, 5000) * env_exp(0.05, 0.02, 0.001) * 0.5
    return mixdown(puff, at(0.01, chirp))


@sfx("nova_lob", -24, 3)
def nova_lob(v, rng):
    # Nova Thrower: the orb's glow swells with a rising hum, then a soft whoomp as it leaves the hand.
    p = pv(v)
    swell = osc(dsp.glide(260 * p, 700 * p, 0.22), "sine") * dsp.env_adsr(0.22, 0.18, 0.02, 0.6, 0.02) * 0.25
    whoomp = mixdown(thump(150 * p, 80, 0.12, 0.01, 0.04, 1.6), at(0, fm_bell(880 * p, 0.3, 1.5, 1.4, 0.1, 0.02), 0.4))
    return mixdown(swell, at(0.2, whoomp), at(0.2, _glints(rng, 3, 2400, p, 0.04, 0.08)))


@sfx("shot_star_mortar", -23, 3, noisy=True)
def shot_star_mortar(v, rng):
    # Star Mortar: a hollow gravity thoomp and a bright star chime as the tiny star sails up.
    p = pv(v)
    thoomp = mixdown(thump(110 * p, 55, 0.22, 0.01, 0.06, 2.0), at(0, bp(noise(0.12, rng, "pink"), 300, 1200) * env_exp(0.12, 0.05, 0.002), 0.4))
    chime_ = _glass(1320 * p, 0.5, 0.18, 0.5)
    return mixdown(thoomp, at(0.03, chime_), at(0.05, _glints(rng, 3, 3200, p, 0.06, 0.08)))


@sfx("shot_antimatter", -22, 3, noisy=True, phone_gap=-6.0)
def shot_antimatter(v, rng):
    # Antimatter Rifler: a whining charge, a hard snap and a deep recoil thump.
    p = pv(v)
    charge = osc(dsp.glide(200 * p, 1100 * p, 0.15), "saw") * dsp.env_adsr(0.15, 0.12, 0.02, 0.6, 0.02) * 0.12
    snap = mixdown(crack(rng, 0.03, 1500, 9000, 0.006), at(0, _pew(rng, p, 1600, 300, 0.18, 0.7)))
    recoil = thump(80 * p, 40, 0.25, 0.01, 0.07, 2.0)
    return mixdown(lp(charge, 4000), at(0.15, snap), at(0.15, recoil, 0.8))


@sfx("tendril_flick", -25, 3, noisy=True)
def tendril_flick(v, rng):
    # Bio-Weaver: a wet whip of a living tendril, a crack at the tip and a soft organic squelch.
    p = pv(v)
    whip = whoosh(rng, 0.09, 1800 * p, 5000 * p, 2.2, 0.4) * 0.7
    tip = crack(rng, 0.02, 2500, 9000, 0.004) * 0.6
    squelch = bp(noise(0.08, rng, "pink"), 400, 1500) * env_exp(0.08, 0.03, 0.002) * 0.4
    return mixdown(whip, at(0.07, tip), at(0.08, squelch))


@sfx("void_whisper", -25, 3, noisy=True)
def void_whisper(v, rng):
    # Void Whisperer: a breathy, reversed-sounding whisper swelling into a low warble.
    p = pv(v)
    d = 0.4
    breath = dsp.sweep_bp(noise(d, rng), dsp.glide(900 * p, 2400 * p, d), 3.0) * np.sin(np.linspace(0, np.pi, n_of(d))) * 0.5
    warble = osc(220 * p * (1 + 0.04 * osc(7, "sine", d)), "sine") * np.sin(np.linspace(0, np.pi, n_of(d))) ** 2 * 0.25
    return _cut(mixdown(at(0, click(rng, 0.004, 800, 4000), 0.3), breath, warble), d)


@sfx("shot_twin_laser", -24, 4)
def shot_twin_laser(v, rng):
    # Star Fighter: a quick pair of pew-pews, the second a hair higher.
    p = pv(v)
    return mixdown(_pew(rng, p, 2200, 900, 0.1, 0.7), at(0.04, _pew(rng, p * 1.06, 2200, 900, 0.1, 0.6)))


@sfx("matron_spit", -24, 3, noisy=True)
def matron_spit(v, rng):
    # Swarm Matron: a gurgling hiss and a thick spat glob.
    p = pv(v)
    gurgle = bp(osc(140 * p * (1 + 0.2 * osc(23, "sine", 0.12)), "saw"), 200, 1400) * env_exp(0.12, 0.08, 0.01) * 0.3
    glob = mixdown(bp(noise(0.1, rng, "pink"), 500, 2500) * env_exp(0.1, 0.04, 0.002) * 0.6, at(0, thump(220 * p, 110, 0.06, 0.004, 0.02, 1.4), 0.4))
    return mixdown(gurgle, at(0.08, glob))


@sfx("sage_orb", -25, 3)
def sage_orb(v, rng):
    # Gravity Sage: a soft warping whoosh and a round violet tone that bends down.
    p = pv(v)
    f = dsp.drop(780 * p, 520 * p, 0.25, 0.1)
    tone_ = (osc(f, "sine") * 0.7 + osc(f * 2, "sine") * 0.2) * env_exp(0.25, 0.12, 0.004) * 0.6
    return mixdown(at(0, click(rng, 0.004, 1000, 5000), 0.25), whoosh(rng, 0.12, 800 * p, 1800 * p, 1.6, 0.25) * 0.4, at(0.02, tone_))


@sfx("leviathan_song", -21, 3, max_s=1.2)
def leviathan_song(v, rng):
    # Star Leviathan: a booming whale call (A2 rising to A, the fifth above shimmering) over a deep sub swell.
    p = pv(v)
    d = 1.1
    f = np.concatenate([dsp.glide(hz("A2") * p, hz("A3") * p, 0.5), np.full(n_of(d) - n_of(0.5), hz("A3") * p)])
    call = (osc(f, "sine") + 0.4 * osc(f * 1.5, "sine") + 0.2 * osc(f * 2, "tri")) * dsp.env_adsr(d, 0.15, 0.2, 0.7, 0.4)
    am = 0.8 + 0.2 * osc(6, "sine", d)
    sub = thump(55 * p, 35, 0.6, 0.06, 0.25, 2.2) * 0.6
    return _cut(room(mixdown(at(0, click(rng, 0.006, 600, 3000), 0.3), sat(call * am, 1.2) * 0.6, at(0.25, sub)), rng, 0.6, 0.2), d, 0.35)


# ---------------------------------------------------------------------------------------- turrets


@sfx("shot_shard", -22, 3, noisy=True)
def shot_shard(v, rng):
    # Shard Spitter: the crystal cluster cracks open and spits three shards, each with a glassy ping.
    p = pv(v)
    crackle_ = crack(rng, 0.03, 1500, 8000, 0.006) * 0.5
    pings = mixdown(*[at(0.06 * k, _glass((2200 + 180 * k) * p, 0.2, 0.06, 0.45)) for k in range(3)])
    return mixdown(crackle_, at(0.01, pings))


@sfx("horizon_pulse", -22, 2, max_s=0.9)
def horizon_pulse(v, rng):
    # Event Horizon: a deep inward suck (a reversed swell) closing on a soft heavy thud.
    p = pv(v)
    d = 0.6
    suck = dsp.sweep_bp(noise(0.4, rng, "pink"), dsp.glide(3000, 300, 0.4), 2.0) * np.linspace(0.1, 1, n_of(0.4)) * 0.5
    hum = osc(dsp.glide(160 * p, 70 * p, 0.4), "sine") * np.linspace(0.2, 1, n_of(0.4)) * 0.4
    thud = thump(70 * p, 40, 0.2, 0.01, 0.06, 2.0)
    return _cut(mixdown(suck, hum, at(0.38, thud)), d)


# ---------------------------------------------------------------------------------------- powers


@sfx("pw_drizzle", -20, 2, max_s=1.3, noisy=True)
def pw_drizzle(v, rng):
    # Meteor Drizzle: a few falling whistles dropping in pitch, then a patter of small meteor pops.
    p = pv(v)
    d = 1.2
    whistles = mixdown(*[at(0.08 * k, osc(dsp.glide((2400 - 200 * k) * p, (900 - 80 * k) * p, 0.35), "sine") * env_exp(0.35, 0.3, 0.02) * 0.15)
                         for k in range(4)])
    pops = mixdown(*[at(0.38 + 0.09 * k, mixdown(thump((120 + 10 * k) * p, 60, 0.1, 0.006, 0.03, 1.6), at(0, crack(rng, 0.02, 1000, 6000, 0.004), 0.4)), 0.6)
                     for k in range(6)])
    return _cut(room(mixdown(whistles, pops, at(0.4, _glints(rng, 5, 2800, p, 0.08, 0.06))), rng, 0.4, 0.14), d, 0.3)


@sfx("pw_pulsar", -19, 2, max_s=1.5)
def pw_pulsar(v, rng):
    # Pulsar Pulse: a rising charge, a sweeping beam hum, then a huge stunning "whumm" with a ringing shimmer.
    p = pv(v)
    d = 1.4
    charge = osc(dsp.glide(300 * p, 1200 * p, 0.32), "sine") * dsp.env_adsr(0.32, 0.28, 0.02, 0.6, 0.02) * 0.2
    sweep = dsp.sweep_bp(noise(0.4, rng, "pink"), dsp.glide(600, 3000, 0.4), 3.0) * 0.3
    whumm = mixdown(thump(70 * p, 36, 0.5, 0.012, 0.15, 2.2), at(0, fm_bell(880 * p, 0.8, 1.41, 2.0, 0.3, 0.04), 0.35))
    shimmer = osc(1760 * p * (1 + 0.01 * osc(9, "sine", 0.6)), "sine") * env_exp(0.6, 0.35, 0.01) * 0.08
    return _cut(room(mixdown(charge, at(0.1, sweep), at(0.32, whumm), at(0.34, shimmer)), rng, 0.6, 0.18), d, 0.35)
