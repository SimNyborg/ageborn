/**
 * The app's lookup for the capsule and crate summary's found items (PLAN 2a): each item's name, what it
 * is, NEW from the save's `cosmetics.fresh` (save v15) or the Dust a duplicate paid, landscape tiles for
 * skies, scenes and base skins, and the same art components as its Customize card.
 */
import { content } from '@/content';
import type { ArtProvider, SaveDoc } from '@/contracts';
import { i18n } from '@/i18n';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { fixtureSave } from '@/ui/screens/fixtures/saves';
import { installDom, type FakeElement } from '@/ui/screens/test/dom';
import { foundItemsEnv } from '../ui/foundItems';

const art = { portrait: () => Promise.resolve('') } as unknown as ArtProvider;
const t = (k: string, p?: Record<string, string | number>) => i18n.t(k, p);
const drops = content.cosmetics.collections.drops;

function saveWith(fresh: string[]): SaveDoc {
  const s = fixtureSave(content, 'mid');
  return { ...s, cosmetics: { ...s.cosmetics, fresh } };
}

let container: FakeElement | null = null;
afterEach(() => {
  if (container) act(() => render(null, container as unknown as HTMLElement));
  container = null;
});

describe('found items in the summary (app lookup)', () => {
  it('names each item and says what it is; NEW comes from the save, a duplicate shows its Dust', () => {
    const sounds: string[] = [];
    const env = foundItemsEnv({ content, t, save: () => saveWith(['backdrop.thunderstorm']), art, sound: (id) => sounds.push(id) });
    const sky = env.view('backdrop.thunderstorm')!;
    expect(sky).toMatchObject({ name: 'Thunderstorm', kind: 'Sky', rarity: 'epic', isNew: true, dust: 0, wide: true });
    const clap = env.view('emote.clap')!;
    expect(clap).toMatchObject({ kind: 'Emote', isNew: false, wide: false, dust: drops.duplicateDust[clap.rarity] });
    const keep = env.view('baseSkin.rose_keep')!;
    expect(keep.kind).toBe(`Base skin · ${t('age.medieval.name')}`);
    expect(keep.wide).toBe(true);
    expect(env.view('emote.not_in_any_content')).toBeNull();
    env.sound?.('rarity_burst_epic');
    expect(sounds).toEqual(['rarity_burst_epic']);
  });

  it('draws the item with its Customize card art (a base skin on its age, a quote in the bubble)', () => {
    const env = foundItemsEnv({ content, t, save: () => saveWith([]), art });
    const dom = installDom();
    container = dom.container;
    act(() => render(<div>{env.view('baseSkin.rose_keep')!.art}</div>, container as unknown as HTMLElement));
    const tile = container.querySelector('[data-skin="baseSkin.rose_keep"]');
    expect(tile).not.toBeNull();
    expect(tile!.getAttribute('data-age')).toBe('medieval');
    act(() => render(<div>{env.view('quote.charge')!.art}</div>, container as unknown as HTMLElement));
    expect(container.querySelector('.cos-qb')).not.toBeNull();
    expect(container.textContent.length).toBeGreaterThan(2);
  });

  it('works before a save exists (no NEW, the first age for a sky)', () => {
    const env = foundItemsEnv({ content, t, save: () => null, art });
    expect(env.view('backdrop.thunderstorm')).toMatchObject({ isNew: false });
    expect(env.sound).toBeUndefined();
  });
});
