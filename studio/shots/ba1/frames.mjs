// Frame-exact capture of the Home island: Playwright's fake clock drives time, 30 fps, one clipped screenshot per frame.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [port, dir, secs, warm, clipArg] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 844, height: 440 }, deviceScaleFactor: 4 });
await p.clock.install();
await p.goto(`http://127.0.0.1:${port}/ageborn/?dev=1#screens/${process.env.VARIANT || "home-a2"}/844x390`);
await p.clock.runFor(Number(warm || 15000));
const clip = clipArg ? (([x, y, w, h]) => ({ x, y, width: w, height: h }))(clipArg.split(',').map(Number)) : undefined;
const n = Math.round(Number(secs) * 30);
for (let i = 0; i < n; i++) {
  await p.clock.runFor(1000 / 30);
  await p.screenshot({ path: `${dir}/f${String(i).padStart(5, '0')}.png`, clip, animations: 'allow' });
}
console.log(dir, n, 'frames');
await b.close();
