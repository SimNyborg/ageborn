/**
 * `SpineView` tier (DESIGN B5 "Later tiers") via `@esotericsoftware/spine-pixi-v8`.
 *
 * STUB. The interface is final so a unit can move to Spine by editing its manifest entry:
 *
 *   'unit.bonker': {
 *     kind: 'spine', source: 'spine/bonker',             // skeleton + atlas alias
 *     anchors, heightLu,
 *     team: { kind: 'slots', slots: ['team_tunic'] },     // team_* slots tinted with the team colour
 *     clips: { attack: { kind: 'spine', ref: 'attack', durationMs: 620, loop: false }, ... },
 *     events: { attack: { impactAt: 0.55 } },           // or read the Spine "impact" event time
 *   }
 *
 * The sim owns timing: play('attack', { impactAtMs }) must set the track's timeScale so the impact
 * event lands at `impactAtMs` (B5). Until implemented, `available` is false and the provider uses
 * the placeholder tier for these entries. The runtime is not a dependency yet (package.json is
 * WP0's; add it with a request when this tier starts).
 */
import type { BackdropView, BaseView, EffectView, TurretView, UnitView } from '@/contracts/art';
import type { AgeId } from '@/contracts/ids';
import type { BackdropRequest, BaseRequest, EffectRequest, PortraitRequest, ViewRequest, VisualAdapter } from './types';

function notYet(what: string): never {
  throw new Error(`Spine tier not implemented yet (${what}); the provider falls back to placeholders.`);
}

export class SpineAdapter implements VisualAdapter {
  readonly kind = 'spine' as const;
  readonly available = false;

  async preload(_ages: AgeId[]): Promise<void> {}

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
