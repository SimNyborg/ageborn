/**
 * The release gate on the meta tables (`release.ts`, docs/decisions.md): at compile time, every meta
 * table that names cards drops the unreleased ones, so no General plan, Trophy Road node or War Path
 * node can hand a player or a bot a card whose art has not shipped.
 *
 * - General plans: an unreleased troop or turret leaves its slot; the plan is refilled to five troops
 *   (and every turret slot) from the age's released starter cards first, then other released non-Legendary
 *   cards in table order. An unreleased power becomes the age's starter of its slot, an unreleased fort
 *   the age's wall. Signature cards drop unreleased ids.
 * - Trophy Road: power and fort rewards of unreleased cards are removed (the node keeps its other items).
 * - War Path: a side node whose power or fort is unreleased is removed with its level; a level reward
 *   card that is unreleased becomes no card.
 *
 * Pure; it edits the copy `compileContent` made of the meta tables and returns it.
 */
import type { FortDef, PowerDef, TurretDef, UnitDef } from '@/contracts/content';
import type { AgeId, CardId, Rarity } from '@/contracts/ids';
import type { Loadout } from '@/contracts/sim';
import type { MetaTables } from './types';

interface Records {
  units: Readonly<Record<CardId, UnitDef>>;
  turrets: Readonly<Record<CardId, TurretDef>>;
  powers: Readonly<Record<CardId, PowerDef>>;
  forts: Readonly<Record<CardId, FortDef>>;
}

const RARITY_RANK: Readonly<Record<Rarity, number>> = { common: 0, rare: 1, epic: 2, legendary: 3 };

/** A General keeps at least this many troops when unreleased ones leave its plan (the pre-X0 plan size). */
const MIN_TROOPS = 5;

/** The released cards a plan may refill with: starters first, then by rarity, then table order; no Legendaries. */
function fillers(defs: readonly (UnitDef | TurretDef)[], age: AgeId, released: (id: CardId) => boolean): CardId[] {
  return defs
    .map((d, i) => ({ d, i }))
    .filter(({ d }) => d.age === age && d.rarity !== 'legendary' && !(d.kind === 'unit' && d.hidden === true) && released(d.id))
    .sort((a, b) => (a.d.starter === true ? 0 : 1) - (b.d.starter === true ? 0 : 1) || RARITY_RANK[a.d.rarity] - RARITY_RANK[b.d.rarity] || a.i - b.i)
    .map(({ d }) => d.id);
}

function refill(slots: (CardId | null)[], pool: readonly CardId[], want: number): (CardId | null)[] {
  const out = [...slots];
  for (let i = 0; i < out.length && out.filter((x) => x !== null).length < want; i += 1) {
    if (out[i] !== null) continue;
    const next = pool.find((c) => !out.includes(c));
    if (next) out[i] = next;
  }
  return out;
}

function gateLoadout(l: Loadout, age: AgeId, r: Records, released: (id: CardId) => boolean): Loadout {
  const keep = (id: CardId | null): CardId | null => (id !== null && released(id) ? id : null);
  const units = l.units.map(keep);
  const turrets = l.turrets.map(keep);
  const touched = units.some((x, i) => x !== l.units[i]);
  const touchedT = turrets.some((x, i) => x !== l.turrets[i]);
  const starterPower = (slot: 'home' | 'field'): CardId | null =>
    Object.values(r.powers).find((p) => p.age === age && p.slot === slot && p.source === 'starter' && released(p.id))?.id ?? null;
  const power = (slot: 'home' | 'field'): CardId | null => {
    const id = l.powers[slot];
    return id === null || released(id) ? id : starterPower(slot);
  };
  const out: Loadout = {
    units: touched ? refill(units, fillers(Object.values(r.units), age, released), Math.min(MIN_TROOPS, units.length)) : [...l.units],
    turrets: touchedT ? refill(turrets, fillers(Object.values(r.turrets), age, released), turrets.length) : [...l.turrets],
    powers: { home: power('home'), field: power('field') },
  };
  if (l.fort !== undefined) {
    const wall = Object.values(r.forts).find((f) => f.age === age && f.fortKind === 'wall' && f.source === 'starter' && released(f.id))?.id ?? null;
    out.fort = l.fort === null || released(l.fort) ? l.fort : wall;
  }
  return out;
}

/** The meta tables with every unreleased card taken out (see the module note). */
export function gateMeta(meta: MetaTables, released: (id: CardId) => boolean, r: Records): MetaTables {
  for (const g of Object.values(meta.generals.list)) {
    g.signatureCards = g.signatureCards.filter(released);
    if (!g.warPlan) continue;
    for (const age of Object.keys(g.warPlan) as AgeId[]) {
      const l = g.warPlan[age];
      if (l) g.warPlan[age] = gateLoadout(l, age, r, released);
    }
  }
  for (const node of meta.trophyRoad.nodes) {
    node.rewards = node.rewards.filter((x) => (x.kind === 'power' || x.kind === 'fort' ? released(x.card) : true));
  }
  const wp = meta.warPath;
  for (const region of wp.regions) {
    if (!region.sides) continue;
    const keep = region.sides.filter((id) => {
      const level = wp.levels[id];
      const n = level?.side?.n;
      if (n === undefined) return true;
      const grants = [
        ...Object.values(r.powers).filter((p) => p.age === region.age && p.warPathSide === n).map((p) => p.id),
        ...Object.values(r.forts).filter((f) => f.age === region.age && f.warPathSide === n).map((f) => f.id),
      ];
      return grants.every(released);
    });
    for (const id of region.sides) if (!keep.includes(id)) delete wp.levels[id];
    if (keep.length > 0) region.sides = keep;
    else delete region.sides;
  }
  for (const level of Object.values(wp.levels)) {
    if (level.reward.card !== null && !released(level.reward.card)) level.reward.card = null;
  }
  return meta;
}
