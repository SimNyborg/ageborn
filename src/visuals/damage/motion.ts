/**
 * Motion at the last stage (queue item 40, design 3.5): presentation only, the timing untouched. Soldiers and beasts
 * tire (a slower idle with a breath squash, a dip on every second walk contact; never a limp), machines sputter (a short
 * judder and an exhaust puff), mechs hitch on a leg, flyers dip and fly nose down, energy bodies flicker mint (and shift
 * a little at stage 3). The idle's rate is the only clip time it changes; attacks and their impact frames, the walk's
 * timing and its planted feet are never touched (A12 checklist 3).
 *
 * Seeded per unit (its view seed) and run on the view's game clock, so a replay moves the same way. Reduce motion: half
 * the amplitude, no judder, no flyer dips, no glitch shift (a slow 200 ms pulse instead).
 */
import { mulberry32, type CosmeticRng } from '@/core/rng';
import type { DamageFamily, DamageStage } from './types';

/** What the view adds this frame. */
export interface WearyPose {
  /** The idle loop's rate (0.85 tired, else 1). */
  idleRate: number;
  /** Extra vertical squash (share: 0.02 is 2% shorter, a little wider). */
  squash: number;
  /** Vertical offset (lu, + down): walk dips, a flyer's sputter dip. */
  dipLu: number;
  /** Horizontal offset (lu): a machine's judder, an energy body's glitch shift. */
  shiftLu: number;
  /** Nose-down pitch (degrees) of a sputtering flyer. */
  pitchDeg: number;
  /** A mint pulse on the body (0..1 alpha of the flash sprite tinted mint), energy bodies only. */
  flicker: number;
  /** An exhaust puff or a joint's sparks are due this frame (the view raises its emitter for a beat). */
  puff: boolean;
}

/** The tired idle's rate and its breath (design 3.5). */
export const TIRED_IDLE_RATE = 0.85;
export const BREATH_SQUASH = 0.02;
/** A machine's sputter: every 1.2-1.8 s a 140 ms judder of 0.6 lu. */
export const SPUTTER_EVERY_MS: readonly [number, number] = [1200, 1800];
export const JUDDER_MS = 140;
export const JUDDER_LU = 0.6;
/** A flyer's sputter dip (lu) about every 1.5 s, and its nose-down pitch (deg) at stage 3. */
export const FLYER_DIP_LU = 2;
export const FLYER_PITCH_DEG = 2.5;
/** An energy body's mint pulse: 40 ms, every 1.2-2.4 s (stage 2) or 0.7-1.4 s (stage 3); never faster than ~1.5 Hz. */
export const FLICKER_MS = 40;
export const FLICKER_REDUCED_MS = 200;
export const FLICKER_EVERY: Readonly<Record<2 | 3, readonly [number, number]>> = { 2: [1200, 2400], 3: [700, 1400] };
export const GLITCH_LU = 1.5;
/** A tired walker's dip on every second contact: 1.2-1.8 lu, down fast and back over this long. */
export const DIP_MS = 160;

const range = (r: CosmeticRng, lo: number, hi: number): number => lo + r.next() * (hi - lo);

export class WearyClock {
  private readonly rng: CosmeticRng;
  private t = 0;
  /** Time of the next sputter, pulse or dip and how long the current one has run (-1: none). */
  private nextAt: number;
  private eventT = -1;
  private contacts = 0;
  private dipT = -1;
  private readonly dipLu: number;
  private readonly breathPeriod: number;
  private readonly pose: WearyPose = { idleRate: 1, squash: 0, dipLu: 0, shiftLu: 0, pitchDeg: 0, flicker: 0, puff: false };

  constructor(
    readonly family: DamageFamily,
    seed: number,
  ) {
    this.rng = mulberry32((seed ^ 0x2545f491) >>> 0 || 1);
    this.dipLu = range(this.rng, 1.2, 1.8);
    this.breathPeriod = family === 'beast' ? range(this.rng, 1700, 2100) : range(this.rng, 1300, 1600);
    this.nextAt = range(this.rng, 300, 1200);
  }

  /** A walk contact step was shown (the view reports them): every second one dips a tired walker or hitches a mech. */
  contact(): void {
    this.contacts++;
    if (this.contacts % 2 === 0) this.dipT = 0;
  }

  /**
   * Advances the clock by `dtMs` of game time at `stage` and returns the pose to add. `moving`: the unit walks (no breath
   * squash then); `reduce`: Reduce motion.
   */
  update(dtMs: number, stage: DamageStage, o: { moving: boolean; reduce: boolean }): Readonly<WearyPose> {
    const p = this.pose;
    p.idleRate = 1;
    p.squash = 0;
    p.dipLu = 0;
    p.shiftLu = 0;
    p.pitchDeg = 0;
    p.flicker = 0;
    p.puff = false;
    const dt = Math.max(0, dtMs);
    this.t += dt;
    const k = o.reduce ? 0.5 : 1;
    const f = this.family;
    // the dip of a contact step (tired walkers, a mech's hitch)
    let dip = 0;
    if (this.dipT >= 0) {
      this.dipT += dt;
      const u = this.dipT / DIP_MS;
      if (u >= 1) this.dipT = -1;
      else dip = u < 0.3 ? u / 0.3 : 1 - (u - 0.3) / 0.7;
    }
    if (stage < 2) {
      this.eventT = -1;
      return p;
    }
    if (f === 'energy') {
      // the mint pulse (and at stage 3 a glitch shift with it), on a seeded rhythm
      const every = FLICKER_EVERY[stage === 3 ? 3 : 2];
      const len = o.reduce ? FLICKER_REDUCED_MS : FLICKER_MS;
      if (this.eventT < 0 && this.t >= this.nextAt) this.eventT = 0;
      if (this.eventT >= 0) {
        this.eventT += dt;
        const u = this.eventT / len;
        if (u >= 1) {
          this.eventT = -1;
          this.nextAt = this.t + range(this.rng, every[0], every[1]);
        } else {
          p.flicker = o.reduce ? 0.35 * Math.sin(u * Math.PI) : 0.55;
          if (stage === 3 && !o.reduce) p.shiftLu = GLITCH_LU * (this.rng.next() < 0.5 ? -1 : 1);
        }
      }
      return p;
    }
    if (stage < 3) return p;
    if (f === 'soldier' || f === 'armoured' || f === 'rider' || f === 'beast') {
      p.idleRate = TIRED_IDLE_RATE;
      if (!o.moving) {
        const b = Math.sin((this.t / this.breathPeriod) * Math.PI * 2);
        p.squash = BREATH_SQUASH * k * b * b * (f === 'beast' ? 1.3 : 1);
      }
      p.dipLu = this.dipLu * k * dip;
      return p;
    }
    if (f === 'mech') {
      // a hitch on one leg's contact step, and joint sparks with it
      p.dipLu = 1 * k * dip;
      if (dip > 0 && this.dipT >= 0 && this.dipT <= dt) p.puff = true;
      return p;
    }
    // vehicles and flyers: the sputter
    if (this.eventT < 0 && this.t >= this.nextAt) {
      this.eventT = 0;
      p.puff = true;
    }
    if (f === 'flyer') p.pitchDeg = FLYER_PITCH_DEG * k;
    if (this.eventT >= 0) {
      this.eventT += dt;
      const len = f === 'flyer' ? 420 : JUDDER_MS;
      const u = this.eventT / len;
      if (u >= 1) {
        this.eventT = -1;
        this.nextAt = this.t + (f === 'flyer' ? range(this.rng, 1300, 1700) : range(this.rng, SPUTTER_EVERY_MS[0], SPUTTER_EVERY_MS[1]));
      } else if (f === 'flyer') {
        if (!o.reduce) p.dipLu = FLYER_DIP_LU * Math.sin(u * Math.PI);
      } else if (!o.reduce) {
        p.shiftLu = JUDDER_LU * Math.sin(u * Math.PI * 7) * (1 - u);
      }
    }
    return p;
  }
}
