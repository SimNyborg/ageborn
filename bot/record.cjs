// Records a stretch of a live Ageborn battle as JPEG frames at a steady frame rate.
//
// Headless Chromium has no GPU here, so the game renders far below 30 fps. Instead of filming in
// real time, the page runs on Playwright's fake clock: each step advances game time by exactly one
// frame and takes a screenshot, so the video is smooth however slow the machine is.
//
// usage: node record.cjs <url> <outDir> <seed> <skipTicks> <seconds> <fps> [short|standard|full]
// Prints one JSON line: { frames, route, age, skip, seed, format, pageErrors }. `age` is your side's
// age at the end (the full format walks all eight ages, so ageIndex maps straight to the age id).
const fs = require('fs');
const path = require('path');

function loadPlaywright() {
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) {
    try {
      return require(p);
    } catch {}
  }
  throw new Error('playwright not found');
}

(async () => {
  const [url, out, seed, skip, secs, fps, fmt] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], +process.argv[6], +process.argv[7], process.argv[8] || 'full'];
  fs.mkdirSync(out, { recursive: true });
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch({ args: ['--no-proxy-server', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--mute-audio'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.clock.install();
  await page.goto(url, { waitUntil: 'load' });
  const inBattle = () => window.__agebornDev && window.__agebornDev.controller.route.peek().id === 'battle';
  await page.waitForFunction(inBattle, null, { timeout: 90000 });
  // The autopilot never drags, so the first-time "drag here" coach hints would stay up all video.
  await page.addStyleTag({ content: '.hud-flag-hint, .hud-power-hint, .hud-power-hand, .hud-fort-chip.is-hint { display: none !important; }' });

  // The app seeds quick battles from a counter, so the first one is the same every day. Start a new
  // one with a seed of our own.
  await page.evaluate(([s, format]) => {
    const c = window.__agebornDev.controller;
    window.__reelOld = c.route.peek().battle;
    c.seedCounter = s;
    c.quickBattle(format);
  }, [seed, fmt]);
  await page.waitForFunction(() => {
    const r = window.__agebornDev.controller.route.peek();
    return r.id === 'battle' && r.battle !== window.__reelOld;
  }, null, { timeout: 90000 });

  const ran = await page.evaluate((n) => window.__agebornDev.fastForward(n), skip);
  if (ran < skip) throw new Error(`battle ended during fast-forward (${ran} of ${skip} ticks)`);
  await page.waitForTimeout(2000); // let the newly visible units' sheets load

  const now = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(now + 1000);
  const n = Math.round(secs * fps);
  for (let i = 0; i < n; i++) {
    await page.clock.runFor(Math.round((1000 / fps) * (i + 1)) - Math.round((1000 / fps) * i));
    await page.screenshot({ path: path.join(out, `f${String(i).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 92 });
  }
  const { route, age } = await page.evaluate(() => {
    const r = window.__agebornDev.controller.route.peek();
    const ages = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];
    const i = r.id === 'battle' ? r.battle.session.sim.state.sides[0].ageIndex : -1;
    return { route: r.id, age: ages[i] || '' };
  });
  await browser.close();
  console.log(JSON.stringify({ frames: n, route, age, skip, seed, format: fmt, pageErrors: errors.slice(0, 5) }));
})().catch((e) => {
  console.error(String(e && e.stack ? e.stack : e));
  process.exit(1);
});
