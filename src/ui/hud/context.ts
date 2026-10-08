/** Shared props of the HUD pieces. */
import type { AudioService, AvatarSpec, EmoteId, HudModel, MatchConfig, Side } from '@/contracts';
import type { Signal } from '@preact/signals';
import type { HudViewBridge } from './bridge';
import type { FortAim, FortCommit } from './fortAim';
import type { DenyTarget, HudIntent, HudPulse } from './model';
import type { PortraitFn } from './usePortrait';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

/** The battle wheel (A18.9.4): equipped emotes and fixed quotes, and the extra quote cooldown. */
export interface EmoteWheel {
  emotes: readonly EmoteId[];
  quotes: readonly EmoteId[];
  quoteCooldownMs: number;
  /** Your General (the quote bubble's head, PLAN 2a); absent in replays and tests. */
  speaker?: AvatarSpec;
}

export interface HudCtx {
  m: HudModel;
  config: Readonly<MatchConfig>;
  side: Side;
  t: Translate;
  act: (i: HudIntent) => void;
  /** True while `target` shows the denied-press feedback. */
  denied: (target: DenyTarget) => boolean;
  /** The reason label of the last denied press on `target` while it shows (MR-03), else null. */
  reason: (target: DenyTarget) => { id: number; text: string } | null;
  portrait: PortraitFn | undefined;
  view: HudViewBridge | undefined;
  audio: Pick<AudioService, 'play'> | undefined;
  /** Phones and narrow screens (< 900 px wide or < 500 px high): the smaller icon sizes. */
  compact: boolean;
  /** The one attention pulse on the HUD right now (U11); the others rest in a steady glow. */
  pulse?: HudPulse;
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
  /** The fort in hand (A16.14.7): the Fort button writes it, the lane overlay draws pads and the ghost. */
  fortAim?: Signal<FortAim | null>;
  /** The last placement sent (the ghost contracts and the dust rises on its pad). */
  fortCommit?: Signal<FortCommit | null>;
  /** Team colours of this HUD (the colourblind preset applied): banners on fort art and lane tags. */
  colors?: { me: string; foe: string };
}
