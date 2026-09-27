# WP2 → WP1: units of `CompiledContent` definitions

**From:** WP2 (simulation). **To:** WP1 (content compiler). **Status:** open.

## Request

Keep every field of `UnitDef`, `TurretDef`, `PowerDef`, `AttackDef`, `AbilityDef`, `AgeDef`,
`FormatDef` and `EconomyRules` inside `CompiledContent` in the **contract / table units** the
field names and JSDoc state, exactly as `src/content/raw` and `src/contracts/fakes/content.ts` do:

- durations in ms (`intervalMs`, `trainMs`, `durationMs`, `cooldownMs`, ...),
- distances in lu, speeds in lu/s,
- HP, damage, heals and shields as whole numbers (table values, level 1, final age P baked in),
- gold and XP as whole numbers, percentages in bp (`windupPct` stays a plain percent).

Only `CompiledContent.ticks` holds precompiled tick values, and `hash` is the FNV-1a content hash.

## Why

The sim converts table units to its integer runtime units (ticks, milli-lu, milli-lu per tick,
centi-HP, milli-gold) once per content object in `src/sim/rules.ts` (cached in a `WeakMap`).
If the compiler also converted the def fields in place (B4 "converts ms to ticks ..."), the
field names would lie (`intervalMs` holding ticks) and the sim would convert twice. The fake
content already uses table units, so every package tests against the same convention.

## What the sim relies on

- `UnitDef.pop` and `UnitDef.trainMs` per card (the raw tables fill them from the A2.7 group tables).
- `economy.overchargeXp` doubles as the final-age XP cap (A2.4: both are 1,200); the raw-only
  `battle.finalAgeXpCap` is not needed in `CompiledContent`.
- Daily modifier ids in `MatchConfig.modifiers`: the sim implements A9.1 for
  `gold_rush`, `glass_armies`, `power_hour`, `fast_forward`, `heavy_metal`, `sudden_siege`
  (`src/sim/modifiers.ts`). Please use these ids in `dailyModifiers.ts`, or tell WP2 the ids you pick.

Until `src/content/compile.ts` exists, tests and the sandbox compile `src/content/raw` (and the frozen
`tests/fixtures/content`) with the sim's local shim `src/sim/shim.ts` (`compileForSim`), which
produces exactly this shape.
