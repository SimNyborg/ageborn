/**
 * Fort commands and Fort slots survive storage (DESIGN A16.14.8, spec section 13): the replay schema keeps
 * the `fort` command and `Loadout.fort` (Valibot `v.object` strips unknown keys, so without them a stored
 * replay or resume log would lose its forts and desync), and the save schema keeps every preset's Fort
 * slot and `fortsOwned`. A stored match with fort commands replays to the same hash.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId, Command, ReplayDoc, SideConfig } from '@/contracts';
// Tests may cross layers: the replay is real sim output.
import { createSim } from '@/sim/createSim';
import { buildReplay, verifyReplay } from '@/sim/replay';
import { fixture, matchConfig, sideConfig, Stamper } from '@/sim/test/helpers';
import { validateReplay } from '../replaySchema';
import { validateSaveDoc } from '../schema';
import { currentFixture } from './helpers';

function withFort(s: SideConfig, fort: Partial<Record<AgeId, string>>): SideConfig {
  const loadouts = { ...s.loadouts };
  for (const age of Object.keys(loadouts) as AgeId[]) {
    const l = loadouts[age];
    if (l) loadouts[age] = { ...l, fort: fort[age] ?? null };
  }
  return { ...s, loadouts };
}

function fortReplay(): ReplayDoc {
  const cfg = matchConfig({
    seed: 11,
    format: 'short',
    modifiers: ['sudden_siege'],
    sides: [withFort(sideConfig(fixture), { stone: 'war_camp', medieval: 'shield_barricade' }), withFort(sideConfig(fixture, { isBot: true, label: 'AI' }), { stone: 'spike_pit', medieval: 'longbow_tower' })],
  });
  const sim = createSim(cfg);
  const st = new Stamper(sim);
  for (let t = 0; t < 40000 && !sim.state.outcome; t += 1) {
    const cmds: Command[] = [];
    if (t % 30 === 0) cmds.push({ t: 'train', side: 0, slot: 0 }, { t: 'train', side: 1, slot: 1 });
    if (t % 50 === 0) cmds.push({ t: 'fort', side: 0, pad: t % 100 === 0 ? 0 : 1 }, { t: 'fort', side: 1, pad: t % 100 === 0 ? 2 : 1 });
    if (t > 1300 && t % 200 === 0) cmds.push({ t: 'retreat', side: 1 });
    st.step(...cmds);
  }
  return buildReplay(sim);
}

describe('fort commands and slots in storage', () => {
  it('a replay with fort commands survives the replay schema and replays to the same hash', () => {
    const doc = fortReplay();
    const placed = doc.commands.filter((c) => c.t === 'fort');
    expect(placed.length).toBeGreaterThan(10);
    const stored = JSON.parse(JSON.stringify(doc)) as unknown;
    const back = validateReplay(stored);
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.value.commands.filter((c) => c.t === 'fort')).toEqual(placed);
    expect(back.value.sides[0].loadouts.stone?.fort).toBe('war_camp');
    expect(back.value.sides[1].loadouts.medieval?.fort).toBe('longbow_tower');
    const check = verifyReplay(back.value, fixture);
    expect(check.ok).toBe(true);
    expect(check.finalHash).toBe(doc.finalHash);
  });

  it('the save schema keeps every Fort slot and fortsOwned', () => {
    const doc = currentFixture();
    expect(doc.fortsOwned.length).toBeGreaterThan(0);
    const back = validateSaveDoc(JSON.parse(JSON.stringify(doc)));
    expect(back.ok).toBe(true);
    if (!back.ok) return;
    expect(back.value.fortsOwned).toEqual(doc.fortsOwned);
    expect(back.value.warPlans.map((p) => p.loadouts.stone.fort)).toEqual(doc.warPlans.map((p) => p.loadouts.stone.fort));
    expect(back.value.warPlans[0]?.loadouts.stone.fort).toBe('palisade');
  });
});
