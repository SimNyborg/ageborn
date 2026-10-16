// R9 "The biggest capsule": a first Aeon capsule (the game's top tier) climbing all seven tiers with
// perfect hammer strikes (rising climb tones), the Aeon burst, and three Legendary walkouts. Filmed from
// the dev capsule bench under the virtual clock like R6, but only the spans the edit uses are shot: the
// clock still runs through the rest (fan, Commons, Epics), it just is not photographed, which saves
// about half the filming time. Markers, steps and sound cues are mapped to output frames.
import { writeFileSync } from 'node:fs';
import { launch } from '../lib/capture.mjs';
import { GAME_URL } from '../lib/config.mjs';
import { pngPipe, VTIME_INIT } from '../lib/vtime.mjs';

const CASE = 'first-aeon';
const FPS = 30;
/** Show-time spans to film (seconds), from tools/capsule-plan.ts first-aeon. */
const KEEP = [
  [0.0, 11.0], // arrival, charge, 4 strikes, 2 summit strikes, the Aeon burst, "first Aeon" banner
  [26.9, 31.6], // Legendary 1: signal, burst, start of the walkout
  [38.45, 41.7], // Legendary 2
  [44.0, 47.4], // Legendary 3
];
const END = 47.4;

const HIDE_CHROME = `
  [data-testid="capsule-screen"] > div[class*="top"],
  [data-testid="capsule-screen"] > div[class*="bottom"],
  [data-testid="capsule-honesty"] { visibility: hidden !important; }`;

export async function record({ out, viewport = { width: 960, height: 540 } }) {
  const b = await launch();
  try {
    const page = await b.newPage({ viewport, deviceScaleFactor: 2 });
    page.on('pageerror', (e) => console.error('[page error]', e.message));
    await page.addInitScript(VTIME_INIT);
    await page.goto(`${GAME_URL}/?dev=1&bare=1&autotap=perfect#capsuleBench/${CASE}`);
    await page.waitForFunction(() => !!window.__capsuleBench, null, { timeout: 180_000 });
    await page.addStyleTag({ content: HIDE_CHROME });
    await page.waitForFunction(() => window.__capsuleBench.step() !== null, null, { timeout: 120_000, polling: 16 });
    await page.evaluate(() => window.__vt.engage());

    const cdp = await page.context().newCDPSession(page);
    const dpr = await page.evaluate(() => window.devicePixelRatio || 1);
    const enc = pngPipe(`${out}/aeon.mp4`, FPS);
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
      if (n % 30 === 0) process.stdout.write(`  aeon.mp4: ${n} frames (show ${(k / FPS).toFixed(1)} s, ${((Date.now() - t0) / 1000 / (k + 1)).toFixed(2)} s/show-frame)\r`);
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
    writeFileSync(`${out}/aeon.json`, JSON.stringify({ file: 'aeon.mp4', fps: FPS, width: viewport.width * 2, height: viewport.height * 2, frames: n, seconds: n / FPS, markers, steps: filmed, plan, sounds, events: [], states: filmed.map(() => ({})) }));
    console.log(`r9: ${n} frames, ${sounds.length} cues, markers ${markers.map((m) => m.name).join(' ')}`);
    await page.close();
  } finally {
    await b.close();
  }
}
