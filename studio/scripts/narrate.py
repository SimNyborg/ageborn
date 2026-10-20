#!/usr/bin/env python3
"""Build a Reel's narration from a script (docs/voice.md round 1, Kokoro bm_george).

Usage: /tmp/soc/.venv/bin/python scripts/narrate.py work/<id>

Reads work/<id>/script.json: {"lead": 0.15, "lines": [{"key": "l0", "text": "...", "gap": 0.4}, ...]}
("gap" is the pause after the line, default 0.4 s). Writes work/<id>/<key>.wav per line (processed,
48 kHz mono), work/<id>/narration.wav (all lines at their offsets), work/<id>/lines.json (the texts, in
order) and work/<id>/offsets.json ({key: [start_s, dur_s], "end": s}), the format the reel edits read.
"""
import json
import os
import subprocess
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

MODELS = "/tmp/soc/tts-models"
FX = ("asetrate=24000*0.93,aresample=48000,atempo=1.0753,equalizer=f=110:t=q:w=1:g=4,"
      "equalizer=f=3200:t=q:w=1.5:g=2,acompressor=threshold=-18dB:ratio=3:attack=10:release=200,"
      "aecho=0.85:0.7:70:0.15,loudnorm=I=-16:TP=-1.5")
RATE = 48000


def main(work):
    spec = json.load(open(os.path.join(work, "script.json")))
    tts = Kokoro(os.path.join(MODELS, "kokoro-v1.0.int8.onnx"), os.path.join(MODELS, "voices-v1.0.bin"))
    t = spec.get("lead", 0.15)
    offsets, texts, parts = {}, [], []
    for line in spec["lines"]:
        key = line["key"]
        samples, sr = tts.create(line["text"], voice=spec.get("voice", "bm_george"), speed=line.get("speed", 0.85), lang="en-gb")
        raw = os.path.join(work, f"raw-{key}.wav")
        out = os.path.join(work, f"{key}.wav")
        sf.write(raw, samples, sr)
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", raw, "-af", FX, "-ac", "1", "-ar", str(RATE), out], check=True)
        audio, _ = sf.read(out, dtype="float32")
        # trim the silence the echo and loudnorm leave at both ends
        loud = np.nonzero(np.abs(audio) > 0.01)[0]
        if len(loud):
            audio = audio[max(0, loud[0] - 480): loud[-1] + 2400]
        sf.write(out, audio, RATE)
        dur = len(audio) / RATE
        offsets[key] = [round(t, 3), round(dur, 3)]
        texts.append(line["text"])
        parts.append((t, audio))
        t += dur + line.get("gap", 0.4)
    offsets["end"] = round(t - spec["lines"][-1].get("gap", 0.4), 3)
    mix = np.zeros(int((offsets["end"] + 0.5) * RATE), dtype="float32")
    for start, audio in parts:
        i = int(start * RATE)
        mix[i:i + len(audio)] += audio
    sf.write(os.path.join(work, "narration.wav"), mix, RATE)
    json.dump(offsets, open(os.path.join(work, "offsets.json"), "w"), indent=1)
    json.dump(texts, open(os.path.join(work, "lines.json"), "w"), indent=1)
    for k, v in offsets.items():
        print(k, v)


if __name__ == "__main__":
    main(sys.argv[1])
