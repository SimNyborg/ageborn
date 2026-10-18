/**
 * The live match protocol (owner request 2026-10-13, queue item 34): what the two players of an online
 * match say to each other outside the sim.
 *
 * A live match has no pause and no tempo of its own: a player proposes a speed and the opponent accepts
 * or declines; no answer within `PROPOSAL_WINDOW_MS` counts as a decline (`tempo.ts`). Emotes and quick
 * chat travel the same way, so a muted opponent costs nothing in the sim and nothing reaches a replay.
 *
 * Today the opponent is the simulated player of Ranked (`SimulatedOpponent`: a persona over the AI that
 * plays the match). When real online play ships (docs/online-spike.md), the relay carries these same
 * messages between the two clients: an `OpponentLink` over the socket replaces the simulated one, and the
 * relay stamps an accepted tempo with the tick both clients switch at (`atTick`), since lockstep clients
 * must change speed together. Nothing here touches the sim: tempo only scales playback (A2.12).
 */
import type { EmoteId, Side, SimState } from '@/contracts';

/** The speeds a match runs at (A2.12). */
export type TempoSpeed = 1 | 1.5 | 2;
export const TEMPO_SPEEDS: readonly TempoSpeed[] = [1, 1.5, 2];

/**
 * Quick chat: a fixed list of short lines (`chat.<id>` in `src/i18n/quickchat.en.json`), the same for
 * both players; there is never free text (A5.8, A7.1). The collected quotes (`quote.*`) stay emotes.
 */
export const QUICK_CHAT = ['glhf', 'nice', 'wow', 'oops', 'thanks', 'wp', 'gg'] as const;
export type QuickChatId = (typeof QUICK_CHAT)[number];

export function isQuickChat(s: string): s is QuickChatId {
  return (QUICK_CHAT as readonly string[]).includes(s);
}

/** One message between the players of a live match. Proposal ids are per sender. */
export type LiveMessage =
  | { k: 'tempoPropose'; id: number; speed: TempoSpeed }
  /** `atTick`: the tick the agreed tempo runs from, set by the relay in real online (the simulated opponent switches at once). */
  | { k: 'tempoAnswer'; id: number; accept: boolean; atTick?: number }
  | { k: 'emote'; emote: EmoteId }
  | { k: 'chat'; line: QuickChatId };

/** How long a speed proposal waits for its answer; no answer in time counts as a decline. */
export const PROPOSAL_WINDOW_MS = 8000;
/** After your proposal is answered or runs out, your next one waits this long (no spamming). */
export const PROPOSAL_COOLDOWN_MS = 15_000;
/** Your emotes and quick chat in a live match: at most one per this gap (the sim's emote cooldown). */
export const SAY_GAP_MS = 3000;
/** Quick chat lines also wait this long after each other, so a match never turns into a wall of text. */
export const CHAT_GAP_MS = 8000;

/** What a player can see of the match at a tick: both bases, both ages, the phase and the end. */
export interface MatchGlance {
  tick: number;
  /** Base HP in basis points of max, by side. */
  hpBp: readonly [number, number];
  ageIndex: readonly [number, number];
  phase: SimState['phase'];
  /** Set on the last tick: the winner, or null for a draw. */
  winner?: Side | null;
}

/** The glance at a sim state (public facts only: no gold, no plans). */
export function glanceOf(state: Readonly<SimState>): MatchGlance {
  const hp = (side: Side): number => {
    const s = state.sides[side];
    return s.baseMaxHp > 0 ? Math.max(0, Math.min(10_000, Math.floor((s.baseHp * 10_000) / s.baseMaxHp))) : 0;
  };
  const g: MatchGlance = { tick: state.tick, hpBp: [hp(0), hp(1)], ageIndex: [state.sides[0].ageIndex, state.sides[1].ageIndex], phase: state.phase };
  if (state.outcome) g.winner = state.outcome.winner;
  return g;
}

/**
 * The opponent's end of a live match: the simulated player today, the relay later. The live match drives
 * it from the battle loop (`update` every frame, `observe` every sim tick), so its timers stop while the
 * page is hidden and catch up with the match.
 */
export interface OpponentLink {
  /** A message from you to the opponent. */
  send(msg: LiveMessage, nowMs: number): void;
  /** Messages from the opponent. */
  onMessage(cb: (msg: LiveMessage) => void): () => void;
  /** Every frame, with the live clock and what the opponent needs to know of the tempo. */
  update(nowMs: number, ctx: LinkContext): void;
  /** Every sim tick: what the opponent sees of the match (the simulated player reacts to it). */
  observe?(glance: MatchGlance, nowMs: number, catchingUp: boolean): void;
  dispose(): void;
}

export interface LinkContext {
  speed: TempoSpeed;
  /** A proposal is open (either side's): nobody proposes another one meanwhile. */
  tempoBusy: boolean;
}
