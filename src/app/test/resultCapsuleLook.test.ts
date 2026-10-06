/**
 * The onboarding Result draws an earned capsule as the player may see it (A10; capsule-tiers spec 2):
 * a climbing capsule (the scripted Starter Capsules are Win Capsules) shows its start tier only, never
 * its rolled tier and never a tier that is neither.
 */
import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import type { SaveDoc } from '@/contracts';
import { FixedClock } from '@/contracts/fakes/clock';
import { meta } from '@/meta';
import { rewardCapsuleLook } from '../ui/ResultScreen';

describe('onboarding Result capsule icon', () => {
  it('draws every scripted Win Capsule at its start tier with no crests', () => {
    const clock = new FixedClock();
    const start = content.capsules.kinds.win.climbFrom;
    expect(start).not.toBeNull();
    let s: SaveDoc = meta.newSave(content, clock, 7);
    const rolled = new Set<string>();
    for (let i = 0; i < content.capsules.script.length; i += 1) {
      const before = new Set(s.capsules.pending.map((p) => p.id));
      s = meta.grantCapsule(s, 'win', content, clock);
      const cap = s.capsules.pending.find((p) => !before.has(p.id))!;
      expect(cap.scriptIndex).not.toBeNull();
      rolled.add(cap.tier);
      expect(rewardCapsuleLook(content.capsules, cap)).toEqual({ tier: start, crests: 0 });
    }
    // The script really does roll higher tiers, so the check above means something.
    expect([...rolled].some((t) => t !== start)).toBe(true);
  });

  it('shows a fixed-tier capsule with its tier and crests; nothing for a missing capsule', () => {
    const clock = new FixedClock();
    const top = content.capsules.tierOrder[content.capsules.tierOrder.length - 1]!;
    const fresh = meta.newSave(content, clock, 8);
    const s = meta.grantCapsule({ ...fresh, scriptStep: content.capsules.script.length }, 'road', content, clock, { tier: top });
    const cap = s.capsules.pending[s.capsules.pending.length - 1]!;
    const crests = content.capsules.tiers[top].guaranteed.filter((r) => r === 'legendary').length;
    expect(rewardCapsuleLook(content.capsules, cap)).toEqual({ tier: top, crests });
    expect(rewardCapsuleLook(content.capsules, undefined)).toBeNull();
  });
});

describe('capsule show settings', () => {
  // The dynamic import pulls in the capsule show's module graph: 5 s is too little under a full parallel run.
  it('pass the Lite graphics preset to the show (A10 step 4)', { timeout: 30_000 }, async () => {
    const { showSettings } = await import('../capsules/CapsuleHost');
    const s = meta.newSave(content, new FixedClock(), 9);
    expect(showSettings({ ...s, settings: { ...s.settings, graphics: 'lite' } }).lite).toBe(true);
    expect(showSettings({ ...s, settings: { ...s.settings, graphics: 'high' } }).lite).toBe(false);
    expect(showSettings({ ...s, settings: { ...s.settings, graphics: 'auto' } }).lite).toBe(false);
  });
});
