/**
 * A minimal recording stand-in for the Web Audio API, so the service, mixer and music engine can be
 * tested in Node. Time only moves with `advance`; sources fire `onended` when time passes their end.
 */

export interface ParamEvent {
  kind: 'set' | 'linear' | 'exp' | 'target' | 'cancel' | 'hold';
  value?: number;
  time: number;
  tau?: number;
}

export class FakeParam {
  value: number;
  readonly events: ParamEvent[] = [];
  constructor(v = 0) {
    this.value = v;
  }
  setValueAtTime(value: number, time: number): this {
    this.events.push({ kind: 'set', value, time });
    this.value = value;
    return this;
  }
  linearRampToValueAtTime(value: number, time: number): this {
    this.events.push({ kind: 'linear', value, time });
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number): this {
    this.events.push({ kind: 'exp', value, time });
    return this;
  }
  setTargetAtTime(value: number, time: number, tau: number): this {
    this.events.push({ kind: 'target', value, time, tau });
    return this;
  }
  cancelScheduledValues(time: number): this {
    this.events.push({ kind: 'cancel', time });
    return this;
  }
  cancelAndHoldAtTime(time: number): this {
    this.events.push({ kind: 'hold', time });
    return this;
  }
  /** The last value an event set or ramps to. */
  get last(): number | undefined {
    for (let k = this.events.length - 1; k >= 0; k--) {
      const e = this.events[k];
      if (e && e.value !== undefined) return e.value;
    }
    return undefined;
  }
}

export class FakeNode {
  readonly outputs: FakeNode[] = [];
  disconnected = false;
  constructor(
    readonly ctx: FakeContext,
    readonly kind: string,
  ) {
    ctx.nodes.push(this);
  }
  connect<T>(dest: T): T {
    this.outputs.push(dest as unknown as FakeNode);
    return dest;
  }
  disconnect(): void {
    this.disconnected = true;
    this.outputs.length = 0;
  }
}

export class FakeGain extends FakeNode {
  readonly gain: FakeParam;
  constructor(ctx: FakeContext) {
    super(ctx, 'gain');
    this.gain = new FakeParam(1);
  }
}

export class FakeBuffer {
  readonly numberOfChannels: number;
  readonly data: Float32Array[];
  constructor(
    channels: number,
    readonly length: number,
    readonly sampleRate: number,
  ) {
    this.numberOfChannels = channels;
    this.data = Array.from({ length: channels }, () => new Float32Array(length));
  }
  get duration(): number {
    return this.length / this.sampleRate;
  }
  getChannelData(c: number): Float32Array {
    return this.data[c] as Float32Array;
  }
  copyToChannel(src: Float32Array, c: number): void {
    (this.data[c] as Float32Array).set(src.subarray(0, this.length));
  }
}

class FakeScheduled extends FakeNode {
  startedAt: number | null = null;
  stoppedAt: number | null = null;
  onended: (() => void) | null = null;
  ended = false;
  start(when = 0): void {
    this.startedAt = when;
  }
  stop(when = 0): void {
    this.stoppedAt = when;
  }
  /** When this source ends by itself (null = never). */
  naturalEnd(): number | null {
    return null;
  }
  endTime(): number | null {
    const n = this.naturalEnd();
    if (this.stoppedAt !== null && (n === null || this.stoppedAt < n)) return this.stoppedAt;
    return n;
  }
}

export class FakeBufferSource extends FakeScheduled {
  buffer: FakeBuffer | null = null;
  loop = false;
  readonly playbackRate = new FakeParam(1);
  offset = 0;
  constructor(ctx: FakeContext) {
    super(ctx, 'bufferSource');
  }
  override start(when = 0, offset = 0): void {
    this.startedAt = when;
    this.offset = offset;
  }
  override naturalEnd(): number | null {
    if (this.startedAt === null || !this.buffer || this.loop) return null;
    return this.startedAt + this.buffer.duration / this.playbackRate.value;
  }
}

export class FakeOscillator extends FakeScheduled {
  type: OscillatorType = 'sine';
  readonly frequency = new FakeParam(440);
  readonly detune = new FakeParam(0);
  constructor(ctx: FakeContext) {
    super(ctx, 'oscillator');
  }
}

export class FakeFilter extends FakeNode {
  type: BiquadFilterType = 'lowpass';
  readonly frequency = new FakeParam(350);
  readonly Q = new FakeParam(1);
  constructor(ctx: FakeContext) {
    super(ctx, 'biquad');
  }
}

export class FakeCompressor extends FakeNode {
  readonly threshold = new FakeParam(-24);
  readonly knee = new FakeParam(30);
  readonly ratio = new FakeParam(12);
  readonly attack = new FakeParam(0.003);
  readonly release = new FakeParam(0.25);
  constructor(ctx: FakeContext) {
    super(ctx, 'compressor');
  }
}

export class FakeShaper extends FakeNode {
  curve: Float32Array | null = null;
  oversample: OverSampleType = 'none';
  constructor(ctx: FakeContext) {
    super(ctx, 'shaper');
  }
}

export class FakeAnalyser extends FakeNode {
  fftSize = 2048;
  constructor(ctx: FakeContext) {
    super(ctx, 'analyser');
  }
  getFloatTimeDomainData(a: Float32Array): void {
    a.fill(0);
  }
}

export class FakePanner extends FakeNode {
  readonly pan = new FakeParam(0);
  constructor(ctx: FakeContext) {
    super(ctx, 'panner');
  }
}

export class FakeContext {
  currentTime = 0;
  readonly sampleRate: number;
  state: AudioContextState = 'suspended';
  readonly nodes: FakeNode[] = [];
  readonly destination: FakeNode;
  resumeCalls = 0;
  /** When false, resume() leaves the context suspended (a browser that refuses). */
  allowResume = true;
  private readonly listeners = new Map<string, Set<() => void>>();

  constructor(sampleRate = 48000) {
    this.sampleRate = sampleRate;
    this.destination = new FakeNode(this, 'destination');
  }

  createGain(): FakeGain {
    return new FakeGain(this);
  }
  createBufferSource(): FakeBufferSource {
    return new FakeBufferSource(this);
  }
  createBuffer(channels: number, length: number, sampleRate: number): FakeBuffer {
    return new FakeBuffer(channels, length, sampleRate);
  }
  createOscillator(): FakeOscillator {
    return new FakeOscillator(this);
  }
  createBiquadFilter(): FakeFilter {
    return new FakeFilter(this);
  }
  createDynamicsCompressor(): FakeCompressor {
    return new FakeCompressor(this);
  }
  createWaveShaper(): FakeShaper {
    return new FakeShaper(this);
  }
  createAnalyser(): FakeAnalyser {
    return new FakeAnalyser(this);
  }
  createStereoPanner(): FakePanner {
    return new FakePanner(this);
  }
  decodeAudioData(_data: ArrayBuffer): Promise<FakeBuffer> {
    return Promise.resolve(new FakeBuffer(1, this.sampleRate, this.sampleRate));
  }
  resume(): Promise<void> {
    this.resumeCalls++;
    if (this.allowResume) this.setState('running');
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.setState('suspended');
    return Promise.resolve();
  }
  close(): Promise<void> {
    this.setState('closed');
    return Promise.resolve();
  }
  addEventListener(type: string, fn: () => void): void {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(fn);
  }
  removeEventListener(type: string, fn: () => void): void {
    this.listeners.get(type)?.delete(fn);
  }
  setState(s: AudioContextState): void {
    this.state = s;
    for (const fn of this.listeners.get('statechange') ?? []) fn();
  }

  /** Moves time on and fires `onended` for sources that finished. */
  advance(seconds: number): void {
    this.currentTime += seconds;
    for (const n of this.nodes) {
      if (!(n instanceof FakeScheduled) || n.ended || n.startedAt === null) continue;
      const end = n.endTime();
      if (end !== null && end <= this.currentTime) {
        n.ended = true;
        n.onended?.();
      }
    }
  }

  of<T extends FakeNode>(ctor: new (ctx: FakeContext) => T): T[] {
    return this.nodes.filter((n): n is T => n instanceof ctor);
  }

  /** Buffer sources carrying effect buffers (not the one-sample unlock blip or the noise buffer). */
  effectSources(): FakeBufferSource[] {
    return this.of(FakeBufferSource).filter((s) => s.buffer !== null && s.buffer.length > 1 && !s.loop);
  }

  /** Cast for APIs that take a real AudioContext. */
  asAudioContext(): AudioContext {
    return this as unknown as AudioContext;
  }
}
