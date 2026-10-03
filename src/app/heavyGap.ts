/**
 * The "no answer to Heavies" detector (DESIGN A9.2 counter hint, A15.12 Result tip; owner feedback
 * 2026-09-29 "Heavy is very strong").
 *
 * It notes the first moment the enemy fields Heavies (core `heavyThreat`: 2+ Heavies on the lane, or
 * Heavies 40%+ of the value there) while the player's loadout for the current age holds no Anti-heavy
 * card. After a loss where that happened the Result says "Add {card} to {age}: it beats Heavies.",
 * naming the age's Anti-heavy card. Pure over the sim state; it checks once a second.
 */
import type { AgeId, CardId, CompiledContent, MatchConfig, RoleGroup, Side, SimState } from '@/contracts';
import { heavyThreat } from '@/core/cardClass';

/** Checks once a second (20 ticks). */
const CHECK_TICKS = 20;

/** The loss tip's i18n key. */
export const HEAVY_GAP_TIP_KEY = 'app.tip.heavyGap';

export interface HeavyGap {
  age: AgeId;
  /** The age's Anti-heavy card (the Anti-armor role group's Rare). */
  card: CardId;
}

/** The Anti-heavy card of an age (the first in key order), or null. */
export function antiHeavyOf(content: CompiledContent, age: AgeId): CardId | null {
  return Object.keys(content.units).find((id) => {
    const u = content.units[id];
    return u !== undefined && !u.hidden && u.released !== false && u.age === age && u.group === 'antiArmor' && u.rarity === 'rare';
  }) ?? null;
}

export class HeavyGapDetector {
  private found: HeavyGap | null = null;

  constructor(
    private readonly config: Readonly<MatchConfig>,
    private readonly side: Side,
  ) {}

  /** The first gap seen this match, or null. */
  get gap(): HeavyGap | null {
    return this.found;
  }

  update(state: Readonly<SimState>): void {
    if (this.found || state.tick % CHECK_TICKS !== 0) return;
    const content = this.config.content;
    const age = content.formats[this.config.format]?.ages[state.sides[this.side].ageIndex];
    if (!age) return;
    const units = this.config.sides[this.side].loadouts[age]?.units ?? [];
    if (units.some((c) => c !== null && content.units[c]?.group === 'antiArmor')) return;
    const foes: { group: RoleGroup; value: number }[] = [];
    for (const u of state.units) {
      const d = u.side !== this.side && u.hp > 0 ? content.units[u.card] : undefined;
      if (d) foes.push({ group: d.group, value: d.cost });
    }
    if (!heavyThreat(foes)) return;
    const card = antiHeavyOf(content, age);
    if (card) this.found = { age, card };
  }
}
