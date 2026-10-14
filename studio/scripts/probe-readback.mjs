// Probe: readback cost of the capture canvas (jpeg, webp, raw rgba).
import { writeFileSync } from 'node:fs';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 540, height: 960 }, deviceScaleFactor: 2 });
await page.goto(`http://127.0.0.1:7951/?dev=1&left=medieval&right=medieval&bots=2#capture`);
await page.waitForFunction(() => !!window.__capture, null, { timeout: 120000 });
await page.evaluate(() => window.__capture.whenReady());
await page.evaluate(() => window.__capture.skip(14000));
await page.evaluate(() => window.__capture.camera({ kind: 'fight', wMin: 480, wMax: 700, ground: 0.66, how: { move: 'cut' } }));
let t = Date.now();
for (let i = 0; i < 10; i++) await page.evaluate(() => window.__capture.step(1));
console.log('step only', (Date.now() - t) / 10, 'ms/frame');
for (const [type, q] of [['image/jpeg', 0.95], ['image/webp', 1], ['image/png', 1]]) {
  t = Date.now();
  let len = 0;
  for (let i = 0; i < 5; i++) {
    const d = await page.evaluate(([ty, qq]) => { window.__capture.step(1); return window.__capture.snap(ty, qq); }, [type, q]);
    len = d.length;
    if (i === 0) writeFileSync(`work/probe3/rb.${type.split('/')[1]}`, Buffer.from(d.split(',')[1], 'base64'));
  }
  console.log(type, (Date.now() - t) / 5, 'ms/frame', Math.round(len / 1024), 'KB b64');
}
// raw readback via gl.readPixels on the pixi canvas
t = Date.now();
for (let i = 0; i < 5; i++) {
  const b64 = await page.evaluate(async () => {
    await window.__capture.step(1);
    const c = document.querySelector('canvas');
    const gl = c.getContext('webgl2') || c.getContext('webgl');
    const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const px = new Uint8Array(w * h * 4);
    gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    // base64 in chunks
    let s = '';
    const CH = 0x8000;
    for (let k = 0; k < px.length; k += CH) s += String.fromCharCode.apply(null, px.subarray(k, k + CH));
    return btoa(s);
  });
  if (i === 0) console.log('raw b64 MB', (b64.length / 1e6).toFixed(1));
}
console.log('raw', (Date.now() - t) / 5, 'ms/frame');
await browser.close();
