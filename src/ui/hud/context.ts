/** Shared props of the HUD pieces. */
import type { AudioService, EmoteId, HudModel, MatchConfig, Side } from '@/contracts';
import type { HudViewBridge } from './bridge';
import type { DenyTarget, HudIntent } from './model';
import type { PortraitFn } from './usePortrait';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** The battle wheel (A18.9.4): equipped emotes and fixed quotes, and the extra quote cooldown. */
export interface EmoteWheel {
  emotes: readonly EmoteId[];
  quotes: readonly EmoteId[];
  quoteCooldownMs: number;
}

export interface HudCtx {
  m: HudModel;
  config: Readonly<MatchConfig>;
  side: Side;
  t: Translate;
  act: (i: HudIntent) => void;
  /** True while `target` shows the denied-press feedback. */
  denied: (target: DenyTarget) => boolean;
  portrait: PortraitFn | undefined;
  view: HudViewBridge | undefined;
  audio: Pick<AudioService, 'play'> | undefined;
  /** Narrow screens (< 900 px) use 72 px cards (A9.2). */
  compact: boolean;
  /** The equipped emote and quote wheel (A18.9.4); the six starter emotes when absent. */
  wheel?: EmoteWheel;
  /** A read-only HUD (replay viewer, dev state gallery) shows everything and accepts no input. */
  readOnly: boolean;
  /** Keyboard hint badges; shown only after the player first uses a key (audit #22). */
  keys: boolean;
  /**
   * One-time HUD hints (the "drag onto the battlefield" power hint). Off in the onboarding matches,
   * whose scripted beats own the on-screen text (A8). Default true.
   */
  hints?: boolean;
}
