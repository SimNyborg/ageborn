/**
 * Assertions for invariants. Pure; safe in every layer.
 */

/** Thrown when an invariant fails. */
export class AssertionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssertionError';
  }
}

/** Throws an {@link AssertionError} unless `condition` holds. Narrows the type when it passes. */
export function assert(condition: unknown, message = 'Assertion failed'): asserts condition {
  if (!condition) throw new AssertionError(message);
}

/** Returns `value` when it is neither null nor undefined, else throws. */
export function assertDefined<T>(value: T | null | undefined, message = 'Expected a value'): T {
  if (value === null || value === undefined) throw new AssertionError(message);
  return value;
}

/** Asserts that `value` is a safe integer (DESIGN B3: integer state only). */
export function assertInt(value: number, message = 'Expected an integer'): void {
  if (!Number.isSafeInteger(value)) throw new AssertionError(`${message}: ${value}`);
}

/** Exhaustiveness check for discriminated unions: call in the `default` branch of a switch. */
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new AssertionError(`${message}: ${JSON.stringify(value)}`);
}
