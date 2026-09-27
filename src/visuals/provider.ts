/**
 * The `ArtProvider` implementation (DESIGN B5): resolves visual ids (plus skins) through the
 * manifest and routes each request to the adapter of the entry's `kind`. Unknown ids and tiers that
 * are not built yet fall back to the placeholder tier, so a match never crashes on missing art.
 *
 * `?art=placeholder|procedural|atlas` forces a tier for comparison (`artOverrideFromUrl`).
 */
import type { ArtProvider, BackdropView, BaseView, EffectView, TurretView, UnitView, VisualDef } from '@/contracts/art';
import type { AgeId, CardId, EffectId, Foil, Side, SkinId, TeamPreset, VisualId } from '@/contracts/ids';
import { parseSkinnedVisualId, skinnedVisualId } from '@/core/ids';
import { AtlasAdapter } from './adapters/atlas';
import type { BakeStats } from './bake';
import { PlaceholderAdapter } from './adapters/placeholder';
import { ProceduralAdapter } from './adapters/procedural';
import { SpineAdapter } from './adapters/spine';
import type { ViewKind, VisualAdapter, VisualKind } from './adapters/types';
import { AGES } from './ages';
import { arenaId } from './backdrops/ground';
import { MANIFEST, type VisualManifest } from './manifest';
import { STYLE } from './style';

export interface ArtProviderOptions {
  manifest?: VisualManifest;
  /** Force one tier for every visual (`?art=`). */
  force?: VisualKind | null;
  /** Graphics preset (B6): Lite bakes at 1x, drops shadows, auras and the mid parallax layer. */
  quality?: 'high' | 'lite';
  /** Device pixel ratio (capped at 2; B16). */
  dpr?: number;
  /** World scale the atlas is baked for, in px per lu at DPR 1 (default 1.25, a 1,950 px wide lane). */
  worldPxPerLu?: number;
  /** Team preset for effects and projectiles (they take no preset argument in the contract). */
  teamPreset?: TeamPreset;
  /** Dev logging of fallbacks. */
  warn?: (msg: string) => void;
}

/** Reads `?art=placeholder|procedural|atlas|spine` (DESIGN B5). */
export function artOverrideFromUrl(search: string): VisualKind | null {
  const v = new URLSearchParams(search).get('art');
  return v === 'placeholder' || v === 'procedural' || v === 'atlas' || v === 'spine' ? v : null;
}

let seedCounter = 1;

export class VisualsArtProvider implements ArtProvider {
  readonly manifest: VisualManifest;
  readonly procedural: ProceduralAdapter;
  /** The sprite-sheet tier (loads every 'atlas' manifest entry on preload). */
  readonly atlas: AtlasAdapter;
  readonly placeholder = new PlaceholderAdapter();
  private readonly adapters: Record<VisualKind, VisualAdapter>;
  private readonly portraits = new Map<string, Promise<string>>();
  private readonly warned = new Set<string>();
  private preset: TeamPreset;
  readonly force: VisualKind | null;
  readonly quality: 'high' | 'lite';

  constructor(o: ArtProviderOptions = {}) {
    this.manifest = o.manifest ?? MANIFEST;
    this.force = o.force ?? null;
    this.quality = o.quality ?? 'high';
    this.preset = o.teamPreset ?? 'default';
    const dpr = this.quality === 'lite' ? 1 : Math.min(2, Math.max(1, o.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)));
    this.procedural = new ProceduralAdapter({ pxPerLu: (o.worldPxPerLu ?? 1.25) * dpr, quality: this.quality, teamPreset: () => this.preset });
    this.atlas = new AtlasAdapter({ entries: () => Object.values(this.manifest), decor: this.procedural.baker });
    this.adapters = { placeholder: this.placeholder, procedural: this.procedural, atlas: this.atlas, spine: new SpineAdapter() };
    this.warn = o.warn ?? ((m) => console.warn(m));
  }

  private readonly warn: (msg: string) => void;

  /** Changes the preset used by effects and projectiles (units take it per call). */
  setTeamPreset(p: TeamPreset): void {
    this.preset = p;
  }

  get teamPreset(): TeamPreset {
    return this.preset;
  }

  /** Manifest entry for a visual id plus optional skin (falls back to the unskinned entry). */
  resolve(visualId: VisualId, skin?: SkinId): { key: string; def: VisualDef } | undefined {
    const key = skinnedVisualId(visualId, skin);
    const def = this.manifest[key];
    if (def) return { key, def };
    if (skin) {
      this.once(`skin:${key}`, `[visuals] no skin entry "${key}", using "${visualId}"`);
      const base = this.manifest[visualId];
      if (base) return { key: visualId, def: base };
    }
    return undefined;
  }

  /**
   * The projectile a unit visual shoots: skins may override it (A5.8); otherwise the content's
   * attack projectile id (`fallback`) is used.
   */
  projectileVisualFor(unitVisualId: VisualId, skin: SkinId | undefined, fallback: VisualId): VisualId {
    return this.resolve(unitVisualId, skin)?.def.projectileVisualId ?? fallback;
  }

  private once(key: string, msg: string): void {
    if (this.warned.has(key)) return;
    this.warned.add(key);
    this.warn(msg);
  }

  private adapterFor(key: string, def: VisualDef | undefined, what: ViewKind): VisualAdapter {
    const kind = this.force ?? def?.kind ?? 'placeholder';
    const a = this.adapters[kind];
    if (a.available && def && (a.canDraw?.(what, def) ?? true)) return a;
    if (def) this.once(`tier:${key}`, `[visuals] "${key}" wants the ${kind} tier, which cannot draw it (yet); using placeholders`);
    return this.placeholder;
  }

  private missing(id: string): VisualDef {
    this.once(`missing:${id}`, `[visuals] unknown visual "${id}", drawing a placeholder`);
    return {
      kind: 'placeholder',
      source: id,
      anchors: { feet: { x: 0, y: 0 }, head: { x: 0, y: -68 }, muzzle: { x: 10, y: -36 }, hitCenter: { x: 0, y: -34 } },
      heightLu: STYLE.heightInfantryLu,
      team: { kind: 'zones', zones: [] },
      clips: {},
      events: { attack: { impactAt: 0.5 } },
    };
  }

  async preload(ages: AgeId[]): Promise<void> {
    const kinds = new Set<VisualKind>([this.force ?? 'procedural', ...Object.values(this.manifest).map((d) => d.kind)]);
    for (const k of kinds) {
      const a = this.adapters[k];
      if (a.available) await a.preload(ages);
    }
  }

  createUnit(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): UnitView {
    const r = this.resolve(o.visualId, o.skin);
    const def = r?.def ?? this.missing(o.visualId);
    const key = r?.key ?? o.visualId;
    return this.adapterFor(key, r?.def, 'unit').createUnit({ key, def, side: o.side, teamPreset: o.teamPreset, seed: seedCounter++ });
  }

  createTurret(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): TurretView {
    const r = this.resolve(o.visualId, o.skin);
    const def = r?.def ?? this.missing(o.visualId);
    const key = r?.key ?? o.visualId;
    return this.adapterFor(key, r?.def, 'turret').createTurret({ key, def, side: o.side, teamPreset: o.teamPreset, seed: seedCounter++ });
  }

  createBase(o: { age: AgeId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): BaseView {
    const skins = new Map<AgeId, SkinId>();
    if (o.skin) skins.set(o.age, o.skin);
    const resolveAge = (age: AgeId): { key: string; def: VisualDef } | undefined => this.resolve(`base.${age}`, skins.get(age));
    const r = resolveAge(o.age);
    const def = r?.def ?? this.missing(`base.${o.age}`);
    const key = r?.key ?? `base.${o.age}`;
    return this.adapterFor(key, r?.def, 'base').createBase({ key, def, side: o.side, teamPreset: o.teamPreset, seed: seedCounter++, age: o.age, skin: o.skin, resolveAge });
  }

  createBackdrop(o: { left: AgeId; right: AgeId; arena: string }): BackdropView {
    const L = this.resolve(`backdrop.${o.left}`);
    const R = this.resolve(`backdrop.${o.right}`);
    const groundKey = `ground.${arenaId(o.arena)}`;
    const G = this.resolve(groundKey);
    const req = {
      left: { age: o.left, def: L?.def ?? this.missing(`backdrop.${o.left}`) },
      right: { age: o.right, def: R?.def ?? this.missing(`backdrop.${o.right}`) },
      ground: { key: groundKey, def: G?.def ?? this.missing(groundKey) },
      arena: o.arena,
      seed: seedCounter++,
    };
    return this.adapterFor(`backdrop.${o.left}`, L?.def, 'backdrop').createBackdrop(req);
  }

  createProjectile(visualId: VisualId, side: Side): EffectView {
    const r = this.resolve(visualId);
    const def = r?.def ?? this.missing(visualId);
    return this.adapterFor(visualId, r?.def, 'projectile').createProjectile({ key: visualId, def, side, options: {}, seed: seedCounter++, teamPreset: this.preset });
  }

  createEffect(effectId: EffectId, o?: Record<string, number>): EffectView {
    const r = this.resolve(effectId);
    const def = r?.def ?? this.missing(effectId);
    const side: Side = o?.['side'] === 1 ? 1 : 0;
    return this.adapterFor(effectId, r?.def, 'effect').createEffect({ key: effectId, def, side, options: o ?? {}, seed: seedCounter++, teamPreset: this.preset });
  }

  /** Card id → visual id: units, turrets and powers share one id space; base and icon ids pass through. */
  visualIdForCard(card: CardId): VisualId {
    if (card.includes('.')) return card;
    for (const prefix of ['unit.', 'turret.', 'power.']) if (this.manifest[`${prefix}${card}`]) return `${prefix}${card}`;
    return `unit.${card}`;
  }

  /**
   * Portrait data URL, cached by (card, skin, foil, size, side, plate). `plate: false` (an additive
   * option requested by WP9, docs/requests/wp9-transparent-portraits.md) leaves the background
   * transparent so the UI can draw silhouettes of unowned cards.
   */
  portrait(o: { card: CardId; skin?: SkinId; foil?: Foil; size: number; side?: Side; plate?: boolean }): Promise<string> {
    const visualId = this.visualIdForCard(o.card);
    const cacheKey = `${skinnedVisualId(visualId, o.skin)}|${o.foil ?? 'none'}|${o.size}|${o.side ?? 0}|${o.plate === false ? 'bare' : 'plate'}`;
    const hit = this.portraits.get(cacheKey);
    if (hit) return hit;
    const r = this.resolve(visualId, o.skin);
    const def = r?.def ?? this.missing(visualId);
    const key = r?.key ?? visualId;
    const p = this.adapterFor(key, r?.def, 'portrait')
      .portrait({ key, def, size: o.size, foil: o.foil ?? 'none', side: o.side ?? 0, plate: o.plate !== false })
      .catch(() => '');
    this.portraits.set(cacheKey, p);
    return p;
  }

  /** Bake statistics for the gallery and budget checks. */
  stats(): { bake: BakeStats; preloads: ProceduralAdapter['preloadMs']; backdropMs: number } {
    return { bake: this.procedural.baker.stats, preloads: this.procedural.preloadMs, backdropMs: this.procedural.backdrops.bakeMs };
  }
}

export function createArtProvider(o: ArtProviderOptions = {}): VisualsArtProvider {
  return new VisualsArtProvider(o);
}

/** All ages, in order (handy for `preload`). */
export const ALL_AGES: readonly AgeId[] = AGES;

export { parseSkinnedVisualId };
