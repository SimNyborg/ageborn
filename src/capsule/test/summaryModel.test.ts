import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { createCatalog } from '../catalog';
import {
  buildSummary,
  pickBestUpgrade,
  pityLines,
  progressFromCollections,
  revealCards,
  wardrobePityLines,
  type SummaryItem,
} from '../summaryModel';
import { DEFAULT_PITY_RULES } from '../types';
import { PITY, reveal, stack, testCatalog } from './fixtures';

const catalog = testCatalog();

describe('summary (DESIGN A10 step 8)', () => {
  it('merges several capsules by card: copies and Dust add up, best foil and NEW win', () => {
    const cards = revealCards(
      [
        reveal({ tier: 'bronze', stacks: [stack('bonker', 'common', { copies: 3, foil: 'bronze' }), stack('spear_hunter', 'rare')] }),
        reveal({ tier: 'bronze', stacks: [stack('bonker', 'common', { copies: 2, foil: 'holo', isNew: true, dust: 10 })] }),
      ],
      catalog,
    );
    const bonker = cards.find((c) => c.card === 'bonker');
    expect(bonker).toMatchObject({ copies: 5, foil: 'holo', isNew: true, dust: 10, sources: [0, 1] });
    expect(cards).toHaveLength(2);
  });

  it('lists the rarest first, new before owned, and totals Amber and Dust', () => {
    const r = reveal({
      tier: 'jade',
      amber: 800,
      dust: 100,
      stacks: [
        stack('a', 'common', { copies: 14 }),
        stack('b', 'rare', { copies: 6 }),
        stack('c', 'rare', { copies: 6, isNew: true }),
        stack('d', 'epic', { copies: 3, dust: 300 }),
      ],
    });
    const s = buildSummary([r], revealCards([r], catalog));
    expect(s.items.map((i) => i.card)).toEqual(['d', 'c', 'b', 'a']);
    expect(s.amber).toBe(800);
    expect(s.dust).toBe(400);
    expect(s.newCards).toEqual(['c']);
    expect(s.pityBefore).toEqual(r.pityBefore);
    expect(s.pityAfter).toEqual(r.pityAfter);
  });

  it('picks the best ready upgrade: rarest, then lowest level', () => {
    const item = (card: string, rarity: SummaryItem['rarity'], level: number, ready: boolean, slot: number): SummaryItem => ({
      key: card,
      slot,
      kind: 'card',
      card,
      skin: null,
      rarity,
      copies: 1,
      foil: 'none',
      isNew: false,
      dust: 0,
      firstLegendary: false,
      sources: [0],
      progress: { level, before: 0, after: 5, need: ready ? 5 : 9 },
      upgradeReady: ready,
    });
    expect(pickBestUpgrade([item('a', 'common', 1, true, 0), item('b', 'rare', 5, true, 1), item('c', 'rare', 3, true, 2)])).toBe('c');
    expect(pickBestUpgrade([item('a', 'epic', 1, false, 0)])).toBeNull();
  });

  it('computes copies bars from the collection before and after opening', () => {
    const before: SaveDoc['collection'] = { bonker: { level: 2, copies: 1, isNew: false, foil: 'none' } };
    const after: SaveDoc['collection'] = {
      bonker: { level: 2, copies: 4, isNew: false, foil: 'none' },
      pebbler: { level: 1, copies: 0, isNew: true, foil: 'none' },
      maxed: { level: 10, copies: 0, isNew: false, foil: 'none' },
    };
    const upgradeCopies = { common: [2, 3, 5, 8, 12, 18, 25, 35, 45], rare: [1], epic: [1], legendary: [1] };
    const p = progressFromCollections(before, after, upgradeCopies, 10);
    expect(p('bonker', 'common')).toEqual({ level: 2, before: 1, after: 4, need: 3 });
    expect(p('pebbler', 'common')).toEqual({ level: 1, before: 0, after: 0, need: 2 });
    expect(p('maxed', 'common')?.need).toBeNull();
    expect(p('unknown', 'common')).toBeNull();
  });

  it('turns pity counters into "within N" lines (A6.5)', () => {
    expect(pityLines(PITY, DEFAULT_PITY_RULES)).toEqual([
      { key: 'capsule.pity.epic', n: 7 },
      { key: 'capsule.pity.legendary', n: 28 },
      { key: 'capsule.pity.newCard', n: 4 },
    ]);
    expect(pityLines({ ...PITY, sinceEpic: 12 }, DEFAULT_PITY_RULES)[0]?.n).toBe(1);
    // Legendary n = 40 is guaranteed: with 39 opened since the last one, the next capsule holds it.
    expect(pityLines({ ...PITY, sinceLegendary: 39 }, DEFAULT_PITY_RULES)[1]?.n).toBe(1);
    // No unowned card left in the pool: no new-card promise on screen (A6.5 "while unowned cards exist").
    expect(pityLines(PITY, DEFAULT_PITY_RULES, false).map((l) => l.key)).toEqual(['capsule.pity.epic', 'capsule.pity.legendary']);
    expect(wardrobePityLines(PITY, DEFAULT_PITY_RULES)).toEqual([
      { key: 'capsule.pity.wardrobeEpic', n: 3 },
      { key: 'capsule.pity.wardrobeLegendary', n: 18 },
    ]);
  });
});

describe('catalog', () => {
  it('falls back to A14.1 conventions without content', () => {
    const c = createCatalog();
    expect(c.card('bonker')).toEqual({ age: null, visualId: 'unit.bonker', nameKey: 'card.bonker.name', view: 'unit', group: null });
    expect(c.hasClimb('win')).toBe(true);
    expect(c.hasClimb('daily')).toBe(true);
    expect(c.hasClimb('meter')).toBe(true);
    expect(c.hasClimb('road')).toBe(false);
    expect(c.hasClimb('ageUnlock')).toBe(false);
  });
});
