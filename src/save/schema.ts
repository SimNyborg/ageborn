/**
 * Valibot schema of the current `SaveDoc` (DESIGN B8 Load order step 4, B13 Schemas).
 *
 * The schema checks shape and types exactly (a type-parity test pins `InferOutput` to the contract's
 * `SaveDoc`), plus the invariants other code relies on: finite numbers, integer counts that are never
 * negative, 6 unit (A18.9) and 2 turret slots per loadout, a War Plan for every age, an `activePlan` that
 * points into `warPlans`, and a uint32 capsule RNG state.
 *
 * It deliberately does not check ids against the content (cards and skins come and go between
 * builds; meta handles unknown ids) and does not re-check meta rules. Unknown keys are stripped.
 *
 * Settings are the one forgiving part: every field falls back to its default on its own, so a bad
 * slider value never costs a whole profile (DESIGN B8 step 5 would otherwise start a fresh save).
 *
 * A change here needs a new save version and migration (see `migrations/index.ts`).
 */
import * as v from 'valibot';
import type { SaveDoc } from '@/contracts';
import { DEFAULT_SETTINGS, defaultSettings } from './defaults';
import { SAVE_VERSION } from './migrations';

// ---------------------------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------------------------

/** Any finite number (JSON cannot hold NaN or Infinity; `JSON.stringify` would turn them into null). */
const num = v.pipe(v.number(), v.finite());
const int = v.pipe(v.number(), v.integer());
const count = v.pipe(v.number(), v.integer(), v.minValue(0));
/** Epoch milliseconds. Only finiteness is required: clocks may be fractional or set in the past. */
const time = num;
const id = v.pipe(v.string(), v.minLength(1));
const uint32 = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(0xffffffff));
const unit01 = v.pipe(v.number(), v.finite(), v.minValue(0), v.maxValue(1));

/** The eight ages (A17.8); save version 2 added Bronze, Industrial and Cosmic. */
export const AGE_IDS = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'] as const;
const AGE = v.picklist(AGE_IDS);
const RARITY = v.picklist(['common', 'rare', 'epic', 'legendary']);
const SKIN_RARITY = v.picklist(['rare', 'epic', 'legendary']);
const TIER = v.picklist(['clay', 'bronze', 'silver', 'jade', 'gold', 'platinum', 'aeon']);
const FOIL = v.picklist(['none', 'bronze', 'silver', 'holo']);
const CAPSULE_KIND = v.picklist(['win', 'daily', 'road', 'meter', 'age', 'codex', 'conquest', 'ageUnlock', 'warPath']);
const CRATE_SOURCE = v.picklist(['codex', 'weekly', 'road', 'aeon', 'welcome']);

// ---------------------------------------------------------------------------------------------
// Parts
// ---------------------------------------------------------------------------------------------

/**
 * One age of a War Plan: 6 unit slots (A18.9; 5 before save v4), 2 turret slots, the Home and Field power
 * slots (A2.9.1; one `power` before save v7).
 */
export const LoadoutSchema = v.object({
  units: v.pipe(v.array(v.nullable(id)), v.length(6)),
  turrets: v.pipe(v.array(v.nullable(id)), v.length(2)),
  powers: v.object({ home: v.nullable(id), field: v.nullable(id) }),
  // The Fort slot (A16.14.1, save v11): a Fort card or null
  fort: v.optional(v.nullable(id)),
});

export const WarPlanSchema = v.object({
  name: v.string(),
  loadouts: v.object({
    stone: LoadoutSchema,
    bronze: LoadoutSchema,
    medieval: LoadoutSchema,
    gunpowder: LoadoutSchema,
    industrial: LoadoutSchema,
    modern: LoadoutSchema,
    future: LoadoutSchema,
    cosmic: LoadoutSchema,
  }),
});

export const AvatarSchema = v.object({
  seed: int,
  parts: v.record(v.string(), num),
  portraitCard: v.optional(id),
});

const d = DEFAULT_SETTINGS;

/** Player settings; each field falls back to its default when missing or invalid. */
export const SettingsSchema = v.fallback(
  v.object({
    volume: v.fallback(
      v.object({
        master: v.fallback(unit01, d.volume.master),
        music: v.fallback(unit01, d.volume.music),
        sfx: v.fallback(unit01, d.volume.sfx),
        ui: v.fallback(unit01, d.volume.ui),
      }),
      () => ({ ...d.volume }),
    ),
    graphics: v.fallback(v.picklist(['auto', 'high', 'lite']), d.graphics),
    reduceMotion: v.fallback(v.boolean(), d.reduceMotion),
    shake: v.fallback(unit01, d.shake),
    hitstop: v.fallback(v.boolean(), d.hitstop),
    damageNumbers: v.fallback(v.picklist(['off', 'important', 'all']), d.damageNumbers),
    teamPreset: v.fallback(v.picklist(['default', 'blueYellow', 'highContrast']), d.teamPreset),
    locale: v.fallback(v.picklist(['en', 'da']), d.locale),
    defaultSpeed: v.fallback(v.picklist([1, 1.5, 2]), d.defaultSpeed),
    vibrate: v.fallback(v.boolean(), d.vibrate),
    mutedEmotes: v.fallback(v.boolean(), d.mutedEmotes),
    breakReminder: v.optional(v.fallback(v.boolean(), true)),
    quickReveal: v.optional(v.fallback(v.boolean(), false)),
    // A17.4 camera settings (optional; missing means On), so a stored choice survives a load
    autoCamera: v.optional(v.fallback(v.boolean(), true)),
    edgeScroll: v.optional(v.fallback(v.boolean(), true)),
  }),
  defaultSettings,
);

export const QuestSlotSchema = v.object({
  id: v.string(),
  progress: count,
  claimed: v.boolean(),
});

export const CapsuleStackSchema = v.object({
  card: id,
  rarity: RARITY,
  copies: count,
  isNew: v.boolean(),
  foil: FOIL,
  dust: count,
});

export const PendingCapsuleSchema = v.object({
  id,
  kind: CAPSULE_KIND,
  tier: TIER,
  startTier: TIER,
  scriptIndex: v.nullable(count),
  age: v.nullable(AGE),
  contents: v.object({
    stacks: v.array(CapsuleStackSchema),
    amber: count,
    dust: count,
    skin: v.nullable(id),
    cosmetic: v.optional(v.nullable(id)),
  }),
  createdAt: time,
});

export const PendingCrateSchema = v.object({
  id,
  source: CRATE_SOURCE,
  skin: id,
  rarity: SKIN_RARITY,
  duplicateDust: count,
  createdAt: time,
  cosmetic: v.optional(v.nullable(id)),
});

/** The equipped cosmetic collection items (A18.9.4, save v3; the backdrop since v8); keys are not checked against the content. */
export const CosmeticLoadoutSchema = v.object({
  emotes: v.array(id),
  quotes: v.array(id),
  baseFlag: v.nullable(id),
  nationalFlag: v.nullable(id),
  baseSkins: v.record(AGE, id),
  decorations: v.array(v.nullable(id)),
  /** The battle backdrop skin (save v8); null keeps each age's classic sky. */
  backdrop: v.nullable(id),
});

const flag3 = v.tuple([v.boolean(), v.boolean(), v.boolean()]);

// ---------------------------------------------------------------------------------------------
// The document
// ---------------------------------------------------------------------------------------------

export const SaveDocSchema = v.pipe(
  v.object({
    // The exact version is checked by `validateSaveDoc` (migrations run first).
    v: v.pipe(v.number(), v.integer(), v.minValue(1)),
    createdAt: time,
    profile: v.object({
      name: v.string(),
      avatar: AvatarSchema,
      banner: v.string(),
      frame: v.string(),
      title: v.string(),
    }),
    currencies: v.object({ amber: count, dust: count }),
    trophies: v.object({ current: int, best: int, roadClaimed: v.array(int) }),
    arenaIndex: count,
    collection: v.record(
      v.string(),
      v.object({ level: count, copies: count, isNew: v.boolean(), foil: FOIL }),
    ),
    powersOwned: v.array(id),
    // Fort cards owned (A16.14.6, save v11)
    fortsOwned: v.array(id),
    skins: v.object({ owned: v.array(id), equipped: v.record(v.string(), id) }),
    cosmetics: v.object({ owned: v.array(v.string()), equipped: CosmeticLoadoutSchema }),
    warPlans: v.pipe(v.array(WarPlanSchema), v.minLength(1)),
    activePlan: count,
    capsules: v.object({
      pending: v.array(PendingCapsuleSchema),
      /** Ready Sundial capsules, up to 34 (A6.3; capsule charges until save v10). */
      charges: count,
      /** Start of the Sundial's current 5 h period (epoch ms). */
      chargesUpdatedAt: time,
      freeCapsulesLeft: count,
      clayMeter: count,
      /** The Supply allowance left from before 2026-09-30 (A15.4); it never grows. */
      dailyBank: count,
      dailyNextAt: v.nullable(time),
      bag: v.array(int),
      /** The size of the bag `bag` belongs to (100 before the 2026-09-29 ladder, 200 after; 0 when empty). */
      bagSize: count,
      wardrobe: v.array(PendingCrateSchema),
    }),
    pity: v.object({
      sinceEpic: count,
      sinceLegendary: count,
      sinceNewCard: count,
      opened: count,
      wardrobeSinceEpic: count,
      wardrobeSinceLegendary: count,
    }),
    rng: v.object({
      capsule: v.tuple([uint32, uint32, uint32, uint32]),
      cosmetic: v.optional(v.tuple([uint32, uint32, uint32, uint32])),
    }),
    scriptStep: count,
    quests: v.object({
      daily: v.array(QuestSlotSchema),
      rerollUsed: v.boolean(),
      dayKey: v.string(),
      weekly: QuestSlotSchema,
      weekKey: v.string(),
    }),
    codexPoints: count,
    codexLevel: count,
    mmr: num,
    lossStreak: count,
    matchesPlayed: count,
    daily: v.object({ dayKey: v.string(), bank: count }),
    conquest: v.object({ stars: v.record(v.string(), flag3), milestonesClaimed: v.array(int) }),
    // A18.7.10 (save v5)
    warPath: v.object({
      path: v.picklist(['normal', 'veteran', 'legend']),
      stars: v.record(v.string(), v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(3))),
      crowns: v.record(v.string(), v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(5))),
      relics: v.array(v.string()),
      difficulty: v.picklist(['easy', 'normal', 'hard', 'expert', 'legendary']),
      lossStreak: count,
      legacy: v.boolean(),
    }),
    stats: v.object({
      matches: count,
      wins: count,
      losses: count,
      draws: count,
      winsByTier: v.array(count),
      lossesByTier: v.array(count),
      trainedByCard: v.record(v.string(), count),
      fastestWinMs: v.nullable(num),
      futureReached: count,
    }),
    settings: SettingsSchema,
    tutorial: v.object({ step: count, hintsShown: v.record(v.string(), count) }),
    lastExportAt: v.nullable(time),
    flags: v.record(v.string(), v.boolean()),
  }),
  v.forward(
    v.check((d) => d.activePlan < d.warPlans.length, 'activePlan must point into warPlans'),
    ['activePlan'],
  ),
);

// ---------------------------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------------------------

/** A validation result that is also a contract `Result<T>`; failures list readable issues. */
export type Validation<T> = { ok: true; value: T } | { ok: false; reason: 'invalid'; issues: string[] };

const MAX_ISSUES = 12;

/** `path: message` lines for the first issues (dev page, console, tests). */
export function describeIssues(issues: readonly v.BaseIssue<unknown>[]): string[] {
  return issues.slice(0, MAX_ISSUES).map((i) => `${v.getDotPath(i) ?? '(root)'}: ${i.message}`);
}

/** Runs `schema` and returns its output (unknown keys stripped, fallbacks applied) or the issues. */
export function validateWith<TSchema extends v.GenericSchema>(schema: TSchema, input: unknown): Validation<v.InferOutput<TSchema>> {
  const r = v.safeParse(schema, input);
  return r.success ? { ok: true, value: r.output } : { ok: false, reason: 'invalid', issues: describeIssues(r.issues) };
}

/**
 * Validates a doc of version `version` (default: the version this build writes). Run migrations
 * first; a doc of any other version is invalid here.
 */
export function validateSaveDoc(input: unknown, version: number = SAVE_VERSION): Validation<SaveDoc> {
  const r = validateWith(SaveDocSchema, input);
  if (r.ok && r.value.v !== version) return { ok: false, reason: 'invalid', issues: [`v: expected ${version} but received ${r.value.v}`] };
  return r;
}
