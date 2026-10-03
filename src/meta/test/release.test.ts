/**
 * The release gate in meta (docs/decisions.md, "Release gate for unfinished content"): no card with
 * `released: false` reaches a bot plan in any mode, a capsule or crate roll (every tier, Age, Sundial,
 * pity), a Trophy Road or War Path reward, the starter set or crafting; a save that holds one loads
 * without it. Released cards are unaffected.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, CardId, Loadout, OpponentSpec, SaveDoc, WarPathDifficulty } from '@/contracts';
import { isReleased } from '@/content';
import { PAUSED_WAVE_IDS } from '../../../tests/fixtures/pausedWave';
import { craft } from '../dust';
import { botMayUseFort, roadFortsOf, unlockFortSlot, warPathFortOf, warPathSideFortOf } from '../forts';
import { botMayUsePower, warPathPowerOf } from '../powers';
import { withoutUnreleased } from '../release';
import { META_FLAGS } from '../rules';
import { ageCards, isStarterCard, poolOf, starterPowers } from '../tables';
import { starterLoadout } from '../warplan';
import { C, M, clock, fresh, ownsAll, scripted } from './helpers';

const gated = (id: string | null | undefined): boolean => !!id && PAUSED_WAVE_IDS.has(id);
const ARENAS = C.arenas.list.length;

function planIds(loadouts: Partial<Record<AgeId, Loadout>>): string[] {
  return Object.values(loadouts).flatMap((l) => (l ? [...l.units, ...l.turrets, l.powers.home, l.powers.field, l.fort ?? null] : [])).filter((x): x is string => x !== null);
}

function badIn(spec: OpponentSpec): string[] {
  return planIds(spec.side.loadouts).filter(gated);
}

/** A save in arena `i` (0-based) at its gate, past the first ladder match and the Fort slot unlock. */
function inArena(i: number, seed: number, played = 0): SaveDoc {
  const s = scripted(seed, i);
  return { ...s, matchesPlayed: 5 + played, flags: { ...s.flags, [META_FLAGS.ladderPlayed]: true, [META_FLAGS.fortSlot]: true, [META_FLAGS.powerField]: true } };
}

describe('release gate: bots (A6.8, A7.4)', () => {
  it('no ladder opponent in any arena fields a held-back card (Generals and AI Commanders, every format)', () => {
    const bad: string[] = [];
    for (let i = 0; i < ARENAS; i += 1) {
      for (const format of C.arenas.list[i]!.ladderFormats) {
        for (let seed = 1; seed <= 25; seed += 1) {
          const spec = M.pickOpponent(inArena(i, seed, seed), 'ladder', C, clock(), { format });
          for (const id of badIn(spec)) bad.push(`arena ${i + 1} ${format} seed ${seed} ${spec.generalId}: ${id}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it('no Conquest, Skirmish, Daily, tutorial or War Path opponent fields one', () => {
    const s = ownsAll(inArena(7, 3), 9);
    const specs: OpponentSpec[] = [];
    for (const b of C.generals.conquest.board) specs.push(M.pickOpponent(s, 'conquest', C, clock(), { conquestGeneral: b.general }));
    for (const g of [...C.generals.order, 'echo']) {
      for (const format of ['short', 'standard', 'full'] as const) specs.push(M.pickOpponent(s, 'skirmish', C, clock(), { skirmish: { generalId: g, tier: 3, format, standardLevels: false } }));
    }
    for (let d = 0; d < 40; d += 1) specs.push(M.pickOpponent(s, 'daily', C, clock().advance(d * 86_400_000)));
    specs.push(M.pickOpponent(fresh(), 'tutorial', C, clock()), M.pickOpponent({ ...fresh(), matchesPlayed: 1 }, 'tutorial', C, clock()));
    for (const level of Object.keys(C.warPath.levels)) {
      for (const difficulty of ['easy', 'normal', 'hard'] as WarPathDifficulty[]) specs.push(M.pickOpponent(s, 'warPath', C, clock(), { warPath: { level, difficulty } }));
    }
    const bad = specs.flatMap((x) => badIn(x).map((id) => `${x.generalId}: ${id}`));
    expect(bad).toEqual([]);
    expect(specs.length).toBeGreaterThan(100);
  });

  it('a bot may never use a held-back power or fort, whatever the save', () => {
    const s = { ...ownsAll(inArena(7, 1)), trophies: { current: 5000, best: 5000, roadClaimed: [] } };
    for (const id of PAUSED_WAVE_IDS) {
      if (C.powers[id]) expect(botMayUsePower(C, s, id, ['stone']), id).toBe(false);
      if (C.forts[id]) expect(botMayUseFort(C, s, id, ['stone']), id).toBe(false);
    }
    expect(botMayUsePower(C, s, 'stampede')).toBe(true);
  });
});

describe('release gate: capsules, crates and crafting (A6.4, A6.5)', () => {
  it('no drop pool of any arena or age holds a held-back card', () => {
    for (let i = 0; i < ARENAS; i += 1) {
      const pool = poolOf(C, C.arenas.list[i]!.dropAges, i);
      expect(pool.cards.filter(gated), `arena ${i + 1}`).toEqual([]);
      for (const age of C.order.ages) expect(poolOf(C, [age], i).cards.filter(gated), `${age} @ ${i + 1}`).toEqual([]);
    }
    expect(poolOf(C, ['stone']).cards.filter(gated)).toEqual([]);
    expect(ageCards(C, 'stone').units.filter(gated)).toEqual([]);
    expect(ageCards(C, 'stone').turrets.filter(gated)).toEqual([]);
  });

  it('no capsule of any tier or kind rolls one, in any arena, across pity', () => {
    const c = clock();
    const bad: string[] = [];
    let opened = 0;
    for (let i = 0; i < ARENAS; i += 1) {
      let s = { ...inArena(i, 7 + i), currencies: { amber: 0, dust: 0 } };
      for (let n = 0; n < 60; n += 1) {
        const tier = C.capsules.tierOrder[n % C.capsules.tierOrder.length]!;
        const kind = (['win', 'road', 'age', 'meter', 'warPath'] as const)[n % 5]!;
        s = M.grantCapsule(s, kind, C, c, kind === 'age' ? { tier, age: C.order.ages[n % C.order.ages.length] } : { tier });
        const p = s.capsules.pending[s.capsules.pending.length - 1]!;
        for (const st of p.contents.stacks) if (gated(st.card)) bad.push(`arena ${i + 1} ${kind} ${tier}: ${st.card}`);
        if (gated(p.contents.skin)) bad.push(`arena ${i + 1} ${kind} ${tier}: skin ${p.contents.skin}`);
        s = M.openCapsule(s, p.id).save;
        opened += 1;
      }
      const owned = [...Object.keys(s.collection), ...s.skins.owned].filter(gated);
      if (owned.length > 0) bad.push(`arena ${i + 1} owns ${owned.join(', ')}`);
    }
    expect(bad).toEqual([]);
    expect(opened).toBe(ARENAS * 60);
  });

  it('no Wardrobe Crate rolls a held-back skin, through wardrobe pity', () => {
    const c = clock();
    let s = fresh(11);
    for (let n = 0; n < 120; n += 1) {
      s = M.grantWardrobe(s, 'road', C, c);
      const crate = s.capsules.wardrobe[0]!;
      expect(gated(crate.skin), crate.skin).toBe(false);
      s = M.openWardrobe(s, crate.id).save;
    }
    expect(s.skins.owned.filter(gated)).toEqual([]);
  });

  it('cannot craft a held-back card or skin, even in the last arena with Dust to spare', () => {
    const s = { ...inArena(ARENAS - 1, 1), currencies: { amber: 0, dust: 1_000_000 } };
    for (const id of PAUSED_WAVE_IDS) {
      if (C.powers[id] || C.forts[id]) continue;
      expect(craft(s, id, C), id).toEqual({ ok: false, reason: 'notCraftable' });
    }
    expect(craft(s, 'sabertooth', C).ok).toBe(true);
  });
});

describe('release gate: rewards and the starter set (A6.3, A18.7, A3)', () => {
  it('no Trophy Road node grants a held-back power or fort, claimed to 5,000 with the Fort slot open', () => {
    let s: SaveDoc = { ...inArena(ARENAS - 1, 2), trophies: { current: 5000, best: 5000, roadClaimed: [] } };
    for (const n of C.trophyRoad.nodes) {
      const r = M.claimRoadNode(s, n.trophies, C, clock());
      if (r.ok) s = r.value;
    }
    expect([...s.powersOwned, ...s.fortsOwned, ...Object.keys(s.collection), ...s.skins.owned].filter(gated)).toEqual([]);
    for (const n of C.trophyRoad.nodes) expect(roadFortsOf(C, n.trophies).filter(gated), `${n.trophies}`).toEqual([]);
  });

  it('no War Path level, side node or star milestone grants one', () => {
    for (const age of C.order.ages) {
      for (let l = 1; l <= 12; l += 1) {
        expect(gated(warPathPowerOf(C, age, l)), `${age} L${l}`).toBe(false);
        expect(gated(warPathFortOf(C, age, l)), `${age} L${l}`).toBe(false);
      }
      for (const n of [1, 2] as const) {
        expect(warPathPowerOf(C, age, 0, n) === null || !gated(warPathPowerOf(C, age, 0, n))).toBe(true);
        expect(gated(warPathSideFortOf(C, age, n))).toBe(false);
      }
    }
    // Every level beaten with three stars: the save still holds no held-back card.
    const stars: Record<string, number> = {};
    for (const id of Object.keys(C.warPath.levels)) stars[id] = 3;
    let s: SaveDoc = { ...inArena(ARENAS - 1, 4), flags: { ...inArena(ARENAS - 1, 4).flags, [META_FLAGS.fortSlot]: false } };
    s = { ...s, warPath: { ...s.warPath, stars } };
    s = unlockFortSlot(s, C).save;
    expect(s.fortsOwned.filter(gated)).toEqual([]);
    for (const l of Object.values(C.warPath.levels)) expect(gated(l.reward.card), l.id).toBe(false);
  });

  it('the starter set, starter loadouts and a new save hold no held-back card', () => {
    const s = fresh(5);
    expect(Object.keys(s.collection).filter(gated)).toEqual([]);
    expect(s.powersOwned.filter(gated)).toEqual([]);
    expect(s.warPlans.flatMap((p) => planIds(p.loadouts)).filter(gated)).toEqual([]);
    for (const age of C.order.ages) {
      expect(planIds({ [age]: starterLoadout(C, age) }).filter(gated), age).toEqual([]);
      expect(Object.values(starterPowers(C, age)).filter(gated), age).toEqual([]);
    }
    for (const id of PAUSED_WAVE_IDS) expect(isStarterCard(C, id), id).toBe(false);
    // Released starters are unaffected.
    for (const id of ['bonker', 'pebbler', 'tuskback', 'spear_hunter', 'rock_tosser', 'angry_beehive']) expect(isStarterCard(C, id), id).toBe(true);
  });
});

describe('release gate: loading a save that holds a held-back card', () => {
  // The gated wave is the Bronze wave (the Stone wave shipped 2026-10-03, tests/fixtures/pausedWave.ts).
  function tainted(): SaveDoc {
    const s = ownsAll(fresh(9), 3, 2);
    const plan = s.warPlans[0]!;
    const bronze = plan.loadouts.bronze;
    const loadouts = {
      ...plan.loadouts,
      bronze: { ...bronze, units: ['shield_bearer', 'hoplite', 'war_elephant', 'javelineer', 'aulos_piper', 'hydra'], turrets: ['net_caster', 'archer_tower'], powers: { home: 'charybdis', field: 'sandstorm' }, fort: 'hoplon_line' },
    };
    return {
      ...s,
      collection: { ...s.collection, shield_bearer: { level: 3, copies: 4, isNew: true, foil: 'none' }, hydra: { level: 1, copies: 0, isNew: true, foil: 'holo' }, net_caster: { level: 2, copies: 1, isNew: false, foil: 'none' } },
      powersOwned: [...s.powersOwned, 'charybdis', 'sandstorm'],
      fortsOwned: [...(s.fortsOwned ?? []), 'hoplon_line', 'slinger_camp'],
      skins: { owned: [...s.skins.owned, 'marble_hoplite', 'sun_chariot'], equipped: { ...s.skins.equipped, hoplite: 'marble_hoplite', war_chariot: 'sun_chariot' } },
      warPlans: [{ ...plan, loadouts }, ...s.warPlans.slice(1)],
    };
  }

  it('drops every held-back card from the collection, owned lists, skins and War Plans; refills troop and turret slots', () => {
    const s = withoutUnreleased(tainted(), C);
    expect(Object.keys(s.collection).filter(gated)).toEqual([]);
    expect([...s.powersOwned, ...s.fortsOwned, ...s.skins.owned].filter(gated)).toEqual([]);
    expect(Object.entries(s.skins.equipped).filter(([k, v]) => gated(k) || gated(v))).toEqual([]);
    const bronze = s.warPlans[0]!.loadouts.bronze;
    expect(planIds({ bronze }).filter(gated)).toEqual([]);
    expect(bronze.units.every((x) => x !== null)).toBe(true);
    expect(bronze.turrets.every((x) => x !== null)).toBe(true);
    expect(bronze.powers).toEqual(starterPowers(C, 'bronze'));
    expect(bronze.fort).toBe(C.order.forts.find((f) => C.forts[f]?.age === 'bronze' && C.forts[f]?.fortKind === 'wall'));
    // Released cards and their levels stay as they were.
    expect(s.collection.bonker).toEqual(tainted().collection.bonker);
    expect(bronze.units.slice(1, 2)).toEqual(['hoplite']);
  });

  it('runs on every load (tickTimers) and returns the same save when there is nothing to remove', () => {
    const c = clock();
    const loaded = M.tickTimers(tainted(), c);
    expect(Object.keys(loaded.collection).filter(gated)).toEqual([]);
    expect(loaded.warPlans.flatMap((p) => planIds(p.loadouts)).filter(gated)).toEqual([]);
    const clean = fresh(3);
    expect(withoutUnreleased(clean, C)).toBe(clean);
    // A gated save still plays: the ladder opponent and the player's plan are both released.
    expect(badIn(M.pickOpponent({ ...loaded, flags: { ...loaded.flags, [META_FLAGS.ladderPlayed]: true } }, 'ladder', C, c))).toEqual([]);
  });

  it('reads every held-back id as unreleased and every listed card as released', () => {
    for (const id of PAUSED_WAVE_IDS) expect(isReleased(C, id), id).toBe(false);
    for (const id of [...C.order.units, ...C.order.turrets, ...C.order.powers, ...C.order.forts, ...C.order.skins] as CardId[]) expect(isReleased(C, id), id).toBe(true);
  });
});
