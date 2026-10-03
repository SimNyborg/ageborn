/**
 * X0 meta (CONTENT_PLAN 6): the starter flag, arena-gated drop pools and crafting for content-wave cards,
 * War Path side nodes (s1 power, s2 fort variant), the region star milestone and the L3 lane power.
 */
import { describe, expect, it } from 'vitest';
import type { SaveDoc } from '@/contracts';
import { craft } from '../dust';
import { META_FLAGS } from '../rules';
import { inArenaPool, isStarterCard, poolOf } from '../tables';
import { applyWarPath, currentLevelId, levelOpen, warPathSideNodes } from '../warPath';
import { contentAllReleased } from '../../../tests/fixtures/allReleased';
import { fresh, stats } from './helpers';

/** The wave's own rules run with the release gate open (the game itself hides the wave, release.test.ts). */
const C = contentAllReleased;

const win = (s: SaveDoc, level: string) => applyWarPath(s, C, { level, difficulty: 'normal' }, 'win', stats({ ownBaseHpBpAtEnd: 9000 }), 0);

function beat(s: SaveDoc, ids: string[], n = 3): SaveDoc {
  const stars = { ...s.warPath.stars };
  for (const id of ids) stars[id] = n;
  return { ...s, warPath: { ...s.warPath, stars } };
}

const stoneMain = (to: number): string[] => Array.from({ length: to }, (_, i) => `wp.stone.l${String(i + 1).padStart(2, '0')}`);

describe('the starter flag (X0)', () => {
  it('only flagged cards are starters: wave Commons are capsule cards', () => {
    expect(isStarterCard(C, 'bonker')).toBe(true);
    expect(isStarterCard(C, 'spear_hunter')).toBe(true);
    expect(isStarterCard(C, 'rock_tosser')).toBe(true);
    expect(isStarterCard(C, 'hunting_wolves')).toBe(false);
    expect(isStarterCard(C, 'quill_porcupine')).toBe(false);
    expect(fresh().collection.hunting_wolves).toBeUndefined();
  });
});

describe('arena-gated pools and crafting (X0)', () => {
  it('wave Commons drop from Arena 2, Rares 3, Epics 4, Legendaries 5', () => {
    const has = (arena: number, id: string) => poolOf(C, ['stone'], arena - 1).cards.includes(id);
    expect(has(1, 'hunting_wolves')).toBe(false);
    expect(has(2, 'hunting_wolves')).toBe(true);
    expect(has(2, 'atlatl_thrower')).toBe(false);
    expect(has(3, 'atlatl_thrower')).toBe(true);
    expect(has(3, 'cave_bear')).toBe(false);
    expect(has(4, 'cave_bear')).toBe(true);
    expect(has(4, 'elk_chieftain')).toBe(false);
    expect(has(5, 'elk_chieftain')).toBe(true);
    // The original cards drop wherever their age does.
    expect(has(1, 'sabertooth')).toBe(true);
    expect(inArenaPool(C, 'bonker', 0)).toBe(true);
  });

  it('a wave card can be crafted only from its arena (or once owned)', () => {
    const s = { ...fresh(), currencies: { ...fresh().currencies, dust: 100000 } };
    expect(craft(s, 'elk_chieftain', C).ok).toBe(false);
    expect(craft({ ...s, arenaIndex: 4 }, 'elk_chieftain', C).ok).toBe(true);
  });
});

describe('War Path side nodes and the star milestone (X0)', () => {
  it('s1 opens after L5 and s2 after L8; neither is ever the current level', () => {
    let s = beat(fresh(), stoneMain(4));
    expect(levelOpen(s, C, 'wp.stone.s1')).toBe(false);
    s = beat(s, ['wp.stone.l05']);
    expect(levelOpen(s, C, 'wp.stone.s1')).toBe(true);
    expect(levelOpen(s, C, 'wp.stone.s2')).toBe(false);
    expect(currentLevelId(s, C)).toBe('wp.stone.l06');
    s = beat(s, stoneMain(8));
    expect(levelOpen(s, C, 'wp.stone.s2')).toBe(true);
    expect(warPathSideNodes(s, C).filter((n) => n.level.region === 'stone').map((n) => n.state)).toEqual(['open', 'open']);
    expect(C.warPath.order.includes('wp.stone.s1')).toBe(false);
  });

  it('s1 grants Tangle Vines; s2 grants the Thorn Hedge once the Fort slot is open', () => {
    let s = beat(fresh(), stoneMain(8));
    s = { ...s, flags: { ...s.flags, [META_FLAGS.fortSlot]: true }, fortsOwned: ['palisade'] };
    const a = win(s, 'wp.stone.s1');
    expect(a.save.powersOwned).toContain('tangle_vines');
    const b = win(a.save, 'wp.stone.s2');
    expect(b.save.fortsOwned).toContain('thorn_hedge');
    expect(b.steps.some((x) => x.kind === 'card' && x.card === 'thorn_hedge')).toBe(true);
  });

  it('L3 first clear grants Pebble Hail', () => {
    const s = beat(fresh(), stoneMain(2));
    const r = win(s, 'wp.stone.l03');
    expect(r.save.powersOwned).toContain('pebble_hail');
  });

  it('20 stars in a region grant the Bone Watchtower once', () => {
    let s = beat(fresh(), stoneMain(6));
    s = { ...s, flags: { ...s.flags, [META_FLAGS.fortSlot]: true }, fortsOwned: ['palisade'] };
    // 18 stars, then a 3-star win on L7 (Hard) reaches 21.
    const got = applyWarPath(s, C, { level: 'wp.stone.l07', difficulty: 'hard' }, 'win', stats({ ownBaseHpBpAtEnd: 9000 }), 0);
    expect(got.save.fortsOwned).toContain('bone_watchtower');
    const again = applyWarPath(got.save, C, { level: 'wp.stone.l08', difficulty: 'hard' }, 'win', stats({ ownBaseHpBpAtEnd: 9000 }), 0);
    expect(again.steps.filter((x) => x.kind === 'card' && x.card === 'bone_watchtower')).toHaveLength(0);
    expect(again.save.currencies.amber - got.save.currencies.amber).toBe(C.warPath.levels['wp.stone.l08']!.reward.amber);
  });
});
