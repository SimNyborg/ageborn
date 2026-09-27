import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { FakeAudio } from '@/contracts/fakes/audio';
import { FixedClock } from '@/contracts/fakes/clock';
import { InMemorySaveStore, fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { NonePlatform } from '@/platform';
import { boot, bootFlags, unlockAudioOnGesture } from '../boot';
import { buildServices, FAKE_CHOICE, type Services } from '../services';
import { fakeMeta } from './helpers';

async function services(o: Partial<Services> = {}): Promise<Services> {
  const base = await buildServices({ choice: FAKE_CHOICE, clock: new FixedClock() });
  return { ...base, ...o };
}

describe('boot (DESIGN B11)', () => {
  it('runs the six steps in order and routes a first launch to the tutorial', async () => {
    const s = await services();
    const idle: (() => void)[] = [];
    const b = await boot({ search: '', services: s, idle: (t) => idle.push(t) });
    expect(b.steps).toEqual(['save', 'settings', 'platform', 'pixi', 'art', 'audio', 'route']);
    expect(b.route).toBe('tutorial');
    expect(b.save).toBeNull();
    expect((s.platform as NonePlatform).initialized).toBe(true);
    expect((s.platform as NonePlatform).loaded).toBe(true);
    // Stone and Medieval bake at boot; the rest waits for idle time (B5).
    const art = b.art as unknown as { preloaded: Set<string> };
    expect([...art.preloaded]).toEqual(['stone', 'medieval']);
    idle.forEach((t) => t());
    await Promise.resolve();
    expect([...art.preloaded]).toEqual(['stone', 'medieval', 'gunpowder', 'modern', 'future']);
    expect(s.eventLog.entries().at(-1)).toMatchObject({ kind: 'boot', id: 'tutorial' });
  });

  it('applies the saved settings and routes a finished onboarding Home', async () => {
    const audio = new FakeAudio();
    const save = fakeSaveDoc({ tutorial: { step: 4, hintsShown: {} } });
    save.settings.volume = { master: 0.5, music: 0.2, sfx: 1, ui: 0.8 };
    const s = await services({ audio, saveStore: new InMemorySaveStore(save) });
    const b = await boot({ search: '', services: s, idle: () => undefined });
    expect(b.route).toBe('home');
    expect(audio.busVolume).toEqual({ master: 0.5, music: 0.2, sfx: 1, ui: 0.8 });
  });

  it('creates and stores a new save on first launch once meta is wired', async () => {
    const store = new InMemorySaveStore();
    const meta = { ...fakeMeta(content), newSave: () => fakeSaveDoc() };
    const s = await services({ meta, saveStore: store });
    const b = await boot({ search: '', services: s, idle: () => undefined });
    expect(b.save).not.toBeNull();
    expect(store.immediateSaves).toBe(1);
  });

  it('reads the autopilot flag only in dev mode', () => {
    expect(bootFlags('?dev=1&autopilot=1')).toEqual({ autopilot: true });
    expect(bootFlags('?autopilot=1')).toEqual({ autopilot: false });
  });

  it('unlocks audio on the first gesture only', async () => {
    const audio = new FakeAudio();
    const target = new EventTarget();
    unlockAudioOnGesture(audio, target);
    target.dispatchEvent(new Event('pointerdown'));
    target.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    expect(audio.calls.filter((c) => c.method === 'unlock')).toHaveLength(1);
  });
});
