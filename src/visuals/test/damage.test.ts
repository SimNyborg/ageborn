/**
 * Visible battle damage, the pure part (queue item 40, design 3.2-3.5): stages and their hysteresis, marks chosen from
 * the view seed and keyed to the blow, the bundle's schema, the family table, emitters, weary motion. Presentation only:
 * the same seed and the same steps always give the same marks (a replay draws what the film drew).
 */
import { describe, expect, it } from 'vitest';
import { DamageBundles, parseDamageBundle, parseDamageUnit } from '../damage/bundle';
import { emittersFor } from '../damage/emitters';
import { damageSlug, fallbackFamily, familyTable, woodenBody } from '../damage/families';
import { BOLD_MARK_SCALE, chooseMark, MARK_KIT, markParts, markSizeLu, markSlots, SMALL_MARK_SCALE, spotCapacity, stripPart } from '../damage/marks';
import { DamageModel, MEND_FADE_MS, variantSeed } from '../damage/model';
import { FLICKER_EVERY, TIRED_IDLE_RATE, WearyClock } from '../damage/motion';
import { burns, isMachine, marksAt, multiplyRgb, nextStage, stageTint, STAGE_ENTER_BP } from '../damage/stage';
import { DAMAGE_FAMILIES, type DamageFamily, type DamageSpot, type DamageStage } from '../damage/types';
import { getPart } from '../parts/registry';
import '../damage/kit';

const FOOTMAN_SPOTS: DamageSpot[] = [
  { id: 'helmet', kind: 'mark', mat: 'metal', r: 5.5 },
  { id: 'shield', kind: 'mark', mat: 'wood', r: 9 },
  { id: 'tunic', kind: 'mark', mat: 'cloth', r: 6, team: true },
  { id: 'hem', kind: 'strip', mat: 'cloth', r: 10 },
  { id: 'back', kind: 'emit', mat: 'smoke', r: 6 },
];

describe('stages (design 3.2: 75/50/25% HP, 5 points of hysteresis on heals)', () => {
  it('enters at 75, 50 and 25 percent and goes straight to the deepest stage a blow reaches', () => {
    expect(nextStage(0, 10000)).toBe(0);
    expect(nextStage(0, 7501)).toBe(0);
    expect(nextStage(0, 7500)).toBe(1);
    expect(nextStage(1, 5000)).toBe(2);
    expect(nextStage(1, 2500)).toBe(3);
    expect(nextStage(0, 2000)).toBe(3);
    expect(nextStage(3, 0)).toBe(3);
    expect(STAGE_ENTER_BP).toEqual([7500, 5000, 2500]);
  });

  it('leaves a stage only 5 points above its line, one line at a time', () => {
    expect(nextStage(3, 2600)).toBe(3);
    expect(nextStage(3, 3000)).toBe(3);
    expect(nextStage(3, 3001)).toBe(2);
    expect(nextStage(2, 5400)).toBe(2);
    expect(nextStage(2, 5600)).toBe(1);
    // a full heal from stage 3 steps all the way back
    expect(nextStage(3, 10000)).toBe(0);
    expect(nextStage(1, 8000)).toBe(1);
    expect(nextStage(1, 8001)).toBe(0);
  });

  it('shows 1, then 2-3, then 3-4 marks; tints machines most, neutral (never more saturated, never lilac, blue or red)', () => {
    expect(marksAt(0, 1)).toBe(0);
    expect(marksAt(1, 1)).toBe(1);
    const two = new Set(Array.from({ length: 32 }, (_, i) => marksAt(2, i * 7)));
    const three = new Set(Array.from({ length: 32 }, (_, i) => marksAt(3, i * 7)));
    expect([...two].sort()).toEqual([2, 3]);
    expect([...three].sort()).toEqual([3, 4]);
    for (const f of DAMAGE_FAMILIES) {
      expect(stageTint(f, 0)).toBe(0xffffff);
      for (const s of [1, 2, 3] as DamageStage[]) {
        const t = stageTint(f, s);
        const r = (t >> 16) & 255;
        const g = (t >> 8) & 255;
        const b = t & 255;
        // neutral darkening: a grey multiply keeps every colour's saturation (a warm one would push the art's bronze,
        // leather and skin over the colour rule's 40% in the orange band)
        expect(Math.abs(r - g)).toBeLessThanOrEqual(1);
        expect(Math.abs(g - b)).toBeLessThanOrEqual(1);
        expect(r).toBeLessThan(255);
      }
    }
    expect(stageTint('vehicle', 3)).toBeLessThan(stageTint('soldier', 3));
    expect(multiplyRgb(0xffffff, 0x808080)).toBe(0x808080);
    expect(isMachine('vehicle') && isMachine('flyer') && isMachine('mech') && !isMachine('beast')).toBe(true);
  });
});

describe('the family table (design Appendix A)', () => {
  it('names all 82 non-soldier sheets (the Grand Marshal rides: review N4); soldiers and unknown units fall back to soldier, flyers by their tag', () => {
    expect(familyTable().size).toBe(12 + 13 + 14 + 19 + 9 + 9 + 6);
    expect(fallbackFamily('grand_marshal')).toBe('rider');
    expect(fallbackFamily('footman')).toBe('armoured');
    expect(fallbackFamily('tankette')).toBe('vehicle');
    expect(fallbackFamily('bonker')).toBe('soldier');
    expect(fallbackFamily('bonker@pumpkin_head')).toBe('soldier');
    expect(fallbackFamily('war_elephant@some-skin')).toBe('rider');
    expect(fallbackFamily('new_unit', { air: true })).toBe('flyer');
    expect(damageSlug('art/units/medieval/footman.json')).toBe('footman');
    expect(damageSlug('art/units/stone/bonker@pumpkin_head.x.hd.json')).toBe('bonker@pumpkin_head');
    expect(damageSlug('unit.war_chariot')).toBe('war_chariot');
    expect(woodenBody('war_chariot') && woodenBody('hide_shield') && !woodenBody('tankette')).toBe(true);
  });
});

describe('marks (design 3.2 "Variety and keying")', () => {
  it('every kit mark and strip is a registered part', () => {
    for (const p of [...markParts(), 'dmg.strip.cloth1', 'dmg.strip.cloth2', 'dmg.strip.cloth3', 'dmg.strip.cable1', 'dmg.strip.rope1']) expect(getPart(p), p).toBeDefined();
    expect(markParts().length).toBeGreaterThanOrEqual(30);
  });

  it('matches the blow where the surface allows: slash tears, blunt dents, shots hole, blasts scorch', () => {
    expect(chooseMark('cloth', 2, 'slash', 'soldier', 0).kind).toBe('tear');
    expect(chooseMark('metal', 1, 'blunt', 'soldier', 0).kind).toBe('dent');
    expect(chooseMark('metal', 1, 'bullet', 'soldier', 0).kind).toBe('hole');
    expect(chooseMark('wood', 1, 'slash', 'soldier', 0).kind).toBe('splinter');
    expect(chooseMark('cloth', 1, 'blast', 'soldier', 0).kind).toBe('soot');
    // never soot on hide or fur (a beast's coat is its skin)
    for (const k of ['blunt', 'slash', 'pierce', 'bullet', 'laser', 'blast'] as const) expect(chooseMark('hide', 3, k, 'beast', 0).kind).not.toBe('soot');
    // a foot soldier's pelt and tunic tear where a beast's coat scuffs (A-S2: a dark-cored mark reads on a small body)
    expect(chooseMark('hide', 1, 'blunt', 'soldier', 0).kind).toBe('tear');
    expect(chooseMark('hide', 1, 'blunt', 'beast', 0).kind).toBe('scuff');
    expect(chooseMark('cloth', 1, 'blunt', 'armoured', 0).kind).toBe('tear');
    expect(chooseMark('cloth', 1, null, 'soldier', 0).kind).toBe('tear');
    // without a blow the surface's own mark for the stage
    expect(chooseMark('stone', 1, null, 'mech', 0).kind).toBe('chip');
    expect(chooseMark('stone', 3, null, 'mech', 0).kind).toBe('shatter');
    // machines lose plates from stage 2, armoured troops at stage 3; an effective hit draws bigger
    expect(chooseMark('metal', 2, 'blunt', 'vehicle', 0).kind).toBe('plate');
    expect(chooseMark('metal', 2, 'blunt', 'armoured', 0).kind).toBe('dent');
    expect(chooseMark('metal', 3, 'slash', 'armoured', 0).kind).toBe('plate');
    expect(chooseMark('cloth', 1, 'slash', 'soldier', 0, true).big).toBe(true);
    for (const mat of Object.keys(MARK_KIT) as (keyof typeof MARK_KIT)[]) {
      for (let v = 0; v < 6; v++) expect(getPart(chooseMark(mat, 2, null, 'soldier', v).part), `${mat} ${v}`).toBeDefined();
    }
  });

  it('fills a unit\'s spots in a seeded order with its biggest surface among the first two; big spots hold more', () => {
    expect(spotCapacity(5)).toBe(1);
    expect(spotCapacity(9)).toBe(2);
    expect(spotCapacity(14)).toBe(3);
    for (let seed = 1; seed < 40; seed++) {
      const slots = markSlots(FOOTMAN_SPOTS, seed);
      // three surfaces, the shield (r 9) holds two
      expect(slots.length).toBe(4);
      expect(slots.slice(0, 2).some((s) => s.spot === 'shield')).toBe(true);
      // an emitter or a strip is no surface for a mark
      expect(slots.every((s) => s.spot !== 'hem' && s.spot !== 'back')).toBe(true);
      for (const s of slots) expect(Math.hypot(s.dx, s.dy)).toBeLessThanOrEqual(0.7 * s.r);
    }
    expect(markSlots(FOOTMAN_SPOTS, 7)).toEqual(markSlots(FOOTMAN_SPOTS, 7));
    const orders = new Set(Array.from({ length: 20 }, (_, i) => markSlots(FOOTMAN_SPOTS, i + 1).map((s) => s.spot).join()));
    expect(orders.size).toBeGreaterThan(1);
    expect(markSlots(undefined, 3)).toEqual([]);
  });

  it('draws marks 6-9 lu across (bold enough for game scale), bigger for an effective hit', () => {
    for (const r of [5, 6, 8, 10, 14]) {
      expect(markSizeLu(r, false)).toBeGreaterThanOrEqual(6);
      expect(markSizeLu(r, false)).toBeLessThanOrEqual(9);
      expect(markSizeLu(r, true)).toBeGreaterThan(markSizeLu(r, false));
    }
    expect(stripPart('cloth', 5)).toMatch(/^dmg\.strip\.cloth[123]$/);
    expect(stripPart('metal', 5)).toBe('dmg.strip.cable1');
  });

  it("a foot soldier's first mark goes on its biggest team surface, boldest, the rest bigger; within the patch (A-S2)", () => {
    // a Javelineer-like body: the tunic (team, r 6) is the biggest team surface; the helmet (metal, r 7) is bigger but not team
    const spots: DamageSpot[] = [
      { id: 'helmet', kind: 'mark', mat: 'metal', r: 7 },
      { id: 'skirt', kind: 'mark', mat: 'cloth', r: 5, team: true },
      { id: 'tunic', kind: 'mark', mat: 'cloth', r: 6, team: true },
      { id: 'wrap', kind: 'mark', mat: 'cloth', r: 5, team: true },
    ];
    for (let seed = 1; seed < 30; seed++) {
      const small = markSlots(spots, seed, true);
      expect(small[0]).toMatchObject({ spot: 'tunic', slot: 0, scale: BOLD_MARK_SCALE });
      expect(small.slice(1).every((s) => s.scale === SMALL_MARK_SCALE)).toBe(true);
      // other families keep the standard size and order rule
      expect(markSlots(spots, seed).every((s) => s.scale === 1)).toBe(true);
    }
    for (const r of [5, 6, 8]) {
      const base = markSizeLu(r, false);
      expect(markSizeLu(r, false, SMALL_MARK_SCALE)).toBeGreaterThan(base);
      expect(markSizeLu(r, false, BOLD_MARK_SCALE)).toBeGreaterThan(markSizeLu(r, false, SMALL_MARK_SCALE) - 1e-9);
      expect(markSizeLu(r, false, BOLD_MARK_SCALE)).toBeLessThanOrEqual(Math.max(base, 1.75 * r));
    }
    // the model gives a soldier and an armoured troop the bold first mark, a beast the standard one
    expect(new DamageModel('soldier', 3, spots).update(7000, 0)?.mark?.slot.scale).toBe(BOLD_MARK_SCALE);
    expect(new DamageModel('armoured', 3, spots).update(7000, 0)?.mark?.slot.scale).toBe(BOLD_MARK_SCALE);
    expect(new DamageModel('beast', 3, spots).update(7000, 0)?.mark?.slot.scale).toBe(1);
  });
});

describe('the damage model of a unit view', () => {
  it('accumulates marks keyed to the blows, reports each step once with its new mark, and never moves old marks', () => {
    const m = new DamageModel('armoured', 1234, FOOTMAN_SPOTS);
    expect(m.update(9000, 0)).toBeNull();
    m.noteBlow('slash');
    const s1 = m.update(7400, 100);
    expect(s1).toMatchObject({ stage: 1, prev: 0, mend: false, kind: 'slash' });
    expect(m.marks.length).toBe(1);
    const first = { ...m.marks[0]! };
    expect(s1!.mark).toBe(m.marks[0]);
    m.noteBlow('blunt');
    const s2 = m.update(4900, 200);
    expect(s2!.stage).toBe(2);
    expect(m.marks.length).toBeGreaterThanOrEqual(2);
    expect(m.marks[0]).toMatchObject({ part: first.part, slot: first.slot });
    // the strip hangs from stage 2 on
    expect(m.strip?.spot.id).toBe('hem');
    // no step while the stage holds
    expect(m.update(4000, 300)).toBeNull();
    const s3 = m.update(1000, 400);
    expect(s3!.stage).toBe(3);
    expect(m.marks.length).toBeGreaterThanOrEqual(3);
    expect(m.marks.length).toBeLessThanOrEqual(4);
  });

  it('a heal past the hysteresis line mends the newest marks (they fade), not the oldest', () => {
    const m = new DamageModel('soldier', 99, FOOTMAN_SPOTS);
    m.update(1000, 0);
    const n = m.marks.length;
    const oldest = m.marks[0]!.part;
    const mend = m.update(6000, 1000);
    expect(mend).toMatchObject({ stage: 1, prev: 3, mend: true });
    expect(m.marks.filter((x) => x.mendAt >= 0).length).toBe(n - 1);
    expect(m.marks[0]!.mendAt).toBe(-1);
    expect(m.marks[0]!.part).toBe(oldest);
    m.prune(1000 + MEND_FADE_MS + 1);
    expect(m.marks.length).toBe(1);
    expect(m.strip).toBeNull();
  });

  it('is deterministic: the same seed and steps give the same marks; another seed may differ', () => {
    const run = (seed: number): string[] => {
      const m = new DamageModel('armoured', seed, FOOTMAN_SPOTS);
      m.noteBlow('pierce');
      m.update(7000, 0);
      m.noteBlow('blunt', true);
      m.update(4000, 50);
      m.update(2000, 90);
      return m.marks.map((x) => `${x.slot.spot}/${x.slot.slot}:${x.part}:${x.big}`);
    };
    expect(run(42)).toEqual(run(42));
    const all = new Set(Array.from({ length: 12 }, (_, i) => run(i + 1).join('|')));
    expect(all.size).toBeGreaterThan(1);
    expect(variantSeed(5, 1)).toBe(variantSeed(5, 1));
    expect(variantSeed(5, 1)).not.toBe(variantSeed(5, 2));
  });

  it("spots that arrive late get the marks the unit's steps would have laid, silently", () => {
    const m = new DamageModel('armoured', 7, undefined);
    expect(m.hasMarks).toBe(false);
    m.noteBlow('slash');
    const s = m.update(4500, 0);
    expect(s!.mark).toBeNull();
    // no spots: the family's own surface speaks (an armoured troop's metal)
    expect(s!.mat).toBe('metal');
    m.setSpots(FOOTMAN_SPOTS, 500);
    expect(m.stage).toBe(2);
    expect(m.marks.length).toBeGreaterThanOrEqual(2);
    const direct = new DamageModel('armoured', 7, FOOTMAN_SPOTS);
    direct.noteBlow('slash');
    direct.update(4500, 0);
    expect(m.marks.map((x) => x.part)).toEqual(direct.marks.map((x) => x.part));
  });

  it("a vehicle's last step catches fire (ignite); a flyer's, a mech's and a soldier's do not (design 3.3, review S3)", () => {
    const ignites = (f: DamageFamily): boolean => new DamageModel(f, 1, undefined).update(2000, 0)!.ignite;
    expect(ignites('vehicle')).toBe(true);
    expect([ignites('flyer'), ignites('mech'), ignites('soldier'), ignites('beast')]).toEqual([false, false, false, false]);
    expect([burns('vehicle'), burns('flyer'), burns('mech')]).toEqual([true, false, false]);
  });

  it('a view first drawn hurt starts at its stage silently: marks laid and settled, no step (review N2)', () => {
    const m = new DamageModel('soldier', 7, [
      { id: 'chest', kind: 'mark', mat: 'cloth', r: 8 },
      { id: 'back', kind: 'mark', mat: 'cloth', r: 8 },
      { id: 'arm', kind: 'mark', mat: 'cloth', r: 6 },
    ]);
    m.settle(3000, 5000);
    expect(m.stage).toBe(2);
    expect(m.marks.length).toBeGreaterThan(0);
    // settled: born long before now, so nothing pops in
    expect(m.marks.every((k) => 5000 - k.bornMs >= 10_000)).toBe(true);
    // the next hit that crosses a line is a step as usual
    expect(m.update(2000, 5100)?.stage).toBe(3);
  });
});

describe('emitters (design 3.3)', () => {
  it('machines smoke from stage 2 and burn at stage 3 where `fireAt` found room; soldiers emit nothing; beasts breathe when tired', () => {
    const hull = { box: [0.55, 0.45] as const };
    expect(emittersFor('vehicle', 1, undefined, 60, hull)).toEqual([]);
    expect(emittersFor('vehicle', 2, undefined, 60, hull).map((e) => e.kind)).toEqual(['smoke']);
    expect(emittersFor('vehicle', 3, undefined, 60, hull).map((e) => e.kind).sort()).toEqual(['fire', 'smokeDark', 'spark']);
    expect(emittersFor('vehicle', 3, undefined, 60, hull).find((e) => e.kind === 'fire')?.at).toEqual(hull);
    // no place clear of the crew: smoke and sparks only (W0 review B1)
    expect(emittersFor('vehicle', 3, undefined, 60, null).map((e) => e.kind).sort()).toEqual(['smokeDark', 'spark']);
    expect(emittersFor('flyer', 3, undefined, 60, hull).map((e) => e.kind)).not.toContain('fire');
    expect(emittersFor('soldier', 3, undefined, 68)).toEqual([]);
    expect(emittersFor('beast', 3, undefined, 80).map((e) => e.kind)).toEqual(['breath']);
    expect(emittersFor('energy', 3, undefined, 80).map((e) => e.kind)).toEqual(['motes']);
    // emit spots speak for themselves; the one fire burns at its place, not at every smoke spot
    const spots: DamageSpot[] = [{ id: 'exhaust', kind: 'emit', mat: 'steam', r: 7 }];
    expect(emittersFor('vehicle', 3, spots, 60, hull)).toEqual([{ kind: 'steam', at: { spot: 'exhaust' }, rate: 2.4, size: 7 }]);
    const smoky: DamageSpot[] = [{ id: 'engine', kind: 'emit', mat: 'smoke', r: 6 }, { id: 'stack', kind: 'emit', mat: 'smoke', r: 5 }];
    const fires = emittersFor('vehicle', 3, smoky, 60, { spot: 'stack' }).filter((e) => e.kind === 'fire');
    expect(fires).toMatchObject([{ kind: 'fire', at: { spot: 'stack' }, rate: 3 }]);
    expect(fires[0]?.size).toBeCloseTo(4.8, 6);
    expect(emittersFor('vehicle', 3, smoky, 60, null).map((e) => e.kind)).toEqual(['smokeDark', 'smokeDark']);
  });
});

describe('weary motion (design 3.5: presentation only)', () => {
  it('tires soldiers and beasts at stage 3 only: a slower idle, a breath squash, a dip on every second contact', () => {
    const w = new WearyClock('soldier', 11);
    expect(w.update(16, 2, { moving: false, reduce: false }).idleRate).toBe(1);
    let squash = 0;
    for (let i = 0; i < 200; i++) squash = Math.max(squash, w.update(16, 3, { moving: false, reduce: false }).squash);
    expect(w.update(16, 3, { moving: false, reduce: false }).idleRate).toBe(TIRED_IDLE_RATE);
    expect(squash).toBeGreaterThan(0.01);
    expect(squash).toBeLessThanOrEqual(0.021);
    w.contact();
    expect(w.update(30, 3, { moving: true, reduce: false }).dipLu).toBe(0);
    w.contact();
    let dip = 0;
    for (let i = 0; i < 12; i++) dip = Math.max(dip, w.update(16, 3, { moving: true, reduce: false }).dipLu);
    expect(dip).toBeGreaterThan(1);
    expect(dip).toBeLessThanOrEqual(1.8);
  });

  it('machines judder and puff about every 1.2-1.8 s; Reduce motion keeps the puff, drops the judder', () => {
    const run = (reduce: boolean): { puffs: number; shift: number } => {
      const w = new WearyClock('vehicle', 5);
      let puffs = 0;
      let shift = 0;
      for (let t = 0; t < 10000; t += 16) {
        const p = w.update(16, 3, { moving: true, reduce });
        if (p.puff) puffs++;
        shift = Math.max(shift, Math.abs(p.shiftLu));
      }
      return { puffs, shift };
    };
    const full = run(false);
    expect(full.puffs).toBeGreaterThanOrEqual(5);
    expect(full.puffs).toBeLessThanOrEqual(9);
    expect(full.shift).toBeGreaterThan(0.2);
    expect(full.shift).toBeLessThanOrEqual(0.6);
    expect(run(true).shift).toBe(0);
  });

  it('energy bodies flicker never faster than about 1.5 Hz', () => {
    const w = new WearyClock('energy', 3);
    let pulses = 0;
    let on = false;
    for (let t = 0; t < 20000; t += 16) {
      const f = w.update(16, 3, { moving: false, reduce: false }).flicker > 0;
      if (f && !on) pulses++;
      on = f;
    }
    expect(pulses).toBeLessThanOrEqual(20000 / FLICKER_EVERY[3][0] + 1);
    expect(pulses).toBeGreaterThan(5);
  });

  it("an energy body's pulses keep their rhythm and their glitch side at any frame rate (review N1)", () => {
    /** The game times the pulses start at, and each pulse's glitch side, stepping at `dt`. */
    const pulsesAt = (dt: number): { at: number[]; side: number[] } => {
      const w = new WearyClock('energy', 3);
      const at: number[] = [];
      const side: number[] = [];
      let on = false;
      for (let t = dt; t <= 20000; t += dt) {
        const p = w.update(dt, 3, { moving: false, reduce: false });
        const f = p.flicker > 0;
        if (f && !on) {
          at.push(t);
          side.push(Math.sign(p.shiftLu));
        }
        // one side through a pulse
        if (f && on) expect(Math.sign(p.shiftLu)).toBe(side.at(-1));
        on = f;
      }
      return { at, side };
    };
    const a = pulsesAt(1000 / 60);
    const b = pulsesAt(1000 / 30);
    expect(a.at.length).toBeGreaterThan(5);
    expect(b.side).toEqual(a.side);
    // the same starts, within a frame of the slower rate
    expect(b.at.map((t, i) => Math.abs(t - (a.at[i] as number)) <= 1000 / 30 + 1e-6)).toEqual(b.at.map(() => true));
  });

  it('is deterministic for a seed', () => {
    const trace = (seed: number): number[] => {
      const w = new WearyClock('flyer', seed);
      const out: number[] = [];
      for (let t = 0; t < 5000; t += 20) out.push(w.update(20, 3, { moving: true, reduce: false }).dipLu);
      return out;
    };
    expect(trace(8)).toEqual(trace(8));
  });
});

describe('damage bundles (contract C1)', () => {
  const bundle = {
    v: 1,
    units: {
      footman: {
        family: 'armoured',
        spots: [...FOOTMAN_SPOTS, { id: 'bad', kind: 'mark', mat: 'jelly', r: 5 }],
        clips: { idle: { helmet: [[2, 60, 0, 100, 100]], shield: [[10, 40, 5, 90, 80]] } },
        torso: { idle: [[-8, 20, 8, 50]] },
        head: { idle: [[2, 60]] },
      },
      broken: { family: 'dragon' },
    },
  };

  it('keeps the entries and spots that fit the schema and drops the rest', () => {
    const b = parseDamageBundle(bundle)!;
    expect(Object.keys(b.units)).toEqual(['footman']);
    expect(b.units['footman']!.spots!.map((s) => s.id)).toEqual(['helmet', 'shield', 'tunic', 'hem', 'back']);
    expect(parseDamageBundle({ v: 2, units: {} })).toBeNull();
    expect(parseDamageUnit({ family: 'beast', clips: { idle: { a: [[1, 2]] } } })!.clips!['idle']).toEqual({});
  });

  it('loads an age once, in the background; a skin uses its unit\'s entry unless it has its own; a missing age is the fallback', async () => {
    let fetches = 0;
    const warn: string[] = [];
    const b = new DamageBundles(
      async (url) => {
        fetches++;
        if (url.endsWith('stone.json')) throw new Error(`${url}: 404`);
        return bundle;
      },
      () => '/base/',
      (m) => warn.push(m),
    );
    await Promise.all([b.request('medieval'), b.request('medieval')]);
    expect(fetches).toBe(1);
    expect(b.entry('footman')?.family).toBe('armoured');
    expect(b.entry('footman@crusader')?.family).toBe('armoured');
    await b.request('stone');
    expect(b.loaded('stone')).toBe(true);
    expect(warn).toEqual([]);
    expect(b.entry('bonker')).toBeNull();
  });

  it('reads a server\'s page in place of a missing bundle (the SPA fallback) as missing, without a warning', async () => {
    const real = globalThis.fetch;
    globalThis.fetch = (async () => new Response('<!doctype html><title>Ageborn</title>', { status: 200, headers: { 'content-type': 'text/html' } })) as typeof fetch;
    try {
      const warn: string[] = [];
      const b = new DamageBundles(undefined, () => '/', (m) => warn.push(m));
      await b.request('stone');
      expect(b.loaded('stone')).toBe(true);
      expect(b.entry('bonker')).toBeNull();
      expect(warn).toEqual([]);
    } finally {
      globalThis.fetch = real;
    }
  });
});
