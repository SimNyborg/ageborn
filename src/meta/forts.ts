/**
 * Fort ownership, the Fort slot and the fort match rule (DESIGN A16.14.6, spec section 6; A2.9.8 for the
 * source pattern it copies from powers).
 *
 * - The Fort slot opens with `flags['fort.slot']`: the first of War Path Bronze L4 first clear or 400
 *   trophies (Arena 3). The unlock grants the 8 walls and the Stone Camp, Trap and Tower, fills every empty
 *   Fort slot of every age in every War Plan preset with that age's wall, and grants the forts of every
 *   source the save already has (cleared Bronze-to-Cosmic L4, L6 and L8, claimed fort-set Road nodes).
 * - Sources: a region's L4 grants its Camp, L6 its Trap, L8 its Tower on the first clear; the Trophy Road
 *   fort set (one plain node per region, 2,200-3,200) grants all three. Whichever comes first grants a
 *   card; the other pays 60 Amber. Never in capsules; no copies, levels or Dust. Before the unlock no fort
 *   is granted (the unlock grants the pending ones).
 * - The match rule: both sides always play the same slots. While `FORT_SLOT_IN_BATTLE` is off (F1) every
 *   loadout of both sides is sent with `fort: null`; from F2 a locked slot is sent empty for the player
 *   and every bot, and the Daily Challenge always plays it (each age's wall for a locked player).
 * - Bots use only forts a player at that point could own: the walls and the Stone set once the player's
 *   slot is open; a Bronze-or-later camp, trap or tower when the player has first-cleared its level or
 *   its Road node is ≤ best trophies + 100. War Path level bots may use their region's forts. Anything
 *   else becomes the age's wall.
 */
import type { AgeId, CardId, Loadout, MatchConfig, RewardStep, SaveDoc, SideConfig } from '@/contracts';
import type { Content } from '@/content';
import { FORT_SLOT_IN_BATTLE } from '@/core/fortPads';
import { BOT_ROAD_LOOKAHEAD } from './powers';
import { FORT_OWNED_AMBER, FORT_SLOT_TROPHIES, FORT_UNLOCK_LEVEL, META_FLAGS } from './rules';

/** The Fort slot is unlocked for this save (A16.14.6). */
export function fortSlotUnlocked(s: SaveDoc | null): boolean {
  return !!s && s.flags[META_FLAGS.fortSlot] === true;
}

/** Whether battles of this mode play the Fort slot for this save (the match rule, A16.14.6). */
export function fortSlotLive(s: SaveDoc | null, mode: string, inBattle: boolean = FORT_SLOT_IN_BATTLE): boolean {
  if (!inBattle) return false;
  // Bug hunt 2026-10-01 #16: the Daily used to play the slot for everyone, so a player without forts
  // got a wall and "Drag a wall onto a glowing pad" before forts were taught (ui-plan 2.6). Now the
  // Daily plays it once the slot is open (and still fills an empty one with the age's wall).
  void mode;
  return fortSlotUnlocked(s);
}

/** The War Path level id of a region's level (`wp.bronze.l04`). */
function levelId(age: AgeId, level: number): string {
  return `wp.${age}.l${level < 10 ? `0${level}` : `${level}`}`;
}

/** The forts of the content, in table order (`order.forts`). */
function fortIds(t: Content): CardId[] {
  return t.order.forts ?? Object.keys(t.forts ?? {}).sort();
}

/** An age's wall (the starter, A16.14.4), or null for content without one. */
export function wallOf(t: Content, age: AgeId): CardId | null {
  return fortIds(t).find((id) => t.forts[id]?.age === age && t.forts[id]?.fortKind === 'wall') ?? null;
}

/** The forts granted with the unlock (A16.14.6): every wall (`starter`) and the Stone set (`unlock`). */
export function unlockSet(t: Content): CardId[] {
  return fortIds(t).filter((id) => {
    const f = t.forts[id];
    return f !== undefined && (f.source === 'starter' || f.source === 'unlock');
  });
}

/** The fort a region's War Path level grants on its first clear (A16.14.6: L4 camp, L6 trap, L8 tower), or null. */
export function warPathFortOf(t: Content, region: AgeId, level: number): CardId | null {
  return fortIds(t).find((id) => t.forts[id]?.source === 'warPath' && t.forts[id]?.age === region && t.forts[id]?.warPathLevel === level) ?? null;
}

/** X0: the fort variant a region's side node grants on its first clear (s2), or null. */
export function warPathSideFortOf(t: Content, region: AgeId, side: 1 | 2): CardId | null {
  return fortIds(t).find((id) => t.forts[id]?.source === 'warPath' && t.forts[id]?.age === region && t.forts[id]?.warPathSide === side) ?? null;
}

/** X0: stars earned in a region, main levels and side nodes (the star milestone source, CONTENT_PLAN 6). */
export function regionStars(s: SaveDoc, t: Content, region: AgeId): number {
  const r = t.warPath.regions.find((x) => x.age === region);
  if (!r) return 0;
  return [...r.levels, ...(r.sides ?? [])].reduce((n, id) => n + (s.warPath.stars[id] ?? 0), 0);
}

/** The save flag that records a star-milestone fort as paid (granted or its 60 Amber), so it pays once. */
function starFlag(id: CardId): string {
  return `wp.stars.${id}`;
}

/** Has the save earned this fort through the War Path (a level, a side node or the star milestone)? */
function earnedOnWarPath(s: SaveDoc, t: Content, id: CardId): boolean {
  const f = t.forts[id];
  if (!f || f.source !== 'warPath') return false;
  if (f.warPathLevel !== undefined) return (s.warPath.stars[levelId(f.age, f.warPathLevel)] ?? 0) > 0;
  if (f.warPathSide !== undefined) return (s.warPath.stars[`wp.${f.age}.s${f.warPathSide}`] ?? 0) > 0;
  if (f.warPathStars !== undefined) return regionStars(s, t, f.age) >= f.warPathStars;
  return false;
}

/** The forts of a Trophy Road fort-set node (A16.14.6), in table order. */
export function roadFortsOf(t: Content, node: number): CardId[] {
  return fortIds(t).filter((id) => t.forts[id]?.road === node);
}

/** Grants one fort: a new card joins `fortsOwned`; one already owned pays 60 Amber instead (the power rule). */
function grantOne(s: SaveDoc, id: CardId, steps: RewardStep[]): SaveDoc {
  if (s.fortsOwned.includes(id)) {
    steps.push({ kind: 'amber', amount: FORT_OWNED_AMBER });
    return { ...s, currencies: { ...s.currencies, amber: s.currencies.amber + FORT_OWNED_AMBER } };
  }
  steps.push({ kind: 'card', card: id, copies: 0 });
  return { ...s, fortsOwned: [...s.fortsOwned, id] };
}

/**
 * Opens the Fort slot (A16.14.6), once: the flag, the walls and the Stone set, each empty Fort slot of
 * every age in every preset filled with its age's wall, and the forts of the sources the save already
 * has (cleared L4/L6/L8, claimed fort-set Road nodes; a card from both sources pays 60 Amber once).
 */
export function unlockFortSlot(s: SaveDoc, t: Content): { save: SaveDoc; steps: RewardStep[] } {
  if (fortSlotUnlocked(s) || fortIds(t).length === 0) return { save: s, steps: [] };
  const steps: RewardStep[] = [];
  const owned = [...(s.fortsOwned ?? [])];
  const add = (id: CardId): void => {
    if (owned.includes(id)) return;
    owned.push(id);
    steps.push({ kind: 'card', card: id, copies: 0 });
  };
  for (const id of unlockSet(t)) add(id);
  let amber = 0;
  const had = new Set(owned);
  for (const id of fortIds(t)) {
    const f = t.forts[id];
    if (!f || f.source !== 'warPath' || had.has(id)) continue;
    const byWarPath = earnedOnWarPath(s, t, id);
    const byRoad = f.road !== undefined && s.trophies.roadClaimed.includes(f.road);
    if (!byWarPath && !byRoad) continue;
    add(id);
    if (byWarPath && byRoad) amber += FORT_OWNED_AMBER;
  }
  const warPlans = s.warPlans.map((plan) => {
    const loadouts = { ...plan.loadouts };
    for (const age of Object.keys(loadouts) as AgeId[]) {
      const l = loadouts[age];
      if (!l || (l.fort ?? null) !== null) continue;
      loadouts[age] = { ...l, fort: wallOf(t, age) };
    }
    return { ...plan, loadouts };
  });
  // Star-milestone forts the unlock grants are paid (X0): the milestone never pays them again.
  const paid: Record<string, boolean> = {};
  for (const id of owned) if (t.forts[id]?.warPathStars !== undefined && earnedOnWarPath(s, t, id)) paid[starFlag(id)] = true;
  let save: SaveDoc = { ...s, fortsOwned: owned, warPlans, flags: { ...s.flags, ...paid, [META_FLAGS.fortSlot]: true } };
  if (amber > 0) {
    save = { ...save, currencies: { ...save.currencies, amber: save.currencies.amber + amber } };
    steps.push({ kind: 'amber', amount: amber });
  }
  return { save, steps };
}

/** Opens the Fort slot when the save has earned it (Bronze L4 cleared or best trophies ≥ 400); else unchanged. */
export function checkFortUnlock(s: SaveDoc, t: Content): { save: SaveDoc; steps: RewardStep[] } {
  if (fortSlotUnlocked(s)) return { save: s, steps: [] };
  const cleared = (s.warPath.stars[FORT_UNLOCK_LEVEL] ?? 0) > 0;
  if (!cleared && s.trophies.best < FORT_SLOT_TROPHIES) return { save: s, steps: [] };
  return unlockFortSlot(s, t);
}

/**
 * A War Path first clear's fort (A16.14.6): the level's fort joins `fortsOwned` (or pays 60 Amber when the
 * Road fort set came first). Before the unlock it grants nothing (the unlock grants it later). The first
 * clear of Bronze L4 opens the slot.
 */
export function grantWarPathFort(s: SaveDoc, t: Content, region: AgeId, level: number): { save: SaveDoc; steps: RewardStep[] } {
  const opened = checkFortUnlock(s, t);
  let save = opened.save;
  const steps = [...opened.steps];
  const id = warPathFortOf(t, region, level);
  // The unlock itself grants every cleared level's fort, this one included.
  if (id && fortSlotUnlocked(save) && opened.steps.length === 0) save = grantOne(save, id, steps);
  return { save, steps };
}

/** X0: a side node's first clear grants its fort variant (as `grantWarPathFort`; before the unlock, nothing). */
export function grantWarPathSideFort(s: SaveDoc, t: Content, region: AgeId, side: 1 | 2): { save: SaveDoc; steps: RewardStep[] } {
  const steps: RewardStep[] = [];
  const id = warPathSideFortOf(t, region, side);
  if (!id || !fortSlotUnlocked(s)) return { save: s, steps };
  return { save: grantOne(s, id, steps), steps };
}

/**
 * X0: the region's star milestone (CONTENT_PLAN 6): every fort whose `warPathStars` the region's stars reach
 * joins `fortsOwned` (60 Amber when the Road came first), once. Before the Fort unlock nothing is granted;
 * the unlock grants it then.
 */
export function grantStarForts(s: SaveDoc, t: Content, region: AgeId): { save: SaveDoc; steps: RewardStep[] } {
  const steps: RewardStep[] = [];
  if (!fortSlotUnlocked(s)) return { save: s, steps };
  let save = s;
  for (const id of fortIds(t)) {
    const f = t.forts[id];
    if (!f || f.age !== region || f.warPathStars === undefined || save.flags[starFlag(id)] === true) continue;
    if (!earnedOnWarPath(save, t, id)) continue;
    save = grantOne(save, id, steps);
    save = { ...save, flags: { ...save.flags, [starFlag(id)]: true } };
  }
  return { save, steps };
}

/** A Trophy Road fort item (A16.14.6): the card, or 60 Amber when already owned (the War Path came first). */
export function grantRoadFort(s: SaveDoc, id: CardId): SaveDoc {
  return grantOne(s, id, []);
}

/**
 * Could a player with this save own fort `id` by either source right now (A16.14.6, the A2.9.8 rule)?
 * `warPathRegions`: regions whose forts are allowed anyway (a War Path level bot's own region).
 */
export function botMayUseFort(t: Content, s: SaveDoc | null, id: CardId, warPathRegions: readonly AgeId[] = []): boolean {
  const f = t.forts[id];
  if (!f || !fortSlotUnlocked(s)) return false;
  if (f.source === 'starter' || f.source === 'unlock') return true;
  if (warPathRegions.includes(f.age)) return true;
  const best = s?.trophies.best ?? 0;
  if (f.road !== undefined && f.road <= best + BOT_ROAD_LOOKAHEAD) return true;
  return !!s && earnedOnWarPath(s, t, id);
}

/** A bot's plan limited to the forts a player at this point could own; anything else becomes the age's wall. */
export function botForts(t: Content, s: SaveDoc | null, side: SideConfig, warPathRegions: readonly AgeId[] = []): SideConfig {
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of Object.keys(side.loadouts) as AgeId[]) {
    const l = side.loadouts[age];
    if (!l) continue;
    const id = l.fort ?? null;
    const ok = id !== null && t.forts[id]?.age === age && botMayUseFort(t, s, id, warPathRegions);
    loadouts[age] = { ...l, fort: id === null ? null : ok ? id : wallOf(t, age) };
  }
  return { ...side, loadouts };
}

/** Sets or clears every loadout's Fort slot, keeping everything else. */
function withFort(t: Content, side: SideConfig, how: 'clear' | 'fill'): SideConfig {
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of Object.keys(side.loadouts) as AgeId[]) {
    const l = side.loadouts[age];
    if (!l) continue;
    loadouts[age] = { ...l, fort: how === 'clear' ? null : (l.fort ?? wallOf(t, age)) };
  }
  return { ...side, loadouts };
}

/**
 * The fort match rule for a match config (A16.14.6): bots' forts are filtered to what the player could
 * own; then either both sides play the Fort slot (the Daily fills a missing one with the age's wall) or
 * neither does (`fort: null` for every loadout of both sides, the F1 state).
 */
export function applyFortMatchRule(cfg: MatchConfig, s: SaveDoc | null, mode: string, inBattle: boolean = FORT_SLOT_IN_BATTLE): MatchConfig {
  const t = cfg.content as unknown as Content;
  if (!t.forts || !t.order) return cfg;
  const live = fortSlotLive(s, mode, inBattle);
  const regions = mode === 'warPath' ? (cfg.content.formats[cfg.format]?.ages ?? []) : [];
  const one = (side: SideConfig): SideConfig => {
    if (!live) return withFort(t, side, 'clear');
    const filtered = side.isBot ? botForts(t, s, side, regions) : side;
    return mode === 'daily' ? withFort(t, filtered, 'fill') : filtered;
  };
  return { ...cfg, sides: [one(cfg.sides[0]), one(cfg.sides[1])] };
}
