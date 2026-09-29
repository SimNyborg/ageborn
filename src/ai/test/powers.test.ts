/**
 * The Age Power AI (DESIGN A2.9.9): the book's per-power facts, `powerOption` (aim, value, the cap and
 * the screen, strikes, the no-aim kinds) and matches in which every power of the roster is equipped.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, CardId, Loadout, Observation, PowerDef, Side } from '@/contracts';
import { BP, MILLI, seedSfc32 } from '@/core';
import { cardBook } from '../book';
import { Ledger } from '../ledger';
import { powerOption, type PowerContext } from '../scoring';
import { createBot, runHeadless } from '@/ai';
import { createSim } from '@/sim';
import { tierParams } from '../tiers';
import { buildView, type View } from '../view';
import { AGES, balanced, baselineLoadout, botMatch, content, matchConfig, observation, sideConfig, unit } from './helpers';

const book = cardBook(content);
const e = book.econ;

function ctx(o: Partial<PowerContext> = {}): PowerContext {
  return {
    reach: e.powerReach,
    turretCover: e.turretCover,
    legendaryPowerDamageBp: e.legendaryPowerDamageBp,
    strikeEpicBp: e.strikeEpicBp,
    strikeK: 1,
    rng: null,
    ...o,
  };
}

/** A view of side 1 with `power` reloaded in its own slot and the given units (p in whole lu, own frame). */
function view(power: CardId, units: Observation['units'], o: Parameters<typeof observation>[0] = {}): View {
  return buildView(observation({ powerPpm: 1_000_000, power, gold: 1000 * MILLI, units, ...o }), 120, book, new Ledger(book));
}

function option(power: CardId, units: Observation['units'], o: Parameters<typeof observation>[0] = {}, c: Partial<PowerContext> = {}) {
  const def = content.powers[power] as PowerDef;
  return powerOption(view(power, units, o), def.slot, book.powerInfo[power]!, ctx(c));
}

describe('power facts (book, A2.9.6 coverage estimates)', () => {
  it('estimates the damage per touched unit by family', () => {
    const per = (id: string) => book.powerInfo[id]?.perUnit;
    // Sweep: once. Barrage: count × 2 × radius ÷ zone hits. Charge: min(runners, hits) × damage.
    expect(per('rockslide')).toBe(130);
    expect(per('meteor_shower')).toBe(140); // 14 × 80 / 400 = 2.8 hits × 50
    expect(per('stampede')).toBe(150); // 5 runners, max 3 hits × 50
    expect(per('aa_screen')).toBe(720); // 3 bursts cover the whole 160 lu zone: 3 × 240
    expect(per('sticky_tar')).toBe(60); // 12 pulses × 5
    expect(per('sharpshooter')).toBe(610); // 2 shots × 305
    expect(per('smoke_screen')).toBe(0);
  });

  it('knows every power of the roster, its cap, reach and whether it harms', () => {
    for (const p of Object.values(content.powers)) {
      const info = book.powerInfo[p.id];
      expect(info, p.id).toBeDefined();
      expect(info?.cost).toBe(p.cost);
      const harmful = ['barrage', 'sweep', 'stampede', 'field', 'strike'].includes(p.effect.kind);
      expect(info?.harmful, p.id).toBe(harmful);
      if (p.family === 'snare' || p.family === 'pull' || p.family === 'stun') {
        expect(info?.control, p.id).toBe(true);
        expect(info?.aiValueBp, p.id).toBeGreaterThan(0);
      }
      if (p.effect.kind === 'paradrop') expect(info?.dropValue, p.id).toBeGreaterThan(0);
    }
    expect(book.powerInfo.aa_screen?.hitsGround).toBe(false);
    expect(book.powerInfo.smoke_screen?.aiValueBp).toBe(4000);
  });
});

describe('powerOption (A2.9.9)', () => {
  it('values damage kill-weighted: a kill counts cost × 1.3, chip damage 0.4 × cost × damage ÷ HP', () => {
    // Meteor Shower (140 per unit at L1) on a 100 HP Bonker kills it: 50 × 1.3 = 65 gold.
    const kill = option('meteor_shower', [unit(0, 'bonker', 700, { hp: 10000 })]);
    expect(kill.value).toBe(65 * MILLI);
    expect(kill.count).toBe(1);
    // On a 280 HP one it takes half: 0.4 × 50 × 140 / 280 = 10 gold.
    expect(option('meteor_shower', [unit(0, 'bonker', 700, { hp: 28000 })]).value).toBe(10 * MILLI);
    // × 1.25 inside the own turret cover (p ≤ 480).
    expect(option('meteor_shower', [unit(0, 'bonker', 400, { hp: 10000 })]).value).toBe(Math.trunc((65 * MILLI * 12500) / BP));
  });

  it('Home reach: aims in its band and never counts enemies past the Home line', () => {
    const far = option('meteor_shower', [unit(0, 'bonker', 1100, { hp: 100 }), unit(0, 'bonker', 1300, { hp: 100 })]);
    expect(far.value).toBe(0);
    const near = option('rockslide', [unit(0, 'bonker', 990, { hp: 100 })]);
    expect(near.value).toBeGreaterThan(0);
    // The band ends at 1,000 − zone / 2 (Rockslide zone 450 → 775).
    expect(near.p).toBeLessThanOrEqual(775 * MILLI);
  });

  it('the screen: only the first maxTargets enemies nearest the gate are eligible, wherever the zone is', () => {
    // Five Bonkers at full HP in front, a nearly dead Tuskback behind them: Meteor Shower (cap 5) cannot
    // reach past the screen, so the Tuskback is worth nothing to it.
    const screen = [300, 310, 320, 330, 340].map((p) => unit(0, 'bonker', p, { hp: 90000 }));
    const heavy = unit(0, 'tuskback', 800, { hp: 100 });
    const withScreen = option('meteor_shower', [...screen, heavy]);
    expect(withScreen.p).toBeLessThanOrEqual(600 * MILLI);
    expect(withScreen.count).toBe(5);
    // Without the screen the Tuskback is the prize.
    const alone = option('meteor_shower', [heavy]);
    expect(alone.value).toBe(150 * 1300);
  });

  it('charges run from the own front and count at most their cap', () => {
    // Own front (side 1 units) at 500; the run is [500, 1,000]; 7 enemies in it, cap 6.
    const foes = [520, 560, 600, 640, 680, 720, 760].map((p) => unit(0, 'bonker', p, { hp: 100 }));
    const o = option('stampede', [unit(1, 'bonker', 500), ...foes, unit(0, 'bonker', 1200, { hp: 100 })]);
    expect(o.p).toBeNull();
    expect(o.count).toBe(6);
    expect(o.value).toBe(6 * 65 * MILLI);
  });

  it('strikes pick the most valuable target; Epics take half; worse tiers pick among their best k', () => {
    // Hunter's Spear (340): kills a 200 HP Pebbler (75 → 97.5), dents a full Tuskback, halves on the Sabertooth.
    const units = [unit(0, 'tuskback', 900, { hp: 56000 }), unit(0, 'pebbler', 1200, { hp: 20000 }), unit(0, 'sabertooth', 1000, { hp: 38000 })];
    const best = option('hunters_spear', units);
    expect(best.targetId).toBe(units[1]?.id);
    // The best target is the sim's own auto-aim ranking: no aim point is sent.
    expect(best.p).toBeNull();
    expect(best.value).toBe(Math.trunc(75 * 1300));
    // A k = 3 pick sometimes takes a lesser target that is fighting (next to an own unit, with another
    // enemy beside it) and aims at it; a lesser pick on a moving target falls back to the best one.
    const mine = [unit(1, 'bonker', 890), unit(1, 'bonker', 995), unit(0, 'bonker', 905, { hp: 90000 }), unit(0, 'bonker', 1010, { hp: 90000 }), unit(0, 'bonker', 1190, { hp: 90000 })];
    const picks = new Set<number | null>();
    for (const s of ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']) {
      const o = option('hunters_spear', [...units, ...mine], {}, { strikeK: 3, rng: seedSfc32(s) });
      picks.add(o.targetId);
      if (o.targetId !== units[1]?.id) expect(o.p).not.toBeNull();
    }
    expect(picks.size).toBeGreaterThan(1);
    for (const s of ['a', 'b', 'c', 'd']) expect(option('hunters_spear', units, {}, { strikeK: 3, rng: seedSfc32(s) }).targetId).toBe(units[1]?.id);
  });

  it('controls value engaged targets by aiValueBp; far from the own units they are worth nothing', () => {
    // Sticky Tar (snare, 2,500 bp): Tuskbacks next to an own unit.
    const engagedFoes = [unit(0, 'tuskback', 600), unit(0, 'tuskback', 620)];
    const near = option('sticky_tar', [unit(1, 'bonker', 560), ...engagedFoes]);
    expect(near.value).toBe(2 * Math.trunc((150 * MILLI * 2500) / BP));
    const alone = option('sticky_tar', [unit(1, 'bonker', 100), unit(0, 'tuskback', 700)]);
    expect(alone.value).toBe(0);
  });

  it('buffs count the 8 frontmost own units that are engaged', () => {
    const mine = Array.from({ length: 10 }, (_, i) => unit(1, 'bonker', 900 - i * 20));
    const o = option('hunt_cry', [...mine, unit(0, 'bonker', 950)]);
    // 8 frontmost at 900-760; all within 300 lu of the enemy at 950 → 8 × 50 × 0.25.
    expect(o.count).toBe(8);
    expect(o.value).toBe(8 * Math.trunc((50 * MILLI * 2500) / BP));
    expect(option('hunt_cry', [...mine, unit(0, 'bonker', 1400)]).value).toBe(0);
  });

  it('drops are worth 1.2 × their card value with a soft target behind the enemy front, else 0.6', () => {
    const value = book.powerInfo.paratroopers?.dropValue ?? 0;
    expect(value).toBe(225);
    const soft = option('paratroopers', [unit(0, 'bonker', 900), unit(0, 'pebbler', 1100)]);
    expect(soft.value).toBe(Math.trunc((225 * MILLI * 12000) / BP));
    const hard = option('paratroopers', [unit(0, 'bonker', 900), unit(0, 'tuskback', 1100)]);
    expect(hard.value).toBe(Math.trunc((225 * MILLI * 6000) / BP));
  });

  it('Suppress needs two own front units past 1,370 and two enemy turrets', () => {
    const turrets = [{ card: 'crossbow_nest', age: 'medieval' as AgeId }, { card: 'crossbow_nest', age: 'medieval' as AgeId }, null, null];
    const army = [unit(1, 'footman', 1500), unit(1, 'footman', 1450), unit(1, 'destrier_knight', 1420)];
    const ok = option('undermine', army, { foe: { turrets } });
    expect(ok.value).toBe(Math.trunc(((50 + 50 + 150) * MILLI * 5000) / BP));
    // One runner past the line is not enough (its death during the delay would make the cast illegal).
    expect(option('undermine', [unit(1, 'footman', 1500), unit(1, 'footman', 1200)], { foe: { turrets } }).value).toBe(0);
    expect(option('undermine', army, { foe: { turrets: [turrets[0] ?? null, null, null, null] } }).value).toBe(0);
  });

  it('the cloud values enemy ranged units inside it and the enemy turrets that cover it', () => {
    const o = option('smoke_screen', [unit(1, 'corsair', 1000), unit(0, 'fusilier', 1100), unit(0, 'fusilier', 1120)]);
    expect(o.value).toBe(Math.trunc((150 * MILLI * 4000) / BP));
  });

  it('finds a legal, valuable option for every power of the roster in a fight of its own age', () => {
    const turrets = [{ card: 'crossbow_nest', age: 'medieval' as AgeId }, { card: 'crossbow_nest', age: 'medieval' as AgeId }, null, null];
    for (const p of Object.values(content.powers)) {
      // The age's cards on both sides, locked in fights along the lane (enemies at 30% HP, air units over
      // the bot's half), and two own infantry past 1,370 so Suppress is legal.
      const cards = Object.values(content.units).filter((u) => u.age === p.age && !u.hidden);
      const lane: Observation['units'] = [];
      cards.forEach((u, i) => {
        const air = u.tags.includes('air');
        const at = air ? 600 : 300 + i * 180;
        lane.push(unit(1, u.id, at, { air }));
        lane.push(unit(0, u.id, at + 30, { hp: 3000, air }));
      });
      const inf = cards.find((u) => u.group === 'infantry')?.id ?? 'bonker';
      lane.push(unit(1, inf, 1450), unit(1, inf, 1500), unit(0, inf, 1530, { hp: 3000 }));
      const o = powerOption(view(p.id, lane, { foe: { turrets } }), p.slot, book.powerInfo[p.id]!, ctx({ strikeK: 2, rng: seedSfc32(p.id) }));
      expect(o.value, p.id).toBeGreaterThan(0);
      if (o.p !== null) {
        expect(o.p, p.id).toBeGreaterThanOrEqual(e.zoneMin);
        expect(o.p, p.id).toBeLessThanOrEqual(e.zoneMax);
        if (p.reach === 'home') expect(o.p, p.id).toBeLessThanOrEqual(e.powerReach.homeLineP);
      }
      if (p.effect.kind === 'strike') expect(o.count, p.id).toBe(1);
      else if (book.powerInfo[p.id]!.cap > 0 && p.effect.kind !== 'buffAll' && p.effect.kind !== 'cloud') expect(o.count, p.id).toBeLessThanOrEqual(book.powerInfo[p.id]!.cap);
    }
  });
});

/** Every age's Home and Field powers, in roster order. */
function rosterOf(age: AgeId): { home: CardId[]; field: CardId[] } {
  const ps = Object.values(content.powers).filter((p) => p.age === age);
  return { home: ps.filter((p) => p.slot === 'home').map((p) => p.id), field: ps.filter((p) => p.slot === 'field').map((p) => p.id) };
}

describe('bots handle every power of the roster (real sim)', () => {
  it('casts the roster in one-age matches (tier III) without an illegal command', () => {
    const cast = new Set<CardId>();
    const rejected: string[] = [];
    for (const age of AGES) {
      const roster = rosterOf(age);
      for (let r = 0; r < 3; r += 1) {
        // The age's air Epic (the Gyrocopter) takes the Support Rare slot, so Flak has a target (A2.9.12 setup).
        const air = Object.values(content.units).find((u) => u.age === age && u.rarity === 'epic' && u.tags.includes('air'));
        const base = baselineLoadout(content, age);
        const lo = (side: Side): Loadout => ({
          ...base,
          units: air ? [...base.units.slice(0, 4), air.id] : base.units,
          powers: { home: roster.home[(r + side) % roster.home.length] ?? null, field: roster.field[(r + side) % roster.field.length] ?? null },
        });
        const cfg = matchConfig({
          seed: 40 + r,
          format: `w1.${age}`,
          sides: [sideConfig(content, { level: 4, loadouts: { [age]: lo(0) } }), sideConfig(content, { level: 4, loadouts: { [age]: lo(1) } })],
        });
        const res = botMatch(cfg, [balanced(3), balanced(3)]);
        for (const c of res.commands) if (c.t === 'power') cast.add(cfg.sides[c.side].loadouts[age]?.powers[c.slot] ?? '');
        for (const x of res.rejected) rejected.push(`${age} ${x.t} ${x.reason} ${x.slot ?? ""} ${cfg.sides[x.side].loadouts[age]?.powers[x.slot ?? "home"] ?? ""} r${r} t${x.tick}`);
      }
    }
    expect(rejected).toEqual([]);
    const all = Object.keys(content.powers);
    const missing = all.filter((id) => !cast.has(id));
    console.log(`never cast: ${missing.join(', ')}`);
    // Matches are chaotic: a power may simply not meet its moment in one 6-minute age (Suppress needs a
    // push deep into turret range, the cloud enemy ranged units inside it, buffs 8 engaged units, Flak
    // air over the bot's half). The unit test above shows every power finds its value; here most of the
    // roster is cast in play, and none illegally.
    expect(all.length - missing.length).toBeGreaterThanOrEqual(38);
  }, 300000);

  it('casts buffs when its army is engaged (Standard War, every age with a buff in the Field slot)', () => {
    const buffs = new Set<CardId>();
    const plan: Partial<Record<AgeId, Loadout>> = {};
    for (const age of AGES) {
      const buff = Object.values(content.powers).find((p) => p.age === age && p.effect.kind === 'buffAll');
      const base = baselineLoadout(content, age);
      plan[age] = buff ? { ...base, powers: { ...base.powers, field: buff.id } } : base;
    }
    for (let seed = 1; seed <= 2; seed += 1) {
      const cfg = matchConfig({ seed, format: 'standard', sides: [sideConfig(content, { level: 4, loadouts: plan }), sideConfig(content, { level: 4, loadouts: plan })] });
      const sim = createSim(cfg);
      const seats = [0, 1].map((side) => ({ side: side as Side, controller: createBot(balanced(5), side as Side, cfg.seed, content) }));
      const res = runHeadless(sim, seats, {
        onEvents: (ev) => {
          for (const x of ev) if (x.e === 'powerTelegraph' && content.powers[x.power]?.effect.kind === 'buffAll') buffs.add(x.power);
        },
      });
      expect(res.rejected).toEqual([]);
    }
    expect(buffs.size).toBeGreaterThan(0);
  }, 300000);
});

describe('tiers use their slots (A2.9.9)', () => {
  it('tiers 0-II cast only Home powers; III and up both slots', () => {
    const per = (tier: number): Set<string> => {
      const slots = new Set<string>();
      for (let seed = 1; seed <= 2; seed += 1) {
        const r = botMatch(matchConfig({ seed, format: 'short', sides: [sideConfig(content, { level: 4 }), sideConfig(content, { level: 4 })] }), [balanced(tier), balanced(tier)], 20 * 300);
        for (const c of r.commands) if (c.t === 'power') slots.add(c.slot);
      }
      return slots;
    };
    expect([...per(1)]).toEqual(['home']);
    expect(per(5).has('field')).toBe(true);
    expect(tierParams(2).fieldSlot).toBe(false);
  }, 120000);
});
