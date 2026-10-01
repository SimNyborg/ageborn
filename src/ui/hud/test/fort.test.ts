/**
 * The Fort button's rules (DESIGN A16.14.7, F2): the button's state in the sim's deny order, the pads a
 * kind may use, Key D's pad (most forward safe, else the most rearward legal), the drag snap, the sim's
 * reject codes as short reasons, and the lane labels that never repeat on neighbouring pads.
 */
import type { HudFort, HudFortPad, HudModel } from '@/contracts';
import { fakeMatchConfig } from '@/contracts/fakes/sim';
import { describe, expect, it } from 'vitest';
import { padLabelOwners } from '../FortLane';
import { fortIntent, fortKeyPad, fortReasonOf, fortSlotView, fortSnapPad, fortStateReason, fortUsablePads, keyIntent, simDenyReason } from '../model';
import { sampleHudModel } from '../samples';

const config = fakeMatchConfig();

function pad(p: number, o: Partial<HudFortPad> = {}): HudFortPad {
  return { p, kind: p < 500 ? 'home' : 'field', legal: true, safe: true, reason: null, towerRange: 0, ...o };
}

function fort(o: Partial<HudFort> = {}): HudFort {
  return {
    card: 'palisade',
    cost: 125,
    affordable: true,
    secondsLeft: 0,
    cap: false,
    slotLocked: false,
    siege: false,
    foeRing: null,
    kind: 'wall',
    pop: 6,
    alive: 0,
    max: 2,
    campAlive: false,
    rechargeMs: 25_000,
    leftMs: 0,
    pads: [pad(160), pad(230), pad(300), pad(640, { legal: false, safe: false, reason: 'fortPadField' }), pad(820, { legal: false, safe: false, reason: 'fortPadField' })],
    scaffoldMs: 5000,
    ...o,
  };
}

function model(f: HudFort | null, me: Partial<HudModel['me']> = {}): HudModel {
  const m = sampleHudModel(config);
  return { ...m, phase: 'regulation', me: { ...m.me, gold: 500, pop: 0, popCap: 60, ...me }, fort: f };
}

describe('Fort button state (A16.14.2 deny order)', () => {
  it('is ready with gold, pop and a legal pad', () => {
    const v = fortSlotView(model(fort()))!;
    expect(v.state).toBe('ready');
    expect(v.frac).toBe(1);
    expect(v.usable).toEqual([0, 1, 2]);
    expect(v.legal).toEqual([0, 1, 2]);
    expect(fortStateReason(v)).toBeNull();
  });

  it('follows the sim order: Siege, recharge, the caps, the army, then the gold', () => {
    const all = fort({ siege: true, secondsLeft: 12, leftMs: 11_400, cap: true, affordable: false });
    expect(fortSlotView(model(all))!.state).toBe('siege');
    expect(fortSlotView(model({ ...all, siege: false }))!.state).toBe('recharging');
    expect(fortSlotView(model({ ...all, siege: false, secondsLeft: 0, leftMs: 0 }))!.state).toBe('cap');
    const camp = fort({ kind: 'camp', card: 'war_camp', campAlive: true, affordable: false });
    expect(fortSlotView(model(camp))!.state).toBe('campCap');
    expect(fortSlotView(model(fort({ affordable: false }), { pop: 58 }))!.state).toBe('pop');
    const poor = fortSlotView(model(fort({ affordable: false }), { gold: 85 }))!;
    expect(poor.state).toBe('poor');
    expect(fortStateReason(poor)).toEqual({ key: 'hud.deny.fortGold', params: { n: 40 } });
  });

  it('says why in the player’s words (MR-03)', () => {
    const r = (f: HudFort, me: Partial<HudModel['me']> = {}) => fortStateReason(fortSlotView(model(f, me))!);
    expect(r(fort({ secondsLeft: 12, leftMs: 11_400 }))).toEqual({ key: 'hud.deny.fortRecharge', params: { s: 12 } });
    expect(r(fort({ siege: true }))).toEqual({ key: 'hud.deny.fortSiege' });
    expect(r(fort({ cap: true, alive: 2 }))).toEqual({ key: 'hud.deny.fortMax', params: { n: 2 } });
    expect(r(fort(), { pop: 55 })).toEqual({ key: 'hud.deny.fortPop' });
    const none = fort({ pads: fort().pads!.map((x) => ({ ...x, legal: false, safe: false, reason: 'fortPadEnemy' })) });
    expect(r(none)).toEqual({ key: 'hud.deny.fortNoPad' });
  });

  it('is absent without a Fort card or while the slot is locked', () => {
    expect(fortSlotView(model(null))).toBeNull();
    expect(fortSlotView(model(fort({ slotLocked: true })))).toBeNull();
  });
});

describe('Pads a kind may use (A16.14.2 rule 1)', () => {
  it('walls, towers and traps use Home pads; camps any pad', () => {
    expect(fortUsablePads(fort({ kind: 'wall' }))).toEqual([0, 1, 2]);
    expect(fortUsablePads(fort({ kind: 'tower' }))).toEqual([0, 1, 2]);
    expect(fortUsablePads(fort({ kind: 'trap' }))).toEqual([0, 1, 2]);
    expect(fortUsablePads(fort({ kind: 'camp' }))).toEqual([0, 1, 2, 3, 4]);
  });
});

describe('Key D and the drag snap', () => {
  it('Key D takes the most forward safe pad, else the most rearward legal one', () => {
    expect(fortKeyPad(fort())).toBe(2);
    const underFire = fort({ pads: [pad(160), pad(230, { safe: false }), pad(300, { safe: false }), pad(640), pad(820)] });
    expect(fortKeyPad(underFire)).toBe(0);
    const noneSafe = fort({ pads: [pad(160, { legal: false, safe: false, reason: 'fortPadEnemy' }), pad(230, { safe: false }), pad(300, { safe: false }), pad(640), pad(820)] });
    expect(fortKeyPad(noneSafe)).toBe(1);
    // A wall never takes a Field pad, even a safe one.
    const fieldOnly = fort({ pads: [pad(160, { legal: false, safe: false, reason: 'fortPadTaken' }), pad(230, { legal: false, safe: false, reason: 'fortPadTaken' }), pad(300, { legal: false, safe: false, reason: 'fortPadEnemy' }), pad(640), pad(820)] });
    expect(fortKeyPad(fieldOnly)).toBeNull();
    expect(fortKeyPad({ ...fieldOnly, kind: 'camp' })).toBe(4);
  });

  it('the snap takes the nearest legal pad within reach', () => {
    const f = fort({ pads: [pad(160), pad(230, { legal: false, safe: false, reason: 'fortPadTaken' }), pad(300), pad(640), pad(820)] });
    expect(fortSnapPad(f, 240)).toBe(2);
    expect(fortSnapPad(f, 240, 30)).toBeNull();
    expect(fortSnapPad(f, 170, 30)).toBe(0);
    expect(fortSnapPad(f, 700)).toBe(2);
  });

  it('D sends the fort command on that pad, and denies with the reason when it cannot', () => {
    const m = model(fort());
    expect(keyIntent('d', m, config, 0)).toEqual({ k: 'command', cmd: { t: 'fort', side: 0, pad: 2 }, target: 'fort' });
    expect(fortIntent(m, 1, 0)).toEqual({ k: 'command', cmd: { t: 'fort', side: 1, pad: 0 }, target: 'fort' });
    expect(fortIntent(m, 0, 3)).toEqual({ k: 'deny', target: 'fort', reason: { key: 'hud.deny.fortPadKind' } });
    const taken = model(fort({ pads: [pad(160), pad(230), pad(300, { legal: false, safe: false, reason: 'fortPadTaken' }), pad(640), pad(820)] }));
    expect(fortIntent(taken, 0, 2)).toEqual({ k: 'deny', target: 'fort', reason: { key: 'hud.deny.fortTaken' } });
    expect(fortIntent(model(fort({ secondsLeft: 3, leftMs: 2500 })), 0)).toEqual({ k: 'deny', target: 'fort', reason: { key: 'hud.deny.fortRecharge', params: { s: 3 } } });
    // An empty slot: "No fort in this age's plan"; no Fort data at all (an older model): nothing.
    expect(fortIntent(model(null), 0)).toEqual({ k: 'deny', target: 'fort', reason: { key: 'hud.deny.fortEmpty' } });
    const old = { ...model(null) } as HudModel;
    delete (old as { fort?: unknown }).fort;
    expect(fortIntent(old, 0)).toEqual({ k: 'none' });
    expect(fortIntent({ ...m, phase: 'ended' }, 0)).toEqual({ k: 'none' });
  });
});

describe('The sim’s reject codes (A16.14.2)', () => {
  it('map to the short reasons', () => {
    const m = model(fort({ secondsLeft: 7, leftMs: 6100 }));
    expect(fortReasonOf('noFort', m)).toEqual({ key: 'hud.deny.fortEmpty' });
    expect(fortReasonOf('fortRecharge', m)).toEqual({ key: 'hud.deny.fortRecharge', params: { s: 7 } });
    expect(fortReasonOf('fortPadEnemy', m)).toEqual({ key: 'hud.deny.fortEnemyNear' });
    expect(fortReasonOf('fortPadField', m)).toEqual({ key: 'hud.deny.fortArmyFirst' });
    expect(fortReasonOf('fortPadTaken', m)).toEqual({ key: 'hud.deny.fortTaken' });
    expect(fortReasonOf('fortPadKind', m)).toEqual({ key: 'hud.deny.fortPadKind' });
    expect(fortReasonOf('fortCampMax', m)).toEqual({ key: 'hud.deny.fortCampMax' });
    expect(fortReasonOf('fortSiege', m)).toEqual({ key: 'hud.deny.fortSiege' });
    expect(fortReasonOf('popFull', m)).toEqual({ key: 'hud.deny.fortPop' });
    expect(fortReasonOf('badCommand', m)).toBeNull();
    expect(simDenyReason('fortMax', m, undefined, undefined, true)).toEqual({ key: 'hud.deny.fortMax', params: { n: 2 } });
  });
});

describe('Lane labels', () => {
  it('neighbours that say the same share one label on the middle pad', () => {
    const blocked = (p: number, reason = 'fortPadEnemy') => pad(p, { legal: false, safe: false, reason });
    expect([...padLabelOwners([blocked(160), blocked(230), blocked(300)], [0, 1, 2])]).toEqual([1]);
    expect([...padLabelOwners([pad(160), pad(230, { safe: false }), pad(300, { safe: false })], [0, 1, 2])]).toEqual([1]);
    // Different reasons keep their own labels; a safe pad has none.
    const mixed = [pad(160), blocked(230, 'fortPadTaken'), blocked(300), blocked(640, 'fortPadField'), blocked(820, 'fortPadField')];
    expect([...padLabelOwners(mixed, [0, 1, 2, 3, 4])].sort()).toEqual([1, 2, 3]);
  });
});
