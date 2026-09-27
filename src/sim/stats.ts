/**
 * Match statistics (DESIGN B3 Match stats, B15 `MatchStats`, A6.7 quests, A9 Result recap).
 *
 * A pure reducer over `SimEvent`s for one side. It needs only the events plus the format and content
 * (to know the final age and card groups), so the session, the replay viewer and headless tools all
 * compute identical stats from the same stream.
 *
 * - `kills`: enemy units killed by this side (any killer kind). `turretKills`: by turrets.
 * - `powerMaxHits`: the most distinct enemies hit by one of this side's Age Power casts.
 * - `baseDamage`: whole HP dealt to the enemy base by attacks (Siege decay excluded).
 * - `heavyKillsByAA`: enemy Heavy-group units killed by this side's Anti-armor units.
 * - `mvpCard`: this side's unit or turret card with the most damage dealt (ties: more kills, then id).
 */
import type { AgeId, CardId, CompiledContent, FormatId, MatchStats, Side, SimEvent } from '@/contracts';
import { TICK_MS } from '@/core';

export interface StatsConfig {
  format: FormatId;
  content: CompiledContent;
}

export interface StatsTracker {
  /** Feeds the events of one or more ticks, in order. */
  push(events: readonly SimEvent[]): void;
  /** The stats so far. */
  result(): MatchStats;
}

export function createStatsTracker(cfg: StatsConfig, side: Side): StatsTracker {
  const ages = cfg.content.formats[cfg.format]?.ages ?? [];
  const finalAge: AgeId | undefined = ages[ages.length - 1];
  const unitSide = new Map<number, Side>();
  const castSide = new Map<number, Side>();
  const castHits = new Map<number, Set<number>>();
  const damageByCard = new Map<CardId, number>();
  const killsByCard = new Map<CardId, number>();
  const st = {
    trained: 0,
    kills: 0,
    turretKills: 0,
    evolves: 0,
    reachedFinalAgeAtMs: null as number | null,
    powerMaxHits: 0,
    baseDamageCenti: 0,
    heavyKillsByAA: 0,
    usedTreasury: false,
    usedLastStand: false,
    ownBaseHpBpAtEnd: 10000,
    lastTick: 0,
    endTick: null as number | null,
  };
  const groupOf = (card: CardId | null): string | undefined => (card ? cfg.content.units[card]?.group : undefined);

  function one(ev: SimEvent): void {
    st.lastTick = ev.tick;
    switch (ev.e) {
      case 'unitSpawned':
        unitSide.set(ev.id, ev.side);
        if (ev.side === side && !ev.summoned) st.trained += 1;
        break;
      case 'powerTelegraph':
        castSide.set(ev.castId, ev.side);
        break;
      case 'hit': {
        const targetSide = unitSide.get(ev.targetId);
        if (targetSide === undefined || targetSide === side) break;
        if (ev.sourceKind === 'power') {
          if (ev.castId !== null && castSide.get(ev.castId) === side) {
            let set = castHits.get(ev.castId);
            if (!set) {
              set = new Set<number>();
              castHits.set(ev.castId, set);
            }
            set.add(ev.targetId);
            if (set.size > st.powerMaxHits) st.powerMaxHits = set.size;
          }
        } else if (ev.sourceKind === 'unit' || ev.sourceKind === 'turret' || ev.sourceKind === 'ability') {
          damageByCard.set(ev.sourceCard, (damageByCard.get(ev.sourceCard) ?? 0) + ev.damage);
        }
        break;
      }
      case 'died':
        if (ev.side === side || ev.killerSide !== side) break;
        st.kills += 1;
        if (ev.killerKind === 'turret') st.turretKills += 1;
        if (ev.killerCard && (ev.killerKind === 'unit' || ev.killerKind === 'turret' || ev.killerKind === 'ability')) {
          killsByCard.set(ev.killerCard, (killsByCard.get(ev.killerCard) ?? 0) + 1);
        }
        if (ev.killerKind === 'unit' && groupOf(ev.card) === 'heavy' && groupOf(ev.killerCard) === 'antiArmor') {
          st.heavyKillsByAA += 1;
        }
        break;
      case 'ageUp':
        if (ev.side !== side) break;
        st.evolves += 1;
        if (ev.age === finalAge && st.reachedFinalAgeAtMs === null) st.reachedFinalAgeAtMs = ev.tick * TICK_MS;
        break;
      case 'baseDamaged':
        if (ev.side !== side && ev.sourceId !== null) st.baseDamageCenti += ev.damage;
        break;
      case 'treasuryUp':
        if (ev.side === side) st.usedTreasury = true;
        break;
      case 'lastStandFire':
        if (ev.side === side) st.usedLastStand = true;
        break;
      case 'matchEnded':
        st.endTick = ev.result.tick;
        st.ownBaseHpBpAtEnd = ev.result.baseHpBp[side];
        break;
      default:
        break;
    }
  }

  return {
    push(events) {
      for (const ev of events) one(ev);
    },
    result() {
      // MVP: the side's own cards only (damage was recorded for hits on enemies of this side).
      let mvp: CardId | null = null;
      let mvpDmg = -1;
      let mvpKills = -1;
      const cards = [...damageByCard.keys()].sort();
      for (const card of cards) {
        const d = damageByCard.get(card) ?? 0;
        const k = killsByCard.get(card) ?? 0;
        if (d > mvpDmg || (d === mvpDmg && k > mvpKills)) {
          mvp = card;
          mvpDmg = d;
          mvpKills = k;
        }
      }
      return {
        trained: st.trained,
        kills: st.kills,
        turretKills: st.turretKills,
        evolves: st.evolves,
        reachedFinalAgeAtMs: st.reachedFinalAgeAtMs,
        powerMaxHits: st.powerMaxHits,
        baseDamage: Math.trunc(st.baseDamageCenti / 100),
        heavyKillsByAA: st.heavyKillsByAA,
        usedTreasury: st.usedTreasury,
        usedLastStand: st.usedLastStand,
        ownBaseHpBpAtEnd: st.ownBaseHpBpAtEnd,
        durationMs: (st.endTick ?? st.lastTick) * TICK_MS,
        mvpCard: mvp,
      };
    },
  };
}

/** Reduces a whole event stream to one side's `MatchStats`. */
export function computeMatchStats(events: readonly SimEvent[], cfg: StatsConfig, side: Side): MatchStats {
  const t = createStatsTracker(cfg, side);
  t.push(events);
  return t.result();
}
