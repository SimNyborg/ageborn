// Frame-exact capture of the game's Bot viewer lane (the sim drawn as plain shapes) with Playwright's fake clock.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
const [dir, secs, warm] = process.argv.slice(2);
mkdirSync(dir, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 2 });
await p.clock.install();
await p.goto('http://127.0.0.1:7951/?dev=1#botViewer');
await p.clock.runFor(Number(warm));
const lane = p.locator('[data-testid="bot-lane"]');
for (let i = 0; i < Math.round(Number(secs) * 30); i++) {
  await p.clock.runFor(1000 / 30);
  await lane.screenshot({ path: `${dir}/f${String(i).padStart(5, '0')}.png` });
}
await b.close();
