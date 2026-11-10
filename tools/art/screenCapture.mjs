// Screen captures of world items for the art rounds' evidence (world wave A: bases, base skins, decorations, the
// turrets on the Customize stage): Home (its two base pictures on the island) and Customize's Bases and Decorations
// pages (the live diorama: the base model with its flags, the side's three decorations and two idle turrets of the
// age), with the same save on every build, at DPR 2. Run it with --tag before against a server of the before tree
// and with --tag after against the working tree, like battleCapture.mjs (art/blender/README.md, "Evidence for a
// wave"). Dev tool: not part of the build or the test suite.
//
// usage: node tools/art/screenCapture.mjs --screens FILE (--name NAME[,NAME...] | --all) --tag before|after
//          [--base http://127.0.0.1:5173/] [--out DIR] [--locks DIR --track NAME]
//
// Screens file: { "<name>": { "vp": "phone" | "desktop", "screen": "home" | "bases" | "decorations",
//   "age": "stone", "own": ["decoration.fire_bowl", "baseSkin.mammoth_bone_lodge", ...],
//   "decorations": ["decoration.fire_bowl", null, "decoration.stone_idol"], "baseSkins": { "stone": "baseSkin.x" },
//   "reduceMotion": true, "settleMs": 2500, "snaps": 1, "everyMs": 400, "tags": ["before", "after"] } }
// Writes <out>/<name>_<tag>/0000.png ... (`snaps` screenshots `everyMs` apart once the screen has settled) and
// state.json (what the page reported: the stage live or still, the equipped items). Reduce motion holds every prop
// loop on its `hold` frame and parks the stage, so before and after line up frame for frame; without it the frames
// show the motion. Chromium: Playwright's own, or CHROMIUM / PW_CHROMIUM_PATH, SwiftShader WebGL.
/* global window, document */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (name, dflt) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : dflt;
};
const base = arg('base', 'http://127.0.0.1:5173/');
const file = arg('screens', '');
const tag = arg('tag', '');
const out = arg('out', 'out/art-screens');
const locks = arg('locks', '');
const track = arg('track', '');
const VIEWPORTS = { phone: { width: 844, height: 390 }, desktop: { width: 1280, height: 720 } };
const usage = 'usage: node tools/art/screenCapture.mjs --screens FILE (--name NAME[,NAME...] | --all) --tag before|after [--base URL] [--out DIR] [--locks DIR --track NAME]';
if (!file || !tag || (!argv.includes('--all') && !arg('name', ''))) {
  console.error(usage);
  process.exit(2);
}
const all = JSON.parse(fs.readFileSync(file, 'utf8'));
const names = argv.includes('--all') ? Object.keys(all).filter((n) => (all[n].tags ?? ['before', 'after']).includes(tag)) : arg('name', '').split(',');
for (const n of names) {
  if (!all[n] || !VIEWPORTS[all[n].vp ?? 'phone'] || !['home', 'bases', 'decorations'].includes(all[n].screen)) {
    console.error(`no screen "${n}" (or an unknown vp or screen) in ${file}`);
    process.exit(2);
  }
}

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

/** Past onboarding with every Home feature open (tests/e2e/helpers.ts pastOnboarding), then the screen's save. */
async function setUp(page, sc) {
  await page.goto(`${base}?dev=1&game=1`);
  await page.waitForFunction(() => window.__agebornDev !== undefined, null, { timeout: 60000 });
  await page.evaluate(() => {
    const c = window.__agebornDev.controller;
    const s = c.save.peek();
    const wp = s.warPath;
    const warPath = { ...wp, legacy: true, stars: { ...wp.stars, 'wp.stone.l01': 1, 'wp.stone.l02': 1 } };
    const flags = { ...s.flags, 'tutorial.warPlanPrompt': true, 'tutorial.firstUpgrade': true };
    c.setSave({ ...s, warPath, tutorial: { ...s.tutorial, step: 4 }, matchesPlayed: Math.max(3, s.matchesPlayed), flags }, { immediate: true });
    c.showTitle();
  });
  // the title's hand-over to Home writes the save once more: edit it once Home shows
  await page.getByTestId('play').first().waitFor({ state: 'visible', timeout: 60000 });
  await page.evaluate((o) => {
    const c = window.__agebornDev.controller;
    const s = c.save.peek();
    const owned = [...s.cosmetics.owned, ...(o.own ?? []).filter((k) => !s.cosmetics.owned.includes(k))];
    const equipped = { ...s.cosmetics.equipped };
    if (o.decorations) equipped.decorations = o.decorations;
    if (o.baseSkins) equipped.baseSkins = { ...equipped.baseSkins, ...o.baseSkins };
    const settings = { ...s.settings, ...(o.reduceMotion !== undefined ? { reduceMotion: o.reduceMotion } : {}) };
    c.setSave({ ...s, settings, cosmetics: { ...s.cosmetics, owned, equipped } }, { immediate: true });
  }, sc);
}

async function open(page, sc) {
  // through Customize first, so Home re-renders with the edited save
  await page.getByTestId('tab-customize').first().click();
  if (sc.screen === 'home') {
    await page.getByTestId('tab-battle').first().click();
    await page.getByTestId('play').first().waitFor({ state: 'visible', timeout: 60000 });
    if (!sc.reduceMotion) {
      await page
        .waitForFunction(() => document.querySelector('[data-testid="hub-diorama"]')?.getAttribute('data-live') === 'true', null, { timeout: 30000 })
        .catch(() => undefined);
    }
    return;
  }
  await page.getByTestId(`tab-${sc.screen}`).click();
  await page.locator('#cust-panel').waitFor({ state: 'visible', timeout: 60000 });
  if (sc.age) {
    const tabs = sc.screen === 'bases' ? '[data-testid="cust-age"]' : '#cust-panel';
    const t = page.locator(`${tabs} [data-testid="age-tab-${sc.age}"]`).first();
    if (await t.count()) await t.click();
  }
  // the live stage takes over from the still where WebGL allows
  await page
    .waitForFunction(() => [...document.querySelectorAll('[data-live]')].some((e) => e.getAttribute('data-live') === 'true'), null, { timeout: 30000 })
    .catch(() => undefined);
}

async function capture(browser, name) {
  const sc = all[name];
  const vp = sc.vp ?? 'phone';
  const ctx = await browser.newContext({ viewport: VIEWPORTS[vp], deviceScaleFactor: 2, hasTouch: vp === 'phone' });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('pageerror', e.message));
  await setUp(page, sc);
  await open(page, sc);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.waitForTimeout(sc.settleMs ?? 2500);
  const dir = path.join(out, `${name}_${tag}`);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const n = sc.snaps ?? 1;
  for (let i = 0; i < n; i++) {
    if (i) await page.waitForTimeout(sc.everyMs ?? 400);
    await page.screenshot({ path: path.join(dir, `${String(i).padStart(4, '0')}.png`) });
  }
  const state = await page.evaluate(() => {
    const s = window.__agebornDev.controller.save.peek();
    return {
      live: [...document.querySelectorAll('[data-live]')].map((e) => [e.getAttribute('data-testid'), e.getAttribute('data-live')]),
      equipped: s.cosmetics.equipped,
      reduceMotion: s.settings.reduceMotion,
    };
  });
  fs.writeFileSync(path.join(dir, 'state.json'), JSON.stringify({ screen: name, tag, ...state }, null, 1));
  console.log(`done ${name} ${tag}: ${n} frames in ${dir}`);
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
