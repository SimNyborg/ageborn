// Contact sheets and stills for reviewing a finished reel: evenly spaced frames with their times.
import { spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

const FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';

function duration(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
  return Number(r.stdout.trim());
}

/** A grid of `cols` x `rows` frames spread over the video, each stamped with its time. */
export function contactSheet(video, out, { cols = 6, rows = 4, width = 300 } = {}) {
  mkdirSync(path.dirname(out), { recursive: true });
  const n = cols * rows;
  const d = duration(video);
  const step = d / n;
  const vf = [
    `fps=1/${step.toFixed(4)}`,
    `scale=${width}:-2:flags=lanczos`,
    `drawtext=fontfile=${FONT}:text='%{pts\\:hms}':x=8:y=8:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.55:boxborderw=4`,
    `tile=${cols}x${rows}:padding=6:margin=6:color=0x202020`,
  ].join(',');
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', (step / 2).toFixed(3), '-i', video, '-vf', vf, '-frames:v', '1', '-q:v', '3', out], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return out;
}

/** Full-resolution stills at given times (seconds), for close inspection. */
export function stills(video, dir, times) {
  mkdirSync(dir, { recursive: true });
  return times.map((t) => {
    const out = path.join(dir, `t${t.toFixed(2).replace('.', '_')}.png`);
    const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(t), '-i', video, '-frames:v', '1', out], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(r.stderr);
    return out;
  });
}
