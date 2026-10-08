/**
 * The cosmetic collections in a match (DESIGN A18.9.4): both sides carry a base look (only owned
 * items for the player, never a national flag for an AI), and the HUD wheel holds owned emotes and
 * quotes only.
 */
import { signal } from '@preact/signals';
import { describe, expect, it } from 'vitest';
import type { Result, SaveDoc } from '@/contracts';
import { FixedClock } from '@/contracts/fakes/clock';
import { content } from '@/content';
import { i18n } from '@/i18n';
import { meta } from '@/meta';
import { emoteWheelOf, flagServices } from '../cosmetics';
import { generalOpponent, matchSetupFor, tutorialMatch1 } from '../matchSetup';

const fresh = (): SaveDoc => meta.newSave(content, new FixedClock(Date.UTC(2026, 8, 28, 12)), 7);
const kettle = generalOpponent(content, { generalId: 'kettle', displayName: 'Captain Kettle', tier: 1, level: 1, format: 'short', seed: 1 });

describe('match looks (A18.9.4)', () => {
  it('gives the player their owned look and the AI a seeded look without a national flag', () => {
    const s = fresh();
    const own: SaveDoc = {
      ...s,
      cosmetics: {
        owned: [...s.cosmetics.owned, 'nationalFlag.dk', 'decoration.lion_statue'],
        equipped: { ...s.cosmetics.equipped, nationalFlag: 'nationalFlag.dk', decorations: ['decoration.lion_statue', null, 'decoration.fern'] },
      },
    };
    const setup = matchSetupFor(own, kettle, 'skirmish', content);
    const [me, ai] = setup.config.sides;
    expect(me.look).toMatchObject({ baseFlag: 'baseFlag.ember', nationalFlag: 'nationalFlag.dk', decorations: ['decoration.lion_statue', null, 'decoration.fern'] });
    expect(ai.isBot).toBe(true);
    expect(ai.look?.nationalFlag).toBeNull();
    expect(ai.look?.baseFlag).toMatch(/^baseFlag\./);
    // the same General always shows the same look
    expect(matchSetupFor(own, kettle, 'skirmish', content).config.sides[1].look).toEqual(ai.look);
  });

  it('never shows an item the player does not own', () => {
    const s = fresh();
    const tampered: SaveDoc = { ...s, cosmetics: { ...s.cosmetics, equipped: { ...s.cosmetics.equipped, nationalFlag: 'nationalFlag.us', baseSkins: { stone: 'baseSkin.frost_cave' } } } };
    const me = matchSetupFor(tampered, kettle, 'skirmish', content).config.sides[0];
    expect(me.look?.nationalFlag).toBeNull();
    expect(me.look?.baseSkins).toEqual({});
  });

  it('carries the scenes (save v14) into the match config: the player owns none yet, the AI keeps the classics', () => {
    const s = fresh();
    const setup = matchSetupFor(s, kettle, 'skirmish', content);
    expect(setup.config.sides[0].look?.scenes).toEqual({});
    expect(setup.config.sides[1].look?.scenes).toEqual({});
  });

  it('dresses the training match too', () => {
    const setup = tutorialMatch1(fresh(), content, 'Old Grogg');
    expect(setup.config.sides[0].look?.baseFlag).toBe('baseFlag.ember');
    expect(setup.config.sides[1].look).toBeDefined();
  });
});

describe('the HUD wheel', () => {
  it('holds the equipped emotes and quotes that are owned', () => {
    const s = fresh();
    const w = emoteWheelOf({ ...s, cosmetics: { ...s.cosmetics, equipped: { ...s.cosmetics.equipped, emotes: ['gg', 'emote.party'], quotes: ['quote.glhf', 'quote.honour'] } } }, content);
    // the player's General rides along: the HUD's quote bubble shows its head (PLAN 2a)
    expect(w).toEqual({ emotes: ['gg'], quotes: ['quote.glhf'], quoteCooldownMs: content.cosmetics.collections.quoteCooldownMs, speaker: s.profile.avatar });
    expect(emoteWheelOf(null, content)).toBeNull();
  });
});

describe('the Flag Atlas services (PLAN 2d)', () => {
  function wired(dust: number) {
    const save = signal<SaveDoc>({ ...fresh(), currencies: { amber: 0, dust } });
    const commits: boolean[] = [];
    const apply = (r: Result<SaveDoc>, immediate = false) => {
      if (!r.ok) return { ok: false as const, reason: r.reason };
      save.value = r.value;
      commits.push(immediate);
      return { ok: true as const };
    };
    return { save, commits, svc: flagServices({ meta, content, save, i18n, apply }) };
  }

  it('buys through meta and commits at once (a Dust spend never waits for the debounce)', () => {
    const w = wired(1000);
    expect(w.svc.flagAtlasProgress().price).toBe(0);
    expect(w.svc.buyNationalFlag('nationalFlag.dk')).toEqual({ ok: true });
    expect(w.save.value.cosmetics.owned).toContain('nationalFlag.dk');
    expect(w.commits).toEqual([true]);
    expect(w.svc.flagAtlasProgress()).toMatchObject({ owned: 1, price: 500 });
    expect(w.svc.buyNationalFlag('nationalFlag.br')).toEqual({ ok: true });
    expect(w.save.value.currencies.dust).toBe(500);
    expect(w.svc.buyNationalFlag('nationalFlag.br')).toEqual({ ok: false, reason: 'owned' });
  });

  it('searches the flags by name, alias and code, as keys', () => {
    const w = wired(0);
    expect(w.svc.searchFlags('holland')).toEqual(['nationalFlag.nl']);
    expect(w.svc.searchFlags('den')).toEqual(['nationalFlag.dk']);
    // the released flags only (Track D adds rows `released: false` until their art is in)
    expect(w.svc.searchFlags('').length).toBe(content.cosmetics.collections.items.filter((x) => x.collection === 'nationalFlag' && x.released !== false).length);
  });
});
