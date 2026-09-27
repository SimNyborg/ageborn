/**
 * What the HUD needs from the battle view (DESIGN B6 HUD: "turret mount hit areas (canvas pointer
 * events mapped to mounts) and power drag targeting (a canvas overlay that shows the zone)").
 *
 * `ui` may not import `render` (DESIGN B2), so this is a structural interface; `render/BattleView`
 * satisfies it and the app (WP11) passes the view in. `HudViewEvent` mirrors `render/types.ts`
 * `ViewEvent`.
 */
import type { AgeId, Command, EmoteId, MatchOutcome, Pt, Side } from '@/contracts';

export type HudViewEvent =
  | { t: 'emote'; side: Side; emote: EmoteId }
  | { t: 'denied'; command: Command['t']; reason: string }
  | { t: 'evolved'; side: Side; age: AgeId }
  | { t: 'ascending'; side: Side; age: AgeId }
  | { t: 'lastStandArmed'; side: Side }
  | { t: 'coins'; count: number }
  | { t: 'matchEnded'; outcome: MatchOutcome }
  | { t: 'mountTap'; mount: number; kind: 'mount' | 'buy'; screen: Pt; shift: boolean };

export interface HudViewBridge {
  /** Own-side progress p (lu) under a client point, clamped to the power band; null off the lane. */
  laneP(clientX: number, clientY: number): number | null;
  /** Shows (p) or hides (null) the power placement zone. */
  previewPower(p: number | null): void;
  /** True when the current power can be placed by dragging. */
  powerAimable(): boolean;
  on(listener: (ev: HudViewEvent) => void): () => void;
  /** Screen points (relative to the canvas) that coins and XP sparkles fly to. */
  setHudAnchors(a: { gold?: Pt | null; xp?: Pt | null }): void;
}
