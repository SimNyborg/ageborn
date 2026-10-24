import type { AudioService } from '@/contracts';
import { describe, expect, it } from 'vitest';
import { SFX_SAMPLE_RATE } from '../bank';
import { BATTLE_SFX_TRIM_DB, MIX_TRIM } from '../mixer';
import { AMBIENCE_CURVE, AMBIENCE_STOP_S, AMBIENCE_TAU_S, AMBIENCE_TRIM_DB, createWebAudioService, stackLimit, WebAudioService, type WebAudioServiceOptions } from '../service';
import { balancePan, BURST_MAX, BURST_SOFT, BURST_STEP_DB, BURST_WINDOW_MS, STACK_JITTER_S, STACK_SPREAD } from '../voices';
import { music as seqMusic } from '../music';
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
    // The ZzFX sounds and sequenced music; the file sheets have their own tests below.
    sfxFiles: null,
    music: seqMusic,
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
    // a battle effect enters the sfx bus through the battle trim (review A, N12)
    expect(chain(hit!).next).toBe(svc.mixer!.battleInput());
    expect(chain(click!).next).toBe(svc.mixer!.input('ui'));
    expect(svc.stats.started).toBe(2);
  });

  it('trims the battle\'s effects by BATTLE_SFX_TRIM_DB before the sfx bus; the capsule show keeps its level (review A, N12)', async () => {
    const { svc, ctx } = await unlocked();
    const m = svc.mixer!;
    expect(m.battleSfx.gain.value).toBeCloseTo(10 ** (BATTLE_SFX_TRIM_DB / 20), 9);
    expect((m.battleSfx as unknown as FakeGain).outputs[0]).toBe(m.input('sfx'));
    svc.play('cap_thud');
    const cap = ctx.effectSources().at(-1)!;
    expect(chain(cap).next).toBe(m.input('sfx'));
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
      // the ZzFX design's own trim (A7: the hits' +3 dB) comes on top of the variation
      const g = chain(s).gain.gain.value / 10 ** ((sounds.hit_slash!.gainDb ?? 0) / 20);
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
    // The balance law (A7): the panner's equal-power value and a gain so the near side stays at the level.
    const law = balancePan(-0.5);
    expect(chain(s).gain.gain.value).toBeCloseTo(10 ** (-6 / 20) * law.gain, 9);
    const panner = ctx.of(FakePanner)[0]!;
    expect(panner.pan.value).toBeCloseTo(law.pan, 9);
    expect(panner.outputs[0]).toBe(svc.mixer!.battleInput());
  });

  it('pans with a balance law: centre as loud as unpanned, the near side kept, the far side fading (A7)', () => {
    // Channel gains of a mono source through StereoPanner (equal power) after the law's gain.
    const channels = (pan: number): [number, number] => {
      const { pan: p, gain } = balancePan(pan);
      const theta = ((p + 1) * Math.PI) / 4;
      return [gain * Math.cos(theta), gain * Math.sin(theta)];
    };
    for (const [l, r] of [channels(1e-9), channels(-1e-9)]) {
      expect(l).toBeCloseTo(1, 6);
      expect(r).toBeCloseTo(1, 6);
    }
    expect(channels(0.6)[0]).toBeCloseTo(0.4, 9);
    expect(channels(0.6)[1]).toBeCloseTo(1, 9);
    expect(channels(-0.6)[0]).toBeCloseTo(1, 9);
    expect(channels(-0.6)[1]).toBeCloseTo(0.4, 9);
    expect(channels(1)[0]).toBeCloseTo(0, 9);
    expect(balancePan(Number.NaN)).toEqual(balancePan(0));
  });

  it('keeps musical sounds in tune', async () => {
    const { svc, ctx } = await unlocked({ random: () => 0.99 });
    svc.play('rarity_epic');
    expect(ctx.effectSources()[0]!.playbackRate.value).toBe(1);
  });

  it('limits a sound id to 4 voices and 40 ms retriggers (A13)', async () => {
    const { svc, ctx } = await unlocked();
    // UI sounds never stack: a second start inside the gap is dropped.
    svc.play('ui_click');
    svc.play('ui_click');
    expect(svc.stats.dropped.gap).toBe(1);
    svc.play('explosion_m');
    for (let k = 0; k < 4; k++) {
      ctx.advance(0.045);
      svc.play('explosion_m');
    }
    // The fifth voice stole the oldest.
    expect(svc.stats.stolen).toBe(1);
    const sources = ctx.effectSources().filter((s) => chain(s).next === svc.mixer!.battleInput());
    expect(sources[0]!.stoppedAt).not.toBeNull();
    expect(svc.stats.voices).toBe(4);
  });

  it('plays two or three identical world hits on one frame as a stack: later, at another pitch, softer (A7)', async () => {
    const { svc, ctx } = await unlocked();
    ctx.advance(1);
    for (let k = 0; k < 4; k++) svc.play('hit_blunt');
    const [a, b, c, ...rest] = ctx.effectSources();
    expect(rest).toHaveLength(0);
    expect(svc.stats.stacked).toBe(2);
    expect(svc.stats.dropped.gap).toBe(1);
    // random 0.5: no per-play variation, so the spread is exactly STACK_SPREAD plus half the jitter.
    expect(a!.startedAt).toBe(1);
    expect(b!.startedAt).toBeCloseTo(1 + STACK_SPREAD[1]!.delayS + STACK_JITTER_S / 2, 9);
    expect(c!.startedAt).toBeCloseTo(1 + STACK_SPREAD[2]!.delayS + STACK_JITTER_S / 2, 9);
    expect([a, b, c].map((s) => s!.playbackRate.value)).toEqual([1, STACK_SPREAD[1]!.rate, STACK_SPREAD[2]!.rate]);
    expect(chain(b!).gain.gain.value).toBeCloseTo(10 ** (STACK_SPREAD[1]!.gainDb / 20) * 10 ** ((sounds.hit_blunt!.gainDb ?? 0) / 20), 9);
    expect(chain(c!).gain.gain.value).toBeCloseTo(10 ** (STACK_SPREAD[2]!.gainDb / 20) * 10 ** ((sounds.hit_blunt!.gainDb ?? 0) / 20), 9);
    // The next frame is past the stack's window but inside the gap: dropped as before.
    ctx.advance(0.025);
    svc.play('hit_blunt');
    expect(svc.stats.dropped.gap).toBe(2);
    ctx.advance(0.02);
    svc.play('hit_blunt');
    expect(ctx.effectSources()).toHaveLength(4);
  });

  it('never stacks sounds that must hold their pitch, nor UI sounds', async () => {
    const { svc, ctx } = await unlocked();
    svc.play('rarity_epic');
    svc.play('rarity_epic');
    svc.play('coin_gain');
    svc.play('coin_gain');
    svc.play('ui_tab');
    svc.play('ui_tab');
    expect(ctx.effectSources()).toHaveLength(3);
    expect(svc.stats.stacked).toBe(0);
    expect(stackLimit(sounds.hit_slash!)).toBe(3);
    expect(stackLimit(sounds.ui_click!)).toBe(1);
    expect(stackLimit(sounds.evolve_riser!)).toBe(1);
  });

  it('softens a busy burst of world effects and caps it, except important cues (A7)', async () => {
    const { svc, ctx } = await unlocked();
    const ids = ['hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser', 'hit_heavy', 'hit_effective', 'explosion_s', 'die_bio', 'die_mech', 'swing_whoosh', 'spawn_pop', 'base_hit'];
    for (const id of ids) svc.play(id);
    const sources = ctx.effectSources();
    expect(sources).toHaveLength(BURST_MAX);
    expect(svc.stats.dropped.burst).toBe(ids.length - BURST_MAX);
    // Each start past BURST_SOFT is one more BURST_STEP_DB softer (the ZzFX trims on top).
    sources.forEach((s, k) => {
      const want = (k >= BURST_SOFT ? BURST_STEP_DB * (k - BURST_SOFT + 1) : 0) + (sounds[ids[k]!]!.gainDb ?? 0);
      expect(20 * Math.log10(chain(s).gain.gain.value), ids[k]).toBeCloseTo(want, 6);
    });
    // UI sounds are not world effects; a priority-2 cue passes a full burst.
    svc.play('ui_click');
    svc.play('base_crumble', { priority: 2 });
    expect(ctx.effectSources()).toHaveLength(BURST_MAX + 2);
    // The burst ends with its window.
    ctx.advance(BURST_WINDOW_MS / 1000 + 0.01);
    svc.play('hit_blunt');
    expect(20 * Math.log10(chain(ctx.effectSources().at(-1)!).gain.gain.value)).toBeCloseTo(sounds.hit_blunt!.gainDb ?? 0, 6);
  });

  it('plays the battle ambience loop at the level the battle view sets, and stops it after silence (A7)', async () => {
    const { svc, ctx } = make();
    svc.setBattleAmbience(1);
    expect(svc.ambiencePlaying).toBe(false);
    await svc.unlock();
    svc.setBattleAmbience(0.5);
    const loops = ctx.of(FakeBufferSource).filter((s) => s.loop);
    expect(loops).toHaveLength(1);
    const loop = loops[0]!;
    // No files here: the ZzFX fallback's first variant loops whole.
    expect(loop.loopStart).toBe(0);
    expect(loop.loopEnd).toBeCloseTo(loop.buffer!.duration, 9);
    const gain = loop.outputs[0] as FakeGain;
    expect(gain.outputs[0]).toBe(svc.mixer!.battleInput());
    expect(gain.gain.events.at(-1)!.value).toBeCloseTo(10 ** (AMBIENCE_TRIM_DB / 20) * 0.5 ** AMBIENCE_CURVE, 9);
    expect(gain.gain.events.at(-1)).toMatchObject({ kind: 'target', tau: AMBIENCE_TAU_S });
    // Updates glide on the same loop; it is not a voice and never counts against the caps.
    svc.setBattleAmbience(0.8);
    expect(ctx.of(FakeBufferSource).filter((s) => s.loop)).toHaveLength(1);
    expect(gain.gain.events.at(-1)!.value).toBeCloseTo(10 ** (AMBIENCE_TRIM_DB / 20) * 0.8 ** AMBIENCE_CURVE, 9);
    expect(svc.stats.voices).toBe(0);
    // Level 0 fades it out; it stops once it has been silent long enough.
    svc.setBattleAmbience(0);
    expect(gain.gain.events.at(-1)).toMatchObject({ kind: 'target', value: 0 });
    ctx.advance(AMBIENCE_STOP_S - 0.5);
    svc.tick();
    expect(svc.ambiencePlaying).toBe(true);
    svc.setBattleAmbience(0);
    ctx.advance(1);
    svc.tick();
    expect(svc.ambiencePlaying).toBe(false);
    expect(loop.stoppedAt).not.toBeNull();
    expect(gain.disconnected).toBe(true);
    // A new level starts a new loop.
    svc.setBattleAmbience(0.3);
    expect(svc.ambiencePlaying).toBe(true);
    svc.setBattleAmbience(Number.NaN);
    expect(svc.battleAmbience).toBe(0);
    svc.dispose();
  });

  it('keeps the 40 ms gap for player-caused sounds too; priority wins the voice caps', async () => {
    const { svc, ctx } = await unlocked();
    svc.play('ui_tab', { priority: 1 });
    svc.play('ui_tab', { priority: 2 });
    expect(ctx.effectSources()).toHaveLength(1);
    expect(svc.stats.dropped.gap).toBe(1);
    svc.play('explosion_m', { priority: 1 });
    // Player voices fill the id cap: an opponent's retrigger cannot steal one, a player's can.
    for (let k = 0; k < 3; k++) {
      ctx.advance(0.041);
      svc.play('explosion_m', { priority: 1 });
    }
    ctx.advance(0.041);
    svc.play('explosion_m');
    expect(svc.stats.dropped.idCap).toBe(1);
    svc.play('explosion_m', { priority: 1 });
    expect(svc.stats.stolen).toBe(1);
    expect(ctx.effectSources()[1]!.stoppedAt).not.toBeNull();
    expect(svc.stats.voices).toBe(4);
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

  it('hands the narrator its voice bus once unlock has made the context (queue item 39)', async () => {
    const { svc } = make();
    svc.setBusVolume('voice', 0.5);
    expect(svc.voiceOut()).toBeNull();
    await svc.unlock();
    const out = svc.voiceOut();
    expect(out?.input).toBe(svc.mixer!.input('voice'));
    expect(out?.ctx).toBe(svc.ctx);
    expect((svc.mixer!.bus.voice.gain as unknown as { last: number }).last).toBeCloseTo(MIX_TRIM.voice * 0.25, 9);
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

  // Renders all 405 ZzFX designs (about 4 s on a busy 4-core container), so it gets more than the default 5 s.
  it('renders boot groups up front and the rest lazily in idle slices', { timeout: 20_000 }, () => {
    const queue: (() => void)[] = [];
    const { service, boot } = createWebAudioService({ createContext: () => null, scheduler: 'manual', idle: (t) => queue.push(t), sfxFiles: null });
    // Boot renders the boot groups except their lazy content-wave sounds (B16 budget); those join the idle queue.
    const atBoot = (id: string): boolean => BOOT_GROUPS.includes(sounds[id]!.group) && sounds[id]!.lazy !== true;
    expect(boot!.sounds).toBe(SOUND_IDS.filter(atBoot).length);
    for (const id of SOUND_IDS) expect(service.bank.isRendered(id), id).toBe(atBoot(id));
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

  it('starts on a later gesture when the one that called unlock carried no user activation', async () => {
    // The app calls unlock() from the first pointerdown; on a touch screen that event cannot start
    // audio, and the app has already removed its own listeners.
    const target = new EventTarget();
    const { svc, ctx } = make({ gestureTarget: target });
    ctx.allowResume = false;
    const p = svc.unlock();
    await new Promise((r) => setTimeout(r, 0));
    expect(svc.state).toBe('suspended');
    ctx.allowResume = true;
    target.dispatchEvent(new Event('touchend'));
    await p;
    expect(svc.state).toBe('running');
    svc.play('ui_click');
    expect(ctx.effectSources()).toHaveLength(1);
  });

  it('never throws on non-finite numbers from a caller', async () => {
    const { svc, ctx } = await unlocked();
    expect(() => svc.play('hit_blunt', { pitchBp: Number.NaN, volumeDb: Number.POSITIVE_INFINITY, pan: Number.NaN })).not.toThrow();
    const s = ctx.effectSources()[0]!;
    expect(s.playbackRate.value).toBe(1);
    expect(chain(s).gain.gain.value).toBeCloseTo(10 ** ((sounds.hit_blunt!.gainDb ?? 0) / 20), 12);
    expect(ctx.of(FakePanner)).toHaveLength(0);
    expect(() => {
      svc.music.setCue('music.stone', { fadeMs: Number.NaN });
      svc.music.setLayer('intensity', Number.NaN);
      svc.music.transpose(Number.NaN);
      svc.music.duck(Number.NaN, 500);
      svc.music.stop(Number.NaN);
      svc.setBusVolume('music', Number.NaN);
    }).not.toThrow();
    expect(svc.engine!.state).toEqual({ layers: { intensity: 0, overdrive: 0, siege: 0 }, transpose: 0 });
  });

  it('disposes cleanly', async () => {
    const { svc, ctx } = await unlocked();
    svc.music.setCue('music.stone');
    svc.dispose();
    expect(ctx.state).toBe('closed');
    expect(svc.state).toBe('locked');
  });
});
