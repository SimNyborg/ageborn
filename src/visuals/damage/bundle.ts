/**
 * The per-age damage bundles (contract C1, written by the art pipeline: `public/art/damage/<age>.json`, outside the
 * unit sheet folders because every JSON there reads as a unit sheet). A bundle holds, per unit, its damage family,
 * its authored spots with their per-frame placement, and per-frame torso boxes and head points (item 38 B0).
 *
 * Bundles load once per age, on first use, in the background (no view waits for one: a unit drawn before its bundle
 * arrives shows the effects-only fallback, then picks its spots up on its next frame). A missing or broken bundle is a
 * warning, never an error. Checked loosely on load: entries that do not fit the schema are dropped one by one.
 */
import type { AgeId } from '@/contracts/ids';
import { DAMAGE_FAMILIES, EMIT_MEDIA, MARK_MATS, type DamageBundle, type DamageFamily, type DamageSpot, type DamageUnitData, type SpotFrame } from './types';

export const DAMAGE_AGES: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

/** `art/damage/<age>.json`, relative to the app base. */
export function damageBundleSource(age: AgeId): string {
  return `art/damage/${age}.json`;
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function frames<T extends readonly number[]>(v: unknown, len: number): T[] | null {
  if (!Array.isArray(v)) return null;
  for (const f of v) if (f !== null && !(Array.isArray(f) && f.length >= len && f.slice(0, len).every(isNum))) return null;
  return v as T[];
}

function spotOk(s: unknown): s is DamageSpot {
  if (typeof s !== 'object' || s === null) return false;
  const o = s as Record<string, unknown>;
  if (typeof o['id'] !== 'string' || !isNum(o['r'])) return false;
  const kind = o['kind'];
  const mat = o['mat'];
  if (kind === 'emit') return (EMIT_MEDIA as readonly unknown[]).includes(mat);
  return (kind === 'mark' || kind === 'strip') && (MARK_MATS as readonly unknown[]).includes(mat);
}

/** One unit's entry, or null when it does not fit the schema (the unit then uses the fallback). */
export function parseDamageUnit(v: unknown): DamageUnitData | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (!(DAMAGE_FAMILIES as readonly unknown[]).includes(o['family'])) return null;
  const out: { family: DamageFamily; spots?: DamageSpot[]; clips?: Record<string, Record<string, SpotFrame[]>>; torso?: Record<string, [number, number, number, number][]>; head?: Record<string, [number, number][]> } = {
    family: o['family'] as DamageFamily,
  };
  if (Array.isArray(o['spots'])) out.spots = (o['spots'] as unknown[]).filter(spotOk);
  if (typeof o['clips'] === 'object' && o['clips'] !== null) {
    const clips: Record<string, Record<string, SpotFrame[]>> = {};
    for (const [clip, per] of Object.entries(o['clips'] as Record<string, unknown>)) {
      if (typeof per !== 'object' || per === null) continue;
      const c: Record<string, SpotFrame[]> = {};
      for (const [id, list] of Object.entries(per as Record<string, unknown>)) {
        const f = frames<SpotFrame>(list, 5);
        if (f) c[id] = f;
      }
      clips[clip] = c;
    }
    out.clips = clips;
  }
  for (const key of ['torso', 'head'] as const) {
    const t = o[key];
    if (typeof t !== 'object' || t === null) continue;
    const m: Record<string, never[]> = {};
    for (const [clip, list] of Object.entries(t as Record<string, unknown>)) {
      const f = frames(list, key === 'torso' ? 4 : 2);
      if (f) m[clip] = f as never[];
    }
    (out as Record<string, unknown>)[key] = m;
  }
  return out;
}

/** A whole bundle; unknown or broken entries are left out. */
export function parseDamageBundle(v: unknown): DamageBundle | null {
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (o['v'] !== 1 || typeof o['units'] !== 'object' || o['units'] === null) return null;
  const units: Record<string, DamageUnitData> = {};
  for (const [slug, e] of Object.entries(o['units'] as Record<string, unknown>)) {
    const u = parseDamageUnit(e);
    if (u) units[slug] = u;
  }
  return { v: 1, units };
}

/** Loads a bundle's JSON (the page's `fetch`; tests pass their own). */
export type BundleFetch = (url: string) => Promise<unknown>;

const defaultFetch: BundleFetch = async (url) => {
  const r = await fetch(url);
  // a dev or preview server answers a file it does not have with the app's page (the SPA fallback): missing, as a 404
  const page = /text\/html/i.test(r.headers.get('content-type') ?? '');
  if (!r.ok || page) throw new Error(`${url}: ${page ? 404 : r.status}`);
  return (await r.json()) as unknown;
};

function baseUrl(): string {
  const env = (import.meta as unknown as { env?: { BASE_URL?: string } }).env;
  return env?.BASE_URL ?? '/';
}

/**
 * The bundles this page has loaded. One per page (the art provider's views share it); `version` counts arrivals, so a
 * view that drew without its entry checks again only when something new came in.
 */
export class DamageBundles {
  private readonly byAge = new Map<AgeId, DamageBundle | null>();
  private readonly loading = new Map<AgeId, Promise<void>>();
  private readonly units = new Map<string, DamageUnitData>();
  version = 0;

  constructor(
    private readonly fetchJson: BundleFetch = defaultFetch,
    private readonly base: () => string = baseUrl,
    private readonly warn: (msg: string) => void = (m) => console.warn(m),
  ) {}

  /** Starts loading an age's bundle once (later calls return the same promise; a failure is not retried). */
  request(age: AgeId): Promise<void> {
    const had = this.loading.get(age);
    if (had) return had;
    const p = this.fetchJson(`${this.base()}${damageBundleSource(age)}`)
      .then((json) => {
        const b = parseDamageBundle(json);
        if (!b) this.warn(`[damage] ${age}: not a damage bundle; units of this age use the fallback`);
        this.add(age, b);
      })
      .catch((e: unknown) => {
        // no bundle for this age yet (the pipeline writes them age by age): the effects-only fallback
        this.add(age, null);
        if (!/404/.test(String(e))) this.warn(`[damage] ${age}: ${String(e)}`);
      });
    this.loading.set(age, p);
    return p;
  }

  /** Puts a parsed bundle in place (the loader, and tests and the gallery). */
  add(age: AgeId, b: DamageBundle | null): void {
    this.byAge.set(age, b);
    if (b) for (const [slug, u] of Object.entries(b.units)) this.units.set(slug, u);
    this.version++;
  }

  loaded(age: AgeId): boolean {
    return this.byAge.has(age);
  }

  /** A unit's entry: the skin's own (`<slug>@<skin>`) when the bundle has one, else the unit's; null if neither. */
  entry(slug: string): DamageUnitData | null {
    return this.units.get(slug) ?? this.units.get(slug.split('@')[0] ?? slug) ?? null;
  }

  clear(): void {
    this.byAge.clear();
    this.loading.clear();
    this.units.clear();
    this.version++;
  }
}

/** The page's bundles (the atlas and procedural unit views read them). */
export const damageBundles = new DamageBundles();

/** A clip's spot, torso or head frame for unique frame `frame` (the last one when the list is shorter), or null. */
export function frameOf<T>(list: readonly (T | null)[] | undefined, frame: number): T | null {
  if (!list || list.length === 0) return null;
  const i = Math.max(0, Math.min(list.length - 1, frame | 0));
  return list[i] ?? null;
}
