/**
 * Opening builds (DESIGN A7.2 "Openings"): each personality opens with its first 3-4 actions, with
 * seeded variation. `BotProfile.openings` carries the build as a list of steps:
 *
 * | Step | Meaning |
 * |---|---|
 * | `train:<group>` | train the tray card of that role group (infantry, ranged, heavy, antiArmor, support, epic, legendary) |
 * | `train:any` | train the cheapest tray card |
 * | `turret` | build a turret on the first empty owned mount |
 * | `mount` | buy the next mount |
 * | `treasury` | start the next Economy income research (Granary, then Market; A18.5.4) |
 * | `a\|b` | one of the alternatives, chosen by the bot's seeded RNG |
 * | `favorite:<card>` | not a step: a procedural Commander's favourite card (A7.4), trained a little more often |
 * | `rule:noStance` | not a step: the match locks this side's stance (training matches), so the bot never toggles it |
 * | `rule:autoLastStand` | not a step: Last Stand is automatic-only for this side, so the bot never fires it |
 *
 * Unknown steps are ignored. After the steps are resolved, one pair of neighbouring steps after the
 * first may swap (seeded), so two matches against the same General do not open identically.
 */
import type { CardId, RoleGroup } from '@/contracts';
import { chanceBp, MILLI, nextIncomePick, randInt, researchCost, type Sfc32State } from '@/core';
import type { BotAction } from './actions';
import type { CardBook } from './book';
import type { View } from './view';

export type OpeningStep =
  | { kind: 'train'; group: RoleGroup | 'any' }
  | { kind: 'turret' }
  | { kind: 'mount' }
  | { kind: 'treasury' };

export interface OpeningPlan {
  steps: OpeningStep[];
  favorite: CardId | null;
  /** Match rules the session disclosed (training matches, DESIGN A8, A2.11). */
  noStance: boolean;
  autoLastStand: boolean;
}

/** Limits the tier puts on opening steps (A7.3 Treasury max and Max turrets). */
export interface OpeningLimits {
  treasuryMax: number;
  mountCap: number;
}

const GROUPS: readonly (RoleGroup | 'any')[] = ['infantry', 'ranged', 'heavy', 'antiArmor', 'support', 'epic', 'legendary', 'any'];
/** Chance that two neighbouring steps (after the first) swap, bp. */
const SWAP_BP = 3000;

function parseStep(token: string): OpeningStep | null {
  const t = token.trim();
  if (t === 'turret' || t === 'mount' || t === 'treasury') return { kind: t };
  if (t.startsWith('train:')) {
    const g = t.slice('train:'.length) as RoleGroup | 'any';
    return GROUPS.includes(g) ? { kind: 'train', group: g } : null;
  }
  return null;
}

/** Resolves the opening steps of a profile with the bot's RNG. */
export function parseOpenings(tokens: readonly string[], rng: Sfc32State): OpeningPlan {
  const steps: OpeningStep[] = [];
  let favorite: CardId | null = null;
  let noStance = false;
  let autoLastStand = false;
  for (const token of tokens) {
    if (token.startsWith('favorite:')) {
      favorite = token.slice('favorite:'.length).trim() || null;
      continue;
    }
    if (token === 'rule:noStance') {
      noStance = true;
      continue;
    }
    if (token === 'rule:autoLastStand') {
      autoLastStand = true;
      continue;
    }
    const alts = token.split('|');
    const chosen = alts.length > 1 ? (alts[randInt(rng, alts.length)] as string) : token;
    const step = parseStep(chosen);
    if (step) steps.push(step);
  }
  if (steps.length >= 3 && chanceBp(rng, SWAP_BP)) {
    const i = 1 + randInt(rng, steps.length - 2);
    const a = steps[i] as OpeningStep;
    steps[i] = steps[i + 1] as OpeningStep;
    steps[i + 1] = a;
  }
  return { steps, favorite, noStance, autoLastStand };
}

/**
 * What an opening step asks for right now: an action, `wait` (not affordable yet) or `skip` (not
 * possible with this loadout or position). Legality checks match the brain's.
 */
export function resolveStep(
  step: OpeningStep,
  v: View,
  book: CardBook,
  limits: OpeningLimits,
  chooseTurret: (v: View) => BotAction | null,
): BotAction | 'wait' | 'skip' {
  switch (step.kind) {
    case 'train': {
      const options = v.tray.filter((s) => step.group === 'any' || s.card.group === step.group);
      if (options.length === 0) return 'skip';
      const pick = options.reduce((a, b) => (b.card.cost < a.card.cost ? b : a));
      if (pick.card.legendary && v.legendaryInField) return 'skip';
      if (v.queue.length >= book.econ.queueMax) return 'wait';
      if (v.gold < pick.card.cost) return 'wait';
      return { kind: 'train', slot: pick.slot, card: pick.card.id, cost: pick.card.cost };
    }
    case 'turret': {
      const free = v.turrets.findIndex((t, m) => m < v.mountsOwned && t === null && !v.mountBusy[m]);
      if (free < 0) return 'skip';
      return chooseTurret(v) ?? 'wait';
    }
    case 'mount': {
      if (v.mountsOwned >= Math.min(book.econ.mountCount, limits.mountCap)) return 'skip';
      const cost = book.econ.mountCosts[v.mountsOwned] ?? 0;
      return v.gold >= cost ? { kind: 'mount', cost } : 'wait';
    }
    case 'treasury': {
      // The Treasury is now the Economy track's income picks (A18.5.4): Granary, then Market.
      if (v.treasury >= limits.treasuryMax) return 'skip';
      const pick = nextIncomePick(book.content, v.research);
      if (!pick) return v.research.current !== null ? 'wait' : 'skip';
      const cost = researchCost(book.content, pick) * MILLI;
      return v.gold >= cost ? { kind: 'research', pick, cost } : 'wait';
    }
  }
}
