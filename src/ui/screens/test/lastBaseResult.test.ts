/**
 * The Result's reason line for a war with no clock (Last Base Standing, A2.10.1; spec 2.4): how and
 * when it ended, and whether the walls crumbled (the base fell during a Crumble step).
 */
import { content } from '@/content';
import { i18n } from '@/i18n';
import type { MatchResultInput } from '@/contracts';
import { describe, expect, it } from 'vitest';
import { fixtureResult } from '../fixtures/matches';
import { lastBaseReason } from '../result/ResultScreen';

const t = (k: string, v?: Record<string, string | number>) => i18n.t(k, v);

function input(o: Partial<MatchResultInput['outcome']>, format = 'last'): MatchResultInput {
  const base = fixtureResult(content, 'lastWin').input;
  return { ...base, opponent: { ...base.opponent, format }, outcome: { ...base.outcome, ...o } };
}

describe('lastBaseReason (A2.10.1)', () => {
  it('names the fall, the crumble, a draw and a Retreat with the time', () => {
    // 15:00 is before Crumble (23:00): the base fell.
    expect(lastBaseReason(input({ winner: 0, reason: 'baseDestroyed', tick: 18000 }), content, t)).toBe('Their base fell at 15:00');
    expect(lastBaseReason(input({ winner: 1, reason: 'baseDestroyed', tick: 18000 }), content, t)).toBe('Your base fell at 15:00');
    // 23:41 is in Crumble: the walls crumbled.
    expect(lastBaseReason(input({ winner: 1, reason: 'baseDestroyed', tick: 28420 }), content, t)).toBe('Your walls crumbled at 23:41');
    expect(lastBaseReason(input({ winner: null, reason: 'bothDestroyed', tick: 31000 }), content, t)).toBe('Both bases fell together at 25:50');
    expect(lastBaseReason(input({ winner: 1, reason: 'retreat', tick: 2400 }), content, t)).toBe('You retreated at 2:00');
  });

  it('is null in a war without Siege steps (a War Path window)', () => {
    expect(lastBaseReason(input({ winner: 0, reason: 'baseDestroyed', tick: 6000 }, 'w2.stone'), content, t)).toBeNull();
  });
});

describe('the reason line of a timed war with the Siege rope (A2.10.2)', () => {
  it('names a fall before Siege, a crumble in Siege and who led at the Final Bell', () => {
    // Short War: Siege (and the rope) from 6:30, the Final Bell at 8:30.
    expect(lastBaseReason(input({ winner: 0, reason: 'baseDestroyed', tick: 6000 }, 'short'), content, t)).toBe('Their base fell at 5:00');
    expect(lastBaseReason(input({ winner: 1, reason: 'baseDestroyed', tick: 8400 }, 'short'), content, t)).toBe('Your walls crumbled at 7:00');
    expect(lastBaseReason(input({ winner: 0, reason: 'finalBell', tick: 10200 }, 'short'), content, t)).toBe('You led at the Final Bell');
    expect(lastBaseReason(input({ winner: 1, reason: 'finalBell', tick: 10200 }, 'standard'), content, t)).toBe('They led at the Final Bell');
    expect(lastBaseReason(input({ winner: null, reason: 'finalBell', tick: 10200 }, 'full'), content, t)).toBe('Even at the Final Bell');
  });
});
