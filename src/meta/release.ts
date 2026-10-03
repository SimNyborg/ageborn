/**
 * The release gate on a loaded save (docs/decisions.md, "Release gate for unfinished content"). The
 * published game never handed out a card with `released: false`, but a save from a dev build, an import
 * or a later rollback could hold one. Loading such a save is safe: the card leaves the collection, the
 * owned powers, forts and skins, the equipped skins and every War Plan slot (a troop or turret slot
 * is refilled with the highest-level owned card of that age not already there, or left empty; a power
 * becomes the age's starter of its slot, a fort the age's wall). Its copies are dropped, which costs
 * nothing the published game ever gave. Pure; the same save object is returned when nothing needs to
 * change, so callers can compare by reference.
 */
import type { AgeId, CardId, Loadout, SaveDoc } from '@/contracts';
import { isReleased, type Content } from '@/content';
import { wallOf } from './forts';
import { ageCards, starterPower } from './tables';

function starterOr(t: Content, age: AgeId, slot: 'home' | 'field'): CardId | null {
  try {
    return starterPower(t, age, slot);
  } catch {
    return null;
  }
}

/** Emptied slots get the highest-level owned card of the pool not already in the list (ties: content order). */
function refill(s: SaveDoc, before: readonly (CardId | null)[], after: (CardId | null)[], pool: readonly CardId[]): (CardId | null)[] {
  const ranked = pool
    .filter((id) => (s.collection[id]?.level ?? 0) >= 1)
    .map((id, i) => ({ id, i, level: s.collection[id]?.level ?? 0 }))
    .sort((a, b) => b.level - a.level || a.i - b.i)
    .map((x) => x.id);
  const out = [...after];
  for (let i = 0; i < out.length; i += 1) {
    if (out[i] !== null || before[i] === null) continue;
    out[i] = ranked.find((id) => !out.includes(id)) ?? null;
  }
  return out;
}

function gateLoadout(s: SaveDoc, t: Content, age: AgeId, l: Loadout): Loadout {
  const keep = (id: CardId | null): CardId | null => (id !== null && isReleased(t, id) ? id : null);
  const cards = ageCards(t, age);
  const power = (slot: 'home' | 'field'): CardId | null => {
    const id = l.powers[slot];
    return id === null || isReleased(t, id) ? id : starterOr(t, age, slot);
  };
  const out: Loadout = {
    ...l,
    units: refill(s, l.units, l.units.map(keep), cards.units),
    turrets: refill(s, l.turrets, l.turrets.map(keep), cards.turrets),
    powers: { home: power('home'), field: power('field') },
  };
  if (l.fort !== undefined && l.fort !== null && !isReleased(t, l.fort)) out.fort = wallOf(t, age);
  return out;
}

function loadoutClean(t: Content, l: Loadout): boolean {
  const ids = [...l.units, ...l.turrets, l.powers.home, l.powers.field, l.fort ?? null];
  return ids.every((id) => id === null || isReleased(t, id));
}

/** The save without any unreleased card (see the module note); `s` itself when it holds none. */
export function withoutUnreleased(s: SaveDoc, t: Content): SaveDoc {
  const gone = (id: string): boolean => !isReleased(t, id);
  const collectionIds = Object.keys(s.collection).filter(gone);
  const powers = s.powersOwned.filter(gone);
  const forts = (s.fortsOwned ?? []).filter(gone);
  const skins = s.skins.owned.filter(gone);
  const equipped = Object.entries(s.skins.equipped).filter(([target, skin]) => gone(target) || gone(skin));
  const plans = s.warPlans.some((p) => Object.values(p.loadouts).some((l) => l !== undefined && !loadoutClean(t, l)));
  if (collectionIds.length === 0 && powers.length === 0 && forts.length === 0 && skins.length === 0 && equipped.length === 0 && !plans) return s;
  const collection = { ...s.collection };
  for (const id of collectionIds) delete collection[id];
  const cleaned: SaveDoc = { ...s, collection };
  return {
    ...cleaned,
    powersOwned: s.powersOwned.filter((id) => !gone(id)),
    fortsOwned: (s.fortsOwned ?? []).filter((id) => !gone(id)),
    skins: {
      owned: s.skins.owned.filter((id) => !gone(id)),
      equipped: Object.fromEntries(Object.entries(s.skins.equipped).filter(([target, skin]) => !gone(target) && !gone(skin))),
    },
    warPlans: s.warPlans.map((p) => {
      const loadouts = { ...p.loadouts };
      for (const age of Object.keys(loadouts) as AgeId[]) {
        const l = loadouts[age];
        if (l && !loadoutClean(t, l)) loadouts[age] = gateLoadout(cleaned, t, age, l);
      }
      return { ...p, loadouts };
    }),
  };
}
