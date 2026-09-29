/**
 * The War Council's HUD rules (DESIGN A18.5, A18.5.7): lines and their next pair, pick states, the
 * underdog price, rank unlocks by window, "Not in this tray", and the two-tap spend.
 */
import type { HudModel, HudResearch, MatchConfig } from '@/contracts';
import { content } from '@/content';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { describe, expect, it } from 'vitest';
import { councilView, discounted, lineOf, researchIntent, troopLines } from '../council';
import { sampleHudModel } from '../samples';

const base = fakeMatchConfig();
const config: MatchConfig = {
  ...base,
  format: 'standard',
  content,
  sides: [
    // A Stone tray with Infantry, Ranged and Heavy only (no Anti-armor, no Support).
    { ...base.sides[0], loadouts: { stone: { units: ['bonker', 'pebbler', 'tuskback', null, null, null], turrets: [null, null], powers: { home: null, field: null } } } },
    base.sides[1],
  ] as MatchConfig['sides'],
};

function model(r: Partial<HudResearch>, gold = 500): HudModel {
  const research: HudResearch = { owned: [], current: null, progressBp: 0, leftMs: 0, ranksOpen: 1, discount: false, ...r };
  const m = sampleHudModel(config, 0, { me: { gold } });
  return { ...m, me: { ...m.me, research } };
}

describe('War Council view (A18.5.7)', () => {
  it('has one line per track and per Troops class, each offering its rank I pair first', () => {
    const v = councilView(model({}), config, 0);
    expect(v.lines.map((l) => l.key)).toEqual([
      'troops.infantry',
      'troops.ranged',
      'troops.heavy',
      'troops.antiArmor',
      'troops.support',
      'defences',
      'economy',
      'command',
    ]);
    for (const l of v.lines) {
      expect(l.nextRank).toBe(1);
      expect(l.pair?.map((p) => p.def.pick)).toEqual([0, 1]);
    }
    const eco = lineOf(v, 'economy');
    expect(eco?.pair?.map((p) => p.def.id)).toEqual(['economy.granary', 'economy.forage']);
    expect(eco?.pair?.every((p) => p.state === 'ready' && p.price === 150 && p.timeMs === 10_000)).toBe(true);
    expect(v.anyReady).toBe(true);
    expect(v.enabled).toBe(true);
  });

  it('marks classes the current tray lacks "Not in this tray" (A18.5.2)', () => {
    const v = councilView(model({}), config, 0);
    expect(troopLines(v).filter((l) => !l.inTray).map((l) => l.group)).toEqual(['antiArmor', 'support']);
  });

  it('owning a pick moves its line to the next rank; rank II waits for its unlock age (Standard: 2nd age)', () => {
    const v = councilView(model({ owned: ['economy.granary'], ranksOpen: 1 }), config, 0);
    const eco = lineOf(v, 'economy');
    expect(eco?.ownedRanks).toBe(1);
    expect(eco?.nextRank).toBe(2);
    expect(eco?.pair?.map((p) => p.state)).toEqual(['locked', 'locked']);
    expect(eco?.pair?.[0]?.opensAt).toBe(content.formats['standard']?.ages[1]);
    const open = lineOf(councilView(model({ owned: ['economy.granary'], ranksOpen: 2 }), config, 0), 'economy');
    expect(open?.pair?.map((p) => [p.def.id, p.state, p.price])).toEqual([
      ['economy.market', 'ready', 300],
      ['economy.bounty_hunters', 'ready', 300],
    ]);
  });

  it('a line with every v1 rank owned is complete', () => {
    const v = councilView(model({ owned: ['command.signal_fires'], ranksOpen: 3 }), config, 0);
    const cmd = lineOf(v, 'command');
    expect(cmd?.pair).toBeNull();
    expect(cmd?.owned.map((d) => d.id)).toEqual(['command.signal_fires']);
  });

  it('one slot: while research runs, every other pick is busy and the current one says so', () => {
    const v = councilView(model({ current: 'economy.granary', progressBp: 5000, leftMs: 5000 }), config, 0);
    expect(v.current?.def.id).toBe('economy.granary');
    expect(v.current?.line).toBe('economy');
    expect(lineOf(v, 'economy')?.pair?.map((p) => p.state)).toEqual(['researching', 'busy']);
    expect(lineOf(v, 'defences')?.pair?.every((p) => p.state === 'busy')).toBe(true);
    expect(v.anyReady).toBe(false);
  });

  it('not enough gold is "poor"; the underdog discount lowers the price, rounded down (A18.5.1)', () => {
    const poor = councilView(model({}, 149), config, 0);
    expect(lineOf(poor, 'defences')?.pair?.[0]?.state).toBe('poor');
    const sale = councilView(model({ discount: true }, 120), config, 0);
    const p = lineOf(sale, 'defences')?.pair?.[0];
    expect([p?.listPrice, p?.price, p?.state]).toEqual([150, 120, 'ready']);
    expect(discounted(155, true, 2000)).toBe(124);
    expect(discounted(155, false, 2000)).toBe(155);
  });

  it('the second tap sends the research command; a pick that cannot start is denied', () => {
    const v = councilView(model({}), config, 0);
    const mail = lineOf(v, 'troops.infantry')?.pair?.[1];
    expect(mail && researchIntent(mail, 0)).toEqual({
      k: 'command',
      cmd: { t: 'research', side: 0, track: 'troops', group: 'infantry', rank: 1, pick: 1 },
      target: 'council',
    });
    const granary = lineOf(v, 'economy')?.pair?.[0];
    expect(granary && researchIntent(granary, 1)).toEqual({ k: 'command', cmd: { t: 'research', side: 1, track: 'economy', rank: 1, pick: 0 }, target: 'council' });
    const busy = lineOf(councilView(model({ current: 'economy.granary' }), config, 0), 'defences')?.pair?.[0];
    expect(busy && researchIntent(busy, 0)).toEqual({ k: 'deny', target: 'council' });
  });

  it('is off without research in the model (older models) or with no rank open', () => {
    const m = sampleHudModel(config, 0);
    const { research: _r, ...me } = m.me;
    expect(councilView({ ...m, me }, config, 0).enabled).toBe(false);
    expect(councilView(model({ ranksOpen: 0 }), config, 0).enabled).toBe(false);
  });
});
