/**
 * Browser wiring for the save store (DESIGN B8): localStorage with a memory fallback, the flush
 * hooks on `visibilitychange` (hidden) and `pagehide`, and the `.ageborn` file download and upload.
 *
 * Nothing here touches browser globals at import time, so the module also loads in Node tests.
 */
import type { SaveFile } from './exportImport';
import { LocalSaveStore, type LocalSaveStoreOptions } from './store.localStorage';
import { isQuotaError, MemoryStorage, type KeyValueStorage } from './storage';

const PROBE_KEY = 'ageborn.probe';

/**
 * localStorage when the browser allows it. Storage that is blocked (disabled site data, some
 * private modes, sandboxed frames) throws on access or on every write; the game then runs on an
 * in-memory stand-in and the store reports `unavailable`. A storage that is merely full is still
 * used: loading works and the quota problem shows up on the first write.
 */
export function browserStorage(win: { localStorage: KeyValueStorage } | undefined = typeof window !== 'undefined' ? window : undefined): {
  storage: KeyValueStorage;
  available: boolean;
} {
  let ls: KeyValueStorage | undefined;
  try {
    ls = win?.localStorage;
    if (!ls) return { storage: new MemoryStorage(), available: false };
    ls.setItem(PROBE_KEY, '1');
    ls.removeItem(PROBE_KEY);
    return { storage: ls, available: true };
  } catch (e) {
    if (ls && isQuotaError(e)) return { storage: ls, available: true };
    return { storage: new MemoryStorage(), available: false };
  }
}

export interface FlushTargets {
  document?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'>;
  window?: Pick<Window, 'addEventListener' | 'removeEventListener'>;
}

/**
 * Flushes pending writes when the page is hidden or unloaded (DESIGN B8 Writes). Mobile browsers may
 * kill a hidden tab without further events, so `visibilitychange` is the one that matters most.
 * Returns the function that removes the hooks.
 */
export function attachFlushHooks(
  store: { flush(): void },
  t: FlushTargets = {
    document: typeof document !== 'undefined' ? document : undefined,
    window: typeof window !== 'undefined' ? window : undefined,
  },
): () => void {
  const doc = t.document;
  const onVisibility = (): void => {
    if (doc?.visibilityState === 'hidden') store.flush();
  };
  const onPageHide = (): void => store.flush();
  doc?.addEventListener('visibilitychange', onVisibility);
  t.window?.addEventListener('pagehide', onPageHide);
  return () => {
    doc?.removeEventListener('visibilitychange', onVisibility);
    t.window?.removeEventListener('pagehide', onPageHide);
  };
}

/**
 * The store the game uses in the browser: localStorage (or the memory stand-in), real clock and
 * timers, and the flush hooks attached for the page's lifetime.
 */
export function createBrowserSaveStore(o: Partial<LocalSaveStoreOptions> = {}): LocalSaveStore {
  const { storage, available } = o.storage ? { storage: o.storage, available: true } : browserStorage();
  const store = new LocalSaveStore({ ...o, storage, storageUnavailable: o.storageUnavailable ?? !available });
  attachFlushHooks(store);
  return store;
}

/** Starts the download of a `.ageborn` file (Settings > Download save file). */
export function downloadSaveFile(file: SaveFile, doc: Document = document): void {
  const url = URL.createObjectURL(new Blob([file.text], { type: file.mime }));
  const a = doc.createElement('a');
  a.href = url;
  a.download = file.name;
  a.rel = 'noopener';
  a.style.display = 'none';
  doc.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke later: some browsers read the URL after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Reads a picked `.ageborn` file as text, for `store.importFile`. */
export function readSaveFile(file: Blob): Promise<string> {
  return file.text();
}
