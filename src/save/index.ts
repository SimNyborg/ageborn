/**
 * Save system (DESIGN B8, C2/WP8). The app builds the store with `createBrowserSaveStore()`; tests
 * and tools build `new LocalSaveStore({ storage: new MemoryStorage() })`.
 */
export { attachFlushHooks, browserStorage, createBrowserSaveStore, downloadSaveFile, readSaveFile, type FlushTargets } from './browser';
export { checksum } from './checksum';
export {
  BACKUP_REMINDER_MS,
  DEFAULT_SETTINGS,
  defaultSettings,
  EVENT_LOG_CAPACITY,
  preMigrationBackupKey,
  REPLAY_RING_SIZE,
  SAVE_DEBOUNCE_MS,
  SAVE_FILE_EXTENSION,
  SAVE_KEYS,
  SLOT_KEYS,
  UNREADABLE_BACKUP_COPIES,
  UNREADABLE_BACKUP_KEY,
  type SlotId,
} from './defaults';
export { backupReminderDue, isFirstWin, markExported, persist, type PersistOutcome, type StorageManagerLike } from './durability';
export { EventLogStore, parseEventLogRecord, type EventLogRecord } from './eventLog';
export {
  decodeSaveCode,
  encodeSaveCode,
  EXPORT_CODE_PREFIX,
  importSaveCode,
  importSaveValue,
  saveFileFor,
  type ImportFailure,
  type ImportResult,
  type SaveFile,
} from './exportImport';
export { JsonRing } from './jsonRing';
export { migrate, migrationTable, SAVE_VERSION, SAVE_VERSIONS, type MigrateFailure, type MigrateResult, type SaveVersion } from './migrations';
export { IMPORT_MESSAGE_KEYS, SAVE_MESSAGE_KEYS, saveNotice, type SaveNotice, type SaveProblemKind } from './notices';
export { createReplayRing } from './replays';
export { ReplayDocSchema, validateReplay } from './replaySchema';
export { SaveDocSchema, SettingsSchema, validateSaveDoc, type Validation } from './schema';
export { decodeSlot, encodeEnvelope, readSlots, type SlotEnvelope, type SlotRead } from './slots';
export { isQuotaError, makeQuotaError, MemoryStorage, type KeyValueStorage } from './storage';
export {
  LocalSaveStore,
  realTimers,
  type LoadReport,
  type LocalSaveStoreOptions,
  type SlotOutcome,
  type SlotReport,
  type Timers,
} from './store.localStorage';
export { readUnreadableCopies, type UnreadableCopy } from './unreadable';
