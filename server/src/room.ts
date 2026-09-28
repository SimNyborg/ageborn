/**
 * One online 1v1 match: the input relay (DESIGN D1 "Online 1v1"). Transport-agnostic so the same
 * code runs inside the Durable Object (worker.ts) and in a plain Node benchmark (test/bench.mjs).
 *
 * The server does not simulate during the match. It owns the clock, stamps every command with
 * `serverTick + INPUT_DELAY`, keeps the command log, relays frames, compares state hashes, and at
 * the end can re-simulate the log (anti-cheat) because the sim is pure and deterministic.
 */
import type { Command, MatchOutcome, Side } from '@/contracts';
import { FRAME_TICKS, HASH_EVERY, INPUT_DELAY, type ClientMsg, type MatchSpec, type RoomStats, type ServerMsg, type WireCmd } from '../shared/protocol';

export interface Conn {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export interface RoomEnv {
  now(): number;
  random(): number;
  /** Re-simulates the log at the end (server anti-cheat). Null = off. */
  verify: ((spec: MatchSpec, log: readonly WireCmd[], o: MatchOutcome, h: number) => { ok: boolean; finalHash: number }) | null;
  /** Persists the finished match (command log + result). */
  persist(key: string, value: unknown): void;
  contentHash: string;
  simVersion: string;
  /** Called when the room is done and the timer can stop. */
  onFinished(): void;
}

interface Seat {
  token: string;
  name: string;
  conn: Conn | null;
  /** Index into `log` of the next command this client has not been sent yet. */
  sent: number;
  /** Highest tick this client has been told is complete. */
  u: number;
  end: { k: number; o: MatchOutcome; h: number } | null;
}

const COMMAND_TYPES = new Set(['train', 'cancelTrain', 'buildTurret', 'replaceTurret', 'sellTurret', 'buyMount', 'treasury', 'evolve', 'power', 'stance', 'lastStand', 'emote', 'retreat']);
/** Commands per side per second a human can plausibly issue; more is dropped (flood guard). */
const MAX_CMDS_PER_SEC = 20;

export class MatchRoom {
  readonly seats: [Seat | null, Seat | null] = [null, null];
  readonly log: WireCmd[] = [];
  spec: MatchSpec | null = null;
  startAt = 0;
  finished = false;
  outcome: MatchOutcome | null = null;
  private seq: [number, number] = [0, 0];
  private hashes = new Map<number, [number | null, number | null]>();
  private rate: [number, number, number] = [0, 0, 0]; // [windowStartTick, side0 count, side1 count]
  readonly stats: RoomStats = { msgsIn: 0, msgsOut: 0, bytesIn: 0, bytesOut: 0, commands: 0, hashChecks: 0, hashMismatches: 0, reconnects: 0, handlerMs: 0, verifyMs: -1, storageWrites: 0, ticks: 0 };

  constructor(
    readonly code: string,
    private readonly opts: { tickMs: number; format: MatchSpec['format']; level: number },
    private readonly env: RoomEnv,
  ) {}

  /** Current server tick (negative before the match starts). */
  tick(): number {
    return Math.floor((this.env.now() - this.startAt) / this.opts.tickMs);
  }

  private out(conn: Conn | null, msg: ServerMsg): void {
    if (!conn) return;
    const s = JSON.stringify(msg);
    this.stats.msgsOut += 1;
    this.stats.bytesOut += s.length;
    try {
      conn.send(s);
    } catch {
      /* socket already closed */
    }
  }

  private token(): string {
    let t = '';
    for (let i = 0; i < 16; i += 1) t += Math.floor(this.env.random() * 36).toString(36);
    return t;
  }

  /** A player opens a socket. Returns false when the room is full and the token is unknown. */
  join(conn: Conn, name: string, token: string | null): boolean {
    // Reconnect: same token takes its seat back and gets the full log.
    for (const side of [0, 1] as const) {
      const seat = this.seats[side];
      if (seat && token && seat.token === token) {
        if (seat.conn && seat.conn !== conn) seat.conn.close(4000, 'replaced');
        seat.conn = conn;
        this.stats.reconnects += 1;
        this.out(conn, { t: 'seat', side, token: seat.token, code: this.code });
        if (this.spec) this.sendStart(side);
        return true;
      }
    }
    const free = this.seats[0] === null ? 0 : this.seats[1] === null ? 1 : -1;
    if (free < 0) {
      this.out(conn, { t: 'error', msg: 'room full' });
      return false;
    }
    const seat: Seat = { token: this.token(), name: name.slice(0, 24) || `Player ${free + 1}`, conn, sent: 0, u: -1, end: null };
    this.seats[free] = seat;
    this.out(conn, { t: 'seat', side: free, token: seat.token, code: this.code });
    if (this.seats[0] && this.seats[1] && !this.spec) this.begin();
    return true;
  }

  private begin(): void {
    const a = this.seats[0] as Seat;
    const b = this.seats[1] as Seat;
    this.spec = {
      seed: Math.floor(this.env.random() * 2147483647),
      format: this.opts.format,
      level: this.opts.level,
      labels: [a.name, b.name],
      tickMs: this.opts.tickMs,
    };
    // Tick 0 starts after a short countdown so both clients can build the sim.
    this.startAt = this.env.now() + 1000;
    this.sendStart(0);
    this.sendStart(1);
  }

  private sendStart(side: Side): void {
    const seat = this.seats[side];
    if (!seat || !this.spec) return;
    const k = this.tick();
    const u = Math.max(-1, this.completeUpTo(k));
    // Everything with tick <= u goes in the start message (the reconnect catch-up).
    let n = 0;
    while (n < this.log.length && (this.log[n] as WireCmd)[0] <= u) n += 1;
    seat.sent = n;
    seat.u = u;
    this.out(seat.conn, {
      t: 'start',
      spec: this.spec,
      side,
      startIn: this.startAt - this.env.now(),
      serverTick: k,
      u,
      log: this.log.slice(0, n),
      contentHash: this.env.contentHash,
      simVersion: this.env.simVersion,
    });
  }

  /** Last tick for which no new command can be stamped any more. */
  private completeUpTo(k: number): number {
    return k + INPUT_DELAY - 1;
  }

  leave(conn: Conn): void {
    for (const seat of this.seats) if (seat && seat.conn === conn) seat.conn = null;
  }

  message(conn: Conn, raw: string): void {
    this.stats.msgsIn += 1;
    this.stats.bytesIn += raw.length;
    const side = this.seats[0]?.conn === conn ? 0 : this.seats[1]?.conn === conn ? 1 : -1;
    if (side < 0) return;
    let m: ClientMsg;
    try {
      m = JSON.parse(raw) as ClientMsg;
    } catch {
      return;
    }
    switch (m.t) {
      case 'cmd':
        this.command(side, m.c);
        break;
      case 'hash':
        this.hash(side, m.k, m.h);
        break;
      case 'end':
        this.end(side, m);
        break;
      case 'ping':
        this.out(conn, { t: 'pong', n: m.n, k: this.tick() });
        break;
    }
  }

  private command(side: Side, c: Command): void {
    if (!this.spec || this.finished || this.outcome) return;
    const k = this.tick();
    if (k < 0) return;
    // Shape check only; the sim validates the rest and rejects invalid commands deterministically.
    if (!c || typeof c !== 'object' || !COMMAND_TYPES.has((c as { t: string }).t)) return;
    // Rate guard: the side is set by the server, never trusted from the client.
    const second = Math.floor((k * this.opts.tickMs) / 1000);
    if (this.rate[0] !== second) this.rate = [second, 0, 0];
    this.rate[side + 1] += 1;
    if ((this.rate[side + 1] as number) > MAX_CMDS_PER_SEC) return;
    this.seq[side] += 1;
    const cmd = { ...c, side } as Command;
    this.log.push([k + INPUT_DELAY, this.seq[side], cmd]);
    this.stats.commands += 1;
  }

  private hash(side: Side, k: number, h: number): void {
    if (k % HASH_EVERY !== 0) return;
    const e = this.hashes.get(k) ?? [null, null];
    e[side] = h;
    if (e[0] !== null && e[1] !== null) {
      this.hashes.delete(k);
      this.stats.hashChecks += 1;
      if (e[0] !== e[1]) {
        this.stats.hashMismatches += 1;
        const msg: ServerMsg = { t: 'desync', k, h: [e[0], e[1]] };
        this.out(this.seats[0]?.conn ?? null, msg);
        this.out(this.seats[1]?.conn ?? null, msg);
      }
    } else this.hashes.set(k, e);
  }

  private end(side: Side, m: { k: number; o: MatchOutcome; h: number }): void {
    const seat = this.seats[side];
    if (!seat || seat.end) return;
    seat.end = { k: m.k, o: m.o, h: m.h };
    const other = this.seats[side === 0 ? 1 : 0];
    if (other?.end || !other?.conn) this.finish();
  }

  /** Called every FRAME_TICKS ticks by the timer: send each client the commands that are now final. */
  frame(): void {
    if (!this.spec || this.finished) return;
    const k = this.tick();
    if (k < 0) return;
    this.stats.ticks = k;
    const u = this.completeUpTo(k);
    for (const seat of this.seats) {
      if (!seat || !seat.conn || u <= seat.u) continue;
      let n = seat.sent;
      while (n < this.log.length && (this.log[n] as WireCmd)[0] <= u) n += 1;
      const msg: ServerMsg = n > seat.sent ? { t: 'f', u, c: this.log.slice(seat.sent, n) } : { t: 'f', u };
      seat.sent = n;
      seat.u = u;
      this.out(seat.conn, msg);
    }
    // A side that reported the end while the other is gone for 10 s finishes the room alone.
    const ends = this.seats.filter((s) => s?.end).length;
    if (ends === 1 && this.seats.some((s) => s && !s.end && !s.conn)) this.finish();
  }

  finish(): void {
    if (this.finished || !this.spec) return;
    this.finished = true;
    const e0 = this.seats[0]?.end ?? null;
    const e1 = this.seats[1]?.end ?? null;
    const agreed = !!e0 && !!e1 && e0.h === e1.h && e0.o.winner === e1.o.winner && e0.o.tick === e1.o.tick;
    const claim = e0 ?? e1;
    let verified: boolean | null = null;
    let finalHash: number | null = claim?.h ?? null;
    if (claim && this.env.verify) {
      const t0 = this.env.now();
      const r = this.env.verify(this.spec, this.log, claim.o, claim.h);
      this.stats.verifyMs = this.env.now() - t0;
      verified = r.ok;
      finalHash = r.finalHash;
    }
    this.outcome = claim?.o ?? null;
    this.env.persist(`match:${this.code}`, { spec: this.spec, log: this.log, outcome: this.outcome, finalHash, agreed, verified });
    this.stats.storageWrites += 1;
    const msg: ServerMsg = { t: 'result', o: this.outcome, agreed, verified, finalHash, stats: { ...this.stats } };
    for (const seat of this.seats) this.out(seat?.conn ?? null, msg);
    this.env.onFinished();
  }
}
