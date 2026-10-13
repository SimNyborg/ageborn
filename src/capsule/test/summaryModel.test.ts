import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { createCatalog } from '../catalog';
import {
  buildSummary,
  buildWardrobeSummary,
  crateCard,
  foundItems,
  pickBestUpgrade,
  pityLines,
  progressFromCollections,
  revealCards,
  wardrobePityLines,
  type SummaryItem,
} from '../summaryModel';
import { DEFAULT_PITY_RULES } from '../types';
import { crate, PITY, reveal, stack, testCatalog } from './fixtures';
import { copiesText, FOUND_LAND_MS, FOUND_SEEN_MS, foundBurstAt, foundBurstLevel, summaryButtons } from '../summary';
import { RARITY_BURST } from '../rarityBurst';

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

describe('summary buttons (ui-plan 4.6, UA-18)', () => {
  it('has exactly one primary: Open next while more wait, else Done', () => {
    expect(summaryButtons({ pending: 2, openNext: true, openAll: true, upgrade: true, fromResult: false })).toEqual({
      primary: 'openNext',
      secondary: ['upgrade', 'openAll', 'done'],
    });
    expect(summaryButtons({ pending: 0, openNext: true, openAll: true, upgrade: false, fromResult: false })).toEqual({ primary: 'done', secondary: [] });
  });

  it('opened from the Result, the primary continues the Result path and never offers more capsules', () => {
    expect(summaryButtons({ pending: 3, openNext: true, openAll: true, upgrade: true, fromResult: true })).toEqual({ primary: 'done', secondary: ['upgrade'] });
    // Bug hunt 2026-10-01: from the Result, the other way on (Home) is a secondary.
    expect(summaryButtons({ pending: 0, openNext: false, openAll: false, upgrade: true, fromResult: true, alt: true })).toEqual({ primary: 'done', secondary: ['upgrade', 'alt'] });
  });

  it('copies never read over-full: a full bar says Upgrade ready', () => {
    expect(copiesText(8, 10)).toBe('8/10');
    expect(copiesText(10, 10)).toBeNull();
    expect(copiesText(5, 2)).toBeNull();
  });
});

describe('found collection items (A18.9.4, PLAN 2a)', () => {
  const holding = (key: string | null, tier: 'bronze' | 'gold' = 'bronze') => {
    const r = reveal({ tier, stacks: [stack('bonker', 'common')] });
    return { ...r, capsule: { ...r.capsule, contents: { ...r.capsule.contents, cosmetic: key } } };
  };

  it('lists the capsules\' items in capsule order, one tile per item, never in the fan', () => {
    const reveals = [holding('backdrop.eclipse'), holding(null), holding('emote.clap', 'gold'), holding('backdrop.eclipse')];
    const cards = revealCards(reveals, catalog);
    expect(cards.map((c) => c.key)).toEqual(['c:bonker']);
    const s = buildSummary(reveals, cards);
    expect(s.found).toEqual([
      { key: 'backdrop.eclipse', sources: [0, 3] },
      { key: 'emote.clap', sources: [2] },
    ]);
    expect(foundItems([holding(''), holding(null)])).toEqual([]);
    expect(buildSummary([reveal({ tier: 'bronze', stacks: [] })], []).found).toEqual([]);
  });

  it('carries a crate\'s item from its reveal card to its summary (the card itself stays a plain skin card)', () => {
    const card = crateCard(crate('pumpkin_head', 'rare', { cosmetic: 'scene.glacier_valley' }), catalog);
    expect(card.cosmetic).toBe('scene.glacier_valley');
    const s = buildWardrobeSummary(card);
    expect(s.found).toEqual([{ key: 'scene.glacier_valley', sources: [0] }]);
    expect('cosmetic' in s.items[0]!).toBe(false);
    expect(buildWardrobeSummary(crateCard(crate('pumpkin_head', 'rare'), catalog)).found).toEqual([]);
    expect('cosmetic' in crateCard(crate('pumpkin_head', 'rare', { cosmetic: null }), catalog)).toBe(false);
  });

  it('bursts only Epic and Legendary items, after the tile has landed and been seen', () => {
    expect(foundBurstLevel('common')).toBeNull();
    expect(foundBurstLevel('rare')).toBeNull();
    expect(foundBurstLevel('epic')).toBe('epic');
    expect(foundBurstLevel('legendary')).toBe('legendary');
    expect(foundBurstAt(90, 'epic')).toBe(90 + FOUND_LAND_MS + FOUND_SEEN_MS + RARITY_BURST.epic.popMs);
    expect(foundBurstAt(0, 'legendary')).toBeGreaterThan(foundBurstAt(0, 'epic'));
    // the pop never comes before the landing ends (no tease: the item is on screen first)
    for (const lv of ['epic', 'legendary'] as const) expect(foundBurstAt(0, lv) - RARITY_BURST[lv].popMs).toBeGreaterThanOrEqual(FOUND_LAND_MS);
  });
});
