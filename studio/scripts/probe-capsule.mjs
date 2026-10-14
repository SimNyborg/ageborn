// Probe: the capsule bench under the virtual clock, portrait and landscape stills over time.
import { mkdirSync, writeFileSync } from 'node:fs';
import { launch } from '../lib/capture.mjs';
import { GAME_URL } from '../lib/config.mjs';
import { VTIME_INIT } from '../lib/vtime.mjs';

const [, , out, caseId = 'burst-ladder', vw = '540', vh = '960'] = process.argv;
mkdirSync(out, { recursive: true });
const b = await launch();
const page = await b.newPage({ viewport: { width: Number(vw), height: Number(vh) }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
page.on('console', (m) => {
  if (m.type() === 'error') console.log('[console]', m.text().slice(0, 200));
});
await page.addInitScript(VTIME_INIT);
await page.goto(`${GAME_URL}/?dev=1&bare=1&autotap=perfect#capsuleBench/${caseId}`);
await page.waitForFunction(() => !!window.__capsuleBench, null, { timeout: 120000 });
// give the art time to load in real time, then freeze time
await page.waitForTimeout(6000);
await page.evaluate(() => window.__vt.engage());
const cdp = await page.context().newCDPSession(page);
const t0 = Date.now();
for (let k = 0; k <= 30 * 16; k++) {
  await page.evaluate((ms) => window.__vt.tick(ms), 1000 / 30);
  if (k % 30 === 0) {
    const shot = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 85, fromSurface: true });
    writeFileSync(`${out}/s${String(k / 30).padStart(2, '0')}.jpg`, Buffer.from(shot.data, 'base64'));
    const step = await page.evaluate(() => window.__capsuleBench.step());
    console.log(`t=${k / 30}s step=${JSON.stringify(step)} (${((Date.now() - t0) / (k + 1)).toFixed(0)} ms/frame)`);
  }
}
await b.close();
