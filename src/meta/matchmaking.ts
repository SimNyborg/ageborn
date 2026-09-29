/**
 * Opponent selection against the AI ladder (DESIGN A6.8, A6.3, A6.10, A7.4, A8, A9.1).
 *
 * Every opponent is an AI and is labeled so (`OpponentSpec.isAI` is always true, A7.1).
 *
 * - **Ladder.** Tier from the hidden MMR inside the arena's tier range (`mmr.ts`). After 3 ladder
 *   losses in a row the next opponent is one tier lower (minimum 0) and flagged `warmUp` ("Warm-up
 *   match"). The first ladder match is Captain Kettle (A8 match 3). In Arena 8 The Warden appears in
 *   1 of 5 matches. Otherwise a named General whose tier range holds the tier appears 30% of the time
 *   and a procedural AI Commander ("AI · Name") fills the rest (A7.4).
 * - **Bot level follows the arena**, not the player: every bot card plays at the arena's bot level;
 *   each Commander rolls −1 / 0 / +1 (25 / 50 / 25%) from its seed. Arena 1 bots use Commons and
 *   Rares, Epics from Arena 2. A bot fields its age's Legendary only when the player's loadout for
 *   that age holds one, at the player's level of it. The Warden is the only exception: all five
 *   Legendaries at L9, disclosed on the VS screen (A7.4).
 * - **Conquest.** The board General at its fixed tier and level, with its personal War Plan, Full War.
 * - **Daily Challenge.** The day's General, modifier and seed at the chosen difficulty's tier,
 *   Standard War at L7 (A15.7).
 * - **Skirmish.** The chosen General (or Echo of You, the player's own plan) at the chosen tier and
 *   format; "Standard levels" puts every card at L7 (the app sets the player's side the same way).
 * - **Tutorial.** Match 1 is Old Grogg (Training match), match 2 Pip Quickstep at tier 0 (A8).
 *
 * Opponents are deterministic in the save: previewing and starting the same match give the same spec.
 * A Commander's `generalId` is `commander:<personality General>:<favourite card>`; the app builds its
 * bot profile from it with {@link commanderInfo}.
 */
import type { AgeId, CardId, FormatId, Loadout, MatchResultInput, OpponentSpec, Rarity, SaveDoc, SideConfig, SkirmishOptions, WarPathMatch } from '@/contracts';
import { commanderName, type ArenaDef, type Content, type DailyDifficulty, type GeneralDef, type GeneralId } from '@/content';
import { chanceBp, fnv1a32, pick, pickWeighted, seedSfc32, type Sfc32State } from '@/core';
import { formatAges } from './formats';
import { starterLoadout, activePlan } from './warplan';
import { dailyDrawAt, defaultDailyDifficulty } from './daily';
import { ladderTier } from './mmr';
import { COMMANDER_ID_PREFIX, FIRST_LADDER_GENERAL, GENERAL_SHARE_BP, META_FLAGS, TUTORIAL_MATCH2 } from './rules';
import { ageCards, arenaOf, RARITY_INDEX } from './tables';
import type { LocalTime } from './time';
import { levelDef, levelTier, nextLevelId, warPathOf } from './warPath';

export interface OpponentOptions {
  format?: FormatId;
  conquestGeneral?: string;
  skirmish?: SkirmishOptions;
  daily?: { difficulty: DailyDifficulty };
  warPath?: WarPathMatch;
}

type Plan = Partial<Record<AgeId, Loadout>>;

/** The General's definition, or null for unknown ids. */
export function generalDef(t: Content, id: string): GeneralDef | null {
  return (t.generals.list as Record<string, GeneralDef | undefined>)[id] ?? null;
}

/** Builds a Commander's `generalId`. */
export function commanderId(personalityOf: GeneralId, favoriteCard: CardId | null): string {
  return `${COMMANDER_ID_PREFIX}:${personalityOf}:${favoriteCard ?? ''}`;
}

/** The personality General and favourite card of a procedural Commander, or null for other ids. */
export function commanderInfo(generalId: string): { personalityOf: string; favoriteCard: CardId | null } | null {
  const [prefix, personalityOf, favorite] = generalId.split(':');
  if (prefix !== COMMANDER_ID_PREFIX || !personalityOf) return null;
  return { personalityOf, favoriteCard: favorite ? favorite : null };
}

/** A6.8 "new players": the bot mistake-rate bonus for this save's next match, in bp. */
export function newPlayerMistakeBonusBp(s: SaveDoc, t: Content): number {
  const np = t.arenas.ladder.newPlayer;
  return s.matchesPlayed < np.matches ? np.mistakeBonusBp : 0;
}

/**
 * True when the bot of a `mode` match gets A6.8's new-player mistakes: only during the onboarding
 * matches (`newPlayer.matches`, 2 since the owner feedback of 2026-09-28) and never in Skirmish or
 * Quick Battle, where the player picks the difficulty.
 */
export function newPlayerMistakesApply(s: SaveDoc, mode: MatchResultInput['mode'], t: Content): boolean {
  return mode !== 'skirmish' && mode !== 'warPath' && newPlayerMistakeBonusBp(s, t) > 0;
}

/** The player's Legendary per age in the active plan (for the A6.8 Legendary allowance). */
function playerLegendaries(s: SaveDoc, t: Content, ages: readonly AgeId[]): Partial<Record<AgeId, CardId>> {
  const plan = activePlan(s);
  const out: Partial<Record<AgeId, CardId>> = {};
  for (const age of ages) {
    const id = plan?.loadouts[age]?.units.find((u) => u !== null && t.units[u]?.rarity === 'legendary');
    if (id) out[age] = id;
  }
  return out;
}

/** Every unit (summon sources included) and turret at `level`; Legendaries at their own level. */
export function levelsFor(t: Content, level: number, legendary: Readonly<Record<CardId, number>> = {}): Record<CardId, number> {
  const out: Record<CardId, number> = {};
  for (const id of Object.keys(t.units).sort()) out[id] = t.units[id]?.rarity === 'legendary' ? (legendary[id] ?? level) : level;
  for (const id of Object.keys(t.turrets).sort()) out[id] = level;
  return out;
}

function clampLevel(t: Content, level: number): number {
  return Math.max(1, Math.min(t.economy.maxLevel, level));
}

function fill(ids: (CardId | null)[], pool: readonly CardId[]): (CardId | null)[] {
  const out = [...ids];
  for (let i = 0; i < out.length; i += 1) {
    if (out[i] !== null) continue;
    const next = pool.find((c) => !out.includes(c));
    if (next) out[i] = next;
  }
  return out;
}

/**
 * A plan limited to the arena's rarity allowance (A6.8): cards above `maxRarity` are replaced by
 * allowed cards of the same age, and the age's Legendary joins where the player brings one.
 */
export function allowedPlan(t: Content, plan: Plan | null, ages: readonly AgeId[], maxRarity: Rarity, legendaries: Partial<Record<AgeId, CardId>>): Plan {
  const cap = RARITY_INDEX[maxRarity];
  const allowed = (id: CardId): boolean => {
    const d = t.units[id] ?? t.turrets[id];
    return !!d && d.rarity !== 'legendary' && RARITY_INDEX[d.rarity] <= cap && !(t.units[id]?.hidden ?? false);
  };
  const out: Plan = {};
  for (const age of ages) {
    const src = plan?.[age] ?? starterLoadout(t, age);
    const { units, turrets } = ageCards(t, age);
    let u = fill(src.units.map((id) => (id !== null && allowed(id) ? id : null)), units.filter(allowed));
    const legendary = legendaries[age] ? units.find((id) => t.units[id]?.rarity === 'legendary') : undefined;
    if (legendary && !u.includes(legendary)) {
      const epic = u.findIndex((id) => id !== null && t.units[id]?.rarity === 'epic');
      u = [...u];
      u[epic >= 0 ? epic : u.length - 1] = legendary;
    }
    const tu = fill(src.turrets.map((id) => (id !== null && allowed(id) ? id : null)), turrets.filter(allowed));
    out[age] = { units: u, turrets: tu, power: src.power };
  }
  return out;
}

/** A General's personal plan for the ages of a format (the starter loadout where it has none). */
function fullPlan(t: Content, plan: Plan | null, ages: readonly AgeId[]): Plan {
  const out: Plan = {};
  for (const age of ages) out[age] = plan?.[age] ?? starterLoadout(t, age);
  return out;
}

/** Levels of the Legendaries a ladder bot mirrors: the player's own levels (A6.8). */
function mirroredLegendaryLevels(s: SaveDoc, legendaries: Partial<Record<AgeId, CardId>>): Record<CardId, number> {
  const out: Record<CardId, number> = {};
  for (const age of Object.keys(legendaries).sort() as AgeId[]) {
    const id = legendaries[age];
    if (id) out[id] = s.collection[id]?.level ?? 1;
  }
  return out;
}

function side(label: string, loadouts: Plan, levels: Record<CardId, number>, skins: Record<string, string> = {}): SideConfig {
  return { label, isBot: true, loadouts, levels, skins };
}

interface SpecParts {
  generalId: string;
  displayName: string;
  tier: number;
  level: number;
  format: FormatId;
  side: SideConfig;
  seed: number;
  warmUp?: boolean;
  modifiers?: string[];
  disclosures?: string[];
  standardLevels?: boolean;
}

function spec(p: SpecParts): OpponentSpec {
  return {
    generalId: p.generalId,
    displayName: p.displayName,
    isAI: true,
    tier: p.tier,
    level: p.level,
    format: p.format,
    side: p.side,
    modifiers: p.modifiers ?? [],
    seed: p.seed,
    warmUp: p.warmUp ?? false,
    disclosures: p.disclosures ?? [],
    ...(p.standardLevels ? { standardLevels: true } : {}),
  };
}

function seedOf(s: SaveDoc, parts: string): number {
  return fnv1a32(`opponent:${s.createdAt}:${s.matchesPlayed}:${parts}`);
}

/** A named General on the ladder or in the Daily Challenge (rarity allowance applied, except The Warden). */
function ladderGeneral(s: SaveDoc, t: Content, g: GeneralDef, tier: number, arena: ArenaDef, format: FormatId, seed: number, extra: Partial<SpecParts> = {}): OpponentSpec {
  const ages = formatAges(t, format);
  const level = clampLevel(t, arena.botLevel);
  let loadouts: Plan;
  let legendaryLevels: Record<CardId, number>;
  if (g.legendaryLevel !== null) {
    // The Warden: his whole plan, every Legendary at his own level (A7.4, disclosed).
    loadouts = fullPlan(t, g.warPlan, ages);
    legendaryLevels = Object.fromEntries(Object.keys(t.units).filter((id) => t.units[id]?.rarity === 'legendary').map((id) => [id, g.legendaryLevel ?? level]));
  } else {
    const legendaries = playerLegendaries(s, t, ages);
    loadouts = allowedPlan(t, g.warPlan, ages, arena.botMaxRarity, legendaries);
    legendaryLevels = mirroredLegendaryLevels(s, legendaries);
  }
  return spec({
    generalId: g.id,
    displayName: g.nameKey,
    tier,
    level,
    format,
    side: side(g.nameKey, loadouts, levelsFor(t, level, legendaryLevels)),
    seed,
    disclosures: g.disclosureKeys,
    ...extra,
  });
}

/** A procedural AI Commander (A7.4): seeded personality, name, favourite card, level roll and plan. */
function commander(s: SaveDoc, t: Content, rng: Sfc32State, tier: number, arena: ArenaDef, format: FormatId, seed: number, extra: Partial<SpecParts> = {}): OpponentSpec {
  const ages = formatAges(t, format);
  const personality = pick(rng, t.generals.commanderPersonalities);
  const name = commanderName(rng, t.names);
  const roll = t.arenas.ladder.levelRollBp;
  const delta = [-1, 0, 1][pickWeighted(rng, [roll.minus, roll.zero, roll.plus])] ?? 0;
  const level = clampLevel(t, arena.botLevel + delta);
  const legendaries = playerLegendaries(s, t, ages);
  const loadouts = allowedPlan(t, generalDef(t, personality)?.warPlan ?? null, ages, arena.botMaxRarity, legendaries);
  const units = ages.flatMap((age) => loadouts[age]?.units ?? []).filter((id): id is CardId => id !== null);
  const favorite = units.length > 0 ? pick(rng, units) : null;
  return spec({
    generalId: commanderId(personality, favorite),
    displayName: name,
    tier,
    level,
    format,
    side: side(name, loadouts, levelsFor(t, level, mirroredLegendaryLevels(s, legendaries))),
    seed,
    ...extra,
  });
}

/** Named Generals that may appear on the ladder at `tier` (never Old Grogg, Echo or The Warden). */
export function ladderGenerals(t: Content, tier: number): GeneralDef[] {
  return t.generals.order
    .map((id) => t.generals.list[id])
    .filter((g): g is GeneralDef => !!g && !g.scripted && !g.mirror && g.legendaryLevel === null && !!g.tiers && g.tiers[0] <= tier && tier <= g.tiers[1]);
}

function generalOrCommander(s: SaveDoc, t: Content, rng: Sfc32State, tier: number, arena: ArenaDef, format: FormatId, seed: number, extra: Partial<SpecParts>): OpponentSpec {
  const named = ladderGenerals(t, tier);
  if (named.length > 0 && chanceBp(rng, GENERAL_SHARE_BP)) return ladderGeneral(s, t, pick(rng, named), tier, arena, format, seed, extra);
  return commander(s, t, rng, tier, arena, format, seed, extra);
}

function ladderOpponent(s: SaveDoc, t: Content, o: OpponentOptions): OpponentSpec {
  const arena = arenaOf(s, t);
  const rules = t.arenas.ladder;
  const format = o.format && arena.ladderFormats.includes(o.format) ? o.format : (arena.ladderFormats[0] ?? 'short');
  const warmUp = s.lossStreak >= rules.lossProtection.streak;
  const base = ladderTier(s.mmr, arena, rules);
  const tier = warmUp ? Math.max(0, base - rules.lossProtection.tierDrop) : base;
  const seed = seedOf(s, `ladder:${format}`);
  const rng = seedSfc32(seed);
  const extra = { warmUp };
  const kettle = generalDef(t, FIRST_LADDER_GENERAL);
  if (!s.flags[META_FLAGS.ladderPlayed] && kettle) return ladderGeneral(s, t, kettle, tier, arena, format, seed, extra);
  const warden = generalDef(t, 'warden');
  if (!warmUp && warden?.tiers && chanceBp(rng, arena.wardenChanceBp)) return ladderGeneral(s, t, warden, warden.tiers[0], arena, format, seed);
  return generalOrCommander(s, t, rng, tier, arena, format, seed, extra);
}

/**
 * The Daily Challenge opponent (A15.7): the day's General with its personal War Plan at the chosen
 * difficulty's tier, the day's modifier and match seed (the same for everyone on that date and
 * difficulty), Standard War with every card on both sides at L7. A6.8's Legendary rule still applies.
 */
function dailyOpponent(s: SaveDoc, t: Content, lt: LocalTime, difficulty: DailyDifficulty): OpponentSpec {
  const ch = t.dailyModifiers.challenge;
  const draw = dailyDrawAt(t, lt);
  const g = generalDef(t, draw.generalId) ?? generalDef(t, 'pip');
  if (!g) throw new Error('meta: the content has no Daily Generals');
  const ages = formatAges(t, ch.format);
  const std = ch.standardLevel;
  const loadouts = allowedPlan(t, g.warPlan, ages, 'epic', playerLegendaries(s, t, ages));
  return spec({
    generalId: g.id,
    displayName: g.nameKey,
    tier: ch.difficulties[difficulty],
    level: std,
    format: ch.format,
    side: side(g.nameKey, loadouts, levelsFor(t, std)),
    seed: draw.matchSeed,
    modifiers: [draw.modifier],
    disclosures: g.disclosureKeys,
    standardLevels: true,
  });
}

function conquestOpponent(s: SaveDoc, t: Content, id: string | undefined): OpponentSpec {
  const board = t.generals.conquest.board;
  const entry = board.find((b) => b.general === id) ?? board[0];
  const g = entry ? generalDef(t, entry.general) : null;
  if (!entry || !g) throw new Error('meta: the content has no Conquest board');
  const format = t.generals.conquest.format;
  const level = clampLevel(t, entry.level);
  const legendary = Object.fromEntries(Object.keys(t.units).filter((u) => t.units[u]?.rarity === 'legendary').map((u) => [u, g.legendaryLevel ?? level]));
  return spec({
    generalId: g.id,
    displayName: g.nameKey,
    tier: entry.tier,
    level,
    format,
    side: side(g.nameKey, fullPlan(t, g.warPlan, formatAges(t, format)), levelsFor(t, level, legendary)),
    seed: seedOf(s, `conquest:${g.id}`),
    disclosures: g.disclosureKeys,
  });
}

function skirmishOpponent(s: SaveDoc, t: Content, o: SkirmishOptions): OpponentSpec {
  const arena = arenaOf(s, t);
  const tier = Math.max(0, Math.min(t.arenas.ladder.maxTier, Math.trunc(o.tier)));
  const ages = formatAges(t, o.format);
  const std = t.arenas.ladder.standardLevel;
  const seed = seedOf(s, `skirmish:${o.generalId}:${tier}:${o.format}:${o.standardLevels ? 1 : 0}`);
  const echo = generalDef(t, 'echo');
  if (o.generalId === 'echo' && echo) {
    // Echo of You mirrors the active plan with the player's levels (A7.4).
    const plan = activePlan(s);
    const loadouts = fullPlan(t, plan?.loadouts ?? null, ages);
    const levels = levelsFor(t, 1);
    for (const id of Object.keys(levels)) levels[id] = o.standardLevels ? std : Math.max(1, s.collection[id]?.level ?? 1);
    const planIds = ages.flatMap((a) => [...(loadouts[a]?.units ?? []), ...(loadouts[a]?.turrets ?? [])]).filter((id): id is CardId => id !== null);
    const avg = planIds.length > 0 ? Math.trunc(planIds.reduce((n, id) => n + (levels[id] ?? 1), 0) / planIds.length) : 1;
    return spec({
      generalId: echo.id,
      displayName: echo.nameKey,
      tier,
      level: o.standardLevels ? std : avg,
      format: o.format,
      side: side(echo.nameKey, loadouts, levels, { ...s.skins.equipped }),
      seed,
      disclosures: [ECHO_DISCLOSURE_KEY],
      standardLevels: o.standardLevels,
    });
  }
  const g = generalDef(t, o.generalId);
  const general = g && !g.scripted && !g.mirror ? g : generalDef(t, 'pip');
  if (!general) throw new Error('meta: the content has no Generals');
  const level = clampLevel(t, o.standardLevels ? std : arena.botLevel);
  const legendary = Object.fromEntries(Object.keys(t.units).filter((u) => t.units[u]?.rarity === 'legendary').map((u) => [u, o.standardLevels ? std : (general.legendaryLevel ?? level)]));
  return spec({
    generalId: general.id,
    displayName: general.nameKey,
    tier,
    level,
    format: o.format,
    side: side(general.nameKey, fullPlan(t, general.warPlan, ages), levelsFor(t, level, legendary)),
    seed,
    // A6.8: The Warden still fields his Legendaries at Standard levels, so the VS screen still says
    // so (at the Standard level, not his own).
    disclosures: o.standardLevels ? (general.legendaryLevel !== null ? [WARDEN_STANDARD_DISCLOSURE_KEY] : []) : general.disclosureKeys,
    standardLevels: o.standardLevels,
  });
}

function tutorialOpponent(s: SaveDoc, t: Content): OpponentSpec {
  const grogg = generalDef(t, 'grogg');
  if (s.matchesPlayed === 0 && grogg) {
    const format: FormatId = 'tutorial';
    return spec({
      generalId: grogg.id,
      displayName: grogg.nameKey,
      tier: 0,
      level: 1,
      format,
      side: side(grogg.nameKey, { ...(grogg.warPlan ?? {}) }, levelsFor(t, 1)),
      seed: seedOf(s, 'tutorial:1'),
      disclosures: grogg.disclosureKeys,
    });
  }
  const pip = generalDef(t, TUTORIAL_MATCH2.general);
  if (!pip) throw new Error('meta: the content has no tutorial General');
  const arena = t.arenas.list[0] ?? arenaOf(s, t);
  return ladderGeneral(s, t, pip, TUTORIAL_MATCH2.tier, arena, TUTORIAL_MATCH2.format, seedOf(s, 'tutorial:2'));
}

/** The Echo of You label (A7.1, A15.3): "AI · Echo of You: an AI playing your War Plan". */
export const ECHO_DISCLOSURE_KEY = 'app.disclosure.echo';

/** The Warden's Legendaries at Standard levels (A6.8: the one exception, disclosed on VS). */
export const WARDEN_STANDARD_DISCLOSURE_KEY = 'app.disclosure.wardenStandard';

/** The VS disclosure of the A6.8 new-player bonus, during the onboarding matches (A15.3). */
export const ROOKIE_DISCLOSURE_KEY = 'app.disclosure.rookie';

/** Picks the opponent for a match (see the module note). */
export function pickOpponentAt(s: SaveDoc, mode: MatchResultInput['mode'], t: Content, lt: LocalTime, o: OpponentOptions = {}): OpponentSpec {
  const spec = pickOpponentRaw(s, mode, t, lt, o);
  // A15.3: while the bot gets A6.8's extra mistakes, the VS screen says so. A difficulty the player
  // picked (Skirmish, Quick Battle) never gets them (owner feedback 2026-09-28).
  if (newPlayerMistakesApply(s, mode, t) && !spec.disclosures.includes(ROOKIE_DISCLOSURE_KEY)) {
    return { ...spec, disclosures: [...spec.disclosures, ROOKIE_DISCLOSURE_KEY] };
  }
  return spec;
}

function pickOpponentRaw(s: SaveDoc, mode: MatchResultInput['mode'], t: Content, lt: LocalTime, o: OpponentOptions): OpponentSpec {
  switch (mode) {
    case 'ladder':
      return ladderOpponent(s, t, o);
    case 'daily':
      return dailyOpponent(s, t, lt, o.daily?.difficulty ?? defaultDailyDifficulty(s, t));
    case 'conquest':
      return conquestOpponent(s, t, o.conquestGeneral);
    case 'skirmish':
      return skirmishOpponent(s, t, o.skirmish ?? { generalId: 'echo', tier: 0, format: 'short', standardLevels: false });
    case 'tutorial':
      return tutorialOpponent(s, t);
    case 'warPath':
      return warPathOpponent(s, t, o.warPath ?? { level: nextLevelId(s, t), difficulty: warPathOf(s).difficulty });
  }
}

/** The boss base disclosure on VS (A18.7.6). */
export const BOSS_DISCLOSURE_KEY = 'warPath.disclosure.boss';

/**
 * A War Path level (A18.7): the level's General at the level's tier for the difficulty (A18.6.2),
 * with its personal War Plan over the level's window, its cards at the level's bot level, the
 * disclosed modifiers, and for a boss the +HP base and extra turret (`sideMods`, disclosed).
 */
function warPathOpponent(s: SaveDoc, t: Content, m: WarPathMatch): OpponentSpec {
  const level = levelDef(t, m.level) ?? levelDef(t, nextLevelId(s, t));
  if (!level) throw new Error('meta: the content has no War Path');
  const g = generalDef(t, level.general) ?? generalDef(t, 'pip');
  if (!g) throw new Error('meta: the content has no Generals');
  const format = level.format;
  const bot = clampLevel(t, level.botLevel);
  const legendary = Object.fromEntries(Object.keys(t.units).filter((u) => t.units[u]?.rarity === 'legendary').map((u) => [u, g.legendaryLevel ?? bot]));
  const opp = side(g.nameKey, fullPlan(t, g.warPlan, formatAges(t, format)), levelsFor(t, bot, legendary));
  if (level.boss) opp.sideMods = { baseHpBp: level.boss.baseHpBp, extraTurret: level.boss.extraTurret };
  return spec({
    generalId: g.id,
    displayName: g.nameKey,
    tier: levelTier(t, level, m.difficulty),
    level: bot,
    format,
    side: opp,
    seed: seedOf(s, `warPath:${level.id}:${m.difficulty}`),
    modifiers: [...level.modifiers],
    disclosures: [...(level.boss ? [BOSS_DISCLOSURE_KEY] : []), ...g.disclosureKeys],
  });
}
