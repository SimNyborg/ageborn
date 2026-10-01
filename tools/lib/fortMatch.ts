/**
 * Fort match jobs for `tools/forts.ts` (DESIGN A16.14.9): one headless match with a Fort card of a given
 * kind per side and age, seats that are tier bots (optionally with the AI's forced-placement rule or
 * locked to Hold) or scripted proxies (optionally with the turtle fort hook), and per-side fort numbers:
 * placements, forts destroyed and decayed, levies, bounty given away, kill and damage shares.
 *
 * Jobs are plain data so they cross worker threads (`fortWorker.ts`). Bots are always labelled AI.
 */
import type { AgeId, BotController, CardId, CompiledContent, FormatId, FortKind, MatchConfig, Side, SimEvent } from '../../src/contracts';
import { botProfile, createBot } from '../../src/ai';
import { createSim } from '../../src/sim';
import { createProxy, FortTurtleDriver, HoldDriver, STRATEGIES, type ProxyId } from '../proxies';
import { HeadlessMatch } from './driver';
import { baselinePlan, clonePlan, sideConfig, type Plan } from './plans';

/** A fort kind for a side, or none (an empty Fort slot). */
export type FortChoice = FortKind | 'none';

export type FortSeat =
  | { kind: 'bot'; tier: number; generalId: string; rules?: string[]; hold?: boolean }
  | { kind: 'proxy'; proxy: ProxyId; turtle?: boolean };

export interface FortJob {
  id: number;
  tag: string;
  seed: number;
  format: FormatId;
  level: number;
  seats: [FortSeat, FortSeat];
  forts: [FortChoice, FortChoice];
  /** The side that plays the tested row (null for mirrors). */
  subject: Side | null;
}

export interface FortSideStats {
  placed: number;
  gold: number;
  destroyed: number;
  decayed: number;
  levies: number;
  bountyGiven: number;
  /** Enemy units killed: all, and by forts, towers, traps and levies. */
  kills: number;
  fortKills: number;
}

export interface FortResult {
  id: number;
  tag: string;
  seed: number;
  subject: Side | null;
  winner: Side | null;
  bell: boolean;
  ticks: number;
  sides: [FortSideStats, FortSideStats];
  ms: number;
  error?: string;
}

/** The Fort card of `kind` in an age, or null. */
export function fortCardOf(content: CompiledContent, age: AgeId, kind: FortKind): CardId | null {
  return Object.values(content.forts ?? {}).find((f) => f.age === age && f.fortKind === kind)?.id ?? null;
}

/** `base` with every age's Fort slot set to that age's card of `kind` (or empty). */
export function planWithForts(content: CompiledContent, base: Plan, kind: FortChoice): Plan {
  const p = clonePlan(base);
  for (const age of Object.keys(p) as AgeId[]) {
    const l = p[age];
    if (l) l.fort = kind === 'none' ? null : fortCardOf(content, age, kind);
  }
  return p;
}

const emptyStats = (): FortSideStats => ({ placed: 0, gold: 0, destroyed: 0, decayed: 0, levies: 0, bountyGiven: 0, kills: 0, fortKills: 0 });

function seatLabel(s: FortSeat): string {
  return s.kind === 'bot' ? `AI ${s.generalId} T${s.tier}` : `Proxy ${s.proxy}`;
}

function controllerFor(content: CompiledContent, job: FortJob, side: Side): BotController {
  const s = job.seats[side];
  if (s.kind === 'proxy') {
    const p = createProxy(s.proxy, content, side, job.seed, job.format);
    return s.turtle ? new FortTurtleDriver(p) : p;
  }
  const prof = botProfile(content, { generalId: s.generalId, tier: s.tier });
  const bot = createBot({ ...prof, openings: [...prof.openings, ...(s.rules ?? [])] }, side, job.seed, content);
  return s.hold ? new HoldDriver(bot) : bot;
}

/** Plays one fort job to the end. */
export function playFortJob(job: FortJob, content: CompiledContent): FortResult {
  const t0 = performance.now();
  const base = baselinePlan(content);
  const planOf = (s: FortSeat): Plan => (s.kind === 'proxy' ? STRATEGIES[s.proxy].plan(content) : base);
  const plans = [0, 1].map((i) => planWithForts(content, planOf(job.seats[i] as FortSeat), job.forts[i] as FortChoice));
  const cfg: MatchConfig = {
    seed: job.seed,
    format: job.format,
    content,
    sides: [
      sideConfig(content, plans[0] as Plan, { level: job.level, label: seatLabel(job.seats[0]), isBot: true }),
      sideConfig(content, plans[1] as Plan, { level: job.level, label: seatLabel(job.seats[1]), isBot: true }),
    ],
  };
  const sim = createSim(cfg);
  const match = new HeadlessMatch(sim, [
    { side: 0, controller: controllerFor(content, job, 0) },
    { side: 1, controller: controllerFor(content, job, 1) },
  ]);
  const st: [FortSideStats, FortSideStats] = [emptyStats(), emptyStats()];
  const forts = new Map<number, Side>();
  const fortish = (card: CardId | null): boolean => !!card && (!!content.forts[card] || content.units[card]?.levy === true);
  match.run({
    onEvents: (ev: readonly SimEvent[]) => {
      for (const e of ev) {
        if (e.e === 'fortPlaced') {
          forts.set(e.id, e.side);
          st[e.side].placed += 1;
          st[e.side].gold += e.cost;
        } else if (e.e === 'unitSpawned') {
          if (e.from !== undefined && forts.has(e.from)) st[e.side].levies += 1;
        } else if (e.e === 'fortDecayed') {
          const s = forts.get(e.id);
          if (s !== undefined) st[s].decayed += 1;
        } else if (e.e === 'died') {
          const s = forts.get(e.id);
          if (s !== undefined) {
            if (e.killerKind !== 'decay') st[s].destroyed += 1;
            st[s].bountyGiven += e.bountyGold;
            continue;
          }
          if (e.killerSide === null || e.killerSide === e.side) continue;
          st[e.killerSide].kills += 1;
          if (fortish(e.killerCard)) st[e.killerSide].fortKills += 1;
        }
      }
    },
  });
  const o = sim.state.outcome;
  return { id: job.id, tag: job.tag, seed: job.seed, subject: job.subject, winner: o ? o.winner : null, bell: o?.reason === 'finalBell', ticks: sim.state.tick, sides: st, ms: performance.now() - t0 };
}

/** `playFortJob` that reports a thrown match as an error result instead of failing the batch. */
export function playFortJobSafe(job: FortJob, content: CompiledContent): FortResult {
  try {
    return playFortJob(job, content);
  } catch (e) {
    return { id: job.id, tag: job.tag, seed: job.seed, subject: job.subject, winner: null, bell: false, ticks: 0, sides: [emptyStats(), emptyStats()], ms: 0, error: e instanceof Error ? (e.stack ?? e.message) : String(e) };
  }
}
