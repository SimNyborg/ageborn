/**
 * The `ArtProvider` implementation (DESIGN B5): resolves visual ids (plus skins) through the
 * manifest and routes each request to the adapter of the entry's `kind`. Unknown ids and tiers that
 * are not built yet fall back to the placeholder tier, so a match never crashes on missing art.
 *
 * `?art=placeholder|procedural|atlas` forces a tier for comparison (`artOverrideFromUrl`).
 */
import type { ArtProvider, BackdropView, BaseDressingView, BaseView, EffectView, FortView, TurretView, UnitView, VisualDef } from '@/contracts/art';
import type { AgeId, CardId, CosmeticKey, EffectId, Foil, Side, SideLook, SkinId, TeamPreset, VisualId } from '@/contracts/ids';
import { parseSkinnedVisualId, skinnedVisualId } from '@/core/ids';
import { AtlasAdapter, wantsHdSheets, type SheetLease } from './adapters/atlas';
import type { GpuHooks } from './gpuUpload';
import { isBaseSkinSource, isWorldSource, WorldAtlas, worldSourceAge } from './adapters/worldAtlas';
import { renderWorldPortrait } from './adapters/worldPortrait';
import { BASE_SKINS } from './cosmetics/baseSkins';
import { renderSpriteStrip, stripRequest } from './adapters/spriteStrip';
import { AtlasFortView } from './fortViews/atlasFortView';
import { fortSource, type FortKindId } from './forts';
import type { BakeStats } from './bake';
import { PlaceholderAdapter } from './adapters/placeholder';
import { ProceduralAdapter } from './adapters/procedural';
import { SpineAdapter } from './adapters/spine';
import type { ViewKind, VisualAdapter, VisualKind } from './adapters/types';
import { AGES } from './ages';
import { BaseDressing } from './cosmetics/dressing';
import { teamColor } from './palette';
import { arenaId } from './backdrops/ground';
import { puppetById } from './library';
import { MANIFEST, PROCEDURAL_MANIFEST, type VisualManifest } from './manifest';
import { STYLE } from './style';

export interface ArtProviderOptions {
  manifest?: VisualManifest;
  /** Force one tier for every visual (`?art=`). */
  force?: VisualKind | null;
  /** Graphics preset (B6): Lite bakes at 1x, drops shadows, auras and the mid parallax layer. */
  quality?: 'high' | 'lite';
  /** Device pixel ratio (capped at 2; B16). */
  dpr?: number;
  /** Uncapped device pixel ratio for choosing HD unit sheets (default: `dpr`, else the window's). */
  hdDpr?: number;
  /**
   * World scale the atlas is baked for, in px per lu at DPR 1. Default: the largest scale the battle
   * can use on this screen (`screenWorldPxPerLu`), at most 1.25 (a 1,950 px wide lane).
   */
  worldPxPerLu?: number;
  /** Team preset for effects and projectiles (they take no preset argument in the contract). */
  teamPreset?: TeamPreset;
  /** Dev logging of fallbacks. */
  warn?: (msg: string) => void;
  /**
   * `match` (the game, G7 Safari memory): `preload(ages)` loads the ages' turret, base and fort sheets
   * only; unit sheets load per match through `holdArt` (the battle's decks, the next age ahead of an
   * evolve) and unload once nothing holds or draws them. `all` (default; dev pages, the gallery):
   * `preload` loads and keeps every unit sheet of the ages.
   */
  unitSheets?: 'all' | 'match';
  /** The app's renderer (G7): loaded unit sheets go to the GPU and their decoded CPU copies are released. */
  gpu?: GpuHooks;
}

/** A visual an art hold keeps loaded: a unit (with its skin) or a fort (G7, `holdArt`). */
export interface HeldVisual {
  visualId: VisualId;
  skin?: SkinId | null;
}

/**
 * The sheets one match draws (G7): `set` makes `visuals` the wanted ones, loading what is new and
 * releasing the rest (a released sheet unloads a few seconds after nothing holds or draws it); it
 * resolves once every wanted sheet's core has loaded or failed. `release` lets go of everything.
 * Duck-typed for the render layer and the app (no contract change).
 */
export interface ArtHold {
  set(visuals: readonly HeldVisual[]): Promise<void>;
  release(): void;
}

/** How long VS's warm-up keeps a match's opening sheets (the battle's own hold takes over long before). */
export const PREFETCH_HOLD_MS = 30_000;

/**
 * Atlas bake scale for a screen (px per lu at DPR 1): the battle camera's world scale (DESIGN A17.7:
 * phones show 290 lu of height in a 68% lane band, tablets and desktops about 1,100 and 1,400 lu of
 * width) at zoom 1. Baking at that scale draws sprites at about 1:1 and keeps the atlas small on
 * phones, where a fixed 1.25 x DPR 2 bake filled eight 2,048² pages (B16 memory). Clamped to
 * [0.6, 1.25].
 */
export function screenWorldPxPerLu(width: number, height: number): number {
  const landscape = Math.max(width, height);
  const short = Math.min(width, height);
  if (!(landscape > 0) || !(short > 0)) return 1.25;
  const scale = short < 500 ? (short * 0.68) / 290 : Math.min(landscape / (landscape >= 1280 ? 1400 : 1100), (short * 0.64) / 330);
  return Math.min(1.25, Math.max(0.6, scale));
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
  /** Fort sheets (A16.14.8), loaded per age like the world sheets; `fortHd` picks the 2.46 px/lu sheets. */
  readonly forts: WorldAtlas;
  private readonly fortHd: boolean;
  readonly force: VisualKind | null;
  readonly quality: 'high' | 'lite';

  constructor(o: ArtProviderOptions = {}) {
    this.manifest = o.manifest ?? MANIFEST;
    this.force = o.force ?? null;
    this.quality = o.quality ?? 'high';
    this.preset = o.teamPreset ?? 'default';
    const dpr = this.quality === 'lite' ? 1 : Math.min(2, Math.max(1, o.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1)));
    const world = o.worldPxPerLu ?? (typeof window !== 'undefined' ? screenWorldPxPerLu(window.innerWidth, window.innerHeight) : 1.25);
    // Puppets bake ahead only where this tier draws them (a skin, `?art=procedural`); a puppet that just
    // stands in while its sprite sheet streams in bakes on first use (perf audit 2026-10-01).
    let drawn: Set<string> | null = null;
    const bakePuppet = (id: string): boolean => {
      if (this.force === 'procedural') return true;
      if (this.force !== null) return false;
      drawn ??= new Set(Object.values(this.manifest).filter((d) => d.kind === 'procedural').map((d) => d.source));
      return drawn.has(id);
    };
    this.procedural = new ProceduralAdapter({ pxPerLu: world * dpr, quality: this.quality, teamPreset: () => this.preset, bakePuppet });
    const rawDpr = o.dpr ?? (typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1);
    this.atlas = new AtlasAdapter({
      entries: () => Object.values(this.manifest),
      decor: this.procedural.baker,
      quality: this.quality,
      hd: this.quality !== 'lite' && wantsHdSheets(world, o.hdDpr ?? rawDpr),
      lazyUnits: o.unitSheets === 'match',
      ...(o.gpu ? { gpu: o.gpu } : {}),
    });
    this.adapters = { placeholder: this.placeholder, procedural: this.procedural, atlas: this.atlas, spine: new SpineAdapter() };
    this.fortHd = this.quality !== 'lite' && wantsHdSheets(world, o.hdDpr ?? rawDpr);
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    this.forts = new WorldAtlas((s) => (/^(https?:|data:|\/)/.test(s) ? s : `${base}${s}`));
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
    // fort sheets (A16.14.8): Stone's are awaited (every match starts there), the rest stream in
    if (this.force === null || this.force === 'atlas') {
      const want = new Set(ages);
      const now: Promise<unknown>[] = [];
      for (const d of Object.values(this.manifest)) {
        const f = d.kind === 'atlas' ? fortSource(d.source) : null;
        if (!f || !want.has(f.age)) continue;
        const p = this.forts.ensure(this.fortSheetUrl(d.source));
        if (f.age === 'stone') now.push(p);
      }
      await Promise.all(now);
    }
  }

  /** Resolves once every fort sheet of `ages` has loaded (or failed). Dev pages and screenshots use it. */
  async fortSheetsReady(ages: readonly AgeId[]): Promise<void> {
    const want = new Set(ages);
    const all: Promise<unknown>[] = [];
    for (const d of Object.values(this.manifest)) {
      const f = d.kind === 'atlas' ? fortSource(d.source) : null;
      if (f && want.has(f.age)) all.push(this.forts.ensure(this.fortSheetUrl(d.source)));
    }
    await Promise.all(all);
  }

  /** The fort sheet to load for a manifest source (`.hd.json` on dense screens). */
  private fortSheetUrl(source: string): string {
    return this.fortHd ? source.replace(/\.json$/, '.hd.json') : source;
  }

  /**
   * A fort view (A16.14.8): walls, towers, camps and traps from their realistic sheets (a code stand-in
   * while a sheet loads or where none is installed). A tower's crew draws from its unit sheet.
   */
  createFort(o: { visualId: VisualId; side: Side; teamPreset: TeamPreset; kind: FortKindId }): FortView {
    const r = this.resolve(o.visualId);
    const def: VisualDef = r?.def ?? { ...this.missing(o.visualId), heightLu: o.kind === 'trap' ? 24 : o.kind === 'tower' ? 100 : 90 };
    const src = def.kind === 'atlas' && fortSource(def.source) ? def.source : null;
    const age = src ? (fortSource(src)?.age ?? null) : null;
    // the tower crew's unit sheet stays while this fort draws it (G7: never unloaded under a live view)
    let crewHeld: (() => void) | null = null;
    return new AtlasFortView({
      def,
      side: o.side,
      kind: o.kind,
      teamColor: teamColor(o.side, o.teamPreset),
      decor: this.procedural.baker,
      seed: this.nextSeed++,
      sheets: this.forts,
      source: src && (this.force === null || this.force === 'atlas') ? this.fortSheetUrl(src) : null,
      age,
      crewSheet: (visualId) => {
        const c = this.resolve(visualId)?.def;
        const sheet = c && c.kind === 'atlas' ? this.atlas.sheetFor(c.source) : undefined;
        if (sheet && c && !crewHeld) crewHeld = this.atlas.holdSheet(c.source);
        return sheet;
      },
      onDestroy: () => crewHeld?.(),
    });
  }

  /**
   * A hold on the unit sheets one match draws (G7, Safari memory): see {@link ArtHold}. Units resolve
   * with their skins; a fort's sheet is small and stays cached, but its tower crew (a unit sheet, named
   * in the fort sheet's meta) is held with it. Turret and base sheets load per age (`preload`). With a
   * forced tier other than the sheets the hold does nothing.
   */
  holdArt(): ArtHold {
    const leases = new Map<string, SheetLease>();
    let live = true;
    let last: readonly HeldVisual[] = [];
    const sheetsOn = this.force === null || this.force === 'atlas';
    const unitSource = (def: VisualDef | undefined): string | null =>
      def && def.kind === 'atlas' && !isWorldSource(def.source) && !fortSource(def.source) ? def.source : null;
    const set = (visuals: readonly HeldVisual[]): Promise<void> => {
      if (!live || !sheetsOn) return Promise.resolve();
      last = visuals;
      const want = new Set<string>();
      const waits: Promise<unknown>[] = [];
      for (const v of visuals) {
        const def = this.resolve(v.visualId, v.skin ?? undefined)?.def;
        if (!def || def.kind !== 'atlas') continue;
        const unit = unitSource(def);
        if (unit) {
          want.add(unit);
          continue;
        }
        if (!fortSource(def.source)) continue;
        const url = this.fortSheetUrl(def.source);
        const sheet = this.forts.get(url);
        if (!sheet) {
          // the crew is named in the fort sheet: once it is in, the same visuals are held again
          waits.push(
            this.forts.ensure(url).then((s) => {
              if (s && live && last === visuals) return set(visuals);
              return undefined;
            }),
          );
          continue;
        }
        const crew = (sheet.meta as { crew?: { visualId?: string } }).crew?.visualId;
        const src = crew ? unitSource(this.resolve(crew)?.def) : null;
        if (src) want.add(src);
      }
      for (const src of want) if (!leases.has(src)) leases.set(src, this.atlas.lease(src));
      for (const [src, l] of leases) {
        if (want.has(src)) continue;
        l.release();
        leases.delete(src);
      }
      for (const src of want) {
        const l = leases.get(src);
        if (l) waits.push(l.core);
      }
      return Promise.all(waits).then(
        () => undefined,
        () => undefined,
      );
    };
    return {
      set,
      release: () => {
        live = false;
        for (const l of leases.values()) l.release();
        leases.clear();
      },
    };
  }

  /**
   * `hd` (duck-typed, the card detail showcase): draw from the showcase's HD copy of the unit's sheet
   * when `showcaseLease` loaded one (a large stage on a screen whose battle draws the 1x sheets).
   */
  createUnit(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset; hd?: boolean }): UnitView {
    const r = this.resolve(o.visualId, o.skin);
    const def = r?.def ?? this.missing(o.visualId);
    const key = r?.key ?? o.visualId;
    if (o.hd && r && !this.force && this.atlas.canDrawHd(r.def)) return this.atlas.createUnit({ key, def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++, hd: true });
    const fb = this.sheetFallback(key, r?.def, 'unit');
    if (fb) return fb.adapter.createUnit({ key, def: fb.def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++ });
    return this.adapterFor(key, r?.def, 'unit').createUnit({ key, def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++ });
  }

  /**
   * The card detail showcase (docs/decisions.md, "card showcase"): holds the sheets a stage draws
   * (`visuals`: units with their skins, turrets, forts) until `release`, and says when they have
   * loaded. Unit sheets are leased from the atlas tier: shared with the battle when it already drew
   * them, else a showcase-only copy that is unloaded a few seconds after the stage goes (`hd` asks for
   * the 2.46 px/lu copy where the battle draws the 1x one; such views come from `createUnit` with
   * `hd: true`). Turret and fort sheets are small and stay cached as in a battle; procedural visuals
   * (troop skins, effects, projectiles) bake on first use.
   */
  showcaseLease(o: { visuals: readonly { visualId: VisualId; skin?: SkinId | null }[]; hd?: boolean }): { ready: Promise<void>; hd: boolean; release(): void } {
    const leases: SheetLease[] = [];
    const waits: Promise<unknown>[] = [];
    let hd = false;
    for (const v of o.visuals) {
      const def = this.resolve(v.visualId, v.skin ?? undefined)?.def;
      if (!def || def.kind !== 'atlas' || (this.force !== null && this.force !== 'atlas')) continue;
      if (isWorldSource(def.source)) {
        waits.push(this.atlas.world.ensure(def.source));
        continue;
      }
      if (fortSource(def.source)) {
        waits.push(this.forts.ensure(this.fortSheetUrl(def.source)));
        continue;
      }
      const l = this.atlas.lease(def.source, { hd: o.hd === true });
      leases.push(l);
      waits.push(l.ready);
      if (l.hd) hd = true;
    }
    let done = false;
    return {
      ready: Promise.all(waits).then(
        () => undefined,
        () => undefined,
      ),
      hd,
      release: () => {
        if (done) return;
        done = true;
        for (const l of leases) l.release();
      },
    };
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
    if (what === 'unit') {
      this.fallbacks.units++;
      this.fallbacks.last = key;
    }
    return { adapter: this.procedural, def: proc };
  }

  /**
   * Units drawn with their fallback because their sheet was not in yet (G7: a battle's hold loads the
   * decks ahead, so in play this stays 0; the dev memory hook and the e2e budget read it).
   */
  readonly fallbacks = { units: 0, last: '' };

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
   * through every evolve. `skins` (save v14, PLAN 2c) names the skin of each age: each age resolves its
   * own (`base.<age>@<skins[age]>`), so the view morphs between skinned ages on an evolve. The older
   * `skin` is applied to whichever age has an entry for it (a Stone base created with `crystal_spire`
   * looks plain until it morphs into the Future age); `skins[age]` wins over it. An age whose skin has no
   * model (a cosmetic skin still on its tint, drawn by the dressing) draws its plain base silently.
   */
  createBase(o: { age: AgeId; skin?: SkinId; skins?: Partial<Record<AgeId, SkinId>>; side: Side; teamPreset: TeamPreset }): BaseView {
    const skin = o.skin;
    const skinOf = (age: AgeId): SkinId | undefined => o.skins?.[age] ?? skin;
    const resolveAge = (age: AgeId): { key: string; def: VisualDef } | undefined => {
      const own = skinOf(age);
      const skinned = own ? skinnedVisualId(`base.${age}`, own) : null;
      const def = skinned ? this.manifest[skinned] : undefined;
      if (skinned && def) return { key: skinned, def };
      return this.resolve(`base.${age}`);
    };
    if (skin && !AGES.some((a) => this.manifest[skinnedVisualId(`base.${a}`, skin)])) {
      this.once(`skin:base@${skin}`, `[visuals] no base has the skin "${skin}", drawing plain bases`);
    }
    // A skin model (PLAN 2c) streams in lazily: it starts loading now, and until it arrives the age's
    // standard base draws (the dressing tints it with the skin's old tint); the atlas view swaps the model
    // in when it lands, and morphs into each later age's own skin.
    const want = resolveAge(o.age);
    let r = want;
    if (want && this.isLazySkin(want.def) && (this.force === null || this.force === 'atlas')) {
      void this.atlas.world.ensure(want.def.source);
      if (!this.atlas.world.get(want.def.source)) r = this.resolve(`base.${o.age}`);
    }
    const def = r?.def ?? this.missing(`base.${o.age}`);
    const key = r?.key ?? `base.${o.age}`;
    const fb = this.sheetFallback(key, r?.def, 'base');
    if (fb) {
      // the sheet is not loaded (yet): the procedural base, which morphs through procedural entries (a
      // skin model without a procedural twin morphs through its age's standard base)
      const procAge = (age: AgeId): { key: string; def: VisualDef } | undefined => {
        const e = resolveAge(age);
        if (!e || e.def.kind !== 'atlas') return e;
        const proc = PROCEDURAL_MANIFEST[e.key];
        if (proc) return { key: e.key, def: proc };
        const plain = this.isLazySkin(e.def) ? PROCEDURAL_MANIFEST[`base.${age}`] : undefined;
        return plain ? { key: `base.${age}`, def: plain } : undefined;
      };
      return fb.adapter.createBase({ key, def: fb.def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++, age: o.age, skin: skinOf(o.age), resolveAge: procAge });
    }
    return this.adapterFor(key, r?.def, 'base').createBase({ key, def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++, age: o.age, skin: skinOf(o.age), resolveAge });
  }

  /** A base skin model's entry (`base.<age>@<skin>`, sheet `art/bases/skins/<skin>.json`, loaded lazily). */
  private isLazySkin(def: VisualDef): boolean {
    return def.kind === 'atlas' && isBaseSkinSource(def.source);
  }

  /**
   * Starts loading the base skin models a side will show (Customize try-on, VS prefetch); resolves when
   * they have loaded or failed. Skin ids without a model are skipped.
   */
  prefetchBaseSkins(skins: Partial<Record<AgeId, SkinId>>): Promise<void> {
    const all: Promise<unknown>[] = [];
    for (const [age, s] of Object.entries(skins) as [AgeId, SkinId | undefined][]) {
      const def = s ? this.manifest[skinnedVisualId(`base.${age}`, s)] : undefined;
      if (def && this.isLazySkin(def)) all.push(this.atlas.world.ensure(def.source));
    }
    return Promise.all(all).then(() => undefined);
  }

  /**
   * Warms what a match opening in `age` shows, while VS is up (PLAN 2b/2c "prefetched during VS"; review
   * 1): each side's base skin model of that age and each half's scene of it (the classic when it has
   * none), so the battle's first frame shows the models and the Blender scenery instead of the tint and
   * the painted layers swapping over. Duck-typed for the app (no contract change); resolves once the skin
   * models are in (the scenes stream into the backdrop textures the battle's backdrop reads).
   */
  prefetchMatch(o: {
    age: AgeId;
    sides: readonly { skins?: Partial<Record<AgeId, SkinId>>; scenes?: Partial<Record<AgeId, CosmeticKey>> }[];
    /** The units both decks can field in the opening age (G7): held for {@link PREFETCH_HOLD_MS}. */
    units?: readonly HeldVisual[];
  }): Promise<void> {
    const skins: Partial<Record<AgeId, SkinId>>[] = [];
    const scenes: { age: AgeId; scene: string }[] = [];
    for (const side of o.sides) {
      const skin = side.skins?.[o.age];
      if (skin) skins.push({ [o.age]: skin });
      const key = side.scenes?.[o.age];
      scenes.push({ age: o.age, scene: key?.startsWith('scene.') ? key.slice('scene.'.length) : 'classic' });
    }
    if (this.force === null || this.force === 'procedural' || this.force === 'atlas') this.procedural.backdrops.prefetch([o.age], [], scenes);
    const waits: Promise<unknown>[] = skins.map((s) => this.prefetchBaseSkins(s));
    if (o.units && o.units.length > 0) {
      // the battle's own hold takes the same sheets over when it starts; this one lets go a while later
      const hold = this.holdArt();
      waits.push(hold.set(o.units));
      setTimeout(() => hold.release(), PREFETCH_HOLD_MS);
    }
    return Promise.all(waits).then(() => undefined);
  }

  /** Base flag, national flag, decorations and skin restyle of one side (DESIGN A18.9.4). */
  createBaseDressing(o: { age: AgeId; side: Side; look: SideLook; teamPreset: TeamPreset; base?: BaseView }): BaseDressingView {
    return new BaseDressing({ ...o, team: teamColor(o.side, o.teamPreset), seed: this.nextSeed++ });
  }

  /**
   * The split-age backdrop. A half's backdrop skin (`skins.left` / `skins.right`, `backdrop.<id>`,
   * A18.9.4; the "Sky" from save v14) resolves through the manifest like a unit skin
   * (`backdrop.<age>@<id>`); an unknown skin warns once and draws that half's classic sky. `scenes`
   * (save v14, PLAN 2b): each half's scene per age, passed to the backdrop view as they are (Track A's
   * `backdropView` draws them; an age without one shows its classic scene).
   */
  createBackdrop(o: {
    left: AgeId;
    right: AgeId;
    arena: string;
    skins?: { left?: CosmeticKey | null; right?: CosmeticKey | null };
    scenes?: { left?: Partial<Record<AgeId, CosmeticKey>>; right?: Partial<Record<AgeId, CosmeticKey>> };
  }): BackdropView {
    const L = this.resolve(`backdrop.${o.left}`);
    const R = this.resolve(`backdrop.${o.right}`);
    const groundKey = `ground.${arenaId(o.arena)}`;
    const G = this.resolve(groundKey);
    const skinOf = (age: AgeId, key: CosmeticKey | null | undefined): { skin?: string } => {
      const id = key?.startsWith('backdrop.') ? key.slice(9) : null;
      if (!id) return {};
      if (this.manifest[skinnedVisualId(`backdrop.${age}`, id)]) return { skin: `backdrop.${id}` };
      this.once(`skin:backdrop@${id}`, `[visuals] no backdrop skin "${id}", drawing the classic sky`);
      return {};
    };
    const req = {
      left: { age: o.left, def: L?.def ?? this.missing(`backdrop.${o.left}`), ...skinOf(o.left, o.skins?.left) },
      right: { age: o.right, def: R?.def ?? this.missing(`backdrop.${o.right}`), ...skinOf(o.right, o.skins?.right) },
      ground: { key: groundKey, def: G?.def ?? this.missing(groundKey) },
      arena: o.arena,
      seed: this.nextSeed++,
      scenes: { left: { ...(o.scenes?.left ?? {}) }, right: { ...(o.scenes?.right ?? {}) } },
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
    for (const prefix of ['unit.', 'turret.', 'power.', 'fort.']) if (this.manifest[`${prefix}${card}`]) return `${prefix}${card}`;
    return `unit.${card}`;
  }

  /**
   * Portrait data URL, cached by (card, skin, foil, size, side, plate, team preset). `plate: false`
   * (an additive option requested by WP9, docs/requests/wp9-transparent-portraits.md) leaves the
   * background transparent so the UI can draw silhouettes of unowned cards. Team areas use the
   * current colourblind preset (`setTeamPreset`), like the lane.
   */
  portrait(o: { card: CardId; skin?: SkinId; foil?: Foil; size: number; side?: Side; plate?: boolean }): Promise<string> {
    // `strip:<clip>:<card>`: a unit clip as a CSS sprite strip for the menus (adapters/spriteStrip.ts)
    const strip = stripRequest(o.card);
    if (strip) return this.spriteStrip(strip.card, strip.clip, o.size, o.side ?? 0);
    const visualId = this.visualIdForCard(o.card);
    const cacheKey = `${skinnedVisualId(visualId, o.skin)}|${o.foil ?? 'none'}|${o.size}|${o.side ?? 0}|${o.plate === false ? 'bare' : 'plate'}|${this.preset}`;
    const hit = this.portraits.get(cacheKey);
    if (hit) return hit;
    // A base skin still on its tint (no model yet, PLAN 2c): the age's standard base with the skin's body
    // tint, as the lane draws it; a skin model resolves to its own sheet below (VS, Home, Customize).
    const tint = this.baseSkinTint(visualId, o.skin);
    if (tint !== null) {
      const plain = this.resolve(visualId)?.def;
      if (plain && plain.kind === 'atlas' && isWorldSource(plain.source) && !this.force) {
        const p = renderWorldPortrait({ url: this.atlasUrl(plain.source), age: worldSourceAge(plain.source), size: o.size, foil: o.foil ?? 'none', teamColor: teamColor(o.side ?? 0, this.preset), plate: o.plate !== false, bodyTint: tint })
          .then((u) => u ?? '')
          .catch(() => '');
        this.portraits.set(cacheKey, p);
        return p;
      }
    }
    const r = this.resolve(visualId, tint !== null ? undefined : o.skin);
    const def = r?.def ?? this.missing(visualId);
    const key = r?.key ?? visualId;
    const req = { key, def, size: o.size, foil: o.foil ?? 'none', side: o.side ?? 0, plate: o.plate !== false, teamPreset: this.preset } as const;
    const p = this.portraitAdapter(key, r?.def)
      .then(({ adapter, def: d }) => adapter.portrait({ ...req, def: d }))
      .catch(() => '');
    this.portraits.set(cacheKey, p);
    return p;
  }

  /** The body tint of a base skin that has no model entry yet (`base.<age>` with a tint skin), else null. */
  private baseSkinTint(visualId: VisualId, skin: SkinId | undefined): number | null {
    if (!skin || !visualId.startsWith('base.') || this.manifest[skinnedVisualId(visualId, skin)]) return null;
    return BASE_SKINS[skin]?.tint ?? null;
  }

  /**
   * A unit clip (`idle`, `walk`) as a horizontal strip of square `size` cells for CSS `steps()`
   * playback (UI art audit #6), cached like portraits; '' when the unit has no sprite sheet.
   */
  spriteStrip(card: CardId, clip: string, size: number, side: Side): Promise<string> {
    const visualId = this.visualIdForCard(card);
    const cacheKey = `strip|${visualId}|${clip}|${size}|${side}|${this.preset}`;
    const hit = this.portraits.get(cacheKey);
    if (hit) return hit;
    const def = this.resolve(visualId)?.def;
    const p =
      def && def.kind === 'atlas' && !this.force
        ? renderSpriteStrip({ url: this.atlasUrl(def.source), clip, size, teamColor: teamColor(side, this.preset) })
            .then((u) => u ?? '')
            .catch(() => '')
        : Promise.resolve('');
    this.portraits.set(cacheKey, p);
    return p;
  }

  private atlasUrl(source: string): string {
    if (/^(https?:|data:|\/)/.test(source)) return source;
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    return `${base}${source}`;
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
