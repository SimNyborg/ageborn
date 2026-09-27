/**
 * Test harness: mounts the `ScreenHost` on the tiny DOM with a fixture save, real content, real EN
 * strings (or a pseudo-locale), preview services with a call log, and a router set to a route stack.
 */
import { content } from '@/content';
import type { SaveDoc } from '@/contracts';
import { fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { i18n } from '@/i18n';
import { signal, type Signal } from '@preact/signals';
import { render, type ComponentChildren } from 'preact';
import { act } from 'preact/test-utils';
import type { Translate } from '../../components/kit';
import { createRouter, type Route } from '../../router';
import { FIXTURE_NOW, fixtureSave, type FixtureState } from '../fixtures/saves';
import { createPreviewServices, type PreviewLog } from '../fixtures/services';
import { ScreenHost } from '../ScreenHost';
import type { UiServices } from '../services';
import { installDom, type FakeDocument, type FakeElement } from './dom';

export type HarnessState = FixtureState | 'raw';

export interface Mounted {
  document: FakeDocument;
  container: FakeElement;
  save: Signal<SaveDoc>;
  router: ReturnType<typeof createRouter>;
  services: UiServices;
  log: PreviewLog;
  q(sel: string): FakeElement | null;
  qa(sel: string): FakeElement[];
  /** Clicks the element matching `sel` and flushes effects. Throws when missing. */
  click(sel: string): void;
  unmount(): void;
}

export const EN: Translate = (k, p) => i18n.t(k, p);

/** Pseudo-locale: every translated string is wrapped in ‹…›, so untranslated text stands out. */
export const PSEUDO: Translate = (k, p) => {
  const s = i18n.t(k, p);
  return s === k ? s : `‹${s}›`;
};

export function saveFor(state: HarnessState): SaveDoc {
  return state === 'raw' ? fakeSaveDoc() : fixtureSave(content, state);
}

export function mount(
  o: { state?: HarnessState; routes?: Route[]; t?: Translate; save?: SaveDoc; patch?: Partial<UiServices> } = {},
): Mounted {
  const { document, container } = installDom();
  const save = signal<SaveDoc>(o.save ?? saveFor(o.state ?? 'mid'));
  const routes = o.routes ?? [{ id: 'home' }];
  const router = createRouter(routes[0]);
  for (const r of routes.slice(1)) router.go(r);
  const log: PreviewLog = { calls: [] };
  const services: UiServices = { ...createPreviewServices({ save, content, router, log }), ...o.patch };
  const env = { save, content, t: o.t ?? EN, locale: 'en', now: () => FIXTURE_NOW, router, services, portrait: null };
  const slots = { battle: (): ComponentChildren => <div data-testid="battle-slot" /> };
  act(() => {
    render(<ScreenHost env={env} slots={slots} />, container as unknown as HTMLElement);
  });
  const q = (sel: string) => container.querySelector(sel);
  return {
    document,
    container,
    save,
    router,
    services,
    log,
    q,
    qa: (sel) => container.querySelectorAll(sel),
    click(sel) {
      const el = q(sel);
      if (!el) throw new Error(`click: nothing matches ${sel}`);
      act(() => el.click());
    },
    unmount() {
      act(() => render(null, container as unknown as HTMLElement));
    },
  };
}

/** Runs `fn` inside act() so signal updates and effects flush. */
export function flush(fn: () => void = () => undefined): void {
  act(fn);
}
