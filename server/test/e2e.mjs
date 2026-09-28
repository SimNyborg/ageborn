// End-to-end spike test: starts `wrangler dev` (local workerd + Durable Objects), then two headless
// Chromium pages per scenario play a match through the relay with simulated latency and jitter.
// Usage: node test/e2e.mjs [--port 5063] [--only realtime,reconnect,quick]
import { spawn, execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const args = process.argv.slice(2);
const arg = (k, d) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : d;
};
const PORT = Number(arg('port', '5063'));
const ONLY = arg('only', 'realtime,reconnect,quick').split(',');
const HTTP = `http://127.0.0.1:${PORT}`;
const WS = `ws://127.0.0.1:${PORT}`;

if (!existsSync(path.join(root, 'client/dist/bot.js')) || args.includes('--rebuild')) execSync('node build-client.mjs', { cwd: root, stdio: 'inherit' });

const wrangler = spawn('npx', ['wrangler', 'dev', '--port', String(PORT), '--ip', '127.0.0.1', '--inspector-port', String(PORT + 1)], { cwd: root, env: { ...process.env, WRANGLER_SEND_METRICS: 'false' } });
let wlog = '';
wrangler.stdout.on('data', (d) => (wlog += d));
wrangler.stderr.on('data', (d) => (wlog += d));
const stop = () => {
  try {
    wrangler.kill('SIGTERM');
  } catch {}
};
process.on('exit', stop);

async function waitUp() {
  for (let i = 0; i < 120; i += 1) {
    try {
      const r = await fetch(HTTP);
      if (r.ok) return r.json();
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`wrangler dev did not start:\n${wlog}`);
}

const scenarios = {
  // Real 50 ms ticks, as players would see it. Side 0 on a good line, side 1 on a poor one.
  realtime: { tickMs: 50, lat: [{ oneWayMs: 25, jitterMs: 20 }, { oneWayMs: 75, jitterMs: 40 }], drop: null, quick: false },
  // 5x faster clock to finish sooner; side 1 loses its connection at tick 1500 for 2 s.
  reconnect: { tickMs: 10, lat: [{ oneWayMs: 40, jitterMs: 30 }, { oneWayMs: 60, jitterMs: 30 }], drop: { atTick: 1500, forMs: 2000 }, quick: false },
  // Quick match through the lobby Durable Object.
  quick: { tickMs: 10, lat: [{ oneWayMs: 50, jitterMs: 50 }, { oneWayMs: 50, jitterMs: 50 }], drop: null, quick: true },
};

async function runScenario(browser, name, sc) {
  let code;
  let code2;
  if (sc.quick) {
    code = (await (await fetch(`${HTTP}/api/quick?tickMs=${sc.tickMs}`, { method: 'POST' })).json()).code;
    code2 = (await (await fetch(`${HTTP}/api/quick?tickMs=${sc.tickMs}`, { method: 'POST' })).json()).code;
    if (code !== code2) throw new Error(`quick match paired into different rooms ${code} ${code2}`);
  } else {
    code = (await (await fetch(`${HTTP}/api/rooms?tickMs=${sc.tickMs}&format=short`, { method: 'POST' })).json()).code;
  }
  const pages = [];
  for (const side of [0, 1]) {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    page.on('pageerror', (e) => console.log(`[${name}/${side}] pageerror`, e.message));
    await page.goto('about:blank');
    await page.addScriptTag({ path: path.join(root, 'client/dist/bot.js') });
    await page.evaluate(
      ({ o }) => {
        window.spike = window.startSpike(o);
      },
      { o: { wsBase: WS, code, name: `Bot ${side === 0 ? 'A' : 'B'}`, ...sc.lat[side], general: 'echo', tier: 5 } },
    );
    pages.push(page);
  }
  const t0 = Date.now();
  console.log(`[${name}] room ${code} started`);
  if (sc.drop) {
    const p = pages[1];
    await p.waitForFunction((k) => (window.spike.net.sim?.state.tick ?? 0) >= k, sc.drop.atTick, { timeout: 600000, polling: 100 });
    await p.evaluate(() => window.spike.net.drop());
    await new Promise((r) => setTimeout(r, sc.drop.forMs));
    await p.evaluate(() => window.spike.net.reconnect('Bot B'));
  }
  const reports = [];
  for (const p of pages) {
    await p.waitForFunction(() => window.spike.report.done, null, { timeout: 900000, polling: 500 });
    reports.push(await p.evaluate(() => window.spike.report));
  }
  const stats = await (await fetch(`${HTTP}/api/rooms/${code}/stats`)).json();
  for (const p of pages) await p.context().close();
  const [a, b] = reports;
  const checks = {
    sameFinalHash: a.finalHash === b.finalHash,
    sameOutcome: JSON.stringify(a.outcome) === JSON.stringify(b.outcome),
    sameCommandLog: a.replayCommandsDigest === b.replayCommandsDigest,
    replayVerifiedA: a.replayOk,
    replayVerifiedB: b.replayOk,
    serverAgreed: a.server.agreed,
    serverReSimVerified: a.server.verified,
    serverHashMatchesClients: a.server.finalHash === a.finalHash,
    noDesync: stats.hashMismatches === 0 && a.net.desyncs === 0 && b.net.desyncs === 0,
  };
  for (const r of reports) delete r.replayCommandsDigest;
  return { name, code, wallMs: Date.now() - t0, tickMs: sc.tickMs, latency: sc.lat, drop: sc.drop, checks, ok: Object.values(checks).every(Boolean), stats, reports };
}

try {
  const info = await waitUp();
  console.log('server up', info);
  const browser = await chromium.launch({ headless: true });
  const results = await Promise.all(ONLY.map((n) => runScenario(browser, n, scenarios[n])));
  await browser.close();
  mkdirSync(path.join(root, 'test/results'), { recursive: true });
  writeFileSync(path.join(root, 'test/results/e2e.json'), JSON.stringify(results, null, 2));
  for (const r of results) {
    const s = r.stats;
    const minutes = (s.ticks * 50) / 60000;
    console.log(`\n== ${r.name}: ${r.ok ? 'PASS' : 'FAIL'} (room ${r.code}, wall ${(r.wallMs / 1000).toFixed(1)} s, ${s.ticks} ticks = ${minutes.toFixed(2)} game-min)`);
    console.log('checks', r.checks);
    console.log(`outcome ${JSON.stringify(r.reports[0].outcome)} finalHash ${r.reports[0].finalHash}`);
    console.log(`server: in ${s.msgsIn} msgs / ${s.bytesIn} B, out ${s.msgsOut} msgs / ${s.bytesOut} B, commands ${s.commands}, hash checks ${s.hashChecks}, reconnects ${s.reconnects}, handlerMs ${s.handlerMs.toFixed(1)}, verifyMs ${s.verifyMs}`);
    for (const rep of r.reports) console.log(`client ${rep.side}:`, JSON.stringify(rep.net), `replay ${rep.replayBytes} B verify ${rep.replayMs} ms`);
  }
  process.exitCode = results.every((r) => r.ok) ? 0 : 1;
} catch (e) {
  console.error(e);
  console.error(wlog.slice(-3000));
  process.exitCode = 1;
} finally {
  stop();
}
