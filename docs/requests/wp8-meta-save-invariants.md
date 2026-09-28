# WP8 → WP7: what the save schema checks

**From:** WP8 (save system). **To:** WP7 (meta rules, `newSave` and every transition). **Status:** open (for information; no change to WP8 needed).

The real store validates every doc on `save()` against `SaveDocSchema` (`src/save/schema.ts`) and refuses to
write one that would not load again (the last good save stays, and the player sees `save.problem.writeFailed`).
So every doc meta returns must satisfy, besides the contract types:

- `v` is 1 (`SAVE_VERSION`).
- Non-negative integers: `currencies.amber/dust`, `arenaIndex`, collection `level` and `copies`, `activePlan`,
  capsule `charges`, `freeCapsulesLeft`, `clayMeter`, `dailyBank`, every `pity` counter, `scriptStep`,
  `codexPoints`, `codexLevel`, `lossStreak`, `matchesPlayed`, quest `progress`, capsule stack `copies`/`dust`,
  capsule `amber`/`dust`, crate `duplicateDust`, `scriptIndex` (when not null), all `stats` counters and the
  per-tier/per-card arrays and maps, `tutorial.step` and `hintsShown` values.
- Integers (may be negative): `trophies.current`, `trophies.best`, `roadClaimed`, `capsules.bag`,
  `conquest.milestonesClaimed`, `profile.avatar.seed`.
- Finite numbers: `mmr`, all timestamps (`createdAt`, `chargesUpdatedAt`, `dailyNextAt`, `lastExportAt`,
  capsule and crate `createdAt`), `fastestWinMs`, avatar `parts` values.
- `warPlans` has at least one plan, each with all five ages; every loadout has exactly 5 unit slots and 2 turret
  slots (null for empty) and a non-empty `power`; `activePlan < warPlans.length`.
- `rng.capsule` is four uint32 words (0 … 2^32 − 1), as `sfc32Next` leaves them.
- Ids (cards, skins, capsule and crate ids) are non-empty strings. Ids are not checked against the content.
- Settings are forgiving: an invalid or missing settings field is replaced by its default (`DEFAULT_SETTINGS`
  in `src/save/defaults.ts`: volumes and shake 1, graphics auto, damage numbers important, speed 1, ...), so
  `newSave` should use the same defaults.

Suggested test in `src/meta/test` (tests may cross layers): `validateSaveDoc(newSave(...)).ok` and the same after a
long random sequence of transitions (`import { validateSaveDoc } from '@/save'`).
