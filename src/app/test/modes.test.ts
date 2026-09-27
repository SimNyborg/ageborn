import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { FixedClock } from '@/contracts/fakes/clock';
import { InMemorySaveStore, fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { createBattle } from '../battle';
import { finishMatch } from '../flow';
import { ModeUnavailableError, setupForMode, type ModeRequest } from '../modes';
import { buildServices, DEFAULT_CHOICE } from '../services';
import { fakeMeta, type FakeMetaCall } from './helpers';

const clock = new FixedClock();
const save = fakeSaveDoc({ matchesPlayed: 12 });

describe('modes ask meta for an AI opponent (A6.8, A7.1)', () => {
  it('passes the mode options through to pickOpponent', () => {
    const calls: FakeMetaCall[] = [];
    const svc = { meta: fakeMeta(content, calls), content, clock };
    setupForMode(svc, save, { mode: 'ladder', format: 'standard' });
    setupForMode(svc, save, { mode: 'ladder' });
    setupForMode(svc, save, { mode: 'conquest', general: 'moss' });
    setupForMode(svc, save, { mode: 'skirmish', options: { generalId: 'echo', tier: 7, format: 'full', standardLevels: true } });
    setupForMode(svc, save, { mode: 'daily' });
    expect(calls).toEqual([
      { method: 'pickOpponent', mode: 'ladder', o: { format: 'standard' } },
      { method: 'pickOpponent', mode: 'ladder', o: {} },
      { method: 'pickOpponent', mode: 'conquest', o: { conquestGeneral: 'moss' } },
      { method: 'pickOpponent', mode: 'skirmish', o: { skirmish: { generalId: 'echo', tier: 7, format: 'full', standardLevels: true }, format: 'full' } },
      { method: 'pickOpponent', mode: 'daily', o: {} },
    ]);
  });

  it('carries the Daily Challenge modifier into the match config (A9.1)', () => {
    const s = setupForMode({ meta: fakeMeta(content), content, clock }, save, { mode: 'daily' });
    expect(s.config.modifiers).toEqual(['gold_rush']);
    expect(s.config.format).toBe('standard');
    expect(s.mode).toBe('daily');
  });

  it('needs meta: without it the modes are unavailable (Phase 1)', () => {
    expect(() => setupForMode({ meta: null, content, clock }, save, { mode: 'ladder' })).toThrow(ModeUnavailableError);
  });
});

describe('each mode plays to the end and records its result (C2/WP11 DoD)', () => {
  const requests: ModeRequest[] = [
    { mode: 'ladder', format: 'short' },
    { mode: 'conquest', general: 'pip' },
    { mode: 'skirmish', options: { generalId: 'moss', tier: 2, format: 'short', standardLevels: false } },
    { mode: 'daily' },
  ];

  for (const req of requests) {
    it(`${req.mode}`, async () => {
      const calls: FakeMetaCall[] = [];
      const base = await buildServices({ choice: DEFAULT_CHOICE, clock });
      const services = { ...base, meta: fakeMeta(content, calls), saveStore: new InMemorySaveStore() };
      const setup = setupForMode(services, save, req);
      const battle = createBattle(services, setup, { save, autopilot: true, hints: false });
      battle.session.start();
      battle.session.fastForward(20 * 60 * 12);
      const r = battle.session.result;
      expect(r, 'match ended').not.toBeNull();
      expect(r!.input.mode).toBe(req.mode);
      expect(r!.input.opponent.isAI).toBe(true);
      const out = await finishMatch(services, save, setup, r!.input, r!.replay);
      expect(calls.at(-1)).toEqual({ method: 'applyMatchResult', mode: req.mode });
      expect(out.save?.matchesPlayed).toBe(13);
      expect(services.saveStore.loadReplays()).toHaveLength(1);
      battle.dispose();
    }, 30_000);
  }
});
