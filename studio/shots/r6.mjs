// R6 "Legendary pull": a Time Capsule opening from the game's own capsule show (the dev capsule bench,
// real art, perfect hammer taps), recorded frame by frame under the virtual clock (lib/vtime.mjs), so
// the Pixi stage and the screen's CSS animations stay in step at 30 fps. The show's sound cues come from
// its own plan (the same `planOpenAll` the bench runs), placed at the frames each step started.
import { writeFileSync } from 'node:fs';
import { launch } from '../lib/capture.mjs';
import { GAME_URL } from '../lib/config.mjs';
import { recordPage, VTIME_INIT } from '../lib/vtime.mjs';

export const CASES = [
  // a Gold capsule's arrival and its four hammer strikes (the edit uses the strikes only)
  { name: 'first', id: 'legendary-first', seconds: 6.5 },
  // one opening that climbs Common, Rare, Epic, Legendary (quick reveal)
  { name: 'ladder', id: 'burst-ladder', seconds: 11.6 },
];

/**
 * The show is designed for a 1280x720 stage (fitted, "contain"), so it is filmed in landscape at 2x
 * (1920x1080) and the edit places it in the vertical frame (layout `wide`). The screen's own chrome
 * (guarantees, counter, capsule name, skip hint) is hidden: the edit has its own text.
 */
const HIDE_CHROME = `
  [data-testid="capsule-screen"] > div[class*="top"],
  [data-testid="capsule-screen"] > div[class*="bottom"],
  [data-testid="capsule-kind"], [data-testid="capsule-honesty"] { visibility: hidden !important; }`;

export async function record({ out, only, viewport = { width: 960, height: 540 } }) {
  const b = await launch();
  try {
    for (const c of CASES) {
      if (only && only !== c.name) continue;
      const page = await b.newPage({ viewport, deviceScaleFactor: 2 });
      page.on('pageerror', (e) => console.error('[page error]', e.message));
      await page.addInitScript(VTIME_INIT);
      await page.goto(`${GAME_URL}/?dev=1&bare=1&autotap=perfect#capsuleBench/${c.id}`);
      await page.waitForFunction(() => !!window.__capsuleBench, null, { timeout: 180_000 });
      await page.addStyleTag({ content: HIDE_CHROME });
      // the art loads in real time; the clock stops the moment the show has started
      await page.waitForFunction(() => window.__capsuleBench.step() !== null, null, { timeout: 120_000, polling: 16 });
      await page.evaluate(() => window.__vt.engage());
      const steps = [];
      await recordPage(page, `${out}/${c.name}.mp4`, {
        frames: Math.round(c.seconds * 30),
        fps: 30,
        afterFrame: async (k) => steps.push({ frame: k, ...(await page.evaluate(() => window.__capsuleBench.step())) }),
      });
      // the plan the bench plays, with every step's sound cues
      const plan = await page.evaluate(async (caseId) => {
        const [{ BENCH_CASES }, cap, contentMod] = await Promise.all([import('/src/dev/capsuleBench/cases.ts'), import('/src/capsule/index.ts'), import('/src/content/index.ts')]);
        const bench = BENCH_CASES.find((x) => x.id === caseId);
        const catalog = cap.createCatalog(contentMod.content);
        const p = cap.planOpenAll(bench.reveals ?? [], { catalog, quickReveal: bench.quickReveal === true, ...(bench.progress ? { progress: bench.progress } : {}) });
        return p.steps.map((s) => ({ id: s.id, kind: s.kind, durationMs: Number.isFinite(s.durationMs) ? s.durationMs : null, cues: s.cues ?? [], card: s.card ? { card: s.card.card, rarity: s.card.rarity } : null }));
      }, c.id);
      // each step's start frame (from the step time the runner reported), and its cues as sound calls
      const startOf = new Map();
      for (const st of steps) {
        if (!st.id || startOf.has(st.id)) continue;
        startOf.set(st.id, st.frame - Math.round(((st.t ?? 0) / 1000) * 30));
      }
      const sounds = [];
      for (const s of plan) {
        const f0 = startOf.get(s.id);
        if (f0 === undefined) continue;
        for (const cue of s.cues) sounds.push({ kind: 'play', id: cue.sound, o: { pitchBp: cue.pitchBp ?? 10000, volumeDb: cue.volumeDb ?? 0 }, clipFrame: f0 + Math.round((cue.atMs / 1000) * 30), step: s.id });
      }
      sounds.sort((a, z) => a.clipFrame - z.clipFrame);
      const markers = [...startOf.entries()].map(([id, frame]) => ({ name: id, frame, kind: plan.find((p) => p.id === id)?.kind ?? null }));
      writeFileSync(`${out}/${c.name}.json`, JSON.stringify({ file: `${c.name}.mp4`, fps: 30, width: viewport.width * 2, height: viewport.height * 2, frames: steps.length, seconds: steps.length / 30, markers, steps, plan, sounds, events: [], states: steps.map(() => ({})) }));
      console.log(`r6 ${c.name}: ${steps.length} frames, ${sounds.length} cues, steps ${plan.map((p) => p.kind).join(' ')}`);
      await page.close();
    }
  } finally {
    await b.close();
  }
}
