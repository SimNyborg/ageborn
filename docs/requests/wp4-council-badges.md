# Request to WP4 (visuals): War Council badges

From: A18 phases 0-3 (contracts, content, sim).

DESIGN A18.5.7 gives every War Council pick one badge: `research.<id>` in the visual manifest
(later per-age looks as `research.<id>.<ageId>`, falling back to `research.<id>`).

The 28 v1 pick ids are in `src/content/raw/research.ts` (for example `research.economy.granary`,
`research.troops.infantry.mail`, `research.command.war_horns`).

Until the badges exist, `ResearchPickDef.visualId` is optional and the content leaves it out, so
`tests/integrity/ids.test.ts` stays green. When the badges land in `src/visuals/manifest.ts`:

1. add `visualId: \`research.${id}\`` back in `pick()` in `src/content/raw/research.ts`;
2. re-snapshot the content hash (`src/content/test/compile.test.ts`) and regenerate
   `src/content/generated/counters.json` if its hash covers research.
