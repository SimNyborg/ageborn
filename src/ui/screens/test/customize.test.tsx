/**
 * Customize's cosmetic collections (DESIGN A18.9.4): completion counts, the base mock-up, equipping
 * owned items (flags, base skins, decorations by anchor, the emote and quote wheel), locked items with
 * their source and Dust crafting, and the Collection's completion strip.
 */
import { afterEach, describe, expect, it } from 'vitest';
import { content as realContent } from '@/content';
import { fixtureSave } from '../fixtures/saves';
import { text } from './dom';
import { flush, mount, type Mounted } from './harness';

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
    expect(text(m.q('[data-testid="open-flag-atlas-count"]')!)).toBe(`${atlas.owned}/${atlas.total}`);
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
    expect(m.q('[data-testid="open-flag-atlas-first"]')).toBeNull();
    m.click('[data-testid="open-flag-atlas"]');
    expect(m.router.current.value).toMatchObject({ id: 'flagAtlas' });
  });

  it("a save's first flag says it costs no Dust, never with the word the copy review bans", () => {
    m = mount({ state: 'new', routes: [{ id: 'home' }, { id: 'customize', tab: 'flags' }] });
    expect(m.services.flagAtlasProgress().price).toBe(0);
    expect(text(m.q('[data-testid="open-flag-atlas-first"]')!)).toBe('Your first flag costs no Dust');
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

  it('bases: the tiles, the preview and a locked skin\'s info panel show each skin\'s own model (review 1)', async () => {
    const asked: { card: string; skin?: string }[] = [];
    m = mount({
      state: 'mid',
      routes: [{ id: 'home' }, { id: 'customize', tab: 'bases' }],
      portrait: (r) => {
        asked.push({ card: r.card, ...(r.skin ? { skin: r.skin } : {}) });
        return Promise.resolve(`data:image/png;base64,${btoa(`${r.card}|${r.skin ?? ''}`)}`);
      },
    });
    m.click('[data-testid="age-tab-medieval"]');
    await new Promise((r) => setTimeout(r, 0));
    flush();
    // the provider draws the skin's own model (or bakes a tint skin's tint): the skin goes with the base
    expect(asked).toContainEqual({ card: 'base.medieval', skin: 'rose_keep' });
    expect(asked).toContainEqual({ card: 'base.medieval' });
    const keep = m.q('[data-testid="base-mock-keep"]')!;
    expect(keep.getAttribute('data-skin')).toBe('baseSkin.rose_keep');
    expect(keep.querySelector('img')).not.toBeNull();
    // no tint multiplied over a picture any more (it recoloured the models)
    expect(m.qa('.cos-base__tint')).toHaveLength(0);
    // a locked skin: the first tap tries it on in the preview (round 2), the second opens its info
    // panel, which shows the same model, big (not the old flat drawing)
    m.click('[data-testid="item-baseSkin.snowy_keep"] button');
    expect(m.q('[data-testid="base-mock-keep"]')!.getAttribute('data-skin')).toBe('baseSkin.snowy_keep');
    expect(m.q('[data-testid="trying-baseSkin.snowy_keep"]')).not.toBeNull();
    expect(calls('equipCosmetic')).toEqual([]);
    m.click('[data-testid="item-baseSkin.snowy_keep"] button');
    await new Promise((r) => setTimeout(r, 0));
    flush();
    expect(m.q('[data-testid="info-baseSkin.snowy_keep"] .cos-base[data-skin="baseSkin.snowy_keep"]')).not.toBeNull();
    expect(asked).toContainEqual({ card: 'base.medieval', skin: 'snowy_keep' });
  });

  it('bases: Crystal Spire sits in the Future grid with the base skins, one skin per age across both systems (PLAN 2f interface 7)', () => {
    m = mount({ state: 'maxed', routes: [{ id: 'home' }, { id: 'customize', tab: 'bases' }], portrait: () => Promise.resolve('data:image/png;base64,AA==') });
    m.click('[data-testid="cust-age"] [data-testid="age-tab-future"]');
    const grid = m.q('[data-testid="cust-base-skins"]')!;
    expect(grid.querySelector('[data-testid="item-baseSkin.crystal_spire"]')).not.toBeNull();
    expect(grid.querySelector('[data-testid="item-baseSkin.midnight_neon"]')).not.toBeNull();
    // no second grid of skin cards any more (review 1: two card styles)
    expect(m.qa('.col-skin')).toHaveLength(0);
    // the maxed save flies Crystal Spire on Future: its card is the equipped one, and the preview shows it
    expect(m.q('[data-testid="item-baseSkin.crystal_spire"]')!.getAttribute('class')).toContain('is-on');
    expect(m.q('[data-testid="base-default"]')!.getAttribute('aria-pressed')).toBe('false');
    expect(m.q('[data-testid="base-mock-keep"]')!.getAttribute('data-skin')).toBe('baseSkin.crystal_spire');
    expect(text(m.q('[data-testid="stage-info-base"]')!)).toContain('Crystal Spire');
    // a cosmetic skin of the same age takes its place (meta clears the troop skin)
    m.click('[data-testid="item-baseSkin.midnight_neon"] button');
    expect(calls('equipCosmetic')).toContainEqual({ slot: 'baseSkin', age: 'future', key: 'baseSkin.midnight_neon' });
    // the standard base clears both
    m.click('[data-testid="base-default"]');
    expect(m.save.value.skins.equipped['base.future']).toBeUndefined();
  });

  it('bases: the whole set counts Crystal Spire; a new player sees it locked, tried on with one tap', () => {
    m = mount({ state: 'mid', routes: [{ id: 'home' }, { id: 'customize', tab: 'bases' }], portrait: () => Promise.resolve('data:image/png;base64,AA==') });
    m.click('[data-testid="cust-age"] [data-testid="age-tab-future"]');
    expect(text(m.q('[data-testid="found-baseSkin"]')!)).toMatch(/^\d+\/\d+ found$/);
    const tile = '[data-testid="item-baseSkin.crystal_spire"]';
    expect(m.q(tile)!.getAttribute('class')).toContain('is-locked');
    expect(m.q(`${tile} button`)!.getAttribute('aria-label')).toContain('Reach Arena 8');
    m.click(`${tile} button`);
    expect(m.q('[data-testid="base-mock-keep"]')!.getAttribute('data-skin')).toBe('baseSkin.crystal_spire');
    expect(m.save.value.skins.equipped['base.future']).toBeUndefined();
  });

  it('national flag tiles wait for the one flag atlas instead of asking every flag\'s picture (review 1)', () => {
    m = cust('flags');
    // no art provider in the harness: the tiles show their placeholder, never an empty image
    const tiles = m.qa('[data-testid="owned-national"] [data-testid^="item-nationalFlag."] .cos-tile__art');
    expect(tiles.length).toBeGreaterThan(1);
    for (const t of tiles) expect(t.querySelector('img, .cos-img--empty')).not.toBeNull();
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
describe('Customize: backdrops per age (owner item 20, PLAN 2b): a scene per age and one sky for all', () => {
  it('shows the live preview, the scene of the age and the skies; an owned sky equips with Undo', () => {
    m = cust('backdrops');
    expect(m.q('[data-testid="backdrop-mock"]')).not.toBeNull();
    // the age's classic scene, by its own name, and the classic sky (the scene's own daylight)
    expect(m.q('[data-testid="scene-classic"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(m.q('[data-testid="backdrop-classic"]')!.getAttribute('aria-pressed')).toBe('true');
    expect(text(m.q('[data-testid="backdrop-name"]')!)).toContain('Classic sky');
    // mid fixture: 3 of the skies owned, none equipped
    expect(text(m.q('[data-testid="found-backdrop"]')!)).toMatch(/^3\/\d+ found$/);
    m.click('[data-testid="item-backdrop.winterfall"] button');
    expect(calls('equipCosmetic')).toEqual([{ slot: 'backdrop', key: 'backdrop.winterfall' }]);
    expect(m.q('[data-testid="backdrop-look"]')!.getAttribute('data-skin')).toBe('backdrop.winterfall');
    expect(m.qa('[data-testid="toast"]')).toHaveLength(1);
    m.click('[data-testid="backdrop-classic"]');
    expect(calls('equipCosmetic')[1]).toEqual({ slot: 'backdrop', key: null });
  });

  it('names the sections "Scene · <Age>" and "Sky · all ages"; the skies are the Skies collection', () => {
    m = cust('backdrops');
    const heads = m.qa('.cust-h').map((el) => text(el));
    expect(heads.some((h) => /^Scene · .+ Age/.test(h))).toBe(true);
    expect(heads).toContain('Sky · all ages');
    expect(text(m.q('[data-testid="found-backdrop"]')!)).toMatch(/found$/);
  });

  it('a locked sky can be tried on in the preview but never equipped, and says how it is earned', () => {
    m = cust('backdrops');
    const tile = '[data-testid="item-backdrop.northern_lights"]';
    expect(m.q(tile)!.getAttribute('class')).toContain('is-locked');
    expect(m.q(`${tile} button`)!.getAttribute('aria-label')).toContain('Found in Wardrobe Crates');
    m.click(`${tile} button`);
    expect(calls('equipCosmetic')).toEqual([]);
    expect(m.q('[data-testid="backdrop-look"]')!.getAttribute('data-skin')).toBe('backdrop.northern_lights');
    expect(text(m.q('[data-testid="backdrop-name"]')!)).toContain('Trying on');
    expect(m.q('[data-testid="stage-info-sky"]')!.getAttribute('class')).toContain('is-trying');
    // a second tap on the one tried on opens how it is earned (and the craft)
    m.click(`${tile} button`);
    expect(m.q('[data-testid="info-backdrop.northern_lights"]')).not.toBeNull();
    // the road one names its node
    expect(m.q('[data-testid="item-backdrop.eclipse"] button')!.getAttribute('aria-label')).toContain('Trophy Road at 3500 trophies');
  });

  it('switches the age the preview and the scene list show', () => {
    m = cust('backdrops');
    m.click('[data-testid="cust-bd-age"] [data-testid="age-tab-cosmic"]');
    expect(m.q('[data-testid="backdrop-look"]')!.getAttribute('data-age')).toBe('cosmic');
    expect(text(m.q('[data-testid="scene-classic"]')!)).toContain('Crystal Moon Base');
  });

  it('lists only released scenes of the age; an owned one equips for that age only, with Undo', () => {
    const scenes = realContent.cosmetics.collections.items.filter((x) => x.collection === 'scene');
    // a content variant where the Stone scenes are out, the first owned
    const released = { ...realContent, cosmetics: { ...realContent.cosmetics, collections: { ...realContent.cosmetics.collections, items: realContent.cosmetics.collections.items.map((x) => (x.collection === 'scene' && x.age === 'stone' ? { ...x, released: true } : x)) } } };
    const stone = scenes.filter((x) => x.age === 'stone');
    const save = fixtureSave(released, 'mid');
    save.cosmetics.owned = [...save.cosmetics.owned, `scene.${stone[0]!.id}`];
    m = mount({ save, content: released, routes: [{ id: 'home' }, { id: 'customize', tab: 'backdrops' }] });
    m.click('[data-testid="cust-bd-age"] [data-testid="age-tab-stone"]');
    const grid = m.q('[data-testid="scene-grid"]')!;
    for (const x of stone) expect(grid.querySelector(`[data-testid="item-scene.${x.id}"]`), x.id).not.toBeNull();
    // other ages' scenes stay out of the Stone list (and unreleased ones everywhere)
    expect(grid.querySelectorAll('[data-testid^="item-scene."]')).toHaveLength(stone.length);
    m.click(`[data-testid="item-scene.${stone[0]!.id}"] button`);
    expect(calls('equipCosmetic')).toEqual([{ slot: 'scene', age: 'stone', key: `scene.${stone[0]!.id}` }]);
    expect(m.qa('[data-testid="toast"]')).toHaveLength(1);
    // the locked one is tried on in the preview
    m.click(`[data-testid="item-scene.${stone[1]!.id}"] button`);
    expect(calls('equipCosmetic')).toHaveLength(1);
    expect(m.q('[data-testid="backdrop-look"]')!.getAttribute('data-scene')).toBe(`scene.${stone[1]!.id}`);
  });
});

describe('Customize: the desktop column and the emotes (round 2)', () => {
  it('shows what the preview shows in an info card (the column under the preview was empty)', () => {
    m = cust('bases');
    expect(m.q('[data-testid="stage-info"]')).not.toBeNull();
    expect(text(m.q('[data-testid="stage-info-base"]')!)).toMatch(/Base skin · .+ Age/);
  });

  it('draws the starter emotes as your own General performing them, the same component as the HUD', () => {
    m = cust('emotes');
    for (const id of ['laugh', 'salute', 'cry', 'angry', 'thumbsUp', 'gg']) {
      const head = m.q(`[data-testid="item-${id}"] .emo-v`);
      expect(head, id).not.toBeNull();
      expect(head!.getAttribute('data-emote')).toBe(id);
    }
    // the wheel too, and the stage under it plays the one you last picked
    expect(m.q('[data-testid="emote-wheel"] [data-testid="wheel-laugh"] .emo-v')).not.toBeNull();
    m.click('[data-testid="item-cry"]');
    expect(m.q('[data-testid="emote-stage"] .emo-v')!.getAttribute('data-emote')).toBe('cry');
  });
});

describe('Customize: NEW until seen (save v15 `cosmetics.fresh`)', () => {
  const withFresh = (...keys: string[]) => {
    const s = fixtureSave(realContent, 'mid');
    return { ...s, cosmetics: { ...s.cosmetics, fresh: keys } };
  };
  const open = (tab: string, ...keys: string[]) => mount({ save: withFresh(...keys), routes: [{ id: 'home' }, { id: 'customize', tab: tab as 'flags' }] });

  it('a tab holding NEW items wears a dot; opening it marks them seen, and the cards keep their pip for this visit', () => {
    m = open('troops', 'emote.clap', 'baseSkin.rose_keep');
    expect(m.q('[data-testid="tab-new-emotes"]')).not.toBeNull();
    expect(m.q('[data-testid="tab-new-bases"]')).not.toBeNull();
    expect(m.q('[data-testid="tab-new-flags"]')).toBeNull();
    expect(calls('markCosmeticsSeen')).toEqual([]);
    m.click('[data-testid="tab-emotes"]');
    expect(calls('markCosmeticsSeen')).toEqual([['emote.clap']]);
    expect(m.save.value.cosmetics.fresh).toEqual(['baseSkin.rose_keep']);
    expect(m.q('[data-testid="tab-new-emotes"]')).toBeNull();
    expect(m.q('[data-testid="new-emote.clap"]')).not.toBeNull();
    expect(m.q('[data-testid="new-emote.heart"]')).toBeNull();
    // away and back: still NEW for this visit, and nothing more to mark
    m.click('[data-testid="tab-flags"]');
    m.click('[data-testid="tab-emotes"]');
    expect(m.q('[data-testid="new-emote.clap"]')).not.toBeNull();
    expect(calls('markCosmeticsSeen')).toHaveLength(1);
    expect(m.q('[data-testid="tab-new-bases"]')).not.toBeNull();
  });

  it('a NEW base skin opens the Bases tab on its age', () => {
    m = open('bases', 'baseSkin.rose_keep');
    expect(m.q('[data-testid="base-stage"]')!.getAttribute('data-age')).toBe('medieval');
    expect(m.q('[data-testid="new-baseSkin.rose_keep"]')).not.toBeNull();
    expect(calls('markCosmeticsSeen')).toEqual([['baseSkin.rose_keep']]);
  });

  it('a key the save does not own or the content does not know lights no dot and is never marked', () => {
    m = open('troops', 'emote.wow', 'emote.not_in_any_content');
    expect(m.q('[data-testid="tab-new-emotes"]')).toBeNull();
    m.click('[data-testid="tab-emotes"]');
    expect(calls('markCosmeticsSeen')).toEqual([]);
    expect(m.q('[data-testid="new-emote.wow"]')).toBeNull();
  });
});
