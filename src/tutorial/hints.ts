/**
 * Adaptive hints (DESIGN A8): "fire at most once per 30 s, only on failure patterns, and at most 3
 * times each". Each hint watches one failure pattern over the sim state and events of the player's
 * side; counts persist in `SaveDoc.tutorial.hintsShown` (the app loads and stores them).
 *
 * | Hint | Failure pattern |
 * |---|---|
 * | Their turret shreds melee. Try Pebblers. | 3 of your melee units killed by turrets within 20 s |
 * | Heavies! Send {card}. | The enemy fields Heavies (2+ on the lane or 40%+ of their value, A9.2) while your tray holds an Anti-heavy card |
 * | Your power is ready. | Power full for 15 s with 3+ enemies on your half |
 * | Evolve before they do. | Evolve available and unused for 10 s |
 * | Buy another turret mount. | Every owned mount built, the next one affordable, your base hit in the last 10 s |
 * | Hold: gather at the line, then push. | Stance available, on Charge, 4 losses within 20 s while outnumbered |
 * | Old turret? Tap it to modernise. | An older-age turret, Modernise affordable, for 15 s, evolve not ready |
 *
 * The modernise hint points at the old turret's mount (mount 0 or 1), so the player sees which one
 * is meant; while Evolve is ready it stays quiet, because evolving first is the better move.
 */
import type { CardId, RoleGroup, SimEvent } from '@/contracts';
import { heavyThreat } from '@/core/cardClass';
import { ADAPTIVE, ADAPTIVE_HINTS, type AdaptiveHintDef, type AdaptiveHintId, type PromptTarget } from './scripts';
import { LANE_MILLI, PPM_FULL, evolveReady, goldOf, loadoutUnits, other, pOf, trayCard, type TickInput } from './view';

interface Death {
  tick: number;
  card: CardId;
  killerKind: Extract<SimEvent, { e: 'died' }>['killerKind'];
  killerCard: CardId | null;
}

export interface AdaptiveHintsOptions {
  /** Shows per hint id so far (from the save). Mutated copy is available via `shown()`. */
  shown?: Record<string, number>;
  /** Hints switched off for this match (for example stance hints when the stance is off). */
  disabled?: readonly AdaptiveHintId[];
}

export class AdaptiveHints {
  private readonly counts: Record<string, number>;
  private readonly disabled: Set<AdaptiveHintId>;
  private deaths: Death[] = [];
  private lastHintTick = -Infinity;
  private lastBaseHitTick = -Infinity;
  /** Ticks of the rope beats (`crumbled`) on our base inside the window. */
  private crumbles: number[] = [];
  private powerFullSince: number | null = null;
  private evolveReadySince: number | null = null;
  private outdatedSince: number | null = null;
  /** Hints already shown in this match: each shows at most once per match (C5 #2). */
  private readonly thisMatch = new Set<AdaptiveHintId>();
  /** Patterns detected outside this class (the app's trickle detector, A16.6). */
  private readonly reported = new Set<AdaptiveHintId>();

  constructor(o: AdaptiveHintsOptions = {}) {
    this.counts = { ...(o.shown ?? {}) };
    this.disabled = new Set(o.disabled ?? []);
  }

  /** A pattern found by a detector outside the tutorial layer (the trickle detector, A16.6). */
  report(id: AdaptiveHintId): void {
    this.reported.add(id);
  }

  /** Shows per hint id, including this match. */
  shown(): Record<string, number> {
    return { ...this.counts };
  }

  /**
   * Feeds one tick. Returns the hint to show now, or null. `quiet` = a scripted prompt is on screen:
   * patterns are still tracked but nothing fires.
   */
  update(i: TickInput, quiet = false): AdaptiveHintDef | null {
    this.track(i);
    if (quiet || i.state.phase === 'ended') return null;
    if (i.state.tick - this.lastHintTick < ADAPTIVE.gapTicks) return null;
    if (this.thisMatch.size >= ADAPTIVE.maxPerMatch) return null;
    for (const def of ADAPTIVE_HINTS) {
      if (this.disabled.has(def.id) || this.thisMatch.has(def.id) || (this.counts[def.id] ?? 0) >= ADAPTIVE.maxPerHint) continue;
      if (!this.matches(def.id, i)) continue;
      this.counts[def.id] = (this.counts[def.id] ?? 0) + 1;
      this.thisMatch.add(def.id);
      this.lastHintTick = i.state.tick;
      this.resetPattern(def.id);
      if (def.id === 'modernise') return { ...def, target: this.outdatedMountTarget(i) };
      if (def.id === 'heaviesStopInfantry') {
        const slot = antiHeavySlot(i);
        const card = slot === null ? null : trayCard(i, slot);
        const nameKey = card ? i.config.content.units[card]?.nameKey : undefined;
        return { ...def, target: slot !== null && slot <= 6 ? (`card${slot}` as PromptTarget) : null, ...(nameKey ? { varKeys: { card: nameKey } } : {}) };
      }
      return def;
    }
    return null;
  }

  private track(i: TickInput): void {
    const tick = i.state.tick;
    for (const e of i.events) {
      if (e.e === 'died' && e.side === i.side) {
        this.deaths.push({ tick, card: e.card, killerKind: e.killerKind, killerCard: e.killerCard });
      } else if (e.e === 'baseDamaged' && e.side === i.side) {
        this.lastBaseHitTick = tick;
      } else if (e.e === 'crumbled' && e.side === i.side) {
        this.crumbles.push(tick);
      }
    }
    this.deaths = this.deaths.filter((d) => tick - d.tick <= ADAPTIVE.windowTicks);
    this.crumbles = this.crumbles.filter((t) => tick - t <= ADAPTIVE.windowTicks);
    const me = i.state.sides[i.side];
    this.powerFullSince = me.powerPpm[0] >= PPM_FULL ? (this.powerFullSince ?? tick) : null;
    this.evolveReadySince = evolveReady(i) ? (this.evolveReadySince ?? tick) : null;
    this.outdatedSince = this.moderniseAffordable(i) ? (this.outdatedSince ?? tick) : null;
  }

  private resetPattern(id: AdaptiveHintId): void {
    const tick = this.lastHintTick;
    if (id === 'turretShredsMelee' || id === 'hold') this.deaths = [];
    if (id === 'crumbling') this.crumbles = [];
    if (id === 'powerReady') this.powerFullSince = tick;
    if (id === 'evolveFirst') this.evolveReadySince = tick;
    if (id === 'modernise') this.outdatedSince = tick;
    this.reported.delete(id);
  }

  private matches(id: AdaptiveHintId, i: TickInput): boolean {
    const tick = i.state.tick;
    const units = i.config.content.units;
    switch (id) {
      case 'crumbling':
        return this.crumbles.length >= ADAPTIVE.crumbleBeats;
      case 'turretShredsMelee': {
        const hasRanged = loadoutUnits(i).some((c) => units[c]?.tags.includes('ranged'));
        const n = this.deaths.filter((d) => d.killerKind === 'turret' && units[d.card]?.tags.includes('melee')).length;
        return hasRanged && n >= ADAPTIVE.deaths;
      }
      case 'heaviesStopInfantry': {
        if (antiHeavySlot(i) === null) return false;
        const foe = other(i.side);
        const foes: { group: RoleGroup; value: number }[] = [];
        for (const u of i.state.units) {
          const d = u.side === foe && u.hp > 0 ? units[u.card] : undefined;
          if (d) foes.push({ group: d.group, value: d.cost });
        }
        return heavyThreat(foes);
      }
      case 'powerReady': {
        if (this.powerFullSince === null || tick - this.powerFullSince < ADAPTIVE.powerIdleTicks) return false;
        const foe = other(i.side);
        const near = i.state.units.filter((u) => u.side === foe && pOf(u.x, i.side) < LANE_MILLI / 2).length;
        return near >= ADAPTIVE.powerCrowd;
      }
      case 'evolveFirst':
        return this.evolveReadySince !== null && tick - this.evolveReadySince >= ADAPTIVE.evolveIdleTicks;
      case 'buyMount': {
        const me = i.state.sides[i.side];
        const next = i.config.content.economy.mountCosts[me.mountsOwned];
        if (next === undefined || me.mountsOwned >= me.turrets.length) return false;
        const allBuilt = me.turrets.slice(0, me.mountsOwned).every((t) => t !== null);
        return allBuilt && goldOf(i) >= next && tick - this.lastBaseHitTick <= ADAPTIVE.baseHitTicks;
      }
      case 'hold': {
        const me = i.state.sides[i.side];
        const stanceOn = i.config.training?.stanceEnabled?.[i.side] ?? true;
        if (!stanceOn || me.stance !== 'charge') return false;
        const mine = i.state.units.filter((u) => u.side === i.side).length;
        const theirs = i.state.units.filter((u) => u.side !== i.side).length;
        return this.deaths.length >= ADAPTIVE.holdDeaths && theirs > mine;
      }
      case 'modernise':
        return this.outdatedSince !== null && tick - this.outdatedSince >= ADAPTIVE.outdatedTicks && !evolveReady(i);
      case 'trickle':
        return this.reported.has('trickle');
      default:
        return false;
    }
  }

  /** An active turret from an older age whose Modernise (new price − 50% of old) is affordable. */
  /** The mount of the first older-age turret, as a prompt target (only mounts 0 and 1 have one). */
  private outdatedMountTarget(i: TickInput): AdaptiveHintDef['target'] {
    const me = i.state.sides[i.side];
    const ages = i.config.content.ages;
    const now = currentAgeIndex(i);
    const k = me.turrets.findIndex((t) => t !== null && t.state === 'active' && ages[t.age].index < now);
    return k === 0 ? 'mount0' : k === 1 ? 'mount1' : null;
  }

  private moderniseAffordable(i: TickInput): boolean {
    const me = i.state.sides[i.side];
    const content = i.config.content;
    const age = content.formats[i.config.format]?.ages[me.ageIndex];
    const lo = age ? i.config.sides[i.side].loadouts[age] : undefined;
    const newCosts = (lo?.turrets ?? []).flatMap((c) => (c && content.turrets[c] ? [content.turrets[c].cost] : []));
    if (newCosts.length === 0) return false;
    const cheapest = Math.min(...newCosts);
    const gold = goldOf(i);
    const now = currentAgeIndex(i);
    return me.turrets.some((t) => {
      if (!t || t.state !== 'active' || content.ages[t.age].index >= now) return false;
      const old = content.turrets[t.card]?.cost ?? 0;
      return gold >= cheapest - Math.floor((old * content.economy.sellRefundBp) / 10000);
    });
  }
}

/**
 * The global `AgeDef.index` of the side's current age. `SideState.ageIndex` is the position in the
 * format, which differs from the global index when a format skips ages (the tutorial, A17.15 rule 4).
 */
function currentAgeIndex(i: TickInput): number {
  const me = i.state.sides[i.side];
  const content = i.config.content;
  const age = content.formats[i.config.format]?.ages[me.ageIndex];
  return age ? content.ages[age].index : me.ageIndex;
}

/**
 * The tray slot of the player's Anti-heavy card in the current age (the Anti-armor role group), or
 * null. A slot a scripted tray keeps locked (match 1) does not count.
 */
function antiHeavySlot(i: TickInput): number | null {
  const age = i.config.content.formats[i.config.format]?.ages[i.state.sides[i.side].ageIndex];
  const units = i.config.sides[i.side].loadouts[age ?? 'stone']?.units ?? [];
  const tray = age ? i.config.training?.trays?.[age] : undefined;
  for (let slot = 0; slot < units.length; slot += 1) {
    const c = units[slot];
    if (!c || i.config.content.units[c]?.group !== 'antiArmor') continue;
    if (tray && !tray.includes(slot)) continue;
    return slot;
  }
  return null;
}
