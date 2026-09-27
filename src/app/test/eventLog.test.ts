import { describe, expect, it } from 'vitest';
import { FixedClock } from '@/contracts/fakes/clock';
import { EVENT_LOG_KEY, EventLog, MemoryKeyValueStore, type KeyValueStore } from '../eventLog';

describe('onboarding event log (A8 instrumentation, B8)', () => {
  it('keeps the newest 500 events and survives a reload', () => {
    const clock = new FixedClock(1000);
    const store = new MemoryKeyValueStore();
    const log = new EventLog({ clock, store });
    for (let i = 0; i < 510; i += 1) {
      clock.advance(1);
      log.record('beatShown', `b${i}`, { tick: i });
    }
    expect(log.entries()).toHaveLength(500);
    expect(log.entries()[0]).toEqual({ at: 1011, kind: 'beatShown', id: 'b10', data: { tick: 10 } });
    const again = new EventLog({ clock, store });
    expect(again.entries()).toEqual(log.entries());
    expect(JSON.parse(again.export())).toMatchObject({ kind: 'ageborn.eventlog', v: 1 });
    again.clear();
    expect(store.getItem(EVENT_LOG_KEY)).toBeNull();
  });

  it('ignores corrupt stored data and keeps working when storage is full', () => {
    const clock = new FixedClock();
    const store = new MemoryKeyValueStore();
    store.setItem(EVENT_LOG_KEY, '{not json');
    expect(new EventLog({ clock, store }).entries()).toEqual([]);
    store.setItem(EVENT_LOG_KEY, JSON.stringify([{ at: 1, kind: 'x', id: 'y' }, { bogus: true }]));
    expect(new EventLog({ clock, store }).entries()).toEqual([{ at: 1, kind: 'x', id: 'y' }]);
    const full: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const log = new EventLog({ clock, store: full });
    log.record('boot', 'app');
    expect(log.entries()).toHaveLength(1);
    expect(log.storageError).toBe('QuotaExceededError');
  });
});
