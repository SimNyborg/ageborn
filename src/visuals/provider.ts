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
import { puppetById } from './library';
import { MANIFEST, PROCEDURAL_MANIFEST, type VisualManifest } from './manifest';
import { STYLE, WORLD } from './style';

export interface ArtProviderOptions {
  manifest?: VisualManifest;
  /** Force one tier for every visual (`?art=`). */
  force?: VisualKind | null;
  /** Graphics preset (B6): Lite bakes at 1x, drops shadows, auras and the mid parallax layer. */
  quality?: 'high' | 'lite';
  /** Device pixel ratio (capped at 2; B16). */
  dpr?: number;
  /**
   * World scale the atlas is baked for, in px per lu at DPR 1. Default: the largest scale the battle
   * can use on this screen (`screenWorldPxPerLu`), at most 1.25 (a 1,950 px wide lane).
   */
  worldPxPerLu?: number;
  /** Team preset for effects and projectiles (they take no preset argument in the contract). */
  teamPreset?: TeamPreset;
  /** Dev logging of fallbacks. */
  warn?: (msg: string) => void;
}

/**
 * Atlas bake scale for a screen (px per lu at DPR 1). The battle fits 1,560 lu into the lane band
 * (DESIGN A2.1, so at most `landscape width / 1,560`), and screens narrower than 900 CSS px can pinch
 * to 1.6x. Baking at that scale draws sprites at about 1:1 and keeps the atlas small on phones, where
 * a fixed 1.25 x DPR 2 bake filled eight 2,048² pages (B16 memory). Clamped to [0.6, 1.25].
 */
export function screenWorldPxPerLu(width: number, height: number): number {
  const landscape = Math.max(width, height);
  if (!(landscape > 0)) return 1.25;
  const zoom = landscape < 900 ? 1.6 : 1;
  return Math.min(1.25, Math.max(0.6, (landscape / WORLD.worldWidthLu) * zoom));
}

/** Reads `?art=placeholder|procedural|atlas|spine` (DESIGN B5). */
export function artOverrideFromUrl(search: string): VisualKind | null {
  const v = new URLSearchParams(search).get('art');
  return v === 'placeholder' || v === 'procedural' || v === 'atlas' || v === 'spine' ? v : null;
}

export class VisualsArtProvider implements ArtProvider {
  readonly manifest: VisualManifest;
  readonly procedural: ProceduralAdapter;
  /** The sprite-sheet tier (loads every 'atlas' manifest entry on preload). */
  readonly atlas: AtlasAdapter;
  readonly placeholder = new PlaceholderAdapter();
  private readonly adapters: Record<VisualKind, VisualAdapter>;
  private readonly portraits = new Map<string, Promise<string>>();
  private readonly warned = new Set<string>();
  /** Cosmetic RNG seeds for new views, per provider so a fresh provider replays identically (gallery `t=` screenshots). */
  private nextSeed = 1;
  private preset: TeamPreset;
  readonly force: VisualKind | null;
  readonly quality: 'high' | 'lite';

  constructor(o: ArtProviderOptions = {}) {
    this.manifest = o.manifest ?? MANIFEST;
    this.force = o.force ?? null;
    this.quality = o.quality ?? 'high';
    this.preset = o.teamPreset ?? 'default';
    const dpr = this.quality === 'lite' ? 1 : Math.min(2, Math.max(1, o.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)));
    const world = o.worldPxPerLu ?? (typeof window !== 'undefined' ? screenWorldPxPerLu(window.innerWidth, window.innerHeight) : 1.25);
    this.procedural = new ProceduralAdapter({ pxPerLu: world * dpr, quality: this.quality, teamPreset: () => this.preset });
    this.atlas = new AtlasAdapter({ entries: () => Object.values(this.manifest), decor: this.procedural.baker, quality: this.quality });
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
    const fb = this.sheetFallback(key, r?.def, 'unit');
    if (fb) return fb.adapter.createUnit({ key, def: fb.def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++ });
    return this.adapterFor(key, r?.def, 'unit').createUnit({ key, def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++ });
  }

  /**
   * A sprite-sheet unit whose sheet is not loaded yet (its age still streaming in) or failed to load
   * is drawn with its procedural puppet instead of a placeholder (B5 fallback). Null when the sheet
   * tier can draw it, when a tier is forced, or when there is no procedural entry.
   */
  private sheetFallback(key: string, def: VisualDef | undefined, what: ViewKind): { adapter: ProceduralAdapter; def: VisualDef } | null {
    if (this.force || !def || def.kind !== 'atlas') return null;
    if (this.atlas.canDraw(what, def)) return null;
    const proc = PROCEDURAL_MANIFEST[key];
    if (!proc || proc.kind !== 'procedural') return null;
    return { adapter: this.procedural, def: proc };
  }

  createTurret(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): TurretView {
    const r = this.resolve(o.visualId, o.skin);
    const def = r?.def ?? this.missing(o.visualId);
    const key = r?.key ?? o.visualId;
    const fb = this.sheetFallback(key, r?.def, 'turret');
    if (fb) return fb.adapter.createTurret({ key, def: fb.def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++ });
    return this.adapterFor(key, r?.def, 'turret').createTurret({ key, def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++ });
  }

  /**
   * A base skin belongs to one age's base (`base.future@crystal_spire`), but the base view lives
   * through every evolve. So the skin is applied to whichever age has an entry for it: a Stone base
   * created with `crystal_spire` looks plain until it morphs into the Future age, then shows the skin.
   * Ages without an entry for the skin draw their plain base silently.
   */
  createBase(o: { age: AgeId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): BaseView {
    const skin = o.skin;
    const resolveAge = (age: AgeId): { key: string; def: VisualDef } | undefined => {
      const skinned = skin ? skinnedVisualId(`base.${age}`, skin) : null;
      const def = skinned ? this.manifest[skinned] : undefined;
      if (skinned && def) return { key: skinned, def };
      return this.resolve(`base.${age}`);
    };
    if (skin && !AGES.some((a) => this.manifest[skinnedVisualId(`base.${a}`, skin)])) {
      this.once(`skin:base@${skin}`, `[visuals] no base has the skin "${skin}", drawing plain bases`);
    }
    const r = resolveAge(o.age);
    const def = r?.def ?? this.missing(`base.${o.age}`);
    const key = r?.key ?? `base.${o.age}`;
    const fb = this.sheetFallback(key, r?.def, 'base');
    if (fb) {
      // the sheet is not loaded (yet): the procedural base, which morphs through procedural entries
      const procAge = (age: AgeId): { key: string; def: VisualDef } | undefined => {
        const e = resolveAge(age);
        if (!e || e.def.kind !== 'atlas') return e;
        const proc = PROCEDURAL_MANIFEST[e.key];
        return proc ? { key: e.key, def: proc } : undefined;
      };
      return fb.adapter.createBase({ key, def: fb.def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++, age: o.age, skin, resolveAge: procAge });
    }
    return this.adapterFor(key, r?.def, 'base').createBase({ key, def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++, age: o.age, skin, resolveAge });
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
      seed: this.nextSeed++,
    };
    return this.adapterFor(`backdrop.${o.left}`, L?.def, 'backdrop').createBackdrop(req);
  }

  createProjectile(visualId: VisualId, side: Side): EffectView {
    const r = this.resolve(visualId);
    const def = r?.def ?? this.missing(visualId);
    return this.adapterFor(visualId, r?.def, 'projectile').createProjectile({ key: visualId, def, side, options: {}, seed: this.nextSeed++, teamPreset: this.preset });
  }

  createEffect(effectId: EffectId, o?: Record<string, number>): EffectView {
    const r = this.resolve(effectId);
    const def = r?.def ?? this.missing(effectId);
    const side: Side = o?.['side'] === 1 ? 1 : 0;
    return this.adapterFor(effectId, r?.def, 'effect').createEffect({ key: effectId, def, side, options: o ?? {}, seed: this.nextSeed++, teamPreset: this.preset });
  }

  /** Card id → visual id: units, turrets and powers share one id space; base and icon ids pass through. */
  visualIdForCard(card: CardId): VisualId {
    if (card.includes('.')) return card;
    for (const prefix of ['unit.', 'turret.', 'power.']) if (this.manifest[`${prefix}${card}`]) return `${prefix}${card}`;
    return `unit.${card}`;
  }

  /**
   * Portrait data URL, cached by (card, skin, foil, size, side, plate, team preset). `plate: false`
   * (an additive option requested by WP9, docs/requests/wp9-transparent-portraits.md) leaves the
   * background transparent so the UI can draw silhouettes of unowned cards. Team areas use the
   * current colourblind preset (`setTeamPreset`), like the lane.
   */
  portrait(o: { card: CardId; skin?: SkinId; foil?: Foil; size: number; side?: Side; plate?: boolean }): Promise<string> {
    const visualId = this.visualIdForCard(o.card);
    const cacheKey = `${skinnedVisualId(visualId, o.skin)}|${o.foil ?? 'none'}|${o.size}|${o.side ?? 0}|${o.plate === false ? 'bare' : 'plate'}|${this.preset}`;
    const hit = this.portraits.get(cacheKey);
    if (hit) return hit;
    const r = this.resolve(visualId, o.skin);
    const def = r?.def ?? this.missing(visualId);
    const key = r?.key ?? visualId;
    const req = { key, def, size: o.size, foil: o.foil ?? 'none', side: o.side ?? 0, plate: o.plate !== false, teamPreset: this.preset } as const;
    const p = this.portraitAdapter(key, r?.def)
      .then(({ adapter, def: d }) => adapter.portrait({ ...req, def: d }))
      .catch(() => '');
    this.portraits.set(cacheKey, p);
    return p;
  }

  /**
   * Which adapter draws a portrait. A tier that cannot draw portraits yet (sprite sheets, Spine) keeps
   * the procedural drawing of the same visual id while one exists, so moving a unit to sprite sheets
   * by its manifest entry does not turn its card art into a placeholder. `?art=` still forces a tier.
   */
  private async portraitAdapter(key: string, def: VisualDef | undefined): Promise<{ adapter: VisualAdapter; def: VisualDef }> {
    const kind = this.force ?? def?.kind ?? 'placeholder';
    const own = this.adapters[kind];
    if (def && own.available && (own.canDraw?.('portrait', def) ?? true)) return { adapter: own, def };
    if (def && !this.force && kind !== 'placeholder' && puppetById(key)) return { adapter: this.procedural, def: { ...def, source: key } };
    return { adapter: this.adapterFor(key, def, 'portrait'), def: def ?? this.missing(key) };
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
