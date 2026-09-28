import { describe, expect, it, vi } from 'vitest';
import { attachFlushHooks, browserStorage, createBrowserSaveStore } from '../browser';
import { makeQuotaError, MemoryStorage } from '../storage';

class FakeDocument extends EventTarget {
  visibilityState: DocumentVisibilityState = 'visible';
  hide(): void {
    this.visibilityState = 'hidden';
    this.dispatchEvent(new Event('visibilitychange'));
  }
  show(): void {
    this.visibilityState = 'visible';
    this.dispatchEvent(new Event('visibilitychange'));
  }
}

describe('attachFlushHooks (DESIGN B8: flush on visibilitychange hidden and pagehide)', () => {
  it('flushes when the page is hidden or unloaded, not when it becomes visible', () => {
    const doc = new FakeDocument();
    const win = new EventTarget();
    const store = { flush: vi.fn() };
    const detach = attachFlushHooks(store, { document: doc as unknown as Document, window: win as unknown as Window });
    doc.show();
    expect(store.flush).toHaveBeenCalledTimes(0);
    doc.hide();
    expect(store.flush).toHaveBeenCalledTimes(1);
    win.dispatchEvent(new Event('pagehide'));
    expect(store.flush).toHaveBeenCalledTimes(2);
    detach();
    doc.hide();
    win.dispatchEvent(new Event('pagehide'));
    expect(store.flush).toHaveBeenCalledTimes(2);
  });

  it('works without a document or window (Node)', () => {
    expect(() => attachFlushHooks({ flush: () => {} }, {})()).not.toThrow();
  });
});

describe('browserStorage', () => {
  it('uses localStorage when it works and leaves no probe behind', () => {
    const ls = new MemoryStorage();
    const r = browserStorage({ localStorage: ls });
    expect(r).toEqual({ storage: ls, available: true });
    expect(ls.length).toBe(0);
  });

  it('keeps a full localStorage (loading works; the quota problem shows on write)', () => {
    const ls = new MemoryStorage();
    ls.setItem('ageborn.save.A', 'x');
    ls.quota = ls.used();
    expect(browserStorage({ localStorage: ls })).toEqual({ storage: ls, available: true });
  });

  it('falls back to memory when storage is blocked', () => {
    const blockedGetter = {
      get localStorage(): MemoryStorage {
        const e = new Error('denied');
        e.name = 'SecurityError';
        throw e;
      },
    };
    const a = browserStorage(blockedGetter);
    expect(a.available).toBe(false);
    expect(a.storage).toBeInstanceOf(MemoryStorage);

    const writeBlocked = { getItem: () => null, removeItem: () => {}, setItem: () => { throw new TypeError('blocked'); } };
    expect(browserStorage({ localStorage: writeBlocked }).available).toBe(false);
    expect(browserStorage(undefined).available).toBe(false);
  });

  it('recognises quota errors from every engine', () => {
    const quotaOnly = { getItem: () => null, removeItem: () => {}, setItem: () => { throw makeQuotaError(); } };
    expect(browserStorage({ localStorage: quotaOnly }).available).toBe(true);
  });

  it('counts an empty storage that refuses even the probe as blocked (old Safari private browsing)', () => {
    const noRoom = new MemoryStorage({ quota: 0 });
    const r = browserStorage({ localStorage: noRoom });
    expect(r.available).toBe(false);
    expect(r.storage).not.toBe(noRoom);
  });
});

describe('createBrowserSaveStore', () => {
  it('builds a store on the given storage and reports blocked storage', async () => {
    const storage = new MemoryStorage();
    const store = createBrowserSaveStore({ storage });
    expect(store.storage).toBe(storage);
    expect(store.problem).toBeNull();
    expect(await store.load()).toBeNull();

    const blocked = createBrowserSaveStore({ storage: new MemoryStorage(), storageUnavailable: true });
    expect(blocked.problem?.kind).toBe('unavailable');
  });
});
