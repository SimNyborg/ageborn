/**
 * Customize's big preview with an injected diorama (PLAN 2a "Backdrop and base-skin previews", Track B's
 * `dioramaMount` through `DioramaContext`): it mounts after the panel's entrance, keeps the still until the
 * stage is live (for good when the stage cannot go live, throws, or there is none), sends every change
 * (age, try-on, crumble) to the live stage as a patch, and destroys it with the panel.
 */
import { content } from '@/content';
import type { AgeId, CosmeticLoadout, DioramaHandle, DioramaMount, DioramaRequest, SaveDoc } from '@/contracts';
import { MOTION_DUR } from '@/core/motion';
import { signal } from '@preact/signals';
import { render, type ComponentChildren } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DioramaContext } from '../../components/diorama';
import { createToastStore } from '../../components/Toasts';
import { createRouter } from '../../router';
import { UiEnvContext, type UiEnv } from '../context';
import { PreviewStage, stageBaseSkins } from '../customize/PreviewStage';
import { FIXTURE_NOW, fixtureSave } from '../fixtures/saves';
import { createPreviewServices } from '../fixtures/services';
import { equippedOf } from '../model/cosmetics';
import { installDom, type FakeElement } from './dom';
import { EN } from './harness';

interface FakeStage extends DioramaHandle {
  host: unknown;
  req: DioramaRequest;
  updates: Partial<Omit<DioramaRequest, 'side'>>[];
  visible: boolean[];
  destroyed: boolean;
  go(ok: boolean): void;
}

function fakeMount(): { mount: DioramaMount; stages: FakeStage[] } {
  const stages: FakeStage[] = [];
  const mount: DioramaMount = (host, req) => {
    let resolve: (ok: boolean) => void = () => {};
    const ready = new Promise<boolean>((r) => (resolve = r));
    const st: FakeStage = {
      host,
      req,
      updates: [],
      visible: [],
      destroyed: false,
      ready,
      update: (patch) => st.updates.push(patch),
      setVisible: (on) => st.visible.push(on),
      destroy: () => (st.destroyed = true),
      go: (ok) => resolve(ok),
    };
    stages.push(st);
    return st;
  };
  return { mount, stages };
}

function envFor(save: SaveDoc = fixtureSave(content, 'mid')): UiEnv {
  const s = signal(save);
  const router = createRouter({ id: 'home' });
  return { save: s, content, t: EN, locale: 'en', now: () => FIXTURE_NOW, router, services: createPreviewServices({ save: s, content, router, log: { calls: [] } }), portrait: null, toasts: createToastStore() };
}

interface StageProps {
  env: UiEnv;
  mount: DioramaMount | null;
  age?: AgeId;
  look?: Partial<CosmeticLoadout>;
  baseSkin?: string | null;
  crumble?: 0 | 1 | 2 | 3;
}

function Stage(p: StageProps): ComponentChildren {
  return (
    <UiEnvContext.Provider value={p.env}>
      <DioramaContext.Provider value={p.mount}>
        <PreviewStage
          testid="stage"
          age={p.age ?? 'stone'}
          {...(p.look ? { look: p.look } : {})}
          {...(p.baseSkin !== undefined ? { baseSkin: p.baseSkin } : {})}
          crumble={p.crumble ?? 0}
          caption="Scene"
          overlay={(live) => (live ? <button type="button" data-testid="stage-damage" /> : null)}
        />
      </DioramaContext.Provider>
    </UiEnvContext.Provider>
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
const stageEl = (): FakeElement => container.querySelector('[data-testid="stage"]')!;
async function enter(): Promise<void> {
  await act(async () => {
    // the panel's entrance, then the idle callback (a timeout without requestIdleCallback)
    await vi.advanceTimersByTimeAsync(MOTION_DUR.medium + 80);
  });
}
async function goLive(st: FakeStage, ok = true): Promise<void> {
  await act(async () => {
    st.go(ok);
    await Promise.resolve();
  });
}

describe('Customize preview stage (PLAN 2a)', () => {
  it('without an injected diorama the still picture is all there is', async () => {
    show(<Stage env={envFor()} mount={null} />);
    await enter();
    expect(stageEl().getAttribute('data-live')).toBe('false');
    expect(container.querySelector('[data-testid="base-mock"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="stage-damage"]')).toBeNull();
  });

  it('mounts after the entrance with the side look, scene, sky, base skins and settings; the still stays until it is live', async () => {
    const env = envFor();
    const { mount, stages } = fakeMount();
    show(<Stage env={env} mount={mount} />);
    expect(stages).toHaveLength(0);
    await enter();
    expect(stages).toHaveLength(1);
    const st = stages[0]!;
    const s = env.save.value;
    const eq = equippedOf(s, content);
    expect(st.req).toMatchObject({ age: 'stone', side: 0, scene: eq.scenes.stone ?? null, sky: eq.backdrop ?? null, crumble: 0, teamPreset: s.settings.teamPreset, reduceMotion: s.settings.reduceMotion, lite: s.settings.graphics === 'lite' });
    expect(st.req.look).toMatchObject({ baseFlag: eq.baseFlag, nationalFlag: eq.nationalFlag, decorations: eq.decorations, backdrop: eq.backdrop });
    expect(st.req.baseSkins).toEqual(stageBaseSkins(s, eq, content.order.ages));
    // drawing into the stage's own host, the still on top until it is live
    expect(st.host).toBe(container.querySelector('.cos-stage__live'));
    expect(st.visible.at(-1)).toBe(true);
    expect(stageEl().getAttribute('data-live')).toBe('false');
    expect(container.querySelector('[data-testid="stage-damage"]')).toBeNull();
    await goLive(st);
    expect(stageEl().getAttribute('data-live')).toBe('true');
    expect(stageEl().className).toContain('is-live');
    expect(container.querySelector('.cos-stage__still')!.getAttribute('aria-hidden')).toBe('true');
    // overlays that need the live stage appear (the Damage toggle)
    expect(container.querySelector('[data-testid="stage-damage"]')).not.toBeNull();
  });

  it('a stage that cannot go live (no WebGL, no art) leaves the still in place', async () => {
    const { mount, stages } = fakeMount();
    show(<Stage env={envFor()} mount={mount} />);
    await enter();
    await goLive(stages[0]!, false);
    expect(stageEl().getAttribute('data-live')).toBe('false');
    expect(container.querySelector('[data-testid="stage-damage"]')).toBeNull();
  });

  it('a stage that throws while mounting leaves the still in place', async () => {
    const mount: DioramaMount = () => {
      throw new Error('no WebGL');
    };
    show(<Stage env={envFor()} mount={mount} />);
    await enter();
    expect(stageEl().getAttribute('data-live')).toBe('false');
    expect(container.querySelector('[data-testid="base-mock"]')).not.toBeNull();
  });

  it('sends every change (age, a sky or base skin tried on, the Damage steps) to the same stage as a patch', async () => {
    const env = envFor();
    const { mount, stages } = fakeMount();
    show(<Stage env={env} mount={mount} />);
    await enter();
    const st = stages[0]!;
    await goLive(st);
    show(<Stage env={env} mount={mount} age="bronze" />);
    expect(st.updates.at(-1)).toMatchObject({ age: 'bronze' });
    show(<Stage env={env} mount={mount} age="bronze" look={{ backdrop: 'backdrop.eclipse' }} />);
    expect(st.updates.at(-1)).toMatchObject({ sky: 'backdrop.eclipse' });
    show(<Stage env={env} mount={mount} age="stone" baseSkin="baseSkin.frost_cave" />);
    expect(st.updates.at(-1)!.baseSkins?.stone).toBe('frost_cave');
    show(<Stage env={env} mount={mount} age="stone" baseSkin={null} />);
    expect(st.updates.at(-1)!.baseSkins?.stone).toBeUndefined();
    show(<Stage env={env} mount={mount} age="stone" baseSkin={null} crumble={2} />);
    expect(st.updates.at(-1)).toMatchObject({ crumble: 2 });
    // one stage throughout, never re-mounted; a patch never moves the stage to the other side
    expect(stages).toHaveLength(1);
    expect(st.updates.every((u) => !('side' in u))).toBe(true);
    expect(stageEl().getAttribute('data-live')).toBe('true');
  });

  it('destroys the stage with the panel; leaving before the entrance ends never mounts one', async () => {
    const env = envFor();
    const a = fakeMount();
    show(<Stage env={env} mount={a.mount} />);
    await enter();
    show(null);
    expect(a.stages[0]!.destroyed).toBe(true);
    const b = fakeMount();
    show(<Stage env={env} mount={b.mount} />);
    show(null);
    await enter();
    expect(b.stages).toHaveLength(0);
  });

  it('a stage that resolves after the panel closed stays destroyed and changes nothing', async () => {
    const { mount, stages } = fakeMount();
    show(<Stage env={envFor()} mount={mount} />);
    await enter();
    const st = stages[0]!;
    show(null);
    await goLive(st);
    expect(st.destroyed).toBe(true);
    expect(container.querySelector('[data-testid="stage"]')).toBeNull();
  });
});

describe('stageBaseSkins (one base skin per age, as the battle resolves it)', () => {
  const base = fixtureSave(content, 'mid');
  const look = { ...equippedOf(base, content), baseSkins: { stone: 'baseSkin.frost_cave', future: 'baseSkin.midnight_neon' } } as CosmeticLoadout;

  it('takes the cosmetic base skins as art skin ids; the troop skin of an age (Crystal Spire) wins', () => {
    expect(stageBaseSkins(base, look, content.order.ages)).toEqual({ stone: 'frost_cave', future: 'midnight_neon' });
    const spire: SaveDoc = { ...base, skins: { ...base.skins, equipped: { ...base.skins.equipped, 'base.future': 'crystal_spire' } } };
    expect(stageBaseSkins(spire, look, content.order.ages)).toEqual({ stone: 'frost_cave', future: 'crystal_spire' });
  });

  it('a try-on overrides one age: a base skin, or null for the standard base', () => {
    expect(stageBaseSkins(base, look, content.order.ages, { age: 'medieval', key: 'baseSkin.rose_keep' })).toEqual({ stone: 'frost_cave', medieval: 'rose_keep', future: 'midnight_neon' });
    expect(stageBaseSkins(base, look, content.order.ages, { age: 'stone', key: null })).toEqual({ future: 'midnight_neon' });
    expect(stageBaseSkins(base, look, content.order.ages, { age: 'future', key: 'skin.crystal_spire' })).toEqual({ stone: 'frost_cave', future: 'crystal_spire' });
  });
});
