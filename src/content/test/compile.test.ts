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
    expect(content.hash).toBe('d59c0909');
  });

  it('compiles the frozen fixture tables to a stable hash (golden replays use it, B13)', () => {
    // The fixture never changes, so this value stays fixed even after a balance change updates the
    // snapshot above. It changes only if the hash algorithm or the hashed slice changes, which
    // invalidates every golden replay.
    const FIXTURE_HASH = '53d42a0d';
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

  it('lists 56 collectable units in DESIGN order, then hidden ones apart', () => {
    expect(content.order.units).toHaveLength(56);
    expect(content.order.units.slice(0, 14)).toEqual([
      'bonker', 'pebbler', 'tuskback', 'spear_hunter', 'drum_shaman', 'sabertooth', 'mammoth_matriarch',
      'hoplite', 'javelineer', 'war_chariot', 'phalangite', 'standard_bearer', 'scorpion', 'bronze_colossus',
    ]);
    expect(content.order.hiddenUnits).toEqual(['training_dummy']);
    expect(content.order.turrets).toHaveLength(32);
    expect(content.order.ages).toEqual(['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic']);
    expect(content.order.powers).toEqual([
      'stampede', 'meteor_shower', 'tidal_wave', 'aegis', 'arrow_storm', 'royal_decree', 'smoke_screen', 'broadside',
      'iron_horse', 'zeppelin_raid', 'paratroopers', 'carpet_bomber', 'orbital_lance', 'nanite_surge', 'starfall', 'warp_strike',
    ]);
    expect(content.order.formats).toEqual(['tutorial', 'short', 'standard', 'full']);
  });

  it('adds palette, visual and music ids to the ages (A14.1, A14.3)', () => {
    expect(content.ages.gunpowder).toEqual({
      id: 'gunpowder', index: 3, pBp: 18200, baseHp: 18200, xpToNext: 700,
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
      powerCharge: 1000,
      turretBuild: 20,
      turretSell: 20,
      stanceCooldown: 40,
      retarget: 20,
      healPulse: 10,
      firstHitIdle: 40,
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
      // A2.3 / A2.4: 60% gold, 100% XP to the killer; 40% XP to the owner; 30% gold for power kills
      bounty: { gold: 30000, xp: 50000, lossXp: 20000, powerGold: 15000 },
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
      stone: 1000000, bronze: 1160000, medieval: 1350000, gunpowder: 1820000, industrial: 2120000, modern: 2460000, future: 3320000, cosmic: 4480000,
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
