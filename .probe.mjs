import { chromium } from '@playwright/test';
const SP = '/tmp/claude-0/-home-user-ageborn/e9e6071d-3409-58a6-a28d-0aba492052fd/scratchpad';
const url = process.argv[2] ?? 'http://localhost:4173/ageborn/';
const tag = process.argv[3] ?? 'probe';
const w = Number(process.argv[4] ?? 1280), h = Number(process.argv[5] ?? 720);
const steps = (process.argv[6] ?? '').split(',').filter(Boolean);
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: w, height: h }, hasTouch: w < 900, isMobile: false });
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(`${m.type()}: ${m.text()}`); });
page.on('pageerror', (e) => errs.push(`pageerror: ${e.message}`));
await page.goto(url);
await page.waitForTimeout(2500);
await page.screenshot({ path: `${SP}/${tag}-0.png` });
let i = 1;
for (const s of steps) {
  if (s.startsWith('click:')) await page.getByTestId(s.slice(6)).click({ timeout: 5000 }).catch((e) => errs.push('click fail ' + s));
  else if (s.startsWith('wait:')) await page.waitForTimeout(Number(s.slice(5)));
  else if (s.startsWith('ff:')) console.log('ff', await page.evaluate((n) => window.__agebornDev?.fastForward(n), Number(s.slice(3))));
  else if (s.startsWith('eval:')) console.log('eval', await page.evaluate(s.slice(5)));
  else if (s === 'shot') { await page.screenshot({ path: `${SP}/${tag}-${i}.png` }); i++; }
}
console.log('testids:', await page.evaluate(() => [...document.querySelectorAll('[data-testid]')].map((e) => e.getAttribute('data-testid')).slice(0, 60).join(' ')));
console.log(errs.join('\n') || 'no errors');
await browser.close();
