/**
 * Sim sandbox panel (DESIGN C2/WP2 DoD): spawn any card on either side, step the simulation, and inspect
 * state and events. Rendered by the sandbox dev page (`src/dev/sandbox/page.tsx`, WP5) as
 * `<SimPanel />`; it has no renderer dependency, so it works before the battle view exists.
 *
 * Everything here is a dev tool: it uses the sim's debug helpers (state edits outside the command
 * stream), so a sandbox match cannot be saved as a replay. Dev pages are exempt from the i18n rule.
 */
import { useEffect, useMemo, useReducer, useRef, useState } from 'preact/hooks';
import type { AgeId, CardId, Command, CompiledContent, FormatId, Loadout, MatchConfig, Side, SideConfig, Sim, SimEvent } from '@/contracts';
import { content as realContent } from '@/content';
import { createSim } from '@/sim';
import { devClearLane, devPlaceTurret, devSetGold, devSetPower, devSetXp, devSpawn } from '@/sim/debug';

const AGES: readonly AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];
const FORMATS: readonly FormatId[] = ['full', 'standard', 'short', 'tutorial'];
const LANE = 1200000;
const SIDE_COLOR = ['#4f8fe8', '#f08a3c'] as const;
const SIZE_LU: Record<string, number> = { small: 24, medium: 32, large: 48, huge: 80 };

const panel = {
  fontFamily: 'ui-monospace, Menlo, Consolas, monospace',
  fontSize: '12px',
  color: '#f4ecd8',
  background: '#1b1a2e',
  padding: '12px',
  boxSizing: 'border-box',
  minHeight: '100%',
} as const;
const box = { border: '1px solid #3a3960', padding: '8px', marginBottom: '8px' } as const;
const btn = {
  marginRight: '4px',
  marginBottom: '4px',
  padding: '3px 8px',
  background: '#2c2b44',
  color: '#f4ecd8',
  border: '1px solid #4a4970',
  cursor: 'pointer',
  fontFamily: 'inherit',
  fontSize: '12px',
} as const;
const input = { background: '#11101f', color: '#f4ecd8', border: '1px solid #4a4970', fontFamily: 'inherit', fontSize: '12px', padding: '2px 4px' } as const;
const td = { padding: '1px 6px', borderBottom: '1px solid #2c2b44', whiteSpace: 'nowrap' } as const;

/** Default loadout of an age: the three Commons, the Rares (AA and Support), both Common turrets, the default power. */
function defaultLoadout(c: CompiledContent, age: AgeId): Loadout {
  const units = Object.values(c.units).filter((u) => u.age === age && !u.hidden);
  const pick = (group: string, rarity?: string): CardId | null =>
    units.find((u) => u.group === group && (!rarity || u.rarity === rarity))?.id ?? null;
  const turrets = Object.values(c.turrets).filter((t) => t.age === age && t.rarity === 'common');
  const power = Object.values(c.powers).find((p) => p.age === age && p.slot === 'default');
  return {
    units: [pick('infantry', 'common'), pick('ranged', 'common'), pick('heavy', 'common'), pick('antiArmor'), pick('support')],
    turrets: [turrets[0]?.id ?? null, turrets[1]?.id ?? null],
    power: power?.id ?? '',
  };
}

function sideConfig(c: CompiledContent, label: string, isBot: boolean): SideConfig {
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(c.units), ...Object.keys(c.turrets)]) levels[id] = 1;
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of AGES) loadouts[age] = defaultLoadout(c, age);
  return { label, isBot, loadouts, levels, skins: {} };
}

function newSim(c: CompiledContent, format: FormatId, seed: number, noClock: boolean): Sim {
  const cfg: MatchConfig = {
    seed,
    format,
    content: c,
    sides: [sideConfig(c, 'Sandbox blue', false), sideConfig(c, 'Sandbox orange (AI)', true)],
    ...(noClock ? { training: { noClock: true } } : {}),
  };
  return createSim(cfg);
}

function eventText(e: SimEvent): string {
  const { tick, e: kind, ...rest } = e;
  const parts = Object.entries(rest).map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : String(v)}`);
  return `${String(tick).padStart(5)} ${kind} ${parts.join(' ')}`;
}

const lu = (mlu: number): string => (mlu / 1000).toFixed(1);

/** The sim sandbox. `content` defaults to the game's compiled content (`@/content`). */
export function SimPanel(props: { content?: CompiledContent }) {
  const c = props.content ?? realContent;
  const [format, setFormat] = useState<FormatId>('full');
  const [seed, setSeed] = useState(1);
  const [noClock, setNoClock] = useState(true);
  const simRef = useRef<Sim>(newSim(c, 'full', 1, true));
  const seqRef = useRef<[number, number]>([0, 0]);
  const pendingRef = useRef<Command[]>([]);
  const logRef = useRef<SimEvent[]>([]);
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const [running, setRunning] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [spawnSide, setSpawnSide] = useState<Side>(0);
  const [card, setCard] = useState<CardId>('bonker');
  const [level, setLevel] = useState(1);
  const [p, setP] = useState(300);
  const [count, setCount] = useState(1);
  const [mount, setMount] = useState(0);
  const [filter, setFilter] = useState('');
  const [hideNoise, setHideNoise] = useState(true);

  const units = useMemo(() => Object.values(c.units).sort((a, b) => c.ages[a.age].index - c.ages[b.age].index || a.cost - b.cost), [c]);
  const turrets = useMemo(() => Object.values(c.turrets).sort((a, b) => c.ages[a.age].index - c.ages[b.age].index || a.cost - b.cost), [c]);
  const isTurret = c.turrets[card] !== undefined;

  const sim = simRef.current;
  const s = sim.state;

  function stepTicks(n: number): void {
    const cur = simRef.current;
    for (let i = 0; i < n && !cur.state.outcome; i += 1) {
      const tick = cur.state.tick + 1;
      const cmds = pendingRef.current.map((cmd) => {
        seqRef.current[cmd.side] += 1;
        return { ...cmd, tick, seq: seqRef.current[cmd.side] };
      });
      pendingRef.current = [];
      const ev = cur.step(cmds);
      for (const e of ev) logRef.current.push(e);
    }
    if (logRef.current.length > 2000) logRef.current = logRef.current.slice(-1500);
    redraw(0);
  }

  useEffect(() => {
    if (!running) return undefined;
    // 20 ticks per second of real time × speed.
    const id = window.setInterval(() => stepTicks(speed), 50);
    return () => window.clearInterval(id);
  }, [running, speed]);

  function reset(): void {
    simRef.current = newSim(c, format, seed, noClock);
    seqRef.current = [0, 0];
    pendingRef.current = [];
    logRef.current = [];
    setRunning(false);
    redraw(0);
  }

  function spawn(): void {
    const cur = simRef.current;
    if (isTurret) devPlaceTurret(cur, spawnSide, mount, card, level);
    else for (let i = 0; i < count; i += 1) devSpawn(cur, spawnSide, card, { p, level });
    redraw(0);
  }

  function issue(cmd: Command): void {
    pendingRef.current.push(cmd);
    stepTicks(1);
  }

  const shownLog = logRef.current
    .filter((e) => !hideNoise || (e.e !== 'goldEarned' && e.e !== 'xpEarned' && e.e !== 'attackStarted' && e.e !== 'projectileFired'))
    .filter((e) => !filter || e.e.includes(filter))
    .slice(-120)
    .reverse();

  return (
    <div style={panel} data-testid="sim-panel">
      <h2 style={{ margin: '0 0 8px' }}>Sim sandbox</h2>

      <div style={box}>
        <label>
          format{' '}
          <select style={input} value={format} onChange={(e) => setFormat((e.target as HTMLSelectElement).value as FormatId)}>
            {FORMATS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </label>{' '}
        <label>
          seed <input style={{ ...input, width: '70px' }} type="number" value={seed} onInput={(e) => setSeed(Number((e.target as HTMLInputElement).value) || 0)} />
        </label>{' '}
        <label>
          <input type="checkbox" checked={noClock} onChange={(e) => setNoClock((e.target as HTMLInputElement).checked)} /> no clock
        </label>{' '}
        <button style={btn} onClick={reset} data-testid="sim-new">
          New match
        </button>
        <button
          style={btn}
          onClick={() => {
            devClearLane(simRef.current);
            redraw(0);
          }}
        >
          Clear lane
        </button>
      </div>

      <div style={box}>
        <b>Spawn</b>{' '}
        <select style={input} value={spawnSide} onChange={(e) => setSpawnSide(Number((e.target as HTMLSelectElement).value) as Side)} data-testid="sim-side">
          <option value={0}>side 0 (blue)</option>
          <option value={1}>side 1 (orange)</option>
        </select>{' '}
        <select style={input} value={card} onChange={(e) => setCard((e.target as HTMLSelectElement).value)} data-testid="sim-card">
          <optgroup label="Units">
            {units.map((u) => (
              <option key={u.id} value={u.id}>
                {u.age} · {u.id} ({u.rarity})
              </option>
            ))}
          </optgroup>
          <optgroup label="Turrets">
            {turrets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.age} · {t.id} (turret)
              </option>
            ))}
          </optgroup>
        </select>{' '}
        <label>
          L <input style={{ ...input, width: '40px' }} type="number" min={1} max={10} value={level} onInput={(e) => setLevel(Number((e.target as HTMLInputElement).value) || 1)} />
        </label>{' '}
        {isTurret ? (
          <label>
            mount{' '}
            <select style={input} value={mount} onChange={(e) => setMount(Number((e.target as HTMLSelectElement).value))}>
              {[0, 1, 2, 3].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <>
            <label>
              p (lu){' '}
              <input style={{ ...input, width: '60px' }} type="number" value={p} onInput={(e) => setP(Number((e.target as HTMLInputElement).value) || 0)} data-testid="sim-p" />
            </label>{' '}
            <label>
              ×{' '}
              <input style={{ ...input, width: '40px' }} type="number" min={1} max={30} value={count} onInput={(e) => setCount(Number((e.target as HTMLInputElement).value) || 1)} />
            </label>
          </>
        )}{' '}
        <button style={btn} onClick={spawn} data-testid="sim-spawn">
          Spawn
        </button>
      </div>

      <div style={box}>
        <b>Step</b>{' '}
        <button style={btn} onClick={() => stepTicks(1)} data-testid="sim-step1">
          +1 tick
        </button>
        <button style={btn} onClick={() => stepTicks(10)}>
          +10
        </button>
        <button style={btn} onClick={() => stepTicks(20)} data-testid="sim-step20">
          +1 s
        </button>
        <button style={btn} onClick={() => stepTicks(200)}>
          +10 s
        </button>
        <button style={btn} onClick={() => stepTicks(12000)}>
          to the end
        </button>
        <button style={btn} onClick={() => setRunning(!running)} data-testid="sim-run">
          {running ? 'Pause' : 'Run'}
        </button>
        <select style={input} value={speed} onChange={(e) => setSpeed(Number((e.target as HTMLSelectElement).value))}>
          {[1, 2, 4, 16].map((v) => (
            <option key={v} value={v}>
              {v}×
            </option>
          ))}
        </select>
        <span style={{ marginLeft: '12px' }} data-testid="sim-clock">
          tick {s.tick} · {(s.tick / 20).toFixed(1)} s · {s.phase}
          {s.outcome ? ` · ended: ${s.outcome.reason}, winner ${s.outcome.winner ?? 'draw'}` : ''} · hash {sim.hash().toString(16)}
        </span>
      </div>

      <Lane sim={sim} content={c} />

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {([0, 1] as const).map((side) => (
          <SideBox key={side} sim={sim} side={side} issue={issue} refresh={() => redraw(0)} />
        ))}
      </div>

      <div style={box}>
        <b>Units ({s.units.length})</b>
        <table style={{ borderCollapse: 'collapse', marginTop: '4px' }} data-testid="sim-units">
          <thead>
            <tr>
              {['id', 'side', 'card', 'L', 'p', 'hp', 'shield', 'mode', 'targets', 'statuses'].map((h) => (
                <th key={h} style={{ ...td, textAlign: 'left' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {s.units.map((u) => (
              <tr key={u.id} style={{ color: SIDE_COLOR[u.side] }}>
                <td style={td}>{u.id}</td>
                <td style={td}>{u.side}</td>
                <td style={td}>
                  {u.card}
                  {u.summoned ? ' (s)' : ''}
                </td>
                <td style={td}>{u.level}</td>
                <td style={td}>{lu(u.side === 0 ? u.x : LANE - u.x)}</td>
                <td style={td}>
                  {(u.hp / 100).toFixed(0)}/{(u.maxHp / 100).toFixed(0)}
                </td>
                <td style={td}>{((u.shield + u.innateShield) / 100).toFixed(0)}</td>
                <td style={td}>{u.mode}</td>
                <td style={td}>{u.attacks.map((a) => a.targetId).join(',')}</td>
                <td style={td}>{u.statuses.map((st) => `${st.kind}${st.frozen ? '*' : ''}→${st.untilTick}`).join(' ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={box}>
        <b>Events</b>{' '}
        <input style={input} placeholder="filter by type" value={filter} onInput={(e) => setFilter((e.target as HTMLInputElement).value)} />{' '}
        <label>
          <input type="checkbox" checked={hideNoise} onChange={(e) => setHideNoise((e.target as HTMLInputElement).checked)} /> hide income, windups
          and projectiles
        </label>
        <pre style={{ margin: '4px 0 0', maxHeight: '300px', overflow: 'auto' }} data-testid="sim-events">
          {shownLog.map(eventText).join('\n')}
        </pre>
      </div>
    </div>
  );
}

/** A 1D lane drawn as SVG: bases, units (air above), projectiles and power zones. */
function Lane(props: { sim: Sim; content: CompiledContent }) {
  const { sim, content } = props;
  const s = sim.state;
  const W = 1200;
  return (
    <div style={box}>
      <svg viewBox={`-40 -60 ${W + 80} 110`} style={{ width: '100%', height: '160px', background: '#15142a' }} data-testid="sim-lane">
        <rect x={-40} y={10} width={40} height={30} fill={SIDE_COLOR[0]} opacity={0.5} />
        <rect x={W} y={10} width={40} height={30} fill={SIDE_COLOR[1]} opacity={0.5} />
        <line x1={0} y1={40} x2={W} y2={40} stroke="#555" />
        {[320, 600, 880].map((x) => (
          <line key={x} x1={x} y1={36} x2={x} y2={44} stroke="#666" />
        ))}
        {s.casts.map((c) => (
          <rect key={c.castId} x={c.x / 1000 - c.zone / 2000} y={-55} width={Math.max(2, c.zone / 1000)} height={95} fill={SIDE_COLOR[c.side]} opacity={0.12} />
        ))}
        {s.units.map((u) => {
          const def = content.units[u.card];
          const w = SIZE_LU[def?.size ?? 'small'] ?? 24;
          // depth rows by rank in the side's order, like the battle view (A2.1): stacked allies stay visible
          const rank = s.units.filter((o) => o.side === u.side && !o.air && (u.side === 0 ? o.x > u.x : o.x < u.x)).length;
          const y = u.air ? -40 : 40 - w * 0.6 - (rank % 3) * 5;
          const hp = u.maxHp > 0 ? u.hp / u.maxHp : 0;
          return (
            <g key={u.id}>
              <rect x={u.x / 1000 - w / 2} y={y} width={w} height={w * 0.6} fill={SIDE_COLOR[u.side]} opacity={u.mode === 'leap' ? 0.5 : 0.85} />
              <rect x={u.x / 1000 - w / 2} y={y - 4} width={w * hp} height={2} fill="#7dd87d" />
            </g>
          );
        })}
        {s.projectiles.map((pr) => (
          <circle key={pr.pid} cx={pr.x / 1000} cy={20} r={2} fill="#f2c14e" />
        ))}
      </svg>
    </div>
  );
}

function SideBox(props: { sim: Sim; side: Side; issue: (c: Command) => void; refresh: () => void }) {
  const { sim, side, issue, refresh } = props;
  const st = sim.state.sides[side];
  const o = sim.observe(side);
  const color = SIDE_COLOR[side];
  const [gold, setGold] = useState(1000);
  return (
    <div style={{ ...box, flex: '1 1 420px', borderColor: color }} data-testid={`sim-side-${side}`}>
      <b style={{ color }}>Side {side}</b> · age {st.ageIndex} · gold {(st.gold / 1000).toFixed(1)} · XP {(st.xp / 1000).toFixed(1)} ({(o.me.xpBp / 100).toFixed(0)}%) · pop{' '}
      {st.pop}/60 · base {(st.baseHp / 100).toFixed(0)}/{(st.baseMaxHp / 100).toFixed(0)} · power {(st.powerPpm / 10000).toFixed(0)}% · {st.stance} · last stand{' '}
      {st.lastStand} · treasury {st.treasury} · mounts {st.mountsOwned}
      <div style={{ marginTop: '4px' }}>
        queue: {st.queue.map((q) => `${q.card} ${Math.trunc((q.progress * 100) / q.total)}%${q.waiting ? ' FULL' : ''}`).join(', ') || 'empty'}
      </div>
      <div>
        turrets:{' '}
        {st.turrets.map((t, i) => (t ? `#${i} ${t.card} (${t.state})` : `#${i} -`)).join(' · ')}
      </div>
      <div style={{ marginTop: '4px' }}>
        {o.me.tray.map((cardId, slot) => (
          <button key={slot} style={btn} disabled={!cardId} onClick={() => issue({ t: 'train', side, slot: slot as 0 | 1 | 2 | 3 | 4 })}>
            train {cardId ?? '-'}
          </button>
        ))}
      </div>
      <div>
        {o.me.turretCards.map((cardId, slot) => (
          <button
            key={slot}
            style={btn}
            disabled={!cardId}
            onClick={() => {
              const free = st.turrets.findIndex((t, i) => i < st.mountsOwned && !t);
              issue({ t: 'buildTurret', side, mount: (free < 0 ? 0 : free) as 0 | 1 | 2 | 3, slot: slot as 0 | 1 });
            }}
          >
            build {cardId ?? '-'}
          </button>
        ))}
        <button style={btn} onClick={() => issue({ t: 'buyMount', side })}>
          buy mount
        </button>
        <button style={btn} onClick={() => issue({ t: 'treasury', side })}>
          treasury
        </button>
        <button style={btn} onClick={() => issue({ t: 'evolve', side })}>
          evolve
        </button>
        <button style={btn} onClick={() => issue({ t: 'power', side })}>
          power ({o.me.power})
        </button>
        <button style={btn} onClick={() => issue({ t: 'stance', side, stance: st.stance === 'charge' ? 'hold' : 'charge' })}>
          stance → {st.stance === 'charge' ? 'hold' : 'charge'}
        </button>
        <button style={btn} onClick={() => issue({ t: 'lastStand', side })}>
          last stand
        </button>
      </div>
      <div>
        <input style={{ ...input, width: '60px' }} type="number" value={gold} onInput={(e) => setGold(Number((e.target as HTMLInputElement).value) || 0)} />
        <button
          style={btn}
          onClick={() => {
            devSetGold(sim, side, gold);
            refresh();
          }}
        >
          set gold
        </button>
        <button
          style={btn}
          onClick={() => {
            // enough for any threshold; the XP cap clamps it on the next tick
            devSetXp(sim, side, 1500);
            refresh();
          }}
        >
          fill XP
        </button>
        <button
          style={btn}
          onClick={() => {
            devSetPower(sim, side, 1000000);
            refresh();
          }}
        >
          fill power
        </button>
      </div>
    </div>
  );
}

export default SimPanel;
