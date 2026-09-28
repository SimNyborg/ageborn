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
  /** Unguessable reconnect token (crypto RNG in the Worker). Falls back to `random` when absent. */
  secret?: () => string;
  /** Called when a seat is taken, so a hibernated Durable Object can restore its seats. */
  onSeat?: (side: Side, token: string, name: string) => void;
  /** Re-simulates the log at the end (server anti-cheat). Null = off. */
  verify: ((spec: MatchSpec, log: readonly WireCmd[], o: MatchOutcome | null, h: number | null) => { ok: boolean; finalHash: number; outcome: MatchOutcome | null }) | null;
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
  /** env.now() when the socket dropped, or -1 while connected. */
  goneAt: number;
  /** [windowStart ms, messages in window]: per-socket flood guard. */
  msgWin: [number, number];
}

/** Allowed fields per command type and their value domains (everything else is stripped). */
const INT = (lo: number, hi: number) => (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= lo && v <= hi;
const ONE_OF = (...xs: string[]) => (v: unknown): v is string => typeof v === 'string' && xs.includes(v);
const COMMAND_FIELDS: Record<string, Record<string, { check: (v: unknown) => boolean; optional?: boolean }>> = {
  train: { slot: { check: INT(0, 4) } },
  cancelTrain: { slot: { check: INT(0, 4), optional: true } },
  buildTurret: { mount: { check: INT(0, 3) }, slot: { check: INT(0, 1) } },
  replaceTurret: { mount: { check: INT(0, 3) }, slot: { check: INT(0, 1) } },
  sellTurret: { mount: { check: INT(0, 3) } },
  buyMount: {},
  treasury: {},
  evolve: {},
  // p is an aim point in lane units (the sim clamps it to the power zone); any finite number in range.
  power: { p: { check: (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100_000, optional: true } },
  stance: { stance: { check: ONE_OF('charge', 'hold') } },
  lastStand: {},
  emote: { emote: { check: ONE_OF('laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg') } },
  retreat: {},
};

/**
 * Rebuilds a client command from whitelisted fields only. `side`, `tick` and `seq` are never taken
 * from the client; unknown fields are dropped so a modified client cannot bloat the log or the
 * opponent's traffic. Returns null for anything malformed.
 */
export function sanitizeCommand(c: unknown, side: Side): Command | null {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return null;
  const t = (c as { t?: unknown }).t;
  if (typeof t !== 'string' || !Object.hasOwn(COMMAND_FIELDS, t)) return null;
  const spec = COMMAND_FIELDS[t] as Record<string, { check: (v: unknown) => boolean; optional?: boolean }>;
  const out: Record<string, unknown> = { t, side };
  for (const [k, f] of Object.entries(spec)) {
    const v = (c as Record<string, unknown>)[k];
    if (v === undefined && f.optional) continue;
    if (!f.check(v)) return null;
    out[k] = v;
  }
  return out as unknown as Command;
}


/** Commands per side per second a human can plausibly issue; more is dropped (flood guard). */
const MAX_CMDS_PER_SEC = 20;
/** Any message per socket per second above this closes the socket (protects the free request quota). */
const MAX_MSGS_PER_SEC = 60;
/** Larger client messages are dropped unread (a real command is < 80 bytes). */
const MAX_MSG_BYTES = 512;
/** A seat gone this long forfeits; both seats gone this long ends the room (stops the frame timer). */
export const FORFEIT_MS = 60_000;
export const ABANDON_MS = 20_000;

export class MatchRoom {
  readonly seats: [Seat | null, Seat | null] = [null, null];
  readonly log: WireCmd[] = [];
  spec: MatchSpec | null = null;
  startAt = 0;
  finished = false;
  outcome: MatchOutcome | null = null;
  /** Why the room ended without an agreed result: forfeit/abandon/timeout, or null. */
  endReason: 'forfeit' | 'abandoned' | 'timeout' | null = null;
  abandonedBy: Side | null = null;
  private seq: [number, number] = [0, 0];
  /** Highest `u` ever sent to a client. */
  private maxU = -1;
  private hashes = new Map<number, [number | null, number | null]>();
  private rate: [number, number, number] = [0, 0, 0]; // [windowStartTick, side0 count, side1 count]
  readonly stats: RoomStats = { msgsIn: 0, msgsOut: 0, bytesIn: 0, bytesOut: 0, commands: 0, hashChecks: 0, hashMismatches: 0, reconnects: 0, handlerMs: 0, verifyMs: -1, storageWrites: 0, ticks: 0, lateStamps: 0, rejected: 0, hashUnpaired: 0 };

  constructor(
    readonly code: string,
    private readonly opts: { tickMs: number; format: MatchSpec['format']; level: number; /** Hard cap: the room ends at this tick whatever the clients say. */ maxTicks?: number },
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
    if (this.env.secret) return this.env.secret();
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
        seat.goneAt = -1;
        this.stats.reconnects += 1;
        this.out(conn, { t: 'seat', side, token: seat.token, code: this.code });
        if (this.spec) this.sendStart(side);
        return true;
      }
    }
    const free: Side | -1 = this.seats[0] === null ? 0 : this.seats[1] === null ? 1 : -1;
    if (free === -1) {
      this.out(conn, { t: 'error', msg: 'room full' });
      return false;
    }
    if (this.finished) {
      this.out(conn, { t: 'error', msg: 'room finished' });
      return false;
    }
    const seat: Seat = { token: this.token(), name: name.slice(0, 24) || `Player ${free + 1}`, conn, sent: 0, u: -1, end: null, goneAt: -1, msgWin: [0, 0] };
    this.seats[free] = seat;
    this.env.onSeat?.(free, seat.token, seat.name);
    this.out(conn, { t: 'seat', side: free, token: seat.token, code: this.code });
    if (this.seats[0] && this.seats[1] && !this.spec) this.begin();
    return true;
  }

  /** Hibernation restore: puts back a seat (and its live socket, if any) taken before the object slept. */
  restoreSeat(side: Side, token: string, name: string, conn: Conn | null): void {
    if (this.seats[side] || this.spec) return;
    this.seats[side] = { token, name, conn, sent: 0, u: -1, end: null, goneAt: conn ? -1 : this.env.now(), msgWin: [0, 0] };
  }

  /** Side of a connection, or -1. */
  sideOf(conn: Conn): Side | -1 {
    return this.seats[0]?.conn === conn ? 0 : this.seats[1]?.conn === conn ? 1 : -1;
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
    this.maxU = Math.max(this.maxU, u);
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
    for (const seat of this.seats)
      if (seat && seat.conn === conn) {
        seat.conn = null;
        seat.goneAt = this.env.now();
      }
    // Nobody ever started a match here and the only player left: free the seat for someone else.
    if (!this.spec) for (const side of [0, 1] as const) if (this.seats[side] && !this.seats[side]?.conn) this.seats[side] = null;
  }

  message(conn: Conn, raw: string): void {
    this.stats.msgsIn += 1;
    this.stats.bytesIn += raw.length;
    const found: Side | -1 = this.sideOf(conn);
    if (found === -1) return;
    const side: Side = found;
    const seat = this.seats[side] as Seat;
    const now = this.env.now();
    if (now - seat.msgWin[0] >= 1000) seat.msgWin = [now, 0];
    seat.msgWin[1] += 1;
    if (seat.msgWin[1] > MAX_MSGS_PER_SEC) {
      this.stats.rejected += 1;
      conn.close(1008, 'flood');
      this.leave(conn);
      return;
    }
    if (raw.length > MAX_MSG_BYTES) {
      this.stats.rejected += 1;
      return;
    }
    let m: ClientMsg;
    try {
      m = JSON.parse(raw) as ClientMsg;
    } catch {
      this.stats.rejected += 1;
      return;
    }
    if (!m || typeof m !== 'object') {
      this.stats.rejected += 1;
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
        if (typeof m.n === 'number') this.out(conn, { t: 'pong', n: m.n, k: this.tick() });
        break;
      default:
        this.stats.rejected += 1;
    }
  }

  private command(side: Side, c: Command): void {
    if (!this.spec || this.finished || this.outcome) return;
    // Commands sent during the start countdown count as tick 0.
    const k = Math.max(0, this.tick());
    // Whitelist the shape; the sim still validates the game rules and rejects deterministically.
    const cmd = sanitizeCommand(c, side);
    if (!cmd) {
      this.stats.rejected += 1;
      return;
    }
    // Rate guard: the side is set by the server, never trusted from the client.
    const second = Math.floor((k * this.opts.tickMs) / 1000);
    if (this.rate[0] !== second) this.rate = [second, 0, 0];
    this.rate[side + 1] += 1;
    if ((this.rate[side + 1] as number) > MAX_CMDS_PER_SEC) return;
    this.seq[side] += 1;
    // Never stamp a tick that a client was already told is complete, and keep the log sorted,
    // even if the runtime clock is coarse or seen out of order between events.
    const last = this.log.length ? (this.log[this.log.length - 1] as WireCmd)[0] : 0;
    const stamp = Math.max(k + INPUT_DELAY, this.maxU + 1, last);
    if (stamp > k + INPUT_DELAY) this.stats.lateStamps += 1;
    this.log.push([stamp, this.seq[side], cmd]);
    this.stats.commands += 1;
  }

  private hash(side: Side, k: number, h: number): void {
    // A client can only hash ticks it was allowed to simulate (<= maxU); anything else is ignored,
    // so a modified client cannot grow the table with far-future ticks.
    if (!Number.isInteger(k) || k <= 0 || k % HASH_EVERY !== 0 || k > this.maxU || !Number.isInteger(h)) {
      this.stats.rejected += 1;
      return;
    }
    // Forget checks the other side never answered (it was away); count them.
    if (this.hashes.size > 64)
      for (const key of [...this.hashes.keys()])
        if (key < k - 64 * HASH_EVERY) {
          this.hashes.delete(key);
          this.stats.hashUnpaired += 1;
        }
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
    // A client cannot have simulated past the last complete tick it was sent: an end claim for a
    // later tick is a lie (or a bug) and is ignored.
    const o = m.o as MatchOutcome | null;
    if (!Number.isInteger(m.k) || m.k < 0 || m.k > this.maxU || !Number.isInteger(m.h) || !o || typeof o !== 'object' || o.tick !== m.k) {
      this.stats.rejected += 1;
      return;
    }
    seat.end = { k: m.k, o, h: m.h };
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
      this.maxU = Math.max(this.maxU, u);
      this.out(seat.conn, msg);
    }
    // A side that reported the end while the other is gone finishes the room alone.
    const ends = this.seats.filter((s) => s?.end).length;
    if (ends === 1 && this.seats.some((s) => s && !s.end && !s.conn)) return this.finish();
    // Forfeit and abandon: without this a room whose players vanished keeps its frame timer (and the
    // Durable Object's billed wall time) running until the runtime evicts it.
    const now = this.env.now();
    const gone = ([0, 1] as const).filter((sd) => { const s = this.seats[sd]; return !!s && !s.conn && !s.end && s.goneAt >= 0; });
    if (gone.length === 2 && gone.every((sd) => now - (this.seats[sd] as Seat).goneAt >= ABANDON_MS)) return this.finish('abandoned', null);
    const g = gone[0];
    if (gone.length === 1 && g !== undefined && now - (this.seats[g] as Seat).goneAt >= FORFEIT_MS) return this.finish('forfeit', g);
    if (this.opts.maxTicks !== undefined && k > this.opts.maxTicks) this.finish('timeout', null);
  }

  finish(reason: 'forfeit' | 'abandoned' | 'timeout' | null = null, by: Side | null = null): void {
    if (this.finished || !this.spec) return;
    this.finished = true;
    this.endReason = reason;
    this.abandonedBy = by;
    const e0 = this.seats[0]?.end ?? null;
    const e1 = this.seats[1]?.end ?? null;
    const agreed = !!e0 && !!e1 && e0.h === e1.h && e0.o.winner === e1.o.winner && e0.o.tick === e1.o.tick;
    const claim = e0 ?? e1;
    let verified: boolean | null = null;
    let finalHash: number | null = claim?.h ?? null;
    // With verification on, the server's own re-simulation decides the result; client claims are
    // only compared against it. Without it (or if it throws) the claim stands, flagged unverified.
    let outcome: MatchOutcome | null = claim?.o ?? null;
    if (this.env.verify && !reason) {
      const t0 = this.env.now();
      try {
        const r = this.env.verify(this.spec, this.log, claim?.o ?? null, claim?.h ?? null);
        verified = r.ok;
        finalHash = r.finalHash;
        outcome = r.outcome;
      } catch {
        verified = false;
      }
      this.stats.verifyMs = this.env.now() - t0;
    }
    if (reason) outcome = null;
    this.outcome = outcome;
    this.env.persist(`match:${this.code}`, { spec: this.spec, log: this.log, outcome, claims: [e0, e1], finalHash, agreed, verified, endReason: reason, abandonedBy: by });
    this.stats.storageWrites += 1;
    const msg: ServerMsg = { t: 'result', o: outcome, agreed, verified, finalHash, endReason: reason, abandonedBy: by, stats: { ...this.stats } };
    for (const seat of this.seats) this.out(seat?.conn ?? null, msg);
    this.env.onFinished();
  }
}
