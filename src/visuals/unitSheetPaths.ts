/** Where unit sheets live and which ages the boot preload waits for (shared by the manifest and the atlas tier). */
import type { AgeId } from '@/contracts/ids';

/** Ages whose unit sheets the boot preload waits for; the rest load in the background (B16). */
export const BLOCKING_UNIT_SHEET_AGES: readonly AgeId[] = ['stone'];

export function unitSheetSource(age: AgeId, slug: string): string {
  return `art/units/${age}/${slug}.json`;
}

/** Age of a unit sheet from its source path (`art/units/<age>/<slug>.json`), or null. */
export function unitSheetAge(source: string): AgeId | null {
  const m = /art\/units\/(stone|medieval|gunpowder|modern|future)\/[^/]+\.json$/.exec(source);
  return (m?.[1] ?? null) as AgeId | null;
}
