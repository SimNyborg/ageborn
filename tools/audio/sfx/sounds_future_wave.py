"""The Future wave's sounds (CONTENT_PLAN 5.7, DESIGN A13): the attacks of the 13 new Future units and their two
summons, the two new turrets and the Target Painter and Nano Mesh powers.

Same building blocks and loudness targets as `sounds.py` (shots -22..-25, melee hits -26/-27, turrets -21/-22,
power casts -19/-20), so the new cards sit in the existing mix. Future is synthesis: FM blips, glides, servo
whirrs and crackling energy, always opened by a short click or snap so every attack reads on a phone speaker.
Nothing here is musical (no key needed), except the Target Painter's lock-on beeps, which stay on C and G.

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    at, bell, bp, click, crack, crackle, dsp, env_exp, fade, fm_bell, hz, lp, mixdown, n_of, nburst,
    noise, osc, room, sat, thump, whoosh,
)
from sounds import pv, sfx


def _cut(x: np.ndarray, d: float, fout: float = 0.25) -> np.ndarray:
    return fade(dsp.pad_to(x, n_of(d))[: n_of(d)], 0.002, fout)


def _zap(rng, d: float, f0: float, p: float = 1.0, gain: float = 0.8) -> np.ndarray:
    """A crackling energy arc: a buzzing saw through a band-pass plus electric crackle."""
    buzz = bp(osc(f0 * p * (1 + 0.12 * osc(41, "sine", d)), "saw"), 300, 3000) * env_exp(d, d * 0.4, 0.003)
    return mixdown(buzz * gain, at(0, crackle(rng, d, 900, d * 0.35), 0.6), at(0, click(rng, 0.004, 1500, 7000), 0.4))


def _servo(d: float, f0: float, f1: float, gain: float = 0.25) -> np.ndarray:
    """A small motor whirr gliding in pitch (servos, thrusters, hover fans)."""
    f = dsp.glide(f0, f1, d)
    w = (osc(f, "saw") * 0.5 + osc(f * 2.01, "sine") * 0.3) * dsp.env_adsr(d, 0.02, d * 0.3, 0.7, d * 0.3)
    return lp(w, 2600) * gain


def _pew(rng, p: float, f0: float, f1: float, d: float = 0.16, gain: float = 0.8) -> np.ndarray:
    f = dsp.drop(f0 * p, f1 * p, d, d * 0.25)
    tone_ = (osc(f, "sine") * 0.8 + osc(f, "tri") * 0.3 + osc(f * 1.5, "sine") * 0.2) * env_exp(d, d * 0.38, 0.002)
    return mixdown(sat(tone_, 1.3) * gain, at(0, click(rng, 0.003, 1500, 5000), 0.25))


def _metal(f0: float, dur: float = 0.25, tau: float = 0.07) -> np.ndarray:
    return bell(f0, dur, 0.9, tau, ((1, 1.0), (2.3, 0.5), (3.7, 0.3), (5.2, 0.18)))


# ---------------------------------------------------------------------------------------- melee


@sfx("baton_spin", -27, 3, noisy=True)
def baton_spin(v, rng):
    # Android Pair: a whirring baton twirl and a bright electric smack as it lands.
    p = pv(v)
    twirl = mixdown(*[at(0.05 * k, whoosh(rng, 0.07, 1200 * p, 2600 * p, 1.8, 0.35), 0.45) for k in range(3)])
    smack = mixdown(thump(220 * p, 120, 0.07, 0.008, 0.025, 1.6), at(0, _zap(rng, 0.08, 160, p, 0.5)))
    return mixdown(twirl, at(0.17, smack))


@sfx("shield_pulse", -26, 3, noisy=True)
def shield_pulse(v, rng):
    # Barrier Trooper: the hardlight shield thrums up and slams forward with a glassy, resonant thunk.
    p = pv(v)
    hum = osc(dsp.glide(140 * p, 240 * p, 0.18), "sine") * dsp.env_adsr(0.18, 0.05, 0.05, 0.8, 0.05) * 0.3
    thunk = mixdown(thump(150 * p, 80, 0.12, 0.012, 0.04, 1.8), at(0, fm_bell(620 * p, 0.35, 1.41, 2.0, 0.12, 0.03), 0.4))
    return mixdown(hum, at(0.16, thunk), at(0.16, click(rng, 0.005, 1200, 6000), 0.5))


@sfx("lance_swipe", -26, 3, noisy=True)
def lance_swipe(v, rng):
    # Hover Bike: the fan whine surges past and the energy lance slices with a sizzling swish.
    p = pv(v)
    fan = _servo(0.32, 420 * p, 900 * p, 0.3)
    swish = whoosh(rng, 0.14, 1600 * p, 4200 * p, 2.2, 0.45) * 0.7
    sizzle = _zap(rng, 0.12, 220, p, 0.45)
    return mixdown(fan, at(0.14, swish), at(0.18, sizzle))


@sfx("pincer_snap", -25, 3, noisy=True, phone_gap=-6.0)
def pincer_snap(v, rng):
    # Crab Mech: a hydraulic hiss, the claw swinging shut and a heavy steel clamp with a ringing clank.
    p = pv(v)
    hiss = bp(noise(0.18, rng), 2000, 7000) * dsp.env_adsr(0.18, 0.01, 0.05, 0.6, 0.1) * 0.35
    whirr = _servo(0.2, 160 * p, 320 * p, 0.3)
    clamp = mixdown(thump(110 * p, 55, 0.2, 0.015, 0.06, 2.2, hp_hz=50), at(0, crack(rng, 0.04, 900, 6000, 0.008), 0.8),
                    at(0.005, _metal(380 * p, 0.35, 0.09), 0.45))
    return room(mixdown(hiss, at(0.05, whirr), at(0.24, clamp)), rng, 0.35, 0.12)


@sfx("lance_crackle", -26, 3, noisy=True)
def lance_crackle(v, rng):
    # Plasma Lancer: a charged thrust, the plasma head crackling as it punches into armour.
    p = pv(v)
    push = whoosh(rng, 0.1, 700 * p, 2000 * p, 1.6, 0.4) * 0.5
    hit = mixdown(thump(180 * p, 90, 0.09, 0.01, 0.03, 1.8), at(0, _zap(rng, 0.22, 120, p, 0.7)))
    return mixdown(push, at(0.08, hit))


@sfx("robot_punch", -26, 3, noisy=True, phone_gap=-6.0)
def robot_punch(v, rng):
    # Overload Android: a servo wind-up and a hard metal fist, each punch with a dull steel bonk.
    p = pv(v)
    wind = _servo(0.12, 300 * p, 700 * p, 0.3)
    fist = mixdown(thump(130 * p, 65, 0.15, 0.012, 0.045, 2.2, hp_hz=50), at(0, crack(rng, 0.03, 1200, 6000, 0.006), 0.8),
                   at(0, _metal(300 * p, 0.25, 0.06), 0.35))
    return mixdown(wind, at(0.1, fist))


@sfx("holo_flicker", -28, 3)
def holo_flicker(v, rng):
    # Holo Decoy: a glitchy hologram flicker, a stutter of soft FM blips with no weight behind them.
    p = pv(v)
    blips = []
    for k, f in enumerate((880, 1320, 990, 1480)):
        b = dsp.fm(f * p, 2.0, 1.5 * np.exp(-dsp.tvec(0.04) / 0.02), 0.04) * env_exp(0.04, 0.015, 0.002)
        blips.append(at(0.035 * k, b, 0.5))
    return mixdown(*blips, at(0, nburst(rng, 0.15, 3000, 9000, 0.05), 0.15))


# ---------------------------------------------------------------------------------------- shots


@sfx("shot_needle", -25, 4, noisy=True)
def shot_needle(v, rng):
    # Needle Gunner: a fast, dry flechette tick-tick, a tiny rail snap and a thin whistle.
    p = pv(v)
    snaps = mixdown(*[at(0.045 * k, mixdown(click(rng, 0.004, 2500, 9000), at(0, _pew(rng, p * (1 + 0.04 * k), 3200, 1400, 0.06, 0.4))), 0.8) for k in range(2)])
    return _cut(snaps, 0.22)


@sfx("shot_lobber", -24, 3)
def shot_lobber(v, rng):
    # Arc Lobber: a hollow, springy THOOMP from the tube and a wobbling canister warble flying off.
    p = pv(v)
    thoomp = mixdown(thump(130 * p, 60, 0.2, 0.015, 0.05, 2.0), at(0, nburst(rng, 0.05, 400, 3000, 0.02), 0.4))
    warble = osc(dsp.glide(500 * p, 900 * p, 0.35) * (1 + 0.06 * osc(14, "sine", 0.35)), "sine") * env_exp(0.35, 0.15, 0.02) * 0.2
    return mixdown(thoomp, at(0.05, warble))


@sfx("multitool_zap", -25, 3, noisy=True)
def multitool_zap(v, rng):
    # Overclock Engineer: a short, snappy arc from the multitool with a rising tool-whirr.
    p = pv(v)
    return mixdown(_servo(0.12, 500 * p, 1100 * p, 0.2), at(0.04, _zap(rng, 0.16, 140, p, 0.75)))


@sfx("shot_holo", -25, 3)
def shot_holo(v, rng):
    # Holo Projector: a soft shimmering plasma shot, glassy on top.
    p = pv(v)
    f = dsp.drop(700 * p, 260 * p, 0.24, 0.06)
    blob = dsp.fm(f, 1.5, 2.2 * np.exp(-dsp.tvec(0.24) / 0.05)) * env_exp(0.24, 0.09, 0.004)
    shimmer = fm_bell(1760 * p, 0.3, 3.01, 1.2, 0.1, 0.03) * 0.2
    return mixdown(lp(blob, 4000), at(0, shimmer), at(0, click(rng, 0.004, 1000, 5000), 0.25))


@sfx("shot_jet_beam", -24, 3, noisy=True)
def shot_jet_beam(v, rng):
    # Jetpack Trooper: a thruster puff as it steadies, then a bright downward beam pew.
    p = pv(v)
    puff = bp(noise(0.14, rng, "pink"), 200, 1500) * env_exp(0.14, 0.05, 0.01) * 0.5
    return mixdown(puff, at(0.04, _pew(rng, p, 1500, 380, 0.18, 0.85)))


@sfx("shot_particle", -22, 3, noisy=True, max_s=1.0, phone_gap=-6.0)
def shot_particle(v, rng):
    # Particle Cannon: a climbing charge whine, then a huge searing beam blast with a sub thump and a sizzling tail.
    p = pv(v)
    charge = osc(dsp.glide(200 * p, 1800 * p, 0.32, 1.5), "sine") * np.linspace(0.05, 1, n_of(0.32)) ** 2 * 0.3
    blast_f = dsp.drop(1400 * p, 120, 0.4, 0.05)
    blast = sat(osc(blast_f, "saw") * env_exp(0.4, 0.12, 0.002), 1.6) * 0.5
    sub = thump(90 * p, 35, 0.4, 0.04, 0.12, 2.2, hp_hz=40)
    sizzle = crackle(rng, 0.45, 600, 0.2) * 0.5
    return _cut(room(mixdown(charge, at(0.32, blast), at(0.32, sub), at(0.34, sizzle), at(0.32, click(rng, 0.006, 1000, 7000), 0.5)), rng, 0.45, 0.14), 1.0)


@sfx("shot_pd_laser", -24, 3)
def shot_pd_laser(v, rng):
    # Drone Carrier: its point-defence turret ripples off three quick, clean laser pulses.
    p = pv(v)
    return _cut(mixdown(*[at(0.07 * k, _pew(rng, p * (1 + 0.03 * k), 2100, 700, 0.09, 0.7)) for k in range(3)]), 0.4)


@sfx("shot_drone", -26, 4)
def shot_drone(v, rng):
    # Attack Drone: a tiny, high pew-pew under its rotor buzz.
    p = pv(v)
    buzz = osc(240 * p, "saw", 0.16) * env_exp(0.16, 0.08, 0.01) * 0.08
    return mixdown(lp(buzz, 2000), at(0, _pew(rng, p, 2600, 1100, 0.07, 0.6)), at(0.06, _pew(rng, p * 1.04, 2600, 1100, 0.07, 0.5)))


# ---------------------------------------------------------------------------------------- turrets


@sfx("shot_cryo", -22, 3, noisy=True)
def shot_cryo(v, rng):
    # Cryo Pod: a pressurised hiss of coolant and a crystalline frost chime as the orb leaves.
    p = pv(v)
    hiss = bp(noise(0.3, rng), 2500, 9000) * dsp.env_adsr(0.3, 0.005, 0.08, 0.5, 0.15) * 0.45
    pop = thump(170 * p, 90, 0.1, 0.01, 0.03, 1.6) * 0.6
    chime_ = sum(fm_bell(f * p, 0.45, 3.5, 1.4, 0.16, 0.04) * g for f, g in ((2350, 0.3), (3130, 0.2), (3950, 0.12)))
    return mixdown(pop, at(0, hiss), at(0.03, chime_))


@sfx("tractor_hum", -22, 2, max_s=1.0)
def tractor_hum(v, rng):
    # Tractor Beam: a deep wobbling hum that swells as the beam locks on and drags its target in.
    p = pv(v)
    d = 0.9
    f = dsp.glide(70 * p, 110 * p, d)
    am = 0.6 + 0.4 * osc(9, "sine", d)
    hum = (osc(f, "sine") + 0.5 * osc(f * 2, "sine") + 0.3 * osc(f * 3.01, "tri")) * am
    env = np.sin(np.linspace(0, np.pi, n_of(d))) ** 0.6
    sweep = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(1600, 500, d), 2.0) * 0.35
    lock = mixdown(click(rng, 0.006, 1200, 6000), at(0, fm_bell(990 * p, 0.3, 2.0, 1.0, 0.1, 0.03), 0.3))
    return _cut(mixdown(sat((hum + sweep) * env, 1.3), at(0, lock, 0.6)), d)


# ---------------------------------------------------------------------------------------- powers


@sfx("pw_painter", -20, 2, max_s=1.4)
def pw_painter(v, rng):
    # Target Painter: a spotter drone sweeps in with a scanning chirp, then three lock-on beeps (C, G, high C) and a
    # data crackle as the targets are marked.
    p = pv(v)
    d = 1.4
    sweep = osc(dsp.glide(600 * p, 2400 * p, 0.4), "sine") * dsp.env_adsr(0.4, 0.05, 0.1, 0.6, 0.15) * 0.12
    beeps = mixdown(*[at(0.42 + 0.15 * k, fm_bell(hz(n), 0.22, 2.0, 0.8, 0.07, 0.02), 0.45) for k, n in enumerate(("C6", "G6", "C7"))])
    data = crackle(rng, 0.35, 700, 0.15) * 0.35
    return _cut(room(mixdown(sweep, beeps, at(0.88, data), at(0.88, thump(160, 80, 0.12, 0.01, 0.04, 1.6), 0.4)), rng, 0.4, 0.14), d, 0.3)


@sfx("pw_nanomesh", -20, 2, max_s=1.7, noisy=True)
def pw_nanomesh(v, rng):
    # Nano Mesh: a glittering swarm rushes out, the hex net snaps taut with a glassy twang, then a fizzing nanite crawl.
    p = pv(v)
    d = 1.7
    swarm = dsp.sweep_bp(noise(0.5, rng), dsp.glide(1500, 6000, 0.5), 3.0) * np.linspace(0.1, 1, n_of(0.5)) * 0.4
    snap = mixdown(crack(rng, 0.04, 1500, 8000, 0.008), at(0, thump(140 * p, 70, 0.16, 0.01, 0.05, 1.8), 0.6),
                   at(0, fm_bell(520 * p, 0.6, 1.41, 2.5, 0.2, 0.04), 0.35))
    crawl = crackle(rng, 0.9, 400, 0.4) * 0.35
    glint = mixdown(*[at(0.12 * k, fm_bell((2600 + 280 * k) * p, 0.2, 3.5, 1.0, 0.06, 0.02), 0.12) for k in range(5)])
    return _cut(room(mixdown(swarm, at(0.48, snap), at(0.55, crawl), at(0.6, glint)), rng, 0.5, 0.16), d, 0.35)
