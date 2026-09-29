/**
 * Save version 6: the capsule ladder (DESIGN A6.4, B8; owner request 2026-09-29 "more capsule tiers").
 *
 * The tiers are now Clay, Bronze, Silver, Jade, Gold, Platinum, Aeon (indices 0-6). Gold is the old
 * Aeon's contents plus 100 Dust; the new Aeon holds 3 Legendaries. Nothing earned is taken back or
 * re-rolled (A15.1):
 *
 * 1. The Win Capsule bag in progress finishes with its old mix: tier index 4 (the old Aeon) becomes 6
 *    (the new Aeon), indices 0-3 do not move, and the bag is sorted (its canonical form). `bagSize`
 *    is 100 for a bag in progress (0 when empty), so "N of 100 left" stays true; the next bag is 200.
 * 2. Unopened capsules of tier `aeon` hold the old Aeon's pre-rolled contents, which are exactly the
 *    Gold table: they become `gold` (and `startTier` `gold` where it was `aeon`) with +100 Dust.
 * 3. `flags['capsule.legacySkillAeon']`: the next timer tick grants one new Aeon per skill source the
 *    save already claimed (Trophy Road 4,000, Conquest 27 stars, the War Path finale) and deletes the
 *    flag (meta `grantLegacySkillAeons`, which reads the content).
 * 4. `flags['notice.capsuleLadder']` (the one-time Capsules tab card) for a save past the onboarding
 *    script (more than 5 capsules opened), one that held an old Aeon or one that claimed a skill Aeon.
 *
 * Pity, the RNG streams, the script step, charges and banks are unchanged. Never edit this step; a
 * later change needs a new version.
 */
import type { SaveVersion } from './types';

/** The old Aeon's tier index in a v5 bag, and the new Aeon's. */
const OLD_AEON_INDEX = 4;
const NEW_AEON_INDEX = 6;
/** The size of every bag filled before this version (30/40/20/7/3). */
const LEGACY_BAG_SIZE = 100;
/** Gold is the old Aeon plus this much Dust (A6.4). */
const GOLD_EXTRA_DUST = 100;
/** Capsules the onboarding script covers (A6.5): a save past them gets the notice. */
const SCRIPT_CAPSULES = 5;
/** The skill sources that paid an old Aeon before this version (A6.4 "Every source"). */
const ROAD_SUMMIT_TROPHIES = 4000;
const CONQUEST_AEON_STARS = 27;

export const LEGACY_SKILL_AEON_FLAG = 'capsule.legacySkillAeon';
export const CAPSULE_LADDER_NOTICE_FLAG = 'notice.capsuleLadder';

type Capsule = Record<string, unknown> & { tier?: unknown; startTier?: unknown; contents?: Record<string, unknown> & { dust?: unknown } };
type Doc = Record<string, unknown> & {
  v: number;
  capsules?: Record<string, unknown> & { bag?: unknown; pending?: unknown };
  pity?: { opened?: unknown };
  trophies?: { roadClaimed?: unknown };
  conquest?: { milestonesClaimed?: unknown };
  flags?: Record<string, boolean>;
};

const includes = (list: unknown, x: number): boolean => Array.isArray(list) && list.includes(x);

export const v6: SaveVersion = {
  v: 6,
  summary: 'Capsule ladder: Gold and Platinum tiers; the Win Capsule bag keeps its old mix (index 4 → 6); unopened Aeons become Gold with +100 Dust',
  up: (input) => {
    const doc = input as Doc;
    const caps = doc.capsules ?? {};
    const oldBag = Array.isArray(caps.bag) ? (caps.bag as unknown[]).filter((i): i is number => typeof i === 'number') : [];
    const bag = oldBag.map((i) => (i === OLD_AEON_INDEX ? NEW_AEON_INDEX : i)).sort((a, b) => a - b);
    let relabelled = 0;
    const pending = (Array.isArray(caps.pending) ? (caps.pending as Capsule[]) : []).map((p) => {
      if (p.tier !== 'aeon') return p;
      relabelled += 1;
      const contents = p.contents ?? {};
      const dust = typeof contents.dust === 'number' ? contents.dust : 0;
      return {
        ...p,
        tier: 'gold',
        startTier: p.startTier === 'aeon' ? 'gold' : p.startTier,
        contents: { ...contents, dust: dust + GOLD_EXTRA_DUST },
      };
    });
    const opened = typeof doc.pity?.opened === 'number' ? doc.pity.opened : 0;
    const skillAeon = includes(doc.trophies?.roadClaimed, ROAD_SUMMIT_TROPHIES) || includes(doc.conquest?.milestonesClaimed, CONQUEST_AEON_STARS);
    const flags: Record<string, boolean> = { ...(doc.flags ?? {}), [LEGACY_SKILL_AEON_FLAG]: true };
    if (opened > SCRIPT_CAPSULES || relabelled > 0 || skillAeon) flags[CAPSULE_LADDER_NOTICE_FLAG] = true;
    return {
      ...doc,
      capsules: { ...caps, bag, bagSize: bag.length > 0 ? LEGACY_BAG_SIZE : 0, pending },
      flags,
      v: 6,
    };
  },
};
