// Runs a shot script: `node scripts/record.mjs r1` records the clips of shots/r1.mjs into
// public/clips/r1/ (videos and JSON sidecars). Needs the game's dev server (scripts/server.mjs).
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { CaptureSession, launch } from '../lib/capture.mjs';
import { PUBLIC, STUDIO } from '../lib/config.mjs';

const name = process.argv[2];
const only = process.argv[3] ?? null;
if (!name) {
  console.error('usage: node scripts/record.mjs <shot> [clip]');
  process.exit(1);
}
const mod = await import(pathToFileURL(path.join(STUDIO, 'shots', `${name}.mjs`)).href);
const out = path.join(PUBLIC, 'clips', name);
mkdirSync(out, { recursive: true });
const browser = await launch();
const t0 = Date.now();
try {
  await mod.record({
    out,
    only,
    /** Opens a capture page (one battle) in this browser. */
    open: (o) => CaptureSession.open({ ...o, browser }),
  });
} finally {
  await browser.close();
}
console.log(`${name}: recorded in ${((Date.now() - t0) / 60000).toFixed(1)} min`);
