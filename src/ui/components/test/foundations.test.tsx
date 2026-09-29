/**
 * UI-0 foundations (docs/ui-plan.md 3.6, 2.2, 5.4, 5.6): the one Button, the tab bar and its badge
 * rule, the router's tab stacks and cross-tab jumps, the browser back binding, haptics and the
 * Result action table (4.9).
 */
import { i18n } from '@/i18n';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeEvent, installDom, text, type FakeElement } from '../../screens/test/dom';
import { resultActions } from '../../screens/model/result';
import { createRouter } from '../../router';
import { bindHistory, clearBackHandlers, pushBackHandler, type HistoryHost } from '../../history';
import { Button, buttonKind, buttonSize } from '../Button';
import { haptic, HAPTIC_GAP_MS, resetHaptics, setHapticsEnabled } from '../haptics';
import { UiKitContext, defaultKit, type UiKit } from '../kit';
import { homeBadges, TabBar } from '../Nav';

let container: FakeElement | null = null;
function show(node: preact.ComponentChildren, kit: UiKit = defaultKit) {
  const dom = installDom();
  container = dom.container;
  act(() => render(<UiKitContext.Provider value={kit}>{node}</UiKitContext.Provider>, container as unknown as HTMLElement));
  return dom;
}
afterEach(() => {
  if (container) act(() => render(null, container as unknown as HTMLElement));
  container = null;
  vi.useRealTimers();
});

describe('Button (3.6, U1, U3, U5)', () => {
  it('maps the pre-UI-0 names onto the five kinds and sizes', () => {
    expect(buttonKind({ variant: 'gold' })).toBe('primary');
    expect(buttonKind({ variant: 'green' })).toBe('progress');
    expect(buttonKind({ variant: 'red' })).toBe('destructive');
    expect(buttonKind({ variant: 'violet' })).toBe('secondary');
    expect(buttonKind({ variant: 'blue' })).toBe('secondary');
    expect(buttonKind({ variant: 'ghost' })).toBe('tertiary');
    expect(buttonKind({})).toBe('secondary');
    expect(buttonSize('sm')).toBe('m');
    expect(buttonSize('lg')).toBe('l');
    expect(buttonSize(undefined)).toBe('m');
    expect(buttonSize('icon')).toBe('icon');
  });

  it('marks the one primary: gold by default, green when asked, never when disabled or opted out', () => {
    const d = show(
      <>
        <Button kind="primary" testid="a">
          Play
        </Button>
        <Button kind="primary" primary={false} testid="b">
          Claim
        </Button>
        <Button kind="progress" primary testid="c">
          Upgrade
        </Button>
        <Button kind="primary" disabled testid="d">
          Play
        </Button>
        <Button kind="secondary" testid="e">
          Home
        </Button>
      </>,
    );
    const attr = (id: string) => d.container.querySelector(`[data-testid="${id}"]`)!.getAttribute('data-primary');
    expect(attr('a')).toBe('');
    expect(attr('b')).toBeNull();
    expect(attr('c')).toBe('');
    expect(attr('d')).toBeNull();
    expect(attr('e')).toBeNull();
    // Labels carry the clip check for the budget spec (1.3).
    expect(d.container.querySelector('[data-testid="a"] [data-clip-check]')).not.toBeNull();
  });

  it('shows the pressed state on pointerdown and plays the click on release', () => {
    const sounds: string[] = [];
    let clicks = 0;
    const d = show(
      <Button kind="primary" testid="go" onClick={() => clicks++}>
        Go
      </Button>,
      { ...defaultKit, sound: (id) => sounds.push(id) },
    );
    const b = d.container.querySelector('[data-testid="go"]')!;
    act(() => void b.dispatchEvent(new FakeEvent('pointerdown')));
    expect(b.getAttribute('data-pressed')).toBe('');
    act(() => void b.dispatchEvent(new FakeEvent('pointerup')));
    expect(b.getAttribute('data-pressed')).toBeNull();
    expect(b.getAttribute('data-released')).toBe('');
    act(() => b.click());
    expect(clicks).toBe(1);
    expect(sounds).toEqual(['ui_click']);
  });

  it('a disabled button with a reason stays tappable and says why (U3, MR-03)', () => {
    vi.useFakeTimers();
    const sounds: string[] = [];
    let clicks = 0;
    let denied = 0;
    const d = show(
      <Button kind="progress" disabled reason="Need 2 more copies" testid="up" onClick={() => clicks++} onDenied={() => denied++}>
        Upgrade
      </Button>,
      { ...defaultKit, sound: (id) => sounds.push(id) },
    );
    const b = d.container.querySelector('[data-testid="up"]')!;
    expect(b.getAttribute('aria-disabled')).toBe('true');
    expect(b.getAttribute('disabled')).toBeNull();
    act(() => b.click());
    expect(clicks).toBe(0);
    expect(denied).toBe(1);
    expect(sounds).toEqual(['ui_deny']);
    expect(text(d.container.querySelector('[data-testid="up-reason"]')!)).toBe('Need 2 more copies');
    expect(b.getAttribute('class')).toContain('is-denied');
    act(() => void vi.advanceTimersByTime(2000));
    expect(d.container.querySelector('[data-testid="up-reason"]')).toBeNull();
  });

  it('pulses only while enabled', () => {
    const d = show(
      <>
        <Button kind="primary" pulse testid="p">
          Play
        </Button>
        <Button kind="primary" pulse disabled testid="q">
          Play
        </Button>
      </>,
    );
    expect(d.container.querySelector('[data-testid="p"]')!.getAttribute('data-pulse')).toBe('');
    expect(d.container.querySelector('[data-testid="q"]')!.getAttribute('data-pulse')).toBeNull();
  });
});

describe('TabBar and the ready-badge rule (2.2, 2.3)', () => {
  const kit: UiKit = { ...defaultKit, t: (k, p) => i18n.t(k, p) };
  it('shows at most 2 ready badges on Home, by priority Capsules, Army, Progress', () => {
    expect(homeBadges({ capsules: 2, army: 1, progress: 3 })).toEqual({ capsules: 2, army: 1 });
    expect(homeBadges({ army: 1, progress: 3 })).toEqual({ army: 1, progress: 3 });
    expect(homeBadges({ capsules: 0, army: null, progress: 'dot' })).toEqual({ progress: 'dot' });
    expect(homeBadges({ customize: 4 })).toEqual({});
  });

  it('switches tabs, marks the active one and explains a locked tab on tap', () => {
    const picked: string[] = [];
    const d = show(
      <TabBar
        active="warPath"
        onSelect={(id) => picked.push(id)}
        tabs={[
          { id: 'army', badge: 1 },
          { id: 'capsules', badge: 2 },
          { id: 'warPath' },
          { id: 'progress', lockedUntil: 5, showLevel: true },
          { id: 'customize', lockedUntil: 4 },
        ]}
      />,
      kit,
    );
    const tab = (id: string) => d.container.querySelector(`[data-testid="tab-${id}"]`)!;
    expect(tab('warPath').getAttribute('aria-current')).toBe('page');
    expect(text(tab('army'))).toContain('Army');
    expect(text(tab('progress'))).toContain('Lv 5');
    act(() => tab('army').click());
    expect(picked).toEqual(['army']);
    act(() => tab('progress').click());
    expect(picked).toEqual(['army']);
    expect(text(tab('progress'))).toContain('Unlocks at War Path level 5');
  });
});

describe('router tabs, stacks and cross-tab jumps (2.2, U7)', () => {
  it('keeps one stack per tab and returns to where the player left it', () => {
    const r = createRouter({ id: 'home' });
    r.switchTab('warPath', { id: 'home' });
    r.switchTab('army', { id: 'warPlan' });
    r.go({ id: 'cardDetail', card: 'bonker' });
    expect(r.current.value.id).toBe('cardDetail');
    r.switchTab('customize', { id: 'customize' });
    expect(r.stack.value.map((e) => e.route.id)).toEqual(['customize']);
    r.switchTab('army', { id: 'warPlan' });
    expect(r.stack.value.map((e) => e.route.id)).toEqual(['warPlan', 'cardDetail']);
    // Tapping the active tab returns it to its root.
    r.switchTab('army', { id: 'warPlan' });
    expect(r.stack.value.map((e) => e.route.id)).toEqual(['warPlan']);
  });

  it('back on a tab root goes to Home; Home is the root', () => {
    const r = createRouter({ id: 'home' });
    r.switchTab('warPath', { id: 'home' });
    r.switchTab('progress', { id: 'trophyRoad' });
    expect(r.canGoBack.value).toBe(true);
    expect(r.back()).toBe(true);
    expect(r.tab.value).toBe('warPath');
    expect(r.current.value.id).toBe('home');
    expect(r.back()).toBe(false);
  });

  it('a cross-tab jump returns to its origin in the state it was left', () => {
    const r = createRouter({ id: 'home' });
    r.switchTab('warPath', { id: 'home' });
    r.go({ id: 'result', info: {} as never });
    r.jump({ id: 'cardDetail', card: 'bonker' }, 'army');
    expect(r.tab.value).toBe('army');
    expect(r.current.value.id).toBe('cardDetail');
    expect(r.back()).toBe(true);
    expect(r.tab.value).toBe('warPath');
    expect(r.stack.value.map((e) => e.route.id)).toEqual(['home', 'result']);
  });

  it('without the tab shell the router behaves as before', () => {
    const r = createRouter({ id: 'home' });
    r.go({ id: 'settings' });
    expect(r.tab.value).toBeNull();
    expect(r.back()).toBe(true);
    expect(r.back()).toBe(false);
  });
});

describe('browser back binding (2.2, U7)', () => {
  beforeEach(() => clearBackHandlers());

  function host() {
    const entries: unknown[] = [null];
    let listener: ((e: PopStateEvent) => void) | null = null;
    let left = false;
    const h: HistoryHost & { pop(): void; entries: unknown[]; left(): boolean } = {
      entries,
      history: {
        get state() {
          return entries[entries.length - 1];
        },
        pushState: (s: unknown) => void entries.push(s),
        replaceState: (s: unknown) => void (entries[entries.length - 1] = s),
        back: () => {
          left = true;
        },
      } as never,
      addEventListener: (_t, fn) => void (listener = fn),
      removeEventListener: () => void (listener = null),
      pop() {
        entries.pop();
        listener?.({} as PopStateEvent);
      },
      left: () => left,
    };
    return h;
  }

  it('closes the top sheet first, then goes back, and re-arms the trap', () => {
    const h = host();
    const backs: string[] = [];
    let depth = 1;
    bindHistory({ host: h, onBack: () => (depth > 0 ? (backs.push('router'), depth--, true) : false), onLeaveWarning: () => backs.push('warn') });
    expect(h.entries.length).toBe(2);
    const off = pushBackHandler(() => backs.push('sheet'));
    h.pop();
    expect(backs).toEqual(['sheet']);
    expect(h.entries.length).toBe(2);
    off();
    h.pop();
    expect(backs).toEqual(['sheet', 'router']);
  });

  it('at the root the first back warns and only a second within 2 s leaves', () => {
    const h = host();
    let now = 0;
    const warns: number[] = [];
    bindHistory({ host: h, onBack: () => false, onLeaveWarning: () => warns.push(now), now: () => now });
    h.pop();
    expect(warns).toEqual([0]);
    expect(h.left()).toBe(false);
    now = 2500;
    h.pop();
    expect(warns).toEqual([0, 2500]);
    expect(h.left()).toBe(false);
    now = 3000;
    h.pop();
    expect(h.left()).toBe(true);
  });
});

describe('haptics (5.4)', () => {
  it('vibrates by tier at most once per 100 ms and never when switched off', () => {
    const calls: unknown[] = [];
    const nav = globalThis.navigator as unknown as { vibrate?: unknown };
    const had = 'vibrate' in (nav ?? {});
    const original = nav?.vibrate;
    Object.defineProperty(globalThis, 'navigator', { value: { ...(nav ?? {}), vibrate: (p: unknown) => (calls.push(p), true) }, configurable: true });
    let now = 1000;
    resetHaptics(() => now);
    setHapticsEnabled(true);
    expect(haptic('tick')).toBe(true);
    expect(haptic('thump')).toBe(false);
    now += HAPTIC_GAP_MS;
    expect(haptic('heavy')).toBe(true);
    setHapticsEnabled(false);
    now += 1000;
    expect(haptic('tick')).toBe(false);
    setHapticsEnabled(true);
    expect(calls).toEqual([8, [30, 30, 60]]);
    if (had) (globalThis.navigator as unknown as { vibrate?: unknown }).vibrate = original;
  });
});

describe('Result actions (4.9, U2)', () => {
  const base = { daily: false, stop: false, replay: true, capsule: false };
  it('War Path: Continue after a win, Open capsule first when one was earned, Try again after a loss', () => {
    expect(resultActions({ ...base, mode: 'warPath', outcome: 'win' })).toEqual({ primary: 'continue', secondary: [], tertiary: ['replay'] });
    expect(resultActions({ ...base, mode: 'warPath', outcome: 'win', capsule: true }).primary).toBe('openCapsule');
    expect(resultActions({ ...base, mode: 'warPath', outcome: 'win', capsule: true }).secondary).toEqual(['continue']);
    expect(resultActions({ ...base, mode: 'warPath', outcome: 'loss' })).toEqual({ primary: 'tryAgain', secondary: ['home'], tertiary: ['replay'] });
  });
  it('Ladder, Quick Battle and Skirmish: Next battle, or Open capsule with Next battle one tap away', () => {
    expect(resultActions({ ...base, mode: 'ladder', outcome: 'loss' }).primary).toBe('next');
    const cap = resultActions({ ...base, mode: 'skirmish', outcome: 'win', capsule: true });
    expect(cap.primary).toBe('openCapsule');
    expect(cap.secondary[0]).toBe('next');
  });
  it('Daily, night and stopping cards make Home the primary', () => {
    expect(resultActions({ ...base, mode: 'daily', outcome: 'win', daily: true })).toEqual({ primary: 'home', secondary: ['copy'], tertiary: ['replay'] });
    expect(resultActions({ ...base, mode: 'ladder', outcome: 'win', stop: true }).primary).toBe('home');
    expect(resultActions({ ...base, mode: 'ladder', outcome: 'win', stop: true }).secondary).toEqual(['next']);
  });
  it('Onboarding: Open capsule, else Continue, Try again after a lost match with a retry', () => {
    expect(resultActions({ ...base, mode: 'tutorial', outcome: 'win', capsule: true, onboarding: true })).toEqual({ primary: 'openCapsule', secondary: [], tertiary: [] });
    expect(resultActions({ ...base, mode: 'tutorial', outcome: 'loss', onboarding: true, canRetry: true }).primary).toBe('tryAgain');
  });
});
