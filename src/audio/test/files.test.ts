import { describe, expect, it } from 'vitest';
import { MUSIC_FILES, SFX_FILES, SFX_SHEETS } from '../assets.gen';
import { assetUrl, SfxFileBank, type SfxFiles } from '../files';
import { AGE_CUES, fileMusic, MUSIC_CUES, music as seqMusic, type MusicDef } from '../music';
import { FALLBACK_AFTER_S, MusicEngine, type FilePlayer } from '../musicEngine';
import { WebAudioService, type WebAudioServiceOptions } from '../service';
import { SOUND_GROUPS, SOUND_IDS, sounds } from '../sounds';
import { FakeBuffer, FakeBufferSource, FakeContext, FakeOscillator } from './fakeContext';

const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

/** A tiny two-sheet manifest over fake decoded buffers. */
const FILES: SfxFiles = {
  sheets: { ui: { src: 'audio/sfx/ui.test.ogg', bytes: 1, seconds: 1 }, battle: { src: 'audio/sfx/battle.test.ogg', bytes: 1, seconds: 2 } },
  entries: {
    ui_click: { sheet: 'ui', variants: [[0.05, 0.1], [0.2, 0.1]] },
    hit_blunt: { sheet: 'battle', variants: [[0.05, 0.3], [0.4, 0.3], [0.8, 0.3]] },
  },
};

function fileService(o: WebAudioServiceOptions & { fail?: boolean; hold?: boolean } = {}) {
  const ctx = new FakeContext();
  const fetched: string[] = [];
  const warns: string[] = [];
  const pending: (() => void)[] = [];
  const svc = new WebAudioService({
    createContext: () => ctx.asAudioContext(),
    scheduler: 'manual',
    random: () => 0.5,
    gestureTarget: null,
    warn: (m) => warns.push(m),
    sfxFiles: FILES,
    music: seqMusic,
    fetchFile: (src) => {
      fetched.push(src);
      if (o.fail) return Promise.reject(new Error('no ogg here'));
      if (o.hold) return new Promise((resolve) => pending.push(() => resolve(new ArrayBuffer(8))));
      return Promise.resolve(new ArrayBuffer(8));
    },
    ...o,
  });
  ctx.decodeAudioData = (_d: ArrayBuffer) => Promise.resolve(new FakeBuffer(1, 48000 * 2, 48000));
  return { svc, ctx, fetched, warns, pending };
}

describe('generated audio assets', () => {
  it('has a file for every sound id, inside its sheet, with 2-3 variants for frequent sounds', () => {
    expect(Object.keys(SFX_FILES).sort()).toEqual([...SOUND_IDS].sort());
    expect(Object.keys(SFX_SHEETS).sort()).toEqual([...SOUND_GROUPS].sort());
    for (const [id, e] of Object.entries(SFX_FILES)) {
      expect(e.sheet, id).toBe(sounds[id]!.group);
      const sheet = SFX_SHEETS[e.sheet]!;
      for (const [offset, duration] of e.variants) {
        expect(offset, id).toBeGreaterThan(0);
        expect(duration, id).toBeGreaterThan(0.01);
        expect(offset + duration, id).toBeLessThanOrEqual(sheet.seconds + 1e-3);
      }
    }
    for (const id of ['hit_blunt', 'hit_slash', 'hit_pierce', 'spawn_pop', 'die_bio', 'die_mech', 'swing_whoosh', 'coin_gain', 'explosion_s']) {
      expect(SFX_FILES[id]!.variants.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('keeps timed sounds at their designed length (evolve riser 2.5 s, telegraph 1.0 s)', () => {
    expect(SFX_FILES.evolve_riser!.variants[0]![1]).toBeCloseTo(2.5, 2);
    expect(SFX_FILES.power_telegraph!.variants[0]![1]).toBeCloseTo(1.0, 2);
    expect(SFX_FILES.last_stand_charge!.variants[0]![1]).toBeCloseTo(1.0, 2);
  });

  it('has a music file for every A14.3 cue, battle loops of one length, and small total sizes', () => {
    for (const cue of MUSIC_CUES) expect(MUSIC_FILES[cue], cue).toBeDefined();
    const lengths = AGE_CUES.map((c) => MUSIC_FILES[c]!.loopLength!);
    for (const l of lengths) expect(l).toBeCloseTo(lengths[0]!, 3);
    // 45-75 s loops.
    expect(lengths[0]).toBeGreaterThan(45);
    expect(lengths[0]).toBeLessThan(75);
    const musicBytes = Object.values(MUSIC_FILES).reduce((a, f) => a + f.bytes, 0);
    const sfxBytes = Object.values(SFX_SHEETS).reduce((a, f) => a + f.bytes, 0);
    expect(musicBytes).toBeLessThan(3.2 * 1024 * 1024);
    expect(sfxBytes).toBeLessThan(1.2 * 1024 * 1024);
  });

  it('builds the file music manifest with fallbacks, stems and prefetch', () => {
    for (const cue of MUSIC_CUES) {
      const d = fileMusic[cue]!;
      expect(d.kind, cue).toBe('file');
      if (d.kind !== 'file') continue;
      expect(d.fallback, cue).toBeDefined();
      expect(d.role).toBe(seqMusic[cue]!.role);
    }
    const stone = fileMusic['music.stone']!;
    if (stone.kind !== 'file') throw new Error('stone is not a file');
    expect(Object.keys(stone.layers ?? {}).sort()).toEqual(['intensity', 'overdrive', 'siege']);
    expect(stone.prefetch).toEqual(['music.medieval', 'stinger.victory', 'stinger.defeat']);
  });

  it('resolves asset paths against the site base', () => {
    expect(assetUrl('audio/x.ogg').endsWith('/audio/x.ogg')).toBe(true);
    expect(assetUrl('/abs.ogg')).toBe('/abs.ogg');
    expect(assetUrl('https://a.b/c.ogg')).toBe('https://a.b/c.ogg');
  });
});

describe('SfxFileBank', () => {
  it('slices clips from a decoded sheet and loads each sheet once', async () => {
    const loads: string[] = [];
    const bank = new SfxFileBank(FILES, (src) => {
      loads.push(src);
      return Promise.resolve(new FakeBuffer(1, 48000 * 2, 48000) as unknown as AudioBuffer);
    });
    expect(bank.clips('hit_blunt')).toBeUndefined();
    bank.request('hit_blunt');
    bank.request('hit_blunt');
    await tick();
    expect(loads).toEqual(['audio/sfx/battle.test.ogg']);
    const clips = bank.clips('hit_blunt')!;
    expect(clips.map((c) => [c.offset, c.duration])).toEqual([
      [0.05, 0.3],
      [0.4, 0.3],
      [0.8, 0.3],
    ]);
    expect(bank.sheetState('battle')).toBe('ready');
    expect(bank.sheetState('ui')).toBe('idle');
  });

  it('marks the bank failed when a sheet cannot be decoded', async () => {
    const errors: string[] = [];
    const bank = new SfxFileBank(FILES, () => Promise.reject(new Error('EncodingError')), (m) => errors.push(m));
    expect(await bank.loadSheet('ui')).toBe(false);
    expect(bank.failed).toBe(true);
    expect(errors[0]).toContain('synthesized fallback');
  });
});

describe('WebAudioService with sound files', () => {
  it('loads the boot sheets after unlock and plays sheet slices once decoded', async () => {
    const { svc, ctx, fetched } = fileService();
    await svc.unlock();
    // Before the sheet is decoded the ZzFX fallback plays.
    svc.play('hit_blunt');
    const first = ctx.effectSources().at(-1)!;
    expect(first.offset).toBe(0);
    expect(first.duration).toBeNull();
    await tick();
    await tick();
    expect(fetched.slice(0, 2)).toEqual(['audio/sfx/ui.test.ogg', 'audio/sfx/battle.test.ogg']);
    ctx.advance(1);
    svc.play('hit_blunt');
    const src = ctx.effectSources().at(-1)!;
    expect(src.buffer!.length).toBe(96000);
    expect(src.offset).toBeGreaterThan(0);
    expect(src.duration).toBeCloseTo(0.3, 6);
    expect(svc.sheetStates()).toMatchObject({ ui: 'ready', battle: 'ready' });
  });

  it('plays a file clip at its mastered level, ignoring the ZzFX trim', async () => {
    const custom = { ...sounds, hit_blunt: { ...sounds.hit_blunt!, gainDb: -9 } };
    const { svc, ctx } = fileService({ sounds: custom, random: () => 0.5 });
    await svc.unlock();
    await tick();
    await tick();
    svc.play('hit_blunt');
    const gain = ctx.effectSources().at(-1)!.outputs[0] as unknown as { gain: { value: number } };
    // random 0.5 = no volume variation: 0 dB.
    expect(gain.gain.value).toBeCloseTo(1, 6);
  });

  it('falls back to ZzFX for good when a sheet cannot be decoded, and warns once', async () => {
    const { svc, ctx, warns } = fileService({ fail: true });
    await svc.unlock();
    await tick();
    await tick();
    expect(svc.files!.failed).toBe(true);
    expect(warns).toHaveLength(1);
    svc.play('ui_click');
    expect(ctx.effectSources().at(-1)!.duration).toBeNull();
    expect(svc.stats.started).toBe(1);
  });

  it('previews one exact variant from the file or from ZzFX', async () => {
    const { svc, ctx } = fileService();
    await svc.unlock();
    await tick();
    await tick();
    expect(svc.variantCount('hit_blunt')).toBe(3);
    expect(svc.preview('hit_blunt', 2)).toBe(true);
    expect(ctx.effectSources().at(-1)!.offset).toBeCloseTo(0.8, 6);
    expect(svc.preview('hit_blunt', 0, { source: 'zzfx' })).toBe(true);
    expect(ctx.effectSources().at(-1)!.duration).toBeNull();
  });

  it('loads the next age sheets when the music moves on', async () => {
    const files: SfxFiles = { sheets: { ...FILES.sheets, gunpowder: { src: 'audio/sfx/gp.ogg', bytes: 1, seconds: 1 } }, entries: FILES.entries };
    const { svc, fetched } = fileService({ sfxFiles: files });
    await svc.unlock();
    svc.music.setCue('music.medieval');
    for (let k = 0; k < 6; k++) await tick();
    expect(fetched).toContain('audio/sfx/gp.ogg');
  });
});

describe('music files', () => {
  function engineWith(manifest: Record<string, MusicDef>, loader: (src: string) => Promise<AudioBuffer>) {
    const ctx = new FakeContext();
    ctx.state = 'running';
    const released: string[] = [];
    const engine = new MusicEngine(ctx as unknown as BaseAudioContext, ctx.createGain() as unknown as AudioNode, {
      manifest,
      loadFile: loader,
      releaseFile: (s) => released.push(s),
      warn: () => undefined,
    });
    return { ctx, engine, released };
  }
  const buf = (ctx: FakeContext, seconds: number): AudioBuffer => ctx.createBuffer(2, Math.round(48000 * seconds), 48000) as unknown as AudioBuffer;
  const loopDef = (src: string, extra: Partial<MusicDef> = {}): MusicDef =>
    ({ kind: 'file', src, loopStart: 0.3, loopLength: 50, role: 'battle', layers: { siege: { src: 'siege.ogg', loopStart: 0.3, loopLength: 10 } }, ...extra }) as MusicDef;

  it('loops the loop window and aligns the stems to it', async () => {
    let ctxRef: FakeContext | null = null;
    const { ctx, engine } = engineWith({ 'music.stone': loopDef('stone.ogg') }, (src) => Promise.resolve(buf(ctxRef!, src === 'siege.ogg' ? 10.6 : 50.6)));
    ctxRef = ctx;
    engine.setCue('music.stone', 0);
    await tick();
    const [main, stem] = ctx.of(FakeBufferSource).filter((s) => s.buffer && s.buffer.length > 1000);
    expect(main!.loop).toBe(true);
    expect(main!.loopStart).toBeCloseTo(0.3, 9);
    expect(main!.loopEnd).toBeCloseTo(50.3, 9);
    expect(main!.offset).toBeCloseTo(0.3, 9);
    expect(stem!.loopEnd).toBeCloseTo(10.3, 9);
  });

  it('continues at the same point of the loop on an evolve', async () => {
    let ctxRef: FakeContext | null = null;
    const m = { 'music.stone': loopDef('stone.ogg'), 'music.medieval': loopDef('medieval.ogg') };
    const { ctx, engine } = engineWith(m, (src) => Promise.resolve(buf(ctxRef!, src === 'siege.ogg' ? 10.6 : 50.6)));
    ctxRef = ctx;
    engine.setCue('music.stone', 0);
    await tick();
    ctx.advance(62.5); // one full loop and 12.47 s more
    engine.setCue('music.medieval', 600);
    await tick();
    const mains = ctx.of(FakeBufferSource).filter((s) => s.buffer && s.buffer.length === Math.round(48000 * 50.6));
    const next = mains.at(-1)!;
    // Stone started at 0.03 s: at 62.53 s it is 12.5 s into its loop.
    expect(next.offset - 0.3).toBeCloseTo(12.5, 2);
    const stems = ctx.of(FakeBufferSource).filter((s) => s.buffer && s.buffer.length === Math.round(48000 * 10.6));
    expect(stems.at(-1)!.offset - 0.3).toBeCloseTo(2.5, 2);
  });

  it('plays the fallback score while a file is slow, then fades the file in', async () => {
    const ctx0 = { ref: null as FakeContext | null };
    let resolve: (b: AudioBuffer) => void = () => undefined;
    const def = { ...loopDef('slow.ogg'), layers: {}, fallback: (seqMusic['music.stone'] as unknown as { score: never }).score } as MusicDef;
    const { ctx, engine } = engineWith({ 'music.stone': def }, () => new Promise((r) => (resolve = r)));
    ctx0.ref = ctx;
    engine.setCue('music.stone', 0);
    engine.update();
    expect(ctx.of(FakeOscillator)).toHaveLength(0);
    ctx.advance(FALLBACK_AFTER_S + 0.05);
    engine.update();
    ctx.advance(0.1);
    engine.update();
    expect(ctx.of(FakeOscillator).length).toBeGreaterThan(0);
    expect(engine.playing[0]!.source).toBe('fallback');
    resolve(buf(ctx, 50.6));
    await tick();
    expect(engine.playing[0]!.source).toBe('file');
    const player = (engine as unknown as { players: FilePlayer[] }).players[0]!;
    expect(player.phaseAt(ctx.currentTime + 1)).not.toBeNull();
  });

  it('prefetches the next cue and releases files no cue needs', async () => {
    const loads: string[] = [];
    const m: Record<string, MusicDef> = {
      'music.stone': loopDef('stone.ogg', { prefetch: ['music.medieval'] } as Partial<MusicDef>),
      'music.medieval': loopDef('medieval.ogg', { prefetch: ['music.gunpowder'] } as Partial<MusicDef>),
      'music.gunpowder': loopDef('gunpowder.ogg'),
    };
    let ctxRef: FakeContext | null = null;
    const { ctx, engine, released } = engineWith(m, (src) => {
      loads.push(src);
      return Promise.resolve(buf(ctxRef!, 50.6));
    });
    ctxRef = ctx;
    engine.setCue('music.stone', 0);
    expect(loads).toContain('medieval.ogg');
    await tick();
    engine.setCue('music.medieval', 0);
    await tick();
    for (let k = 0; k < 5; k++) {
      ctx.advance(0.3);
      engine.update();
    }
    engine.setCue('music.gunpowder', 0);
    expect(released).toContain('stone.ogg');
    expect(released).not.toContain('siege.ogg');
  });
});
