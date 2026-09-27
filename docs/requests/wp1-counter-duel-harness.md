# WP1 → WP2: a duel harness for the counter matrix (Phase 3)

**From:** WP1 (content). **To:** WP2 (sim). **Status:** open. **Priority:** low (Phase 3 tuning).

## Request

Expose a pure helper from the sim, for example `src/sim/duel.ts`:

```ts
/** `countA` × `a` on side 0 against `countB` × `b` on side 1, all at L1, on a flat lane with no
 *  bases, turrets, powers or phases; runs until one side is wiped or `maxTicks`. */
export function runDuel(content: CompiledContent, a: CardId, b: CardId, countA: number, countB: number,
  o?: { maxTicks?: number }): { hpLeftBp: [number, number]; ticks: number };
```

## Why

DESIGN B4 wants the counter matrix from "equal-gold 1v1 duels of every unit pair at L1 on a flat
lane". In Phase 1 the sim had no such entry point, so WP1 generates the matrix with its own compact
duel model (`src/content/counters/duel.ts`, see docs/decisions.md WP1). With a sim harness,
`tools/counters.ts` can run the real rules instead (a tool may import the sim; the content layer
may not), and the matrix then tracks every sim change. The generator keeps the same file format,
so nothing downstream changes. Units with nothing in range should walk toward the nearest enemy
they can hit (there is no base to walk to), or duels between air and melee never end.
