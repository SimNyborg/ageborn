/**
 * The v1 `SaveStore`: localStorage with two alternating checksummed slots (DESIGN B8).
 *
 * - **Load** (B8 Load order): read both slots, take the newest valid checksum, migrate it (writing
 *   `ageborn.backup.pre-v<N>` before each step), validate it; if that fails fall back to the other
 *   slot, then to "no save" (`null`: the app creates a fresh save and shows the unreadable banner
 *   from `loadReport.notice`). Rejected copies are set aside in `ageborn.backup.unreadable` first
 *   (`unreadable.ts`), so a repairable save is never destroyed by the fresh one.
 * - **Save** (B8 Writes): the doc is validated and serialized at once, then written 2 s after the
 *   first unsaved change (later saves in that window replace the payload but do not postpone it),
 *   right away with `{ immediate: true }` (after a capsule roll or upgrade) and on `flush()`, which
 *   the browser hooks call on `visibilitychange` (hidden) and `pagehide`.
 * - **Quota** (B8 Durability): a full storage first gives up replay and event log space; if the save
 *   still does not fit, the problem is reported through `onProblem` and `problem` with an i18n key.
 * - **Newer builds**: a slot written by a newer build (an old cached page after an update) is never
 *   overwritten: the store stops writing and reports `tooNew` until the page is reloaded. This holds
 *   even when `save()` runs before `load()`.
 *
 * The storage, clock and timers are injected, so the whole store runs in Node tests.
 */
import type { Clock, ReplayDoc, SaveDoc, SaveStore } from '@/contracts';
import {
  EVENT_LOG_CAPACITY,
  preMigrationBackupKey,
  REPLAY_RING_SIZE,
  SAVE_DEBOUNCE_MS,
  SAVE_KEYS,
  SLOT_KEYS,
  UNREADABLE_BACKUP_KEY,
  type SlotId,
} from './defaults';
import { EventLogStore } from './eventLog';
import { encodeSaveCode, importSaveCode, saveFileFor, type ImportResult, type SaveFile } from './exportImport';
import type { JsonRing } from './jsonRing';
import { migrate, SAVE_VERSION, SAVE_VERSIONS, type SaveVersion } from './migrations';
import { saveNotice, type SaveNotice, type SaveProblemKind } from './notices';
import { createReplayRing } from './replays';
import { validateSaveDoc } from './schema';
import { encodeEnvelope, newestFirst, otherSlot, readSlots, type SlotDefect, type SlotRead } from './slots';
import { classifyStorageError, storageKeys, type KeyValueStorage, type StorageFailure } from './storage';
import { keepUnreadableCopies } from './unreadable';

/** Timer functions (injected so tests control time). */
export interface Timers {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

export const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (h) => clearTimeout(h as ReturnType<typeof setTimeout>),
};

const systemClock: Clock = { now: () => Date.now() };

export interface LocalSaveStoreOptions {
  storage: KeyValueStorage;
  clock?: Clock;
  timers?: Timers;
  /** Default 2,000 ms (DESIGN B8). */
  debounceMs?: number;
  /** Version chain (tests pass synthetic chains). Default `SAVE_VERSIONS`. */
  versions?: readonly SaveVersion[];
  replayCapacity?: number;
  eventLogCapacity?: number;
  /**
   * Set when `storage` is an in-memory stand-in because the browser blocks localStorage: the store
   * reports the `unavailable` problem from the start.
   */
  storageUnavailable?: boolean;
}

/** What happened to one slot during `load()`. */
export type SlotOutcome =
  | SlotDefect
  /** Passed every check and was loaded. */
  | 'loaded'
  /** Valid checksum but not needed (an older copy while the newer one loaded). */
  | 'unused'
  | 'notASave'
  | 'badVersion'
  | 'tooNew'
  | 'migrationFailed'
  | 'invalid';

export interface SlotReport {
  slot: SlotId;
  outcome: SlotOutcome;
  /** From the envelope, when the checksum was valid. */
  writtenAt?: number;
  /** The doc's own `v`, when it has one. */
  version?: number;
  detail?: string;
}

export interface LoadReport {
  /**
   * `empty`: nothing stored (first run). `loaded`: the newest copy loaded (an older copy may be
   * damaged; it is replaced by the next write). `recovered`: a copy that was or may have been newer
   * was rejected and an older one loaded, so recent progress may be missing. `unreadable`: nothing
   * could be loaded.
   */
  status: 'empty' | 'loaded' | 'recovered' | 'unreadable';
  slot: SlotId | null;
  /** The loaded doc's stored version (before migration). */
  fromVersion: number | null;
  migrated: boolean;
  slots: SlotReport[];
  /**
   * The message to show the player after loading: `recovered`, `unreadable` or `tooNew` (the last
   * is also the ongoing `problem`, because it blocks writes).
   */
  notice: SaveNotice | null;
}

type ProblemListener = (problem: SaveNotice | null) => void;

/** Rejections that happen after a valid checksum: the text is a real save this build cannot use. */
const KEEP_ASIDE: ReadonlySet<SlotOutcome> = new Set(['tooNew', 'invalid', 'migrationFailed', 'notASave', 'badVersion']);

const WRITE_PROBLEM: Record<StorageFailure, SaveProblemKind> = {
  quota: 'quota',
  unavailable: 'unavailable',
  other: 'writeFailed',
};

export class LocalSaveStore implements SaveStore {
  /** The storage this store writes to (the app's event log may share it). */
  readonly storage: KeyValueStorage;
  /** The replay ring, `ageborn.replays`. */
  readonly replays: JsonRing<ReplayDoc>;
  /** The onboarding event log, `ageborn.eventlog`. */
  readonly eventLog: EventLogStore;

  private readonly clock: Clock;
  private readonly timers: Timers;
  private readonly debounceMs: number;
  private readonly versions: readonly SaveVersion[];
  private readonly version: number;
  private readonly storageUnavailable: boolean;

  /** Slot the next write goes to; null until the slots have been scanned. */
  private nextSlot: SlotId | null = null;
  /** `writtenAt` of the newest slot; writes stay strictly after it even if the clock goes back. */
  private lastWrittenAt = Number.NEGATIVE_INFINITY;
  private pendingPayload: string | null = null;
  private waiters: (() => void)[] = [];
  private timer: unknown = null;
  private currentProblem: SaveNotice | null = null;
  private readonly listeners = new Set<ProblemListener>();
  private report: LoadReport | null = null;
  private savedAt: number | null = null;
  private writes = 0;
  /** Set when a slot holds a save from a newer build: this build must not overwrite it. */
  private blocked = false;

  constructor(o: LocalSaveStoreOptions) {
    this.storage = o.storage;
    this.clock = o.clock ?? systemClock;
    this.timers = o.timers ?? realTimers;
    this.debounceMs = o.debounceMs ?? SAVE_DEBOUNCE_MS;
    this.versions = o.versions ?? SAVE_VERSIONS;
    this.version = this.versions[this.versions.length - 1]?.v ?? SAVE_VERSION;
    this.storageUnavailable = o.storageUnavailable ?? false;
    this.replays = createReplayRing(this.storage, o.replayCapacity ?? REPLAY_RING_SIZE);
    this.eventLog = new EventLogStore(this.storage, o.eventLogCapacity ?? EVENT_LOG_CAPACITY);
    if (this.storageUnavailable) this.currentProblem = saveNotice('unavailable', 'localStorage is blocked; using memory');
  }

  // -------------------------------------------------------------------------------------------
  // Load
  // -------------------------------------------------------------------------------------------

  async load(): Promise<SaveDoc | null> {
    return this.loadNow();
  }

  /** `load()` without the promise (boot code and tests may prefer it). */
  loadNow(): SaveDoc | null {
    this.flush();
    const reads = readSlots(this.storage);
    const slots: SlotReport[] = reads.map((r) =>
      r.ok ? { slot: r.slot, outcome: 'unused', writtenAt: r.envelope.writtenAt, ...versionOf(r.doc) } : { slot: r.slot, outcome: r.defect },
    );
    const reportOf = (slot: SlotId): SlotReport => slots.find((s) => s.slot === slot)!;
    const candidates = newestFirst(reads);
    this.lastWrittenAt = candidates[0]?.envelope.writtenAt ?? Number.NEGATIVE_INFINITY;

    let doc: SaveDoc | null = null;
    let chosen: SlotId | null = null;
    let fromVersion: number | null = null;
    let skippedNewer = false;
    for (const c of candidates) {
      const rep = reportOf(c.slot);
      const migrated = migrate(c.doc, {
        versions: this.versions,
        beforeStep: (d, from, to) => this.writeBackup(preMigrationBackupKey(to), d, from),
      });
      if (!migrated.ok) {
        rep.outcome = migrated.reason;
        if (migrated.detail) rep.detail = migrated.detail;
        skippedNewer = true;
        continue;
      }
      const valid = validateSaveDoc(migrated.doc, this.version);
      if (!valid.ok) {
        rep.outcome = 'invalid';
        rep.detail = valid.issues.join('; ');
        skippedNewer = true;
        continue;
      }
      rep.outcome = 'loaded';
      doc = valid.value;
      chosen = c.slot;
      fromVersion = migrated.from;
      break;
    }

    let status: LoadReport['status'];
    if (chosen !== null) {
      const loadedAt = candidates.find((c) => c.slot === chosen)!.envelope.writtenAt;
      const otherMaybeNewer = reads.some((r) => r.slot !== chosen && damagedMaybeNewer(r, loadedAt));
      status = skippedNewer || otherMaybeNewer ? 'recovered' : 'loaded';
      this.nextSlot = otherSlot(chosen);
    } else {
      status = reads.some((r) => r.raw !== null) ? 'unreadable' : 'empty';
      this.nextSlot = 'A';
    }

    // Copies that were rejected but may hold real progress are set aside before any write can
    // replace them: everything when nothing loaded, else the ones with a valid checksum.
    const now = this.clock.now();
    const aside = reads
      .filter((r) => r.raw !== null && (chosen === null || KEEP_ASIDE.has(reportOf(r.slot).outcome)))
      .map((r) => ({ at: now, source: describeSlot(reportOf(r.slot)), raw: r.raw! }));
    if (aside.length > 0) keepUnreadableCopies(this.storage, aside);

    // A save from a newer build must survive this (older, probably cached) build: no writes at all.
    this.blocked = slots.some((s) => s.outcome === 'tooNew');
    const detail = slots.map(describeSlot).join('; ');
    let notice: SaveNotice | null = null;
    if (this.blocked) notice = saveNotice('tooNew', detail);
    else if (status === 'recovered' || status === 'unreadable') notice = saveNotice(status, detail);
    this.report = {
      status,
      slot: chosen,
      fromVersion,
      migrated: fromVersion !== null && fromVersion !== this.version,
      slots,
      notice,
    };
    if (notice?.ongoing) this.setProblem(notice);
    else {
      if (this.currentProblem?.kind === 'tooNew') this.setProblem(null);
      if (notice) this.emit(notice);
    }
    return doc;
  }

  /** The outcome of the last `load()`, or null before the first. */
  get loadReport(): LoadReport | null {
    return this.report;
  }

  // -------------------------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------------------------

  /**
   * Validates and serializes `doc` now; writes it after the debounce, or at once with `immediate`.
   * The promise resolves once the write has been attempted (check `problem` for the outcome); it
   * never rejects.
   */
  save(doc: SaveDoc, o?: { immediate?: boolean }): Promise<void> {
    const valid = validateSaveDoc(doc, this.version);
    if (!valid.ok) {
      // Keep the last good save on disk rather than writing one that could not be loaded again.
      this.setProblem(saveNotice('invalidDoc', valid.issues.join('; ')));
      return Promise.resolve();
    }
    this.pendingPayload = JSON.stringify(valid.value);
    const done = new Promise<void>((resolve) => this.waiters.push(resolve));
    if (o?.immediate) this.flush();
    else if (this.timer === null) {
      this.timer = this.timers.set(() => {
        this.timer = null;
        this.flush();
      }, this.debounceMs);
    }
    return done;
  }

  /**
   * Writes the pending save now (visibility and pagehide hooks, before load, on dispose). A write
   * that failed stays pending and is retried by the next flush.
   */
  flush(): void {
    if (this.timer !== null) {
      this.timers.clear(this.timer);
      this.timer = null;
    }
    const payload = this.pendingPayload;
    if (payload !== null && this.writePayload(payload)) this.pendingPayload = null;
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w();
  }

  /** True while a save waits for its debounce or for a retry after a failed write. */
  get hasPendingWrite(): boolean {
    return this.pendingPayload !== null;
  }

  /** `writtenAt` of the last successful write in this session. */
  get lastSavedAt(): number | null {
    return this.savedAt;
  }

  /** Successful slot writes in this session (dev page, tests). */
  get writeCount(): number {
    return this.writes;
  }

  /** The slot the next write goes to (dev page, tests). */
  get nextWriteSlot(): SlotId {
    return this.ensureScanned();
  }

  // -------------------------------------------------------------------------------------------
  // Problems
  // -------------------------------------------------------------------------------------------

  /** The ongoing save problem (progress is not being saved), or null. */
  get problem(): SaveNotice | null {
    return this.currentProblem;
  }

  /**
   * Called with every new problem notice (ongoing ones and the load notices) and with null once an
   * ongoing problem clears. Returns the unsubscribe function.
   */
  onProblem(cb: ProblemListener): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // -------------------------------------------------------------------------------------------
  // Export / import
  // -------------------------------------------------------------------------------------------

  exportCode(doc: SaveDoc): string {
    return encodeSaveCode(doc);
  }

  /** Decodes, migrates and validates (DESIGN B8). Does not store anything: the app saves the result. */
  importCode(code: string): ImportResult {
    return importSaveCode(code, { versions: this.versions });
  }

  /** The `.ageborn` download for `doc` (the browser helper `downloadSaveFile` saves it). */
  exportFile(doc: SaveDoc): SaveFile {
    return saveFileFor(doc, this.clock.now());
  }

  /** Imports the text of a `.ageborn` file (the same code as `exportCode`). */
  importFile(text: string): ImportResult {
    return this.importCode(text);
  }

  // -------------------------------------------------------------------------------------------
  // Replays
  // -------------------------------------------------------------------------------------------

  /** The last 20 replays, oldest first (validated when read back). */
  loadReplays(): ReplayDoc[] {
    return [...this.replays.items()];
  }

  pushReplay(r: ReplayDoc): void {
    this.replays.push(r);
  }

  // -------------------------------------------------------------------------------------------
  // Reset
  // -------------------------------------------------------------------------------------------

  /**
   * Deletes the profile from this device (Settings > Reset progress): both slots, every backup and
   * the replays, and cancels any pending write. The event log is playtest instrumentation, not
   * progress, and is kept unless `eventLog` is true.
   */
  reset(o: { eventLog?: boolean } = {}): void {
    if (this.timer !== null) this.timers.clear(this.timer);
    this.timer = null;
    this.pendingPayload = null;
    const keys = new Set<string>([SLOT_KEYS.A, SLOT_KEYS.B, UNREADABLE_BACKUP_KEY]);
    for (const ver of this.versions) keys.add(preMigrationBackupKey(ver.v));
    for (const k of storageKeys(this.storage)) if (k.startsWith(SAVE_KEYS.backupPrefix)) keys.add(k);
    for (const k of keys) {
      try {
        this.storage.removeItem(k);
      } catch {
        // Storage unavailable: nothing stored to remove.
      }
    }
    this.replays.clear();
    if (o.eventLog) this.eventLog.clear();
    this.nextSlot = 'A';
    this.lastWrittenAt = Number.NEGATIVE_INFINITY;
    this.blocked = false;
    this.report = null;
    this.savedAt = null;
    if (this.currentProblem && this.currentProblem.kind !== 'unavailable') this.setProblem(null);
    const waiters = this.waiters;
    this.waiters = [];
    for (const w of waiters) w();
  }

  /** Writes anything pending; call before dropping the store. */
  dispose(): void {
    this.flush();
    this.listeners.clear();
  }

  // -------------------------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------------------------

  /** Finds the next slot when `save()` runs before `load()` (tests, tools, a misordered boot). */
  private ensureScanned(): SlotId {
    if (this.nextSlot !== null) return this.nextSlot;
    const valid = newestFirst(readSlots(this.storage));
    const newest = valid[0];
    this.nextSlot = newest ? otherSlot(newest.slot) : 'A';
    this.lastWrittenAt = newest?.envelope.writtenAt ?? Number.NEGATIVE_INFINITY;
    // Without a load nothing has checked the versions yet; a newer build's save must still survive.
    const newer = valid.filter((r) => (versionOf(r.doc).version ?? 0) > this.version);
    if (newer.length > 0) {
      this.blocked = true;
      this.setProblem(saveNotice('tooNew', newer.map((r) => `${r.slot}: v${versionOf(r.doc).version} > v${this.version}`).join('; ')));
    }
    return this.nextSlot;
  }

  /** Writes one payload to the next slot, freeing ring space on quota errors. */
  private writePayload(payload: string): boolean {
    const slot = this.ensureScanned();
    if (this.blocked) return false;
    const writtenAt = Math.max(this.clock.now(), this.lastWrittenAt + 1);
    const text = encodeEnvelope(payload, this.version, writtenAt);
    let failure = this.tryWrite(SLOT_KEYS[slot], text);
    while (failure === 'quota' && (this.replays.shrink() || this.eventLog.shrink())) {
      failure = this.tryWrite(SLOT_KEYS[slot], text);
    }
    if (failure !== null) {
      this.setProblem(saveNotice(WRITE_PROBLEM[failure], `writing slot ${slot} (${text.length} chars)`));
      return false;
    }
    this.nextSlot = otherSlot(slot);
    this.lastWrittenAt = writtenAt;
    this.savedAt = writtenAt;
    this.writes += 1;
    if (this.currentProblem && (this.currentProblem.kind !== 'unavailable' || !this.storageUnavailable)) this.setProblem(null);
    return true;
  }

  private tryWrite(key: string, text: string): StorageFailure | null {
    try {
      this.storage.setItem(key, text);
      return null;
    } catch (e) {
      return classifyStorageError(e);
    }
  }

  /** `ageborn.backup.pre-v<N>`: kept once (the first, most original copy wins); best effort. */
  private writeBackup(key: string, doc: unknown, version: number): void {
    try {
      if (this.storage.getItem(key) !== null) return;
      this.storage.setItem(key, encodeEnvelope(JSON.stringify(doc), version, this.clock.now()));
    } catch {
      // A backup that does not fit must not stop the load.
    }
  }

  private setProblem(n: SaveNotice | null): void {
    const was = this.currentProblem;
    this.currentProblem = n;
    if (n === null && was === null) return;
    this.emit(n);
  }

  private emit(n: SaveNotice | null): void {
    for (const cb of this.listeners) {
      try {
        cb(n);
      } catch {
        // A failing listener must not break saving.
      }
    }
  }
}

function versionOf(doc: unknown): { version?: number } {
  const ver = doc !== null && typeof doc === 'object' ? (doc as { v?: unknown }).v : undefined;
  return typeof ver === 'number' ? { version: ver } : {};
}

/** `A: invalid (activePlan: …)`: one slot's outcome for notices, the dev page and kept copies. */
function describeSlot(s: SlotReport): string {
  return `${s.slot}: ${s.outcome}${s.detail ? ` (${s.detail})` : ''}`;
}

/**
 * True when a slot that failed before migration (damaged text or payload) may have held newer
 * progress than the copy that loaded. A payload that failed its checksum still shows the time it was
 * written; if that is older than the loaded copy, nothing was lost and the player is not alarmed.
 * Unparsable text has no time, so it may have been the newer copy.
 */
function damagedMaybeNewer(r: SlotRead, loadedAt: number): boolean {
  if (r.ok || r.defect === 'missing') return false;
  if (r.defect === 'checksum' && r.writtenAt !== undefined) return r.writtenAt >= loadedAt;
  return true;
}
