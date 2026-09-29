import { describe, expect, it } from 'vitest';
import type { ArtProvider, AudioService, Clock, CompiledContent, SaveStore, Sim, SimEvent } from './index';

// Every contract module (type-only at runtime, so they must load as empty modules).
const contractModules = import.meta.glob(['./*.ts', '!./*.test.ts']);
const expectedModules = [
  'ids', 'content', 'commands', 'events', 'sim', 'observation', 'bot', 'art', 'audio', 'hud',
  'save', 'meta', 'session', 'platform', 'feel', 'i18n', 'index',
];

describe('contracts', () => {
  it('has every B14/B15 contract module, and each loads without runtime exports', async () => {
    const names = Object.keys(contractModules).map((p) => p.replace('./', '').replace('.ts', '')).sort();
    expect(names).toEqual([...expectedModules].sort());
    for (const load of Object.values(contractModules)) {
      const mod = (await load()) as Record<string, unknown>;
      expect(Object.keys(mod)).toEqual([]);
    }
  });
});

describe('fakes', () => {
  it('fake content: 2 ages x 3 units, frozen, shape-correct', async () => {
    const { fakeContent, FAKE_AGES, fakeLoadouts, fakeSideConfig } = await import('./fakes/content');
    const c: CompiledContent = fakeContent;
    expect(Object.isFrozen(c)).toBe(true);
    expect(FAKE_AGES).toEqual(['stone', 'medieval']);
    for (const age of FAKE_AGES) {
      expect(Object.values(c.units).filter((u) => u.age === age)).toHaveLength(3);
      const lo = fakeLoadouts[age as 'stone' | 'medieval'];
      // six troops per battle (A18.9)
      expect(lo.units).toHaveLength(6);
      expect(lo.turrets).toHaveLength(2);
      for (const id of lo.units) if (id) expect(c.units[id]?.age).toBe(age);
      for (const id of lo.turrets) if (id) expect(c.turrets[id]?.age).toBe(age);
      for (const id of [lo.powers.home, lo.powers.field]) if (id) expect(c.powers[id]?.age).toBe(age);
      if (lo.powers.home) expect(c.powers[lo.powers.home]?.slot).toBe('home');
      if (lo.powers.field) expect(c.powers[lo.powers.field]?.slot).toBe('field');
    }
    for (const u of Object.values(c.units)) {
      for (const a of u.attacks) expect(typeof a.hitsAir).toBe('boolean');
    }
    expect(fakeSideConfig({ isBot: true }).isBot).toBe(true);
  });

  it('fake art provider draws rectangles and records calls', async () => {
    const { FakeArtProvider } = await import('./fakes/art');
    const art = new FakeArtProvider();
    const provider: ArtProvider = art;
    await provider.preload(['stone']);
    const unit = provider.createUnit({ visualId: 'unit.bonker', side: 0, teamPreset: 'default' });
    unit.setPose({
      x: 100, y: 0, facing: -1, hpBp: 10000, shieldBp: 0, stunned: false, frozen: false, alpha: 1,
      levelTrim: 'none', roleGlyph: 'infantry',
    });
    unit.play('attack', { impactAtMs: 200 });
    expect(unit.root.x).toBe(100);
    expect(unit.root.children.length).toBeGreaterThan(0);
    const base = provider.createBase({ age: 'stone', side: 1, teamPreset: 'default' });
    expect(base.mountPoints()).toHaveLength(4);
    base.morphTo('medieval', 500);
    const fx = provider.createProjectile('proj.rock', 0);
    fx.fly({ x: 0, y: 0 }, { x: 100, y: 0 }, 100, false);
    expect(fx.done).toBe(false);
    fx.update(150);
    expect(fx.done).toBe(true);
    expect(await provider.portrait({ card: 'bonker', size: 64 })).toMatch(/^data:image\/png/);
    expect(art.calls.map((c) => c.method)).toEqual(['preload', 'createUnit', 'createBase', 'createProjectile', 'portrait']);
    unit.destroy();
    base.destroy();
    fx.destroy();
  });

  it('fake audio records calls in order', async () => {
    const { FakeAudio } = await import('./fakes/audio');
    const fa = new FakeAudio();
    const audio: AudioService = fa;
    await audio.unlock();
    audio.play('swing_whoosh');
    audio.music.setCue('music.stone', { fadeMs: 500 });
    audio.music.duck(-6, 200);
    expect(fa.played()).toEqual(['swing_whoosh']);
    expect(fa.calls.map((c) => c.method)).toEqual(['unlock', 'play', 'music.setCue', 'music.duck']);
  });

  it('in-memory save store round-trips docs, export codes and the replay ring', async () => {
    const { InMemorySaveStore, fakeSaveDoc, FAKE_REPLAY_RING } = await import('./fakes/saveStore');
    const { FakeSim, drainFakeSim } = await import('./fakes/sim');
    const fs = new InMemorySaveStore();
    const store: SaveStore = fs;
    expect(await store.load()).toBeNull();
    const doc = fakeSaveDoc({ profile: { name: 'Æblegrød ✓', avatar: { seed: 1, parts: {} }, banner: '', frame: '', title: '' } });
    await store.save(doc, { immediate: true });
    const loaded = await store.load();
    expect(loaded).toEqual(doc);
    expect(loaded).not.toBe(doc);
    const code = store.exportCode(doc);
    const back = store.importCode(code);
    expect(back.ok && back.value).toEqual(doc);
    expect(store.importCode('garbage').ok).toBe(false);
    const sim = new FakeSim();
    const { outcome } = drainFakeSim(sim);
    const replay = {
      v: 1 as const, simVersion: 'fake', contentHash: sim.config.content.hash, seed: 1, format: sim.config.format,
      sides: sim.config.sides, modifiers: [], training: null, commands: [], result: outcome!, finalHash: sim.hash(),
      hashes: sim.state.hashes,
    };
    for (let i = 0; i < FAKE_REPLAY_RING + 5; i++) store.pushReplay({ ...replay, seed: i });
    const replays = store.loadReplays();
    expect(replays).toHaveLength(FAKE_REPLAY_RING);
    expect(replays[0]!.seed).toBe(5);
  });

  it('fixed clock only moves when told', async () => {
    const { FixedClock, FAKE_EPOCH_MS } = await import('./fakes/clock');
    const fc = new FixedClock();
    const clock: Clock = fc;
    expect(clock.now()).toBe(FAKE_EPOCH_MS);
    expect(clock.now()).toBe(FAKE_EPOCH_MS);
    fc.advance(1000);
    expect(clock.now()).toBe(FAKE_EPOCH_MS + 1000);
  });

  it('fake sim replays the canned stream tick by tick, deterministically', async () => {
    const { FakeSim, cannedBattleEvents, drainFakeSim } = await import('./fakes/sim');
    const a = new FakeSim();
    const sim: Sim = a;
    const first = sim.step([{ t: 'train', side: 0, slot: 0, tick: 1, seq: 0 }]);
    expect(first.every((e) => e.tick === 1)).toBe(true);
    expect(first.map((e) => e.e)).toEqual(['unitSpawned', 'unitSpawned', 'queueChanged']);
    expect(sim.state.units.map((u) => u.card)).toEqual(['bonker', 'pebbler']);
    expect(a.received).toHaveLength(1);
    const obs = sim.observe(1);
    // Side 1 sees positions from its own base: lane 2,000,000 (A17.2) minus x 700,000.
    expect(obs.units.find((u) => u.id === 2)?.p).toBe(1_300_000);
    expect(obs.me.tray[0]).toBe('bonker');

    const rest = drainFakeSim(a);
    const all: SimEvent[] = [...first, ...rest.events];
    expect(all).toHaveLength(cannedBattleEvents.length);
    expect(rest.outcome?.winner).toBe(0);
    expect(sim.state.phase).toBe('ended');
    // The canned evolve goes to Medieval, index 2 of the eight ages (A17.8; the fake has no Bronze cards).
    expect(sim.state.sides[0].ageIndex).toBe(2);
    expect(sim.state.units.map((u) => u.id)).toEqual([1, 4, 5]);

    const b = new FakeSim();
    drainFakeSim(b);
    expect(b.hash()).toBe(a.hash());
    expect(b.state.hashes).toEqual(a.state.hashes);
  });
});
