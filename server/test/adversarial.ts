/**
 * Adversarial tests of the relay (MatchRoom) with a fake clock: what a modified client can and
 * cannot do. Plain Node, no workerd, runs in about a second.
 *
 * Run: npm run adversarial   (bundles this file with esbuild, then runs it)
 */
import type { MatchOutcome } from '@/contracts';
import { content, createSim, matchConfig, maxTicksFor, reSimulate } from '../shared/match';
import { FRAME_TICKS, HASH_EVERY, INPUT_DELAY, type ServerMsg, type WireCmd } from '../shared/protocol';
import { ABANDON_MS, FORFEIT_MS, MatchRoom, sanitizeCommand, type Conn } from '../src/room';

interface FakeConn extends Conn {
  inbox: ServerMsg[];
  closed: number | null;
}
const fakeConn = (): FakeConn => {
  const c: FakeConn = {
    inbox: [],
    closed: null,
    send: (d) => c.inbox.push(JSON.parse(d) as ServerMsg),
    close: (code) => {
      c.closed = code ?? 1000;
    },
  };
  return c;
};

let now = 0;
let seed = 1;
function newRoom(verify = true, tickMs = 50) {
  const persisted: Record<string, unknown> = {};
  const room = new MatchRoom('ADV001', { tickMs, format: 'short', level: 8, maxTicks: maxTicksFor('short') }, {
    now: () => now,
    random: () => ((seed = (seed * 16807) % 2147483647) / 2147483647),
    verify: verify ? (spec, log, o, h) => reSimulate(spec, log, o, h) : null,
    persist: (k, v) => {
      persisted[k] = v;
    },
    contentHash: content.hash,
    simVersion: 'x',
    onFinished: () => {},
  });
  const a = fakeConn();
  const b = fakeConn();
  room.join(a, 'A', null);
  room.join(b, 'B', null);
  return { room, a, b, persisted };
}
/** Advances the fake clock to server tick k, running the frame timer on the way. */
function runTo(room: MatchRoom, k: number): void {
  for (;;) {
    const cur = room.tick();
    if (cur >= k) break;
    now += room.spec!.tickMs * FRAME_TICKS;
    room.frame();
    if (room.finished) break;
  }
}
const send = (room: MatchRoom, c: Conn, m: unknown) => room.message(c, typeof m === 'string' ? m : JSON.stringify(m));

const results: { name: string; ok: boolean; detail?: string }[] = [];
function check(name: string, ok: boolean, detail?: string): void {
  results.push({ name, ok, ...(detail ? { detail } : {}) });
}

// 1. Side, tick and seq come from the server, never from the client.
{
  const { room, b } = newRoom(false);
  runTo(room, 100);
  send(room, b, { t: 'cmd', c: { t: 'train', side: 0, slot: 0, tick: 1, seq: 999 } });
  const w = room.log[0] as WireCmd;
  check('side spoof: command is stamped as the sender side', w[2].side === 1, JSON.stringify(w));
  check('tick spoof: command stamped at serverTick + INPUT_DELAY', w[0] === room.tick() + INPUT_DELAY, JSON.stringify(w));
  check('seq spoof: server seq used', w[1] === 1 && !('seq' in w[2]) && !('tick' in w[2]), JSON.stringify(w));
}

// 2. Malformed input is dropped without crashing the room.
{
  const { room, a } = newRoom(false);
  runTo(room, 20);
  const junk: unknown[] = ['null', '[]', '42', '"x"', 'not json', '{"t":"cmd"}', { t: 'cmd', c: null }, { t: 'cmd', c: [] }, { t: 'cmd', c: { t: 'nuke' } }, { t: 'cmd', c: { t: 'train', slot: '0' } }, { t: 'cmd', c: { t: 'train', slot: 9 } }, { t: 'cmd', c: { t: 'train', slot: 1.5 } }, { t: 'cmd', c: { t: 'emote', emote: 'rickroll' } }, { t: 'cmd', c: { t: '__proto__' } }, { t: 'cmd', c: { t: 'toString' } }, { t: 'hash', k: 'x', h: 1 }, { t: 'end', k: null, o: null, h: 1 }, { t: 'ping' }, { t: 'whatever' }];
  let threw = '';
  for (const j of junk) {
    try {
      send(room, a, j);
    } catch (e) {
      threw += `${JSON.stringify(j)}: ${(e as Error).message}; `;
    }
  }
  check('junk messages do not throw', threw === '', threw);
  check('junk messages add nothing to the log', room.log.length === 0, JSON.stringify(room.log));
  check('junk messages are counted as rejected', room.stats.rejected >= junk.length - 1, String(room.stats.rejected));
}

// 3. Extra fields are stripped; oversized messages dropped.
{
  const { room, a } = newRoom(false);
  runTo(room, 20);
  send(room, a, { t: 'cmd', c: { t: 'train', slot: 2, evil: { nested: [1, 2, 3] } } });
  send(room, a, { t: 'cmd', c: { t: 'train', slot: 2, pad: 'x'.repeat(2000) } });
  check('extra fields stripped', JSON.stringify(room.log[0]?.[2]) === JSON.stringify({ t: 'train', side: 0, slot: 2 }), JSON.stringify(room.log));
  check('oversized message dropped', room.log.length === 1);
  check('sanitize keeps optional fields', JSON.stringify(sanitizeCommand({ t: 'power', p: 123.5 }, 1)) === '{"t":"power","side":1,"p":123.5}' && JSON.stringify(sanitizeCommand({ t: 'cancelTrain' }, 0)) === '{"t":"cancelTrain","side":0}');
}

// 4. Command flood: per-side cap per second, and the socket is closed on a message flood.
{
  const { room, a } = newRoom(false);
  runTo(room, 40);
  for (let i = 0; i < 30; i += 1) send(room, a, { t: 'cmd', c: { t: 'emote', emote: 'gg' } });
  check('command cap: at most 20 per side per second', room.log.length === 20, String(room.log.length));
  for (let i = 0; i < 100; i += 1) send(room, a, { t: 'ping', n: i });
  check('message flood closes the socket', a.closed === 1008, String(a.closed));
}

// 5. Hash messages for ticks the client cannot have simulated are ignored; the table stays bounded.
{
  const { room, a, b } = newRoom(false);
  runTo(room, 400);
  for (let k = 20; k <= 400; k += 20) send(room, a, { t: 'hash', k, h: 7 });
  send(room, a, { t: 'hash', k: 20_000_000, h: 7 });
  check('far-future hash rejected', room.stats.rejected === 1, String(room.stats.rejected));
  send(room, b, { t: 'hash', k: 20, h: 8 });
  check('mismatching hash reported to both', room.stats.hashMismatches === 1 && a.inbox.some((m) => m.t === 'desync') && b.inbox.some((m) => m.t === 'desync'));
}

// 6. Invented results: an end claim for a future tick is ignored; a false claim with the opponent
//    away is overruled by the server's own re-simulation.
{
  const { room, a, b } = newRoom(true);
  runTo(room, 200);
  const fake: MatchOutcome = { winner: 1, reason: 'base', tick: 5000, baseHpBp: [0, 10000] } as unknown as MatchOutcome;
  send(room, b, { t: 'end', k: 5000, o: fake, h: 123 });
  check('future end claim ignored', !room.finished && room.stats.rejected === 1);
  room.leave(a); // the victim's connection drops
  const k = room.tick() + INPUT_DELAY - 1;
  send(room, b, { t: 'end', k, o: { ...fake, tick: k }, h: 123 });
  const res = b.inbox.find((m) => m.t === 'result') as Extract<ServerMsg, { t: 'result' }> | undefined;
  check('false claim: room finishes', room.finished && !!res);
  check('false claim: verified=false and the claimed winner is not the result', res?.verified === false && !(res?.o?.winner === 1 && res?.o?.tick === k), JSON.stringify(res?.o));
}

// 7. Abandon and forfeit stop the room (and so the billed frame timer).
{
  const r1 = newRoom(false);
  runTo(r1.room, 100);
  r1.room.leave(r1.a);
  r1.room.leave(r1.b);
  const t0 = now;
  while (!r1.room.finished && now - t0 < 5 * 60_000) runTo(r1.room, r1.room.tick() + 2);
  check('both gone: room ends as abandoned', r1.room.finished && r1.room.endReason === 'abandoned' && now - t0 >= ABANDON_MS && now - t0 < ABANDON_MS + 1000, `${r1.room.endReason} after ${now - t0} ms`);
  const r2 = newRoom(false);
  runTo(r2.room, 100);
  r2.room.leave(r2.b);
  const t1 = now;
  while (!r2.room.finished && now - t1 < 5 * 60_000) runTo(r2.room, r2.room.tick() + 2);
  check('one gone: forfeit by that side', r2.room.endReason === 'forfeit' && r2.room.abandonedBy === 1 && now - t1 >= FORFEIT_MS, `${r2.room.endReason} ${r2.room.abandonedBy} after ${now - t1} ms`);
  const r3 = newRoom(false);
  runTo(r3.room, 100);
  r3.room.leave(r3.b);
  runTo(r3.room, 600);
  const back = fakeConn();
  r3.room.join(back, 'B', (r3.b.inbox.find((m) => m.t === 'seat') as { token: string }).token);
  runTo(r3.room, 100 + (FORFEIT_MS / 50) * 2);
  check('reconnect in time cancels the forfeit', !r3.room.finished);
}

// 8. Clients that never report an end cannot keep a room alive forever.
{
  const { room } = newRoom(false);
  runTo(room, maxTicksFor('short') + 10);
  check('timeout cap ends the room', room.finished && room.endReason === 'timeout', `${room.endReason} at ${room.tick()}`);
}

// 9. Seats: unknown token cannot enter a full room; the right token gets its seat and the full log back.
{
  const { room, a, b } = newRoom(false);
  runTo(room, 50);
  send(room, a, { t: 'cmd', c: { t: 'train', slot: 0 } });
  runTo(room, 100);
  const intruder = fakeConn();
  const okIntruder = room.join(intruder, 'X', 'guess0000000000');
  check('wrong token rejected when full', !okIntruder && intruder.inbox.some((m) => m.t === 'error'));
  const tok = (b.inbox.find((m) => m.t === 'seat') as { token: string }).token;
  const again = fakeConn();
  room.join(again, 'B', tok);
  const st = again.inbox.find((m) => m.t === 'start') as Extract<ServerMsg, { t: 'start' }> | undefined;
  check('reconnect gets its seat and the log', b.closed === 4000 && st?.side === 1 && st.log.length === 1);
}

// 10. Determinism under delivery changes: frames chunked differently (delays, bursts, a reconnect with
//     a log catch-up) produce the same sim state as one straight replay of the log.
{
  const { room, a, b } = newRoom(false, 50);
  // Scripted players: both sides issue legal-looking commands at arbitrary server times.
  const script: [number, 0 | 1, object][] = [];
  for (let k = 10; k < 3000; k += 37) script.push([k, (k / 37) % 2 === 0 ? 0 : 1, { t: 'train', slot: k % 5 }]);
  for (let k = 500; k < 3000; k += 211) script.push([k, 1, { t: 'buildTurret', mount: 0, slot: 0 }]);
  script.sort((x, y) => x[0] - y[0]);
  let bConn: FakeConn = b;
  let i = 0;
  while (room.tick() < 3000) {
    runTo(room, room.tick() + 1);
    while (i < script.length && (script[i] as [number, number, object])[0] <= room.tick()) {
      const [, side, c] = script[i] as [number, 0 | 1, object];
      if (side === 0) send(room, a, { t: 'cmd', c });
      else if (bConn.closed === null) send(room, bConn, { t: 'cmd', c });
      i += 1;
    }
    if (room.tick() === 1500) {
      room.leave(bConn);
      bConn.closed = 1006;
    }
    if (room.tick() === 1600) {
      const tok = (b.inbox.find((m) => m.t === 'seat') as { token: string }).token;
      bConn = fakeConn();
      room.join(bConn, 'B', tok);
    }
  }
  const drive = (msgs: ServerMsg[], burst: number) => {
    const sim = createSim(matchConfig(room.spec!));
    const pending = new Map<number, WireCmd[]>();
    let u = -1;
    let late = 0;
    const take = (cs: WireCmd[] | undefined) => {
      for (const w of cs ?? []) {
        if (w[0] <= sim.state.tick) late += 1;
        pending.set(w[0], [...(pending.get(w[0]) ?? []), w]);
      }
    };
    const hashes: number[] = [];
    const stepTo = () => {
      while (!sim.state.outcome && sim.state.tick < u) {
        const t = sim.state.tick + 1;
        sim.step((pending.get(t) ?? []).map((w) => ({ ...w[2], tick: w[0], seq: w[1] }) as never));
        if (t % HASH_EVERY === 0) hashes.push(sim.hash());
      }
    };
    msgs.forEach((m, n) => {
      if (m.t === 'start') take(m.log), (u = m.u);
      if (m.t === 'f') take(m.c), (u = m.u);
      if (n % burst === 0) stepTo();
    });
    stepTo();
    return { tick: sim.state.tick, hash: sim.hash(), late, hashes };
  };
  const ca = drive(a.inbox, 1);
  const cbPart1 = b.inbox;
  const cbPart2 = drive(bConn.inbox, 7); // after the reconnect: rebuilt from the start log
  const straight = createSim(matchConfig(room.spec!));
  const byTick = new Map<number, WireCmd[]>();
  for (const w of room.log) byTick.set(w[0], [...(byTick.get(w[0]) ?? []), w]);
  while (straight.state.tick < ca.tick) straight.step((byTick.get(straight.state.tick + 1) ?? []).map((w) => ({ ...w[2], tick: w[0], seq: w[1] }) as never));
  const same = ca.tick === cbPart2.tick && ca.hash === cbPart2.hash && ca.hash === straight.hash();
  check('determinism: bursts + reconnect catch-up = straight replay', same && ca.late === 0 && cbPart2.late === 0, JSON.stringify({ a: ca.tick, b: cbPart2.tick, ha: ca.hash, hb: cbPart2.hash, hs: straight.hash(), late: [ca.late, cbPart2.late], preDropMsgs: cbPart1.length, logLen: room.log.length }));
}

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.name}${r.detail && (!r.ok || r.name.startsWith("determinism")) ? `  -> ${r.detail}` : ""}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : 0;
