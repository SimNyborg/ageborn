/**
 * Wall sandbox (DESIGN A16.14 Checkpoint A prototype; dev page only, `?dev=1#walls`).
 *
 * A real sim with a `palisade` wall unit added to a content clone (`walls.ts`), two AI Generals or an
 * empty lane, pad buttons at p 240 / 360 / 460 for either side, a free-placement slider, HP ×1 / ×2,
 * unit spawns, and a top-down lane drawn in SVG. It answers "fixed pads or free placement" and "do
 * walls feel fun" before any fort rules, contract or art exist. Dev pages are exempt from i18n.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { BALANCED_BRAIN_ID, BotMatch, botProfile, createBot } from '@/ai';
import type { AgeId, CardId, CompiledContent, FormatId, Loadout, Side, Sim } from '@/contracts';
import { content as baseContent } from '@/content';
import { createSim } from '@/sim';
import { devSpawn } from '@/sim/debug';
import { WALL_CARD, WALL_PADS, WALL_RECHARGE_MS, padClear, placeWall, progressFor, withWalls } from './walls';

export const title = 'Wall sandbox (A16.14 prototype)';

const LANE = 1200;
const W = 1100;
const H = 220;
const TICK_MS = 50;

type Seats = 'none' | 'p1' | 'both';

interface World {
  sim: Sim;
  match: BotMatch;
  lastWall: [number, number];
}

/** The A2.14 baseline loadout of every age: the 3 Commons, the anti-armor and support cards, both Common turrets. */
function baselinePlan(c: CompiledContent): Partial<Record<AgeId, Loadout>> {
  const out: Partial<Record<AgeId, Loadout>> = {};
  for (const age of ['stone', 'medieval', 'gunpowder', 'modern', 'future'] as AgeId[]) {
    const units = Object.values(c.units).filter((u) => u.age === age && !u.hidden);
    const pick = (group: string, rarity?: string): CardId | null => units.find((u) => u.group === group && (!rarity || u.rarity === rarity))?.id ?? null;
    const turrets = Object.values(c.turrets).filter((t) => t.age === age && t.rarity === 'common');
    const power = Object.values(c.powers).find((p) => p.age === age && p.slot === 'default');
    out[age] = {
      units: [pick('infantry', 'common'), pick('ranged', 'common'), pick('heavy', 'common'), pick('antiArmor'), pick('support')],
      turrets: [turrets[0]?.id ?? null, turrets[1]?.id ?? null],
      power: power?.id ?? '',
    };
  }
  return out;
}

function levelsOf(c: CompiledContent, level: number): Record<CardId, number> {
  const out: Record<CardId, number> = {};
  for (const id of [...Object.keys(c.units), ...Object.keys(c.turrets)]) out[id] = level;
  return out;
}

function makeWorld(o: { hpScale: 1 | 2; seats: Seats; tier: number; format: FormatId; seed: number }): World {
  const content = withWalls(baseContent, { hpScale: o.hpScale });
  const plan = (side: Side) => ({ label: side === 0 ? 'You (sandbox)' : 'AI · Sandbox', isBot: side === 1, loadouts: baselinePlan(content), levels: levelsOf(content, 7), skins: {} });
  const sim = createSim({ seed: o.seed, format: o.format, content, sides: [plan(0), plan(1)] });
  const seats = [];
  if (o.seats !== 'none') seats.push({ side: 1 as Side, controller: createBot(botProfile(content, { generalId: BALANCED_BRAIN_ID, tier: o.tier }), 1, o.seed, content) });
  if (o.seats === 'both') seats.push({ side: 0 as Side, controller: createBot(botProfile(content, { generalId: BALANCED_BRAIN_ID, tier: o.tier }), 0, o.seed + 1, content) });
  return { sim, match: new BotMatch(sim, seats), lastWall: [-1e9, -1e9] };
}

const btn = { font: 'inherit', padding: '6px 10px', margin: '2px', borderRadius: '8px', border: '1px solid #6b5f91', background: '#2d2748', color: '#f4ecd8', cursor: 'pointer' } as const;

export default function WallSandbox() {
  const [hpScale, setHpScale] = useState<1 | 2>(1);
  const [seats, setSeats] = useState<Seats>('p1');
  const [tier, setTier] = useState(7);
  const [format, setFormat] = useState<FormatId>('short');
  const [seed, setSeed] = useState(1);
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [freeP, setFreeP] = useState(300);
  const [, setFrame] = useState(0);
  const world = useMemo(() => makeWorld({ hpScale, seats, tier, format, seed }), [hpScale, seats, tier, format, seed]);
  const ref = useRef(world);
  ref.current = world;

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      const w = ref.current;
      for (let i = 0; i < speed && !w.match.ended; i += 1) w.match.tick();
      setFrame((f) => f + 1);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [running, speed, world]);

  const sim = world.sim;
  const tick = sim.state.tick;
  const ready = (side: Side): boolean => (tick - world.lastWall[side]) * TICK_MS >= WALL_RECHARGE_MS;
  const place = (side: Side, p: number, force = false): void => {
    if (!force && (!ready(side) || !padClear(sim, side, p))) return;
    placeWall(sim, side, p);
    world.lastWall[side] = tick;
    setFrame((f) => f + 1);
  };
  const spawn = (side: Side, card: CardId): void => {
    devSpawn(sim, side, card, { p: 60 });
    setFrame((f) => f + 1);
  };
  const xOf = (x: number): number => 40 + ((x / 1000) * (W - 80)) / LANE;
  const walls = sim.state.units.filter((u) => u.card === WALL_CARD);
  const out = sim.state.outcome;
  const stone = Object.values(baseContent.units).filter((u) => u.age === 'stone' && !u.hidden);

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'auto', background: '#1b1a2e', color: '#f4ecd8', fontFamily: 'ui-monospace, Menlo, monospace', padding: '16px', boxSizing: 'border-box' }} data-testid="walls-page">
      <h2 style={{ margin: '0 0 8px' }}>{title}</h2>
      <div>
        <button style={btn} onClick={() => setRunning(!running)}>{running ? 'Pause' : 'Play'}</button>
        {[1, 2, 4].map((s) => (
          <button key={s} style={{ ...btn, background: s === speed ? '#6b4fd8' : btn.background }} onClick={() => setSpeed(s)}>{s}x</button>
        ))}
        <button style={btn} onClick={() => setSeed(seed + 1)}>Restart (seed {seed + 1})</button>
        <button style={btn} onClick={() => setHpScale(hpScale === 1 ? 2 : 1)}>Wall HP ×{hpScale}</button>
        <select style={btn} value={seats} onChange={(e) => setSeats((e.target as HTMLSelectElement).value as Seats)}>
          <option value="none">Empty lane</option>
          <option value="p1">AI on the right</option>
          <option value="both">AI on both sides</option>
        </select>
        <select style={btn} value={tier} onChange={(e) => setTier(Number((e.target as HTMLSelectElement).value))}>
          {[0, 3, 5, 7, 10].map((t) => (
            <option key={t} value={t}>Tier {t}</option>
          ))}
        </select>
        <select style={btn} value={format} onChange={(e) => setFormat((e.target as HTMLSelectElement).value as FormatId)}>
          <option value="short">Short War</option>
          <option value="full">Full War</option>
        </select>
      </div>
      <svg width={W} height={H} style={{ display: 'block', margin: '12px 0', background: '#2a2440', borderRadius: '12px' }} data-testid="walls-lane">
        <rect x={0} y={150} width={W} height={40} fill="#3b3157" />
        <rect x={10} y={60} width={30} height={130} fill="#4f7cff" rx={6} />
        <rect x={W - 40} y={60} width={30} height={130} fill="#ff6a5a" rx={6} />
        {WALL_PADS.map((p) => (
          <g key={p}>
            <rect x={xOf(p * 1000) - 3} y={186} width={6} height={10} fill="#8fd694" />
            <rect x={xOf((LANE - p) * 1000) - 3} y={186} width={6} height={10} fill="#8fd694" />
          </g>
        ))}
        {sim.state.units.map((u) => {
          const def = sim.config.content.units[u.card];
          const isWall = u.card === WALL_CARD;
          const x = xOf(u.x);
          const hpW = Math.max(0, (u.hp / Math.max(1, u.maxHp)) * 24);
          const color = u.side === 0 ? '#7fa4ff' : '#ff8c7f';
          return (
            <g key={u.id}>
              {isWall ? (
                <rect x={x - 8} y={96} width={16} height={58} fill="#a0784a" stroke="#3d2a14" stroke-width={2} rx={2} />
              ) : (
                <circle cx={x} cy={u.air ? 90 : 140} r={def?.size === 'large' ? 11 : def?.size === 'huge' ? 15 : 7} fill={color} stroke={u.mode === 'attack' ? '#fff' : 'none'} />
              )}
              <rect x={x - 12} y={isWall ? 86 : u.air ? 74 : 124} width={hpW} height={3} fill="#9cff8a" />
            </g>
          );
        })}
        <text x={W / 2} y={24} fill="#f4ecd8" text-anchor="middle" font-size="14">
          {(tick / 20).toFixed(1)} s · base HP {sim.state.sides[0].baseHp} / {sim.state.sides[1].baseHp} · walls {walls.length}
          {out ? ` · ended: ${out.winner === null ? 'draw' : `side ${out.winner} wins`} (${out.reason})` : ''}
        </text>
      </svg>
      {([0, 1] as Side[]).map((side) => (
        <div key={side} style={{ margin: '6px 0' }}>
          <strong style={{ color: side === 0 ? '#7fa4ff' : '#ff8c7f' }}>Side {side}</strong> wall {ready(side) ? 'ready' : `recharging ${Math.ceil((WALL_RECHARGE_MS - (tick - world.lastWall[side]) * TICK_MS) / 1000)} s`}:
          {WALL_PADS.map((p) => (
            <button key={p} style={{ ...btn, opacity: ready(side) && padClear(sim, side, p) ? 1 : 0.5 }} data-testid={`pad-${side}-${p}`} onClick={() => place(side, p)}>
              Pad {p}
            </button>
          ))}
          <button style={btn} data-testid={`free-${side}`} onClick={() => place(side, freeP, true)}>
            Free at {freeP}
          </button>
          {stone.map((u) => (
            <button key={u.id} style={btn} onClick={() => spawn(side, u.id)}>
              + {u.id}
            </button>
          ))}
        </div>
      ))}
      <label>
        Free placement p: <input type="range" min={100} max={600} value={freeP} onInput={(e) => setFreeP(Number((e.target as HTMLInputElement).value))} /> {freeP} lu
      </label>
      <ul style={{ fontSize: '12px', opacity: 0.8 }}>
        <li>Wall = Tuskback copy, speed 0, inert attack, no pop, no bounty (A16.14 prototype). Pads need no enemy ground unit within 120 lu; recharge 25 s. "Free" ignores both.</li>
        <li>Known gaps: no scaffold, pop cost, contact rule or ranged ×0.5 (worst case for turtling). Walls in view: {walls.map((w) => `${w.side}@${progressFor(w, w.side)} (${Math.round((w.hp / w.maxHp) * 100)}%)`).join(', ') || 'none'}.</li>
      </ul>
    </div>
  );
}
