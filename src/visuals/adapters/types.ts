/**
 * The adapter interface behind `ArtProvider` (DESIGN B5 "ArtProvider picks an adapter by kind").
 *
 * The provider resolves a manifest entry (`VisualDef`) and hands it to the adapter of its `kind`.
 * Every adapter implements the same factories, so one tier can replace another by editing a manifest
 * entry only; tiers can mix in one match (a procedural bonker next to an atlas footman).
 */
import type { BackdropView, BaseView, EffectView, TurretView, UnitView, VisualDef } from '@/contracts/art';
import type { AgeId, Foil, Side, TeamPreset } from '@/contracts/ids';

export type VisualKind = VisualDef['kind'];

export interface ViewRequest {
  /** Manifest key (`unit.bonker@pumpkin_head`). */
  key: string;
  def: VisualDef;
  side: Side;
  teamPreset: TeamPreset;
  seed: number;
}

export interface BaseRequest extends ViewRequest {
  age: AgeId;
  skin?: string;
  /** Resolves the manifest entry of another age's base (for evolve morphs). */
  resolveAge: (age: AgeId) => { key: string; def: VisualDef } | undefined;
}

export interface BackdropRequest {
  left: { age: AgeId; def: VisualDef };
  right: { age: AgeId; def: VisualDef };
  ground: { key: string; def: VisualDef };
  arena: string;
  seed: number;
}

export interface EffectRequest {
  key: string;
  def: VisualDef;
  side: Side;
  options: Record<string, number>;
  seed: number;
  teamPreset: TeamPreset;
}

export interface PortraitRequest {
  key: string;
  def: VisualDef;
  size: number;
  foil: Foil;
  side: Side;
}

export interface VisualAdapter {
  readonly kind: VisualKind;
  /** False for stubs: the provider then falls back to the placeholder tier. */
  readonly available: boolean;
  preload(ages: AgeId[]): Promise<void>;
  createUnit(r: ViewRequest): UnitView;
  createTurret(r: ViewRequest): TurretView;
  createBase(r: BaseRequest): BaseView;
  createBackdrop(r: BackdropRequest): BackdropView;
  createProjectile(r: EffectRequest): EffectView;
  createEffect(r: EffectRequest): EffectView;
  portrait(r: PortraitRequest): Promise<string>;
}
