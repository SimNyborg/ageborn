/**
 * Capsule bench cases (WP10 DoD): every tier and start tier, fixed tiers, a first-time and a repeat
 * Legendary, a NEW Epic, each foil, Dust conversion, a bonus skin, the onboarding script, a
 * 10-capsule "Open all", and a Wardrobe Crate (card-flip reveal; there is no reel, A15.3).
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
  WardrobeReveal,
} from '@/contracts';
import { mulberry32 } from '@/core';
import { asContent, capsuleTierFor, content } from '@/content';
// Pure capsule modules only, so the bench cases load in Node tests without Pixi or CSS.
import { progressFromCollections } from '@/capsule/summaryModel';
import { climbCount, strikePattern, strikeSplit, TIER_ORDER } from '@/capsule/tiers';
import type { ProgressLookup } from '@/capsule/types';

const C = asContent(content);

export interface BenchCase {
  id: string;
  group: string;
  title: string;
  reveals?: CapsuleReveal[];
  crate?: WardrobeReveal;
  /** `Settings.quickReveal` (A15.6): open at the burst. */
  quickReveal?: boolean;
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
    // As the meta counts them (A6.5): only an Epic stack resets Epic pity.
    sinceEpic: has('epic') ? 0 : p.sinceEpic + 1,
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

/** The last arena (0-based): it rolls the all-ages table (A6.4, content re-tune 2026-10-04). */
const ALL_AGES_ARENA = C.arenas.list.length - 1;

/** Stack rarities for a tier: guarantees first, the rest Common (A6.4 table shape; `allAges`: Arena 3 and up). */
function tierStacks(tier: CapsuleTier, allAges = false): StackSpec[] {
  const def = capsuleTierFor(C.capsules, tier, allAges ? ALL_AGES_ARENA : null);
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
  /** The first capsule of this Legendary tier the save opens (A10 step 4b). */
  firstOfTier?: boolean;
  /** Rolled in Arena 3 or later: the all-ages stacks and copies (A6.4). */
  allAges?: boolean;
}

export function makeReveal(spec: RevealSpec): CapsuleReveal {
  const rng = mulberry32(spec.seed ?? spec.id.length * 131 + spec.id.charCodeAt(0));
  const kind = spec.kind ?? 'win';
  const climbFrom = C.capsules.kinds[kind].climbFrom;
  const startTier = spec.startTier ?? climbFrom ?? spec.tier;
  const def = capsuleTierFor(C.capsules, spec.tier, spec.allAges ? ALL_AGES_ARENA : null);
  const used = new Set<CardId>();
  let legendaries = 0;
  const stacks: CapsuleStack[] = (spec.stacks ?? tierStacks(spec.tier, spec.allAges)).map((s) => {
    let card = s.card;
    if (!card) {
      const pool = POOL[s.rarity].filter((c) => !used.has(c));
      card = pool[rng.int(pool.length)] ?? POOL[s.rarity][0] ?? 'bonker';
    }
    used.add(card);
    // The 2nd and 3rd guaranteed Legendary stacks hold `extraLegendaryCopies` (A6.4).
    const extra = s.rarity === 'legendary' && legendaries++ > 0;
    return {
      card,
      rarity: s.rarity,
      copies: s.copies ?? (extra ? def.extraLegendaryCopies : def.copies[s.rarity]),
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
    strikeClimbs: strikePattern(strikeSplit(startTier, spec.tier).main),
    pityBefore: pity,
    pityAfter: nextPity(pity, stacks),
    firstLegendaryReveal: spec.firstLegendary ?? [],
    firstOfTier: spec.firstOfTier ?? false,
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
      // As the meta applies them: a new card starts at L1 with all of its stack's copies.
      if (s.dust === 0) a.copies += s.copies;
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


/** A Wardrobe Crate reveal as the meta writes it: the pre-rolled skin, no reel (A15.3). */
export function makeCrate(id: string, skin: SkinId, o: { duplicateDust?: number } = {}): WardrobeReveal {
  const rarity = C.skins[skin]?.rarity ?? 'rare';
  return {
    crate: { id, source: 'codex', skin, rarity, duplicateDust: o.duplicateDust ?? 0, createdAt: 0 },
    reelTiles: [],
    winnerIndex: 45,
    stopOffsetBp: 0,
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
    // Fixed Legendary tiers start at the burst with their staging and crests (A10 step 4).
    single('fixed-gold', 'Fixed tier', 'Gate 7 Gold (burst, 1 crest)', { tier: 'gold', kind: 'road' }),
    single('fixed-platinum', 'Fixed tier', 'Gate 8 Platinum (burst, 2 crests)', { tier: 'platinum', kind: 'road' }),
    single('fixed-aeon', 'Fixed tier', 'Trophy Road 4,000 Aeon (burst, 3 crests)', { tier: 'aeon', kind: 'road' }),
    // The first capsule of each Legendary tier (A10 step 4b): the banner after the pop.
    single('first-gold', 'First of a tier', 'First Gold Capsule (Win, from Clay)', { tier: 'gold', firstOfTier: true }),
    single('first-platinum', 'First of a tier', 'First Platinum Capsule (Win, from Clay)', { tier: 'platinum', firstOfTier: true }),
    single('first-aeon', 'First of a tier', 'First Aeon Capsule (Win, from Clay)', { tier: 'aeon', firstOfTier: true }),
    single('legendary-first', 'Legendary', 'First-time Legendary (full walkout, unskippable)', {
      tier: 'gold',
      stacks: [
        { rarity: 'common' }, { rarity: 'common' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram' }, { rarity: 'epic', card: 'bronze_cannon' },
        { rarity: 'legendary', card: 'mammoth_matriarch', isNew: true },
      ],
      firstLegendary: ['mammoth_matriarch'],
    }),
    single('legendary-repeat', 'Legendary', 'Repeat Legendary (3 s walkout, skippable)', {
      tier: 'gold',
      stacks: [{ rarity: 'common' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram' }, { rarity: 'legendary', card: 'ursa_paladin', isNew: false }],
    }),
    single('legendary-three', 'Legendary', 'Aeon with 3 NEW Legendaries (one full walkout, two 3 s)', {
      tier: 'aeon',
      skin: 'ghost_corsair',
      stacks: [
        { rarity: 'common' }, { rarity: 'common' }, { rarity: 'rare' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram', isNew: false }, { rarity: 'epic' },
        { rarity: 'legendary', card: 'mammoth_matriarch', isNew: true }, { rarity: 'legendary', card: 'behemoth_tank', isNew: true }, { rarity: 'legendary', card: 'balloon_admiral', isNew: true },
      ],
    }),
    single('legendary-jade', 'Legendary', 'Jade with a rolled Legendary stack (1% stack roll)', {
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
    // The all-ages table (A6.4, Arena 3 and up): one more stack and bigger copies on every tier.
    single('allages-clay', 'All-ages table', 'Clay from Arena 3 (3 stacks)', { tier: 'clay', allAges: true }),
    single('allages-jade', 'All-ages table', 'Jade from Arena 3 (6 stacks)', { tier: 'jade', allAges: true }),
    single('allages-aeon', 'All-ages table', 'Aeon from Arena 3 (9 stacks, 3 Legendaries)', { tier: 'aeon', allAges: true, skin: 'ghost_corsair' }),
    single('aeon-skin', 'Other', 'Platinum with its sure skin (owned Legendaries)', {
      tier: 'platinum',
      skin: 'ghost_corsair',
      stacks: [
        { rarity: 'common' }, { rarity: 'common' }, { rarity: 'rare' }, { rarity: 'epic', card: 'battering_ram', isNew: false }, { rarity: 'epic' },
        { rarity: 'legendary', card: 'ursa_paladin', isNew: false }, { rarity: 'legendary', card: 'chrono_titan', isNew: false },
      ],
    }),
  );
  // Onboarding script (A6.5), shaped as the meta rolls it: the scripted cards replace the tier's
  // guarantees and the other stacks are Common stacks of owned cards, so only the scripted cards are NEW.
  const script = C.capsules.script;
  const ownedCommons = POOL.common.filter((c) => OWNED.has(c));
  script.forEach((s) => {
    const stacks: StackSpec[] = s.cards.map((card) => ({ rarity: C.units[card]?.rarity ?? C.turrets[card]?.rarity ?? 'common', card, isNew: true }));
    if (s.randomUnownedEpic) stacks.push({ rarity: 'epic', card: 'grumpy_toad', isNew: true });
    for (let k = 0; stacks.length < C.capsules.tiers[s.tier].stacks; k++) {
      stacks.push({ rarity: 'common', card: ownedCommons[k % ownedCommons.length] ?? 'bonker', isNew: false });
    }
    cases.push(
      single(`script-${s.capsule}`, 'Onboarding', `Script capsule ${s.capsule} (${s.tier})`, {
        tier: s.tier,
        startTier: 'clay',
        stacks,
        // 1-based, as the meta writes it (the script's capsule number).
        scriptIndex: s.capsule,
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
  // Open all with a Platinum (its stinger and flare end the volley), a first Aeon (one combined
  // banner) and two NEW Legendaries in different capsules (one full walkout per batch).
  {
    const mix: CapsuleTier[] = ['bronze', 'platinum', 'clay', 'silver', 'aeon'];
    let p2 = PITY;
    const batch = mix.map((tier, i) => {
      const r = makeReveal({
        id: `peak-${i}`,
        tier,
        pity: p2,
        seed: 3000 + i,
        firstOfTier: tier === 'aeon',
        ...(tier === 'platinum' ? { stacks: [...tierStacks('platinum').filter((st) => st.rarity !== 'legendary'), { rarity: 'legendary' as Rarity, card: 'mammoth_matriarch', isNew: true }, { rarity: 'legendary' as Rarity, card: 'ursa_paladin', isNew: false }] } : {}),
        ...(tier === 'aeon' ? { stacks: [...tierStacks('aeon').filter((st) => st.rarity !== 'legendary'), { rarity: 'legendary' as Rarity, card: 'behemoth_tank', isNew: true }, { rarity: 'legendary' as Rarity, card: 'ursa_paladin', isNew: false }, { rarity: 'legendary' as Rarity, card: 'chrono_titan', isNew: false }] } : {}),
      });
      p2 = r.pityAfter;
      return r;
    });
    cases.push({ id: 'open-all-peak', group: 'Open all', title: '5 capsules with a Platinum and a first Aeon (flare, banner, one full walkout)', reveals: batch, progress: benchProgress(batch) });
  }
  cases.push({
    id: 'open-all-3',
    group: 'Open all',
    title: '3 small capsules (no Epic: summary only)',
    reveals: ['clay', 'bronze', 'clay'].map((t, i) =>
      makeReveal({ id: `small-${i}`, tier: t as CapsuleTier, seed: 50 + i, stacks: tierStacks(t as CapsuleTier).map(() => ({ rarity: 'common' as Rarity })) }),
    ),
  });
  // Quick reveal (A15.6): every capsule opens at the burst.
  {
    const quick = makeReveal({ id: 'quick-jade', tier: 'jade', startTier: 'clay', seed: 77, pity: PITY });
    cases.push({ id: 'quick-jade', group: 'Quick reveal', title: 'Quick reveal: a Jade Win Capsule opens at the burst', reveals: [quick], progress: benchProgress([quick]), quickReveal: true });
    const quickAeon = makeReveal({ id: 'quick-aeon', tier: 'aeon', startTier: 'clay', seed: 78, pity: PITY, firstOfTier: true });
    cases.push({ id: 'quick-aeon', group: 'Quick reveal', title: 'Quick reveal: a first Aeon (no summit strikes; crests, stinger and banner stay)', reveals: [quickAeon], progress: benchProgress([quickAeon]), quickReveal: true });
  }
  // Wardrobe Crate: the card flip for each skin rarity (A10, A15.3; there is no reel).
  cases.push(
    { id: 'crate-rare', group: 'Wardrobe', title: 'Card flip: Rare skin', crate: makeCrate('crate-rare', 'pumpkin_head'), pity: PITY },
    { id: 'crate-epic', group: 'Wardrobe', title: 'Card flip: Epic skin', crate: makeCrate('crate-epic', 'ghost_corsair'), pity: PITY },
    { id: 'crate-legendary', group: 'Wardrobe', title: 'Card flip: Legendary skin', crate: makeCrate('crate-legendary', 'frost_matriarch'), pity: PITY },
    { id: 'crate-duplicate', group: 'Wardrobe', title: 'Card flip: duplicate (Dust)', crate: makeCrate('crate-dup', 'tin_can', { duplicateDust: 50 }), pity: PITY },
  );
  return cases;
}

export const BENCH_CASES: readonly BenchCase[] = buildCases();
