/**
 * Test helpers for the AI: real content (WP1), real sim (WP2), match configs and synthetic
 * observations. Test files may import the sim and content (they are exempt from the layer rules).
 */
import type {
  AgeId,
  BotProfile,
  CardId,
  CompiledContent,
  FormatId,
  Loadout,
  MatchConfig,
  Observation,
  Side,
  SideConfig,
  TrainingEvent,
} from '@/contracts';
import { content as realContent } from '@/content';
import { createSim } from '@/sim';
import { botProfile, createBot, runHeadless, BALANCED_BRAIN_ID, type HeadlessResult } from '@/ai';

export const content: CompiledContent = realContent;
export const AGES: readonly AgeId[] = realContent.order.ages;

/** The age's starter power of a slot (A2.9.8). */
export function starterPower(c: CompiledContent, age: AgeId, slot: 'home' | 'field'): CardId | null {
  return Object.values(c.powers).find((p) => p.age === age && p.slot === slot && p.source === 'starter')?.id ?? null;
}

/** The A2.14 baseline plan of an age: the 3 Commons, the AA Rare, the Support Rare, both Common turrets, both starter powers. */
export function baselineLoadout(c: CompiledContent, age: AgeId): Loadout {
  const units = Object.values(c.units).filter((u) => u.age === age && !u.hidden);
  const pick = (group: string, rarity?: string): CardId | null => units.find((u) => u.group === group && (!rarity || u.rarity === rarity))?.id ?? null;
  const turrets = Object.values(c.turrets).filter((t) => t.age === age && t.rarity === 'common');
  return {
    units: [pick('infantry', 'common'), pick('ranged', 'common'), pick('heavy', 'common'), pick('antiArmor'), pick('support')],
    turrets: [turrets[0]?.id ?? null, turrets[1]?.id ?? null],
    powers: { home: starterPower(c, age, 'home'), field: starterPower(c, age, 'field') },
  };
}

export function sideConfig(c: CompiledContent, o: { level?: number; loadouts?: Partial<Record<AgeId, Loadout>>; label?: string } = {}): SideConfig {
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(c.units), ...Object.keys(c.turrets)]) levels[id] = o.level ?? 1;
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of AGES) loadouts[age] = o.loadouts?.[age] ?? baselineLoadout(c, age);
  return { label: o.label ?? 'AI Test', isBot: true, loadouts, levels, skins: {} };
}

export function matchConfig(o: { seed: number; format?: FormatId; sides?: [SideConfig, SideConfig]; modifiers?: string[]; training?: MatchConfig['training'] }): MatchConfig {
  return {
    seed: o.seed,
    format: o.format ?? 'short',
    content,
    sides: o.sides ?? [sideConfig(content), sideConfig(content)],
    ...(o.modifiers ? { modifiers: o.modifiers } : {}),
    ...(o.training ? { training: o.training } : {}),
  };
}

/** Runs a bot-vs-bot match on the real sim. */
export function botMatch(cfg: MatchConfig, profiles: [BotProfile, BotProfile], maxTicks?: number): HeadlessResult {
  const sim = createSim(cfg);
  const seats = profiles.map((p, side) => ({ side: side as Side, controller: createBot(p, side as Side, cfg.seed, cfg.content) }));
  return runHeadless(sim, seats, maxTicks === undefined ? {} : { maxTicks });
}

/** The Balanced brain at a tier. */
export function balanced(tier: number): BotProfile {
  return botProfile(content, { generalId: BALANCED_BRAIN_ID, tier });
}

/** A training event helper (tutorial-style configs). */
export function grant(tick: number, side: Side, gold: number): TrainingEvent {
  return { tick, side, grantGold: gold };
}

/** A synthetic observation for brain and controller unit tests. Money in milli-gold, p in milli-lu. */
export function observation(o: {
  tick?: number;
  side?: Side;
  phase?: Observation['phase'];
  gold?: number;
  xpBp?: number;
  ageIndex?: number;
  queue?: CardId[];
  pop?: number;
  treasury?: number;
  mountsOwned?: number;
  turrets?: Observation['me']['turrets'];
  /** Reload of `power`'s slot (the other slot is empty unless `powers` is given). */
  powerPpm?: number;
  /** Effective cost of `power` (default 100). */
  powerCost?: number;
  powers?: Observation['me']['powers'];
  stance?: 'charge' | 'hold' | 'fallback';
  /** The Hold flag, whole lu (A18.4.2; default 320). */
  holdP?: number;
  research?: Observation['me']['research'];
  baseHpBp?: number;
  lastStand?: Observation['me']['lastStand'];
  tray?: (CardId | null)[];
  turretCards?: (CardId | null)[];
  power?: CardId;
  foe?: Partial<Observation['foe']>;
  units?: Observation['units'];
  telegraphs?: Observation['telegraphs'];
}): Observation {
  const stone = baselineLoadout(content, 'stone');
  // A2.9.1: `power` sits in its own slot with `powerPpm`; the other slot is empty.
  const card = o.power ?? stone.powers.home ?? 'rockslide';
  const def = content.powers[card];
  const seen = { card, ppm: o.powerPpm ?? 0, cost: o.powerCost ?? def?.cost ?? 100, reloadMs: def?.reloadMs ?? 40000, rateBp: 10000 };
  const powers: Observation['me']['powers'] = o.powers ?? (def?.slot === 'field' ? { home: null, field: seen } : { home: seen, field: null });
  return {
    tick: o.tick ?? 100,
    side: o.side ?? 1,
    phase: o.phase ?? 'regulation',
    ages: ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future'],
    me: {
      gold: o.gold ?? 0,
      xpBp: o.xpBp ?? 0,
      ageIndex: o.ageIndex ?? 0,
      queue: o.queue ?? [],
      pop: o.pop ?? 0,
      treasury: o.treasury ?? 0,
      mountsOwned: o.mountsOwned ?? 1,
      turrets: o.turrets ?? [null, null, null, null],
      powers,
      powerLockoutUntil: 0,
      stance: o.stance ?? 'charge',
      holdP: o.holdP ?? 320,
      research: o.research ?? { owned: [], current: null, progressBp: 0, ranksOpen: 1 },
      baseHpBp: o.baseHpBp ?? 10000,
      lastStand: o.lastStand ?? 'locked',
      tray: o.tray ?? [...stone.units],
      turretCards: o.turretCards ?? [...stone.turrets],
    },
    foe: {
      ageIndex: 0,
      xpBp: 0,
      powers: { home: { card: null, ppm: 0 }, field: { card: null, ppm: 0 } },
      turrets: [null, null, null, null],
      baseHpBp: 10000,
      stance: 'charge',
      holdP: 320,
      research: { owned: [], current: null, progressBp: 0, ranksOpen: 1 },
      treasury: 0,
      lastStand: 'locked',
      scouted: [],
      ...o.foe,
    },
    telegraphs: o.telegraphs ?? [],
    units: o.units ?? [],
  };
}

let nextUnitId = 1000;
/** An observed unit at own-side progress `pLu` (whole lu) of the observer. */
export function unit(side: Side, card: CardId, pLu: number, o: { hp?: number; air?: boolean; id?: number } = {}): Observation['units'][number] {
  nextUnitId += 1;
  return { id: o.id ?? nextUnitId, side, card, level: 1, p: pLu * 1000, hp: o.hp ?? 10000, maxHp: 10000, shield: 0, air: o.air ?? false, summoned: false };
}
