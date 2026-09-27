/**
 * The five v1 ages (DESIGN A2.2 P and base HP, A2.4 thresholds, A2.5 mechanics, A14.1 visual ids,
 * A14.3 music cues). The numbers come from `raw/economy.ts` (`ageScale`); this module adds the
 * palette, visual and music ids. Ages are data: a sixth age needs only content, visuals and audio
 * entries (A2.5).
 */
import type { AgeDef } from '@/contracts/content';
import type { AgeId } from '@/contracts/ids';
import type { RawAgeScale } from './raw';

/** Stone to Future (A2.2). */
export const AGE_ORDER: readonly AgeId[] = ['stone', 'medieval', 'gunpowder', 'modern', 'future'];

/** Adds the per-age palette, base, backdrop and music ids to the raw numbers (A14.1, A14.3). */
export function buildAges(scale: Record<AgeId, RawAgeScale>): Record<AgeId, AgeDef> {
  const out = {} as Record<AgeId, AgeDef>;
  for (const id of AGE_ORDER) {
    const s = scale[id];
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
