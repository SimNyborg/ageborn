/**
 * Golden replays (DESIGN B13): 17 recorded matches on the frozen fixture content with known final
 * hashes. Any change to the simulation's behaviour changes a hash and fails this test on purpose.
 * 15-last-base plays Last Base Standing (A2.10.1) on the fixture plus a `last` format (`fixtureLast`,
 * its own content hash); SIM_VERSION 6.0.0 re-recorded 01-14 with identical hashes. SIM_VERSION 8.0.0 (A2.7
 * Ranks: the frozen fixture gained `economy.formation`) re-recorded all 17 deliberately (see replay.ts for
 * which hashes changed); 13 moved to a seed that still reaches the contact cap.
 *
 * Re-record after an intended rule change (and bump SIM_VERSION in replay.ts):
 *   UPDATE_GOLDEN=1 npx vitest run src/sim/test/golden.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, Command, CompiledContent, MatchConfig, Observation, ReplayDoc, Side, SideConfig, SimEvent } from '@/contracts';
import { simCtx } from '../debug';
import { buildReplay, verifyReplay } from '../replay';
import { STRATEGIES, baselineLoadout, fixture, fixtureBronze, fixtureLast, fixtureX0, matchConfig, runMatch, scriptedPlayer, sideConfig, type Strategy } from './helpers';

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
  /** Fort directors (SIM_VERSION 5.1.0): eager placement on unsafe pads, saving, and Suppress casts. */
  director?: [DirectorOpts, DirectorOpts];
  /** The content it plays on (default: the frozen fixture). */
  content?: CompiledContent;
}

interface DirectorOpts {
  /** Places on a legal pad the enemy reaches before completion first (a scaffold built into a wave). */
  eager?: boolean;
  /** Casts its Field power (Suppress) whenever an enemy tower stands. */
  caster?: boolean;
}

/**
 * A fort director (the 13- and 14- fort goldens): a scripted player that saves for its Fort card (and,
 * as a caster, for its Field power) instead of spending everything, places the fort the moment it is
 * ready (eager: on an unsafe legal pad first), and casts Suppress while an enemy tower stands.
 */
function directorPlayer(side: Side, seed: number, strat: Strategy, o: DirectorOpts): (obs: Observation) => Command[] {
  const base = scriptedPlayer(fixture, side, seed, strat);
  const order = o.eager ? ([2, 1, 0] as const) : ([2, 1, 3, 0, 4] as const);
  return (obs) => {
    const f = obs.me.fort;
    const foeTower = obs.units.some((u) => u.side !== side && u.fort === 'tower');
    const saving = (f && f.readyTicks < 100 && obs.me.gold < f.cost * 1000) || (o.caster && foeTower && obs.me.gold < 150000);
    const all = base(obs);
    const out = saving ? all.filter((c) => c.t !== 'train' && c.t !== 'buildTurret' && c.t !== 'research') : all;
    if (o.caster && obs.tick % 10 === 0 && foeTower) out.unshift({ t: 'power', side, slot: 'field' });
    if (!f || f.readyTicks > 0 || obs.me.gold < f.cost * 1000) return out;
    const pad = o.eager ? (order.find((i) => f.pads[i]?.legal && !f.pads[i]?.safe) ?? order.find((i) => f.pads[i]?.legal)) : order.find((i) => f.pads[i]?.legal);
    return pad === undefined ? out : [{ t: 'fort', side, pad }, ...out];
  };
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
  {
    // SIM_VERSION 5.1.0 (A16.14 cases, review 2026-10-01): a rushing army that casts Suppress (Undermine)
    // on the enemy's towers against a Heavy army that builds towers and walls: towers silenced, a blocked
    // blob held to the contact cap, a decayed fort credited to its last attacker and another credited to
    // nobody, and the Siege decay switch. Seed 1325 since SIM_VERSION 8.0.0 (1313 before): with the ranks the
    // blob on the old seed never reached the contact cap.
    name: '13-forts-cases',
    cfg: () =>
      matchConfig({
        seed: 1325,
        format: 'short',
        modifiers: ['gold_rush', 'fast_forward'],
        sides: [
          withForts(side(fixture, { level: 4, plan: { power: 'undermine' } }), { stone: 'palisade', medieval: 'shield_barricade', gunpowder: 'gabion_wall' }),
          withForts(bot({ level: 4 }), { stone: 'sling_perch', medieval: 'longbow_tower', gunpowder: 'gabion_wall' }),
        ],
      }),
    players: [S.rush, S.heavy],
    director: [{ eager: true, caster: true }, { eager: true }],
  },
  {
    // SIM_VERSION 5.1.0: the same directors with Sudden Siege: a scaffold destroyed before it completes
    // (built into a wave), Heavies breaking forts, decay and the Siege switch.
    name: '14-forts-scaffold',
    cfg: () =>
      matchConfig({
        seed: 1311,
        format: 'short',
        modifiers: ['sudden_siege', 'gold_rush', 'fast_forward'],
        sides: [
          withForts(side(fixture, { level: 4, plan: { power: 'undermine' } }), { stone: 'palisade', medieval: 'shield_barricade', gunpowder: 'gabion_wall' }),
          withForts(bot({ level: 4 }), { stone: 'sling_perch', medieval: 'longbow_tower', gunpowder: 'gabion_wall' }),
        ],
      }),
    players: [S.heavy, S.heavy],
    director: [{ eager: true, caster: true }, { eager: true }],
  },
  {
    // SIM_VERSION 6.0.0 (A2.10.1 Last Base Standing): a Hold-at-home turtle against a Charge rush with no
    // Final Bell: every Siege step, base and turret damage by step, the Crumble rope on the side whose half
    // holds the fight (the turtle alone), Crumble II, and the war ends when a base falls.
    name: '15-last-base',
    content: fixtureLast,
    cfg: () =>
      matchConfig({
        seed: 1502,
        format: 'last',
        content: fixtureLast,
        sides: [sideConfig(fixtureLast), sideConfig(fixtureLast, { isBot: true, label: 'AI Golden' })],
      }),
    players: [S.turtle, S.rush],
  },
  {
    // SIM_VERSION 7.0.0 (X0): a Stone-only war on the X0 fixture: squads (Hunting Wolves), a frenzy unit
    // (Pelt Rager), a summoner (Beast Caller and its Cave Pups), the Cave Bear's dizzy roar and the whole-
    // lane Pebble Hail cast by both sides.
    name: '16-squad-summon-lane',
    content: fixtureX0,
    cfg: () => {
      const lo = baselineLoadout(fixtureX0, 'stone');
      const stone = (units: (string | null)[]) => ({ ...lo, units, powers: { home: lo.powers.home, field: 'pebble_hail' } });
      return matchConfig({
        seed: 1601,
        format: 'short',
        content: fixtureX0,
        sides: [
          sideConfig(fixtureX0, { loadouts: { stone: stone(['hunting_wolves', 'pebbler', 'cave_bear', 'spear_hunter', 'beast_caller', null]) } }),
          sideConfig(fixtureX0, { isBot: true, label: 'AI Golden', loadouts: { stone: stone(['hunting_wolves', 'pebbler', 'tuskback', 'pelt_rager', 'beast_caller', null]) } }),
        ],
      });
    },
    // Stone only (no evolve): side 0 trains the Cave Bear and the Beast Caller, side 1 the wolves and the Pelt Rager.
    players: [
      { ...S.balanced, weights: [0, 0, 1, 0, 1], noEvolve: true },
      { ...S.rush, weights: [2, 0, 0, 2, 0], noEvolve: true },
    ],
  },
  {
    // SIM_VERSION 7.1.0 (Bronze wave): a Stone-only war on the Bronze wave fixture: a Dread aura (Tragic
    // Chorus), an ally speed aura (Aulos Piper), siegeOnly with riders (Wooden Horse), a first-hit frenzy
    // brawler (Minotaur) and the whole-lane Sandstorm signal cast by both sides.
    name: '17-dread-speed-siege-riders',
    content: fixtureBronze,
    cfg: () => {
      const lo = baselineLoadout(fixtureBronze, 'stone');
      const stone = (units: (string | null)[]) => ({ ...lo, units, powers: { home: lo.powers.home, field: 'sandstorm' } });
      return matchConfig({
        seed: 1701,
        format: 'short',
        content: fixtureBronze,
        sides: [
          sideConfig(fixtureBronze, { loadouts: { stone: stone(['bonker', 'pebbler', 'tragic_chorus', 'spear_hunter', 'wooden_horse', null]) } }),
          sideConfig(fixtureBronze, { isBot: true, label: 'AI Golden', loadouts: { stone: stone(['bonker', 'pebbler', 'minotaur', 'aulos_piper', 'tuskback', null]) } }),
        ],
      });
    },
    players: [
      // Stone only, no research, one turret, a 3 s cadence so the 200-gold Epics get bought too.
      { ...S.balanced, weights: [1, 0, 1, 0, 6], noEvolve: true, research: [], turrets: 1, powerAsap: false, every: 60 },
      { ...S.rush, weights: [1, 0, 6, 1, 0], noEvolve: true, research: [], turrets: 1, powerAsap: false, every: 60 },
    ],
  },
];

/** The players of a scenario (scripted, fort placers or fort directors). */
function playersOf(sc: Scenario, seed: number): [(obs: Observation) => Command[], (obs: Observation) => Command[]] {
  if (sc.director) return [directorPlayer(0, seed, sc.players[0], sc.director[0]), directorPlayer(1, seed + 1, sc.players[1], sc.director[1])];
  const make = sc.forts ? fortPlayer : (s: Side, sd: number, st: Strategy) => scriptedPlayer(sc.content ?? fixture, s, sd, st);
  return [make(0, seed, sc.players[0]), make(1, seed + 1, sc.players[1])];
}

function record(sc: Scenario): ReplayDoc {
  const cfg = sc.cfg();
  const { sim } = runMatch(cfg, playersOf(sc, cfg.seed), {
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
  it('has all 17 recorded files', () => {
    expect(SCENARIOS).toHaveLength(17);
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

  it('12-, 13- and 14-forts together cover every listed fort case (DESIGN A16.14.8 golden, review 2026-10-01)', () => {
    const have = { creditedDecay: false, uncreditedDecay: false, towerSilenced: false, heavyBreaksFort: false, scaffoldDestroyed: false, contactCapped: false, siegeSwitch: false };
    for (const name of ['12-forts', '13-forts-cases', '14-forts-scaffold']) {
      const sc = SCENARIOS.find((x) => x.name === name);
      if (!sc) throw new Error(`no scenario ${name}`);
      const cfg = sc.cfg();
      const fortIds = new Set<number>();
      const built = new Set<number>();
      let siegeTick = -1;
      runMatch(cfg, playersOf(sc, cfg.seed), {
        maxTicks: 30000,
        onTick: (sim, ev) => {
          for (const e of ev) {
            if (e.e === 'fortPlaced') fortIds.add(e.id);
            else if (e.e === 'fortBuilt') built.add(e.id);
            else if (e.e === 'fortDecayed') have[e.creditedTo !== undefined ? 'creditedDecay' : 'uncreditedDecay'] = true;
            else if (e.e === 'towerSilenced') have.towerSilenced = true;
            else if (e.e === 'phaseChanged' && e.phase === 'siege') siegeTick = e.tick;
            else if (e.e === 'died' && fortIds.has(e.id)) {
              if (!built.has(e.id) && e.killerKind !== 'decay') have.scaffoldDestroyed = true;
              if (e.killerCard && fixture.units[e.killerCard]?.group === 'heavy') have.heavyBreaksFort = true;
            }
          }
          const ctx = simCtx(sim);
          const per = new Map<number, number>();
          for (const f of ctx.contact.values()) per.set(f, (per.get(f) ?? 0) + 1);
          for (const n of per.values()) if (n >= (ctx.econ.fort?.contactMax ?? 5)) have.contactCapped = true;
          if (siegeTick >= 0 && sim.state.tick > siegeTick + 20) for (const u of ctx.s.units) if (u.fort?.done && u.hp > 0 && u.fort.decayFromTick === siegeTick) have.siegeSwitch = true;
        },
      });
    }
    expect(have).toEqual({ creditedDecay: true, uncreditedDecay: true, towerSilenced: true, heavyBreaksFort: true, scaffoldDestroyed: true, contactCapped: true, siegeSwitch: true });
  });

  it('15-last-base covers Last Base Standing (A2.10.1): every step, the rope on one side, an end with no Bell', () => {
    const sc = SCENARIOS.find((x) => x.name === '15-last-base');
    if (!sc) throw new Error('no Last Base Standing scenario');
    const cfg = sc.cfg();
    const { sim, events } = runMatch(cfg, playersOf(sc, cfg.seed), { maxTicks: 30000, keepEvents: true });
    expect(events.filter((e) => e.e === 'escalated').map((e) => (e as { step: number }).step)).toEqual([1, 2, 3, 4, 5]);
    const crumbled = events.filter((e): e is SimEvent & { e: 'crumbled' } => e.e === 'crumbled');
    expect(crumbled.length).toBeGreaterThan(0);
    expect(crumbled.some((e) => e.side === 0)).toBe(true);
    expect(sim.state.outcome?.reason).toBe('baseDestroyed');
    expect(events.some((e) => e.e === 'phaseChanged' && e.phase === 'siege')).toBe(true);
  });

  it('16-squad-summon-lane covers the X0 kinds: squad spawns, summons, a dizzy roar and lane casts on both sides', () => {
    const sc = SCENARIOS.find((x) => x.name === '16-squad-summon-lane');
    if (!sc) throw new Error('no X0 scenario');
    const cfg = sc.cfg();
    const { events } = runMatch(cfg, playersOf(sc, cfg.seed), { maxTicks: 30000, keepEvents: true });
    const spawns = events.filter((e): e is SimEvent & { e: 'unitSpawned' } => e.e === 'unitSpawned');
    const wolves = spawns.filter((e) => e.card === 'hunting_wolves');
    expect(wolves.length).toBeGreaterThanOrEqual(2);
    expect(wolves.some((w, i) => wolves.some((x, j) => j !== i && x.tick === w.tick))).toBe(true);
    expect(spawns.some((e) => e.card === 'cave_pup' && e.summoner !== undefined && e.side === 0)).toBe(true);
    expect(spawns.some((e) => e.card === 'pelt_rager')).toBe(true);
    expect(events.some((e) => e.e === 'abilityUsed' && e.ability === 'timeStop')).toBe(true);
    const lane = events.filter((e): e is SimEvent & { e: 'powerTelegraph' } => e.e === 'powerTelegraph' && e.power === 'pebble_hail');
    expect(new Set(lane.map((e) => e.side)).size).toBe(2);
  });

  it('17-dread-speed-siege-riders covers the Bronze wave kinds: dread slows, the speed aura, the horse, the Minotaur and Sandstorm', () => {
    const sc = SCENARIOS.find((x) => x.name === '17-dread-speed-siege-riders');
    if (!sc) throw new Error('no Bronze wave scenario');
    const cfg = sc.cfg();
    const { events } = runMatch(cfg, playersOf(sc, cfg.seed), { maxTicks: 30000, keepEvents: true });
    const spawns = events.filter((e): e is SimEvent & { e: 'unitSpawned' } => e.e === 'unitSpawned');
    for (const card of ['tragic_chorus', 'wooden_horse', 'minotaur', 'aulos_piper']) expect(spawns.some((e) => e.card === card), card).toBe(true);
    const chorus = new Set(spawns.filter((e) => e.card === 'tragic_chorus').map((e) => e.id));
    expect(chorus.size).toBeGreaterThan(0);
    expect(events.some((e) => e.e === 'statusApplied' && e.kind === 'slow')).toBe(true);
    const lane = events.filter((e): e is SimEvent & { e: 'powerTelegraph' } => e.e === 'powerTelegraph' && e.power === 'sandstorm');
    expect(new Set(lane.map((e) => e.side)).size).toBe(2);
  });

  for (const sc of SCENARIOS) {
    it(`${sc.name} re-simulates to its recorded final hash`, () => {
      const doc = golden(sc.name);
      if (!doc) throw new Error(`missing golden ${sc.name}`);
      const content = sc.content ?? fixture;
      expect(doc.contentHash).toBe(content.hash);
      const check = verifyReplay(doc, content);
      expect(check.firstMismatch).toBe(-1);
      expect(check.finalHash).toBe(doc.finalHash);
      expect(check.ok).toBe(true);
    });
  }
});
