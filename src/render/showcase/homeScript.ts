/**
 * Home's live island (owner request 2026-10-16, queue item 37: "the troops standing on the rock island on
 * the front page move very unnaturally and not like in the game"): what the frontline troops on the island
 * do and when, as plain data the Home stage (`home.ts`) plays with the battle's own art and feel. Pure and
 * deterministic over the troops' plans (the card showcase's `troopPlan`: the sim's wind-up, the attack's
 * rhythm, projectile speeds, ground speed) and a seed, so tests can read every cycle without Pixi.
 *
 * The island plays in cycles. Each cycle is a calm gap (idle breathing from the real idle clip, the odd
 * weight shift: a few steps on the walk clip at a speed the feet stay planted on, now and then a cheer),
 * then one exchange with the battle's timing (the front pair walks in and trades blows, a shooter looses a
 * shot or a short burst, or a back-row shooter fires over its own front, as ranked troops do in a battle),
 * an optional cheer by the side that landed the last blow, and everyone back on their spot. Nobody falls:
 * the island is a menu, not a fight to watch to the end. With no opponent on the island (a ranked search)
 * the player's troops idle, shift and now and then swing at the air.
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

/** The first cycle's gap after the island goes live (ms): the troops move within about a second. */
const FIRST_GAP: readonly [number, number] = [700, 1200];
/** A later cycle's calm gap (ms). */
const GAP: readonly [number, number] = [2000, 3800];
/** Weight shifts: how far (lu), how long a troop stays shifted (ms). */
const SHIFT_LU: readonly [number, number] = [6, 13];
const SHIFT_HOLD: readonly [number, number] = [700, 1700];
/** The front pair stops this far apart beyond touching, lu (the swing's impact frame reaches across). */
const MEET_OVERLAP_LU = 8;
/** Backing off to the spot after an exchange, as a share of the ground speed (deliberate, not a rout). */
const BACK_OFF = 0.62;
/** Rest after a cycle's last beat before the next cycle may start, ms. */
const REST_MS = 450;

type Rng = { next(): number };

const between = (r: Rng, [a, b]: readonly [number, number]): number => a + (b - a) * r.next();
const pick = <T>(r: Rng, list: readonly T[]): T => list[Math.min(list.length - 1, Math.floor(r.next() * list.length))]!;

/** The cycle's own random stream: the same seed and index always give the same cycle. */
export function cycleRng(seed: number, n: number): Rng {
  return mulberry32((seed ^ Math.imul(n + 1, 0x9e3779b1)) >>> 0);
}

/**
 * A walk speed (lu/s) the troop's feet stay planted on: never under the share of its natural stride
 * below which the walk clip stops (atlas `MOVING_SHARE`, 0.3) or stretches past its slowest rate (a third).
 */
export function plantedSpeed(a: Pick<HomeActor, 'plan' | 'naturalSpeed'>, share: number): number {
  const g = a.plan.groundSpeed;
  const floor = a.naturalSpeed !== null ? a.naturalSpeed * 0.45 : g * 0.45;
  return Math.max(12, Math.min(Math.max(g, floor), Math.max(floor, g * share)));
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
 * A weight shift in a calm gap: a few steps forward or back on planted feet, a hold, and back to the
 * spot, all inside [t0, until]. Returns the beats (none if the window is too short).
 */
function shiftBeats(r: Rng, a: HomeActor, t0: number, until: number): HomeBeat[] {
  const d = between(r, SHIFT_LU);
  // the front line mostly rocks back a step and returns; the back row steps either way
  const toward = a.slot === 1 ? r.next() < 0.5 : r.next() < 0.35;
  const dir = (a.side === 0 ? 1 : -1) * (toward ? 1 : -1);
  const speed = plantedSpeed(a, 0.6);
  const leg = walkMs(d, speed);
  const hold = between(r, SHIFT_HOLD);
  if (t0 + leg * 2 + hold + 120 > until) return [];
  const x = Math.round((a.homeX + dir * d) * 10) / 10;
  return [
    { at: Math.round(t0), k: 'walk', id: a.id, toX: x, speed },
    { at: Math.round(t0 + leg + hold), k: 'walk', id: a.id, toX: a.homeX, speed },
  ];
}

/** Everyone's calm gap from `t0` to `t1`: weight shifts and the odd cheer, finished before `t1`. */
function calmBeats(r: Rng, cast: readonly HomeActor[], t0: number, t1: number): HomeBeat[] {
  const out: HomeBeat[] = [];
  for (const a of cast) {
    const roll = r.next();
    const start = t0 + between(r, [120, Math.max(160, (t1 - t0) * 0.4)]);
    if (roll < (a.slot === 1 ? 0.7 : 0.5) && !a.plan.air) out.push(...shiftBeats(r, a, start, t1 - 150));
    else if (roll > 0.88) out.push({ at: Math.round(start), k: 'cheer', id: a.id });
  }
  return out;
}

/** The front pair meets in the middle and trades blows (both melee). */
function duel(r: Rng, me: HomeActor, foe: HomeActor, t0: number): { beats: HomeBeat[]; end: number; last: Side } {
  const beats: HomeBeat[] = [];
  const touch = Math.max(16, me.front + foe.front - MEET_OVERLAP_LU);
  const gap = gapOf(me, foe);
  const each = Math.max(0, (gap - touch) / 2);
  const meX = Math.round((me.homeX + each) * 10) / 10;
  const foeX = Math.round((foe.homeX - each) * 10) / 10;
  const sMe = plantedSpeed(me, 1);
  const sFoe = plantedSpeed(foe, 1);
  let arrive = t0;
  if (each > 0.5) {
    beats.push({ at: t0, k: 'walk', id: me.id, toX: meX, speed: sMe });
    beats.push({ at: t0 + Math.round(r.next() * 120), k: 'walk', id: foe.id, toX: foeX, speed: sFoe });
    arrive = t0 + 120 + Math.max(walkMs(each, sMe), walkMs(each, sFoe));
  }
  const first: [HomeActor, HomeActor] = r.next() < 0.5 ? [me, foe] : [foe, me];
  let t = arrive + 160;
  let end = t;
  let last: Side = first[0].side;
  const blows = r.next() < 0.4 ? 3 : 2;
  for (let i = 0; i < blows; i++) {
    const [att, def] = i % 2 === 0 ? first : [first[1], first[0]];
    const a = att.plan.attack;
    if (!a) continue;
    const v = variantOf(r, att);
    const hit = attackBeats(a, att.id, def.id, att.card, touch, t, v ? { variant: v } : {});
    beats.push(...hit.beats);
    last = att.side;
    end = hit.impact;
    // the answer comes once the blow has landed and the defender has flinched
    t = hit.impact + 260 + Math.round(r.next() * 260);
  }
  // both step back to their spots (a backpedal: the battle's walk run backward, or a turn for home)
  const back = end + 380;
  if (each > 0.5) {
    beats.push({ at: back, k: 'walk', id: me.id, toX: me.homeX, speed: plantedSpeed(me, BACK_OFF) });
    beats.push({ at: back + 90, k: 'walk', id: foe.id, toX: foe.homeX, speed: plantedSpeed(foe, BACK_OFF) });
  }
  const home = back + 90 + Math.max(walkMs(each, plantedSpeed(me, BACK_OFF)), walkMs(each, plantedSpeed(foe, BACK_OFF)));
  return { beats, end: Math.max(home, end + 500), last };
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

/** At least one of the front pair shoots: shots across the lane; a melee target feints a charge. */
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
  if (da && shooter(def)) {
    // the other side answers in kind
    const answer = volleyOf(r, def, att, da, dist, first.impact + 380 + Math.round(r.next() * 380));
    beats.push(...answer.beats);
    end = Math.max(end, answer.end);
    last = def.side;
  } else if (!def.plan.air) {
    // a melee target that was shot at takes a few angry steps toward the shooter, then thinks better of it
    const steps = between(r, [10, 18]);
    const dir = def.side === 0 ? 1 : -1;
    const s = plantedSpeed(def, 1);
    const go = first.impact + 220;
    beats.push({ at: go, k: 'walk', id: def.id, toX: Math.round((def.homeX + dir * steps) * 10) / 10, speed: s });
    const back = go + walkMs(steps, s) + 420;
    beats.push({ at: back, k: 'walk', id: def.id, toX: def.homeX, speed: plantedSpeed(def, BACK_OFF) });
    end = Math.max(end, back + walkMs(steps, plantedSpeed(def, BACK_OFF)) + 200);
  }
  return { beats, end, last };
}

/** A back-row shooter fires over its own front at the opponent's front troop (ranks, as in a battle). */
function volley(r: Rng, back: HomeActor, target: HomeActor, t0: number): { beats: HomeBeat[]; end: number; last: Side } {
  const a = back.plan.attack!;
  const v = volleyOf(r, back, target, a, gapOf(back, target), t0);
  return { beats: v.beats, end: v.end, last: back.side };
}

/** No opponent on the island: the front troop swings at the air now and then (a warm-up), the rest idle. */
function drill(r: Rng, cast: readonly HomeActor[], t0: number): { beats: HomeBeat[]; end: number } {
  const beats: HomeBeat[] = [];
  const front = cast.find((a) => a.slot === 0 && a.plan.attack !== null) ?? cast.find((a) => a.plan.attack !== null);
  if (!front || !front.plan.attack) return { beats, end: t0 + 400 };
  const a = front.plan.attack;
  const v = variantOf(r, front);
  // the swing without a target: no shot, no hit, the clip and its swish
  beats.push({ at: t0, k: 'attack', id: front.id, target: -1, windupMs: a.windupMs, index: 0, ...(v ? { variant: v } : {}) });
  let end = t0 + a.windupMs + 520;
  if (r.next() < 0.45) {
    const other = cast.find((x) => x.id !== front.id);
    beats.push({ at: end - 120, k: 'cheer', id: (other ?? front).id });
    end += 600;
  }
  return { beats, end };
}

/**
 * Cycle `n` of the island for `cast` (both sides' troops on their spots) and `seed`. The first cycle starts
 * soon after the island goes live; every cycle ends with everyone back on their spot.
 */
export function homeCycle(cast: readonly HomeActor[], seed: number, n: number): HomeCycle {
  const r = cycleRng(seed, n);
  const gap = Math.round(between(r, n === 0 ? FIRST_GAP : GAP));
  const mine = cast.filter((a) => a.side === 0);
  const theirs = cast.filter((a) => a.side === 1);
  const front = (list: readonly HomeActor[]): HomeActor | undefined => list.find((a) => a.slot === 0) ?? list[0];
  const meF = front(mine);
  const foeF = front(theirs);
  const beats: HomeBeat[] = calmBeats(r, cast, 0, gap);
  if (cast.length === 0) return { kind: 'calm', beats: [], ms: gap };
  let kind: HomeCycle['kind'] = 'calm';
  let ex: { beats: HomeBeat[]; end: number; last?: Side } | null = null;
  if (meF && foeF) {
    // the exchanges this pair can show, weighted: the front pair's own (a duel, shots) first
    const backs = cast.filter((a) => a.slot === 1 && shooter(a) && !(a.side === 0 ? !foeF : !meF));
    const pairCan = meF.plan.attack !== null || foeF.plan.attack !== null;
    const roll = r.next();
    if (backs.length > 0 && (roll < 0.3 || !pairCan)) {
      const b = pick(r, backs);
      ex = volley(r, b, b.side === 0 ? foeF : meF, gap);
      kind = 'volley';
    } else if (pairCan && melee(meF) && melee(foeF)) {
      ex = duel(r, meF, foeF, gap);
      kind = 'duel';
    } else if (pairCan && (shooter(meF) || shooter(foeF))) {
      ex = shots(r, meF, foeF, gap);
      kind = 'shots';
    } else if (pairCan) {
      // one side has no attack the other can answer (a healer, a flyer with a melee bite): one blow at range
      const att = meF.plan.attack ? meF : foeF;
      const def = att === meF ? foeF : meF;
      ex = melee(att) ? duel(r, meF, foeF, gap) : volley(r, att, def, gap);
      kind = melee(att) ? 'duel' : 'volley';
    }
  } else if (meF || foeF) {
    ex = drill(r, cast, gap);
    kind = 'drill';
  }
  let end = gap;
  if (ex) {
    beats.push(...ex.beats);
    end = ex.end;
    // the side that landed the last blow cheers now and then (its back row first: the front is still busy)
    if (ex.last !== undefined && r.next() < 0.5) {
      const side = cast.filter((a) => a.side === ex!.last);
      const who = side.find((a) => a.slot === 1) ?? side[0];
      if (who) {
        beats.push({ at: end - 200, k: 'cheer', id: who.id });
        end += 450;
      }
    }
  }
  beats.sort((a, b) => a.at - b.at);
  return { kind, beats, ms: Math.round(end + REST_MS) };
}
