"""General MIDI rendering through FluidSynth and the FluidR3_GM soundfont (MIT licence).

`Track` holds notes in beats; `render_tracks` writes one MIDI file per track and renders each to its
own stem (so the mixer can EQ, pan and send every instrument separately). Renders are cached by a hash
of the MIDI bytes under `tools/audio/.cache/` (git-ignored), so re-running the pipeline only renders
what changed.
"""
from __future__ import annotations

import hashlib
import os
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

import mido
import numpy as np
import soundfile as sf

from dsp import SR

SOUNDFONT = os.environ.get("AGEBORN_SF2", "/usr/share/sounds/sf2/FluidR3_GM.sf2")
CACHE = Path(__file__).resolve().parents[1] / ".cache" / "gm"
TPB = 480  # MIDI ticks per beat


@dataclass
class Note:
    beat: float  # start, in beats
    dur: float  # length, in beats
    midi: int
    vel: int = 96


@dataclass
class Track:
    name: str
    program: int  # GM program 0-127 (for drums: the kit number, bank 128)
    notes: list[Note] = field(default_factory=list)
    drums: bool = False
    bank: int = 0
    # Continuous controllers as (beat, cc, value); e.g. CC11 expression swells.
    ccs: list[tuple[float, int, int]] = field(default_factory=list)
    # Pitch bends as (beat, value -8192..8191).
    bends: list[tuple[float, int]] = field(default_factory=list)

    def add(self, beat: float, dur: float, midi: int, vel: int = 96) -> "Track":
        self.notes.append(Note(beat, dur, int(midi), int(max(1, min(127, vel)))))
        return self


def _midi_bytes(track: Track, bpm: float) -> bytes:
    mid = mido.MidiFile(ticks_per_beat=TPB)
    mt = mido.MidiTrack()
    mid.tracks.append(mt)
    ch = 9 if track.drums else 0
    events: list[tuple[int, int, mido.Message | mido.MetaMessage]] = []
    events.append((0, 0, mido.MetaMessage("set_tempo", tempo=mido.bpm2tempo(bpm))))
    if track.drums:
        events.append((0, 1, mido.Message("program_change", channel=ch, program=track.program)))
    else:
        events.append((0, 1, mido.Message("control_change", channel=ch, control=0, value=track.bank)))
        events.append((0, 1, mido.Message("program_change", channel=ch, program=track.program)))
    # Dry: the pipeline adds its own reverb and chorus.
    events.append((0, 1, mido.Message("control_change", channel=ch, control=91, value=0)))
    events.append((0, 1, mido.Message("control_change", channel=ch, control=93, value=0)))
    events.append((0, 1, mido.Message("control_change", channel=ch, control=7, value=127)))
    events.append((0, 1, mido.Message("control_change", channel=ch, control=11, value=127)))
    for b, cc, v in track.ccs:
        events.append((int(round(b * TPB)), 2, mido.Message("control_change", channel=ch, control=cc, value=int(v))))
    for b, v in track.bends:
        events.append((int(round(b * TPB)), 2, mido.Message("pitchwheel", channel=ch, pitch=int(v))))
    for n in track.notes:
        on = int(round(n.beat * TPB))
        off = max(on + 1, int(round((n.beat + n.dur) * TPB)))
        events.append((on, 4, mido.Message("note_on", channel=ch, note=n.midi, velocity=n.vel)))
        events.append((off, 3, mido.Message("note_off", channel=ch, note=n.midi, velocity=0)))
    events.sort(key=lambda e: (e[0], e[1]))
    last = 0
    for tick, _, msg in events:
        msg.time = tick - last
        last = tick
        mt.append(msg)
    mt.append(mido.MetaMessage("end_of_track", time=TPB * 8))
    import io

    buf = io.BytesIO()
    mid.save(file=buf)
    return buf.getvalue()


def render_track(track: Track, bpm: float, seconds: float | None = None, gain: float = 0.5) -> np.ndarray:
    """Renders one track to a stereo float array at 48 kHz (cached)."""
    data = _midi_bytes(track, bpm)
    key = hashlib.sha1(data + f"{gain}".encode() + SOUNDFONT.encode()).hexdigest()[:20]
    CACHE.mkdir(parents=True, exist_ok=True)
    wav = CACHE / f"{key}.wav"
    if not wav.exists():
        mid_path = CACHE / f"{key}.mid"
        mid_path.write_bytes(data)
        tmp = CACHE / f"{key}.tmp.wav"
        cmd = [
            shutil.which("fluidsynth") or "fluidsynth", "-ni", "-q",
            "-g", str(gain), "-r", str(SR),
            "-o", "synth.reverb.active=0", "-o", "synth.chorus.active=0",
            "-o", "synth.polyphony=512", "-o", "audio.file.format=float",
            "-F", str(tmp), SOUNDFONT, str(mid_path),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        tmp.rename(wav)
        mid_path.unlink(missing_ok=True)
    x, sr = sf.read(str(wav), dtype="float64", always_2d=True)
    assert sr == SR
    if seconds is not None:
        n = int(round(seconds * SR))
        x = x[:n] if len(x) >= n else np.vstack([x, np.zeros((n - len(x), x.shape[1]))])
    return x


def one_shot(program: int, midi: int, dur: float = 0.5, vel: int = 110, drums: bool = False, tail: float = 1.5, bpm: float = 120) -> np.ndarray:
    """A single GM note as a mono array (for layering into effects)."""
    beats = dur * bpm / 60
    t = Track("shot", program, drums=drums).add(0, beats, midi, vel)
    x = render_track(t, bpm, seconds=dur + tail)
    return x.mean(axis=1)


def phrase(program: int, notes: list[tuple[float, float, int, int]], drums: bool = False, tail: float = 1.5, bpm: float = 120) -> np.ndarray:
    """Several GM notes (start s, length s, midi, velocity) as a mono array."""
    t = Track("phrase", program, drums=drums)
    end = 0.0
    for s, d, m, v in notes:
        t.add(s * bpm / 60, d * bpm / 60, m, v)
        end = max(end, s + d)
    return render_track(t, bpm, seconds=end + tail).mean(axis=1)
