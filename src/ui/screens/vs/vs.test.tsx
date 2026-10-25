/**
 * VS shows what each half of the lane opens with (round 3, Track C): your equipped scene for the opening
 * age under your sky (VS showed no scene before), your base in that age's skin as the battle resolves it
 * (the troop-system skin first), and the opponent's own look's scene and sky (AI Generals keep the
 * classic). Only items the battle would draw show: owned, released, and a scene or skin of that age.
 */
import { content } from '@/content';
import type { FormatId, SaveDoc } from '@/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { fixtureOpponent, fixtureRequest } from '../fixtures/matches';
import { fixtureSave } from '../fixtures/saves';
import { mount, type Mounted } from '../test/harness';

let m: Mounted | null = null;
afterEach(() => {
  m?.unmount();
  m = null;
});

type Opponent = ReturnType<typeof fixtureOpponent>;

function vs(o: { save?: (s: SaveDoc) => SaveDoc; format: FormatId; foe?: (op: Opponent) => Opponent; which?: 'general' | 'player' }): Mounted {
  const base = fixtureSave(content, 'maxed');
  const save = o.save ? o.save(base) : base;
  const op = { ...fixtureOpponent(content, o.which ?? 'general'), format: o.format };
  return mount({
    save,
    routes: [{ id: 'home' }, { id: 'vs', request: fixtureRequest(o.which ?? 'general'), opponent: o.foe ? o.foe(op) : op }],
    portrait: () => Promise.resolve('data:image/png;base64,AA=='),
  });
}

/** Owns `keys` and equips them (scenes per age, a sky). */
const wearing =
  (o: { own?: string[]; scenes?: Record<string, string>; backdrop?: string | null; troop?: Record<string, string> }) =>
  (s: SaveDoc): SaveDoc => ({
    ...s,
    skins: { ...s.skins, owned: [...new Set([...s.skins.owned, ...Object.values(o.troop ?? {})])], equipped: { ...s.skins.equipped, ...(o.troop ?? {}) } },
    cosmetics: {
      ...s.cosmetics,
      owned: [...new Set([...s.cosmetics.owned, ...(o.own ?? [])])],
      equipped: { ...s.cosmetics.equipped, scenes: { ...(o.scenes ?? {}) }, ...(o.backdrop !== undefined ? { backdrop: o.backdrop } : {}) },
    },
  });

const attr = (sel: string, name: string): string | null => m!.q(sel)?.getAttribute(name) ?? null;

describe('VS shows each half as its lane opens (round 3)', () => {
  it('your scene for the opening age under your sky', () => {
    m = vs({ format: 'w1.bronze', save: wearing({ own: ['scene.aegean_harbour', 'backdrop.winterfall'], scenes: { bronze: 'scene.aegean_harbour' }, backdrop: 'backdrop.winterfall' }) });
    expect(attr('[data-testid="vs-backdrop"]', 'data-age')).toBe('bronze');
    expect(attr('[data-testid="vs-backdrop"]', 'data-scene')).toBe('scene.aegean_harbour');
    expect(attr('[data-testid="vs-backdrop"]', 'data-skin')).toBe('backdrop.winterfall');
    // the still itself is the scene under the sky
    expect(attr('[data-testid="vs-backdrop"] .cos-bd', 'data-scene')).toBe('scene.aegean_harbour');
    expect(attr('[data-testid="vs-backdrop"] .cos-bd', 'data-skin')).toBe('backdrop.winterfall');
    expect(m.q('.vs__half--me')!.getAttribute('class')).toContain('has-backdrop');
  });

  it("only the opening age's scene shows, and only what the battle would draw (owned, released, its own age)", () => {
    // equipped for a later age: the opening age keeps its classic scene
    m = vs({ format: 'w1.bronze', save: wearing({ own: ['scene.misty_moor'], scenes: { medieval: 'scene.misty_moor' } }) });
    expect(attr('[data-testid="vs-backdrop"]', 'data-scene')).toBe('');
    m.unmount();
    // a scene of another age in this age's slot (a broken save) never shows
    m = vs({ format: 'w1.bronze', save: wearing({ own: ['scene.misty_moor'], scenes: { bronze: 'scene.misty_moor' } }) });
    expect(attr('[data-testid="vs-backdrop"]', 'data-scene')).toBe('');
    m.unmount();
    // not owned
    m = vs({ format: 'w1.bronze', save: (s) => wearing({ scenes: { bronze: 'scene.aegean_harbour' } })({ ...s, cosmetics: { ...s.cosmetics, owned: s.cosmetics.owned.filter((k) => k !== 'scene.aegean_harbour') } }) });
    expect(attr('[data-testid="vs-backdrop"]', 'data-scene')).toBe('');
    m.unmount();
    // an unreleased scene (its art is not finished), even when a save holds it
    const held = content.cosmetics.collections.items.find((x) => x.collection === 'scene' && x.released === false);
    if (held) {
      const key = `scene.${held.id}`;
      m = vs({ format: `w1.${held.age}` as FormatId, save: wearing({ own: [key], scenes: { [held.age!]: key } }) });
      expect(attr('[data-testid="vs-backdrop"]', 'data-scene')).toBe('');
    }
  });

  it("your base wears the opening age's skin as the battle resolves it: the troop-system skin first", () => {
    m = vs({ format: 'w1.future', save: (s) => wearing({ troop: { 'base.future': 'crystal_spire' } })({ ...s, cosmetics: { ...s.cosmetics, equipped: { ...s.cosmetics.equipped, baseSkins: { future: 'baseSkin.midnight_neon' } } } }) });
    expect(attr('[data-testid="vs-base-me"]', 'data-skin')).toBe('baseSkin.crystal_spire');
    m.unmount();
    m = vs({ format: 'w1.future', save: (s) => ({ ...s, skins: { ...s.skins, equipped: {} }, cosmetics: { ...s.cosmetics, owned: [...s.cosmetics.owned, 'baseSkin.midnight_neon'], equipped: { ...s.cosmetics.equipped, baseSkins: { future: 'baseSkin.midnight_neon' } } } }) });
    expect(attr('[data-testid="vs-base-me"]', 'data-skin')).toBe('baseSkin.midnight_neon');
  });

  it("the found player's scene and sky show on its half; an AI General keeps the classic", () => {
    m = vs({ format: 'w1.bronze', which: 'player', foe: (op) => ({ ...op, side: { ...op.side, look: { ...op.side.look!, scenes: { bronze: 'scene.aegean_harbour' }, backdrop: 'backdrop.golden_dusk' } } }) });
    expect(attr('[data-testid="vs-backdrop-foe"]', 'data-scene')).toBe('scene.aegean_harbour');
    expect(attr('[data-testid="vs-backdrop-foe"]', 'data-skin')).toBe('backdrop.golden_dusk');
    m.unmount();
    m = vs({ format: 'w1.bronze' });
    expect(attr('[data-testid="vs-backdrop-foe"]', 'data-scene')).toBe('');
    expect(attr('[data-testid="vs-backdrop-foe"]', 'data-skin')).toBe('');
  });
});
