/**
 * Last Base Standing content (DESIGN A2.10.1, A6.3, A15.8): the `last` and `last.bronze` windows, the
 * Siege steps, `endByMs` derived from the steps, where it is offered and what it pays, and the schema
 * checks that keep a broken schedule out.
 */
import { describe, expect, it } from 'vitest';
import { AGE_ORDER, FORMAT_MODES } from '../index';
import { content } from '../index';
import { UNTIMED, formats } from '../raw/economy';
import { escalationEndMs, validateContent } from '../schema';
import type { Content } from '../types';
import { cloneData } from '../util';

const M = 60000;

function issues(mut: (c: Content) => void): string[] {
  const c = cloneData(content) as Content;
  mut(c);
  return validateContent(c).map((i) => `${i.path}: ${i.message}`).filter((m) => m.startsWith('formats.last'));
}

describe('Last Base Standing formats (A2.10.1)', () => {
  it('is a 7-age untimed window from Stone, and from Bronze for Skirmish, with no Final Bell', () => {
    const last = content.formats['last'];
    expect(last).toMatchObject({ kind: 'untimed', overdriveMs: 12 * M, siegeMs: 14.5 * M, finalBellMs: null, retreatAfterMs: M });
    expect(last?.ages).toEqual(AGE_ORDER.slice(0, 7));
    expect(content.formats['last.bronze']?.ages).toEqual(AGE_ORDER.slice(1, 8));
    // The same XP thresholds as the Full War window it shares.
    expect(last?.xpToNextOverride).toEqual(content.formats['full']?.xpToNextOverride);
    // Only the two 7-age windows exist.
    expect(Object.values(content.formats).filter((f) => f.kind === 'untimed').map((f) => f.id).sort()).toEqual(['last', 'last.bronze']);
    expect(Object.values(content.formats).filter((f) => f.escalation).map((f) => f.id).sort()).toEqual(['last', 'last.bronze']);
  });

  it('rises every 2:30 from Siege I at 14:30 and crumbles from 22:00 (the spec table)', () => {
    expect(content.formats['last']?.escalation).toEqual([
      { atMs: 14.5 * M, baseDamageBp: 20000, turretDamageBp: 5000, crumbleBpPerSec: 0 },
      { atMs: 17 * M, baseDamageBp: 30000, turretDamageBp: 3500, crumbleBpPerSec: 0 },
      { atMs: 19.5 * M, baseDamageBp: 40000, turretDamageBp: 2500, crumbleBpPerSec: 0 },
      { atMs: 22 * M, baseDamageBp: 40000, turretDamageBp: 2500, crumbleBpPerSec: 50 },
      { atMs: 24.5 * M, baseDamageBp: 40000, turretDamageBp: 2500, crumbleBpPerSec: 100 },
    ]);
    // Siege I is today's Siege values (without the decay, which the sim turns off for steps).
    const first = content.formats['last']?.escalation?.[0];
    expect(first?.baseDamageBp).toBe(content.economy.siege.baseDamageBp);
    expect(first?.turretDamageBp).toBe(content.economy.siege.turretDamageBp);
    expect(content.economy.siege.ropeDeadBandLu).toBe(40);
  });

  it('derives endByMs from the steps: a base falls by 26:35', () => {
    expect(escalationEndMs(UNTIMED.steps)).toBe(1595000);
    expect(UNTIMED.endByMs).toBe(1595000);
    for (const id of ['last', 'last.bronze']) expect(formats[id]?.endByMs, id).toBe(escalationEndMs(formats[id]?.escalation ?? []));
    // The bound by hand: 150 s at ≥ 50 bp/s of combined HP, then 12,500 bp at ≥ 100 bp/s (125 s).
    expect(22 * M + 150000 + 125000).toBe(1595000);
    expect(escalationEndMs([{ atMs: 1000, crumbleBpPerSec: 0 }])).toBeNull();
    expect(escalationEndMs([{ atMs: 0, crumbleBpPerSec: 100 }])).toBe(200000);
  });

  it('is offered on the Ladder from Arena 3 and in Skirmish, never the Daily, Conquest or War Path', () => {
    expect(FORMAT_MODES['last']).toEqual(['ladder', 'skirmish']);
    expect(content.arenas.list.map((a) => a.ladderFormats.includes('last'))).toEqual([false, false, true, true, true, true, true, true]);
    expect(content.dailyModifiers.challenge.format).not.toBe('last');
    expect(content.generals.conquest.format).not.toBe('last');
  });

  it('pays the Full War Amber and no trophies (unranked, A15.8)', () => {
    const l = content.arenas.ladder.winByFormat.formats;
    expect(l.last).toEqual({ trophies: 0, amber: l.full?.amber, amberWithoutCharge: l.full?.amberWithoutCharge, unranked: true });
  });
});

describe('schema checks for Siege steps (A2.10.1)', () => {
  it('accepts the shipped schedule', () => {
    expect(issues(() => undefined)).toEqual([]);
  });

  it('refuses a Final Bell, a first step off siegeMs, steps out of order, a milder later step and a wrong endByMs', () => {
    expect(issues((c) => (c.formats['last']!.finalBellMs = 30 * M)).join('\n')).toMatch(/no Final Bell/);
    expect(issues((c) => (c.formats['last']!.siegeMs = 14 * M)).join('\n')).toMatch(/starts at siegeMs/);
    expect(issues((c) => (c.formats['last']!.escalation![2]!.atMs = 16 * M)).join('\n')).toMatch(/time order/);
    expect(issues((c) => (c.formats['last']!.escalation![2]!.turretDamageBp = 9000)).join('\n')).toMatch(/never milder/);
    expect(issues((c) => (c.formats['last']!.endByMs = 1700000)).join('\n')).toMatch(/derived from the steps/);
    expect(issues((c) => c.formats['last']!.escalation!.forEach((x) => (x.crumbleBpPerSec = 0))).join('\n')).toMatch(/guarantees an end/);
    expect(issues((c) => (c.formats['last']!.ages = c.formats['last']!.ages.slice(0, 5))).join('\n')).toMatch(/7 ages/);
  });
});
