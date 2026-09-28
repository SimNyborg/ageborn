/**
 * Every card in DESIGN A5 exists in the compiled content with the listed numbers
 * (C2/WP1 DoD: "A table-driven test that every card in A5 exists with the listed numbers").
 *
 * The rows are typed in from the DESIGN tables (A5.2-A5.7), not read from the raw files, so a typo on
 * either side fails. When balance tuning changes a number, update DESIGN and the row here.
 */
import { describe, expect, it } from 'vitest';
import type { AttackDef, PowerEffect, UnitDef } from '@/contracts/content';
import type { AgeId, Rarity, Role, Tag } from '@/contracts/ids';
import strings from '@/i18n/content.en.json';
import { content } from '../index';

type Hits = 'G' | 'A' | 'GA' | '-';
type Size = UnitDef['size'];
const R: Record<string, Rarity> = { C: 'common', R: 'rare', E: 'epic', L: 'legendary' };
const S: Record<string, Size> = { S: 'small', M: 'medium', L: 'large', H: 'huge' };

/** [slug, name, rarity, role, cost, hp, damage, interval s×10, range, speed, size, hits, tags] */
type UnitRow = [string, string, string, Role, number, number, number, number, number, number, string, Hits, string];

const UNITS: Record<AgeId, UnitRow[]> = {
  // A5.2 Stone Age (P 1.00)
  stone: [
    ['bonker', 'Bonker', 'C', 'infantry', 50, 160, 20, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['pebbler', 'Pebbler', 'C', 'ranged', 75, 95, 18, 14, 200, 65, 'S', 'GA', 'light bio ranged'],
    ['tuskback', 'Tuskback', 'C', 'heavy', 150, 560, 42, 15, 16, 55, 'L', 'G', 'armored bio melee'],
    ['spear_hunter', 'Spear Hunter', 'R', 'antiArmor', 100, 200, 26, 12, 60, 70, 'M', 'G', 'light bio melee'],
    ['drum_shaman', 'Drum Shaman', 'R', 'support', 110, 130, 8, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['sabertooth', 'Sabertooth', 'E', 'skirmisher', 200, 380, 34, 8, 12, 100, 'M', 'G', 'light bio melee'],
    ['mammoth_matriarch', 'Mammoth Matriarch', 'L', 'siegeHeavy', 350, 1700, 55, 20, 20, 40, 'H', 'G', 'armored bio melee legendary'],
  ],
  // A5.3 Medieval Age (P 1.35)
  medieval: [
    ['footman', 'Footman', 'C', 'infantry', 50, 216, 27, 10, 16, 70, 'S', 'G', 'light bio melee'],
    ['longbowman', 'Longbowman', 'C', 'ranged', 75, 128, 24, 14, 230, 65, 'S', 'GA', 'light bio ranged'],
    ['destrier_knight', 'Destrier Knight', 'C', 'heavy', 150, 756, 57, 15, 16, 60, 'L', 'G', 'armored bio melee'],
    ['pikeman', 'Pikeman', 'R', 'antiArmor', 100, 270, 35, 12, 70, 70, 'M', 'G', 'light bio melee'],
    ['friar', 'Friar', 'R', 'support', 110, 175, 11, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['battering_ram', 'Battering Ram', 'E', 'siege', 200, 900, 10, 20, 12, 45, 'L', 'G', 'armored mech melee'],
    ['ursa_paladin', 'Ursa Paladin', 'L', 'siegeHeavy', 350, 2300, 70, 14, 20, 55, 'H', 'G', 'armored bio melee legendary'],
  ],
  // A5.4 Gunpowder Age (P 1.82)
  gunpowder: [
    ['corsair', 'Corsair', 'C', 'infantry', 50, 291, 36, 10, 16, 72, 'S', 'G', 'light bio melee'],
    ['fusilier', 'Fusilier', 'C', 'ranged', 75, 173, 47, 20, 240, 65, 'S', 'GA', 'light bio ranged'],
    ['cuirassier', 'Cuirassier', 'C', 'heavy', 150, 1019, 76, 15, 16, 60, 'L', 'G', 'armored bio melee'],
    ['grenadier', 'Grenadier', 'R', 'antiArmor', 100, 230, 50, 18, 150, 68, 'M', 'G', 'light bio ranged'],
    ['field_surgeon', 'Field Surgeon', 'R', 'support', 110, 237, 15, 12, 150, 65, 'S', 'GA', 'light bio support ranged'],
    ['bronze_cannon', 'Bronze Cannon', 'E', 'artillery', 200, 500, 110, 35, 280, 45, 'L', 'G', 'light mech ranged'],
    ['balloon_admiral', 'Balloon Admiral', 'L', 'airBomber', 350, 1500, 110, 16, 40, 45, 'H', 'G', 'air legendary'],
  ],
  // A5.5 Modern Age (P 2.46)
  modern: [
    ['trench_raider', 'Trench Raider', 'C', 'infantry', 50, 394, 49, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['rifleman', 'Rifleman', 'C', 'ranged', 75, 234, 32, 10, 260, 65, 'S', 'GA', 'light bio ranged'],
    ['tankette', 'Tankette', 'C', 'heavy', 150, 1378, 104, 15, 90, 50, 'L', 'G', 'armored mech ranged'],
    ['bazooka_trooper', 'Bazooka Trooper', 'R', 'antiArmor', 100, 300, 64, 12, 200, 65, 'M', 'GA', 'light bio ranged'],
    ['radio_operator', 'Radio Operator', 'R', 'support', 110, 320, 20, 12, 200, 65, 'S', 'GA', 'light bio support ranged'],
    ['gyrocopter', 'Gyrocopter', 'E', 'airGunship', 200, 740, 20, 3, 150, 80, 'M', 'GA', 'air mech'],
    ['behemoth_tank', 'Behemoth Tank', 'L', 'siegeHeavy', 350, 4100, 170, 25, 240, 35, 'H', 'G', 'armored mech legendary'],
  ],
  // A5.6 Future Age (P 3.32)
  future: [
    ['photon_knight', 'Photon Knight', 'C', 'infantry', 50, 470, 66, 10, 16, 75, 'S', 'G', 'light bio melee'],
    ['pulse_trooper', 'Pulse Trooper', 'C', 'ranged', 75, 315, 43, 10, 260, 65, 'S', 'GA', 'light bio ranged'],
    ['walker_mech', 'Walker Mech', 'C', 'heavy', 150, 1860, 140, 15, 60, 50, 'L', 'G', 'armored mech melee'],
    ['rail_gunner', 'Rail Gunner', 'R', 'antiArmor', 100, 400, 86, 12, 240, 65, 'M', 'GA', 'light bio ranged'],
    ['repair_drone', 'Repair Drone', 'R', 'support', 110, 430, 0, 0, 160, 70, 'S', '-', 'air mech support'],
    ['emp_saboteur', 'EMP Saboteur', 'E', 'antiMech', 200, 700, 50, 10, 12, 85, 'M', 'G', 'light bio melee'],
    ['chrono_titan', 'Chrono Titan', 'L', 'siegeHeavy', 350, 5600, 230, 16, 60, 35, 'H', 'G', 'armored mech melee legendary'],
  ],
};

/** [slug, name, rarity, cost, damage, interval s×10, range, hits] */
type TurretRow = [string, string, string, number, number, number, number, Hits];

const TURRETS: Record<AgeId, TurretRow[]> = {
  stone: [
    ['rock_tosser', 'Rock Tosser', 'C', 150, 30, 15, 360, 'GA'],
    ['angry_beehive', 'Angry Beehive', 'C', 175, 5, 2, 220, 'GA'],
    ['log_roller', 'Log Roller', 'R', 250, 45, 40, 300, 'G'],
    ['grumpy_toad', 'Grumpy Toad', 'E', 250, 60, 50, 420, 'G'],
  ],
  medieval: [
    ['crossbow_nest', 'Crossbow Nest', 'C', 150, 40, 15, 380, 'GA'],
    ['pitch_cauldron', 'Pitch Cauldron', 'C', 175, 14, 5, 130, 'G'],
    ['trebuchet', 'Trebuchet', 'R', 250, 110, 45, 480, 'G'],
    ['honk_ballista', 'Honk Ballista', 'E', 250, 70, 30, 400, 'GA'],
  ],
  gunpowder: [
    ['swivel_gun', 'Swivel Gun', 'C', 150, 22, 6, 340, 'GA'],
    ['grapeshot_gun', 'Grapeshot Gun', 'C', 175, 50, 20, 220, 'GA'],
    ['congreve_rack', 'Congreve Rack', 'R', 250, 55, 50, 460, 'GA'],
    ['chainshot_cannon', 'Chainshot Cannon', 'E', 250, 75, 40, 400, 'G'],
  ],
  modern: [
    ['mg_nest', 'MG Nest', 'C', 150, 15, 3, 340, 'GA'],
    ['flak_gun', 'Flak Gun', 'C', 175, 60, 15, 420, 'GA'],
    ['howitzer', 'Howitzer', 'R', 250, 200, 50, 480, 'G'],
    ['searchlight_sniper', 'Searchlight Sniper', 'E', 250, 280, 40, 480, 'GA'],
  ],
  future: [
    ['pulse_laser', 'Pulse Laser', 'C', 150, 20, 3, 360, 'GA'],
    ['arc_coil', 'Arc Coil', 'C', 175, 60, 18, 260, 'GA'],
    ['plasma_mortar', 'Plasma Mortar', 'R', 250, 270, 50, 480, 'G'],
    ['gravity_well', 'Gravity Well', 'E', 250, 60, 70, 400, 'G'],
  ],
};

/** A5.7: [slug, name, age, slot, effect fields to match] */
type PowerRow = [string, string, AgeId, 'default' | 'alternate', Partial<PowerEffect> & { kind: PowerEffect['kind'] }];

const POWERS: PowerRow[] = [
  ['stampede', 'Stampede', 'stone', 'default',
    { kind: 'stampede', runners: 5, spacingMs: 400, distance: 500, speed: 400, damage: 50, knockback: 40, maxHitsPerEnemy: 3 }],
  ['meteor_shower', 'Meteor Shower', 'stone', 'alternate',
    { kind: 'barrage', count: 14, durationMs: 3000, zone: 400, damage: 50, radius: 40, jitter: 20, hitsAir: false, pattern: 'even' }],
  ['arrow_storm', 'Arrow Storm', 'medieval', 'default',
    { kind: 'barrage', count: 40, durationMs: 2500, zone: 450, damage: 40, radius: 20, hitsAir: true, pattern: 'even' }],
  ['royal_decree', 'Royal Decree', 'medieval', 'alternate', { kind: 'buffAll' }],
  ['smoke_screen', 'Smoke Screen', 'gunpowder', 'default',
    { kind: 'cloud', width: 350, durationMs: 7000, enemyMissBp: 5000, allyDamageBp: 2000 }],
  ['broadside', 'Broadside', 'gunpowder', 'alternate',
    { kind: 'barrage', count: 10, durationMs: 3000, zone: 450, damage: 120, radius: 45, hitsAir: false }],
  ['paratroopers', 'Paratroopers', 'modern', 'default',
    { kind: 'paradrop', card: 'rifleman', count: 4, beyondFront: 150, fallbackP: 600 }],
  ['carpet_bomber', 'Carpet Bomber', 'modern', 'alternate',
    { kind: 'barrage', count: 12, durationMs: 1500, zone: 500, damage: 150, radius: 50, jitter: 0, hitsAir: false, pattern: 'line' }],
  ['orbital_lance', 'Orbital Lance', 'future', 'default',
    { kind: 'sweep', zone: 500, durationMs: 2000, damage: 450, hitsAir: true }],
  ['nanite_surge', 'Nanite Surge', 'future', 'alternate', { kind: 'buffAll' }],
];

/** A2.7 train times and pop per role group (derived by the compiler). */
const GROUP_TRAIN: Record<string, [number, number]> = {
  infantry: [1500, 2], ranged: [2000, 3], antiArmor: [2500, 4], support: [3000, 4], heavy: [4000, 6], epic: [4000, 8], legendary: [7000, 14],
};

function hitsOf(a: AttackDef | undefined): Hits {
  if (!a) return '-';
  return a.hitsGround && a.hitsAir ? 'GA' : a.hitsAir ? 'A' : 'G';
}

const en: { card: Record<string, { name: string }> } = strings;

describe('A5 unit tables', () => {
  for (const age of Object.keys(UNITS) as AgeId[]) {
    for (const row of UNITS[age]) {
      const [slug, name, rar, role, cost, hp, dmg, int10, range, speed, size, hits, tags] = row;
      it(`${age}: ${slug}`, () => {
        const u = content.units[slug];
        expect(u, slug).toBeDefined();
        if (!u) return;
        expect(u.age).toBe(age);
        expect(u.rarity).toBe(R[rar]);
        expect(u.role).toBe(role);
        expect(u.cost).toBe(cost);
        expect(u.hp).toBe(hp);
        expect(u.speed).toBe(speed);
        expect(u.size).toBe(S[size]);
        expect(hitsOf(u.attacks[0])).toBe(hits);
        // The table's Tags column; every non-air unit also carries `ground` (WP0 raw decision).
        const want = tags.split(' ') as Tag[];
        expect([...u.tags].sort()).toEqual([...want, ...(want.includes('air') ? [] : ['ground' as Tag])].sort());
        const [trainMs, pop] = GROUP_TRAIN[u.group] ?? [0, 0];
        expect(u.trainMs).toBe(trainMs);
        expect(u.pop).toBe(pop);
        expect(en.card[slug]?.name).toBe(name);
        if (hits === '-') {
          expect(u.attacks).toEqual([]);
          return;
        }
        const a = u.attacks[0] as AttackDef;
        expect(a.damage).toBe(dmg);
        expect(a.intervalMs).toBe(int10 * 100);
        expect(a.range).toBe(range);
      });
    }
  }

  it('lists all 35 collectable units', () => {
    const rows = Object.values(UNITS).flat().map((r) => r[0]);
    expect(rows).toHaveLength(35);
    expect([...content.order.units].sort()).toEqual([...rows].sort());
  });

  it('has the hidden tutorial Training Dummy (A5.6)', () => {
    const d = content.units.training_dummy;
    expect(d).toMatchObject({ cost: 50, hp: 40, speed: 50, size: 'small', hidden: true });
    expect(d?.attacks[0]).toMatchObject({ damage: 4, intervalMs: 1000, range: 16, hitsGround: true, hitsAir: false });
  });

  it('encodes the listed traits', () => {
    const ab = (id: string) => content.units[id]?.abilities ?? [];
    expect(content.units.pebbler?.attacks[0]?.chain).toEqual({ count: 2, hop: 40 });
    expect(ab('tuskback')).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 });
    expect(ab('drum_shaman')).toContainEqual({ kind: 'aura', radius: 160, status: { kind: 'attackSpeedBuff', magnitudeBp: 2000, durationMs: 0 } });
    expect(ab('sabertooth')).toContainEqual({ kind: 'pounce', searchRange: 150, cooldownMs: 10000, leapMs: 500, firstBiteBp: 20000 });
    expect(ab('mammoth_matriarch').find((a) => a.kind === 'riders')).toMatchObject({ count: 2, onDeathSpawn: 'pebbler', attack: { damage: 12, intervalMs: 1400, range: 200 } });
    expect(ab('footman')).toContainEqual({ kind: 'resist', minSourceRange: 100, bp: 2500 });
    expect(ab('pikeman')).toContainEqual({ kind: 'brace' });
    expect(ab('friar')).toContainEqual({ kind: 'heal', hpPerSec: 40, radius: 160, targets: 2, pulseMs: 500 });
    expect(content.units.battering_ram?.attacks[0]?.vsBaseDamage).toBe(160);
    expect(ab('ursa_paladin')).toContainEqual({ kind: 'periodicShieldAura', everyMs: 15000, radius: 200, maxTargets: 8, shield: 60, durationMs: 6000 });
    expect(content.units.ursa_paladin?.attacks[0]?.cleave).toEqual({ count: 2, reach: 40 });
    expect(ab('corsair')).toContainEqual({ kind: 'firstHitBonus', multBp: 10000, knockback: -20, idleResetMs: 2000 });
    expect(content.units.grenadier?.attacks[0]).toMatchObject({ splashRadius: 35, priority: 'armored' });
    expect(ab('field_surgeon')).toContainEqual({ kind: 'heal', hpPerSec: 55, radius: 160, targets: 2, pulseMs: 500 });
    expect(content.units.bronze_cannon?.attacks[0]).toMatchObject({ splashRadius: 50, minRange: 80 });
    expect(ab('balloon_admiral')).toContainEqual({ kind: 'onDeathExplode', damage: 250, radius: 70 });
    expect(content.units.rifleman?.attacks[0]?.onHit).toEqual([{ kind: 'slow', magnitudeBp: 1500, durationMs: 1000 }]);
    expect(ab('radio_operator')).toContainEqual({ kind: 'callStrike', everyMs: 8000, searchRange: 400, delayMs: 1000, damage: 120, radius: 50, sideLockoutMs: 3000 });
    expect(content.units.behemoth_tank?.attacks[1]).toMatchObject({ damage: 20, intervalMs: 400, range: 150, hitsGround: true, hitsAir: true, priority: 'air' });
    expect(ab('photon_knight')).toContainEqual({ kind: 'innateShield', amount: 90, regenPerSec: 30, delayMs: 3000 });
    expect(content.units.rail_gunner?.attacks[0]?.pierce).toEqual({ count: 2, length: 150 });
    expect(ab('repair_drone')).toContainEqual({ kind: 'heal', hpPerSec: 100, radius: 160, targets: 2, pulseMs: 500 });
    expect(ab('emp_saboteur')).toContainEqual({ kind: 'emp', everyMs: 8000, triggerRadius: 120, radius: 120, stunMs: 1500 });
    expect(ab('chrono_titan')).toContainEqual({ kind: 'timeStop', everyMs: 15000, radius: 200, freezeMs: 1500, legendaryFreezeMs: 750 });
    expect(content.units.chrono_titan?.attacks[0]?.cleave).toEqual({ count: 3, reach: 60 });
  });
});

describe('A5 turret tables', () => {
  for (const age of Object.keys(TURRETS) as AgeId[]) {
    for (const [slug, name, rar, cost, dmg, int10, range, hits] of TURRETS[age]) {
      it(`${age}: ${slug}`, () => {
        const t = content.turrets[slug];
        expect(t, slug).toBeDefined();
        expect(t?.age).toBe(age);
        expect(t?.rarity).toBe(R[rar]);
        expect(t?.cost).toBe(cost);
        expect(t?.attack.damage).toBe(dmg);
        expect(t?.attack.intervalMs).toBe(int10 * 100);
        expect(t?.attack.range).toBe(range);
        expect(hitsOf(t?.attack)).toBe(hits);
        expect(en.card[slug]?.name).toBe(name);
      });
    }
  }

  it('lists all 20 turrets and the listed notes', () => {
    expect(Object.values(TURRETS).flat()).toHaveLength(20);
    expect(Object.keys(content.turrets)).toHaveLength(20);
    expect(content.turrets.log_roller?.attack).toMatchObject({ line: { fromGate: 300 }, maxTargets: 6 });
    expect(content.turrets.pitch_cauldron?.attack.gateZone).toEqual({ radius: 130 });
    expect(content.turrets.trebuchet?.attack).toMatchObject({ splashRadius: 50, minRange: 150 });
    expect(content.turrets.honk_ballista?.attack).toMatchObject({ chain: { count: 3, hop: 80 }, onHit: [{ kind: 'slow', magnitudeBp: 3000, durationMs: 2000 }] });
    expect(content.turrets.grapeshot_gun?.attack).toMatchObject({ followBehind: 90, maxTargets: 4 });
    expect(content.turrets.congreve_rack?.attack).toMatchObject({ volley: 4, splashRadius: 30, scatter: 40, mods: [{ vs: 'air', bp: 15000 }] });
    expect(content.turrets.chainshot_cannon?.attack.pierce).toEqual({ count: 4, length: 200 });
    expect(content.turrets.flak_gun?.attack).toMatchObject({ splashRadius: 40, mods: [{ vs: 'air', bp: 20000 }], priority: 'air' });
    expect(content.turrets.searchlight_sniper?.attack.onHit).toEqual([{ kind: 'mark', magnitudeBp: 2000, durationMs: 4000 }]);
    expect(content.turrets.arc_coil?.attack.chain).toEqual({ count: 3, hop: 100 });
    expect(content.turrets.gravity_well?.attack).toMatchObject({ priority: 'densest', splashRadius: 90, maxTargets: 4, pull: { radius: 90, fractionBp: 6000 } });
  });
});

/**
 * A14.2 per-card attack mapping: [card, projectile visual / instant effect / 'melee', attack SFX, damage type].
 * Secondary attacks follow the primary in the order `attacks[1..]`, then riders. The Repair Drone has no attack.
 */
type FxRow = [string, string, string, AttackDef['dmgType']];

const A14_2: Record<string, FxRow[]> = {
  bonker: [['bonker', 'melee', 'swing_whoosh', 'blunt']],
  pebbler: [['pebbler', 'proj.rock', 'shot_sling', 'blunt']],
  tuskback: [['tuskback', 'melee', 'swing_whoosh', 'blunt']],
  spear_hunter: [['spear_hunter', 'melee', 'swing_whoosh', 'pierce']],
  drum_shaman: [['drum_shaman', 'proj.rock', 'shot_sling', 'blunt']],
  sabertooth: [['sabertooth', 'melee', 'swing_whoosh', 'slash']],
  mammoth_matriarch: [['mammoth_matriarch', 'melee', 'swing_whoosh', 'blast'], ['riders', 'proj.rock', 'shot_sling', 'blunt']],
  footman: [['footman', 'melee', 'swing_whoosh', 'slash']],
  longbowman: [['longbowman', 'proj.arrow', 'shot_bow', 'pierce']],
  destrier_knight: [['destrier_knight', 'melee', 'swing_whoosh', 'pierce']],
  pikeman: [['pikeman', 'melee', 'swing_whoosh', 'pierce']],
  friar: [['friar', 'proj.rock', 'shot_sling', 'blunt']],
  battering_ram: [['battering_ram', 'melee', 'swing_whoosh', 'blast']],
  ursa_paladin: [['ursa_paladin', 'melee', 'swing_whoosh', 'slash']],
  corsair: [['corsair', 'melee', 'swing_whoosh', 'slash']],
  fusilier: [['fusilier', 'proj.musket', 'shot_musket', 'bullet']],
  cuirassier: [['cuirassier', 'melee', 'swing_whoosh', 'slash']],
  grenadier: [['grenadier', 'proj.lob', 'shot_lob', 'blast']],
  field_surgeon: [['field_surgeon', 'proj.musket', 'shot_musket', 'bullet']],
  bronze_cannon: [['bronze_cannon', 'proj.cannonball', 'shot_cannon', 'blast']],
  balloon_admiral: [['balloon_admiral', 'proj.bomb', 'bomb_whistle', 'blast']],
  trench_raider: [['trench_raider', 'melee', 'swing_whoosh', 'slash']],
  rifleman: [['rifleman', 'proj.bullet', 'shot_rifle', 'bullet']],
  tankette: [['tankette', 'proj.shell', 'shot_cannon', 'blast']],
  bazooka_trooper: [['bazooka_trooper', 'proj.rocket', 'shot_rocket', 'blast']],
  radio_operator: [['radio_operator', 'proj.bullet', 'shot_rifle', 'bullet']],
  gyrocopter: [['gyrocopter', 'proj.bullet', 'shot_mg', 'bullet']],
  behemoth_tank: [['main gun', 'proj.shell', 'shot_cannon', 'blast'], ['MG', 'proj.bullet', 'shot_mg', 'bullet']],
  photon_knight: [['photon_knight', 'melee', 'swing_whoosh', 'laser']],
  pulse_trooper: [['pulse_trooper', 'proj.plasma', 'shot_plasma', 'laser']],
  walker_mech: [['walker_mech', 'melee', 'swing_whoosh', 'blunt']],
  rail_gunner: [['rail_gunner', 'fx.beam_rail', 'shot_rail', 'laser']],
  repair_drone: [],
  emp_saboteur: [['emp_saboteur', 'melee', 'swing_whoosh', 'laser']],
  chrono_titan: [['chrono_titan', 'melee', 'swing_whoosh', 'blunt']],
  training_dummy: [['training_dummy', 'melee', 'swing_whoosh', 'blunt']],
  rock_tosser: [['rock_tosser', 'proj.boulder', 'shot_catapult', 'blunt']],
  angry_beehive: [['angry_beehive', 'proj.bee', 'bee_buzz', 'pierce']],
  log_roller: [['log_roller', 'proj.log', 'log_roll', 'blunt']],
  grumpy_toad: [['grumpy_toad', 'fx.tongue', 'toad_tongue', 'blunt']],
  crossbow_nest: [['crossbow_nest', 'proj.bolt', 'shot_crossbow', 'pierce']],
  pitch_cauldron: [['pitch_cauldron', 'fx.pitch_pour', 'cauldron_pour', 'blast']],
  trebuchet: [['trebuchet', 'proj.boulder', 'shot_catapult', 'blast']],
  honk_ballista: [['honk_ballista', 'proj.goose', 'goose_honk', 'blunt']],
  swivel_gun: [['swivel_gun', 'proj.musket', 'shot_musket', 'bullet']],
  grapeshot_gun: [['grapeshot_gun', 'proj.grapeshot', 'shot_grapeshot', 'bullet']],
  congreve_rack: [['congreve_rack', 'proj.rocket', 'shot_rocket', 'blast']],
  chainshot_cannon: [['chainshot_cannon', 'proj.chainshot', 'shot_cannon', 'blunt']],
  mg_nest: [['mg_nest', 'proj.bullet', 'shot_mg', 'bullet']],
  flak_gun: [['flak_gun', 'proj.flak', 'shot_flak', 'blast']],
  howitzer: [['howitzer', 'proj.shell', 'shot_cannon', 'blast']],
  searchlight_sniper: [['searchlight_sniper', 'proj.bullet', 'shot_rifle', 'bullet']],
  pulse_laser: [['pulse_laser', 'fx.beam_laser', 'shot_laser', 'laser']],
  arc_coil: [['arc_coil', 'fx.arc_chain', 'shot_arc', 'laser']],
  plasma_mortar: [['plasma_mortar', 'proj.plasma_mortar', 'shot_plasma', 'blast']],
  gravity_well: [['gravity_well', 'proj.gravity_orb', 'gravity_hum', 'blast']],
};

/** Every attack of a card, primary first, then secondary attacks, then riders. */
function attacksOf(id: string): AttackDef[] {
  const u = content.units[id];
  if (u) {
    const riders = u.abilities.flatMap((a) => (a.kind === 'riders' ? [a.attack] : []));
    return [...u.attacks, ...riders];
  }
  const t = content.turrets[id];
  return t ? [t.attack] : [];
}

function fxOf(a: AttackDef): string {
  if (!a.projectile) return 'melee';
  return 'instant' in a.projectile ? a.projectile.effectId : a.projectile.visualId;
}

/** A2.6 role-default mods, in order (bp). */
const MODS = {
  blunt: [{ vs: 'armored', bp: 7000 }],
  meleeAA: [{ vs: 'armored', bp: 20000 }, { vs: 'mech', bp: 20000 }, { vs: 'light', bp: 7500 }],
  rangedAA: [{ vs: 'armored', bp: 20000 }, { vs: 'mech', bp: 20000 }, { vs: 'light', bp: 5000 }],
  grenadier: [{ vs: 'armored', bp: 15000 }, { vs: 'mech', bp: 15000 }, { vs: 'light', bp: 5000 }],
  flak: [{ vs: 'air', bp: 20000 }],
  congreve: [{ vs: 'air', bp: 15000 }],
} as const;

/** A2.6: which cards carry which mods on their first attack. Everything else has none. */
const MODS_BY_CARD: Record<string, readonly { vs: string; bp: number }[]> = {
  // Infantry melee ("blunt"), including the tutorial dummy (an Infantry melee unit, A5.6)
  bonker: MODS.blunt, footman: MODS.blunt, corsair: MODS.blunt, trench_raider: MODS.blunt, photon_knight: MODS.blunt,
  training_dummy: MODS.blunt,
  spear_hunter: MODS.meleeAA, pikeman: MODS.meleeAA,
  bazooka_trooper: MODS.rangedAA, rail_gunner: MODS.rangedAA,
  grenadier: MODS.grenadier,
  flak_gun: MODS.flak,
  congreve_rack: MODS.congreve,
};

/** A5 target priorities of first attacks ("priority armored", "priority air", ...); everything else `front`. */
const PRIORITY_BY_CARD: Record<string, string> = {
  spear_hunter: 'armored', pikeman: 'armored', grenadier: 'armored', bazooka_trooper: 'armored', rail_gunner: 'armored',
  searchlight_sniper: 'armored', flak_gun: 'air', gravity_well: 'densest',
  // Grumpy Toad grabs "the nearest enemy ranged or support ground unit" first
  grumpy_toad: 'backline',
};

describe('A14.2 attack mapping, A2.6 mods and A5 priorities (every card)', () => {
  const cards = [...content.order.units, ...content.order.hiddenUnits, ...content.order.turrets];

  it('lists every unit and turret exactly once', () => {
    expect(Object.keys(A14_2).sort()).toEqual([...cards].sort());
  });

  for (const id of cards) {
    it(`${id}: projectile or effect, sound, damage type, mods and priority`, () => {
      const attacks = attacksOf(id);
      const rows = A14_2[id] ?? [];
      expect(attacks.map((a) => [fxOf(a), a.sfx, a.dmgType])).toEqual(rows.map(([, fx, sfx, dmg]) => [fx, sfx, dmg]));
      for (const a of attacks) {
        const fx = fxOf(a);
        // A5.1: lasers and rails are instant; `fx.*` ids are instant effects, `proj.*` ids fly.
        if (fx.startsWith('fx.')) expect(a.projectile, id).toMatchObject({ instant: true });
        if (fx.startsWith('proj.')) expect(a.projectile && 'speed' in a.projectile ? a.projectile.speed : 0, id).toBeGreaterThan(0);
      }
      const [first, ...rest] = attacks;
      if (!first) return;
      expect(first.mods ?? [], id).toEqual(MODS_BY_CARD[id] ?? []);
      expect(first.priority ?? 'front', id).toBe(PRIORITY_BY_CARD[id] ?? 'front');
      // Secondary attacks (the Behemoth MG, the Matriarch's riders) carry no mods.
      for (const a of rest) expect(a.mods ?? [], id).toEqual([]);
    });
  }

  it('encodes the remaining A5 notes: arcs, splash, minimum ranges, charges, base damage', () => {
    const arc = (id: string, i = 0) => {
      const p = attacksOf(id)[i]?.projectile;
      return p !== undefined && 'speed' in p && p.arc === true;
    };
    // "Arc" in A5, and the Grenadier's lob over allies
    for (const id of ['rock_tosser', 'trebuchet', 'bronze_cannon', 'howitzer', 'plasma_mortar', 'grenadier']) expect(arc(id), id).toBe(true);
    for (const id of ['pebbler', 'longbowman', 'fusilier', 'rifleman', 'tankette', 'mg_nest', 'crossbow_nest']) expect(arc(id), id).toBe(false);
    expect(content.units.mammoth_matriarch?.attacks[0]?.splashRadius).toBe(40);
    expect(content.units.behemoth_tank?.attacks[0]).toMatchObject({ splashRadius: 40, range: 240, hitsGround: true, hitsAir: false });
    expect(content.units.balloon_admiral?.attacks[0]).toMatchObject({ splashRadius: 50, vsBaseDamage: 110 });
    expect(content.units.balloon_admiral?.abilities).toContainEqual({ kind: 'bomber', dropWindow: 40 });
    expect(content.units.battering_ram?.abilities).toContainEqual({ kind: 'siegeOnly' });
    expect(content.turrets.howitzer?.attack).toMatchObject({ splashRadius: 60, minRange: 180 });
    expect(content.turrets.plasma_mortar?.attack).toMatchObject({ splashRadius: 60, minRange: 180 });
    expect(content.turrets.grumpy_toad?.attack.drag).toEqual({ distance: 120 });
    expect(content.turrets.gravity_well?.attack.onHit).toEqual([{ kind: 'slow', magnitudeBp: 5000, durationMs: 2500 }]);
    // Heavy commons' first-hit charges (Gore, Lance charge, Charge): ×2 and 30 lu knockback
    for (const id of ['tuskback', 'destrier_knight', 'cuirassier']) {
      expect(content.units[id]?.abilities, id).toContainEqual({ kind: 'firstHitBonus', multBp: 20000, knockback: 30, idleResetMs: 2000 });
    }
    // followSupport on every Support Rare (A5)
    for (const id of ['drum_shaman', 'friar', 'field_surgeon', 'radio_operator', 'repair_drone']) {
      expect(content.units[id]?.abilities, id).toContainEqual({ kind: 'followSupport', behindFront: 60, soloMaxP: 200 });
    }
  });
});

describe('A2.7 / A2.8 price rules', () => {
  it('pop follows cost in 25-gold steps (A2.7)', () => {
    for (const id of [...content.order.units, ...content.order.hiddenUnits]) {
      const u = content.units[id];
      expect(u?.pop, id).toBe(Math.floor((u?.cost ?? 0) / 25));
    }
  });

  it('turrets cost 150 / 175 for the two Commons, 250 for the Rare and the Epic (A2.8)', () => {
    for (const age of content.order.ages) {
      const ts = content.order.turrets.map((id) => content.turrets[id]).filter((t) => t?.age === age);
      expect(ts.map((t) => [t?.rarity, t?.cost]), age).toEqual([['common', 150], ['common', 175], ['rare', 250], ['epic', 250]]);
    }
  });
});

describe('A5.7 Age Powers', () => {
  for (const [slug, name, age, slot, effect] of POWERS) {
    it(`${age}: ${slug}`, () => {
      const p = content.powers[slug];
      expect(p, slug).toBeDefined();
      expect(p?.age).toBe(age);
      expect(p?.slot).toBe(slot);
      expect(p?.telegraphMs).toBe(1000);
      expect(p?.effect).toMatchObject(effect);
      expect(en.card[slug]?.name).toBe(name);
    });
  }

  it('encodes the buffs', () => {
    expect(content.powers.royal_decree?.effect).toEqual({
      kind: 'buffAll',
      statuses: [
        { kind: 'damageBuff', magnitudeBp: 3000, durationMs: 8000 },
        { kind: 'speedBuff', magnitudeBp: 2500, durationMs: 8000 },
      ],
    });
    // All your units get a regen of 40% of max HP over 4 s and a 150 shield for 6 s
    expect(content.powers.nanite_surge?.effect).toEqual({
      kind: 'buffAll',
      statuses: [
        { kind: 'regen', magnitudeBp: 4000, durationMs: 4000 },
        { kind: 'shield', magnitudeBp: 0, durationMs: 6000, amount: 150 },
      ],
    });
    // Orbital Lance: "dealing 450 once to each enemy it touches (±20 lu)"
    expect(content.powers.orbital_lance?.effect).toMatchObject({ width: 40 });
    expect(Object.keys(content.powers)).toHaveLength(10);
  });

  /**
   * A5.7 "Per unit" column: the coverage estimate of A2.9 (count × 2 × radius / zone hits per unit, or
   * the per-enemy hit cap) against the age's L1 Infantry and Heavy commons, in whole percent.
   * The Photon Knight's innate shield counts as HP.
   */
  it('reproduces the "Per unit" column from the tables (A2.9 coverage)', () => {
    const PER_UNIT: [string, string, string, number, number][] = [
      ['stampede', 'bonker', 'tuskback', 94, 27],
      ['meteor_shower', 'bonker', 'tuskback', 88, 25],
      ['arrow_storm', 'footman', 'destrier_knight', 66, 19],
      ['broadside', 'corsair', 'cuirassier', 82, 24],
      ['carpet_bomber', 'trench_raider', 'tankette', 91, 26],
      ['orbital_lance', 'photon_knight', 'walker_mech', 80, 24],
    ];
    const ehp = (id: string): number => {
      const u = content.units[id];
      const shield = u?.abilities.find((a) => a.kind === 'innateShield');
      return (u?.hp ?? 0) + (shield?.kind === 'innateShield' ? shield.amount : 0);
    };
    for (const [power, light, heavy, lightPct, heavyPct] of PER_UNIT) {
      const e = content.powers[power]?.effect;
      let perUnit = 0;
      if (e?.kind === 'barrage') perUnit = (e.damage * e.count * 2 * e.radius) / e.zone;
      else if (e?.kind === 'stampede') perUnit = e.damage * e.maxHitsPerEnemy;
      else if (e?.kind === 'sweep') perUnit = e.damage;
      expect(Math.round((perUnit * 100) / ehp(light)), `${power} vs ${light}`).toBe(lightPct);
      expect(Math.round((perUnit * 100) / ehp(heavy)), `${power} vs ${heavy}`).toBe(heavyPct);
      // A2.9 tuning target: 60-100% of the Light unit, 15-35% of the Heavy common.
      expect(lightPct).toBeGreaterThanOrEqual(60);
      expect(lightPct).toBeLessThanOrEqual(100);
      expect(heavyPct).toBeGreaterThanOrEqual(15);
      expect(heavyPct).toBeLessThanOrEqual(35);
    }
  });
});
