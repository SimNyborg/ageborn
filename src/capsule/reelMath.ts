/**
 * Wardrobe Crate reel geometry (DESIGN A10.1). Pure, so the view and the tests share it.
 *
 * - 50 tiles scroll horizontally; the winning tile sits at index 45.
 * - The reel runs 5.5 s with a quintic ease-out; `reel_tick` plays per tile crossing the pointer,
 *   falling slightly in pitch.
 * - The stop offset is random within the winning tile (the reveal carries it as `stopOffsetBp`).
 * - The reel never places a rarer item directly after the winner (no staged near miss); the meta
 *   roll guarantees it and `checkReel` verifies it.
 *
 * Positions are in reel units: tile i spans [i × pitch, i × pitch + tileW]. `pos` is the strip
 * coordinate under the pointer.
 */
import type { SkinId, SkinRarity, WardrobeReveal } from '@/contracts';

export const REEL = {
  tiles: 50,
  winnerIndex: 45,
  tileW: 150,
  gap: 14,
  /** The pointer starts over this tile's centre, so a few tiles show on the left. */
  startTile: 2,
  /** The stop point keeps this share (bp) of the tile width clear of each edge, so it reads as inside. */
  stopInsetBp: 800,
  durationMs: 5500,
  /** Minimum gap between tick cues (the mixer's retrigger gap, A13). */
  tickGapMs: 40,
  pitchStartBp: 11000,
  pitchEndBp: 9200,
} as const;

const SKIN_RANK: Record<SkinRarity, number> = { rare: 0, epic: 1, legendary: 2 };

export interface ReelTile {
  skin: SkinId;
  rarity: SkinRarity;
}

export interface ReelLayout {
  tiles: ReelTile[];
  winnerIndex: number;
  tileW: number;
  pitch: number;
  startPos: number;
  stopPos: number;
  durationMs: number;
}

export interface ReelTick {
  atMs: number;
  /** The tile whose left edge crossed the pointer. */
  tile: number;
  pitchBp: number;
}

export function easeOutQuint(u: number): number {
  const k = Math.max(0, Math.min(1, u));
  return 1 - Math.pow(1 - k, 5);
}

/** Inverse of `easeOutQuint` on [0, 1]. */
export function easeOutQuintInverse(f: number): number {
  const k = Math.max(0, Math.min(1, f));
  return 1 - Math.pow(1 - k, 1 / 5);
}

/** Where the pointer stops inside the winning tile, in reel units. */
export function stopPosition(stopOffsetBp: number, winnerIndex: number = REEL.winnerIndex): number {
  const bp = Math.max(0, Math.min(10000, Math.round(stopOffsetBp)));
  const inset = REEL.stopInsetBp / 10000;
  const within = inset + (1 - 2 * inset) * (bp / 10000);
  return winnerIndex * (REEL.tileW + REEL.gap) + REEL.tileW * within;
}

export function buildReelLayout(tiles: ReelTile[], stopOffsetBp: number, winnerIndex: number = REEL.winnerIndex): ReelLayout {
  const pitch = REEL.tileW + REEL.gap;
  return {
    tiles,
    winnerIndex,
    tileW: REEL.tileW,
    pitch,
    startPos: REEL.startTile * pitch + REEL.tileW / 2,
    stopPos: stopPosition(stopOffsetBp, winnerIndex),
    durationMs: REEL.durationMs,
  };
}

/** Pointer position at `tMs` into the spin. */
export function reelPosAt(layout: ReelLayout, tMs: number): number {
  const u = layout.durationMs > 0 ? tMs / layout.durationMs : 1;
  return layout.startPos + (layout.stopPos - layout.startPos) * easeOutQuint(u);
}

/** Tile under the pointer (or the nearest one when the pointer is in a gap). */
export function tileAt(layout: ReelLayout, pos: number): number {
  return Math.max(0, Math.min(layout.tiles.length - 1, Math.floor((pos + REEL.gap / 2) / layout.pitch)));
}

/**
 * One tick per tile edge crossing the pointer, pitch falling from start to end. Ticks closer than
 * `tickGapMs` to the previous kept tick are dropped (the fast start would only machine-gun).
 */
export function reelTicks(layout: ReelLayout): ReelTick[] {
  const crossings: { atMs: number; tile: number }[] = [];
  const span = layout.stopPos - layout.startPos;
  if (span <= 0) return [];
  for (let i = 0; i < layout.tiles.length; i++) {
    const edge = i * layout.pitch;
    if (edge <= layout.startPos || edge > layout.stopPos) continue;
    const u = easeOutQuintInverse((edge - layout.startPos) / span);
    crossings.push({ atMs: Math.round(u * layout.durationMs), tile: i });
  }
  const out: ReelTick[] = [];
  const n = crossings.length;
  crossings.forEach((c, k) => {
    const prev = out[out.length - 1];
    if (prev && c.atMs - prev.atMs < REEL.tickGapMs) return;
    const f = n > 1 ? k / (n - 1) : 1;
    out.push({ ...c, pitchBp: Math.round(REEL.pitchStartBp + (REEL.pitchEndBp - REEL.pitchStartBp) * f) });
  });
  return out;
}

/** Honesty checks on a reveal's reel (A10.1). Returns human-readable issues; empty means fine. */
export function checkReel(reveal: WardrobeReveal, rarityOf: (skin: SkinId) => SkinRarity): string[] {
  const issues: string[] = [];
  const tiles = reveal.reelTiles;
  if (tiles.length !== REEL.tiles) issues.push(`reel has ${tiles.length} tiles, expected ${REEL.tiles}`);
  if (reveal.winnerIndex !== REEL.winnerIndex) issues.push(`winner index ${String(reveal.winnerIndex)}, expected ${REEL.winnerIndex}`);
  const winner = tiles[reveal.winnerIndex];
  if (winner !== reveal.crate.skin) issues.push(`tile ${reveal.winnerIndex} is ${String(winner)}, the crate holds ${reveal.crate.skin}`);
  const after = tiles[reveal.winnerIndex + 1];
  if (after !== undefined && SKIN_RANK[rarityOf(after)] > SKIN_RANK[reveal.crate.rarity]) {
    issues.push(`tile ${reveal.winnerIndex + 1} (${after}) is rarer than the winner: a staged near miss`);
  }
  if (reveal.stopOffsetBp < 0 || reveal.stopOffsetBp > 10000) issues.push(`stopOffsetBp ${reveal.stopOffsetBp} is outside 0..10000`);
  return issues;
}

/**
 * The tiles the view draws. The winner tile is always the crate's skin and rarity, and a tile right
 * after the winner that would be rarer (a near miss the roll must never stage) is replaced by the
 * nearest earlier filler of at most the winner's rarity. With honest input this changes nothing.
 */
export function reelTilesForView(reveal: WardrobeReveal, rarityOf: (skin: SkinId) => SkinRarity): ReelTile[] {
  const w = reveal.winnerIndex;
  const tiles: ReelTile[] = reveal.reelTiles.map((skin) => ({ skin, rarity: rarityOf(skin) }));
  while (tiles.length < REEL.tiles) tiles.push({ skin: reveal.crate.skin, rarity: reveal.crate.rarity });
  tiles[w] = { skin: reveal.crate.skin, rarity: reveal.crate.rarity };
  const next = tiles[w + 1];
  const cap = SKIN_RANK[reveal.crate.rarity];
  if (next && SKIN_RANK[next.rarity] > cap) {
    let swap: ReelTile | undefined;
    for (let i = w - 1; i >= 0 && !swap; i--) {
      const t = tiles[i];
      if (t && SKIN_RANK[t.rarity] <= cap) swap = t;
    }
    tiles[w + 1] = swap ?? tiles[w] ?? next;
  }
  return tiles;
}
