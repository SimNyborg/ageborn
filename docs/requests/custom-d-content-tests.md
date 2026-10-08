# Request (Track D → whoever owns the shared content tests; the round's final agent): the World Ambassador title in two content tests

**From:** Track D (national flags, Flag Atlas), round 1, 2026-10-08.

Track D added the Flag Atlas's title (PLAN 2d: "All 195 grant the Legendary base flag World Compass and the title World Ambassador (title unlock `flagsOwned: 195`)") through `flagTitles` in `src/content/raw/nationalFlags.ts`, which C0's `cosmetics.ts` spreads after the 21 titles. Two shared content tests list the titles exactly and fail now:

1. **`src/content/test/meta.test.ts:501`** ("13 titles, 4 collection titles and 4 feat titles"): the list gains `'world_ambassador'` at the end (the schema already counts the Atlas's title on top of the 21: `cos.titles.filter((t) => t.unlock.kind !== 'flagsOwned')`). Either append `'world_ambassador'` to the expected ids or compare `cosmetics.titles.filter((t) => t.unlock.kind !== 'flagsOwned')`.
2. **`src/content/test/strings.test.ts`** ("content.en.json has every key the content references"): it wants every title's `title.<id>.name` and `title.<id>.unlock` in `content.en.json`. Track D put them in its own `src/i18n/flags.en.json` (keys are unique across files, so they work in the game). Please **move** them in one step (both files together, or the duplicate-key check fails):

   ```json
   "world_ambassador": { "name": "World Ambassador", "unlock": "Own all 195 national flags in the Flag Atlas" }
   ```

   into `content.en.json` under `title`, and delete the `title` block from `flags.en.json` (it holds nothing else).

Nothing else in these tests depends on the flags.

**Resolved (orchestrator, 2026-10-08, 512b529):** both tests know the World Ambassador title and its strings moved to `content.en.json`.
