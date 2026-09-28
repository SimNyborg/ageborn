import { chromium } from '@playwright/test';
const url = process.argv[2] ?? 'http://localhost:4421/';
const w = Number(process.argv[3] ?? 1280), h = Number(process.argv[4] ?? 720);
const tag = process.argv[5] ?? 'd';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: w, height: h } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push('PAGEERR ' + e.message));
const ids = async () => page.evaluate(() => [...new Set([...document.querySelectorAll('[data-testid]')].filter(e => e.getClientRects().length > 0).map(e => e.getAttribute('data-testid')))].slice(0, 50).join(' '));
const ff = (n) => page.evaluate((n) => window.__agebornDev?.fastForward(n) ?? -1, n);
let k = 0;
const shot = async (name) => { k++; await page.screenshot({ path: `/tmp/claude-0/shots/${tag}${String(k).padStart(2,'0')}-${name}.png` }); console.log('SHOT', name, '|', await ids()); };
const vis = (id) => page.getByTestId(id).first().isVisible().catch(() => false);
async function toResult() {
  for (let i = 0; i < 300; i++) { await ff(2000); if (await vis('result')) return true; await page.waitForTimeout(100); }
  return false;
}
async function capsules(name) {
  for (let i = 0; i < 120; i++) {
    if (await vis('capsule-summary')) { await shot(name + '-summary'); return true; }
    if (i === 3) await shot(name + '-open');
    const skip = page.getByTestId('capsule-skip');
    if (await skip.isVisible().catch(()=>false)) await skip.click().catch(()=>{});
    else await page.mouse.click(w/2, h/2);
    await page.waitForTimeout(400);
  }
  await shot(name + '-stuck'); return false;
}
await page.goto(url + '?dev=1&autopilot=1');
await page.waitForTimeout(3000);
await toResult(); await page.waitForTimeout(4000); await shot('result1');
await page.getByTestId('next').click(); await page.waitForTimeout(1500);
await capsules('cap1');
// close summary
for (const id of ['capsule-continue','capsule-done','capsule-close','summary-continue']) { if (await vis(id)) { await page.getByTestId(id).first().click({ force: true, timeout: 5000 }).catch(() => page.getByTestId(id).first().evaluate((e) => e.click())); break; } }
await page.waitForTimeout(2000); await shot('after-cap1');
if (await vis('play')) { await page.getByTestId('play').click(); }
await page.waitForTimeout(3000); await shot('match2');
await toResult(); await page.waitForTimeout(5000); await shot('result2');
if (await vis('next')) await page.getByTestId('next').click();
await page.waitForTimeout(1500);
await capsules('cap2');
for (const id of ['capsule-continue','capsule-done','capsule-close','summary-continue']) { if (await vis(id)) { await page.getByTestId(id).first().click({ force: true, timeout: 5000 }).catch(() => page.getByTestId(id).first().evaluate((e) => e.click())); break; } }
await page.waitForTimeout(2500); await shot('after-cap2');
await page.waitForTimeout(1500); await shot('upgrade-offer'); if (await vis('first-upgrade-go')) { await page.getByTestId('first-upgrade-go').click(); await page.waitForTimeout(450); await shot('upgrade-slam'); await page.waitForTimeout(1200); await shot('upgrade-done'); await page.getByTestId('first-upgrade-continue').click(); } await page.waitForTimeout(2000); await shot('home');
console.log('ERR', errors.slice(0,10));
await browser.close();
