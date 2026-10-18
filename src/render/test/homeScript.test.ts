/**
 * Home's live island choreography (queue item 37, `showcase/homeScript.ts`): seeded and deterministic, the
 * battle's timing (the sim's wind-up, projectile flight), walks on planted feet, nobody falls, and every
 * cycle ends with each troop back on its spot. Cycles per cast: the front pair's duel or shots, a back-row
 * volley, and a warm-up swing when no opponent stands on the island.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import type { CardId, Side } from '@/contracts';
import { HOME_IDS, homeCycle, plantedSpeed, type HomeActor, type HomeBeat } from '../showcase/homeScript';
import { flightMs, troopPlan } from '../showcase/script';

const SPOTS: Record<Side, [number, number]> = { 0: [-57, -129], 1: [57, 129] };

function actor(side: Side, slot: 0 | 1, card: string, natural: number | null = 50): HomeActor {
  const def = content.units[card];
  if (!def) throw new Error(`no card ${card}`);
  const plan = troopPlan(content, def);
  return { id: (side === 0 ? HOME_IDS.me : HOME_IDS.foe)[slot], side, slot, card: card as CardId, plan, homeX: SPOTS[side][slot], homeY: slot === 1 ? -5 : 0, front: 36, naturalSpeed: natural };
}

/** Where each troop ends a cycle: the target of its last walk (its spot when it never walks). */
function ends(cast: readonly HomeActor[], beats: readonly HomeBeat[]): Map<number, number> {
  const out = new Map(cast.map((a) => [a.id, a.homeX] as [number, number]));
  for (const b of beats) if (b.k === 'walk') out.set(b.id, b.toX);
  return out;
}

const melee2: HomeActor[] = [actor(0, 0, 'footman'), actor(0, 1, 'longbowman'), actor(1, 0, 'squire_pair'), actor(1, 1, 'longbowman')];
const meleeOnly: HomeActor[] = [actor(0, 0, 'footman'), actor(1, 0, 'squire_pair')];

describe('the island choreography', () => {
  it('is the same for the same troops, seed and cycle, and differs with the seed', () => {
    const a = homeCycle(melee2, 42, 3);
    const b = homeCycle(melee2, 42, 3);
    expect(b).toEqual(a);
    const kinds = new Set<string>();
    const shapes = new Set<string>();
    for (let s = 0; s < 12; s++) {
      const c = homeCycle(melee2, s * 977, 1);
      kinds.add(c.kind);
      shapes.add(JSON.stringify(c.beats));
    }
    expect(shapes.size).toBeGreaterThan(8);
    expect(kinds.size).toBeGreaterThan(1);
  });

  it('ends every cycle with each troop back on its spot, its beats in order inside the cycle', () => {
    for (const cast of [melee2, meleeOnly, melee2.slice(0, 2)]) {
      for (let n = 0; n < 40; n++) {
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

  it('walks on planted feet: never slower than the stride allows (the walk clip would stop or slide)', () => {
    for (let n = 0; n < 60; n++) {
      for (const b of homeCycle(melee2, 3, n).beats) {
        if (b.k !== 'walk') continue;
        const a = melee2.find((x) => x.id === b.id)!;
        expect(b.speed).toBeGreaterThanOrEqual(12);
        expect(b.speed).toBeGreaterThanOrEqual(0.45 * (a.naturalSpeed ?? a.plan.groundSpeed) - 1e-9);
      }
    }
    // the floor holds for a slow troop with a long natural stride, and a fast one is never asked past its ground speed
    const slow = actor(0, 0, 'footman', 90);
    expect(plantedSpeed(slow, 0.3)).toBeGreaterThanOrEqual(90 * 0.45);
    expect(plantedSpeed(actor(0, 0, 'footman', 20), 1)).toBeLessThanOrEqual(Math.max(slow.plan.groundSpeed, 9));
  });

  it("strikes with the battle's timing: the hit lands at the wind-up (plus the shot's flight)", () => {
    let attacks = 0;
    for (let n = 0; n < 30; n++) {
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

  it('shows the exchanges the troops can make: duels for a melee pair, volleys from a back-row shooter, shots for a shooter in front', () => {
    const kinds = (cast: readonly HomeActor[]) => new Set(Array.from({ length: 30 }, (_, n) => homeCycle(cast, 5, n).kind));
    expect(kinds(melee2)).toEqual(new Set(['duel', 'volley']));
    expect(kinds(meleeOnly)).toEqual(new Set(['duel']));
    const shooterFront = [actor(0, 0, 'longbowman'), actor(1, 0, 'footman')];
    expect(kinds(shooterFront)).toEqual(new Set(['shots']));
  });

  it('with no opponent on the island (a ranked search) the front troop only swings at the air', () => {
    const mine = melee2.filter((a) => a.side === 0);
    for (let n = 0; n < 20; n++) {
      const c = homeCycle(mine, 9, n);
      expect(c.kind).toBe('drill');
      expect(c.beats.some((b) => b.k === 'hit' || b.k === 'shot')).toBe(false);
      for (const b of c.beats) if (b.k === 'attack') expect(b.target).toBe(-1);
    }
    expect(homeCycle([], 1, 0)).toMatchObject({ kind: 'calm', beats: [] });
  });

  it('moves within a second of going live, then breathes for a few seconds between exchanges', () => {
    const first = homeCycle(melee2, 21, 0);
    const firstMove = first.beats.find((b) => b.k === 'attack' || (b.k === 'walk' && melee2.find((a) => a.id === b.id)?.slot === 0));
    expect(firstMove?.at ?? Infinity).toBeLessThanOrEqual(1300);
    const later = Array.from({ length: 20 }, (_, n) => homeCycle(meleeOnly, 21, n + 1));
    for (const c of later) {
      expect(c.ms).toBeGreaterThan(3000);
      expect(c.ms).toBeLessThan(14000);
    }
  });

  it('only ever names troops that stand on the island', () => {
    const ids = new Set(melee2.map((a) => a.id));
    for (let n = 0; n < 30; n++) {
      for (const b of homeCycle(melee2, 13, n).beats) {
        if ('id' in b) expect(ids.has(b.id)).toBe(true);
        if (b.k === 'hit' || (b.k === 'attack' && b.target >= 0)) expect(ids.has(b.target)).toBe(true);
      }
    }
  });
});
