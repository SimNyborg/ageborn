import { describe, expect, it } from 'vitest';
import {
  buildReelLayout,
  checkReel,
  easeOutQuint,
  easeOutQuintInverse,
  REEL,
  reelPosAt,
  reelTicks,
  reelTilesForView,
  stopPosition,
  tileAt,
} from '../reelMath';
import { crate, honestTiles, SKIN_RARITY } from './fixtures';

const rarityOf = (s: string) => SKIN_RARITY[s] ?? 'rare';

describe('reel math (DESIGN A10.1)', () => {
  it('eases out quintically and inverts', () => {
    expect(easeOutQuint(0)).toBe(0);
    expect(easeOutQuint(1)).toBe(1);
    expect(easeOutQuint(0.5)).toBeCloseTo(1 - 1 / 32);
    for (const f of [0, 0.1, 0.5, 0.9, 0.999, 1]) expect(easeOutQuint(easeOutQuintInverse(f))).toBeCloseTo(f, 9);
  });

  it('stops inside the winning tile at index 45, for any offset', () => {
    const tiles = reelTilesForView(crate('ghost_corsair', 'epic', honestTiles('ghost_corsair')), rarityOf);
    for (const bp of [0, 1, 2500, 5000, 9999, 10000]) {
      const layout = buildReelLayout(tiles, bp);
      expect(reelPosAt(layout, REEL.durationMs)).toBeCloseTo(stopPosition(bp));
      expect(tileAt(layout, layout.stopPos)).toBe(45);
      const left = 45 * layout.pitch;
      expect(layout.stopPos).toBeGreaterThan(left);
      expect(layout.stopPos).toBeLessThan(left + layout.tileW);
    }
  });

  it('moves monotonically and slows to a stop', () => {
    const layout = buildReelLayout(reelTilesForView(crate('tin_can', 'rare', honestTiles('tin_can')), rarityOf), 3000);
    let prev = -Infinity;
    let prevStep = Infinity;
    for (let t = 0; t <= REEL.durationMs; t += 250) {
      const p = reelPosAt(layout, t);
      expect(p).toBeGreaterThanOrEqual(prev);
      if (prev > -Infinity) {
        expect(p - prev).toBeLessThanOrEqual(prevStep + 1e-6);
        prevStep = p - prev;
      }
      prev = p;
    }
  });

  it('ticks once per crossed tile edge, spaced ≥ 40 ms, with falling pitch', () => {
    const layout = buildReelLayout(reelTilesForView(crate('tin_can', 'rare', honestTiles('tin_can')), rarityOf), 5000);
    const ticks = reelTicks(layout);
    expect(ticks.length).toBeGreaterThan(15);
    expect(ticks.length).toBeLessThanOrEqual(45 - REEL.startTile);
    for (let i = 1; i < ticks.length; i++) {
      const a = ticks[i - 1];
      const b = ticks[i];
      if (!a || !b) continue;
      expect(b.atMs - a.atMs).toBeGreaterThanOrEqual(REEL.tickGapMs);
      expect(b.tile).toBeGreaterThan(a.tile);
      expect(b.pitchBp).toBeLessThanOrEqual(a.pitchBp);
    }
    const last = ticks[ticks.length - 1];
    expect(last?.tile).toBe(45);
    expect(last?.atMs).toBeLessThanOrEqual(REEL.durationMs);
    // Each tick sits exactly where the pointer crosses that tile's left edge.
    for (const t of ticks) expect(reelPosAt(layout, t.atMs)).toBeCloseTo(t.tile * layout.pitch, -1);
  });

  it('accepts an honest reel', () => {
    expect(checkReel(crate('ghost_corsair', 'epic', honestTiles('ghost_corsair')), rarityOf)).toEqual([]);
  });

  it('flags a staged near miss and a wrong winner', () => {
    const tiles = honestTiles('tin_can');
    tiles[46] = 'frost_matriarch';
    const issues = checkReel(crate('tin_can', 'rare', tiles), rarityOf);
    expect(issues.some((s) => s.includes('near miss'))).toBe(true);
    const wrong = honestTiles('tin_can');
    wrong[45] = 'pumpkin_head';
    expect(checkReel(crate('tin_can', 'rare', wrong), rarityOf).some((s) => s.includes('crate holds'))).toBe(true);
  });

  it('never draws a rarer tile right after the winner, and always draws the crate skin at 45', () => {
    const tiles = honestTiles('tin_can');
    tiles[46] = 'frost_matriarch';
    tiles[45] = 'pumpkin_head';
    const view = reelTilesForView(crate('tin_can', 'rare', tiles), rarityOf);
    expect(view[45]).toEqual({ skin: 'tin_can', rarity: 'rare' });
    expect(view[46]?.rarity).toBe('rare');
    expect(view).toHaveLength(50);
  });
});
