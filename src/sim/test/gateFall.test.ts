import type { CompiledContent, FormatId, SimState } from '@/contracts';
import { describe, expect, it } from 'vitest';
import { devSpawn, simCtx, stepN } from '../debug';
import { arena, fixture, L, ofKind, pLu, stun } from './helpers';

/** The fixture content with the falling gate on (A16.4 stall fix, `economy.gateFall`). */
const withFall: CompiledContent = { ...fixture, economy: { ...fixture.economy, gateFall: { lu: 120, hpBp: 10000 } } };

/**
 * A side 1 Bonker at own p `p` (1 HP, so the first hit kills it) next to a side 0 Bonker; returns the
 * side 1 base damage dealt and the victim's max HP.
 */
function fall(o: { p: number; phase: SimState['phase']; content?: CompiledContent; format?: FormatId }): { base: number; maxHp: number } {
  const sim = arena({ content: o.content ?? withFall, format: o.format ?? 'full' });
  const ctx = simCtx(sim);
  ctx.s.sides[1].lastStand = 'used';
  ctx.s.phase = o.phase;
  const victim = devSpawn(sim, 1, 'bonker', { p: o.p });
  const unit = ctx.s.units.find((u) => u.id === victim.id);
  if (!unit) throw new Error('no victim');
  unit.hp = 1;
  devSpawn(sim, 0, 'bonker', { p: L - o.p - 30 });
  // The tick the victim dies (the attacker walks on and hits the base itself later).
  for (let i = 0; i < 60; i += 1) {
    const events = stepN(sim, 1);
    if (!ofKind(events, 'died').some((e) => e.id === victim.id)) continue;
    const base = ofKind(events, 'baseDamaged')
      .filter((e) => e.side === 1)
      .reduce((a, e) => a + e.damage, 0);
    return { base, maxHp: victim.maxHp };
  }
  throw new Error('the victim did not die');
}

describe('the falling gate (A16.4 stall fix, economy.gateFall)', () => {
  it('in Overdrive a unit killed within 120 lu of its own gate costs its base its max HP', () => {
    const r = fall({ p: 60, phase: 'overdrive' });
    expect(r.base).toBe(r.maxHp);
  });

  it('in Siege the Siege base damage applies on top', () => {
    const r = fall({ p: 60, phase: 'siege' });
    expect(r.base).toBe(Math.trunc((r.maxHp * withFall.economy.siege.baseDamageBp) / 10000));
  });

  it('never in regulation, beyond 120 lu, in the tutorial format or without the field', () => {
    expect(fall({ p: 60, phase: 'regulation' }).base).toBe(0);
    expect(fall({ p: 200, phase: 'overdrive' }).base).toBe(0);
    expect(fall({ p: 60, phase: 'overdrive', format: 'tutorial' }).base).toBe(0);
    expect(fall({ p: 60, phase: 'overdrive', content: fixture }).base).toBe(0);
  });
});

describe('the open gate (A16.4 stall fix, economy.openGateLu; off in the game content)', () => {
  const withOpen: CompiledContent = { ...fixture, economy: { ...fixture.economy, openGateLu: 480 } };
  /** Six Bonkers walking at side 1's gate; how many reach the base, with or without a side 1 defender at p 400. */
  const atGate = (content: CompiledContent, defender: boolean): number => {
    const sim = arena({ content });
    simCtx(sim).s.sides[1].lastStand = 'used';
    const ids = [0, 1, 2, 3, 4, 5].map((i) => devSpawn(sim, 0, 'bonker', { p: L - 300 - i * 10 }).id);
    // A stunned defender behind the column (own p 400): it blocks nothing, but the gate is not open.
    if (defender) stun(sim, devSpawn(sim, 1, 'tuskback', { p: 400 }).id, 400);
    stepN(sim, 120);
    // A Bonker reaches the base from p ≥ L − 28 (movement.test.ts, siege crowd).
    return ids.filter((id) => pLu(sim, id) >= L - 28).length;
  };

  it('closes the file up at an undefended gate in regulation', () => {
    expect(atGate(fixture, false)).toBe(3);
    expect(atGate(withOpen, false)).toBe(6);
  });

  it('keeps the single file while a defender stands within 480 lu of its gate', () => {
    expect(atGate(withOpen, true)).toBe(3);
  });
});
