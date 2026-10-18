/**
 * What the HUD needs from a live (online) match (owner request 2026-10-13, queue item 34). `ui` may not
 * import `app` (DESIGN B2), so this is structural; the app's `LiveMatch` (`src/app/live/match.ts`)
 * satisfies it and `BattleScreen` passes it in. Offline battles pass nothing and keep pause and free tempo.
 *
 * In a live match the HUD shows no pause and no speed cycle: a menu that never pauses (mute, settings,
 * Retreat) and a tempo control that proposes a speed to the opponent, who accepts or declines. The
 * opponent's proposals arrive as a small prompt that never blocks the battle; emotes and quick chat of
 * both players come through `onSay`.
 */
import type { EmoteId } from '@/contracts';
import type { ReadonlySignal } from '@preact/signals';

export type LiveSpeed = 1 | 1.5 | 2;
export const LIVE_SPEEDS: readonly LiveSpeed[] = [1, 1.5, 2];

export interface LiveProposal {
  id: number;
  by: 'me' | 'foe';
  speed: LiveSpeed;
  /** Live clock (ms) when it opened and when it runs out. */
  at: number;
  until: number;
}

export interface LiveOutcome {
  id: number;
  by: 'me' | 'foe';
  speed: LiveSpeed;
  result: 'accepted' | 'declined' | 'timeout';
  at: number;
}

export interface LiveTempo {
  speed: LiveSpeed;
  pending: LiveProposal | null;
  last: LiveOutcome | null;
  /** When you may propose again (live clock, ms). */
  readyAt: number;
  ended: boolean;
}

export type LiveRefusal = 'pending' | 'cooldown' | 'same' | 'ended';

/** One emote or quick chat line from a player. */
export interface LiveSay {
  side: 0 | 1;
  emote?: EmoteId;
  /** A quick chat id: the line is `chat.<id>`. */
  chat?: string;
}

/** The battle fast-forwarding through time it missed while the page was hidden. */
export interface LiveCatchUp {
  /** How far behind it still is (real ms). */
  behindMs: number;
  /** How much of this catch-up is done, bp. */
  doneBp: number;
}

export interface LiveHud {
  readonly tempo: ReadonlySignal<LiveTempo>;
  /** The opponent's emotes and chat are muted (no bubble, no sound). */
  readonly muted: ReadonlySignal<boolean>;
  readonly catchUp: ReadonlySignal<LiveCatchUp | null>;
  /** The match ended because you were away too long (it counts as a Retreat). */
  readonly away: ReadonlySignal<boolean>;
  /** Your quick chat lines (ids; the text is `chat.<id>`). */
  readonly quickChat: readonly string[];
  readonly foeName: string;
  /** The live clock (ms), the time base of `tempo`. */
  now(): number;
  /** Proposes a speed; returns why it cannot be proposed now, or null. */
  propose(speed: LiveSpeed): LiveRefusal | null;
  /** Answers the opponent's open proposal. */
  answer(accept: boolean): void;
  sendEmote(e: EmoteId): void;
  sendChat(id: string): void;
  setMuted(on: boolean): void;
  onSay(cb: (s: LiveSay) => void): () => void;
}

/** The live menu's actions (the app wires them). */
export interface LiveMenuActions {
  /** Retreat: a loss with no rewards (A6.3); the menu asks once more first. */
  retreat(): void;
  /** Opens Settings over the running battle. */
  settings?(): void;
}
