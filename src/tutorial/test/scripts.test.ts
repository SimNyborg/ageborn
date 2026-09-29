import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { i18n } from '@/i18n';
import strings from '@/i18n/tutorial.en.json';
import { flattenStrings } from '@/i18n';
import { createSim } from '@/sim';
import { GroggBrain } from '../grogg';
import { TutorialAutopilot } from '../autopilot';
import {
  ADAPTIVE_HINTS,
  GROGG_SCRIPT,
  MATCH1,
  MATCH1_PEBBLER_TICK,
  MATCH1_POWER_TICK,
  MATCH1_TURRET_GRANT,
  MATCH1_TURRET_GRANT_TICK,
  MATCH2,
  STAGES,
  match1Loadouts,
  match1TrainingScript,
  scriptForMatch,
  stagedTraining,
  starterLoadout,
} from '../scripts';

const words = (s: string): number => s.trim().split(/\s+/).length;

describe('onboarding text (A8: at most 8 words on screen)', () => {
  const keys = [...[MATCH1, MATCH2].flatMap((m) => m.beats.map((b) => b.textKey)), ...ADAPTIVE_HINTS.map((h) => h.textKey)].filter(
    (k): k is string => k !== null,
  );

  it('every prompt key exists in EN', () => {
    for (const k of keys) expect(i18n.has(k), k).toBe(true);
  });

  it('every tutorial string is at most 8 words', () => {
    const flat = flattenStrings(strings);
    for (const [k, v] of Object.entries(flat)) if (k.startsWith('tutorial.')) expect(words(v), `${k}: ${v}`).toBeLessThanOrEqual(8);
  });

  it('keeps the A8 wording', () => {
    expect(i18n.t('tutorial.m1.sendBonker')).toBe('Tap to send a Bonker');
    expect(i18n.t('tutorial.m1.future')).toBe('From clubs to lasers!');
    expect(i18n.t('tutorial.hint.hold')).toBe('Hold: gather at the line, then push.');
  });
});

describe('match 1 script (A8)', () => {
  const grogg = ['training_dummy', 'tuskback', null, null, null];
  const script = match1TrainingScript(content, grogg);

  it('is sorted by tick and carries the Pebbler, turret gold and Arrow Storm charge', () => {
    expect(script.map((e) => e.tick)).toEqual([...script.map((e) => e.tick)].sort((a, b) => a - b));
    expect(script).toContainEqual({ tick: MATCH1_PEBBLER_TICK, side: 0, unlockSlot: 1 });
    expect(script).toContainEqual({ tick: MATCH1_TURRET_GRANT_TICK, side: 0, grantGold: MATCH1_TURRET_GRANT });
    expect(script).toContainEqual({ tick: MATCH1_POWER_TICK, side: 0, setPowerPpm: 1_000_000 });
    expect(MATCH1_PEBBLER_TICK).toBeLessThan(MATCH1_TURRET_GRANT_TICK);
    expect(MATCH1_TURRET_GRANT_TICK).toBeLessThan(MATCH1_POWER_TICK);
  });

  it("pays Grogg's every send one tick ahead, so his schedule never depends on his economy", () => {
    const grants = script.filter((e) => e.side === 1);
    expect(grants).toHaveLength(GROGG_SCRIPT.sends.length);
    GROGG_SCRIPT.sends.forEach((s, i) => {
      expect(grants[i]!.tick).toBe(s.tick - 1);
      expect(grants[i]!.grantGold).toBe(content.units[grogg[s.slot]!]!.cost);
    });
  });

  it('sends exactly one Tuskback and otherwise Training Dummies', () => {
    expect(GROGG_SCRIPT.sends.filter((s) => s.slot === 1)).toHaveLength(1);
    expect(GROGG_SCRIPT.sends.every((s) => s.slot === 0 || s.slot === 1)).toBe(true);
  });

  it('uses the starter commons: Infantry, Ranged, Heavy, both Common turrets, the default power', () => {
    expect(starterLoadout(content, 'stone')).toEqual({ units: ['bonker', 'pebbler', 'tuskback', null, null], turrets: ['rock_tosser', 'angry_beehive'], power: 'stampede' });
    expect(starterLoadout(content, 'medieval').units.slice(0, 2)).toEqual(['footman', 'longbowman']);
    expect(Object.keys(match1Loadouts(content))).toEqual(['stone', 'medieval', 'gunpowder', 'modern', 'future']);
  });
});

describe('staged unlocks (A3, A2.11)', () => {
  it('stance from match 1, manual Last Stand from match 2 (owner feedback 2026-09-28)', () => {
    expect(stagedTraining(1)).toEqual({ manualLastStand: [false, true], stanceEnabled: [true, true] });
    expect(stagedTraining(2)).toEqual({ manualLastStand: [true, true], stanceEnabled: [true, true] });
    expect(stagedTraining(5)).toEqual({ manualLastStand: [true, true], stanceEnabled: [true, true] });
    expect(STAGES.warPlanAfterMatch).toBe(1);
    expect(STAGES.skirmishAfterMatch).toBe(1);
  });

  it('scripts per match: match 1 carries the one stance hint, match 2 the Last Stand hint', () => {
    expect(scriptForMatch(1)).toBe(MATCH1);
    expect(scriptForMatch(2)).toBe(MATCH2);
    expect(scriptForMatch(3)).toBeNull();
    expect(scriptForMatch(4)).toBeNull();
    expect(scriptForMatch(5)).toBeNull();
    expect(MATCH1.beats.filter((b) => b.target === 'stance').map((b) => b.id)).toEqual(['m1.stance']);
    expect(MATCH2.beats.filter((b) => b.target === 'lastStand').map((b) => b.id)).toEqual(['m2.lastStand']);
  });
});

describe("Old Grogg's scripted brain (A7.4, B10)", () => {
  function obs(tick: number, groggUnits = 0) {
    const sim = createSim({ seed: 1, format: 'tutorial', content, sides: [
      { label: 'P', isBot: false, loadouts: match1Loadouts(content), levels: {}, skins: {} },
      { label: 'G', isBot: true, loadouts: { stone: { units: ['training_dummy', 'tuskback', null, null, null], turrets: [null, null], powers: { home: 'rockslide', field: 'stampede' } } }, levels: {}, skins: {} },
    ] });
    const o = sim.observe(1);
    return { ...o, tick, units: Array.from({ length: groggUnits }, (_, i) => ({ id: i + 1, side: 1 as const, card: 'training_dummy', level: 1, p: 100_000, hp: 1, maxHp: 1, shield: 0, air: false, summoned: false })) };
  }

  it('issues train commands on schedule, for his side only, and never evolves', () => {
    const g = new GroggBrain(1);
    const out = [];
    for (let t = 0; t <= GROGG_SCRIPT.sends[3]!.tick; t += 1) out.push(...g.onTick(obs(t)));
    expect(out).toEqual([
      { t: 'train', side: 1, slot: 0 },
      { t: 'train', side: 1, slot: 0 },
      { t: 'train', side: 1, slot: 0 },
      { t: 'train', side: 1, slot: 1 },
    ]);
    expect(g.snapshotDelayTicks).toBe(0);
  });

  it('skips dummies while the lane already holds his cap, but still sends the Tuskback', () => {
    const g = new GroggBrain(1, { sends: [{ tick: 1, slot: 0 }, { tick: 2, slot: 1 }], maxAlive: 2 });
    expect(g.onTick(obs(1, 2))).toEqual([]);
    expect(g.onTick(obs(2, 2))).toEqual([{ t: 'train', side: 1, slot: 1 }]);
  });
});

describe('TutorialAutopilot (B13 autopilot)', () => {
  it('plays the player side only and waits for its start tick', () => {
    const sim = createSim({ seed: 1, format: 'tutorial', content, sides: [
      { label: 'P', isBot: false, loadouts: match1Loadouts(content), levels: {}, skins: {} },
      { label: 'G', isBot: true, loadouts: match1Loadouts(content), levels: {}, skins: {} },
    ], training: { trays: { stone: [0] } } });
    const ap = new TutorialAutopilot(content, { startTick: 5, turretFromTick: 1000 });
    expect(ap.onTick({ ...sim.observe(0), tick: 0 })).toEqual([]);
    const cmds = ap.onTick({ ...sim.observe(0), tick: 5 });
    expect(cmds).toEqual([{ t: 'train', side: 0, slot: 0 }]);
  });
});
