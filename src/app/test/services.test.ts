import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { FixedClock } from '@/contracts/fakes/clock';
import { NonePlatform } from '@/platform';
import { SIM_VERSION } from '@/sim';
import { createBattle } from '../battle';
import { quickBattle } from '../matchSetup';
import { DEFAULT_CHOICE, FAKE_CHOICE, buildServices, choiceFromUrl, normalizeChoice } from '../services';
import { MemoryKeyValueStore } from '../eventLog';

describe('service choice', () => {
  it('reads ?svc=fake and per-service overrides; a fake sim forces fake content', () => {
    expect(choiceFromUrl('')).toEqual(DEFAULT_CHOICE);
    expect(choiceFromUrl('?svc=fake')).toEqual(FAKE_CHOICE);
    expect(choiceFromUrl('?art=fake&audio=real')).toEqual({ ...DEFAULT_CHOICE, art: 'fake', audio: 'real' });
    expect(choiceFromUrl('?sim=fake')).toMatchObject({ sim: 'fake', content: 'fake' });
    expect(choiceFromUrl('?sim=bogus')).toEqual(DEFAULT_CHOICE);
    expect(normalizeChoice({ ...DEFAULT_CHOICE, sim: 'fake' }).content).toBe('fake');
  });
});

describe('buildServices (B11 boot)', () => {
  it('builds the real content, sim, save, meta and audio by default', async () => {
    const warnings: string[] = [];
    const s = await buildServices({ choice: { ...DEFAULT_CHOICE, audio: 'real' }, warn: (m) => warnings.push(m) });
    expect(s.content).toBe(content);
    expect(s.sim.simVersion).toBe(SIM_VERSION);
    expect(s.choice).toMatchObject({ bots: 'real', meta: 'real', save: 'real', audio: 'real' });
    expect(warnings).toHaveLength(0);
    expect(s.meta).not.toBeNull();
    // Meta works on the game content with the app clock (local 04:00 needs the time zone offset).
    const save = s.meta!.newSave(s.content, s.clock, 1);
    expect(s.meta!.tickTimers(save, s.clock).matchesPlayed).toBe(0);
    expect(s.platform).toBeInstanceOf(NonePlatform);
    expect(typeof s.createArt).toBe('function');
    expect(s.i18n.t('app.play')).toBe('Play');
  });

  it('builds every stand-in with ?svc=fake, and a Quick Battle runs on them', async () => {
    const clock = new FixedClock();
    const s = await buildServices({ choice: FAKE_CHOICE, clock, storage: new MemoryKeyValueStore() });
    expect(s.choice).toEqual(FAKE_CHOICE);
    expect(s.content.hash).toBe('fake-content-v1');
    expect(s.createArt().createBase({ age: 'stone', side: 0, teamPreset: 'default' })).toBeDefined();
    const setup = quickBattle(null, s.content, { generalId: 'kettle', displayName: 'AI', format: 'short', seed: 1 });
    const b = createBattle(s, setup, { save: null });
    b.session.start();
    b.session.fastForward(1000);
    expect(b.session.status.value).toBe('ended');
    expect(s.eventLog.entries().map((e) => e.kind)).toEqual(['matchStart', 'matchEnd']);
    b.dispose();
  });
});
