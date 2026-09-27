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
    plan.power = 'arrow_storm';
    expect(messages(c)).toContain('generals.pip.warPlan.stone: "arrow_storm" is not a power of this age (A3)');
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
    expect(m).toMatch(/ages\.stone: one default Age Power/);
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
    expect(m).toMatch(/25 common cards \(A5\.1\), found 24/);
    expect(m).toMatch(/15 rare cards \(A5\.1\), found 16/);
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
    expect(m).toMatch(/"stampede" is not an alternate power/);
    expect(m).toMatch(/each arena after the first has one gate node/);
  });

  it('catches capsule odds that do not add up (A6.4)', () => {
    const c = copy();
    c.capsules.bag.aeon = 4;
    expect(messages(c)).toContain('capsules.bag: the bag holds 100 capsules');
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
