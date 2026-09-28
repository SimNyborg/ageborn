/**
 * Trophies, arenas and the Trophy Road (DESIGN A6.3).
 *
 * - Ladder results: win +30, loss −20 (no loss below 400 trophies, never below the current arena
 *   gate), draw 0. The best count only rises.
 * - The arena follows the trophies and never goes down (a loss can never drop below its gate). An
 *   arena sets the ladder formats, the drop pool, the bot tiers and the bot level.
 * - The Trophy Road: 60 nodes, claimable once each up to the best trophies. "Gate N" nodes pay that
 *   arena's gate rewards (banners, capsules, the Age Unlock Capsules, the Crystal Spire). Conquest and
 *   The Warden follow the arena itself, so they need no claim. `trophies.roadClaimed` holds the
 *   claimed nodes' trophy values.
 */
import type { Result, SaveDoc } from '@/contracts';
import type { Content, GateReward, RoadReward } from '@/content';
import { grantCapsuleAt } from './capsules/grant';
import { grantCrateAt } from './capsules/wardrobe';
import { arenaOf } from './tables';
import { addCosmetics, unlockTitles } from './titles';

export type LadderResult = 'win' | 'loss' | 'draw';

/** The trophy change of a ladder result (A6.3). */
export function trophyDelta(s: SaveDoc, t: Content, result: LadderResult): number {
  const l = t.arenas.ladder;
  if (result === 'win') return l.win.trophies;
  if (result === 'draw') return l.draw.trophies;
  const cur = s.trophies.current;
  if (cur < l.loss.noLossBelowTrophies) return 0;
  const floor = arenaOf(s, t).trophies;
  return Math.max(floor, cur + l.loss.trophies) - cur;
}

/** The highest 0-based arena index whose gate is at or below `trophies`. */
export function arenaIndexFor(t: Content, trophies: number): number {
  let idx = 0;
  t.arenas.list.forEach((a, i) => {
    if (a.trophies <= trophies) idx = i;
  });
  return idx;
}

/** Applies a trophy change; returns the arenas newly reached (0-based, in order). */
export function applyTrophies(s: SaveDoc, t: Content, delta: number): { save: SaveDoc; arenas: number[] } {
  const current = Math.max(0, s.trophies.current + delta);
  const best = Math.max(s.trophies.best, current);
  const reached = Math.max(s.arenaIndex, arenaIndexFor(t, current));
  const arenas: number[] = [];
  for (let i = s.arenaIndex + 1; i <= reached; i += 1) arenas.push(i);
  let save: SaveDoc = { ...s, trophies: { ...s.trophies, current, best }, arenaIndex: reached };
  if (arenas.length > 0) save = unlockTitles(save, t).save;
  return { save, arenas };
}

function addAmber(s: SaveDoc, n: number): SaveDoc {
  return { ...s, currencies: { ...s.currencies, amber: s.currencies.amber + n } };
}

function addDust(s: SaveDoc, n: number): SaveDoc {
  return { ...s, currencies: { ...s.currencies, dust: s.currencies.dust + n } };
}

function payGate(s: SaveDoc, g: GateReward, t: Content, now: number): SaveDoc {
  switch (g.kind) {
    case 'banner':
      return addCosmetics(s, [g.banner]);
    case 'capsule':
      return grantCapsuleAt(s, 'road', t, now, { tier: g.tier }).save;
    case 'ageUnlock': {
      let save = s;
      for (const age of g.ages) save = grantCapsuleAt(save, 'ageUnlock', t, now, { age }).save;
      return save;
    }
    case 'skin': {
      if (!s.skins.owned.includes(g.skin)) return { ...s, skins: { ...s.skins, owned: [...s.skins.owned, g.skin] } };
      const def = t.skins[g.skin];
      return def ? addDust(s, t.rarities.skins[def.rarity].duplicateDust) : s;
    }
    case 'starterPlan':
    case 'conquestUnlock':
    case 'wardenJoins':
      return s;
  }
}

function payRoad(s: SaveDoc, r: RoadReward, t: Content, now: number): SaveDoc {
  switch (r.kind) {
    case 'amber':
      return addAmber(s, r.amount);
    case 'dust':
      return addDust(s, r.amount);
    case 'power':
      return s.powersOwned.includes(r.card) ? s : { ...s, powersOwned: [...s.powersOwned, r.card] };
    case 'capsule':
      return grantCapsuleAt(s, 'road', t, now, { tier: r.tier }).save;
    case 'wardrobe':
      return grantCrateAt(s, 'road', t, now).save;
    case 'gate': {
      const arena = t.arenas.list.find((a) => a.index === r.arena);
      return (arena?.gateRewards ?? []).reduce((acc, g) => payGate(acc, g, t, now), s);
    }
  }
}

/** Claims the Trophy Road node at `trophies`. Reasons: unknownNode, locked, claimed. */
export function claimRoad(s: SaveDoc, trophies: number, t: Content, now: number): Result<SaveDoc> {
  const node = t.trophyRoad.nodes.find((n) => n.trophies === trophies);
  if (!node) return { ok: false, reason: 'unknownNode' };
  if (node.trophies > s.trophies.best) return { ok: false, reason: 'locked' };
  if (s.trophies.roadClaimed.includes(node.trophies)) return { ok: false, reason: 'claimed' };
  const marked: SaveDoc = { ...s, trophies: { ...s.trophies, roadClaimed: [...s.trophies.roadClaimed, node.trophies] } };
  return { ok: true, value: node.rewards.reduce((acc, r) => payRoad(acc, r, t, now), marked) };
}

/** Road nodes the save can claim now. */
export function claimableRoadNodes(s: SaveDoc, t: Content): number[] {
  return t.trophyRoad.nodes.filter((n) => n.trophies <= s.trophies.best && !s.trophies.roadClaimed.includes(n.trophies)).map((n) => n.trophies);
}
