"""The combat sound pass (queue item 38 Phase A, A7): the sounds that give a fight weight, contact and
consequence. The battle view layers them on the sim's events and the unit views' beats:

- `kill_accent` (the killing blow, on top of its hit sound): a deep punch that drops away, a hard snap and
  a short room, so a kill is the biggest beat of an exchange.
- `mat_armour`, `mat_wood` (under a hit on a metal or a wooden victim): struck steel plate that rings a
  moment after the hit's crack; a dry wooden thock with splinters. About 6 dB under the hit.
- `body_fall_s`, `body_fall_m`, `body_fall_l` (a body landing on the death's ground frame): a soft thud with
  a small rebound and the gear rattling for infantry; a deeper thud with dust and tack for heavies and
  beasts; a ground boom with a rumble and scattering stones for the huge bodies.
- `die_bio_l`, `die_mech_l` (the death of a huge body): a big creature's groaning bellow and its stagger; a
  huge machine's metal groan, an inner blast and the scrap raining down.
- `clash_crash` (the moment two lines meet): a burst of steel, wood and shields with a shout from many
  throats over a low punch.
- `leap_land` (a pounce or leap touching down): a two-beat landing thump with dust.
- `ambience_battle` (a loop under a big fight): a distant battle, a crowd's murmur and shouts, far clashes
  and drums, seamless and mono.

Loudness: the kill accent sits 2 dB under the hits, the material layers 6 dB under, the falls scale with the
body (-27, -24, -21), the clash is the loudest combat beat (-19), and the ambience is a bed far under
everything. Imported at the end of sounds.py.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAP, KIT_ORCH, KIT_POWER, SIDE_STICK, SNARE, TOM_L, TOM_LF, TOM_LM, WOOD_LO, at, bell, bp, cloth, crack, debris, dsp,
    env_exp, formant, grunt, hp, knock, lp, mixdown, n_of, nburst, noise, osc, perc, room, rumble, sat, thump,
)
from sounds import explosion, pv, sfx

# ------------------------------------------------------------------------------------------------ helpers


def _steel(f0: float, dur: float = 0.3, tau: float = 0.07, bright: float = 1.0) -> np.ndarray:
    """Struck steel plate or a helm: a bright inharmonic ring, damped fast so it stays part of a hit."""
    return bell(f0, dur, bright, tau, ((1, 1.0), (2.32, 0.65), (3.87, 0.45), (5.13, 0.3), (6.9, 0.16)))


def _scatter(rng: np.random.Generator, dur: float, count: int, make, spread: float, decay: float) -> np.ndarray:
    """`count` grains from `make(k)` at random times in the first `spread` seconds, each quieter by
    exp(-t / decay): pebbles, gear and scrap settling."""
    out = np.zeros(n_of(dur))
    for k in range(count):
        t = float(rng.uniform(0, spread))
        g = make(k) * float(np.exp(-t / decay)) * (0.55 + 0.45 * float(rng.random()))
        i = n_of(t)
        e = min(len(out), i + len(g))
        out[i:e] += g[: e - i]
    return out


def _damped(x: np.ndarray, tau: float) -> np.ndarray:
    """Forces a quick decay on a sample (a drum that would ring becomes a dull thud)."""
    return x * env_exp(len(x) / dsp.SR, tau, 0.0005)[: len(x)]


def _thud(rng: np.random.Generator, f0: float, f1: float, dur: float, p: float, tom: int, tom_pitch: float, lp_hz: float) -> np.ndarray:
    """A body meeting the ground: a saturated low punch, a muffled, damped power-kit tom for the mid band
    and a dull crack. No ring: earth does not sing."""
    body = thump(f0 * p, f1, dur, 0.025, dur * 0.3, 2.2, hp_hz=max(30.0, f1 * 0.8))
    skin = _damped(lp(perc(tom, 118, KIT_POWER, pitch=tom_pitch * p, length=dur * 1.2), lp_hz, 2), dur * 0.3)
    return mixdown(body, at(0, skin, 0.65), at(0, lp(crack(rng, 0.04, 500, 2600, 0.012), 3200), 0.45))


def _dust(rng: np.random.Generator, dur: float, lo: float, hi: float, tau: float) -> np.ndarray:
    """A puff of dust and grit: pink noise swelling in and settling."""
    return bp(noise(dur, rng, "pink"), lo, hi) * env_exp(dur, tau, 0.012) * 1.4


# ------------------------------------------------------------------------------------------------ kill


@sfx("kill_accent", -24, 3, hp_hz=40)
def kill_accent(v, rng):
    # The killing blow: a low punch that drops away under a hard power-kit snap and a crack, a short
    # floor tom for the mid band, and a small room so the beat hangs a moment. Not musical.
    p = pv(v)
    drop = osc(dsp.drop(240 * p, 52, 0.26, 0.035), "sine") * env_exp(0.26, 0.08, 0.001)
    punch = thump(130 * p, 46, 0.3, 0.03, 0.09, 2.6, hp_hz=40)
    snap = perc([SNARE, CLAP, SNARE][v % 3], 124, KIT_POWER, pitch=[0.72, 0.85, 0.66][v % 3] * p, length=0.2)
    tom = _damped(perc(TOM_LF, 120, KIT_ORCH, pitch=0.8 * p, length=0.3), 0.08)
    out = mixdown(punch, at(0, drop, 0.55), at(0, snap, 0.55), at(0, crack(rng, 0.05, 900, 4500, 0.012), 0.65), at(0.003, tom, 0.35))
    return room(out, rng, 0.35, 0.22)


# ------------------------------------------------------------------------------------------------ materials


@sfx("mat_armour", -28, 3, hp_hz=300, noisy=True)
def mat_armour(v, rng):
    # Steel on plate: a helm, a breastplate and a shield boss. The ring starts a few ms after the hit's
    # crack and outlasts it, so the metal reads without masking the impact. Its upper partials are kept
    # soft and the renderer dips the strongest presence band (noisy), so it clanks without piercing.
    f0 = [1050, 860, 1280][v % 3]
    plate = ((1, 1.0), (2.32, 0.42), (3.87, 0.26), (5.13, 0.18), (6.9, 0.1))
    ring = mixdown(bell(f0, 0.3, 1.0, 0.075, plate), at(0, bell(f0 * 1.51, 0.2, 0.8, 0.04, plate), 0.3))
    tick = nburst(rng, 0.012, 2500, 9000, 0.003, 0.0003)
    scrape = nburst(rng, 0.06, 1200, 7000, 0.014, 0.0005, "pink")
    clank = lp(perc(SIDE_STICK, 112, pitch=1.15, length=0.06), 6000, 2)
    return mixdown(tick, at(0, scrape, 0.7), at(0, clank, 0.45), at(0.004, ring, 0.8))


@sfx("mat_wood", -28, 3, hp_hz=150)
def mat_wood(v, rng):
    # Wood taking a blow: a low woodblock thock, a hollow plank resonance and a few splinters.
    p = pv(v)
    block = perc(WOOD_LO, 116, pitch=[0.62, 0.7, 0.56][v % 3] * p, length=0.12)
    plank = knock([430, 520, 380][v % 3] * p, 0.12, 0.03, rng, ((1.0, 1.0), (1.7, 0.5), (2.6, 0.3), (3.9, 0.15)))
    splinters = debris(rng, 0.16, 140, 1800, 6500, 0.045, 0.005) * 0.5
    return mixdown(block, at(0, plank, 0.6), at(0.008, splinters))


# ------------------------------------------------------------------------------------------------ falls


@sfx("body_fall_s", -27, 3)
def body_fall_s(v, rng):
    # A soldier hits the ground: a soft thud, a small rebound (the landing beat's bounce), cloth and
    # leather, and the gear rattling: a helmet, a weapon, a buckle.
    p = pv(v)
    main = _thud(rng, 120, 58, 0.2, p, TOM_LF, 0.95, 1600)
    rebound = _thud(rng, 105, 62, 0.12, p * 1.08, TOM_LF, 1.05, 1300) * 0.35
    gear = _scatter(rng, 0.3, 5, lambda k: _steel(2200 + 380 * k, 0.07, 0.012, 0.7), 0.16, 0.12) * 0.22
    rustle = cloth(rng, 0.16)
    return mixdown(main, at(0.1 + 0.015 * v, rebound), at(0, rustle, 0.32), at(0.02, gear), at(0, _dust(rng, 0.25, 300, 1800, 0.06), 0.14))


@sfx("body_fall_m", -24, 3, phone_gap=-5.0)
def body_fall_m(v, rng):
    # A heavy, a rider or a big beast: a deeper thud with a shorter rebound, a cloud of dust and grit, and
    # tack or armour clattering.
    p = pv(v)
    main = _thud(rng, 95, 42, 0.32, p, TOM_LF, 0.72, 1200)
    rebound = _thud(rng, 85, 45, 0.18, p * 1.06, TOM_LF, 0.8, 1000) * 0.3
    grit = debris(rng, 0.4, 70, 400, 3200, 0.14, 0.01) * 0.45
    tack = _scatter(rng, 0.4, 5, lambda k: _steel(1500 + 260 * k, 0.09, 0.016, 0.7), 0.22, 0.15) * 0.2
    dust = _dust(rng, 0.45, 250, 1500, 0.13)
    return room(mixdown(main, at(0.13 + 0.02 * v, rebound), at(0.01, grit), at(0.03, tack), at(0, dust, 0.22)), rng, 0.4, 0.16)


@sfx("body_fall_l", -21, 2, max_s=1.4, phone_gap=-6.0)
def body_fall_l(v, rng):
    # A huge body comes down: a ground boom under a timpani stroke, the earth rumbling, stones and dirt
    # thrown up and pattering back, and a second, smaller impact as it rolls and settles.
    p = [1.0, 0.92][v]
    boom = thump(78 * p, 30, 0.7, 0.05, 0.22, 2.4, hp_hz=30)
    skin = _damped(lp(perc(TOM_LF, 127, KIT_ORCH, pitch=0.5 * p, length=0.7), 900, 2), 0.16)
    rum = rumble(rng, 1.1, 180, 0.3, 0.02) * 0.5
    stones = _scatter(rng, 1.1, 14, lambda k: lp(knock(380 + 70 * (k % 5), 0.05, 0.012, rng), 3800, 2), 0.7, 0.3) * 0.3
    settle = _thud(rng, 80, 40, 0.3, p * 1.05, TOM_LF, 0.62, 900) * 0.45
    dust = _dust(rng, 0.9, 200, 1300, 0.3)
    hit = mixdown(boom, at(0, skin, 0.7), at(0, crack(rng, 0.06, 500, 2400, 0.02), 0.55), at(0, rum), at(0.04, stones), at(0.22 + 0.03 * v, settle), at(0.01, dust, 0.28))
    return room(hit, rng, 0.6, 0.18)


# ------------------------------------------------------------------------------------------------ big deaths


def _bellow(rng: np.random.Generator, f0: float, dur: float, vowel: str, rough: float) -> np.ndarray:
    """A big creature's groan: a low buzzy voice through a vowel's formants, sliding down as it fails."""
    f = dsp.drop(f0 * 1.35, f0 * 0.72, dur, dur * 0.45) * (1 + 0.02 * osc(23, "sine", dur))
    src = osc(f, "saw") * (1 - rough + rough * np.abs(osc(f * 0.5, "square", dur))) + 0.35 * noise(dur, rng)
    fm_ = {"o": [(400, 160, 1.0), (800, 220, 0.6), (2500, 400, 0.12)], "u": [(330, 140, 1.0), (760, 200, 0.5), (2300, 400, 0.1)], "a": [(640, 200, 1.0), (1100, 260, 0.6), (2500, 400, 0.15)]}[vowel]
    y = formant(src, fm_)
    return sat(y * dsp.env_adsr(dur, 0.04, dur * 0.3, 0.45, dur * 0.5) * 1.8, 1.4)


@sfx("die_bio_l", -21, 2, max_s=1.3)
def die_bio_l(v, rng):
    # A huge creature falls: a groaning bellow that sinks as it gives out, a breath pushed out, and the
    # stagger: a leg buckling into the ground under its weight (the fall itself is body_fall_l).
    f0, vowel = [(92, "o"), (74, "u")][v]
    voice = hp(_bellow(rng, f0, 0.75, vowel, 0.35), 90, 2)
    breath = bp(noise(0.35, rng, "pink"), 300, 2200) * dsp.env_adsr(0.35, 0.05, 0.1, 0.5, 0.2) * 0.3
    stagger = _thud(rng, 90, 40, 0.28, 1.0, TOM_LF, 0.6, 1000)
    grit = debris(rng, 0.3, 60, 400, 2800, 0.1, 0.01) * 0.35
    return room(mixdown(voice, at(0.45, breath), at(0.32, stagger, 0.75), at(0.33, grit)), rng, 0.5, 0.15)


@sfx("die_mech_l", -20, 2, max_s=1.7, noisy=True, phone_gap=-6.0)
def die_mech_l(v, rng):
    # A huge machine dies: its frame groans and sags (bowed steel sliding down) for a third of a second,
    # then something inside blows, steam or air vents, and the scrap rains down.
    p = [1.0, 0.9][v]
    d = 0.9
    f = dsp.glide(230 * p, 120 * p, d, 1.4)
    groan = sum(a * osc(f * r, "saw") for r, a in ((1, 1.0), (1.52, 0.5), (2.71, 0.3))) * dsp.env_adsr(d, 0.06, 0.3, 0.6, 0.3)
    groan = bp(groan, 180, 2400) * 0.5
    blast = explosion(rng, 0.55, 0.95 * p)
    vent = bp(noise(0.6, rng), 2500, 9000) * dsp.env_adsr(0.6, 0.02, 0.2, 0.45, 0.3) * 0.25
    scrap = _scatter(rng, 1.0, 10, lambda k: _steel(900 + 210 * k, 0.12, 0.025, 0.8), 0.6, 0.3) * 0.35
    return mixdown(groan, at(0.32, blast, 0.9), at(0.36, vent), at(0.45, scrap))


# ------------------------------------------------------------------------------------------------ the clash


def _shout(rng: np.random.Generator, n: int, dur: float) -> np.ndarray:
    """A shout from many throats: `n` short grunts at different pitches and vowels, a few ms apart."""
    out = np.zeros(n_of(dur + 0.05))
    for k in range(n):
        f0 = float(rng.uniform(115, 210))
        g = grunt(rng, f0, dur * float(rng.uniform(0.75, 1.0)), "aou"[k % 3], float(rng.uniform(0.9, 1.15)))
        i = n_of(float(rng.uniform(0, 0.04)))
        e = min(len(out), i + len(g))
        out[i:e] += g[: e - i] * float(rng.uniform(0.5, 1.0))
    return out / max(1.0, n ** 0.5)


def _blow(rng: np.random.Generator, k: int) -> np.ndarray:
    """One blow of the clash, in turn steel on steel, wood on a shield and a hide drum, each with a crack."""
    kind = k % 3
    if kind == 0:
        b = mixdown(_steel(880 + 190 * k, 0.18, 0.04), at(0, nburst(rng, 0.015, 2500, 9000, 0.004, 0.0003), 0.8))
    elif kind == 1:
        b = mixdown(perc(WOOD_LO, 116, pitch=0.58 + 0.035 * k, length=0.1), at(0, knock(420 + 25 * k, 0.09, 0.022, rng), 0.5))
    else:
        b = mixdown(lp(perc(TOM_LM, 118, KIT_ORCH, pitch=0.85 + 0.03 * k, length=0.15), 2600, 2), at(0, crack(rng, 0.03, 900, 4000, 0.008), 0.5))
    return b


@sfx("clash_crash", -19, 2, max_s=1.5, noisy=True, phone_gap=-6.0)
def clash_crash(v, rng):
    # Two lines meet: a flurry of blows over the first quarter second (steel on steel, wood on shields,
    # hide drums; the first ones hardest), a low punch under the first, a crash of steel sheen, a shout from
    # many throats and a short dust roll. It must read as many weapons at once, not as an explosion.
    p = [1.0, 0.94][v]
    punch = thump(105 * p, 44, 0.3, 0.03, 0.09, 2.4, hp_hz=45)
    floor = perc(TOM_L, 124, KIT_ORCH, pitch=0.72 * p, length=0.35)
    times = np.sort(np.concatenate([[0.0, 0.012, 0.03], rng.uniform(0.04, 0.27, 10)]))
    blows = mixdown(*[at(float(t), _blow(rng, k) * (1.0 if t < 0.05 else 0.85 * np.exp(-float(t) / 0.35)) * float(rng.uniform(0.7, 1.0))) for k, t in enumerate(times)])
    sheen = bp(noise(0.8, rng), 3800, 10000) * env_exp(0.8, 0.22, 0.003) * 0.5
    shout = lp(_shout(rng, 6, 0.3), 2600, 2) * 0.5
    roll = _dust(rng, 0.7, 200, 1400, 0.2)
    out = mixdown(at(0, blows, 1.25), at(0, punch, 0.8), at(0, floor, 0.45), at(0, crack(rng, 0.06, 700, 3500, 0.018), 0.6), at(0.005, sheen), at(0.04, shout), at(0.03, roll, 0.25))
    return room(out, rng, 0.6, 0.2)


# ------------------------------------------------------------------------------------------------ landing


@sfx("leap_land", -26, 3)
def leap_land(v, rng):
    # A pounce or leap touching down: two quick beats (front and back, or both feet), a dust puff and a
    # scuff, crisper than a fall.
    p = pv(v)
    first = _thud(rng, 130, 62, 0.16, p, TOM_L, 0.85, 1800)
    second = _thud(rng, 120, 60, 0.14, p * 0.95, TOM_L, 0.8, 1600) * 0.7
    scuff = nburst(rng, 0.1, 700, 3500, 0.03, 0.003, "pink")
    return mixdown(first, at(0.035 + 0.008 * v, second), at(0.01, scuff, 0.4), at(0, _dust(rng, 0.25, 300, 1600, 0.07), 0.35))


# ------------------------------------------------------------------------------------------------ ambience

# The loop's length and the wrap-around margin on each side (the game loops the middle window, so no
# decoder or codec edge ever lands inside it; build.py writes it to the manifest as `loop`).
AMBIENCE_LOOP_S = 10.5
AMBIENCE_MARGIN_S = 0.25


def _circle_events(rng: np.random.Generator, length: float, rate: float, jitter: float = 0.5) -> list[float]:
    """Event times spread around a loop of `length` seconds at about `rate` per second (never bunched)."""
    n = max(1, int(round(length * rate)))
    base = np.sort(rng.uniform(0, length, n))
    step = length / n
    even = np.arange(n) * step + float(rng.uniform(0, step))
    return [float(t) % length for t in (even * (1 - jitter) + base * jitter)]


def _ambience_events(rng: np.random.Generator, L: float) -> list[tuple[float, np.ndarray]]:
    ev: list[tuple[float, np.ndarray]] = []
    # Far shouts and cries (a crowd at war, never words): short grunts on a few vowels, soft and dull.
    for t in _circle_events(rng, L, 2.6):
        f0 = float(rng.uniform(120, 240))
        g = grunt(rng, f0, float(rng.uniform(0.12, 0.3)), "aou"[int(rng.integers(0, 3))], float(rng.uniform(0.85, 1.2)))
        ev.append((t, g * float(rng.uniform(0.25, 0.7))))
    # Distant steel: clinks and the odd clash.
    for t in _circle_events(rng, L, 2.2):
        ev.append((t, _steel(float(rng.uniform(1100, 2600)), 0.2, float(rng.uniform(0.03, 0.06)), 0.7) * float(rng.uniform(0.15, 0.5))))
    # Wood on shields and far blows.
    for t in _circle_events(rng, L, 1.4):
        ev.append((t, knock(float(rng.uniform(380, 700)), 0.08, 0.02, rng) * float(rng.uniform(0.2, 0.55))))
    # War drums and heavy blows far off: a low thud every second or two.
    for t in _circle_events(rng, L, 0.7, 0.3):
        ev.append((t, thump(float(rng.uniform(85, 110)), 50, 0.3, 0.03, 0.09, 1.8, hp_hz=50) * float(rng.uniform(0.4, 0.8))))
    return ev


@sfx("ambience_battle", -33, 1, hp_hz=90, max_s=AMBIENCE_LOOP_S + 2 * AMBIENCE_MARGIN_S, timed=True, loop=(AMBIENCE_MARGIN_S, AMBIENCE_LOOP_S))
def ambience_battle(v, rng):
    # A distant battle under a big fight: a crowd's murmur (voiced noise through drifting vowels), far
    # shouts, clinks, shield knocks and drums, all through a big dull space. Seamless: the events sit on a
    # circle, the loop is rendered three times with its reverb and the middle copy is cut out with margins.
    L, M = AMBIENCE_LOOP_S, AMBIENCE_MARGIN_S
    n = n_of(L)
    total = 3 * n + n_of(1.5)
    buf = np.zeros(total)
    for t, s in _ambience_events(rng, L):
        for k in range(3):
            i = n_of(t) + k * n
            e = min(total, i + len(s))
            buf[i:e] += s[: e - i]
    # The murmur bed: three voices of noise that drift between two vowel bands under a slow swell. Noise
    # shaped by FFT is periodic over its own length, so one loop of it tiled three times wraps seamlessly,
    # and the drifts make whole cycles per loop.
    tt = np.arange(total) / dsp.SR

    def tiled(x: np.ndarray) -> np.ndarray:
        reps = int(np.ceil(total / len(x)))
        return np.tile(x, reps)[:total]

    bed = np.zeros(total)
    for _k in range(3):
        src = tiled(noise(L, rng, "pink"))
        drift = 0.5 + 0.5 * np.sin(2 * np.pi * (int(rng.integers(3, 9)) / L) * tt + float(rng.uniform(0, 6.28)))
        voiced = bp(src, 320, 720) * drift + bp(src, 700, 1500) * (1 - drift) * 0.8 + bp(src, 1800, 2800) * 0.15
        swell = 0.6 + 0.4 * np.sin(2 * np.pi * (int(rng.integers(2, 6)) / L) * tt + float(rng.uniform(0, 6.28)))
        bed += voiced * swell
    # Air and far footfalls under it all.
    air = lp(tiled(noise(L, rng, "brown")), 500, 2) * 0.5
    mix = buf + bed * 0.35 + air
    # Distance: a big dull space, the highs rolled off, the lows thinned.
    h = dsp.ir(1.8, rng, predelay=0.03, damp_hz=2800, stereo=False, early=10)
    wet = dsp.convolve(mix, h)[:total] * 0.45
    out = lp(hp(mix * 0.55 + wet, 110, 2), 3800, 2)
    # Cut the middle copy with the wrap-around margins.
    a, b = n - n_of(M), 2 * n + n_of(M)
    return out[a:b]
