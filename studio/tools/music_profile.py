#!/usr/bin/env python3
"""Loudness and brightness profile of the game's music files (studio helper for choosing sections)."""
import subprocess, sys
import numpy as np
SR = 24000
for path in sys.argv[1:]:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, dtype=np.float32)
    win = SR * 2
    rms = [20 * np.log10(np.sqrt(np.mean(a[i:i + win] ** 2)) + 1e-9) for i in range(0, len(a) - win, win)]
    # onset strength: mean positive spectral flux per 2 s (rhythmic drive)
    n = 1024
    frames = np.lib.stride_tricks.sliding_window_view(a, n)[::512]
    spec = np.abs(np.fft.rfft(frames * np.hanning(n), axis=1))
    flux = np.maximum(0, np.diff(spec, axis=0)).sum(axis=1)
    per = int(2 * SR / 512)
    fl = [float(flux[i:i + per].mean()) for i in range(0, len(flux) - per, per)]
    m = max(fl) or 1
    name = path.split('/')[-1]
    print(f'{name:36s} dur={len(a)/SR:5.1f}s')
    print('  rms dB  :', ' '.join(f'{r:4.0f}' for r in rms))
    print('  drive % :', ' '.join(f'{100*f/m:4.0f}' for f in fl))
