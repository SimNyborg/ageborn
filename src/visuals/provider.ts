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
import { AtlasAdapter, wantsHdSheets, type AtlasData, type SheetLease } from './adapters/atlas';
import type { GpuHooks } from './gpuUpload';
import { isBaseSkinSource, isWorldSource, WorldAtlas, worldSourceAge } from './adapters/worldAtlas';
import { forgetWorldSheets, renderWorldPortrait } from './adapters/worldPortrait';
import { BASE_SKINS } from './cosmetics/baseSkins';
import { spriteStripArt, stripInfoUrl, stripRequest, type StripSource } from './adapters/spriteStrip';
import { forgetPortraitStills } from './adapters/atlasPortrait';
import { AtlasFortView } from './fortViews/atlasFortView';
import { fortSource, type FortKindId } from './forts';
import type { BakeStats } from './bake';
import { PlaceholderAdapter } from './adapters/placeholder';
import { ProceduralAdapter } from './adapters/procedural';
import { SpineAdapter } from './adapters/spine';
import type { ViewKind, VisualAdapter, VisualKind } from './adapters/types';
import { AGES } from './ages';
import { BaseDressing, type DecorationProps } from './cosmetics/dressing';
import { decorationSheetSource, WORLD_DECORATIONS } from './manifest.world';
import { teamColor } from './palette';
import { arenaId } from './backdrops/ground';
import { forgetSceneImages, inSceneDir, sceneImage, sceneJson } from './backdrops/sceneFiles';
import { drawnScene, parseScene, sceneDir, sceneIdOf } from './backdrops/scenes';
import { groundImageUrl } from './adapters/procedural/backdropView';
import { puppetById } from './library';
import { MANIFEST, PROCEDURAL_MANIFEST, type VisualManifest } from './manifest';
import { DEMOTE_CONFIRM_MS, HD_HOLD_MS, holdBackNewHd, LEAVING_LANE_BYTES, leavingRoom, planSheetDensities, plannedBytes, SHEET_RANK, UNIT_SHEET_BUDGET_BYTES, unitSheetBytes, UNKNOWN_SHEET_BYTES, type SheetDensity, type SheetWant } from './sheetBudget';
import { SKIN_PUPPETS } from './skins';
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
  /**
   * How soon it may be drawn (`SHEET_RANK`: 0 on the lane, 1 within seconds, 2 the current age's deck, 3 the
   * next age's); the memory governor gives HD by it. Default: the current age's deck.
   */
  priority?: number;
  /**
   * Nothing draws it before it is held again without this (the next age's deck before its side's Ascension): the
   * governor loads it only where its HD copy fits, else not yet (`sheetBudget.ts` `optional`).
   */
  optional?: boolean;
  /**
   * Its side is leaving its age (or has left it): on its 1x copy it stays there (`sheetBudget.ts` `noRaise`).
   */
  noRaise?: boolean;
  /**
   * Its units belong to an age their side is leaving or has left: on the lane, raised from its 1x copy, its HD copy
   * takes the leaving units' room above the budget first (`sheetBudget.ts` `leaving`, review 2 S-b).
   */
  leaving?: boolean;
  /**
   * Nothing draws it for a while yet (the next age's deck during its side's hand-over): its load may wait while the
   * governor frees memory (`sheetBudget.ts` `canWait`).
   */
  canWait?: boolean;
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

/**
 * What a hold wants of a unit sheet: its best rank, whether it may go without a copy (`HeldVisual.optional`), wait
 * for one (`canWait`; an optional sheet can), whether it stays on its 1x copy (`noRaise`) and whether its units are
 * of an age their side is leaving (`leaving`); each only when every holder of the sheet says so.
 */
interface HoldWant {
  rank: number;
  optional: boolean;
  canWait: boolean;
  noRaise: boolean;
  leaving: boolean;
}

/** Two wants of one sheet as one (best rank; optional, canWait, noRaise and leaving only when both are). */
function mergeWant(had: HoldWant | undefined, w: HoldWant): HoldWant {
  if (!had) return w;
  return { rank: Math.min(had.rank, w.rank), optional: had.optional && w.optional, canWait: had.canWait && w.canWait, noRaise: had.noRaise && w.noRaise, leaving: had.leaving && w.leaving };
}

/** How long VS's warm-up keeps a match's opening sheets (the battle's own hold takes over long before). */
export const PREFETCH_HOLD_MS = 30_000;

/** While new HD loads wait for copies a plan is leaving (`holdBackNewHd`), the governor plans again this often (ms) at least. */
const HOLD_BACK_RECHECK_MS = 500;

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
    // stands in while its sprite sheet streams in bakes on first use (perf audit 2026-10-01). In the game
    // (`unitSheets: 'match'`) a skin bakes when a match or a stage holds it (`prebakeSkins`), not with its age.
    this.perMatch = o.unitSheets === 'match';
    let drawn: Set<string> | null = null;
    let skins: Set<string> | null = null;
    const bakePuppet = (id: string): boolean => {
      if (this.force === 'procedural') return true;
      if (this.force !== null) return false;
      drawn ??= new Set(Object.values(this.manifest).filter((d) => d.kind === 'procedural').map((d) => d.source));
      skins ??= new Set(this.perMatch ? SKIN_PUPPETS.map((p) => p.id) : []);
      return drawn.has(id) && !skins.has(id);
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
    // a raised sheet's views switch to HD once its HD copy is on the GPU (`settle`)
    this.atlas.onHdUploaded = (source) => this.settle(source);
    this.adapters = { placeholder: this.placeholder, procedural: this.procedural, atlas: this.atlas, spine: new SpineAdapter() };
    this.fortHd = this.quality !== 'lite' && wantsHdSheets(world, o.hdDpr ?? rawDpr);
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    this.forts = new WorldAtlas((s) => (/^(https?:|data:|\/)/.test(s) ? s : `${base}${s}`));
    this.warn = o.warn ?? ((m) => console.warn(m));
  }

  private readonly warn: (msg: string) => void;
  /** The game (`unitSheets: 'match'`): unit sheets, forts and skins load when a match or a stage holds them. */
  private readonly perMatch: boolean;

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
    // fort sheets (A16.14.8): Stone's are awaited (every match starts there), the rest stream in. In the game
    // (`unitSheets: 'match'`) a battle's hold loads its decks' forts and a stage its own (2026-10-18: every
    // fort of every age reached stayed decoded, about 25 MB by Gunpowder, for the two a match fields per age)
    if ((this.force === null || this.force === 'atlas') && !this.perMatch) {
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

  /**
   * A battle's art for its ages (2026-10-18, duck-typed for the battle view): what `preload(ages)` loads, but
   * of the turrets only those the decks can build (`turrets`: both sides' loadouts in these ages, with their
   * skins), not every turret of every age reached (about 15 MB of decoded sheets no one could build by
   * Gunpowder). A skinned turret drawn by the procedural tier bakes now. Outside the game's per-match mode,
   * or with a forced tier other than the sheets, the same as `preload`.
   */
  async preloadMatch(o: { ages: readonly AgeId[]; turrets: readonly { visualId: VisualId; skin?: SkinId | null }[] }): Promise<void> {
    if (!this.perMatch || (this.force !== null && this.force !== 'atlas')) return this.preload([...o.ages]);
    const turrets = new Set<string>();
    for (const t of o.turrets) {
      const def = this.resolve(t.visualId, t.skin ?? undefined)?.def;
      if (def && def.kind === 'atlas' && isWorldSource(def.source)) turrets.add(def.source);
    }
    const kinds = new Set<VisualKind>([this.force ?? 'procedural', ...Object.values(this.manifest).map((d) => d.kind)]);
    for (const k of kinds) {
      const a = this.adapters[k];
      if (!a.available) continue;
      if (k === 'atlas') await this.atlas.preload([...o.ages], { turrets: [...turrets] });
      else await a.preload([...o.ages]);
    }
    await this.prebakeSkins(o.turrets);
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
    // the tower crew's unit sheet stays while this fort draws it (G7: never unloaded under a live view), and
    // so does the fort's own sheet (a battle lets go of a passed age's forts, `releaseAges`). The crew draws
    // the best copy in: one that started on the governor's 1x copy moves to HD once that is in, and lets go
    // of its 1x copy (review N4).
    let crew: { sheet: AtlasData; release: () => void } | null = null;
    const url = src && (this.force === null || this.force === 'atlas') ? this.fortSheetUrl(src) : null;
    const fortHeld = url ? this.forts.retain(url) : null;
    // a fort placed before its sheet is in draws a code stand-in until it lands (counted for the e2e budget)
    if (url && !this.forts.get(url)) {
      this.fallbacks.forts++;
      this.fallbacks.lastWorld = url;
    }
    return new AtlasFortView({
      def,
      side: o.side,
      kind: o.kind,
      teamColor: teamColor(o.side, o.teamPreset),
      decor: this.procedural.baker,
      seed: this.nextSeed++,
      sheets: this.forts,
      source: url,
      age,
      crewSheet: (visualId) => {
        const c = this.resolve(visualId)?.def;
        const sheet = c && c.kind === 'atlas' ? this.atlas.sheetFor(c.source) : undefined;
        if (sheet && c && crew?.sheet !== sheet) {
          const prev = crew;
          crew = { sheet, release: this.atlas.holdSheet(c.source) };
          prev?.release();
        }
        return sheet ?? crew?.sheet;
      },
      onDestroy: () => {
        crew?.release();
        crew = null;
        fortHeld?.();
      },
    });
  }

  /**
   * A battle's ages moved on (an evolve, 2026-10-18; duck-typed for the battle view): lets go of the turret
   * and fort sheets of every age outside `keep` (every age from the lagging side's current one on: only ages
   * both sides have left go, review B1; render's `keptAges`) that no live view draws,
   * so a Long War does not keep every age's turrets and forts decoded. Bases stay (an evolving base still
   * draws its old age while it morphs; they are small). An age asked for again loads again. Returns how many
   * sheets went.
   */
  releaseAges(keep: readonly AgeId[]): number {
    if (!this.perMatch) return 0;
    const ages = new Set(keep);
    const passed = (age: AgeId | null | undefined): boolean => !!age && !ages.has(age);
    const turrets = this.atlas.world.release((s) => /art\/turrets\//.test(s) && passed(worldSourceAge(s)));
    const forts = this.forts.release((s) => passed(/art\/forts\/([a-z]+)\//.exec(s)?.[1] as AgeId | undefined));
    return turrets + forts;
  }

  /**
   * A hold on the unit sheets one match draws (G7, Safari memory): see {@link ArtHold}. Units resolve
   * with their skins; a fort's sheet is small and stays cached, but its tower crew (a unit sheet, named
   * in the fort sheet's meta) is held with it. Turret and base sheets load per age (`preload`). With a
   * forced tier other than the sheets the hold does nothing.
   *
   * Every live hold (the battle's, VS's warm-up) feeds one plan (`replan`, the memory governor of
   * `sheetBudget.ts`): each held unit sheet gets its HD or its 1x copy by its best `priority`, within
   * `sheetBudget`. A skin drawn by the procedural tier bakes its parts when a hold first asks for it.
   */
  holdArt(): ArtHold {
    const wants = new Map<string, HoldWant>();
    let live = true;
    let last: readonly HeldVisual[] = [];
    const sheetsOn = this.force === null || this.force === 'atlas';
    const unitSource = (def: VisualDef | undefined): string | null =>
      def && def.kind === 'atlas' && !isWorldSource(def.source) && !fortSource(def.source) ? def.source : null;
    const want = (src: string, rank: number, v: HeldVisual): void => {
      wants.set(src, mergeWant(wants.get(src), { rank, optional: v.optional === true, canWait: v.optional === true || v.canWait === true, noRaise: v.noRaise === true, leaving: v.leaving === true }));
    };
    const set = (visuals: readonly HeldVisual[]): Promise<void> => {
      if (!live) return Promise.resolve();
      // the skins it draws with the procedural tier bake too (the battle's clock waits for them as for sheets)
      const baked = this.prebakeSkins(visuals);
      if (!sheetsOn) return baked;
      last = visuals;
      wants.clear();
      const waits: Promise<unknown>[] = [baked];
      for (const v of visuals) {
        const rank = v.priority ?? SHEET_RANK.deck;
        const def = this.resolve(v.visualId, v.skin ?? undefined)?.def;
        if (!def || def.kind !== 'atlas') continue;
        const unit = unitSource(def);
        if (unit) {
          want(unit, rank, v);
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
        if (src) want(src, rank, v);
      }
      this.holdWants.add(wants);
      // a sheet the match lets go of (an age both sides left, a unit gone from the field) unloads at once,
      // unless a view still draws it (review 2: the 4 s linger kept a passed age's sheets next to the
      // next age's, the largest part of a late-game peak)
      this.replan();
      for (const src of wants.keys()) {
        const d = this.plan.get(src);
        if (d === 'none' || this.atlas.canDrawSource(src)) continue;
        const l = d === 'sd' ? this.sdLeases.get(src) : this.hdLeases.get(src);
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
        if (!live) return;
        live = false;
        wants.clear();
        this.holdWants.delete(wants);
        this.replan();
        if (this.holdWants.size === 0 && this.recheck) {
          clearTimeout(this.recheck.timer);
          this.recheck = null;
        }
      },
    };
  }

  /** Every live hold's unit sheets (source → best rank, optional, canWait, noRaise), merged into one plan by `replan`. */
  private readonly holdWants = new Set<Map<string, HoldWant>>();
  /** The governor's plan: each held unit sheet's copy (HD, 1x, or none yet for an optional sheet). */
  private plan = new Map<string, SheetDensity>();
  /** The leases behind the plan: HD copies (the battle's set) and, on an HD screen, 1x copies. */
  private readonly hdLeases = new Map<string, SheetLease>();
  private readonly sdLeases = new Map<string, SheetLease>();
  /**
   * The decoded memory the governor plans unit sheets with (bytes, `UNIT_SHEET_BUDGET_BYTES`). Applies on an
   * HD screen; a 1x screen has one copy of each sheet.
   */
  sheetBudget = UNIT_SHEET_BUDGET_BYTES;
  /**
   * Room above `sheetBudget` for the HD copies of units on the lane of an age their side is leaving or has left,
   * raised from their 1x copy (`LEAVING_LANE_BYTES`, review 2 S-b): such a unit that walks out on its 1x copy gets
   * its HD copy at once, without another copy stepping down.
   */
  leavingAllowance = LEAVING_LANE_BYTES;
  /**
   * Lane sheets of a leaving age the plan raised from their 1x copy (or from no copy): they keep the leaving room
   * while their units stand on the lane (`SheetWant.leaving`). An HD copy the lane drew all along counts against the
   * budget as before, so the room is there when such a raise comes and costs memory only then.
   */
  private readonly leaveRaised = new Set<string>();
  /**
   * The last plan, for the dev memory hook: sheets planned HD and 1x, the planned bytes, how many times a sheet
   * changed copy (`moves`) and how many copies the plan loaded (`loads`, HD and 1x; review N6: every move is a
   * load and an upload, and so is every sheet that comes in).
   */
  private planStats = { hd: 0, sd: 0, none: 0, bytes: 0, moves: 0, loadsHd: 0, loadsSd: 0 };
  /** The performance clock (ms) of the governor's hysteresis and step-down debounce; tests replace it. */
  clock: () => number = () => (typeof performance !== 'undefined' ? performance.now() : 0);
  /** When each planned sheet last got HD (raised with its HD copy in, or its HD copy landed; `HD_HOLD_MS`). */
  private readonly hdAt = new Map<string, number>();
  /** When the plan first wanted each sheet now in HD at 1x (the step down waits `DEMOTE_CONFIRM_MS`). */
  private readonly demoteSince = new Map<string, number>();
  /** A later re-plan: a step down to confirm, or a hysteresis that runs out while a sheet waits for HD. */
  private recheck: { at: number; timer: ReturnType<typeof setTimeout> } | null = null;

  /**
   * The governor's plan now (the dev memory hook, tests): sheets planned HD and 1x, planned bytes, the budget,
   * how many times a sheet changed copy since the provider was made (`moves`) and how many copies it loaded.
   */
  sheetPlan(): { hd: number; sd: number; none: number; plannedBytes: number; budgetBytes: number; hdScreen: boolean; moves: number; loads: { hd: number; sd: number }; sdSources: string[] } {
    return {
      hd: this.planStats.hd,
      sd: this.planStats.sd,
      none: this.planStats.none,
      plannedBytes: this.planStats.bytes,
      moves: this.planStats.moves,
      loads: { hd: this.planStats.loadsHd, sd: this.planStats.loadsSd },
      budgetBytes: this.sheetBudget,
      hdScreen: this.atlas.hdScreen,
      sdSources: [...this.plan].filter(([, d]) => d === 'sd').map(([s]) => s).sort(),
    };
  }

  /**
   * Plans every held unit sheet's copy over all live holds (`sheetBudget.ts`) and leases accordingly. A sheet
   * moving between copies keeps the copy it has until the other can draw (`settle`), so no unit ever goes
   * without its art; a sheet no hold wants is let go of (it unloads once no view draws it).
   *
   * Copy changes cost loads and GPU uploads, so they are damped (review S1): an HD load in flight finishes, an
   * HD copy that landed or was drawn within `HD_HOLD_MS` keeps HD while the budget allows, and a step down
   * (to 1x, or to no copy for an optional sheet) happens only when a plan `DEMOTE_CONFIRM_MS` after the first one
   * that wanted it still does (a re-plan is scheduled for it). An optional sheet without room for HD gets no
   * copy, so the next age never loads 1x first and HD a moment later.
   */
  private replan(): void {
    const now = this.clock();
    const merged = new Map<string, HoldWant>();
    for (const w of this.holdWants) {
      for (const [s, h] of w) {
        const had = merged.get(s);
        merged.set(s, mergeWant(had, h));
      }
    }
    // a raised lane sheet keeps the leaving room only while its units of a leaving age stand on the lane
    for (const s of [...this.leaveRaised]) {
      const h = merged.get(s);
      if (!h || !h.leaving || h.rank !== SHEET_RANK.field) this.leaveRaised.delete(s);
    }
    const list: SheetWant[] = [];
    const lastHd = new Map<string, number>();
    for (const [source, { rank, optional, canWait, noRaise, leaving }] of merged) {
      const b = unitSheetBytes(source) ?? UNKNOWN_SHEET_BYTES;
      const hdResident = this.atlas.hasSheet(source);
      const hdDrawn = this.atlas.hdDrawn(source);
      const last = Math.max(this.hdAt.get(source) ?? -Infinity, this.atlas.hdDrawnAt(source));
      lastHd.set(source, last);
      // the leaving room goes to a lane sheet of a leaving age raised from its 1x copy (or from no copy), not to an
      // HD copy the lane drew all along (review 2 S-b)
      const raise = leaving && rank === SHEET_RANK.field && (this.leaveRaised.has(source) || (!this.hdLeases.has(source) && !hdResident && !hdDrawn));
      list.push({
        source,
        rank,
        // an "HD" copy whose HD file failed is the 1x file: it costs a 1x copy, and stepping it down frees nothing
        // (review 2 B)
        hdBytes: this.atlas.hdFellBack(source) ? b.sd : b.hd,
        sdBytes: b.sd,
        hdResident,
        hdDrawn,
        // an HD load the plan started finishes: dropping it mid-way still decodes and uploads it
        hdKeep: this.hdLeases.has(source) && this.atlas.hdLoading(source),
        hdRecent: hdResident && now - last < HD_HOLD_MS,
        sdResident: this.atlas.hasSdSheet(source),
        ...(optional ? { optional: true } : {}),
        ...(canWait ? { canWait: true } : {}),
        ...(noRaise ? { noRaise: true } : {}),
        ...(raise ? { leaving: true } : {}),
      });
    }
    let plan: Map<string, SheetDensity>;
    let recheckAt = Infinity;
    if (!this.atlas.hdScreen) plan = new Map(list.map((w) => [w.source, 'hd' as const]));
    else {
      plan = planSheetDensities(list, this.sheetBudget, { leavingAllowance: this.leavingAllowance });
      // a sheet back at HD in this plan forgets an earlier step down
      for (const w of list) if (!this.hdLeases.has(w.source) || plan.get(w.source) === 'hd') this.demoteSince.delete(w.source);
      // a step down from HD waits for a plan DEMOTE_CONFIRM_MS later that still wants it; keeping a sheet in HD
      // meanwhile may push another HD sheet down, which then waits as well
      for (let pass = 0; pass <= list.length; pass++) {
        let kept = false;
        for (const w of list) {
          if (w.hdKeep || plan.get(w.source) === 'hd' || !this.hdLeases.has(w.source)) continue;
          const since = this.demoteSince.get(w.source) ?? now;
          this.demoteSince.set(w.source, since);
          if (now - since >= DEMOTE_CONFIRM_MS) continue;
          w.hdKeep = true;
          kept = true;
          recheckAt = Math.min(recheckAt, since + DEMOTE_CONFIRM_MS);
        }
        if (!kept) break;
        plan = planSheetDensities(list, this.sheetBudget, { leavingAllowance: this.leavingAllowance });
      }
      // a sheet left at 1x (or none) while a recent HD copy holds the room is planned again when that ends
      if ([...plan.values()].some((d) => d !== 'hd')) {
        for (const w of list) if (w.hdRecent && plan.get(w.source) === 'hd') recheckAt = Math.min(recheckAt, (lastHd.get(w.source) ?? now) + HD_HOLD_MS);
      }
      // new HD copies wait while copies the plan is leaving still take their memory (an HD copy goes only once its
      // 1x copy is in); a plan once those have gone lets them in (`settle` plans again then)
      const settling = [...this.demoteSince.keys()].some((s) => this.hdLeases.has(s));
      const isNew = (s: string, d: 'hd' | 'sd'): boolean => !(d === 'hd' ? this.hdLeases : this.sdLeases).has(s);
      // (against the budget plus the room the leaving units' HD copies take above it)
      const room = this.sheetBudget + leavingRoom(list, plan, this.leavingAllowance);
      if (holdBackNewHd(list, plan, room, isNew, settling).length > 0) recheckAt = Math.min(recheckAt, now + HOLD_BACK_RECHECK_MS);
      // a leaving lane sheet raised by this plan keeps the room until its units leave the lane
      for (const w of list) {
        if (!w.leaving) continue;
        if (plan.get(w.source) === 'hd') this.leaveRaised.add(w.source);
        else this.leaveRaised.delete(w.source);
      }
    }
    for (const s of [...this.demoteSince.keys()]) if (!merged.has(s)) this.demoteSince.delete(s);
    for (const [source, d] of plan) {
      const was = this.plan.get(source);
      if (was && was !== d) this.planStats.moves++;
    }
    this.plan = plan;
    let hd = 0;
    let none = 0;
    for (const d of plan.values()) {
      if (d === 'hd') hd++;
      else if (d === 'none') none++;
    }
    this.planStats = { ...this.planStats, hd, sd: plan.size - hd - none, none, bytes: plannedBytes(list, plan) };
    for (const [source, d] of plan) {
      if (d === 'none') continue;
      const leases = d === 'hd' ? this.hdLeases : this.sdLeases;
      if (leases.has(source)) {
        this.settle(source);
        continue;
      }
      const l = this.atlas.lease(source, d === 'hd' ? { linger: 0 } : { linger: 0, density: 'sd' });
      leases.set(source, l);
      if (d === 'hd') {
        this.planStats.loadsHd++;
        // raised to HD with its HD copy already in (kept by views): it got HD now
        if (this.atlas.hasSheet(source)) this.hdAt.set(source, now);
      } else this.planStats.loadsSd++;
      // settles once the core sheet can draw (a view playing an attack variant whose extras are still on the
      // way keeps its 1x copy until a later settle); HD again once its extras are in
      void l.core.then(() => {
        if (d === 'hd' && this.hdLeases.get(source) === l && this.atlas.hasSheet(source)) this.hdAt.set(source, this.clock());
        this.settle(source);
      });
      if (d === 'hd') void l.ready.then(() => this.settle(source));
    }
    // a sheet no hold wants, or an optional one planned without a copy, lets go of its leases (it unloads once no
    // view draws it)
    for (const leases of [this.hdLeases, this.sdLeases]) {
      for (const [source, l] of [...leases]) {
        const d = plan.get(source);
        if (d !== undefined && d !== 'none') continue;
        l.release();
        leases.delete(source);
      }
    }
    for (const s of [...this.hdAt.keys()]) if (!plan.has(s)) this.hdAt.delete(s);
    this.scheduleRecheck(recheckAt);
  }

  /** Re-plans at `at` (performance ms) unless a re-plan is due sooner; nothing when no hold is live. */
  private scheduleRecheck(at: number): void {
    if (!Number.isFinite(at) || this.holdWants.size === 0) return;
    if (this.recheck && this.recheck.at <= at) return;
    if (this.recheck) clearTimeout(this.recheck.timer);
    const timer = setTimeout(
      () => {
        if (this.recheck?.timer !== timer) return;
        this.recheck = null;
        this.replan();
      },
      Math.max(0, at - this.clock()) + 1,
    );
    this.recheck = { at, timer };
  }

  /**
   * A sheet's planned copy can draw: the other copy's lease ends. Raised to HD, the views on its 1x copy
   * switch over first (`AtlasAdapter.upgradeViews`), once the HD copy is on the GPU (review S1: the releaser
   * spaces big uploads out and holds them through an evolve; units stay on the 1x copy meanwhile, so no draw
   * uploads it early); lowered to 1x, the HD copy stays while views draw it. A copy that failed to load keeps
   * the other one. A copy let go of plans again soon, for the HD loads waiting for its memory.
   */
  private settle(source: string): void {
    const d = this.plan.get(source);
    const hd = this.hdLeases.get(source);
    const sd = this.sdLeases.get(source);
    if (d === 'hd' && hd && this.atlas.hasSheet(source) && (!sd || this.atlas.hdOnGpu(source))) {
      // (also views left on a 1x copy whose lease already ended)
      this.atlas.upgradeViews(source);
      if (sd) {
        sd.release();
        this.sdLeases.delete(source);
        // the memory it held may let a waiting HD load in (`holdBackNewHd`)
        this.scheduleRecheck(this.clock());
      }
    } else if (d === 'sd' && sd && hd && this.atlas.hasSdSheet(source)) {
      hd.release();
      this.hdLeases.delete(source);
      this.scheduleRecheck(this.clock());
    }
  }

  /**
   * Bakes the skins a hold or a stage draws with the procedural tier (sliced in idle time), the first time one
   * asks for them: the game no longer bakes every skin of an age at its preload (G7 round 3: about 70 MB of
   * atlas pages at DPR 2 held skins no side wore).
   */
  private prebakeSkins(visuals: readonly { visualId: VisualId; skin?: SkinId | null }[]): Promise<void> {
    if (!this.perMatch) return Promise.resolve();
    const ids: string[] = [];
    for (const v of visuals) {
      if (!v.skin) continue;
      const def = this.resolve(v.visualId, v.skin)?.def;
      if (def && def.kind === 'procedural' && (this.force === null || this.force === 'procedural')) ids.push(def.source);
    }
    return ids.length > 0 ? this.procedural.prebake(ids) : Promise.resolve();
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
   * (troop skins, effects, projectiles) bake on first use. The card showcase draws on its own WebGL app,
   * which can only upload from a sheet's decoded copy, so the unit sheets keep theirs while leased (G7:
   * a battle releases it once its texture is on the app's GPU); `cpu: false` for a stage on the app's
   * own renderer (the capsule show), where the GPU copy is enough.
   */
  showcaseLease(o: { visuals: readonly { visualId: VisualId; skin?: SkinId | null }[]; hd?: boolean; cpu?: boolean }): { ready: Promise<void>; hd: boolean; release(): void } {
    const leases: SheetLease[] = [];
    // a skin the stage draws with the procedural tier bakes first (the game bakes skins when held)
    const waits: Promise<unknown>[] = [this.prebakeSkins(o.visuals)];
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
      const l = this.atlas.lease(def.source, { hd: o.hd === true, cpu: o.cpu !== false });
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
    } else if (what === 'turret' || what === 'base') {
      this.fallbacks[what === 'turret' ? 'turrets' : 'bases']++;
      this.fallbacks.lastWorld = key;
    }
    return { adapter: this.procedural, def: proc };
  }

  /**
   * Views drawn with their stand-in because their sheet was not in yet, counted as they are made: units (G7: a
   * battle's hold loads the decks ahead, so in play this stays 0), turrets and bases (the battle view makes both
   * again from their sheets once those are in: review S2, review 2 S-c) and forts (a fort swaps its sheet in when
   * it lands). `turretsNow` and `basesNow` count the turret and base stand-ins still drawn now: one the battle
   * replaced by its sheet's view no longer counts while it fades out (`replacedStandIn`), nor one destroyed. The
   * dev memory hook and the e2e budget read them.
   */
  readonly fallbacks = { units: 0, last: '', turrets: 0, bases: 0, forts: 0, lastWorld: '', turretsNow: 0, basesNow: 0 };

  /** Each live turret or base stand-in's way out of `fallbacks.turretsNow` / `basesNow` (once: replaced or destroyed). */
  private readonly standIns = new WeakMap<object, () => void>();

  /** Counts a turret or base stand-in in `fallbacks` until it is replaced or destroyed. */
  private liveStandIn<V extends TurretView | BaseView>(view: V, now: 'turretsNow' | 'basesNow'): V {
    this.fallbacks[now]++;
    let gone = false;
    const leave = (): void => {
      if (gone) return;
      gone = true;
      this.fallbacks[now]--;
    };
    this.standIns.set(view, leave);
    const destroy = view.destroy.bind(view);
    view.destroy = () => {
      leave();
      destroy();
    };
    return view;
  }

  /**
   * The battle view made a turret or base again from its sheet (review 2 S-c; duck-typed): the stand-in it replaced
   * fades out over the new view, and from now on it no longer counts as drawn by its stand-in.
   */
  replacedStandIn(view: TurretView | BaseView): void {
    this.standIns.get(view)?.();
  }

  createTurret(o: { visualId: VisualId; skin?: SkinId; side: Side; teamPreset: TeamPreset }): TurretView {
    const r = this.resolve(o.visualId, o.skin);
    const def = r?.def ?? this.missing(o.visualId);
    const key = r?.key ?? o.visualId;
    const fb = this.sheetFallback(key, r?.def, 'turret');
    if (fb) return this.liveStandIn(fb.adapter.createTurret({ key, def: fb.def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++ }), 'turretsNow');
    return this.adapterFor(key, r?.def, 'turret').createTurret({ key, def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++ });
  }

  /**
   * A turret's world sheet (review 2 S-c, duck-typed for the battle view): null when it is in (or the sheets are
   * not drawn: a forced tier, a turret drawn by another tier), else a promise that settles once it has loaded or
   * failed. A turret made before its sheet is in is drawn by its stand-in; the battle view makes it again once the
   * sheet is in, as it does the bases (`baseSheetReady`).
   */
  turretSheetReady(o: { visualId: VisualId; skin?: SkinId }): Promise<void> | null {
    if (this.force !== null && this.force !== 'atlas') return null;
    const def = this.resolve(o.visualId, o.skin)?.def;
    if (!def || def.kind !== 'atlas' || !isWorldSource(def.source) || this.atlas.world.get(def.source)) return null;
    return this.atlas.world.ensure(def.source).then(
      () => undefined,
      () => undefined,
    );
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
      return this.liveStandIn(fb.adapter.createBase({ key, def: fb.def, side: o.side, teamPreset: o.teamPreset, seed: this.nextSeed++, age: o.age, skin: skinOf(o.age), resolveAge: procAge }), 'basesNow');
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
   * The plain base sheet of an age, for a battle opening in it (review S2, duck-typed for the battle view and
   * VS): null when it is in (or the sheets are not drawn: a forced tier, no sheet), else a promise that settles
   * once it has loaded or failed. A base made before its sheet is in is drawn by its procedural stand-in, and
   * the boot loads Stone and Bronze only: a War Path window opening in Gunpowder or later showed code bases
   * for the whole battle. VS waits for it (`prefetchMatch`), and the battle view makes its bases again once it
   * is in.
   */
  baseSheetReady(age: AgeId): Promise<void> | null {
    if (this.force !== null && this.force !== 'atlas') return null;
    const def = this.resolve(`base.${age}`)?.def;
    if (!def || def.kind !== 'atlas' || !isWorldSource(def.source) || this.atlas.world.get(def.source)) return null;
    return this.atlas.world.ensure(def.source).then(
      () => undefined,
      () => undefined,
    );
  }

  /**
   * Holds the big GPU uploads of newly loaded unit sheets for `ms` (the battle view at your evolve, whose camera
   * push and new base show a long frame most; review S1). Duck-typed; small uploads go on, and a sheet a view
   * draws meanwhile is uploaded by Pixi on that frame anyway.
   */
  quietUploads(ms: number): void {
    this.atlas.quietUploads(ms);
  }

  /**
   * Warms what a match opening in `age` shows, while VS is up (PLAN 2b/2c "prefetched during VS"; review
   * 1): each side's base skin model of that age and each half's scene of it (the classic when it has
   * none), so the battle's first frame shows the models and the Blender scenery instead of the tint and
   * the painted layers swapping over; and the age's plain base sheet (review S2: the boot loads Stone and
   * Bronze only). Duck-typed for the app (no contract change); resolves once the base sheet and the skin
   * models are in (the scenes stream into the backdrop textures the battle's backdrop reads).
   */
  prefetchMatch(o: {
    age: AgeId;
    /** Each side's base skins and scenes per age, and (round 3) its equipped decorations: their props load too. */
    sides: readonly { skins?: Partial<Record<AgeId, SkinId>>; scenes?: Partial<Record<AgeId, CosmeticKey>>; decorations?: readonly (CosmeticKey | null)[] }[];
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
    // the menus' leftovers go first (the battle's own `beginMatch` names the arena; VS keeps every ground)
    this.beginMatch({ sides: o.sides.map((s) => ({ age: o.age, scene: s.scenes?.[o.age] ?? null, skin: s.skins?.[o.age] ?? null })), arena: null });
    if (this.force === null || this.force === 'procedural' || this.force === 'atlas') this.procedural.backdrops.prefetch([o.age], [], scenes);
    const waits: Promise<unknown>[] = skins.map((s) => this.prefetchBaseSkins(s));
    const base = this.baseSheetReady(o.age);
    if (base) waits.push(base);
    // both sides' decoration props (round 3: three a side), so the first battle frame shows them, not the SVG
    waits.push(this.prefetchDecorations(o.sides.flatMap((s) => s.decorations ?? [])));
    if (o.units && o.units.length > 0) {
      // the battle's own hold takes the same sheets over when it starts; this one lets go a while later
      const hold = this.holdArt();
      waits.push(hold.set(o.units));
      setTimeout(() => hold.release(), PREFETCH_HOLD_MS);
    }
    return Promise.all(waits).then(() => undefined);
  }

  /**
   * A match starts (review 2, Safari memory): lets go of the art the menus left decoded that the match does
   * not open with. Customize browsing every age left about 140 MB of scene strips and grounds and 40 MB of
   * base and skin model sheets for the rest of the session, and a battle right after went over the iPhone
   * budget. Kept: each half's scene of its opening age, the arena's ground (every ground for `arena:
   * null`), the painted stand-ins of the opening ages and the opening age's base skin models; everything
   * else loads again when something asks for it (an evolve's prefetch, Customize after the match). Called
   * by the battle view before it builds its backdrop and by the VS warm-up (`prefetchMatch`); duck-typed
   * (no contract change), idempotent.
   */
  beginMatch(o: { sides: readonly { age: AgeId; scene?: CosmeticKey | null; skin?: SkinId | null }[]; arena: string | null }): void {
    const scenes = new Set<string>();
    const ages = new Set<AgeId>();
    const dirs: string[] = [];
    const skins = new Set<string>();
    for (const s of o.sides) {
      const scene = drawnScene(s.age, sceneIdOf(s.scene ?? null));
      scenes.add(`${s.age}.${scene}`);
      ages.add(s.age);
      const dir = sceneDir(s.age, scene);
      if (dir) dirs.push(this.assetUrl(dir));
      const def = s.skin ? this.manifest[skinnedVisualId(`base.${s.age}`, s.skin)] : undefined;
      if (def && this.isLazySkin(def)) skins.add(def.source);
    }
    const arena = o.arena === null ? null : arenaId(o.arena);
    const ground = arena === null ? null : this.assetUrl(groundImageUrl(arena));
    this.procedural.backdrops.forget({ scenes, ages, grounds: arena === null ? null : new Set([arena]) });
    // the stills' files too (Customize's tiles and preview), which the lane's textures never asked for
    forgetSceneImages((url) => dirs.some((d) => inSceneDir(url, d)) || (ground === null ? url.includes('/art/ground/') : url === ground));
    this.atlas.world.forgetSkins((source) => skins.has(source));
    // decoration props stay (round 3: a few KB each, all 24 under 2 MB decoded; VS warmed this match's), so
    // their decoded copies stay counted by the menus' loader too
    forgetWorldSheets((url) => [...skins].some((s) => url === this.atlasUrl(s)) || /\/art\/cosmetics\/decorations\/[a-z0-9_]+\.json$/.test(url));
  }

  /**
   * The decoration prop sheets for the dressings (round 3, PLAN 2a): through the world atlas, which keeps a
   * loaded prop for the session; null with a forced tier other than the sheets (the SVG bakes stay).
   */
  private decorationProps(): DecorationProps | null {
    if (this.force !== null && this.force !== 'atlas') return null;
    this.decoProps ??= {
      has: (id) => WORLD_DECORATIONS.includes(id),
      get: (id) => this.atlas.world.get(decorationSheetSource(id)),
      ensure: (id) => this.atlas.world.ensure(decorationSheetSource(id)),
    };
    return this.decoProps;
  }

  private decoProps: DecorationProps | null = null;

  /** Starts loading the props of these decorations (`decoration.<id>` keys; others and nulls skipped); resolves when in or failed. */
  private prefetchDecorations(keys: readonly (CosmeticKey | null | undefined)[]): Promise<void> {
    const props = this.decorationProps();
    if (!props) return Promise.resolve();
    const ids = new Set(keys.filter((k): k is CosmeticKey => !!k && k.startsWith('decoration.')).map((k) => k.slice('decoration.'.length)));
    return Promise.all([...ids].filter((id) => props.has(id)).map((id) => props.ensure(id))).then(() => undefined);
  }

  /**
   * The page is going away (review 2, `app/pixiHost.ts` `releaseGpuOnPageHide`): every decoded image the
   * art caches hold is let go of (scene files, world sheets, the backdrop textures), so none of this page's
   * images waits for the garbage collector while the next page loads. Duck-typed for the app.
   *
   * 2026-10-18: also the decoded copies that stayed referenced after it (about 55 MB in a war at DPR 2): the
   * unit sheets' copies still waiting for their upload, the turret, base and fort sheets' copies (closed
   * bitmaps), the baked atlas pages' canvases (emptied) and the portrait stills. The page draws nothing after
   * this (its ticker stopped, its WebGL contexts are lost); a page the back-forward cache restores reloads.
   */
  releaseAll(): void {
    if (this.recheck) {
      clearTimeout(this.recheck.timer);
      this.recheck = null;
    }
    this.procedural.backdrops.forget({ scenes: new Set(), ages: new Set(), grounds: new Set() });
    forgetSceneImages(() => false);
    this.atlas.world.forgetSkins(() => false);
    forgetWorldSheets(() => false);
    this.atlas.releaseDecoded();
    this.atlas.world.releaseDecoded();
    this.forts.releaseDecoded();
    this.procedural.baker.releaseCanvases();
    forgetPortraitStills();
  }

  /**
   * What the Customize diorama draws (PLAN 2c; render's `showcase/diorama.ts`, duck-typed like
   * `showcaseLease`): the age's base (its skin model when it wears one) and two turrets, and the half's
   * scene files (its `layers.json`, strips and props atlas) with the ground, so the live stage starts on
   * the model and the Blender scene instead of a stand-in that swaps over the still. The scene files come
   * from the shared file cache (one download with the Customize stills) and stream into this provider's
   * backdrop textures, which the diorama's backdrop reads. Resolves once all of it has loaded or failed.
   */
  dioramaLease(o: { age: AgeId; skin?: SkinId | null; turrets: readonly VisualId[]; scene?: CosmeticKey | null; arena: string; decorations?: readonly (CosmeticKey | null)[] }): { ready: Promise<void>; release(): void } {
    const lease = this.showcaseLease({ visuals: [{ visualId: `base.${o.age}`, skin: o.skin ?? null }, ...o.turrets.map((visualId) => ({ visualId }))] });
    // the side's decoration props too (round 3), so the stage shows them from its first frame
    const waits: Promise<unknown>[] = [lease.ready, this.prefetchDecorations(o.decorations ?? [])];
    if (this.force === null || this.force === 'procedural' || this.force === 'atlas') {
      const scene = drawnScene(o.age, sceneIdOf(o.scene));
      const arena = arenaId(o.arena);
      this.procedural.backdrops.prefetch([o.age], [arena], [{ age: o.age, scene }]);
      waits.push(this.sceneFiles(o.age, scene), sceneImage(this.assetUrl(groundImageUrl(arena))));
    }
    return {
      ready: Promise.allSettled(waits).then(
        // one more turn, so the backdrop textures (awaiting the same files) hold them before the stage builds
        () => new Promise<void>((r) => setTimeout(r, 0)),
      ),
      release: () => lease.release(),
    };
  }

  /** A scene's files through the shared cache: its `layers.json`, then its strips and props atlas side by side. */
  private async sceneFiles(age: AgeId, scene: string): Promise<void> {
    const dir = sceneDir(age, scene);
    if (!dir) return;
    const data = parseScene(await sceneJson(this.assetUrl(`${dir}layers.json`)), age, scene);
    if (!data) return;
    const files: string[] = [];
    for (const kind of ['back', 'far', 'mid'] as const) {
      const m = data.layers[kind];
      if (m) files.push(m.image);
    }
    if (data.props && Object.keys(data.props.frames).length > 0) files.push(data.props.image);
    await Promise.allSettled(files.map((f) => sceneImage(this.assetUrl(dir + f))));
  }

  private assetUrl(path: string): string {
    const base = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
    return `${base}${path}`;
  }

  /** Base flag, national flag, decorations and skin restyle of one side (DESIGN A18.9.4). */
  createBaseDressing(o: { age: AgeId; side: Side; look: SideLook; teamPreset: TeamPreset; base?: BaseView }): BaseDressingView {
    // round 3: the equipped decorations as Blender props (the SVG bakes stand in until each arrives)
    return new BaseDressing({ ...o, team: teamColor(o.side, o.teamPreset), seed: this.nextSeed++, props: this.decorationProps() });
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
    // `strip:<clip>:<card>`: a unit clip as a CSS sprite strip for the menus, `stripinfo:` its layout (adapters/spriteStrip.ts)
    const strip = stripRequest(o.card);
    if (strip) return this.spriteStrip(strip.card, strip.clip, o.size, o.side ?? 0, o.skin, strip.part);
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
   * A unit clip (`idle`, `walk`) as a horizontal strip of square `size` cells for CSS `steps()` playback (UI
   * art audit #6), drawn with the troop's `skin` (its own sheet, or its puppet when it has none; else the
   * card's own strip), or with `part: 'info'` the strip's layout as a JSON data URL (where its feet are and how
   * large it stands). Cached like portraits; kept between visits and drawn off the main thread where the
   * browser can (`adapters/spriteStrip.ts`); '' when the unit has no sprite sheet.
   */
  spriteStrip(card: CardId, clip: string, size: number, side: Side, skin?: SkinId, part?: 'info'): Promise<string> {
    const visualId = this.visualIdForCard(card);
    const r = skin ? this.resolve(visualId, skin) : undefined;
    const skinned = r && r.key !== visualId ? r : undefined;
    const cacheKey = `strip|${skinned?.key ?? visualId}|${clip}|${size}|${side}|${this.preset}`;
    const hit = this.portraits.get(part ? `${cacheKey}|${part}` : cacheKey);
    if (hit) return hit;
    const sources: StripSource[] = [];
    const add = (key: string, def: VisualDef | undefined): void => {
      if (!def || this.force) return;
      const headLu = -def.anchors.head.y;
      if (def.kind === 'atlas') sources.push({ kind: 'atlas', url: this.atlasUrl(def.source), heightLu: def.heightLu, headLu });
      const puppet = def.kind === 'procedural' && key !== visualId ? puppetById(def.source) : undefined;
      if (puppet) sources.push({ kind: 'puppet', key, puppet, def, headLu, aura: this.quality === 'high' });
    };
    if (skinned) add(skinned.key, skinned.def);
    add(visualId, this.resolve(visualId)?.def);
    const art = sources.length > 0 ? spriteStripArt({ sources, clip, size, side, preset: this.preset }) : Promise.resolve(null);
    this.portraits.set(
      cacheKey,
      art.then((a) => a?.url ?? '').catch(() => ''),
    );
    this.portraits.set(
      `${cacheKey}|info`,
      art.then((a) => (a ? stripInfoUrl(a.info) : '')).catch(() => ''),
    );
    return this.portraits.get(part ? `${cacheKey}|${part}` : cacheKey) ?? Promise.resolve('');
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
