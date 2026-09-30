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
  /** `skin`: the half's backdrop skin id when its manifest entry (`backdrop.<age>@<id>`) resolved. */
  left: { age: AgeId; def: VisualDef; skin?: string };
  right: { age: AgeId; def: VisualDef; skin?: string };
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
  /** False: no age plate, transparent background (silhouettes of unowned cards). */
  plate: boolean;
  /** Colourblind preset for the team areas (A11). */
  teamPreset: TeamPreset;
}

/** What the provider is about to create (adapters may support only some, e.g. atlas units). */
export type ViewKind = 'unit' | 'turret' | 'base' | 'backdrop' | 'projectile' | 'effect' | 'portrait';

export interface VisualAdapter {
  readonly kind: VisualKind;
  /** False for stubs: the provider then falls back to the placeholder tier. */
  readonly available: boolean;
  /**
   * Whether this adapter can draw `def` as `what` right now (supported and loaded). Omitted means
   * yes. When it answers no, the provider draws a placeholder and logs once (B5: tiers mix, and a
   * half-migrated manifest still runs).
   */
  canDraw?(what: ViewKind, def: VisualDef): boolean;
  preload(ages: AgeId[]): Promise<void>;
  createUnit(r: ViewRequest): UnitView;
  createTurret(r: ViewRequest): TurretView;
  createBase(r: BaseRequest): BaseView;
  createBackdrop(r: BackdropRequest): BackdropView;
  createProjectile(r: EffectRequest): EffectView;
  createEffect(r: EffectRequest): EffectView;
  portrait(r: PortraitRequest): Promise<string>;
}
