// DV2 "How to make a capsule opening feel good" (devlog #2): the same first-Aeon show filmed with the
// capsule bench's own switches, one layer at a time: placeholder art with reduced motion and lite effects
// ("plain"), real art ("art"), full motion ("motion"); the finished show (everything on) is R9's clip.
// Filmed like R9 under the virtual clock; only the KEEP span is photographed.
import { writeFileSync } from 'node:fs';
import { launch } from '../lib/capture.mjs';
import { GAME_URL } from '../lib/config.mjs';
import { pngPipe, VTIME_INIT } from '../lib/vtime.mjs';

const CASE = 'first-aeon';
const FPS = 30;
/** Bench query flags and filmed span (show seconds, from tools/capsule-plan.ts first-aeon) per layer. */
const VARIANTS = {
  plain: { flags: '&art=fake&rm=1&lite=1', keep: [[0.0, 10.6]] },
  art: { flags: '&rm=1&lite=1', keep: [[1.8, 10.6]] },
  motion: { flags: '&lite=1', keep: [[1.8, 10.6]] },
};

const HIDE_CHROME = `
  [data-testid="capsule-screen"] > div[class*="top"],
  [data-testid="capsule-screen"] > div[class*="bottom"],
  [data-testid="capsule-honesty"] { visibility: hidden !important; }`;

export async function record({ out, only }) {
  for (const [name, v] of Object.entries(VARIANTS)) {
    if (only && only !== name) continue;
    await film({ out, name, flags: v.flags, KEEP: v.keep });
  }
}

async function film({ out, name, flags, KEEP, viewport = { width: 960, height: 540 } }) {
  const END = KEEP[KEEP.length - 1][1];
  const b = await launch();
  try {
    const page = await b.newPage({ viewport, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    await page.addInitScript(VTIME_INIT);
    await page.goto(`${GAME_URL}/?dev=1&bare=1&autotap=perfect${flags}#capsuleBench/${CASE}`);
    await page.waitForFunction(() => !!window.__capsuleBench, null, { timeout: 180_000 });
    await page.addStyleTag({ content: HIDE_CHROME });
    await page.waitForFunction(() => window.__capsuleBench.step() !== null, null, { timeout: 120_000, polling: 16 });
    await page.evaluate(() => window.__vt.engage());

    const cdp = await page.context().newCDPSession(page);
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
    const enc = pngPipe(`${out}/${name}.mp4`, FPS);
    const total = Math.round(END * FPS);
    const keep = (k) => KEEP.some(([a, z]) => k >= Math.round(a * FPS) && k < Math.round(z * FPS));
    const outOf = new Map(); // show frame -> output frame
    const steps = [];
    const t0 = Date.now();
    let n = 0;
    for (let k = 0; k < total; k++) {
      await page.evaluate((ms) => window.__vt.tick(ms), 1000 / FPS);
      const st = await page.evaluate(() => window.__capsuleBench.step());
      steps.push({ show: k, ...st });
      if (!keep(k)) continue;
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', fromSurface: true, clip: { x: 0, y: 0, width: viewport.width, height: viewport.height, scale: dpr } });
      await enc.write(Buffer.from(shot.data, 'base64'));
      outOf.set(k, n++);
      if (n % 30 === 0) process.stdout.write(`  ${name}.mp4: ${n} frames (show ${(k / FPS).toFixed(1)} s, ${((Date.now() - t0) / 1000 / (k + 1)).toFixed(2)} s/show-frame)\r`);
    }
    await enc.close();
    await cdp.detach();
    process.stdout.write('\n');

    const plan = await page.evaluate(async (caseId) => {
      const [{ BENCH_CASES }, cap, contentMod] = await Promise.all([import('/src/dev/capsuleBench/cases.ts'), import('/src/capsule/index.ts'), import('/src/content/index.ts')]);
      const bench = BENCH_CASES.find((x) => x.id === caseId);
      const catalog = cap.createCatalog(contentMod.content);
      const p = cap.planOpenAll(bench.reveals ?? [], { catalog, quickReveal: bench.quickReveal === true, ...(bench.progress ? { progress: bench.progress } : {}) });
      return p.steps.map((s) => ({ id: s.id, kind: s.kind, cues: s.cues ?? [], card: s.card ? { card: s.card.card, rarity: s.card.rarity } : null }));
    }, CASE);
    // each step's start in show frames, then everything mapped to output frames (dropped if not filmed)
    const startOf = new Map();
    for (const st of steps) {
      if (!st.id || startOf.has(st.id)) continue;
      startOf.set(st.id, st.show - Math.round(((st.t ?? 0) / 1000) * FPS));
    }
    const sounds = [];
    for (const s of plan) {
      const f0 = startOf.get(s.id);
      if (f0 === undefined) continue;
      for (const cue of s.cues) {
        const o = outOf.get(f0 + Math.round((cue.atMs / 1000) * FPS));
        if (o === undefined) continue;
        sounds.push({ kind: 'play', id: cue.sound, o: { pitchBp: cue.pitchBp ?? 10000, volumeDb: cue.volumeDb ?? 0 }, clipFrame: o, step: s.id });
      }
    }
    sounds.sort((a, z) => a.clipFrame - z.clipFrame);
    // a marker per step at its first filmed frame (a step that starts off-camera is marked where filming resumes)
    const markers = [];
    for (const [id, f0] of startOf) {
      let o;
      for (let k = Math.max(0, f0); k < total && o === undefined; k++) o = outOf.get(k);
      if (o !== undefined) markers.push({ name: id, frame: o, kind: plan.find((p) => p.id === id)?.kind ?? null });
    }
    KEEP.forEach(([a], i) => markers.push({ name: `span-${i}`, frame: outOf.get(Math.round(a * FPS)), kind: 'span' }));
    const filmed = steps.filter((s) => outOf.has(s.show)).map((s) => ({ ...s, frame: outOf.get(s.show) }));
    writeFileSync(`${out}/${name}.json`, JSON.stringify({ file: `${name}.mp4`, fps: FPS, width: viewport.width * 2, height: viewport.height * 2, frames: n, seconds: n / FPS, markers, steps: filmed, plan, sounds, events: [], states: filmed.map(() => ({})) }));
    console.log(`dv2 ${name}: ${n} frames, ${sounds.length} cues, markers ${markers.map((m) => m.name).join(' ')}`);
    await page.close();
  } finally {
    await b.close();
  }
}
