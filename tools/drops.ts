/**
 * Capsule drop statistics (DESIGN B12 `sim:drops`, A6.4, A6.5, C4.5 meta honesty).
 *
 * Opens many capsules through the `Meta` contract (`grantCapsule` then `openCapsule`, exactly as the app
 * does) on fresh saves in the last arena (full drop pool, random Legendaries on), with the onboarding
 * script already done, and checks what players are told:
 *
 * - **Bag totals**: every 100 Win Capsules hold exactly 30 Clay, 40 Bronze, 20 Silver, 7 Jade, 3 Aeon.
 * - **Chi-square at p > 0.01**: Daily Capsule tiers, the stack rarity roll (72/22/5/1, on stacks that no
 *   guarantee or pity could touch), foils per stack, and the Aeon skin chance.
 * - **Guarantees and pity boundaries**: the tier's stack count and guaranteed rarities; an Epic stack at
 *   least every 10 capsules; a Legendary by capsule 40; an unowned card at least every 5 capsules while
 *   the pool has unowned cards.
 *
 * The analysis (`DropsTally`) is pure and fed one opened capsule at a time, so it runs in constant memory
 * for 10^6 openings. Without `src/meta` (WP7) the tool writes a skipped report and exits 0.
 */
import type { CapsuleReveal, CapsuleTier, CardId, Clock, CompiledContent, Foil, Meta, PendingCapsule, Rarity, SaveDoc } from '../src/contracts';
import { asContent, content as gameContent, type Content } from '../src/content';
import { loadMeta } from './lib/modules';
import { chiSquare, type ChiSquare } from './lib/stats';
import { fmtNum, markdownTable, skippedCheck, startReport, type Check, type Report } from './report';

/** DESIGN C4.5: published odds pass the chi-square test at p > 0.01. */
export const P_MIN = 0.01;

export interface OpenedCapsule {
  stream: number;
  kind: PendingCapsule['kind'];
  tier: CapsuleTier;
  scripted: boolean;
  stacks: { rarity: Rarity; foil: Foil; isNew: boolean; card: CardId }[];
  skin: boolean;
  pityBefore: SaveDoc['pity'];
  /** Unowned cards in the drop pool before this capsule. */
  unownedBefore: number;
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

export interface DropsSummary {
  openings: number;
  bag: { groups: number; badGroups: number; firstBad: string | null };
  daily: ChiSquare | null;
  foils: ChiSquare | null;
  rarity: ChiSquare | null;
  rarityByTier: Partial<Record<CapsuleTier, number[]>>;
  aeonSkin: ChiSquare | null;
  stackCountViolations: number;
  guaranteeViolations: number;
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
  private aeon = 0;
  private aeonSkins = 0;
  private stackViolations = 0;
  private guaranteeViolations = 0;
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

    for (const s of o.stacks) this.foil.set(s.foil, (this.foil.get(s.foil) ?? 0) + 1);
    if (o.kind === 'daily' && !o.scripted) this.daily.set(o.tier, (this.daily.get(o.tier) ?? 0) + 1);
    if (o.tier === 'aeon' && !o.scripted) {
      this.aeon += 1;
      if (o.skin) this.aeonSkins += 1;
    }

    // Bag: groups of 100 bag-drawn Win Capsules.
    if (o.kind === 'win' && !o.scripted) {
      this.winCount += 1;
      this.winCopies += extra.copies;
      this.winAmber += extra.amber;
      st.bagGroup.push(o.tier);
      if (st.bagGroup.length === 100) {
        this.bagGroups += 1;
        const bad = caps.tierOrder.filter((t) => st.bagGroup.filter((x) => x === t).length !== caps.bag[t]);
        if (bad.length > 0) {
          this.badGroups += 1;
          this.firstBad ??= `stream ${o.stream}, group ${this.bagGroups}: ${caps.tierOrder.map((t) => `${t} ${st.bagGroup.filter((x) => x === t).length}`).join(', ')}`;
        }
        st.bagGroup = [];
      }
    }

    // Stack count and guarantees (the Jade Rare may have become a Legendary).
    if (o.kind !== 'age' && o.kind !== 'ageUnlock' && !o.scripted) {
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
      // Rolled stacks no pity could touch (A6.5 thresholds, with a margin); Jade excluded (its conversion
      // cannot be told apart from a rolled Legendary).
      const p = o.pityBefore;
      const pityFree = p.sinceEpic <= 7 && p.sinceLegendary <= 23 && (o.unownedBefore === 0 || p.sinceNewCard <= 2);
      if (ok && pityFree && o.tier !== 'jade') {
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
    const skinBp = caps.tiers.aeon.skinChanceBp;
    return {
      openings: this.openings,
      bag: { groups: this.bagGroups, badGroups: this.badGroups, firstBad: this.firstBad },
      daily: dailyN > 0 ? chiSquare(tiers.map((t) => this.daily.get(t) ?? 0), tiers.map((t) => caps.dailyOddsBp[t])) : null,
      foils: foilN > 0 ? chiSquare(FOILS.map((f) => this.foil.get(f) ?? 0), foilProbs) : null,
      rarity: rolledN > 0 ? chiSquare(rolled, RARITIES.map((r) => caps.stackRollBp[r])) : null,
      rarityByTier: Object.fromEntries(this.rolled.entries()),
      aeonSkin: this.aeon > 0 ? chiSquare([this.aeonSkins, this.aeon - this.aeonSkins], [skinBp, 10_000 - skinBp]) : null,
      stackCountViolations: this.stackViolations,
      guaranteeViolations: this.guaranteeViolations,
      maxWithoutEpic: this.maxNoEpic,
      maxWithoutLegendary: this.maxNoLegendary,
      maxWithoutNew: this.maxNoNew,
      copiesPerWin: this.winCount ? this.winCopies / this.winCount : Number.NaN,
      amberPerWin: this.winCount ? this.winAmber / this.winCount : Number.NaN,
    };
  }
}

function chiCheck(id: string, metric: string, x: ChiSquare | null): Check {
  if (!x) return skippedCheck(id, metric, `chi-square p > ${P_MIN}`, 'no samples');
  return {
    id,
    metric,
    target: `chi-square p > ${P_MIN}`,
    value: `p = ${x.p.toFixed(4)} (χ² ${x.stat.toFixed(2)}, df ${x.df}, n ${x.n})`,
    verdict: x.p > P_MIN ? 'pass' : 'fail',
  };
}

/** The checks for a drops summary (pity limits from content). */
export function dropsChecks(s: DropsSummary, content: CompiledContent): Check[] {
  const pity = asContent(content).capsules.pity;
  const zero = (id: string, metric: string, n: number, target: string): Check => ({ id, metric, target, value: String(n), verdict: n === 0 ? 'pass' : 'fail' });
  const atMost = (id: string, metric: string, n: number, max: number, target: string): Check => ({ id, metric, target, value: String(n), verdict: n <= max ? 'pass' : 'fail' });
  return [
    {
      id: 'drops.bag',
      metric: 'Win Capsule bag: every 100 hold the published totals',
      target: 'all groups exact',
      value: `${s.bag.groups - s.bag.badGroups}/${s.bag.groups} groups exact`,
      verdict: s.bag.groups > 0 && s.bag.badGroups === 0 ? 'pass' : s.bag.groups === 0 ? 'skipped' : 'fail',
      ...(s.bag.firstBad ? { note: s.bag.firstBad } : {}),
    },
    chiCheck('drops.daily', 'Daily Capsule tier odds', s.daily),
    chiCheck('drops.rarity', 'Stack rarity roll (no guarantee or pity)', s.rarity),
    chiCheck('drops.foils', 'Foil odds per stack', s.foils),
    chiCheck('drops.aeonSkin', 'Aeon skin chance', s.aeonSkin),
    zero('drops.stackCount', 'Capsules with the wrong stack count', s.stackCountViolations, '0'),
    zero('drops.guarantees', 'Capsules missing a guaranteed rarity', s.guaranteeViolations, '0'),
    atMost('drops.epicPity', 'Longest run without an Epic stack', s.maxWithoutEpic, pity.epicEvery - 1, `≤ ${pity.epicEvery - 1} capsules`),
    atMost('drops.legendaryPity', 'Longest run without a Legendary', s.maxWithoutLegendary, pity.legendaryGuaranteeAt - 1, `≤ ${pity.legendaryGuaranteeAt - 1} capsules`),
    atMost('drops.newCard', 'Longest run without an unowned card (while any remain)', s.maxWithoutNew, pity.newCardEvery - 1, `≤ ${pity.newCardEvery - 1} capsules`),
  ];
}

export interface DropsOptions {
  openings: number;
  streams: number;
  seed: number;
  /** Every n-th capsule is a Daily Capsule, the rest Win Capsules. */
  dailyEvery: number;
}

export function dropsDefaults(mode: 'smoke' | 'full'): DropsOptions {
  return { openings: mode === 'full' ? 1_000_000 : 100_000, streams: 10, seed: 1, dailyEvery: 5 };
}

/** Collectable cards of the drop pool (every age). */
function poolCards(c: Content): CardId[] {
  return [...Object.values(c.units).filter((u) => u.hidden !== true).map((u) => u.id), ...Object.keys(c.turrets)];
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
      const cap = opened.reveal.capsule;
      tally.add(
        {
          stream,
          kind: cap.kind,
          tier: cap.tier,
          scripted: cap.scriptIndex !== null,
          stacks: cap.contents.stacks.map((s) => ({ rarity: s.rarity, foil: s.foil, isNew: s.isNew, card: s.card })),
          skin: cap.contents.skin !== null,
          pityBefore: opened.reveal.pityBefore,
          unownedBefore,
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
    return rep.finish([skippedCheck('drops.all', 'Capsule drop statistics', `chi-square p > ${P_MIN}, bag and pity`, `skipped: ${reason ?? 'no meta'}`)], { meta: 'unavailable', summary: null }, [
      `Skipped until the meta rules exist: ${reason ?? 'unknown reason'}.`,
    ]);
  }
  try {
    const s = openCapsules(meta, content, o, onProgress).summary();
    return rep.finish(dropsChecks(s, content), { meta: 'src/meta', summary: s }, [
      `A6.9 reference: 9.1 copies and 227 Amber per bag capsule before pity; measured ${fmtNum(s.copiesPerWin, 2)} copies and ${fmtNum(s.amberPerWin, 1)} Amber per Win Capsule.`,
    ]);
  } catch (e) {
    return rep.finish([{ id: 'drops.run', metric: 'Capsule openings through Meta', target: 'runs', value: 'error', verdict: 'fail', note: String(e) }], { meta: 'src/meta', summary: null });
  }
}

export function dropsSections(r: Report<DropsData>): string[] {
  const s = r.data.summary;
  if (!s) return [];
  const row = (name: string, x: ChiSquare | null): (string | number)[] => [name, x ? x.observed.join(' / ') : '-', x ? x.expected.map((e) => e.toFixed(0)).join(' / ') : '-', x ? x.p.toFixed(4) : '-'];
  return [
    '## Distributions',
    '',
    markdownTable(
      ['Test', 'Observed', 'Expected', 'p'],
      [row('Daily tiers (clay/bronze/silver/jade/aeon)', s.daily), row('Stack rarity (common/rare/epic/legendary)', s.rarity), row('Foils (holo/silver/bronze/none)', s.foils), row('Aeon skin (yes/no)', s.aeonSkin)],
    ),
    '',
    `${s.openings} openings; ${s.bag.groups} full bags checked.`,
  ];
}
