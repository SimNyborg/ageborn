/**
 * CPU benchmark of the relay (MatchRoom) and of the server re-simulation, in plain Node.
 * workerd hides precise CPU time from code (timers are coarsened), so we measure the exact same
 * code here with process.cpuUsage() and a fake clock, fed with real bot matches.
 *
 * Run: npm run bench   (bundles this file with esbuild, then runs it)
 */
import type { Command, Side, TimedCommand } from '@/contracts';
import { botProfile, createBot, runHeadless } from '@/ai';
import { content, createSim, matchConfig, reSimulate } from '../shared/match';
import { FRAME_TICKS, HASH_EVERY, INPUT_DELAY, type MatchSpec, type WireCmd } from '../shared/protocol';
import { MatchRoom, type Conn } from '../src/room';

const N = Number(process.env['N'] ?? 20);

function recordMatch(seed: number): { spec: MatchSpec; cmds: TimedCommand[]; ticks: number; hashes: number[]; finalHash: number; outcome: NonNullable<ReturnType<typeof createSim>['state']['outcome']> } {
  const spec: MatchSpec = { seed, format: 'short', level: 8, labels: ['A', 'B'], tickMs: 50 };
  const sim = createSim(matchConfig(spec));
  const seats = ([0, 1] as Side[]).map((side) => ({ side, controller: createBot(botProfile(content, { generalId: 'echo', tier: 5 }), side, seed + side, content) }));
  runHeadless(sim, seats, { maxTicks: 20000 });
  const log = (sim as unknown as { log: TimedCommand[] }).log;
  return { spec, cmds: log, ticks: sim.state.tick, hashes: [...sim.state.hashes], finalHash: sim.hash(), outcome: sim.state.outcome! };
}

function relayOnce(m: ReturnType<typeof recordMatch>): { cpuUs: number; stats: MatchRoom['stats']; log: WireCmd[] } {
  let now = 0;
  const conns: Conn[] = [0, 1].map(() => ({ send: () => {}, close: () => {} }));
  const room = new MatchRoom('BENCH1', { tickMs: 50, format: 'short', level: 8 }, {
    now: () => now,
    random: () => 0.5,
    verify: null,
    persist: () => {},
    contentHash: content.hash,
    simVersion: 'x',
    onFinished: () => {},
  });
  const byTick = new Map<number, Command[]>();
  // Each command arrives at the server INPUT_DELAY ticks before it ran in the recorded match.
  for (const c of m.cmds) {
    const at = Math.max(0, c.tick - INPUT_DELAY); // bots act from tick 1; the relay only accepts from tick 0
    const list = byTick.get(at) ?? [];
    const { tick: _t, seq: _s, ...bare } = c;
    list.push(bare as Command);
    byTick.set(at, list);
  }
  const cpu0 = process.cpuUsage();
  room.join(conns[0]!, 'A', null);
  room.join(conns[1]!, 'B', null);
  now = room.startAt;
  for (let k = 0; k <= m.ticks; k += 1) {
    now = room.startAt + k * 50;
    for (const c of byTick.get(k) ?? []) room.message(conns[c.side]!, JSON.stringify({ t: 'cmd', c }));
    if (k % HASH_EVERY === 0 && k > 0) {
      const h = m.hashes[k / HASH_EVERY - 1] ?? 0;
      room.message(conns[0]!, JSON.stringify({ t: 'hash', k, h }));
      room.message(conns[1]!, JSON.stringify({ t: 'hash', k, h }));
    }
    if (k % FRAME_TICKS === 0) room.frame();
  }
  for (const s of [0, 1]) room.message(conns[s]!, JSON.stringify({ t: 'end', k: m.ticks, o: m.outcome, h: m.finalHash }));
  const d = process.cpuUsage(cpu0);
  return { cpuUs: d.user + d.system, stats: room.stats, log: room.log };
}

const matches: ReturnType<typeof recordMatch>[] = [];
for (let i = 0; i < N; i += 1) matches.push(recordMatch(1000 + i));
const relay = matches.map(relayOnce);
const verify = matches.map((m, i) => {
  // What an honest client computes from the relayed log (early commands shift by a few ticks, so this can differ from the recording).
  const honest = createSim(matchConfig(m.spec));
  const byTick = new Map<number, TimedCommand[]>();
  for (const w of relay[i]!.log) byTick.set(w[0], [...(byTick.get(w[0]) ?? []), { ...w[2], tick: w[0], seq: w[1] } as TimedCommand]);
  while (!honest.state.outcome && honest.state.tick < 20000) honest.step(byTick.get(honest.state.tick + 1) ?? []);
  const c0 = process.cpuUsage();
  const r = reSimulate(m.spec, relay[i]!.log, honest.state.outcome!, honest.hash());
  const d = process.cpuUsage(c0);
  return { cpuUs: d.user + d.system, ok: r.ok };
});
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const out = {
  matches: N,
  avgTicks: Math.round(avg(matches.map((m) => m.ticks))),
  avgGameMinutes: +(avg(matches.map((m) => m.ticks)) / 1200).toFixed(2),
  avgCommands: Math.round(avg(matches.map((m) => m.cmds.length))),
  relayCpuMsPerMatch: +(avg(relay.map((r) => r.cpuUs)) / 1000).toFixed(2),
  relayMsgsIn: Math.round(avg(relay.map((r) => r.stats.msgsIn))),
  relayMsgsOut: Math.round(avg(relay.map((r) => r.stats.msgsOut))),
  relayBytesIn: Math.round(avg(relay.map((r) => r.stats.bytesIn))),
  relayBytesOut: Math.round(avg(relay.map((r) => r.stats.bytesOut))),
  hashMismatches: relay.reduce((a, r) => a + r.stats.hashMismatches, 0),
  reSimCpuMsPerMatch: +(avg(verify.map((v) => v.cpuUs)) / 1000).toFixed(1),
  reSimMaxCpuMs: +(Math.max(...verify.map((v) => v.cpuUs)) / 1000).toFixed(1),
  reSimAllOk: verify.every((v) => v.ok),
  // A cheating client that claims a different final hash is caught:
  cheatCaught: !reSimulate(matches[0]!.spec, relay[0]!.log, matches[0]!.outcome, 12345).ok,
};
console.log(JSON.stringify(out, null, 2));
