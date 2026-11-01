/**
 * The damage state of one unit view (queue item 40, design 3.2-3.4): its stage from the HP it is drawn with, the marks
 * and the strip that stage shows, and the moment a step happens. Pure (no Pixi): the atlas and procedural unit views own
 * one each and draw it; the battle view hears the steps (`onDamageStep`) and plays their burst and sound.
 *
 * - Marks accumulate: a deeper stage adds marks on the next free patches (seeded order, `markSlots`) and never moves the
 *   old ones; a heal past a hysteresis line removes the newest (they fade with a mint glint, `mendMs`).
 * - The marks a step adds match the blow that crossed it (`noteBlow`, the hit's damage type) where the surface allows.
 * - A unit whose spots arrive late (its bundle loads after it spawned) replays its steps silently onto them, so it shows
 *   what it would have shown (`setSpots`).
 * - Deterministic: the same seed, steps and blows give the same marks.
 */
import { chooseMark, markSlots, stripFrom, stripPart, type MarkChoice, type MarkSlot } from './marks';
import { isMachine, marksAt, MAX_MARKS, MAX_STRIPS, nextStage } from './stage';
import type { BlowKind, DamageFamily, DamageSpot, DamageStage, MarkMat } from './types';

/** A mark on the unit: where (a patch of a spot), what (a kit part) and its life on the view clock (ms). */
export interface PlacedMark extends MarkChoice {
  slot: MarkSlot;
  /** The stage that laid it. */
  stage: DamageStage;
  /** View clock when laid (the scale-in), and when its mend fade started (-1: not mending). */
  bornMs: number;
  mendAt: number;
}

export interface PlacedStrip {
  spot: DamageSpot;
  part: string;
  bornMs: number;
  mendAt: number;
}

/** A step, as the view reports it (the view adds where the burst plays). */
export interface DamageStep {
  stage: DamageStage;
  prev: DamageStage;
  mend: boolean;
  /** The mark this step laid (damage) or the newest it mends (heal), or null (no spots: the fallback burst). */
  mark: PlacedMark | null;
  mat: MarkMat;
  kind: BlowKind | null;
  ignite: boolean;
}

/** How long a mended mark takes to fade (design 3.4: 300 ms with a small mint glint). */
export const MEND_FADE_MS = 300;
/** The new mark's pop: 1.25 -> 1.0 over 90 ms with an overshoot (design 3.4); Reduce motion fades in over 150 ms. */
export const MARK_POP_MS = 90;
export const MARK_FADE_IN_MS = 150;

/** The surface a unit's burst and sound speak for when it has no mark spots (the fallback, design option c). */
export function defaultMat(family: DamageFamily, wood = false): MarkMat {
  switch (family) {
    case 'armoured':
    case 'vehicle':
      return wood ? 'wood' : 'metal';
    case 'mech':
    case 'flyer':
      return 'metal';
    case 'beast':
      return 'hide';
    case 'energy':
      return 'energy';
    default:
      return wood ? 'wood' : 'cloth';
  }
}

interface History {
  stage: DamageStage;
  kind: BlowKind | null;
  effective: boolean;
}

export class DamageModel {
  stage: DamageStage = 0;
  /** Live and mending marks, oldest first. */
  readonly marks: PlacedMark[] = [];
  strip: PlacedStrip | null = null;
  private slots: MarkSlot[];
  private stripSpots: DamageSpot[];
  private blow: { kind: BlowKind | null; effective: boolean } = { kind: null, effective: false };
  /** Every stage change so far (to replay onto spots that arrive late). */
  private readonly history: History[] = [];
  /** Bumped whenever the marks or the strip change (the view re-lays its sprites only then). */
  revision = 0;

  constructor(
    readonly family: DamageFamily,
    readonly seed: number,
    spots: readonly DamageSpot[] | undefined,
    /** The surface used when the unit has no mark spots (wooden engines and shields answer as wood). */
    readonly fallbackMat: MarkMat = defaultMat(family),
  ) {
    this.slots = markSlots(spots, seed);
    this.stripSpots = (spots ?? []).filter((s) => s.kind === 'strip');
  }

  /** True when the unit has spots to put marks on (else it shows the effects-only fallback). */
  get hasMarks(): boolean {
    return this.slots.length > 0;
  }

  /** The blow that will cross the next step (the last hit's damage type; an effective counter hit draws bigger marks). */
  noteBlow(kind: BlowKind | null, effective = false): void {
    this.blow = { kind, effective };
  }

  /**
   * The stage for this frame's HP. Returns the step when the stage changed (damage or a mend), else null. `nowMs` is the
   * view's clock (the marks' pop and fade run on it).
   */
  update(hpBp: number, nowMs: number): DamageStep | null {
    const next = nextStage(this.stage, hpBp);
    if (next === this.stage) return null;
    const prev = this.stage;
    const blow = this.blow;
    this.history.push({ stage: next, kind: blow.kind, effective: blow.effective });
    const step = this.apply(next, blow.kind, blow.effective, nowMs);
    this.blow = { kind: null, effective: false };
    return { ...step, prev };
  }

  /** The unit's spots arrived (or changed): its marks are laid again on them, silently, as its steps would have. */
  setSpots(spots: readonly DamageSpot[] | undefined, nowMs: number): void {
    this.slots = markSlots(spots, this.seed);
    this.stripSpots = (spots ?? []).filter((s) => s.kind === 'strip');
    this.marks.length = 0;
    this.strip = null;
    this.stage = 0;
    for (const h of this.history) this.apply(h.stage, h.kind, h.effective, nowMs - 10_000);
    this.revision++;
  }

  /** Drops marks whose mend fade has run out (the view calls it as its clock runs). */
  prune(nowMs: number): void {
    let n = 0;
    for (let i = 0; i < this.marks.length; i++) {
      const m = this.marks[i] as PlacedMark;
      if (m.mendAt >= 0 && nowMs - m.mendAt >= MEND_FADE_MS) continue;
      this.marks[n++] = m;
    }
    if (n !== this.marks.length) {
      this.marks.length = n;
      this.revision++;
    }
    if (this.strip && this.strip.mendAt >= 0 && nowMs - this.strip.mendAt >= MEND_FADE_MS) {
      this.strip = null;
      this.revision++;
    }
  }

  private apply(next: DamageStage, kind: BlowKind | null, effective: boolean, nowMs: number): Omit<DamageStep, 'prev'> {
    const prev = this.stage;
    this.stage = next;
    this.revision++;
    if (next > prev) {
      // damage: lay marks up to the stage's count on the next free patches, keyed to the blow
      const live = this.marks.filter((m) => m.mendAt < 0);
      const want = Math.min(MAX_MARKS, this.slots.length, marksAt(next, this.seed));
      let laid: PlacedMark | null = null;
      for (let i = live.length; i < want; i++) {
        const slot = this.slots[i] as MarkSlot;
        const choice = chooseMark(slot.mat, next, kind, this.family, variantSeed(this.seed, i), effective);
        laid = { ...choice, slot, stage: next, bornMs: nowMs, mendAt: -1 };
        this.marks.push(laid);
      }
      if (!this.strip && next >= stripFrom(this.family) && this.stripSpots.length > 0 && MAX_STRIPS > 0) {
        const spot = this.stripSpots[variantSeed(this.seed, 99) % this.stripSpots.length] as DamageSpot;
        this.strip = { spot, part: stripPart(spot.mat, variantSeed(this.seed, 7)), bornMs: nowMs, mendAt: -1 };
      }
      const mark = laid ?? live[live.length - 1] ?? null;
      return { stage: next, mend: false, mark, mat: mark?.slot.mat ?? this.fallbackMat, kind, ignite: isMachine(this.family) && next === 3 && prev < 3 };
    }
    // a mend: the newest marks fade back to the stage's count; the strip goes below its stage
    const want = Math.min(MAX_MARKS, this.slots.length, marksAt(next, this.seed));
    let live = this.marks.filter((m) => m.mendAt < 0).length;
    let mended: PlacedMark | null = null;
    for (let i = this.marks.length - 1; i >= 0 && live > want; i--) {
      const m = this.marks[i] as PlacedMark;
      if (m.mendAt >= 0) continue;
      m.mendAt = nowMs;
      mended ??= m;
      live--;
    }
    if (this.strip && this.strip.mendAt < 0 && next < stripFrom(this.family)) this.strip.mendAt = nowMs;
    return { stage: next, mend: true, mark: mended, mat: mended?.slot.mat ?? this.fallbackMat, kind: null, ignite: false };
  }
}

/** A mark's variant seed from the unit's seed and its place in the stack (the same place draws the same variant). */
export function variantSeed(seed: number, i: number): number {
  let h = (seed ^ Math.imul(i + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}
