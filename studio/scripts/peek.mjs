// Renders single frames of a reel's edit as PNGs, to check text and layout without a full render:
// `node scripts/peek.mjs r5 0 120 400` (output frames) -> work/review/r5-<frame>.png, plus a strip.
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { STUDIO, WORK } from '../lib/config.mjs';
import { renderStillPng } from '../lib/render.mjs';

const [id, ...frames] = process.argv.slice(2);
const mod = await import(pathToFileURL(path.join(STUDIO, 'reels', `${id}.mjs`)).href);
const { edl } = await mod.edit();
const props = JSON.parse(readFileSync(edl, 'utf8'));
const files = [];
for (const f of frames.map(Number)) {
  const file = path.join(WORK, 'review', `${id}-${f}.png`);
  await renderStillPng('Reel', { ...props, audio: undefined }, file, Math.min(f, props.durationInFrames - 1));
  files.push(file);
  console.log(file);
}
if (files.length > 1) {
  const strip = path.join(WORK, 'review', `${id}-strip.jpg`);
  const inputs = files.flatMap((f) => ['-i', f]);
  const filter = `${files.map((_, i) => `[${i}]scale=360:-1[s${i}]`).join(';')};${files.map((_, i) => `[s${i}]`).join('')}hstack=${files.length}`;
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', filter, '-q:v', '3', strip]);
  console.log(strip);
}
