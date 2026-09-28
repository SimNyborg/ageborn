/**
 * Owner feedback 2026-09-28: winning the training match (match 1) also grants one Wardrobe Crate, so
 * Home's Capsules entry has something to open and Customize has a skin to equip from the start.
 */
import { describe, expect, it } from 'vitest';
import { fresh, play } from './helpers';

describe('welcome Wardrobe Crate (owner feedback 2026-09-28)', () => {
  it('match 1 won: the scripted capsule plus one welcome crate, staged on the result', () => {
    const r = play(fresh(), 'tutorial', 'win');
    expect(r.save.capsules.wardrobe).toHaveLength(1);
    expect(r.save.capsules.wardrobe[0]!.source).toBe('welcome');
    expect(r.rewards.map((x) => x.kind)).toContain('crate');
    expect(r.rewards.map((x) => x.kind)).toContain('capsule');
  });

  it('only once: match 2 and a lost match 1 give no crate', () => {
    const lost = play(fresh(), 'tutorial', 'loss');
    expect(lost.save.capsules.wardrobe).toHaveLength(0);
    const m1 = play(fresh(), 'tutorial', 'win').save;
    const m2 = play(m1, 'tutorial', 'win').save;
    expect(m2.capsules.wardrobe).toHaveLength(1);
  });
});
