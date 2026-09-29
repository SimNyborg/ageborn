/**
 * The navigation shell's tabs for a save (ui-plan 2.2, 2.3 "Bottom nav", 2.6): which tabs show, which
 * are locked until which War Path level, the next one to unlock ("Lv 5"), the ready badges (at most
 * 2 on Home, Capsules > Army > Progress, never Customize) and each tab's root route.
 *
 * First launch shows no tabs at all; after War Path level 1 all five show, Army open and the rest
 * locked; each opens with its level (Capsules 2, Customize 4, Progress 5). A save from before the War
 * Path keeps everything open.
 */
import type { Content } from '@/content/types';
import type { SaveDoc } from '@/contracts';
import { homeBadges, type NavTab } from '../../components/Nav';
import type { Route, TabId } from '../../router';
import { questViews, roadProgress } from '../model/progress';
import { featureOpen, TAB_FEATURE } from '../model/warPath';

/** Each tab's root screen (interim until UI-4 and UI-6: Army is the War Plan, 6.4). */
export const TAB_ROOTS: Readonly<Record<TabId, Route>> = {
  army: { id: 'warPlan' },
  capsules: { id: 'capsules' },
  warPath: { id: 'home' },
  progress: { id: 'progress' },
  customize: { id: 'customize' },
};

/** Cards whose copies are enough for the next level (the Army ready badge). */
export function upgradesReady(save: SaveDoc, content: Content): number {
  let n = 0;
  for (const id of Object.keys(save.collection)) {
    const e = save.collection[id]!;
    const def = content.units[id] ?? content.turrets[id];
    if (!def) continue;
    const need = content.rarities.cards[def.rarity].upgradeCopies[e.level - 1];
    if (need !== undefined && e.copies >= need) n++;
  }
  return n;
}

/** Claims ready now: finished quests and Trophy Road nodes (the Progress ready badge). */
export function claimsReady(save: SaveDoc, content: Content): number {
  const q = questViews(save, content);
  const quests = q.daily.filter((x) => x.done && !x.claimed).length + (q.weekly && q.weekly.done && !q.weekly.claimed ? 1 : 0);
  return quests + (featureOpen(save, content, 'ladder') ? roadProgress(save, content).claimable : 0);
}

export function shellTabs(save: SaveDoc, content: Content): NavTab[] {
  const any = featureOpen(save, content, 'army');
  const lockLevel = (tab: Exclude<TabId, 'warPath'>): number | null => (featureOpen(save, content, TAB_FEATURE[tab]) ? null : content.warPath.unlocks[TAB_FEATURE[tab]]);
  const locks: Partial<Record<TabId, number | null>> = {
    army: lockLevel('army'),
    capsules: lockLevel('capsules'),
    progress: lockLevel('progress'),
    customize: lockLevel('customize'),
  };
  const next = Math.min(...Object.values(locks).filter((x): x is number => typeof x === 'number'));
  const openable = save.capsules.pending.length + save.capsules.wardrobe.length;
  const badges = homeBadges({
    capsules: locks.capsules === null ? openable : null,
    army: locks.army === null ? upgradesReady(save, content) : null,
    progress: locks.progress === null ? claimsReady(save, content) : null,
  });
  return (['army', 'capsules', 'warPath', 'progress', 'customize'] as const).map((id) => {
    const lockedUntil = locks[id] ?? null;
    return {
      id,
      hidden: !any,
      lockedUntil,
      showLevel: lockedUntil !== null && lockedUntil === next,
      badge: badges[id] ?? null,
    };
  });
}
