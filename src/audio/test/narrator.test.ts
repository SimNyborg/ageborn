/**
 * The narrator (queue item 39): one line at a time on the voice bus, cut by a newer line or `stop`, the music
 * ducked while it speaks, files loaded only when asked (Ogg Opus, then the AAC copy), and a missing or broken
 * file skipped quietly so the subtitle shows as before.
 */
import { describe, expect, it } from 'vitest';
import { DECODED_KEEP, DEFAULT_MAX_DELAY_MS, DUCK_EVERY_MS, DUCK_SLICE_MAX_MS, DUCK_SLICE_MS, NARRATOR_DUCK_DB, Narrator, RETRY_AFTER_MS, type NarratorEvent, type NarratorOptions, type VoiceFile } from '../narrator';
import { PREPARE_DUCK_MS } from '../service';
import { VOICE_LINES } from '../voice.gen';
import { FakeBuffer, FakeBufferSource, FakeContext, type FakeGain } from './fakeContext';

const file = (id: string, seconds = 1): VoiceFile => ({ src: `audio/voice/${id}.aaaa.ogg`, alt: `audio/voice/${id}.bbbb.m4a`, seconds, bytes: 100, altBytes: 150, text: id, hash: 'h' });

const FILES: Record<string, VoiceFile> = Object.fromEntries(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'].map((id) => [id, file(id)]));

class ManualTimers {
  private next = 1;
  readonly live = new Map<number, () => void>();
  every(fn: () => void): unknown {
    const id = this.next++;
    this.live.set(id, fn);
    return id;
  }
  clear(h: unknown): void {
    this.live.delete(h as number);
  }
  /** Runs every live interval once (one `DUCK_EVERY_MS` step). */
  tick(): void {
    for (const fn of [...this.live.values()]) fn();
  }
}

interface Rig {
  n: Narrator;
  ctx: FakeContext;
  bus: FakeGain;
  ducks: [number, number][];
  fetched: string[];
  events: NarratorEvent[];
  timers: ManualTimers;
  clock: { t: number };
  /** Resolves the fetches still waiting (deferred mode). */
  release(): Promise<void>;
}

/** Lets pending promise callbacks run. */
const flush = async (): Promise<void> => {
  for (let k = 0; k < 10; k++) await Promise.resolve();
};

function rig(o: Partial<NarratorOptions> & { deferred?: boolean; failing?: (src: string) => boolean; badDecode?: (bytes: ArrayBuffer) => boolean; locked?: boolean } = {}): Rig {
  const ctx = new FakeContext();
  ctx.state = o.locked ? 'suspended' : 'running';
  const bus = ctx.createGain();
  const ducks: [number, number][] = [];
  const fetched: string[] = [];
  const events: NarratorEvent[] = [];
  const timers = new ManualTimers();
  const clock = { t: 0 };
  const waiting: (() => void)[] = [];
  const decode = ctx.decodeAudioData.bind(ctx);
  ctx.decodeAudioData = (bytes: ArrayBuffer) => (o.badDecode?.(bytes) ? Promise.reject(new Error('bad data')) : decode(bytes));
  const n = new Narrator({
    host: { voiceOut: () => ({ ctx: ctx.asAudioContext(), input: bus as unknown as AudioNode }), duck: (db, ms) => ducks.push([db, ms]) },
    files: FILES,
    fetchFile: (src) => {
      fetched.push(src);
      const bytes = new TextEncoder().encode(src).buffer as ArrayBuffer;
      if (o.failing?.(src)) return Promise.reject(new Error('HTTP 404'));
      if (!o.deferred) return Promise.resolve(bytes);
      return new Promise((resolve) => waiting.push(() => resolve(bytes)));
    },
    opus: () => true,
    now: () => clock.t,
    timers,
    warn: () => undefined,
    ...o,
  });
  n.subscribe((e) => events.push(e));
  return {
    n,
    ctx,
    bus,
    ducks,
    fetched,
    events,
    timers,
    clock,
    release: async () => {
      while (waiting.length) waiting.shift()!();
      await flush();
    },
  };
}

/** The sources the narrator started (the voice buffers, not the unlock blip). */
const sources = (ctx: FakeContext): FakeBufferSource[] => ctx.of(FakeBufferSource).filter((s) => s.startedAt !== null);

describe('Narrator', () => {
  it('fetches nothing until a line is asked for', () => {
    const r = rig();
    expect(r.fetched).toEqual([]);
    expect(r.n.current).toBeNull();
  });

  it('plays a line on the voice bus through a fading gain and reports its start and end', async () => {
    const r = rig();
    expect(await r.n.say('a')).toBe(true);
    expect(r.fetched).toEqual(['audio/voice/a.aaaa.ogg']);
    const [src] = sources(r.ctx);
    const gain = src!.outputs[0] as FakeGain;
    expect(gain.outputs).toEqual([r.bus]);
    expect(gain.gain.events[0]).toMatchObject({ kind: 'set', value: 0 });
    expect(gain.gain.last).toBe(1);
    expect(r.n.current).toBe('a');
    expect(r.events).toEqual([{ kind: 'start', id: 'a', seconds: 1 }]);
    r.ctx.advance(1.01);
    expect(r.n.current).toBeNull();
    expect(r.events.at(-1)).toEqual({ kind: 'end', id: 'a', cut: false });
  });

  it('ducks the music while it speaks, in slices renewed until the line ends', async () => {
    const r = rig();
    await r.n.say('a');
    expect(r.ducks).toEqual([[NARRATOR_DUCK_DB, DUCK_SLICE_MS]]);
    expect(DUCK_SLICE_MS).toBeGreaterThan(DUCK_EVERY_MS);
    // a slice must never read as the evolve's Ascension duck, which decodes the next age's music
    expect(DUCK_SLICE_MS).toBeLessThan(PREPARE_DUCK_MS);
    expect(DUCK_SLICE_MAX_MS).toBeLessThan(PREPARE_DUCK_MS);
    r.timers.tick();
    r.timers.tick();
    expect(r.ducks).toHaveLength(3);
    r.ctx.advance(1.01);
    expect(r.timers.live.size).toBe(0);
    r.timers.tick();
    expect(r.ducks).toHaveLength(3);
  });

  it('a late renewal (timers lag on a busy main thread) lengthens the slices, never past the line', async () => {
    const r = rig();
    const sr = r.ctx.sampleRate;
    r.ctx.decodeAudioData = () => Promise.resolve(new FakeBuffer(1, 3 * sr, sr));
    await r.n.say('a');
    const step = (lateMs: number, audioS: number): number => {
      r.clock.t += DUCK_EVERY_MS + lateMs;
      r.ctx.advance(audioS);
      r.timers.tick();
      return r.ducks.at(-1)![1];
    };
    expect(r.ducks).toEqual([[NARRATOR_DUCK_DB, DUCK_SLICE_MS]]);
    // on time: the short slice (a cut lets the music back up soon)
    expect(step(0, 0.25)).toBe(DUCK_SLICE_MS);
    // 400 ms late: the slice grows by twice that; renewals on time shorten it again slowly
    expect(step(400, 0.65)).toBe(DUCK_SLICE_MS + 800);
    const eased = step(0, 0.25);
    expect(eased).toBeLessThan(DUCK_SLICE_MS + 800);
    expect(eased).toBeGreaterThan(DUCK_SLICE_MS);
    // never longer than the cap
    expect(step(1250, 0.05)).toBe(DUCK_SLICE_MAX_MS);
    // and never past the line's end (3 s) plus a short tail
    expect(step(0, 1.7)).toBeCloseTo(250, 3);
    r.ctx.advance(0.2);
    expect(r.n.current).toBeNull();
    // the next line starts with the longer slice, back to the short one after a run of renewals on time
    await r.n.say('b');
    expect(r.ducks.at(-1)![1]).toBeGreaterThan(DUCK_SLICE_MS);
    for (let k = 0; k < 9; k++) step(0, 0.25);
    expect(r.ducks.at(-1)![1]).toBe(DUCK_SLICE_MS);
  });

  it('a new line cuts the one playing (a short fade, the source stopped) and only one plays', async () => {
    const r = rig();
    await r.n.say('a');
    await r.n.say('b');
    const [a, b] = sources(r.ctx);
    expect(a!.stoppedAt).not.toBeNull();
    expect((a!.outputs[0] as FakeGain).gain.events.some((e) => e.kind === 'target' && e.value === 0)).toBe(true);
    expect(b!.stoppedAt).toBeNull();
    expect(r.n.current).toBe('b');
    expect(r.events.map((e) => e.kind + ':' + e.id)).toEqual(['start:a', 'end:a', 'start:b']);
    expect(r.events[1]).toEqual({ kind: 'end', id: 'a', cut: true });
    // the cut line's duck slices stop; the new line keeps one timer running
    expect(r.timers.live.size).toBe(1);
  });

  it('stop ends the line at once and lets the music come back up (no more duck slices)', async () => {
    const r = rig();
    await r.n.say('a');
    r.n.stop();
    expect(sources(r.ctx)[0]!.stoppedAt).not.toBeNull();
    expect(r.n.current).toBeNull();
    expect(r.timers.live.size).toBe(0);
    const before = r.ducks.length;
    r.timers.tick();
    expect(r.ducks).toHaveLength(before);
  });

  it('stop with an id leaves another line alone', async () => {
    const r = rig();
    await r.n.say('a');
    r.n.stop('b');
    expect(r.n.current).toBe('a');
    r.n.stop('a');
    expect(r.n.current).toBeNull();
  });

  it('a line still loading never starts once a stop or a newer line replaced it', async () => {
    const r = rig({ deferred: true });
    const first = r.n.say('a');
    r.n.stop();
    await r.release();
    expect(await first).toBe(false);
    expect(sources(r.ctx)).toEqual([]);
    expect(r.events).toContainEqual({ kind: 'skip', id: 'a', reason: 'replaced' });
    const second = r.n.say('b');
    const third = r.n.say('c');
    await r.release();
    expect(await second).toBe(false);
    expect(await third).toBe(true);
    expect(r.n.current).toBe('c');
  });

  it('a line that arrives later than its moment allows is dropped', async () => {
    const r = rig({ deferred: true });
    const p = r.n.say('a');
    r.clock.t += DEFAULT_MAX_DELAY_MS + 1;
    await r.release();
    expect(await p).toBe(false);
    expect(r.events).toContainEqual({ kind: 'skip', id: 'a', reason: 'late' });
    // but it stays decoded for the next time
    expect(await r.n.say('a')).toBe(true);
    expect(r.fetched).toHaveLength(1);
  });

  it('prefetch loads only the lines asked for, once, and say then starts at once', async () => {
    const r = rig();
    r.n.prefetch(['b', 'c', 'unknown']);
    r.n.prefetch(['b']);
    await flush();
    expect(r.fetched).toEqual(['audio/voice/b.aaaa.ogg', 'audio/voice/c.aaaa.ogg']);
    const started = r.n.say('b');
    // decoded already: it starts in the same task, no await needed
    expect(r.n.current).toBe('b');
    expect(await started).toBe(true);
    expect(r.fetched).toHaveLength(2);
  });

  it('lets go of a line once it is heard (ended or cut); one asked again is fetched again', async () => {
    const r = rig();
    // every line heard and cut, one after the other: none stays decoded (the review's S2 had 8 left, 3.5 MB)
    for (const id of Object.keys(FILES)) {
      await r.n.say(id);
      r.n.stop();
    }
    expect(r.n.held).toEqual([]);
    // a line that ends by itself goes too
    await r.n.say('a');
    expect(r.n.held).toEqual(['a']);
    r.ctx.advance(1.01);
    expect(r.n.current).toBeNull();
    expect(r.n.held).toEqual([]);
    r.fetched.length = 0;
    expect(await r.n.say('a')).toBe(true);
    expect(r.fetched).toEqual(['audio/voice/a.aaaa.ogg']);
    // asked again while it plays: it restarts from the buffer it has (no second fetch)
    expect(await r.n.say('a')).toBe(true);
    expect(r.fetched).toHaveLength(1);
    expect(r.n.held).toEqual(['a']);
  });

  it('keeps at most DECODED_KEEP lines decoded ahead, the newest; the line playing is never dropped', async () => {
    const r = rig();
    await r.n.say('a');
    r.n.prefetch(['b', 'c', 'd', 'e', 'f']);
    await flush();
    expect(DECODED_KEEP).toBe(4);
    // 'a' plays on; of the lines decoded ahead the oldest went
    expect(r.n.held).toEqual(['a', 'd', 'e', 'f']);
    expect(r.n.current).toBe('a');
  });

  it('release lets go of the lines decoded ahead (a step is over), but not the one playing', async () => {
    const r = rig();
    r.n.prefetch(['b', 'c']);
    await flush();
    await r.n.say('a');
    r.n.release();
    expect(r.n.held).toEqual(['a']);
    expect(r.n.current).toBe('a');
    // a line still loading when the step ended keeps nothing; a say waiting for it still plays it
    const d = rig({ deferred: true });
    d.n.prefetch(['b']);
    const said = d.n.say('c');
    d.n.release();
    await d.release();
    expect(await said).toBe(true);
    expect(d.n.current).toBe('c');
    expect(d.n.held).toEqual(['c']);
  });

  it('switching the narrator off lets go of every line, decoded or only fetched', async () => {
    const r = rig();
    r.n.prefetch(['b', 'c']);
    await flush();
    await r.n.say('a');
    r.n.enabled = false;
    expect(r.n.current).toBeNull();
    expect(r.n.held).toEqual([]);
    // bytes fetched before the context existed go too: on again, the line is fetched again
    let out: { ctx: AudioContext; input: AudioNode } | null = null;
    const ctx = new FakeContext();
    ctx.state = 'running';
    const fetched: string[] = [];
    const n = new Narrator({
      host: { voiceOut: () => out, duck: () => undefined },
      files: FILES,
      fetchFile: (src) => (fetched.push(src), Promise.resolve(new ArrayBuffer(8))),
      opus: () => true,
      timers: new ManualTimers(),
      warn: () => undefined,
    });
    n.prefetch(['a']);
    await flush();
    n.enabled = false;
    n.enabled = true;
    out = { ctx: ctx.asAudioContext(), input: ctx.createGain() as unknown as AudioNode };
    expect(await n.say('a')).toBe(true);
    expect(fetched).toEqual(['audio/voice/a.aaaa.ogg', 'audio/voice/a.aaaa.ogg']);
  });

  it('stop without a fade ends the line at once (a hidden page), with no tail left to play on its return', async () => {
    const r = rig();
    await r.n.say('a');
    r.ctx.advance(0.3);
    r.n.stop(undefined, { fade: false });
    const [src] = sources(r.ctx);
    expect(src!.stoppedAt).toBeCloseTo(r.ctx.currentTime, 6);
    const gain = src!.outputs[0] as FakeGain;
    expect(gain.gain.events.slice(-2)).toEqual([
      { kind: 'cancel', time: r.ctx.currentTime },
      { kind: 'set', value: 0, time: r.ctx.currentTime },
    ]);
    expect(r.events.at(-1)).toEqual({ kind: 'end', id: 'a', cut: true });
    expect(r.n.held).toEqual([]);
  });

  it('loads the AAC copy first where Ogg Opus does not play, and falls back to the other file', async () => {
    const aac = rig({ opus: () => false });
    await aac.n.say('a');
    expect(aac.fetched).toEqual(['audio/voice/a.bbbb.m4a']);
    const retry = rig({ failing: (src) => src.endsWith('.ogg') });
    expect(await retry.n.say('a')).toBe(true);
    expect(retry.fetched).toEqual(['audio/voice/a.aaaa.ogg', 'audio/voice/a.bbbb.m4a']);
    const undecodable = rig({ badDecode: (bytes) => new TextDecoder().decode(bytes).endsWith('.ogg') });
    expect(await undecodable.n.say('a')).toBe(true);
    expect(undecodable.fetched).toEqual(['audio/voice/a.aaaa.ogg', 'audio/voice/a.bbbb.m4a']);
  });

  it('turns an AAC copy encoded turned down (altGain) back up, so it plays as loud as the Ogg file', async () => {
    const files = { a: { ...file('a'), altGain: -2.85 }, b: file('b') };
    const aac = rig({ opus: () => false, files });
    await aac.n.say('a');
    expect((sources(aac.ctx)[0]!.outputs[0] as FakeGain).gain.last).toBeCloseTo(10 ** (2.85 / 20), 6);
    // a copy that was not turned down plays at 1
    await aac.n.say('b');
    expect((sources(aac.ctx)[1]!.outputs[0] as FakeGain).gain.last).toBe(1);
    // the Ogg file of the same line plays at 1; the AAC copy, when it is the Ogg file's retry, is turned up too
    const ogg = rig({ files });
    await ogg.n.say('a');
    expect((sources(ogg.ctx)[0]!.outputs[0] as FakeGain).gain.last).toBe(1);
    const retry = rig({ files, failing: (src) => src.endsWith('.ogg') });
    await retry.n.say('a');
    expect((sources(retry.ctx)[0]!.outputs[0] as FakeGain).gain.last).toBeCloseTo(10 ** (2.85 / 20), 6);
  });

  it('a line whose files are missing or broken is skipped without throwing, and not retried at once', async () => {
    const warns: string[] = [];
    const r = rig({ failing: () => true, warn: (m) => warns.push(m) });
    expect(await r.n.say('a')).toBe(false);
    expect(r.events).toContainEqual({ kind: 'skip', id: 'a', reason: 'failed' });
    expect(warns).toHaveLength(1);
    expect(r.fetched).toHaveLength(2);
    expect(await r.n.say('a')).toBe(false);
    expect(r.fetched).toHaveLength(2);
    r.clock.t += RETRY_AFTER_MS;
    await r.n.say('a');
    expect(r.fetched).toHaveLength(4);
    expect(sources(r.ctx)).toEqual([]);
  });

  it('skips unknown lines, and every line while switched off (stopping the one playing)', async () => {
    const r = rig();
    expect(await r.n.say('nope')).toBe(false);
    expect(r.events).toContainEqual({ kind: 'skip', id: 'nope', reason: 'missing' });
    await r.n.say('a');
    r.n.enabled = false;
    expect(r.n.current).toBeNull();
    expect(await r.n.say('b')).toBe(false);
    r.n.prefetch(['c']);
    expect(r.fetched).toEqual(['audio/voice/a.aaaa.ogg']);
    expect(r.events.at(-1)).toEqual({ kind: 'skip', id: 'b', reason: 'off' });
    r.n.enabled = true;
    expect(await r.n.say('b')).toBe(true);
  });

  it('starts nothing while the context is not running (locked, or a hidden page)', async () => {
    const r = rig({ locked: true });
    expect(await r.n.say('a')).toBe(false);
    expect(r.events).toContainEqual({ kind: 'skip', id: 'a', reason: 'locked' });
    r.ctx.state = 'running';
    expect(await r.n.say('a')).toBe(true);
  });

  it('a context that refuses to start the line skips it without throwing, and a cut in the fade-in holds its level', async () => {
    const r = rig();
    const make = r.ctx.createBufferSource.bind(r.ctx);
    r.ctx.createBufferSource = () => {
      const src = make();
      src.start = () => {
        throw new Error('InvalidStateError');
      };
      return src;
    };
    await expect(r.n.say('a')).resolves.toBe(false);
    expect(r.events).toContainEqual({ kind: 'skip', id: 'a', reason: 'locked' });
    expect(r.n.current).toBeNull();
    expect(r.timers.live.size).toBe(0);
    const ok = rig();
    await ok.n.say('a');
    ok.n.stop();
    const gain = sources(ok.ctx)[0]!.outputs[0] as FakeGain;
    expect(gain.gain.events.map((e) => e.kind)).toEqual(['set', 'linear', 'hold', 'target']);
  });

  it('keeps bytes fetched before the context exists and decodes them when the line is asked for', async () => {
    let out: { ctx: AudioContext; input: AudioNode } | null = null;
    const ctx = new FakeContext();
    ctx.state = 'running';
    const fetched: string[] = [];
    const n = new Narrator({
      host: { voiceOut: () => out, duck: () => undefined },
      files: FILES,
      fetchFile: (src) => {
        fetched.push(src);
        return Promise.resolve(new ArrayBuffer(8));
      },
      opus: () => true,
      timers: new ManualTimers(),
      warn: () => undefined,
    });
    n.prefetch(['a']);
    await flush();
    out = { ctx: ctx.asAudioContext(), input: ctx.createGain() as unknown as AudioNode };
    expect(await n.say('a')).toBe(true);
    expect(fetched).toEqual(['audio/voice/a.aaaa.ogg']);
    expect((sources(ctx)[0]!.buffer as FakeBuffer).duration).toBe(1);
  });
});

describe('the generated voice manifest', () => {
  it('names an Ogg Opus file and its AAC copy for every line, with its length, sizes, text and hash', () => {
    const en = VOICE_LINES['en'] ?? {};
    expect(Object.keys(en).length).toBeGreaterThan(40);
    for (const [id, f] of Object.entries(en)) {
      expect(f.src, id).toMatch(/^audio\/voice\/[A-Za-z0-9._-]+\.[0-9a-f]{8}\.ogg$/);
      expect(f.alt, id).toMatch(/^audio\/voice\/[A-Za-z0-9._-]+\.[0-9a-f]{8}\.m4a$/);
      expect(f.seconds, id).toBeGreaterThan(0.5);
      expect(f.seconds, id).toBeLessThan(6);
      expect(f.bytes, id).toBeGreaterThan(1000);
      expect(f.altBytes, id).toBeGreaterThan(1000);
      expect(f.text.length, id).toBeGreaterThan(0);
      expect(f.hash, id).toMatch(/^[0-9a-f]{16}$/);
    }
  });
});
