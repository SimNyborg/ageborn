/**
 * Match statistics (DESIGN B3 Match stats, B15 `MatchStats`, A6.7 quests, A9 Result recap).
 *
 * A pure reducer over `SimEvent`s for one side. It needs only the events plus the format and content
 * (to know the final age and card groups), so the session, the replay viewer and headless tools all
 * compute identical stats from the same stream.
 *
 * - `kills`: enemy units killed by this side (any killer kind). `turretKills`: by turrets.
 * - `powerMaxHits`: the most distinct enemies hit by one of this side's Age Power casts.
 * - `powerGoldSpent`, `powerCasts`: gold paid for this side's casts and its casts per slot [Home, Field] (A2.9.12).
 * - `baseDamage`: whole HP dealt to the enemy base by attacks (Siege decay excluded).
 * - `heavyKillsByAA`: enemy Heavy-group units killed by this side's Anti-armor units.
 * - `mvpCard`: this side's unit or turret card with the most damage dealt (ties: more kills, then id).
 * - `forts` (A16.14): forts placed and the whole gold paid for them; own forts destroyed and decayed; the
 *   bounty gold they paid the enemy; levies spawned; whole damage dealt by this side's levies.
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
  const levies = new Set<number>();
  const ft = { placed: 0, gold: 0, destroyed: 0, decayed: 0, bountyPaid: 0, levies: 0, levyDamage: 0 };
  const isFortCard = (card: CardId): boolean => (cfg.content.forts ?? {})[card] !== undefined;
  const st = {
    trained: 0,
    kills: 0,
    turretKills: 0,
    evolves: 0,
    reachedFinalAgeAtMs: null as number | null,
    powerMaxHits: 0,
    powerGoldSpent: 0,
    powerCasts: [0, 0] as [number, number],
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
        if (ev.side === side && !ev.summoned && !isFortCard(ev.card)) st.trained += 1;
        if (ev.side === side && ev.from !== undefined) {
          levies.add(ev.id);
          ft.levies += 1;
        }
        break;
      case 'fortPlaced':
        if (ev.side === side) {
          ft.placed += 1;
          ft.gold += ev.cost;
        }
        break;
      case 'fortDecayed':
        if (unitSide.get(ev.id) === side) ft.decayed += 1;
        break;
      case 'powerTelegraph':
        castSide.set(ev.castId, ev.side);
        if (ev.side === side) {
          st.powerGoldSpent += ev.cost;
          st.powerCasts[ev.slot === 'home' ? 0 : 1] += 1;
        }
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
          if (levies.has(ev.sourceId)) ft.levyDamage += ev.damage;
        }
        break;
      }
      case 'died':
        if (ev.side === side && isFortCard(ev.card)) {
          if (ev.killerKind !== 'decay' && ev.killerSide !== null) ft.destroyed += 1;
          ft.bountyPaid += ev.bountyGold;
        }
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
      case 'researchStarted':
        // A18.5.4: the Economy track replaced the Treasury ("won without the Treasury" quests).
        if (ev.side === side && ev.pick.startsWith('economy.')) st.usedTreasury = true;
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
        powerGoldSpent: st.powerGoldSpent,
        powerCasts: [st.powerCasts[0], st.powerCasts[1]],
        baseDamage: Math.trunc(st.baseDamageCenti / 100),
        heavyKillsByAA: st.heavyKillsByAA,
        usedTreasury: st.usedTreasury,
        usedLastStand: st.usedLastStand,
        ownBaseHpBpAtEnd: st.ownBaseHpBpAtEnd,
        durationMs: (st.endTick ?? st.lastTick) * TICK_MS,
        mvpCard: mvp,
        forts: { ...ft, bountyPaid: Math.trunc(ft.bountyPaid / 1000), levyDamage: Math.trunc(ft.levyDamage / 100) },
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
