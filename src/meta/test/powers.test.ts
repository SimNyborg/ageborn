/**
 * Age Power sources and the bot filter (DESIGN A2.9.1, A2.9.8): the War Path first-clear grant (a power,
 * or 60 Amber when already owned; Stone L5 opens the Field slot) and bots that only use powers the player
 * holds.
 */
import { describe, expect, it } from 'vitest';
import { POWER_OWNED_AMBER, botMayUsePower, grantWarPathPower, warPathPowerOf } from '../index';
import { META_FLAGS } from '../rules';
import { C, fresh } from './helpers';

describe('War Path power grants (A2.9.8)', () => {
  it('each region grants three distinct War Path powers on L5, L7 and L9', () => {
    for (const age of C.order.ages) {
      const ids = [5, 7, 9].map((l) => warPathPowerOf(C, age, l));
      expect(ids.every((id) => id !== null && C.powers[id]?.source === 'warPath' && C.powers[id]?.age === age), age).toBe(true);
      expect(new Set(ids).size, age).toBe(3);
      expect(warPathPowerOf(C, age, 6), age).toBeNull();
    }
  });

  it('a first clear grants the power once; a second grant pays 60 Amber instead', () => {
    const s0 = fresh();
    const id = warPathPowerOf(C, 'stone', 7) as string;
    expect(s0.powersOwned).not.toContain(id);
    const a = grantWarPathPower(s0, C, 'stone', 7);
    expect(a.save.powersOwned.filter((x) => x === id)).toHaveLength(1);
    expect(a.steps).toEqual([{ kind: 'card', card: id, copies: 0 }]);
    const b = grantWarPathPower(a.save, C, 'stone', 7);
    expect(b.save.powersOwned.filter((x) => x === id)).toHaveLength(1);
    expect(b.save.currencies.amber - a.save.currencies.amber).toBe(POWER_OWNED_AMBER);
    expect(b.steps).toEqual([{ kind: 'amber', amount: POWER_OWNED_AMBER }]);
  });

  it('the first clear of Stone L5 opens the Field slot; other levels do not', () => {
    const s0 = { ...fresh(), flags: { ...fresh().flags, [META_FLAGS.powerField]: false } };
    expect(grantWarPathPower(s0, C, 'stone', 5).save.flags[META_FLAGS.powerField]).toBe(true);
    expect(grantWarPathPower(s0, C, 'stone', 7).save.flags[META_FLAGS.powerField]).toBe(false);
    expect(grantWarPathPower(s0, C, 'bronze', 5).save.flags[META_FLAGS.powerField]).toBe(false);
  });
});

describe('bots use only powers the player could hold (A2.9.8)', () => {
  it('a War Path power needs the cleared level and the power in hand; starters always pass', () => {
    const id = warPathPowerOf(C, 'stone', 7) as string;
    const s0 = fresh();
    const cleared = { ...s0, warPath: { ...s0.warPath, stars: { ...s0.warPath.stars, 'wp.stone.l07': 1 } } };
    expect(botMayUsePower(C, s0, id)).toBe(false);
    // cleared, but the grant was not paid (a save from before the grant): not in the player's hands
    expect(botMayUsePower(C, cleared, id)).toBe(false);
    expect(botMayUsePower(C, grantWarPathPower(cleared, C, 'stone', 7).save, id)).toBe(true);
    // a War Path level bot may use its own region's powers
    expect(botMayUsePower(C, s0, id, ['stone'])).toBe(true);
    const starter = Object.values(C.powers).find((p) => p.source === 'starter')?.id as string;
    expect(botMayUsePower(C, s0, starter)).toBe(true);
  });
});
