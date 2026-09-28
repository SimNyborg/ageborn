/**
 * Onboarding scripts (DESIGN A8, A3 unlock order, A2.11): the data the tutorial director, Old
 * Grogg's scripted brain and the dev autopilot run on. Rules live in `director.ts`, `hints.ts`,
 * `grogg.ts` and `autopilot.ts`; everything tunable is here.
 *
 * Ticks are 50 ms (B3). The beats of match 1 were retimed from a scripted run of the real sim
 * (`test/retime.test.ts` replays it and pins the measured ticks in `MATCH1_TIMING`), as A8 asks.
 * On-screen text is at most 8 words (A8; a test counts the EN strings).
 *
 * Layering (B2): `tutorial` may import contracts, core and i18n only, so content arrives as a
 * `CompiledContent` argument and card ids here are plain data.
 */
import type { AgeId, CardId, CompiledContent, Loadout, Side, SimEvent, TrainingEvent } from '@/contracts';

/** 20 ticks per second (B3). */
export const TICKS_PER_SEC = 20;
export const sec = (s: number): number => Math.round(s * TICKS_PER_SEC);

/** HUD elements a prompt can point at. Mount targets name the mount index. */
export type PromptTarget =
  | 'card0'
  | 'card1'
  | 'card2'
  | 'card3'
  | 'card4'
  | 'gold'
  | 'mount0'
  | 'mount1'
  | 'mountBuy'
  | 'evolve'
  | 'power'
  | 'stance'
  | 'lastStand'
  /** The minimap strip under the clock (A17.5). */
  | 'minimap';

/** When a beat may show (evaluated every tick once the previous beat is over, if sequential). */
export type BeatTrigger =
  | { k: 'start' }
  | { k: 'atTick'; tick: number }
  /** The player's side killed an enemy unit (latched). */
  | { k: 'firstKill' }
  | { k: 'evolveReady' }
  /** The player's Age Power is fully charged. */
  | { k: 'powerReady' }
  | { k: 'ageUp'; age: AgeId }
  | { k: 'treasuryAffordable'; afterTick: number }
  /** A second mount is affordable and every owned mount is built on. */
  | { k: 'mountAffordable'; minAgeIndex: number }
  | { k: 'lastStandArmed' };

/** What ends a shown beat. */
export type BeatDone =
  /** A sim event of the player's side (for example `turretBuildStart`, `ascendStart`, `powerTelegraph`). */
  | { k: 'event'; e: SimEvent['e'] }
  /** The player trained the card in this tray slot. */
  | { k: 'trained'; slot: number }
  /** Shown for a fixed time. */
  | { k: 'shownFor'; ticks: number };

export interface Beat {
  id: string;
  /** i18n key in `tutorial.en.json`; null = a silent beat (logged only). */
  textKey: string | null;
  target: PromptTarget | null;
  /** An animated hand demonstrating a drag (A8 Arrow Storm). */
  hand?: 'powerDrag';
  trigger: BeatTrigger;
  done: BeatDone;
  /** A shown beat retires after this long even if not done (logged as a drop-off). */
  timeoutTicks?: number;
  /**
   * The beat only makes sense in this age of the player (its text names a card of that age). If the
   * player leaves the age before the beat is over, it is skipped.
   */
  onlyInAge?: number;
  /**
   * Shows as soon as its trigger holds, even while an earlier beat of a sequential script still
   * waits for the player (audit: "Evolve!" must never hide behind a stuck turret step).
   */
  jumpQueue?: boolean;
}

/** Old Grogg's scripted sends (A7.4, A8): train commands through the normal command API (B10). */
export interface GroggSend {
  /** Tick the train command is issued. */
  tick: number;
  /** Grogg's tray slot: 0 = Training Dummy, 1 = Tuskback. */
  slot: 0 | 1 | 2 | 3 | 4;
}

export interface GroggScript {
  sends: GroggSend[];
  /** Grogg skips a send while this many of his units are alive, so an idle player is not swamped. */
  maxAlive: number;
}

export interface MatchScript {
  id: 'match1' | 'match2' | 'match4' | 'match5';
  /** Beats show one after another, in order (A8, C5 #2). */
  sequential: boolean;
  beats: Beat[];
}

// ---------------------------------------------------------------------------------------------
// Match 1: Tutorial format vs Old Grogg (A8 0:00-3:00)
// ---------------------------------------------------------------------------------------------

/** Tray slots of the starter loadout: infantry, ranged, heavy, AA (by script), support. */
export const SLOT = { infantry: 0, ranged: 1, heavy: 2 } as const;

/** The seed of match 1: fixed, so every new player gets the retimed match. */
export const MATCH1_SEED = 1;

/** Grogg's plan slots (content `generals.grogg`): 0 Training Dummy, 1 Tuskback. */
const DUMMY = 0 as const;
const TUSKBACK = 1 as const;

/**
 * Retimed from the scripted run (A8 targets in brackets). With the Tutorial thresholds (680 / 690 /
 * 520 / 700 XP) and Grogg's base at 90% (content, `docs/requests/wp1-tutorial-pacing.md`) the match
 * follows the A8 draft: Medieval at ~0:55, Gunpowder ~1:36, Modern ~2:07, Future ~2:40 and Grogg
 * falls at ~2:59, so each age gets time on screen. Grogg sends three dummies before his Tuskback,
 * so the four Stone lessons (Bonker, first kill, Pebbler, Rock Tosser) come before the first evolve.
 */
function groggSends(): GroggSend[] {
  const sends: GroggSend[] = [
    // Meets the first Bonker for the first kill at ~0:15 [0:17].
    { tick: sec(2), slot: DUMMY },
    { tick: sec(12), slot: DUMMY },
    { tick: sec(22), slot: DUMMY },
    // The Tuskback trains for 4 s and walks on at ~0:37 [0:40].
    { tick: sec(33), slot: TUSKBACK },
  ];
  for (let t = sec(42); t <= sec(600); t += sec(8)) sends.push({ tick: t, slot: DUMMY });
  return sends;
}

export const GROGG_SCRIPT: GroggScript = { sends: groggSends(), maxAlive: 3 };

/** Grogg's gold comes from the script, so his sends never depend on his economy (one tick ahead). */
function groggGrants(content: CompiledContent, groggUnits: readonly (CardId | null)[]): TrainingEvent[] {
  return GROGG_SCRIPT.sends.map((s) => {
    const card = groggUnits[s.slot];
    const cost = card ? (content.units[card]?.cost ?? 0) : 0;
    return { tick: Math.max(1, s.tick - 1), side: 1 as Side, grantGold: cost };
  });
}

/** The Pebbler slides in at 0:17 [0:20], after "Kills earn gold". */
export const MATCH1_PEBBLER_TICK = sec(17);
/** 150 gold for the Rock Tosser when Grogg's Tuskback walks on, 0:38 [0:40]. */
export const MATCH1_TURRET_GRANT_TICK = sec(38);
export const MATCH1_TURRET_GRANT = 150;
/**
 * Arrow Storm is charged at 1:04 [1:20], about 9 s into Medieval. The natural charge (50 s, halved
 * on evolve) would only finish just before Gunpowder, so the script fills it.
 */
export const MATCH1_POWER_TICK = sec(64);

/** "Kills earn gold" stays this long: long enough to read and to watch the coins land. */
export const KILLS_EARN_GOLD_TICKS = sec(5);

/**
 * The training script of match 1 (B15 `TrainingEvent`): the Pebbler unlock, the turret gold and
 * Grogg's gold. Sorted by tick.
 */
export function match1TrainingScript(content: CompiledContent, groggUnits: readonly (CardId | null)[]): TrainingEvent[] {
  const events: TrainingEvent[] = [
    { tick: MATCH1_PEBBLER_TICK, side: 0, unlockSlot: SLOT.ranged },
    { tick: MATCH1_TURRET_GRANT_TICK, side: 0, grantGold: MATCH1_TURRET_GRANT },
    { tick: MATCH1_POWER_TICK, side: 0, setPowerPpm: 1_000_000 },
    ...groggGrants(content, groggUnits),
  ];
  return events.sort((a, b) => a.tick - b.tick || a.side - b.side);
}

/** Tray slots per age in match 1 (A3 "Match 1 uses scripted trays", A8). */
export const MATCH1_TRAYS: Partial<Record<AgeId, number[]>> = {
  stone: [SLOT.infantry],
  medieval: [SLOT.infantry, SLOT.ranged],
  gunpowder: [SLOT.infantry, SLOT.ranged],
  modern: [SLOT.infantry, SLOT.ranged],
  future: [SLOT.infantry, SLOT.ranged],
};

export const MATCH1: MatchScript = {
  id: 'match1',
  sequential: true,
  beats: [
    { id: 'm1.sendBonker', textKey: 'tutorial.m1.sendBonker', target: 'card0', trigger: { k: 'start' }, done: { k: 'trained', slot: SLOT.infantry }, timeoutTicks: sec(30) },
    { id: 'm1.killsEarnGold', textKey: 'tutorial.m1.killsEarnGold', target: 'gold', trigger: { k: 'firstKill' }, done: { k: 'shownFor', ticks: KILLS_EARN_GOLD_TICKS } },
    // An action prompt: it asks for the Pebbler and stays until one is trained (or Stone is over).
    { id: 'm1.pebbler', textKey: 'tutorial.m1.pebbler', target: 'card1', trigger: { k: 'atTick', tick: MATCH1_PEBBLER_TICK }, done: { k: 'trained', slot: SLOT.ranged }, timeoutTicks: sec(30), onlyInAge: 0 },
    { id: 'm1.buildTurret', textKey: 'tutorial.m1.buildTurret', target: 'mount0', trigger: { k: 'atTick', tick: MATCH1_TURRET_GRANT_TICK }, done: { k: 'event', e: 'turretBuildStart' }, timeoutTicks: sec(30), onlyInAge: 0 },
    { id: 'm1.evolve', textKey: 'tutorial.m1.evolve', target: 'evolve', trigger: { k: 'evolveReady' }, done: { k: 'event', e: 'ascendStart' }, timeoutTicks: sec(30), onlyInAge: 0, jumpQueue: true },
    // ~0:55: the Ascension show speaks for itself.
    { id: 'm1.ascension', textKey: null, target: null, trigger: { k: 'ageUp', age: 'medieval' }, done: { k: 'shownFor', ticks: 1 } },
    { id: 'm1.arrowStorm', textKey: 'tutorial.m1.arrowStorm', target: 'power', hand: 'powerDrag', trigger: { k: 'powerReady' }, done: { k: 'event', e: 'powerTelegraph' }, timeoutTicks: sec(20), onlyInAge: 1 },
    { id: 'm1.gunpowder', textKey: null, target: null, trigger: { k: 'ageUp', age: 'gunpowder' }, done: { k: 'shownFor', ticks: 1 } },
    { id: 'm1.modern', textKey: null, target: null, trigger: { k: 'ageUp', age: 'modern' }, done: { k: 'shownFor', ticks: 1 } },
    { id: 'm1.future', textKey: 'tutorial.m1.future', target: null, trigger: { k: 'ageUp', age: 'future' }, done: { k: 'shownFor', ticks: sec(3) } },
  ],
};

/**
 * Measured beat times of match 1 in ticks, from the scripted run (`test/retime.test.ts`: the
 * autopilot taps every 1.5 s from 0:02.5 and follows each prompt, as a quick new player would).
 * The A8 draft times are in brackets; the order of the beats is the A8 order.
 */
export const MATCH1_TIMING = {
  firstKill: 297, // 0:14.9 [0:17]
  evolveReady: 1038, // 0:51.9 [0:50]
  medieval: 1101, // 0:55.1 [0:55]
  arrowStormReady: 1280, // 1:04.0 [1:20]
  gunpowder: 1911, // 1:35.6 [1:30]
  modern: 2541, // 2:07.1 [2:00]
  future: 3201, // 2:40.1 [2:35]
  groggFalls: 3577, // 2:58.9 [3:00]
} as const;

/** How far a replayed beat may drift from `MATCH1_TIMING` before the retiming test fails. */
export const MATCH1_TIMING_TOLERANCE = sec(3);

// ---------------------------------------------------------------------------------------------
// Match 2 (Short War vs Pip, tier 0) and the staged unlocks of matches 4 and 5
// ---------------------------------------------------------------------------------------------

export const MATCH2: MatchScript = {
  id: 'match2',
  sequential: false,
  beats: [
    // A17.6: the long lane scrolls. The first real battle shows how to look around once the armies are out.
    { id: 'm2.scroll', textKey: 'tutorial.m2.scroll', target: 'minimap', trigger: { k: 'atTick', tick: sec(20) }, done: { k: 'shownFor', ticks: sec(5) } },
    // "Stone teaches Treasury" (A8).
    { id: 'm2.treasury', textKey: 'tutorial.m2.treasury', target: 'gold', trigger: { k: 'treasuryAffordable', afterTick: sec(15) }, done: { k: 'event', e: 'treasuryUp' }, timeoutTicks: sec(12) },
    // "Medieval teaches the second mount" (A8).
    { id: 'm2.secondMount', textKey: 'tutorial.m2.secondMount', target: 'mountBuy', trigger: { k: 'mountAffordable', minAgeIndex: 1 }, done: { k: 'event', e: 'mountBought' }, timeoutTicks: sec(12) },
  ],
};

export const MATCH4: MatchScript = {
  id: 'match4',
  sequential: false,
  beats: [{ id: 'm4.stance', textKey: 'tutorial.m4.stance', target: 'stance', trigger: { k: 'atTick', tick: sec(3) }, done: { k: 'event', e: 'stanceChanged' }, timeoutTicks: sec(8) }],
};

export const MATCH5: MatchScript = {
  id: 'match5',
  sequential: false,
  beats: [{ id: 'm5.lastStand', textKey: 'tutorial.m5.lastStand', target: 'lastStand', trigger: { k: 'lastStandArmed' }, done: { k: 'event', e: 'lastStandCharge' }, timeoutTicks: sec(8) }],
};

/**
 * Staged unlocks by match number (A3 "Unlock order", A2.11, A8). Match n is the n-th match of the
 * profile (1 = the tutorial), i.e. `save.matchesPlayed + 1` before it starts.
 */
export const STAGES = {
  /** Match 2 onwards uses the full starter plan (match 1 uses scripted trays). */
  fullTrayFromMatch: 2,
  /** The War Plan screen and Skirmish open after match 3 ("Your army, your plan"). */
  warPlanAfterMatch: 3,
  skirmishAfterMatch: 3,
  /** The stance flag appears in match 4. */
  stanceFromMatch: 4,
  /** The manual Last Stand button appears in match 5; before that it is automatic only (A2.11). */
  lastStandFromMatch: 5,
  /**
   * In-battle adaptive hints stop after the onboarding matches (A8: "only their in-battle hints
   * stop"); the detectors keep running for the Result tip.
   */
  hintsUntilMatch: 5,
} as const;

/** The scripted beats for match `n`, if any. */
export function scriptForMatch(n: number): MatchScript | null {
  if (n === 1) return MATCH1;
  if (n === 2) return MATCH2;
  if (n === STAGES.stanceFromMatch) return MATCH4;
  if (n === STAGES.lastStandFromMatch) return MATCH5;
  return null;
}

/** `MatchConfig.training` flags for the player in match `n` (side 0 = the player; bots keep both). */
export function stagedTraining(n: number): { manualLastStand: [boolean, boolean]; stanceEnabled: [boolean, boolean] } {
  return {
    manualLastStand: [n >= STAGES.lastStandFromMatch, true],
    stanceEnabled: [n >= STAGES.stanceFromMatch, true],
  };
}

/** The "Your army, your plan" prompt after match 3 (shown on Home by the app). */
export const WAR_PLAN_PROMPT_KEY = 'tutorial.home.warPlan';

// ---------------------------------------------------------------------------------------------
// Adaptive hints (A8): at most once per 30 s, only on failure patterns, at most 3 times each
// ---------------------------------------------------------------------------------------------

export type AdaptiveHintId = 'turretShredsMelee' | 'heaviesStopInfantry' | 'powerReady' | 'evolveFirst' | 'buyMount' | 'hold' | 'modernise' | 'trickle';

export interface AdaptiveHintDef {
  id: AdaptiveHintId;
  textKey: string;
  target: PromptTarget | null;
}

export const ADAPTIVE = {
  /** Minimum gap between two adaptive hints (A8). */
  gapTicks: sec(30),
  /** Each hint shows at most this often per profile (A8). */
  maxPerHint: 3,
  /** How long an adaptive hint stays on screen. */
  showTicks: sec(4),
  /** Sliding window for death-based patterns. */
  windowTicks: sec(20),
  /** Deaths inside the window that make a pattern. */
  deaths: 3,
  /** Power full and unused this long with enemies on our half. */
  powerIdleTicks: sec(15),
  /** Enemies on our half (p < 600 lu) for the power hint. */
  powerCrowd: 3,
  /** Evolve available and unused this long. */
  evolveIdleTicks: sec(10),
  /** Own base damaged within this many ticks (mount hint). */
  baseHitTicks: sec(10),
  /** Old turret with the Modernise option affordable this long. */
  outdatedTicks: sec(15),
  /** Own losses inside the window for the Hold hint, while outnumbered. */
  holdDeaths: 4,
  /** "Heavies stop Bonkers. Try a Spear Hunter.": the card names in the text are data. */
  heavyVictims: ['bonker'] as CardId[],
  heavyAnswer: 'spear_hunter' as CardId,
} as const;

export const ADAPTIVE_HINTS: readonly AdaptiveHintDef[] = [
  { id: 'turretShredsMelee', textKey: 'tutorial.hint.turretShredsMelee', target: 'card1' },
  { id: 'heaviesStopInfantry', textKey: 'tutorial.hint.heaviesStopInfantry', target: null },
  { id: 'powerReady', textKey: 'tutorial.hint.powerReady', target: 'power' },
  { id: 'evolveFirst', textKey: 'tutorial.hint.evolveFirst', target: 'evolve' },
  { id: 'buyMount', textKey: 'tutorial.hint.buyMount', target: 'mountBuy' },
  { id: 'hold', textKey: 'tutorial.hint.hold', target: 'stance' },
  { id: 'modernise', textKey: 'tutorial.hint.modernise', target: null },
  // A16.6: units sent one by one (the app's trickle detector reports the pattern).
  { id: 'trickle', textKey: 'tutorial.hint.trickle', target: 'gold' },
];

// ---------------------------------------------------------------------------------------------
// Loadouts for match 1 (derived from content: the starter commons of each age, A3)
// ---------------------------------------------------------------------------------------------

/**
 * The starter loadout of an age (A3 starter kit): the Infantry, Ranged and Heavy commons in slots
 * 0-2 (the AA Rare arrives by script later), both Common turrets and the default power.
 */
export function starterLoadout(content: CompiledContent, age: AgeId): Loadout {
  const units = Object.values(content.units).filter((u) => u.age === age && u.rarity === 'common' && !u.hidden);
  const byGroup = (g: string): CardId | null => units.find((u) => u.group === g)?.id ?? null;
  const turrets = Object.values(content.turrets)
    .filter((t) => t.age === age && t.rarity === 'common')
    .map((t) => t.id);
  const power = Object.values(content.powers).find((p) => p.age === age && p.slot === 'default')?.id ?? '';
  return {
    units: [byGroup('infantry'), byGroup('ranged'), byGroup('heavy'), null, null],
    turrets: [turrets[0] ?? null, turrets[1] ?? null],
    power,
  };
}

/** Match 1 loadouts for every age of the Tutorial format. */
export function match1Loadouts(content: CompiledContent): Partial<Record<AgeId, Loadout>> {
  const out: Partial<Record<AgeId, Loadout>> = {};
  for (const age of content.formats.tutorial.ages) out[age] = starterLoadout(content, age);
  return out;
}
