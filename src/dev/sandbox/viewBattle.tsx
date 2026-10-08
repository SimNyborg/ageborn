/**
 * The battle stage used by the sandbox and feel dev pages: a Pixi canvas with the `BattleView`, the DOM
 * HUD over it, and a small version of the B6 fixed-step loop (the real one is the session's, WP11):
 *
 * ```
 * acc += min(frameMs, 250) × speed × (freeze ? 0 : 1)
 * while acc ≥ 50: step the sim; view.onEvents(events); acc −= 50
 * view.render(acc / 50, frameMs)
 * ```
 *
 * It also measures what the B16 budgets need: frames per second, frame time and WebGL draw calls.
 */
import type { ArtProvider, Command, Foil, FormatId, HudModel, SimEvent } from '@/contracts';
import { FakeArtProvider } from '@/contracts/fakes/art';
import { FakeAudio } from '@/contracts/fakes/audio';
import { BattleView, FixedStepClock, HudModelBuilder, type GraphicsPreset, type RenderFeelConfig, type ViewSettings } from '@/render';
import { Hud } from '@/ui/hud';
import { signal, type Signal } from '@preact/signals';
import { Application, UPDATE_PRIORITY } from 'pixi.js';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createSource, loadAiKit, type AiKit, type BattleSource, type SourceKind } from './viewSources';

export type ArtKind = 'fake' | 'procedural';

export type OpponentKind = 'ai' | 'autoplayer';

export interface StageOptions {
  source: SourceKind;
  art: ArtKind;
  /** Who plays the bot seats in real-sim sources. */
  opponent: OpponentKind;
  format: FormatId;
  seed: number;
  autoplayMe: boolean;
  settings: ViewSettings;
  speed: 1 | 1.5 | 2;
  paused: boolean;
  /** Restart the fake stream when it ends. */
  loop: boolean;
  feel?: RenderFeelConfig;
}

export interface StageStats {
  fps: number;
  frameMs: number;
  worstFrameMs: number;
  /** CPU time per frame spent in the loop and Pixi's render (average), the part the game controls. */
  cpuMs: number;
  /** Of that, the sim steps (average per frame). */
  simMs: number;
  /** Of that, the battle view's own work: event mapping and `render` (average per frame). */
  viewMs: number;
  drawCalls: number;
  tick: number;
  artNote: string;
  view: ReturnType<BattleView['stats']>;
}

/** What the pages can reach while a stage runs. */
export interface StageApi {
  view: BattleView;
  source: BattleSource;
  audio: FakeAudio;
  /** Feeds synthetic events to the view (feel tuning); the sim is not touched. */
  inject(events: SimEvent[]): void;
  /**
   * Frame-exact captures (dev): `manual(true)` stops the ticker, then each `step(ms)` runs exactly one
   * frame of `ms` (the loop and Pixi's render), so a screenshot sequence never depends on the speed of
   * the machine.
   */
  manual(on: boolean): void;
  step(ms: number): void;
  /** Recent sim events, newest last. */
  log(): readonly SimEvent[];
}

interface World {
  source: BattleSource;
  view: BattleView;
  audio: FakeAudio;
  builder: HudModelBuilder;
  hud: Signal<HudModel>;
  clock: FixedStepClock;
  pending: Command[];
  endedMs: number;
}

type VisualsModule = { createArtProvider?: (o?: Record<string, unknown>) => ArtProvider };
const visualsModules = import.meta.glob<VisualsModule>('../../visuals/index.ts');

/** Loads WP4's procedural provider when it is present and works; falls back to the fake art. */
async function loadArt(kind: ArtKind, settings: ViewSettings, preset: GraphicsPreset): Promise<{ art: ArtProvider; note: string }> {
  if (kind === 'procedural') {
    try {
      const load = Object.values(visualsModules)[0];
      const mod = load ? await load() : undefined;
      if (mod?.createArtProvider) {
        const art = mod.createArtProvider({ quality: preset, teamPreset: settings.teamPreset, dpr: Math.min(2, window.devicePixelRatio || 1) });
        // every age's sheets (one-age formats and base collapse captures start in any age)
        await art.preload(['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic']);
        return { art, note: 'procedural (WP4)' };
      }
      return { art: new FakeArtProvider(), note: 'fake (visuals module not available)' };
    } catch (e) {
      console.warn('[sandbox] procedural art failed, using fake art', e);
      return { art: new FakeArtProvider(), note: `fake (procedural failed: ${String(e).slice(0, 80)})` };
    }
  }
  return { art: new FakeArtProvider(), note: 'fake' };
}

/** Counts WebGL draw calls (dev measurement for the B16 draw-call budget). */
function countDrawCalls(app: Application): { take(): number } {
  const gl = (app.renderer as unknown as { gl?: WebGL2RenderingContext }).gl;
  let n = 0;
  if (gl) {
    const g = gl as unknown as Record<string, (...a: unknown[]) => unknown>;
    for (const name of ['drawElements', 'drawArrays', 'drawElementsInstanced', 'drawArraysInstanced']) {
      const orig = g[name];
      if (typeof orig !== 'function') continue;
      g[name] = function (this: unknown, ...a: unknown[]) {
        n++;
        return orig.apply(this, a);
      };
    }
  }
  return {
    take(): number {
      const v = n;
      n = 0;
      return v;
    },
  };
}

export function BattleStage(p: {
  options: StageOptions;
  /** Remount key: change it to restart the match. */
  runKey?: number;
  onApi?: (api: StageApi | null) => void;
  onStats?: (s: StageStats) => void;
  onPause?: () => void;
  onSpeed?: (s: 1 | 1.5 | 2) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const opts = useRef(p.options);
  opts.current = p.options;
  const cbs = useRef(p);
  cbs.current = p;
  const worldRef = useRef<World | null>(null);
  const [hudWorld, setHudWorld] = useState<{ world: World; art: ArtProvider } | null>(null);
  const { source, art: artKind, format, seed, autoplayMe, opponent } = p.options;

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    let disposed = false;
    const app = new Application();
    let started = false;
    let resizeObserver: ResizeObserver | null = null;
    let log: SimEvent[] = [];

    let ai: AiKit | null = null;
    const build = (baseArt: ArtProvider): World => {
      const o = opts.current;
      const src = createSource({ kind: source, format, seed, autoplayMe, ai });
      const audio = new FakeAudio();
      // `&backdrop=<id>` dresses your half in a backdrop skin (A18.9.4) for screenshots
      const bd = new URLSearchParams(window.location.search).get('backdrop');
      const art: ArtProvider = bd
        ? Object.assign(Object.create(baseArt) as ArtProvider, {
            createBackdrop: (b: Parameters<ArtProvider['createBackdrop']>[0]) => baseArt.createBackdrop({ ...b, skins: { left: `backdrop.${bd}`, right: b.skins?.right ?? null } }),
          })
        : baseArt;
      const view = new BattleView({
        sim: src.sim,
        art,
        audio,
        settings: o.settings,
        ...(o.feel ? { feel: o.feel } : {}),
        onPresetChange: () => {
          app.renderer.resize(app.screen.width, app.screen.height, view.resolution(window.devicePixelRatio));
        },
      });
      view.resize(app.screen.width, app.screen.height);
      app.stage.addChild(view.root);
      view.attachInput(app.canvas);
      const builder = new HudModelBuilder(src.sim, 0);
      const world: World = {
        source: src,
        view,
        audio,
        builder,
        hud: signal(builder.build({ speed: o.speed, paused: o.paused })),
        clock: new FixedStepClock(),
        pending: [],
        endedMs: 0,
      };
      log = [];
      return world;
    };

    const teardown = (w: World | null): void => {
      if (!w) return;
      app.stage.removeChild(w.view.root);
      w.view.destroy();
    };

    void (async () => {
      await app.init({
        resizeTo: el,
        background: 0x1b1a2e,
        antialias: true,
        preference: 'webgl',
        resolution: Math.min(2, window.devicePixelRatio || 1),
        autoDensity: true,
      });
      started = true;
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      app.canvas.setAttribute('data-testid', 'sandbox-canvas');
      app.canvas.style.display = 'block';
      el.appendChild(app.canvas);
      const draws = countDrawCalls(app);
      const o0 = opts.current;
      const [{ art, note: artNote }, aiKit] = await Promise.all([
        loadArt(artKind, o0.settings, o0.settings.graphics === 'lite' ? 'lite' : 'high'),
        opponent === 'ai' && source !== 'fake' ? loadAiKit() : Promise.resolve(null),
      ]);
      if (disposed) return;
      ai = aiKit;
      const note = source === 'fake' ? artNote : `${artNote}; bots: ${ai ? 'AI General Pip, tier IV (WP3)' : 'dev autoplayer'}`;
      let world = build(art);
      worldRef.current = world;
      setHudWorld({ world, art });
      let manualAt = 0;
      const api = (): StageApi => ({
        view: world.view,
        source: world.source,
        audio: world.audio,
        inject: (events) => world.view.onEvents(events),
        log: () => log,
        manual: (on) => {
          if (on) {
            app.ticker.stop();
            manualAt = performance.now();
          } else {
            app.ticker.start();
          }
        },
        step: (ms) => {
          manualAt += ms;
          app.ticker.update(manualAt);
        },
      });
      cbs.current.onApi?.(api());

      app.renderer.on('resize', () => world.view.resize(app.screen.width, app.screen.height));
      // `resizeTo` only follows window resizes; the stage box also changes when side panels toggle.
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(() => app.resize());
        resizeObserver.observe(el);
      }

      let frames = 0;
      let acc = 0;
      let worst = 0;
      let lastDraws = 0;
      let lastHud = -1e9;
      let clockMs = 0;
      let frameStart = 0;
      let cpu = 0;
      let simMs = 0;
      let viewMs = 0;
      // Runs after Pixi's own render (LOW priority): measures the whole frame's CPU time.
      app.ticker.add(() => {
        cpu += performance.now() - frameStart;
      }, undefined, UPDATE_PRIORITY.UTILITY);
      app.ticker.add((tk) => {
        frameStart = performance.now();
        const o = opts.current;
        const frameMs = tk.deltaMS;
        clockMs += frameMs;
        lastDraws = draws.take();
        const w = world;
        const ended = w.source.done();
        w.view.setPaused(o.paused);
        w.view.setSpeed(o.speed);
        w.clock.add(frameMs, o.speed, w.view.simFrozen || o.paused || ended);
        while (!w.view.simFrozen && !w.source.done() && w.clock.consume()) {
          const human = w.pending;
          w.pending = [];
          const t0 = performance.now();
          const events = w.source.step(human);
          const t1 = performance.now();
          w.view.onEvents(events);
          simMs += t1 - t0;
          viewMs += performance.now() - t1;
          w.builder.afterStep();
          if (events.length > 0) {
            log.push(...events);
            if (log.length > 600) log = log.slice(-400);
          }
        }
        const r0 = performance.now();
        w.view.render(w.clock.alpha, frameMs);
        viewMs += performance.now() - r0;
        if (clockMs - lastHud >= 1000 / 15) {
          lastHud = clockMs;
          w.hud.value = w.builder.build({ speed: o.speed, paused: o.paused });
        }
        // Loop the fake stream a moment after it ends.
        if (ended) {
          w.endedMs += frameMs;
          if (o.loop && w.source.kind === 'fake' && w.endedMs > 3000) {
            teardown(w);
            world = build(art);
            worldRef.current = world;
            setHudWorld({ world, art });
            cbs.current.onApi?.(api());
          }
        }
        frames++;
        acc += frameMs;
        worst = Math.max(worst, frameMs);
        if (acc >= 500) {
          cbs.current.onStats?.({
            fps: (frames * 1000) / acc,
            frameMs: acc / frames,
            worstFrameMs: worst,
            cpuMs: cpu / frames,
            simMs: simMs / frames,
            viewMs: viewMs / frames,
            drawCalls: lastDraws,
            tick: w.source.sim.state.tick,
            artNote: note,
            view: w.view.stats(),
          });
          frames = 0;
          acc = 0;
          worst = 0;
          cpu = 0;
          simMs = 0;
          viewMs = 0;
        }
      }, undefined, UPDATE_PRIORITY.HIGH);
    })();

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      cbs.current.onApi?.(null);
      setHudWorld(null);
      if (started) {
        teardown(worldRef.current);
        app.destroy(true, { children: true });
      }
      worldRef.current = null;
    };
  }, [source, artKind, format, seed, autoplayMe, opponent, p.runKey]);

  // Live settings and feel.
  useEffect(() => {
    worldRef.current?.view.setSettings(p.options.settings);
  }, [JSON.stringify(p.options.settings)]);
  useEffect(() => {
    if (p.options.feel) worldRef.current?.view.setFeel(p.options.feel);
  }, [p.options.feel]);

  const w = hudWorld?.world;
  const art = hudWorld?.art;
  const portrait = useMemo(
    () =>
      art
        ? (card: string, foil: Foil, size: number, plate?: boolean) => {
            const req: Parameters<typeof art.portrait>[0] & { plate?: boolean } = { card, foil, size, side: 0, ...(plate === false ? { plate: false } : {}) };
            return art.portrait(req);
          }
        : undefined,
    [art],
  );
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#1b1a2e' }} data-testid="battle-stage">
      <div ref={host} style={{ position: 'absolute', inset: 0 }} />
      {w && hudWorld ? (
        <Hud
          model={w.hud}
          config={w.source.sim.config}
          issue={(cmd) => w.pending.push(cmd)}
          view={w.view}
          audio={w.audio}
          {...(portrait ? { portrait } : {})}
          teamPreset={p.options.settings.teamPreset}
          onPause={() => cbs.current.onPause?.()}
          onSpeed={(s) => cbs.current.onSpeed?.(s)}
        />
      ) : null}
    </div>
  );
}
