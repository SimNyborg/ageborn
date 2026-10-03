"""The Medieval wave's sounds (CONTENT_PLAN 5.3, DESIGN A13): the attacks of the 13 new Medieval units and
the War Hound summon, the two new turrets and the Longbow Volley and Great Bell powers.

Same building blocks and loudness targets as `sounds.py` (shots -24..-28, melee swings -27, power
casts -19/-20), so the new cards sit in the existing mix. Medieval is steel, oak, rope and leather:
every attack opens with a hard mid-band transient (a clank, a crack, a knock) that reads on a phone
speaker; the musical ones (the herald's trumpet, the great bell) stay in the Medieval key, D.

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAVES, GM, KIT_ORCH, TOM_L, TOM_LF, WOOD_HI, WOOD_LO, at, bell, bp, click, crack, crackle, debris, dsp, fade,
    formant, gm_note, grunt, hz, knock, lp, mixdown, mn, n_of, nburst, noise, osc, perc, pluck, room, rumble, thump,
    whoosh,
)
from sounds import flutter, pv, sfx


def _cut(x: np.ndarray, d: float, fout: float = 0.25) -> np.ndarray:
    return fade(dsp.pad_to(x, n_of(d))[: n_of(d)], 0.002, fout)


def _steel(f0: float, dur: float = 0.25, tau: float = 0.08) -> np.ndarray:
    """Struck steel: a short, bright, inharmonic ring (a blade or a helm), damped fast so it stays a hit."""
    return bell(f0, dur, 1.0, tau, ((1, 1.0), (2.32, 0.6), (3.87, 0.45), (5.13, 0.3), (6.9, 0.15)))


def _growl(rng: np.random.Generator, f0: float, d: float, vowel=((600, 200, 1.0), (1400, 300, 0.5)), rough: float = 0.35) -> np.ndarray:
    f = dsp.glide(f0 * 1.08, f0 * 0.9, d) * (1 + 0.04 * osc(31, "sine", d))
    src = osc(f, "saw") * (1 - rough + rough * osc(47, "square", d)) + 0.2 * noise(d, rng)
    return formant(src, list(vowel)) * dsp.env_adsr(d, 0.015, 0.08, 0.7, 0.08)


# ---------------------------------------------------------------------------------------- melee


@sfx("squire_jab", -27, 3, noisy=True)
def squire_jab(v, rng):
    # Squire Pair: two quick spear jabs, a light double knock of ash shafts on a shield rim.
    p = pv(v)
    sw = whoosh(rng, 0.08, 800 * p, 2400 * p, 1.8, 0.4) * 0.6
    k1 = mixdown(perc(WOOD_HI, 108, pitch=0.9 * p, length=0.05), at(0, crack(rng, 0.02, 1500, 5000, 0.005), 0.5))
    k2 = mixdown(perc(WOOD_HI, 100, pitch=1.0 * p, length=0.05), at(0, _steel(1300 * p, 0.12, 0.03), 0.25))
    return mixdown(sw, at(0.06, k1), at(0.12, sw, 0.5), at(0.17, k2, 0.8))


@sfx("flail_smash", -26, 3, noisy=True)
def flail_smash(v, rng):
    # Flailman: the chain rattles as the ball whirls once, then a heavy iron thud with a chain jingle.
    p = pv(v)
    whirl = flutter(rng, 0.22, 300 * p, 1100 * p, 9 * p, 1.4) * 0.6
    rattle = mixdown(*[at(0.035 * k, _steel(2100 * p + 150 * k, 0.05, 0.012), 0.25) for k in range(5)])
    thud = mixdown(thump(120 * p, 60, 0.2, 0.03, 0.06, 2.0), at(0, perc(TOM_LF, 112, KIT_ORCH, pitch=1.0 * p, length=0.2), 0.6),
                   at(0, crack(rng, 0.03, 900, 3500, 0.008), 0.5))
    jingle = mixdown(*[at(0.02 * k, _steel(2600 * p - 120 * k, 0.06, 0.015), 0.18) for k in range(3)])
    return mixdown(whirl, at(0.04, rattle), at(0.22, thud), at(0.25, jingle))


@sfx("dagger_stab", -27, 3, noisy=True)
def dagger_stab(v, rng):
    # Brigand: a quick sneaky hiss of a drawn knife, a short stab thunk and a sly grunt.
    p = pv(v)
    draw = bp(noise(0.08, rng), 3000, 9000) * dsp.env_adsr(0.08, 0.02, 0.03, 0.4, 0.02) * 0.35
    sw = whoosh(rng, 0.07, 1200 * p, 3600 * p, 2.0, 0.35) * 0.6
    stab = mixdown(thump(220 * p, 120, 0.05, 0.008, 0.02, 1.8), at(0, crack(rng, 0.015, 2000, 7000, 0.004), 0.6))
    g = grunt(rng, 170 * p, 0.09, "u", 1.1) * 0.35
    return mixdown(draw, at(0.07, sw), at(0.12, stab), at(0.13, g))


@sfx("greatsword_sweep", -25, 2, max_s=0.6, phone_gap=-6.0)
def greatsword_sweep(v, rng):
    # Greatsword Knight: a long two-handed sweep (a deep whoosh), a ringing steel clash through the line.
    p = pv(v)
    g = grunt(rng, 110 * p, 0.16, "a", 0.9) * 0.45
    sw = mixdown(whoosh(rng, 0.3, 200 * p, 1400 * p, 1.5, 0.55), at(0, whoosh(rng, 0.3, 600 * p, 2600 * p, 2.0, 0.5), 0.35))
    clash = mixdown(_steel(820 * p, 0.45, 0.14), at(0, crack(rng, 0.03, 1500, 6000, 0.007), 0.7),
                    at(0, thump(140 * p, 70, 0.12, 0.02, 0.05, 1.8), 0.5))
    return room(mixdown(g, at(0.08, sw), at(0.34, clash)), rng, 0.35, 0.12)


@sfx("hammer_clang", -25, 2, max_s=0.6, phone_gap=-5.0)
def hammer_clang(v, rng):
    # Warhammer Sergeant: an overhead heave, a heavy hammer-on-plate clang that rings like an anvil.
    p = pv(v)
    sw = whoosh(rng, 0.2, 180 * p, 900 * p, 1.4, 0.5) * 0.8
    anvil = mixdown(bell(620 * p, 0.6, 0.9, 0.18, ((1, 1.0), (2.71, 0.55), (4.16, 0.4), (5.43, 0.22))),
                    at(0, crack(rng, 0.03, 1200, 5000, 0.006), 0.8), at(0, thump(110 * p, 55, 0.2, 0.03, 0.07, 2.0), 0.7))
    return room(mixdown(sw, at(0.2, anvil)), rng, 0.3, 0.1)


@sfx("whip_crack", -27, 3, noisy=True)
def whip_crack(v, rng):
    # Kennel Master: a leather whip swung back and cracked forward, a hound's eager yip after.
    p = pv(v)
    back = whoosh(rng, 0.12, 500 * p, 1800 * p, 1.6, 0.4) * 0.5
    fwd = whoosh(rng, 0.08, 1500 * p, 5000 * p, 2.2, 0.35) * 0.6
    snap = mixdown(crack(rng, 0.02, 2500, 9000, 0.003), at(0, click(rng, 0.004, 3000, 9000), 0.8))
    yip = _growl(rng, 520 * p, 0.07, ((900, 250, 1.0), (2200, 400, 0.5)), 0.15) * 0.3
    return mixdown(back, at(0.1, fwd), at(0.16, snap), at(0.22, yip))


@sfx("hound_bite", -27, 3, noisy=True)
def hound_bite(v, rng):
    # War Hound: a short bark-snarl, a hard snap of the jaws and a leather collar jingle.
    p = pv(v)
    bark = _growl(rng, 220 * p, 0.09, ((700, 220, 1.0), (1700, 320, 0.5)), 0.3) * 0.5
    snap = mixdown(crack(rng, 0.03, 1500, 6000, 0.006), at(0, knock(950 * p, 0.04, 0.008, rng), 0.6))
    tag = _steel(3200 * p, 0.08, 0.02) * 0.15
    return mixdown(bark, at(0.08, snap), at(0.1, tag))


@sfx("drawbridge_slam", -24, 2, phone_gap=-6.0)
def drawbridge_slam(v, rng):
    # Siege Belfry: chains rattle as the drawbridge drops, a huge oak slam and a dust rumble.
    p = pv(v)
    chain = mixdown(*[at(0.03 * k, _steel(1900 * p + 90 * (k % 3), 0.05, 0.012), 0.22) for k in range(7)])
    creak = bp(osc(dsp.glide(90 * p, 60 * p, 0.2), "saw"), 400, 1500) * dsp.env_adsr(0.2, 0.02, 0.05, 0.6, 0.06) * 0.3
    slam = mixdown(thump(80 * p, 40, 0.35, 0.05, 0.12, 2.2, hp_hz=45), at(0, perc(TOM_LF, 124, KIT_ORCH, pitch=0.7 * p, length=0.3), 0.7),
                   at(0, perc(WOOD_LO, 120, pitch=0.5 * p, length=0.12), 0.8))
    dust = debris(rng, 0.3, 40, 200, 1400, 0.2, 0.02) * 0.4
    return room(mixdown(chain, at(0.05, creak), at(0.24, slam), at(0.26, dust)), rng, 0.4, 0.14)


@sfx("wyrm_breath", -23, 2, phone_gap=-6.0)
def wyrm_breath(v, rng):
    # Lindworm: a deep in-drawn hiss, then a roaring gout of marsh fire with a bubbling crackle.
    p = pv(v)
    d = 0.75
    inhale = bp(noise(0.22, rng, "pink"), 600, 3000) * np.linspace(0.1, 1.0, n_of(0.22)) * 0.35
    roar = _growl(rng, 75 * p, 0.5, ((380, 160, 1.0), (800, 240, 0.6), (2000, 400, 0.2)), 0.5) * 0.6
    fire = dsp.sweep_lp(noise(0.55, rng, "pink"), dsp.glide(900, 3200, 0.55), 0.6) * dsp.env_adsr(0.55, 0.04, 0.1, 0.7, 0.2) * 0.9
    bubble = crackle(rng, 0.5, 220, 0.3) * 0.35
    low = lp(rumble(rng, 0.5, 220, 0.3), 260) * 0.5
    x = mixdown(inhale, at(0.2, roar), at(0.2, fire), at(0.25, bubble), at(0.2, low))
    return _cut(room(x, rng, 0.45, 0.14), d, 0.25)


# ---------------------------------------------------------------------------------------- ranged


@sfx("shot_windlass", -26, 3)
def shot_windlass(v, rng):
    # Crossbowman: a cranked windlass ratchet, the latch, then the heavy prod's thunk and bolt hiss.
    p = pv(v)
    ratchet = mixdown(*[at(0.028 * k, perc(CLAVES, 70 + 3 * k, pitch=(1.3 + 0.03 * k) * p, length=0.02), 0.25) for k in range(4)])
    latch = click(rng, 0.005, 1200, 5000) * 0.5
    twang = pluck(88 * p, 0.25, rng, bright=0.4)
    thunk = thump(170 * p, 85, 0.08, 0.01, 0.025, 1.8) * 0.6
    fly = whoosh(rng, 0.14, 900, 2800, 2.0, 0.3) * 0.3
    return mixdown(ratchet, at(0.13, latch), at(0.15, thunk), at(0.152, twang, 0.8), at(0.17, fly))


@sfx("shot_longbow", -26, 3)
def shot_longbow(v, rng):
    # Yeoman Archer: a long creaking draw, a deep yew twang and a long, rising arrow whistle.
    p = pv(v)
    creak = bp(osc(dsp.glide(110 * p, 140 * p, 0.16), "saw"), 600, 2000) * dsp.env_adsr(0.16, 0.05, 0.05, 0.5, 0.03) * 0.18
    twang = pluck(98 * p, 0.32, rng, bright=0.45) * 0.9
    snap = click(rng, 0.004, 1200, 4000) * 0.4
    whistle = osc(dsp.glide(1600 * p, 2300 * p, 0.3), "sine") * dsp.env_adsr(0.3, 0.04, 0.1, 0.4, 0.12) * 0.08
    fly = whoosh(rng, 0.26, 1000, 3200, 2.0, 0.3) * 0.25
    return mixdown(creak, at(0.15, snap), at(0.15, twang), at(0.17, fly), at(0.17, whistle))


@sfx("trumpet_toot", -26, 3)
def trumpet_toot(v, rng):
    # Herald: a short bright fanfare call on a natural trumpet (D - A, A - D, F# - A), cheering the line on.
    lo, hi = [("D4", "A4"), ("A4", "D5"), ("F#4", "A4")][v]
    a = gm_note(GM["trumpet"], mn(lo), 0.12, 108, 0.4)
    b = gm_note(GM["trumpet"], mn(hi), 0.26, 116, 0.6)
    tap = perc(CLAVES, 80, pitch=1.1, length=0.03) * 0.2
    return mixdown(tap, at(0, a), at(0.13, b))


@sfx("shot_mangonel", -24, 3, phone_gap=-5.0)
def shot_mangonel(v, rng):
    # Mangonel Cart: a twisted-rope torsion creak, the arm slamming the padded crossbar, a stone whooshing off.
    p = pv(v)
    creak = formant(osc(dsp.glide(70 * p, 95 * p, 0.2), "saw") * (0.6 + 0.4 * osc(19, "square", 0.2)), [(500, 200, 1.0), (1300, 300, 0.4)])
    creak = creak * dsp.env_adsr(0.2, 0.03, 0.05, 0.6, 0.05) * 0.3
    slam = mixdown(thump(110 * p, 55, 0.2, 0.03, 0.07, 2.0), at(0, perc(TOM_LF, 118, KIT_ORCH, pitch=0.9 * p, length=0.3), 0.7),
                   at(0, perc(WOOD_LO, 116, pitch=0.6 * p, length=0.1), 0.6))
    fly = whoosh(rng, 0.3, 160 * p, 700 * p, 1.3, 0.5) * 0.6
    return mixdown(creak, at(0.18, slam), at(0.2, fly))


@sfx("vial_toss", -27, 3, noisy=True)
def vial_toss(v, rng):
    # Alchemist: a glass vial flicked end over end (a glassy clink and spin), a fizzing pop on landing.
    p = pv(v)
    clink = mixdown(bell(2400 * p, 0.25, 1.0, 0.07, ((1, 1.0), (2.76, 0.5), (5.4, 0.3))), at(0, click(rng, 0.003, 3000, 9000), 0.4)) * 0.6
    spin = flutter(rng, 0.2, 1500 * p, 3000 * p, 14 * p, 1.6) * 0.3
    pop = mixdown(nburst(rng, 0.03, 800, 4000, 0.008), at(0, osc(dsp.glide(500 * p, 1300 * p, 0.05), "sine") * dsp.env_adsr(0.05, 0.002, 0.02, 0.3, 0.02), 0.4))
    fizz = bp(noise(0.25, rng), 3000, 9000) * np.exp(-np.linspace(0, 4, n_of(0.25))) * 0.25
    return mixdown(clink, at(0.02, spin), at(0.22, pop), at(0.23, fizz))


# ---------------------------------------------------------------------------------------- turrets


@sfx("shot_springald", -25, 3)
def shot_springald(v, rng):
    # Springald: twisted sinew arms snap forward, a deep wooden slap and a long spear-bolt whoosh.
    p = pv(v)
    clack = nburst(rng, 0.02, 700, 3000, 0.005) * 0.7
    slap = mixdown(perc(WOOD_LO, 118, pitch=0.75 * p, length=0.1), at(0, thump(150 * p, 75, 0.12, 0.02, 0.04, 1.8), 0.7))
    twang = pluck(65 * p, 0.3, rng, bright=0.35) * 0.8
    fly = mixdown(whoosh(rng, 0.25, 500, 1800, 1.8, 0.35), at(0, flutter(rng, 0.25, 700, 1500, 11, 1.4), 0.4)) * 0.45
    return mixdown(clack, at(0.004, slap), at(0.006, twang), at(0.02, fly))


@sfx("crane_hook", -25, 2, phone_gap=-5.0)
def crane_hook(v, rng):
    # Grapple Crane: a rope whizzes out, the iron hook clanks home, then a rattling winch hauls it back.
    p = pv(v)
    out = flutter(rng, 0.18, 900 * p, 2400 * p, 16, 1.6) * 0.5
    clank = mixdown(_steel(980 * p, 0.3, 0.09), at(0, crack(rng, 0.02, 1500, 6000, 0.005), 0.6), at(0, thump(160 * p, 90, 0.08, 0.01, 0.03), 0.5))
    winch = mixdown(*[at(0.04 * k, perc(CLAVES, 76, pitch=(0.9 - 0.02 * k) * p, length=0.025), 0.28) for k in range(7)])
    groan = bp(osc(dsp.glide(85 * p, 70 * p, 0.3), "saw"), 400, 1400) * dsp.env_adsr(0.3, 0.03, 0.05, 0.6, 0.08) * 0.22
    return mixdown(out, at(0.16, clank), at(0.3, winch), at(0.3, groan))


# ---------------------------------------------------------------------------------------- powers


@sfx("pw_longbow", -20, 2, max_s=1.7, noisy=True)
def pw_longbow(v, rng):
    # Longbow Volley (Field lane volley): a captain's shout, a wall of bows loosed together, the arrows
    # whistle down and thud into the lane one after another.
    d = 1.6
    shout = grunt(rng, 140, 0.22, "a", 1.0) * 0.5
    draws = bp(noise(0.25, rng), 800, 2500) * dsp.env_adsr(0.25, 0.1, 0.05, 0.5, 0.05) * 0.2
    loose = mixdown(*[at(0.018 * k, pluck((95 + 7 * k) * (1 + 0.02 * v), 0.25, rng, bright=0.45), 0.35) for k in range(6)])
    fly = mixdown(whoosh(rng, 0.5, 1200, 3200, 2.0, 0.3), at(0.15, whoosh(rng, 0.4, 3000, 1100, 2.0, 0.3))) * 0.45
    thuds = mixdown(*[at(0.06 * k + 0.012 * (k % 3), mixdown(thump(190 - 6 * k, 100, 0.05, 0.01, 0.02), at(0, perc(WOOD_HI, 96, pitch=0.7 + 0.05 * (k % 4), length=0.04), 0.5)), 0.45) for k in range(10)])
    return _cut(mixdown(shout, at(0.18, draws), at(0.42, loose), at(0.45, fly), at(0.95, thuds)), d, 0.3)


@sfx("pw_bell", -19, 2, max_s=1.7, phone_gap=-6.0)
def pw_bell(v, rng):
    # Great Bell (Home stun): one huge tower-bell stroke in D, a booming shock and a long wobbling hum.
    d = 2.2
    t = dsp.tvec(d)
    f0 = hz("D3") * (1.0 if v == 0 else 0.997)
    strike = mixdown(thump(70, 40, 0.5, 0.06, 0.16, 2.0, hp_hz=40), at(0, crack(rng, 0.03, 600, 3000, 0.01), 0.6))
    toll = bell(f0, d, 0.9, 0.9, ((0.5, 0.6), (1, 1.0), (1.19, 0.5), (1.5, 0.4), (2.0, 0.35), (2.51, 0.2), (3.0, 0.12)))
    wobble = 0.85 + 0.15 * np.sin(2 * np.pi * 3.2 * t)
    tub = gm_note(GM["tubular"], mn("D4"), 0.6, 116, 1.4) * 0.4
    tom = perc(TOM_L, 120, KIT_ORCH, pitch=0.6, length=0.5) * 0.5
    return _cut(mixdown(strike, at(0, toll * wobble[: len(toll)]), at(0, tub), at(0, tom)), d, 0.6)
