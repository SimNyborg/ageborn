/**
 * Customize's cosmetic collections (DESIGN A18.9.4): completion counts, the base mock-up, equipping
 * owned items (flags, base skins, decorations by anchor, the emote and quote wheel), locked items with
 * their source and Dust crafting, and the Collection's completion strip.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { text } from './dom';
import { mount, type Mounted } from './harness';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
});

const calls = (name: string) => m!.log.calls.filter((c) => c.name === name).map((c) => c.args[0]);
const cust = (tab: string) => mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'customize', tab: tab as 'flags' }] });

describe('Customize: collections (A18.9.4)', () => {
  it('shows every tab and the completion over skins and collections', () => {
    m = cust('troops');
    for (const tab of ['general', 'troops', 'bases', 'backdrops', 'flags', 'decorations', 'emotes', 'quotes']) expect(m.q(`[data-testid="tab-${tab}"]`), tab).not.toBeNull();
    expect(text(m.q('[data-testid="cust-total"]')!)).toMatch(/^\d+\/\d+ found$/);
    // The per-collection counts live on each collection's own tab (review 9: not on Troops).
    expect(m.q('[data-testid="cosmetic-completion"]')).toBeNull();
  });

  it('flags: the mock-up, "found" counts, equip an owned flag, clear the national flag', () => {
    m = cust('flags');
    expect(m.q('[data-testid="base-mock"]')).not.toBeNull();
    // mid fixture: 2 starters + 3 owned base flags (the Flag Atlas's rewards join the total)
    expect(text(m.q('[data-testid="found-baseFlag"]')!)).toMatch(/^5\/\d+ found$/);
    // national flags count on the Atlas card: the six regions' flags you own, of all of them
    const atlas = m.services.flagAtlasProgress();
    expect(text(m.q('[data-testid="atlas-count"]')!)).toBe(`${atlas.owned}/${atlas.total}`);
    m.click('[data-testid="item-nationalFlag.se"] button');
    expect(calls('equipCosmetic')).toEqual([{ slot: 'nationalFlag', key: 'nationalFlag.se' }]);
    m.click('[data-testid="national-none"]');
    expect(calls('equipCosmetic')[1]).toEqual({ slot: 'nationalFlag', key: null });
  });

  it('no Equip button: a tap on an owned item equips it, and only the chosen one says "Equipped" (owner request 2026-10-07)', () => {
    m = cust('flags');
    const tiles = () => m!.qa('.cos-tile').filter((el) => (el.getAttribute('data-testid') ?? '').startsWith('item-nationalFlag.'));
    const owned = tiles().filter((el) => !(el.getAttribute('class') ?? '').includes('is-locked'));
    expect(owned.length).toBeGreaterThan(1);
    for (const el of owned) expect(text(el)).not.toMatch(/\bEquip\b/);
    m.click('[data-testid="item-nationalFlag.se"] button');
    const said = tiles().filter((el) => text(el).includes('Equipped'));
    expect(said.map((el) => el.getAttribute('data-testid'))).toEqual(['item-nationalFlag.se']);
    expect(m.q('[data-testid="state-nationalFlag.se"]')).not.toBeNull();
  });

  it('troop skins: a tap on an owned skin equips it with an Undo toast; only the equipped one says so', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'collection', tab: 'skins' }] });
    const owned = m.qa('.col-skin').filter((el) => (el.getAttribute('class') ?? '').includes('is-owned'));
    const off = owned.find((el) => !(el.getAttribute('class') ?? '').includes('is-on'))!;
    expect(off).toBeTruthy();
    expect(text(off)).not.toMatch(/\bEquip\b/);
    const id = off.getAttribute('data-testid')!.slice('skin-tile-'.length);
    expect(m.save.value.skins.owned).toContain(id);
    m.click(`[data-testid="equip-${id}"]`);
    expect(Object.values(m.save.value.skins.equipped)).toContain(id);
    expect(m.q(`[data-testid="skin-on-${id}"]`)).not.toBeNull();
    expect(m.qa('[data-testid="toast"]')).toHaveLength(1);
    // A second tap on the equipped skin changes nothing.
    const before = { ...m.save.value.skins.equipped };
    m.click(`[data-testid="equip-${id}"]`);
    expect(m.save.value.skins.equipped).toEqual(before);
  });

  it('national flags: only the ones you own; the Flag Atlas card opens the Atlas, where every flag is bought (PLAN 2d)', () => {
    m = cust('flags');
    expect(m.q('[data-testid="item-nationalFlag.fr"]')).toBeNull();
    const owned = m.qa('[data-testid="owned-national"] .cos-tile').map((el) => el.getAttribute('data-testid'));
    expect(owned).toContain('item-nationalFlag.se');
    expect(owned.every((id) => id === 'national-none' || !m!.q(`[data-testid="${id}"]`)!.getAttribute('class')!.includes('is-locked'))).toBe(true);
    // a save that owns a flag pays the one price: no first-flag line
    expect(m.q('[data-testid="atlas-first"]')).toBeNull();
    m.click('[data-testid="open-flag-atlas"]');
    expect(m.router.current.value).toMatchObject({ id: 'flagAtlas' });
  });

  it("a save's first flag says it costs no Dust, never with the word the copy review bans", () => {
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'customize', tab: 'flags' }] });
    expect(m.services.flagAtlasProgress().price).toBe(0);
    expect(text(m.q('[data-testid="atlas-first"]')!)).toBe('Your first flag costs no Dust');
    expect(text(m.q('[data-testid="open-flag-atlas"]')!)).not.toMatch(/\bfree\b/i);
    expect(m.q('[data-testid="open-flag-atlas"]')!.getAttribute('aria-label')).toContain('costs no Dust');
  });

  it('a locked capsule item says how it is earned and crafts with two taps (U14)', () => {
    m = cust('decorations');
    const tile = m.q('[data-testid="item-decoration.knight_helm"]')!;
    expect(tile.getAttribute('class')).toContain('is-locked');
    // the card says it on its label and with a source chip; a tap opens its info panel
    expect(m.q('[data-testid="item-decoration.knight_helm"] button')!.getAttribute('aria-label')).toContain('Found in Time Capsules');
    m.click('[data-testid="item-decoration.knight_helm"] button');
    expect(text(m.q('[data-testid="info-source"]')!)).toContain('Found in Time Capsules');
    m.click('[data-testid="craft-decoration.knight_helm"]');
    // the first tap arms: the price and the Dust after show, nothing is spent yet
    expect(calls('craftCosmetic')).toEqual([]);
    expect(m.q('[data-testid="info-after"]')).not.toBeNull();
    m.click('[data-testid="craft-decoration.knight_helm"]');
    expect(calls('craftCosmetic')).toEqual(['decoration.knight_helm']);
  });

  it('road and feat items show their source and have no craft button', () => {
    m = cust('flags');
    m.click('[data-testid="item-baseFlag.comet"] button');
    expect(text(m.q('[data-testid="info-source"]')!)).toContain('Trophy Road at 2000 trophies');
    expect(m.q('[data-testid="craft-baseFlag.comet"]')).toBeNull();
    expect(m.q('[data-testid="item-baseFlag.phoenix"] button')!.getAttribute('aria-label')).toContain('A hidden feat');
  });

  it('every card shows its rarity as a plate and a gem, and its name never clips', () => {
    m = cust('flags');
    for (const r of ['common', 'rare', 'epic', 'legendary']) {
      const card = m.q(`[data-testid="cust-flags"] .cos-card--${r}`);
      expect(card, r).not.toBeNull();
      expect(card!.querySelectorAll('.cos-card__gem').length, r).toBe(1);
    }
    for (const name of m.qa('[data-testid="cust-flags"] .cos-tile__name')) expect(name.getAttribute('data-clip-check')).toBe('');
  });

  it('decorations: pick a spot on the mock-up, then a decoration', () => {
    m = cust('decorations');
    m.click('[data-testid="anchor-1"]');
    expect(m.q('[data-testid="anchor-1"]')!.getAttribute('aria-pressed')).toBe('true');
    m.click('[data-testid="item-decoration.stone_idol"] button');
    expect(calls('equipCosmetic')).toEqual([{ slot: 'decoration', anchor: 1, key: 'decoration.stone_idol' }]);
  });

  it('bases: a skin equips on its own age', () => {
    m = cust('bases');
    // The tab opens on the age the player is in (Bronze in the fixture); pick Stone.
    m.click('[data-testid="age-tab-stone"]');
    m.click('[data-testid="item-baseSkin.frost_cave"] button');
    // already on for Stone in the fixture: nothing to do; the standard base clears it
    m.click('[data-testid="base-default"]');
    expect(calls('equipCosmetic')).toContainEqual({ slot: 'baseSkin', age: 'stone', key: null });
  });

  it('emotes: the wheel shows the equipped emotes; tapping one takes it out, a full wheel says so', () => {
    m = cust('emotes');
    expect(m.qa('[data-testid="emote-wheel"] button')).toHaveLength(8);
    // How full the wheel is: a number beside its heading, no hint line (owner request 2026-10-07).
    expect(text(m.q('[data-testid="emote-count"]')!)).toBe('8/8');
    expect(m.q('[data-testid="emote-count"]')!.getAttribute('aria-label')).toBe('8 of 8 slots used');
    m.click('[data-testid="item-emote.clap"] button');
    expect(calls('equipCosmetic')[0]).toEqual({ slot: 'emotes', keys: ['laugh', 'salute', 'thumbsUp', 'gg', 'emote.heart', 'emote.bonk', 'emote.robo_dance'] });
    expect(text(m.q('[data-testid="emote-count"]')!)).toBe('7/8');
    m.click('[data-testid="item-cry"]');
    expect(calls('equipCosmetic')[1]).toEqual({ slot: 'emotes', keys: ['laugh', 'salute', 'thumbsUp', 'gg', 'emote.heart', 'emote.bonk', 'emote.robo_dance', 'cry'] });
    m.click('[data-testid="item-angry"]');
    // 8 of 8 used: no call, a toast instead
    expect(calls('equipCosmetic')).toHaveLength(2);
  });

  it('quotes: fixed lines only, toggled in and out of the wheel', () => {
    m = cust('quotes');
    expect(text(m.q('[data-testid="quote-wheel"]')!)).toContain('Good luck, have fun!');
    m.click('[data-testid="item-quote.respect"] button');
    expect(calls('equipCosmetic')).toEqual([]);
    m.click('[data-testid="item-quote.charge"] button');
    expect(calls('equipCosmetic')[0]).toEqual({ slot: 'quotes', keys: ['quote.glhf', 'quote.well_played', 'quote.plot_twist'] });
  });

  it('Collection: the skins tab shows the completion strip and opens Customize on Flags', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'collection', tab: 'skins' }] });
    expect(text(m.q('[data-testid="found-emote"]')!)).toMatch(/Emotes.*\d+\/24 found/);
    m.click('[data-testid="open-customize"]');
    expect(m.router.current.value).toMatchObject({ id: 'customize', tab: 'flags' });
  });
});
describe('Customize: battle backdrops (A18.9.4 "Backdrops", owner request 2026-09-30)', () => {
  it('shows the live preview, the count and every backdrop; an owned one equips with Undo', () => {
    m = cust('backdrops');
    expect(m.q('[data-testid="backdrop-mock"]')).not.toBeNull();
    // mid fixture: 3 of the backdrops owned, none equipped (the classic skies)
    expect(text(m.q('[data-testid="found-backdrop"]')!)).toMatch(/^3\/\d+ found$/);
    expect(m.q('[data-testid="backdrop-classic"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(text(m.q('[data-testid="backdrop-name"]')!)).toBe('Classic skies');
    m.click('[data-testid="item-backdrop.winterfall"] button');
    expect(calls('equipCosmetic')).toEqual([{ slot: 'backdrop', key: 'backdrop.winterfall' }]);
    expect(m.q('[data-testid="backdrop-look"]')!.getAttribute('data-skin')).toBe('backdrop.winterfall');
    expect(m.qa('[data-testid="toast"]')).toHaveLength(1);
    m.click('[data-testid="backdrop-classic"]');
    expect(calls('equipCosmetic')[1]).toEqual({ slot: 'backdrop', key: null });
  });

  it('a locked backdrop can be tried on in the preview but never equipped, and says how it is earned', () => {
    m = cust('backdrops');
    const tile = '[data-testid="item-backdrop.northern_lights"]';
    expect(m.q(tile)!.getAttribute('class')).toContain('is-locked');
    expect(m.q(`${tile} button`)!.getAttribute('aria-label')).toContain('Found in Wardrobe Crates');
    m.click(`${tile} button`);
    expect(calls('equipCosmetic')).toEqual([]);
    expect(m.q('[data-testid="backdrop-look"]')!.getAttribute('data-skin')).toBe('backdrop.northern_lights');
    expect(text(m.q('[data-testid="backdrop-name"]')!)).toContain('Trying on');
    // the road one names its node
    expect(m.q('[data-testid="item-backdrop.eclipse"] button')!.getAttribute('aria-label')).toContain('Trophy Road at 3500 trophies');
  });

  it('switches the age the preview shows', () => {
    m = cust('backdrops');
    m.click('[data-testid="cust-bd-age"] [data-testid="age-tab-cosmic"]');
    expect(m.q('[data-testid="backdrop-look"]')!.getAttribute('data-age')).toBe('cosmic');
  });
});

