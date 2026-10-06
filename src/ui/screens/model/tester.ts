/**
 * The test profile mark (owner request 2026-10-06): a save written by the `?tester=1` dialog (the app's
 * `tester.ts`) carries this flag, and Settings shows a "Test profile" chip so it is never mistaken for
 * real progress.
 */
import type { SaveDoc } from '@/contracts';

export const TESTER_PROFILE_FLAG = 'tester.profile';

export function isTesterProfile(save: Pick<SaveDoc, 'flags'>): boolean {
  return save.flags[TESTER_PROFILE_FLAG] === true;
}
