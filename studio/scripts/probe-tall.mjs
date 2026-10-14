// Probe: tall (9:16) render of the capture page with a few framings.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const [, , out, query = 'left=medieval&right=medieval&bots=2', vw = '540', vh = '960'] = process.argv;
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: Number(vw), height: Number(vh) }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:7951/?dev=1&${query}#capture`);
await page.waitForFunction(() => !!window.__capture, null, { timeout: 120000 });
await page.evaluate(() => window.__capture.whenReady());
const snap = async (name) => {
  const d = await page.evaluate(() => window.__capture.snap('image/jpeg', 0.92));
  writeFileSync(`${out}/${name}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
};
await page.evaluate(() => window.__capture.skip(14000));
for (const [name, shot] of [
  ['tall_w540_g62', { kind: 'fight', wMin: 540, wMax: 540, ground: 0.62, how: { move: 'cut' } }],
  ['tall_w700_g62', { kind: 'fight', wMin: 700, wMax: 700, ground: 0.62, how: { move: 'cut' } }],
  ['tall_w440_g70', { kind: 'fight', wMin: 440, wMax: 440, ground: 0.70, how: { move: 'cut' } }],
  ['tall_w1000_g58', { kind: 'fight', wMin: 1000, wMax: 1000, ground: 0.58, how: { move: 'cut' } }],
]) {
  await page.evaluate((s) => window.__capture.camera(s), shot);
  await page.evaluate(() => window.__capture.step(1));
  await snap(name);
}
await browser.close();
