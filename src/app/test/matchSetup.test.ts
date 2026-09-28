import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { fakeContent } from '@/contracts/fakes/content';
import { fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { commanderId } from '@/meta';
import { MATCH1, MATCH1_SEED, MATCH1_TRAYS, MATCH2 } from '@/tutorial';
import { botProfileFor, generalOpponent, generalPlan, matchSetupFor, nextMatchNumber, playerSide, quickBattle, standardLevel, tutorialMatch1, tutorialMatch2 } from '../matchSetup';

describe('match 1 setup (A8)', () => {
  const s = tutorialMatch1(null, content, 'Old Grogg');

  it('is the Tutorial format vs Old Grogg, labeled AI, base at 50%, no clock (A7.4, A8)', () => {
    expect(s.mode).toBe('tutorial');
    expect(s.matchNumber).toBe(1);
    expect(s.config.format).toBe('tutorial');
    expect(s.config.seed).toBe(MATCH1_SEED);
    expect(s.brain).toEqual({ kind: 'grogg' });
    expect(s.opponent).toMatchObject({ generalId: 'grogg', isAI: true, format: 'tutorial' });
    expect(s.opponent.disclosures).toEqual(['general.grogg.disclosure']);
    expect(s.config.sides[1].isBot).toBe(true);
    expect(s.config.training).toMatchObject({ enemyBaseStartBp: 5000, noClock: true, manualLastStand: [false, true], stanceEnabled: [false, true] });
    expect(s.config.training?.trays).toEqual(MATCH1_TRAYS);
    expect(s.script).toBe(MATCH1);
  });

  it('gives the player every age of the format with scripted trays and Grogg only the Stone Age', () => {
    expect(Object.keys(s.config.sides[0].loadouts)).toEqual(['stone', 'medieval', 'gunpowder', 'modern', 'future']);
    expect(s.config.sides[0].loadouts.stone?.units[0]).toBe('bonker');
    expect(Object.keys(s.config.sides[1].loadouts)).toEqual(['stone']);
    expect(s.config.sides[1].loadouts.stone?.units.slice(0, 2)).toEqual(['training_dummy', 'tuskback']);
  });
});

describe('match 2 setup (A8)', () => {
  it('is Short War vs Pip at tier 0 with the Arena 1 rarity allowance and the player plan', () => {
    const save = fakeSaveDoc({ matchesPlayed: 1 });
    const s = tutorialMatch2(save, content, 'Pip Quickstep', 77);
    expect(s.mode).toBe('tutorial');
    expect(s.matchNumber).toBe(2);
    expect(s.config.format).toBe('short');
    expect(s.opponent).toMatchObject({ generalId: 'pip', tier: 0, level: 1, isAI: true, seed: 77 });
    expect(s.script).toBe(MATCH2);
    // No Epic or Legendary above the Arena 1 allowance (rare).
    for (const lo of Object.values(s.opponent.side.loadouts)) {
      for (const c of lo!.units) if (c) expect(['common', 'rare']).toContain(content.units[c]!.rarity);
    }
    expect(s.config.sides[0].loadouts).toEqual(save.warPlans[0]!.loadouts);
    expect(s.config.training).toEqual({ manualLastStand: [false, true], stanceEnabled: [false, true] });
  });
});

describe('matchSetupFor (B11)', () => {
  const opponent = generalOpponent(content, { generalId: 'kettle', displayName: 'Captain Kettle', tier: 2, level: 2, format: 'standard', seed: 9, modifiers: ['gold_rush'] });

  it('builds the config from the save plus the opponent spec', () => {
    const save = fakeSaveDoc({ matchesPlayed: 10 });
    save.collection.bonker = { level: 4, copies: 0, isNew: false, foil: 'holo' };
    save.skins.equipped = { bonker: 'pumpkin_head' };
    const s = matchSetupFor(save, opponent, 'daily', content);
    expect(s.config).toMatchObject({ seed: 9, format: 'standard', modifiers: ['gold_rush'] });
    expect(s.config.sides[0]).toMatchObject({ label: 'Player', isBot: false, skins: { bonker: 'pumpkin_head' } });
    expect(s.config.sides[0].levels.bonker).toBe(4);
    expect(s.config.sides[1]).toMatchObject({ label: 'Captain Kettle', isBot: true });
    // Match 11: every control is unlocked, so there are no training flags.
    expect(s.config.training).toBeUndefined();
    expect(s.script).toBeNull();
    expect(s.brain).toMatchObject({ kind: 'general', profile: { generalId: 'kettle', tier: 2 } });
  });

  it('applies the staged unlocks of matches 3-5 (A3, A2.11)', () => {
    expect(matchSetupFor(fakeSaveDoc({ matchesPlayed: 2 }), opponent, 'ladder', content).config.training).toEqual({ manualLastStand: [false, true], stanceEnabled: [false, true] });
    expect(matchSetupFor(fakeSaveDoc({ matchesPlayed: 3 }), opponent, 'ladder', content).config.training).toEqual({ manualLastStand: [false, true] });
    expect(matchSetupFor(fakeSaveDoc({ matchesPlayed: 4 }), opponent, 'ladder', content).config.training).toBeUndefined();
    expect(matchSetupFor(fakeSaveDoc({ matchesPlayed: 3 }), opponent, 'ladder', content).script?.id).toBe('match4');
  });

  it('gives new players the A6.8 mistake bonus (a missing save is a first launch)', () => {
    expect(botProfileFor(opponent, content, fakeSaveDoc({ matchesPlayed: 3 })).mistakeBonusBp).toBe(1000);
    expect(botProfileFor(opponent, content, fakeSaveDoc({ matchesPlayed: 19 })).mistakeBonusBp).toBe(1000);
    expect(botProfileFor(opponent, content, fakeSaveDoc({ matchesPlayed: 20 })).mistakeBonusBp).toBe(0);
    expect(botProfileFor(opponent, content, null).mistakeBonusBp).toBe(1000);
    expect(botProfileFor(opponent, content, null).weights).toEqual(content.generals.list.kettle.weights);
  });

  it("plays a procedural AI Commander with its personality General's weights and favourite card (A7.4)", () => {
    const commander = { ...opponent, generalId: commanderId('moss', 'pebbler'), displayName: 'AI · Brakka Stonejaw' };
    const p = botProfileFor(commander, content, null);
    expect(p.generalId).toBe('moss');
    expect(p.weights).toEqual(content.generals.list.moss.weights);
    expect(p.openings).toContain('favorite:pebbler');
    expect(p.tier).toBe(2);
  });

  it('puts the resolved opponent name on the nameplate and the player name from the save', () => {
    const keyed = { ...opponent, displayName: 'general.kettle.name' };
    const s = matchSetupFor(fakeSaveDoc({ matchesPlayed: 10 }), keyed, 'ladder', content, { opponentLabel: 'Captain Kettle' });
    expect(s.config.sides[1].label).toBe('Captain Kettle');
    expect(s.config.sides[0].label).toBe(fakeSaveDoc().profile.name);
    expect(matchSetupFor(null, opponent, 'skirmish', content, { player: 'You' }).config.sides[0].label).toBe('You');
  });

  it('Skirmish "Standard levels" puts every card of the player at L7 too (A6.8)', () => {
    const save = fakeSaveDoc({ matchesPlayed: 10 });
    save.collection.bonker = { level: 4, copies: 0, isNew: false, foil: 'none' };
    const std = matchSetupFor(save, opponent, 'skirmish', content, { standardLevels: true });
    expect(standardLevel(content)).toBe(7);
    expect(std.config.sides[0].levels.bonker).toBe(7);
    for (const id of Object.keys(content.units)) expect(std.config.sides[0].levels[id]).toBe(7);
    expect(matchSetupFor(save, opponent, 'skirmish', content).config.sides[0].levels.bonker).toBe(4);
  });
});

describe('helpers', () => {
  it('playerSide without a save uses the starter plan at level 1', () => {
    const side = playerSide(null, content, 'You');
    expect(side.isBot).toBe(false);
    expect(side.label).toBe('You');
    expect(side.loadouts.stone?.units.slice(0, 3)).toEqual(['bonker', 'pebbler', 'tuskback']);
    expect(side.levels.bonker).toBe(1);
  });

  it("generalPlan removes cards above a rarity allowance and falls back on content without plans", () => {
    const plan = generalPlan(content, 'warden', 'epic');
    expect(Object.values(plan).flatMap((lo) => lo!.units).some((c) => c && content.units[c]!.rarity === 'legendary')).toBe(false);
    expect(generalPlan(fakeContent, 'pip').stone?.units[0]).toBe('bonker');
  });

  it('quickBattle is a Short War vs a tier III AI General with the staged unlocks and no script', () => {
    const q = quickBattle(null, content, { generalId: 'kettle', displayName: 'Captain Kettle', format: 'short', seed: 3 });
    expect(q.opponent).toMatchObject({ tier: 3, isAI: true, format: 'short' });
    // A new player: no stance flag before match 4, no Last Stand button before match 5 (A8).
    expect(q.config.training).toEqual({ manualLastStand: [false, true], stanceEnabled: [false, true] });
    expect(q.script).toBeNull();
    const veteran = quickBattle(fakeSaveDoc({ matchesPlayed: 9 }), content, { generalId: 'kettle', displayName: 'Captain Kettle', format: 'short', seed: 3 });
    expect(veteran.config.training).toBeUndefined();
    const fake = quickBattle(null, fakeContent, { generalId: 'kettle', displayName: 'AI Kettle', format: 'short', seed: 3 });
    expect(fake.config.sides[1].loadouts.stone?.units[0]).toBe('bonker');
  });

  it('nextMatchNumber', () => {
    expect(nextMatchNumber(null)).toBe(1);
    expect(nextMatchNumber(fakeSaveDoc({ matchesPlayed: 4 }))).toBe(5);
  });
});
