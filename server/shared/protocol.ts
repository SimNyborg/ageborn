/**
 * Wire protocol of the online 1v1 spike (docs/online-spike.md). JSON over one WebSocket per player.
 *
 * Netcode (DESIGN D1 "Online 1v1"): deterministic lockstep with an authoritative input relay.
 * - A client sends a bare `Command` as soon as the player (or the bot in tests) issues it.
 * - The server stamps it with execution tick `serverTick + INPUT_DELAY` and a server-owned seq.
 * - Every FRAME_TICKS ticks the server broadcasts a frame: all stamped commands with tick <= `u`,
 *   where `u = serverTick + INPUT_DELAY - 1`. No later command can ever be stamped <= u, so a client
 *   may simulate up to `u` and never has to roll back.
 * - Clients send their state hash every HASH_EVERY ticks; the server compares the two sides.
 * - On reconnect the server sends the match config and its full command log; the client replays it.
 */
import type { Command, MatchOutcome, Side } from '@/contracts';

export const PROTOCOL_VERSION = 1;
/** Execution delay in ticks (D1: now + 4 = 200 ms at 50 ms per tick). */
export const INPUT_DELAY = 4;
/** A frame goes out every FRAME_TICKS server ticks (2 = 10 frames per second). */
export const FRAME_TICKS = 2;
/** Hash check cadence (D1: every 20 ticks; the sim records a hash every 20 ticks too). */
export const HASH_EVERY = 20;

/** Stamped command on the wire: [tick, seq, command]. The side is inside the command. */
export type WireCmd = [number, number, Command];

/** What both clients need to build the same `MatchConfig` (see match.ts). */
export interface MatchSpec {
  seed: number;
  format: 'short' | 'standard' | 'full';
  /** Ranked PvP sets every card to one level (A16.7: L8). */
  level: number;
  labels: [string, string];
  /** Server tick length in ms; 50 in production, smaller to run tests faster. */
  tickMs: number;
}

// ---- client -> server ----
export type ClientMsg =
  | { t: 'cmd'; c: Command }
  | { t: 'hash'; k: number; h: number }
  | { t: 'end'; k: number; o: MatchOutcome; h: number }
  | { t: 'ping'; n: number };

// ---- server -> client ----
export type ServerMsg =
  /** Seat assigned; `token` lets the same player reconnect. */
  | { t: 'seat'; side: Side; token: string; code: string }
  /** Match starts (or is resumed): tick 0 is `startIn` ms from now; `log` is the command log so far. */
  | { t: 'start'; spec: MatchSpec; side: Side; startIn: number; serverTick: number; u: number; log: WireCmd[]; contentHash: string; simVersion: string }
  /** Commands with tick <= u (and > the previous frame's u). */
  | { t: 'f'; u: number; c?: WireCmd[] }
  | { t: 'desync'; k: number; h: [number, number] }
  | { t: 'result'; o: MatchOutcome | null; agreed: boolean; verified: boolean | null; finalHash: number | null; stats: RoomStats }
  | { t: 'pong'; n: number; k: number }
  | { t: 'error'; msg: string };

export interface RoomStats {
  msgsIn: number;
  msgsOut: number;
  bytesIn: number;
  bytesOut: number;
  commands: number;
  hashChecks: number;
  hashMismatches: number;
  reconnects: number;
  /** Wall time spent inside message and frame handlers (ms); see docs for how CPU was measured. */
  handlerMs: number;
  /** Wall time of the server re-simulation at the end (ms), or -1 when off. */
  verifyMs: number;
  storageWrites: number;
  ticks: number;
}
