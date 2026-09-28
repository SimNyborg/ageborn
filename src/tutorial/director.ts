/**
 * The tutorial director (DESIGN A8, C2/WP11): walks a match's scripted beats, decides which prompt
 * is on screen, merges in adaptive hints, and logs every step for the onboarding event log.
 *
 * The session calls `update` after every sim step with that tick's state and events. The director
 * never touches the sim: prompts are text plus a HUD target to highlight (and, for the Arrow Storm,
 * an animated drag hand). Sequential scripts (match 1) show their beats strictly in order, each at
 * most once (C5 #2), except beats marked `jumpQueue` (Evolve), which show as soon as their trigger
 * holds; a beat whose age has passed is skipped, and a shown beat retires after its timeout. Both
 * cases are logged, so playtests can see where new players drop off.
 */
import type { Side } from '@/contracts';
import { AdaptiveHints, type AdaptiveHintsOptions } from './hints';
import { ADAPTIVE, type AdaptiveHintId, type Beat, type MatchScript, type PromptTarget } from './scripts';
import { PPM_FULL, evolveReady, eventOfSide, goldOf, trayCard, type TickInput } from './view';

export interface TutorialPrompt {
  /** Beat id (`m1.sendBonker`) or adaptive hint id (`hint.powerReady`). */
  id: string;
  textKey: string;
  target: PromptTarget | null;
  hand: 'powerDrag' | null;
  kind: 'beat' | 'hint';
  /** Tick the prompt appeared. */
  sinceTick: number;
}

export type DirectorLogKind = 'beatShown' | 'beatDone' | 'beatTimeout' | 'beatSkipped' | 'hintShown';

export interface DirectorLogEntry {
  kind: DirectorLogKind;
  id: string;
  tick: number;
}

export interface TutorialDirectorOptions extends AdaptiveHintsOptions {
  /** The player's side (default 0). */
  side?: Side;
  /** Adaptive hints on (default true). */
  adaptive?: boolean;
  onLog?: (e: DirectorLogEntry) => void;
}

type BeatStatus = 'pending' | 'shown' | 'over';

interface BeatRun {
  beat: Beat;
  status: BeatStatus;
  /**
   * First tick its trigger held (in its age); −1 before. Actions from then on complete the beat,
   * even while an earlier beat of a sequential script is still on screen.
   */
  triggeredAt: number;
  shownAt: number;
}

export class TutorialDirector {
  readonly side: Side;
  private readonly runs: BeatRun[];
  private readonly sequential: boolean;
  private readonly hints: AdaptiveHints | null;
  private readonly onLog: ((e: DirectorLogEntry) => void) | undefined;
  private readonly listeners = new Set<(p: TutorialPrompt | null) => void>();
  private readonly log: DirectorLogEntry[] = [];
  private promptValue: TutorialPrompt | null = null;
  private hintUntil = -1;
  private firstKill = false;
  private readonly agesReached = new Set<string>();
  /** Last tick each event kind of the player's side was seen, and each card was trained. */
  private readonly lastEvent = new Map<string, number>();
  private readonly lastTrained = new Map<string, number>();

  constructor(
    script: MatchScript | null,
    o: TutorialDirectorOptions = {},
  ) {
    this.side = o.side ?? 0;
    this.runs = (script?.beats ?? []).map((beat) => ({ beat, status: 'pending', triggeredAt: -1, shownAt: -1 }));
    this.sequential = script?.sequential ?? false;
    this.hints = o.adaptive === false ? null : new AdaptiveHints(o);
    this.onLog = o.onLog;
  }

  /** The prompt on screen, or null. */
  get prompt(): TutorialPrompt | null {
    return this.promptValue;
  }

  /** True when every scripted beat is over. */
  get finished(): boolean {
    return this.runs.every((r) => r.status === 'over');
  }

  /** Every log entry so far. */
  entries(): readonly DirectorLogEntry[] {
    return this.log;
  }

  /** Shows per hint id and beat id, to store in `SaveDoc.tutorial.hintsShown`. */
  /** A failure pattern found outside the tutorial layer (the app's trickle detector, A16.6). */
  reportPattern(id: AdaptiveHintId): void {
    this.hints?.report(id);
  }

  hintsShown(): Record<string, number> {
    return this.hints?.shown() ?? {};
  }

  subscribe(cb: (p: TutorialPrompt | null) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /** The player dismissed the prompt (tap on the bubble). Beats stay active until done. */
  dismissHint(): void {
    if (this.promptValue?.kind === 'hint') this.setPrompt(null);
  }

  /** Feeds one tick (after `sim.step`). */
  update(i: TickInput): void {
    const tick = i.state.tick;
    for (const e of i.events) {
      if (e.e === 'died' && e.killerSide === this.side && e.side !== this.side) this.firstKill = true;
      if (!eventOfSide(e, this.side)) continue;
      this.lastEvent.set(e.e, tick);
      if (e.e === 'ageUp') this.agesReached.add(e.age);
      if (e.e === 'unitSpawned' && !e.summoned) this.lastTrained.set(e.card, tick);
    }
    for (const q of i.state.sides[this.side].queue) this.lastTrained.set(q.card, tick);
    const age = i.state.sides[this.side].ageIndex;
    for (const r of this.runs) {
      if (r.status !== 'pending' || r.triggeredAt >= 0) continue;
      if (r.beat.onlyInAge !== undefined && age !== r.beat.onlyInAge) continue;
      if (this.triggered(r.beat, i)) r.triggeredAt = tick;
    }
    let visible: BeatRun | null = null;
    // Beats that jump the queue (Evolve): the moment their trigger holds they show over whatever
    // earlier beat is still waiting for the player, so a stuck step never hides them.
    for (const r of this.runs) {
      if (!r.beat.jumpQueue || r.status === 'over') continue;
      const passed = r.beat.onlyInAge !== undefined && age > r.beat.onlyInAge;
      if (r.status === 'pending' && !passed && !this.triggered(r.beat, i)) continue;
      this.step(r, i);
      if ((r.status as BeatStatus) === 'shown' && r.beat.textKey !== null && !visible) visible = r;
    }
    for (let k = 0; k < this.runs.length; k += 1) {
      const r = this.runs[k]!;
      if (r.status === 'over') continue;
      if (this.sequential && k > 0 && this.runs[k - 1]!.status !== 'over') break;
      if (!r.beat.jumpQueue) this.step(r, i);
      // `step` may have changed the status (TS keeps the narrowing from above).
      const status = r.status as BeatStatus;
      if (status === 'shown' && r.beat.textKey !== null && !visible) visible = r;
      if (this.sequential && status !== 'over') break;
    }
    if (visible) {
      const b = visible.beat;
      if (this.promptValue?.id !== b.id) {
        this.setPrompt({ id: b.id, textKey: b.textKey!, target: b.target, hand: b.hand ?? null, kind: 'beat', sinceTick: visible.shownAt });
      }
      this.hints?.update(i, true);
      return;
    }
    if (this.promptValue?.kind === 'beat') this.setPrompt(null);
    if (this.promptValue?.kind === 'hint' && tick >= this.hintUntil) this.setPrompt(null);
    const hint = this.hints?.update(i, this.promptValue !== null) ?? null;
    if (hint) {
      this.hintUntil = tick + ADAPTIVE.showTicks;
      this.record('hintShown', hint.id, tick);
      this.setPrompt({ id: `hint.${hint.id}`, textKey: hint.textKey, target: hint.target, hand: null, kind: 'hint', sinceTick: tick });
    }
  }

  private step(r: BeatRun, i: TickInput): void {
    const tick = i.state.tick;
    const b = r.beat;
    const age = i.state.sides[this.side].ageIndex;
    if (b.onlyInAge !== undefined && age > b.onlyInAge) {
      this.finish(r, 'beatSkipped', tick);
      return;
    }
    if (r.status === 'pending') {
      if (b.onlyInAge !== undefined && age !== b.onlyInAge) return;
      // Already did it while waiting for its turn (for example built the turret early): no prompt.
      if (r.triggeredAt >= 0 && b.done.k !== 'shownFor' && this.done(r, i)) {
        this.finish(r, 'beatDone', tick);
        return;
      }
      if (!this.triggered(b, i)) return;
      r.status = 'shown';
      r.shownAt = tick;
      this.record('beatShown', b.id, tick);
    }
    if (this.done(r, i)) this.finish(r, 'beatDone', tick);
    else if (b.timeoutTicks !== undefined && tick - r.shownAt >= b.timeoutTicks) this.finish(r, 'beatTimeout', tick);
  }

  private finish(r: BeatRun, kind: DirectorLogKind, tick: number): void {
    r.status = 'over';
    this.record(kind, r.beat.id, tick);
  }

  private triggered(b: Beat, i: TickInput): boolean {
    const t = b.trigger;
    const me = i.state.sides[this.side];
    const eco = i.config.content.economy;
    switch (t.k) {
      case 'start':
        return true;
      case 'atTick':
        return i.state.tick >= t.tick;
      case 'firstKill':
        return this.firstKill;
      case 'evolveReady':
        return evolveReady(i);
      case 'powerReady':
        return me.powerPpm >= PPM_FULL;
      case 'ageUp':
        return this.agesReached.has(t.age);
      case 'treasuryAffordable': {
        const cost = eco.treasuryCosts[me.treasury];
        return i.state.tick >= t.afterTick && cost !== undefined && goldOf(i) >= cost;
      }
      case 'mountAffordable': {
        const cost = eco.mountCosts[me.mountsOwned];
        const built = me.turrets.slice(0, me.mountsOwned).every((x) => x !== null);
        return me.ageIndex >= t.minAgeIndex && cost !== undefined && me.mountsOwned < me.turrets.length && built && goldOf(i) >= cost;
      }
      case 'lastStandArmed':
        return me.lastStand === 'armed';
      default:
        return false;
    }
  }

  private done(r: BeatRun, i: TickInput): boolean {
    const d = r.beat.done;
    switch (d.k) {
      case 'event':
        return (this.lastEvent.get(d.e) ?? -1) >= r.triggeredAt;
      case 'trained': {
        const card = trayCard(i, d.slot);
        return card !== null && (this.lastTrained.get(card) ?? -1) >= r.triggeredAt;
      }
      case 'shownFor':
        return i.state.tick - r.shownAt >= d.ticks;
      default:
        return false;
    }
  }

  private record(kind: DirectorLogKind, id: string, tick: number): void {
    const e = { kind, id, tick };
    this.log.push(e);
    this.onLog?.(e);
  }

  private setPrompt(p: TutorialPrompt | null): void {
    this.promptValue = p;
    for (const l of this.listeners) l(p);
  }
}
