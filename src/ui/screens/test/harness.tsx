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
import { ScreenHost, type ScreenSlots } from '../ScreenHost';
import { shellTabs, TAB_ROOTS } from '../warPath/shell';
import type { UiServices } from '../services';
import { installDom, text, type FakeDocument, type FakeElement } from './dom';

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

/** Keys look like `ui.home.battle` or `card.bonker.name`; a visible one means a missing string. */
export const RAW_KEY =
  /\b(ui|card|age|format|rarity|role|group|tag|foil|capsuleTier|capsuleKind|arena|general|quest|modifier|banner|frame|title|emote|skin|cosmetic)\.[A-Za-z0-9_]+\.[A-Za-z0-9_.]+\b|\bui\.[A-Za-z0-9_]+\b/;

/** The first raw string key visible in `el`'s text or aria-labels, or null. */
export function rawKeyIn(el: FakeElement): string | null {
  const hit = RAW_KEY.exec(text(el));
  if (hit) return hit[0];
  for (const x of el.querySelectorAll('[aria-label]')) {
    const h = RAW_KEY.exec(x.getAttribute('aria-label') ?? '');
    if (h) return h[0];
  }
  return null;
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

/** The ScreenHost with the tab shell of the save (ui-plan 2.2), as the app mounts it. */
function ShellHost(p: { env: Parameters<typeof ScreenHost>[0]['env']; slots: ScreenSlots }) {
  return <ScreenHost env={p.env} slots={p.slots} shell={{ tabs: shellTabs(p.env.save.value, content), roots: TAB_ROOTS }} />;
}

export function mount(
  o: { state?: HarnessState; routes?: Route[]; t?: Translate; save?: SaveDoc; patch?: Partial<UiServices>; now?: () => number; shell?: boolean } = {},
): Mounted {
  const { document, container } = installDom();
  const save = signal<SaveDoc>(o.save ?? saveFor(o.state ?? 'mid'));
  const routes = o.routes ?? [{ id: 'home' }];
  const router = createRouter(routes[0]);
  for (const r of routes.slice(1)) router.go(r);
  const log: PreviewLog = { calls: [] };
  const services: UiServices = { ...createPreviewServices({ save, content, router, log }), ...o.patch };
  const env = { save, content, t: o.t ?? EN, locale: 'en', now: o.now ?? (() => FIXTURE_NOW), router, services, portrait: null };
  const slots = { battle: (): ComponentChildren => <div data-testid="battle-slot" /> };
  act(() => {
    render(o.shell ? <ShellHost env={env} slots={slots} /> : <ScreenHost env={env} slots={slots} />, container as unknown as HTMLElement);
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
