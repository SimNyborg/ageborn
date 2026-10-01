/**
 * Last Base Standing on the frozen fixture (A2.10.1; SIM_VERSION 6.0.0): the fixture's five ages with the
 * live step values on a compressed clock (Overdrive 3:00, Siege I-III at 4:00, 5:00, 6:00, Crumble at
 * 7:00, Crumble II at 8:00). It has its own content hash, so goldens 01-14 keep the frozen fixture's.
 *
 * Shared by the sim's unit tests and golden 15 (`src/sim/test/helpers.ts`) and the cross-engine
 * determinism spec (`tests/e2e/determinism/entry.ts`), which picks the content by the replay's hash.
 * Test data only: nothing in the shipped game imports it.
 */
import { raw } from './content';
import type { RawContent } from './content/types';

const MIN = 60000;

export const LAST_STEPS = [
  { atMs: 4 * MIN, baseDamageBp: 20000, turretDamageBp: 5000, crumbleBpPerSec: 0 },
  { atMs: 5 * MIN, baseDamageBp: 30000, turretDamageBp: 3500, crumbleBpPerSec: 0 },
  { atMs: 6 * MIN, baseDamageBp: 40000, turretDamageBp: 2500, crumbleBpPerSec: 0 },
  { atMs: 7 * MIN, baseDamageBp: 40000, turretDamageBp: 2500, crumbleBpPerSec: 50 },
  { atMs: 8 * MIN, baseDamageBp: 40000, turretDamageBp: 2500, crumbleBpPerSec: 100 },
] as const;

/** 7:00 + 60 s at 0.5 points/s (3,000 of 20,000 bp) + 170 s at 1 point/s: 10:50. */
export const LAST_END_BY_MS = 650000;

/** The frozen fixture plus a `last` format (raw; compile it with the sim's `compileForSim`). */
export const rawLast: RawContent = {
  ...raw,
  formats: {
    ...raw.formats,
    last: {
      ...(raw.formats['full'] as NonNullable<(typeof raw.formats)['full']>),
      id: 'last',
      kind: 'untimed',
      overdriveMs: 3 * MIN,
      siegeMs: 4 * MIN,
      finalBellMs: null,
      escalation: LAST_STEPS.map((x) => ({ ...x })),
      endByMs: LAST_END_BY_MS,
    },
  },
};
