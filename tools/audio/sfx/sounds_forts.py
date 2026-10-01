"""The fort sounds (DESIGN A16.14.8, A13): placing, the scaffold's hammering, completion, hits by material
(wood, stone, metal, energy), the crumble stages, the collapse and the quiet decay, the traps, the camp's
horn and the levy stepping out, and the fort denial.

Every sound opens with a mid-band transient so it reads on a phone speaker (as the rest of `sounds.py`).
Forts are shared by all ages, so the designs stay material-first rather than age-first. Loudness targets
follow the roles: frequent fort hits sit with the unit hits (-26), placing and completion with the
spawns (-23), the collapse with the medium explosions (-20).

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAVES, GM, KIT_ORCH, KIT_POWER, SIDE_STICK, SNARE, TOM_H, TOM_HM, TOM_L, TOM_LF, TOM_LM, WOOD_HI, WOOD_LO, at, bell, bp, chime,
    cloth, crack, debris, dsp, env_exp, fm_bell, gm_note, hz, knock, lp, mixdown, mn, nburst, noise, osc, perc, room, rumble, sample, thump,
    whoosh,
)
from sounds import explosion, hammer, pv, sfx


@sfx("fort_place", -23, 3, phone_gap=-6.0)
def fort_place(v, rng):
    # A heavy load set down on the pad: a low floor-tom thud, dirt and a timber knock.
    p = pv(v)
    body = thump(95 * p, 42, 0.28, 0.03, 0.08, 2.4, hp_hz=55)
    tom = perc(TOM_LF, 118, KIT_ORCH, pitch=0.8 * p, length=0.35)
    dirt = mixdown(nburst(rng, 0.2, 180, 1500, 0.06, 0.002, "pink"), at(0.01, debris(rng, 0.3, 120, 600, 3500, 0.08, 0.01), 0.5))
    wood = knock(420 * p, 0.12, 0.03, rng)
    return room(mixdown(body, at(0, tom, 0.7), at(0, dirt, 0.8), at(0, wood, 0.4), at(0, crack(rng, 0.04, 700, 2800, 0.012), 0.5)), rng, 0.3, 0.15)


@sfx("fort_build", -26, 3)
def fort_build(v, rng):
    # The scaffold: four mallet strokes with a little creak of rope between them.
    p = pv(v)
    parts = [at(k * 0.17 + rng.uniform(0, 0.02), hammer(rng, p * (1 + 0.035 * k)), 0.8 - 0.06 * k) for k in range(4)]
    creak = bp(noise(0.25, rng), 600 * p, 1600 * p) * (0.5 + 0.5 * np.abs(osc(38, "saw", 0.25))) * env_exp(0.25, 0.1, 0.03) * 0.25
    return mixdown(*parts, at(0.26, creak))


@sfx("fort_complete", -23, 3)
def fort_complete(v, rng):
    # Done: a firm clunk, dust, and a bright two-note chime up a fourth (in C).
    clunk = mixdown(thump(120, 55, 0.2, 0.02, 0.06, 2.2, hp_hz=70), at(0, perc(TOM_LM, 112, KIT_ORCH, pitch=0.9, length=0.25), 0.6), at(0, knock(700, 0.08, 0.02, rng), 0.4))
    dust = nburst(rng, 0.25, 250, 1800, 0.07, 0.004, "pink") * 0.5
    ding = mixdown(at(0.06, chime(hz("G5"), 0.45, 0.14), 0.45), at(0.16, chime(hz("C6"), 0.6, 0.2), 0.5), at(0.16, gm_note(GM["glock"], mn("C6"), 0.2, 80, 0.5), 0.2))
    return mixdown(clunk, at(0.01, dust), ding)


@sfx("fort_hit_wood", -26, 4)
def fort_hit_wood(v, rng):
    # A blow on timber: a low woodblock thock, the tom's body and a few splinters.
    p = pv(v)
    wood = sample(GM["woodblock"], 58, 116, 0.12, 0.3, pitch=0.8 * p, length=0.12)
    tom = perc([TOM_LM, TOM_L, TOM_LM, TOM_L][v % 4], 112, KIT_ORCH, pitch=1.1 * p, length=0.22)
    splinter = debris(rng, 0.12, 260, 1200, 5000, 0.04, 0.004) * 0.6
    return mixdown(wood, at(0, tom, 0.55), at(0, knock(520 * p, 0.09, 0.02, rng), 0.5), at(0.004, splinter), at(0, thump(150 * p, 80, 0.08, 0.01, 0.025, hp_hz=110), 0.3))


@sfx("fort_hit_stone", -26, 4, noisy=True)
def fort_hit_stone(v, rng):
    # Stone struck: a dry crack, grit and a dull low tom (no ring).
    p = pv(v)
    grit = mixdown(crack(rng, 0.06, 700, 3600, 0.014), at(0.003, debris(rng, 0.18, 220, 900, 4500, 0.05, 0.006), 0.7))
    tom = perc(TOM_L, 116, KIT_ORCH, pitch=0.75 * p, length=0.25)
    thud = thump(120 * p, 60, 0.12, 0.012, 0.035, 2.2, hp_hz=80)
    return room(mixdown(grit, at(0, tom, 0.6), at(0, thud, 0.5), at(0, knock(380 * p, 0.07, 0.015, rng), 0.3)), rng, 0.2, 0.1)


@sfx("fort_hit_metal", -26, 4, hp_hz=120)
def fort_hit_metal(v, rng):
    # Iron plate: a clang with inharmonic partials and a short buzz.
    p = pv(v)
    clang = bell(640 * p, 0.35, 0.9, 0.09, ((1, 1.0), (2.41, 0.6), (3.9, 0.4), (5.27, 0.25), (6.8, 0.15)))
    stick = perc(SIDE_STICK, 118, pitch=0.85 * p, length=0.06)
    thud = thump(170 * p, 90, 0.07, 0.01, 0.02, hp_hz=120)
    return mixdown(clang, at(0, stick, 0.6), at(0, crack(rng, 0.03, 1500, 6000, 0.006), 0.5), at(0, thud, 0.35))


@sfx("fort_hit_energy", -27, 4, noisy=True)
def fort_hit_energy(v, rng):
    # A hardlight field taking a hit: a bright zap, a falling sweep and a crackling fizz.
    p = pv(v)
    zap = osc(dsp.drop(1400 * p, 420 * p, 0.12, 0.02), "sine") * env_exp(0.12, 0.05, 0.001) * 0.7
    fizz = bp(noise(0.16, rng), 1800, 7000) * (0.5 + 0.5 * np.abs(osc(70, "square", 0.16))) * env_exp(0.16, 0.05, 0.001)
    ring = fm_bell(1180 * p, 0.25, 1.41, 1.6, 0.07, 0.02) * 0.3
    return mixdown(zap, at(0, fizz, 0.6), at(0, ring), at(0, crack(rng, 0.03, 1200, 5000, 0.006), 0.4))


@sfx("fort_crumble", -22, 3, phone_gap=-6.0)
def fort_crumble(v, rng):
    # A section breaks off: a crunch, a heavy thud and a short rain of pieces.
    p = pv(v)
    body = thump(85 * p, 38, 0.3, 0.03, 0.1, 2.4, hp_hz=50)
    crunch = mixdown(crack(rng, 0.08, 500, 2800, 0.02), at(0, perc(SNARE, 112, KIT_POWER, pitch=0.55 * p, length=0.3), 0.5))
    rain = debris(rng, 0.55, 110, 600, 3800, 0.15, 0.012) * 0.7
    return room(mixdown(body, at(0, crunch), at(0.04, rain), at(0, perc(TOM_LF, 116, KIT_ORCH, pitch=0.7 * p, length=0.4), 0.6)), rng, 0.35, 0.16)


@sfx("fort_collapse", -20, 3, max_s=1.8, phone_gap=-6.0)
def fort_collapse(v, rng):
    # The whole fort goes: three crumbles tumbling over each other, a rumble and a long debris rain.
    parts = [at(k * 0.16 + rng.uniform(0, 0.04), fort_crumble(k % 3, rng), 1.0 - 0.18 * k) for k in range(3)]
    rum = rumble(rng, 1.2, 240, 0.45, 0.03) * 0.9
    rain = debris(rng, 1.3, 80, 500, 3500, 0.45, 0.014) * 0.6
    dust = nburst(rng, 1.0, 150, 1100, 0.4, 0.05, "pink") * 0.35
    return mixdown(*parts, at(0, rum), at(0.12, rain), at(0.1, dust))


@sfx("fort_decay", -27, 3)
def fort_decay(v, rng):
    # Crumbling away with nobody near: a soft slump and trickling grit (no impact).
    slump = thump(80, 45, 0.3, 0.06, 0.12, 1.6, hp_hz=50) * 0.7
    trickle = debris(rng, 0.9, 60, 400, 2800, 0.35, 0.02) * 0.8
    sigh = nburst(rng, 0.6, 150, 900, 0.25, 0.08, "pink") * 0.35
    return mixdown(at(0, sigh), at(0.05, slump), at(0.1, trickle))


@sfx("trap_arm", -30, 3, hp_hz=250)
def trap_arm(v, rng):
    # Set: two small mechanical clicks and a sprung "tink".
    p = pv(v)
    a = mixdown(perc(CLAVES, 92, pitch=1.1 * p, length=0.04), at(0, knock(1500 * p, 0.04, 0.008), 0.4))
    b = mixdown(perc(CLAVES, 100, pitch=1.3 * p, length=0.04), at(0, knock(1800 * p, 0.04, 0.008), 0.4))
    tink = fm_bell(2400 * p, 0.2, 2.1, 1.0, 0.05, 0.02) * 0.25
    return mixdown(a, at(0.07, b), at(0.08, tink))


@sfx("trap_snap", -24, 3)
def trap_snap(v, rng):
    # Sprung: a sharp snap, a whoosh of stakes and a heavy thock as they bite.
    p = pv(v)
    snap = mixdown(crack(rng, 0.03, 1500, 6000, 0.005), at(0, perc(SIDE_STICK, 124, pitch=1.2 * p, length=0.05), 0.8))
    sw = whoosh(rng, 0.1, 500 * p, 2600 * p, 1.4, 0.4) * 0.5
    bite = mixdown(sample(GM["woodblock"], 55, 120, 0.12, 0.3, pitch=0.75 * p, length=0.12), at(0, thump(140 * p, 70, 0.12, 0.01, 0.04, 2.0, hp_hz=90), 0.6))
    return mixdown(snap, at(0.01, sw), at(0.06, bite))


@sfx("trap_blast", -20, 3, noisy=True, phone_gap=-6.0)
def trap_blast(v, rng):
    # A mine or keg going off: a click, then a compact blast with thrown earth.
    p = pv(v)
    click_ = mixdown(perc(CLAVES, 100, pitch=1.4 * p, length=0.03), at(0, knock(1700 * p, 0.03, 0.006), 0.4)) * 0.6
    boom = explosion(rng, 0.25, p)
    earth = debris(rng, 0.6, 100, 400, 3000, 0.2, 0.012) * 0.6
    return mixdown(click_, at(0.05, boom), at(0.1, earth))


@sfx("camp_horn", -26, 3, hp_hz=120)
def camp_horn(v, rng):
    # A short muster call on a horn: G3 rising to C4 (in C), soft so it never tires.
    first = gm_note(GM["horn"], mn("G3"), 0.16, 92, 0.5)
    second = gm_note(GM["horn"], mn("C4"), 0.34, 100, 0.8)
    return lp(mixdown(first, at(0.15, second)), 3200)


@sfx("levy_spawn", -30, 3)
def levy_spawn(v, rng):
    # A tent flap and one quick step out.
    p = pv(v)
    flap = cloth(rng, 0.14) * 1.2
    step = mixdown(thump(160 * p, 90, 0.06, 0.008, 0.02, 1.8, hp_hz=100), at(0, nburst(rng, 0.05, 300, 2000, 0.015, 0.001, "pink"), 0.6))
    return mixdown(flap, at(0.09, step, 0.8))


@sfx("fort_denied", -25, 3, hp_hz=120)
def fort_denied(v, rng):
    # "Can't build here": two dull stone knocks, the second lower.
    p = pv(v) ** 0.3
    a = mixdown(perc(WOOD_LO, 100, pitch=0.7 * p, length=0.1), at(0, knock(520 * p, 0.08, 0.018, rng), 0.5), at(0, thump(150 * p, 80, 0.06, 0.01, 0.02), 0.4))
    b = mixdown(perc(WOOD_LO, 96, pitch=0.56 * p, length=0.14), at(0, knock(410 * p, 0.1, 0.022, rng), 0.5), at(0, thump(120 * p, 65, 0.08, 0.01, 0.03), 0.4))
    return mixdown(a, at(0.11, b))
