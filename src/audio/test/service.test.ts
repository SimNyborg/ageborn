import type { AudioService } from '@/contracts';
import { describe, expect, it } from 'vitest';
import { SFX_SAMPLE_RATE } from '../bank';
import { MIX_TRIM } from '../mixer';
import { createWebAudioService, WebAudioService, type WebAudioServiceOptions } from '../service';
import { BOOT_GROUPS, SOUND_IDS, sounds, type SoundDef } from '../sounds';
import { FakeBufferSource, FakeContext, type FakeGain, FakeOscillator, FakePanner } from './fakeContext';

function make(o: WebAudioServiceOptions = {}): { svc: WebAudioService; ctx: FakeContext; warns: string[] } {
  const ctx = new FakeContext();
  const warns: string[] = [];
  const svc = new WebAudioService({
    createContext: () => ctx.asAudioContext(),
    scheduler: 'manual',
    random: () => 0.5,
    gestureTarget: null,
    warn: (m) => warns.push(m),
    ...o,
  });
  return { svc, ctx, warns };
}

async function unlocked(o: WebAudioServiceOptions = {}): Promise<{ svc: WebAudioService; ctx: FakeContext; warns: string[] }> {
  const r = make(o);
  await r.svc.unlock();
  return r;
}

/** The gain node an effect source feeds, and what that feeds. */
function chain(src: FakeBufferSource): { gain: FakeGain; next: unknown } {
  const gain = src.outputs[0] as FakeGain;
  return { gain, next: gain.outputs[0] };
}

describe('WebAudioService', () => {
  it('implements the AudioService contract', () => {
    const svc: AudioService = make().svc;
    expect(typeof svc.play).toBe('function');
    expect(typeof svc.music.setCue).toBe('function');
  });

  it('creates and resumes the context on unlock, with the iOS silent blip', async () => {
    const { svc, ctx } = make();
    expect(svc.state).toBe('locked');
    const p = svc.unlock();
    // resume() and the one-sample buffer happen synchronously inside the gesture.
    expect(ctx.resumeCalls).toBe(1);
    expect(ctx.of(FakeBufferSource).some((s) => s.buffer?.length === 1 && s.startedAt !== null)).toBe(true);
    await p;
    expect(svc.state).toBe('running');
    // A second unlock is a no-op.
    await svc.unlock();
    expect(ctx.resumeCalls).toBe(1);
  });

  it('resolves unlock even without Web Audio (silent game rather than a crash)', async () => {
    const svc = new WebAudioService({ createContext: () => null, scheduler: 'manual' });
    await expect(svc.unlock()).resolves.toBeUndefined();
    expect(() => svc.play('ui_click')).not.toThrow();
    expect(svc.stats.dropped.locked).toBe(1);
  });

  it('drops effects before unlock', () => {
    const { svc, ctx } = make();
    svc.play('ui_click');
    expect(ctx.effectSources()).toHaveLength(0);
    expect(svc.stats.dropped.locked).toBe(1);
  });

  it('plays an effect on its bus with the 32 kHz pre-rendered buffer', async () => {
    const { svc, ctx } = await unlocked();
    svc.play('hit_blunt');
    svc.play('ui_click');
    const [hit, click] = ctx.effectSources();
    expect(hit!.buffer!.sampleRate).toBe(SFX_SAMPLE_RATE);
    expect(hit!.startedAt).toBe(ctx.currentTime);
    expect(chain(hit!).next).toBe(svc.mixer!.input('sfx'));
    expect(chain(click!).next).toBe(svc.mixer!.input('ui'));
    expect(svc.stats.started).toBe(2);
  });

  it('varies pitch within ±8% and volume within ±3 dB per play', async () => {
    let r = 0;
    const seq = [0, 1, 0.999, 0];
    const { svc, ctx } = await unlocked({ random: () => seq[r++ % seq.length]! });
    for (let k = 0; k < 8; k++) {
      svc.play('hit_slash');
      ctx.advance(0.05);
    }
    for (const s of ctx.effectSources()) {
      expect(s.playbackRate.value).toBeGreaterThanOrEqual(0.92);
      expect(s.playbackRate.value).toBeLessThanOrEqual(1.08);
      const g = chain(s).gain.gain.value;
      expect(g).toBeGreaterThanOrEqual(10 ** (-3 / 20) - 1e-9);
      expect(g).toBeLessThanOrEqual(10 ** (3 / 20) + 1e-9);
    }
  });

  it('applies pitchBp, volumeDb and pan', async () => {
    const { svc, ctx } = await unlocked();
    svc.play('shot_bow', { pitchBp: 12000, volumeDb: -6, pan: -0.5 });
    const s = ctx.effectSources()[0]!;
    // random 0.5 means no random variation.
    expect(s.playbackRate.value).toBeCloseTo(1.2, 9);
    expect(chain(s).gain.gain.value).toBeCloseTo(10 ** (-6 / 20), 9);
    const panner = ctx.of(FakePanner)[0]!;
    expect(panner.pan.value).toBe(-0.5);
    expect(panner.outputs[0]).toBe(svc.mixer!.input('sfx'));
  });

  it('keeps musical sounds in tune', async () => {
    const { svc, ctx } = await unlocked({ random: () => 0.99 });
    svc.play('rarity_epic');
    expect(ctx.effectSources()[0]!.playbackRate.value).toBe(1);
  });

  it('limits a sound id to 4 voices and 40 ms retriggers (A13)', async () => {
    const { svc, ctx } = await unlocked();
    svc.play('explosion_m');
    svc.play('explosion_m');
    expect(svc.stats.dropped.gap).toBe(1);
    for (let k = 0; k < 4; k++) {
      ctx.advance(0.045);
      svc.play('explosion_m');
    }
    // The fifth voice stole the oldest.
    expect(svc.stats.stolen).toBe(1);
    const sources = ctx.effectSources();
    expect(sources[0]!.stoppedAt).not.toBeNull();
    expect(svc.stats.voices).toBe(4);
  });

  it('lets player-caused sounds (higher priority) through a gap', async () => {
    const { svc, ctx } = await unlocked();
    svc.play('shot_sling');
    svc.play('shot_sling', { priority: 1 });
    expect(ctx.effectSources()).toHaveLength(2);
  });

  it('keeps at most the global voice cap and frees voices when they end', async () => {
    const { svc, ctx } = await unlocked({ maxVoices: 6 });
    const ids = ['hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser', 'hit_heavy', 'hit_effective', 'explosion_s'];
    for (let k = 0; k < 40; k++) svc.play(ids[k % ids.length]!);
    expect(svc.stats.voices).toBe(6);
    ctx.advance(5);
    svc.play('ui_click');
    expect(svc.stats.voices).toBe(1);
  });

  it('warns once about unknown sound ids', async () => {
    const { svc, warns } = await unlocked();
    svc.play('nope');
    svc.play('nope');
    expect(warns).toEqual(['Unknown sound id "nope"']);
    expect(svc.stats.dropped.unknown).toBe(2);
  });

  it('applies bus volumes set before unlock, on the square taper', async () => {
    const { svc } = make();
    svc.setBusVolume('sfx', 0.5);
    svc.setBusVolume('music', 0);
    await svc.unlock();
    expect((svc.mixer!.bus.sfx.gain as unknown as { last: number }).last).toBeCloseTo(MIX_TRIM.sfx * 0.25, 9);
    expect((svc.mixer!.bus.music.gain as unknown as { last: number }).last).toBe(0);
    svc.setBusVolume('ui', 2);
    expect(svc.getBusVolume('ui')).toBe(1);
  });

  it('remembers the music cue, layers and key asked for before unlock', async () => {
    const { svc, ctx } = make();
    svc.music.setCue('music.medieval', { fadeMs: 0 });
    svc.music.transpose(2);
    svc.music.setLayer('overdrive', 1);
    expect(svc.cue).toBe('music.medieval');
    await svc.unlock();
    expect(svc.engine!.cue).toBe('music.medieval');
    expect(svc.engine!.state.transpose).toBe(2);
    expect(svc.engine!.state.layers.overdrive).toBe(1);
    svc.tick();
    expect(ctx.of(FakeOscillator).length).toBeGreaterThan(0);
  });

  it('forwards music calls once unlocked', async () => {
    const { svc } = await unlocked();
    svc.music.setCue('music.stone');
    svc.music.setLayer('intensity', 0.4);
    svc.music.transpose(4);
    expect(svc.engine!.cue).toBe('music.stone');
    expect(svc.engine!.state).toEqual({ layers: { intensity: 0.4, overdrive: 0, siege: 0 }, transpose: 4 });
    svc.music.stop(100);
    expect(svc.cue).toBeNull();
    svc.music.setCue('music.nope');
    expect(svc.engine!.cue).toBeNull();
  });

  it('ducks music 6 dB for the requested time', async () => {
    const { svc } = await unlocked();
    svc.music.duck(-6, 1500);
    const ev = (svc.mixer!.duckGain.gain as unknown as { events: { kind: string; value?: number }[] }).events;
    expect(ev.some((e) => e.kind === 'linear' && Math.abs((e.value ?? 0) - 10 ** (-6 / 20)) < 1e-9)).toBe(true);
  });

  it('renders boot groups up front and the rest lazily in idle slices', () => {
    const queue: (() => void)[] = [];
    const { service, boot } = createWebAudioService({ createContext: () => null, scheduler: 'manual', idle: (t) => queue.push(t) });
    expect(boot!.sounds).toBe(SOUND_IDS.filter((id) => BOOT_GROUPS.includes(sounds[id]!.group)).length);
    for (const id of SOUND_IDS) expect(service.bank.isRendered(id), id).toBe(BOOT_GROUPS.includes(sounds[id]!.group));
    let slices = 0;
    while (queue.length > 0 && slices < 1000) {
      queue.shift()!();
      slices++;
    }
    expect(slices).toBeGreaterThan(1);
    for (const id of SOUND_IDS) expect(service.bank.isRendered(id), id).toBe(true);
  });

  it('renders a sound that is not ready yet on first use', async () => {
    const { svc, ctx } = await unlocked();
    expect(svc.bank.isRendered('pw_lance')).toBe(false);
    svc.play('pw_lance');
    expect(ctx.effectSources()).toHaveLength(1);
    // The samples moved into the AudioBuffers; the bank keeps no second copy.
    expect(svc.bank.isRendered('pw_lance')).toBe(false);
  });

  it('plays file sounds once they are loaded (manifest can switch any id to a file)', async () => {
    const custom: Record<string, SoundDef> = { ...sounds, ui_click: { kind: 'file', src: 'click.ogg', bus: 'ui', group: 'ui' } };
    const fetched: string[] = [];
    const { svc, ctx } = await unlocked({
      sounds: custom,
      fetchFile: (src) => {
        fetched.push(src);
        return Promise.resolve(new ArrayBuffer(8));
      },
    });
    svc.play('ui_click');
    expect(svc.stats.dropped.loading).toBe(1);
    await new Promise((r) => setTimeout(r, 0));
    ctx.advance(0.1);
    svc.play('ui_click');
    expect(fetched).toEqual(['click.ogg']);
    expect(ctx.effectSources()).toHaveLength(1);
  });

  it('resumes after an interruption on the next gesture', async () => {
    const target = new EventTarget();
    const { svc, ctx } = await unlocked({ gestureTarget: target });
    ctx.setState('suspended');
    expect(svc.state).toBe('suspended');
    target.dispatchEvent(new Event('pointerdown'));
    await Promise.resolve();
    expect(svc.state).toBe('running');
    expect(ctx.resumeCalls).toBe(2);
  });

  it('disposes cleanly', async () => {
    const { svc, ctx } = await unlocked();
    svc.music.setCue('music.stone');
    svc.dispose();
    expect(ctx.state).toBe('closed');
    expect(svc.state).toBe('locked');
  });
});
