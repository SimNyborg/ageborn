import { describe, expect, it } from 'vitest';
import { createRouter, MAX_STACK, SCREENS, visibleEntries, WP9_SCREENS } from '../../router';

describe('router (DESIGN B11: signal-based, screen ids)', () => {
  it('starts at the initial route and pushes and pops', () => {
    const r = createRouter({ id: 'home' });
    expect(r.current.value).toEqual({ id: 'home' });
    expect(r.canGoBack.value).toBe(false);
    r.go({ id: 'collection' });
    expect(r.current.value.id).toBe('collection');
    expect(r.canGoBack.value).toBe(true);
    expect(r.back()).toBe(true);
    expect(r.current.value.id).toBe('home');
    expect(r.back()).toBe(false);
    expect(r.stack.value.length).toBe(1);
  });

  it('keeps typed params and gives each push a fresh key', () => {
    const r = createRouter();
    r.go({ id: 'cardDetail', card: 'bonker' });
    const k1 = r.stack.value[1]!.key;
    r.replace({ id: 'cardDetail', card: 'pebbler' });
    const top = r.current.value;
    expect(top.id === 'cardDetail' && top.card).toBe('pebbler');
    expect(r.stack.value[1]!.key).not.toBe(k1);
    expect(r.stack.value.length).toBe(2);
  });

  it('opens Pause as an overlay so the battle stays mounted underneath', () => {
    const r = createRouter({ id: 'home' });
    r.go({ id: 'battle', request: { mode: 'daily' }, opponent: {} as never });
    r.go({ id: 'pause', info: { mode: 'daily', scouted: [], clockMs: 0, canRetreat: false, retreatAfterMs: 60000 } });
    r.go({ id: 'settings' }, { overlay: true });
    const v = visibleEntries(r.stack.value);
    expect(v.base.route.id).toBe('battle');
    expect(v.overlays.map((o) => o.route.id)).toEqual(['pause', 'settings']);
  });

  it('a non-overlay push hides everything below it', () => {
    const r = createRouter({ id: 'home' });
    r.go({ id: 'collection' });
    r.go({ id: 'cardDetail', card: 'bonker' });
    const v = visibleEntries(r.stack.value);
    expect(v.base.route.id).toBe('cardDetail');
    expect(v.overlays).toEqual([]);
  });

  it('reset clears the stack to one root', () => {
    const r = createRouter({ id: 'home' });
    r.go({ id: 'modeSelect' });
    r.go({ id: 'settings' });
    r.reset({ id: 'home' });
    expect(r.stack.value.map((e) => e.route.id)).toEqual(['home']);
  });

  it('trims deep stacks but keeps the root', () => {
    const r = createRouter({ id: 'home' });
    for (let i = 0; i < 40; i++) r.go({ id: 'cardDetail', card: `c${i}` });
    expect(r.stack.value.length).toBe(MAX_STACK);
    expect(r.stack.value[0]!.route.id).toBe('home');
    const top = r.current.value;
    expect(top.id === 'cardDetail' && top.card).toBe('c39');
  });

  it('knows which A9 screens this package renders', () => {
    expect([...WP9_SCREENS].sort()).toEqual(
      [
        'cardDetail',
        'collection',
        'conquest',
        'customize',
        'home',
        'modeSelect',
        'pause',
        'profile',
        'result',
        'settings',
        'trophyRoad',
        'vs',
        'warPlan',
      ].sort(),
    );
    // A9 numbers 2-4, 6-7, 9-13, 15 and 17 (C2/WP9 tasks), plus Customize (owner feedback 2026-09-28).
    expect(WP9_SCREENS.map((id) => SCREENS[id].a9).sort((a, b) => a - b)).toEqual([2, 3, 4, 6, 7, 9, 10, 11, 12, 13, 15, 17, 19]);
  });
});
