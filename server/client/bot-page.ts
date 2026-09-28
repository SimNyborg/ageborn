/**
 * Headless test client: an AI General plays one side of an online match through `OnlineMatch`.
 * Loaded into a Chromium page by test/e2e.mjs; everything it learns is exposed on `window.spike`.
 *
 * The bot decides on the local sim like a human would on the screen, and its commands travel through
 * the relay like a human's taps. (In real online play the opponent is a human; bots here only drive
 * the test.)
 */
import type { BotController, Observation } from '@/contracts';
import { botProfile, createBot } from '@/ai';
import { RingBuffer } from '@/core';
import { buildReplay, verifyReplay } from '@/sim';
import { content } from '../shared/match';
import { OnlineMatch } from './online';

interface SpikeOptions {
  wsBase: string;
  code: string;
  name: string;
  oneWayMs: number;
  jitterMs: number;
  general: string;
  tier: number;
}

function run(o: SpikeOptions) {
  const net = new OnlineMatch(o.wsBase, { oneWayMs: o.oneWayMs, jitterMs: o.jitterMs });
  let bot: BotController | null = null;
  let ring: RingBuffer<Observation> | null = null;
  const report: Record<string, unknown> = { done: false };

  net.onStart = () => {
    const spec = net.spec!;
    bot = createBot(botProfile(content, { generalId: o.general, tier: o.tier }), net.side, (spec.seed ^ (net.side + 1) * 7919) >>> 0, content);
    ring = new RingBuffer<Observation>(Math.max(1, bot.snapshotDelayTicks) + 1);
  };
  net.onTick = (_events, sim) => {
    if (!bot || !ring) return;
    ring.push(sim.observe(net.side));
    const obs = ring.at(bot.snapshotDelayTicks);
    if (!obs) return;
    for (const c of bot.onTick(obs)) if (c.side === net.side) net.issue(c);
  };
  net.connect(o.code, o.name);

  const finish = () => {
    const sim = net.sim;
    if (!sim?.state.outcome || !net.result) return false;
    const replay = buildReplay(sim);
    const t0 = performance.now();
    const check = verifyReplay(replay, content);
    const lat = [...net.stats.inputLatencyMs].sort((a, b) => a - b);
    const pct = (p: number) => (lat.length ? Math.round(lat[Math.min(lat.length - 1, Math.floor(p * lat.length))] as number) : null);
    Object.assign(report, {
      done: true,
      side: net.side,
      outcome: sim.state.outcome,
      finalHash: sim.hash(),
      ticks: sim.state.tick,
      replayOk: check.ok,
      replayMs: Math.round(performance.now() - t0),
      replayCommands: replay.commands.length,
      replayBytes: JSON.stringify(replay).length,
      replayCommandsDigest: JSON.stringify(replay.commands.map((c) => [c.tick, c.side, c.seq, c.t])),
      server: net.result,
      net: { ...net.stats, inputLatencyMs: undefined, inputLatencyP50: pct(0.5), inputLatencyP95: pct(0.95), inputLatencyMax: pct(1), latencySamples: lat.length },
    });
    return true;
  };
  const poll = setInterval(() => {
    if (finish()) clearInterval(poll);
  }, 200);

  return { net, report };
}

(globalThis as unknown as { startSpike: typeof run }).startSpike = run;
