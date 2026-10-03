"""The Stone wave's sounds (CONTENT_PLAN 5.1, DESIGN A13): the attacks of the new Stone units, the two
new turrets and the Pebble Hail and Tangle Vines powers.

Same building blocks and loudness targets as `sounds.py` (shots -24..-28, melee swings -27, power
casts -19/-20), so the new cards sit in the existing mix. Stone is wood, bone, hide and breath: every
attack opens with a hard mid-band transient (a knock, a crack, a slap) that reads on a phone speaker.

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAVES, KIT_ORCH, TOM_LF, WOOD_HI, WOOD_LO, at, bp, click, crack, crackle, debris, dsp, fade, formant, grunt, knock,
    lp, mixdown, n_of, nburst, noise, osc, perc, pluck, room, rumble, thump, whoosh,
)
from sounds import flutter, pv, sfx


def _cut(x: np.ndarray, d: float, fout: float = 0.25) -> np.ndarray:
    return fade(dsp.pad_to(x, n_of(d))[: n_of(d)], 0.002, fout)


def _growl(rng: np.random.Generator, f0: float, d: float, vowel=((500, 180, 1.0), (1100, 260, 0.5)), rough: float = 0.35) -> np.ndarray:
    """A beast's growl: a low buzzing source with a fast rough flutter through two mouth formants."""
    f = dsp.glide(f0 * 1.08, f0 * 0.9, d) * (1 + 0.04 * osc(31, "sine", d))
    src = osc(f, "saw") * (1 - rough + rough * osc(47, "square", d)) + 0.2 * noise(d, rng)
    return formant(src, list(vowel)) * dsp.env_adsr(d, 0.015, 0.08, 0.7, 0.08)


# ---------------------------------------------------------------------------------------- melee


@sfx("wolf_bite", -27, 3, noisy=True)
def wolf_bite(v, rng):
    # Hunting Wolves / Cave Pup: a short snarl, a hard teeth snap and a quick head-shake rustle.
    p = pv(v)
    snarl = _growl(rng, 140 * p, 0.12, ((650, 200, 1.0), (1500, 300, 0.5))) * 0.5
    snap = mixdown(crack(rng, 0.03, 1500, 6000, 0.006), at(0, knock(900 * p, 0.04, 0.008, rng), 0.6))
    shake = bp(noise(0.1, rng), 1200, 4000) * (0.5 + 0.5 * osc(28, "square", 0.1)) * dsp.env_adsr(0.1, 0.005, 0.03, 0.4, 0.04) * 0.25
    return mixdown(snarl, at(0.09, snap), at(0.12, shake))


@sfx("shield_bash", -27, 3, noisy=True)
def shield_bash(v, rng):
    # Hide Shield: a stretched-hide shield shoved forward (a drum-like slap), then the stone axe's thunk.
    p = pv(v)
    slap = mixdown(perc(TOM_LF, 112, KIT_ORCH, pitch=1.2 * p, length=0.14), at(0, nburst(rng, 0.03, 300, 2500, 0.01), 0.6))
    sw = whoosh(rng, 0.1, 500 * p, 1800 * p, 1.6, 0.4) * 0.6
    chop = mixdown(perc(WOOD_LO, 110, pitch=0.8 * p, length=0.08), at(0, thump(160 * p, 90, 0.06, 0.01, 0.02), 0.5))
    return mixdown(slap, at(0.1, sw), at(0.18, chop))


@sfx("torch_jab", -27, 3, noisy=True)
def torch_jab(v, rng):
    # Torch Runner: a fast fiery swipe, a whoomp of flame and a crackle of sparks.
    p = pv(v)
    sw = whoosh(rng, 0.12, 400 * p, 2200 * p, 1.5, 0.5)
    woomp = dsp.sweep_lp(noise(0.22, rng, "pink"), dsp.glide(400, 2200, 0.22), 0.7) * dsp.env_adsr(0.22, 0.01, 0.06, 0.5, 0.1) * 0.8
    sparks = crackle(rng, 0.25, 260, 0.12) * 0.35
    hit = thump(150 * p, 90, 0.06, 0.01, 0.02) * 0.5
    return mixdown(sw, at(0.08, woomp), at(0.1, hit), at(0.1, sparks))


@sfx("horn_hook", -25, 3, phone_gap=-6.0)
def horn_hook(v, rng):
    # Woolly Rhino: a snorting charge, a heavy horn hook into the target and a deep grunt.
    p = pv(v)
    snort = bp(noise(0.12, rng), 300, 1600) * dsp.env_adsr(0.12, 0.005, 0.04, 0.4, 0.05) * 0.6
    sw = whoosh(rng, 0.2, 200 * p, 900 * p, 1.4, 0.5)
    slam = mixdown(thump(100 * p, 48, 0.25, 0.04, 0.09, 2.2, hp_hz=55), at(0, perc(TOM_LF, 118, KIT_ORCH, pitch=0.75 * p, length=0.25), 0.6))
    g = grunt(rng, 95 * p, 0.2, "o", 0.8) * 0.6
    return room(mixdown(snort, at(0.08, sw), at(0.22, slam), at(0.24, g)), rng, 0.35, 0.12)


@sfx("bear_swipe", -24, 3, phone_gap=-6.0)
def bear_swipe(v, rng):
    # Cave Bear: a roar rising on the rear-up, a heavy paw swipe and the thud of the blow.
    p = pv(v)
    roar = _growl(rng, 95 * p, 0.32, ((450, 160, 1.0), (900, 240, 0.6), (2300, 400, 0.2)), 0.45) * 0.7
    sw = whoosh(rng, 0.2, 180 * p, 1000 * p, 1.4, 0.5)
    thud = mixdown(thump(85 * p, 42, 0.3, 0.05, 0.1, 2.2, hp_hz=50), at(0, perc(TOM_LF, 120, KIT_ORCH, pitch=0.65 * p, length=0.3), 0.6))
    claws = crack(rng, 0.03, 1800, 6500, 0.008) * 0.5
    return room(mixdown(roar, at(0.22, sw), at(0.38, thud), at(0.38, claws)), rng, 0.4, 0.15)


@sfx("antler_sweep", -23, 3, phone_gap=-6.0)
def antler_sweep(v, rng):
    # Elk Chieftain: the chief's bone horn blares as the elk scoops its antlers through the line.
    p = pv(v)
    d = 0.42
    f = dsp.glide(196 * p, 220 * p, d) * (1 + 0.015 * osc(6, "sine", d))
    horn = formant(osc(f, "saw") + 0.12 * noise(d, rng), [(520, 200, 1.0), (1150, 300, 0.6), (2500, 500, 0.15)])
    horn = horn * dsp.env_adsr(d, 0.03, 0.1, 0.7, 0.15) * 0.6
    sw = whoosh(rng, 0.26, 160 * p, 800 * p, 1.3, 0.55)
    clack = mixdown(perc(WOOD_LO, 116, pitch=0.6 * p, length=0.1), at(0, knock(420 * p, 0.08, 0.02, rng), 0.6))
    slam = thump(90 * p, 45, 0.25, 0.04, 0.09, 2.0, hp_hz=55) * 0.7
    return room(mixdown(horn, at(0.18, sw), at(0.36, clack), at(0.36, slam)), rng, 0.45, 0.16)


# ---------------------------------------------------------------------------------------- ranged


@sfx("shot_bolas", -27, 3, noisy=True)
def shot_bolas(v, rng):
    # Bolas Thrower: a cord whirled overhead (a rising whir), the release and the stones' clacking spin.
    p = pv(v)
    whirl = flutter(rng, 0.26, 380 * p, 1100 * p, 8 * p, 1.3) * 0.7
    rel = mixdown(click(rng, 0.004, 1200, 5000), at(0, knock(700 * p, 0.04, 0.01, rng), 0.4))
    spin = mixdown(*[at(0.05 * k, perc(CLAVES, 70 + 4 * k, pitch=(0.8 + 0.05 * k) * p, length=0.03), 0.3) for k in range(3)])
    return mixdown(whirl, at(0.24, rel), at(0.27, spin))


@sfx("shot_atlatl", -26, 3)
def shot_atlatl(v, rng):
    # Atlatl Thrower: a lean-back whip of the spear-thrower, a sharp wooden snap and a long dart hiss.
    p = pv(v)
    whip = whoosh(rng, 0.12, 600 * p, 3000 * p, 2.0, 0.55)
    snap = mixdown(perc(WOOD_HI, 116, pitch=0.9 * p, length=0.05), at(0, crack(rng, 0.02, 1500, 5000, 0.005), 0.6))
    hiss = whoosh(rng, 0.3, 1800, 900, 2.2, 0.3) * 0.35
    return mixdown(whip, at(0.1, snap), at(0.11, hiss))


@sfx("shot_heave", -25, 3, phone_gap=-4.0)
def shot_heave(v, rng):
    # Boulder Hurler: a strained grunt, a two-handed heave and a heavy rock tumbling away.
    p = pv(v)
    g = grunt(rng, 120 * p, 0.2, "a", 0.9) * 0.7
    heave = whoosh(rng, 0.22, 150 * p, 700 * p, 1.3, 0.55)
    thrown = mixdown(thump(130 * p, 70, 0.1, 0.02, 0.04, 1.8) * 0.5, at(0.02, debris(rng, 0.18, 30, 300, 1500, 0.1, 0.02), 0.3))
    return mixdown(g, at(0.12, heave), at(0.28, thrown))


@sfx("herb_puff", -28, 3)
def herb_puff(v, rng):
    # Herbalist: a flick of dried herbs, a soft puff of healing dust and a tiny rattle of seed pods.
    p = pv(v)
    flick = whoosh(rng, 0.08, 900 * p, 2600 * p, 1.8, 0.4) * 0.6
    puff = dsp.sweep_lp(noise(0.25, rng, "pink"), dsp.glide(2500, 800, 0.25), 0.6) * dsp.env_adsr(0.25, 0.01, 0.05, 0.5, 0.12) * 0.7
    pods = mixdown(*[at(0.025 * k, perc(CLAVES, 60 + 6 * k, pitch=(1.6 + 0.1 * k) * p, length=0.02), 0.25) for k in range(4)])
    return mixdown(flick, at(0.05, puff), at(0.06, pods))


# ---------------------------------------------------------------------------------------- turrets


@sfx("quill_fan", -27, 3, noisy=True)
def quill_fan(v, rng):
    # Quill Porcupine: a rattling bristle-up, then a fan of quills thrown out with a dry hiss.
    p = pv(v)
    rattle = bp(noise(0.14, rng), 2500, 8000) * (0.4 + 0.6 * osc(40 * p, "square", 0.14)) * dsp.env_adsr(0.14, 0.01, 0.04, 0.6, 0.04) * 0.4
    darts = mixdown(*[at(0.012 * k, whoosh(rng, 0.12, 2400, 1200, 2.4, 0.25), 0.3) for k in range(4)])
    pop = click(rng, 0.004, 1500, 6000) * 0.6
    return mixdown(rattle, at(0.13, pop), at(0.13, darts))


@sfx("shot_sapling", -25, 3, noisy=True)
def shot_sapling(v, rng):
    # Sapling Sling: a bent young tree springs back with a creaking whoosh and a big leafy swish.
    p = pv(v)
    creak = mixdown(*[at(0.03 * k, perc(WOOD_LO, 70 + 5 * k, pitch=(0.5 + 0.06 * k) * p, length=0.04), 0.3) for k in range(3)])
    spring = whoosh(rng, 0.2, 250 * p, 1500 * p, 1.6, 0.6)
    leaves = bp(noise(0.25, rng), 2000, 7000) * dsp.env_adsr(0.25, 0.02, 0.08, 0.5, 0.12) * 0.3
    twang = pluck(70 * p, 0.25, rng, bright=0.3) * 0.5
    return room(mixdown(creak, at(0.1, spring), at(0.12, leaves), at(0.14, twang)), rng, 0.3, 0.12)


# ---------------------------------------------------------------------------------------- powers


@sfx("pw_hail", -20, 2, max_s=1.6, noisy=True)
def pw_hail(v, rng):
    # Pebble Hail (Field lane volley): a crowd of slings whirs up, then pebbles rattle down along the lane.
    d = 1.5
    whir = flutter(rng, 0.45, 400, 1300, 10, 1.3) * 0.7
    release = mixdown(*[at(0.02 * k, click(rng, 0.004, 1000, 4500), 0.4) for k in range(5)])
    fall = whoosh(rng, 0.35, 2600, 900, 2.0, 0.35) * 0.4
    patter = debris(rng, 0.8, 60, 700, 4000, 0.5, 0.012) * 1.1
    knocks = mixdown(*[at(0.07 * k + 0.01 * (k % 3), perc(CLAVES, 90 - 3 * k, pitch=0.7 + 0.08 * (k % 4), length=0.03), 0.35) for k in range(10)])
    return _cut(mixdown(at(0, whir), at(0.42, release), at(0.45, fall), at(0.75, patter), at(0.75, knocks)), d, 0.3)


@sfx("pw_vines", -20, 2, max_s=2.2, noisy=True, phone_gap=-6.0)
def pw_vines(v, rng):
    # Tangle Vines (Home pull): the ground cracks open, roots burst up with a creaking writhe and snap tight.
    d = 2.0
    t = dsp.tvec(d)
    burst = mixdown(thump(90, 40, 0.4, 0.05, 0.14, 2.2, hp_hz=50), at(0, nburst(rng, 0.3, 200, 2500, 0.1, 0.002, "brown"), 1.0))
    soil = debris(rng, 0.6, 50, 200, 1500, 0.35, 0.02) * 0.6
    creak_f = 180 + 60 * np.sin(2 * np.pi * 2.2 * t)
    creak = formant(osc(creak_f, "saw") * (0.5 + 0.5 * osc(23, "square", d)), [(700, 300, 1.0), (1600, 400, 0.4)])
    creak = creak * np.clip(t / 0.3, 0, 1) * np.exp(-t / 0.9) * 0.35
    rustle = bp(noise(d, rng), 2500, 8000) * np.clip(t / 0.2, 0, 1) * np.exp(-t / 0.7) * 0.25
    snaps = mixdown(*[at(0.3 + 0.18 * k, perc(WOOD_HI, 100, pitch=0.7 + 0.1 * k, length=0.05), 0.35) for k in range(4)])
    low = lp(rumble(rng, 0.8, 200, 0.4), 300) * 0.5
    return _cut(mixdown(at(0, burst), at(0.02, soil), at(0.05, creak), at(0.05, rustle), at(0, snaps), at(0, low)), d, 0.5)
