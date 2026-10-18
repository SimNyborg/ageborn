/**
 * The one persistent Pixi canvas (DESIGN B6 "One persistent canvas for the battle, the capsule stage
 * and card stages"). Screens add their root container to `stage` and remove it when they leave.
 *
 * The frame scheduler runs session and replay loops on Pixi's ticker at high priority, so every
 * frame first steps the sim and updates the view, then Pixi renders once.
 */
import { Application, UPDATE_PRIORITY, type Container, type TextureSource } from 'pixi.js';
import type { GpuHooks } from '@/visuals/gpuUpload';
import type { FrameScheduler } from './session';

export interface PixiHost {
  readonly app: Application;
  readonly scheduler: FrameScheduler;
  /** Adds a screen's root; returns a detach function. */
  mount(root: Container, onResize: (w: number, h: number) => void): () => void;
  /** Sets the render resolution (the battle view lowers it in Lite, B16). */
  setResolution(r: number): void;
  /**
   * The renderer's texture upload for the art tier (G7, Safari memory): a loaded unit sheet goes to the
   * GPU at once and its decoded CPU copy is released; after a lost WebGL context comes back the art
   * decodes those sheets again.
   */
  readonly gpu: GpuHooks;
  destroy(): void;
}

/** `GpuHooks` over a Pixi application: `renderer.texture.initSource` (what Pixi's own prepare uses). */
export function pixiGpuHooks(app: Application): GpuHooks {
  const restored = new Set<() => void>();
  // Pixi restores its context first (its listener was added at init), then the art decodes again
  app.canvas.addEventListener('webglcontextrestored', () => {
    for (const cb of restored) cb();
  });
  return {
    upload(source: TextureSource): boolean {
      const r = app.renderer as unknown as { context?: { isLost?: boolean }; texture: { initSource(s: TextureSource): void } };
      if (r.context?.isLost === true) return false;
      r.texture.initSource(source);
      return true;
    },
    onRestored(cb) {
      restored.add(cb);
      return () => restored.delete(cb);
    },
  };
}

/**
 * A `FrameScheduler` over a Pixi ticker: one high-priority listener runs the callbacks requested
 * before this frame (callbacks that request again run next frame, never twice in one frame).
 */
export function tickerScheduler(app: Application): FrameScheduler {
  let next = 1;
  let queue = new Map<number, (now: number) => void>();
  app.ticker.add(
    () => {
      if (queue.size === 0) return;
      const run = queue;
      queue = new Map();
      const now = performance.now();
      for (const cb of run.values()) cb(now);
    },
    undefined,
    UPDATE_PRIORITY.HIGH,
  );
  return {
    request(cb) {
      const h = next++;
      queue.set(h, cb);
      return h;
    },
    cancel(h) {
      queue.delete(h);
    },
    now: () => performance.now(),
  };
}

/**
 * The app's one persistent canvas (`createPixiHost`; its ticker stops first, so nothing draws on the lost
 * context) and the menus' second context: Home's live island and the Customize diorama share one app, the
 * card showcase has its own (review M S5: Home is the likeliest screen at a reload; their stages stop
 * drawing when their context is lost).
 */
const GAME_CANVAS = ['game-canvas', 'home-stage-canvas', 'diorama-canvas', 'showcase-canvas'].map((id) => `canvas[data-testid="${id}"]`).join(', ');

/** Loses a canvas's WebGL context now (its textures and buffers go at once). Never creates a context. */
function loseContext(c: HTMLCanvasElement): void {
  try {
    // these canvases already hold a context, so asking for the other kind returns null
    const gl = (c.getContext('webgl2') ?? c.getContext('webgl')) as WebGLRenderingContext | null;
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    // a lost or WebGPU context: nothing to free here
  }
}

/**
 * The page is going away (a reload, a navigation, the back-forward cache): the game canvas's WebGL context
 * is lost at once, so the battle's textures leave the GPU before the next page loads in the same process
 * (review 2: WebKit as an iPhone crashed reloading after a battle; a software WebGL keeps its textures in
 * the page's own memory, as an iPhone shares one memory between the two). `release` runs first (the app
 * stops its ticker and the art caches let go of their images). A page the back-forward cache brings back
 * reloads, since its context is gone. Returns the unsubscribe.
 */
export function releaseGpuOnPageHide(win: Window, release: () => void): () => void {
  const onHide = (): void => {
    try {
      release();
    } catch {
      // the page is going anyway
    }
    for (const c of win.document.querySelectorAll<HTMLCanvasElement>(GAME_CANVAS)) loseContext(c);
  };
  const onShow = (e: PageTransitionEvent): void => {
    if (e.persisted) win.location.reload();
  };
  win.addEventListener('pagehide', onHide);
  win.addEventListener('pageshow', onShow);
  return () => {
    win.removeEventListener('pagehide', onHide);
    win.removeEventListener('pageshow', onShow);
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
    gpu: pixiGpuHooks(app),
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
