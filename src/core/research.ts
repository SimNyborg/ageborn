/**
 * War Council helpers shared by the AI, the HUD, the tutorial and tools (DESIGN A18.5). Pure reads of
 * `content.research` and a `ResearchView`; the sim is the authority (`sim/research.ts` validates every
 * command), these only say what a side could start and what it costs before discounts.
 */
import type { Command, CompiledContent, ResearchPickDef, ResearchView, Side } from '@/contracts';

/** The pick with this id, or undefined. */
export function researchPick(content: CompiledContent, id: string): ResearchPickDef | undefined {
  return content.research.picks.find((p) => p.id === id);
}

/** The window position (0-based) at which `rank` opens for a window of `length` ages, or null (A18.5.1). */
export function rankOpensAt(content: CompiledContent, rank: 1 | 2 | 3, length: number): number | null {
  let best: readonly number[] = [];
  let bestLen = 0;
  for (const k of Object.keys(content.research.unlockAt)) {
    const n = Number(k);
    const row = content.research.unlockAt[k];
    if (!row || !Number.isInteger(n) || n > length || n < bestLen) continue;
    best = row;
    bestLen = n;
  }
  return best[rank - 1] ?? null;
}

/** List price of a pick in whole gold (the underdog discount, −20%, is applied by the sim). */
export function researchCost(content: CompiledContent, p: ResearchPickDef): number {
  return content.research.cost[p.track][p.rank - 1] ?? 0;
}

/** The research command for a pick. */
export function researchCommand(side: Side, p: ResearchPickDef): Extract<Command, { t: 'research' }> {
  return p.group
    ? { t: 'research', side, track: p.track, group: p.group, rank: p.rank, pick: p.pick }
    : { t: 'research', side, track: p.track, rank: p.rank, pick: p.pick };
}

/**
 * Picks the side could start now if it had the gold: the slot is free, the pick and its pair partner
 * are not owned, its rank is open (`view.ranksOpen`, A18.5.1) and the rank below in its line is owned.
 */
export function startablePicks(content: CompiledContent, view: ResearchView): ResearchPickDef[] {
  if (view.current !== null) return [];
  const owned = new Set(view.owned);
  const picks = content.research.picks;
  const line = (p: ResearchPickDef, q: ResearchPickDef): boolean => p.track === q.track && p.group === q.group;
  return picks.filter((p) => {
    if (owned.has(p.id) || p.rank > view.ranksOpen) return false;
    if (picks.some((q) => line(p, q) && q.rank === p.rank && q.id !== p.id && owned.has(q.id))) return false;
    if (p.rank > 1 && !picks.some((q) => line(p, q) && q.rank === p.rank - 1 && owned.has(q.id))) return false;
    return true;
  });
}

/**
 * The next Economy income pick (Granary, then Market) the side could start now, or null: the HUD's
 * gold-counter tap and simple scripts use it where the Treasury used to be (A18.5.4).
 */
export function nextIncomePick(content: CompiledContent, view: ResearchView): ResearchPickDef | null {
  const income = startablePicks(content, view).filter((p) => p.track === 'economy' && p.effects.some((e) => e.kind === 'income'));
  income.sort((a, b) => a.rank - b.rank);
  return income[0] ?? null;
}

/** Income of a pick, milli-gold per second (0 for picks without income). */
export function pickIncomeMilliPerSec(p: ResearchPickDef): number {
  let sum = 0;
  for (const e of p.effects) if (e.kind === 'income') sum += e.milliGoldPerSec;
  return sum;
}

/** Summed Economy income of the owned picks, milli-gold per second (for gold-per-second displays). */
export function incomeMilliPerSec(content: CompiledContent, owned: readonly string[]): number {
  let sum = 0;
  for (const id of owned) {
    const p = researchPick(content, id);
    if (!p) continue;
    for (const e of p.effects) if (e.kind === 'income') sum += e.milliGoldPerSec;
  }
  return sum;
}
