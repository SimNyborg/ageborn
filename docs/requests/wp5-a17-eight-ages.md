# Request: eight ages in the battle view and HUD (A17 step 2)

**From:** the A17 step 2 wiring task (contracts, content, sim, AI, meta, save). **To:** WP5 (`src/render`, `src/ui/hud`).

`AgeId` now has eight ages (Stone, Bronze, Medieval, Gunpowder, Industrial, Modern, Future, Cosmic) and the
ladder formats are Short 4, Standard 6 and Full 8 ages (A17.8). The tutorial format still skips ages: it
plays Stone, Medieval, Gunpowder, Modern, Future. `SideState.ageIndex` is the **position in the format**,
not `AgeDef.index`, so the two differ in the tutorial (A17.15 rule 4).

## 1. Bug: the HUD and the battle view map `ageIndex` through the global age list

**Status:** done (A17 step 1 review fixes): `ageOrder` / `ageIds(config)` follow the format; the outdated-turret mark compares global indices; the XP tests in part 2 use 550.

These look up the age as `<all ages sorted by AgeDef.index>[state.sides[s].ageIndex]`, which is wrong
whenever the format skips ages, that is in onboarding match 1: in Medieval (position 1) they read Bronze.

- `src/render/hudModel.ts` `ageOrder(config)` (used by `xpThreshold`, line ~101 and ~163, and
  `battleView.ts` `this.ages` for the base, backdrop and music age at line ~889).
- `src/ui/hud/model.ts` `ageIds(content)` in `turretSlots` (line ~131) and `xpNeeded` (line ~378).
- `src/ui/hud/TopBar.tsx` line ~262 (`ages[m.me.ageIndex]`).
- `src/render/battleView.ts` line ~1638 compares `content.ages[t.age].index < s.ageIndex` (global index
  against a format position) for the "outdated turret" mark.

Fix: the age of a side is `config.content.formats[config.format].ages[ageIndex]`; compare turret ages by
`AgeDef.index` of both ages. `src/tutorial/view.ts` `xpThreshold` already does this, and the same bug in
`src/tutorial/hints.ts` (modernise hint) is fixed in this step.

## 2. Tests that encode the old thresholds or age order

With A17.8 the Stone threshold is 550 (was 700) and Medieval is index 2 (was 1). These fail now:

- `src/render/test/hudModel.test.ts`: "computes XP ..." (550 not 700), "follows the Daily Challenge
  modifiers" (Fast Forward 385 = 550 × 0.7, not 490).
- `src/ui/hud/test/readability.test.ts`: both XP tests (550 / 275 of 550).
- `src/ui/hud/test/model.test.ts`: the two modernise tests use `ageIndex: 1` for Medieval; in Short and
  Full War position 1 is now Bronze (use 2, or better derive it from the format).
- `src/render/test/realSim.test.ts` "maps a whole match": `evolve_fanfare_bronze` is not in the sound
  manifest yet (WP6 request `wp6-a17-eight-ages-audio.md`); `designIds.ts` and `realSim.test.ts` still
  list five ages.

## 3. Age glyphs

`src/ui/hud/icons.tsx` `AgeGlyph` has no case for `bronze`, `industrial` and `cosmic` (it renders
nothing for them). A17.12 motifs: Bronze a ziggurat or a bronze crested helmet, Industrial a chimney
with a cog, Cosmic a ringed planet. Palettes: Bronze sandstone #CDBE9E, verdigris #4F8F7F, accent
#B8863B; Industrial iron #5B6168, coal #2B2A2E, accent copper #B06A3B; Cosmic void #1E1830, nebula
violet #8E44C8, accent mint #3FE0B0. `src/ui/components/icons.tsx` (WP9) and `src/capsule/walkout.ts`
(WP10) have the same switch without the three new ages.
