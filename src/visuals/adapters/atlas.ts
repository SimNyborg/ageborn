/**
 * `AtlasAnimView` tier (DESIGN B5 "Later tiers"): AssetPack atlases built from `assets-src/**{tps}`
 * and loaded with Pixi Assets bundles.
 *
 * STUB. The interface is final so a unit can move to sprite sheets by editing its manifest entry:
 *
 *   'unit.bonker': {
 *     kind: 'atlas', source: 'units/bonker',            // Assets bundle / spritesheet alias
 *     anchors, heightLu,                                 // keep the procedural values (same pivots)
 *     team: { kind: 'mask', maskTextures: ['bonker_team'] },  // per-part masks tinted by team colour
 *     clips: { idle: { kind: 'atlas', ref: 'bonker_idle', durationMs: 1200, loop: true }, ... },
 *     events: { attack: { impactAt: 0.55 } },           // frame of impact / clip length
 *   }
 *
 * Until the tier is implemented `available` is false and the provider draws these entries with the
 * placeholder tier (logging once per visual id in dev), so a half-migrated manifest still runs.
 */
import type { BackdropView, BaseView, EffectView, TurretView, UnitView } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import type { BackdropRequest, BaseRequest, EffectRequest, PortraitRequest, ViewRequest, VisualAdapter } from './types';

function notYet(what: string): never {
  throw new Error(`Atlas tier not implemented yet (${what}); the provider falls back to placeholders.`);
}

export class AtlasAdapter implements VisualAdapter {
  readonly kind = 'atlas' as const;
  readonly available = false;

  async preload(_ages: AgeId[]): Promise<void> {
    // Later: Assets.loadBundle(`age-${age}`) per age.
  }

  createUnit(r: ViewRequest): UnitView {
    return notYet(`unit ${r.key}`);
  }

  createTurret(r: ViewRequest): TurretView {
    return notYet(`turret ${r.key}`);
  }

  createBase(r: BaseRequest): BaseView {
    return notYet(`base ${r.key}`);
  }

  createBackdrop(r: BackdropRequest): BackdropView {
    return notYet(`backdrop ${r.left.def.source}`);
  }

  createProjectile(r: EffectRequest): EffectView {
    return notYet(`projectile ${r.key}`);
  }

  createEffect(r: EffectRequest): EffectView {
    return notYet(`effect ${r.key}`);
  }

  async portrait(r: PortraitRequest): Promise<string> {
    return notYet(`portrait ${r.key}`);
  }
}
