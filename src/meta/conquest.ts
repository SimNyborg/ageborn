/**
 * Conquest, the mastery board (DESIGN A6.10).
 *
 * - Unlocks at Arena 3. Nine Generals in a fixed order; each opens after the previous one is beaten
 *   once. Full War against the General's personal War Plan at a fixed tier and level.
 * - Stars are one-time rewards per General: star 1 = a win (200 Amber); star 2 = a win with your base
 *   above 50% HP (100 Dust); star 3 = a win before 6:00 (an Age Capsule). One win can earn several.
 * - Milestones: 9 stars give a Jade Capsule, 18 a Jade Capsule, 27 an Aeon Capsule and the title
 *   Conqueror. `conquest.milestonesClaimed` holds the star thresholds paid.
 * - Conquest matches use no charges, change no trophies and do not move MMR.
 * - A result against a General that is not open yet (before Arena 3, or before the previous General
 *   is beaten) pays nothing: the board is the rule, not only the screen.
 */
import type { AgeId, MatchStats, RewardStep, SaveDoc } from '@/contracts';
import type { ConquestRules, Content, GeneralId } from '@/content';
import { grantCapsuleAt } from './capsules/grant';
import { arenaOf } from './tables';
import { addCosmetics, conquestStarTotal, unlockTitles } from './titles';

export interface ConquestEntry {
  general: GeneralId;
  tier: number;
  level: number;
  stars: [boolean, boolean, boolean];
  open: boolean;
  beaten: boolean;
}

const NO_STARS: [boolean, boolean, boolean] = [false, false, false];

export function conquestUnlocked(s: SaveDoc, t: Content): boolean {
  return arenaOf(s, t).index >= t.generals.conquest.unlockArena;
}

/** The board with each General's stars and whether it is open (A6.10). */
export function conquestBoard(s: SaveDoc, t: Content): ConquestEntry[] {
  const unlocked = conquestUnlocked(s, t);
  let prevBeaten = true;
  return t.generals.conquest.board.map((b) => {
    const stars = s.conquest.stars[b.general] ?? NO_STARS;
    const beaten = stars[0];
    const entry: ConquestEntry = { general: b.general, tier: b.tier, level: b.level, stars: [...stars], open: unlocked && prevBeaten, beaten };
    prevBeaten = beaten;
    return entry;
  });
}

/** Which of the three star conditions a result meets (A6.10). */
export function starsEarned(rules: ConquestRules, win: boolean, stats: MatchStats): [boolean, boolean, boolean] {
  const out: [boolean, boolean, boolean] = [false, false, false];
  if (!win) return out;
  for (const s of rules.stars) {
    const c = s.condition;
    const met = c.kind === 'win' ? true : c.kind === 'winBaseAbove' ? stats.ownBaseHpBpAtEnd > c.bp : stats.durationMs < c.ms;
    out[s.star - 1] = met;
  }
  return out;
}

/** Applies a Conquest result: new stars pay once, then any milestone reached. */
export function applyConquest(
  s: SaveDoc,
  t: Content,
  generalId: string,
  win: boolean,
  stats: MatchStats,
  now: number,
  age?: AgeId,
): { save: SaveDoc; steps: RewardStep[] } {
  const rules = t.generals.conquest;
  // Stars only count on the board as it stands: from Arena 3, each General after the previous one.
  if (!conquestBoard(s, t).some((e) => e.general === generalId && e.open)) return { save: s, steps: [] };
  const had = s.conquest.stars[generalId] ?? NO_STARS;
  const got = starsEarned(rules, win, stats);
  const stars: [boolean, boolean, boolean] = [had[0] || got[0], had[1] || got[1], had[2] || got[2]];
  let save: SaveDoc = { ...s, conquest: { ...s.conquest, stars: { ...s.conquest.stars, [generalId]: stars } } };
  const steps: RewardStep[] = [];
  for (const def of rules.stars) {
    const i = def.star - 1;
    if (had[i] || !got[i]) continue;
    steps.push({ kind: 'star', generalId, star: def.star });
    const r = def.reward;
    if (r.kind === 'amber') {
      save = { ...save, currencies: { ...save.currencies, amber: save.currencies.amber + r.amount } };
      steps.push({ kind: 'amber', amount: r.amount });
    } else if (r.kind === 'dust') {
      save = { ...save, currencies: { ...save.currencies, dust: save.currencies.dust + r.amount } };
      steps.push({ kind: 'dust', amount: r.amount });
    } else {
      const g = grantCapsuleAt(save, 'age', t, now, age ? { age } : {});
      save = g.save;
      steps.push({ kind: 'capsule', capsuleId: g.capsule.id });
    }
  }
  const total = conquestStarTotal(save);
  for (const m of rules.milestones) {
    if (total < m.stars || save.conquest.milestonesClaimed.includes(m.stars)) continue;
    save = { ...save, conquest: { ...save.conquest, milestonesClaimed: [...save.conquest.milestonesClaimed, m.stars] } };
    const g = grantCapsuleAt(save, 'conquest', t, now, { tier: m.capsule });
    save = g.save;
    steps.push({ kind: 'capsule', capsuleId: g.capsule.id });
    if (m.title) save = addCosmetics(save, [m.title]);
  }
  return { save: unlockTitles(save, t).save, steps };
}
