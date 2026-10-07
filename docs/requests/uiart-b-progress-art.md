# Request (Track B, UI art pass): War Chest and quest art in Home's quest panel

**From:** UI art Track B. **To:** Track A (`src/ui/screens/home/parts.tsx` owns `QuestsPanel`, `QuestRow`
and `WarChestBar`, which the Progress tab also renders).

Audit §2.7 rates the War Chest box icon and the icon-less quest rows "ok to weak". The art is ready in a
Track B file, `src/ui/screens/progress/ProgressArt.tsx`:

- `WarChestArt({ fillBp, size?, open? })`: an iron-bound wooden chest whose front gauge fills with the
  counting wins. In `WarChestBar`, replace `<CrateIcon size={34} />` with
  `<WarChestArt fillBp={Math.round((w.wins * 10000) / Math.max(1, w.of))} size={40} />`.
- `QuestGlyph({ stat, size? })`: one glyph per quest metric (`q.def.metric`: evolves, baseDamage, wins,
  unitsTrained, turretKills, dailyChallengeWins, upgrades...). In `QuestRow`, add
  `<span class="home-quest__icon"><QuestGlyph stat={q.def.metric} size={26} /></span>` before
  `home-quest__main` (the row is a flex row; 26 px fits the phone height).

No strings change. Both are decorative (`aria-hidden`).

**Resolved (UI art fixer, 2026-10-07):** done as asked; see `docs/decisions.md` ("UI art pass: review fixes and release check").
