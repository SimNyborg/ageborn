/**
 * Last Base Standing in the HUD (A2.10.1, A9.2; L3): the clock counts up over a 6-pip escalation
 * meter, the step's name under it, and the crumbling side flagged, by this HUD's side.
 */
import { content } from '@/content';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { describe, expect, it } from 'vitest';
import { clockView, escalationView, phaseBanner, ropeView } from '../model';
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

describe('the Siege rope of a timed war (A2.10.2)', () => {
  const short = { ...config, format: 'short' as const };
  const rat = content.formats['short']!.escalation!.map((x) => x.atMs);
  const rope = (step: number, crumbling: [boolean, boolean]) => ({ step, steps: rat.length, atMs: rat, crumbling });

  it('keeps the countdown and adds a rope mark where crumbling speeds up', () => {
    const m = sampleHudModel(short, 0, { clockMs: rat[0]! + 5_000, phase: 'siege', escalation: rope(1, [false, true]) });
    const c = clockView(m);
    expect(c.countdown).toBe(true);
    expect(c.marks.map((x) => x.kind)).toEqual(['overdrive', 'siege', 'rope']);
    expect(escalationView(m, short, 0)).toBeNull();
  });

  it('names the step, lists the schedule up to the Final Bell and flags the crumbling side', () => {
    const m = sampleHudModel(short, 0, { clockMs: rat[1]! + 1_000, phase: 'siege', escalation: rope(2, [true, false]) });
    const v = ropeView(m, short, 0)!;
    expect(v.stepKey).toBe('hud.rope.step.r2');
    expect(v.rows.map((r) => r.key)).toEqual(['overdrive', 'r1', 'r2', 'bell']);
    expect(v.rows[1]).toMatchObject({ reached: true, crumblePct: content.formats['short']!.escalation![0]!.crumbleBpPerSec / 100 });
    expect(v.rows[3]!.atMs).toBe(content.formats['short']!.finalBellMs);
    expect(v.crumbling).toEqual({ me: true, foe: false });
    expect(ropeView(m, short, 1)!.crumbling).toEqual({ me: false, foe: true });
  });

  it('has no step name before Siege and is absent in Last Base Standing', () => {
    expect(ropeView(sampleHudModel(short, 0, { clockMs: 60_000, escalation: rope(0, [false, false]) }), short, 0)!.stepKey).toBeNull();
    expect(ropeView(sampleHudModel(config, 0, { escalation: esc(0, [false, false]) }), config, 0)).toBeNull();
  });

  it('says who crumbles in the Siege banner', () => {
    expect(phaseBanner('siege', true)?.sub).toBe('hud.banner.siegeRopeSub');
    expect(phaseBanner('siege')?.sub).toBe('hud.banner.siegeSub');
  });

  it('the HUD state gallery has the rope samples', () => {
    expect(hudSamples(short).map((s) => s.id)).toEqual(expect.arrayContaining(['ropeSiege', 'ropeTight']));
  });
});
