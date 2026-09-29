/**
 * Cosmetics bench (dev page, A18.9.4): both bases with their dressing (base flag, national flag,
 * decorations, base skin) at game scale over the arena backdrop, to review the lane look of every
 * collection item and the motion (flag ripple, flutter on hit, the evolve re-skin, the collapse).
 *
 * `?dev=1#cosmetics` plays live. Automation drives `window.__cosmetics`: `reset({ age, zoom })`,
 * `look(side, look)`, `evolve()`, `hit(side)`, `collapse(side)` and `step(ms)`.
 */
import { Application, Container } from 'pixi.js';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { BaseDressingView, BaseView } from '@/contracts/art';
import type { AgeId, SideLook } from '@/contracts/ids';
import { content } from '@/content';
import { AGES } from '@/visuals/ages';
import { MANIFEST } from '@/visuals/manifest';
import { createArtProvider, type VisualsArtProvider } from '@/visuals/provider';
import { CLIP_TIMING } from '@/visuals/style';

export const title = 'Cosmetics bench (A18.9.4)';

const W = 1280;
const H = 600;
const GROUND = 500;

const PLAYER: SideLook = {
  baseFlag: 'baseFlag.mammoth',
  nationalFlag: 'nationalFlag.dk',
  baseSkins: { stone: 'baseSkin.frost_cave', bronze: 'baseSkin.gilded_ziggurat', medieval: 'baseSkin.rose_keep', future: 'baseSkin.midnight_neon', cosmic: 'baseSkin.nebula_ark' },
  decorations: ['decoration.lion_statue', 'decoration.olive_tree', 'decoration.fire_bowl'],
};
const FOE: SideLook = {
  baseFlag: 'baseFlag.cogwheel',
  nationalFlag: null,
  baseSkins: { stone: 'baseSkin.mossy_den', industrial: 'baseSkin.copper_foundry', modern: 'baseSkin.desert_bunker' },
  decorations: ['decoration.iron_brazier', 'decoration.star_trophy', 'decoration.shield_rack'],
};

interface Bench {
  reset(o?: { age?: AgeId; zoom?: number }): Promise<void>;
  look(side: 0 | 1, look: SideLook): Promise<void>;
  evolve(): void;
  hit(side: 0 | 1): void;
  collapse(side: 0 | 1): void;
  step(ms: number): void;
  ready: boolean;
}

export default function CosmeticsBench() {
  const host = useRef<HTMLDivElement>(null);
  const [age, setAge] = useState<AgeId>('stone');
  const [nation, setNation] = useState('nationalFlag.dk');
  const bench = useRef<Bench | null>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return undefined;
    const app = new Application();
    let disposed = false;
    let art: VisualsArtProvider | null = null;
    let opts = { age: 'stone' as AgeId, zoom: 1 };
    const looks: [SideLook, SideLook] = [PLAYER, FOE];
    let scene: { bases: BaseView[]; dressings: BaseDressingView[]; update(dt: number): void; destroy(): void } | null = null;

    const build = async (): Promise<void> => {
      scene?.destroy();
      scene = null;
      if (!art) {
        art = createArtProvider({ manifest: MANIFEST, quality: 'high', teamPreset: 'default', dpr: window.devicePixelRatio || 1 });
        await art.preload([...AGES]);
      }
      if (disposed) return;
      const a = art;
      const root = new Container();
      root.scale.set(opts.zoom);
      const lane = (W / opts.zoom) - 420;
      root.position.set(200 * opts.zoom, GROUND);
      app.stage.addChild(root);
      const backdrop = a.createBackdrop({ left: opts.age, right: opts.age, arena: 'tar_pits' });
      (backdrop as unknown as { setView?: (l: number, w: number, g: number) => void }).setView?.(-200, W / opts.zoom, GROUND / opts.zoom);
      root.addChild(backdrop.root);
      const bases: BaseView[] = [];
      const dressings: BaseDressingView[] = [];
      for (const side of [0, 1] as const) {
        const base = a.createBase({ age: opts.age, side, teamPreset: 'default' });
        base.root.position.set(side === 0 ? 0 : lane, 0);
        root.addChild(base.root);
        const d = a.createBaseDressing({ age: opts.age, side, look: looks[side], teamPreset: 'default', base });
        bases.push(base);
        dressings.push(d);
      }
      scene = {
        bases,
        dressings,
        update(dt) {
          backdrop.update(dt);
          for (const b of bases) b.update(dt);
          for (const d of dressings) d.update(dt);
        },
        destroy() {
          for (const d of dressings) d.destroy();
          for (const b of bases) b.destroy();
          backdrop.destroy();
          root.destroy({ children: true });
        },
      };
      for (let t = 0; t < 800; t += 16) scene.update(16);
      app.render();
    };

    const b: Bench = {
      ready: false,
      async reset(o) {
        opts = { ...opts, ...o };
        await build();
      },
      async look(side, look) {
        looks[side] = look;
        await build();
      },
      evolve() {
        const next = AGES[AGES.indexOf(opts.age) + 1];
        if (!next || !scene) return;
        for (const x of scene.bases) x.morphTo(next, CLIP_TIMING.baseMorphMs);
        for (const x of scene.dressings) x.setAge(next, CLIP_TIMING.baseMorphMs);
        opts = { ...opts, age: next };
        setAge(next);
      },
      hit(side) {
        scene?.bases[side]?.hit();
        scene?.dressings[side]?.hit();
      },
      collapse(side) {
        scene?.bases[side]?.collapse();
        scene?.dressings[side]?.collapse();
      },
      step(ms) {
        for (let t = 0; t < ms; t += 16) scene?.update(Math.min(16, ms - t));
        app.render();
      },
    };
    bench.current = b;
    (window as unknown as { __cosmetics: Bench }).__cosmetics = b;

    void (async () => {
      await app.init({ width: W, height: H, background: 0x1b1a2e, antialias: true, resolution: window.devicePixelRatio || 1, autoDensity: true });
      if (disposed) return;
      el.appendChild(app.canvas);
      await build();
      app.ticker.add((tk) => scene?.update(tk.deltaMS));
      b.ready = true;
    })();
    return () => {
      disposed = true;
      scene?.destroy();
      app.destroy(true);
    };
  }, []);

  const nations = content.cosmetics.collections.items.filter((x) => x.collection === 'nationalFlag');
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0d0b1c', color: '#f4ecd8', font: '12px ui-monospace, Menlo, monospace', overflow: 'auto' }}>
      <div style={{ display: 'flex', gap: '8px', padding: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <b>Cosmetics bench</b>
        <select value={age} onChange={(e) => void bench.current?.reset({ age: (e.currentTarget as HTMLSelectElement).value as AgeId }).then(() => setAge((e.currentTarget as HTMLSelectElement).value as AgeId))}>
          {AGES.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select
          value={nation}
          onChange={(e) => {
            const key = (e.currentTarget as HTMLSelectElement).value;
            setNation(key);
            void bench.current?.look(0, { ...PLAYER, nationalFlag: key });
          }}
        >
          {nations.map((x) => (
            <option key={x.id} value={`nationalFlag.${x.id}`}>
              {x.country}
            </option>
          ))}
        </select>
        <button onClick={() => bench.current?.evolve()}>evolve</button>
        <button onClick={() => bench.current?.hit(0)}>hit left</button>
        <button onClick={() => bench.current?.hit(1)}>hit right</button>
        <button onClick={() => bench.current?.collapse(1)}>collapse right</button>
        <button onClick={() => void bench.current?.reset()}>reset</button>
      </div>
      <div ref={host} data-testid="cosmetics-bench" />
    </div>
  );
}
