/**
 * Visible battle damage in the battle view (queue item 40, design 3.4, 3.6 and 6; WP5 render): the moment a unit
 * crosses a damage step (its burst and quiet material sound, rate-limited, no hit-stop, shake or kick) and the smoke,
 * fire, sparks, steam, breath and motes damaged units give off, spawned in world space through the shared particle
 * pool at the lowest priority (trails stay behind flyers; the pool drops them first under load).
 *
 * The unit views own the stage, the marks and where things sit (duck-typed `onDamageStep` and `damageFx`, WP4); this
 * only plays. Presentation only: nothing reaches the sim. Deterministic: emission runs on game time with per-unit spawn
 * debt (a replay at 2x emits the same per game second); the only frame-rate rule is the fast-forward guard (a frame of
 * more than `ffGuardMs` game time plays no bursts and caps spawns), like the WebKit fade rule.
 */
import type { Pt, Side } from '@/contracts';
import type { ParticlePool } from './feel/particlePool';
import type { ViewAction } from './types';

/** The damage stage step a unit view reports (`onDamageStep`; WP4 `DamageStepEvent`), root space (lu, y down). */
export interface DamageStepInfo {
  stage: number;
  prev: number;
  mend: boolean;
  x: number;
  y: number;
  spot: boolean;
  mat: string;
  kind: string | null;
  family: string;
  heightLu: number;
  ignite: boolean;
  /** Where the fire catches (root space), clear of the crew: the flare plays there, not at the step's mark. */
  igniteX?: number;
  igniteY?: number;
}

/** A live emitter of a damaged unit (`damageFx`; WP4 `DamageEmitter`): root space, particles per second of game time. */
export interface DamageEmitterInfo {
  kind: string;
  x: number;
  y: number;
  rate: number;
  size: number;
}

/** The duck-typed damage hooks of a unit view (the atlas and procedural views; others have none). */
export interface DamageView {
  readonly damageStage?: number;
  onDamageStep?(cb: (e: DamageStepInfo) => void): void;
  damageFx?(): readonly DamageEmitterInfo[];
  /** Views without `react` (procedural puppets): the blow's kind for the step it may cross. */
  noteDamageBlow?(kind: string, effective: boolean): void;
}

/** The damage block of the feel config's tuning (`tuning.damage`). */
export interface DamageTuning {
  /** Units that may emit at once (by size and closeness to the screen's middle): desktop, mobile, Graphics Lite. */
  emitUnits: { desktop: number; mobile: number; lite: number };
  /** At most this many step bursts per window on screen (the rest apply silently). */
  bursts: number;
  burstWindowMs: number;
  /** A step sound per material at most this often (ms). */
  soundGapMs: number;
  /** Small and medium bodies (collision width under this, lu) sound only their last step. */
  soundBodyLu: number;
  /** A frame longer than this (game ms) is a fast-forward: no bursts, capped spawns. */
  ffGuardMs: number;
}

export const DAMAGE_TUNING_DEFAULTS: DamageTuning = {
  emitUnits: { desktop: 12, mobile: 8, lite: 4 },
  bursts: 3,
  burstWindowMs: 250,
  soundGapMs: 200,
  soundBodyLu: 48,
  ffGuardMs: 100,
};

/** The particle effect of each emitter kind (`visuals/damage/fx.ts`). */
export const EMIT_EFFECT: Readonly<Record<string, string>> = {
  smoke: 'fx.dmg_smoke',
  smokeDark: 'fx.dmg_smoke_dark',
  steam: 'fx.dmg_steam',
  fire: 'fx.dmg_fire',
  spark: 'fx.dmg_spark',
  breath: 'fx.dmg_breath',
  motes: 'fx.dmg_motes',
};

/** `fx.dmg_burst`'s `mat` code: the index in this list (`visuals/damage/types.ts` `MARK_MATS`). */
export const DAMAGE_MAT_CODE: Readonly<Record<string, number>> = { cloth: 0, hide: 1, metal: 2, wood: 3, stone: 4, glass: 5, energy: 6 };

/** A unit as the damage feel needs it (the battle view's entry). */
export interface DamageUnit {
  id: number;
  side: Side;
  view: DamageView & { root: { visible: boolean } };
  drawX: number;
  y: number;
  sizeLu: number;
  dying: boolean;
  frozen: boolean;
  fort?: unknown;
  hitDir?: 1 | -1;
  dmgAcc?: number[];
}

/** What the damage feel asks of the battle view. */
export interface DamageHost {
  particles: Pick<ParticlePool, 'emit'>;
  /** Expands a feel rule into actions (the event mapper's `rule`). */
  rule(key: string, t: { at: { k: 'world'; x: number; y: number }; opts?: Record<string, number>; x?: number }, out: ViewAction[]): void;
  exec(a: ViewAction): void;
  /** Whether a world x is on or near the screen (A17.7: off view nothing is emitted). */
  nearView(x: number): boolean;
  /** The screen's middle (world x), for the emitter ranking. */
  viewMid(): number;
  lite(): boolean;
  reduce(): boolean;
  mobile(): boolean;
  tuning(): DamageTuning;
  teamOf(side: Side): number;
}

/** The fire, sparks, smoke and breath of damaged units, and their step moments. */
export class DamageFeel {
  /** Game ms (bursts are rate-limited on the game clock, so a replay limits the same way). */
  private clock = 0;
  private lastDt = 0;
  private readonly bursts: number[] = [];
  private readonly pick: DamageUnit[] = [];
  private readonly out: ViewAction[] = [];
  private readonly at: Pt = { x: 0, y: 0 };

  constructor(private readonly host: DamageHost) {}

  /**
   * A unit view crossed a step (or mended). Plays `damage.step.<mat>.<stage>` (or `damage.mend`) at the new mark, and a
   * machine's `damage.ignite` at its last stage, within the rate limit; a frozen (time-stopped) unit takes its marks
   * silently, and so does a unit off view.
   */
  step(u: DamageUnit, ev: DamageStepInfo): void {
    if (u.dying || u.frozen || !u.view.root.visible) return;
    const t = this.host.tuning();
    if (this.lastDt > t.ffGuardMs) return;
    const x = u.drawX + ev.x;
    const y = u.y + ev.y;
    if (!this.host.nearView(x)) return;
    // at most `bursts` per window on screen
    while (this.bursts.length > 0 && this.clock - (this.bursts[0] as number) >= t.burstWindowMs) this.bursts.shift();
    if (this.bursts.length >= t.bursts) return;
    this.bursts.push(this.clock);
    const lite = this.host.lite();
    const reduce = this.host.reduce();
    const opts: Record<string, number> = {
      mat: DAMAGE_MAT_CODE[ev.mat] ?? 0,
      stage: ev.stage,
      dir: u.hitDir ?? (u.side === 0 ? -1 : 1),
      size: u.sizeLu >= 80 ? 2 : u.sizeLu >= 48 ? 1 : 0,
      groundLu: Math.max(4, -ev.y),
      side: u.side,
      ...(lite ? { lite: 1 } : {}),
      ...(reduce ? { reduce: 1 } : {}),
    };
    const out = this.out;
    out.length = 0;
    const target = { at: { k: 'world' as const, x, y }, opts, x };
    this.host.rule(ev.mend ? 'damage.mend' : `damage.step.${ev.mat}.${ev.stage}`, target, out);
    if (ev.ignite) {
      // the flare plays where the fire burns (the view's place clear of the crew), not at the step's mark
      const ix = u.drawX + (ev.igniteX ?? ev.x);
      const iy = u.y + (ev.igniteY ?? ev.y);
      this.host.rule('damage.ignite', { at: { k: 'world' as const, x: ix, y: iy }, opts, x: ix }, out);
    }
    // the step's sound is a quiet layer (A13: 4 dB under the hit): big bodies every step, small and medium ones their
    // last; one per material per `soundGapMs`, at low priority
    const sound = u.sizeLu >= t.soundBodyLu || ev.stage >= 3 || ev.ignite;
    for (const a of out) {
      if (a.a === 'sound') {
        if (!sound || ev.mend) continue;
        this.host.exec({ ...a, gap: { key: `dmg:${a.id}`, gapMs: t.soundGapMs }, priority: 0 });
        continue;
      }
      this.host.exec(a);
    }
  }

  /**
   * The frame's game time, before the frame's poses: the steps they raise check the fast-forward guard against this
   * frame (design 6: a frame of more than `ffGuardMs` of game time skips bursts) and the rate limit runs on its clock.
   */
  beginFrame(gameDt: number): void {
    this.lastDt = gameDt;
    if (gameDt > 0) this.clock += gameDt;
  }

  /**
   * Spawns the emitters' particles for this frame (after `beginFrame`): on at most `emitUnits` damaged units on screen
   * (the biggest first, then the nearest to the screen's middle), each at its rate on game time; Graphics Lite at half
   * rate, Reduce motion with half the smoke and no sparks.
   */
  update(units: Iterable<DamageUnit>): void {
    const gameDt = this.lastDt;
    if (gameDt <= 0) return;
    const t = this.host.tuning();
    const lite = this.host.lite();
    const reduce = this.host.reduce();
    const cap = lite ? t.emitUnits.lite : this.host.mobile() ? t.emitUnits.mobile : t.emitUnits.desktop;
    if (cap <= 0) return;
    const pick = this.pick;
    pick.length = 0;
    for (const u of units) {
      if (u.dying || u.fort || !u.view.root.visible) continue;
      const stage = u.view.damageStage;
      if (stage === undefined || stage < 2 || typeof u.view.damageFx !== 'function') continue;
      if (!this.host.nearView(u.drawX)) continue;
      pick.push(u);
    }
    if (pick.length === 0) return;
    if (pick.length > cap) {
      const mid = this.host.viewMid();
      pick.sort((a, b) => b.sizeLu - a.sizeLu || Math.abs(a.drawX - mid) - Math.abs(b.drawX - mid) || a.id - b.id);
      pick.length = cap;
    }
    const ff = gameDt > t.ffGuardMs;
    const k = lite ? 0.5 : 1;
    for (const u of pick) {
      const fx = u.view.damageFx?.() ?? [];
      const acc = (u.dmgAcc ??= []);
      for (let i = 0; i < fx.length; i++) {
        const e = fx[i] as DamageEmitterInfo;
        const id = EMIT_EFFECT[e.kind];
        if (!id) continue;
        if (e.kind === 'spark' && (reduce || lite)) continue;
        let n: number;
        if (e.rate < 0) n = 1;
        else {
          const smoky = e.kind === 'smoke' || e.kind === 'smokeDark' || e.kind === 'steam';
          const rate = e.rate * k * (reduce && smoky ? 0.5 : 1);
          acc[i] = (acc[i] ?? 0) + (rate * gameDt) / 1000;
          // a hair of slack so sixty 16.67 ms frames make a whole second (float sums fall just short)
          n = Math.floor((acc[i] as number) + 1e-6);
          acc[i] = (acc[i] as number) - n;
        }
        if (ff) n = Math.min(n, 1);
        for (let j = 0; j < n; j++) {
          this.at.x = u.drawX + e.x;
          this.at.y = u.y + e.y;
          // puffs a tenth of their spot's size in scale (bigger puffs doubled the smoke's fill, which phones pay for:
          // the dark smoke reads by its darker grey instead)
          this.host.particles.emit(id, 1, 0, this.at, { opts: { dir: u.side === 0 ? 1 : -1, scale: Math.max(0.4, e.size / 10), ...(reduce ? { reduce: 1 } : {}) } });
        }
      }
    }
  }
}
