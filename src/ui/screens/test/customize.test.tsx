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
    for (const tab of ['troops', 'bases', 'flags', 'decorations', 'emotes', 'quotes', 'look']) expect(m.q(`[data-testid="tab-${tab}"]`), tab).not.toBeNull();
    expect(text(m.q('[data-testid="cust-total"]')!)).toMatch(/^\d+\/\d+ found$/);
    // The per-collection counts live on each collection's own tab (review 9: not on Troops).
    expect(m.q('[data-testid="cosmetic-completion"]')).toBeNull();
  });

  it('flags: the mock-up, "found" counts, equip an owned flag, clear the national flag', () => {
    m = cust('flags');
    expect(m.q('[data-testid="base-mock"]')).not.toBeNull();
    // mid fixture: 2 starters + 3 owned base flags; 6 national flags
    expect(text(m.q('[data-testid="found-baseFlag"]')!)).toContain('5/15 found');
    expect(text(m.q('[data-testid="found-nationalFlag"]')!)).toContain('6/50 found');
    m.click('[data-testid="item-nationalFlag.se"] button');
    expect(calls('equipCosmetic')).toEqual([{ slot: 'nationalFlag', key: 'nationalFlag.se' }]);
    m.click('[data-testid="national-none"]');
    expect(calls('equipCosmetic')[1]).toEqual({ slot: 'nationalFlag', key: null });
  });

  it('a locked item says how it is earned, cannot be equipped and can be crafted when it drops from capsules', () => {
    m = cust('flags');
    const tile = m.q('[data-testid="item-nationalFlag.fr"]')!;
    expect(tile.getAttribute('class')).toContain('is-locked');
    expect(text(tile)).toContain('Found in Time Capsules');
    m.click('[data-testid="item-nationalFlag.fr"] button');
    expect(calls('equipCosmetic')).toEqual([]);
    m.click('[data-testid="craft-nationalFlag.fr"]');
    expect(calls('craftCosmetic')).toEqual(['nationalFlag.fr']);
    expect(m.save.value.cosmetics.owned).toContain('nationalFlag.fr');
  });

  it('road and feat items show their source and have no craft button', () => {
    m = cust('flags');
    expect(text(m.q('[data-testid="item-baseFlag.comet"]')!)).toContain('Trophy Road at 2000 trophies');
    expect(m.q('[data-testid="craft-baseFlag.comet"]')).toBeNull();
    expect(text(m.q('[data-testid="item-baseFlag.phoenix"]')!)).toContain('A hidden feat');
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
    m.click('[data-testid="item-emote.clap"] button');
    expect(calls('equipCosmetic')[0]).toEqual({ slot: 'emotes', keys: ['laugh', 'salute', 'thumbsUp', 'gg', 'emote.heart', 'emote.bonk', 'emote.robo_dance'] });
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
