/**
 * The Army per-age sections and the Card Album model (owner request 2026-09-30, ui-plan 4.2 and 4.3).
 */
import { content } from '@/content';
import { describe, expect, it } from 'vitest';
import { midGameSave, newPlayerSave } from '../fixtures/saves';
import { ageSections, capsuleArenaFor, cardSourceShort } from '../model/armyAge';
import { cardsOfAge, isOwned } from '../model/cards';
import { DEX_FILTER, dexOf, dexOrder } from '../model/dex';
import { loadoutCards } from '../model/plan';

describe('Army per age: In battle, Available, Locked', () => {
  it('splits every card of the age into the loadout, the owned rest and the ones not found yet', () => {
    const save = midGameSave(content);
    const loadout = save.warPlans[save.activePlan]!.loadouts.stone;
    const inArmy = new Set(loadoutCards(loadout));
    const sec = ageSections(save, content, 'stone', inArmy);
    const c = cardsOfAge(content, 'stone');
    const all = [...c.units, ...c.turrets, ...c.powers];
    expect(sec.total).toBe(all.length);
    expect(sec.owned).toBe(all.filter((id) => isOwned(save, id, content)).length);
    // no card is in two sections, and together they are the whole age
    const battle = all.filter((id) => inArmy.has(id));
    expect(new Set([...battle, ...sec.available, ...sec.locked]).size).toBe(all.length);
    for (const id of sec.available) expect(isOwned(save, id, content) && !inArmy.has(id)).toBe(true);
    for (const id of sec.locked) expect(isOwned(save, id, content)).toBe(false);
    // troops first, then turrets, then powers
    const kind = (id: string) => (content.units[id] ? 0 : content.turrets[id] ? 1 : 2);
    for (let i = 1; i < sec.available.length; i++) expect(kind(sec.available[i]!)).toBeGreaterThanOrEqual(kind(sec.available[i - 1]!));
  });

  it('narrows to what fits a selected slot', () => {
    const save = newPlayerSave(content);
    const sec = ageSections(save, content, 'stone', new Set(), 'turret');
    for (const id of [...sec.available, ...sec.locked]) expect(content.turrets[id]).toBeDefined();
    const home = ageSections(save, content, 'stone', new Set(), 'power', 'home');
    for (const id of [...home.available, ...home.locked]) expect(content.powers[id]?.slot).toBe('home');
  });

  it('says where a locked card comes from, honestly per arena', () => {
    const save = newPlayerSave(content);
    expect(capsuleArenaFor(save, content, 'stone')).toBeNull();
    const later = content.order.ages.find((a) => !content.arenas.list[save.arenaIndex]!.dropAges.includes(a));
    if (later) {
      const arena = capsuleArenaFor(save, content, later);
      expect(arena).toBeGreaterThan(1);
      const unit = cardsOfAge(content, later).units[0]!;
      expect(cardSourceShort(save, content, unit)).toEqual({ key: 'ui.armyAge.src.arena', params: { n: arena } });
    }
    expect(cardSourceShort(save, content, 'mammoth_matriarch')).toEqual({ key: 'ui.armyAge.src.capsule' });
    const wp = content.order.powers.find((id) => content.powers[id]?.source === 'warPath')!;
    expect(cardSourceShort(save, content, wp).key).toBe('ui.armyAge.src.warPath');
  });
});

describe('the Card Album (a long scroll like a Pokedex)', () => {
  it('numbers every card once, in age order: troops, turrets, powers', () => {
    const order = dexOrder(content);
    // The original cards are 1..N in age order; a content wave's cards are appended with the next free
    // numbers (src/content/album.ts) and shown under their own age, so numbers rise within each age.
    const nos = order.map((x) => x.no);
    expect(new Set(nos).size).toBe(order.length);
    for (let i = 1; i < order.length; i++) if (order[i]!.age === order[i - 1]!.age) expect(nos[i]).toBeGreaterThan(nos[i - 1]!);
    const firstAppended = nos.findIndex((n, i) => n !== i + 1);
    if (firstAppended >= 0) expect(Math.min(...nos.filter((n, i) => n !== i + 1))).toBeGreaterThan(nos.filter((n, i) => n === i + 1).length);
    expect(new Set(order.map((x) => x.id)).size).toBe(order.length);
    expect(order.length).toBe(content.order.units.length + content.order.turrets.length + content.order.powers.length);
    const ageIndex = (a: string) => content.order.ages.indexOf(a as never);
    for (let i = 1; i < order.length; i++) expect(ageIndex(order[i]!.age)).toBeGreaterThanOrEqual(ageIndex(order[i - 1]!.age));
    expect(order[0]!.id).toBe(content.order.units.find((id) => content.units[id]!.age === 'stone'));
  });

  it('counts completion per age and in total, and keeps numbers under every filter', () => {
    const save = newPlayerSave(content);
    const all = dexOf(save, content);
    expect(all.shown).toBe(all.total);
    expect(all.ages.map((a) => a.age)).toEqual(content.order.ages);
    expect(all.ages.reduce((n, a) => n + a.owned, 0)).toBe(all.owned);
    const numbers = new Map(all.ages.flatMap((a) => a.entries).map((e) => [e.id, e.no]));
    const missing = dexOf(save, content, { ...DEX_FILTER, own: 'missing' });
    expect(missing.shown).toBe(all.total - all.owned);
    for (const e of missing.ages.flatMap((a) => a.entries)) {
      expect(e.owned).toBe(false);
      expect(e.no).toBe(numbers.get(e.id));
    }
    // completion stays the age's, not the filter's
    expect(missing.ages.map((a) => a.owned)).toEqual(all.ages.map((a) => a.owned));
    const legendary = dexOf(save, content, { ...DEX_FILTER, rarity: 'legendary' });
    for (const e of legendary.ages.flatMap((a) => a.entries)) expect((content.units[e.id] ?? content.turrets[e.id] ?? content.powers[e.id])?.rarity).toBe('legendary');
    const turrets = dexOf(save, content, { ...DEX_FILTER, cls: 'turret' });
    expect(turrets.shown).toBe(content.order.turrets.length);
  });
});
