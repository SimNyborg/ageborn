/**
 * Table-driven checks of the raw content against DESIGN Part A (C2/WP0 task 8).
 *
 * Every expected value below is typed in from DESIGN (A2.2-A2.11, A5.1-A5.7, A14.1, A14.2), not read
 * from the raw files, so a typo on either side fails. The same checks run against the live tables in
 * `src/content/raw` and the frozen copy in `tests/fixtures/content`. When a balance change touches a
 * number, update DESIGN and the row here; never edit the fixture (the golden replays depend on it).
 */
import { describe, expect, it } from 'vitest';
import type { AttackDef, PowerDef, TurretDef, UnitDef } from '@/contracts/content';
import type { AgeId, DmgType, Rarity, Role, RoleGroup, Tag } from '@/contracts/ids';
import { raw as fixture } from '../../../tests/fixtures/content';
import { raw, type RawContent } from './index';

const AGES: AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];

/** A5.1 / A2.7 per role group: price (flat across ages), train time, pop. */
const GROUP: Record<RoleGroup, { cost: number; trainMs: number; pop: number }> = {
  infantry: { cost: 50, trainMs: 1500, pop: 2 },
  ranged: { cost: 75, trainMs: 2000, pop: 3 },
  heavy: { cost: 150, trainMs: 4000, pop: 6 },
  antiArmor: { cost: 100, trainMs: 2500, pop: 4 },
  support: { cost: 110, trainMs: 3000, pop: 4 },
  epic: { cost: 200, trainMs: 4000, pop: 8 },
  legendary: { cost: 350, trainMs: 7000, pop: 14 },
};

/** A5.1 default projectile speeds (lu/s) by projectile visual. Arc projectiles fly at 450. */
const DEFAULT_SPEED: Record<string, number> = {
  'proj.rock': 500,
  'proj.arrow': 650,
  'proj.musket': 1500,
  'proj.bullet': 1500,
  'proj.shell': 1200,
  'proj.rocket': 900,
  'proj.lob': 450,
  'proj.plasma': 1800,
};

/** One A5 unit row (first attack) plus its A14.2 mapping. `fx` is the projectile or effect id, or 'melee'. */
interface UnitRow {
  id: string; age: AgeId; rarity: Rarity; role: Role; cost: number; hp: number;
  damage: number; intervalMs: number; range: number; speed: number;
  size: UnitDef['size']; hits: 'G' | 'G+A' | 'none'; tags: Tag[];
  fx: string; sfx: string; dmgType: DmgType;
  extra?: (u: UnitDef) => void;
}

const UNIT_ROWS: UnitRow[] = [
  // A5.2 Stone
  { id: 'bonker', age: 'stone', rarity: 'common', role: 'infantry', cost: 50, hp: 160, damage: 20, intervalMs: 1000,
    range: 16, speed: 70, size: 'small', hits: 'G', tags: ['light', 'bio', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'blunt',
    extra: (u) => expect(u.attacks[0]?.mods).toEqual([{ vs: 'armored', bp: 7000 }]) },
  { id: 'pebbler', age: 'stone', rarity: 'common', role: 'ranged', cost: 75, hp: 95, damage: 18, intervalMs: 1400,
    range: 200, speed: 65, size: 'small', hits: 'G+A', tags: ['light', 'bio', 'ranged'], fx: 'proj.rock', sfx: 'shot_sling', dmgType: 'blunt',
    extra: (u) => expect(u.attacks[0]?.chain).toEqual({ count: 2, hop: 40 }) },
  { id: 'tuskback', age: 'stone', rarity: 'common', role: 'heavy', cost: 150, hp: 560, damage: 42, intervalMs: 1500,
    range: 16, speed: 55, size: 'large', hits: 'G', tags: ['armored', 'bio', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'blunt',
    extra: (u) => expect(u.abilities).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 }) },
  { id: 'spear_hunter', age: 'stone', rarity: 'rare', role: 'antiArmor', cost: 100, hp: 200, damage: 26, intervalMs: 1200,
    range: 60, speed: 70, size: 'medium', hits: 'G', tags: ['light', 'bio', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'pierce',
    extra: (u) => {
      expect(u.attacks[0]?.mods).toEqual([{ vs: 'armored', bp: 20000 }, { vs: 'mech', bp: 20000 }, { vs: 'light', bp: 7500 }]);
      expect(u.attacks[0]?.priority).toBe('armored');
    } },
  { id: 'mammoth_matriarch', age: 'stone', rarity: 'legendary', role: 'siegeHeavy', cost: 350, hp: 1700, damage: 55, intervalMs: 2000,
    range: 20, speed: 40, size: 'huge', hits: 'G', tags: ['armored', 'bio', 'melee', 'legendary'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'blast',
    extra: (u) => {
      expect(u.attacks[0]?.splashRadius).toBe(40);
      const riders = u.abilities.find((a) => a.kind === 'riders');
      expect(riders).toMatchObject({ count: 2, onDeathSpawn: 'pebbler',
        attack: { damage: 12, intervalMs: 1400, range: 200, hitsGround: true, hitsAir: true, dmgType: 'blunt', sfx: 'shot_sling',
          projectile: { visualId: 'proj.rock', speed: 500 } } });
    } },
  // A5.3 Medieval
  { id: 'footman', age: 'medieval', rarity: 'common', role: 'infantry', cost: 50, hp: 216, damage: 27, intervalMs: 1000,
    range: 16, speed: 70, size: 'small', hits: 'G', tags: ['light', 'bio', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'slash',
    extra: (u) => expect(u.abilities).toContainEqual({ kind: 'resist', minSourceRange: 100, bp: 2500 }) },
  { id: 'pikeman', age: 'medieval', rarity: 'rare', role: 'antiArmor', cost: 100, hp: 270, damage: 35, intervalMs: 1200,
    range: 70, speed: 70, size: 'medium', hits: 'G', tags: ['light', 'bio', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'pierce',
    extra: (u) => expect(u.abilities).toContainEqual({ kind: 'brace' }) },
  { id: 'friar', age: 'medieval', rarity: 'rare', role: 'support', cost: 110, hp: 175, damage: 11, intervalMs: 1200,
    range: 150, speed: 65, size: 'small', hits: 'G+A', tags: ['light', 'bio', 'support', 'ranged'], fx: 'proj.rock', sfx: 'shot_sling', dmgType: 'blunt',
    extra: (u) => {
      expect(u.abilities).toContainEqual({ kind: 'heal', hpPerSec: 40, radius: 160, targets: 2, pulseMs: 500 });
      expect(u.abilities).toContainEqual({ kind: 'followSupport', behindFront: 60, soloMaxP: 200 });
    } },
  { id: 'battering_ram', age: 'medieval', rarity: 'epic', role: 'siege', cost: 200, hp: 900, damage: 10, intervalMs: 2000,
    range: 12, speed: 45, size: 'large', hits: 'G', tags: ['armored', 'mech', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'blast',
    extra: (u) => {
      expect(u.attacks[0]?.vsBaseDamage).toBe(160);
      expect(u.abilities).toContainEqual({ kind: 'siegeOnly' });
    } },
  { id: 'ursa_paladin', age: 'medieval', rarity: 'legendary', role: 'siegeHeavy', cost: 350, hp: 2300, damage: 70, intervalMs: 1400,
    range: 20, speed: 55, size: 'huge', hits: 'G', tags: ['armored', 'bio', 'melee', 'legendary'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'slash',
    extra: (u) => {
      expect(u.attacks[0]?.cleave).toEqual({ count: 2, reach: 40 });
      expect(u.abilities).toContainEqual(
        { kind: 'periodicShieldAura', everyMs: 15000, radius: 200, maxTargets: 8, shield: 60, durationMs: 6000 });
    } },
  // A5.4 Gunpowder
  { id: 'corsair', age: 'gunpowder', rarity: 'common', role: 'infantry', cost: 50, hp: 291, damage: 36, intervalMs: 1000,
    range: 16, speed: 72, size: 'small', hits: 'G', tags: ['light', 'bio', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'slash',
    extra: (u) => expect(u.abilities).toContainEqual({ kind: 'firstHitBonus', multBp: 10000, knockback: -20, idleResetMs: 2000 }) },
  { id: 'grenadier', age: 'gunpowder', rarity: 'rare', role: 'antiArmor', cost: 100, hp: 230, damage: 50, intervalMs: 1800,
    range: 150, speed: 68, size: 'medium', hits: 'G', tags: ['light', 'bio', 'ranged'], fx: 'proj.lob', sfx: 'shot_lob', dmgType: 'blast',
    extra: (u) => {
      expect(u.attacks[0]?.splashRadius).toBe(35);
      expect(u.attacks[0]?.mods).toEqual([{ vs: 'armored', bp: 15000 }, { vs: 'mech', bp: 15000 }, { vs: 'light', bp: 5000 }]);
    } },
  { id: 'bronze_cannon', age: 'gunpowder', rarity: 'epic', role: 'artillery', cost: 200, hp: 500, damage: 110, intervalMs: 3500,
    range: 280, speed: 45, size: 'large', hits: 'G', tags: ['light', 'mech', 'ranged'], fx: 'proj.cannonball', sfx: 'shot_cannon', dmgType: 'blast',
    extra: (u) => expect(u.attacks[0]).toMatchObject({ minRange: 80, splashRadius: 50, projectile: { arc: true } }) },
  { id: 'balloon_admiral', age: 'gunpowder', rarity: 'legendary', role: 'airBomber', cost: 350, hp: 1500, damage: 110, intervalMs: 1600,
    range: 40, speed: 45, size: 'huge', hits: 'G', tags: ['air', 'legendary'], fx: 'proj.bomb', sfx: 'bomb_whistle', dmgType: 'blast',
    extra: (u) => {
      expect(u.attacks[0]).toMatchObject({ splashRadius: 50, vsBaseDamage: 110 });
      expect(u.abilities).toContainEqual({ kind: 'bomber', dropWindow: 40 });
      expect(u.abilities).toContainEqual({ kind: 'onDeathExplode', damage: 250, radius: 70 });
    } },
  // A5.5 Modern
  { id: 'rifleman', age: 'modern', rarity: 'common', role: 'ranged', cost: 75, hp: 234, damage: 32, intervalMs: 1000,
    range: 260, speed: 65, size: 'small', hits: 'G+A', tags: ['light', 'bio', 'ranged'], fx: 'proj.bullet', sfx: 'shot_rifle', dmgType: 'bullet',
    extra: (u) => expect(u.attacks[0]?.onHit).toEqual([{ kind: 'slow', magnitudeBp: 1500, durationMs: 1000 }]) },
  { id: 'tankette', age: 'modern', rarity: 'common', role: 'heavy', cost: 150, hp: 1378, damage: 104, intervalMs: 1500,
    range: 90, speed: 50, size: 'large', hits: 'G', tags: ['armored', 'mech', 'ranged'], fx: 'proj.shell', sfx: 'shot_cannon', dmgType: 'blast' },
  { id: 'radio_operator', age: 'modern', rarity: 'rare', role: 'support', cost: 110, hp: 320, damage: 20, intervalMs: 1200,
    range: 200, speed: 65, size: 'small', hits: 'G+A', tags: ['light', 'bio', 'support', 'ranged'], fx: 'proj.bullet', sfx: 'shot_rifle', dmgType: 'bullet',
    extra: (u) => expect(u.abilities).toContainEqual(
      { kind: 'callStrike', everyMs: 8000, searchRange: 400, delayMs: 1000, damage: 120, radius: 50, sideLockoutMs: 3000 }) },
  { id: 'gyrocopter', age: 'modern', rarity: 'epic', role: 'airGunship', cost: 200, hp: 740, damage: 20, intervalMs: 300,
    range: 150, speed: 80, size: 'medium', hits: 'G+A', tags: ['air', 'mech'], fx: 'proj.bullet', sfx: 'shot_mg', dmgType: 'bullet' },
  { id: 'behemoth_tank', age: 'modern', rarity: 'legendary', role: 'siegeHeavy', cost: 350, hp: 4100, damage: 170, intervalMs: 2500,
    range: 240, speed: 35, size: 'huge', hits: 'G', tags: ['armored', 'mech', 'legendary'], fx: 'proj.shell', sfx: 'shot_cannon', dmgType: 'blast',
    extra: (u) => {
      expect(u.attacks).toHaveLength(2);
      expect(u.attacks[0]?.splashRadius).toBe(40);
      expect(u.attacks[1]).toMatchObject({ damage: 20, intervalMs: 400, range: 150, hitsGround: true, hitsAir: true,
        priority: 'air', dmgType: 'bullet', sfx: 'shot_mg', projectile: { visualId: 'proj.bullet' } });
    } },
  // A5.6 Future
  { id: 'photon_knight', age: 'future', rarity: 'common', role: 'infantry', cost: 50, hp: 470, damage: 66, intervalMs: 1000,
    range: 16, speed: 75, size: 'small', hits: 'G', tags: ['light', 'bio', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'laser',
    extra: (u) => expect(u.abilities).toContainEqual({ kind: 'innateShield', amount: 90, regenPerSec: 30, delayMs: 3000 }) },
  { id: 'rail_gunner', age: 'future', rarity: 'rare', role: 'antiArmor', cost: 100, hp: 400, damage: 86, intervalMs: 1200,
    range: 240, speed: 65, size: 'medium', hits: 'G+A', tags: ['light', 'bio', 'ranged'], fx: 'fx.beam_rail', sfx: 'shot_rail', dmgType: 'laser',
    extra: (u) => {
      expect(u.attacks[0]?.pierce).toEqual({ count: 2, length: 150 });
      expect(u.attacks[0]?.mods).toEqual([{ vs: 'armored', bp: 20000 }, { vs: 'mech', bp: 20000 }, { vs: 'light', bp: 5000 }]);
    } },
  { id: 'repair_drone', age: 'future', rarity: 'rare', role: 'support', cost: 110, hp: 430, damage: 0, intervalMs: 0,
    range: 160, speed: 70, size: 'small', hits: 'none', tags: ['air', 'mech', 'support'], fx: 'none', sfx: 'none', dmgType: 'blunt',
    extra: (u) => expect(u.abilities).toContainEqual({ kind: 'heal', hpPerSec: 100, radius: 160, targets: 2, pulseMs: 500 }) },
  { id: 'emp_saboteur', age: 'future', rarity: 'epic', role: 'antiMech', cost: 200, hp: 700, damage: 50, intervalMs: 1000,
    range: 12, speed: 85, size: 'medium', hits: 'G', tags: ['light', 'bio', 'melee'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'laser',
    extra: (u) => expect(u.abilities).toContainEqual({ kind: 'emp', everyMs: 8000, triggerRadius: 120, radius: 120, stunMs: 1500 }) },
  { id: 'chrono_titan', age: 'future', rarity: 'legendary', role: 'siegeHeavy', cost: 350, hp: 5600, damage: 230, intervalMs: 1600,
    range: 60, speed: 35, size: 'huge', hits: 'G', tags: ['armored', 'mech', 'melee', 'legendary'], fx: 'melee', sfx: 'swing_whoosh', dmgType: 'blunt',
    extra: (u) => {
      expect(u.attacks[0]?.cleave).toEqual({ count: 3, reach: 60 });
      expect(u.abilities).toContainEqual({ kind: 'timeStop', everyMs: 15000, radius: 200, freezeMs: 1500, legendaryFreezeMs: 750 });
    } },
];

/** One A5 turret row plus its A14.2 mapping. */
interface TurretRow {
  id: string; age: AgeId; rarity: Exclude<Rarity, 'legendary'>; cost: number; damage: number; intervalMs: number;
  range: number; hits: 'G' | 'G+A'; fx: string; sfx: string; dmgType: DmgType; extra?: (a: AttackDef) => void;
}

const TURRET_ROWS: TurretRow[] = [
  { id: 'rock_tosser', age: 'stone', rarity: 'common', cost: 150, damage: 30, intervalMs: 1500, range: 360, hits: 'G+A',
    fx: 'proj.boulder', sfx: 'shot_catapult', dmgType: 'blunt', extra: (a) => expect(a.projectile).toMatchObject({ arc: true }) },
  { id: 'angry_beehive', age: 'stone', rarity: 'common', cost: 175, damage: 5, intervalMs: 200, range: 220, hits: 'G+A',
    fx: 'proj.bee', sfx: 'bee_buzz', dmgType: 'pierce' },
  { id: 'grumpy_toad', age: 'stone', rarity: 'epic', cost: 250, damage: 60, intervalMs: 5000, range: 420, hits: 'G',
    fx: 'fx.tongue', sfx: 'toad_tongue', dmgType: 'blunt', extra: (a) => expect(a.drag).toEqual({ distance: 120 }) },
  { id: 'pitch_cauldron', age: 'medieval', rarity: 'common', cost: 175, damage: 14, intervalMs: 500, range: 130, hits: 'G',
    fx: 'fx.pitch_pour', sfx: 'cauldron_pour', dmgType: 'blast',
    extra: (a) => expect(a).toMatchObject({ gateZone: { radius: 130 }, maxTargets: 4 }) },
  { id: 'trebuchet', age: 'medieval', rarity: 'rare', cost: 250, damage: 110, intervalMs: 4500, range: 480, hits: 'G',
    fx: 'proj.boulder', sfx: 'shot_catapult', dmgType: 'blast', extra: (a) => expect(a).toMatchObject({ minRange: 150, splashRadius: 50 }) },
  { id: 'grapeshot_gun', age: 'gunpowder', rarity: 'common', cost: 175, damage: 50, intervalMs: 2000, range: 220, hits: 'G+A',
    fx: 'proj.grapeshot', sfx: 'shot_grapeshot', dmgType: 'bullet', extra: (a) => expect(a).toMatchObject({ followBehind: 90, maxTargets: 4 }) },
  { id: 'congreve_rack', age: 'gunpowder', rarity: 'rare', cost: 250, damage: 55, intervalMs: 5000, range: 460, hits: 'G+A',
    fx: 'proj.rocket', sfx: 'shot_rocket', dmgType: 'blast',
    extra: (a) => expect(a).toMatchObject({ volley: 4, splashRadius: 30, scatter: 40, mods: [{ vs: 'air', bp: 15000 }] }) },
  { id: 'flak_gun', age: 'modern', rarity: 'common', cost: 175, damage: 60, intervalMs: 1500, range: 420, hits: 'G+A',
    fx: 'proj.flak', sfx: 'shot_flak', dmgType: 'blast',
    extra: (a) => expect(a).toMatchObject({ splashRadius: 40, priority: 'air', mods: [{ vs: 'air', bp: 20000 }] }) },
  { id: 'searchlight_sniper', age: 'modern', rarity: 'epic', cost: 250, damage: 280, intervalMs: 4000, range: 480, hits: 'G+A',
    fx: 'proj.bullet', sfx: 'shot_rifle', dmgType: 'bullet',
    extra: (a) => expect(a).toMatchObject({ priority: 'armored', onHit: [{ kind: 'mark', magnitudeBp: 2000, durationMs: 4000 }] }) },
  { id: 'arc_coil', age: 'future', rarity: 'common', cost: 175, damage: 60, intervalMs: 1800, range: 260, hits: 'G+A',
    fx: 'fx.arc_chain', sfx: 'shot_arc', dmgType: 'laser', extra: (a) => expect(a.chain).toEqual({ count: 3, hop: 100 }) },
  { id: 'gravity_well', age: 'future', rarity: 'epic', cost: 250, damage: 60, intervalMs: 7000, range: 400, hits: 'G',
    fx: 'proj.gravity_orb', sfx: 'gravity_hum', dmgType: 'blast',
    extra: (a) => expect(a).toMatchObject({ priority: 'densest', splashRadius: 90, maxTargets: 4,
      pull: { radius: 90, fractionBp: 6000 }, onHit: [{ kind: 'slow', magnitudeBp: 5000, durationMs: 2500 }] }) },
];

/** A5.7 rows. */
const POWER_ROWS: { id: string; age: AgeId; slot: PowerDef['slot']; sfx: string; effect: PowerDef['effect'] }[] = [
  { id: 'stampede', age: 'stone', slot: 'default', sfx: 'pw_stampede',
    effect: { kind: 'stampede', runners: 5, spacingMs: 400, distance: 500, speed: 400, damage: 50, knockback: 40, maxHitsPerEnemy: 3 } },
  { id: 'meteor_shower', age: 'stone', slot: 'alternate', sfx: 'pw_meteor',
    effect: { kind: 'barrage', count: 14, durationMs: 3000, zone: 400, damage: 50, radius: 40, jitter: 20, hitsAir: false, pattern: 'even' } },
  { id: 'arrow_storm', age: 'medieval', slot: 'default', sfx: 'pw_arrows',
    effect: { kind: 'barrage', count: 40, durationMs: 2500, zone: 450, damage: 40, radius: 20, jitter: 20, hitsAir: true, pattern: 'even' } },
  { id: 'smoke_screen', age: 'gunpowder', slot: 'default', sfx: 'pw_smoke',
    effect: { kind: 'cloud', width: 350, durationMs: 7000, enemyMissBp: 5000, allyDamageBp: 2000 } },
  { id: 'paratroopers', age: 'modern', slot: 'default', sfx: 'pw_paratroop',
    effect: { kind: 'paradrop', card: 'rifleman', count: 4, beyondFront: 150, fallbackP: 1000 } },
  { id: 'carpet_bomber', age: 'modern', slot: 'alternate', sfx: 'pw_bomber',
    effect: { kind: 'barrage', count: 12, durationMs: 1500, zone: 500, damage: 150, radius: 50, jitter: 0, hitsAir: false, pattern: 'line' } },
  { id: 'orbital_lance', age: 'future', slot: 'default', sfx: 'pw_lance',
    effect: { kind: 'sweep', zone: 500, durationMs: 2000, damage: 450, width: 40, hitsAir: true } },
];

function allUnits(c: RawContent): UnitDef[] {
  return c.ages.flatMap((a) => [...a.units]);
}
function allTurrets(c: RawContent): TurretDef[] {
  return c.ages.flatMap((a) => [...a.turrets]);
}
function unitById(c: RawContent, id: string): UnitDef {
  const u = allUnits(c).find((x) => x.id === id);
  if (!u) throw new Error(`unit ${id} missing`);
  return u;
}
function turretById(c: RawContent, id: string): TurretDef {
  const t = allTurrets(c).find((x) => x.id === id);
  if (!t) throw new Error(`turret ${id} missing`);
  return t;
}
function fxOf(a: AttackDef): string {
  if (!a.projectile) return 'melee';
  return 'instant' in a.projectile ? a.projectile.effectId : a.projectile.visualId;
}
function expectedGroup(rarity: Rarity, role: Role): RoleGroup {
  if (rarity === 'epic') return 'epic';
  if (rarity === 'legendary') return 'legendary';
  return role as RoleGroup;
}

describe.each([
  ['src/content/raw', raw],
  ['tests/fixtures/content', fixture],
])('%s', (_name, c) => {
  describe('A5 unit sample', () => {
    it.each(UNIT_ROWS.map((r) => [r.id, r] as const))('%s matches its A5 row and A14.2 mapping', (_id, r) => {
      const u = unitById(c, r.id);
      const group = expectedGroup(r.rarity, r.role);
      expect(u).toMatchObject({
        kind: 'unit', age: r.age, rarity: r.rarity, role: r.role, group, cost: r.cost, hp: r.hp, speed: r.speed, size: r.size,
        trainMs: GROUP[group].trainMs, pop: GROUP[group].pop,
        visualId: `unit.${r.id}`, nameKey: `card.${r.id}.name`, descKey: `card.${r.id}.desc`,
      });
      const air = r.tags.includes('air');
      expect([...u.tags].sort()).toEqual([...r.tags, ...(air ? [] : ['ground' as const])].sort());
      if (r.hits === 'none') {
        expect(u.attacks).toEqual([]);
      } else {
        const a = u.attacks[0];
        if (!a) throw new Error('no attack');
        expect(a).toMatchObject({ damage: r.damage, intervalMs: r.intervalMs, range: r.range, dmgType: r.dmgType, sfx: r.sfx,
          hitsGround: true, hitsAir: r.hits === 'G+A' });
        expect(fxOf(a)).toBe(r.fx);
      }
      r.extra?.(u);
    });
  });

  describe('A5 turret sample', () => {
    it.each(TURRET_ROWS.map((r) => [r.id, r] as const))('%s matches its A5 row and A14.2 mapping', (_id, r) => {
      const t = turretById(c, r.id);
      expect(t).toMatchObject({ kind: 'turret', age: r.age, rarity: r.rarity, cost: r.cost,
        visualId: `turret.${r.id}`, nameKey: `card.${r.id}.name`, descKey: `card.${r.id}.desc` });
      expect(t.attack).toMatchObject({ damage: r.damage, intervalMs: r.intervalMs, windupPct: 0, range: r.range,
        dmgType: r.dmgType, sfx: r.sfx, hitsGround: true, hitsAir: r.hits === 'G+A' });
      expect(fxOf(t.attack)).toBe(r.fx);
      r.extra?.(t.attack);
    });
  });

  describe('A5.7 power sample', () => {
    it.each(POWER_ROWS.map((r) => [r.id, r] as const))('%s matches its A5.7 row', (_id, r) => {
      const p = c.powers.find((x) => x.id === r.id);
      expect(p).toEqual({ id: r.id, kind: 'power', age: r.age, slot: r.slot, telegraphMs: 1000, effect: r.effect,
        visualId: `power.${r.id}`, sfx: r.sfx, nameKey: `card.${r.id}.name`, descKey: `card.${r.id}.desc` });
    });
    it('royal_decree and nanite_surge buff every own unit', () => {
      expect(c.powers.find((p) => p.id === 'royal_decree')?.effect).toEqual({ kind: 'buffAll', statuses: [
        { kind: 'damageBuff', magnitudeBp: 3000, durationMs: 8000 }, { kind: 'speedBuff', magnitudeBp: 2500, durationMs: 8000 }] });
      expect(c.powers.find((p) => p.id === 'nanite_surge')?.effect).toEqual({ kind: 'buffAll', statuses: [
        { kind: 'regen', magnitudeBp: 4000, durationMs: 4000 }, { kind: 'shield', magnitudeBp: 0, durationMs: 6000, amount: 150 }] });
    });
  });

  describe('collection shape (A5.1)', () => {
    it('has 7 collectable units and 4 turrets per age, in age order, each tagged with its age', () => {
      expect(c.ages.map((a) => a.age)).toEqual(AGES);
      for (const a of c.ages) {
        const visible = a.units.filter((u) => !u.hidden);
        expect(visible).toHaveLength(7);
        expect(a.turrets).toHaveLength(4);
        for (const card of [...a.units, ...a.turrets]) expect(card.age).toBe(a.age);
        expect(visible.map((u) => u.group).sort()).toEqual(
          ['antiArmor', 'epic', 'heavy', 'infantry', 'legendary', 'ranged', 'support']);
        expect(a.turrets.map((t) => [t.rarity, t.cost])).toEqual([['common', 150], ['common', 175], ['rare', 250], ['epic', 250]]);
      }
    });

    it('has 55 cards: 25 Common, 15 Rare, 10 Epic, 5 Legendary; plus the hidden Training Dummy', () => {
      const cards = [...allUnits(c).filter((u) => !u.hidden), ...allTurrets(c)];
      expect(cards).toHaveLength(55);
      const count = (r: Rarity) => cards.filter((x) => x.rarity === r).length;
      expect([count('common'), count('rare'), count('epic'), count('legendary')]).toEqual([25, 15, 10, 5]);
      expect(allUnits(c).filter((u) => u.hidden).map((u) => u.id)).toEqual(['training_dummy']);
      expect(unitById(c, 'training_dummy')).toMatchObject({ age: 'stone', cost: 50, hp: 40, speed: 50, size: 'small',
        attacks: [{ damage: 4, intervalMs: 1000, range: 16, hitsGround: true, hitsAir: false }] });
    });

    it('has 10 Age Powers: one default and one alternate per age', () => {
      expect(c.powers).toHaveLength(10);
      for (const age of AGES) {
        expect(c.powers.filter((p) => p.age === age).map((p) => p.slot).sort()).toEqual(['alternate', 'default']);
      }
    });

    it('uses unique ids across units, turrets and powers', () => {
      const ids = [...allUnits(c), ...allTurrets(c), ...c.powers].map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    });
  });

  describe('rules every card follows', () => {
    it('prices, train times and pop follow the role group (A2.3, A2.7, A5.1)', () => {
      for (const u of allUnits(c)) {
        expect(u.group, u.id).toBe(expectedGroup(u.rarity, u.role));
        expect({ id: u.id, cost: u.cost, trainMs: u.trainMs, pop: u.pop }).toEqual({ id: u.id, ...GROUP[u.group] });
      }
    });

    it('every attack states hitsGround and hitsAir; melee never hits air; windups follow A2.7', () => {
      const unitAttacks = allUnits(c).flatMap((u) => [
        ...u.attacks.map((a) => ({ id: u.id, a })),
        ...u.abilities.flatMap((ab) => (ab.kind === 'riders' ? [{ id: `${u.id}.riders`, a: ab.attack }] : [])),
      ]);
      for (const { id, a } of unitAttacks) {
        expect(typeof a.hitsGround, id).toBe('boolean');
        expect(typeof a.hitsAir, id).toBe('boolean');
        const melee = !a.projectile;
        if (melee) expect(a.hitsAir, id).toBe(false);
        expect(a.windupPct, id).toBe(melee ? 40 : 50);
      }
      for (const t of allTurrets(c)) {
        expect(typeof t.attack.hitsGround, t.id).toBe('boolean');
        expect(typeof t.attack.hitsAir, t.id).toBe('boolean');
        expect(t.attack.windupPct, t.id).toBe(0);
      }
    });

    it('projectiles fly at the A5.1 default speeds; arcs at 450', () => {
      const attacks = [...allUnits(c).flatMap((u) => [
        ...u.attacks, ...u.abilities.flatMap((ab) => (ab.kind === 'riders' ? [ab.attack] : []))]), ...allTurrets(c).map((t) => t.attack)];
      for (const a of attacks) {
        const p = a.projectile;
        if (!p || 'instant' in p) continue;
        if (p.arc) expect(p.speed, p.visualId).toBe(450);
        else if (DEFAULT_SPEED[p.visualId] !== undefined) expect(p.speed, p.visualId).toBe(DEFAULT_SPEED[p.visualId]);
      }
    });

    it('unit sounds follow the A14.2 defaults; exactly one of ground and air', () => {
      const spawn: Record<RoleGroup, string> = { infantry: 'spawn_pop', ranged: 'spawn_pop', antiArmor: 'spawn_pop',
        support: 'spawn_pop', heavy: 'spawn_heavy', epic: 'spawn_heavy', legendary: 'spawn_legendary' };
      for (const u of allUnits(c)) {
        expect(u.sfx, u.id).toEqual({ spawn: spawn[u.group], die: u.tags.includes('mech') ? 'die_mech' : 'die_bio' });
        expect(Number(u.tags.includes('ground')) + Number(u.tags.includes('air')), u.id).toBe(1);
        expect(u.tags.includes('legendary'), u.id).toBe(u.rarity === 'legendary');
      }
    });
  });

  describe('A2 economy and battle numbers', () => {
    it('ages: P, base HP = 10,000 × P, XP thresholds (A2.2, A2.4)', () => {
      expect(AGES.map((a) => [c.ageScale[a].index, c.ageScale[a].pBp, c.ageScale[a].baseHp, c.ageScale[a].xpToNext])).toEqual([
        [0, 10000, 10000, 700], [1, 13500, 13500, 1000], [2, 18200, 18200, 1200], [3, 24600, 24600, 1500], [4, 33200, 33200, null],
      ]);
    });

    it('formats and clocks (A2.10)', () => {
      // The Tutorial thresholds were retimed for the A8 pace (wp1-tutorial-pacing); the frozen fixture keeps the old ones.
      expect(c.formats.tutorial).toMatchObject({ ages: AGES, overdriveMs: null, siegeMs: null, finalBellMs: null,
        retreatAfterMs: null, xpToNextOverride: c === raw ? [680, 690, 520, 700] : [250, 300, 350, 400] });
      expect(c.formats.short).toMatchObject({ ages: ['stone', 'medieval', 'gunpowder'], overdriveMs: 210000, siegeMs: 270000,
        finalBellMs: 360000, retreatAfterMs: 60000 });
      expect(c.formats.standard).toMatchObject({ ages: ['stone', 'medieval', 'gunpowder', 'modern'], overdriveMs: 270000,
        siegeMs: 360000, finalBellMs: 450000, retreatAfterMs: 60000 });
      expect(c.formats.full).toMatchObject({ ages: AGES, overdriveMs: 330000, siegeMs: 450000, finalBellMs: 570000, retreatAfterMs: 60000 });
    });

    it('gold, XP, turrets, powers, phases and Last Stand (A2.3-A2.11)', () => {
      expect(c.economy).toMatchObject({
        startGold: 175, passiveGoldPerSec: 6, passiveXpPerSec: 4, treasuryCosts: [200, 350, 550],
        treasuryMilliGoldPerSecPerLevel: 1500, mountCosts: [0, 150, 350, 700],
        bountyGoldBp: 6000, bountyXpBp: 10000, powerKillGoldBp: 3000, powerKillXpBp: 0, ownLossXpBp: 4000,
        underdogBp: 5000, baseDamageXpPerPct: 12, xpCapBp: 15000, popCap: 60, queueMax: 5, legendaryLimit: 1,
        popByGroup: { infantry: 2, ranged: 3, antiArmor: 4, support: 4, heavy: 6, epic: 8, legendary: 14 },
        sellRefundBp: 5000, turretRangeCap: 480, turretBuildMs: 1000, turretSellMs: 1000,
        ascendMs: 2500, evolveHealBp: 500, vanguardCount: 2, powerChargeMs: 50000, powerCarryCapBp: 5000,
        overchargeXp: 1200, overchargeBp: 2500,
        overdrive: { baseGoldBp: 20000, xpBp: 20000, powerBp: 12500 },
        siege: { turretDamageBp: 5000, baseDamageBp: 20000, decayBpPerSec: 50, moveSpeedBp: 12000, unitDamageTakenBp: 10000 },
        marchSpeedBp: 12500,
        lastStand: { thresholdBp: 2500, autoBp: 1000, radius: 450, damagePerP: 200, knockback: 80, chargeMs: 1000 },
        spawnP: 20, holdLine: 320, holdRetreatSpeedBp: 7000, leash: 20, spacingBp: 3000, retargetMs: 1000,
        retargetCloserLu: 60, rangedSelfDefenseLu: 30, firstHitIdleMs: 2000, stanceCooldownMs: 2000,
        sizes: { small: 24, medium: 32, large: 48, huge: 80 },
        knockbackResistBp: { small: 0, medium: 0, large: 5000, huge: 5000 },
        areaSecondaryBp: 5000, areaMaxTargets: 4, healLegendaryBp: 5000, legendaryPowerDamageBp: 5000,
        powerZoneClamp: [150, 1850], drawGapBp: 50, levelStepBp: 500, maxLevel: 10,
      });
      expect(c.battle).toMatchObject({ laneLength: 2000, baseDepth: 140, midLane: 1000, windupPct: { melee: 40, ranged: 50, turret: 0 },
        markDamageBp: 12000, healPulseMs: 500, finalAgeXpCap: 1200, stampedeFallbackP: 200 });
    });
  });
});
