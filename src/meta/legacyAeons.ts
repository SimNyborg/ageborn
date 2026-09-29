/**
 * Legacy skill Aeons (DESIGN A6.4 "Every source", B8; the 2026-09-29 capsule ladder).
 *
 * Three Aeons are earned by skill: the Trophy Road summit (4,000), the Conquest 27-star milestone and
 * the War Path finale boss. A save that claimed one of them before the ladder update got an old Aeon
 * there (now a Gold). The ladder migration sets `flags['capsule.legacySkillAeon']`; the next timer
 * tick grants one new Aeon per claimed source through the normal grant path, once, then deletes the
 * flag. So "every player can earn an Aeon by skill" is literally true for veterans too.
 *
 * The sources are read from content: every road node, Conquest milestone and War Path level whose
 * capsule is the top tier of the ladder. Pure and deterministic (the `rng.capsule` stream).
 */
import type { PendingCapsule, SaveDoc } from '@/contracts';
import type { Content } from '@/content';
import { grantCapsuleAt } from './capsules/grant';
import { topTier } from './tables';
import { isBeaten } from './warPath';

/** Set by the ladder migration until the legacy skill Aeons are granted. */
export const LEGACY_SKILL_AEON_FLAG = 'capsule.legacySkillAeon';

/** Set per capsule kind (`road`, `conquest`, `warPath`) when the legacy grant gave an Aeon for it. */
export const legacyGrantedFlag = (kind: PendingCapsule['kind']): string => `${LEGACY_SKILL_AEON_FLAG}.${kind}`;

/** The capsule kind of each skill source the save has claimed, in road, Conquest, War Path order. */
export function legacySkillAeonSources(s: SaveDoc, t: Content): PendingCapsule['kind'][] {
  const top = topTier(t);
  const out: PendingCapsule['kind'][] = [];
  for (const node of t.trophyRoad.nodes) {
    const tops = node.rewards.filter((r) => r.kind === 'capsule' && r.tier === top).length;
    if (tops > 0 && s.trophies.roadClaimed.includes(node.trophies)) for (let i = 0; i < tops; i += 1) out.push('road');
  }
  for (const m of t.generals.conquest.milestones) {
    if (m.capsule === top && s.conquest.milestonesClaimed.includes(m.stars)) out.push('conquest');
  }
  for (const id of t.warPath.order) {
    const level = t.warPath.levels[id];
    if (level?.reward.capsule === top && isBeaten(s, id)) out.push('warPath');
  }
  return out;
}

/**
 * How many new Aeons the legacy grant gives (while the migration flag is set) or gave this save, for
 * the one-time notice card. After the grant it counts what was granted, never a source claimed later.
 */
export function legacySkillAeonCount(s: SaveDoc, t: Content): number {
  const sources = legacySkillAeonSources(s, t);
  if (s.flags[LEGACY_SKILL_AEON_FLAG] === true) return sources.length;
  return [...new Set(sources)].filter((kind) => s.flags[legacyGrantedFlag(kind)] === true).reduce((n, kind) => n + sources.filter((k) => k === kind).length, 0);
}

/** The one-time Capsules tab card about the ladder (set by the ladder migration, cleared when closed). */
export const CAPSULE_LADDER_NOTICE_FLAG = 'notice.capsuleLadder';

/**
 * Grants the legacy skill Aeons once while the flag is set, then deletes the flag. Returns the same
 * object when the flag is not set. When it grants at least one Aeon it also sets the ladder notice, so
 * every granted Aeon is explained, even for a save whose only trigger was a source the migration could
 * not see (the War Path finale: the save package may not read content, so it cannot tell which level
 * is the finale).
 */
export function grantLegacySkillAeons(s: SaveDoc, t: Content, now: number): SaveDoc {
  if (s.flags[LEGACY_SKILL_AEON_FLAG] !== true) return s;
  const top = topTier(t);
  let save = s;
  const flags: Record<string, boolean> = {};
  for (const kind of legacySkillAeonSources(s, t)) {
    save = grantCapsuleAt(save, kind, t, now, { tier: top }).save;
    flags[legacyGrantedFlag(kind)] = true;
  }
  const next = { ...save.flags, ...flags };
  if (Object.keys(flags).length > 0) next[CAPSULE_LADDER_NOTICE_FLAG] = true;
  delete next[LEGACY_SKILL_AEON_FLAG];
  return { ...save, flags: next };
}
