// Grabs the game's own wordmark SVG (emblem + AGEBORN lockup) from its title screen, as rendered.
import { writeFileSync } from 'node:fs';
import { launch } from '../lib/capture.mjs';
import { ASSETS, GAME_URL } from '../lib/config.mjs';
const b = await launch();
const page = await b.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
await page.goto(`${GAME_URL}/`);
await page.waitForSelector('svg.ui-wordmark', { timeout: 120000 });
await page.waitForTimeout(1500);
const svg = await page.evaluate(() => document.querySelector('svg.ui-wordmark').outerHTML);
const noText = await page.evaluate(() => {
  // the emblem alone: the shield group, in its own viewBox
  const g = document.querySelector('svg.ui-wordmark .ui-wordmark__emblem');
  return g ? g.outerHTML : null;
});
writeFileSync(`${ASSETS}/wordmark.raw.svg`, svg);
if (noText) writeFileSync(`${ASSETS}/emblem.raw.svg.txt`, noText);
await page.screenshot({ path: `${ASSETS}/title-screen.png` });
console.log(svg.length, noText?.length);
await b.close();
