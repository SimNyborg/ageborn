import { describe, expect, it } from 'vitest';
import { runDuel } from '../duel';
import { fixture } from './helpers';

describe('runDuel (counter matrix harness)', () => {
  it('mirror duels are exactly even', () => {
    for (const card of ['bonker', 'pebbler', 'tuskback', 'photon_knight']) {
      const r = runDuel(fixture, card, card, 3, 3);
      expect(r.hpLeftBp[0], card).toBe(r.hpLeftBp[1]);
    }
  });

  it('equal gold: a Tuskback (150) beats 3 Bonkers (Blunt ×0.7), a Spear Hunter pair beats a Tuskback', () => {
    const t = runDuel(fixture, 'tuskback', 'bonker', 1, 3);
    expect(t.hpLeftBp[0]).toBeGreaterThan(0);
    expect(t.hpLeftBp[1]).toBe(0);
    const s = runDuel(fixture, 'spear_hunter', 'tuskback', 3, 2);
    expect(s.hpLeftBp[1]).toBe(0);
  });

  it('units that can never trade run out the clock', () => {
    const r = runDuel(fixture, 'bonker', 'repair_drone', 2, 1, { maxTicks: 400 });
    expect(r.ticks).toBe(400);
    expect(r.hpLeftBp).toEqual([10000, 10000]);
  });
});
