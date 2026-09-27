import { describe, expect, it } from 'vitest';
import { fuzzMatches, sampleSize } from './runs';

/** DESIGN C2/WP3 DoD, B13: a bot never issues an illegal command (fuzz 500 matches with AI_FULL=1). */
describe('fuzz: bots never issue illegal commands', () => {
  const n = sampleSize(60, 500);
  it(`${n} random matches (Generals, tiers 0-X, plans, levels, formats, modifiers)`, () => {
    const r = fuzzMatches(0, n);
    console.log(`fuzz: ${r.matches} matches, ${r.commands} bot commands, ${r.rejected.length} rejected`);
    expect(r.commands).toBeGreaterThan(n * 50);
    expect(r.rejected).toEqual([]);
  }, 3600000);
});
