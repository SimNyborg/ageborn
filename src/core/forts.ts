/**
 * Fort compilation (DESIGN A16.14.3-A16.14.4, A16.14.8): turns the raw fort tables into `FortDef`s,
 * their hidden twin `UnitDef`s (walls, towers, camps) and the hidden levy `UnitDef`s, and adds the
 * ×2 structure mod to the attacks that carry it. Shared by the content compiler and the sim's compile
 * shim (the sim may not import the content layer, B2), so both build identical cards. Pure integer code.
 *
 * Stats follow the age baselines (A5): H = the age's Heavy Common HP, R = its Ranged Common attack,
 * I = its Infantry Common. Walls 1.0 × H, camps 0.6 × H, towers 0.5 × H with R's attack × 1.5 (single
 * target, 0% windup, range clamped per pad by the sim), levies 0.4 × I's HP and damage with no abilities.
 * The ratios are content data (`economy.fort`).
 */
import type { AttackDef, CardId, FortDef, FortEconomyRules, FortKind, FortSource, Rarity, SoundId, StatusApply, TargetPriority, UnitDef, VisualId } from '@/contracts';
import { BP } from './fixed';

/** One raw fort card (`src/content/raw/<age>.ts` `forts`): what the tables state; HP and a tower's attack are derived. */
export interface FortSpec {
  id: CardId;
  age: UnitDef['age'];
  rarity: Exclude<Rarity, 'legendary'>;
  fortKind: FortKind;
  source: FortSource;
  road?: number;
  warPathLevel?: number;
  /** X0: granted by the region's side node s1 or s2. */
  warPathSide?: 1 | 2;
  /** X0: granted by the region's War Path star milestone. */
  warPathStars?: number;
  cost: number;
  pop: number;
  /** X0 fort variants (compile only): HP as bp of the age's Heavy Common instead of the kind's ratio. */
  hpBp?: number;
  /** Release gate (default true), copied to the FortDef (`FortDef.released`). */
  released?: boolean;
  /**
   * X0 tower variants (compile only): changes to the derived tower attack (the age's Ranged Common × 1.5):
   * damage and interval scaled in bp, and an optional splash (with an arc), chain, slow, priority or air bonus.
   */
  towerMods?: {
    damageBp?: number;
    intervalBp?: number;
    splashRadius?: number;
    arc?: boolean;
    groundOnly?: boolean;
    chain?: { count: number; hop: number };
    onHit?: StatusApply[];
    priority?: TargetPriority;
    airBp?: number;
  };
  /** X0 camp variants (compile only): the levy is built from this group's Common at these HP and damage bp. */
  levyFrom?: { group: 'ranged' | 'heavy'; hpBp: number; damageBp: number };
  /** A camp's levy: its card id (the hidden unit this module builds from the age's Infantry Common). */
  camp?: { levy: CardId; everyMs: number; firstMs: number; maxAlive: number };
  trap?: {
    charges: number;
    triggerLu: number;
    betweenMs: number;
    armMs: number;
    lifeMs: number;
    damage: number;
    radius: number;
    maxTargets: number;
    statuses: StatusApply[];
  };
  cover?: { behindLu: number; rangedTakenBp: number };
  regen?: { bpPerSec: number; delayMs: number };
  visualId: VisualId;
  sfx: { place: SoundId; complete: SoundId; die: SoundId };
  nameKey: string;
  descKey: string;
}

/** Roles whose attacks carry the ×2 structure mod (A16.14.2: Heavy, Legendary, siege and artillery; siege-only units excepted). */
const STRUCTURE_ROLES: ReadonlySet<UnitDef['role']> = new Set(['siege', 'siegeHeavy', 'artillery']);

/** Does this unit's attacks carry the ×2 structure mod? (Siege-only units use their vs-base damage instead.) */
export function carriesStructureMod(u: UnitDef): boolean {
  if (u.fort || u.hidden) return false;
  if (u.abilities.some((a) => a.kind === 'siegeOnly')) return false;
  return u.group === 'heavy' || u.group === 'legendary' || STRUCTURE_ROLES.has(u.role);
}

function withStructure(a: AttackDef, bp: number): AttackDef {
  const mods = a.mods ?? [];
  if (mods.some((m) => m.vs === 'structure')) return a;
  return { ...a, mods: [{ vs: 'structure', bp }, ...mods] };
}

/**
 * Adds `{ vs: 'structure', bp }` at the front of every attack (riders included) of every carrier unit
 * (A16.14.2). Returns new unit objects; the input is not mutated. No card table changes: content is data.
 */
export function addStructureMods(units: readonly UnitDef[], bp: number): UnitDef[] {
  return units.map((u) => {
    if (!carriesStructureMod(u)) return u;
    return {
      ...u,
      attacks: u.attacks.map((a) => withStructure(a, bp)),
      abilities: u.abilities.map((ab) => (ab.kind === 'riders' ? { ...ab, attack: withStructure(ab.attack, bp) } : ab)),
    };
  });
}

const scale = (v: number, bp: number): number => Math.trunc((v * bp) / BP);

/** The age's non-hidden Common of a group (the A5 baselines; the starter first, X0), or undefined. */
function commonOf(units: readonly UnitDef[], age: UnitDef['age'], group: UnitDef['group']): UnitDef | undefined {
  const ok = (u: UnitDef): boolean => u.age === age && u.group === group && u.rarity === 'common' && !u.hidden && !u.levy && !u.fort && !u.summon;
  return units.find((u) => ok(u) && u.starter === true) ?? units.find(ok);
}

/** X0 tower variants: the derived attack with the variant's changes applied. */
function towerVariant(a: AttackDef, m: NonNullable<FortSpec['towerMods']>): AttackDef {
  const out: AttackDef = { ...a };
  if (m.damageBp !== undefined) out.damage = Math.max(1, scale(a.damage, m.damageBp));
  if (m.intervalBp !== undefined) out.intervalMs = Math.max(50, Math.trunc((a.intervalMs * m.intervalBp) / BP / 50) * 50);
  if (m.splashRadius !== undefined) out.splashRadius = m.splashRadius;
  if (m.arc && out.projectile && 'speed' in out.projectile) out.projectile = { ...out.projectile, arc: true };
  if (m.groundOnly) out.hitsAir = false;
  if (m.chain) out.chain = { ...m.chain };
  if (m.onHit) out.onHit = m.onHit.map((x) => ({ ...x }));
  if (m.priority) out.priority = m.priority;
  if (m.airBp !== undefined) out.mods = [{ vs: 'air', bp: m.airBp }];
  return out;
}

/** X0 camp variants: a levy built from another group's Common (HP and damage at their own bp). */
function levyFromUnit(id: CardId, src: UnitDef, inf: UnitDef, hpBp: number, damageBp: number, f: FortEconomyRules): UnitDef {
  const base = levyUnit(id, src, { ...f, levyHpBp: hpBp, levyDamageBp: damageBp });
  // A levy is an Infantry-group summon whatever it was cloned from (the camp rule reads the group), and
  // its AI value follows the Infantry Common's cost.
  return { ...base, group: 'infantry', role: 'infantry', pop: inf.pop, trainMs: inf.trainMs, aiValue: scale(inf.cost, f.levyAiValueBp) };
}

/** A tower's attack from the age's Ranged Common (A16.14.3): damage × `towerDamageBp`, single target, 0% windup, priority front. */
function towerAttack(r: AttackDef, bp: number): AttackDef {
  const a: AttackDef = {
    damage: Math.max(1, scale(r.damage, bp)),
    intervalMs: r.intervalMs,
    windupPct: 0,
    range: r.range,
    hitsGround: r.hitsGround,
    hitsAir: r.hitsAir,
    dmgType: r.dmgType,
    sfx: r.sfx,
    priority: 'front',
  };
  if (r.projectile) a.projectile = r.projectile;
  return a;
}

/** A levy from the age's Infantry Common (A16.14.3): HP and damage × 40% (truncated, min 1), no abilities, cost 0. */
function levyUnit(id: CardId, inf: UnitDef, f: FortEconomyRules): UnitDef {
  // A levy is never a starter or a squad, whatever the card it was cloned from (X0).
  const { starter: _starter, squad: _squad, ...base } = inf;
  return {
    ...base,
    id,
    hp: Math.max(1, scale(inf.hp, f.levyHpBp)),
    cost: 0,
    attacks: inf.attacks.map((a) => {
      const out: AttackDef = { ...a, damage: Math.max(1, scale(a.damage, f.levyDamageBp)) };
      if (a.vsBaseDamage !== undefined) out.vsBaseDamage = Math.max(1, scale(a.vsBaseDamage, f.levyDamageBp));
      return out;
    }),
    abilities: [],
    visualId: `unit.${id}`,
    nameKey: `card.${id}.name`,
    descKey: `card.${id}.desc`,
    strongVs: [],
    weakVs: [],
    hidden: true,
    levy: true,
    aiValue: scale(inf.cost, f.levyAiValueBp),
  };
}

/** The result of {@link compileForts}. */
export interface CompiledForts {
  forts: FortDef[];
  /** Hidden twin units of walls, towers and camps (same id as the fort). */
  twins: UnitDef[];
  levies: UnitDef[];
}

/**
 * Compiles the raw fort tables against the age baselines. `units` are the compiled unit cards (every
 * age); `f` the fort economy. Throws when an age lacks the baseline a fort needs.
 */
export function compileForts(specs: readonly FortSpec[], units: readonly UnitDef[], f: FortEconomyRules): CompiledForts {
  const forts: FortDef[] = [];
  const twins: UnitDef[] = [];
  const levies: UnitDef[] = [];
  for (const s of specs) {
    const heavy = commonOf(units, s.age, 'heavy');
    const ranged = commonOf(units, s.age, 'ranged');
    const inf = commonOf(units, s.age, 'infantry');
    if (!heavy || !ranged || !inf) throw new Error(`fort ${s.id}: age ${s.age} lacks an Infantry, Ranged or Heavy Common`);
    const kind = s.fortKind;
    const hpBp = s.hpBp ?? (kind === 'wall' ? f.wallHpBp : kind === 'tower' ? f.towerHpBp : kind === 'camp' ? f.campHpBp : 0);
    const hp = kind === 'trap' ? 0 : Math.max(1, scale(heavy.hp, hpBp));
    const size: FortDef['size'] = kind === 'tower' ? 'medium' : kind === 'trap' ? null : 'large';
    const r0 = ranged.attacks[0];
    const def: FortDef = {
      id: s.id,
      kind: 'fort',
      age: s.age,
      rarity: s.rarity,
      fortKind: kind,
      source: s.source,
      cost: s.cost,
      pop: s.pop,
      hp,
      size,
      pads: kind === 'camp' ? 'any' : 'home',
      visualId: s.visualId,
      sfx: { ...s.sfx },
      nameKey: s.nameKey,
      descKey: s.descKey,
      strongVs: [],
      weakVs: [],
    };
    if (s.road !== undefined) def.road = s.road;
    if (s.warPathLevel !== undefined) def.warPathLevel = s.warPathLevel;
    if (s.warPathSide !== undefined) def.warPathSide = s.warPathSide;
    if (s.warPathStars !== undefined) def.warPathStars = s.warPathStars;
    if (s.released !== undefined) def.released = s.released;
    if (kind === 'tower' && r0) def.attack = s.towerMods ? towerVariant(towerAttack(r0, f.towerDamageBp), s.towerMods) : towerAttack(r0, f.towerDamageBp);
    if (s.camp) def.camp = { spawn: s.camp.levy, everyMs: s.camp.everyMs, firstMs: s.camp.firstMs, maxAlive: s.camp.maxAlive };
    if (s.trap) def.trap = { ...s.trap, statuses: s.trap.statuses.map((x) => ({ ...x })) };
    if (s.cover) def.cover = { ...s.cover };
    if (s.regen) def.regen = { ...s.regen };
    // Per-age class hints (A16.14.1 kind rows): walls hold Infantry and Ranged, towers shoot Ranged, traps
    // punish plain Infantry; the age's Heavies, Legendaries, siege and artillery break every fort.
    // Hints name only cards players can meet (the release gate, `UnitDef.released`).
    const age = units.filter((u) => u.age === s.age && !u.hidden && !u.fort && !u.levy && u.released !== false);
    const commons = (g: UnitDef['group']): CardId[] => age.filter((u) => u.group === g && u.rarity === 'common').map((u) => u.id);
    def.strongVs = kind === 'wall' ? [...commons('infantry'), ...commons('ranged')] : kind === 'tower' ? commons('ranged') : kind === 'trap' ? commons('infantry') : [];
    def.weakVs = age.filter((u) => u.group === 'heavy' || u.group === 'legendary' || u.role === 'siege' || u.role === 'artillery').map((u) => u.id);
    forts.push(def);
    if (kind !== 'trap' && size !== null) {
      twins.push({
        id: s.id,
        kind: 'unit',
        age: s.age,
        rarity: s.rarity,
        role: 'fort',
        group: 'fort',
        cost: s.cost,
        trainMs: 0,
        pop: s.pop,
        hp,
        speed: 0,
        size,
        tags: ['structure', 'ground'],
        attacks: def.attack ? [def.attack] : [],
        abilities: [],
        visualId: s.visualId,
        sfx: { spawn: s.sfx.place, die: s.sfx.die },
        nameKey: s.nameKey,
        descKey: s.descKey,
        strongVs: [],
        weakVs: [],
        hidden: true,
        fort: { kind },
      });
    }
    if (s.camp && !levies.some((l) => l.id === s.camp?.levy)) {
      const from = s.levyFrom ? commonOf(units, s.age, s.levyFrom.group) : undefined;
      levies.push(from && s.levyFrom ? levyFromUnit(s.camp.levy, from, inf, s.levyFrom.hpBp, s.levyFrom.damageBp, f) : levyUnit(s.camp.levy, inf, f));
    }
  }
  return { forts, twins, levies };
}
