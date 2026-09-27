/**
 * Bot-vs-bot viewer (DESIGN C2/WP3 DoD): watch two AI Generals play on the real sim, read every
 * decision with the scores behind it, and run headless series for a quick win-rate summary.
 *
 * `?dev=1#botViewer`. The lane is drawn on a plain canvas from the sim state (lane.ts), so the page
 * does not depend on the battle renderer. Dev pages are exempt from the i18n rule.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import type { AiBotController, DecisionTrace } from '@/ai';
import { BALANCED_BRAIN_ID, BotMatch, botProfile, createBot, describeAction, runHeadless, tierLabel } from '@/ai';
import type { AgeId, CardId, CompiledContent, FormatId, Loadout, MatchConfig, Side, SideConfig, SimEvent } from '@/contracts';
import { content as realContent } from '@/content';
import { createSim } from '@/sim';
import { drawLane } from './lane';

export const title = 'Bot viewer (AI Generals)';

const AGES: readonly AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];
const FORMATS: readonly FormatId[] = ['short', 'standard', 'full', 'tutorial'];
const GENERALS = ['echo', 'pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest', 'warden', 'grogg'];
const SIDE_COLOR = ['#4f8fe8', '#f08a3c'] as const;
const LOG_KINDS = new Set<SimEvent['e']>([
  'ageUp',
  'turretBuildStart',
  'turretReplaced',
  'mountBought',
  'treasuryUp',
  'powerTelegraph',
  'stanceChanged',
  'lastStandFire',
  'emote',
  'phaseChanged',
  'matchEnded',
]);

const panel = {
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '12px',
  color: '#f4ecd8',
  background: '#1b1a2e',
  padding: '12px',
  boxSizing: 'border-box',
  position: 'absolute',
  inset: 0,
  overflow: 'auto',
} as const;
const box = { border: '1px solid #3a3960', padding: '8px', marginBottom: '8px' } as const;
const btn = {
  marginRight: '4px',
  padding: '3px 8px',
  background: '#2c2b44',
  color: '#f4ecd8',
  border: '1px solid #4a4970',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '12px',
} as const;
const input = { background: '#11101f', color: '#f4ecd8', border: '1px solid #4a4970', fontFamily: 'inherit', fontSize: '12px', padding: '2px 4px' } as const;

interface SideSetup {
  general: string;
  tier: number;
}

interface Setup {
  format: FormatId;
  seed: number;
  level: number;
  sides: [SideSetup, SideSetup];
}

/** The A2.14 baseline loadout of an age: 3 Commons, AA and Support Rares, Common turrets, default power. */
function baseline(c: CompiledContent, age: AgeId): Loadout {
  const units = Object.values(c.units).filter((u) => u.age === age && !u.hidden);
  const pick = (group: string, rarity?: string): CardId | null => units.find((u) => u.group === group && (!rarity || u.rarity === rarity))?.id ?? null;
  const turrets = Object.values(c.turrets).filter((t) => t.age === age && t.rarity === 'common');
  return {
    units: [pick('infantry', 'common'), pick('ranged', 'common'), pick('heavy', 'common'), pick('antiArmor'), pick('support')],
    turrets: [turrets[0]?.id ?? null, turrets[1]?.id ?? null],
    power: Object.values(c.powers).find((p) => p.age === age && p.slot === 'default')?.id ?? '',
  };
}

/** A side plays its General's own War Plan when it has one (A6.10), else the baseline plan. */
function sideConfig(c: CompiledContent, s: SideSetup, level: number): SideConfig {
  const plans = (c.generals as { list?: Record<string, { warPlan?: Partial<Record<AgeId, Loadout>> | null; legendaryLevel?: number | null }> } | null)?.list;
  const own = plans?.[s.general];
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of AGES) loadouts[age] = own?.warPlan?.[age] ?? baseline(c, age);
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(c.units), ...Object.keys(c.turrets)]) {
    const legendary = c.units[id]?.rarity === 'legendary';
    levels[id] = legendary && own?.legendaryLevel ? own.legendaryLevel : level;
  }
  return { label: `AI · ${s.general}`, isBot: true, loadouts, levels, skins: {} };
}

function matchConfig(c: CompiledContent, setup: Setup): MatchConfig {
  const groggSide = setup.sides.findIndex((s) => s.general === 'grogg');
  const training: MatchConfig['training'] | undefined =
    setup.format === 'tutorial' ? { noClock: true, ...(groggSide === 1 ? { enemyBaseStartBp: 5000 } : {}) } : undefined;
  return {
    seed: setup.seed,
    format: setup.format,
    content: c,
    sides: [sideConfig(c, setup.sides[0], setup.level), sideConfig(c, setup.sides[1], setup.level)],
    ...(training ? { training } : {}),
  };
}

function bots(c: CompiledContent, setup: Setup): AiBotController[] {
  return setup.sides.map((s, side) => createBot(botProfile(c, { generalId: s.general, tier: s.tier }), side as Side, setup.seed, c) as AiBotController);
}

interface Summary {
  n: number;
  wins: [number, number];
  draws: number;
  bells: number;
  avgSec: number;
  rejected: number;
  commands: [number, number];
}

function runSeries(c: CompiledContent, setup: Setup, n: number): Summary {
  const out: Summary = { n, wins: [0, 0], draws: 0, bells: 0, avgSec: 0, rejected: 0, commands: [0, 0] };
  let ticks = 0;
  for (let i = 0; i < n; i += 1) {
    const s: Setup = { ...setup, seed: setup.seed + i };
    const cfg = matchConfig(c, s);
    const r = runHeadless(
      createSim(cfg),
      bots(c, s).map((controller, side) => ({ side: side as Side, controller })),
    );
    ticks += r.ticks;
    out.rejected += r.rejected.length;
    for (const cmd of r.commands) out.commands[cmd.side] += 1;
    const w = r.outcome?.winner;
    if (w === 0 || w === 1) out.wins[w] += 1;
    else out.draws += 1;
    if (r.outcome?.reason === 'finalBell') out.bells += 1;
  }
  out.avgSec = Math.round(ticks / n / 20);
  return out;
}

function traceText(t: DecisionTrace): string {
  const why = t.mistake ? `MISTAKE ${t.mistake}` : t.reason;
  const top = t.candidates
    .slice(0, 3)
    .map((c) => `${describeAction(c.action)} ${(c.score / 10000).toFixed(2)}`)
    .join(' · ');
  return `${(t.tick / 20).toFixed(1).padStart(6)}s ${describeAction(t.action).padEnd(26)} ${why.padEnd(18)} ${top}`;
}

function SideCard(props: { side: Side; match: BotMatch; bot: AiBotController; setup: SideSetup }) {
  const { side, match, bot } = props;
  const s = match.sim.state.sides[side];
  const other = match.sim.state.sides[side === 0 ? 1 : 0];
  const last = bot.traces[bot.traces.length - 1];
  const lines = [...bot.traces].slice(-12).reverse();
  return (
    <div style={{ ...box, flex: 1, minWidth: 0, borderColor: SIDE_COLOR[side] }}>
      <div style={{ color: SIDE_COLOR[side], fontWeight: 'bold' }}>
        AI · {props.setup.general} — tier {tierLabel(props.setup.tier)} ({bot.personality.id})
      </div>
      <div>
        gold {Math.trunc(s.gold / 1000)} · age {s.ageIndex} · base {Math.round((Math.max(0, s.baseHp) * 100) / Math.max(1, s.baseMaxHp))}% · treasury {s.treasury} ·
        mounts {s.mountsOwned} · pop {s.pop} · queue {s.queue.length} · power {Math.trunc(s.powerPpm / 10000)}% · {s.stance}
      </div>
      <div>
        foe gold estimate {Math.trunc(bot.foeGoldEstimate / 1000)} (actual {Math.trunc(other.gold / 1000)}) · delay {bot.snapshotDelayTicks} ticks · every{' '}
        {bot.tier.decisionTicks} ticks · cap {bot.tier.maxActionsPer10s}/10 s · mistakes {bot.tier.mistakeBp / 100}%
      </div>
      {last ? (
        <div style={{ color: '#9fc3ff' }}>
          army {last.myArmy} vs {last.foeArmy} · D {last.defence} · gate {last.pushOk ? 'ok' : 'fails'}
          {last.banking ? ' · banking' : ''}
          {last.goal ? ` · saving for ${last.goal.kind} (${last.goal.amount / 1000})` : ''} · pressure {last.pressureBp / 100}% · clock ×
          {(last.clockBp / 10000).toFixed(1)}
        </div>
      ) : null}
      <pre style={{ margin: '6px 0 0', whiteSpace: 'pre', overflowX: 'auto', fontSize: '11px' }} data-testid={`bot-trace-${side}`}>
        {lines.map(traceText).join('\n')}
      </pre>
    </div>
  );
}

export default function BotViewer() {
  const c = realContent;
  const [setup, setSetup] = useState<Setup>({
    format: 'short',
    seed: 1,
    level: 1,
    sides: [
      { general: BALANCED_BRAIN_ID, tier: 7 },
      { general: BALANCED_BRAIN_ID, tier: 3 },
    ],
  });
  const matchRef = useRef<{ match: BotMatch; bots: AiBotController[] } | null>(null);
  const logRef = useRef<SimEvent[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(2);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [seriesN, setSeriesN] = useState(20);
  const [, redraw] = useReducer((n: number) => n + 1, 0);

  const start = (s: Setup): void => {
    const cfg = matchConfig(c, s);
    const b = bots(c, s);
    matchRef.current = {
      match: new BotMatch(
        createSim(cfg),
        b.map((controller, side) => ({ side: side as Side, controller })),
      ),
      bots: b,
    };
    logRef.current = [];
    redraw(0);
  };

  if (!matchRef.current) start(setup);

  const step = (ticks: number): void => {
    const m = matchRef.current;
    if (!m) return;
    for (let i = 0; i < ticks && !m.match.ended; i += 1) {
      for (const e of m.match.tick()) if (LOG_KINDS.has(e.e)) logRef.current.push(e);
    }
    if (logRef.current.length > 400) logRef.current = logRef.current.slice(-300);
    redraw(0);
  };

  useEffect(() => {
    if (!running) return undefined;
    const id = window.setInterval(() => step(speed), 50);
    return () => window.clearInterval(id);
  }, [running, speed]);

  useEffect(() => {
    const cv = canvasRef.current;
    const m = matchRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !m || !ctx) return;
    drawLane(ctx, m.match.sim.state, c, cv.width, cv.height);
  });

  const m = matchRef.current;
  const outcome = m?.match.sim.state.outcome ?? null;
  const tick = m?.match.sim.state.tick ?? 0;
  const phase = m?.match.sim.state.phase ?? 'regulation';

  const setSide = (side: Side, patch: Partial<SideSetup>): void => {
    const sides = [...setup.sides] as [SideSetup, SideSetup];
    sides[side] = { ...sides[side], ...patch };
    setSetup({ ...setup, sides });
  };

  const tiers = useMemo(() => Array.from({ length: 11 }, (_, i) => i), []);

  return (
    <div style={panel} data-testid="bot-viewer">
      <h2 style={{ margin: '0 0 8px' }}>Bot viewer · AI Generals</h2>
      <div style={box}>
        {([0, 1] as const).map((side) => (
          <span key={side} style={{ marginRight: '16px', color: SIDE_COLOR[side] }}>
            side {side}{' '}
            <select style={input} value={setup.sides[side].general} onChange={(e) => setSide(side, { general: (e.target as HTMLSelectElement).value })}>
              {GENERALS.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>{' '}
            <select style={input} value={setup.sides[side].tier} onChange={(e) => setSide(side, { tier: Number((e.target as HTMLSelectElement).value) })}>
              {tiers.map((t) => (
                <option key={t} value={t}>
                  tier {tierLabel(t)}
                </option>
              ))}
            </select>
          </span>
        ))}
        <label>
          format{' '}
          <select style={input} value={setup.format} onChange={(e) => setSetup({ ...setup, format: (e.target as HTMLSelectElement).value as FormatId })}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>{' '}
        <label>
          seed <input style={{ ...input, width: '64px' }} type="number" value={setup.seed} onInput={(e) => setSetup({ ...setup, seed: Number((e.target as HTMLInputElement).value) || 0 })} />
        </label>{' '}
        <label>
          level <input style={{ ...input, width: '40px' }} type="number" min={1} max={10} value={setup.level} onInput={(e) => setSetup({ ...setup, level: Math.max(1, Math.min(10, Number((e.target as HTMLInputElement).value) || 1)) })} />
        </label>{' '}
        <button style={btn} data-testid="bot-new" onClick={() => start(setup)}>
          New match
        </button>
      </div>

      <div style={box}>
        <button style={btn} onClick={() => setRunning(!running)}>
          {running ? 'Pause' : 'Play'}
        </button>
        <button style={btn} onClick={() => step(1)}>
          +1 tick
        </button>
        <button style={btn} onClick={() => step(200)}>
          +10 s
        </button>
        <button style={btn} data-testid="bot-to-end" onClick={() => step(20000)}>
          To the end
        </button>
        speed{' '}
        {[1, 2, 5, 20].map((sp) => (
          <button key={sp} style={{ ...btn, background: sp === speed ? '#4a4970' : btn.background }} onClick={() => setSpeed(sp)}>
            ×{sp}
          </button>
        ))}
        <span style={{ marginLeft: '12px' }} data-testid="bot-clock">
          {(tick / 20).toFixed(1)} s · {phase}
          {outcome ? ` · ${outcome.winner === null ? 'draw' : `side ${outcome.winner} wins`} (${outcome.reason})` : ''}
        </span>
      </div>

      <canvas ref={canvasRef} width={1100} height={180} style={{ width: '100%', maxWidth: '1100px', display: 'block', marginBottom: '8px' }} data-testid="bot-lane" />

      {m ? (
        <div style={{ display: 'flex', gap: '8px' }}>
          {([0, 1] as const).map((side) => (
            <SideCard key={side} side={side} match={m.match} bot={m.bots[side] as AiBotController} setup={setup.sides[side]} />
          ))}
        </div>
      ) : null}

      <div style={box}>
        <b>Events</b>
        <pre style={{ margin: '4px 0 0', maxHeight: '160px', overflow: 'auto', fontSize: '11px' }}>
          {[...logRef.current]
            .slice(-60)
            .reverse()
            .map((e) => {
              const { tick: t, e: kind, ...rest } = e;
              return `${(t / 20).toFixed(1).padStart(6)}s ${kind} ${JSON.stringify(rest)}`;
            })
            .join('\n')}
        </pre>
      </div>

      <div style={box} data-testid="bot-series">
        <b>Headless series</b> (seeds {setup.seed}…{setup.seed + seriesN - 1}, same setup){' '}
        <input style={{ ...input, width: '48px' }} type="number" value={seriesN} onInput={(e) => setSeriesN(Math.max(1, Number((e.target as HTMLInputElement).value) || 1))} />{' '}
        <button style={btn} data-testid="bot-run-series" onClick={() => setSummary(runSeries(c, setup, seriesN))}>
          Run
        </button>
        {summary ? (
          <div style={{ marginTop: '6px' }} data-testid="bot-summary">
            {summary.n} matches · side 0 wins {summary.wins[0]} · side 1 wins {summary.wins[1]} · draws {summary.draws} · Final Bell {summary.bells} · avg{' '}
            {summary.avgSec} s · bot commands {summary.commands[0]} / {summary.commands[1]} · rejected {summary.rejected}
          </div>
        ) : null}
      </div>
    </div>
  );
}
