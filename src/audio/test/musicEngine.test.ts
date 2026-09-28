import { describe, expect, it } from 'vitest';
import { midiToHz } from '../instruments';
import { music, type MusicDef } from '../music';
import { MusicEngine } from '../musicEngine';
import type { Score } from '../sequencer';
import { FakeBufferSource, FakeContext, FakeGain, FakeOscillator } from './fakeContext';

/** A one-bar test score: a base note every beat, an intensity note on beat 3, overdrive 8 BPM. */
function testScore(extra: Partial<Score> = {}): Score {
  return {
    bpm: 120,
    stepsPerBeat: 4,
    lengthSteps: 16,
    loop: true,
    overdriveBpm: 8,
    tracks: [
      { name: 'base', instrument: 'sub', layer: 'base', notes: [0, 4, 8, 12].map((step) => ({ step, len: 2, midi: 60, vel: 1 })) },
      { name: 'extra', instrument: 'sub', layer: 'intensity', notes: [{ step: 8, len: 2, midi: 72, vel: 1 }] },
      { name: 'drum', instrument: 'kick', layer: 'base', pitched: false, notes: [{ step: 0, len: 1, midi: 60, vel: 1 }] },
    ],
    ...extra,
  };
}

const manifest: Record<string, MusicDef> = {
  'music.stone': { kind: 'seq', score: testScore(), role: 'battle' },
  'music.medieval': { kind: 'seq', score: testScore(), role: 'battle' },
  'music.menu': { kind: 'seq', score: testScore({ overdriveBpm: 0 }), role: 'menu' },
  'stinger.victory': { kind: 'seq', score: testScore({ loop: false, lengthSteps: 8 }), role: 'stinger' },
};

function setup(m: Record<string, MusicDef> = manifest): { ctx: FakeContext; engine: MusicEngine; out: FakeGain } {
  const ctx = new FakeContext();
  ctx.state = 'running';
  const out = ctx.createGain();
  const engine = new MusicEngine(ctx as unknown as BaseAudioContext, out as unknown as AudioNode, { manifest: m, warn: () => undefined });
  return { ctx, engine, out };
}

/** Start frequencies of oscillators started in [from, to). */
function freqs(ctx: FakeContext, from = 0, to = Infinity): number[] {
  return ctx
    .of(FakeOscillator)
    .filter((o) => o.startedAt !== null && o.startedAt >= from && o.startedAt < to && o.type === 'sine' && o.frequency.events[0]?.kind === 'set')
    .map((o) => Math.round((o.frequency.events[0]!.value as number) * 100) / 100);
}

function run(ctx: FakeContext, engine: MusicEngine, seconds: number, dt = 0.025): void {
  for (let t = 0; t < seconds; t += dt) {
    ctx.advance(dt);
    engine.update();
  }
}

describe('music engine', () => {
  it('schedules a cue ahead of time and keeps going', () => {
    const { ctx, engine } = setup();
    expect(engine.setCue('music.stone', 0)).toBe(true);
    expect(engine.cue).toBe('music.stone');
    run(ctx, engine, 2);
    // 4 base notes per 2 s bar at 120 BPM (plus a kick): one pass in 2 s.
    expect(freqs(ctx).filter((f) => f === Math.round(midiToHz(60) * 100) / 100).length).toBeGreaterThanOrEqual(4);
    // Nothing is scheduled more than the look-ahead into the future.
    const latest = Math.max(...ctx.of(FakeOscillator).map((o) => o.startedAt ?? 0));
    expect(latest).toBeLessThanOrEqual(ctx.currentTime + 0.21);
  });

  it('ignores a repeated setCue for the cue already playing', () => {
    const { ctx, engine } = setup();
    engine.setCue('music.stone', 0);
    run(ctx, engine, 0.5);
    engine.setCue('music.stone', 600);
    expect(engine.playing).toHaveLength(1);
    expect(engine.playing[0]!.fading).toBe(false);
  });

  it('switches battle arrangements on the same step (an evolve keeps the melody going)', () => {
    const { ctx, engine } = setup();
    engine.setCue('music.stone', 0);
    run(ctx, engine, 0.7);
    const before = engine.playing[0]!;
    engine.setCue('music.medieval', 600);
    const [old, next] = engine.playing;
    expect(old!.fading).toBe(true);
    expect(next!.cue).toBe('music.medieval');
    // The new arrangement continues where the old one would have scheduled next.
    expect(next!.step! - 0).toBeGreaterThanOrEqual(before.step!);
    expect(Math.abs(next!.nextTime! - old!.nextTime!)).toBeLessThan(1e-9);
    run(ctx, engine, 1);
    expect(engine.playing.map((p) => p.cue)).toEqual(['music.medieval']);
  });

  it('transposes pitched tracks by the total semitones, not the drums', () => {
    const { ctx, engine } = setup();
    engine.setCue('music.stone', 0);
    run(ctx, engine, 0.3);
    engine.transpose(2);
    const t0 = ctx.currentTime + 0.25;
    run(ctx, engine, 2.2);
    const later = freqs(ctx, t0);
    expect(later).toContain(Math.round(midiToHz(62) * 100) / 100);
    expect(later).not.toContain(Math.round(midiToHz(60) * 100) / 100);
    // The kick keeps its fixed pitch (50 Hz × its drop start).
    const kicks = ctx.of(FakeOscillator).filter((o) => o.frequency.events.some((e) => e.kind === 'exp' && e.value === 50));
    expect(kicks.length).toBeGreaterThan(0);
  });

  it('keeps layers and key into the next battle cue and a stinger, resets them otherwise', () => {
    const { engine } = setup();
    engine.setCue('music.stone', 0);
    engine.transpose(2);
    engine.setLayer('siege', 1);
    engine.setCue('music.medieval', 600);
    expect(engine.state.transpose).toBe(2);
    expect(engine.state.layers.siege).toBe(1);
    engine.setCue('stinger.victory', 300);
    expect(engine.state.transpose).toBe(2);
    engine.setCue('music.menu', 600);
    expect(engine.state.transpose).toBe(0);
    expect(engine.state.layers.siege).toBe(0);
    // A new battle after a stinger starts fresh too.
    engine.setCue('music.stone', 0);
    engine.transpose(5);
    engine.setCue('stinger.victory', 300);
    engine.setCue('music.stone', 0);
    expect(engine.state.transpose).toBe(0);
    // So does a battle after stop() (a quit match), even on the same cue.
    engine.transpose(4);
    engine.setLayer('overdrive', 1);
    engine.stop(100);
    engine.setCue('music.stone', 0);
    expect(engine.state.transpose).toBe(0);
    expect(engine.state.layers.overdrive).toBe(0);
  });

  it('schedules a layer only while it is up, and Overdrive adds 8 BPM', () => {
    const { ctx, engine } = setup();
    engine.setCue('music.stone', 0);
    run(ctx, engine, 2.1);
    const high = Math.round(midiToHz(72) * 100) / 100;
    expect(freqs(ctx)).not.toContain(high);
    engine.setLayer('intensity', 1);
    run(ctx, engine, 2.1);
    expect(freqs(ctx)).toContain(high);
    expect(engine.playing[0]!.bpm).toBe(120);
    engine.setLayer('overdrive', 1);
    expect(engine.playing[0]!.bpm).toBe(128);
    engine.setLayer('overdrive', 0.5);
    expect(engine.playing[0]!.bpm).toBe(124);
    engine.setLayer('overdrive', 7);
    expect(engine.state.layers.overdrive).toBe(1);
  });

  it('plays a stinger once and then goes quiet', () => {
    const { ctx, engine } = setup();
    engine.setCue('stinger.victory', 0);
    run(ctx, engine, 3);
    expect(engine.cue).toBeNull();
    expect(engine.active).toBe(false);
    // It can play again for the next match.
    expect(engine.setCue('stinger.victory', 0)).toBe(true);
    expect(engine.cue).toBe('stinger.victory');
  });

  it('stops with a fade', () => {
    const { ctx, engine } = setup();
    engine.setCue('music.stone', 0);
    run(ctx, engine, 0.5);
    engine.stop(300);
    expect(engine.cue).toBeNull();
    expect(engine.playing[0]!.fading).toBe(true);
    run(ctx, engine, 0.5);
    expect(engine.active).toBe(false);
  });

  it('skips missed steps after a stall instead of bursting', () => {
    const { ctx, engine } = setup();
    engine.setCue('music.stone', 0);
    run(ctx, engine, 0.5);
    const before = ctx.of(FakeOscillator).length;
    ctx.advance(30);
    engine.update();
    // Only the look-ahead window is scheduled (a few notes), not 30 s of music.
    expect(ctx.of(FakeOscillator).length - before).toBeLessThan(10);
  });

  it('warns once and refuses unknown cues', () => {
    const warns: string[] = [];
    const ctx = new FakeContext();
    const engine = new MusicEngine(ctx as unknown as BaseAudioContext, ctx.createGain() as unknown as AudioNode, { manifest, warn: (m) => warns.push(m) });
    expect(engine.setCue('music.nope', 0)).toBe(false);
    expect(engine.setCue('music.nope', 0)).toBe(false);
    expect(warns).toHaveLength(1);
  });

  it('plays a composed file cue with layer stems (B7: any cue can point to a file)', async () => {
    const ctx = new FakeContext();
    ctx.state = 'running';
    const loaded: string[] = [];
    const m: Record<string, MusicDef> = {
      ...manifest,
      'music.future': { kind: 'file', src: 'future.ogg', layers: { siege: 'future-siege.ogg' }, role: 'battle' },
      'stinger.defeat': { kind: 'file', src: 'defeat.ogg', role: 'stinger' },
    };
    const engine = new MusicEngine(ctx as unknown as BaseAudioContext, ctx.createGain() as unknown as AudioNode, {
      manifest: m,
      warn: () => undefined,
      loadFile: (src) => {
        loaded.push(src);
        return Promise.resolve(ctx.createBuffer(1, 48000, 48000) as unknown as AudioBuffer);
      },
    });
    const fileSources = (): FakeBufferSource[] => ctx.of(FakeBufferSource).filter((s) => s.buffer?.length === 48000);

    expect(engine.setCue('music.future', 0)).toBe(true);
    engine.setLayer('siege', 0.5);
    await new Promise((r) => setTimeout(r, 0));
    expect(loaded).toEqual(['future.ogg', 'future-siege.ogg']);
    const [main, stem] = fileSources();
    expect(main!.loop && stem!.loop).toBe(true);
    // The stem plays at its layer's level and follows it.
    const stemGain = stem!.outputs[0] as FakeGain;
    expect(stemGain.gain.value).toBe(0.5);
    engine.setLayer('siege', 1);
    expect(stemGain.gain.events.at(-1)).toMatchObject({ kind: 'target', value: 1 });

    // A file stinger plays once, the battle file fades out, and the engine goes quiet at the end.
    engine.setCue('stinger.defeat', 300);
    expect(main!.stoppedAt).not.toBeNull();
    await new Promise((r) => setTimeout(r, 0));
    const stinger = fileSources()[2]!;
    expect(stinger.loop).toBe(false);
    run(ctx, engine, 1.5);
    expect(engine.cue).toBeNull();
    expect(engine.active).toBe(false);
  });

  it('refuses a file cue when there is no file loader', () => {
    const warns: string[] = [];
    const ctx = new FakeContext();
    const m: Record<string, MusicDef> = { 'music.menu': { kind: 'file', src: 'menu.ogg', role: 'menu' } };
    const engine = new MusicEngine(ctx as unknown as BaseAudioContext, ctx.createGain() as unknown as AudioNode, { manifest: m, warn: (w) => warns.push(w) });
    expect(engine.setCue('music.menu', 0)).toBe(false);
    expect(warns).toEqual(['No file loader for music cue "music.menu"']);
  });

  it('pumps the Future arrangement on every beat (A13 sidechain pump)', () => {
    const { ctx, engine } = setup(music as Record<string, MusicDef>);
    engine.setCue('music.future', 0);
    run(ctx, engine, 1.5);
    const depth = (music['music.future'] as { score: Score }).score.pump!.depth;
    const pump = ctx.of(FakeGain).find(
      (g) => g.gain.events.filter((e) => e.kind === 'set' && Math.abs((e.value ?? 0) - (1 - depth)) < 1e-9).length >= 2 && g.gain.events.some((e) => e.kind === 'target' && e.value === 1),
    );
    expect(pump).toBeDefined();
    const dips = pump!.gain.events.filter((e) => e.kind === 'set').map((e) => e.time);
    for (let k = 1; k < dips.length; k++) expect(dips[k]! - dips[k - 1]!).toBeCloseTo(60 / 110, 6);
  });

  it('plays every real cue in the manifest without errors', () => {
    const { ctx, engine } = setup(music as Record<string, MusicDef>);
    for (const cue of Object.keys(music)) {
      const before = ctx.of(FakeOscillator).length;
      expect(engine.setCue(cue, 100), cue).toBe(true);
      engine.setLayer('intensity', 1);
      engine.setLayer('overdrive', 1);
      engine.setLayer('siege', 1);
      run(ctx, engine, 1.5);
      expect(ctx.of(FakeOscillator).length - before, cue).toBeGreaterThan(3);
    }
  });
});
