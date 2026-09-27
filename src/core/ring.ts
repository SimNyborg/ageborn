/**
 * Fixed-capacity ring buffer. Used for the delayed observation ring (DESIGN B6/B10):
 * `ring.at(delay)` returns the item pushed `delay` pushes ago (0 = newest), clamped to the oldest kept.
 */
import { assert } from './assert';

export class RingBuffer<T> {
  readonly capacity: number;
  private readonly items: (T | undefined)[];
  private head = 0; // index of the next write
  private count = 0;

  constructor(capacity: number) {
    assert(Number.isInteger(capacity) && capacity > 0, 'RingBuffer capacity must be a positive integer');
    this.capacity = capacity;
    this.items = new Array<T | undefined>(capacity);
  }

  /** Number of items currently stored. */
  get length(): number {
    return this.count;
  }

  /** Appends an item, overwriting the oldest when full. */
  push(item: T): void {
    this.items[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.count < this.capacity) this.count += 1;
  }

  /**
   * The item pushed `back` pushes ago (0 = newest). When fewer items exist, returns the oldest one.
   * Returns undefined only when the buffer is empty.
   */
  at(back: number): T | undefined {
    if (this.count === 0) return undefined;
    const k = Math.min(Math.max(0, Math.trunc(back)), this.count - 1);
    const idx = (this.head - 1 - k + this.capacity * 2) % this.capacity;
    return this.items[idx];
  }

  /** The newest item, or undefined when empty. */
  latest(): T | undefined {
    return this.at(0);
  }

  /** Items from oldest to newest. */
  toArray(): T[] {
    const out: T[] = [];
    for (let k = this.count - 1; k >= 0; k -= 1) {
      const v = this.at(k);
      if (v !== undefined) out.push(v);
    }
    return out;
  }

  /** Removes every item. */
  clear(): void {
    this.items.fill(undefined);
    this.head = 0;
    this.count = 0;
  }
}
