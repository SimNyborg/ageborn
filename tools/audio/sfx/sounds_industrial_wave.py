"""The Industrial wave's sounds (CONTENT_PLAN 5.5, DESIGN A13): the attacks of the 13 new Industrial units and
the Clockwork Soldier, the two new turrets and the Shrapnel Shells and Great Magnet powers.

Same building blocks and loudness targets as `sounds.py` (shots -22..-25, melee swings -26/-27, turrets -21,
power casts -19/-20), so the new cards sit in the existing mix. Industrial is iron, steam, rivets and brass:
most hits carry a clank or a hiss of steam that reads on a phone speaker, and the musical one (the
Bandmaster's cornet) stays in the Industrial key, F#.

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    GM, KIT_ORCH, SNARE, TOM_LF, WOOD_HI, WOOD_LO, at, bell, bp, click, crack, debris, dsp, fade, gm_note, grunt, knock,
    lp, mixdown, mn, n_of, nburst, noise, osc, perc, room, rumble, sample, thump, whoosh,
)
from sounds import pv, sfx


def _cut(x: np.ndarray, d: float, fout: float = 0.25) -> np.ndarray:
    return fade(dsp.pad_to(x, n_of(d))[: n_of(d)], 0.002, fout)


def _iron(f0: float, dur: float = 0.3, tau: float = 0.09) -> np.ndarray:
    """Struck iron: a duller, lower ring than steel (a plate, a wheel rim, an anvil)."""
    return bell(f0, dur, 0.8, tau, ((1, 1.0), (2.11, 0.55), (3.32, 0.35), (4.6, 0.2), (6.3, 0.1)))


def _steam(rng, dur: float = 0.2, gain: float = 0.4, lo: float = 2500, hi: float = 9000) -> np.ndarray:
    """A hiss of escaping steam: bright noise with a quick attack and a soft tail."""
    return bp(noise(dur, rng), lo, hi) * dsp.env_adsr(dur, 0.005, dur * 0.3, 0.5, dur * 0.4) * gain


def _gun(rng, p: float, body: float = 150.0, size: float = 1.0) -> np.ndarray:
    """A smokeless-powder report: a hard crack, a pitched body and a short tail (no flint, unlike Gunpowder)."""
    snap = nburst(rng, 0.04, 1200, 9000, 0.008, 0.0004) * 1.2
    boom = thump(body * p, body * 0.5, 0.22 * size, 0.015, 0.06 * size, 2.0, hp_hz=70)
    gs = sample(GM["gunshot"], 62, 120, 0.25, 0.6, pitch=1.0 * p * (150.0 / body) ** 0.3, length=0.45)
    tail = nburst(rng, 0.3 * size, 500, 3000, 0.1, 0.005, "pink") * 0.35
    return mixdown(snap, at(0, boom, 0.6), at(0, gs, 0.8), at(0.01, tail))


# ---------------------------------------------------------------------------------------- melee


@sfx("pickaxe_clink", -27, 3, noisy=True)
def pickaxe_clink(v, rng):
    # Coal Miners: a short pick swing and a bright clink of iron on rock, a few chips skittering.
    p = pv(v)
    sw = whoosh(rng, 0.1, 700 * p, 2400 * p, 1.8, 0.4) * 0.5
    clink = mixdown(_iron(1350 * p, 0.22, 0.05), at(0, crack(rng, 0.02, 2000, 8000, 0.004), 0.6))
    chips = debris(rng, 0.16, 60, 2500, 8000, 0.05, 0.004) * 0.3
    return mixdown(sw, at(0.09, clink), at(0.1, chips))


@sfx("mantlet_jab", -27, 3, noisy=True)
def mantlet_jab(v, rng):
    # Iron Mantlet: the wheeled shield creaks forward, a bayonet jabs out of the slit, the plate clanks.
    p = pv(v)
    creak = bp(noise(0.12, rng, "pink"), 500 * p, 1400 * p) * dsp.env_adsr(0.12, 0.02, 0.04, 0.4, 0.04) * 0.25
    jab = whoosh(rng, 0.07, 1200 * p, 3800 * p, 2.2, 0.35) * 0.55
    clank = mixdown(_iron(420 * p, 0.3, 0.08), at(0, thump(140 * p, 70, 0.1, 0.015, 0.04, 1.8), 0.5))
    stab = crack(rng, 0.02, 1800, 6000, 0.004) * 0.5
    return mixdown(creak, at(0.08, jab), at(0.14, stab), at(0.16, clank, 0.7))


@sfx("bike_skid", -26, 3, noisy=True)
def bike_skid(v, rng):
    # Dispatch Rider: the motorcycle's two-stroke rasp, a skidding stop on gravel and a thump of the boot.
    p = pv(v)
    t = dsp.tvec(0.3)
    eng = osc(dsp.glide(95 * p, 70 * p, 0.3), "saw") * (0.6 + 0.4 * np.sign(np.sin(2 * np.pi * 22 * t))) * dsp.env_adsr(0.3, 0.01, 0.1, 0.5, 0.1)
    eng = lp(eng, 1600) * 0.25
    skid = bp(noise(0.28, rng, "pink"), 900 * p, 3200 * p) * dsp.env_adsr(0.28, 0.01, 0.1, 0.6, 0.12) * 0.5
    gravel = debris(rng, 0.25, 120, 1500, 6000, 0.1, 0.005) * 0.35
    hit = mixdown(thump(130 * p, 65, 0.12, 0.015, 0.04, 2.0), at(0, crack(rng, 0.025, 900, 4500, 0.006), 0.6))
    return mixdown(eng, at(0.05, skid), at(0.06, gravel), at(0.24, hit))


@sfx("plough_scoop", -25, 3, noisy=True, phone_gap=-6.0)
def plough_scoop(v, rng):
    # Steam Tractor: a chuff of steam, the plough blade scraping sideways through the line, a heavy clank.
    p = pv(v)
    chuff = mixdown(_steam(rng, 0.16, 0.45, 1500, 6000), at(0, thump(90 * p, 50, 0.12, 0.02, 0.05, 1.8), 0.5))
    scrape = bp(noise(0.25, rng), 600 * p, 2600 * p) * dsp.env_adsr(0.25, 0.02, 0.08, 0.5, 0.1) * 0.45
    clank = mixdown(_iron(260 * p, 0.4, 0.12), at(0, thump(100 * p, 48, 0.2, 0.02, 0.07, 2.2, hp_hz=50), 0.8),
                    at(0, crack(rng, 0.04, 700, 4000, 0.01), 0.6))
    return room(mixdown(chuff, at(0.1, scrape), at(0.3, clank)), rng, 0.4, 0.14)


@sfx("drill_spin", -26, 3, noisy=True)
def drill_spin(v, rng):
    # Steam Driller: the drill bit whines up to speed and grinds into armour, sparks and a puff of steam.
    p = pv(v)
    d = 0.42
    t = dsp.tvec(d)
    f = dsp.glide(220 * p, 520 * p, d)
    whine = (osc(f, "saw") * (0.7 + 0.3 * np.sin(2 * np.pi * 38 * t))) * dsp.env_adsr(d, 0.03, 0.1, 0.7, 0.1)
    whine = bp(whine, 300, 3500) * 0.35
    grind = bp(noise(0.3, rng), 1500 * p, 6000 * p) * dsp.env_adsr(0.3, 0.01, 0.1, 0.6, 0.12) * 0.4
    sparks = debris(rng, 0.25, 140, 4000, 10000, 0.08, 0.002) * 0.25
    return mixdown(whine, at(0.14, grind), at(0.15, sparks), at(0.3, _steam(rng, 0.14, 0.3)))


@sfx("key_whack", -27, 3, noisy=True)
def key_whack(v, rng):
    # Clockwork Tinker: a ratchet of the big wind-up key, a swing and a hollow tonk on a helmet.
    p = pv(v)
    ratchet = mixdown(*[at(0.025 * k, click(rng, 0.005, 2500, 7000) * 0.5) for k in range(4)])
    sw = whoosh(rng, 0.09, 800 * p, 2600 * p, 1.8, 0.4) * 0.45
    tonk = mixdown(knock(560 * p, 0.12, 0.03, rng), at(0, _iron(980 * p, 0.2, 0.05), 0.4))
    return mixdown(ratchet, at(0.11, sw), at(0.19, tonk))


@sfx("ice_axe_chop", -26, 3, noisy=True)
def ice_axe_chop(v, rng):
    # Alpine Climber: a rope creak, a whistling overhead ice-axe swing and a crisp, icy chop.
    p = pv(v)
    rope = bp(noise(0.1, rng, "pink"), 300, 1200) * dsp.env_adsr(0.1, 0.02, 0.03, 0.4, 0.04) * 0.2
    sw = whoosh(rng, 0.16, 600 * p, 3000 * p, 2.0, 0.45) * 0.6
    chop = mixdown(crack(rng, 0.03, 2500, 9000, 0.006), at(0, _iron(1700 * p, 0.2, 0.04), 0.45),
                   at(0, thump(160 * p, 80, 0.08, 0.012, 0.03, 1.8), 0.5))
    ice = debris(rng, 0.14, 90, 5000, 11000, 0.05, 0.002) * 0.25
    return mixdown(rope, at(0.05, sw), at(0.2, chop), at(0.21, ice))


@sfx("toy_bayonet", -28, 3, noisy=True)
def toy_bayonet(v, rng):
    # Clockwork Soldier: tick-tock clockwork, a stiff little thrust and a tinny poke.
    p = pv(v)
    ticks = mixdown(*[at(0.06 * k, perc(WOOD_HI, 90, pitch=(1.25 if k % 2 else 1.1) * p, length=0.03), 0.35) for k in range(3)])
    thrust = whoosh(rng, 0.06, 1500 * p, 4200 * p, 2.2, 0.35) * 0.35
    tin = mixdown(bell(1900 * p, 0.14, 1.0, 0.03, ((1, 1.0), (2.7, 0.5), (4.4, 0.3))), at(0, click(rng, 0.004, 3000, 9000), 0.5))
    return mixdown(ticks, at(0.16, thrust), at(0.21, tin, 0.7))


# ---------------------------------------------------------------------------------------- ranged


@sfx("shot_bowl", -24, 3, noisy=True)
def shot_bowl(v, rng):
    # Bomb Bowler: an underarm bowl, the round bomb rumbling off along the ground, its fuse fizzing.
    p = pv(v)
    sw = whoosh(rng, 0.12, 400 * p, 1600 * p, 1.6, 0.45) * 0.45
    roll = mixdown(rumble(rng, 0.4, 260 * p, 0.25) * 0.6, at(0, debris(rng, 0.4, 80, 400, 2000, 0.25, 0.008), 0.35))
    fizz = bp(noise(0.35, rng), 3500, 9000) * dsp.env_adsr(0.35, 0.02, 0.1, 0.6, 0.1) * 0.22
    return mixdown(sw, at(0.1, roll), at(0.08, fizz))


@sfx("shot_trench_mortar", -24, 3, phone_gap=-6.0)
def shot_trench_mortar(v, rng):
    # Trench Mortar: a bomb dropped down the tube (a metallic slide), the hollow thoonk and a rising whistle.
    p = pv(v)
    slide = bp(noise(0.08, rng), 1500, 5000) * dsp.env_adsr(0.08, 0.01, 0.03, 0.4, 0.03) * 0.3
    thoonk = mixdown(thump(120 * p, 55, 0.3, 0.025, 0.09, 2.2, hp_hz=60), at(0, perc(TOM_LF, 118, KIT_ORCH, pitch=1.0 * p, length=0.22), 0.6),
                     at(0, nburst(rng, 0.1, 400, 1800, 0.035, 0.002), 0.8))
    up = osc(dsp.glide(800 * p, 1700 * p, 0.35), "sine") * dsp.env_adsr(0.35, 0.05, 0.1, 0.4, 0.12) * 0.06
    return room(mixdown(slide, at(0.09, thoonk), at(0.14, up)), rng, 0.4, 0.16)


@sfx("cornet_blast", -25, 3)
def cornet_blast(v, rng):
    # Bandmaster: a bright cornet call on F# (F#-A#-C#, the age's key) and a snare tap on the hit.
    notes = [("F#4", "A#4", "C#5"), ("A#4", "C#5", "F#5"), ("C#5", "F#5", "A#5")][v]
    call = mixdown(*[at(0.075 * k, gm_note(GM["trumpet"], mn(n), 0.09 if k < 2 else 0.2, 116, 0.5), 0.8) for k, n in enumerate(notes)])
    tap = perc(SNARE, 100, KIT_ORCH, pitch=1.05, length=0.08) * 0.35
    return room(mixdown(call, at(0.16, tap)), rng, 0.35, 0.16)


@sfx("car_mg", -25, 4, noisy=True)
def car_mg(v, rng):
    # Armoured Car: a short turret machine-gun burst (three rounds), heavier than the Gatling, a link rattle.
    p = pv(v)
    rounds = mixdown(*[at(0.06 * k, _gun(rng, p * (1.0 + 0.03 * k), 170, 0.5), 0.75) for k in range(3)])
    links = debris(rng, 0.18, 120, 3000, 8000, 0.06, 0.003) * 0.2
    return mixdown(rounds, at(0.04, links))


@sfx("coil_zap", -25, 3, noisy=True)
def coil_zap(v, rng):
    # Spark Scientist: the coil gun's charging whine, a crackling arc snapping across and a buzzing jump.
    p = pv(v)
    d = 0.18
    charge = osc(dsp.glide(600 * p, 2400 * p, d), "sine") * dsp.env_adsr(d, 0.02, 0.05, 0.6, 0.04) * 0.12
    t = dsp.tvec(0.22)
    arc = bp(noise(0.22, rng), 1500, 9000) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * 60 * t))) * dsp.env_adsr(0.22, 0.002, 0.06, 0.5, 0.1) * 0.5
    buzz = osc(120.0 * p, "saw", 0.22) * dsp.env_adsr(0.22, 0.002, 0.08, 0.4, 0.08)
    buzz = bp(buzz, 200, 3000) * 0.2
    snap = crack(rng, 0.02, 3000, 10000, 0.003) * 0.7
    return mixdown(charge, at(d, snap), at(d, arc), at(d + 0.02, buzz))


@sfx("train_gun", -22, 3, noisy=True, phone_gap=-6.0)
def train_gun(v, rng):
    # Armoured Train: the turret gun's heavy boom, a shell whistle and a short toot of the steam whistle.
    p = pv(v)
    boom = mixdown(thump(80 * p, 36, 0.5, 0.04, 0.15, 2.5, hp_hz=45), at(0, crack(rng, 0.06, 600, 4000, 0.016), 0.8),
                   at(0, sample(GM["gunshot"], 55, 126, 0.3, 0.9, pitch=0.55 * p, length=0.7), 0.8))
    rum = rumble(rng, 0.8, 300, 0.35) * 0.55
    t = dsp.tvec(0.3)
    whistle = (osc(740.0 * p, "sine", 0.3) + 0.5 * osc(880.0 * p, "sine", 0.3) + 0.25 * osc(1110.0 * p, "sine", 0.3))
    whistle = whistle * (1 + 0.05 * np.sin(2 * np.pi * 6 * t)) * dsp.env_adsr(0.3, 0.04, 0.05, 0.8, 0.1) * 0.05
    return room(mixdown(boom, at(0.01, rum), at(0.45, whistle)), rng, 0.5, 0.18)


# ---------------------------------------------------------------------------------------- turrets


@sfx("shot_rivet", -22, 3, noisy=True)
def shot_rivet(v, rng):
    # Rivet Spitter: a pneumatic hiss and three hot rivets spat out (rat-tat-tat) with bright iron pings.
    p = pv(v)
    hiss = _steam(rng, 0.12, 0.3, 3000, 9000)
    shots = mixdown(*[at(0.07 * k, mixdown(thump(180 * p, 90, 0.06, 0.01, 0.02, 1.8), at(0, crack(rng, 0.02, 1500, 7000, 0.004), 0.7),
                                           at(0, _iron(1600 * p * (1 + 0.04 * k), 0.12, 0.03), 0.35)), 0.8) for k in range(3)])
    return room(mixdown(hiss, at(0.03, shots)), rng, 0.35, 0.14)


@sfx("hammer_slam", -21, 3, noisy=True, phone_gap=-6.0)
def hammer_slam(v, rng):
    # Steam Hammer: a hiss as the ram lifts, then a huge anvil clang and a thud that shakes the gate.
    p = pv(v)
    lift = _steam(rng, 0.22, 0.4, 1800, 7000)
    clang = mixdown(_iron(310 * p, 0.6, 0.18), at(0, _iron(760 * p, 0.4, 0.1), 0.5), at(0, crack(rng, 0.05, 600, 5000, 0.012), 0.8))
    thud = mixdown(thump(70 * p, 34, 0.45, 0.04, 0.14, 2.6, hp_hz=40), at(0, rumble(rng, 0.6, 260, 0.3), 0.5))
    return room(mixdown(lift, at(0.22, clang), at(0.22, thud)), rng, 0.5, 0.18)


# ---------------------------------------------------------------------------------------- powers


@sfx("pw_shrapnel", -20, 2, max_s=1.7, noisy=True)
def pw_shrapnel(v, rng):
    # Shrapnel Shells (Field lane volley): distant guns, shells whistling in, then a ripple of sharp air
    # bursts down the lane with fragments hissing.
    d = 1.6
    guns = mixdown(*[at(0.09 * k, thump(70 - 3 * k, 34, 0.4, 0.05, 0.14, 2.2, hp_hz=40), 0.45) for k in range(3)])
    whistles = mixdown(*[at(0.06 * k, osc(dsp.glide(1900 - 80 * k, 900, 0.5), "sine") * dsp.env_adsr(0.5, 0.1, 0.1, 0.5, 0.15), 0.035) for k in range(3)])
    bursts = mixdown(*[at(0.08 * k + 0.02 * (k % 2), mixdown(crack(rng, 0.05, 900, 6000, 0.012), at(0, thump(160 - 6 * k, 80, 0.12, 0.015, 0.04, 2.0), 0.5),
                                                          at(0.01, debris(rng, 0.25, 90, 2500, 8000, 0.08, 0.003), 0.4)), 0.55) for k in range(6)])
    return _cut(room(mixdown(guns, at(0.3, whistles), at(0.8, bursts)), rng, 0.5, 0.16), d, 0.3)


@sfx("pw_magnet", -20, 2, max_s=1.7, phone_gap=-6.0)
def pw_magnet(v, rng):
    # Great Magnet (Home pull): a chain rattles as the giant magnet drops, a deep rising electric hum takes
    # hold and iron clanks and drags toward it, with sparks crackling.
    d = 1.6
    chain = debris(rng, 0.35, 100, 1500, 6000, 0.2, 0.006) * 0.4
    drop = mixdown(_iron(180 * (1 + 0.03 * v), 0.7, 0.25), at(0, thump(65, 32, 0.4, 0.04, 0.14, 2.4, hp_hz=40), 0.8))
    t = dsp.tvec(1.1)
    hum = (osc(dsp.glide(55.0, 92.0, 1.1), "saw") * (0.8 + 0.2 * np.sin(2 * np.pi * 7 * t)))
    hum = lp(hum * dsp.env_adsr(1.1, 0.25, 0.2, 0.8, 0.3), 900) * 0.35
    drags = mixdown(*[at(0.18 * k, mixdown(bp(noise(0.2, rng), 400, 1800) * dsp.env_adsr(0.2, 0.05, 0.05, 0.5, 0.08) * 0.4,
                                           at(0.16, _iron(520 + 60 * k, 0.2, 0.05), 0.4)), 0.6) for k in range(4)])
    sparks = debris(rng, 0.8, 50, 4000, 10000, 0.4, 0.002) * 0.18
    return _cut(room(mixdown(chain, at(0.25, drop), at(0.35, hum), at(0.55, drags), at(0.5, sparks)), rng, 0.5, 0.16), d, 0.35)
