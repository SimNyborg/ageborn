/**
 * Capsule bench cases (WP10 DoD): every tier and start tier, fixed tiers, a first-time and a repeat
 * Legendary, a NEW Epic, each foil, Dust conversion, a bonus skin, the onboarding script, a
 * 10-capsule "Open all", and the Wardrobe reel (with the flag on and off).
 *
 * The reveals are hand-built from real content ids with the A6.4 tier shapes (stacks, copies,
 * guarantees); they are presentation fixtures, not rolls. Pure, so `cases.test.ts` checks them.
 */
import type {
  CapsuleReveal,
  CapsuleStack,
  CapsuleTier,
  CardId,
  Foil,
  PendingCapsule,
  Rarity,
  SaveDoc,
  SkinId,
  SkinRarity,
  WardrobeReveal,
} from '@/contracts';
import { mulberry32 } from '@/core';
import { asContent, content } from '@/content';
// Pure capsule modules only, so the bench cases load in Node tests without Pixi or CSS.
import { progressFromCollections } from '@/capsule/summaryModel';
import { climbCount, strikePattern, TIER_ORDER } from '@/capsule/tiers';
import type { ProgressLookup } from '@/capsule/types';

const C = asContent(content);

export interface BenchCase {
  id: string;
  group: string;
  title: string;
  reveals?: CapsuleReveal[];
  crate?: WardrobeReveal;
  reelReveal?: boolean;
  progress?: ProgressLookup;
  pity?: SaveDoc['pity'];
}

const POOL: Record<Rarity, CardId[]> = { common: [], rare: [], epic: [], legendary: [] };
for (const u of Object.values(C.units)) if (u.id !== 'training_dummy') POOL[u.rarity].push(u.id);
for (const t of Object.values(C.turrets)) POOL[t.rarity].push(t.id);

/** Cards the bench profile already owns (the rest reveal as NEW). */
const OWNED = new Set<CardId>([
  'bonker', 'pebbler', 'tuskback', 'rock_tosser', 'angry_beehive', 'spear_hunter', 'drum_shaman', 'footman',
  'longbowman', 'crossbow_nest', 'pikeman', 'log_roller', 'corsair', 'fusilier', 'rifleman', 'mg_nest', 'friar',
  'battering_ram', 'ursa_paladin', 'trebuchet',
]);

const PITY: SaveDoc['pity'] = { sinceEpic: 4, sinceLegendary: 17, sinceNewCard: 2, opened: 31, wardrobeSinceEpic: 3, wardrobeSinceLegendary: 11 };

function nextPity(p: SaveDoc['pity'], stacks: CapsuleStack[]): SaveDoc['pity'] {
  const has = (r: Rarity) => stacks.some((s) => s.rarity === r);
  return {
    ...p,
    opened: p.opened + 1,
    sinceEpic: has('epic') || has('legendary') ? 0 : p.sinceEpic + 1,
    sinceLegendary: has('legendary') ? 0 : p.sinceLegendary + 1,
    sinceNewCard: stacks.some((s) => s.isNew) ? 0 : p.sinceNewCard + 1,
  };
}

export interface StackSpec {
  card?: CardId;
  rarity: Rarity;
  foil?: Foil;
  isNew?: boolean;
  dust?: number;
  copies?: number;
}

/** Stack rarities for a tier: guarantees first, the rest Common (A6.4 table shape). */
function tierStacks(tier: CapsuleTier): StackSpec[] {
  const def = C.capsules.tiers[tier];
  const out: StackSpec[] = def.guaranteed.map((r) => ({ rarity: r }));
  while (out.length < def.stacks) out.push({ rarity: 'common' });
  return out;
}

interface RevealSpec {
  id: string;
  tier: CapsuleTier;
  startTier?: CapsuleTier;
  kind?: PendingCapsule['kind'];
  stacks?: StackSpec[];
  skin?: SkinId | null;
  dust?: number;
  firstLegendary?: CardId[];
  scriptIndex?: number | null;
  pity?: SaveDoc['pity'];
  seed?: number;
}

export function makeReveal(spec: RevealSpec): CapsuleReveal {
  const rng = mulberry32(spec.seed ?? spec.id.length * 131 + spec.id.charCodeAt(0));
  const kind = spec.kind ?? 'win';
  const climbFrom = C.capsules.kinds[kind].climbFrom;
  const startTier = spec.startTier ?? climbFrom ?? spec.tier;
  const def = C.capsules.tiers[spec.tier];
  const used = new Set<CardId>();
  const stacks: CapsuleStack[] = (spec.stacks ?? tierStacks(spec.tier)).map((s) => {
    let card = s.card;
    if (!card) {
      const pool = POOL[s.rarity].filter((c) => !used.has(c));
      card = pool[rng.int(pool.length)] ?? POOL[s.rarity][0] ?? 'bonker';
    }
    used.add(card);
    return {
      card,
      rarity: s.rarity,
      copies: s.copies ?? def.copies[s.rarity],
      isNew: s.isNew ?? !OWNED.has(card),
      foil: s.foil ?? 'none',
      dust: s.dust ?? 0,
    };
  });
  const k = climbCount(startTier, spec.tier);
  const pity = spec.pity ?? PITY;
  return {
    capsule: {
      id: spec.id,
      kind,
      tier: spec.tier,
      startTier,
      scriptIndex: spec.scriptIndex ?? null,
      age: null,
      contents: { stacks, amber: def.amber, dust: spec.dust ?? def.bonusDust, skin: spec.skin ?? null },
      createdAt: 0,
    },
    climbs: k,
    strikeClimbs: strikePattern(k),
    pityBefore: pity,
    pityAfter: nextPity(pity, stacks),
    firstLegendaryReveal: spec.firstLegendary ?? [],
  };
}

/** Copies bars from a fake collection: owned cards at level 3 with a few copies; new cards at level 1. */
export function benchProgress(reveals: readonly CapsuleReveal[]): ProgressLookup {
  const before: SaveDoc['collection'] = {};
  const after: SaveDoc['collection'] = {};
  const rng = mulberry32(reveals.length * 977);
  for (const r of reveals) {
    for (const s of r.capsule.contents.stacks) {
      if (!before[s.card] && !s.isNew) {
        const level = s.dust > 0 ? 10 : 3;
        before[s.card] = { level, copies: s.dust > 0 ? 0 : rng.int(4), isNew: false, foil: 'none' };
      }
      const b = before[s.card];
      const a = after[s.card] ?? (b ? { ...b } : { level: 1, copies: 0, isNew: true, foil: 'none' as Foil });
      if (s.dust === 0) a.copies += s.isNew && !b ? s.copies - 1 : s.copies;
      after[s.card] = a;
    }
  }
  const upgrade = {
    common: C.rarities.cards.common.upgradeCopies,
    rare: C.rarities.cards.rare.upgradeCopies,
    epic: C.rarities.cards.epic.upgradeCopies,
    legendary: C.rarities.cards.legendary.upgradeCopies,
  };
  return progressFromCollections(before, after, upgrade, C.economy.maxLevel);
}

const SKIN_POOL: Record<SkinRarity, SkinId[]> = { rare: [], epic: [], legendary: [] };
for (const s of Object.values(C.skins)) if (s.inCratePool) SKIN_POOL[s.rarity].push(s.id);
const SKIN_RANK: Record<SkinRarity, number> = { rare: 0, epic: 1, legendary: 2 };

/** A reel as the meta would build it: fillers at the true odds, winner at 45, no rarer tile at 46 (A10.1). */
export function makeCrate(id: string, skin: SkinId, o: { duplicateDust?: number; stopOffsetBp?: number; seed?: number } = {}): WardrobeReveal {
  const rarity = C.skins[skin]?.rarity ?? 'rare';
  const rng = mulberry32(o.seed ?? id.length * 7 + 3);
  const odds = C.rarities.skins;
  const roll = (): SkinRarity => {
    const x = rng.int(10000);
    return x < odds.legendary.crateOddsBp ? 'legendary' : x < odds.legendary.crateOddsBp + odds.epic.crateOddsBp ? 'epic' : 'rare';
  };
  const tiles: SkinId[] = [];
  for (let i = 0; i < 50; i++) {
    let r = roll();
    if (i === 46) while (SKIN_RANK[r] > SKIN_RANK[rarity]) r = roll();
    const pool = SKIN_POOL[r];
    tiles.push(pool[rng.int(pool.length)] ?? skin);
  }
  tiles[45] = skin;
  return {
    crate: { id, source: 'codex', skin, rarity, duplicateDust: o.duplicateDust ?? 0, createdAt: 0 },
    reelTiles: tiles,
    winnerIndex: 45,
    stopOffsetBp: o.stopOffsetBp ?? rng.int(10001),
  };
}

function single(id: string, group: string, title: string, spec: Omit<RevealSpec, 'id'>): BenchCase {
  const r = makeReveal({ id, ...spec });
  return { id, group, title, reveals: [r], progress: benchProgress([r]) };
}

function buildCases(): BenchCase[] {
  const cases: BenchCase[] = [];
  // Every tier from every start tier (A10 step 3). Win and meter climb from Clay, Daily from Bronze;
  // other start tiers use Win capsules with a raised start (the climb rule is the same).
  for (const start of TIER_ORDER) {
    for (const tier of TIER_ORDER) {
      if (TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(start)) continue;
      const kind: PendingCapsule['kind'] = start === 'bronze' ? 'daily' : 'win';
      cases.push(single(`climb-${start}-${tier}`, 'Climb', `${start} → ${tier}`, { tier, startTier: start, kind }));
    }
  }
  cases.push(
    single('fixed-road', 'Fixed tier', 'Trophy Road Silver (starts at the burst)', { tier: 'silver', kind: 'road' }),
    single('fixed-codex', 'Fixed tier', 'Codex Capsule (Silver)', { tier: 'silver', kind: 'codex' }),
    single('fixed-meter', 'Fixed tier', 'Clay meter (climb from Clay, no climbs)', { tier: 'clay', kind: 'meter' }),
    single('legendary-first', 'Legendary', 'First-time Legendary (full walkout, unskippable)', {
      tier: 'aeon',
      stacks: [
        { rarity: 'common' }, { rarity: 'common' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram' }, { rarity: 'epic', card: 'bronze_cannon' },
        { rarity: 'legendary', card: 'mammoth_matriarch', isNew: true },
      ],
      firstLegendary: ['mammoth_matriarch'],
    }),
    single('legendary-repeat', 'Legendary', 'Repeat Legendary (3 s walkout, skippable)', {
      tier: 'aeon',
      stacks: [{ rarity: 'common' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram' }, { rarity: 'legendary', card: 'ursa_paladin', isNew: false }],
    }),
    single('legendary-jade', 'Legendary', 'Jade with a converted Legendary stack', {
      tier: 'jade',
      stacks: [{ rarity: 'common' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram' }, { rarity: 'epic' }, { rarity: 'legendary', card: 'balloon_admiral' }],
      firstLegendary: ['balloon_admiral'],
    }),
    single('epic-new', 'Epic', 'NEW Epic (2 s mini-walkout)', {
      tier: 'silver',
      stacks: [{ rarity: 'common' }, { rarity: 'common' }, { rarity: 'rare' }, { rarity: 'epic', card: 'sabertooth', isNew: true }],
    }),
    single('epic-owned', 'Epic', 'Owned Epic (no walkout)', {
      tier: 'silver',
      stacks: [{ rarity: 'common' }, { rarity: 'rare' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram', isNew: false }],
    }),
    single('foil-bronze', 'Foil', 'Bronze foil', { tier: 'bronze', stacks: [{ rarity: 'common', foil: 'bronze' }, { rarity: 'rare' }, { rarity: 'common' }] }),
    single('foil-silver', 'Foil', 'Silver foil', { tier: 'bronze', stacks: [{ rarity: 'common' }, { rarity: 'rare', foil: 'silver' }, { rarity: 'common' }] }),
    single('foil-holo', 'Foil', 'Holo (1 s sweep)', { tier: 'silver', stacks: [{ rarity: 'common' }, { rarity: 'rare' }, { rarity: 'rare' }, { rarity: 'epic', foil: 'holo', card: 'battering_ram', isNew: false }] }),
    single('dust-max', 'Other', 'Max-level copies become Dust', {
      tier: 'jade',
      stacks: [{ rarity: 'common', card: 'bonker', dust: 70, copies: 14 }, { rarity: 'rare' }, { rarity: 'rare' }, { rarity: 'epic' }, { rarity: 'epic', card: 'battering_ram', isNew: false }],
    }),
    single('aeon-skin', 'Other', 'Aeon with a bonus skin', {
      tier: 'aeon',
      skin: 'ghost_corsair',
      stacks: [{ rarity: 'common' }, { rarity: 'common' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram', isNew: false }, { rarity: 'epic' }, { rarity: 'legendary', card: 'ursa_paladin', isNew: false }],
    }),
  );
  // Onboarding script (A6.5).
  const script = C.capsules.script;
  script.forEach((s, i) => {
    const stacks: StackSpec[] = tierStacks(s.tier).map((st) => ({ ...st }));
    s.cards.forEach((card, k) => {
      const rarity = C.units[card]?.rarity ?? C.turrets[card]?.rarity ?? 'common';
      const free = stacks.findIndex((x) => x.rarity === rarity && !x.card);
      stacks[free >= 0 ? free : k] = { rarity, card, isNew: true };
    });
    if (s.randomUnownedEpic) stacks[stacks.length - 1] = { rarity: 'epic', card: 'grumpy_toad', isNew: true };
    cases.push(
      single(`script-${s.capsule}`, 'Onboarding', `Script capsule ${s.capsule} (${s.tier})`, {
        tier: s.tier,
        startTier: 'clay',
        stacks,
        scriptIndex: i,
        firstLegendary: s.fullWalkout ? s.cards : [],
      }),
    );
  });
  // Open all: 10 capsules.
  const tiers: CapsuleTier[] = ['clay', 'bronze', 'bronze', 'clay', 'silver', 'bronze', 'jade', 'bronze', 'clay', 'aeon'];
  let pity = PITY;
  const all = tiers.map((tier, i) => {
    const r = makeReveal({
      id: `all-${i}`,
      tier,
      pity,
      seed: 1000 + i,
      ...(tier === 'aeon' ? { stacks: [...tierStacks('aeon').slice(0, 5), { rarity: 'legendary' as Rarity, card: 'behemoth_tank', isNew: true }], firstLegendary: ['behemoth_tank'] } : {}),
    });
    pity = r.pityAfter;
    return r;
  });
  cases.push({ id: 'open-all-10', group: 'Open all', title: '10 capsules (Epic+ reveals, one summary)', reveals: all, progress: benchProgress(all) });
  cases.push({
    id: 'open-all-3',
    group: 'Open all',
    title: '3 small capsules (no Epic: summary only)',
    reveals: ['clay', 'bronze', 'clay'].map((t, i) =>
      makeReveal({ id: `small-${i}`, tier: t as CapsuleTier, seed: 50 + i, stacks: tierStacks(t as CapsuleTier).map(() => ({ rarity: 'common' as Rarity })) }),
    ),
  });
  // Wardrobe (A10.1).
  cases.push(
    { id: 'crate-rare', group: 'Wardrobe', title: 'Reel: Rare skin', crate: makeCrate('crate-rare', 'pumpkin_head'), reelReveal: true, pity: PITY },
    { id: 'crate-epic', group: 'Wardrobe', title: 'Reel: Epic skin', crate: makeCrate('crate-epic', 'ghost_corsair'), reelReveal: true, pity: PITY },
    { id: 'crate-legendary', group: 'Wardrobe', title: 'Reel: Legendary skin', crate: makeCrate('crate-legendary', 'frost_matriarch'), reelReveal: true, pity: PITY },
    { id: 'crate-duplicate', group: 'Wardrobe', title: 'Reel: duplicate (Dust)', crate: makeCrate('crate-dup', 'tin_can', { duplicateDust: 50 }), reelReveal: true, pity: PITY },
    { id: 'crate-flip', group: 'Wardrobe', title: 'Flag off: card flip', crate: makeCrate('crate-flip', 'kaiju_walker'), reelReveal: false, pity: PITY },
  );
  return cases;
}

export const BENCH_CASES: readonly BenchCase[] = buildCases();
