/** Test helpers for the save package: the frozen fixtures, manual timers and a store factory. */
import type { ReplayDoc, SaveDoc } from '@/contracts';
import { FixedClock } from '@/contracts/fakes/clock';
import { LocalSaveStore, type LocalSaveStoreOptions, type Timers } from '../store.localStorage';
import { MemoryStorage } from '../storage';
import v1Json from './fixtures/v1.json';
import v14Json from './fixtures/v14.json';
import capsuleLadderPreJson from './fixtures/capsule-ladder-pre.json';

/** A fresh deep copy of the frozen v1 fixture (five ages; migrate it before validating). */
export function v1Fixture(): SaveDoc {
  return JSON.parse(JSON.stringify(v1Json)) as SaveDoc;
}

/** A fresh deep copy of the frozen fixture of the version this build writes (v14: scenes per age). */
export function currentFixture(): SaveDoc {
  return JSON.parse(JSON.stringify(v14Json)) as SaveDoc;
}

/**
 * The v5 doc the capsule ladder migration (v6) is tested on: a half-drawn unsorted bag holding old
 * Aeons (index 4), a pending Win Aeon, a road Aeon, a scripted capsule 5 Aeon, the road summit claimed
 * and 30 capsules opened. Kept outside the `v*.json` glob, which keys fixtures by version.
 */
export function capsuleLadderPreFixture(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(capsuleLadderPreJson)) as Record<string, unknown>;
}

/** Every frozen save fixture by version (`fixtures/v<N>.json`). */
export const SAVE_FIXTURES: Record<number, unknown> = Object.fromEntries(
  Object.entries(import.meta.glob<unknown>('./fixtures/v*.json', { eager: true, import: 'default' })).map(([path, doc]) => [
    Number(/v(\d+)\.json$/.exec(path)?.[1]),
    doc,
  ]),
);

/** WP2's golden replays: real `buildReplay` output (read-only here). */
export function goldenReplays(): ReplayDoc[] {
  const files = import.meta.glob<ReplayDoc>('../../sim/test/golden/*.json', { eager: true, import: 'default' });
  return Object.keys(files)
    .sort()
    .map((k) => JSON.parse(JSON.stringify(files[k])) as ReplayDoc);
}

/** Timers that only fire when the test advances them. */
export class ManualTimers implements Timers {
  private now = 0;
  private nextId = 1;
  private readonly tasks = new Map<number, { at: number; fn: () => void }>();

  set(fn: () => void, ms: number): unknown {
    const id = this.nextId++;
    this.tasks.set(id, { at: this.now + ms, fn });
    return id;
  }

  clear(handle: unknown): void {
    this.tasks.delete(handle as number);
  }

  get pending(): number {
    return this.tasks.size;
  }

  advance(ms: number): void {
    this.now += ms;
    for (const [id, t] of [...this.tasks].sort((a, b) => a[1].at - b[1].at)) {
      if (t.at > this.now) continue;
      this.tasks.delete(id);
      t.fn();
    }
  }
}

export interface TestStore {
  store: LocalSaveStore;
  storage: MemoryStorage;
  timers: ManualTimers;
  clock: FixedClock;
}

/** A store on fresh memory storage, manual timers and a fixed clock (or the given ones). */
export function makeStore(o: Partial<LocalSaveStoreOptions> & { storage?: MemoryStorage } = {}): TestStore {
  const storage = o.storage ?? new MemoryStorage();
  const timers = (o.timers as ManualTimers | undefined) ?? new ManualTimers();
  const clock = (o.clock as FixedClock | undefined) ?? new FixedClock(1_790_010_000_000);
  const store = new LocalSaveStore({ ...o, storage, timers, clock });
  return { store, storage, timers, clock };
}

/** Lets pending promise callbacks run. */
export async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}
