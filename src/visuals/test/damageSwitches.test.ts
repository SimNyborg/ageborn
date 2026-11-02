/**
 * The damage runtime's dev switches (W0 WebKit-crash bisection, temporary; `?dev=1&dmgoff=...`): each part turns off on
 * its own, `all` turns everything off and asks for no bundle, and with no switch the runtime is unchanged.
 */
import { Container, Sprite, Texture } from 'pixi.js';
import { afterEach, describe, expect, it } from 'vitest';
import type { PartBaker } from '../bake';
import { DamageBundles } from '../damage/bundle';
import { damageOff, damageOffList, setDamageOff } from '../damage/switches';
import type { DamageStepEvent, DamageUnitData } from '../damage/types';
import { bakeDamageKit, UnitDamage } from '../damage/unitDamage';
import { createArtProvider } from '../provider';

afterEach(() => setDamageOff([]));

const anchors = { feet: { x: 0, y: 0 }, head: { x: 0, y: -60 }, muzzle: { x: 30, y: -30 }, hitCenter: { x: 0, y: -28 } };
/** Every frame of a spot at one place, fully shown. */
const at = (x: number, y: number): [number, number, number, number, number][] => [[x, y, 0, 100, 100]];

/** A machine with a mark spot, a strip spot, its torso and head tracked: it marks, hangs a strip, burns and steps. */
const ENTRY: DamageUnitData = {
  family: 'vehicle',
  spots: [
    { id: 'hull', kind: 'mark', mat: 'metal', r: 8, team: true },
    { id: 'tarp', kind: 'strip', mat: 'cloth', r: 6 },
  ],
  clips: { idle: { hull: at(10, 20), tarp: at(-10, 30) } },
  torso: { idle: [[-50, 0, 50, 50]] },
  head: { idle: [[-40, 52]] },
};

const BAKED = { origin: { x: -4, y: -4 }, bounds: { minX: -4, minY: -4, maxX: 4, maxY: 4 }, main: Texture.WHITE, team: null, teamStriped: null, over: null, white: Texture.WHITE };
const baker = { enabled: true, has: () => true, get: () => BAKED, flush: () => undefined, flushAll: () => undefined } as unknown as PartBaker;

function unit(): { d: UnitDamage; body: Container; base: Sprite; steps: DamageStepEvent[] } {
  const bundles = new DamageBundles(() => Promise.reject(new Error('404')), () => '/');
  bundles.add('modern', { v: 1, units: { switch_cart: ENTRY } });
  const body = new Container();
  const base = new Sprite(Texture.WHITE);
  body.addChild(base);
  new Container().addChild(body);
  const d = new UnitDamage({ body, after: base, baker, slug: 'switch_cart', heightLu: 80, anchors, team: 0x3a7bd5, seed: 7, bundles });
  const steps: DamageStepEvent[] = [];
  d.onStep((e) => steps.push(e));
  d.setFrame('idle', 0);
  d.setHp(10000);
  d.noteBlow('blunt', true);
  d.setHp(2000);
  d.layout(1);
  return { d, body, base, steps };
}

/** What a unit at its last stage shows: steps, emitters, tint, weary pose, and the marks and strip drawn. */
function shows(): { steps: number; stage: number; emitters: string[]; tinted: boolean; pose: boolean; drawn: number } {
  const { d, body, base, steps } = unit();
  const fx = d.emitters({ x: 0, y: 0, rotation: 0, sx: 1, sy: 1 }, 1);
  // the weary pose over a few seconds (a machine's judder or puff shows within them)
  let pose = false;
  for (let i = 0; i < 300; i++) {
    const p = d.update(16, false);
    if (p.shiftLu !== 0 || p.dipLu !== 0 || p.puff || p.pitchDeg !== 0 || p.squash !== 0 || p.idleRate !== 1) pose = true;
  }
  return {
    steps: steps.length,
    stage: d.stage,
    emitters: fx.map((e) => e.kind).sort(),
    tinted: d.tint !== 0xffffff,
    pose,
    drawn: body.children.filter((c) => c !== base && c.visible).length,
  };
}

describe('the damage runtime dev switches (W0 WebKit bisection)', () => {
  it('reads a list, ignores unknown names, and `all` covers every part', () => {
    setDamageOff(['strips', 'nonsense', 'bursts']);
    expect(damageOffList().sort()).toEqual(['bursts', 'strips']);
    expect(damageOff('strips')).toBe(true);
    expect(damageOff('marks')).toBe(false);
    setDamageOff(['all']);
    for (const p of ['strips', 'emitters', 'marks', 'bursts', 'tint', 'all'] as const) expect(damageOff(p)).toBe(true);
    setDamageOff([]);
    expect(damageOffList()).toEqual([]);
    expect(damageOff('all')).toBe(false);
  });

  it('with no switch the runtime is unchanged: a step, marks and a strip, emitters, the tint and weary motion', () => {
    const s = shows();
    expect(s).toMatchObject({ steps: 1, stage: 3, tinted: true, pose: true, drawn: 2 });
    expect(s.emitters.length).toBeGreaterThan(0);
  });

  it('each part turns off on its own', () => {
    const full = shows();
    setDamageOff(['strips']);
    expect(shows()).toEqual({ ...full, drawn: 1 });
    setDamageOff(['marks']);
    expect(shows()).toEqual({ ...full, drawn: 1 });
    setDamageOff(['marks', 'strips']);
    expect(shows()).toEqual({ ...full, drawn: 0 });
    setDamageOff(['emitters']);
    expect(shows()).toEqual({ ...full, emitters: [] });
    setDamageOff(['bursts']);
    expect(shows()).toEqual({ ...full, steps: 0 });
    setDamageOff(['tint']);
    expect(shows()).toEqual({ ...full, tinted: false, pose: false });
  });

  it('`all` keeps the unit at stage 0 (nothing shows), bakes no kit and asks for no bundle', () => {
    setDamageOff(['all']);
    expect(shows()).toEqual({ steps: 0, stage: 0, emitters: [], tinted: false, pose: false, drawn: 0 });
    expect(bakeDamageKit(baker)).toBeNull();
    const art = createArtProvider({ warn: () => {} }) as unknown as { damageBundleReady(age: string): Promise<void> | null; damageKitReady(): Promise<void> | null };
    expect(art.damageBundleReady('stone')).toBeNull();
    expect(art.damageKitReady()).toBeNull();
    setDamageOff(['marks']);
    expect(bakeDamageKit(baker)).toBeNull();
  });
});
