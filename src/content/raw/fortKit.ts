/**
 * Builders for the raw Fort tables (DESIGN A16.14.4). Each age file lists its four forts through these,
 * so every table states only what differs per card: id, rarity, source, cost and the trap numbers. HP
 * and a tower's attack come from the age baselines at compile time (`core/forts.ts`), and the shared
 * numbers (pads, scaffold, decay, bounty) live in `economy.fort`. Data only.
 *
 * Sounds are the template ids until F3 records the fort set (A13: `fort_place`, `fort_complete`,
 * `fort_collapse`, `trap_arm`, ...); visuals are `fort.<slug>` (A14.4, placeholders until F3).
 */
import type { StatusApply } from '@/contracts/content';
import type { AgeId } from '@/contracts/ids';
import type { FortSpec } from '@/core/forts';

/**
 * The camp levy timing (A16.14.3): first 2 s after completion, then every 10 s, at most 1 alive (the
 * A16.14.9 camp lever, fixer 2026-10-01: at 8 s and 2 alive a camp beat its age's wall by 16-34 points).
 */
const CAMP = { everyMs: 10000, firstMs: 2000, maxAlive: 1 } as const;
/** Trap timing (A16.14.3): fires within 30 lu, 1 s between charges, armed after 2 s, expires 120 s after arming. */
const TRAP = { triggerLu: 30, betweenMs: 1000, armMs: 2000, lifeMs: 120000 } as const;

/** Prices (A16.14.1): the same in every age. Traps 100 (was 75: the forced trap mirror stalled, fixer 2026-10-01). */
export const FORT_COST = { wall: 125, bunker: 175, trap: 100, camp: 150, tower: 150 } as const;
/** Pop (A16.14.1): walls, towers and camps 6; traps 3. */
export const FORT_POP = { wall: 6, trap: 3, camp: 6, tower: 6 } as const;

const TEMPLATE_SFX = {
  structure: { place: 'turret_build', complete: 'spawn_heavy', die: 'base_hit' },
  trap: { place: 'turret_build', complete: 'spawn_pop', die: 'base_hit' },
} as const;

function base(age: AgeId, id: string): Pick<FortSpec, 'id' | 'age' | 'visualId' | 'nameKey' | 'descKey'> {
  return { id, age, visualId: `fort.${id}`, nameKey: `card.${id}.name`, descKey: `card.${id}.desc` };
}

/**
 * Where a non-starter fort comes from: the Stone set at the unlock, a War Path level with its Road fort-set
 * node, or (X0 variants) a region's side node s1/s2 or its star milestone, each with a Road fallback node.
 */
export type FortFrom =
  | { unlock: true }
  | { warPath: 4 | 6 | 8; road: number }
  | { side: 1 | 2; road: number }
  | { stars: number; road: number };

function source(from: FortFrom): Pick<FortSpec, 'source' | 'warPathLevel' | 'warPathSide' | 'warPathStars' | 'road'> {
  if ('unlock' in from) return { source: 'unlock' };
  if ('side' in from) return { source: 'warPath', warPathSide: from.side, road: from.road };
  if ('stars' in from) return { source: 'warPath', warPathStars: from.stars, road: from.road };
  return { source: 'warPath', warPathLevel: from.warPath, road: from.road };
}

/**
 * A wall (Common, A16.14.3): a starter, or (X0 variants) a cheap, cover or heavy wall from `from` with its
 * own HP (`hpBp` of the Heavy Common). `extra` carries the Bunker's cover or the Hardlight regen.
 */
export function wall(age: AgeId, id: string, extra: Pick<FortSpec, 'cover' | 'regen' | 'hpBp'> & { cost?: number; from?: FortFrom } = {}): FortSpec {
  const out: FortSpec = {
    ...base(age, id),
    rarity: 'common',
    fortKind: 'wall',
    ...(extra.from ? source(extra.from) : { source: 'starter' as const }),
    cost: extra.cost ?? FORT_COST.wall,
    pop: FORT_POP.wall,
    sfx: { ...TEMPLATE_SFX.structure },
  };
  if (extra.cover) out.cover = { ...extra.cover };
  if (extra.regen) out.regen = { ...extra.regen };
  if (extra.hpBp !== undefined) out.hpBp = extra.hpBp;
  return out;
}

/** A field tower (Epic): its attack is the age's Ranged Common × 1.5 (compile time), changed by `mods` for an X0 variant. */
export function tower(age: AgeId, id: string, from: FortFrom, mods?: FortSpec['towerMods']): FortSpec {
  const out: FortSpec = { ...base(age, id), rarity: 'epic', fortKind: 'tower', ...source(from), cost: FORT_COST.tower, pop: FORT_POP.tower, sfx: { ...TEMPLATE_SFX.structure } };
  if (mods) out.towerMods = { ...mods };
  return out;
}

/**
 * A camp (Rare) and the id of its levy (a hidden unit built from the age's Infantry Common). X0 variants
 * (`v`): a ranged or brute camp builds its levy from that group's Common (`levyFrom`) with its own timing.
 */
export function camp(
  age: AgeId,
  id: string,
  levy: string,
  from: FortFrom,
  v?: { levyFrom: NonNullable<FortSpec['levyFrom']>; everyMs?: number; maxAlive?: number },
): FortSpec {
  const out: FortSpec = {
    ...base(age, id),
    rarity: 'rare',
    fortKind: 'camp',
    ...source(from),
    cost: FORT_COST.camp,
    pop: FORT_POP.camp,
    camp: { levy, ...CAMP, ...(v?.everyMs !== undefined ? { everyMs: v.everyMs } : {}), ...(v?.maxAlive !== undefined ? { maxAlive: v.maxAlive } : {}) },
    sfx: { ...TEMPLATE_SFX.structure },
  };
  if (v) out.levyFrom = { ...v.levyFrom };
  return out;
}

/**
 * A trap (Rare): `charges` × `damage` to the primary; `radius` 0 = single target, else the A2.6 area rule
 * (at most 4 targets, secondaries 50%). `statuses`: slows only (≤ 60% for ≤ 3 s, never a stun, snare, pull or knockback).
 */
export function trap(age: AgeId, id: string, from: FortFrom, t: { charges: number; damage: number; radius?: number; statuses?: StatusApply[] }): FortSpec {
  const radius = t.radius ?? 0;
  return {
    ...base(age, id),
    rarity: 'rare',
    fortKind: 'trap',
    ...source(from),
    cost: FORT_COST.trap,
    pop: FORT_POP.trap,
    trap: {
      charges: t.charges,
      ...TRAP,
      damage: t.damage,
      radius,
      maxTargets: radius > 0 ? 4 : 1,
      statuses: (t.statuses ?? []).map((s) => ({ ...s })),
    },
    sfx: { ...TEMPLATE_SFX.trap },
  };
}

/** A slow status (the only control a trap may apply, A16.14.3). */
export function slow(magnitudeBp: number, durationMs: number): StatusApply {
  return { kind: 'slow', magnitudeBp, durationMs };
}
