# WP8 → integration lead: add the save system's string file

**From:** WP8 (save system). **To:** integration lead (C2 gives WP8 no string file; `src/i18n/*.en.json` files are per WP). **Status:** open.

## Request

Create `src/i18n/save.en.json` with exactly this content and give WP8 ownership of it in C2 (like `capsule.en.json` for WP10):

```json
{
  "save": {
    "problem": {
      "quota": "Storage is full, so your progress isn't being saved. Back it up in Settings.",
      "unavailable": "This browser blocks saving. Your progress will be lost when you close the game. Back it up in Settings.",
      "writeFailed": "Your progress couldn't be saved. Back it up in Settings.",
      "recovered": "Your last save was damaged, so an earlier copy was loaded.",
      "unreadable": "Save could not be read. Import a backup?",
      "tooNew": "Your save is from a newer version of Ageborn. Reload the page to update. Nothing is saved until then."
    },
    "import": {
      "empty": "Paste a save code first.",
      "notACode": "That isn't an Ageborn save code.",
      "corrupt": "That code is damaged. Copy the whole code and try again.",
      "notASave": "That code doesn't contain a save.",
      "tooNew": "That save is from a newer version. Reload the game to update, then try again.",
      "invalid": "That save couldn't be read."
    }
  }
}
```

## Why

C2/WP8 DoD: "quota errors are caught with a user-facing message" (B8 Durability: "Quota errors are caught and
shown to the player"). The save layer may not import i18n or UI (B2), so every problem is a `SaveNotice` whose
`messageKey` is one of the keys above (`src/save/notices.ts`: `SAVE_MESSAGE_KEYS`, `IMPORT_MESSAGE_KEYS`); the app
shows `t(notice.messageKey)` (see `docs/requests/wp8-app-wiring.md`). The keys are only referenced as data, so the
integrity tests do not see them; `src/save/test/strings.test.ts` checks that every key has EN text, read from
`src/i18n` as soon as any `save.*` key is there, else from the JSON block above (keep them in sync); `?dev=1#save` shows the proposed EN text marked "[string pending]"
until then. `save.problem.unreadable` repeats the B8 banner text that WP11 also has as `tutorial.saveUnreadable`;
either key works.
