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
import type { AgeId, CardId, CompiledContent, Loadout, Side, SimEvent, StanceMode, TrainingEvent } from '@/contracts';

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
  /** The Charge button of the stance control (MVP fix 2026-10-01: never the middle Hold button). */
  | 'stanceCharge'
  /** The War Council button right of the gold; while its sheet is open, the Economy income pick. */
  | 'council'
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
  | { k: 'lastStandArmed' }
  /**
   * An enemy Heavy-group unit is alive on the lane within `viewLu` of the player's front (the follow
   * camera frames the front, A17.4), so the prompt shows while the Heavy is on screen.
   */
  | { k: 'foeHeavy'; viewLu: number }
  /**
   * The player's stance has not been Charge for this long (MVP fix 2026-10-01: match 1 has no clock,
   * so an army parked on Hold or Fall back would stall the training match forever).
   */
  | { k: 'offCharge'; ticks: number };

/** What ends a shown beat. */
export type BeatDone =
  /** A sim event of the player's side (for example `turretBuildStart`, `ascendStart`, `powerTelegraph`). */
  | { k: 'event'; e: SimEvent['e'] }
  /** The player trained the card in this tray slot. */
  | { k: 'trained'; slot: number }
  /** A unit of the card in this tray slot spawned on the lane (queued is not enough). */
  | { k: 'spawned'; slot: number }
  /** Shown for a fixed time. */
  | { k: 'shownFor'; ticks: number }
  /** The player's stance is this one. */
  | { k: 'stance'; stance: StanceMode };

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
  /**
   * Once done, the beat waits for its trigger again (a guard such as the match 1 stall prompt). Put
   * re-arming beats last in a sequential script, so they never hold up a later beat.
   */
  rearm?: boolean;
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
  id: 'match1' | 'match2';
  /** Beats show one after another, in order (A8, C5 #2). */
  sequential: boolean;
  beats: Beat[];
}

// ---------------------------------------------------------------------------------------------
// Match 1: Tutorial format vs Old Grogg (A8 0:00-3:00)
// ---------------------------------------------------------------------------------------------

/** Tray slots of the starter loadout: infantry, ranged, heavy, Anti-heavy (A3), support. */
export const SLOT = { infantry: 0, ranged: 1, heavy: 2, antiHeavy: 3 } as const;

/** The seed of match 1: fixed, so every new player gets the retimed match. */
export const MATCH1_SEED = 1;

/** Grogg's plan slots (content `generals.grogg`): 0 Training Dummy, 1 Tuskback. */
const DUMMY = 0 as const;
const TUSKBACK = 1 as const;

/**
 * Retimed from the scripted run (A8 targets in brackets). With the Tutorial thresholds (610 / 580 /
 * 390 / 900 XP since the A18.3.2 XP sources; 680 / 690 / 520 / 700 before) and Grogg's base at 90% (content, `docs/requests/wp1-tutorial-pacing.md`) the match
 * follows the A8 draft: Medieval at ~0:57, Gunpowder ~1:24, Modern ~1:43, Future ~2:06 and Grogg
 * falls at ~2:10 (A17's longer lane with faster walking and the three-wide front end it about 35 s
 * before A8's 3:00, and base HP 8,000 × P, MVP balance pass 2026-10-01, another 14 s). Grogg sends three dummies before his Tuskback,
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
    // A second Tuskback walks on at ~0:59, as the player's Spear Hunter (trained at ~0:40) reaches
    // Grogg's gate: the first one fights the Bonkers camped there and falls before any Spear Hunter
    // can walk the lane, so this one is the Heavy the Spear Hunter is seen to beat (review 2026-09-30).
    { tick: sec(55), slot: TUSKBACK },
  ];
  for (let t = sec(42); t <= sec(600); t += sec(8)) sends.push({ tick: t, slot: DUMMY });
  sends.sort((a, b) => a.tick - b.tick);
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

/**
 * The Pebbler slides in at 0:24 [0:20], after "Kills earn gold" (the first kill lands at ~0:18 on the
 * 2,000 lu lane and its beat stays 5 s; an earlier unlock let a quick player train the Pebbler before
 * its beat could show).
 */
export const MATCH1_PEBBLER_TICK = sec(24);
/** 150 gold for the Rock Tosser when Grogg's Tuskback walks on, 0:38 [0:40]. */
export const MATCH1_TURRET_GRANT_TICK = sec(38);
export const MATCH1_TURRET_GRANT = 150;
/**
 * The Anti-heavy beat (A8, owner feedback 2026-09-29): as Grogg's Tuskback walks on (~0:37), the
 * Spear Hunter card slides in with its "Beats Heavy" chip and the script grants its price, so the
 * prompt (after the Rock Tosser beat, while the Tuskback is in view) can always be followed at once.
 * Review 2026-09-30: without the gold the prompt showed with 7 gold and timed out before the card was
 * affordable, and the Tuskback died before the queued Spear Hunter walked on.
 */
export const MATCH1_SPEAR_TICK = sec(37);
/** The Spear Hunter's price, granted with its unlock. */
export const MATCH1_SPEAR_GOLD = 100;
/** How close to the player's front Grogg's Heavy must be for the prompt (the follow camera's frame). */
export const MATCH1_HEAVY_VIEW_LU = 500;
/**
 * Grogg's card levels in match 1 (the rest stay at level 1): his one Tuskback is a level-10 veteran
 * (+45% HP and damage, A5.1), so it holds against the Bonkers camping at his gate until the player's
 * Spear Hunter walks up to it, and the extra 100 gold does not topple Grogg before the Future beat.
 */
export const MATCH1_GROGG_LEVELS: Readonly<Record<CardId, number>> = { tuskback: 10 };
/**
 * Arrow Storm is charged at 1:04 [1:20], about 9 s into Medieval. The natural charge (50 s, halved
 * on evolve) would only finish just before Gunpowder, so the script fills it.
 */
export const MATCH1_POWER_TICK = sec(64);
/**
 * Gold the match 1 script grants with the Arrow Storm beat: its price, so the beat is free (A2.9.10).
 * MVP balance pass: Arrow Storm costs 125 (was 100); a test pins this to the content price.
 */
export const MATCH1_POWER_GOLD = 125;

/** Match 1 prompts Charge after this long off Charge (the stall guard). */
export const MATCH1_STALL_TICKS = sec(10);

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
    // A8 ~0:37: the Spear Hunter slides in (the Anti-heavy beat), with its price.
    { tick: MATCH1_SPEAR_TICK, side: 0, unlockSlot: SLOT.antiHeavy, grantGold: MATCH1_SPEAR_GOLD },
    // A2.9.10 match 1: the Arrow Storm beat; the script grants its price and readies the Home slot at once.
    { tick: MATCH1_POWER_TICK, side: 0, grantGold: MATCH1_POWER_GOLD, setPowerPpm: { slot: 'home', ppm: 1_000_000 } },
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
    // ~0:39: "Spear Hunters beat Heavies" (the Anti-heavy class, A2.6): shows while Grogg's Tuskback is
    // in view and ends when the Spear Hunter walks on (not when it is queued).
    { id: 'm1.spearHunter', textKey: 'tutorial.m1.spearHunter', target: 'card3', trigger: { k: 'foeHeavy', viewLu: MATCH1_HEAVY_VIEW_LU }, done: { k: 'spawned', slot: SLOT.antiHeavy }, timeoutTicks: sec(20), onlyInAge: 0 },
    { id: 'm1.evolve', textKey: 'tutorial.m1.evolve', target: 'evolve', trigger: { k: 'evolveReady' }, done: { k: 'event', e: 'ascendStart' }, timeoutTicks: sec(30), onlyInAge: 0, jumpQueue: true },
    // ~0:55: the Ascension show speaks for itself.
    { id: 'm1.ascension', textKey: null, target: null, trigger: { k: 'ageUp', age: 'medieval' }, done: { k: 'shownFor', ticks: 1 } },
    { id: 'm1.arrowStorm', textKey: 'tutorial.m1.arrowStorm', target: 'power', hand: 'powerDrag', trigger: { k: 'powerReady' }, done: { k: 'event', e: 'powerTelegraph' }, timeoutTicks: sec(20), onlyInAge: 1 },
    // Owner feedback 2026-09-28: the stance is there from match 1, with this one hint in Gunpowder
    // (~1:33, a calm stretch after Arrow Storm). It points at Charge for 6 s and never waits for a
    // tap, so a player who ignores it is not held up (the retimed run never taps it). MVP fix
    // 2026-10-01: it pointed at the whole control, so the hand sat on Hold and players who tapped
    // where it pointed parked their army for good.
    { id: 'm1.stance', textKey: 'tutorial.m1.stance', target: 'stanceCharge', trigger: { k: 'ageUp', age: 'gunpowder' }, done: { k: 'shownFor', ticks: sec(6) } },
    { id: 'm1.modern', textKey: null, target: null, trigger: { k: 'ageUp', age: 'modern' }, done: { k: 'shownFor', ticks: 1 } },
    { id: 'm1.future', textKey: 'tutorial.m1.future', target: null, trigger: { k: 'ageUp', age: 'future' }, done: { k: 'shownFor', ticks: sec(3) } },
    // The stall guard (MVP fix 2026-10-01): match 1 has no clock, so whenever the army has not been on
    // Charge for 10 s the hand points at Charge until the player taps it. It re-arms after each Charge.
    { id: 'm1.charge', textKey: 'tutorial.m1.charge', target: 'stanceCharge', trigger: { k: 'offCharge', ticks: MATCH1_STALL_TICKS }, done: { k: 'stance', stance: 'charge' }, jumpQueue: true, rearm: true },
  ],
};

/**
 * Measured beat times of match 1 in ticks, from the scripted run (`test/retime.test.ts`: the
 * autopilot taps every 1.5 s from 0:02.5 and follows each prompt, as a quick new player would).
 * The A8 draft times are in brackets; the order of the beats is the A8 order.
 */
export const MATCH1_TIMING = {
  firstKill: 366, // 0:18.3 [0:17]
  evolveReady: 1048, // 0:52.4 [0:50]
  medieval: 1131, // 0:56.6 [0:55]
  arrowStormReady: 1280, // 1:04.0 [1:20]
  gunpowder: 1671, // 1:23.6 [1:30]; the Spear Hunter's 100 gold (review 2026-09-30) speeds the middle ages; base HP 8,000 × P (MVP balance pass) pays base-damage XP sooner
  modern: 2061, // 1:43.1 [2:00]
  future: 2511, // 2:05.6 [2:35]; the Spear Hunter beat (owner feedback 2026-09-29, review 2026-09-30); MVP balance pass: 2:19.1 before base HP 8,000 × P
  groggFalls: 2600, // 2:10.0 [3:00]; 2:24.3 before the MVP balance pass (base HP 8,000 × P); the 2,000 lu lane and three-wide front (SIM 2.0.0) end it sooner; A18 XP (SIM 3.0.0); the Spear Hunter beat; his level-10 Tuskbacks keep it 4-6 s after Future
} as const;

/** How far a replayed beat may drift from `MATCH1_TIMING` before the retiming test fails. */
export const MATCH1_TIMING_TOLERANCE = sec(3);

// ---------------------------------------------------------------------------------------------
// Match 2 (Short War vs Pip, tier 0), with the manual Last Stand (owner feedback 2026-09-28)
// ---------------------------------------------------------------------------------------------

export const MATCH2: MatchScript = {
  id: 'match2',
  sequential: false,
  beats: [
    // A17.6: the long lane scrolls. The first real battle shows how to look around once the armies are out.
    { id: 'm2.scroll', textKey: 'tutorial.m2.scroll', target: 'minimap', trigger: { k: 'atTick', tick: sec(20) }, done: { k: 'shownFor', ticks: sec(5) } },
    // "Stone teaches Treasury" (A8), now the War Council's Economy track (A18.5.4). The ring follows the
    // player (MVP fix 2026-10-01: it stayed on the gold): the Council button, then the Economy track,
    // then the first income pick, then "tap again". The beat ends when research starts.
    { id: 'm2.treasury', textKey: 'tutorial.m2.treasury', target: 'council', trigger: { k: 'treasuryAffordable', afterTick: sec(15) }, done: { k: 'event', e: 'researchStarted' }, timeoutTicks: sec(30) },
    // "Medieval teaches the second mount" (A8).
    { id: 'm2.secondMount', textKey: 'tutorial.m2.secondMount', target: 'mountBuy', trigger: { k: 'mountAffordable', minAgeIndex: 1 }, done: { k: 'event', e: 'mountBought' }, timeoutTicks: sec(12) },
    // The manual Last Stand button arrives in match 2 (was match 5), shown when it is first armed.
    { id: 'm2.lastStand', textKey: 'tutorial.m2.lastStand', target: 'lastStand', trigger: { k: 'lastStandArmed' }, done: { k: 'event', e: 'lastStandCharge' }, timeoutTicks: sec(8) },
  ],
};

/**
 * Staged unlocks by match number (A3 "Unlock order", A2.11, A8). Match n is the n-th match of the
 * profile (1 = the tutorial), i.e. `save.matchesPlayed + 1` before it starts.
 */
export const STAGES = {
  /** Match 2 onwards uses the full starter plan (match 1 uses scripted trays). */
  fullTrayFromMatch: 2,
  /**
   * Owner feedback 2026-09-28: Home, the War Plan screen, Customize and Skirmish open right after
   * match 1 (A8 had "after match 3").
   */
  warPlanAfterMatch: 1,
  skirmishAfterMatch: 1,
  /** The stance flag is there from match 1, with one hint (was match 4). */
  stanceFromMatch: 1,
  /** The manual Last Stand button appears in match 2 (was match 5); before that it is automatic only (A2.11). */
  lastStandFromMatch: 2,
  /**
   * In-battle adaptive hints stop after the onboarding matches (A8: "only their in-battle hints
   * stop"); the detectors keep running for the Result tip.
   */
  hintsUntilMatch: 5,
  /**
   * MVP fix 2026-10-01 (FTUE audit #6): match 1 is fully scripted, so adaptive hints start in match 2;
   * inside a scripted match they were noise (and the Hold hint parked armies in a match with no clock).
   */
  hintsFromMatch: 2,
} as const;

/** The scripted beats for match `n`, if any. */
export function scriptForMatch(n: number): MatchScript | null {
  if (n === 1) return MATCH1;
  if (n === 2) return MATCH2;
  return null;
}

/** `MatchConfig.training` flags for the player in match `n` (side 0 = the player; bots keep both). */
export function stagedTraining(n: number): { manualLastStand: [boolean, boolean]; stanceEnabled: [boolean, boolean] } {
  return {
    manualLastStand: [n >= STAGES.lastStandFromMatch, true],
    stanceEnabled: [n >= STAGES.stanceFromMatch, true],
  };
}


// ---------------------------------------------------------------------------------------------
// Adaptive hints (A8): at most once per 30 s, only on failure patterns, at most 3 times each
// ---------------------------------------------------------------------------------------------

export type AdaptiveHintId = 'crumbling' | 'turretShredsMelee' | 'heaviesStopInfantry' | 'powerReady' | 'evolveFirst' | 'buyMount' | 'hold' | 'modernise' | 'trickle';

export interface AdaptiveHintDef {
  id: AdaptiveHintId;
  textKey: string;
  target: PromptTarget | null;
  /** Text variables whose values are i18n keys, translated before they fill `textKey` ("{card}"). */
  varKeys?: Record<string, string>;
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
  /** At most this many adaptive hints in one match (FTUE audit 2026-10-01: too many new things at once). */
  maxPerMatch: 2,
  /** Rope beats on our base inside the window before the crumbling hint (A2.10.1, A2.10.2). */
  crumbleBeats: 4,
} as const;

export const ADAPTIVE_HINTS: readonly AdaptiveHintDef[] = [
  // The Siege rope (A2.10.2; Last Base Standing's Crumble, A2.10.1): our base crumbles because the fight
  // is in our half. First in the list: it costs base health every second.
  { id: 'crumbling', textKey: 'tutorial.hint.crumbling', target: 'stance' },
  { id: 'turretShredsMelee', textKey: 'tutorial.hint.turretShredsMelee', target: 'card1' },
  // A9.2 counter hint (owner feedback 2026-09-29): "Heavies! Send {card}." while the enemy fields
  // Heavies and the tray holds an Anti-heavy card; it points at that card (target set when it fires).
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
 * 0-2 and the age's Anti-heavy Rare in slot 3 (owner feedback 2026-09-29), both Common turrets and
 * the age's two starter powers (A2.9.8).
 */
export function starterLoadout(content: CompiledContent, age: AgeId): Loadout {
  // Content without the X0 `starter` flags (the fakes, older tables) treats every Common as a starter.
  const flagged = Object.values(content.units).some((u) => u.starter !== undefined);
  const turretsFlagged = Object.values(content.turrets).some((t) => t.starter !== undefined);
  const units = Object.values(content.units).filter((u) => u.age === age && u.rarity === 'common' && !u.hidden && u.released !== false && (!flagged || u.starter === true));
  const byGroup = (g: string): CardId | null => units.find((u) => u.group === g)?.id ?? null;
  const antiHeavy = Object.values(content.units).find((u) => u.age === age && u.group === 'antiArmor' && u.rarity === 'rare' && !u.hidden && u.released !== false)?.id ?? null;
  const turrets = Object.values(content.turrets)
    .filter((t) => t.age === age && t.rarity === 'common' && (!turretsFlagged || t.starter === true))
    .map((t) => t.id);
  const starter = (slot: 'home' | 'field'): CardId | null =>
    Object.values(content.powers).find((p) => p.age === age && p.slot === slot && p.source === 'starter')?.id ?? null;
  return {
    units: [byGroup('infantry'), byGroup('ranged'), byGroup('heavy'), antiHeavy, null],
    turrets: [turrets[0] ?? null, turrets[1] ?? null],
    powers: { home: starter('home'), field: starter('field') },
  };
}

/**
 * Match 1 loadouts for every age of the Tutorial format. The first age carries no power: the power
 * beat is the Medieval Arrow Storm as built (A8), so no Stone power may reload and spend the turret
 * gold before it (A2.9.2: powers cost gold).
 */
export function match1Loadouts(content: CompiledContent): Partial<Record<AgeId, Loadout>> {
  const out: Partial<Record<AgeId, Loadout>> = {};
  (content.formats.tutorial?.ages ?? []).forEach((age, i) => {
    const l = starterLoadout(content, age);
    out[age] = i === 0 ? { ...l, powers: { home: null, field: null } } : l;
  });
  return out;
}
