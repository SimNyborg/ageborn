import { describe, expect, it } from 'vitest';
import { NonePlatform, createPlatform, isPlatformName } from '..';

describe('NonePlatform (DESIGN B11)', () => {
  it('has no ads: the commercial break resolves at once and the reel is on', async () => {
    const p = new NonePlatform();
    await p.init();
    expect(p.initialized).toBe(true);
    let done = false;
    await p.commercialBreak().then(() => {
      done = true;
    });
    expect(done).toBe(true);
    expect(p.features).toEqual({ reelReveal: true, externalLinks: true });
  });

  it('tracks the gameplay lifecycle', () => {
    const p = new NonePlatform();
    p.loadingFinished();
    expect(p.loaded).toBe(true);
    p.gameplayStart();
    expect(p.inGameplay).toBe(true);
    p.gameplayStop();
    expect(p.inGameplay).toBe(false);
  });
});

describe('createPlatform', () => {
  it('builds `none` and falls back to it for unknown names', () => {
    expect(createPlatform('none')).toBeInstanceOf(NonePlatform);
    expect(createPlatform('poki')).toBeInstanceOf(NonePlatform);
    expect(createPlatform(null)).toBeInstanceOf(NonePlatform);
    expect(isPlatformName('none')).toBe(true);
    expect(isPlatformName('poki')).toBe(false);
  });
});
