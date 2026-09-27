/**
 * `ProceduralPuppetView` tier (DESIGN B5 "Procedural v1 (tier 0)"): SVG part libraries baked to a
 * runtime atlas, rendered as sprites in a rig per visual and animated by keyframe clips.
 *
 * Ages 0-1 bake at boot (`preload(['stone', 'medieval'])`, budget 400 ms, B16); ages 2-4 bake later
 * in idle time (`preload` slices the work so the menu stays responsive).
 */
import type { BackdropView, BaseView, EffectView, TurretView, UnitView } from '@/contracts/art';
import type { AgeId, Side } from '@/contracts/ids';
import { PartBaker } from '../bake';
import { FX_RECIPE_BY_ID, PROJECTILE_BY_ID } from '../effects/recipes';
import { BASE_PUPPETS, puppetById, TURRET_PUPPETS, UNIT_PUPPETS } from '../library';
import { getPart } from '../parts/registry';
import { renderPortrait } from '../portraits';
import { teamColor, teamStripes, TRIM_COLORS } from '../palette';
import { FX_ZONES } from '../effects/sprites';
import { STYLE } from '../style';
import type { BasePuppet } from '../rigs/base';
import type { TurretPuppet } from '../rigs/turret';
import { SKIN_PUPPETS } from '../skins';
import type { PartDef, PuppetDef } from '../types';
import { BackdropTextures, ProceduralBackdropView } from './procedural/backdropView';
import { ProceduralBaseView } from './procedural/baseView';
import { ProceduralEffectView } from './procedural/effectView';
import { PropPool } from './procedural/shared';
import { ProceduralTurretView } from './procedural/turretView';
import { ProceduralUnitView } from './procedural/unitView';
import type { BackdropRequest, BaseRequest, EffectRequest, PortraitRequest, ViewRequest, VisualAdapter } from './types';

export interface ProceduralOptions {
  /** Pixels per lu of the runtime atlas (world scale x min(devicePixelRatio, 2); 1x in Lite). */
  pxPerLu: number;
  quality: 'high' | 'lite';
  /** Current team preset for effects and projectiles (createEffect has no preset argument). */
  teamPreset: () => import('@/contracts/ids').TeamPreset;
}

/** Budget slice for idle-time baking (ms). */
const SLICE_MS = 8;
/** Ages baked synchronously at boot (DESIGN B5, B16). */
export const BOOT_AGES: readonly AgeId[] = ['stone', 'medieval'];
const SHARED_SPRITES = [
  'shared.ring.circle',
  'shared.ring.diamond',
  'shared.shadow',
  'icon.role.infantry',
  'icon.role.ranged',
  'icon.role.heavy',
  'icon.role.antiArmor',
  'icon.role.support',
  'icon.role.epic',
  'icon.role.legendary',
  'trim.bronze',
  'trim.silver',
  'trim.gold',
  'fx.p.dust',
  'fx.p.spark',
  'fx.p.smoke',
  'fx.p.star',
  'fx.p.glow',
  'fx.p.disc',
  'fx.p.ring',
  'fx.p.flash',
  'fx.p.beam',
  'fx.p.chunk',
];
const SHARED_SPRITE_ZONES = { ...FX_ZONES, trim_bronze: TRIM_COLORS.bronze, trim_silver: TRIM_COLORS.silver, trim_gold: TRIM_COLORS.gold };

export class ProceduralAdapter implements VisualAdapter {
  readonly kind = 'procedural' as const;
  readonly available = true;
  readonly baker: PartBaker;
  readonly props = new PropPool();
  readonly backdrops: BackdropTextures;
  readonly bakedAges = new Set<AgeId>();
  /** Time spent in `preload` per age list (ms), for the gallery's budget check. */
  readonly preloadMs: { ages: AgeId[]; ms: number; wallMs: number; parts: number }[] = [];

  constructor(private readonly o: ProceduralOptions) {
    this.baker = new PartBaker({ pxPerLu: o.pxPerLu });
    this.backdrops = new BackdropTextures(o.quality);
  }

  /** Every (part, palette, tone) a set of ages needs, for baking ahead of time. */
  bakeListFor(ages: readonly AgeId[]): { part: PartDef; puppet: PuppetDef; tone: number }[] {
    const set = new Set(ages);
    const puppets: PuppetDef[] = [
      ...UNIT_PUPPETS.filter((p) => p.age && set.has(p.age)),
      ...TURRET_PUPPETS.filter((p) => p.age && set.has(p.age)),
      ...(Object.values(BASE_PUPPETS) as BasePuppet[]).filter((p) => p.age && set.has(p.age)),
      ...SKIN_PUPPETS.filter((p) => p.age && set.has(p.age)),
    ];
    const out: { part: PartDef; puppet: PuppetDef; tone: number }[] = [];
    for (const puppet of puppets) {
      for (const s of puppet.slots) {
        const part = getPart(s.part);
        if (part) out.push({ part, puppet, tone: s.tone === 'back' ? STYLE.backTonePct : 0 });
      }
    }
    return out;
  }

  async preload(ages: AgeId[]): Promise<void> {
    const todo = ages.filter((a) => !this.bakedAges.has(a));
    if (todo.length === 0) return;
    const t0 = now();
    const before = this.baker.stats.parts;
    let cpu = 0;
    // Boot ages bake in one go (B16: ages 0-1 within 400 ms at boot). Later ages bake in idle-time
    // slices so the menu or tutorial keeps its frame rate.
    const boot = todo.filter((a) => BOOT_AGES.includes(a));
    const lazy = todo.filter((a) => !BOOT_AGES.includes(a));
    if (boot.length) {
      const s0 = now();
      for (const e of this.bakeListFor(boot)) this.baker.get(e.part, e.puppet.palette, e.tone);
      this.bakeSprites();
      cpu += now() - s0;
    }
    const list = this.bakeListFor(lazy);
    let i = 0;
    while (i < list.length) {
      const sliceStart = now();
      while (i < list.length && now() - sliceStart < SLICE_MS) {
        const e = list[i++];
        if (e) this.baker.get(e.part, e.puppet.palette, e.tone);
      }
      cpu += now() - sliceStart;
      if (i < list.length) await idle();
    }
    this.baker.flush();
    for (const a of todo) this.bakedAges.add(a);
    this.preloadMs.push({ ages: todo, ms: cpu, wallMs: now() - t0, parts: this.baker.stats.parts - before });
  }

  /** Shared sprites every battle needs (rings, glyphs, trims, common particles). */
  private bakeSprites(): void {
    for (const id of SHARED_SPRITES) {
      const p = getPart(id);
      if (p) this.baker.get(p, SHARED_SPRITE_ZONES);
    }
  }

  private puppet(r: { def: { source: string }; key: string }): PuppetDef {
    const p = puppetById(r.def.source);
    if (!p) throw new Error(`No procedural source "${r.def.source}" for visual "${r.key}"`);
    return p;
  }

  createUnit(r: ViewRequest): UnitView {
    return new ProceduralUnitView({
      def: r.def,
      puppet: this.puppet(r),
      baker: this.baker,
      side: r.side,
      teamColor: teamColor(r.side, r.teamPreset),
      striped: teamStripes(r.side, r.teamPreset),
      props: this.props,
      quality: this.o.quality,
      seed: r.seed,
    });
  }

  createTurret(r: ViewRequest): TurretView {
    return new ProceduralTurretView({
      def: r.def,
      puppet: this.puppet(r) as TurretPuppet,
      baker: this.baker,
      side: r.side,
      teamColor: teamColor(r.side, r.teamPreset),
      striped: teamStripes(r.side, r.teamPreset),
      seed: r.seed,
    });
  }

  createBase(r: BaseRequest): BaseView {
    return new ProceduralBaseView({
      age: r.age,
      side: r.side,
      teamColor: teamColor(r.side, r.teamPreset),
      striped: teamStripes(r.side, r.teamPreset),
      baker: this.baker,
      seed: r.seed,
      resolve: (age) => {
        const e = r.resolveAge(age);
        if (!e) return undefined;
        const p = puppetById(e.def.source);
        return p ? { def: e.def, puppet: p as BasePuppet } : undefined;
      },
    });
  }

  createBackdrop(r: BackdropRequest): BackdropView {
    return new ProceduralBackdropView({ left: r.left.age, right: r.right.age, arena: r.arena, textures: this.backdrops, baker: this.baker, quality: this.o.quality, seed: r.seed });
  }

  private sideColor = (side: number): number => teamColor(side === 1 ? 1 : (0 as Side), this.o.teamPreset());

  createProjectile(r: EffectRequest): EffectView {
    const projectile = PROJECTILE_BY_ID.get(r.def.source) ?? PROJECTILE_BY_ID.get('proj.rock');
    return new ProceduralEffectView({ baker: this.baker, teamColor: this.sideColor, seed: r.seed, projectile, o: { side: r.side, ...r.options } });
  }

  createEffect(r: EffectRequest): EffectView {
    const recipe = FX_RECIPE_BY_ID.get(r.def.source);
    return new ProceduralEffectView({
      baker: this.baker,
      teamColor: this.sideColor,
      seed: r.seed,
      recipe,
      o: { side: r.side, ...r.options },
      sub: (id, o) => {
        const sub = FX_RECIPE_BY_ID.get(id);
        return sub ? new ProceduralEffectView({ baker: this.baker, teamColor: this.sideColor, seed: r.seed + 1, recipe: sub, o }) : null;
      },
    });
  }

  async portrait(r: PortraitRequest): Promise<string> {
    const p = puppetById(r.def.source);
    if (!p) return '';
    return renderPortrait({ puppet: p, size: r.size, foil: r.foil, teamColor: teamColor(r.side, 'default'), fit: p.legendary && !p.motion.air ? 'bust' : 'full', plate: r.plate });
  }
}

function now(): number {
  return typeof performance !== 'undefined' ? performance.now() : 0;
}

function idle(): Promise<void> {
  return new Promise((resolve) => {
    const ric = (globalThis as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number }).requestIdleCallback;
    if (ric) ric(() => resolve(), { timeout: 50 });
    else setTimeout(resolve, 0);
  });
}
