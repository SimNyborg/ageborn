/**
 * Last Base Standing in the HUD (A2.10.1, A9.2; L3): the clock counts up over a 6-pip escalation
 * meter, the step's name under it, and the crumbling side flagged, by this HUD's side.
 */
import { content } from '@/content';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { describe, expect, it } from 'vitest';
import { clockView, escalationView } from '../model';
import { hudSamples, sampleHudModel } from '../samples';

const config = { ...fakeMatchConfig(), format: 'last' as const, content, sides: [{ ...fakeMatchConfig().sides[0], loadouts: {} }, { ...fakeMatchConfig().sides[1], loadouts: {} }] as ReturnType<typeof fakeMatchConfig>['sides'] };
const at = content.formats['last']!.escalation!.map((x) => x.atMs);
const esc = (step: number, crumbling: [boolean, boolean]) => ({ step, steps: at.length, atMs: at, crumbling });

describe('the escalation meter', () => {
  it('has no countdown: the timed timeline is off and the clock counts up', () => {
    const m = sampleHudModel(config, 0, { clockMs: 61_500, escalation: esc(0, [false, false]) });
    expect(clockView(m).progress).toBeNull();
    const v = escalationView(m, config, 0)!;
    expect(v.text).toBe('1:01');
    expect(v.pips.map((p) => p.key)).toEqual(['overdrive', 's1', 's2', 's3', 'c1', 'c2']);
    expect(v.pips.every((p) => !p.reached)).toBe(true);
    expect(v.stepKey).toBe('hud.esc.step.regulation');
  });

  it('lights the steps reached and names the current one; the schedule carries the step values', () => {
    const m = sampleHudModel(config, 0, { clockMs: at[1]! + 1_000, phase: 'siege', escalation: esc(2, [false, false]) });
    const v = escalationView(m, config, 0)!;
    expect(v.pips.filter((p) => p.reached).map((p) => p.key)).toEqual(['overdrive', 's1', 's2']);
    expect(v.stepKey).toBe('hud.esc.step.s2');
    expect(v.pips[2]).toMatchObject({ base: 3.5, turretCut: 70 });
    expect(v.pips[4]).toMatchObject({ tone: 'crumble', crumblePct: 1 });
  });

  it('flags the crumbling side relative to the HUD (the replay viewer may show side 1)', () => {
    const m = sampleHudModel(config, 0, { clockMs: at[3]! + 1_000, phase: 'siege', escalation: esc(4, [false, true]) });
    expect(escalationView(m, config, 0)!.crumbling).toEqual({ me: false, foe: true });
    expect(escalationView(m, config, 1)!.crumbling).toEqual({ me: true, foe: false });
  });

  it('is absent in a timed format', () => {
    const timed = { ...config, format: 'full' as const };
    expect(escalationView(sampleHudModel(timed, 0), timed, 0)).toBeNull();
  });

  it('the HUD state gallery has the Last Base Standing samples', () => {
    expect(hudSamples(config).map((s) => s.id)).toEqual(expect.arrayContaining(['lbsRegulation', 'lbsSiege2', 'lbsCrumble']));
  });
});
