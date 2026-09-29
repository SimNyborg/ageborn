/**
 * Result screen model (A9 #7): the outcome from the player's side and the staged reward list
 * (A6.3: trophies tick, Amber, capsule or Clay pip, Codex points, quest progress; each skippable).
 */
import type { Content } from '@/content/types';
import type { MatchResultInput, RewardStep, SaveDoc } from '@/contracts';
import type { MatchResultKind } from './profile';

export function resultKind(input: MatchResultInput): MatchResultKind {
  const w = input.outcome.winner;
  if (w === null) return 'draw';
  return w === input.mySide ? 'win' : 'loss';
}

/** Reward steps in the order they are revealed (as meta returns them), dropping empty ones. */
export function stagedRewards(rewards: readonly RewardStep[]): RewardStep[] {
  return rewards.filter((r) => {
    switch (r.kind) {
      case 'amber':
      case 'dust':
        return r.amount > 0;
      case 'codex':
        return r.points > 0;
      default:
        return true;
    }
  });
}

/** Stagger between two reward reveals (A9 #7), and the trophy count-up time. */
export const REWARD_STEP_MS = 650;
export const COUNT_UP_MS = 600;

/** The capsule earned in this match, if any (Result → Capsule opening, A9 flow). */
export function earnedCapsule(rewards: readonly RewardStep[]): string | null {
  for (const r of rewards) if (r.kind === 'capsule') return r.capsuleId;
  return null;
}

// ---------------------------------------------------------------------------------------------
// A15.13 screen budget: at most 3 staged steps, a step per found feat, one summary row
// ---------------------------------------------------------------------------------------------

/** The one progress bar of step 3: whichever is closest to done (A9 #7, A15.13). */
export interface ResultProgress {
  /** `warPath`: the level's region stars (ui-plan 4.9 "stars earned on the level badge"). */
  kind: 'road' | 'warChest' | 'conquest' | 'warPath';
  value: number;
  max: number;
  /** Trophies of the next Trophy Road node (road only). */
  next?: number;
  /** The War Chest filled in this match and was granted at once (A15.5): the bar shows full. */
  done?: boolean;
  /** The region of a `warPath` bar. */
  region?: string;
}

export type ResultStage =
  /** Step 1: the result with its trophies (ladder), or the result alone. */
  | { kind: 'trophies'; step: Extract<RewardStep, { kind: 'trophies' }> }
  /** Step 2: the main reward (a capsule, an Age Capsule, a Clay pip, a star, a new arena). */
  | { kind: 'main'; step: RewardStep }
  /** Step 3: one progress bar. */
  | { kind: 'progress'; progress: ResultProgress }
  /** A found feat adds its own step (A15.10). */
  | { kind: 'feat'; featId: string };

export interface ResultPlan {
  stages: ResultStage[];
  /** Everything else, in one row that expands on tap. */
  summary: RewardStep[];
}

const MAIN_ORDER: readonly RewardStep['kind'][] = ['capsule', 'card', 'clayPip', 'star', 'arena'];

/** The progress bar closest to done, among the Trophy Road, the War Chest and a Conquest milestone. */
export function closestProgress(save: SaveDoc, content: Content): ResultProgress | null {
  const out: ResultProgress[] = [];
  const nodes = content.trophyRoad.nodes;
  const best = save.trophies.best;
  const next = nodes.find((n) => n.trophies > best);
  if (next) {
    const i = nodes.indexOf(next);
    const from = i > 0 ? nodes[i - 1]!.trophies : 0;
    out.push({ kind: 'road', value: Math.max(0, best - from), max: Math.max(1, next.trophies - from), next: next.trophies });
  }
  const chest = Math.max(1, content.quests.weekly.target);
  out.push({ kind: 'warChest', value: Math.min(chest, Math.max(0, save.quests.weekly.progress)), max: chest });
  const arena = content.arenas.list[Math.max(0, Math.min(content.arenas.list.length - 1, save.arenaIndex))];
  if (arena && arena.index >= content.generals.conquest.unlockArena) {
    const stars = Object.values(save.conquest.stars).reduce((n, s) => n + s.filter(Boolean).length, 0);
    const m = content.generals.conquest.milestones.find((x) => x.stars > stars);
    if (m) out.push({ kind: 'conquest', value: stars, max: m.stars });
  }
  // Closest to done: the highest fraction; ties keep the order above.
  let pick: ResultProgress | null = null;
  for (const p of out) if (p.value < p.max && (!pick || p.value * pick.max > pick.value * p.max)) pick = p;
  return pick;
}

/**
 * Splits the rewards of a result into the staged steps and the summary row (A15.13): (1) the result
 * with trophies, (2) the main reward, (3) one progress bar, plus one step per found feat. The rest
 * (Amber, Dust, Codex points, quest progress, titles) goes into the summary row.
 */
export function resultPlan(rewards: readonly RewardStep[], save: SaveDoc, content: Content, o: { mode: MatchResultInput['mode']; level?: string | null }): ResultPlan {
  const list = stagedRewards(rewards);
  const stages: ResultStage[] = [];
  const used = new Set<RewardStep>();
  // War Path stars stamp onto the level badge in the banner, not into the lists (4.9).
  for (const r of list) if (r.kind === 'pathStar') used.add(r);
  const trophies = list.find((r): r is Extract<RewardStep, { kind: 'trophies' }> => r.kind === 'trophies');
  if (trophies) {
    stages.push({ kind: 'trophies', step: trophies });
    used.add(trophies);
  }
  let main: RewardStep | undefined;
  for (const k of MAIN_ORDER) {
    main = list.find((r) => r.kind === k);
    if (main) break;
  }
  if (main) {
    stages.push({ kind: 'main', step: main });
    used.add(main);
  }
  if (o.mode !== 'tutorial') {
    // A15.5: a War Chest granted by this match is the progress step (its bar full), so the payoff
    // shows even though the saved bar has already restarted at 0.
    const chest = Math.max(1, content.quests.weekly.target);
    const region = o.level ? content.warPath.regions.find((r) => r.levels.includes(o.level!)) : undefined;
    const p = list.some((r) => r.kind === 'crate')
      ? { kind: 'warChest' as const, value: chest, max: chest, done: true }
      : region && o.mode === 'warPath'
        ? { kind: 'warPath' as const, value: region.levels.reduce((n, id) => n + (save.warPath?.stars[id] ?? 0), 0), max: region.levels.length * 3, region: region.age }
        : closestProgress(save, content);
    if (p) stages.push({ kind: 'progress', progress: p });
  }
  for (const r of list) {
    if (r.kind === 'feat') {
      stages.push({ kind: 'feat', featId: r.featId });
      used.add(r);
    }
  }
  return { stages, summary: list.filter((r) => !used.has(r)) };
}

/** A match that ends between 22:00 and 06:00 local time adds the night line (A15.6). */
export function isNight(localHour: number): boolean {
  return localHour >= 22 || localHour < 6;
}

/**
 * The Daily Challenge "Copy result" line (A9.1, A15.7): plain text with no name, for example
 * `Ageborn Daily 2026-10-03 · Glass Armies · Veteran · Won in 5:42 · Base 63%`, or for a loss
 * `... · Veteran · Lost at 6:10` (no Base field). Copying pays nothing.
 */
export function dailyResultLine(o: {
  dateKey: string;
  modifier: string;
  difficulty: string;
  outcome: string;
  time: string;
  basePercent: number;
  lost?: boolean;
  t: (k: string, p?: Record<string, string | number>) => string;
}): string {
  if (o.lost) return o.t('ui.result.dailyLineLost', { date: o.dateKey, modifier: o.modifier, difficulty: o.difficulty, time: o.time });
  return o.t('ui.result.dailyLine', {
    date: o.dateKey,
    modifier: o.modifier,
    difficulty: o.difficulty,
    outcome: o.outcome,
    time: o.time,
    base: Math.max(0, Math.min(100, Math.round(o.basePercent))),
  });
}

/** The Result's actions (ui-plan 4.9, U2). */
export type ResultActionId = 'continue' | 'openCapsule' | 'tryAgain' | 'tryEasy' | 'next' | 'home' | 'copy' | 'replay';

export interface ResultActions {
  /** The one primary, gold, bottom-right (the same spot as Home's Play). */
  primary: ResultActionId;
  secondary: ResultActionId[];
  tertiary: ResultActionId[];
}

/**
 * The action table of ui-plan 4.9, one design for every mode:
 *
 * | Situation | Primary | Secondary |
 * |---|---|---|
 * | War Path (and Conquest) win | Continue | none |
 * | ... with a capsule earned | Open capsule | Continue |
 * | War Path (and Conquest) loss | Try again | Home |
 * | Ladder, Quick Battle, Skirmish | Next battle | Home |
 * | ... with a capsule earned | Open capsule | Next battle, Home |
 * | Daily | Home | Copy result |
 * | Night or a stopping card (A15.6) | Home | Continue / Next battle |
 * | Onboarding | Open capsule, else Continue (Try again after a loss) | none |
 *
 * Watch replay is the tertiary wherever a replay was kept (not in onboarding). The next battle is
 * always at most one tap away.
 */
export function resultActions(o: {
  mode: string;
  outcome: 'win' | 'loss' | 'draw';
  capsule: boolean;
  daily: boolean;
  /** Night (22:00-06:00) or a stopping card (A15.6). */
  stop: boolean;
  replay: boolean;
  onboarding?: boolean;
  /** Onboarding: a retry is offered (A8). */
  canRetry?: boolean;
  /** War Path: 3 losses in a row offer "Try Easy" (A18.7.4). */
  tryEasy?: boolean;
}): ResultActions {
  if (o.onboarding) {
    if (o.capsule) return { primary: 'openCapsule', secondary: o.canRetry ? ['tryAgain'] : [], tertiary: [] };
    if (o.outcome !== 'win' && o.canRetry) return { primary: 'tryAgain', secondary: [], tertiary: [] };
    return { primary: 'continue', secondary: o.canRetry ? ['tryAgain'] : [], tertiary: [] };
  }
  const tertiary: ResultActionId[] = o.replay ? ['replay'] : [];
  const path = o.mode === 'warPath' || o.mode === 'conquest';
  const won = o.outcome === 'win';
  if (o.daily) return { primary: 'home', secondary: ['copy'], tertiary };
  if (o.stop) return { primary: 'home', secondary: path ? (won ? ['continue'] : ['tryAgain']) : ['next'], tertiary };
  if (path) {
    if (!won) return { primary: 'tryAgain', secondary: o.tryEasy ? ['home', 'tryEasy'] : ['home'], tertiary };
    return o.capsule ? { primary: 'openCapsule', secondary: ['continue'], tertiary } : { primary: 'continue', secondary: [], tertiary };
  }
  return o.capsule ? { primary: 'openCapsule', secondary: ['next', 'home'], tertiary } : { primary: 'next', secondary: ['home'], tertiary };
}
