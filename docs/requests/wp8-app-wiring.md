# WP8 → WP11 (and WP9): wiring the real save store (Phase 2)

**From:** WP8 (save system). **To:** WP11 (`src/app/**`), WP9 for the Settings actions. **Status:** open (Phase 2).

Everything below is exported from `@/save`. The store implements the frozen `SaveStore` contract; the extras
(`flush`, `onProblem`, `problem`, `loadReport`, `reset`, `exportFile`, `importFile`, `eventLog`, `storage`)
are on the concrete `LocalSaveStore`. If the lead prefers them in the contract, they can move there unchanged.

## 1. Service loader (`src/app/services.ts`)

```ts
save: {
  real: async () => (await import('@/save')).createBrowserSaveStore(),
  memory: async () => new (await import('@/contracts/fakes/saveStore')).InMemorySaveStore(),
},
```

and flip `DEFAULT_CHOICE.save` to `'real'`. `createBrowserSaveStore()` uses localStorage (an in-memory stand-in
when the browser blocks it, reported as the `unavailable` problem) and attaches the flush hooks on
`visibilitychange` (hidden) and `pagehide` (B8 Writes).

## 2. Boot (B8 Load order, B11 step 1)

```ts
let doc = await store.load();                // null: first run, or nothing readable
if (!doc) {
  doc = meta.newSave(content, clock, seed);
  void store.save(doc, { immediate: true });
}
const report = store.loadReport;             // status 'empty' | 'loaded' | 'recovered' | 'unreadable'
if (report?.notice) showBanner(t(report.notice.messageKey)); // unreadable: add an "Import" button → Settings import
```

## 3. Problems the player must see (DoD: quota errors with a user-facing message)

```ts
const show = (n: SaveNotice | null) => (n ? showToastOrBanner(t(n.messageKey), { sticky: n.ongoing }) : hideSaveBanner());
store.onProblem(show);
if (store.problem) show(store.problem);      // e.g. 'unavailable' is set before any listener exists
```

`ongoing` notices (`quota`, `unavailable`, `writeFailed`, `tooNew`) mean progress is not being saved; keep a
small sticky indicator until `onProblem(null)`. `tooNew` means the page is an old cached build after an update:
offer a "Reload" button. Keys and EN text: `docs/requests/wp8-strings.md`.

## 4. Durability

- After a match: `if (isFirstWin(prevSave, nextSave)) void persist();` (B8: `navigator.storage.persist()` on the first win).
- Capsule rolls and upgrades already save with `{ immediate: true }` (decisions WP11 "end flow"); keep that.

## 5. Settings (WP9 actions, app implementation)

- Copy code: `store.exportCode(doc)`; after a successful copy or download save `markExported(doc, clock.now())`.
- Download: `downloadSaveFile(store.exportFile(doc))` (a `.ageborn` file holding the same code).
- Import: `const r = store.importCode(text)` (or `store.importFile(await readSaveFile(file))`); on success replace
  the save signal with `r.value` and `store.save(r.value, { immediate: true })`; on failure show
  `t(IMPORT_MESSAGE_KEYS[r.reason])`. Import never writes by itself.
- Backup reminder: `backupReminderDue(doc, now)` (same rule as WP9's decision: `lastExportAt ?? createdAt`, 5 days).
- Reset progress: `store.reset()` (slots, backups and replays; the event log stays unless `{ eventLog: true }`), then a new save.

## 6. Event log and replays

- The onboarding `EventLog` can keep its own ring and persist through the same storage, so it also gets the
  memory fallback: `new EventLog({ clock, store: saveStore.storage })`. `store.eventLog` (an `EventLogStore`)
  reads and writes the same `ageborn.eventlog` format (tested both ways) and adds quota shrinking; Settings
  "Export event log" can use either `export()`.
- Replays: `pushReplay` / `loadReplays` as in the contract (ring of 20, oldest first, validated on read).
  When storage is full the rings give up space before the save does, so a replay may exist only for the session.
