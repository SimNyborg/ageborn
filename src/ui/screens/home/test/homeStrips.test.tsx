/**
 * Home's still island from the provider's strips (queue item 37 open items 1 and 2): each troop stands with its
 * strip's feet on its spot at the live layer's size (the strip's own layout, from the first visit on), plays at
 * its clip's pace, asks for its skin, is placed once its strip is in and fades in from the next frame, and the
 * live island's cold start waits until
 * the still troops are in (at most `STILL_WAIT_MS`), so the start-up's long task never holds them back.
 */
import { content } from '@/content';
import type { CardId, SaveDoc } from '@/contracts';
import { signal } from '@preact/signals';
import { render, type ComponentChildren } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stripInfoUrl, type StripInfo } from '@/visuals/adapters/spriteStrip';
import { defaultKit, UiKitContext, type PortraitRequest } from '../../../components/kit';
import { createToastStore } from '../../../components/Toasts';
import { createRouter } from '../../../router';
import { UiEnvContext, type UiEnv } from '../../context';
import { FIXTURE_NOW, fixtureSave } from '../../fixtures/saves';
import { createPreviewServices } from '../../fixtures/services';
import { installDom, type FakeElement } from '../../test/dom';
import { EN } from '../../test/harness';
import { Diorama, LIVE_ISLAND, LIVE_SPOTS, liveTroopScale, MAX_TROOP_LU, parseStripInfo, type DioramaLive } from '../Diorama';
import { HomeStageContext, LIVE_AFTER_MS, STILL_WAIT_MS, type HomeStageHandle, type HomeStageMount } from '../homeStage';

const INFO: StripInfo = { frames: 6, cell: 160, ms: 920, feet: [72.5, 151.3], pxPerLu: 1.37, headLu: 66, box: [40, 118, 30, 156] };
/** A large unit: drawn smaller on the live island (its head stands over `MAX_TROOP_LU`). */
const BIG: StripInfo = { frames: 8, cell: 160, ms: 900, feet: [80, 153], pxPerLu: 0.62, headLu: 160, box: [10, 150, 8, 157] };

function envFor(save: SaveDoc = fixtureSave(content, 'mid')): UiEnv {
  const s = signal(save);
  const router = createRouter({ id: 'home' });
  return { save: s, content, t: EN, locale: 'en', now: () => FIXTURE_NOW, router, services: createPreviewServices({ save: s, content, router, log: { calls: [] } }), portrait: null, toasts: createToastStore() };
}

const live = (o: Partial<DioramaLive> = {}): DioramaLive => ({ paused: false, leaving: false, reduce: false, lite: false, teamPreset: 'default', skins: {}, ...o });

/** A provider whose strip answers wait until `release()` (each request's card id, skin and side recorded). */
function fakePortraits(info: (card: string) => StripInfo | null = () => INFO) {
  const asked: PortraitRequest[] = [];
  let open: (() => void) | null = null;
  let gate = new Promise<void>((r) => (open = r));
  const portrait = async (o: PortraitRequest): Promise<string> => {
    asked.push(o);
    const m = /^strip(info)?:idle:(.+)$/.exec(o.card);
    if (!m) return '';
    await gate;
    if (m[1]) {
      const i = info(m[2]!);
      return i ? stripInfoUrl(i) : '';
    }
    return `data:image/png;base64,${m[2]}${o.skin ?? ''}${o.side ?? 0}`;
  };
  return {
    portrait,
    asked,
    release: () => open?.(),
    hold: () => {
      gate = new Promise<void>((r) => (open = r));
    },
  };
}

function Home(p: { env: UiEnv; portrait: (o: PortraitRequest) => Promise<string>; mount?: HomeStageMount | null; mine: CardId[]; foe: CardId[]; live?: DioramaLive }): ComponentChildren {
  return (
    <UiEnvContext.Provider value={p.env}>
      <UiKitContext.Provider value={{ ...defaultKit, portrait: p.portrait }}>
        <HomeStageContext.Provider value={p.mount ?? null}>
          <Diorama arena="tar_pits" age="medieval" mySkin={null} foeSkin={null} teamMe="#2f7df6" teamFoe="#f28a1e" mine={p.mine} foe={p.foe} {...(p.live ? { live: p.live } : {})} />
        </HomeStageContext.Provider>
      </UiKitContext.Provider>
    </UiEnvContext.Provider>
  );
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i++) await act(async () => await Promise.resolve());
};
/** The next frame (here a macrotask: no requestAnimationFrame in this DOM), when a placed troop is shown. */
const frame = async (): Promise<void> => {
  if (vi.isFakeTimers()) await act(async () => void (await vi.advanceTimersByTimeAsync(0)));
  else await act(async () => await new Promise<void>((r) => setTimeout(r, 0)));
  await flush();
};

const pct = (v: unknown): number => Number.parseFloat(String(v));

// the still island keeps loaded strips for the page, so each case below uses troops of its own
let container: FakeElement;
beforeEach(() => {
  ({ container } = installDom());
});
afterEach(() => {
  render(null, container as unknown as Element);
  vi.useRealTimers();
});

describe('the still troops', () => {
  it("stand on their spots by their strips' feet, at the live layer's size and their clip's pace, with their skins", async () => {
    const f = fakePortraits((card) => (card === 'squire_pair' ? BIG : INFO));
    await act(() => render(<Home env={envFor()} portrait={f.portrait} mine={['footman', 'longbowman'] as CardId[]} foe={['squire_pair', 'pikeman'] as CardId[]} live={live({ skins: { footman: 'tin_can' } as unknown as DioramaLive['skins'] })} />, container as unknown as Element));
    // nothing stands until a strip is in (a troop never shows a stand-in)
    expect(container.querySelectorAll('.hd__unit.is-in')).toHaveLength(0);
    f.release();
    await flush();
    // placed (and decoded) at opacity 0 first, shown in the next frame, so the fade-in starts in a painted frame
    expect(container.querySelectorAll('.hd__unit.is-ready')).toHaveLength(4);
    expect(container.querySelectorAll('.hd__unit.is-in')).toHaveLength(0);
    await frame();
    const units = container.querySelectorAll('.hd__unit.is-in');
    expect(units).toHaveLength(4);
    expect(container.querySelectorAll('.hd__unit.is-ready')).toHaveLength(0);
    // the skinned troop asked for its skin (the strip and its layout), the others for the card's own look
    expect(f.asked.filter((o) => o.card === 'strip:idle:footman' || o.card === 'stripinfo:idle:footman').every((o) => o.skin === 'tin_can')).toBe(true);
    expect(f.asked.find((o) => o.card === 'strip:idle:squire_pair')).toMatchObject({ side: 1, plate: false });
    expect(units[0]!.getAttribute('data-skin')).toBe('tin_can');
    // the feet land on the spot (mine faces right; the opponent's strip is mirrored), scaled as the live island draws
    const W = LIVE_ISLAND.width;
    const H = LIVE_ISLAND.height;
    const check = (el: FakeElement, info: StripInfo, side: 0 | 1, slot: 0 | 1): void => {
      const per = (LIVE_ISLAND.unitsPerLu * liveTroopScale(info.headLu)) / info.pxPerLu;
      const spot = LIVE_SPOTS[side][slot];
      const fx = side === 0 ? info.feet[0] : info.cell - info.feet[0];
      expect(pct(el.style['left']) * (W / 100) + fx * per).toBeCloseTo(spot.x, 1);
      expect(pct(el.style['top']) * (H / 100) + info.feet[1] * per).toBeCloseTo(spot.y, 1);
      expect(pct(el.style['width']) * (W / 100)).toBeCloseTo(info.cell * per, 1);
      const strip = el.querySelector<FakeElement>('.hd__unitStrip')!;
      expect(strip.style.getPropertyValue('--strip-frames')).toBe(String(info.frames));
      expect(strip.style.getPropertyValue('--strip-ms')).toBe(`${info.ms}ms`);
    };
    check(units[0]!, INFO, 0, 0);
    check(units[1]!, INFO, 0, 1);
    check(units[2]!, BIG, 1, 0);
    check(units[3]!, INFO, 1, 1);
    // the big unit is drawn smaller, as the live island draws it
    expect(liveTroopScale(BIG.headLu)).toBeCloseTo(MAX_TROOP_LU / 160, 6);
  });

  it('a troop with no strip stays empty and is not waited for', async () => {
    const f = fakePortraits();
    const empty = async (o: PortraitRequest): Promise<string> => (o.card.endsWith(':t2_none') ? '' : f.portrait(o));
    await act(() => render(<Home env={envFor()} portrait={empty} mine={['t2_some'] as CardId[]} foe={['t2_none'] as CardId[]} />, container as unknown as Element));
    f.release();
    await flush();
    await frame();
    expect(container.querySelectorAll('.hd__unit.is-in')).toHaveLength(1);
    expect(container.querySelectorAll('.hd__unit')).toHaveLength(2);
  });
});

describe("the strip layout from the provider", () => {
  it('is read back from its JSON data URL; anything else is no layout', () => {
    expect(parseStripInfo(stripInfoUrl(INFO))).toEqual(INFO);
    expect(parseStripInfo('')).toBeNull();
    expect(parseStripInfo('data:image/png;base64,AAAA')).toBeNull();
    expect(parseStripInfo(`data:application/json,${encodeURIComponent('{"frames":0}')}`)).toBeNull();
    expect(parseStripInfo(`data:application/json,${encodeURIComponent(JSON.stringify({ ...INFO, feet: [1] }))}`)).toBeNull();
    expect(parseStripInfo('data:application/json,%7Bnot json')).toBeNull();
  });

  it("mirrors the live island's troop size rule (render's MAX_TROOP_LU and scale)", () => {
    const src = Object.values(import.meta.glob<string>('/src/render/showcase/home.ts', { eager: true, query: '?raw', import: 'default' }))[0]!;
    expect(Number(/const MAX_TROOP_LU = (\d+);/.exec(src)?.[1])).toBe(MAX_TROOP_LU);
    expect(src).toContain('const heightLu = Math.max(20, -view.anchors.head.y);');
    expect(src).toContain('const scale = Math.min(1, MAX_TROOP_LU / heightLu);');
    expect(liveTroopScale(66)).toBe(1);
    expect(liveTroopScale(10)).toBe(1);
    expect(liveTroopScale(120)).toBeCloseTo(0.8, 6);
  });
});

describe("the live island's cold start", () => {
  function mountSpy(): { mount: HomeStageMount; mounted: number[] } {
    const mounted: number[] = [];
    const mount: HomeStageMount = () => {
      mounted.push(Date.now());
      const h: HomeStageHandle = { ready: new Promise<boolean>(() => undefined), update: () => undefined, setVisible: () => undefined, destroy: () => undefined };
      return h;
    };
    return { mount, mounted };
  }

  it('waits until the still troops are in', async () => {
    vi.useFakeTimers();
    const f = fakePortraits();
    const { mount, mounted } = mountSpy();
    await act(() => render(<Home env={envFor()} portrait={f.portrait} mount={mount} mine={['t3_a', 't3_b'] as CardId[]} foe={['t3_c'] as CardId[]} live={live()} />, container as unknown as Element));
    await act(async () => void (await vi.advanceTimersByTimeAsync(LIVE_AFTER_MS + 1500)));
    expect(mounted).toHaveLength(0);
    f.release();
    await flush();
    await frame();
    expect(container.querySelectorAll('.hd__unit.is-in')).toHaveLength(3);
    await act(async () => void (await vi.advanceTimersByTimeAsync(300)));
    expect(mounted).toHaveLength(1);
  });

  it('also waits while a placed troop waits for its frame to fade in', async () => {
    vi.useFakeTimers();
    const frames: FrameRequestCallback[] = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    try {
      const f = fakePortraits();
      const { mount, mounted } = mountSpy();
      await act(() => render(<Home env={envFor()} portrait={f.portrait} mount={mount} mine={['t6_a'] as CardId[]} foe={['t6_b'] as CardId[]} live={live()} />, container as unknown as Element));
      f.release();
      await flush();
      expect(container.querySelectorAll('.hd__unit.is-ready')).toHaveLength(2);
      await act(async () => void (await vi.advanceTimersByTimeAsync(LIVE_AFTER_MS + 1500)));
      expect(mounted).toHaveLength(0);
      await act(async () => {
        for (const cb of frames.splice(0)) cb(0);
      });
      await flush();
      expect(container.querySelectorAll('.hd__unit.is-in')).toHaveLength(2);
      await act(async () => void (await vi.advanceTimersByTimeAsync(300)));
      expect(mounted).toHaveLength(1);
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('starts anyway once STILL_WAIT_MS has passed', async () => {
    vi.useFakeTimers();
    const f = fakePortraits();
    const { mount, mounted } = mountSpy();
    await act(() => render(<Home env={envFor()} portrait={f.portrait} mount={mount} mine={['t4_a'] as CardId[]} foe={['t4_b'] as CardId[]} live={live()} />, container as unknown as Element));
    await act(async () => void (await vi.advanceTimersByTimeAsync(STILL_WAIT_MS - 200)));
    expect(mounted).toHaveLength(0);
    await act(async () => void (await vi.advanceTimersByTimeAsync(500)));
    expect(mounted).toHaveLength(1);
    expect(container.querySelectorAll('.hd__unit.is-in')).toHaveLength(0);
  });

  it('under Reduce motion never starts (the still island stays)', async () => {
    vi.useFakeTimers();
    const f = fakePortraits();
    f.release();
    const { mount, mounted } = mountSpy();
    await act(() => render(<Home env={envFor()} portrait={f.portrait} mount={mount} mine={['t5_a'] as CardId[]} foe={['t5_b'] as CardId[]} live={live({ reduce: true })} />, container as unknown as Element));
    await flush();
    await frame();
    await act(async () => void (await vi.advanceTimersByTimeAsync(STILL_WAIT_MS + 3000)));
    expect(mounted).toHaveLength(0);
    expect(container.querySelectorAll('.hd__unit.is-in')).toHaveLength(2);
  });
});
