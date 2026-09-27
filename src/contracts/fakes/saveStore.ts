/**
 * In-memory `SaveStore` (DESIGN C2/WP0 task 5, B8) plus a minimal valid-shaped `SaveDoc` for UI tests.
 *
 * Differences from the real store (WP8): no debounce, no slots or checksums, no migrations, and the
 * export code is plain base64url JSON with a `fake1.` prefix instead of fflate-deflated JSON.
 * Docs are deep-copied on the way in and out so tests cannot mutate stored state by accident.
 */
import type { AgeId, Result } from '../ids';
import type { ReplayDoc } from '../sim';
import type { SaveDoc, SaveStore } from '../save';
import { FAKE_EPOCH_MS } from './clock';
import { fakeContent, fakeLoadouts } from './content';

/** Replay ring size (DESIGN B8: `ageborn.replays`, ring of 20). */
export const FAKE_REPLAY_RING = 20;

const CODE_PREFIX = 'fake1.';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export class InMemorySaveStore implements SaveStore {
  private doc: SaveDoc | null;
  private replays: ReplayDoc[] = [];
  /** Number of `save` calls, and how many were `immediate`. */
  saves = 0;
  immediateSaves = 0;

  constructor(initial: SaveDoc | null = null) {
    this.doc = initial ? clone(initial) : null;
  }

  async load(): Promise<SaveDoc | null> {
    return this.doc ? clone(this.doc) : null;
  }

  async save(doc: SaveDoc, o?: { immediate?: boolean }): Promise<void> {
    this.doc = clone(doc);
    this.saves++;
    if (o?.immediate) this.immediateSaves++;
  }

  exportCode(doc: SaveDoc): string {
    return CODE_PREFIX + toBase64Url(JSON.stringify(doc));
  }

  importCode(code: string): Result<SaveDoc> {
    const trimmed = code.trim();
    if (!trimmed.startsWith(CODE_PREFIX)) return { ok: false, reason: 'badPrefix' };
    try {
      const doc = JSON.parse(fromBase64Url(trimmed.slice(CODE_PREFIX.length))) as unknown;
      if (doc === null || typeof doc !== 'object' || typeof (doc as { v?: unknown }).v !== 'number') {
        return { ok: false, reason: 'notASave' };
      }
      return { ok: true, value: doc as SaveDoc };
    } catch {
      return { ok: false, reason: 'corrupt' };
    }
  }

  loadReplays(): ReplayDoc[] {
    return clone(this.replays);
  }

  pushReplay(r: ReplayDoc): void {
    this.replays.push(clone(r));
    if (this.replays.length > FAKE_REPLAY_RING) this.replays.splice(0, this.replays.length - FAKE_REPLAY_RING);
  }
}

/**
 * A fresh-looking save that owns the fake cards at level 1. Ages without fake cards reuse the
 * Medieval loadout so `Record<AgeId, Loadout>` stays total; the real `newSave` is WP7's.
 */
export function fakeSaveDoc(overrides: Partial<SaveDoc> = {}): SaveDoc {
  const collection: SaveDoc['collection'] = {};
  for (const id of [...Object.keys(fakeContent.units), ...Object.keys(fakeContent.turrets)]) {
    collection[id] = { level: 1, copies: 0, isNew: false, foil: 'none' };
  }
  const loadouts = {} as Record<AgeId, SaveDoc['warPlans'][number]['loadouts'][AgeId]>;
  for (const age of Object.keys(fakeContent.ages) as AgeId[]) {
    loadouts[age] = clone(age === 'stone' ? fakeLoadouts.stone : fakeLoadouts.medieval);
  }
  const doc: SaveDoc = {
    v: 1,
    createdAt: FAKE_EPOCH_MS,
    profile: { name: 'Player', avatar: { seed: 1, parts: {} }, banner: 'default', frame: 'default', title: '' },
    currencies: { amber: 0, dust: 0 },
    trophies: { current: 0, best: 0, roadClaimed: [] },
    arenaIndex: 0,
    collection,
    powersOwned: Object.keys(fakeContent.powers),
    skins: { owned: [], equipped: {} },
    cosmetics: { owned: [] },
    warPlans: [{ name: 'Plan 1', loadouts }],
    activePlan: 0,
    capsules: {
      pending: [],
      charges: 0,
      chargesUpdatedAt: FAKE_EPOCH_MS,
      freeCapsulesLeft: 0,
      clayMeter: 0,
      dailyBank: 0,
      dailyNextAt: null,
      bag: [],
      wardrobe: [],
    },
    pity: { sinceEpic: 0, sinceLegendary: 0, sinceNewCard: 0, opened: 0, wardrobeSinceEpic: 0, wardrobeSinceLegendary: 0 },
    rng: { capsule: [1, 2, 3, 4] },
    scriptStep: 0,
    quests: { daily: [], rerollUsed: false, dayKey: '2026-01-01', weekly: { id: 'none', progress: 0, claimed: false }, weekKey: '2026-W01' },
    codexPoints: 0,
    codexLevel: 1,
    mmr: 0,
    lossStreak: 0,
    matchesPlayed: 0,
    daily: { dayKey: '2026-01-01', won: false },
    conquest: { stars: {}, milestonesClaimed: [] },
    stats: {
      matches: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winsByTier: [],
      lossesByTier: [],
      trainedByCard: {},
      fastestWinMs: null,
      futureReached: 0,
    },
    settings: {
      volume: { master: 1, music: 1, sfx: 1, ui: 1 },
      graphics: 'auto',
      reduceMotion: false,
      shake: 1,
      hitstop: true,
      damageNumbers: 'important',
      teamPreset: 'default',
      locale: 'en',
      defaultSpeed: 1,
      vibrate: true,
      mutedEmotes: false,
    },
    tutorial: { step: 0, hintsShown: {} },
    lastExportAt: null,
    flags: {},
  };
  return { ...doc, ...overrides };
}
