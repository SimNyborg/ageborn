/**
 * Base skins and the base dressing (DESIGN A18.9.4; PLAN 2c): every released base skin has art (its tint
 * fallback until its model ships), the Customize preview's tint and particle layers, the model thumbnail
 * hook, and the dressing that seats the flags and decorations in their anchors (mirrored for side 1),
 * restyles the base and cleans up. Owned by Track B.
 */
import { Container } from 'pixi.js';
import { describe, expect, it, vi } from 'vitest';
import type { BaseView } from '@/contracts/art';
import { content } from '@/content';
import { cosmeticImageUrl, cosmeticSvg, hasCosmeticArt } from '../cosmetics/art';
import { baseSkinArt, baseSkinThumbUrl, BASE_SKINS, hasBaseSkinArt } from '../cosmetics/baseSkins';
import { BaseDressing, DRESSING_ANCHORS } from '../cosmetics/dressing';
import { createArtProvider } from '../provider';

const FROST = BASE_SKINS.frost_cave!.tint;
const ROSE = BASE_SKINS.rose_keep!.tint;
const skins = content.cosmetics.collections.items.filter((x) => x.collection === 'baseSkin' && x.released !== false);

function fakeBase(): BaseView & { tints: (number | null)[] } {
  const tints: (number | null)[] = [];
  return {
    root: new Container(),
    tints,
    mountPoints: () => [],
    setCrumble: () => {},
    setTreasury: () => {},
    morphTo: () => {},
    lastStandGlow: () => {},
    hit: () => {},
    collapse: () => {},
    update: () => {},
    destroy: () => {},
    setSkinTint: (t: number | null) => tints.push(t),
  } as BaseView & { tints: (number | null)[]; setSkinTint: (t: number | null) => void };
}

describe('base skins', () => {
  it('draws every released base skin of the content', () => {
    for (const x of skins) expect(hasBaseSkinArt(x.id) && hasCosmeticArt('baseSkin', x.id), x.id).toBe(true);
  });

  it('reads the lane look from a baseSkin key only', () => {
    expect(baseSkinArt('baseSkin.frost_cave')).toBe(BASE_SKINS.frost_cave);
    expect(baseSkinArt('decoration.fern')).toBeNull();
    expect(baseSkinArt(null)).toBeNull();
  });

  it('has no pre-rendered thumbnail until the model atlas is in', () => {
    expect(baseSkinThumbUrl('frost_cave')).toBeNull();
  });
});

describe('the base skin of every age (createBase `skins`, save v14)', () => {
  it('each age resolves its own skin through an evolve; a skin without a model draws the plain base silently', () => {
    const warn = vi.fn();
    const art = createArtProvider({ warn, dpr: 1 });
    // Stone wears a cosmetic skin still on its tint (no model yet), Future the troop-system Crystal Spire
    const b = art.createBase({ age: 'stone', skins: { stone: 'frost_cave', future: 'crystal_spire' }, side: 0, teamPreset: 'default' });
    expect(b.root.label).toBe('base.stone');
    b.morphTo('future', 1800);
    for (let t = 0; t < 1900; t += 50) b.update(50);
    expect(b.root.label).toBe('base.future@crystal_spire');
    b.destroy();
    // `skins[age]` wins over the older single `skin`
    const c = art.createBase({ age: 'future', skin: 'crystal_spire', skins: { future: 'midnight_neon' }, side: 1, teamPreset: 'default' });
    expect(c.root.label).toBe('base.future');
    c.destroy();
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('base skin layers for the Customize preview', () => {
  it('gives a tint swatch and a particle layer for base skins only, still under Reduce motion', () => {
    const tint = cosmeticSvg('baseSkin.frost_cave', { layer: 'tint' })!;
    expect(tint).toContain(`#${FROST.toString(16).padStart(6, '0')}`);
    expect(cosmeticSvg('baseSkin.frost_cave', { layer: 'fx' })).toContain('<animate');
    expect(cosmeticSvg('baseSkin.frost_cave', { layer: 'fx', animate: false })).not.toContain('<animate');
    expect(cosmeticSvg('nationalFlag.dk', { layer: 'tint' })).toBeNull();
    expect(cosmeticImageUrl('baseSkin.frost_cave', { layer: 'tint' })).not.toBe(cosmeticImageUrl('baseSkin.frost_cave'));
  });
});

describe('base dressing (A18.9.4)', () => {
  const look = {
    baseFlag: 'baseFlag.mammoth',
    nationalFlag: 'nationalFlag.dk',
    baseSkins: { stone: 'baseSkin.frost_cave', medieval: 'baseSkin.rose_keep' },
    decorations: ['decoration.lion_statue', null, 'decoration.fire_bowl'],
  };

  it('attaches to the base and seats the pole and decorations in their anchors', () => {
    const base = fakeBase();
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    expect(base.root.children).toContain(d.root);
    const xs = d.root.children.map((c) => Math.round(c.position.x));
    expect(xs).toContain(DRESSING_ANCHORS.pole);
    expect(xs).toContain(DRESSING_ANCHORS.decorations[0]);
    expect(xs).toContain(DRESSING_ANCHORS.decorations[2]);
    expect(xs).not.toContain(DRESSING_ANCHORS.decorations[1]);
    // the base skin tints the body at once
    expect(base.tints).toEqual([FROST]);
  });

  it('mirrors the anchors for side 1', () => {
    const d = new BaseDressing({ age: 'stone', side: 1, look, team: 0xf28a1e });
    const xs = d.root.children.map((c) => Math.round(c.position.x));
    expect(xs).toContain(-DRESSING_ANCHORS.pole);
    expect(xs).toContain(-DRESSING_ANCHORS.decorations[0]);
  });

  it('switches the skin on an evolve half-way through the morph, and clears it for an age without one', () => {
    const base = fakeBase();
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    d.setAge('medieval', 1000);
    d.update(100);
    expect(base.tints).toEqual([FROST]);
    for (let i = 0; i < 6; i += 1) d.update(100);
    expect(base.tints).toEqual([FROST, ROSE]);
    d.setAge('gunpowder', 0);
    d.update(16);
    expect(base.tints[base.tints.length - 1]).toBeNull();
  });

  it('keeps no pole without flags, topples on collapse and survives the base destroying it first', () => {
    const base = fakeBase();
    const bare = new BaseDressing({ age: 'stone', side: 0, look: { decorations: [] }, team: 0x2f7df6, base });
    expect(bare.root.children.filter((c) => Math.round(c.position.x) === DRESSING_ANCHORS.pole)).toHaveLength(0);
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6, base });
    d.hit();
    d.collapse();
    for (let i = 0; i < 12; i += 1) d.update(100);
    expect(d.root.children.every((c) => c.alpha <= 0.01 || c.children.length === 0)).toBe(true);
    base.root.destroy({ children: true });
    expect(() => d.destroy()).not.toThrow();
    expect(() => bare.destroy()).not.toThrow();
  });

  it('honours Reduce motion: no particles', () => {
    const d = new BaseDressing({ age: 'stone', side: 0, look, team: 0x2f7df6 });
    d.setMotion({ reduce: true, lite: false });
    for (let i = 0; i < 5; i += 1) d.update(50);
    const motes = d.root.children[d.root.children.length - 1]!;
    expect(motes.children.length).toBe(0);
    d.setMotion({ reduce: false, lite: false });
    d.update(50);
    expect(motes.children.length).toBeGreaterThan(0);
  });
});
