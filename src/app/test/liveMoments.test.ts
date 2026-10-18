/**
 * The moments a player notices (queue item 34, `live/moments.ts`): big hits, low bases, comebacks,
 * evolves, stalemates and the end, from what both players see; and on real AI matches, a handful of
 * moments, never a flood.
 */
import { describe, expect, it } from 'vitest';
import type { MatchConfig } from '@/contracts';
import { botProfile, createBot } from '@/ai';
import { content } from '@/content';
import { createSim } from '@/sim';
import { quickBattle } from '../matchSetup';
import { MomentDetector, MOMENT_RULES, type Moment } from '../live/moments';
import { glanceOf, type MatchGlance } from '../live/protocol';

const g = (tick: number, hp: [number, number], age: [number, number] = [0, 0], winner?: 0 | 1 | null): MatchGlance => ({
  tick,
  hpBp: hp,
  ageIndex: age,
  phase: 'regulation',
  ...(winner !== undefined ? { winner } : {}),
});

function feed(d: MomentDetector, frames: MatchGlance[]): Moment[] {
  return frames.flatMap((f) => d.push(f));
}

describe('moments (queue item 34)', () => {
  it('the match entering Overdrive or the Siege is a public moment, once per change (review O nit 11)', () => {
    const d = new MomentDetector();
    const at = (tick: number, phase: MatchGlance['phase']): MatchGlance => ({ ...g(tick, [10_000, 10_000]), phase });
    expect(feed(d, [at(1, 'regulation'), at(2, 'regulation')])).toEqual([]);
    expect(feed(d, [at(3, 'overdrive')])).toEqual([{ kind: 'phase', side: null, tick: 3, phase: 'overdrive' }]);
    expect(feed(d, [at(4, 'overdrive'), at(5, 'overdrive')])).toEqual([]);
    expect(feed(d, [at(6, 'siege')])).toEqual([{ kind: 'phase', side: null, tick: 6, phase: 'siege' }]);
    // a match that starts in a phase (a later join, a format without regulation) is no moment
    expect(new MomentDetector().push(at(1, 'overdrive'))).toEqual([]);
  });

  it('a big hit: a base losing 6% within 5 s, once per side per 15 s', () => {
    const d = new MomentDetector();
    const out = feed(d, [g(1, [10_000, 10_000]), g(40, [10_000, 9700]), g(80, [10_000, 9390])]);
    expect(out).toEqual([{ kind: 'bigHit', side: 1, tick: 80 }]);
    // another drop right after is not a new moment until the gap passes
    expect(feed(d, [g(120, [10_000, 8500])])).toEqual([]);
    expect(feed(d, [g(80 + MOMENT_RULES.bigHitGapTicks, [10_000, 8500]), g(80 + MOMENT_RULES.bigHitGapTicks + 20, [10_000, 7800])])).toEqual([{ kind: 'bigHit', side: 1, tick: 400 }]);
  });

  it('a slow bleed over a long time is not a big hit', () => {
    const d = new MomentDetector();
    const frames: MatchGlance[] = [];
    for (let t = 1; t <= 2000; t += 10) frames.push(g(t, [10_000, 10_000 - t]));
    expect(feed(d, frames).filter((m) => m.kind === 'bigHit')).toEqual([]);
  });

  it('a low base, once per side; a comeback once each way; evolves; the end', () => {
    const d = new MomentDetector();
    const out = feed(d, [
      g(1, [10_000, 10_000]),
      g(200, [7000, 10_000]),
      g(400, [7000, 7000]),
      g(600, [7000, 6200], [1, 0]),
      g(800, [2400, 6200], [1, 1]),
      g(1000, [2400, 2000]),
      g(1200, [2300, 1500], [1, 1], 0),
      g(1300, [2300, 1000], [1, 1], 0),
    ]);
    const kinds = out.map((m) => `${m.kind}:${m.side}`);
    expect(kinds).toContain('evolve:0');
    expect(kinds).toContain('evolve:1');
    expect(kinds.filter((k) => k === 'low:0')).toHaveLength(1);
    expect(kinds.filter((k) => k === 'low:1')).toHaveLength(1);
    // side 0 trailed by 30% (7000 vs 10000), then led by 7% at tick 600: its comeback
    expect(kinds).toContain('comeback:0');
    expect(kinds.at(-1)).toBe('end:0');
    // nothing after the end
    expect(d.push(g(1400, [100, 100]))).toEqual([]);
  });

  it('a stalemate: a quiet minute after the second minute, then not again for two minutes', () => {
    const d = new MomentDetector();
    const frames: MatchGlance[] = [];
    for (let t = 1; t <= 6000; t += 20) frames.push(g(t, [10_000, 10_000]));
    const st = feed(d, frames).filter((m) => m.kind === 'stalemate');
    expect(st.map((m) => m.tick)).toEqual([2401, 4801]);
  });

  it('is deterministic: the same glances give the same moments', () => {
    const frames = [g(1, [10_000, 10_000]), g(50, [9000, 10_000]), g(90, [8000, 9900], [1, 0]), g(300, [8000, 7000]), g(500, [2000, 7000], [1, 0], 1)];
    expect(feed(new MomentDetector(), frames)).toEqual(feed(new MomentDetector(), frames));
  });

  it('real AI matches: a few moments per match, never a flood (calibration)', () => {
    const counts: number[] = [];
    for (const seed of [3, 11, 29]) {
      const setup = quickBattle(null, content, { generalId: 'kettle', displayName: 'AI Kettle', format: 'short', seed });
      const config: MatchConfig = setup.config;
      const sim = createSim(config);
      const bots = [
        { side: 0 as const, c: createBot(botProfile(content, { generalId: 'kettle', tier: 5 }), 0, seed, content) },
        { side: 1 as const, c: createBot(botProfile(content, { generalId: 'kettle', tier: 4 }), 1, seed + 1, content) },
      ];
      const d = new MomentDetector();
      const moments: Moment[] = [];
      const delay = bots.map(() => [] as ReturnType<typeof sim.observe>[]);
      let tick = 0;
      while (!sim.state.outcome && tick < 20 * 60 * 12) {
        tick += 1;
        const cmds = bots.flatMap((b, i) => {
          delay[i]!.push(sim.observe(b.side));
          const obs = delay[i]!.length > b.c.snapshotDelayTicks ? delay[i]!.shift()! : null;
          return obs ? b.c.onTick(obs).map((c, k) => ({ ...c, tick: sim.state.tick + 1, seq: tick * 10 + k })) : [];
        });
        sim.step(cmds.sort((a, b) => a.side - b.side || a.seq - b.seq));
        moments.push(...d.push(glanceOf(sim.state)));
      }
      counts.push(moments.length);
      expect(moments.at(-1)?.kind).toBe('end');
      // a person notices a handful of moments in a match, not one every few seconds
      const minutes = Math.max(1, sim.state.tick / 1200);
      expect(moments.length / minutes).toBeLessThan(4);
    }
    expect(counts.every((n) => n >= 2)).toBe(true);
    // three real AI wars: about 2.5 s alone, more under a full parallel run
  }, 30_000);
});
