import { describe, expect, it } from 'vitest';
import { MUSIC_FILES, SFX_FILES, SFX_SHEETS } from '../assets.gen';
import { altSource, assetUrl, detectSync, SfxFileBank, sourceOrder, type SfxFiles } from '../files';
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
    // Ids added after the last `tools/audio` render play their ZzFX definition until the next render.
    const zzfxOnly = new Set<string>();
    expect(Object.keys(SFX_FILES).sort()).toEqual([...SOUND_IDS].filter((id) => !zzfxOnly.has(id) || SFX_FILES[id]).sort());
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
    // The 44-bar battle form at 110 BPM: 96 s.
    expect(lengths[0]).toBeGreaterThan(90);
    expect(lengths[0]).toBeLessThan(100);
    // Ogg Opus bytes (the AAC copies only load where Opus cannot play). Music streams one age ahead
    // (`prefetch`), so what matters per match is one battle loop and its stem; the total grew with the
    // three A17 arrangements (eight ages).
    const musicBytes = Object.values(MUSIC_FILES).reduce((a, f) => a + f.bytes, 0);
    const sfxBytes = Object.values(SFX_SHEETS).reduce((a, f) => a + f.bytes, 0);
    expect(musicBytes).toBeLessThan(7 * 1024 * 1024);
    for (const c of AGE_CUES) {
      const age = c.slice('music.'.length);
      expect(MUSIC_FILES[c]!.bytes + (MUSIC_FILES[`layer.intensity.${age}`]?.bytes ?? 0), c).toBeLessThan(700 * 1024);
    }
    expect(sfxBytes).toBeLessThan(1.5 * 1024 * 1024);
  });

  it('has an AAC copy of every file, a sync time for every sheet, and stingers in every age key', () => {
    for (const [g, sh] of Object.entries(SFX_SHEETS)) {
      expect(sh.alt, g).toMatch(/\.m4a$/);
      expect(sh.sync, g).toBeGreaterThan(0.01);
      expect(sh.sync, g).toBeLessThan(0.05);
      expect(altSource(sh.src)).toBe(sh.alt);
    }
    for (const [cue, f] of Object.entries(MUSIC_FILES)) expect(f.alt, cue).toMatch(/\.m4a$/);
    for (const base of ['stinger.victory', 'stinger.defeat']) {
      // one per evolve key of the eight-age chain (A17.8: +2, +4, +5, +6, +7, +8, +9)
      for (const k of [2, 4, 5, 6, 7, 8, 9]) expect(MUSIC_FILES[`${base}.k${k}`], `${base}.k${k}`).toBeDefined();
      const d = fileMusic[base]!;
      if (d.kind !== 'file') throw new Error(base);
      expect(Object.keys(d.keys ?? {}).sort()).toEqual(['2', '4', '5', '6', '7', '8', '9']);
    }
  });

  it('tries the AAC copy first where Opus cannot play, and as the retry elsewhere', () => {
    const sheet = SFX_SHEETS.ui!;
    expect(sourceOrder(sheet.src, true)).toEqual([sheet.src, sheet.alt]);
    expect(sourceOrder(sheet.src, false)).toEqual([sheet.alt, sheet.src]);
    expect(sourceOrder('audio/unknown.ogg', false)).toEqual(['audio/unknown.ogg']);
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
    expect(stone.prefetch).toEqual(['music.bronze', 'stinger.victory', 'stinger.defeat']);
    // every age has its own intensity stem, the A17 ages included
    for (const c of AGE_CUES) {
      const d = fileMusic[c]!;
      if (d.kind !== 'file') throw new Error(c);
      expect(d.layers?.intensity, c).toBeDefined();
    }
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

  it('finds the sync burst and shifts the clips by a decoder start delay', async () => {
    const synced: SfxFiles = { sheets: { battle: { ...FILES.sheets.battle!, sync: 0.02 } }, entries: { hit_blunt: FILES.entries.hit_blunt! } };
    const make = (delay: number): AudioBuffer => {
      const b = new FakeBuffer(1, 48000 * 2, 48000);
      const at = Math.round((0.02 + delay) * 48000);
      for (let i = 0; i < 100; i++) b.data[0]![at + i] = 0.5 * Math.sin(i / 7);
      return b as unknown as AudioBuffer;
    };
    expect(detectSync(make(0))).toBeCloseTo(0.02, 3);
    const late = new SfxFileBank(synced, () => Promise.resolve(make(0.0214)));
    await late.loadSheet('battle');
    expect(late.sheetShift('battle')).toBeCloseTo(0.0214, 3);
    expect(late.clips('hit_blunt')![0]!.offset).toBeCloseTo(0.05 + 0.0214, 3);
    const exact = new SfxFileBank(synced, () => Promise.resolve(make(0)));
    await exact.loadSheet('battle');
    expect(exact.clips('hit_blunt')![0]!.offset).toBeCloseTo(0.05, 6);
    // A silent or unreadable start changes nothing.
    const silent = new SfxFileBank(synced, () => Promise.resolve(new FakeBuffer(1, 48000 * 2, 48000) as unknown as AudioBuffer));
    await silent.loadSheet('battle');
    expect(silent.sheetShift('battle')).toBe(0);
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

  it('crossfades cues with equal-power curves', async () => {
    let ctxRef: FakeContext | null = null;
    const m = { 'music.stone': loopDef('stone.ogg'), 'music.medieval': loopDef('medieval.ogg') };
    const { ctx, engine } = engineWith(m, () => Promise.resolve(buf(ctxRef!, 50.6)));
    ctxRef = ctx;
    engine.setCue('music.stone', 600);
    await tick();
    ctx.advance(5);
    engine.setCue('music.medieval', 600);
    const curves = ctx.nodes.flatMap((n) => ((n as unknown as { gain?: { events: { kind: string; value?: number; duration?: number }[] } }).gain?.events ?? []).filter((e) => e.kind === 'curve'));
    // Stone faded in, Stone fades out, Medieval fades in: three 0.6 s curves, one of them to silence.
    expect(curves.filter((e) => Math.abs((e.duration ?? 0) - 0.6) < 1e-9)).toHaveLength(3);
    expect(curves.some((e) => e.value === 0)).toBe(true);
  });

  it('plays the stinger recorded in the key the battle ended in', async () => {
    const loads: string[] = [];
    const m: Record<string, MusicDef> = {
      'music.future': loopDef('future.ogg', { prefetch: ['stinger.victory'] } as Partial<MusicDef>),
      'stinger.victory': { kind: 'file', src: 'victory.ogg', keys: { 6: 'victory.k6.ogg' }, role: 'stinger' },
    };
    let ctxRef: FakeContext | null = null;
    const { ctx, engine } = engineWith(m, (src) => {
      loads.push(src);
      return Promise.resolve(buf(ctxRef!, src === 'victory.k6.ogg' ? 7 : src === 'victory.ogg' ? 6 : 50.6));
    });
    ctxRef = ctx;
    engine.setCue('music.future', 0);
    expect(loads).toContain('victory.ogg');
    engine.transpose(6);
    // The key change prefetches the stinger in the new key.
    expect(loads).toContain('victory.k6.ogg');
    await tick();
    engine.setCue('stinger.victory', 300);
    await tick();
    const played = ctx.of(FakeBufferSource).filter((s) => s.buffer && !s.loop);
    expect(played).toHaveLength(1);
    expect(played[0]!.buffer!.length).toBe(48000 * 7);
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
