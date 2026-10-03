/**
 * The release gate in the AI (docs/decisions.md, "Release gate for unfinished content"): a bot's Fort
 * card and its age predictions never name a card held back with `released: false`.
 */
import { describe, expect, it } from 'vitest';
import type { AgeId } from '@/contracts';
import { content } from '@/content';
import { botFortCard } from '@/ai';
import { PAUSED_WAVE_IDS } from '../../../tests/fixtures/pausedWave';
import { cardBook } from '../book';

describe('release gate (AI)', () => {
  it('botFortCard never picks a held-back fort, for any General, tier and age', () => {
    for (const generalId of [...content.generals.order, 'commander:rook:bonker']) {
      for (let tier = 0; tier <= content.arenas.ladder.maxTier; tier += 1) {
        for (const age of content.order.ages as AgeId[]) {
          const id = botFortCard(content, age, { generalId, tier });
          expect(id !== null && PAUSED_WAVE_IDS.has(id), `${generalId} ${tier} ${age}: ${id}`).toBe(false);
        }
      }
    }
    // The Stone wave shipped (2026-10-03): its Bone Watchtower is a bot's tower card again.
    expect(PAUSED_WAVE_IDS.has('bone_watchtower')).toBe(false);
  });

  it('age predictions expect released cards only', () => {
    const book = cardBook(content);
    for (const pool of book.unitsByAge) for (const u of pool) expect(PAUSED_WAVE_IDS.has(u.id), u.id).toBe(false);
  });
});
