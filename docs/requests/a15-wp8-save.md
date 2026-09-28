# A15 → WP8: save schema and defaults

**From:** design merge of A15 (2026-09-28). **To:** WP8 (save). **Status:** open, Phase 2b, together with the WP0 amendment (`a15-wp0-contracts.md`).

- **Schema** (`src/save/schema.ts`): `daily` becomes `{ dayKey: string; bank: number }`; `settings` gains optional `breakReminder` and `quickReveal`. Keep the type-parity test green.
- **Limits** the schema should allow: `capsules.charges` up to 28, `capsules.dailyBank` up to 7, `quests.daily` up to 21 entries, `daily.bank` up to 7.
- **Defaults** (A15.6, B8): `breakReminder` true, `quickReveal` false, `vibrate` false, for every player.
- **Fixture:** update the v1 save fixture in the same change as WP0.
- **Version:** SaveDoc stays at version 1 with no migration, because all of this lands before the Checkpoint C push. After that push, every shape change needs a migration (B8, A15.18).
