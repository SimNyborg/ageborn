/**
 * The HUD's card portraits (`usePortrait`): the training card asks for its equipped skin (queue item 46: the skin's
 * rendered still where it has one; the app's portrait function decides), cached per card, foil, size, plate and skin,
 * so a skinned and a plain card never share a picture; without a skin the call is unchanged.
 */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Foil, SkinId } from '@/contracts';
import { installDom, type FakeElement } from '../../screens/test/dom';
import { usePortrait, type PortraitFn } from '../usePortrait';

let container: FakeElement;

beforeEach(() => {
  container = installDom().container;
});

afterEach(() => {
  render(null, container as unknown as Element);
});

function Probe(p: { fn: PortraitFn; card: string; skin?: SkinId | null; plate?: boolean }) {
  const url = usePortrait(p.fn, p.card, 'none', 88, p.plate ?? true, p.skin ?? null);
  return <img data-testid="pic" src={url ?? ''} />;
}

async function shown(el: preact.ComponentChild): Promise<string> {
  await act(async () => {
    render(el, container as unknown as Element);
    await Promise.resolve();
  });
  await act(async () => {
    await Promise.resolve();
  });
  return container.querySelector('[data-testid="pic"]')?.getAttribute('src') ?? '';
}

describe('HUD card portraits with skins', () => {
  it("passes the equipped skin to the app's portrait function, and keeps a skinned and a plain picture apart", async () => {
    const calls: unknown[][] = [];
    const fn: PortraitFn = (card: string, foil: Foil, size: number, plate?: boolean, skin?: SkinId) => {
      calls.push(skin === undefined ? (plate === undefined ? [card, foil, size] : [card, foil, size, plate]) : [card, foil, size, plate, skin]);
      return Promise.resolve(`${card}${skin ? `@${skin}` : ''}`);
    };
    expect(await shown(<Probe fn={fn} card="bonker" skin="pumpkin_head" />)).toBe('bonker@pumpkin_head');
    render(null, container as unknown as Element);
    expect(await shown(<Probe fn={fn} card="bonker" />)).toBe('bonker');
    render(null, container as unknown as Element);
    // the cache knows both now: no second call for either
    expect(await shown(<Probe fn={fn} card="bonker" skin="pumpkin_head" />)).toBe('bonker@pumpkin_head');
    expect(calls).toEqual([
      ['bonker', 'none', 88, true, 'pumpkin_head'],
      ['bonker', 'none', 88],
    ]);
  });

  it('a transparent portrait without a skin still asks with `plate: false` only', async () => {
    const calls: unknown[][] = [];
    const fn: PortraitFn = (...a: unknown[]) => (calls.push(a), Promise.resolve('ghost'));
    expect(await shown(<Probe fn={fn} card="pebbler" plate={false} />)).toBe('ghost');
    expect(calls).toEqual([['pebbler', 'none', 88, false]]);
  });
});
