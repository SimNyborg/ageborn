/**
 * The eight ages (DESIGN A17.8 P, base HP and thresholds; A2.2, A2.4, A2.5 mechanics, A14.1 visual ids,
 * A14.3 music cues). The numbers come from `raw/economy.ts` (`ageScale`); this module adds the
 * palette, visual and music ids. Ages are data: a sixth age needs only content, visuals and audio
 * entries (A2.5).
 */
import type { AgeDef } from '@/contracts/content';
import type { AgeId } from '@/contracts/ids';
import type { RawAgeScale } from './raw';

/** Stone to Cosmic (A17.8). */
export const AGE_ORDER: readonly AgeId[] = ['stone', 'bronze', 'medieval', 'gunpowder', 'industrial', 'modern', 'future', 'cosmic'];

/** The ages a raw scale table defines, in {@link AGE_ORDER} (older raw copies may lack the A17 ages). */
export function agesIn(scale: Partial<Record<AgeId, RawAgeScale>>): AgeId[] {
  return AGE_ORDER.filter((id) => scale[id] !== undefined);
}

/** Adds the per-age palette, base, backdrop and music ids to the raw numbers (A14.1, A14.3). */
export function buildAges(scale: Partial<Record<AgeId, RawAgeScale>>): Record<AgeId, AgeDef> {
  const out = {} as Record<AgeId, AgeDef>;
  for (const id of agesIn(scale)) {
    const s = scale[id] as RawAgeScale;
    out[id] = {
      id: s.id,
      index: s.index,
      pBp: s.pBp,
      baseHp: s.baseHp,
      xpToNext: s.xpToNext,
      paletteId: `palette.${id}`,
      baseVisualId: `base.${id}`,
      backdropVisualId: `backdrop.${id}`,
      musicCue: `music.${id}`,
    };
  }
  return out;
}
