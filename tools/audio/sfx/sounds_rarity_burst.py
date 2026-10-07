"""The rarity burst (DESIGN A10 step 5a, A13; owner request 2026-10-07): when a Rare, Epic or Legendary
card's rarity is revealed, the card explodes in its rarity colour. The sound scales with the rarity:

- `rarity_riser`: the rising tone under an Epic or Legendary pre-signal. Exactly 0.9 s from the first
  sample and peaking on its last one; the plan pitches it so it lands on the pop.
- `rarity_burst_rare`: a small pop (a punchy knock and a bright two-note glint).
- `rarity_burst_epic`: a strong burst (a deep boom, a blast, a bright celesta-and-glass shimmer, a string
  swell).
- `rarity_burst_legendary`: a big explosion (a sub boom, timpani and a blast, a cymbal crash, a shimmer
  cascade, and a choir-and-brass sting on C major).

Musical layers are in C, like the rarity reveals. Imported at the end of `sounds.py`.
"""
from __future__ import annotations

import numpy as np

from kit import GM, KIT_ORCH, TOM_LF, at, bell, blip, bp, crack, debris, dsp, env_exp, fade, gm_note, gm_notes, hz, lp, mixdown, mn, n_of, nburst, noise, osc, perc, room, rumble, sample, thump, whoosh
from sounds import chord_hit, glass_bell, sfx


def _sparkle(rng, dur: float, count: int, root: str = "C7", vol: float = 0.5) -> np.ndarray:
    """A falling glitter of tiny bell blips on the C major pentatonic, thinning out."""
    out = np.zeros(n_of(dur + 0.2))
    for k in range(count):
        t0 = rng.uniform(0, dur) ** 1.4 / dur ** 0.4
        f = hz(root) * 2 ** (rng.choice([0, 2, 4, 7, 9, 12]) / 12)
        g = blip(f, 0.14, 0.04) * (1.0 - t0 / (dur + 0.2)) * vol
        i = n_of(t0)
        e = min(len(out), i + len(g))
        out[i:e] += g[: e - i]
    return out


@sfx("rarity_riser", -22, 1, max_s=0.9, timed=True)
def rarity_riser(v, rng):
    # Air sweeping up, a reverse cymbal, a gliding saw and an accelerating glock trill: all peak on the
    # last sample, where the burst hits.
    d = 0.9
    rise = np.linspace(0, 1, n_of(d)) ** 2.2
    air = dsp.sweep_bp(noise(d, rng, "pink"), dsp.glide(500, 7000, d, 0.7), 1.6) * rise * 1.3
    rev = sample(GM["reverse_cymbal"], 60, 110, d, 0.0, pitch=1.6, length=d)
    rev = rev[: n_of(d)] if len(rev) >= n_of(d) else np.pad(rev, (0, n_of(d) - len(rev)))
    saw = lp(osc(dsp.glide(110, 440, d, 1.4), "saw"), 2400) * rise * 0.35
    trill_notes = []
    t = 0.25
    k = 0
    while t < d - 0.03:
        trill_notes.append((t, 0.06, mn(["G5", "C6", "E6", "G6"][k % 4]) + (12 if t > 0.6 else 0), int(46 + 60 * t)))
        t += max(0.035, 0.11 - 0.09 * t)
        k += 1
    trill = gm_notes(GM["glock"], trill_notes, tail=0.2)[: n_of(d)]
    trill = np.pad(trill, (0, max(0, n_of(d) - len(trill))))
    x = mixdown(air, at(0, rev, 0.6), at(0, saw), at(0, trill, 0.45))[: n_of(d)]
    return fade(x, 0.05, 0.004)


@sfx("rarity_burst_rare", -21, 2, max_s=1.0)
def rarity_burst_rare(v, rng):
    # A small pop: a punchy knock and crack, then a bright glint (G6 and C7) with a short sparkle.
    p = [1.0, 1.02][v % 2]
    pop = mixdown(thump(170 * p, 70, 0.18, 0.015, 0.05, 2.0), at(0, crack(rng, 0.04, 1200, 6000, 0.01), 0.7), at(0, nburst(rng, 0.08, 800, 5000, 0.02), 0.5))
    glint = mixdown(at(0, bell(hz("G6"), 0.6, 0.6, 0.22), 0.5), at(0.05, bell(hz("C7"), 0.6, 0.6, 0.25), 0.45))
    cel = gm_notes(GM["celesta"], [(0.0, 0.25, mn("G6"), 92), (0.05, 0.35, mn("C7"), 96)], tail=0.6)
    return room(mixdown(pop, at(0.005, glint), at(0.005, cel, 0.5), at(0.04, _sparkle(rng, 0.35, 8, vol=0.3))), rng, 0.35, 0.16)


@sfx("rarity_burst_epic", -18, 2, max_s=1.9, phone_gap=-6.0)
def rarity_burst_epic(v, rng):
    # A strong burst: a deep boom with a blast and debris, then a violet-bright shimmer (a fast celesta
    # arpeggio, glass bells) over a short string swell.
    p = [1.0, 0.98][v % 2]
    boom = mixdown(thump(120 * p, 40, 0.6, 0.03, 0.18, 2.4, hp_hz=50), at(0, sample(GM["gunshot"], 60, 127, 0.3, 0.8, pitch=0.5 * p, length=0.6), 0.6))
    blast = mixdown(nburst(rng, 0.45, 300, 3000, 0.09, 0.001, "pink") * 1.1, at(0, crack(rng, 0.06, 700, 4000, 0.02), 0.6), at(0.01, debris(rng, 0.5, 160, 1500, 6000, 0.2, 0.008), 0.35))
    timp = gm_note(GM["timpani"], mn("C2"), 0.6, 120, 1.0)
    arp = gm_notes(GM["celesta"], [(0.02 + k * 0.045, 0.5, mn(n), 100) for k, n in enumerate(("C6", "E6", "G6", "C7", "E7"))], tail=0.9)
    glass = mixdown(*[at(0.02 + k * 0.03, glass_bell(hz(n), 1.2, 0.5, 0.7), g) for k, (n, g) in enumerate((("G5", 0.35), ("C6", 0.35), ("E6", 0.3)))])
    swell = chord_hit(GM["strings"], 0, ("C4", "G4", "E5"), 0.0, 0.8, 92)
    sheen = whoosh(rng, 0.6, 2500, 8000, 2.0, 0.4) * 0.25
    return room(mixdown(boom, at(0, blast, 0.8), at(0, timp, 0.5), at(0.01, arp, 0.55), at(0.01, glass), at(0, swell, 0.35), at(0.03, sheen), at(0.08, _sparkle(rng, 0.9, 18, vol=0.35))), rng, 0.6, 0.22)


@sfx("rarity_burst_legendary", -15, 1, max_s=3.2, phone_gap=-6.0)
def rarity_burst_legendary(v, rng):
    # A big explosion: a sub boom, timpani and a pitched-down blast with a long rumble, a cymbal crash, a
    # glittering shimmer cascade, and a choir-and-brass sting (C major) that rings out.
    boom = mixdown(
        thump(100, 28, 1.3, 0.05, 0.4, 2.6, harm=0.5, hp_hz=40),
        at(0, sample(GM["gunshot"], 60, 127, 0.4, 1.2, pitch=0.38, length=1.0), 0.7),
        at(0, gm_notes(GM["timpani"], [(0, 1.0, mn("C2"), 127), (0, 1.0, mn("G2"), 110)], tail=1.2), 0.6),
        at(0, perc(TOM_LF, 127, KIT_ORCH, pitch=0.6, length=0.8), 0.4),
    )
    blast = mixdown(nburst(rng, 0.7, 250, 3000, 0.15, 0.001, "pink") * 1.2, at(0, crack(rng, 0.08, 600, 3600, 0.025), 0.7), at(0, rumble(rng, 1.4, 220, 0.5, 0.01), 0.6), at(0.02, debris(rng, 0.8, 140, 1200, 6000, 0.3, 0.01), 0.3))
    crash = gm_notes(48, [(0.0, 1.6, 49, 120), (0.0, 1.6, 57, 100)], drums=True, tail=1.6)
    choir = gm_notes(GM["choir"], [(0.03, 1.4, mn(n), 104) for n in ("C4", "G4", "C5", "E5", "G5")], tail=1.2)
    brass = gm_notes(GM["brass"], [(0.03, 0.9, mn(n), 112) for n in ("C4", "E4", "G4", "C5")], tail=1.0)
    trumpet = gm_notes(GM["trumpet"], [(0.03, 0.12, mn("G5"), 112), (0.17, 1.0, mn("C6"), 118)], tail=1.0)
    horn = gm_notes(GM["horn"], [(0.03, 1.1, mn("C3"), 110), (0.03, 1.1, mn("G3"), 104)], tail=1.0)
    casc = gm_notes(GM["glock"], [(0.05 + k * 0.04, 0.6, mn(n), 100 - 2 * k) for k, n in enumerate(("C7", "G6", "E6", "C6", "G6", "C7", "E7"))], tail=1.0)
    bells = mixdown(at(0.02, bell(hz("C6"), 2.0, 0.9, 0.8), 0.35), at(0.04, glass_bell(hz("G6"), 1.6, 0.7, 0.7), 0.3))
    shimmer = bp(noise(2.2, rng, "pink"), 5000, 11000) * env_exp(2.2, 0.8, 0.05) * 0.12
    x = mixdown(
        boom,
        at(0, blast, 0.8),
        at(0, crash, 0.45),
        at(0, choir, 0.6),
        at(0, brass, 0.55),
        at(0, trumpet, 0.5),
        at(0, horn, 0.4),
        at(0.02, casc, 0.4),
        at(0, bells),
        at(0.04, shimmer),
        at(0.2, _sparkle(rng, 1.8, 34, vol=0.4)),
    )
    return room(x, rng, 0.85, 0.26)
