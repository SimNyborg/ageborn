"""Renders the narrator's lines (queue item 39) and writes the game's voice manifest.

The voice is the one the owner chose on 2026-10-18 (docs/owner-queue.md item 39, "Lewis"):

1. Kokoro v1.0, int8 ONNX (Apache 2.0), through kokoro-onnx 0.6.1: voice style 0.7 x `bm_lewis` +
   0.3 x `am_onyx`, language en-gb, speed 0.88. The model files must be the ones the samples were made
   with (their SHA-256 is checked below).
2. Mastered with item 39's ffmpeg chain, unchanged: pitch down 4.5 % at the same tempo, warmth at 130 Hz,
   presence at 3.2 kHz, 3:1 compression, a small room (two early echoes) and single-pass loudnorm to
   -16 LUFS, true peak -1.5 dBFS. The approved samples ran four lines through that chain as one file, so
   its loudness stage had settled when each line came; here every line runs through it behind the same
   primer (the first approved line, rendered by this recipe) and is then cut out at its onset. That keeps
   the chain exactly as it is, gives each line the level the approved lines had (-16.0 to -16.5 LUFS),
   and keeps each line independent of the others (one changed string re-renders one line).
3. Encoded like the game's other audio (tools/audio/build.py `encode`): mono Ogg Opus plus an AAC-LC
   copy for browsers without Ogg Opus, content-hashed names in public/audio/voice/. The AAC encoder
   overshoots (up to +3 dB at 48 kbps on these lines), so an AAC copy whose decoded true peak would pass
   -1 dBTP is encoded from a turned-down master instead; the manifest records that gain (`altGain`) and
   the narrator turns the copy back up, so it plays as loud as the Ogg file.
4. `src/audio/voice.gen.ts` lists every line: its files, length, sizes, the English text it says and a
   hash of everything the render depends on. A line whose hash and files are unchanged (and whose AAC copy
   decodes under the cap) is kept as it is, so re-running on unchanged text reproduces the same files (the
   render itself is deterministic too: Kokoro on the CPU, ffmpeg with bit-exact flags; `--force`
   re-renders everything to prove it).

The lines are data: `lines.json` (i18n keys), read in English by `list-lines.ts`. Its `respell` map changes
only what Kokoro is given to say, for a name its en-gb reading gets wrong ("Grenadier" stressed on the first
syllable, "Phalangite" with a hard g); the subtitle keeps the real spelling, and the phonemes Kokoro is fed
for such a line are printed so the reading can be checked.

Usage (see tools/audio/README.md, "Narrator voice"):

    python3 -m venv /tmp/kokoro && /tmp/kokoro/bin/pip install kokoro-onnx==0.6.1 soundfile scipy
    KOKORO_MODELS=/path/with/kokoro-v1.0.int8.onnx+voices-v1.0.bin /tmp/kokoro/bin/python tools/audio/voice/render.py
    ... --check     exit 1 if a line is missing or stale (no rendering, no model needed)
    ... --force     render every line again
    ... --only ID   render only these ids (comma-separated); the rest are kept
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = ROOT / "public" / "audio" / "voice"
GEN = ROOT / "src" / "audio" / "voice.gen.ts"
sys.path.insert(0, str(HERE.parent))
from build import encode  # noqa: E402  (the game's encoder: Ogg Opus + AAC, bit-exact, hashed names)
from lib.loud import true_peak_db  # noqa: E402  (the pipeline's 4x oversampled true-peak meter)

MODEL_FILE = "kokoro-v1.0.int8.onnx"
VOICES_FILE = "voices-v1.0.bin"
MODEL_SHA256 = {
    MODEL_FILE: "6e742170d309016e5891a994e1ce1559c702a2ccd0075e67ef7157974f6406cb",
    VOICES_FILE: "bca610b8308e8d99f32e6fe4197e7ec01679264efed0cac9140fe9c29f1fbf7d",
}
KOKORO_SR = 24000
SR = 48000
STYLE = (("bm_lewis", 0.7), ("am_onyx", 0.3))
LANG = "en-gb"
SPEED = 0.88
CHAIN = ",".join(
    [
        "asetrate=24000*0.955",
        "aresample=48000",
        "atempo=1.047",
        "equalizer=f=130:t=q:w=0.9:g=2.5",
        "equalizer=f=3200:t=q:w=1.2:g=1.5",
        "acompressor=threshold=-20dB:ratio=3:attack=8:release=120",
        "aecho=0.85:0.5:38|61:0.16|0.10",
        "loudnorm=I=-16:TP=-1.5:LRA=7",
    ]
)
PRIMER = "Every empire begins with a single warrior. Tap to send a Bonker."
GAP_S = 0.9
LEAD_S = 0.025
TAIL_S = 0.12
FADE_S = 0.012
# Measured on the voice (same lines, codec minus master, 1/3-octave bands): Ogg Opus at 32-48 kbps loses 2-3 dB
# at 3-9 kHz, the presence the recipe adds; at 64 kbps it is within 0.1 dB everywhere. AAC-LC is within 0.3 dB
# at 48 kbps. A line is 1-4 s, so the rate costs little.
OPUS_KBPS = 64
AAC_KBPS = 48
# An AAC copy's true peak, decoded, stays at or under this (dBTP), so no decoder that stops at full scale clips
# it. A copy over it is encoded again from the master turned down, in steps, until it decodes at or under
# AAC_AIM_DB (room for another decoder's rounding); its gain goes in the manifest (`altGain`, dB) and the
# narrator undoes it. These are checked on the files themselves (a kept line whose AAC copy decodes over the
# cap is rendered again), not hashed, so changing them redoes only the lines they concern.
AAC_PEAK_DB = -1.0
AAC_AIM_DB = -1.2
# Everything above that shapes a file: part of every line's hash, so changing any of it re-renders.
RECIPE = {
    "pipeline": 1,
    "model": MODEL_SHA256,
    "style": STYLE,
    "lang": LANG,
    "speed": SPEED,
    "chain": CHAIN,
    "primer": PRIMER,
    "gap": GAP_S,
    "cut": [LEAD_S, TAIL_S, FADE_S],
    "encode": {"opus": OPUS_KBPS, "aac": AAC_KBPS},
}
RECIPE_LINE = "Kokoro v1.0 int8 (Apache 2.0), 0.7 bm_lewis + 0.3 am_onyx, en-gb, speed 0.88; item 39 mastering chain"


def list_lines() -> dict:
    out = subprocess.run(["npx", "tsx", str(HERE / "list-lines.ts")], cwd=ROOT, check=True, capture_output=True, text=True).stdout
    return json.loads(out)


def line_hash(line: dict, lang: str) -> str:
    # The text Kokoro says counts only where a respelling makes it differ from the subtitle's, so adding a
    # respelling re-renders just the lines it changes.
    spoken = {"spoken": line["spoken"]} if line.get("spoken") else {}
    blob = json.dumps({"recipe": RECIPE, "lang": lang, "text": line["text"], **spoken}, sort_keys=True, separators=(",", ":"))
    return hashlib.sha1(blob.encode()).hexdigest()[:16]


def slug(line: dict) -> str:
    """The file name's stem: the key, then each placeholder's value key (`...heaviesStopInfantry.card.pikeman.name`)."""
    s = line["key"] + "".join(f".{v}" for _, v in sorted((line.get("vars") or {}).items()))
    return re.sub(r"[^A-Za-z0-9._-]", "-", s)


def read_manifest() -> dict:
    if not GEN.exists():
        return {}
    m = re.search(r"/\* data \*/ (\{.*\}) /\* end \*/", GEN.read_text(), re.S)
    return json.loads(m.group(1)) if m else {}


class Voice:
    """Kokoro with the recipe's voice, loaded only when a line needs rendering."""

    def __init__(self, models: Path):
        for name, want in MODEL_SHA256.items():
            got = hashlib.sha256((models / name).read_bytes()).hexdigest()
            if got != want:
                raise SystemExit(f"{models / name}: SHA-256 {got} is not the recipe's model ({want})")
        import onnxruntime as rt
        from kokoro_onnx import Kokoro

        so = rt.SessionOptions()
        # One thread: the same result on any machine size (measured: identical at 1, 4 and default threads).
        so.intra_op_num_threads = 1
        so.inter_op_num_threads = 1
        sess = rt.InferenceSession(str(models / MODEL_FILE), sess_options=so, providers=["CPUExecutionProvider"])
        self.k = Kokoro.from_session(sess, str(models / VOICES_FILE))
        self.style = sum(w * self.k.get_voice_style(v) for v, w in STYLE).astype(np.float32)
        self.primer = self.say(PRIMER)

    def say(self, text: str) -> np.ndarray:
        s, sr = self.k.create(text, voice=self.style, speed=SPEED, lang=LANG)
        assert sr == KOKORO_SR
        return np.asarray(s, dtype=np.float32)

    def phonemes(self, text: str) -> str:
        """The phonemes Kokoro is fed for `text` (its own espeak-ng tokenizer, as `create` calls it)."""
        return self.k.tokenizer.phonemize(text, LANG)


def master(voice: Voice, raw: np.ndarray, tmp: Path) -> np.ndarray:
    """The item 39 chain over primer + gap + line + gap; returns the line, cut at its onset (48 kHz mono)."""
    gap = np.zeros(int(GAP_S * KOKORO_SR), np.float32)
    sf.write(str(tmp / "in.wav"), np.concatenate([voice.primer, gap, raw, gap]), KOKORO_SR, subtype="FLOAT")
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "in.wav"), "-af", f"{CHAIN},aresample={SR}"]
    cmd += ["-c:a", "pcm_f32le", "-fflags", "+bitexact", "-flags:a", "+bitexact", str(tmp / "out.wav")]
    subprocess.run(cmd, check=True)
    y, sr = sf.read(str(tmp / "out.wav"), dtype="float32")
    assert sr == SR
    # The chain keeps the tempo (4.5 % slower, then 4.7 % faster), so the line starts near here; its onset
    # is found in the gap's silence (the primer's echo has died 0.9 s later).
    expect = (len(voice.primer) + len(gap)) / KOKORO_SR
    lo, hi = int((expect - 0.35) * SR), int((expect + len(raw) / KOKORO_SR + 0.85) * SR)
    seg = y[lo:hi]
    peak = float(np.abs(seg).max())
    loud = np.flatnonzero(np.abs(seg) > peak * 10 ** (-38 / 20))
    quiet = np.flatnonzero(np.abs(seg) > peak * 10 ** (-60 / 20))
    start = max(0, int(loud[0]) - int(LEAD_S * SR))
    end = min(len(seg), int(quiet[-1]) + int(TAIL_S * SR))
    out = seg[start:end].astype(np.float32).copy()
    n = int(FADE_S * SR)
    out[-n:] *= np.linspace(1.0, 0.0, n, dtype=np.float32)
    head = int(0.003 * SR)
    out[:head] *= np.linspace(0.0, 1.0, head, dtype=np.float32)
    return out


def loudness(wav: Path) -> tuple[float, float]:
    """Integrated loudness (LUFS) and true peak (dBFS) of a file, by ffmpeg's EBU R128 meter."""
    err = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af", "ebur128=peak=true", "-f", "null", "-"], capture_output=True, text=True).stderr
    i = [ln for ln in err.splitlines() if ln.strip().startswith("I:")][-1].split()[1]
    p = [ln for ln in err.splitlines() if ln.strip().startswith("Peak:")][-1].split()[1]
    return float(i), float(p)


def decoded_peak(path: Path) -> float:
    """A file's true peak (dBTP) once decoded: ffmpeg's decoder to float (no clipping), the 4x meter."""
    with tempfile.TemporaryDirectory() as t:
        wav = Path(t) / "decoded.wav"
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(path), "-c:a", "pcm_f32le", str(wav)], check=True)
        y, _ = sf.read(str(wav), dtype="float64")
    return true_peak_db(y)


def encode_line(wav: Path, x: np.ndarray, tmp: Path, name: str) -> tuple[str, int, str, float]:
    """`encode` into OUT; an AAC copy that decodes over AAC_PEAK_DB is encoded again from the master turned
    down until it decodes at or under AAC_AIM_DB. Returns the Ogg file and size, the AAC file and its gain (dB)."""
    fname, size, aac = encode(wav, OUT, name, OPUS_KBPS, mono=True, aac_kbps=AAC_KBPS)
    assert aac is not None
    peak = decoded_peak(OUT / aac)
    if peak <= AAC_PEAK_DB:
        return fname, size, aac, 0.0
    gain = 0.0
    for step in range(8):
        # down by the excess and a little more; rounded first, so the gain recorded is the gain applied
        gain = round(gain - (peak - AAC_AIM_DB) - 0.05, 2)
        sf.write(str(tmp / "aac.wav"), (x * 10 ** (gain / 20)).astype(np.float32), SR, subtype="FLOAT")
        _, _, capped = encode(tmp / "aac.wav", tmp / f"aac{step}", name, OPUS_KBPS, mono=True, aac_kbps=AAC_KBPS)
        assert capped is not None
        peak = decoded_peak(tmp / f"aac{step}" / capped)
        if peak <= AAC_AIM_DB:
            (OUT / aac).unlink(missing_ok=True)
            (OUT / capped).write_bytes((tmp / f"aac{step}" / capped).read_bytes())
            return fname, size, capped, gain
    raise SystemExit(f"{name}: the AAC copy still decodes at {peak:.2f} dBTP after {gain} dB")


def write_manifest(lang: str, entries: dict) -> None:
    ogg = sum(e["bytes"] for e in entries.values())
    aac = sum(e["altBytes"] for e in entries.values())
    seconds = sum(e["seconds"] for e in entries.values())
    rows = ",\n".join(f"    {json.dumps(k)}: {json.dumps(v, separators=(', ', ': '))}" for k, v in entries.items())
    GEN.write_text(
        "\n".join(
            [
                "/**",
                " * Generated by `tools/audio/voice/render.py` from `tools/audio/voice/lines.json` (queue item 39). Do not",
                " * edit by hand: change the line list or the English strings and render again (tools/audio/README.md,",
                ' * "Narrator voice").',
                " *",
                " * Per language, per line id (`voiceLineId`): the Ogg Opus file and its AAC copy (`alt`), paths relative to",
                " * the site base; the length in seconds; the sizes; the text the line says (the app voices a line only",
                " * while its string still reads this, so a changed string or another language shows its subtitle silently",
                " * until it is rendered again); the hash of the render's inputs; and, for an AAC copy encoded turned down",
                " * so its decoded peaks stay under -1 dBTP, that gain (`altGain`, dB), which the narrator undoes.",
                " */",
                "",
                "export interface VoiceFile {",
                "  src: string;",
                "  alt: string;",
                "  seconds: number;",
                "  bytes: number;",
                "  altBytes: number;",
                "  text: string;",
                "  hash: string;",
                "  altGain?: number;",
                "}",
                "",
                f"export const VOICE_RECIPE = {json.dumps(RECIPE_LINE)};",
                "",
                f"/** {len(entries)} lines, {seconds:.1f} s: Ogg Opus {ogg / 1024:.0f} KB, AAC {aac / 1024:.0f} KB. */",
                f"export const VOICE_BYTES = {{ ogg: {ogg}, aac: {aac} }};",
                "",
                "export const VOICE_LINES: Readonly<Record<string, Readonly<Record<string, VoiceFile>>>> = /* data */ {",
                f"  {json.dumps(lang)}: {{",
                rows,
                "  }",
                "} /* end */;",
                "",
            ]
        )
    )


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Render the narrator's lines and write src/audio/voice.gen.ts.")
    ap.add_argument("--check", action="store_true", help="exit 1 if a line is missing or stale; render nothing")
    ap.add_argument("--force", action="store_true", help="render every line again")
    ap.add_argument("--only", default="", help="comma-separated ids to render (the rest are kept)")
    ap.add_argument("--models", default=os.environ.get("KOKORO_MODELS", ""), help="folder with the Kokoro model files")
    args = ap.parse_args(argv)
    listed = list_lines()
    lang, lines = listed["lang"], listed["lines"]
    old = read_manifest().get(lang, {})
    only = {s for s in args.only.split(",") if s}

    def stale(line: dict) -> str | None:
        """Why a line must be rendered (again), or None when it is up to date."""
        e = old.get(line["id"])
        if not e:
            return "new"
        if e["hash"] != line_hash(line, lang):
            return "text or recipe changed"
        alt = ROOT / "public" / e["alt"]
        if not (ROOT / "public" / e["src"]).exists() or not alt.exists():
            return "files missing"
        peak = decoded_peak(alt)
        return f"AAC copy decodes at {peak:+.2f} dBTP, over {AAC_PEAK_DB}" if peak > AAC_PEAK_DB else None

    why = {ln["id"]: "forced" if args.force else "asked" if ln["id"] in only else stale(ln) for ln in lines}
    todo = [ln for ln in lines if why[ln["id"]]]
    gone = sorted(set(old) - {ln["id"] for ln in lines})
    if args.check:
        for ln in todo:
            print(f"stale: {ln['id']} ({ln['text']}): {why[ln['id']]}")
        for i in gone:
            print(f"unlisted: {i}")
        print(f"{len(lines) - len(todo)} of {len(lines)} lines up to date")
        return 1 if todo or gone else 0
    voice = None
    entries: dict = {}
    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        for ln in lines:
            if ln not in todo:
                entries[ln["id"]] = old[ln["id"]]
                continue
            if voice is None:
                if not args.models:
                    raise SystemExit("set KOKORO_MODELS (or --models) to the folder with the Kokoro v1.0 model files")
                voice = Voice(Path(args.models))
            said = ln.get("spoken") or ln["text"]
            x = master(voice, voice.say(said), tmp)
            wav = tmp / "line.wav"
            sf.write(str(wav), x, SR, subtype="FLOAT")
            lufs, tp = loudness(wav)
            OUT.mkdir(parents=True, exist_ok=True)
            fname, size, aac, gain = encode_line(wav, x, tmp, slug(ln))
            entries[ln["id"]] = {
                "src": f"audio/voice/{fname}",
                "alt": f"audio/voice/{aac}",
                "seconds": round(len(x) / SR, 3),
                "bytes": size,
                "altBytes": (OUT / aac).stat().st_size,
                "text": ln["text"],
                "hash": line_hash(ln, lang),
                **({"altGain": gain} if gain else {}),
            }
            flag = "!" if not (-17.0 <= lufs <= -15.5) or tp > -1.0 else " "
            capped = f", AAC {gain:+.2f} dB" if gain else ""
            print(f"{flag} {ln['id']}: {len(x) / SR:.2f} s, {lufs:.1f} LUFS, TP {tp:.1f} dBFS{capped}, {size / 1024:.1f} + {entries[ln['id']]['altBytes'] / 1024:.1f} KB  \"{ln['text']}\" ({why[ln['id']]})", flush=True)
            if said != ln["text"]:
                print(f"    spoken as \"{said}\": {voice.phonemes(said)}", flush=True)
            # Written after every line, so a run cut short keeps what it rendered (the next run skips those).
            write_manifest(lang, {i: entries.get(i, old.get(i)) for i in (x["id"] for x in lines) if i in entries or i in old})
    keep = {Path(e["src"]).name for e in entries.values()} | {Path(e["alt"]).name for e in entries.values()}
    if OUT.exists():
        for f in OUT.iterdir():
            if f.suffix in (".ogg", ".m4a") and f.name not in keep:
                f.unlink()
    write_manifest(lang, entries)
    ogg = sum(e["bytes"] for e in entries.values())
    aac_total = sum(e["altBytes"] for e in entries.values())
    print(f"{len(todo)} rendered, {len(entries) - len(todo)} kept, {len(gone)} dropped; Ogg Opus {ogg / 1024:.0f} KB, AAC {aac_total / 1024:.0f} KB -> {GEN.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
