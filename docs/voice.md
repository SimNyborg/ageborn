# Narrator voice (free, Kokoro via kokoro-onnx)

Approved by the owner on 2026-10-14: `bm_george`, `bm_lewis`, `am_michael` with the round-1 processing. Round 2 (deeper blends) awaits his verdict.

## Install (about 1 minute, 120 MB of model files)

```bash
python3 -m venv .venv && . .venv/bin/activate
pip install --no-cache-dir kokoro-onnx soundfile
mkdir -p tts-models && cd tts-models
curl -sSLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx
curl -sSLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```

Do not install the torch-based `kokoro` package: its CUDA wheels fill the disk.

## Round 1 (approved)

Synthesis: `Kokoro.create(text, voice="bm_george", speed=0.85, lang="en-gb")` (`en-us` for `am_` voices). See `sample.py`.

Processing (ffmpeg, 24 kHz mono in):

```
asetrate=24000*0.93,aresample=48000,atempo=1.0753,equalizer=f=110:t=q:w=1:g=4,equalizer=f=3200:t=q:w=1.5:g=2,acompressor=threshold=-18dB:ratio=3:attack=10:release=200,aecho=0.85:0.7:70:0.15,loudnorm=I=-16:TP=-1.5
```

## Round 2 (deeper, more dramatic; pending the owner's verdict)

Synthesis: style = 0.7 × voice + 0.3 × `am_onyx` (numpy arrays from `get_voice_style`), `speed=0.82`, `sentence_pause=0.65`, `clause_pause=0.35`. Write pauses into the text with "..." between phrases. See `sample2.py`.

Processing:

```
asetrate=24000*0.90,aresample=48000,atempo=1.1111,equalizer=f=90:t=q:w=0.8:g=5,equalizer=f=320:t=q:w=1:g=-2.5,equalizer=f=3500:t=q:w=1.2:g=2.5,acompressor=threshold=-20dB:ratio=3.5:attack=8:release=250:makeup=2,asoftclip=type=tanh:threshold=0.92,aecho=0.8:0.85:55|115|230:0.30|0.20|0.11,loudnorm=I=-16:TP=-1.5
```

Measured median pitch: George 131 Hz (round 1) to 107 Hz (round 2); Michael 105 to 96 Hz; Lewis is already the deepest and gets slightly lighter in the blend.

## Trailer bed

Music from the game (`public/audio/music/music.<age>.*.m4a`) at volume 0.14 with fades, plus a sub boom `aevalsrc=0.9*sin(2*PI*44*t)*exp(-2.6*t)` under the first word, voice delayed 0.7 s, final `loudnorm=I=-15:TP=-1.5` (Reels master around -14 LUFS).

## Captions

`Kokoro.create_timed(...)` returns word timings; burn in word-timed captions (muted viewers). (Owner decision 2026-10-19: no AI-voice line in captions.) Formerly: "Narration: AI voice".


## ElevenLabs (connected 2026-10-19, owner)

The ElevenLabs connector (voice and speech only) is connected to the studio session. Not used yet: the owner
wants a test first. Generations spend the owner's ElevenLabs credits, so never retry a generation call.
Candidate narrators from the library (warm, male, English): Oliver - Warm British Narrator
(lo1O1Dz1Tu4FWVEPaxuT), Jordie - Warm & Natural (U977vpWUjb8YL0J1JaFF), Steve - Warm, Expressive, British
(33aGKIlf0SKhTTaSWPVO), Tommy - Warm, Confident American (VIiLJvDGvCXzIeKOBZUN). Check the plan's terms
(attribution and commercial use) before the first published video.
