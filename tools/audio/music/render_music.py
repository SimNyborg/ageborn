"""Renders every music cue and layer stem: MIDI -> FluidSynth stems -> mix -> master -> loop cut.

Seamless loops: the loop's notes are written three times in a row and rendered as one piece; the
file is cut from the middle pass with a short wrap-around margin on both sides (`LOOP_PAD_S`). The
middle pass already carries the reverb and release tails of the pass before it, and the margins hold
exactly the audio on the other side of the loop point, so any window of one loop length inside the
file loops without a seam, whatever start delay the browser's decoder adds.

Outputs go to `tools/audio/.cache/out/music/*.wav` (float masters, for analysis) and are encoded by
`build.py`.
"""
from __future__ import annotations

import json
import os
import sys
import zlib
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / "lib"))
sys.path.insert(0, str(HERE))

import dsp  # noqa: E402
import loud  # noqa: E402
from arrangements import Arrangement, Part, all_music, all_stems, humanize  # noqa: E402
from gm import Track, render_track  # noqa: E402

SR = dsp.SR
OUT = HERE.parent / ".cache" / "out" / "music"
LOOP_PAD_S = 0.3
REVERB_RETURN = 3.5  # return gain per unit of Arrangement.reverb_wet


def seed(*names: str) -> int:
    return zlib.crc32("|".join(names).encode()) & 0xFFFFFFFF


def pass_seconds(a: Arrangement) -> float:
    return a.bars * 4 * 60 / a.bpm


def process_part(x: np.ndarray, part: Part) -> np.ndarray:
    y = dsp.hp(x, part.hp, 2)
    if part.lp:
        y = dsp.lp(y, part.lp, 2)
    for f, g, q in part.eq:
        y = dsp.peq(y, f, g, q)
    if part.width != 1.0:
        mid = y.mean(axis=1, keepdims=True)
        y = mid + (y - mid) * part.width
    # Balance pan on a stereo stem (equal power, centre = unity).
    a = (part.pan + 1) * np.pi / 4
    y = y * np.array([np.cos(a), np.sin(a)]) * np.sqrt(2)
    return y


def pump_env(n: int, bpm: float, depth: float) -> np.ndarray:
    t = np.arange(n) / SR
    beat = 60 / bpm
    ph = (t % beat) / beat
    # Dip at every beat, recover over about a third of a beat (side-chain feel).
    return 1 - depth * np.exp(-ph / 0.12) * np.clip(ph / 0.01, 0, 1)


def duck_env(n: int, bpm: float, beats: tuple[float, ...], depth: float) -> np.ndarray:
    """Gain that dips by `depth` at the given beats of every bar and recovers over ~a quarter beat
    (a side-chain duck under another part's hits)."""
    t = np.arange(n) / SR
    beat = 60 / bpm
    pos = (t / beat) % 4.0
    g = np.ones(n)
    for b in beats:
        ph = (pos - b) % 4.0  # beats since the hit
        g = np.minimum(g, 1 - depth * np.exp(-ph / 0.22) * np.clip(ph / 0.02, 0, 1))
    return g


def siege_heartbeat(seconds: float, bpm: float) -> np.ndarray:
    """Heartbeat bass for the Siege layer: a lub-dub sub thump every two beats plus a soft tick."""
    n = dsp.n_of(seconds)
    out = np.zeros(n)
    beat = 60 / bpm
    rng = np.random.default_rng(7)

    def thump(f0: float, gain: float, dur: float = 0.42) -> np.ndarray:
        f = dsp.drop(f0 * 2.2, f0, dur, 0.03)
        body = dsp.osc(f, "sine") * dsp.env_exp(dur, 0.11, 0.004)
        click = dsp.lp(dsp.noise(0.02, rng), 900) * dsp.env_exp(0.02, 0.004)
        harm = dsp.osc(f * 2, "sine") * dsp.env_exp(dur, 0.05, 0.002) * 0.35  # audible on phones
        return dsp.layer(dsp.sat(body + harm, 1.5), (0.0, click, 0.6)) * gain

    lub, dub = thump(52, 1.0), thump(46, 0.7)
    tick = dsp.hp(dsp.noise(0.03, rng), 2500) * dsp.env_exp(0.03, 0.006) * 0.12
    k = 0.0
    while k * beat < seconds:
        i = int(k * beat * SR)
        for sig, off in ((lub, 0.0), (dub, 0.28 * beat)):
            j = i + int(off * SR)
            e = min(n, j + len(sig))
            if j < n:
                out[j:e] += sig[: e - j]
        k += 2
    k = 0.0
    while k * beat < seconds:
        i = int(k * beat * SR)
        e = min(n, i + len(tick))
        out[i:e] += tick[: e - i] * (1.0 if int(k) % 2 == 0 else 0.6)
        k += 1
    return np.stack([out, out], axis=1)


def future_riser(seconds_per_pass: float, bpm: float, passes: int, bars: int) -> np.ndarray:
    """Filtered noise risers into the theme and into the A'' section (Future only)."""
    bar_s = 4 * 60 / bpm
    n = dsp.n_of(seconds_per_pass * passes + 3)
    out = np.zeros((n, 2))
    rng = np.random.default_rng(11)
    for p in range(passes):
        for target_bar in (4, 16, 20, 40):
            dur = bar_s
            start = p * seconds_per_pass + (target_bar - 1) * bar_s
            x = dsp.noise(dur, rng, "pink")
            cut = dsp.glide(300, 7000, dur, 0.7)
            y = dsp.sweep_lp(x, cut, 1.2) * np.linspace(0, 1, len(x)) ** 2
            s = dsp.pan(y, -0.3) + dsp.pan(dsp.sweep_lp(dsp.noise(dur, rng, "pink"), cut, 1.2) * np.linspace(0, 1, len(x)) ** 2, 0.3)
            i = int(start * SR)
            out[i : i + len(s)] += s * 0.25
    return out


def fold(x: np.ndarray, period: int) -> np.ndarray:
    """Wraps everything past `period` samples back onto the start (a circular render of one pass)."""
    out = np.zeros((period,) + x.shape[1:])
    for k in range(0, len(x), period):
        seg = x[k : k + period]
        out[: len(seg)] += seg
    return out


def render_arrangement(a: Arrangement, verbose: bool = True) -> tuple[np.ndarray, dict]:
    """Renders one cue. A loop renders a single pass plus its tail with FluidSynth, folds the tail
    back onto the start (so the notes of the previous pass ring into bar 1 exactly as they would when
    looping) and tiles that three times for the time-varying processing (reverb, compression,
    limiting); the file is cut from the middle copy."""
    L = pass_seconds(a)
    render_s = L + a.tail_s
    period = int(round(L * SR))
    n = 3 * period if a.loop else dsp.n_of(render_s)
    rendered: list[tuple[Part, np.ndarray]] = []
    for part in a.parts:
        tr = Track(part.track.name, part.track.program, notes=[type(x)(x.beat, x.dur, x.midi, x.vel) for x in part.track.notes], drums=part.track.drums, bank=part.track.bank)
        humanize(tr, np.random.default_rng(seed(a.cue, part.track.name)), a.bpm, part.swing_ms, part.vel_jitter)
        x = render_track(tr, a.bpm, seconds=render_s)
        if a.loop:
            x = np.tile(fold(x, period), (3, 1))
        rendered.append((part, process_part(x, part).astype(np.float32)))

    # Balance: every part at its `rel` loudness relative to the lead (measured over the middle copy).
    lo, hi = (period, 2 * period) if a.loop else (0, n)
    lead_l = None
    for part, y in rendered:
        if part.lead:
            lead_l = loud.integrated_lufs(y[lo:hi], SR)
    assert lead_l is not None, f"{a.cue}: no lead part"
    dry = np.zeros((n, 2))
    send = np.zeros((n, 2))
    levels = {}
    for part, y in rendered:
        l_part = loud.integrated_lufs(y[lo:hi], SR)
        g = 0.0 if l_part < -90 else (lead_l + part.rel) - l_part
        y = y * dsp.db(g)
        if part.pump > 0:
            y = y * pump_env(len(y), a.bpm, part.pump)[:, None]
        if part.duck is not None:
            y = y * duck_env(len(y), a.bpm, part.duck[0], part.duck[1])[:, None]
        levels[part.track.name] = round(l_part + g, 1)
        if os.environ.get("AUDIO_DEBUG"):
            bb = loud.band_balance(y[lo:hi], SR)
            print(f"    {part.track.name:18s} " + " ".join(f"{k} {v:6.1f}" for k, v in bb.items()))
        dry += dsp.pad_to(y, n)
        send += dsp.pad_to(y, n) * part.send
    for ex in a.extras:
        e = ex(L, 1)
        if a.loop:
            e = np.tile(fold(e, period), (3, 1))
        dry += dsp.pad_to(e, n)

    h = dsp.ir(a.reverb_s, np.random.default_rng(seed(a.cue, "ir")), predelay=0.018, damp_hz=a.reverb_damp)
    wet = dsp.convolve(dsp.hp(send, 180, 2), h)[:n] * a.reverb_wet * REVERB_RETURN
    mix = master(dry + wet, a, lo, hi)

    if a.loop:
        pad = dsp.n_of(LOOP_PAD_S)
        out = mix[period - pad : 2 * period + pad]
        meta = {"loopStart": LOOP_PAD_S, "loopLength": period / SR}
    else:
        out = dsp.trim(mix, floor_db=-50, tail_fade=0.6, head=False)
        cap = dsp.n_of(L + 2.5)
        if len(out) > cap:
            out = dsp.fade(out[:cap], 0, 1.2)
        meta = {}
    info = {"cue": a.cue, "seconds": round(len(out) / SR, 3), **meta, "parts": levels}
    if verbose:
        print(f"  {a.cue}: {info['seconds']} s, lead {lead_l:.1f} LUFS, parts {levels}")
    return out, info


def master(mix: np.ndarray, a: Arrangement, lo: int, hi: int) -> np.ndarray:
    y = dsp.hp(mix, 30, 2)
    y = dsp.peq(y, 240, -1.5, 0.8)  # clear the low-mid mud
    # No presence cut: the parts carry their own EQ, and the music must stay clear on small speakers.
    if a.presence_db:
        y = dsp.peq(y, 3500, a.presence_db, 0.7)  # clarity on small speakers
    if a.low_db:
        y = dsp.shelf(y, 110, a.low_db, high=False)  # lighter sub where drums pile up below 100 Hz
    y = dsp.shelf(y, 9000, a.air_db, high=True)  # a little air
    # Pre-gain to a known level, then gentle glue compression.
    l0 = loud.integrated_lufs(y[lo:hi], SR)
    y = y * dsp.db(-20 - l0)
    y = dsp.compress(y, threshold_db=-16, ratio=2.0, attack=0.02, release=0.25, knee_db=8)
    for _ in range(3):
        l1 = loud.integrated_lufs(y[lo:hi], SR)
        y = y * dsp.db(a.target_lufs - l1)
        y = dsp.limit(y, ceiling_db=a.ceiling_db, lookahead=0.004, release=0.1)
    return y


def render_siege() -> tuple[np.ndarray, dict]:
    from arrangements import BPM, STEM_BARS

    L = STEM_BARS * 4 * 60 / BPM
    period = int(round(L * SR))
    x = np.tile(fold(siege_heartbeat(L + 1, BPM), period), (3, 1))
    x = dsp.hp(x, 28, 2)
    lo, hi = period, 2 * period
    lvl = loud.integrated_lufs(x[lo:hi], SR)
    x = x * dsp.db(-21 - lvl)
    x = dsp.limit(x, -6.0)
    pad = dsp.n_of(LOOP_PAD_S)
    out = x[period - pad : 2 * period + pad]
    return out, {"cue": "layer.siege", "seconds": round(len(out) / SR, 3), "loopStart": LOOP_PAD_S, "loopLength": period / SR}


def main(only: list[str] | None = None) -> dict:
    """Renders the cues in `only` (default: all) and returns the merged index of every rendered cue."""
    OUT.mkdir(parents=True, exist_ok=True)
    arrs = all_music() + all_stems()
    for a in arrs:
        if a.cue == "music.future":
            a.extras.append(lambda L, p, a=a: future_riser(L, a.bpm, p, a.bars))
    for a in arrs:
        if only and a.cue not in only:
            continue
        out, info = render_arrangement(a)
        sf.write(str(OUT / f"{a.cue}.wav"), out.astype(np.float32), SR, subtype="FLOAT")
        (OUT / f"{a.cue}.json").write_text(json.dumps(info))
    if not only or "layer.siege" in only:
        out, info = render_siege()
        sf.write(str(OUT / "layer.siege.wav"), out.astype(np.float32), SR, subtype="FLOAT")
        (OUT / "layer.siege.json").write_text(json.dumps(info))
    index = {p.stem: json.loads(p.read_text()) for p in sorted(OUT.glob("*.json")) if p.stem != "index"}
    (OUT / "index.json").write_text(json.dumps(index, indent=1))
    return index


def cue_names() -> list[str]:
    return [a.cue for a in all_music() + all_stems()] + ["layer.siege"]


if __name__ == "__main__":
    main(sys.argv[1:] or None)
