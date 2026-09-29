/**
 * Hidden feats (DESIGN A15.10).
 *
 * - {@link createFeatTracker} is a pure tracker the session feeds each tick's `SimEvent`s, the way
 *   `sim/stats.ts` builds `MatchStats`; it keeps only small running state, never the event stream.
 *   At the end, `found(outcome)` lists the feat ids this match earned (`MatchResultInput.feats`).
 * - {@link grantFeats} (called by `applyMatchResult`) grants each new feat once: 100 Dust, the
 *   `feat.<id>` flag and a `{ kind: 'feat' }` reward step; titles follow through `unlockTitles`.
 * - Feats count in every mode except the tutorial.
 * - Predicate kinds are the closed list `FeatPredicate` in `src/content/types.ts`.
 */
import type { AgeId, CardId, FormatId, Loadout, MatchOutcome, RewardStep, SaveDoc, Side, SimEvent } from '@/contracts';
import type { Content, FeatDef } from '@/content';
import { TICK_MS } from '@/core';

export const FEAT_FLAG_PREFIX = 'feat.';
export const FEAT_HINT_FLAG_PREFIX = 'featHint.';

export function featFlag(id: string): string {
  return `${FEAT_FLAG_PREFIX}${id}`;
}

export function featHintFlag(id: string): string {
  return `${FEAT_HINT_FLAG_PREFIX}${id}`;
}

/** The feats in table order, with found and hint state (Collection Feats tab). */
export function featList(s: Pick<SaveDoc, 'flags'>, t: Content): { def: FeatDef; found: boolean; hintShown: boolean }[] {
  return t.feats.order
    .map((id) => t.feats.list[id])
    .filter((d): d is FeatDef => !!d)
    .map((def) => ({ def, found: s.flags[featFlag(def.id)] === true, hintShown: s.flags[featHintFlag(def.id)] === true }));
}

/** "Show hint": turns a riddle into its plain condition, stored in `flags['featHint.<id>']`. */
export function showFeatHint(s: SaveDoc, id: string): SaveDoc {
  const key = featHintFlag(id);
  return s.flags[key] ? s : { ...s, flags: { ...s.flags, [key]: true } };
}

export interface FeatTrackerConfig {
  content: Content;
  format: FormatId;
  side: Side;
  /** The player's loadouts for the match (Humble Beginnings). */
  loadouts: Partial<Record<AgeId, Loadout>>;
}

export interface FeatTracker {
  /** Feeds the events of one or more ticks, in order. */
  push(events: readonly SimEvent[]): void;
  /** The feat ids found in this match, in table order. */
  found(outcome: MatchOutcome | null): string[];
}

/** Creates the feat tracker for one side of one match. */
export function createFeatTracker(cfg: FeatTrackerConfig): FeatTracker {
  const t = cfg.content;
  const me = cfg.side;
  const foe: Side = me === 0 ? 1 : 0;
  const defs = t.feats.order.map((id) => t.feats.list[id]).filter((d): d is FeatDef => !!d);
  const got = new Set<string>();

  const cardAge = (card: CardId | null): AgeId | null => (card ? (t.units[card]?.age ?? t.turrets[card]?.age ?? null) : null);
  const unitCard = new Map<number, CardId>();
  const unitSide = new Map<number, Side>();
  const lastCast = new Map<number, number>();
  const castKills = new Map<number, Map<AgeId, number>>();
  const castPower = new Map<number, CardId>();
  // Global age index (`AgeDef.index`, A17.8), so a format that skips ages still compares ages correctly.
  const AGE_INDEX = Object.fromEntries(t.order.ages.map((a) => [a, t.ages[a].index])) as Record<AgeId, number>;
  const aliveByAge: [number[], number[]] = [t.order.ages.map(() => 0), t.order.ages.map(() => 0)];
  const age: [AgeId, AgeId] = ['stone', 'stone'];
  let maxAgeMine: AgeId = 'stone';
  let turretBuilt = false;
  let minOwnBaseBp = 10000;
  let maxBehind = 0;
  let lastStandKills = 0;
  let reachedAt: Partial<Record<AgeId, number>> = { stone: 0 };
  let maxAgesAlive = 0;

  const hit = (id: string): void => {
    got.add(id);
  };

  function onEvent(ev: SimEvent): void {
    switch (ev.e) {
      case 'unitSpawned': {
        unitCard.set(ev.id, ev.card);
        unitSide.set(ev.id, ev.side);
        const a = cardAge(ev.card);
        if (a) {
          aliveByAge[ev.side][AGE_INDEX[a]]! += 1;
          if (ev.side === me) maxAgesAlive = Math.max(maxAgesAlive, aliveByAge[me].filter((n) => n > 0).length);
        }
        break;
      }
      case 'hit':
        if (ev.castId !== null && ev.sourceKind === 'power') {
          lastCast.set(ev.targetId, ev.castId);
          castPower.set(ev.castId, ev.sourceCard);
        }
        break;
      case 'died': {
        const victimAge = cardAge(ev.card);
        if (victimAge) aliveByAge[ev.side][AGE_INDEX[victimAge]] = Math.max(0, aliveByAge[ev.side][AGE_INDEX[victimAge]]! - 1);
        if (ev.killerSide !== me || ev.side === me) break;
        if (ev.killerKind === 'unit' || ev.killerKind === 'ability') {
          const killerAge = cardAge(ev.killerCard);
          for (const d of defs) {
            const p = d.predicate;
            if (p.kind === 'crossAgeKill' && killerAge === p.killerAge && victimAge === p.victimAge) hit(d.id);
          }
        }
        if (ev.killerKind === 'power') {
          const cast = lastCast.get(ev.id);
          if (cast !== undefined && victimAge) {
            let m = castKills.get(cast);
            if (!m) castKills.set(cast, (m = new Map()));
            m.set(victimAge, (m.get(victimAge) ?? 0) + 1);
            const power = castPower.get(cast) ?? ev.killerCard;
            for (const d of defs) {
              const p = d.predicate;
              if (p.kind !== 'castKills' || p.power !== power) continue;
              let n = 0;
              for (const a of p.victimAges) n += m.get(a) ?? 0;
              if (n >= p.min) hit(d.id);
            }
          }
        }
        if (ev.killerKind === 'lastStand') {
          lastStandKills += 1;
          for (const d of defs) if (d.predicate.kind === 'lastStandKills' && lastStandKills >= d.predicate.min) hit(d.id);
        }
        break;
      }
      case 'turretBuilt':
        if (ev.side === me) turretBuilt = true;
        break;
      case 'ageUp': {
        age[ev.side] = ev.age;
        if (ev.side === me) {
          if (AGE_INDEX[ev.age] > AGE_INDEX[maxAgeMine]) maxAgeMine = ev.age;
          if (reachedAt[ev.age] === undefined) reachedAt = { ...reachedAt, [ev.age]: ev.tick * TICK_MS };
        }
        maxBehind = Math.max(maxBehind, AGE_INDEX[age[foe]] - AGE_INDEX[age[me]]);
        break;
      }
      case 'baseDamaged': {
        const bp = ev.maxHp > 0 ? Math.trunc((Math.max(0, ev.hp) * 10000) / ev.maxHp) : 0;
        if (ev.side === me) minOwnBaseBp = Math.min(minOwnBaseBp, bp);
        else if (ev.hp <= 0 && ev.sourceId !== null && unitSide.get(ev.sourceId) === me) {
          const unitAge = cardAge(unitCard.get(ev.sourceId) ?? null);
          for (const d of defs) {
            const p = d.predicate;
            if (p.kind === 'finalBaseBlow' && unitAge === p.unitAge && age[foe] === p.baseAge) hit(d.id);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  function commonsOnly(): boolean {
    for (const a of t.formats[cfg.format]?.ages ?? []) {
      const l = cfg.loadouts[a];
      if (!l) continue;
      for (const id of [...l.units, ...l.turrets]) {
        if (id === null) continue;
        const r = t.units[id]?.rarity ?? t.turrets[id]?.rarity;
        if (r !== 'common') return false;
      }
      for (const id of [l.powers.home, l.powers.field]) if (id !== null && t.powers[id]?.source !== 'starter') return false;
    }
    return true;
  }

  return {
    push(events) {
      for (const ev of events) onEvent(ev);
    },
    found(outcome) {
      const out = new Set(got);
      const win = !!outcome && outcome.winner === me;
      const inFormat = (formats: readonly FormatId[]): boolean => formats.includes(cfg.format);
      for (const d of defs) {
        const p = d.predicate;
        switch (p.kind) {
          case 'winMaxAge':
            if (win && inFormat(p.formats) && AGE_INDEX[maxAgeMine] <= AGE_INDEX[p.maxAge]) out.add(d.id);
            break;
          case 'winNoTurret':
            if (win && inFormat(p.formats) && !turretBuilt) out.add(d.id);
            break;
          case 'winFinalBellMargin':
            if (win && outcome.reason === 'finalBell' && outcome.baseHpBp[me] - outcome.baseHpBp[foe] <= p.maxMarginBp) out.add(d.id);
            break;
          case 'reachAgeBefore': {
            const at = reachedAt[p.age];
            if (inFormat(p.formats) && at !== undefined && at < p.beforeMs) out.add(d.id);
            break;
          }
          case 'winAfterAgesBehind':
            if (win && maxBehind >= p.ages) out.add(d.id);
            break;
          case 'winCommonsOnly':
            if (win && inFormat(p.formats) && commonsOnly()) out.add(d.id);
            break;
          case 'winAfterBaseBelow':
            if (win && minOwnBaseBp < p.belowBp) out.add(d.id);
            break;
          case 'agesAlive':
            if (maxAgesAlive >= p.ages) out.add(d.id);
            break;
          default:
            break;
        }
      }
      return defs.filter((d) => out.has(d.id)).map((d) => d.id);
    },
  };
}

/**
 * Grants each feat in `ids` that the save has not found yet (A15.10): its Dust, the `feat.<id>`
 * flag and a reward step. Unknown ids are ignored; a found feat never pays twice.
 */
export function grantFeats(s: SaveDoc, t: Content, ids: readonly string[] | undefined): { save: SaveDoc; steps: RewardStep[] } {
  const steps: RewardStep[] = [];
  let save = s;
  for (const id of ids ?? []) {
    const def = t.feats.list[id];
    const flag = featFlag(id);
    if (!def || save.flags[flag]) continue;
    save = { ...save, currencies: { ...save.currencies, dust: save.currencies.dust + def.dust }, flags: { ...save.flags, [flag]: true } };
    steps.push({ kind: 'feat', featId: id });
  }
  return { save, steps };
}
