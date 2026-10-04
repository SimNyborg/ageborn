"""Every Ageborn sound id (DESIGN A13, A14.2) as a layered design.

`@sfx(id, target, variants)` registers a function `(v, rng) -> mono array`; `target` is the loudness
of the loudest 200 ms window in LUFS, which `render_sfx.py` normalises every variant to. Targets are
grouped by role so the mix stays consistent: UI ticks -31..-34, UI clicks -27, frequent combat hits
-26, shots -23..-28, spawns -26/-23, explosions -21/-19/-17, big match moments and fanfares -16..-19.

Musical sounds (fanfares, rarity reveals, chimes, capsule climbs) are in C, except the evolve
fanfares, which play in the key the music moves to (Medieval D, Gunpowder E, Modern F, Future F#;
A17: Bronze D, Industrial F#, Cosmic A).
"""
from __future__ import annotations

import numpy as np

from kit import repitch as kit_repitch  # noqa: E402
from kit import (
    CLAP, CLAVES, E_SNARE, GM, KIT_ORCH, KIT_POWER, KIT_STD, SIDE_STICK, SNARE, TAMB, TOM_H, TOM_HM, TOM_L,
    TOM_LF, TOM_LM, WOOD_HI, WOOD_LO, at, bell, blip, bp, chime, click, cloth, crack, crackle, debris, dsp,
    env_exp, fade, fm_bell, formant, gm_drum, gm_note, gm_notes, grunt, hp, hz, knock, lp, mixdown, mn, n_of,
    nburst, noise, osc, perc, pluck, room, rumble, sample, sat, thump, tone, whoosh,
)

REGISTRY: dict[str, dict] = {}


def sfx(sid: str, target: float, variants: int = 3, hp_hz: float = 45, noisy: bool = False, max_s: float | None = None, timed: bool = False, phone_gap: float = -4.0):
    """Registers a sound. `timed` keeps the exact length `max_s` from the first sample (the game syncs
    to it); `phone_gap` is how much quieter (LU) it may be on a phone speaker (350 Hz-12 kHz model)
    before the renderer adds harmonics and trims the lows: -4 for everything, -6 for big booms
    (explosions, cannon, base, walkout), which may keep a little more weight below 300 Hz."""

    def deco(fn):
        REGISTRY[sid] = dict(fn=fn, target=target, variants=variants, hp=hp_hz, noisy=noisy, max_s=max_s, timed=timed, phone_gap=phone_gap)
        return fn

    return deco


PV = [1.0, 0.94, 1.06, 0.97, 1.03]  # per-variant pitch factor


def pv(v: int) -> float:
    return PV[v % len(PV)]


# =================================================================================================
# UI: soft, rounded, never shrill


@sfx("ui_click", -27, 3, hp_hz=180)
def ui_click(v, rng):
    # A pitched woodblock tap with a 1-2 kHz wooden body: round and tactile, never a bare beep.
    p = pv(v)
    wood = sample(GM["woodblock"], 79, 100, 0.12, 0.3, pitch=p, length=0.09)
    return mixdown(wood, at(0, knock(1350 * p, 0.05, 0.012, rng), 0.35), at(0, perc(CLAVES, 90, pitch=1.2 * p, length=0.04), 0.2))


@sfx("ui_hover", -34, 3, hp_hz=300)
def ui_hover(v, rng):
    return blip(1900 * pv(v), 0.025, 0.005) * 0.8 + dsp.pad_to(blip(950 * pv(v), 0.02, 0.006), n_of(0.025)) * 0.3


@sfx("ui_deny", -25, 3, hp_hz=120)
def ui_deny(v, rng):
    # "Nuh-uh": two muted, falling wooden knocks with a soft reedy buzz. Clear, never scolding.
    p = pv(v) ** 0.3
    a = mixdown(perc(WOOD_LO, 104, pitch=0.8 * p, length=0.1), at(0, lp(tone(622 * p, 0.09, "square", 0.003, tau=0.05), 2200), 0.35), at(0, knock(700 * p, 0.08, 0.02), 0.3))
    b = mixdown(perc(WOOD_LO, 100, pitch=0.64 * p, length=0.14), at(0, lp(tone(494 * p, 0.14, "square", 0.003, tau=0.07), 1900), 0.35), at(0, knock(560 * p, 0.1, 0.025), 0.3))
    return mixdown(a, at(0.1, b))


@sfx("ui_toggle", -28, 3, hp_hz=200)
def ui_toggle(v, rng):
    # Two claves-like taps, the second a fifth higher: a little "tick-tock" switch.
    p = pv(v)
    a = mixdown(perc(CLAVES, 96, pitch=0.9 * p, length=0.05), at(0, knock(1100 * p, 0.05, 0.012), 0.3))
    b = mixdown(perc(CLAVES, 100, pitch=1.35 * p, length=0.06), at(0, knock(1650 * p, 0.05, 0.012), 0.3))
    return mixdown(a, at(0.045, b, 0.9))


@sfx("ui_tab", -29, 3, hp_hz=200, noisy=True)
def ui_tab(v, rng):
    p = pv(v)
    sw = whoosh(rng, 0.09, 900 * p, 2600 * p, 1.2, 0.6) * 0.5
    return mixdown(sw, at(0.05, blip(700 * p, 0.05, 0.012)), at(0.05, blip(1400 * p, 0.03, 0.008), 0.3))


@sfx("ui_confirm", -25, 2, hp_hz=200)
def ui_confirm(v, rng):
    # C6 then G6, a bright "yes" (musical: fixed pitch): celesta over a soft chime, a woodblock tap.
    cel = gm_notes(GM["celesta"], [(0, 0.2, mn("C6"), 96), (0.07, 0.35, mn("G6"), 100)], tail=0.6)
    return mixdown(cel, at(0, chime(hz("C6"), 0.3, 0.09), 0.5), at(0.07, chime(hz("G6"), 0.4, 0.12), 0.5), at(0, sample(GM["woodblock"], 84, 90, 0.1, 0.2, length=0.06), 0.25))


@sfx("meter_pip", -31, 3, hp_hz=400)
def meter_pip(v, rng):
    return chime(hz("C7") * [1, 1.0595, 0.9439][v], 0.12, 0.025)


# =================================================================================================
# Spawn and movement


@sfx("spawn_pop", -26, 3)
def spawn_pop(v, rng):
    # A woodblock "tok" plus a pizzicato pop and a puff of air: a unit steps out, bright and quick.
    p = pv(v)
    wood = sample(GM["woodblock"], 74, 104, 0.12, 0.3, pitch=p, length=0.1)
    pizz = sample(GM["pizz"], 79, 110, 0.15, 0.4, pitch=p, length=0.18)
    bloop = osc(dsp.glide(380 * p, 900 * p, 0.06, 0.8), "sine") * env_exp(0.06, 0.025, 0.001)
    puff = nburst(rng, 0.12, 700, 3000, 0.03, 0.002, "pink")
    body = thump(170 * p, 95, 0.08, 0.02, 0.03, hp_hz=110)
    return mixdown(wood, at(0, pizz, 0.55), at(0, bloop, 0.35), at(0, puff, 0.35), at(0, body, 0.3))


@sfx("spawn_heavy", -23, 3)
def spawn_heavy(v, rng):
    # A concert tom and a low snare hit the ground together; dust, grit and an armour clank follow.
    p = pv(v)
    tom = perc(TOM_L, 120, KIT_ORCH, pitch=0.85 * p, length=0.45)
    snare = perc(SNARE, 110, KIT_POWER, pitch=0.7 * p, length=0.3)
    body = thump(120 * p, 55, 0.3, 0.04, 0.1, 2.0, hp_hz=90)
    dust = nburst(rng, 0.35, 400, 2500, 0.1, 0.006, "pink")
    grit = debris(rng, 0.35, 90, 900, 4000, 0.1)
    armor = bell(620 * p, 0.25, 0.8, 0.08, ((1, 1), (2.3, 0.6), (3.9, 0.35)))
    return room(mixdown(tom, at(0, snare, 0.45), at(0, body, 0.5), at(0, crack(rng, 0.05, 700, 3000, 0.014), 0.5), at(0.0, dust, 0.35), at(0.01, grit, 0.3), at(0.0, armor, 0.15)), rng, 0.3, 0.2)


@sfx("spawn_legendary", -19, 2, max_s=1.8)
def spawn_legendary(v, rng):
    choir = gm_notes(GM["choir"], [(0.05, 0.9, mn(n), 100) for n in ("C4", "G4", "C5", "E5")], tail=1.0)
    choir = choir * np.clip(np.linspace(0, 4, len(choir)), 0, 1)
    timp = gm_note(GM["timpani"], mn("C2"), 0.6, 120, 1.2)
    glock = gm_notes(GM["glock"], [(0.1 + k * 0.06, 0.3, mn(n), 90) for k, n in enumerate(("C6", "E6", "G6", "C7"))], tail=1.0)
    sub = thump(90, 32, 1.0, 0.12, 0.35, 1.4, hp_hz=50)
    up = whoosh(rng, 0.35, 300, 3000, 1.3, 0.85) * 0.5
    return mixdown(at(0, up), at(0.3, sub), at(0.3, timp, 0.9), at(0.28, choir, 0.8), at(0.32, glock, 0.35), at(0.3, click(rng, 0.006, 800, 5000), 0.4))


@sfx("step_heavy", -30, 3)
def step_heavy(v, rng):
    # A soft floor tom under a gritty scuff.
    p = pv(v)
    tom = perc(TOM_LF, 90, KIT_ORCH, pitch=1.1 * p, length=0.25)
    scuff = nburst(rng, 0.08, 600, 3000, 0.02, 0.002, "pink")
    return mixdown(tom, at(0, thump(95 * p, 55, 0.14, 0.02, 0.045, 1.5, hp_hz=90), 0.4), at(0, scuff, 0.45), at(0, crack(rng, 0.03, 600, 2500, 0.008), 0.3))


@sfx("step_mech", -29, 3)
def step_mech(v, rng):
    p = pv(v)
    clank = bell(560 * p, 0.2, 0.9, 0.05, ((1, 1), (2.71, 0.7), (4.3, 0.4), (6.2, 0.2))) * 0.6
    hiss = nburst(rng, 0.12, 2500, 7000, 0.04, 0.02) * 0.15
    return mixdown(thump(95 * p, 55, 0.14, 0.02, 0.05, 1.8), at(0.004, clank), at(0.03, hiss), at(0, crack(rng, 0.03, 900, 3500, 0.008), 0.45), at(0, perc(TOM_H, 80, KIT_POWER, pitch=1.2 * p, length=0.15), 0.4))


# =================================================================================================
# Attacks


@sfx("swing_whoosh", -27, 3, noisy=True)
def swing_whoosh(v, rng):
    p = pv(v)
    return whoosh(rng, 0.17, 450 * p, 1900 * p, 1.8, 0.55) + whoosh(rng, 0.17, 250 * p, 700 * p, 1.2, 0.5) * 0.4


@sfx("shot_sling", -28, 3, noisy=True)
def shot_sling(v, rng):
    p = pv(v)
    wh = whoosh(rng, 0.12, 700 * p, 2200 * p, 1.6, 0.4)
    snap = mixdown(at(0, nburst(rng, 0.02, 1500, 5000, 0.004), 0.6), at(0, blip(420 * p, 0.03, 0.008), 0.3))
    return mixdown(snap, at(0.01, wh))


@sfx("shot_bow", -27, 3)
def shot_bow(v, rng):
    p = pv(v)
    twang = pluck(140 * p, 0.25, rng, bright=0.5) * 0.9
    snap = click(rng, 0.004, 1200, 4000) * 0.4
    fly = whoosh(rng, 0.14, 1200, 3200, 2.0, 0.3) * 0.25
    return mixdown(snap, at(0, twang), at(0.01, fly), at(0, thump(160 * p, 90, 0.05, 0.01, 0.015), 0.3), at(0, perc(CLAVES, 90, pitch=0.7 * p, length=0.05), 0.25))


@sfx("shot_crossbow", -26, 3)
def shot_crossbow(v, rng):
    p = pv(v)
    clack = nburst(rng, 0.02, 700, 3000, 0.005) * 0.8
    twang = pluck(95 * p, 0.25, rng, bright=0.4)
    thunk = thump(180 * p, 90, 0.08, 0.01, 0.025, 1.8) * 0.6
    fly = whoosh(rng, 0.12, 900, 2600, 2.0, 0.3) * 0.25
    return mixdown(clack, at(0.004, thunk), at(0.006, twang, 0.8), at(0.02, fly))


@sfx("shot_catapult", -24, 3)
def shot_catapult(v, rng):
    p = pv(v)
    creak_src = osc(dsp.glide(70 * p, 50 * p, 0.14), "saw")
    creak = bp(creak_src, 500, 1600) * env_exp(0.14, 0.06, 0.02) * 0.35
    knock = mixdown(at(0, nburst(rng, 0.1, 300, 1200, 0.04), 1.0), at(0, thump(120 * p, 60, 0.18, 0.03, 0.06), 0.6), at(0, perc(TOM_LF, 116, KIT_ORCH, pitch=1.0 * p, length=0.35), 0.8), at(0, perc(WOOD_LO, 110, pitch=0.6 * p, length=0.12), 0.5))
    launch = whoosh(rng, 0.32, 250, 800, 1.2, 0.35) * 0.6
    return room(mixdown(creak, at(0.1, knock), at(0.12, launch), at(0.1, click(rng, 0.005, 400, 2500), 0.4)), rng, 0.3, 0.2)


@sfx("shot_musket", -23, 3, noisy=True)
def shot_musket(v, rng):
    p = pv(v)
    flint = click(rng, 0.004, 2500, 8000) * 0.3
    crack = nburst(rng, 0.05, 900, 7000, 0.012, 0.0005) * 1.3
    boom = thump(140 * p, 65, 0.3, 0.02, 0.09, 2.2, hp_hz=90)
    smoke = nburst(rng, 0.6, 350, 2200, 0.2, 0.01, "pink") * 0.55
    gs = sample(GM["gunshot"], 60, 120, 0.3, 0.8, pitch=0.85 * p, length=0.6)
    return room(mixdown(flint, at(0.012, crack), at(0.012, boom, 0.6), at(0.015, smoke), at(0.012, gs, 0.8)), rng, 0.45, 0.22)


@sfx("shot_lob", -26, 3)
def shot_lob(v, rng):
    p = pv(v)
    tube = nburst(rng, 0.14, 450, 1400, 0.05, 0.002) * 0.9
    thoonk = thump(260 * p, 150, 0.16, 0.03, 0.05, 1.5, hp_hz=120)
    tom = perc(TOM_HM, 110, KIT_ORCH, pitch=1.3 * p, length=0.2)
    up = whoosh(rng, 0.2, 600, 1600, 1.5, 0.5) * 0.3
    return mixdown(thoonk, at(0, tom, 0.6), at(0, tube), at(0.05, up), at(0, knock(700 * p, 0.08, 0.02), 0.4))


@sfx("shot_cannon", -21, 3, noisy=True, phone_gap=-6.0)
def shot_cannon(v, rng):
    p = pv(v)
    boom = thump(95 * p, 40, 0.7, 0.05, 0.2, 2.5, hp_hz=55)
    snap = crack(rng, 0.08, 500, 3500, 0.025)
    blast = sample(GM["gunshot"], 55, 127, 0.3, 1.0, pitch=0.55 * p, length=1.0)
    rum = rumble(rng, 1.2, 380, 0.45) * 0.7
    timp = gm_note(GM["timpani"], mn("G1"), 0.4, 127, 1.0)
    return room(mixdown(snap, at(0, boom, 0.8), at(0, blast, 0.9), at(0.01, rum), at(0, timp, 0.5)), rng, 0.6, 0.2)


@sfx("shot_grapeshot", -22, 3, noisy=True)
def shot_grapeshot(v, rng):
    p = pv(v)
    boom = thump(115 * p, 50, 0.45, 0.04, 0.13, 2.2, hp_hz=70)
    snap = crack(rng, 0.06, 600, 4500, 0.02)
    blast = sample(GM["gunshot"], 60, 124, 0.3, 0.8, pitch=0.7 * p, length=0.7)
    pellets = debris(rng, 0.45, 160, 1200, 4500, 0.15, 0.008) * 0.6
    rum = rumble(rng, 0.7, 400, 0.25) * 0.5
    return room(mixdown(snap, at(0, boom, 0.8), at(0, blast, 0.8), at(0.03, pellets), at(0.01, rum)), rng, 0.45, 0.2)


@sfx("shot_rifle", -25, 3, noisy=True)
def shot_rifle(v, rng):
    p = pv(v)
    snap = nburst(rng, 0.04, 800, 7000, 0.01, 0.0003) * 1.2
    gs = sample(GM["gunshot"], 64, 120, 0.3, 0.6, pitch=1.15 * p, length=0.45)
    body = thump(200 * p, 95, 0.12, 0.012, 0.03, 2.0, hp_hz=110) * 0.5
    tail = nburst(rng, 0.35, 400, 3000, 0.1, 0.005, "pink") * 0.4
    return room(mixdown(snap, at(0, gs, 0.9), at(0, body), at(0.004, tail), at(0.06, snap * 0.15)), rng, 0.5, 0.22)


@sfx("shot_mg", -27, 3, noisy=True)
def shot_mg(v, rng):
    p = pv(v)
    snap = nburst(rng, 0.03, 900, 6500, 0.007, 0.0003)
    gs = sample(GM["gunshot"], 67, 110, 0.2, 0.4, pitch=1.4 * p, length=0.16)
    body = thump(180 * p, 100, 0.08, 0.01, 0.022, 2.0, hp_hz=120) * 0.45
    tail = nburst(rng, 0.14, 400, 2600, 0.04, 0.003, "pink") * 0.3
    mech = click(rng, 0.004, 2000, 6000, 0.001) * 0.25
    return mixdown(snap, at(0, gs, 0.9), at(0, body), at(0.003, tail), at(0.035, mech))


@sfx("shot_flak", -24, 3)
def shot_flak(v, rng):
    p = pv(v)
    pop1 = mixdown(thump(170 * p, 80, 0.18, 0.02, 0.05, 2.2, hp_hz=100), at(0, crack(rng, 0.05, 600, 3200, 0.015), 0.9), at(0, perc(SNARE, 116, KIT_POWER, pitch=0.8 * p, length=0.2), 0.6))
    pop2 = mixdown(thump(150 * p, 75, 0.2, 0.02, 0.06, 2.2, hp_hz=100), at(0, crack(rng, 0.05, 550, 3000, 0.015), 0.8), at(0, perc(SNARE, 110, KIT_POWER, pitch=0.72 * p, length=0.2), 0.5))
    air = nburst(rng, 0.4, 400, 2000, 0.12, 0.01, "pink") * 0.4
    return room(mixdown(pop1, at(0.09, pop2), at(0.02, air)), rng, 0.4, 0.2)


@sfx("shot_rocket", -23, 3, noisy=True)
def shot_rocket(v, rng):
    p = pv(v)
    pop = mixdown(thump(140 * p, 60, 0.12, 0.015, 0.04, 2.0), at(0, click(rng, 0.006, 800, 4000), 0.4))
    hiss = whoosh(rng, 0.55, 600 * p, 2200 * p, 0.9, 0.2, "white") * 0.7
    roar = lp(noise(0.55, rng, "brown"), 500) * env_exp(0.55, 0.2, 0.02) * 1.5
    return mixdown(pop, at(0.01, hiss), at(0.01, roar))


@sfx("shot_rail", -22, 3)
def shot_rail(v, rng):
    p = pv(v)
    charge = osc(dsp.glide(220 * p, 1400 * p, 0.09), "sine") * np.linspace(0.1, 1, n_of(0.09)) * 0.35
    snap_f = dsp.drop(2600 * p, 180, 0.2, 0.02)
    snap = osc(snap_f, "tri") * env_exp(0.2, 0.05, 0.0005)
    ring = fm_bell(820 * p, 0.45, 1.41, 3.0, 0.18, 0.05) * 0.35
    sub = thump(100, 40, 0.25, 0.03, 0.08, 1.8)
    return mixdown(charge, at(0.09, snap), at(0.09, ring), at(0.09, sub), at(0.09, click(rng, 0.005, 1000, 6000), 0.5))


@sfx("shot_laser", -25, 3)
def shot_laser(v, rng):
    p = pv(v)
    f = dsp.drop(1700 * p, 320 * p, 0.16, 0.04)
    pew = (osc(f, "sine") * 0.8 + osc(f, "tri") * 0.3 + osc(f * 1.5, "sine") * 0.2) * env_exp(0.16, 0.06, 0.002)
    return mixdown(sat(pew, 1.3), at(0, click(rng, 0.003, 1500, 5000), 0.25))


@sfx("shot_arc", -24, 3, noisy=True)
def shot_arc(v, rng):
    p = pv(v)
    buzz = bp(osc(95 * p * (1 + 0.1 * osc(37, "sine", 0.28)), "saw"), 300, 2500) * env_exp(0.28, 0.12, 0.004) * 0.8
    zap = crackle(rng, 0.28, 900, 0.1) * 0.7
    return mixdown(buzz, at(0, zap), at(0, click(rng, 0.005, 1200, 6000), 0.4))


@sfx("shot_plasma", -25, 3)
def shot_plasma(v, rng):
    p = pv(v)
    f = dsp.drop(520 * p, 150 * p, 0.28, 0.07)
    idx = 3 * np.exp(-dsp.tvec(0.28) / 0.06)
    blob = dsp.fm(f, 0.5, idx) * env_exp(0.28, 0.1, 0.005)
    return mixdown(lp(blob, 3500), at(0, thump(160 * p, 70, 0.14, 0.02, 0.05), 0.5), at(0, click(rng, 0.004, 800, 3500), 0.25))


@sfx("bee_buzz", -28, 3)
def bee_buzz(v, rng):
    p = pv(v)
    d = 0.4
    out = np.zeros(n_of(d))
    for k in range(4):
        f0 = (180 + 25 * k) * p * (1 + 0.02 * rng.standard_normal())
        vib = 1 + 0.04 * osc(18 + 5 * k, "sine", d)
        out += osc(f0 * vib, "saw") * (0.8 - 0.1 * k)
    env = np.sin(np.linspace(0, np.pi, len(out))) ** 0.7
    return bp(out, 350, 2800) * env * 0.5


@sfx("log_roll", -25, 3)
def log_roll(v, rng):
    p = pv(v)
    d = 0.7
    rum = bp(noise(d, rng, "brown"), 70, 450) * (0.6 + 0.4 * np.abs(osc(11 * p, "sine", d))) * 2.5
    knocks = np.zeros(n_of(d))
    t = 0.02
    while t < d - 0.08:
        k = mixdown(nburst(rng, 0.05, 200, 900, 0.015), at(0, thump(150 * p * (0.9 + 0.2 * rng.random()), 90, 0.06, 0.01, 0.02), 0.5))
        i = n_of(t)
        knocks[i : i + len(k)] += k[: len(knocks) - i] * (0.5 + 0.5 * rng.random())
        t += 0.07 + 0.05 * rng.random()
    env = np.clip(np.linspace(0, 6, n_of(d)), 0, 1) * np.clip(np.linspace(4, 0, n_of(d)), 0, 1)
    return (rum + knocks) * env


@sfx("cauldron_pour", -23, 3)
def cauldron_pour(v, rng):
    p = pv(v)
    d = 0.8
    pour = lp(noise(d, rng, "pink"), 1400) * np.sin(np.linspace(0, np.pi, n_of(d))) ** 0.6 * 0.8
    bubbles = np.zeros(n_of(d))
    for _ in range(14):
        t0 = rng.uniform(0.05, d - 0.1)
        f0 = rng.uniform(250, 700) * p
        b = osc(dsp.glide(f0, f0 * 2.2, 0.05), "sine") * env_exp(0.05, 0.015, 0.002)
        i = n_of(t0)
        bubbles[i : i + len(b)] += b * rng.uniform(0.3, 0.7)
    sizzle = nburst(rng, d, 3000, 7000, 0.4, 0.1) * 0.08
    return mixdown(pour, at(0, bubbles), at(0, sizzle), at(0, thump(120, 60, 0.2, 0.03, 0.06), 0.4))


@sfx("toad_tongue", -26, 3)
def toad_tongue(v, rng):
    p = pv(v)
    out_f = dsp.glide(220 * p, 950 * p, 0.06, 0.8)
    back_f = dsp.glide(950 * p, 240 * p, 0.12, 1.5)
    thwip = osc(out_f, "sine") * env_exp(0.06, 0.05, 0.003)
    slurp = osc(back_f, "sine") * env_exp(0.12, 0.08, 0.005) * 0.8
    wet = nburst(rng, 0.15, 500, 2500, 0.05, 0.005) * 0.3
    return mixdown(thwip, at(0.07, slurp), at(0.07, wet), at(0.06, click(rng, 0.004, 800, 3000), 0.4))


@sfx("goose_honk", -23, 3)
def goose_honk(v, rng):
    p = pv(v)
    d = 0.22
    f = dsp.glide(390 * p, 330 * p, d, 1.5) * (1 + 0.015 * osc(28, "sine", d))
    src = osc(f, "saw") + 0.3 * noise(d, rng)
    honk = formant(src, [(900, 400, 1.0), (1500, 500, 0.5), (2600, 600, 0.2)]) * dsp.env_adsr(d, 0.01, 0.05, 0.8, 0.06)
    return sat(honk * 1.5, 1.3)


@sfx("bomb_whistle", -23, 2)
def bomb_whistle(v, rng):
    p = pv(v)
    d = 0.7
    f = dsp.glide(1700 * p, 620 * p, d, 1.0) * (1 + 0.01 * osc(6, "sine", d))
    w = osc(f, "sine") * np.clip(np.linspace(0, 5, n_of(d)), 0, 1) * fade(np.ones(n_of(d)), 0, 0.08)
    air = bp(noise(d, rng, "pink"), 800, 2400) * 0.12
    return lp(w + air, 4000)


@sfx("radio_call", -23, 2)
def radio_call(v, rng):
    d = 0.55
    squelch = nburst(rng, 0.05, 1200, 3500, 0.02, 0.001) * 0.5
    beep = mixdown(tone(1000, 0.06, "sine", 0.003), at(0.09, tone(1250, 0.06, "sine", 0.003)))
    t = dsp.tvec(0.3)
    pitch = 150 * (1 + 0.25 * np.sin(2 * np.pi * 3.3 * t + v) + 0.1 * np.sin(2 * np.pi * 7.1 * t))
    voice = formant(osc(pitch, "saw"), [(700, 300, 1.0), (1200, 300, 0.7), (2400, 400, 0.3)])
    syll = (np.abs(np.sin(2 * np.pi * 6.5 * t)) ** 0.5) * np.clip(np.linspace(0, 8, len(t)), 0, 1)
    voice = bp(voice * syll, 300, 3000) * 0.8 + bp(noise(0.3, rng), 400, 3000) * 0.08
    tail = nburst(rng, 0.06, 1000, 3200, 0.03, 0.001) * 0.4
    return mixdown(squelch, at(0.05, beep, 0.4), at(0.22, voice), at(0.5, tail))[: n_of(d + 0.1)]


@sfx("emp_pulse", -21, 2)
def emp_pulse(v, rng):
    d = 0.7
    sub = thump(90, 30, d, 0.08, 0.25, 1.6, hp_hz=50)
    wob = dsp.fm(dsp.glide(300, 90, d), 0.5, 4 * np.exp(-dsp.tvec(d) / 0.2)) * env_exp(d, 0.2, 0.005) * 0.4
    ring = dsp.sweep_bp(noise(d, rng), dsp.glide(3000, 300, d), 3.0) * env_exp(d, 0.2) * 0.8
    return mixdown(sub, at(0, wob), at(0, ring), at(0.05, crackle(rng, 0.5, 250, 0.2), 0.5), at(0, click(rng, 0.006, 800, 5000), 0.4))


@sfx("time_stop", -22, 2, max_s=1.6)
def time_stop(v, rng):
    swell = dsp.sweep_bp(noise(0.45, rng, "pink"), dsp.glide(300, 3500, 0.45), 1.5) * np.linspace(0, 1, n_of(0.45)) ** 2 * 1.5
    tape = osc(dsp.glide(220, 30, 0.6, 0.6), "tri") * env_exp(0.6, 0.3, 0.01) * 0.5
    ting = sum(fm_bell(hz(n), 1.0, 3.01, 1.5, 0.45, 0.1) * g for n, g in (("C6", 0.5), ("G6", 0.35), ("D7", 0.2)))
    return mixdown(swell, at(0.42, ting), at(0.42, lp(tape, 2000)), at(0.42, click(rng, 0.006, 1500, 6000), 0.3))


@sfx("gravity_hum", -24, 2)
def gravity_hum(v, rng):
    d = 0.8
    f = dsp.glide(60, 85, d)
    am = 0.6 + 0.4 * osc(7, "sine", d)
    hum = (osc(f, "sine") + 0.5 * osc(f * 2, "sine") + 0.25 * osc(f * 3, "tri")) * am
    env = np.sin(np.linspace(0, np.pi, n_of(d))) ** 0.5
    swirl = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(400, 1200, d), 2.0) * 0.4
    return sat((hum + swirl) * env, 1.3)


# =================================================================================================
# Hits and deaths


@sfx("hit_blunt", -26, 3)
def hit_blunt(v, rng):
    # A club landing: a concert tom and a rimshot crack together, a short high-passed punch under them.
    p = pv(v)
    tom = perc([TOM_HM, TOM_H, TOM_HM][v % 3], 118, KIT_ORCH, pitch=1.2 * p, length=0.2)
    rim = perc(SIDE_STICK, 110, KIT_STD, pitch=0.85 * p, length=0.08)
    punch = thump(190 * p, 100, 0.1, 0.012, 0.03, 2.2, hp_hz=120)
    return mixdown(tom, at(0, rim, 0.6), at(0, crack(rng, 0.045, 800, 3200, 0.011), 0.8), at(0, knock(950 * p, 0.07, 0.016), 0.4), at(0, punch, 0.3))


@sfx("hit_slash", -26, 3, noisy=True)
def hit_slash(v, rng):
    # A blade cut: a stick strike, the swept slice and a short metal ring (FM partials).
    p = pv(v)
    slice_ = dsp.sweep_bp(noise(0.09, rng), dsp.glide(3000 * p, 1100 * p, 0.09), 2.0) * env_exp(0.09, 0.03, 0.002) * 2.5
    shing = fm_bell(2100 * p, 0.14, 1.5, 1.2, 0.04, 0.02)
    stick = perc(CLAVES, 110, pitch=0.8 * p, length=0.06)
    thud = thump(160 * p, 95, 0.07, 0.01, 0.025, 1.8, hp_hz=120)
    return mixdown(slice_, at(0, stick, 0.55), at(0, shing, 0.3), at(0.004, thud, 0.35))


@sfx("hit_pierce", -27, 3)
def hit_pierce(v, rng):
    # An arrow striking home: a woodblock "thwk" with a short high hiss of feathers.
    p = pv(v)
    wood = sample(GM["woodblock"], 70, 116, 0.12, 0.3, pitch=p, length=0.1)
    hiss = nburst(rng, 0.03, 3000, 8000, 0.007, 0.0003)
    thud = thump(170 * p, 100, 0.06, 0.01, 0.02, hp_hz=120)
    return mixdown(wood, at(0, knock(820 * p, 0.06, 0.013, rng), 0.45), at(0, hiss, 0.4), at(0, thud, 0.22))


@sfx("hit_bullet", -27, 3, noisy=True)
def hit_bullet(v, rng):
    p = pv(v)
    smack = crack(rng, 0.04, 900, 4200, 0.008)
    stick = perc(SIDE_STICK, 100, pitch=0.8 * p, length=0.05)
    dirt = debris(rng, 0.12, 200, 900, 4000, 0.05, 0.006) * 0.4
    body = thump(170 * p, 95, 0.06, 0.01, 0.02, hp_hz=120) * 0.45
    out = mixdown(smack, at(0, stick, 0.3), at(0, knock(1100 * p, 0.05, 0.012), 0.3), at(0, body), at(0.005, dirt))
    if v == 2:
        ric = osc(dsp.glide(1500, 950, 0.16, 0.8), "sine") * env_exp(0.16, 0.05, 0.005) * 0.09
        out = mixdown(out, at(0.02, ric))
    return out


@sfx("hit_laser", -26, 3, noisy=True)
def hit_laser(v, rng):
    p = pv(v)
    sizzle = bp(noise(0.12, rng), 1500, 6000) * (0.5 + 0.5 * np.abs(osc(90, "square", 0.12))) * env_exp(0.12, 0.04, 0.001)
    zap = osc(dsp.drop(950 * p, 380 * p, 0.08, 0.02), "sine") * env_exp(0.08, 0.03, 0.001) * 0.8
    return mixdown(zap, at(0, sizzle, 0.6))


@sfx("hit_heavy", -23, 3)
def hit_heavy(v, rng):
    # A crushing blow: a low power snare and a floor tom over a heavy punch, with crunch.
    p = pv(v)
    body = thump(130 * p, 55, 0.3, 0.03, 0.09, 2.6, hp_hz=80)
    snare = perc(SNARE, 124, KIT_POWER, pitch=0.62 * p, length=0.3)
    tom = perc(TOM_LF, 120, KIT_ORCH, pitch=0.9 * p, length=0.35)
    crunch = debris(rng, 0.2, 180, 700, 3500, 0.06, 0.01)
    return room(mixdown(body, at(0, snare, 0.6), at(0, tom, 0.5), at(0, crack(rng, 0.06, 600, 2800, 0.016), 0.6), at(0.004, crunch, 0.35)), rng, 0.3, 0.15)


@sfx("hit_effective", -25, 3)
def hit_effective(v, rng):
    p = pv(v)
    ping = mixdown(at(0, fm_bell(1568 * p, 0.3, 2.0, 1.5, 0.09, 0.03), 0.5), at(0, blip(3136 * p, 0.15, 0.03), 0.15))
    punch = thump(190 * p, 95, 0.1, 0.01, 0.03, 2.2, hp_hz=120)
    rim = perc(SIDE_STICK, 116, pitch=p, length=0.08)
    return mixdown(punch, at(0, rim, 0.5), at(0, crack(rng, 0.04, 900, 4000, 0.009), 0.6), at(0.004, ping))


def explosion(rng, size: float, p: float = 1.0):
    # The GM gunshot pitched down gives the recorded "blast" crack; a high-passed boom, a mid burst,
    # debris and a rumble tail do the rest.
    d = 0.35 + 0.9 * size
    boom = thump(110 * p, 36 + 10 * (1 - size), d, 0.04 + 0.05 * size, 0.08 + 0.2 * size, 2.4, hp_hz=55)
    blast = sample(GM["gunshot"], 60, 127, 0.3, 1.0, pitch=(0.62 - 0.2 * size) * p, length=d + 0.3)
    burst = nburst(rng, d, 350, 3500 - 1000 * size, 0.05 + 0.1 * size, 0.001, "pink") * (1.1 + 0.4 * size)
    crackl = debris(rng, d, 80 + 120 * size, 700, 5000, 0.1 + 0.25 * size, 0.01) * 0.5
    rum = rumble(rng, d + 0.4 * size, 300 - 100 * size, 0.15 + 0.4 * size, 0.01) * (0.4 + 0.6 * size)
    snap = crack(rng, 0.07, 600, 3000, 0.02 + 0.02 * size)
    return room(mixdown(burst, at(0, boom, 0.8), at(0, blast, 0.9), at(0, snap, 0.7), at(0.01, crackl), at(0.0, rum)), rng, 0.4 + 0.6 * size, 0.18)


@sfx("explosion_s", -21, 3, noisy=True, phone_gap=-6.0)
def explosion_s(v, rng):
    return explosion(rng, 0.0, pv(v))


@sfx("explosion_m", -19, 3, noisy=True, phone_gap=-6.0)
def explosion_m(v, rng):
    return explosion(rng, 0.45, pv(v))


@sfx("explosion_l", -17, 3, noisy=True, max_s=2.2, phone_gap=-6.0)
def explosion_l(v, rng):
    first = explosion(rng, 1.0, pv(v))
    second = explosion(rng, 0.3, pv(v) * 0.9) * 0.5
    return mixdown(first, at(0.12, second))


@sfx("die_bio", -25, 3)
def die_bio(v, rng):
    # A cartoon "hup!" grunt that starts at full level, then a tom thud and a cloth fall.
    p = pv(v)
    voice = hp(grunt(rng, [200, 175, 225][v % 3] * p, 0.15, ["u", "o", "a"][v % 3], 1.3), 250, 2)
    tom = perc(TOM_HM, 104, KIT_ORCH, pitch=1.3 * p, length=0.22)
    thud = thump(170 * p, 95, 0.12, 0.02, 0.04, 1.8, hp_hz=130)
    return mixdown(crack(rng, 0.025, 1000, 3800, 0.006), at(0, voice), at(0.09, tom, 0.45), at(0.09, thud, 0.15), at(0.08, cloth(rng, 0.16), 0.7))


@sfx("die_mech", -24, 3)
def die_mech(v, rng):
    p = pv(v)
    clank = mixdown(bell(520 * p, 0.35, 0.9, 0.08, ((1, 1), (2.43, 0.8), (3.9, 0.5), (5.8, 0.3))) * 0.6, at(0, perc(E_SNARE, 110, KIT_POWER, pitch=1.1 * p, length=0.2), 0.5))
    pop = hp(explosion(rng, 0.0, p * 1.1), 260, 2) * 0.7
    sparks = crackle(rng, 0.35, 400, 0.12) * 0.45
    down = osc(dsp.glide(420 * p, 70 * p, 0.35, 0.7), "tri") * env_exp(0.35, 0.18, 0.005) * 0.3
    return mixdown(clank, at(0.02, pop), at(0.03, sparks), at(0.05, lp(down, 2500)))


@sfx("prop_drop", -30, 3)
def prop_drop(v, rng):
    p = pv(v)
    out = []
    t, g = 0.0, 1.0
    for k in range(3):
        knock = mixdown(nburst(rng, 0.05, 500 * p, 2500 * p, 0.012), at(0, bell(700 * p * (1 + 0.1 * k), 0.08, 0.6, 0.03), 0.4))
        out.append(at(t, knock, g))
        t += 0.09 * (0.7**k)
        g *= 0.55
    return mixdown(*out)


@sfx("heal_tick", -30, 3, hp_hz=300)
def heal_tick(v, rng):
    base = [hz("C6"), hz("D6"), hz("E6")][v]
    return mixdown(chime(base, 0.3, 0.08), at(0.05, chime(base * 1.5, 0.3, 0.08), 0.6))


@sfx("shield_up", -28, 3)
def shield_up(v, rng):
    p = pv(v)
    d = 0.4
    f = dsp.glide(400 * p, 1100 * p, d, 1.2)
    shimmer = (osc(f, "sine") + 0.5 * osc(f * 1.5, "sine") + 0.3 * osc(f * 2.01, "sine")) * env_exp(d, 0.18, 0.04)
    return mixdown(shimmer * 0.7, at(0.25, chime(1047 * p, 0.35, 0.1), 0.3), at(0, whoosh(rng, 0.25, 500, 2000, 1.5, 0.7), 0.25))


# =================================================================================================
# Turrets and bases


def hammer(rng, p: float = 1.0) -> np.ndarray:
    # A mallet on wood and metal: a recorded rimshot and woodblock under a small metallic ring.
    return mixdown(perc(SIDE_STICK, 104, pitch=0.9 * p, length=0.08), at(0, perc(WOOD_LO, 100, pitch=0.85 * p, length=0.1), 0.6), at(0, bell(900 * p, 0.12, 0.7, 0.03, ((1, 1), (2.6, 0.6), (4.1, 0.3))), 0.3), at(0, thump(160 * p, 90, 0.07, 0.01, 0.02), 0.4))


@sfx("turret_build", -25, 3)
def turret_build(v, rng):
    p = pv(v)
    parts = [at(k * 0.1, hammer(rng, p * (1 + 0.04 * k)), 0.8) for k in range(3)]
    ratchet = debris(rng, 0.12, 180, 1500, 4000, 1.0, 0.004) * 0.3
    clunk = thump(130 * p, 60, 0.2, 0.02, 0.06, 2.0)
    ding = chime(hz("G6"), 0.35, 0.08) * 0.25
    return mixdown(*parts, at(0.3, ratchet), at(0.42, clunk), at(0.42, nburst(rng, 0.06, 300, 1800, 0.02), 0.6), at(0.45, ding))


@sfx("turret_sell", -25, 3)
def turret_sell(v, rng):
    p = pv(v)
    down = [at(k * 0.07, hammer(rng, p * (1.1 - 0.08 * k)), 0.6) for k in range(3)]
    coins = [at(0.18 + k * 0.05, coin(hz("E6") * (1 + 0.05 * k)), 0.5 - 0.08 * k) for k in range(4)]
    return mixdown(*down, *coins)


def coin(freq: float) -> np.ndarray:
    return mixdown(at(0, fm_bell(freq, 0.25, 3.01, 1.2, 0.07, 0.02), 0.6), at(0, blip(freq * 1.5, 0.2, 0.05), 0.3), at(0, blip(freq, 0.2, 0.06), 0.4))


@sfx("turret_upgrade", -24, 2)
def turret_upgrade(v, rng):
    ratchet = debris(rng, 0.2, 150, 1500, 4000, 1.0, 0.004) * 0.35
    notes = [at(0.08 + k * 0.08, chime(hz(n), 0.45, 0.13), 0.55) for k, n in enumerate(("C6", "E6", "G6"))]
    clunk = thump(150, 70, 0.15, 0.02, 0.05, 2.0)
    return mixdown(ratchet, at(0.02, clunk, 0.7), *notes)


@sfx("slot_buy", -24, 2)
def slot_buy(v, rng):
    ka = mixdown(nburst(rng, 0.05, 600, 3000, 0.01, 0.0005), at(0, thump(200, 110, 0.06, 0.01, 0.02), 0.6))
    chunk = mixdown(thump(110, 50, 0.22, 0.02, 0.07, 2.2), at(0, nburst(rng, 0.08, 200, 1500, 0.025), 0.8), at(0, bell(330, 0.2, 0.6, 0.06), 0.25))
    return mixdown(ka, at(0.09, chunk), at(0.2, coin(hz("G6")), 0.35))


@sfx("base_hit", -24, 3, phone_gap=-6.0)
def base_hit(v, rng):
    p = pv(v)
    body = thump(95 * p, 38, 0.35, 0.04, 0.1, 2.4, hp_hz=50)
    stone = mixdown(nburst(rng, 0.1, 400, 3000, 0.03, 0.0005) * 1.1, at(0, crack(rng, 0.06, 500, 2500, 0.02), 0.8), at(0, perc(TOM_L, 124, KIT_ORCH, pitch=0.7 * p, length=0.4), 0.8))
    crumbs = debris(rng, 0.4, 90, 700, 3500, 0.12, 0.012) * 0.5
    dust = nburst(rng, 0.45, 150, 1200, 0.15, 0.03, "pink") * 0.4
    return room(mixdown(body, at(0, stone), at(0.02, crumbs), at(0.02, dust)), rng, 0.35, 0.18)


@sfx("base_crumble", -21, 2, max_s=1.6, phone_gap=-6.0)
def base_crumble(v, rng):
    parts = []
    for k in range(4):
        parts.append(at(k * 0.18 + rng.uniform(0, 0.05), base_hit(k % 3, rng), 1.0 - 0.15 * k))
    rum = rumble(rng, 1.3, 260, 0.4, 0.05)
    rain = debris(rng, 1.2, 70, 600, 3500, 0.5, 0.015) * 0.6
    return mixdown(*parts, at(0, rum), at(0.1, rain))


@sfx("base_destroyed", -17, 1, max_s=3.2, phone_gap=-6.0)
def base_destroyed(v, rng):
    big = explosion(rng, 1.0, 0.85)
    coll = base_crumble(0, rng)
    rum = rumble(rng, 2.8, 200, 0.9, 0.05) * 1.2
    rain = debris(rng, 2.5, 90, 500, 3500, 0.9, 0.015) * 0.6
    return mixdown(big, at(0.15, coll, 0.9), at(0.05, rum), at(0.3, rain))


# =================================================================================================
# Economy


@sfx("coin_gain", -26, 3, hp_hz=300)
def coin_gain(v, rng):
    f = hz("E6") * [1, 1.0, 1.0][v]
    detune = [1.0, 1.003, 0.997][v]
    # Two coins a fourth apart (E6, A6) with a glockenspiel sparkle on the second.
    glock = gm_note(GM["glock"], mn("A6"), 0.2, 84, 0.5)
    return mixdown(coin(f * detune), at(0.045, coin(f * 1.335 * detune), 0.8), at(0.045, glock, 0.35))


@sfx("xp_tick", -33, 3, hp_hz=500)
def xp_tick(v, rng):
    f = [hz("C7"), hz("D7"), hz("E7")][v]
    return mixdown(blip(f, 0.05, 0.012), at(0.02, blip(f * 1.5, 0.05, 0.012), 0.5))


@sfx("treasury_up", -23, 2)
def treasury_up(v, rng):
    notes = ["C6", "E6", "G6", "C7", "E7"]
    parts = [at(k * 0.05, coin(hz(n)), 0.7) for k, n in enumerate(notes)]
    parts += [at(0.03 + k * 0.045, coin(hz("E6") * rng.uniform(0.98, 1.4)), 0.25) for k in range(6)]
    return mixdown(*parts, at(0.25, chime(hz("C6"), 0.5, 0.2), 0.4))


# =================================================================================================
# Evolve


@sfx("evolve_ready", -24, 1)
def evolve_ready(v, rng):
    # A13: a single soft chime.
    return mixdown(chime(hz("G5"), 1.2, 0.4), at(0, chime(hz("D6"), 1.1, 0.35), 0.45), at(0, gm_note(GM["celesta"], mn("G6"), 0.5, 80, 1.0), 0.3))


@sfx("evolve_riser", -21, 1, max_s=2.5, timed=True)
def evolve_riser(v, rng):
    # Unpitched on purpose: it plays over the music in any age's key (C, D, E, F, F#), so it must not
    # carry a chord. Two reverse cymbals (one slowed down), a snare roll, a rising noise sweep and a
    # rumble all peak right at 2.5 s, where the evolve fanfare hits.
    d = 2.5
    n = n_of(d)
    rc = dsp.pad_to(gm_note(GM["reverse_cymbal"], 60, 2.5, 120, 0.5), n)
    peak = int(np.argmax(np.abs(rc)))
    swell = rc[: peak + 1]
    slow = kit_repitch(swell, 0.56)
    out = np.zeros(n)
    end = n_of(d - 0.04)
    out[max(0, end - len(slow)) : end] += slow[-min(end, len(slow)) :] * 0.9
    out[max(0, end - len(swell)) : end] += swell[-min(end, len(swell)) :] * 1.0
    rise = np.linspace(0, 1, n) ** 2.2
    noise_up = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(300, 6000, d, 0.8), 1.4) * rise * 0.9
    rum = lp(noise(d, rng, "brown"), 180) * np.linspace(0, 1, n) ** 1.6 * 1.2
    snare = gm_notes(0, [(1.2 + k * 0.05, 0.05, 38, int(36 + 80 * k / 25)) for k in range(26)], drums=True, tail=0.3)[:n]
    out = mixdown(at(0, out * 1.6), at(0, noise_up), at(0, hp(rum, 40)), at(0, snare, 0.55))[:n]
    return fade(out, 0.2, 0.03)


FANFARE_MOTIF = [(0.0, 0.17, "C5"), (0.17, 0.09, "G4"), (0.26, 0.09, "C5"), (0.35, 0.85, "E5")]


def motif(program: int, shift: int, vel: int = 105, octave: int = 0) -> np.ndarray:
    return gm_notes(program, [(s, d, mn(n) + shift + 12 * octave, vel) for s, d, n in FANFARE_MOTIF], tail=1.0)


def chord_hit(program: int, shift: int, names: tuple, at_s: float = 0.35, dur: float = 0.85, vel: int = 100) -> np.ndarray:
    return gm_notes(program, [(at_s, dur, mn(n) + shift, vel) for n in names], tail=1.0)


@sfx("evolve_fanfare_stone", -16, 1, max_s=2.0)
def evolve_fanfare_stone(v, rng):
    k = 0
    flute = motif(GM["panflute"], k, 110)
    horn = motif(GM["horn"], k, 96, -1)
    strings = chord_hit(GM["strings"], k, ("C3", "G3", "C4", "E4"))
    choir = chord_hit(GM["oohs"], k, ("C4", "G4", "C5"))
    taiko = gm_notes(GM["taiko"], [(0.0, 0.2, 53, 120), (0.26, 0.1, 57, 90), (0.35, 0.4, 50, 127)], tail=1.0)
    return mixdown(flute, at(0, horn, 0.6), at(0, strings, 0.6), at(0, choir, 0.45), at(0, hp(taiko, 60), 1.0))


@sfx("evolve_fanfare_medieval", -16, 1, max_s=2.0)
def evolve_fanfare_medieval(v, rng):
    k = 2
    tpt = motif(GM["trumpet"], k, 104)
    horn = motif(GM["horn"], k, 100, -1)
    bones = chord_hit(GM["trombone"], k, ("C3", "G3", "C4", "E4"))
    timp = gm_notes(GM["timpani"], [(0.0, 0.2, mn("D2"), 115), (0.35, 0.6, mn("D2"), 127)], tail=1.0)
    snare = gm_notes(0, [(0.02 * i, 0.03, 38, 50 + 3 * i) for i in range(17)] + [(0.35, 0.5, 49, 100)], drums=True, tail=1.2)
    return mixdown(tpt, at(0, horn, 0.7), at(0, bones, 0.6), at(0, timp, 0.8), at(0, snare, 0.45))


@sfx("evolve_fanfare_gunpowder", -16, 1, max_s=2.0)
def evolve_fanfare_gunpowder(v, rng):
    k = 4
    fife = motif(GM["piccolo"], k, 96)
    tpt = motif(GM["trumpet"], k, 100, -1)
    band = chord_hit(GM["brass"], k, ("C3", "G3", "C4", "E4"))
    tuba = chord_hit(GM["tuba"], k, ("C2",))
    drums = gm_notes(0, [(0.02 * i, 0.03, 38, 55 + 3 * i) for i in range(17)] + [(0.35, 0.5, 49, 110), (0.35, 0.3, 36, 120)], drums=True, tail=1.2)
    return mixdown(lp(fife, 7000), at(0, tpt, 0.8), at(0, band, 0.6), at(0, tuba, 0.6), at(0, drums, 0.5))


@sfx("evolve_fanfare_modern", -16, 1, max_s=2.0)
def evolve_fanfare_modern(v, rng):
    k = 5
    brass = motif(GM["brass"], k, 110)
    tpt = motif(GM["trumpet"], k, 100)
    strings = chord_hit(GM["strings"], k, ("C3", "G3", "C4", "E4", "G4"))
    bass = chord_hit(GM["synth_bass"], k, ("C2",))
    kit = gm_notes(16, [(0.0, 0.2, 36, 120), (0.17, 0.1, 38, 90), (0.26, 0.1, 38, 100), (0.35, 0.5, 49, 115), (0.35, 0.3, 36, 125)], drums=True, tail=1.2)
    timp = gm_notes(GM["timpani"], [(0.35, 0.6, mn("F2"), 127)], tail=1.0)
    return mixdown(brass, at(0, tpt, 0.6), at(0, strings, 0.6), at(0, bass, 0.5), at(0, kit, 0.6), at(0, timp, 0.6))


@sfx("evolve_fanfare_future", -16, 1, max_s=2.0)
def evolve_fanfare_future(v, rng):
    k = 6
    lead = motif(GM["saw"], k, 100)
    brass = motif(GM["brass"], k, 104, -1)
    pad = chord_hit(GM["warm_pad"], k, ("C3", "G3", "C4", "E4", "G4"))
    kit = gm_notes(25, [(0.0, 0.2, 36, 120), (0.17, 0.1, 39, 90), (0.26, 0.1, 39, 100), (0.35, 0.5, 49, 110), (0.35, 0.3, 36, 127)], drums=True, tail=1.2)
    sub = thump(hz("F#1") * 2, hz("F#1"), 0.9, 0.05, 0.35, 1.5, hp_hz=50)
    shimmer = whoosh(rng, 0.4, 2000, 6000, 2.0, 0.3) * 0.25
    return mixdown(lp(lead, 6000), at(0, brass, 0.7), at(0, pad, 0.6), at(0, kit, 0.6), at(0.35, sub, 0.7), at(0.35, shimmer))


@sfx("evolve_enemy", -21, 1, max_s=1.6)
def evolve_enemy(v, rng):
    low = gm_notes(GM["trombone"], [(0.0, 0.9, mn("C3"), 100), (0.0, 0.9, mn("G3"), 96), (0.0, 0.9, mn("Eb3") + 12, 80)], tail=0.8)
    timp = gm_notes(GM["timpani"], [(i * 0.03, 0.04, mn("C2"), 60 + 2 * i) for i in range(14)] + [(0.45, 0.5, mn("C2"), 120)], tail=1.0)
    return mixdown(low, at(0, timp, 0.8), at(0.45, thump(80, 35, 0.6, 0.06, 0.2, hp_hz=50), 0.6))


# =================================================================================================
# Powers


@sfx("power_ready", -24, 1)
def power_ready(v, rng):
    return mixdown(whoosh(rng, 0.25, 800, 3000, 1.5, 0.8) * 0.3, at(0.12, chime(hz("G5"), 0.5, 0.15), 0.8), at(0.2, chime(hz("D6"), 0.6, 0.2), 0.7))


@sfx("power_telegraph", -25, 2, max_s=1.0, timed=True)
def power_telegraph(v, rng):
    d = 1.0
    t = dsp.tvec(d)
    pulse = (0.5 + 0.5 * np.cos(2 * np.pi * 4 * t)) ** 2
    f = dsp.glide(220, 330, d)
    tone_ = lp(osc(f, "saw"), 1500) * 0.5 + osc(f, "sine") * 0.5
    ticks = sum(dsp.pad_to(np.concatenate([np.zeros(n_of(k * 0.25)), click(rng, 0.005, 1500, 5000)]), n_of(d)) for k in range(4))
    out = tone_ * pulse * np.linspace(0.6, 1, n_of(d)) + ticks * 0.4
    return fade(out[: n_of(d)], 0.005, 0.03)


@sfx("pw_stampede", -19, 2, max_s=2.2, phone_gap=-6.0)
def pw_stampede(v, rng):
    d = 2.0
    parts = []
    t = 0.0
    while t < d - 0.2:
        for off in (0.0, 0.07, 0.16):  # gallop: da-da-dum
            g = 0.4 + 0.6 * min(1, t / 1.0)
            parts.append(at(t + off + rng.uniform(-0.01, 0.01), thump(95 * rng.uniform(0.85, 1.15), 40, 0.14, 0.02, 0.04, 2.0, hp_hz=50), g))
            parts.append(at(t + off, nburst(rng, 0.06, 200, 1500, 0.02, 0.002, "pink"), g * 0.5))
        t += 0.24 + rng.uniform(-0.03, 0.03)
    moo_d = 0.6
    moo_src = osc(dsp.glide(120, 95, moo_d) * (1 + 0.02 * osc(5, "sine", moo_d)), "saw")
    moo = formant(moo_src, [(500, 250, 1.0), (900, 300, 0.4)]) * dsp.env_adsr(moo_d, 0.08, 0.2, 0.7, 0.2)
    return mixdown(*parts, at(0, rumble(rng, d, 250, 1.0, 0.4), 1.0), at(0.5, moo, 0.8))


@sfx("pw_meteor", -19, 2, max_s=2.4, phone_gap=-6.0)
def pw_meteor(v, rng):
    fall = 1.0
    roar = dsp.sweep_bp(noise(fall, rng, "pink"), dsp.glide(3000, 500, fall), 1.2) * np.linspace(0.1, 1, n_of(fall)) ** 1.5 * 1.5
    fire = lp(noise(fall, rng, "brown"), 400) * np.linspace(0, 1, n_of(fall)) * 1.5
    boom = explosion(rng, 1.0, 0.9)
    return mixdown(roar, at(0, fire), at(fall - 0.02, boom, 1.2))


@sfx("pw_arrows", -20, 2, max_s=2.0)
def pw_arrows(v, rng):
    parts = [at(k * 0.03, shot_bow(k % 3, rng), 0.5) for k in range(5)]
    for k in range(10):
        parts.append(at(0.25 + k * 0.05 + rng.uniform(0, 0.04), whoosh(rng, 0.3, 1800, 900, 2.0, 0.6), 0.35))
    for k in range(12):
        parts.append(at(0.75 + k * 0.06 + rng.uniform(0, 0.05), hit_pierce(k % 3, rng), 0.55 * rng.uniform(0.6, 1)))
    return mixdown(*parts)


@sfx("pw_decree", -19, 1, max_s=1.8)
def pw_decree(v, rng):
    tpt = gm_notes(GM["trumpet"], [(0, 0.15, mn("G4"), 100), (0.15, 0.15, mn("C5"), 104), (0.3, 0.8, mn("E5"), 110)], tail=1.0)
    tpt2 = gm_notes(GM["trumpet"], [(0.3, 0.8, mn("C5"), 96), (0.3, 0.8, mn("G4"), 90)], tail=1.0)
    choir = chord_hit(GM["choir"], 0, ("C4", "E4", "G4", "C5"), 0.3, 0.9)
    bell_ = gm_note(GM["tubular"], mn("C5"), 0.6, 100, 1.4)
    return mixdown(tpt, at(0, tpt2, 0.7), at(0, choir, 0.6), at(0.3, bell_, 0.6))


@sfx("pw_smoke", -21, 2, max_s=2.0)
def pw_smoke(v, rng):
    pop = mixdown(thump(160, 60, 0.12, 0.015, 0.04, 2.0), at(0, nburst(rng, 0.05, 500, 3000, 0.012), 0.8))
    d = 1.7
    hiss = lp(noise(d, rng, "pink"), 2500) * np.sin(np.linspace(0, np.pi, n_of(d))) ** 0.5 * env_exp(d, 0.9, 0.05) * 1.2
    whoomph = whoosh(rng, 0.6, 200, 900, 1.0, 0.25) * 0.8
    return mixdown(pop, at(0.03, whoomph), at(0.05, hiss))


@sfx("pw_broadside", -19, 2, max_s=2.2, phone_gap=-6.0)
def pw_broadside(v, rng):
    parts = [at(k * 0.2 + rng.uniform(0, 0.04), shot_cannon(k % 3, rng), 0.8 - 0.05 * k) for k in range(5)]
    return mixdown(*parts)


def plane(rng, d: float, f: float, heavy: float = 0.0) -> np.ndarray:
    dop = dsp.glide(f * 1.06, f * 0.94, d, 1.0)
    eng = osc(dop, "saw") + 0.6 * osc(dop * 2, "saw") + 0.3 * osc(dop * 0.5, "square")
    eng = lp(eng * (0.8 + 0.2 * osc(dop / 4, "sine")), 1200 + 800 * (1 - heavy))
    env = np.sin(np.linspace(0, np.pi, n_of(d))) ** 1.2
    return (eng * 0.5 + lp(noise(d, rng, "pink"), 1500) * 0.4) * env


@sfx("pw_paratroop", -20, 2, max_s=2.0)
def pw_paratroop(v, rng):
    fly = plane(rng, 1.8, 90)
    chutes = [at(0.6 + k * 0.25, mixdown(whoosh(rng, 0.25, 250, 800, 1.2, 0.2), at(0, thump(140, 90, 0.1, 0.02, 0.03), 0.4)), 0.7) for k in range(3)]
    return mixdown(fly, *chutes)


@sfx("pw_bomber", -19, 2, max_s=2.4)
def pw_bomber(v, rng):
    fly = plane(rng, 2.0, 70, heavy=1.0)
    whistles = [at(0.35 + k * 0.18, bomb_whistle(k % 2, rng)[: n_of(0.45)], 0.35) for k in range(3)]
    booms = [at(0.8 + k * 0.18, explosion(rng, 0.4, 1 - 0.05 * k), 0.8) for k in range(3)]
    return mixdown(fly, *whistles, *booms)


@sfx("pw_lance", -20, 2, max_s=2.6)
def pw_lance(v, rng):
    charge_d = 0.8
    charge = osc(dsp.glide(120, 900, charge_d, 0.8), "sine") * np.linspace(0, 1, n_of(charge_d)) ** 2 * 0.5
    charge += dsp.sweep_bp(noise(charge_d, rng), dsp.glide(400, 4000, charge_d), 3) * np.linspace(0, 1, n_of(charge_d)) ** 3 * 0.8
    beam_d = 1.1
    buzz = lp(osc(60 * (1 + 0.02 * osc(9, "sine", beam_d)), "saw") + osc(90, "saw", beam_d) * 0.5, 1800)
    beam = (buzz * 0.6 + bp(noise(beam_d, rng), 800, 4000) * 0.3) * dsp.env_adsr(beam_d, 0.02, 0.2, 0.8, 0.3)
    boom = explosion(rng, 0.8, 1.0)
    return mixdown(charge, at(charge_d, beam), at(charge_d, boom, 0.9), at(charge_d, click(rng, 0.008, 800, 5000), 0.5))


@sfx("pw_nanite", -21, 2, max_s=1.8)
def pw_nanite(v, rng):
    d = 1.4
    n = n_of(d)
    out = np.zeros(n)
    for _ in range(90):
        t0 = rng.uniform(0, d - 0.05)
        f0 = rng.uniform(1200, 3200)
        g = osc(dsp.glide(f0, f0 * rng.uniform(0.7, 1.4), 0.03), "sine") * env_exp(0.03, 0.008, 0.001)
        i = n_of(t0)
        out[i : i + len(g)] += g * rng.uniform(0.2, 0.6)
    swell = np.sin(np.linspace(0, np.pi, n)) ** 0.8
    shimmer = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(600, 2500, d), 2.0) * 0.5
    hum = osc(dsp.glide(110, 160, d), "tri", d) * 0.3
    return (out * 0.8 + shimmer + lp(hum, 800)) * swell


# =================================================================================================
# Match moments


@sfx("last_stand_armed", -21, 1, max_s=1.4)
def last_stand_armed(v, rng):
    horn = gm_notes(GM["horn"], [(0, 0.25, mn("G3"), 100), (0.25, 0.8, mn("C4"), 108)], tail=0.8)
    horn2 = gm_notes(GM["trombone"], [(0.25, 0.8, mn("C3"), 96)], tail=0.8)
    timp = gm_notes(GM["timpani"], [(0.25, 0.5, mn("C2"), 120)], tail=0.9)
    return mixdown(horn, at(0, horn2, 0.6), at(0, timp, 0.8))


@sfx("last_stand_charge", -21, 1, max_s=1.0, timed=True)
def last_stand_charge(v, rng):
    d = 1.0
    hits = []
    t, gap = 0.0, 0.2
    while t < d - 0.05:
        hits.append((t, 0.1, 53 if len(hits) % 2 else 50, int(80 + 40 * t)))
        t += gap
        gap = max(0.06, gap * 0.8)
    drums = hp(gm_notes(GM["taiko"], hits, tail=0.4), 60)[: n_of(d)]
    rise = lp(osc(dsp.glide(110, 330, d), "saw"), 1800) * np.linspace(0, 1, n_of(d)) ** 2 * 0.3
    air = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(300, 3000, d), 1.5) * np.linspace(0, 1, n_of(d)) ** 2
    return fade(mixdown(drums, at(0, rise), at(0, air, 0.8))[: n_of(d)], 0.005, 0.02)


@sfx("last_stand_fire", -18, 1, max_s=1.6, phone_gap=-6.0)
def last_stand_fire(v, rng):
    wave = mixdown(thump(80, 28, 1.0, 0.08, 0.3, 2.2, hp_hz=50), at(0, whoosh(rng, 0.8, 3000, 300, 0.8, 0.1), 1.2))
    orch = gm_notes(GM["orch_hit"], [(0, 0.4, mn("C4"), 120), (0, 0.4, mn("G4"), 110)], tail=0.8)
    return mixdown(explosion(rng, 0.7), at(0, wave), at(0, orch, 0.7))


@sfx("overdrive_horn", -18, 1, max_s=1.5)
def overdrive_horn(v, rng):
    horn = gm_notes(GM["trombone"], [(0, 1.0, mn("C3"), 118), (0, 1.0, mn("G3"), 112)], tail=0.5)
    horn2 = gm_notes(GM["horn"], [(0, 1.0, mn("C4"), 110)], tail=0.5)
    taiko = hp(gm_notes(GM["taiko"], [(0, 0.3, 50, 127), (0.45, 0.3, 50, 110)], tail=0.8), 60)
    swell = np.clip(np.linspace(0.3, 2.5, n_of(1.5)), 0, 1)
    return mixdown(dsp.pad_to(horn, n_of(1.5)) * swell, at(0, dsp.pad_to(horn2, n_of(1.5)) * swell, 0.7), at(0, taiko, 0.9))


@sfx("siege_bell", -19, 1, max_s=3.4)
def siege_bell(v, rng):
    toll = gm_note(GM["tubular"], mn("C4"), 1.4, 120, 2.0)
    low = bell(hz("C3"), 3.0, 0.7, 1.4, ((0.5, 0.6), (1, 1.0), (1.19, 0.4), (1.5, 0.35), (2.0, 0.3), (2.52, 0.15)))
    return mixdown(toll, at(0, low, 0.35), at(1.3, toll, 0.8), at(1.3, low, 0.3))


@sfx("victory_jingle", -16, 1, max_s=2.2)
def victory_jingle(v, rng):
    tpt = gm_notes(GM["trumpet"], [(0, 0.12, mn("C5"), 104), (0.12, 0.06, mn("G4"), 96), (0.18, 0.06, mn("C5"), 100), (0.24, 0.24, mn("E5"), 104), (0.48, 0.12, mn("G5"), 108), (0.6, 0.9, mn("C6"), 112)], tail=1.0)
    brass = chord_hit(GM["brass"], 0, ("C3", "G3", "C4", "E4"), 0.6, 0.9, 104)
    glock = gm_notes(GM["glock"], [(0.6 + k * 0.05, 0.4, mn(n), 90) for k, n in enumerate(("C6", "E6", "G6", "C7"))], tail=1.0)
    kit = gm_notes(48, [(0.6, 0.8, 49, 110), (0.6, 0.4, 36, 110)], drums=True, tail=1.2)
    return mixdown(tpt, at(0, brass, 0.7), at(0, glock, 0.35), at(0, kit, 0.6))


@sfx("defeat_jingle", -21, 1, max_s=2.6)
def defeat_jingle(v, rng):
    # Gentle, not mocking (A13): a soft falling phrase that comes home to a warm major chord.
    horn = gm_notes(GM["horn"], [(0, 0.35, mn("E4"), 84), (0.35, 0.35, mn("D4"), 80), (0.7, 1.0, mn("C4"), 82)], tail=1.0)
    strings = gm_notes(GM["strings"], [(0, 0.7, mn(n), 70) for n in ("Ab3", "C4", "Eb4")] + [(0.7, 1.2, mn(n), 72) for n in ("G3", "C4", "E4")], tail=1.0)
    harp = gm_notes(GM["harp"], [(0.7 + k * 0.08, 1.0, mn(n), 70) for k, n in enumerate(("C4", "E4", "G4", "C5"))], tail=1.2)
    return mixdown(horn, at(0, strings, 0.6), at(0, harp, 0.5))


@sfx("emote_pop", -28, 3, hp_hz=200)
def emote_pop(v, rng):
    # A bubbly "bloop": a high woodblock with a quick upward pitched body.
    p = pv(v)
    wood = sample(GM["woodblock"], 84, 96, 0.12, 0.3, pitch=p, length=0.08)
    bloop = osc(dsp.glide(700 * p, 1500 * p, 0.06, 0.8), "sine") * env_exp(0.06, 0.022, 0.001)
    return mixdown(wood, at(0, bloop, 0.4), at(0, knock(1500 * p, 0.05, 0.01), 0.25))


# =================================================================================================
# Capsules


@sfx("cap_thud", -22, 3)
def cap_thud(v, rng):
    # The capsule lands: a concert tom and a wooden knock over a short punch, a little grit.
    p = pv(v)
    tom = perc(TOM_L, 122, KIT_ORCH, pitch=0.8 * p, length=0.45)
    wood = perc(WOOD_LO, 110, pitch=0.8 * p, length=0.12)
    return room(mixdown(tom, at(0, thump(110 * p, 50, 0.35, 0.03, 0.1, 2.2, hp_hz=80), 0.5), at(0, wood, 0.4), at(0, crack(rng, 0.05, 600, 2500, 0.014), 0.5), at(0.003, bell(420 * p, 0.25, 0.6, 0.07), 0.2), at(0.01, debris(rng, 0.2, 60, 900, 3500, 0.08), 0.3)), rng, 0.3, 0.18)


@sfx("cap_riser", -22, 1, max_s=1.5, timed=True)
def cap_riser(v, rng):
    d = 1.5
    rise = np.linspace(0, 1, n_of(d)) ** 2
    air = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(300, 4500, d, 0.8), 1.5) * rise * 1.2
    trill = gm_notes(GM["glock"], [(0.5 + k * 0.06, 0.08, mn(["C6", "E6", "G6", "C7"][k % 4]), int(50 + 3 * k)) for k in range(16)], tail=0.3)[: n_of(d)]
    swell = lp(osc(dsp.glide(65, 130, d), "saw"), 900) * rise * 0.3
    return fade(mixdown(air, at(0, trill, 0.5), at(0, swell))[: n_of(d)], 0.1, 0.03)


def climb(step: int, rng) -> np.ndarray:
    name = ["C5", "E5", "G5", "C6"][step - 1]
    f = hz(name)
    hit = mixdown(thump(90 + 12 * step, 45, 0.25, 0.02, 0.07, 2.0), at(0, nburst(rng, 0.06, 300, 2000, 0.015), 0.6))
    note = mixdown(at(0, gm_note(GM["glock"], mn(name), 0.4, 100, 1.0 + 0.2 * step), 0.6), at(0, chime(f, 0.6 + 0.15 * step, 0.2 + 0.05 * step), 0.5))
    parts = [hit, at(0.005, note)]
    if step >= 2:
        parts.append(at(0.005, gm_note(GM["harp"], mn(name) - 12, 0.4, 90, 1.0), 0.4))
    if step >= 3:
        parts.append(at(0.005, gm_notes(GM["strings"], [(0, 0.5, mn(name) - 12, 90), (0, 0.5, mn(name) - 5, 80)], tail=0.6), 0.35))
    if step == 4:
        parts.append(at(0.05, whoosh(rng, 0.4, 2000, 6000, 2.0, 0.3), 0.25))
        parts.append(at(0.005, gm_notes(GM["choir"], [(0, 0.6, mn(name) - 12, 90), (0, 0.6, mn(name) - 5, 90)], tail=0.6), 0.4))
    return mixdown(*parts)


@sfx("cap_climb_1", -23, 2, max_s=1.2)
def cap_climb_1(v, rng):
    return climb(1, rng)


@sfx("cap_climb_2", -22, 2, max_s=1.3)
def cap_climb_2(v, rng):
    return climb(2, rng)


@sfx("cap_climb_3", -21, 2, max_s=1.4)
def cap_climb_3(v, rng):
    return climb(3, rng)


@sfx("cap_climb_4", -20, 2, max_s=1.6)
def cap_climb_4(v, rng):
    return climb(4, rng)


# The 2026-09-29 ladder (DESIGN A10 step 3b, A13): Platinum and Aeon are summit tiers. Platinum climbs
# the next step up the arpeggio (E6) with a glass-bell partial at x2.76; Aeon is richer and lower, not
# shriller: a choir chord under the chime and a clock tick 60 ms after the hit. Time, bells, stone and
# choir; no coin, slot or jackpot colour.


def glass_bell(freq: float, dur: float, tau: float = 0.9, glass: float = 0.7) -> np.ndarray:
    # A struck glass bell: the fundamental, a strong inharmonic x2.76 partial and a faint x5.4 shimmer.
    return bell(freq, dur, 1.0, tau, partials=((1, 1.0), (2.0, 0.25), (2.76, glass), (5.4, 0.18)))


@sfx("cap_climb_5", -19, 2, max_s=2.0)
def cap_climb_5(v, rng):
    name = "E6"
    f = hz(name)
    hit = mixdown(thump(118, 50, 0.3, 0.02, 0.08, 2.0), at(0, nburst(rng, 0.07, 300, 2400, 0.016), 0.6))
    ring = mixdown(at(0, gm_note(GM["glock"], mn(name), 0.4, 104, 1.6), 0.55), at(0, glass_bell(f, 1.8, 0.8), 0.45), at(0, chime(f, 1.2, 0.5), 0.3))
    body = mixdown(
        at(0, gm_note(GM["harp"], mn(name) - 12, 0.5, 92, 1.2), 0.4),
        at(0, gm_notes(GM["strings"], [(0, 0.7, mn("C5"), 88), (0, 0.7, mn("E5"), 84), (0, 0.7, mn("G5"), 80)], tail=0.9), 0.35),
        at(0, gm_notes(GM["choir"], [(0, 0.7, mn("C5"), 84), (0, 0.7, mn("G5"), 80)], tail=0.8), 0.3),
    )
    sheen = whoosh(rng, 0.5, 2500, 7000, 2.0, 0.3)
    return room(mixdown(hit, at(0.005, ring), at(0.005, body), at(0.04, sheen, 0.2)), rng, 0.45, 0.2)


@sfx("cap_climb_6", -18, 2, max_s=2.4)
def cap_climb_6(v, rng):
    # Lower and fuller: the chime on C5, a deep bell an octave under, a choir chord, and a clock tick.
    hit = mixdown(thump(90, 42, 0.4, 0.025, 0.1, 2.2), at(0, nburst(rng, 0.08, 200, 1800, 0.02), 0.6))
    ring = mixdown(at(0, gm_note(GM["glock"], mn("C5"), 0.4, 100, 1.6), 0.4), at(0, glass_bell(hz("C5"), 2.0, 1.0, 0.5), 0.4), at(0, bell(hz("C4"), 2.2, 0.8, 1.2), 0.45))
    choir = gm_notes(GM["choir"], [(0, 1.0, mn(n), 92) for n in ("C4", "G4", "C5", "E5")], tail=1.2)
    pad = lp(gm_notes(GM["space_voice"], [(0, 1.0, mn(n), 80) for n in ("C3", "G3", "C4")], tail=1.0), 2400)
    tick = mixdown(perc(WOOD_HI, 100, pitch=1.4, length=0.05), at(0, knock(3200, 0.04, 0.008), 0.4))
    return room(mixdown(hit, at(0.005, ring), at(0.01, choir, 0.45), at(0.01, pad, 0.3), at(0.06, tick, 0.5)), rng, 0.6, 0.24)


@sfx("cap_summit_rise", -23, 2, max_s=0.75)
def cap_summit_rise(v, rng):
    # A summit gem rising out of the capsule's cap: a stone grind under a rising glass chime (400 ms).
    d = 0.4
    grind = lp(debris(rng, d, 220, 120, 1800, 0.25, 0.008), 2400) * np.linspace(0.6, 1.0, n_of(d))
    rub = lp(noise(d, rng, "brown"), 500) * env_exp(d, 0.3, 0.02) * 0.6
    notes = gm_notes(GM["celesta"], [(0.0, 0.2, mn("G5"), 70), (0.12, 0.2, mn("C6"), 78), (0.24, 0.3, mn("E6"), 86)], tail=0.5)
    glide = osc(dsp.glide(hz("G5"), hz("E6"), d, 0.7), "sine") * np.linspace(0.2, 0.8, n_of(d)) * 0.35
    return mixdown(fade(mixdown(grind, at(0, rub)), 0.01, 0.08), at(0, notes, 0.6), at(0, glide), at(0.34, glass_bell(hz("E6"), 0.4, 0.3), 0.3))


@sfx("cap_burst_platinum", -17, 1, max_s=3.0)
def cap_burst_platinum(v, rng):
    # Platinum stinger: a struck glass-bell chord with a long tail, over cap_burst.
    chord = mixdown(*[at(k * 0.018, glass_bell(hz(n), 2.8, 1.1, 0.8), g) for k, (n, g) in enumerate((("C5", 0.5), ("E5", 0.45), ("G5", 0.45), ("C6", 0.5), ("E6", 0.4)))])
    vibes = gm_notes(GM["vibes"], [(0, 1.6, mn(n), 96) for n in ("C5", "E5", "G5", "C6")], tail=1.4)
    celesta = gm_notes(GM["celesta"], [(0.08 + k * 0.05, 0.6, mn(n), 84) for k, n in enumerate(("G6", "C7", "E7"))], tail=1.2)
    strings = gm_notes(GM["strings"], [(0, 1.4, mn(n), 76) for n in ("C4", "G4", "E5")], tail=1.2)
    shimmer = bp(noise(2.4, rng, "pink"), 4000, 9000) * env_exp(2.4, 0.9, 0.2) * 0.08
    return room(mixdown(chord, at(0, vibes, 0.45), at(0, celesta, 0.35), at(0, strings, 0.3), at(0.05, shimmer)), rng, 0.8, 0.28)


@sfx("cap_burst_aeon", -16, 1, max_s=3.6)
def cap_burst_aeon(v, rng):
    # Aeon stinger: a deep bell, a choir chord and a clock chime, with a 2 s star-glitter tail.
    deep = mixdown(at(0, bell(hz("C3"), 3.2, 0.8, 1.6), 0.8), at(0, gm_note(GM["tubular"], mn("C4"), 2.0, 110, 2.0), 0.5), at(0, thump(70, 36, 0.8, 0.04, 0.3, 2.2, hp_hz=40), 0.5))
    choir = gm_notes(GM["choir"], [(0.02, 1.8, mn(n), 96) for n in ("C4", "E4", "G4", "C5", "E5")], tail=1.4)
    pad = lp(gm_notes(GM["space_voice"], [(0.02, 1.8, mn(n), 84) for n in ("C3", "G3")], tail=1.2), 2400)
    clock = gm_notes(GM["tubular"], [(0.35, 0.5, mn("G5"), 92), (0.6, 0.5, mn("E5"), 88), (0.85, 0.9, mn("C5"), 96)], tail=1.4)
    ticks = mixdown(*[at(0.12 + k * 0.25, mixdown(perc(WOOD_HI, 84, pitch=1.5, length=0.04), at(0, knock(3400, 0.03, 0.006), 0.3)), 0.35) for k in range(4)])
    glitter = np.zeros(n_of(2.6))
    for k in range(40):
        t0 = 0.5 + rng.uniform(0, 2.0)
        f = hz("C7") * 2 ** (rng.choice([0, 4, 7, 12, 16, 19]) / 12)
        g = blip(f, 0.16, 0.05) * (1.0 - (t0 - 0.5) / 2.2) * 0.5
        i = n_of(t0 - 0.5)
        e = min(len(glitter), i + len(g))
        glitter[i:e] += g[: e - i]
    return room(mixdown(deep, at(0, choir, 0.5), at(0, pad, 0.35), at(0, clock, 0.4), at(0, ticks), at(0.5, glitter, 0.6)), rng, 0.9, 0.3)


# The hammer's timing (DESIGN A10 step 3, owner request 2026-09-29): a count-in tick the plan pitches up
# (root, +2, +4 semitones), and the graded layers over the hit. Feel only: they never follow the result.


@sfx("cap_strike_tick", -29, 3, hp_hz=300)
def cap_strike_tick(v, rng):
    # A dry, bright "tk": a high woodblock with a small brass ping, short enough for a 200 ms beat.
    p = pv(v) ** 0.3
    wood = sample(GM["woodblock"], 86, 100, 0.08, 0.2, pitch=1.05 * p, length=0.07)
    ping = bell(1320 * p, 0.09, 0.6, 0.03)
    return mixdown(wood, at(0, knock(2200 * p, 0.04, 0.008), 0.45), at(0, ping, 0.3), at(0, click(rng, 0.004, 3000, 9000), 0.25))


@sfx("cap_strike_perfect", -18, 3, max_s=1.3)
def cap_strike_perfect(v, rng):
    # A Perfect hit: a forge-anvil clang and a heavy low punch, then a bright bell ring (C7 with G7 and
    # a glass partial) and a short sparkle. Layered over the strike's own thump and note.
    p = [1.0, 1.01, 0.99][v % 3]
    punch = thump(120 * p, 48, 0.3, 0.02, 0.07, 2.2, hp_hz=70)
    anvil = bell(1244 * p, 0.7, 0.9, 0.16, partials=((1, 1.0), (1.47, 0.6), (2.09, 0.45), (2.56, 0.35), (3.9, 0.2)))
    crackle = mixdown(crack(rng, 0.03, 1200, 6000, 0.008), at(0, nburst(rng, 0.08, 500, 3000, 0.02), 0.6))
    ring = mixdown(at(0, bell(hz("C7"), 1.1, 0.8, 0.45, partials=((1, 1.0), (2.0, 0.3), (2.76, 0.35))), 0.7), at(0, bell(hz("G7"), 0.7, 0.5, 0.3), 0.3))
    sparkle = gm_notes(GM["celesta"], [(0.04, 0.2, mn("C7"), 80), (0.09, 0.3, mn("G7"), 70)], tail=0.5)
    return room(mixdown(punch, at(0, anvil, 0.55), at(0, crackle, 0.6), at(0.006, ring), at(0, sparkle, 0.35)), rng, 0.35, 0.16)


@sfx("cap_strike_good", -22, 3, max_s=0.9)
def cap_strike_good(v, rng):
    # A Good hit: a lighter knock and one clear ring (G6).
    p = [1.0, 1.01, 0.99][v % 3]
    knockx = mixdown(thump(150 * p, 80, 0.14, 0.015, 0.04, 1.6, hp_hz=110), at(0, knock(900 * p, 0.06, 0.015), 0.5))
    ring = bell(hz("G6"), 0.7, 0.6, 0.3, partials=((1, 1.0), (2.0, 0.25), (2.76, 0.3)))
    return room(mixdown(knockx, at(0.004, ring, 0.7)), rng, 0.3, 0.14)


@sfx("cap_clunk", -27, 3)
def cap_clunk(v, rng):
    # A neutral knock, never a penalty sound (A10).
    p = pv(v)
    wood = perc(WOOD_LO, 104, pitch=0.7 * p, length=0.14)
    tom = perc(TOM_LM, 100, KIT_ORCH, pitch=1.0 * p, length=0.2)
    return mixdown(wood, at(0, tom, 0.5), at(0, thump(150 * p, 90, 0.12, 0.015, 0.035, 1.6, hp_hz=110), 0.35), at(0, bell(560 * p, 0.12, 0.5, 0.035), 0.15))


@sfx("cap_burst", -18, 1, max_s=1.6)
def cap_burst(v, rng):
    pop = mixdown(thump(130, 50, 0.3, 0.02, 0.08, 2.2), at(0, nburst(rng, 0.1, 400, 4000, 0.03), 0.8))
    sparkle = gm_notes(GM["celesta"], [(0.05 + k * 0.04, 0.4, mn(n), 90) for k, n in enumerate(("C5", "E5", "G5", "C6", "E6", "G6"))], tail=1.0)
    chord = chord_hit(GM["strings"], 0, ("C4", "E4", "G4", "C5"), 0.05, 0.7, 90)
    return mixdown(pop, at(0, whoosh(rng, 0.4, 3000, 800, 1.5, 0.1), 0.5), at(0, sparkle, 0.6), at(0, chord, 0.45), at(0.02, debris(rng, 0.8, 100, 2500, 6000, 0.3, 0.006), 0.15))


@sfx("card_flip", -29, 3, noisy=True)
def card_flip(v, rng):
    p = pv(v)
    flick = whoosh(rng, 0.06, 1500 * p, 4000 * p, 1.2, 0.6) * 0.9
    tap = thump(320 * p, 200, 0.03, 0.005, 0.01) * 0.4
    return mixdown(flick, at(0.04, tap))


@sfx("foil_shine", -26, 2)
def foil_shine(v, rng):
    d = 0.55
    out = np.zeros(n_of(d))
    for k in range(18):
        t0 = 0.02 + k * 0.025 + rng.uniform(0, 0.01)
        f = hz("C6") * 2 ** (rng.choice([0, 4, 7, 12, 16]) / 12)
        g = blip(f, 0.12, 0.03) * (0.3 + 0.7 * np.sin(np.pi * k / 18))
        i = n_of(t0)
        e = min(len(out), i + len(g))
        out[i:e] += g[: e - i]
    return lp(out, 7000) * 0.6


@sfx("rarity_common", -25, 1)
def rarity_common(v, rng):
    return mixdown(gm_note(GM["harp"], mn("C5"), 0.4, 100, 0.9), at(0, pluck(hz("C4"), 0.4, rng, bright=0.5), 0.4))


@sfx("rarity_rare", -23, 1)
def rarity_rare(v, rng):
    notes = gm_notes(GM["celesta"], [(0, 0.3, mn("C5"), 100), (0.16, 0.6, mn("G5"), 104)], tail=1.0)
    harp = gm_notes(GM["harp"], [(0, 0.3, mn("C4"), 90), (0.16, 0.6, mn("G4"), 90)], tail=1.0)
    return mixdown(notes, at(0, harp, 0.6))


@sfx("rarity_epic", -21, 1, max_s=1.6)
def rarity_epic(v, rng):
    arp = gm_notes(GM["celesta"], [(k * 0.1, 0.6, mn(n), 100) for k, n in enumerate(("C5", "E5", "G5", "C6"))], tail=1.0)
    vib = gm_notes(GM["vibes"], [(k * 0.1, 0.6, mn(n), 90) for k, n in enumerate(("C4", "E4", "G4", "C5"))], tail=1.0)
    pad = chord_hit(GM["strings"], 0, ("C4", "E4", "G4"), 0.3, 0.8, 80)
    shimmer = whoosh(rng, 0.6, 2500, 6000, 2.0, 0.5) * 0.2
    return mixdown(arp, at(0, vib, 0.5), at(0, pad, 0.5), at(0.25, shimmer))


@sfx("rarity_legendary", -16, 1, max_s=2.6)
def rarity_legendary(v, rng):
    fan = gm_notes(GM["trumpet"], [(0, 0.12, mn("C5"), 104), (0.12, 0.12, mn("G4"), 96), (0.24, 0.12, mn("C5"), 100), (0.36, 0.12, mn("E5"), 104), (0.48, 1.2, mn("G5"), 112)], tail=1.0)
    horn = gm_notes(GM["horn"], [(0.48, 1.2, mn("C4"), 100), (0.48, 1.2, mn("E4"), 96)], tail=1.0)
    choir = chord_hit(GM["choir"], 0, ("C4", "G4", "C5", "E5"), 0.45, 1.5, 96)
    glock = gm_notes(GM["glock"], [(0.48 + k * 0.05, 0.5, mn(n), 90) for k, n in enumerate(("C6", "E6", "G6", "C7"))], tail=1.0)
    sub = thump(80, 28, 1.4, 0.1, 0.45, 1.5, hp_hz=50)
    cym = gm_notes(48, [(0.48, 1.0, 49, 110)], drums=True, tail=1.5)
    return mixdown(fan, at(0, horn, 0.7), at(0, choir, 0.7), at(0, glock, 0.35), at(0.48, sub, 0.9), at(0, cym, 0.5))


@sfx("walkout_bass", -17, 1, max_s=1.6, phone_gap=-6.0)
def walkout_bass(v, rng):
    sub = thump(110, 36, 1.4, 0.08, 0.45, 2.4, harm=0.5, hp_hz=50)
    hit = gm_notes(GM["timpani"], [(0, 0.8, mn("C2"), 127)], tail=1.0)
    boom = nburst(rng, 0.3, 80, 900, 0.1, 0.002, "pink") * 0.6
    return mixdown(sub, at(0, hit, 0.6), at(0, boom), at(0, click(rng, 0.006, 600, 4000), 0.4))


@sfx("copy_tick", -33, 3, hp_hz=400)
def copy_tick(v, rng):
    return mixdown(blip(1900 * [1, 1.01, 0.99][v], 0.03, 0.007), at(0, click(rng, 0.003, 2500, 7000), 0.15))


@sfx("upgrade_ready", -24, 1)
def upgrade_ready(v, rng):
    return mixdown(chime(hz("E5"), 0.5, 0.15), at(0.1, chime(hz("A5"), 0.6, 0.2), 0.8), at(0.05, whoosh(rng, 0.3, 1500, 4000, 2.0, 0.6), 0.2))


@sfx("upgrade_slam", -19, 2, max_s=1.2)
def upgrade_slam(v, rng):
    anvil = bell(520, 0.9, 1.0, 0.3, ((1, 1), (2.76, 0.8), (5.4, 0.5), (8.9, 0.25)))
    return room(mixdown(thump(110, 42, 0.4, 0.03, 0.12, 2.4, hp_hz=50), at(0, anvil, 0.35), at(0, nburst(rng, 0.08, 500, 4000, 0.02), 0.8), at(0.01, crackle(rng, 0.4, 500, 0.12), 0.25)), rng, 0.4, 0.2)


@sfx("level_up", -18, 1, max_s=1.6)
def level_up(v, rng):
    tpt = gm_notes(GM["trumpet"], [(k * 0.08, 0.25 if k < 3 else 0.8, mn(n), 104) for k, n in enumerate(("C5", "E5", "G5", "C6"))], tail=1.0)
    brass = chord_hit(GM["brass"], 0, ("C4", "E4", "G4"), 0.24, 0.8, 96)
    glock = gm_notes(GM["glock"], [(0.24 + k * 0.04, 0.4, mn(n), 90) for k, n in enumerate(("C6", "E6", "G6", "C7"))], tail=1.0)
    cym = gm_notes(48, [(0.24, 0.8, 49, 100)], drums=True, tail=1.2)
    return mixdown(tpt, at(0, brass, 0.6), at(0, glock, 0.3), at(0, cym, 0.4))


@sfx("reel_tick", -33, 3, hp_hz=400)
def reel_tick(v, rng):
    return mixdown(blip(1500 * [1, 1.01, 0.99][v], 0.02, 0.004, "tri"), at(0, click(rng, 0.003, 2000, 6000), 0.2))


# =================================================================================================
# A17: Bronze, Industrial and Cosmic (DESIGN A17.12). The evolve fanfares play the motif in the key
# the music moves to on the eight-age chain: Bronze D (+2), Industrial F# (+6), Cosmic A (+9, the lead
# an octave down). Other musical sounds stay in C.


def bronze_clang(f0: float, dur: float = 0.9, bright: float = 0.8, tau: float = 0.35) -> np.ndarray:
    """Struck cast bronze: a bell with the dense, slightly beating partials of a thick plate."""
    return bell(f0, dur, bright, tau, ((1, 1.0), (1.51, 0.7), (2.09, 0.55), (2.74, 0.45), (3.46, 0.3), (4.9, 0.18), (6.3, 0.1)))


def flutter(rng, dur: float, f0: float, f1: float, rate: float, res: float = 1.4) -> np.ndarray:
    """A whoosh with an amplitude flutter (a spinning shaft, a rope, a rotor)."""
    w = whoosh(rng, dur, f0, f1, res, 0.35)
    return w * (0.65 + 0.35 * osc(rate, "sine", dur)[: len(w)])


# ---------------------------------------------------------------------------------------- Bronze


@sfx("shot_javelin", -27, 3)
def shot_javelin(v, rng):
    # A grunt-free overarm throw: a hand slap on the shaft, a heavy low whoosh with a flutter (the
    # shaft wobbling), a short wooden knock of the release.
    p = pv(v)
    slap = mixdown(perc(WOOD_LO, 96, pitch=0.7 * p, length=0.07), at(0, knock(900 * p, 0.05, 0.012, rng), 0.5), at(0, click(rng, 0.004, 900, 4000), 0.35))
    fly = flutter(rng, 0.26, 300 * p, 1500 * p, 24 * p, 1.5)
    tail = whoosh(rng, 0.18, 1200, 2600, 2.0, 0.3) * 0.25
    body = thump(150 * p, 90, 0.06, 0.012, 0.02, hp_hz=110)
    return mixdown(slap, at(0.005, fly, 0.9), at(0.08, tail), at(0, body, 0.3))


@sfx("shot_scorpion", -24, 3)
def shot_scorpion(v, rng):
    # Crank and recoil: two ratchet clicks, then the torsion arms slam (a deep twang and a wooden
    # thunk) and the bolt hisses away.
    p = pv(v)
    ratchet = mixdown(at(0, perc(CLAVES, 86, pitch=0.75 * p, length=0.04), 0.5), at(0.045, perc(CLAVES, 92, pitch=0.8 * p, length=0.04), 0.55), at(0.09, perc(WOOD_HI, 90, pitch=0.7 * p, length=0.05), 0.5))
    twang = pluck(72 * p, 0.35, rng, bright=0.35)
    slam = mixdown(perc(TOM_LF, 118, KIT_ORCH, pitch=1.1 * p, length=0.3), at(0, perc(WOOD_LO, 114, pitch=0.55 * p, length=0.12), 0.7), at(0, thump(150 * p, 70, 0.16, 0.02, 0.05, 2.0, hp_hz=90), 0.6), at(0, crack(rng, 0.05, 700, 3200, 0.014), 0.6))
    bolt = whoosh(rng, 0.22, 900, 2800, 2.0, 0.25) * 0.4
    return room(mixdown(ratchet, at(0.13, slam), at(0.13, twang, 0.7), at(0.15, bolt)), rng, 0.3, 0.18)


@sfx("stomp_colossus", -22, 3, phone_gap=-6.0)
def stomp_colossus(v, rng):
    # A bronze giant's foot: a deep boom, a heavy cast-metal clang, cracking ground and grit.
    p = pv(v)
    boom = thump(85 * p, 34, 0.55, 0.05, 0.16, 2.4, hp_hz=50)
    tom = perc(TOM_LF, 124, KIT_ORCH, pitch=0.62 * p, length=0.6)
    clang = bronze_clang(233 * p, 1.0, 0.8, 0.32)
    ground = mixdown(crack(rng, 0.08, 500, 3000, 0.025), at(0.01, debris(rng, 0.6, 120, 600, 4000, 0.2, 0.012), 0.6), at(0, rumble(rng, 0.8, 260, 0.3), 0.6))
    return room(mixdown(boom, at(0, tom, 0.8), at(0.005, clang, 0.55), at(0, ground)), rng, 0.55, 0.2)


@sfx("mirror_beam", -29, 3)
def mirror_beam(v, rng):
    # Focused sunlight (fires every 0.3 s, so it is short and soft): a warm glassy swell that
    # brightens, a thin sizzle where it lands. Kept below 1.5 kHz so the repeats never whistle.
    p = pv(v)
    d = 0.26
    f = dsp.glide(1040 * p, 1180 * p, d)
    glass = (osc(f, "sine") + 0.25 * osc(f * 1.5, "sine") + 0.1 * osc(f * 2.02, "sine")) * dsp.env_adsr(d, 0.015, 0.08, 0.5, 0.12)
    body = lp(osc(dsp.glide(520 * p, 590 * p, d), "tri"), 1400) * dsp.env_adsr(d, 0.006, 0.06, 0.35, 0.1)
    sizzle = bp(noise(d, rng), 4000, 10000) * dsp.env_adsr(d, 0.03, 0.1, 0.4, 0.1) * 0.25
    air = bp(noise(d, rng, "pink"), 700, 2500) * dsp.env_adsr(d, 0.02, 0.08, 0.4, 0.1) * 0.3
    return mixdown(glass * 0.5, at(0, body, 0.6), at(0, sizzle), at(0, air), at(0, click(rng, 0.003, 1500, 6000), 0.15))


@sfx("gorgon_gaze", -23, 2)
def gorgon_gaze(v, rng):
    # A hiss of snakes, an eerie two-tone glare and the grind and crack of flesh turning to stone.
    p = pv(v)
    d = 0.9
    hiss = bp(noise(d, rng), 2500, 7000) * (0.6 + 0.4 * osc(11, "sine", d)) * dsp.env_adsr(d, 0.06, 0.3, 0.5, 0.3) * 0.5
    glare = (osc(dsp.glide(440 * p, 520 * p, d), "sine") * osc(dsp.glide(466 * p, 610 * p, d), "sine")) * dsp.env_adsr(d, 0.1, 0.3, 0.6, 0.3)
    glare = lp(glare + 0.3 * osc(dsp.glide(880 * p, 1040 * p, d), "tri") * dsp.env_adsr(d, 0.1, 0.3, 0.5, 0.3), 3500)
    grind = lp(noise(0.5, rng, "brown"), 700) * (0.5 + 0.5 * np.abs(osc(17, "sine", 0.5))) * dsp.env_adsr(0.5, 0.05, 0.2, 0.6, 0.2) * 1.4
    stone = mixdown(perc(WOOD_LO, 116, pitch=0.5 * p, length=0.15), at(0, crack(rng, 0.07, 600, 3500, 0.02), 0.9), at(0, thump(140 * p, 70, 0.14, 0.02, 0.05, 2.0), 0.6), at(0.01, debris(rng, 0.3, 90, 900, 4000, 0.1, 0.01), 0.5))
    return room(mixdown(hiss, at(0, glare, 0.6), at(0.3, grind), at(0.62, stone)), rng, 0.4, 0.2)


@sfx("pw_wave", -19, 2, max_s=2.6, noisy=True, phone_gap=-6.0)
def pw_wave(v, rng):
    # The tidal wave: a roar builds, crashes onto the lane and rushes along it for 2 s, then drains
    # away in foam and spray.
    d = 2.5
    n = n_of(d)
    t = dsp.tvec(d)
    build = np.clip(t / 0.7, 0, 1) ** 2
    decay = np.where(t < 0.7, 1.0, np.exp(-(t - 0.7) / 0.9))
    cut = dsp.glide(500, 2600, d, 0.4)
    roar = dsp.sweep_lp(noise(d, rng, "pink"), np.minimum(cut, 2600), 0.9) * build * decay * 1.4
    surge = lp(noise(d, rng, "brown"), 350) * np.sin(np.clip(t / d, 0, 1) * np.pi) ** 0.7 * 2.0
    crash = mixdown(thump(90, 36, 0.6, 0.05, 0.18, 2.2, hp_hz=50), at(0, nburst(rng, 0.5, 400, 4000, 0.15, 0.002, "pink"), 1.4), at(0, perc(TOM_LF, 120, KIT_ORCH, pitch=0.6, length=0.5), 0.6))
    foam = debris(rng, 1.8, 220, 1200, 6000, 0.9, 0.02) * 0.5
    spray = bp(noise(1.6, rng), 4000, 10000) * dsp.env_adsr(1.6, 0.05, 0.3, 0.5, 1.0) * 0.18
    out = mixdown(at(0, roar), at(0, surge), at(0.68, crash), at(0.72, foam), at(0.75, spray))[:n]
    return fade(out, 0.05, 0.4)


@sfx("pw_aegis", -20, 2, max_s=2.0)
def pw_aegis(v, rng):
    # Shields up for the whole army: a struck bronze shield, a C major choir swelling behind it and a
    # rising shimmer of bells (musical, in C).
    shield = mixdown(bronze_clang(262, 1.4, 0.9, 0.5), at(0, perc(TOM_L, 110, KIT_ORCH, pitch=0.9, length=0.3), 0.4), at(0, click(rng, 0.004, 1500, 6000), 0.3))
    choir = chord_hit(GM["choir"], 0, ("C4", "E4", "G4", "C5"), 0.12, 1.2, 96)
    horn = gm_notes(GM["horn"], [(0.12, 1.0, mn("C4"), 90), (0.12, 1.0, mn("G3"), 84)], tail=0.8)
    bells = gm_notes(GM["celesta"], [(0.2 + k * 0.08, 0.6, mn(nm), 84) for k, nm in enumerate(("C6", "E6", "G6", "C7"))], tail=0.8)
    shimmer = whoosh(rng, 0.8, 800, 4000, 1.8, 0.8) * 0.2
    return mixdown(shield, at(0, choir, 0.55), at(0, horn, 0.45), at(0, bells, 0.35), at(0, shimmer))


@sfx("evolve_fanfare_bronze", -16, 1, max_s=2.0)
def evolve_fanfare_bronze(v, rng):
    k = 2
    reed = motif(GM["oboe"], k, 110)
    horn = motif(GM["horn"], k, 104, -1)
    lyre = gm_notes(GM["harp"], [(0.35 + i * 0.03, 1.0, mn(nm) + k, 100) for i, nm in enumerate(("C3", "G3", "C4", "E4", "G4", "C5"))], tail=1.2)
    strings = chord_hit(GM["strings"], k, ("C3", "G3", "C4", "E4"))
    frame = gm_notes(GM["taiko"], [(0.0, 0.2, 57, 116), (0.17, 0.1, 62, 84), (0.26, 0.1, 62, 92), (0.35, 0.4, 57, 127)], tail=1.0)
    cym = gm_notes(0, [(0.35, 0.8, 52, 96)], drums=True, tail=1.4)
    return mixdown(reed, at(0, horn, 0.75), at(0, lyre, 0.5), at(0, strings, 0.45), at(0, hp(frame, 70), 0.9), at(0, cym, 0.35))


# ------------------------------------------------------------------------------------ Industrial


@sfx("shot_carbine", -25, 3, noisy=True)
def shot_carbine(v, rng):
    # A short carbine shot, then the lever cocks: clack-clack.
    p = pv(v)
    snap = nburst(rng, 0.04, 800, 6500, 0.01, 0.0003) * 1.1
    gs = sample(GM["gunshot"], 62, 120, 0.3, 0.6, pitch=1.05 * p, length=0.4)
    body = thump(190 * p, 90, 0.12, 0.012, 0.035, 2.0, hp_hz=110) * 0.5
    tail = nburst(rng, 0.3, 400, 2600, 0.09, 0.005, "pink") * 0.35
    lever = mixdown(perc(SIDE_STICK, 96, pitch=1.4 * p, length=0.05), at(0, knock(2300 * p, 0.04, 0.008, rng), 0.5), at(0.07, perc(SIDE_STICK, 104, pitch=1.2 * p, length=0.05), 1.0), at(0.07, knock(1900 * p, 0.05, 0.01, rng), 0.5))
    return room(mixdown(snap, at(0, gs, 0.9), at(0, body), at(0.004, tail), at(0.2, lever, 0.35)), rng, 0.45, 0.2)


@sfx("shot_harpoon", -25, 3)
def shot_harpoon(v, rng):
    # A pneumatic thoonk and a puff of air, then the rope whizzes off the coil.
    p = pv(v)
    thoonk = mixdown(thump(200 * p, 85, 0.16, 0.02, 0.05, 2.0, hp_hz=100), at(0, perc(TOM_HM, 112, KIT_ORCH, pitch=1.2 * p, length=0.2), 0.6), at(0, knock(760 * p, 0.08, 0.02, rng), 0.5))
    puff = nburst(rng, 0.2, 500, 2500, 0.06, 0.003, "pink") * 0.7
    rope = flutter(rng, 0.4, 1400 * p, 2800 * p, 38, 2.2) * 0.45
    reel = debris(rng, 0.35, 260, 2000, 5000, 0.2, 0.004) * 0.3
    return mixdown(thoonk, at(0, puff), at(0.03, rope), at(0.05, reel))


@sfx("flare_pop", -26, 3)
def flare_pop(v, rng):
    # A flare pistol: a hollow pop and a bright, fizzing climb.
    p = pv(v)
    pop = mixdown(thump(260 * p, 130, 0.08, 0.012, 0.025, 1.8, hp_hz=120), at(0, perc(SIDE_STICK, 108, pitch=0.8 * p, length=0.06), 0.6), at(0, crack(rng, 0.03, 900, 4000, 0.008), 0.5))
    d = 0.5
    fizz = bp(noise(d, rng), 2500, 8000) * dsp.env_adsr(d, 0.03, 0.15, 0.5, 0.25) * 0.35
    whistle = osc(dsp.glide(1400 * p, 2200 * p, d, 0.7), "sine") * dsp.env_adsr(d, 0.04, 0.15, 0.4, 0.2) * 0.2
    sparks = crackle(rng, d, 220, 0.25) * 0.25
    return mixdown(pop, at(0.02, fizz), at(0.02, whistle), at(0.03, sparks))


@sfx("fuse_hiss", -28, 3, noisy=True)
def fuse_hiss(v, rng):
    # The Sapper sets the charge: a thunk of the box and a spitting, sparkling fuse.
    p = pv(v)
    d = 0.55
    thunk = mixdown(perc(WOOD_LO, 104, pitch=0.7 * p, length=0.1), at(0, thump(170 * p, 90, 0.08, 0.012, 0.025, hp_hz=110), 0.5))
    spit = bp(noise(d, rng), 2000, 7000) * (0.55 + 0.45 * np.abs(noise(d, rng, "pink")).clip(0, 1)) * dsp.env_adsr(d, 0.02, 0.1, 0.7, 0.2) * 0.5
    sparks = crackle(rng, d, 500, 0.4) * 0.45
    return mixdown(at(0, thunk, 0.45), at(0.04, spit, 1.3), at(0.04, sparks, 1.2))


@sfx("shot_gatling", -26, 3, noisy=True)
def shot_gatling(v, rng):
    # A crank-fed burst: four fast shots over the rattle of the turning barrels.
    p = pv(v)
    gs = sample(GM["gunshot"], 67, 112, 0.2, 0.4, pitch=1.45 * p, length=0.1)
    parts = []
    for k in range(4):
        s = mixdown(nburst(rng, 0.025, 900, 6000, 0.006, 0.0003), at(0, gs, 0.8), at(0, thump(180 * p, 100, 0.06, 0.01, 0.018, 2.0, hp_hz=120), 0.4))
        parts.append(at(k * 0.065 + rng.uniform(-0.003, 0.003), s, 1.0 - 0.08 * k))
    rattle = debris(rng, 0.3, 420, 1800, 5000, 1.0, 0.004) * 0.25
    crank = mixdown(perc(CLAVES, 84, pitch=0.6 * p, length=0.04), at(0.13, perc(CLAVES, 80, pitch=0.62 * p, length=0.04)))
    tail = nburst(rng, 0.2, 400, 2400, 0.06, 0.004, "pink") * 0.3
    return mixdown(*parts, at(0, rattle), at(0.01, crank, 0.3), at(0.2, tail))


@sfx("tesla_zap", -23, 3, noisy=True)
def tesla_zap(v, rng):
    # A coil discharge: a crack, a buzzing arc that jumps (it chains) and a spray of sparks.
    p = pv(v)
    d = 0.45
    am = (0.55 + 0.45 * np.sign(osc(23 * p, "sine", d))) * (0.7 + 0.3 * osc(61, "sine", d))
    buzz = bp(osc(118 * p * (1 + 0.08 * osc(31, "sine", d)), "saw") + 0.6 * osc(177 * p, "square", d), 250, 3000) * am * env_exp(d, 0.2, 0.002)
    arc = crackle(rng, d, 1400, 0.16) * 0.8
    snap = mixdown(crack(rng, 0.03, 1500, 6000, 0.006), at(0, click(rng, 0.004, 2000, 8000), 0.6))
    whine = osc(dsp.glide(2600 * p, 1800 * p, d), "sine") * env_exp(d, 0.1, 0.002) * 0.12
    sparks = debris(rng, 0.35, 150, 2500, 8000, 0.12, 0.004) * 0.35
    return mixdown(snap, at(0, buzz, 0.7), at(0, arc), at(0, whine), at(0.05, sparks))


def train_whistle(rng, dur: float) -> np.ndarray:
    """A steam whistle: three breathy pipes (C, E, G) through resonant band passes, with a pitch scoop."""
    out = np.zeros(n_of(dur))
    scoop = dsp.glide(0.94, 1.0, dur, 0.3)
    for name, g in (("C6", 1.0), ("E6", 0.8), ("G6", 0.7)):
        f = hz(name) * scoop
        tone_ = osc(f, "saw") * 0.3 + osc(f, "sine")
        out += lp(tone_, 3500) * g
    breath = bp(noise(dur, rng), 900, 3500) * 0.25
    return (out * 0.35 + breath) * dsp.env_adsr(dur, 0.05, 0.1, 0.9, 0.2)


@sfx("pw_iron_horse", -19, 2, max_s=2.6, phone_gap=-6.0)
def pw_iron_horse(v, rng):
    # Three runaway engines: a whistle screams, the chuffs race faster and faster over rail clatter,
    # and the iron slams into the enemy line.
    d = 2.4
    n = n_of(d)
    out = np.zeros(n)
    for e in range(3):
        t0 = 0.25 + e * 0.5
        t = t0
        gap = 0.16
        while t < min(d, t0 + 1.6):
            g = 0.5 + 0.5 * min(1, (t - t0) / 0.8)
            ch = nburst(rng, 0.09, 400, 2800, 0.03, 0.002, "pink") * (1.0 if int((t - t0) / gap) % 2 == 0 else 0.6)
            thk = thump(110 * (1 + 0.1 * e), 55, 0.1, 0.02, 0.03, 2.0, hp_hz=60) * 0.6
            i = n_of(t)
            seg = mixdown(ch, at(0, thk))
            e_ = min(n, i + len(seg))
            out[i:e_] += seg[: e_ - i] * g * (1.0 - 0.15 * e)
            t += gap
            gap = max(0.07, gap * 0.93)
    clatter = sum(dsp.pad_to(np.concatenate([np.zeros(n_of(k * 0.19 + 0.3)), perc(SIDE_STICK, 90, pitch=0.7 + 0.05 * (k % 2), length=0.05)]), n) * 0.35 for k in range(11))
    roll_ = lp(noise(d, rng, "brown"), 300) * np.clip(dsp.tvec(d) / 1.2, 0, 1) * 1.6
    slams = mixdown(*[at(1.15 + k * 0.5, mixdown(thump(95, 40, 0.3, 0.04, 0.1, 2.3, hp_hz=55), at(0, perc(TOM_L, 122, KIT_ORCH, pitch=0.7, length=0.35), 0.8), at(0, crack(rng, 0.06, 500, 3000, 0.02), 0.7), at(0, bronze_clang(180, 0.5, 0.6, 0.12), 0.25)), 0.9) for k in range(3)])
    whistle = train_whistle(rng, 0.7)
    out = mixdown(at(0, out), at(0, clatter), at(0, roll_), at(0, slams), at(0, whistle, 0.9))[:n]
    return fade(out, 0.01, 0.3)


@sfx("pw_zeppelin", -19, 2, max_s=2.6)
def pw_zeppelin(v, rng):
    # An airship drones over and lays ten bombs along the lane: short whistles, a rolling line of blasts.
    d = 2.5
    dop = dsp.glide(46 * 1.04, 46 * 0.96, d)
    engine = lp(osc(dop, "saw") + 0.7 * osc(dop * 2, "square") + 0.4 * osc(dop * 3, "saw"), 900) * (0.7 + 0.3 * osc(dop * 0.5, "sine"))
    engine = engine * np.sin(np.linspace(0, np.pi, n_of(d))) ** 0.8 * 0.5
    prop = bp(noise(d, rng, "pink"), 300, 1400) * (0.6 + 0.4 * osc(9, "sine", d)) * np.sin(np.linspace(0, np.pi, n_of(d))) * 0.3
    parts = []
    for k in range(10):
        t = 0.3 + k * 0.2
        wh = osc(dsp.glide(1500, 900, 0.18), "sine") * np.linspace(0.2, 1, n_of(0.18)) * 0.12
        parts.append(at(t, wh))
        parts.append(at(t + 0.17, explosion(rng, 0.2, 1.0 + 0.04 * ((k * 3) % 5 - 2)), 0.55 + 0.03 * (k % 3)))
    return fade(mixdown(engine, at(0, prop), *parts)[: n_of(d)], 0.2, 0.3)


@sfx("evolve_fanfare_industrial", -16, 1, max_s=2.0)
def evolve_fanfare_industrial(v, rng):
    k = 6
    cornet = motif(GM["trumpet"], k, 106)
    euph = motif(GM["horn"], k, 100, -1)
    acc = chord_hit(GM["accordion"], k, ("C4", "E4", "G4"), vel=96)
    band = chord_hit(GM["trombone"], k, ("C3", "G3", "C4", "E4"))
    tuba = chord_hit(GM["tuba"], k, ("C2",))
    drums = gm_notes(0, [(0.02 * i, 0.03, 38, 55 + 3 * i) for i in range(17)] + [(0.35, 0.5, 49, 110), (0.35, 0.3, 36, 122)], drums=True, tail=1.2)
    anvil = bell(hz("F#6"), 0.8, 0.7, 0.2, ((1, 1.0), (2.76, 0.5), (5.4, 0.3), (8.93, 0.15)))
    steam = hp(noise(0.9, rng), 3000) * env_exp(0.9, 0.25, 0.02) * 0.12
    return mixdown(cornet, at(0, euph, 0.8), at(0, acc, 0.5), at(0, band, 0.55), at(0, tuba, 0.6), at(0, drums, 0.5), at(0.35, anvil, 0.25), at(0.36, steam))


# ---------------------------------------------------------------------------------------- Cosmic


@sfx("shot_ion", -25, 3)
def shot_ion(v, rng):
    # The coil rings charge up in a blink, then an ion bolt: a ringing "tsiu" with a crackling edge.
    p = pv(v)
    charge = osc(dsp.glide(600 * p, 1800 * p, 0.06, 0.6), "sine") * np.linspace(0.1, 1, n_of(0.06)) * 0.25
    d = 0.3
    f = dsp.drop(2400 * p, 520 * p, d, 0.05)
    bolt = dsp.fm(f, 1.5, 2.2 * np.exp(-dsp.tvec(d) / 0.05)) * env_exp(d, 0.08, 0.001)
    ring = osc(f * 0.5, "sine") * env_exp(d, 0.1, 0.002) * 0.5
    edge = crackle(rng, 0.15, 500, 0.05) * 0.25
    return mixdown(charge, at(0.06, sat(bolt * 0.8 + ring, 1.3)), at(0.06, edge), at(0.06, click(rng, 0.003, 1500, 6000), 0.3), at(0.06, thump(180 * p, 90, 0.08, 0.012, 0.025), 0.3))


@sfx("shot_void", -26, 3)
def shot_void(v, rng):
    # The Mothership's void beam: a dark, phasing "vwom" that sucks the air in.
    p = pv(v)
    d = 0.38
    f = dsp.glide(95 * p, 62 * p, d)
    tone_ = osc(f, "saw") + 0.7 * osc(f * 1.007, "saw") + 0.5 * osc(f * 2, "square")
    sweep = dsp.sweep_bp(tone_, dsp.glide(1800, 500, d, 0.7), 2.5)
    body = osc(f * 2, "sine") * 0.4
    suck = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(3000, 700, d), 2.0) * np.linspace(1, 0.2, n_of(d)) * 0.4
    env = dsp.env_adsr(d, 0.01, 0.1, 0.7, 0.15)
    return mixdown(sat((sweep + body) * env, 1.4), at(0, suck * env), at(0, click(rng, 0.004, 700, 3500), 0.3))


@sfx("shot_starburst", -25, 3)
def shot_starburst(v, rng):
    # A fan of three bolts at once: a bright, spread "pew-pew-pew" chord with a sparkle.
    p = pv(v)
    parts = []
    for k, (ratio, g) in enumerate(((1.0, 1.0), (1.26, 0.8), (1.5, 0.7))):
        d = 0.2
        f = dsp.drop(1500 * p * ratio, 380 * p * ratio, d, 0.045)
        pew = (osc(f, "sine") * 0.8 + osc(f, "tri") * 0.3) * env_exp(d, 0.06, 0.002)
        parts.append(at(k * 0.018, pew, g))
    sparkle = debris(rng, 0.25, 220, 4000, 9000, 0.1, 0.003) * 0.3
    return mixdown(*parts, at(0.02, sparkle), at(0, click(rng, 0.003, 1500, 6000), 0.3), at(0, thump(170 * p, 85, 0.08, 0.012, 0.025), 0.35))


@sfx("shot_tachyon", -22, 3)
def shot_tachyon(v, rng):
    # The Tachyon Lance: a glassy inhale, a crystalline crack and a long, bright prism beam.
    p = pv(v)
    pre = 0.1
    inhale = dsp.sweep_bp(noise(pre, rng, "pink"), dsp.glide(1500, 6000, pre), 3.0) * np.linspace(0, 1, n_of(pre)) ** 2 * 0.6
    d = 0.55
    crack_ = mixdown(crack(rng, 0.04, 1500, 7000, 0.008), at(0, thump(140, 50, 0.3, 0.03, 0.09, 1.8, hp_hz=60), 0.6))
    beam_f = dsp.glide(990 * p, 880 * p, d)
    beam = (osc(beam_f, "sine") + 0.5 * osc(beam_f * 1.5, "sine") + 0.2 * osc(beam_f * 2.01, "sine")) * env_exp(d, 0.18, 0.003)
    prism = fm_bell(1980 * p, d, 1.41, 2.0, 0.2, 0.05) * 0.25
    fizz = bp(noise(d, rng), 5000, 11000) * env_exp(d, 0.12, 0.002) * 0.15
    return mixdown(inhale, at(pre, crack_), at(pre, beam * 0.45), at(pre, prism), at(pre, fizz))


@sfx("blink_warp", -25, 3)
def blink_warp(v, rng):
    # Blink out and in: the air is sucked into a point (a reverse swell), a pop, and the stalker
    # reappears with a bright upward flick.
    p = pv(v)
    d1 = 0.16
    out_ = dsp.sweep_bp(noise(d1, rng, "pink"), dsp.glide(600, 4500, d1), 2.5) * np.linspace(0, 1, n_of(d1)) ** 2.5
    down = osc(dsp.glide(900 * p, 150 * p, d1, 1.5), "sine") * np.linspace(0.2, 1, n_of(d1)) * 0.4
    pop = mixdown(click(rng, 0.004, 1200, 6000), at(0, thump(220 * p, 110, 0.06, 0.01, 0.02, hp_hz=120), 0.6))
    d2 = 0.22
    flick = osc(dsp.glide(300 * p, 2200 * p, d2, 0.6), "sine") * env_exp(d2, 0.07, 0.002) * 0.6
    shimmer = fm_bell(1760 * p, 0.3, 2.01, 1.5, 0.08, 0.03) * 0.3
    return mixdown(out_, at(0, down), at(d1, pop), at(d1 + 0.07, flick), at(d1 + 0.07, shimmer))


@sfx("drone_launch", -24, 3)
def drone_launch(v, rng):
    # A launch bay opens (a hydraulic clunk), a drone spins up and darts away with a doppler whine.
    p = pv(v)
    clunk = mixdown(perc(TOM_HM, 108, KIT_ORCH, pitch=1.1 * p, length=0.15), at(0, knock(650 * p, 0.08, 0.02, rng), 0.6), at(0, thump(170 * p, 80, 0.1, 0.015, 0.03, 2.0), 0.5))
    hiss = nburst(rng, 0.15, 1500, 5000, 0.05, 0.003) * 0.3
    d = 0.5
    f = dsp.glide(180 * p, 820 * p, d, 0.6)
    rotor = lp(osc(f, "saw") + 0.5 * osc(f * 1.5, "square"), 3500) * (0.6 + 0.4 * osc(dsp.glide(20, 60, d), "sine")) * dsp.env_adsr(d, 0.05, 0.2, 0.6, 0.2) * 0.4
    zip_ = whoosh(rng, 0.3, 1200, 3000, 2.0, 0.6) * 0.35
    return mixdown(clunk, at(0.02, hiss), at(0.08, rotor), at(0.3, zip_))


def star_shard(rng, p: float = 1.0) -> np.ndarray:
    """A falling star shard: a descending crystalline whistle into a small blast with a chime."""
    fall = 0.32
    w = (osc(dsp.glide(3200 * p, 900 * p, fall, 1.2), "sine") + 0.3 * osc(dsp.glide(4800 * p, 1350 * p, fall, 1.2), "sine")) * np.linspace(0.1, 1, n_of(fall)) ** 1.5 * 0.25
    trail = dsp.sweep_bp(noise(fall, rng, "pink"), dsp.glide(5000, 1200, fall), 2.0) * np.linspace(0, 1, n_of(fall)) * 0.3
    hit = mixdown(explosion(rng, 0.25, 1.05 * p), at(0, fm_bell(hz("E6") * p, 0.6, 3.5, 2.0, 0.2, 0.04), 0.12))
    return mixdown(w, at(0, trail), at(fall, hit))


@sfx("pw_starfall", -19, 2, max_s=2.8, phone_gap=-6.0)
def pw_starfall(v, rng):
    # Six star shards over 2 s: a shimmer opens the sky, then shard after shard whistles down and bursts.
    d = 2.7
    sky = dsp.sweep_bp(noise(0.6, rng, "pink"), dsp.glide(800, 5000, 0.6), 2.0) * np.linspace(0, 1, n_of(0.6)) ** 2 * 0.4
    parts = [at(0.1 + k * 0.36 + rng.uniform(-0.02, 0.02), star_shard(rng, 1.0 + 0.05 * ((k * 2) % 5 - 2)), 0.85) for k in range(6)]
    return fade(mixdown(sky, *parts)[: n_of(d)], 0.01, 0.3)


@sfx("pw_warp", -20, 2, max_s=2.2)
def pw_warp(v, rng):
    # A portal tears open (a deep swell and a swirling rise), three legionnaires warp through (pops
    # with a bright flick), and the portal snaps shut.
    d = 1.0
    swell = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(200, 3000, d, 0.7), 1.8) * np.linspace(0, 1, n_of(d)) ** 1.8 * 0.9
    swirl = dsp.fm(dsp.glide(110, 330, d), 1.5, 2.5 * (0.5 + 0.5 * osc(5, "sine", d))) * np.linspace(0, 1, n_of(d)) * 0.35
    sub = thump(70, 35, 0.8, 0.08, 0.3, 1.8, hp_hz=45)
    pops = []
    for k in range(3):
        t = d - 0.1 + k * 0.2
        pops.append(at(t, blink_warp(k, rng), 0.8))
        pops.append(at(t, thump(160, 80, 0.12, 0.02, 0.04, 2.0), 0.5))
    shut = mixdown(osc(dsp.glide(900, 120, 0.25, 1.5), "sine") * env_exp(0.25, 0.08, 0.002) * 0.5, at(0, click(rng, 0.004, 800, 4000), 0.4))
    return mixdown(swell, at(0, lp(swirl, 3000)), at(d - 0.12, sub, 0.7), *pops, at(d + 0.62, shut))


@sfx("evolve_fanfare_cosmic", -16, 1, max_s=2.0)
def evolve_fanfare_cosmic(v, rng):
    k = 9 - 12  # A, the lead an octave down (+9 passes +6)
    choir = motif(GM["choir"], k, 112)
    brass = motif(GM["brass"], k, 106)
    sbrass = motif(GM["synth_brass"], k, 96)
    strings = chord_hit(GM["strings"], k, ("C4", "G4", "C5", "E5", "G5"))
    pad = chord_hit(GM["space_voice"], k, ("C4", "E4", "G4", "C5"))
    timp = gm_notes(GM["timpani"], [(0.0, 0.2, mn("A1"), 110), (0.35, 0.6, mn("A1"), 127)], tail=1.0)
    kit = gm_notes(48, [(0.35, 0.5, 49, 110), (0.35, 0.3, 36, 124), (0.17, 0.1, 38, 84), (0.26, 0.1, 38, 96)], drums=True, tail=1.2)
    bells = gm_notes(GM["celesta"], [(0.35 + i * 0.05, 0.5, mn(nm) + 9, 86) for i, nm in enumerate(("C5", "E5", "G5", "C6"))], tail=1.0)
    sub = thump(hz("A1") * 2, hz("A1"), 0.9, 0.05, 0.35, 1.5, hp_hz=45)
    return mixdown(choir, at(0, brass, 0.7), at(0, sbrass, 0.4), at(0, strings, 0.5), at(0, pad, 0.4), at(0, timp, 0.7), at(0, kit, 0.5), at(0, bells, 0.3), at(0.35, sub, 0.6))


# ------------------------------------------------------------------------------------- Lane (A17.5)


@sfx("alert_base", -23, 2, hp_hz=150)
def alert_base(v, rng):
    # "Your base is under attack" (the gate is off-screen): two urgent muted bell strokes, G5 then C5,
    # over a low tom, clear on a phone and unlike any combat hit. Musical, in C.
    p = [1.0, 1.0][v]
    bell1 = mixdown(gm_note(GM["tubular"], mn("G5"), 0.25, 112, 0.6), at(0, chime(hz("G5"), 0.4, 0.12), 0.5))
    bell2 = mixdown(gm_note(GM["tubular"], mn("C5"), 0.35, 116, 0.8), at(0, chime(hz("C5"), 0.5, 0.16), 0.5))
    tom = mixdown(perc(TOM_L, 112 if v == 0 else 104, KIT_ORCH, pitch=0.9 * p, length=0.35), at(0, thump(130, 70, 0.15, 0.02, 0.05, 2.0), 0.4))
    return mixdown(bell1, at(0.16, bell2), at(0, tom, 0.5), at(0.16, tom, 0.65))


# The power rework (DESIGN A2.9, A5.7): the 32 new powers and the shared power cues live in their own
# module, which registers into REGISTRY with the helpers above.
import sounds_powers  # noqa: E402,F401
import sounds_forts  # noqa: E402,F401
import sounds_mvp  # noqa: E402,F401
import sounds_bronze_wave  # noqa: E402,F401
import sounds_stone_wave  # noqa: E402,F401
import sounds_medieval_wave  # noqa: E402,F401
import sounds_gunpowder_wave  # noqa: E402,F401
import sounds_industrial_wave  # noqa: E402,F401
import sounds_modern_wave  # noqa: E402,F401
import sounds_future_wave  # noqa: E402,F401
import sounds_cosmic_wave  # noqa: E402,F401
