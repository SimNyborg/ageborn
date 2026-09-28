/**
 * Dev page `?dev=1#replayDebug` (DESIGN A9 #16 "replay debugger", C2/WP11): headless checks of the
 * session, replays and the onboarding timing, without a canvas.
 *
 * - Runs bot-vs-bot matches through the real `BattleSession`, stores the replays in a ring of 20 and
 *   re-simulates each with the `ReplayPlayer` (outcome and final hash must match).
 * - Runs the match 1 retiming run (Old Grogg's script vs the autopilot) and compares every A8 beat
 *   with the pinned `MATCH1_TIMING`.
 * - Shows and exports the onboarding event log of this browser.
 *
 * Dev pages are internal tools and exempt from the i18n rule (docs/decisions.md, WP0).
 */
import { useState } from 'preact/hooks';
import type { FormatId, ReplayDoc } from '@/contracts';
import { content } from '@/content';
import { createBot } from '@/ai';
import { createSim, SIM_VERSION } from '@/sim';
import { MATCH1_TIMING, MATCH1_TURRET_GRANT_TICK, TutorialAutopilot, TutorialDirector, createGroggBrain, evolveReady } from '@/tutorial';
import { EventLog } from '@/app/eventLog';
import { createFallbackBot } from '@/app/fallbackBot';
import { botProfileFor, quickBattle, tutorialMatch1 } from '@/app/matchSetup';
import { ReplayPlayer } from '@/app/replayPlayer';
import { BattleSessionImpl } from '@/app/session';
import { systemClock } from '@/app/services';

export const title = 'Replay debugger (WP11)';

interface Row {
  seed: number;
  format: FormatId;
  winner: string;
  reason: string;
  ticks: number;
  commands: number;
  bytes: number;
  ms: number;
  verified: boolean | null;
}

const RING = 20;

function runMatch(seed: number, format: FormatId): { replay: ReplayDoc; ms: number } {
  const setup = quickBattle(null, content, { generalId: 'kettle', displayName: 'AI Kettle', format, seed });
  const t0 = performance.now();
  const s = new BattleSessionImpl({
    sim: createSim(setup.config),
    mode: 'skirmish',
    opponent: setup.opponent,
    simVersion: SIM_VERSION,
    bots: [
      { side: 1, controller: createBot(botProfileFor(setup.opponent, content, null), 1, seed, content) },
      { side: 0, controller: createFallbackBot({ ...botProfileFor(setup.opponent, content, null), tier: 5 }, 0, seed + 1, content) },
    ],
  });
  s.start();
  s.fastForward(20 * 60 * 12);
  if (!s.result) throw new Error('match did not end');
  return { replay: s.result.replay, ms: performance.now() - t0 };
}

function retime(): { key: string; pinned: number; measured: number | null }[] {
  const setup = tutorialMatch1(null, content, 'Old Grogg');
  const sim = createSim(setup.config);
  const s = new BattleSessionImpl({
    sim,
    mode: 'tutorial',
    opponent: setup.opponent,
    simVersion: SIM_VERSION,
    bots: [
      { side: 1, controller: createGroggBrain(1) },
      { side: 0, controller: new TutorialAutopilot(content, { turretFromTick: MATCH1_TURRET_GRANT_TICK, maxAgeIndex: 4, decideEveryTicks: 30, startTick: 50 }) },
    ],
  });
  const director = new TutorialDirector(setup.script, { adaptive: false });
  const t: Record<string, number> = {};
  s.onTick((evs, x) => {
    const input = { state: x.state, config: x.config, events: evs, side: 0 as const };
    director.update(input);
    if (t.evolveReady === undefined && evolveReady(input)) t.evolveReady = x.state.tick;
    for (const e of evs) {
      if (e.e === 'died' && e.killerSide === 0 && t.firstKill === undefined) t.firstKill = e.tick;
      if (e.e === 'ageUp' && e.side === 0) t[e.age] = e.tick;
      if (e.e === 'powerReady' && e.side === 0 && x.state.sides[0].ageIndex === 1 && t.arrowStormReady === undefined) t.arrowStormReady = e.tick;
      if (e.e === 'matchEnded') t.groggFalls = e.tick;
    }
  });
  s.start();
  s.fastForward(20 * 600);
  return Object.entries(MATCH1_TIMING).map(([key, pinned]) => ({ key, pinned, measured: t[key] ?? null }));
}

const cell = { padding: '2px 10px', borderBottom: '1px solid #333' } as const;
const secs = (ticks: number | null): string => (ticks === null ? '–' : `${(ticks / 20).toFixed(1)} s`);

export default function ReplayDebugPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [timing, setTiming] = useState<ReturnType<typeof retime> | null>(null);
  const [log] = useState(() => {
    try {
      return new EventLog({ clock: systemClock, store: window.localStorage });
    } catch {
      return new EventLog({ clock: systemClock });
    }
  });

  const runAll = (n: number): void => {
    setBusy(true);
    setTimeout(() => {
      const ring: { replay: ReplayDoc; ms: number }[] = [];
      for (let i = 0; i < n; i += 1) {
        ring.push(runMatch(1000 + i, (['short', 'standard', 'full'] as const)[i % 3]!));
        if (ring.length > RING) ring.shift();
      }
      setRows(
        ring.map(({ replay, ms }) => {
          const p = new ReplayPlayer({ replay, content, createSim, simVersion: SIM_VERSION });
          return {
            seed: replay.seed,
            format: replay.format,
            winner: replay.result.winner === null ? 'draw' : `side ${replay.result.winner}`,
            reason: replay.result.reason,
            ticks: replay.result.tick,
            commands: replay.commands.length,
            bytes: JSON.stringify(replay).length,
            ms: Math.round(ms),
            verified: p.runToEnd(),
          };
        }),
      );
      setBusy(false);
    }, 10);
  };

  const download = (): void => {
    const blob = new Blob([log.export()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'ageborn-eventlog.json';
    a.click();
  };

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', padding: '20px', background: '#1b1a2e', color: '#f4ecd8', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: '13px' }}>
      <h1 style={{ marginTop: 0 }}>{title}</h1>
      <p>
        <a style={{ color: '#9fc3ff' }} href="?dev=1">
          All dev pages
        </a>
      </p>

      <h2>Replays of the last {RING} matches</h2>
      <p>Bot-vs-bot matches (AI Kettle tier III vs the fallback bot) through the real session, replayed with the ReplayPlayer.</p>
      <button disabled={busy} data-testid="replay-debug-run" onClick={() => runAll(22)}>
        {busy ? 'Running…' : 'Run 22 matches, verify the last 20'}
      </button>
      {rows.length > 0 ? (
        <table style={{ borderCollapse: 'collapse', marginTop: '10px' }} data-testid="replay-debug-table">
          <thead>
            <tr>
              {['seed', 'format', 'winner', 'reason', 'end', 'commands', 'size', 'run', 'verified'].map((h) => (
                <th key={h} style={{ ...cell, textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.seed}>
                <td style={cell}>{r.seed}</td>
                <td style={cell}>{r.format}</td>
                <td style={cell}>{r.winner}</td>
                <td style={cell}>{r.reason}</td>
                <td style={cell}>{secs(r.ticks)}</td>
                <td style={cell}>{r.commands}</td>
                <td style={cell}>{(r.bytes / 1024).toFixed(1)} KB</td>
                <td style={cell}>{r.ms} ms</td>
                <td style={{ ...cell, color: r.verified ? '#8ceaa8' : '#ff9c8f' }}>{String(r.verified)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h2>Match 1 timing (A8 retiming run)</h2>
      <button onClick={() => setTiming(retime())}>Run match 1 on the autopilot</button>
      {timing ? (
        <table style={{ borderCollapse: 'collapse', marginTop: '10px' }}>
          <tbody>
            {timing.map((r) => (
              <tr key={r.key}>
                <td style={cell}>{r.key}</td>
                <td style={cell}>pinned {secs(r.pinned)}</td>
                <td style={{ ...cell, color: r.measured !== null && Math.abs(r.measured - r.pinned) <= 60 ? '#8ceaa8' : '#ff9c8f' }}>measured {secs(r.measured)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <h2>Onboarding event log ({log.entries().length} events, this browser only)</h2>
      <button onClick={download}>Export JSON</button>
      <pre style={{ maxHeight: '240px', overflow: 'auto', background: '#0008', padding: '8px' }}>
        {log
          .entries()
          .slice(-40)
          .map((e) => `${new Date(e.at).toISOString()} ${e.kind} ${e.id} ${e.data ? JSON.stringify(e.data) : ''}`)
          .join('\n')}
      </pre>
    </div>
  );
}
