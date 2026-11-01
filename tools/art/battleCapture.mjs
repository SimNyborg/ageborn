// Battle captures for the art rounds' evidence (item 47 audit 7.3): scenarios of a JSON file played on the dev
// capture page (`?dev=1#capture`) of a running server, the same seed and spawns on every build, snapped one sim step
// at a time at DPR 2. The camera holds the battle camera's view width (game scale: 923 lu on the phone, 1,400 lu on
// the desktop) unless a scenario tracks one unit (`track`, `trackWidth`) or sets its own `camera`.
//
// Writes <out>/<scenario>_<tag>/0000.png ... (file i = sim frame range[0] + i * every) and units.json (the tracked
// unit's HP in basis points and mode per snapped frame; the run stops once it is gone). Run it with --tag before
// against a server of the before tree and with --tag after against the working tree (art/blender/README.md,
// "Evidence for a wave"). Dev tool: not part of the build or the test suite.
//
// usage: node tools/art/battleCapture.mjs --scenarios FILE (--name NAME[,NAME...] | --all) --tag before|after
//          [--base http://127.0.0.1:5173/] [--out DIR] [--locks DIR --track NAME]
// --all: every scenario whose `tags` include --tag. --locks: the art round's lock folder; before each page load the
// tool waits while `quiet` or `e2e` there is held by another track (an owner line that does not start with
// "<track> "). Chromium: Playwright's own, or the binary in CHROMIUM (or PW_CHROMIUM_PATH), SwiftShader WebGL.
//
// Scenario file: { "<name>": { "query": "left=stone&right=stone&seed=11", "bars": false, "vp": "phone",
//   "tags": ["before", "after"], "range": [from, to], "every": 1,
//   "spawns": [[side, card, p, frame, level?], ...],
//   "track": <spawn index>?, "trackWidth": <lu>?, "camera": { "wMin": 640, "wMax": 760 }? } }
// p is the lane position from the side's own base (lu), frame the sim step to spawn at, level the card level.
/* global window */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
const base = arg('base', 'http://127.0.0.1:5173/');
const file = arg('scenarios', '');
const tag = arg('tag', '');
const out = arg('out', 'out/art-capture');
const locks = arg('locks', '');
const track = arg('track', '');

const VIEWPORTS = { phone: { width: 844, height: 390 }, desktop: { width: 1280, height: 720 } };
/** The battle camera's view width at these windows (game scale). */
const GAME_WIDTH = { phone: 923, desktop: 1400 };

const usage = 'usage: node tools/art/battleCapture.mjs --scenarios FILE (--name NAME[,NAME...] | --all) --tag before|after [--base URL] [--out DIR] [--locks DIR --track NAME]';
if (!file || !tag || (!argv.includes('--all') && !arg('name', ''))) {
  console.error(usage);
  process.exit(2);
}
const all = JSON.parse(fs.readFileSync(file, 'utf8'));
const names = argv.includes('--all')
  ? Object.keys(all).filter((n) => (all[n].tags ?? ['before', 'after']).includes(tag))
  : arg('name', '').split(',');
for (const n of names) {
  if (!all[n] || !VIEWPORTS[all[n].vp ?? 'phone']) {
    console.error(`no scenario "${n}" (or an unknown vp) in ${file}`);
    process.exit(2);
  }
}

/** The first lock in the lock folder held by another track, as "<lock>: <owner line>", or null. */
function foreignLock() {
  for (const n of ['quiet', 'e2e']) {
    const d = path.join(locks, n);
    if (!fs.existsSync(d)) continue;
    let owner = '';
    try {
      owner = fs.readFileSync(path.join(d, 'owner'), 'utf8').trim();
    } catch {
      // the owner line is being written
    }
    if (!track || !owner.startsWith(`${track} `)) return `${n}: ${owner}`;
  }
  return null;
}

async function waitForLocks() {
  if (!locks) return;
  for (;;) {
    const held = foreignLock();
    if (!held) return;
    console.log(`waiting (${new Date().toISOString().slice(11, 19)}) for ${held}`);
    await new Promise((r) => setTimeout(r, 25000));
  }
}

async function capture(browser, name) {
  const sc = all[name];
  const vp = sc.vp ?? 'phone';
  const every = sc.every ?? 1;
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await page.goto(`${base}?dev=1&${sc.query}&bars=${sc.bars ? 1 : 0}&numbers=off&hud=none&shake=0#capture`);
  await page.waitForFunction(() => window.__capture && typeof window.__capture.whenReady === 'function', null, { timeout: 180000 });
  await page.evaluate(() => window.__capture.whenReady());
  // hold every card's sheets up front so a spawn never draws a placeholder
  await page.evaluate((cards) => window.__capture.hold(cards), [...new Set(sc.spawns.map((s) => s[1]))]);
  if (sc.track === undefined) {
    const w = GAME_WIDTH[vp];
    await page.evaluate((cam) => window.__capture.camera({ kind: 'fight', how: { move: 'cut' }, ...cam }), sc.camera ?? { wMin: w, wMax: w });
  }
  const dir = path.join(out, `${name}_${tag}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const byFrame = new Map();
  sc.spawns.forEach((s, i) => byFrame.set(s[3], [...(byFrame.get(s[3]) ?? []), [i, ...s]]));
  const ids = {};
  const hp = [];
  const [from, to] = sc.range;
  let frame = 0;
  let snaps = 0;
  while (frame <= to) {
    const list = byFrame.get(frame);
    if (list) {
      const got = await page.evaluate(
        (l) => l.map(([i, side, card, p, , level]) => [i, window.__capture.dev.spawn(side, card, p, level)]),
        list,
      );
      for (const [i, id] of got) ids[i] = id;
      if (sc.track !== undefined && ids[sc.track] !== undefined && frame === sc.spawns[sc.track][3]) {
        await page.evaluate(
          ([id, w]) => window.__capture.camera({ kind: 'track', id, w, lead: 0.05, how: { move: 'cut' } }),
          [ids[sc.track], sc.trackWidth ?? 380],
        );
      }
    }
    await page.evaluate(() => window.__capture.step(1));
    frame += 1;
    if (frame >= from && frame <= to && (frame - from) % every === 0) {
      const url = await page.evaluate(() => window.__capture.snap('image/png'));
      const i = (frame - from) / every;
      fs.writeFileSync(path.join(dir, `${String(i).padStart(4, '0')}.png`), Buffer.from(url.split(',')[1], 'base64'));
      snaps += 1;
      if (sc.track !== undefined) {
        const u = await page.evaluate((id) => window.__capture.units({ ids: [id] })[0] ?? null, ids[sc.track]);
        hp.push(u ? [frame, u.hpBp, u.mode] : [frame, 0, 'gone']);
        if (!u) break;
      }
    }
  }
  fs.writeFileSync(path.join(dir, 'units.json'), JSON.stringify({ scenario: name, tag, every, from, ids, hp }));
  console.log(`done ${name} ${tag}: ${snaps} frames in ${dir}`);
  await ctx.close();
}

const exe = process.env.CHROMIUM || process.env.PW_CHROMIUM_PATH || undefined;
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
for (const name of names) {
  await waitForLocks();
  await capture(browser, name);
}
await browser.close();
