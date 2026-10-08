/**
 * Card detail's live showcase in the UI (owner request 2026-10-07), with a fake injected stage: it
 * mounts after the entrance, keeps the still until the stage is live, forwards taps, the caption and
 * play/pause, keeps the stage in step with the page (a skin change, Reduce motion) and destroys it on
 * leave. Without a provider (tests, a renderer-less shell) the still stays.
 */
import { content } from '@/content';
import type { ShowcaseHandle, ShowcaseMount, ShowcaseRequest, ShowcaseState } from '@/contracts';
import { MOTION_DUR } from '@/core/motion';
import { render, type ComponentChildren } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultKit, UiKitContext } from '../../components/kit';
import { ShowcaseContext } from '../../components/showcase';
import { CardStage } from '../cardDetail/CardStage';
import { moveLabel } from '../cardDetail/CardShowcase';
import { fixtureSave } from '../fixtures/saves';
import { cardDef, cardGlyph, cardTile } from '../model/cards';
import { installDom, type FakeElement } from './dom';
import { EN } from './harness';

interface FakeStage extends ShowcaseHandle {
  req: ShowcaseRequest;
  plays: (string | undefined)[];
  updates: Partial<ShowcaseRequest>[];
  autos: boolean[];
  destroyed: boolean;
  celebrated: number;
  go(ok: boolean): void;
}

function fakeMount(): { mount: ShowcaseMount; stages: FakeStage[] } {
  const stages: FakeStage[] = [];
  const mount: ShowcaseMount = (_host, req) => {
    let resolve: (ok: boolean) => void = () => {};
    const ready = new Promise<boolean>((r) => (resolve = r));
    const subs = new Set<(s: ShowcaseState) => void>();
    let s: ShowcaseState = { live: false, move: 'idle', index: 0, of: 0, ability: null, auto: !req.reduceMotion, moves: ['walk', 'idle', 'attack', 'hit', 'ko'] };
    const emit = (): void => subs.forEach((fn) => fn(s));
    const st: FakeStage = {
      req,
      plays: [],
      updates: [],
      autos: [],
      destroyed: false,
      celebrated: 0,
      ready,
      state: () => s,
      play: (m) => {
        st.plays.push(m);
        s = { ...s, move: m ?? 'attack', auto: false };
        emit();
      },
      setAuto: (on) => {
        st.autos.push(on);
        s = { ...s, auto: on };
        emit();
      },
      update: (patch) => st.updates.push(patch),
      celebrate: () => (st.celebrated += 1),
      setVisible: () => {},
      subscribe: (fn) => {
        subs.add(fn);
        return () => subs.delete(fn);
      },
      destroy: () => (st.destroyed = true),
      go: (ok) => {
        s = { ...s, live: ok };
        resolve(ok);
      },
    };
    stages.push(st);
    return st;
  };
  return { mount, stages };
}

const save = fixtureSave(content, 'mid');

function Stage(p: { card: string; skin?: string | null; reduce?: boolean; mount: ShowcaseMount | null; ceremony?: { phase: 'charge' | 'impact'; n: number } | null }): ComponentChildren {
  const def = cardDef(content, p.card)!;
  const tile = { ...cardTile(save, content, p.card, EN)!, ...(p.skin !== undefined ? { skin: p.skin } : {}) };
  return (
    <UiKitContext.Provider value={{ ...defaultKit, reduceMotion: p.reduce === true }}>
      <ShowcaseContext.Provider value={p.mount}>
        <CardStage tile={tile} kind={def.kind} glyph={cardGlyph(def)} owned copies={null} ceremony={p.ceremony ?? null} armed={false} content={content} teamPreset="default" lite={false} />
      </ShowcaseContext.Provider>
    </UiKitContext.Provider>
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
const stageEl = (): FakeElement => container.querySelector('[data-testid="card-stage"]') ?? container.querySelector('.cd-stage')!;
async function enter(): Promise<void> {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(MOTION_DUR.medium + 80);
  });
}

describe('Card detail live showcase', () => {
  it('mounts after the entrance with the card, its skin and the settings; the still stays until it is live', async () => {
    const { mount, stages } = fakeMount();
    show(<Stage card="bonker" mount={mount} />);
    expect(stages).toHaveLength(0);
    await enter();
    expect(stages).toHaveLength(1);
    const st = stages[0]!;
    expect(st.req).toMatchObject({ card: 'bonker', level: cardTile(save, content, 'bonker', EN)!.level, silhouette: false, teamPreset: 'default', reduceMotion: false, lite: false });
    expect(st.req.content).toBe(content);
    expect(stageEl().className).not.toContain('is-live');
    expect(container.querySelector('[data-testid="showcase-next"]')).toBeNull();
    await act(async () => {
      st.go(true);
      await Promise.resolve();
    });
    expect(stageEl().className).toContain('is-live');
    const next = container.querySelector('[data-testid="showcase-next"]')!;
    expect(next.getAttribute('data-move')).toBe('idle');
    expect(next.textContent).toContain(EN('ui.card.showcase.move.idle'));
  });

  it('a stage that cannot go live (no WebGL, no sheet) leaves the still in place', async () => {
    const { mount, stages } = fakeMount();
    show(<Stage card="bonker" mount={mount} />);
    await enter();
    await act(async () => {
      stages[0]!.go(false);
      await Promise.resolve();
    });
    expect(stageEl().className).not.toContain('is-live');
    expect(container.querySelector('.cd-show')).toBeNull();
  });

  it('a tap on the stage and the caption play the next move; play/pause holds the loop', async () => {
    const { mount, stages } = fakeMount();
    show(<Stage card="bonker" mount={mount} />);
    await enter();
    const st = stages[0]!;
    await act(async () => {
      st.go(true);
      await Promise.resolve();
    });
    act(() => stageEl().click());
    expect(st.plays).toEqual([undefined]);
    act(() => container.querySelector('[data-testid="showcase-next"]')!.click());
    // the caption's click does not also reach the stage
    expect(st.plays).toEqual([undefined, undefined]);
    expect(container.querySelector('[data-testid="showcase-next"]')!.getAttribute('data-move')).toBe('attack');
    const toggle = container.querySelector('[data-testid="showcase-play"]')!;
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    act(() => toggle.click());
    expect(st.autos).toEqual([true]);
    expect(container.querySelector('[data-testid="showcase-play"]')!.getAttribute('aria-pressed')).toBe('true');
  });

  it('keeps the stage in step with the page and destroys it on leave', async () => {
    const { mount, stages } = fakeMount();
    show(<Stage card="bonker" skin={null} mount={mount} />);
    await enter();
    const st = stages[0]!;
    await act(async () => {
      st.go(true);
      await Promise.resolve();
    });
    show(<Stage card="bonker" skin="pumpkin_head" mount={mount} />);
    expect(st.updates.some((u) => u.skin === 'pumpkin_head')).toBe(true);
    show(<Stage card="bonker" skin="pumpkin_head" reduce mount={mount} />);
    expect(st.updates.some((u) => u.reduceMotion === true)).toBe(true);
    // the upgrade ceremony's impact: the unit cheers
    show(<Stage card="bonker" skin="pumpkin_head" reduce mount={mount} ceremony={{ phase: 'impact', n: 1 }} />);
    expect(st.celebrated).toBe(1);
    // another card: a new stage, the old one destroyed
    show(<Stage card="tuskback" mount={mount} />);
    expect(st.destroyed).toBe(true);
    await enter();
    expect(stages).toHaveLength(2);
    expect(stages[1]!.req.card).toBe('tuskback');
    show(null);
    expect(stages[1]!.destroyed).toBe(true);
  });

  it('leaving before the entrance ends never mounts a stage', async () => {
    const { mount, stages } = fakeMount();
    show(<Stage card="bonker" mount={mount} />);
    show(null);
    await enter();
    expect(stages).toHaveLength(0);
  });

  it('without an injected stage the still is all there is', async () => {
    show(<Stage card="bonker" mount={null} />);
    await enter();
    expect(stageEl().className).not.toContain('is-live');
    expect(container.querySelector('[data-testid="card-showcase"]')).not.toBeNull();
  });

  it('names attack variants and abilities in the caption', () => {
    const base: ShowcaseState = { live: true, move: 'attack_b', index: 2, of: 3, ability: null, auto: true, moves: [] };
    expect(moveLabel(EN, base)).toBe('Attack 2/3');
    expect(moveLabel(EN, { ...base, move: 'attack', index: 1, of: 1 })).toBe('Attack');
    expect(moveLabel(EN, { ...base, move: 'ability', ability: 'pounce' })).toBe('Pounce');
    expect(moveLabel(EN, { ...base, move: 'ability', ability: 'roar' })).toBe('Roar');
    for (const m of ['idle', 'walk', 'attack_alt', 'summon', 'hit', 'ko', 'build', 'fire', 'spawn', 'trigger', 'cast'] as const) {
      expect(moveLabel(EN, { ...base, move: m }), m).not.toMatch(/^ui\./);
    }
  });
});
