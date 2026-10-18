/**
 * The moments of a match a player notices and might react to (queue item 34: "emotes and short quick-chat
 * lines that react to the match: a big hit, a comeback, a low base, GG"), read from what both players see:
 * the two base bars, the ages, the phase banners (Overdrive, the Siege) and the end. Pure and deterministic
 * (ticks, integer basis points), so the simulated opponent reacts the same way to the same match.
 *
 * Sides are absolute: a moment names the side it is about (whose base was hit or is low, who came back,
 * who evolved, who won).
 */
import type { Side } from '@/contracts';
import type { MatchGlance } from './protocol';

export type MomentKind = 'bigHit' | 'low' | 'comeback' | 'evolve' | 'stalemate' | 'phase' | 'end';

export interface Moment {
  kind: MomentKind;
  /** bigHit, low: whose base; comeback: who came back; evolve: who evolved; end: the winner (null: a draw); stalemate, phase: null. */
  side: Side | null;
  tick: number;
  /** phase: the phase the match entered (both players see its banner: "Overdrive!", "Siege"). */
  phase?: 'overdrive' | 'siege';
}

export interface MomentRules {
  /** A base losing this much (bp of max) within `bigHitTicks` is a big hit. */
  bigHitBp: number;
  bigHitTicks: number;
  /** The same side's next big hit waits this long. */
  bigHitGapTicks: number;
  /** A base at or under this is low (once per side). */
  lowBp: number;
  /** A comeback: a side that trailed by this much leads by `comebackLeadBp`. */
  comebackDeficitBp: number;
  comebackLeadBp: number;
  /** No base loses HP for this long (after `stalemateFromTick`): a stalemate; then not again for `stalemateGapTicks`. */
  stalemateTicks: number;
  stalemateFromTick: number;
  stalemateGapTicks: number;
}

/**
 * 20 ticks a second (B3). Calibrated on AI-vs-AI Short and Standard Wars: bases take no damage for the
 * first few minutes and lose it in a few decisive pushes, so a 6% loss within 5 s marks a push a player
 * notices (1-5 a match), and only a quiet minute after the second minute is a stalemate.
 */
export const MOMENT_RULES: MomentRules = {
  bigHitBp: 600,
  bigHitTicks: 100,
  bigHitGapTicks: 300,
  lowBp: 2500,
  comebackDeficitBp: 2000,
  comebackLeadBp: 500,
  stalemateTicks: 1200,
  stalemateFromTick: 2400,
  stalemateGapTicks: 2400,
};

interface Sample {
  tick: number;
  hp: number;
}

export class MomentDetector {
  private readonly rules: MomentRules;
  private readonly samples: [Sample[], Sample[]] = [[], []];
  private readonly hitReadyAt: [number, number] = [0, 0];
  private readonly lowSeen: [boolean, boolean] = [false, false];
  private readonly comebackSeen: [boolean, boolean] = [false, false];
  /** Each side's worst lead so far (its HP minus the other's, bp). */
  private readonly worstLead: [number, number] = [0, 0];
  private age: [number, number] | null = null;
  private phase: MatchGlance['phase'] | null = null;
  private lastHp: [number, number] | null = null;
  private lastChangeTick = 0;
  private stalemateReadyAt = 0;
  private ended = false;

  constructor(rules: Partial<MomentRules> = {}) {
    this.rules = { ...MOMENT_RULES, ...rules };
  }

  /** The moments this glance shows (in a fixed order). Feed every tick, in order. */
  push(g: MatchGlance): Moment[] {
    if (this.ended) return [];
    const r = this.rules;
    const out: Moment[] = [];
    const t = g.tick;
    for (const side of [0, 1] as const) {
      const hp = g.hpBp[side];
      const list = this.samples[side];
      list.push({ tick: t, hp });
      while (list.length > 0 && list[0]!.tick < t - r.bigHitTicks) list.shift();
      let peak = hp;
      for (const s of list) if (s.hp > peak) peak = s.hp;
      if (peak - hp >= r.bigHitBp && t >= this.hitReadyAt[side]) {
        out.push({ kind: 'bigHit', side, tick: t });
        this.hitReadyAt[side] = t + r.bigHitGapTicks;
        list.length = 0;
        list.push({ tick: t, hp });
      }
      if (!this.lowSeen[side] && hp <= r.lowBp && hp > 0) {
        this.lowSeen[side] = true;
        out.push({ kind: 'low', side, tick: t });
      }
    }
    for (const side of [0, 1] as const) {
      const lead = g.hpBp[side] - g.hpBp[side === 0 ? 1 : 0];
      if (lead < this.worstLead[side]) this.worstLead[side] = lead;
      if (!this.comebackSeen[side] && this.worstLead[side] <= -r.comebackDeficitBp && lead >= r.comebackLeadBp) {
        this.comebackSeen[side] = true;
        out.push({ kind: 'comeback', side, tick: t });
      }
    }
    if (this.age) {
      for (const side of [0, 1] as const) if (g.ageIndex[side] > this.age[side]) out.push({ kind: 'evolve', side, tick: t });
    }
    this.age = [g.ageIndex[0], g.ageIndex[1]];
    // the match entering Overdrive or the Siege: a public moment (its banner shows on both screens)
    if (this.phase !== null && g.phase !== this.phase && (g.phase === 'overdrive' || g.phase === 'siege')) out.push({ kind: 'phase', side: null, tick: t, phase: g.phase });
    this.phase = g.phase;
    if (!this.lastHp || g.hpBp[0] < this.lastHp[0] || g.hpBp[1] < this.lastHp[1]) this.lastChangeTick = t;
    this.lastHp = [g.hpBp[0], g.hpBp[1]];
    if (t >= r.stalemateFromTick && t - this.lastChangeTick >= r.stalemateTicks && t >= this.stalemateReadyAt) {
      out.push({ kind: 'stalemate', side: null, tick: t });
      this.stalemateReadyAt = t + r.stalemateGapTicks;
    }
    if (g.winner !== undefined) {
      this.ended = true;
      out.push({ kind: 'end', side: g.winner, tick: t });
    }
    return out;
  }
}
