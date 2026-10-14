/**
 * Scouting (studio tool): runs staged battles headlessly on the game's own sim to find matchups worth
 * filming, before anything is rendered. Same setup as the capture page (`src/dev/capture/scenario.ts`).
 *
 *   cd <repo> && npx tsx <studio>/tools/scout.ts clash '<json spec>'
 *
 * A spec: { left, right, seed, armies: [[{card, n, p0, gap, level}], [...]], maxSec }
 */
import type { CardId, Side } from '@/contracts';
import { captureMatchConfig, DEFAULT_OPTIONS, evolveToAges } from '@/dev/capture/scenario';
import { createSim } from '@/sim';
import { devSpawn } from '@/sim/debug';

interface Group {
  card: CardId;
  n: number;
  /** Own-side progress of the first unit (lu) and the gap between units. */
  p0: number;
  gap: number;
  level?: number;
}
interface Spec {
  left: string;
  right: string;
  seed?: number;
  armies: [Group[], Group[]];
  maxSec?: number;
  level?: number;
  /** Commands at given seconds after the armies are placed (stance hold or charge, evolve ...). */
  script?: { at: number; cmd: Record<string, unknown> }[];
}

function run(spec: Spec): void {
  const o = { ...DEFAULT_OPTIONS, ages: [spec.left, spec.right] as never, seed: spec.seed ?? 1, level: spec.level ?? 3 };
  const sim = createSim(captureMatchConfig(o));
  let seq = 0;
  evolveToAges(sim, o.ages, (cmds) => {
    sim.step(cmds.map((c) => ({ ...c, tick: sim.state.tick + 1, seq: ++seq })));
  });
  const ids: number[][] = [[], []];
  for (const side of [0, 1] as Side[]) {
    for (const g of spec.armies[side]) {
      for (let i = 0; i < g.n; i++) ids[side]?.push(devSpawn(sim, side, g.card, { p: g.p0 + i * g.gap, ...(g.level ? { level: g.level } : {}) }).id);
    }
  }
  const t0 = sim.state.tick;
  const maxTicks = (spec.maxSec ?? 90) * 20;
  let firstContact: number | null = null;
  const deaths: [number, number] = [0, 0];
  let lastLog = 0;
  const script = [...(spec.script ?? [])].sort((a, b) => a.at - b.at);
  while (sim.state.tick - t0 < maxTicks && !sim.state.outcome) {
    const now = (sim.state.tick - t0) / 20;
    const due = script.filter((c) => c.at <= now);
    for (const c of due) script.splice(script.indexOf(c), 1);
    const evs = sim.step(due.map((c) => ({ ...(c.cmd as object), tick: sim.state.tick + 1, seq: ++seq })) as never);
    for (const e of evs) if (e.e === 'commandRejected') console.log('rejected', JSON.stringify(e));
    for (const e of evs) {
      if (e.e === 'hit' && firstContact === null) firstContact = sim.state.tick - t0;
      if (e.e === 'died') deaths[e.side]++;
    }
    const alive = [0, 1].map((s) => sim.state.units.filter((u) => u.side === s && u.mode !== 'dying' && !u.fort).length);
    if (sim.state.tick - lastLog >= 40) {
      lastLog = sim.state.tick;
      const hp = [0, 1].map((s) => Math.round((sim.state.sides[s as Side].baseHp * 100) / sim.state.sides[s as Side].baseMaxHp));
      const fr = [0, 1].map((s) => {
        const xs = sim.state.units.filter((u) => u.side === s && u.mode !== 'dying').map((u) => Math.round(u.x / 1000));
        return xs.length ? (s === 0 ? Math.max(...xs) : Math.min(...xs)) : null;
      });
      console.log(`t=${((sim.state.tick - t0) / 20).toFixed(1)}s alive=${alive.join('/')} fronts=${fr.join('/')} baseHp=${hp.join('/')}%`);
    }
    if (alive[0] === 0 || alive[1] === 0) {
      // keep going a little: the winners march on the base
      if (alive[0] === 0 && alive[1] === 0) break;
    }
  }
  const alive = [0, 1].map((s) => sim.state.units.filter((u) => u.side === s && u.mode !== 'dying' && !u.fort));
  console.log(
    JSON.stringify({
      firstContactSec: firstContact === null ? null : firstContact / 20,
      endSec: (sim.state.tick - t0) / 20,
      outcome: sim.state.outcome,
      deaths,
      survivors: alive.map((us) => us.map((u) => `${u.card}:${Math.round((u.hp * 100) / u.maxHp)}%`)),
    }),
  );
}

const [mode, json] = process.argv.slice(2);
if (mode === 'clash' && json) run(JSON.parse(json) as Spec);
else console.log('usage: scout.ts clash <json>');
