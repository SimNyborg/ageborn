/**
 * The odds sheet's cosmetic lines per collection (PLAN 2a "odds per collection", A15.3): each drop
 * pool's items per collection and rarity, skies, scenes and base skins among them, never national
 * flags (bought with Dust), with what the save owns; the numbers are the content's released items.
 */
import { content } from '@/content';
import type { Content, CosmeticItemDef } from '@/content/types';
import type { Rarity } from '@/contracts';
import { poolItems } from '@/meta/cosmetics';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { midGameSave } from '../../screens/fixtures/saves';
import { installDom, text, type FakeElement } from '../../screens/test/dom';
import { UiKitContext, defaultKit } from '../kit';
import { OddsSheet } from '../OddsSheet';
import { oddsModel, POOL_COLLECTIONS } from '../oddsModel';

const col = content.cosmetics.collections;
const released = (x: CosmeticItemDef) => x.released !== false;

let container: FakeElement | null = null;
function show(node: preact.ComponentChildren) {
  const dom = installDom();
  container = dom.container;
  act(() => render(<UiKitContext.Provider value={defaultKit}>{node}</UiKitContext.Provider>, container as unknown as HTMLElement));
  return dom.container;
}
afterEach(() => {
  if (container) act(() => render(null, container as unknown as HTMLElement));
  container = null;
});

const modelFor = (c: Content = content) => oddsModel(c.capsules, c.rarities, midGameSave(c), true, c.cosmetics.collections).cosmetics!;

describe('cosmetic odds per collection (PLAN 2a)', () => {
  it('counts each pool\'s released items per collection and rarity; the rows add up to the rarity lines', () => {
    const m = modelFor();
    for (const [pool, rows, rarityRows] of [
      ['capsule', m.capsuleCollections, m.capsuleRarityBp],
      ['crate', m.crateCollections, m.crateRarityBp],
    ] as const) {
      for (const row of rows) {
        const items = col.items.filter((x) => released(x) && x.source.kind === pool && x.collection === row.collection);
        expect(row.total, `${pool} ${row.collection}`).toBe(items.length);
        for (const r of ['common', 'rare', 'epic', 'legendary'] as Rarity[]) expect(row.items[r], `${pool} ${row.collection} ${r}`).toBe(items.filter((x) => x.rarity === r).length);
      }
      for (const r of rarityRows) expect(rows.reduce((n, row) => n + row.items[r.rarity], 0), `${pool} ${r.rarity}`).toBe(r.items);
      expect(rows.map((r) => r.collection)).not.toContain('nationalFlag');
      expect(rows.every((r) => r.total > 0)).toBe(true);
    }
    // skies and base skins are in the pools today; the order is the sheet's
    expect(m.capsuleCollections.map((r) => r.collection)).toContain('backdrop');
    expect(m.crateCollections.map((r) => r.collection)).toContain('baseSkin');
    for (const rows of [m.capsuleCollections, m.crateCollections]) {
      const order = rows.map((r) => POOL_COLLECTIONS.indexOf(r.collection));
      expect(order).toEqual([...order].sort((a, b) => a - b));
    }
  });

  it("each line equals what meta's `poolItems` rolls from (round 3: the 13 new base skins and the scenes as they ship)", () => {
    // the shipped content, and the same content with every held item released (an Epic scene's flag flipping)
    const all = { ...content, cosmetics: { ...content.cosmetics, collections: { ...col, items: col.items.map((x) => ({ ...x, released: true })) } } } as Content;
    for (const c of [content, all]) {
      const m = modelFor(c);
      for (const [pool, rows] of [
        ['capsule', m.capsuleCollections],
        ['crate', m.crateCollections],
      ] as const) {
        const items = poolItems(c, pool);
        const collections = [...new Set(items.map((x) => x.collection))];
        expect(rows.map((r) => r.collection).sort(), pool).toEqual(collections.sort());
        for (const row of rows) {
          const mine = items.filter((x) => x.collection === row.collection);
          expect(row.total, `${pool} ${row.collection}`).toBe(mine.length);
          for (const r of ['common', 'rare', 'epic', 'legendary'] as Rarity[]) expect(row.items[r], `${pool} ${row.collection} ${r}`).toBe(poolItems(c, pool, r).filter((x) => x.collection === row.collection).length);
        }
        expect(rows.map((r) => r.collection)).not.toContain('nationalFlag');
      }
    }
    // released base skins sit in both pools (Time Capsule Rares; Wardrobe Crate Rares, Epics and Legendaries)
    const m = modelFor();
    for (const [pool, rows] of [
      ['capsule', m.capsuleCollections],
      ['crate', m.crateCollections],
    ] as const) {
      const shipped = col.items.filter((x) => x.collection === 'baseSkin' && released(x) && x.source.kind === pool);
      if (shipped.length > 0) expect(rows.find((r) => r.collection === 'baseSkin')?.total, pool).toBe(shipped.length);
    }
  });

  it('lists scenes once one ships, and never an unreleased one', () => {
    const scene = (id: string, released: boolean): CosmeticItemDef => ({ id, collection: 'scene', rarity: 'rare', source: { kind: 'capsule' }, art: `cosmetic.scene.${id}`, nameKey: `cosmetic.scene.${id}.name`, age: 'stone', released });
    const base = col.items.filter((x) => x.collection !== 'scene');
    const withScenes = (...xs: CosmeticItemDef[]) => ({ ...content, cosmetics: { ...content.cosmetics, collections: { ...col, items: [...base, ...xs] } } }) as Content;
    expect(modelFor(withScenes(scene('held', false))).capsuleCollections.map((r) => r.collection)).not.toContain('scene');
    const shipped = modelFor(withScenes(scene('a', true), scene('held', false))).capsuleCollections.find((r) => r.collection === 'scene');
    expect(shipped).toEqual({ collection: 'scene', items: { common: 0, rare: 1, epic: 0, legendary: 0 }, owned: 0, total: 1 });
  });

  it('counts what the save owns of each collection', () => {
    const s = midGameSave(content);
    const m = oddsModel(content.capsules, content.rarities, s, true, col).cosmetics!;
    const owned = new Set(s.cosmetics.owned);
    for (const row of m.capsuleCollections) {
      const items = col.items.filter((x) => released(x) && x.source.kind === 'capsule' && x.collection === row.collection);
      expect(row.owned, row.collection).toBe(items.filter((x) => owned.has(`${x.collection}.${x.id}`)).length);
    }
  });

  it('shows a table per pool with the collection names and the counts', () => {
    const m = oddsModel(content.capsules, content.rarities, midGameSave(content), true, col);
    const el = show(<OddsSheet model={m} />);
    const cap = el.querySelector('[data-testid="odds-capsule-collections"]')!;
    expect(cap).not.toBeNull();
    const sky = cap.querySelector('[data-testid="odds-capsule-collections-backdrop"]')!;
    const row = m.cosmetics!.capsuleCollections.find((r) => r.collection === 'backdrop')!;
    expect(text(sky)).toContain('Skies');
    expect(text(sky)).toContain(`${row.owned}/${row.total}`);
    const crate = el.querySelector('[data-testid="odds-crate-collections"]')!;
    expect(text(crate.querySelector('[data-testid="odds-crate-collections-baseSkin"]')!)).toContain('Base skins');
    expect(text(el.querySelector('[data-testid="odds-cosmetics-collections-lead"]')!)).toContain('each equally likely');
    expect(text(el.querySelector('[data-testid="odds-cosmetics"]')!)).not.toMatch(/National flags/);
  });
});
