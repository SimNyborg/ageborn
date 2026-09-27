/**
 * A Pixi stage for one gallery section: owns the Application and an art provider, builds a scene,
 * and drives it every frame. With `freezeAtMs` the scene is advanced to that time in fixed 16.7 ms
 * steps, rendered once and then left still (deterministic screenshots).
 */
import { Application, Container } from 'pixi.js';
import { useEffect, useRef } from 'preact/hooks';
import type { TeamPreset } from '@/contracts/ids';
import type { VisualDef } from '@/contracts/art';
import { atlasVisualDef, type AtlasJson } from '@/visuals/adapters/atlas';
import { MANIFEST } from '@/visuals/manifest';
import { ALL_AGES, createArtProvider, type VisualsArtProvider } from '@/visuals/provider';
import type { VisualKind } from '@/visuals/adapters/types';

export interface Scene {
  update(dtMs: number): void;
  destroy(): void;
}

export interface StageContext {
  app: Application;
  /** Add scene content here (it is cleared between builds). */
  root: Container;
  art: VisualsArtProvider;
  width: number;
  height: number;
}

export interface StageProps {
  build: (ctx: StageContext) => Scene;
  /** Rebuild the scene when any of these change. */
  deps: readonly unknown[];
  height: number;
  preset: TeamPreset;
  tier: VisualKind | null;
  quality: 'high' | 'lite';
  freezeAtMs: number | null;
  speed?: number;
  background?: number;
  testId?: string;
  /**
   * Sprite-sheet overrides for a tier comparison: visual id → spritesheet JSON URL. The entries are
   * built with `atlasVisualDef` and replace the procedural ones, exactly as an OVERRIDES entry would.
   */
  atlas?: Readonly<Record<string, string>>;
}

async function atlasOverrides(map: Readonly<Record<string, string>>): Promise<Record<string, VisualDef>> {
  const out: Record<string, VisualDef> = {};
  for (const [id, url] of Object.entries(map)) {
    try {
      const json = (await (await fetch(url)).json()) as AtlasJson;
      out[id] = atlasVisualDef(json, url);
    } catch (e) {
      console.warn(`[gallery] atlas "${url}" for ${id} failed`, e);
    }
  }
  return out;
}

export function PixiStage(p: StageProps) {
  const host = useRef<HTMLDivElement>(null);
  const props = useRef(p);
  props.current = p;
  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let disposed = false;
    let scene: Scene | null = null;
    const app = new Application();
    void (async () => {
      await app.init({
        width: el.clientWidth || 1200,
        height: p.height,
        background: p.background ?? 0xd9d2bf,
        antialias: true,
        preference: 'webgl',
        resolution: Math.min(2, window.devicePixelRatio || 1),
        autoDensity: true,
      });
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      app.canvas.style.display = 'block';
      app.canvas.setAttribute('data-testid', p.testId ?? 'gallery-canvas');
      el.appendChild(app.canvas);
      const overrides = p.atlas ? await atlasOverrides(p.atlas) : {};
      const art = createArtProvider({ manifest: { ...MANIFEST, ...overrides }, quality: p.quality, teamPreset: p.preset, force: p.tier, dpr: Math.min(2, window.devicePixelRatio || 1) });
      await art.preload([...ALL_AGES]);
      if (disposed) return;
      const root = new Container();
      app.stage.addChild(root);
      scene = props.current.build({ app, root, art, width: app.screen.width, height: app.screen.height });
      const freeze = props.current.freezeAtMs;
      if (freeze !== null) {
        const step = 1000 / 60;
        for (let t = 0; t < freeze; t += step) scene.update(Math.min(step, freeze - t));
        app.ticker.stop();
        app.render();
        el.setAttribute('data-ready', '1');
        return;
      }
      el.setAttribute('data-ready', '1');
      app.ticker.add((tk) => scene?.update(Math.min(100, tk.deltaMS) * (props.current.speed ?? 1)));
    })();
    return () => {
      disposed = true;
      scene?.destroy();
      if (app.renderer) app.destroy(true, { children: true });
    };
  }, [...p.deps, p.preset, p.tier, p.quality, p.freezeAtMs, p.height, JSON.stringify(p.atlas ?? {})]);
  return <div ref={host} data-testid={`${p.testId ?? 'gallery-canvas'}-host`} style={{ width: '100%', minHeight: `${p.height}px` }} />;
}
