/**
 * Cloudflare Worker + Durable Objects for the online 1v1 spike (docs/online-spike.md).
 *
 * Routes:
 *   POST /api/rooms            -> { code }   create a private room (friend duel by room code)
 *   POST /api/quick            -> { code }   quick match: pair with whoever waits in the lobby
 *   GET  /api/rooms/:code/ws   -> WebSocket  join (?name=..&token=.. to reconnect)
 *   GET  /api/rooms/:code/stats-> RoomStats  measurements for the spike
 *
 * One `MatchDO` instance per room code (idFromName(code)); a single `LobbyDO` holds the quick-match
 * queue. Durable Objects run single-threaded, so the relay needs no locks.
 */
import { DurableObject } from 'cloudflare:workers';
import { SIM_VERSION, content, maxTicksFor, reSimulate } from '../shared/match';
import { FRAME_TICKS, type MatchSpec } from '../shared/protocol';
import { MatchRoom, type Conn } from './room';

export interface Env {
  MATCH: DurableObjectNamespace<MatchDO>;
  LOBBY: DurableObjectNamespace<LobbyDO>;
  VERIFY: string;
  /** "1" only in local tests: lets `?tickMs=` speed the clock up. Never set in a deployed Worker. */
  DEV_FAST?: string;
}

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' };
const json = (v: unknown, status = 200): Response => new Response(JSON.stringify(v), { status, headers: { 'content-type': 'application/json', ...CORS } });

/** Room codes: 6 chars without look-alikes (0/O, 1/I/L). ~1e9 codes. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function newCode(): string {
  const b = new Uint8Array(6);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => ALPHABET[x % ALPHABET.length]).join('');
}

function roomOptions(url: URL, env: Env): { format: MatchSpec['format']; tickMs: number; level: number; maxTicks: number } {
  const f = url.searchParams.get('format');
  const format = f === 'standard' || f === 'full' ? f : 'short';
  // tickMs < 50 only exists so the automated test can play a match faster than real time; a deployed
  // Worker ignores it (otherwise any client could open a 10x-speed room, e.g. through quick match).
  const tickMs = env.DEV_FAST === '1' ? Math.max(5, Math.min(50, Number(url.searchParams.get('tickMs') ?? 50) || 50)) : 50;
  return { format, tickMs, level: 8, maxTicks: maxTicksFor(format) };
}

/** 128-bit reconnect token from the crypto RNG (Math.random is not unguessable). */
function secretToken(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const parts = url.pathname.split('/').filter(Boolean); // api rooms CODE ws
    if (parts[0] !== 'api') return json({ ok: true, service: 'ageborn-online-spike', simVersion: SIM_VERSION, contentHash: content.hash });
    if (req.method === 'POST' && parts[1] === 'rooms' && parts.length === 2) {
      const code = newCode();
      await env.MATCH.get(env.MATCH.idFromName(code)).init(code, roomOptions(url, env));
      return json({ code });
    }
    if (req.method === 'POST' && parts[1] === 'quick') {
      const lobby = env.LOBBY.get(env.LOBBY.idFromName('global'));
      const code = await lobby.pair(roomOptions(url, env), newCode());
      return json({ code });
    }
    if (parts[1] === 'rooms' && parts[2] && /^[A-Z0-9]{6}$/.test(parts[2])) {
      const stub = env.MATCH.get(env.MATCH.idFromName(parts[2]));
      if (parts[3] === 'ws') {
        if (req.headers.get('Upgrade') !== 'websocket') return json({ error: 'expected websocket' }, 426);
        return stub.fetch(req);
      }
      if (parts[3] === 'stats') return json(await stub.stats());
    }
    return json({ error: 'not found' }, 404);
  },
} satisfies ExportedHandler<Env>;

/** The quick-match queue: one waiting room at a time (a real launch adds rating bands, see docs). */
export class LobbyDO extends DurableObject<Env> {
  // Kept in storage, not only in memory: an idle Durable Object can be evicted between two requests,
  // and the waiting player would then never be paired.
  async pair(opts: ReturnType<typeof roomOptions>, fresh: string): Promise<string> {
    const now = Date.now();
    const key = `waiting:${opts.format}:${opts.tickMs}`;
    const waiting = await this.ctx.storage.get<{ code: string; since: number }>(key);
    if (waiting && now - waiting.since < 60_000) {
      await this.ctx.storage.delete(key);
      return waiting.code;
    }
    await this.env.MATCH.get(this.env.MATCH.idFromName(fresh)).init(fresh, opts);
    await this.ctx.storage.put(key, { code: fresh, since: now });
    return fresh;
  }
}

/** One match. Holds the relay (`MatchRoom`) in memory while the match runs; persists the log at the end. */
export class MatchDO extends DurableObject<Env> {
  private room: MatchRoom | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private conns = new Map<WebSocket, Conn>();

  async init(code: string, opts: ReturnType<typeof roomOptions>): Promise<void> {
    if (this.room) return;
    this.room = new MatchRoom(code, opts, {
      now: () => Date.now(),
      random: () => Math.random(),
      secret: secretToken,
      onSeat: (side, token, name) => void this.ctx.storage.put(`seat:${side}`, { token, name }),
      verify: this.env.VERIFY === '1' ? (spec, log, o, h) => reSimulate(spec, log, o, h) : null,
      persist: (key, value) => void this.ctx.storage.put(key, value),
      contentHash: content.hash,
      simVersion: SIM_VERSION,
      onFinished: () => {
        if (this.timer) clearInterval(this.timer);
        this.timer = null;
      },
    });
    await this.ctx.storage.put('opts', { code, ...opts });
  }

  async stats(): Promise<unknown> {
    return this.room ? { ...this.room.stats, finished: this.room.finished, commands: this.room.log.length, outcome: this.room.outcome } : { error: 'no room' };
  }

  /**
   * Hibernation restore. With the Hibernation API the runtime may evict this object while sockets
   * stay open (e.g. a player waiting alone in a room). In-memory state is then gone: rebuild the room
   * from storage and re-attach each open socket to its seat through its attachment.
   */
  private async wake(): Promise<MatchRoom | null> {
    if (this.room) return this.room;
    const saved = await this.ctx.storage.get<{ code: string } & ReturnType<typeof roomOptions>>('opts');
    if (!saved) return null;
    await this.init(saved.code, saved);
    const room = this.room as MatchRoom | null;
    if (!room) return null;
    if (await this.ctx.storage.get(`match:${saved.code}`)) room.finished = true;
    for (const side of [0, 1] as const) {
      const seat = await this.ctx.storage.get<{ token: string; name: string }>(`seat:${side}`);
      if (!seat) continue;
      const ws = this.ctx.getWebSockets().find((w) => (w.deserializeAttachment() as { side?: number } | null)?.side === side);
      // Before the start a seat without a live socket is free again (see MatchRoom.leave).
      if (ws) room.restoreSeat(side, seat.token, seat.name, this.connFor(ws));
    }
    return room;
  }

  private connFor(ws: WebSocket): Conn {
    let c = this.conns.get(ws);
    if (!c) {
      c = { send: (d) => ws.send(d), close: (code, r) => ws.close(code, r) };
      this.conns.set(ws, c);
    }
    return c;
  }

  private timed<T>(fn: () => T): T {
    const t0 = performance.now();
    try {
      return fn();
    } finally {
      if (this.room) this.room.stats.handlerMs += performance.now() - t0;
    }
  }

  override async fetch(req: Request): Promise<Response> {
    const room = await this.wake();
    if (!room) return json({ error: 'no such room' }, 404);
    const url = new URL(req.url);
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    // Hibernation API: the runtime owns the socket; handlers below are called per message.
    this.ctx.acceptWebSocket(server);
    const conn = this.connFor(server);
    const ok = this.timed(() => room.join(conn, url.searchParams.get('name') ?? '', url.searchParams.get('token')));
    const side = room.sideOf(conn);
    if (ok && side !== -1) server.serializeAttachment({ side });
    else server.close(1008, 'rejected');
    if (room.spec && !this.timer && !room.finished) {
      this.timer = setInterval(() => this.timed(() => room.frame()), room.spec.tickMs * FRAME_TICKS);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer): Promise<void> {
    if (typeof msg !== 'string') return;
    const room = await this.wake();
    if (!room) return;
    const conn = this.connFor(ws);
    this.timed(() => room.message(conn, msg));
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    const room = await this.wake();
    const conn = this.conns.get(ws);
    if (conn && room) room.leave(conn);
    this.conns.delete(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}
