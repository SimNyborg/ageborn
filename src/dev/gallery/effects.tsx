/**
 * Effects section: every A14.1 effect id and every projectile, replaying in place. Power effects
 * (zones of 300-500 lu) and screen overlays get wider cells.
 */
import { Container, Graphics, Text } from 'pixi.js';
import type { EffectView } from '@/contracts/art';
import type { Side } from '@/contracts/ids';
import { FX_RECIPES, PROJECTILE_RECIPES, type FxRecipe } from '@/visuals/effects/recipes';
import type { Scene, StageContext } from './stage';

const WIDE = new Set([
  'fx.telegraph_zone',
  'fx.aurochs',
  'fx.meteor',
  'fx.arrow_rain',
  'fx.decree_glow',
  'fx.cannonball_rain',
  'fx.plane_bomber',
  'fx.parachute',
  'fx.orbital_beam',
  'fx.nanite_swarm',
  'fx.evolve_pillar',
  'fx.last_stand_wave',
  'fx.overdrive_frame',
  'fx.siege_vignette',
  'fx.smoke_cloud',
  'fx.beam_laser',
  'fx.beam_rail',
  'fx.arc_chain',
  'fx.heal_beam',
  'fx.tongue',
  // A17.12
  'fx.sun_beam',
  'fx.gorgon_gaze',
  'fx.tesla_arc',
  'fx.beam_void',
  'fx.beam_ion',
  'fx.beam_tachyon',
  'fx.tidal_wave',
  'fx.aegis_glow',
  'fx.iron_horse',
  'fx.zeppelin',
  'fx.star_shard_rain',
  'fx.warp_portal',
]);

/** Effects stretched from the source to a target (`toX`, `toY`). */
const BEAMS = new Set(['fx.heal_beam', 'fx.arc_chain', 'fx.tongue', 'fx.sun_beam', 'fx.gorgon_gaze', 'fx.tesla_arc']);
const isBeam = (id: string): boolean => id.startsWith('fx.beam') || BEAMS.has(id);
/** Effects that run across the zone from one end (`distance` or `zone` along `dir`). */
const RUNS = new Set(['fx.aurochs', 'fx.plane_bomber', 'fx.iron_horse']);

/** Options the battle view would pass for an effect (sizes in lu; beam targets in the parent's space). */
function optionsFor(r: FxRecipe, side: Side, cellW: number, cellH: number, at: { x: number; y: number }): Record<string, number> {
  const o: Record<string, number> = { side, dir: side === 0 ? 1 : -1, radius: 40, zone: 300, width: 300, height: 160, length: 160, durationMs: 1400, distance: 260, speed: 400, scale: 1 };
  if (r.screen) {
    o['width'] = cellW - 20;
    o['height'] = cellH - 40;
  }
  if (isBeam(r.id) || r.id === 'fx.pitch_pour') {
    o['toX'] = at.x + (side === 0 ? 1 : -1) * (r.id === 'fx.pitch_pour' ? 40 : 300);
    o['toY'] = at.y + (r.id === 'fx.pitch_pour' ? 40 : 0);
  }
  return o;
}

const LABEL = { fontFamily: 'monospace', fontSize: 10, fill: 0x2a2530 };

export function buildEffects(ctx: StageContext, o: { side: Side; zoom: number; filter: string }): Scene {
  const { root, art, width } = ctx;
  const world = new Container();
  world.scale.set(o.zoom);
  root.addChild(world);
  interface Cell {
    make: () => EffectView;
    at: { x: number; y: number };
    to?: { x: number; y: number };
    travel?: number;
    arc?: boolean;
    view: EffectView | null;
    wait: number;
    opts?: Record<string, number>;
    loops: boolean;
    elapsed: number;
  }
  const cells: Cell[] = [];
  const pad = 12;
  let x = pad;
  let y = pad;
  let rowH = 0;
  const maxW = width / o.zoom - pad;
  const place = (w: number, h: number, label: string): { x: number; y: number } => {
    if (x + w > maxW && x > pad) {
      x = pad;
      y += rowH + 8;
      rowH = 0;
    }
    world.addChild(new Graphics().roundRect(x, y, w, h, 6).fill({ color: 0x3a3656, alpha: 0.85 }));
    const t = new Text({ text: label, style: { ...LABEL, fill: 0xf4ecd8 } });
    t.position.set(x + 5, y + h - 15);
    world.addChild(t);
    const at = { x, y };
    x += w + 8;
    rowH = Math.max(rowH, h);
    return at;
  };
  const f = o.filter.trim();
  for (const r of FX_RECIPES) {
    if (f && !r.id.includes(f)) continue;
    const wide = WIDE.has(r.id);
    const w = wide ? 460 : 150;
    const h = wide ? 250 : 130;
    const c = place(w, h, r.id);
    const directional = isBeam(r.id) || RUNS.has(r.id);
    const cx = r.screen ? c.x + 10 : wide && directional ? c.x + (o.side === 0 ? 70 : w - 70) : c.x + w / 2;
    const cy = r.screen ? c.y + 10 : c.y + h - 40;
    const fx = RUNS.has(r.id) ? (o.side === 0 ? c.x + 20 : c.x + w - 20) : cx;
    const beam = isBeam(r.id) && r.id !== 'fx.tongue';
    const opts = optionsFor(r, o.side, w, h, { x: fx, y: cy - (beam ? 40 : 0) });
    cells.push({ make: () => art.createEffect(r.id, opts), at: { x: fx, y: beam ? cy - 40 : cy }, view: null, wait: 0, opts, loops: r.loops ?? false, elapsed: 0 });
  }
  x = pad;
  y += rowH + 24;
  rowH = 0;
  for (const p of PROJECTILE_RECIPES) {
    if (f && !p.id.includes(f)) continue;
    const c = place(300, 90, p.id);
    const arc = p.id === 'proj.boulder' || p.id === 'proj.lob' || p.id === 'proj.plasma_mortar' || p.id === 'proj.bomb' || p.id === 'proj.cannonball';
    const from = { x: o.side === 0 ? c.x + 20 : c.x + 280, y: c.y + 60 };
    const to = { x: o.side === 0 ? c.x + 280 : c.x + 20, y: c.y + 60 };
    cells.push({ make: () => art.createProjectile(p.id, o.side), at: from, to, travel: arc ? 900 : 600, arc, view: null, wait: 0, loops: false, elapsed: 0 });
  }
  const needed = (y + rowH + pad) * o.zoom;
  if (needed > ctx.app.screen.height) ctx.app.renderer.resize(ctx.app.screen.width, needed);
  const start = (c: Cell): void => {
    c.view?.destroy();
    const v = c.make();
    world.addChild(v.root);
    if (c.to) v.fly(c.at, c.to, c.travel ?? 600, c.arc ?? false);
    else v.playAt(c.at, c.opts);
    c.view = v;
    c.elapsed = 0;
  };
  for (const c of cells) start(c);
  return {
    update(dt) {
      for (const c of cells) {
        if (!c.view) continue;
        c.view.update(dt);
        c.elapsed += dt;
        const over = c.view.done || (c.loops && c.elapsed > (c.opts?.['durationMs'] ?? 1400) + 200);
        if (over) {
          c.wait += dt;
          if (c.wait > 350) {
            c.wait = 0;
            start(c);
          }
        }
      }
    },
    destroy() {
      for (const c of cells) c.view?.destroy();
      world.destroy({ children: true });
    },
  };
}
