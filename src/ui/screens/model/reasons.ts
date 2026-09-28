/**
 * Failure feedback: maps the `reason` of a failed action (`ActionResult`, the meta `Result` reasons
 * such as `amber` or `dust`) to the toast text key. Unknown reasons get the generic message, so a
 * new meta reason can never show a raw code.
 */

const REASON_KEYS: Readonly<Record<string, string>> = {
  amber: 'ui.error.notEnoughAmber',
  dust: 'ui.error.notEnoughDust',
};

export function reasonKey(reason: string): string {
  return REASON_KEYS[reason] ?? 'ui.error.generic';
}
