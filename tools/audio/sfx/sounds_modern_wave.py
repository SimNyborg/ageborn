"""The Modern wave's sounds (CONTENT_PLAN 5.6, DESIGN A13): the attacks of the 13 new Modern units, the two new
turrets and the Creeping Barrage and Concussion Shells powers.

Same building blocks and loudness targets as `sounds.py` (shots -22..-25, melee hits -26/-27, turrets -21/-22,
power casts -19/-20), so the new cards sit in the existing mix. Modern is smokeless powder, steel, canvas and
engines: every shot opens with a hard, short crack that reads on a phone speaker, the big guns add a body
and a short room, and nothing here is musical (no key needed).

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    GM, WOOD_HI, WOOD_LO, at, bell, bp, click, crack, debris, dsp, fade, grunt, knock, lp, mixdown, n_of, nburst,
    noise, osc, perc, room, rumble, sample, thump, whoosh,
)
from sounds import pv, sfx


def _cut(x: np.ndarray, d: float, fout: float = 0.25) -> np.ndarray:
    return fade(dsp.pad_to(x, n_of(d))[: n_of(d)], 0.002, fout)


def _steel(f0: float, dur: float = 0.25, tau: float = 0.07) -> np.ndarray:
    return bell(f0, dur, 0.9, tau, ((1, 1.0), (2.2, 0.55), (3.6, 0.35), (5.0, 0.2)))


def _gun(rng, p: float, body: float = 150.0, size: float = 1.0, bright: float = 1.0) -> np.ndarray:
    """A smokeless-powder report: a hard crack, a pitched body and a short tail."""
    snap = nburst(rng, 0.04, 1200 * bright, 9500, 0.008, 0.0004) * 1.2
    boom = thump(body * p, body * 0.5, 0.22 * size, 0.015, 0.06 * size, 2.0, hp_hz=70)
    gs = sample(GM["gunshot"], 62, 120, 0.25, 0.6, pitch=1.05 * p * (150.0 / body) ** 0.3, length=0.45)
    tail = nburst(rng, 0.3 * size, 500, 3000, 0.1, 0.005, "pink") * 0.35
    return mixdown(snap, at(0, boom, 0.6), at(0, gs, 0.8), at(0.01, tail))


def _boom(rng, p: float, body: float = 70.0, size: float = 1.0) -> np.ndarray:
    """A shell or bomb burst: a low pitched thump, a dirty crack and a rumbling tail."""
    k = thump(body * p, body * 0.45, 0.5 * size, 0.03, 0.14 * size, 2.4, hp_hz=40)
    c = crack(rng, 0.08, 500, 5000, 0.02) * 0.9
    r = rumble(rng, 0.7 * size, 260, 0.3) * 0.8
    d = debris(rng, 0.4 * size, 60, 1500, 6000, 0.12, 0.006) * 0.3
    return mixdown(k, at(0, c), at(0.01, r), at(0.03, d))


def _whistle(rng, dur: float, f0: float, f1: float, gain: float = 0.25) -> np.ndarray:
    t = np.linspace(0, 1, n_of(dur), endpoint=False)
    f = f0 * (f1 / f0) ** t
    ph = 2 * np.pi * np.cumsum(f) / dsp.SR
    return np.sin(ph) * dsp.env_adsr(dur, 0.05, dur * 0.3, 0.8, dur * 0.2) * gain


# ---------------------------------------------------------------------------------------- melee


@sfx("butt_stroke", -27, 3, noisy=True)
def butt_stroke(v, rng):
    # Commando: a quick rolling scuff, a whip of the carbine and a hard wooden smack of the butt.
    p = pv(v)
    scuff = nburst(rng, 0.08, 400, 3000, 0.04, 0.01, "pink") * 0.4
    sw = whoosh(rng, 0.1, 800 * p, 2600 * p, 1.8, 0.4) * 0.6
    smack = mixdown(perc(WOOD_LO, 112, pitch=0.8 * p, length=0.07), at(0, knock(380 * p, 0.07, 0.016, rng), 0.7),
                    at(0, thump(160 * p, 90, 0.08, 0.01, 0.03, 1.8), 0.6))
    return mixdown(scuff, at(0.05, sw), at(0.11, smack))


@sfx("sandbag_slam", -26, 3, noisy=True, phone_gap=-6.0)
def sandbag_slam(v, rng):
    # Sandbag Carrier: a grunt, the heavy canvas bag whooshing down and a dull thud with a spray of sand.
    p = pv(v)
    g = grunt(rng, 120 * p, 0.14, "u", 0.9) * 0.4
    sw = whoosh(rng, 0.16, 300 * p, 1200 * p, 1.4, 0.5) * 0.6
    thud = thump(100 * p, 55, 0.22, 0.02, 0.07, 2.2, hp_hz=50)
    sand = nburst(rng, 0.3, 1500, 7000, 0.1, 0.005) * 0.4
    return room(mixdown(g, at(0.04, sw), at(0.16, thud), at(0.17, sand)), rng, 0.3, 0.1)


@sfx("sticky_thunk", -26, 3, noisy=True)
def sticky_thunk(v, rng):
    # Sticky Bomber: a dull wet thunk as the charge sticks to the hull, a hollow steel bonk and a sharp little pop.
    p = pv(v)
    thunk = mixdown(thump(190 * p, 110, 0.09, 0.01, 0.03, 1.4), at(0, knock(260 * p, 0.06, 0.02, rng), 0.5))
    bonk = _steel(520 * p, 0.25, 0.08) * 0.5
    pop = mixdown(crack(rng, 0.05, 900, 6000, 0.012), at(0, thump(140 * p, 70, 0.18, 0.02, 0.06, 2.0), 0.7))
    return mixdown(thunk, at(0.01, bonk), at(0.2, pop))


@sfx("boxing_jab", -27, 3, noisy=True)
def boxing_jab(v, rng):
    # Bulldog Sergeant: a huff, a quick fist whip and a meaty knuckle smack.
    p = pv(v)
    huff = nburst(rng, 0.08, 500, 2500, 0.04, 0.01, "pink") * 0.35
    sw = whoosh(rng, 0.07, 900 * p, 3000 * p, 1.8, 0.35) * 0.5
    smack = mixdown(thump(170 * p, 100, 0.07, 0.008, 0.025, 1.6), at(0, crack(rng, 0.03, 1200, 5000, 0.006), 0.8))
    return mixdown(huff, at(0.03, sw), at(0.07, smack))


@sfx("dozer_shove", -24, 3, noisy=True, phone_gap=-6.0)
def dozer_shove(v, rng):
    # Bulldozer: a diesel roar, the blade scraping and a crunching heave of earth and steel.
    p = pv(v)
    eng = osc(70 * p, "saw", 0.5) * dsp.env_adsr(0.5, 0.05, 0.2, 0.7, 0.15) * 0.35
    eng = lp(eng, 800)
    scrape = bp(noise(0.35, rng), 600, 3500) * dsp.env_adsr(0.35, 0.02, 0.1, 0.6, 0.15) * 0.5
    crunch = mixdown(thump(80 * p, 45, 0.3, 0.03, 0.1, 2.4, hp_hz=40), at(0, debris(rng, 0.4, 80, 400, 3000, 0.15, 0.01), 0.6))
    return room(mixdown(eng, at(0.2, scrape), at(0.25, crunch)), rng, 0.4, 0.14)


# ---------------------------------------------------------------------------------------- shots


@sfx("shot_smg", -24, 4, noisy=True)
def shot_smg(v, rng):
    # SMG Squad: a short, chattery three-round burst, light and fast.
    p = pv(v)
    rounds = mixdown(*[at(0.055 * k, _gun(rng, p * (1.0 + 0.03 * k), 180.0, 0.45, 1.2), 0.8) for k in range(3)])
    return _cut(rounds, 0.4)


@sfx("shot_rifle_grenade", -24, 3, noisy=True)
def shot_rifle_grenade(v, rng):
    # Rifle Grenadier: a hollow, punchy THOOMP from the cup launcher and a soft fluttering whoosh away.
    p = pv(v)
    thoomp = mixdown(thump(120 * p, 60, 0.18, 0.015, 0.05, 2.0), at(0, nburst(rng, 0.06, 400, 3000, 0.02), 0.5))
    away = whoosh(rng, 0.35, 900 * p, 400 * p, 1.4, 0.4) * 0.4
    return mixdown(thoomp, at(0.04, away))


@sfx("shot_assault_gun", -22, 3, noisy=True, phone_gap=-6.0)
def shot_assault_gun(v, rng):
    # Assault Gun: a big gun report and the clank of the whole hull rocking back on its tracks.
    p = pv(v)
    boom = _gun(rng, p, 70.0, 1.6, 0.8)
    clank = mixdown(_steel(260 * p, 0.3, 0.1), at(0.02, debris(rng, 0.2, 50, 1500, 5000, 0.08, 0.006), 0.4)) * 0.5
    return room(mixdown(boom, at(0.12, clank)), rng, 0.5, 0.16)


@sfx("shot_mortar_team", -24, 3, phone_gap=-6.0)
def shot_mortar_team(v, rng):
    # Mortar Team: the bomb slides down the tube with a metal tink, then a deep hollow thoomp.
    p = pv(v)
    tink = _steel(1800 * p, 0.12, 0.03) * 0.3
    slide = whoosh(rng, 0.06, 2500, 1200, 1.2, 0.3) * 0.25
    thoomp = mixdown(thump(110 * p, 55, 0.3, 0.02, 0.08, 2.2, hp_hz=40), at(0, nburst(rng, 0.08, 300, 2500, 0.03), 0.5))
    return room(mixdown(tink, at(0.0, slide), at(0.07, thoomp)), rng, 0.45, 0.16)


@sfx("shot_pistol", -25, 3, noisy=True)
def shot_pistol(v, rng):
    # Combat Medic: a single light sidearm pop.
    p = pv(v)
    return _cut(_gun(rng, p, 220.0, 0.5, 1.3), 0.35)


@sfx("shot_ghillie", -22, 3, noisy=True)
def shot_ghillie(v, rng):
    # Ghillie Sniper: one sharp, ringing rifle crack with a long echo, then the bolt worked: clack, clack.
    p = pv(v)
    crack_ = _gun(rng, p, 130.0, 1.2, 1.4)
    echo = lp(nburst(rng, 0.6, 400, 2500, 0.3, 0.01, "pink"), 1800) * 0.25
    bolt = mixdown(click(rng, 0.006, 1500, 6000) * 0.6, at(0.1, click(rng, 0.006, 1200, 5000) * 0.6),
                   at(0, knock(900 * p, 0.04, 0.01, rng), 0.4), at(0.1, knock(760 * p, 0.04, 0.01, rng), 0.4))
    return room(mixdown(crack_, at(0.08, echo), at(0.32, bolt)), rng, 0.5, 0.14)


@sfx("dive_whistle", -22, 3, noisy=True, max_s=1.2, phone_gap=-6.0)
def dive_whistle(v, rng):
    # Dive Bomber: the rising shriek of the dive, then the bomb bursting below.
    p = pv(v)
    shriek = _whistle(rng, 0.55, 900 * p, 2200 * p, 0.22)
    burst = _boom(rng, p, 75.0, 0.9)
    return _cut(mixdown(shriek, at(0.55, burst)), 1.2)


@sfx("bomb_stick", -21, 2, noisy=True, max_s=1.4, phone_gap=-6.0)
def bomb_stick(v, rng):
    # Sky Fortress: a falling whistle and a stick of three bursts walking across the ground.
    p = pv(v)
    fall = _whistle(rng, 0.38, 1500 * p, 600 * p, 0.2)
    bursts = mixdown(*[at(0.09 * k, _boom(rng, p * (1.0 - 0.04 * k), 70.0, 0.8), 0.8 - 0.1 * k) for k in range(3)])
    return _cut(room(mixdown(fall, at(0.38, bursts)), rng, 0.5, 0.16), 1.4)


# ---------------------------------------------------------------------------------------- turrets


@sfx("shot_at_gun", -22, 3, noisy=True, phone_gap=-6.0)
def shot_at_gun(v, rng):
    # Anti-Tank Gun: a hard, high-velocity crack with a ringing steel bark and the spades thudding into the dirt.
    p = pv(v)
    bark = _gun(rng, p, 95.0, 1.3, 1.2)
    ring = _steel(2600 * p, 0.3, 0.08) * 0.25
    spades = thump(90 * p, 50, 0.15, 0.02, 0.05, 1.8) * 0.5
    return room(mixdown(bark, at(0.03, ring), at(0.08, spades)), rng, 0.45, 0.14)


@sfx("rocket_ripple", -21, 2, noisy=True, max_s=1.2)
def rocket_ripple(v, rng):
    # Rocket Battery: six rockets ripple off the rack one after another, each a rushing hiss.
    p = pv(v)
    rockets = []
    for k in range(6):
        hiss = bp(noise(0.3, rng), 400, 5000) * dsp.env_adsr(0.3, 0.01, 0.08, 0.6, 0.15) * 0.5
        thud = thump(180 * p * (1 + 0.02 * k), 90, 0.06, 0.01, 0.02, 1.6) * 0.5
        rockets.append(at(0.11 * k, mixdown(hiss, at(0, thud))))
    return _cut(room(mixdown(*rockets), rng, 0.4, 0.12), 1.2)


# ---------------------------------------------------------------------------------------- powers


@sfx("pw_barrage", -20, 2, max_s=1.7, noisy=True)
def pw_barrage(v, rng):
    # Creeping Barrage: distant guns thud, a chorus of falling shells whistles in, then a rolling line of bursts.
    p = pv(v)
    d = 1.7
    guns = mixdown(*[at(0.07 * k, thump(70 * p, 40, 0.2, 0.02, 0.08, 1.8), 0.5) for k in range(3)])
    whistles = mixdown(*[at(0.06 * k, _whistle(rng, 0.4, (1700 - 120 * k) * p, (700 - 60 * k) * p, 0.1)) for k in range(3)])
    bursts = mixdown(*[at(0.13 * k, _boom(rng, p * (1.0 - 0.03 * k), 72.0, 0.7), 0.75) for k in range(4)])
    return _cut(room(mixdown(guns, at(0.12, whistles), at(0.55, bursts)), rng, 0.5, 0.16), d, 0.3)


@sfx("pw_concussion", -20, 2, max_s=1.7, phone_gap=-6.0)
def pw_concussion(v, rng):
    # Concussion Shells: a muffled, heavy blast that sucks the air out, then a high tinnitus ring fading away.
    p = pv(v)
    d = 1.7
    blast = lp(_boom(rng, p, 55.0, 1.3), 1400)
    ring = osc(2900 * p, "sine", 1.2) * dsp.env_adsr(1.2, 0.1, 0.3, 0.6, 0.7) * 0.045
    return _cut(room(mixdown(blast, at(0.15, ring)), rng, 0.55, 0.2), d, 0.35)
