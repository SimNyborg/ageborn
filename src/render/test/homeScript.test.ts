/**
 * Home's live island choreography (queue item 37, `showcase/homeScript.ts`; review M S1/S2): seeded and
 * deterministic, the battle's timing (the sim's wind-up, projectile flight), nobody falls, and every cycle
 * ends with each troop back on its spot. A calm menu scene: 4-8 s of idle between exchanges, an exchange in
 * one cycle of two or three, a rare warm-up swing when no opponent stands on the island, and no small
 * shuffles: every walk is at least one full stride and 0.6 s at a pace the feet stay planted on. Duels vary
 * (who walks in, how close it comes, how many blows).
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import type { CardId, Side } from '@/contracts';
import { duelReach, HOME_IDS, homeCycle, naturalPace, plantedSpeed, STRIDE_S, strideOf, type HomeActor, type HomeBeat } from '../showcase/homeScript';
import { flightMs, troopPlan } from '../showcase/script';

/** The spots in lu (Diorama's LIVE_SPOTS: front 60 and back 118.5 units from the middle, 0.98 units a lu). */
const SPOTS: Record<Side, [number, number]> = { 0: [-61.2, -120.9], 1: [61.2, 120.9] };

function actor(side: Side, slot: 0 | 1, card: string, natural: number | null = 86.7, front = 40): HomeActor {
  const def = content.units[card];
  if (!def) throw new Error(`no card ${card}`);
  const plan = troopPlan(content, def);
  return { id: (side === 0 ? HOME_IDS.me : HOME_IDS.foe)[slot], side, slot, card: card as CardId, plan, homeX: SPOTS[side][slot], homeY: slot === 1 ? -5 : 0, front, naturalSpeed: natural, scale: 1 };
}

/** Where each troop ends a cycle: the target of its last walk (its spot when it never walks). */
function ends(cast: readonly HomeActor[], beats: readonly HomeBeat[]): Map<number, number> {
  const out = new Map(cast.map((a) => [a.id, a.homeX] as [number, number]));
  for (const b of beats) if (b.k === 'walk') out.set(b.id, b.toX);
  return out;
}

/** Each walk with where it starts (the troop's spot, or the end of its last walk). */
function walks(cast: readonly HomeActor[], beats: readonly HomeBeat[]): { a: HomeActor; from: number; to: number; speed: number }[] {
  const at = new Map(cast.map((a) => [a.id, a.homeX] as [number, number]));
  const out: { a: HomeActor; from: number; to: number; speed: number }[] = [];
  for (const b of beats) {
    if (b.k !== 'walk') continue;
    const a = cast.find((x) => x.id === b.id)!;
    out.push({ a, from: at.get(b.id)!, to: b.toX, speed: b.speed });
    at.set(b.id, b.toX);
  }
  return out;
}

const melee2: HomeActor[] = [actor(0, 0, 'footman'), actor(0, 1, 'longbowman', 81.2, 35), actor(1, 0, 'squire_pair', 100, 38), actor(1, 1, 'longbowman', 81.2, 35)];
const meleeOnly: HomeActor[] = [actor(0, 0, 'footman'), actor(1, 0, 'squire_pair', 100, 38)];
const exchanges = new Set(['duel', 'shots', 'volley']);

describe('the island choreography', () => {
  it('is the same for the same troops, seed and cycle, and differs with the seed', () => {
    const a = homeCycle(melee2, 42, 3);
    const b = homeCycle(melee2, 42, 3);
    expect(b).toEqual(a);
    const kinds = new Set<string>();
    const shapes = new Set<string>();
    for (let s = 0; s < 24; s++) {
      const c = homeCycle(melee2, s * 977, 1);
      kinds.add(c.kind);
      // a calm cycle has no beats; its length still differs with the seed
      shapes.add(JSON.stringify([c.ms, c.beats]));
    }
    expect(shapes.size).toBeGreaterThan(20);
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('ends every cycle with each troop back on its spot, its beats in order inside the cycle', () => {
    for (const cast of [melee2, meleeOnly, melee2.slice(0, 2)]) {
      for (let n = 0; n < 60; n++) {
        const c = homeCycle(cast, 7, n);
        for (const [id, x] of ends(cast, c.beats)) expect(x, `troop ${id} cycle ${n}`).toBe(cast.find((a) => a.id === id)!.homeX);
        for (let i = 1; i < c.beats.length; i++) expect(c.beats[i]!.at).toBeGreaterThanOrEqual(c.beats[i - 1]!.at);
        for (const b of c.beats) {
          expect(b.at).toBeGreaterThanOrEqual(0);
          expect(b.at).toBeLessThan(c.ms);
        }
      }
    }
  });

  it('makes no small shuffles: every walk is a full stride and at least 0.6 s, at a pace the feet stay planted on (review M S1)', () => {
    let n = 0;
    for (let seed = 0; seed < 8; seed++) {
      for (let k = 0; k < 40; k++) {
        const c = homeCycle(melee2, seed * 131 + 3, k);
        for (const w of walks(melee2, c.beats)) {
          n++;
          const dist = Math.abs(w.to - w.from);
          expect(dist, `${w.a.card} walks ${dist.toFixed(1)} lu`).toBeGreaterThanOrEqual(strideOf(w.a) - 0.1);
          expect(flightMs(dist, w.speed)).toBeGreaterThanOrEqual(600);
          expect(w.speed).toBeLessThanOrEqual(naturalPace(w.a) + 1e-9);
          expect(w.speed).toBeGreaterThanOrEqual(0.45 * naturalPace(w.a) - 1e-9);
        }
      }
    }
    expect(n).toBeGreaterThan(20);
    // one stride is the distance one walk cycle covers (the battle sheets' cycles are 0.62-0.74 s)
    expect(strideOf(actor(0, 0, 'footman', 86.7))).toBeCloseTo(86.7 * STRIDE_S);
    // the planted pace: a share of the natural pace, never under 45% of it nor over it
    expect(plantedSpeed(actor(0, 0, 'footman', 90), 0.2)).toBeCloseTo(90 * 0.45);
    expect(plantedSpeed(actor(0, 0, 'footman', 90), 1.4)).toBeCloseTo(90);
    // spots too close for a full stride show no duel
    expect(duelReach({ ...melee2[0]!, homeX: -30 }, { ...melee2[2]!, homeX: 30 })).toBeNull();
  });

  it("strikes with the battle's timing: the hit lands at the wind-up (plus the shot's flight)", () => {
    let attacks = 0;
    for (let n = 0; n < 60; n++) {
      const c = homeCycle(melee2, 11, n);
      for (const b of c.beats) {
        if (b.k !== 'attack' || b.target < 0) continue;
        attacks++;
        const a = melee2.find((x) => x.id === b.id)!;
        expect(b.windupMs).toBe(a.plan.attack!.windupMs);
        const hit = c.beats.find((h) => h.k === 'hit' && h.source === b.id && h.target === b.target && h.at >= b.at + b.windupMs);
        expect(hit, `hit for ${a.card}`).toBeDefined();
        const shot = a.plan.attack!.shot;
        const travel = shot && !('instant' in shot) ? flightMs(Math.abs(melee2.find((x) => x.id === b.target)!.homeX - a.homeX), shot.speed) : shot ? 50 : 0;
        if (!shot) expect(hit!.at).toBe(b.at + b.windupMs);
        else expect(hit!.at - (b.at + b.windupMs)).toBeLessThanOrEqual(travel + 1);
      }
      // nobody falls on the island
      expect(c.beats.some((b) => b.k === 'die')).toBe(false);
    }
    expect(attacks).toBeGreaterThan(10);
  });

  it('is calm most of the time: an exchange in about one later cycle of two or three, after 4-8 s of idle (review M S2)', () => {
    let held = 0;
    const N = 300;
    for (let n = 1; n <= N; n++) {
      const c = homeCycle(melee2, 2024, n);
      const first = c.beats.find((b) => b.k !== 'cheer');
      if (exchanges.has(c.kind)) {
        held++;
        expect(first!.at).toBeGreaterThanOrEqual(4000);
        expect(first!.at).toBeLessThanOrEqual(8000);
      } else {
        expect(c.kind).toBe('calm');
        // a calm cycle: at most a cheer
        expect(c.beats.every((b) => b.k === 'cheer')).toBe(true);
        expect(c.beats.length).toBeLessThanOrEqual(1);
      }
    }
    expect(held / N).toBeGreaterThan(0.3);
    expect(held / N).toBeLessThan(0.5);
  });

  it('shows the exchanges the troops can make: duels for a melee pair, volleys from a back-row shooter, shots for a shooter in front', () => {
    const kinds = (cast: readonly HomeActor[]) => new Set(Array.from({ length: 60 }, (_, n) => homeCycle(cast, 5, n).kind).filter((k) => k !== 'calm'));
    expect(kinds(melee2)).toEqual(new Set(['duel', 'volley']));
    expect(kinds(meleeOnly)).toEqual(new Set(['duel']));
    const shooterFront = [actor(0, 0, 'longbowman', 81.2, 35), actor(1, 0, 'footman')];
    expect(kinds(shooterFront)).toEqual(new Set(['shots']));
  });

  it('varies its duels: either side walks in, from different distances, with two or three blows', () => {
    const walkers = new Set<number>();
    const reach = new Set<number>();
    const blows = new Set<number>();
    for (let s = 0; s < 80; s++) {
      const c = homeCycle(meleeOnly, s * 7919, 0);
      if (c.kind !== 'duel') continue;
      const w = c.beats.find((b) => b.k === 'walk');
      if (w && w.k === 'walk') {
        walkers.add(w.id);
        reach.add(Math.round(Math.abs(w.toX - meleeOnly.find((a) => a.id === w.id)!.homeX)));
      }
      blows.add(c.beats.filter((b) => b.k === 'hit').length);
    }
    expect(walkers).toEqual(new Set([HOME_IDS.me[0], HOME_IDS.foe[0]]));
    expect(reach.size).toBeGreaterThan(5);
    expect(blows).toEqual(new Set([2, 3]));
  });

  it('with no opponent on the island (a ranked search) the troops mostly idle; now and then the front troop swings at the air', () => {
    const mine = melee2.filter((a) => a.side === 0);
    let drills = 0;
    for (let n = 1; n <= 200; n++) {
      const c = homeCycle(mine, 9, n);
      expect(['drill', 'calm']).toContain(c.kind);
      if (c.kind === 'drill') drills++;
      expect(c.beats.some((b) => b.k === 'hit' || b.k === 'shot' || b.k === 'walk')).toBe(false);
      for (const b of c.beats) if (b.k === 'attack') expect(b.target).toBe(-1);
    }
    expect(drills / 200).toBeGreaterThan(0.1);
    expect(drills / 200).toBeLessThan(0.32);
    expect(homeCycle([], 1, 0)).toMatchObject({ kind: 'calm', beats: [] });
  });

  it('opens with an exchange soon after going live, then breathes for seconds between cycles', () => {
    for (let s = 0; s < 20; s++) {
      const first = homeCycle(melee2, 21 + s, 0);
      expect(exchanges.has(first.kind)).toBe(true);
      expect(first.beats.find((b) => b.k !== 'cheer')!.at).toBeLessThanOrEqual(2400);
    }
    for (let n = 1; n <= 30; n++) {
      const c = homeCycle(meleeOnly, 21, n);
      expect(c.ms).toBeGreaterThan(4000);
      expect(c.ms).toBeLessThan(16000);
    }
  });

  it('only ever names troops that stand on the island', () => {
    const ids = new Set(melee2.map((a) => a.id));
    for (let n = 0; n < 60; n++) {
      for (const b of homeCycle(melee2, 13, n).beats) {
        if ('id' in b) expect(ids.has(b.id)).toBe(true);
        if (b.k === 'hit' || (b.k === 'attack' && b.target >= 0)) expect(ids.has(b.target)).toBe(true);
      }
    }
  });
});
