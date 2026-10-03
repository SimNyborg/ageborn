/**
 * The release gate on the screens (docs/decisions.md, "Release gate for unfinished content"): a card
 * held back with `released: false` shows in no Card Album, Army (deck builder) list, collection filter,
 * skin picker or completion count, even for a save that owns everything.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { PAUSED_WAVE_IDS } from '../../../../tests/fixtures/pausedWave';
import { maxedSave, newPlayerSave } from '../fixtures/saves';
import { cardsOfAge, collectionProgress, skinsFor } from '../model/cards';
import { filterCards, NO_FILTER } from '../model/collection';
import { dexOf, dexOrder } from '../model/dex';
import { albumProgress, ARMY_FILTER, armyCards, candidates } from '../model/plan';

const gated = (id: string): boolean => PAUSED_WAVE_IDS.has(id);

describe('release gate (screens)', () => {
  it('the Card Album lists no held-back card, and counts 34 Stone cards (17 plus the shipped Stone wave)', () => {
    expect(dexOrder(content).map((x) => x.id).filter(gated)).toEqual([]);
    const dex = dexOf(maxedSave(content), content);
    expect(dex.ages.flatMap((a) => a.entries.map((e) => e.id)).filter(gated)).toEqual([]);
    expect(dex.ages.find((a) => a.age === 'stone')?.total).toBe(34);
    expect(albumProgress(maxedSave(content), content)).toEqual({ owned: dex.total, total: dex.total });
  });

  it('the Army deck builder offers no held-back card in any slot kind or age', () => {
    for (const s of [maxedSave(content), newPlayerSave(content)]) {
      for (const age of content.order.ages) {
        expect(armyCards(s, content, age, ARMY_FILTER).filter(gated), age).toEqual([]);
        for (const kind of ['unit', 'turret', 'power', 'fort'] as const) expect(candidates(s, content, age, kind).filter(gated), `${age} ${kind}`).toEqual([]);
        const c = cardsOfAge(content, age);
        expect([...c.units, ...c.turrets, ...c.powers, ...c.forts].filter(gated), age).toEqual([]);
      }
    }
  });

  it('collection filters, completion and skin pickers skip held-back cards and skins', () => {
    expect(filterCards(maxedSave(content), content, NO_FILTER).filter(gated)).toEqual([]);
    expect(collectionProgress(maxedSave(content), content).total).toBe(133);
    expect(skinsFor(content, 'pebbler').map((k) => k.id)).toEqual(['snowball_pebbler']);
    expect(skinsFor(content, 'sabertooth').map((k) => k.id)).toEqual(['fossil_sabertooth']);
    expect(skinsFor(content, 'bonker').map((k) => k.id)).toEqual(['pumpkin_head']);
  });
});
