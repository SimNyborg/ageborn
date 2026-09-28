import { describe, expect, it } from 'vitest';
import type { SimEvent, SimState } from '@/contracts';
import { content } from '@/content';
import { lossTipKey, TRICKLE_TIP_KEY, TrickleDetector } from '../trickle';

type Units = SimState['units'];

const spawn = (side: 0 | 1, card = 'bonker', summoned = false): SimEvent => ({ e: 'unitSpawned', id: 1, side, card, x: 0, summoned, level: 1 }) as unknown as SimEvent;
const army = (mine: string[], theirs: string[]): Units => [...mine.map((card) => ({ side: 0, card })), ...theirs.map((card) => ({ side: 1, card }))] as unknown as Units;

/** Feeds spawns of the player's side at the given ticks against a fixed lane. */
function run(ticks: number[], units: Units, o: { summoned?: boolean } = {}): TrickleDetector {
  const d = new TrickleDetector(content, 0);
  for (const tick of ticks) d.update([spawn(0, 'bonker', o.summoned)], { tick, units });
  return d;
}

describe('trickle detector (A16.6)', () => {
  const outnumbered = army(['bonker'], ['tuskback', 'tuskback']);

  it('fires on 6 spawns in 30 s, none within 2 s, while the enemy army is ≥ 1.5 × yours', () => {
    const d = run([0, 50, 100, 150, 200, 250], outnumbered);
    expect(d.fired).toBe(true);
    expect(d.firstTick).toBe(250);
  });

  it('stays quiet for a wave (two spawns within 2 s), for 5 spawns, or spread over more than 30 s', () => {
    expect(run([0, 50, 100, 150, 200, 230], outnumbered).fired).toBe(false);
    expect(run([0, 50, 100, 150, 200], outnumbered).fired).toBe(false);
    expect(run([0, 130, 260, 390, 520, 650], outnumbered).fired).toBe(false);
  });

  it('stays quiet when the enemy army is not 1.5 × yours, and ignores summoned units and the foe', () => {
    expect(run([0, 50, 100, 150, 200, 250], army(['tuskback'], ['tuskback'])).fired).toBe(false);
    expect(run([0, 50, 100, 150, 200, 250], outnumbered, { summoned: true }).fired).toBe(false);
    const d = new TrickleDetector(content, 0);
    for (const tick of [0, 50, 100, 150, 200, 250]) d.update([spawn(1)], { tick, units: outnumbered });
    expect(d.fired).toBe(false);
  });

  it('shows the wave tip only after a loss where it fired', () => {
    expect(lossTipKey({ won: false, draw: false, trickled: true })).toBe(TRICKLE_TIP_KEY);
    expect(lossTipKey({ won: true, draw: false, trickled: true })).toBeNull();
    expect(lossTipKey({ won: false, draw: true, trickled: true })).toBeNull();
    expect(lossTipKey({ won: false, draw: false, trickled: false })).toBeNull();
  });
});
