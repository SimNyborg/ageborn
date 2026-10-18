/**
 * Home's island in the UI (queue item 37): the live island's request (your first two troops with their skins,
 * the opponent's without, at the live spots; nothing under Reduce motion) and the drawn boxes the still island
 * fits its troops' strips into, kept per card and skin (review M S3: a skinned troop may stand at another
 * size than the card's own look).
 */
import { describe, expect, it } from 'vitest';
import type { CardId, SkinId } from '@/contracts';
import { liveIslandRequest, LIVE_SPOTS, type DioramaLive } from '../Diorama';
import { boxKey, rememberBoxes, troopBoxes } from '../homeStage';

const live = (o: Partial<DioramaLive> = {}): DioramaLive => ({ paused: false, leaving: false, reduce: false, lite: false, teamPreset: 'default', skins: {}, ...o });
const mine: CardId[] = ['footman', 'longbowman', 'pikeman'];
const foe: CardId[] = ['squire_pair', 'longbowman'];

describe("Home's live island request", () => {
  it("stands your first two troops with their skins and the opponent's without, at the live spots", () => {
    const r = liveIslandRequest({ arena: 'tar_pits', mine, foe, hidden: false, live: live({ skins: { footman: 'tin_can' as SkinId } }) })!;
    expect(r.troops.map((t) => [t.side, t.slot, t.card, t.skin ?? null])).toEqual([
      [0, 0, 'footman', 'tin_can'],
      [0, 1, 'longbowman', null],
      [1, 0, 'squire_pair', null],
      [1, 1, 'longbowman', null],
    ]);
    expect(r.troops[0]).toMatchObject(LIVE_SPOTS[0][0]);
    expect(r.troops[3]).toMatchObject(LIVE_SPOTS[1][1]);
  });

  it('is null under Reduce motion; passes the hold, Auto and the next opponent; greys the hidden opponent', () => {
    expect(liveIslandRequest({ arena: 'tar_pits', mine, foe, hidden: false, live: live({ reduce: true }) })).toBeNull();
    const r = liveIslandRequest({ arena: 'tar_pits', mine, foe: [], hidden: true, live: live({ hold: true, auto: true, foeNext: ['friar', 'longbowman', 'pikeman'] }) })!;
    expect(r.hold).toBe(true);
    expect(r.auto).toBe(true);
    expect(r.preload).toEqual([{ card: 'friar' }, { card: 'longbowman' }]);
    expect(r.poles[1]).toMatchObject({ grey: true, baseFlag: null, nationalFlag: null });
    // no opponent troops stand while the search runs
    expect(r.troops.every((t) => t.side === 0)).toBe(true);
  });
});

describe("the still island's boxes", () => {
  it('keeps each troop box per card and skin, rounded, and ignores nonsense', () => {
    rememberBoxes([
      { card: 'footman', front: 55.71, back: 19.94, top: 90.66 },
      { card: 'footman', skin: 'tin_can' as SkinId, front: 40, back: 18, top: 76 },
      { card: 'pikeman', front: Number.NaN, back: 1, top: 50 },
    ]);
    expect(troopBoxes.value[boxKey('footman')]).toEqual({ front: 55.7, back: 19.9, top: 90.7 });
    expect(troopBoxes.value[boxKey('footman', 'tin_can' as SkinId)]).toEqual({ front: 40, back: 18, top: 76 });
    expect(boxKey('footman', null)).toBe('footman');
    expect(troopBoxes.value.pikeman).toBeUndefined();
  });
});
