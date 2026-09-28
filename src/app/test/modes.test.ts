import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { content } from '@/content';
import { FixedClock } from '@/contracts/fakes/clock';
import { i18n } from '@/i18n';
import { commanderInfo, createMeta, META_FLAGS } from '@/meta';
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

describe('modes with the real meta rules (WP7)', () => {
  const meta = createMeta(content);
  const fresh = meta.newSave(content, clock, 42);
  // Past the onboarding and the first ladder match (Captain Kettle, A8 match 3).
  const veteran: SaveDoc = { ...fresh, matchesPlayed: 12, flags: { ...fresh.flags, [META_FLAGS.ladderPlayed]: true } };
  const svc = { meta, content, clock, i18n };
  const requests: ModeRequest[] = [
    { mode: 'ladder' },
    { mode: 'conquest', general: 'pip' },
    { mode: 'skirmish', options: { generalId: 'moss', tier: 2, format: 'short', standardLevels: false } },
    { mode: 'daily' },
  ];

  it('names every opponent in words on the HUD nameplate, never by its string key (A7.4, B4)', () => {
    for (const req of requests) {
      const s = setupForMode(svc, veteran, req);
      expect(s.config.sides[1].isBot).toBe(true);
      expect(s.opponent.isAI).toBe(true);
      expect(i18n.has(s.config.sides[1].label), `${req.mode}: ${s.config.sides[1].label}`).toBe(false);
      expect(s.config.sides[1].label).not.toBe('');
    }
    expect(setupForMode(svc, veteran, { mode: 'conquest', general: 'pip' }).config.sides[1].label).toBe(i18n.t('general.pip.name'));
  });

  it('plays a ladder AI Commander with its personality General (A7.4)', () => {
    let found = 0;
    for (let n = 12; n < 60 && found < 2; n += 1) {
      const s = setupForMode(svc, { ...veteran, matchesPlayed: n }, { mode: 'ladder' });
      const info = commanderInfo(s.opponent.generalId);
      if (!info) continue;
      found += 1;
      expect(s.config.sides[1].label.startsWith(content.names.aiPrefix)).toBe(true);
      if (s.brain.kind !== 'general') throw new Error('a Commander is a general brain');
      expect(s.brain.profile.generalId).toBe(info.personalityOf);
      expect(s.brain.profile.weights).toEqual(content.generals.list[info.personalityOf as keyof typeof content.generals.list]!.weights);
    }
    expect(found).toBe(2);
  });

  it('Skirmish "Standard levels" puts every card on both sides at L7 (A6.8)', () => {
    const s = setupForMode(svc, veteran, { mode: 'skirmish', options: { generalId: 'moss', tier: 4, format: 'short', standardLevels: true } });
    for (const side of s.config.sides) {
      for (const lo of Object.values(side.loadouts)) for (const c of [...lo!.units, ...lo!.turrets]) if (c) expect(side.levels[c], c).toBe(7);
    }
  });

  it('the Daily Challenge is a Standard War with the day\'s symmetric modifier (A9.1)', () => {
    const s = setupForMode(svc, veteran, { mode: 'daily' });
    expect(s.config.format).toBe('standard');
    expect(s.config.modifiers).toEqual([meta.dailyModifier(content, clock)]);
  });

  for (const req of requests) {
    it(`${req.mode} plays to the end and meta applies the result`, async () => {
      const base = await buildServices({ choice: DEFAULT_CHOICE, clock });
      const services = { ...base, meta, saveStore: new InMemorySaveStore() };
      const setup = setupForMode(services, veteran, req);
      const battle = createBattle(services, setup, { save: veteran, autopilot: true, hints: false });
      battle.session.start();
      battle.session.fastForward(20 * 60 * 12);
      const r = battle.session.result;
      expect(r, 'match ended').not.toBeNull();
      const out = await finishMatch(services, veteran, setup, r!.input, r!.replay);
      expect(out.save?.matchesPlayed).toBe(13);
      expect(services.saveStore.loadReplays()).toHaveLength(1);
      battle.dispose();
    }, 30_000);
  }
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
