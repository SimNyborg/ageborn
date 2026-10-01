"""The MVP pass sounds (audio audit 2026-10-01): the UI ids that played stand-ins (ui-plan 5.4, the War
Path map), the War Council, the stance cues, the Last Base Standing escalation and crumble, the
"Heavy incoming" warning, the Anti-heavy armour crack and the Brace clank, the backdrop thunder, the
VS slam, the Sundial claim, and the energy versions of the fort sounds for the Future and Cosmic forts.

Same rules as `sounds.py`: a mid-band transient so every sound reads on a phone, musical sounds in C,
loudness targets by role (UI ticks -31..-34, UI clicks -27..-30, stamps and unlocks -21..-24, battle
cues with the spawns, the escalation horn with the Siege bell).

Imported at the end of `sounds.py`, so the registry and every helper there are available.
"""
from __future__ import annotations

import numpy as np

from kit import (
    CLAVES, GM, KIT_ORCH, KIT_POWER, SIDE_STICK, SNARE, TOM_H, TOM_HM, TOM_L, TOM_LF, TOM_LM, WOOD_HI, WOOD_LO, at, bell, blip, bp, chime,
    click, cloth, crack, debris, dsp, env_exp, fm_bell, gm_note, gm_notes, grunt, hp, hz, knock, lp, mixdown, mn, n_of, nburst, noise, osc,
    perc, room, rumble, sample, thump, whoosh,
)
from sounds import chord_hit, coin, explosion, pv, sfx

# =================================================================================================
# UI (ui-plan 5.4): replaces the UI_SOUND_FALLBACK stand-ins


@sfx("ui_sheet", -30, 3, hp_hz=200, noisy=True)
def ui_sheet(v, rng):
    # A panel slides up: a soft cloth swish that settles on a felt tap.
    p = pv(v)
    sw = whoosh(rng, 0.16, 500 * p, 1900 * p, 1.1, 0.45) * 0.8
    return mixdown(sw, at(0.02, cloth(rng, 0.12), 0.5), at(0.13, perc(WOOD_LO, 70, pitch=1.1 * p, length=0.05), 0.35))


@sfx("ui_pop", -29, 3, hp_hz=250)
def ui_pop(v, rng):
    # A caption or chip appears: a round bubble "pop" with a tiny upward chirp.
    p = pv(v)
    bloop = osc(dsp.glide(900 * p, 1900 * p, 0.05, 0.7), "sine") * env_exp(0.05, 0.016, 0.001)
    return mixdown(bloop, at(0, sample(GM["woodblock"], 88, 84, 0.1, 0.2, pitch=p, length=0.05), 0.35), at(0.012, blip(2600 * p, 0.03, 0.007), 0.2))


@sfx("ui_whoosh", -30, 3, hp_hz=200, noisy=True)
def ui_whoosh(v, rng):
    # A screen change: an airy swish across the stereo-less centre, brighter at the end.
    p = pv(v)
    return mixdown(whoosh(rng, 0.22, 400 * p, 3200 * p, 1.3, 0.55), at(0.15, blip(1200 * p, 0.04, 0.01), 0.15))


@sfx("ui_stamp", -24, 3, hp_hz=110)
def ui_stamp(v, rng):
    # A claim or equip: a rubber stamp pressed onto paper: a short whoosh in, a firm thud and a slap.
    p = pv(v)
    inn = whoosh(rng, 0.07, 600 * p, 1800 * p, 1.2, 0.8) * 0.35
    thud = mixdown(perc(TOM_LM, 112, KIT_ORCH, pitch=1.05 * p, length=0.18), at(0, thump(150 * p, 75, 0.1, 0.012, 0.035, 2.0, hp_hz=100), 0.6))
    slap = mixdown(crack(rng, 0.03, 900, 4200, 0.006), at(0, knock(900 * p, 0.06, 0.012, rng), 0.5))
    return mixdown(inn, at(0.06, thud), at(0.06, slap, 0.7), at(0.09, chime(hz("G6"), 0.25, 0.07), 0.12))


@sfx("card_lift", -31, 3, hp_hz=250, noisy=True)
def card_lift(v, rng):
    # A card picked up: a quick paper flick and a little lift.
    p = pv(v)
    flick = whoosh(rng, 0.05, 1600 * p, 4200 * p, 1.2, 0.3) * 0.8
    lift = osc(dsp.glide(600 * p, 1100 * p, 0.06, 1.0), "sine") * env_exp(0.06, 0.02, 0.002) * 0.4
    return mixdown(flick, at(0, lift))


@sfx("card_place", -27, 3, hp_hz=150)
def card_place(v, rng):
    # A card set into a slot: a card slap on felt, a soft tom and a C6 tick.
    p = pv(v)
    slap = mixdown(crack(rng, 0.025, 1200, 5000, 0.005), at(0, nburst(rng, 0.05, 400, 2600, 0.015, 0.001, "pink"), 0.6))
    tom = perc(TOM_HM, 96, KIT_ORCH, pitch=1.2 * p, length=0.14)
    return mixdown(slap, at(0, tom, 0.6), at(0.02, chime(hz("C6"), 0.2, 0.05), 0.25))


@sfx("star_stamp", -24, 3, hp_hz=150)
def star_stamp(v, rng):
    # A star stamps onto a node (MR-41): a metal die thunk and a bright E6 bell. Musical: the caller
    # raises the pitch per star, so the variants keep the same note.
    thunk = mixdown(perc(TOM_HM, 110, KIT_ORCH, pitch=1.15, length=0.14), at(0, thump(180, 90, 0.08, 0.01, 0.025, 2.0, hp_hz=120), 0.5), at(0, crack(rng, 0.025, 1200, 4500, 0.005), 0.5))
    ring = mixdown(at(0, fm_bell(hz("E6"), 0.6, 2.0, 1.4, 0.2, 0.03), 0.45), at(0, chime(hz("E6"), 0.5, 0.18), 0.4), at(0.01, chime(hz("B6"), 0.35, 0.1), 0.15))
    sparkle = mixdown(*[at(0.03 + k * 0.03, blip(hz("E7") * (1 + 0.12 * k), 0.05, 0.012), 0.12) for k in range(3)])
    return mixdown(thunk, at(0.005, ring), sparkle)


@sfx("path_draw", -31, 2, hp_hz=300, noisy=True)
def path_draw(v, rng):
    # The road draws itself to the next node: a quill scratching in quick strokes.
    d = 0.42
    grain = lp(hp(noise(d, rng), 900, 2), 9000, 2)
    scratch = grain * (0.4 + 0.6 * np.abs(osc(13 + 3 * v, "sine", d))) * np.clip(np.linspace(0.3, 1.2, n_of(d)), 0, 1)
    body = bp(noise(d, rng), 400, 1400) * 0.5
    return dsp.fade(mixdown(scratch, body) * env_exp(d, 0.35, 0.01), 0.005, 0.06) * 0.9


@sfx("node_drop", -27, 3, hp_hz=150)
def node_drop(v, rng):
    # The next node drops in and its banner is planted: a wooden plonk and a cloth flutter.
    p = pv(v)
    plonk = mixdown(perc(TOM_HM, 104, KIT_ORCH, pitch=1.0 * p, length=0.16), at(0, sample(GM["woodblock"], 72, 100, 0.1, 0.2, pitch=p, length=0.07), 0.6))
    return mixdown(plonk, at(0.05, cloth(rng, 0.16), 0.6), at(0.05, chime(hz("G5"), 0.25, 0.08), 0.15))


@sfx("region_open", -18, 1, max_s=2.2)
def region_open(v, rng):
    # A boss falls and the next region opens (MR-42): a heavy gate creaks open, a brass call answers
    # (C G C' E'), a cymbal swell under the new name. In C, unlike `level_up`.
    creak = bp(noise(0.7, rng), 300, 1400) * (0.5 + 0.5 * np.abs(osc(dsp.glide(18, 7, 0.7), "saw"))) * env_exp(0.7, 0.4, 0.05) * 0.4
    thud = mixdown(perc(TOM_LF, 118, KIT_ORCH, pitch=0.7, length=0.6), at(0, thump(90, 40, 0.4, 0.03, 0.12, 2.2, hp_hz=60), 0.6))
    call = gm_notes(GM["trumpet"], [(0.0, 0.18, mn("C5"), 104), (0.16, 0.12, mn("G4"), 98), (0.26, 0.14, mn("C5"), 104), (0.38, 0.9, mn("E5"), 112)], tail=1.0)
    brass = chord_hit(GM["brass"], 0, ("C4", "G4", "C5"), 0.38, 0.9, 96)
    horn = gm_notes(GM["horn"], [(0.38, 1.0, mn("C4"), 96)], tail=1.0)
    cym = gm_notes(48, [(0.36, 1.0, 57, 96)], drums=True, tail=1.4)
    return mixdown(creak, at(0.0, thud, 0.8), at(0.25, call), at(0.25, brass, 0.55), at(0.25, horn, 0.4), at(0.25, cym, 0.35))


@sfx("ui_unlock", -21, 1, max_s=1.4)
def ui_unlock(v, rng):
    # Something new opens (a tab, a mode, MR-40): a padlock clicks open, then a rising celesta arpeggio
    # and a glass shimmer. Smaller than `level_up`, so the two never sound alike.
    lock = mixdown(perc(CLAVES, 104, pitch=0.9, length=0.04), at(0.05, perc(SIDE_STICK, 100, pitch=1.3, length=0.05), 0.8), at(0.05, knock(1700, 0.05, 0.01), 0.4))
    arp = gm_notes(GM["celesta"], [(0.12 + k * 0.07, 0.3 if k < 3 else 0.7, mn(n), 100) for k, n in enumerate(("C6", "E6", "G6", "C7"))], tail=0.8)
    glock = gm_notes(GM["glock"], [(0.33, 0.6, mn("C7"), 80)], tail=0.8)
    shim = mixdown(*[at(0.33 + k * 0.035, blip(hz("G7") * (1 + 0.07 * k), 0.08, 0.02), 0.08) for k in range(6)])
    return mixdown(lock, at(0, arp), at(0, glock, 0.4), shim, at(0.3, chime(hz("C6"), 0.7, 0.3), 0.3))


@sfx("reward_fly", -29, 3, hp_hz=250, noisy=True)
def reward_fly(v, rng):
    # A reward flies to its tab: a sparkling rising swish that lands on a soft coin tick.
    p = pv(v)
    sw = whoosh(rng, 0.26, 700 * p, 4200 * p, 1.4, 0.7) * 0.6
    sparks = mixdown(*[at(0.04 + k * 0.035, blip(hz("C7") * p * (1 + 0.06 * k), 0.04, 0.01), 0.1) for k in range(6)])
    return mixdown(sw, sparks, at(0.25, coin(hz("G6") * p), 0.35))


@sfx("council_open", -27, 3, hp_hz=150, noisy=True)
def council_open(v, rng):
    # The War Council opens: a parchment unrolls on the table with a low wooden knock.
    p = pv(v)
    unroll = bp(noise(0.22, rng), 900, 5000) * (0.35 + 0.65 * np.abs(osc(dsp.glide(30, 12, 0.22), "saw"))) * env_exp(0.22, 0.12, 0.01) * 0.7
    knock_ = mixdown(perc(WOOD_LO, 100, pitch=0.8 * p, length=0.1), at(0, thump(140 * p, 80, 0.07, 0.01, 0.025), 0.4))
    return mixdown(unroll, at(0.17, knock_, 0.8), at(0.2, chime(hz("C5"), 0.35, 0.12), 0.12))


@sfx("council_pick", -24, 3, hp_hz=110)
def council_pick(v, rng):
    # A research picked: a wax seal pressed onto the order, and a low fifth (C4 G4) from a horn.
    p = pv(v)
    seal = mixdown(perc(TOM_LM, 116, KIT_ORCH, pitch=0.95 * p, length=0.2), at(0, thump(130 * p, 65, 0.12, 0.015, 0.04, 2.0, hp_hz=90), 0.6), at(0, crack(rng, 0.03, 800, 3800, 0.007), 0.5))
    horn = lp(gm_notes(GM["horn"], [(0, 0.35, mn("C4"), 92), (0, 0.35, mn("G4"), 86)], tail=0.6), 3000)
    return mixdown(seal, at(0.05, horn, 0.5), at(0.04, chime(hz("G5"), 0.3, 0.1), 0.2))


@sfx("vs_slam", -21, 2, hp_hz=60, phone_gap=-6.0)
def vs_slam(v, rng):
    # The VS plates meet: a quick whoosh in, a heavy slam, a metallic ring and a little dust.
    p = pv(v)
    inn = whoosh(rng, 0.16, 300 * p, 2400 * p, 1.4, 0.85) * 0.5
    slam = mixdown(perc(TOM_LF, 124, KIT_ORCH, pitch=0.75 * p, length=0.5), at(0, thump(100 * p, 42, 0.35, 0.025, 0.1, 2.4, hp_hz=55), 0.8), at(0, perc(SNARE, 118, KIT_POWER, pitch=0.7 * p, length=0.3), 0.5))
    ring = bell(330 * p, 0.8, 0.8, 0.25, ((1, 1.0), (2.41, 0.5), (3.9, 0.3), (5.27, 0.2)))
    return room(mixdown(inn, at(0.15, slam), at(0.15, crack(rng, 0.05, 700, 3500, 0.012), 0.7), at(0.16, ring, 0.25), at(0.17, debris(rng, 0.3, 80, 600, 3500, 0.1, 0.01), 0.3)), rng, 0.4, 0.16)


@sfx("sundial_claim", -24, 2, hp_hz=200)
def sundial_claim(v, rng):
    # A Sundial Capsule is claimed: a warm glass chime climbing like a sunbeam (C E G C') over a
    # soft brass swell, with a clock tick on top.
    tick = mixdown(perc(CLAVES, 92, pitch=1.4, length=0.03), at(0.12, perc(CLAVES, 86, pitch=1.2, length=0.03), 0.7))
    arp = mixdown(*[at(0.1 + k * 0.08, chime(hz(n), 0.6, 0.25), 0.45) for k, n in enumerate(("C6", "E6", "G6", "C7"))])
    pad = gm_notes(GM["warm_pad"], [(0.1, 0.6, mn("C4"), 70), (0.1, 0.6, mn("G4"), 64)], tail=0.6) * 0.5
    return mixdown(tick, arp, at(0, pad, 0.6), at(0.4, coin(hz("G6")), 0.25))


@sfx("glyph_light", -30, 2, hp_hz=300)
def glyph_light(v, rng):
    # A Home glyph lights up: a soft shimmer ping (G6 over C6).
    return mixdown(chime(hz("C6"), 0.4, 0.12), at(0.04, chime(hz("G6"), 0.5, 0.15), 0.7), at(0.02, fm_bell(hz("C7"), 0.3, 2.0, 1.0, 0.08, 0.02), 0.2))


# =================================================================================================
# Battle cues


@sfx("stance_charge", -23, 3, hp_hz=90)
def stance_charge(v, rng):
    # Charge: two war-drum strokes, a brass stab up a fifth (C4 to G4) and a short "hup!" from the line.
    p = pv(v)
    drums = mixdown(perc(TOM_LF, 122, KIT_ORCH, pitch=0.85 * p, length=0.3), at(0.11, perc(TOM_L, 126, KIT_ORCH, pitch=0.9 * p, length=0.35)), at(0, thump(110 * p, 55, 0.2, 0.02, 0.07, 2.2, hp_hz=70), 0.5))
    stab = gm_notes(GM["brass"], [(0.1, 0.12, mn("C4"), 112), (0.1, 0.12, mn("G3"), 104), (0.22, 0.32, mn("G4"), 118), (0.22, 0.32, mn("D4"), 108)], tail=0.5)
    shout = mixdown(*[at(0.22 + 0.01 * k, hp(grunt(rng, [210, 185, 240][k] * p, 0.16, "a", 1.4), 300, 2), 0.35) for k in range(3)])
    return mixdown(drums, at(0, stab, 0.8), shout)


@sfx("stance_hold", -24, 3, hp_hz=100)
def stance_hold(v, rng):
    # Hold: shields locked: one heavy metal clank, a low drum and the scrape of planted feet.
    p = pv(v)
    clank = mixdown(bell(520 * p, 0.35, 0.8, 0.08, ((1, 1.0), (2.41, 0.6), (3.9, 0.35), (5.27, 0.2))), at(0, perc(SIDE_STICK, 120, pitch=0.8 * p, length=0.06), 0.7), at(0, crack(rng, 0.03, 1200, 5000, 0.006), 0.5))
    drum = mixdown(perc(TOM_L, 118, KIT_ORCH, pitch=0.8 * p, length=0.3), at(0, thump(120 * p, 60, 0.15, 0.015, 0.05, 2.0, hp_hz=80), 0.5))
    scrape = nburst(rng, 0.18, 250, 2200, 0.07, 0.01, "pink") * 0.4
    return mixdown(at(0, drum, 0.8), at(0.02, clank, 0.8), at(0.05, scrape))


@sfx("stance_fallback", -25, 3, hp_hz=120)
def stance_fallback(v, rng):
    # Fall back: a short bugle call falling G4 E4 C4, soft, over a muffled drum.
    p = pv(v) ** 0.2
    call = gm_notes(GM["trumpet"], [(0, 0.12, mn("G4"), 100), (0.13, 0.12, mn("E4"), 96), (0.26, 0.38, mn("C4"), 98)], tail=0.6)
    drum = perc(TOM_LM, 96, KIT_ORCH, pitch=0.85 * p, length=0.2)
    return mixdown(lp(call, 3600), at(0.26, drum, 0.45))


@sfx("research_done", -23, 2, hp_hz=120)
def research_done(v, rng):
    # A Council research finishes: an anvil ping and a bright C E G answer, small and proud.
    anvil = mixdown(bell(1180, 0.5, 1.0, 0.12, ((1, 1.0), (2.76, 0.5), (5.4, 0.25))), at(0, perc(SIDE_STICK, 118, pitch=1.1, length=0.06), 0.5), at(0, thump(200, 110, 0.06, 0.01, 0.02, hp_hz=140), 0.3))
    arp = gm_notes(GM["glock"], [(0.08 + k * 0.07, 0.4, mn(n), 96) for k, n in enumerate(("C6", "E6", "G6"))], tail=0.6)
    brass = chord_hit(GM["brass"], 0, ("C4", "E4", "G4"), 0.22, 0.4, 86)
    return mixdown(anvil, at(0, arp, 0.7), at(0, brass, 0.35), at(0.22, chime(hz("C6"), 0.5, 0.2), 0.3))


@sfx("alert_heavy", -23, 2, hp_hz=70, phone_gap=-6.0)
def alert_heavy(v, rng):
    # "Heavy incoming": two ground-shaking footfalls and a low horn blast (C3 with its octave): weight
    # coming, unlike the base alarm's bells.
    steps = mixdown(*[at(k * 0.28, mixdown(perc(TOM_LF, 120, KIT_ORCH, pitch=0.6, length=0.4), at(0, thump(70, 34, 0.3, 0.03, 0.1, 2.6, hp_hz=50), 0.8), at(0, debris(rng, 0.2, 60, 400, 2500, 0.06, 0.01), 0.25)), 0.9 - 0.1 * k) for k in range(2)])
    horn = lp(gm_notes(GM["trombone"], [(0.1, 0.55, mn("C3"), 112), (0.1, 0.55, mn("C2") + 12, 100)], tail=0.5), 2800)
    return mixdown(steps, at(0.05, horn, 0.6))


@sfx("hit_armor_crack", -25, 3, noisy=True)
def hit_armor_crack(v, rng):
    # The Anti-heavy ×3 layer: armour plate cracking open, a metallic splinter on top of the hit.
    p = pv(v)
    plate = bell(880 * p, 0.25, 1.0, 0.05, ((1, 1.0), (1.73, 0.7), (2.9, 0.5), (4.6, 0.35)))
    split = mixdown(crack(rng, 0.06, 1500, 7000, 0.012), at(0.008, crack(rng, 0.05, 900, 4000, 0.01), 0.7))
    crunch = mixdown(perc(SNARE, 120, KIT_POWER, pitch=0.8 * p, length=0.16), at(0, debris(rng, 0.12, 300, 1500, 6000, 0.04, 0.003), 0.6))
    return mixdown(split, at(0, plate, 0.45), at(0, crunch, 0.6))


@sfx("brace_clank", -26, 3, hp_hz=110)
def brace_clank(v, rng):
    # A Heavy runs into a braced line: a shield clank, a heave and grit as the feet hold.
    p = pv(v)
    clank = mixdown(bell(610 * p, 0.25, 0.9, 0.06, ((1, 1.0), (2.41, 0.55), (3.9, 0.3))), at(0, perc(SIDE_STICK, 116, pitch=0.9 * p, length=0.05), 0.6))
    heave = thump(150 * p, 80, 0.12, 0.012, 0.04, 2.0, hp_hz=100)
    grit = nburst(rng, 0.2, 250, 2000, 0.08, 0.01, "pink") * 0.45
    return mixdown(clank, at(0, heave, 0.6), at(0.02, grit))


@sfx("thunder", -22, 3, max_s=3.2, phone_gap=-6.0)
def thunder(v, rng):
    # Thunderstorm lightning: a close crack, then the roll rumbling off. Each variant rolls differently.
    p = pv(v)
    d = 3.0
    snap = mixdown(crack(rng, 0.12, 600, 5000, 0.04), at(0.01, nburst(rng, 0.3, 200, 3000, 0.1, 0.002, "pink"), 0.8))
    roll = rumble(rng, d, 220 * p, 1.1, 0.04)
    # the roll swells in a few lumps, like thunder bouncing off hills
    lumps = np.ones(n_of(d))
    for k in range(4):
        c = n_of(0.25 + 0.55 * k + rng.uniform(0, 0.2))
        w = n_of(0.35)
        lumps[c : c + w] += np.hanning(min(w, len(lumps) - c)) * (0.8 - 0.15 * k)
    body = roll * lumps[: len(roll)] * 1.1
    crackl = debris(rng, 1.2, 40, 300, 2500, 0.5, 0.02) * 0.35
    return room(mixdown(snap, at(0.02, body), at(0.05, crackl)), rng, 0.8, 0.25)


@sfx("escalate_horn", -19, 1, max_s=2.0)
def escalate_horn(v, rng):
    # Last Base Standing: each escalation step sounds this war horn (C3 with a fifth, a taiko under it);
    # the game raises its pitch a step at a time, so the steps climb. Musical: one variant, fixed note.
    horn = gm_notes(GM["horn"], [(0, 1.2, mn("C3"), 118), (0, 1.2, mn("G3"), 104)], tail=0.6)
    bone = gm_notes(GM["trombone"], [(0.05, 1.1, mn("C3"), 110)], tail=0.6)
    taiko = hp(gm_notes(GM["taiko"], [(0, 0.3, 50, 127), (0.32, 0.3, 50, 112)], tail=0.8), 60)
    swell = np.clip(np.linspace(0.4, 2.2, n_of(1.6)), 0, 1)
    return mixdown(dsp.pad_to(horn, n_of(1.6)) * swell, at(0, dsp.pad_to(bone, n_of(1.6)) * swell, 0.6), at(0, taiko, 0.8))


@sfx("crumble_pulse", -25, 3, hp_hz=60, phone_gap=-6.0)
def crumble_pulse(v, rng):
    # The crumbling base's beat: a deep stone groan and a trickle of grit from its top.
    p = pv(v)
    groan = bp(noise(0.5, rng), 90 * p, 420 * p) * env_exp(0.5, 0.22, 0.05) * 1.4
    thud = mixdown(perc(TOM_LF, 110, KIT_ORCH, pitch=0.6 * p, length=0.4), at(0, thump(80 * p, 38, 0.3, 0.03, 0.1, 2.4, hp_hz=50), 0.7))
    trickle = debris(rng, 0.6, 70, 500, 3200, 0.25, 0.015) * 0.6
    return mixdown(at(0, groan), at(0.02, thud, 0.8), at(0.1, trickle), at(0.02, crack(rng, 0.05, 500, 2500, 0.015), 0.5))


# =================================================================================================
# Energy forts (Future and Cosmic): the fort sounds are material-first, so the hardlight walls,
# warp barracks and void mines get their own instead of mallets, horns and tent flaps


@sfx("fort_build_energy", -26, 3, noisy=True)
def fort_build_energy(v, rng):
    # A field projector building up: three rising zap pulses over a charging hum.
    p = pv(v)
    d = 0.6
    hum = osc(dsp.glide(110 * p, 220 * p, d, 1.0), "saw")
    hum = lp(hum, 1800) * env_exp(d, 0.5, 0.05) * 0.35
    zaps = [at(k * 0.17, osc(dsp.drop(900 * p * (1 + 0.15 * k), 500 * p, 0.08, 0.02), "sine") * env_exp(0.08, 0.03, 0.001), 0.6) for k in range(3)]
    fizz = bp(noise(d, rng), 2000, 7000) * (0.5 + 0.5 * np.abs(osc(55, "square", d))) * env_exp(d, 0.3, 0.02) * 0.25
    return mixdown(hum, fizz, *zaps, at(0, click(rng, 0.006, 1500, 7000), 0.5))


@sfx("camp_warp", -26, 3, hp_hz=150)
def camp_warp(v, rng):
    # The warp barracks musters: a two-tone synth call (G4 to C5) with a shimmer, not a horn.
    a = osc(hz("G4"), "square", 0.14) * env_exp(0.14, 0.1, 0.004)
    b = osc(hz("C5"), "square", 0.3) * env_exp(0.3, 0.18, 0.004)
    call = lp(mixdown(a, at(0.13, b)), 2600) * 0.5
    shim = fm_bell(hz("C6"), 0.4, 1.41, 1.5, 0.15, 0.03) * 0.25
    return mixdown(call, at(0.13, shim), at(0, click(rng, 0.005, 1500, 6000), 0.3))


@sfx("levy_warp", -29, 3, noisy=True)
def levy_warp(v, rng):
    # A cloned or warped levy steps out: a rising shimmer and a soft landing blip.
    p = pv(v)
    rise = osc(dsp.glide(500 * p, 1600 * p, 0.14, 1.4), "sine") * env_exp(0.14, 0.08, 0.02) * 0.6
    sparkle = bp(noise(0.14, rng), 3000, 9000) * env_exp(0.14, 0.06, 0.03) * 0.3
    land = thump(170 * p, 95, 0.05, 0.008, 0.018, 1.8, hp_hz=110) * 0.5
    return mixdown(rise, sparkle, at(0.12, land), at(0, click(rng, 0.004, 2000, 7000), 0.3))


@sfx("trap_blast_energy", -20, 3, noisy=True, phone_gap=-6.0)
def trap_blast_energy(v, rng):
    # A void mine or grav mire going off: a sucking reverse swell, an implosion thump and a zap tail.
    p = pv(v)
    suck = whoosh(rng, 0.18, 3000 * p, 300 * p, 1.6, 0.9) * 0.6
    boom = thump(90 * p, 34, 0.45, 0.04, 0.12, 2.6, hp_hz=50)
    zap = osc(dsp.drop(1600 * p, 200 * p, 0.3, 0.06), "saw") * env_exp(0.3, 0.1, 0.001)
    zap = lp(zap, 4000) * 0.4
    crackl = bp(noise(0.5, rng), 1500, 7000) * (0.5 + 0.5 * np.abs(osc(35, "square", 0.5))) * env_exp(0.5, 0.15, 0.001) * 0.4
    return room(mixdown(suck, at(0.17, boom, 0.9), at(0.17, zap), at(0.17, crackl), at(0.17, crack(rng, 0.05, 700, 3500, 0.015), 0.6)), rng, 0.4, 0.18)
