/**
 * The content compiler (DESIGN B4 Compilation, C2/WP1 DoD: "A snapshot test of contentHash").
 */
import { describe, expect, it } from 'vitest';
import type { CompiledContent } from '@/contracts/content';
import { fakeContent } from '@/contracts/fakes/content';
import { raw as fixtureRaw } from '../../../tests/fixtures/content';
import { compileContent, contentHash } from '../compile';
import { asContent, content, counterFile, metaTables } from '../index';
import { raw } from '../raw';
import { skinList } from '../skins';
import type { Content } from '../types';
import { cloneData } from '../util';

function compileWith(mutate: (r: typeof raw) => void = () => {}): Content {
  const r = cloneData(raw);
  mutate(r);
  return compileContent({ raw: r, meta: metaTables, skins: skinList, counters: counterFile });
}

describe('contentHash (B4, B3 replays)', () => {
  it('matches the snapshot (update only when battle content changes on purpose)', () => {
    // A changed hash marks every stored replay as "from an older version" (B3). If you tuned a
    // battle number on purpose, update this value and note it in docs/balance-log.md.
    // A16.14 (SIM_VERSION 5.0.0): forts, their twins and levies, `economy.fort`, the structure mods and
    // Engineers' scaffold effect joined the hashed slice. Fort tuning (review fixes 2026-10-01): 1 fort up,
    // camps every 10 s with 1 levy at 30%, traps 100 gold with fewer splash charges. SIM_VERSION 6.0.0
    // (A2.10.1): the `last` and `last.bronze` formats with Siege steps and `economy.siege.ropeDeadBandLu`.
    // Last Base Standing tuned at gate size (fixer review 2026-10-01): Siege II-III ×3.5/×5, turrets 30%/20%,
    // Crumble from 23:00 at 1%/s, Crumble II 1.5%/s, endByMs 25:44. MVP balance pass (2026-10-01): the power
    // trim, base HP 8,000 × P, the falling gate at 300 lu, seven Legendaries and fourteen War Path / Road powers.
    expect(content.hash).toBe('d20e8eb9');
  });

  it('compiles the frozen fixture tables to a stable hash (golden replays use it, B13)', () => {
    // The fixture never changes, so this value stays fixed even after a balance change updates the
    // snapshot above. It changes only if the hash algorithm or the hashed slice changes, which
    // invalidates every golden replay.
    // Re-baselined deliberately with the SIM_VERSION 5.0.0 golden re-record (the fixture gained forts).
    const FIXTURE_HASH = '91261668';
    const fixture = compileContent({ raw: fixtureRaw, meta: metaTables, skins: skinList, counters: counterFile });
    expect(fixture.hash).toBe(FIXTURE_HASH);
  });

  it('is 8 lowercase hex digits and recomputes from the body', () => {
    expect(content.hash).toMatch(/^[0-9a-f]{8}$/);
    expect(contentHash(content)).toBe(content.hash);
  });

  it('changes when a battle number changes', () => {
    const c = compileWith((r) => {
      (r.ages[0]?.units[0] as { hp: number }).hp += 1;
    });
    expect(c.hash).not.toBe(content.hash);
    const e = compileWith((r) => {
      r.economy.startGold += 1;
    });
    expect(e.hash).not.toBe(content.hash);
  });

  it('ignores presentation: visual ids, sounds and string keys never invalidate replays', () => {
    const c = compileWith((r) => {
      const u = r.ages[0]?.units[0] as { visualId: string; nameKey: string; sfx: { spawn: string } };
      u.visualId = 'unit.something_else';
      u.nameKey = 'card.other.name';
      u.sfx.spawn = 'spawn_other';
    });
    expect(c.hash).toBe(content.hash);
  });

  it('is independent of object key order', () => {
    const c = compileWith((r) => {
      const e = r.economy as unknown as Record<string, unknown>;
      const reversed = Object.fromEntries(Object.entries(e).reverse());
      for (const k of Object.keys(e)) delete e[k];
      Object.assign(e, reversed);
    });
    expect(c.hash).toBe(content.hash);
  });
});

describe('compiled bundle (B4)', () => {
  it('is deeply frozen', () => {
    expect(Object.isFrozen(content)).toBe(true);
    expect(Object.isFrozen(content.units.bonker)).toBe(true);
    expect(Object.isFrozen(content.units.bonker?.attacks[0])).toBe(true);
    expect(Object.isFrozen(content.capsules.tiers.aeon.guaranteed)).toBe(true);
    expect(() => {
      (content.economy as { startGold: number }).startGold = 1;
    }).toThrow();
  });

  it('never aliases or mutates the raw tables', () => {
    expect(Object.isFrozen(raw.economy)).toBe(false);
    expect(content.units.bonker).not.toBe(raw.ages[0]?.units[0]);
    expect(raw.ages[0]?.units[0]?.strongVs).toEqual([]);
  });

  it('is a CompiledContent (B15) with the typed slots filled', () => {
    const asContract: CompiledContent = content;
    expect(asContract.rarities).toBe(content.rarities);
    for (const k of ['rarities', 'capsules', 'arenas', 'trophyRoad', 'generals', 'names', 'quests', 'dailyModifiers', 'cosmetics'] as const) {
      expect(content[k], k).toBeTruthy();
    }
  });

  it('lists the collectable units in DESIGN order (56 plus the X0 waves), then hidden ones apart', () => {
    const shape = Object.values(content.rosterShape);
    expect(content.order.units).toHaveLength(shape.reduce((n, s) => n + s.units.common + s.units.rare + s.units.epic + s.units.legendary, 0));
    // Each age's original seven in DESIGN order, then its X0 wave cards; ages in order.
    const byAge = (age: string) => content.order.units.filter((id) => content.units[id]?.age === age);
    expect(byAge('stone').slice(0, 7)).toEqual(['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman', 'sabertooth', 'mammoth_matriarch']);
    expect(byAge('bronze').slice(0, 7)).toEqual(['hoplite', 'javelineer', 'war_chariot', 'phalangite', 'standard_bearer', 'scorpion', 'bronze_colossus']);
    const ageIdx = content.order.units.map((id) => content.order.ages.indexOf(content.units[id]?.age ?? 'stone'));
    expect(ageIdx.every((a, i) => i === 0 || a >= (ageIdx[i - 1] ?? 0))).toBe(true);
    // The Training Dummy, then the summoners' summons (X0 M3).
    expect(content.order.hiddenUnits[0]).toBe('training_dummy');
    expect(content.order.hiddenUnits.slice(1).every((id) => content.units[id]?.summon === true)).toBe(true);
    expect(content.order.turrets).toHaveLength(Object.values(content.rosterShape).reduce((n, s) => n + s.turrets.common + s.turrets.rare + s.turrets.epic, 0));
    expect(content.order.ages).toEqual(['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic']);
    // A2.9.11: by age; starters first (Home, Field), then Home and Field by source (Road, War Path by level)
    expect(content.order.powers).toEqual([
      'rockslide', 'stampede', 'meteor_shower', 'sticky_tar', 'tangle_vines', 'pebble_hail', 'hunt_cry', 'hunters_spear',
      'tidal_wave', 'chariot_rush', 'zeus_bolts', 'medusa_gaze', 'aegis', 'apollo_arrow',
      'arrow_storm', 'knights_charge', 'caltrops', 'boiling_oil', 'royal_decree', 'undermine',
      'volley_fire', 'smoke_screen', 'broadside', 'boarding_nets', 'horse_artillery', 'sharpshooter',
      'gun_line', 'iron_horse', 'zeppelin_raid', 'barbed_wire', 'railway_gun', 'field_hospital',
      'strafing_run', 'paratroopers', 'carpet_bomber', 'aa_screen', 'tank_rush', 'sniper_team',
      'orbital_lance', 'drone_swarm', 'point_defense', 'stasis_field', 'nanite_surge', 'emp_blackout',
      'starfall', 'comet_run', 'singularity', 'solar_flare', 'warp_strike', 'ion_cannon',
    ]);
    expect(content.order.formats).toEqual(['tutorial', 'short', 'standard', 'full', 'last']);
  });

  it('adds palette, visual and music ids to the ages (A14.1, A14.3)', () => {
    expect(content.ages.gunpowder).toEqual({
      id: 'gunpowder', index: 3, pBp: 18200, baseHp: 14560, xpToNext: 700,
      paletteId: 'palette.gunpowder', baseVisualId: 'base.gunpowder', backdropVisualId: 'backdrop.gunpowder',
      musicCue: 'music.gunpowder',
    });
    expect(content.ages.future.xpToNext).toBe(1300);
    expect(content.ages.cosmic.xpToNext).toBeNull();
  });

  it('derives pop and train time from the role group (A2.7)', () => {
    const c = compileWith((r) => {
      const u = r.ages[0]?.units[0] as { pop: number; trainMs: number };
      u.pop = 99;
      u.trainMs = 99;
    });
    expect(c.units.bonker?.pop).toBe(2);
    expect(c.units.bonker?.trainMs).toBe(1500);
    expect(content.units.chrono_titan?.pop).toBe(14);
    expect(content.units.chrono_titan?.trainMs).toBe(7000);
  });

  it('throws on a duplicate card id', () => {
    expect(() =>
      compileWith((r) => {
        (r.ages[1]?.units[0] as { id: string }).id = 'bonker';
      }),
    ).toThrow(/Duplicate unit id "bonker"/);
    expect(() =>
      compileWith((r) => {
        (r.ages[0]?.turrets[0] as { id: string }).id = 'bonker';
      }),
    ).toThrow(/more than one card/);
  });
});

describe('ticks (B3: max(1, round(ms / 50)))', () => {
  it('precompiles every global duration', () => {
    expect(content.ticks).toEqual({
      ascend: 50,
      turretBuild: 20,
      turretSell: 20,
      stanceCooldown: 60,
      retarget: 20,
      healPulse: 10,
      firstHitIdle: 80,
      lastStandCharge: 20,
    });
  });
});

describe('integer view (B3 units)', () => {
  it('converts a unit to centi-HP, milli-lu per tick, ticks and milli-gold', () => {
    expect(content.int.units.bonker).toEqual({
      hp: 16000,
      speed: 3500,
      width: 24000,
      trainTicks: 30,
      pop: 2,
      cost: 50000,
      // A18.3.2-A18.3.3: 50% gold, 70% XP to the killer; 50% XP to the owner; 30% gold for power kills
      bounty: { gold: 25000, xp: 35000, lossXp: 25000, powerGold: 15000 },
      attacks: [
        { damage: 2000, vsBaseDamage: null, intervalTicks: 20, windupTicks: 8, range: 16000, minRange: 0, projectileSpeed: null, instant: false },
      ],
    });
  });

  it('converts projectiles, instant attacks, minimum ranges and base damage', () => {
    expect(content.int.units.pebbler?.attacks[0]).toMatchObject({ projectileSpeed: 25000, windupTicks: 14, intervalTicks: 28 });
    expect(content.int.units.rail_gunner?.attacks[0]).toMatchObject({ projectileSpeed: null, instant: true });
    expect(content.int.units.battering_ram?.attacks[0]).toMatchObject({ damage: 1000, vsBaseDamage: 16000 });
    expect(content.int.units.bronze_cannon?.attacks[0]).toMatchObject({ minRange: 80000, range: 280000 });
    expect(content.int.turrets.trebuchet).toEqual({
      cost: 250000,
      sellRefund: 125000,
      attack: { damage: 11000, vsBaseDamage: null, intervalTicks: 90, windupTicks: 0, range: 480000, minRange: 150000, projectileSpeed: 22500, instant: false },
    });
  });

  it('converts base HP and XP thresholds (A17.8)', () => {
    expect(content.int.baseHp).toEqual({
      stone: 800000, bronze: 928000, medieval: 1080000, gunpowder: 1456000, industrial: 1696000, modern: 1968000, future: 2656000, cosmic: 3584000,
    });
    expect(content.int.xpToNext).toEqual({
      stone: 550000, bronze: 500000, medieval: 900000, gunpowder: 700000, industrial: 800000, modern: 1200000, future: 1300000, cosmic: null,
    });
  });

  it('has only safe integers', () => {
    const walk = (v: unknown, path: string): void => {
      if (typeof v === 'number') expect(Number.isSafeInteger(v), path).toBe(true);
      else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    walk(content.int, 'int');
  });
});

describe('counters and hints (B4)', () => {
  it('exposes M in [0, 1] for every collectable pair, with M[a][b] + M[b][a] = 1', () => {
    for (const a of content.order.units) {
      for (const b of content.order.units) {
        const m = content.counters[a]?.[b];
        expect(m, `${a} vs ${b}`).toBeGreaterThanOrEqual(0);
        expect(m, `${a} vs ${b}`).toBeLessThanOrEqual(1);
        expect(Math.round(((m ?? 0) + (content.counters[b]?.[a] ?? 0)) * 10000), `${a}/${b}`).toBe(10000);
      }
      expect(content.counters[a]?.[a]).toBe(0.5);
    }
    expect(content.counters.training_dummy).toBeUndefined();
  });

  it('fills strongVs and weakVs from same or adjacent ages only, at most 3 each', () => {
    for (const id of content.order.units) {
      const u = content.units[id];
      if (!u) throw new Error(id);
      expect(u.strongVs.length).toBeLessThanOrEqual(3);
      expect(u.weakVs.length).toBeLessThanOrEqual(3);
      for (const x of [...u.strongVs, ...u.weakVs]) {
        const other = content.units[x];
        expect(other, x).toBeDefined();
        expect(Math.abs(content.ages[other?.age ?? 'stone'].index - content.ages[u.age].index)).toBeLessThanOrEqual(1);
      }
      for (const x of u.strongVs) expect(content.counters[id]?.[x]).toBeGreaterThan(0.5);
      for (const x of u.weakVs) expect(content.counters[id]?.[x]).toBeLessThan(0.5);
    }
    expect(content.units.training_dummy?.strongVs).toEqual([]);
  });
});

describe('asContent', () => {
  it('passes the real content through and rejects the fakes', () => {
    expect(asContent(content)).toBe(content);
    expect(() => asContent(fakeContent)).toThrow(/fake content/);
  });
});
