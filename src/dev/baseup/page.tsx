/**
 * Base upgrade bench (dev page, WP4): one base close up with its turrets, to play and review the
 * upgrade moments frame by frame: the evolve (build-up, beat, assembly, flourish), the Treasury
 * pop, a new turret slot, a turret build and a Modernise.
 *
 * `?dev=1#baseup` plays live with buttons. Automation drives `window.__baseup` with the ticker
 * stopped: `reset({ age, quality, reduce })`, then `evolve()` / `treasury()` / `slot(i)` /
 * `build(i)` / `modernise(i)`, and `step(ms)` to advance and render (deterministic frame strips).
 */
import { Application, Container } from 'pixi.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { BaseView, TurretView } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import { AGES } from '@/visuals/ages';
import { MANIFEST } from '@/visuals/manifest';
import { createArtProvider, type VisualsArtProvider } from '@/visuals/provider';
import { AGE_PUPPETS } from '@/visuals/puppets';
import { CLIP_TIMING } from '@/visuals/style';

export const title = 'Base upgrade bench';

interface BenchOptions {
  age: AgeId;
  quality: 'high' | 'lite';
  reduce: boolean;
  treasury: number;
}

interface Bench {
  reset(o: Partial<BenchOptions>): Promise<void>;
  evolve(): void;
  treasury(): void;
  slot(i: number): void;
  build(i: number): void;
  modernise(i: number): void;
  step(ms: number): void;
  readonly age: AgeId;
  ready: boolean;
}

const W = 900;
const H = 560;
/** Pixels per lu and the base's gate position on the canvas. */
const ZOOM = 1.25;
const GATE_X = 560;
const GROUND_Y = 470;
const ASCEND_MS = 2500;

type Motion = { setMotion?: (m: { reduce: boolean; lite: boolean }) => void };

export default function BaseUpBench() {
  const host = useRef<HTMLDivElement>(null);
  const bench = useRef<Bench | null>(null);
  const [live, setLive] = useState(true);
  const [age, setAge] = useState<AgeId>('stone');

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const app = new Application();
    let disposed = false;
    const arts = new Map<string, VisualsArtProvider>();
    let scene: { root: Container; base: BaseView; turrets: (TurretView | null)[]; update(dt: number): void; destroy(): void } | null = null;
    let opts: BenchOptions = { age: 'stone', quality: 'high', reduce: false, treasury: 1 };
    let timers: { at: number; fn: () => void }[] = [];
    let placeFn: ((i: number, age: AgeId, how: 'build' | 'idle' | 'modernise') => void) | null = null;
    let clock = 0;

    const artFor = async (quality: 'high' | 'lite'): Promise<VisualsArtProvider> => {
      const hit = arts.get(quality);
      if (hit) return hit;
      const art = createArtProvider({ manifest: MANIFEST, quality, teamPreset: 'default', dpr: 1, worldPxPerLu: ZOOM });
      await art.preload([...AGES]);
      arts.set(quality, art);
      return art;
    };

    const motion = (v: object): void => (v as Motion).setMotion?.({ reduce: opts.reduce, lite: opts.quality === 'lite' });

    const build = async (): Promise<void> => {
      scene?.destroy();
      scene = null;
      timers = [];
      const art = await artFor(opts.quality);
      if (disposed) return;
      const root = new Container();
      root.scale.set(ZOOM);
      root.position.set(GATE_X, GROUND_Y);
      app.stage.addChild(root);
      const backdrop = art.createBackdrop({ left: opts.age, right: opts.age, arena: 'tar_pits' });
      (backdrop as unknown as { setView?: (l: number, w: number, a: number) => void }).setView?.(-GATE_X / ZOOM, W / ZOOM, GROUND_Y / ZOOM);
      root.addChild(backdrop.root);
      const base = art.createBase({ age: opts.age, side: 0, teamPreset: 'default' });
      motion(base);
      root.addChild(base.root);
      base.setTreasury(opts.treasury);
      const turrets: (TurretView | null)[] = [null, null, null, null];
      const place = (i: number, age: AgeId, how: 'build' | 'idle' | 'modernise'): void => {
        const set = AGE_PUPPETS[age].turrets;
        const p = set[i % Math.max(1, set.length)];
        const m = base.mountPoints()[i];
        if (!p || !m) return;
        const old = turrets[i];
        const view = art.createTurret({ visualId: p.id, side: 0, teamPreset: 'default' });
        motion(view);
        view.root.position.set(m.x, m.y);
        root.addChild(view.root);
        if (how === 'modernise' && old) {
          old.play('modernise');
          const up = view as unknown as { modernisedIn?: () => void };
          if (up.modernisedIn) up.modernisedIn();
          else view.play('build');
          timers.push({ at: clock + 600, fn: () => old.destroy() });
        } else {
          old?.destroy();
          view.play(how === 'build' ? 'build' : 'idle');
          if (how === 'idle') for (let t = 0; t < 1100; t += 50) view.update(50);
        }
        turrets[i] = view;
      };
      // mount 1 holds an older age's turret, so "Modernise 1" morphs it into this age's
      place(0, AGES[AGES.indexOf(opts.age) - 1] ?? opts.age, 'idle');
      place(1, opts.age, 'idle');
      scene = {
        root,
        base,
        turrets,
        update(dt) {
          backdrop.update(dt);
          base.update(dt);
          for (const t of turrets) {
            t?.aimAt(GATE_X / ZOOM + 300);
            t?.update(dt);
          }
        },
        destroy() {
          for (const t of turrets) t?.destroy();
          base.destroy();
          backdrop.destroy();
          root.destroy({ children: true });
        },
      };
      // settle the idle state (flags, lights) before any moment
      for (let t = 0; t < 600; t += 16) scene.update(16);
      app.render();
      placeFn = place;
    };

    const step = (ms: number): void => {
      const dt = 1000 / 60;
      for (let t = 0; t < ms - 1e-6; t += dt) {
        const d = Math.min(dt, ms - t);
        clock += d;
        const due = timers.filter((x) => x.at <= clock);
        timers = timers.filter((x) => x.at > clock);
        for (const x of due) x.fn();
        scene?.update(d);
      }
      app.render();
    };

    const b: Bench = {
      ready: false,
      get age() {
        return opts.age;
      },
      async reset(o) {
        opts = { ...opts, ...o };
        await build();
      },
      evolve() {
        const s = scene;
        if (!s) return;
        const next = AGES[AGES.indexOf(opts.age) + 1];
        if (!next) return;
        (s.base as unknown as { ascend?: (ms: number) => void }).ascend?.(ASCEND_MS);
        timers.push({
          at: clock + ASCEND_MS,
          fn: () => {
            s.base.morphTo(next, CLIP_TIMING.baseMorphMs);
            opts = { ...opts, age: next };
            setAge(next);
          },
        });
      },
      treasury() {
        opts = { ...opts, treasury: Math.min(3, opts.treasury + 1) };
        scene?.base.setTreasury(opts.treasury);
      },
      slot(i) {
        (scene?.base as unknown as { mountBuilt?: (i: number) => void } | undefined)?.mountBuilt?.(i);
      },
      build(i) {
        placeFn?.(i, opts.age, 'build');
      },
      modernise(i) {
        placeFn?.(i, opts.age, 'modernise');
      },
      step,
    };
    bench.current = b;
    (window as unknown as { __baseup?: Bench }).__baseup = b;

    void (async () => {
      await app.init({ width: W, height: H, background: 0x9fb8c8, antialias: true, preference: 'webgl', resolution: 1 });
      if (disposed) {
        app.destroy(true, { children: true });
        return;
      }
      app.canvas.setAttribute('data-testid', 'baseup-canvas');
      el.appendChild(app.canvas);
      await build();
      b.ready = true;
      el.setAttribute('data-ready', '1');
      app.ticker.add((tk) => {
        if (liveRef.current) step(Math.min(100, tk.deltaMS));
      });
    })();
    return () => {
      disposed = true;
      scene?.destroy();
      if (app.renderer) app.destroy(true, { children: true });
    };
  }, []);

  const liveRef = useRef(live);
  liveRef.current = live;
  const btn = { margin: '4px', padding: '6px 10px', font: 'inherit' } as const;
  const b = (): Bench | null => bench.current;
  return (
    <div style={{ fontFamily: 'ui-monospace, Menlo, monospace', color: '#f4ecd8', background: '#1b1a2e', minHeight: '100%', padding: '12px', boxSizing: 'border-box' }}>
      <div>
        <strong>Base upgrade bench</strong> · age {age}{' '}
        <select value={age} onChange={(e) => void b()?.reset({ age: (e.target as HTMLSelectElement).value as AgeId }).then(() => setAge((e.target as HTMLSelectElement).value as AgeId))}>
          {AGES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <button style={btn} onClick={() => b()?.evolve()}>Evolve</button>
        <button style={btn} onClick={() => b()?.treasury()}>Treasury +1</button>
        <button style={btn} onClick={() => b()?.slot(2)}>New slot 3</button>
        <button style={btn} onClick={() => b()?.build(2)}>Build turret 3</button>
        <button style={btn} onClick={() => b()?.modernise(0)}>Modernise 1</button>
        <label style={{ marginLeft: '8px' }}>
          <input type="checkbox" checked={live} onChange={(e) => setLive((e.target as HTMLInputElement).checked)} /> live
        </label>
      </div>
      <div ref={host} data-testid="baseup-host" />
    </div>
  );
}
