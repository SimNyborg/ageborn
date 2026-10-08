/**
 * Valibot schema of `ReplayDoc` (DESIGN B3 Replays, B13 Schemas). The replay ring validates every
 * entry it reads back, so a damaged replay is dropped instead of reaching the replay player.
 *
 * Shape and types only: whether a replay can still be played (`contentHash`, `simVersion`) is the
 * replay player's question (WP11), and command legality is the sim's.
 */
import * as v from 'valibot';
import type { EmoteId, ReplayDoc } from '@/contracts';
import { AvatarSchema, validateWith, type Validation } from './schema';

const num = v.pipe(v.number(), v.finite());
const int = v.pipe(v.number(), v.integer());
const SIDE = v.picklist([0, 1]);
/** Seven tray slots from SIM_VERSION 7.4.0 (A18.9); six from 3.0.0; older replays only use 0-4. */
const SLOT7 = v.picklist([0, 1, 2, 3, 4, 5, 6]);
const MOUNT = v.picklist([0, 1, 2, 3]);
const SLOT2 = v.picklist([0, 1]);
const bool2 = v.tuple([v.boolean(), v.boolean()]);
/** `EmoteId`: a starter emote, `emote.<id>` or `quote.<id>` (A18.9.4); the sim checks ids against the content. */
const EMOTE_RE = /^(laugh|salute|cry|angry|thumbsUp|gg|(emote|quote)\.[a-z0-9_]{1,40})$/;

function partialPerAge<TSchema extends v.GenericSchema>(schema: TSchema) {
  return v.object({
    stone: v.optional(schema),
    bronze: v.optional(schema),
    medieval: v.optional(schema),
    gunpowder: v.optional(schema),
    industrial: v.optional(schema),
    modern: v.optional(schema),
    future: v.optional(schema),
    cosmic: v.optional(schema),
  });
}

/** A loadout as recorded: 7 unit slots from SIM_VERSION 7.4.0, 6 from 3.0.0, 5 in older replays (their cards stay, D8). */
const ReplayLoadoutSchema = v.object({
  units: v.pipe(v.array(v.nullable(v.string())), v.minLength(5), v.maxLength(7)),
  turrets: v.pipe(v.array(v.nullable(v.string())), v.length(2)),
  // Two typed power slots from SIM_VERSION 4.0.0 (A2.9.1)
  powers: v.object({ home: v.nullable(v.string()), field: v.nullable(v.string()) }),
  // The Fort slot from SIM_VERSION 5.0.0 (A16.14.1); absent in older replays
  fort: v.optional(v.nullable(v.string())),
});

/** A loadout of a replay recorded before SIM_VERSION 4.0.0: one power (kept for its result card, D8). */
const LegacyReplayLoadoutSchema = v.object({
  units: v.pipe(v.array(v.nullable(v.string())), v.minLength(5), v.maxLength(6)),
  turrets: v.pipe(v.array(v.nullable(v.string())), v.length(2)),
  power: v.string(),
});

const POWER_SLOT = v.picklist(['home', 'field']);

export const SideConfigSchema = v.object({
  label: v.string(),
  isBot: v.boolean(),
  loadouts: partialPerAge(ReplayLoadoutSchema),
  // A18.11 per-side modifiers (boss bases, relics)
  sideMods: v.optional(
    v.object({
      baseHpBp: v.optional(int),
      extraTurret: v.optional(v.string()),
      unitDamageBp: v.optional(int),
      unitHpBp: v.optional(int),
      unitSpeedBp: v.optional(int),
      unitAttackSpeedBp: v.optional(int),
    }),
  ),
  levels: v.record(v.string(), int),
  skins: v.record(v.string(), v.string()),
  // A18.9.4 base cosmetics (presentation only); keys are not checked against the content
  look: v.optional(
    v.object({
      baseFlag: v.optional(v.nullable(v.string())),
      nationalFlag: v.optional(v.nullable(v.string())),
      baseSkins: v.optional(partialPerAge(v.string())),
      decorations: v.optional(v.array(v.nullable(v.string()))),
      backdrop: v.optional(v.nullable(v.string())),
    }),
  ),
  // The side shown as an online player (owner decision 2026-10-07; presentation only): the replay
  // shows the same player as the match did.
  online: v.optional(
    v.object({
      name: v.pipe(v.string(), v.minLength(1), v.maxLength(32)),
      avatar: AvatarSchema,
      trophies: int,
      arena: int,
      banner: v.string(),
      bars: v.picklist([1, 2, 3]),
    }),
  ),
});

export const TrainingEventSchema = v.object({
  tick: int,
  side: SIDE,
  grantGold: v.optional(int),
  unlockSlot: v.optional(int),
  setPowerPpm: v.optional(v.object({ slot: POWER_SLOT, ppm: int })),
});

export const TrainingSchema = v.object({
  enemyBaseStartBp: v.optional(int),
  noClock: v.optional(v.boolean()),
  script: v.optional(v.array(TrainingEventSchema)),
  manualLastStand: v.optional(bool2),
  stanceEnabled: v.optional(bool2),
  trays: v.optional(partialPerAge(v.array(int))),
});

/** A command plus its stamp (`TimedCommand` = `Command & { tick, seq }`). */
function cmd<const TEntries extends v.ObjectEntries>(entries: TEntries) {
  return v.object({ ...entries, tick: int, seq: int });
}

export const TimedCommandSchema = v.variant('t', [
  cmd({ t: v.literal('train'), side: SIDE, slot: SLOT7 }),
  cmd({ t: v.literal('cancelTrain'), side: SIDE, slot: v.optional(SLOT7) }),
  cmd({ t: v.literal('buildTurret'), side: SIDE, mount: MOUNT, slot: SLOT2 }),
  cmd({ t: v.literal('replaceTurret'), side: SIDE, mount: MOUNT, slot: SLOT2 }),
  cmd({ t: v.literal('sellTurret'), side: SIDE, mount: MOUNT }),
  cmd({ t: v.literal('buyMount'), side: SIDE }),
  // A18.5 War Council (SIM_VERSION 3.0.0)
  cmd({
    t: v.literal('research'),
    side: SIDE,
    track: v.picklist(['troops', 'defences', 'economy', 'command']),
    group: v.optional(v.picklist(['infantry', 'ranged', 'heavy', 'antiArmor', 'support'])),
    rank: v.picklist([1, 2, 3]),
    pick: v.picklist([0, 1]),
  }),
  cmd({ t: v.literal('researchCancel'), side: SIDE }),
  cmd({ t: v.literal('evolve'), side: SIDE }),
  // A2.9 two power slots (SIM_VERSION 4.0.0)
  cmd({ t: v.literal('power'), side: SIDE, slot: POWER_SLOT, p: v.optional(num) }),
  // A18.4.2 three stances and the Hold flag
  cmd({ t: v.literal('stance'), side: SIDE, mode: v.picklist(['charge', 'hold', 'fallback']), holdP: v.optional(num) }),
  // A16.14.2: place the loadout's Fort card on pad 0-4 (SIM_VERSION 5.0.0)
  cmd({ t: v.literal('fort'), side: SIDE, pad: v.picklist([0, 1, 2, 3, 4]) }),
  cmd({ t: v.literal('lastStand'), side: SIDE }),
  // A starter emote, a collected emote (`emote.<id>`) or a fixed quote (`quote.<id>`, A18.9.4)
  cmd({ t: v.literal('emote'), side: SIDE, emote: v.custom<EmoteId>((x) => typeof x === 'string' && EMOTE_RE.test(x), 'unknown emote') }),
  cmd({ t: v.literal('retreat'), side: SIDE }),
]);

export const MatchOutcomeSchema = v.object({
  winner: v.nullable(SIDE),
  reason: v.picklist(['baseDestroyed', 'bothDestroyed', 'finalBell', 'retreat', 'objective']),
  tick: int,
  baseHpBp: v.tuple([int, int]),
});

export const ReplayDocSchema = v.object({
  v: v.literal(1),
  simVersion: v.string(),
  contentHash: v.string(),
  seed: int,
  // An open format key (A18.3.4): a named format or a window such as `short.bronze`
  format: v.pipe(v.string(), v.minLength(1)),
  sides: v.tuple([SideConfigSchema, SideConfigSchema]),
  modifiers: v.array(v.string()),
  // `MatchConfig['training']` is optional, so the contract allows undefined; JSON drops undefined keys,
  // so a missing key reads back as null (what the sim's `buildReplay` writes).
  training: v.optional(v.union([TrainingSchema, v.null(), v.undefined()]), null),
  victory: v.optional(
    v.variant('kind', [
      v.object({ kind: v.literal('survive'), atMs: int, side: v.optional(SIDE) }),
      v.object({ kind: v.literal('target'), mount: int, hp: int, side: v.optional(SIDE) }),
    ]),
  ),
  commands: v.array(TimedCommandSchema),
  result: MatchOutcomeSchema,
  finalHash: int,
  hashes: v.array(int),
});

/**
 * Commands of replays recorded before SIM_VERSION 4.0.0: the Treasury and the two-stance toggle (before
 * 3.0.0) and the one-slot power command (before 4.0.0). Such a replay keeps its result card (owner
 * decision D8); the replay player refuses to play it because its `simVersion` differs.
 */
const LegacyTimedCommandSchema = v.union([
  TimedCommandSchema,
  cmd({ t: v.literal('power'), side: SIDE, p: v.optional(num) }),
  cmd({ t: v.literal('treasury'), side: SIDE }),
  cmd({ t: v.literal('stance'), side: SIDE, stance: v.picklist(['charge', 'hold']) }),
]);
const LegacySideConfigSchema = v.object({
  ...SideConfigSchema.entries,
  loadouts: partialPerAge(v.union([ReplayLoadoutSchema, LegacyReplayLoadoutSchema])),
});
const LegacyTrainingSchema = v.object({
  ...TrainingSchema.entries,
  script: v.optional(v.array(v.object({ ...TrainingEventSchema.entries, setPowerPpm: v.optional(v.union([int, v.object({ slot: POWER_SLOT, ppm: int })])) }))),
});
const LegacyReplayDocSchema = v.object({
  ...ReplayDocSchema.entries,
  sides: v.tuple([LegacySideConfigSchema, LegacySideConfigSchema]),
  training: v.optional(v.union([LegacyTrainingSchema, v.null(), v.undefined()]), null),
  commands: v.array(LegacyTimedCommandSchema),
});

/** Validates a stored replay: the current shape, else a pre-4.0.0 replay kept for its result card (D8). */
export function validateReplay(input: unknown): Validation<ReplayDoc> {
  const r = validateWith(ReplayDocSchema, input);
  if (r.ok) return r;
  const legacy = validateWith(LegacyReplayDocSchema, input);
  return legacy.ok ? (legacy as unknown as Validation<ReplayDoc>) : r;
}
