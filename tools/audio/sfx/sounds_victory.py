"""The Result's victory moments (owner request 2026-10-07; DESIGN A9 #7, A13; ui-plan MR-129): cartoon
slapstick for the little stage where your General beats the opponent's (a win), takes a gentle pie or a
rain cloud (a loss) or shrugs at a stand-off (a draw).

- `moment_swish`: a swing or a throw: a fast airy swish with a rising zip.
- `moment_bonk`: the giant mallet: a hollow wooden BONK and a spring boing that wobbles down.
- `moment_dizzy`: round a dizzy head: birdies tweet and stars twinkle (glockenspiel, C).
- `moment_splat`: a cream pie in the face: a wet slap, a squelch and droplets.
- `moment_tar`: tar landing over a head: a thick glop, a sticky splat and slow bubbles.
- `moment_poof`: a pillow bursting (and the brawl's cloud clearing): a soft whump and a puff of air.
- `moment_cluck`: the tarred and feathered opponent: buk, buk, BAWK.
- `moment_clank`: the cannon landing on the wall: an iron clank, a heavy thud and a rattle.
- `moment_fuse`: the fuse burning down: a crackling sizzle.
- `moment_boom`: the cannon: a cartoon KA-BOOM with a timpani punch.
- `moment_whistle`: the opponent sailing off: a slide whistle up.
- `moment_twinkle`: the far-off star where they vanish: a bright ting and a sparkle (C).
- `moment_scuffle`: the dust-cloud brawl: thumps, slaps and pows, whooshes and a bonk on a bell.
- `moment_tada`: the celebration: a brassy ta-DA in C with a glockenspiel sparkle.
- `moment_wahwah`: a loss, gently: a soft sad trombone, wah-wah-wah-waaah.
- `moment_wind`: the stand-off: a lonely whistling wind.
- `moment_shrug`: a draw: a quizzical boop... bweep?

Loudness (loudest 200 ms): the impacts sit with the big match moments (-16..-19), swishes, twinkles and
the shrug with the UI stamps (-23..-25), the beds (fuse, wind) under them (-26, -27). Family-friendly:
nothing harsh, no screams; the loss's trombone is soft and short. One variant each, kept short: a moment
plays once per Result (the ZzFX fallbacks keep three variants), and the effects budget (files.test) is
tight. Imported at the end of sounds.py.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAP, GM, KIT_ORCH, KIT_STD, SNARE, TOM_HM, TOM_LF, TOM_LM, at, bell, bp, crack, crackle, debris, dsp, env_exp, fm_bell,
    formant, gm, gm_note, gm_notes, hz, knock, lp, mixdown, mn, noise, nburst, osc, perc, room, rumble, sample, sat, thump, whoosh,
)
from sounds import explosion, pv, sfx


@sfx("moment_swish", -24, 1, hp_hz=180, noisy=True)
def moment_swish(v, rng):
    # A swing or a throw: a fast airy swish with a rising zip under it.
    p = pv(v)
    sw = whoosh(rng, 0.2, 500 * p, 4200 * p, 1.7, 0.6)
    zip_ = osc(dsp.glide(380 * p, 1500 * p, 0.17, 1.4), "sine") * env_exp(0.17, 0.09, 0.03) * 0.3
    return mixdown(sw, at(0.015, zip_))


@sfx("moment_bonk", -17, 1, max_s=0.7)
def moment_bonk(v, rng):
    # The giant mallet: a hollow wooden BONK (a low woodblock, a concert tom and a resonant knock), then a
    # spring BOING that wobbles down.
    p = pv(v)
    wood = sample(GM["woodblock"], 58, 127, 0.2, 0.4, pitch=0.82 * p, length=0.22)
    tom = perc(TOM_LM, 127, KIT_ORCH, pitch=1.05 * p, length=0.3)
    knk = knock(480 * p, 0.18, 0.06, rng, modes=((1.0, 1.0), (2.1, 0.5), (3.4, 0.25)))
    thud = thump(170 * p, 72, 0.2, 0.02, 0.07, 2.2, hp_hz=90)
    d = 0.75
    t = dsp.tvec(d)
    f = dsp.glide(400 * p, 230 * p, d, 0.8) * (1 + 0.16 * np.sin(2 * np.pi * 15 * t) * np.exp(-t / 0.4))
    boing = osc(f, "sine") * env_exp(d, 0.28, 0.004) * 0.6 + osc(f * 2.01, "tri") * env_exp(d, 0.12, 0.004) * 0.18
    snap = crack(rng, 0.035, 900, 4200, 0.009)
    return room(mixdown(wood, at(0, tom, 0.7), at(0, knk, 0.6), at(0, thud, 0.55), at(0, snap, 0.5), at(0.035, boing, 0.5)), rng, 0.3, 0.14)


def _chirp(f0: float, f1: float, d: float) -> np.ndarray:
    return osc(dsp.glide(f0, f1, d, 1.0), "sine") * env_exp(d, d * 0.5, 0.004)


@sfx("moment_dizzy", -25, 1, hp_hz=300, max_s=0.85)
def moment_dizzy(v, rng):
    # Round a dizzy head: little birdies tweet and stars twinkle (glockenspiel C7, G7, E7, C8).
    p = [1.0, 1.06][v]
    tweets = [at(t0, _chirp(a * p, b * p, 0.06), 0.35) for t0, a, b in ((0.0, 2600, 3900), (0.07, 3900, 2900), (0.32, 2800, 4200), (0.39, 4100, 3000), (0.66, 2700, 4000), (0.73, 4000, 3100))]
    glock = gm_notes(GM["glock"], [(0.05, 0.2, mn("C7"), 70), (0.24, 0.2, mn("G7"), 64), (0.46, 0.2, mn("E7"), 66), (0.7, 0.2, mn("C8"), 58)], tail=0.6)
    return mixdown(at(0, glock, 0.55), *tweets)


@sfx("moment_splat", -18, 1, noisy=True, max_s=0.5)
def moment_splat(v, rng):
    # A cream pie in the face: a wet slap, a squelchy low splat sweeping down and droplets.
    p = pv(v)
    slap = mixdown(crack(rng, 0.04, 700, 3200, 0.012), at(0, perc(CLAP, 120, pitch=0.8 * p, length=0.12), 0.6))
    body = lp(noise(0.35, rng, "pink"), 900 * p, 2) * env_exp(0.35, 0.09, 0.002) * 2.2
    sq = dsp.sweep_bp(noise(0.3, rng), dsp.glide(1400 * p, 300 * p, 0.3, 1.2), 3.0) * env_exp(0.3, 0.12, 0.004) * 2.5
    thud = thump(140 * p, 70, 0.16, 0.02, 0.05, 2.0, hp_hz=90)
    drops = debris(rng, 0.45, 60, 1800, 6000, 0.2, 0.008) * 0.5
    return room(mixdown(slap, at(0, body), at(0.01, sq, 0.6), at(0, thud, 0.5), at(0.05, drops)), rng, 0.25, 0.12)


def _bubble(f0: float, d: float) -> np.ndarray:
    # A gloopy bubble: a low tone that jumps up as it bursts.
    return osc(dsp.glide(f0, f0 * 2.6, d, 0.6), "sine") * env_exp(d, d * 0.45, 0.003)


@sfx("moment_tar", -19, 1, max_s=0.62)
def moment_tar(v, rng):
    # Tar landing over a head: a thick GLOP, a sticky splat and a few slow bubbles.
    p = [1.0, 0.92][v]
    glop = _bubble(110 * p, 0.16)
    splat = lp(noise(0.4, rng, "brown"), 700, 2) * env_exp(0.4, 0.1, 0.004) * 2.5
    smack = mixdown(crack(rng, 0.03, 500, 2200, 0.01), at(0, perc(TOM_LF, 110, KIT_ORCH, pitch=0.7 * p, length=0.25), 0.7))
    bubbles = mixdown(*[at(t, _bubble(f * p, 0.07), g) for t, f, g in ((0.22, 220, 0.4), (0.36, 180, 0.35), (0.5, 260, 0.3))])
    return room(mixdown(glop, at(0, splat, 0.8), at(0, smack, 0.7), at(0, bubbles)), rng, 0.25, 0.12)


@sfx("moment_poof", -20, 1, noisy=True, max_s=0.48)
def moment_poof(v, rng):
    # A pillow bursting (and the brawl's cloud clearing): a soft whump, a puff of air, feathers fluttering.
    p = pv(v)
    whump = thump(130 * p, 60, 0.25, 0.03, 0.08, 1.6, hp_hz=80)
    puff = nburst(rng, 0.4, 300, 2600, 0.11, 0.004, "pink") * 1.6
    pff = nburst(rng, 0.3, 2000, 7000, 0.07, 0.002) * 0.5
    flutter = mixdown(*[at(0.08 + k * 0.07, whoosh(rng, 0.09, 1500, 4500, 1.0, 0.4) * 0.25) for k in range(4)])
    return room(mixdown(whump, at(0, puff), at(0, pff), at(0, flutter)), rng, 0.3, 0.15)


def _bawk(rng, f0: float, d: float, rise: float, vowel: tuple) -> np.ndarray:
    # A cartoon hen's call: a buzzy throat through vowel formants, the pitch rising then falling.
    t = dsp.tvec(d)
    f = f0 * (1 + (rise - 1) * np.sin(np.pi * np.clip(t / d, 0, 1))) * (1 + 0.02 * np.sin(2 * np.pi * 37 * t))
    src = osc(f, "saw") + 0.25 * noise(d, rng)
    y = formant(src, list(vowel))
    env = dsp.env_adsr(d, 0.004, d * 0.4, 0.6, d * 0.35)
    return sat(y * env * 1.8, 1.4)


@sfx("moment_cluck", -20, 1, max_s=0.6)
def moment_cluck(v, rng):
    # The feathered opponent: buk, buk, BAWK!
    p = [1.0, 1.08][v]
    buk = ((600, 200, 1.0), (1100, 260, 0.6), (2500, 400, 0.2))
    caw = ((780, 240, 1.0), (1300, 300, 0.7), (2800, 450, 0.25))
    return mixdown(at(0, _bawk(rng, 520 * p, 0.07, 1.1, buk), 0.7), at(0.13, _bawk(rng, 560 * p, 0.07, 1.1, buk), 0.75), at(0.28, _bawk(rng, 480 * p, 0.3, 1.45, caw)))


@sfx("moment_clank", -18, 1, max_s=0.6)
def moment_clank(v, rng):
    # The cannon lands on the wall: an iron CLANK, a heavy thud and a short rattle.
    p = [1.0, 0.94][v]
    iron = bell(330 * p, 0.7, 0.9, 0.16, ((1, 1.0), (2.76, 0.65), (5.4, 0.4), (8.9, 0.2)))
    thud = thump(110 * p, 48, 0.4, 0.04, 0.12, 2.4, hp_hz=60)
    tom = perc(TOM_LF, 127, KIT_ORCH, pitch=0.7 * p, length=0.4)
    rattle = debris(rng, 0.35, 70, 900, 4000, 0.15, 0.01) * 0.6
    return room(mixdown(at(0, crack(rng, 0.05, 700, 3500, 0.012), 0.8), at(0, iron, 0.6), at(0, thud, 0.8), at(0, tom, 0.6), at(0.03, rattle)), rng, 0.35, 0.15)


@sfx("moment_fuse", -26, 1, noisy=True, max_s=0.6)
def moment_fuse(v, rng):
    # The fuse burns down: a crackling sizzle with a fluttering hiss.
    d = 0.6
    t = dsp.tvec(d)
    hiss = bp(noise(d, rng), 3000, 9000) * (0.6 + 0.4 * np.abs(np.sin(2 * np.pi * [23, 27][v] * t))) * 0.7
    crk = crackle(rng, d, 260, 1.0)[: len(hiss)] * 0.6
    env = np.clip(t / 0.03, 0, 1) * np.where(t > d - 0.08, (d - t) / 0.08, 1.0)
    return (hiss + crk) * env


@sfx("moment_boom", -16, 1, noisy=True, max_s=0.9, phone_gap=-6.0)
def moment_boom(v, rng):
    # The cannon: a cartoon KA-BOOM: the blast, a timpani punch under it and a snare crack on top.
    p = [1.0, 0.94][v]
    blast = explosion(rng, 0.6, 0.95 * p)
    timp = gm_note(GM["timpani"], mn("C2"), 0.5, 127, 0.8)
    pop = mixdown(crack(rng, 0.06, 500, 3000, 0.02), at(0, perc(SNARE, 127, KIT_ORCH, pitch=0.75 * p, length=0.3), 0.6))
    return mixdown(blast, at(0, timp, 0.7), at(0, pop, 0.6))


@sfx("moment_whistle", -24, 1, max_s=0.62)
def moment_whistle(v, rng):
    # The opponent sails off over the horizon: a breathy slide whistle up, a little warble at the top.
    d = 0.62
    t = dsp.tvec(d)
    f = dsp.glide(520 * [1.0, 1.06][v], 2100, d, 1.6) * (1 + 0.012 * np.sin(2 * np.pi * 6 * t) * (t / d))
    tone = osc(f, "sine") + 0.08 * osc(f * 2, "sine")
    breath = bp(noise(d, rng), 1500, 5000) * 0.08
    return (tone + breath) * dsp.env_adsr(d, 0.02, d * 0.2, 0.85, 0.12) * 0.8


@sfx("moment_twinkle", -24, 1, hp_hz=400, max_s=0.75)
def moment_twinkle(v, rng):
    # The far-off star: a bright ting (C7 on the celesta and a glass shimmer) and a quick sparkle above.
    cel = gm_note(GM["celesta"], mn("C7"), 0.4, 100, 1.0)
    shine = fm_bell(hz("C7") * [1, 2][v], 0.9, 3.5, 1.6, 0.3, 0.04)
    run = gm_notes(GM["glock"], [(0.03 + k * 0.035, 0.12, mn(n), 70) for k, n in enumerate(("E7", "G7", "C8"))], tail=0.6)
    return mixdown(cel, at(0, shine, 0.4), at(0, run, 0.35))


@sfx("moment_scuffle", -19, 1, noisy=True, max_s=1.0)
def moment_scuffle(v, rng):
    # The dust-cloud brawl: a flurry of thumps, slaps and pows, whooshes, a dust rumble and a bonk on a bell.
    d = 1.15
    hits = []
    t = 0.0
    k = 0
    while t < d - 0.12:
        kind = k % 4
        if kind == 0:
            x = perc(TOM_HM, 120, KIT_ORCH, pitch=0.9 + 0.3 * rng.random(), length=0.16)
        elif kind == 1:
            x = mixdown(crack(rng, 0.03, 900, 4500, 0.008), at(0, perc(CLAP, 110, pitch=1.0 + 0.2 * rng.random(), length=0.1), 0.6))
        elif kind == 2:
            x = knock(500 + 400 * rng.random(), 0.1, 0.03, rng)
        else:
            x = thump(150 + 60 * rng.random(), 70, 0.12, 0.02, 0.04, 2.0, hp_hz=100)
        hits.append(at(t, x, 0.55 + 0.35 * rng.random()))
        t += 0.06 + 0.08 * rng.random()
        k += 1
    swishes = [at(s, whoosh(rng, 0.14, 600, 3500, 1.4, 0.5) * 0.4) for s in (0.1, 0.42, 0.78)]
    dust = rumble(rng, d, 400, 0.6, 0.02) * 0.5 + bp(noise(d, rng, "pink"), 300, 2000) * 0.15
    ding = bell(1250 * [1, 1.06][v], 0.6, 0.8, 0.18)
    return room(mixdown(dust, *hits, *swishes, at(0.55, ding, 0.3)), rng, 0.35, 0.16)


@sfx("moment_tada", -19, 1, max_s=0.9)
def moment_tada(v, rng):
    # The celebration: "ta-DA!" in C: a brass pickup on G4, a C major chord, a glockenspiel run and a
    # splash (variant 2 a soft crash).
    brass = gm_notes(GM["brass"], [(0.0, 0.1, mn("G4"), 100), (0.14, 0.55, mn("C5"), 116), (0.14, 0.55, mn("E5"), 110), (0.14, 0.55, mn("G5"), 112)], tail=0.6)
    tpt = gm_notes(GM["trumpet"], [(0.0, 0.1, mn("G5"), 96), (0.14, 0.55, mn("C6"), 108)], tail=0.6)
    glock = gm_notes(GM["glock"], [(0.14 + k * 0.05, 0.2, mn(n), 80) for k, n in enumerate(("C6", "E6", "G6", "C7"))], tail=0.8)
    cym = perc(55, 84, KIT_STD, length=0.7) if v == 0 else perc(49, 76, KIT_STD, length=0.9)
    return mixdown(brass, at(0, tpt, 0.5), at(0, glock, 0.35), at(0.14, cym, 0.22))


@sfx("moment_wahwah", -21, 1, max_s=1.72)
def moment_wahwah(v, rng):
    # A loss, gently: a soft sad trombone, wah-wah-wah-waaah (Bb3, A3, Ab3, G3), the last note wobbling,
    # through a plunger-mute "wah" that opens on each note.
    bpm = 120
    s2b = bpm / 60
    tr = gm.Track("wah", GM["trombone"])
    notes = ((0.0, 0.26, "Bb3"), (0.3, 0.26, "A3"), (0.6, 0.26, "Ab3"), (0.9, 0.85, "G3"))
    for st, du, n in notes:
        tr.add(st * s2b, du * s2b, mn(n), 92)
    steps = 20
    for k in range(steps):
        tt = 1.0 + k * 0.045
        tr.bends.append((tt * s2b, int(1400 * np.sin(k * np.pi / 2))))
    tr.bends.append((1.95 * s2b, 0))
    x = gm.render_track(tr, bpm, seconds=2.0).mean(axis=1)
    t = dsp.tvec(2.0)[: len(x)]
    center = np.full(len(x), 520.0)
    for st, du, _ in notes:
        u = np.clip((t - st) / max(0.05, du), 0, 1)
        center += np.where((t >= st) & (t <= st + du + 0.05), 1100 * np.sin(np.pi * np.minimum(u * 1.6, 1.0)) ** 2, 0)
    wah = dsp.sweep_bp(x, center, 2.2)
    return 0.75 * wah + 0.35 * x


@sfx("moment_wind", -27, 1, noisy=True, max_s=0.9)
def moment_wind(v, rng):
    # The stand-off: a lonely whistling wind that rises and falls.
    d = 1.3
    t = dsp.tvec(d)
    center = 700 + 500 * np.sin(np.pi * t / d) + 120 * np.sin(2 * np.pi * 1.7 * t + v)
    gust = dsp.sweep_bp(noise(d, rng, "pink"), center, 4.0) * 2.2
    whistle = osc(center * 1.6, "sine") * 0.05
    return (gust + whistle) * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.2


@sfx("moment_shrug", -24, 1, max_s=0.6)
def moment_shrug(v, rng):
    # A draw: a quizzical "boop... bweep?": a marimba G4, then a rising little question (E5 to A5).
    boop = gm_note(GM["marimba"], mn("G4"), 0.2, 100, 0.4)
    d = 0.34
    t = dsp.tvec(d)
    f = dsp.glide(hz("E5"), hz("A5") * [1.0, 1.06][v], d, 0.7) * (1 + 0.01 * np.sin(2 * np.pi * 7 * t))
    q = (osc(f, "tri") * 0.5 + osc(f, "sine") * 0.5) * dsp.env_adsr(d, 0.01, 0.1, 0.8, 0.08) * 0.6
    return mixdown(boop, at(0.2, q))
