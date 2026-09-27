/** Test doubles for the app package: frame scheduler, visibility, view, meta. */
import type {
  BotProfile,
  CompiledContent,
  FormatId,
  MatchResultInput,
  Meta,
  OpponentSpec,
  RewardStep,
  SaveDoc,
  SimEvent,
  SkirmishOptions,
} from '@/contracts';
import type { FrameScheduler, SessionView, VisibilitySource } from '../session';
import { generalOpponent } from '../matchSetup';

/** A bot profile with Balanced weights at `tier`. */
export function profile(tier: number): BotProfile {
  return { generalId: 'test', tier, mistakeBonusBp: 0, weights: { aggr: 50, turret: 50, economy: 50, greed: 50, patience: 50, legendary: 50, hold: 50 }, openings: [] };
}

/** A scheduler the test advances by hand: `frame(ms)` runs every pending callback once. */
export class ManualScheduler implements FrameScheduler {
  private t = 0;
  private next = 1;
  private readonly cbs = new Map<number, (now: number) => void>();
  request(cb: (now: number) => void): number {
    const h = this.next++;
    this.cbs.set(h, cb);
    return h;
  }
  cancel(h: number): void {
    this.cbs.delete(h);
  }
  now(): number {
    return this.t;
  }
  get pending(): number {
    return this.cbs.size;
  }
  frame(ms: number): void {
    this.t += ms;
    const run = [...this.cbs.entries()];
    this.cbs.clear();
    for (const [, cb] of run) cb(this.t);
  }
}

export class FakeVisibility implements VisibilitySource {
  hidden = false;
  private readonly subs = new Set<(h: boolean) => void>();
  subscribe(cb: (h: boolean) => void): () => void {
    this.subs.add(cb);
    return () => this.subs.delete(cb);
  }
  set(hidden: boolean): void {
    this.hidden = hidden;
    for (const s of this.subs) s(hidden);
  }
  get listeners(): number {
    return this.subs.size;
  }
}

/** Records what the session does to its view; `frozen` simulates a global freeze (A12). */
export class RecordingView implements SessionView {
  events: SimEvent[] = [];
  renders: { alpha: number; frameMs: number }[] = [];
  speed = 1;
  paused = true;
  frozen = false;
  destroyed = false;
  get simFrozen(): boolean {
    return this.frozen;
  }
  onEvents(events: readonly SimEvent[]): void {
    this.events.push(...events);
  }
  render(alpha: number, frameMs: number): void {
    this.renders.push({ alpha, frameMs });
  }
  setSpeed(s: number): void {
    this.speed = s;
  }
  setPaused(p: boolean): void {
    this.paused = p;
  }
  destroy(): void {
    this.destroyed = true;
  }
}

export interface FakeMetaCall {
  method: 'pickOpponent' | 'applyMatchResult';
  mode?: MatchResultInput['mode'];
  o?: { format?: FormatId; conquestGeneral?: string; skirmish?: SkirmishOptions };
}

/**
 * A minimal `Meta` for app wiring tests (the real rules are WP7's): `pickOpponent` returns an AI
 * General per mode, `applyMatchResult` counts the match and pays fixed rewards.
 */
export function fakeMeta(content: CompiledContent, calls: FakeMetaCall[] = []): Meta {
  const unsupported = (): never => {
    throw new Error('not used by the app wiring tests');
  };
  return {
    newSave: unsupported,
    grantCapsule: unsupported,
    openCapsule: unsupported,
    openWardrobe: unsupported,
    upgrade: unsupported,
    craft: unsupported,
    validatePlan: unsupported,
    autoFill: unsupported,
    equipNow: unsupported,
    claimRoadNode: unsupported,
    tickTimers: (s) => s,
    pickOpponent(s, mode, c, _clock, o): OpponentSpec {
      calls.push({ method: 'pickOpponent', mode, ...(o ? { o } : {}) });
      const format: FormatId = mode === 'daily' ? 'standard' : mode === 'conquest' ? 'full' : (o?.format ?? 'short');
      const generalId = mode === 'conquest' ? (o?.conquestGeneral ?? 'pip') : mode === 'skirmish' ? (o?.skirmish?.generalId ?? 'pip') : 'kettle';
      return generalOpponent(c, {
        generalId,
        displayName: `AI ${generalId}`,
        tier: mode === 'skirmish' ? (o?.skirmish?.tier ?? 3) : 2,
        level: 1,
        format,
        seed: 1000 + s.matchesPlayed,
        modifiers: mode === 'daily' ? ['gold_rush'] : [],
      });
    },
    applyMatchResult(s: SaveDoc, r: MatchResultInput): { save: SaveDoc; rewards: RewardStep[] } {
      calls.push({ method: 'applyMatchResult', mode: r.mode });
      const won = r.outcome.winner === r.mySide;
      const rewards: RewardStep[] = r.mode === 'ladder' ? [{ kind: 'trophies', delta: won ? 30 : -20 }, { kind: 'amber', amount: won ? 20 : 15 }] : [];
      return { save: { ...s, matchesPlayed: s.matchesPlayed + 1, currencies: { ...s.currencies, amber: s.currencies.amber + 20 } }, rewards };
    },
  };
}
