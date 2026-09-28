/**
 * Save problems the player must hear about (DESIGN B8 Durability: "quota errors are caught and shown
 * to the player"; Load order step 5: "Save could not be read. Import a backup?").
 *
 * The save layer cannot import i18n or UI (DESIGN B2), so a notice carries an i18n key and the app
 * shows `t(notice.messageKey)`. The EN strings are in `docs/requests/wp8-strings.md`.
 */
import type { ImportFailure } from './exportImport';

export type SaveProblemKind =
  /** A write was refused because storage is full (after freeing replay and log space). */
  | 'quota'
  /** The browser blocks storage: progress lives only in this tab. */
  | 'unavailable'
  /** Any other storage error on write. */
  | 'writeFailed'
  /** The store refused to write a doc that fails the schema (a bug); the last good save is kept. */
  | 'invalidDoc'
  /** At load: the newest copy was damaged, an earlier copy was loaded. */
  | 'recovered'
  /** At load: no copy could be read; the game starts fresh and offers an import. */
  | 'unreadable'
  /**
   * At load: a copy was written by a newer build (a cached old page after an update). Nothing is
   * written until the page is reloaded, so the newer save survives.
   */
  | 'tooNew';

export interface SaveNotice {
  kind: SaveProblemKind;
  /** i18n key of the player-facing message. */
  messageKey: string;
  /**
   * True while progress is not being saved (quota, unavailable, write failed, invalid doc, newer
   * save); cleared by the next successful write. False for the one-off load messages.
   */
  ongoing: boolean;
  /** Developer detail for the console and the dev page; never shown to players. */
  detail?: string;
}

export const SAVE_MESSAGE_KEYS: Readonly<Record<SaveProblemKind, string>> = {
  quota: 'save.problem.quota',
  unavailable: 'save.problem.unavailable',
  writeFailed: 'save.problem.writeFailed',
  invalidDoc: 'save.problem.writeFailed',
  recovered: 'save.problem.recovered',
  unreadable: 'save.problem.unreadable',
  tooNew: 'save.problem.tooNew',
};

const ONGOING: ReadonlySet<SaveProblemKind> = new Set(['quota', 'unavailable', 'writeFailed', 'invalidDoc', 'tooNew']);

export function saveNotice(kind: SaveProblemKind, detail?: string): SaveNotice {
  const n: SaveNotice = { kind, messageKey: SAVE_MESSAGE_KEYS[kind], ongoing: ONGOING.has(kind) };
  if (detail !== undefined) n.detail = detail;
  return n;
}

/** i18n key for a failed import, for the Settings import dialog. */
export const IMPORT_MESSAGE_KEYS: Readonly<Record<ImportFailure, string>> = {
  empty: 'save.import.empty',
  notACode: 'save.import.notACode',
  corrupt: 'save.import.corrupt',
  notASave: 'save.import.notASave',
  badVersion: 'save.import.notASave',
  tooNew: 'save.import.tooNew',
  migrationFailed: 'save.import.invalid',
  invalid: 'save.import.invalid',
};
