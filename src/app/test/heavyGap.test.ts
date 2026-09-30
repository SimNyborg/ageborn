/**
 * The "no answer to Heavies" Result tip (DESIGN A9.2, A15.12; owner feedback 2026-09-29): after a loss
 * where the enemy fielded Heavies while the player's age had no Anti-heavy card, the Result names it.
 */
import { describe, expect, it } from 'vitest';
import type { MatchConfig, SimState } from '@/contracts';
import { content } from '@/content';
import { antiHeavyOf, HeavyGapDetector } from '../heavyGap';
import { lossTip, TRICKLE_TIP_KEY } from '../trickle';

type Units = SimState['units'];
const lane = (theirs: string[]): Units => theirs.map((card) => ({ side: 1, card, hp: 1000 })) as unknown as Units;
const state = (tick: number, units: Units): SimState => ({ tick, units, sides: [{ ageIndex: 0 }, { ageIndex: 0 }] }) as unknown as SimState;

function config(stone: (string | null)[]): MatchConfig {
  const loadout = { units: stone, turrets: ['rock_tosser', null], powers: { home: null, field: null } };
  return { seed: 1, format: 'short', content, sides: [{ label: 'You', isBot: false, loadouts: { stone: loadout }, levels: {}, skins: {} }, { label: 'AI', isBot: true, loadouts: { stone: loadout }, levels: {}, skins: {} }] } as unknown as MatchConfig;
}

describe('the Anti-heavy gap (A9.2)', () => {
  it('names the age and its Anti-heavy card when Heavies come and the loadout has none', () => {
    const d = new HeavyGapDetector(config(['bonker', 'pebbler', 'tuskback', null, null, null]), 0);
    d.update(state(20, lane(['bonker', 'bonker'])));
    expect(d.gap).toBeNull();
    d.update(state(40, lane(['tuskback', 'tuskback'])));
    expect(d.gap).toEqual({ age: 'stone', card: 'spear_hunter' });
  });

  it('stays quiet with an Anti-heavy card in the loadout', () => {
    const d = new HeavyGapDetector(config(['bonker', 'pebbler', 'tuskback', 'spear_hunter', null, null]), 0);
    d.update(state(40, lane(['tuskback', 'tuskback'])));
    expect(d.gap).toBeNull();
  });

  it('every age has its Anti-heavy card', () => {
    expect(content.order.ages.map((a) => antiHeavyOf(content, a))).toEqual([
      'spear_hunter', 'phalangite', 'pikeman', 'grenadier', 'harpoon_gunner', 'bazooka_trooper', 'rail_gunner', 'graviton_halberdier',
    ]);
  });

  it('the loss tip: the gap first, else the wave tip; never after a win or a draw', () => {
    const gap = { age: 'stone', card: 'spear_hunter' };
    expect(lossTip({ won: false, draw: false, trickled: true, heavyGap: gap })).toEqual({ key: 'app.tip.heavyGap', card: 'spear_hunter', age: 'stone' });
    expect(lossTip({ won: false, draw: false, trickled: true, heavyGap: null })).toEqual({ key: TRICKLE_TIP_KEY });
    expect(lossTip({ won: true, draw: false, trickled: true, heavyGap: gap })).toBeNull();
    expect(lossTip({ won: false, draw: true, trickled: false, heavyGap: gap })).toBeNull();
    expect(lossTip({ won: false, draw: false, trickled: false })).toBeNull();
  });
});
