"""The Gunpowder wave's sounds (CONTENT_PLAN 5.4, DESIGN A13): the attacks of the 13 new Gunpowder units,
the two new turrets and the Rocket Volley and Cannon Salute powers.

Same building blocks and loudness targets as `sounds.py` (shots -23..-26, melee swings -27, power
casts -19/-20), so the new cards sit in the existing mix. Gunpowder is flint, black powder, brass and
oak: every shot opens with a flint click or a hard crack that reads on a phone speaker, and the two
musical ones (the drum roll and the pipes' drone) stay in the Gunpowder key, G.

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAVES, GM, KIT_ORCH, SNARE, TOM_HM, TOM_LF, WOOD_HI, WOOD_LO, at, bell, bp, click, crack, debris, dsp, fade,
    formant, gm_note, grunt, knock, lp, mixdown, mn, n_of, nburst, noise, osc, perc, pluck, room, rumble, sample,
    thump, whoosh,
)
from sounds import flutter, pv, sfx


def _cut(x: np.ndarray, d: float, fout: float = 0.25) -> np.ndarray:
    return fade(dsp.pad_to(x, n_of(d))[: n_of(d)], 0.002, fout)


def _steel(f0: float, dur: float = 0.25, tau: float = 0.08) -> np.ndarray:
    """Struck steel: a short, bright, inharmonic ring (a blade or a cuirass), damped fast so it stays a hit."""
    return bell(f0, dur, 1.0, tau, ((1, 1.0), (2.32, 0.6), (3.87, 0.45), (5.13, 0.3), (6.9, 0.15)))


def _powder(rng, p: float, body: float = 140.0, size: float = 1.0) -> np.ndarray:
    """A black-powder report: flint click, the crack, a pitched boom and a pink smoke tail."""
    flint = click(rng, 0.004, 2500, 8000) * 0.3
    snap = nburst(rng, 0.05, 900, 7000, 0.012, 0.0005) * 1.2
    boom = thump(body * p, body * 0.46, 0.3 * size, 0.02, 0.09 * size, 2.2, hp_hz=70)
    smoke = nburst(rng, 0.55 * size, 350, 2200, 0.2, 0.01, "pink") * 0.5
    gs = sample(GM["gunshot"], 60, 120, 0.3, 0.8, pitch=0.85 * p * (140.0 / body) ** 0.3, length=0.6)
    return mixdown(flint, at(0.012, snap), at(0.012, boom, 0.6), at(0.015, smoke), at(0.012, gs, 0.8))


# ---------------------------------------------------------------------------------------- melee


@sfx("claymore_chop", -26, 3, noisy=True)
def claymore_chop(v, rng):
    # Highlander: a big two-handed claymore heave with a war-cry grunt, a heavy steel chop through the line.
    p = pv(v)
    g = grunt(rng, 130 * p, 0.14, "a", 1.0) * 0.45
    sw = mixdown(whoosh(rng, 0.22, 250 * p, 1600 * p, 1.5, 0.5), at(0, whoosh(rng, 0.22, 700 * p, 2600 * p, 2.0, 0.45), 0.3))
    chop = mixdown(_steel(900 * p, 0.3, 0.08), at(0, crack(rng, 0.03, 1400, 6000, 0.007), 0.7),
                   at(0, thump(150 * p, 75, 0.1, 0.015, 0.04, 1.8), 0.6))
    return room(mixdown(g, at(0.05, sw), at(0.24, chop)), rng, 0.3, 0.1)


@sfx("scoop_swing", -27, 3, noisy=True)
def scoop_swing(v, rng):
    # Powder Monkey: a quick swipe with a wooden powder scoop, a hollow knock and a little sprinkle of grains.
    p = pv(v)
    sw = whoosh(rng, 0.09, 900 * p, 2800 * p, 1.8, 0.4) * 0.6
    kn = mixdown(perc(WOOD_HI, 104, pitch=0.85 * p, length=0.06), at(0, knock(720 * p, 0.05, 0.012, rng), 0.6))
    grains = debris(rng, 0.18, 70, 3000, 9000, 0.06, 0.004) * 0.3
    return mixdown(sw, at(0.08, kn), at(0.09, grains))


@sfx("sabre_slash", -26, 3, noisy=True)
def sabre_slash(v, rng):
    # Hussar: hooves and a curved sabre whistling down in a fast cut, a bright ringing slash.
    p = pv(v)
    hoof = mixdown(*[at(0.05 * k, perc(WOOD_LO, 96, pitch=(0.8 + 0.05 * k) * p, length=0.04), 0.35) for k in range(3)])
    sw = whoosh(rng, 0.12, 1400 * p, 5200 * p, 2.4, 0.35) * 0.7
    ring = mixdown(_steel(1500 * p, 0.28, 0.06), at(0, crack(rng, 0.02, 2200, 8000, 0.004), 0.6))
    return mixdown(hoof, at(0.1, sw), at(0.2, ring))


@sfx("marshal_sweep", -24, 2, max_s=0.7, phone_gap=-6.0)
def marshal_sweep(v, rng):
    # Grand Marshal: a commanding shout, a grand sabre sweep through the line, a clash of steel on steel.
    p = pv(v)
    shout = grunt(rng, 115 * p, 0.2, "o", 1.0) * 0.5
    sw = mixdown(whoosh(rng, 0.32, 220 * p, 1500 * p, 1.5, 0.55), at(0, whoosh(rng, 0.32, 800 * p, 3200 * p, 2.0, 0.5), 0.35))
    clash = mixdown(_steel(760 * p, 0.45, 0.14), at(0.03, _steel(1150 * p, 0.3, 0.08), 0.6), at(0, crack(rng, 0.03, 1500, 6000, 0.007), 0.7),
                    at(0, thump(120 * p, 60, 0.15, 0.02, 0.05, 2.0), 0.5))
    return room(mixdown(shout, at(0.12, sw), at(0.38, clash)), rng, 0.4, 0.14)


# ---------------------------------------------------------------------------------------- ranged


@sfx("shot_blunderbuss", -22, 3, noisy=True)
def shot_blunderbuss(v, rng):
    # Blunderbuss: a fat, flared-bell bang with a spray of shot rattling outward.
    p = pv(v)
    bang = _powder(rng, p, 115, 1.2)
    pellets = debris(rng, 0.35, 140, 1600, 5500, 0.12, 0.006) * 0.55
    bell_ring = bell(620 * p, 0.25, 0.4, 0.06, ((1, 1.0), (2.4, 0.4), (4.1, 0.2))) * 0.12
    return room(mixdown(bang, at(0.03, pellets), at(0.012, bell_ring)), rng, 0.45, 0.2)


@sfx("shot_dragoon", -24, 3, noisy=True)
def shot_dragoon(v, rng):
    # Dragoon: a short cavalry carbine fired from the saddle, a snort and a hoof stamp after.
    p = pv(v)
    shot = _powder(rng, p * 1.12, 160, 0.8)
    stamp = perc(WOOD_LO, 100, pitch=0.7 * p, length=0.05) * 0.4
    snort = bp(noise(0.12, rng, "pink"), 500, 2500) * dsp.env_adsr(0.12, 0.01, 0.04, 0.4, 0.05) * 0.2
    return room(mixdown(shot, at(0.2, snort), at(0.26, stamp)), rng, 0.4, 0.2)


@sfx("shot_coehorn", -24, 3, phone_gap=-6.0)
def shot_coehorn(v, rng):
    # Coehorn Crew: the linstock fizz, a short stubby mortar's deep thoonk and the shell's rising whistle.
    p = pv(v)
    fizz = bp(noise(0.12, rng), 3000, 9000) * dsp.env_adsr(0.12, 0.01, 0.03, 0.5, 0.03) * 0.25
    thoonk = mixdown(thump(110 * p, 50, 0.3, 0.03, 0.09, 2.2, hp_hz=60), at(0, perc(TOM_LF, 118, KIT_ORCH, pitch=0.9 * p, length=0.25), 0.6),
                     at(0, nburst(rng, 0.12, 400, 1600, 0.04, 0.002), 0.8))
    up = osc(dsp.glide(700 * p, 1500 * p, 0.35), "sine") * dsp.env_adsr(0.35, 0.05, 0.1, 0.4, 0.12) * 0.07
    smoke = nburst(rng, 0.5, 300, 1800, 0.18, 0.01, "pink") * 0.4
    return room(mixdown(fizz, at(0.1, thoonk), at(0.12, smoke), at(0.14, up)), rng, 0.4, 0.18)


@sfx("shot_wallgun", -22, 3, noisy=True)
def shot_wallgun(v, rng):
    # Wall Gunner: a long-barrelled rampart gun on its rest, a heavy, deep crack that rolls away.
    p = pv(v)
    shot = _powder(rng, p * 0.9, 120, 1.2)
    rest = perc(WOOD_LO, 108, pitch=0.6 * p, length=0.08) * 0.35
    roll = rumble(rng, 0.6, 320, 0.25) * 0.4
    return room(mixdown(shot, at(0.01, rest), at(0.03, roll)), rng, 0.5, 0.22)


# ---------------------------------------------------------------------------------------- support


@sfx("drum_roll", -25, 3)
def drum_roll(v, rng):
    # Drummer Boy: a crisp rope-drum ruff and a flam on the beat, the boom on the target.
    p = pv(v)
    ruff = mixdown(*[at(0.028 * k, perc(SNARE, 92 + 6 * k, KIT_ORCH, pitch=(1.0 + 0.01 * k) * p, length=0.06), 0.4 + 0.1 * k) for k in range(4)])
    flam = mixdown(perc(SNARE, 118, KIT_ORCH, pitch=1.0 * p, length=0.14), at(0.012, perc(SNARE, 124, KIT_ORCH, pitch=1.0 * p, length=0.18)))
    boom = perc(TOM_LF, 116, KIT_ORCH, pitch=0.8 * p, length=0.25) * 0.5
    return room(mixdown(ruff, at(0.12, flam), at(0.13, boom)), rng, 0.3, 0.12)


@sfx("pipe_drone", -26, 3)
def pipe_drone(v, rng):
    # Bagpiper: the bag's breath, a reedy drone on G and a short skirling chanter grace (G - A - D, G - B - D).
    d = 0.6
    t = dsp.tvec(d)
    g0 = 98.0 * (1.0 + 0.003 * v)
    drone = osc(g0, "saw", d) * 0.5 + osc(g0 * 2, "saw", d) * 0.25
    drone = formant(drone, [(600, 300, 1.0), (1700, 400, 0.4)]) * dsp.env_adsr(d, 0.04, 0.05, 0.8, 0.12) * (0.9 + 0.1 * np.sin(2 * np.pi * 5 * t))
    # GM program 109 is the bagpipe (not in the kit table)
    notes = [("G4", "A4", "D5"), ("G4", "B4", "D5"), ("A4", "G4", "D5")][v]
    chanter = mixdown(*[at(0.07 * k, gm_note(109, mn(n), 0.1 if k < 2 else 0.3, 104 + 6 * k, 0.4), 0.7) for k, n in enumerate(notes)])
    breath = bp(noise(0.1, rng, "pink"), 400, 1600) * dsp.env_adsr(0.1, 0.03, 0.03, 0.4, 0.04) * 0.15
    return _cut(mixdown(breath, at(0.03, drone), at(0.06, chanter)), d, 0.2)


@sfx("mesmer_chime", -26, 3)
def mesmer_chime(v, rng):
    # Mesmerist: a pocket watch swung on its chain, a soft tick-tock and a glassy, wavering chime.
    p = pv(v)
    tick = mixdown(perc(CLAVES, 70, pitch=1.4 * p, length=0.02), at(0.11, perc(CLAVES, 64, pitch=1.2 * p, length=0.02)))
    chain = mixdown(*[at(0.025 * k, _steel(3400 * p - 100 * k, 0.05, 0.012), 0.12) for k in range(3)])
    d = 0.5
    t = dsp.tvec(d)
    chime = bell(1180 * p, d, 0.6, 0.3, ((1, 1.0), (2.0, 0.4), (3.01, 0.25), (4.2, 0.12))) * (0.7 + 0.3 * np.sin(2 * np.pi * 6 * t))
    return mixdown(tick, at(0.02, chain), at(0.2, chime[: n_of(d)], 0.6))


# ---------------------------------------------------------------------------------------- turrets


@sfx("shot_carronade", -21, 3, noisy=True, phone_gap=-6.0)
def shot_carronade(v, rng):
    # Carronade: a short, stubby "smasher" on a slide, a deep blunt boom and the slide's wooden thump back.
    p = pv(v)
    boom = thump(85 * p, 38, 0.55, 0.05, 0.16, 2.5, hp_hz=50)
    snap = crack(rng, 0.07, 500, 3500, 0.022)
    blast = sample(GM["gunshot"], 55, 127, 0.3, 1.0, pitch=0.5 * p, length=0.8)
    slide = mixdown(perc(WOOD_LO, 120, pitch=0.5 * p, length=0.12), at(0, thump(70 * p, 40, 0.15, 0.02, 0.05), 0.6))
    rum = rumble(rng, 0.9, 340, 0.4) * 0.6
    return room(mixdown(snap, at(0, boom, 0.8), at(0, blast, 0.8), at(0.12, slide, 0.6), at(0.01, rum)), rng, 0.55, 0.2)


@sfx("shot_sea_mortar", -21, 3, phone_gap=-6.0)
def shot_sea_mortar(v, rng):
    # Sea Mortar: a huge bomb-ketch mortar's hollow, chest-deep whump and a long falling-shell whistle.
    p = pv(v)
    whump = mixdown(thump(70 * p, 32, 0.6, 0.05, 0.2, 2.6, hp_hz=40), at(0, perc(TOM_LF, 124, KIT_ORCH, pitch=0.6 * p, length=0.4), 0.7),
                    at(0, nburst(rng, 0.2, 300, 1300, 0.06, 0.003), 0.9))
    tube = bp(noise(0.3, rng, "pink"), 200, 900) * dsp.env_adsr(0.3, 0.005, 0.08, 0.4, 0.15) * 0.5
    whistle = osc(dsp.glide(1700 * p, 900 * p, 0.6), "sine") * dsp.env_adsr(0.6, 0.1, 0.1, 0.5, 0.2) * 0.06
    rum = rumble(rng, 1.0, 300, 0.4) * 0.6
    return room(mixdown(whump, at(0, tube), at(0.02, rum), at(0.3, whistle)), rng, 0.6, 0.2)


# ---------------------------------------------------------------------------------------- powers


@sfx("pw_rockets", -20, 2, max_s=1.7, noisy=True)
def pw_rockets(v, rng):
    # Rocket Volley (Field lane volley): a fuse fizz, a ragged salvo of war rockets screaming up, then
    # pops and bangs rippling down the lane.
    d = 1.6
    fizz = bp(noise(0.2, rng), 3000, 9000) * dsp.env_adsr(0.2, 0.02, 0.05, 0.6, 0.05) * 0.3
    launches = mixdown(*[at(0.05 * k + 0.01 * (k % 2), whoosh(rng, 0.45, 500 + 60 * k, 2400 + 100 * k, 0.9, 0.2, "white"), 0.32) for k in range(5)])
    roar = lp(noise(0.6, rng, "brown"), 500) * dsp.env_adsr(0.6, 0.05, 0.1, 0.6, 0.25) * 0.9
    bangs = mixdown(*[at(0.07 * k + 0.015 * (k % 3), mixdown(thump(150 - 8 * k, 70, 0.12, 0.015, 0.04, 2.0), at(0, crack(rng, 0.03, 700, 4000, 0.008), 0.6)), 0.5) for k in range(7)])
    return _cut(room(mixdown(fizz, at(0.18, launches), at(0.2, roar), at(0.85, bangs)), rng, 0.45, 0.14), d, 0.3)


@sfx("pw_salute", -19, 2, max_s=1.7, phone_gap=-6.0)
def pw_salute(v, rng):
    # Cannon Salute (Home stun): an officer's "Fire!", a rolling ripple of four saluting guns and a ringing
    # in the ears (a soft high tone) for the stunned.
    d = 1.7
    call = grunt(rng, 150, 0.18, "a", 1.0) * 0.45
    guns = mixdown(*[at(0.16 * k, mixdown(thump((92 - 4 * k) * (1 + 0.02 * v), 40, 0.5, 0.05, 0.16, 2.4, hp_hz=45),
                                         at(0, crack(rng, 0.06, 500, 3500, 0.02), 0.8),
                                         at(0, sample(GM["gunshot"], 55, 124, 0.3, 0.8, pitch=0.55, length=0.6), 0.6)), 0.8) for k in range(4)])
    ring = osc(3100.0, "sine", 0.8) * dsp.env_adsr(0.8, 0.1, 0.1, 0.6, 0.35) * 0.03
    timp = gm_note(GM["timpani"], mn("G1"), 0.5, 120, 1.0) * 0.5
    return _cut(room(mixdown(call, at(0.2, guns), at(0.2, timp), at(0.75, ring)), rng, 0.55, 0.2), d, 0.4)
