/**
 * The one persistent Pixi canvas (DESIGN B6 "One persistent canvas for the battle, the capsule stage
 * and card stages"). Screens add their root container to `stage` and remove it when they leave.
 *
 * The frame scheduler runs session and replay loops on Pixi's ticker at high priority, so every
 * frame first steps the sim and updates the view, then Pixi renders once.
 */
import { Application, UPDATE_PRIORITY, type Container } from 'pixi.js';
import type { FrameScheduler } from './session';

export interface PixiHost {
  readonly app: Application;
  readonly scheduler: FrameScheduler;
  /** Adds a screen's root; returns a detach function. */
  mount(root: Container, onResize: (w: number, h: number) => void): () => void;
  /** Sets the render resolution (the battle view lowers it in Lite, B16). */
  setResolution(r: number): void;
  destroy(): void;
}

/** A `FrameScheduler` over a Pixi ticker (callbacks run before Pixi's render of the same frame). */
export function tickerScheduler(app: Application): FrameScheduler {
  let next = 1;
  const fns = new Map<number, () => void>();
  return {
    request(cb) {
      const h = next++;
      const fn = (): void => {
        fns.delete(h);
        cb(performance.now());
      };
      fns.set(h, fn);
      app.ticker.addOnce(fn, undefined, UPDATE_PRIORITY.HIGH);
      return h;
    },
    cancel(h) {
      const fn = fns.get(h);
      if (!fn) return;
      fns.delete(h);
      app.ticker.remove(fn);
    },
    now: () => performance.now(),
  };
}

export async function createPixiHost(el: HTMLElement, o: { webgpu?: boolean } = {}): Promise<PixiHost> {
  const app = new Application();
  await app.init({
    resizeTo: el,
    preference: o.webgpu ? 'webgpu' : 'webgl',
    background: 0x1b1a2e,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  app.canvas.setAttribute('data-testid', 'game-canvas');
  app.canvas.style.display = 'block';
  el.appendChild(app.canvas);
  const resizers = new Set<(w: number, h: number) => void>();
  app.renderer.on('resize', () => {
    for (const r of resizers) r(app.screen.width, app.screen.height);
  });
  return {
    app,
    scheduler: tickerScheduler(app),
    mount(root, onResize) {
      app.stage.addChild(root);
      resizers.add(onResize);
      onResize(app.screen.width, app.screen.height);
      return () => {
        resizers.delete(onResize);
        if (root.parent === app.stage) app.stage.removeChild(root);
      };
    },
    setResolution(r) {
      if (Math.abs(app.renderer.resolution - r) < 0.01) return;
      app.renderer.resize(app.screen.width, app.screen.height, r);
    },
    destroy() {
      app.destroy(true, { children: true });
    },
  };
}
