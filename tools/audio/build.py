"""Encodes the rendered audio for the game and writes the runtime manifest.

1. Sound effects: every variant of the sounds in one sound group is packed into one mono sprite
   sheet (`public/audio/sfx/<group>.<hash>.ogg`, Opus), with 50 ms of silence between entries. Each
   sheet starts with a short sync burst at a known time, so the game can measure and undo any start
   delay a decoder adds (AAC keeps ~44 ms of encoder priming on some browsers).
2. Music: every cue, stinger and layer stem becomes one Ogg Opus file
   (`public/audio/music/<cue>.<hash>.ogg`): stereo for cues and stingers, mono for layer stems.
3. Every file is also written as AAC-LC (`.m4a`) for browsers that cannot decode Ogg Opus (older
   Safari and iOS): music 96 kbps stereo, effect sheets 64 kbps mono, stems 48 kbps mono.
4. `src/audio/assets.gen.ts` lists the files, the sprite offsets, the sync times and the loop points.

File names carry a content hash, so a browser never plays a stale cached file after an update;
files that are no longer referenced are deleted.

Usage: python build.py   (after render_music.py and render_sfx.py; see README.md)
"""
from __future__ import annotations

import hashlib
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
CACHE = HERE / ".cache"
PUBLIC = ROOT / "public" / "audio"
GEN = ROOT / "src" / "audio" / "assets.gen.ts"
SR = 48000
GAP_S = 0.05

SFX_KBPS = 40
MUSIC_KBPS = 48  # 96 s battle loops
MENU_KBPS = 48
STINGER_KBPS = 56
STEM_KBPS = 40
AAC_KBPS = {"music": 96, "sfx": 64, "stem": 48}
# The sync burst at the start of every effect sheet (a 3 ms 1 kHz Hann-windowed tone) and the
# silence before the first sound; the first sound starts well after any codec smear of the burst.
SYNC_AT_S = 0.02
LEAD_S = 0.15


def sync_burst() -> np.ndarray:
    n = int(0.003 * SR)
    t = np.arange(n) / SR
    return 0.5 * np.sin(2 * np.pi * 1000 * t) * np.hanning(n)


def detect_sync(x: np.ndarray) -> float:
    """Where the sync burst is first detected (seconds): first sample above 10% of the peak of the
    first 0.1 s. The runtime (`files.ts`) runs the same detection on the decoded sheet."""
    head = np.abs(x[: int(0.1 * SR)])
    peak = float(head.max()) if len(head) else 0.0
    if peak <= 0:
        return 0.0
    return float(np.argmax(head > 0.1 * peak)) / SR


def encode(wav: Path, out_dir: Path, name: str, kbps: int, mono: bool, aac_kbps: int | None = None) -> tuple[str, int, str | None]:
    """Encodes to Ogg Opus (and, with `aac_kbps`, to AAC-LC .m4a). Returns the Ogg file name, its size
    and the .m4a file name."""
    out_dir.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp_out = Path(tmp) / "x.ogg"
        cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(wav)]
        if mono:
            cmd += ["-ac", "1"]
        cmd += ["-c:a", "libopus", "-b:a", f"{kbps}k", "-vbr", "constrained", "-compression_level", "10", "-application", "audio", "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-serial_offset", "1", str(tmp_out)]
        subprocess.run(cmd, check=True)
        data = tmp_out.read_bytes()
        aac_name = None
        if aac_kbps:
            tmp_aac = Path(tmp) / "x.m4a"
            cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(wav)]
            if mono:
                cmd += ["-ac", "1"]
            cmd += ["-c:a", "aac", "-b:a", f"{aac_kbps}k", "-ar", str(SR), "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact", "-movflags", "+faststart", str(tmp_aac)]
            subprocess.run(cmd, check=True)
            adata = tmp_aac.read_bytes()
            aac_name = f"{name}.{hashlib.sha1(adata).hexdigest()[:8]}.m4a"
            (out_dir / aac_name).write_bytes(adata)
    h = hashlib.sha1(data).hexdigest()[:8]
    fname = f"{name}.{h}.ogg"
    (out_dir / fname).write_bytes(data)
    return fname, len(data), aac_name


def build_sfx(groups: list[str], sounds: dict) -> tuple[dict, dict, int]:
    idx = json.loads((CACHE / "out" / "sfx" / "index.json").read_text())
    missing = [s for s in sounds if s not in idx]
    if missing:
        raise SystemExit(f"not rendered yet: {missing}")
    sheets, entries, total = {}, {}, 0
    gap = np.zeros(int(GAP_S * SR))
    lead = np.zeros(int(LEAD_S * SR))
    burst = sync_burst()
    at = int(SYNC_AT_S * SR)
    lead[at : at + len(burst)] = burst
    sync = round(detect_sync(lead), 5)
    for g in groups:
        ids = [s for s in sounds if sounds[s]["group"] == g]
        if not ids:
            continue
        chunks, pos = [lead], len(lead)
        for sid in ids:
            spans = []
            for k in range(idx[sid]["variants"]):
                x, sr = sf.read(str(CACHE / "out" / "sfx" / f"{sid}.{k}.wav"), dtype="float64")
                assert sr == SR
                spans.append([round(pos / SR, 5), round(len(x) / SR, 5)])
                chunks += [x, gap]
                pos += len(x) + len(gap)
            entries[sid] = {"sheet": g, "variants": spans}
        with tempfile.TemporaryDirectory() as tmp:
            wav = Path(tmp) / f"{g}.wav"
            sf.write(str(wav), np.concatenate(chunks).astype(np.float32), SR, subtype="FLOAT")
            fname, size, aac = encode(wav, PUBLIC / "sfx", g, SFX_KBPS, mono=True, aac_kbps=AAC_KBPS["sfx"])
        sheets[g] = {"src": f"audio/sfx/{fname}", "bytes": size, "seconds": round(pos / SR, 3), "sync": sync}
        if aac:
            sheets[g]["alt"] = f"audio/sfx/{aac}"
        total += size
        print(f"  sfx/{fname}: {len(ids)} sounds, {pos / SR:.1f} s, {size / 1024:.0f} KB")
    return sheets, entries, total


def build_music() -> tuple[dict, int]:
    idx = json.loads((CACHE / "out" / "music" / "index.json").read_text())
    out, total = {}, 0
    for cue, info in sorted(idx.items()):
        stem = cue.startswith("layer.")
        kbps = STEM_KBPS if stem else STINGER_KBPS if cue.startswith("stinger.") else MENU_KBPS if cue in ("music.menu", "music.capsule") else MUSIC_KBPS
        fname, size, aac = encode(CACHE / "out" / "music" / f"{cue}.wav", PUBLIC / "music", cue, kbps, mono=stem, aac_kbps=AAC_KBPS["stem" if stem else "music"])
        entry = {"src": f"audio/music/{fname}", "bytes": size, "seconds": info["seconds"]}
        if aac:
            entry["alt"] = f"audio/music/{aac}"
        if "loopLength" in info:
            entry["loopStart"] = round(info["loopStart"], 6)
            entry["loopLength"] = round(info["loopLength"], 6)
        out[cue] = entry
        total += size
        print(f"  music/{fname}: {info['seconds']} s, {size / 1024:.0f} KB")
    return out, total


def prune(keep: set[str]) -> None:
    for sub in ("sfx", "music"):
        d = PUBLIC / sub
        if not d.exists():
            continue
        for f in d.iterdir():
            if f"audio/{sub}/{f.name}" not in keep:
                f.unlink()


def ts_value(v, indent: int = 0) -> str:
    return json.dumps(v, indent=None, separators=(", ", ": "))


def write_manifest(sheets: dict, entries: dict, music: dict, sfx_bytes: int, music_bytes: int) -> None:
    lines = [
        "/**",
        " * Generated by `tools/audio/build.py` from the renders in `tools/audio`. Do not edit by hand:",
        " * change the sound design or the arrangements there and rebuild (see tools/audio/README.md).",
        " *",
        " * - `SFX_SHEETS`: one Ogg Opus sprite sheet per sound group, paths relative to the site base;",
        " *   `alt` is the same sheet as AAC (.m4a) and `sync` the time (s) where the sync burst at the",
        " *   start of the sheet is detected, so a decoder's start delay can be measured and undone.",
        " * - `SFX_FILES`: per sound id, its sheet and each variant's [offset, duration] in seconds.",
        " * - `MUSIC_FILES`: per music cue, stinger and layer stem, the file and, for loops, the loop",
        " *   window (`loopStart`, `loopLength` in seconds; any window of that length inside the file",
        " *   loops seamlessly); `alt` is the AAC (.m4a) copy. `stinger.<name>.k<n>` are the stingers",
        " *   recorded n semitones up (the key of the age the battle ended in).",
        " */",
        "",
        "export interface SfxSheetFile {",
        "  src: string;",
        "  bytes: number;",
        "  seconds: number;",
        "  alt?: string;",
        "  sync?: number;",
        "}",
        "",
        "export interface SfxFileEntry {",
        "  sheet: string;",
        "  /** [offset, duration] in seconds per variant. */",
        "  variants: readonly (readonly [number, number])[];",
        "}",
        "",
        "export interface MusicFile {",
        "  src: string;",
        "  bytes: number;",
        "  seconds: number;",
        "  loopStart?: number;",
        "  loopLength?: number;",
        "  alt?: string;",
        "}",
        "",
        f"export const SFX_BYTES = {sfx_bytes};",
        f"export const MUSIC_BYTES = {music_bytes};",
        "",
        "export const SFX_SHEETS: Readonly<Record<string, SfxSheetFile>> = {",
    ]
    for g, s in sheets.items():
        extra = (f", alt: {json.dumps(s['alt'])}" if "alt" in s else "") + (f", sync: {s['sync']}" if "sync" in s else "")
        lines.append(f"  {g}: {{ src: {json.dumps(s['src'])}, bytes: {s['bytes']}, seconds: {s['seconds']}{extra} }},")
    lines += ["};", "", "export const SFX_FILES: Readonly<Record<string, SfxFileEntry>> = {"]
    for sid, e in entries.items():
        spans = ", ".join(f"[{a}, {b}]" for a, b in e["variants"])
        lines.append(f"  {sid}: {{ sheet: {json.dumps(e['sheet'])}, variants: [{spans}] }},")
    lines += ["};", "", "export const MUSIC_FILES: Readonly<Record<string, MusicFile>> = {"]
    for cue, m in music.items():
        extra = ""
        if "loopLength" in m:
            extra = f", loopStart: {m['loopStart']}, loopLength: {m['loopLength']}"
        if "alt" in m:
            extra += f", alt: {json.dumps(m['alt'])}"
        lines.append(f"  {json.dumps(cue)}: {{ src: {json.dumps(m['src'])}, bytes: {m['bytes']}, seconds: {m['seconds']}{extra} }},")
    lines += ["};", ""]
    GEN.write_text("\n".join(lines))


def main() -> None:
    listing = subprocess.run(["npx", "tsx", str(HERE / "list-sounds.ts")], cwd=ROOT, check=True, capture_output=True, text=True).stdout
    (CACHE / "sounds.json").write_text(listing)
    meta = json.loads(listing)
    print("sound effects:")
    sheets, entries, sfx_bytes = build_sfx(meta["groups"], meta["sounds"])
    print("music:")
    music, music_bytes = build_music()
    keep = {s["src"] for s in sheets.values()} | {m["src"] for m in music.values()}
    keep |= {s["alt"] for s in sheets.values() if "alt" in s} | {m["alt"] for m in music.values() if "alt" in m}
    prune(keep)
    write_manifest(sheets, entries, music, sfx_bytes, music_bytes)
    alt_bytes = sum(f.stat().st_size for sub in ("sfx", "music") for f in (PUBLIC / sub).glob("*.m4a"))
    print(f"total: sfx {sfx_bytes / 1024:.0f} KB, music {music_bytes / 1024:.0f} KB (Ogg Opus); AAC copies {alt_bytes / 1024:.0f} KB -> {GEN.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
