"""Assembles per-line narration takes (ElevenLabs, work/<id>/steve/l<i>.mp3) into work/<id>/narration.wav,
offsets.json and lines.json, with the lead and gaps from work/<id>/script.json (same output as narrate.py).
Each line is trimmed of edge silence and loudness-normalised. `python3 scripts/assemble_lines.py work/<id>`"""
import json, subprocess, sys, wave
from pathlib import Path

d = Path(sys.argv[1])
script = json.loads((d / 'script.json').read_text())
SR = 48000
pcm = bytearray()
def silence(s): return b'\x00\x00' * int(round(s * SR))
pcm += silence(script['lead'])
off = {}
for i, line in enumerate(script['lines']):
    src = d / 'steve' / f'l{i}.mp3'
    raw = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', str(src), '-af',
        'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-2:LRA=7',
        '-ar', str(SR), '-ac', '1', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    start = len(pcm) / 2 / SR
    pcm += raw
    off[line['key']] = [round(start, 3), round(len(raw) / 2 / SR, 3)]
    pcm += silence(line.get('gap', 0.3))
off['end'] = round(len(pcm) / 2 / SR - script['lines'][-1].get('gap', 0.3), 3)
with wave.open(str(d / 'narration.wav'), 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(bytes(pcm))
(d / 'offsets.json').write_text(json.dumps(off, indent=1))
(d / 'lines.json').write_text(json.dumps([l['text'] for l in script['lines']], indent=1))
print(off)
