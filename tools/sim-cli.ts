/**
 * Headless tools entry point (DESIGN B12). Run with tsx:
 *
 *   npx tsx tools/sim-cli.ts balance   [--mode smoke|full] [--matches N] [--mirror N] [--cards a,b] [--formats short,standard,full]
 *                                      [--tier 5] [--level 7] [--seed 1] [--workers N]
 *                                      [--no-mirror] [--no-scenarios] [--no-gate] [--patch file.json]
 *   npx tsx tools/sim-cli.ts exploits  [--mode smoke|full] [--matches N] [--proxies a,b] [--formats short,standard] [--tier 7] [--workers N] [--no-a18] [--no-power-rows] [--no-lane] [--lane-matches N] [--no-gate] [--patch file.json]
 *   npx tsx tools/sim-cli.ts strength  [--mode smoke|full] [--matches N] [--pairs N] [--tiers 2,4,6,8,10] [--proxies a,b]
 *                                      [--formats short,standard,full] [--general echo] [--level 7] [--workers N] [--no-gate]
 *   npx tsx tools/sim-cli.ts forts     [--mode smoke|full] [--rows placebo,mirror,...] [--kinds wall,camp] [--formats short,standard]
 *                                      [--matches N] [--matches-full N] [--card-matches N] [--tier 7] [--level 7] [--seed 5001] [--raw f.json] [--patch file.json]
 *   npx tsx tools/sim-cli.ts economy   [--days 365] [--seed 1] [--seeds 30] [--matches-per-day 7] [--no-gate]
 *   npx tsx tools/sim-cli.ts drops     [--mode smoke|full] [--openings N] [--streams N] [--no-gate]
 *   npx tsx tools/sim-cli.ts replay-verify <file|dir>...
 *   npx tsx tools/sim-cli.ts csv export|import [--dir reports/csv] [--raw src/content/raw] [--dry-run]
 *   npx tsx tools/sim-cli.ts lbs       [--mode smoke|full] [--mirror N] [--matches N] [--proxies a,b] [--format last]
 *                                      [--tier 7] [--level 7] [--seed 9001] [--workers N] [--no-gate]
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
import { FORT_KINDS, FORT_ROW_GROUPS, fortsDefaults, fortsSections, runForts, type FortRowGroup } from './forts';
import { lbsDefaults, lbsSections, runLbs } from './lbs';
import { runStrength, strengthDefaults, strengthSections } from './strength';
import { bool, int, list, parseArgs, str, type Args } from './lib/args';
import { HeadlessMatch } from './lib/driver';
import { PATCH_ENV, patchedGameContent } from './lib/patch';
import { BALANCED_GENERAL, matchTickCap, seatLabel, type SeatSpec } from './lib/jobs';
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
                  --formats short,standard (mirror formats; Full War only at gates, A18.3.4)
                  --cards a,b --tier 5 --level 7 --seed 1 --bound 6 (CI half-width) --no-scenarios
  exploits        scripted exploit proxies vs the tier VII Balanced bot (A2.14)
                  --mode smoke|full --matches N (per proxy and format) --proxies a,b --formats short,standard
                  --tier 7 --level 7 --seed 1 --no-a18 (skip the A18.12 duel and difficulty rows)
                  --no-power-rows (skip the A2.9.12 no_power, bait and gate sniper rows)
                  --no-lane (skip the per-age lane gate: mono Heavy vs tier VII and mono Anti-heavy vs
                  mono Heavy in every one-age window), --lane-matches N (per row and age; 40 smoke, 80 full)
  forts           fort gates (A16.14.9) with paired seeds: placebo, fort-AI and forced mirrors, fort AI value,
                  fort_spam, turret/home turtles and flag_ball + towers, camp_hold_mirror, runner_camp and the
                  per-card rows (each fort vs its age's wall in every one-age window)
                  --mode smoke|full --rows ${FORT_ROW_GROUPS.join(',')} --kinds ${FORT_KINDS.join(',')}
                  --formats short,standard --matches N --matches-full N --card-matches N --tier 7 --level 7 --seed 5001 --raw f.json
  strength        AI tiers vs human-like scripted strategies, and adjacent tiers head to head
                  --mode smoke|full --matches N (per cell) --pairs N (per tier pair, 0 = none)
                  --tiers 2,4,6,8,10 --proxies a,b --formats short,standard,full --general echo --level 7 --seed 1
  economy         365-day economy sim against the A6.9 pacing table (median of --seeds runs)
                  --days 365 --seed 1 --seeds 30 --matches-per-day 7 (a casual 3-match player is reported too)
  drops           capsule openings: bag totals, chi-square of published odds, pity (A6.4, A6.5)
                  --mode smoke|full --openings N --streams N --seed 1
  replay-verify   re-simulate replay files or folders and compare hashes (B3)
                  <file|dir>...
  csv             export|import the unit, turret and power tables as CSV (B4)
                  --dir reports/csv --raw src/content/raw --dry-run
  lbs             Last Base Standing gates (A2.10.1): tier VII mirror length (median, p90, longest, none past
                  endByMs), where wars end, draws, first-mover; turtles, rope_runner and cheap_spam vs tier VII;
                  idle vs tier 0; the headless cost of the longest war
                  --mode smoke|full --mirror N --matches N (per proxy) --proxies a,b --format last --tier 7 --level 7 --seed 9001
  match           play one headless match and print its summary (debugging)
                  --format full --seed 1 --level 7 --p0 bot:echo:5 --p1 proxy:turret_turtle --replay out.json

Common flags: --out <dir> (default reports/), --no-gate (exit 0 even when a target fails),
--workers N (default: cores - 1), --patch file.json (balance, exploits: a JSON content override deep-merged
over the compiled content, for data-only experiments). Unknown flags are refused.`;

/** Flags every command takes. */
const COMMON_FLAGS = ['out', 'gate', 'workers'];

/** The flags of each command; anything else is a typo and must not silently start a default run. */
export const COMMAND_FLAGS: Record<string, readonly string[]> = {
  balance: ['mode', 'matches', 'mirror', 'cards', 'formats', 'tier', 'level', 'seed', 'bound', 'scenarios', 'patch'],
  exploits: ['mode', 'matches', 'proxies', 'formats', 'tier', 'level', 'seed', 'a18', 'power-rows', 'lane', 'lane-matches', 'patch'],
  strength: ['mode', 'matches', 'pairs', 'tiers', 'proxies', 'formats', 'general', 'level', 'seed', 'patch'],
  forts: ['mode', 'rows', 'kinds', 'formats', 'matches', 'matches-full', 'card-matches', 'tier', 'level', 'seed', 'raw', 'patch'],
  economy: ['days', 'seed', 'seeds', 'matches-per-day'],
  drops: ['mode', 'openings', 'streams', 'seed'],
  'replay-verify': [],
  csv: ['dir', 'raw', 'dry-run'],
  lbs: ['mode', 'mirror', 'matches', 'proxies', 'format', 'tier', 'level', 'seed', 'patch'],
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
  const outcome = match.run({ maxTicks: matchTickCap(content, format), onEvents: (ev) => tally.push(ev) });
  const m = tally.summary({ seed, format, outcome, ticks: sim.state.tick, hash: sim.hash() });
  console.log(`${seatLabel(seats[0])} vs ${seatLabel(seats[1])}, ${format}, seed ${seed}, bots from ${bots.source}${bots.reason ? ` (${bots.reason})` : ''}`);
  console.log(`result: ${m.winner === null ? 'draw' : `side ${m.winner} wins`} by ${m.reason} at ${fmtClock(m.ticks / 20)}; base HP ${m.baseHpBp.map((b) => `${b / 100}%`).join(' / ')}; hash ${m.hash}`);
  m.sides.forEach((s, i) => {
    const kills = Object.entries(s.kills)
      .filter(([, n]) => n > 0)
      .map(([k, n]) => `${k} ${n}`)
      .join(', ');
    console.log(
      `side ${i}: evolves ${s.evolveTicks.map((t) => fmtClock(t / 20)).join(' ') || '-'}; kills ${kills || '-'}; lost ${s.lost}; research ${s.research.join(' ') || '-'} (${Math.round(s.researchGold)} of ${Math.round(s.goldEarned)} gold); rejected ${Object.values(s.rejected).reduce((x, y) => x + y, 0)}`,
    );
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
        mirrorFormats: formatList(list(a, 'formats'), d.mirrorFormats),
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
        a18Rows: bool(a, 'a18', true),
        powerRows: bool(a, 'power-rows', true),
        laneRows: bool(a, 'lane', true),
        laneMatches: int(a, 'lane-matches', d.laneMatches ?? 40),
        workers,
        onProgress: progressPrinter('exploits'),
      }, patchedGameContent());
      return finish(report, exploitSections(report), a);
    }
    case 'strength': {
      const d = strengthDefaults(mode(a));
      const proxies = list(a, 'proxies');
      for (const p of proxies) if (!isProxyId(p)) throw new Error(`unknown proxy "${p}" (${Object.keys(STRATEGIES).join(', ')})`);
      const tiers = list(a, 'tiers').map(Number);
      for (const t of tiers) if (!Number.isFinite(t) || t < 0 || t > 10) throw new Error(`--tiers: "${t}" is not a tier 0-10`);
      const report = await runStrength({
        ...d,
        matchesPerCell: int(a, 'matches', d.matchesPerCell),
        matchesPerPair: int(a, 'pairs', d.matchesPerPair),
        tiers: tiers.length > 0 ? tiers : d.tiers,
        proxies: proxies.length > 0 ? (proxies as ProxyId[]) : d.proxies,
        formats: formatList(list(a, 'formats'), d.formats),
        generalId: str(a, 'general', d.generalId),
        level: int(a, 'level', d.level),
        seed: int(a, 'seed', d.seed),
        workers,
        onProgress: progressPrinter('strength'),
      }, patchedGameContent());
      return finish(report, strengthSections(report), a);
    }
    case 'forts': {
      const d = fortsDefaults(mode(a));
      const rows = list(a, 'rows');
      for (const r of rows) if (!(FORT_ROW_GROUPS as readonly string[]).includes(r)) throw new Error(`unknown fort row group "${r}" (${FORT_ROW_GROUPS.join(', ')})`);
      const kinds = list(a, 'kinds');
      for (const k of kinds) if (!(FORT_KINDS as readonly string[]).includes(k)) throw new Error(`unknown fort kind "${k}" (${FORT_KINDS.join(', ')})`);
      const raw = str(a, 'raw', '');
      const report = await runForts({
        ...d,
        groups: rows.length > 0 ? (rows as FortRowGroup[]) : d.groups,
        kinds: kinds.length > 0 ? (kinds as typeof d.kinds) : d.kinds,
        formats: formatList(list(a, 'formats'), [...d.formats]),
        matches: int(a, 'matches', d.matches),
        matchesFull: int(a, 'matches-full', d.matchesFull),
        cardMatches: int(a, 'card-matches', d.cardMatches),
        tier: int(a, 'tier', d.tier),
        level: int(a, 'level', d.level),
        seed: int(a, 'seed', d.seed),
        workers,
        ...(raw !== '' ? { raw: path.resolve(raw) } : {}),
        onProgress: progressPrinter('forts'),
      }, patchedGameContent());
      return finish(report, fortsSections(report), a);
    }
    case 'economy': {
      const d = economyDefaults();
      const report = await runEconomy({ ...d, days: int(a, 'days', d.days), seed: int(a, 'seed', d.seed), seeds: int(a, 'seeds', d.seeds), matchesPerDay: int(a, 'matches-per-day', d.matchesPerDay) });
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
    case 'lbs': {
      const d = lbsDefaults(mode(a));
      const proxies = list(a, 'proxies');
      for (const p of proxies) if (!isProxyId(p)) throw new Error(`unknown proxy "${p}" (${Object.keys(STRATEGIES).join(', ')})`);
      const format = formatList([str(a, 'format', d.format)], [d.format])[0] ?? d.format;
      const report = await runLbs({
        ...d,
        format,
        mirrorMatches: int(a, 'mirror', d.mirrorMatches),
        proxyMatches: int(a, 'matches', d.proxyMatches),
        proxies: proxies.length > 0 ? (proxies as ProxyId[]) : d.proxies,
        tier: int(a, 'tier', d.tier),
        level: int(a, 'level', d.level),
        seed: int(a, 'seed', d.seed),
        workers,
        onProgress: progressPrinter('lbs'),
      }, patchedGameContent());
      return finish(report, lbsSections(report), a);
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
