"""Numerical listening test for the rendered audio (we cannot listen, so we measure).

For every file: sample and true peak, loudness (integrated LUFS for music, loudest 200 ms window for
effects), energy per band (sub, low, mid, presence 2-5 kHz, air, top) and how far the strongest
1/3 octave in 2-5 kHz sticks out ("presence peak", harshness). Loops also get a seam check: the
audio one loop length apart must match inside the wrap-around margin.

Usage: python analyze.py [music|sfx|encoded] [--csv]
Reads the float masters in `.cache/out`, or with `encoded` decodes the shipped files in public/audio.
Flags lines that break the targets in README.md with `!`.
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy import signal

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "lib"))
import loud  # noqa: E402

SR = 48000
CACHE = HERE / ".cache" / "out"
PUBLIC = HERE.parents[1] / "public" / "audio"


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ar", str(SR), "-"], check=True, capture_output=True).stdout
    x = np.frombuffer(raw, dtype=np.float32).astype(np.float64)
    info = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=channels", "-of", "csv=p=0", str(path)], capture_output=True, text=True).stdout.strip()
    ch = int(info.split("\n")[0] or 1)
    return x.reshape(-1, ch) if ch > 1 else x


def seam_error(x: np.ndarray, loop_start: float, loop_len: float) -> float:
    """RMS difference (dB relative to the signal) between the audio just past the loop end and
    the audio just past the loop start, which must be identical for a seamless loop."""
    a = int(round(loop_start * SR))
    b = int(round((loop_start + loop_len) * SR))
    k = min(int(0.2 * SR), len(x) - b)
    if k <= 0:
        return 0.0
    s1, s2 = x[a : a + k], x[b : b + k]
    err = np.sqrt(np.mean((s1 - s2) ** 2))
    ref = np.sqrt(np.mean(s1**2)) + 1e-12
    return float(20 * np.log10(err / ref + 1e-12))


def check_music(encoded: bool = False) -> list[str]:
    idx = json.loads((CACHE / "music" / "index.json").read_text())
    lines = []
    for cue, info in sorted(idx.items()):
        if encoded:
            found = sorted((PUBLIC / "music").glob(f"{cue}.*.ogg"))
            if not found:
                continue
            path = found[0]
        else:
            path = CACHE / "music" / f"{cue}.wav"
        x = decode(path) if encoded else sf.read(str(path), dtype="float64")[0]
        r = loud.report(x, SR)
        flag = []
        if r["tp"] > -0.5:
            flag.append("true peak")
        if r["band_presence"] > -9:
            flag.append("presence heavy")
        if r["band_sub"] + 0 > -4 and not cue.startswith("layer.siege"):
            flag.append("sub heavy")
        seam = ""
        if "loopLength" in info:
            e = seam_error(x, info["loopStart"], info["loopLength"])
            seam = f" seam {e:6.1f} dB"
            if e > -30 and not encoded:
                flag.append("seam")
        lines.append(
            f"{'!' if flag else ' '} {cue:26s} {r['lufs']:6.1f} LUFS  pk {r['peak']:5.1f}  tp {r['tp']:5.1f}  "
            f"sub {r['band_sub']:5.1f} low {r['band_low']:5.1f} mid {r['band_mid']:5.1f} pres {r['band_presence']:5.1f} "
            f"air {r['band_air']:5.1f} top {r['band_top']:5.1f}{seam} {' '.join(flag)}"
        )
    return lines


def check_sfx() -> list[str]:
    idx = json.loads((CACHE / "sfx" / "index.json").read_text())
    groups = json.loads((HERE / ".cache" / "sounds.json").read_text())["sounds"]
    lines = []
    for sid, info in idx.items():
        worst = []
        for k in range(info["variants"]):
            x = sf.read(str(CACHE / "sfx" / f"{sid}.{k}.wav"), dtype="float64")[0]
            r = loud.report(x, SR, short=True)
            r["len"] = len(x) / SR
            # Phone/laptop speaker model: 4th-order band pass 350 Hz-12 kHz (as in sfx/render_sfx.py).
            r["phone"] = loud.max_window_lufs(signal.sosfilt(signal.butter(4, [350, 12000], "bandpass", fs=SR, output="sos"), x), SR) - r["lufs"]
            worst.append(r)
        r = worst[0]
        spread = max(w["lufs"] for w in worst) - min(w["lufs"] for w in worst)
        flag = []
        if max(w["tp"] for w in worst) > -0.8:
            flag.append("true peak")
        if abs(r["lufs"] - info["target"]) > 1.5:
            flag.append(f"off target {info['target']}")
        if spread > 2.0:
            flag.append("variant spread")
        if info.get("noisy") and max(w["presence_peak"] for w in worst) > 9:
            flag.append("harsh")
        if min(w["phone"] for w in worst) < info.get("phone_gap", -4.0) - 1.0:
            flag.append("weak on phones")
        lines.append(
            f"{'!' if flag else ' '} {sid:26s} {groups.get(sid, {}).get('group', '?'):9s} x{info['variants']} {r['len']:4.2f}s  {r['lufs']:6.1f} LU(200ms)  tp {r['tp']:5.1f}  "
            f"sub {r['band_sub']:5.1f} low {r['band_low']:5.1f} pres {r['band_presence']:5.1f} ppk {r['presence_peak']:5.1f} phone {r['phone']:5.1f} {' '.join(flag)}"
        )
    return lines


if __name__ == "__main__":
    what = sys.argv[1] if len(sys.argv) > 1 else "all"
    out = []
    if what in ("all", "music"):
        out += ["# music (float masters)"] + check_music()
    if what in ("all", "encoded"):
        out += ["# music (decoded from public/audio)"] + check_music(encoded=True)
    if what in ("all", "sfx"):
        out += ["# sfx (float masters)"] + check_sfx()
    print("\n".join(out))
    bad = [line for line in out if line.startswith("!")]
    print(f"\n{len(bad)} flagged")
