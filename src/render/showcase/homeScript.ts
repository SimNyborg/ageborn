/**
 * Home's live island (owner request 2026-10-16, queue item 37: "the troops standing on the rock island on
 * the front page move very unnaturally and not like in the game"): what the frontline troops on the island
 * do and when, as plain data the Home stage (`home.ts`) plays with the battle's own art and feel. Pure and
 * deterministic over the troops' plans (the card showcase's `troopPlan`: the sim's wind-up, the attack's
 * rhythm, projectile speeds, ground speed) and a seed, so tests can read every cycle without Pixi.
 *
 * The island is a calm menu scene, not a fight to watch (review M S1/S2). It plays in cycles of 4-8 s of
 * calm: the troops breathe on the real idle clip, and now and then one cheers. About one cycle in two or
 * three ends in an exchange with the battle's timing:
 *
 * - **duel**: one of the front pair marches up to the other (a real walk of at least one full stride, at its
 *   natural pace, so the feet plant and the walk reads as a walk), they trade two or three blows at the
 *   battle's spacing, and the walker backs off to its spot. Who walks in, how close it comes, who strikes
 *   first and how many blows vary;
 * - **shots**: a front shooter looses a shot or a short burst, and a shooter on the other side may answer;
 * - **volley**: a back-row shooter fires over its own front at the opponent's front troop.
 *
 * There are no small shuffles: a walk shorter than a stride is mostly the walk clip's cross-fade at its
 * start and end, which reads as a twitch. With no opponent on the island (a ranked search) the player's
 * troops idle, cheer now and then and, rarely, the front troop swings at the air. Nobody falls.
 *
 * Presentation only. Nothing here reaches the sim. World units are lu; x grows toward the opponent (side 1
 * stands right), y is the row offset (0 on the front line, negative further back; flyers carry their height).
 */
import type { CardId, Side } from '@/contracts';
import { mulberry32 } from '@/core';
import { attackBeats, burstOf, flightMs, type AttackShow, type Beat, type TroopPlan } from './script';

/** Actor ids: the player's front and back troop, then the opponent's (the event mapper sees them as unit ids). */
export const HOME_IDS = { me: [1, 2], foe: [11, 12] } as const;

/** One troop on the island as the stage measured it. */
export interface HomeActor {
  id: number;
  side: Side;
  /** 0: the front line, 1: the back row. */
  slot: 0 | 1;
  card: CardId;
  plan: TroopPlan;
  /** Its spot (lu): where it stands between moves. */
  homeX: number;
  homeY: number;
  /** How far its drawn idle pose reaches toward the opponent (lu), when the art can say; else from its size. */
  front: number;
  /** The walk's natural speed on screen (lu/s), when the sheet has one: slower steps would slide. */
  naturalSpeed: number | null;
  /** The drawn size factor (big units are drawn smaller on the island); default 1. */
  scale?: number;
}

/** A beat of the island: the card showcase's beats, plus a cheer (the victory clip or its hop). */
export type HomeBeat = Beat | { at: number; k: 'cheer'; id: number };

export interface HomeCycle {
  /** What the cycle shows (tests, the dev overlay). */
  kind: 'duel' | 'shots' | 'volley' | 'drill' | 'calm';
  beats: HomeBeat[];
  /** When the cycle is over and the next may start, ms. */
  ms: number;
}

/** The first cycle's calm after the island goes live (ms): a breath, then the first exchange. */
const FIRST_GAP: readonly [number, number] = [1400, 2400];
/** A later cycle's calm (ms): idle breathing between exchanges. */
const GAP: readonly [number, number] = [4000, 8000];
/** How often a later cycle holds an exchange (the others stay calm). */
const EXCHANGE_CHANCE = 0.4;
/** With no opponent on the island: how often a later cycle holds the warm-up swing (the first: half the time). */
const DRILL_CHANCE = 0.22;
/** A calm cycle: the chance that one troop cheers in it. */
const CHEER_CHANCE = 0.25;
/** After an exchange: the chance the side that landed the last blow cheers. */
const WIN_CHEER_CHANCE = 0.35;
/**
 * A walk is at least this long at the troop's natural pace (s): one full stride of the battle sheets
 * (their walk cycles are 0.62-0.74 s; the distance one cycle covers is the same at any pace).
 */
export const STRIDE_S = 0.75;
/** Walk pace as a share of the natural pace: in (a march) and back (a deliberate backpedal). */
const WALK_IN: readonly [number, number] = [0.9, 1];
const BACK_OFF: readonly [number, number] = [0.6, 0.75];
/** A melee pair's reach on top of their half widths (the sim spaces melee units about so). */
const MELEE_REACH_LU = 14;
/** The drawn idle poses may overlap by this much at most before the pair counts as touching (lu). */
const MEET_OVERLAP_LU = 8;
/** Rest after a cycle's last beat before the next cycle may start, ms. */
const REST_MS = 450;

type Rng = { next(): number };

const between = (r: Rng, [a, b]: readonly [number, number]): number => a + (b - a) * r.next();
const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(r.next() * list.length))]!;

/** The cycle's own random stream: the same seed and index always give the same cycle. */
export function cycleRng(seed: number, n: number): Rng {
  return mulberry32((seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0);
}

/** The troop's natural walking pace on the island (lu/s): its sheet's, else its ground speed at its drawn size. */
export function naturalPace(a: Pick<HomeActor, 'plan' | 'naturalSpeed' | 'scale'>): number {
  return Math.max(12, a.naturalSpeed ?? a.plan.groundSpeed * (a.scale ?? 1));
}

/** The shortest walk the troop makes (lu): one full stride at its natural pace. */
export function strideOf(a: Pick<HomeActor, 'plan' | 'naturalSpeed' | 'scale'>): number {
  return naturalPace(a) * STRIDE_S;
}

/**
 * A walk speed (lu/s) the troop's feet stay planted on: a share of its natural pace, never under the share
 * below which the walk clip stops (atlas `MOVING_SHARE`, 0.3) or stretches past its slowest rate (a third).
 */
export function plantedSpeed(a: Pick<HomeActor, 'plan' | 'naturalSpeed' | 'scale'>, share: number): number {
  const n = naturalPace(a);
  return Math.max(12, n * Math.min(1, Math.max(0.45, share)));
}

/** Walk time over `dist` lu at `speed` lu/s, ms. */
const walkMs = (dist: number, speed: number): number => flightMs(dist, speed);

function melee(a: HomeActor): boolean {
  const atk = a.plan.attack;
  return atk !== null && atk.shot === null && !a.plan.air;
}

function shooter(a: HomeActor): boolean {
  return a.plan.attack !== null && a.plan.attack.shot !== null;
}

/** The variant of an attack move: one of the variants the art has loaded (A, B, C), picked by the seed. */
function variantOf(r: Rng, a: HomeActor): string | undefined {
  const v = a.plan.variants;
  return v.length > 1 ? pick(r, v) : undefined;
}

/** Distance between two actors' spots (lu). */
const gapOf = (a: HomeActor, b: HomeActor): number => Math.abs(b.homeX - a.homeX);

/**
 * How a walker can march up to a holder: the walk (at least one stride) and the spacing they fight at
 * (between the battle's melee spacing and their drawn poses just touching), or null when the spots are too
 * close for a full stride (the pair then shows no duel).
 */
export function duelReach(walker: HomeActor, holder: HomeActor): { min: number; max: number; touch: number } | null {
  const gap = gapOf(walker, holder);
  const spacing = (walker.plan.sizeLu * (walker.scale ?? 1) + holder.plan.sizeLu * (holder.scale ?? 1)) / 2 + MELEE_REACH_LU;
  const touch = Math.max(spacing, walker.front + holder.front - MEET_OVERLAP_LU);
  const stride = strideOf(walker);
  // the walk: a full stride at least, and never so short that the poses stop apart (a miss)
  const min = Math.max(stride, gap - touch);
  const max = gap - spacing;
  return max >= min ? { min, max, touch } : null;
}

/** The front pair: one marches up to the other, they trade blows, and the walker backs off to its spot. */
function duel(r: Rng, walker: HomeActor, holder: HomeActor, t0: number): { beats: HomeBeat[]; end: number; last: Side } | null {
  const reach = duelReach(walker, holder);
  if (!reach) return null;
  const beats: HomeBeat[] = [];
  const dir = walker.side === 0 ? 1 : -1;
  // how close it comes varies: from a full stride short of the spacing to the battle's spacing
  const d = reach.min + (reach.max - reach.min) * r.next() * r.next();
  const meet = gapOf(walker, holder) - d;
  const to = Math.round((walker.homeX + dir * d) * 10) / 10;
  const sIn = plantedSpeed(walker, between(r, WALK_IN));
  beats.push({ at: t0, k: 'walk', id: walker.id, toX: to, speed: sIn });
  const arrive = t0 + walkMs(d, sIn);
  // the walker swings first more often (it came to fight); the holder sometimes meets it with a blow
  const first: [HomeActor, HomeActor] = r.next() < 0.62 ? [walker, holder] : [holder, walker];
  let t = arrive + 140 + Math.round(r.next() * 160);
  let end = t;
  let last: Side = first[0].side;
  const blows = r.next() < 0.35 ? 3 : 2;
  for (let i = 0; i < blows; i++) {
    const [att, def] = i % 2 === 0 ? first : [first[1], first[0]];
    const a = att.plan.attack;
    if (!a) continue;
    const v = variantOf(r, att);
    const hit = attackBeats(a, att.id, def.id, att.card, meet, t, v ? { variant: v } : {});
    beats.push(...hit.beats);
    last = att.side;
    end = hit.impact;
    // the answer comes once the blow has landed and the defender has flinched
    t = hit.impact + 280 + Math.round(r.next() * 300);
  }
  // the walker backs off to its spot (the battle's backpedal), a beat after the last blow
  const back = end + 420 + Math.round(r.next() * 220);
  const sBack = plantedSpeed(walker, between(r, BACK_OFF));
  beats.push({ at: back, k: 'walk', id: walker.id, toX: walker.homeX, speed: sBack });
  return { beats, end: Math.max(back + walkMs(d, sBack), end + 500), last };
}

/** One shooter's attack (a burst for a fast gun) at a target `dist` lu away from `t0`. */
function volleyOf(r: Rng, att: HomeActor, def: HomeActor, a: AttackShow, dist: number, t0: number): { beats: HomeBeat[]; impact: number; end: number } {
  const beats: HomeBeat[] = [];
  const n = Math.min(3, burstOf(a));
  const v = variantOf(r, att);
  let impact = t0;
  let end = t0;
  for (let k = 0; k < n; k++) {
    const hit = attackBeats(a, att.id, def.id, att.card, dist, t0 + k * a.intervalMs, v ? { variant: v } : {});
    beats.push(...hit.beats);
    impact = hit.impact;
    end = hit.end;
  }
  return { beats, impact, end };
}

/** At least one of the front pair shoots: shots across the lane, and a shooter on the other side may answer. */
function shots(r: Rng, me: HomeActor, foe: HomeActor, t0: number): { beats: HomeBeat[]; end: number; last: Side } {
  const beats: HomeBeat[] = [];
  const dist = gapOf(me, foe);
  const order: [HomeActor, HomeActor] = shooter(me) && (!shooter(foe) || r.next() < 0.5) ? [me, foe] : [foe, me];
  const [att, def] = order;
  const a = att.plan.attack!;
  const first = volleyOf(r, att, def, a, dist, t0);
  beats.push(...first.beats);
  let end = first.end;
  let last: Side = att.side;
  const da = def.plan.attack;
  if (da && shooter(def) && r.next() < 0.7) {
    // the other side answers in kind
    const answer = volleyOf(r, def, att, da, dist, first.impact + 420 + Math.round(r.next() * 420));
    beats.push(...answer.beats);
    end = Math.max(end, answer.end);
    last = def.side;
  }
  return { beats, end, last };
}

/** A back-row shooter fires over its own front at the opponent's front troop (ranks, as in a battle). */
function volley(r: Rng, back: HomeActor, target: HomeActor, t0: number): { beats: HomeBeat[]; end: number; last: Side } {
  const a = back.plan.attack!;
  const v = volleyOf(r, back, target, a, gapOf(back, target), t0);
  return { beats: v.beats, end: v.end, last: back.side };
}

/** No opponent on the island: the front troop swings at the air (a warm-up), and now and then another cheers. */
function drill(r: Rng, cast: readonly HomeActor[], t0: number): { beats: HomeBeat[]; end: number } | null {
  const beats: HomeBeat[] = [];
  const front = cast.find((a) => a.slot === 0 && a.plan.attack !== null) ?? cast.find((a) => a.plan.attack !== null);
  if (!front || !front.plan.attack) return null;
  const a = front.plan.attack;
  const v = variantOf(r, front);
  // the swing without a target: no shot, no hit, the clip and its swish
  beats.push({ at: t0, k: 'attack', id: front.id, target: -1, windupMs: a.windupMs, index: 0, ...(v ? { variant: v } : {}) });
  let end = t0 + a.windupMs + 520;
  const other = cast.find((x) => x.id !== front.id);
  if (other && r.next() < 0.4) {
    beats.push({ at: end - 120, k: 'cheer', id: other.id });
    end += 600;
  }
  return { beats, end };
}

/** A calm cycle's beats: now and then one troop cheers (the victory clip or its hop), finished before `t1`. */
function calmBeats(r: Rng, cast: readonly HomeActor[], t0: number, t1: number): HomeBeat[] {
  if (cast.length === 0 || r.next() >= CHEER_CHANCE || t1 - t0 < 1800) return [];
  const who = pick(r, cast);
  return [{ at: Math.round(t0 + between(r, [600, t1 - t0 - 1200])), k: 'cheer', id: who.id }];
}

/** The exchange the cast can show this cycle, or null (none fits). */
function exchange(r: Rng, cast: readonly HomeActor[], meF: HomeActor, foeF: HomeActor, t0: number): { kind: HomeCycle['kind']; ex: { beats: HomeBeat[]; end: number; last?: Side } } | null {
  // a back-row shooter fires over its own front now and then (ranks, as in a battle)
  const backs = cast.filter((a) => a.slot === 1 && shooter(a));
  const pairCan = meF.plan.attack !== null || foeF.plan.attack !== null;
  const roll = r.next();
  if (backs.length > 0 && (roll < 0.3 || !pairCan)) {
    const b = pick(r, backs);
    return { kind: 'volley', ex: volley(r, b, b.side === 0 ? foeF : meF, t0) };
  }
  if (!pairCan) return null;
  if (shooter(meF) || shooter(foeF)) return { kind: 'shots', ex: shots(r, meF, foeF, t0) };
  // a melee pair (or a melee troop facing one that cannot strike back): one marches up to the other
  const walkers = [meF, foeF].filter((a) => melee(a) || (a.plan.attack !== null && a.plan.attack.shot === null));
  if (walkers.length === 0) return null;
  const walker = walkers.length > 1 ? pick(r, walkers) : walkers[0]!;
  const holder = walker === meF ? foeF : meF;
  const d = duel(r, walker, holder, t0) ?? (walkers.length > 1 ? duel(r, holder, walker, t0) : null);
  if (d) return { kind: 'duel', ex: d };
  // the spots are too close for a full stride: a back-row shooter, if there is one
  if (backs.length > 0) {
    const b = pick(r, backs);
    return { kind: 'volley', ex: volley(r, b, b.side === 0 ? foeF : meF, t0) };
  }
  return null;
}

/**
 * Cycle `n` of the island for `cast` (both sides' troops on their spots) and `seed`. The first cycle holds
 * an exchange soon after the island goes live; a later one is calm most of the time. Every cycle ends with
 * everyone back on their spot.
 */
export function homeCycle(cast: readonly HomeActor[], seed: number, n: number): HomeCycle {
  const r = cycleRng(seed, n);
  const gap = Math.round(between(r, n === 0 ? FIRST_GAP : GAP));
  if (cast.length === 0) return { kind: 'calm', beats: [], ms: gap };
  const mine = cast.filter((a) => a.side === 0);
  const theirs = cast.filter((a) => a.side === 1);
  const front = (list: readonly HomeActor[]): HomeActor | undefined => list.find((a) => a.slot === 0) ?? list[0];
  const meF = front(mine);
  const foeF = front(theirs);
  let kind: HomeCycle['kind'] = 'calm';
  let ex: { beats: HomeBeat[]; end: number; last?: Side } | null = null;
  if (meF && foeF) {
    if (n === 0 || r.next() < EXCHANGE_CHANCE) {
      const got = exchange(r, cast, meF, foeF, gap);
      if (got) ({ kind, ex } = got);
    }
  } else if (r.next() < (n === 0 ? 0.5 : DRILL_CHANCE)) {
    const d = drill(r, cast, gap);
    if (d) {
      kind = 'drill';
      ex = d;
    }
  }
  const beats: HomeBeat[] = [];
  let end = gap;
  if (ex) {
    beats.push(...ex.beats);
    end = ex.end;
    // the side that landed the last blow cheers now and then (its back row first: the front is still busy)
    if (ex.last !== undefined && r.next() < WIN_CHEER_CHANCE) {
      const side = cast.filter((a) => a.side === ex!.last);
      const who = side.find((a) => a.slot === 1) ?? side[0];
      if (who) {
        beats.push({ at: end - 200, k: 'cheer', id: who.id });
        end += 450;
      }
    }
  } else beats.push(...calmBeats(r, cast, 0, gap));
  beats.sort((a, b) => a.at - b.at);
  return { kind, beats, ms: Math.round(end + REST_MS) };
}
