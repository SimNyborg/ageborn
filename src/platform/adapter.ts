/**
 * Game portal adapters (DESIGN B11, B15 `platform.ts`).
 *
 * v1 ships only `none` (no ads, no SDK, `reelReveal: true`). Poki, CrazyGames and Y8 adapters come
 * later and plug in here without touching the app: the app asks `createPlatform(name)` for an adapter
 * and only ever talks to the `PlatformAdapter` contract.
 *
 * Layering (B2): `platform` imports only `contracts`.
 */
import type { PlatformAdapter } from '@/contracts';
import { NonePlatform } from './none';

export type { PlatformAdapter };

/** Adapter names known to this build. Later portals add their names here. */
export const PLATFORM_NAMES = ['none'] as const;
export type PlatformName = (typeof PLATFORM_NAMES)[number];

/** True when `name` is an adapter this build ships. */
export function isPlatformName(name: string | null | undefined): name is PlatformName {
  return name !== null && name !== undefined && (PLATFORM_NAMES as readonly string[]).includes(name);
}

/** Creates the adapter for `name`. Unknown names fall back to `none` (v1 ships nothing else). */
export function createPlatform(name: string | null | undefined = 'none'): PlatformAdapter {
  switch (isPlatformName(name) ? name : 'none') {
    case 'none':
    default:
      return new NonePlatform();
  }
}
