import { FakeAudio } from '@/contracts/fakes/audio';
import { describe, expect, it } from 'vitest';
import { silenceable } from '../live/silence';

/** The live catch-up's sound switch (queue item 34) forwards the battle ambience (queue item 38 A7). */

class AmbienceAudio extends FakeAudio {
  readonly levels: number[] = [];
  setBattleAmbience(level: number): void {
    this.levels.push(level);
  }
}

type WithAmbience = { setBattleAmbience?: (level: number) => void };

describe('silenceable and the battle ambience', () => {
  it('forwards the level, holds it at 0 while silent and restores the last level after the catch-up', () => {
    const inner = new AmbienceAudio();
    const s = silenceable(inner);
    const audio = s.audio as WithAmbience;
    audio.setBattleAmbience?.(0.5);
    s.setSilent(true);
    audio.setBattleAmbience?.(0.75);
    s.setSilent(false);
    expect(inner.levels).toEqual([0.5, 0, 0, 0.75]);
  });

  it('has no ambience when the inner service has none', () => {
    const s = silenceable(new FakeAudio());
    expect((s.audio as WithAmbience).setBattleAmbience).toBeUndefined();
    s.setSilent(true);
    s.setSilent(false);
  });
});
