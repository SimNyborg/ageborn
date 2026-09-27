/**
 * The fixed-step accumulator of the battle loop (DESIGN B6 Loop). The session (WP11) owns the loop;
 * this helper keeps the arithmetic in one tested place:
 *
 * ```
 * acc += min(frameMs, 250) × speed × (freeze ? 0 : 1)
 * while acc ≥ 50: step the sim; acc −= 50
 * view.render(acc / 50, frameMs)
 * ```
 *
 * Use: `clock.add(frameMs, speed, view.simFrozen)`, then `while (!view.simFrozen && clock.consume()) step()`,
 * then `view.render(clock.alpha, frameMs)`. Checking the freeze inside the loop lets a global freeze
 * raised by this frame's events stop the remaining steps at once.
 */
export const TICK_MS = 50;
export const MAX_FRAME_MS = 250;

export class FixedStepClock {
  private acc = 0;

  /** Adds real frame time scaled by speed; nothing is added while frozen or paused. */
  add(frameMs: number, speed: number, frozen: boolean): void {
    if (frozen || !(frameMs > 0) || !(speed > 0)) return;
    this.acc += Math.min(frameMs, MAX_FRAME_MS) * speed;
  }

  /** Takes one tick from the accumulator. Returns false when less than one tick is stored. */
  consume(): boolean {
    if (this.acc < TICK_MS) return false;
    this.acc -= TICK_MS;
    return true;
  }

  /** Interpolation factor for the render: acc / DT, in [0, 1). */
  get alpha(): number {
    return Math.min(1, this.acc / TICK_MS);
  }

  reset(): void {
    this.acc = 0;
  }
}
