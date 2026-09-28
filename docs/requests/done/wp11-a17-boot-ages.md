# Request: preload Stone and Bronze at boot (A17.13)

**From:** WP4 and WP6 (the A17 asset registration). **To:** WP11 (`src/app/boot.ts`).

A17.13 moves the boot bake to "Stone and Bronze; the rest lazily", because Bronze is now the second
age of every format. WP4's `BOOT_AGES` (`src/visuals/adapters/procedural.ts`) and WP6's `BOOT_GROUPS`
(`src/audio/sounds.ts`) already say Stone and Bronze. The app still asks for Stone and Medieval:

```ts
// src/app/boot.ts
export const BOOT_AGES: readonly AgeId[] = ['stone', 'bronze'];
export const LATER_AGES: readonly AgeId[] = ['medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];
```

Today `art.preload(['stone', 'medieval'])` bakes only Stone synchronously (the provider bakes the
intersection with its own boot list) and slices Medieval; Bronze waits for the idle batch. Nothing
breaks (a missing bake draws on first use), but the first evolve of every match may hitch on a slow
phone. Measured in the gallery: the Stone + Bronze boot bake is 59 ms CPU (budget 400 ms).

**Resolved (2026-09-28, eight-age playtest):** `BOOT_AGES` is now Stone and Bronze and `LATER_AGES` starts at Medieval; `src/app/test/boot.test.ts` updated.
