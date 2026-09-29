/**
 * Builds everything a match needs from the save plus the opponent (DESIGN B11 "BattleSession builds
 * MatchConfig from the save plus the opponent spec"): the `MatchConfig`, the `OpponentSpec` and how
 * the opponent is driven (an AI General profile or Old Grogg's script).
 *
 * The onboarding matches (A8) are built here too: match 1 vs Old Grogg on the Tutorial format with
 * scripted trays, and match 2 vs Pip Quickstep (tier 0) on Short War. Staged unlocks (the stance from
 * match 1, manual Last Stand from match 2 since the owner feedback of 2026-09-28, A2.11) come from
 * `tutorial/scripts.ts`.
 *
 * Every opponent is an AI and is labeled so (A7.1): `OpponentSpec.isAI` is always true.
 */
import type {
  AgeId,
  BotProfile,
  CardId,
  CompiledContent,
  FormatId,
  Loadout,
  MatchConfig,
  MatchResultInput,
  OpponentSpec,
  SaveDoc,
  SideConfig,
  SideLook,
  WarPathMatch,
} from '@/contracts';
import { botProfile } from '@/ai';
import type { Content, Difficulty, DifficultyTable, GeneralDef, GeneralId } from '@/content';
import { applyPowerMatchRule, commanderInfo, meta, ROOKIE_DISCLOSURE_KEY } from '@/meta';
import {
  GROGG_SCRIPT,
  MATCH1_SEED,
  MATCH1_TRAYS,
  match1Loadouts,
  match1TrainingScript,
  scriptForMatch,
  stagedTraining,
  starterLoadout,
  type MatchScript,
} from '@/tutorial';

export type MatchMode = MatchResultInput['mode'];

/** How the opponent side is played. */
export type OpponentBrain = { kind: 'general'; profile: BotProfile } | { kind: 'grogg' };

export interface MatchSetup {
  mode: MatchMode;
  /** The profile's match number (1 = the tutorial): `save.matchesPlayed + 1`. */
  matchNumber: number;
  config: MatchConfig;
  opponent: OpponentSpec;
  brain: OpponentBrain;
  /** Scripted onboarding beats for this match, if any. */
  script: MatchScript | null;
  /** The War Path level of a `warPath` match (A18.7); the result carries it to meta. */
  warPath?: WarPathMatch;
}

/** Names the setup puts on the sides (from the caller's i18n; the setup itself has no strings). */
export interface SetupLabels {
  /** The player's side when there is no save yet (a save uses the profile name). */
  player?: string;
}

/** The Quick Battle and Skirmish difficulties when the content has no table (fake content). */
const DIFFICULTY_FALLBACK: DifficultyTable = {
  order: ['easy', 'normal', 'hard', 'expert', 'legendary'],
  tiers: { easy: 2, normal: 4, hard: 6, expert: 8, legendary: 10 },
  default: 'normal',
};

/** The difficulty table (owner feedback 2026-09-28): Easy II, Normal IV, Hard VI, Expert VIII, Legendary X. */
export function difficultyTable(content: CompiledContent): DifficultyTable {
  return tables(content).generals?.difficulty ?? DIFFICULTY_FALLBACK;
}

/** The AI tier of a difficulty (the table's default, Normal, when none is given). */
export function difficultyTier(content: CompiledContent, d?: Difficulty): number {
  const table = difficultyTable(content);
  return table.tiers[d ?? table.default];
}

/** "Standard levels" in Skirmish (A6.8), when the content has no ladder table (fake content). */
const STANDARD_LEVEL_FALLBACK = 7;

const RARITY_RANK: Record<string, number> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** Typed generals and arenas when the content has them (the fakes have none). */
function tables(content: CompiledContent): Partial<Pick<Content, 'generals' | 'arenas'>> {
  const c = content as Partial<Content>;
  return { generals: c.generals ?? undefined, arenas: c.arenas ?? undefined };
}

export function generalDef(content: CompiledContent, id: string): GeneralDef | undefined {
  return tables(content).generals?.list[id as GeneralId];
}

/** Age ids of a format, in order. */
export function formatAges(content: CompiledContent, format: FormatId): AgeId[] {
  return [...(content.formats[format]?.ages ?? [])];
}

/** Every unit and turret at `level` (bots; includes summon sources, B15 SideConfig.levels). */
export function uniformLevels(content: CompiledContent, level: number): Record<CardId, number> {
  const levels: Record<CardId, number> = {};
  for (const id of [...Object.keys(content.units), ...Object.keys(content.turrets), ...Object.keys(content.powers)].sort()) levels[id] = level;
  return levels;
}

/** Starter loadouts (A3 starter kit) for every age. */
export function starterLoadouts(content: CompiledContent): Record<AgeId, Loadout> {
  const out = {} as Record<AgeId, Loadout>;
  for (const age of Object.keys(content.ages).sort() as AgeId[]) out[age] = starterLoadout(content, age);
  return out;
}

/** The Skirmish "Standard levels" level: every card on both sides plays at it (A6.8). */
export function standardLevel(content: CompiledContent): number {
  return tables(content).arenas?.ladder.standardLevel ?? STANDARD_LEVEL_FALLBACK;
}

/** True when the content carries the A18.9.4 collections (the fakes do not). */
function hasCollections(content: CompiledContent): boolean {
  const c = content.cosmetics as { collections?: unknown } | null | undefined;
  return !!c && !!c.collections;
}

/** The player's base look (A18.9.4): only owned items, never a national flag they did not pick. */
export function playerLook(save: SaveDoc | null, content: CompiledContent): SideLook | undefined {
  return save && hasCollections(content) ? meta.sideLook(save, content) : undefined;
}

/** An AI opponent's base look, seeded by who it is (never a national flag, A7.1 labels stay). */
export function opponentLook(content: CompiledContent, seed: string): SideLook | undefined {
  return hasCollections(content) ? meta.botLook(content, seed) : undefined;
}

/**
 * The player's side from the save: the active War Plan, card levels and equipped skins. Without a
 * save (a first launch before meta exists) the starter plan at level 1, labeled `fallbackLabel`.
 */
export function playerSide(save: SaveDoc | null, content: CompiledContent, fallbackLabel = ''): SideConfig {
  const plan = save ? (save.warPlans[save.activePlan] ?? save.warPlans[0]) : undefined;
  const levels: Record<CardId, number> = save ? {} : uniformLevels(content, 1);
  if (save) {
    for (const id of Object.keys(save.collection).sort()) levels[id] = save.collection[id]!.level;
  }
  const look = playerLook(save, content);
  return {
    label: save?.profile.name ?? fallbackLabel,
    isBot: false,
    loadouts: { ...(plan?.loadouts ?? starterLoadouts(content)) },
    levels,
    skins: { ...(save?.skins.equipped ?? {}) },
    ...(look ? { look } : {}),
  };
}

/**
 * A General's plan with cards above the arena's rarity allowance removed (A6.8). Falls back to the
 * starter loadouts when the content has no plan (fake content).
 */
export function generalPlan(content: CompiledContent, id: string, maxRarity: 'common' | 'rare' | 'epic' | 'legendary' = 'legendary'): Partial<Record<AgeId, Loadout>> {
  const plan = generalDef(content, id)?.warPlan;
  if (!plan) return starterLoadouts(content);
  const cap = RARITY_RANK[maxRarity] ?? 3;
  const ok = (card: CardId | null, kind: 'unit' | 'turret'): CardId | null => {
    if (!card) return null;
    const def = kind === 'unit' ? content.units[card] : content.turrets[card];
    return def && (RARITY_RANK[def.rarity] ?? 0) <= cap ? card : null;
  };
  const out: Partial<Record<AgeId, Loadout>> = {};
  for (const age of Object.keys(plan).sort() as AgeId[]) {
    const lo = plan[age];
    if (!lo) continue;
    out[age] = { units: lo.units.map((c) => ok(c, 'unit')), turrets: lo.turrets.map((c) => ok(c, 'turret')), powers: { ...lo.powers } };
  }
  return out;
}

/**
 * The A6.8 new-player mistake bonus for this save's next `mode` match: only in the onboarding
 * matches (`newPlayer.matches`, 2; no save = a first launch), and never in Skirmish or Quick Battle,
 * where the player picked the difficulty (owner feedback 2026-09-28).
 */
export function newPlayerBonusBp(content: CompiledContent, save: SaveDoc | null, mode: MatchMode = 'ladder'): number {
  const ladder = tables(content).arenas?.ladder;
  const played = save?.matchesPlayed ?? 0;
  if (mode === 'skirmish' || mode === 'warPath') return 0;
  return ladder && played < ladder.newPlayer.matches ? ladder.newPlayer.mistakeBonusBp : 0;
}

/**
 * The bot profile for an opponent (A7.3, A7.4), built by WP3's `botProfile`: the General's weights
 * and opening, or, for a procedural AI Commander (`commander:<personality>:<favourite card>`, meta),
 * the personality General's weights and opening plus the favourite card (A7.4). New players (the
 * onboarding matches, a missing save being a first launch) get the A6.8 mistake bonus, except in a
 * match whose difficulty they picked.
 */
export function botProfileFor(opponent: OpponentSpec, content: CompiledContent, save: SaveDoc | null, mode: MatchMode = 'ladder'): BotProfile {
  const mistakeBonusBp = newPlayerBonusBp(content, save, mode);
  const commander = commanderInfo(opponent.generalId);
  return botProfile(content, {
    generalId: opponent.generalId,
    tier: opponent.tier,
    mistakeBonusBp,
    ...(commander ? { personalityOf: commander.personalityOf } : {}),
    ...(commander?.favoriteCard ? { favoriteCard: commander.favoriteCard } : {}),
  });
}

/** Match number of the next match for this save (1 = the tutorial). */
export function nextMatchNumber(save: SaveDoc | null): number {
  return (save?.matchesPlayed ?? 0) + 1;
}

/** The player-side training flags for match `n`, merged with extra overrides (null when all default). */
function trainingFor(n: number, extra: MatchConfig['training'] = {}): MatchConfig['training'] | undefined {
  const staged = stagedTraining(n);
  const t: NonNullable<MatchConfig['training']> = { ...extra };
  if (!staged.manualLastStand[0]) t.manualLastStand = staged.manualLastStand;
  if (!staged.stanceEnabled[0]) t.stanceEnabled = staged.stanceEnabled;
  return Object.keys(t).length > 0 ? t : undefined;
}

export interface MatchSetupOptions extends SetupLabels {
  /**
   * The opponent's name on the HUD nameplate (`SideConfig.label`). Default: `displayName`, which
   * meta gives as a string key for named Generals; the caller resolves it through i18n.
   */
  opponentLabel?: string;
  /** Skirmish "Standard levels": every card of the player plays at L7 too (A6.8; meta sets the bot's). */
  standardLevels?: boolean;
}

/**
 * The setup for a match against `opponent` (any mode). The opponent's side from the spec is kept
 * as is, but always flagged as a bot (A7.1).
 */
export function matchSetupFor(save: SaveDoc | null, opponent: OpponentSpec, mode: MatchMode, content: CompiledContent, o: MatchSetupOptions = {}): MatchSetup {
  const n = nextMatchNumber(save);
  const player = playerSide(save, content, o.player);
  if (o.standardLevels) player.levels = uniformLevels(content, standardLevel(content));
  const config: MatchConfig = {
    seed: opponent.seed,
    format: opponent.format,
    content,
    sides: [player, withBotLook({ ...opponent.side, label: o.opponentLabel ?? opponent.displayName, isBot: true }, content, opponent.generalId)],
    modifiers: [...opponent.modifiers],
  };
  const training = trainingFor(n);
  if (training) config.training = training;
  // A2.9.1 the power match rule: bots only field powers the player could own; both sides play the same
  // power slots (Home only until the Field slot is unlocked and the HUD dock ships, P2).
  const ruled = applyPowerMatchRule(config, save, mode);
  config.sides = ruled.sides;
  // A15.3: whenever the bot gets A6.8's new-player mistakes, the opponent says so (meta adds this
  // for the opponents it picks; Quick Battle and onboarding match 2 are built here).
  const disclosed =
    newPlayerBonusBp(content, save, mode) > 0 && !opponent.disclosures.includes(ROOKIE_DISCLOSURE_KEY)
      ? { ...opponent, disclosures: [...opponent.disclosures, ROOKIE_DISCLOSURE_KEY] }
      : opponent;
  return {
    mode,
    matchNumber: n,
    config,
    opponent: disclosed,
    brain: { kind: 'general', profile: botProfileFor(opponent, content, save, mode) },
    script: mode === 'tutorial' || n <= 5 ? scriptForMatch(n) : null,
  };
}

/** The opponent side with an AI base look unless it already has one. */
function withBotLook(side: SideConfig, content: CompiledContent, seed: string): SideConfig {
  if (side.look) return side;
  const look = opponentLook(content, seed);
  return look ? { ...side, look } : side;
}

/** An AI General as an `OpponentSpec` (the displayName comes from the caller's i18n). */
export function generalOpponent(
  content: CompiledContent,
  o: { generalId: string; displayName: string; tier: number; level: number; format: FormatId; seed: number; maxRarity?: 'common' | 'rare' | 'epic' | 'legendary'; modifiers?: string[]; disclosures?: string[] },
): OpponentSpec {
  return {
    generalId: o.generalId,
    displayName: o.displayName,
    isAI: true,
    tier: o.tier,
    level: o.level,
    format: o.format,
    side: {
      label: o.displayName,
      isBot: true,
      loadouts: generalPlan(content, o.generalId, o.maxRarity),
      levels: uniformLevels(content, o.level),
      skins: {},
    },
    modifiers: [...(o.modifiers ?? [])],
    seed: o.seed,
    warmUp: false,
    disclosures: [...(o.disclosures ?? generalDef(content, o.generalId)?.disclosureKeys ?? [])],
  };
}

/**
 * Match 1 (A8): Tutorial format (Stone to Future, no clock) vs Old Grogg, whose base starts at 90%
 * ("Training match", disclosed). The player's tray is scripted: Bonker only, the Pebbler slides in
 * at 0:20, and each later age offers its Infantry and Ranged commons.
 */
export function tutorialMatch1(save: SaveDoc | null, content: CompiledContent, groggName: string, labels: SetupLabels = {}): MatchSetup {
  const grogg = generalDef(content, 'grogg');
  const groggPlan: Partial<Record<AgeId, Loadout>> = grogg?.warPlan ?? { stone: starterLoadout(content, 'stone') };
  const groggUnits = groggPlan.stone?.units ?? [];
  const opponent: OpponentSpec = {
    generalId: 'grogg',
    displayName: groggName,
    isAI: true,
    tier: 0,
    level: 1,
    format: 'tutorial',
    side: { label: groggName, isBot: true, loadouts: groggPlan, levels: uniformLevels(content, 1), skins: {} },
    modifiers: [],
    seed: MATCH1_SEED,
    warmUp: false,
    disclosures: [...(grogg?.disclosureKeys ?? [])],
  };
  const player = playerSide(save, content, labels.player);
  player.loadouts = match1Loadouts(content);
  const staged = stagedTraining(1);
  const config0: MatchConfig = {
    seed: MATCH1_SEED,
    format: 'tutorial',
    content,
    sides: [player, withBotLook(opponent.side, content, 'grogg')],
    modifiers: [],
    training: {
      enemyBaseStartBp: grogg?.baseStartBp ?? 9000,
      noClock: true,
      script: match1TrainingScript(content, groggUnits),
      manualLastStand: staged.manualLastStand,
      stanceEnabled: staged.stanceEnabled,
      trays: { ...MATCH1_TRAYS },
    },
  };
  // A2.9.1: the training match plays the Home slot only (the match rule).
  const config = applyPowerMatchRule(config0, save, 'tutorial');
  return { mode: 'tutorial', matchNumber: 1, config, opponent, brain: { kind: 'grogg' }, script: scriptForMatch(1) };
}

/** Old Grogg's send schedule, re-exported for the session wiring. */
export { GROGG_SCRIPT };

/**
 * Match 2 (A8): Short War vs Pip Quickstep (AI, tier 0) with the player's starter plan. Pip plays
 * at the Arena 1 bot level with the arena's rarity allowance (A6.3, A6.8).
 */
export function tutorialMatch2(save: SaveDoc | null, content: CompiledContent, pipName: string, seed: number, labels: SetupLabels = {}): MatchSetup {
  const arena = tables(content).arenas?.list[0];
  const opponent = generalOpponent(content, {
    generalId: 'pip',
    displayName: pipName,
    tier: 0,
    level: arena?.botLevel ?? 1,
    format: 'short',
    seed,
    maxRarity: arena?.botMaxRarity ?? 'rare',
  });
  const setup = matchSetupFor(save, opponent, 'tutorial', content, labels);
  return { ...setup, matchNumber: 2, script: scriptForMatch(2) };
}

/**
 * Quick Battle (C3 Checkpoint A): Short War (or another format) vs an AI General at the picked
 * difficulty's tier (Normal, tier IV, by default). Uses the save's War Plan when there is one, else
 * the starter plan. The player picked the difficulty, so the bot never gets the Rookie mistakes.
 */
export function quickBattle(
  save: SaveDoc | null,
  content: CompiledContent,
  o: { generalId: string; displayName: string; format: FormatId; seed: number; tier?: number; level?: number } & SetupLabels,
): MatchSetup {
  const opponent = generalOpponent(content, {
    generalId: o.generalId,
    displayName: o.displayName,
    tier: o.tier ?? difficultyTier(content),
    level: o.level ?? 1,
    format: o.format,
    seed: o.seed,
  });
  const setup = matchSetupFor(save, opponent, 'skirmish', content, o.player !== undefined ? { player: o.player } : {});
  // Quick Battle has no tutorial script, but it keeps the staged unlocks (A8): a first-launch player
  // does not see the manual Last Stand button before match 2 (audit #23).
  return { ...setup, script: null };
}
