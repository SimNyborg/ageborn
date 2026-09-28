/**
 * MMR, tier choice and opponent picking (DESIGN A6.8, A6.3 bot tiers and levels, A6.10, A7.1, A7.4,
 * A8, A9.1).
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, CardId, OpponentSpec, SaveDoc } from '@/contracts';
import { commanderInfo, ladderGenerals, newPlayerMistakeBonusBp } from '../matchmaking';
import { ELO_EXPECTED_BP, expectedScoreBp, ladderTier, tierRating, updateMmr } from '../mmr';
import { C, M, TestClock, fresh, ownsAll, scripted } from './helpers';

const L = C.arenas.ladder;

function ladderSave(arenaIndex: number, o: Partial<SaveDoc> = {}): SaveDoc {
  const s = scripted(3, arenaIndex);
  return { ...s, flags: { ...s.flags, 'meta.ladderPlayed': true }, ...o };
}

function cardsOf(o: OpponentSpec): CardId[] {
  return Object.values(o.side.loadouts).flatMap((l) => [...(l?.units ?? []), ...(l?.turrets ?? [])]).filter((c): c is CardId => c !== null);
}

function rarity(id: CardId): string {
  return (C.units[id] ?? C.turrets[id])!.rarity;
}

describe('MMR and tier (A6.8)', () => {
  it('the Elo table matches 1 / (1 + 10^(−d/400)) within 3 bp', () => {
    for (let d = -1200; d <= 1200; d += 7) {
      const exact = 10000 / (1 + Math.pow(10, -d / 400));
      if (Math.abs(d) <= 1000) expect(Math.abs(expectedScoreBp(d) - exact)).toBeLessThanOrEqual(3);
    }
    expect(ELO_EXPECTED_BP[0]).toBe(5000);
    expect(expectedScoreBp(0)).toBe(5000);
    expect(expectedScoreBp(100) + expectedScoreBp(-100)).toBe(10000);
  });

  it('K = 32, tier rating 800 + 100 × tier', () => {
    expect(tierRating(L, 0)).toBe(800);
    expect(tierRating(L, 10)).toBe(1800);
    expect(updateMmr(1000, 2, 'win', L)).toBe(1016);
    expect(updateMmr(1000, 2, 'loss', L)).toBe(984);
    expect(updateMmr(1000, 2, 'draw', L)).toBe(1000);
  });

  it('tier = clamp(round((MMR − 870) / 100), arena min, arena max)', () => {
    const a1 = C.arenas.list[0]!;
    const a8 = C.arenas.list[7]!;
    expect(ladderTier(1000, a1, L)).toBe(1);
    expect(ladderTier(1020, a1, L)).toBe(2);
    expect(ladderTier(1019, a1, L)).toBe(1);
    expect(ladderTier(600, a1, L)).toBe(0);
    expect(ladderTier(2000, a1, L)).toBe(2);
    expect(ladderTier(1000, a8, L)).toBe(8);
    expect(ladderTier(1870, a8, L)).toBe(10);
  });
});

describe('ladder opponents', () => {
  it('every opponent is labeled AI; Commanders carry the "AI · " prefix (A7.1, A7.4)', () => {
    for (let arena = 0; arena < 8; arena += 1) {
      for (let m = 0; m < 40; m += 1) {
        const o = M.pickOpponent(ladderSave(arena, { matchesPlayed: m }), 'ladder', C, new TestClock());
        expect(o.isAI).toBe(true);
        expect(o.side.isBot).toBe(true);
        if (commanderInfo(o.generalId)) expect(o.displayName.startsWith(C.names.aiPrefix)).toBe(true);
      }
    }
  });

  it('the first ladder match is Captain Kettle at tier I (A8 match 3)', () => {
    const s = scripted(1, 0);
    const o = M.pickOpponent(s, 'ladder', C, new TestClock());
    expect(o).toMatchObject({ generalId: 'kettle', tier: 1, format: 'short', level: 1 });
  });

  it('bot level follows the arena: Generals at the arena level, Commanders roll −1 / 0 / +1 at 25 / 50 / 25%', () => {
    for (let arena = 0; arena < 8; arena += 1) {
      const a = C.arenas.list[arena]!;
      const deltas = new Map<number, number>();
      for (let m = 0; m < 400; m += 1) {
        const o = M.pickOpponent(ladderSave(arena, { matchesPlayed: m }), 'ladder', C, new TestClock());
        expect(o.tier).toBeGreaterThanOrEqual(a.botTiers[0]);
        expect(o.tier).toBeLessThanOrEqual(o.generalId === 'warden' ? 10 : a.botTiers[1]);
        if (commanderInfo(o.generalId)) deltas.set(o.level - a.botLevel, (deltas.get(o.level - a.botLevel) ?? 0) + 1);
        else expect(o.level).toBe(a.botLevel);
        // Every non-Legendary card plays at the spec's level.
        for (const id of cardsOf(o)) if (rarity(id) !== 'legendary') expect(o.side.levels[id]).toBe(o.level);
      }
      if (arena > 0) {
        const n = [...deltas.values()].reduce((x, y) => x + y, 0);
        expect((deltas.get(0) ?? 0) / n).toBeGreaterThan(0.38);
        expect((deltas.get(-1) ?? 0) / n).toBeGreaterThan(0.15);
        expect((deltas.get(1) ?? 0) / n).toBeGreaterThan(0.15);
      }
    }
  });

  it('rarity allowance: Commons and Rares in Arena 1, Epics from Arena 2, no Legendary unless the player brings one', () => {
    for (let m = 0; m < 60; m += 1) {
      const a1 = M.pickOpponent(ladderSave(0, { matchesPlayed: m }), 'ladder', C, new TestClock());
      for (const id of cardsOf(a1)) expect(['common', 'rare']).toContain(rarity(id));
      const a3 = M.pickOpponent(ladderSave(2, { matchesPlayed: m }), 'ladder', C, new TestClock());
      for (const id of cardsOf(a3)) expect(rarity(id)).not.toBe('legendary');
      for (const age of Object.keys(a3.side.loadouts) as AgeId[]) {
        const l = a3.side.loadouts[age]!;
        expect(l.units.filter((u) => u !== null).length).toBeGreaterThanOrEqual(3);
        expect(l.turrets.filter((u) => u !== null).length).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it('with a Legendary in the player plan, the bot fields that age\'s Legendary at the player\'s level', () => {
    let s = ownsAll(ladderSave(2, { matchesPlayed: 5 }), 1);
    s = { ...s, collection: { ...s.collection, mammoth_matriarch: { level: 6, copies: 0, isNew: false, foil: 'none' } } };
    const plan = s.warPlans[0]!;
    const stone = plan.loadouts.stone;
    s = { ...s, warPlans: [{ ...plan, loadouts: { ...plan.loadouts, stone: { ...stone, units: [...stone.units.slice(0, 4), 'mammoth_matriarch'] } } }] };
    for (let m = 5; m < 25; m += 1) {
      const o = M.pickOpponent({ ...s, matchesPlayed: m }, 'ladder', C, new TestClock(), { format: 'short' });
      expect(o.side.loadouts.stone?.units).toContain('mammoth_matriarch');
      expect(o.side.levels['mammoth_matriarch']).toBe(6);
      expect(o.side.loadouts.medieval?.units).not.toContain('ursa_paladin');
    }
  });

  it('The Warden: 1 in 5 Arena 8 ladder matches, all five Legendaries at L9, disclosed (A7.4)', () => {
    let warden = 0;
    const n = 1000;
    for (let m = 0; m < n; m += 1) {
      const o = M.pickOpponent(ladderSave(7, { matchesPlayed: m }), 'ladder', C, new TestClock(), { format: 'full' });
      if (o.generalId !== 'warden') continue;
      warden += 1;
      expect(o.tier).toBe(10);
      expect(o.disclosures.filter((d) => d !== 'app.disclosure.rookie')).toEqual(C.generals.list.warden.disclosureKeys);
      const legs = cardsOf(o).filter((id) => rarity(id) === 'legendary');
      expect(legs).toHaveLength(5);
      for (const id of legs) expect(o.side.levels[id]).toBe(9);
    }
    expect(warden / n).toBeGreaterThan(0.16);
    expect(warden / n).toBeLessThan(0.24);
    for (let m = 0; m < 200; m += 1) expect(M.pickOpponent(ladderSave(6, { matchesPlayed: m }), 'ladder', C, new TestClock()).generalId).not.toBe('warden');
  });

  it('named Generals appear only inside their tier range; Commanders copy a ladder personality', () => {
    for (let tier = 0; tier <= 10; tier += 1) for (const g of ladderGenerals(C, tier)) expect(g.tiers![0] <= tier && tier <= g.tiers![1]).toBe(true);
    let named = 0;
    for (let m = 0; m < 500; m += 1) {
      const o = M.pickOpponent(ladderSave(3, { matchesPlayed: m }), 'ladder', C, new TestClock());
      const info = commanderInfo(o.generalId);
      if (info) {
        expect(C.generals.commanderPersonalities).toContain(info.personalityOf);
        if (info.favoriteCard) expect(cardsOf(o)).toContain(info.favoriteCard);
      } else named += 1;
    }
    expect(named / 500).toBeGreaterThan(0.2);
    expect(named / 500).toBeLessThan(0.4);
  });

  it('the format is one the arena offers; previewing and starting give the same spec', () => {
    const s = ladderSave(1, { matchesPlayed: 9 });
    expect(M.pickOpponent(s, 'ladder', C, new TestClock(), { format: 'full' }).format).toBe('short');
    expect(M.pickOpponent(s, 'ladder', C, new TestClock(), { format: 'standard' }).format).toBe('standard');
    expect(M.pickOpponent(s, 'ladder', C, new TestClock())).toEqual(M.pickOpponent(s, 'ladder', C, new TestClock(123)));
  });

  it('new players: +10 points of bot mistake rate in the first 20 matches', () => {
    expect(newPlayerMistakeBonusBp(fresh(), C)).toBe(1000);
    expect(newPlayerMistakeBonusBp({ ...fresh(), matchesPlayed: 19 }, C)).toBe(1000);
    expect(newPlayerMistakeBonusBp({ ...fresh(), matchesPlayed: 20 }, C)).toBe(0);
  });
});

describe('other modes', () => {
  it('tutorial: Old Grogg on the Tutorial format (Training match disclosed), then Pip at tier 0 (A8)', () => {
    const s = fresh();
    const m1 = M.pickOpponent(s, 'tutorial', C, new TestClock());
    expect(m1).toMatchObject({ generalId: 'grogg', format: 'tutorial', tier: 0, level: 1, isAI: true });
    expect(m1.disclosures).toEqual([...C.generals.list.grogg.disclosureKeys, 'app.disclosure.rookie']);
    expect(Object.keys(m1.side.loadouts)).toEqual(['stone']);
    const m2 = M.pickOpponent({ ...s, matchesPlayed: 1 }, 'tutorial', C, new TestClock());
    expect(m2).toMatchObject({ generalId: 'pip', format: 'short', tier: 0, level: 1 });
    for (const id of cardsOf(m2)) expect(['common', 'rare']).toContain(rarity(id));
  });

  it('Conquest: the board General at its fixed tier and level with its own plan, Full War', () => {
    const s = ladderSave(2);
    for (const b of C.generals.conquest.board) {
      const o = M.pickOpponent(s, 'conquest', C, new TestClock(), { conquestGeneral: b.general });
      expect(o).toMatchObject({ generalId: b.general, tier: b.tier, level: b.level, format: 'full' });
      expect(o.side.loadouts).toEqual(C.generals.list[b.general].warPlan);
    }
  });

  it('Skirmish: any General or Echo, the chosen tier and format; Standard levels puts every card at L7', () => {
    const s = ownsAll(ladderSave(1), 3);
    const std = M.pickOpponent(s, 'skirmish', C, new TestClock(), { skirmish: { generalId: 'warden', tier: 4, format: 'standard', standardLevels: true } });
    expect(std).toMatchObject({ generalId: 'warden', tier: 4, format: 'standard', level: 7 });
    for (const id of Object.keys(std.side.levels)) expect(std.side.levels[id]).toBe(7);
    const echo = M.pickOpponent(s, 'skirmish', C, new TestClock(), { skirmish: { generalId: 'echo', tier: 6, format: 'short', standardLevels: false } });
    expect(echo).toMatchObject({ generalId: 'echo', tier: 6, format: 'short', level: 3 });
    expect(echo.side.loadouts.stone).toEqual(s.warPlans[0]!.loadouts.stone);
    expect(Object.keys(echo.side.loadouts).sort()).toEqual(['gunpowder', 'medieval', 'stone']);
  });

  it('Skirmish discloses Echo of You as an AI playing your plan, and The Warden\'s Legendaries at Standard levels too (A7.1, A15.3, A6.8)', () => {
    const s = ownsAll(ladderSave(1), 3);
    const c = new TestClock();
    const echo = M.pickOpponent(s, 'skirmish', C, c, { skirmish: { generalId: 'echo', tier: 2, format: 'short', standardLevels: true } });
    expect(echo.disclosures).toContain('general.echo.disclosure');
    const own = M.pickOpponent(s, 'skirmish', C, c, { skirmish: { generalId: 'warden', tier: 4, format: 'standard', standardLevels: false } });
    expect(own.disclosures).toContain('general.warden.disclosure');
    const std = M.pickOpponent(s, 'skirmish', C, c, { skirmish: { generalId: 'warden', tier: 4, format: 'standard', standardLevels: true } });
    expect(std.disclosures).toContain('general.warden.disclosureStandard');
    expect(std.disclosures).not.toContain('general.warden.disclosure');
    const moss = M.pickOpponent(s, 'skirmish', C, c, { skirmish: { generalId: 'moss', tier: 4, format: 'standard', standardLevels: true } });
    expect(moss.disclosures.filter((d) => d.startsWith('general.'))).toEqual([]);
  });
});

describe('Rookie AI disclosure (A15.3)', () => {
  it('the first 20 matches of a save disclose the extra mistakes on VS; later ones do not', () => {
    const c = new TestClock();
    const s = scripted();
    for (const mode of ['ladder', 'daily', 'skirmish'] as const) {
      expect(M.pickOpponent({ ...s, matchesPlayed: 19 }, mode, C, c).disclosures).toContain('app.disclosure.rookie');
      expect(M.pickOpponent({ ...s, matchesPlayed: 20 }, mode, C, c).disclosures).not.toContain('app.disclosure.rookie');
    }
  });
});
