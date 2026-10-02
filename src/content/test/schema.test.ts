/**
 * Content validation (DESIGN B4 Validation; C2/WP1 DoD: "Schema tests pass").
 * The real content must be clean, and each class of mistake must be caught.
 */
import { describe, expect, it } from 'vitest';
import { raw as fixtureRaw } from '../../../tests/fixtures/content';
import { content } from '../index';
import { raw } from '../raw';
import { assertValidContent, validateContent, validateRaw } from '../schema';
import type { Content } from '../types';
import { cloneData } from '../util';

/** A mutable deep copy of the compiled content. */
function copy(): Content {
  return cloneData(content) as Content;
}

function messages(c: Content): string[] {
  return validateContent(c).map((i) => `${i.path}: ${i.message}`);
}

describe('the shipped content', () => {
  it('has no schema or cross-reference issues', () => {
    expect(validateContent(content)).toEqual([]);
    expect(() => assertValidContent(content)).not.toThrow();
  });

  it('raw and fixture tables agree with the role-group pop and train times', () => {
    expect(validateRaw(raw)).toEqual([]);
    expect(validateRaw(fixtureRaw)).toEqual([]);
  });
});

describe('structural checks (Valibot)', () => {
  it('requires explicit hitsGround and hitsAir on every attack (B4)', () => {
    const c = copy();
    delete (c.units.bonker?.attacks[0] as { hitsAir?: boolean }).hitsAir;
    expect(messages(c).join('\n')).toMatch(/units\.bonker\.attacks\.0\.hitsAir/);
  });

  it('also checks rider attacks', () => {
    const c = copy();
    const riders = c.units.mammoth_matriarch?.abilities.find((a) => a.kind === 'riders') as { attack: { hitsGround?: boolean } };
    delete riders.attack.hitsGround;
    expect(messages(c).join('\n')).toMatch(/mammoth_matriarch\.abilities\.0\.attack\.hitsGround/);
  });

  it('rejects floats in stat fields (B3 integer state)', () => {
    const c = copy();
    (c.units.bonker as { hp: number }).hp = 160.5;
    expect(messages(c).join('\n')).toMatch(/units\.bonker\.hp/);
  });

  it('rejects unknown keys, so typos cannot hide', () => {
    const c = copy();
    (c.units.bonker as unknown as Record<string, unknown>).hitPoints = 1;
    expect(messages(c).join('\n')).toMatch(/hitPoints/);
  });

  it('rejects unknown enum values', () => {
    const c = copy();
    (c.units.bonker as { size: string }).size = 'tiny';
    expect(messages(c).join('\n')).toMatch(/units\.bonker\.size/);
  });

  it('validates the meta tables too', () => {
    const c = copy();
    (c.capsules.tiers.jade as { amber: number }).amber = -1;
    expect(messages(c).join('\n')).toMatch(/capsules\.tiers\.jade\.amber/);
  });
});

describe('semantic checks', () => {
  it('catches a skin pointing at an unknown card (skin → card)', () => {
    const c = copy();
    (c.skins.pumpkin_head as { target: string }).target = 'nobody';
    expect(messages(c)).toContain('skins.pumpkin_head: unknown skin target "nobody"');
  });

  it('catches a skin visual id that does not follow <target>@<skin>', () => {
    const c = copy();
    (c.skins.crystal_spire as { visualId: string }).visualId = 'base.stone@crystal_spire';
    expect(messages(c).join('\n')).toMatch(/skins\.crystal_spire: skin visualId/);
  });

  it('catches a loadout card from the wrong age (loadout → age)', () => {
    const c = copy();
    const plan = c.generals.list.pip.warPlan?.stone;
    if (!plan) throw new Error('pip has a Stone loadout');
    plan.units[0] = 'footman';
    expect(messages(c)).toContain('generals.pip.warPlan.stone: "footman" is not a unit of this age (A3)');
  });

  it('catches a loadout power from the wrong age (power → age)', () => {
    const c = copy();
    const plan = c.generals.list.pip.warPlan?.stone;
    if (!plan) throw new Error('pip has a Stone loadout');
    plan.powers = { home: 'arrow_storm', field: 'stampede' };
    expect(messages(c)).toContain('generals.pip.warPlan.stone: "arrow_storm" is not a power of this age (A3)');
    // A2.9.1: a power in the other slot
    const d = copy();
    const p2 = d.generals.list.pip.warPlan?.stone;
    if (!p2) throw new Error('pip has a Stone loadout');
    p2.powers = { home: 'stampede', field: null };
    expect(messages(d)).toContain('generals.pip.warPlan.stone: "stampede" does not fit the home slot (A2.9.1)');
  });

  it('catches duplicates in a loadout (A3)', () => {
    const c = copy();
    const plan = c.generals.list.moss.warPlan?.medieval;
    if (!plan) throw new Error('moss has a Medieval loadout');
    plan.units[1] = plan.units[0] ?? null;
    expect(messages(c).join('\n')).toMatch(/generals\.moss\.warPlan\.medieval: duplicate id "footman"/);
  });

  it('catches a Legendary in a non-Warden plan (A6.8)', () => {
    const c = copy();
    const plan = c.generals.list.rook.warPlan?.stone;
    if (!plan) throw new Error('rook has a Stone loadout');
    plan.units[4] = 'mammoth_matriarch';
    expect(messages(c).join('\n')).toMatch(/only The Warden brings Legendaries/);
  });

  it('catches a power on the wrong age', () => {
    const c = copy();
    (c.powers.stampede as { age: string }).age = 'future';
    const m = messages(c).join('\n');
    // Stone holds 4 Home and 4 Field powers since its X0 wave (the roster shape).
    expect(m).toMatch(/ages\.stone: 4 Home and 4 Field Age Powers/);
    expect(m).toMatch(/ages\.stone: one Field starter/);
  });

  it('catches the power rules of A2.9: reach, the cap, slot families, sources (A2.9.4-A2.9.8)', () => {
    const c = copy();
    (c.powers.meteor_shower as { reach: string }).reach = 'anywhere';
    (c.powers.rockslide as { maxTargets?: number }).maxTargets = undefined;
    (c.powers.stampede as { family: string }).family = 'sweep';
    (c.powers.hunters_spear as { maxTargets: number }).maxTargets = 2;
    (c.powers.sticky_tar as { warPathLevel: number }).warPathLevel = 6;
    (c.powers.aegis as { cost: number }).cost = 300;
    const m = messages(c).join('\n');
    expect(m).toMatch(/powers\.meteor_shower: every Home power has reach home/);
    expect(m).toMatch(/powers\.meteor_shower: area damage is never "anywhere"/);
    expect(m).toMatch(/powers\.rockslide: sweep needs maxTargets/);
    expect(m).toMatch(/powers\.stampede: family "sweep" does not fit the field slot/);
    expect(m).toMatch(/powers\.hunters_spear: a strike has maxTargets 1/);
    expect(m).toMatch(/powers\.sticky_tar: War Path powers come from levels 3, 5, 7 and 9/);
    expect(m).toMatch(/powers\.aegis: a power costs 75-150 gold/);
    const d = copy();
    (d.powers.sticky_tar as { effect: { zone: number } }).effect.zone = 900;
    expect(messages(d).join('\n')).toMatch(/powers\.sticky_tar: a Home zone is at most 850 lu/);
  });

  it('catches melee attacks that hit air (A2.6)', () => {
    const c = copy();
    (c.units.bonker?.attacks[0] as { hitsAir: boolean }).hitsAir = true;
    expect(messages(c)).toContain('units.bonker.attacks.0: melee attacks never hit air (A2.6)');
  });

  it('catches pop or train times that do not follow the role group (A2.7)', () => {
    const c = copy();
    (c.units.bonker as { pop: number }).pop = 3;
    expect(messages(c)).toContain('units.bonker: pop must follow the role group (A2.7)');
    const r = cloneData(raw);
    (r.ages[0]?.units[0] as { trainMs: number }).trainMs = 1400;
    expect(validateRaw(r)[0]?.path).toBe('raw.bonker.trainMs');
  });

  it('catches a broken collection shape (A5.1)', () => {
    const c = copy();
    (c.units.pebbler as { rarity: string }).rarity = 'rare';
    const m = messages(c).join('\n');
    // The totals follow the roster shape (40 / 24 before the X0 waves).
    const want = { common: 0, rare: 0 };
    for (const s of Object.values(c.rosterShape)) {
      want.common += s.units.common + s.turrets.common;
      want.rare += s.units.rare + s.turrets.rare;
    }
    expect(m).toContain(`${want.common} common cards (rosterShape), found ${want.common - 1}`);
    expect(m).toContain(`${want.rare} rare cards (rosterShape), found ${want.rare + 1}`);
  });

  it('catches Trophy Road mistakes (A6.3)', () => {
    const c = copy();
    const node = c.trophyRoad.nodes[0];
    if (!node) throw new Error('node 0');
    node.rewards = [{ kind: 'amber', amount: 111 }];
    expect(messages(c)).toContain('trophyRoad.50: Amber = 100 + 20 × trophies / 100');
    const d = copy();
    d.trophyRoad.nodes[2] = { index: 2, trophies: 150, rewards: [{ kind: 'power', card: 'stampede' }] };
    const m = messages(d).join('\n');
    expect(m).toMatch(/"stampede" names another road node/);
    expect(m).toMatch(/"stampede" is not a Trophy Road power/);
    expect(m).toMatch(/each arena after the first has one gate node/);
  });

  it('catches capsule odds that do not add up (A6.4)', () => {
    const c = copy();
    c.capsules.dailyOddsBp.aeon += 1;
    expect(messages(c)).toContain('capsules.dailyOddsBp: Daily odds sum to 100%');
    const e = copy();
    for (const t of e.capsules.tierOrder) e.capsules.bag[t] = 0;
    expect(messages(e)).toContain('capsules.bag: the bag holds capsules');
  });

  it('catches ladder mistakes (A6.4, A10)', () => {
    const c = copy();
    c.capsules.tiers.platinum.extraLegendaryCopies = 3;
    expect(messages(c)).toContain('capsules.tiers.platinum: extraLegendaryCopies is 1..copies.legendary');
    const d = copy();
    d.capsules.tierOrder = d.capsules.tierOrder.filter((t) => t !== 'gold');
    expect(messages(d)).toContain('capsules.summitAbove: is a tier of the ladder');
    expect(messages(d)).toContain('capsules.tierOrder: lists every tier once');
  });

  it('catches onboarding script mistakes (A6.5, A3)', () => {
    const c = copy();
    // A starter Common cannot be revealed as NEW.
    c.capsules.script[0]?.cards.push('bonker');
    expect(messages(c)).toContain('capsules.script.0: "bonker" is a starter card, so it cannot be NEW');
    // An Anti-heavy card is in the starter kit (owner feedback 2026-09-29), so it cannot be NEW either.
    const g = copy();
    g.capsules.script[0]?.cards.splice(0, 1, 'spear_hunter');
    expect(messages(g)).toContain('capsules.script.0: "spear_hunter" is a starter card, so it cannot be NEW');
    // Without the script, the Drum Shaman would never arrive.
    const d = copy();
    const first = d.capsules.script[0];
    if (!first) throw new Error('script capsule 1');
    first.cards = [];
    expect(messages(d)).toContain('capsules.script: "drum_shaman" (the stone Support Rare) never arrives (A3)');
    // Nor would the Flare Spotter without Arena 2's Age Unlock Capsules (A17.13).
    const e = copy();
    const a2 = e.arenas.list[1];
    if (!a2) throw new Error('arena 2');
    a2.gateRewards = a2.gateRewards.filter((r) => r.kind !== 'ageUnlock');
    expect(messages(e)).toContain('capsules.script: "flare_spotter" (the industrial Support Rare) never arrives (A3)');
    // A Bronze capsule has 3 stacks.
    const f = copy();
    const bronze = f.capsules.script[0];
    if (!bronze) throw new Error('script capsule 1');
    bronze.cards = ['drum_shaman', 'standard_bearer', 'friar', 'log_roller'];
    expect(messages(f)).toContain('capsules.script.0: more scripted cards than stacks');
  });

  it('catches a Conquest tier outside the General\'s tiers (A6.10, A7.4)', () => {
    const c = copy();
    const pip = c.generals.conquest.board[0];
    if (!pip) throw new Error('board');
    pip.tier = 5;
    expect(messages(c)).toContain('generals.conquest.board: "pip" plays Conquest at tier 5, outside its tiers 0-2');
  });

  it('catches a gate reward naming an unknown banner or skin', () => {
    const c = copy();
    c.arenas.list[7]?.gateRewards.push({ kind: 'skin', skin: 'gold_mammoth' });
    expect(messages(c)).toContain('arenas.chrono_rift: unknown skin "gold_mammoth"');
  });

  it('catches bots allowed to use taunting emotes (A7.2)', () => {
    const c = copy();
    const laugh = c.cosmetics.emotes.find((e) => e.id === 'laugh');
    if (!laugh) throw new Error('laugh');
    laugh.botAllowed = true;
    expect(messages(c)).toContain('cosmetics.emotes: bots use only GG, Salute and Thumbs up (A7.2)');
  });

  it('catches a counter matrix that is not antisymmetric', () => {
    const c = copy();
    const row = c.counters.bonker;
    if (!row) throw new Error('bonker row');
    row.pebbler = 0.9;
    expect(messages(c).join('\n')).toMatch(/counters\.bonker\.pebbler: M\[a\]\[b\] \+ M\[b\]\[a\] = 1/);
  });

  it('lists every issue at once through assertValidContent', () => {
    const c = copy();
    (c.units.bonker as { pop: number }).pop = 3;
    (c.units.pebbler as { pop: number }).pop = 4;
    expect(() => assertValidContent(c)).toThrow(/2 issue\(s\)/);
  });
});

describe('lane rules (A17.3, A17.15)', () => {
  it('the lane length follows core, and mid-lane and the power zone clamp follow the lane', () => {
    const c = copy();
    c.battle.laneLength = 1200;
    c.battle.midLane = 600;
    c.economy.powerZoneClamp = [150, 1050];
    const m = messages(c).join('\n');
    expect(m).toMatch(/battle\.laneLength: lane length matches core LANE_MLU/);
    expect(messages(copy())).toEqual([]);
    const d = copy();
    d.battle.midLane = 900;
    d.economy.powerZoneClamp = [150, 1800];
    expect(messages(d).join('\n')).toMatch(/battle\.midLane[\s\S]*economy\.powerZoneClamp|economy\.powerZoneClamp[\s\S]*battle\.midLane/);
  });
});
