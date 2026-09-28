/**
 * Match results and rewards (DESIGN A6.3, A6.7, A6.8, A6.10, A9.1, A9 #7).
 *
 * | Mode | Rewards |
 * |---|---|
 * | Ladder win | +30 trophies; 20 Amber and a Win Capsule if a free capsule or a charge is left, otherwise 40 Amber and a Clay pip |
 * | Ladder loss | −20 trophies (none below 400, never below the arena gate); 15 Amber; a Clay pip |
 * | Ladder draw | 0 trophies; 15 Amber; a Clay pip |
 * | Tutorial (A8 matches 1-2) | the ladder Amber for the result and the next scripted capsule, win or lose ("a loss still gives rewards"); no trophies, charges or MMR |
 * | Skirmish | 5 Amber per win; no trophies, no capsules |
 * | Daily Challenge | first win of the day: an Age Capsule; later wins 20 Amber; no charges, no trophies |
 * | Conquest | one-time star rewards and milestones; no charges, no trophies, no MMR |
 *
 * Ladder results also move the hidden MMR and the loss streak (loss protection). Every mode updates
 * the profile stats, quest progress and titles. The returned steps are what the result screen stages
 * one at a time: trophies, Amber, capsule or Clay pip, stars, quest progress, arenas, titles.
 */
import type { AgeId, MatchResultInput, RewardStep, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { grantCapsuleAt } from './capsules/grant';
import { addClayPip, payForWinCapsule } from './charges';
import { applyConquest } from './conquest';
import { dailyWin } from './daily';
import { updateMmr } from './mmr';
import { addQuestProgress, matchProgress } from './quests';
import { META_FLAGS } from './rules';
import { tickTimersAt } from './timers';
import { unlockTitles } from './titles';
import { applyTrophies, trophyDelta, type LadderResult } from './trophies';
import { planHasLegendary } from './warplan';
import type { LocalTime } from './time';

/** The player's result: win, loss (retreat included) or draw. */
export function resultOf(r: Pick<MatchResultInput, 'outcome' | 'mySide'>): LadderResult {
  if (r.outcome.winner === null) return 'draw';
  return r.outcome.winner === r.mySide ? 'win' : 'loss';
}

function addAmber(s: SaveDoc, amount: number, steps: RewardStep[]): SaveDoc {
  if (amount <= 0) return s;
  steps.push({ kind: 'amber', amount });
  return { ...s, currencies: { ...s.currencies, amber: s.currencies.amber + amount } };
}

function bump(list: readonly number[], index: number): number[] {
  const out = [...list];
  while (out.length <= index) out.push(0);
  out[index] = (out[index] ?? 0) + 1;
  return out;
}

/** Profile stats after one match (A6.1). */
function recordStats(s: SaveDoc, t: Content, r: MatchResultInput, result: LadderResult): SaveDoc {
  const st = s.stats;
  const tier = Math.max(0, Math.trunc(r.opponent.tier));
  const ages = t.formats[r.opponent.format]?.ages ?? [];
  const reachedFuture = r.stats.reachedFinalAgeAtMs !== null && ages[ages.length - 1] === 'future';
  const win = result === 'win';
  return {
    ...s,
    matchesPlayed: s.matchesPlayed + 1,
    stats: {
      ...st,
      matches: st.matches + 1,
      wins: st.wins + (win ? 1 : 0),
      losses: st.losses + (result === 'loss' ? 1 : 0),
      draws: st.draws + (result === 'draw' ? 1 : 0),
      winsByTier: win ? bump(st.winsByTier, tier) : st.winsByTier,
      lossesByTier: result === 'loss' ? bump(st.lossesByTier, tier) : st.lossesByTier,
      fastestWinMs: win ? (st.fastestWinMs === null ? r.stats.durationMs : Math.min(st.fastestWinMs, r.stats.durationMs)) : st.fastestWinMs,
      futureReached: st.futureReached + (reachedFuture ? 1 : 0),
    },
  };
}

function ladder(s: SaveDoc, t: Content, r: MatchResultInput, result: LadderResult, now: number, steps: RewardStep[], arenas: number[]): SaveDoc {
  const rules = t.arenas.ladder;
  const delta = trophyDelta(s, t, result);
  steps.push({ kind: 'trophies', delta });
  const moved = applyTrophies(s, t, delta);
  arenas.push(...moved.arenas);
  let save: SaveDoc = {
    ...moved.save,
    mmr: updateMmr(s.mmr, r.opponent.tier, result, rules),
    lossStreak: result === 'loss' ? s.lossStreak + 1 : 0,
    flags: { ...moved.save.flags, [META_FLAGS.ladderPlayed]: true },
  };
  let pip = true;
  if (result === 'win') {
    const paid = payForWinCapsule(save, t, now, true);
    if (paid) {
      save = addAmber(paid.save, rules.win.amber, steps);
      const g = grantCapsuleAt(save, 'win', t, now);
      save = g.save;
      steps.push({ kind: 'capsule', capsuleId: g.capsule.id });
      pip = false;
    } else save = addAmber(save, rules.win.amberWithoutCharge, steps);
  } else save = addAmber(save, result === 'loss' ? rules.loss.amber : rules.draw.amber, steps);
  if (pip) {
    const p = addClayPip(save, t, now);
    save = p.save;
    steps.push({ kind: 'clayPip', meter: p.meter });
    if (p.capsule) steps.push({ kind: 'capsule', capsuleId: p.capsule.id });
  }
  return save;
}

function tutorial(s: SaveDoc, t: Content, result: LadderResult, now: number, steps: RewardStep[]): SaveDoc {
  const rules = t.arenas.ladder;
  let save = addAmber(s, result === 'win' ? rules.win.amber : result === 'loss' ? rules.loss.amber : rules.draw.amber, steps);
  save = payForWinCapsule(save, t, now, false)?.save ?? save;
  const g = grantCapsuleAt(save, 'win', t, now);
  steps.push({ kind: 'capsule', capsuleId: g.capsule.id });
  return g.save;
}

/**
 * Applies a finished match (see the module note). `age` is the Age Capsule age the player picked
 * when {@link ageCapsuleDue} said one is due (Daily Challenge first win, Conquest star 3); without
 * it the default age is used.
 */
export function applyMatchResultAt(
  s: SaveDoc,
  r: MatchResultInput,
  t: Content,
  lt: LocalTime,
  o: { age?: AgeId } = {},
): { save: SaveDoc; rewards: RewardStep[] } {
  const now = lt.t;
  const result = resultOf(r);
  const win = result === 'win';
  const steps: RewardStep[] = [];
  const arenas: number[] = [];
  let save = tickTimersAt(s, t, lt);
  const titlesBefore = new Set(save.cosmetics.owned);

  switch (r.mode) {
    case 'ladder':
      save = ladder(save, t, r, result, now, steps, arenas);
      break;
    case 'tutorial':
      save = tutorial(save, t, result, now, steps);
      break;
    case 'skirmish':
      if (win) save = addAmber(save, t.arenas.ladder.skirmishWinAmber, steps);
      break;
    case 'daily':
      if (win) {
        const d = dailyWin(save, t, lt, o.age);
        save = d.save;
        if (d.capsuleId) steps.push({ kind: 'capsule', capsuleId: d.capsuleId });
        if (d.amber > 0) steps.push({ kind: 'amber', amount: d.amber });
      }
      break;
    case 'conquest': {
      const c = applyConquest(save, t, r.opponent.generalId, win, r.stats, now, o.age);
      save = c.save;
      steps.push(...c.steps);
      break;
    }
  }

  save = recordStats(save, t, r, result);
  const facts = { mode: r.mode, win, format: r.opponent.format, outcome: r.outcome, stats: r.stats, legendaryInPlan: planHasLegendary(save, t, r.opponent.format) };
  const q = addQuestProgress(save, t, (def) => matchProgress(def, facts));
  save = q.save;
  steps.push(...q.steps);
  for (const a of arenas) steps.push({ kind: 'arena', arenaIndex: a });
  save = unlockTitles(save, t, {
    win,
    usedLastStand: r.stats.usedLastStand,
    format: r.opponent.format,
    reachedFinalAgeAtMs: r.stats.reachedFinalAgeAtMs,
    generalId: r.opponent.generalId,
  }).save;
  const titleIds = new Set(t.cosmetics.titles.map((d) => d.id));
  for (const id of save.cosmetics.owned) if (titleIds.has(id) && !titlesBefore.has(id)) steps.push({ kind: 'title', title: id });
  return { save, rewards: steps };
}

/**
 * True when applying `r` would grant an Age Capsule whose age the player picks in a dialog first
 * (A6.4 "all from one age picked in a dialog when granted"): the Daily Challenge's first win of the
 * day or a new Conquest star 3. The app asks for the age, then passes it to `applyMatchResult`. A
 * scripted capsule (A6.5) ignores the age, so it needs no dialog.
 */
export function ageCapsuleDue(s: SaveDoc, r: MatchResultInput, t: Content, lt: LocalTime): boolean {
  if (r.mode !== 'daily' && r.mode !== 'conquest') return false;
  const before = new Set(s.capsules.pending.map((p) => p.id));
  const { save } = applyMatchResultAt(s, r, t, lt);
  return save.capsules.pending.some((p) => !before.has(p.id) && p.kind === 'age' && p.scriptIndex === null);
}
