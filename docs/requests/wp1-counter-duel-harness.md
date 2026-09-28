# WP1 → WP2: a duel harness for the counter matrix (Phase 3)

**From:** WP1 (content). **To:** WP2 (sim). **Status:** harness delivered (WP2: `runDuel` in `src/sim/duel.ts`); switching `tools/counters.ts` to it is open WP1 work for Phase 3 (see "Review note" below). **Priority:** low (Phase 3 tuning).

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

## Review note (WP1 review, Phase 1)

The WP1 reviewer ran every collectable pair through the sim's `runDuel` with the same `duelCounts`
and the same both-ways averaging as `src/content/counters/matrix.ts`, and compared the result with
`generated/counters.json` (engine 1). About 10 s for all 595 pairs.

- Same winner (sign of M − 0.5) in 569 of 595 pairs (96%).
- Pairs that differ by more than 0.3: tuskback/friar, drum_shaman/radio_operator,
  sabertooth/balloon_admiral, friar/radio_operator, fusilier/bazooka_trooper,
  field_surgeon/balloon_admiral, field_surgeon/radio_operator, balloon_admiral/radio_operator,
  balloon_admiral/emp_saboteur, rifleman/rail_gunner, pulse_trooper/rail_gunner.
- The two setups differ, which explains the support and bomber pairs at least: the sim harness
  spawns each group stacked at p = 450 (300 lu apart) and units that find nothing to hit keep
  walking toward the enemy gate (the bomber flies on to the base), while the content model spawns
  the groups in file at p = 20 and lets idle units seek the nearest enemy they can hit. The
  ranged pairs (rifleman or pulse_trooper against rail_gunner, fusilier against bazooka_trooper)
  were not traced further; the start distance (both sides begin almost in range in the sim) is the
  likely cause, but a rule difference is not ruled out.

To switch in Phase 3: make `tools/counters.ts` call the sim's `runDuel` (tools may import the sim),
agree the start positions and the seek rule with WP2 so air-vs-melee and support-vs-support duels
end, and replace the input-hash staleness check (it cannot see sim code changes) with a full
regeneration in CI (`npx tsx tools/counters.ts --check` that re-runs the duels, about 10 s).
