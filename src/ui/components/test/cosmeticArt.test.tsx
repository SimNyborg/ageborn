/**
 * Cosmetic pictures in the UI (src/ui/components/cosmeticArt.tsx): a backdrop or scene still shown
 * before its Blender strips streamed in updates itself when the visuals say a picture got better
 * (docs/requests/custom-a-scenes.md), a national flag grid asks for the atlas tile, and a Legendary base
 * model stands in its aura (round 3).
 */
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, describe, expect, it } from 'vitest';
import { installDom, type FakeElement } from '../../screens/test/dom';
import { BackdropLook, BaseLook, BaseThumb, CosmeticArtContext, CosmeticImage, CosmeticPicturesContext, FlagTileImage, flagSpriteStyle, type CosmeticImageFn, type CosmeticImageOptions } from '../cosmeticArt';
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

  it('a grid tile draws its cell of the one atlas sheet as a sprite (C-b item 9), the SVG when the sheet failed', () => {
    const asked: (CosmeticImageOptions | undefined)[] = [];
    // a 1024 x 624 sheet of 64 x 48 cells; Denmark in column 2, row 1
    const fn: CosmeticImageFn = (key, o) => {
      asked.push(o);
      return key === 'nationalFlag.dk' ? '/art/flags/atlas-64.webp#cell=128,48,64,48,1024,624' : `${key}.svg`;
    };
    const c = show(
      <CosmeticArtContext.Provider value={fn}>
        <FlagTileImage item="nationalFlag.dk" ready class="dk" />
        <FlagTileImage item="nationalFlag.se" ready class="se" />
      </CosmeticArtContext.Provider>,
    );
    expect(asked[0]).toMatchObject({ size: 'tile', sprite: true });
    const cell = c.querySelector('.dk .cos-img__sprite') as unknown as { style: Record<string, string> } | null;
    expect(cell).not.toBeNull();
    expect(String(cell!.style.backgroundImage)).toContain('/art/flags/atlas-64.webp');
    expect(String(cell!.style.backgroundImage)).not.toContain('#cell');
    expect(cell!.style.backgroundSize).toBe('1600% 1300%');
    expect(cell!.style.backgroundPosition).toBe('13.33% 8.33%');
    // a plain picture (the sheet failed: the SVG) stays an image
    expect(c.querySelector('img.se')?.getAttribute('src')).toBe('nationalFlag.se.svg');
    expect(flagSpriteStyle('nationalFlag.se.svg')).toBeNull();
    expect(flagSpriteStyle(null)).toBeNull();
  });
});

describe('the Legendary aura under a base picture (round 3)', () => {
  /** The router as the app wires it: an aura only for the aura skins, a thumbnail for every model. */
  const fn: CosmeticImageFn = (key, o) => {
    if (o?.layer === 'aura') return key === 'baseSkin.crystal_spire' ? 'aura.svg' : null;
    if (o?.layer === 'thumb') return `${key}.thumb.webp`;
    if (o?.layer === 'fx') return `${key}.fx.svg`;
    return `${key}.png`;
  };
  const kit = { ...defaultKit, portrait: () => Promise.resolve('data:image/png;base64,AA==') };
  async function showBase(node: preact.ComponentChildren): Promise<FakeElement> {
    const dom = installDom();
    container = dom.container;
    act(() =>
      render(
        <UiKitContext.Provider value={kit}>
          <CosmeticArtContext.Provider value={fn}>{node}</CosmeticArtContext.Provider>
        </UiKitContext.Provider>,
        container as unknown as HTMLElement,
      ),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    return dom.container;
  }

  it('draws the halo under the model and its fx layer, breathing while the base animates', async () => {
    const c = await showBase(<BaseLook age="future" skin="baseSkin.crystal_spire" testid="b" />);
    const base = c.querySelector('[data-testid="b"]')!;
    const aura = c.querySelector('[data-testid="b-aura"]')!;
    expect(base.getAttribute('class')).toContain('has-aura');
    expect(aura.getAttribute('class')).toBe('cos-base__aura is-live');
    expect(String((aura as unknown as { style: Record<string, string> }).style.backgroundImage)).toContain('aura.svg');
    // under everything: the aura first, then the body, then the fx layer on top
    const kids = base.children.map((k) => (k as FakeElement).getAttribute('class') ?? '');
    expect(kids).toEqual(['cos-base__aura is-live', 'cos-base__img cos-base__body', 'cos-base__img cos-base__fx']);
  });

  it('rests when the base does not animate (VS and the tiles under Reduce motion), and no other skin has one', async () => {
    const c = await showBase(
      <>
        <BaseLook age="future" skin="baseSkin.crystal_spire" animate={false} testid="still" />
        <BaseLook age="future" skin="baseSkin.midnight_neon" testid="plain" />
        <BaseLook age="future" skin={null} testid="std" />
      </>,
    );
    expect(c.querySelector('[data-testid="still-aura"]')!.getAttribute('class')).toBe('cos-base__aura');
    expect(c.querySelector('[data-testid="plain-aura"]')).toBeNull();
    expect(c.querySelector('[data-testid="plain"]')!.getAttribute('class')).not.toContain('has-aura');
    expect(c.querySelector('[data-testid="std-aura"]')).toBeNull();
  });

  it("draws one halo for both sides: an opponent's base is mirrored as a whole (VS, Home), its aura inside it", async () => {
    const asked: (CosmeticImageOptions | undefined)[] = [];
    const sided: CosmeticImageFn = (key, o) => {
      if (o?.layer === 'aura') asked.push(o);
      return fn(key, o);
    };
    const dom = installDom();
    container = dom.container;
    act(() =>
      render(
        <UiKitContext.Provider value={kit}>
          <CosmeticArtContext.Provider value={sided}>
            <BaseLook age="future" skin="baseSkin.crystal_spire" testid="me" />
            <BaseLook age="future" skin="baseSkin.crystal_spire" side={1} testid="foe" />
          </CosmeticArtContext.Provider>
        </UiKitContext.Provider>,
        container as unknown as HTMLElement,
      ),
    );
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    // the same picture for both (a halo on one spot, Colossus Lighthouse's torch, flips with its model)
    expect(asked.length).toBeGreaterThanOrEqual(2);
    for (const o of asked) expect(o).toEqual({ layer: 'aura' });
    const me = dom.container.querySelector('[data-testid="me-aura"]') as unknown as { style: Record<string, string> };
    const foe = dom.container.querySelector('[data-testid="foe-aura"]') as unknown as { style: Record<string, string> };
    expect(foe).not.toBeNull();
    expect(String(foe.style.backgroundImage)).toBe(String(me.style.backgroundImage));
    // the aura is inside the base element the screens mirror
    expect(dom.container.querySelector('[data-testid="foe"] [data-testid="foe-aura"]')).not.toBeNull();
  });

  it("an aura skin's tile is its portrait on the scene strip (the halo under the model), other models keep their thumbnail", async () => {
    const c = await showBase(
      <>
        <BaseThumb age="future" skin="baseSkin.crystal_spire" testid="spire" />
        <BaseThumb age="future" skin="baseSkin.midnight_neon" testid="neon" />
      </>,
    );
    const spire = c.querySelector('[data-testid="spire"]')!;
    expect(spire.querySelector('.cos-btile__thumb')).toBeNull();
    expect(spire.querySelector('.cos-base__aura')).not.toBeNull();
    expect(c.querySelector('[data-testid="neon"] .cos-btile__thumb')!.getAttribute('src')).toBe('baseSkin.midnight_neon.thumb.webp');
  });
});
