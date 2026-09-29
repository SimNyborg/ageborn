/**
 * Age Power ownership, slots and the match rule (DESIGN A2.9.1, A2.9.8, A2.9.9 fairness).
 *
 * - The Field slot unlocks with `flags['power.field']` (War Path Stone L5 first clear or 150 trophies;
 *   the v7 migration sets it for every save that has played).
 * - The match rule: both sides always play the same slot set. The sim knows no unlock, so a locked
 *   Field slot is sent empty (`field: null`) for the player and for every bot. The Daily Challenge
 *   always plays both slots (a player whose Field slot is locked gets each age's Field starter for
 *   that match only). Until the HUD dock ships (P2, `FIELD_SLOT_IN_BATTLE`), every battle is Home only.
 * - Bots only use powers a player at that point could own by either source (A2.9.8): starters; Trophy
 *   Road powers (the alternates and the War Path fallback items) whose node is ≤ the player's best
 *   trophies + 100; War Path powers whose granting level the player has first-cleared. War Path level
 *   bots may use their own region's War Path powers. Anything else becomes the age's starter of that slot.
 */
import type { AgeId, CardId, Loadout, LoadoutPowers, MatchConfig, PowerSlot, SaveDoc, SideConfig } from '@/contracts';
import type { Content } from '@/content';
import { FIELD_SLOT_IN_BATTLE, META_FLAGS } from './rules';
import { starterPower } from './tables';

/** A bot may use a Road power whose node is at most this far above the player's best trophies (A2.9.8). */
export const BOT_ROAD_LOOKAHEAD = 100;

/** The Field power slot is unlocked for this save (A2.9.1). */
export function fieldSlotUnlocked(s: SaveDoc | null): boolean {
  return !!s && s.flags[META_FLAGS.powerField] === true;
}

/** Whether battles of this mode play the Field slot for this save (the match rule, A2.9.1). */
export function fieldSlotLive(s: SaveDoc | null, mode: string, inBattle: boolean = FIELD_SLOT_IN_BATTLE): boolean {
  if (!inBattle) return false;
  return mode === 'daily' || fieldSlotUnlocked(s);
}

/** The War Path level id of a region's level (`wp.stone.l05`). */
function levelId(age: AgeId, level: number): string {
  return `wp.${age}.l${level < 10 ? `0${level}` : `${level}`}`;
}

/**
 * Could a player with this save own `id` by either source right now (A2.9.8)? Used for bot plans.
 * `warPathRegions`: regions whose War Path powers are allowed anyway (a War Path level bot's own region).
 */
export function botMayUsePower(t: Content, s: SaveDoc | null, id: CardId, warPathRegions: readonly AgeId[] = []): boolean {
  const p = t.powers[id];
  if (!p) return false;
  if (p.source === 'starter') return true;
  const best = s?.trophies.best ?? 0;
  if (p.road !== undefined && p.road <= best + BOT_ROAD_LOOKAHEAD) return true;
  if (p.source === 'warPath') {
    if (warPathRegions.includes(p.age)) return true;
    const lvl = p.warPathLevel;
    if (s && lvl !== undefined && (s.warPath.stars[levelId(p.age, lvl)] ?? 0) > 0) return true;
  }
  return false;
}

/** A loadout's powers, each replaced by the age's starter of its slot when `ok` refuses it (A2.9.9). */
function filteredPowers(t: Content, age: AgeId, powers: LoadoutPowers, ok: (id: CardId) => boolean): LoadoutPowers {
  const one = (slot: PowerSlot): CardId | null => {
    const id = powers[slot];
    if (id === null) return null;
    const def = t.powers[id];
    return def && def.age === age && def.slot === slot && ok(id) ? id : starterPower(t, age, slot);
  };
  return { home: one('home'), field: one('field') };
}

/** Sets or clears each loadout's Field slot (the match rule), keeping everything else. */
function withField(t: Content, side: SideConfig, field: 'clear' | 'fill'): SideConfig {
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of Object.keys(side.loadouts) as AgeId[]) {
    const l = side.loadouts[age];
    if (!l) continue;
    const f = field === 'clear' ? null : (l.powers.field ?? starterPowerSafe(t, age, 'field'));
    loadouts[age] = { ...l, powers: { home: l.powers.home, field: f } };
  }
  return { ...side, loadouts };
}

function starterPowerSafe(t: Content, age: AgeId, slot: PowerSlot): CardId | null {
  try {
    return starterPower(t, age, slot);
  } catch {
    return null;
  }
}

/** A bot's plan limited to the powers a player at this point could own (A2.9.8). */
export function botPowers(t: Content, s: SaveDoc | null, side: SideConfig, warPathRegions: readonly AgeId[] = []): SideConfig {
  const loadouts: Partial<Record<AgeId, Loadout>> = {};
  for (const age of Object.keys(side.loadouts) as AgeId[]) {
    const l = side.loadouts[age];
    if (!l) continue;
    loadouts[age] = { ...l, powers: filteredPowers(t, age, l.powers, (id) => botMayUsePower(t, s, id, warPathRegions)) };
  }
  return { ...side, loadouts };
}

/**
 * The power match rule for a match config (A2.9.1, A2.9.8): bots' powers are filtered to what the
 * player could own; then either both sides play the Field slot (Daily: filled with starters where the
 * player has none) or neither does (`field: null` for every loadout of both sides). `mode` is the
 * match mode (`daily`, `warPath`, ...); War Path level bots may use their window's War Path powers.
 */
export function applyPowerMatchRule(
  cfg: MatchConfig,
  s: SaveDoc | null,
  mode: string,
  inBattle: boolean = FIELD_SLOT_IN_BATTLE,
): MatchConfig {
  const t = cfg.content as unknown as Content;
  if (!t.powers || !t.order) return cfg;
  const regions = mode === 'warPath' ? (cfg.content.formats[cfg.format]?.ages ?? []) : [];
  const live = fieldSlotLive(s, mode, inBattle);
  const one = (side: SideConfig): SideConfig => {
    const filtered = side.isBot ? botPowers(t, s, side, regions) : side;
    if (!live) return withField(t, filtered, 'clear');
    return mode === 'daily' ? withField(t, filtered, 'fill') : filtered;
  };
  return { ...cfg, sides: [one(cfg.sides[0]), one(cfg.sides[1])] };
}
