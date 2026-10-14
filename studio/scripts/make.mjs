// Builds a finished Reel from its recorded clips: `node scripts/make.mjs r1 [--no-render]`.
//   1. the edit (reels/<id>.mjs) writes work/<id>/edl.json and mix.json
//   2. lib/mix.py mixes the game's music and the recorded sound effects into public/audio/<id>.wav
//   3. Remotion renders the EDL (work/<id>/video.mp4), the final encode makes out/reels/<file>.mp4
//   4. a contact sheet goes to out/sheets/<file>.jpg
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { OUT, PUBLIC, STUDIO, WORK } from '../lib/config.mjs';
import { finalEncode, probe, renderReelVideo } from '../lib/render.mjs';
import { contactSheet } from '../lib/sheets.mjs';

const ids = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const noRender = process.argv.includes('--no-render');
const keep = process.argv.includes('--keep');

for (const id of ids) {
  const t0 = Date.now();
  const mod = await import(pathToFileURL(path.join(STUDIO, 'reels', `${id}.mjs`)).href);
  const { edl, mix, file, cover = 0.4 } = await mod.edit();
  const wav = path.join(PUBLIC, 'audio', `${id}.wav`);
  const m = spawnSync('python3', [path.join(STUDIO, 'lib', 'mix.py'), mix, wav], { encoding: 'utf8' });
  if (m.status !== 0) throw new Error(`mix failed: ${m.stderr}`);
  console.log(`${id}: mix ${m.stdout.trim()}`);
  if (noRender) continue;
  const video = await renderReelVideo(JSON.parse(readFileSync(edl, 'utf8')), path.join(WORK, id, 'video.mp4'));
  const out = path.join(OUT, 'reels', `${file}.mp4`);
  finalEncode(video, wav, out);
  contactSheet(out, path.join(OUT, 'sheets', `${file}.jpg`));
  // a cover frame for the post (Instagram also lets you pick one in the app)
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-ss', String(cover), '-i', out, '-frames:v', '1', '-q:v', '2', path.join(OUT, 'reels', `${file}-cover.jpg`)]);
  // the silent intermediate is large; keep it only on request (`--keep`)
  if (!keep) rmSync(video, { force: true });
  const p = probe(out);
  console.log(`${id}: ${out} ${Number(p.format.duration).toFixed(2)} s, ${(Number(p.format.size) / 1e6).toFixed(1)} MB (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
}
