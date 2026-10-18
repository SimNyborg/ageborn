import { describe, expect, it } from 'vitest';
import type { Application } from 'pixi.js';
import { releaseGpuOnPageHide, tickerScheduler } from '../pixiHost';

/** A ticker that calls its listeners once per `frame()`, like Pixi's. */
function fakeApp(): { app: Application; frame: () => void } {
  const listeners: (() => void)[] = [];
  const app = { ticker: { add: (fn: () => void) => listeners.push(fn) } } as unknown as Application;
  return { app, frame: () => listeners.forEach((l) => l()) };
}

describe('tickerScheduler', () => {
  it('runs each request once, on the next frame, even when the callback requests again', () => {
    const { app, frame } = fakeApp();
    const s = tickerScheduler(app);
    let runs = 0;
    const loop = (): void => {
      runs += 1;
      s.request(loop);
    };
    s.request(loop);
    expect(runs).toBe(0);
    frame();
    expect(runs).toBe(1);
    frame();
    frame();
    expect(runs).toBe(3);
  });

  it('cancel removes a pending callback', () => {
    const { app, frame } = fakeApp();
    const s = tickerScheduler(app);
    let runs = 0;
    const h = s.request(() => (runs += 1));
    s.cancel(h);
    frame();
    expect(runs).toBe(0);
  });
});

describe('releaseGpuOnPageHide (review 2, review M S5)', () => {
  /** A window with the game canvas (WebGL 2), the menus' (Home's island, the diorama), the showcase's and a stranger's. */
  function fakeWindow(gameKind: 'webgl2' | 'webgl' = 'webgl2') {
    const handlers = new Map<string, (e: unknown) => void>();
    const lost: string[] = [];
    let reloads = 0;
    const canvas = (id: string, kind: 'webgl2' | 'webgl') => ({
      id,
      getContext: (k: string) => (k === kind ? { getExtension: (n: string) => (n === 'WEBGL_lose_context' ? { loseContext: () => lost.push(id) } : null) } : null),
    });
    const all = [canvas('game-canvas', gameKind), canvas('home-stage-canvas', 'webgl2'), canvas('showcase-canvas', 'webgl2'), canvas('diorama-canvas', 'webgl2'), canvas('somebody-else', 'webgl2')];
    const win = {
      document: { querySelectorAll: (sel: string) => all.filter((c) => sel.includes(`"${c.id}"`)) },
      location: { reload: () => (reloads += 1) },
      addEventListener: (t: string, fn: (e: unknown) => void) => handlers.set(t, fn),
      removeEventListener: (t: string) => handlers.delete(t),
    } as unknown as Window;
    return { win, handlers, lost, reloads: () => reloads };
  }

  it("on pagehide runs the release first (the app stops its ticker), then loses the game canvas's and the menus' contexts", () => {
    const f = fakeWindow();
    const order: string[] = [];
    releaseGpuOnPageHide(f.win, () => order.push('release'));
    f.handlers.get('pagehide')!({ persisted: false });
    expect(order).toEqual(['release']);
    expect(f.lost).toEqual(['game-canvas', 'home-stage-canvas', 'showcase-canvas', 'diorama-canvas']);
    // a WebGL 1 context too; and a release that throws never keeps the context
    const g = fakeWindow('webgl');
    releaseGpuOnPageHide(g.win, () => {
      throw new Error('boom');
    });
    g.handlers.get('pagehide')!({ persisted: true });
    expect(g.lost).toContain('game-canvas');
  });

  it('a page the back-forward cache brings back reloads; a normal show does not; unsubscribe removes both', () => {
    const f = fakeWindow();
    const off = releaseGpuOnPageHide(f.win, () => undefined);
    f.handlers.get('pageshow')!({ persisted: false });
    expect(f.reloads()).toBe(0);
    f.handlers.get('pageshow')!({ persisted: true });
    expect(f.reloads()).toBe(1);
    off();
    expect(f.handlers.size).toBe(0);
  });
});
