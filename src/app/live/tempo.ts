/**
 * The tempo of a live match as a proposal (owner request 2026-10-13, queue item 34): "you should be able
 * to propose raising the tempo and then the opponent must accept or decline it".
 *
 * A pure state machine over the live clock (ms): either player proposes another speed; the tempo changes
 * for the match only when the other side accepts. One proposal is open at a time. No answer within the
 * window counts as a decline, decided by the proposer's clock (an answer that arrives later is ignored).
 * After your proposal ends, the next one waits a cooldown, so it cannot be spammed. The opponent's
 * proposals are answered by you (or time out). Inputs return the new state and effects for the caller:
 * a message to send, the speed to apply, or why a proposal was refused (the HUD says it).
 */
import { PROPOSAL_COOLDOWN_MS, PROPOSAL_WINDOW_MS, type LiveMessage, type TempoSpeed } from './protocol';

export type Who = 'me' | 'foe';
export type TempoResult = 'accepted' | 'declined' | 'timeout';

export interface TempoProposal {
  /** The sender's id (yours and theirs count separately). */
  id: number;
  by: Who;
  speed: TempoSpeed;
  at: number;
  until: number;
}

export interface TempoOutcome {
  id: number;
  by: Who;
  speed: TempoSpeed;
  result: TempoResult;
  at: number;
}

export interface TempoState {
  speed: TempoSpeed;
  pending: TempoProposal | null;
  /** The last proposal that ended (the HUD shows it for a moment). */
  last: TempoOutcome | null;
  /** When you may propose again. */
  readyAt: number;
  /** Your next proposal id. */
  nextId: number;
  ended: boolean;
}

export type ProposeRefusal = 'pending' | 'cooldown' | 'same' | 'ended';

export type TempoInput =
  /** You propose a speed. */
  | { k: 'propose'; speed: TempoSpeed; now: number }
  /** You answer the opponent's open proposal. */
  | { k: 'answer'; accept: boolean; now: number }
  /** A tempo message from the opponent. */
  | { k: 'receive'; msg: LiveMessage; now: number }
  /** The clock moved on (an open proposal may run out). */
  | { k: 'tick'; now: number }
  /** The match is over: nothing is open any more. */
  | { k: 'end'; now: number };

export type TempoEffect = { k: 'send'; msg: LiveMessage } | { k: 'apply'; speed: TempoSpeed } | { k: 'refused'; why: ProposeRefusal };

export interface TempoRules {
  windowMs: number;
  cooldownMs: number;
}

export const DEFAULT_TEMPO_RULES: TempoRules = { windowMs: PROPOSAL_WINDOW_MS, cooldownMs: PROPOSAL_COOLDOWN_MS };

export function initialTempo(speed: TempoSpeed = 1): TempoState {
  return { speed, pending: null, last: null, readyAt: 0, nextId: 1, ended: false };
}

/** Why you cannot propose `speed` now, or null when you can. */
export function proposeRefusal(s: TempoState, speed: TempoSpeed, now: number): ProposeRefusal | null {
  if (s.ended) return 'ended';
  if (s.pending) return 'pending';
  if (speed === s.speed) return 'same';
  if (now < s.readyAt) return 'cooldown';
  return null;
}

/** Milliseconds until you may propose again (0 when you can). */
export function cooldownLeft(s: TempoState, now: number): number {
  return Math.max(0, s.readyAt - now);
}

interface Step {
  s: TempoState;
  fx: TempoEffect[];
}

function close(s: TempoState, p: TempoProposal, result: TempoResult, now: number, rules: TempoRules): TempoState {
  const last: TempoOutcome = { id: p.id, by: p.by, speed: p.speed, result, at: now };
  const speed = result === 'accepted' ? p.speed : s.speed;
  // only your own proposals start your cooldown; answering theirs never blocks you
  const readyAt = p.by === 'me' ? Math.max(s.readyAt, now + rules.cooldownMs) : s.readyAt;
  return { ...s, speed, pending: null, last, readyAt };
}

/** One input: the new state and what the caller must do. */
export function tempoStep(s: TempoState, input: TempoInput, rules: TempoRules = DEFAULT_TEMPO_RULES): Step {
  const now = input.now;
  switch (input.k) {
    case 'propose': {
      const why = proposeRefusal(s, input.speed, now);
      if (why) return { s, fx: [{ k: 'refused', why }] };
      const pending: TempoProposal = { id: s.nextId, by: 'me', speed: input.speed, at: now, until: now + rules.windowMs };
      return { s: { ...s, pending, nextId: s.nextId + 1 }, fx: [{ k: 'send', msg: { k: 'tempoPropose', id: pending.id, speed: pending.speed } }] };
    }
    case 'answer': {
      const p = s.pending;
      if (!p || p.by !== 'foe' || s.ended) return { s, fx: [] };
      if (now >= p.until) return tick(s, now, rules);
      const next = close(s, p, input.accept ? 'accepted' : 'declined', now, rules);
      const fx: TempoEffect[] = [{ k: 'send', msg: { k: 'tempoAnswer', id: p.id, accept: input.accept } }];
      if (input.accept && next.speed !== s.speed) fx.push({ k: 'apply', speed: next.speed });
      return { s: next, fx };
    }
    case 'receive':
      return receive(s, input.msg, now, rules);
    case 'tick':
      return tick(s, now, rules);
    case 'end':
      return { s: { ...s, pending: null, ended: true }, fx: [] };
  }
}

function tick(s: TempoState, now: number, rules: TempoRules): Step {
  const p = s.pending;
  if (!p || now < p.until) return { s, fx: [] };
  const next = close(s, p, 'timeout', now, rules);
  // their proposal ran out unanswered: say so, so their side never waits on a missed message
  const fx: TempoEffect[] = p.by === 'foe' ? [{ k: 'send', msg: { k: 'tempoAnswer', id: p.id, accept: false } }] : [];
  return { s: next, fx };
}

function receive(s: TempoState, msg: LiveMessage, now: number, rules: TempoRules): Step {
  if (msg.k === 'tempoPropose') {
    const decline: TempoEffect = { k: 'send', msg: { k: 'tempoAnswer', id: msg.id, accept: false } };
    if (s.ended) return { s, fx: [decline] };
    const open = s.pending;
    if (open) {
      // Both asked for the same speed at once: that is agreement.
      if (open.by === 'me' && open.speed === msg.speed && now < open.until) {
        const next = close(s, open, 'accepted', now, rules);
        return { s: next, fx: [{ k: 'send', msg: { k: 'tempoAnswer', id: msg.id, accept: true } }, ...(next.speed !== s.speed ? [{ k: 'apply', speed: next.speed } as const] : [])] };
      }
      return { s, fx: [decline] };
    }
    if (msg.speed === s.speed) return { s, fx: [decline] };
    return { s: { ...s, pending: { id: msg.id, by: 'foe', speed: msg.speed, at: now, until: now + rules.windowMs } }, fx: [] };
  }
  if (msg.k === 'tempoAnswer') {
    const p = s.pending;
    if (!p || p.by !== 'me' || p.id !== msg.id || s.ended) return { s, fx: [] };
    if (now >= p.until) return tick(s, now, rules);
    const next = close(s, p, msg.accept ? 'accepted' : 'declined', now, rules);
    return { s: next, fx: msg.accept && next.speed !== s.speed ? [{ k: 'apply', speed: next.speed }] : [] };
  }
  return { s, fx: [] };
}
