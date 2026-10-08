/**
 * Cosmetic pictures in the UI (src/ui/components/cosmeticArt.tsx): a backdrop or scene still shown
 * before its Blender strips streamed in updates itself when the visuals say a picture got better
 * (docs/requests/custom-a-scenes.md), and a national flag grid asks for the atlas tile.
 */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { installDom, type FakeElement } from '../../screens/test/dom';
import { BackdropLook, CosmeticArtContext, CosmeticImage, CosmeticPicturesContext, type CosmeticImageFn, type CosmeticImageOptions } from '../cosmeticArt';
import { UiKitContext, defaultKit } from '../kit';

let container: FakeElement | null = null;
function show(node: preact.ComponentChildren): FakeElement {
  const dom = installDom();
  container = dom.container;
  act(() => render(<UiKitContext.Provider value={defaultKit}>{node}</UiKitContext.Provider>, container as unknown as HTMLElement));
  return dom.container;
}
afterEach(() => {
  if (container) act(() => render(null, container as unknown as HTMLElement));
  container = null;
});

describe('a still updates itself when a better picture lands', () => {
  it('re-reads the cached still on the change signal, and unsubscribes when it goes away', () => {
    let final = false;
    const fn: CosmeticImageFn = (_key, o) => (o?.cached && final ? 'final.webp' : 'painted.png');
    const subs = new Set<() => void>();
    const onChange = (cb: () => void): (() => void) => {
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    };
    const c = show(
      <CosmeticArtContext.Provider value={fn}>
        <CosmeticPicturesContext.Provider value={onChange}>
          <BackdropLook skin="backdrop.winterfall" age="bronze" testid="bd" />
        </CosmeticPicturesContext.Provider>
      </CosmeticArtContext.Provider>,
    );
    const src = (): string | null => c.querySelector('[data-testid="bd"] img')?.getAttribute('src') ?? null;
    expect(src()).toBe('painted.png');
    expect(subs.size).toBe(1);
    final = true;
    act(() => {
      for (const cb of subs) cb();
    });
    expect(src()).toBe('final.webp');
    act(() => render(null, container as unknown as HTMLElement));
    container = null;
    expect(subs.size).toBe(0);
  });

  it('keeps its first answer without a provider (tests, dev pages)', () => {
    const c = show(
      <CosmeticArtContext.Provider value={() => 'painted.png'}>
        <BackdropLook skin={null} age="stone" testid="bd" />
      </CosmeticArtContext.Provider>,
    );
    expect(c.querySelector('[data-testid="bd"] img')?.getAttribute('src')).toBe('painted.png');
  });
});

describe('national flag pictures', () => {
  it('a grid tile asks for the atlas tile; a single picture asks for no size (the big SVG)', () => {
    const asked: (CosmeticImageOptions | undefined)[] = [];
    const fn: CosmeticImageFn = (key, o) => {
      asked.push(o);
      return `${key}.svg`;
    };
    show(
      <CosmeticArtContext.Provider value={fn}>
        <CosmeticImage item="nationalFlag.dk" size="tile" />
        <CosmeticImage item="nationalFlag.se" />
      </CosmeticArtContext.Provider>,
    );
    expect(asked[0]).toMatchObject({ size: 'tile' });
    expect(asked[1]?.size).toBeUndefined();
  });
});
