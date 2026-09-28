/**
 * The replay ring (DESIGN B8 `ageborn.replays`, ring of 20; A9 #14). Entries are validated when read
 * back, so a damaged replay is dropped instead of reaching the replay player.
 */
import type { ReplayDoc } from '@/contracts';
import { REPLAY_RING_SIZE, SAVE_KEYS } from './defaults';
import { JsonRing } from './jsonRing';
import { validateReplay } from './replaySchema';
import type { KeyValueStorage } from './storage';

export function createReplayRing(storage: KeyValueStorage, capacity = REPLAY_RING_SIZE): JsonRing<ReplayDoc> {
  return new JsonRing<ReplayDoc>({
    storage,
    key: SAVE_KEYS.replays,
    capacity,
    parse: (x) => {
      const r = validateReplay(x);
      return r.ok ? r.value : null;
    },
  });
}
