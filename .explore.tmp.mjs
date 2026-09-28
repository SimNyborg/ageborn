import { chromium } from '@playwright/test';
const url = process.argv[2] ?? 'http://localhost:4421/';
const w = Number(process.argv[3] ?? 1280), h = Number(process.argv[4] ?? 720);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
const ids = async () => page.evaluate(() => [...document.querySelectorAll('[data-testid]')].filter(e => e.offsetParent !== null || getComputedStyle(e).position==='fixed').map(e => e.getAttribute('data-testid')).slice(0, 60).join(' '));
const ff = (n) => page.evaluate((n) => window.__agebornDev?.fastForward(n) ?? -1, n);
const shot = async (name) => { await page.screenshot({ path: `/tmp/claude-0/shots/${name}-${w}.png` }); console.log('SHOT', name, '|', await ids()); };
await page.goto(url + '?dev=1&autopilot=1');
await page.waitForTimeout(4000);
await shot('01-start');
for (let i = 0; i < 200; i++) { await ff(2000); if (await page.getByTestId('result').isVisible().catch(()=>false)) break; await page.waitForTimeout(100); }
await page.waitForTimeout(3500);
await shot('02-result1');
console.log('ERR', errors.slice(0,10));
await browser.close();
