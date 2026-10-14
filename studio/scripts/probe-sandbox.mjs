// Probe: how fast can the sandbox render frames in software WebGL? (temporary measurement script)
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const out = process.argv[2];
const vw = Number(process.argv[3] ?? 960);
const vh = Number(process.argv[4] ?? 540);
const dpr = Number(process.argv[5] ?? 2);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await browser.newPage({ viewport: { width: vw, height: vh }, deviceScaleFactor: dpr });
page.on('console', (m) => {
  const t = m.text();
  if ((m.type() === 'error' || m.type() === 'warning') && !t.includes('GL Driver')) console.log('[console]', m.type(), t.slice(0, 200));
});
const t0 = Date.now();
await page.goto('http://127.0.0.1:7951/?dev=1&stage=1&source=real&art=procedural&format=w1.medieval&opponent=ai&autoplay=1#sandbox');
await page.waitForFunction(() => !!window.__sandbox, null, { timeout: 120000 });
console.log('ready in', Date.now() - t0, 'ms');
await page.waitForTimeout(3000);
await page.evaluate(() => window.__sandbox.manual(true));
let t1 = Date.now();
await page.evaluate(() => {
  for (let i = 0; i < 400; i++) window.__sandbox.step(50);
});
console.log('400 frames of 50ms (with pixi render) took', Date.now() - t1, 'ms');
t1 = Date.now();
for (let i = 0; i < 10; i++) await page.evaluate(() => window.__sandbox.step(1000 / 30));
console.log('10 single steps', Date.now() - t1, 'ms');
for (const [fmt, q, ext] of [
  ['image/png', undefined, 'png'],
  ['image/jpeg', 0.95, 'jpg'],
  ['image/webp', 1, 'webp'],
]) {
  t1 = Date.now();
  for (let i = 0; i < 5; i++) {
    const d = await page.evaluate(
      ([f, qq]) => {
        window.__sandbox.step(1000 / 30);
        return document.querySelector('canvas').toDataURL(f, qq);
      },
      [fmt, q],
    );
    writeFileSync(`${out}/frame${i}.${ext}`, Buffer.from(d.split(',')[1], 'base64'));
  }
  console.log(`5 step+${ext}`, Date.now() - t1, 'ms');
}
await browser.close();
