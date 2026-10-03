/**
 * Capsule drop statistics (DESIGN B12 `sim:drops`, A6.4, A6.5, C4.5 meta honesty).
 *
 * Opens many capsules through the `Meta` contract (`grantCapsule` then `openCapsule`, exactly as the app
 * does) on fresh saves in the last arena (full drop pool, random Legendaries on), with the onboarding
 * script already done, and checks what players are told:
 *
 * - **Bag totals**: every full bag (the sum of `capsules.bag`: 200) of Sundial Capsules holds exactly the
 *   published counts (60 Clay, 80 Bronze, 40 Silver, 13 Jade, 4 Gold, 2 Platinum, 1 Aeon).
 * - **Chi-square, family-wise p > 0.01 (Bonferroni)**: Supply Capsule tiers (every tier with odds
 *   above 0), the stack rarity roll (72/22/5/1, on stacks that no guarantee or pity could touch), foils
 *   on every stack (purely rolled, no floors), the skin chance of every tier with 0 < `skinChanceBp` <
 *   100% (Gold 30%), and the skin rarity split of every tier that can hold a skin (the Wardrobe odds
 *   from `skinMinRarity` up, renormalised: Gold and Platinum 78/18/4, Aeon 81.82/18.18).
 *   Gate policy (C4.5): the k chi-square checks of one run share the 0.01 false-alarm budget, so each
 *   passes at p > 0.01 / k. A correct build then fails a run by chance at most 1% of the time, not
 *   about k% as with 0.01 per check; a real bias still fails (a Supply Aeon at 20 bp instead of 15
 *   gives χ² ≈ 33, p < 0.00001, in the full run).
 * - **Zero violations**: the tier's stack count and guaranteed rarities; `guaranteed` Legendaries as
 *   that many different cards, the extra ones holding `extraLegendaryCopies`; a skin in every sure-skin
 *   tier, never below `skinMinRarity`; capsule skins never move the Wardrobe pity counters; the honest
 *   climb (4 back-loaded main strikes up to `summitAbove`, one summit strike per tier above it, the
 *   climbs summing to the rolled tier).
 * - **Pity boundaries**: an Epic stack at least every 10 capsules; a Legendary by capsule 40; an unowned
 *   card at least every 5 capsules while the pool has unowned cards.
 *
 * Every check is keyed on the content data, never on a tier id. The full run (10^6 openings) is the
 * release gate: the Supply Aeon is only 15 bp.
 *
 * The analysis (`DropsTally`) is pure and fed one opened capsule at a time, so it runs in constant memory
 * for 10^6 openings. Without `src/meta` (WP7) the tool writes a skipped report and exits 0.
 */
import type { CapsuleReveal, CapsuleTier, CardId, Clock, CompiledContent, Foil, Meta, PendingCapsule, Rarity, SaveDoc, SkinRarity } from '../src/contracts';
import { asContent, content as gameContent, isReleased, type Content } from '../src/content';
import { loadMeta } from './lib/modules';
import { chiSquare, type ChiSquare } from './lib/stats';
import { fmtNum, markdownTable, skippedCheck, startReport, type Check, type Report } from './report';

/**
 * DESIGN C4.5: published odds pass the chi-square test at p > 0.01. This is the family-wise level of
 * one run: with k chi-square checks, each passes at p > P_MIN / k (Bonferroni, `chiAlpha`).
 */
export const P_MIN = 0.01;

/** The per-check chi-square level for a run with `k` chi-square checks (Bonferroni). */
export function chiAlpha(k: number): number {
  return P_MIN / Math.max(1, k);
}

export interface OpenedCapsule {
  stream: number;
  kind: PendingCapsule['kind'];
  tier: CapsuleTier;
  scripted: boolean;
  stacks: { rarity: Rarity; foil: Foil; isNew: boolean; card: CardId; copies?: number }[];
  skin: boolean;
  /** The capsule skin's rarity, when known. */
  skinRarity?: SkinRarity | null;
  pityBefore: SaveDoc['pity'];
  /** The counters after opening (for the Wardrobe pity check), when known. */
  pityAfter?: SaveDoc['pity'];
  /** Unowned cards in the drop pool before this capsule. */
  unownedBefore: number;
  /** The climb as revealed (A10), when known. */
  climb?: { startTier: CapsuleTier; climbs: number; strikeClimbs: boolean[] };
}

interface StreamState {
  bagGroup: CapsuleTier[];
  sinceEpic: number;
  sinceLegendary: number;
  sinceNew: number;
  counted: number;
}

const RARITIES: readonly Rarity[] = ['common', 'rare', 'epic', 'legendary'];
const FOILS: readonly Foil[] = ['holo', 'silver', 'bronze', 'none'];
const SKIN_RARITIES: readonly SkinRarity[] = ['rare', 'epic', 'legendary'];
/** Main strikes per climbing capsule (A10 step 3). */
const MAIN_STRIKES = 4;

/** The size of a full Sundial Capsule bag: the sum of the content's bag counts (A6.4). */
export function contentBagSize(c: Content): number {
  return c.capsules.tierOrder.reduce((n, t) => n + c.capsules.bag[t], 0);
}

/** Why a revealed climb breaks the honest-climb rules (A10), or null. */
export function climbIssue(c: Content, tier: CapsuleTier, climb: { startTier: CapsuleTier; climbs: number; strikeClimbs: boolean[] }): string | null {
  const order = c.capsules.tierOrder;
  const s = order.indexOf(climb.startTier);
  const f = order.indexOf(tier);
  const top = order.indexOf(c.capsules.summitAbove);
  if (s < 0 || f < s) return `start ${climb.startTier} above ${tier}`;
  const main = Math.max(0, Math.min(MAIN_STRIKES, Math.min(f, top) - s));
  const summit = Math.max(0, f - Math.max(top, s));
  const k = climb.strikeClimbs.filter(Boolean).length;
  const first = climb.strikeClimbs.indexOf(true);
  if (climb.strikeClimbs.length !== MAIN_STRIKES) return `${climb.strikeClimbs.length} main strikes`;
  if (first >= 0 && climb.strikeClimbs.slice(first).some((x) => !x)) return 'a climb followed by a non-climb';
  if (k !== main) return `${k} main climbs, the tiers give ${main}`;
  if (climb.climbs - k !== summit) return `${climb.climbs - k} summit strikes, the tiers give ${summit}`;
  if (summit > 0 && f <= top) return 'a summit strike at or below the summit tier';
  if (climb.climbs !== f - s) return `climbs ${climb.climbs} do not reach the rolled tier`;
  return null;
}

export interface DropsSummary {
  openings: number;
  bag: { groups: number; badGroups: number; firstBad: string | null };
  daily: ChiSquare | null;
  foils: ChiSquare | null;
  rarity: ChiSquare | null;
  rarityByTier: Partial<Record<CapsuleTier, number[]>>;
  /** Skin chance per tier with 0 < `skinChanceBp` < 100%. */
  skinChance: Partial<Record<CapsuleTier, ChiSquare>>;
  /** Skin rarity (rare/epic/legendary) per tier that can hold a skin, against its renormalised Wardrobe odds. */
  skinRarity: Partial<Record<CapsuleTier, ChiSquare>>;
  stackCountViolations: number;
  guaranteeViolations: number;
  /** Too few Legendary stacks, a repeated card, or wrong extra-stack copies. */
  legendaryViolations: number;
  /** Platinum and Aeon (sure skin): no skin, or one below `skinMinRarity`. */
  sureSkinViolations: number;
  /** A capsule that moved the Wardrobe pity counters. */
  wardrobePityViolations: number;
  /** A revealed climb that breaks the honest-climb rules (A10). */
  climbViolations: number;
  firstClimbIssue: string | null;
  /** Openings per tier (not scripted). */
  tierCounts: Partial<Record<CapsuleTier, number>>;
  maxWithoutEpic: number;
  maxWithoutLegendary: number;
  maxWithoutNew: number;
  copiesPerWin: number;
  amberPerWin: number;
}

/** Pure, streaming analysis of opened capsules. */
export class DropsTally {
  private readonly c: Content;
  private readonly streams = new Map<number, StreamState>();
  private openings = 0;
  private bagGroups = 0;
  private badGroups = 0;
  private firstBad: string | null = null;
  private readonly daily = new Map<CapsuleTier, number>();
  private readonly foil = new Map<Foil, number>();
  private readonly rolled = new Map<CapsuleTier, number[]>();
  /** Per tier with a partial skin chance: [capsules, skins]. */
  private readonly skins = new Map<CapsuleTier, [number, number]>();
  /** Per tier that can hold a skin: skins seen per rarity (rare, epic, legendary). */
  private readonly skinRarities = new Map<CapsuleTier, number[]>();
  private readonly tierCounts = new Map<CapsuleTier, number>();
  private stackViolations = 0;
  private guaranteeViolations = 0;
  private legendaryViolations = 0;
  private sureSkinViolations = 0;
  private wardrobePityViolations = 0;
  private climbViolations = 0;
  private firstClimbIssue: string | null = null;
  private maxNoEpic = 0;
  private maxNoLegendary = 0;
  private maxNoNew = 0;
  private winCount = 0;
  private winCopies = 0;
  private winAmber = 0;

  constructor(content: CompiledContent) {
    this.c = asContent(content);
  }

  private stream(id: number): StreamState {
    let s = this.streams.get(id);
    if (!s) {
      s = { bagGroup: [], sinceEpic: 0, sinceLegendary: 0, sinceNew: 0, counted: 0 };
      this.streams.set(id, s);
    }
    return s;
  }

  /** Adds one opened capsule. `copies` and `amber` feed the per-capsule averages. */
  add(o: OpenedCapsule, extra: { copies: number; amber: number } = { copies: 0, amber: 0 }): void {
    this.openings += 1;
    const caps = this.c.capsules;
    const tierDef = caps.tiers[o.tier];
    const st = this.stream(o.stream);
    const rarities = o.stacks.map((s) => s.rarity);
    const counts = (rs: readonly Rarity[]): number[] => RARITIES.map((r) => rs.filter((x) => x === r).length);

    // Foils are purely rolled on every stack (no tier sets a floor).
    for (const s of o.stacks) this.foil.set(s.foil, (this.foil.get(s.foil) ?? 0) + 1);
    if (o.kind === 'daily' && !o.scripted) this.daily.set(o.tier, (this.daily.get(o.tier) ?? 0) + 1);
    if (!o.scripted) this.tierCounts.set(o.tier, (this.tierCounts.get(o.tier) ?? 0) + 1);
    const fixedContents = o.kind === 'age' || o.kind === 'ageUnlock';
    if (!o.scripted && !fixedContents) {
      // Skins (A6.4 step 7): a chi-square for partial chances, zero misses for sure ones.
      if (tierDef.skinChanceBp > 0 && tierDef.skinChanceBp < 10_000) {
        const acc = this.skins.get(o.tier) ?? [0, 0];
        acc[0] += 1;
        if (o.skin) acc[1] += 1;
        this.skins.set(o.tier, acc);
      }
      if (tierDef.skinChanceBp >= 10_000) {
        const low = o.skinRarity !== undefined && o.skinRarity !== null && SKIN_RARITIES.indexOf(o.skinRarity) < SKIN_RARITIES.indexOf(tierDef.skinMinRarity);
        if (!o.skin || low) this.sureSkinViolations += 1;
      }
      // The skin's rarity split (A6.4 step 7), for every tier that can hold a skin.
      if (tierDef.skinChanceBp > 0 && o.skin && o.skinRarity) {
        const acc = this.skinRarities.get(o.tier) ?? SKIN_RARITIES.map(() => 0);
        const i = SKIN_RARITIES.indexOf(o.skinRarity);
        if (i >= 0) acc[i] = (acc[i] ?? 0) + 1;
        this.skinRarities.set(o.tier, acc);
      }
      // Legendary guarantees (A6.4 steps 3-4): that many different cards, the extra ones with 1 copy.
      const want = tierDef.guaranteed.filter((r) => r === 'legendary').length;
      const legs = o.stacks.filter((x) => x.rarity === 'legendary');
      const distinct = new Set(o.stacks.map((x) => x.card)).size === o.stacks.length;
      const extraOk = want < 2 || legs.every((x) => x.copies === undefined) || legs.filter((x) => x.copies === tierDef.extraLegendaryCopies).length >= want - 1;
      if (legs.length < want || !distinct || !extraOk) this.legendaryViolations += 1;
    }
    // Capsule skins never read or advance the Wardrobe pity counters.
    if (o.pityAfter && (o.pityAfter.wardrobeSinceEpic !== o.pityBefore.wardrobeSinceEpic || o.pityAfter.wardrobeSinceLegendary !== o.pityBefore.wardrobeSinceLegendary)) {
      this.wardrobePityViolations += 1;
    }
    // The honest climb (A10): back-loaded main strikes, summit strikes only above the summit tier.
    if (o.climb) {
      const issue = climbIssue(this.c, o.tier, o.climb);
      if (issue) {
        this.climbViolations += 1;
        this.firstClimbIssue ??= `${o.climb.startTier} → ${o.tier}: ${issue}`;
      }
    }

    // Bag: groups of a full bag (the content bag size) of bag-drawn Sundial Capsules.
    if (o.kind === 'win' && !o.scripted) {
      this.winCount += 1;
      this.winCopies += extra.copies;
      this.winAmber += extra.amber;
      st.bagGroup.push(o.tier);
      if (st.bagGroup.length === contentBagSize(this.c)) {
        this.bagGroups += 1;
        const bad = caps.tierOrder.filter((t) => st.bagGroup.filter((x) => x === t).length !== caps.bag[t]);
        if (bad.length > 0) {
          this.badGroups += 1;
          this.firstBad ??= `stream ${o.stream}, group ${this.bagGroups}: ${caps.tierOrder.map((t) => `${t} ${st.bagGroup.filter((x) => x === t).length}`).join(', ')}`;
        }
        st.bagGroup = [];
      }
    }

    // Stack count and guarantees (a tier with a Rare-to-Legendary chance may show a Legendary instead).
    if (!fixedContents && !o.scripted) {
      if (o.stacks.length !== tierDef.stacks) this.stackViolations += 1;
      const left = [...rarities];
      let ok = true;
      for (const g of tierDef.guaranteed) {
        let i = left.indexOf(g);
        if (i < 0 && g === 'rare' && tierDef.rareToLegendaryBp > 0) i = left.indexOf('legendary');
        if (i < 0) {
          ok = false;
          break;
        }
        left.splice(i, 1);
      }
      if (!ok) this.guaranteeViolations += 1;
      // Rolled stacks no pity could touch (A6.5 thresholds, with a margin); a tier with a Rare-to-Legendary
      // chance is left out (its conversion cannot be told apart from a rolled Legendary).
      const p = o.pityBefore;
      const pityFree = p.sinceEpic <= 7 && p.sinceLegendary <= 23 && (o.unownedBefore === 0 || p.sinceNewCard <= 2);
      if (ok && pityFree && tierDef.rareToLegendaryBp === 0) {
        const acc = this.rolled.get(o.tier) ?? [0, 0, 0, 0];
        counts(left).forEach((n, i) => {
          acc[i] = (acc[i] ?? 0) + n;
        });
        this.rolled.set(o.tier, acc);
      }
    }

    // Pity boundaries: every capsule except Age Unlock counts (A6.5).
    if (o.kind !== 'ageUnlock') {
      st.counted += 1;
      st.sinceEpic = rarities.includes('epic') ? 0 : st.sinceEpic + 1;
      st.sinceLegendary = rarities.includes('legendary') ? 0 : st.sinceLegendary + 1;
      const gotNew = o.stacks.some((s) => s.isNew);
      st.sinceNew = gotNew || o.unownedBefore === 0 ? 0 : st.sinceNew + 1;
      this.maxNoEpic = Math.max(this.maxNoEpic, st.sinceEpic);
      this.maxNoLegendary = Math.max(this.maxNoLegendary, st.sinceLegendary);
      this.maxNoNew = Math.max(this.maxNoNew, st.sinceNew);
    }
  }

  summary(): DropsSummary {
    const caps = this.c.capsules;
    const tiers = caps.tierOrder;
    const dailyN = tiers.reduce((a, t) => a + (this.daily.get(t) ?? 0), 0);
    const foilN = FOILS.reduce((a, f) => a + (this.foil.get(f) ?? 0), 0);
    const foilProbs = FOILS.map((f) => (f === 'none' ? 10_000 - FOILS.filter((x) => x !== 'none').reduce((a, x) => a + this.c.rarities.foils[x].rollBp, 0) : this.c.rarities.foils[f].rollBp));
    const rolled = [0, 0, 0, 0];
    for (const acc of this.rolled.values()) acc.forEach((n, i) => (rolled[i] = (rolled[i] ?? 0) + n));
    const rolledN = rolled.reduce((a, b) => a + b, 0);
    const supply = tiers.filter((t) => caps.dailyOddsBp[t] > 0);
    const skinChance: Partial<Record<CapsuleTier, ChiSquare>> = {};
    for (const [tier, [n, yes]] of this.skins) {
      const bp = caps.tiers[tier].skinChanceBp;
      if (n > 0) skinChance[tier] = chiSquare([yes, n - yes], [bp, 10_000 - bp]);
    }
    const skinRarity: Partial<Record<CapsuleTier, ChiSquare>> = {};
    for (const [tier, acc] of this.skinRarities) {
      if (acc.reduce((a, b) => a + b, 0) > 0) skinRarity[tier] = chiSquare(acc, skinRarityWeights(this.c, caps.tiers[tier].skinMinRarity));
    }
    return {
      openings: this.openings,
      bag: { groups: this.bagGroups, badGroups: this.badGroups, firstBad: this.firstBad },
      daily: dailyN > 0 ? chiSquare(supply.map((t) => this.daily.get(t) ?? 0), supply.map((t) => caps.dailyOddsBp[t])) : null,
      foils: foilN > 0 ? chiSquare(FOILS.map((f) => this.foil.get(f) ?? 0), foilProbs) : null,
      rarity: rolledN > 0 ? chiSquare(rolled, RARITIES.map((r) => caps.stackRollBp[r])) : null,
      rarityByTier: Object.fromEntries(this.rolled.entries()),
      skinChance,
      skinRarity,
      stackCountViolations: this.stackViolations,
      guaranteeViolations: this.guaranteeViolations,
      legendaryViolations: this.legendaryViolations,
      sureSkinViolations: this.sureSkinViolations,
      wardrobePityViolations: this.wardrobePityViolations,
      climbViolations: this.climbViolations,
      firstClimbIssue: this.firstClimbIssue,
      tierCounts: Object.fromEntries(this.tierCounts.entries()),
      maxWithoutEpic: this.maxNoEpic,
      maxWithoutLegendary: this.maxNoLegendary,
      maxWithoutNew: this.maxNoNew,
      copiesPerWin: this.winCount ? this.winCopies / this.winCount : Number.NaN,
      amberPerWin: this.winCount ? this.winAmber / this.winCount : Number.NaN,
    };
  }
}

/**
 * The weights a capsule skin's rarity is rolled with (A6.4 step 7, meta `rollSkinRarityFrom`): the
 * Wardrobe odds from `min` up, 0 below it.
 */
export function skinRarityWeights(c: Content, min: SkinRarity): number[] {
  const from = SKIN_RARITIES.indexOf(min);
  return SKIN_RARITIES.map((r, i) => (i >= from ? c.rarities.skins[r].crateOddsBp : 0));
}

function chiCheck(id: string, metric: string, x: ChiSquare | null, k: number): Check {
  const alpha = chiAlpha(k);
  const target = `chi-square p > ${fmtAlpha(alpha)} (${P_MIN} / ${k} checks, Bonferroni)`;
  if (!x) return skippedCheck(id, metric, target, 'no samples');
  return {
    id,
    metric,
    target,
    value: `p = ${x.p.toFixed(4)} (χ² ${x.stat.toFixed(2)}, df ${x.df}, n ${x.n})`,
    verdict: x.p > alpha ? 'pass' : 'fail',
  };
}

function fmtAlpha(a: number): string {
  return Number(a.toPrecision(2)).toString();
}

/** The checks for a drops summary (pity limits from content). */
export function dropsChecks(s: DropsSummary, content: CompiledContent): Check[] {
  const c = asContent(content);
  const pity = c.capsules.pity;
  const size = contentBagSize(c);
  const zero = (id: string, metric: string, n: number, target: string): Check => ({ id, metric, target, value: String(n), verdict: n === 0 ? 'pass' : 'fail' });
  const atMost = (id: string, metric: string, n: number, max: number, target: string): Check => ({ id, metric, target, value: String(n), verdict: n <= max ? 'pass' : 'fail' });
  const tiers = c.capsules.tierOrder;
  // Every chi-square check of this run, so the gate can share its false-alarm budget (Bonferroni).
  const chis: [string, string, ChiSquare | null][] = [
    ['drops.daily', 'Supply Capsule tier odds', s.daily],
    ['drops.rarity', 'Stack rarity roll (no guarantee or pity)', s.rarity],
    ['drops.foils', 'Foil odds per stack (no floors)', s.foils],
    ...tiers
      .filter((t) => c.capsules.tiers[t].skinChanceBp > 0 && c.capsules.tiers[t].skinChanceBp < 10_000)
      .map((t): [string, string, ChiSquare | null] => [`drops.skin.${t}`, `${t} skin chance`, s.skinChance[t] ?? null]),
    ...tiers
      .filter((t) => c.capsules.tiers[t].skinChanceBp > 0)
      .map((t): [string, string, ChiSquare | null] => [`drops.skinRarity.${t}`, `${t} skin rarity (Wardrobe odds from ${c.capsules.tiers[t].skinMinRarity} up)`, s.skinRarity?.[t] ?? null]),
  ];
  return [
    {
      id: 'drops.bag',
      metric: `Sundial Capsule bag: every ${size} hold the published totals`,
      target: 'all groups exact',
      value: `${s.bag.groups - s.bag.badGroups}/${s.bag.groups} groups exact`,
      verdict: s.bag.groups > 0 && s.bag.badGroups === 0 ? 'pass' : s.bag.groups === 0 ? 'skipped' : 'fail',
      ...(s.bag.firstBad ? { note: s.bag.firstBad } : {}),
    },
    ...chis.map(([id, metric, x]) => chiCheck(id, metric, x, chis.length)),
    zero('drops.stackCount', 'Capsules with the wrong stack count', s.stackCountViolations, '0'),
    zero('drops.guarantees', 'Capsules missing a guaranteed rarity', s.guaranteeViolations, '0'),
    zero('drops.legendaries', 'Legendary capsules with too few, repeated or wrongly sized Legendary stacks', s.legendaryViolations, '0'),
    zero('drops.sureSkin', 'Sure-skin capsules without a skin or below the rarity floor', s.sureSkinViolations, '0'),
    zero('drops.wardrobePity', 'Capsules that moved the Wardrobe pity counters', s.wardrobePityViolations, '0'),
    { ...zero('drops.climb', 'Reveals that break the honest climb (A10)', s.climbViolations, '0'), ...(s.firstClimbIssue ? { note: s.firstClimbIssue } : {}) },
    atMost('drops.epicPity', 'Longest run without an Epic stack', s.maxWithoutEpic, pity.epicEvery - 1, `≤ ${pity.epicEvery - 1} capsules`),
    atMost('drops.legendaryPity', 'Longest run without a Legendary', s.maxWithoutLegendary, pity.legendaryGuaranteeAt - 1, `≤ ${pity.legendaryGuaranteeAt - 1} capsules`),
    atMost('drops.newCard', 'Longest run without an unowned card (while any remain)', s.maxWithoutNew, pity.newCardEvery - 1, `≤ ${pity.newCardEvery - 1} capsules`),
  ];
}

export interface DropsOptions {
  openings: number;
  streams: number;
  seed: number;
  /** Every n-th capsule is a Supply Capsule, the rest Sundial Capsules. */
  dailyEvery: number;
}

export function dropsDefaults(mode: 'smoke' | 'full'): DropsOptions {
  return { openings: mode === 'full' ? 1_000_000 : 100_000, streams: 10, seed: 1, dailyEvery: 5 };
}

/** Collectable cards of the drop pool (every age; cards held back by the release gate never drop). */
function poolCards(c: Content): CardId[] {
  return [...Object.values(c.units).filter((u) => u.hidden !== true).map((u) => u.id), ...Object.keys(c.turrets)].filter((id) => isReleased(c, id));
}

function prepareSave(s: SaveDoc, c: Content): SaveDoc {
  const last = c.arenas.list.length - 1;
  const arena = c.arenas.list[last];
  return {
    ...s,
    arenaIndex: last,
    trophies: { ...s.trophies, current: arena?.trophies ?? s.trophies.current, best: Math.max(s.trophies.best, arena?.trophies ?? 0) },
    scriptStep: c.capsules.script.length,
    // The bag is left as the new save has it (empty or full), so bag groups align with the first draw.
    capsules: { ...s.capsules, pending: [] },
  };
}

/** Plays `openings` capsule openings through `meta` and returns the tally. */
export function openCapsules(meta: Meta, content: CompiledContent, o: DropsOptions, onProgress?: (done: number, total: number) => void): DropsTally {
  const c = asContent(content);
  const pool = poolCards(c);
  const tally = new DropsTally(content);
  const perStream = Math.ceil(o.openings / o.streams);
  let done = 0;
  for (let stream = 0; stream < o.streams; stream += 1) {
    let now = Date.UTC(2026, 0, 1, 12);
    const clock: Clock = { now: () => now };
    let save = prepareSave(meta.newSave(content, clock, o.seed + stream), c);
    for (let i = 0; i < perStream && done < o.openings; i += 1) {
      now += 60_000;
      const kind: PendingCapsule['kind'] = (i + 1) % o.dailyEvery === 0 ? 'daily' : 'win';
      const unownedBefore = pool.filter((id) => !(save.collection[id] && save.collection[id].level >= 1)).length;
      const before = new Set(save.capsules.pending.map((p) => p.id));
      save = meta.grantCapsule(save, kind, content, clock);
      const granted = save.capsules.pending.find((p) => !before.has(p.id));
      if (!granted) throw new Error(`grantCapsule('${kind}') added no pending capsule`);
      const opened: { save: SaveDoc; reveal: CapsuleReveal } = meta.openCapsule(save, granted.id);
      save = opened.save;
      // Capsules the meta rules granted on the side (a Supply Capsule, A15.4) are opened too, untallied,
      // as a player would; left pending, their NEW cards stay reserved and never drop elsewhere.
      for (const p of [...save.capsules.pending]) save = meta.openCapsule(save, p.id).save;
      const cap = opened.reveal.capsule;
      tally.add(
        {
          stream,
          kind: cap.kind,
          tier: cap.tier,
          scripted: cap.scriptIndex !== null,
          stacks: cap.contents.stacks.map((s) => ({ rarity: s.rarity, foil: s.foil, isNew: s.isNew, card: s.card, copies: s.copies })),
          skin: cap.contents.skin !== null,
          skinRarity: cap.contents.skin ? (c.skins[cap.contents.skin]?.rarity ?? null) : null,
          pityBefore: opened.reveal.pityBefore,
          pityAfter: opened.reveal.pityAfter,
          unownedBefore,
          climb: { startTier: cap.startTier, climbs: opened.reveal.climbs, strikeClimbs: opened.reveal.strikeClimbs },
        },
        { copies: cap.contents.stacks.reduce((a, s) => a + s.copies, 0), amber: cap.contents.amber },
      );
      done += 1;
      onProgress?.(done, o.openings);
    }
  }
  return tally;
}

export interface DropsData {
  meta: string;
  summary: DropsSummary | null;
}

export async function runDrops(o: DropsOptions, content: CompiledContent = gameContent, onProgress?: (done: number, total: number) => void): Promise<Report<DropsData>> {
  const rep = startReport<DropsData>('drops', 'Ageborn capsule drop statistics (DESIGN A6.4, A6.5, C4.5)', { ...o, contentHash: content.hash });
  const { meta, reason } = await loadMeta();
  if (!meta) {
    return rep.finish([skippedCheck('drops.all', 'Capsule drop statistics', `chi-square family-wise p > ${P_MIN}, bag and pity`, `skipped: ${reason ?? 'no meta'}`)], { meta: 'unavailable', summary: null }, [
      `Skipped until the meta rules exist: ${reason ?? 'unknown reason'}.`,
    ]);
  }
  try {
    const s = openCapsules(meta, content, o, onProgress).summary();
    return rep.finish(dropsChecks(s, content), { meta: 'src/meta', summary: s }, [
      `A6.9 reference (the 2026-09-29 ladder): 16.05 copies and 411.3 Amber per bag capsule before pity; measured ${fmtNum(s.copiesPerWin, 2)} copies and ${fmtNum(s.amberPerWin, 1)} Amber per Sundial Capsule.`,
    ]);
  } catch (e) {
    return rep.finish([{ id: 'drops.run', metric: 'Capsule openings through Meta', target: 'runs', value: 'error', verdict: 'fail', note: String(e) }], { meta: 'src/meta', summary: null });
  }
}

export function dropsSections(r: Report<DropsData>): string[] {
  const s = r.data.summary;
  if (!s) return [];
  const c = asContent(gameContent);
  const row = (name: string, x: ChiSquare | null): (string | number)[] => [name, x ? x.observed.join(' / ') : '-', x ? x.expected.map((e) => e.toFixed(0)).join(' / ') : '-', x ? x.p.toFixed(4) : '-'];
  const supply = c.capsules.tierOrder.filter((t) => c.capsules.dailyOddsBp[t] > 0);
  const skins = (Object.keys(s.skinChance) as CapsuleTier[]).map((t) => row(`${t} skin (yes/no)`, s.skinChance[t] ?? null));
  const skinRarities = c.capsules.tierOrder
    .filter((t) => s.skinRarity?.[t])
    .map((t) => row(`${t} skin rarity (rare/epic/legendary)`, s.skinRarity[t] ?? null));
  const counts = c.capsules.tierOrder.map((t) => `${t} ${s.tierCounts[t] ?? 0}`).join(', ');
  return [
    '## Distributions',
    '',
    markdownTable(
      ['Test', 'Observed', 'Expected', 'p'],
      [row(`Supply tiers (${supply.join('/')})`, s.daily), row('Stack rarity (common/rare/epic/legendary)', s.rarity), row('Foils (holo/silver/bronze/none)', s.foils), ...skins, ...skinRarities],
    ),
    '',
    `${s.openings} openings; ${s.bag.groups} full bags checked. Openings by tier: ${counts}.`,
  ];
}
