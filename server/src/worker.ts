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
import { SIM_VERSION, content, reSimulate } from '../shared/match';
import { FRAME_TICKS, type MatchSpec } from '../shared/protocol';
import { MatchRoom, type Conn } from './room';

export interface Env {
  MATCH: DurableObjectNamespace<MatchDO>;
  LOBBY: DurableObjectNamespace<LobbyDO>;
  VERIFY: string;
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

function roomOptions(url: URL): { format: MatchSpec['format']; tickMs: number; level: number } {
  const f = url.searchParams.get('format');
  const format = f === 'standard' || f === 'full' ? f : 'short';
  // tickMs < 50 only exists so the automated test can play a match faster than real time.
  const tickMs = Math.max(5, Math.min(50, Number(url.searchParams.get('tickMs') ?? 50) || 50));
  return { format, tickMs, level: 8 };
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const parts = url.pathname.split('/').filter(Boolean); // api rooms CODE ws
    if (parts[0] !== 'api') return json({ ok: true, service: 'ageborn-online-spike', simVersion: SIM_VERSION, contentHash: content.hash });
    if (req.method === 'POST' && parts[1] === 'rooms' && parts.length === 2) {
      const code = newCode();
      await env.MATCH.get(env.MATCH.idFromName(code)).init(code, roomOptions(url));
      return json({ code });
    }
    if (req.method === 'POST' && parts[1] === 'quick') {
      const lobby = env.LOBBY.get(env.LOBBY.idFromName('global'));
      const code = await lobby.pair(roomOptions(url), newCode());
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
  private waiting: { code: string; since: number } | null = null;

  async pair(opts: ReturnType<typeof roomOptions>, fresh: string): Promise<string> {
    const now = Date.now();
    if (this.waiting && now - this.waiting.since < 60_000) {
      const code = this.waiting.code;
      this.waiting = null;
      return code;
    }
    await this.env.MATCH.get(this.env.MATCH.idFromName(fresh)).init(fresh, opts);
    this.waiting = { code: fresh, since: now };
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

  private timed<T>(fn: () => T): T {
    const t0 = performance.now();
    try {
      return fn();
    } finally {
      if (this.room) this.room.stats.handlerMs += performance.now() - t0;
    }
  }

  override async fetch(req: Request): Promise<Response> {
    if (!this.room) {
      const saved = await this.ctx.storage.get<{ code: string } & ReturnType<typeof roomOptions>>('opts');
      if (!saved) return json({ error: 'no such room' }, 404);
      await this.init(saved.code, saved);
    }
    const room = this.room as MatchRoom;
    const url = new URL(req.url);
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    // Hibernation API: the runtime owns the socket; handlers below are called per message.
    this.ctx.acceptWebSocket(server);
    const conn: Conn = { send: (d) => server.send(d), close: (c, r) => server.close(c, r) };
    this.conns.set(server, conn);
    this.timed(() => room.join(conn, url.searchParams.get('name') ?? '', url.searchParams.get('token')));
    if (room.spec && !this.timer && !room.finished) {
      this.timer = setInterval(() => this.timed(() => room.frame()), room.spec.tickMs * FRAME_TICKS);
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  override async webSocketMessage(ws: WebSocket, msg: string | ArrayBuffer): Promise<void> {
    const conn = this.conns.get(ws);
    if (!conn || !this.room || typeof msg !== 'string') return;
    const room = this.room;
    this.timed(() => room.message(conn, msg));
  }

  override async webSocketClose(ws: WebSocket): Promise<void> {
    const conn = this.conns.get(ws);
    if (conn && this.room) this.room.leave(conn);
    this.conns.delete(ws);
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.webSocketClose(ws);
  }
}
