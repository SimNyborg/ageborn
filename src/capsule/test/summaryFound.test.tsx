/**
 * The summary's found collection items (A18.9.4, PLAN 2a): picture tiles after the cards with the item's
 * name, what it is and NEW (or the Dust a duplicate paid), drawn by the app's lookup; an Epic or
 * Legendary item bursts once its tile has landed, and its pop is heard then, never before.
 */
import type { ArtProvider } from '@/contracts';
import { i18n } from '@/i18n';
import { render, type ComponentChildren } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { installDom, text, type FakeElement } from '../../ui/screens/test/dom';
import { FoundItemsContext, foundBurstAt, SummaryPanel, type FoundItemsEnv, type FoundItemView } from '../summary';
import { buildSummary, revealCards } from '../summaryModel';
import { RARITY_BURST } from '../rarityBurst';
import { reveal, stack, testCatalog } from './fixtures';

const catalog = testCatalog();
const art = { portrait: () => Promise.resolve('') } as unknown as ArtProvider;

const VIEWS: Record<string, FoundItemView> = {
  'backdrop.eclipse': { name: 'Eclipse', kind: 'Sky', rarity: 'legendary', isNew: true, dust: 0, wide: true, art: <i data-art="eclipse" /> },
  'emote.clap': { name: 'Clap', kind: 'Emote', rarity: 'common', isNew: false, dust: 20, wide: false, art: <i data-art="clap" /> },
  'decoration.lion_statue': { name: 'Lion Statue', kind: 'Decoration', rarity: 'epic', isNew: true, dust: 0, wide: false, art: <i data-art="lion" /> },
};

function env(sounds: string[]): FoundItemsEnv {
  return { view: (k) => VIEWS[k] ?? null, sound: (id) => sounds.push(id) };
}

function model(keys: (string | null)[]) {
  const reveals = keys.map((k, i) => {
    const r = reveal({ tier: 'bronze', id: `c${i}`, stacks: [stack(i === 0 ? 'bonker' : `card${i}`, 'common')] });
    return { ...r, capsule: { ...r.capsule, contents: { ...r.capsule.contents, cosmetic: k } } };
  });
  return buildSummary(reveals, revealCards(reveals, catalog));
}

function Panel(p: { keys: (string | null)[]; env: FoundItemsEnv | null }): ComponentChildren {
  return (
    <FoundItemsContext.Provider value={p.env}>
      <SummaryPanel model={model(p.keys)} art={art} i18n={i18n} catalog={catalog} title="Capsules opened" actions={{ onDone: () => undefined }} />
    </FoundItemsContext.Provider>
  );
}

let container: FakeElement;
beforeEach(() => {
  vi.useFakeTimers();
  container = installDom().container;
});
afterEach(() => {
  act(() => render(null, container as unknown as HTMLElement));
  vi.useRealTimers();
});
const show = (el: ComponentChildren): void => {
  act(() => {
    render(el, container as unknown as HTMLElement);
  });
};
const tiles = () => container.querySelectorAll('[data-testid="capsule-found"]');

describe('found items in the capsule summary (PLAN 2a)', () => {
  it('shows each item as a picture tile after the cards: name, kind, NEW or the Dust a duplicate paid', () => {
    show(<Panel keys={['backdrop.eclipse', 'emote.clap', null]} env={env([])} />);
    const grid = container.querySelector('[data-testid="capsule-summary"]')!;
    const all = grid.querySelectorAll('[data-testid="capsule-summary-item"], [data-testid="capsule-found"]');
    // the cards first, the items after them
    expect(all.slice(-2).map((el) => el.getAttribute('data-testid'))).toEqual(['capsule-found', 'capsule-found']);
    const [sky, clap] = tiles();
    expect(sky!.getAttribute('data-key')).toBe('backdrop.eclipse');
    expect(sky!.getAttribute('data-new')).toBe('true');
    expect(text(sky!)).toContain('Eclipse');
    expect(text(sky!)).toContain('Sky');
    expect(text(sky!)).toContain(i18n.t('capsule.new'));
    expect(sky!.querySelector('[data-art="eclipse"]')).not.toBeNull();
    expect(sky!.getAttribute('aria-label')).toBe('Collection item: Eclipse, Legendary Sky');
    expect(clap!.getAttribute('data-new')).toBe('false');
    expect(text(clap!)).not.toContain(i18n.t('capsule.new'));
    expect(text(clap!)).toContain('+20 Dust');
  });

  it('bursts only the Epic and Legendary items, and the pop is heard once the tile has landed', async () => {
    const sounds: string[] = [];
    show(<Panel keys={['backdrop.eclipse', 'emote.clap', 'decoration.lion_statue']} env={env(sounds)} />);
    const [sky, clap, lion] = tiles();
    expect(sky!.querySelector('[data-burst="legendary"]')).not.toBeNull();
    expect(lion!.querySelector('[data-burst="epic"]')).not.toBeNull();
    expect(clap!.querySelector('[data-burst]')).toBeNull();
    // the Legendary sky is the 4th tile of the grid (3 cards before it): it lands, is seen, then pops
    const cards = container.querySelectorAll('[data-testid="capsule-summary-item"]').length;
    const at = foundBurstAt(cards * 45, 'legendary');
    expect(at - RARITY_BURST.legendary.popMs).toBeGreaterThan(cards * 45 + 500);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(at - 1);
    });
    expect(sounds).not.toContain('rarity_burst_legendary');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(2000);
    });
    expect(sounds).toEqual(['rarity_burst_legendary', 'rarity_burst_epic']);
  });

  it('leaves out an item the lookup does not know, and shows none without a lookup', () => {
    show(<Panel keys={['backdrop.eclipse', 'avatar.unknown_piece']} env={env([])} />);
    expect(tiles().map((el) => el.getAttribute('data-key'))).toEqual(['backdrop.eclipse']);
    show(<Panel keys={['backdrop.eclipse']} env={null} />);
    expect(tiles()).toHaveLength(0);
  });
});
