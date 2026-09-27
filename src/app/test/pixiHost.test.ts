import { describe, expect, it } from 'vitest';
import type { Application } from 'pixi.js';
import { tickerScheduler } from '../pixiHost';

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
