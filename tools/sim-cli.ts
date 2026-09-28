/**
 * Headless tools entry point (DESIGN B12). Run with tsx:
 *
 *   npx tsx tools/sim-cli.ts balance   [--mode smoke|full] [--matches N] [--mirror N] [--cards a,b]
 *                                      [--tier 5] [--level 7] [--seed 1] [--workers N]
 *                                      [--no-mirror] [--no-scenarios] [--no-gate] [--patch file.json]
 *   npx tsx tools/sim-cli.ts exploits  [--mode smoke|full] [--matches N] [--proxies a,b] [--formats short,full] [--tier 7] [--workers N] [--no-gate] [--patch file.json]
 *   npx tsx tools/sim-cli.ts economy   [--days 365] [--seed 1] [--no-gate]
 *   npx tsx tools/sim-cli.ts drops     [--mode smoke|full] [--openings N] [--streams N] [--no-gate]
 *   npx tsx tools/sim-cli.ts replay-verify <file|dir>...
 *   npx tsx tools/sim-cli.ts csv export|import [--dir reports/csv] [--raw src/content/raw] [--dry-run]
 *   npx tsx tools/sim-cli.ts match     [--format full] [--seed 1] [--p0 bot:echo:5] [--p1 proxy:turret_turtle]
 *                                      [--level 7] [--replay out.json]
 *
 * Every command writes `reports/<tool>.json` and `.md` (`--out <dir>` to change) and exits non-zero when
 * a DESIGN target fails, unless `--no-gate`. `smoke` is the CI size; `full` is the A2.14 size.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FormatId, Side } from '../src/contracts';
import { content } from '../src/content';
import { buildReplay, createSim } from '../src/sim';
import { balanceDefaults, balanceSections, runBalance, writeCardsCsv, type BalanceMode } from './balance';
import { csvSections, runCsv } from './csv';
import { dropsDefaults, dropsSections, runDrops } from './drops';
import { economyDefaults, economySections, runEconomy } from './economy';
import { exploitDefaults, exploitSections, runExploits } from './exploits';
import { bool, int, list, parseArgs, str, type Args } from './lib/args';
import { HeadlessMatch } from './lib/driver';
import { PATCH_ENV, patchedGameContent } from './lib/patch';
import { BALANCED_GENERAL, seatLabel, type SeatSpec } from './lib/jobs';
import { MatchTally } from './lib/metrics';
import { loadBots } from './lib/modules';
import { baselinePlan, sideConfig } from './lib/plans';
import { defaultWorkers, progressPrinter } from './lib/runner';
import { createProxy, isProxyId, STRATEGIES, type ProxyId } from './proxies';
import { exitCode, fmtClock, printChecks, REPORTS_DIR, writeReport, type Report } from './report';
import { replaySections, runReplayVerify } from './replayVerify';

export const HELP = `Ageborn headless tools (DESIGN B12)

Commands:
  balance         balance matrix: Balanced mirror, per-card win-rate deltas, scenarios (A2.14)
                  --mode smoke|full --matches N (per card) --mirror N (per format) | --no-mirror
                  --cards a,b --tier 5 --level 7 --seed 1 --bound 6 (CI half-width) --no-scenarios
  exploits        scripted exploit proxies vs the tier VII Balanced bot (A2.14)
                  --mode smoke|full --matches N (per proxy and format) --proxies a,b --formats short,full
                  --tier 7 --level 7 --seed 1
  economy         365-day economy sim against the A6.9 pacing table
                  --days 365 --seed 1
  drops           capsule openings: bag totals, chi-square of published odds, pity (A6.4, A6.5)
                  --mode smoke|full --openings N --streams N --seed 1
  replay-verify   re-simulate replay files or folders and compare hashes (B3)
                  <file|dir>...
  csv             export|import the unit, turret and power tables as CSV (B4)
                  --dir reports/csv --raw src/content/raw --dry-run
  match           play one headless match and print its summary (debugging)
                  --format full --seed 1 --level 7 --p0 bot:echo:5 --p1 proxy:turret_turtle --replay out.json

Common flags: --out <dir> (default reports/), --no-gate (exit 0 even when a target fails),
--workers N (default: cores - 1), --patch file.json (balance, exploits: a JSON content override deep-merged
over the compiled content, for data-only experiments). Unknown flags are refused.`;

/** Flags every command takes. */
const COMMON_FLAGS = ['out', 'gate', 'workers'];

/** The flags of each command; anything else is a typo and must not silently start a default run. */
export const COMMAND_FLAGS: Record<string, readonly string[]> = {
  balance: ['mode', 'matches', 'mirror', 'cards', 'tier', 'level', 'seed', 'bound', 'scenarios', 'patch'],
  exploits: ['mode', 'matches', 'proxies', 'formats', 'tier', 'level', 'seed', 'patch'],
  economy: ['days', 'seed'],
  drops: ['mode', 'openings', 'streams', 'seed'],
  'replay-verify': [],
  csv: ['dir', 'raw', 'dry-run'],
  match: ['format', 'seed', 'level', 'p0', 'p1', 'replay'],
};

/** `--formats short,full`: validated format ids, or the default. */
function formatList(v: string[], fallback: FormatId[]): FormatId[] {
  if (v.length === 0) return fallback;
  for (const f of v) if (!Object.hasOwn(content.formats, f)) throw new Error(`unknown format "${f}" (${Object.keys(content.formats).join(', ')})`);
  return v as FormatId[];
}

function checkFlags(command: string, a: Args): void {
  const allowed = COMMAND_FLAGS[command];
  if (!allowed) return;
  const unknown = Object.keys(a.flags).filter((f) => !allowed.includes(f) && !COMMON_FLAGS.includes(f));
  if (unknown.length > 0) throw new Error(`${command}: unknown flag ${unknown.map((f) => `--${f}`).join(', ')} (known: ${[...allowed, ...COMMON_FLAGS].map((f) => `--${f}`).join(' ')})`);
}

function mode(a: Args): BalanceMode {
  const m = str(a, 'mode', 'smoke');
  if (m !== 'smoke' && m !== 'full') throw new Error(`--mode must be smoke or full, got "${m}"`);
  return m;
}

function finish(report: Report, sections: string[], a: Args): number {
  const out = str(a, 'out', REPORTS_DIR);
  const files = writeReport(report, sections, out);
  printChecks(report);
  console.log(`report: ${files.md}`);
  return exitCode(report.checks, bool(a, 'gate', true));
}

function parseSeat(spec: string): SeatSpec {
  const [kind, id, tier] = spec.split(':');
  if (kind === 'proxy' && id !== undefined && isProxyId(id)) return { kind: 'proxy', proxy: id };
  if (kind === 'bot') return { kind: 'bot', generalId: id ?? BALANCED_GENERAL, tier: Number(tier ?? 5) };
  throw new Error(`seat "${spec}": use bot:<general>:<tier> or proxy:<${Object.keys(STRATEGIES).join('|')}>`);
}

async function matchCommand(a: Args): Promise<number> {
  const format = str(a, 'format', 'full') as FormatId;
  const seed = int(a, 'seed', 1);
  const level = int(a, 'level', 7);
  const seats: [SeatSpec, SeatSpec] = [parseSeat(str(a, 'p0', `bot:${BALANCED_GENERAL}:5`)), parseSeat(str(a, 'p1', `bot:${BALANCED_GENERAL}:5`))];
  const bots = await loadBots();
  const planOf = (s: SeatSpec) => (s.kind === 'proxy' ? STRATEGIES[s.proxy].plan(content) : baselinePlan(content));
  const sim = createSim({
    seed,
    format,
    content,
    sides: [
      sideConfig(content, planOf(seats[0]), { level, label: seatLabel(seats[0]), isBot: seats[0].kind === 'bot' }),
      sideConfig(content, planOf(seats[1]), { level, label: seatLabel(seats[1]), isBot: seats[1].kind === 'bot' }),
    ],
  });
  const ctl = (side: Side) => {
    const s = seats[side];
    return s.kind === 'proxy' ? createProxy(s.proxy as ProxyId, content, side, seed, format) : bots.create(content, { generalId: s.generalId, tier: s.tier, side, seed, format });
  };
  const match = new HeadlessMatch(sim, [
    { side: 0, controller: ctl(0) },
    { side: 1, controller: ctl(1) },
  ]);
  const tally = new MatchTally(content);
  const started = performance.now();
  const outcome = match.run({ onEvents: (ev) => tally.push(ev) });
  const m = tally.summary({ seed, format, outcome, ticks: sim.state.tick, hash: sim.hash() });
  console.log(`${seatLabel(seats[0])} vs ${seatLabel(seats[1])}, ${format}, seed ${seed}, bots from ${bots.source}${bots.reason ? ` (${bots.reason})` : ''}`);
  console.log(`result: ${m.winner === null ? 'draw' : `side ${m.winner} wins`} by ${m.reason} at ${fmtClock(m.ticks / 20)}; base HP ${m.baseHpBp.map((b) => `${b / 100}%`).join(' / ')}; hash ${m.hash}`);
  m.sides.forEach((s, i) => {
    const kills = Object.entries(s.kills)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k} ${n}`)
      .join(', ');
    console.log(`side ${i}: evolves ${s.evolveTicks.map((t) => fmtClock(t / 20)).join(' ') || '-'}; kills ${kills || '-'}; lost ${s.lost}; treasury ${s.treasury}; rejected ${Object.values(s.rejected).reduce((x, y) => x + y, 0)}`);
  });
  console.log(`${(performance.now() - started).toFixed(0)} ms`);
  const file = str(a, 'replay', '');
  if (file !== '' && outcome) {
    writeFileSync(file, `${JSON.stringify(buildReplay(sim))}\n`);
    console.log(`replay: ${file}`);
  }
  return 0;
}

export async function main(argv: readonly string[]): Promise<number> {
  const [command, ...rest] = argv;
  const a = parseArgs(rest);
  if (command !== undefined) checkFlags(command, a);
  const workers = int(a, 'workers', defaultWorkers());
  // `--patch <file>`: a JSON content override for data-only experiments (B12, A16.4); workers inherit it.
  const patch = str(a, 'patch', '');
  if (patch !== '') process.env[PATCH_ENV] = path.resolve(patch);
  switch (command) {
    case 'balance': {
      const d = balanceDefaults(mode(a));
      const cards = list(a, 'cards');
      const matches = int(a, 'matches', d.pairsPerCard * 2);
      const report = await runBalance({
        ...d,
        pairsPerCard: Math.max(1, Math.ceil(matches / 2)),
        mirrorMatches: int(a, 'mirror', d.mirrorMatches),
        cards: cards.length > 0 ? cards : null,
        tier: int(a, 'tier', d.tier),
        level: int(a, 'level', d.level),
        seed: int(a, 'seed', d.seed),
        bound: int(a, 'bound', d.bound),
        mirror: bool(a, 'mirror', true) && int(a, 'mirror', d.mirrorMatches) > 0,
        scenarios: bool(a, 'scenarios', true),
        workers,
        onProgress: progressPrinter('balance'),
      }, patchedGameContent());
      writeCardsCsv(report, str(a, 'out', REPORTS_DIR));
      return finish(report, balanceSections(report), a);
    }
    case 'exploits': {
      const d = exploitDefaults(mode(a));
      const proxies = list(a, 'proxies');
      for (const p of proxies) if (!isProxyId(p)) throw new Error(`unknown proxy "${p}" (${Object.keys(STRATEGIES).join(', ')})`);
      const report = await runExploits({
        ...d,
        matchesPerProxy: int(a, 'matches', d.matchesPerProxy),
        proxies: proxies.length > 0 ? (proxies as ProxyId[]) : d.proxies,
        formats: formatList(list(a, 'formats'), d.formats),
        tier: int(a, 'tier', d.tier),
        level: int(a, 'level', d.level),
        seed: int(a, 'seed', d.seed),
        workers,
        onProgress: progressPrinter('exploits'),
      }, patchedGameContent());
      return finish(report, exploitSections(report), a);
    }
    case 'economy': {
      const d = economyDefaults();
      const report = await runEconomy({ ...d, days: int(a, 'days', d.days), seed: int(a, 'seed', d.seed) });
      return finish(report, economySections(report), a);
    }
    case 'drops': {
      const d = dropsDefaults(mode(a));
      const report = await runDrops({ ...d, openings: int(a, 'openings', d.openings), streams: int(a, 'streams', d.streams), seed: int(a, 'seed', d.seed) }, content, progressPrinter('drops'));
      return finish(report, dropsSections(report), a);
    }
    case 'replay-verify': {
      if (a.positional.length === 0) throw new Error('replay-verify needs at least one replay file or folder');
      const report = runReplayVerify(a.positional);
      return finish(report, replaySections(report), a);
    }
    case 'csv': {
      const sub = a.positional[0];
      if (sub !== 'export' && sub !== 'import') throw new Error('csv needs "export" or "import"');
      const opts = {
        ...(typeof a.flags['dir'] === 'string' ? { csvDir: a.flags['dir'] } : {}),
        ...(typeof a.flags['raw'] === 'string' ? { rawDir: a.flags['raw'] } : {}),
        dryRun: bool(a, 'dry-run', false),
      };
      const report = runCsv(sub, opts);
      return finish(report, csvSections(report), a);
    }
    case 'match':
      return matchCommand(a);
    case undefined:
    case 'help':
    case '--help':
      console.log(HELP);
      return 0;
    default:
      console.error(`unknown command "${command}"\n\n${HELP}`);
      return 2;
  }
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (e: unknown) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(2);
    },
  );
}
