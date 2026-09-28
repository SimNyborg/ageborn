/**
 * Long bot-vs-bot runs for the WP3 Definition of Done (DESIGN C2/WP3, B13):
 *
 * - fuzz: no illegal command in 500 matches;
 * - tier ordering: X beats I ≥ 90%, VII beats III ≥ 75%, I beats 0 ≥ 65% (400 matches each).
 *
 * `npm test` runs a quick sample so the suite stays fast; `AI_FULL=1` runs the DoD sizes. The quick
 * sample checks that the observed rate is not significantly below the target (rate ≥ target − 2 SE);
 * the full run checks the target itself. Seeds are fixed, so every run is reproducible.
 */
import type { AgeId, FormatId, Loadout, MatchConfig, Side, SideConfig } from '@/contracts';
import { pick, randInt, seedSfc32, type Sfc32State } from '@/core';
import { BALANCED_BRAIN_ID, botProfile } from '@/ai';
import { AGES, botMatch, content, matchConfig, sideConfig } from './helpers';

const env = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env ?? {};

/** True when the DoD-sized runs were asked for. */
export const FULL = env.AI_FULL === '1';

export function sampleSize(quick: number, full: number): number {
  const override = Number(env.AI_MATCHES);
  if (Number.isInteger(override) && override > 0) return override;
  return FULL ? full : quick;
}

/** The bar a sample of `n` must clear: the target itself in full runs, target − 2 SE in quick ones. */
export function winBar(targetBp: number, n: number): number {
  if (FULL) return targetBp;
  const p = targetBp / 10000;
  const se = Math.sqrt((p * (1 - p)) / n);
  return Math.floor((p - 2 * se) * 10000);
}

export interface TierResult {
  n: number;
  winsA: number;
  winsB: number;
  draws: number;
  /** Win rate of tier A in bp. */
  rateBp: number;
  rejected: number;
}

/**
 * Tier A vs tier B, both the Balanced brain with the same baseline plan (A2.14) at level 1, on Full
 * War (the A2.14 reference format, all eight ages), with mirrored seeds: each seed is played twice, tier
 * A once on each side, so neither the side's first-mover edge nor a lucky seed counts for one tier.
 */
export function tierMatches(tierA: number, tierB: number, n: number, format: FormatId = 'full'): TierResult {
  let winsA = 0;
  let winsB = 0;
  let draws = 0;
  let rejected = 0;
  for (let i = 0; i < n; i += 1) {
    const aSide = (i % 2) as Side;
    const cfg = matchConfig({ seed: 1000 + Math.floor(i / 2), format });
    const tier = (side: Side) => (side === aSide ? tierA : tierB);
    const r = botMatch(cfg, [botProfile(content, { generalId: BALANCED_BRAIN_ID, tier: tier(0) }), botProfile(content, { generalId: BALANCED_BRAIN_ID, tier: tier(1) })]);
    rejected += r.rejected.length;
    const w = r.outcome?.winner;
    if (w === aSide) winsA += 1;
    else if (w === null || w === undefined) draws += 1;
    else winsB += 1;
  }
  return { n, winsA, winsB, draws, rateBp: Math.floor((winsA * 10000) / n), rejected };
}

const GENERALS = ['pip', 'kettle', 'moss', 'ledger', 'boomsworth', 'twins', 'rook', 'tempest', 'warden', 'echo'];
const FORMATS: FormatId[] = ['short', 'standard', 'full'];
const MODIFIERS = ['gold_rush', 'glass_armies', 'power_hour', 'fast_forward', 'heavy_metal', 'sudden_siege'];

function randomPlan(rng: Sfc32State): Record<AgeId, Loadout> {
  const out = {} as Record<AgeId, Loadout>;
  for (const age of AGES) {
    const pool = Object.values(content.units).filter((u) => u.age === age && !u.hidden);
    const units: (string | null)[] = [];
    let legendary = false;
    while (units.length < 5 && pool.length > 0) {
      const u = pool.splice(randInt(rng, pool.length), 1)[0];
      if (!u || (u.rarity === 'legendary' && legendary)) continue;
      legendary ||= u.rarity === 'legendary';
      units.push(u.id);
    }
    while (units.length < 5) units.push(null);
    // Sometimes leave slots empty: the bot must cope with thin trays.
    if (randInt(rng, 4) === 0) units[randInt(rng, 5)] = null;
    const turrets = Object.values(content.turrets).filter((t) => t.age === age);
    const t1 = turrets.splice(randInt(rng, turrets.length), 1)[0];
    const t2 = randInt(rng, 5) === 0 ? null : turrets[randInt(rng, turrets.length)];
    const powers = Object.values(content.powers).filter((p) => p.age === age);
    out[age] = { units, turrets: [t1?.id ?? null, t2?.id ?? null], power: pick(rng, powers).id };
  }
  return out;
}

export interface FuzzCase {
  cfg: MatchConfig;
  generals: [string, string];
  tiers: [number, number];
  bonus: [number, number];
}

/** A random but reproducible match: Generals, tiers 0-X, plans, levels 1-10, formats and modifiers. */
export function fuzzCase(i: number): FuzzCase {
  const rng = seedSfc32(`ai-fuzz:${i}`);
  const warPlans = (content.generals as { list: Record<string, { warPlan: Record<AgeId, Loadout> | null }> }).list;
  const generals = [pick(rng, GENERALS), pick(rng, GENERALS)] as [string, string];
  const sides = generals.map((g) => {
    const own = warPlans[g]?.warPlan;
    const plan = own && randInt(rng, 2) === 0 ? own : randomPlan(rng);
    const base: SideConfig = sideConfig(content, { loadouts: plan });
    for (const id of Object.keys(base.levels)) base.levels[id] = 1 + randInt(rng, 10);
    return base;
  }) as [SideConfig, SideConfig];
  const cfg = matchConfig({
    seed: i,
    format: pick(rng, FORMATS),
    sides,
    ...(randInt(rng, 3) === 0 ? { modifiers: [pick(rng, MODIFIERS)] } : {}),
  });
  return {
    cfg,
    generals,
    tiers: [randInt(rng, 11), randInt(rng, 11)],
    bonus: [randInt(rng, 3) === 0 ? 2000 : 0, 0],
  };
}

export interface FuzzResult {
  matches: number;
  commands: number;
  rejected: { match: number; side: Side; t: string; reason: string; tick: number }[];
}

/** Runs fuzz cases [from, to). */
export function fuzzMatches(from: number, to: number): FuzzResult {
  const out: FuzzResult = { matches: 0, commands: 0, rejected: [] };
  for (let i = from; i < to; i += 1) {
    const c = fuzzCase(i);
    const profiles = [0, 1].map((s) =>
      botProfile(content, { generalId: c.generals[s] as string, tier: c.tiers[s] as number, mistakeBonusBp: c.bonus[s] as number }),
    ) as [ReturnType<typeof botProfile>, ReturnType<typeof botProfile>];
    const r = botMatch(c.cfg, profiles);
    out.matches += 1;
    out.commands += r.commands.length;
    for (const e of r.rejected) out.rejected.push({ match: i, side: e.side, t: e.t, reason: e.reason, tick: e.tick });
  }
  return out;
}
