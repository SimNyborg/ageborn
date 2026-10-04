/**
 * Content-wave cards that are live in the compiled content but gated (`released: false`) while their art,
 * effects and sounds are made: the art and sound coverage checks skip exactly these ids. The W1 Stone wave
 * shipped its art and left this list on 2026-10-03, the W2 Bronze, W3 Medieval, W4 Gunpowder, W5 Industrial,
 * W6 Modern and W7 Future waves the same day, and the W8 Cosmic wave on 2026-10-04. No wave is gated now (the
 * release-gate tests that need a gated card skip their held-back rows while the list is empty).
 *
 * Delete this file and its uses when no further wave is planned; every coverage check re-arms then. Test data
 * only; nothing in the game reads it.
 */

/** Cards, forts, summons, powers and skins of the gated wave. */
export const PAUSED_WAVE_IDS: ReadonlySet<string> = new Set<string>([]);

/** Visual and projectile ids the gated wave references (B5 manifest). */
export const PAUSED_WAVE_VISUALS: ReadonlySet<string> = new Set<string>([]);

/** Sound ids the gated wave references (A13, B7 manifest). */
export const PAUSED_WAVE_SOUNDS: ReadonlySet<string> = new Set<string>([]);
