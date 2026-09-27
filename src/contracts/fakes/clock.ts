/**
 * Fixed `Clock` fake (DESIGN B2, B9: meta gets time only through an injected Clock).
 * Time never moves unless the test calls `set` or `advance`.
 */
import type { Clock } from '../meta';

/** 2026-01-01T04:00:00Z in epoch ms: a daily-reset boundary (DESIGN B8: reset 04:00). */
export const FAKE_EPOCH_MS = 1767240000000;

export class FixedClock implements Clock {
  constructor(private t: number = FAKE_EPOCH_MS) {}
  now(): number {
    return this.t;
  }
  set(t: number): void {
    this.t = t;
  }
  advance(ms: number): void {
    this.t += ms;
  }
}
