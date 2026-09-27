import { chromium } from '@playwright/test';
const url = process.argv[2];
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const t0 = Date.now();
page.on('console', (m) => console.log(`[${Date.now()-t0}ms] ${m.type()}: ${m.text().slice(0, 300)}`));
page.on('pageerror', (e) => console.log(`pageerror: ${e.message}`));
await page.goto(url);
for (let i = 0; i < 8; i++) {
  await page.waitForTimeout(1500);
  const r = await Promise.race([page.evaluate(() => [document.querySelectorAll('[data-testid]').length, performance.now()|0]), new Promise((r) => setTimeout(() => r('busy'), 3000))]);
  console.log('poll', i, JSON.stringify(r));
}
await browser.close();
