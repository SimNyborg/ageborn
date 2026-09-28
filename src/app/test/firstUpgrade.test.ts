/**
 * The onboarding's one forced upgrade (DESIGN A8 ~9:00): due once, right after capsule 2.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { content } from '@/content';
import { meta } from '@/meta';
import { FIRST_UPGRADE_FLAG, firstUpgradeDue } from '../ui/FirstUpgrade';

const clock = { now: () => Date.UTC(2026, 8, 28, 12) };

function afterOnboarding(): SaveDoc {
  const s = meta.newSave(content, clock, 7);
  return { ...s, matchesPlayed: 2, tutorial: { ...s.tutorial, step: 4 }, collection: { ...s.collection, bonker: { level: 1, copies: 6, isNew: false, foil: 'none' } } };
}

describe('first upgrade (A8)', () => {
  it('is due on Home right after onboarding, once', () => {
    const s = afterOnboarding();
    expect(firstUpgradeDue(s, 'home')).toBe(true);
    expect(firstUpgradeDue(s, 'capsule2')).toBe(false);
    expect(firstUpgradeDue({ ...s, flags: { ...s.flags, [FIRST_UPGRADE_FLAG]: true } }, 'home')).toBe(false);
    expect(firstUpgradeDue({ ...s, collection: { ...s.collection, bonker: { level: 2, copies: 0, isNew: false, foil: 'none' } } }, 'home')).toBe(false);
    expect(firstUpgradeDue(null, 'home')).toBe(false);
  });

  it('the upgrade itself works on a real onboarding save (Bonker to L2)', () => {
    const s = { ...afterOnboarding(), currencies: { amber: 40, dust: 0 } };
    const r = meta.upgrade(s, 'bonker', content);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value.collection.bonker?.level).toBe(2);
  });
});
