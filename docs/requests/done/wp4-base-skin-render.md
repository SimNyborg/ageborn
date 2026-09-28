# WP4 → WP5: pass the side's base skin to `createBase` whatever the starting age

**From:** WP4 (visuals, review). **To:** WP5, `src/render/battleView.ts` (`createBase`). **Status:** open. **Priority:** medium (the Crystal Spire, the Arena 8 reward skin, never shows in a normal match today).

## Problem

A base skin targets one age's base: `crystal_spire` is `base.future@crystal_spire` (DESIGN A5.8). The
battle view looks the skin up by the base's current age when it creates the view:

```ts
const skin = this.config.sides[side].skins[`base.${age}`]; // age = 'stone' at match start
```

Matches start in the Stone Age, so `skins['base.stone']` is empty and no skin reaches the base view.
On evolve the view only calls `morphTo(age)`, so the Future base is always drawn plain.

## Request

Pass the side's base skin (whichever `base.<age>` target it has) when the base view is created:

```ts
const skins = this.config.sides[side].skins;
const skin = Object.entries(skins).find(([target]) => target.startsWith('base.'))?.[1];
const view = this.art.createBase({ age, ...(skin ? { skin } : {}), side, teamPreset: this.settings.teamPreset });
```

## Status on the WP4 side

Done and tested (`src/visuals/provider.ts`, test "draws a base skin on the age it belongs to, including
after evolving into that age"): `createBase({ age, skin })` now applies the skin to every age that has
an entry for it and draws the plain base for the other ages without a warning. A Stone base created
with `crystal_spire` looks plain, and turns into the Crystal Spire when it morphs into the Future age.

## Resolution (Phase 2a)

Applied in `src/render/battleView.ts` `createBase`: the side's `base.<age>` skin is passed whatever age the match starts in.
