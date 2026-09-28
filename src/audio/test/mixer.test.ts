import { describe, expect, it } from 'vitest';
import { renderDef } from '../bank';
import { CLIPPER, LIMITER, mergeDuck, MIX_TRIM, Mixer, softClip, softClipCurve, volumeGain } from '../mixer';
import { sounds } from '../sounds';
import { FakeCompressor, FakeContext, type FakeGain, FakeShaper } from './fakeContext';

describe('mixer math', () => {
  it('maps the 0..1 settings slider on a square law and clamps it', () => {
    expect(volumeGain(0)).toBe(0);
    expect(volumeGain(1)).toBe(1);
    expect(volumeGain(0.5)).toBe(0.25);
    expect(volumeGain(2)).toBe(1);
    expect(volumeGain(-1)).toBe(0);
    expect(volumeGain(Number.NaN)).toBe(1);
  });

  it('soft clip is transparent below the knee and never reaches full scale', () => {
    expect(softClip(0)).toBe(0);
    expect(softClip(0.5)).toBe(0.5);
    expect(softClip(-CLIPPER.knee)).toBe(-CLIPPER.knee);
    for (const y of [0.9, 1, 1.5, 2, 5, 100]) {
      expect(softClip(y)).toBeLessThanOrEqual(CLIPPER.ceiling);
      expect(softClip(-y)).toBeGreaterThanOrEqual(-CLIPPER.ceiling);
      expect(CLIPPER.ceiling).toBeLessThan(1);
      expect(softClip(y)).toBeGreaterThan(CLIPPER.knee);
    }
    // Monotonic.
    let prev = -Infinity;
    for (let y = -3; y <= 3; y += 0.01) {
      const v = softClip(y);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });

  it('the shaper curve spans ±2 of input (pre-gain 0.5), is odd and stays below full scale', () => {
    const c = softClipCurve();
    expect(c.length).toBe(CLIPPER.points);
    expect(c[(c.length - 1) / 2]).toBe(0);
    expect(c[c.length - 1]!).toBeLessThan(1);
    expect(c[0]!).toBeGreaterThan(-1);
    // Unity gain in the linear part: curve at x = 0.25 (signal 0.5) is 0.5.
    expect(c[Math.round(((0.25 + 1) / 2) * (c.length - 1))]!).toBeCloseTo(0.5, 2);
  });

  it('40 simultaneous hits summed raw would clip; through limiter + clipper math they cannot', () => {
    // Worst case with no voice limits: 40 hit voices of the loudest variants, aligned at sample 0.
    const ids = ['hit_blunt', 'hit_slash', 'hit_pierce', 'hit_bullet', 'hit_laser', 'hit_heavy', 'hit_effective', 'explosion_s'];
    const voices = ids.flatMap((id) => renderDef(sounds[id]!)!);
    const len = Math.max(...voices.map((v) => v.length));
    const sum = new Float64Array(len);
    for (let k = 0; k < 40; k++) {
      const v = voices[k % voices.length]!;
      for (let i = 0; i < v.length; i++) sum[i]! += v[i]! * MIX_TRIM.sfx;
    }
    let peak = 0;
    for (const x of sum) peak = Math.max(peak, Math.abs(x));
    expect(peak).toBeGreaterThan(1);
    // Whatever the compressor lets through, the clipper's output stays below full scale.
    for (const x of sum) expect(Math.abs(softClip(x))).toBeLessThan(1);
  });

  it('merges ducks into the deepest and longest (either dB sign means down)', () => {
    const a = mergeDuck(null, -6, 1500, 10);
    expect(a).toEqual({ depthDb: 6, until: 11.5 });
    expect(mergeDuck(a, 6, 500, 10.2)).toEqual({ depthDb: 6, until: 11.5 });
    expect(mergeDuck(a, -9, 2000, 11)).toEqual({ depthDb: 9, until: 13 });
    // An expired duck is replaced.
    expect(mergeDuck(a, -3, 100, 20)).toEqual({ depthDb: 3, until: 20.1 });
  });
});

describe('Mixer graph', () => {
  it('routes music through the duck, all buses into master, then limiter and clipper to the output', () => {
    const ctx = new FakeContext();
    const m = new Mixer(ctx as unknown as BaseAudioContext);
    expect(m.bus.music.connect).toBeDefined();
    const music = m.bus.music as unknown as FakeGain;
    expect(music.outputs).toContain(m.duckGain);
    expect((m.duckGain as unknown as FakeGain).outputs).toContain(m.bus.master);
    expect((m.bus.sfx as unknown as FakeGain).outputs).toContain(m.bus.master);
    expect((m.bus.ui as unknown as FakeGain).outputs).toContain(m.bus.master);
    expect((m.bus.master as unknown as FakeGain).outputs).toContain(m.limiter);
    const comp = ctx.of(FakeCompressor)[0]!;
    expect(comp.threshold.value).toBe(LIMITER.threshold);
    expect(comp.ratio.value).toBe(LIMITER.ratio);
    expect(comp.knee.value).toBe(0);
    expect(comp.attack.value).toBeLessThanOrEqual(0.003);
    const shaper = ctx.of(FakeShaper)[0]!;
    expect(shaper.curve).not.toBeNull();
    expect(shaper.outputs).toContain(ctx.destination);
  });

  it('sets bus volumes as trim × taper', () => {
    const ctx = new FakeContext();
    const m = new Mixer(ctx as unknown as BaseAudioContext);
    m.setVolume('sfx', 0.5);
    expect((m.bus.sfx.gain as unknown as { last: number }).last).toBeCloseTo(MIX_TRIM.sfx * 0.25, 9);
    expect(m.getVolume('sfx')).toBe(0.5);
    m.setVolume('master', 0);
    expect((m.bus.master.gain as unknown as { last: number }).last).toBe(0);
  });

  it('ducks music 6 dB and releases after the duration', () => {
    const ctx = new FakeContext();
    ctx.currentTime = 5;
    const m = new Mixer(ctx as unknown as BaseAudioContext);
    const d = m.duckMusic(-6, 1500);
    expect(d).toEqual({ depthDb: 6, until: 6.5 });
    const ev = (m.duckGain.gain as unknown as { events: { kind: string; value?: number; time: number }[] }).events;
    const ramps = ev.filter((e) => e.kind === 'linear');
    expect(ramps[0]!.value).toBeCloseTo(10 ** (-6 / 20), 6);
    expect(ramps[ramps.length - 1]).toMatchObject({ value: 1 });
    expect(ramps[ramps.length - 1]!.time).toBeGreaterThan(6.5);
  });

  it('adds a meter when asked', () => {
    const ctx = new FakeContext();
    expect(new Mixer(ctx as unknown as BaseAudioContext, { meter: true }).meter).not.toBeNull();
    expect(new Mixer(ctx as unknown as BaseAudioContext).meter).toBeNull();
  });
});
