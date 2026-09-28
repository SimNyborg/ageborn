/**
 * Valibot schema of `ReplayDoc` (DESIGN B3 Replays, B13 Schemas). The replay ring validates every
 * entry it reads back, so a damaged replay is dropped instead of reaching the replay player.
 *
 * Shape and types only: whether a replay can still be played (`contentHash`, `simVersion`) is the
 * replay player's question (WP11), and command legality is the sim's.
 */
import * as v from 'valibot';
import type { EmoteId, ReplayDoc } from '@/contracts';
import { LoadoutSchema, validateWith, type Validation } from './schema';

const num = v.pipe(v.number(), v.finite());
const int = v.pipe(v.number(), v.integer());
const SIDE = v.picklist([0, 1]);
const SLOT5 = v.picklist([0, 1, 2, 3, 4]);
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

export const SideConfigSchema = v.object({
  label: v.string(),
  isBot: v.boolean(),
  loadouts: partialPerAge(LoadoutSchema),
  levels: v.record(v.string(), int),
  skins: v.record(v.string(), v.string()),
  // A18.9.4 base cosmetics (presentation only); keys are not checked against the content
  look: v.optional(
    v.object({
      baseFlag: v.optional(v.nullable(v.string())),
      nationalFlag: v.optional(v.nullable(v.string())),
      baseSkins: v.optional(partialPerAge(v.string())),
      decorations: v.optional(v.array(v.nullable(v.string()))),
    }),
  ),
});

export const TrainingEventSchema = v.object({
  tick: int,
  side: SIDE,
  grantGold: v.optional(int),
  unlockSlot: v.optional(int),
  setPowerPpm: v.optional(int),
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
  cmd({ t: v.literal('train'), side: SIDE, slot: SLOT5 }),
  cmd({ t: v.literal('cancelTrain'), side: SIDE, slot: v.optional(SLOT5) }),
  cmd({ t: v.literal('buildTurret'), side: SIDE, mount: MOUNT, slot: SLOT2 }),
  cmd({ t: v.literal('replaceTurret'), side: SIDE, mount: MOUNT, slot: SLOT2 }),
  cmd({ t: v.literal('sellTurret'), side: SIDE, mount: MOUNT }),
  cmd({ t: v.literal('buyMount'), side: SIDE }),
  cmd({ t: v.literal('treasury'), side: SIDE }),
  cmd({ t: v.literal('evolve'), side: SIDE }),
  cmd({ t: v.literal('power'), side: SIDE, p: v.optional(num) }),
  cmd({ t: v.literal('stance'), side: SIDE, stance: v.picklist(['charge', 'hold']) }),
  cmd({ t: v.literal('lastStand'), side: SIDE }),
  // A starter emote, a collected emote (`emote.<id>`) or a fixed quote (`quote.<id>`, A18.9.4)
  cmd({ t: v.literal('emote'), side: SIDE, emote: v.custom<EmoteId>((x) => typeof x === 'string' && EMOTE_RE.test(x), 'unknown emote') }),
  cmd({ t: v.literal('retreat'), side: SIDE }),
]);

export const MatchOutcomeSchema = v.object({
  winner: v.nullable(SIDE),
  reason: v.picklist(['baseDestroyed', 'bothDestroyed', 'finalBell', 'retreat']),
  tick: int,
  baseHpBp: v.tuple([int, int]),
});

export const ReplayDocSchema = v.object({
  v: v.literal(1),
  simVersion: v.string(),
  contentHash: v.string(),
  seed: int,
  format: v.picklist(['tutorial', 'short', 'standard', 'full']),
  sides: v.tuple([SideConfigSchema, SideConfigSchema]),
  modifiers: v.array(v.string()),
  // `MatchConfig['training']` is optional, so the contract allows undefined; JSON drops undefined keys,
  // so a missing key reads back as null (what the sim's `buildReplay` writes).
  training: v.optional(v.union([TrainingSchema, v.null(), v.undefined()]), null),
  commands: v.array(TimedCommandSchema),
  result: MatchOutcomeSchema,
  finalHash: int,
  hashes: v.array(int),
});

export function validateReplay(input: unknown): Validation<ReplayDoc> {
  return validateWith(ReplayDocSchema, input);
}
