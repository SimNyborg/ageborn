/**
 * Service wiring (DESIGN B11 Boot, C2/WP11 "services.ts builds real or fake implementations and
 * injects ArtProvider and AudioService").
 *
 * Every service the app uses is built here, from a `ServiceChoice` that picks the real
 * implementation or a stand-in per service. Loaders are dynamic imports, so a stand-in that is not
 * chosen is never downloaded, and the contracts' fakes stay out of the main chunk.
 *
 * Phase 1 status (what "real" means today):
 * - content (WP1), sim (WP2), bots (WP3 `createBot`) and art (WP4) have real implementations. The
 *   bot stand-in `fallbackBot.ts` (honest, same API) stays available as `?bots=fallback`.
 * - audio (WP6), save (WP8) and meta (WP7) use the recording fake audio, the in-memory store and no
 *   meta. Phase 2 adds their real loaders to `LOADERS` below and flips `DEFAULT_CHOICE`; nothing
 *   else in the app changes, because everything downstream only sees the contracts.
 *
 * URL overrides for dev and tests: `?svc=fake` (every fake), or per service, for example
 * `?sim=fake&art=fake`. A fake sim forces fake content (its canned events use the fake cards).
 */
import type { ArtProvider, AudioService, Clock, CompiledContent, CreateBot, CreateSim, Meta, PlatformAdapter, SaveStore, TeamPreset } from '@/contracts';
import { i18n as appI18n, type I18nService } from '@/i18n';
import { createPlatform } from '@/platform';
import { EventLog, type KeyValueStore } from './eventLog';
import { createFallbackBot } from './fallbackBot';

export interface ServiceChoice {
  content: 'real' | 'fake';
  sim: 'real' | 'fake';
  bots: 'real' | 'fallback';
  art: 'real' | 'fake';
  audio: 'real' | 'fake';
  save: 'real' | 'memory';
  meta: 'real' | 'none';
}

export type ServiceName = keyof ServiceChoice;

/** What the app builds by default. Phase 2 switches audio, save and meta to 'real'. */
export const DEFAULT_CHOICE: ServiceChoice = {
  content: 'real',
  sim: 'real',
  bots: 'real',
  art: 'real',
  audio: 'fake',
  save: 'memory',
  meta: 'none',
};

/** Every stand-in (unit tests, `?svc=fake`). */
export const FAKE_CHOICE: ServiceChoice = {
  content: 'fake',
  sim: 'fake',
  bots: 'fallback',
  art: 'fake',
  audio: 'fake',
  save: 'memory',
  meta: 'none',
};

/** Options for building an art provider (from the player's settings, B6 presets). */
export interface ArtOptions {
  quality?: 'high' | 'lite';
  dpr?: number;
  teamPreset?: TeamPreset;
  /** `?art=placeholder|procedural|atlas|spine` (B5). */
  search?: string;
}

export interface SimService {
  createSim: CreateSim;
  /** Recorded in replays (B3). */
  simVersion: string;
}

export interface Services {
  /** What was actually built (a missing real implementation falls back to its stand-in). */
  readonly choice: ServiceChoice;
  readonly content: CompiledContent;
  readonly sim: SimService;
  readonly createBot: CreateBot;
  /** Builds the art provider; the app injects it into render and capsule (B2). */
  readonly createArt: (o?: ArtOptions) => ArtProvider;
  readonly audio: AudioService;
  readonly saveStore: SaveStore;
  /** Null until WP7's meta rules are wired (Phase 2): matches then end without rewards. */
  readonly meta: Meta | null;
  readonly clock: Clock;
  readonly platform: PlatformAdapter;
  readonly i18n: I18nService;
  readonly eventLog: EventLog;
}

type Loader<T> = () => Promise<T>;

interface Loaders {
  content: Partial<Record<ServiceChoice['content'], Loader<CompiledContent>>>;
  sim: Partial<Record<ServiceChoice['sim'], Loader<SimService>>>;
  bots: Partial<Record<ServiceChoice['bots'], Loader<CreateBot>>>;
  art: Partial<Record<ServiceChoice['art'], Loader<(o?: ArtOptions) => ArtProvider>>>;
  audio: Partial<Record<ServiceChoice['audio'], Loader<AudioService>>>;
  save: Partial<Record<ServiceChoice['save'], Loader<SaveStore>>>;
  meta: Partial<Record<ServiceChoice['meta'], Loader<Meta | null>>>;
}

/** The implementations this build can load, per service and choice. */
export const LOADERS: Loaders = {
  content: {
    real: async () => (await import('@/content')).content,
    fake: async () => (await import('@/contracts/fakes/content')).fakeContent,
  },
  sim: {
    real: async () => {
      const m = await import('@/sim');
      return { createSim: m.createSim, simVersion: m.SIM_VERSION };
    },
    fake: async () => {
      const m = await import('@/contracts/fakes/sim');
      return { createSim: (cfg) => m.createFakeSim({ config: cfg }), simVersion: 'fake-sim' };
    },
  },
  bots: {
    real: async () => (await import('@/ai')).createBot,
    fallback: async () => createFallbackBot,
  },
  art: {
    real: async () => {
      const m = await import('@/visuals');
      return (o: ArtOptions = {}) =>
        m.createArtProvider({
          force: m.artOverrideFromUrl(o.search ?? ''),
          quality: o.quality ?? 'high',
          dpr: o.dpr ?? 1,
          teamPreset: o.teamPreset ?? 'default',
        });
    },
    fake: async () => {
      const m = await import('@/contracts/fakes/art');
      return () => new m.FakeArtProvider();
    },
  },
  audio: {
    // real: WP6 `WebAudioService` from '@/audio' (Phase 2).
    fake: async () => new (await import('@/contracts/fakes/audio')).FakeAudio(),
  },
  save: {
    // real: WP8 localStorage store from '@/save' (Phase 2).
    memory: async () => new (await import('@/contracts/fakes/saveStore')).InMemorySaveStore(),
  },
  meta: {
    // real: WP7 meta rules from '@/meta' (Phase 2).
    none: async () => null,
  },
};

/** The stand-in used when a chosen implementation is not in this build. */
const FALLBACK: ServiceChoice = { content: 'fake', sim: 'fake', bots: 'fallback', art: 'fake', audio: 'fake', save: 'memory', meta: 'none' };

/** Reads `?svc=fake` and per-service overrides from a URL query. */
export function choiceFromUrl(search: string, base: ServiceChoice = DEFAULT_CHOICE): ServiceChoice {
  const q = new URLSearchParams(search);
  const out: ServiceChoice = q.get('svc') === 'fake' ? { ...FAKE_CHOICE } : { ...base };
  const set = <K extends ServiceName>(k: K, allowed: readonly ServiceChoice[K][]): void => {
    const v = q.get(k);
    if (v !== null && (allowed as readonly string[]).includes(v)) out[k] = v as ServiceChoice[K];
  };
  set('content', ['real', 'fake']);
  set('sim', ['real', 'fake']);
  set('bots', ['real', 'fallback']);
  set('art', ['real', 'fake']);
  set('audio', ['real', 'fake']);
  set('save', ['real', 'memory']);
  set('meta', ['real', 'none']);
  return normalizeChoice(out);
}

/** A fake sim only runs on the fake content (its canned events name fake cards and positions). */
export function normalizeChoice(c: ServiceChoice): ServiceChoice {
  return c.sim === 'fake' ? { ...c, content: 'fake' } : { ...c };
}

async function load<K extends ServiceName, T>(
  name: K,
  table: Partial<Record<ServiceChoice[K], Loader<T>>>,
  want: ServiceChoice[K],
  built: ServiceChoice,
  warn: (msg: string) => void,
): Promise<T> {
  const direct = table[want];
  if (direct) {
    built[name] = want;
    return direct();
  }
  const fb = FALLBACK[name] as ServiceChoice[K];
  const loader = table[fb];
  if (!loader) throw new Error(`services: no implementation for ${name}`);
  warn(`[services] ${name}: "${want}" is not in this build yet, using "${fb}"`);
  built[name] = fb;
  return loader();
}

export interface BuildServicesOptions {
  choice?: ServiceChoice;
  clock?: Clock;
  platformName?: string;
  i18n?: I18nService;
  /** Storage for the event log (localStorage in the browser). */
  storage?: KeyValueStore | null;
  warn?: (msg: string) => void;
}

/** A wall clock for meta and the event log (DESIGN B2: meta gets time only through a Clock). */
export const systemClock: Clock = { now: () => Date.now() };

/** Builds every service for the chosen implementations (B11 Boot). */
export async function buildServices(o: BuildServicesOptions = {}): Promise<Services> {
  const want = normalizeChoice(o.choice ?? DEFAULT_CHOICE);
  const built: ServiceChoice = { ...want };
  const warn = o.warn ?? (() => undefined);
  const [content, sim, createBot, createArt, audio, saveStore, meta] = await Promise.all([
    load('content', LOADERS.content, want.content, built, warn),
    load('sim', LOADERS.sim, want.sim, built, warn),
    load('bots', LOADERS.bots, want.bots, built, warn),
    load('art', LOADERS.art, want.art, built, warn),
    load('audio', LOADERS.audio, want.audio, built, warn),
    load('save', LOADERS.save, want.save, built, warn),
    load('meta', LOADERS.meta, want.meta, built, warn),
  ]);
  const clock = o.clock ?? systemClock;
  return {
    choice: built,
    content,
    sim,
    createBot,
    createArt,
    audio,
    saveStore,
    meta,
    clock,
    platform: createPlatform(o.platformName ?? 'none'),
    i18n: o.i18n ?? appI18n,
    eventLog: new EventLog({ clock, store: o.storage ?? null }),
  };
}
