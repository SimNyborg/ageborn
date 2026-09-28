/**
 * Codex Level (DESIGN A6.7). Upgrades earn Codex points: +1 Common, +2 Rare, +4 Epic, +8 Legendary.
 * A level takes 15 points; a save starts at level 1 (1,215 points in all, so levels 1-82).
 *
 * Level rewards: 100 Amber every level; a Silver Codex Capsule at levels 5, 15, 25 ... alternating
 * with a Wardrobe Crate at 10, 20, 30 ...; frames at 5, 15, 25 ... 75 (A5.8); the Collector and
 * Curator titles at 10 and 40.
 */
import type { SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { grantCapsuleAt } from './capsules/grant';
import { grantCrateAt } from './capsules/wardrobe';
import { addCosmetics, unlockTitles } from './titles';

/** The Codex Level for a points total. */
export function codexLevelFor(points: number, t: Content): number {
  return 1 + Math.floor(Math.max(0, points) / t.quests.codex.pointsPerLevel);
}

/** Points still needed for the next level. */
export function codexPointsToNext(s: Pick<SaveDoc, 'codexPoints'>, t: Content): number {
  const per = t.quests.codex.pointsPerLevel;
  return per - (Math.max(0, s.codexPoints) % per);
}

function every(level: number, first: number, step: number): boolean {
  return level >= first && (level - first) % step === 0;
}

/** Adds Codex points and pays every level reached. Returns the save and the levels reached. */
export function addCodexPoints(s: SaveDoc, t: Content, points: number, now: number): { save: SaveDoc; levels: number[] } {
  const codexPoints = s.codexPoints + points;
  const target = codexLevelFor(codexPoints, t);
  let save: SaveDoc = { ...s, codexPoints };
  const levels: number[] = [];
  const rules = t.quests.codex;
  for (let level = s.codexLevel + 1; level <= target; level += 1) {
    levels.push(level);
    save = { ...save, codexLevel: level, currencies: { ...save.currencies, amber: save.currencies.amber + rules.amberPerLevel } };
    if (every(level, rules.capsule.firstLevel, rules.capsule.every)) {
      save = grantCapsuleAt(save, 'codex', t, now, { tier: rules.capsule.tier }).save;
    }
    if (every(level, rules.wardrobe.firstLevel, rules.wardrobe.every)) save = grantCrateAt(save, 'codex', t, now).save;
    save = addCosmetics(save, t.cosmetics.frames.filter((f) => f.codexLevel === level).map((f) => f.id));
  }
  if (levels.length > 0) save = unlockTitles(save, t).save;
  return { save, levels };
}
