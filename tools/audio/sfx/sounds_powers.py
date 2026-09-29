"""The power rework's sounds (DESIGN A2.9, A5.7, A13): the 32 new powers' `pw_*` ids and the shared
`power_cast`, `power_lock` and `turret_jammed`.

Each power sound starts on the power's first impact (the end of its telegraph; the telegraph has its
own `power_telegraph` or `power_lock`), opens with a hard mid-band transient so it reads on a phone
speaker, and runs about as long as the effect it scores: a sweep crosses for its sweep time, a
bombard keeps its impact rhythm, a charge covers its runners, a field settles and then lets its
visuals carry the hold. Every design is historically flavoured per age with the same building blocks
as the rest of `sounds.py`. Powers are rare events (25-60 s reloads), so the new ones render one
variant (two for the starters, the powers every player hears most); the service's pitch and volume
spread keeps repeats alive.

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAVES, KIT_ORCH, KIT_POWER, SIDE_STICK, SNARE, TOM_L, TOM_LF, TOM_LM, WOOD_HI, WOOD_LO, GM, at, bell, bp,
    chime, click, crack, crackle, debris, dsp, env_exp, fade, fm_bell, formant, gm_notes, hz, knock, lp, mixdown,
    mn, n_of, nburst, noise, osc, perc, pluck, room, rumble, sample, sat, thump, whoosh,
)
from sounds import bronze_clang, chord_hit, explosion, hit_pierce, pv, sfx, shot_cannon, shot_mg, shot_musket, shot_rifle


def _cut(x: np.ndarray, d: float, fout: float = 0.25) -> np.ndarray:
    """Trims to `d` seconds with a fade-out (the loud part stays inside the effect's own time)."""
    return fade(dsp.pad_to(x, n_of(d))[: n_of(d)], 0.002, fout)


def _hoof(rng, p: float = 1.0, g: float = 1.0) -> np.ndarray:
    """One hoof strike: a low thud with a dirt scuff (galloping horses, aurochs)."""
    return mixdown(thump(120 * p, 55, 0.12, 0.018, 0.035, 2.0, hp_hz=60), at(0, nburst(rng, 0.05, 250, 1800, 0.018, 0.002, "pink"), 0.6), at(0, knock(620 * p, 0.05, 0.012, rng), 0.25)) * g


def _gallop(rng, start: float, dur: float, p: float = 1.0, step: float = 0.23, g: float = 1.0) -> list:
    """A galloping horse from `start` for `dur`: the three-beat da-da-dum, swelling in."""
    parts = []
    t = start
    while t < start + dur:
        k = min(1.0, (t - start) / 0.4) * g
        for off, a in ((0.0, 0.7), (0.06, 0.8), (0.14, 1.0)):
            parts.append(at(t + off + rng.uniform(-0.008, 0.008), _hoof(rng, p * rng.uniform(0.92, 1.08)), a * k))
        t += step + rng.uniform(-0.015, 0.015)
    return parts


def _metal_tink(rng, f: float, g: float = 1.0) -> np.ndarray:
    """A small piece of iron landing: a bright damped ring with a click."""
    return mixdown(knock(f, 0.12, 0.03, rng, ((1.0, 1.0), (2.76, 0.6), (5.4, 0.35), (8.9, 0.15))), at(0, click(rng, 0.004, 2500, 9000), 0.4)) * g


def _whip(rng, f0: float = 500, f1: float = 2600, d: float = 0.18) -> np.ndarray:
    """A fast airborne whip (a rope, a grapnel, a spear)."""
    return whoosh(rng, d, f0, f1, 2.0, 0.55)


def _zap(rng, f: float, d: float = 0.12) -> np.ndarray:
    """A short electric zap: a buzzy downward chirp over a crackle."""
    z = osc(dsp.drop(f * 3, f, d, d * 0.3), "saw") * env_exp(d, d * 0.35, 0.0005)
    return mixdown(lp(z, 6000) * 0.5, at(0, crackle(rng, d, 900, d * 0.5), 0.6))


# =================================================================================================
# Shared cues


@sfx("power_cast", -24, 2, hp_hz=150, max_s=0.6)
def power_cast(v, rng):
    # MR-70b, the cast committed on drop: a short rising whoosh that ends in a coin clink (gold spent).
    p = pv(v)
    rise = whoosh(rng, 0.26, 500 * p, 3200 * p, 1.8, 0.8) * 0.7
    body = osc(dsp.glide(300 * p, 620 * p, 0.2, 0.7), "tri") * dsp.env_adsr(0.2, 0.02, 0.1, 0.5, 0.08) * 0.25
    clink = mixdown(chime(2093 * p, 0.35, 0.09), at(0.035, chime(2637 * p, 0.3, 0.08), 0.7), at(0, click(rng, 0.004, 3000, 9000), 0.4))
    return mixdown(rise, at(0.02, body), at(0.2, clink, 0.55))


@sfx("power_lock", -24, 1, hp_hz=200, max_s=0.8)
def power_lock(v, rng):
    # A strike locks its target (the telegraph of strikes): two tight sight ticks, then a clear
    # rising lock ping. Age-neutral, never a gun.
    t1 = mixdown(perc(CLAVES, 92, pitch=1.4, length=0.04), at(0, click(rng, 0.004, 2000, 7000), 0.5))
    ping = mixdown(fm_bell(hz("E6"), 0.55, 2.0, 1.2, 0.18, 0.03), at(0.07, fm_bell(hz("B6"), 0.5, 2.0, 1.0, 0.16, 0.03), 0.8))
    sweep = osc(dsp.glide(900, 1800, 0.14, 0.6), "sine") * env_exp(0.14, 0.05, 0.004) * 0.25
    return mixdown(t1, at(0.09, t1, 0.9), at(0.18, sweep), at(0.2, ping, 0.6))


@sfx("turret_jammed", -25, 2, hp_hz=150, max_s=0.9)
def turret_jammed(v, rng):
    # A silenced mount (Suppress): a gear clunks and grinds to a stop, sparks crackle, a motor whines down.
    p = pv(v)
    clunk = mixdown(knock(420 * p, 0.12, 0.03, rng), at(0, perc(SIDE_STICK, 100, pitch=0.8 * p, length=0.08), 0.6), at(0, thump(160 * p, 80, 0.1, 0.02, 0.03, 2.0, hp_hz=120), 0.4))
    grind = bp(noise(0.35, rng), 600, 2600) * (0.5 + 0.5 * np.abs(osc(38 * p, "square", 0.35))) * env_exp(0.35, 0.14, 0.01) * 0.7
    whine = osc(dsp.glide(900 * p, 260 * p, 0.5, 0.8), "saw") * env_exp(0.5, 0.2, 0.01)
    sparks = crackle(rng, 0.6, 500, 0.25) * 0.5
    return mixdown(clunk, at(0.03, grind), at(0.05, lp(whine, 2400), 0.22), at(0.02, sparks))


# =================================================================================================
# Stone


@sfx("pw_rockslide", -19, 2, max_s=2.0, noisy=True, phone_gap=-6.0)
def pw_rockslide(v, rng):
    # A landslide sweeps the lane for 1.5 s: a cracking break-off, a grinding roar of rock and grit,
    # boulders knocking as they tumble, and a last heavy settle.
    p = pv(v)
    d = 1.95
    t = dsp.tvec(d)
    swell = np.clip(t / 0.25, 0, 1) * np.where(t < 1.45, 1.0, np.exp(-(t - 1.45) / 0.18))
    roar = (lp(noise(d, rng, "brown"), 420) * 1.9 + bp(noise(d, rng, "pink"), 500, 2600) * 0.45) * swell
    grit = debris(rng, 1.6, 160, 900, 5000, 1.5, 0.01) * 0.7
    brk = mixdown(crack(rng, 0.09, 500, 3500, 0.03), at(0, perc(TOM_LF, 124, KIT_ORCH, pitch=0.62 * p, length=0.5), 0.8), at(0, thump(95 * p, 38, 0.5, 0.05, 0.15, 2.4, hp_hz=50), 0.7))
    knocks = []
    for k in range(9):
        tk = 0.12 + k * 0.15 + rng.uniform(-0.03, 0.03)
        f = rng.uniform(260, 520) * p
        knocks.append(at(tk, mixdown(perc(WOOD_LO, 110, pitch=rng.uniform(0.42, 0.6) * p, length=0.14), at(0, knock(f, 0.1, 0.025, rng), 0.6), at(0, thump(140 * p, 70, 0.1, 0.02, 0.04, 2.0), 0.5)), rng.uniform(0.45, 0.8)))
    settle = mixdown(thump(80 * p, 36, 0.45, 0.04, 0.14, 2.2, hp_hz=50), at(0, perc(TOM_L, 116, KIT_ORCH, pitch=0.6 * p, length=0.35), 0.7), at(0.01, debris(rng, 0.35, 120, 700, 4000, 0.12, 0.01), 0.5))
    return _cut(room(mixdown(roar, at(0, brk), at(0.05, grit), *knocks, at(1.45, settle, 0.8)), rng, 0.55, 0.2), d, 0.3)


@sfx("pw_tar", -21, 1, max_s=1.6)
def pw_tar(v, rng):
    # Sticky Tar: a heavy wet splat of pitch, then slow, thick bubbles gloop as it sets.
    splat_n = lp(noise(0.25, rng, "pink"), 1400) * env_exp(0.25, 0.06, 0.002) * 1.6
    splat = mixdown(thump(110, 45, 0.3, 0.03, 0.09, 2.2, hp_hz=60), at(0, splat_n), at(0, formant(osc(dsp.drop(260, 120, 0.2, 0.05), "saw"), [(380, 140, 1.0), (800, 200, 0.5)]) * env_exp(0.2, 0.05, 0.002), 0.5))
    drops = [at(0.08 + k * 0.05, nburst(rng, 0.04, 300, 1800, 0.012, 0.001, "pink"), 0.5 * rng.uniform(0.5, 1)) for k in range(5)]
    bubbles = []
    for k, tb in enumerate((0.45, 0.72, 1.02, 1.3)):
        f0 = rng.uniform(160, 240)
        b = osc(dsp.glide(f0, f0 * 2.4, 0.08, 0.6), "sine") * env_exp(0.08, 0.025, 0.002)
        bubbles.append(at(tb, mixdown(b, at(0.06, click(rng, 0.003, 600, 3000), 0.3)), 0.5 - 0.06 * k))
    ooze = lp(noise(1.4, rng, "brown"), 260) * env_exp(1.4, 0.6, 0.05) * 0.8
    slap = mixdown(crack(rng, 0.06, 900, 4500, 0.014), at(0, click(rng, 0.005, 1500, 6000), 0.6))
    return _cut(mixdown(at(0, slap, 0.7), splat, *drops, *bubbles, at(0.05, ooze)), 1.55, 0.3)


@sfx("pw_huntcry", -20, 1, max_s=1.5)
def pw_huntcry(v, rng):
    # Hunt Cry: the hunters' war whoop over two big hide-drum strokes and a rattle.
    d = 0.75
    f = np.concatenate([dsp.glide(220, 420, 0.28, 0.6), dsp.glide(420, 330, d - 0.28, 1.2)])
    f = f * (1 + 0.03 * osc(6.5, "sine", d))
    src = osc(f, "saw") + 0.12 * noise(d, rng)
    whoop = formant(src, [(760, 220, 1.0), (1250, 280, 0.6), (2700, 450, 0.2)]) * dsp.env_adsr(d, 0.03, 0.2, 0.75, 0.3)
    whoop2 = formant(osc(f * 1.26, "saw"), [(820, 240, 1.0), (1350, 300, 0.5)]) * dsp.env_adsr(d, 0.06, 0.2, 0.6, 0.3) * 0.5
    drum = mixdown(sample(GM["taiko"], 45, 124, 0.3, 1.0, pitch=0.9, length=0.7), at(0, thump(110, 50, 0.3, 0.03, 0.1, 2.0, hp_hz=60), 0.5))
    rattle = bp(noise(0.7, rng), 2500, 8000) * (0.4 + 0.6 * np.abs(osc(16, "sine", 0.7))) * env_exp(0.7, 0.3, 0.01) * 0.9
    stick = mixdown(perc(CLAVES, 110, pitch=0.8, length=0.05), at(0, crack(rng, 0.04, 1200, 5000, 0.01), 0.6))
    edge = bp(sat(whoop, 2.2), 1800, 4500) * 0.8
    return _cut(room(mixdown(at(0, drum), at(0, stick, 0.6), at(0.22, drum, 0.9), at(0.22, stick, 0.5), at(0.05, sat(whoop, 1.3), 0.8), at(0.05, edge), at(0.08, whoop2), at(0.2, rattle)), rng, 0.5, 0.25), 1.45, 0.3)


@sfx("pw_spear", -20, 1, max_s=1.0)
def pw_spear(v, rng):
    # Hunter's Spear lands: a last whip of air, a deep wooden thunk into the target and the shaft's quiver.
    air = _whip(rng, 500, 2200, 0.12) * 0.6
    thunk = mixdown(perc(WOOD_LO, 124, pitch=0.5, length=0.18), at(0, knock(380, 0.12, 0.03, rng), 0.8), at(0, thump(150, 60, 0.2, 0.02, 0.06, 2.2, hp_hz=70), 0.8), at(0, crack(rng, 0.05, 700, 3500, 0.015), 0.7))
    qv = 0.5
    quiver = lp(osc(95 * (1 + 0.08 * osc(19, "sine", qv) * np.exp(-dsp.tvec(qv) / 0.2)), "saw"), 900) * env_exp(qv, 0.18, 0.002) * 0.35
    thwang = pluck(98, 0.5, rng, damp=0.4, bright=0.4) * 0.5
    return _cut(room(mixdown(air, at(0.1, thunk), at(0.11, quiver), at(0.11, thwang)), rng, 0.35, 0.2), 0.95, 0.25)


# =================================================================================================
# Bronze Age


def _thunder_crack(rng, p: float = 1.0) -> np.ndarray:
    """A close lightning strike: a white-hot snap, a sizzle and a short ground boom."""
    snap = mixdown(nburst(rng, 0.03, 1500, 11000, 0.006, 0.0002) * 1.6, at(0, crack(rng, 0.08, 900, 6000, 0.018), 1.0))
    sizzle = crackle(rng, 0.25, 1400, 0.08) * 0.7
    boom = mixdown(thump(120 * p, 40, 0.45, 0.03, 0.12, 2.4, hp_hz=50), at(0, sample(GM["gunshot"], 60, 124, 0.3, 0.8, pitch=0.8 * p, length=0.5), 0.6))
    return mixdown(snap, at(0, sizzle), at(0.005, boom, 0.8))


@sfx("pw_bolts", -19, 1, max_s=2.3, noisy=True, phone_gap=-6.0)
def pw_bolts(v, rng):
    # Zeus's Bolts: six bolts cracking down 0.25 s apart under a rolling thunder that grows.
    d = 2.25
    parts = [at(k * 0.25 + rng.uniform(-0.01, 0.01), _thunder_crack(rng, 1.0 + 0.05 * ((k * 3) % 5 - 2)), 0.75 + 0.05 * (k % 2)) for k in range(6)]
    roll = lp(noise(d, rng, "brown"), 320) * (0.5 + 0.5 * np.abs(osc(3.1, "sine", d))) * np.clip(dsp.tvec(d) / 0.6, 0, 1) * np.exp(-np.clip(dsp.tvec(d) - 1.3, 0, None) / 0.4) * 1.6
    return _cut(room(mixdown(*parts, at(0.05, roll)), rng, 0.8, 0.25), d, 0.4)


@sfx("pw_gaze", -20, 1, max_s=1.6)
def pw_gaze(v, rng):
    # Medusa's Gaze: a hiss of serpents and an eerie glare, and the crack of flesh turning to stone.
    d = 1.3
    hiss = bp(noise(d, rng), 2500, 7500) * (0.55 + 0.45 * osc(13, "sine", d)) * dsp.env_adsr(d, 0.02, 0.3, 0.5, 0.6) * 0.5
    glare = osc(dsp.glide(hz("E5"), hz("F5"), d), "sine") * osc(dsp.glide(hz("F5"), hz("G#5"), d), "sine")
    glare = lp(glare + 0.35 * osc(dsp.glide(hz("B4"), hz("C5"), d), "tri"), 3200) * dsp.env_adsr(d, 0.04, 0.3, 0.6, 0.6)
    stone = mixdown(perc(WOOD_LO, 122, pitch=0.45, length=0.18), at(0, crack(rng, 0.09, 500, 3500, 0.025), 1.0), at(0, thump(120, 50, 0.25, 0.03, 0.08, 2.2, hp_hz=60), 0.8), at(0.01, debris(rng, 0.45, 110, 800, 4500, 0.15, 0.01), 0.6))
    grind = lp(noise(0.5, rng, "brown"), 700) * (0.5 + 0.5 * np.abs(osc(15, "sine", 0.5))) * env_exp(0.5, 0.2, 0.01) * 1.2
    return _cut(room(mixdown(stone, at(0.02, grind), at(0, hiss), at(0.02, glare, 0.55)), rng, 0.5, 0.22), 1.5, 0.4)


@sfx("pw_chariots", -19, 2, max_s=2.3, phone_gap=-6.0)
def pw_chariots(v, rng):
    # Chariot Rush: three chariots 0.5 s apart, galloping pairs over rattling wheels, a whip crack,
    # and bronze clashing into the enemy line.
    p = pv(v)
    d = 2.25
    parts = []
    for c in range(3):
        t0 = c * 0.5
        parts += _gallop(rng, t0, 1.1, p * (1 + 0.04 * c), 0.2, 0.8 - 0.1 * c)
        rattle = bp(noise(1.1, rng), 700, 3500) * (0.4 + 0.6 * np.abs(osc(11, "sine", 1.1))) * dsp.env_adsr(1.1, 0.1, 0.3, 0.7, 0.3) * 0.35
        parts.append(at(t0, rattle))
        parts.append(at(t0 + 0.6, bronze_clang(233 * p * (1 + 0.05 * c), 0.6, 0.7, 0.14), 0.25))
    whipc = mixdown(crack(rng, 0.03, 1500, 8000, 0.006), at(0, click(rng, 0.004, 3000, 9000), 0.6))
    neigh_d = 0.5
    nf = dsp.glide(900, 520, neigh_d, 1.3) * (1 + 0.06 * osc(18, "sine", neigh_d))
    neigh = formant(osc(nf, "saw"), [(900, 250, 1.0), (1800, 350, 0.5)]) * dsp.env_adsr(neigh_d, 0.03, 0.2, 0.6, 0.2) * 0.35
    roll = lp(noise(d, rng, "brown"), 280) * np.clip(dsp.tvec(d) / 0.4, 0, 1) * 1.3
    return _cut(room(mixdown(*parts, at(0, whipc, 0.8), at(0.08, neigh), at(0, roll)), rng, 0.45, 0.18), d, 0.35)


@sfx("pw_apollo", -20, 1, max_s=1.3)
def pw_apollo(v, rng):
    # Apollo's Arrow: a golden arrow strikes in a burst of sunlight: a bright thwack, a lyre flourish
    # and a choir's shining "ah" (in C).
    hit = mixdown(hit_pierce(0, rng), at(0, crack(rng, 0.06, 1200, 6000, 0.012), 0.8), at(0, thump(180, 90, 0.12, 0.015, 0.04, 2.0), 0.6))
    lyre = gm_notes(GM["harp"], [(i * 0.035, 0.6, mn(n), 100) for i, n in enumerate(("C5", "E5", "G5", "C6"))], tail=0.8)
    choir = chord_hit(GM["choir"], 0, ("C5", "E5", "G5"), 0.0, 0.7, 96)
    shine = mixdown(fm_bell(hz("G6"), 0.9, 3.5, 1.5, 0.3, 0.05), at(0.04, fm_bell(hz("C7"), 0.8, 3.5, 1.2, 0.25, 0.05), 0.7))
    return _cut(room(mixdown(hit, at(0.02, lyre, 0.55), at(0.03, choir, 0.45), at(0.02, shine, 0.3)), rng, 0.6, 0.22), 1.25, 0.35)


# =================================================================================================
# Medieval


@sfx("pw_caltrops", -21, 1, max_s=1.3)
def pw_caltrops(v, rng):
    # Caltrops: a sack of iron spikes flung across the ground: a scatter of metal tinks that settles.
    toss = whoosh(rng, 0.2, 400, 1600, 1.2, 0.5, "pink") * 0.35
    tinks = []
    t = 0.12
    while t < 0.75:
        tinks.append(at(t, _metal_tink(rng, rng.uniform(1700, 3400)), rng.uniform(0.35, 0.8) * (1.1 - (t - 0.12))))
        t += rng.exponential(0.035)
    thud = mixdown(thump(150, 70, 0.12, 0.02, 0.04, 2.0), at(0, nburst(rng, 0.1, 300, 2000, 0.03, 0.002, "pink"), 0.6))
    rattle = debris(rng, 0.6, 180, 2500, 9000, 0.25, 0.006) * 0.5
    return _cut(mixdown(toss, at(0.1, thud, 0.6), *tinks, at(0.12, rattle)), 1.25, 0.3)


@sfx("pw_oil", -20, 1, max_s=1.8, noisy=True)
def pw_oil(v, rng):
    # Boiling Oil: a cauldron tips (a heavy iron clank), the oil pours in a rush and hisses and spits
    # as it rolls across the ground.
    clank = mixdown(bell(185, 0.6, 0.6, 0.12, ((1, 1.0), (2.3, 0.5), (3.9, 0.3))), at(0, perc(TOM_L, 110, KIT_ORCH, pitch=0.8, length=0.2), 0.6), at(0, click(rng, 0.004, 1500, 5000), 0.4))
    d = 1.2
    pour = dsp.sweep_lp(noise(d, rng, "pink"), dsp.glide(900, 2600, d), 0.8) * dsp.env_adsr(d, 0.06, 0.3, 0.8, 0.4) * 1.3
    gloop = lp(noise(d, rng, "brown"), 350) * dsp.env_adsr(d, 0.05, 0.3, 0.8, 0.4) * 1.6
    hiss = bp(noise(1.5, rng), 3500, 11000) * dsp.env_adsr(1.5, 0.15, 0.3, 0.7, 0.8) * 0.45
    spits = debris(rng, 1.3, 90, 2000, 8000, 0.8, 0.006) * 0.55
    return _cut(room(mixdown(clank, at(0.08, pour), at(0.08, gloop), at(0.25, hiss), at(0.25, spits)), rng, 0.45, 0.2), 1.75, 0.4)


@sfx("pw_knights", -19, 2, max_s=2.3, phone_gap=-6.0)
def pw_knights(v, rng):
    # Knights' Charge: a horn sounds, three armoured horses gallop in with jingling mail, and lances
    # splinter on the enemy line (the horn in D, the Medieval key).
    p = pv(v)
    d = 2.25
    horn = gm_notes(GM["horn"], [(0.0, 0.18, mn("A3"), 110), (0.18, 0.45, mn("D4"), 116), (0.18, 0.45, mn("A4"), 96)], tail=0.6)
    parts = []
    for c in range(3):
        t0 = 0.1 + c * 0.5
        parts += _gallop(rng, t0, 1.1, 0.85 * p * (1 + 0.03 * c), 0.24, 0.9 - 0.1 * c)
        mail = bp(noise(1.0, rng), 3000, 9000) * (0.3 + 0.7 * np.abs(osc(4.2, "sine", 1.0)) ** 3) * dsp.env_adsr(1.0, 0.1, 0.3, 0.7, 0.3) * 0.3
        parts.append(at(t0, mail))
        splinter = mixdown(crack(rng, 0.08, 600, 4000, 0.02), at(0, perc(WOOD_HI, 114, pitch=0.7, length=0.1), 0.7), at(0.01, debris(rng, 0.25, 140, 900, 5000, 0.08, 0.008), 0.6), at(0, bronze_clang(310 * p, 0.4, 0.8, 0.08), 0.3))
        parts.append(at(t0 + 0.75, splinter, 0.8 - 0.1 * c))
    roll = lp(noise(d, rng, "brown"), 260) * np.clip(dsp.tvec(d) / 0.4, 0, 1) * 1.2
    return _cut(room(mixdown(at(0, horn, 0.7), *parts, at(0.1, roll)), rng, 0.5, 0.18), d, 0.35)


@sfx("pw_undermine", -19, 1, max_s=1.9, noisy=True, phone_gap=-6.0)
def pw_undermine(v, rng):
    # Undermine: the sappers fire their tunnel: a muffled underground boom, timbers snap and the
    # ground heaves and settles under the enemy wall.
    boom = mixdown(thump(70, 30, 0.9, 0.08, 0.3, 2.6, hp_hz=40), at(0, lp(explosion(rng, 0.8, 0.8), 900), 1.0))
    snaps = [at(0.15 + k * 0.13 + rng.uniform(0, 0.05), mixdown(crack(rng, 0.06, 500, 3000, 0.018), at(0, perc(WOOD_LO, 110, pitch=rng.uniform(0.5, 0.7), length=0.12), 0.7)), 0.6 * rng.uniform(0.6, 1)) for k in range(5)]
    heave = rumble(rng, 1.6, 240, 0.7, 0.05) * 0.9
    settle = debris(rng, 1.2, 120, 500, 3500, 0.5, 0.015) * 0.7
    return _cut(room(mixdown(boom, *snaps, at(0.05, heave), at(0.3, settle)), rng, 0.6, 0.2), 1.85, 0.45)


# =================================================================================================
# Age of Muskets


@sfx("pw_volley", -19, 2, max_s=1.7, noisy=True, phone_gap=-6.0)
def pw_volley(v, rng):
    # Volley Fire: a line of muskets fires down the rank in 0.9 s (a rolling volley), and the powder
    # smoke hisses out behind it.
    p = pv(v)
    shots = [at(k * 0.13 + rng.uniform(-0.015, 0.015), shot_musket((k + v) % 3, rng), 0.75 * rng.uniform(0.85, 1.0)) for k in range(8)]
    drum = gm_notes(GM["taiko"], [(0.0, 0.1, 50, 96)], tail=0.4)
    smoke = nburst(rng, 1.3, 300, 2200, 0.6, 0.05, "pink") * 0.5
    snare = perc(SNARE, 100, KIT_ORCH, pitch=1.0 * p, length=0.2)
    return _cut(mixdown(at(0, snare, 0.35), at(0, drum, 0.3), *shots, at(0.05, smoke)), 1.65, 0.35)


@sfx("pw_nets", -20, 1, max_s=1.5)
def pw_nets(v, rng):
    # Boarding Nets: two grapnels whip out, the net slaps down, and the ropes creak as it hauls tight.
    whips = mixdown(_whip(rng, 400, 2000, 0.2), at(0.07, _whip(rng, 500, 2400, 0.2), 0.8))
    hooks = mixdown(_metal_tink(rng, 1500, 0.6), at(0.06, _metal_tink(rng, 1300, 0.5)))
    slap = mixdown(nburst(rng, 0.12, 250, 2200, 0.04, 0.002, "pink") * 1.4, at(0, thump(140, 70, 0.15, 0.02, 0.05, 2.0), 0.6), at(0, perc(TOM_LM, 100, KIT_ORCH, pitch=0.9, length=0.15), 0.4))
    cd = 0.7
    creak_f = dsp.glide(260, 180, cd) * (1 + 0.15 * osc(9, "sine", cd))
    creak = bp(osc(creak_f, "saw") * (0.5 + 0.5 * np.abs(osc(7, "square", cd))), 400, 2500) * dsp.env_adsr(cd, 0.05, 0.2, 0.7, 0.2) * 0.4
    haul = whoosh(rng, 0.5, 900, 300, 1.2, 0.3) * 0.4
    return _cut(room(mixdown(whips, at(0.18, hooks), at(0.2, slap), at(0.4, creak), at(0.38, haul)), rng, 0.4, 0.18), 1.45, 0.3)


@sfx("pw_horse_art", -19, 1, max_s=2.2, noisy=True, phone_gap=-6.0)
def pw_horse_art(v, rng):
    # Horse Artillery: a light battery unlimbers and fires six rounds 0.25 s apart that thump into the dirt.
    parts = []
    for k in range(6):
        t = k * 0.25 + rng.uniform(-0.01, 0.01)
        parts.append(at(t, shot_cannon(k % 3, rng), 0.45))
        parts.append(at(t + 0.12, lp(explosion(rng, 0.25, 1.0 + 0.05 * (k % 3 - 1)), 3500), 0.5))
    trumpet = gm_notes(GM["trumpet"], [(0.0, 0.1, mn("B4"), 96), (0.1, 0.25, mn("E5"), 104)], tail=0.4)
    return _cut(mixdown(at(0, trumpet, 0.3), *parts), 2.15, 0.4)


@sfx("pw_sharpshooter", -21, 1, max_s=1.1)
def pw_sharpshooter(v, rng):
    # Sharpshooter: two long-rifle cracks 0.3 s apart, each with a ball's whine and a distant echo.
    def shot(k):
        rif = shot_rifle(k, rng)
        ping = osc(dsp.glide(2400, 1500, 0.2, 1.3), "sine") * env_exp(0.2, 0.07, 0.003) * 0.12
        echo = lp(rif, 2500) * 0.25
        return mixdown(rif, at(0.01, ping), at(0.22, echo))
    return _cut(room(mixdown(shot(0), at(0.3, shot(1), 0.9)), rng, 0.8, 0.2), 1.05, 0.3)


# =================================================================================================
# Great War


@sfx("pw_gunline", -20, 2, max_s=1.9, noisy=True)
def pw_gunline(v, rng):
    # Gun Line: a water-cooled machine gun walks its fire across the zone for 1.5 s; rounds kick up dirt.
    p = pv(v)
    parts = []
    t = 0.0
    k = 0
    while t < 1.45:
        parts.append(at(t, shot_mg(k % 3, rng), 0.7 * rng.uniform(0.85, 1.0)))
        if k % 2 == 0:
            parts.append(at(t + 0.05, nburst(rng, 0.06, 300, 2500, 0.02, 0.002, "pink"), 0.4))
        t += 0.085 * rng.uniform(0.92, 1.08)
        k += 1
    rattle = bp(noise(1.5, rng), 1500, 5000) * (0.5 + 0.5 * np.abs(osc(11.7 * p, "square", 1.5))) * dsp.env_adsr(1.5, 0.02, 0.2, 0.8, 0.1) * 0.12
    tail = rumble(rng, 0.6, 350, 0.25) * 0.5
    return _cut(mixdown(*parts, at(0, rattle), at(1.4, tail)), 1.85, 0.35)


@sfx("pw_wire", -21, 1, max_s=1.4)
def pw_wire(v, rng):
    # Barbed Wire: stakes hammered in, then the coils spring open with a metallic twang and rattle.
    stakes = [at(k * 0.1, mixdown(knock(560 + 60 * k, 0.08, 0.02, rng), at(0, thump(170, 90, 0.08, 0.015, 0.03, 2.0), 0.5)), 0.6) for k in range(3)]
    springs = []
    for k in range(5):
        f = rng.uniform(140, 220)
        sp = osc(dsp.glide(f * 2.5, f, 0.35, 1.4) * (1 + 0.05 * osc(28, "sine", 0.35)), "saw") * env_exp(0.35, 0.12, 0.002)
        springs.append(at(0.3 + k * 0.08 + rng.uniform(0, 0.03), bp(sp, 400, 5000), 0.45))
    rattle = debris(rng, 0.7, 200, 2500, 9000, 0.3, 0.005) * 0.45
    return _cut(room(mixdown(*stakes, *springs, at(0.3, rattle)), rng, 0.35, 0.18), 1.35, 0.3)


@sfx("pw_railgun", -17, 1, max_s=2.2, noisy=True, phone_gap=-6.0)
def pw_railgun(v, rng):
    # The Railway Gun's shell lands: a last freight-train rush, then a colossal blast, a pressure boom
    # and a long rumble of falling earth.
    rush = dsp.sweep_bp(noise(0.14, rng, "pink"), dsp.glide(2500, 500, 0.14), 1.4) * np.linspace(0.3, 1, n_of(0.14)) * 1.2
    blast = mixdown(explosion(rng, 1.0, 0.8), at(0.08, explosion(rng, 0.5, 0.65), 0.5))
    press = thump(60, 26, 1.0, 0.1, 0.35, 2.6, hp_hz=38)
    fall = debris(rng, 1.4, 140, 400, 3500, 0.6, 0.02) * 0.8
    return _cut(mixdown(rush, at(0.12, blast), at(0.12, press, 0.8), at(0.4, fall)), 2.15, 0.5)


@sfx("pw_hospital", -21, 1, max_s=1.6)
def pw_hospital(v, rng):
    # Field Hospital: a bandage rips off the roll, then a warm, reassuring rising chord (in C).
    rip = mixdown(bp(noise(0.18, rng), 1500, 7000) * (0.4 + 0.6 * np.abs(osc(60, "square", 0.18))) * env_exp(0.18, 0.08, 0.005) * 0.8, at(0, click(rng, 0.004, 2000, 7000), 0.4))
    harp = gm_notes(GM["harp"], [(i * 0.07, 0.8, mn(n), 96) for i, n in enumerate(("C4", "E4", "G4", "C5", "E5"))], tail=1.0)
    pad = chord_hit(GM["strings"], 0, ("C4", "G4", "E5"), 0.05, 0.9, 80)
    bell_ = mixdown(chime(hz("G5"), 0.8, 0.25), at(0.12, chime(hz("C6"), 0.9, 0.3), 0.8))
    return _cut(room(mixdown(rip, at(0.12, harp, 0.7), at(0.12, pad, 0.35), at(0.3, bell_, 0.3)), rng, 0.6, 0.25), 1.55, 0.45)


# =================================================================================================
# Modern


def _prop_plane(rng, d: float, f: float, bright: float = 1.0) -> np.ndarray:
    """A fighter diving past: a hard-revving radial engine with a doppler drop."""
    dop = dsp.glide(f * 1.25, f * 0.75, d, 1.4)
    eng = osc(dop, "saw") + 0.5 * osc(dop * 2, "square") + 0.3 * osc(dop * 3, "saw")
    eng = lp(eng * (0.75 + 0.25 * osc(dop / 3, "sine")), 1600 * bright)
    air = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(2400, 900, d, 1.2), 1.2)
    env = np.sin(np.linspace(0, np.pi, n_of(d))) ** 0.9
    return (eng * 0.45 + air * 0.5) * env


@sfx("pw_strafe", -19, 2, max_s=2.0, noisy=True)
def pw_strafe(v, rng):
    # Strafing Run: a fighter screams down over the lane with its guns hammering, then pulls away.
    p = pv(v)
    d = 1.95
    plane = _prop_plane(rng, d, 110 * p)
    guns = []
    t = 0.15
    k = 0
    while t < 1.4:
        guns.append(at(t, shot_mg(k % 3, rng), 0.55))
        guns.append(at(t + 0.04, nburst(rng, 0.05, 300, 2600, 0.018, 0.002, "pink"), 0.35))
        t += 0.07 * rng.uniform(0.9, 1.1)
        k += 1
    return _cut(mixdown(at(0, plane, 0.9), *guns), d, 0.35)


@sfx("pw_flak", -20, 1, max_s=1.3, noisy=True)
def pw_flak(v, rng):
    # AA Screen: three flak shells burst in the sky 0.2 s apart: a hollow crump and a rain of shrapnel.
    def burst(p):
        return mixdown(thump(150 * p, 70, 0.3, 0.02, 0.08, 2.4, hp_hz=80), at(0, crack(rng, 0.07, 500, 3200, 0.02), 1.0), at(0, perc(SNARE, 118, KIT_POWER, pitch=0.7 * p, length=0.25), 0.6), at(0.02, nburst(rng, 0.4, 400, 2000, 0.14, 0.01, "pink"), 0.6), at(0.05, debris(rng, 0.5, 90, 1500, 6000, 0.2, 0.006), 0.5))
    return _cut(room(mixdown(burst(1.0), at(0.2, burst(0.92), 0.9), at(0.4, burst(1.06), 0.85)), rng, 0.8, 0.25), 1.25, 0.35)


@sfx("pw_tanks", -19, 1, max_s=2.5, noisy=True, phone_gap=-6.0)
def pw_tanks(v, rng):
    # Tank Rush: the lead tank fires, then two tanks grind forward on clanking treads with a diesel roar.
    d = 2.45
    gun = mixdown(shot_cannon(1, rng), at(0.02, lp(explosion(rng, 0.3, 0.9), 3000), 0.6))
    diesel_f = dsp.glide(36, 48, d, 0.6) * (1 + 0.04 * osc(5, "sine", d))
    diesel = lp(osc(diesel_f, "saw") + 0.6 * osc(diesel_f * 2, "square") + 0.4 * noise(d, rng, "brown"), 520) * np.clip(dsp.tvec(d) / 0.3, 0, 1) * 0.8
    treads = []
    for tank, t0 in enumerate((0.1, 0.7)):
        t = t0
        while t < min(d, t0 + 1.7):
            treads.append(at(t, mixdown(perc(SIDE_STICK, 84, pitch=0.55 + 0.05 * tank, length=0.05), at(0, knock(700 + 80 * tank, 0.04, 0.01, rng), 0.4)), 0.16 * rng.uniform(0.7, 1.0)))
            t += 0.11 * rng.uniform(0.9, 1.1)
    squeal = bp(noise(d, rng), 1800, 4200) * (0.3 + 0.7 * np.abs(osc(1.7, "sine", d)) ** 4) * 0.12
    return _cut(mixdown(at(0, gun, 1.3), at(0.05, diesel), *treads, at(0.2, squeal)), d, 0.45)


@sfx("pw_sniper", -21, 1, max_s=1.3)
def pw_sniper(v, rng):
    # Sniper Team: one heavy rifle crack with a supersonic snap and a long echo off the hills.
    rif = mixdown(shot_rifle(2, rng), at(0, nburst(rng, 0.02, 2500, 12000, 0.004, 0.0002), 1.0), at(0, thump(120, 50, 0.25, 0.02, 0.08, 2.2, hp_hz=60), 0.5))
    echo1 = lp(rif, 2200) * 0.3
    echo2 = lp(rif, 1500) * 0.15
    bolt = mixdown(perc(CLAVES, 80, pitch=0.7, length=0.04), at(0.08, perc(SIDE_STICK, 76, pitch=0.9, length=0.05), 0.8))
    return _cut(mixdown(rif, at(0.28, echo1), at(0.62, echo2), at(0.85, bolt, 0.35)), 1.25, 0.3)


# =================================================================================================
# Future


@sfx("pw_pdg", -20, 1, max_s=2.3)
def pw_pdg(v, rng):
    # Point Defense Grid: twenty micro-missiles launch in a rippling salvo and pop in quick plasma bursts.
    parts = []
    for k in range(20):
        t = k * 0.1 + rng.uniform(-0.01, 0.01)
        fw = osc(dsp.glide(900, 3200, 0.07, 0.6), "sine") * env_exp(0.07, 0.03, 0.002) * 0.25
        pop = mixdown(thump(260, 130, 0.08, 0.01, 0.025, 2.0, hp_hz=130), at(0, crack(rng, 0.04, 1200, 6000, 0.01), 0.7), at(0, osc(dsp.drop(1800, 600, 0.06, 0.015), "tri") * env_exp(0.06, 0.02, 0.0005), 0.3))
        parts.append(at(t, fw))
        parts.append(at(t + 0.06, pop, rng.uniform(0.45, 0.7)))
    hum = lp(osc(dsp.glide(110, 140, 2.2), "saw"), 900) * dsp.env_adsr(2.2, 0.05, 0.3, 0.6, 0.4) * 0.15
    return _cut(mixdown(*parts, at(0, hum)), 2.25, 0.35)


@sfx("pw_stasis", -20, 1, max_s=2.3)
def pw_stasis(v, rng):
    # Stasis Field: a dome snaps shut (a glassy freeze), hums for the 2 s stun, then shatters.
    snap = mixdown(fm_bell(hz("E6"), 1.0, 3.01, 2.0, 0.35, 0.05), at(0, fm_bell(hz("B6"), 0.9, 3.01, 1.6, 0.3, 0.05), 0.7), at(0, click(rng, 0.005, 2000, 9000), 0.6), at(0, thump(200, 90, 0.15, 0.02, 0.05, 2.0), 0.5))
    freeze = dsp.sweep_bp(noise(0.35, rng, "pink"), dsp.glide(5000, 800, 0.35), 2.0) * env_exp(0.35, 0.15, 0.003) * 0.7
    hd = 1.7
    hum = (osc(hz("E3"), "sine", hd) + 0.5 * osc(hz("B3") * 1.003, "sine", hd) + 0.2 * osc(hz("E4"), "tri", hd)) * (0.7 + 0.3 * osc(6, "sine", hd)) * dsp.env_adsr(hd, 0.1, 0.3, 0.6, 0.3) * 0.35
    shatter = mixdown(debris(rng, 0.45, 260, 3000, 11000, 0.15, 0.006), at(0, chime(hz("G6"), 0.4, 0.1), 0.4), at(0, crack(rng, 0.05, 2000, 8000, 0.012), 0.6))
    return _cut(mixdown(snap, at(0, freeze), at(0.1, hum), at(1.85, shatter, 0.8)), 2.25, 0.2)


@sfx("pw_drones", -20, 2, max_s=2.3)
def pw_drones(v, rng):
    # Drone Swarm: a cloud of rotors whines in, and drone after drone dives and pops (10 over 2 s).
    p = pv(v)
    d = 2.25
    swarm = np.zeros(n_of(d))
    for k in range(5):
        f = rng.uniform(170, 260) * p
        f_t = f * (1 + 0.03 * osc(rng.uniform(2, 5), "sine", d))
        swarm += osc(f_t, "saw") * (0.6 + 0.4 * osc(rng.uniform(20, 40), "sine", d))
    swarm = bp(swarm, 300, 3000) * dsp.env_adsr(d, 0.25, 0.4, 0.7, 0.4) * 0.12
    pops = []
    for k in range(10):
        t = k * 0.2 + rng.uniform(-0.01, 0.01)
        dive = osc(dsp.glide(1400 * p, 500 * p, 0.12, 1.3), "saw") * env_exp(0.12, 0.06, 0.002)
        hit = mixdown(thump(220 * p, 110, 0.1, 0.012, 0.03, 2.0, hp_hz=110), at(0, crack(rng, 0.05, 1000, 5000, 0.012), 0.8), at(0, _zap(rng, 700 * p, 0.1), 0.4))
        pops.append(at(t, lp(dive, 3500), 0.15))
        pops.append(at(t + 0.1, hit, rng.uniform(0.5, 0.7)))
    return _cut(mixdown(swarm, *pops), d, 0.35)


@sfx("pw_emp", -19, 1, max_s=1.9)
def pw_emp(v, rng):
    # EMP Blackout: a deep electromagnetic thoom, crackling arcs, and every system powering down.
    thoom = mixdown(thump(80, 28, 1.0, 0.08, 0.3, 2.4, hp_hz=40), at(0, dsp.fm(dsp.glide(260, 70, 0.8), 0.5, 5 * np.exp(-dsp.tvec(0.8) / 0.2)) * env_exp(0.8, 0.25, 0.003), 0.4))
    ring = dsp.sweep_bp(noise(0.9, rng), dsp.glide(5000, 400, 0.9), 3.0) * env_exp(0.9, 0.3) * 0.8
    arcs = [at(0.05 + k * 0.09 + rng.uniform(0, 0.04), _zap(rng, rng.uniform(300, 700), 0.1), 0.6) for k in range(7)]
    down = osc(dsp.glide(1400, 60, 1.1, 0.5), "saw") * env_exp(1.1, 0.5, 0.01)
    return _cut(mixdown(thoom, at(0, ring), *arcs, at(0.25, lp(down, 2500), 0.3), at(0, click(rng, 0.006, 800, 5000), 0.5)), 1.85, 0.4)


# =================================================================================================
# Cosmic


@sfx("pw_singularity", -20, 1, max_s=2.1)
def pw_singularity(v, rng):
    # Singularity: space tears into a black hole: a reversed rushing inhale, a sub drop and a warbling
    # gravitational hum while it drags.
    d = 2.0
    t = dsp.tvec(d)
    inhale = dsp.sweep_bp(noise(0.7, rng, "pink"), dsp.glide(5000, 300, 0.7, 0.8), 1.8) * np.linspace(0.2, 1, n_of(0.7)) ** 2 * 1.2
    drop = thump(90, 25, 1.2, 0.2, 0.45, 2.2, hp_hz=38)
    f = dsp.glide(55, 42, d) * (1 + 0.05 * osc(3.3, "sine", d))
    hum = (osc(f, "sine") + 0.6 * osc(f * 2.01, "sine") + 0.35 * osc(f * 3.02, "tri")) * (0.6 + 0.4 * osc(7.5, "sine", d)) * np.clip(t / 0.3, 0, 1) * np.exp(-np.clip(t - 1.2, 0, None) / 0.5)
    swirl = dsp.sweep_bp(noise(d, rng, "pink"), 700 + 500 * osc(1.6, "sine", d), 3.0) * 0.35 * np.exp(-np.clip(t - 1.2, 0, None) / 0.5)
    tear = mixdown(crack(rng, 0.08, 400, 3000, 0.02), at(0, thump(140, 45, 0.3, 0.03, 0.1, 2.2, hp_hz=50), 0.8), at(0, osc(dsp.drop(1600, 200, 0.2, 0.05), "saw") * env_exp(0.2, 0.06, 0.0005) * 0.3))
    return _cut(mixdown(at(0, tear, 0.9), inhale, at(0.6, drop, 0.8), at(0.4, sat(hum, 1.4), 0.45), at(0.4, swirl)), d, 0.4)


@sfx("pw_flare", -19, 1, max_s=1.9, noisy=True)
def pw_flare(v, rng):
    # Solar Flare: a roaring column of stellar plasma sweeps the zone for 1.5 s, crackling and shining.
    d = 1.85
    t = dsp.tvec(d)
    env = np.clip(t / 0.12, 0, 1) * np.where(t < 1.45, 1.0, np.exp(-(t - 1.45) / 0.15))
    roar = (dsp.sweep_lp(noise(d, rng, "pink"), dsp.glide(1400, 4200, d), 0.8) * 0.9 + lp(noise(d, rng, "brown"), 300) * 1.3) * env
    ignite = mixdown(thump(110, 40, 0.5, 0.04, 0.15, 2.4, hp_hz=50), at(0, crack(rng, 0.08, 900, 6000, 0.02), 0.9))
    sizzle = crackle(rng, 1.5, 1200, 1.0) * 0.5
    shine = mixdown(chord_hit(GM["choir"], 9, ("C4", "G4", "C5", "E5"), 0.0, 1.3, 90), at(0, chord_hit(GM["space_voice"], 9, ("C4", "G4", "C5"), 0.0, 1.3, 90), 0.6))
    return _cut(mixdown(ignite, at(0, roar), at(0.05, sizzle), at(0.05, shine, 0.3)), d, 0.3)


@sfx("pw_comet", -19, 2, max_s=2.1)
def pw_comet(v, rng):
    # Comet Run: three icy comets streak along the ground 0.4 s apart, whistling, with crystal chimes
    # and bright impacts.
    p = pv(v)
    parts = []
    for c in range(3):
        t0 = c * 0.4
        w = osc(dsp.glide(2600 * p, 1500 * p, 1.0, 1.2), "sine") * dsp.env_adsr(1.0, 0.05, 0.3, 0.6, 0.4) * 0.12
        streak = dsp.sweep_bp(noise(1.0, rng, "pink"), dsp.glide(4500, 1500, 1.0), 2.0) * dsp.env_adsr(1.0, 0.04, 0.3, 0.6, 0.4) * 0.8
        bells = mixdown(fm_bell(hz(("A6", "E6", "C#7")[c]) * p, 0.7, 3.5, 1.4, 0.25, 0.04), at(0.05, fm_bell(hz(("E7", "A6", "E7")[c]) * p, 0.5, 3.5, 1.0, 0.2, 0.04), 0.5))
        hit = mixdown(thump(160 * p, 60, 0.3, 0.03, 0.09, 2.2, hp_hz=60), at(0, crack(rng, 0.06, 1200, 7000, 0.015), 0.8), at(0.01, debris(rng, 0.3, 200, 3000, 10000, 0.12, 0.006), 0.4))
        parts += [at(t0, w), at(t0, streak), at(t0, bells, 0.35), at(t0 + 0.55, hit, 0.7)]
    return _cut(room(mixdown(*parts), rng, 0.6, 0.22), 2.05, 0.4)


@sfx("pw_ion", -18, 1, max_s=1.5, phone_gap=-6.0)
def pw_ion(v, rng):
    # Ion Cannon: an orbital beam spears the target: a searing zap, a crushing blast and a sizzling fade.
    zap = mixdown(_zap(rng, 180, 0.25), at(0, osc(dsp.drop(4000, 300, 0.25, 0.05), "saw") * env_exp(0.25, 0.08, 0.0005) * 0.4))
    beam_d = 0.45
    beam = lp(osc(70 * (1 + 0.02 * osc(12, "sine", beam_d)), "saw") + 0.6 * osc(140, "square", beam_d), 2200) * dsp.env_adsr(beam_d, 0.005, 0.1, 0.8, 0.2) * 0.5
    blast = explosion(rng, 0.8, 1.1)
    sizzle = bp(noise(0.9, rng), 3000, 10000) * env_exp(0.9, 0.3, 0.01) * 0.4
    shine = fm_bell(hz("A5"), 0.9, 1.41, 2.5, 0.3, 0.05) * 0.25
    return _cut(mixdown(zap, at(0, beam), at(0.02, blast, 0.9), at(0.1, sizzle), at(0.02, shine)), 1.45, 0.4)
