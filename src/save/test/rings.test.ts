import { describe, expect, it } from 'vitest';
import { FixedClock } from '@/contracts/fakes/clock';
import { EventLog } from '@/app/eventLog';
import { EVENT_LOG_CAPACITY, SAVE_KEYS } from '../defaults';
import { EventLogStore, parseEventLogRecord } from '../eventLog';
import { JsonRing } from '../jsonRing';
import { classifyStorageError, isQuotaError, makeQuotaError, MemoryStorage, storageKeys } from '../storage';

const numbers = (storage: MemoryStorage, capacity = 5) =>
  new JsonRing<number>({ storage, key: 'ring', capacity, parse: (x) => (typeof x === 'number' ? x : null) });

describe('JsonRing', () => {
  it('keeps the newest items up to its capacity, oldest first, across instances', () => {
    const storage = new MemoryStorage();
    const ring = numbers(storage);
    for (let i = 1; i <= 8; i += 1) ring.push(i);
    expect(ring.items()).toEqual([4, 5, 6, 7, 8]);
    expect(numbers(storage).items()).toEqual([4, 5, 6, 7, 8]);
  });

  it('drops damaged entries and a damaged key on read', () => {
    const storage = new MemoryStorage();
    storage.setItem('ring', '[1,"x",2,null]');
    const ring = numbers(storage);
    expect(ring.items()).toEqual([1, 2]);
    expect(ring.droppedOnLoad).toBe(2);
    storage.setItem('ring', '{oops');
    expect(numbers(storage).items()).toEqual([]);
  });

  it('halves what it persists on quota errors but keeps the session list', () => {
    const storage = new MemoryStorage();
    const ring = numbers(storage, 8);
    for (let i = 0; i < 8; i += 1) ring.push(1000 + i);
    storage.quota = storage.used() - 12; // two numbers less than it holds
    ring.push(2000);
    expect(ring.items()).toHaveLength(8);
    expect(ring.persisted).toBe(4);
    expect(ring.lastError).toBeNull();
    expect(JSON.parse(storage.getItem('ring')!)).toEqual([1005, 1006, 1007, 2000]);
    // The lowered cap holds for the session, so it does not grab the space back.
    storage.quota = Number.POSITIVE_INFINITY;
    ring.push(3000);
    expect(ring.persisted).toBe(4);
  });

  it('shrink frees space for the save and reports when nothing is left', () => {
    const storage = new MemoryStorage();
    const ring = numbers(storage, 4);
    for (let i = 0; i < 4; i += 1) ring.push(i);
    expect(ring.shrink()).toBe(true);
    expect(ring.persisted).toBe(2);
    expect(ring.shrink()).toBe(true);
    expect(ring.shrink()).toBe(true);
    expect(ring.persisted).toBe(0);
    expect(storage.getItem('ring')).toBeNull();
    expect(ring.shrink()).toBe(false);
  });

  it('clear empties the ring and the key', () => {
    const storage = new MemoryStorage();
    const ring = numbers(storage);
    ring.push(1);
    ring.clear();
    expect(ring.items()).toEqual([]);
    expect(storage.getItem('ring')).toBeNull();
  });

  it('keeps copies, so later changes to a pushed object never leak into the ring', () => {
    const storage = new MemoryStorage();
    const ring = new JsonRing<{ n: number[] }>({ storage, key: 'objs', capacity: 3, parse: (x) => x as { n: number[] } });
    const item = { n: [1] };
    ring.push(item);
    item.n.push(2);
    ring.replace([item]);
    item.n.push(3);
    expect(ring.items()).toEqual([{ n: [1, 2] }]);
    expect(JSON.parse(storage.getItem('objs')!)).toEqual([{ n: [1, 2] }]);
  });

  it('refuses a capacity below 1', () => {
    expect(() => numbers(new MemoryStorage(), 0)).toThrow();
  });
});

describe('EventLogStore (DESIGN A8 Instrumentation, B8 ageborn.eventlog)', () => {
  it('is a ring of 500 records under ageborn.eventlog', () => {
    const storage = new MemoryStorage();
    const log = new EventLogStore(storage);
    for (let i = 0; i < EVENT_LOG_CAPACITY + 3; i += 1) log.record(i, 'beatShown', `b${i}`);
    expect(log.items()).toHaveLength(EVENT_LOG_CAPACITY);
    expect(log.items()[0]).toEqual({ at: 3, kind: 'beatShown', id: 'b3' });
    expect(JSON.parse(storage.getItem(SAVE_KEYS.eventLog)!)).toHaveLength(EVENT_LOG_CAPACITY);
  });

  it('validates records on read', () => {
    expect(parseEventLogRecord({ at: 1, kind: 'k', id: 'i', data: { a: 1, b: 'x', c: true, d: null } })).not.toBeNull();
    expect(parseEventLogRecord({ at: 1, kind: 'k', id: 'i', data: { nested: {} } })).toBeNull();
    expect(parseEventLogRecord({ at: '1', kind: 'k', id: 'i' })).toBeNull();
    expect(parseEventLogRecord([1])).toBeNull();
  });

  it("shares its format with the app's EventLog (WP11), in both directions", () => {
    const storage = new MemoryStorage();
    const appLog = new EventLog({ clock: new FixedClock(7), store: storage });
    appLog.record('matchStart', 'm1', { format: 'tutorial' });
    const mine = new EventLogStore(storage);
    expect(mine.items()).toEqual([{ at: 7, kind: 'matchStart', id: 'm1', data: { format: 'tutorial' } }]);
    mine.record(8, 'matchEnd', 'm1');
    expect(new EventLog({ clock: new FixedClock(9), store: storage }).entries()).toHaveLength(2);
    expect(JSON.parse(mine.exportJson())).toEqual(JSON.parse(new EventLog({ clock: new FixedClock(9), store: storage }).export()));
  });

  it("never writes a stale list over the app EventLog's newer entries on the shared key", () => {
    const storage = new MemoryStorage();
    const appLog = new EventLog({ clock: new FixedClock(1), store: storage });
    const mine = new EventLogStore(storage);
    for (let i = 0; i < 4; i += 1) appLog.record('beatShown', `b${i}`);
    expect(mine.items()).toHaveLength(4); // cached now
    for (let i = 4; i < 8; i += 1) appLog.record('beatShown', `b${i}`);

    expect(mine.shrink()).toBe(true); // the save store frees space: keeps the newest half of all 8
    expect((JSON.parse(storage.getItem(SAVE_KEYS.eventLog)!) as { id: string }[]).map((e) => e.id)).toEqual(['b4', 'b5', 'b6', 'b7']);

    appLog.record('matchStart', 'm1');
    mine.record(2, 'matchEnd', 'm1');
    expect(mine.items().map((e) => e.id).slice(-2)).toEqual(['m1', 'm1']);
    expect(JSON.parse(storage.getItem(SAVE_KEYS.eventLog)!).at(-2)).toMatchObject({ kind: 'matchStart' });
  });

  it('a ring that is the only writer keeps its session list after giving up space', () => {
    const storage = new MemoryStorage();
    const ring = numbers(storage, 8);
    for (let i = 0; i < 8; i += 1) ring.push(i);
    ring.shrink();
    ring.push(8);
    expect(ring.items()).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(JSON.parse(storage.getItem('ring')!)).toEqual([5, 6, 7, 8]);
  });
});

describe('storage helpers', () => {
  it('recognise quota errors from every engine', () => {
    expect(isQuotaError(makeQuotaError())).toBe(true);
    expect(isQuotaError({ name: 'NS_ERROR_DOM_QUOTA_REACHED' })).toBe(true);
    expect(isQuotaError({ code: 22 })).toBe(true);
    expect(isQuotaError({ code: 1014 })).toBe(true);
    expect(isQuotaError(new TypeError('x'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
    expect(classifyStorageError(makeQuotaError())).toBe('quota');
    expect(classifyStorageError(Object.assign(new Error('x'), { name: 'SecurityError' }))).toBe('unavailable');
    expect(classifyStorageError('weird')).toBe('other');
  });

  it('MemoryStorage counts UTF-16 units like browsers and enforces its quota', () => {
    const s = new MemoryStorage({ quota: 10 });
    s.setItem('ab', 'cdef');
    expect(s.used()).toBe(6);
    expect(() => s.setItem('x', 'yyyyy')).toThrow(/quota/);
    s.setItem('ab', 'cdefghij'); // replacing counts only the new value
    expect(s.used()).toBe(10);
    expect(storageKeys(s)).toEqual(['ab']);
    expect(storageKeys({ getItem: () => null, setItem: () => {}, removeItem: () => {} })).toEqual([]);
  });
});
