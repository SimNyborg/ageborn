/**
 * Hidden feats (DESIGN A15.10), rewards by format (A15.8) and peak rank (A15.9).
 *
 * Each fixture event stream triggers exactly its feat, and each feat pays once.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, CardId, Loadout, MatchOutcome, SaveDoc, Side, SimEvent } from '@/contracts';
import { TICK_MS } from '@/core';
import { createFeatTracker, featFlag, featList, grantFeats, showFeatHint } from '../feats';
import { ladderWinFor } from '../trophies';
import { C, M, TestClock, matchInput, scripted } from './helpers';

const ME: Side = 0;
const FOE: Side = 1;
const sec = (s: number): number => Math.round((s * 1000) / TICK_MS);

let nextId = 100;
function spawn(side: Side, card: CardId, tick = 1): { id: number; ev: SimEvent } {
  const id = (nextId += 1);
  return { id, ev: { e: 'unitSpawned', id, side, card, x: 0, summoned: false, level: 1, tick } };
}

function died(victim: { id: number }, side: Side, card: CardId, killer: { id: number; card: CardId | null; kind: 'unit' | 'power' | 'lastStand' | 'turret'; side: Side }, tick = 50): SimEvent {
  return { e: 'died', id: victim.id, side, card, killerId: killer.id, killerCard: killer.card, killerKind: killer.kind, killerSide: killer.side, bountyGold: 0, bountyXp: 0, x: 0, tick };
}

const ageUp = (side: Side, age: AgeId, tick: number): SimEvent => ({ e: 'ageUp', side, age, tick });
const baseHit = (side: Side, hp: number, sourceId: number | null = null, tick = 60): SimEvent => ({ e: 'baseDamaged', side, sourceId, damage: 10, hp, maxHp: 1000, tick });
const WIN: MatchOutcome = { winner: ME, reason: 'baseDestroyed', tick: 9000, baseHpBp: [5000, 0] };
const LOSS: MatchOutcome = { winner: FOE, reason: 'baseDestroyed', tick: 9000, baseHpBp: [0, 5000] };

function starterPlan(ages: readonly AgeId[], o: { rare?: boolean } = {}): Partial<Record<AgeId, Loadout>> {
  const out: Partial<Record<AgeId, Loadout>> = {};
  for (const a of ages) {
    const units = C.order.units.filter((id) => C.units[id]?.age === a && C.units[id]?.rarity === 'common' && !C.units[id]?.hidden).slice(0, 3);
    if (o.rare && a === ages[0]) units[0] = C.order.units.find((id) => C.units[id]?.age === a && C.units[id]?.rarity === 'rare') ?? units[0]!;
    const turrets = C.order.turrets.filter((id) => C.turrets[id]?.age === a && C.turrets[id]?.rarity === 'common').slice(0, 2);
    const power = C.order.powers.find((p) => C.powers[p]?.age === a && C.powers[p]?.slot === 'default')!;
    out[a] = { units: [...units, null, null], turrets, power };
  }
  return out;
}

function run(format: 'short' | 'standard' | 'full', events: SimEvent[], outcome: MatchOutcome | null = WIN, o: { rare?: boolean; turret?: boolean } = {}): string[] {
  const tr = createFeatTracker({ content: C, format, side: ME, loadouts: starterPlan(C.formats[format].ages, o) });
  const all = [...events];
  // A turret keeps Humble Beginnings and No Walls apart from the other fixtures unless asked.
  if (o.turret !== false) all.unshift({ e: 'turretBuilt', side: ME, mount: 0, card: 'rock_tosser', tick: 1 });
  // An evolve past Medieval keeps Stubborn out of fixtures that are not about it.
  all.unshift(ageUp(ME, 'gunpowder', sec(500)));
  tr.push(all);
  return tr.found(outcome);
}

describe('feat tracker (A15.10)', () => {
  it('a plain win finds nothing', () => {
    expect(run('standard', [], WIN, { rare: true })).toEqual([]);
  });

  it('Caveman Diplomacy: a Stone Age unit kills a Future Age unit', () => {
    const a = spawn(ME, 'bonker');
    const b = spawn(FOE, 'photon_knight');
    expect(run('standard', [a.ev, b.ev, died(b, FOE, 'photon_knight', { id: a.id, card: 'bonker', kind: 'unit', side: ME })], LOSS, { rare: true })).toEqual(['caveman_diplomacy']);
    // A Medieval killer does not count.
    const k = spawn(ME, 'footman');
    const v = spawn(FOE, 'photon_knight');
    expect(run('standard', [k.ev, v.ev, died(v, FOE, 'photon_knight', { id: k.id, card: 'footman', kind: 'unit', side: ME })], LOSS)).toEqual([]);
  });

  it('Arrows into Tomorrow: one Arrow Storm cast kills 3 Modern or Future units', () => {
    const victims = ['trench_raider', 'rifleman', 'photon_knight'].map((c) => ({ card: c, ...spawn(FOE, c) }));
    const hits: SimEvent[] = victims.map((v) => ({ e: 'hit', targetId: v.id, sourceId: 0, sourceCard: 'arrow_storm', castId: 7, sourceKind: 'power', damage: 99, shieldAbsorbed: 0, heavy: false, modBp: 10000, x: 0, dmgType: 'pierce', tick: 40 }));
    const deaths = victims.map((v) => died(v, FOE, v.card, { id: 0, card: 'arrow_storm', kind: 'power', side: ME }));
    expect(run('standard', [...victims.map((v) => v.ev), ...hits, ...deaths], LOSS)).toEqual(['arrows_into_tomorrow']);
    // Two kills are not enough.
    expect(run('standard', [...victims.map((v) => v.ev), ...hits, ...deaths.slice(0, 2)], LOSS)).toEqual([]);
  });

  it('Stubborn: win a Standard or Full War without evolving past Medieval', () => {
    const tr = createFeatTracker({ content: C, format: 'standard', side: ME, loadouts: starterPlan(C.formats.standard.ages, { rare: true }) });
    tr.push([{ e: 'turretBuilt', side: ME, mount: 0, card: 'rock_tosser', tick: 1 }, ageUp(ME, 'medieval', sec(60))]);
    expect(tr.found(WIN)).toEqual(['stubborn']);
    expect(tr.found(LOSS)).toEqual([]);
    const short = createFeatTracker({ content: C, format: 'short', side: ME, loadouts: starterPlan(C.formats.short.ages, { rare: true }) });
    short.push([{ e: 'turretBuilt', side: ME, mount: 0, card: 'rock_tosser', tick: 1 }]);
    expect(short.found(WIN)).toEqual([]);
  });

  it('No Walls: win a Full War without a turret', () => {
    expect(run('full', [], WIN, { rare: true, turret: false })).toEqual(['no_walls']);
    expect(run('standard', [], WIN, { rare: true, turret: false })).toEqual([]);
  });

  it('Photo Finish: win at the Final Bell by 2% or less', () => {
    const close: MatchOutcome = { winner: ME, reason: 'finalBell', tick: 9000, baseHpBp: [3200, 3000] };
    expect(run('standard', [], close, { rare: true })).toEqual(['photo_finish']);
    expect(run('standard', [], { ...close, baseHpBp: [3201, 3000] }, { rare: true })).toEqual([]);
  });

  it('Horn of Legends: one Last Stand volley kills 8 units', () => {
    const evs: SimEvent[] = [];
    for (let i = 0; i < 8; i += 1) {
      const v = spawn(FOE, 'bonker');
      evs.push(v.ev, died(v, FOE, 'bonker', { id: 0, card: null, kind: 'lastStand', side: ME }));
    }
    expect(run('standard', evs, LOSS)).toEqual(['horn_of_legends']);
    expect(run('standard', evs.slice(0, 14), LOSS)).toEqual([]);
  });

  it('Lightspeed: the Future Age before 4:10 in a Full War', () => {
    expect(run('full', [ageUp(ME, 'future', sec(249))], LOSS)).toEqual(['lightspeed']);
    expect(run('full', [ageUp(ME, 'future', sec(251))], LOSS)).toEqual([]);
    expect(run('standard', [ageUp(ME, 'future', sec(100))], LOSS)).toEqual([]);
  });

  it('Underdog: win after the opponent was two ages ahead', () => {
    const tr = createFeatTracker({ content: C, format: 'full', side: ME, loadouts: starterPlan(C.formats.full.ages, { rare: true }) });
    tr.push([{ e: 'turretBuilt', side: ME, mount: 0, card: 'rock_tosser', tick: 1 }, ageUp(FOE, 'medieval', 10), ageUp(FOE, 'gunpowder', 20), ageUp(ME, 'medieval', 30), ageUp(ME, 'gunpowder', 40)]);
    expect(tr.found(WIN)).toEqual(['underdog']);
  });

  it('Humble Beginnings: win a Full War with only Commons and default powers', () => {
    expect(run('full', [], WIN)).toEqual(['humble_beginnings']);
    expect(run('full', [], WIN, { rare: true })).toEqual([]);
  });

  it('Back from the Brink: win after the own base fell below 5%', () => {
    expect(run('standard', [baseHit(ME, 49)], WIN, { rare: true })).toEqual(['back_from_the_brink']);
    expect(run('standard', [baseHit(ME, 50)], WIN, { rare: true })).toEqual([]);
  });

  it('Stone Cold: a Stone Age unit deals the final blow to a base in the Future Age', () => {
    const a = spawn(ME, 'bonker');
    expect(run('standard', [a.ev, ageUp(ME, 'modern', 90), ageUp(FOE, 'future', 100), baseHit(FOE, 0, a.id)], WIN, { rare: true })).toEqual(['stone_cold']);
    expect(run('standard', [a.ev, ageUp(FOE, 'industrial', 100), baseHit(FOE, 0, a.id)], WIN, { rare: true })).toEqual([]);
  });

  it('Old Guard: living units from all 5 ages at once', () => {
    const cards = ['bonker', 'footman', 'corsair', 'trench_raider', 'photon_knight'];
    const spawns = cards.map((c) => spawn(ME, c));
    expect(run('standard', spawns.map((x) => x.ev), LOSS)).toEqual(['old_guard']);
    // One of them dies before the fifth arrives.
    const evs = [...spawns.slice(0, 4).map((x) => x.ev), died(spawns[0]!, ME, 'bonker', { id: 1, card: 'bonker', kind: 'unit', side: FOE }), spawns[4]!.ev];
    expect(run('standard', evs, LOSS)).toEqual([]);
  });
});

describe('granting feats (A15.10)', () => {
  it('each feat pays 100 Dust once, stages a step, sets its flag and gives its title', () => {
    const c = new TestClock();
    const s = scripted();
    const o = M.pickOpponent(s, 'ladder', C, c);
    const input = { ...matchInput('ladder', 'win', o), feats: ['photo_finish', 'unknown'] };
    const r = M.applyMatchResult(s, input, C, c);
    expect(r.rewards).toContainEqual({ kind: 'feat', featId: 'photo_finish' });
    expect(r.rewards).toContainEqual({ kind: 'title', title: 'photo_finisher' });
    expect(r.save.currencies.dust).toBe(s.currencies.dust + 100);
    expect(r.save.flags[featFlag('photo_finish')]).toBe(true);
    const again = M.applyMatchResult(r.save, input, C, c);
    expect(again.rewards.some((x) => x.kind === 'feat')).toBe(false);
    expect(again.save.currencies.dust).toBe(r.save.currencies.dust);
  });

  it('the tutorial never grants feats; Skirmish does', () => {
    const c = new TestClock();
    const s: SaveDoc = scripted();
    const o = M.pickOpponent(s, 'skirmish', C, c);
    expect(M.applyMatchResult(s, { ...matchInput('skirmish', 'win', o), feats: ['no_walls'] }, C, c).rewards).toContainEqual({ kind: 'feat', featId: 'no_walls' });
    const g = grantFeats(s, C, ['no_walls', 'no_walls']);
    expect(g.steps).toHaveLength(1);
  });

  it('the Feats tab lists 12 feats; Show hint is remembered', () => {
    const s = scripted();
    const list = featList(s, C);
    expect(list).toHaveLength(12);
    expect(list.every((f) => !f.found && !f.hintShown)).toBe(true);
    const h = showFeatHint(s, 'underdog');
    expect(featList(h, C).find((f) => f.def.id === 'underdog')?.hintShown).toBe(true);
  });
});

describe('rewards by format (A15.8)', () => {
  it('below 400 trophies every format pays +30 and 20 (40) Amber; from 400 each format its own row', () => {
    const low = scripted();
    for (const f of ['short', 'standard', 'full'] as const) expect(ladderWinFor(low, C, f)).toEqual({ trophies: 30, amber: 20, amberWithoutCharge: 40 });
    const high = { ...scripted(1, 2), trophies: { ...low.trophies, current: 500, best: 500 } };
    expect(ladderWinFor(high, C, 'short').trophies).toBe(26);
    expect(ladderWinFor(high, C, 'standard').trophies).toBe(31);
    expect(ladderWinFor(high, C, 'full')).toEqual({ trophies: 36, amber: 35, amberWithoutCharge: 70 });
    const c = new TestClock();
    const o = M.pickOpponent(high, 'ladder', C, c, { format: 'full' });
    expect(o.format).toBe('full');
    const r = M.applyMatchResult(high, matchInput('ladder', 'win', o), C, c);
    expect(r.rewards[0]).toEqual({ kind: 'trophies', delta: 36 });
  });
});

describe('peak rank (A15.9)', () => {
  const tierBeaten = (s: SaveDoc): number => s.stats.winsByTier.reduce((best, n, i) => (n > 0 ? i : best), -1);

  it('Ladder, Daily and Conquest wins count; Skirmish never does', () => {
    const c = new TestClock();
    const s = scripted();
    const sk = M.pickOpponent(s, 'skirmish', C, c, { skirmish: { generalId: 'rook', tier: 9, format: 'short', standardLevels: false } });
    expect(tierBeaten(M.applyMatchResult(s, matchInput('skirmish', 'win', sk), C, c).save)).toBe(-1);
    const daily = M.pickOpponent(s, 'daily', C, c, { daily: { difficulty: 'warlord' } });
    expect(tierBeaten(M.applyMatchResult(s, matchInput('daily', 'win', daily), C, c).save)).toBe(8);
  });

  it('a Ladder win raises the peak only at even levels (player average at most 1 above the bot)', () => {
    const c = new TestClock();
    const s = scripted();
    const o = M.pickOpponent(s, 'ladder', C, c);
    expect(tierBeaten(M.applyMatchResult(s, matchInput('ladder', 'win', o), C, c).save)).toBe(o.tier);
    const strong: SaveDoc = { ...s, collection: Object.fromEntries(Object.entries(s.collection).map(([id, e]) => [id, { ...e, level: o.level + 2 }])) };
    const r = M.applyMatchResult(strong, matchInput('ladder', 'win', o), C, c);
    expect(r.save.stats.wins).toBe(s.stats.wins + 1);
    expect(tierBeaten(r.save)).toBe(-1);
  });
});
