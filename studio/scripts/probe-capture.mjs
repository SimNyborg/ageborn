// Probe the capture page: open it, wait until ready, run a bot match for a while, snap stills.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const [, , out, query = 'left=medieval&right=medieval&bots=2', vw = '960', vh = '540', dprS = '2'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: Number(vw), height: Number(vh) }, deviceScaleFactor: Number(dprS) });
page.on('console', (m) => {
  const t = m.text();
  if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('GL Driver')) console.log('[console]', m.type(), t.slice(0, 300));
});
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
const t0 = Date.now();
await page.goto(`http://127.0.0.1:7951/?dev=1&${query}#capture`);
await page.waitForFunction(() => !!window.__capture, null, { timeout: 120000 });
console.log('stage up in', Date.now() - t0, 'ms');
const st0 = await page.evaluate(() => window.__capture.whenReady());
console.log('ready in', Date.now() - t0, 'ms', JSON.stringify(st0.sides));
await page.evaluate(() => window.__capture.camera({ kind: 'fight', how: { move: 'cut' } }));
const snap = async (name) => {
  const d = await page.evaluate(() => window.__capture.snap('image/jpeg', 0.92));
  writeFileSync(`${out}/${name}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
};
await page.evaluate(() => window.__capture.step(1));
await snap('f000');
for (let k = 1; k <= 6; k++) {
  const t1 = Date.now();
  const st = await page.evaluate(() => window.__capture.skip(8000));
  await page.evaluate(() => window.__capture.step(1));
  await snap(`f${String(k).padStart(3, '0')}`);
  console.log(`k=${k} tick=${st.tick} units=${st.sides.map((s) => s.units)} cam=${JSON.stringify(st.camera)} (${Date.now() - t1} ms)`);
}
// timing of real frames
const t2 = Date.now();
for (let i = 0; i < 30; i++) {
  await page.evaluate(() => window.__capture.step(1));
  await page.evaluate(() => window.__capture.snap('image/jpeg', 0.92));
}
console.log('30 step+snap', Date.now() - t2, 'ms');
const sounds = await page.evaluate(() => window.__capture.drainSounds());
const events = await page.evaluate(() => window.__capture.drainEvents());
console.log('sounds', sounds.length, sounds.slice(0, 5), 'events', events.length);
await browser.close();
