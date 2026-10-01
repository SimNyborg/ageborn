import { describe, expect, it } from 'vitest';
import { content } from '@/content';
import { FakeAudio } from '@/contracts/fakes/audio';
import { FixedClock } from '@/contracts/fakes/clock';
import { InMemorySaveStore, fakeSaveDoc } from '@/contracts/fakes/saveStore';
import { type NonePlatform } from '@/platform';
import { boot, bootFlags, unlockAudioOnGesture } from '../boot';
import { buildServices, FAKE_CHOICE, type Services } from '../services';
import { fakeMeta } from './helpers';

async function services(o: Partial<Services> = {}): Promise<Services> {
  const base = await buildServices({ choice: FAKE_CHOICE, clock: new FixedClock() });
  return { ...base, ...o };
}

describe('boot (DESIGN B11)', () => {
  it('runs the six steps in order and routes a first launch to the War Path map', async () => {
    const s = await services();
    const idle: (() => void)[] = [];
    const b = await boot({ search: '', services: s, idle: (t) => idle.push(t) });
    expect(b.steps).toEqual(['save', 'settings', 'platform', 'pixi', 'art', 'audio', 'route']);
    // ui-plan 6.4: the War Path map is Home from the very first launch.
    expect(b.route).toBe('home');
    expect(b.save).toBeNull();
    expect((s.platform as NonePlatform).initialized).toBe(true);
    expect((s.platform as NonePlatform).loaded).toBe(true);
    // Stone and Bronze start loading at boot (A17.13); the other ages load per match (B16), never in idle time.
    const art = b.art as unknown as { preloaded: Set<string> };
    await b.artReady;
    expect([...art.preloaded]).toEqual(['stone', 'bronze']);
    idle.forEach((t) => t());
    await Promise.resolve();
    expect(idle).toHaveLength(0);
    expect([...art.preloaded]).toEqual(['stone', 'bronze']);
    expect(s.eventLog.entries().at(-1)).toMatchObject({ kind: 'boot', id: 'home' });
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

  it('returns before the battle art has loaded when Home is the start screen (perf audit 2026-10-01)', async () => {
    const s = await services();
    let release: () => void = () => undefined;
    const art = { preload: () => new Promise<void>((r) => (release = r)) };
    const s2 = { ...s, createArt: () => art as unknown as ReturnType<Services['createArt']> };
    const b = await boot({ search: '', services: s2 });
    expect(b.route).toBe('home');
    let done = false;
    void b.artReady.then(() => (done = true));
    await Promise.resolve();
    expect(done).toBe(false);
    release();
    await b.artReady;
    expect(done).toBe(true);
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
    await Promise.resolve();
    // A touch pointerdown carries no user activation: it does not count as the gesture.
    expect(audio.calls.filter((c) => c.method === 'unlock')).toHaveLength(0);
    target.dispatchEvent(new Event('pointerup'));
    target.dispatchEvent(new Event('keydown'));
    await Promise.resolve();
    expect(audio.calls.filter((c) => c.method === 'unlock')).toHaveLength(1);
  });
});
