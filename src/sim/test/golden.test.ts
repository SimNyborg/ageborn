/**
 * Golden replays (DESIGN B13): 10 recorded matches on the frozen fixture content with known final
 * hashes. Any change to the simulation's behaviour changes a hash and fails this test on purpose.
 *
 * Re-record after an intended rule change (and bump SIM_VERSION in replay.ts):
 *   UPDATE_GOLDEN=1 npx vitest run src/sim/test/golden.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { MatchConfig, ReplayDoc } from '@/contracts';
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
            { tick: 1600, side: 0, setPowerPpm: 1000000 },
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
];

function record(sc: Scenario): ReplayDoc {
  const cfg = sc.cfg();
  const seed = cfg.seed;
  const { sim } = runMatch(cfg, [scriptedPlayer(fixture, 0, seed, sc.players[0]), scriptedPlayer(fixture, 1, seed + 1, sc.players[1])], {
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
  it('has all 10 recorded files', () => {
    expect(SCENARIOS).toHaveLength(10);
    for (const sc of SCENARIOS) expect(golden(sc.name), sc.name).toBeDefined();
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
