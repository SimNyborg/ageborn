import { describe, expect, it } from 'vitest';
import { CONTACT_DEFAULTS, DUEL_ROWS, springOffset, stage, type Reach, type StageUnit } from '../contact';

/** A Bonker-like club infantry: the tip lands 64 lu from the feet and the body lunges 13 lu (DIAGNOSIS P1). */
const CLUB: Reach = { tipLu: 64, lungeLu: 13, frontLu: 20, backLu: 18, torsoFrontLu: 15 };
const SPEAR: Reach = { tipLu: 95, lungeLu: 20, frontLu: 30, backLu: 16, torsoFrontLu: 14 };

function unit(o: Partial<StageUnit> & Pick<StageUnit, 'id' | 'side' | 'x'>): StageUnit {
  return { air: false, sizeLu: 24, target: null, reach: CLUB, body: null, ...o };
}

/** Drawn separation of a hitting b, along a's facing. */
function drawnGap(r: ReturnType<typeof stage>, a: StageUnit, b: StageUnit): number {
  const ax = a.x + (r.offset.get(a.id) ?? 0);
  const bx = b.x + (r.offset.get(b.id) ?? 0);
  return (bx - ax) * (a.side === 0 ? 1 : -1);
}

/** Where a's tip lands in b's front half (0 = b's front surface, 1 = b's centre line), lunge compensation in. */
function depthOf(r: ReturnType<typeof stage>, a: StageUnit, b: StageUnit): number {
  const comp = r.comp.get(a.id) ?? 0;
  const tip = (a.reach?.tipLu ?? 0) - comp * (a.reach?.lungeLu ?? 0);
  const front = b.reach?.torsoFrontLu ?? 14.4;
  return 1 - (drawnGap(r, a, b) - tip) / front;
}

describe('contact stand-off (A1)', () => {
  it('pulls a mirror duel apart so both clubs land in the front half of the other', () => {
    const a = unit({ id: 1, side: 0, x: 980, target: 2 });
    const b = unit({ id: 2, side: 1, x: 1017, target: 1 });
    const r = stage([a, b]);
    expect(r.pairs).toEqual([{ a: 1, b: 2 }]);
    // split: each moves the same distance away from its foe (side 0 left, side 1 right)
    const oa = r.offset.get(1) ?? 0;
    const ob = r.offset.get(2) ?? 0;
    expect(oa).toBeLessThan(0);
    expect(ob).toBeGreaterThan(0);
    expect(oa).toBeCloseTo(-ob, 5);
    for (const [x, y] of [[a, b], [b, a]] as const) {
      const d = depthOf(r, x, y);
      expect(d).toBeGreaterThanOrEqual(CONTACT_DEFAULTS.depthMin - 1e-6);
      expect(d).toBeLessThanOrEqual(CONTACT_DEFAULTS.depthMax + 1e-6);
    }
    // the bodies clear each other at the impact frame (torsos plus what is left of both lunges, plus air)
    const left = 13 * (1 - CONTACT_DEFAULTS.compMutual);
    expect(drawnGap(r, a, b)).toBeGreaterThanOrEqual(2 * 15 + 2 * left + CONTACT_DEFAULTS.clearLu - 1e-6);
    expect(r.engaged.has(1) && r.engaged.has(2)).toBe(true);
    expect(r.comp.get(1)).toBe(CONTACT_DEFAULTS.compMutual);
  });

  it('lets a second attacker follow a victim that stepped back from its own duel (a spear on a busy foe)', () => {
    const v = unit({ id: 1, side: 1, x: 1000, target: 2 });
    const a1 = unit({ id: 2, side: 0, x: 963, target: 1 });
    // the spear stands far back: past the plain 12 lu forward clamp once its victim has stepped back
    const a2 = unit({ id: 3, side: 0, x: 890, target: 1, reach: SPEAR });
    const r = stage([v, a1, a2]);
    expect(r.offset.get(1) ?? 0).toBeGreaterThan(10);
    expect(r.offset.get(3) ?? 0).toBeGreaterThan(CONTACT_DEFAULTS.maxForwardLu);
    const d = depthOf(r, a2, v);
    expect(d).toBeGreaterThanOrEqual(CONTACT_DEFAULTS.depthMin - 1e-6);
    expect(d).toBeLessThanOrEqual(CONTACT_DEFAULTS.depthMax + 1e-6);
  });

  it('meets a mismatched mirror pair where the short weapon still lands (a sword against a short flail)', () => {
    // the shipped Footman and Flailman (U's reach): windows that never meet, at the sim's 32.5 lu
    const SWORD: Reach = { tipLu: 67.3, lungeLu: 14.4, frontLu: 40, backLu: 20, torsoFrontLu: 16.8, torsoBackLu: 16 };
    const FLAIL: Reach = { tipLu: 35.1, lungeLu: 13.2, frontLu: 30, backLu: 20, torsoFrontLu: 18, torsoBackLu: 17 };
    const a = unit({ id: 1, side: 0, x: 961.3, target: 2, impactTick: 20, reach: SWORD });
    const b = unit({ id: 2, side: 1, x: 993.8, target: 1, impactTick: 20, reach: FLAIL });
    const r = stage([a, b]);
    const gap = drawnGap(r, a, b);
    const left = (l: number): number => l * (1 - CONTACT_DEFAULTS.compMutual);
    // the torsos clear each other (with what is left of both lunges)
    expect(gap).toBeGreaterThanOrEqual(16.8 + 18 + left(14.4) + left(13.2) - 1e-6);
    // the heads' extra room of a mirror exchange is not taken past the flail's reach (it was 76 lu)
    expect(gap).toBeLessThan(60);
    // the sword lands inside the flailman's torso (front surface to back surface), not through it
    const sword = 67.3 - CONTACT_DEFAULTS.compMutual * 14.4;
    expect(sword - (gap - 18 - left(13.2))).toBeGreaterThan(0);
    expect(sword - (gap - 18 - left(13.2))).toBeLessThan(18 + 17);
  });

  it('keeps room for both heads in a mirror exchange (both swings land on one tick), with a larger clamp', () => {
    // the shipped Bonker's attack A (U's reach table): a deep crouch whose head leads the torso
    const BONKER: Reach = { tipLu: 67.2, lungeLu: 12.7, frontLu: 60.2, backLu: 19.5, torsoFrontLu: 25.1 };
    const a = unit({ id: 1, side: 0, x: 978, target: 2, impactTick: 20, reach: BONKER });
    const b = unit({ id: 2, side: 1, x: 1015, target: 1, impactTick: 20, reach: BONKER });
    const apart = stage([a, b]);
    const mirror = stage([a, b].map((u) => ({ ...u, impactTick: 20 })));
    const offset = stage([a, { ...b, impactTick: 23 }]);
    expect(drawnGap(mirror, a, b)).toBeGreaterThan(drawnGap(offset, a, b) + 3);
    expect(drawnGap(apart, a, b)).toBeCloseTo(drawnGap(mirror, a, b), 5);
    for (const id of [1, 2]) expect(Math.abs(mirror.contact.get(id) ?? 0)).toBeLessThanOrEqual(CONTACT_DEFAULTS.mirrorMaxBackLu + 1e-6);
    // the tips still land inside the victims' bodies (shallower, never short)
    expect(depthOf(mirror, a, b)).toBeGreaterThanOrEqual(CONTACT_DEFAULTS.depthMin - 1e-6);
  });

  it('leaves a pair alone when the tips already land in the window', () => {
    const tip = CLUB.tipLu - CONTACT_DEFAULTS.compMutual * CLUB.lungeLu;
    const a = unit({ id: 1, side: 0, x: 900, target: 2 });
    const b = unit({ id: 2, side: 1, x: 900 + tip + 0.5 * (CLUB.torsoFrontLu ?? 0), target: 1 });
    const r = stage([a, b]);
    expect(r.offset.get(1) ?? 0).toBe(0);
    expect(r.offset.get(2) ?? 0).toBe(0);
  });

  it('moves a one-sided attacker alone, against where its victim is drawn', () => {
    const a = unit({ id: 1, side: 0, x: 980, target: 3 });
    const v = unit({ id: 3, side: 1, x: 1030, target: null });
    const r = stage([a, v]);
    expect(r.offset.get(3) ?? 0).toBe(0);
    expect(r.offset.get(1) ?? 0).toBeLessThan(0);
    const d = depthOf(r, a, v);
    expect(d).toBeCloseTo(CONTACT_DEFAULTS.depth, 5);
    expect(r.comp.get(1)).toBe(CONTACT_DEFAULTS.compSingle);
  });

  it('lets a victim that fights nobody step back by what the attacker cannot take', () => {
    const a = unit({ id: 1, side: 0, x: 980, target: 3 });
    const v = unit({ id: 3, side: 1, x: 1015, target: null });
    const r = stage([a, v]);
    expect(r.contact.get(1)).toBeCloseTo(-CONTACT_DEFAULTS.maxBackLu, 5);
    expect(r.contact.get(3) ?? 0).toBeGreaterThan(0);
    expect(depthOf(r, a, v)).toBeCloseTo(CONTACT_DEFAULTS.depth, 5);
    // a victim busy with its own duel does not move for a supporter
    const b = unit({ id: 4, side: 0, x: 990, target: 3 });
    const duel = { ...v, target: 4 };
    const r2 = stage([b, duel, a]);
    expect(r2.pairs).toEqual([{ a: 3, b: 4 }]);
    const alone = stage([b, duel]);
    expect(r2.contact.get(3)).toBeCloseTo(alone.contact.get(3) ?? 0, 5);
  });

  it('clamps the stand-off: at most 22 lu back and 12 lu forward per unit', () => {
    // a spear at a club's distance would need 50 lu back; a club 150 lu away would need far more than 12 forward
    const a = unit({ id: 1, side: 0, x: 980, target: 2, reach: SPEAR });
    const b = unit({ id: 2, side: 1, x: 1000, target: null });
    const back = stage([a, b]).contact.get(1) ?? 0;
    expect(back).toBeCloseTo(-CONTACT_DEFAULTS.maxBackLu, 5);
    const c = unit({ id: 3, side: 1, x: 1200, target: 4 });
    const d = unit({ id: 4, side: 0, x: 1050, target: null });
    const fwd = stage([c, d]).contact.get(3) ?? 0;
    expect(fwd).toBeCloseTo(-CONTACT_DEFAULTS.maxForwardLu, 5);
  });

  it('does not stage units without a reach, air units, a target behind, or forts', () => {
    const a = unit({ id: 1, side: 0, x: 980, target: 2, reach: null });
    const b = unit({ id: 2, side: 1, x: 1017, target: null });
    const flyer = unit({ id: 5, side: 0, x: 980, air: true, target: 2 });
    const behind = unit({ id: 6, side: 0, x: 1100, target: 2 });
    const wall = unit({ id: 7, side: 1, x: 1200, fort: true, target: null });
    const r = stage([a, b, flyer, behind, wall]);
    expect(r.contact.size).toBe(0);
    expect(r.offset.has(5)).toBe(false);
    expect(r.offset.has(7)).toBe(false);
    expect(r.row.get(5)).toBeLessThan(-100);
  });
});

describe('same-side spread (A1)', () => {
  it('fans a three-wide front at one x out, keeps the side in order and caps each unit', () => {
    const us = [unit({ id: 1, side: 0, x: 800 }), unit({ id: 2, side: 0, x: 800 }), unit({ id: 3, side: 0, x: 800 })];
    const r = stage(us);
    const xs = us.map((u) => u.x + (r.offset.get(u.id) ?? 0));
    // the sim order (id breaks the tie at one x) is kept: 1 ahead of 2 ahead of 3
    expect(xs[0]!).toBeGreaterThanOrEqual(xs[1]!);
    expect(xs[1]!).toBeGreaterThanOrEqual(xs[2]!);
    for (const u of us) expect(Math.abs(r.offset.get(u.id) ?? 0)).toBeLessThanOrEqual(CONTACT_DEFAULTS.spreadMaxLu + 1e-6);
    // they no longer draw as one figure: neighbours at least a few lu apart (rows help the rest)
    expect(xs[0]! - xs[1]!).toBeGreaterThan(3);
    expect(xs[1]! - xs[2]!).toBeGreaterThan(3);
  });

  it('lets a unit in contact hold its place: the one behind makes room', () => {
    const a = unit({ id: 1, side: 0, x: 980, target: 2 });
    const b = unit({ id: 2, side: 1, x: 1017, target: 1 });
    const behind = unit({ id: 3, side: 0, x: 975 });
    const alone = stage([a, b]);
    const r = stage([a, b, behind]);
    expect(r.offset.get(1)).toBeCloseTo(alone.offset.get(1) ?? 0, 5);
    const gap = a.x + (r.offset.get(1) ?? 0) - (behind.x + (r.offset.get(3) ?? 0));
    expect(gap).toBeGreaterThan(5);
  });

  it('needs no gap between units in rows far apart', () => {
    const us = [unit({ id: 1, side: 0, x: 600 }), unit({ id: 2, side: 0, x: 640 })];
    const r = stage(us);
    // 40 lu apart is already more than 0.55 of a body: nothing moves
    expect(r.offset.size).toBe(0);
  });
});

describe('rows (A1)', () => {
  it('puts a duel in one row, a second duel nearby in another, and interleaves the supporters', () => {
    const a1 = unit({ id: 1, side: 0, x: 980, target: 2 });
    const b1 = unit({ id: 2, side: 1, x: 1017, target: 1 });
    const a2 = unit({ id: 3, side: 0, x: 980, target: 2 });
    const b2 = unit({ id: 4, side: 1, x: 1017, target: 1 });
    const a3 = unit({ id: 5, side: 0, x: 975, target: 2 });
    const b3 = unit({ id: 6, side: 1, x: 1022, target: 1 });
    const r = stage([a1, b1, a2, b2, a3, b3]);
    expect(r.row.get(1)).toBe(r.row.get(2));
    expect(DUEL_ROWS as readonly number[]).toContain(r.row.get(1));
    // no foe supporter shares a row with one of ours (that would read as a duel that is not one)
    for (const ours of [3, 5]) for (const theirs of [4, 6]) expect(Math.abs((r.row.get(ours) ?? 0) - (r.row.get(theirs) ?? 0))).toBeGreaterThanOrEqual(9);
    // and nobody shares the duel's row
    for (const id of [3, 4, 5, 6]) expect(Math.abs((r.row.get(id) ?? 0) - (r.row.get(1) ?? 0))).toBeGreaterThanOrEqual(9);
  });

  it('gives two duels side by side different rows, and keeps rows sticky', () => {
    const us = [
      unit({ id: 1, side: 0, x: 980, target: 2 }),
      unit({ id: 2, side: 1, x: 1017, target: 1 }),
      unit({ id: 3, side: 0, x: 978, target: 4 }),
      unit({ id: 4, side: 1, x: 1015, target: 3 }),
    ];
    const r = stage(us);
    expect(r.pairs.length).toBe(2);
    expect(r.row.get(1)).not.toBe(r.row.get(3));
    // rows stay where they were while free (a second frame with the first frame's rows)
    const again = stage(us, r.row);
    expect([...again.row]).toEqual([...r.row]);
    // the duel that had row 16 keeps it even when the row-0 duel is gone
    const second = stage(us.slice(2), r.row);
    expect(second.row.get(3)).toBe(r.row.get(3));
  });

  it('spreads back ranks over five rows', () => {
    const us = Array.from({ length: 10 }, (_, i) => unit({ id: i + 1, side: 0, x: 600 - i * 15 }));
    const r = stage(us);
    const back = us.slice(4).map((u) => r.row.get(u.id));
    expect(new Set(back).size).toBe(5);
  });
});

describe('springOffset', () => {
  it('reaches its target, frame-rate independent and capped in speed', () => {
    const run = (dt: number): number[] => {
      const s = { x: 0, v: 0 };
      const out: number[] = [];
      for (let t = 0; t < 600; t += dt) out.push(springOffset(s, 20, 90, dt).x);
      return out;
    };
    const a = run(1000 / 60);
    const b = run(1000 / 30);
    expect(a[a.length - 1]).toBeCloseTo(20, 1);
    // at 300 ms both frame rates agree within a fraction of a lu
    expect(a[17]!).toBeCloseTo(b[8]!, 0);
    const s = { x: 0, v: 0 };
    springOffset(s, 100, 10, 100, 50);
    expect(s.x).toBeCloseTo(5, 5);
  });
});

describe('rows avoid neighbours (A1)', () => {
  it('moves a back rank off a row a nearby unit of its side already holds', () => {
    // a front rank sits on -22 (sticky); the back rank whose own pattern row is -22 takes another one
    const us = [
      unit({ id: 1, side: 1, x: 1017, target: null }),
      unit({ id: 2, side: 1, x: 1052, target: null }),
      unit({ id: 3, side: 1, x: 1164, target: null }),
      unit({ id: 4, side: 1, x: 1179, target: null }),
      unit({ id: 5, side: 1, x: 1193, target: null }),
    ];
    const prev = new Map([[3, -22]]);
    const r = stage(us, prev);
    expect(r.row.get(3)).toBe(-22);
    expect(r.row.get(5)).not.toBe(-22);
    for (const [a, b] of [[3, 4], [4, 5], [3, 5]] as const) expect(Math.abs((r.row.get(a) ?? 0) - (r.row.get(b) ?? 0))).toBeGreaterThanOrEqual(9);
  });
});

describe('big bodies (review A, S6)', () => {
  // the Tuskback, the Bonker and the Woolly Rhino of the review's stone_heavy film (sheet extents in lu)
  const tusk = (): StageUnit => ({ id: 1, side: 0, x: 924.7, air: false, sizeLu: 48, target: 2, reach: { tipLu: 92, lungeLu: 12.8, frontLu: 80.5, backLu: 45.1, torsoFrontLu: 25.8, torsoBackLu: 40.9 }, body: { front: 80.5, back: 45.1, torsoFront: 25.8, torsoBack: 40.9, headLead: true } });
  const bonk = (): StageUnit => ({ id: 2, side: 1, x: 973.1, air: false, sizeLu: 24, target: 1, reach: { tipLu: 67.2, lungeLu: 12.7, frontLu: 60.2, backLu: 19.5, torsoFrontLu: 25.1, torsoBackLu: 18.9 }, body: { front: 60.2, back: 19.5, torsoFront: 25.1, torsoBack: 18.9 } });
  const rhino = (o: Partial<StageUnit> = {}): StageUnit => ({ id: 3, side: 1, x: 977.5, air: false, sizeLu: 48, target: 1, reach: { tipLu: 85.7, lungeLu: 14.2, frontLu: 83.7, backLu: 46.7, torsoFrontLu: 32.9, torsoBackLu: 43 }, body: { front: 83.7, back: 46.7, torsoFront: 32.9, torsoBack: 43, headLead: true }, ...o });
  const drawn = (r: ReturnType<typeof stage>, u: StageUnit): number => u.x + (r.offset.get(u.id) ?? 0);

  it('a Rhino striking past its Bonker lands its horn in the Tuskback\'s head, not its shoulder: the beasts no longer stand inside each other', () => {
    const before = stage([tusk(), bonk(), rhino()], null, { bulkMax: 1, headShare: 0 });
    const after = stage([tusk(), bonk(), rhino()]);
    const overlap = (r: ReturnType<typeof stage>): number => drawn(r, tusk()) + 80.5 - (drawn(r, rhino()) - 83.7);
    expect(overlap(before)).toBeGreaterThan(55);
    expect(overlap(after)).toBeLessThan(42);
    // the Rhino's torso clears the Tuskback's tusk tips; its horn still reaches the Tuskback's head
    expect(drawn(after, rhino()) - 32.9).toBeGreaterThan(drawn(after, tusk()) + 80.5);
    const horn = drawn(after, rhino()) - 85.7 + 0.25 * 14.2;
    expect(horn).toBeLessThan(drawn(after, tusk()) + 80.5);
    expect(horn).toBeGreaterThan(drawn(after, tusk()) + 25.8);
    // and a big body may be drawn further than a small one's 22 lu (here the Tuskback, 28 lu back)
    expect(drawn(after, tusk()) - 924.7).toBeLessThan(-22);
  });

  it('two large beasts side by side part twice as far as before (their rows a step apart barely part bodies 130 lu long); infantry keep the small cap', () => {
    const big = (id: number, x: number): StageUnit => rhino({ id, side: 0, x, target: null });
    const gapOf = (r: ReturnType<typeof stage>): number => Math.abs(drawn(r, big(1, 900)) - drawn(r, big(2, 900)));
    const before = gapOf(stage([big(1, 900), big(2, 900)], null, { bulkMax: 1, headShare: 0 }));
    const after = gapOf(stage([big(1, 900), big(2, 900)]));
    expect(after).toBeGreaterThan(Math.max(20, 1.8 * before));
    const small = (id: number): StageUnit => unit({ id, side: 0, x: 900 });
    const s = stage([small(1), small(2), small(3), small(4)]);
    for (const id of [1, 2, 3, 4]) expect(Math.abs(s.offset.get(id) ?? 0)).toBeLessThanOrEqual(CONTACT_DEFAULTS.spreadMaxLu + 1e-6);
  });

  it('a large biped\'s frame front is the blade it holds out: its surface stays its torso, so a pike still reaches its body', () => {
    // the Greatsword Knight of the clash film (large, a heavy biped): its idle frame reaches 57 lu out with the blade,
    // its torso 19 lu; a Pikeman (reach 70) strikes it one-sided while the knight fights someone else
    const knight = (headLead: boolean): StageUnit => ({ id: 2, side: 1, x: 1000, air: false, sizeLu: 48, target: null, reach: { tipLu: 96.3, lungeLu: 14, frontLu: 56.9, backLu: 30, torsoFrontLu: 18.7, torsoBackLu: 20 }, body: { front: 56.9, back: 30, torsoFront: 18.7, torsoBack: 20, ...(headLead ? { headLead } : {}) } });
    const pike = (): StageUnit => ({ id: 1, side: 0, x: 1000 - 104, air: false, sizeLu: 32, target: 2, reach: { tipLu: 101.3, lungeLu: 15, frontLu: 54.5, backLu: 20, torsoFrontLu: 20, torsoBackLu: 18 }, body: { front: 54.5, back: 20, torsoFront: 20, torsoBack: 18 } });
    const biped = stage([pike(), knight(false)]);
    const beast = stage([pike(), knight(true)]);
    // treated as a beast's head, the blade would hold the pike further off
    expect(Math.abs(biped.offset.get(1) ?? 0)).toBeLessThan(Math.abs(beast.offset.get(1) ?? 0));
    // as a biped, the pike's tip lands past the knight's torso front, inside its body
    const tip = 896 + (biped.offset.get(1) ?? 0) + 101.3 - 0.25 * 15;
    expect(tip).toBeGreaterThan(1000 + (biped.offset.get(2) ?? 0) - 18.7);
  });

  it('a duel the small member\'s clamp cannot settle is finished by the big member\'s larger clamp', () => {
    const a = tusk();
    const b = bonk();
    b.x = a.x + 40;
    const r = stage([a, b]);
    expect(r.offset.get(2) ?? 0).toBeLessThanOrEqual(CONTACT_DEFAULTS.maxBackLu + 1e-6);
    expect(Math.abs(r.offset.get(1) ?? 0)).toBeGreaterThan(CONTACT_DEFAULTS.maxBackLu);
  });
});

describe('the approach (review A, S1)', () => {
  const walker = (o: Partial<StageUnit> & Pick<StageUnit, 'id' | 'side' | 'x'>): StageUnit => unit({ rangeLu: 16, ...o });
  /** The drawn gap of two Bonkers walking into each other, at sim separation `s` (contact at 16 + 24 = 40 lu). */
  const gapAt = (s: number): number => {
    const a = walker({ id: 1, side: 0, x: 1000 - s / 2 });
    const b = walker({ id: 2, side: 1, x: 1000 + s / 2 });
    const r = stage([a, b]);
    return s + Math.abs(r.offset.get(1) ?? 0) + Math.abs(r.offset.get(2) ?? 0);
  };

  it('eases two walking into each other to the stand-off the duel needs at contact: nothing far away, monotone, slowing to a stop', () => {
    const engagedGap = (() => {
      const a = unit({ id: 1, side: 0, x: 980, target: 2 });
      const b = unit({ id: 2, side: 1, x: 1020, target: 1 });
      const r = stage([a, b]);
      return 40 + Math.abs(r.offset.get(1) ?? 0) + Math.abs(r.offset.get(2) ?? 0);
    })();
    expect(gapAt(400)).toBeCloseTo(400, 6);
    expect(gapAt(40)).toBeCloseTo(engagedGap, 6);
    let prev = Infinity;
    let prevStep = Infinity;
    for (let s = 300; s >= 40; s -= 2) {
      const g = gapAt(s);
      expect(g).toBeLessThanOrEqual(prev + 1e-9);
      if (prev !== Infinity && s < 120) {
        // the drawn closing per 2 lu of sim closing shrinks toward 0 at contact
        expect(prev - g).toBeLessThanOrEqual(prevStep + 1e-6);
        prevStep = prev - g;
      }
      prev = g;
    }
    expect(gapAt(42) - gapAt(40)).toBeLessThan(0.1);
  });

  it('a pair the sim parks a few lu short of the contact distance is drawn on the duel\'s own stand-off: no step back when it engages', () => {
    // the sim stops a closing pair on the first tick within reach: anywhere from about 31 to 40 lu for two Bonkers
    for (const s of [39, 36.9, 33]) {
      const a = unit({ id: 1, side: 0, x: 1000 - s / 2, target: 2 });
      const b = unit({ id: 2, side: 1, x: 1000 + s / 2, target: 1 });
      const r = stage([a, b]);
      const engaged = s + Math.abs(r.offset.get(1) ?? 0) + Math.abs(r.offset.get(2) ?? 0);
      expect(gapAt(s)).toBeCloseTo(engaged, 6);
      // and the drawn pair stands still over that last closing (it never steps back)
      expect(gapAt(s)).toBeCloseTo(gapAt(40), 6);
    }
  });

  it('shares a duel row on the way in, marks the pair as approaching (not engaged), and leaves ranged units and fliers alone', () => {
    const a = walker({ id: 1, side: 0, x: 960 });
    const b = walker({ id: 2, side: 1, x: 1030 });
    const r = stage([a, b]);
    expect(r.approach).toEqual(new Set([1, 2]));
    expect(r.engaged.size).toBe(0);
    expect(r.pairs).toEqual([]);
    expect(r.row.get(1)).toBe(r.row.get(2));
    const archer = unit({ id: 3, side: 0, x: 960 });
    const foe = walker({ id: 4, side: 1, x: 1030 });
    const q = stage([archer, foe]);
    // the archer has no melee range: it is not staged; the foe walking up to it is (one-sided)
    expect(q.approach).toEqual(new Set([4]));
    expect(q.offset.get(3) ?? 0).toBe(0);
    const flier = walker({ id: 5, side: 0, x: 960, air: true });
    expect(stage([flier, walker({ id: 6, side: 1, x: 1030 })]).approach.has(5)).toBe(false);
  });

  it('a unit walking up to a foe that is already in a duel takes the one-sided stand-off against where that foe is drawn', () => {
    const ally = unit({ id: 1, side: 0, x: 980, target: 2 });
    const foe = unit({ id: 2, side: 1, x: 1020, target: 1 });
    const late = walker({ id: 3, side: 0, x: 950 });
    const r = stage([ally, foe, late]);
    expect(r.approach.has(3)).toBe(true);
    expect(r.offset.get(3) ?? 0).toBeLessThan(0);
    // and once it is engaged too, its stand-off is the one it arrived at (at contact, or parked a little short of it)
    for (const x of [980, 983]) {
      const at = stage([ally, foe, walker({ id: 3, side: 0, x })]);
      const engaged = stage([ally, foe, unit({ id: 3, side: 0, x, target: 2 })]);
      expect(at.contact.get(3) ?? 0).toBeCloseTo(engaged.contact.get(3) ?? 0, 6);
    }
  });
});

describe('working memory (PERF-A)', () => {
  /** A busy field: `n` units a side, the first eight pairs in duels near the middle, the rest walking in. */
  function field(n: number, shift = 0): StageUnit[] {
    const out: StageUnit[] = [];
    let id = 1;
    const duels = Math.min(8, n);
    for (const side of [0, 1] as const) {
      for (let i = 0; i < n; i++) {
        const front = i < duels;
        const x = side === 0 ? (front ? 960 - i * 9 : 700 - i * 13 + shift) : front ? 1000 + i * 9 : 1300 + i * 13 - shift;
        out.push(unit({ id: id++, side, x, sizeLu: i % 7 === 3 ? 48 : 24, ...(front ? {} : { rangeLu: 16 }) }));
      }
    }
    for (let i = 0; i < duels; i++) {
      (out[i] as StageUnit).target = (out[n + i] as StageUnit).id;
      (out[n + i] as StageUnit).target = (out[i] as StageUnit).id;
    }
    return out;
  }
  const snapshot = (r: ReturnType<typeof stage>): string =>
    JSON.stringify({ offset: [...r.offset], contact: [...r.contact], row: [...r.row], engaged: [...r.engaged], comp: [...r.comp], pairs: r.pairs, approach: [...r.approach] });

  it('stages a frame after a much larger one (its arrays grown, the long lines sorted another way) exactly as before it', () => {
    const small = field(12);
    const first = snapshot(stage(small, null));
    // 260 units: more than the 128 the working memory starts with, and lines longer than the 96 the insertion sort takes
    const big = field(130, 20);
    const once = snapshot(stage(big, null));
    expect(snapshot(stage(big, null))).toBe(once);
    expect(snapshot(stage(small, null))).toBe(first);
    // the rows of the last frame still make rows sticky
    const r1 = stage(small, null);
    expect(snapshot(stage(small, r1.row))).toBe(snapshot(stage(small, r1.row)));
  });
});
