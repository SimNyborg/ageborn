/**
 * Card view models: ownership, levels, upgrade costs (A6.6), tile data, and the stats sheet of the
 * card detail screen (A9 #11) with the +5% per level scaling (A5.1, A6.6; same formula as the sim:
 * multiplier = 10,000 + levelStepBp × (level − 1) bp).
 */
import type { Content } from '@/content/types';
import type { AgeId, CardId, DamageMod, Foil, PowerDef, Rarity, SaveDoc, SkinDef, TurretDef, UnitDef } from '@/contracts';
import { counterClasses as classCounters, isLegendaryUnit, unitClass, type CardClass, type UnitClass } from '@/core/cardClass';
import type { CardTileData } from '../../components/CardTile';
import { roleGlyph, type GlyphKind } from '../../components/icons';
import type { Translate } from '../../components/kit';

export type CardKind = 'unit' | 'turret' | 'power';

export type AnyCardDef = UnitDef | TurretDef | PowerDef;

export function cardDef(content: Content, id: CardId): AnyCardDef | null {
  return content.units[id] ?? content.turrets[id] ?? content.powers[id] ?? null;
}

export function cardRarity(def: AnyCardDef): Rarity | null {
  return def.kind === 'power' ? null : def.rarity;
}

export function cardGlyph(def: AnyCardDef): GlyphKind {
  if (def.kind === 'unit') return roleGlyph(def.role, def.group);
  return def.kind;
}

/** The class badge of a card (owner feedback 2026-09-28; A2.6 roles and tags). */
export function cardClassOf(def: AnyCardDef): CardClass {
  return def.kind === 'unit' ? unitClass(def) : def.kind;
}

/** The classes a unit beats and loses to, from the compiled counter lists (B4). */
export function counterClasses(content: Content, def: AnyCardDef): { strong: UnitClass[]; weak: UnitClass[] } {
  if (def.kind !== 'unit') return { strong: [], weak: [] };
  return classCounters(def.strongVs, def.weakVs, content.units);
}

export function isOwned(save: SaveDoc, id: CardId, content: Content): boolean {
  if (content.powers[id]) return save.powersOwned.includes(id);
  const e = save.collection[id];
  return !!e && e.level >= 1;
}

export function levelOf(save: SaveDoc, id: CardId): number {
  return Math.max(1, save.collection[id]?.level ?? 1);
}

/** Level multiplier in bp (A6.6: +5% per level, linear). */
export function levelMultBp(content: Content, level: number): number {
  return 10000 + content.economy.levelStepBp * (Math.max(1, level) - 1);
}

/** Scales a level-1 value to `level` (A5.1: HP, damage, heals and shields). */
export function atLevel(content: Content, base: number, level: number): number {
  return Math.trunc((base * levelMultBp(content, level)) / 10000);
}

export interface UpgradeCost {
  copies: number;
  amber: number;
}

/** Copies and Amber to go from `level` to `level + 1`, or null at the level cap (A6.6). */
export function upgradeCost(content: Content, rarity: Rarity, level: number): UpgradeCost | null {
  if (level >= content.economy.maxLevel) return null;
  const copies = content.rarities.cards[rarity].upgradeCopies[level - 1];
  const amber = content.rarities.upgradeAmber[level - 1];
  if (copies === undefined || amber === undefined) return null;
  return { copies, amber };
}

export interface UpgradeState {
  cost: UpgradeCost | null;
  copies: number;
  /** Enough copies (the "UPGRADE READY" badge, A10 step 7). */
  copiesReady: boolean;
  /** Enough copies and Amber: the Upgrade button works. */
  affordable: boolean;
  maxed: boolean;
}

export function upgradeState(save: SaveDoc, content: Content, id: CardId): UpgradeState | null {
  const def = cardDef(content, id);
  const entry = save.collection[id];
  if (!def || def.kind === 'power' || !entry) return null;
  const cost = upgradeCost(content, def.rarity, entry.level);
  const copiesReady = cost !== null && entry.copies >= cost.copies;
  return {
    cost,
    copies: entry.copies,
    copiesReady,
    affordable: copiesReady && cost !== null && save.currencies.amber >= cost.amber,
    maxed: cost === null,
  };
}

export function equippedSkin(save: SaveDoc, id: CardId): string | null {
  return save.skins.equipped[id] ?? null;
}

/** Everything a card tile shows. */
export function cardTile(save: SaveDoc, content: Content, id: CardId, t: Translate): CardTileData | null {
  const def = cardDef(content, id);
  if (!def) return null;
  const owned = isOwned(save, id, content);
  const entry = save.collection[id];
  const level = owned ? levelOf(save, id) : 1;
  const rarity = cardRarity(def);
  const cost = def.kind !== 'power' && rarity ? upgradeCost(content, rarity, level) : null;
  const copies = entry?.copies ?? 0;
  return {
    id,
    kind: def.kind,
    name: t(def.nameKey),
    age: def.age,
    rarity,
    glyph: cardGlyph(def),
    owned,
    level,
    copies,
    needed: def.kind === 'power' ? null : cost ? cost.copies : null,
    upgradeReady: owned && cost !== null && copies >= cost.copies,
    foil: (entry?.foil ?? 'none') as Foil,
    isNew: entry?.isNew ?? false,
    skin: equippedSkin(save, id),
    cost: def.kind === 'power' ? null : def.cost,
    cls: cardClassOf(def),
    legendary: def.kind === 'unit' && isLegendaryUnit(def),
    ...counterClasses(content, def),
  };
}

/** Collectable cards of one age in display order: units, then turrets, then powers. */
export function cardsOfAge(content: Content, age: AgeId): { units: CardId[]; turrets: CardId[]; powers: CardId[] } {
  return {
    units: content.order.units.filter((id) => content.units[id]?.age === age),
    turrets: content.order.turrets.filter((id) => content.turrets[id]?.age === age),
    powers: content.order.powers.filter((id) => content.powers[id]?.age === age),
  };
}

/** Skins that target a card (A5.8). */
export function skinsFor(content: Content, target: string): SkinDef[] {
  return content.order.skins.map((id) => content.skins[id]!).filter((s) => s.target === target);
}

// ---------------------------------------------------------------------------------------------
// Stats sheet (A9 #11)
// ---------------------------------------------------------------------------------------------

export type StatId = 'hp' | 'damage' | 'baseDamage' | 'interval' | 'dps' | 'range' | 'speed' | 'pop' | 'train' | 'cost' | 'splash';

export interface StatRow {
  id: StatId;
  /** Display value at the current level. */
  value: number | string;
  /** Value at the next level when it changes (the next-level preview), else null. */
  next: number | null;
  /** Unit for the i18n formatter: 'lu', 'ms', 'lus' (lu/s), or null. */
  unit: 'lu' | 'ms' | 'lus' | null;
}

function dps(damage: number, intervalMs: number, volley: number): number {
  return intervalMs > 0 ? Math.round((damage * volley * 1000) / intervalMs) : 0;
}

export function unitStats(content: Content, u: UnitDef, level: number): StatRow[] {
  const nextLevel = level < content.economy.maxLevel ? level + 1 : null;
  const at = (v: number, l: number) => atLevel(content, v, l);
  const a = u.attacks[0];
  const rows: StatRow[] = [{ id: 'hp', value: at(u.hp, level), next: nextLevel ? at(u.hp, nextLevel) : null, unit: null }];
  if (a) {
    const volley = a.volley ?? 1;
    rows.push({ id: 'damage', value: at(a.damage, level), next: nextLevel ? at(a.damage, nextLevel) : null, unit: null });
    if (a.vsBaseDamage !== undefined) {
      rows.push({ id: 'baseDamage', value: at(a.vsBaseDamage, level), next: nextLevel ? at(a.vsBaseDamage, nextLevel) : null, unit: null });
    }
    rows.push({ id: 'interval', value: a.intervalMs, next: null, unit: 'ms' });
    rows.push({
      id: 'dps',
      value: dps(at(a.damage, level), a.intervalMs, volley),
      next: nextLevel ? dps(at(a.damage, nextLevel), a.intervalMs, volley) : null,
      unit: null,
    });
    rows.push({ id: 'range', value: a.range, next: null, unit: 'lu' });
    if (a.splashRadius) rows.push({ id: 'splash', value: a.splashRadius, next: null, unit: 'lu' });
  }
  rows.push({ id: 'speed', value: u.speed, next: null, unit: 'lus' });
  rows.push({ id: 'pop', value: u.pop, next: null, unit: null });
  rows.push({ id: 'train', value: u.trainMs, next: null, unit: 'ms' });
  rows.push({ id: 'cost', value: u.cost, next: null, unit: null });
  return rows;
}

export function turretStats(content: Content, d: TurretDef, level: number): StatRow[] {
  const nextLevel = level < content.economy.maxLevel ? level + 1 : null;
  const at = (v: number, l: number) => atLevel(content, v, l);
  const a = d.attack;
  const volley = a.volley ?? 1;
  const rows: StatRow[] = [
    { id: 'damage', value: at(a.damage, level), next: nextLevel ? at(a.damage, nextLevel) : null, unit: null },
    { id: 'interval', value: a.intervalMs, next: null, unit: 'ms' },
    {
      id: 'dps',
      value: dps(at(a.damage, level), a.intervalMs, volley),
      next: nextLevel ? dps(at(a.damage, nextLevel), a.intervalMs, volley) : null,
      unit: null,
    },
    { id: 'range', value: a.range, next: null, unit: 'lu' },
  ];
  if (a.splashRadius) rows.push({ id: 'splash', value: a.splashRadius, next: null, unit: 'lu' });
  rows.push({ id: 'cost', value: d.cost, next: null, unit: null });
  return rows;
}

/** Which targets an attack can hit. */
export function hitsOf(def: AnyCardDef): { ground: boolean; air: boolean } | null {
  if (def.kind === 'unit') {
    const a = def.attacks[0];
    return a ? { ground: a.hitsGround, air: a.hitsAir } : null;
  }
  if (def.kind === 'turret') return { ground: def.attack.hitsGround, air: def.attack.hitsAir };
  return null;
}

export function modsOf(def: AnyCardDef): DamageMod[] {
  if (def.kind === 'unit') return def.attacks[0]?.mods ?? [];
  if (def.kind === 'turret') return def.attack.mods ?? [];
  return [];
}

/** Collection completion over collectable units and turrets (A6.1 "collection %"). */
export function collectionProgress(save: SaveDoc, content: Content): { owned: number; total: number } {
  const ids = [...content.order.units, ...content.order.turrets];
  const owned = ids.filter((id) => isOwned(save, id, content)).length;
  return { owned, total: ids.length };
}
