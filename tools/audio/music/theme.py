""""Dawn March", Ageborn's own theme (DESIGN A13), as note data for the file pipeline.

The same 16 bars as `src/audio/scores/dawnMarch.ts` (the synthesized fallback), so the files and the
fallback sing the same tune: A (rising call), A' (reaches higher, comes home), B (bridge Am-Dm-G-G7, ending
in a scale run up to the top C), A'' (the call from the top, then home). 110 BPM, C major before
transposition.
"""
from __future__ import annotations

NOTE = {"C": 0, "D": 2, "E": 4, "F": 5, "G": 7, "A": 9, "B": 11}


def m(name: str) -> int:
    """'C5' -> 72, 'Eb4' -> 63, 'F#3' -> 54."""
    pc = NOTE[name[0]]
    rest = name[1:]
    if rest.startswith("#"):
        pc += 1
        rest = rest[1:]
    elif rest.startswith("b"):
        pc -= 1
        rest = rest[1:]
    return 12 * (int(rest) + 1) + pc


BPM = 110

# Bars of (note or None, length in 16th steps); every bar sums to 16.
MELODY = [
    # A
    [("C5", 4), ("G4", 2), ("C5", 2), ("E5", 6), ("D5", 2)],
    [("C5", 3), ("D5", 1), ("E5", 4), ("G5", 8)],
    [("A5", 4), ("G5", 2), ("E5", 2), ("F5", 4), ("D5", 4)],
    [("D5", 3), ("C5", 1), ("B4", 4), ("D5", 8)],
    # A'
    [("C5", 4), ("G4", 2), ("C5", 2), ("E5", 6), ("D5", 2)],
    [("C5", 3), ("D5", 1), ("E5", 4), ("A5", 8)],
    [("G5", 2), ("A5", 2), ("G5", 2), ("E5", 2), ("D5", 6), ("G4", 2)],
    [("C5", 12), (None, 4)],
    # B
    [("A4", 2), ("C5", 2), ("E5", 4), ("A5", 4), ("G5", 4)],
    [("F5", 6), ("E5", 2), ("D5", 4), ("C5", 4)],
    [("B4", 2), ("D5", 2), ("G5", 4), ("F5", 4), ("D5", 4)],
    [("D5", 2), ("E5", 2), ("F5", 2), ("G5", 2), ("A5", 2), ("B5", 2), ("A5", 2), ("B5", 2)],
    # A''
    [("C6", 6), ("G5", 2), ("A5", 4), ("G5", 4)],
    [("F5", 4), ("A5", 4), ("G5", 4), ("E5", 4)],
    [("D5", 4), ("G5", 2), ("F5", 2), ("E5", 4), ("D5", 4)],
    [("C5", 12), (None, 4)],
]

HARMONY = ["C", "C", "F", "G", "C", "Am", "G", "C", "Am", "Dm", "G", "G7", "C", "F", "G", "C"]

CHORDS = {
    "C": (0, (0, 4, 7)),
    "Dm": (2, (0, 3, 7)),
    "Em": (4, (0, 3, 7)),
    "F": (5, (0, 4, 7)),
    "G": (7, (0, 4, 7)),
    "Am": (9, (0, 3, 7)),
    "E": (4, (0, 4, 7)),
    "Cm": (0, (0, 3, 7)),
    "Ab": (8, (0, 4, 7)),
    "Fm": (5, (0, 3, 7)),
    "Bb": (10, (0, 4, 7)),
    "Eb": (3, (0, 4, 7)),
    "G7": (7, (0, 4, 7, 10)),
}

# The second theme of the battle loop ("B-theme", 12 bars): the Dawn March motif (root, fifth below,
# root, third) moved onto vi and IV, answered by a falling line; it ends on the dominant so the
# breakdown can land on C.
B2_MELODY = [
    [("A5", 4), ("E5", 2), ("A5", 2), ("C6", 6), ("B5", 2)],
    [("F5", 4), ("C5", 2), ("F5", 2), ("A5", 6), ("G5", 2)],
    [("E5", 3), ("F5", 1), ("G5", 4), ("E5", 4), ("C5", 4)],
    [("D5", 4), ("B4", 2), ("D5", 2), ("G5", 8)],
    [("F5", 4), ("A4", 2), ("D5", 2), ("F5", 6), ("E5", 2)],
    [("D5", 3), ("E5", 1), ("F5", 4), ("D5", 4), ("B4", 4)],
    [("E5", 4), ("G5", 2), ("B5", 2), ("G5", 4), ("E5", 4)],
    [("A5", 12), (None, 4)],
    [("C6", 4), ("A5", 2), ("F5", 2), ("A5", 4), ("C6", 4)],
    [("B5", 4), ("G5", 2), ("D5", 2), ("G5", 8)],
    [("A5", 4), ("F5", 2), ("C5", 2), ("F5", 4), ("A5", 4)],
    [("G5", 4), ("F5", 2), ("E5", 2), ("D5", 4), ("B4", 4)],
]
B2_HARMONY = ["Am", "F", "C", "G", "Dm", "G", "Em", "Am", "F", "G", "F", "G"]

# The battle loop (44 bars, 96 s at 110 BPM): a 4-bar groove intro, the 16-bar theme, the 12-bar
# B-theme, an 8-bar breakdown (drums, bass and ostinato, no melody) and a 4-bar turnaround.
INTRO = ["C", "F", "Am", "G"]
BREAK = ["C", "C", "Am", "Am", "F", "F", "G", "G"]
OUTRO = ["Am", "F", "Dm", "G"]
LOOP_CHORDS = INTRO + HARMONY + B2_HARMONY + BREAK + OUTRO
LOOP_BARS = len(LOOP_CHORDS)  # 44 bars
THEME_START = 4  # bar where the theme begins in the loop
B2_START = THEME_START + len(HARMONY)  # 20
BREAK_START = B2_START + len(B2_HARMONY)  # 32
OUTRO_START = BREAK_START + len(BREAK)  # 40

# The menu's own tune ("Hearth Song", 16 bars at 84 BPM): relaxed and stepwise, so the battle theme
# stays fresh. Bar 16 is a pickup back into bar 1.
MENU_MELODY = [
    [("E5", 8), ("D5", 4), ("C5", 4)],
    [("E5", 4), ("A5", 8), ("G5", 4)],
    [("F5", 6), ("E5", 2), ("D5", 4), ("C5", 4)],
    [("D5", 12), (None, 4)],
    [("E5", 8), ("D5", 4), ("C5", 4)],
    [("B4", 4), ("E5", 8), ("G5", 4)],
    [("A5", 6), ("G5", 2), ("F5", 4), ("A5", 4)],
    [("G5", 12), (None, 4)],
    [("C6", 8), ("B5", 4), ("A5", 4)],
    [("A5", 6), ("G5", 2), ("F5", 8)],
    [("G5", 4), ("E5", 4), ("C5", 4), ("E5", 4)],
    [("D5", 12), (None, 4)],
    [("F5", 4), ("A5", 4), ("C6", 4), ("A5", 4)],
    [("G5", 6), ("F5", 2), ("E5", 4), ("D5", 4)],
    [("C5", 12), (None, 4)],
    [(None, 4), ("G4", 4), ("B4", 4), ("D5", 4)],
]
MENU_HARMONY = ["C", "Am", "F", "G", "C", "Em", "F", "G", "Am", "F", "C", "G", "F", "G", "C", "G"]

C_MAJOR = [0, 2, 4, 5, 7, 9, 11]


def bars_notes(melody: list, start_bar: int = 0, octave: int = 0, bars: range | None = None) -> list[tuple[float, float, int]]:
    """Melody bars as (beat, beats, midi), the first bar placed at `start_bar`."""
    out = []
    idx = bars if bars is not None else range(len(melody))
    for b in idx:
        step = 0
        for name, ln in melody[b]:
            if name is not None:
                out.append(((start_bar + b) * 4 + step / 4, ln / 4, m(name) + 12 * octave))
            step += ln
    return out


def melody_notes(start_bar: int = 0, octave: int = 0, bars: range | None = None) -> list[tuple[float, float, int]]:
    """Theme as (beat, beats, midi) with the loop's bar offset applied."""
    return bars_notes(MELODY, start_bar, octave, bars)


def diatonic_below(midi: int, degrees: int) -> int:
    pc = midi % 12
    if pc not in C_MAJOR:
        return midi - 3
    i = C_MAJOR.index(pc) - degrees
    octave = midi // 12 + (i // 7)
    return octave * 12 + C_MAJOR[i % 7]


def voicing(chord: str, low: int, count: int | None = None) -> list[int]:
    """Chord tones from `low` upwards (close position), `count` notes (default: the chord's size)."""
    root, tones = CHORDS[chord]
    pcs = [(root + t) % 12 for t in tones]
    out = []
    x = low
    need = count or len(pcs)
    while len(out) < need:
        if x % 12 in pcs:
            out.append(x)
        x += 1
    return out


def root(chord: str, octave: int) -> int:
    return 12 * (octave + 1) + CHORDS[chord][0]


def fifth(chord: str, octave: int) -> int:
    return root(chord, octave) + 7
