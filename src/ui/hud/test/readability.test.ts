/** The usability-audit helpers: XP numbers, "affordable in 4s", the front-line strip, the blocked callout. */
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { describe, expect, it } from 'vitest';
import { AT_GATE, BLOCKED_GAP_MS, BLOCKED_MS, BlockedWatch, affordFraction, frontStrip, phaseBanner, secondsUntilAffordable, xpNeeded, xpProgress } from '../model';
import { sampleHudModel } from '../samples';
import { i18n } from '@/i18n';

const config = fakeMatchConfig();

describe('XP numbers on the bar ("XP 180/250")', () => {
  it('reads the threshold of the current age, and null in the final age', () => {
    expect(xpNeeded(config, 0)).toBe(700);
    const last = (config.content.formats.short?.ages.length ?? 1) - 1;
    expect(xpNeeded(config, last)).toBeNull();
    expect(xpNeeded({ ...config, format: 'tutorial' }, 0)).toBe(250);
  });

  it('turns the bar fill into whole XP, capped at the threshold', () => {
    const m = sampleHudModel(config, 0, {});
    expect(xpProgress({ ...m, me: { ...m.me, ageIndex: 0, xpBp: 5000 } }, config)).toEqual({ xp: 350, need: 700 });
    expect(xpProgress({ ...m, me: { ...m.me, ageIndex: 0, xpBp: 14_000 } }, config)).toEqual({ xp: 700, need: 700 });
  });
});

describe('cards you cannot afford yet', () => {
  it('say when they will be affordable at the current income', () => {
    expect(secondsUntilAffordable(75, 75, 6)).toBe(0);
    expect(secondsUntilAffordable(75, 50, 6)).toBe(5);
    expect(secondsUntilAffordable(75, 74, 6)).toBe(1);
    expect(secondsUntilAffordable(75, 10, 0)).toBeNull();
  });

  it('fill toward affordable', () => {
    expect(affordFraction(100, 25)).toBe(0.25);
    expect(affordFraction(100, 300)).toBe(1);
    expect(affordFraction(0, 0)).toBe(1);
  });
});

describe('front-line strip', () => {
  it('shows your colour up to your front and theirs down to their front, with the clash between', () => {
    const s = frontStrip({ mine: 0.4, theirs: 0.6 });
    expect(s.mine).toBeCloseTo(0.4);
    expect(s.theirs).toBeCloseTo(0.4);
    expect(s.clash).toBeCloseTo(0.5);
  });

  it('puts the clash at the only army on the field, and in the middle with none', () => {
    expect(frontStrip({ mine: 0.9, theirs: null }).clash).toBeCloseTo(0.9);
    expect(frontStrip({ mine: null, theirs: 0.2 }).clash).toBeCloseTo(0.2);
    expect(frontStrip(null).clash).toBe(0.5);
  });

  it('never lets either colour vanish entirely', () => {
    const s = frontStrip({ mine: 0, theirs: 1 });
    expect(s.mine).toBeGreaterThan(0);
    expect(s.theirs).toBeGreaterThan(0);
  });
});

describe('"Blocked at their gate" callout', () => {
  const atGate = { mine: AT_GATE + 0.02, theirs: 0.97 };

  it('fires after 5 s at their gate while their base takes no damage, then waits', () => {
    const w = new BlockedWatch();
    expect(w.update(0, atGate, 5000, false)).toBe(false);
    expect(w.update(BLOCKED_MS - 100, atGate, 5000, false)).toBe(false);
    expect(w.update(BLOCKED_MS, atGate, 5000, false)).toBe(true);
    // Not again right away.
    expect(w.update(BLOCKED_MS * 3, atGate, 5000, false)).toBe(false);
    expect(w.update(BLOCKED_MS + BLOCKED_GAP_MS + 1, atGate, 5000, false)).toBe(true);
  });

  it('says it in at most 8 words (A8 on-screen text)', () => {
    expect(i18n.t('hud.blocked').split(/\s+/).filter(Boolean).length).toBeLessThanOrEqual(8);
  });

  it('does not fire while their base is being hurt, away from the gate, or after the end', () => {
    const w = new BlockedWatch();
    let hp = 5000;
    for (let t = 0; t <= 10_000; t += 500) {
      hp -= 10;
      expect(w.update(t, atGate, hp, false)).toBe(false);
    }
    const away = new BlockedWatch();
    for (let t = 0; t <= 10_000; t += 500) expect(away.update(t, { mine: 0.5, theirs: 0.6 }, 5000, false)).toBe(false);
    const ended = new BlockedWatch();
    for (let t = 0; t <= 10_000; t += 500) expect(ended.update(t, atGate, 5000, true)).toBe(false);
  });
});

describe('phase banners', () => {
  it('explain Overdrive and Siege when they start', () => {
    expect(phaseBanner('overdrive')).toEqual({ title: 'hud.banner.overdrive', sub: 'hud.banner.overdriveSub' });
    expect(phaseBanner('siege')?.title).toBe('hud.banner.siege');
    expect(phaseBanner('regulation')).toBeNull();
    expect(phaseBanner('ended')).toBeNull();
  });
});
