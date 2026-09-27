/** Shared props of the HUD pieces. */
import type { AudioService, HudModel, MatchConfig, Side } from '@/contracts';
import type { HudViewBridge } from './bridge';
import type { DenyTarget, HudIntent } from './model';
import type { PortraitFn } from './usePortrait';

export type Translate = (key: string, params?: Record<string, string | number>) => string;

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
  /** A read-only HUD (replay viewer, dev state gallery) shows everything and accepts no input. */
  readOnly: boolean;
}
