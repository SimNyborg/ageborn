/**
 * Client adapter for online 1v1 (docs/online-spike.md). Wraps one WebSocket to the match Durable
 * Object and drives a local deterministic `Sim` from the server's frames.
 *
 * The game (or a bot) calls `issue(cmd)`; the command is sent as-is, the server stamps its tick, and
 * it comes back in a frame for both players. The sim only ever steps up to the frame's `u`, so the two
 * clients apply exactly the same commands on exactly the same ticks without rollback.
 *
 * `latency` simulates a network path (one-way delay + jitter, order preserved like TCP).
 */
import type { Command, MatchOutcome, Side, Sim, SimEvent, TimedCommand } from '@/contracts';
import { SIM_VERSION, content, createSim, matchConfig, toTimed } from '../shared/match';
import { HASH_EVERY, type ClientMsg, type MatchSpec, type ServerMsg, type WireCmd } from '../shared/protocol';

export interface Latency {
  /** One-way delay in ms, each direction. */
  oneWayMs: number;
  /** Extra random delay 0..jitterMs, each message. */
  jitterMs: number;
}

export interface NetStats {
  framesIn: number;
  msgsIn: number;
  msgsOut: number;
  bytesIn: number;
  bytesOut: number;
  commandsSent: number;
  /** ms from `issue()` to the local sim executing it. */
  inputLatencyMs: number[];
  /** Times the sim had caught up with `u` and had to wait for the next frame while the clock ran. */
  catchUpBursts: number;
  desyncs: number;
  /** Commands that arrived for a tick already simulated (must stay 0). */
  lateCommands: number;
  reconnects: number;
  /** ms spent re-simulating the log on (re)connect. */
  catchUpMs: number[];
}

export class OnlineMatch {
  sim: Sim | null = null;
  side: Side = 0;
  spec: MatchSpec | null = null;
  token: string | null = null;
  code = '';
  u = -1;
  result: Extract<ServerMsg, { t: 'result' }> | null = null;
  endSent = false;
  readonly stats: NetStats = { framesIn: 0, msgsIn: 0, msgsOut: 0, bytesIn: 0, bytesOut: 0, commandsSent: 0, inputLatencyMs: [], catchUpBursts: 0, desyncs: 0, lateCommands: 0, reconnects: 0, catchUpMs: [] };
  /** Called for every tick the local sim steps (render, sound, bots). */
  onTick: ((events: readonly SimEvent[], sim: Sim) => void) | null = null;
  onStart: ((reconnect: boolean) => void) | null = null;

  private ws: WebSocket | null = null;
  private pending = new Map<number, TimedCommand[]>();
  private outAt = 0;
  private inAt = 0;
  /** Issue times of my commands still in flight; the server's seq for my side counts them in order. */
  private issued: number[] = [];
  private mySeqSeen = 0;
  private starts = 0;

  constructor(
    private readonly wsBase: string,
    private readonly latency: Latency = { oneWayMs: 0, jitterMs: 0 },
  ) {}

  private inbox: [number, () => void][] = [];
  private outbox: [number, () => void][] = [];

  /**
   * Runs `fn` at time `at`, strictly in queue order (a WebSocket is ordered like TCP). Timers alone
   * are not enough: setTimeout rounds delays, so two messages due at nearly the same time can swap.
   */
  private later(q: [number, () => void][], at: number, fn: () => void): void {
    q.push([at, fn]);
    if (q.length > 1) return;
    const pump = (): void => {
      const now = performance.now();
      while (q.length && (q[0] as [number, () => void])[0] <= now + 0.5) (q.shift() as [number, () => void])[1]();
      if (q.length) setTimeout(pump, Math.max(0, (q[0] as [number, () => void])[0] - performance.now()));
    };
    setTimeout(pump, Math.max(0, at - performance.now()));
  }

  private delay(prev: number): number {
    const t = performance.now() + this.latency.oneWayMs + Math.random() * this.latency.jitterMs;
    return Math.max(prev, t);
  }

  connect(code: string, name: string): void {
    this.code = code;
    const q = new URLSearchParams({ name });
    if (this.token) q.set('token', this.token);
    const ws = new WebSocket(`${this.wsBase}/api/rooms/${code}/ws?${q}`);
    this.ws = ws;
    ws.onmessage = (ev) => {
      const data = String(ev.data);
      const at = this.delay(this.inAt);
      this.inAt = at;
      this.later(this.inbox, at, () => this.receive(data));
    };
  }

  /** Drops the socket (tests use it to simulate a lost connection). */
  drop(): void {
    this.ws?.close();
    this.ws = null;
  }

  reconnect(name: string): void {
    this.stats.reconnects += 1;
    this.connect(this.code, name);
  }

  private send(m: ClientMsg): void {
    const ws = this.ws;
    if (!ws) return;
    const s = JSON.stringify(m);
    this.stats.msgsOut += 1;
    this.stats.bytesOut += s.length;
    const at = this.delay(this.outAt);
    this.outAt = at;
    this.later(this.outbox, at, () => {
      if (ws.readyState === WebSocket.OPEN) ws.send(s);
    });
  }

  /** The player (or a bot) issues a command. Side is filled in by the server. */
  issue(c: Command): void {
    if (!this.sim || this.sim.state.outcome || !this.ws) return;
    this.issued.push(performance.now());
    this.stats.commandsSent += 1;
    this.send({ t: 'cmd', c });
  }

  private receive(data: string): void {
    this.stats.msgsIn += 1;
    this.stats.bytesIn += data.length;
    const m = JSON.parse(data) as ServerMsg;
    switch (m.t) {
      case 'seat':
        this.side = m.side;
        this.token = m.token;
        break;
      case 'start':
        this.start(m);
        break;
      case 'f':
        this.stats.framesIn += 1;
        if (m.c) this.queue(m.c);
        this.u = m.u;
        this.advance();
        break;
      case 'desync':
        this.stats.desyncs += 1;
        break;
      case 'result':
        this.result = m;
        break;
      default:
        break;
    }
  }

  private queue(cmds: readonly WireCmd[]): void {
    for (const w of cmds) {
      // A command for a tick the sim already ran would be a relay bug (it would desync); count it.
      if (this.sim && w[0] <= this.sim.state.tick) this.stats.lateCommands += 1;
      const list = this.pending.get(w[0]);
      if (list) list.push(toTimed(w));
      else this.pending.set(w[0], [toTimed(w)]);
    }
  }

  private start(m: Extract<ServerMsg, { t: 'start' }>): void {
    if (m.contentHash !== content.hash || m.simVersion !== SIM_VERSION) {
      // Cross-play rule: browser and app must run the same sim and content build.
      throw new Error(`version mismatch: server ${m.simVersion}/${m.contentHash}, client ${SIM_VERSION}/${content.hash}`);
    }
    const reconnect = this.starts > 0;
    this.starts += 1;
    this.spec = m.spec;
    this.side = m.side;
    this.sim = createSim(matchConfig(m.spec));
    this.pending.clear();
    this.issued = [];
    this.endSent = false;
    this.queue(m.log);
    // My commands already in the log were issued before; later seqs of my side are new.
    this.mySeqSeen = 0;
    for (const w of m.log) if (w[2].side === m.side) this.mySeqSeen = Math.max(this.mySeqSeen, w[1]);
    this.u = m.u;
    // Catch up by re-simulating the command log (reconnect); silent: no per-tick callbacks.
    const t0 = performance.now();
    const sim = this.sim;
    while (!sim.state.outcome && sim.state.tick < this.u) this.stepOne(false);
    this.stats.catchUpMs.push(performance.now() - t0);
    this.onStart?.(reconnect);
  }

  private stepOne(live: boolean): void {
    const sim = this.sim as Sim;
    const tick = sim.state.tick + 1;
    const cmds = this.pending.get(tick) ?? [];
    this.pending.delete(tick);
    if (live) {
      const now = performance.now();
      for (const c of cmds) {
        if (c.side !== this.side || c.seq <= this.mySeqSeen) continue;
        this.mySeqSeen = c.seq;
        const t = this.issued.shift();
        if (t !== undefined) this.stats.inputLatencyMs.push(now - t);
      }
    }
    const events = sim.step(cmds);
    if (tick % HASH_EVERY === 0) this.send({ t: 'hash', k: tick, h: sim.hash() });
    if (live) this.onTick?.(events, sim);
    const o = sim.state.outcome;
    if (o && !this.endSent) this.sendEnd(o);
  }

  private sendEnd(o: MatchOutcome): void {
    this.endSent = true;
    const sim = this.sim as Sim;
    this.send({ t: 'end', k: sim.state.tick, o, h: sim.hash() });
  }

  /** Steps the sim to `u` (the last tick the server guarantees complete). */
  private advance(): void {
    const sim = this.sim;
    if (!sim) return;
    const behind = this.u - sim.state.tick;
    if (behind > 2) this.stats.catchUpBursts += 1;
    while (!sim.state.outcome && sim.state.tick < this.u) this.stepOne(true);
  }
}
