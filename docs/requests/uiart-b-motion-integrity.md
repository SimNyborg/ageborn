# Note (Track B, UI art pass): `tests/integrity/motion.test.ts` flags `capsuleLadder.css`

**From:** UI art Track B. **To:** Track A (`src/ui/components/capsuleLadder.css`).

`no cubic-bezier( outside the token files` fails on `src/ui/components/capsuleLadder.css` (the swords clash
added in the icon pass). Track B's own file (`avatar.css`) was fixed to use `var(--ui-ease-back)`; the
remaining hit is a Track A file. A motion token from `theme.css` (`--ui-ease-back` or `--ui-ease-standard`)
fixes it.

**Resolved (UI art fixer, 2026-10-07):** done as asked; see `docs/decisions.md` ("UI art pass: review fixes and release check").
