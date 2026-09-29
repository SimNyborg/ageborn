import { describe, expect, it } from 'vitest';
import { POWER_DRAG_PX } from '../model';
import { AIM_IDLE, EDGE_STICK_LU, NO_AIM, aimActive, aimValid, ghostOf, resolveAim, stepPowerAim, type AimTarget, type PowerAimEvent, type PowerAimState, type PowerAimStep } from '../powerAim';

const lane = (p: number): AimTarget => ({ p, over: 'lane' });
const hud: AimTarget = { p: null, over: 'hud' };

/** Runs events from `s`, returning the final state and every effect kind in order. */
function run(events: PowerAimEvent[], s: PowerAimState = AIM_IDLE): { state: PowerAimState; effects: PowerAimStep['effect'][] } {
  const effects: PowerAimStep['effect'][] = [];
  let state = s;
  for (const ev of events) {
    const r = stepPowerAim(state, ev);
    state = r.state;
    if (r.effect.k !== 'none') effects.push(r.effect);
  }
  return { state, effects };
}

const down = (o: Partial<{ ready: boolean; aimable: boolean; id: number }> = {}): PowerAimEvent => ({ e: 'down', id: o.id ?? 1, x: 100, y: 500, ready: o.ready ?? true, aimable: o.aimable ?? true });
const move = (dx: number, aim: AimTarget, id = 1): PowerAimEvent => ({ e: 'move', id, x: 100 + dx, y: 500 - dx, aim });
const up = (aim: AimTarget, id = 1): PowerAimEvent => ({ e: 'up', id, aim });

describe('power aim state machine (owner decision "Age Power targeting")', () => {
  it('drag onto the lane fires there, with a pickup first', () => {
    const r = run([down(), move(40, lane(620)), move(80, lane(700)), up(lane(710))]);
    expect(r.effects).toEqual([{ k: 'pickup' }, { k: 'fire', p: 710 }]);
    expect(r.state).toEqual(AIM_IDLE);
  });

  it('a small wobble is still a press; the drag starts past the threshold', () => {
    const r = run([down(), move(POWER_DRAG_PX / 2, lane(600))]);
    expect(r.state.s).toBe('pressed');
    expect(run([move(POWER_DRAG_PX, lane(600))], r.state).state.s).toBe('dragging');
  });

  it('releasing over the HUD cancels; the ghost keeps the last lane point tinted invalid', () => {
    const mid = run([down(), move(40, lane(600)), move(60, hud)]);
    expect(mid.state.s).toBe('dragging');
    expect(ghostOf(mid.state)).toEqual({ p: 600, valid: false });
    const r = run([up(hud)], mid.state);
    expect(r.effects).toEqual([{ k: 'cancel' }]);
    expect(r.state).toEqual(AIM_IDLE);
  });

  it('dropping on the minimap fires at the mapped p', () => {
    const r = run([down(), move(40, hud), up({ p: 1000, over: 'minimap' })]);
    expect(r.effects).toEqual([{ k: 'pickup' }, { k: 'fire', p: 1000 }]);
  });

  it('a drag that never reached the lane shows no ghost and cancels', () => {
    const mid = run([down(), move(20, hud)]);
    expect(ghostOf(mid.state)).toEqual({ p: null, valid: false });
    expect(run([up(hud)], mid.state).effects).toEqual([{ k: 'cancel' }]);
  });

  it('Escape (cancel) during a drag puts the power back', () => {
    const r = run([down(), move(40, lane(600)), { e: 'cancel' }]);
    expect(r.effects).toEqual([{ k: 'pickup' }, { k: 'cancel' }]);
    expect(r.state).toEqual(AIM_IDLE);
    // Pointer events after the cancel are ignored.
    expect(run([up(lane(600))], r.state).effects).toEqual([]);
  });

  it('a pointer leaving the window keeps the last lane point', () => {
    const r = run([down(), move(40, lane(640)), up(NO_AIM)]);
    expect(r.effects.at(-1)).toEqual({ k: 'fire', p: 640 });
  });

  it('a tap enters aiming mode instead of firing blind; tapping the field fires there', () => {
    const tap = run([down(), up(NO_AIM)]);
    expect(tap.effects).toEqual([{ k: 'aim' }]);
    expect(tap.state.s).toBe('aiming');
    const shown = run([{ e: 'aimAt', aim: lane(820) }], tap.state);
    expect(ghostOf(shown.state)).toEqual({ p: 820, valid: true });
    expect(aimActive(shown.state)).toBe(true);
    // A mouse hover moves the ghost; a tap on the field fires at the tap.
    const hover = run([{ e: 'fieldMove', id: 9, aim: lane(700) }], shown.state);
    expect(ghostOf(hover.state).p).toBe(700);
    const r = run([{ e: 'fieldDown', id: 3, aim: lane(500) }, { e: 'fieldUp', id: 3, aim: lane(510) }], hover.state);
    expect(r.effects).toEqual([{ k: 'fire', p: 510 }]);
    expect(r.state).toEqual(AIM_IDLE);
  });

  it('tapping the button again while aiming cancels', () => {
    const aiming = run([down(), up(NO_AIM), { e: 'aimAt', aim: lane(820) }]).state;
    const pressed = run([down({ id: 2 })], aiming).state;
    // The ghost stays while the finger is on the button.
    expect(ghostOf(pressed)).toEqual({ p: 820, valid: true });
    const r = run([up(NO_AIM, 2)], pressed);
    expect(r.effects).toEqual([{ k: 'cancel' }]);
    expect(r.state).toEqual(AIM_IDLE);
  });

  it('dragging from the button while aiming picks it up as usual', () => {
    const aiming = run([down(), up(NO_AIM), { e: 'aimAt', aim: lane(820) }]).state;
    const r = run([down({ id: 2 }), move(50, lane(400), 2), up(lane(420), 2)], aiming);
    expect(r.effects).toEqual([{ k: 'pickup' }, { k: 'fire', p: 420 }]);
  });

  it('Escape cancels aiming mode; a field release off the lane keeps aiming', () => {
    const aiming = run([down(), up(NO_AIM), { e: 'aimAt', aim: lane(820) }]).state;
    expect(run([{ e: 'cancel' }], aiming).effects).toEqual([{ k: 'cancel' }]);
    const off = run([{ e: 'fieldDown', id: 4, aim: NO_AIM }, { e: 'fieldUp', id: 4, aim: NO_AIM }], aiming);
    // Off the lane the ghost stayed at 820, so the tap still fires there.
    expect(off.effects).toEqual([{ k: 'fire', p: 820 }]);
    const noGhost = run([down(), up(NO_AIM)]).state;
    const stay = run([{ e: 'fieldDown', id: 4, aim: NO_AIM }, { e: 'fieldUp', id: 4, aim: NO_AIM }], noGhost);
    expect(stay.effects).toEqual([]);
    expect(stay.state.s).toBe('aiming');
  });

  it('a power that picks its own spot aims the same way but casts without a p', () => {
    const aiming = run([down({ aimable: false }), up(NO_AIM), { e: 'aimAt', aim: lane(450) }]);
    expect(aiming.effects).toEqual([{ k: 'aim' }]);
    expect(run([{ e: 'fieldDown', id: 2, aim: lane(900) }, { e: 'fieldUp', id: 2, aim: lane(900) }], aiming.state).effects).toEqual([{ k: 'fire' }]);
    expect(run([down({ aimable: false }), move(40, lane(600)), up(lane(600))]).effects).toEqual([{ k: 'pickup' }, { k: 'fire' }]);
    expect(run([down({ aimable: false }), move(40, lane(600)), up(hud)]).effects).toEqual([{ k: 'pickup' }, { k: 'cancel' }]);
  });

  it('a power that is not ready never drags; a press asks for the (denied) command', () => {
    const r = run([down({ ready: false }), move(80, lane(600)), up(lane(600))]);
    expect(r.effects).toEqual([{ k: 'fire' }]);
  });

  it('ignores a second pointer and a cancel while idle', () => {
    const d = run([down(), move(40, lane(600))]).state;
    expect(run([down({ id: 7 })], d).state).toBe(d);
    expect(run([move(80, lane(900), 7)], d).state).toBe(d);
    expect(stepPowerAim(AIM_IDLE, { e: 'cancel' })).toEqual({ state: AIM_IDLE, effect: { k: 'none' } });
  });

  it('only lane and minimap drops are valid', () => {
    expect(aimValid(lane(300))).toBe(true);
    expect(aimValid({ p: 300, over: 'minimap' })).toBe(true);
    expect(aimValid(hud)).toBe(false);
    expect(aimValid(NO_AIM)).toBe(false);
  });
});

describe('reach (A2.9.4, A2.9.10: the band, the magnetic edge, out of reach)', () => {
  // A Home sweep with a 450 lu zone: centres in [150, 1,000 − 225 = 775].
  const home = { reach: 'home' as const, band: [150, 775] as [number, number] };

  it('uses a point inside the band as it is and clamps toward your gate', () => {
    expect(resolveAim(600, home)).toEqual({ p: 600, inReach: true, edge: false });
    expect(resolveAim(40, home)).toEqual({ p: 150, inReach: true, edge: false });
  });

  it('sticks to the far edge for up to 120 lu of overshoot, then is out of reach', () => {
    expect(resolveAim(775 + EDGE_STICK_LU, home)).toEqual({ p: 775, inReach: true, edge: true });
    expect(resolveAim(900, home)).toEqual({ p: 900, inReach: false, edge: false });
    // The out-of-reach ghost follows the pointer, inside the A2.1 lane clamp.
    expect(resolveAim(1990, home).p).toBe(1850);
  });

  it('lets powers without an aim land anywhere on the lane', () => {
    expect(resolveAim(1500, { reach: 'front', band: null })).toEqual({ p: 1500, inReach: true, edge: false });
    expect(resolveAim(1500, null)).toEqual({ p: 1500, inReach: true, edge: false });
  });

  it('never fires a drop out of reach: the power goes back and the ghost turns red at the pointer', () => {
    const far: AimTarget = { p: 1300, over: 'lane', inReach: false };
    expect(aimValid(far)).toBe(false);
    const r = run([down(), move(40, lane(600)), move(80, far)]);
    expect(ghostOf(r.state)).toEqual({ p: 1300, valid: false });
    expect(run([up(far)], r.state).effects).toEqual([{ k: 'cancel' }]);
  });
});
