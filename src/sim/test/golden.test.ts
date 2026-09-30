/**
 * Golden replays (DESIGN B13): 10 recorded matches on the frozen fixture content with known final
 * hashes. Any change to the simulation's behaviour changes a hash and fails this test on purpose.
 *
 * Re-record after an intended rule change (and bump SIM_VERSION in replay.ts):
 *   UPDATE_GOLDEN=1 npx vitest run src/sim/test/golden.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, Command, MatchConfig, Observation, ReplayDoc, Side, SideConfig, SimEvent } from '@/contracts';
import { buildReplay, verifyReplay } from '../replay';
import { STRATEGIES, fixture, matchConfig, runMatch, scriptedPlayer, sideConfig, type Strategy } from './helpers';

/** The recorded files, loaded by Vite (src has no Node types; see `writeGolden` for recording). */
const FILES = import.meta.glob<ReplayDoc>('./golden/*.json', { eager: true, import: 'default' });
/** Replays recorded in this run (UPDATE_GOLDEN=1) take precedence over the files loaded at import. */
const recorded = new Map<string, ReplayDoc>();
const golden = (name: string): ReplayDoc | undefined => recorded.get(name) ?? FILES[`./golden/${name}.json`];

interface Scenario {
  name: string;
  cfg: () => MatchConfig;
  players: [Strategy, Strategy];
  /** Both players also place their Fort card on every recharge (SIM_VERSION 5.0.0, A16.14). */
  forts?: boolean;
}

/** A side config with a Fort card per age (A16.14.1). */
function withForts(s: SideConfig, fort: Partial<Record<AgeId, string>>): SideConfig {
  const loadouts = { ...s.loadouts };
  for (const age of Object.keys(loadouts) as AgeId[]) {
    const l = loadouts[age];
    if (l) loadouts[age] = { ...l, fort: fort[age] ?? null };
  }
  return { ...s, loadouts };
}

/**
 * A scripted player that also places its Fort card whenever the slot is ready and affordable: on the
 * first legal pad of a fixed preference (the middle Home pad, then the others, then the Field pads).
 */
function fortPlayer(side: Side, seed: number, strat: Strategy): (obs: Observation) => Command[] {
  const base = scriptedPlayer(fixture, side, seed, strat);
  const order = [2, 1, 3, 0, 4] as const;
  return (obs) => {
    const out = base(obs);
    const f = obs.me.fort;
    if (!f || f.readyTicks > 0 || obs.me.gold < f.cost * 1000) return out;
    const pad = order.find((i) => f.pads[i]?.legal);
    // The fort goes first, so it is paid before the strategy's own spending.
    return pad === undefined ? out : [{ t: 'fort', side, pad }, ...out];
  };
}

const S = STRATEGIES as Record<'balanced' | 'rush' | 'turtle' | 'greedy' | 'heavy', Strategy>;
const side = sideConfig;
const bot = (o: Parameters<typeof sideConfig>[1] = {}) => sideConfig(fixture, { isBot: true, label: 'AI Golden', ...o });

const SCENARIOS: Scenario[] = [
  { name: '01-full-balanced-vs-rush', cfg: () => matchConfig({ seed: 101, format: 'full' }), players: [S.balanced, S.rush] },
  {
    name: '02-full-epics-vs-legendaries',
    cfg: () =>
      matchConfig({
        seed: 202,
        format: 'full',
        sides: [side(fixture, { plan: { epic: true, epicTurret: true } }), bot({ plan: { legendary: true, rareTurret: true } })],
      }),
    players: [S.heavy, S.turtle],
  },
  {
    name: '03-short-alt-powers',
    cfg: () =>
      matchConfig({
        seed: 303,
        format: 'short',
        sides: [side(fixture, { plan: { altPower: true } }), bot({ plan: { altPower: true, epic: true } })],
      }),
    players: [S.greedy, S.balanced],
  },
  {
    name: '04-standard-gold-rush-heavy-metal',
    cfg: () => matchConfig({ seed: 404, format: 'standard', modifiers: ['gold_rush', 'heavy_metal'] }),
    players: [S.heavy, S.turtle],
  },
  {
    name: '05-tutorial-scripted',
    cfg: () =>
      matchConfig({
        seed: 505,
        format: 'tutorial',
        training: {
          noClock: true,
          enemyBaseStartBp: 5000,
          manualLastStand: [false, false],
          stanceEnabled: [false, false],
          trays: { stone: [0], medieval: [0, 1], gunpowder: [0, 1], modern: [0, 1], future: [0, 1] },
          script: [
            { tick: 400, side: 0, unlockSlot: 1 },
            { tick: 800, side: 0, grantGold: 150 },
            { tick: 1600, side: 0, setPowerPpm: { slot: 'home', ppm: 1000000 } },
          ],
        },
      }),
    // a passive Grogg: trains rarely, builds nothing, stays in the Stone Age
    players: [S.rush, { ...S.greedy, weights: [1, 0, 0, 0, 0], turrets: 0, treasury: 0, reserve: 400, every: 40, noEvolve: true }],
  },
  {
    name: '06-full-level7-vs-level3',
    cfg: () => matchConfig({ seed: 606, format: 'full', sides: [side(fixture, { level: 7 }), bot({ level: 3 })] }),
    players: [S.balanced, S.balanced],
  },
  {
    name: '07-short-glass-siege-power',
    cfg: () => matchConfig({ seed: 707, format: 'short', modifiers: ['glass_armies', 'sudden_siege', 'power_hour'] }),
    players: [S.rush, S.heavy],
  },
  { name: '08-standard-rush-mirror', cfg: () => matchConfig({ seed: 808, format: 'standard' }), players: [S.rush, S.rush] },
  {
    name: '09-full-legendary-plans',
    cfg: () =>
      matchConfig({
        seed: 909,
        format: 'full',
        sides: [
          side(fixture, { plan: { legendary: true, epic: true, epicTurret: true, altPower: true }, level: 5 }),
          bot({ plan: { legendary: true, rareTurret: true, epicTurret: true }, level: 5 }),
        ],
      }),
    players: [S.heavy, S.greedy],
  },
  {
    name: '10-short-fast-forward-noisy',
    cfg: () => matchConfig({ seed: 1010, format: 'short', modifiers: ['fast_forward'] }),
    players: [S.heavy, { ...S.turtle, noisy: true }],
  },
  {
    // SIM_VERSION 4.0.0 (A2.9): both slots on both sides; the cap and the screen; the War Path powers:
    // fields (snare, pull, stun), strikes, front barrages, Suppress, Flak and a rally buff.
    name: '11-full-powers',
    cfg: () =>
      matchConfig({
        seed: 1112,
        format: 'full',
        sides: [side(fixture, { plan: { warPath: [5, 7] }, level: 4 }), bot({ plan: { warPath: 9 }, level: 4 })],
      }),
    players: [S.heavy, S.balanced],
  },
  {
    // SIM_VERSION 5.0.0 (A16.14): all four fort kinds, placed on every recharge by both sides, through a
    // Short War to the Final Bell with Sudden Siege: scaffolds, blocking and contact, forts destroyed for
    // a bounty, camps and levies (none in Siege), traps armed, fired and expired, towers, decay and the
    // Siege switch.
    name: '12-forts',
    cfg: () =>
      matchConfig({
        seed: 1212,
        format: 'short',
        modifiers: ['sudden_siege', 'gold_rush', 'fast_forward'],
        sides: [
          withForts(side(fixture, { level: 3 }), { stone: 'war_camp', medieval: 'wolf_pits', gunpowder: 'musket_redoubt' }),
          withForts(bot({ level: 3 }), { stone: 'palisade', medieval: 'longbow_tower', gunpowder: 'militia_muster' }),
        ],
      }),
    players: [S.greedy, S.balanced],
    forts: true,
  },
];

function record(sc: Scenario): ReplayDoc {
  const cfg = sc.cfg();
  const seed = cfg.seed;
  const make = sc.forts ? fortPlayer : (s: Side, sd: number, st: Strategy) => scriptedPlayer(fixture, s, sd, st);
  const { sim } = runMatch(cfg, [make(0, seed, sc.players[0]), make(1, seed + 1, sc.players[1])], {
    maxTicks: 30000,
  });
  if (!sim.state.outcome) throw new Error(`golden scenario ${sc.name} did not end`);
  return buildReplay(sim);
}

interface NodeFs {
  mkdirSync(path: string, o: { recursive: boolean }): void;
  writeFileSync(path: string, data: string): void;
}

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

/** Writes every scenario's replay into ./golden (Node only; the module name is computed so src needs no Node types). */
async function writeGolden(): Promise<void> {
  const fs = (await import(/* @vite-ignore */ ['node', 'fs'].join(':'))) as NodeFs;
  const dir = new URL('./golden/', import.meta.url).pathname;
  fs.mkdirSync(dir, { recursive: true });
  for (const sc of SCENARIOS) {
    const doc = record(sc);
    recorded.set(sc.name, doc);
    fs.writeFileSync(`${dir}${sc.name}.json`, `${JSON.stringify(doc)}\n`);
  }
}

if (env.UPDATE_GOLDEN === '1') await writeGolden();

describe('golden replays (B13)', () => {
  it('has all 12 recorded files', () => {
    expect(SCENARIOS).toHaveLength(12);
    for (const sc of SCENARIOS) expect(golden(sc.name), sc.name).toBeDefined();
  });

  it('12-forts covers the fort rules (A16.14 golden, spec 13)', () => {
    const sc = SCENARIOS.find((x) => x.name === '12-forts');
    if (!sc) throw new Error('no fort scenario');
    const cfg = sc.cfg();
    const { events } = runMatch(cfg, [fortPlayer(0, cfg.seed, sc.players[0]), fortPlayer(1, cfg.seed + 1, sc.players[1])], { maxTicks: 30000, keepEvents: true });
    const kinds = new Set(events.map((e) => e.e));
    for (const k of ['fortPlaced', 'fortBuilt', 'trapArmed', 'trapTriggered', 'trapExpired', 'fortDecayed'] as const) expect(kinds.has(k), k).toBe(true);
    const siege = events.find((e) => e.e === 'phaseChanged' && e.phase === 'siege')?.tick ?? Infinity;
    const fortIds = new Set(events.filter((e): e is SimEvent & { e: 'fortPlaced' } => e.e === 'fortPlaced').map((e) => e.id));
    // Forts destroyed by the enemy (with a bounty), levies sent, and none sent in Siege.
    expect(events.some((e) => e.e === 'died' && fortIds.has(e.id) && e.bountyGold > 0)).toBe(true);
    const levies = events.filter((e) => e.e === 'unitSpawned' && e.from !== undefined);
    expect(levies.length).toBeGreaterThan(0);
    expect(levies.filter((e) => e.tick > siege)).toEqual([]);
  });

  for (const sc of SCENARIOS) {
    it(`${sc.name} re-simulates to its recorded final hash`, () => {
      const doc = golden(sc.name);
      if (!doc) throw new Error(`missing golden ${sc.name}`);
      expect(doc.contentHash).toBe(fixture.hash);
      const check = verifyReplay(doc, fixture);
      expect(check.firstMismatch).toBe(-1);
      expect(check.finalHash).toBe(doc.finalHash);
      expect(check.ok).toBe(true);
    });
  }
});
