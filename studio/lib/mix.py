#!/usr/bin/env python3
"""Audio mixer for the studio: builds a Reel's soundtrack from the game's own audio files.

Input: a mix spec (JSON) written by an edit script. Output: a 48 kHz stereo WAV (float), normalised
later by the final encode (two-pass loudnorm to -14 LUFS).

- music: the game's composed music files (cue -> file, looped on the file's own loop window), with
  fades, gain and optional crossfades between cues.
- sfx from clips: every sound the battle view played during a recorded clip (the capture sidecar's
  sound log, stamped per frame) is placed at its time in the reel, using the game's sprite sheets and
  each sound's mix settings (gain trim, voice cap, retrigger gap, pitch and volume spread) as the game
  does; the call's own volume, pitch and pan apply.
- accents: single game sounds placed by hand (title slams, whooshes, impacts).
- narration (hook for later): a voice file placed at a time; the music ducks under it.
- the music ducks under loud effects (a sidechain envelope) and under explicit duck windows.

Usage: python3 lib/mix.py <spec.json> <out.wav>
"""
import hashlib
import json
import math
import os
import subprocess
import sys

import numpy as np

SR = 48000
STUDIO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME_REPO = os.environ.get('AGEBORN_REPO', '/home/user/ageborn')
CATALOG = json.load(open(os.path.join(STUDIO, 'assets', 'game.json')))['audio']

_decoded = {}


def decode(path):
    """Decodes an audio file to float32 stereo at 48 kHz (cached)."""
    if path in _decoded:
        return _decoded[path]
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'], check=True, capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).copy()
    _decoded[path] = a
    return a


def game_file(rel):
    return os.path.join(GAME_REPO, 'public', rel)


def db(x):
    return 10.0 ** (x / 20.0)


def rnd(*parts):
    """A deterministic 0..1 number from the parts (variants and spread repeat run to run)."""
    h = hashlib.sha1('|'.join(str(p) for p in parts).encode()).digest()
    return int.from_bytes(h[:8], 'big') / 2 ** 64


def resample(clip, rate):
    """Plays a clip `rate` times faster (pitch up) by linear interpolation."""
    if abs(rate - 1.0) < 1e-4:
        return clip
    n = int(len(clip) / rate)
    if n < 2:
        return clip[:1]
    idx = np.arange(n) * rate
    i0 = np.floor(idx).astype(np.int64)
    i1 = np.minimum(i0 + 1, len(clip) - 1)
    f = (idx - i0)[:, None].astype(np.float32)
    return clip[i0] * (1 - f) + clip[i1] * f


def pan_gains(pan):
    p = max(-1.0, min(1.0, pan))
    a = (p + 1) * math.pi / 4
    return math.cos(a) * math.sqrt(2), math.sin(a) * math.sqrt(2)


def fade(n, fin, fout):
    env = np.ones(n, dtype=np.float32)
    a = int(fin * SR)
    b = int(fout * SR)
    if a > 0:
        env[:min(a, n)] = np.linspace(0, 1, min(a, n), dtype=np.float32) ** 1.5
    if b > 0:
        env[max(0, n - b):] *= np.linspace(1, 0, min(b, n), dtype=np.float32) ** 1.5
    return env


def add(bus, clip, at):
    """Adds `clip` into `bus` at sample `at` (clipped at the ends)."""
    if at >= len(bus) or at + len(clip) <= 0:
        return
    s0 = max(0, at)
    c0 = s0 - at
    n = min(len(clip) - c0, len(bus) - s0)
    if n > 0:
        bus[s0:s0 + n] += clip[c0:c0 + n]


def music_segment(cue, start, dur):
    """`dur` s of a cue's file from `start` s, looping on the file's loop window when it runs past."""
    m = CATALOG['music'][cue]
    a = decode(game_file(m['src']))
    ls = m.get('loopStart')
    ll = m.get('loopLength')
    need = int(dur * SR)
    pos = int(start * SR)
    out = np.zeros((need, 2), dtype=np.float32)
    k = 0
    while k < need:
        if ls is not None and ll is not None:
            end = int((ls + ll) * SR)
            if pos >= end:
                pos = int(ls * SR) + (pos - end)
        else:
            end = len(a)
            if pos >= end:
                pos = 0
        take = min(need - k, end - pos, len(a) - pos)
        if take <= 0:
            break
        out[k:k + take] = a[pos:pos + take]
        k += take
        pos += take
    return out


def sfx_clip(sound_id, variant_seed):
    """One variant of a sound from its sprite sheet, with its mix settings."""
    entry = CATALOG['sfxFiles'].get(sound_id)
    if not entry:
        return None, None
    sheet = CATALOG['sfxSheets'][entry['sheet']]
    a = decode(game_file(sheet['src']))
    variants = entry['variants']
    v = variants[int(variant_seed * len(variants)) % len(variants)]
    # the sync burst sits at a known time; offsets are measured from the file start
    s0 = int(v[0] * SR)
    s1 = int((v[0] + v[1]) * SR)
    return a[s0:s1], CATALOG['soundMix'].get(sound_id, {})


def place_sound(bus, sound_id, t, o, seed, voices, cfg):
    clip, mix = sfx_clip(sound_id, rnd('variant', sound_id, seed))
    if clip is None or len(clip) == 0:
        return False
    mix = mix or {}
    gap = max(40, mix.get('gapMs', 40)) / 1000.0
    max_voices = min(4, mix.get('maxVoices', 4))
    starts = voices.setdefault(sound_id, [])
    if starts and t - starts[-1][0] < gap:
        return False
    active = [s for s in starts if s[1] > t]
    if len(active) >= max_voices:
        return False
    total_active = sum(1 for lst in voices.values() for s in lst if s[1] > t)
    if total_active >= cfg.get('maxTotalVoices', 24):
        return False
    pitch_var = mix.get('pitchVarBp', 800) / 10000.0
    vol_var = mix.get('volVarDb', 3)
    rate = (o.get('pitchBp', 10000) / 10000.0) * (1 + (rnd('pitch', sound_id, seed) * 2 - 1) * pitch_var)
    gain_db = mix.get('gainDb', 0) + o.get('volumeDb', 0) + (rnd('vol', sound_id, seed) * 2 - 1) * vol_var
    if mix.get('bus') == 'ui':
        gain_db += 20 * math.log10(CATALOG['mixTrim']['ui'])
    c = resample(clip, rate) * db(gain_db)
    gl, gr = pan_gains(o.get('pan', 0.0))
    c = c * np.array([gl, gr], dtype=np.float32)
    add(bus, c, int(t * SR))
    starts.append((t, t + len(c) / SR))
    return True


def envelope(x, attack=0.008, release=0.25):
    """A peak-following envelope of a mono signal (sidechain for the music duck)."""
    mono = np.abs(x).max(axis=1)
    # decimate to 1 ms blocks for speed
    blk = SR // 1000
    n = len(mono) // blk
    m = mono[:n * blk].reshape(n, blk).max(axis=1)
    env = np.zeros(n, dtype=np.float32)
    ga = math.exp(-1 / (attack * 1000))
    gr = math.exp(-1 / (release * 1000))
    e = 0.0
    for i in range(n):
        v = m[i]
        e = ga * e + (1 - ga) * v if v > e else gr * e + (1 - gr) * v
        env[i] = e
    if n == 0:
        return np.zeros(len(mono), dtype=np.float32)
    full = np.repeat(env, blk)
    if len(full) < len(mono):
        full = np.concatenate([full, np.full(len(mono) - len(full), env[-1], dtype=np.float32)])
    return full[:len(mono)]


def loudness(x):
    """Integrated loudness (LUFS, EBU R128) of a stereo float signal, measured by ffmpeg."""
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', 'ebur128', '-f', 'null', '-'], input=x.astype(np.float32).tobytes(), capture_output=True)
    txt = r.stderr.decode('utf8', 'replace')
    tail = txt[txt.rfind('Summary:'):]
    for line in tail.splitlines():
        line = line.strip()
        if line.startswith('I:'):
            return float(line.split()[1])
    return -70.0


def lookahead_limit(x, ceiling_db=-2.0, look_ms=5.0, attack_ms=1.0, release_ms=90.0):
    """A look-ahead peak limiter: the gain starts falling `look_ms` before a peak, recovers over `release_ms`."""
    ceiling = 10 ** (ceiling_db / 20)
    p = np.abs(x).max(axis=1)
    L = max(1, int(look_ms * SR / 1000))
    padded = np.pad(p, (L, L))
    smax = np.lib.stride_tricks.sliding_window_view(padded, 2 * L + 1).max(axis=1)
    need = np.minimum(1.0, ceiling / np.maximum(smax, 1e-9))
    blk = 32
    nb = (len(need) + blk - 1) // blk
    pad = np.pad(need, (0, nb * blk - len(need)), constant_values=1.0)
    bmin = pad.reshape(nb, blk).min(axis=1)
    a = math.exp(-blk / (attack_ms * SR / 1000))
    r = math.exp(-blk / (release_ms * SR / 1000))
    g = np.empty(nb, dtype=np.float32)
    cur = 1.0
    for i in range(nb):
        t = bmin[i]
        cur = a * cur + (1 - a) * t if t < cur else r * cur + (1 - r) * t
        cur = min(cur, t) if t < cur and (cur - t) > 0.25 else cur
        g[i] = cur
    gs = np.interp(np.arange(len(p)), np.arange(nb) * blk + blk / 2, g).astype(np.float32)
    y = x * gs[:, None]
    return np.clip(y, -ceiling, ceiling)


def master(x, target_lufs=-14.0):
    """Brings the mix to the target loudness with the look-ahead limiter, keeping its dynamics."""
    for _ in range(3):
        cur = loudness(x)
        if cur <= -69:
            return x
        gain = target_lufs - cur
        if abs(gain) < 0.3:
            break
        x = lookahead_limit(x * db(max(-20.0, min(24.0, gain))))
    return x


def soft_limit(x, ceiling=0.94):
    """A smooth limiter: linear below 0.7 of the ceiling, tanh knee above."""
    knee = 0.7 * ceiling
    y = x.copy()
    over = np.abs(y) > knee
    s = np.sign(y[over])
    v = (np.abs(y[over]) - knee) / (ceiling - knee)
    y[over] = s * (knee + (ceiling - knee) * np.tanh(v))
    return y


def main(spec_path, out_path):
    spec = json.load(open(spec_path))
    n = int(spec['duration'] * SR)
    music = np.zeros((n, 2), dtype=np.float32)
    sfx = np.zeros((n, 2), dtype=np.float32)
    accents = np.zeros((n, 2), dtype=np.float32)
    voice = np.zeros((n, 2), dtype=np.float32)
    cfg = spec.get('config', {})

    for m in spec.get('music', []):
        seg = music_segment(m['cue'], m.get('from', 0.0), m['dur'])
        seg *= fade(len(seg), m.get('fadeIn', 0.05), m.get('fadeOut', 0.8))[:, None]
        seg *= db(m.get('gainDb', 0))
        add(music, seg, int(m['at'] * SR))

    for st in spec.get('stems', []):
        a = decode(st['file'])
        if 'from' in st or 'dur' in st:
            a = a[int(st.get('from', 0) * SR): int((st.get('from', 0) + st.get('dur', len(a) / SR)) * SR)]
        a = a * fade(len(a), st.get('fadeIn', 0.0), st.get('fadeOut', 0.0))[:, None] * db(st.get('gainDb', 0))
        add(music if st.get('bus') == 'music' else accents, a, int(st['at'] * SR))

    voices = {}
    placed = 0
    for src in spec.get('sfxFromClips', []):
        side = json.load(open(src['sidecar']))
        fps = side['fps']
        rate = src.get('rate', 1.0)
        f0 = src.get('from', 0)
        span = src.get('dur', side['seconds'])
        only = set(src.get('only', []))
        exclude = set(src.get('exclude', [])) | set(cfg.get('exclude', []))
        gain = src.get('gainDb', 0)
        for k, s in enumerate(side['sounds']):
            if s.get('kind') != 'play':
                continue
            sid = s['id']
            if (only and sid not in only) or sid in exclude:
                continue
            ct = s['clipFrame'] / fps
            rel = (ct - f0 / fps) / rate
            if rel < 0 or rel > span:
                continue
            o = dict(s.get('o') or {})
            o['volumeDb'] = o.get('volumeDb', 0) + gain + cfg.get('boostDb', {}).get(sid, 0)
            if place_sound(sfx, sid, src['at'] + rel, o, f'{src["sidecar"]}|{k}', voices, cfg):
                placed += 1

    for a in spec.get('accents', []):
        o = {'volumeDb': a.get('gainDb', 0), 'pitchBp': a.get('pitchBp', 10000), 'pan': a.get('pan', 0.0)}
        clip, mix = sfx_clip(a['id'], a.get('variant', 0) / max(1, len(CATALOG['sfxFiles'].get(a['id'], {}).get('variants', [1]))))
        if clip is None:
            print('missing accent', a['id'], file=sys.stderr)
            continue
        c = resample(clip, o['pitchBp'] / 10000.0) * db(o['volumeDb'] + (mix or {}).get('gainDb', 0))
        gl, gr = pan_gains(o['pan'])
        add(accents, c * np.array([gl, gr], dtype=np.float32), int(a['at'] * SR))

    nar = spec.get('narration')
    if nar and os.path.exists(nar.get('file', '')):
        a = decode(nar['file']) * db(nar.get('gainDb', 0))
        add(voice, a, int(nar.get('at', 0) * SR))

    # the music ducks under loud effects and the voice, and in explicit windows
    side_env = envelope(sfx * db(cfg.get('sfxDb', 0)) + accents)
    duck_depth = cfg.get('sidechainDb', 5.0)
    thr = cfg.get('sidechainThreshold', 0.18)
    g = np.clip((side_env - thr) / max(1e-6, 1 - thr), 0, 1)
    duck = db(-duck_depth * g)
    if nar:
        venv = envelope(voice, 0.02, 0.4)
        duck = np.minimum(duck, db(-9 * np.clip(venv / 0.1, 0, 1)))
    for d in spec.get('duck', []):
        s0 = int(d['at'] * SR)
        s1 = int((d['at'] + d['dur']) * SR)
        ramp = int(0.08 * SR)
        w = np.ones(n, dtype=np.float32)
        lo = db(d['db'])
        if s1 > s0:
            seg = np.full(max(0, min(n, s1) - max(0, s0)), lo, dtype=np.float32)
            w[max(0, s0):min(n, s1)] = seg
            if s0 - ramp > 0:
                w[s0 - ramp:s0] = np.linspace(1, lo, ramp)
            if s1 + ramp < n:
                w[s1:s1 + ramp] = np.linspace(lo, 1, ramp)
        duck = np.minimum(duck, w)

    mixd = music * duck[:, None] * db(cfg.get('musicDb', -6)) + sfx * db(cfg.get('sfxDb', 0)) + accents * db(cfg.get('accentDb', 0)) + voice
    peak = float(np.abs(mixd).max()) if len(mixd) else 0
    if peak > 0:
        mixd = mixd / max(peak, 1e-6) * 0.98 if peak > 2.0 else mixd
    tail = spec.get('fadeOut', 0.0)
    if tail > 0:
        mixd *= fade(n, 0, tail)[:, None]
    mixd = master(lookahead_limit(mixd, -3.0), spec.get('lufs', -14.0))
    raw = mixd.astype(np.float32).tobytes()
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_s24le', out_path], input=raw, check=True)
    print(json.dumps({'out': out_path, 'seconds': n / SR, 'sfxPlaced': placed, 'peakBeforeLimit': round(peak, 3), 'lufs': round(loudness(mixd), 1)}))


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
