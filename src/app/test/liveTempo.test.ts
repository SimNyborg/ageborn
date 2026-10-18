/**
 * The tempo of a live match as a proposal (queue item 34, `live/tempo.ts`): one open proposal, the window
 * (no answer is a decline), the cooldown, both directions, late answers and the end.
 */
import { describe, expect, it } from 'vitest';
import { PROPOSAL_COOLDOWN_MS, PROPOSAL_WINDOW_MS } from '../live/protocol';
import { cooldownLeft, initialTempo, proposeRefusal, tempoStep, type TempoEffect, type TempoInput, type TempoState } from '../live/tempo';

function run(s: TempoState, ...inputs: TempoInput[]): { s: TempoState; fx: TempoEffect[] } {
  let state = s;
  const fx: TempoEffect[] = [];
  for (const i of inputs) {
    const r = tempoStep(state, i);
    state = r.s;
    fx.push(...r.fx);
  }
  return { s: state, fx };
}

describe('live tempo (queue item 34)', () => {
  it('starts at the normal speed with nothing open', () => {
    const s = initialTempo();
    expect(s).toMatchObject({ speed: 1, pending: null, last: null, ended: false });
    expect(proposeRefusal(s, 2, 0)).toBeNull();
  });

  it('your proposal is sent, waits, and changes the speed only when they accept', () => {
    const a = run(initialTempo(), { k: 'propose', speed: 2, now: 1000 });
    expect(a.fx).toEqual([{ k: 'send', msg: { k: 'tempoPropose', id: 1, speed: 2 } }]);
    expect(a.s.pending).toMatchObject({ id: 1, by: 'me', speed: 2, at: 1000, until: 1000 + PROPOSAL_WINDOW_MS });
    expect(a.s.speed).toBe(1);
    const b = run(a.s, { k: 'receive', msg: { k: 'tempoAnswer', id: 1, accept: true }, now: 3000 });
    expect(b.fx).toEqual([{ k: 'apply', speed: 2 }]);
    expect(b.s).toMatchObject({ speed: 2, pending: null, last: { id: 1, by: 'me', speed: 2, result: 'accepted', at: 3000 } });
  });

  it('a decline keeps the speed and starts the cooldown; the next proposal waits for it', () => {
    const { s } = run(initialTempo(), { k: 'propose', speed: 1.5, now: 0 }, { k: 'receive', msg: { k: 'tempoAnswer', id: 1, accept: false }, now: 2000 });
    expect(s.speed).toBe(1);
    expect(s.last).toMatchObject({ result: 'declined', by: 'me' });
    expect(s.readyAt).toBe(2000 + PROPOSAL_COOLDOWN_MS);
    expect(proposeRefusal(s, 2, 2000 + PROPOSAL_COOLDOWN_MS - 1)).toBe('cooldown');
    expect(cooldownLeft(s, 10_000)).toBe(2000 + PROPOSAL_COOLDOWN_MS - 10_000);
    const refused = tempoStep(s, { k: 'propose', speed: 2, now: 5000 });
    expect(refused.fx).toEqual([{ k: 'refused', why: 'cooldown' }]);
    expect(refused.s).toBe(s);
    expect(proposeRefusal(s, 2, 2000 + PROPOSAL_COOLDOWN_MS)).toBeNull();
  });

  it('no answer within the window counts as a decline (a timeout), and a late answer is ignored', () => {
    const open = run(initialTempo(), { k: 'propose', speed: 2, now: 0 }).s;
    expect(tempoStep(open, { k: 'tick', now: PROPOSAL_WINDOW_MS - 1 }).s).toBe(open);
    const out = run(open, { k: 'tick', now: PROPOSAL_WINDOW_MS });
    expect(out.s).toMatchObject({ speed: 1, pending: null, last: { result: 'timeout', by: 'me' }, readyAt: PROPOSAL_WINDOW_MS + PROPOSAL_COOLDOWN_MS });
    expect(out.fx).toEqual([]);
    const late = run(out.s, { k: 'receive', msg: { k: 'tempoAnswer', id: 1, accept: true }, now: PROPOSAL_WINDOW_MS + 500 });
    expect(late.s.speed).toBe(1);
    expect(late.fx).toEqual([]);
  });

  it('an answer arriving at the window edge without a tick in between is still a timeout', () => {
    const open = run(initialTempo(), { k: 'propose', speed: 2, now: 0 }).s;
    const r = run(open, { k: 'receive', msg: { k: 'tempoAnswer', id: 1, accept: true }, now: PROPOSAL_WINDOW_MS });
    expect(r.s.speed).toBe(1);
    expect(r.s.last?.result).toBe('timeout');
  });

  it('one proposal at a time: you cannot propose while one is open, nor the same speed', () => {
    const open = run(initialTempo(), { k: 'propose', speed: 2, now: 0 }).s;
    expect(proposeRefusal(open, 1.5, 100)).toBe('pending');
    expect(proposeRefusal(initialTempo(), 1, 0)).toBe('same');
  });

  it('their proposal opens for you to answer; accepting changes the speed and answers them', () => {
    const open = run(initialTempo(), { k: 'receive', msg: { k: 'tempoPropose', id: 7, speed: 1.5 }, now: 500 }).s;
    expect(open.pending).toMatchObject({ id: 7, by: 'foe', speed: 1.5, until: 500 + PROPOSAL_WINDOW_MS });
    expect(proposeRefusal(open, 2, 600)).toBe('pending');
    const yes = run(open, { k: 'answer', accept: true, now: 2000 });
    expect(yes.fx).toEqual([
      { k: 'send', msg: { k: 'tempoAnswer', id: 7, accept: true } },
      { k: 'apply', speed: 1.5 },
    ]);
    expect(yes.s).toMatchObject({ speed: 1.5, pending: null, last: { by: 'foe', result: 'accepted' } });
    // answering theirs never starts your cooldown
    expect(yes.s.readyAt).toBe(0);
  });

  it('declining or ignoring their proposal tells them no and keeps the speed', () => {
    const open = run(initialTempo(), { k: 'receive', msg: { k: 'tempoPropose', id: 2, speed: 2 }, now: 0 }).s;
    const no = run(open, { k: 'answer', accept: false, now: 1000 });
    expect(no.fx).toEqual([{ k: 'send', msg: { k: 'tempoAnswer', id: 2, accept: false } }]);
    expect(no.s).toMatchObject({ speed: 1, last: { result: 'declined', by: 'foe' } });
    const ignored = run(open, { k: 'tick', now: PROPOSAL_WINDOW_MS });
    expect(ignored.fx).toEqual([{ k: 'send', msg: { k: 'tempoAnswer', id: 2, accept: false } }]);
    expect(ignored.s.last).toMatchObject({ result: 'timeout', by: 'foe' });
    // too late to answer now
    expect(run(ignored.s, { k: 'answer', accept: true, now: PROPOSAL_WINDOW_MS + 1 }).s.speed).toBe(1);
  });

  it('a second proposal while one is open is declined at once; the same speed from both sides is agreement', () => {
    const mine = run(initialTempo(), { k: 'propose', speed: 2, now: 0 }).s;
    const other = run(mine, { k: 'receive', msg: { k: 'tempoPropose', id: 4, speed: 1.5 }, now: 100 });
    expect(other.fx).toEqual([{ k: 'send', msg: { k: 'tempoAnswer', id: 4, accept: false } }]);
    expect(other.s.pending?.by).toBe('me');
    const same = run(mine, { k: 'receive', msg: { k: 'tempoPropose', id: 5, speed: 2 }, now: 100 });
    expect(same.fx).toEqual([
      { k: 'send', msg: { k: 'tempoAnswer', id: 5, accept: true } },
      { k: 'apply', speed: 2 },
    ]);
    expect(same.s.speed).toBe(2);
  });

  it('a proposal for the speed already running is declined', () => {
    const r = run(initialTempo(1.5), { k: 'receive', msg: { k: 'tempoPropose', id: 1, speed: 1.5 }, now: 0 });
    expect(r.s.pending).toBeNull();
    expect(r.fx).toEqual([{ k: 'send', msg: { k: 'tempoAnswer', id: 1, accept: false } }]);
  });

  it('answers that do not match the open proposal change nothing', () => {
    const open = run(initialTempo(), { k: 'propose', speed: 2, now: 0 }).s;
    expect(run(open, { k: 'receive', msg: { k: 'tempoAnswer', id: 99, accept: true }, now: 10 }).s).toBe(open);
    expect(run(initialTempo(), { k: 'answer', accept: true, now: 0 }).fx).toEqual([]);
  });

  it('the end closes everything: no proposal opens or applies afterwards', () => {
    const open = run(initialTempo(), { k: 'propose', speed: 2, now: 0 }).s;
    const ended = run(open, { k: 'end', now: 100 }).s;
    expect(ended).toMatchObject({ pending: null, ended: true });
    expect(proposeRefusal(ended, 2, 200)).toBe('ended');
    const late = run(ended, { k: 'receive', msg: { k: 'tempoAnswer', id: 1, accept: true }, now: 200 }, { k: 'receive', msg: { k: 'tempoPropose', id: 3, speed: 2 }, now: 300 });
    expect(late.s.speed).toBe(1);
    expect(late.fx).toEqual([{ k: 'send', msg: { k: 'tempoAnswer', id: 3, accept: false } }]);
  });

  it('your proposal ids count up', () => {
    const { s } = run(initialTempo(), { k: 'propose', speed: 2, now: 0 }, { k: 'tick', now: PROPOSAL_WINDOW_MS }, { k: 'propose', speed: 2, now: PROPOSAL_WINDOW_MS + PROPOSAL_COOLDOWN_MS });
    expect(s.pending?.id).toBe(2);
  });
});
