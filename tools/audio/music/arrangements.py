"""Per-age arrangements of "Dawn March" (DESIGN A13 Music, A14.3), as General MIDI parts.

Every battle cue is the same 44-bar form at 110 BPM (96 s): a 4-bar groove intro, the 16-bar theme,
a 12-bar B-theme (the motif on vi and IV), an 8-bar breakdown (drums, bass and ostinato, no melody)
and a 4-bar turnaround. All ages share the form, so an evolve can cross-fade to the next age at the
same bar and the music carries on in new instruments. Each age sits in its evolve key (A13 key changes +2, +2, +1, +1: C, D, E, F, F#), so
the key lifts with every evolve even though the files are fixed recordings.

A `Part` is one instrument: its notes (in beats, one pass of the loop) and its mix settings. `rel`
is the part's loudness relative to the lead line in LU; the renderer measures every stem and sets its
gain from that, so the balance does not depend on how loud a soundfont sample happens to be.
"""
from __future__ import annotations

import sys
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "lib"))
from gm import Track  # noqa: E402
from theme import (  # noqa: E402
    B2_MELODY,
    B2_START,
    BPM,
    BREAK_START,
    HARMONY,
    LOOP_BARS,
    LOOP_CHORDS,
    MENU_HARMONY,
    MENU_MELODY,
    OUTRO_START,
    THEME_START,
    bars_notes,
    diatonic_below,
    m,
    melody_notes,
    root,
    voicing,
)

# GM programs used below.
P = dict(
    celesta=8, glock=9, musicbox=10, marimba=12, nylon=24, overdrive_gtr=29, synth_bass1=38, synth_bass2=39,
    cello=42, contrabass=43, tremolo=44, pizz=45, harp=46, timpani=47, strings=48, strings2=49, synth_strings=50,
    choir=52, oohs=53, orch_hit=55, trumpet=56, trombone=57, tuba=58, horn=60, brass=61, clarinet=71,
    piccolo=72, flute=73, recorder=74, panflute=75, shakuhachi=77, ocarina=79, square=80, saw=81,
    warm_pad=89, taiko=116,
)
KIT_STANDARD, KIT_ROOM, KIT_POWER, KIT_ELECTRONIC, KIT_808, KIT_ORCH = 0, 8, 16, 24, 25, 48

# GM drum notes.
KICK, RIM, SNARE, CLAP, SNARE2 = 36, 37, 38, 39, 40
TOM_LF, HAT, TOM_HF, PEDAL, TOM_L, OPEN_HAT, TOM_LM, TOM_HM, CRASH, TOM_H, RIDE = 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51
TAMB, CRASH2, BONGO_H, BONGO_L, CONGA_MUTE, CONGA_OPEN, CONGA_LOW = 54, 57, 60, 61, 62, 63, 64
MARACAS, CLAVES, WOOD_H, WOOD_L, TRIANGLE_OPEN, SHAKER = 70, 75, 76, 77, 81, 82


@dataclass
class Part:
    track: Track
    rel: float = -6.0  # loudness relative to the lead, LU
    pan: float = 0.0
    send: float = 0.2  # reverb send (linear)
    hp: float = 40.0
    lp: float | None = None
    eq: list[tuple[float, float, float]] = field(default_factory=list)  # (Hz, dB, Q)
    pump: float = 0.0  # side-chain pump depth 0..1 (Future)
    width: float = 1.0  # 0 = mono, 1 = as rendered
    lead: bool = False  # the reference part for `rel`
    swing_ms: float = 6.0  # humanize timing spread (ms, +-)
    vel_jitter: int = 5
    # Ducks the part under another instrument's hits: (beats within every bar, depth 0..1). Stone uses
    # it to thin the contrabass under the big taiko strokes.
    duck: tuple[tuple[float, ...], float] | None = None


@dataclass
class Arrangement:
    cue: str
    bpm: float
    bars: int
    parts: list[Part]
    loop: bool = True
    reverb_s: float = 1.8
    reverb_damp: float = 6000
    reverb_wet: float = 0.22
    target_lufs: float = -16.0
    tail_s: float = 3.0
    air_db: float = 1.0  # master high shelf at 9 kHz (only acts where there is content up there)
    presence_db: float = 0.0  # master bell at 3.5 kHz (Q 0.7)
    low_db: float = 0.0  # master low shelf at 110 Hz
    ceiling_db: float = -1.5  # limiter ceiling (stems lower: low-bitrate Opus overshoots on transients)
    extras: list = field(default_factory=list)  # numpy-made parts: callables (seconds_per_pass, passes) -> stereo array


def t(name: str, program: int, drums: bool = False) -> Track:
    return Track(name, program, drums=drums)


def bar(b: int) -> float:
    return b * 4.0


def chord_at(b: int) -> str:
    return LOOP_CHORDS[b % LOOP_BARS]


def accent(beat: float) -> int:
    """Musical accent: strong on 1, medium on 3, softer elsewhere."""
    pos = beat % 4
    return 8 if pos == 0 else 4 if pos == 2 else 0 if pos in (1, 3) else -6


def add_melody(tr: Track, key: int, bars: range, octave: int = 0, vel: int = 92, legato: float = 0.96, start_bar: int = THEME_START) -> None:
    for beat, dur, n in melody_notes(start_bar, octave, bars):
        tr.add(beat, dur * legato, n + key, vel + accent(beat))


def add_harmony_third(tr: Track, key: int, bars: range, octave: int = 0, vel: int = 76, start_bar: int = THEME_START) -> None:
    for beat, dur, n in melody_notes(start_bar, octave, bars):
        tr.add(beat, dur * 0.95, diatonic_below(n, 2) + key, vel + accent(beat) // 2)


def add_b2(tr: Track, key: int, bars: range = range(12), octave: int = 0, vel: int = 92, legato: float = 0.95, third: bool = False) -> None:
    """The B-theme (bars 20-31 of the loop); `third` plays the diatonic third below instead."""
    for beat, dur, n in bars_notes(B2_MELODY, B2_START, octave, bars):
        tr.add(beat, dur * legato, (diatonic_below(n, 2) if third else n) + key, vel + (accent(beat) // 2 if third else accent(beat)))


def add_pad(tr: Track, key: int, bars: range, low: int, vel: int = 64, count: int | None = None, beats: float = 4.0) -> None:
    for b in bars:
        for k in range(int(4 / beats)):
            for n in voicing(chord_at(b), low + 0, count):
                tr.add(bar(b) + k * beats, beats * 0.98, n + key, vel)


def add_roots(tr: Track, key: int, bars: range, octave: int, pattern: list[tuple[float, float, int, int]]) -> None:
    """pattern: (beat, beats, interval above root, velocity)."""
    for b in bars:
        r = root(chord_at(b), octave)
        for beat, dur, iv, v in pattern:
            tr.add(bar(b) + beat, dur, r + iv + key, v)


def add_arp(tr: Track, key: int, bars: range, octave: int, steps: list[int], step_beats: float, vel: tuple[int, int] = (62, 78), dur: float | None = None) -> None:
    """Arpeggio over the chord: `steps` index into [R, 3, 5, R+12, 3+12, 5+12, R+24]."""
    for b in bars:
        ch = chord_at(b)
        r = root(ch, octave)
        v = voicing(ch, r)
        pool = [v[0], v[1], v[2], v[0] + 12, v[1] + 12, v[2] + 12, v[0] + 24]
        for k, s in enumerate(steps):
            beat = bar(b) + k * step_beats
            if beat >= bar(b + 1):
                break
            tr.add(beat, dur if dur is not None else step_beats * 1.8, pool[s] + key, vel[0] if k % 2 else vel[1])


def drum_pattern(tr: Track, bars: range, hits: list[tuple[float, int, int]]) -> None:
    """hits: (beat within the bar, drum note, velocity)."""
    for b in bars:
        for beat, note, v in hits:
            tr.add(bar(b) + beat, 0.25, note, v)


def grid16(tr: Track, bars: range, note: int, vels: list[int], start: float = 0.0) -> None:
    for b in bars:
        for k, v in enumerate(vels):
            if v > 0:
                tr.add(bar(b) + start + k * 0.25, 0.2, note, v)


def roll(tr: Track, b: int, note: int, from_beat: float, to_beat: float, v0: int, v1: int, step: float = 0.25) -> None:
    k = 0
    n = int(round((to_beat - from_beat) / step))
    while k < n:
        tr.add(bar(b) + from_beat + k * step, step * 0.9, note, int(v0 + (v1 - v0) * k / max(1, n - 1)))
        k += 1


def calls(tr: Track, key: int, phrase: list[tuple[int, float, float, str]], octave: int = 0, vel: int = 84) -> None:
    """Free phrases: (bar, beat, beats, note name)."""
    for b, beat, dur, name in phrase:
        tr.add(bar(b) + beat, dur * 0.95, m(name) + 12 * octave + key, vel + accent(beat) // 2)


INTRO_CALL = [(0, 0, 1, "C5"), (0, 1, 0.5, "G4"), (0, 1.5, 0.5, "C5"), (0, 2, 2, "E5"),
              (1, 0, 1, "F5"), (1, 1, 1, "E5"), (1, 2, 2, "C5"),
              (2, 0, 1.5, "A4"), (2, 1.5, 0.5, "C5"), (2, 2, 2, "E5"),
              (3, 0, 2, "D5"), (3, 2, 1, "B4"), (3, 3, 1, "G4")]
_O = OUTRO_START
OUTRO_CALL = [(_O, 0, 1.5, "E5"), (_O, 1.5, 0.5, "D5"), (_O, 2, 1, "C5"), (_O, 3, 1, "A4"),
              (_O + 1, 0, 1.5, "F5"), (_O + 1, 1.5, 0.5, "E5"), (_O + 1, 2, 1, "C5"), (_O + 1, 3, 1, "A4"),
              (_O + 2, 0, 1, "D5"), (_O + 2, 1, 1, "F5"), (_O + 2, 2, 2, "A5"),
              (_O + 3, 0, 3, "G5")]

ALL = range(0, LOOP_BARS)
THEME = range(THEME_START, THEME_START + 16)
B2 = range(B2_START, BREAK_START)
BRK = range(BREAK_START, OUTRO_START)
OUT = range(OUTRO_START, LOOP_BARS)
NOBRK = [b for b in ALL if b not in BRK]  # pads and harmony rest in the breakdown
A_BARS = range(0, 8)  # theme-relative bar indices
B_BARS = range(8, 12)
A3_BARS = range(12, 16)
FILL_BARS = [3, 11, 19, 31, 39, 43]  # drum fill into the next section
DOWNBEATS = (4, 12, 16, 20, 28, 32, 40)  # section starts (crash, timpani)
HOT = [b for b in ALL if b >= THEME_START and b not in BRK]  # full-groove bars


def loop_bars(theme_rel: range) -> range:
    return range(THEME_START + theme_rel.start, THEME_START + theme_rel.stop)


PAD_EQ = [(300, -3.0, 1.0)]  # every pad and string part: clear the 300 Hz build-up


# ------------------------------------------------------------------------------------------------
# Stone: drums, bone flutes, low strings (key C)


def stone(key: int = 0) -> Arrangement:
    flute = t("panflute", P["panflute"])
    add_melody(flute, key, range(0, 16), vel=96)
    add_b2(flute, key, range(8, 12), vel=94)
    shaku = t("shakuhachi", P["shakuhachi"])
    calls(shaku, key, INTRO_CALL, octave=-1, vel=88)
    add_b2(shaku, key, range(0, 8), octave=-1, vel=94)
    calls(shaku, key, OUTRO_CALL, octave=-1, vel=88)
    ocarina = t("ocarina", P["ocarina"])
    add_harmony_third(ocarina, key, B_BARS, vel=74)
    add_harmony_third(ocarina, key, A3_BARS, vel=66)
    add_b2(ocarina, key, range(8, 12), vel=70, third=True)
    oohs = t("oohs", P["oohs"])
    add_pad(oohs, key, loop_bars(A3_BARS), 60, vel=70)
    add_pad(oohs, key, range(B2_START + 8, BREAK_START), 60, vel=66)
    strings = t("low strings", P["strings"])
    add_pad(strings, key, NOBRK, 52, vel=72)
    bass = t("contrabass", P["contrabass"])
    add_roots(bass, key, ALL, 2, [(0, 1.8, 0, 100), (2, 1.3, 7, 84), (3.5, 0.45, 0, 80)])
    marimba = t("log marimba", P["marimba"])
    add_arp(marimba, key, range(THEME_START, LOOP_BARS), 3, [0, 2, 3, 2, 0, 2, 3, 4], 0.5, vel=(58, 76), dur=0.45)
    taiko = t("taiko", P["taiko"])
    for b in ALL:
        base = [(0, 116, 53), (1.5, 72, 57), (2, 104, 50), (2.75, 66, 57), (3.5, 84, 53)]
        if b < 2:
            base = [(0, 110, 53), (2, 96, 50)]
        elif b in BRK and b < BREAK_START + 4:
            base = [(0, 112, 53), (2.5, 80, 57), (3, 90, 50)]  # half-time in the breakdown
        for beat, v, n in base:
            taiko.add(bar(b) + beat, 0.5, n, v)
        if b in FILL_BARS:
            for k, v in enumerate([74, 84, 96, 112]):
                taiko.add(bar(b) + 3 + k * 0.25, 0.25, 57 if k % 2 else 53, v)
    hand = t("hand drums", KIT_STANDARD, drums=True)
    drum_pattern(hand, range(2, LOOP_BARS), [(1, CONGA_LOW, 82), (2.5, CONGA_OPEN, 70), (3, CONGA_LOW, 76), (3.75, CONGA_MUTE, 60)])
    grid16(hand, range(THEME_START, LOOP_BARS), MARACAS, [44, 0, 64, 0] * 4)
    drum_pattern(hand, loop_bars(range(8, 16)), [(1, CLAVES, 58), (3, CLAVES, 58), (3.5, CLAVES, 44)])
    drum_pattern(hand, BRK, [(0.5, BONGO_H, 60), (1.5, BONGO_H, 54), (2.25, BONGO_L, 58), (3.5, BONGO_H, 60)])
    for b in FILL_BARS:
        roll(hand, b, TOM_LF, 2, 3, 60, 96, 0.5)
    parts = [
        Part(flute, rel=0, lead=True, pan=0.0, send=0.28, hp=180),
        Part(shaku, rel=-1, pan=-0.15, send=0.35, hp=150),
        Part(ocarina, rel=-6, pan=0.3, send=0.3, hp=200),
        Part(oohs, rel=-9, pan=0.0, send=0.4, hp=150, eq=PAD_EQ),
        Part(strings, rel=-8, pan=0.0, send=0.25, hp=150, eq=PAD_EQ),
        Part(bass, rel=-5, pan=0.0, send=0.08, hp=55, eq=[(250, -2.0, 1.0), (900, 2.5, 1.0)], duck=((0.0, 2.0), 0.55)),
        Part(marimba, rel=-8, pan=-0.35, send=0.18, hp=180),
        Part(taiko, rel=-2.5, pan=0.0, send=0.22, hp=75, eq=[(400, -3.0, 1.2), (2000, 3.5, 1.0)], swing_ms=3),
        Part(hand, rel=-5, pan=0.25, send=0.15, hp=150, eq=[(5000, 3.0, 0.8)], swing_ms=3),
    ]
    return Arrangement("music.stone", BPM, LOOP_BARS, parts, reverb_s=2.2, reverb_damp=7000, reverb_wet=0.22, air_db=3.0, presence_db=3.0, low_db=-3.0)


# ------------------------------------------------------------------------------------------------
# Medieval: brass, snare, lute (key D)


def medieval(key: int = 2) -> Arrangement:
    lute = t("lute", P["nylon"])
    add_arp(lute, key, ALL, 3, [0, 2, 3, 4, 5, 4, 3, 2], 0.5, vel=(66, 82), dur=0.9)
    horn = t("horn melody", P["horn"])
    add_melody(horn, key, A_BARS, octave=-1, vel=94)
    add_melody(horn, key, A3_BARS, octave=-1, vel=90)
    calls(horn, key, INTRO_CALL, octave=-1, vel=80)
    add_b2(horn, key, range(8, 12), octave=-1, vel=86)
    horns2 = t("horn chords", P["horn"])
    add_pad(horns2, key, loop_bars(B_BARS), 55, vel=70, count=2, beats=2)
    add_pad(horns2, key, range(B2_START, B2_START + 8), 55, vel=66, count=2, beats=2)
    recorder = t("recorder", P["recorder"])
    add_melody(recorder, key, B_BARS, vel=92)
    calls(recorder, key, OUTRO_CALL, vel=86)
    add_b2(recorder, key, range(8, 12), vel=78, third=True)
    trumpet = t("trumpet", P["trumpet"])
    add_melody(trumpet, key, A3_BARS, vel=90)
    add_b2(trumpet, key, range(0, 12), vel=92)
    trombone = t("trombones", P["trombone"])
    add_pad(trombone, key, loop_bars(A3_BARS), 48, vel=78, count=3, beats=2)
    add_pad(trombone, key, range(B2_START + 8, BREAK_START), 48, vel=74, count=3, beats=2)
    add_pad(trombone, key, OUT, 48, vel=70, count=3, beats=2)
    strings = t("strings", P["strings"])
    add_pad(strings, key, NOBRK, 57, vel=62)
    cello = t("cello", P["cello"])
    add_roots(cello, key, ALL, 2, [(0, 1.9, 0, 92), (2, 1.9, 7, 82)])
    timp = t("timpani", P["timpani"])
    for b in ALL:
        r = root(chord_at(b), 2) + key
        if r > 50:
            r -= 12
        if b in DOWNBEATS or b == 0:
            timp.add(bar(b), 1, r, 104)
        if 16 <= b < 20 or B2_START + 8 <= b < BREAK_START:
            timp.add(bar(b) + 2, 1, r + 7 if r + 7 <= 55 else r - 5, 86)
    for b in FILL_BARS:
        r = root(chord_at(b), 2) + key
        roll(timp, b, r - 12 if r > 50 else r, 3, 4, 60, 100, 0.125)
    drums = t("march drums", KIT_STANDARD, drums=True)
    snare_main = [100, 0, 0, 42, 0, 0, 78, 0, 96, 0, 0, 42, 70, 0, 84, 40]
    snare_light = [80, 0, 0, 0, 0, 0, 60, 0, 76, 0, 0, 0, 0, 0, 60, 0]
    grid16(drums, range(0, 4), SNARE, snare_light)
    grid16(drums, HOT, SNARE, snare_main)
    grid16(drums, BRK, SNARE, [0, 0, 0, 0, 70, 0, 0, 0, 0, 0, 0, 0, 84, 0, 0, 0])  # backbeat only
    grid16(drums, BRK, SNARE2, [40, 0, 30, 0] * 4)
    drum_pattern(drums, ALL, [(0, KICK, 96), (2, KICK, 84)])
    drum_pattern(drums, loop_bars(A3_BARS), [(1, TAMB, 62), (3, TAMB, 62)])
    drum_pattern(drums, B2, [(1, TAMB, 56), (3, TAMB, 56)])
    for b in DOWNBEATS:
        if b not in BRK:
            drums.add(bar(b), 1, CRASH, 84)
    for b in FILL_BARS:
        roll(drums, b, SNARE, 2, 4, 50, 104, 0.125)
    parts = [
        Part(horn, rel=0, lead=True, pan=-0.1, send=0.3, hp=90),
        Part(horns2, rel=-9, pan=-0.3, send=0.35, hp=110, eq=PAD_EQ),
        Part(recorder, rel=-0.5, pan=0.1, send=0.3, hp=250),
        Part(trumpet, rel=0, pan=0.12, send=0.3, hp=180),
        Part(trombone, rel=-6, pan=0.3, send=0.3, hp=90, eq=PAD_EQ),
        Part(lute, rel=-4, pan=0.35, send=0.2, hp=130),
        Part(strings, rel=-10, pan=0.0, send=0.35, hp=130, eq=PAD_EQ),
        Part(cello, rel=-7, pan=-0.15, send=0.15, hp=50, eq=[(250, -2.0, 1.0), (1000, 2.0, 1.0)]),
        Part(timp, rel=-6, pan=0.0, send=0.25, hp=45, swing_ms=3),
        Part(drums, rel=-4, pan=0.0, send=0.18, hp=60, swing_ms=3),
    ]
    return Arrangement("music.medieval", BPM, LOOP_BARS, parts, reverb_s=2.4, reverb_damp=7000, reverb_wet=0.22, air_db=2.5, presence_db=2.0)


# ------------------------------------------------------------------------------------------------
# Gunpowder: fife and drum, brass band (key E)


def gunpowder(key: int = 4) -> Arrangement:
    fife = t("fife", P["piccolo"])
    add_melody(fife, key, A_BARS, vel=86)
    add_melody(fife, key, A3_BARS, vel=90)
    add_harmony_third(fife, key, B_BARS, vel=66)
    calls(fife, key, INTRO_CALL[6:], vel=80)
    add_b2(fife, key, range(8, 12), vel=84)
    flute = t("flute double", P["flute"])
    add_melody(flute, key, A_BARS, octave=-1, vel=80)
    add_melody(flute, key, A3_BARS, octave=-1, vel=80)
    add_b2(flute, key, range(0, 8), octave=-1, vel=74, third=True)
    trumpet = t("trumpet", P["trumpet"])
    add_melody(trumpet, key, B_BARS, vel=92)
    add_harmony_third(trumpet, key, range(4, 8), vel=70)
    add_harmony_third(trumpet, key, A3_BARS, vel=74)
    add_b2(trumpet, key, range(0, 8), vel=92)
    add_b2(trumpet, key, range(8, 12), vel=74, third=True)
    calls(trumpet, key, OUTRO_CALL, vel=88)
    glock = t("glock", P["glock"])
    add_melody(glock, key, A3_BARS, vel=70, legato=0.5)
    add_arp(glock, key, BRK, 5, [0, 1, 2, 3, 2, 1, 0, 1], 0.5, vel=(46, 58), dur=0.4)
    tuba = t("tuba", P["tuba"])
    add_roots(tuba, key, range(2, LOOP_BARS), 1, [(0, 0.8, 12, 100), (2, 0.8, 7, 90)])
    bones = t("trombones", P["trombone"])
    for b in range(2, LOOP_BARS):
        for beat in (1, 3):
            for n in voicing(chord_at(b), 52, 3):
                bones.add(bar(b) + beat, 0.45, n + key, 72 if b not in BRK else 62)
    drums = t("field drums", KIT_STANDARD, drums=True)
    cadence = [104, 0, 44, 0, 82, 0, 44, 44, 100, 0, 44, 0, 80, 44, 92, 44]
    cadence_b = [100, 0, 40, 40, 76, 0, 40, 0, 96, 40, 40, 0, 80, 0, 90, 40]
    grid16(drums, range(0, THEME_START), SNARE, cadence)
    for b in HOT:
        grid16(drums, range(b, b + 1), SNARE, cadence if b % 2 == 0 else cadence_b)
    grid16(drums, BRK, SNARE, [70, 0, 0, 0, 0, 0, 40, 0, 64, 0, 0, 0, 0, 0, 40, 40])
    drum_pattern(drums, ALL, [(0, KICK, 100), (2, KICK, 90)])
    drum_pattern(drums, loop_bars(A3_BARS), [(1, CRASH2, 46), (3, CRASH2, 46)])
    drum_pattern(drums, range(B2_START + 8, BREAK_START), [(1, CRASH2, 42), (3, CRASH2, 42)])
    for b in DOWNBEATS:
        if b not in BRK:
            drums.add(bar(b), 1, CRASH, 90)
    for b in FILL_BARS:
        roll(drums, b, SNARE, 2, 4, 44, 108, 0.125)
        drums.add(bar(b) + 3.5, 0.25, KICK, 96)
    parts = [
        Part(fife, rel=0, lead=True, pan=0.05, send=0.26, hp=400, lp=10000, eq=[(5500, -2.0, 1.0)]),
        Part(flute, rel=-7, pan=-0.1, send=0.26, hp=220),
        Part(trumpet, rel=-1, pan=-0.2, send=0.26, hp=180),
        Part(glock, rel=-11, pan=0.35, send=0.3, hp=600, lp=10000),
        Part(tuba, rel=-4, pan=0.0, send=0.12, hp=50, eq=[(250, -2.0, 1.0), (700, 2.0, 1.0)]),
        Part(bones, rel=-7, pan=0.3, send=0.2, hp=110, eq=PAD_EQ),
        Part(drums, rel=-2, pan=0.0, send=0.16, hp=60, swing_ms=2),
    ]
    return Arrangement("music.gunpowder", BPM, LOOP_BARS, parts, reverb_s=1.8, reverb_damp=7000, reverb_wet=0.2, air_db=1.5)


# ------------------------------------------------------------------------------------------------
# Modern: orchestra, synth bass, rock drums (key F)


def modern(key: int = 5) -> Arrangement:
    brass = t("brass melody", P["brass"])
    add_melody(brass, key, A_BARS, octave=-1, vel=96)
    add_melody(brass, key, A3_BARS, octave=-1, vel=96)
    calls(brass, key, INTRO_CALL[:6], octave=-1, vel=86)
    add_b2(brass, key, range(8, 12), octave=-1, vel=94)
    trumpet = t("trumpets", P["trumpet"])
    add_melody(trumpet, key, A3_BARS, vel=90)
    add_b2(trumpet, key, range(8, 12), vel=88)
    str_lead = t("string melody", P["strings"])
    add_melody(str_lead, key, B_BARS, vel=100)
    add_b2(str_lead, key, range(0, 8), vel=100)
    calls(str_lead, key, OUTRO_CALL, vel=92)
    ost = t("string ostinato", P["strings2"])
    add_arp(ost, key, range(2, LOOP_BARS), 4, [0, 1, 2, 1, 0, 1, 2, 3], 0.5, vel=(70, 88), dur=0.35)
    pad = t("brass pad", P["brass"])
    add_pad(pad, key, loop_bars(B_BARS), 53, vel=64, count=3, beats=2)
    add_pad(pad, key, range(B2_START, B2_START + 8), 53, vel=60, count=3, beats=2)
    choir = t("choir", P["choir"])
    add_pad(choir, key, loop_bars(A3_BARS), 57, vel=70)
    add_pad(choir, key, range(B2_START + 8, BREAK_START), 57, vel=66)
    bass = t("synth bass", P["synth_bass1"])
    eighths = [(k * 0.5, 0.4, [0, 0, 12, 0, 0, 12, 0, 7][k], 100 if k % 2 == 0 else 84) for k in range(8)]
    add_roots(bass, key, range(2, LOOP_BARS), 2, eighths)
    add_roots(bass, key, range(0, 2), 2, [(0, 3.8, 0, 96)])
    gtr = t("guitar", P["overdrive_gtr"])
    for b in list(loop_bars(B_BARS)) + list(loop_bars(A3_BARS)) + list(range(B2_START + 8, BREAK_START)):
        r = root(chord_at(b), 2) + key
        if r > 47:
            r -= 12
        for k in range(8):
            for n in (r, r + 7, r + 12):
                gtr.add(bar(b) + k * 0.5, 0.3, n, 84 if k % 2 == 0 else 70)
    timp = t("timpani", P["timpani"])
    for b in DOWNBEATS:
        r = root(chord_at(b), 2) + key
        timp.add(bar(b), 1.5, r - 12 if r > 50 else r, 110 if b not in BRK else 90)
    for b in FILL_BARS:
        r = root(chord_at(b), 2) + key
        roll(timp, b, r - 12 if r > 50 else r, 3, 4, 60, 104, 0.125)
    kit = t("rock kit", KIT_POWER, drums=True)
    drum_pattern(kit, range(0, 2), [(0, KICK, 104), (2, KICK, 96)])
    grid16(kit, range(0, 2), HAT, [60, 0, 0, 0, 44, 0, 0, 0, 60, 0, 0, 0, 44, 0, 0, 0])
    drum_pattern(kit, range(2, 4), [(0, KICK, 108), (1, SNARE, 96), (2, KICK, 100), (3, SNARE, 100)])
    groove = [(0, KICK, 112), (0.75, KICK, 84), (1, SNARE, 108), (2, KICK, 104), (2.5, KICK, 92), (3, SNARE, 110), (3.75, SNARE, 40)]
    drum_pattern(kit, HOT, groove)
    drum_pattern(kit, BRK, [(0, KICK, 104), (2.5, KICK, 90), (3, SNARE, 96)])  # half-time breakdown
    grid16(kit, range(2, THEME_START), HAT, [72, 0, 50, 0] * 4)
    for b in HOT:
        if b in loop_bars(B_BARS) or b in B2:
            drum_pattern(kit, range(b, b + 1), [(k, RIDE, 76) for k in range(4)] + [(k + 0.5, RIDE, 56) for k in range(4)])
        else:
            grid16(kit, range(b, b + 1), HAT, [80, 0, 54, 0, 76, 0, 54, 0, 80, 0, 54, 0, 76, 0, 0, 0])
            kit.add(bar(b) + 3.5, 0.4, OPEN_HAT, 66)
    grid16(kit, BRK, HAT, [60, 40, 50, 40] * 4)
    for b in DOWNBEATS:
        if b not in BRK:
            kit.add(bar(b), 1, CRASH, 96)
    for b in FILL_BARS:
        toms = [TOM_H, TOM_H, TOM_HM, TOM_HM, TOM_LM, TOM_LM, TOM_L, TOM_L]
        for k, n in enumerate(toms):
            kit.add(bar(b) + 2 + k * 0.25, 0.25, n, 80 + k * 3)
    parts = [
        Part(brass, rel=0, lead=True, pan=-0.05, send=0.22, hp=120),
        Part(trumpet, rel=-1, pan=0.15, send=0.22, hp=200),
        Part(str_lead, rel=-0.5, pan=0.0, send=0.26, hp=180, eq=PAD_EQ),
        Part(ost, rel=-6, pan=0.3, send=0.18, hp=200, eq=PAD_EQ),
        Part(pad, rel=-9, pan=-0.3, send=0.25, hp=130, eq=PAD_EQ),
        Part(choir, rel=-10, pan=0.0, send=0.35, hp=160, eq=PAD_EQ),
        Part(bass, rel=-3, pan=0.0, send=0.04, hp=45, lp=4500, eq=[(250, -1.5, 1.0), (800, 2.5, 1.0)], swing_ms=2),
        Part(gtr, rel=-11, pan=-0.4, send=0.1, hp=140, lp=5000),
        Part(timp, rel=-6, pan=0.0, send=0.25, hp=45, swing_ms=2),
        Part(kit, rel=-1.5, pan=0.0, send=0.12, hp=40, eq=[(400, -2.0, 1.0)], swing_ms=2),
    ]
    return Arrangement("music.modern", BPM, LOOP_BARS, parts, reverb_s=1.6, reverb_damp=7500, reverb_wet=0.18, air_db=1.5)


# ------------------------------------------------------------------------------------------------
# Future: synths plus orchestra (key F#)


def future(key: int = 6) -> Arrangement:
    lead = t("saw lead", P["saw"])
    add_melody(lead, key, A_BARS, vel=90, legato=0.9)
    add_melody(lead, key, A3_BARS, octave=-1, vel=90, legato=0.9)
    add_b2(lead, key, range(8, 12), vel=88, legato=0.9)
    calls(lead, key, OUTRO_CALL, octave=-1, vel=84)
    strings = t("strings", P["strings"])
    add_melody(strings, key, B_BARS, vel=100)
    add_b2(strings, key, range(0, 8), vel=100)
    add_pad(strings, key, loop_bars(A3_BARS), 57, vel=70)
    choir = t("choir", P["choir"])
    add_melody(choir, key, B_BARS, octave=-1, vel=86)
    add_b2(choir, key, range(0, 8), octave=-1, vel=80)
    brass = t("brass", P["brass"])
    add_melody(brass, key, A3_BARS, vel=92)
    add_b2(brass, key, range(8, 12), octave=-1, vel=88)
    arp = t("arp", P["square"])
    add_arp(arp, key, range(2, LOOP_BARS), 4, [0, 1, 2, 3, 4, 5, 4, 3, 0, 1, 2, 3, 4, 5, 6, 5], 0.25, vel=(62, 80), dur=0.2)
    pad = t("pad", P["warm_pad"])
    add_pad(pad, key, NOBRK, 55, vel=80, count=4)
    bass = t("synth bass", P["synth_bass2"])
    add_roots(bass, key, range(2, LOOP_BARS), 2, [(0, 0.45, 0, 110), (0.5, 0.4, 0, 90), (1.5, 0.4, 0, 92), (2.5, 0.4, 12, 92), (3.5, 0.4, 0, 90)])
    add_roots(bass, key, range(0, 2), 2, [(0, 3.9, 0, 90)])
    timp = t("timpani", P["timpani"])
    for b in DOWNBEATS:
        r = root(chord_at(b), 2) + key
        timp.add(bar(b), 1.5, r - 12 if r > 50 else r, 112 if b not in BRK else 90)
    kit = t("808", KIT_808, drums=True)
    drum_pattern(kit, range(2, LOOP_BARS), [(k, KICK, 112) for k in range(4)])
    drum_pattern(kit, [b for b in range(THEME_START, LOOP_BARS)], [(1, CLAP, 100), (3, CLAP, 104)])
    grid16(kit, range(0, LOOP_BARS), HAT, [58, 34, 74, 34] * 4)
    drum_pattern(kit, HOT, [(k + 0.5, OPEN_HAT, 50) for k in range(4)])
    for b in FILL_BARS:
        roll(kit, b, SNARE, 2, 4, 40, 110, 0.125)
    for b in DOWNBEATS:
        if b not in BRK:
            kit.add(bar(b), 1, CRASH, 90)
    parts = [
        Part(lead, rel=0, lead=True, pan=0.0, send=0.25, hp=180, lp=8000),
        Part(strings, rel=-1.5, pan=0.1, send=0.3, hp=160, eq=PAD_EQ),
        Part(choir, rel=-6, pan=-0.1, send=0.35, hp=160, eq=PAD_EQ),
        Part(brass, rel=-2.5, pan=-0.15, send=0.25, hp=180),
        Part(arp, rel=-7, pan=0.3, send=0.3, hp=300, lp=7000, pump=0.35),
        Part(pad, rel=-8, pan=0.0, send=0.3, hp=150, pump=0.55, eq=PAD_EQ),
        Part(bass, rel=-3, pan=0.0, send=0.03, hp=45, lp=3500, eq=[(700, 2.5, 1.0)], pump=0.3, swing_ms=1),
        Part(timp, rel=-6, pan=0.0, send=0.3, hp=45, swing_ms=1),
        Part(kit, rel=-1.5, pan=0.0, send=0.1, hp=35, swing_ms=1),
    ]
    return Arrangement("music.future", BPM, LOOP_BARS, parts, reverb_s=2.0, reverb_damp=8000, reverb_wet=0.2, air_db=1.5)


# ------------------------------------------------------------------------------------------------
# The three A17 ages. Their keys follow the eight-age evolve chain (A17.8: +2, +2, +1, +1, +1, +1,
# +1 from Stone's C): Bronze D (+2), Industrial F# (+6), Cosmic A (+9). Past +6 the lead lines drop
# one octave so the register stays comfortable.
#
# GM programs only used here.
P.update(accordion=21, oboe=68, shanai=111, dulcimer=15, kalimba=108, muted_trumpet=59, euphonium=58,
         synth_brass=62, synth_brass2=63, polysynth=90, space_voice=91, crystal=98, vibes=11,
         tubular=14, bagpipe=109, fiddle=110)
CHINA = 52  # GM Chinese cymbal: a thin bronze crash
MUTE_TRI, OPEN_TRI = 80, 81


def _extra_machine(L: float, bpm: float, bars: int) -> tuple[np.ndarray, float, float]:
    """Industrial "steam machine" percussion made in numpy: piston chuffs on the 8ths (accented like
    a locomotive), a struck anvil on the backbeat and a steam-vent hiss at every section start. It
    follows the loop's form: the engine starts in the intro, drives the groove bars and takes the lead
    in the breakdown. Returns (stereo, rel LU vs the lead, reverb send)."""
    import dsp

    rng = np.random.default_rng(1851)
    beat = 60 / bpm
    n = dsp.n_of(L + 2.0)
    out = np.zeros((n, 2))

    def put(x: np.ndarray, t: float, g: float, pan_: float) -> None:
        i = int(round(t * dsp.SR))
        if i >= n:
            return
        s = dsp.pan(x, pan_) * g
        e = min(n, i + len(s))
        out[i:e] += s[: e - i]

    def chuff(strong: bool) -> np.ndarray:
        d = 0.11 if strong else 0.075
        x = dsp.bp(dsp.noise(d, rng, "pink"), 500, 3200, 2) * dsp.env_exp(d, 0.035 if strong else 0.02, 0.002)
        body = dsp.osc(dsp.drop(140, 80, d, 0.02), "sine") * dsp.env_exp(d, 0.03, 0.001) * (0.5 if strong else 0.0)
        return x * (1.0 if strong else 0.55) + body

    def anvil(f0: float) -> np.ndarray:
        d = 0.6
        y = np.zeros(dsp.n_of(d))
        for ratio, amp in ((1.0, 1.0), (2.76, 0.55), (5.40, 0.35), (8.93, 0.18)):
            if f0 * ratio < 15000:
                y += dsp.osc(f0 * ratio, "sine", d) * amp * dsp.env_exp(d, 0.18 / ratio**0.6, 0.0005)
        tick = dsp.bp(dsp.noise(0.01, rng), 2000, 9000) * dsp.env_exp(0.01, 0.002, 0.0002)
        y[: len(tick)] += tick * 0.8
        return y

    def hiss() -> np.ndarray:
        d = 0.9
        x = dsp.hp(dsp.noise(d, rng), 3000, 2)
        return dsp.lp(x, 9000, 2) * dsp.env_exp(d, 0.3, 0.02) * 0.5

    hot = set(HOT)
    brk = set(BRK)
    for b in range(bars):
        t0 = b * 4 * beat
        if b < 2:
            steps = [0, 2, 4, 6] if b == 1 else [0, 4]  # the engine starts
        else:
            steps = list(range(8))
        for k in steps:
            strong = k % 2 == 0
            g = (0.9 if k in (0, 4) else 0.7) if strong else 0.5
            if b in brk:
                g *= 1.15
            put(chuff(strong), t0 + k * beat / 2 + rng.uniform(-0.003, 0.003), g, -0.25 if k % 2 else 0.2)
        if b in hot or b in brk:
            f = 1320 * (1.0 if b % 2 == 0 else 1.06)
            for bt in (1, 3):
                put(anvil(f), t0 + bt * beat, 0.35 if b not in brk else 0.5, 0.35)
            if b % 2 == 1:
                put(anvil(f * 1.12), t0 + 3.5 * beat, 0.22, 0.4)
        if b in DOWNBEATS:
            put(hiss(), t0, 0.5, -0.4)
    return out, -9.0, 0.12


def bronze(key: int = 2) -> Arrangement:
    """Bronze (D): plucked lyre, frame drums, reed pipe and horns; a temple march in the sun."""
    reed = t("reed pipe", P["oboe"])
    add_melody(reed, key, A_BARS, vel=96)
    add_harmony_third(reed, key, B_BARS, vel=70)
    add_melody(reed, key, A3_BARS, vel=94)
    add_b2(reed, key, range(0, 8), vel=96)
    add_b2(reed, key, range(8, 12), vel=74, third=True)
    calls(reed, key, OUTRO_CALL, vel=90)
    shanai = t("double reed", P["shanai"])  # a nasal aulos colour on the melody in the loud sections
    add_melody(shanai, key, A3_BARS, vel=70)
    add_b2(shanai, key, range(0, 4), vel=66)
    horn = t("horns", P["horn"])
    calls(horn, key, INTRO_CALL, octave=-1, vel=90)
    add_melody(horn, key, B_BARS, octave=-1, vel=96)
    add_melody(horn, key, A3_BARS, octave=-1, vel=84)
    add_b2(horn, key, range(8, 12), octave=-1, vel=96)
    horns2 = t("horn fifths", P["horn"])
    for b in list(loop_bars(B_BARS)) + list(range(B2_START + 8, BREAK_START)):
        r = root(chord_at(b), 3) + key
        if r > 57:
            r -= 12
        horns2.add(bar(b), 1.9, r, 72)
        horns2.add(bar(b), 1.9, r + 7, 68)
        horns2.add(bar(b) + 2, 1.9, r, 66)
        horns2.add(bar(b) + 2, 1.9, r + 7, 62)
    lyre = t("lyre", P["harp"])
    # A rolling lyre figure: low root, then the chord broken upwards, a little different on bar 2 of 2.
    for b in ALL:
        ch = chord_at(b)
        r = root(ch, 3)
        v = voicing(ch, r)
        pool = [v[0], v[1], v[2], v[0] + 12, v[1] + 12, v[2] + 12, v[0] + 24]
        pat = [0, 2, 3, 4, 5, 4, 3, 2] if b % 2 == 0 else [0, 2, 3, 5, 6, 5, 3, 4]
        if b in BRK:
            pat = [0, 3, 2, 3, 0, 3, 4, 3]
        for k, s in enumerate(pat):
            lyre.add(bar(b) + k * 0.5, 0.9, pool[s] + key, 84 if k in (0, 4) else 68)
    dulc = t("dulcimer", P["dulcimer"])  # a bright hammered sparkle over the B-theme and the breakdown
    for b in list(B2) + list(range(BREAK_START + 4, OUTRO_START)):
        ch = chord_at(b)
        v = voicing(ch, root(ch, 5))
        for k, s in enumerate([2, 1, 0, 1, 2, 1, 0, 1]):
            dulc.add(bar(b) + k * 0.5 + 0.25, 0.3, v[s] + key - 12, 58 if k % 2 else 66)
    strings = t("strings", P["strings"])
    add_pad(strings, key, NOBRK, 57, vel=60)
    drone = t("drone", P["cello"])  # tonic and fifth, the ancient drone under the march
    for b in ALL:
        r = root(chord_at(b), 2) + key
        drone.add(bar(b), 1.9, r, 90)
        drone.add(bar(b) + 2, 1.9, r + 7 if b % 2 == 0 else r + 12, 78)
    bass = t("contrabass", P["contrabass"])
    add_roots(bass, key, range(2, LOOP_BARS), 2, [(0, 1.4, 0, 96), (1.5, 0.45, 0, 70), (2, 1.4, 7, 84), (3.5, 0.45, 0, 72)])
    frame = t("big frame drum", P["taiko"])  # the taiko sample pitched up reads as a large frame drum
    for b in ALL:
        # Maqsum: DUM tek - tek DUM - tek -
        hits = [(0, 112, 57), (1.5, 76, 62), (2, 100, 57), (3, 84, 62)]
        if b < 2:
            hits = [(0, 104, 57), (2, 92, 57)]
        elif b in BRK and b < BREAK_START + 4:
            hits = [(0, 110, 57), (2.5, 80, 62), (3, 92, 57)]
        for beat, v, n in hits:
            frame.add(bar(b) + beat, 0.5, n, v)
        if b in FILL_BARS:
            for k, v in enumerate([70, 80, 92, 106]):
                frame.add(bar(b) + 3 + k * 0.25, 0.25, 62 if k % 2 else 57, v)
    hand = t("frame drums and riq", KIT_STANDARD, drums=True)
    drum_pattern(hand, range(2, LOOP_BARS), [(0.5, CONGA_MUTE, 58), (1, CONGA_OPEN, 74), (2.5, CONGA_MUTE, 60), (3.5, CONGA_OPEN, 72)])
    grid16(hand, range(THEME_START, LOOP_BARS), TAMB, [58, 0, 36, 44] * 4)
    grid16(hand, range(2, THEME_START), TAMB, [48, 0, 30, 0] * 4)
    drum_pattern(hand, loop_bars(range(8, 16)), [(1, OPEN_TRI, 46), (3, OPEN_TRI, 46)])  # finger cymbals
    drum_pattern(hand, B2, [(1, MUTE_TRI, 44), (3, OPEN_TRI, 44)])
    for b in DOWNBEATS:
        if b not in BRK:
            hand.add(bar(b), 1, CHINA, 78)
    for b in FILL_BARS:
        roll(hand, b, CONGA_LOW, 2, 3, 60, 92, 0.5)
    timp = t("timpani", P["timpani"])
    for b in DOWNBEATS:
        r = root(chord_at(b), 2) + key
        timp.add(bar(b), 1.5, r - 12 if r > 50 else r, 100 if b not in BRK else 84)
    parts = [
        Part(reed, rel=0, lead=True, pan=0.05, send=0.3, hp=220, eq=[(1200, 1.5, 1.0)]),
        Part(shanai, rel=-9, pan=0.3, send=0.35, hp=400, lp=9000),
        Part(horn, rel=-0.5, pan=-0.15, send=0.32, hp=90),
        Part(horns2, rel=-10, pan=-0.35, send=0.35, hp=110, eq=PAD_EQ),
        Part(lyre, rel=-4, pan=0.35, send=0.22, hp=140, eq=[(3000, 1.5, 1.0)]),
        Part(dulc, rel=-10, pan=-0.4, send=0.3, hp=500, lp=10000),
        Part(strings, rel=-11, pan=0.0, send=0.35, hp=150, eq=PAD_EQ),
        Part(drone, rel=-9, pan=-0.1, send=0.2, hp=60, eq=[(250, -2.0, 1.0), (900, 2.0, 1.0)]),
        Part(bass, rel=-7, pan=0.0, send=0.08, hp=50, eq=[(250, -2.0, 1.0), (900, 2.5, 1.0)], duck=((0.0, 2.0), 0.4)),
        Part(frame, rel=-3, pan=0.0, send=0.22, hp=80, eq=[(400, -3.0, 1.2), (2200, 3.0, 1.0)], swing_ms=3),
        Part(hand, rel=-6, pan=-0.2, send=0.15, hp=150, lp=12000, swing_ms=3),
        Part(timp, rel=-8, pan=0.0, send=0.28, hp=45, swing_ms=2),
    ]
    return Arrangement("music.bronze", BPM, LOOP_BARS, parts, reverb_s=2.3, reverb_damp=7000, reverb_wet=0.22, air_db=2.5, presence_db=3.5, low_db=-1.5)


def industrial(key: int = 6) -> Arrangement:
    """Industrial (F#): a colliery brass band (cornet lead, euphonium, tuba), accordion, march drums
    and the steam machine (pistons, anvil, vents)."""
    cornet = t("cornet", P["trumpet"])
    add_melody(cornet, key, A_BARS, vel=94)
    add_melody(cornet, key, A3_BARS, vel=98)
    add_b2(cornet, key, range(8, 12), vel=94)
    calls(cornet, key, OUTRO_CALL, vel=88)
    euph = t("euphonium", P["horn"])
    calls(euph, key, INTRO_CALL, octave=-1, vel=88)
    add_harmony_third(euph, key, range(4, 8), octave=-1, vel=78)
    add_harmony_third(euph, key, A3_BARS, octave=-1, vel=82)
    add_b2(euph, key, range(0, 8), octave=-1, vel=90)
    add_b2(euph, key, range(8, 12), octave=-1, vel=76, third=True)
    acc = t("accordion", P["accordion"])
    add_melody(acc, key, B_BARS, vel=96)
    add_b2(acc, key, range(0, 4), vel=76, third=True)
    acc_ch = t("accordion chords", P["accordion"])
    for b in range(2, LOOP_BARS):
        for beat in (1, 3):
            for n in voicing(chord_at(b), 55, 3):
                acc_ch.add(bar(b) + beat, 0.4, n + key - 12 if n + key > 66 else n + key, 74 if b not in BRK else 62)
        if b in BRK:
            for n in voicing(chord_at(b), 55, 3):
                acc_ch.add(bar(b) + 3.5, 0.3, n + key - 12 if n + key > 66 else n + key, 56)
    bones = t("band chords", P["trombone"])
    add_pad(bones, key, loop_bars(A3_BARS), 48, vel=74, count=3, beats=2)
    add_pad(bones, key, range(B2_START + 4, BREAK_START), 48, vel=70, count=3, beats=2)
    add_pad(bones, key, OUT, 48, vel=68, count=3, beats=2)
    tuba = t("tuba", P["tuba"])
    for b in range(2, LOOP_BARS):
        r = root(chord_at(b), 1) + key
        if r < 34:
            r += 12
        tuba.add(bar(b), 0.8, r, 102)
        tuba.add(bar(b) + 2, 0.8, r + 7 if b % 2 == 0 else r - 5, 90)
        if b % 2 == 1 and b not in BRK:
            # A diatonic walking pickup into the next bar's root (from below when it rises).
            nxt = root(chord_at(b + 1), 1)
            if nxt + key < 34:
                nxt += 12
            here = r - key
            app = diatonic_below(nxt, 1) if nxt >= here else diatonic_below(nxt + 12, -1) - 12
            tuba.add(bar(b) + 3.5, 0.4, app + key, 84)
    add_roots(tuba, key, range(0, 2), 1, [(0, 1.8, 12, 90), (2, 1.8, 7, 84)])
    glock = t("bells", P["glock"])
    add_melody(glock, key, A3_BARS, octave=-1, vel=62, legato=0.5)
    drums = t("band drums", KIT_STANDARD, drums=True)
    march = [102, 0, 40, 40, 84, 0, 40, 0, 98, 0, 40, 40, 84, 0, 60, 60]
    march_b = [100, 0, 40, 0, 84, 40, 40, 0, 96, 0, 40, 40, 90, 0, 90, 40]
    grid16(drums, range(2, THEME_START), SNARE, [80, 0, 0, 0, 60, 0, 0, 0, 76, 0, 0, 0, 60, 0, 50, 50])
    for b in HOT:
        grid16(drums, range(b, b + 1), SNARE, march if b % 2 == 0 else march_b)
    grid16(drums, BRK, SNARE2, [0, 0, 0, 0, 60, 0, 0, 0, 0, 0, 0, 0, 72, 0, 0, 0])
    drum_pattern(drums, range(0, LOOP_BARS), [(0, KICK, 106), (1, KICK, 72), (2, KICK, 96), (3, KICK, 72)])
    drum_pattern(drums, loop_bars(A3_BARS), [(1, CRASH2, 44), (3, CRASH2, 44)])
    drum_pattern(drums, range(B2_START + 8, BREAK_START), [(1, CRASH2, 40), (3, CRASH2, 40)])
    for b in DOWNBEATS:
        if b not in BRK:
            drums.add(bar(b), 1, CRASH, 90)
    for b in FILL_BARS:
        roll(drums, b, SNARE, 2, 4, 44, 108, 0.125)
        drums.add(bar(b) + 3.5, 0.25, KICK, 96)
    timp = t("timpani", P["timpani"])
    for b in DOWNBEATS:
        r = root(chord_at(b), 2) + key
        timp.add(bar(b), 1.5, r - 12 if r > 50 else r, 106 if b not in BRK else 88)
    parts = [
        Part(cornet, rel=0, lead=True, pan=0.05, send=0.26, hp=200, eq=[(3200, -3.0, 1.0)]),
        Part(euph, rel=-1.5, pan=-0.2, send=0.28, hp=90),
        Part(acc, rel=-0.5, pan=0.2, send=0.25, hp=200, eq=[(3000, -3.0, 1.0)]),
        Part(acc_ch, rel=-7, pan=0.35, send=0.18, hp=180, eq=PAD_EQ),
        Part(bones, rel=-7, pan=-0.3, send=0.28, hp=100, eq=PAD_EQ),
        Part(tuba, rel=-4, pan=0.0, send=0.1, hp=45, eq=[(250, -2.0, 1.0), (700, 2.5, 1.0)]),
        Part(glock, rel=-12, pan=0.4, send=0.3, hp=600, lp=10000),
        Part(drums, rel=-3, pan=0.0, send=0.14, hp=55, swing_ms=2),
        Part(timp, rel=-7, pan=0.0, send=0.25, hp=45, swing_ms=2),
    ]
    arr = Arrangement("music.industrial", BPM, LOOP_BARS, parts, reverb_s=1.9, reverb_damp=6500, reverb_wet=0.2, air_db=2.0)
    arr.extras.append(lambda L, p: _extra_machine(L, BPM, LOOP_BARS))
    return arr


def cosmic(key: int = 9) -> Arrangement:
    """Cosmic (A): choir and orchestra over big synths; the lead lines sit an octave down (+9)."""
    lo = -1  # the lead octave drop past +6 (A17.8)
    choir = t("choir", P["choir"])
    add_melody(choir, key, A_BARS, octave=lo, vel=100)
    add_melody(choir, key, A3_BARS, octave=lo, vel=100)
    add_b2(choir, key, range(8, 12), octave=lo, vel=96)
    calls(choir, key, OUTRO_CALL, octave=lo, vel=92)
    sbrass = t("synth brass", P["synth_brass"])  # doubles the choir: gives it an edge and a clear attack
    add_melody(sbrass, key, A_BARS, octave=lo, vel=88, legato=0.9)
    add_melody(sbrass, key, A3_BARS, octave=lo, vel=92, legato=0.9)
    add_b2(sbrass, key, range(8, 12), octave=lo, vel=88, legato=0.9)
    calls(sbrass, key, INTRO_CALL, octave=lo, vel=86)
    strings = t("string melody", P["strings"])
    add_melody(strings, key, B_BARS, octave=lo, vel=104)
    add_b2(strings, key, range(0, 8), octave=lo, vel=104)
    add_harmony_third(strings, key, A3_BARS, octave=lo, vel=80)
    brass = t("brass", P["brass"])
    add_melody(brass, key, A3_BARS, octave=lo - 1, vel=96)
    add_b2(brass, key, range(8, 12), octave=lo - 1, vel=92)
    add_pad(brass, key, loop_bars(B_BARS), 50, vel=66, count=3, beats=2)
    ost = t("string ostinato", P["strings2"])
    add_arp(ost, key - 12, range(2, LOOP_BARS), 4, [0, 1, 2, 1, 3, 1, 2, 1], 0.5, vel=(66, 86), dur=0.3)
    bells = t("bell arpeggio", P["celesta"])
    add_arp(bells, key - 12, range(THEME_START, LOOP_BARS), 5, [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 4, 5, 4, 3, 2, 1], 0.25, vel=(56, 72), dur=0.3)
    add_arp(bells, key - 12, range(0, THEME_START), 5, [0, 2, 4, 5, 4, 2, 0, 2], 0.5, vel=(50, 64), dur=0.6)
    pad = t("choir pad", P["space_voice"])
    add_pad(pad, key - 12, NOBRK, 62, vel=80, count=4)
    poly = t("synth pad", P["polysynth"])
    add_pad(poly, key - 12, ALL, 60, vel=72, count=3, beats=1)
    bass = t("sub pulse", P["synth_bass1"])
    add_roots(bass, key, range(2, LOOP_BARS), 1, [(k * 0.5, 0.42, 0, 108 if k % 2 == 0 else 86) for k in range(8)])
    add_roots(bass, key, range(0, 2), 1, [(0, 3.9, 0, 96)])
    timp = t("timpani", P["timpani"])
    for b in ALL:
        r = root(chord_at(b), 2) + key
        r = r - 12 if r > 50 else r
        if b in DOWNBEATS or b == 0:
            timp.add(bar(b), 1.5, r, 116 if b not in BRK else 94)
        elif b in HOT and b % 2 == 1:
            timp.add(bar(b) + 2.5, 0.5, r, 78)
    for b in FILL_BARS:
        r = root(chord_at(b), 2) + key
        roll(timp, b, r - 12 if r > 50 else r, 3, 4, 60, 108, 0.125)
    taiko = t("taiko", P["taiko"])
    for b in range(THEME_START, LOOP_BARS):
        if b in BRK and b < BREAK_START + 4:
            hits = [(0, 110, 50)]
        else:
            hits = [(0, 116, 50), (1.75, 78, 53), (2.5, 96, 50)]
        for beat, v, n in hits:
            taiko.add(bar(b) + beat, 0.5, n, v)
    kit = t("epic kit", KIT_ORCH, drums=True)
    drum_pattern(kit, range(2, LOOP_BARS), [(0, KICK, 110), (2.5, KICK, 90)])
    drum_pattern(kit, [b for b in range(2, LOOP_BARS) if not (BREAK_START <= b < BREAK_START + 4)], [(1, SNARE, 96), (3, SNARE, 104)])
    for b in DOWNBEATS:
        if b not in BRK:
            kit.add(bar(b), 1, CRASH, 96)
    for b in FILL_BARS:
        toms = [TOM_H, TOM_H, TOM_HM, TOM_HM, TOM_LM, TOM_LM, TOM_L, TOM_L]
        for k, n in enumerate(toms):
            kit.add(bar(b) + 2 + k * 0.25, 0.25, n, 84 + k * 3)
    hats = t("electro hats", KIT_ELECTRONIC, drums=True)
    grid16(hats, range(2, LOOP_BARS), HAT, [64, 30, 50, 30] * 4)
    drum_pattern(hats, HOT, [(k + 0.5, SHAKER, 50) for k in range(4)])
    parts = [
        Part(choir, rel=0, lead=True, pan=0.0, send=0.35, hp=170, eq=PAD_EQ + [(2800, 2.0, 1.0)]),
        Part(sbrass, rel=-5, pan=0.0, send=0.25, hp=200, lp=7000),
        Part(strings, rel=-0.5, pan=0.1, send=0.32, hp=170, eq=PAD_EQ),
        Part(brass, rel=-3, pan=-0.15, send=0.28, hp=100),
        Part(ost, rel=-7, pan=0.3, send=0.2, hp=200, eq=PAD_EQ),
        Part(bells, rel=-9, pan=-0.35, send=0.35, hp=500, lp=11000),
        Part(pad, rel=-10, pan=0.0, send=0.4, hp=180, pump=0.35, eq=PAD_EQ),
        Part(poly, rel=-12, pan=0.0, send=0.3, hp=200, pump=0.5, width=1.0, eq=PAD_EQ),
        Part(bass, rel=-3, pan=0.0, send=0.03, hp=32, lp=2500, eq=[(700, 2.5, 1.0)], pump=0.25, swing_ms=1),
        Part(timp, rel=-5, pan=0.0, send=0.3, hp=40, swing_ms=1),
        Part(taiko, rel=-5, pan=0.0, send=0.25, hp=70, eq=[(400, -3.0, 1.2), (2000, 3.0, 1.0)], swing_ms=2),
        Part(kit, rel=-3, pan=0.0, send=0.2, hp=40, swing_ms=1),
        Part(hats, rel=-10, pan=0.25, send=0.1, hp=3000, swing_ms=1),
    ]
    return Arrangement("music.cosmic", BPM, LOOP_BARS, parts, reverb_s=2.8, reverb_damp=8000, reverb_wet=0.24, air_db=2.0, presence_db=1.0)


# ------------------------------------------------------------------------------------------------
# Menu: its own relaxed tune, "Hearth Song" (C, 84 BPM, 16 bars), so the battle theme stays fresh


def menu(key: int = 0) -> Arrangement:
    def ch(b: int) -> str:
        return MENU_HARMONY[b % 16]

    def tune(tr: Track, bars: range, octave: int = 0, vel: int = 84, legato: float = 0.96) -> None:
        for beat, dur, n in bars_notes(MENU_MELODY, 0, octave, bars):
            tr.add(beat, dur * legato, n + key, vel + accent(beat) // 2)

    flute = t("flute", P["flute"])
    tune(flute, range(0, 8), vel=84)
    tune(flute, range(15, 16), vel=76)
    clar = t("clarinet", P["clarinet"])
    tune(clar, range(8, 12), octave=-1, vel=88)
    horn = t("horn", P["horn"])
    tune(horn, range(12, 15), octave=-1, vel=80)
    flute2 = t("flute high", P["flute"])
    tune(flute2, range(12, 15), vel=72)
    harp = t("harp", P["harp"])
    strings = t("strings", P["strings"])
    violins = t("violins", P["strings"])
    cello = t("cello", P["cello"])
    celesta = t("celesta", P["celesta"])
    timp = t("timpani", P["timpani"])
    perc = t("shaker", KIT_STANDARD, drums=True)
    for b in range(16):
        c = ch(b)
        r4 = root(c, 4)
        v = voicing(c, r4)
        pool = [v[0], v[1], v[2], v[0] + 12, v[1] + 12, v[2] + 12]
        for k, s in enumerate([0, 2, 3, 4, 5, 4, 3, 2]):
            harp.add(bar(b) + k * 0.5, 0.9, pool[s] + key, 70 if k % 2 == 0 else 58)
        for n in voicing(c, 60):
            strings.add(bar(b), 3.95, n + key, 58)
        if 8 <= b < 15:
            for n in voicing(c, 76, 2):
                violins.add(bar(b), 3.95, n + key, 52)
        r2 = root(c, 2)
        cello.add(bar(b), 1.9, r2 + key, 74)
        cello.add(bar(b) + 2, 1.9, r2 + 7 + key, 64)
        if b % 2 == 1:
            top = voicing(c, 91)
            for k, n in enumerate(top):
                celesta.add(bar(b) + 2 + k * 0.33, 0.6, n + key, 54)
        rt = r2 + key
        timp.add(bar(b), 1, rt - 12 if rt > 50 else rt, 60 if b % 4 == 0 else 44)
        grid16(perc, range(b, b + 1), SHAKER, [30, 0, 44, 0] * 4)
        if b % 4 == 3:
            perc.add(bar(b) + 3, 1, TRIANGLE_OPEN, 44)
    parts = [
        Part(flute, rel=0, lead=True, pan=0.05, send=0.35, hp=250),
        Part(clar, rel=0, pan=-0.05, send=0.35, hp=150),
        Part(horn, rel=-1, pan=-0.1, send=0.38, hp=110),
        Part(flute2, rel=-7, pan=0.2, send=0.4, hp=300),
        Part(harp, rel=-6, pan=0.3, send=0.3, hp=180),
        Part(strings, rel=-9, pan=0.0, send=0.4, hp=140, eq=PAD_EQ),
        Part(violins, rel=-10, pan=-0.2, send=0.45, hp=300, eq=PAD_EQ + [(6000, 3.0, 0.8)]),
        Part(cello, rel=-9, pan=-0.2, send=0.25, hp=50, eq=[(250, -2.0, 1.0)]),
        Part(celesta, rel=-10, pan=0.4, send=0.45, hp=600),
        Part(timp, rel=-15, pan=0.0, send=0.3, hp=45, swing_ms=3),
        Part(perc, rel=-14, pan=-0.35, send=0.2, hp=2000, swing_ms=3),
    ]
    return Arrangement("music.menu", 84, 16, parts, reverb_s=2.8, reverb_damp=8000, reverb_wet=0.26, target_lufs=-17.0, air_db=4.0, presence_db=1.0)


# ------------------------------------------------------------------------------------------------
# Capsule room: a light, sparkling loop on the A section (C, 100 BPM, 16 bars)


def capsule(key: int = 0) -> Arrangement:
    prog = HARMONY[:8] * 2

    def ch(b: int) -> str:
        return prog[b % 16]

    cel = t("celesta", P["celesta"])
    add_melody(cel, key, range(0, 8), vel=84, legato=0.6, start_bar=0)
    box = t("music box", P["musicbox"])
    for b in range(8, 16):
        c = ch(b)
        top = voicing(c, 76)
        for k, s in enumerate([0, 1, 2, 1, 0, 2, 1, 2]):
            box.add(bar(b) + k * 0.5, 0.5, top[s % len(top)] + key, 62 if k % 2 else 74)
    pizz = t("pizzicato", P["pizz"])
    marimba = t("marimba", P["marimba"])
    pad = t("pad", P["warm_pad"])
    shaker = t("shaker", KIT_STANDARD, drums=True)
    for b in range(16):
        c = ch(b)
        r2 = root(c, 2)
        pizz.add(bar(b), 0.5, r2 + key, 90)
        pizz.add(bar(b) + 2, 0.5, r2 + 7 + key, 80)
        for beat in (1, 3):
            for n in voicing(c, 60):
                pizz.add(bar(b) + beat, 0.4, n + key, 70)
        if b >= 8:
            v = voicing(c, root(c, 4))
            for k, s in enumerate([0, 1, 2, 1] * 2):
                marimba.add(bar(b) + k * 0.5 + 0.25, 0.3, v[s] + key, 60)
        for n in voicing(c, 55, 4):
            pad.add(bar(b), 3.95, n + key, 64)
        grid16(shaker, range(b, b + 1), SHAKER, [40, 0, 58, 0] * 4)
        if b % 4 == 3:
            shaker.add(bar(b) + 3.5, 0.5, TRIANGLE_OPEN, 50)
    parts = [
        Part(cel, rel=0, lead=True, pan=0.05, send=0.35, hp=300),
        Part(box, rel=-3, pan=-0.2, send=0.4, hp=400),
        Part(pizz, rel=-4, pan=0.15, send=0.25, hp=70),
        Part(marimba, rel=-8, pan=0.35, send=0.25, hp=200),
        Part(pad, rel=-9, pan=0.0, send=0.35, hp=150, eq=PAD_EQ),
        Part(shaker, rel=-12, pan=-0.3, send=0.15, hp=500, swing_ms=2),
    ]
    return Arrangement("music.capsule", 100, 16, parts, reverb_s=2.4, reverb_damp=7000, reverb_wet=0.25, target_lufs=-18.0)


# ------------------------------------------------------------------------------------------------
# Stingers, one per age key (C, D, E, F, F#: the battle ends in the key of the age it reached, and
# `musicEngine` plays the stinger recorded in that key)

STINGER_KEYS = (0, 2, 4, 5, 6)
# The eight-age chain (A17.8) also ends battles in G (Modern, +7), G# (Future, +8) and A (Cosmic, +9).
STINGER_KEYS_A17 = (7, 8, 9)


def stinger_cue(base: str, key: int) -> str:
    """'stinger.victory' in C; 'stinger.victory.k2' ... 'stinger.victory.k6' in the other keys."""
    return base if key == 0 else f"{base}.k{key}"


def victory(key: int = 0) -> Arrangement:
    line = [(0, 0.5, "C5"), (0.5, 0.25, "G4"), (0.75, 0.25, "C5"), (1, 1, "E5"), (2, 0.5, "G5"), (2.5, 0.25, "E5"), (2.75, 0.25, "G5"), (3, 5, "C6")]
    lead = -12 if key > 6 else 0  # past +6 the lead drops an octave (A17.8)
    trumpet = t("trumpets", P["trumpet"])
    horn = t("horns", P["horn"])
    for beat, dur, name in line:
        trumpet.add(beat, dur * 0.95, m(name) + key + lead, 104 if beat in (0, 3) else 92)
        horn.add(beat, dur * 0.95, m(name) - 12 + key + lead, 96)
    brass = t("brass chords", P["brass"])
    for beat, dur, c in [(0, 1, "C"), (1, 1, "C"), (2, 1, "G"), (3, 5, "C")]:
        for n in voicing(c, 52, 4):
            brass.add(beat, dur * 0.95, n + key, 92 if beat < 3 else 100)
    strings = t("strings", P["tremolo"])
    for n in voicing("C", 60, 4):
        strings.add(3, 5, n + key, 90)
    for n in voicing("C", 48, 3):
        strings.add(3, 5, n + key, 90)
    bass = t("bass", P["contrabass"])
    for beat, dur, iv in [(0, 1, 0), (1, 1, 0), (2, 1, 7), (3, 5, 0)]:
        bass.add(beat, dur, 36 + iv + key, 100)
    timp = t("timpani", P["timpani"])
    for k in range(8):
        timp.add(2 + k * 0.125, 0.12, (43 if k % 2 else 36) + key, 70 + k * 5)
    timp.add(3, 2, 36 + key, 120)
    glock = t("glock", P["glock"])
    for k, n in enumerate(["C6", "E6", "G6", "C7"]):
        glock.add(3 + k * 0.125, 1.5, m(n) + key - 12 + lead, 88)
    kit = t("kit", KIT_ORCH, drums=True)
    for k in range(8):
        kit.add(2 + k * 0.125, 0.12, SNARE, 60 + k * 6)
    kit.add(3, 2, CRASH, 110)
    kit.add(3, 1, KICK, 110)
    parts = [
        Part(trumpet, rel=0, lead=True, pan=0.1, send=0.3, hp=200, eq=[(3000, -3.0, 1.0)], swing_ms=0),  # a fanfare: tame the bite
        Part(horn, rel=-3, pan=-0.2, send=0.3, hp=100, swing_ms=0),
        Part(brass, rel=-4, pan=0.0, send=0.3, hp=110, eq=PAD_EQ, swing_ms=0),
        Part(strings, rel=-6, pan=0.0, send=0.35, hp=120, eq=PAD_EQ, swing_ms=0),
        Part(bass, rel=-6, pan=0.0, send=0.1, hp=40, swing_ms=0),
        Part(timp, rel=-4, pan=0.0, send=0.25, hp=45, swing_ms=0),
        Part(glock, rel=-9, pan=0.3, send=0.4, hp=600, swing_ms=0),
        Part(kit, rel=-5, pan=0.0, send=0.2, hp=50, swing_ms=0),
    ]
    return Arrangement(stinger_cue("stinger.victory", key), 120, 3, parts, loop=False, reverb_s=2.4, reverb_wet=0.26, target_lufs=-15.0, tail_s=3.0, air_db=2.0, presence_db=-2.5)


def defeat(key: int = 0) -> Arrangement:
    horn = t("horn", P["horn"])
    # Beat 4 sits on Eb over the Ab chord (a D there would clash with the Ab a tritone below).
    for beat, dur, name in [(0, 1, "C5"), (1, 0.5, "G4"), (1.5, 0.5, "C5"), (2, 2, "Eb5"), (4, 1.5, "Eb5"), (5.5, 0.5, "C5"), (6, 2, "B4"), (8, 4, "C5")]:
        horn.add(beat, dur * 0.97, m(name) - 12 + key, 84)
    strings = t("strings", P["strings"])
    cello = t("cello", P["cello"])
    for beat, dur, c, r in [(0, 4, "Cm", "C2"), (4, 2, "Ab", "Ab1"), (6, 2, "G", "G1"), (8, 4, "C", "C2")]:
        for n in voicing(c, 55):
            strings.add(beat, dur * 0.98, n + key, 70)
        cello.add(beat, dur * 0.98, m(r) + 12 + key, 78)
    harp = t("harp", P["harp"])
    for k, n in enumerate(["C3", "G3", "C4", "E4", "G4", "C5"]):
        harp.add(8 + k * 0.12, 3, m(n) + key, 70)
    cel = t("celesta", P["celesta"])
    for k, n in enumerate(["E5", "G5", "C6"]):
        cel.add(8.5 + k * 0.33, 1.5, m(n) + key, 56)
    parts = [
        Part(horn, rel=0, lead=True, pan=-0.05, send=0.38, hp=100, swing_ms=0),
        Part(strings, rel=-5, pan=0.0, send=0.4, hp=120, eq=PAD_EQ, swing_ms=0),
        Part(cello, rel=-7, pan=-0.2, send=0.3, hp=50, swing_ms=0),
        Part(harp, rel=-6, pan=0.3, send=0.4, hp=120, swing_ms=0),
        Part(cel, rel=-10, pan=0.35, send=0.5, hp=500, swing_ms=0),
    ]
    return Arrangement(stinger_cue("stinger.defeat", key), 80, 3, parts, loop=False, reverb_s=2.8, reverb_wet=0.3, target_lufs=-17.0, tail_s=3.5, air_db=2.5)


# ------------------------------------------------------------------------------------------------
# Adaptive layer stems (4 bars at 110 BPM, so they loop in step with the 44-bar main loop)
#
# `intensity` is pitched per age: an 8th-note tonic-octave ostinato (a pedal point, which sits under
# every chord of the loop) in strings or brass, plus top-band percussion; everything is high-passed at
# 150 Hz so it adds drive, not mud. `overdrive` is percussion only: 16th hats and tambourine, 8th
# kick, a snare accent on beat 4 and a roll into every fourth bar.

STEM_BARS = 4
STEM_LUFS = -22.0
AGE_KEYS = {"stone": 0, "medieval": 2, "gunpowder": 4, "modern": 5, "future": 6, "bronze": 2, "industrial": 6, "cosmic": 9}


def _stem(cue: str, parts: list[Part], lufs: float) -> Arrangement:
    return Arrangement(cue, BPM, STEM_BARS, parts, reverb_s=1.2, reverb_wet=0.12, target_lufs=lufs, ceiling_db=-3.0, air_db=0.0)


def _pedal(tr: Track, key: int, low: int, vels: tuple[int, int] = (92, 70), length: float = 0.3) -> None:
    """8th notes on the tonic, octave leaps on the off-beats: C4 C5 C4 C4 C5 C4 C5 C4 (in the key)."""
    pattern = [0, 12, 0, 0, 12, 0, 12, 0]
    for b in range(STEM_BARS):
        for k, iv in enumerate(pattern):
            tr.add(bar(b) + k * 0.5, length, low + key + iv, vels[0] if k % 2 == 0 else vels[1])


def intensity(age: str) -> Arrangement:
    key = AGE_KEYS[age]
    kit_no = {"stone": KIT_STANDARD, "medieval": KIT_STANDARD, "gunpowder": KIT_STANDARD, "modern": KIT_POWER, "future": KIT_808,
              "bronze": KIT_STANDARD, "industrial": KIT_STANDARD, "cosmic": KIT_ELECTRONIC}[age]
    prog, low = {"stone": (P["strings"], 48), "medieval": (P["brass"], 48), "gunpowder": (P["trumpet"], 60), "modern": (P["strings2"], 48), "future": (P["saw"], 48),
                 "bronze": (P["horn"], 48), "industrial": (P["accordion"], 48), "cosmic": (P["synth_brass"], 48)}[age]
    ost = t(f"ostinato {age}", prog)
    _pedal(ost, key, low, length=0.2 if age in ("future", "cosmic") else 0.28)
    d = t(f"top perc {age}", kit_no, drums=True)
    bars = range(STEM_BARS)
    if age == "stone":
        grid16(d, bars, SHAKER, [60, 36, 50, 36] * 4)
        drum_pattern(d, bars, [(0.5, BONGO_H, 70), (1.5, BONGO_L, 64), (2.25, BONGO_H, 64), (3, BONGO_H, 60), (3.25, BONGO_L, 60)])
    elif age in ("medieval", "gunpowder"):
        grid16(d, bars, TAMB, [66, 30, 46, 30] * 4)
        drum_pattern(d, bars, [(3.5, TOM_H, 70), (3.75, TOM_HM, 76)])
    elif age == "modern":
        grid16(d, bars, HAT, [70, 40, 56, 40] * 4)
        drum_pattern(d, bars, [(1, TAMB, 70), (3, TAMB, 70)])
        drum_pattern(d, range(3, 4), [(3, TOM_H, 80), (3.25, TOM_H, 84), (3.5, TOM_HM, 88), (3.75, TOM_HM, 92)])
    elif age == "bronze":
        grid16(d, bars, TAMB, [64, 28, 44, 34] * 4)
        drum_pattern(d, bars, [(0.5, CONGA_MUTE, 66), (1.5, CONGA_MUTE, 60), (2.25, CONGA_OPEN, 64), (3, OPEN_TRI, 50), (3.5, CONGA_MUTE, 62)])
    elif age == "industrial":
        grid16(d, bars, SHAKER, [66, 40, 54, 40] * 4)
        drum_pattern(d, bars, [(1, CLAVES, 58), (3, CLAVES, 58), (3.5, TOM_H, 70), (3.75, TOM_HM, 76)])
    elif age == "cosmic":
        grid16(d, bars, HAT, [66, 36, 56, 36] * 4)
        drum_pattern(d, bars, [(1, CLAP, 62), (3, CLAP, 66), (3.75, TOM_H, 64)])
    else:
        grid16(d, bars, HAT, [64, 40, 70, 40] * 4)
        drum_pattern(d, bars, [(0.75, TOM_H, 66), (2.75, TOM_HM, 66)])
    parts = [
        Part(ost, rel=0, lead=True, hp=150, send=0.15, pump=0.3 if age in ("future", "cosmic") else 0.0, eq=[(300, -3.0, 1.0)] + ([(3000, -4.0, 0.8)] if age in ("gunpowder", "future", "cosmic") else [])),
        Part(d, rel=-3, hp=150, send=0.1, swing_ms=2),
    ]
    return _stem(f"layer.intensity.{age}", parts, STEM_LUFS)


def overdrive() -> Arrangement:
    d = t("overdrive", KIT_STANDARD, drums=True)
    bars = range(STEM_BARS)
    grid16(d, bars, HAT, [72, 40, 56, 40] * 4)
    grid16(d, bars, TAMB, [0, 44, 0, 52] * 4)
    drum_pattern(d, bars, [(k * 0.5, KICK, 100 if k % 2 == 0 else 78) for k in range(8)])
    drum_pattern(d, range(0, 3), [(3, SNARE, 96)])
    roll(d, 3, SNARE, 3, 4, 50, 104, 0.125)  # a roll into every fourth bar (the stem loops every 4 bars)
    stem = _stem("layer.overdrive", [Part(d, rel=0, lead=True, hp=60, swing_ms=1)], -22.0)
    stem.ceiling_db = -6.0  # kick transients overshoot ~3 dB after low-bitrate Opus encoding
    return stem


def all_music() -> list[Arrangement]:
    stingers = [victory(k) for k in STINGER_KEYS] + [defeat(k) for k in STINGER_KEYS]
    stingers += [victory(k) for k in STINGER_KEYS_A17] + [defeat(k) for k in STINGER_KEYS_A17]
    return [menu(), capsule(), stone(), medieval(), gunpowder(), modern(), future(), bronze(), industrial(), cosmic()] + stingers


def all_stems() -> list[Arrangement]:
    return [intensity(a) for a in ("stone", "medieval", "gunpowder", "modern", "future", "bronze", "industrial", "cosmic")] + [overdrive()]


def humanize(tr: Track, rng: np.random.Generator, bpm: float, spread_ms: float, vel_jitter: int) -> None:
    if spread_ms <= 0 and vel_jitter <= 0:
        return
    beats_per_ms = bpm / 60000
    for n in tr.notes:
        if spread_ms > 0:
            n.beat = max(0.0, n.beat + float(rng.uniform(-spread_ms, spread_ms)) * beats_per_ms)
        if vel_jitter > 0:
            n.vel = int(max(1, min(127, n.vel + int(rng.integers(-vel_jitter, vel_jitter + 1)))))
