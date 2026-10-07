# Record (Track B, UI art pass): additive `AvatarSpec` fields and save v12

**From:** UI art Track B (avatar creator, owner request 2026-10-07). **To:** the integration lead (contracts).

The audit (§6.7) asked for the orchestrator's approval before the contract change; the Track B task from
the orchestrator assigned "ownership in the save with a migration", so the change is made and recorded here
for review:

- `src/contracts/save.ts`: new `AvatarSlot` and `AvatarTint` types; `AvatarSpec` gains optional
  `look?: Partial<Record<AvatarSlot, string>>` and `tints?: Partial<Record<AvatarTint, number>>`. `seed`,
  `parts` and `portraitCard` are unchanged. Additive: every v11 doc still type-checks.
- `src/contracts/fakes/saveStore.ts`: the fake fresh save writes `v: 12` (the schema validates the current
  version only), as the v11 step did.
- `src/save/migrations/v12.ts` + schema + frozen `fixtures/v12.json`; `src/meta/rules.ts` `SAVE_VERSION = 12`.

If the lead prefers another shape, the only readers are `src/ui/components/avatar/look.ts`
(`resolveLook`) and `src/meta/avatar.ts` (`setAvatarLook`).
