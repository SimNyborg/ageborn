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
import { CRUMBLE_STAGES, DamageToggle, type CrumbleStage } from '../customize/DamageToggle';
import { PreviewStage, stageBaseSkins } from '../customize/PreviewStage';
import { packRow, SPOT_TARGET_PX, spotTargets, type StageBox } from '../customize/spots';
import { FIXTURE_NOW, fixtureSave } from '../fixtures/saves';
import { createPreviewServices } from '../fixtures/services';
import { equippedOf } from '../model/cosmetics';
import { FakeEvent, installDom, type FakeElement } from './dom';
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

describe('the Damage toggle (round 3: an icon with four pips)', () => {
  function Toggle(p: { env: UiEnv; crumble: CrumbleStage; onStep: (n: CrumbleStage) => void }): ComponentChildren {
    return (
      <UiEnvContext.Provider value={p.env}>
        <DamageToggle crumble={p.crumble} onStep={p.onStep} />
      </UiEnvContext.Provider>
    );
  }
  const btn = (): FakeElement => container.querySelector('[data-testid="stage-damage"]')!;
  const lit = (): number[] =>
    container
      .querySelectorAll('[data-pip]')
      .filter((i) => (i.getAttribute('class') ?? '').split(/\s+/).includes('is-on'))
      .map((i) => Number(i.getAttribute('data-pip')));

  it('shows the stage as lit pips (the first is the whole base), the keep of that stage and the label', () => {
    const env = envFor();
    for (const c of CRUMBLE_STAGES) {
      show(<Toggle env={env} crumble={c} onStep={() => undefined} />);
      expect(lit()).toEqual(CRUMBLE_STAGES.filter((n) => n <= c));
      expect(container.querySelectorAll('[data-pip]')).toHaveLength(4);
      expect(container.querySelector('svg')!.getAttribute('data-stage')).toBe(String(c));
      // "on" while the base shows damage; the label says the stage (the icon has no words on phones)
      expect(btn().getAttribute('aria-pressed')).toBe(c > 0 ? 'true' : 'false');
      expect(btn().getAttribute('aria-label')).toBe(EN('cosmetic.ui.damageLabel', { n: c, max: 3 }));
    }
  });

  it('steps 0, 1, 2, 3 and back to 0: a step up is the base crumbling, the repair a soft toggle', () => {
    const sound = vi.fn();
    const env = { ...envFor(), sound };
    let c: CrumbleStage = 0;
    const seen: CrumbleStage[] = [];
    const step = (n: CrumbleStage): void => {
      seen.push(n);
      c = n;
    };
    for (let i = 0; i < 4; i++) {
      show(<Toggle env={env} crumble={c} onStep={step} />);
      act(() => btn().click());
    }
    expect(seen).toEqual([1, 2, 3, 0]);
    expect(sound.mock.calls.map((x) => x[0])).toEqual(['base_crumble', 'base_crumble', 'base_crumble', 'ui_toggle']);
    // each tap replays its beat: the last one was the repair
    show(<Toggle env={env} crumble={c} onStep={step} />);
    expect(btn().className).toContain('is-repair');
  });

  it('lands the press on pointerdown and lets go on pointerup', () => {
    show(<Toggle env={envFor()} crumble={0} onStep={() => undefined} />);
    act(() => void btn().dispatchEvent(new FakeEvent('pointerdown')));
    expect(btn().getAttribute('data-pressed')).toBe('');
    act(() => void btn().dispatchEvent(new FakeEvent('pointerup')));
    expect(btn().getAttribute('data-pressed')).toBeNull();
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

/**
 * Track B's spot boxes as `dioramaAnchors(width, height, 0)` gives them (ground at 83% of the height,
 * 440 lu above it, at least 520 lu across; spots at gate - 150, - 104 and + 20 lu, 50 x 66 lu; the gate
 * 228 lu from the stage's left edge; the pole box 34-102 lu from the gate's... up to 186 lu).
 */
function anchorsFor(width: number, height: number): StageBox[] {
  const ground = height * 0.83;
  const scale = Math.min(ground / 440, width / 520);
  const spot = (lu: number): StageBox => ({ x: (228 + lu - 25) * scale, y: ground - 66 * scale, w: 50 * scale, h: 66 * scale });
  return [spot(-150), spot(-104), spot(20), { x: (228 + 34) * scale, y: ground - 186 * scale, w: 68 * scale, h: 186 * scale }];
}

describe('the decoration spots over the live stage (round 3, spots.ts)', () => {
  const sizes: [number, number][] = [
    [238, 160], // 844 x 390 and 844 x 340
    [208, 139], // 750 x 340
    [188, 126], // 667 x 375
    [589, 326], // 1280 x 720
    [1200, 640], // a roomy stage
  ];
  // short landscape phones (queue item 43): the stage shrinks to fit above the bottom bar
  const short: [number, number][] = [
    [206, 142], // 800 x 300
    [173, 119], // 762 x 277
    [144, 99], // 745 x 250
  ];
  for (const [w, h] of [...sizes, ...short]) {
    it(`every target is at least 44 px, inside a ${w} x ${h} stage and apart from the others`, () => {
      const ts = spotTargets(anchorsFor(w, h).slice(0, 3), w, h);
      expect(ts).toHaveLength(3);
      for (const t of ts) {
        expect(Math.min(t.w, t.h)).toBeGreaterThanOrEqual(SPOT_TARGET_PX);
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.y).toBeGreaterThanOrEqual(0);
        expect(t.x + t.w).toBeLessThanOrEqual(w + 0.5);
        expect(t.y + t.h).toBeLessThanOrEqual(h + 0.5);
      }
      for (let i = 0; i < 3; i++)
        for (let j = i + 1; j < 3; j++) {
          const a = ts[i]!;
          const b = ts[j]!;
          const apart = a.x + a.w <= b.x + 0.5 || b.x + b.w <= a.x + 0.5 || a.y + a.h <= b.y + 0.5 || b.y + b.h <= a.y + 0.5;
          expect(apart, `${i} and ${j}`).toBe(true);
        }
    });

    it(`on a ${w} x ${h} stage a target on the ground covers its own prop and no other; the rest are callouts with a leader`, () => {
      const spots = anchorsFor(w, h).slice(0, 3);
      const ts = spotTargets(spots, w, h);
      ts.forEach((t, i) => {
        if (t.raised) {
          expect(t.leader).toBe(true);
          // above the props, with room for the leader
          expect(t.y + t.h).toBeLessThanOrEqual(Math.min(...spots.map((s) => s.y)) + 0.5);
          return;
        }
        const s = spots[i]!;
        expect(t.x).toBeLessThanOrEqual(s.x + 0.5);
        expect(t.x + t.w).toBeGreaterThanOrEqual(s.x + s.w - 0.5);
        spots.forEach((o, j) => {
          if (j !== i) expect(o.x + o.w <= t.x + 0.5 || o.x >= t.x + t.w - 0.5, `${i} covers prop ${j}`).toBe(true);
        });
        // the footprint marks the prop where it stands
        expect(t.footX).toBeCloseTo(s.x + s.w / 2, 0);
      });
    });
  }

  it("the back spots are callouts (Track B's boxes overlap: 50 lu wide, 46 lu apart); spots far apart all sit on their props", () => {
    for (const [w, h] of sizes) expect(spotTargets(anchorsFor(w, h).slice(0, 3), w, h).map((t) => t.raised), `${w} x ${h}`).toEqual([true, true, false]);
    const roomy: StageBox[] = [0, 1, 2].map((i) => ({ x: 40 + i * 150, y: 300, w: 30, h: 40 }));
    const ts = spotTargets(roomy, 600, 400);
    expect(ts.map((t) => t.raised)).toEqual([false, false, false]);
    expect(ts.every((t) => !t.leader)).toBe(true);
  });

  it('the callouts stand right of the props, the target on the ground and the flag pole, in the props\' order; above the props only where that has no room (review 3a NIT 7)', () => {
    // phones and the desktop: clear of the base, which stands over the back spots, and of the flag
    for (const [w, h] of [[238, 160], [208, 139], [188, 126], [589, 326]] as const) {
      const all = anchorsFor(w, h);
      const spots = all.slice(0, 3);
      const pole = all[3]!;
      const ts = spotTargets(spots, w, h, SPOT_TARGET_PX, [pole]);
      const right = Math.max(...spots.map((s) => s.x + s.w), ...ts.filter((t) => !t.raised).map((t) => t.x + t.w), pole.x + pole.w);
      const up = ts.filter((t) => t.raised);
      expect(up, `${w} x ${h}`).toHaveLength(2);
      for (const t of up) expect(t.x, `${w} x ${h}`).toBeGreaterThan(right);
      // the left prop's callout comes first, so the two leaders never cross
      expect(up[0]!.footX).toBeLessThan(up[1]!.footX);
      expect(up[0]!.x + up[0]!.w).toBeLessThanOrEqual(up[1]!.x);
    }
    // 745 x 250: no room right of the gate, so the callouts stay above the props
    const small = anchorsFor(144, 99);
    const spots = small.slice(0, 3);
    const right = Math.max(...spots.map((s) => s.x + s.w));
    expect(spotTargets(spots, 144, 99, SPOT_TARGET_PX, [small[3]!]).some((t) => t.raised && t.x < right)).toBe(true);
  });

  it('packs a row with the least movement, inside its ends', () => {
    expect(packRow([{ c: 50, w: 44 }], 0, 200)).toEqual([50]);
    expect(packRow([{ c: 10, w: 44 }], 0, 200)).toEqual([22]);
    const [a, b] = packRow([{ c: 100, w: 44 }, { c: 110, w: 44 }], 0, 300, 4);
    expect(b! - a!).toBeCloseTo(48, 1);
    expect((a! + b!) / 2).toBeCloseTo(105, 1);
    // a row too tight for the gap closes the gaps before two targets overlap (136 px for three 44 px targets)
    const tight = packRow([{ c: 30, w: 44 }, { c: 40, w: 44 }, { c: 50, w: 44 }], 0, 136, 4);
    for (let i = 0; i + 1 < 3; i++) expect(tight[i + 1]! - tight[i]!).toBeGreaterThanOrEqual(44 - 0.01);
    expect(tight[0]! - 22).toBeGreaterThanOrEqual(-0.01);
    expect(tight[2]! + 22).toBeLessThanOrEqual(136.01);
  });
});

describe('Flags and Decorations on the live stage (round 3)', () => {
  function anchoredMount(w = 238, h = 160): { mount: DioramaMount; stages: (FakeStage & { move(): void })[] } {
    const base = fakeMount();
    const stages: (FakeStage & { move(): void })[] = [];
    const mount: DioramaMount = (host, req) => {
      const st = base.mount(host, req) as FakeStage;
      let boxes = anchorsFor(w, h);
      const watchers = new Set<() => void>();
      const ext = Object.assign(st, {
        anchorsPx: () => boxes,
        onAnchorsChange: (cb: () => void) => {
          watchers.add(cb);
          return () => void watchers.delete(cb);
        },
        move: () => {
          boxes = anchorsFor(w * 2, h * 2);
          for (const cb of watchers) cb();
        },
      });
      stages.push(ext);
      return ext;
    };
    return { mount, stages };
  }
  function Spots(p: { env: UiEnv; mount: DioramaMount | null; picked: number; onPick: (i: number) => void; still?: boolean }): ComponentChildren {
    return (
      <UiEnvContext.Provider value={p.env}>
        <DioramaContext.Provider value={p.mount}>
          <PreviewStage testid="stage" age="stone" spots={{ picked: p.picked, onPick: p.onPick }} {...(p.still ? { stillOnly: true } : {})} />
        </DioramaContext.Provider>
      </UiEnvContext.Provider>
    );
  }

  it("the still's spots until the stage is live, then targets at Track B's anchors (the same buttons, never both)", async () => {
    const env = envFor();
    const { mount, stages } = anchoredMount();
    const picks: number[] = [];
    show(<Spots env={env} mount={mount} picked={1} onPick={(i) => picks.push(i)} />);
    expect(container.querySelectorAll('[data-testid="anchor-0"]')).toHaveLength(1);
    expect(container.querySelector('.cos-mock [data-testid="anchor-0"]')).not.toBeNull();
    await enter();
    await goLive(stages[0]!);
    expect(container.querySelector('[data-testid="stage-spots"]')).not.toBeNull();
    for (const i of [0, 1, 2]) expect(container.querySelectorAll(`[data-testid="anchor-${i}"]`), `anchor-${i}`).toHaveLength(1);
    expect(container.querySelector('.cos-mock [data-testid="anchor-0"]')).toBeNull();
    // the picked spot says so; a tap picks another
    expect(container.querySelector('[data-testid="anchor-1"]')!.getAttribute('aria-pressed')).toBe('true');
    act(() => container.querySelector('[data-testid="anchor-2"]')!.click());
    expect(picks).toEqual([2]);
  });

  it('moves the targets when the stage resizes (onAnchorsChange)', async () => {
    const { mount, stages } = anchoredMount();
    show(<Spots env={envFor()} mount={mount} picked={0} onPick={() => undefined} />);
    await enter();
    await goLive(stages[0]!);
    // (the fake DOM has no layout, so read the footprints, which come straight from the anchors)
    const foot = (): string | null => container.querySelectorAll('.cos-marks__foot')[2]?.getAttribute('cx') ?? null;
    const before = foot();
    expect(before).not.toBeNull();
    act(() => stages[0]!.move());
    expect(foot()).not.toBe(before);
  });

  it('Reduce motion keeps the still (and its spots): no live stage is mounted', async () => {
    const { mount, stages } = anchoredMount();
    show(<Spots env={envFor()} mount={mount} picked={0} onPick={() => undefined} still />);
    await enter();
    expect(stages).toHaveLength(0);
    expect(container.querySelector('.cos-mock [data-testid="anchor-0"]')).not.toBeNull();
  });

  it('the Flags tab marks the pole: on the still, then on the live stage at its anchor', async () => {
    const env = envFor();
    const { mount, stages } = anchoredMount();
    const Flags = (p: { k: string }): ComponentChildren => (
      <UiEnvContext.Provider value={env}>
        <DioramaContext.Provider value={mount}>
          <PreviewStage testid="stage" age="stone" pole poleKey={p.k} />
        </DioramaContext.Provider>
      </UiEnvContext.Provider>
    );
    show(<Flags k="a" />);
    expect(container.querySelector('[data-testid="still-pole"]')).not.toBeNull();
    await enter();
    await goLive(stages[0]!);
    expect(container.querySelector('[data-testid="still-pole"]')).toBeNull();
    expect(container.querySelector('[data-testid="stage-pole"]')).not.toBeNull();
  });
});
