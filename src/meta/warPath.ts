/**
 * The War Path (DESIGN A18.7, ui-plan 6.4): pure progress rules.
 *
 * - **Order.** Levels are played in map order: a level is open once the one before it is beaten (on
 *   any difficulty); the next region opens when its boss is beaten once (A18.7.4). Beaten levels can
 *   be replayed at any time. The **current** level is the first one not beaten yet.
 * - **Tier** (A18.6.2): region base tier + the level's offset + the difficulty's offset, clamped to
 *   [0, X]; Legendary always plays at X.
 * - **Stars** (A18.7.4): ★ a win, ★★ a win that meets the disclosed goal, ★★★ the goal met on Hard
 *   or harder. The best result is kept; each new star is a reward step. **Crowns** record the hardest
 *   difficulty beaten (1 Easy ... 5 Legendary).
 * - **First clear** (A18.7.8) pays the level's Amber, a boss's fixed capsule and a named card (level
 *   3 a Rare, the boss an Epic; an owned card gains a copy). A result on a level that is not open pays
 *   nothing (the map is the rule, not only the screen).
 * - **Unlocks** (ui-plan 2.6): Home features open one per level beaten; a save from before the War
 *   Path keeps everything open (`legacy`).
 * - Losses in a row are counted for the Result's "Try Easy" (A18.7.4); a win resets them.
 */
import type { CardId, MatchStats, RewardStep, SaveDoc, WarPathDifficulty, WarPathMatch } from '@/contracts';
import type { Content, Difficulty, StarGoal, WarPathLevel, WarPathRegion, WarPathUnlock } from '@/content';
import { grantCapsuleAt } from './capsules/grant';
import { grantWarPathFort } from './forts';
import { grantWarPathPower } from './powers';

/** A node's state on the map. */
export type WarPathNodeState = 'beaten' | 'current' | 'locked';

export interface WarPathNode {
  level: WarPathLevel;
  state: WarPathNodeState;
  /** Best stars 0-3. */
  stars: number;
  /** Hardest difficulty beaten: 0 none, 1 Easy ... 5 Legendary. */
  crown: number;
  /** Index of the level in map order. */
  position: number;
}

/** The progress of a save that has none (older in-memory docs). */
const EMPTY: SaveDoc['warPath'] = { path: 'normal', stars: {}, crowns: {}, relics: [], difficulty: 'normal', lossStreak: 0, legacy: false };

export function warPathOf(s: SaveDoc): SaveDoc['warPath'] {
  return s.warPath ?? EMPTY;
}

export function levelDef(t: Content, id: string): WarPathLevel | null {
  return t.warPath.levels[id] ?? null;
}

/** Best stars on a level (0 when not beaten). */
export function levelStars(s: SaveDoc, id: string): number {
  return warPathOf(s).stars[id] ?? 0;
}

export function isBeaten(s: SaveDoc, id: string): boolean {
  return levelStars(s, id) > 0;
}

/** The first level not beaten yet, in map order; null once every level is beaten. */
export function currentLevelId(s: SaveDoc, t: Content): string | null {
  return t.warPath.order.find((id) => !isBeaten(s, id)) ?? null;
}

/**
 * The level Home's Play starts (U2): the current level, or after the whole path the last level
 * (a replay until the Veteran Path ships).
 */
export function nextLevelId(s: SaveDoc, t: Content): string {
  return currentLevelId(s, t) ?? t.warPath.order[t.warPath.order.length - 1]!;
}

/** True when the level may be played: beaten before, or the current level. */
export function levelOpen(s: SaveDoc, t: Content, id: string): boolean {
  if (!levelDef(t, id)) return false;
  return isBeaten(s, id) || currentLevelId(s, t) === id;
}

/** Every node of the map with its state. */
export function warPathNodes(s: SaveDoc, t: Content): WarPathNode[] {
  const p = warPathOf(s);
  const current = currentLevelId(s, t);
  return t.warPath.order.map((id, position) => {
    const level = t.warPath.levels[id]!;
    const stars = p.stars[id] ?? 0;
    return { level, state: stars > 0 ? 'beaten' : id === current ? 'current' : 'locked', stars, crown: p.crowns[id] ?? 0, position };
  });
}

/** The region a level belongs to. */
export function regionOf(t: Content, id: string): WarPathRegion | null {
  const age = levelDef(t, id)?.region;
  return t.warPath.regions.find((r) => r.age === age) ?? null;
}

/** Levels beaten in all. */
export function beatenCount(s: SaveDoc): number {
  return Object.values(warPathOf(s).stars).filter((n) => n > 0).length;
}

/** Stars earned in all (and the most there are). */
export function starTotal(s: SaveDoc, t: Content): { stars: number; max: number } {
  const p = warPathOf(s);
  let stars = 0;
  for (const id of t.warPath.order) stars += p.stars[id] ?? 0;
  return { stars, max: t.warPath.order.length * 3 };
}

/**
 * ui-plan 2.6 (owner decision 2026-09-30): a Home feature opens with its number of wins in any mode
 * (the beaten War Path levels when they run ahead); the Ladder opens when the onboarding ends, since
 * Home is the 1v1 hub from then on. Always open for a legacy save.
 */
export function featureUnlocked(s: SaveDoc, t: Content, f: WarPathUnlock): boolean {
  if (warPathOf(s).legacy) return true;
  const wins = Math.max(beatenCount(s), s.stats?.wins ?? 0);
  if (f === 'ladder') return s.tutorial.step >= 4 || wins >= t.warPath.unlocks.ladder;
  return wins >= t.warPath.unlocks[f];
}

/** The number of wins that opens a feature (the "5 wins" under a locked tab). */
export function unlockLevel(t: Content, f: WarPathUnlock): number {
  return t.warPath.unlocks[f];
}

function difficultyIndex(t: Content, d: Difficulty): number {
  return Math.max(0, t.warPath.difficulty.order.indexOf(d));
}

/** A18.6.2: the AI tier of a level on a difficulty. */
export function levelTier(t: Content, level: WarPathLevel, d: Difficulty): number {
  const dt = t.warPath.difficulty;
  if (d === 'legendary') return dt.legendaryTier;
  const base = t.warPath.regions.find((r) => r.age === level.region)?.baseTier ?? 0;
  return Math.max(0, Math.min(dt.legendaryTier, base + level.tierOffset + (dt.tierOffset[d] ?? 0)));
}

/** True when the match met the level's ★★ goal. */
export function goalMet(goal: StarGoal, stats: MatchStats): boolean {
  switch (goal.kind) {
    case 'baseAbove':
      return stats.ownBaseHpBpAtEnd > goal.bp;
    case 'winBefore':
      return stats.durationMs < goal.ms;
    case 'noLastStand':
      return !stats.usedLastStand;
    case 'noEconomy':
      return !stats.usedTreasury;
    case 'powerHits':
      return stats.powerMaxHits >= goal.n;
  }
}

/** Stars a result earns (0 for anything but a win). */
export function starsFor(t: Content, level: WarPathLevel, d: Difficulty, win: boolean, stats: MatchStats): number {
  if (!win) return 0;
  if (!goalMet(level.goal2, stats)) return 1;
  return difficultyIndex(t, d) >= difficultyIndex(t, t.warPath.threeStarFrom) ? 3 : 2;
}

/** The chosen War Path difficulty (remembered per save). */
export function setWarPathDifficulty(s: SaveDoc, d: WarPathDifficulty): SaveDoc {
  const p = warPathOf(s);
  if (p.difficulty === d) return s;
  return { ...s, warPath: { ...p, difficulty: d } };
}

/** Adds a card granted by a level: a new card at level 1 (NEW), or one more copy of an owned one. */
function grantCard(s: SaveDoc, card: CardId): SaveDoc {
  const e = s.collection[card];
  const entry = e ? { ...e, copies: e.copies + 1 } : { level: 1, copies: 0, isNew: true, foil: 'none' as const };
  return { ...s, collection: { ...s.collection, [card]: entry } };
}

/**
 * Applies a War Path result: stars, crown, first-clear rewards and the loss streak. `win` false with
 * `draw` true leaves the streak alone.
 */
export function applyWarPath(
  s: SaveDoc,
  t: Content,
  m: WarPathMatch,
  result: 'win' | 'loss' | 'draw',
  stats: MatchStats,
  now: number,
): { save: SaveDoc; steps: RewardStep[] } {
  const level = levelDef(t, m.level);
  if (!level || !levelOpen(s, t, m.level)) return { save: s, steps: [] };
  const p = warPathOf(s);
  const win = result === 'win';
  const steps: RewardStep[] = [];
  const had = p.stars[level.id] ?? 0;
  const got = starsFor(t, level, m.difficulty, win, stats);
  const crown = win ? difficultyIndex(t, m.difficulty) + 1 : 0;
  const lossStreak = win ? 0 : result === 'loss' ? p.lossStreak + 1 : p.lossStreak;
  let save: SaveDoc = {
    ...s,
    warPath: {
      ...p,
      stars: got > had ? { ...p.stars, [level.id]: got } : p.stars,
      crowns: crown > (p.crowns[level.id] ?? 0) ? { ...p.crowns, [level.id]: crown } : p.crowns,
      lossStreak,
    },
  };
  for (let star = had + 1; star <= got; star++) steps.push({ kind: 'pathStar', level: level.id, star: star as 1 | 2 | 3 });
  if (win && had === 0) {
    const r = level.reward;
    if (r.amber > 0) {
      save = { ...save, currencies: { ...save.currencies, amber: save.currencies.amber + r.amber } };
      steps.push({ kind: 'amber', amount: r.amber });
    }
    if (r.card && (t.units[r.card] || t.turrets[r.card])) {
      const owned = !!save.collection[r.card];
      save = grantCard(save, r.card);
      steps.push({ kind: 'card', card: r.card, copies: owned ? 1 : 0 });
    }
    if (r.capsule) {
      const g = grantCapsuleAt(save, 'warPath', t, now, { tier: r.capsule, age: level.region });
      save = g.save;
      steps.push({ kind: 'capsule', capsuleId: g.capsule.id });
    }
    // A16.14.6: a region's L4, L6 and L8 grant its Camp, Trap and Tower (once the Fort slot is open; the
    // first clear of Bronze L4 opens it and grants the walls and the Stone set).
    const f = grantWarPathFort(save, t, level.region, level.index);
    save = f.save;
    steps.push(...f.steps);
    // A2.9.8: the level's War Path power (60 Amber if owned); Stone L5 opens the Field slot (A2.9.1).
    // MVP 2026-10-01 (docs/requests/powers-warpath-grants.md), with the Field slot live in battle.
    const pw = grantWarPathPower(save, t, level.region, level.index);
    save = pw.save;
    steps.push(...pw.steps);
  }
  return { save, steps };
}

/** The onboarding match (1 or 2) as its War Path level (Stone L1 and L2, A8). */
export function onboardingLevelId(t: Content, match: 1 | 2): string | null {
  return t.warPath.order.find((id) => t.warPath.levels[id]?.onboarding === match) ?? null;
}

/** "Try Easy" is offered on the Result after this many War Path losses in a row (A18.7.4). */
export function tryEasyDue(s: SaveDoc, t: Content): boolean {
  const p = warPathOf(s);
  return p.lossStreak >= t.warPath.tryEasyAfter && p.difficulty !== 'easy';
}
