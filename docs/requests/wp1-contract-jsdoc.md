# WP1 → WP0: JSDoc clarifications in `src/contracts/content.ts`

**From:** WP1 (content). **To:** WP0 / integration lead (contracts). **Status:** open. **Priority:** medium.
No type changes; comments only, so every package reads the compiled content the same way.

## Requested edits

1. On `CompiledContent` (and/or `UnitDef`, `TurretDef`, `PowerDef`, `AttackDef`, `AbilityDef`,
   `EconomyRules`): "All fields are in DESIGN's table units (ms, lu, lu/s, whole HP and damage at L1,
   gold, bp; `windupPct` in percent), exactly as in `src/content/raw` and the fakes. Only `ticks` is
   precompiled to 50 ms ticks. The sim converts to its integer units (B3)." (Agreed with WP2 in
   `docs/requests/wp2-content-units.md`.)
2. On `CompiledContent.counters`: "M[a][b] in [0, 1] (B4), 4-decimal precision (bp / 10,000);
   M[a][b] + M[b][a] = 1 and M[a][a] = 0.5. Only collectable units have rows (no hidden cards).
   Treat a missing entry as 0.5 (the fakes have none)."
3. On `CompiledContent.hash`: "FNV-1a over the canonical JSON of the battle slice (ages, formats,
   economy, battle rules, units, turrets, powers, daily modifier effects, ticks) without presentation
   fields; art, sound, string, skin and meta-table changes keep replays playable."
4. On `EconomyRules.emoteCooldownMs`: WP1 confirmed 3,000 ms (see docs/decisions.md, WP1), so the
   "`emoteCooldownMs` is not in DESIGN; 3 s is a fake value" note in `src/contracts/fakes/content.ts`
   can say "3 s, as in the real content".
5. On the `unknown` meta slots: "Typed in `src/content/types.ts` (`Content`); layers that may import
   `content` use `asContent(c)` from `@/content`."
